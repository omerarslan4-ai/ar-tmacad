/* ArıtmaCAD — çizim kuralı okuyucu.
   Bir DXF dosyasının "çizim profilini" çıkarır: katmanlar (renk, çizgi tipi, kalınlık), yazı stilleri, ölçü stilleri,
   katman katman nesne sayıları, yazı yükseklikleri, ölçülerin stili ve yeri, taramalar, bloklar.
   Kullanıcının örnek çizimleri (DWG → DXF, ODA File Converter) ve programın ürettiği paftalar aynı araçla okunur;
   araclar/cizim-karsilastir.js iki profili kural dosyasına göre karşılaştırır.
   Kullanım:  node araclar/cizim-oku.js <dosya.dxf> [--json cikti.json]
   Saf kısım: oku(metin) → profil (dosya okumaz; test/cizim-oku.test.js). */
'use strict';
const fs = require('fs');

/* DXF metni → [kod, değer] çiftleri üzerinde yürüyen okuyucu (büyük dosyada dizi kurmadan) */
function* ciftler(metin) {
  let i = 0; const n = metin.length;
  const satir = () => { if (i >= n) return null; let j = metin.indexOf('\n', i); if (j < 0) j = n; let s = metin.slice(i, j); i = j + 1; if (s.charCodeAt(s.length - 1) === 13) s = s.slice(0, -1); return s; };
  for (;;) { const a = satir(); if (a == null) return; const b = satir(); if (b == null) return; yield [parseInt(a, 10), b.indexOf('\\U+') < 0 ? b : b.replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))]; } // \U+00D6 → Ö (AutoCAD'in DXF kaçışı)
}
const say = (o, k, n) => { o[k] = (o[k] || 0) + (n == null ? 1 : n); };
const yuv = (v, b) => Math.round(v / b) * b;

/* ölçü stili değişkenleri (DIMSTYLE tablosu grup kodları) */
const DIMKOD = { 40: 'DIMSCALE', 41: 'DIMASZ', 42: 'DIMEXO', 43: 'DIMDLI', 44: 'DIMEXE', 46: 'DIMDLE', 140: 'DIMTXT', 142: 'DIMTSZ', 144: 'DIMLFAC', 147: 'DIMGAP', 73: 'DIMTIH', 74: 'DIMTOH', 77: 'DIMTAD', 176: 'DIMCLRD', 177: 'DIMCLRE', 178: 'DIMCLRT', 271: 'DIMDEC', 277: 'DIMLUNIT', 278: 'DIMDSEP', 281: 'DIMSD1', 282: 'DIMSD2', 75: 'DIMSE1', 76: 'DIMSE2', 371: 'DIMLWD', 372: 'DIMLWE' };

function oku(metin) {
  const P = { katmanlar: {}, yaziStilleri: {}, olcuStilleri: {}, cizgiTipleri: [], kullanim: {}, yazilar: {}, olculer: {}, taramalar: {}, bloklar: {}, uzay: { model: 0, kagit: 0, blokIci: 0 }, baslik: {} };
  P.pencereler = []; P.yazilarKagit = {}; P.penceresizYazi = {}; P.olcuHatlari = []; const yerli = [];
  const tutamak = {}; // yazı stili / blok kaydı tutamakları → ad (ölçü stilindeki 340, 342 … için)
  let bolum = '', tablo = '', kayit = null, blokAd = null, nesne = null, hdr = null;
  const kul = k => P.kullanim[k] || (P.kullanim[k] = { tur: {}, renk: {}, cizgiTipi: {}, kalinlik: {}, toplam: 0 });
  const bitir = () => {
    const e = nesne; nesne = null; if (!e || !e.t) return;
    const kagit = e[67] === 1 || (blokAd && /^\*Paper_Space/i.test(blokAd)), blokIci = !!blokAd && !kagit;
    if (blokIci) { P.uzay.blokIci++; return; } // blok tanımlarının içi (semboller) katman denetimine girmez
    say(P.uzay, kagit ? 'kagit' : 'model');
    const kat = e[8] || '0', u = kul(kat); u.toplam++; say(u.tur, e.t);
    say(u.renk, e[62] == null ? 'katmandan' : e[62] === 0 ? 'bloktan' : String(e[62]));
    say(u.cizgiTipi, e[6] == null ? 'katmandan' : e[6]); say(u.kalinlik, e[370] == null || e[370] === -1 ? 'katmandan' : String(e[370]));
    if (e.t === 'TEXT' || e.t === 'MTEXT' || e.t === 'ATTRIB') {
      const st = e[7] || 'Standard', h = yuv(+e[40] || 0, (+e[40] || 0) < 1 ? 0.0001 : 0.01);
      if (!kagit && e[10] != null) yerli.push({ kat, st, h0: +e[40] || 0, h, x: e[10], y: e[20] }); // pafta penceresine göre ayrılır (aşağıda)
      else { const y = P.yazilar[kat] || (P.yazilar[kat] = {}); say(y, st + ' | ' + h); }
    } else if (e.t === 'VIEWPORT' && kagit && e[41] > 0 && e[45] > 0 && e[12] != null) { const k = e[45] / e[41]; if (Math.abs(k - 1) > 0.02) P.pencereler.push({ k, x0: e[12] - e[40] * k / 2, x1: e[12] + e[40] * k / 2, y0: e[22] - e[45] / 2, y1: e[22] + e[45] / 2 });
    } else if (e.t === 'DIMENSION') {
      const st = e[3] || 'Standard', o = P.olculer[st] || (P.olculer[st] = { adet: 0, katman: {}, tur: {}, uzaklik: {}, elleYazi: 0 });
      o.adet++; say(o.katman, kat); const tur = (e[70] || 0) & 7; say(o.tur, ['dönük / yatay / düşey', 'hizalı', 'açı', 'çap', 'yarıçap', 'açı (3 nokta)', 'ordinat'][tur] || String(tur));
      if (e[1] && e[1] !== '<>' && e[1] !== '') o.elleYazi++;
      // ölçü çizgisinin ölçülen noktalardan uzaklığı (çizim birimi): ölçü çizgisi noktası (10,20) ile 2. uzatma noktası (14,24) arası, ölçü doğrultusuna dik
      if (tur <= 1 && e[13] != null && e[14] != null && e[10] != null && !kagit) { // ölçü çizgisinin doğrultusu, dik konumu ve boyu (sıra aralığı denetimi için)
        const ang = tur === 1 ? Math.atan2(e[24] - e[23], e[14] - e[13]) : (+e[50] || 0) * Math.PI / 180, u = [Math.cos(ang), Math.sin(ang)], nn = [-u[1], u[0]], s0 = e[13] * u[0] + e[23] * u[1], s1 = e[14] * u[0] + e[24] * u[1];
        P.olcuHatlari.push({ aci: ((Math.round(ang * 180 / Math.PI) % 180) + 180) % 180, d: e[10] * nn[0] + e[20] * nn[1], s0: Math.min(s0, s1), s1: Math.max(s0, s1) }); }
      if (tur <= 1 && e[13] != null && e[14] != null) { const ax = e[14] - e[13], ay = e[24] - e[23], L = Math.hypot(ax, ay); if (L > 1e-9) { const d = Math.abs((e[10] - e[14]) * (tur === 1 ? -ay / L : 0) + (e[20] - e[24]) * (tur === 1 ? ax / L : 0)); const dd = tur === 1 ? d : Math.max(Math.abs((e[10] - e[14]) * Math.sin((e[50] || 0) * Math.PI / 180) - (e[20] - e[24]) * Math.cos((e[50] || 0) * Math.PI / 180)), 0); say(o.uzaklik, String(yuv(dd, 1))); } }
    } else if (e.t === 'HATCH') { const t = P.taramalar[kat] || (P.taramalar[kat] = {}); say(t, e[2] || '?'); }
    else if (e.t === 'INSERT') { const b = P.bloklar[e[2] || '?'] || (P.bloklar[e[2] || '?'] = { adet: 0, katman: {} }); b.adet++; say(b.katman, kat); }
  };
  for (const [k, v] of ciftler(metin)) {
    if (k === 0) {
      if (nesne) bitir();
      if (kayit) { if (tablo === 'LAYER' && kayit[2]) P.katmanlar[kayit[2]] = { renk: Math.abs(kayit[62] == null ? 7 : kayit[62]), gercekRenk: kayit[420] != null ? '#' + (kayit[420] >>> 0).toString(16).padStart(6, '0') : null, cizgiTipi: kayit[6] || 'Continuous', kalinlik: kayit[370] == null ? -3 : kayit[370], kapali: (kayit[62] || 0) < 0, donuk: !!((kayit[70] || 0) & 1), yazdirilmaz: kayit[290] === 0 };
        else if (tablo === 'STYLE' && kayit[2]) { P.yaziStilleri[kayit[2]] = { font: kayit[3] || '', buyukFont: kayit[4] || '', yukseklik: +kayit[40] || 0, genislik: kayit[41] == null ? 1 : +kayit[41], egim: +kayit[50] || 0 }; if (kayit[5]) tutamak[kayit[5]] = kayit[2]; }
        else if (tablo === 'DIMSTYLE' && kayit[2]) { const d = {}; for (const kk in DIMKOD) if (kayit[kk] != null) d[DIMKOD[kk]] = +kayit[kk]; d._yazi = kayit[340]; d._ok = kayit[342]; d._ok1 = kayit[343]; d._ok2 = kayit[344]; P.olcuStilleri[kayit[2]] = d; }
        else if (tablo === 'LTYPE' && kayit[2]) P.cizgiTipleri.push(kayit[2]);
        else if (tablo === 'BLOCK_RECORD' && kayit[2] && kayit[5]) tutamak[kayit[5]] = kayit[2];
        kayit = null; }
      if (v === 'SECTION') { bolum = '?'; continue; } if (v === 'ENDSEC') { bolum = ''; tablo = ''; blokAd = null; continue; }
      if (bolum === 'TABLES') { if (v === 'TABLE') { tablo = '?'; continue; } if (v === 'ENDTAB') { tablo = ''; continue; } if (v === tablo) kayit = {}; continue; }
      if (bolum === 'BLOCKS') { if (v === 'BLOCK') { nesne = { t: '_BLOCK' }; continue; } if (v === 'ENDBLK') { blokAd = null; continue; } nesne = { t: v }; continue; }
      if (bolum === 'ENTITIES') { nesne = { t: v }; continue; }
      continue;
    }
    if (bolum === '?' && k === 2) { bolum = v; continue; }
    if (bolum === 'HEADER') { if (k === 9) hdr = v; else if (hdr && ['$ACADVER', '$INSUNITS', '$DIMSCALE', '$LTSCALE', '$TEXTSIZE', '$DIMSTYLE', '$TEXTSTYLE', '$CLAYER', '$MEASUREMENT'].includes(hdr) && P.baslik[hdr.slice(1)] == null) P.baslik[hdr.slice(1)] = v.trim(); continue; }
    if (bolum === 'TABLES') { if (tablo === '?' && k === 2) { tablo = v; continue; } if (kayit) { if ([2, 3, 4, 5, 6].includes(k)) { if (kayit[k] == null) kayit[k] = v; } else if (k === 340 || (k >= 342 && k <= 344)) kayit[k] = v; else if (k !== 100 && k !== 330 && k !== 102) { const s = parseFloat(v); if (kayit[k] == null && !isNaN(s)) kayit[k] = s; } } continue; }
    if (nesne) {
      if (nesne.t === '_BLOCK') { if (k === 2) { blokAd = v; nesne = null; } continue; }
      if ([1, 2, 3, 6, 7, 8].includes(k)) { if (nesne[k] == null) nesne[k] = v; }
      else if ([10, 20, 12, 22, 13, 23, 14, 24, 40, 41, 45, 50].includes(k)) { if (nesne[k] == null) nesne[k] = parseFloat(v); }
      else if ([62, 67, 70, 370].includes(k)) { if (nesne[k] == null) nesne[k] = parseInt(v, 10); }
    }
  }
  if (nesne) bitir();
  /* çok ölçekli pafta: model uzayındaki yazı, onu gösteren pafta penceresinin ölçeğiyle kâğıt mm'ye çevrilir (P.yazilarKagit); pencere varken hiçbir
     pencerede görünmeyen yazı P.penceresizYazi'ye (pencereden taşan); pafta penceresi yoksa eskisi gibi P.yazilar (çizim birimi) */
  for (const t of yerli) { const W = P.pencereler.find(w => t.x >= w.x0 && t.x <= w.x1 && t.y >= w.y0 && t.y <= w.y1);
    if (W) { const y = P.yazilarKagit[t.kat] || (P.yazilarKagit[t.kat] = {}); say(y, t.st + ' | ' + yuv(t.h0 / W.k, 0.01)); }
    else if (P.pencereler.length) say(P.penceresizYazi, t.kat);
    else { const y = P.yazilar[t.kat] || (P.yazilar[t.kat] = {}); say(y, t.st + ' | ' + t.h); } }
  for (const d of Object.values(P.olcuStilleri)) { d.yaziStili = tutamak[d._yazi] || null; d.ok = tutamak[d._ok] || tutamak[d._ok1] || null; delete d._yazi; delete d._ok; delete d._ok1; delete d._ok2; }
  return P;
}

/* profilin okunur özeti (yalnız kullanılan katmanlar) */
function ozet(P, o) {
  o = o || {}; const L = [], enCok = (m, n) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n || 6).map(([k, v]) => k + '×' + v).join(', ');
  L.push('BAŞLIK  ' + JSON.stringify(P.baslik)); L.push('NESNE   model ' + P.uzay.model + ' · kâğıt ' + P.uzay.kagit + ' · blok içi ' + P.uzay.blokIci);
  L.push('\nKATMANLAR (kullanılan; renk / çizgi tipi / kalınlık · nesne sayısı · türler · katmandan farklı renk)');
  for (const [k, u] of Object.entries(P.kullanim).sort((a, b) => b[1].toplam - a[1].toplam).slice(0, o.katman || 80)) { const t = P.katmanlar[k] || {}, fr = Object.entries(u.renk).filter(([r]) => r !== 'katmandan'); L.push('  ' + k.padEnd(28) + String(t.renk).padStart(4) + '  ' + String(t.cizgiTipi || '').padEnd(12) + String(t.kalinlik).padStart(4) + '  n=' + String(u.toplam).padEnd(6) + enCok(u.tur, 4) + (fr.length ? '   | renk elle: ' + fr.map(([r, n]) => r + '×' + n).join(', ') : '')); }
  L.push('\nYAZI STİLLERİ'); for (const [k, s] of Object.entries(P.yaziStilleri)) L.push('  ' + k.padEnd(20) + s.font + (s.buyukFont ? ' + ' + s.buyukFont : '') + '  yük ' + s.yukseklik + '  gen ' + s.genislik + (s.egim ? '  eğim ' + s.egim : ''));
  L.push('\nYAZILAR (katman: stil | yükseklik × adet)'); for (const [k, y] of Object.entries(P.yazilar)) L.push('  ' + k.padEnd(28) + enCok(y, 8));
  L.push('\nÖLÇÜ STİLLERİ (kullanılan)'); for (const [k, q] of Object.entries(P.olculer).sort((a, b) => b[1].adet - a[1].adet)) { const d = P.olcuStilleri[k] || {}; L.push('  ' + k.padEnd(18) + 'n=' + q.adet + '  katman: ' + enCok(q.katman, 3) + '  tür: ' + enCok(q.tur, 3) + (q.elleYazi ? '  elle yazı ' + q.elleYazi : '')); L.push('      ' + Object.entries(d).filter(([, v]) => v != null).map(([a, v]) => a + '=' + v).join(' ')); L.push('      ölçü çizgisi uzaklığı: ' + enCok(q.uzaklik, 8)); }
  L.push('\nTARAMALAR'); for (const [k, t] of Object.entries(P.taramalar)) L.push('  ' + k.padEnd(28) + enCok(t, 6));
  L.push('\nBLOKLAR (en çok kullanılan)'); for (const [k, b] of Object.entries(P.bloklar).sort((a, b) => b[1].adet - a[1].adet).slice(0, o.blok || 25)) L.push('  ' + k.padEnd(34) + '×' + b.adet + '  ' + enCok(b.katman, 2));
  return L.join('\n');
}

module.exports = { oku, ozet };
if (require.main === module) {
  const a = process.argv.slice(2), f = a.find(x => !x.startsWith('--')), ji = a.indexOf('--json');
  if (!f) { console.log('Kullanım: node araclar/cizim-oku.js <dosya.dxf> [--json cikti.json]'); process.exit(1); }
  const P = oku(fs.readFileSync(f, 'utf8')); if (ji >= 0 && a[ji + 1]) fs.writeFileSync(a[ji + 1], JSON.stringify(P, null, 1)); console.log(ozet(P));
}

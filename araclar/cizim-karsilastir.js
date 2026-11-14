/* ArıtmaCAD — çizim kuralı denetimi.
   Bir çizimin profilini (araclar/cizim-oku.js) disiplinin kural tablosuyla (app/cizim-kural.js) karşılaştırır ve
   uymayan her şeyi sayıyla listeler: kural dışı katman, yanlış renk / çizgi tipi / kalınlık, katmandan alınmayan özellik,
   yanlış yazı stili ya da yüksekliği, ölçü biçimi, kot bloğu, tarama deseni.
   Kullanım:  node araclar/cizim-karsilastir.js mimari <dosya.dxf> [--kagit | --olcek 50] [--birim m]
     --kagit : çizim kâğıt ölçüsünde (1 birim = 1 mm; programın pafta çıktısı)
     --olcek : model uzayı tek ölçekli (birim cm; 1/50'de 10 birim = 2 mm). Verilmezse kural tablosundaki bütün ölçekler kabul edilir.
     --birim m : model uzayı metre (ArıtmaCAD'in kendi çıktısı; 1/50'de 0,10 birim = 2 mm). Verilmezse santimetre.
   Çıkış kodu: 0 = UYGUN, 1 = UYGUN DEĞİL.
   Saf kısım: denetle(profil, kural, secenek) → { sonuc, bulgular, ozet } (test/cizim-karsilastir.test.js). */
'use strict';
const fs = require('fs'), path = require('path');
globalThis.C = globalThis.C || {}; require('../app/cizim-kural.js');
const { oku } = require('./cizim-oku.js');
const KR = globalThis.C.cizimKural;
const esit = (a, b) => String(a).toLocaleLowerCase('en') === String(b).toLocaleLowerCase('en');
const mm = v => String(Math.round(v * 100) / 100).replace('.', ',');

function denetle(P, kural, o) {
  o = o || {}; const B = [], ekle = (duzey, konu, yer, mesaj) => B.push({ duzey, konu, yer, mesaj });
  const atlanan = { baskaDisiplin: [], sistem: [] }, kat = k => kural.katmanlar[k];
  // kâğıt yüksekliği (mm) → kabul edilen çizim yükseklikleri
  const bb = o.birim === 'm' ? 1000 : 10, carpan = o.kagit ? [1] : (o.olcek ? [o.olcek / bb] : kural.olcekler.map(n => n / bb));
  const tol0 = o.birim === 'm' && !o.kagit ? 0.0003 : 0.03, yukUyar = (h, liste) => liste.some(m => carpan.some(c => Math.abs(h - m * c) <= Math.max(tol0, m * c * 0.02)));

  /* 1–3. katmanlar */
  for (const [ad, u] of Object.entries(P.kullanim)) {
    if (kural.sistem.test(ad)) { atlanan.sistem.push(ad); continue; }
    if (kural.baskaDisiplin.test(ad)) { atlanan.baskaDisiplin.push(ad); continue; }
    const k = kat(ad), t = P.katmanlar[ad] || {};
    if (!k) {
      if (kural.esAd[ad]) ekle('HATA', 'katman adı', ad, `"${ad}" yerine "${kural.esAd[ad]}" kullanılır (${u.toplam} nesne)`);
      else if (kural.kodluAile.test(ad)) ekle('HATA', 'katman adı', ad, `kodlu katman ailesi kullanılmaz (${u.toplam} nesne)`);
      else ekle('HATA', 'katman adı', ad, `kural tablosunda olmayan katman (${u.toplam} nesne)`);
      continue;
    }
    if (!k.serbest || t.renk != null) {
      if (t.renk != null && t.renk !== k.renk) ekle('HATA', 'katman rengi', ad, `renk ${t.renk}, olması gereken ${k.renk}`);
      if (t.cizgiTipi != null && !esit(t.cizgiTipi, k.tip)) ekle('HATA', 'çizgi tipi', ad, `${t.cizgiTipi}, olması gereken ${k.tip}`);
      if (k.kal != null && t.kalinlik != null && Math.round(k.kal * 100) !== t.kalinlik) ekle('HATA', 'çizgi kalınlığı', ad, `${t.kalinlik < 0 ? 'varsayılan' : mm(t.kalinlik / 100) + ' mm'}, olması gereken ${mm(k.kal)} mm`);
    }
    if (kural.katmandan && !k.serbest) {
      const fark = (m, ad2, ayni) => { const f = Object.entries(m).filter(([r]) => r !== 'katmandan' && !ayni(r)); // katmanla aynı değer elle yazılmışsa sapma sayılmaz
        if (f.length) ekle('HATA', 'katmandan alınmıyor', ad, `${f.reduce((s, x) => s + x[1], 0)} nesnede ${ad2} elle verilmiş (${f.map(([r, n]) => r + '×' + n).join(', ')})`); };
      fark(u.renk, 'renk', r => +r === k.renk || ((kural.renkKorunur || {})[ad] || []).includes(+r)); /* örneklerde de nesnede yazılı renkler: kod çizgisi 243, açılım kodu 94 */ fark(u.cizgiTipi, 'çizgi tipi', r => esit(r, k.tip) || esit(r, 'ByLayer')); fark(u.kalinlik, 'kalınlık', r => k.kal != null && +r === Math.round(k.kal * 100));
    }
  }
  /* 4. yazı stilleri ve yükseklikleri */
  for (const [ad, s] of Object.entries(kural.yaziStilleri)) { const t = P.yaziStilleri[ad]; if (!t) continue;
    if (!esit(t.font, s.font)) ekle('HATA', 'yazı stili', ad, `font ${t.font || '(yok)'}, olması gereken ${s.font}`);
    if (Math.abs(t.genislik - s.gen) > 0.005) ekle('HATA', 'yazı stili', ad, `genişlik ${mm(t.genislik)}, olması gereken ${mm(s.gen)}`); }
  for (const [ad, y] of Object.entries(P.yazilar)) {
    if (kural.sistem.test(ad) || kural.baskaDisiplin.test(ad) || !kat(ad) || kat(ad).serbest) continue; // adı yanlış katman zaten yukarıda yazıldı
    const r = kural.yazi[ad]; if (!r) { ekle('UYARI', 'yazı', ad, `bu katmanda yazı beklenmiyor (${Object.values(y).reduce((a, b) => a + b, 0)} yazı)`); continue; }
    for (const [anahtar, n] of Object.entries(y)) { const [stil, hs] = anahtar.split(' | '), h = +hs;
      if (r.stil && !r.stil.some(x => esit(x, stil))) ekle('HATA', 'yazı stili', ad, `${n} yazı "${stil}" stilinde, olması gereken ${r.stil.join(' / ')}`);
      if (!yukUyar(h, r.mm)) ekle('HATA', 'yazı yüksekliği', ad, `${n} yazı ${mm(h)} ${o.kagit ? 'mm' : 'birim'}, kâğıtta olması gereken ${r.mm.map(mm).join(' / ')} mm`); }
  }
  /* 4b. pafta penceresi olan çizimde yazılar penceresinin ölçeğiyle kâğıt mm'de (çok ölçekli pafta: 1/50 plan, 1/20 detay, 1/10 …) */
  const kagitUyar = (h, liste) => liste.some(m => Math.abs(h - m) <= Math.max(0.03, m * 0.02));
  for (const [ad, y] of Object.entries(P.yazilarKagit || {})) {
    if (kural.sistem.test(ad) || kural.baskaDisiplin.test(ad) || !kat(ad) || kat(ad).serbest) continue;
    const r = kural.yazi[ad]; if (!r) { ekle('UYARI', 'yazı', ad, `bu katmanda yazı beklenmiyor (${Object.values(y).reduce((a, b) => a + b, 0)} yazı)`); continue; }
    for (const [anahtar, n] of Object.entries(y)) { const [stil, hs] = anahtar.split(' | '), h = +hs;
      if (r.stil && !r.stil.some(x => esit(x, stil))) ekle('HATA', 'yazı stili', ad, `${n} yazı "${stil}" stilinde, olması gereken ${r.stil.join(' / ')}`);
      if (!kagitUyar(h, r.mm)) ekle('HATA', 'yazı yüksekliği', ad, `${n} yazı kâğıtta ${mm(h)} mm (penceresinin ölçeğiyle), olması gereken ${r.mm.map(mm).join(' / ')} mm`); } }
  for (const [ad, n] of Object.entries(P.penceresizYazi || {})) if (!kural.sistem.test(ad) && !kural.baskaDisiplin.test(ad)) ekle('UYARI', 'yazı', ad, `${n} yazı hiçbir pafta penceresinde görünmüyor (pencereden taşıyor ya da paftaya konmamış)`);
  /* 5. ölçüler */
  const q = kural.olcu;
  for (const [stil, v] of Object.entries(P.olculer)) {
    const d = P.olcuStilleri[stil] || {}, yanlisKat = Object.entries(v.katman).filter(([k]) => k !== q.katman && !(kat(k) && kat(k).serbest) && !kural.baskaDisiplin.test(k));
    for (const [k, n] of yanlisKat) ekle('HATA', 'ölçü katmanı', stil, `${n} ölçü "${k}" katmanında, olması gereken "${q.katman}"`);
    if (!Object.keys(v.katman).some(k => k === q.katman || kural.esAd[k] === q.katman)) continue; // antet / başka disiplin ölçüsü
    if (d.ok !== undefined && !q.uc.some(x => esit(x, d.ok || ''))) ekle('HATA', 'ölçü ucu', stil, `${d.ok || 'ok'} , olması gereken eğik tik (${q.uc.join(' / ')})`);
    if (q.ustte && d.DIMTAD != null && d.DIMTAD !== 1) ekle('HATA', 'ölçü yazısı', stil, 'yazı ölçü çizgisinin üstünde değil');
    if (q.hizali && (d.DIMTIH || d.DIMTOH)) ekle('HATA', 'ölçü yazısı', stil, 'yazı yatay zorlanmış; ölçü çizgisiyle aynı doğrultuda olmalı');
    if (d.yaziStili && !q.yaziStili.some(x => esit(x, d.yaziStili))) ekle('HATA', 'ölçü yazısı', stil, `yazı stili ${d.yaziStili}, olması gereken ${q.yaziStili.join(' / ')}`);
    const t = q.stiller[stil];
    if (!t) { if (!/^(1-)?\d+$/.test(stil)) ekle('UYARI', 'ölçü stili adı', stil, `stil adı ölçeği söylemiyor (${v.adet} ölçü); örneklerde "50", "25", "1-20" gibi`); }
    else { if (t.ondalik != null && d.DIMDEC != null && d.DIMDEC !== t.ondalik) ekle('HATA', 'ölçü ondalığı', stil, `${d.DIMDEC} ondalık, olması gereken ${t.ondalik}`);
      if (t.yaziStili && d.yaziStili && !esit(d.yaziStili, t.yaziStili)) ekle('HATA', 'ölçü yazısı', stil, `yazı stili ${d.yaziStili}, olması gereken ${t.yaziStili}`); }
    if (v.elleYazi) ekle('UYARI', 'ölçü yazısı', stil, `${v.elleYazi} ölçünün yazısı elle değiştirilmiş (gerçek ölçüyü göstermiyor olabilir)`);
  }
  /* 5b. ölçü sıraları arası (firma kuralı 14.11.2026): MODELDE 0,25 m (25 cm), her ölçekte aynı — paralel, boyları örtüşen iki ölçü çizgisi arası 25 cm'den az olmaz */
  { const sira = (o.birim === 'm' ? 0.25 : 25) * (o.kagit ? 0 : 1), H = P.olcuHatlari || []; let n2 = 0;
    if (sira > 0) for (let i = 0; i < H.length; i++) for (let j = i + 1; j < H.length; j++) { const a = H[i], c = H[j]; if (a.aci !== c.aci) continue; const dd = Math.abs(a.d - c.d), ort = Math.min(a.s1, c.s1) - Math.max(a.s0, c.s0);
      if (ort > sira * 0.04 && dd > sira * 0.02 && dd < sira * 0.96) n2++; }
    if (n2) ekle('HATA', 'ölçü sıra aralığı', q.katman, `${n2} çift paralel ölçü sırası modelde ${o.birim === 'm' ? '0,25 m' : '25 cm'}'den sık (kural: her ölçekte 25 cm)`); }
  /* 6. kot bloğu */
  for (const b of kural.kot.yasakBlok) if (P.bloklar[b]) ekle('HATA', 'kot işareti', b, `${P.bloklar[b].adet} kot "${b}" bloğuyla konmuş, olması gereken "${kural.kot.blok}"`);
  const kb = P.bloklar[kural.kot.blok]; if (kb) for (const [k, n] of Object.entries(kb.katman)) if (k !== kural.kot.katman) ekle('HATA', 'kot işareti', kural.kot.blok, `${n} kot "${k}" katmanında, olması gereken "${kural.kot.katman}"`);
  /* 7. taramalar */
  for (const [ad, t] of Object.entries(P.taramalar)) { if (!kat(ad) || kat(ad).serbest) continue; const izin = kural.tarama[ad];
    if (!izin) { ekle('UYARI', 'tarama', ad, `bu katmanda tarama beklenmiyor (${Object.entries(t).map(([d, n]) => d + '×' + n).join(', ')})`); continue; }
    const kabul = (kural.taramaKabul || {})[ad] || [];                                    // örnekte karşılığı olmayan malzemenin programdaki deseni
    for (const [desen, n] of Object.entries(t)) { const d = desen.split(',')[0]; if (izin.some(x => esit(x, d))) continue;
      if (kabul.some(x => esit(x, d))) ekle('UYARI', 'tarama deseni', ad, `${n} tarama ${desen}: örnek çizimlerde bu malzemenin taraması yok (programın deseni kaldı)`);
      else ekle('HATA', 'tarama deseni', ad, `${n} tarama ${desen}, olması gereken ${izin.join(' / ')}`); } }

  const hata = B.filter(b => b.duzey === 'HATA').length, uyari = B.length - hata;
  return { sonuc: hata ? 'UYGUN DEĞİL' : 'UYGUN', hata, uyari, bulgular: B, atlanan, bakilan: { katman: Object.keys(P.kullanim).length, nesne: P.uzay.model + P.uzay.kagit } };
}

/* okunur rapor */
function rapor(R, kural, dosya) {
  const L = [`SONUÇ: ${R.sonuc}`, `Kural: ${kural.ad} (${kural.belge})${dosya ? ' · çizim: ' + dosya : ''}`, `Bakılan: ${R.bakilan.katman} katman, ${R.bakilan.nesne} nesne · ${R.hata} hata, ${R.uyari} uyarı`];
  const grup = {}; for (const b of R.bulgular) (grup[b.konu] = grup[b.konu] || []).push(b);
  for (const [konu, l] of Object.entries(grup)) { L.push('', konu.toLocaleUpperCase('tr') + ` (${l.length})`); for (const b of l) L.push(`- [${b.duzey}] ${b.yer} — ${b.mesaj}`); }
  if (R.atlanan.baskaDisiplin.length) L.push('', 'Bakılmayan (başka disiplinin katmanları): ' + R.atlanan.baskaDisiplin.join(', '));
  return L.join('\n');
}

module.exports = { denetle, rapor };
if (require.main === module) {
  const a = process.argv.slice(2), kural = KR.disiplin(a[0]), f = a[1], oi = a.indexOf('--olcek');
  if (!kural || !f) { console.log('Kullanım: node araclar/cizim-karsilastir.js mimari <dosya.dxf> [--kagit | --olcek 50]'); process.exit(2); }
  const R = denetle(oku(fs.readFileSync(f, 'utf8')), kural, { kagit: a.includes('--kagit'), olcek: oi >= 0 ? +a[oi + 1] : 0, birim: a.includes('--birim') ? a[a.indexOf('--birim') + 1] : 'cm' });
  console.log(rapor(R, kural, path.basename(f))); process.exit(R.hata ? 1 : 0);
}

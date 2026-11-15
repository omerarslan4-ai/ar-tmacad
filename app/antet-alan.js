/* ArıtmaCAD — ANTET ALANLARI: kullanıcının yüklediği antetin her paftada kendiliğinden dolması (kullanıcı onayı 15.11.2026)
   Antet = sabit kısım + alanlar. Antetteki bir yazı bir ALANA bağlanınca (yazı "{ALAN}" olur, asıl metin s0'da saklanır) her paftada
   paftanın kendi değeriyle yazılır:
     · disiplin kodu / adı paftanın disiplininden (L.grp → disiplin tablosu; proje ayarından değiştirilebilir: C.doc.set.antet.disiplin)
     · ünite kodu, yapı adı, pafta adı paftanın başlığından ("YAPI — PAFTA ADI"; L.f.unite / L.f.yapi varsa onlar)
     · ölçek pencerelerden (layout.js → pafta-liste.js), tarih / revizyon / çizen … pafta ya da proje antet bilgisinden
     · çizim no proje şablonundan (C.doc.set.antet.cizimNoSablon; ör. "BRP-CVH-PS-{UNITE_KISA}-PS-R-{DISIPLIN_KOD}-{SIRA}")
   Öncelik: paftanın kendi değeri (L.f) > proje antet bilgisi (C.doc.set.antet) > program varsayılanı.
   Komutlar: ANTET ALANLAR (alan atama penceresi; antet yüklenince kendiliğinden açılır), ANTETBILGI (proje antet bilgileri).
   alanOner(yazılar): antetteki yazıları alanlara eşleme ÖNERİSİ — "SCALE"/"ÖLÇEK", "DATE"/"TARİH", "DRAWING NO."/"RESİM NO", "REV. NO." gibi bir
   başlığın aynı satırında sağında ya da hemen altında duran, alana uygun biçimdeki yazı; en büyük 2-3 harfli büyük harf yazı disiplin kodu vb.
   Öneriyi kullanıcı onaylar. Örnek: test-proje/anted.dxf (Bingazi).
   Saf kısım Node ile denenir: node test/antet-alan.test.js */
(function (C) {
  'use strict';

  /* ======================= SAF KISIM ======================= */
  /* Türkçe harfleri ASCII'ye indirip büyük harf (C.up ile aynı mantık; Node'da C yok) */
  const asc = s => String(s == null ? '' : s).replace(/[çÇ]/g, c => c === 'ç' ? 'c' : 'C').replace(/[ğĞ]/g, c => c === 'ğ' ? 'g' : 'G').replace(/[ıİ]/g, c => c === 'ı' ? 'i' : 'I')
    .replace(/[öÖ]/g, c => c === 'ö' ? 'o' : 'O').replace(/[şŞ]/g, c => c === 'ş' ? 's' : 'S').replace(/[üÜ]/g, c => c === 'ü' ? 'u' : 'U').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const UP = s => asc(s).toUpperCase();
  const anahtar = k => UP(k).replace(/[^A-Z_]/g, ''); // {Ünite} → UNITE (layout.js titlePrims ile aynı)

  /* disiplin tablosu: pafta grubu → { kod, tr, en }. Kodlar henüz kullanıcı onayında değil: proje ayarından değiştirilebilir. */
  const DISIPLIN_VARS = {
    Mimari: { kod: 'AR', tr: 'Mimari', en: 'Architectural' },
    Statik: { kod: 'ST', tr: 'Statik', en: 'Structural' },
    Mekanik: { kod: 'ME', tr: 'Mekanik', en: 'Mechanical' },
    Elektrik: { kod: 'EL', tr: 'Elektrik', en: 'Electrical' },
    Proses: { kod: 'PR', tr: 'Proses', en: 'Process' },
    Genel: { kod: 'GN', tr: 'Genel', en: 'General' },
  };
  const VARSAYILAN_SABLON = '{PROJEKOD}-{FIRMAKOD}-{UNITE_KISA}-{DISIPLIN_KOD}-{SIRA}';

  const disiplinTablosu = set => {
    const T = {}; for (const [g, d] of Object.entries(DISIPLIN_VARS)) T[g] = Object.assign({}, d);
    const oz = set && set.antet && set.antet.disiplin; if (oz) for (const [g, d] of Object.entries(oz)) if (d) T[g] = Object.assign({}, T[g] || {}, ...Object.entries(d).filter(([, v]) => v != null && String(v).trim() !== '').map(([k, v]) => ({ [k]: String(v).trim() })));
    return T;
  };
  const disiplinBul = (grp, set) => {
    const T = disiplinTablosu(set); if (!grp) return { kod: '', tr: '', en: '' };
    const k = Object.keys(T).find(g => UP(g) === UP(grp)); if (k) return Object.assign({ kod: '', tr: k, en: k }, T[k]);
    return { kod: UP(grp).replace(/[^A-Z]/g, '').slice(0, 2), tr: String(grp), en: String(grp) }; // tabloda olmayan grup: adının ilk iki harfi
  };

  /* "YAPI — PAFTA ADI" → { on: 'YAPI', ad: 'PAFTA ADI' }; ayraç yoksa ad = tamamı */
  const baslikBol = b => { b = String(b || '').trim(); const m = /\s+[—–]\s+/.exec(b); return m ? { on: b.slice(0, m.index).trim(), ad: b.slice(m.index + m[0].length).trim() } : { on: '', ad: b }; };
  /* ünite kodu: "GT-14", "GT14", "SW2", "KT-1A"; "GT-14 TRAFO BİNASI" → { kod: 'GT-14', ad: 'TRAFO BİNASI' } */
  const KOD_RX = /^([A-ZÇĞİÖŞÜ]{1,5}[- ]?\d{1,3}[A-Z]?)(?=$|\s|[—–:])\s*[—–:\-]?\s*(.*)$/u;
  const uniteAyir = on => { const m = KOD_RX.exec(String(on || '').trim()); return m ? { kod: m[1].replace(' ', '-'), ad: m[2].trim() } : { kod: '', ad: String(on || '').trim() }; };
  /* disiplin içi sıra no: L.f.sira, yoksa aynı gruptaki paftalar içindeki sırası (1'den); 4 hane */
  const siraNo = (L, lays) => { const f = (L && L.f) || {}; let n = parseInt(f.sira, 10); if (!(n > 0)) { const g = (lays || []).filter(X => X.grp === L.grp); n = g.indexOf(L) + 1; if (!(n > 0)) n = 1; } return String(n).padStart(4, '0'); };
  /* şablon doldurma: {ALAN} → değer; boş kalan parçaların bıraktığı çift tire / alt çizgi tek olur */
  const sablonDoldur = (sab, vals) => String(sab || '').replace(/\{([^}]+)\}/g, (m, k) => { const v = vals[anahtar(k)]; return v == null ? '' : String(v); })
    .replace(/([-_])[-_]+/g, '$1').replace(/^[-_\s]+|[-_\s]+$/g, '');

  const bos = v => v == null || String(v).trim() === '';
  const ilk = (...a) => { for (const v of a) if (!bos(v)) return v; return undefined; };
  /* paftanın antet değerleri. ctx: { set, layouts, lang ('tr'|'en'), olcek (yazı), bugun (tarih yazısı), dosya } */
  const antetDegerleri = (L, ctx = {}) => {
    const f = (L && L.f) || {}, set = ctx.set || {}, A = set.antet || {}, lang = ctx.lang === 'en' ? 'en' : 'tr';
    const D = disiplinBul(L && L.grp, set), bb = baslikBol(f.baslik), u = uniteAyir(bb.on);
    const unite = ilk(f.unite, u.kod, A.unite) || '', yapi = ilk(f.yapi, u.kod ? u.ad : bb.on, A.yapi) || '';
    /* proje adı: pafta üreticileri f.proje'ye çizim adını kendiliğinden yazar; proje antet bilgisinde ad varsa o çizim adının yerine geçer */
    const projeF = bos(f.proje) || (ctx.dosya != null && f.proje === ctx.dosya) ? null : f.proje;
    const v = {
      PROJE: ilk(projeF, A.proje, f.proje), BASLIK: f.baslik, PAFTAADI: bb.ad || f.baslik,
      CIZEN: ilk(f.cizen, A.cizen), KONTROL: ilk(f.kontrol, A.kontrol), ONAY: ilk(f.onay, A.onay),
      TARIH: ilk(f.tarih, A.tarih, ctx.bugun), OLCEK: ctx.olcek, NO: f.no, PAFTANO: f.no, PAFTA_NO: f.no,
      REV: ilk(f.rev, A.rev), REVIZYON: ilk(f.rev, A.rev), FIRMA: ilk(f.firma, A.firma), KAGIT: L && L.size, DOSYA: set.name, DUZEN: L && L.name,
      DISIPLIN_KOD: D.kod, DISIPLINKOD: D.kod, DISIPLIN: lang === 'en' ? D.en : D.tr, DISIPLIN_TR: D.tr, DISIPLIN_EN: D.en,
      UNITE: unite, UNITE_KISA: unite.replace(/[-\s]/g, ''), YAPI: yapi, BINA: yapi,
      SIRA: siraNo(L, ctx.layouts), PROJEKOD: ilk(f.projeKod, A.projeKod), FIRMAKOD: ilk(f.firmaKod, A.firmaKod),
      ISVEREN: ilk(f.isveren, A.isveren), YUKLENICI: ilk(f.yuklenici, A.yuklenici), SOZLESME: ilk(f.sozlesme, A.sozlesme),
    };
    v.CIZIMNO = ilk(f.cizimNo, sablonDoldur(ilk(A.cizimNoSablon) || VARSAYILAN_SABLON, v)) || '';
    v.CIZIM_NO = v.CIZIMNO;
    return v;
  };

  /* alan listesi (pencerede açılır liste; sıra = listede görünüş) */
  const ALANLAR = [['', 'Sabit (değişmez)'], ['OLCEK', 'Ölçek'], ['TARIH', 'Tarih'], ['UNITE', 'Ünite kodu'], ['UNITE_KISA', 'Ünite kodu (tiresiz)'], ['YAPI', 'Yapı adı'],
    ['PAFTAADI', 'Pafta adı'], ['BASLIK', 'Başlık (yapı — pafta adı)'], ['DISIPLIN_KOD', 'Disiplin kodu'], ['DISIPLIN', 'Disiplin adı (proje dilinde)'], ['DISIPLIN_TR', 'Disiplin adı (Türkçe)'],
    ['DISIPLIN_EN', 'Disiplin adı (İngilizce)'], ['CIZIMNO', 'Çizim no'], ['PAFTANO', 'Pafta no'], ['SIRA', 'Sıra no (disiplin içinde)'], ['REV', 'Revizyon'], ['PROJE', 'Proje adı'],
    ['PROJEKOD', 'Proje kodu'], ['FIRMA', 'Firma'], ['FIRMAKOD', 'Firma kodu'], ['ISVEREN', 'İşveren'], ['YUKLENICI', 'Yüklenici'], ['SOZLESME', 'Sözleşme no'],
    ['CIZEN', 'Çizen'], ['KONTROL', 'Kontrol'], ['ONAY', 'Onay'], ['KAGIT', 'Kâğıt boyutu']];

  /* ---------- alan önerisi ---------- */
  /* yazıyı karşılaştırma için sadeleştir: %%U gibi kodlar, nokta / iki nokta, çoklu boşluk */
  const sade = s => UP(String(s || '').replace(/%%[a-zA-Z]/g, '').replace(/%%\d{3}/g, '')).replace(/[.:]/g, ' ').replace(/\s+/g, ' ').trim();
  const ETIKET = [
    ['OLCEK', /^(SCALE|OLCEK|OLCEGI)$/], ['TARIH', /^(DATE|TARIH)$/],
    ['CIZIMNO', /^(DRAWING NO|DRAWING NUMBER|DWG NO|DOC NO|DOCUMENT NO|RESIM NO|CIZIM NO|PAFTA KODU)$/],
    ['PAFTANO', /^(PAFTA NO|SHEET NO|SHEET|LAYOUT NAME|LAYOUT NO)$/], ['REV', /^(REV NO|REV|REVISION|REVISION NO|REVIZYON|REVIZYON NO)$/],
    ['SOZLESME', /^(CONTRACT NO|CONTRACT NUMBER|SOZLESME NO)$/], ['PROJEKOD', /^(PROJECT NO|PROJECT CODE|PROJE NO|PROJE KODU)$/],
  ];
  /* alanın değer biçimi (ASCII büyük harfe indirilmiş yazıya uygulanır) */
  const DEGER = {
    OLCEK: s => /^(1\s*[/:]\s*\d+([.,]\d+)?(\s*[,;]\s*1\s*[/:]\s*\d+([.,]\d+)?)*|NTS|N T S|OLCEKSIZ|-)$/.test(s),
    TARIH: s => /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(s) || /^[A-Z]{3,9}[ ./-]?\d{2,4}$/.test(s) || /^\d{4}[./-]\d{1,2}([./-]\d{1,2})?$/.test(s),
    CIZIMNO: s => /^[A-Z0-9]+([-_./][A-Z0-9]+){2,}$/.test(s) && /\d/.test(s),
    PAFTANO: s => /^[A-Z]{1,5}[-_ ]?\d{1,4}[A-Z]?$/.test(s),
    REV: s => /^(\d{1,2}|[A-Z]|R\d{1,2}|REV ?\d{1,2})$/.test(s),
    SOZLESME: s => /^\S+$/.test(s) && /\d/.test(s), PROJEKOD: s => /^\S+$/.test(s) && /\d/.test(s),
  };
  const ETIKET_GEVSEK = new Set(['SOZLESME', 'PROJEKOD']);
  const etiketAlani = s => { const t = sade(s); for (const [a, rx] of ETIKET) if (rx.test(t)) return a; return null; };
  /* "Layout Name: PP-01" gibi başlık + değer aynı yazıda: { alan, onEk: 'Layout Name: ' } */
  const satirIci = s => {
    s = String(s || ''); const i = s.indexOf(':'); if (i < 1 || s.includes('\n')) return null;
    const a = etiketAlani(s.slice(0, i)); if (!a) return null; const r = s.slice(i + 1).trim(); if (!r) return null;
    const deg = UP(r).replace(/\s+/g, ' '); if (DEGER[a] && !DEGER[a](deg)) return null;
    return { alan: a, onEk: s.slice(0, i + 1) + ' ' };
  };
  /* yazının yaklaşık kutusu (mm): hizalamaya göre; gen(s, h) verilmezse büyük harf / rakam 0,9 h, küçük harf 0,7 h, boşluk ve noktalama 0,45 h */
  const tahmin = (x, h) => [...String(x).replace(/%%[a-zA-Z]/g, '')].reduce((t, c) => t + (/[s.,:;'|!]/.test(c) ? 0.45 : /[a-zçğıöşü]/.test(c) ? 0.7 : 0.9) * h, 0);
  const kutu = (e, gen) => {
    const sat = String(e.s || '').split('\n'), h = +e.h || 2.5, wf = +e.wf || 1;
    const w = Math.max(...sat.map(x => (gen ? gen(x, h) : tahmin(x, h)))) * wf, H = h * (1 + (sat.length - 1) * 1.6);
    const al = String(e.al || 'L'), yat = al.length === 2 ? al[1] : (al === 'M' ? 'C' : al), dik = al.length === 2 ? al[0] : (al === 'M' ? 'M' : 'B');
    const x0 = yat === 'C' ? e.p[0] - w / 2 : yat === 'R' ? e.p[0] - w : e.p[0];
    const y1 = dik === 'T' ? e.p[1] : dik === 'M' ? e.p[1] + H / 2 : e.p[1] + h; // B / taban: taban çizgisi ilk satır
    return [x0, y1 - H, x0 + w, y1];
  };
  const DISIPLIN_ADLARI = () => { const s = new Set(); for (const d of Object.values(DISIPLIN_VARS)) { s.add(UP(d.tr)); s.add(UP(d.en)); } return s; };
  const PAFTA_KELIME = /\b(SECTION|SECTIONS|PLAN|PLANS|ELEVATION|ELEVATIONS|DETAIL|DETAILS|LAYOUT PLAN|KESIT|KESITI|KESITLER|KESITLERI|PLANI|PLANLARI|GORUNUS|GORUNUSLER|DETAY|DETAYI|DETAYLARI|DETAYLAR)\b/;
  const YAPI_KELIME = /\b(BUILDING|BLDG|HOUSE|STATION|ROOM|TANK|BASIN|BINA|BINASI|YAPI|YAPISI|ISTASYON|ISTASYONU|HAVUZ|HAVUZU|ODASI|DEPO|DEPOSU)\b/;
  /* tb: antetin varlıkları (layout.js titleBlock.ents) → [{ i, s, h, alan, sablon }] — yalnız yazılar; alan null = sabit önerisi */
  const alanOner = (ents, opt = {}) => {
    const Y = []; (ents || []).forEach((e, i) => { if (e && e.type === 'text' && e.p && !bos(e.s)) Y.push({ i, e, s: String(e.s0 != null ? e.s0 : e.s), h: +e.h || 0 }); });
    for (const y of Y) { y.bb = kutu(Object.assign({}, y.e, { s: y.s }), opt.genislik); y.sd = sade(y.s); y.et = etiketAlani(y.s); y.alan = null; y.sablon = null; }
    const ata = (y, alan, sablon) => { y.alan = alan; y.sablon = sablon || '{' + alan + '}'; };
    /* 1) aynı yazıda başlık + değer */
    for (const y of Y) { const r = satirIci(y.s); if (r) ata(y, r.alan, r.onEk + '{' + r.alan + '}'); }
    /* 2) başlığın sağında (aynı satır) ya da hemen altında duran, alan biçimine uyan yazı — en yakın eşleşme önce */
    const ciftler = [];
    for (const lb of Y) {
      if (!lb.et || lb.alan) continue;
      const tst = DEGER[lb.et];
      for (const v of Y) {
        if (v === lb || v.et || v.alan || /:$/.test(v.s.trim())) continue;
        if (tst && !tst(UP(v.s.trim()).replace(/\s+/g, ' '))) continue;
        const a = lb.bb, b = v.bb, hm = Math.max(lb.h, v.h) || 2.5;
        const ayniSatir = Math.abs((a[1] + a[3]) / 2 - (b[1] + b[3]) / 2) < hm * 0.8, sagda = b[0] >= a[2] - hm * 0.5, bosluk = b[0] - a[2];
        /* aynı satır sağdaki değer önce (başlık ile değer arasındaki boşluk); alttaki değer yalnız başlığın tam altındaysa (yatayda örtüşür) */
        const ek = ETIKET_GEVSEK.has(lb.et) ? 20 : 0; // biçimi gevşek alanlar (sözleşme / proje no: "rakam içerir") sıkı biçimli alanlara yer bırakır
        if (ayniSatir && sagda && bosluk < 60) { ciftler.push({ lb, v, p: Math.max(0, bosluk) * 0.5 + ek }); continue; }
        const dy = a[1] - b[3], ust = b[0] < a[2] - 0.5 && b[2] > a[0] + 0.5;
        if (dy > -hm * 0.3 && dy < hm * 4 + 4 && ust) ciftler.push({ lb, v, p: Math.max(0, dy) * 1.5 + 5 + ek });
      }
    }
    ciftler.sort((p, q) => p.p - q.p);
    const kul = new Set(); for (const c of ciftler) { if (kul.has(c.lb) || c.v.alan) continue; kul.add(c.lb); ata(c.v, c.lb.et); }
    const serbest = y => !y.alan && !y.et && !/:$/.test(y.s.trim());
    const hMax = Math.max(0, ...Y.map(y => y.h));
    /* 3) disiplin kodu: büyük yazılardan biri, 2-3 harf, tümü büyük harf */
    const dk = Y.filter(y => serbest(y) && /^[A-Z]{2,3}$/.test(y.s.trim()) && y.h >= hMax * 0.6).sort((p, q) => q.h - p.h)[0]; if (dk) ata(dk, 'DISIPLIN_KOD');
    /* 4) disiplin adı: tablodaki Türkçe / İngilizce adlardan biri */
    const DA = DISIPLIN_ADLARI(); for (const y of Y) if (serbest(y) && DA.has(y.sd)) { ata(y, 'DISIPLIN'); break; }
    /* 5) ünite kodu: kod biçimindeki en büyük yazı (GT-14) */
    const uk = Y.filter(y => serbest(y) && /^[A-Z]{1,5}-?\d{1,3}[A-Z]?$/.test(UP(y.s.trim()))).sort((p, q) => q.h - p.h)[0]; if (uk) ata(uk, 'UNITE');
    /* 6) pafta adı: kesit / plan / görünüş / detay sözcüğü geçen yazı */
    const pa = Y.filter(y => serbest(y) && PAFTA_KELIME.test(y.sd)).sort((p, q) => q.h - p.h)[0]; if (pa) ata(pa, 'PAFTAADI');
    /* 7) yapı adı: bina / istasyon / havuz … sözcüğü; yoksa ünite kodu ile pafta adı arasında duran yazı */
    let ya = Y.filter(y => serbest(y) && YAPI_KELIME.test(y.sd)).sort((p, q) => q.h - p.h)[0];
    if (!ya && uk && pa) { const lo = Math.min(uk.bb[1], pa.bb[1]), hi = Math.max(uk.bb[3], pa.bb[3]); ya = Y.find(y => serbest(y) && y.bb[1] > lo - 0.1 && y.bb[3] < hi + 0.1 && y !== uk && y !== pa); }
    if (ya) ata(ya, 'YAPI');
    /* yazı zaten tek bir yer tutucuysa ({OLCEK}) o alan */
    for (const y of Y) { const m = /^\{([^}]+)\}$/.exec(y.s.trim()); if (m) ata(y, anahtar(m[1])); }
    return Y.map(y => ({ i: y.i, s: y.s, h: y.h, alan: y.alan, sablon: y.sablon }));
  };
  /* bir yazıya alan atandığında yeni metni: "Başlık: değer" biçimindeyse başlık korunur */
  const alanSablon = (s0, alan) => { if (!alan) return String(s0); const r = satirIci(s0); return r ? r.onEk + '{' + alan + '}' : '{' + alan + '}'; };
  /* atamalar: { i: alan ('' = sabit) } → yazıların s / s0 değerleri (ents yerinde değişir); değişen yazı sayısı */
  const alanUygula = (ents, atamalar) => {
    let n = 0; for (const [k, alan] of Object.entries(atamalar || {})) {
      const e = ents[+k]; if (!e || e.type !== 'text') continue; const s0 = e.s0 != null ? e.s0 : e.s;
      if (alan) { const yeni = alanSablon(s0, alan); if (e.s !== yeni) n++; e.s0 = s0; e.s = yeni; } else if (e.s0 != null) { if (e.s !== e.s0) n++; e.s = e.s0; delete e.s0; }
    }
    return n;
  };

  const api = { DISIPLIN_VARS, VARSAYILAN_SABLON, ALANLAR, disiplinTablosu, disiplinBul, baslikBol, uniteAyir, siraNo, sablonDoldur, antetDegerleri, alanOner, alanSablon, alanUygula, sade, kutu };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!C) return;

  /* ======================= PROGRAM KISMI ======================= */
  const tr = s => (window.DIL && DIL.t ? DIL.t(s) : s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  Object.assign(C, { antetAlan: api });
  /* layout.js titlePrims buradan alır */
  C.antetDegerleri = (L, ek = {}) => antetDegerleri(L, Object.assign({ set: C.doc.set, layouts: C.doc.layouts || [], lang: C.lang ? C.lang() : 'tr', bugun: new Date().toLocaleDateString('tr-TR'), dosya: C.doc.set.name }, ek));
  const etkinAntet = () => C.doc.set.titleBlock || C.defaultTitleBlock || null;
  const ornekPafta = () => { const ls = C.doc.layouts || []; return (C.currentView === 'layout' && C.views && C.views.lay && C.views.lay.cur && C.views.lay.cur()) || ls[0] || null; };
  const olcekOf = L => (C.paftaOlcekYazisi ? C.paftaOlcekYazisi(L) : (L.vps.length ? [...new Set(L.vps.map(v => '1/' + v.scale))].join(', ') : '-'));
  const sabitKaydet = tb => { if (C.doc.set.titleBlock === tb) return; try { localStorage.setItem('aritmacad.titleblock', JSON.stringify(tb)); } catch (e) { } }; // varsayılan (sabit) antet düzenlendi

  /* ---------- alan atama penceresi ---------- */
  C.antetAlanPenceresi = () => {
    const tb = etkinAntet(); if (!tb || !tb.ents || !tb.ents.length) { C.warn(tr('Önce ANTET YUKLE ile kendi antetinizi yükleyin.')); return; }
    const gen = C.measureText ? (s, h) => C.measureText(s, h) : null;
    const on = alanOner(tb.ents, { genislik: gen }), L = ornekPafta();
    const V = L ? C.antetDegerleri(L, { olcek: olcekOf(L) }) : null;
    const mevcut = y => { const e = tb.ents[y.i]; if (e.s0 == null) return null; const m = /\{([^}]+)\}/.exec(e.s); return m ? anahtar(m[1]) : ''; }; // daha önce atanmış alan
    const secenek = sec => ALANLAR.map(([k, ad]) => `<option value="${k}" ${k === sec ? 'selected' : ''}>${esc(tr(ad))}</option>`).join('');
    const satir = (y, j) => { const m = mevcut(y), sec = m != null ? m : (y.alan || ''); return `<tr><td style="padding:2px 6px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(y.s)}">${esc(y.s.replace(/\n/g, ' ⏎ '))}</td><td style="padding:2px 6px;text-align:right;opacity:.7">${(Math.round(y.h * 100) / 100).toString().replace('.', ',')}</td><td style="padding:2px 6px"><select data-aa="${j}">${secenek(sec)}</select></td><td style="padding:2px 6px;opacity:.8" data-on="${j}"></td></tr>`; };
    const b = C.modal(tr('Antet alanları'), `<p class="hint">${esc(tr('Antetteki her yazı için ne yazılacağını seçin. "Sabit" yazı olduğu gibi kalır; bir alan seçilen yazı her paftada o paftanın değeriyle dolar. Önerilen alanlar seçili gelir — kontrol edip kaydedin.'))}</p>
      <div style="max-height:420px;overflow:auto;border:1px solid var(--line);border-radius:4px"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="text-align:left;padding:2px 6px">${esc(tr('Antetteki yazı'))}</th><th style="padding:2px 6px">${esc(tr('Boy (mm)'))}</th><th style="text-align:left;padding:2px 6px">${esc(tr('Alan'))}</th><th style="text-align:left;padding:2px 6px">${esc(tr('Örnek'))}${L ? ' (' + esc(L.name) + ')' : ''}</th></tr></thead><tbody>${on.map(satir).join('')}</tbody></table></div>
      <div class="bar" style="margin-top:8px"><button class="pri" data-aakay>${esc(tr('Kaydet'))}</button> <button data-aaoner>${esc(tr('Önerileri seç'))}</button> <button data-aasabit>${esc(tr('Hepsini sabit yap'))}</button> <button data-aabilgi>${esc(tr('Proje antet bilgileri…'))}</button></div>`);
    const ornek = () => b.querySelectorAll('select[data-aa]').forEach(sl => { const j = +sl.dataset.aa, td = b.querySelector(`[data-on="${j}"]`); if (!td) return; const a = sl.value; td.textContent = a && V ? String(V[a] == null ? '' : V[a]) || '—' : ''; });
    b.querySelectorAll('select[data-aa]').forEach(sl => sl.onchange = ornek); ornek();
    b.querySelector('[data-aaoner]').onclick = () => { b.querySelectorAll('select[data-aa]').forEach(sl => { sl.value = on[+sl.dataset.aa].alan || ''; }); ornek(); };
    b.querySelector('[data-aasabit]').onclick = () => { b.querySelectorAll('select[data-aa]').forEach(sl => { sl.value = ''; }); ornek(); };
    b.querySelector('[data-aabilgi]').onclick = () => C.antetBilgiPenceresi();
    b.querySelector('[data-aakay]').onclick = () => {
      const at = {}; b.querySelectorAll('select[data-aa]').forEach(sl => { at[on[+sl.dataset.aa].i] = sl.value; });
      C.undoStack && C.undoStack.push(C.snapshot());
      const n = alanUygula(tb.ents, at); sabitKaydet(tb);
      const say = Object.values(at).filter(Boolean).length;
      C.changed(); C.emit('layouts'); C.closeModal && C.closeModal();
      C.log(`${tr('Antet alanları kaydedildi')}: ${say} ${tr('yazı alana bağlı')} (${n} ${tr('değişti')}). ${tr('Paftalarda kendiliğinden dolar; proje bilgileri için ANTETBILGI.')}`);
    };
  };

  /* ---------- proje antet bilgileri ---------- */
  const BILGI = [['proje', 'Proje adı'], ['projeKod', 'Proje kodu'], ['firma', 'Firma'], ['firmaKod', 'Firma kodu'], ['isveren', 'İşveren'], ['yuklenici', 'Yüklenici'], ['sozlesme', 'Sözleşme no'],
    ['unite', 'Ünite kodu (pafta başlığında yoksa)'], ['tarih', 'Tarih (boş = bugün)'], ['cizen', 'Çizen'], ['kontrol', 'Kontrol'], ['onay', 'Onay'], ['rev', 'Revizyon']];
  C.antetBilgiPenceresi = () => {
    const A = C.doc.set.antet || {}, T = disiplinTablosu(C.doc.set);
    const gruplar = [...new Set([...Object.keys(T), ...(C.doc.set.grups || []), ...(C.doc.layouts || []).map(L => L.grp).filter(Boolean)])];
    const fl = (k, ad, v, ph) => `<div class="fld"><label>${esc(tr(ad))}</label><input data-ab="${k}" value="${esc(v == null ? '' : v)}"${ph ? ` placeholder="${esc(ph)}"` : ''}></div>`;
    const L = ornekPafta();
    const b = C.modal(tr('Proje antet bilgileri'), `<p class="hint">${esc(tr('Bu bilgiler bütün paftaların antetine yazılır. Bir paftanın kendi değeri (pafta özelliklerinde) varsa o kullanılır.'))}</p>
      ${BILGI.map(([k, ad]) => fl(k, ad, A[k])).join('')}
      ${fl('cizimNoSablon', 'Çizim no şablonu', A.cizimNoSablon, VARSAYILAN_SABLON)}
      <p class="hint">${esc(tr('Şablonda sabit yazı ve alanlar birlikte yazılır, ör.'))} <code>BRP-CVH-PS-{UNITE_KISA}-PS-R-{DISIPLIN_KOD}-{SIRA}</code>. ${esc(tr('Alanlar'))}: {PROJEKOD} {FIRMAKOD} {UNITE} {UNITE_KISA} {DISIPLIN_KOD} {SIRA} {NO} {REV}. ${L ? esc(tr('Örnek')) + ' (' + esc(L.name) + '): <b data-abor></b>' : ''}</p>
      <h4>${esc(tr('Disiplin kodları'))}</h4>
      <table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="text-align:left">${esc(tr('Pafta grubu'))}</th><th style="text-align:left">${esc(tr('Kod'))}</th><th style="text-align:left">${esc(tr('Türkçe ad'))}</th><th style="text-align:left">${esc(tr('İngilizce ad'))}</th></tr></thead><tbody>
      ${gruplar.map(g => { const d = disiplinBul(g, C.doc.set); return `<tr><td>${esc(tr(g))}</td>${['kod', 'tr', 'en'].map(k => `<td><input data-dg="${esc(g)}" data-dk="${k}" value="${esc(d[k] || '')}" style="width:100%"></td>`).join('')}</tr>`; }).join('')}</tbody></table>
      <div class="bar" style="margin-top:8px"><button class="pri" data-abkay>${esc(tr('Kaydet'))}</button> <button data-abalan>${esc(tr('Antet alanları…'))}</button></div>`);
    const topla = () => {
      const yeni = {}; b.querySelectorAll('[data-ab]').forEach(i => { const v = i.value.trim(); if (v) yeni[i.dataset.ab] = v; });
      const dis = {}; b.querySelectorAll('[data-dg]').forEach(i => { const g = i.dataset.dg, k = i.dataset.dk, v = i.value.trim(), d0 = DISIPLIN_VARS[g] || {}; if (v && v !== d0[k]) (dis[g] = dis[g] || {})[k] = v; });
      if (Object.keys(dis).length) yeni.disiplin = dis; return yeni;
    };
    const orn = () => { const o = b.querySelector('[data-abor]'); if (!o || !L) return; const s = Object.assign({}, C.doc.set, { antet: topla() }); o.textContent = antetDegerleri(L, { set: s, layouts: C.doc.layouts || [], lang: C.lang ? C.lang() : 'tr', dosya: C.doc.set.name }).CIZIMNO || '—'; };
    b.querySelectorAll('input').forEach(i => i.oninput = orn); orn();
    b.querySelector('[data-abalan]').onclick = () => C.antetAlanPenceresi();
    b.querySelector('[data-abkay]').onclick = () => {
      C.undoStack && C.undoStack.push(C.snapshot());
      const yeni = topla(); if (Object.keys(yeni).length) C.doc.set.antet = yeni; else delete C.doc.set.antet;
      C.changed(); C.emit('layouts'); C.closeModal && C.closeModal(); C.log(tr('Proje antet bilgileri kaydedildi; paftaların antetleri güncellendi.'));
    };
  };
  C.addCommand(['ANTETBILGI', 'ANTETBILGILERI', 'TITLEINFO'], 'Proje antet bilgileri: proje adı ve kodu, firma kodu, işveren, yüklenici, sözleşme no, tarih, çizen / kontrol / onay, revizyon, çizim no şablonu, disiplin kodları (bütün paftaların antetine yazılır)', () => C.antetBilgiPenceresi(), { noUndo: true });

  /* şeritte Pafta › Antet paneline düğmeler (ribbon.js'deki listeye eklenir) */
  const seritEkle = () => {
    const Rb = C.ribbon; if (!Rb || !Rb.tabs) return false;
    const T = Rb.tabs.find(t => t[0] === 'Pafta'); if (!T) return false; const P = T[1].find(p => p[0] === 'Antet'); if (!P) return false;
    if (!P[1].some(b => b.cmd === 'ANTET ALANLAR')) P[1].splice(1, 0, { cmd: 'ANTET ALANLAR', t: 'Antet alanları', i: 'prop' }, { cmd: 'ANTETBILGI', t: 'Antet bilgileri', i: 'prop' });
    try { Rb.render && Rb.render(); } catch (e) { } return true;
  };
  if (!seritEkle() && typeof window !== 'undefined') window.addEventListener('load', seritEkle);
})(typeof window !== 'undefined' ? window.C : null);

/* ArıtmaCAD — PAFTA ÇİZİM STİLİ (ayrı modül)
   Mimari / mekanik plan ve kesit paftalarının yazı, ölçü, aks, kot, kesit işareti ve başlık kuralları tek yerde.
   Varsayılan "COKAL": kullanıcının örnek projesi Çokal AAT paftalarından (1-Çokal_AAT_Kaba-İnce-Giriş-Kum Yağ Tutucu_R3.dwg) okunan değerler.
   Değerler kâğıt üzerindeki mm'dir (örnek çizim birimi cm; 1/50'de 10 birim = 2 mm, 1/20'de 6 birim = 3 mm).
     Yazı   : "YZ" stili — turkce.shx, genişlik çarpanı 0,70; ölçü yazısı "OL" (0,75) ve detay ölçeğinde "OL 20" (0,80) — değerler app/cizim-kural.js tablosundan (ekranda çizgi fontla çizilir; AutoCAD'e aynı stil adı ve font yazılır);
              genel yazı 2 mm, eleman kodları 2,5 mm. Aks ve kesit harfleri "ARIAL" stili — Arial Bold (arialbd.ttf).
     Ölçü   : eğik tik, yazı 2 mm (1/25 ve daha büyük ölçekte 3 mm), OL / OL 20 stili; uzatma çizgisi, taşmalar ve sıra aralığı kural tablosundan (olcuYeri):
              1/50'de sıralar 5 mm arayla, uzatma çizgisi ölçü çizgisinin 1 mm berisinden başlayıp 4,1 mm aşar; detayda ölçülen noktadan başlar.
     Kot    : yarı dolu üçgen + zemin çizgisi, dikme ve üstü çizgili yazı (YZ), "+" işareti yazılmaz (99.15).
     Aks    : balon çapı 12 mm, harf 5 mm Arial Bold; çizgi noktalı – kesikli, 0,13.
     Kesit  : işaret dairesi çapı 10 mm, harf 5 mm Arial Bold, dolu ok; başlık altı tek çizgili "F-F KESİTİ" (4 mm; 1/25 ve büyükte 5 mm), altında "ÖL:1/20" (3 mm).
   C.doc.set.pstil: 'COKAL' (varsayılan) | 'KLASIK' (ArıtmaCAD'in eski görünümü). Komut: PAFTASTIL.
   Statik paftalar (DSİ düzeni) bu modülden etkilenmez: onlar kendi çizicisiyle üretilir. */
(function (C) {
  'use strict';
  const buyuk = () => ((C.doc && C.doc.set && C.doc.set.anno) || 50) <= 25; // 1/25, 1/20 … detay ölçekleri
  /* ölçü yerleşimi kural tablosundan (app/cizim-kural.js → olcuYeri); tablo yoksa eski değerler */
  const oy = () => { const O = C.cizimKural && C.cizimKural.MIMARI.olcuYeri; return O ? (buyuk() ? O.detay : O.genel) : { uzatmaBosluk: 2, uzatmaTasma: 1.25, cizgiTasma: 1, uzatmaSabit: 0, siraAraligi: 7 }; };
  const COKAL = {
    ad: 'Çokal AAT paftaları', yazi: 'YZ', kalin: 'ARIAL', yaziH: 2.0, kodH: 2.5,
    dim: () => { const Y = oy(); return ({ exo: Y.uzatmaBosluk, exe: Y.uzatmaTasma, dle: Y.cizgiTasma, exf: Y.uzatmaSabit, sira: Y.siraAraligi, tik: true, th: buyuk() ? 3.0 : 2.0, ah: 2.0, st: buyuk() ? 'OL 20' : 'OL' }); },
    kot: { stil: 'cokal', th: 2.0, arti: false },
    aks: { bp: 6, th: 5, st: 'ARIAL', lt: 'DASHDOT', lw: 13 },
    kesit: { r: 5, th: 5, st: 'ARIAL' },
    baslik: () => ({ th: buyuk() ? 5 : 4, alt: 3, tek: true, onek: 'ÖL:', st: 'YZ' }),
  };
  C.PAFTA_STILLER = { COKAL, KLASIK: null };
  const stilEkle = () => { if (!C.doc || !C.styles) return; const S = C.styles();
    const KS = (C.cizimKural && C.cizimKural.MIMARI.yaziStilleri) || {}, gen = (n, d) => (KS[n] && KS[n].gen) || d; // genişlik çarpanları kural tablosundan
    for (const n of ['YZ', 'OL', 'OL 20']) { const w = gen(n, 0.7);
      if (!S[n]) S[n] = { name: n, font: 'Türkçe (CAD)', h: 0, wf: w, obl: 0, bold: false, italic: false };
      else if (S[n].font === 'Türkçe (CAD)' && S[n].wf === 0.75 && n === 'YZ') S[n].wf = w; } // eski çizimlerde 0,75 yazılmıştı (karar 4: 0,70)
    if (!S.ARIAL) S.ARIAL = { name: 'ARIAL', font: 'Arial', h: 0, wf: 1, obl: 0, bold: true, italic: false }; };
  /* etkin stil (yoksa null: eski görünüm) */
  C.pstil = () => { const d = C.doc; if (!d || !d.set) return null; const k = d.set.pstil == null ? 'COKAL' : d.set.pstil; const p = C.PAFTA_STILLER[k] || null; if (p && !(d.styles && d.styles.YZ && d.styles.ARIAL && d.styles.OL && d.styles['OL 20'] && d.styles.YZ.wf !== 0.75)) stilEkle(); return p; };
  C.pstilAd = () => (C.doc && C.doc.set && C.doc.set.pstil) || 'COKAL';
  /* kot yazısı: örnek projede "+" işareti yok */
  if (C.fmtKot) { const f0 = C.fmtKot; C.fmtKot = function (v) { const s = f0.apply(this, arguments), p = C.pstil(); return p && p.kot && p.kot.arti === false && typeof s === 'string' && s[0] === '+' ? s.slice(1) : s; }; }
  /* ---- aks, kesit işareti ve görünüş başlığı: mevcut çizicilerin üstüne stil (KLASIK'te dokunulmaz) ---- */
  const T = C.T, M = C.M, { L, TX } = C.prim, kk = () => C.doc.set.anno / 1000;
  if (T.aks) { const p0 = T.aks.prims; T.aks.prims = e => { const ps = C.pstil(), A = ps && ps.aks; if (!A) return p0(e);
      const h = A.th * kk(); return p0(Object.assign({}, e, { bp: A.bp })).map(pr => pr.k === 'L' && pr.lt === 'CENTER' ? Object.assign(pr, { lt: A.lt, lw: A.lw }) : pr.k === 'T' && pr.al === 'MC' ? Object.assign(pr, { h, st: A.st }) : pr); }; }
  if (T.kesitisaret) { const p0 = T.kesitisaret.prims; T.kesitisaret.prims = e => { const ps = C.pstil(), K = ps && ps.kesit; if (!K) return p0(e);
      return p0(Object.assign({}, e, { sym: 'okdaire', th: K.r / 0.85 })).map(pr => (pr.k === 'T' ? Object.assign(pr, { st: K.st, h: K.th * kk() }) : pr)); }; } // daire yarıçapı K.r, harf K.th (mm)
  if (T.baslik) { const p0 = T.baslik.prims; T.baslik.prims = e => { const ps = C.pstil(), B = ps && ps.baslik ? ps.baslik() : null; if (!B) return p0(e);
      const k = kk(), h = B.th * k, st = B.st, p = M.p3(e.p); if (e.ay != null && e.dmm != null) p[1] = e.ay - e.dmm * k;
      const y = C.textStyle(st), w = C.measureText(e.s, h, y) * (y.wf || 1), y1 = p[1] - h * 0.25, out = [TX(p, h, e.s, 0, 'BC', { st }), L([p[0] - w / 2, y1, 0], [p[0] + w / 2, y1, 0], { lw: 25 })]; // altı tek çizgili başlık
      if (e.olcek !== false) out.push(TX([p[0], y1 - h * 0.35, 0], B.alt * k, B.onek + (e.ol || ('1/' + (+C.doc.set.anno.toFixed(2)))), 0, 'TC', { st }));
      return out; }; }
  const tazele = () => { for (const e of C.doc.ents) if (e._c) { delete e._c.p; delete e._c.b; } if (C.views) for (const w of Object.values(C.views)) if (w && 'dirty' in w) w.dirty = true; C.emit && C.emit('layouts'); C.changed && C.changed(); };
  C.addCommand && C.addCommand(['PAFTASTIL', 'CIZIMSTILI'], 'Pafta çizim stili: yazı karakteri, ölçü, aks, kot, kesit işareti ve başlık kuralları. PAFTASTIL COKAL (örnek proje — varsayılan) | KLASIK (ArıtmaCAD eski görünümü)', async (I) => {
    let v = (C.cmd.queue || []).length ? C.up(String(C.cmd.queue.shift())) : null;
    if (!v) { const r = await I.kw('Pafta çizim stili', [['COKAL', 'Çokal AAT paftaları (örnek proje)'], ['KLASIK', 'ArıtmaCAD eski görünümü']], C.pstilAd()); if (!r || typeof r !== 'string') return; v = C.up(r); }
    if (!(v in C.PAFTA_STILLER)) return C.warn('Bilinmeyen stil: ' + v + ' (COKAL / KLASIK).');
    C.begin && C.begin(); C.doc.set.pstil = v; stilEkle(); tazele(); C.log(`✓ Pafta çizim stili: ${v === 'COKAL' ? 'Çokal AAT paftaları (YZ yazı, eğik tikli ölçü, yarı dolu kot üçgeni)' : 'ArıtmaCAD eski görünümü'}.`);
  });
  C.on && C.on('doc', () => { try { if (C.pstil()) stilEkle(); } catch (e) { } });
  if (typeof window !== 'undefined' && window.DIL) window.DIL.ekle('en', 'English', [['Pafta çizim stili', 'Sheet drawing style'], ['Çokal AAT paftaları (örnek proje)', 'Çokal WWTP sheets (reference project)'], ['ArıtmaCAD eski görünümü', 'ArıtmaCAD classic look']]);
})(window.C);

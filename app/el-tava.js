/* ArıtmaCAD — ALTYAPI ELEKTRİK · KABLO TAVASI METRAJI, EK PARÇALAR, KABLO DÖŞEME AÇILIMI VE BAĞLANTI DETAYLARI (saf; node test/el-tava.test.js)
   Kullanıcı 21.11.2026: "tüm tava bağlantı kablolama detayları", "tava ölçü ve metraj listeleri, kullanılan ek parçaların listesi, kesitte kablo döşeme açılımı".
     tavaMetraj     : yürüme yolu / hat başına tava ölçüsü, boy, 3 m parça sayısı, doluluk + ek parça listesi (ek takımı, konsol, uç kapağı, topraklama köprüsü, civata, ankraj)
     boruMetraj     : tavadan ekipmana branş galvaniz boruları, çıkış adaptörü ve kelepçe
     dosemeDizilim  : tava kesitinde kabloların yerleşimi (kalından inceye, tek sıra, sığmazsa üst sıra)
     detayDoseme · detayEk · detayKonsol · detayCikis : kâğıt mm { L, T, S } (el-detay.js biçimi)
   KABUL (onay bekliyor; docs/cizim-kurallari/elektrik.md §15): tava parça boyu 3 m, konsol aralığı 1,5 m, ek takımı 2 levha + 8 M6, konsol başına 2 M10 ankraj, kelepçe aralığı 1,5 m. */
(function (C) {
  'use strict';
  const EL = (C && C.EL) || (typeof require !== 'undefined' ? (require('./el-hesap.js'), require('./el-detay.js'), require('./el-hesap.js')) : {});
  const KB = { parca: 3, konsol: 1.5, ekCivata: 8, ankraj: 2, kelepce: 1.5 };
  const yv = (v, d = 1) => String(Math.round(+v * Math.pow(10, d)) / Math.pow(10, d)).replace('.', ',');
  const SINIF = { ag: 'AG', zayif: 'Zayıf akım' };

  /* hatlar: [{ yol (yürüme yolu no), sinif, w, h, n, L (m), dolu, nKablo }] */
  function tavaMetraj(hatlar) {
    const satir = [], ekMap = new Map();
    const ek = (ad, oz, birim, q) => { if (!(q > 0)) return; const k = ad + '|' + oz; ekMap.set(k, ekMap.has(k) ? Object.assign(ekMap.get(k), { miktar: ekMap.get(k).miktar + q }) : { ad, oz, birim, miktar: q }); };
    for (const t of hatlar || []) {
      const n = t.n || 1, b = Math.max(1, Math.ceil(t.L / KB.parca - 1e-9)), parca = b * n, ekS = (b - 1) * n, konsol = (Math.ceil(t.L / KB.konsol - 1e-9) + 1) * n;
      satir.push({ yol: t.yol, sinif: t.sinif, olcu: `${t.w}x${t.h}`, n, L: t.L, toplam: t.L * n, parca, dolu: t.dolu, nKablo: t.nKablo || 0 });
      ek('Delikli galvaniz kablo tavası', `${t.w}x${t.h} mm, L=${KB.parca} m`, 'adet', parca);
      ek('Tava düz ek takımı', `${t.h} mm yan yüksekliğe, 2 levha`, 'takım', ekS);
      ek('Duvar konsolu', `${t.w} mm tava için, sıcak daldırma galvaniz`, 'adet', konsol);
      ek('Tava uç kapağı', `${t.w}x${t.h} mm`, 'adet', 2 * n);
      ek('Topraklama köprüsü', '16 mm² Cu, kablo pabuçlu', 'adet', ekS);
      ek('Civata, somun, pul', 'M6x12 galvaniz (tava eki)', 'adet', ekS * KB.ekCivata);
      ek('Ankraj', 'M10 paslanmaz, perdeye (konsol)', 'adet', konsol * KB.ankraj);
    }
    const parcalar = [...ekMap.values()].map((x, i) => Object.assign({ poz: i + 1 }, x));
    return { satir, parcalar, toplamM: satir.reduce((t, x) => t + x.toplam, 0) };
  }
  /* branşlar: [{ boru ('1"'), L (m) }] → boru metrajı, çıkış adaptörü, kelepçe */
  function boruMetraj(branslar) {
    const m = new Map(); let kel = 0, n = 0;
    for (const b of branslar || []) { if (!b.boru || !(b.L > 0)) continue; m.set(b.boru, (m.get(b.boru) || 0) + b.L); kel += Math.ceil(b.L / KB.kelepce - 1e-9) + 1; n++; }
    return { boru: [...m].map(([boru, L]) => ({ boru, L })), adaptor: n, kelepce: kel };
  }
  /* kablolar: [{ no, kod, cins, d (dış çap mm) }]; x tava sol iç yüzünden, y taban üstünden (daire merkezi, mm) */
  function dosemeDizilim(kablolar, w, h, ara = 2) {
    const L = (kablolar || []).slice().sort((a, b) => b.d - a.d), out = []; let x = ara, y = 0, sD = 0;
    for (const k of L) { if (x + k.d > w + 1e-9 && x > ara) { y += sD + ara; x = ara; sD = 0; } out.push(Object.assign({}, k, { x: x + k.d / 2, y: y + k.d / 2, r: k.d / 2 })); x += k.d + ara; sD = Math.max(sD, k.d); }
    const ust = out.reduce((t, k) => Math.max(t, k.y + k.r), 0); return { yer: out, ust, sigdi: ust <= h + 1e-9 };
  }

  /* ---------- çizim yardımcıları ---------- */
  const yM = k => { const G = (typeof window !== 'undefined' ? window.C : globalThis.C) || {}, t = G.cizimKural && G.cizimKural.ELEKTRIK && G.cizimKural.ELEKTRIK.yaziMm; return (t && t[k]) || 2.4; };
  const yeni = () => { const c = EL._cizer(); c.g.S = c.g.S || []; return c; };
  const daire = (c, x, y, r, st = 'i') => { const N = 18; for (let i = 0; i < N; i++) { const a = 2 * Math.PI * i / N, b = 2 * Math.PI * (i + 1) / N; c.L(x + r * Math.cos(a), y + r * Math.sin(a), x + r * Math.cos(b), y + r * Math.sin(b), st); } };
  const ok = (c, x, y, x2, y2, s) => { const sag = x2 >= x, h = yM('detay'), a = Math.atan2(y2 - y, x2 - x); c.L(x, y, x2, y2, 'h'); c.L(x2, y2, x2 + (sag ? 4 : -4), y2, 'h'); c.g.S.push([[x, y], [x + 1.4 * Math.cos(a + 0.35), y + 1.4 * Math.sin(a + 0.35)], [x + 1.4 * Math.cos(a - 0.35), y + 1.4 * Math.sin(a - 0.35)]]); c.T(x2 + (sag ? 5 : -5), y2 - h * 0.35, h, s, sag ? 'L' : 'R', 0, 2); };
  const baslik = (c, y, s) => { c.T(0, y + 7, yM('baslik'), s, 'L', 0, 2); c.L(0, y + 5.8, s.length * yM('baslik') * 0.66, y + 5.8, 'k'); c.T(0, y + 1.5, yM('detay'), 'ÖLÇEKSİZ', 'L', 0, 2); };
  const duvar = (c, x, y0, y1) => { c.L(x, y0, x, y1, 'k'); for (let y = y0; y < y1 - 3; y += 4) c.L(x, y, x - 3, y + 3, 'h'); };
  const olc = (c, x, y0, y1, s) => { c.L(x, y0, x, y1, 'h'); for (const y of [y0, y1]) c.L(x - 1, y - 1, x + 1, y + 1, 'i'); c.T(x - 1.2, (y0 + y1) / 2, yM('olcu'), s, 'MC', Math.PI / 2, 2); };

  /* KABLO DÖŞEME AÇILIMI: perde, konsollar, AG tavası üstte, zayıf akım altta; kablolar gerçek çapta, numaralı; altta numara → kablo listesi.
     o: { yol, ag: { w, h, kablolar:[{kod,cins,d}] } | null, zayif: aynı | null, ara (m) } */
  function detayDoseme(o) {
    const c = yeni(), mx = Math.max(o.ag ? o.ag.w : 0, o.zayif ? o.zayif.w : 0, 100), k = Math.min(0.55, 110 / mx), ara = (o.ara || 0.2) * 1000 * k, liste = []; let no = 0;
    const kat = (t, y0, ad) => { if (!t) return; const W = t.w * k, H = t.h * k, x0 = 14;
      c.L(0, y0 - 3, x0 + W + 5, y0 - 3, 'k'); c.L(0, y0 - 1, x0 + W + 5, y0 - 1, 'i'); /* konsol */
      c.L(x0, y0 + H, x0, y0, 'k'); c.L(x0, y0, x0 + W, y0, 'k'); c.L(x0 + W, y0, x0 + W, y0 + H, 'k');
      const D = dosemeDizilim(t.kablolar.map(q => Object.assign({}, q, { no: 0 })), t.w, t.h);
      for (const q of D.yer) { q.no = ++no; liste.push(q); daire(c, x0 + q.x * k, y0 + q.y * k, q.r * k); c.T(x0 + q.x * k, y0 + q.y * k - 0.5, Math.max(1.3, Math.min(2, q.r * k * 0.8)), q.no, 'MC', 0, 2); }
      c.T(x0 + W + 8, y0 + H * 0.6, yM('detay'), `${ad} ${t.w}x${t.h} mm`, 'L', 0, 2); c.T(x0 + W + 8, y0 + H * 0.6 - 3.6, yM('detay'), `${t.kablolar.length} kablo`, 'L', 0, 2); };
    const hZ = o.zayif ? o.zayif.h * k : 0, yA = o.zayif ? hZ + 14 : 0; /* tavalar arası gerçekte 200 mm: detayda kısaltılmış, ölçüsü yazılı */ void ara; kat(o.zayif, 0, 'ZAYIF AKIM TAVASI'); kat(o.ag, o.ag ? yA : 0, 'AG KABLO TAVASI');
    const ust = (o.ag ? yA + o.ag.h * k : hZ) + 6; duvar(c, 0, -8, ust); if (o.ag && o.zayif) olc(c, 8, 0, yA, String(Math.round((o.ara || 0.2) * 1000)));
    baslik(c, ust + 2, `KABLO DÖŞEME AÇILIMI — YÜRÜME YOLU ${o.yol}`);
    const h = 2.06, sut = 62, nSat = Math.max(1, Math.ceil(liste.length / 3)); liste.sort((a, b) => a.no - b.no).forEach((q, i) => { const x = Math.floor(i / nSat) * sut, y = -14 - (i % nSat) * h * 1.7; c.T(x, y, h, `${q.no}  ${q.kod}  ${String(q.cins).replace(' mm²', '')}`, 'L', 0, 2); });
    return c.g;
  }
  /* TAVA EK BAĞLANTISI (izometrik): iki tava boyu, ek levhaları, M6 civatalar, topraklama köprüsü */
  function detayEk() {
    const c = yeni(), I = EL._iso(c, 42, 8, 0.11);
    for (const [x0, dx] of [[-300, 290], [10, 290]]) { I.kutu(x0, 0, 0, dx, 200, 2, 'k'); I.kutu(x0, 0, 2, dx, 2, 60, 'k'); I.gizliKutu(x0, 198, 2, dx, 2, 60); for (let x = x0 + 25; x < x0 + dx; x += 45) for (const y of [50, 100, 150]) I.cizgi([x - 7, y, 2], [x + 7, y, 2], 'h'); }
    I.kutu(-60, -3, 8, 120, 3, 46, 'k'); for (const x of [-45, -20, 20, 45]) for (const z of [20, 42]) I.daireXZ(x, -3, z, 3.5, 'i');
    I.yol([[-85, -8, 30], [-40, -30, 12], [40, -30, 12], [85, -8, 30]], 'k');
    I.not([-60, -3, 50], -8, 16, 'DÜZ EK LEVHASI (2 AD.)', yM('detay'), false); I.not([45, -3, 42], 12, 18, '8 x M6x12 CİVATA, SOMUN, PUL'); I.not([40, -30, 12], 18, -10, 'TOPRAKLAMA KÖPRÜSÜ 16 mm² Cu'); I.not([230, 100, 2], 10, 14, 'DELİKLİ GALVANİZ TAVA, L = 3 m');
    let u = 0; for (const l of c.g.L) u = Math.max(u, l[1], l[3]); baslik(c, u + 16, 'KABLO TAVASI EK BAĞLANTI DETAYI'); return c.g;
  }
  /* KONSOL MONTAJI: perde, M10 ankraj, AG ve zayıf akım tavaları (0,20 m), yürüme yolu döşemesi */
  function detayKonsol(o = {}) {
    const c = yeni(), wA = Math.min(60, ((o.wAg || 200) * 0.18)), wZ = Math.min(60, ((o.wZ || 200) * 0.18)), yZ = 0, yA = 36; duvar(c, 0, -14, 72); c.L(0, 66, 72, 66, 'k'); c.L(0, 70, 72, 70, 'k'); c.T(74, 67, yM('detay'), 'YÜRÜME YOLU DÖŞEMESİ', 'L', 0, 2);
    const kat = (y, w, s) => { c.L(0, y - 2, w + 6, y - 2, 'k'); c.L(0, y, w + 6, y, 'k'); c.L(w + 6, y, w + 6, y - 2, 'k'); c.L(0, y - 8, 0 + w * 0.55, y - 2, 'i'); c.L(3, y, 3, y + 11, 'k'); c.L(3, y, 3 + w, y, 'k'); c.L(3 + w, y, 3 + w, y + 11, 'k'); for (const q of [y - 5, y + 4 - 9]) c.L(-7, q, 4, q, 'k'); ok(c, 3 + w, y + 7, 78, y + 12, s); };
    kat(yA, wA, `AG KABLO TAVASI ${o.ag || ''}`.trim()); kat(yZ, wZ, `ZAYIF AKIM TAVASI ${o.zayif || ''}`.trim()); olc(c, 66, yZ, yA, '200');
    ok(c, -5, yZ - 5, -22, yZ - 12, '2 x M10 ANKRAJ'); ok(c, 12, yZ - 2, 40, yZ - 13, 'DUVAR KONSOLU (ARALIK 1,5 m)'); baslik(c, 75, 'TAVA KONSOL MONTAJ DETAYI'); return c.g;
  }
  /* TAVADAN EKİPMANA ÇIKIŞ: tava, çıkış adaptörü, galvaniz boru, kelepçe, JB ve motor kablosu */
  function detayCikis() {
    const c = yeni(); duvar(c, 0, -30, 34); c.L(0, 20, 34, 20, 'k'); c.L(4, 20, 4, 30, 'k'); c.L(4, 20, 30, 20, 'k'); c.L(30, 20, 30, 30, 'k');
    c.B(30, 22, 5, 6, 'k'); c.L(35, 26, 66, 26, 'k'); c.L(35, 23, 63, 23, 'k'); c.L(66, 26, 74, 18, 'k'); c.L(63, 23, 71, 15, 'k'); c.L(74, 18, 74, -6, 'k'); c.L(71, 15, 71, -6, 'k');
    for (const x of [46, 58]) c.B(x, 21.5, 2, 6, 'i'); c.B(65, -18, 15, 12, 'k'); c.L(65, -18, 80, -6, 'i'); c.L(72.5, -18, 72.5, -30, 'i');
    ok(c, 18, 25, 8, 44, 'KABLO TAVASI'); ok(c, 33, 28, 42, 44, 'TAVA ÇIKIŞ ADAPTÖRÜ'); ok(c, 52, 26, 86, 42, 'GALVANİZ BORU (ÇAP TABLODAN)'); ok(c, 59, 21.5, 88, 8, 'BORU KELEPÇESİ (1,5 m)'); ok(c, 80, -10, 88, -8, 'JB / LCU / EKİPMAN'); ok(c, 72.5, -25, 88, -24, 'KABLO RAKORU VE GİRİŞ');
    baslik(c, 52, 'TAVADAN EKİPMANA KABLO ÇIKIŞ DETAYI'); return c.g;
  }

  const api = { KB, SINIF, tavaMetraj, boruMetraj, dosemeDizilim, detayDoseme, detayEk, detayKonsol, detayCikis, yv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (C) C.elTavaApi = api;
})(typeof window !== 'undefined' ? window.C : null);

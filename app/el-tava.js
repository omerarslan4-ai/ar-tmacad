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
  /* branşlar: [{ boru ('1"'), L (m), tava (false: LCU → motor, tavadan çıkmaz) }]; her kablo kendi borusunda (Çorlu boru tablosu kablo başına; kabul) → boru metrajı, çıkış adaptörü, kelepçe */
  function boruMetraj(branslar) {
    const m = new Map(); let kel = 0, n = 0;
    for (const b of branslar || []) { if (!b.boru || !(b.L > 0)) continue; m.set(b.boru, (m.get(b.boru) || 0) + b.L); kel += Math.ceil(b.L / KB.kelepce - 1e-9) + 1; if (b.tava !== false) n++; } /* adaptör yalnız tavadan çıkan kabloda */
    return { boru: [...m].map(([boru, L]) => ({ boru, L })), adaptor: n, kelepce: kel };
  }
  /* kablolar: [{ no, kod, cins, d (dış çap mm) }]; x tava sol iç yüzünden, y taban üstünden (daire merkezi, mm) */
  function dosemeDizilim(kablolar, w, h, ara = 2) {
    const L = (kablolar || []).slice().sort((a, b) => b.d - a.d), out = []; let x = ara, y = 0, sD = 0;
    for (const k of L) { if (x + k.d > w + 1e-9 && x > ara) { y += sD + ara; x = ara; sD = 0; } out.push(Object.assign({}, k, { x: x + k.d / 2, y: y + k.d / 2, r: k.d / 2 })); x += k.d + ara; sD = Math.max(sD, k.d); }
    const ust = out.reduce((t, k) => Math.max(t, k.y + k.r), 0); return { yer: out, ust, sigdi: ust <= h + 1e-9 };
  }

  /* yürüme yolunun iki uzun kenarı: eksene paralel korkuluk parçalarında en uzun toplam boylu iki hat (sahanlık çıkıntıları sayılmaz). a: { u, n, c } */
  function yolKenar(pts, a) { const m = new Map(); for (let i = 1; i < (pts || []).length; i++) { const P = pts[i - 1], Q = pts[i], dx = Q[0] - P[0], dy = Q[1] - P[1], l = Math.hypot(dx, dy); if (l < 1e-6 || Math.abs(dx * a.u[0] + dy * a.u[1]) / l < 0.98) continue; const o = Math.round(((P[0] + Q[0]) / 2 - a.c[0]) * a.n[0] * 100 + ((P[1] + Q[1]) / 2 - a.c[1]) * a.n[1] * 100) / 100; m.set(o, (m.get(o) || 0) + l); }
    const iki = [...m].sort((x, y) => y[1] - x[1]).slice(0, 2).map(x => x[0]); if (iki.length < 2) return { oA: null, oB: null }; return { oA: Math.min(...iki), oB: Math.max(...iki) }; } /* eksen merkezi sahanlıkla kayabilir: işarete değil, boya bakılır */
  /* tavanın gideceği kenar: dışında (1,2 m) ekipmanı az olan; eşitse + kenar → { o, sg, oDiger } */
  function tavaYani(K, ekipO, bant = 1.2) { const say = (o, sg) => (ekipO || []).filter(x => sg * (x - o) > -0.05 && sg * (x - o) <= bant).length, nA = say(K.oA, -1), nB = say(K.oB, 1); return nA < nB ? { o: K.oA, sg: -1, oDiger: K.oB } : { o: K.oB, sg: 1, oDiger: K.oA }; }

  /* kablo girişi: 'baca' (varsayılan) | 'galeri' */
  const kabloGiris = set => (set && set.elKabloGiris === 'galeri' ? 'galeri' : 'baca');
  /* tava ucundan dışa (yon: birim) giden ışının yapı dış çizgisini (kapalı çokgen) son kestiği nokta; kesmezse uç. pay: kenardan dışarı uzaklık → { kenar, merkez } */
  function girisYeri(uc, yon, dis, pay = 0.7) {
    let tMax = null; const n = (dis || []).length;
    for (let i = 0; i < n; i++) { const a = dis[i], b = dis[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], de = yon[0] * ey - yon[1] * ex; if (Math.abs(de) < 1e-9) continue; const ax = a[0] - uc[0], ay = a[1] - uc[1], t = (ax * ey - ay * ex) / de, q = (ax * yon[1] - ay * yon[0]) / de; if (t >= -1e-9 && q >= -1e-9 && q <= 1 + 1e-9 && (tMax == null || t > tMax)) tMax = t; }
    const t = tMax == null ? 0 : tMax, kenar = [uc[0] + yon[0] * t, uc[1] + yon[1] * t]; return { kenar, merkez: [kenar[0] + yon[0] * pay, kenar[1] + yon[1] * pay] };
  }

  /* genel yerleşimden gelen hattın noktası (hedef) → yapı kenarında en yakın giriş; yon: kenardan hedefe (birim) */
  function kenarNokta(q, dis) { let b = null, bd = Infinity, bi = 0, bt = 0; const n = (dis || []).length; for (let i = 0; i < n; i++) { const a = dis[i], c = dis[(i + 1) % n], l2 = (c[0] - a[0]) ** 2 + (c[1] - a[1]) ** 2 || 1, t = Math.max(0, Math.min(1, ((q[0] - a[0]) * (c[0] - a[0]) + (q[1] - a[1]) * (c[1] - a[1])) / l2)), r = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t], d = Math.hypot(q[0] - r[0], q[1] - r[1]); if (d < bd - 1e-9) { bd = d; b = r; bi = i; bt = t; } } return { p: b, i: bi, t: bt, d: bd }; }
  function hedefGiris(hedef, dis, pay = 0.7) { const K = kenarNokta(hedef, dis); if (!K.p) return null; let y = [hedef[0] - K.p[0], hedef[1] - K.p[1]], l = Math.hypot(y[0], y[1]);
    let ic = false; for (let i = 0, j = dis.length - 1; i < dis.length; j = i++) { const a = dis[i], b = dis[j]; if ((a[1] > hedef[1]) !== (b[1] > hedef[1]) && hedef[0] < (b[0] - a[0]) * (hedef[1] - a[1]) / (b[1] - a[1]) + a[0]) ic = !ic; }
    if (l < 1e-6 || ic) { /* kenarda ya da yapının içinde: kenarın dış normali */ const a = dis[K.i], c = dis[(K.i + 1) % dis.length], A2 = dis.reduce((t, p, i) => { const q = dis[(i + 1) % dis.length]; return t + p[0] * q[1] - q[0] * p[1]; }, 0), sg = A2 > 0 ? 1 : -1; y = [sg * (c[1] - a[1]), -sg * (c[0] - a[0])]; l = Math.hypot(y[0], y[1]) || 1; }
    const yon = [y[0] / l, y[1] / l]; return { kenar: K.p, yon, merkez: [K.p[0] + yon[0] * pay, K.p[1] + yon[1] * pay] }; }
  /* çokgen çevresinde a'dan b'ye kısa yol (a ve b dahil) */
  function cevreYol(dis, a, b) { const n = (dis || []).length; if (n < 3) return [a, b]; const A = kenarNokta(a, dis), B = kenarNokta(b, dis), boy = P => P.reduce((t, p, i) => (i ? t + Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]) : 0), 0), ileri = [a], geri = [a];
    if (A.i === B.i && B.t >= A.t) ileri.push(b); else { for (let i = (A.i + 1) % n, k = 0; k < n; i = (i + 1) % n, k++) { ileri.push(dis[i]); if (i === B.i) break; } ileri.push(b); }
    if (A.i === B.i && B.t <= A.t) geri.push(b); else { for (let i = A.i, k = 0; k < n; i = (i - 1 + n) % n, k++) { geri.push(dis[i]); if (i === (B.i + 1) % n) break; } geri.push(b); }
    return boy(ileri) <= boy(geri) ? ileri : geri; }

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
    const c = yeni(), gen = t => (t ? (t.n || 1) * t.w + ((t.n || 1) - 1) * 50 : 0), mx = Math.max(gen(o.ag), gen(o.zayif), 100), k = Math.min(0.55, 110 / mx), ara = (o.ara || 0.2) * 1000 * k, liste = []; let no = 0;
    const kat = (t, y0, ad) => { if (!t) return; const nT = t.n || 1, W = gen(t) * k, H = t.h * k, x00 = 14, sir = t.kablolar.slice().sort((a, b) => b.d - a.d);
      c.L(0, y0 - 3, x00 + W + 5, y0 - 3, 'k'); c.L(0, y0 - 1, x00 + W + 5, y0 - 1, 'i'); /* konsol */
      for (let iT = 0; iT < nT; iT++) { const x0 = x00 + iT * (t.w + 50) * k, Wt = t.w * k; c.L(x0, y0 + H, x0, y0, 'k'); c.L(x0, y0, x0 + Wt, y0, 'k'); c.L(x0 + Wt, y0, x0 + Wt, y0 + H, 'k');
        const D = dosemeDizilim(sir.filter((_, i) => i % nT === iT).map(q => Object.assign({}, q, { no: 0 })), t.w, t.h);
        for (const q of D.yer) { q.no = ++no; liste.push(q); daire(c, x0 + q.x * k, y0 + q.y * k, q.r * k); c.T(x0 + q.x * k, y0 + q.y * k - 0.5, Math.max(1.3, Math.min(2, q.r * k * 0.8)), q.no, 'MC', 0, 2); } }
      c.T(x00 + W + 8, y0 + H * 0.6, yM('detay'), `${ad} ${nT > 1 ? nT + 'x' : ''}${t.w}x${t.h} mm`, 'L', 0, 2); c.T(x00 + W + 8, y0 + H * 0.6 - 3.6, yM('detay'), `${t.kablolar.length} kablo`, 'L', 0, 2); };
    const hZ = o.zayif ? o.zayif.h * k : 0, yA = o.zayif ? hZ + 14 : 0; /* tavalar arası gerçekte 200 mm: detayda kısaltılmış, ölçüsü yazılı */ void ara; kat(o.zayif, 0, 'ZAYIF AKIM TAVASI'); kat(o.ag, o.ag ? yA : 0, 'AG KABLO TAVASI');
    const ust = (o.ag ? yA + o.ag.h * k : hZ) + 6; duvar(c, 0, -8, ust); if (o.ag && o.zayif) olc(c, 8, 0, yA, String(Math.round((o.ara || 0.2) * 1000)));
    baslik(c, ust + 2, `KABLO DÖŞEME AÇILIMI — YÜRÜME YOLU ${o.yol}`);
    const h = yM('cetvel'), sut = 62, nSat = Math.max(1, Math.ceil(liste.length / 3)); liste.sort((a, b) => a.no - b.no).forEach((q, i) => { const x = Math.floor(i / nSat) * sut, y = -14 - (i % nSat) * h * 1.7; c.T(x, y, h, `${q.no}  ${q.kod}  ${String(q.cins).replace(' mm²', '')}`, 'L', 0, 2); });
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
    const c = yeni(), wA = Math.min(46, (o.wAg || 200) * 0.18), wZ = Math.min(46, (o.wZ || 200) * 0.18), yZ = 31, yA = 44;
    c.B(-56, 30, 56, 12, 'k'); for (let x = -52; x < -2; x += 5) c.L(x, 30, x + 4, 42, 'h'); c.T(-30, 45, yM('detay'), 'YÜRÜME YOLU (SERBEST)', 'MC', 0, 2); c.L(-56, 0, -8, 0, 'h'); c.B(-50, -12, 12, 42, 'k');
    c.L(-5, 42, -5, 74, 'k'); c.L(-8, 74, -2, 74, 'k'); c.L(-5, 58, 0, 58, 'i'); ok(c, -5, 66, -24, 66, 'KORKULUK');
    c.B(0, 26, 2.4, 34, 'k'); for (const q of [33, 39]) c.L(-7, q, 3, q, 'k');
    const kat = (y, w, ad) => { c.L(2.4, y - 2, 8 + w, y - 2, 'k'); c.L(2.4, y, 8 + w, y, 'k'); c.L(8 + w, y, 8 + w, y - 2, 'k'); c.L(5, y, 5, y + 11, 'k'); c.L(5, y, 5 + w, y, 'k'); c.L(5 + w, y, 5 + w, y + 11, 'k'); ok(c, 5 + w, y + 7, 66, y + 12, ad); };
    kat(yA, wA, `AG KABLO TAVASI ${o.ag || ''}`.trim()); kat(yZ, wZ, `ZAYIF AKIM TAVASI ${o.zayif || ''}`.trim()); olc(c, 58, yZ, yA, String(Math.round((o.ara || 0.2) * 1000)));
    ok(c, -3, 33, -24, 18, '2 x M10 ANKRAJ (DÖŞEME KENARI)'); ok(c, 1, 27, 26, 12, 'GALVANİZ DİKME VE KONSOL (ARALIK 1,5 m)'); baslik(c, 78, 'TAVA KONSOL MONTAJ DETAYI'); return c.g;
  }
  /* TAVADAN EKİPMANA ÇIKIŞ: tava, çıkış adaptörü, galvaniz boru, kelepçe, JB ve motor kablosu */
  function detayCikis() {
    const c = yeni(); duvar(c, 0, -30, 34); c.L(0, 20, 34, 20, 'k'); c.L(4, 20, 4, 30, 'k'); c.L(4, 20, 30, 20, 'k'); c.L(30, 20, 30, 30, 'k');
    c.B(30, 22, 5, 6, 'k'); c.L(35, 26, 66, 26, 'k'); c.L(35, 23, 63, 23, 'k'); c.L(66, 26, 74, 18, 'k'); c.L(63, 23, 71, 15, 'k'); c.L(74, 18, 74, -6, 'k'); c.L(71, 15, 71, -6, 'k');
    for (const x of [46, 58]) c.B(x, 21.5, 2, 6, 'i'); c.B(65, -18, 15, 12, 'k'); c.L(65, -18, 80, -6, 'i'); c.L(72.5, -18, 72.5, -30, 'i');
    ok(c, 18, 25, 8, 44, 'KABLO TAVASI'); ok(c, 33, 28, 42, 44, 'TAVA ÇIKIŞ ADAPTÖRÜ'); ok(c, 52, 26, 86, 42, 'GALVANİZ BORU (ÇAP TABLODAN)'); ok(c, 59, 21.5, 88, 8, 'BORU KELEPÇESİ (1,5 m)'); ok(c, 80, -10, 88, -8, 'JB / LCU / EKİPMAN'); ok(c, 72.5, -25, 88, -24, 'KABLO RAKORU VE GİRİŞ');
    baslik(c, 52, 'TAVADAN EKİPMANA KABLO ÇIKIŞ DETAYI'); return c.g;
  }

  /* kablo girişi kesiti: tava ucu, düşey iniş, kablo bacası + PVC boru ya da kablo galerisi */
  function detayGiris(tur, o = {}) {
    const c = yeni(), baca = tur !== 'galeri'; duvar(c, 0, -30, 34); c.L(0, 0, 100, 0, 'k'); c.T(102, -0.8, yM('detay'), 'ZEMİN', 'L', 0, 2); c.L(0, 24, 22, 24, 'k'); c.L(0, 22, 22, 22, 'i'); c.L(3, 24, 3, 31, 'k'); c.L(22, 24, 22, 31, 'k');
    c.L(22, 27, 44, 27, 'k'); c.L(22, 25, 42, 25, 'k'); c.L(44, 27, 44, -8, 'k'); c.L(42, 25, 42, -8, 'k');
    ok(c, 12, 28, 8, 44, 'KABLO TAVASI'); ok(c, 44, 15, 62, 28, 'GALVANİZ BORU İÇİNDE İNİŞ'); ok(c, 0, 8, -6, 18, 'YAPI GİRİŞİ (YÖN GENEL YERLEŞİMDEN)');
    if (baca) { c.B(30, -24, 32, 24, 'k'); c.B(33, -21, 26, 21, 'i'); c.L(28, 0, 64, 0, 'b'); c.L(62, -12, 96, -12, 'k'); c.L(62, -16, 96, -16, 'k'); olc(c, 26, -24, 0, String(Math.round((o.h || 1.2) * 1000))); ok(c, 56, -6, 72, 12, `KABLO BACASI ${Math.round((o.dis || 1) * 100)}x${Math.round((o.dis || 1) * 100)} cm (İÇ ${Math.round((o.ic || 0.8) * 100)}x${Math.round((o.ic || 0.8) * 100)})`); ok(c, 84, -14, 90, -26, '4xØ100 PVC BORU (MCC YÖNÜ)'); baslik(c, 50, 'KABLO BACASI GİRİŞ DETAYI'); }
    else { c.B(28, -34, 68, 30, 'k'); c.L(32, -14, 44, -14, 'k'); c.L(32, -22, 44, -22, 'k'); c.L(44, -8, 44, -14, 'k'); olc(c, 24, -34, -4, String(Math.round((o.h || 2) * 1000))); ok(c, 70, -18, 78, 12, 'KABLO GALERİSİ (GENEL YERLEŞİME GÖRE)'); ok(c, 38, -22, 60, -29, 'GALERİ TAVALARI'); baslik(c, 50, 'KABLO GALERİSİ GİRİŞ DETAYI'); }
    return c.g;
  }

  /* LOKAL KUMANDA PANOSU (LCU): ön görünüş, kumanda prensip şeması, KK-LK-1 10x1.5 damar tablosu. Güç kontaktörü MCC'de (kabul) */
  const LCU_DAMAR = [[1, 'KUMANDA FAZI (L)'], [2, 'NÖTR (N)'], [3, 'OTOMATİK KONUM SİNYALİ'], [4, 'MANUEL KONUM SİNYALİ'], [5, 'START'], [6, 'STOP'], [7, 'ÇALIŞIYOR LAMBASI'], [8, 'ARIZA LAMBASI'], [9, 'YEDEK'], [10, 'YEDEK']];
  function detayLCU() {
    const c = yeni(), h = yM('detay'), W = 64, H = 80, kk = (x, y, r, ad) => { daire(c, x, y, r, 'k'); daire(c, x, y, r * 0.65); c.T(x, y - r - h - 0.8, h * 0.85, ad, 'MC', 0, 2); };
    c.B(0, 0, W, H, 'k'); c.B(3, 3, W - 6, H - 6, 'i'); c.B(16, H - 13, 32, 7, 'i'); c.T(32, H - 11.2, h, 'LCU-<EKİPMAN>', 'MC', 0, 2);
    daire(c, 32, 50, 7, 'k'); c.L(32, 50, 27, 55, 'k'); c.T(32, 59, h * 0.9, '0', 'MC', 0, 2); c.T(23, 53, h * 0.85, 'OTOMATİK', 'R', 0, 2); c.T(41, 53, h * 0.85, 'MANUEL', 'L', 0, 2);
    kk(20, 30, 5, 'START'); kk(44, 30, 5, 'STOP'); kk(20, 13, 3.2, 'ÇALIŞIYOR'); kk(44, 13, 3.2, 'ARIZA');
    c.L(0, -4, W, -4, 'h'); c.T(W / 2, -8, yM('olcu'), '400', 'MC', 0, 2); c.L(-4, 0, -4, H, 'h'); c.T(-6, H / 2, yM('olcu'), '500', 'MC', Math.PI / 2, 2); c.T(0, -13, h, 'GÖVDE 400x500x200 mm, IP65', 'L', 0, 2);
    /* kumanda prensip şeması */
    const x0 = 86, x1 = 176, y = i => H - 8 - i * 17; c.L(x0, H, x0, y(3) - 4, 'k'); c.L(x1, H, x1, y(3) - 4, 'k'); c.T(x0, H + 2, h, 'L', 'MC', 0, 2); c.T(x1, H + 2, h, 'N', 'MC', 0, 2);
    const ct = (x, yy, ad, kap) => { c.L(x, yy, x + 3, yy, 'i'); c.L(x + 3, yy, x + 11, yy + (kap ? -1.8 : 3), 'k'); if (kap) c.L(x + 11, yy + 1.5, x + 11, yy - 2.5, 'i'); c.L(x + 11, yy, x + 14, yy, 'i'); c.T(x + 7, yy + 4.5, h * 0.72, ad, 'MC', 0, 2); };
    const yuk = (yy, ad, x) => { c.L(x, yy, x1 - 11, yy, 'i'); c.B(x1 - 11, yy - 2.5, 7, 5, 'k'); c.L(x1 - 4, yy, x1, yy, 'i'); c.T(x1 - 7.5, yy + 4, h * 0.72, ad, 'MC', 0, 2); };
    ct(x0, y(0), 'STOP', true); ct(x0 + 14, y(0), 'A-0-M: M'); ct(x0 + 28, y(0), 'START'); yuk(y(0), 'K1', x0 + 42);
    c.L(x0 + 28, y(0), x0 + 28, y(0) - 7, 'i'); ct(x0 + 28, y(0) - 7, 'K1'); c.L(x0 + 42, y(0) - 7, x0 + 42, y(0), 'i');
    ct(x0, y(1), 'A-0-M: A', false); ct(x0 + 14, y(1), 'PLC'); yuk(y(1), 'K1', x0 + 28);
    ct(x0, y(2), 'K1'); yuk(y(2), 'H1', x0 + 14); ct(x0, y(3), 'F1 ARIZA'); yuk(y(3), 'H2', x0 + 14);
    c.T(x0, y(3) - 9, h * 0.85, 'K1: MOTOR KONTAKTÖRÜ (MCC), H1: ÇALIŞIYOR, H2: ARIZA', 'L', 0, 2);
    /* damar tablosu */
    const xT = 196, hS = 5.4; c.T(xT, H + 2, h, 'KK-LK-1 (10x1.5) DAMARLARI', 'L', 0, 2); c.B(xT, H - LCU_DAMAR.length * hS, 62, LCU_DAMAR.length * hS, 'k'); c.L(xT + 10, H, xT + 10, H - LCU_DAMAR.length * hS, 'i');
    LCU_DAMAR.forEach(([n, ad], i) => { const yy = H - (i + 1) * hS; if (i < LCU_DAMAR.length - 1) c.L(xT, yy, xT + 62, yy, 'i'); c.T(xT + 5, yy + 1.6, yM('cetvel'), n, 'MC', 0, 2); c.T(xT + 12, yy + 1.6, yM('cetvel'), ad, 'L', 0, 2); });
    baslik(c, H + 7, 'LOKAL KUMANDA PANOSU (LCU) DETAYI'); return c.g;
  }

  const api = { yolKenar, tavaYani, LCU_DAMAR, detayLCU, kenarNokta, hedefGiris, cevreYol, kabloGiris, girisYeri, detayGiris, KB, SINIF, tavaMetraj, boruMetraj, dosemeDizilim, detayDoseme, detayEk, detayKonsol, detayCikis, yv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (C) C.elTavaApi = api;
})(typeof window !== 'undefined' ? window.C : null);

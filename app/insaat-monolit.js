/* ArıtmaCAD — MONOLİTİK GÖRÜNÜM: saf hesaplar (insaat.js ve kesit.js kullanır; Node'da test/insaat-monolit.test.js)
   1) Duvar (perde) şerit ayrışımı: pencere / kapı / kolon / lento boşlukları olan duvar (s, z) düzleminde dikdörtgen parçalara ayrılır.
      Parçalar arasındaki iç yüzler (iki parçanın sırt sırta değdiği uç kapakları, lentoya oturan alt / üst yüzler) üretilmez:
      duvar 3B'de ve kesitte tek kütle görünür, yalnız boşlukların (söve, denizlik, lento altı) yüzleri kalır.
   2) Kiriş – döşeme birleşimi: döşemeyle birlikte dökülen kirişin (üst kotu döşeme üstüyle ya da döşeme altıyla aynı, planda döşemenin altında)
      döşeme içinde kalan kısmı görünümde döşemenin içine gömülür; kesitte ikisi tek beton kütlesi (tek dış hat, tek tarama) olur.
      Veri ayrı kalır: statik modele çevirme ve metraj kirişi ve döşemeyi ayrı eleman olarak okur.
   Hiçbir fonksiyon belgeye (C.doc) dokunmaz. */
(function (C) {
  'use strict';
  const MN = C.insMono = {};
  const EPS = 1e-6;

  /* ---------- aralık yardımcıları ---------- */
  MN.birlestir = iv => { const s = iv.filter(q => q[1] > q[0] + EPS).map(q => q.slice()).sort((a, b) => a[0] - b[0]), o = []; for (const q of s) { const l = o[o.length - 1]; if (l && q[0] <= l[1] + EPS) l[1] = Math.max(l[1], q[1]); else o.push(q); } return o; };
  /* [a, b] aralığından listedeki aralıkları çıkar */
  MN.cikar = (a, b, iv) => { let cur = [[a, b]]; for (const [c, d] of MN.birlestir(iv)) { const nx = []; for (const [x, y] of cur) { if (d <= x + EPS || c >= y - EPS) { nx.push([x, y]); continue; } if (c > x + EPS) nx.push([x, c]); if (d < y - EPS) nx.push([d, y]); } cur = nx; } return cur.filter(q => q[1] - q[0] > 1e-4); };
  MN.kesisim = (A, B) => { const o = []; for (const [a, b] of A) for (const [c, d] of B) { const x = Math.max(a, c), y = Math.min(b, d); if (y > x + EPS) o.push([x, y]); } return MN.birlestir(o); };

  /* ---------- 1) DUVAR ŞERİT AYRIŞIMI ----------
     L: segment boyu; z0, h: duvar alt kotu ve yüksekliği; my: [{ s0, s1, za, zb, o: { kind } }] (kind: 'pencere' | 'kapi' | 'kolon' | 'lento').
     lento duvarın içinde ayrı malzemeli dolu bir gövdedir; ötekiler boşluktur.
     Döner: { pieces: [{ sa, sb, za, zb, alt, ust, bas, son }], lentolar: [{ q, alt: [[s0, s1]], ust, bas, son }] }
       sa / sb : null = segmentin başı / sonu (uç yüzü gönye ile insaat.js çizer); alt / ust: o yüz çizilsin mi;
       bas / son: null = tam uç yüzü (segment ucu), [] = iç yüz (çizilmez), [[z1, z2]…] = yalnız açıkta kalan kısımlar (söve) */
  MN.duvarParca = (L, z0, h, my) => {
    const zt = z0 + h, bps = [...new Set(my.flatMap(q => [q.s0, q.s1]).filter(v => v > EPS && v < L - EPS).map(v => +v.toFixed(6)))].sort((a, b) => a - b), xs = [null, ...bps, null];
    const strips = [];
    for (let k = 0; k + 1 < xs.length; k++) {
      const xa = xs[k], xb = xs[k + 1];
      if (xa == null && xb != null && xb <= 0.02) continue; if (xb == null && xa != null && xa >= L - 0.02) continue; if (xa != null && xb != null && xb - xa < 0.004) continue;
      const ma = xa == null ? 0 : xa, mb = xb == null ? L : xb, kap = my.filter(q => q.s0 <= ma + EPS && q.s1 >= mb - EPS);
      const cov = kap.map(q => [q.za, q.zb]).sort((a, b) => a[0] - b[0]), pcs = [];
      let z = z0; for (const [ca, cb] of cov) { if (ca > z + EPS) pcs.push({ sa: xa, sb: xb, za: z, zb: ca }); z = Math.max(z, cb); } if (z < zt - EPS) pcs.push({ sa: xa, sb: xb, za: z, zb: zt });
      const lent = kap.filter(q => q.o && q.o.kind === 'lento');
      strips.push({ xa, xb, pcs, lent, dolu: MN.birlestir(pcs.map(p => [p.za, p.zb]).concat(lent.map(q => [q.za, q.zb]))) });
    }
    const komsu = (x, onceki) => strips.find(s => (onceki ? s.xb : s.xa) != null && Math.abs((onceki ? s.xb : s.xa) - x) < EPS);
    const pieces = [];
    for (const st of strips) for (const pc of st.pcs) {
      pc.alt = !st.lent.some(q => Math.abs(q.zb - pc.za) < 1e-5);
      pc.ust = !st.lent.some(q => Math.abs(q.za - pc.zb) < 1e-5);
      const capOf = (x, onceki) => { if (x == null) return null; const n = komsu(x, onceki); return MN.cikar(pc.za, pc.zb, n ? n.dolu : []); };
      pc.bas = capOf(pc.sa, true); pc.son = capOf(pc.sb, false);
      pieces.push(pc);
    }
    // lento yüzleri: önü / arkası her zaman; altı yalnız boşluğun üstünde, üstü duvar tepesindeyse, uçları segment ucundaysa
    const lentolar = my.filter(q => q.o && q.o.kind === 'lento').map(q => {
      const bos = my.filter(r => r !== q && r.o && r.o.kind !== 'lento' && r.o.kind !== 'kolon' && Math.abs(r.zb - q.za) < 0.011).map(r => [r.s0, r.s1]);
      return { q, alt: MN.kesisim([[q.s0, q.s1]], bos), ust: q.zb >= zt - 1e-5, bas: q.s0 <= EPS, son: q.s1 >= L - EPS };
    });
    return { pieces, lentolar, strips };
  };

  /* ---------- 2) KİRİŞ – DÖŞEME BİRLEŞİMİ ---------- */
  const inPoly = (q, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  MN.inPoly = inPoly;
  /* A + u·s doğrusunun [0, Lb] aralığında çokgen içinde kalan s aralıkları */
  MN.cizgiIcinde = (A, u, Lb, poly) => {
    const ts = [0, Lb];
    for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], e = [q[0] - p[0], q[1] - p[1]], den = u[0] * e[1] - u[1] * e[0]; if (Math.abs(den) < 1e-12) continue; const w = [p[0] - A[0], p[1] - A[1]], t = (w[0] * e[1] - w[1] * e[0]) / den, v = (w[0] * u[1] - w[1] * u[0]) / den; if (v >= -EPS && v <= 1 + EPS && t > 0 && t < Lb) ts.push(t); }
    ts.sort((a, b) => a - b); const o = [];
    for (let k = 0; k + 1 < ts.length; k++) { if (ts[k + 1] - ts[k] < 1e-5) continue; const m = (ts[k] + ts[k + 1]) / 2; if (inPoly([A[0] + u[0] * m, A[1] + u[1] * m], poly)) o.push([ts[k], ts[k + 1]]); }
    return MN.birlestir(o);
  };
  /* kirişin döşemeyle birlikte dökülüp dökülmediği: kiriş üstü döşeme üstünde (döşemenin içinden geçer) ya da döşeme altında (döşemeyi taşır)
     B: { a, u, nn, w, Lb, zt, zb } (kiriş ekseni, birim yön, normal, yarı genişlik, boy, üst / alt kot); D: { poly, zt, za } (döşeme)
     Döner: null ya da { zc: kirişin görünen üst kotu (döşeme altı), ivs: [[s0, s1]…] döşemenin altında kalan aralıklar,
                         kenar: [{ s0, s1, yan: +1 | −1 }] döşeme kenarıyla aynı hizadaki kiriş yüzleri, uc: [s…] döşeme kenarıyla aynı hizadaki kiriş uçları } */
  MN.kirisDoseme = (B, D, tol) => {
    tol = tol == null ? 0.011 : tol;
    if (!B || !D || !D.poly || D.poly.length < 3 || !(B.Lb > 1e-6)) return null;
    const ust = Math.abs(B.zt - D.zt) <= tol, alt = Math.abs(B.zt - D.za) <= tol; if (!ust && !alt) return null;
    if (D.za <= B.zb + 1e-4) return null;                                                   // kiriş döşemeden sığ: döşemenin içinde kalır, olduğu gibi bırakılır
    const ic = 0.002, line = o => MN.cizgiIcinde([B.a[0] + B.nn[0] * o, B.a[1] + B.nn[1] * o], B.u, B.Lb, D.poly);
    const ivs = MN.kesisim(line(B.w - ic), line(-B.w + ic)); if (!ivs.length) return null;
    const kenar = [], uc = [], d = 0.01;
    for (const yan of [1, -1]) { const dis = line(yan * (B.w + d)); for (const [s0, s1] of ivs) for (const [x0, x1] of MN.cikar(s0, s1, dis)) kenar.push({ s0: x0, s1: x1, yan }); } // yüzün hemen dışı döşeme değilse: yüz döşeme kenarıyla aynı hizada
    for (const [s0, s1] of ivs) {
      for (const s of [s0, s1]) { const t = s === s0 ? s - d : s + d; if (t < -EPS || t > B.Lb + EPS) continue; const q = [B.a[0] + B.u[0] * t, B.a[1] + B.u[1] * t]; if (!inPoly(q, D.poly)) uc.push(s); }
    }
    return { zc: D.za, ivs, kenar, uc, ust };
  };
  /* 2B doğru parçasından (p–q) aynı doğru üzerindeki parçaları çıkar (kenar çizgisi silme) */
  MN.parcaCikar = (p, q, kes, tol) => {
    tol = tol || 1e-4; const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); if (L < 1e-9) return [[p, q]];
    const ux = dx / L, uy = dy / L, iv = [];
    for (const [a, b] of kes) { const da = (a[0] - p[0]) * uy - (a[1] - p[1]) * ux, db = (b[0] - p[0]) * uy - (b[1] - p[1]) * ux; if (Math.abs(da) > tol || Math.abs(db) > tol) continue; const ta = (a[0] - p[0]) * ux + (a[1] - p[1]) * uy, tb = (b[0] - p[0]) * ux + (b[1] - p[1]) * uy; iv.push([Math.min(ta, tb), Math.max(ta, tb)]); }
    if (!iv.length) return [[p, q]];
    return MN.cikar(0, L, iv).map(([a, b]) => [[p[0] + ux * a, p[1] + uy * a], [p[0] + ux * b, p[1] + uy * b]]);
  };
})(typeof window !== 'undefined' ? window.C : (globalThis.C = globalThis.C || {}));

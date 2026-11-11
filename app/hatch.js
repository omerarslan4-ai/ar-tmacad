/* ArıtmaCAD — TARAMA (HATCH): AutoCAD desenleri, alan içine tıklayarak (ada algılamalı) ya da nesne seçerek,
   açıklama ölçeğine göre otomatik desen boyu, DXF HATCH yazma/okuma */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, T = C.T, { L, P, S } = C.prim;
  const RAD = Math.PI / 180;

  /* ---------- desen kütüphanesi (acadiso.pat, mm) — satır: [açı, x0, y0, dx, dy, ...çizgi/boşluk] ---------- */
  const PAT = C.HATCH_PATTERNS = {
    SOLID: { d: 'Dolu', solid: true },
    ANSI31: { d: 'ANSI31 — demir, tuğla, genel kesit', l: [[45, 0, 0, 0, 3.175]] },
    ANSI32: { d: 'ANSI32 — çelik', l: [[45, 0, 0, 0, 9.525], [45, 4.490128, 0, 0, 9.525]] },
    ANSI33: { d: 'ANSI33 — bronz, pirinç', l: [[45, 0, 0, 0, 6.35], [45, 4.490128, 0, 0, 6.35, 3.175, -1.5875]] },
    ANSI34: { d: 'ANSI34 — plastik, kauçuk', l: [[45, 0, 0, 0, 19.05], [45, 4.490128, 0, 0, 19.05], [45, 8.980256, 0, 0, 19.05], [45, 13.470384, 0, 0, 19.05]] },
    ANSI35: { d: 'ANSI35 — ateş tuğlası', l: [[45, 0, 0, 0, 6.35], [45, 4.490128, 0, 0, 6.35, 7.9375, -1.5875, 0, -1.5875]] },
    ANSI36: { d: 'ANSI36 — mermer, cam', l: [[45, 0, 0, 5.55625, 3.175, 7.9375, -1.5875, 0, -1.5875]] },
    ANSI37: { d: 'ANSI37 — kurşun, çinko', l: [[45, 0, 0, 0, 3.175], [135, 0, 0, 0, 3.175]] },
    ANSI38: { d: 'ANSI38 — alüminyum', l: [[45, 0, 0, 0, 3.175], [135, 0, 0, 6.35, 3.175, 7.9375, -4.7625]] },
    'AR-CONC': { d: 'Beton', l: [[50, 0, 0, 104.896, -149.807, 19.05, -209.55], [355, 0, 0, -51.7604, 187.258, 15.24, -167.64], [100.4514, 15.182, -1.328, 145.557, -176.27, 16.19, -178.09], [46.1842, 0, 50.8, 158.964, -127.233, 9.525, -104.775], [96.6356, 22.59, 47.297, 187.258, -51.7604, 9.714, -106.854], [351.1842, 0, 50.8, 198.123, -71.456, 7.62, -83.82], [21, 25.4, 38.1, 124.46, -140.08, 12.7, -139.7], [326, 25.4, 38.1, -55.7, 167.64, 10.16, -111.76], [71.3, 33.2, 34.08, 133.2, -168.2, 10.4, -114.5], [37.5, 0, 0, 25.4, 63.5, 0, -127, 0, -114.3], [7.5, 0, 0, 50.8, 76.2, 0, -110.49, 0, -129.54], [-32.5, -56.2, 0, 63.5, 50.8, 0, -142.24, 0, -101.6], [-42.5, -45, 0, 76.2, 25.4, 0, -127, 0, -152.4]], f: 0.05 },
    'AR-SAND': { d: 'Kum', l: [[37.5, 0, 0, 28.6, 31.1, 0, -38.1, 0, -34.29, 0, -28.6], [7.5, 0, 0, 39.5, 35.2, 0, -50.4, 0, -40.1, 0, -30.5], [-32.5, -56.2, 0, 50.2, 33.7, 0, -36.8, 0, -51.4, 0, -44.6], [-42.5, -45, 0, 45.1, 26.4, 0, -47.6, 0, -35.2, 0, -61.0]], f: 0.05 },
    'AR-B816': { d: 'Briket 8x16"', l: [[0, 0, 0, 0, 203.2], [90, 0, 0, 203.2, 203.2, 203.2, -203.2]], real: true },
    'AR-BRSTD': { d: 'Standart tuğla', l: [[0, 0, 0, 0, 67.733], [90, 0, 0, 67.733, 101.6, 67.733, -67.733]], real: true },
    'AR-HBONE': { d: 'Balıksırtı', l: [[45, 0, 0, 101.6, 101.6, 304.8, -101.6], [135, 71.842, 71.842, 101.6, -101.6, 304.8, -101.6]], real: true },
    'AR-PARQ1': { d: 'Parke', l: [[90, 0, 0, 304.8, 304.8, 304.8, -304.8], [90, 50.8, 0, 304.8, 304.8, 304.8, -304.8], [90, 101.6, 0, 304.8, 304.8, 304.8, -304.8], [90, 152.4, 0, 304.8, 304.8, 304.8, -304.8], [90, 203.2, 0, 304.8, 304.8, 304.8, -304.8], [90, 254, 0, 304.8, 304.8, 304.8, -304.8], [90, 304.8, 0, 304.8, 304.8, 304.8, -304.8], [0, 0, 304.8, 304.8, -304.8, 304.8, -304.8], [0, 0, 355.6, 304.8, -304.8, 304.8, -304.8], [0, 0, 406.4, 304.8, -304.8, 304.8, -304.8], [0, 0, 457.2, 304.8, -304.8, 304.8, -304.8], [0, 0, 508, 304.8, -304.8, 304.8, -304.8], [0, 0, 558.8, 304.8, -304.8, 304.8, -304.8], [0, 0, 609.6, 304.8, -304.8, 304.8, -304.8]], real: true },
    'AR-RROOF': { d: 'Çatı kaplaması', l: [[0, 0, 0, 55.88, 25.4, 381, -50.8, 127, -25.4], [0, 33.782, 12.7, -25.4, 33.782, 76.2, -8.382, 152.4, -19.05], [0, 12.7, 21.59, 132.08, 17.018, 203.2, -35.56, 101.6, -25.4]], real: true },
    BRICK: { d: 'Tuğla', l: [[0, 0, 0, 0, 6.35], [90, 0, 0, 0, 12.7, 6.35, -6.35], [90, 6.35, 0, 0, 12.7, -6.35, 6.35]] },
    EARTH: { d: 'Toprak', l: [[0, 0, 0, 6.35, 6.35, 6.35, -6.35], [0, 0, 2.38125, 6.35, 6.35, 6.35, -6.35], [0, 0, 4.7625, 6.35, 6.35, 6.35, -6.35], [90, 0.79375, 5.55625, 6.35, 6.35, 6.35, -6.35], [90, 3.175, 5.55625, 6.35, 6.35, 6.35, -6.35], [90, 5.55625, 5.55625, 6.35, 6.35, 6.35, -6.35]] },
    GRAVEL: { d: 'Çakıl', l: [[228.0128, 18.288, 25.4, 305.85, -10.6, 4.1, -405.3], [184.9697, 16.002, 22.86, -305.68, 8.7, 4.6, -453], [132.5104, 10.16, 22.352, 230.97, -17.6, 3.4, -222.4], [267.2737, 0.254, 16.002, 25.4, 1.2, 4.4, -248.4], [292.8337, 0, 10.668, 233.7, 10.04, 4.3, -230], [357.2737, 2.032, 5.588, -25.4, 1.2, 5.5, -248.3], [37.6942, 7.366, 5.334, -300.9, 13.4, 5.4, -497.9], [72.2553, 12.954, 9.652, 129.2, 7.4, 6.2, -307.6], [121.4296, 14.986, 17.272, -307.1, 16.9, 3.9, -255.9], [175.2364, 12.954, 20.574, -305.8, 2.1, 1.7, -233.9], [222.3974, 11.176, 20.828, -256.3, 15.6, 3.1, -277]] },
    HONEY: { d: 'Bal peteği', l: [[0, 0, 0, 4.7625, 2.749630645, 3.175, -6.35], [120, 0, 0, 4.7625, 2.749630645, 3.175, -6.35], [60, 3.175, 0, 4.7625, 2.749630645, 3.175, -6.35]] },
    NET: { d: 'Kare ızgara', l: [[0, 0, 0, 0, 3.175], [90, 0, 0, 0, 3.175]] },
    NET3: { d: 'Üçlü ızgara', l: [[0, 0, 0, 0, 3.175], [60, 0, 0, 0, 3.175], [120, 0, 0, 0, 3.175]] },
    LINE: { d: 'Yatay çizgi', l: [[0, 0, 0, 0, 3.175]] },
    CROSS: { d: 'Artı', l: [[0, 0, 0, 6.35, 6.35, 3.175, -9.525], [90, 1.5875, -1.5875, 6.35, 6.35, 3.175, -9.525]] },
    DOTS: { d: 'Noktalar', l: [[0, 0, 0, 0.79375, 1.5875, 0, -1.5875]] },
    SQUARE: { d: 'Kareler', l: [[0, 0, 0, 0, 3.175, 3.175, -3.175], [90, 0, 0, 0, 3.175, 3.175, -3.175]] },
    STEEL: { d: 'Çelik', l: [[45, 0, 0, 0, 3.175], [45, 0, 1.5875, 0, 3.175]] },
    ZIGZAG: { d: 'Zikzak', l: [[0, 0, 0, 3.175, 3.175, 3.175, -3.175], [90, 3.175, 0, 3.175, 3.175, 3.175, -3.175]] },
    DASH: { d: 'Kesik çizgi', l: [[0, 0, 0, 3.175, 3.175, 3.175, -3.175]] },
    SWAMP: { d: 'Bataklık', l: [[0, 0, 0, 12.7, 21.997, 3.175, -22.225], [90, 1.5875, 0, 21.997, 12.7, 1.5875, -42.4], [90, 1.984, 0, 21.997, 12.7, 1.27, -42.72], [90, 1.191, 0, 21.997, 12.7, 1.27, -42.72], [60, 2.381, 0, 12.7, 21.997, 1.016, -24.384], [120, 0.794, 0, 12.7, 21.997, 1.016, -24.384]] },
    GRASS: { d: 'Çim', l: [[90, 0, 0, 17.96, 17.96, 4.7625, -31.163], [45, 0, 0, 0, 25.4, 4.7625, -20.6375], [135, 0, 0, 0, 25.4, 4.7625, -20.6375]] },
    SU: { d: 'Su yüzeyi (ArıtmaCAD)', l: [[0, 0, 0, 6, 4, 6, -6], [0, 3, 2, 6, 4, 3, -9]] },
    ISOLASYON: { d: 'Isı yalıtımı (ArıtmaCAD)', l: [[60, 0, 0, 0, 5], [120, 0, 0, 0, 5]] },
    DOLGU: { d: 'Sıkıştırılmış dolgu (ArıtmaCAD)', l: [[45, 0, 0, 0, 6], [0, 0, 0, 2, 3, 0, -4], [90, 1, 1.5, 3, 3, 0, -4]] },
  };
  C.HATCH_ORDER = Object.keys(PAT);
  C.lastHatch = { pat: 'ANSI31', sc: 1, ang: 0, ann: true };

  /* ---------- desen çizgileri üretimi ---------- */
  const unitOf = (e, def) => ((def && def.real) || e.ann === false ? (e.sc || 1) / 1000 : (e.sc || 1) * C.doc.set.anno / 1000) * ((def && def.f) || 1);
  /* aileleri dünya koordinatına çevir: {ang, o:[x,y], off:[dx,dy] (dünya), dash:[...]} */
  const families = (e, k) => {
    if (e.def && e.def.length) { const g = e.ann !== false && e.defAnno ? C.doc.set.anno / e.defAnno : 1; return e.def.map(f => ({ a: f.a * RAD, o: f.o, off: [f.off[0] * g, f.off[1] * g], dash: f.dash.map(v => v * g) })); }
    const def = PAT[e.pat] || PAT.ANSI31; if (!def.l) return [];
    const A = (e.ang || 0) * RAD, ca = Math.cos(A), sa = Math.sin(A), or = e.orig || [0, 0];
    return def.l.map(r => {
      const a = r[0] * RAD + A, cu = Math.cos(a), su = Math.sin(a);
      const o = [or[0] + (r[1] * ca - r[2] * sa) * k, or[1] + (r[1] * sa + r[2] * ca) * k];
      const off = [(r[3] * cu - r[4] * su) * k, (r[3] * su + r[4] * cu) * k];
      return { a, o, off, dash: r.slice(5).map(v => v * k) };
    });
  };
  const loopSegs = loops => { const s = []; for (const lp of loops) for (let i = 0; i < lp.length; i++) s.push([lp[i], lp[(i + 1) % lp.length]]); return s; };
  const bboxOf = loops => { const b = [Infinity, Infinity, -Infinity, -Infinity]; for (const lp of loops) for (const p of lp) { b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]); b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]); } return b; };
  const MAXSEG = 60000;
  /* bir desenin çizgi parçaları: [[x0,y0,x1,y1], ...] ; null = çok yoğun */
  C.hatchLines = (loops, fams, dotLen) => {
    const segs = loopSegs(loops), bb = bboxOf(loops), out = [];
    for (const f of fams) {
      const u = [Math.cos(f.a), Math.sin(f.a)], v = [-u[1], u[0]];
      const sp = f.off[0] * v[0] + f.off[1] * v[1]; // dikey aralık
      const sh = f.off[0] * u[0] + f.off[1] * u[1]; // satır başına kayma
      if (Math.abs(sp) < 1e-12) continue;
      const cs = [[bb[0], bb[1]], [bb[2], bb[1]], [bb[2], bb[3]], [bb[0], bb[3]]].map(p => ((p[0] - f.o[0]) * v[0] + (p[1] - f.o[1]) * v[1]) / sp);
      const i0 = Math.floor(Math.min(...cs)) - 1, i1 = Math.ceil(Math.max(...cs)) + 1;
      if (i1 - i0 > 20000) return null;
      const plen = f.dash.reduce((s, d) => s + Math.abs(d), 0);
      for (let i = i0; i <= i1; i++) {
        const O = [f.o[0] + f.off[0] * i, f.o[1] + f.off[1] * i]; // çizginin başlangıcı (desen fazı burada)
        const ts = [];
        for (const [a, b] of segs) {
          const da = (a[0] - O[0]) * v[0] + (a[1] - O[1]) * v[1], db = (b[0] - O[0]) * v[0] + (b[1] - O[1]) * v[1];
          if ((da > 0) === (db > 0)) continue; // yarı açık kural: köşeler bir kez sayılır
          const t = da / (da - db), px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t;
          ts.push((px - O[0]) * u[0] + (py - O[1]) * u[1]);
        }
        if (ts.length < 2) continue; ts.sort((x, y) => x - y);
        for (let j = 0; j + 1 < ts.length; j += 2) {
          const s0 = ts[j], s1 = ts[j + 1]; if (s1 - s0 < 1e-12) continue;
          const pt = s => [O[0] + u[0] * s, O[1] + u[1] * s];
          if (!f.dash.length || plen < 1e-12) { const a = pt(s0), b = pt(s1); out.push([a[0], a[1], b[0], b[1]]); }
          else {
            let n = Math.floor(s0 / plen), s = n * plen;
            if ((s1 - s0) / plen * f.dash.length > 4000) return null;
            for (; s < s1;) {
              for (const d of f.dash) {
                const e0 = s, e1 = s + Math.abs(d); s = e1;
                if (e1 < s0) continue; if (e0 > s1) break;
                if (d > 0) { const a = pt(Math.max(e0, s0)), b = pt(Math.min(e1, s1)); out.push([a[0], a[1], b[0], b[1]]); }
                else if (d === 0 && e0 >= s0 && e0 <= s1) { const a = pt(e0), b = pt(Math.min(e0 + dotLen, s1)); out.push([a[0], a[1], b[0], b[1]]); }
              }
            }
          }
          if (out.length > MAXSEG) return null;
        }
      }
    }
    return out;
  };
  /* iç içe halkaları dış/delik olarak grupla (çift-tek kuralı) */
  const nestLoops = loops => {
    const inside = (p, poly) => C.pointInPoly(p, poly);
    const info = loops.map((lp, i) => ({ lp, i, area: Math.abs(M.polyArea(lp)), depth: 0, parent: -1 }));
    for (const a of info) { let best = null; for (const b of info) { if (a === b || b.area <= a.area) continue; if (inside(a.lp[0], b.lp) || inside(M.lerp(a.lp[0], a.lp[1], 0.5), b.lp)) { a.depth++; if (!best || b.area < best.area) best = b; } } a.parent = best ? best.i : -1; }
    const groups = [];
    for (const a of info) if (a.depth % 2 === 0) groups.push({ outer: a.lp, holes: info.filter(h => h.parent === a.i && h.depth % 2 === 1).map(h => h.lp) });
    return groups;
  };
  C.hatchDxfDef = e => {
    const def = PAT[e.pat], solid = !!(def && def.solid && !e.def), k = unitOf(e, def);
    if (solid) return { solid, k, lines: [] };
    return { solid, k, custom: !def || !!e.def || /ArıtmaCAD/.test(def.d), lines: families(e, k).map(f => ({ a: f.a / RAD, o: f.o, off: f.off, dash: f.dash })) };
  };
  C.hatchAt = w => { // noktayı içeren (çift-tek kuralı) en küçük tarama
    let best = null, ba = Infinity;
    for (const e of C.doc.ents) {
      if (e.type !== 'hatch') continue; const lay = C.layer(e.layer); if (!lay || !lay.on || lay.lock) continue;
      const b = C.bbox(e); if (w[0] < b[0] || w[0] > b[2] || w[1] < b[1] || w[1] > b[3]) continue;
      let ins = false; for (const lp of e.loops) if (C.pointInPoly(w, lp)) ins = !ins; if (!ins) continue;
      const a = (b[2] - b[0]) * (b[3] - b[1]); if (a < ba) { ba = a; best = e; }
    }
    return best;
  };
  C.hatchArea = e => nestLoops(e.loops).reduce((s, g) => s + Math.abs(M.polyArea(g.outer)) - g.holes.reduce((t, h) => t + Math.abs(M.polyArea(h)), 0), 0);

  T.hatch = {
    label: 'Tarama',
    prims: e => {
      const def = PAT[e.pat], k = unitOf(e, def), key = (def && def.solid ? 'S' : k.toPrecision(6)) + '|' + (e.def ? 'd' + C.doc.set.anno : '');
      const c = e._c || (e._c = {}); const hm = c.hm || (c.hm = {}); if (hm[key]) return hm[key];
      let out;
      if (def && def.solid && !e.def) {
        out = [];
        for (const g of nestLoops(e.loops)) { try { const r = C.earClipHoles(g.outer, g.holes); out.push(S(r.pts, { tris: r.tris })); } catch (err) { out.push(P(g.outer, true)); } }
      } else {
        const ls = C.hatchLines(e.loops, families(e, k), 0.15 * C.doc.set.anno / 1000);
        if (!ls) { out = e.loops.map(lp => P(lp, true, { lt: 'DASHED' })); e._dense = true; }
        else { e._dense = false; out = ls.map(q => L([q[0], q[1]], [q[2], q[3]])); if (!out.length) out = e.loops.map(lp => P(lp, true, { lt: 'DOT' })); }
      }
      const ks = Object.keys(hm); if (ks.length > 5) delete hm[ks[0]]; hm[key] = out; return out;
    },
    xf: (e, X) => {
      e.loops = e.loops.map(lp => lp.map(p => X.p(p).slice(0, 2))); if (e.orig) e.orig = X.p(e.orig).slice(0, 2);
      const v = X.v([Math.cos((e.ang || 0) * RAD), Math.sin((e.ang || 0) * RAD), 0]); e.ang = Math.atan2(v[1], v[0]) / RAD;
      if (e.ann === false || (PAT[e.pat] && PAT[e.pat].real)) e.sc = (e.sc || 1) * X.s;
      if (e.def) e.def = e.def.map(f => { const o = X.p(f.o), d = X.v([f.off[0], f.off[1], 0]), a = X.v([Math.cos(f.a * RAD), Math.sin(f.a * RAD), 0]); return { a: Math.atan2(a[1], a[0]) / RAD, o: [o[0], o[1]], off: [d[0], d[1]], dash: f.dash.map(x => x * X.s) }; });
    },
    snaps: () => [],
    info: e => `desen=${e.pat} ölçek=${M.fmt(e.sc || 1, 3)} açı=${M.fmt(e.ang || 0, 1)}° ${e.ann === false ? '' : '(açıklama) '}alan=${M.fmt(C.hatchArea(e), 3)} m²${e._dense ? ' — bu ölçekte çok yoğun, yalnız sınır gösteriliyor' : ''}`,
  };
  { const bb0 = C.bbox; C.bbox = e => { if (e.type !== 'hatch') return bb0(e); const c = e._c || (e._c = {}); return c.b || (c.b = bboxOf(e.loops)); }; }
  { const sp0 = C.snapPts; C.snapPts = e => e.type === 'hatch' ? [] : sp0(e); }

  /* ---------- sınır algılama (alan içine tıklama) ---------- */
  const tess = pr => {
    if (pr.k === 'L') return [[pr.a, pr.b]];
    if (pr.k === 'P' || pr.k === 'S') { const o = [], n = pr.pts.length; for (let i = 1; i < n + (pr.c || pr.k === 'S' ? 1 : 0); i++) o.push([pr.pts[i - 1], pr.pts[i % n]]); return o; }
    if (pr.k === 'C' || pr.k === 'A') {
      const a0 = pr.k === 'C' ? 0 : pr.a0, sw = pr.k === 'C' ? Math.PI * 2 : (M.normAng(pr.a1 - pr.a0) || Math.PI * 2), n = Math.max(8, Math.ceil(sw / (Math.PI * 2) * 72)), o = [];
      let prev = M.polar(pr.c, a0, pr.r); for (let i = 1; i <= n; i++) { const p = i === n && pr.k === 'C' ? M.polar(pr.c, 0, pr.r) : M.polar(pr.c, a0 + sw * i / n, pr.r); o.push([prev, p]); prev = p; } return o;
    }
    return [];
  };
  const SKIP = new Set(['hatch', 'text', 'ctext', 'dim', 'kot', 'sheet', 'point', 'arazi']);
  C.boundarySegs = (box) => {
    const segs = [];
    for (const e of C.doc.ents) {
      if (SKIP.has(e.type) || (C.inPlan && !C.inPlan(e))) continue; const lay = C.layer(e.layer); if (!lay || !lay.on) continue;
      const b = C.bbox(e); if (box && (b[2] < box[0] || b[0] > box[2] || b[3] < box[1] || b[1] > box[3])) continue;
      let prs; try { prs = C.prims(e); } catch (err) { continue; }
      for (const pr of prs) for (const s of tess(pr)) if (M.dist2(s[0], s[1]) > 1e-9) segs.push([[s[0][0], s[0][1]], [s[1][0], s[1][1]]]);
    }
    return segs;
  };
  /* düzlemsel graf: kesişimlerde böl, sarkan uçları buda, yüzleri dolaş */
  C.planarFaces = (segs) => {
    const n = segs.length; if (!n) return [];
    let bb = [Infinity, Infinity, -Infinity, -Infinity]; for (const [a, b] of segs) { bb[0] = Math.min(bb[0], a[0], b[0]); bb[1] = Math.min(bb[1], a[1], b[1]); bb[2] = Math.max(bb[2], a[0], b[0]); bb[3] = Math.max(bb[3], a[1], b[1]); }
    const eps = Math.max(bb[2] - bb[0], bb[3] - bb[1], 1e-6) * 1e-9, tol = Math.max(bb[2] - bb[0], bb[3] - bb[1], 1e-6) * 2e-7;
    const ts = segs.map(() => [0, 1]);
    // ızgara ile aday çiftler
    const G = Math.max(1, Math.ceil(Math.sqrt(n) / 2)), cw = (bb[2] - bb[0]) / G || 1, ch = (bb[3] - bb[1]) / G || 1, cells = new Map();
    segs.forEach(([a, b], i) => { const x0 = Math.floor((Math.min(a[0], b[0]) - bb[0]) / cw), x1 = Math.floor((Math.max(a[0], b[0]) - bb[0]) / cw), y0 = Math.floor((Math.min(a[1], b[1]) - bb[1]) / ch), y1 = Math.floor((Math.max(a[1], b[1]) - bb[1]) / ch); for (let x = x0; x <= Math.min(x1, G); x++) for (let y = y0; y <= Math.min(y1, G); y++) { const k = x * 100003 + y; let c = cells.get(k); if (!c) cells.set(k, c = []); c.push(i); } });
    const done = new Set();
    for (const c of cells.values()) for (let x = 0; x < c.length; x++) for (let y = x + 1; y < c.length; y++) {
      const i = c[x], j = c[y], key = i < j ? i * n + j : j * n + i; if (done.has(key)) continue; done.add(key);
      const [p, p2] = segs[i], [q, q2] = segs[j], r = [p2[0] - p[0], p2[1] - p[1]], s = [q2[0] - q[0], q2[1] - q[1]], den = r[0] * s[1] - r[1] * s[0];
      const lr = Math.hypot(r[0], r[1]), ls = Math.hypot(s[0], s[1]);
      if (Math.abs(den) < 1e-9 * lr * ls) { // paralel: aynı doğru üzerinde üst üste binen parçaları birbirinin uçlarından böl
        const off = Math.abs((q[0] - p[0]) * r[1] - (q[1] - p[1]) * r[0]) / lr; if (off > tol) continue;
        const pr = (pt, A, d, l2) => ((pt[0] - A[0]) * d[0] + (pt[1] - A[1]) * d[1]) / l2;
        for (const pt of [q, q2]) { const t = pr(pt, p, r, lr * lr); if (t > 0 && t < 1) ts[i].push(t); }
        for (const pt of [p, p2]) { const t = pr(pt, q, s, ls * ls); if (t > 0 && t < 1) ts[j].push(t); }
        continue;
      }
      const w = [q[0] - p[0], q[1] - p[1]], t = (w[0] * s[1] - w[1] * s[0]) / den, u = (w[0] * r[1] - w[1] * r[0]) / den;
      const et = tol / lr, eu = tol / ls;
      if (t < -et || t > 1 + et || u < -eu || u > 1 + eu) continue;
      ts[i].push(Math.min(1, Math.max(0, t))); ts[j].push(Math.min(1, Math.max(0, u)));
    }
    const nodes = [], nmap = new Map(), q = tol * 2;
    const nodeOf = p => { const kx = Math.round(p[0] / q), ky = Math.round(p[1] / q); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const id = nmap.get((kx + dx) + ',' + (ky + dy)); if (id != null && Math.hypot(nodes[id].p[0] - p[0], nodes[id].p[1] - p[1]) <= q) return id; } const id = nodes.length; nodes.push({ p, out: [] }); nmap.set(kx + ',' + ky, id); return id; };
    const eset = new Set(), edges = [];
    segs.forEach(([a, b], i) => {
      const tt = [...new Set(ts[i].map(t => Math.round(t * 1e9) / 1e9))].sort((x, y) => x - y);
      let prev = nodeOf(a);
      for (let k = 1; k < tt.length; k++) { const p = [a[0] + (b[0] - a[0]) * tt[k], a[1] + (b[1] - a[1]) * tt[k]]; const id = nodeOf(p); if (id !== prev) { const key = prev < id ? prev + '_' + id : id + '_' + prev; if (!eset.has(key)) { eset.add(key); edges.push([prev, id]); } } prev = id; }
    });
    // sarkan kenarları buda
    const deg = new Array(nodes.length).fill(0); for (const [a, b] of edges) { deg[a]++; deg[b]++; }
    let alive = edges.map(() => true), changed = true;
    while (changed) { changed = false; edges.forEach(([a, b], i) => { if (alive[i] && (deg[a] < 2 || deg[b] < 2)) { alive[i] = false; deg[a]--; deg[b]--; changed = true; } }); }
    const he = []; // yarı kenarlar
    edges.forEach(([a, b], i) => { if (!alive[i]) return; const h1 = { a, b, used: false }, h2 = { a: b, b: a, used: false }; h1.tw = h2; h2.tw = h1; he.push(h1, h2); nodes[a].out.push(h1); nodes[b].out.push(h2); });
    for (const nd of nodes) { for (const h of nd.out) h.ang = Math.atan2(nodes[h.b].p[1] - nd.p[1], nodes[h.b].p[0] - nd.p[0]); nd.out.sort((x, y) => x.ang - y.ang); nd.out.forEach((h, i) => h.idx = i); }
    const faces = [];
    for (const h0 of he) {
      if (h0.used) continue; const loop = []; let h = h0, guard = 0;
      while (!h.used && guard++ < 200000) {
        h.used = true; loop.push(nodes[h.a].p);
        const nd = nodes[h.b], tw = h.tw, k = (tw.idx - 1 + nd.out.length) % nd.out.length; h = nd.out[k];
      }
      if (loop.length >= 3) faces.push(loop);
    }
    return faces;
  };
  C.hatchRegionAt = (pt, box) => {
    const faces = C.planarFaces(C.boundarySegs(box));
    let best = null, ba = Infinity;
    for (const f of faces) { const a = M.polyArea(f); if (a <= 0) continue; if (a < ba && C.pointInPoly(pt, f)) { best = f; ba = a; } }
    if (!best) return null;
    const loops = [best];
    for (const f of faces) { const a = M.polyArea(f); if (a >= 0 || -a >= ba) continue; if (f.every(p => C.pointInPoly(p, best) || onEdge(p, best))) if (!f.every(p => onEdge(p, best))) loops.push(f); }
    return loops.map(lp => lp.map(p => [p[0], p[1]]));
  };
  const onEdge = (p, poly) => { for (let i = 0; i < poly.length; i++) if (M.segDist(p, poly[i], poly[(i + 1) % poly.length]) < 1e-7) return true; return false; };
  /* seçilen nesnelerden halkalar */
  C.loopsFromEnts = ents => {
    const loops = [];
    for (const e of ents) {
      if (SKIP.has(e.type)) continue; let prs; try { prs = C.prims(e); } catch (err) { continue; }
      for (const pr of prs) {
        if (pr.k === 'C') loops.push(tess(pr).map(s => [s[0][0], s[0][1]]));
        else if ((pr.k === 'P' && (pr.c || (pr.pts.length > 3 && M.dist2(pr.pts[0], pr.pts[pr.pts.length - 1]) < 1e-9))) || pr.k === 'S') { const pts = pr.pts.map(p => [p[0], p[1]]); if (!pr.c && pr.k === 'P') pts.pop(); if (pts.length >= 3) loops.push(pts); }
      }
    }
    if (!loops.length && ents.length) { // açık parçalar birlikte kapalı bir alan oluşturuyorsa
      const segs = []; for (const e of ents) { try { for (const pr of C.prims(e)) for (const s of tess(pr)) segs.push([[s[0][0], s[0][1]], [s[1][0], s[1][1]]]); } catch (err) { } }
      const f = C.planarFaces(segs).filter(q => M.polyArea(q) < 0); f.forEach(q => loops.push(q.slice().reverse()));
    }
    return loops;
  };

  /* ---------- desen seçme penceresi ---------- */
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const drawPreview = (cv, pat, ang, sc) => {
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#111'; ctx.fillStyle = '#111'; ctx.lineWidth = 1;
    const def = PAT[pat]; if (!def) return; if (def.solid) { ctx.fillStyle = '#555'; ctx.fillRect(4, 4, W - 8, H - 8); return; }
    const k = (def.real ? 0.12 : 1.4 * (def.f || 1)) * Math.min(6, Math.max(0.2, sc || 1)), sq = [[0, 0], [W / k, 0], [W / k, H / k], [0, H / k]];
    const ls = C.hatchLines([sq], families({ pat, ang: ang || 0, orig: [0, 0] }, 1), 0.6 / k) || [];
    ctx.beginPath(); for (const q of ls) { ctx.moveTo(q[0] * k, H - q[1] * k); ctx.lineTo(q[2] * k + (q[0] === q[2] && q[1] === q[3] ? 0.8 : 0), H - q[3] * k); } ctx.stroke();
  };
  C.hatchDialog = (init) => new Promise(res => {
    const st = Object.assign({}, C.lastHatch, init || {});
    const body = C.modal('Tarama (HATCH)', `
      <div style="display:flex;gap:14px;flex-wrap:wrap">
        <div id="hpList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(82px,1fr));gap:6px;flex:1 1 430px;max-height:440px;overflow:auto">
          ${C.HATCH_ORDER.map(n => `<button class="hpItem" data-p="${esc(n)}" title="${esc(PAT[n].d)}" style="display:flex;flex-direction:column;align-items:center;padding:4px;gap:2px"><canvas width="64" height="48" style="border:1px solid #999;background:#fff"></canvas><span style="font-size:10px">${esc(n)}</span></button>`).join('')}
        </div>
        <div style="flex:0 0 210px;display:flex;flex-direction:column;gap:6px">
          <canvas id="hpBig" width="200" height="140" style="border:1px solid #999;background:#fff"></canvas>
          <div id="hpDesc" class="hint"></div>
          <div class="fld"><label>Ölçek</label><span style="display:flex;gap:3px"><button id="hpScDn" title="Yarıya indir" style="padding:2px 8px">−</button><input id="hpSc" type="text" inputmode="decimal" value="${st.sc}" style="width:70px;text-align:center"><button id="hpScUp" title="İki katına çıkar" style="padding:2px 8px">+</button></span></div>
          <div class="bar" id="hpScQ" style="gap:3px;flex-wrap:wrap">${[0.25, 0.5, 1, 2, 5, 10, 25].map(v => `<button data-sc="${v}" style="padding:1px 6px;font-size:11px">${v}</button>`).join('')}</div>
          <div class="fld"><label>Açı (°)</label><span style="display:flex;gap:3px"><input id="hpAng" type="text" inputmode="decimal" value="${st.ang}" style="width:70px;text-align:center">${[0, 45, 90].map(v => `<button data-ang="${v}" style="padding:1px 6px;font-size:11px">${v}°</button>`).join('')}</span></div>
          <div id="hpInfo" class="hint"></div>
          <div class="fld"><label>Paftada ölçeğe göre ayarla (açıklama)</label><input id="hpAnn" type="checkbox" ${st.ann !== false ? 'checked' : ''}></div>
          <p class="hint">Açıklama açıkken desen aralığı kağıt üzerinde sabittir; 1/50 ve 1/100 paftada aynı sıklıkta görünür. Briket, tuğla, parke, balıksırtı ve çatı desenleri gerçek boyutludur.</p>
        </div>
      </div>
      ${init && init.edit ? '' : '<p class="hint">Tamam\'dan sonra: alanların içine tıklayın (adalar otomatik bulunur) ya da N ile kapalı nesneleri seçin; Enter ile bitirin.</p>'}
      <div class="bar" style="justify-content:flex-end"><button id="hpCancel">İptal</button><button id="hpOk" class="pri">Tamam</button></div>`);
    document.querySelector('#modal .box').classList.add('wide');
    const num = (v, d) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : d; };
    const readSc = () => { const v = num(body.querySelector('#hpSc').value, NaN); if (v > 0) st.sc = v; };
    const live = () => { if (init && init.live) try { init.live(Object.assign({}, st, { ann: body.querySelector('#hpAnn').checked })); } catch (err) { } };
    const upd = () => {
      body.querySelectorAll('.hpItem').forEach(b => b.classList.toggle('on', b.dataset.p === st.pat)); drawPreview(body.querySelector('#hpBig'), st.pat, st.ang, st.sc); body.querySelector('#hpDesc').textContent = (PAT[st.pat] || {}).d || '';
      const d = PAT[st.pat], ann = body.querySelector('#hpAnn').checked, f = (d && d.f) || 1, base = d && d.l ? Math.abs(d.l[0][4]) || Math.abs(d.l[0][3]) : 0;
      const k = ((d && d.real) || !ann ? st.sc / 1000 : st.sc * C.doc.set.anno / 1000) * f;
      body.querySelector('#hpInfo').textContent = d && d.solid ? '' : `Ölçek ${st.sc} → desen aralığı modelde ≈ ${M.fmt(base * k, 3)} m${(d && d.real) || !ann ? '' : `, kağıtta ${M.fmt(base * st.sc * f, 2)} mm`}`;
      body.querySelectorAll('[data-sc]').forEach(b => b.classList.toggle('on', +b.dataset.sc === st.sc));
      live();
    };
    body.querySelector('#hpSc').oninput = () => { readSc(); upd(); };
    body.querySelector('#hpScUp').onclick = () => { readSc(); st.sc = +(st.sc * 2).toPrecision(6); body.querySelector('#hpSc').value = st.sc; upd(); };
    body.querySelector('#hpScDn').onclick = () => { readSc(); st.sc = +(st.sc / 2).toPrecision(6); body.querySelector('#hpSc').value = st.sc; upd(); };
    body.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => { st.sc = +b.dataset.sc; body.querySelector('#hpSc').value = st.sc; upd(); });
    body.querySelectorAll('[data-ang]').forEach(b => b.onclick = () => { st.ang = +b.dataset.ang; body.querySelector('#hpAng').value = st.ang; upd(); });
    body.querySelector('#hpAnn').onchange = upd;
    body.querySelectorAll('.hpItem').forEach(b => { drawPreview(b.querySelector('canvas'), b.dataset.p, 0); b.onclick = () => { st.pat = b.dataset.p; upd(); }; b.ondblclick = () => ok(); });
    body.querySelector('#hpAng').oninput = e => { st.ang = num(e.target.value, 0); upd(); };
    let done = false; const end = v => { if (done) return; done = true; clearInterval(tm); C.closeModal(); res(v); };
    body.querySelectorAll('#hpSc,#hpAng').forEach(i => i.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); ok(); } });
    const ok = () => { readSc(); st.ang = num(body.querySelector('#hpAng').value, 0); st.ann = body.querySelector('#hpAnn').checked; end(st); };
    body.querySelector('#hpOk').onclick = ok; body.querySelector('#hpCancel').onclick = () => end(null);
    const tm = setInterval(() => { if (document.querySelector('#modal').classList.contains('hidden')) end(null); }, 300);
    upd();
  });

  /* ---------- komutlar ---------- */
  const takeKV = () => { const kv = {}; E.queue = E.queue.filter(t => { const m = /^([A-Za-zÇĞİÖŞÜçğıöşü]+)=(.*)$/.exec(t); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; }); return kv; };
  const applyKV = (st, kv) => {
    const pat = kv.D || kv.DESEN || kv.P; if (pat) { const n = C.up(pat); st.pat = PAT[n] ? n : Object.keys(PAT).find(k => k.startsWith(n)) || st.pat; }
    const sc = kv.O || kv.OLCEK || kv.S; if (sc) st.sc = parseFloat(sc) || st.sc;
    const a = kv.A || kv.ACI; if (a != null) st.ang = parseFloat(a) || 0;
    const an = kv.ANN || kv.ACIKLAMA; if (an) st.ann = !/^(H|0|N|F)/i.test(an);
    return st;
  };
  C.addCommand(['HATCH', 'H', 'BHATCH', 'TARAMA', 'TARA'], 'Tarama: desen penceresi açılır; alan içine tıklayın (adalar dahil) ya da N ile kapalı nesneleri seçin. Betik: TARAMA D=ANSI31 O=1 A=0 noktalar… | TARAMA D=SOLID N seçim', async (I) => {
    if (C.currentView !== 'plan' && C.currentView != null && C.setView) C.setView('plan');
    const kv = takeKV(); let st = applyKV(Object.assign({}, C.lastHatch), kv);
    if (!Object.keys(kv).length && !E.scriptMode && !E.queue.length) { st = await C.hatchDialog(st); if (!st) return; }
    C.lastHatch = { pat: st.pat, sc: st.sc, ang: st.ang, ann: st.ann };
    const loops = [], picks = [];
    E.preview = () => loops.map(lp => P(lp, true));
    try {
      for (; ;) {
        E.noSnap = true; const r = await I.pt(`Alan içine tıklayın (${loops.length ? loops.length + ' halka; ' : ''}Enter = bitir)`, { kw: [['N', 'Nesne seç'], ['G', 'Geri al']] }); E.noSnap = false;
        if (r == null || r === '') break;
        if (r === 'G') { const k = picks.pop(); if (k) loops.splice(loops.length - k, k); continue; }
        if (r === 'N') { const s = await I.sel('Kapalı nesneleri seçin (çoklu çizgi, daire, dikdörtgen…)'); const ls = C.loopsFromEnts(s); if (!ls.length) { C.warn('Seçimde kapalı sınır yok'); continue; } loops.push(...ls); picks.push(ls.length); if (E.scriptMode && !E.queue.length) break; continue; }
        if (typeof r === 'string') continue;
        const box = C.views && C.views.plan && !E.scriptMode ? C.views.plan.viewBox() : null;
        const ls = C.hatchRegionAt(r, box); if (!ls) { C.warn('Bu noktanın çevresinde kapalı bir sınır bulunamadı (çizgiler birleşmiyor olabilir).'); continue; }
        loops.push(...ls); picks.push(ls.length);
        if (ls.length > 1) C.log(`${ls.length - 1} ada bulundu.`);
      }
    } finally { E.preview = null; }
    if (!loops.length) return;
    const e = C.newEnt('hatch', { loops, pat: st.pat, sc: st.sc, ang: st.ang, ann: st.ann !== false, orig: [0, 0] });
    C.add(e); C.prims(e);
    C.log(`Tarama: ${st.pat}, ölçek ${st.sc}, açı ${st.ang}°, alan ${M.fmt(C.hatchArea(e), 3)} m²${e._dense ? ' — DİKKAT: bu ölçekte desen çok yoğun, ölçeği büyütün' : ''}.`);
  });
  C.addCommand(['HATCHEDIT', 'HE', 'TARAMADUZENLE'], 'Taramanın desen, ölçek, açı ve açıklama ayarını değiştirir (taramaya çift tıklama da açar)', async (I) => {
    const s = (await I.sel('Taramaları seçin')).filter(e => e.type === 'hatch'); if (!s.length) { C.warn('Tarama seçilmedi'); return; }
    const kv = takeKV(); let st = applyKV({ pat: s[0].pat, sc: s[0].sc || 1, ang: s[0].ang || 0, ann: s[0].ann !== false }, kv);
    if (!Object.keys(kv).length && !E.scriptMode) {
      const orig = s.map(e => ({ e, pat: e.pat, sc: e.sc, ang: e.ang, ann: e.ann, def: e.def }));
      const put = q => { for (const e of s) { e.pat = q.pat; e.sc = q.sc; e.ang = q.ang; e.ann = q.ann; delete e.def; delete e._c; } C.changed(); };
      st = await C.hatchDialog(Object.assign(st, { edit: true, live: put })); // değişiklikler çizimde anında görünür
      if (!st) { for (const o of orig) { Object.assign(o.e, { pat: o.pat, sc: o.sc, ang: o.ang, ann: o.ann }); if (o.def) o.e.def = o.def; delete o.e._c; } C.changed(); return; }
    }
    for (const e of s) { e.pat = st.pat; e.sc = st.sc; e.ang = st.ang; e.ann = st.ann; delete e.def; delete e._c; }
    C.changed(); delete st.live; delete st.edit; C.lastHatch = { pat: st.pat, sc: st.sc, ang: st.ang, ann: st.ann }; C.log(`${s.length} tarama güncellendi: ${st.pat}, ölçek ${st.sc}, açı ${st.ang}°`);
  });
  C.addCommand(['HATCHBOUNDARY', 'TARAMASINIR', 'SINIRCIZ'], 'Taramanın sınırını çoklu çizgi olarak yeniden oluşturur', async (I) => {
    const s = (await I.sel('Taramaları seçin')).filter(e => e.type === 'hatch'); let n = 0;
    for (const e of s) for (const lp of e.loops) { if (C.addFitted ? C.addFitted(lp, true, null, { layer: e.layer }) : C.add(C.newEnt('pline', { pts: lp.map(p => [p[0], p[1], 0]), closed: true, layer: e.layer }))) n++; }
    C.changed(); C.log(`${n} sınır çizildi.`);
  });

  /* ---------- çift tıklama ile düzenle ---------- */
  if (typeof document !== 'undefined') setTimeout(() => {
    const cv = document.querySelector('#cvPlan'); if (!cv) return;
    cv.addEventListener('dblclick', ev => { if (C.cmd.running || !C.views) return; const r = ev.target.getBoundingClientRect(); const e = C.views.plan.pick(ev.clientX - r.left, ev.clientY - r.top); if (e && e.type === 'hatch') { ev.stopImmediatePropagation(); C.sel = [e]; C.emit('selection'); C.runTool('HATCHEDIT'); } }, true);
  }, 0);
})(window.C);

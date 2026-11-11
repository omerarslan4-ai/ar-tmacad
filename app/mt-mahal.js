/* ArıtmaCAD — MEKANİK TESİSAT · MAHAL (ODA) ALGILAMA
   Nesne: type 'mtmahal' { pts:[[x,y]…] (iç yüz, saat yönü tersi), ad, no, tip (C.MTV.MAHAL sırası), ti (özel iç sıcaklık | null), h (kat yüksekliği m),
          sv (seviye id | null), z0, ek:[{tur:'pencere'|'kapi', w, h, adet, yon}], yuz:[{ a, b, L, k:'dis'|'yok'|<komşu mahal id>, t (duvar kalınlığı m), malz, yon, ac:[{kind,w,h}] }] }
   MAHALBUL  : modeldeki duvar / perde / kolonlardan (ya da seçilen mimari çizgilerden) kapalı hacimleri bulur, her birine mahal koyar,
               her duvar parçasının komşusunu (dış hava / komşu mahal), kalınlığını, yönünü ve üzerindeki pencere / kapıları çıkarır.
   MAHALCIZ  : köşe noktalarıyla elle mahal.   MAHALSIL : mahalleri siler.
   Yöntem: plan 5 cm'lik hücrelere bölünür, duvarlar dolu sayılır; dışarıdan ulaşılamayan boş bölgeler mahaldir. Sınır çokgeni duvar yüzlerine oturtulur. */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, V = C.MTV, { L, P, TX } = C.prim || {};
  const MT = C.MT = C.MT || {};
  const RAD = Math.PI / 180;

  /* ---------- proje ayarları ---------- */
  MT.set = () => {
    const s = C.doc.set; if (!s.mt) s.mt = {};
    const m = s.mt;
    if (!m.il) { m.il = 'Ankara'; }
    const il = V.ILLER.find(x => x[0] === m.il) || V.ILLER[6];
    if (m.bolge == null) m.bolge = il[1]; if (m.td == null) m.td = il[2];
    if (m.kuzey == null) m.kuzey = 90; if (m.bina == null) m.bina = 2; if (m.isletme == null) m.isletme = 2;
    if (!m.ruzgar) m.ruzgar = 'normal'; if (!m.konum) m.konum = 'serbest'; if (!m.nizam) m.nizam = 'ayrik';
    if (m.nh == null) m.nh = 0.8; if (m.kopru == null) m.kopru = 0.05; if (m.hKat == null) m.hKat = 3.0;
    if (m.tToprak == null) m.tToprak = V.toprakT(m.td); if (m.tIsitilmayan == null) m.tIsitilmayan = V.isitilmayanT(m.td);
    if (m.rhIc == null) m.rhIc = 65; if (m.rhDis == null) m.rhDis = 80; if (m.catiTip == null) m.catiTip = 'TV_teras';
    if (!m.yapi) m.yapi = V.yapiVarsayilan(m.bolge);
    if (!m.katlar) m.katlar = {};
    return m;
  };
  MT.mahaller = () => C.doc.ents.filter(e => e.type === 'mtmahal');
  MT.tiOf = e => { if (e.ti != null && e.ti !== '') return +e.ti; const t = V.MAHAL[e.tip || 0] || V.MAHAL[0]; return t[2] ? t[1] : null; };
  MT.isitilir = e => MT.tiOf(e) != null;
  const area = pts => Math.abs(M.polyArea(pts));
  MT.alan = e => area(e.pts);
  const inPoly = (p, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  MT.inPoly = inPoly;
  /* çokgenin içinde, kenarlardan olabildiğince uzak bir nokta (etiket yeri) */
  const icNokta = pts => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    const dEdge = p => { let d = Infinity; for (let i = 0; i < pts.length; i++) d = Math.min(d, M.segDist(p, pts[i], pts[(i + 1) % pts.length])); return d; };
    let best = null, bd = -1; const n = 14;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const p = [x0 + (x1 - x0) * (i + 0.5) / (n + 1), y0 + (y1 - y0) * (j + 0.5) / (n + 1)]; if (!inPoly(p, pts)) continue; const d = dEdge(p); if (d > bd) { bd = d; best = p; } }
    return best || [(x0 + x1) / 2, (y0 + y1) / 2];
  };
  MT.icNokta = icNokta;
  MT.yonOf = (nx, ny) => { const k = (MT.set().kuzey - 90) * RAD, a = Math.atan2(ny, nx) - k; let i = Math.round(a / (Math.PI / 4)); i = ((i % 8) + 8) % 8; return V.YON8[i]; };

  /* ---------- mahal nesnesi ---------- */
  if (T) {
    T.mtmahal = {
      label: 'Mahal (mekanik tesisat)',
      prims: e => {
        const out = [P(e.pts.map(p => [p[0], p[1], +e.z0 || 0]), true, { lw: 13, lt: 'HIDDEN', color: MT.isitilir(e) ? 3 : 8 })];
        const c = e.lp || icNokta(e.pts), h = C.annoH(2.5), z = +e.z0 || 0, ti = MT.tiOf(e), A = area(e.pts);
        const r = e.sonuc, s1 = `${e.no ? e.no + ' ' : ''}${(e.ad || 'MAHAL').toLocaleUpperCase('tr')}`, s2 = `A=${M.fmt(A, 2)} m²  h=${M.fmt(+e.h || 0, 2)} m`;
        const s3 = ti == null ? 'ısıtılmıyor' : `ti=${M.fmt(ti, 0)}°C` + (r && r.Q != null ? `  Q=${Math.round(r.Q)} W` : '');
        out.push(TX([c[0], c[1] + h * 1.7, z], h * 1.15, s1, 0, 'MC', { color: 2 }), TX([c[0], c[1], z], h, s2, 0, 'MC', { color: 7 }), TX([c[0], c[1] - h * 1.6, z], h, s3, 0, 'MC', { color: ti == null ? 8 : 1 }));
        return out;
      },
      snaps: e => e.pts.map(p => ({ p: [p[0], p[1], +e.z0 || 0], k: 'end' })),
      xf: (e, X) => { const f = p => X.p([p[0], p[1], 0]).slice(0, 2); e.pts = e.pts.map(f); if (e.lp) e.lp = f(e.lp); (e.yuz || []).forEach(y => { y.a = f(y.a); y.b = f(y.b); }); },
      info: e => `${e.no || ''} ${e.ad || 'Mahal'} · ${M.fmt(area(e.pts), 2)} m² · h=${M.fmt(+e.h || 0, 2)} m · ${MT.tiOf(e) == null ? 'ısıtılmıyor' : 'ti=' + MT.tiOf(e) + '°C'}${e.sonuc && e.sonuc.Q != null ? ' · Q=' + Math.round(e.sonuc.Q) + ' W' : ''}`,
    };
    if (C.ANNO_TYPES && C.ANNO_TYPES.add) C.ANNO_TYPES.add('mtmahal');
    if (C.PROPFIELDS) C.PROPFIELDS.mtmahal = [['no', 'Mahal no', 's'], ['ad', 'Mahal adı', 's'], ['h', 'Kat yüksekliği (m)'], ['ti', 'İç sıcaklık °C (boş = tipe göre)']];
  }

  /* ====================================================================
     HÜCRE AĞI (raster)
     ==================================================================== */
  const Raster = (bb, g) => {
    const x0 = bb[0], y0 = bb[1], nx = Math.max(4, Math.ceil((bb[2] - bb[0]) / g)), ny = Math.max(4, Math.ceil((bb[3] - bb[1]) / g));
    const R = { g, x0, y0, nx, ny, bar: new Uint8Array(nx * ny), lab: new Int32Array(nx * ny) };
    R.ix = x => Math.floor((x - x0) / g); R.iy = y => Math.floor((y - y0) / g);
    R.at = (x, y) => { const i = R.ix(x), j = R.iy(y); return (i < 0 || j < 0 || i >= nx || j >= ny) ? 1 : R.lab[j * nx + i]; };
    R.fillPoly = pts => {
      let ya = Infinity, yb = -Infinity; for (const p of pts) { ya = Math.min(ya, p[1]); yb = Math.max(yb, p[1]); }
      const j0 = Math.max(0, R.iy(ya)), j1 = Math.min(ny - 1, R.iy(yb));
      for (let j = j0; j <= j1; j++) {
        const yc = y0 + (j + 0.5) * g, xs = [];
        for (let i = 0, k = pts.length - 1; i < pts.length; k = i++) { const a = pts[i], b = pts[k]; if ((a[1] > yc) !== (b[1] > yc)) xs.push(a[0] + (yc - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); }
        xs.sort((a, b) => a - b);
        for (let q = 0; q + 1 < xs.length; q += 2) { const i0 = Math.max(0, Math.round((xs[q] - x0) / g - 0.5 + 1e-9)), i1 = Math.min(nx - 1, Math.round((xs[q + 1] - x0) / g - 0.5 - 1e-9)); for (let i = i0; i <= i1; i++) R.bar[j * nx + i] = 1; }
      }
    };
    R.line = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(l / (g * 0.4))); for (let k = 0; k <= n; k++) { const i = R.ix(a[0] + (b[0] - a[0]) * k / n), j = R.iy(a[1] + (b[1] - a[1]) * k / n); if (i >= 0 && j >= 0 && i < nx && j < ny) R.bar[j * nx + i] = 1; } };
    return R;
  };
  /* bileşen etiketleme: 0 = duvar, 1 = dış, 2… = kapalı bölgeler */
  const etiketle = R => {
    const { nx, ny, bar, lab } = R, st = new Int32Array(nx * ny); lab.fill(0);
    const flood = (s, k) => { let n = 0, top = 0; st[top++] = s; lab[s] = k; while (top) { const c = st[--top]; n++; const i = c % nx, j = (c - i) / nx; if (i > 0 && !bar[c - 1] && !lab[c - 1]) { lab[c - 1] = k; st[top++] = c - 1; } if (i < nx - 1 && !bar[c + 1] && !lab[c + 1]) { lab[c + 1] = k; st[top++] = c + 1; } if (j > 0 && !bar[c - nx] && !lab[c - nx]) { lab[c - nx] = k; st[top++] = c - nx; } if (j < ny - 1 && !bar[c + nx] && !lab[c + nx]) { lab[c + nx] = k; st[top++] = c + nx; } } return n; };
    for (let i = 0; i < nx; i++) { for (const c of [i, (ny - 1) * nx + i]) if (!bar[c] && !lab[c]) flood(c, 1); }
    for (let j = 0; j < ny; j++) { for (const c of [j * nx, j * nx + nx - 1]) if (!bar[c] && !lab[c]) flood(c, 1); }
    const comps = []; let k = 2;
    for (let c = 0; c < nx * ny; c++) if (!bar[c] && !lab[c]) { const n = flood(c, k); comps.push({ k, n, seed: c }); k++; }
    return comps;
  };
  /* duvara uzaklık (hücre) — iki geçişli yaklaşık uzaklık dönüşümü */
  const uzaklik = R => {
    const { nx, ny, bar } = R, d = new Float32Array(nx * ny), BIG = 1e6, s2 = Math.SQRT2;
    for (let c = 0; c < nx * ny; c++) d[c] = bar[c] ? 0 : BIG;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = j * nx + i; if (!d[c]) continue; let v = d[c]; if (i > 0) v = Math.min(v, d[c - 1] + 1); if (j > 0) { v = Math.min(v, d[c - nx] + 1); if (i > 0) v = Math.min(v, d[c - nx - 1] + s2); if (i < nx - 1) v = Math.min(v, d[c - nx + 1] + s2); } d[c] = v; }
    for (let j = ny - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) { const c = j * nx + i; if (!d[c]) continue; let v = d[c]; if (i < nx - 1) v = Math.min(v, d[c + 1] + 1); if (j < ny - 1) { v = Math.min(v, d[c + nx] + 1); if (i < nx - 1) v = Math.min(v, d[c + nx + 1] + s2); if (i > 0) v = Math.min(v, d[c + nx - 1] + s2); } d[c] = v; }
    return d;
  };
  /* etiket (ya da koşul) bölgesinin dış sınır çokgeni: hücre kenarlarını zincirle, en büyük halkayı al */
  const sinir = (R, test) => {
    const { nx, ny, g, x0, y0 } = R, W = nx + 1, nextOf = new Map();
    const add = (ax, ay, bx, by) => { const k = ay * W + ax; let l = nextOf.get(k); if (!l) nextOf.set(k, l = []); l.push(by * W + bx); };
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      if (!test(j * nx + i)) continue;
      if (j === 0 || !test((j - 1) * nx + i)) add(i, j, i + 1, j);
      if (i === nx - 1 || !test(j * nx + i + 1)) add(i + 1, j, i + 1, j + 1);
      if (j === ny - 1 || !test((j + 1) * nx + i)) add(i + 1, j + 1, i, j + 1);
      if (i === 0 || !test(j * nx + i - 1)) add(i, j + 1, i, j);
    }
    let best = null, ba = 0;
    for (const [k0] of nextOf) {
      while ((nextOf.get(k0) || []).length) {
        const loop = []; let k = k0, guard = 0;
        while (guard++ < 4e6) { const l = nextOf.get(k); if (!l || !l.length) break; const n = l.pop(); loop.push(k); k = n; if (k === k0) break; }
        if (loop.length < 4) continue;
        const pts = loop.map(v => [x0 + (v % W) * g, y0 + Math.floor(v / W) * g]), a = M.polyArea(pts);
        if (a > ba) { ba = a; best = pts; }
      }
    }
    return best;
  };
  /* Douglas–Peucker (kapalı) */
  const sadelestir = (pts, tol) => {
    const n = pts.length; if (n < 5) return pts;
    let i0 = 0, i1 = 0, dm = -1; for (let i = 1; i < n; i++) { const d = M.dist2(pts[0], pts[i]); if (d > dm) { dm = d; i1 = i; } }
    const dp = (a, b, out) => { let im = -1, d0 = tol; for (let i = a + 1; i < b; i++) { const d = M.segDist(pts[i % n], pts[a % n], pts[b % n]); if (d > d0) { d0 = d; im = i; } } if (im < 0) return; dp(a, im, out); out.push(pts[im % n]); dp(im, b, out); };
    const out = [pts[i0]]; dp(i0, i1, out); out.push(pts[i1]); dp(i1, n, out);
    return out;
  };

  /* ====================================================================
     ENGELLER: duvar ayak izleri, kolonlar, çizgiler
     ==================================================================== */
  const I = () => C._ins;
  const duvarlar = (zc) => C.doc.ents.filter(e => e.type === 'perde' && !e.temel && e.pts && e.pts.length > 1 && (zc == null || ((+e.z0 || 0) <= zc + 1e-6 && (+e.z0 || 0) + (+e.h || 3) >= zc - 1e-6)));
  const kolonlar = (zc) => C.doc.ents.filter(e => e.type === 'kolon' && (zc == null || ((+e.z0 || 0) <= zc + 1e-6 && (+e.z0 || 0) + (+e.h || 3) >= zc - 1e-6)));
  const kolonPoly = k => { const c = M.p3(k.p); if (k.sek === 'D') { const r = (+k.D || 0.5) / 2; return Array.from({ length: 16 }, (_, i) => [c[0] + r * Math.cos(i * Math.PI / 8), c[1] + r * Math.sin(i * Math.PI / 8)]); } const b = +k.b || 0.4, d = +k.d || 0.4, cs = Math.cos((k.rot || 0) * RAD), sn = Math.sin((k.rot || 0) * RAD); return [[-b / 2, -d / 2], [b / 2, -d / 2], [b / 2, d / 2], [-b / 2, d / 2]].map(([x, y]) => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs]); };
  /* duvar parçaları: { e, sf, quad, lB, rB } */
  const duvarParca = ws => {
    const out = [], ins = I(); if (!ins) return out;
    for (const e of ws) {
      let F, sfs; try { F = ins.faceOffs(e); sfs = ins.segFrames(e); } catch (er) { continue; }
      for (const sf of sfs) {
        if (sf.L < 0.02) continue; // çift tıklamadan kalan sıfır boylu parça
        const ext = Math.max(Math.abs(F.lB), Math.abs(F.rB)), e0 = sf.openS ? 0 : ext, e1 = sf.openE ? 0 : ext;
        const a = [sf.a[0] - sf.u[0] * e0, sf.a[1] - sf.u[1] * e0], b = [sf.b[0] + sf.u[0] * e1, sf.b[1] + sf.u[1] * e1], o = (p, f) => [p[0] + sf.nn[0] * f, p[1] + sf.nn[1] * f];
        out.push({ e, sf, lB: F.lB, rB: F.rB, t: Math.abs(F.lB - F.rB), quad: [o(a, F.lB), o(b, F.lB), o(b, F.rB), o(a, F.rB)], ext0: e0, ext1: e1 });
      }
    }
    return out;
  };
  const cizgiSeg = ents => { const out = []; for (const e of ents) { let pr; try { pr = C.prims(e); } catch (er) { continue; } for (const p of pr || []) { if (p.k === 'L') out.push([[p.a[0], p.a[1]], [p.b[0], p.b[1]]]); else if (p.k === 'P') { for (let i = 1; i < p.pts.length; i++) out.push([[p.pts[i - 1][0], p.pts[i - 1][1]], [p.pts[i][0], p.pts[i][1]]]); if (p.c && p.pts.length > 2) out.push([[p.pts[p.pts.length - 1][0], p.pts[p.pts.length - 1][1]], [p.pts[0][0], p.pts[0][1]]]); } } } return out.filter(s => M.dist2(s[0], s[1]) > 1e-4); };
  /* kapı boşlukları: serbest kalan çizgi uçlarını, aynı doğrultudaki en yakın serbest uçla birleştir */
  const boslukKapat = (segs, gap) => {
    const ends = []; segs.forEach((s, si) => { ends.push({ p: s[0], q: s[1], si }); ends.push({ p: s[1], q: s[0], si }); });
    const tol = 0.03, free = ends.filter(en => !segs.some((s, si) => si !== en.si && M.segDist(en.p, s[0], s[1]) < tol));
    const out = [], used = new Set();
    for (let i = 0; i < free.length; i++) {
      if (used.has(i)) continue; const a = free[i], da = M.norm([a.p[0] - a.q[0], a.p[1] - a.q[1], 0]); let bj = -1, bd = gap;
      for (let j = 0; j < free.length; j++) { if (j === i || used.has(j) || free[j].si === a.si) continue; const b = free[j], v = [b.p[0] - a.p[0], b.p[1] - a.p[1]], l = Math.hypot(v[0], v[1]); if (l < 0.05 || l > bd) continue; if ((v[0] * da[0] + v[1] * da[1]) / l < 0.94) continue; bj = j; bd = l; }
      if (bj >= 0) { used.add(i); used.add(bj); out.push([a.p, free[bj].p]); }
    }
    return out;
  };

  /* ====================================================================
     BİR KAT İÇİN ALGILAMA
     ==================================================================== */
  MT.katAlgila = (opt = {}) => {
    const zc = opt.zc, parca = opt.cizgiler ? [] : duvarParca(duvarlar(zc)), kols = opt.cizgiler ? [] : kolonlar(zc).map(kolonPoly);
    let segs = opt.cizgiler ? cizgiSeg(opt.cizgiler) : [];
    if (segs.length && opt.gap > 0) segs = segs.concat(boslukKapat(segs, opt.gap));
    if (!parca.length && !segs.length) return null;
    const bb = [Infinity, Infinity, -Infinity, -Infinity], ad = p => { bb[0] = Math.min(bb[0], p[0]); bb[1] = Math.min(bb[1], p[1]); bb[2] = Math.max(bb[2], p[0]); bb[3] = Math.max(bb[3], p[1]); };
    parca.forEach(w => w.quad.forEach(ad)); kols.forEach(k => k.forEach(ad)); segs.forEach(s => { ad(s[0]); ad(s[1]); });
    let g = 0.05; while ((bb[2] - bb[0] + 2) * (bb[3] - bb[1] + 2) / (g * g) > 6e6) g *= 2;
    bb[0] -= 1; bb[1] -= 1; bb[2] += 1; bb[3] += 1;
    const R = Raster(bb, g);
    parca.forEach(w => R.fillPoly(w.quad)); kols.forEach(k => R.fillPoly(k)); segs.forEach(s => R.line(s[0], s[1]));
    let comps = etiketle(R);
    /* ince bölgeler (çift çizgili duvarın içi, kolon araları) duvar sayılır */
    const d = uzaklik(R), mx = new Map(); for (let c = 0; c < R.lab.length; c++) { const k = R.lab[c]; if (k > 1 && d[c] > (mx.get(k) || 0)) mx.set(k, d[c]); }
    const minW = (opt.minW || 0.6) / 2 / g, minA = (opt.minA || 1.0) / (g * g), kill = new Set(comps.filter(c => (mx.get(c.k) || 0) < minW || c.n < minA).map(c => c.k));
    if (kill.size) for (let c = 0; c < R.lab.length; c++) if (kill.has(R.lab[c])) { R.lab[c] = 0; R.bar[c] = 1; }
    comps = comps.filter(c => !kill.has(c.k));
    /* yüz doğruları (sınırı oturtmak için) */
    const faces = [];
    for (const w of parca) { const { sf } = w; for (const f of [w.lB, w.rB]) faces.push({ p: [sf.a[0] + sf.nn[0] * f, sf.a[1] + sf.nn[1] * f], u: sf.u, s0: -w.ext0 - 0.3, s1: sf.L + w.ext1 + 0.3 }); if (sf.openS) faces.push({ p: [sf.a[0] + sf.nn[0] * w.rB, sf.a[1] + sf.nn[1] * w.rB], u: sf.nn, s0: -0.05, s1: w.t + 0.05 }); if (sf.openE) faces.push({ p: [sf.b[0] + sf.nn[0] * w.rB, sf.b[1] + sf.nn[1] * w.rB], u: sf.nn, s0: -0.05, s1: w.t + 0.05 }); }
    for (const k of kols) for (let i = 0; i < k.length; i++) { const a = k[i], b = k[(i + 1) % k.length], l = M.dist2(a, b); if (l > 1e-6) faces.push({ p: a, u: [(b[0] - a[0]) / l, (b[1] - a[1]) / l], s0: -0.05, s1: l + 0.05 }); }
    for (const s of segs) { const l = M.dist2(s[0], s[1]); faces.push({ p: s[0], u: [(s[1][0] - s[0][0]) / l, (s[1][1] - s[0][1]) / l], s0: -0.3, s1: l + 0.3 }); }
    const oturt = pts => {
      const n = pts.length, lines = [];
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n], l = M.dist2(a, b), u = [(b[0] - a[0]) / (l || 1), (b[1] - a[1]) / (l || 1)], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; let best = null, bd = 2.2 * g;
        if (l > 0.12) for (const f of faces) { const cr = u[0] * f.u[1] - u[1] * f.u[0]; if (Math.abs(cr) > 0.035) continue; const v = [mid[0] - f.p[0], mid[1] - f.p[1]], dist = Math.abs(v[0] * f.u[1] - v[1] * f.u[0]); if (dist > bd) continue; const s = v[0] * f.u[0] + v[1] * f.u[1]; if (s < f.s0 || s > f.s1) continue; bd = dist; best = f; }
        if (best) { const sg = (u[0] * best.u[0] + u[1] * best.u[1]) < 0 ? -1 : 1; lines.push({ p: best.p, u: [best.u[0] * sg, best.u[1] * sg], ok: true }); } else lines.push({ p: a, u, ok: false });
      }
      const out = [];
      for (let i = 0; i < n; i++) {
        const A = lines[(i - 1 + n) % n], B = lines[i], o = pts[i], den = A.u[0] * B.u[1] - A.u[1] * B.u[0]; let q = null;
        if (Math.abs(den) > 0.02) { const t = ((B.p[0] - A.p[0]) * B.u[1] - (B.p[1] - A.p[1]) * B.u[0]) / den; q = [A.p[0] + A.u[0] * t, A.p[1] + A.u[1] * t]; if (M.dist2(q, o) > 5 * g) q = null; }
        if (!q) { const Lq = B.ok ? B : A, v = [o[0] - Lq.p[0], o[1] - Lq.p[1]], s = v[0] * Lq.u[0] + v[1] * Lq.u[1]; q = (A.ok || B.ok) ? [Lq.p[0] + Lq.u[0] * s, Lq.p[1] + Lq.u[1] * s] : o; }
        out.push(q);
      }
      /* çakışık ve doğrusal noktaları at */
      let r = out.filter((p, i) => M.dist2(p, out[(i + 1) % out.length]) > 0.02);
      r = r.filter((p, i) => { const a = r[(i - 1 + r.length) % r.length], b = r[(i + 1) % r.length]; return M.segDist(p, a, b) > 0.008; });
      return r.length >= 3 ? r : pts;
    };
    const rooms = [];
    for (const c of comps) {
      let pts = sinir(R, q => R.lab[q] === c.k); if (!pts) continue;
      pts = oturt(sadelestir(pts, 1.3 * g)); if (pts.length < 3 || area(pts) < (opt.minA || 1.0)) continue;
      rooms.push({ k: c.k, pts });
    }
    /* bina dış sınırı (brüt alan, çevre) */
    let dis = sinir(R, q => R.lab[q] !== 1); if (dis) dis = oturt(sadelestir(dis, 1.3 * g));
    const brut = dis ? { alan: area(dis), cevre: dis.reduce((s, p, i) => s + M.dist2(p, dis[(i + 1) % dis.length]), 0), pts: dis } : null;
    return { R, parca, rooms, brut, g, faces, kols };
  };

  /* bir mahal çokgeninin yüzeyleri: komşu, kalınlık, duvar malzemesi, yön, pencere / kapı */
  MT.yuzeyler = (K, pts, own, idOf) => {
    const { R, parca, g } = K, n = pts.length, out = [], ccw = M.polyArea(pts) > 0;
    const acik = C.doc.ents.filter(o => o.type === 'acik');
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], Ls = M.dist2(a, b); if (Ls < 0.05) continue;
      const u = [(b[0] - a[0]) / Ls, (b[1] - a[1]) / Ls], nn = ccw ? [u[1], -u[0]] : [-u[1], u[0]];
      const ns = Math.max(3, Math.round(Ls / 0.1)), runs = [];
      for (let k = 0; k < ns; k++) {
        const s = Ls * (k + 0.5) / ns, px = a[0] + u[0] * s, py = a[1] + u[1] * s; let key = 'yok', th = 0;
        for (let dd = g * 0.6; dd <= 1.6; dd += g * 0.5) { const l = R.at(px + nn[0] * dd, py + nn[1] * dd); if (l === 0) continue; if (l === own) { if (dd > 3 * g) break; continue; } key = l === 1 ? 'dis' : l; th = Math.max(0.05, dd - g * 0.5); break; }
        const last = runs[runs.length - 1]; if (last && last.key === key) { last.s1 = s + Ls / ns / 2; last.th += th; last.c++; } else runs.push({ key, s0: s - Ls / ns / 2, s1: s + Ls / ns / 2, th, c: 1 });
      }
      for (let k = runs.length - 1; k > 0; k--) if (runs[k].s1 - runs[k].s0 < 0.15) { runs[k - 1].s1 = runs[k].s1; runs.splice(k, 1); }
      if (runs.length > 1 && runs[0].s1 - runs[0].s0 < 0.15) { runs[1].s0 = runs[0].s0; runs.shift(); }
      for (const r of runs) {
        const pa = [a[0] + u[0] * r.s0, a[1] + u[1] * r.s0], pb = [a[0] + u[0] * r.s1, a[1] + u[1] * r.s1], Lr = r.s1 - r.s0; let t = r.c ? r.th / r.c : 0.2;
        const y = { a: pa, b: pb, L: +Lr.toFixed(3), k: r.key === 'dis' || r.key === 'yok' ? r.key : (idOf ? idOf(r.key) : r.key), yon: MT.yonOf(nn[0], nn[1]), ac: [] };
        /* duvar nesnesi: parçanın ortasından duvarın içine doğru bakılan nokta */
        const mid = [(pa[0] + pb[0]) / 2 + nn[0] * Math.min(t / 2, 0.08), (pa[1] + pb[1]) / 2 + nn[1] * Math.min(t / 2, 0.08)];
        /* aynı hizada üst üste duvarlar olabilir (subasman perdesi + tuğla duvar): boşluğu olan, yoksa en üstteki duvar esas alınır */
        const ptS = [0.25, 0.5, 0.75].map(q => [pa[0] + u[0] * Lr * q + nn[0] * Math.min(t / 2, 0.08), pa[1] + u[1] * Lr * q + nn[1] * Math.min(t / 2, 0.08)]), cands = parca.filter(q => q.sf.L > 0.02 && (inPoly(mid, q.quad) || ptS.some(pp => inPoly(pp, q.quad))));
        const acOf = q => acik.filter(o => { if (o.host !== q.e.id || (o.seg || 0) !== q.sf.i) return false; const c = [q.sf.a[0] + q.sf.u[0] * (+o.s || 0), q.sf.a[1] + q.sf.u[1] * (+o.s || 0)], s = (c[0] - pa[0]) * u[0] + (c[1] - pa[1]) * u[1]; return s >= -0.02 && s <= Lr + 0.02; });
        cands.sort((x, y2) => (acOf(y2).length - acOf(x).length) || (((+y2.e.z0 || 0) + (+y2.e.h || 3)) - ((+x.e.z0 || 0) + (+x.e.h || 3))));
        const w = cands[0];
        if (w) {
          t = w.t; y.malz = w.e.malz || 'beton'; y.wid = w.e.id;
          const gor = new Set(); for (const q of cands) for (const o of acOf(q)) { if (gor.has(o.id)) continue; gor.add(o.id); y.ac.push({ kind: o.kind === 'kapi' ? 'kapi' : 'pencere', w: +o.w || 1, h: +o.hh || 1.2, id: o.id, kTip: o.kTip }); }
        }
        if (!w && K.kols && K.kols.some(kp => inPoly(mid, kp))) y.malz = 'beton'; // kolon yüzü
        if (!w && K.faces) { let bd = Infinity; const mm = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2]; for (const fc of K.faces) { if (Math.abs(u[0] * fc.u[1] - u[1] * fc.u[0]) > 0.035) continue; const v = [fc.p[0] - mm[0], fc.p[1] - mm[1]], dn = v[0] * nn[0] + v[1] * nn[1], sm = -(v[0] * fc.u[0] + v[1] * fc.u[1]); if (dn < 0.04 || dn > 1.2 || sm < fc.s0 || sm > fc.s1) continue; if (dn < bd) bd = dn; } if (bd < Infinity && Math.abs(bd - t) < 0.12) t = bd; }
        y.t = +t.toFixed(3); out.push(y);
      }
    }
    return out;
  };

  /* mahal adı: çokgenin içindeki en büyük yazı ya da zemin kaplaması adı */
  const adBul = (pts, zc) => {
    let best = null, bh = 0;
    for (const e of C.doc.ents) {
      if ((e.type === 'text' || e.type === 'ctext' || e.type === 'mtext') && e.p && e.s && !/^[\d\s.,+\-=m²]*$/.test(e.s) && inPoly(e.p, pts)) { const h = +e.h || 0; if (h > bh) { bh = h; best = String(e.s).split('\n')[0].replace(/\\[A-Za-z][^;]*;/g, '').trim(); } }
      else if (e.type === 'kaplama' && e.kind === 'zemin' && e.ad && e.pts && e.pts.length && inPoly(icNokta(e.pts.map(p => [p[0], p[1]])), pts)) return e.ad;
    }
    return best;
  };

  /* ====================================================================
     KOMUTLAR
     ==================================================================== */
  const ensL = () => { C.ensureLayer('MT_MAHAL', 3, 'CONTINUOUS', 13); return 'MT_MAHAL'; };
  const katListe = () => { const sv = C.seviyeler ? C.seviyeler() : []; return sv.length ? sv : []; };
  /* tüm katlarda (ya da verilen seviyede) mahalleri yeniden çıkarır; ad / tip / sıcaklık / ek satırlar korunur */
  MT.mahalBul = (opt = {}) => {
    const m = MT.set(), sv = katListe(), eski = MT.mahaller(), yeni = [], ozet = [];
    const katlar = [];
    if (opt.cizgiler) katlar.push({ id: opt.sv != null ? opt.sv : null, z: opt.z != null ? opt.z : 0, h: opt.h || m.hKat, ad: opt.katAd || 'Kat' });
    else if (sv.length) { sv.forEach((l, i) => { const nx = sv[i + 1]; if (opt.sv != null && l.id !== opt.sv) return; katlar.push({ id: l.id, z: l.z, h: nx ? +(nx.z - l.z).toFixed(3) : null, ad: l.ad }); }); }
    else katlar.push({ id: null, z: null, h: null, ad: 'Kat' });
    let katNo = 0;
    for (const kt of katlar) {
      /* seviye tanımlı değilse kesit kotu: kat yüksekliğinde (h ≥ 2 m) duvarların en çok bulunduğu taban kotu + 1,2 m — subasman / temel perdeleri dışarıda kalır */
      let zOto = null; if (kt.z == null && !opt.cizgiler) { const mp = new Map(); for (const w of C.doc.ents) { if (w.type !== 'perde' || w.temel || !w.pts || (+w.h || 3) < 2) continue; const z = +(+w.z0 || 0).toFixed(2); let l = 0; for (let i = 1; i < w.pts.length; i++) l += M.dist2(w.pts[i - 1], w.pts[i]); mp.set(z, (mp.get(z) || 0) + l); } let bl = 0; for (const [z, l] of mp) if (l > bl) { bl = l; zOto = z + 1.2; } }
      const zc = kt.z == null ? zOto : kt.z + 1.2, K = MT.katAlgila({ zc: opt.cizgiler ? null : zc, cizgiler: opt.cizgiler, gap: opt.gap == null ? 1.25 : opt.gap });
      if (!K || !K.rooms.length) continue;
      let h = kt.h; if (!h || h < 1.5 || h > 12) { const hs = K.parca.map(w => +w.e.h || 0).filter(x => x > 1.5).sort((a, b) => a - b); h = hs.length ? hs[Math.floor(hs.length / 2)] : m.hKat; }
      const z0 = kt.z == null ? (K.parca.length ? Math.min(...K.parca.map(w => +w.e.z0 || 0)) : 0) : kt.z;
      K.rooms.sort((a, b) => { const ca = icNokta(a.pts), cb = icNokta(b.pts); return Math.abs(ca[1] - cb[1]) > 1.5 ? cb[1] - ca[1] : ca[0] - cb[0]; });
      const ents = K.rooms.map((r, i) => {
        const lp = icNokta(r.pts), old = eski.find(o => (o.sv == null ? null : o.sv) === kt.id && inPoly(o.lp || icNokta(o.pts), r.pts)) ;
        const ad = (old && old.ad) || adBul(r.pts) || `Mahal ${i + 1}`, pre = katlar.length > 1 || sv.length ? (Math.abs(z0) < 0.01 ? 'Z' : z0 < 0 ? 'B' : String(katNo)) : 'Z';
        const e = C.newEnt('mtmahal', { layer: ensL(), dis: 'Mekanik', pts: r.pts.map(p => [+p[0].toFixed(4), +p[1].toFixed(4)]), lp: [+lp[0].toFixed(3), +lp[1].toFixed(3)], ad, no: (old && old.no) || `${pre}${String(i + 1).padStart(2, '0')}`, tip: old && old.tip != null ? old.tip : V.mahalTipBul(ad), ti: old ? old.ti : null, h: +(+h).toFixed(2), sv: kt.id, z0: +(+z0).toFixed(3), ek: old && old.ek ? old.ek : [], yuz: [] }); if (kt.id != null) e.sv2 = kt.id; else delete e.sv2;
        e._k = r.k; return e;
      });
      const idOf = k => { const x = ents.find(q => q._k === k); return x ? x.id : 'yok'; };
      ents.forEach(e => { e.yuz = MT.yuzeyler(K, e.pts, e._k, idOf); });
      ents.forEach(e => { delete e._k; yeni.push(e); });
      m.katlar[kt.id == null ? '_' : kt.id] = { ad: kt.ad, z: z0, h: +(+h).toFixed(2), alan: K.brut ? +K.brut.alan.toFixed(2) : 0, cevre: K.brut ? +K.brut.cevre.toFixed(2) : 0 };
      ozet.push(`${kt.ad}: ${ents.length} mahal`);
      if (Math.abs(z0) >= 0.01 && z0 > 0) katNo++; else if (Math.abs(z0) < 0.01) katNo = 1;
    }
    if (!yeni.length) return { n: 0, ozet };
    C.undoStack.push(C.snapshot());
    const sil = new Set(eski.filter(o => opt.sv == null || o.sv === opt.sv || opt.cizgiler).map(o => o.id));
    C.doc.ents = C.doc.ents.filter(e => !sil.has(e.id));
    const chg = C.changed; C.changed = () => { }; try { yeni.forEach(e => C.add(e)); } finally { C.changed = chg; }
    C.changed(); C.emit && C.emit('layers');
    return { n: yeni.length, ozet };
  };

  if (C.addCommand) {
    C.addCommand(['MAHALBUL', 'ODABUL', 'MTMAHAL', 'ROOMDETECT'], 'Mekanik tesisat mahalleri: duvar / perde / kolonlardan kapalı hacimleri bulur, her birine mahal koyar (alan, kat yüksekliği, komşuluklar, pencere / kapılar). Seçenek Ç: seçilen mimari çizgilerden (DXF planı).', async (I) => {
      const k = await I.kw('Mahal kaynağı', [['M', 'Model: duvar / perde / kolonlardan'], ['C', 'Çizgiler: seçilen mimari plan çizgilerinden']], 'M');
      if (k === 'C') {
        const s = (await I.sel('Duvar çizgilerini seçin (çizgi / çoklu çizgi)')).filter(e => e.type === 'line' || e.type === 'pline' || e.type === 'lwpolyline' || e.type === 'rect');
        if (!s.length) { C.warn('Çizgi seçilmedi.'); return; }
        const h = await I.num('Kat yüksekliği (m)', MT.set().hKat); const sv = C.svAktif ? C.svAktif() : null;
        const r = MT.mahalBul({ cizgiler: s, h: +h || 3, sv: sv ? sv.id : null, z: sv ? sv.z : 0, katAd: sv ? sv.ad : 'Kat' });
        if (!r.n) C.warn('Kapalı hacim bulunamadı: duvar çizgileri kapalı bölge oluşturmuyor olabilir (kapı boşlukları 1,25 m\'ye kadar kendiliğinden kapatılır).'); else C.log(`Mahal bulundu — ${r.ozet.join(' · ')}. Pencere ve dış kapıları Mekanik Tesisat panelinde mahale ekleyin.`);
        return;
      }
      const r = MT.mahalBul({});
      if (!r.n) C.warn('Kapalı hacim bulunamadı: İnşaat › Duvar / Perde ile çevrilmiş oda yok. Mimari DXF planı için MAHALBUL › Çizgiler seçeneğini kullanın.'); else C.log(`Mahal bulundu — ${r.ozet.join(' · ')}.`);
    });
    C.addCommand(['MAHALCIZ', 'ODACIZ'], 'Elle mahal: köşe noktalarını sırayla tıklayın (Enter = bitir). Komşuluklar çevredeki duvarlardan bulunur; duvar yoksa bütün kenarlar dış duvar sayılır.', async (I) => {
      const pts = []; for (; ;) { const p = await I.pt(pts.length ? `Sonraki köşe (${pts.length} nokta, Enter = bitir)` : 'İlk köşe', {}); if (!p || typeof p === 'string') break; pts.push([p[0], p[1]]); }
      if (pts.length < 3) return; if (M.polyArea(pts) < 0) pts.reverse();
      const m = MT.set(), sv = C.svAktif ? C.svAktif() : null, zc = sv ? sv.z + 1.2 : null, K = MT.katAlgila({ zc }), lp = icNokta(pts);
      let yuz; if (K) { const own = K.R.at(lp[0], lp[1]), map = new Map(); MT.mahaller().forEach(o => { const q = o.lp || icNokta(o.pts); map.set(K.R.at(q[0], q[1]), o.id); }); yuz = MT.yuzeyler(K, pts, own > 1 ? own : -1, k => map.get(k) || 'yok'); if (own <= 1) yuz.forEach(y => { y.k = 'dis'; if (!y.t) y.t = 0.25; }); }
      else yuz = pts.map((a, i) => { const b = pts[(i + 1) % pts.length], l = M.dist2(a, b), u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; return { a, b, L: +l.toFixed(3), k: 'dis', t: 0.25, yon: MT.yonOf(u[1], -u[0]), ac: [] }; });
      const ad = await I.str('Mahal adı', adBul(pts) || 'Mahal'); const n = MT.mahaller().length + 1;
      C.undoStack.push(C.snapshot());
      C.add(C.newEnt('mtmahal', Object.assign({ layer: ensL(), dis: 'Mekanik', pts, lp, ad: String(ad || 'Mahal'), no: `Z${String(n).padStart(2, '0')}`, tip: V.mahalTipBul(ad), ti: null, h: m.hKat, sv: sv ? sv.id : null, z0: sv ? sv.z : 0, ek: [], yuz }, sv ? { sv2: sv.id } : {})));
    });
    C.addCommand(['MAHALSIL', 'ODASIL'], 'Mekanik tesisat mahallerinin tümünü siler (duvarlar ve çizimler kalır).', async () => { const l = MT.mahaller(); if (!l.length) return; C.undoStack.push(C.snapshot()); C.remove(l); C.log(`${l.length} mahal silindi.`); });
  }
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : (globalThis.C = globalThis.C || {}));

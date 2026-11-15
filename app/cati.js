/* ArıtmaCAD — İNŞAAT › ÇATI
   cati nesnesi: { kind: 'kirma' | 'besik' | 'tek' | 'mansart', host: döşeme id, pts: döşeme (duvar hattı) çokgeni, zt: döşeme üst kotu,
                   ov: saçak (m), deg: eğim (°), knee: ayak duvarı (m), kneeM: ayak duvarı malzemesi, m1 / deg1: mansart alt bölüm yatay derinliği ve eğimi, yon: tek eğim yönü,
                   alt: kaplama altı (osb / tahta), xps: XPS (cm), su: su yalıtımı, ortu: çatı örtüsü, isk: ahşap iskelet (E/H) ve kesitleri / aralıkları }
   Yüzey: döşeme çokgeni saçak kadar büyütülür, dikdörtgenlere (dik açılı planlar) ya da tek dışbükey çokgene ayrılır; her bölgenin eğimli kenarlarından
   uzaklığa göre yükseklik z = Z0 + f(d) — bölgelerin üst zarfı alınır (L / T / U planlarda dere ve kırma hatları kendiliğinden oluşur).
   Ahşap iskelet (oturtma çatı): tabla 10×10, dikme 10×10, aşık 10×12, mahya aşığı, mertek 5×12 (45 cm ara), kırma / dere mertekleri 8×16, alın tahtası 2.5×20. */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, P, TX } = C.prim, RAD = Math.PI / 180;
  const I_ = () => C._ins;
  const TUR = { kirma: 'Kırma çatı (dört yana eğimli)', besik: 'Beşik çatı (iki yana eğimli, alınlıklı)', tek: 'Tek eğimli çatı (sundurma)', mansart: 'Mansart çatı (kırık eğimli, çatı katı)', teras: 'Teras çatı (düz, parapetli, yalıtımlı)' };
  const ORTU = {
    marsilya: { ad: 'Marsilya kiremit', t: 0.05, col: [0.72, 0.33, 0.21], mahya: true },
    alaturka: { ad: 'Alaturka geniş tip kiremit', t: 0.06, col: [0.74, 0.40, 0.26], mahya: true },
    beton: { ad: 'Beton kiremit', t: 0.05, col: [0.45, 0.42, 0.40], mahya: true },
    shingle: { ad: 'Bitümlü shingle', t: 0.01, col: [0.32, 0.24, 0.22], mahya: true },
    onduline: { ad: 'Onduline (bitümlü oluklu levha)', t: 0.03, col: [0.50, 0.20, 0.16] },
    trapez: { ad: 'Trapez sac', t: 0.03, col: [0.56, 0.58, 0.61] },
    sandvic: { ad: 'Sandviç panel (poliüretan dolgulu)', t: 0.05, col: [0.62, 0.26, 0.21] },
    kenet: { ad: 'Kenet (zip) sistem metal örtü', t: 0.02, col: [0.46, 0.49, 0.52] },
    arduaz: { ad: 'Arduaz (doğal taş) örtü', t: 0.02, col: [0.26, 0.28, 0.31], mahya: true },
  };
  const ALT = { tahta18: { ad: 'Kaplama tahtası 1.8×10', t: 0.018, col: [0.76, 0.60, 0.40] }, osb: { ad: 'OSB levha (18 mm)', t: 0.018, col: [0.80, 0.68, 0.46] }, tahta: { ad: 'Ahşap tahta kaplama (2.5 cm)', t: 0.025, col: [0.74, 0.58, 0.38] }, yok: { ad: 'Kaplama altı yok', t: 0, col: null } };
  const SU = { membran: { ad: 'Nefes alan su yalıtım membranı', t: 0.003, col: [0.35, 0.40, 0.48] }, bitum: { ad: 'Bitümlü su yalıtım örtüsü (2 kat)', t: 0.006, col: [0.18, 0.18, 0.20] }, yok: { ad: 'Su yalıtımı yok', t: 0, col: null } };
  const WOOD = [0.70, 0.52, 0.32], WOOD2 = [0.62, 0.45, 0.27], XPSC = [0.93, 0.70, 0.76], TUGLA = [0.72, 0.43, 0.34];
  /* kesitte çatı parçasının malzemesi (kesit.js): ahşap iskelet (makas, aşık, mertek, dikme) 'KA' → dolu tarama; kaplama katmanları ve örtü 'K' → taramasız. İkisi de kesilen eleman çizgisiyle çizilir */
  C.catiSecMat = (e, rgb) => [WOOD, WOOD2].some(w => Math.abs(w[0] - rgb[0]) < 0.004 && Math.abs(w[1] - rgb[1]) < 0.004 && Math.abs(w[2] - rgb[2]) < 0.004) ? 'KA' : 'K';
  const o_ = O => Object.entries(O).map(([k, v]) => [k, typeof v === 'string' ? v : v.ad]);
  /* ---- düzlem geometri ---- */
  const area = q => M.polyArea(q);
  const ccw = q => (area(q) < 0 ? q.slice().reverse() : q.slice());
  const clipLin = (poly, g) => { // g = [a, b, c]  →  a·x + b·y + c >= 0 kalan
    const out = [], v = p => g[0] * p[0] + g[1] * p[1] + g[2];
    for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], vp = v(p), vq = v(q); if (vp >= 0) out.push(p); if ((vp >= 0) !== (vq >= 0)) { const t = vp / (vp - vq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } }
    return out.length >= 3 && Math.abs(area(out)) > 1e-7 ? out : [];
  };
  const neg = g => [-g[0], -g[1], -g[2]], sub = (g, h, eps) => [g[0] - h[0], g[1] - h[1], g[2] - h[2] - (eps || 0)];
  const ev = (g, p) => g[0] * p[0] + g[1] * p[1] + g[2];
  const offsetPoly = (q, d) => { const n = q.length, out = []; for (let i = 0; i < n; i++) { const a = q[(i - 1 + n) % n], b = q[i], c = q[(i + 1) % n], u1 = M.norm([b[0] - a[0], b[1] - a[1], 0]), u2 = M.norm([c[0] - b[0], c[1] - b[1], 0]), n1 = [u1[1], -u1[0]], n2 = [u2[1], -u2[0]], k = 1 + n1[0] * n2[0] + n1[1] * n2[1]; if (k < 1e-6) { out.push([b[0] + n1[0] * d, b[1] + n1[1] * d]); continue; } out.push([b[0] + (n1[0] + n2[0]) * d / k, b[1] + (n1[1] + n2[1]) * d / k]); } return out; };
  const simplify = q => { let p = q.filter((v, i) => M.dist2(v, q[(i + 1) % q.length]) > 1e-6); let ch = true; while (ch && p.length > 3) { ch = false; for (let i = 0; i < p.length; i++) { const a = p[(i - 1 + p.length) % p.length], b = p[i], c = p[(i + 1) % p.length]; if (Math.abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) < 1e-8) { p.splice(i, 1); ch = true; break; } } } return p; };
  const isConvex = q => { let s = 0; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length], c = q[(i + 2) % q.length], cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (Math.abs(cr) < 1e-9) continue; if (!s) s = Math.sign(cr); else if (Math.sign(cr) !== s) return false; } return true; };
  const hull = pts => { const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
  /* dik açılı çokgen → örtüşen en büyük dikdörtgenler (yerel eksende) */
  const rectCover = (q, ang) => {
    const cs = Math.cos(ang), sn = Math.sin(ang), toL = p => [p[0] * cs + p[1] * sn, -p[0] * sn + p[1] * cs], toW = p => [p[0] * cs - p[1] * sn, p[0] * sn + p[1] * cs];
    const lq = q.map(toL); if (!lq.every((p, i) => { const r = lq[(i + 1) % lq.length]; return Math.abs(p[0] - r[0]) < 1e-6 || Math.abs(p[1] - r[1]) < 1e-6; })) return null;
    const X = [...new Set(lq.map(p => +p[0].toFixed(6)))].sort((a, b) => a - b), Y = [...new Set(lq.map(p => +p[1].toFixed(6)))].sort((a, b) => a - b);
    const nx = X.length - 1, ny = Y.length - 1, inC = []; for (let i = 0; i < nx; i++) { inC.push([]); for (let j = 0; j < ny; j++) inC[i].push(C.pointInPoly([(X[i] + X[i + 1]) / 2, (Y[j] + Y[j + 1]) / 2], lq)); }
    const full = (i0, i1, j0, j1) => { for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) if (!inC[i][j]) return false; return true; };
    const rs = new Map();
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { if (!inC[i][j]) continue; for (const order of [0, 1]) { let i0 = i, i1 = i, j0 = j, j1 = j; const gx = () => { while (i0 > 0 && full(i0 - 1, i0 - 1, j0, j1)) i0--; while (i1 < nx - 1 && full(i1 + 1, i1 + 1, j0, j1)) i1++; }, gy = () => { while (j0 > 0 && full(i0, i1, j0 - 1, j0 - 1)) j0--; while (j1 < ny - 1 && full(i0, i1, j1 + 1, j1 + 1)) j1++; }; if (order) { gx(); gy(); } else { gy(); gx(); } rs.set([i0, i1, j0, j1].join(), [i0, i1, j0, j1]); } }
    let list = [...rs.values()]; list = list.filter(a => !list.some(b => b !== a && b[0] <= a[0] && b[1] >= a[1] && b[2] <= a[2] && b[3] >= a[3] && (b[0] < a[0] || b[1] > a[1] || b[2] < a[2] || b[3] > a[3])));
    return list.map(([i0, i1, j0, j1]) => [[X[i0], Y[j0]], [X[i1 + 1], Y[j0]], [X[i1 + 1], Y[j1 + 1]], [X[i0], Y[j1 + 1]]].map(toW));
  };
  /* ---- çatı yüzeyi ---- */
  const geomOf = e => {
    const key = JSON.stringify([e.kind, e.pts, e.zt, e.ov, e.deg, e.knee, e.m1, e.deg1, e.yon, e.mh, e.sacak]); if (e._g && e._gk === key) return e._g;
    const wall = ccw(simplify(e.pts.map(p => [p[0], p[1]]))), ov = +e.ov || 0, tn = Math.tan((+e.deg || 30) * RAD), t1 = Math.tan((+e.deg1 || 70) * RAD), m1 = +e.m1 || 1.0, mans = e.kind === 'mansart';
    const mh = +e.mh || 0.12, Z0 = (+e.zt || 0) + (+e.knee || 0) + 0.10 + mh; // duvar hattında çatı taşıyıcı üstü (tabla + mertek)
    const f = dd => { const d = dd - ov; return mans ? (d <= m1 ? d * t1 : m1 * t1 + (d - m1) * tn) : d * tn; };
    const foot = ccw(simplify(offsetPoly(wall, ov)));
    let warn = null, regs = null; const a0 = Math.atan2(wall[1][1] - wall[0][1], wall[1][0] - wall[0][0]);
    if (isConvex(foot)) regs = [foot]; else { regs = rectCover(foot, a0); if (!regs) { regs = [ccw(hull(foot))]; warn = 'Plan dik açılı ya da dışbükey değil: çatı dış zarf (dışbükey örtü) üzerine kuruldu.'; } }
    const yonV = { on: [0, -1], arka: [0, 1], sol: [-1, 0], sag: [1, 0] }[e.yon || 'on'] || [0, -1];
    const R = regs.map(rq => {
      const q = ccw(rq), ed = q.map((a, i) => { const b = q[(i + 1) % q.length], u = M.norm([b[0] - a[0], b[1] - a[1], 0]), n = [-u[1], u[0]]; return { a, b, u: [u[0], u[1]], n, g: [n[0], n[1], -(n[0] * a[0] + n[1] * a[1])], len: M.dist2(a, b) }; });
      if (e.kind === 'besik') { const lmax = Math.max(...ed.map(x => x.len)); const ax = ed.find(x => x.len >= lmax - 1e-6).u; ed.forEach(x => x.s = Math.abs(x.u[0] * ax[0] + x.u[1] * ax[1]) > 0.9); }
      else if (e.kind === 'tek') { let best = null, bv = -2; ed.forEach(x => { const v = -(x.n[0] * yonV[0] + x.n[1] * yonV[1]); if (v > bv) { bv = v; best = x; } }); ed.forEach(x => x.s = x === best); }
      else ed.forEach(x => x.s = true);
      return { q, ed, inside: ed.map(x => x.g) };
    });
    // yükseklik fonksiyonu (üst zarf)
    const zAt = p => { let z = -Infinity; for (const r of R) { if (!r.inside.every(g => ev(g, p) >= -1e-7)) continue; let d = Infinity; for (const x of r.ed) if (x.s) d = Math.min(d, ev(x.g, p)); if (d < Infinity) z = Math.max(z, Z0 + f(d)); } return z; };
    // yüzey parçaları
    const pieces = [];
    R.forEach((r, ri) => r.ed.forEach((x, ki) => {
      if (!x.s) return; let F = r.q; for (const y of r.ed) if (y !== x && y.s && F.length) F = clipLin(F, sub(y.g, x.g)); if (!F.length) return;
      let parts = [F];
      R.forEach((S, si) => { if (si === ri) return; const eps = si < ri ? -1e-7 : 1e-7, cons = S.inside.slice(); for (const y of S.ed) if (y.s) cons.push(sub(y.g, x.g, eps)); const nx = []; for (const pp of parts) { let H = pp; for (const g of cons) { if (!H.length) break; H = clipLin(H, g); } if (!H.length || Math.abs(area(H)) < 1e-6) { nx.push(pp); continue; } let cur = pp; for (const g of cons) { if (!cur.length) break; const o = clipLin(cur, neg(g)); if (o.length) nx.push(o); cur = clipLin(cur, g); } } parts = nx; });
      for (const pp of parts) { if (mans) { const gm = [x.g[0], x.g[1], x.g[2] - (ov + m1)], lo = clipLin(pp, neg(gm)), hi = clipLin(pp, gm); if (lo.length) pieces.push({ q: lo, r: ri, k: ki, x, lower: true }); if (hi.length) pieces.push({ q: hi, r: ri, k: ki, x }); } else pieces.push({ q: pp, r: ri, k: ki, x }); }
    }));
    const zP = (pc, p) => Z0 + f(ev(pc.x.g, p));
    for (const pc of pieces) { pc.z = pc.q.map(p => zP(pc, p)); pc.slope = pc.lower ? t1 : tn; }
    // kenar sınıfları: saçak (dış sınır), mahya (yatay iç), kırma / dere (eğik iç)
    const onFoot = (a, b) => foot.some((c, i) => { const d = foot[(i + 1) % foot.length], u = M.norm([d[0] - c[0], d[1] - c[1], 0]), dist = p => Math.abs((p[0] - c[0]) * u[1] - (p[1] - c[1]) * u[0]); return dist(a) < 1e-4 && dist(b) < 1e-4; });
    const K = p => p.map(v => Math.round(v * 1e4)).join(','), seen = new Map(), lines = { eave: [], ridge: [], hip: [], valley: [], gableEdge: [] };
    for (const pc of pieces) for (let i = 0; i < pc.q.length; i++) {
      const a = pc.q[i], b = pc.q[(i + 1) % pc.q.length]; if (M.dist2(a, b) < 1e-4) continue; const k = [K(a), K(b)].sort().join('|');
      if (seen.has(k)) { const o = seen.get(k), g1 = o.pc.x.g, g2 = pc.x.g; if ((o.r === pc.r && o.k === pc.k) || (Math.abs(g1[0] - g2[0]) < 1e-6 && Math.abs(g1[1] - g2[1]) < 1e-6 && Math.abs(g1[2] - g2[2]) < 1e-5 && !!o.pc.lower === !!pc.lower)) o.same = true; o.n++; continue; } seen.set(k, { a, b, za: pc.z[i], zb: pc.z[(i + 1) % pc.q.length], r: pc.r, k: pc.k, n: 1, pc });
    }
    for (const s of seen.values()) {
      if (s.same) continue; const A = [s.a[0], s.a[1], s.za], B = [s.b[0], s.b[1], s.zb];
      if (onFoot(s.a, s.b)) { if (Math.abs(s.za - s.zb) < 1e-4) lines.eave.push([A, B]); else lines.gableEdge.push([A, B]); continue; }
      if (Math.abs(s.za - s.zb) < 1e-4) { if (s.za > Z0 + 0.02) lines.ridge.push([A, B]); continue; }
      if (s.n < 2) continue; const m = [(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2], u = M.norm([s.b[0] - s.a[0], s.b[1] - s.a[1], 0]), pn = [-u[1] * 0.15, u[0] * 0.15], zm = zAt(m), zs = (zAt([m[0] + pn[0], m[1] + pn[1]]) + zAt([m[0] - pn[0], m[1] - pn[1]])) / 2;
      (zm > zs + 1e-5 ? lines.hip : lines.valley).push([A, B]);
    }
    const sac = +e.sacak || 0, inner = sac > 0.01 ? ccw(simplify(offsetPoly(wall, -sac))) : wall;
    const g = { wall, inner, sac, foot, R, pieces, zAt, Z0, f, tn, lines, warn };
    e._g = g; e._gk = key; return g;
  };
  /* ---- 3B yardımcılar ---- */
  const hexa = (...a) => I_().hexa(...a);
  const boxEdges = (out, c8) => { for (let i = 0; i < 4; i++) out.edges3.push([c8[i], c8[(i + 1) % 4]], [c8[4 + i], c8[4 + (i + 1) % 4]], [c8[i], c8[i + 4]]); };
  const beam = (out, A, B, b, h, col) => { // üst orta çizgi A→B, genişlik b (yatay), derinlik h (düşey aşağı)
    const d = [B[0] - A[0], B[1] - A[1]], l = Math.hypot(d[0], d[1]); const w = l > 1e-9 ? [-d[1] / l * b / 2, d[0] / l * b / 2] : [b / 2, 0];
    const top = [[A[0] - w[0], A[1] - w[1], A[2]], [B[0] - w[0], B[1] - w[1], B[2]], [B[0] + w[0], B[1] + w[1], B[2]], [A[0] + w[0], A[1] + w[1], A[2]]], c8 = top.map(p => [p[0], p[1], p[2] - h]).concat(top);
    hexa(out, c8, col); if (out.edgesW) boxEdges(out, c8); if (out.mem) out.mem.push({ t: out._typ, A, B, b, h });
  };
  const post = (out, p, z1, z2, b, col) => { const h = b / 2, c8 = [[p[0] - h, p[1] - h, z1], [p[0] + h, p[1] - h, z1], [p[0] + h, p[1] + h, z1], [p[0] - h, p[1] + h, z1], [p[0] - h, p[1] - h, z2], [p[0] + h, p[1] - h, z2], [p[0] + h, p[1] + h, z2], [p[0] - h, p[1] + h, z2]]; hexa(out, c8, col); if (out.edgesW) boxEdges(out, c8); if (out.mem) out.mem.push({ t: out._typ, P: p, z1, z2, b }); };
  const slab = (out, q, zs, o1, o2, col) => { // eğik levha: köşe kotları zs, alt / üst ofset
    const n = q.length, v0 = out.v.length; for (let i = 0; i < n; i++) out.v.push([q[i][0], q[i][1], zs[i] + o1]); for (let i = 0; i < n; i++) out.v.push([q[i][0], q[i][1], zs[i] + o2]);
    for (let i = 1; i + 1 < n; i++) { out.f.push([v0 + n, v0 + n + i, v0 + n + i + 1], [v0, v0 + i + 1, v0 + i]); out.fc.push(col, col); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; out.f.push([v0 + i, v0 + j, v0 + n + j], [v0 + i, v0 + n + j, v0 + n + i]); out.fc.push(col, col); }
  };
  const clipSeg = (poly, A, B) => { let t0 = 0, t1 = 1; const d = [B[0] - A[0], B[1] - A[1]]; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], n = [-(b[1] - a[1]), b[0] - a[0]], num = n[0] * (A[0] - a[0]) + n[1] * (A[1] - a[1]), den = n[0] * d[0] + n[1] * d[1]; if (Math.abs(den) < 1e-12) { if (num < 0) return null; continue; } const t = -num / den; if (den > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t); if (t0 > t1) return null; } return [[A[0] + d[0] * t0, A[1] + d[1] * t0], [A[0] + d[0] * t1, A[1] + d[1] * t1]]; };
  const segsInPoly = (poly, A, B) => { // dışbükey olmayan çokgende de: kesişim parametreleri
    const d = [B[0] - A[0], B[1] - A[1]], ts = [0, 1]; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], e = [q[0] - p[0], q[1] - p[1]], den = d[0] * e[1] - d[1] * e[0]; if (Math.abs(den) < 1e-12) continue; const w = [p[0] - A[0], p[1] - A[1]], t = (w[0] * e[1] - w[1] * e[0]) / den, u = (w[0] * d[1] - w[1] * d[0]) / den; if (u >= 0 && u <= 1 && t > 0 && t < 1) ts.push(t); }
    ts.sort((a, b) => a - b); const out = []; for (let k = 0; k + 1 < ts.length; k++) { const tm = (ts[k] + ts[k + 1]) / 2; if (ts[k + 1] - ts[k] > 1e-6 && C.pointInPoly([A[0] + d[0] * tm, A[1] + d[1] * tm], poly)) out.push([[A[0] + d[0] * ts[k], A[1] + d[1] * ts[k]], [A[0] + d[0] * ts[k + 1], A[1] + d[1] * ts[k + 1]]]); } return out;
  };
  /* ---- iskelet + kaplama: 3B ağ ve metraj ---- */
  const buildAll = e => {
    const G = geomOf(e), out = I_().newMesh(), Q = { wood: {}, area: 0, plan: 0, eave: 0, ridge: 0, hip: 0, valley: 0, gable: 0, cy: 0, boru: 0 }; out.mem = []; out.edgesW = true;
    const addW = (k, Lm, b, h) => { const o = Q.wood[k] || (Q.wood[k] = { L: 0, V: 0, n: 0, b, h }); o.L += Lm; o.V += Lm * b * h; o.n++; };
    const yal = e.yal || 'mertek', cyT = (yal === 'doseme' || yal === 'ikisi') ? (+e.cy || 8) / 100 : 0;
    const zt = +e.zt || 0, knee = +e.knee || 0, mb = +e.mb || 0.05, mh = +e.mh || 0.12, msp = +e.msp || 0.45, ab = +e.ab || 0.10, ah = +e.ah || 0.12, asp = +e.asp || 2.0, db = +e.db || 0.10, dsp = +e.dsp || 2.5, hb = 0.08, hh = 0.16, tab = 0.10, ov = +e.ov || 0;
    for (const pc of G.pieces) { const A = Math.abs(area(pc.q)); Q.plan += A; Q.area += A * Math.sqrt(1 + pc.slope * pc.slope); }
    const isk = e.isk !== 'H';
    // kaplama katmanları (taşıyıcı üstünden yukarı)
    if (cyT > 0) { out._typ = null; const save = out.edgesW; out.edgesW = false; I_().hexa && C._kap && C._kap.prismTri(out, G.inner, zt, zt + cyT, [0.96, 0.86, 0.42]); out.edgesW = save; Q.cy = Math.abs(area(G.inner)); }
    const lay = [[(ALT[e.alt] || ALT.osb).t, (ALT[e.alt] || ALT.osb).col], [+e.xps > 0 && yal !== 'doseme' ? +e.xps / 100 : 0, XPSC], [(SU[e.su] || SU.membran).t, (SU[e.su] || SU.membran).col], [(ORTU[e.ortu] || ORTU.marsilya).t, (ORTU[e.ortu] || ORTU.marsilya).col]];
    for (const pc of G.pieces) { let o = 0; for (const [t, col] of lay) { if (!(t > 0) || !col) continue; slab(out, pc.q, pc.z, o, o + t, col); o += t; } }
    const topOff = lay.reduce((s2, [t, c]) => s2 + (t > 0 && c ? t : 0), 0);
    for (const pc of G.pieces) for (let i = 0; i < pc.q.length; i++) out.edges3.push([[pc.q[i][0], pc.q[i][1], pc.z[i] + topOff], [pc.q[(i + 1) % pc.q.length][0], pc.q[(i + 1) % pc.q.length][1], pc.z[(i + 1) % pc.q.length] + topOff]]);
    // alınlık (beşik / tek eğim): eğimsiz dış kenarların duvar hattında üçgen / yamuk tuğla duvar
    const wq = G.wall;
    for (let i = 0; i < wq.length; i++) {
      const a = wq[i], b = wq[(i + 1) % wq.length], Lw = M.dist2(a, b); if (Lw < 0.05) continue; const u = [(b[0] - a[0]) / Lw, (b[1] - a[1]) / Lw], nIn = [-u[1], u[0]];
      const mid = [(a[0] + b[0]) / 2 + nIn[0] * 0.01, (a[1] + b[1]) / 2 + nIn[1] * 0.01]; if (G.zAt(mid) < G.Z0 + 0.05) continue; // saçak tarafı
      const ts = [0, Lw]; for (const pc of G.pieces) for (let k = 0; k < pc.q.length; k++) { const p = pc.q[k], t = (p[0] - a[0]) * u[0] + (p[1] - a[1]) * u[1], d = Math.abs((p[0] - a[0]) * nIn[0] + (p[1] - a[1]) * nIn[1]); if (t > 0 && t < Lw && d < 2 * ov + 50) ts.push(t); }
      const tt = [...new Set(ts.map(t => +t.toFixed(5)))].sort((x, y) => x - y), zb0 = zt + knee, th = 0.2;
      for (let k = 0; k + 1 < tt.length; k++) { const p1 = [a[0] + u[0] * tt[k] + nIn[0] * 0.001, a[1] + u[1] * tt[k] + nIn[1] * 0.001], p2 = [a[0] + u[0] * tt[k + 1] + nIn[0] * 0.001, a[1] + u[1] * tt[k + 1] + nIn[1] * 0.001], z1 = G.zAt(p1) - mh, z2 = G.zAt(p2) - mh; if (!(z1 > zb0 + 0.01 || z2 > zb0 + 0.01)) continue; const c8 = [[p1[0], p1[1], zb0], [p2[0], p2[1], zb0], [p2[0] + nIn[0] * th, p2[1] + nIn[1] * th, zb0], [p1[0] + nIn[0] * th, p1[1] + nIn[1] * th, zb0], [p1[0], p1[1], Math.max(zb0, z1)], [p2[0], p2[1], Math.max(zb0, z2)], [p2[0] + nIn[0] * th, p2[1] + nIn[1] * th, Math.max(zb0, z2)], [p1[0] + nIn[0] * th, p1[1] + nIn[1] * th, Math.max(zb0, z1)]]; hexa(out, c8, TUGLA); Q.gable += (tt[k + 1] - tt[k]) * (Math.max(0, z1 - zb0) + Math.max(0, z2 - zb0)) / 2; }
    }
    // çizgisel metrajlar
    const len3 = ([A, B]) => Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
    Q.eave = G.lines.eave.reduce((s2, l) => s2 + len3(l), 0); Q.ridge = G.lines.ridge.reduce((s2, l) => s2 + len3(l), 0); Q.hip = G.lines.hip.reduce((s2, l) => s2 + len3(l), 0); Q.valley = G.lines.valley.reduce((s2, l) => s2 + len3(l), 0);
    if (isk) {
      // mertekler: her yüzeyde saçak kenarına dik, msp aralıkla
      out._typ = 'Mertek';
      for (const pc of G.pieces) {
        const x = pc.x, ts = pc.q.map(p => (p[0] - x.a[0]) * x.u[0] + (p[1] - x.a[1]) * x.u[1]), t0 = Math.min(...ts), t1 = Math.max(...ts);
        for (let t = Math.ceil((t0 + 0.02) / msp) * msp; t < t1 - 0.02; t += msp) { const base = [x.a[0] + x.u[0] * t, x.a[1] + x.u[1] * t], sg = clipSeg(pc.q, [base[0] - x.n[0] * 1e3, base[1] - x.n[1] * 1e3], [base[0] + x.n[0] * 1e3, base[1] + x.n[1] * 1e3]); if (!sg || M.dist2(sg[0], sg[1]) < 0.1) continue; const A = [sg[0][0], sg[0][1], G.Z0 + G.f(ev(x.g, sg[0]))], B = [sg[1][0], sg[1][1], G.Z0 + G.f(ev(x.g, sg[1]))]; beam(out, A, B, mb, mh, WOOD); addW('Mertek', len3([A, B]), mb, mh); }
      }
      // kırma / dere mertekleri
      for (const [k, nm] of [['hip', 'Kırma mertek'], ['valley', 'Dere mertek']]) for (const l of G.lines[k]) { out._typ = nm; beam(out, l[0], l[1], hb, hh, WOOD2); addW(nm, len3(l), hb, hh); }
      // aşıklar (duvar hattı = tabla üstü, araları asp), mahya aşığı; dikmeler ve tablalar
      const purl = []; // [A, B, ztop, isWall]
      const keyP = new Set();
      for (const pc of G.pieces) {
        const x = pc.x, ds = pc.q.map(p => ev(x.g, p)), d0 = Math.min(...ds), d1 = Math.max(...ds);
        const Ds = []; for (let D = ov; D < d1 - 0.1; D += asp) Ds.push(D); if (G.sac > 0.2) { const Dw = ov + G.sac; if (!Ds.some(D => Math.abs(D - Dw) < 0.4)) Ds.push(Dw); else Ds[Ds.findIndex(D => Math.abs(D - Dw) < 0.4 && D !== ov)] = Dw; Ds.sort((a, b) => a - b); }
        for (const D of Ds) { if (D < d0 - 1e-6) continue; const base = [x.a[0] + x.n[0] * D, x.a[1] + x.n[1] * D], sg = clipSeg(pc.q, [base[0] - x.u[0] * 1e3, base[1] - x.u[1] * 1e3], [base[0] + x.u[0] * 1e3, base[1] + x.u[1] * 1e3]); if (!sg || M.dist2(sg[0], sg[1]) < 0.2) continue; const kk = sg.map(p => p.map(v => Math.round(v * 100))).flat().join(); if (keyP.has(kk)) continue; keyP.add(kk); purl.push([sg[0], sg[1], G.Z0 + G.f(D) - mh, Math.abs(D - ov) < 1e-6]); }
      }
      for (const [A, B] of G.lines.ridge) purl.push([[A[0], A[1]], [B[0], B[1]], A[2] - mh, false, true]);
      for (const [a, b, ztop, isWall, isRidge] of purl) {
        const A = [a[0], a[1], ztop], B = [b[0], b[1], ztop];
        out._typ = isWall ? (G.sac > 0.2 ? 'Saçak aşığı' : 'Duvar aşığı') : isRidge ? 'Mahya aşığı' : 'Aşık';
        if (isWall) { // duvar hattı: tabla doğrudan döşeme / ayak duvarı üstünde
          for (const sg of segsInPoly(offsetPoly(G.wall, 0.02), a, b)) { const A2 = [sg[0][0], sg[0][1], ztop], B2 = [sg[1][0], sg[1][1], ztop]; beam(out, A2, B2, tab, ztop - (zt + knee), WOOD2); addW(G.sac > 0.2 ? 'Saçak aşığı' : 'Duvar aşığı', M.dist2(sg[0], sg[1]), tab, tab); }
          continue;
        }
        beam(out, A, B, ab, ah, WOOD); addW(isRidge ? 'Mahya aşığı' : 'Aşık', M.dist2(a, b), ab, ah);
        const ys = 0.025, zBase = zt + cyT * 0 + ys, zPost = ztop - ah; if (zPost - zBase < 0.15) continue;
        const inS = segsInPoly(G.wall, a, b); for (const sg of inS) { const Ls = M.dist2(sg[0], sg[1]); if (Ls < 0.2) continue; const ud = [(sg[1][0] - sg[0][0]) / Ls, (sg[1][1] - sg[0][1]) / Ls];
          out._typ = 'Yastık'; beam(out, [sg[0][0], sg[0][1], zt + ys], [sg[1][0], sg[1][1], zt + ys], tab, ys, WOOD2); addW('Yastık', Ls, tab, ys);
          const nP = Math.max(2, Math.ceil(Ls / dsp) + 1), pts = []; for (let i = 0; i < nP; i++) { const t = (0.15 + (Ls - 0.3) * i / (nP - 1)) / Ls; pts.push([sg[0][0] + (sg[1][0] - sg[0][0]) * t, sg[0][1] + (sg[1][1] - sg[0][1]) * t]); }
          out._typ = 'Dikme'; for (const p of pts) { post(out, p, zBase, zPost, db, WOOD); addW('Dikme', zPost - zBase, db, db); }
          const hP = zPost - zBase;
          if (hP > 0.8) { // kuşaklama 2×(5×10): dikmeleri yatayda bağlar (dikme yüksekliğinin ortası), iki yanda
            const zk = zBase + hP * 0.55; out._typ = 'Kuşaklama'; for (const sgn of [1, -1]) { const o = [-ud[1] * (db / 2 + 0.025) * sgn, ud[0] * (db / 2 + 0.025) * sgn]; beam(out, [pts[0][0] + o[0], pts[0][1] + o[1], zk + 0.05], [pts[pts.length - 1][0] + o[0], pts[pts.length - 1][1] + o[1], zk + 0.05], 0.05, 0.10, WOOD2); addW('Kuşaklama', M.dist2(pts[0], pts[pts.length - 1]), 0.05, 0.10); }
            out._typ = 'Göğüsleme'; for (let i = 0; i + 1 < pts.length; i++) { const p1 = pts[i], p2 = pts[i + 1], dL = M.dist2(p1, p2); if (dL < 0.6) continue; for (const [qa, qb, za, zb] of [[p1, p2, zBase + 0.15, zPost - 0.05], [p2, p1, zBase + 0.15, zPost - 0.05]]) for (const sgn of [1, -1]) { const o = [-ud[1] * (db / 2 + 0.075) * sgn, ud[0] * (db / 2 + 0.075) * sgn], A3 = [qa[0] + o[0], qa[1] + o[1], za + 0.05], B3 = [qb[0] + o[0], qb[1] + o[1], zb]; beam(out, B3, A3, 0.05, 0.10, WOOD2); addW('Göğüsleme', Math.hypot(dL, zb - za), 0.05, 0.10); } } // göğüsleme çift tahta 2x(5x10) (Çokal; kullanıcı kararı 14.11.2026): dikmenin iki yanında, kuşaklamanın dışında
          }
        }
      }
      // alın tahtası (saçak kenarı)
      out._typ = 'Alın tahtası';
      for (const [A, B] of G.lines.eave) { const d = [B[0] - A[0], B[1] - A[1]], l = Math.hypot(d[0], d[1]); if (l < 0.05) continue; const nO = [d[1] / l * 0.0125, -d[0] / l * 0.0125]; beam(out, [A[0] + nO[0], A[1] + nO[1], A[2] + topOff * 0.5], [B[0] + nO[0], B[1] + nO[1], B[2] + topOff * 0.5], 0.025, 0.20, [0.92, 0.92, 0.90]); addW('Alın tahtası', l, 0.025, 0.20); }
    }
    // yağmur oluğu ve iniş boruları (yagmur.js; PVC, çap ve adet mt-sihhi.js → C.yagmurHesap, yoksa Ø150 / Ø110 köşelerde)
    if (C.yagmurCati && C.yagmurAg && e.oluk !== 'H') { try { const Y = C.yagmurCati(e); out._typ = 'Yağmur oluğu'; C.yagmurAg(out, Y); Q.yagmur = Y; } catch (er) { console.error('yağmur oluğu', er); } }
    // mahya / kırma çizgileri (örtü üstünde)
    for (const k of ['ridge', 'hip', 'valley']) for (const [A, B] of G.lines[k]) out.edges3.push([[A[0], A[1], A[2] + topOff + 0.01], [B[0], B[1], B[2] + topOff + 0.01]]);
    { const f = G.foot; for (let i = 0; i < f.length; i++) { const a = f[(i - 1 + f.length) % f.length], b = f[i], c = f[(i + 1) % f.length]; if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) > 1e-9) Q.boru++; } }
    const mem = out.mem; delete out.mem; delete out.edgesW; delete out._typ;
    return { mesh: out, Q, G, mem };
  };
  const cacheAll = e => { const key = JSON.stringify([e.kind, e.pts, e.zt, e.ov, e.deg, e.knee, e.m1, e.deg1, e.yon, e.alt, e.xps, e.su, e.ortu, e.isk, e.mb, e.mh, e.msp, e.ab, e.ah, e.asp, e.db, e.dsp, e.yal, e.cy, e.sacak, e.oluk, e.olukDn, e.boruDn, e.yagmur, e.oluk !== 'H' ? yagmurImzaSon() : '']); /* yağmur imzası her çağrıda değil, değişiklikte bir kez hesaplanır (aşağıda C.on('change')) */ if (e._b && e._bk === key) return e._b; e._b = buildAll(e); e._bk = key; return e._b; };
  const qty = e => {
    const { Q } = cacheAll(e), out = [], o = ORTU[e.ortu] || ORTU.marsilya, nm = (TUR[e.kind] || TUR.kirma).split(' (')[0]; // boş tür (eski dosya, Bekçi): geometride kırma
    out.push([`${o.ad} — ${nm} (eğik alan)`, 'm²', Q.area]);
    if (+e.xps > 0 && (e.yal || 'mertek') !== 'doseme') out.push([`XPS ısı yalıtımı (${e.xps} cm) — çatı (mertek üstü)`, 'm²', Q.area]);
    if (Q.cy) out.push([`Cam yünü şilte (${e.cy || 8} cm) — çatı arası döşeme üstü`, 'm²', Q.cy]);
    if (e.su && e.su !== 'yok') out.push([SU[e.su].ad + ' — çatı', 'm²', Q.area]);
    if (e.alt && e.alt !== 'yok') out.push([ALT[e.alt].ad + ' — çatı', 'm²', Q.area]);
    let wv = 0; for (const [k, w] of Object.entries(Q.wood)) { out.push([`Ahşap ${k} ${+(w.b * 100).toFixed(1)}×${+(w.h * 100).toFixed(1)} (${M.fmt(w.L, 1)} m)`, 'm³', w.V]); wv += w.V; }
    if (wv) out.push(['Ahşap çatı iskeleti toplamı', 'm³', wv]);
    if (Q.yagmur && C.yagmurMetraj) out.push(...C.yagmurMetraj(Q.yagmur));
    else { if (Q.eave) out.push(['Yağmur oluğu (saçak boyu)', 'm', Q.eave]); if (Q.boru) out.push(['Yağmur borusu (köşelerde)', 'adet', Q.boru]); }
    if (o.mahya && Q.ridge + Q.hip) out.push(['Mahya / kırma kiremidi', 'm', Q.ridge + Q.hip]);
    if (Q.valley) out.push(['Dere sacı (galvaniz)', 'm', Q.valley]);
    if (Q.gable > 0.01) out.push(['Alınlık (beşik uç) tuğla duvar', 'm²', Q.gable]);
    return out;
  };
  C.catiMetraj = () => { const m = new Map(); for (const e of C.doc.ents) { if (e.type !== 'cati' || !C.lyLive(e.layer)) continue; for (const [ad, br, v] of qty(e)) { const k = ad.replace(/ \([0-9.,]+ m\)/, '') + '|' + br; m.set(k, (m.get(k) || 0) + v); } } return [...m.entries()].map(([k, v]) => { const [ad, br] = k.split('|'); return [ad, br, v]; }); };
  /* planda çatı: et = false → MIMARIPAFTA çatı planı (eleman yazıları, "Yağmur borusu" yazısı ve kotlar burada çizilmez: elemanlar oklu açıklamayla —
     C.catiOkPlan, mimari-oto.js — kotlar Kot katmanında kot nesnesi olarak — C.catiKotPlan) */
  const planPrims = (e, et) => {
      const { G, mem, Q } = cacheAll(e), out = [P(G.foot.map(p => [p[0], p[1], 0]), true, { lw: 35 }), P(G.inner.map(p => [p[0], p[1], 0]), true, { lt: 'HIDDEN', lw: 13 })], th = C.annoH(2.0);
      // ahşap elemanlar planda (çift çizgi), dikmeler çarpılı kare
      const lab = {};
      for (const m of mem || []) {
        if (m.P) { const h = m.b / 2, p = m.P; out.push(P([[p[0] - h, p[1] - h, 0], [p[0] + h, p[1] - h, 0], [p[0] + h, p[1] + h, 0], [p[0] - h, p[1] + h, 0]], true, { lw: 18 }), L([p[0] - h, p[1] - h, 0], [p[0] + h, p[1] + h, 0], { lw: 9 }), L([p[0] + h, p[1] - h, 0], [p[0] - h, p[1] + h, 0], { lw: 9 })); if (!lab[m.t]) lab[m.t] = { p, b: m.b }; continue; }
        if (m.t === 'Yastık' || m.t === 'Göğüsleme' || m.t === 'Alın tahtası' || !m.t) continue;
        const d = [m.B[0] - m.A[0], m.B[1] - m.A[1]], l = Math.hypot(d[0], d[1]); if (l < 0.05) continue; const w = [-d[1] / l * m.b / 2, d[0] / l * m.b / 2], dash = m.t === 'Duvar aşığı' || m.t === 'Saçak aşığı' || m.t === 'Kuşaklama' ? { lt: 'DASHED', lw: 13 } : { lw: m.t === 'Mertek' ? 9 : 18 };
        out.push(L([m.A[0] + w[0], m.A[1] + w[1], 0], [m.B[0] + w[0], m.B[1] + w[1], 0], dash), L([m.A[0] - w[0], m.A[1] - w[1], 0], [m.B[0] - w[0], m.B[1] - w[1], 0], dash));
        if (!lab[m.t] || l > lab[m.t].l) lab[m.t] = { p: [(m.A[0] + m.B[0]) / 2, (m.A[1] + m.B[1]) / 2], l, b: m.b, h: m.h, ang: Math.atan2(d[1], d[0]) };
      }
      const KES = { 'Saçak aşığı': '10x10', 'Mertek': `${Math.round((+e.mb || 0.05) * 100)}x${Math.round((+e.mh || 0.1) * 100)}`, 'Aşık': '10x10', 'Mahya aşığı': '10x10', 'Duvar aşığı': '10x10', 'Dikme': '10x10', 'Kırma mertek': '8x16', 'Dere mertek': '8x16', 'Kuşaklama': '2x5x10' };
      for (const [k, v] of Object.entries(lab)) { if (!et || !KES[k]) continue; const a = v.ang || 0, rot = Math.abs(a) > Math.PI / 2 ? a + Math.PI : a, tp = [v.p[0] + th * 1.2, v.p[1] + th * 1.2, 0]; out.push(L([v.p[0], v.p[1], 0], tp, { lw: 9 }), TX(tp, th, `${k} ${KES[k]}`, 0, 'BL')); void rot; }
      // yağmur oluğu (saçak boyunca) ve yağmur iniş boruları (hesaptan: yagmur.js → C.yagmurCati; numaralar YB1 … hesapla aynı)
      if (Q.yagmur) { const Y = Q.yagmur; out.push(P(Y.oluk.map(p => [p[0], p[1], 0]), true, { lw: 13, lt: 'DASHED' }));
        for (const b of Y.borular) { const q = b.p; out.push(C.prim.CI([q[0], q[1], 0], Y.rb, { lw: 18 })); const w = C.yagmurDuvarNoktasi ? C.yagmurDuvarNoktasi(b.yol) : (b.yol[2] || b.yol[1]); if (w && Math.hypot(w[0] - q[0], w[1] - q[1]) > 0.03) out.push(L([q[0], q[1], 0], [w[0], w[1], 0], { lw: 13, lt: 'HIDDEN' }), C.prim.CI([w[0], w[1], 0], Y.rb, { lw: 13, lt: 'HIDDEN' })); out.push(TX([q[0] + th * 0.6, q[1] + th * 0.6, 0], th * 0.8, b.no, 0, 'BL')); if (et) out.push(TX([q[0] + th, q[1] - th * 0.6, 0], th * 0.8, 'Yağmur borusu', 0, 'TL')); } }
      else { const gut = offsetPoly(G.foot, 0.07); out.push(P(gut.map(p => [p[0], p[1], 0]), true, { lw: 13, lt: 'DASHED' }));
      for (let i = 0; i < G.foot.length; i++) { const a = G.foot[(i - 1 + G.foot.length) % G.foot.length], b = G.foot[i], c = G.foot[(i + 1) % G.foot.length]; if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) <= 1e-9) continue; const q = gut[i]; out.push(C.prim.CI([q[0], q[1], 0], 0.055, { lw: 18 })); if (et) out.push(TX([q[0] + th, q[1] + th, 0], th * 0.8, 'Yağmur borusu', 0, 'BL')); } }
      // mahya / kırma / dere çizgileri
      for (const k of ['ridge', 'hip', 'valley', 'gableEdge']) for (const [A, B] of G.lines[k]) out.push(L([A[0], A[1], 0], [B[0], B[1], 0], { lw: k === 'ridge' ? 35 : 25 }));
      // eğim okları ve kotlar
      const done = new Set(), pct = pc => `Eğim %${Math.round(pc.slope * 100)}`;
      for (const pc of G.pieces.slice().sort((a, b) => Math.abs(area(b.q)) - Math.abs(area(a.q)))) { const k = pc.r + ':' + pc.k + (pc.lower ? 'L' : ''); if (done.has(k)) continue; done.add(k); const c = pc.q.reduce((s2, p) => [s2[0] + p[0] / pc.q.length, s2[1] + p[1] / pc.q.length], [0, 0]), n = pc.x.n, Lr = Math.min(1.2, Math.sqrt(Math.abs(area(pc.q))) * 0.35), a = [c[0] + n[0] * Lr / 2, c[1] + n[1] * Lr / 2, 0], b = [c[0] - n[0] * Lr / 2, c[1] - n[1] * Lr / 2, 0], hw = Lr * 0.18; out.push(L(a, b, { lw: 18 }), L(b, [b[0] + n[0] * hw - n[1] * hw * 0.6, b[1] + n[1] * hw + n[0] * hw * 0.6, 0], { lw: 18 }), L(b, [b[0] + n[0] * hw + n[1] * hw * 0.6, b[1] + n[1] * hw - n[0] * hw * 0.6, 0], { lw: 18 })); out.push(TX([c[0] - n[1] * th * 1.2, c[1] + n[0] * th * 1.2, 0], th, pct(pc), Math.abs(Math.atan2(-n[0], n[1])) > Math.PI / 2 ? Math.atan2(-n[0], n[1]) + Math.PI : Math.atan2(-n[0], n[1]), 'MC')); }
      const zr = C.catiMahyaKotu ? C.catiMahyaKotu(e) : Math.max(...G.pieces.flatMap(p => p.z)), fz = v => (v >= 0 ? '+' : '') + v.toFixed(2); // mahya kotu tek fonksiyondan (plan, kesit, bilgi)
      if (et && G.lines.ridge.length) { const [A, B] = G.lines.ridge.reduce((m, l) => (Math.hypot(l[1][0] - l[0][0], l[1][1] - l[0][1]) > Math.hypot(m[1][0] - m[0][0], m[1][1] - m[0][1]) ? l : m)); out.push(TX([(A[0] + B[0]) / 2 + th, (A[1] + B[1]) / 2 + th, 0], th, fz(zr), 0, 'BL')); }
      if (et) { const w = G.wall, c = [w[0][0] + (w[1][0] - w[0][0]) * 0.25, w[0][1] + (w[1][1] - w[0][1]) * 0.25]; const n = [-(w[1][1] - w[0][1]), w[1][0] - w[0][0]], ln = Math.hypot(n[0], n[1]) || 1, q = [c[0] + n[0] / ln * 0.9, c[1] + n[1] / ln * 0.9]; out.push(C.prim.CI([q[0], q[1], 0], th * 0.4, { lw: 13 }), L([q[0] - th * 0.6, q[1], 0], [q[0] + th * 0.6, q[1], 0], { lw: 9 }), L([q[0], q[1] - th * 0.6, 0], [q[0], q[1] + th * 0.6, 0], { lw: 9 }), TX([q[0], q[1] + th * 0.8, 0], th, fz(+e.zt || 0), 0, 'BC')); }
      void Q; return out;
  };
  T.cati = {
    label: 'Çatı', ifc: 'IfcRoof',
    prims: e => planPrims(e, true),
    mesh: e => [cacheAll(e).mesh],
    xf: (e, X) => { let dz = 0; try { const q = X.p([0, 0, 0]); dz = q && q.length > 2 ? (q[2] || 0) : 0; } catch (err) { } e.zt = (+e.zt || 0) + dz; e.pts = e.pts.map(q => X.p([q[0], q[1], 0]).slice(0, 2)); delete e._g; delete e._b; },
    snaps: e => { const G = geomOf(e), out = G.foot.map(p => ({ p: [p[0], p[1], 0], k: 'end' })); return out; },
    info: e => { const G = geomOf(e), q = qty(e); return `${TUR[e.kind] || TUR.kirma} · eğim ${M.fmt(+e.deg, 1)}° (%${Math.round(Math.tan(+e.deg * RAD) * 100)}) · saçak ${+e.sacak > 0 ? `${Math.round(+e.sacak * 100)} cm (döşeme konsolu)` + (+e.ov > 0 ? ` + ${Math.round(+e.ov * 100)} cm` : '') : `${Math.round((+e.ov || 0) * 100)} cm`}${+e.knee ? ` · ayak duvarı ${M.fmt(+e.knee, 2)} m` : ''} · mahya kotu ${M.fmt(C.catiMahyaKotu(e), 2)} · ${q.slice(0, 2).map(([a, b, v]) => `${a} ${M.fmt(v, 2)} ${b}`).join(' · ')}${G.warn ? ' · ' + G.warn : ''}`; },
  };
  /* sıhhi tesisat yağmur ayarı, kolon / perde zarfı ya da tretuvar değişirse oluk, boru ve metraj hemen yenilenir (önbellek ve çizim silinir) */
  let sonImza = null;
  const yagmurImzaSon = () => { if (sonImza == null && C.doc && C.yagmurImza) { try { sonImza = C.yagmurImza(); } catch (er) { return ''; } } return sonImza || ''; };
  C.on('change', () => { if (!C.doc || !C.yagmurImza) return; if (!C.doc.ents.some(r => r.type === 'cati')) { sonImza = null; return; } const im = C.yagmurImza(); if (im === sonImza) return; const ilk = sonImza == null; sonImza = im; if (ilk) return; for (const r of C.doc.ents) if (r.type === 'cati') { delete r._c; delete r._b; } });
  /* döşeme taşınır / değişirse çatı da gelir */
  C.on('change', () => { if (!C.doc) return; for (const r of C.doc.ents) if (r.type === 'cati' && r.host != null) { const pl = C.byId(r.host); if (!pl) continue; const js = JSON.stringify(pl.pts.map(p => [p[0], p[1]])); if (JSON.stringify(r.pts) !== js || Math.abs((+r.zt || 0) - (+pl.zt || 0)) > 1e-9 || (+r.sacak || 0) !== (+pl.sacak || 0)) { r.pts = JSON.parse(js); r.zt = +pl.zt || 0; r.sacak = +pl.sacak || 0; delete r._c; } } });
  /* ---------- KOMUT ---------- */
  C.addCommand(['CATI', 'CATIOLUSTUR', 'ROOF'], 'Çatı: kırma, beşik, tek eğimli (sundurma), mansart (kullanılabilir çatı katı), teras. Çatı döşemesine tıklayın — döşemenin şekline göre çatı yüzeyi, ahşap iskelet (tabla, dikme, aşık, mahya, mertek, kırma / dere mertekleri, alın tahtası), OSB / tahta, XPS, su yalıtımı ve çatı örtüsü otomatik.', async (I) => {
    const r = await I_().getParams('Çatı — ayarlar', [
      { k: 'kind', t: 'Çatı türü', opts: o_(TUR), d: 'kirma', al: ['TUR', 'KIND'] },
      { k: 'yuzde', t: 'Eğim (%) — ör. 33', d: 33, al: ['YUZDE', 'EGIMP'] }, { k: 'deg', t: 'Eğim (°) — 0 ise % kullanılır', d: 0, al: ['EGIM', 'DEG'] },
      { k: 'ov', t: 'Saçak — döşeme kenarından taşma (cm; −1 = otomatik: döşeme saçaklıysa 0, değilse 50)', d: -1, al: ['SACAK', 'OV'] },
      { k: 'kat', t: 'Çatı arası', opts: [['KULLANILMAZ', 'Kullanılmayan çatı arası'], ['KULLANILIR', 'Kullanılabilir çatı arası / çatı katı (ayak duvarlı)']], d: 'KULLANILMAZ', al: ['KAT'] },
      { k: 'knee', t: 'Ayak duvarı yüksekliği (m, kullanılabilir çatı arasında)', d: 1.0, al: ['AYAK', 'KNEE'] },
      { k: 'kneeM', t: 'Ayak duvarı malzemesi', opts: [['beton', 'Betonarme'], ['tugla', 'Tuğla'], ['gazbeton', 'Gazbeton']], d: 'beton', al: ['AYAKM'] },
      { k: 'deg1', t: 'Mansart alt eğimi (°)', d: 70, al: ['DEG1'] }, { k: 'm1', t: 'Mansart alt bölüm yatay derinliği (m)', d: 1.0, al: ['M1'] },
      { k: 'yon', t: 'Tek eğimli çatıda alçak (saçak) taraf', opts: [['on', 'Ön (−Y)'], ['arka', 'Arka (+Y)'], ['sol', 'Sol (−X)'], ['sag', 'Sağ (+X)']], d: 'on', al: ['YON'] },
      { k: 'alt', t: 'Kaplama altı', opts: o_(ALT), d: 'tahta18', al: ['ALT'] },
      { k: 'yal', t: 'Isı yalıtımı yeri', opts: [['doseme', 'Çatı arası döşeme üstü (cam yünü şilte)'], ['mertek', 'Mertek üstü (XPS)'], ['ikisi', 'İkisi birden']], d: 'doseme', al: ['YAL'] }, { k: 'cy', t: 'Cam yünü şilte kalınlığı (cm)', d: 8, al: ['CY'] },
      { k: 'xps', t: 'XPS ısı yalıtımı (cm, 0 = yok)', d: 5, al: ['XPS'] },
      { k: 'su', t: 'Su yalıtımı', opts: o_(SU), d: 'bitum', al: ['SU'] },
      { k: 'ortu', t: 'Çatı örtüsü', opts: o_(ORTU), d: 'alaturka', al: ['ORTU'] },
      { k: 'isk', t: 'Ahşap iskelet', opts: [['E', 'Oluştur'], ['H', 'Oluşturma (yalnız yüzey)']], d: 'E', al: ['ISK'] },
      { k: 'msp', t: 'Mertek aralığı (cm)', d: 50, al: ['MSP'] }, { k: 'mh', t: 'Mertek kesiti yükseklik (cm, genişlik 5)', d: 10, al: ['MH'] },
      { k: 'asp', t: 'Aşık aralığı (yatay, m)', d: 2.1, al: ['ASP'] }, { k: 'dsp', t: 'Dikme aralığı (m)', d: 2.5, al: ['DSP'] },
      { k: 'ph', t: 'Teras: parapet yüksekliği (m)', d: 1.0, al: ['PH'] },
    ], 'cati'); if (!r) return;
    const slabs = () => C.doc.ents.filter(x => x.type === 'plak' && x.kind !== 'radye' && C.lyLive(x.layer));
    const topSlabs = () => slabs().filter(x => !slabs().some(y => y !== x && (+y.zt || 0) > (+x.zt || 0) + 0.5 && C.pointInPoly(x.pts[0], y.pts)));
    C.ensureLayer('INS_CATI', 30, 'CONTINUOUS', 25);
    const make = pl => {
      if (r.kind === 'teras') {
        if (C.setParapet && +r.ph > 0) C.setParapet(pl, +r.ph, 0.2, 'beton');
        if (C.T.yalitim && !C.doc.ents.some(y => y.type === 'yalitim' && y.kind === 'cati' && y.host === pl.id)) { const y = C.add(C.newEnt('yalitim', { kind: 'cati', host: pl.id, pts: pl.pts.map(q => [q[0], q[1]]), z: +pl.zt || 0, buhar: 'E', egim: 5, mat: +r.xps > 0 ? 'xps' : 'yok', t: +r.xps || 0, su: 'bitum', kor: 'cakil', layer: 'INS_YALITIM' })); delete y.sp; }
        C.log(`Teras çatı: parapet ${M.fmt(+r.ph, 2)} m, eğim betonu + XPS ${r.xps} cm + bitümlü örtü + çakıl koruma.`); return true;
      }
      if (C.doc.ents.some(x => x.type === 'cati' && x.host === pl.id)) { C.warn('Bu döşemede zaten çatı var (silip yeniden oluşturun ya da Özellikler\'den değiştirin).'); return false; }
      const knee = r.kat === 'KULLANILIR' || r.kind === 'mansart' ? Math.max(0, +r.knee || 0) : 0;
      const degV = +r.deg > 0 ? +r.deg : Math.atan((+r.yuzde || 33) / 100) / RAD, ovV = +r.ov >= 0 ? +r.ov / 100 : (+pl.sacak > 0 ? 0 : 0.5);
      const e = C.add(C.newEnt('cati', { kind: r.kind, host: pl.id, pts: pl.pts.map(q => [q[0], q[1]]), zt: +pl.zt || 0, sacak: +pl.sacak || 0, ov: ovV, deg: degV, yal: r.yal, cy: +r.cy || 8, knee, kneeM: r.kneeM, deg1: +r.deg1 || 70, m1: +r.m1 || 1, yon: r.yon, alt: r.alt, xps: +r.xps || 0, su: r.su, ortu: r.ortu, isk: r.isk, msp: (+r.msp || 50) / 100, mh: (+r.mh || 10) / 100, mb: 0.05, asp: +r.asp || 2.1, ab: 0.10, ah: 0.10, dsp: +r.dsp || 2.5, db: 0.10, layer: 'INS_CATI' })); delete e.sp;
      if (knee > 0 && C.setParapet) { const kw = C.setParapet(pl, knee, 0.2, r.kneeM); if (kw) { kw.ayak = true; kw.layer = r.kneeM === 'beton' ? kw.layer : kw.layer; } }
      if (C.parapetOf && knee === 0) { const pp = C.parapetOf(pl); if (pp) C.remove([pp]); } // eğimli çatıda parapet olmaz
      C.log(T.cati.info(e)); return true;
    };
    let n = 0;
    for (; ;) {
      const p = await I.pt('Çatı yapılacak döşemeye tıklayın (T = tüm üst döşemeler, Enter bitir)', { kw: [['T', 'TUMU', 'TÜMÜ']] });
      if (p === 'T') { for (const pl of topSlabs()) if (make(pl)) n++; break; }
      if (!p || typeof p === 'string') break;
      const cand = slabs().filter(x => C.pointInPoly(p, x.pts)).sort((a, b) => (+b.zt || 0) - (+a.zt || 0)); if (!cand.length) { C.warn('Burada döşeme yok.'); if (E.scriptMode && !E.queue.length) break; continue; }
      if (make(cand[0])) n++; if (E.scriptMode && !E.queue.length) break;
    }
    if (n) { C.changed(); C.log(`${n} çatı oluşturuldu. Metraj: INSMETRAJ (örtü, XPS, membran, ahşap m³, oluk, mahya).`); }
  });

  /* MIMARIPAFTA çatı planı eki (mimari-pafta.js): planda oluk, iniş boruları, mahya / kırma / dere çizgileri, eğim okları ve kotlar — iskelet (aşık, mertek) olmadan.
     Döner: 2B parça listesi (C.prims biçimi) */
  C.catiPlanSembol = e => {
    const G = geomOf(e), out = [], th = C.annoH(2.0);
      // yağmur oluğu (saçak boyunca) ve yağmur boruları: hesap varsa yagmur.js'teki yerleri (oluk çıkışı, PVC çapı), yoksa dış köşeler
      let YS = null; try { YS = e.oluk !== 'H' && C.yagmurCati ? C.yagmurCati(e) : null; } catch (er) { YS = null; }
      if (YS) { out.push(P(YS.oluk.map(p => [p[0], p[1], 0]), true, { lw: 13, lt: 'DASHED' })); for (const b of YS.borular) out.push(C.prim.CI([b.p[0], b.p[1], 0], YS.rb, { lw: 18 }), TX([b.p[0] + th, b.p[1] + th, 0], th * 0.8, 'Yağmur borusu', 0, 'BL')); }
      else { const gut = offsetPoly(G.foot, 0.07); out.push(P(gut.map(p => [p[0], p[1], 0]), true, { lw: 13, lt: 'DASHED' }));
      for (let i = 0; i < G.foot.length; i++) { const a = G.foot[(i - 1 + G.foot.length) % G.foot.length], b = G.foot[i], c = G.foot[(i + 1) % G.foot.length]; if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) <= 1e-9) continue; const q = gut[i]; out.push(C.prim.CI([q[0], q[1], 0], 0.055, { lw: 18 }), TX([q[0] + th, q[1] + th, 0], th * 0.8, 'Yağmur borusu', 0, 'BL')); } }
      // mahya / kırma / dere çizgileri
      for (const k of ['ridge', 'hip', 'valley', 'gableEdge']) for (const [A, B] of G.lines[k]) out.push(L([A[0], A[1], 0], [B[0], B[1], 0], { lw: k === 'ridge' ? 35 : 25 }));
      // eğim okları ve kotlar
      const done = new Set(), pct = pc => `Eğim %${Math.round(pc.slope * 100)}`;
      for (const pc of G.pieces.slice().sort((a, b) => Math.abs(area(b.q)) - Math.abs(area(a.q)))) { const k = pc.r + ':' + pc.k + (pc.lower ? 'L' : ''); if (done.has(k)) continue; done.add(k); const c = pc.q.reduce((s2, p) => [s2[0] + p[0] / pc.q.length, s2[1] + p[1] / pc.q.length], [0, 0]), n = pc.x.n, Lr = Math.min(1.2, Math.sqrt(Math.abs(area(pc.q))) * 0.35), a = [c[0] + n[0] * Lr / 2, c[1] + n[1] * Lr / 2, 0], b = [c[0] - n[0] * Lr / 2, c[1] - n[1] * Lr / 2, 0], hw = Lr * 0.18; out.push(L(a, b, { lw: 18 }), L(b, [b[0] + n[0] * hw - n[1] * hw * 0.6, b[1] + n[1] * hw + n[0] * hw * 0.6, 0], { lw: 18 }), L(b, [b[0] + n[0] * hw + n[1] * hw * 0.6, b[1] + n[1] * hw - n[0] * hw * 0.6, 0], { lw: 18 })); out.push(TX([c[0] - n[1] * th * 1.2, c[1] + n[0] * th * 1.2, 0], th, pct(pc), Math.abs(Math.atan2(-n[0], n[1])) > Math.PI / 2 ? Math.atan2(-n[0], n[1]) + Math.PI : Math.atan2(-n[0], n[1]), 'MC')); }
    return out;
  };
  C.catiGeom = e => geomOf(e);
  /* MAHYA KOTU (tek kaynak; denetim 14.11.2026: A-A +6.65, A'-A' +6.57, çatı planı +6.58 üç ayrı değerdi): mahyada örtünün üstü = taşıyıcı (mertek) üstü
     en yüksek kotu + kaplama katmanlarının toplamı (kaplama tahtası, XPS, su yalıtımı, örtü — 3B modelde üst üste konan katmanlar). Çatı planı kotu,
     kesitlerdeki mahya kotu (C.catiKotKesit, A-A, A'-A', B'-B') ve çatı bilgisi bunu kullanır. Çokal 10-İdari çatı kesitlerinde mahya kotu yok (+6,19 baca
     başlığı); örtü üstü kabulü kullanıcıya soruldu. */
  C.catiMahyaKotu = e => { const G = geomOf(e), zr = Math.max(...G.pieces.flatMap(p => p.z)); let top = 0; try { for (const k of C.catiOkVerisi(e).kat) top = Math.max(top, k.o + k.t); } catch (er) { top = 0; } return Math.round((zr + top) * 1000) / 1000; };
  /* mahya hattı (en uzun mahya; yoksa en yüksek kenar): [[x, y], [x, y]] */
  C.catiMahyaHatti = e => { const G = geomOf(e), L = G.lines.ridge || []; if (L.length) { const r = L.reduce((m, l) => (Math.hypot(l[1][0] - l[0][0], l[1][1] - l[0][1]) > Math.hypot(m[1][0] - m[0][0], m[1][1] - m[0][1]) ? l : m)); return [[r[0][0], r[0][1]], [r[1][0], r[1][1]]]; }
    let en = null; for (const pc of G.pieces) for (let i = 0; i < pc.q.length; i++) { const j = (i + 1) % pc.q.length, z = Math.min(pc.z[i], pc.z[j]); if (!en || z > en.z + 1e-6) en = { z, a: pc.q[i], b: pc.q[j] }; } return en ? [[en.a[0], en.a[1]], [en.b[0], en.b[1]]] : null; };
  C.catiPlanCizim = e => planPrims(e, false);
  /* oklu açıklama verisi (mimari-oto.js → C.catiOkPlan / C.catiOkKesit): ahşap elemanlar (mem: { t, A, B, b, h } kiriş türü, { t, P, z1, z2, b } dikme),
     kaplama katmanları (taşıyıcı üstünden yukarı: tür, anahtar, kalınlık, alt ofset), oluk ve iniş borusu (yer: oluk hattı = saçak dışında oluk ekseni; borular yagmur.js'ten — köşenin yanında, duvara dik iner) */
  C.catiOkVerisi = e => {
    const { G, mem, Q } = cacheAll(e), yal = e.yal || 'mertek', kat = []; let o = 0;
    for (const [tur, key, t, ok] of [['alt', e.alt || 'osb', (ALT[e.alt] || ALT.osb).t, (ALT[e.alt] || ALT.osb).col], ['xps', 'xps', +e.xps > 0 && yal !== 'doseme' ? +e.xps / 100 : 0, XPSC], ['su', e.su || 'membran', (SU[e.su] || SU.membran).t, (SU[e.su] || SU.membran).col], ['ortu', e.ortu || 'marsilya', (ORTU[e.ortu] || ORTU.marsilya).t, (ORTU[e.ortu] || ORTU.marsilya).col]]) {
      if (!(t > 0) || !ok) continue; const ad = tur === 'alt' ? ALT[key].ad : tur === 'su' ? SU[key].ad : tur === 'ortu' ? ORTU[key].ad : 'XPS ısı yalıtımı'; kat.push({ tur, key, ad, t, o }); o += t; }
    const gut = offsetPoly(G.foot, 0.07), kose = [];
    for (let i = 0; i < G.foot.length; i++) { const a = G.foot[(i - 1 + G.foot.length) % G.foot.length], b = G.foot[i], c = G.foot[(i + 1) % G.foot.length]; if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) > 1e-9) kose.push(gut[i]); }
    const zE = G.lines.eave.length ? Math.min(...G.lines.eave.flat().map(p => p[2])) : G.Z0;
    const Y = Q && Q.yagmur; // yagmur.js: hesaptan oluk ve borular
    return { G, mem: mem || [], kat, oluk: Y ? Y.oluk : gut, boru: Y ? Y.borular.map(b => b.p) : kose, borular: Y ? Y.borular : null, olukDN: Y ? Y.olukDN : null, borDN: Y ? Y.borDN : null, ro: Y ? Y.ro : 0.075, rb: Y ? Y.rb : 0.055, zSacak: Y ? Y.zSacak : zE, egim: Math.round(G.tn * 100) };
  };
  /* MIMARIPAFTA çatı detayları: DETAY-A (saçak) ve DETAY-B (mahya), 1/10; O: modelde yer. Yeni nesneler C._gvCur görünümüne girer. */
  C.catiDetaylari = (e, O) => drawDetails(e, O);
  /* ---------- ÇATI PAFTASI: çatı planı başlığı + ölçüleri, A-A / B-B kesitleri, DETAY-A (saçak) ve DETAY-B (mahya) 1/10 ---------- */
  /* Yazılar, ebatlar ve taramalar tek kaynaktan (denetim 14.11.2026: detay plan / kesitle çelişmesin): ebatlar modelin çatı nesnesinden (C.catiOkVerisi →
     plan ve kesit oklarıyla aynı), yazı biçimi mimari-oto.js (Çokal ÇKL-AAT-İB-03: "Aşık 10x12", "D. Aşığı 10x10", "Kuşaklama" / "2x5x10" …), oklu açıklama
     aynı yer seçimiyle (C.okluAciklamaKoy; YZ katmanı, ok ucu 1,2 mm, kol 6,4 mm / 60°, 1/10'da kâğıt 1 mm = 0,01 m), tarama kesit taramasıyla aynı
     (C.secHatchSpec: beton kural tablosundan ANSI36; 1/10'da kâğıttaki aralık korunur), başlık 4 mm (kural tablosu baslik.detayMm). */
  const drawDetails = (e, O) => {
    const host = C.byId(e.host) || {}, tn = Math.tan((+e.deg || 18) * RAD), cs = Math.cos(Math.atan(tn)), t = +host.t || 0.15, sc = +host.sacak > 0 ? +host.sacak : Math.max(0.3, +e.ov || 0.5);
    let V = null; try { V = C.catiOkVerisi(e); } catch (er) { V = null; }
    /* kuşaklama ve göğüsleme yalnız modelde varsa (dikme 0,80 m'den yüksekse; cati.js buildAll) çizilir — detay plan / kesitle çelişmesin (denetim 14.11.2026, Bekçi) */
    const varK = !V || V.mem.some(m => m.t === 'Kuşaklama'), varG = !V || V.mem.some(m => m.t === 'Göğüsleme');
    const memB = tt => { const m = V && V.mem.find(q => q.t === tt); return m ? [m.b, m.P ? m.b : m.h] : null; };
    const mb = +e.mb || 0.05, mh = +e.mh || 0.12, ab = +e.ab || 0.10, ah = +e.ah || 0.12, db = +e.db || 0.10, yal = e.yal || 'mertek', cy = (yal === 'doseme' || yal === 'ikisi') ? (+e.cy || 8) / 100 : 0;
    const sA = memB('Saçak aşığı') || memB('Duvar aşığı') || [0.10, 0.10], sAt = memB('Saçak aşığı') ? 'Saçak aşığı' : 'Duvar aşığı', alin = memB('Alın tahtası') || [0.025, 0.20];
    const kat = V ? V.kat : [], katOf = tur => kat.find(k => k.tur === tur), ang = Math.atan(tn), pct = Math.round(tn * 100);
    const A = C.mimariOtoApi || {}, ebat = (b, h) => [b, h].map(v => +(v * 100).toFixed(1)).sort((x, y) => x - y).join('x');
    const uye = (tt, b, h, yer) => A.catiUyeYazisi ? A.catiUyeYazisi(tt, b, h, yer || 'kesit') : [tt + ' ' + ebat(b, h)];
    const katY = k => A.catiKatmanYazisi ? A.catiKatmanYazisi(k) : [k.ad], dnO = (V && V.olukDN) || +e.olukDn || 150, olukY = A.olukYazisi ? A.olukYazisi(dnO) : [`Ø${dnO} PVC Yağmur Oluğu`];
    const KB = (C.cizimKural && C.cizimKural.MIMARI && C.cizimKural.MIMARI.baslik) || {}, thB = (KB.detayMm || 4) / 100, thO = (KB.olcekMm || 3) / 100;
    ['DETAY', 'DETAY_INCE', 'DETAY_TARAMA'].forEach((l, i) => C.ensureLayer(l, [7, 8, 8][i], 'CONTINUOUS', [35, 13, 9][i])); C.std('YAZI');
    const add = (t2, pr) => { const x = C.add(C.newEnt(t2, pr)); delete x.sp; return x; };
    const th = 0.02; // 1/10'da 2 mm yazı
    const mk = (ox, oy) => {
      const W = (x, y) => [ox + x, oy + y, 0], oklar = [], i0 = C.doc.ents.length;
      const ln = (a, b, lay, o) => add('line', Object.assign({ a: W(...a), b: W(...b), layer: lay || 'DETAY' }, o || {}));
      const pl = (pts, cl, lay, o) => add('pline', Object.assign({ pts: pts.map(p => W(...p)), closed: !!cl, layer: lay || 'DETAY' }, o || {}));
      /* tarama: kesit malzeme kodu (B beton, Y yalıtım, F dolgu) → kesit taramasıyla aynı desen; 1/10 detayda kâğıttaki aralık korunur (ann → gerçek ölçek × 10) */
      const ht = (loops, mat) => { const H = C.secHatchSpec ? C.secHatchSpec(mat) : null; if (!H) return null; return add('hatch', { loops: loops.map(lp => lp.map(p => { const w = W(...p); return [w[0], w[1]]; })), pat: H.pat, sc: H.ann === false ? H.sc : H.sc * 10, ang: H.ang || 0, ann: false, orig: [ox, oy], layer: 'DETAY_TARAMA' }); };
      const tx = (p, s2, al, rot) => add('text', { p: W(...p), h: th, s: s2, rot: rot || 0, al: al || 'L', layer: 'YAZI' });
      const ok = (p, satir) => { if (satir && satir.length) oklar.push({ p, satir }); }; // oklu açıklama: ucu p'de, yeri sonra (bütün çizgiler konduktan sonra) seçilir
      const wood = (x0, y0, w, h) => { pl([[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], true); ln([x0, y0], [x0 + w, y0 + h], 'DETAY_INCE'); ln([x0 + w, y0], [x0, y0 + h], 'DETAY_INCE'); };
      const tiles = (x0, y0, len, a) => { // a: ilerleme açısı (rad); kiremitler örtü üstünde (yukarı tarafa)
        const ca = Math.cos(a), sa = Math.sin(a); let nx = -sa, ny = ca; if (ny < 0) { nx = -nx; ny = -ny; } const T2 = (s2, n) => [x0 + s2 * ca + n * nx, y0 + s2 * sa + n * ny];
        for (let s2 = 0; s2 < len - 0.05; s2 += 0.36) { const seg = [[s2, 0.0], [s2 + 0.02, 0.045], [s2 + 0.06, 0.055], [s2 + 0.09, 0.035], [s2 + 0.40, 0.02], [s2 + 0.42, 0.005]].map(([u, n]) => T2(u, n)); pl(seg, false, 'DETAY'); }
      };
      const title = (p, s2) => { add('text', { p: W(p[0], p[1]), h: thB, s: s2, rot: 0, al: 'C', layer: 'YAZI' }); const w2 = s2.length * thB * 0.7; ln([p[0] - w2 / 2, p[1] - 0.015], [p[0] + w2 / 2, p[1] - 0.015], 'YAZI', { lw: 35 }); ln([p[0] - w2 / 2, p[1] - 0.025], [p[0] + w2 / 2, p[1] - 0.025], 'YAZI'); add('text', { p: W(p[0], p[1] - 0.07), h: thO, s: 'ÖL:1/10', rot: 0, al: 'C', layer: 'YAZI' }); };
      const okKoy = () => { if (!oklar.length) return; const list = C.doc.ents.slice(i0);
        if (C.okluAciklamaKoy) C.okluAciklamaKoy(oklar.map(o => ({ adaylar: [W(...o.p).slice(0, 2)], satir: o.satir })), list, {}, { tur: 'cati', k: 0.01 });
        else for (const o of oklar) o.satir.forEach((s2, i) => tx([o.p[0] + 0.1, o.p[1] + 0.1 - i * 0.03], s2)); };
      return { W, ln, pl, ht, tx, ok, wood, tiles, title, okKoy };
    };
    /* DETAY-A: saçak */
    { const D = mk(O[0], O[1]), Lx = sc + 1.4, ybot = -0.55;
      const conc = [[0, 0], [Lx, 0], [Lx, -t], [sc + 0.30, -t], [sc + 0.30, ybot], [sc, ybot], [sc, -t], [0, -t]]; D.pl(conc, true); D.ht([conc], 'B');
      D.pl([[sc, ybot], [sc + 0.19, ybot], [sc + 0.19, ybot - 0.5]], false); D.pl([[sc - 0.05, -t], [sc - 0.05, ybot - 0.5]], false, 'DETAY_INCE'); D.ht([[[sc - 0.05, -t], [sc, -t], [sc, ybot - 0.5], [sc - 0.05, ybot - 0.5]]], 'Y');
      D.ln([sc + 0.19, ybot - 0.5], [sc - 0.05, ybot - 0.5], 'DETAY_INCE', { lt: 'DASHED' }); D.ln([Lx, 0.9], [Lx, ybot - 0.5], 'DETAY_INCE', { lt: 'DASHED' });
      if (cy > 0) { const q = [[sc + 0.08, 0], [Lx, 0], [Lx, cy], [sc + 0.08, cy]]; D.pl(q, true, 'DETAY_INCE'); D.ht([q], 'Y'); D.ok([sc + 0.9, cy / 2], [`Cam Yünü Şilte (${Math.round(cy * 100)} cm)`]); }
      const xs = -0.03, yb = x => sA[1] + Math.max(x, 0) * tn + Math.min(x, 0) * tn, hv = mh / cs, yt = x => yb(x) + hv;
      D.wood(0.0, 0, sA[0], sA[1]); D.ok([sA[0] / 2, sA[1] / 2], uye(sAt, sA[0], sA[1]));
      { const ya = yb(sc); D.wood(sc - ab / 2, ya - ah, ab, ah); D.pl([[sc - db / 2, 0], [sc + db / 2, 0], [sc + db / 2, ya - ah], [sc - db / 2, ya - ah]], true, 'DETAY_INCE'); D.ok([sc, ya - ah / 2], uye('Aşık', ab, ah)); }
      D.pl([[xs, yb(xs)], [Lx, yb(Lx)]], false); D.pl([[xs, yt(xs)], [Lx, yt(Lx)]], false); D.ln([xs, yb(xs)], [xs, yt(xs)]);
      D.ok([sc + 0.6, (yb(sc + 0.6) + yt(sc + 0.6)) / 2], uye('Mertek', mb, mh));
      let o = hv; const band = (k, mat, lw) => { if (!k || !(k.t > 0)) return; const a1 = o, a2 = o + k.t / cs, y1 = x => yb(x) + a1, y2 = x => yb(x) + a2; const q = [[xs, y1(xs)], [Lx, y1(Lx)], [Lx, y2(Lx)], [xs, y2(xs)]]; D.pl(q, true, lw ? 'DETAY' : 'DETAY_INCE', lw ? { lw } : undefined); if (mat) D.ht([q], mat); D.ok([sc + 1.0, (y1(sc + 1.0) + y2(sc + 1.0)) / 2], katY(k)); o = a2; };
      band(katOf('alt')); band(katOf('xps'), 'Y'); band(katOf('su'), null, 50);
      D.tiles(xs - 0.04, yb(xs - 0.04) + o, (Lx - xs) / cs, ang); if (katOf('ortu')) D.ok([sc + 0.3, yb(sc + 0.3) + o + 0.03], katY(katOf('ortu')));
      D.pl([[xs - alin[0], yt(xs) + 0.01], [xs - alin[0], yt(xs) - alin[1]], [xs, yt(xs) - alin[1]]], false); D.ok([xs - alin[0], yt(xs) - alin[1] / 2], uye('Alın tahtası', alin[0], alin[1]));
      const gy = yt(xs) - alin[1] - 0.02, r0 = dnO / 2000; D.pl([[xs - 0.03, gy + 0.13], [xs - 0.03, gy], [xs - 0.03 - 2 * r0, gy], [xs - 0.03 - 2 * r0, gy + 0.14], [xs - 0.045 - 2 * r0, gy + 0.14]], false, 'DETAY', { lw: 35 }); D.ok([xs - 0.03 - r0, gy], olukY);
      const kx = sc + 0.75; if (varK) D.pl([[kx, yb(kx) - 0.12], [Lx, yb(kx) - 0.12], [Lx, yb(kx) - 0.02], [kx, yb(kx) - 0.02]], true, 'DETAY_INCE'); if (varK) D.ok([kx + 0.3, yb(kx) - 0.07], uye('Kuşaklama', 0.05, 0.10));
      const ax = sc + 0.35, ay = yt(sc + 0.35) + o + 0.18; D.pl([[ax + 0.3 * cs, ay + 0.3 * Math.sin(ang)], [ax, ay]], false, 'DETAY_INCE'); D.pl([[ax + 0.05, ay + 0.03], [ax, ay], [ax + 0.05, ay - 0.02]], false, 'DETAY_INCE'); D.tx([ax + 0.1, ay + 0.06], `Eğim %${pct}`, 'L', ang / RAD);
      D.title([sc * 0.6 + 0.6, ybot - 0.65], 'DETAY-A'); D.okKoy();
    }
    /* DETAY-B: mahya */
    { const ox = O[0] + sc + 3.6, oy = O[1] + 0.2, D = mk(ox, oy), X = 1.25, hv = mh / cs, yt = x => -Math.abs(x) * tn, yb = x => yt(x) - hv, mA = memB('Mahya aşığı') || [ab, ah], dk = memB('Dikme') || [db, db];
      for (const sg of [1, -1]) { D.pl([[0, yt(0)], [sg * X, yt(X)]], false); D.pl([[sg * 0.0, yb(0)], [sg * X, yb(X)]], false); }
      D.ok([0.55, (yt(0.55) + yb(0.55)) / 2], uye('Mertek', mb, mh));
      const ay = yb(0); D.wood(-mA[0] / 2, ay - mA[1], mA[0], mA[1]); D.ok([0, ay - mA[1] / 2], uye('Mahya aşığı', mA[0], mA[1]));
      D.pl([[-dk[0] / 2, ay - mA[1]], [-dk[0] / 2, -1.05]], false); D.pl([[dk[0] / 2, ay - mA[1]], [dk[0] / 2, -1.05]], false); D.ln([-dk[0] / 2, -1.05], [dk[0] / 2, -1.05], 'DETAY_INCE', { lt: 'DASHED' }); D.ok([0.0, -0.8], uye('Dikme', dk[0], dk[1]));
      const ky = -0.52; if (varK) D.pl([[-1.0, ky - 0.05], [1.0, ky - 0.05], [1.0, ky + 0.05], [-1.0, ky + 0.05]], true); if (varK) D.ok([-0.6, ky], uye('Kuşaklama', 0.05, 0.10));
      if (varG) for (const sg of [1, -1]) { const p1 = [sg * dk[0] / 2, -0.95], p2 = [sg * 0.75, yb(0.75) - 0.02]; const d = [p2[0] - p1[0], p2[1] - p1[1]], l = Math.hypot(d[0], d[1]), nn = [-d[1] / l * 0.05, d[0] / l * 0.05]; D.pl([[p1[0] + nn[0], p1[1] + nn[1]], [p2[0] + nn[0], p2[1] + nn[1]], [p2[0] - nn[0], p2[1] - nn[1]], [p1[0] - nn[0], p1[1] - nn[1]]], true, 'DETAY_INCE'); }
      if (varG) D.ok([0.4, (-0.95 + yb(0.75)) / 2 + 0.05], uye('Göğüsleme', 0.05, 0.10));
      let o = 0; const band = (k, mat, lw) => { if (!k || !(k.t > 0)) return; const a2 = o + k.t / cs; for (const sg of [1, -1]) { const q = [[0, yt(0) + o], [sg * X, yt(X) + o], [sg * X, yt(X) + a2], [0, yt(0) + a2]]; D.pl(q, true, lw ? 'DETAY' : 'DETAY_INCE', lw ? { lw } : undefined); if (mat) D.ht([q], mat); } D.ok([0.9, yt(0.9) + (o + a2) / 2], katY(k)); o = a2; };
      band(katOf('alt')); band(katOf('xps'), 'Y'); band(katOf('su'), null, 50);
      D.tiles(0.06, yt(0.06) + o, X, -ang); D.tiles(-0.06, yt(0.06) + o, X, Math.PI + ang); if (katOf('ortu')) D.ok([-0.6, yt(0.6) + o + 0.03], katY(katOf('ortu')));
      const r = 0.09, cyy = yt(0) + o + 0.04, arc = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * i / 16; arc.push([Math.cos(a) * r, cyy + Math.sin(a) * r * 0.9]); } D.pl(arc, false, 'DETAY', { lw: 35 }); D.ht([arc.concat([[-r, cyy - 0.02], [r, cyy - 0.02]].reverse())], 'F');
      D.ok([0.02, cyy + r * 0.9], ['Mahya Kiremidi + Harç Dolgu']);
      D.ln([-X, -1.05], [X, -1.05], 'DETAY_INCE', { lt: 'DASHED' });
      D.title([0, -1.25], 'DETAY-B'); D.okKoy();
    }
  };
  C.addCommand(['CATIPAFTA', 'CATIDETAY', 'CATICIZIM'], 'Çatı paftası (örnek kırma çatı projesine göre): çatı planı başlığı ve ölçüleri, A-A ve B-B kesitleri, DETAY-A (saçak) ve DETAY-B (mahya) 1/10 — çatıya tıklayın.', async (I) => {
    let e = C.sel.find(x => x.type === 'cati'); const all = C.doc.ents.filter(x => x.type === 'cati');
    if (!e && all.length === 1) e = all[0];
    if (!e) { const p = await I.pt('Çatıya tıklayın'); if (!p || typeof p === 'string') return; e = all.find(x => C.pointInPoly(p, geomOf(x).foot)); if (!e) { C.warn('Burada çatı yok.'); return; } }
    const G = geomOf(e), f = G.foot, bx = [Math.min(...f.map(p => p[0])), Math.min(...f.map(p => p[1])), Math.max(...f.map(p => p[0])), Math.max(...f.map(p => p[1]))];
    C.sel = []; C.emit('selection'); const gv0 = C._gvCur; C._gvCur = 'CP' + Date.now().toString(36);
    C.std('YAZI'); C.ensureLayer('OLCU', 3, 'CONTINUOUS', 18);
    // plan başlığı + ölçüler (saçak dış ölçüsü ve duvar hattı)
    const w = G.inner, wb = [Math.min(...w.map(p => p[0])), Math.min(...w.map(p => p[1])), Math.max(...w.map(p => p[0])), Math.max(...w.map(p => p[1]))], dd = C.annoH(8);
    const dim = (k, a, b, p) => { const x = C.add(C.newEnt('dim', { k, a, b, p, layer: 'OLCU' })); delete x.sp; };
    dim('h', [bx[0], bx[3], 0], [bx[2], bx[3], 0], [0, bx[3] + dd * 2, 0]); dim('h', [wb[0], wb[3], 0], [wb[2], wb[3], 0], [0, bx[3] + dd, 0]); dim('h', [bx[0], bx[3], 0], [wb[0], wb[3], 0], [0, bx[3] + dd, 0]); dim('h', [wb[2], wb[3], 0], [bx[2], bx[3], 0], [0, bx[3] + dd, 0]);
    dim('v', [bx[0], bx[1], 0], [bx[0], bx[3], 0], [bx[0] - dd * 2, 0, 0]); dim('v', [wb[0], wb[1], 0], [wb[0], wb[3], 0], [bx[0] - dd, 0, 0]);
    const tb = C.add(C.newEnt('baslik', { p: [(bx[0] + bx[2]) / 2, bx[1] - dd * 2.5, 0], ay: bx[1], dmm: 18, s: 'ÇATI PLANI', hp: 5, layer: 'YAZI' })); delete tb.sp;
    // detay çağrı daireleri
    const rid = G.lines.ridge.length ? G.lines.ridge[0] : null, eave = G.lines.eave[0];
    const call = (p, nm) => { const c = C.add(C.newEnt('circle', { c: [p[0], p[1], 0], r: 0.6, layer: 'YAZI', lt: 'DASHED' })); delete c.sp; const t2 = C.add(C.newEnt('text', { p: [p[0] + 0.5, p[1] + 0.5, 0], h: C.annoH(3), s: `"${nm}"`, rot: 0, al: 'L', layer: 'YAZI' })); delete t2.sp; };
    if (eave) call([eave[0][0], eave[0][1]], 'A'); if (rid) call([(rid[0][0] + rid[1][0]) / 2, (rid[0][1] + rid[1][1]) / 2], 'B');
    // kesitler: A-A (mahyaya dik), B-B (mahya boyunca) — model yeniden üretilebilir
    const c0 = rid ? [(rid[0][0] + rid[1][0]) / 2, (rid[0][1] + rid[1][1]) / 2] : [(bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2];
    let ud = rid ? M.norm([rid[1][0] - rid[0][0], rid[1][1] - rid[0][1], 0]) : [1, 0, 0]; if (Math.abs(ud[0]) < Math.abs(ud[1])) { /* mahya düşey */ } const un = [-ud[1], ud[0]], R = Math.max(bx[2] - bx[0], bx[3] - bx[1]) / 2 + 1.5;
    const fx = p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`, cA = [c0[0] + ud[0] * 0.3, c0[1] + ud[1] * 0.3];
    const a1 = [cA[0] - un[0] * R, cA[1] - un[1] * R], a2 = [cA[0] + un[0] * R, cA[1] + un[1] * R], aV = [cA[0] + ud[0] * 2, cA[1] + ud[1] * 2];
    const b1 = [c0[0] - ud[0] * R - un[0] * 0.25, c0[1] - ud[1] * R - un[1] * 0.25], b2 = [c0[0] + ud[0] * R - un[0] * 0.25, c0[1] + ud[1] * R - un[1] * 0.25], bV = [c0[0] + un[0] * 2, c0[1] + un[1] * 2];
    const pA = [bx[2] + 4, (bx[1] + bx[3]) / 2], pB = [bx[0], bx[1] - 9], pD = [bx[0], bx[1] - 17];
    const p0 = await I.pt('Detay çizimlerinin (DETAY-A / DETAY-B) yeri (Enter = otomatik, planın altına)'); const PD = p0 && typeof p0 !== 'string' ? [p0[0], p0[1]] : pD;
    drawDetails(e, PD); const gvS = C._gvCur; C._gvCur = gv0;
    C.changed(); C.log('Çatı paftası: plan başlığı, ölçüler, detay çağrıları ve DETAY-A / DETAY-B çizildi; A-A ve B-B kesitleri üretiliyor…');
    setTimeout(async () => { const g0 = C._gvCur; C._gvCur = gvS; try { await C.cmd.script(`KESITAL AKS=H ${fx(a1)} ${fx(a2)} ${fx(aV)} 3 A ${fx(pA)}`); await C.cmd.script(`KESITAL AKS=H ${fx(b1)} ${fx(b2)} ${fx(bV)} 2 B ${fx(pB)}`); } catch (err) { console.warn(err); } finally { C._gvCur = g0; } }, 30);
  });
})(window.C);

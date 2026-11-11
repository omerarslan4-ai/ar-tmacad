/* ArıtmaCAD — 3B DÜZENLEME (AutoCAD 3DROTATE / 3DMIRROR / 3DSCALE / 3DARRAY / STRETCH gibi)
   DONDUR3B: seçim → taban noktası → eksen halkası (kırmızı X, yeşil Y, mavi Z; ya da iki nokta) → açı (açıölçer: 15° yakalama, Shift serbest, ya da yazın)
   AYNA3B: düzlem XY / YZ / ZX / 3 nokta · OLCEKLE3B: Z dahil düzgün ölçek · DIZI3B: satır × sütun × kat, ya da eksen etrafında kutupsal
   ESNETME (STRETCH): kesişen pencere içindeki köşeler taşınır (çizgi, çoklu çizgi, perde / döşeme köşeleri, 3B ağ, katı profili), tamamen içeridekiler bütün taşınır.
   3B görünümde DONDUR / AYNA / OLCEKLE / DIZI komutları otomatik bu 3B sürümleri kullanır.
   Dönüşüm: X3 = { m: 3×3, t } (p' = m·p + t). Düzlemsel (yalnız Z etrafında) dönüşümler her elemana uygulanır; X / Y etrafında döndürme
   ekipman (3B blok), katı, kutu, silindir, 3B ağ, çizgi, çoklu çizgi, süpürme ve gruplarda yapılır; perde / döşeme / kolon gibi düşey yapı elemanları yalnız Z etrafında döner. */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, RAD = Math.PI / 180, { L } = C.prim;
  const in3d = () => C.viewName && C.viewName() === '3d';
  /* ---------- matris yardımcıları ---------- */
  const I3 = () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const mm = (A, B) => A.map((r, i) => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  const mv = (A, v) => [A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * (v[2] || 0), A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * (v[2] || 0), A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * (v[2] || 0)];
  const det = A => A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  const rotAxis = (n, a) => { const [x, y, z] = M.norm(n), c = Math.cos(a), s = Math.sin(a), k = 1 - c; return [[c + x * x * k, x * y * k - z * s, x * z * k + y * s], [y * x * k + z * s, c + y * y * k, y * z * k - x * s], [z * x * k - y * s, z * y * k + x * s, c + z * z * k]]; };
  const flat = A => A.flat(), unflat = a => [a.slice(0, 3), a.slice(3, 6), a.slice(6, 9)];
  const planar = m => Math.abs(m[0][2]) < 1e-9 && Math.abs(m[1][2]) < 1e-9 && Math.abs(m[2][0]) < 1e-9 && Math.abs(m[2][1]) < 1e-9 && m[2][2] > 0;
  /* X3 — makeX ile aynı arayüz (p, v, s, mir) + m, t */
  const X3 = (m, t) => { const d = det(m); return { m, t, p: q => M.add(mv(m, M.p3(q)), t), v: q => mv(m, q), s: Math.cbrt(Math.abs(d)), mir: d < 0, planar: planar(m) }; };
  C.X3 = X3;
  C.x3Rot = (b, n, a) => { const m = rotAxis(n, a), B = M.p3(b); return X3(m, M.sub(B, mv(m, B))); };
  C.x3Mirror = (b, n) => { const u = M.norm(n), m = [0, 1, 2].map(i => [0, 1, 2].map(j => (i === j ? 1 : 0) - 2 * u[i] * u[j])), B = M.p3(b); return X3(m, M.sub(B, mv(m, B))); };
  C.x3Scale = (b, s) => { const m = [[s, 0, 0], [0, s, 0], [0, 0, s]], B = M.p3(b); return X3(m, M.sub(B, mv(m, B))); };
  C.x3Move = d => X3(I3(), M.p3(d));

  /* ---------- 3B blok (ekipman): tam yönelim matrisi e.R3 ---------- */
  const B0 = T.blk;
  const blkMat = e => { if (e.R3) return unflat(e.R3); const r = (e.rot || 0) * RAD, c = Math.cos(r), s = Math.sin(r), sx = e.sx || 1, sy = e.sy || e.sx || 1, sz = Math.abs(e.sx || 1); return [[sx * c, -sy * s, 0], [sx * s, sy * c, 0], [0, 0, sz]]; };
  const hull2 = P => { const p = P.map(q => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p; const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
  if (B0) {
    const X0 = B0.X, prims0 = B0.prims, mesh0 = B0.mesh, xf0 = B0.xf;
    B0.X = e => { if (!e.R3) return X0(e); const R = unflat(e.R3), p = M.p3(e.p); return C.makeX(q => [p[0] + R[0][0] * q[0] + R[0][1] * q[1], p[1] + R[1][0] * q[0] + R[1][1] * q[1]], [R[0][0], R[1][0], R[0][1], R[1][1]], p[2] || 0); };
    B0.mesh = e => {
      if (!e.R3) return mesh0(e); const def = (C.doc.blocks || {})[e.ref]; if (!def || !def.mesh3d || e.view === 'kesit') return null;
      const R = unflat(e.R3), p = M.p3(e.p), mir = det(R) < 0;
      return [{ t: 'tri', v: def.mesh3d.v.map(q => M.add(p, mv(R, q))), f: mir ? def.mesh3d.f.map(f => [f[0], f[2], f[1]]) : def.mesh3d.f, fc: def.mesh3d.fc }];
    };
    B0.prims = e => {
      if (!e.R3 || planar(unflat(e.R3))) return prims0(e);
      const ms = B0.mesh(e); if (!ms || !ms[0]) return prims0(e);
      const h = hull2(ms[0].v); return h.length >= 3 ? [C.prim.P(h.map(q => [q[0], q[1], 0]), true)] : prims0(e);
    };
    B0.xf = (e, X) => {
      if (X.m) { e.R3 = flat(mm(X.m, blkMat(e))); e.p = X.p(e.p); }
      else if (e.R3) { const a = X.v([1, 0, 0]), b = X.v([0, 1, 0]), Lm = [[a[0], b[0], 0], [a[1], b[1], 0], [0, 0, X.s || 1]]; e.R3 = flat(mm(Lm, unflat(e.R3))); e.p = X.p(e.p); }
      else return xf0(e, X);
      const R = unflat(e.R3); e.rot = Math.atan2(R[1][0], R[0][0]) / RAD; const sc = Math.hypot(R[0][0], R[1][0], R[2][0]); e.sx = sc; e.sy = det(R) < 0 ? -sc : sc;
    };
  }

  /* ---------- elemana 3B dönüşüm uygula ---------- */
  const NONPLANAR = new Set(['blk', 'kati', 'poly3', 'pmesh', 'face', 'line', 'point', 'grup3', 'sweep', 'pline', 'box', 'cyl', 'circle', 'arc', 'ellipse']);
  const toKati = e => { // kutu / silindir → katı (X / Y etrafında dönebilsin)
    if (e.type === 'box') { const fr = C.frame ? C.frame(e.o, e.rot) : { ux: [Math.cos((e.rot || 0) * RAD), Math.sin((e.rot || 0) * RAD), 0] }; const k = C.newKati(M.p3(e.o), { ux: fr.ux, n: [0, 0, 1] }, [[0, 0], [e.sx, 0], [e.sx, e.sy], [0, e.sy]], e.sz, { layer: e.layer, color: e.color, lt: e.lt, lw: e.lw }); return k; }
    if (e.type === 'cyl') return C.newKati(M.p3(e.c), { ux: [1, 0, 0], n: [0, 0, 1] }, { r: e.r }, e.h, { layer: e.layer, color: e.color, lt: e.lt, lw: e.lw });
    return null;
  };
  const toPline = e => { const pts = []; for (const pr of C.prims(e)) for (const [a, b] of C.primSegs(pr)) { if (!pts.length) pts.push(M.p3(a)); pts.push(M.p3(b)); } return pts.length > 1 ? C.newEnt('pline', { pts, closed: e.type === 'circle' || (e.type === 'ellipse' && !e.a0 && !e.a1), layer: e.layer, color: e.color, lt: e.lt, lw: e.lw }) : null; };
  /* list içindeki elemanlara uygula; değiştirilen / yeniden üretilen eleman listesi ve atlananlar döner */
  C.apply3 = (list, X, opts = {}) => {
    const out = [], skip = new Map(), rep = [];
    for (const e0 of list) {
      let e = opts.copy ? C.clone(e0) : e0;
      const fn = T[e.type] && T[e.type].xf;
      if (!fn) { skip.set(e.type, (skip.get(e.type) || 0) + 1); continue; }
      if (X.planar && !(opts.scaleZ && !NONPLANAR.has(e.type))) { C.xform(e, X); }
      else if (NONPLANAR.has(e.type)) {
        if (e.type === 'box' || e.type === 'cyl') { const k = toKati(e); if (!k) { skip.set(e.type, 1); continue; } if (!opts.copy) rep.push([e0, k]); e = k; }
        else if ((e.type === 'circle' || e.type === 'arc' || e.type === 'ellipse')) { const p = toPline(e); if (!p) continue; if (!opts.copy) rep.push([e0, p]); e = p; }
        if (e.type === 'pline') { e.pts = e.pts.map(q => X.p(M.p3(q))); if (e.bul) e.bul = null; delete e._c; }
        else if (e.type === 'poly3' || e.type === 'pmesh') { e.v = e.v.map(q => X.p(q)); if (X.mir && e.faces) e.faces = e.faces.map(f => f.slice().reverse()); if (X.mir && e.type === 'pmesh') e.f = e.f.map(f => f.slice().reverse()); delete e._c; }
        else if (e.type === 'grup3') { for (const q of e.parts) { const r = C.apply3([q], X); void r; } delete e._c; }
        else C.xform(e, X);
      } else { skip.set((T[e.type] && T[e.type].label) || e.type, (skip.get((T[e.type] && T[e.type].label) || e.type) || 0) + 1); continue; }
      out.push(e);
    }
    for (const [a, b] of rep) { const i = C.doc.ents.indexOf(a); if (i >= 0) { b.id = a.id; C.doc.ents[i] = b; } }
    if (opts.copy) for (const e of out) C.add(e);
    if (skip.size) C.warn(`X / Y ekseni etrafında dönmeyen elemanlar atlandı: ${[...skip].map(([k, n]) => `${k} (${n})`).join(', ')} — düşey yapı elemanları (perde, döşeme, kolon, merdiven …) yalnız Z etrafında döner.`);
    return out;
  };

  /* ---------- önizleme: seçimin kenarlarını dönüştürerek çiz ---------- */
  const edgesOf = sel => { const out = []; for (const e of sel.slice(0, 200)) { let t = null; try { t = C.entTris(e); } catch (er) { } if (t && t.edges && t.edges.length) { for (const ab of t.edges) { out.push(ab); if (out.length > 6000) return out; } }
      else if (t && t.pos && t.pos.length) { // kenarı olmayan ağ (ekipman): yönlendirilmiş sınır kutusu tel çerçevesi
        const P = t.pos; let b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; for (let i = 0; i < P.length; i += 3) { b[0] = Math.min(b[0], P[i]); b[1] = Math.min(b[1], P[i + 1]); b[2] = Math.min(b[2], P[i + 2]); b[3] = Math.max(b[3], P[i]); b[4] = Math.max(b[4], P[i + 1]); b[5] = Math.max(b[5], P[i + 2]); }
        const c = [[b[0], b[1], b[2]], [b[3], b[1], b[2]], [b[3], b[4], b[2]], [b[0], b[4], b[2]], [b[0], b[1], b[5]], [b[3], b[1], b[5]], [b[3], b[4], b[5]], [b[0], b[4], b[5]]];
        for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) out.push([c[i], c[j]]);
        const step = Math.max(1, Math.floor(P.length / 9 / 400)); for (let i = 0; i + 8 < P.length; i += 9 * step) { out.push([[P[i], P[i + 1], P[i + 2]], [P[i + 3], P[i + 4], P[i + 5]]]); }
      } else for (const pr of C.prims(e)) for (const ab of C.primSegs(pr)) { out.push([M.p3(ab[0]), M.p3(ab[1])]); if (out.length > 6000) return out; } } return out; };
  const ghost = (edges, X) => edges.map(([a, b]) => L(X.p(a), X.p(b)));
  const bboxCenter = sel => { let b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; for (const e of sel) { let t = null; try { t = C.entTris(e); } catch (er) { } const P = t && t.pos && t.pos.length ? t.pos : null; if (P) for (let i = 0; i < P.length; i += 3) { b[0] = Math.min(b[0], P[i]); b[1] = Math.min(b[1], P[i + 1]); b[2] = Math.min(b[2], P[i + 2]); b[3] = Math.max(b[3], P[i]); b[4] = Math.max(b[4], P[i + 1]); b[5] = Math.max(b[5], P[i + 2]); } else { const bb = C.bbox(e); b[0] = Math.min(b[0], bb[0]); b[1] = Math.min(b[1], bb[1]); b[3] = Math.max(b[3], bb[2]); b[4] = Math.max(b[4], bb[3]); b[2] = Math.min(b[2], 0); b[5] = Math.max(b[5], 0); } } return b[0] === Infinity ? [0, 0, 0] : [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2]; };

  /* ---------- döndürme gizmosu (3B görünüm üst katmanı) ---------- */
  const AX = { X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1] }, REF = { X: [0, 1, 0], Y: [0, 0, 1], Z: [1, 0, 0] }, COL = { X: '#ff5b5b', Y: '#4fdc5f', Z: '#5b8cff', U: '#ffb648' };
  let G = null; // { b, axis:'X'|'Y'|'Z'|'U', n, e1, e2, hov, ang, mode:'axis'|'angle' }
  const frameFor = (n, k) => { const e1 = k && REF[k] ? REF[k] : M.norm(Math.abs(n[2]) < 0.9 ? M.cross([0, 0, 1], n) : M.cross([1, 0, 0], n)); return { e1, e2: M.cross(n, e1) }; };
  const ringR = v => { const p0 = v.project(G.b); if (!p0) return v.dist * 0.12; const q = M.add(G.b, [v.dist * 0.01, 0, 0]), p1 = v.project(q); const pxPerM = p1 ? Math.max(1e-6, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / (v.dist * 0.01)) : 1; return 95 / pxPerM; };
  const ringPts = (v, n, e1, e2, R, a0 = 0, a1 = Math.PI * 2, N = 72) => { const o = []; for (let i = 0; i <= N; i++) { const a = a0 + (a1 - a0) * i / N; o.push(v.project(M.add(G.b, M.add(M.mul(e1, R * Math.cos(a)), M.mul(e2, R * Math.sin(a)))))); } return o; };
  const segD = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t); };
  const angleAt = (v, x, y) => { const r = v.ray(x, y); if (!r) return null; const [a, b] = r, d = M.sub(b, a), den = M.dot(d, G.n); if (Math.abs(den) < 1e-9) return null; const t = M.dot(M.sub(G.b, a), G.n) / den, q = M.add(a, M.mul(d, t)), w = M.sub(q, G.b); return Math.atan2(M.dot(w, G.e2), M.dot(w, G.e1)); };
  const snapA = (a, free) => { if (free) return a; const st = 15 * RAD; return Math.round(a / st) * st; };
  const fmtA = a => { let d = a / RAD; if (d > 180) d -= 360; if (d <= -180) d += 360; return (Math.round(d * 10) / 10).toLocaleString('tr-TR') + '°'; };
  let SR = null; // 3B esnetme penceresi (ekran): { x, y }
  let lastUp = null; { const cv = document.getElementById('cv3d'); if (cv) cv.addEventListener('pointerup', e => { const r = cv.getBoundingClientRect(); lastUp = [e.clientX - r.left, e.clientY - r.top]; }, true); }
  const drawRect = (v, g) => { if (!SR || !in3d()) return; const m = v.mouse || [SR.x, SR.y], x = Math.min(SR.x, m[0]), y = Math.min(SR.y, m[1]), w = Math.abs(m[0] - SR.x), h = Math.abs(m[1] - SR.y); g.save(); g.fillStyle = 'rgba(80,200,120,0.15)'; g.strokeStyle = '#4fdc5f'; g.setLineDash([5, 4]); g.lineWidth = 1.5; g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h); g.restore(); };
  const drawGizmo = (v, g) => {
    drawRect(v, g);
    if (!G || !in3d()) return; const R = ringR(v), mouse = v.mouse || [-1e4, -1e4], line = (pts, col, w, dash) => { g.save(); g.strokeStyle = col; g.lineWidth = w; if (dash) g.setLineDash(dash); g.beginPath(); let on = false; for (const p of pts) { if (!p) { on = false; continue; } if (on) g.lineTo(p[0], p[1]); else { g.moveTo(p[0], p[1]); on = true; } } g.stroke(); g.restore(); };
    const bp = v.project(G.b); if (bp) { g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(bp[0], bp[1], 4, 0, Math.PI * 2); g.fill(); }
    if (G.mode === 'axis') {
      let best = null, bd = 14;
      for (const k of ['X', 'Y', 'Z']) { const n = AX[k], f = frameFor(n, k), pts = ringPts(v, n, f.e1, f.e2, R); G['_p' + k] = pts; for (let i = 1; i < pts.length; i++) if (pts[i] && pts[i - 1]) { const d = segD(mouse, pts[i - 1], pts[i]); if (d < bd) { bd = d; best = k; } } }
      G.hov = best;
      for (const k of ['X', 'Y', 'Z']) line(G['_p' + k], COL[k], G.hov === k ? 4 : 2);
      // eksen okları
      for (const k of ['X', 'Y', 'Z']) { const tip = v.project(M.add(G.b, M.mul(AX[k], R * 0.55))); if (bp && tip) { line([bp, tip], COL[k], 1.5); g.fillStyle = COL[k]; g.font = 'bold 12px system-ui'; g.fillText(k, tip[0] + 3, tip[1] - 3); } }
      if (G.hov) { g.font = '12px system-ui'; g.fillStyle = '#fff'; g.fillText(`${G.hov} ekseni etrafında döndür — tıklayın`, mouse[0] + 14, mouse[1] - 10); }
      return;
    }
    // açı modu: açıölçer
    const col = COL[G.axis] || COL.U, n = G.n, e1 = G.e1, e2 = G.e2;
    line(ringPts(v, n, e1, e2, R), col, 2);
    for (let d = 0; d < 360; d += 15) { const a = d * RAD, big = d % 45 === 0, r0 = R * (big ? 0.88 : 0.94), r1 = R * (big ? 1.12 : 1.05); const p0 = v.project(M.add(G.b, M.add(M.mul(e1, r0 * Math.cos(a)), M.mul(e2, r0 * Math.sin(a))))), p1 = v.project(M.add(G.b, M.add(M.mul(e1, r1 * Math.cos(a)), M.mul(e2, r1 * Math.sin(a))))); line([p0, p1], col, big ? 2 : 1);
      if (big) { const pl = v.project(M.add(G.b, M.add(M.mul(e1, R * 1.25 * Math.cos(a)), M.mul(e2, R * 1.25 * Math.sin(a))))); if (pl) { g.font = '11px system-ui'; g.fillStyle = '#cfd6df'; g.textAlign = 'center'; g.fillText((d > 180 ? d - 360 : d) + '°', pl[0], pl[1] + 4); g.textAlign = 'left'; } } }
    const ref = v.project(M.add(G.b, M.mul(e1, R * 1.15))); if (bp && ref) line([bp, ref], '#ffffff', 1.5, [6, 4]);
    const raw = angleAt(v, mouse[0], mouse[1]); if (raw != null) G.ang = snapA(raw, v.shift);
    const a = G.ang || 0, wedge = ringPts(v, n, e1, e2, R * 0.8, 0, a, Math.max(4, Math.ceil(Math.abs(a) / RAD / 4)));
    if (bp && wedge.every(Boolean)) { g.save(); g.fillStyle = col + '40'; g.beginPath(); g.moveTo(bp[0], bp[1]); for (const p of wedge) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); g.restore(); }
    const cur = v.project(M.add(G.b, M.add(M.mul(e1, R * Math.cos(a)), M.mul(e2, R * Math.sin(a))))); if (bp && cur) line([bp, cur], '#ffd34d', 2.5);
    if (cur) { g.font = 'bold 14px system-ui'; g.fillStyle = '#ffd34d'; g.fillText(fmtA(a), cur[0] + 10, cur[1] - 8); g.font = '11px system-ui'; g.fillStyle = '#aab3bf'; g.fillText(v.shift ? 'serbest (Shift)' : '15° yakalama · Shift: serbest · açı yazabilirsiniz', cur[0] + 10, cur[1] + 8); }
  };
  if (C.h3) { const d0 = C.h3.draw; C.h3.draw = (v, g) => { try { if (d0) d0(v, g); } finally { drawGizmo(v, g); } }; }
  else C.h3 = { drag: null, draw: drawGizmo, down: () => false, move: () => { }, up: () => { }, hover: () => false };
  const redraw = () => { const v = C.views && C.views.v3; if (v) v.dirty = true; };

  /* ---------- DONDUR3B ---------- */
  const rotate3d = async (I, opts = {}) => {
    const s = await I.sel(); if (!s.length) return;
    let b = await E.ask('pt', 'Taban noktası (Enter = seçimin ortası)', {}); if (b === undefined) return; if (!Array.isArray(b)) b = bboxCenter(s); b = M.p3(b);
    const edges = edgesOf(s); let ax = null, n = null;
    try {
      G = { b, mode: 'axis' }; redraw();
      if (in3d()) {
        for (; ;) {
          const r = await E.ask('pt', 'Dönme ekseni: halkaya tıklayın (kırmızı X, yeşil Y, mavi Z) ya da X / Y / Z / İki nokta', { kw: [['Z', 'Z ekseni'], ['X', 'X ekseni'], ['Y', 'Y ekseni'], ['I', 'İki nokta']] });
          if (r == null) return; if (typeof r === 'string') { ax = C.up(r); break; } if (G.hov) { ax = G.hov; break; }
          C.warn('Bir halkanın üzerine tıklayın ya da X / Y / Z yazın.');
        }
      } else { const r = await I.kw('Dönme ekseni', [['Z', 'Z ekseni'], ['X', 'X ekseni'], ['Y', 'Y ekseni'], ['I', 'İki nokta']], opts.axis || 'Z'); if (!r) return; ax = r; }
      if (ax === 'I') { G = null; const p1 = await I.pt('Eksenin 1. noktası'); if (!p1 || typeof p1 === 'string') return; E.base = p1; const p2 = await I.pt('Eksenin 2. noktası'); E.base = null; if (!p2 || typeof p2 === 'string') return; b = M.p3(p1); n = M.norm(M.sub(M.p3(p2), b)); if (!(M.len(n) > 0.5)) return; ax = 'U'; }
      else n = AX[ax] || AX.Z;
      const f = frameFor(n, ax); G = { b, mode: 'angle', axis: ax, n, e1: f.e1, e2: f.e2, ang: 0 }; redraw();
      E.preview = () => ghost(edges, C.x3Rot(b, n, G ? G.ang || 0 : 0));
      let a;
      if (in3d()) { const r = await E.ask('pt', `Dönme açısı (°) — ${ax === 'U' ? 'seçilen eksen' : ax + ' ekseni'} · imleçle seçin (15° yakalama, Shift serbest) ya da yazın`, { num: true }); if (r == null || typeof r === 'string') return; a = typeof r === 'number' ? r * RAD : (G.ang || 0); }
      else { const r = await I.num(`Dönme açısı (°) — ${ax === 'U' ? 'seçilen eksen' : ax + ' ekseni'}`, 90); if (r == null) return; a = r * RAD; }
      E.preview = null;
      const X = C.x3Rot(b, n, a), done = C.apply3(s, X, { copy: !!opts.copy }); C.changed();
      C.log(`${done.length} nesne ${ax === 'U' ? 'seçilen eksen' : ax + ' ekseni'} etrafında ${fmtA(a)} döndürüldü (taban ${b.map(x => M.fmt(x, 2)).join(', ')}).`);
    } finally { G = null; E.preview = null; redraw(); }
  };
  C.addCommand(['DONDUR3B', '3DROTATE', 'ROTATE3D', '3BDONDUR', '3DR'], '3B döndür (AutoCAD 3DROTATE gibi): seçim, taban noktası (Enter = seçimin ortası), eksen halkası (kırmızı X, yeşil Y, mavi Z; İ = iki noktalı eksen), açı (açıölçer, 15° yakalama, Shift serbest, ya da yazın).', I => rotate3d(I));

  /* ---------- AYNA3B ---------- */
  C.addCommand(['AYNA3B', '3DMIRROR', 'MIRROR3D', '3BAYNA'], '3B aynala: düzlem XY / YZ / ZX (bir noktadan) ya da 3 nokta; kaynak silinsin mi?', async (I) => {
    const s = await I.sel(); if (!s.length) return; const edges = edgesOf(s);
    const k = await I.kw('Ayna düzlemi', [['YZ', 'YZ (X yönünde aynala)'], ['ZX', 'ZX (Y yönünde aynala)'], ['XY', 'XY (Z yönünde, alt-üst)'], ['3', '3 nokta']], 'YZ'); if (!k) return;
    let X;
    if (k === '3') { const a = await I.pt('Düzlemin 1. noktası'); if (!a || typeof a === 'string') return; E.base = a; const b = await I.pt('2. nokta'); if (!b || typeof b === 'string') return; E.base = b; const c = await I.pt('3. nokta'); E.base = null; if (!c || typeof c === 'string') return; const nn = M.cross(M.sub(M.p3(b), M.p3(a)), M.sub(M.p3(c), M.p3(a))); if (M.len(nn) < 1e-9) { C.warn('Üç nokta aynı doğru üzerinde.'); return; } X = C.x3Mirror(a, nn); }
    else { const n = { YZ: [1, 0, 0], ZX: [0, 1, 0], XY: [0, 0, 1] }[k]; E.preview = q => ghost(edges, C.x3Mirror(q, n)); const p = await I.pt('Düzlemin geçtiği nokta'); E.preview = null; if (!p || typeof p === 'string') return; X = C.x3Mirror(p, n); }
    const del = await I.kw('Kaynak nesneler silinsin mi?', [['H', 'Hayır'], ['E', 'Evet']], 'H');
    const done = C.apply3(s, X, { copy: del !== 'E' }); C.changed(); C.log(`${done.length} nesne ${k === '3' ? '3 noktalı düzleme' : k + ' düzlemine'} göre aynalandı${del !== 'E' ? ' (kopya)' : ''}.`);
  });

  /* ---------- OLCEKLE3B ---------- */
  C.addCommand(['OLCEKLE3B', '3DSCALE', 'SCALE3D', '3BOLCEKLE'], '3B ölçekle: Z dahil düzgün ölçek (ekipman, katı, 3B ağ, çizgi). Yapı elemanlarında plan ölçeklenir.', async (I) => {
    const s = await I.sel(); if (!s.length) return; const edges = edgesOf(s);
    let b = await E.ask('pt', 'Taban noktası (Enter = seçimin ortası)', {}); if (b === undefined) return; if (!Array.isArray(b)) b = bboxCenter(s); b = M.p3(b);
    E.base = b; E.preview = q => { const d = M.dist(b, M.p3(q)); return d > 1e-9 ? ghost(edges, C.x3Scale(b, d)) : []; };
    const v = await E.ask('pt', 'Ölçek çarpanı (sayı ya da nokta: tabana uzaklık)', { num: true }); E.preview = null; E.base = null; if (v == null || typeof v === 'string') return;
    const f = typeof v === 'number' ? v : M.dist(b, M.p3(v)); if (!(f > 0)) return;
    const done = C.apply3(s, C.x3Scale(b, f), { scaleZ: true }); C.changed(); C.log(`${done.length} nesne ${M.fmt(f, 4)} kat ölçeklendi (Z dahil).`);
  });

  /* ---------- DIZI3B ---------- */
  C.addCommand(['DIZI3B', '3DARRAY', 'ARRAY3D', '3BDIZI'], '3B dizi: D = dikdörtgen (satır × sütun × kat, aralıklar), K = kutupsal (adet, toplam açı, eksen).', async (I) => {
    const s = await I.sel(); if (!s.length) return;
    const k = await I.kw('Dizi tipi', [['D', 'Dikdörtgen (satır / sütun / kat)'], ['K', 'Kutupsal (eksen etrafında)']], 'D'); if (!k) return; let n = 0;
    if (k === 'D') {
      const nr = Math.max(1, Math.round(await I.num('Satır sayısı (Y)', 1) || 1)), nc = Math.max(1, Math.round(await I.num('Sütun sayısı (X)', 2) || 1)), nl = Math.max(1, Math.round(await I.num('Kat sayısı (Z)', 1) || 1));
      const dy = nr > 1 ? await I.num('Satır aralığı (m)', 1) : 0, dx = nc > 1 ? await I.num('Sütun aralığı (m)', 1) : 0, dz = nl > 1 ? await I.num('Kat aralığı (m)', 3) : 0;
      for (let l = 0; l < nl; l++) for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) { if (!l && !r && !c) continue; n += C.apply3(s, C.x3Move([c * dx, r * dy, l * dz]), { copy: true }).length; }
    } else {
      const cnt = Math.max(2, Math.round(await I.num('Toplam adet (kaynak dahil)', 4) || 4)), tot = await I.num('Doldurulacak açı (°, 360 = tam tur)', 360);
      const ax = await I.kw('Eksen', [['Z', 'Z ekseni'], ['X', 'X ekseni'], ['Y', 'Y ekseni'], ['I', 'İki nokta']], 'Z'); if (!ax) return;
      let b, nv; if (ax === 'I') { const p1 = await I.pt('Eksenin 1. noktası'); if (!p1 || typeof p1 === 'string') return; E.base = p1; const p2 = await I.pt('2. nokta'); E.base = null; if (!p2 || typeof p2 === 'string') return; b = M.p3(p1); nv = M.norm(M.sub(M.p3(p2), b)); } else { const p = await I.pt('Dizi merkezi (eksen noktası)'); if (!p || typeof p === 'string') return; b = M.p3(p); nv = AX[ax]; }
      const step = (Math.abs(tot - 360) < 1e-6 ? 360 / cnt : tot / (cnt - 1)) * RAD;
      for (let i = 1; i < cnt; i++) n += C.apply3(s, C.x3Rot(b, nv, step * i), { copy: true }).length;
    }
    C.changed(); C.log(`3B dizi: ${n} kopya oluşturuldu.`);
  });

  /* ---------- ESNETME (STRETCH): kesişen pencere içindeki köşeler ---------- */
  const inWin = (q, w) => q[0] >= w[0] - 1e-9 && q[0] <= w[2] + 1e-9 && q[1] >= w[1] - 1e-9 && q[1] <= w[3] + 1e-9;
  const stretchEnt = (e, w, d) => {
    const mv3 = q => { const p = M.p3(q); return inWin(p, w) ? M.add(p, d) : p; }, mv2 = q => inWin(q, w) ? [q[0] + d[0], q[1] + d[1]].concat(q.length > 2 ? [q[2]] : []) : q;
    let ch = false; const tick = (a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) ch = true; return b; };
    if (e.type === 'line') { e.a = tick(e.a, mv3(e.a)); e.b = tick(e.b, mv3(e.b)); }
    else if (e.type === 'poly3' || e.type === 'pmesh') e.v = tick(e.v, e.v.map(mv3));
    else if (e.type === 'face') e.pts = tick(e.pts, e.pts.map(mv3));
    else if (e.type === 'kati' && Array.isArray(e.prof) && Math.abs(Math.abs(e.uz[2]) - 1) < 1e-6) { // düşey katı: profil köşeleri
      const o = M.p3(e.o), ux = e.ux, uy = M.cross(e.uz, ux), W = p => [o[0] + ux[0] * p[0] + uy[0] * p[1], o[1] + ux[1] * p[0] + uy[1] * p[1]], Lc = q => { const dx = q[0] - o[0], dy = q[1] - o[1]; return [dx * ux[0] + dy * ux[1], dx * uy[0] + dy * uy[1]]; };
      const all = e.prof.every(p => inWin(W(p), w)); if (all) { e.o = M.add(o, d); ch = true; } else e.prof = tick(e.prof, e.prof.map(p => { const q = W(p); return inWin(q, w) ? Lc([q[0] + d[0], q[1] + d[1]]) : p; }));
    }
    else if (Array.isArray(e.pts) && e.pts.length) { const all = e.pts.every(q => inWin(q, w)); if (all && T[e.type].xf) { C.xform(e, C.xMove(d)); ch = true; } else e.pts = tick(e.pts, e.pts.map(q => e.type === 'pline' && q.length > 2 ? mv3(q) : mv2(q))); }
    else { // tek noktalı nesneler: nokta pencere içindeyse bütün taşı
      let bb = null; try { bb = C.bbox(e); } catch (er) { } const c = bb ? [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2] : null;
      if (c && inWin(c, w) && T[e.type] && T[e.type].xf) { C.xform(e, C.xMove(d)); ch = true; }
    }
    if (ch) delete e._c; return ch;
  };
  /* ---------- 3B ESNETME: ekran penceresi içindeki köşeler (ekipman bloğu, 3B ağ, çizgi, yüz, çoklu çizgi); tamamı içerideki diğer elemanlar bütün taşınır ---------- */
  const inv3 = A => { const d = det(A); if (Math.abs(d) < 1e-15) return null; const m = A; return [[(m[1][1] * m[2][2] - m[1][2] * m[2][1]) / d, (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / d, (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / d], [(m[1][2] * m[2][0] - m[1][0] * m[2][2]) / d, (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / d, (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / d], [(m[1][0] * m[2][1] - m[1][1] * m[2][0]) / d, (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / d, (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / d]]; };
  const vertsOf = e => {
    if (e.type === 'blk') { const def = (C.doc.blocks || {})[e.ref]; if (!def || !def.mesh3d) return null; const ms = T.blk.mesh(e); if (!ms || !ms[0]) return null; return { w: ms[0].v.map(M.p3), f: ms[0].f, kind: 'blk' }; }
    if (e.type === 'line') return { w: [M.p3(e.a), M.p3(e.b)], f: [], kind: 'line' };
    if (e.type === 'poly3' || e.type === 'pmesh') return { w: e.v.map(M.p3), f: e.type === 'pmesh' ? e.f.map(f => f.map(Math.abs)) : (e.faces || []), kind: e.type };
    if (e.type === 'face') return { w: e.pts.map(M.p3), f: [[0, 1, 2]], kind: 'face' };
    if (e.type === 'pline') return { w: e.pts.map(M.p3), f: [], kind: 'pline' };
    return null;
  };
  const setVerts = (e, V, W) => {
    if (V.kind === 'blk') {
      let def = C.doc.blocks[e.ref]; const users = C.doc.ents.filter(x => x.type === 'blk' && x.ref === e.ref).length;
      if (users > 1 || !def._esnek) { const nd = JSON.parse(JSON.stringify(def)); nd.id = def.id + '_E' + Date.now().toString(36).slice(-4); nd.name = def.name + ' (esnetilmiş)'; nd._esnek = true; C.doc.blocks[nd.id] = nd; e.ref = nd.id; def = nd; }
      const R = blkMat(e), Ri = inv3(R), p = M.p3(e.p); if (!Ri) return false;
      def.mesh3d.v = W.map(w => { const l = mv(Ri, M.sub(w, p)); return [Math.round(l[0] * 1e5) / 1e5, Math.round(l[1] * 1e5) / 1e5, Math.round(l[2] * 1e5) / 1e5]; });
      const z0 = Math.min(...def.mesh3d.v.map(q => q[2])); void z0;
      const h = hull2(def.mesh3d.v); if (h.length >= 3) def.ents = [{ type: 'pline', layer: '0', color: 0, lt: 'BYBLOCK', lw: -2, pts: h.map(q => [q[0], q[1], 0]), closed: true }];
      if (C.defBox) def.bb = C.defBox(def); let bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; for (const q of def.mesh3d.v) for (let i = 0; i < 3; i++) { bb[i] = Math.min(bb[i], q[i]); bb[i + 3] = Math.max(bb[i + 3], q[i]); } def.dims = [0, 1, 2].map(i => Math.round((bb[i + 3] - bb[i]) * 1e4) / 1e4);
    }
    else if (V.kind === 'line') { e.a = W[0]; e.b = W[1]; }
    else if (V.kind === 'poly3' || V.kind === 'pmesh') e.v = W;
    else if (V.kind === 'face' || V.kind === 'pline') e.pts = W;
    delete e._c; return true;
  };
  const stretch3d = async (I) => {
    const v = C.views && C.views.v3; if (!v) return;
    try {
      const a = await I.pt('3B esnetme — kesişen pencerenin 1. köşesi (ekranda)'); if (!a || typeof a === 'string') return;
      const m0 = (lastUp || v.project(M.p3(a)) || v.mouse || [0, 0]).slice(); lastUp = null; SR = { x: m0[0], y: m0[1] }; v.dirty = true;
      const b = await I.pt('Karşı köşe'); const m1 = (lastUp || (b && typeof b !== 'string' && v.project(M.p3(b))) || v.mouse || [0, 0]).slice(); lastUp = null; SR = null; v.dirty = true; if (!b || typeof b === 'string') return;
      const rx0 = Math.min(m0[0], m1[0]), rx1 = Math.max(m0[0], m1[0]), ry0 = Math.min(m0[1], m1[1]), ry1 = Math.max(m0[1], m1[1]);
      if (rx1 - rx0 < 3 || ry1 - ry0 < 3) { C.warn('Pencere çok küçük.'); return; }
      const inR = w => { const q = v.project(w); return q && q[0] >= rx0 && q[0] <= rx1 && q[1] >= ry0 && q[1] <= ry1; };
      const jobs = []; // { e, V, idx (seçili köşeler) } ya da { e, whole }
      for (const e of C.doc.ents) {
        if (!C.layer(e.layer).on || C.layer(e.layer).lock || e.type === 'sheet') continue;
        const V = vertsOf(e);
        if (V) { const idx = []; V.w.forEach((w, i) => { if (inR(w)) idx.push(i); }); if (!idx.length) continue; if (idx.length === V.w.length) jobs.push({ e, whole: true }); else jobs.push({ e, V, idx }); continue; }
        let t = null; try { t = C.entTris(e); } catch (er) { } if (!t || !t.pos || !t.pos.length) continue;
        let all = true, any = false; for (let i = 0; i < t.pos.length; i += 9) { const w = [t.pos[i], t.pos[i + 1], t.pos[i + 2]]; if (inR(w)) any = true; else { all = false; } if (!all && any) break; }
        if (all && any) jobs.push({ e, whole: true });
      }
      if (!jobs.length) { C.warn('Pencereye giren köşe yok.'); return; }
      const nP = jobs.filter(j => !j.whole).reduce((s2, j) => s2 + j.idx.length, 0);
      C.log(`Pencerede: ${jobs.filter(j => j.whole).length} nesne bütün taşınacak, ${jobs.filter(j => !j.whole).length} nesnede ${nP} köşe esnetilecek.`);
      const p0 = await I.pt('Taban noktası'); if (!p0 || typeof p0 === 'string') return;
      const prevEdges = []; for (const j of jobs) { if (j.whole) { for (const ab of edgesOf([j.e]).slice(0, 1500)) prevEdges.push({ a: ab[0], b: ab[1], ma: true, mb: true }); continue; } const S = new Set(j.idx); let n = 0; for (const f of j.V.f) { if (!f.some(i => S.has(i))) continue; for (let k = 0; k < f.length; k++) { const ia = f[k], ib = f[(k + 1) % f.length]; prevEdges.push({ a: j.V.w[ia], b: j.V.w[ib], ma: S.has(ia), mb: S.has(ib) }); } if (++n > 1500) break; } if (!j.V.f.length) for (let k = 0; k + 1 < j.V.w.length; k++) prevEdges.push({ a: j.V.w[k], b: j.V.w[k + 1], ma: S.has(k), mb: S.has(k + 1) }); }
      E.base = p0; E.preview = q => { const d = M.sub(M.p3(q), M.p3(p0)); return prevEdges.slice(0, 8000).map(s2 => L(s2.ma ? M.add(s2.a, d) : s2.a, s2.mb ? M.add(s2.b, d) : s2.b)); };
      const p1 = await I.pt('İkinci nokta (ya da mesafe yazın)'); E.preview = null; E.base = null; if (!p1 || typeof p1 === 'string') return;
      const d = M.sub(M.p3(p1), M.p3(p0)); let n = 0;
      for (const j of jobs) { if (j.whole) { C.apply3([j.e], C.x3Move(d)); n++; continue; } const W = j.V.w.map((w, i) => (j.idx.includes(i) ? M.add(w, d) : w)); if (setVerts(j.e, j.V, W)) n++; }
      C.changed(); C.log(`${n} nesne esnetildi: ${M.fmt(M.len(d), 3)} m (${d.map(x => M.fmt(x, 3)).join(', ')}).${jobs.some(j => j.V && j.V.kind === 'blk') ? ' Esnetilen ekipman bu çizimde ayrı bir blok tanımı oldu ("… (esnetilmiş)"); kütüphanedeki asıl model değişmedi.' : ''}`);
    } finally { SR = null; E.preview = null; E.base = null; if (v) v.dirty = true; }
  };
  C.addCommand(['STRETCH3D', '3BESNET', '3DSTRETCH', 'ESNET3B'], '3B esnetme: 3B görünümde ekranda kesişen pencere (iki köşe), taban ve ikinci nokta; penceredeki köşeler taşınır (ekipman bloğu, 3B ağ, çizgi, yüz, çoklu çizgi), tamamı içerideki diğer nesneler bütün taşınır. Ör. pompanın kılavuz borusunu uzatmak.', async (I) => { if (!in3d()) { C.warn('3B esnetme 3B görünümde çalışır; planda STRETCH kullanın.'); return; } await stretch3d(I); });
  C.addCommand(['STRETCH', 'S', 'ESNETME', 'GER', 'ESNET2B'], 'Esnet (AutoCAD STRETCH): kesişen pencerenin iki köşesi, taban noktası, ikinci nokta. Penceredeki köşeler taşınır (çizgi, çoklu çizgi, perde / döşeme köşeleri, 3B ağ, düşey katı profili); tamamen içeridekiler bütün taşınır. 3B görünümde Z yönünde de taşır. Yüz esnetmek için: ESNET.', async (I) => {
    if (in3d()) return stretch3d(I);
    const a = await I.pt('Kesişen pencere 1. köşe'); if (!a || typeof a === 'string') return;
    E.base = a; E.rubber = false; E.preview = c => [C.prim.P([a, [c[0], a[1], a[2] || 0], c, [a[0], c[1], a[2] || 0]], true, { lt: 'DASHED', color: 3 })];
    const b = await I.pt('Karşı köşe'); E.preview = null; E.base = null; E.rubber = true; if (!b || typeof b === 'string') return;
    const w = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
    const cand = C.doc.ents.filter(e => { if (!C.layer(e.layer).on || C.layer(e.layer).lock) return false; let bb = null; try { bb = C.bbox(e); } catch (er) { } return bb && !(bb[2] < w[0] || bb[0] > w[2] || bb[3] < w[1] || bb[1] > w[3]); });
    if (!cand.length) { C.warn('Pencereye giren nesne yok.'); return; }
    const p0 = await I.pt('Taban noktası'); if (!p0 || typeof p0 === 'string') return;
    E.base = p0; E.preview = q => { const d = M.sub(M.p3(q), M.p3(p0)); return cand.slice(0, 200).flatMap(e => { const c = JSON.parse(JSON.stringify(C.cleanEnt ? C.cleanEnt(e) : e)); stretchEnt(c, w, d); try { return C.prims(c); } catch (er) { return []; } }); };
    const p1 = await I.pt('İkinci nokta'); E.preview = null; E.base = null; if (!p1 || typeof p1 === 'string') return;
    const d = M.sub(M.p3(p1), M.p3(p0)); let n = 0; for (const e of cand) if (stretchEnt(e, w, d)) n++;
    C.changed(); C.log(`${n} nesne esnetildi (${M.fmt(M.len(d), 3)} m).`);
  });

  /* ---------- 3B görünümde 2B komutlar → 3B sürümleri ---------- */
  const wrap = (name, fn3) => { const c = C.cmds[name]; if (!c) return; const f0 = c.fn; C.addCommand(c.names, c.help + ' — 3B görünümde 3B sürümü çalışır.', async (I, Cx) => (in3d() ? fn3(I, Cx) : f0(I, Cx)), c.opts); };
  wrap('ROTATE', I => rotate3d(I));
  wrap('MIRROR', I => C.cmds.AYNA3B.fn(I));
  wrap('SCALE', I => C.cmds.OLCEKLE3B.fn(I));
  wrap('ARRAY', I => C.cmds.DIZI3B.fn(I));

  /* ---------- şerit: 3B Modelleme › Düzenle ---------- */
  const rib = () => {
    if (!C.ribbon || !C.ribbon.tabs) return; const t = C.ribbon.tabs.find(x => x[0] === '3B Modelleme'); if (!t) return; const p = t[1].find(x => x[0] === 'Düzenle'); if (!p || p[1].some(x => x.cmd === 'DONDUR3B')) return;
    const it = (cmd, tt, i, big) => ({ cmd, t: tt, i, big: !!big });
    p[1] = [it('DONDUR3B', '3B döndür', 'rot', true), it('MOVE', 'Taşı', 'move'), it('COPY', 'Kopyala', 'copy'), it('AYNA3B', '3B ayna', 'mirror'), it('OLCEKLE3B', '3B ölçekle', 'scale'), it('DIZI3B', '3B dizi', 'array'), it('STRETCH', 'Esnet (pencere)', 'scale'), it('ESNET', 'Yüz esnet', 'scale'), it('ERASE', 'Sil', 'erase'), it('MATCHPROP', 'Özellik eşleştir', 'prop')];
    C.ribbon.render();
  };
  setTimeout(rib, 0);
})(window.C);

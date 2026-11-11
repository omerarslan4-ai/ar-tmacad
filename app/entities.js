/* ArıtmaCAD — varlık tipleri: 2B ilkel çıktı (prims), 3B gövde (mesh), yakalama noktaları, dönüşüm */
(function (C) {
  'use strict';
  const M = C.M;
  const T = C.T = {}; // tip kayıt defteri
  const RAD = Math.PI / 180;

  /* ---------- yardımcılar ---------- */
  const L = (a, b, o) => Object.assign({ k: 'L', a: M.p3(a), b: M.p3(b) }, o);
  const P = (pts, c, o) => Object.assign({ k: 'P', pts: pts.map(M.p3), c: !!c }, o);
  const CI = (c, r, o) => Object.assign({ k: 'C', c: M.p3(c), r }, o);
  const A = (c, r, a0, a1, o) => Object.assign({ k: 'A', c: M.p3(c), r, a0, a1 }, o);
  const TX = (p, h, s, rot, al, o) => Object.assign({ k: 'T', p: M.p3(p), h, s: String(s), rot: rot || 0, al: al || 'L' }, o);
  const S = (pts, o) => Object.assign({ k: 'S', pts: pts.map(M.p3) }, o);
  C.prim = { L, P, CI, A, TX, S };

  const frame = (o, rotDeg) => {
    const r = (rotDeg || 0) * RAD, ux = [Math.cos(r), Math.sin(r), 0], uy = [-Math.sin(r), Math.cos(r), 0];
    return { o: M.p3(o), ux, uy, at: (x, y, z) => [o[0] + ux[0] * x + uy[0] * y, o[1] + ux[1] * x + uy[1] * y, (z != null ? z : (o[2] || 0))] };
  };
  C.frame = frame;
  const rectPts = (f, x, y, w, h, z) => [f.at(x, y, z), f.at(x + w, y, z), f.at(x + w, y + h, z), f.at(x, y + h, z)];

  /* 3B gövde tanımları: ext = profil ekstrüzyonu */
  const ext = (o, ux, uz, prof, h, extra) => Object.assign({ t: 'ext', o: M.p3(o), ux: M.norm(ux), uz: M.norm(uz), prof, h }, extra);
  const boxM = (f, x, y, z, w, d, h, extra) => ext(f.at(x, y, z), f.ux, [0, 0, 1], [[0, 0], [w, 0], [w, d], [0, d]], h, extra);
  const cylZ = (c, r, z, h, extra) => ext([c[0], c[1], z], [1, 0, 0], [0, 0, 1], { r }, h, extra);
  const cylSeg = (p1, p2, r, extra) => { const d = M.sub(p2, p1); const l = M.len(d); if (l < 1e-9) return null; const uz = M.norm(d); return ext(p1, M.perp(uz), uz, { r }, l, extra); };
  C.meshDef = { ext, boxM, cylZ, cylSeg };

  /* dönüşüm yardımcıları: X = {p(pt), v(vec), s, mir} */
  const xAng = (X, deg) => { const v = X.v([Math.cos(deg * RAD), Math.sin(deg * RAD), 0]); return Math.atan2(v[1], v[0]) / RAD; };
  const readable = deg => { deg = ((deg % 360) + 360) % 360; if (deg > 90 && deg <= 270) deg -= 180; return deg; };

  const tH = mm => C.annoH(mm == null ? C.doc.set.textH : mm);

  /* ---------- LINE ---------- */
  T.line = {
    label: 'Çizgi',
    prims: e => [L(e.a, e.b)],
    xf: (e, X) => { e.a = X.p(e.a); e.b = X.p(e.b); },
    info: e => `uzunluk=${M.fmt(M.dist(e.a, e.b), 3)} açı=${M.fmt(M.deg(M.ang(e.a, e.b)), 1)}°`,
  };
  /* ---------- POLYLINE ---------- */
  const bulgePts = (a, b, bulge) => {
    const th = 4 * Math.atan(bulge), d = M.dist2(a, b);
    if (Math.abs(bulge) < 1e-9 || d < 1e-12) return [];
    const r = d / (2 * Math.sin(Math.abs(th) / 2));
    const mid = M.lerp(a, b, 0.5), ang = M.ang(a, b);
    const h = Math.sqrt(Math.max(0, r * r - (d / 2) ** 2)) * (Math.abs(th) > Math.PI ? -1 : 1);
    const cdir = ang + (bulge > 0 ? Math.PI / 2 : -Math.PI / 2);
    const c = [mid[0] + Math.cos(cdir) * h, mid[1] + Math.sin(cdir) * h];
    const a0 = Math.atan2(a[1] - c[1], a[0] - c[0]);
    const n = Math.max(4, Math.min(256, Math.ceil(Math.abs(th) / M.arcStep(r))));
    const out = [];
    for (let i = 1; i < n; i++) { const t = a0 + th * i / n; out.push([c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r, a[2] || 0]); }
    return out;
  };
  C.bulgePts = bulgePts;
  T.pline = {
    label: 'Çoklu çizgi',
    prims: e => {
      if (!e.bul || !e.bul.some(b => b)) return [P(e.pts, e.closed)];
      const out = [], n = e.pts.length;
      for (let i = 0; i < n; i++) {
        if (i === n - 1 && !e.closed) { out.push(e.pts[i]); break; }
        out.push(e.pts[i]);
        const b = e.bul[i] || 0;
        if (b) out.push(...bulgePts(e.pts[i], e.pts[(i + 1) % n], b));
      }
      return [P(out, e.closed, { verts: e.pts, bul: e.bul })];
    },
    xf: (e, X) => { e.pts = e.pts.map(X.p); if (X.mir && e.bul) e.bul = e.bul.map(b => -b); },
    info: e => { let l = 0; for (let i = 1; i < e.pts.length; i++) l += M.dist(e.pts[i - 1], e.pts[i]); if (e.closed) l += M.dist(e.pts[e.pts.length - 1], e.pts[0]); return `köşe=${e.pts.length} uzunluk=${M.fmt(l, 3)}${e.closed ? ' alan=' + M.fmt(Math.abs(M.polyArea(e.pts)), 3) + ' m²' : ''}`; },
  };
  /* ---------- CIRCLE / ARC ---------- */
  T.circle = {
    label: 'Daire',
    prims: e => [CI(e.c, e.r)],
    xf: (e, X) => { e.c = X.p(e.c); e.r *= X.s; },
    info: e => `merkez=${M.fmt(e.c[0])},${M.fmt(e.c[1])} r=${M.fmt(e.r, 3)}`,
  };
  T.arc = {
    label: 'Yay',
    prims: e => [A(e.c, e.r, e.a0 * RAD, e.a1 * RAD)],
    xf: (e, X) => {
      const p0 = X.p(M.polar(e.c, e.a0 * RAD, e.r)), p1 = X.p(M.polar(e.c, e.a1 * RAD, e.r));
      e.c = X.p(e.c); e.r *= X.s;
      let a0 = M.deg(M.ang(e.c, p0)), a1 = M.deg(M.ang(e.c, p1));
      if (X.mir) [a0, a1] = [a1, a0];
      e.a0 = a0; e.a1 = a1;
    },
    info: e => `r=${M.fmt(e.r, 3)} açılar=${M.fmt(e.a0, 1)}..${M.fmt(e.a1, 1)}`,
  };
  T.point = {
    label: 'Nokta',
    prims: e => [{ k: 'X', p: M.p3(e.p) }],
    xf: (e, X) => { e.p = X.p(e.p); },
  };
  T.solid = { // 2B dolu alan
    label: 'Dolgu',
    prims: e => [S(e.pts)],
    xf: (e, X) => { e.pts = e.pts.map(X.p); },
  };
  /* ---------- TEXT ---------- */
  T.text = {
    label: 'Yazı',
    prims: e => [TX(e.p, e.h, e.s, e.rot * RAD, e.al)],
    xf: (e, X) => { e.p = X.p(e.p); e.h *= X.s; let r = xAng(X, e.rot || 0); if (X.mir) r = readable(r); e.rot = r; },
    info: e => `"${e.s}" h=${M.fmt(e.h, 3)}`,
  };
  /* ---------- 3B yüz / ağ (içe aktarım) ---------- */
  T.face = {
    label: '3B yüz',
    prims: e => [P(e.pts, true)],
    mesh: e => [{ t: 'tri', v: e.pts.map(M.p3), f: e.pts.length === 4 && M.dist(e.pts[2], e.pts[3]) > 1e-9 ? [[0, 1, 2], [0, 2, 3]] : [[0, 1, 2]] }],
    xf: (e, X) => { e.pts = e.pts.map(X.p); },
  };
  T.pmesh = {
    label: 'Ağ',
    prims: e => {
      const seen = new Set(), out = [];
      for (const f of e.f) for (let i = 0; i < f.length; i++) {
        const a = Math.abs(f[i]), b = Math.abs(f[(i + 1) % f.length]); if (f[i] < 0) continue;
        const k = a < b ? a + '_' + b : b + '_' + a; if (seen.has(k)) continue; seen.add(k);
        out.push(L(e.v[a], e.v[b]));
        if (out.length > 4000) return out;
      }
      return out;
    },
    mesh: e => [{ t: 'tri', v: e.v, f: e.f.flatMap(f => { const g = f.map(Math.abs); return g.length === 4 ? [[g[0], g[1], g[2]], [g[0], g[2], g[3]]] : [g.slice(0, 3)]; }) }],
    xf: (e, X) => { e.v = e.v.map(X.p); },
    info: e => `köşe=${e.v.length} yüz=${e.f.length}`,
  };

  /* ---------- KUTU / SİLİNDİR ---------- */
  const xfFrameObj = (e, X, wy) => {
    const f = frame(e.o, e.rot);
    const o2 = X.mir ? X.p(f.at(0, wy)) : X.p(e.o);
    e.rot = xAng(X, e.rot || 0);
    e.o = [o2[0], o2[1], (o2[2] != null ? o2[2] : e.o[2])];
  };
  T.box = {
    label: 'Kutu',
    prims: e => { const f = frame(e.o, e.rot); return [P(rectPts(f, 0, 0, e.sx, e.sy), true)]; },
    mesh: e => [boxM(frame(e.o, e.rot), 0, 0, e.o[2] || 0, e.sx, e.sy, e.sz)],
    xf: (e, X) => { xfFrameObj(e, X, e.sy); e.sx *= X.s; e.sy *= X.s; e.sz *= X.s; },
    info: e => `${M.fmt(e.sx)}×${M.fmt(e.sy)}×${M.fmt(e.sz)} m`,
  };
  T.cyl = {
    label: 'Silindir',
    prims: e => [CI(e.c, e.r)],
    mesh: e => [cylZ(e.c, e.r, e.c[2] || 0, e.h)],
    xf: (e, X) => { e.c = X.p(e.c); e.r *= X.s; e.h *= X.s; },
    info: e => `r=${M.fmt(e.r)} h=${M.fmt(e.h)}`,
  };

  /* ---------- DUVAR (birleşimlerde gönye / T birleşimi) ---------- */
  const JT = 1e-3;
  const lineInt = (p, d, q, e) => { const den = d[0] * e[1] - d[1] * e[0]; if (Math.abs(den) < 1e-9) return null; const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den; return [p[0] + d[0] * t, p[1] + d[1] * t]; };
  const wdir = (from, to) => M.norm([to[0] - from[0], to[1] - from[1], 0]);
  const near = (p, q) => Math.abs(p[0] - q[0]) < JT && Math.abs(p[1] - q[1]) < JT;
  /* uç noktadaki birleşim: o uçtan duvarın içine bakan yön u, yarı kalınlık t -> {L, R} köşe noktaları ya da null */
  const wallEnd = (e, P, u, t, walls) => {
    const n = [-u[1], u[0]], Lp = [P[0] + n[0] * t, P[1] + n[1] * t], Rp = [P[0] - n[0] * t, P[1] - n[1] * t];
    for (const w of walls) {
      if (w === e) continue;
      let far = null; if (near(w.a, P)) far = w.b; else if (near(w.b, P)) far = w.a;
      if (far) { // L / düz birleşim: komşu duvar P'den dışarı uzanıyor
        const v = wdir(P, far), m = [-v[1], v[0]], t2 = w.t / 2;
        if (Math.abs(u[0] * v[1] - u[1] * v[0]) < 1e-6) return null; // aynı doğrultu
        // u içeri bakıyor; e'nin P'ye gelen yönü -u. -u ile ilerleyen duvarın sol kenarı = Rp tarafı
        const qL = [P[0] + m[0] * t2, P[1] + m[1] * t2], qR = [P[0] - m[0] * t2, P[1] - m[1] * t2];
        const iA = lineInt(Lp, u, qR, v), iB = lineInt(Rp, u, qL, v);
        if (!iA || !iB) return null;
        return { L: iA, R: iB, joined: true };
      }
      // T birleşimi: P komşu duvarın gövdesinde
      const d = M.segDist(P, w.a, w.b);
      if (d < w.t / 2 + JT) {
        const v = wdir(w.a, w.b), m = [-v[1], v[0]], side = Math.sign((P[0] + u[0] - w.a[0]) * m[0] + (P[1] + u[1] - w.a[1]) * m[1]) || 1;
        const face = [w.a[0] + m[0] * w.t / 2 * side, w.a[1] + m[1] * w.t / 2 * side];
        const iA = lineInt(Lp, u, face, v), iB = lineInt(Rp, u, face, v);
        if (!iA || !iB) return null;
        return { L: iA, R: iB, joined: true, tee: true };
      }
    }
    return null;
  };
  T.wall = {
    label: 'Duvar', ifc: 'IfcWall',
    corners: e => {
      const walls = (C.doc && C.doc.ents || []).filter(w => w.type === 'wall' && w.layer === e.layer && Math.abs((w.z || 0) - (e.z || 0)) < 0.5);
      const u = wdir(e.a, e.b), t = e.t / 2, n = [-u[1], u[0]];
      const ea = wallEnd(e, e.a, u, t, walls), eb = wallEnd(e, e.b, [-u[0], -u[1]], t, walls);
      const aL = ea ? ea.L : [e.a[0] + n[0] * t, e.a[1] + n[1] * t], aR = ea ? ea.R : [e.a[0] - n[0] * t, e.a[1] - n[1] * t];
      const bR = eb ? eb.L : [e.b[0] - n[0] * t, e.b[1] - n[1] * t], bL = eb ? eb.R : [e.b[0] + n[0] * t, e.b[1] + n[1] * t];
      return { aL, aR, bL, bR, ja: !!ea, jb: !!eb };
    },
    outline: e => { const c = T.wall.corners(e), z = e.z || 0; return [[c.aR[0], c.aR[1], z], [c.bR[0], c.bR[1], z], [c.bL[0], c.bL[1], z], [c.aL[0], c.aL[1], z]]; },
    prims: e => {
      const c = T.wall.corners(e), z = e.z || 0, q = p => [p[0], p[1], z];
      const out = [L(q(c.aR), q(c.bR)), L(q(c.aL), q(c.bL))];
      if (!c.ja) out.push(L(q(c.aR), q(c.aL)));
      if (!c.jb) out.push(L(q(c.bR), q(c.bL)));
      return out;
    },
    mesh: e => { const o = T.wall.outline(e); return [ext([0, 0, e.z || 0], [1, 0, 0], [0, 0, 1], o.map(p => [p[0], p[1]]), e.h)]; },
    snaps: e => { const o = T.wall.outline(e); return [{ p: M.p3(e.a), k: 'end' }, { p: M.p3(e.b), k: 'end' }, ...o.map(p => ({ p, k: 'end' }))]; },
    xf: (e, X) => { e.a = X.p(e.a); e.b = X.p(e.b); e.t *= X.s; e.h *= X.s; },
    info: e => `boy=${M.fmt(M.dist2(e.a, e.b))} kalınlık=${M.fmt(e.t)} yükseklik=${M.fmt(e.h)} taban kotu=${M.fmt(e.z || 0)}`,
  };
  /* ---------- DÖŞEME ---------- */
  T.slab = {
    label: 'Döşeme', ifc: 'IfcSlab',
    prims: e => [P(e.pts.map(p => [p[0], p[1], e.z || 0]), true)],
    mesh: e => [ext([0, 0, e.z || 0], [1, 0, 0], [0, 0, 1], e.pts.map(p => [p[0], p[1]]), e.t)],
    xf: (e, X) => { e.pts = e.pts.map(X.p); e.t *= X.s; },
    info: e => `alan=${M.fmt(Math.abs(M.polyArea(e.pts)))} m² kalınlık=${M.fmt(e.t)} alt kot=${M.fmt(e.z || 0)}`,
  };
  /* ---------- DİKDÖRTGEN HAVUZ / HAZNE ---------- */
  T.tank = {
    label: 'Dikdörtgen havuz', ifc: 'IfcTank',
    prims: e => {
      const f = frame(e.o, e.rot), z = e.zt;
      const out = [P(rectPts(f, 0, 0, e.L, e.W, z), true), P(rectPts(f, -e.tw, -e.tw, e.L + 2 * e.tw, e.W + 2 * e.tw, z), true, { lw: 50 })];
      if (e.label) { const lp = e.lp || [0.5, 0.5]; out.push(TX(f.at(e.L * lp[0], e.W * lp[1], z), tH(), e.label, (e.rot || 0) * RAD, 'M')); }
      return out;
    },
    mesh: e => {
      const f = frame(e.o, e.rot), zb = e.zt - e.H - e.tb, h = e.H + e.tb, tw = e.tw;
      const sk = e.skip || '';
      return [
        sk.includes('s') ? null : boxM(f, -tw, -tw, zb, e.L + 2 * tw, tw, h),
        sk.includes('n') ? null : boxM(f, -tw, e.W, zb, e.L + 2 * tw, tw, h),
        sk.includes('w') ? null : boxM(f, -tw, 0, zb, tw, e.W, h),
        sk.includes('e') ? null : boxM(f, e.L, 0, zb, tw, e.W, h),
        boxM(f, 0, 0, zb, e.L, e.W, e.tb),
      ].filter(Boolean);
    },
    xf: (e, X) => { xfFrameObj(e, X, e.W); for (const k of ['L', 'W', 'H', 'tw', 'tb']) e[k] *= X.s; },
    info: e => `iç ${M.fmt(e.L)}×${M.fmt(e.W)} m, derinlik ${M.fmt(e.H)} m, hacim ${M.fmt(e.L * e.W * e.H)} m³, üst kot ${M.fmt(e.zt)}`,
  };
  /* ---------- DAİRESEL HAVUZ ---------- */
  T.ctank = {
    label: 'Dairesel havuz', ifc: 'IfcTank',
    prims: e => {
      const out = [CI([e.c[0], e.c[1], e.zt], e.D / 2), CI([e.c[0], e.c[1], e.zt], e.D / 2 + e.tw, { lw: 50 })];
      out.push(L([e.c[0] - e.D * 0.55 - e.tw, e.c[1], e.zt], [e.c[0] + e.D * 0.55 + e.tw, e.c[1], e.zt], { lt: 'CENTER', lw: 13 }));
      out.push(L([e.c[0], e.c[1] - e.D * 0.55 - e.tw, e.zt], [e.c[0], e.c[1] + e.D * 0.55 + e.tw, e.zt], { lt: 'CENTER', lw: 13 }));
      if (e.label) out.push(TX([e.c[0], e.c[1] + e.D / 4], tH(), e.label, 0, 'M'));
      return out;
    },
    mesh: e => {
      const zb = e.zt - e.H - e.tb;
      return [cylZ(e.c, e.D / 2 + e.tw, zb, e.H + e.tb, { prof: { r: e.D / 2 + e.tw, ri: e.D / 2 }, ann: true }), cylZ(e.c, e.D / 2, zb, e.tb)].map(m => { if (m.ann) { m.prof = { r: e.D / 2 + e.tw, ri: e.D / 2 }; } return m; });
    },
    snaps: e => [{ p: e.c, k: 'cen' }],
    xf: (e, X) => { e.c = X.p(e.c); for (const k of ['D', 'H', 'tw', 'tb']) e[k] *= X.s; },
    info: e => `iç çap ${M.fmt(e.D)} m, derinlik ${M.fmt(e.H)} m, hacim ${M.fmt(Math.PI * e.D * e.D / 4 * e.H)} m³`,
  };
  /* ---------- BORU ---------- */
  T.pipe = {
    label: 'Boru', ifc: 'IfcPipeSegment',
    r: e => (e.od || e.dn) / 2000,
    prims: e => {
      const r = T.pipe.r(e), out = [];
      let best = null, bl = 0;
      for (let i = 1; i < e.pts.length; i++) {
        const a = M.p3(e.pts[i - 1]), b = M.p3(e.pts[i]), hl = M.dist2(a, b);
        if (hl < 1e-6) { out.push(CI(a, r)); continue; }
        const d = M.norm([b[0] - a[0], b[1] - a[1], 0]), n = [-d[1] * r, d[0] * r, 0];
        out.push(L(M.add(a, n), M.add(b, n)), L(M.sub(a, n), M.sub(b, n)));
        out.push(L(a, b, { lt: 'CENTER', lw: 13 }));
        if (hl > bl) { bl = hl; best = [a, b]; }
      }
      if (e.label && best) {
        let ang = M.ang(best[0], best[1]); let dg = readable(ang / RAD);
        const mid = M.lerp(best[0], best[1], 0.5), up = [-Math.sin(dg * RAD), Math.cos(dg * RAD), 0];
        out.push(TX(M.add(mid, M.mul(up, r + tH() * 0.6)), tH(), e.label, dg * RAD, 'C'));
      }
      return out;
    },
    mesh: e => { const r = T.pipe.r(e), out = []; for (let i = 1; i < e.pts.length; i++) { const m = cylSeg(M.p3(e.pts[i - 1]), M.p3(e.pts[i]), r, { seg: 14 }); if (m) out.push(m); } return out; },
    snaps: e => e.pts.map(p => ({ p: M.p3(p), k: 'end' })),
    xf: (e, X) => { e.pts = e.pts.map(X.p); },
    info: e => { let l = 0; for (let i = 1; i < e.pts.length; i++) l += M.dist(e.pts[i - 1], e.pts[i]); return `DN${e.dn} ${e.mat || ''} uzunluk=${M.fmt(l)} m`; },
  };
  /* ---------- POMPA ---------- */
  T.pump = {
    label: 'Pompa', ifc: 'IfcPump',
    prims: e => {
      const r = (e.d || 0.6) / 2, c = M.p3(e.p), out = [CI(c, r, { lw: 35 }), CI(c, r * 0.45)];
      const f = frame(c, e.rot);
      out.push(L(f.at(-r * 0.45, 0), f.at(r * 0.45, 0)), L(f.at(0, -r * 0.45), f.at(0, r * 0.45)));
      if (e.tag) out.push(TX([c[0] - r - tH() * 0.3, c[1] - tH() / 2, c[2]], tH(), e.tag, 0, 'R'));
      return out;
    },
    mesh: e => {
      const r = (e.d || 0.6) / 2, c = M.p3(e.p), h = e.h || 1.2, z = c[2];
      const f = frame([c[0], c[1], z], e.rot);
      return [cylZ(c, r, z + 0.15, h - 0.15, { seg: 18 }), boxM(f, -r * 1.1, -r * 1.1, z, r * 2.2, r * 2.2, 0.15), cylZ(c, r * 0.5, z + h, 0.25, { seg: 12 })];
    },
    snaps: e => [{ p: M.p3(e.p), k: 'cen' }],
    xf: (e, X) => { e.p = X.p(e.p); e.rot = xAng(X, e.rot || 0); e.d = (e.d || 0.6) * X.s; e.h = (e.h || 1.2) * X.s; },
    info: e => `${e.tag || ''} ${e.kind === 'kuru' ? 'kuru tip' : 'dalgıç'} Ø${M.fmt(e.d || 0.6)} taban kotu ${M.fmt(e.p[2] || 0)}${e.q ? ' Q=' + e.q + ' l/s' : ''}${e.hm ? ' H=' + e.hm + ' m' : ''}`,
  };
  /* ---------- VANA ---------- */
  T.valve = {
    label: 'Vana', ifc: 'IfcValve',
    size: e => { const d = e.dn / 1000; return { l: Math.max(0.2, d * 2.0), w: Math.max(0.12, d * 1.4) }; },
    prims: e => {
      const { l, w } = T.valve.size(e), c = M.p3(e.p), f = frame(c, e.rot);
      const t1 = [f.at(-l / 2, -w / 2), f.at(-l / 2, w / 2), f.at(0, 0)], t2 = [f.at(l / 2, -w / 2), f.at(l / 2, w / 2), f.at(0, 0)];
      const out = [P(t1, true, { lw: 35 }), P(t2, true, { lw: 35 })];
      if (e.kind === 'cekvalf') out.push(S(t2));
      else if (e.kind === 'kelebek') out.push(L(f.at(-l * 0.3, -w * 0.45), f.at(l * 0.3, w * 0.45)));
      else out.push(L(f.at(0, 0), f.at(0, w * 0.9)), L(f.at(-w * 0.3, w * 0.9), f.at(w * 0.3, w * 0.9)));
      if (e.tag) out.push(TX(f.at(0, -w / 2 - tH() * 1.4), tH() * 0.8, e.tag, 0, 'C'));
      return out;
    },
    mesh: e => {
      const { l, w } = T.valve.size(e), c = M.p3(e.p), r = e.dn / 2000, f = frame(c, e.rot);
      const a = f.at(-l / 2, 0, c[2]), b = f.at(l / 2, 0, c[2]);
      const out = [cylSeg(a, b, r * 1.25, { seg: 14 }), cylSeg(a, M.lerp(a, b, 0.08), r * 1.7, { seg: 14 }), cylSeg(M.lerp(a, b, 0.92), b, r * 1.7, { seg: 14 })];
      if (e.kind !== 'cekvalf') { out.push(cylZ(c, r * 0.25, c[2], w * 1.6 + r, { seg: 8 }), cylZ(c, w * 0.5, c[2] + w * 1.6 + r, 0.04, { seg: 16 })); }
      else out.push(boxM(frame(c, e.rot), -l * 0.25, -r * 1.1, c[2], l * 0.5, r * 2.2, r * 1.8));
      return out.filter(Boolean);
    },
    snaps: e => { const { l } = T.valve.size(e), f = frame(M.p3(e.p), e.rot); return [{ p: M.p3(e.p), k: 'cen' }, { p: f.at(-l / 2, 0), k: 'end' }, { p: f.at(l / 2, 0), k: 'end' }]; },
    xf: (e, X) => { e.p = X.p(e.p); e.rot = xAng(X, e.rot || 0); },
    info: e => `DN${e.dn} ${({ surgulu: 'sürgülü vana', cekvalf: 'çekvalf', kelebek: 'kelebek vana' })[e.kind] || e.kind}`,
  };
  /* ---------- KOT İŞARETİ ---------- */
  C.fmtKot = v => (Math.abs(v) < 0.0005 ? '±0.00' : (v > 0 ? '+' : '') + M.fmt(v, 2));
  T.kot = {
    label: 'Kot',
    prims: e => {
      if (e.pk) { // plan kotu: dörde bölünmüş daire (karşılıklı çeyrekler dolu) + değer
        const s = C.annoH(2.2), p = M.p3(e.p), r = s * 0.75, out = [CI(p, r), L([p[0] - r, p[1], p[2]], [p[0] + r, p[1], p[2]]), L([p[0], p[1] - r, p[2]], [p[0], p[1] + r, p[2]])];
        for (const q0 of [0, Math.PI]) { const pts = [p]; for (let i = 0; i <= 6; i++) { const t = q0 + Math.PI / 2 * i / 6; pts.push([p[0] + r * Math.cos(t), p[1] + r * Math.sin(t), p[2]]); } out.push(S(pts)); }
        const txt = C.fmtKot(e.v) + (e.txt ? ' ' + e.txt : '');
        out.push(TX([p[0] + r * 1.4, p[1] + r * 0.25, p[2]], C.annoH(C.doc.set.textH), txt, 0, 'L'));
        return out;
      }
      const s = C.annoH(2.5), p = M.p3(e.p), w = C.annoH(e.w || 16);
      const tri = [p, [p[0] - s * 0.6, p[1] + s, p[2]], [p[0] + s * 0.6, p[1] + s, p[2]]];
      const txt = (e.txt ? e.txt + ' ' : '') + C.fmtKot(e.v);
      const f = e.ters ? -1 : 1; // ters: yazı üçgenin solunda (kesitin sol tarafı)
      return [P(tri, true), S([p, f > 0 ? tri[1] : tri[2], [p[0], p[1] + s, p[2]]]), L([p[0] - f * s * 0.6, p[1] + s, p[2]], [p[0] + f * w, p[1] + s, p[2]]), TX([p[0] + f * s * 0.9, p[1] + s * 1.35, p[2]], C.annoH(C.doc.set.textH), txt, 0, f > 0 ? 'L' : 'R')];
    },
    xf: (e, X) => { e.p = X.p(e.p); },
    info: e => `kot ${C.fmtKot(e.v)} ${e.txt || ''}`,
  };
  /* ---------- ÖLÇÜ ---------- */
  const arrow = (tip, dir, size, tick) => {
    if (tick) { const d = M.norm(dir), n = [-d[1], d[0], 0]; const q = M.mul(M.add(d, n), size * 0.5); return L(M.sub(tip, q), M.add(tip, q), { lw: 35 }); }
    const d = M.norm(dir), n = [-d[1], d[0], 0], b = M.sub(tip, M.mul(d, size));
    return S([tip, M.add(b, M.mul(n, size / 6)), M.sub(b, M.mul(n, size / 6))]);
  };
  /* ölçü birimi: Tasarım (model) cm · Mimari / Statik paftaları cm · Mekanik paftaları mm · Genel paftalar m (OLCUBIRIM ile değiştirilir) */
  C.DIM_UNITS = { m: 1, cm: 100, mm: 1000 };
  C.dimUnitFor = grp => { const u = (C.doc && C.doc.set.dimUnits) || {}; if (grp == null || grp === '') return u.TASARIM || 'cm'; if (u[grp]) return u[grp]; const g = C.up ? C.up(String(grp)) : String(grp).toUpperCase(); return /MEKAN/.test(g) ? 'mm' : /GENEL|YERLE/.test(g) ? 'm' : 'cm'; };
  C.dimUnit = () => C._dimU || C.dimUnitFor(null);
  C.dimFmt = v => { const u = C.dimUnit(), f = C.DIM_UNITS[u] || 1, x = v * f; if (u === 'm') return M.fmt(x, C.doc.set.dimDec); if (u === 'mm') return String(Math.round(x)); const r = Math.round(x * 10) / 10; return Math.abs(r - Math.round(r)) < 1e-9 ? String(Math.round(r)) : String(r).replace('.', ','); };
  T.dim = {
    label: 'Ölçü',
    geom: e => {
      const set = C.doc.set, k = e.k || 'al';
      const a = M.p3(e.a), b = M.p3(e.b), p = M.p3(e.p || e.b);
      let u = k === 'h' ? [1, 0, 0] : k === 'v' ? [0, 1, 0] : M.norm(M.sub([b[0], b[1], 0], [a[0], a[1], 0]));
      if (k === 'rot') u = [Math.cos(e.ang * RAD), Math.sin(e.ang * RAD), 0];
      const n = [-u[1], u[0], 0];
      const a2 = M.add(a, M.mul(n, M.dot(M.sub(p, a), n))), b2 = M.add(b, M.mul(n, M.dot(M.sub(p, b), n)));
      const val = Math.abs(M.dot(M.sub(b, a), u));
      return { a, b, a2, b2, u, n, val, set };
    },
    prims: e => {
      if (e.k === 'r' || e.k === 'd') return T.dim.radPrims(e);
      const { a, b, a2, b2, u, val, set } = T.dim.geom(e);
      const S1 = C.annoH(1), ah = C.annoH(set.dimArrow), th = C.annoH(set.dimTextH);
      const out = [];
      const ext = (p, p2) => { const d = M.sub(p2, p); const l = M.len(d); if (l < 1e-9) return; const dn = M.mul(d, 1 / l); out.push(L(M.add(p, M.mul(dn, S1 * 0.8)), M.add(p2, M.mul(dn, S1 * 1.5)), { lw: 13 })); };
      ext(a, a2); ext(b, b2);
      out.push(L(a2, b2, { lw: 18 }));
      const dir = M.sub(b2, a2);
      const tooSmall = M.len(dir) < ah * 2.5;
      out.push(arrow(a2, tooSmall ? dir : M.mul(dir, -1), ah, set.dimTick), arrow(b2, tooSmall ? M.mul(dir, -1) : dir, ah, set.dimTick));
      let dg = readable(Math.atan2(u[1], u[0]) / RAD);
      const up = [-Math.sin(dg * RAD), Math.cos(dg * RAD), 0];
      const txt = e.txt != null && e.txt !== '' ? String(e.txt).replace('<>', C.dimFmt(val)) : C.dimFmt(val);
      out.push(TX(M.add(M.lerp(a2, b2, 0.5), M.mul(up, th * 0.4)), th, txt, dg * RAD, 'C'));
      return out;
    },
    radPrims: e => {
      const set = C.doc.set, ah = C.annoH(set.dimArrow), th = C.annoH(set.dimTextH);
      const c = M.p3(e.c), ang = (e.ang || 45) * RAD, p = M.polar(c, ang, e.r);
      const start = e.k === 'd' ? M.polar(c, ang + Math.PI, e.r) : c;
      const out = [L(start, M.polar(c, ang, e.r + th * 3), { lw: 18 }), arrow(p, [Math.cos(ang), Math.sin(ang), 0], ah, false)];
      if (e.k === 'd') out.push(arrow(start, [-Math.cos(ang), -Math.sin(ang), 0], ah, false));
      const txt = e.txt || (e.k === 'd' ? 'Ø' + C.dimFmt(e.r * 2) : 'R' + C.dimFmt(e.r));
      let dg = readable(ang / RAD);
      out.push(TX(M.add(M.polar(c, ang, e.r + th * 1.6), M.mul([-Math.sin(dg * RAD), Math.cos(dg * RAD), 0], th * 0.4)), th, txt, dg * RAD, 'C'));
      return out;
    },
    snaps: e => e.k === 'r' || e.k === 'd' ? [] : (() => { const g = T.dim.geom(e); return [{ p: g.a2, k: 'end' }, { p: g.b2, k: 'end' }]; })(),
    xf: (e, X) => {
      if (e.k === 'r' || e.k === 'd') { const p = X.p(M.polar(e.c, (e.ang || 45) * RAD, e.r)); e.c = X.p(e.c); e.r *= X.s; e.ang = M.deg(M.ang(e.c, p)); return; }
      e.a = X.p(e.a); e.b = X.p(e.b); if (e.p) e.p = X.p(e.p);
      if (e.k === 'h' || e.k === 'v') { const ang = xAng(X, e.k === 'h' ? 0 : 90); if (Math.abs(Math.sin(ang * RAD)) < 1e-6) e.k = 'h'; else if (Math.abs(Math.cos(ang * RAD)) < 1e-6) e.k = 'v'; else { e.k = 'rot'; e.ang = ang; } }
      else if (e.k === 'rot') e.ang = xAng(X, e.ang);
    },
    info: e => e.k === 'r' ? `yarıçap ${M.fmt(e.r)}` : e.k === 'd' ? `çap ${M.fmt(e.r * 2)}` : `ölçü ${M.fmt(T.dim.geom(e).val, 3)}`,
  };
  /* ---------- PAFTA ---------- */
  C.PAPER = { A0: [1189, 841], A1: [841, 594], A2: [594, 420], A3: [420, 297], A4: [297, 210] };
  T.sheet = {
    label: 'Pafta',
    size: e => { let [w, h] = e.size === 'OZEL' && e.pw > 0 && e.ph > 0 ? [e.pw, e.ph] : (C.PAPER[e.size] || C.PAPER.A1); if (e.orient === 'P') [w, h] = [h, w]; return { w, h }; },
    prims: e => {
      const { w, h } = T.sheet.size(e), k = e.scale / 1000, o = M.p3(e.o);
      const at = (x, y) => [o[0] + x * k, o[1] + y * k, 0];
      const R = (x, y, ww, hh, lw) => P([at(x, y), at(x + ww, y), at(x + ww, y + hh), at(x, y + hh)], true, { lw });
      const T2 = (x, y, hmm, s, al) => TX(at(x, y), hmm * k, s, 0, al || 'L');
      const mg = e.margin || {}, ml = mg.l != null ? mg.l : 20, mb = mg.b != null ? mg.b : 10, mr = mg.r != null ? mg.r : 10, mt = mg.t != null ? mg.t : 10;
      const out = [R(0, 0, w, h, 13), R(ml, mb, w - ml - mr, h - mb - mt, 70)];
      // antet
      const bw = 180, x0 = w - mr - bw, y0 = mb, f = e.f || {};
      out.push(R(x0, y0, bw, 66, 50));
      const rows = [[y0 + 52, 14], [y0 + 38, 14], [y0 + 28, 10], [y0 + 18, 10], [y0 + 8, 10], [y0, 8]];
      rows.forEach(([y]) => out.push(L(at(x0, y), at(x0 + bw, y), { lw: 25 })));
      for (const y of [y0 + 8, y0 + 18, y0 + 28]) { out.push(L(at(x0 + 60, y), at(x0 + 60, y + 10), { lw: 25 }), L(at(x0 + 120, y), at(x0 + 120, y + 10), { lw: 25 })); }
      const lab = (x, y, s) => out.push(T2(x + 1.5, y - 3, 1.8, s));
      // uzun proje / pafta adı antet kutusuna sığdırılır: önce iki satıra bölünür, gerekirse yazı küçültülür (genişlik ≈ 0.8·h·harf, büyük harf)
      const sigdir = (s, yUst, hmm) => { s = String(s); const wMax = bw - 8, gen = (t, hh) => t.length * hh * 0.8; if (gen(s, hmm) <= wMax) { out.push(T2(x0 + 4, yUst - 11, hmm, s)); return; }
        const ort = s.length / 2; let k = -1; for (let i = 0; i < s.length; i++) if (s[i] === ' ' && (k < 0 || Math.abs(i - ort) < Math.abs(k - ort))) k = i; const d = s.indexOf(' — '); if (d > 0 && Math.abs(d - ort) < s.length * 0.3) k = d;
        const a1 = k > 0 ? s.slice(0, k).trim() : s, a2 = k > 0 ? s.slice(k + 1).replace(/^— /, '').trim() : '', hh = Math.min(hmm * 0.8, 4.2, wMax / (Math.max(a1.length, a2.length) * 0.8));
        out.push(T2(x0 + 4, yUst - 7.6, hh, a1)); if (a2) out.push(T2(x0 + 4, yUst - 7.6 - hh * 1.35, hh, a2)); };
      lab(x0, y0 + 66, 'PROJE'); sigdir(f.proje || 'PROJE ADI', y0 + 66, 4.5);
      lab(x0, y0 + 52, 'PAFTA ADI'); sigdir(f.baslik || 'PAFTA BAŞLIĞI', y0 + 52, 4);
      lab(x0, y0 + 38, 'ÇİZEN'); lab(x0 + 60, y0 + 38, 'KONTROL'); lab(x0 + 120, y0 + 38, 'ONAY');
      out.push(T2(x0 + 3, y0 + 30, 2.5, f.cizen || ''), T2(x0 + 63, y0 + 30, 2.5, f.kontrol || ''), T2(x0 + 123, y0 + 30, 2.5, f.onay || ''));
      lab(x0, y0 + 28, 'ÖLÇEK'); lab(x0 + 60, y0 + 28, 'TARİH'); lab(x0 + 120, y0 + 28, 'PAFTA NO');
      out.push(T2(x0 + 3, y0 + 20, 3, e.scaleText || ('1/' + e.scale)), T2(x0 + 63, y0 + 20, 3, f.tarih || new Date().toLocaleDateString('tr-TR')), T2(x0 + 123, y0 + 20, 3.5, f.no || '01'));
      lab(x0, y0 + 18, 'REVİZYON'); lab(x0 + 60, y0 + 18, 'DOSYA'); lab(x0 + 120, y0 + 18, 'KAĞIT');
      out.push(T2(x0 + 3, y0 + 10, 2.5, f.rev || 'R0'), T2(x0 + 63, y0 + 10, 2.5, f.dosya || C.doc.set.name), T2(x0 + 123, y0 + 10, 2.5, (e.size === 'OZEL' ? `${e.pw}×${e.ph}` : e.size) + (e.orient === 'P' ? ' dikey' : ' yatay')));
      out.push(T2(x0 + 3, y0 + 2.5, 3, f.firma || 'FİRMA / KURUM'));
      return out;
    },
    xf: (e, X) => { e.o = X.p(e.o); e.scale *= X.s; },
    info: e => `${e.size} 1/${e.scale} "${(e.f || {}).baslik || ''}"`,
  };

  /* ---------- önbellekli erişim ---------- */
  C.prims = e => { const c = e._c || (e._c = {}); if (!c.p) { try { c.p = (T[e.type] ? T[e.type].prims(e) : []); if (e.aoff && C.annoShift) c.p = C.annoShift(e, c.p); } catch (err) { console.error(err, e); c.p = []; } } return c.p; };
  C.meshes = e => { const c = e._c || (e._c = {}); if (!c.m) { try { c.m = T[e.type] && T[e.type].mesh ? T[e.type].mesh(e).filter(Boolean) : null; } catch (err) { console.error(err); c.m = null; } } return c.m; };
  C.textW = pr => { const lines = pr.s.split('\n'); return Math.max(...lines.map(l => l.length)) * pr.h * 0.78; };
  C.primBox = (pr, bb) => {
    const ad = p => { if (p[0] < bb[0]) bb[0] = p[0]; if (p[1] < bb[1]) bb[1] = p[1]; if (p[0] > bb[2]) bb[2] = p[0]; if (p[1] > bb[3]) bb[3] = p[1]; };
    switch (pr.k) {
      case 'L': ad(pr.a); ad(pr.b); break;
      case 'P': case 'S': pr.pts.forEach(ad); break;
      case 'C': case 'A': ad([pr.c[0] - pr.r, pr.c[1] - pr.r]); ad([pr.c[0] + pr.r, pr.c[1] + pr.r]); break;
      case 'X': ad(pr.p); break;
      case 'T': { const w = C.textW(pr), n = pr.s.split('\n').length; for (const q of C.textCorners(pr, w, n)) ad(q); break; }
    }
  };
  C.textCorners = (pr, w, n) => {
    const h = pr.h, lines = n || 1;
    let x0 = pr.al === 'C' || pr.al === 'M' ? -w / 2 : pr.al === 'R' ? -w : 0;
    let y0 = pr.al === 'M' ? -h / 2 : 0;
    const top = y0 + h + (lines - 1) * h * 1.6, bot = y0 - (lines - 1) * h * 1.6 * 0 - (lines > 1 ? (lines - 1) * h * 1.6 : 0);
    const cs = Math.cos(pr.rot), sn = Math.sin(pr.rot);
    return [[x0, bot], [x0 + w, bot], [x0 + w, y0 + h], [x0, y0 + h]].map(([x, y]) => [pr.p[0] + x * cs - y * sn, pr.p[1] + x * sn + y * cs]);
  };
  C.bbox = e => {
    const c = e._c || (e._c = {});
    if (!c.b) { const bb = [Infinity, Infinity, -Infinity, -Infinity]; for (const pr of C.prims(e)) C.primBox(pr, bb); c.b = bb; }
    return c.b;
  };
  C.extents = (ents) => {
    const bb = [Infinity, Infinity, -Infinity, -Infinity];
    for (const e of ents || C.doc.ents) { if (!C.layer(e.layer).on || e.type === 'xline') continue; const b = C.bbox(e); if (b[0] === Infinity) continue; bb[0] = Math.min(bb[0], b[0]); bb[1] = Math.min(bb[1], b[1]); bb[2] = Math.max(bb[2], b[2]); bb[3] = Math.max(bb[3], b[3]); }
    return bb[0] === Infinity ? null : bb;
  };
  /* yakalama noktaları */
  C.snapPts = e => {
    const out = [];
    if (T[e.type] && T[e.type].snaps) out.push(...T[e.type].snaps(e));
    for (const pr of C.prims(e)) {
      if (pr.k === 'L') out.push({ p: pr.a, k: 'end' }, { p: pr.b, k: 'end' }, { p: M.lerp(pr.a, pr.b, 0.5), k: 'mid' });
      else if (pr.k === 'P') {
        const v = pr.verts || pr.pts; v.forEach(p => out.push({ p: M.p3(p), k: 'end' }));
        if (!pr.verts) for (let i = 1; i < v.length + (pr.c ? 1 : 0); i++) out.push({ p: M.lerp(v[i - 1], v[i % v.length], 0.5), k: 'mid' });
      } else if (pr.k === 'C') { out.push({ p: pr.c, k: 'cen' }); for (let q = 0; q < 4; q++) out.push({ p: M.polar(pr.c, q * Math.PI / 2, pr.r), k: 'qua' }); }
      else if (pr.k === 'A') out.push({ p: pr.c, k: 'cen' }, { p: M.polar(pr.c, pr.a0, pr.r), k: 'end' }, { p: M.polar(pr.c, pr.a1, pr.r), k: 'end' }, { p: M.polar(pr.c, (pr.a0 + M.normAng(pr.a1 - pr.a0) / 2), pr.r), k: 'mid' });
      else if (pr.k === 'X') out.push({ p: pr.p, k: 'end' });
      else if (pr.k === 'T') out.push({ p: pr.p, k: 'ins' });
    }
    return out;
  };
  /* bir noktanın varlığa uzaklığı (2B) */
  C.primDist = (pr, p) => {
    switch (pr.k) {
      case 'L': return M.segDist(p, pr.a, pr.b);
      case 'P': case 'S': { let d = Infinity; const v = pr.pts, n = v.length; for (let i = 1; i < n + (pr.c || pr.k === 'S' ? 1 : 0); i++) d = Math.min(d, M.segDist(p, v[i - 1], v[i % n])); return n === 1 ? M.dist2(p, v[0]) : d; }
      case 'C': return Math.abs(M.dist2(p, pr.c) - pr.r);
      case 'A': { const a = Math.atan2(p[1] - pr.c[1], p[0] - pr.c[0]); if (M.angIn(a, pr.a0, pr.a1)) return Math.abs(M.dist2(p, pr.c) - pr.r); return Math.min(M.dist2(p, M.polar(pr.c, pr.a0, pr.r)), M.dist2(p, M.polar(pr.c, pr.a1, pr.r))); }
      case 'X': return M.dist2(p, pr.p);
      case 'T': { const w = C.textW(pr); const q = C.textCorners(pr, w, pr.s.split('\n').length); const inside = pointInPoly(p, q); if (inside) return 0; let d = Infinity; for (let i = 0; i < 4; i++) d = Math.min(d, M.segDist(p, q[i], q[(i + 1) % 4])); return d; }
    }
    return Infinity;
  };
  const pointInPoly = (p, poly) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
  C.pointInPoly = pointInPoly;
  C.entDist = (e, p) => { let d = Infinity; for (const pr of C.prims(e)) d = Math.min(d, C.primDist(pr, p)); return d; };

  C.primSegs = pr => {
    if (pr.k === 'L') return [[pr.a, pr.b]];
    if (pr.k === 'P' || pr.k === 'S') { const o = []; const n = pr.pts.length; for (let i = 1; i < n + (pr.c || pr.k === 'S' ? 1 : 0); i++) o.push([pr.pts[i - 1], pr.pts[i % n]]); return o; }
    if (pr.k === 'C' || pr.k === 'A') {
      const a0 = pr.k === 'C' ? 0 : pr.a0, sw = pr.k === 'C' ? Math.PI * 2 : (M.normAng(pr.a1 - pr.a0) || Math.PI * 2), n = Math.max(8, Math.min(512, Math.ceil(sw / M.arcStep(pr.r)))), o = [];
      let prev = M.polar(pr.c, a0, pr.r); for (let i = 1; i <= n; i++) { const p = M.polar(pr.c, a0 + sw * i / n, pr.r); o.push([prev, p]); prev = p; } return o;
    }
    return [];
  };

  /* dönüşüm uygula */
  C.makeX = (fnPt, lin, dz) => { // lin: [a,b,c,d] doğrusal kısım
    const det = lin[0] * lin[3] - lin[1] * lin[2];
    return {
      p: q => { const r = fnPt(q); return [r[0], r[1], (q[2] || 0) + (dz || 0)]; },
      v: q => [lin[0] * q[0] + lin[2] * q[1], lin[1] * q[0] + lin[3] * q[1], q[2] || 0],
      s: Math.sqrt(Math.abs(det)), mir: det < 0,
    };
  };
  C.xMove = (d) => C.makeX(q => [q[0] + d[0], q[1] + d[1]], [1, 0, 0, 1], d[2] || 0);
  C.xRot = (c, ang) => { const cs = Math.cos(ang), sn = Math.sin(ang); return C.makeX(q => [c[0] + (q[0] - c[0]) * cs - (q[1] - c[1]) * sn, c[1] + (q[0] - c[0]) * sn + (q[1] - c[1]) * cs], [cs, sn, -sn, cs]); };
  C.xScale = (c, s) => C.makeX(q => [c[0] + (q[0] - c[0]) * s, c[1] + (q[1] - c[1]) * s], [s, 0, 0, s]);
  C.xMirror = (a, b) => {
    const d = M.norm(M.sub([b[0], b[1], 0], [a[0], a[1], 0])), cs = d[0] * d[0] - d[1] * d[1], sn = 2 * d[0] * d[1];
    return C.makeX(q => { const x = q[0] - a[0], y = q[1] - a[1]; return [a[0] + x * cs + y * sn, a[1] + x * sn - y * cs]; }, [cs, sn, sn, -cs]);
  };
  C.xform = (e, X) => { if (T[e.type] && T[e.type].xf) T[e.type].xf(e, X); delete e._c; };
  C.describe = e => `#${e.id} ${(T[e.type] || {}).label || e.type} [${e.layer}] ${T[e.type] && T[e.type].info ? T[e.type].info(e) : ''}`;

  /* patlat: bileşik nesneyi temel varlıklara ayır */
  C.explode = e => {
    const out = [];
    const base = { layer: e.layer, color: e.color, lt: e.lt, lw: e.lw };
    if (e.type === 'pline') {
      const pr = C.prims(e)[0], v = pr.pts;
      for (let i = 1; i < v.length + (e.closed ? 1 : 0); i++) out.push(Object.assign({ type: 'line', a: v[i - 1], b: v[i % v.length] }, base));
      return out;
    }
    for (const pr of C.prims(e)) {
      const b = Object.assign({}, base); if (pr.color != null) b.color = pr.color; if (pr.lt) b.lt = pr.lt; if (pr.lw != null) b.lw = pr.lw;
      if (pr.k === 'L') out.push(Object.assign({ type: 'line', a: pr.a, b: pr.b }, b));
      else if (pr.k === 'P') out.push(Object.assign({ type: 'pline', pts: pr.pts, closed: pr.c }, b));
      else if (pr.k === 'C') out.push(Object.assign({ type: 'circle', c: pr.c, r: pr.r }, b));
      else if (pr.k === 'A') out.push(Object.assign({ type: 'arc', c: pr.c, r: pr.r, a0: M.deg(pr.a0), a1: M.deg(pr.a1) }, b));
      else if (pr.k === 'T') out.push(Object.assign({ type: 'text', p: pr.p, h: pr.h, s: pr.s, rot: M.deg(pr.rot), al: pr.al, st: pr.st, wf: pr.wf, obl: pr.obl, mt: pr.mt, mw: pr.mw, ls: pr.ls }, b));
      else if (pr.k === 'S') out.push(Object.assign({ type: 'solid', pts: pr.pts }, b));
      else if (pr.k === 'X') out.push(Object.assign({ type: 'point', p: pr.p }, b));
    }
    return out;
  };
})(typeof window !== 'undefined' ? window.C : globalThis.C);

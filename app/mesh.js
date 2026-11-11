/* ArıtmaCAD — 3B gövde tanımlarını üçgen ağa çevirme (görüntü, STL, OBJ, DXF ağ) */
(function (C) {
  'use strict';
  const M = C.M;


  /* ---- sağlam üçgenleme (earcut yöntemi): delikli / hizalı köşeli çokgenlerde kulak kesme takılmaz ----
     halkalar: [dış, delik1, delik2, …] (yön önemsiz) -> {pts: tüm köşeler art arda, tris: [[i,j,k]] CCW} */
  const ecut = (function () {
    const area = (p, q, r) => (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    const equals = (a, b) => a.x === b.x && a.y === b.y;
    const sgn = v => (v > 0 ? 1 : v < 0 ? -1 : 0);
    const ins = (i, x, y, last) => { const p = { i, x, y, prev: null, next: null, steiner: false }; if (!last) { p.prev = p; p.next = p; } else { p.next = last.next; p.prev = last; last.next.prev = p; last.next = p; } return p; };
    const rem = p => { p.next.prev = p.prev; p.prev.next = p.next; };
    const list = (ring, off, cw) => { // cw: earcut'un "saat yönü" (işaretli alan > 0)
      let sum = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += (ring[j][0] - ring[i][0]) * (ring[i][1] + ring[j][1]);
      let last = null;
      if (cw === (sum > 0)) for (let i = 0; i < ring.length; i++) last = ins(off + i, ring[i][0], ring[i][1], last);
      else for (let i = ring.length - 1; i >= 0; i--) last = ins(off + i, ring[i][0], ring[i][1], last);
      if (last && equals(last, last.next)) { rem(last); last = last.next; }
      return last;
    };
    const filter = (start, end) => {
      if (!start) return start; if (!end) end = start;
      let p = start, again;
      do { again = false; if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) { rem(p); p = end = p.prev; if (p === p.next) break; again = true; } else p = p.next; } while (again || p !== end);
      return end;
    };
    const pit = (ax, ay, bx, by, cx, cy, px, py) => (cx - px) * (ay - py) >= (ax - px) * (cy - py) && (ax - px) * (by - py) >= (bx - px) * (ay - py) && (bx - px) * (cy - py) >= (cx - px) * (by - py);
    const isEar = ear => { const a = ear.prev, b = ear, c = ear.next; if (area(a, b, c) >= 0) return false; let p = c.next; while (p !== a) { if (!(p.x === a.x && p.y === a.y) && pit(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false; p = p.next; } return true; };
    const locIn = (a, b) => (area(a.prev, a, a.next) < 0 ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0);
    const onSeg = (p, q, r) => q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
    const isect = (p1, q1, p2, q2) => { const o1 = sgn(area(p1, q1, p2)), o2 = sgn(area(p1, q1, q2)), o3 = sgn(area(p2, q2, p1)), o4 = sgn(area(p2, q2, q1)); if (o1 !== o2 && o3 !== o4) return true; if (o1 === 0 && onSeg(p1, p2, q1)) return true; if (o2 === 0 && onSeg(p1, q2, q1)) return true; if (o3 === 0 && onSeg(p2, p1, q2)) return true; if (o4 === 0 && onSeg(p2, q1, q2)) return true; return false; };
    const isectPoly = (a, b) => { let p = a; do { if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i && isect(p, p.next, a, b)) return true; p = p.next; } while (p !== a); return false; };
    const midIn = (a, b) => { let p = a, inside = false; const px = (a.x + b.x) / 2, py = (a.y + b.y) / 2; do { if (((p.y > py) !== (p.next.y > py)) && p.next.y !== p.y && (px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x)) inside = !inside; p = p.next; } while (p !== a); return inside; };
    const validDiag = (a, b) => a.next.i !== b.i && a.prev.i !== b.i && !isectPoly(a, b) && ((locIn(a, b) && locIn(b, a) && midIn(a, b) && (area(a.prev, a, b.prev) || area(a, b.prev, b))) || (equals(a, b) && area(a.prev, a, a.next) > 0 && area(b.prev, b, b.next) > 0));
    const split = (a, b) => { const a2 = { i: a.i, x: a.x, y: a.y, prev: null, next: null, steiner: false }, b2 = { i: b.i, x: b.x, y: b.y, prev: null, next: null, steiner: false }, an = a.next, bp = b.prev; a.next = b; b.prev = a; a2.next = an; an.prev = a2; b2.next = a2; a2.prev = b2; bp.next = b2; b2.prev = bp; return b2; };
    const secIn = (m, p) => area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
    const bridgeOf = (hole, outer) => {
      let p = outer, m = null; const hx = hole.x, hy = hole.y; let qx = -Infinity;
      do { if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) { const x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y); if (x <= hx && x > qx) { qx = x; m = p.x < p.next.x ? p : p.next; if (x === hx) return m; } } p = p.next; } while (p !== outer);
      if (!m) return null;
      const stop = m, mx = m.x, my = m.y; let tanMin = Infinity; p = m;
      do { if (hx >= p.x && p.x >= mx && hx !== p.x && pit(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) { const tan = Math.abs(hy - p.y) / (hx - p.x); if (locIn(p, hole) && (tan < tanMin || (tan === tanMin && (p.x > m.x || (p.x === m.x && secIn(m, p)))))) { m = p; tanMin = tan; } } p = p.next; } while (p !== stop);
      return m;
    };
    const cure = (start, tris) => { let p = start; do { const a = p.prev, b = p.next.next; if (!equals(a, b) && isect(a, p, p.next, b) && locIn(a, b) && locIn(b, a)) { tris.push([a.i, p.i, b.i]); rem(p); rem(p.next); p = start = b; } p = p.next; } while (p !== start); return filter(p); };
    const run = (ear, tris, pass) => {
      if (!ear) return; let stop = ear;
      while (ear.prev !== ear.next) {
        const prev = ear.prev, next = ear.next;
        if (isEar(ear)) { tris.push([prev.i, ear.i, next.i]); rem(ear); ear = next.next; stop = next.next; continue; }
        ear = next;
        if (ear === stop) {
          if (!pass) run(filter(ear), tris, 1);
          else if (pass === 1) { ear = cure(filter(ear), tris); run(ear, tris, 2); }
          else if (pass === 2) { let a = ear; do { let b = a.next.next; while (b !== a.prev) { if (a.i !== b.i && validDiag(a, b)) { let c = split(a, b); a = filter(a, a.next); c = filter(c, c.next); run(a, tris, 0); run(c, tris, 0); return; } b = b.next; } a = a.next; } while (a !== ear); }
          break;
        }
      }
    };
    return function (rings) {
      const pts = []; const offs = []; for (const r of rings) { offs.push(pts.length); for (const q of r) pts.push(q); }
      let outer = list(rings[0], 0, true); if (!outer || outer.next === outer.prev) return { pts, tris: [] };
      const q = [];
      for (let k = 1; k < rings.length; k++) { const l = list(rings[k], offs[k], false); if (!l) continue; if (l === l.next) l.steiner = true; let p = l, lm = l; do { if (p.x < lm.x || (p.x === lm.x && p.y < lm.y)) lm = p; p = p.next; } while (p !== l); q.push(lm); }
      q.sort((a, b) => a.x - b.x || a.y - b.y);
      for (const h of q) { const br = bridgeOf(h, outer); if (!br) continue; const rev = split(br, h); filter(rev, rev.next); outer = filter(br, br.next); }
      const raw = []; run(outer, raw, 0);
      const tris = []; for (const t of raw) { const a = pts[t[0]], b = pts[t[1]], c = pts[t[2]], ar = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); if (ar > 1e-14) tris.push(t); else if (ar < -1e-14) tris.push([t[0], t[2], t[1]]); }
      return { pts, tris };
    };
  })();
  C.earcutHalkalar = ecut;

  C.earClip = function (pts) { // pts: [[x,y]] CCW -> üçgen indeksleri
    const n = pts.length; if (n < 3) return [];
    const idx = [...Array(n).keys()], out = [];
    const area = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const inside = (p, a, b, c) => area(a, b, p) >= 0 && area(b, c, p) >= 0 && area(c, a, p) >= 0;
    let guard = 0;
    while (idx.length > 3 && guard++ < 10000) {
      let ok = false;
      for (let i = 0; i < idx.length; i++) {
        const i0 = idx[(i + idx.length - 1) % idx.length], i1 = idx[i], i2 = idx[(i + 1) % idx.length];
        const a = pts[i0], b = pts[i1], c = pts[i2];
        if (area(a, b, c) <= 1e-14) continue;
        let ear = true;
        for (const j of idx) { if (j === i0 || j === i1 || j === i2) continue; const q = pts[j]; if ((q[0] === a[0] && q[1] === a[1]) || (q[0] === b[0] && q[1] === b[1]) || (q[0] === c[0] && q[1] === c[1])) continue; if (inside(q, a, b, c)) { ear = false; break; } }
        if (!ear) continue;
        out.push([i0, i1, i2]); idx.splice(i, 1); ok = true; break;
      }
      if (!ok) break;
    }
    if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
    if (out.length !== n - 2) { try { const r = ecut([pts]); if (r.tris.length) return r.tris; } catch (er) { } } // kulak kesme takıldı (hizalı / çakışık köşeler): sağlam yöntem
    return out;
  };

  /* delikli çokgen: dış CCW + delikler -> köprülenmiş tek çokgen ve üçgenler {pts, tris} */
  C.earClipHoles = function (outer, holes) {
    const ar = M.polyArea;
    let poly = ar(outer) < 0 ? outer.slice().reverse() : outer.slice();
    const hs = (holes || []).filter(h => h && h.length >= 3).map(h => ar(h) > 0 ? h.slice().reverse() : h.slice());
    if (hs.length) { try { const r = ecut([poly, ...hs]); if (r.tris.length) return r; } catch (er) { } } // çok delikte / aynı hizadaki deliklerde köprüleme + kulak kesme döşemeyi eksik üçgenliyordu
    hs.sort((a, b) => Math.max(...b.map(p => p[0])) - Math.max(...a.map(p => p[0])));
    for (const h of hs) {
      let mi = 0; h.forEach((p, i) => { if (p[0] > h[mi][0]) mi = i; }); const Mp = h[mi];
      let best = -1, bx = Infinity;
      for (let i = 0; i < poly.length; i++) { // +x ışını ile kesişen kenar
        const a = poly[i], b = poly[(i + 1) % poly.length];
        if ((a[1] > Mp[1]) === (b[1] > Mp[1])) continue;
        const x = a[0] + (Mp[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1]); if (x < Mp[0] - 1e-12 || x >= bx) continue;
        bx = x; best = a[0] > b[0] ? i : (i + 1) % poly.length;
      }
      if (best < 0) { best = 0; let bd = Infinity; poly.forEach((p, i) => { const d = Math.hypot(p[0] - Mp[0], p[1] - Mp[1]); if (d < bd) { bd = d; best = i; } }); }
      else { // üçgen içinde kalan dış köşe varsa en dar açılıyı seç
        const I = [bx, Mp[1]], P0 = poly[best], tri = [Mp, I, P0]; let ang = Infinity;
        const sgn = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
        const inT = q => { const d1 = sgn(tri[0], tri[1], q), d2 = sgn(tri[1], tri[2], q), d3 = sgn(tri[2], tri[0], q); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
        poly.forEach((q, i) => { if (i === best || q[0] < Mp[0]) return; if (inT(q)) { const a = Math.abs(Math.atan2(q[1] - Mp[1], q[0] - Mp[0])); if (a < ang) { ang = a; best = i; } } });
      }
      const ring = h.slice(mi).concat(h.slice(0, mi));
      poly = poly.slice(0, best + 1).concat(ring, [Mp, poly[best]], poly.slice(best + 1));
    }
    return { pts: poly, tris: C.earClip(poly) };
  };
  const circ = (r, n) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o.push([Math.cos(a) * r, Math.sin(a) * r]); } return o; };

  /* desc -> {tri: [[p,p,p,n?]], edges: [[a,b]]} ; çıktı olarak düz diziler */
  C.meshTris = function (d, out) {
    out = out || { pos: [], nrm: [], edges: [] };
    const push = (a, b, c, n) => {
      if (!n) { n = M.norm(M.cross(M.sub(b, a), M.sub(c, a))); }
      if (Array.isArray(n[0])) { out.pos.push(...a, ...b, ...c); out.nrm.push(...n[0], ...n[1], ...n[2]); }
      else { out.pos.push(...a, ...b, ...c); out.nrm.push(...n, ...n, ...n); }
    };
    if (d.t === 'tri') {
      const st0 = out.pos.length;
      for (let fi = 0; fi < d.f.length; fi++) { const f = d.f[fi]; const a = M.p3(d.v[f[0]]), b = M.p3(d.v[f[1]]), c = M.p3(d.v[f[2]]); if (!a || !b || !c) continue; if (d.al != null || d.fal) { if (!out.al) out.al = []; out.al[out.pos.length / 9] = d.fal ? d.fal[fi] : d.al; } push(a, b, c, d.vn ? [M.p3(d.vn[f[0]]), M.p3(d.vn[f[1]]), M.p3(d.vn[f[2]])] : d.n); }
      if (d.e) for (const [i, j] of d.e) out.edges.push([M.p3(d.v[i]), M.p3(d.v[j])]);
      if (d.edges3) for (const ab of d.edges3) out.edges.push(ab);
      if (d.fc && d.fc.length) { // yüz başına renk (3B modellerin malzeme renkleri)
        if (!out.col) out.col = []; while (out.col.length < st0) out.col.push(-1);
        for (let i = 0; i < d.f.length; i++) { const f = d.f[i]; if (!M.p3(d.v[f[0]]) || !d.v[f[1]] || !d.v[f[2]]) continue; const c = d.fc[i] || [0.8, 0.8, 0.8]; for (let k = 0; k < 3; k++) out.col.push(c[0], c[1], c[2]); }
      }
      return out;
    }
    if (d.t === 'tube') { // eksen boyunca pürüzsüz süpürme (dirsek, boru, redüksiyon)
      const Pp = d.pts.map(M.p3), n = Pp.length, sg = d.seg || 16, rs = d.rs || Pp.map(() => d.r); if (n < 2) return out;
      const Tg = d.tans && d.tans.length === Pp.length ? d.tans.map(t => M.norm(M.p3(t))) : Pp.map((p, i) => i === 0 ? M.norm(M.sub(Pp[1], Pp[0])) : i === n - 1 ? M.norm(M.sub(Pp[n - 1], Pp[n - 2])) : M.norm(M.add(M.norm(M.sub(p, Pp[i - 1])), M.norm(M.sub(Pp[i + 1], p)))));
      if (!d.tans && d.seams) for (const i of d.seams) if (i > 0 && i < n - 1) { const a1 = M.sub(Pp[i], Pp[i - 1]), a2 = M.sub(Pp[i + 1], Pp[i]); Tg[i] = M.norm(M.len(a1) > M.len(a2) ? a1 : a2); } // dirsek ağzı: düz boru yönünde (yamuk olmasın)
      let Nn = M.perp(Tg[0]); const rings = [], norms = [];
      for (let i = 0; i < n; i++) {
        if (i) { const q = M.sub(Nn, M.mul(Tg[i], M.dot(Nn, Tg[i]))); Nn = M.len(q) > 1e-9 ? M.norm(q) : M.perp(Tg[i]); }
        const Bn = M.cross(Tg[i], Nn), ring = [], nr = [];
        for (let k = 0; k < sg; k++) { const a = k / sg * Math.PI * 2, v = M.add(M.mul(Nn, Math.cos(a)), M.mul(Bn, Math.sin(a))); ring.push(M.add(Pp[i], M.mul(v, rs[i]))); nr.push(v); }
        rings.push(ring); norms.push(nr);
      }
      for (let i = 1; i < n; i++) for (let k = 0; k < sg; k++) { const j = (k + 1) % sg, a0 = rings[i - 1][k], b0 = rings[i - 1][j], a1 = rings[i][k], b1 = rings[i][j]; push(a0, b0, b1, [norms[i - 1][k], norms[i - 1][j], norms[i][j]]); push(a0, b1, a1, [norms[i - 1][k], norms[i][j], norms[i][k]]); }
      if (d.ri > 0 || d.ris) { // içi boş boru: iç yüzey (içe bakan) + uçlarda halka kapak
        const rI = rings.map((ring, i) => norms[i].map(v => M.add(Pp[i], M.mul(v, d.ris ? d.ris[i] : d.ri))));
        const tIn0 = out.pos.length / 9;
        for (let i = 1; i < n; i++) for (let k = 0; k < sg; k++) { const j = (k + 1) % sg, a0 = rI[i - 1][k], b0 = rI[i - 1][j], a1 = rI[i][k], b1 = rI[i][j], m = v => M.mul(v, -1); push(a0, b1, b0, [m(norms[i - 1][k]), m(norms[i][j]), m(norms[i - 1][j])]); push(a0, a1, b1, [m(norms[i - 1][k]), m(norms[i][k]), m(norms[i][j])]); }
        (out.inner || (out.inner = [])).push([tIn0, out.pos.length / 9]); // iç yüzey üçgenleri: görünüş / kesitte siluet üretmez
        if (d.caps !== false) { const t0 = M.mul(Tg[0], -1), t1 = Tg[n - 1]; for (let k = 0; k < sg; k++) { const j = (k + 1) % sg; push(rI[0][k], rings[0][j], rings[0][k], t0); push(rI[0][k], rI[0][j], rings[0][j], t0); push(rI[n - 1][k], rings[n - 1][k], rings[n - 1][j], t1); push(rI[n - 1][k], rings[n - 1][j], rI[n - 1][j], t1); } }
        for (const i of [0, n - 1]) for (let k = 0; k < sg; k++) (out.edgesIn || (out.edgesIn = [])).push([rI[i][k], rI[i][(k + 1) % sg]]); // iç ağız çizgisi: yalnız 3B'de
      }
      else if (d.caps !== false) { const t0 = M.mul(Tg[0], -1), t1 = Tg[n - 1]; for (let k = 0; k < sg; k++) { const j = (k + 1) % sg; push(Pp[0], rings[0][j], rings[0][k], t0); push(Pp[n - 1], rings[n - 1][k], rings[n - 1][j], t1); } }
      const seams = new Set([0, n - 1, ...(d.seams || [])]);
      for (const i of seams) if (i >= 0 && i < n) for (let k = 0; k < sg; k++) out.edges.push([rings[i][k], rings[i][(k + 1) % sg]]);
      return out;
    }
    if (d.t !== 'ext') return out;
    const ux = d.ux, uz = d.uz, uy = M.cross(uz, ux), o = d.o, h = d.h;
    const W = (u, v, w) => [o[0] + ux[0] * u + uy[0] * v + uz[0] * w, o[1] + ux[1] * u + uy[1] * v + uz[1] * w, o[2] + ux[2] * u + uy[2] * v + uz[2] * w];
    const Nv = (u, v) => M.norm([ux[0] * u + uy[0] * v, ux[1] * u + uy[1] * v, ux[2] * u + uy[2] * v]);
    const nUp = uz, nDn = M.mul(uz, -1);
    const prof = d.prof;
    if (Array.isArray(prof)) {
      let pts = prof.slice();
      if (M.polyArea(pts) < 0) pts.reverse();
      const tris = C.earClip(pts);
      for (const t of tris) {
        const [a, b, c] = t.map(i => pts[i]);
        push(W(a[0], a[1], h), W(b[0], b[1], h), W(c[0], c[1], h), nUp);
        push(W(a[0], a[1], 0), W(c[0], c[1], 0), W(b[0], b[1], 0), nDn);
      }
      const np = pts.length, ns = [], soft = [];
      for (let i = 0; i < np; i++) { const a = pts[i], b = pts[(i + 1) % np]; ns.push(Nv(b[1] - a[1], -(b[0] - a[0]))); }
      for (let i = 0; i < np; i++) { const pv = pts[(i + np - 1) % np], a = pts[i], b = pts[(i + 1) % np], d0 = [a[0] - pv[0], a[1] - pv[1]], d1 = [b[0] - a[0], b[1] - a[1]], l0 = Math.hypot(d0[0], d0[1]), l1 = Math.hypot(d1[0], d1[1]); soft.push(l0 > 1e-12 && l1 > 1e-12 && (d0[0] * d1[0] + d0[1] * d1[1]) / (l0 * l1) > 0.94); }
      for (let i = 0; i < np; i++) {
        const a = pts[i], b = pts[(i + 1) % np];
        const n = ns[i], j = (i + 1) % np, na = soft[i] ? M.norm(M.add(ns[(i + np - 1) % np], n)) : n, nb = soft[j] ? M.norm(M.add(n, ns[j])) : n; // yuvarlak yüzeyler pürüzsüz gölgelenir
        const a0 = W(a[0], a[1], 0), b0 = W(b[0], b[1], 0), a1 = W(a[0], a[1], h), b1 = W(b[0], b[1], h);
        push(a0, b0, b1, [na, nb, nb]); push(a0, b1, a1, [na, nb, na]);
        { const pv = pts[(i + pts.length - 1) % pts.length], d0 = [a[0] - pv[0], a[1] - pv[1]], d1 = [b[0] - a[0], b[1] - a[1]], l0 = Math.hypot(d0[0], d0[1]), l1 = Math.hypot(d1[0], d1[1]); const soft = l0 > 1e-12 && l1 > 1e-12 && (d0[0] * d1[0] + d0[1] * d1[1]) / (l0 * l1) > 0.94; out.edges.push([a0, b0], [a1, b1]); if (!soft) out.edges.push([a0, a1]); }
      }
      return out;
    }
    const n = d.seg && d.seg < 40 ? d.seg : M.circN(Math.max(prof.r, prof.ri || 0), d.seg || 48);
    const co = circ(prof.r, n);
    if (prof.ri) {
      const ci = circ(prof.ri, n);
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, a = co[i], b = co[j], ai = ci[i], bi = ci[j];
        const na = Nv(a[0], a[1]), nb = Nv(b[0], b[1]);
        push(W(a[0], a[1], 0), W(b[0], b[1], 0), W(b[0], b[1], h), [na, nb, nb]); push(W(a[0], a[1], 0), W(b[0], b[1], h), W(a[0], a[1], h), [na, nb, na]);
        const ma = M.mul(na, -1), mb = M.mul(nb, -1);
        push(W(ai[0], ai[1], 0), W(bi[0], bi[1], h), W(bi[0], bi[1], 0), [ma, mb, mb]); push(W(ai[0], ai[1], 0), W(ai[0], ai[1], h), W(bi[0], bi[1], h), [ma, ma, mb]);
        push(W(a[0], a[1], h), W(b[0], b[1], h), W(bi[0], bi[1], h), nUp); push(W(a[0], a[1], h), W(bi[0], bi[1], h), W(ai[0], ai[1], h), nUp);
        push(W(a[0], a[1], 0), W(bi[0], bi[1], 0), W(b[0], b[1], 0), nDn); push(W(a[0], a[1], 0), W(ai[0], ai[1], 0), W(bi[0], bi[1], 0), nDn);
        out.edges.push([W(a[0], a[1], 0), W(b[0], b[1], 0)], [W(a[0], a[1], h), W(b[0], b[1], h)], [W(ai[0], ai[1], h), W(bi[0], bi[1], h)], [W(ai[0], ai[1], 0), W(bi[0], bi[1], 0)]);
      }
      return out;
    }
    const top = W(0, 0, h), bot = W(0, 0, 0);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, a = co[i], b = co[j];
      const na = Nv(a[0], a[1]), nb = Nv(b[0], b[1]);
      push(W(a[0], a[1], 0), W(b[0], b[1], 0), W(b[0], b[1], h), [na, nb, nb]); push(W(a[0], a[1], 0), W(b[0], b[1], h), W(a[0], a[1], h), [na, nb, na]);
      push(top, W(a[0], a[1], h), W(b[0], b[1], h), nUp); push(bot, W(b[0], b[1], 0), W(a[0], a[1], 0), nDn);
      out.edges.push([W(a[0], a[1], 0), W(b[0], b[1], 0)], [W(a[0], a[1], h), W(b[0], b[1], h)]);
    }
    return out;
  };

  /* bir varlığın tüm üçgenleri */
  /* yumuşak gölgeleme: aynı noktadaki, aralarındaki açı < 25° olan yüzlerin normallerini ortala (yuvarlak perde / tank / kolon pürüzsüz görünsün; keskin köşeler korunur) */
  const COS_S = Math.cos(25 * Math.PI / 180);
  const smoothN = out => {
    const P = out.pos, N = out.nrm, nv = P.length / 3; if (nv < 9 || nv > 600000) return;
    const G = new Map(); for (let i = 0; i < nv; i++) { const k = Math.round(P[i * 3] * 1e4) + ',' + Math.round(P[i * 3 + 1] * 1e4) + ',' + Math.round(P[i * 3 + 2] * 1e4); let g = G.get(k); if (!g) G.set(k, g = []); g.push(i); }
    const src = N.slice();
    for (const g of G.values()) { if (g.length < 2 || g.length > 64) continue; for (const i of g) { const ax = src[i * 3], ay = src[i * 3 + 1], az = src[i * 3 + 2]; let sx = 0, sy = 0, sz = 0; for (const j of g) { const bx = src[j * 3], by = src[j * 3 + 1], bz = src[j * 3 + 2]; if (ax * bx + ay * by + az * bz >= COS_S) { sx += bx; sy += by; sz += bz; } } const l = Math.hypot(sx, sy, sz); if (l > 1e-9) { N[i * 3] = sx / l; N[i * 3 + 1] = sy / l; N[i * 3 + 2] = sz / l; } } }
    /* yuvarlak yüzeydeki dilim çizgilerini gizle: iki komşu yüz arasındaki açı 0.5°–25° ise o kenar çizilmez */
    if (!out.edges || !out.edges.length) return;
    const K = (x, y, z) => Math.round(x * 1e4) + ',' + Math.round(y * 1e4) + ',' + Math.round(z * 1e4), EK = (a, b) => (a < b ? a + '|' + b : b + '|' + a), F = new Map(), nt = nv / 3;
    for (let t = 0; t < nt; t++) { const o = t * 9, ax = P[o], ay = P[o + 1], az = P[o + 2], ux = P[o + 3] - ax, uy = P[o + 4] - ay, uz = P[o + 5] - az, vx = P[o + 6] - ax, vy = P[o + 7] - ay, vz = P[o + 8] - az; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz); if (l < 1e-12) continue; nx /= l; ny /= l; nz /= l;
      const k = [K(P[o], P[o + 1], P[o + 2]), K(P[o + 3], P[o + 4], P[o + 5]), K(P[o + 6], P[o + 7], P[o + 8])];
      for (let m = 0; m < 3; m++) { const e = EK(k[m], k[(m + 1) % 3]); let g = F.get(e); if (!g) F.set(e, g = []); if (g.length < 6) g.push([nx, ny, nz]); } }
    const COS_F = Math.cos(0.5 * Math.PI / 180);
    out.edges = out.edges.filter(ab => { const a = ab && ab[0], b = ab && ab[1]; if (!a || !b) return true; const g = F.get(EK(K(a[0], a[1], a[2] || 0), K(b[0], b[1], b[2] || 0))); if (!g || g.length !== 2) return true; const d = g[0][0] * g[1][0] + g[0][1] * g[1][1] + g[0][2] * g[1][2]; return !(d >= COS_S && d < COS_F); });
  };
  /* bakış yönüne göre siluet (dış hat) kenarları: bir yüzü bakana dönük, komşusu arkaya dönük kenarlar — boru, korkuluk, silindir tank gibi
     kenar çizgisi olmayan yuvarlak gövdelerin görünüş / kesitte çizilmesi için. d: bakış yönü (birim olmak zorunda değil) */
  C.silEdges = (t, d) => {
    const P = t && t.pos; if (!P || !P.length || P.length > 2.7e6) return [];
    const K = (i) => Math.round(P[i] * 1e4) + ',' + Math.round(P[i + 1] * 1e4) + ',' + Math.round(P[i + 2] * 1e4), Mp = new Map(), out = [];
    const inn = t.inner || [], isIn = ti => inn.some(([a, b]) => ti >= a && ti < b);
    for (let o = 0; o < P.length; o += 9) {
      if (inn.length && isIn(o / 9)) continue;
      const ux = P[o + 3] - P[o], uy = P[o + 4] - P[o + 1], uz = P[o + 5] - P[o + 2], vx = P[o + 6] - P[o], vy = P[o + 7] - P[o + 1], vz = P[o + 8] - P[o + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz); if (l < 1e-12) continue;
      const dd = (nx * d[0] + ny * d[1] + nz * d[2]) / l, sg = dd > 1e-4 ? 1 : dd < -1e-4 ? -1 : 2; // 2: bakışa paralel (kenardan görünen) yüz — silindir, boru, korkuluk dış hattı
      for (let m = 0; m < 3; m++) { const ia = o + m * 3, ib = o + ((m + 1) % 3) * 3, ka = K(ia), kb = K(ib); if (ka === kb) continue; const k = ka < kb ? ka + '|' + kb : kb + '|' + ka, q = Mp.get(k);
        if (q === undefined) Mp.set(k, sg); else if (q !== 0 && q !== sg && !(q === 2 && sg === 2)) { out.push([[P[ia], P[ia + 1], P[ia + 2]], [P[ib], P[ib + 1], P[ib + 2]]]); Mp.set(k, 0); } }
    }
    return out;
  };
  /* belirgin kenarlar (kenar çizgisi olmayan ağlar için: ithal 3B ekipman): iki yüz arasındaki açı > deg ya da tek yüzlü (açık) kenarlar */
  C.creaseEdges = (t, deg = 35) => {
    const P = t && t.pos; if (!P || !P.length || P.length > 2.7e6) return [];
    const c0 = Math.cos(deg * Math.PI / 180), K = i => Math.round(P[i] * 1e4) + ',' + Math.round(P[i + 1] * 1e4) + ',' + Math.round(P[i + 2] * 1e4), Mp = new Map(), inn = t.inner || [];
    for (let o = 0; o < P.length; o += 9) {
      if (inn.length && inn.some(([a, b]) => o / 9 >= a && o / 9 < b)) continue;
      const ux = P[o + 3] - P[o], uy = P[o + 4] - P[o + 1], uz = P[o + 5] - P[o + 2], vx = P[o + 6] - P[o], vy = P[o + 7] - P[o + 1], vz = P[o + 8] - P[o + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz); if (l < 1e-14) continue; nx /= l; ny /= l; nz /= l;
      for (let m = 0; m < 3; m++) { const ia = o + m * 3, ib = o + ((m + 1) % 3) * 3, ka = K(ia), kb = K(ib); if (ka === kb) continue; const k = ka < kb ? ka + '|' + kb : kb + '|' + ka; let q = Mp.get(k); if (!q) Mp.set(k, q = { a: ia, b: ib, n: [] }); if (q.n.length < 3) q.n.push([nx, ny, nz]); }
    }
    const out = [];
    for (const q of Mp.values()) { const n = q.n; if (n.length === 2 && n[0][0] * n[1][0] + n[0][1] * n[1][1] + n[0][2] * n[1][2] > c0) continue; if (n.length > 2) continue; out.push([[P[q.a], P[q.a + 1], P[q.a + 2]], [P[q.b], P[q.b + 1], P[q.b + 2]]]); }
    return out;
  };
  C.entTris = e => { const ch = e._c || (e._c = {}); if (ch.t !== undefined) return ch.t; const ms = C.meshes(e); if (!ms) return (ch.t = null); const out = { pos: [], nrm: [], edges: [] }; for (const d of ms) C.meshTris(d, out); try { smoothN(out); } catch (er) { } return (ch.t = out); };
})(typeof window !== 'undefined' ? window.C : globalThis.C);

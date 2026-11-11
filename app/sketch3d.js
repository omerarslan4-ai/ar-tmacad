/* ArıtmaCAD — SketchUp tarzı 3B modelleme:
   katı (kati) nesnesi = düzlemsel profil + normal yönünde yükseklik (0 ise yalnız yüz),
   yüzeye çizim (dikdörtgen / daire tıklanan yüzün düzleminde), İT/ÇEK, YÜZ YAP, EKSTRÜZYON */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, P, CI } = C.prim;
  const EPS = 1e-7;
  const circPts = (r, n = M.circN(r)) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o.push([Math.cos(a) * r, Math.sin(a) * r]); } return o; };

  /* düzlem çerçevesi: n normal, ux yatay (mümkünse), uy = n × ux */
  C.planeFrame = (n, hint) => {
    n = M.norm(n); let ux = null;
    if (hint) { const q = M.sub(hint, M.mul(n, M.dot(hint, n))); if (M.len(q) > 1e-6) ux = M.norm(q); }
    if (!ux) ux = Math.abs(n[2]) > 0.999 ? [1, 0, 0] : M.norm(M.cross([0, 0, 1], n));
    return { n, ux, uy: M.cross(n, ux) };
  };
  /* düzlemsel çokgenin alan ağırlık merkezi (3B) */
  C.polyCentroid3 = (pts, n) => {
    if (!pts || pts.length < 3) return null; const F = C.planeFrame(n || [0, 0, 1], M.sub(pts[1], pts[0])), o = pts[0];
    const q = pts.map(p => { const v = M.sub(p, o); return [M.dot(v, F.ux), M.dot(v, F.uy)]; }), c = C.polyCentroid2(q); if (!c) return null;
    return M.add(M.add(o, M.mul(F.ux, c[0])), M.mul(F.uy, c[1]));
  };
  C.polyCentroid2 = q => { let A = 0, cx = 0, cy = 0; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length], k = a[0] * b[1] - b[0] * a[1]; A += k; cx += (a[0] + b[0]) * k; cy += (a[1] + b[1]) * k; } if (Math.abs(A) < 1e-14) return null; return [cx / (3 * A), cy / (3 * A)]; };
  const toLocal = (F, o, p) => { const v = M.sub(p, o); return [M.dot(v, F.ux), M.dot(v, F.uy)]; };

  /* ---------- KATI ---------- */
  const profPts = e => Array.isArray(e.prof) ? e.prof : circPts(e.prof.r);
  const W = (e, u, v, w) => { const uy = M.cross(e.uz, e.ux); return [e.o[0] + e.ux[0] * u + uy[0] * v + e.uz[0] * w, e.o[1] + e.ux[1] * u + uy[1] * v + e.uz[1] * w, (e.o[2] || 0) + e.ux[2] * u + uy[2] * v + e.uz[2] * w]; };
  C.katiLoop = (e, w) => profPts(e).map(([u, v]) => W(e, u, v, w));
  const normK = e => { e.h = e.h || 0; if (e.h < 0) { e.o = M.add(e.o, M.mul(e.uz, e.h)); e.h = -e.h; } return e; };
  const katiArea = e => Array.isArray(e.prof) ? Math.abs(M.polyArea(e.prof)) : Math.PI * e.prof.r * e.prof.r;
  const loopArea3 = L => { let n = [0, 0, 0]; for (let i = 0; i < L.length; i++) n = M.add(n, M.cross(L[i], L[(i + 1) % L.length])); return M.len(n) / 2; };
  /* delik kaydını ortak biçime çevir: {L: giriş halkası (yerel u,v,w), dir: içeri yön, D: derinlik, thru: boydan boya mı, circ} */
  C.normHole = (outer, h, q) => {
    if (q.L) return { L: q.L, dir: q.dir, D: q.D, thru: !!q.thru, circ: !!q.circ };
    const I = C.prismHoleInfo(outer, h, q); if (!I) return null; const D = q.d || I.T; if (D == null) return null;
    return { L: I.L, dir: I.dir, D, thru: !q.d, circ: !!q.circ };
  };
  /* eski çizimlerdeki kaba bölünmüş yayları ince böl (yalnız düz, z yönlü delik halkaları) */
  const denseHole = x => {
    if (!x || !C.denseLoop || x.circ || x.L.length < 6 || Math.abs(Math.abs(x.dir[2]) - 1) > 1e-6) return x;
    const w = x.L[0][2]; if (!x.L.every(q => Math.abs(q[2] - w) < 1e-9)) return x;
    const d = C.denseLoop(x.L.map(q => [q[0], q[1]])); if (!d || d.length <= x.L.length) return x;
    return Object.assign({}, x, { L: d.map(q => [q[0], q[1], w]) });
  };
  const holesOf = e => (e.holes || []).map(q => denseHole(C.normHole(profPts(e), e.h || 0, q))).filter(Boolean);
  const endLoop = x => x.L.map(p => M.add(p, M.mul(x.dir, x.D)));
  const katiVol = e => { let V = katiArea(e) * Math.abs(e.h || 0); for (const x of holesOf(e)) V -= loopArea3(x.L) * x.D; return V; };
  T.kati = {
    label: 'Katı', ifc: 'IfcBuildingElementProxy',
    prims: e => {
      const circ = !Array.isArray(e.prof), h = e.h || 0, Wl = q => W(e, q[0], q[1], q[2]);
      const hp = []; for (const x of holesOf(e)) hp.push(P(x.L.map(Wl), true), P(endLoop(x).map(Wl), true, x.thru ? {} : { lt: 'HIDDEN' }));
      if (Math.abs(e.uz[2]) > 0.999) { // düşey eksenli: planda tek kontur
        const zb = Math.min(e.o[2] || 0, (e.o[2] || 0) + e.uz[2] * h);
        if (circ) return [CI([e.o[0], e.o[1], zb], e.prof.r), ...hp];
        return [P(C.katiLoop(e, 0).map(p => [p[0], p[1], zb]), true), ...hp];
      }
      const a = C.katiLoop(e, 0), out = [P(a, true), ...hp];
      if (Math.abs(h) > EPS) { const b = C.katiLoop(e, h); out.push(P(b, true)); if (!circ) a.forEach((p, i) => { if (M.dist(p, b[i]) > 1e-6) out.push(L(p, b[i])); }); }
      return out;
    },
    mesh: e => {
      const h = e.h || 0;
      if (e.holes && e.holes.length && Math.abs(h) > EPS) return [holedPrism((u, v, w) => W(e, u, v, w), profPts(e), holesOf(e), h, !Array.isArray(e.prof))];
      if (Math.abs(h) < EPS) {
        let pp = profPts(e).slice(); if (M.polyArea(pp) < 0) pp.reverse();
        const v = pp.map(([u, w]) => W(e, u, w, 0));
        return [{ t: 'tri', v, f: C.earClip(pp), n: e.uz, e: v.map((_, i) => [i, (i + 1) % v.length]) }];
      }
      let o = e.o, hh = h; if (h < 0) { o = M.add(o, M.mul(e.uz, h)); hh = -h; }
      return [C.meshDef.ext(o, e.ux, e.uz, Array.isArray(e.prof) ? e.prof : { r: e.prof.r }, hh, circ48(e))];
    },
    snaps: e => {
      const out = [], circ = !Array.isArray(e.prof), ls = [C.katiLoop(e, 0)]; if (Math.abs(e.h || 0) > EPS) ls.push(C.katiLoop(e, e.h));
      for (const l of ls) { if (circ) { out.push({ p: M.lerp(l[0], l[24], 0.5), k: 'cen' }); for (let i = 0; i < 48; i += 12) out.push({ p: l[i], k: 'qua' }); } else l.forEach((p, i) => out.push({ p, k: 'end' }, { p: M.lerp(p, l[(i + 1) % l.length], 0.5), k: 'mid' })); }
      if (!circ && ls.length === 2) ls[0].forEach((p, i) => out.push({ p: M.lerp(p, ls[1][i], 0.5), k: 'mid' }));
      for (const x of holesOf(e)) for (const lp of [x.L, endLoop(x)]) { const l = lp.map(q => W(e, q[0], q[1], q[2])); if (x.circ) { out.push({ p: M.lerp(l[0], l[l.length >> 1], 0.5), k: 'cen' }); for (let i = 0; i < l.length; i += l.length >> 2) out.push({ p: l[i], k: 'qua' }); } else l.forEach((p, i) => out.push({ p, k: 'end' }, { p: M.lerp(p, l[(i + 1) % l.length], 0.5), k: 'mid' })); }
      return out;
    },
    xf: (e, X) => {
      const s = X.s || 1, dirV = v => { const q = X.v(v); return M.norm([q[0] / s, q[1] / s, q[2] || 0]); };
      e.o = X.p(e.o); e.ux = dirV(e.ux); e.uz = dirV(e.uz);
      if (Array.isArray(e.prof)) e.prof = e.prof.map(([u, v]) => [u * s, (X.mir ? -v : v) * s]); else e.prof = { r: e.prof.r * s };
      for (const q of e.holes || []) {
        if (q.L) { q.L = q.L.map(([u, v, w]) => [u * s, (X.mir ? -v : v) * s, w * s]); q.dir = [q.dir[0], X.mir ? -q.dir[1] : q.dir[1], q.dir[2]]; q.D *= s; }
        else if (q.face === 'side') { q.A = [q.A[0] * s, (X.mir ? -q.A[1] : q.A[1]) * s]; q.e = [q.e[0], X.mir ? -q.e[1] : q.e[1]]; q.pts = q.pts.map(([a, b]) => [a * s, b * s]); if (q.d) q.d *= s; }
        else { q.pts = q.pts.map(([u, v]) => [u * s, (X.mir ? -v : v) * s]); if (q.d) q.d *= s; }
      }
      e.h = (e.h || 0) * s;
    },
    info: e => `${(e.holes || []).length ? e.holes.length + ' delik/cep · net hacim=' + M.fmt(katiVol(e), 3) + ' m³ · ' : ''}${Array.isArray(e.prof) ? e.prof.length + ' köşeli' : 'dairesel (r=' + M.fmt(e.prof.r, 3) + ')'} · taban=${M.fmt(katiArea(e), 3)} m² · yükseklik=${M.fmt(e.h || 0, 3)} m${Math.abs(e.h || 0) > EPS ? ' · hacim=' + M.fmt(katiArea(e) * Math.abs(e.h), 3) + ' m³' : ' (yüz)'}`,
  };
  /* eski biçim (face top/bot/side) delikler için yardımcı */
  C.holeLoop3 = q => q.face === 'side' ? q.pts.map(([s2, w]) => [q.A[0] + q.e[0] * s2, q.A[1] + q.e[1] * s2, w]) : q.pts.map(([u, v]) => [u, v, null]);
  C.prismHoleInfo = (outer, h, q) => {
    if (!circOuter && C.denseLoop && outer.length >= 6) { const d = C.denseLoop(outer); if (d && d.length > outer.length) outer = d; }
    const ccw = M.polyArea(outer) >= 0 ? outer : outer.slice().reverse(), n = ccw.length;
    const softAt = (P, i) => { const m = P.length, pv = P[(i + m - 1) % m], a = P[i], b = P[(i + 1) % m], d0 = M.sub(a, pv), d1 = M.sub(b, a), l0 = M.len(d0), l1 = M.len(d1); return l0 > 1e-12 && l1 > 1e-12 && M.dot(d0, d1) / (l0 * l1) > 0.94; };
    const face = q.face || q.from || 'top';
    if (face !== 'side') { const top = face === 'top'; return { L: q.pts.map(([u, v]) => [u, v, top ? h : 0]), dir: [0, 0, top ? -1 : 1], T: h }; }
    let fi = -1;
    for (let i = 0; i < n; i++) { const a = ccw[i], b = ccw[(i + 1) % n], ed = M.norm([b[0] - a[0], b[1] - a[1], 0]); if (Math.abs(ed[0] * q.e[1] - ed[1] * q.e[0]) > 1e-6) continue; if (Math.abs((q.A[0] - a[0]) * ed[1] - (q.A[1] - a[1]) * ed[0]) > 1e-5) continue; fi = i; break; }
    if (fi < 0) return null;
    const ea = ccw[fi], eb = ccw[(fi + 1) % n], ed = M.norm([eb[0] - ea[0], eb[1] - ea[1], 0]), nn = [ed[1], -ed[0], 0];
    let T = null;
    for (let j = 0; j < n; j++) { if (j === fi) continue; const a = ccw[j], b = ccw[(j + 1) % n], e2 = M.norm([b[0] - a[0], b[1] - a[1], 0]); if (e2[0] * ed[0] + e2[1] * ed[1] > -0.99999) continue; T = -((a[0] - ea[0]) * nn[0] + (a[1] - ea[1]) * nn[1]); break; }
    return { L: C.holeLoop3(q), dir: [-nn[0], -nn[1], 0], T };
  };
  /* delikli prizma ağı — yüz tabanlı: dış yüzler + her deliğin duvarları/tabanı birer yüz olur;
     sonraki delikler bu yüzlerin herhangi birinden (ör. havuz iç duvarından) açılabilir */
  function holedPrism(Wf, outer, H, h, circOuter) {
    if (!circOuter && C.denseLoop && outer.length >= 6) { const d = C.denseLoop(outer); if (d && d.length > outer.length) outer = d; }
    const ccw = M.polyArea(outer) >= 0 ? outer : outer.slice().reverse(), n = ccw.length;
    const softAt = (P, i) => { const m = P.length, pv = P[(i + m - 1) % m], a = P[i], b = P[(i + 1) % m], d0 = M.sub(a, pv), d1 = M.sub(b, a), l0 = M.len(d0), l1 = M.len(d1); return l0 > 1e-12 && l1 > 1e-12 && M.dot(d0, d1) / (l0 * l1) > 0.94; };
    const O = Wf(0, 0, 0), Wd = (a, b, c) => M.sub(Wf(a, b, c), O);
    const v = [], vn = [], f = [], ed = [];
    const add = (p, nr) => { v.push(Wf(p[0], p[1], p[2])); vn.push(M.norm(Wd(nr[0], nr[1], nr[2]))); return v.length - 1; };
    const tri = (i0, i1, i2, want) => { const g = M.cross(M.sub(v[i1], v[i0]), M.sub(v[i2], v[i0])); const w = Wd(want[0], want[1], want[2]); f.push(M.dot(g, w) < 0 ? [i0, i2, i1] : [i0, i1, i2]); };
    const ring = L => { for (let i = 0; i < L.length; i++) ed.push([Wf(...L[i]), Wf(...L[(i + 1) % L.length])]); };
    const faces = [];
    const mkFace = (pts, nrm) => { const F = C.planeFrame(nrm, M.sub(pts[1], pts[0])), o = pts[0]; const fc = { pts, n: F.n, F, o, p2: pts.map(q => toLocal(F, o, q)), d0: M.dot(F.n, o), loops: [] }; faces.push(fc); return fc; };
    const onFace = (Lp, skip) => { const c = Lp.reduce((s, q) => M.add(s, q), [0, 0, 0]).map(t => t / Lp.length); return faces.find(fc => !skip.has(fc) && Lp.every(q => Math.abs(M.dot(fc.n, q) - fc.d0) < 1e-5) && C.pointInPoly(toLocal(fc.F, fc.o, c), fc.p2)); };
    mkFace(ccw.map(p => [p[0], p[1], h]), [0, 0, 1]); mkFace(ccw.map(p => [p[0], p[1], 0]), [0, 0, -1]);
    ring(ccw.map(p => [p[0], p[1], 0])); ring(ccw.map(p => [p[0], p[1], h]));
    if (circOuter) {
      const cx = ccw.reduce((s, p) => s + p[0], 0) / n, cy = ccw.reduce((s, p) => s + p[1], 0) / n;
      for (let i = 0; i < n; i++) { const a = ccw[i], b = ccw[(i + 1) % n], na = [a[0] - cx, a[1] - cy, 0], nb = [b[0] - cx, b[1] - cy, 0]; const i0 = add([a[0], a[1], 0], na), i1 = add([b[0], b[1], 0], nb), i2 = add([b[0], b[1], h], nb), i3 = add([a[0], a[1], h], na); tri(i0, i1, i2, M.add(na, nb)); tri(i0, i2, i3, M.add(na, nb)); }
    } else for (let i = 0; i < n; i++) {
      const a = ccw[i], b = ccw[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1e-12) continue;
      const P2 = ccw.map(q => [q[0], q[1], 0]), sa = softAt(P2, i), sb = softAt(P2, (i + 1) % n);
      if (sa || sb) { // eğri yüzey parçası: pürüzsüz normallerle
        const nOf = k => { const p = ccw[(k + n) % n], q = ccw[(k + 1 + n) % n], ll = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [(q[1] - p[1]) / ll, -(q[0] - p[0]) / ll, 0]; };
        const ns = nOf(i), na = sa ? M.norm(M.add(nOf(i - 1), ns)) : ns, nb = sb ? M.norm(M.add(ns, nOf(i + 1))) : ns;
        const i0 = add([a[0], a[1], 0], na), i1 = add([b[0], b[1], 0], nb), i2 = add([b[0], b[1], h], nb), i3 = add([a[0], a[1], h], na); tri(i0, i1, i2, ns); tri(i0, i2, i3, ns);
        if (!sa) ed.push([Wf(a[0], a[1], 0), Wf(a[0], a[1], h)]);
        continue;
      }
      mkFace([[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], h], [a[0], a[1], h]], [(b[1] - a[1]) / l, -(b[0] - a[0]) / l, 0]); { const pv = ccw[(i + n - 1) % n], d0 = [a[0] - pv[0], a[1] - pv[1]], d1 = [b[0] - a[0], b[1] - a[1]], l0 = Math.hypot(d0[0], d0[1]), l1 = Math.hypot(d1[0], d1[1]); if (!(l0 > 1e-12 && l1 > 1e-12 && (d0[0] * d1[0] + d0[1] * d1[1]) / (l0 * l1) > 0.94)) ed.push([Wf(a[0], a[1], 0), Wf(a[0], a[1], h)]); }
    }
    for (const x of H) {
      const Lp = x.L, X = endLoop(x), m = Lp.length, dir = M.norm(x.dir), c = Lp.reduce((s, q) => M.add(s, q), [0, 0, 0]).map(t => t / m);
      const inN = p => { const r = M.sub(c, p), q = M.sub(r, M.mul(dir, M.dot(r, dir))); return M.len(q) > 1e-12 ? M.norm(q) : [0, 0, 1]; };
      // halkanın yönü (dir'e göre): iç taraf = boşluk; duvar normali boşluğa bakar
      let Av = [0, 0, 0]; for (let i = 0; i < m; i++) Av = M.add(Av, M.cross(Lp[i], Lp[(i + 1) % m])); const sgn = M.dot(Av, dir) >= 0 ? 1 : -1;
      const segN = i => { const e = M.sub(Lp[(i + 1) % m], Lp[i]), q = M.cross(dir, e), l = M.len(q); return l > 1e-12 ? M.mul(q, sgn / l) : inN(Lp[i]); };
      const fin = onFace(Lp, new Set()); if (fin) fin.loops.push(Lp);
      const own = new Set();
      for (let i = 0; i < m; i++) {
        const j = (i + 1) % m;
        if (x.circ) { const na = inN(Lp[i]), nb = inN(Lp[j]), i0 = add(Lp[i], na), i1 = add(Lp[j], nb), i2 = add(X[j], nb), i3 = add(X[i], na), want = M.add(na, nb); tri(i0, i1, i2, want); tri(i0, i2, i3, want); }
        else {
          if (M.dist(Lp[i], Lp[j]) < 1e-9) continue;
          const sa = softAt(Lp, i), sb = softAt(Lp, j), ns = segN(i);
          if (sa || sb) { const na = sa ? M.norm(M.add(segN((i + m - 1) % m), ns)) : ns, nb = sb ? M.norm(M.add(ns, segN(j))) : ns, i0 = add(Lp[i], na), i1 = add(Lp[j], nb), i2 = add(X[j], nb), i3 = add(X[i], na); tri(i0, i1, i2, ns); tri(i0, i2, i3, ns); if (!sa) ed.push([Wf(...Lp[i]), Wf(...X[i])]); }
          else { own.add(mkFace([Lp[i], Lp[j], X[j], X[i]], ns)); ed.push([Wf(...Lp[i]), Wf(...X[i])]); }
        }
      }
      ring(Lp); ring(X);
      if (x.thru) { const fo = onFace(X, own); if (fo) fo.loops.push(X); }
      else mkFace(X, M.mul(dir, -1));
    }
    for (const fc of faces) {
      const r = C.earClipHoles(fc.p2, fc.loops.map(Lp => Lp.map(q => toLocal(fc.F, fc.o, q)))); const base = v.length;
      r.pts.forEach(q => add(M.add(M.add(fc.o, M.mul(fc.F.ux, q[0])), M.mul(fc.F.uy, q[1])), fc.n)); r.tris.forEach(t => tri(base + t[0], base + t[1], base + t[2], fc.n));
    }
    return { t: 'tri', v, vn, f, edges3: ed };
  }
  C.holedPrism = holedPrism;
  function circ48(e) { return Array.isArray(e.prof) ? {} : { seg: 48 }; }
  /* döşemede delik / cep */
  { const S = T.slab, m0 = S.mesh, p0 = S.prims, x0 = S.xf;
    const outerOf = e => e.pts.map(q => [q[0], q[1]]), hs = e => (e.holes || []).map(q => C.normHole(outerOf(e), e.t, q)).filter(Boolean), Ws = (e, q) => [q[0], q[1], (e.z || 0) + q[2]];
    S.mesh = e => (e.holes && e.holes.length) ? [holedPrism((u, v, w) => [u, v, (e.z || 0) + w], outerOf(e), hs(e), e.t, false)] : m0(e);
    S.prims = e => { const o = p0(e).slice(); for (const x of hs(e)) o.push(P(x.L.map(q => Ws(e, q)), true), P(endLoop(x).map(q => Ws(e, q)), true, x.thru ? {} : { lt: 'HIDDEN' })); return o; };
    const i0 = S.info; S.info = e => i0(e) + ((e.holes || []).length ? ` · ${e.holes.length} delik/cep` : '');
    S.xf = (e, X) => { const z0 = e.z || 0; x0(e, X); const s = X.s || 1; for (const q of e.holes || []) { if (q.L) { q.L = q.L.map(([u, v, w]) => { const r = X.p([u, v]); return [r[0], r[1], w * s]; }); const d = X.v([q.dir[0], q.dir[1], 0]); q.dir = M.norm([d[0] / s, d[1] / s, q.dir[2]]); q.D *= s; } else { q.pts = q.pts.map(p => { const r = X.p(p); return [r[0], r[1]]; }); if (q.d) q.d *= s; } } };
  }
  C.newKati = (o, F, prof, h, props) => C.newEnt('kati', Object.assign({ o: M.p3(o), ux: F.ux, uz: F.n, prof, h: h || 0 }, props || {}));

  /* ---------- yüz bulma ---------- */
  const key = p => Math.round(p[0] * 1e5) + ',' + Math.round(p[1] * 1e5) + ',' + Math.round((p[2] || 0) * 1e5);
  const simplify = pts => { // eşdoğrusal köşeleri at
    let out = pts.slice(), ch = true;
    while (ch && out.length > 3) { ch = false; for (let i = 0; i < out.length; i++) { const a = out[(i + out.length - 1) % out.length], b = out[i], c = out[(i + 1) % out.length]; const x = M.cross(M.sub(b, a), M.sub(c, b)); if (M.len(x) < 1e-9 * Math.max(1, M.dist(a, c) ** 2) || M.dist(a, b) < 1e-7) { out.splice(i, 1); ch = true; break; } } }
    return out;
  };
  const chainLoops = segs => { // yönsüz kenarları kapalı halkalara bağla
    const adj = new Map(); const add = (k, j) => { if (!adj.has(k)) adj.set(k, []); adj.get(k).push(j); };
    segs.forEach((s, i) => { add(key(s[0]), i); add(key(s[1]), i); });
    const used = new Uint8Array(segs.length), loops = [];
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue; used[i] = 1; const pts = [segs[i][0]]; let cur = segs[i][1], k0 = key(segs[i][0]), guard = 0;
      while (key(cur) !== k0 && guard++ < 100000) { pts.push(cur); const nx = (adj.get(key(cur)) || []).find(j => !used[j]); if (nx == null) break; used[nx] = 1; const s = segs[nx]; cur = key(s[0]) === key(cur) ? s[1] : s[0]; }
      if (key(cur) === k0 && pts.length >= 3) loops.push(pts);
    }
    return loops;
  };
  const loopArea = (pts, n) => { let s = [0, 0, 0]; for (let i = 0; i < pts.length; i++) s = M.add(s, M.cross(pts[i], pts[(i + 1) % pts.length])); return M.dot(s, n) / 2; };
  const orient = (pts, n) => loopArea(pts, n) < 0 ? pts.slice().reverse() : pts;

  /* bir varlığın ti. üçgenini içeren düzlemsel yüz -> {pts (dünya, n'e göre CCW), n} */
  const fpCache = new Map();
  C.facePoly = (e, ti, nHint) => {
    const ck = e.id + ':' + ti + ':' + (C.rev || 0); if (fpCache.has(ck)) return fpCache.get(ck);
    const t = C.entTris(e); if (!t) return null; const Pp = t.pos, nT = Pp.length / 9; if (ti >= nT) return null;
    const tp = i => [[Pp[i * 9], Pp[i * 9 + 1], Pp[i * 9 + 2]], [Pp[i * 9 + 3], Pp[i * 9 + 4], Pp[i * 9 + 5]], [Pp[i * 9 + 6], Pp[i * 9 + 7], Pp[i * 9 + 8]]];
    const nrmOf = q => { const c = M.cross(M.sub(q[1], q[0]), M.sub(q[2], q[0])), l = M.len(c); return l < 1e-14 ? null : M.mul(c, 1 / l); };
    const T0 = tp(ti); let n0 = nrmOf(T0); if (!n0) return null; if (nHint && M.dot(n0, nHint) < 0) n0 = M.mul(n0, -1);
    const d0 = M.dot(n0, T0[0]), tris = [];
    for (let i = 0; i < nT; i++) { const q = tp(i), n = nrmOf(q); if (!n || Math.abs(M.dot(n, n0)) < 0.99999) continue; if (q.some(p => Math.abs(M.dot(n0, p) - d0) > 1e-5)) continue; tris.push(q); }
    const ek = (a, b) => { const ka = key(a), kb = key(b); return ka < kb ? ka + '|' + kb : kb + '|' + ka; };
    const eMap = new Map(); tris.forEach((q, i) => { for (let k = 0; k < 3; k++) { const kk = ek(q[k], q[(k + 1) % 3]); if (!eMap.has(kk)) eMap.set(kk, []); eMap.get(kk).push(i); } });
    const k0 = T0.map(key).join(';'), s = tris.findIndex(q => q.map(key).join(';') === k0); if (s < 0) return null;
    const comp = new Set([s]), st = [s];
    while (st.length) { const i = st.pop(), q = tris[i]; for (let k = 0; k < 3; k++) for (const j of eMap.get(ek(q[k], q[(k + 1) % 3]))) if (!comp.has(j)) { comp.add(j); st.push(j); } }
    const bnd = []; for (const i of comp) { const q = tris[i]; for (let k = 0; k < 3; k++) { const lst = eMap.get(ek(q[k], q[(k + 1) % 3])).filter(j => comp.has(j)); if (lst.length === 1) bnd.push([q[k], q[(k + 1) % 3]]); } }
    const loops = chainLoops(bnd).map(l => simplify(orient(l, n0))); if (!loops.length) return null;
    loops.sort((a, b) => Math.abs(loopArea(b, n0)) - Math.abs(loopArea(a, n0)));
    const out = { pts: loops[0], n: n0, holes: loops.slice(1) };
    if (fpCache.size > 200) fpCache.clear(); fpCache.set(ck, out); return out;
  };

  /* bir noktadaki kapalı bölge: kapalı çoklu çizgi, daire, uç uca çizgiler (yatay ya da eğik düzlemde) */
  const newell = pts => { let n = [0, 0, 0]; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; n[0] += (a[1] - b[1]) * ((a[2] || 0) + (b[2] || 0)); n[1] += ((a[2] || 0) - (b[2] || 0)) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); } const l = M.len(n); if (l < 1e-12) return null; n = M.mul(n, 1 / l); const d = M.dot(n, pts[0]); if (pts.some(p => Math.abs(M.dot(n, p) - d) > 1e-4)) return null; if (n[2] < -1e-9 || (Math.abs(n[2]) < 1e-9 && (n[1] < -1e-9 || (Math.abs(n[1]) < 1e-9 && n[0] < 0)))) n = M.mul(n, -1); return n; };
  const regionsOf = ents => {
    const out = [], lines = [];
    for (const e of ents) {
      if (!C.layer(e.layer).on) continue;
      if (e.type === 'circle') { out.push({ src: [e], circle: { c: M.p3(e.c), r: e.r }, n: [0, 0, 1], pts: circPts(e.r).map(([u, v]) => [e.c[0] + u, e.c[1] + v, e.c[2] || 0]) }); continue; }
      if (e.type === 'pline' && e.closed) { const pr = C.prims(e)[0]; if (!pr || pr.pts.length < 3) continue; const pts = simplify(pr.pts.map(M.p3)), n = newell(pts); if (n) out.push({ src: [e], pts: orient(pts, n), n }); continue; }
      if (e.type === 'line') lines.push(e);
    }
    if (lines.length && lines.length < 3000) {
      const segs = lines.map(e => { const s = [M.p3(e.a), M.p3(e.b)]; s.e = e; return s; });
      const byKey = new Map(); segs.forEach(s => { for (const p of s) { const k = key(p); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(s.e); } });
      for (const lp of chainLoops(segs)) { const n = newell(lp); if (!n) continue; const src = new Set(); for (let i = 0; i < lp.length; i++) { const a = key(lp[i]), b = key(lp[(i + 1) % lp.length]); for (const e of byKey.get(a) || []) { const ka = key(e.a), kb = key(e.b); if ((ka === a && kb === b) || (ka === b && kb === a)) src.add(e); } } out.push({ src: [...src], pts: orient(simplify(lp), n), n }); }
    }
    return out;
  };
  C.regionAt = (p, tol = 1e-4, ents) => {
    let best = null;
    for (const r of regionsOf(ents || C.doc.ents)) {
      const d0 = M.dot(r.n, r.pts[0]); if (Math.abs(M.dot(r.n, p) - d0) > tol) continue;
      const F = C.planeFrame(r.n), o = r.pts[0], poly = r.pts.map(q => toLocal(F, o, q));
      if (!C.pointInPoly(toLocal(F, o, p), poly)) continue;
      const A = Math.abs(M.polyArea(poly)); if (!best || A < best.A) best = Object.assign({ kind: 'region', A }, r);
    }
    return best;
  };
  const isFlatK = e => e.type === 'kati' && Math.abs(e.h || 0) < EPS;
  /* noktadaki ağ yüzü (betik / komut satırı için) */
  const meshFaceAt = p => {
    const ents = C.doc.ents.filter(isFlatK).concat(C.doc.ents.filter(e => !isFlatK(e)));
    for (const e of ents) {
      if (!C.layer(e.layer).on || e.type === 'sheet') continue; const t = C.entTris(e); if (!t) continue;
      const bb = C.bbox(e); if (p[0] < bb[0] - 1 || p[0] > bb[2] + 1 || p[1] < bb[1] - 1 || p[1] > bb[3] + 1) continue;
      const Pp = t.pos;
      for (let i = 0; i < Pp.length; i += 9) {
        const a = [Pp[i], Pp[i + 1], Pp[i + 2]], b = [Pp[i + 3], Pp[i + 4], Pp[i + 5]], c = [Pp[i + 6], Pp[i + 7], Pp[i + 8]];
        const n = M.cross(M.sub(b, a), M.sub(c, a)), l = M.len(n); if (l < 1e-14) continue; const nn = M.mul(n, 1 / l);
        if (Math.abs(M.dot(nn, M.sub(p, a))) > 1e-4) continue;
        const s1 = M.dot(M.cross(M.sub(b, a), M.sub(p, a)), nn), s2 = M.dot(M.cross(M.sub(c, b), M.sub(p, b)), nn), s3 = M.dot(M.cross(M.sub(a, c), M.sub(p, c)), nn);
        if (s1 >= -1e-9 && s2 >= -1e-9 && s3 >= -1e-9) { const vn = [t.nrm[i] + t.nrm[i + 3] + t.nrm[i + 6], t.nrm[i + 1] + t.nrm[i + 4] + t.nrm[i + 7], t.nrm[i + 2] + t.nrm[i + 5] + t.nrm[i + 8]]; return { e, ti: i / 9, n: M.dot(nn, vn) < 0 ? M.mul(nn, -1) : nn, p }; }
      }
    }
    return null;
  };
  /* İT/ÇEK hedefi: önce bölge (çizgilerle kapatılmış alan), sonra ağ yüzü */
  C.faceTarget = (p, hit) => {
    if (!p) return null;
    const lf = hit || (E.lastFace && M.dist(E.lastFace.p, p) < 1e-9 ? E.lastFace : null);
    const reg = C.regionAt(p);
    if (reg) { const dh = drawnInside(reg.pts, reg.n, p, reg.src); if (dh.length) reg.drawnHoles = dh.map(r => r.pts); }
    if (reg) { let n = reg.n; if (lf && M.dot(lf.n, n) < 0) n = M.mul(n, -1); else if (!lf && C.views && C.views.v3 && C.views.v3.visible()) { const eye = C.views.v3.eye(), o = C.views.v3.origin; if (M.dot(M.sub([eye[0] + o[0], eye[1] + o[1], eye[2]], p), n) < 0) n = M.mul(n, -1); } return Object.assign({}, reg, { n, pts: orient(reg.pts, n) }); }
    const mf = lf && lf.e ? lf : meshFaceAt(p); if (!mf) return null;
    const fp = C.facePoly(mf.e, mf.ti, mf.n); if (!fp) return null;
    const out = { kind: 'mesh', e: mf.e, ti: mf.ti, pts: fp.pts, n: fp.n, holes: fp.holes };
    const dh = drawnInside(fp.pts, fp.n, p, []); if (dh.length) { out.drawnHoles = dh.map(r => r.pts); out.hp = p; }
    return out;
  };
  /* yüzün üzerine çizilmiş, tıklanan noktayı içermeyen kapalı şekiller (SketchUp gibi yüzü böler: halka bölge) */
  const drawnInside = (pts, n, p, exclude) => {
    const F = C.planeFrame(n), o = pts[0], poly = pts.map(q => toLocal(F, o, q)), d0 = M.dot(n, o), out = [];
    for (const r of regionsOf(C.doc.ents)) {
      if (exclude && r.src.some(e => exclude.includes(e))) continue;
      if (Math.abs(Math.abs(M.dot(r.n, n)) - 1) > 1e-6 || Math.abs(M.dot(n, r.pts[0]) - d0) > 1e-4) continue;
      const rl = r.pts.map(q => toLocal(F, o, q));
      if (!rl.every(q => C.pointInPoly(q, poly))) continue;
      if (C.pointInPoly(toLocal(F, o, p), rl)) continue;
      if (Math.abs(M.polyArea(rl)) >= Math.abs(M.polyArea(poly)) * 0.999) continue;
      if (out.some(q => C.pointInPoly(rl[0], q.l))) continue; // iç içe olanlardan yalnız dıştaki
      for (let i = out.length - 1; i >= 0; i--) if (C.pointInPoly(out[i].l[0], rl)) out.splice(i, 1);
      out.push({ pts: r.pts, l: rl });
    }
    return out;
  };
  C.hoverFace = (v, p) => {
    if (!p) return null; const h = v.mouse ? v.pick(v.mouse[0], v.mouse[1]) : null;
    const f = C.faceTarget(h ? h.p : p, h); v._hf = f; return f ? f.pts : null;
  };

  /* ---------- delme / cep (SketchUp gibi: yüzdeki şekli katının içine it) ---------- */
  const triAt = (e, fn) => { const t = C.entTris(e); if (!t) return null; const P = t.pos; for (let i = 0; i < P.length; i += 9) { const r = fn([P[i], P[i + 1], P[i + 2]], [P[i + 3], P[i + 4], P[i + 5]], [P[i + 6], P[i + 7], P[i + 8]], i / 9, [t.nrm[i] + t.nrm[i + 3] + t.nrm[i + 6], t.nrm[i + 1] + t.nrm[i + 4] + t.nrm[i + 7], t.nrm[i + 2] + t.nrm[i + 5] + t.nrm[i + 8]]); if (r) return r; } return null; };
  const isFlat = e => e && e.type === 'kati' && Math.abs(e.h || 0) < EPS;
  const in3dX = () => C.viewName && C.viewName() === '3d';
  const hostFaceAt = (p, n, ex) => {
    for (const e of C.doc.ents) {
      if (ex.has(e) || isFlat(e) || !C.layer(e.layer).on || e.type === 'sheet') continue;
      const bb = C.bbox(e); if (p[0] < bb[0] - 0.01 || p[0] > bb[2] + 0.01 || p[1] < bb[1] - 0.01 || p[1] > bb[3] + 0.01) continue;
      const r = triAt(e, (a, b, c, ti, vn) => {
        let nn = M.cross(M.sub(b, a), M.sub(c, a)); const l = M.len(nn); if (l < 1e-14) return null; nn = M.mul(nn, 1 / l);
        if (Math.abs(M.dot(nn, n)) < 0.9999 || Math.abs(M.dot(nn, M.sub(p, a))) > 1e-4) return null;
        const s1 = M.dot(M.cross(M.sub(b, a), M.sub(p, a)), nn), s2 = M.dot(M.cross(M.sub(c, b), M.sub(p, b)), nn), s3 = M.dot(M.cross(M.sub(a, c), M.sub(p, c)), nn);
        if (s1 < -1e-9 || s2 < -1e-9 || s3 < -1e-9) return null;
        return { e, ti, n: M.dot(nn, vn) < 0 ? M.mul(nn, -1) : nn };
      });
      if (r) return r;
    }
    return null;
  };
  const rayEnt = (e, o, d) => { let best = null; triAt(e, (a, b, c, ti) => { const e1 = M.sub(b, a), e2 = M.sub(c, a), h = M.cross(d, e2), det = M.dot(e1, h); if (Math.abs(det) < 1e-14) return null; const f = 1 / det, s0 = M.sub(o, a), u = f * M.dot(s0, h); if (u < -1e-9 || u > 1 + 1e-9) return null; const q = M.cross(s0, e1), v = f * M.dot(d, q); if (v < -1e-9 || u + v > 1 + 1e-9) return null; const t = f * M.dot(e2, q); if (t > 1e-7 && (!best || t < best.t)) best = { t, ti }; return null; }); return best; };
  const centroid = pts => pts.reduce((s, q) => M.add(s, q), [0, 0, 0]).map(v => v / pts.length);
  C.prepCut = f => {
    const flat = f.kind === 'region' || isFlat(f.e); if (!flat) return null;
    const ex = new Set([...(f.src || []), f.e].filter(Boolean)), c = f.circle ? M.p3(f.circle.c) : centroid(f.pts);
    let hf = hostFaceAt(c, f.n, ex), owner = null; if (!hf) return null;
    if (hf.e.type === 'grup3' && C.partAt) { const r = C.partAt(hf.e, c, hf.n); if (!r) return null; owner = hf.e; hf = { e: r.part, ti: r.ti, n: hf.n }; }
    if (!['kati', 'box', 'slab'].includes(hf.e.type)) return { e: hf.e, owner, unsupported: true, nOut: hf.n };
    const hit = rayEnt(hf.e, M.sub(c, M.mul(hf.n, 1e-6)), M.mul(hf.n, -1)); if (!hit) return null;
    return { e: hf.e, owner, nOut: hf.n, t: hit.t + 1e-6, c, ti: hf.ti, backTi: hit.ti };
  };
  const cutApply = (f, cut, depth) => {
    const e = cut.e, n = cut.nOut, circ = !!f.circle || (f.e && f.e.prof && !Array.isArray(f.e.prof));
    // şekil, tıklanan yüzün içinde mi?
    const fp = C.facePoly(e, cut.ti, n);
    if (fp) { const F = C.planeFrame(fp.n), o = fp.pts[0], P2 = fp.pts.map(q => toLocal(F, o, q)); if (f.pts.some(q => !C.pointInPoly(toLocal(F, o, q), P2) && distTo2(toLocal(F, o, q), P2) > 1e-6)) throw new Error('Şekil yüzün dışına taşıyor; delik açılamaz'); }
    const thru = depth >= cut.t - 1e-5, D = thru ? cut.t : depth;
    if (e.type === 'box') boxToKati(e);
    let Lp, dir;
    if (e.type === 'slab') { const z = e.z || 0; Lp = f.pts.map(q => [q[0], q[1], q[2] - z]); dir = M.mul(n, -1); }
    else if (e.type === 'kati') { const uy = M.cross(e.uz, e.ux), loc = q => { const v2 = M.sub(q, e.o); return [M.dot(v2, e.ux), M.dot(v2, uy), M.dot(v2, e.uz)]; }; Lp = f.pts.map(loc); const ni = M.mul(n, -1); dir = [M.dot(ni, e.ux), M.dot(ni, uy), M.dot(ni, e.uz)]; }
    else throw new Error('Bu nesnede delik açılamıyor');
    e.holes = (e.holes || []).concat([{ L: Lp, dir: M.norm(dir), D, thru, circ }]);
    C.remove(f.src || [f.e]); C.touch(e); if (cut.owner) { delete cut.owner._c; C.touch(cut.owner); }
    C.log(thru ? 'Delik açıldı (boydan boya).' : `Cep açıldı: derinlik ${M.fmt(depth, 3)} m.`);
    return e;
  };
  const distTo2 = (p, poly) => { let d = Infinity; for (let i = 0; i < poly.length; i++) d = Math.min(d, M.segDist(p, poly[i], poly[(i + 1) % poly.length])); return d; };


  /* kutuyu aynı konum ve yönde katıya çevir (kimliği korunur) */
  const boxToKati = e => {
    const fr = C.frame(e.o, e.rot), keep = { id: e.id, layer: e.layer, color: e.color, lt: e.lt, lw: e.lw }, b = { o: M.p3(e.o), sx: e.sx, sy: e.sy, sz: e.sz };
    for (const k of Object.keys(e)) delete e[k];
    Object.assign(e, keep, { type: 'kati', o: b.o, ux: fr.ux, uz: [0, 0, 1], prof: [[0, 0], [b.sx, 0], [b.sx, b.sy], [0, b.sy]], h: b.sz, holes: [] });
    return e;
  };
  /* ---------- SERBEST ÇOKYÜZLÜ KATI (esnetilmiş / eğilmiş katılar) ---------- */
  const newellN = pts => { let n = [0, 0, 0]; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); } const l = M.len(n); return l < 1e-14 ? null : M.mul(n, 1 / l); };
  const polyTris = e => { // [{f:[i,j,k]}], yüzlerin üçgenlenmesi
    const out = [];
    for (const fc of e.faces) {
      const pts = fc.map(i => e.v[i]), n = newellN(pts); if (!n) continue;
      if (fc.length === 3) { out.push(fc.slice()); continue; }
      const F = C.planeFrame(n, M.sub(pts[1], pts[0])), q = pts.map(p => toLocal(F, pts[0], p));
      for (const t of C.earClip(q)) out.push([fc[t[0]], fc[t[1]], fc[t[2]]]);
    }
    return out;
  };
  const polyVol = e => { let V = 0; for (const [a, b, c] of polyTris(e)) V += M.dot(e.v[a], M.cross(e.v[b], e.v[c])) / 6; return Math.abs(V); };
  const polyEdges = e => { // yumuşak kenarlar (yüz normalleri ~20°'den az farklı) çizilmez
    const nf = e.faces.map(fc => newellN(fc.map(i => e.v[i]))), owner = new Map();
    e.faces.forEach((fc, fi) => { for (let i = 0; i < fc.length; i++) { const a = fc[i], b = fc[(i + 1) % fc.length], k = a < b ? a + '_' + b : b + '_' + a; if (!owner.has(k)) owner.set(k, []); owner.get(k).push(fi); } });
    const out = []; for (const [k, fs] of owner) { const [a, b] = k.split('_').map(Number); if (M.dist(e.v[a], e.v[b]) <= 1e-9) continue; if (fs.length === 2 && nf[fs[0]] && nf[fs[1]] && M.dot(nf[fs[0]], nf[fs[1]]) > 0.94) continue; out.push([e.v[a], e.v[b]]); }
    return out; };
  T.poly3 = {
    label: 'Çokyüzlü katı', ifc: 'IfcBuildingElementProxy',
    prims: e => polyEdges(e).filter(([a, b]) => M.dist2(a, b) > 1e-9).map(([a, b]) => L(a, b)),
    mesh: e => [{ t: 'tri', v: e.v, f: polyTris(e), edges3: polyEdges(e) }],
    snaps: e => { const out = []; e.v.forEach(p => out.push({ p, k: 'end' })); for (const [a, b] of polyEdges(e)) out.push({ p: M.lerp(a, b, 0.5), k: 'mid' }); return out; },
    xf: (e, X) => { const z0 = Math.min(...e.v.map(p => p[2] || 0)), s = X.s || 1; e.v = e.v.map(p => { const r = X.p(p); return [r[0], r[1], r[2] - (p[2] || 0) + z0 + ((p[2] || 0) - z0) * s]; }); if (X.mir) e.faces = e.faces.map(f => f.slice().reverse()); },
    info: e => `${e.v.length} köşe · ${e.faces.length} yüz · hacim=${M.fmt(polyVol(e), 3)} m³`,
  };
  /* katıyı (deliksiz) çokyüzlüye çevir — kimlik ve katman korunur */
  const katiToPoly = e => {
    if ((e.holes || []).length) throw new Error('Delikli katıda bu yönde esnetme yapılamaz (yalnız yüz doğrultusunda / düz uzatma yapılabilir)');
    let pr = profPts(e).slice(); if (M.polyArea(pr) < 0) pr.reverse(); const n = pr.length, h = e.h || 0;
    const v = pr.map(([u, w]) => W(e, u, w, 0)).concat(pr.map(([u, w]) => W(e, u, w, h)));
    const faces = [[...Array(n).keys()].reverse(), [...Array(n).keys()].map(i => i + n)];
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; faces.push([i, j, j + n, i + n]); }
    const keep = { id: e.id, layer: e.layer, color: e.color, lt: e.lt, lw: e.lw };
    for (const k of Object.keys(e)) delete e[k];
    return Object.assign(e, keep, { type: 'poly3', v, faces });
  };
  const polyFaceIdx = (e, fp) => { // seçilen yüz poligonuna karşılık gelen yüz
    const n = fp.n, d0 = M.dot(n, fp.pts[0]); let best = -1;
    e.faces.forEach((fc, i) => { const pts = fc.map(k => e.v[k]), nn = newellN(pts); if (!nn || M.dot(nn, n) < 0.999) return; if (pts.every(p => Math.abs(M.dot(n, p) - d0) < 1e-5)) best = i; });
    return best;
  };
  /* ---------- ESNET: yüzü ölçülü taşı, katı uzasın / eğilsin (SketchUp'ta yüz seçip Taşı) ---------- */
  C.stretchFace = (f, delta) => {
    if (f.e && f.e.type === 'grup3') return C.grupDelegate(f, f2 => C.stretchFace(f2, delta));
    let e = f.e; const n = f.n, len = M.len(delta); if (len < 1e-12) return e;
    if (e.type === 'box') boxToKati(e);
    if (e.type === 'kati') {
      const h = e.h || 0, uy = M.cross(e.uz, e.ux);
      if (Math.abs(h) < EPS) { e.o = M.add(e.o, delta); C.touch(e); return e; } // tek yüz: taşı
      const c = M.dot(n, e.uz), dw = M.dot(delta, e.uz), lat = M.sub(delta, M.mul(e.uz, dw));
      if (Math.abs(c) > 0.9999 && M.len(lat) < 1e-9) { // üst / alt yüz düşey
        if (c > 0) e.h = h + dw; else { e.o = M.add(e.o, M.mul(e.uz, dw)); e.h = h - dw; }
        if (e.h <= 1e-6) throw new Error('Yükseklik sıfırın altına inemez'); C.touch(e); return e;
      }
      if (Math.abs(c) < 1e-6 && Math.abs(dw) < 1e-9 && Array.isArray(e.prof)) { // yan yüz yatay: profil kenarını kaydır
        const pr = e.prof, m = pr.length; let fi = -1;
        for (let i = 0; i < m; i++) { const A = W(e, pr[i][0], pr[i][1], 0), B = W(e, pr[(i + 1) % m][0], pr[(i + 1) % m][1], 0); if (Math.abs(M.dot(n, M.sub(A, f.pts[0]))) < 1e-5 && Math.abs(M.dot(n, M.sub(B, f.pts[0]))) < 1e-5) { fi = i; break; } }
        if (fi >= 0) {
          const du = M.dot(delta, e.ux), dv = M.dot(delta, uy), a0 = M.polyArea(pr), np = pr.map((q, i) => (i === fi || i === (fi + 1) % m) ? [q[0] + du, q[1] + dv] : q);
          if (M.polyArea(np) * a0 <= 0) throw new Error('Bu kadar esnetme şekli ters çevirir');
          e.prof = np; C.touch(e); return e;
        }
      }
      if (!Array.isArray(e.prof)) throw new Error('Silindirin yan yüzü esnetilemez; üst/alt yüzü düşey esnetebilirsiniz');
      katiToPoly(e);
    }
    if (e.type === 'slab') {
      const c = n[2];
      if (Math.abs(c) > 0.9999 && Math.hypot(delta[0], delta[1]) < 1e-9) { if (c > 0) e.t += delta[2]; else { e.z = (e.z || 0) + delta[2]; e.t -= delta[2]; } if (e.t <= 1e-6) throw new Error('Kalınlık sıfırın altına inemez'); C.touch(e); return e; }
      if (Math.abs(c) < 1e-6 && Math.abs(delta[2]) < 1e-9) { const m = e.pts.length; for (let i = 0; i < m; i++) { const A = e.pts[i], B = e.pts[(i + 1) % m]; if (Math.abs(M.dot(n, M.sub([A[0], A[1], f.pts[0][2]], f.pts[0]))) < 1e-5 && Math.abs(M.dot(n, M.sub([B[0], B[1], f.pts[0][2]], f.pts[0]))) < 1e-5) { e.pts = e.pts.map((q, k) => (k === i || k === (i + 1) % m) ? [q[0] + delta[0], q[1] + delta[1], q[2] || 0] : q); C.touch(e); return e; } } }
      throw new Error('Döşemede yalnız üst/alt yüz düşey, yan yüzler yatay esnetilebilir');
    }
    if (e.type === 'poly3') {
      const fi = polyFaceIdx(e, f); if (fi < 0) throw new Error('Esnetilecek yüz bulunamadı');
      const mv = new Set(e.faces[fi]); e.v = e.v.map((p, i) => mv.has(i) ? M.add(p, delta) : p); C.touch(e); return e;
    }
    throw new Error(`${(T[e.type] || {}).label || e.type} yüzü esnetilemez (katı, kutu, döşeme ve çokyüzlü katılarda çalışır)`);
  };
  let lastStretch = null;
  const stretchCmd = async (I) => {
    let f = null;
    if (C.selFace && C.byId(C.selFace.e.id)) { const sf = C.selFace; f = { kind: 'mesh', e: sf.e, ti: sf.ti, pts: sf.pts, n: sf.n, p: sf.p }; C.selFace = null; C.emit('selection'); }
    else {
      E.hover = 'face'; E.noSnap = true;
      const p = await I.pt('Esnetilecek yüze tıklayın'); E.hover = null; E.noSnap = false; if (C.views && C.views.v3) C.views.v3.hoverPoly = null;
      if (!p || typeof p === 'string') return;
      f = C.faceTarget(p); if (!f || f.kind !== 'mesh') { C.warn('Burada bir katı yüzü yok.'); return; }
    }
    const cen = C.polyCentroid3(f.pts, f.n) || f.pts[0];
    E.hl = f.pts; E.preview = c => [P(f.pts, true)];
    let b = await E.ask('pt', 'Taban noktası (Enter = yüz merkezi)', { def: 'MERKEZ' }); if (b === 'MERKEZ' || b == null) b = cen; if (typeof b === 'string') return;
    E.base = b;
    E.preview = c => { const d = M.sub(c, b), q = f.pts.map(x => M.add(x, d)), out = [P(f.pts, true), P(q, true)]; for (let i = 0; i < f.pts.length; i += Math.max(1, Math.floor(f.pts.length / 12))) out.push(L(f.pts[i], q[i])); return out; };
    E.tagFn = c => { const d = M.sub(c, b); return 'Esnet ' + M.fmt(M.len(d), 3) + ' m' + (Math.abs(d[2]) > 1e-6 && Math.hypot(d[0], d[1]) > 1e-6 ? ` (Δz ${M.fmt(d[2], 3)})` : ''); };
    const t = await I.pt('Hedef nokta (mesafe yazın: imleç yönünde; @dx,dy,dz)'); E.preview = null; E.tagFn = null; E.hl = null;
    if (!t || typeof t === 'string') return;
    const delta = M.sub(t, b); const r = C.stretchFace(f, delta); lastStretch = delta;
    C.lastEnt = r; C.log(`Yüz esnetildi: ${M.fmt(M.len(delta), 3)} m → ${C.describe(r)}`);
  };
  C.addCommand(['ESNET', 'YUZTASI', 'STRETCHFACE', 'SF'], 'SketchUp tarzı yüz esnetme: bir yüzü seçin (ya da tıklayın), taban noktası (Enter = yüz merkezi) ve hedef verin; mesafe yazarsanız imleç yönünde, kırmızı/yeşil/mavi eksene kilitlenerek uygulanır. Katı uzar, kısalır ya da eğilir.', stretchCmd);
  { const origMove = C.cmds.MOVE.fn; // 3B'de yüz seçiliyken TAŞI = esnet (SketchUp gibi)
    C.addCommand(['MOVE', 'M', 'TASI'], C.cmds.MOVE.help + ' — 3B görünümde bir yüz seçiliyse o yüzü esnetir.', async (I, Cx) => { if (in3dX() && C.selFace && C.byId(C.selFace.e.id) && !(C.selFace.e.type === 'kati' && Math.abs(C.selFace.e.h || 0) < EPS)) return stretchCmd(I); return origMove(I, Cx); }); }

  /* ---------- İT / ÇEK ---------- */
  const ppApply = (f, d) => {
    if (f.kind === 'mesh' && f.e && f.e.type === 'grup3') return C.grupDelegate(f, f2 => ppApply(f2, d));
    if (f.cut === undefined) f.cut = C.prepCut(f);
    if (f.cut && d * M.dot(f.n, f.cut.nOut) < 0) {
      if (f.cut.unsupported) throw new Error(`${(T[f.cut.e.type] || {}).label || f.cut.e.type} içine delik henüz açılamıyor (katı, kutu ve döşemede çalışır). Yüzü dışarı çekebilirsiniz.`);
      return cutApply(f, f.cut, Math.abs(d));
    }
    if (f.drawnHoles && f.drawnHoles.length && !(f.cut && d * M.dot(f.n, f.cut.nOut) < 0)) { // halka bölge: delikli prizma
      const F = C.planeFrame(f.n, M.sub(f.pts[1], f.pts[0])), o = f.pts[0], src = f.kind === 'region' ? f.src[0] : f.e;
      const k = C.newKati(o, F, f.pts.map(q => toLocal(F, o, q)), d, { layer: src.layer, color: src.color });
      normK(k); const z0 = d < 0 ? Math.abs(d) : 0;
      k.holes = f.drawnHoles.map(L => ({ L: L.map(q => { const t = toLocal(F, o, q); return [t[0], t[1], z0]; }), dir: [0, 0, d < 0 ? -1 : 1], D: Math.abs(d), thru: true }));
      if (f.kind === 'region') C.remove(f.src);
      C.add(k); return autoJoin(f.kind === 'region' ? f : { cut: { e: f.e, nOut: f.n } }, k);
    }
    if (f.kind === 'region') {
      const F = C.planeFrame(f.n), s0 = f.src[0], props = { layer: s0.layer, color: s0.color, lt: s0.lt, lw: s0.lw };
      const k = f.circle ? C.newKati(f.circle.c, F, { r: f.circle.r }, d, props) : C.newKati(f.pts[0], F, f.pts.map(q => toLocal(F, f.pts[0], q)), d, props);
      if (f.circle && f.n[2] < 0) { k.uz = [0, 0, 1]; k.ux = [1, 0, 0]; k.h = -d; }
      C.remove(f.src); C.add(normK(k)); return autoJoin(f, k);
    }
    const e = f.e, n = f.n, up = [0, 0, 1];
    if (e.type === 'kati') {
      const c = M.dot(n, e.uz);
      if (Math.abs(c) > 0.9999) { const wasFlat = Math.abs(e.h || 0) < EPS; if (c > 0) e.h = (e.h || 0) + d; else { e.o = M.sub(e.o, M.mul(e.uz, d)); e.h = (e.h || 0) + d; } normK(e); C.touch(e); return wasFlat ? autoJoin(f, e) : e; }
      if (Math.abs(c) < 1e-6 && Array.isArray(e.prof) && Math.abs(e.h || 0) > EPS && !(f.holes && f.holes.length)) { // tam yan yüz: katının kendisini uzat
        const fa = loopArea(f.pts, n), pr = e.prof, m = pr.length;
        for (let i = 0; i < m; i++) { const a = pr[i], b = pr[(i + 1) % m]; if (Math.abs(Math.hypot(b[0] - a[0], b[1] - a[1]) * e.h - Math.abs(fa)) < 1e-6 * Math.max(1, Math.abs(fa))) { try { return C.stretchFace(f, M.mul(n, d)); } catch (er) { break; } } }
      }
    }
    if (e.type === 'box') {
      const fr = C.frame(e.o, e.rot), z = M.dot(n, up), ax = M.dot(n, fr.ux), ay = M.dot(n, fr.uy); let ok = true;
      if (z > 0.9999) e.sz += d; else if (z < -0.9999) { e.o = [e.o[0], e.o[1], (e.o[2] || 0) - d]; e.sz += d; }
      else if (ax > 0.9999) e.sx += d; else if (ax < -0.9999) { e.o = M.sub(e.o, M.mul(fr.ux, d)); e.sx += d; }
      else if (ay > 0.9999) e.sy += d; else if (ay < -0.9999) { e.o = M.sub(e.o, M.mul(fr.uy, d)); e.sy += d; } else ok = false;
      if (ok) { if (e.sx <= 1e-6 || e.sy <= 1e-6 || e.sz <= 1e-6) throw new Error('Kutu boyutu sıfırın altına inemez'); C.touch(e); return e; }
    }
    if (e.type === 'poly3') return C.stretchFace(f, M.mul(n, d));
    if (e.type === 'cyl') { const z = M.dot(n, up); if (z > 0.9999) { e.h += d; C.touch(e); return e; } if (z < -0.9999) { e.c = [e.c[0], e.c[1], (e.c[2] || 0) - d]; e.h += d; C.touch(e); return e; } }
    if (e.type === 'slab') { const z = M.dot(n, up); if (z > 0.9999) { e.t += d; C.touch(e); return e; } if (z < -0.9999) { e.z = (e.z || 0) - d; e.t += d; C.touch(e); return e; } }
    if (d < 0) C.warn('Bu nesnede içeri itme boşluk açmaz; yüz ters yöne katı olarak uzatıldı. (Boyut küçültme: ArıtmaCAD katıları, kutu, silindir ve döşemede çalışır.)');
    const F = C.planeFrame(n, M.sub(f.pts[1], f.pts[0])), k = C.newKati(f.pts[0], F, f.pts.map(q => toLocal(F, f.pts[0], q)), d, { layer: e.layer, color: e.color });
    C.add(normK(k)); return d > 0 ? autoJoin({ cut: { e, nOut: n } }, k) : k;
  };
  /* İt/Çek ile bir katının yüzünden çıkan parçayı o katıyla tek parça yap (SketchUp gibi) */
  const JOINABLE = new Set(['kati', 'box', 'poly3', 'grup3', 'cyl']);
  const autoJoin = (f, k) => {
    if (C.autoJoinOff || !C.joinInto) return k;
    const host = f.cut && !f.cut.unsupported ? (f.cut.owner || f.cut.e) : null;
    if (!host || host === k || !JOINABLE.has(host.type) || !C.byId(host.id) || !C.byId(k.id)) return k;
    return C.joinInto(host, k);
  };
  C.pushPull = (p, d, hit) => { const f = C.faceTarget(p, hit); if (!f) return null; return ppApply(f, d); };
  let lastPP = 1;
  C.addCommand(['PUSHPULL', 'PP', 'ITCEK', 'IT', 'CEK'], 'SketchUp tarzı İt/Çek: 3B görünümde bir yüze ya da kapalı bir şeklin (dikdörtgen, daire, çoklu çizgi, uç uca çizgiler) içine tıklayın, imleci sürükleyip tıklayın ya da mesafe yazın. Komut satırı: ITCEK x,y,z mesafe', async (I) => {
    for (; ;) {
      let p, f;
      if (C.selFace && C.byId(C.selFace.e.id)) { const sf = C.selFace; C.selFace = null; C.emit('selection'); p = sf.p; f = { kind: 'mesh', e: sf.e, ti: sf.ti, pts: sf.pts, n: sf.n, holes: sf.holes }; }
      else {
      E.hover = 'face'; E.noSnap = true;
      p = await I.pt('İtilecek / çekilecek yüze tıklayın'); E.hover = null; E.noSnap = false;
      if (C.views && C.views.v3) C.views.v3.hoverPoly = null;
      if (!p || typeof p === 'string') return;
      f = C.faceTarget(p);
      } if (!f) { C.warn('Burada yüz ya da kapalı alan yok. (Önce dikdörtgen/daire/kapalı çoklu çizgi çizin ya da bir 3B nesnenin yüzüne tıklayın.)'); if (E.scriptMode) return; continue; }
      E.base = p; E.axisLock = { o: p, d: f.n }; E.hl = f.pts;
      f.cut = C.prepCut(f);
      if (f.cut && !f.cut.unsupported) E.lockPts = [{ p: M.sub(p, M.mul(f.cut.nOut, f.cut.t)), name: 'Arka yüz — tıklayın: boydan boya delik' }];
      const dOf = c => M.dot(M.sub(c, p), f.n);
      E.preview = c => { let dd = dOf(c); if (f.cut && !f.cut.unsupported && dd < -f.cut.t) dd = -f.cut.t; const q = f.pts.map(x => M.add(x, M.mul(f.n, dd))), out = [P(f.pts, true), P(q, true)], st = Math.max(1, Math.floor(f.pts.length / 16)); for (let i = 0; i < f.pts.length; i += st) out.push(L(f.pts[i], q[i])); return out; };
      E.tagFn = c => { const dd = dOf(c); return (f.cut && !f.cut.unsupported && dd < 0 ? (-dd >= f.cut.t - 1e-5 ? 'Delik ' : 'Cep derinliği ') : 'Mesafe ') + M.fmt(Math.abs(dd) === dd ? dd : (f.cut && !f.cut.unsupported ? -dd : dd), 3) + ' m'; };
      const v = await E.ask('pt', 'Mesafe (sürükleyip tıklayın ya da yazın; eksi = içeri)', { num: true, def: lastPP });
      E.axisLock = null; E.preview = null; E.base = null; E.tagFn = null; E.hl = null; E.lockPts = null;
      const d = typeof v === 'number' ? v : Array.isArray(v) ? dOf(v) : null;
      if (d == null || Math.abs(d) < 1e-9) { if (E.scriptMode) return; continue; }
      const r = ppApply(f, d); lastPP = d; C.lastEnt = r; C.log(`İt/Çek: ${M.fmt(d, 3)} m  → ${C.describe(r)}`);
      if (E.scriptMode) return;
    }
  });

  /* ---------- yüzeyde dikdörtgen / daire (3B görünümde) ---------- */
  const in3d = () => C.viewName && C.viewName() === '3d';
  const planeFor = a => {
    const lf = E.lastFace && M.dist(E.lastFace.p, a) < 1e-9 ? E.lastFace : null; if (lf) return lf.n;
    const v = C.views && C.views.v3; if (v) { if (v.plane === 'XZ') return [0, 1, 0]; if (v.plane === 'YZ') return [1, 0, 0]; }
    return [0, 0, 1];
  };
  const origRec = C.cmds.RECTANG.fn, origCircle = C.cmds.CIRCLE.fn;
  C.addCommand(['RECTANG', 'REC', 'DIKDORTGEN'], 'Dikdörtgen. REC köşe1 köşe2 (veya @genişlik,yükseklik). 3B görünümde tıkladığınız yüzün düzleminde çizilir; İT/ÇEK ile hacim verin.', async (I, Cx) => {
    if (!in3d()) return origRec(I, Cx);
    const a = await I.pt('İlk köşe'); if (!a || typeof a === 'string') return;
    const n0 = planeFor(a), hor = Math.abs(n0[2]) > 0.999, F = C.planeFrame(hor ? [0, 0, 1] : n0);
    E.base = a; E.rubber = false; E.plane3 = { o: a, n: F.n, ux: F.ux, uy: F.uy };
    const corners = b => { const v = M.sub(b, a), u = M.dot(v, F.ux), w = M.dot(v, F.uy), p1 = M.add(a, M.mul(F.ux, u)); return [M.p3(a), p1, M.add(p1, M.mul(F.uy, w)), M.add(a, M.mul(F.uy, w))]; };
    E.preview = c => [P(corners(c), true)];
    E.tagFn = c => { const v = M.sub(c, a); return M.fmt(Math.abs(M.dot(v, F.ux)), 3) + ' × ' + M.fmt(Math.abs(M.dot(v, F.uy)), 3); };
    E.clicked = null;
    let b = await I.pt('Karşı köşe (@genişlik,yükseklik — yüz düzleminde)'); E.plane3 = null; E.tagFn = null; if (!b || typeof b === 'string') return;
    if (E.clicked !== b && !hor) b = M.add(M.add(a, M.mul(F.ux, b[0] - a[0])), M.mul(F.uy, b[1] - a[1]));
    const cs = corners(b); if (M.dist(cs[0], cs[2]) < 1e-9 || M.dist(cs[0], cs[1]) < 1e-9 || M.dist(cs[0], cs[3]) < 1e-9) return;
    if (hor) C.lastEnt = C.add(C.newEnt('pline', { pts: cs, closed: true }));
    else C.lastEnt = C.add(C.newKati(a, F, cs.map(q => toLocal(F, a, q)), 0));
  });
  C.addCommand(['CIRCLE', 'C', 'DAIRE', 'CEMBER'], 'Daire. CIRCLE merkez yarıçap | CIRCLE merkez D çap. 3B görünümde tıkladığınız yüzün düzleminde çizilir.', async (I, Cx) => {
    if (!in3d()) return origCircle(I, Cx);
    const c = await I.pt('Merkez'); if (!c || typeof c === 'string') return;
    const n0 = planeFor(c), hor = Math.abs(n0[2]) > 0.999, F = C.planeFrame(hor ? [0, 0, 1] : n0);
    const ring = r => circPts(r).map(([u, v]) => M.add(M.add(c, M.mul(F.ux, u)), M.mul(F.uy, v)));
    E.base = c; E.plane3 = { o: c, n: F.n, ux: F.ux, uy: F.uy }; E.preview = q => [P(ring(M.dist(c, q)), true)]; E.tagFn = q => 'r = ' + M.fmt(M.dist(c, q), 3);
    let r = await E.ask('pt', 'Yarıçap', { num: true, kw: [['D', 'Çap']] });
    if (r === 'D') { E.preview = q => [P(ring(M.dist(c, q) / 2), true)]; const d = await E.ask('pt', 'Çap', { num: true }); r = Array.isArray(d) ? M.dist(c, d) / 2 : d / 2; }
    E.plane3 = null; E.tagFn = null;
    if (Array.isArray(r)) r = M.dist(c, r);
    if (!(r > 0)) return;
    if (hor) C.lastEnt = C.add(C.newEnt('circle', { c: M.p3(c), r }));
    else C.lastEnt = C.add(C.newKati(c, F, { r }, 0));
  });


  /* ---------- YÜZ ÖTELE (SketchUp Offset) ---------- */
  /* CCW çokgeni d kadar içeri (d<0: dışarı) ötele — gönyeli köşeler */
  C.offsetPoly = (pts, d) => {
    const n = pts.length, L = [];
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1e-12) continue; const t = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], m = [-t[1], t[0]]; L.push({ p: [a[0] + m[0] * d, a[1] + m[1] * d], t }); }
    const out = [];
    for (let i = 0; i < L.length; i++) {
      const A = L[(i + L.length - 1) % L.length], B = L[i], den = A.t[0] * B.t[1] - A.t[1] * B.t[0];
      if (Math.abs(den) < 1e-9) { out.push(B.p); continue; }
      const k = ((B.p[0] - A.p[0]) * B.t[1] - (B.p[1] - A.p[1]) * B.t[0]) / den; out.push([A.p[0] + A.t[0] * k, A.p[1] + A.t[1] * k]);
    }
    return out;
  };
  const offsetValid = (src, res, d) => {
    if (res.length < 3) return false; const a0 = M.polyArea(src), a1 = M.polyArea(res); if (a0 * a1 <= 0) return false;
    for (let i = 0; i < res.length; i++) { const p = res[i], q = src[i % src.length]; } // köşe sayısı korunur
    // kenar yönleri ters dönmemeli (çok büyük öteleme)
    for (let i = 0; i < res.length && res.length === src.length; i++) { const a = src[i], b = src[(i + 1) % src.length], c = res[i], e = res[(i + 1) % res.length]; if ((b[0] - a[0]) * (e[0] - c[0]) + (b[1] - a[1]) * (e[1] - c[1]) <= 0) return false; }
    return d > 0 ? Math.abs(a1) < Math.abs(a0) : Math.abs(a1) > Math.abs(a0);
  };
  const distToPoly = (p, poly) => { let d = Infinity; for (let i = 0; i < poly.length; i++) d = Math.min(d, M.segDist(p, poly[i], poly[(i + 1) % poly.length])); return d; };
  let lastOff = 0.3;
  const origOffset = C.cmds.OFFSET.fn;
  C.addCommand(['OFFSET', 'O', 'OTELE'], 'Ötele. Planda: OFFSET mesafe, nesne, taraf. 3B görünümde (SketchUp gibi): bir yüzü seçin ya da tıklayın, imleçle içeri/dışarı sürükleyin veya mesafe yazın (eksi = dışarı); yüzün üstünde yeni bir iç yüz oluşur, İT/ÇEK ile itip çekebilirsiniz.', async (I, Cx) => {
    if (!in3d()) return origOffset(I, Cx);
    let f = null;
    if (C.selFace && C.byId(C.selFace.e.id)) { const sf = C.selFace; f = { kind: 'mesh', e: sf.e, pts: sf.pts, n: sf.n, holes: sf.holes, src: null }; C.selFace = null; C.emit('selection'); }
    else {
      E.hover = 'face'; E.noSnap = true;
      const p = await I.pt('Ötelenecek yüze tıklayın (ya da kapalı şeklin içine)'); E.hover = null; E.noSnap = false; if (C.views && C.views.v3) C.views.v3.hoverPoly = null;
      if (!p || typeof p === 'string') return;
      f = C.faceTarget(p); if (!f) { C.warn('Burada yüz yok. Açık çizgileri ötelemek için Plan sekmesinde OFFSET kullanın.'); return; }
    }
    const F = C.planeFrame(f.n, M.sub(f.pts[1], f.pts[0])), o = f.pts[0], P2 = f.pts.map(q => toLocal(F, o, q));
    const src = M.polyArea(P2) >= 0 ? P2 : P2.slice().reverse();
    const to3 = q => M.add(M.add(o, M.mul(F.ux, q[0])), M.mul(F.uy, q[1]));
    const dOf = c => { const q = toLocal(F, o, c), dd = distToPoly(q, src); return C.pointInPoly(q, src) ? dd : -dd; };
    E.plane3 = { o, n: F.n, ux: F.ux, uy: F.uy }; E.hl = f.pts;
    E.preview = c => { const d = dOf(c), r = C.offsetPoly(src, d); return [P(f.pts, true), P(r.map(to3), true, { color: offsetValid(src, r, d) ? undefined : 1 })]; };
    E.tagFn = c => { const d = dOf(c); return (d >= 0 ? 'İçeri ' : 'Dışarı ') + M.fmt(Math.abs(d), 3) + ' m'; };
    const v = await E.ask('pt', 'Öteleme mesafesi (imleçle gösterin ya da yazın; eksi = dışarı)', { num: true, def: lastOff });
    E.plane3 = null; E.preview = null; E.tagFn = null; E.hl = null;
    const d = typeof v === 'number' ? v : Array.isArray(v) ? dOf(v) : null; if (d == null || Math.abs(d) < 1e-9) return;
    const r = C.offsetPoly(src, d); if (!offsetValid(src, r, d)) { C.warn('Bu mesafe yüz için çok büyük; daha küçük bir değer deneyin.'); return; }
    lastOff = Math.abs(d);
    const pts3 = r.map(to3), props = f.src && f.src[0] ? { layer: f.src[0].layer, color: f.src[0].color } : { layer: (f.e && f.e.layer) || C.doc.cur.layer };
    let made;
    const ring = (f.holes && f.holes.length) || (f.drawnHoles && f.drawnHoles.length); // delikli yüz (ör. perde / duvar üstü halka): yüz değil, tek kapalı çizgi
    if (ring) { made = C.add(C.newEnt('pline', Object.assign({ pts: pts3, closed: true }, props))); delete made.sp; C.lastEnt = made; C.log(`Delikli yüz (duvar üstü): dış kenardan ${d >= 0 ? 'içeri' : 'dışarı'} ${M.fmt(Math.abs(d), 3)} m tek kapalı çizgi çizildi.`); return; }
    if (f.kind === 'region' && Math.abs(F.n[2]) > 0.999 && f.src && f.src[0].type !== 'kati') made = C.add(C.newEnt('pline', Object.assign({ pts: pts3, closed: true }, props)));
    else { const F2 = C.planeFrame(f.n, F.ux); made = C.add(C.newKati(pts3[0], F2, pts3.map(q => toLocal(F2, pts3[0], q)), 0, props)); }
    C.lastEnt = made; C.log(`Yüz ${d >= 0 ? 'içeri' : 'dışarı'} ${M.fmt(Math.abs(d), 3)} m ötelendi. İç yüzü İT/ÇEK ile itip (cep / havuz) ya da çekebilirsiniz.`);
  });

  /* ---------- YÜZ YAP / EKSTRÜZYON ---------- */
  const regionsFromSel = s => regionsOf(s);
  C.addCommand(['YUZYAP', 'YUZ', 'REGION', 'BOLGE'], 'Kapalı çoklu çizgi / daire / uç uca çizgilerden 3B yüz (katı, kalınlık 0) yapar; sonra İT/ÇEK ile hacim verin.', async (I) => {
    const s = await I.sel('Kapalı şekilleri seçin'); if (!s.length) return;
    const rs = regionsFromSel(s); if (!rs.length) { C.warn('Seçimde kapalı düzlemsel şekil yok.'); return; }
    const rm = new Set(); let n = 0;
    for (const r of rs) { const F = C.planeFrame(r.n), s0 = r.src[0], pr = { layer: s0.layer, color: s0.color }; C.add(r.circle ? C.newKati(r.circle.c, F, { r: r.circle.r }, 0, pr) : C.newKati(r.pts[0], F, r.pts.map(q => toLocal(F, r.pts[0], q)), 0, pr)); r.src.forEach(e => rm.add(e)); n++; }
    C.remove([...rm]); C.log(n + ' yüz oluşturuldu.');
  });
  C.addCommand(['EXTRUDE', 'EXT', 'EKSTRUZYON', 'KATIYAP'], 'Kapalı şekilleri (çoklu çizgi, daire, uç uca çizgiler, yüzler) yükseklik vererek katıya çevirir. EXTRUDE seçim yükseklik', async (I) => {
    const s = await I.sel('Kapalı şekilleri / yüzleri seçin'); if (!s.length) return;
    const h = await I.num('Yükseklik (m, eksi = aşağı / içeri)', lastPP); if (!h) return;
    const rs = regionsFromSel(s), rm = new Set(); let n = 0;
    for (const r of rs) { const F = C.planeFrame(r.n), s0 = r.src[0], pr = { layer: s0.layer, color: s0.color }; C.add(normK(r.circle ? C.newKati(r.circle.c, F, { r: r.circle.r }, h, pr) : C.newKati(r.pts[0], F, r.pts.map(q => toLocal(F, r.pts[0], q)), h, pr))); r.src.forEach(e => rm.add(e)); n++; }
    for (const e of s) if (e.type === 'kati' && Math.abs(e.h || 0) < EPS) { e.h = h; normK(e); C.touch(e); n++; }
    C.remove([...rm]); C.log(n ? n + ' katı oluşturuldu.' : 'Seçimde kapalı şekil yok.'); lastPP = h;
  });
  C._sk = { boxToKati, katiToPoly, polyFaceIdx, profPts, W, normK, newellN, toLocal, polyTris, polyVol, loopArea, isFlat };
})(window.C);

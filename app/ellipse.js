/* ArıtmaCAD — ELİPS (AutoCAD ELLIPSE): eksen uçları, merkez (M) ve eliptik yay (Y/A) seçenekleri
   Nesne: { c:[x,y,z] merkez, mj:[x,y] büyük eksen vektörü (yarı eksen), ra: küçük/büyük oranı (≤1), t0,t1: parametre açıları (rad) }
   DXF'e gerçek ELLIPSE olarak yazılır/okunur; yakalama (merkez, çeyrek, uç), tutamaç, budama (TRIM) desteklenir. */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, T = C.T, { P } = C.prim, TAU = Math.PI * 2, RAD = Math.PI / 180;
  const p3 = M.p3;
  const isFull = e => e.t1 == null || Math.abs((e.t1 - (e.t0 || 0)) - TAU) < 1e-9 || Math.abs(e.t1 - (e.t0 || 0)) < 1e-12;
  const sweepOf = e => { if (isFull(e)) return TAU; let s = e.t1 - e.t0; s = ((s % TAU) + TAU) % TAU; return s < 1e-12 ? TAU : s; };
  const mnOf = e => [-e.mj[1] * e.ra, e.mj[0] * e.ra];
  C.ellPt = (e, t) => { const mn = mnOf(e), c = Math.cos(t), s = Math.sin(t); return [e.c[0] + e.mj[0] * c + mn[0] * s, e.c[1] + e.mj[1] * c + mn[1] * s, e.c[2] || 0]; };
  /* oranı ≤1 tut (büyük eksen her zaman mj) */
  const normE = e => {
    if (e.ra > 1 + 1e-12) { const mn = mnOf(e); e.mj = [mn[0], mn[1]]; e.ra = 1 / e.ra; if (!isFull(e)) { e.t0 -= Math.PI / 2; e.t1 -= Math.PI / 2; } }
    if (!isFull(e)) { e.t0 = ((e.t0 % TAU) + TAU) % TAU; e.t1 = e.t0 + sweepOf(e); if (e.t1 >= TAU + 1e-12 && e.t0 >= TAU) { e.t0 -= TAU; e.t1 -= TAU; } }
    else { e.t0 = 0; e.t1 = TAU; }
    return e;
  };
  C.ellNorm = normE;
  const tess = (e, n0) => { const sw = sweepOf(e), full = isFull(e), n = n0 || Math.max(24, Math.ceil(144 * sw / TAU)), out = []; for (let i = 0; i <= n; i++) { if (full && i === n) break; out.push(C.ellPt(e, (full ? 0 : e.t0) + sw * i / n)); } return out; };
  C.ellPts = tess;
  T.ellipse = {
    label: 'Elips',
    prims: e => [P(tess(e), isFull(e), { ell: { c: p3(e.c), mj: e.mj, ra: e.ra, t0: isFull(e) ? 0 : e.t0, t1: isFull(e) ? TAU : e.t1 } })],
    xf: (e, X) => {
      const c = X.p(p3(e.c)), mn = mnOf(e), a = X.p([e.c[0] + e.mj[0], e.c[1] + e.mj[1], e.c[2] || 0]), b = X.p([e.c[0] + mn[0], e.c[1] + mn[1], e.c[2] || 0]);
      const mj = [a[0] - c[0], a[1] - c[1]], m2 = [b[0] - c[0], b[1] - c[1]], lM = Math.hypot(...mj), lm = Math.hypot(...m2);
      const flip = mj[0] * m2[1] - mj[1] * m2[0] < 0;
      e.c = c; e.mj = mj; e.ra = lM > 1e-12 ? lm / lM : e.ra;
      if (flip && !isFull(e)) { const t0 = e.t0, t1 = e.t1; e.t0 = -t1; e.t1 = -t0; }
      normE(e);
    },
    snaps: e => {
      const out = [{ p: p3(e.c), k: 'cen' }], full = isFull(e), sw = sweepOf(e);
      for (let q = 0; q < 4; q++) { const t = q * Math.PI / 2; if (full || ((t - e.t0) % TAU + TAU) % TAU <= sw + 1e-9) out.push({ p: C.ellPt(e, t), k: 'qua' }); }
      if (!full) out.push({ p: C.ellPt(e, e.t0), k: 'end' }, { p: C.ellPt(e, e.t0 + sw), k: 'end' }, { p: C.ellPt(e, e.t0 + sw / 2), k: 'mid' });
      return out;
    },
    info: e => { const a = Math.hypot(...e.mj), b = a * e.ra; return `büyük yarı eksen=${M.fmt(a, 3)} küçük=${M.fmt(b, 3)} oran=${M.fmt(e.ra, 3)}${isFull(e) ? ' alan=' + M.fmt(Math.PI * a * b, 3) + ' m²' : ' yay ' + M.fmt(sweepOf(e) / RAD, 1) + '°'}`; },
  };
  /* noktadan parametre (yerel çerçevede) */
  const tOf = (e, q) => { const a = Math.hypot(...e.mj), u = [e.mj[0] / a, e.mj[1] / a], dx = q[0] - e.c[0], dy = q[1] - e.c[1], x = dx * u[0] + dy * u[1], y = -dx * u[1] + dy * u[0]; return Math.atan2(y / (a * e.ra || 1e-12), x / a); };
  /* açıdan (büyük eksene göre, derece) parametre */
  const tOfAng = (e, deg) => { const a = Math.hypot(...e.mj), b = a * e.ra, t = deg * RAD; return Math.atan2(a * Math.sin(t), b * Math.cos(t)); };
  C.ellT = tOf;

  /* ---------- tutamaçlar ---------- */
  const baseGrips = C.gripsOf;
  C.gripsOf = e => {
    if (e.type !== 'ellipse') return baseGrips(e);
    const G = [], add = (p, k, set) => G.push({ p: p3(p), k, set });
    add(e.c, 'move', (x, q, d) => C.xform(x, C.xMove([d[0], d[1], 0])));
    const full = isFull(e), sw = sweepOf(e);
    for (let k = 0; k < 4; k++) {
      const t = k * Math.PI / 2; if (!full && ((t - e.t0) % TAU + TAU) % TAU > sw + 1e-9) continue;
      add(C.ellPt(e, t), 'qua', (x, q) => {
        const a = Math.hypot(...x.mj), u = [x.mj[0] / a, x.mj[1] / a], dx = q[0] - x.c[0], dy = q[1] - x.c[1];
        if (k % 2 === 0) { const na = Math.max(1e-6, Math.abs(dx * u[0] + dy * u[1])), b = a * x.ra; x.mj = [u[0] * na, u[1] * na]; x.ra = b / na; }
        else { const nb = Math.max(1e-6, Math.abs(-dx * u[1] + dy * u[0])); x.ra = nb / a; }
        normE(x);
      });
    }
    if (!full) {
      add(C.ellPt(e, e.t0), 'end', (x, q) => { const t1 = x.t0 + sweepOf(x); x.t0 = tOf(x, q); let s = ((t1 - x.t0) % TAU + TAU) % TAU; if (s < 1e-6) s = TAU; x.t1 = x.t0 + s; });
      add(C.ellPt(e, e.t0 + sw), 'end', (x, q) => { let s = ((tOf(x, q) - x.t0) % TAU + TAU) % TAU; if (s < 1e-6) s = TAU; x.t1 = x.t0 + s; });
    }
    return G;
  };

  /* ---------- ELLIPSE komutu ---------- */
  const mk = (c, u, a, b) => { // u: ilk eksen birim vektörü, a: ilk yarı eksen, b: diğer
    return a >= b ? { c: p3(c), mj: [u[0] * a, u[1] * a], ra: b / a, t0: 0, t1: TAU, sw: false } : { c: p3(c), mj: [-u[1] * b, u[0] * b], ra: a / b, t0: 0, t1: TAU, sw: true };
  };
  const prev = o => [P(tess(Object.assign({}, o, { t0: 0, t1: TAU }), 96), true)];
  C.addCommand(['ELLIPSE', 'EL', 'ELIPS', 'ELIPSE'], 'Elips (AutoCAD gibi): ELLIPSE eksen-ucu1 eksen-ucu2 diğer-yarı-eksen | M = merkezden | Y (A) = eliptik yay: … başlangıç açısı, bitiş açısı. Diğer eksen sorusunda D = döndürme açısı.', async (I) => {
    let arc = false, center = false;
    let k = await E.ask('pt', 'Elipsin eksen ucu', { kw: [['Y', 'Yay'], ['M', 'Merkez']] }); if (k == null) return;
    if (k === 'A' || k === 'Y') { arc = true; k = await E.ask('pt', 'Eliptik yayın eksen ucu', { kw: [['M', 'Merkez']] }); if (k == null) return; }
    if (k === 'M' || k === 'C') { center = true; k = await I.pt('Elips merkezi'); if (!k || typeof k === 'string') return; }
    if (!Array.isArray(k)) return;
    let c, u, a;
    if (center) {
      c = k; E.base = c; E.rubber = true; const p = await I.pt('Eksen ucu'); if (!p || typeof p === 'string') return;
      a = M.dist2(c, p); if (a < 1e-9) return; u = [(p[0] - c[0]) / a, (p[1] - c[1]) / a];
    } else {
      const p1 = k; E.base = p1; E.rubber = true; const p2 = await I.pt('Eksenin diğer ucu'); if (!p2 || typeof p2 === 'string') return;
      const l = M.dist2(p1, p2); if (l < 1e-9) return; c = M.lerp(p1, p2, 0.5); a = l / 2; u = [(p2[0] - p1[0]) / l, (p2[1] - p1[1]) / l];
    }
    E.base = c; E.rubber = true;
    const bOf = q => Math.max(1e-9, Math.abs(-(q[0] - c[0]) * u[1] + (q[1] - c[1]) * u[0]));
    E.preview = q => prev(mk(c, u, a, bOf(q)));
    let r = await E.ask('pt', 'Diğer eksene uzaklık', { num: true, kw: [['D', 'Döndürme']] }); E.preview = null;
    let b;
    if (r === 'D' || r === 'R') { E.preview = q => { const ang = Math.min(89.4, Math.abs(M.deg(M.ang(c, q)))) * RAD; return prev(mk(c, u, a, a * Math.cos(ang))); }; const ang = await I.num('Ana eksen çevresinde döndürme açısı (0-89.4°)', 45); E.preview = null; if (ang == null) return; b = a * Math.cos(Math.min(89.4, Math.abs(ang)) * RAD); }
    else if (Array.isArray(r)) b = bOf(r); else if (typeof r === 'number') b = Math.abs(r); else return;
    if (!(b > 1e-9)) return;
    const o = mk(c, u, a, b), ent = { c: o.c, mj: o.mj, ra: o.ra, t0: 0, t1: TAU };
    if (arc) {
      // açılar ilk eksene göre (AutoCAD); parametreye çevir
      const first = { c: o.c, mj: [u[0] * a, u[1] * a], ra: b / a };
      const shift = o.sw ? -Math.PI / 2 : 0, toT = deg => tOfAng(first, deg) + shift, ptT = q => tOf(first, q) + shift;
      E.base = c; E.rubber = true;
      E.preview = q => { const t = ptT(q); return [P([C.ellPt(ent, t), p3(c)], false, { lt: 'DASHED' })].concat(prev(o)); };
      const s = await E.ask('pt', 'Başlangıç açısı', { num: true, kw: [['P', 'Parametre']] }); E.preview = null; if (s == null) return;
      let t0 = Array.isArray(s) ? ptT(s) : typeof s === 'number' ? toT(s) : null;
      if (s === 'P') { const v = await I.num('Başlangıç parametresi (°)', 0); if (v == null) return; t0 = v * RAD + shift; }
      if (t0 == null) return;
      E.preview = q => { const t1 = ptT(q); let sw = ((t1 - t0) % TAU + TAU) % TAU; if (sw < 1e-6) sw = TAU; return [P(tess(Object.assign({}, ent, { t0, t1: t0 + sw })), false)]; };
      const f = await E.ask('pt', 'Bitiş açısı', { num: true, kw: [['I', 'İçerilen açı']] }); E.preview = null; if (f == null) return;
      let t1;
      if (f === 'I') { const inc = await I.num('Yayın içerdiği açı (°)', 180); if (inc == null) return; const tf = t0 - shift, s0 = M.deg(Math.atan2(b * Math.sin(tf), a * Math.cos(tf))); t1 = toT(s0 + inc); }
      else t1 = Array.isArray(f) ? ptT(f) : typeof f === 'number' ? toT(f) : null;
      if (t1 == null) return;
      let sw = ((t1 - t0) % TAU + TAU) % TAU; if (sw < 1e-6) sw = TAU;
      ent.t0 = t0; ent.t1 = t0 + sw;
    }
    const e = C.add(C.newEnt('ellipse', normE(ent)));
    C.log(`Elips: ${T.ellipse.info(e)}`);
  });

  /* ---------- budama (TRIM / EXTEND) desteği: elipsi ince doğru parçalarıyla temsil et ---------- */
  C.ellTrimElems = e => {
    const full = isFull(e), sw = sweepOf(e), n = Math.max(48, Math.ceil(360 * sw / TAU)), els = [], t0 = full ? 0 : e.t0;
    for (let i = 0; i < n; i++) { const ta = t0 + sw * i / n, tb = t0 + sw * (i + 1) / n; els.push({ k: 'L', a: C.ellPt(e, ta), b: C.ellPt(e, tb), et0: ta, et1: tb }); }
    return { els, closed: full };
  };
  C.ellFromPieces = (e, ps) => {
    const q0 = ps[0], q1 = ps[ps.length - 1]; let t0 = q0.el.et0 + (q0.el.et1 - q0.el.et0) * q0.ua, t1 = q1.el.et0 + (q1.el.et1 - q1.el.et0) * q1.ub;
    let sw = ((t1 - t0) % TAU + TAU) % TAU; if (sw < 1e-9) sw = TAU;
    return { type: 'ellipse', c: p3(e.c), mj: e.mj.slice(), ra: e.ra, t0, t1: t0 + sw };
  };
})(window.C);

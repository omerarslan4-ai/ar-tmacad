/* ArıtmaCAD — BUDA (TRIM) ve UZAT (EXTEND), AutoCAD 2021+ davranışıyla:
   Hızlı mod (tüm nesneler kesici) / Standart mod (kesici kenar seç, Enter = tümü), Shift = uzat/buda,
   Çit (F), Kesişen pencere (C), boş yere tıklama = otomatik çit/pencere, Kenar modu (uzatılmış kesiciler),
   Proje, Sil (R), Geri al (U), çizgi/yay/daire/çoklu çizgi (yaylı segmentler dahil), önizleme */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, I = C.I, TAU = Math.PI * 2, EPS = 1e-9;
  const mod2 = x => ((x % TAU) + TAU) % TAU;
  const TRIMMABLE = new Set(['line', 'arc', 'circle', 'pline', 'ellipse']);
  const st = C.trimSet = (() => { try { return Object.assign({ mode: 'Q', edge: 'N', proj: 'G' }, JSON.parse(localStorage.getItem('aritmacad.trim') || '{}')); } catch (e) { return { mode: 'Q', edge: 'N', proj: 'G' }; } })();
  const saveSt = () => { try { localStorage.setItem('aritmacad.trim', JSON.stringify(st)); } catch (e) { } };

  /* ---------- eleman geometrisi: {k:'L',a,b} | {k:'A',c,r,s,sw} (sw işaretli, + = saat tersi) ---------- */
  const arcFromBulge = (p, q, b) => {
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]), ux = (q[0] - p[0]) / d, uy = (q[1] - p[1]) / d;
    const h = (d / 2) * (1 - b * b) / (2 * b), c = [(p[0] + q[0]) / 2 - uy * h, (p[1] + q[1]) / 2 + ux * h];
    return { k: 'A', c, r: Math.hypot(p[0] - c[0], p[1] - c[1]), s: Math.atan2(p[1] - c[1], p[0] - c[0]), sw: 4 * Math.atan(b) };
  };
  const elemsOf = e => {
    if (e.type === 'line') return { els: [{ k: 'L', a: e.a, b: e.b, ext: 3 }], closed: false };
    if (e.type === 'arc') { const s = e.a0 * Math.PI / 180; let sw = mod2(e.a1 * Math.PI / 180 - s); if (sw < EPS) sw = TAU; return { els: [{ k: 'A', c: e.c, r: e.r, s, sw, ext: 3 }], closed: false }; }
    if (e.type === 'circle') return { els: [{ k: 'A', c: e.c, r: e.r, s: 0, sw: TAU }], closed: true };
    if (e.type === 'ellipse' && C.ellTrimElems) return C.ellTrimElems(e);
    if (e.type === 'pline') {
      const v = e.pts, n = v.length, cl = !!e.closed, els = [];
      for (let i = 0; i < n - 1 + (cl ? 1 : 0); i++) {
        const p = v[i], q = v[(i + 1) % n], b = (e.bul && e.bul[i]) || 0;
        if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-12) { els.push({ k: 'L', a: p, b: q, deg: true }); continue; }
        els.push(Math.abs(b) > 1e-12 ? arcFromBulge(p, q, b) : { k: 'L', a: p, b: q });
      }
      if (!cl && els.length) { els[0].ext = (els[0].ext || 0) | 1; els[els.length - 1].ext = (els[els.length - 1].ext || 0) | 2; }
      return { els, closed: cl };
    }
    return null;
  };
  /* kesici elemanlar (her nesne türü) */
  const cutElems = e => {
    if (TRIMMABLE.has(e.type)) return elemsOf(e).els;
    if (e.type === 'hatch' || e.type === 'arazi' || e.type === 'text' || e.type === 'ctext' || e.type === 'point') return [];
    const out = []; let prs; try { prs = C.prims(e); } catch (err) { return out; }
    for (const pr of prs) {
      if (pr.k === 'L') out.push({ k: 'L', a: pr.a, b: pr.b });
      else if (pr.k === 'P' || pr.k === 'S') { const v = pr.pts, n = v.length; for (let i = 1; i < n + (pr.c || pr.k === 'S' ? 1 : 0); i++) out.push({ k: 'L', a: v[i - 1], b: v[i % n] }); }
      else if (pr.k === 'C') out.push({ k: 'A', c: pr.c, r: pr.r, s: 0, sw: TAU });
      else if (pr.k === 'A') { let sw = mod2(pr.a1 - pr.a0); if (sw < EPS) sw = TAU; out.push({ k: 'A', c: pr.c, r: pr.r, s: pr.a0, sw }); }
    }
    return out;
  };
  const ptAt = (el, u) => el.k === 'L' ? [el.a[0] + (el.b[0] - el.a[0]) * u, el.a[1] + (el.b[1] - el.a[1]) * u, el.a[2] || 0] : (a => [el.c[0] + el.r * Math.cos(a), el.c[1] + el.r * Math.sin(a), el.c[2] || 0])(el.s + el.sw * u);
  const uOfAng = (el, ang) => { let d = el.sw >= 0 ? mod2(ang - el.s) : mod2(el.s - ang); if (TAU - d < 1e-10) d = 0; return d / Math.abs(el.sw); };
  const uOn = (el, p) => {
    if (el.k === 'L') { const dx = el.b[0] - el.a[0], dy = el.b[1] - el.a[1], l2 = dx * dx + dy * dy; return l2 < 1e-24 ? 0 : ((p[0] - el.a[0]) * dx + (p[1] - el.a[1]) * dy) / l2; }
    return uOfAng(el, Math.atan2(p[1] - el.c[1], p[0] - el.c[0]));
  };
  /* ham kesişim noktaları (sonsuz doğru / tam çember) */
  const rawPts = (A, B) => {
    if (A.k === 'L' && B.k === 'L') {
      const r = [A.b[0] - A.a[0], A.b[1] - A.a[1]], s = [B.b[0] - B.a[0], B.b[1] - B.a[1]], den = r[0] * s[1] - r[1] * s[0];
      if (Math.abs(den) < 1e-14 * (Math.hypot(...r) * Math.hypot(...s) || 1)) return [];
      const t = ((B.a[0] - A.a[0]) * s[1] - (B.a[1] - A.a[1]) * s[0]) / den; return [[A.a[0] + r[0] * t, A.a[1] + r[1] * t]];
    }
    if (A.k === 'A' && B.k === 'L') return rawPts(B, A);
    if (A.k === 'L') { // doğru - çember
      const dx = A.b[0] - A.a[0], dy = A.b[1] - A.a[1], fx = A.a[0] - B.c[0], fy = A.a[1] - B.c[1];
      const a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - B.r * B.r; if (a < 1e-24) return [];
      let D = b * b - 4 * a * c; if (D < -1e-12 * Math.max(1, b * b)) return []; D = Math.max(0, D);
      const sq = Math.sqrt(D), ts = D < 1e-14 * Math.max(1, b * b) ? [-b / (2 * a)] : [(-b - sq) / (2 * a), (-b + sq) / (2 * a)];
      return ts.map(t => [A.a[0] + dx * t, A.a[1] + dy * t]);
    }
    const dx = B.c[0] - A.c[0], dy = B.c[1] - A.c[1], d = Math.hypot(dx, dy);
    if (d < 1e-12 || d > A.r + B.r + 1e-10 || d < Math.abs(A.r - B.r) - 1e-10) return [];
    const a = (A.r * A.r - B.r * B.r + d * d) / (2 * d), h = Math.sqrt(Math.max(0, A.r * A.r - a * a)), mx = A.c[0] + dx * a / d, my = A.c[1] + dy * a / d;
    return h < 1e-12 ? [[mx, my]] : [[mx + h * dy / d, my - h * dx / d], [mx - h * dy / d, my + h * dx / d]];
  };
  const inRange = (el, u, extFlag) => {
    if (el.k === 'L') { if (extFlag) { if ((el.ext & 1) && u < 0) return true; if ((el.ext & 2) && u > 1) return true; } return u >= -1e-9 && u <= 1 + 1e-9; }
    return (extFlag && el.ext) || Math.abs(el.sw) >= TAU - 1e-12 || u <= 1 + 1e-9 || u * Math.abs(el.sw) > TAU - 1e-9;
  };

  /* ---------- kesici listesi ---------- */
  const ebb = e => C.bbox(e);
  const hit = (a, b, m) => !(a[2] < b[0] - m || a[0] > b[2] + m || a[3] < b[1] - m || a[1] > b[3] + m);
  const cuttersFor = (e, edges) => {
    const b = ebb(e), extMode = st.edge === 'E', out = [];
    for (const k of edges) {
      if (k === e || !k || !C.doc.ents.includes(k) || (C.inPlan && C.currentView !== '3d' && !C.inPlan(k))) continue; const lay = C.layer(k.layer); if (!lay || !lay.on) continue;
      if (!extMode && !hit(ebb(k), b, 1e-6)) continue;
      for (const el of cutElems(k)) out.push(el);
    }
    return out;
  };
  /* hedefin kesişim parametreleri (P = eleman no + u) */
  const paramsOf = (e, info, cutters) => {
    const { els, closed } = info, n = els.length, ps = [], extMode = st.edge === 'E';
    els.forEach((T, i) => {
      if (T.deg) return;
      const add = p => { const u = uOn(T, p); if (!(T.k === 'L' ? u >= -1e-9 && u <= 1 + 1e-9 : u <= 1 + 1e-9)) return; ps.push(i + Math.min(1, Math.max(0, u))); };
      for (const K of cutters) for (const p of rawPts(T, K)) if (inRange(K, uOn(K, p), extMode)) add(p);
      // kendi kendini kesme (bitişik olmayan segmentler)
      if (e.type === 'pline') els.forEach((K, j) => { if (j === i || K.deg) return; const adj = Math.abs(i - j) === 1 || (closed && Math.abs(i - j) === n - 1); for (const p of rawPts(T, K)) { if (!inRange(K, uOn(K, p), false)) continue; if (adj) { const sh = j === i + 1 || (closed && i === n - 1 && j === 0) ? T.k === 'L' ? T.b : ptAt(T, 1) : T.k === 'L' ? T.a : ptAt(T, 0); if (Math.hypot(p[0] - sh[0], p[1] - sh[1]) < 1e-7) continue; } add(p); } });
    });
    const tot = n, out = [];
    ps.map(P => closed ? ((P % tot) + tot) % tot : P).sort((a, b) => a - b).forEach(P => { if (!out.length || P - out[out.length - 1] > 1e-7) out.push(P); });
    if (closed && out.length > 1 && out[0] + tot - out[out.length - 1] < 1e-7) out.pop();
    return closed ? out : out.filter(P => P > 1e-7 && P < tot - 1e-7);
  };
  const closestP = (info, p) => { let best = 0, bd = Infinity; info.els.forEach((el, i) => { let u = uOn(el, p); if (el.k === 'L') u = Math.min(1, Math.max(0, u)); else if (u > 1) { const d0 = M.dist2(ptAt(el, 0), p), d1 = M.dist2(ptAt(el, 1), p); u = d0 < d1 ? 0 : 1; } const q = ptAt(el, u), d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = i + u; } }); return { P: best, d: bd }; };

  /* parça listesi P0..P1 (kapalıda P1 > n olabilir) */
  const pieces = (info, P0, P1) => {
    const n = info.els.length, out = []; let P = P0;
    while (P < P1 - 1e-10) { const i = Math.floor(P + 1e-10), end = Math.min(P1, i + 1); out.push({ el: info.els[((i % n) + n) % n], ua: Math.max(0, P - i), ub: Math.min(1, end - i) }); P = end; }
    return out.filter(q => q.ub - q.ua > 1e-10);
  };
  const piecePrims = ps => ps.map(({ el, ua, ub }) => {
    if (el.k === 'L') return C.prim.L(ptAt(el, ua), ptAt(el, ub));
    const s0 = el.s + el.sw * ua, s1 = el.s + el.sw * ub; return el.sw >= 0 ? C.prim.A(el.c, el.r, s0, s1) : C.prim.A(el.c, el.r, s1, s0);
  });
  /* parçalardan nesne özellikleri */
  const buildEnt = (e, ps) => {
    if (!ps.length) return null;
    const keep = { layer: e.layer, color: e.color, lt: e.lt, lw: e.lw, lts: e.lts };
    if (e.type === 'line') { const q = ps[0]; return Object.assign(keep, { type: 'line', a: ptAt(q.el, q.ua), b: ptAt(q.el, q.ub) }); }
    if (e.type === 'arc' || e.type === 'circle') { const q = ps[0], s0 = q.el.s + q.el.sw * q.ua, sw = q.el.sw * (q.ub - q.ua); return Object.assign(keep, { type: 'arc', c: M.p3(e.c), r: e.r, a0: mod2(s0) * 180 / Math.PI, a1: mod2(s0 + sw) * 180 / Math.PI }); }
    if (e.type === 'ellipse') return Object.assign(keep, C.ellFromPieces(e, ps));
    const z = (e.pts[0] && e.pts[0][2]) || 0, pts = [ptAt(ps[0].el, ps[0].ua)], bul = [];
    for (const q of ps) { bul.push(q.el.k === 'A' ? Math.tan(q.el.sw * (q.ub - q.ua) / 4) : 0); pts.push(ptAt(q.el, q.ub)); }
    bul.push(0); pts.forEach(p => p[2] = z);
    return Object.assign(keep, { type: 'pline', pts, bul: bul.some(b => Math.abs(b) > 1e-12) ? bul : undefined, closed: false });
  };
  const clean = o => { for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k]; return o; };

  /* ---------- budama işlemi: plan + uygulama ---------- */
  C.trimPlan = (e, p, edges, quick) => {
    const info = elemsOf(e); if (!info || !info.els.length) return { err: 'Bu nesne budanamaz (çizgi, yay, daire, çoklu çizgi budanır).' };
    const n = info.els.length, ps = paramsOf(e, info, cuttersFor(e, edges)), Pp = closestP(info, p).P;
    if (info.closed) {
      if (ps.length < 2) return ps.length === 0 && quick ? { del: true } : { err: ps.length ? 'Kapalı nesne tek noktada kesiliyor; budamak için en az iki kesişim gerekir.' : 'Kesici kenarla kesişmiyor.' };
      let lo = null, hi = null; for (const P of ps) { if (P <= Pp + 1e-9) lo = P; if (hi == null && P > Pp + 1e-9) hi = P; }
      if (lo == null) lo = ps[ps.length - 1] - n; if (hi == null) hi = ps[0] + n;
      return { removed: pieces(info, lo, hi), keep: [pieces(info, hi, lo + n)], info };
    }
    if (!ps.length) return quick ? { del: true } : { err: 'Kesici kenarla kesişmiyor.' };
    let lo = null, hi = null; for (const P of ps) { if (P < Pp - 1e-9) lo = P; else if (hi == null && P > Pp + 1e-9) hi = P; }
    const a = lo == null ? 0 : lo, b = hi == null ? n : hi;
    const keep = []; if (lo != null) keep.push(pieces(info, 0, lo)); if (hi != null) keep.push(pieces(info, hi, n));
    return { removed: pieces(info, a, b), keep, info };
  };
  const applyTrim = (e, plan) => {
    if (plan.del) { C.remove([e]); return []; }
    const res = [], parts = plan.keep.map(ps => buildEnt(e, ps)).filter(Boolean);
    if (!parts.length) { C.remove([e]); return []; }
    const first = clean(parts[0]);
    if (first.type === e.type) { for (const k of ['a', 'b', 'c', 'r', 'a0', 'a1', 'pts', 'bul', 'closed']) delete e[k]; Object.assign(e, first); C.touch(e); res.push(e); }
    else { C.remove([e]); const t = first.type; delete first.type; res.push(C.add(C.newEnt(t, first))); }
    for (const q of parts.slice(1)) { const o = clean(Object.assign({}, q)), t = o.type; delete o.type; res.push(C.add(C.newEnt(t, o))); }
    return res;
  };

  /* ---------- uzatma ---------- */
  C.extendPlan = (e, p, edges) => {
    const info = elemsOf(e); if (!info || info.closed) return { err: info ? 'Kapalı nesne uzatılamaz.' : 'Bu nesne uzatılamaz (çizgi, yay, açık çoklu çizgi).' };
    const n = info.els.length, Pp = closestP(info, p).P;
    const s0 = ptAt(info.els[0], 0), e1 = ptAt(info.els[n - 1], 1);
    const atStart = e.type === 'line' || e.type === 'arc' ? Pp < n / 2 : M.dist2(p, s0) < M.dist2(p, e1);
    const el = atStart ? info.els[0] : info.els[n - 1], cut = cuttersFor(e, edges.filter(k => k !== e)), extMode = st.edge === 'E';
    // genişletilmiş kesiciler için kutu süzgecini kaldır
    const allCut = extMode ? cut : (() => { const o = []; for (const k of edges) { if (k === e || !C.doc.ents.includes(k)) continue; const lay = C.layer(k.layer); if (!lay || !lay.on) continue; for (const q of cutElems(k)) o.push(q); } return o; })();
    let best = null;
    for (const K of allCut) for (const q of rawPts(el, K)) {
      if (!inRange(K, uOn(K, q), extMode)) continue;
      if (el.k === 'L') { const u = uOn(el, q); if (atStart ? u < -1e-9 : u > 1 + 1e-9) { const d = atStart ? -u : u - 1; if (!best || d < best.d) best = { d, q, u }; } }
      else {
        const sg = Math.sign(el.sw), ang = Math.atan2(q[1] - el.c[1], q[0] - el.c[0]), end = el.s + el.sw;
        let dd = atStart ? mod2(sg * (el.s - ang)) : mod2(sg * (ang - end)); if (dd < 1e-9 || Math.abs(el.sw) + dd > TAU - 1e-9) continue;
        if (!best || dd < best.d) best = { d: dd, q };
      }
    }
    if (!best) return { err: 'Uzatılacak sınır bulunamadı.' };
    return { atStart, el, best, info };
  };
  const applyExtend = (e, pl) => {
    const { atStart, el, best } = pl, q = [best.q[0], best.q[1], 0];
    if (e.type === 'line') { if (atStart) e.a = [q[0], q[1], e.a[2] || 0]; else e.b = [q[0], q[1], e.b[2] || 0]; }
    else if (e.type === 'arc') { const dg = best.d * 180 / Math.PI; if (atStart) e.a0 = ((e.a0 - dg) % 360 + 360) % 360; else e.a1 = ((e.a1 + dg) % 360 + 360) % 360; }
    else {
      const n = e.pts.length, z = (e.pts[0] && e.pts[0][2]) || 0, iv = atStart ? 0 : n - 1, is = atStart ? 0 : n - 2;
      if (el.k === 'A') { const sg = Math.sign(el.sw), sw2 = sg * (Math.abs(el.sw) + best.d); const p2 = atStart ? ptAt({ k: 'A', c: el.c, r: el.r, s: el.s - sg * best.d, sw: 0 }, 0) : ptAt({ k: 'A', c: el.c, r: el.r, s: el.s, sw: sw2 }, 1); e.pts[iv] = [p2[0], p2[1], z]; e.bul = e.bul || []; e.bul[is] = Math.tan(sw2 / 4); }
      else e.pts[iv] = [q[0], q[1], z];
    }
    C.touch(e); return [e];
  };

  /* ---------- ortak etkileşim ---------- */
  let shiftAtClick = false;
  if (typeof document !== 'undefined') { document.addEventListener('pointerdown', ev => { shiftAtClick = ev.shiftKey; }, true); document.addEventListener('keydown', ev => { if (ev.key === 'Shift') C.shiftDown = true; }); document.addEventListener('keyup', ev => { if (ev.key === 'Shift') C.shiftDown = false; }); }
  const tolW = () => { try { return 7 / (C.viewScale ? C.viewScale() : 50); } catch (err) { return 0.1; } };
  C.pickTrimmable = (p, tol, any) => { let best = null, bd = tol == null ? tolW() : tol; for (const e of C.doc.ents) { if (!any && !TRIMMABLE.has(e.type)) continue; const lay = C.layer(e.layer); if (!lay || !lay.on || lay.lock) continue; const b = ebb(e); if (!hit(b, [p[0], p[1], p[0], p[1]], bd)) continue; const d = C.entDist(e, p); if (d < bd) { bd = d; best = e; } } return best; };
  const fenceHits = (pts) => { // çitin kestiği nesneler: [{e, p}] çit sırasıyla
    const out = [];
    for (let i = 1; i < pts.length; i++) {
      const F = { k: 'L', a: pts[i - 1], b: pts[i] }, list = [];
      for (const e of C.doc.ents) {
        if (!TRIMMABLE.has(e.type)) continue; const lay = C.layer(e.layer); if (!lay || !lay.on || lay.lock) continue;
        if (!hit(ebb(e), [Math.min(F.a[0], F.b[0]), Math.min(F.a[1], F.b[1]), Math.max(F.a[0], F.b[0]), Math.max(F.a[1], F.b[1])], 1e-9)) continue;
        for (const el of elemsOf(e).els) for (const q of rawPts(F, el)) { const u = uOn(F, q); if (u < -1e-9 || u > 1 + 1e-9 || !inRange(el, uOn(el, q), false)) continue; list.push({ e, p: [q[0], q[1], 0], u }); }
      }
      list.sort((a, b) => a.u - b.u); out.push(...list);
    }
    return out;
  };
  const crossingHits = (a, b) => { // pencereye değen her nesne: penceredeki en yakın nokta
    const box = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])], out = [];
    const sides = [[[box[0], box[1]], [box[2], box[1]]], [[box[2], box[1]], [box[2], box[3]]], [[box[2], box[3]], [box[0], box[3]]], [[box[0], box[3]], [box[0], box[1]]]];
    const inside = q => q[0] >= box[0] - 1e-12 && q[0] <= box[2] + 1e-12 && q[1] >= box[1] - 1e-12 && q[1] <= box[3] + 1e-12;
    for (const e of C.doc.ents) {
      if (!TRIMMABLE.has(e.type)) continue; const lay = C.layer(e.layer); if (!lay || !lay.on || lay.lock) continue; if (!hit(ebb(e), box, 0)) continue;
      const info = elemsOf(e); let pick = null;
      for (const el of info.els) { // pencere içindeki bir nokta: kenar kesişimi ya da içerdeki uç/orta nokta
        for (const s of sides) for (const q of rawPts({ k: 'L', a: s[0], b: s[1] }, el)) { const u = uOn({ k: 'L', a: s[0], b: s[1] }, q); if (u >= 0 && u <= 1 && inRange(el, uOn(el, q), false)) { const um = uOn(el, q); pick = pick || ptAt(el, Math.min(1, Math.max(0, um))); } }
        for (const u of [0.5, 0, 1]) { const q = ptAt(el, u); if (inside(q)) { pick = q; break; } }
        if (pick) break;
      }
      if (pick) { // tam sınırdaki noktayı biraz içeri al
        const cp = closestP(info, pick); let q = pick; for (const du of [0.002, -0.002, 0.01, -0.01]) { const P = cp.P + du * info.els.length, i = Math.min(info.els.length - 1, Math.max(0, Math.floor(P))), qq = ptAt(info.els[i], Math.min(1, Math.max(0, P - i))); if (inside(qq)) { q = qq; break; } }
        out.push({ e, p: q });
      }
    }
    return out;
  };

  /* bir nesne listesine (çit/pencere) sırayla işlem; parçalanan nesnelerde doğru parçayı bul */
  const batch = (hits, op) => {
    const groups = new Map(); for (const h of hits) { if (!groups.has(h.e)) groups.set(h.e, []); groups.get(h.e).push(h.p); }
    let n = 0;
    for (const [e0, pts] of groups) {
      let cur = [e0];
      for (const p of pts) {
        let e = null, bd = Infinity; for (const c of cur) { if (!C.doc.ents.includes(c)) continue; const d = C.entDist(c, p); if (d < bd) { bd = d; e = c; } }
        if (!e || bd > 1e-6) continue;
        const r = op(e, p); if (r) { n++; cur = cur.filter(c => c !== e).concat(r); }
      }
    }
    return n;
  };

  const runTrimExtend = async (I, isTrim) => {
    const name = isTrim ? 'Budama' : 'Uzatma', undo = [];
    let edges = null; // null = hızlı mod (tümü)
    const pickEdges = async () => {
      const s = await I.sel(isTrim ? 'Kesici kenarları seçin <tümünü seç = Enter>' : 'Sınır kenarlarını seçin <tümünü seç = Enter>', { pre: true });
      edges = s.length ? s : 'ALL';
    };
    if (st.mode === 'S') await pickEdges();
    const edgeList = () => edges && edges !== 'ALL' ? edges.filter(k => C.doc.ents.includes(k)) : C.doc.ents;
    const quick = () => st.mode === 'Q';
    const opTrim = (e, p) => { const pl = C.trimPlan(e, p, edgeList(), quick()); if (pl.err) { C.warn(pl.err); return null; } return applyTrim(e, pl); };
    const opExt = (e, p) => { const pl = C.extendPlan(e, p, edgeList()); if (pl.err) { C.warn(pl.err); return null; } return applyExtend(e, pl); };
    const snap = () => undo.push(C.snapshot());
    C.log(`${name}: mod=${quick() ? 'Hızlı (tüm nesneler kesici)' : 'Standart'}, kenar=${st.edge === 'E' ? 'Uzat' : 'Uzatma yok'}. Shift ile ${isTrim ? 'uzatır' : 'budar'}. Boş yere tıklayıp sürükleyerek çit/pencere çizin.`);
    E.preview = cur => {
      if (!cur) return []; const e = C.pickTrimmable(cur); if (!e) return [];
      try {
        const doTrim = isTrim !== !!C.shiftDown;
        if (doTrim) { const pl = C.trimPlan(e, cur, edgeList(), quick()); if (pl.err) return []; if (pl.del) return C.prims(e).map(pr => Object.assign({}, pr, { color: 1 })); return piecePrims(pl.removed).map(pr => Object.assign(pr, { color: 1 })); }
        const pl = C.extendPlan(e, cur, edgeList()); if (pl.err) return [];
        const el = pl.el; if (el.k === 'L') return [C.prim.L(pl.atStart ? ptAt(el, 0) : ptAt(el, 1), pl.best.q)];
        const sg = Math.sign(el.sw); return [pl.atStart ? (sg > 0 ? C.prim.A(el.c, el.r, el.s - pl.best.d, el.s) : C.prim.A(el.c, el.r, el.s, el.s + pl.best.d)) : (sg > 0 ? C.prim.A(el.c, el.r, el.s + el.sw, el.s + el.sw + pl.best.d) : C.prim.A(el.c, el.r, el.s + el.sw - pl.best.d, el.s + el.sw))];
      } catch (err) { return []; }
    };
    const kw = [['T', isTrim ? 'kesici Kenarlar' : 'sınır Kenarları'], ['F', 'Çit'], ['C', 'Kesişen'], ['O', 'Mod'], ['P', 'Proje'], ['E', 'Kenar'], ...(isTrim ? [['R', 'Sil']] : []), ['U', 'Geri al']];
    try {
      for (; ;) {
        shiftAtClick = false; E.noSnap = true;
        const r = await I.pt(`${isTrim ? 'Budanacak' : 'Uzatılacak'} nesneyi seçin ya da Shift ile ${isTrim ? 'uzatılacak' : 'budanacak'} nesneyi seçin`, { kw });
        if (r == null || r === '') return;
        const shift = shiftAtClick || !!C.shiftDown, doTrim = isTrim !== shift;
        if (r === 'U') { if (undo.length) { C.restore(undo.pop()); C.changed(); C.log('Son işlem geri alındı.'); } else C.warn('Geri alınacak işlem yok'); continue; }
        if (r === 'O') { const m = await I.kw('Mod', [['Q', 'Hızlı'], ['S', 'Standart']], st.mode); if (m) { st.mode = m; saveSt(); if (m === 'S') await pickEdges(); else edges = null; } continue; }
        if (r === 'T') { st.mode = 'S'; saveSt(); await pickEdges(); continue; }
        if (r === 'E') { const m = await I.kw('Kesici kenar', [['E', 'Uzat (görünmeyen kesişimleri de kullan)'], ['N', 'Uzatma yok']], st.edge); if (m) { st.edge = m; saveSt(); } continue; }
        if (r === 'P') { const m = await I.kw('Proje', [['N', 'Hiçbiri'], ['U', 'KKS'], ['V', 'Görünüş']], st.proj === 'G' ? 'V' : st.proj); if (m) { st.proj = m; saveSt(); } C.log('Plan (XY) görünümünde nesneler her durumda XY düzlemine izdüşürülerek kesilir.'); continue; }
        if (r === 'R' && isTrim) { const s = await I.sel('Silinecek nesneleri seçin', { pre: false }); if (s.length) { snap(); C.remove(s); } continue; }
        if (r === 'F') {
          const pts = []; const pv = E.preview; E.preview = c => pts.length ? [C.prim.P([...pts, c], false, { lt: 'DASHED' })] : [];
          for (; ;) { E.base = pts[pts.length - 1] || null; const q = await I.pt(pts.length ? 'Sonraki çit noktası (Enter = bitir)' : 'İlk çit noktası'); if (!q || typeof q === 'string') break; pts.push(q); }
          E.preview = pv; E.base = null; if (pts.length < 2) continue;
          snap(); const n = batch(fenceHits(pts), doTrim ? opTrim : opExt); if (!n) undo.pop(); C.log(`${n} nesne ${doTrim ? 'budandı' : 'uzatıldı'} (çit).`); continue;
        }
        if (r === 'C') {
          const a = await I.pt('İlk köşe'); if (!a || typeof a === 'string') continue;
          const pv = E.preview; E.base = a; E.rubber = false; E.preview = c => [C.prim.P([a, [c[0], a[1]], c, [a[0], c[1]]], true, { lt: 'DASHED', color: 3 })];
          const b = await I.pt('Karşı köşe'); E.preview = pv; E.base = null; E.rubber = true; if (!b || typeof b === 'string') continue;
          snap(); const n = batch(crossingHits(a, b), doTrim ? opTrim : opExt); if (!n) undo.pop(); C.log(`${n} nesne ${doTrim ? 'budandı' : 'uzatıldı'} (kesişen pencere).`); continue;
        }
        if (typeof r === 'string') continue;
        let e = E.scriptMode ? C.pickTrimmable(r, 1e-6) || C.pickTrimmable(r, tolW()) : C.pickTrimmable(r);
        if (!e) {
          const other = C.pickTrimmable(r, null, true);
          if (other) { C.warn(`${C.T[other.type] && C.T[other.type].label || other.type} ${isTrim ? 'budanamaz' : 'uzatılamaz'} (çizgi, yay, daire, çoklu çizgi). Gerekirse önce PATLAT.`); continue; }
          if (E.scriptMode) { C.warn('Bu noktada nesne yok'); continue; }
          // boş yere tıklama: hızlı modda çit (iki nokta), standart modda kesişen pencere — AutoCAD gibi
          const pv = E.preview; E.base = r;
          if (quick()) { E.preview = c => [C.prim.L(r, c, { lt: 'DASHED', color: 3 })]; const b = await I.pt('Çitin ikinci noktası'); E.preview = pv; E.base = null; if (!b || typeof b === 'string') continue; snap(); const n = batch(fenceHits([r, b]), doTrim ? opTrim : opExt); if (!n) undo.pop(); C.log(`${n} nesne ${doTrim ? 'budandı' : 'uzatıldı'}.`); }
          else { E.rubber = false; E.preview = c => [C.prim.P([r, [c[0], r[1]], c, [r[0], c[1]]], true, { lt: 'DASHED', color: 3 })]; const b = await I.pt('Karşı köşe'); E.preview = pv; E.base = null; E.rubber = true; if (!b || typeof b === 'string') continue; snap(); const n = batch(crossingHits(r, b), doTrim ? opTrim : opExt); if (!n) undo.pop(); C.log(`${n} nesne ${doTrim ? 'budandı' : 'uzatıldı'}.`); }
          continue;
        }
        snap(); const res = doTrim ? opTrim(e, r) : opExt(e, r); if (!res) undo.pop();
      }
    } finally { E.preview = null; }
  };
  C.addCommand(['TRIM', 'TR', 'BUDA'], 'Budama (AutoCAD gibi). Hızlı modda tüm nesneler kesicidir; nesneye tıklayın (kesişimsiz nesne silinir). Shift+tık = uzat. Seçenekler: T kesici kenar (standart mod), F çit, C kesişen pencere, O mod (Hızlı/Standart), E kenar (Uzat/Uzatma yok), P proje, R sil, U geri al. Boş yere tıklama çit/pencere başlatır.', I => runTrimExtend(I, true));
  C.addCommand(['EXTEND', 'EX', 'UZAT'], 'Uzatma (AutoCAD gibi). Nesnenin uzatılacak ucuna yakın tıklayın. Shift+tık = buda. Seçenekler: T sınır kenarları, F çit, C kesişen, O mod, E kenar (görünmeyen kesişime uzat), P proje, U geri al.', I => runTrimExtend(I, false));
})(window.C);

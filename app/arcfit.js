/* ArıtmaCAD — parçalı çizgilerden yay/daire tanıma: 3B modelden üretilen kesit, plan ve görünüşlerde
   daire/yay kesitleri kısa çizgiler yerine gerçek yay (yaylı çoklu çizgi) ve daire olarak çizilir. */
(function (C) {
  'use strict';
  const M = C.M, TAU = Math.PI * 2;
  const circ3 = (a, b, c) => {
    const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])); if (Math.abs(d) < 1e-14) return null;
    const a2 = a[0] * a[0] + a[1] * a[1], b2 = b[0] * b[0] + b[1] * b[1], c2 = c[0] * c[0] + c[1] * c[1];
    const x = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d, y = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d;
    return { c: [x, y], r: Math.hypot(a[0] - x, a[1] - y) };
  };
  const turn = (a, b, c) => { const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]]; return Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]); };
  const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const simplify = (p, closed) => {
    let q = p.filter((x, i) => i === 0 || len(x, p[i - 1]) > 1e-9); if (closed && q.length > 2 && len(q[0], q[q.length - 1]) < 1e-9) q.pop();
    let ch = true; while (ch && q.length > (closed ? 3 : 2)) { ch = false; const n = q.length; for (let i = closed ? 0 : 1; i < (closed ? n : n - 1); i++) { const t = turn(q[(i - 1 + n) % n], q[i], q[(i + 1) % n]); if (Math.abs(t) < 1e-7) { q.splice(i, 1); ch = true; break; } } }
    return q;
  };
  /* bir koşu yay mı: p[i..j] (j-i >= 4 segment) */
  const arcOK = (p, i, j) => {
    const n = j - i; if (n < 4) return null;
    const k = (n >= 6 && circ3(p[i + 1], p[i + (n >> 1)], p[j - 1])) || circ3(p[i], p[i + (n >> 1)], p[j]); if (!k || k.r > 1e5) return null;
    let lmax = 0, lmin = Infinity, sg = 0; const ls = [];
    for (let m = i + 1; m <= j; m++) ls.push(len(p[m - 1], p[m]));
    const inner = ls.length > 2 ? ls.slice(1, -1) : ls; for (const l of inner) { lmax = Math.max(lmax, l); lmin = Math.min(lmin, l); }
    if (lmax > lmin * 3) return null;
    if (ls[0] > lmax * 1.5 + 1e-9 || ls[ls.length - 1] > lmax * 1.5 + 1e-9) return null; // uçlarda uzun düz parça yayın parçası değildir
    if (lmax > k.r * 0.8) return null;
    const tol = Math.max(1e-3 * k.r, 1.3 * lmax * lmax / (8 * k.r)) + 1e-6;
    for (let m = i; m <= j; m++) {
      if (Math.abs(len(p[m], k.c) - k.r) > tol) return null;
      if (m > i) { const mid = [(p[m - 1][0] + p[m][0]) / 2, (p[m - 1][1] + p[m][1]) / 2]; if (Math.abs(k.r - len(mid, k.c)) > Math.max(tol * 1.5, k.r * 0.03)) return null; }
      if (m > i && m < j) { const t = turn(p[m - 1], p[m], p[m + 1]); if (Math.abs(t) > 0.55 || Math.abs(t) < 1e-4) return null; const s = Math.sign(t); if (sg && s !== sg) return null; sg = s; }
    }
    return k;
  };
  const bulgeOf = (k, a, mid, b) => { const A = q => Math.atan2(q[1] - k.c[1], q[0] - k.c[0]), a0 = A(a), a1 = A(b), am = A(mid), s = M.normAng(a1 - a0); const sw = M.normAng(am - a0) < s ? s : -(TAU - s); return Math.tan(sw / 4); };
  /* nokta dizisinden eğri: {type:'circle'|'pline'|'line', ...} */
  const fitRaw = (pts0, closed) => {
    let p = simplify(pts0.map(q => [q[0], q[1]]), closed);
    if (p.length < 2) return null;
    if (!closed && p.length === 2) return { type: 'line', a: p[0], b: p[1] };
    if (closed && p.length >= 8) { // tam daire
      const k = circ3(p[0], p[Math.floor(p.length / 3)], p[Math.floor(2 * p.length / 3)]);
      if (k && p.every(q => Math.abs(len(q, k.c) - k.r) < 2e-3 * k.r + 1e-6) && p.every((q, i) => Math.abs(turn(p[(i - 1 + p.length) % p.length], q, p[(i + 1) % p.length])) < 0.55)) return { type: 'circle', c: k.c, r: k.r };
    }
    if (closed) { // dikiş bir köşede olsun
      let bi = 0, bt = 0; for (let i = 0; i < p.length; i++) { const t = Math.abs(turn(p[(i - 1 + p.length) % p.length], p[i], p[(i + 1) % p.length])); if (t > bt) { bt = t; bi = i; } }
      if (bt > 0.05) p = p.slice(bi).concat(p.slice(0, bi));
      p.push(p[0]);
    }
    const out = [p[0]], bul = [], ks = [], n = p.length - 1, known = [];
    const longest = i => { let best = -1, bk = null; for (let j = i + 4; j <= n; j++) { const k = arcOK(p, i, j); if (k) { best = j; bk = k; } else if (best >= 0 && j > best + 2) break; } return [best, bk]; };
    for (let i = 0; i < n;) { const [b, k] = longest(i); if (b >= 0) { known.push(k); i = b; } else i++; }
    /* bilinen bir dairenin üzerindeki kısa parçalar (kırpma ile bölünmüş yaylar) */
    const onKnown = (i, k) => {
      let j = i, sg = 0; const tol = q => Math.abs(len(q, k.c) - k.r);
      const T = Math.max(2e-3 * k.r, 1e-6) + k.r * 0.006;
      if (tol(p[i]) > T) return -1;
      while (j < n) {
        const a = p[j], b = p[j + 1]; if (tol(b) > T) break;
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], l = len(a, b); if (l > k.r * 0.6 || k.r - len(mid, k.c) > l * l / (8 * k.r) * 1.6 + T) break;
        if (j > i) { const t = turn(p[j - 1], a, b), s2 = Math.sign(t); if (Math.abs(t) > 0.6 || Math.abs(t) < 1e-4 || (sg && s2 !== sg)) break; sg = s2; }
        j++;
      }
      return j - i >= 2 ? j : -1;
    };
    let i = 0;
    while (i < n) {
      let [best, bk] = longest(i);
      for (const k of known) { const j = onKnown(i, k); if (j > best) { best = j; bk = k; } }
      if (best >= 0) { bul.push(bulgeOf(bk, p[i], p[i + ((best - i) >> 1)], p[best])); ks.push(bk); out.push(p[best]); i = best; }
      else { bul.push(0); ks.push(null); out.push(p[i + 1]); i++; }
    }
    if (closed) out.pop(); else bul.push(0);
    if (closed && out.length > 3 && bul.length > 2) { // dikiş bir yayın ortasına düştüyse iki parçayı birleştir
      const a = ks[0], b = ks[ks.length - 1];
      if (a && b && Math.sign(bul[0]) === Math.sign(bul[bul.length - 1]) && len(a.c, b.c) < 2e-3 * a.r + 1e-6 && Math.abs(a.r - b.r) < 2e-3 * a.r + 1e-6) {
        const sw = 4 * Math.atan(bul[0]) + 4 * Math.atan(bul[bul.length - 1]);
        if (Math.abs(sw) < TAU - 1e-6) { out.shift(); bul.shift(); bul[bul.length - 1] = Math.tan(sw / 4); ks.shift(); out.unshift(out.pop()); bul.unshift(bul.pop()); }
      }
    }
    if (!closed && out.length === 2 && !bul[0]) return { type: 'line', a: out[0], b: out[1] };
    return { type: 'pline', pts: out, bul: bul.some(b => Math.abs(b) > 1e-12) ? bul : null, closed };
  };
  /* güvenlik: sonuç eğrisi her özgün noktadan ve parça ortasından tolerans içinde geçmeli; geçmezse özgün çizgi korunur */
  const segDist = (q, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(q[0] - a[0] - dx * t, q[1] - a[1] - dy * t); };
  const arcDist = (q, a, b, bu) => {
    const th = 4 * Math.atan(bu), d = len(a, b), r = d / (2 * Math.sin(Math.abs(th) / 2)), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const h = Math.sqrt(Math.max(0, r * r - d * d / 4)) * (Math.abs(th) > Math.PI ? -1 : 1), cd = ang + (bu > 0 ? Math.PI / 2 : -Math.PI / 2), c = [m[0] + Math.cos(cd) * h, m[1] + Math.sin(cd) * h];
    const a0 = Math.atan2(a[1] - c[1], a[0] - c[0]), aq = Math.atan2(q[1] - c[1], q[0] - c[0]); let rel = th > 0 ? M.normAng(aq - a0) : M.normAng(a0 - aq);
    return rel <= Math.abs(th) + 1e-9 ? Math.abs(len(q, c) - r) : Math.min(len(q, a), len(q, b));
  };
  const curveDist = (f, q) => {
    if (f.type === 'circle') return Math.abs(len(q, f.c) - f.r);
    if (f.type === 'line') return segDist(q, f.a, f.b);
    let best = Infinity; const n = f.pts.length;
    for (let i = 0; i < n - (f.closed ? 0 : 1); i++) { const a = f.pts[i], b = f.pts[(i + 1) % n], bu = f.bul && f.bul[i]; best = Math.min(best, bu ? arcDist(q, a, b, bu) : segDist(q, a, b)); if (best < 1e-12) break; }
    return best;
  };
  C.fitCurve = (pts0, closed) => {
    const f = fitRaw(pts0, closed); if (!f || f.type === 'line') return f;
    const p = pts0.map(q => [q[0], q[1]]);
    let lmax = 0; for (let i = 1; i < p.length; i++) lmax = Math.max(lmax, len(p[i - 1], p[i]));
    const tol = Math.max(1e-6, 0.01 * lmax, 1e-4);
    const ok = p.every((q, i) => { if (curveDist(f, q) > tol) return false; const r = p[(i + 1) % p.length]; if (!closed && i === p.length - 1) return true; const m = [(q[0] + r[0]) / 2, (q[1] + r[1]) / 2], l = len(q, r); return curveDist(f, m) <= tol + l * 0.03; });
    if (ok) return f;
    if (C.DBG) console.log('fitCurve: sonuç reddedildi, özgün çizgi korunuyor');
    return { type: 'pline', pts: p, bul: null, closed };
  };
  /* ayrık çizgileri uç uca zincirle (yalnız 2 parçanın buluştuğu noktalarda) */
  C.chainSegs = (segs, tol = 1e-6) => {
    const K = q => Math.round(q[0] / tol) + ',' + Math.round(q[1] / tol), map = new Map();
    segs.forEach((s, i) => { for (const q of s) { const k = K(q); if (!map.has(k)) map.set(k, []); map.get(k).push(i); } });
    const used = new Uint8Array(segs.length), out = [];
    const next = (q, i) => { const l = map.get(K(q)) || []; if (l.length !== 2) return -1; const j = l[0] === i ? l[1] : l[0]; return used[j] ? -1 : j; };
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue; used[i] = 1; let pts = [segs[i][0], segs[i][1]], cur = i;
      for (; ;) { const j = next(pts[pts.length - 1], cur); if (j < 0) break; used[j] = 1; const s = segs[j]; pts.push(K(s[0]) === K(pts[pts.length - 1]) ? s[1] : s[0]); cur = j; }
      cur = i; for (; ;) { const j = next(pts[0], cur); if (j < 0) break; used[j] = 1; const s = segs[j]; pts.unshift(K(s[0]) === K(pts[0]) ? s[1] : s[0]); cur = j; }
      const closed = pts.length > 3 && K(pts[0]) === K(pts[pts.length - 1]); if (closed) pts.pop();
      out.push({ pts, closed });
    }
    return out;
  };
  /* eğriyi nesne olarak ekle; W: koordinat dönüşümü (2B -> dünya), props: katman vb. */
  C.addFitted = (pts, closed, W, props) => {
    const f = C.fitCurve(pts, closed); if (!f) return null; const w = q => { const r = W ? W(q) : [q[0], q[1], 0]; return [r[0], r[1], r[2] || 0]; };
    if (f.type === 'circle') { const c = w(f.c), e2 = w([f.c[0] + f.r, f.c[1]]); return C.add(C.newEnt('circle', Object.assign({ c, r: Math.hypot(e2[0] - c[0], e2[1] - c[1]) }, props))); }
    if (f.type === 'line') return C.add(C.newEnt('line', Object.assign({ a: w(f.a), b: w(f.b) }, props)));
    const o = Object.assign({ pts: f.pts.map(w), closed: f.closed }, props); if (f.bul) o.bul = f.bul; return C.add(C.newEnt('pline', o));
  };
  /* tarama sınırı için: yayları ince bölerek gerçek eğriye oturt */
  C.denseLoop = lp => {
    const f = C.fitCurve(lp, true); if (!f) return lp;
    if (f.type === 'circle') { const n = Math.max(64, Math.min(256, Math.ceil(f.r * 40))); return Array.from({ length: n }, (_, i) => [f.c[0] + f.r * Math.cos(TAU * i / n), f.c[1] + f.r * Math.sin(TAU * i / n)]); }
    if (f.type !== 'pline' || !f.bul) return lp;
    const out = []; for (let i = 0; i < f.pts.length; i++) { const a = f.pts[i], b = f.pts[(i + 1) % f.pts.length]; out.push([a[0], a[1]]); const bu = f.bul[i]; if (bu) { const th = 4 * Math.atan(bu), d = len(a, b), r = d / (2 * Math.sin(Math.abs(th) / 2)), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), h = Math.sqrt(Math.max(0, r * r - d * d / 4)) * (Math.abs(th) > Math.PI ? -1 : 1), cd = ang + (bu > 0 ? Math.PI / 2 : -Math.PI / 2), c = [m[0] + Math.cos(cd) * h, m[1] + Math.sin(cd) * h], a0 = Math.atan2(a[1] - c[1], a[0] - c[0]), k = Math.max(4, Math.ceil(Math.abs(th) / (Math.PI / 90))); for (let j = 1; j < k; j++) { const t = a0 + th * j / k; out.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)]); } } }
    return out;
  };
  C._curveDist = curveDist;
  C.addFittedSegs = (segs, W, props) => { let n = 0; for (const ch of C.chainSegs(segs)) if (C.addFitted(ch.pts, ch.closed, W, props)) n++; return n; };
})(window.C);

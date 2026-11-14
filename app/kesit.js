/* ArıtmaCAD — 3B modelden istenen yerden kesit / görünüş üretme */
(function (C) {
  'use strict';
  const M = C.M;
  /* segment listesini uç uca ekleyerek çoklu çizgilere birleştir */
  const chain = (segs, tol) => {
    // uzamsal karma: komşu hücreler de aranır (yuvarlama sınırında kopma olmasın)
    const cell = p => [Math.floor(p[0] / tol), Math.floor(p[1] / tol)], map = new Map(), used = new Uint8Array(segs.length);
    segs.forEach((s, i) => { for (const p of [s[0], s[1]]) { const [cx, cy] = cell(p), k = cx + ',' + cy; if (!map.has(k)) map.set(k, []); map.get(k).push(i); } });
    const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= tol * 1.5;
    const find = end => { const [cx, cy] = cell(end); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of map.get((cx + dx) + ',' + (cy + dy)) || []) if (!used[j] && (near(segs[j][0], end) || near(segs[j][1], end))) return j; return null; };
    const out = [];
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue; used[i] = 1;
      const pts = [segs[i][0], segs[i][1]];
      for (const dir of [1, 0]) {
        for (; ;) {
          const end = dir ? pts[pts.length - 1] : pts[0], cand = find(end); if (cand == null) break;
          used[cand] = 1; const s = segs[cand], nx = near(s[0], end) ? s[1] : s[0];
          if (dir) pts.push(nx); else pts.unshift(nx);
        }
      }
      out.push(pts);
    }
    return out;
  };
  /* açık kalan zincirleri (model ağındaki küçük boşluklar) uç uca bağlayıp kapat */
  const heal = (pls, gap) => {
    const open = pls.map(p => p.slice()), done = [];
    const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < open.length && !changed; i++) {
        const A = open[i]; if (A.length > 2 && d(A[0], A[A.length - 1]) <= gap) { A.push(A[0]); done.push(A); open.splice(i, 1); changed = true; break; }
        let best = null, bd = gap;
        for (let j = 0; j < open.length; j++) { if (j === i) continue; const B = open[j]; for (const [ea, eb] of [[1, 0], [1, 1], [0, 0], [0, 1]]) { const pa = ea ? A[A.length - 1] : A[0], pb = eb ? B[B.length - 1] : B[0], dd = d(pa, pb); if (dd <= bd) { bd = dd; best = { j, ea, eb }; } } }
        if (best) { const B = open[best.j]; let a = best.ea ? A : A.slice().reverse(), b = best.eb ? B.slice().reverse() : B; open[i] = a.concat(b); open.splice(best.j, 1); changed = true; }
      }
    }
    return { closed: done, open };
  };
  /* kesit çizgilerini birleştir: aynı kesitteki gövdelerin birleşimi tek kapalı sınır (ara çizgi/köşe yok), görünen çizgiler aynı doğrudakiler birleşik */
  C.sectionMerge = (cut, vis, opts) => {
    const TOL = 1e-4, K = p => Math.round(p[0] / TOL) + ',' + Math.round(p[1] / TOL);
    const groups = new Map(); for (const s of cut) { const g = s.g == null ? 0 : s.g; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(s); }
    const concS = new Map(), otherS = [], open = [], fndG = [];
    for (const [g, segs] of groups) {
      const terr = segs[0].terr; const ls = [];
      const opn = [];
      for (const pl of chain(segs, TOL)) { const cl = pl.length > 3 && Math.hypot(pl[0][0] - pl[pl.length - 1][0], pl[0][1] - pl[pl.length - 1][1]) < TOL * 10; if (cl && !terr) ls.push(pl.slice(0, -1)); else opn.push(pl); }
      if (opn.length && !terr) { // ağ boşluklarını kapat (kesit yüzeyi taranabilsin)
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const pl of opn) for (const q of pl) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
        const hr = heal(opn, Math.max(0.005, Math.hypot(x1 - x0, y1 - y0) * 0.01));
        for (const pl of hr.closed) if (pl.length > 3) ls.push(pl.slice(0, -1));
        opn.length = 0; opn.push(...hr.open);
      }
      const lk = segs[0].lk;
      for (const pl of opn) { const q = simplify(pl, false); q.terr = terr; q.lk = lk; open.push(q); }
      if (ls.length) { if (segs[0].conc) { const mk = (segs[0].mat || 'B') + (lk ? '#' + lk : ''); if (!concS.has(mk)) concS.set(mk, []); concS.get(mk).push(ls); if (segs[0].fnd) fndG.push(ls); } else { ls.lk = lk; otherS.push(ls); } }
    }
    // grobeton: temel / havuz tabanının altında sürekli şerit (kalınlık opts.grobeton m, iki yanda aynı kadar taşkın)
    if (opts && opts.grobeton > 0) for (const ls of fndG) {
      const pts = ls.flat(); if (!pts.length) continue; const ymin = Math.min(...pts.map(q => q[1])); let u0 = Infinity, u1 = -Infinity;
      for (const lp of ls) for (let i = 0; i < lp.length; i++) { const A = lp[i], B = lp[(i + 1) % lp.length]; if (Math.abs(A[1] - ymin) < 1e-3 && Math.abs(B[1] - ymin) < 1e-3) { u0 = Math.min(u0, A[0], B[0]); u1 = Math.max(u1, A[0], B[0]); } }
      if (!(u1 - u0 > 0.05)) continue; const g = opts.grobeton, x0 = u0 - g, x1 = u1 + g;
      const gk = cut.some(q => q.lk) ? 'G#GROBETON' : 'G'; if (!concS.has(gk)) concS.set(gk, []); concS.get(gk).push([[[x0, ymin - g], [x1, ymin - g], [x1, ymin], [x0, ymin]]]);
    }
    const byMat = [], loops = []; for (const [key, sol] of concS) { const hi = key.indexOf('#'), mat = hi < 0 ? key : key.slice(0, hi), lk = hi < 0 ? undefined : key.slice(hi + 1); const lp = unionLoops(sol); if (lp.length) { for (const q of lp) q.lk = lk; byMat.push({ mat, lk, loops: lp }); loops.push(...lp); } }
    const eq = []; for (const ls of otherS) for (const q of unionLoops([ls])) { q.lk = ls.lk; eq.push(q); }
    // görünen çizgiler: eleman (katman) grubuna göre ayrı birleştirilir, her parça kendi katmanını bilir
    const vg = new Map(); for (const sg of vis) { const k = sg.lk || ''; if (!vg.has(k)) vg.set(k, []); vg.get(k).push(sg); }
    const visR = []; for (const [k, vs] of vg) for (const sg of hideUnderCut(mergeVis(vs, loops.concat(eq), open), loops.concat(eq))) { if (k) sg.lk = k; visR.push(sg); }
    return { loops, byMat, equip: eq, open, vis: visR };
  };
  /* kesilen yüzey opaktır: kesit alanının (dolu bölgenin) içinde kalan görünen çizgiler gizlenir */
  const hideUnderCut = (vis, loops) => {
    if (!loops.length) return vis;
    const bbs = loops.map(lp => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const q of lp) { a = Math.min(a, q[0]); b = Math.min(b, q[1]); c = Math.max(c, q[0]); d = Math.max(d, q[1]); } return [a, b, c, d]; });
    const inside = q => { let n = 0; loops.forEach((lp, i) => { const bb = bbs[i]; if (q[0] < bb[0] || q[0] > bb[2] || q[1] < bb[1] || q[1] > bb[3]) return; if (C.pointInPoly(q, lp)) n++; }); return n % 2 === 1; };
    const onBnd = q => loops.some(lp => { for (let i = 0; i < lp.length; i++) { const a = lp[i], b = lp[(i + 1) % lp.length], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); if (Math.hypot(q[0] - a[0] - dx * t, q[1] - a[1] - dy * t) < 1e-4) return true; } return false; });
    const out = [];
    for (const [A, B] of vis) {
      const ts = [0, 1], dx = B[0] - A[0], dy = B[1] - A[1];
      loops.forEach((lp, li) => { const bb = bbs[li]; if (Math.max(A[0], B[0]) < bb[0] || Math.min(A[0], B[0]) > bb[2] || Math.max(A[1], B[1]) < bb[1] || Math.min(A[1], B[1]) > bb[3]) return; for (let i = 0; i < lp.length; i++) { const a = lp[i], b = lp[(i + 1) % lp.length], ex = b[0] - a[0], ey = b[1] - a[1], den = dx * ey - dy * ex; if (Math.abs(den) < 1e-14) continue; const t = ((a[0] - A[0]) * ey - (a[1] - A[1]) * ex) / den, u = ((a[0] - A[0]) * dy - (a[1] - A[1]) * dx) / den; if (t > 1e-9 && t < 1 - 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) ts.push(t); } });
      ts.sort((a, b) => a - b); let cur = null;
      for (let k = 1; k < ts.length; k++) {
        if (ts[k] - ts[k - 1] < 1e-9) continue; const tm = (ts[k] + ts[k - 1]) / 2, m = [A[0] + dx * tm, A[1] + dy * tm];
        const keep = !inside(m) || onBnd(m);
        if (keep) { const p0 = [A[0] + dx * ts[k - 1], A[1] + dy * ts[k - 1]], p1 = [A[0] + dx * ts[k], A[1] + dy * ts[k]]; if (cur) cur[1] = p1; else cur = [p0, p1]; }
        else if (cur) { out.push(cur); cur = null; }
      }
      if (cur && Math.hypot(cur[1][0] - cur[0][0], cur[1][1] - cur[0][1]) > 1e-4) out.push(cur);
    }
    return out;
  };
  const unionLoops = (solids) => {
    const TOL = 1e-4, K = p => Math.round(p[0] / TOL) + ',' + Math.round(p[1] / TOL);
    const inside = p => solids.some(ls => { let c = false; for (const lp of ls) if (C.pointInPoly(p, lp)) c = !c; return c; });
    const loops = [];
    if (solids.length && C.planarFaces) {
      const segs = []; for (const ls of solids) for (const lp of ls) for (let i = 0; i < lp.length; i++) segs.push([lp[i], lp[(i + 1) % lp.length]]);
      const faces = C.planarFaces(segs), seen = new Set(), bnd = [];
      for (const f of faces) for (let i = 0; i < f.length; i++) {
        const a = f[i], b = f[(i + 1) % f.length], ka = K(a), kb = K(b), key = ka < kb ? ka + '|' + kb : kb + '|' + ka; if (seen.has(key)) continue; seen.add(key);
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1e-9) continue;
        const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l, eps = Math.min(1e-3, l * 0.05);
        const L = inside([m[0] + nx * eps, m[1] + ny * eps]), Rr = inside([m[0] - nx * eps, m[1] - ny * eps]);
        if (L !== Rr) bnd.push(L ? [a, b] : [b, a]);
      }
      // yönlü zincirleme (dolu taraf solda)
      const from = new Map(); bnd.forEach((s2, i) => { const k = K(s2[0]); if (!from.has(k)) from.set(k, []); from.get(k).push(i); });
      const used = new Uint8Array(bnd.length);
      for (let i = 0; i < bnd.length; i++) {
        if (used[i]) continue; used[i] = 1; const lp = [bnd[i][0]]; let cur = bnd[i][1], guard = 0;
        while (guard++ < 100000) { const k = K(cur); if (k === K(lp[0])) break; lp.push(cur); const c = (from.get(k) || []).find(j => !used[j]); if (c == null) break; used[c] = 1; cur = bnd[c][1]; }
        const q = simplify(lp, true); if (q.length >= 3 && Math.abs(M.polyArea(q)) > 1e-6) loops.push(q);
      }
    }
    return loops;
  };
  /* görünen çizgiler: aynı doğrudakileri birleştir, kesit sınırıyla çakışan kısımları çıkar */
  const mergeVis = (vis, loops, open) => {
    const TOL = 1e-4;
    const lines = new Map(), keyOf = (A, B) => {
      let dx = B[0] - A[0], dy = B[1] - A[1]; const l = Math.hypot(dx, dy); if (l < 1e-9) return null; dx /= l; dy /= l; if (dx < -1e-9 || (Math.abs(dx) <= 1e-9 && dy < 0)) { dx = -dx; dy = -dy; }
      const c = dx * A[1] - dy * A[0]; return { k: Math.round(Math.atan2(dy, dx) * 1e5) + '|' + Math.round(c / TOL), dx, dy, c, t0: dx * A[0] + dy * A[1], t1: dx * B[0] + dy * B[1] };
    };
    const addI = (A, B, mask) => { const q = keyOf(A, B); if (!q) return; let L = lines.get(q.k); if (!L) lines.set(q.k, L = { dx: q.dx, dy: q.dy, c: q.c, iv: [], mk: [] }); (mask ? L.mk : L.iv).push([Math.min(q.t0, q.t1), Math.max(q.t0, q.t1)]); };
    for (const [A, B] of vis) addI(A, B, false);
    for (const lp of loops) for (let i = 0; i < lp.length; i++) addI(lp[i], lp[(i + 1) % lp.length], true);
    for (const pl of open) for (let i = 1; i < pl.length; i++) addI(pl[i - 1], pl[i], true);
    const merge = iv => { iv.sort((a, b) => a[0] - b[0]); const o = []; for (const s2 of iv) { if (o.length && s2[0] <= o[o.length - 1][1] + TOL) o[o.length - 1][1] = Math.max(o[o.length - 1][1], s2[1]); else o.push(s2.slice()); } return o; };
    const visOut = [];
    for (const L of lines.values()) {
      if (!L.iv.length) continue; let iv = merge(L.iv); const mk = merge(L.mk);
      for (const [m0, m1] of mk) { const nv = []; for (const [a, b] of iv) { if (m1 <= a + TOL || m0 >= b - TOL) { nv.push([a, b]); continue; } if (m0 > a + TOL) nv.push([a, m0]); if (m1 < b - TOL) nv.push([m1, b]); } iv = nv; }
      for (const [a, b] of iv) if (b - a > 1e-3) { const P = t => [L.dx * t - L.dy * L.c, L.dy * t + L.dx * L.c]; visOut.push([P(a), P(b)]); }
    }
    return visOut;
  };
  /* aynı doğru üzerindeki ara köşeleri sil */
  const simplify = (pts, closed) => {
    let p = pts.filter((q, i) => i === 0 || Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) > 1e-7);
    let changed = true;
    while (changed && p.length > (closed ? 3 : 2)) {
      changed = false; const n = p.length;
      for (let i = closed ? 0 : 1; i < (closed ? n : n - 1); i++) {
        const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - b[0], vy = c[1] - b[1];
        const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy); if (lu < 1e-9 || lv < 1e-9 || Math.abs(ux * vy - uy * vx) / (lu * lv) < 1e-6 && ux * vx + uy * vy > 0) { p.splice(i, 1); changed = true; break; }
      }
    }
    return p;
  };
  const CONC = new Set(['tretuvar', 'cati', 'yalitim', 'kaplama', 'dolgu', 'perde', 'kolon', 'kiris', 'plak', 'temel', 'tank', 'ctank', 'wall', 'slab', 'kati', 'box', 'poly3', 'grup3', 'sweep', 'cyl', 'pmesh', 'face', 'anaerobik', 'onaritma', 'kumtutucu']); // anaerobik, onaritma: tek beton katı ünite yapıları
  /* kesitte malzeme grubu: B = temel+perde (tek gövde), D = döşeme+kiriş+kolon (tek gövde, ters yön tarama), T:x = kâgir duvar, G = grobeton */
  C.secMat = e => { if (e.type === 'cati' || e.type === 'tretuvar') return 'K'; if (e.type === 'yalitim') return e.kind === 'bant' ? 'K' : 'Y'; if (e.type === 'kaplama') return 'K'; if (e.type === 'dolgu') return 'F'; if (e.type === 'perde') return (e.malz || 'beton') === 'beton' ? 'B' : 'T:' + e.malz; if ((e.type === 'plak' && e.kind !== 'radye') || e.type === 'kiris' || e.type === 'kolon' || e.type === 'slab') return 'D'; return 'B'; };
  C.secFnd = e => (e.type === 'yalitim' && e.kind === 'temel') || e.type === 'temel' || (e.type === 'plak' && e.kind === 'radye') || (e.type === 'perde' && e.temel) || e.type === 'tank' || e.type === 'ctank';
  /* Çokal pafta stilinde (PAFTASTIL COKAL) taramalar örnek projedeki gibidir: desen, açı, ölçek kural tablosundan (app/cizim-kural.js → MIMARI.kesitTarama;
     kullanıcı kararı 14.11.2026). Tabloda karşılığı olmayan malzeme (null) ve eski görünüm (PAFTASTIL KLASIK) aşağıdaki program desenleriyle taranır. */
  const kuralTarama = mat => { try { const K = C.cizimKural; if (!K || !K.kesitTaramaSec || !(C.pstil && C.pstil())) return null; const s = K.kesitTaramaSec(K.MIMARI, mat); if (!s || !(C.HATCH_PATTERNS || {})[s.pat]) return null; return { pat: s.pat, ang: s.ang, sc: s.sc, ann: s.ann }; } catch (e) { return null; } };
  C.secHatchSpec = (mat, base, plan) => {
    const kt = mat !== 'K' && kuralTarama(mat || 'B'); if (kt) return kt;
    const P = C.HATCH_PATTERNS || {}, b = P[base] ? base : 'ANSI31';
    if (mat === 'KA') return C.pstil && C.pstil() && P.SOLID ? { pat: 'SOLID', ang: 0, sc: 1, ann: true } : null; // kesilen çatı ahşabı (makas, aşık, mertek): beton olmayan kesilen parça → dolu (kural tablosu: diger SOLID)
    if (mat === 'D') return { pat: b, ang: 90, sc: 1, ann: true };
    if (mat === 'G') return { pat: 'AR-CONC', ang: 0, sc: 0.5, ann: true };
    if (mat === 'K') return null;
    if (mat === 'Y') return { pat: 'ZIGZAG', ang: 0, sc: 0.25, ann: true };
    if (mat === 'F') return { pat: 'GRAVEL', ang: 0, sc: 0.5, ann: true };
    if (mat && mat.startsWith('TR:')) return ({ kap: { pat: 'ANSI37', ang: 0, sc: 0.15, ann: true }, harc: { pat: 'AR-SAND', ang: 0, sc: 0.2, ann: true }, beton: { pat: 'AR-CONC', ang: 0, sc: 0.25, ann: true }, stab: { pat: 'GRAVEL', ang: 0, sc: 0.35, ann: true }, bord: { pat: 'ANSI31', ang: 0, sc: 0.4, ann: true }, yatak: { pat: 'AR-CONC', ang: 0, sc: 0.25, ann: true } })[mat.slice(3)] || null;
    if (mat && mat.startsWith('T:')) { if (plan) return { pat: 'ANSI31', ang: 90, sc: 1.6, ann: true }; const m = mat.slice(2); return m === 'tugla' ? { pat: 'AR-BRSTD', ang: 0, sc: 1.4, ann: false } : { pat: 'AR-B816', ang: 0, sc: m === 'gazbeton' ? 1.2 : 1, ann: false }; }
    return { pat: b, ang: 0, sc: 1, ann: true };
  };
  /* her malzeme grubu ayrı tarama */
  C.secHatches = (R, W, layer, base, plan, mk) => {
    let n = 0; const add = mk || ((t, p) => C.add(C.newEnt(t, p)));
    for (const g of (R.byMat || [{ mat: 'B', loops: R.loops }])) { if (!g.loops.length) continue; const sp = C.secHatchSpec(g.mat, base, plan); if (!sp) continue; add('hatch', { loops: g.loops.map(lp => (C.denseLoop ? C.denseLoop(lp) : lp).map(q => { const w = W(q); return [w[0], w[1]]; })), pat: sp.pat, sc: sp.sc, ang: sp.ang, ann: sp.ann, orig: [0, 0], layer: typeof layer === 'function' ? layer(g) : layer, smat: g.mat }); n++; }
    return n;
  };
  /* elemanın kesit katman anahtarı: INS_PERDE → PERDE, korkuluk → KORKULUK */
  C.secLk = e => { if (e.type === 'korkuluk' && (!e.layer || e.layer === '0' || /^INS_/.test(e.layer))) return 'KORKULUK'; let l = e.layer && e.layer !== '0' ? e.layer : ((C.insLayerFor && C.insLayerFor(e)) || (C.T[e.type] && C.T[e.type].label) || e.type); l = C.up(String(l)).replace(/^INS_/, '').replace(/^ARI_/, '').replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, ''); return l || 'GENEL'; };
  C.secLkCol = lk => { const cand = ['INS_' + lk, lk, 'ARI_' + lk, lk === 'KORKULUK' ? 'INS_MERDIVEN' : ''].find(n => n && C.doc.layers[n]); return cand ? C.doc.layers[cand].color : 7; };
  let letter = 1;
  C.addCommand(['SECTION', 'KESITAL', 'KESIT', 'GORUNUSAL'], '3B modelden kesit: KESITAL nokta1 nokta2 bakış-yönü-noktası [derinlik] yerleşim-noktası [ad]. Kesilen beton/boru kalın, görünenler ince, boru eksenleri eksen çizgisiyle çizilir.', async (I) => {
    const kv = {}; C.cmd.queue = C.cmd.queue.filter(t => { const m = /^([A-Za-z]+)=(.*)$/.exec(t); if (m) { kv[C.up(m[1])] = C.up(m[2]); return false; } return true; });
    if (kv.T) { C.secHatch = kv.T; try { localStorage.setItem('aritmacad.kesitTarama', kv.T); } catch (e) { } }
    const a = await I.pt('Kesit çizgisi 1. nokta'); if (!a || typeof a === 'string') return;
    C.cmd.base = a; const b = await I.pt('Kesit çizgisi 2. nokta'); if (!b || typeof b === 'string') return;
    const u = M.norm([b[0] - a[0], b[1] - a[1], 0]), Lc = M.dist2(a, b);
    C.cmd.base = null; C.cmd.preview = c => { let n = [-u[1], u[0]]; if ((c[0] - a[0]) * n[0] + (c[1] - a[1]) * n[1] < 0) n = [-n[0], -n[1]]; const m = M.lerp(a, b, 0.5), q = [m[0] + n[0] * Lc * 0.15, m[1] + n[1] * Lc * 0.15, 0]; return [C.prim.L(a, b, { lt: 'PHANTOM' }), C.prim.L(m, q)]; };
    const sp = await I.pt('Bakış yönü (kesitin baktığı taraf)'); C.cmd.preview = null; if (!sp || typeof sp === 'string') return;
    let n = [-u[1], u[0], 0]; if ((sp[0] - a[0]) * n[0] + (sp[1] - a[1]) * n[1] < 0) n = [-n[0], -n[1], 0];
    const depth = await I.num('Görüş derinliği (m)', 30);
    const used = new Set(C.doc.ents.filter(e => (e.type === 'text' || e.type === 'baslik') && /^[A-Z]-[A-Z] KES/.test(e.s)).map(e => e.s[0]).concat(C.doc.ents.filter(e => e.type === 'kesitisaret').map(e => e.name)));
    let nm = String.fromCharCode(65 + letter); while (used.has(nm) && letter < 25) nm = String.fromCharCode(65 + ++letter);
    nm = (await I.str('Kesit adı (harf)', nm, { whole: false }) || nm).toUpperCase().slice(0, 3);
    // ön hesap: kesit sınırları
    const dist = p => (p[0] - a[0]) * n[0] + (p[1] - a[1]) * n[1];
    const uv = p => [(p[0] - a[0]) * u[0] + (p[1] - a[1]) * u[1], p[2] || 0];
    const cut = [], vis = [], axes = [], ends = [], bants = [], secEnts = new Set(), eqEnts = [];
    /* her elemanın kesiti kendi katmanında: INS_PERDE → KESIT_PERDE (kesilen sınır), KESIT_PERDE_TARAMA (tarama), GORUNEN_PERDE (görünen çizgiler) */
    const lkOf = C.secLk;
    /* perde ayağı (kicker): altındaki temelle birlikte dökülür → kesitte temelin katmanı / taraması, derz çizgisi bant ekseninde */
    const kSup = new Map(), supOf = k => { if (kSup.has(k.id)) return kSup.get(k.id); let kb = null; try { kb = C.bbox(k); } catch (er) { } const z = +k.z0 || 0; let best = null;
      if (kb) for (const x of C.doc.ents) { if (x === k || !C.layer(x.layer).on) continue; let zt = null; if (x.type === 'temel' || x.type === 'plak') zt = +x.zt || 0; else if (x.type === 'perde' && x.temel) zt = (+x.z0 || 0) + (+x.h || 0); else continue;
        if (Math.abs(zt - z) > 0.03) continue; let b; try { b = C.bbox(x); } catch (er) { continue; } if (b[0] > kb[2] + 0.02 || b[2] < kb[0] - 0.02 || b[1] > kb[3] + 0.02 || b[3] < kb[1] - 0.02) continue; if (!best || (x.type !== 'plak' || x.kind === 'radye')) best = x; if (x.type === 'temel' || x.kind === 'radye' || x.temel) break; }
      kSup.set(k.id, best); return best; };
    const inU = q => q[0] > -2 && q[0] < Lc + 2;
    for (const e of C.doc.ents) {
      if (!C.layer(e.layer).on || e.type === 'sheet') continue;
      if (e.type === 'yalitim' && e.kind === 'bant') { // su tutucu bant: kesitte ağ yerine I tipi profil sembolü
        const n0 = e.pts.length, sg = []; for (let i = 1; i < n0; i++) sg.push([e.pts[i - 1], e.pts[i]]); if (e.closed && n0 > 2) sg.push([e.pts[n0 - 1], e.pts[0]]);
        for (const [p, q] of sg) { const dp = dist(p), dq = dist(q); if ((dp > 0) === (dq > 0) || dp === dq) continue; const s = dp / (dp - dq), X = [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s, +e.z || 0], U = uv(X); if (inU(U)) bants.push({ u: U[0], z: +e.z || 0, w: (+e.w || 20) / 100, t: (+e.t || 5) / 1000 }); }
        continue;
      }
      const ms = C.meshes(e); if (!ms || !ms.length) continue;
      const bb = C.bbox(e); // hızlı eleme
      const cs = [[bb[0], bb[1]], [bb[2], bb[1]], [bb[2], bb[3]], [bb[0], bb[3]]].map(p => dist(p));
      if (Math.max(...cs) < -0.01 || Math.min(...cs) > depth) continue;
      if (e.type === 'blk' && kv.EKIPMAN !== 'KES' && C.projectModel) { let mm = null; try { mm = C.T.blk.mesh(e); } catch (er) { } if (mm && mm.length) { eqEnts.push(e); secEnts.add(e); continue; } } // 3B ekipman: kesilmez, görünüşü çizilir
      const t = C.entTris(e); if (!t) continue;
      const P = t.pos, eCut = [];
      const kdD = e.type === 'kiris' && C.kirisDoseme ? C.kirisDoseme(e) : null; // döşemeyle birlikte dökülen kiriş: kesitte döşemeyle tek gövde (tek dış hat, tek tarama)
      for (let i = 0; i < P.length; i += 9) {
        const p0 = [P[i], P[i + 1], P[i + 2]], p1 = [P[i + 3], P[i + 4], P[i + 5]], p2 = [P[i + 6], P[i + 7], P[i + 8]];
        const d0 = dist(p0), d1 = dist(p1), d2 = dist(p2);
        if ((d0 > 0 && d1 > 0 && d2 > 0) || (d0 < 0 && d1 < 0 && d2 < 0)) continue;
        const pts = [];
        for (const [x, y, dx, dy] of [[p0, p1, d0, d1], [p1, p2, d1, d2], [p2, p0, d2, d0]]) if ((dx < 0) !== (dy < 0) && dx !== dy) { const s = dx / (dx - dy); pts.push(uv(M.lerp(x, y, s))); }
        if (pts.length === 2 && Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]) > 1e-5) { pts.g = e.id; if (e.type === 'tretuvar' && C.tretSecMat && t.col && t.col[i] >= 0) { pts.mat = C.tretSecMat(e, [t.col[i], t.col[i + 1], t.col[i + 2]]); pts.g = e.id + '|' + pts.mat; } if (e.type === 'cati' && C.catiSecMat && t.col && t.col[i] >= 0) { pts.mat = C.catiSecMat(e, [t.col[i], t.col[i + 1], t.col[i + 2]]); pts.g = e.id + '|' + pts.mat; } pts.terr = e.type === 'arazi' || e.type === 'kazi'; pts.conc = CONC.has(e.type); pts.mat = pts.mat || C.secMat(e); pts.fnd = C.secFnd(e); pts.lk = lkOf(e); if (e.type === 'perde' && e.kicker) { const sp = supOf(e); if (sp) { pts.mat = C.secMat(sp); pts.lk = lkOf(sp); } } if (kdD) { pts.mat = C.secMat(kdD); pts.lk = lkOf(kdD); } if (pts.terr ? (inU(pts[0]) && inU(pts[1])) : true) eCut.push(pts); }
      }
      if (eCut.length && (eCut[0].terr || eCut.some(q => inU(q[0]) || inU(q[1])))) { cut.push(...eCut); secEnts.add(e); } // kesit çizgisinin değdiği gövde bütün olarak kesilir (kapalı, taranabilir)
      if (e.type === 'pipe') {
        const r = C.T.pipe.r(e), path = C.pipePath(e).pts, lkp = lkOf(e);
        for (let i = 1; i < path.length; i++) {
          const p = path[i - 1], q = path[i], dp = dist(p), dq = dist(q);
          if (Math.max(dp, dq) < 0 || Math.min(dp, dq) > depth) continue;
          const A = uv(p), B = uv(q), d = [B[0] - A[0], B[1] - A[1]], l = Math.hypot(d[0], d[1]);
          if (!inU(A) && !inU(B)) continue;
          if (l > 1e-6) { const nn = [-d[1] / l * r, d[0] / l * r]; axes.push([A, B]); if (dp >= 0 && dq >= 0) { const v1 = [[A[0] + nn[0], A[1] + nn[1]], [B[0] + nn[0], B[1] + nn[1]]], v2 = [[A[0] - nn[0], A[1] - nn[1]], [B[0] - nn[0], B[1] - nn[1]]]; v1.lk = v2.lk = lkp; vis.push(v1, v2); secEnts.add(e); } }
          else if (dp > 0.01) { ends.push({ c: A, r, lk: lkp }); secEnts.add(e); }
        }
        continue;
      }
      const elk = kdD ? lkOf(kdD) : lkOf(e);
      if (e.type === 'fit3' && C.fit3Line) for (const [p, q] of C.fit3Line(e)) { const dp = dist(p), dq = dist(q); if (Math.max(dp, dq) < -1e-6 || Math.min(dp, dq) > depth) continue; const A = uv(p), B = uv(q); if ((inU(A) || inU(B)) && Math.hypot(A[0] - B[0], A[1] - B[1]) > 1e-6) axes.push([A, B]); } // ek parça eksenleri (dirsek yayı, TE kolu)
      for (const [p, q] of t.edges.concat(C.silEdges ? C.silEdges(t, n) : [])) { const dp = dist(p), dq = dist(q); if (dp < -1e-6 || dq < -1e-6 || dp > depth || dq > depth) continue; const A = uv(p), B = uv(q); if (!inU(A) && !inU(B)) continue; if (Math.hypot(A[0] - B[0], A[1] - B[1]) > 1e-5) { const sg = [A, B]; sg.lk = elk; vis.push(sg); secEnts.add(e); } }
    }
    // 3B ekipman görünüşü (3B'deki gibi): gizli çizgileri ayıklanmış dış hat + belirgin kenarlar, bakış yönünde
    if (eqEnts.length) {
      try {
        const D = n, Rr = M.norm(M.cross(D, [0, 0, 1])), Uu = M.cross(Rr, D), sg = M.dot(Rr, [u[0], u[1], 0]) >= 0 ? 1 : -1, a0 = M.dot([a[0], a[1], 0], Rr), uz = Uu[2] >= 0 ? 1 : -1;
        for (const e of eqEnts) { const r = C.projectModel({ ents: [e], d: D, res: 1400 }); const lk = lkOf(e); for (const [p, q] of r.vis) { const A = [(p[0] - a0) * sg, p[1] * uz], B = [(q[0] - a0) * sg, q[1] * uz]; if ((inU(A) || inU(B)) && Math.hypot(A[0] - B[0], A[1] - B[1]) > 1e-5) { const sgm = [A, B]; sgm.lk = lk; vis.push(sgm); } } }
      } catch (er) { C.warn('Ekipman görünüşü çizilemedi: ' + er.message); }
    }
    if (!cut.length && !vis.length && !axes.length) { C.warn('Bu kesit çizgisi hiçbir 3B nesneyi kesmiyor/görmüyor (yalnız 3B nesneler: duvar, havuz, boru, pompa, vana, 3B bloklar).'); return; }
    // yerleşim
    const all = [...cut.flat(), ...vis.flat(), ...axes.flat()];
    const ub = [Math.min(...all.map(q => q[0])), Math.min(...all.map(q => q[1])), Math.max(...all.map(q => q[0])), Math.max(...all.map(q => q[1]))];
    C.cmd.preview = c => [C.prim.P([[c[0] + ub[0], c[1] + ub[1], 0], [c[0] + ub[2], c[1] + ub[1], 0], [c[0] + ub[2], c[1] + ub[3], 0], [c[0] + ub[0], c[1] + ub[3], 0]], true, { lt: 'DASHED' })];
    const q0 = await I.pt('Kesitin yerleşim noktası (kesit çizgisinin başlangıcı, kot 0 hizası)'); C.cmd.preview = null; if (!q0 || typeof q0 === 'string') return;
    const W = q => [q0[0] + q[0], q0[1] + q[1], 0];
    ['EKSEN', 'YAZI', 'ZEMIN'].forEach(C.std);
    if (C.kesitStil) { const ks = C.kesitStil(); if (C.doc.layers.KESIT) C.doc.layers.KESIT.lw = ks.cutLw; if (C.doc.layers.GORUNEN) C.doc.layers.GORUNEN.lw = ks.visLw; if (!C.secHatch && ks.pat) C.secHatch = ks.pat; }
    let nC = 0, nV = 0;
    const gb = kv.GROBETON === 'H' || kv.GB === '0' ? 0 : (parseFloat(kv.GB) > 0 ? parseFloat(kv.GB) / 100 : 0.10); // grobeton (cm)
    const R = C.sectionMerge(cut, vis, { grobeton: gb });
    { const km = C.doc.set.kesitMeta || (C.doc.set.kesitMeta = {}); km[nm] = { a: [a[0], a[1]], u: [u[0], u[1]], n: [n[0], n[1]], q0: [q0[0], q0[1]], ub: ub.slice(), gb, depth }; } // malzeme açılımı için: kesit → model eşlemesi
    const ks0 = C.kesitStil ? C.kesitStil() : null, SL = C.STD_LAYERS || {}, cutLw = ks0 ? ks0.cutLw : ((SL.KESIT || [])[2] || 50), visLw = ks0 ? ks0.visLw : ((SL.GORUNEN || [])[2] || 18);
    const srcCol = lk => { const cand = ['INS_' + lk, lk, 'ARI_' + lk, lk === 'KORKULUK' ? 'INS_MERDIVEN' : ''].find(n => C.doc.layers[n]); return cand ? C.doc.layers[cand].color : 7; };
    const LC = lk => { const n = lk ? 'KESIT_' + lk : 'KESIT'; if (lk) C.ensureLayer(n, srcCol(lk), 'CONTINUOUS', cutLw); return n; };
    const LV = lk => { const n = lk ? 'GORUNEN_' + lk : 'GORUNEN'; if (lk) C.ensureLayer(n, srcCol(lk), 'CONTINUOUS', visLw); return n; };
    const LH = lk => { const n = lk ? 'KESIT_' + lk + '_TARAMA' : 'KESIT_TARAMA'; C.ensureLayer(n, 8, 'CONTINUOUS', 13); return n; };
    for (const lp of R.loops.concat(R.equip)) { if (C.addFitted(lp, true, W, { layer: LC(lp.lk) })) nC++; }
    for (const pl of R.open) { if (pl.terr) { C.add(C.newEnt(pl.length === 2 ? 'line' : 'pline', pl.length === 2 ? { a: W(pl[0]), b: W(pl[1]), layer: 'ZEMIN' } : { pts: pl.map(W), closed: false, layer: 'ZEMIN' })); nC++; } else if (C.addFitted(pl, false, W, { layer: LC(pl.lk) })) nC++; }
    { const vg = new Map(); for (const sg of R.vis) { const k = sg.lk || ''; if (!vg.has(k)) vg.set(k, []); vg.get(k).push(sg); } for (const [k, vs] of vg) nV += C.addFittedSegs(vs, W, { layer: LV(k || null) }); }
    const pat = C.secHatch || (() => { try { return localStorage.getItem('aritmacad.kesitTarama'); } catch (e) { return null; } })() || 'ANSI31';
    let nH = 0;
    if ((R.loops.length || R.equip.length) && pat !== 'YOK' && pat !== 'H' && C.T.hatch) {
      if (R.loops.length) nH = C.secHatches(R, W, g => LH(g.lk), pat, false);
      const eqG = new Map(); for (const lp of R.equip) { const k = lp.lk || ''; if (!eqG.has(k)) eqG.set(k, []); eqG.get(k).push(lp); }
      for (const [k, eqs] of eqG) C.add(C.newEnt('hatch', { loops: eqs.map(lp => (C.denseLoop ? C.denseLoop(lp) : lp).map(q => { const w = W(q); return [w[0], w[1]]; })), ...(C.ekipTarama ? C.ekipTarama() : { pat: 'ANSI37', sc: 0.5 }), ang: 0, ann: true, orig: [0, 0], layer: LH(k || null) }));
    }
    // su tutucu bant profili (I tipi): şerit + iki yanda dişler + ortada boş bulb
    if (bants.length) {
      C.ensureLayer('KESIT_SU_TUTUCU_BANT', 2, 'CONTINUOUS', 25);
      for (const bq of bants) { const ly = 'KESIT_SU_TUTUCU_BANT', x = bq.u, z0 = bq.z - bq.w / 2, z1 = bq.z + bq.w / 2, ht = Math.max(bq.t, 0.004) / 2, rb = Math.max(0.012, bq.w * 0.06), br = Math.max(0.008, bq.w * 0.04);
        C.add(C.newEnt('pline', { pts: [W([x - ht, z0]), W([x + ht, z0]), W([x + ht, bq.z - br]), W([x - ht, bq.z - br])], closed: true, layer: ly }));
        C.add(C.newEnt('pline', { pts: [W([x - ht, bq.z + br]), W([x + ht, bq.z + br]), W([x + ht, z1]), W([x - ht, z1])], closed: true, layer: ly }));
        C.add(C.newEnt('circle', { c: W([x, bq.z]), r: br, layer: ly }));
        const nr = 4; for (const sgn of [-1, 1]) for (let j = 0; j < nr; j++) { const zz = bq.z + sgn * (br + (bq.w / 2 - br) * (j + 0.5) / nr); C.add(C.newEnt('line', { a: W([x - rb, zz]), b: W([x + rb, zz]), layer: ly })); }
        // açıklama oku (leader): "SU TUTUCU BANT"
        if (kv.YAZI !== 'H') { const sd = x < (ub[0] + ub[2]) / 2 ? -1 : 1, th = C.annoH(2.5), p0 = [x + sd * ht, bq.z + bq.w * 0.3], p1 = [x + sd * (0.35 + th * 2), bq.z + 0.45 + th * 2], p2 = [p1[0] + sd * th * 3, p1[1]], al = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), ah = th * 0.45, aw = th * 0.13;
          const tip = W(p0), b1 = W([p0[0] + Math.cos(al) * ah - Math.sin(al) * aw, p0[1] + Math.sin(al) * ah + Math.cos(al) * aw]), b2 = W([p0[0] + Math.cos(al) * ah + Math.sin(al) * aw, p0[1] + Math.sin(al) * ah - Math.cos(al) * aw]);
          C.add(C.newEnt('pline', { pts: [W(p0), W(p1), W(p2)], closed: false, layer: 'YAZI', dis: 'Mimari' }));
          if (C.T.solid) C.add(C.newEnt('solid', { pts: [tip, b1, b2], layer: 'YAZI', dis: 'Mimari' })); else C.add(C.newEnt('pline', { pts: [tip, b1, b2], closed: true, layer: 'YAZI', dis: 'Mimari' }));
          C.add(C.newEnt('text', { p: W([p2[0] + sd * th * 0.4, p2[1] - th / 2]), h: th, s: `SU TUTUCU BANT (PVC ${Math.round(bq.w * 100)}/${Math.round(bq.t * 1000)})`, rot: 0, al: sd < 0 ? 'R' : 'L', layer: 'YAZI', dis: 'Mimari' })); }
        nC++; }
    }
    // otomatik kotlar: kesitteki tüm üst yüzeyler (merdiven basamakları, korkuluk, su tutucu bant, grobeton hariç); kapatmak için KESITAL KOT=H
    let nK = 0;
    if (kv.KOT !== 'H') {
      const SKIP = new Set(['MERDIVEN', 'KORKULUK', 'SU_TUTUCU_BANT', 'GROBETON']), LP = R.loops, BB = LP.map(lp => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const q of lp) { a = Math.min(a, q[0]); b = Math.min(b, q[1]); c = Math.max(c, q[0]); d = Math.max(d, q[1]); } return [a, b, c, d]; });
      const covered = q => LP.some((lp, k) => { const bb = BB[k]; return q[0] >= bb[0] && q[0] <= bb[2] && q[1] >= bb[1] && q[1] <= bb[3] && C.pointInPoly(q, lp); });
      const lv = [];
      for (const lp of LP) {
        if (SKIP.has(lp.lk)) continue; const sg = M.polyArea(lp) > 0 ? 1 : -1;
        for (let i = 0; i < lp.length; i++) {
          const A = lp[i], B = lp[(i + 1) % lp.length], dx = B[0] - A[0], dy = B[1] - A[1], Ls = Math.hypot(dx, dy);
          if (Ls < 0.15 || Math.abs(dy) > Math.abs(dx) * 0.03 || sg * dx >= 0) continue; // yatay (≤ %3 eğim) ve dolu taraf altta → üst yüzey
          const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; if (m[0] < -2 || m[0] > Lc + 2 || covered([m[0], m[1] + 0.01])) continue;
          lv.push(m);
        }
      }
      lv.sort((p, q) => q[1] - p[1] || p[0] - q[0]); const done = [[ub[2] + 0.5, 0]];
      for (const m of lv) { if (done.some(d => Math.abs(d[1] - m[1]) < 0.005 && Math.abs(d[0] - m[0]) < 1.5)) continue; done.push(m); C.add(C.newEnt('kot', Object.assign({ p: W(m), v: +m[1].toFixed(3), txt: '', layer: 'KOT' }, m[0] < (ub[0] + ub[2]) / 2 ? { ters: true } : {}))); nK++; }
    }
    // otomatik ölçülendirme: altta perde / boşluk zinciri + toplam, solda temel / perde / döşeme kalınlıkları zinciri + toplam yükseklik; kapatmak için KESITAL OLCU=H
    let nD = 0, dimBot = Infinity;
    if (kv.OLCU !== 'H' && C.T.dim) {
      const SKIPD = new Set(['MERDIVEN', 'KORKULUK', 'SU_TUTUCU_BANT', 'GROBETON', 'TRETUVAR']), LPD = R.loops.filter(lp => !SKIPD.has(lp.lk));
      if (LPD.length) {
        C.ensureLayer('KESIT_OLCU', 3, 'CONTINUOUS', 18);
        let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const lp of LPD) for (const q of lp) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
        const fnd = new Set(LPD.filter(lp => /TEMEL/.test(lp.lk || '')).map(lp => lp)), zF = fnd.size ? Math.max(...[...fnd].map(lp => Math.max(...lp.map(q => q[1])))) : z0;
        const xs = [], zs = [];
        for (const lp of LPD) for (let i = 0; i < lp.length; i++) { const A = lp[i], B = lp[(i + 1) % lp.length], dx = B[0] - A[0], dy = B[1] - A[1];
          if (Math.abs(dx) < 1e-3 && Math.abs(dy) > 0.05 && (fnd.has(lp) ? false : true)) xs.push(A[0]);
          if (Math.abs(dy) < 1e-3 && Math.abs(dx) > 0.05) zs.push(A[1]); }
        if (C.pstil && C.pstil() && C.cizimKural && C.cizimKural.kesitOlcuNoktalari) { const r = C.cizimKural.kesitOlcuNoktalari(LPD.map(lp => ({ lk: lp.lk || '', pts: lp }))); if (r.xs.length || r.zs.length) { xs.length = 0; zs.length = 0; xs.push(...r.xs); zs.push(...r.zs); } } /* pafta stili: yalnız mimari elemanlar ölçülür (duvar, boşluk, döşeme) */
        const uniq = (v, tol) => { v.sort((a, b) => a - b); const o = []; for (const x of v) if (!o.length || x - o[o.length - 1] > tol) o.push(x); return o; };
        const XS = uniq(xs.concat([x0, x1]), 0.08), ZS = uniq(zs.concat([z0, z1]), 0.12), psD = C.pstil && C.pstil() && C.pstil().dim ? C.pstil().dim() : null, dd = C.annoH((psD && psD.sira) || 7), /* ölçü sıra aralığı pafta stilinden (kural tablosu) */ zb = z0 - (gb || 0);
        const dim = (k, a, b, p) => { C.add(C.newEnt('dim', { k, a: W(a), b: W(b), p: W(p), layer: 'KESIT_OLCU' })); nD++; };
        /* ilk sıranın yeri: pafta stilinde çizimin en dış çizgisinden (tretuvar dahil) ilk mm uzakta (kural tablosu → olcuYeri.ilkSira); eski görünümde betondan bir sıra aralığı */
        let yA = zb - dd, xA = x0 - dd * 1.6;
        if (psD && psD.ilk) { let ax = x0, az = zb; for (const lp of R.loops) { if (lp.lk === 'KORKULUK') continue; for (const q of lp) { ax = Math.min(ax, q[0]); az = Math.min(az, q[1]); } } yA = az - C.annoH(psD.ilk); xA = ax - C.annoH(psD.ilk); }
        /* pafta stili (kullanıcı 13.11.2026): ölçüler yapının içinden zincir olarak verilir; dışarıda yalnız toplam boy ve toplam yükseklik kalır */
        const icO = psD && C.cizimKural && C.cizimKural.kesitIcOlculer ? C.cizimKural.kesitIcOlculer(LPD.map(lp => ({ lk: lp.lk || '', pts: lp })), C.annoH(1), (C.cizimKural.MIMARI.olcuYeri || {}).genel) : [];
        const disH = !icO.length && XS.length > 2, disV = (!icO.length || icO.eksikDusey) && ZS.length > 2; /* üstü açık hacim varsa dıştaki düşey zincir de çizilir */
        if (disH) for (let i = 1; i < XS.length; i++) dim('h', [XS[i - 1], z0], [XS[i], z0], [0, yA]);
        dim('h', [x0, z0], [x1, z0], [0, yA - (disH ? dd : 0)]);
        if (disV) for (let i = 1; i < ZS.length; i++) dim('v', [x0, ZS[i - 1]], [x0, ZS[i]], [xA, 0]);
        dim('v', [x0, z0], [x0, z1], [xA - (disV ? dd : 0), 0]);
        for (const q of icO) dim(q.k, q.a, q.b, q.p);
        dimBot = yA - (disH ? dd : 0) - dd * 0.6; void zF;
      }
    }
    // mekanik poz balonları (POZNO ile aynı numaralar)
    let nPz = 0;
    if (kv.POZ !== 'H' && C.mekPozListe && C.pozBalon) {
      const { pozOf } = C.mekPozListe(); C.ensureLayer('KESIT_POZ', 2, 'CONTINUOUS', 18); const seenN = new Set(), usedQ = [];
      for (const e of secEnts) { if (!C.isMekanik(e) || !pozOf.has(e.id)) continue; const no = pozOf.get(e.id), a3 = C.pozAnchor(e), q = uv(a3); if (!inU(q) || seenN.has(no + '|' + Math.round(q[0] * 2))) continue; seenN.add(no + '|' + Math.round(q[0] * 2)); C.pozBalon(W(q), no, e.id, { sec: true, layer: 'KESIT_POZ' }, usedQ); nPz++; }
    }
    let nA = 0; if (C.aksOnLine && kv.AKS !== 'H') { const ap = C.aksOnLine(a, u, ub[0] - 0.5, ub[2] + 0.5); if (C.aksAddSection(ap, ub[1], ub[3], W)) nA = ap.length; }
    for (const pl of chain(axes, 1e-4)) C.add(C.newEnt('pline', { pts: pl.map(W), closed: false, layer: 'EKSEN', lt: 'CENTER' }));
    for (const en of ends) C.add(C.newEnt('circle', { c: W(en.c), r: en.r, layer: LV(en.lk) }));
    if (!(C.seviyeKesit && C.seviyeKesit(W, ub)) && ub[1] < 5 && ub[3] > -5) { // kat seviyeleri varsa seviye çizgileri + toprak çizgisi; mutlak kotlu yapıda (0,00 uzaksa) 0 çizgisi çizilmez
      C.add(C.newEnt('line', { a: W([ub[0] - 1, 0]), b: W([ub[2] + 1, 0]), layer: 'ZEMIN', lt: 'DASHED' }));
      C.add(C.newEnt('kot', { p: W([ub[2] + 0.5, 0]), v: 0, txt: '', layer: 'KOT' }));
    }
    const th = C.annoH(5);
    C.add(C.newEnt(C.T.baslik ? 'baslik' : 'text', C.T.baslik ? { p: W([(ub[0] + ub[2]) / 2, Math.min(ub[1], dimBot) - th * 2.2]), ay: W([0, Math.min(ub[1], dimBot)])[1], dmm: 11, s: `${nm}-${nm} KESİTİ`, hp: 5, layer: 'YAZI' } : { p: W([(ub[0] + ub[2]) / 2, ub[1] - th * 3]), h: th, s: `${nm}-${nm} KESİTİ`, rot: 0, al: 'C', layer: 'YAZI' }));
    // plandaki kesit işareti
    if (C.makeSectionMark) C.makeSectionMark(a, b, n, nm);
    else { const ah = C.annoH(4), m1 = M.add(a, M.mul(n, ah * 1.5)), m2 = M.add(b, M.mul(n, ah * 1.5)); C.add(C.newEnt('line', { a, b, layer: 'EKSEN', lt: 'PHANTOM', lw: 35 })); for (const [p, m] of [[a, m1], [b, m2]]) { C.add(C.newEnt('line', { a: p, b: m, layer: 'EKSEN', lw: 35 })); C.add(C.newEnt('text', { p: M.add(m, M.mul(n, ah * 0.4)), h: ah, s: nm, rot: 0, al: 'C', layer: 'YAZI' })); } }
    C.log(`${nm}-${nm} kesiti üretildi: ${R.loops.length} yapı kesit sınırı + ${R.equip.length} ekipman (tek parça), ${nV} görünen çizgi${nA ? `, ${nA} aks` : ''}${nK ? `, ${nK} yüzey kotu (kapatmak: KESITAL KOT=H)` : ''}${nD ? `, ${nD} ölçü (kapatmak: KESITAL OLCU=H)` : ''}${nH ? `, ${nH} malzeme grubu ayrı tarandı (${C.pstil && C.pstil() ? `desenler örnek projedeki gibi (beton ANSI36, tuğla AR-B816, grobeton AR-CONC, dolgu AR-SAND), grobeton ${gb * 100} cm${gb ? '' : ' yok'}; taramasız: KESITAL T=YOK` : `betonarme ${pat}, döşeme/kiriş ters yön, duvar tuğla, grobeton ${gb * 100} cm${gb ? '' : ' yok'}; desen: KESITAL T=AR-CONC ya da T=YOK`}; sonradan taramaya çift tıklayın)` : ''}. Gizli çizgiler ayıklanmaz.`);
    letter++;
  });
})(window.C);

/* ArıtmaCAD — YÜZ ORTASI TUTAMAÇLARI (Revit / SketchUp gibi): seçili elemanın her yüzünün / kenarının ortasından tutup sürükleyerek ebatını değiştir
   Planda: kenar ortası tutamaçları (mavi) — kenar kendine paralel kayar (komşu kenarlar uzar / kısalır), yakalama (snap) ile.
   3B'de: yan yüzlerin ve üst / alt yüzün ortasında tutamaç (oklu kare) — basılı tutup sürükleyin; hareket yüz normaline kilitli, başka nesnelerin noktalarına yakalanır.
   C.handlesOf(e) → [{ p, ax, lab, apply(x, t) }]  (t: eksen boyunca metre) */
(function (C) {
  'use strict';
  const M = C.M, RAD = Math.PI / 180;
  const p2 = p => [p[0], p[1]];
  const area = q => { let a = 0; for (let i = 0; i < q.length; i++) { const p = q[i], r = q[(i + 1) % q.length]; a += p[0] * r[1] - r[0] * p[1]; } return a / 2; };
  const lineX = (a, b, c, d) => { const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-9) return null; const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den; return [a[0] + r[0] * t, a[1] + r[1] * t]; };
  /* çokgen / yol kenarını normali yönünde t kadar kaydır; komşu kenarlar doğrultusunda uzar */
  const offsetEdge = (pts, i, closed, n, t) => {
    const N = pts.length, j = (i + 1) % N, a = pts[i], b = pts[j], a2 = [a[0] + n[0] * t, a[1] + n[1] * t], b2 = [b[0] + n[0] * t, b[1] + n[1] * t], out = pts.map(p => p.slice());
    const hasPrev = closed || i > 0, hasNext = closed || j < N - 1 && j > 0;
    const pa = hasPrev ? pts[(i - 1 + N) % N] : null, nb = hasNext ? pts[(j + 1) % N] : null;
    const na = pa ? lineX(pa, a, a2, b2) : null, nbx = nb ? lineX(nb, b, a2, b2) : null;
    out[i] = [...(na || a2), ...(a.length > 2 ? [a[2]] : [])]; out[j] = [...(nbx || b2), ...(b.length > 2 ? [b[2]] : [])]; return out;
  };
  const polyHandles = (e, z, closedAlways) => {
    const q = e.pts.map(p2), N = q.length, closed = closedAlways || !!e.closed, ccw = area(q) >= 0, H = [];
    const turn = k => { if (!closed && (k <= 0 || k >= N - 1)) return Math.PI; const p0 = q[(k - 1 + N) % N], p1 = q[k], p2 = q[(k + 1) % N], u = [p1[0] - p0[0], p1[1] - p0[1]], v = [p2[0] - p1[0], p2[1] - p1[1]]; return Math.abs(Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1])); };
    const smooth = i => turn(i) < 12 * RAD && turn((i + 1) % N) < 12 * RAD; // yay / daire parçası: tutamaç yok (kalabalık olmasın)
    let nSm = 0;
    for (let i = 0; i < (closed ? N : N - 1); i++) { const a = q[i], b = q[(i + 1) % N], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue; if (N > 8 && smooth(i)) { nSm++; continue; } const u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = closed ? (ccw ? [u[1], -u[0]] : [-u[1], u[0]]) : [-u[1], u[0]];
      H.push({ p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z], ax: [n[0], n[1], 0], lab: `Kenar ${i + 1} (${M.fmt(L, 2)} m)`, apply: (x, t) => { x.pts = offsetEdge(x.pts, i, closed, n, t); } }); }
    if (nSm > 4 && nSm >= (closed ? N : N - 1)) { // tam daire / yay: yarıçap tutamacı (merkezden ölçekler)
      const c = cen(q), R = Math.max(...q.map(p => Math.hypot(p[0] - c[0], p[1] - c[1]))), k0 = q.reduce((bi, p, i) => (p[0] > q[bi][0] ? i : bi), 0), d = [q[k0][0] - c[0], q[k0][1] - c[1]], dl = Math.hypot(d[0], d[1]) || 1;
      H.push({ p: [q[k0][0], q[k0][1], z], ax: [d[0] / dl, d[1] / dl, 0], lab: `Yarıçap (${M.fmt(R, 2)} m)`, radius: true, apply: (x, t) => { const cc = cen(x.pts.map(p2)), RR = Math.max(...x.pts.map(p => Math.hypot(p[0] - cc[0], p[1] - cc[1]))), f = Math.max(0.05, RR + t) / RR; x.pts = x.pts.map(p => [cc[0] + (p[0] - cc[0]) * f, cc[1] + (p[1] - cc[1]) * f, ...(p.length > 2 ? [p[2]] : [])]); } }); }
    return H;
  };
  const cen = q => [q.reduce((s, p) => s + p[0], 0) / q.length, q.reduce((s, p) => s + p[1], 0) / q.length];
  /* tutamacın değiştirdiği toplam ölçü (sürüklerken yanında gösterilir) */
  const extent = (x, ax) => { const q = (x.pts || []).map(p2); if (!q.length) return null; const d = q.map(p => p[0] * ax[0] + p[1] * ax[1]); return Math.max(...d) - Math.min(...d); };
  const plen = x => { let l = 0; const q = (x.pts || []).map(p2); for (let i = 1; i < q.length; i++) l += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); if (x.closed && q.length > 2) l += Math.hypot(q[0][0] - q[q.length - 1][0], q[0][1] - q[q.length - 1][1]); return l; };
  const measOf = (e, h) => {
    const L = h.lab;
    if (h.radius) return ['yarıçap', x => { const q = x.pts.map(p2), c = cen(q); return Math.max(...q.map(p => Math.hypot(p[0] - c[0], p[1] - c[1]))); }];
    if (e.type === 'plak') return /Üst|Alt/.test(L) ? ['kalınlık', x => +x.t] : ['boy', x => extent(x, h.ax)];
    if (e.type === 'dolgu') return /Üst/.test(L) ? ['üst kot', x => +x.zb] : ['boy', x => extent(x, h.ax)];
    if (e.type === 'perde') return /Üst/.test(L) ? ['yükseklik', x => +x.h] : /uç/.test(L) ? ['duvar boyu', x => plen(x)] : ['ölçü', x => (x.closed ? extent(x, h.ax) : plen(x))];
    if (e.type === 'kolon') return /Üst/.test(L) ? ['yükseklik', x => +x.h] : /Çap/.test(L) ? ['çap', x => +x.D] : [L.startsWith('b') ? 'b' : 'd', x => +x[L.startsWith('b') ? 'b' : 'd']];
    if (e.type === 'temel') return /Üst/.test(L) ? ['yükseklik', x => +x.t] : [L, x => +x[L]];
    if (e.type === 'kiris') return /Alt/.test(L) ? ['kiriş yüksekliği', x => +x.hb] : ['kiriş boyu', x => M.dist2(M.p3(x.a), M.p3(x.b))];
    return null;
  };
  C.handlesOf = e => { const H = handles0(e); for (const h of H) { const m = measOf(e, h); if (m) { h.mname = m[0]; h.meas = m[1]; } } return H; };
  const handles0 = e => {
    try {
      switch (e.type) {
        case 'plak': { const zt = +e.zt || 0, t0 = +e.t || 0.2, c = cen(e.pts), H = polyHandles(e, zt - t0 / 2, true);
          H.push({ p: [c[0], c[1], zt], ax: [0, 0, 1], lab: 'Üst yüz (kalınlık, alt sabit)', apply: (x, t) => { const nt = Math.max(0.02, (+x.t || 0.2) + t); x.zt = (+x.zt || 0) + (nt - (+x.t || 0.2)); x.t = +nt.toFixed(4); } });
          H.push({ p: [c[0], c[1], zt - t0], ax: [0, 0, -1], lab: 'Alt yüz (kalınlık, üst sabit)', apply: (x, t) => { x.t = +Math.max(0.02, (+x.t || 0.2) + t).toFixed(4); } });
          return H; }
        case 'dolgu': { const zb = +e.zb || 0, c = cen(e.pts), H = polyHandles(e, zb, true); H.push({ p: [c[0], c[1], zb], ax: [0, 0, 1], lab: 'Üst kot', apply: (x, t) => { x.zb = +((+x.zb || 0) + t).toFixed(4); } }); return H; }
        case 'perde': { if (e.parapet || e.host) return []; const z0 = +e.z0 || 0, h = +e.h || 3, H = polyHandles(e, z0 + h, false), q = e.pts.map(p2), c = cen(q);
          H.push({ p: [q[0][0] + (q[1] ? (q[1][0] - q[0][0]) * 0.5 : 0), q[0][1] + (q[1] ? (q[1][1] - q[0][1]) * 0.5 : 0), z0 + h], ax: [0, 0, 1], lab: 'Üst yüz (yükseklik)', apply: (x, t) => { x.h = +Math.max(0.05, (+x.h || 3) + t).toFixed(4); } });
          if (!e.closed && q.length >= 2) { for (const [k, k2] of [[0, 1], [q.length - 1, q.length - 2]]) { const a = q[k], b = q[k2], L = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, u = [(a[0] - b[0]) / L, (a[1] - b[1]) / L]; H.push({ p: [a[0], a[1], z0 + h / 2], ax: [u[0], u[1], 0], lab: k ? 'Bitiş ucu (uzat)' : 'Başlangıç ucu (uzat)', apply: (x, t) => { const p = x.pts[k]; x.pts[k] = [p[0] + u[0] * t, p[1] + u[1] * t, ...(p.length > 2 ? [p[2]] : [])]; } }); } }
          return H.map(h2 => h2.lab.startsWith('Kenar') ? Object.assign(h2, { lab: h2.lab.replace('Kenar', 'Duvar yüzü') }) : h2); }
        case 'kolon': { const c = M.p3(e.p), z0 = +e.z0 || 0, h = +e.h || 3, zm = z0 + h, r = (+e.rot || 0) * RAD, ux = [Math.cos(r), Math.sin(r)], uy = [-Math.sin(r), Math.cos(r)], H = [];
          if (e.sek === 'D') { const R = (+e.D || 0.5) / 2; H.push({ p: [c[0] + R, c[1], zm], ax: [1, 0, 0], lab: 'Çap', apply: (x, t) => { x.D = +Math.max(0.1, (+x.D || 0.5) + 2 * t).toFixed(4); } }); }
          else for (const [u, key, sg] of [[ux, 'b', 1], [ux, 'b', -1], [uy, 'd', 1], [uy, 'd', -1]]) { const half = (+e[key] || 0.4) / 2, n = [u[0] * sg, u[1] * sg]; H.push({ p: [c[0] + n[0] * half, c[1] + n[1] * half, zm], ax: [n[0], n[1], 0], lab: key === 'b' ? 'b yüzü' : 'd yüzü', apply: (x, t) => { const v = Math.max(0.1, (+x[key] || 0.4) + t), dd = v - (+x[key] || 0.4), cc = M.p3(x.p); x[key] = +v.toFixed(4); x.p = [cc[0] + n[0] * dd / 2, cc[1] + n[1] * dd / 2, cc[2]]; } }); }
          H.push({ p: [c[0], c[1], zm], ax: [0, 0, 1], lab: 'Üst (yükseklik)', apply: (x, t) => { x.h = +Math.max(0.1, (+x.h || 3) + t).toFixed(4); } }); return H; }
        case 'temel': { const c = M.p3(e.p), zt = +e.zt || 0, r = (+e.rot || 0) * RAD, ux = [Math.cos(r), Math.sin(r)], uy = [-Math.sin(r), Math.cos(r)], H = [];
          for (const [u, key, sg] of [[ux, 'bx', 1], [ux, 'bx', -1], [uy, 'by', 1], [uy, 'by', -1]]) { const half = (+e[key] || 1.5) / 2, n = [u[0] * sg, u[1] * sg]; H.push({ p: [c[0] + n[0] * half, c[1] + n[1] * half, zt], ax: [n[0], n[1], 0], lab: key, apply: (x, t) => { const v = Math.max(0.2, (+x[key] || 1.5) + t), dd = v - (+x[key] || 1.5), cc = M.p3(x.p); x[key] = +v.toFixed(4); x.p = [cc[0] + n[0] * dd / 2, cc[1] + n[1] * dd / 2, cc[2]]; } }); }
          H.push({ p: [c[0], c[1], zt], ax: [0, 0, 1], lab: 'Üst (yükseklik, alt sabit)', apply: (x, t) => { const nt = Math.max(0.1, (+x.t || 0.6) + t); x.zt = (+x.zt || 0) + (nt - (+x.t || 0.6)); x.t = +nt.toFixed(4); } }); return H; }
        case 'kiris': { const a = M.p3(e.a), b = M.p3(e.b), L = M.dist2(a, b) || 1, u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], zt = +e.zt || 3, H = [];
          H.push({ p: [a[0], a[1], zt], ax: [-u[0], -u[1], 0], lab: 'Başlangıç ucu', apply: (x, t) => { const p = M.p3(x.a); x.a = [p[0] - u[0] * t, p[1] - u[1] * t, p[2]]; } });
          H.push({ p: [b[0], b[1], zt], ax: [u[0], u[1], 0], lab: 'Bitiş ucu', apply: (x, t) => { const p = M.p3(x.b); x.b = [p[0] + u[0] * t, p[1] + u[1] * t, p[2]]; } });
          H.push({ p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, zt - (+e.hb || 0.5)], ax: [0, 0, -1], lab: 'Alt yüz (kiriş yüksekliği)', apply: (x, t) => { x.hb = +Math.max(0.1, (+x.hb || 0.5) + t).toFixed(4); } }); return H; }
        case 'pline': if (e.closed && C.T.pline) return []; return [];
      }
    } catch (err) { }
    return [];
  };
  /* ---------- planda: tutamaç listesine kenar ortası tutamaçları ekle ---------- */
  const g0 = C.gripsOf;
  if (g0) C.gripsOf = e => {
    const G = g0(e), H = C.handlesOf(e).filter(h => Math.abs(h.ax[2]) < 0.5);
    for (const h of H) G.push({ p: M.p3(h.p), k: 'mid', set: (x, q, d) => { const t = d[0] * h.ax[0] + d[1] * h.ax[1]; h.apply(x, t); delete x._c; delete x._g; } });
    return G;
  };
  /* ---------- 3B'de sürükleme ---------- */
  const H3 = C.h3 = { drag: null, hov: null };
  const listFor = () => { if (C.cmd.running) return []; const e = C.sel && C.sel.length === 1 ? C.sel[0] : (!C.sel.length && C.selFace && C.selFace.e) || null; if (!e) return []; if (!C.doc.ents.includes(e)) return []; const lay = C.layer(e.layer); if (lay && lay.lock) return []; return C.handlesOf(e).map((h, i) => ({ e, h, i })); };
  const near = (v, x, y) => { let best = null, bd = 10; for (const it of listFor()) { const q = v.project(it.h.p), qt = v.project(M.add(it.h.p, M.mul(it.h.ax, arrowLen(v)))); if (!q) continue; let d = Math.hypot(q[0] - x, q[1] - y); if (qt) { const dx = qt[0] - q[0], dy = qt[1] - q[1], l2 = dx * dx + dy * dy; if (l2 > 1) { let t = ((x - q[0]) * dx + (y - q[1]) * dy) / l2; t = Math.max(0, Math.min(1, t)); d = Math.min(d, Math.hypot(q[0] + dx * t - x, q[1] + dy * t - y)); } } if (d < bd) { bd = d; best = it; } } return best; }; // ok gövdesi / ucu
  const tOnAxis = (v, P, A, x, y) => { const r = v.ray(x, y); if (!r) return null; const a0 = r[0], d = M.norm(M.sub(r[1], r[0])), w = M.sub(P, a0), b = M.dot(A, d), dA = M.dot(A, w), dD = M.dot(d, w), den = 1 - b * b; if (Math.abs(den) < 1e-9) return null; return (b * dD - dA) / den; }; // eksen (P + A t) ile imleç ışını arasındaki en yakın nokta
  H3.down = (v, x, y, ev) => { if (ev.button !== 0) return false; const it = near(v, x, y); if (!it) return false; H3.last = null; H3.typed = null;
    const orig = JSON.parse(JSON.stringify(C.cleanEnt ? C.cleanEnt(it.e) : it.e)); C.undoStack.push(C.snapshot()); C.redoStack = [];
    const t0 = tOnAxis(v, it.h.p, it.h.ax, x, y) || 0; H3.drag = { it, orig, t0, t: 0 }; v.cv.style.cursor = 'grabbing'; return true; };
  H3.move = (v, x, y, ev) => {
    const D = H3.drag; if (D) D.fine = !!(ev && ev.shiftKey); if (!D) return; const { it } = D; let t = tOnAxis(v, it.h.p, it.h.ax, x, y); if (t == null) return; t -= D.t0; D.snap = null;
    // yakalama: imleç başka bir noktaya yakınsa o noktanın eksen üstündeki izdüşümü
    try { if (v.snapAt) { const os = C.state.osnap; C.state.osnap = true; const hit = v.snapAt(x, y); C.state.osnap = os; if (hit && hit.p && hit.e !== it.e) { t = M.dot(M.sub(M.p3(hit.p), it.h.p), it.h.ax); D.snap = hit; } } } catch (er) { } // her zaman yakala (diğer nesnelerin köşe / orta noktası)
    if (!D.snap) { // serbestken toplam ölçü yuvarlak cm'ye otursun (Shift: 1 mm)
      const st = D.fine ? 0.001 : (C.state.gridSnap ? 0.05 : 0.01);
      if (it.h.meas) { const base = it.h.meas(D.orig); if (isFinite(base)) { const tot = Math.round((base + t) / st) * st; t = tot - base; } else t = Math.round(t / st) * st; } else t = Math.round(t / st) * st; }
    D.t = t; const e = it.e; for (const k of Object.keys(e)) if (!(k in D.orig) && k !== 'id') delete e[k]; Object.assign(e, JSON.parse(JSON.stringify(D.orig))); it.h.apply(e, t); delete e._c; delete e._g; delete e._q; D.tot = it.h.meas ? it.h.meas(e) : null;
    v.needBuild = true; v.dirty = true; };
  H3.up = (v) => { const D = H3.drag; H3.drag = null; v.cv.style.cursor = ''; if (!D) return; if (Math.abs(D.t) < 1e-6) { C.undoStack.pop(); H3.last = { it: D.it, orig: D.orig, t: 0, v, fresh: true }; if (H3.typed == null) C.log(`${D.it.h.lab}: mesafeyi yazıp Enter'a basın (ör. 4 ya da -4).`); return; } H3.last = { it: D.it, orig: D.orig, t: D.t, v }; C.changed(); C.log(`${D.it.h.lab}: ${D.t >= 0 ? '+' : ''}${M.fmt(D.t, 3)} m${D.tot != null ? ` → ${D.it.h.mname} ${M.fmt(D.tot, 3)} m` : ''}${D.snap ? ' (yakalandı)' : ''} · ${C.describe ? C.describe(D.it.e) : ''}${H3.typed == null ? ' — tam ölçü için mesafeyi yazıp Enter (ör. 4)' : ''}`); };
  H3.hover = (v, x, y) => { const it = near(v, x, y), id = it ? it.e.id + ':' + it.i : null; if (id !== H3.hov) { H3.hov = id; v.dirty = true; } if (it) v.cv.style.cursor = 'grab'; return !!it; };
  const arrowLen = v => Math.max(0.05, v.dist * 0.018); // kısa, kompakt ok
  const tipOf = (v, h) => M.add(h.p, M.mul(h.ax, arrowLen(v)));
  /* SketchUp gibi: oku sürüklerken (ya da bıraktıktan hemen sonra) mesafeyi klavyeden yazıp Enter — tam ölçü. 4 = sürükleme yönünde 4 m, −4 = okun tersine */
  const restore = (e, orig) => { for (const k of Object.keys(e)) if (!(k in orig) && k !== 'id') delete e[k]; Object.assign(e, JSON.parse(JSON.stringify(orig))); delete e._c; delete e._g; delete e._q; };
  H3.typeEnter = () => {
    const S = H3.drag || H3.last, raw = H3.typed; H3.typed = null; if (!S || raw == null) return false;
    const str = String(raw).trim().replace(',', '.'); if (!str || str === '-' || isNaN(+str)) { C.warn('Geçersiz mesafe: ' + raw); return true; }
    const val = +str, sg = str.startsWith('-') || str.startsWith('+') ? 1 : ((S.t || 0) < 0 ? -1 : 1), t = str.startsWith('-') || str.startsWith('+') ? val : sg * Math.abs(val);
    const e = S.it.e; if (S.fresh && H3.last === S) { C.undoStack.push(C.snapshot()); C.redoStack = []; S.fresh = false; }
    showTyped(); restore(e, S.orig); S.it.h.apply(e, t); delete e._c; delete e._g; delete e._q;
    const tot = S.it.h.meas ? S.it.h.meas(e) : null; const v = S.v || (C.views && C.views.v3);
    if (H3.drag) { H3.drag = null; if (v) v.cv.style.cursor = ''; }
    H3.last = { it: S.it, orig: S.orig, t, v }; if (v) { v.needBuild = true; v.dirty = true; } C.changed();
    C.log(`${S.it.h.lab}: ${t >= 0 ? '+' : ''}${M.fmt(t, 3)} m (yazılan)${tot != null && isFinite(tot) ? ` → ${S.it.h.mname} ${M.fmt(tot, 3)} m` : ''} · ${C.describe ? C.describe(e) : ''}`); return true;
  };
  const in3dv = () => C.viewName && C.viewName() === '3d';
  window.addEventListener('keydown', ev => {
    if (!in3dv() || C.cmd.running || (!H3.drag && !H3.last)) return; const ae = document.activeElement;
    if (ae && (ae.tagName === 'TEXTAREA' || ae.isContentEditable || (ae.tagName === 'INPUT' && (ae.id !== 'cmd' || ae.value)) || ae.tagName === 'SELECT')) return;
    const k = ev.key, typing = H3.typed != null;
    if (/^[0-9]$/.test(k) || ((k === '.' || k === ',') && typing) || ((k === '-' || k === '+') && !typing)) { H3.typed = (H3.typed || '') + k; }
    else if (k === 'Backspace' && typing) { H3.typed = H3.typed.slice(0, -1) || null; }
    else if ((k === 'Enter' || k === ' ') && typing) { if (H3.drag) H3.typeEnter(); else H3.typeEnter(); }
    else if (k === 'Escape' && typing) { H3.typed = null; }
    else { if (!H3.drag) { const had = H3.typed != null; H3.last = null; H3.typed = null; if (had) showTyped(); } return; }
    ev.preventDefault(); ev.stopImmediatePropagation(); const v = C.views && C.views.v3; if (v) v.dirty = true; showTyped();
  }, true);
  const showTyped = () => C.emit('prompt', H3.typed != null ? `Mesafe: ${H3.typed} m — Enter: uygula · Esc: vazgeç` : 'Komut:');
  C.on('selection', () => { if (!H3.drag && (H3.last || H3.typed != null)) { H3.last = null; H3.typed = null; showTyped(); } });
  C.on('cmdstart', () => { H3.last = null; H3.typed = null; });
  H3.draw = (v, g) => {
    const L = listFor(); if (!L.length) return;
    for (const it of L) { const q = v.project(it.h.p), qt = v.project(tipOf(v, it.h)); if (!q || !qt) continue; const hot = H3.drag && H3.drag.it.i === it.i, hv = H3.hov === it.e.id + ':' + it.i;
      const dx = qt[0] - q[0], dy = qt[1] - q[1], l = Math.hypot(dx, dy); if (l < 3) { g.fillStyle = hot ? '#ff5a5a' : '#2e86ff'; g.beginPath(); g.arc(q[0], q[1], 6, 0, 7); g.fill(); continue; }
      const ux = dx / l, uy = dy / l, nx = -uy, ny = ux, hl = Math.min(9, l * 0.55), hw = hot || hv ? 5.5 : 4.5, base = [qt[0] - ux * hl, qt[1] - uy * hl];
      const col = hot ? ['#ff6b6b', '#c81e1e'] : hv ? ['#ffb3e0', '#d94a9a'] : ['#5aa8ff', '#1557c0'];
      // gövde (silindir görünümü)
      g.lineCap = 'round'; g.strokeStyle = '#0a2a66'; g.lineWidth = hot || hv ? 4 : 3.2; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(base[0], base[1]); g.stroke();
      g.strokeStyle = col[0]; g.lineWidth = hot || hv ? 2.4 : 1.8; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(base[0], base[1]); g.stroke();
      // uç (koni): iki yarısı farklı tonda = 3B görünüm
      g.lineWidth = 1; g.strokeStyle = '#0a2a66';
      g.fillStyle = col[0]; g.beginPath(); g.moveTo(qt[0], qt[1]); g.lineTo(base[0] + nx * hw, base[1] + ny * hw); g.lineTo(base[0] - ux * 2, base[1] - uy * 2); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = col[1]; g.beginPath(); g.moveTo(qt[0], qt[1]); g.lineTo(base[0] - nx * hw, base[1] - ny * hw); g.lineTo(base[0] - ux * 2, base[1] - uy * 2); g.closePath(); g.fill(); g.stroke();
      if (hv && !H3.drag && it.h.meas) { const m = it.h.meas(it.e); if (isFinite(m)) { const tx = `${it.h.mname} ${M.fmt(m, 3)} m`; g.font = '11.5px system-ui, sans-serif'; const w = g.measureText(tx).width + 10; g.fillStyle = 'rgba(20,24,30,.8)'; g.fillRect(qt[0] + 8, qt[1] - 9, w, 18); g.fillStyle = '#fff'; g.fillText(tx, qt[0] + 13, qt[1] + 4); } }
      // taban noktası
      g.fillStyle = '#ffffff'; g.strokeStyle = '#0a2a66'; g.beginPath(); g.arc(q[0], q[1], 2.2, 0, 7); g.fill(); g.stroke(); }
    if (H3.typed != null && (H3.drag || H3.last)) { const S = H3.drag || H3.last, q = v.project(S.it.h.p); if (q) { const txt = `Mesafe: ${H3.typed}▏ m   (Enter: uygula · Esc: vazgeç)`; g.font = 'bold 13px system-ui, sans-serif'; const w = g.measureText(txt).width + 14; g.fillStyle = 'rgba(31,111,255,.95)'; g.fillRect(q[0] + 12, q[1] + 4, w, 22); g.fillStyle = '#fff'; g.fillText(txt, q[0] + 19, q[1] + 20); } }
    const D = H3.drag; if (D) { const q = v.project(D.it.h.p); if (q) { const txt = `${D.it.h.lab}   Δ ${D.t >= 0 ? '+' : ''}${M.fmt(D.t, 3)} m${D.tot != null && isFinite(D.tot) ? `   ·   ${D.it.h.mname} = ${M.fmt(D.tot, 3)} m` : ''}${D.snap ? '   ⟂ yakalandı' : ''}`; g.font = '12px system-ui, sans-serif'; const w = g.measureText(txt).width + 12; g.fillStyle = 'rgba(20,24,30,.85)'; g.fillRect(q[0] + 12, q[1] - 26, w, 20); g.fillStyle = '#fff'; g.fillText(txt, q[0] + 18, q[1] - 12); }
      if (D.snap) { const s = v.project(D.snap.p); if (s) { g.strokeStyle = '#33ff66'; g.lineWidth = 2; g.strokeRect(s[0] - 6, s[1] - 6, 12, 12); } } }
  };
})(window.C);

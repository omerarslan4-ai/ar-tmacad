/* ArıtmaCAD — TUTAMAÇLAR (AutoCAD grip düzenleme)
   Seçili nesnelerin mavi tutamaçlarına tıkla (ya da basılı tutup sürükle): tutamaç kırmızı olur, nesne uzar/taşınır.
   Aynı noktadaki tüm tutamaçlar birlikte hareket eder (köşedeki iki çizgi birlikte). Nesne yakalama, ORTO, @dx,dy çalışır.
   Enter / Boşluk: UZAT → TAŞI → DÖNDÜR → ÖLÇEKLE → AYNA ; T = taban noktası, K = kopya, G = geri al, X = çık */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, T = C.T, TAU = Math.PI * 2, RAD = Math.PI / 180;
  const p3 = M.p3;
  const mv = (e, d) => C.xform(e, C.xMove([d[0], d[1], 0]));
  /* üç noktadan yay: {c, r, a0, a1} (derece, saat tersi) */
  const arc3 = (p, q, s) => {
    const ax = p[0], ay = p[1], bx = q[0], by = q[1], cx = s[0], cy = s[1], d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)); if (Math.abs(d) < 1e-12) return null;
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d, uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    const c = [ux, uy, p[2] || 0], r = Math.hypot(ax - ux, ay - uy), A = v => Math.atan2(v[1] - uy, v[0] - ux);
    const a0 = A(p), a1 = A(s), am = A(q), ccw = M.normAng(am - a0) < M.normAng(a1 - a0);
    return ccw ? { c, r, a0: a0 / RAD, a1: a1 / RAD } : { c, r, a0: a1 / RAD, a1: a0 / RAD };
  };
  const bulgeThrough = (a, b, q) => { // a->b yayı q'dan geçsin
    const k = arc3(a, q, b); if (!k) return 0;
    const A = v => Math.atan2(v[1] - k.c[1], v[0] - k.c[0]), s0 = A(a), s1 = A(b), sq = A(q), ccw = M.normAng(s1 - s0);
    const sw = M.normAng(sq - s0) < ccw ? ccw : -(TAU - ccw); return Math.tan(sw / 4);
  };
  const arcPts = e => { const c = e.c, r = e.r, a0 = e.a0 * RAD, a1 = e.a1 * RAD, sw = M.normAng(a1 - a0) || TAU; return { s: M.polar(c, a0, r), m: M.polar(c, a0 + sw / 2, r), t: M.polar(c, a1, r) }; };

  /* nesnenin tutamaçları: {p, k, set(ent, yeniNokta, delta)} */
  C.gripsOf = e => {
    const G = [], add = (p, k, set) => G.push({ p: p3(p), k, set });
    const move = (p) => add(p, 'move', (x, q, d) => mv(x, d));
    switch (e.type) {
      case 'line':
        add(e.a, 'end', (x, q) => { x.a = p3(q); }); add(e.b, 'end', (x, q) => { x.b = p3(q); }); move(M.lerp(e.a, e.b, 0.5)); break;
      case 'pline': {
        const n = e.pts.length;
        e.pts.forEach((p, i) => add(p, 'end', (x, q) => { x.pts[i] = [q[0], q[1], x.pts[i][2] || 0]; }));
        for (let i = 0; i < n - 1 + (e.closed ? 1 : 0); i++) {
          const j = (i + 1) % n, b = (e.bul && e.bul[i]) || 0, a = e.pts[i], c = e.pts[j];
          if (Math.abs(b) > 1e-9) { const mid = C.bulgePts(a, c, b); const m = mid.length ? mid[Math.floor(mid.length / 2)] : M.lerp(a, c, 0.5); add(m, 'mid', (x, q) => { x.bul = x.bul || []; x.bul[i] = bulgeThrough(x.pts[i], x.pts[j], q); }); }
          else add(M.lerp(a, c, 0.5), 'mid', (x, q, d) => { x.pts[i] = [e.pts[i][0] + d[0], e.pts[i][1] + d[1], e.pts[i][2] || 0]; x.pts[j] = [e.pts[j][0] + d[0], e.pts[j][1] + d[1], e.pts[j][2] || 0]; });
        }
        break;
      }
      case 'circle':
        move(e.c); for (let k = 0; k < 4; k++) add(M.polar(e.c, k * Math.PI / 2, e.r), 'qua', (x, q) => { x.r = Math.max(1e-6, M.dist2(x.c, q)); }); break;
      case 'arc': {
        const P = arcPts(e);
        add(P.s, 'end', (x, q) => { const k = arc3(q, P.m, P.t); if (k) Object.assign(x, k); });
        add(P.t, 'end', (x, q) => { const k = arc3(P.s, P.m, q); if (k) Object.assign(x, k); });
        add(P.m, 'mid', (x, q) => { const k = arc3(P.s, q, P.t); if (k) Object.assign(x, k); });
        move(e.c); break;
      }
      case 'dim':
        if (e.a && e.b) { add(e.a, 'end', (x, q) => { x.a = p3(q); }); add(e.b, 'end', (x, q) => { x.b = p3(q); }); if (e.p) add(e.p, 'mid', (x, q) => { x.p = p3(q); }); }
        else move((C.snapPts(e)[0] || { p: [0, 0, 0] }).p);
        break;
      case 'kesitisaret':
        add(e.a, 'end', (x, q) => { x.a = p3(q); }); add(e.b, 'end', (x, q) => { x.b = p3(q); }); move(M.lerp(e.a, e.b, 0.5)); break;
      case 'wall':
        add(e.a, 'end', (x, q) => { x.a = p3(q); }); add(e.b, 'end', (x, q) => { x.b = p3(q); }); move(M.lerp(e.a, e.b, 0.5)); break;
      case 'hatch':
        e.loops.forEach((lp, li) => lp.length <= 64 && lp.forEach((p, i) => add(p, 'end', (x, q) => { x.loops[li][i] = [q[0], q[1]]; })));
        if (!G.length) move(e.loops[0][0]); break;
      default: {
        if (Array.isArray(e.pts) && e.pts.length && e.pts.length <= 200 && Array.isArray(e.pts[0])) { e.pts.forEach((p, i) => add(p, 'end', (x, q) => { x.pts[i] = [q[0], q[1], x.pts[i][2] || 0]; })); }
        const base = e.p || e.c || e.o || (C.snapPts(e)[0] || {}).p;
        if (base) move(base);
      }
    }
    return G;
  };

  /* ---------- çizim ve isabet ---------- */
  const MAXSEL = 100;
  const gripList = () => { const out = []; if (!C.sel.length || C.sel.length > MAXSEL) return out; for (const e of C.sel) { if (!C.doc.ents.includes(e)) continue; const lay = C.layer(e.layer); if (lay && lay.lock) continue; let gs; try { gs = C.gripsOf(e); } catch (err) { continue; } for (const g of gs) out.push({ e, g }); } return out; };
  C.gripAt = (view, sx, sy) => {
    if (C.cmd.running) return null; let best = null, bd = 10;
    for (const it of gripList()) { const q = view.w2s(it.g.p), d = Math.max(Math.abs(q[0] - sx), Math.abs(q[1] - sy)); if (d < bd) { bd = d; best = it; } }
    if (!best) return null;
    const tol = 1e-6 * Math.max(1, Math.abs(best.g.p[0]), Math.abs(best.g.p[1]));
    // aynı noktadaki tüm tutamaçlar (taşıma tutamaçları yalnız kendisi)
    const hot = best.g.k === 'move' ? [best] : gripList().filter(it => it.g.k !== 'move' && M.dist2(it.g.p, best.g.p) <= tol);
    return { p: best.g.p, hot };
  };
  C.drawGrips = (view, ctx) => {
    const list = gripList(); if (!list.length) return;
    const hv = view.hoverGrip, hot = C.gripState && C.gripState.hot;
    ctx.setLineDash([]); ctx.lineWidth = 1;
    for (const { e, g } of list) {
      const q = view.w2s(g.p), isHot = hot && hot.some(h => h.e === e && M.dist2(h.g.p, g.p) < 1e-9 && h.g.k === g.k), isHv = !isHot && hv && M.dist2(hv.p, g.p) < 1e-9;
      ctx.fillStyle = isHot ? '#ff2a2a' : isHv ? '#ff7ac0' : '#1f6fff'; ctx.strokeStyle = '#0b2a66';
      const s = isHot ? 6 : isHv ? 8 : 4;
      if (isHv || isHot) { ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = isHot ? '#ff2a2a' : '#ff7ac0'; ctx.beginPath(); ctx.arc(q[0], q[1], s + 7, 0, Math.PI * 2); ctx.fill(); ctx.restore(); ctx.fillStyle = isHot ? '#ff2a2a' : '#ff7ac0'; }
      if (g.k === 'mid' && e.type === 'pline') { ctx.beginPath(); ctx.moveTo(q[0] - s - 1, q[1] - s + 1); ctx.lineTo(q[0] + s + 1, q[1] - s + 1); ctx.lineTo(q[0] + s + 1, q[1] + s - 1); ctx.lineTo(q[0] - s - 1, q[1] + s - 1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else { ctx.fillRect(q[0] - s, q[1] - s, 2 * s, 2 * s); ctx.strokeRect(q[0] - s, q[1] - s, 2 * s, 2 * s); }
    }
  };

  const HINT = { end: 'Uzat', mid: 'Kaydır', move: 'Taşı', qua: 'Yarıçap', cen: 'Taşı' };
  C.drawGripHint = (view, ctx) => {
    const hv = view.hoverGrip; if (!hv || !hv.hot || !hv.hot.length) return;
    const g = hv.hot[0].g, q = view.w2s(hv.p), n = hv.hot.length, t = (g.k === 'mid' && hv.hot[0].e.type === 'pline' ? 'Segmenti kaydır' : g.k === 'mid' && hv.hot[0].e.type === 'arc' ? 'Yayı şekillendir' : HINT[g.k] || 'Düzenle') + (n > 1 ? ` (${n} nesne)` : '') + ' — tıkla ya da sürükle';
    ctx.font = '12px system-ui'; const w = ctx.measureText(t).width; ctx.fillStyle = 'rgba(30,34,40,0.92)'; ctx.fillRect(q[0] + 14, q[1] + 12, w + 12, 20); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, q[0] + 20, q[1] + 22); ctx.textBaseline = 'alphabetic';
  };
  /* ---------- tutamaç düzenleme komutu ---------- */
  const MODES = ['UZAT', 'TAŞI', 'DÖNDÜR', 'ÖLÇEKLE', 'AYNA'];
  const cloneE = e => JSON.parse(JSON.stringify(C.cleanEnt(e)));
  /* işlem: ents listesine (gerçek ya da kopya) uygula */
  const applyOp = (mode, list, hot, base, q, extra) => {
    if (mode === 0) { // uzat: sıcak tutamaçlar yeni noktaya
      const d = [q[0] - base[0], q[1] - base[1]];
      for (const { e, g, idx } of hot) { const x = list.get(e); if (!x) continue; const g2 = C.gripsOf(e)[idx]; (g2 || g).set(x, [g.p[0] + d[0], g.p[1] + d[1], g.p[2] || 0], d); delete x._c; }
      return;
    }
    let X;
    if (mode === 1) X = C.xMove([q[0] - base[0], q[1] - base[1], 0]);
    else if (mode === 2) X = C.xRot(base, typeof q === 'number' ? q * RAD : M.ang(base, q) - (extra || 0));
    else if (mode === 3) X = C.xScale(base, typeof q === 'number' ? q : Math.max(1e-9, M.dist2(base, q) / (extra || 1)));
    else X = M.dist2(base, q) > 1e-12 ? C.xMirror(base, q) : null;
    if (!X) return; for (const x of list.values()) C.xform(x, X);
  };
  C.addCommand(['GRIPEDIT', 'TUTAMAC'], 'Tutamaç düzenleme (seçili nesnelerin mavi noktalarına tıklayınca kendiliğinden başlar). Enter/Boşluk: UZAT → TAŞI → DÖNDÜR → ÖLÇEKLE → AYNA. T taban noktası, K kopya, G geri al, X çık.', async (I) => {
    const gs = C.gripState; if (!gs || !gs.hot.length) return;
    const sel = C.sel.slice();
    gs.hot.forEach(h => { h.idx = C.gripsOf(h.e).findIndex(g => g.k === h.g.k && M.dist2(g.p, h.g.p) < 1e-9); });
    let mode = gs.hot[0].g.k === 'move' ? 1 : 0, base = gs.p, copy = false, refAng = 0, refLen = 1;
    const undo = [];
    const targets = () => mode === 0 ? [...new Set(gs.hot.map(h => h.e))] : sel.filter(e => C.doc.ents.includes(e));
    E.base = base;
    E.preview = q => {
      if (!q) return []; const m = new Map(); for (const e of targets()) m.set(e, cloneE(e));
      try { applyOp(mode, m, gs.hot, base, q, mode === 2 ? refAng : refLen); } catch (err) { return []; }
      const out = []; for (const x of m.values()) try { out.push(...C.T[x.type].prims(x)); } catch (err) { } return out;
    };
    try {
      for (; ;) {
        E.base = base; E.rubber = true;
        const nm = MODES[mode];
        const kw = [['T', 'Taban noktası'], ['K', 'Kopya'], ['G', 'Geri al'], ['X', 'Çık']];
        const msg = `** ${nm}${copy ? ' (çoklu kopya)' : ''} ** ${mode === 0 ? 'Uzatma noktası' : mode === 1 ? 'Taşıma noktası' : mode === 2 ? 'Dönme açısı' : mode === 3 ? 'Ölçek çarpanı' : 'Aynanın ikinci noktası'} (Enter = sonraki mod)`;
        const r = await E.ask('pt', msg, { kw, num: mode === 2 || mode === 3 });
        if (r == null || r === '') { mode = (mode + 1) % MODES.length; C.log(`** ${MODES[mode]} **`); continue; }
        if (r === 'X') break;
        if (r === 'K') { copy = !copy; continue; }
        if (r === 'G') { if (undo.length) { C.restore(undo.pop()); C.changed(); } continue; }
        if (r === 'T') { const b = await I.pt('Taban noktası'); if (b && typeof b !== 'string') base = b; continue; }
        if (typeof r === 'string') continue;
        undo.push(C.snapshot());
        const ents = targets();
        if (copy) { const m = new Map(); for (const e of ents) { const c = C.clone(e); m.set(e, c); } applyOp(mode, m, gs.hot, base, r, mode === 2 ? refAng : refLen); for (const c of m.values()) C.add(c); C.changed(); continue; }
        const m = new Map(); for (const e of ents) m.set(e, e); applyOp(mode, m, gs.hot, base, r, mode === 2 ? refAng : refLen); for (const e of ents) C.touch(e);
        break;
      }
    } finally { C.gripState = null; C.sel = sel.filter(e => C.doc.ents.includes(e)); C.emit('selection'); }
  });
})(window.C);

/* ArıtmaCAD — KUTUPSAL İZLEME + NESNE İZLEME + DİNAMİK ÖLÇÜ (AutoCAD POLAR / OTRACK / DYN gibi)
   - Çizerken taban noktasından 0-30-45-60-90… derecelik izleme çizgileri: imleç yaklaşınca çizgiye oturur
   - Çizginin önceki noktalarından (ör. karenin ilk köşesi) ve üzerinden geçilen uç / orta / merkez noktalarından izleme:
     iki izleme çizgisinin kesişimi (dik köşe noktası) yakalanır, kesik yeşil çizgiyle gösterilir
   - Lastik çizginin üzerinde uzunluk ve açı yazar.  F10: kutupsal izleme, F11: nesne izleme aç/kapa */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, RAD = Math.PI / 180;
  const st = C.state; if (st.polar == null) st.polar = true; if (st.otrack == null) st.otrack = true; if (st.dyn == null) st.dyn = true;
  st.polarInc = st.polarInc || [30, 45]; // açı artımları (kat sayıları)
  const angles = () => { const set = new Set(); for (const inc of st.polarInc) for (let a = 0; a < 360 - 1e-9; a += inc) set.add(+a.toFixed(6)); return [...set].sort((a, b) => a - b); };
  let acq = [];
  C.on('cmdstart', () => { acq = []; });
  /* üzerinden geçilen nesne noktalarını izleme için al (en çok 4) */
  C.trackAcquire = hit => { if (!hit || !hit.p || !/^(end|mid|cen|int|qua|ins|fcen)$/.test(hit.k) || !E.waiting) return; const p = M.p3(hit.p); if (acq.some(q => M.dist2(q, p) < 1e-9)) return; acq.push(p); if (acq.length > 4) acq.shift(); };
  const srcPts = () => {
    const out = []; if (E.base) out.push({ p: M.p3(E.base), base: true });
    if (st.otrack) {
      for (const path of E.temp || []) if (path) for (const q of path.slice(-8)) { const p = M.p3(q); if (!out.some(o => M.dist2(o.p, p) < 1e-9)) out.push({ p }); }
      for (const p of acq) if (!out.some(o => M.dist2(o.p, p) < 1e-9)) out.push({ p, acq: true });
    }
    return out;
  };
  C.trackSrc = srcPts; C.trackAngles = angles; // 3B izleme (izleme3b.js) de kullanır
  const lineInt = (p, u, q, v) => { const den = u[0] * v[1] - u[1] * v[0]; if (Math.abs(den) < 1e-9) return null; const t = ((q[0] - p[0]) * v[1] - (q[1] - p[1]) * v[0]) / den; return [p[0] + u[0] * t, p[1] + u[1] * t, p[2] || 0]; };
  /* izlemeye göre nokta: {p, lines:[{a, ang}], label} ya da null */
  C.trackPoint = (view, p) => {
    if (!E.waiting || E.waiting.kind !== 'pt' || (!st.polar && !st.otrack)) return null;
    const S = srcPts(); if (!S.length) return null;
    const tol = 10 / view.s, cands = [], angs = angles();
    for (const s of S) {
      if (s.base && !st.polar) continue;
      for (const a of (s.base ? angs : angs.filter(x => x % 90 === 0 || st.polar))) {
        const u = [Math.cos(a * RAD), Math.sin(a * RAD)], v = [p[0] - s.p[0], p[1] - s.p[1]], t = v[0] * u[0] + v[1] * u[1]; if (t < tol) continue;
        const d = Math.abs(v[0] * u[1] - v[1] * u[0]); if (d < tol) cands.push({ s, u, a, t, d });
      }
    }
    if (!cands.length) return null;
    cands.sort((x, y) => x.d - y.d);
    // iki farklı kaynaktan izleme çizgisinin kesişimi (ör. ilk köşeden 90° ile tabandan 0° → dik köşe)
    let best = null;
    for (let i = 0; i < cands.length && i < 12; i++) for (let j = i + 1; j < cands.length && j < 12; j++) {
      const A = cands[i], B = cands[j]; if (A.s === B.s) continue; const q = lineInt(A.s.p, A.u, B.s.p, B.u); if (!q) continue;
      const dd = M.dist2(q, p); if (dd < tol * 1.6 && (!best || dd < best.dd)) best = { dd, q, A, B };
    }
    const z = E.base ? (E.base[2] || 0) : 0, fa = a => (+a.toFixed(1)) + '°';
    if (best) { const q = [best.q[0], best.q[1], z]; return { p: q, lines: [{ a: best.A.s.p, ang: best.A.a }, { a: best.B.s.p, ang: best.B.a }], label: `Kesişim: ${fa(best.A.a)} × ${fa(best.B.a)}` }; }
    const c = cands[0], q = [c.s.p[0] + c.u[0] * c.t, c.s.p[1] + c.u[1] * c.t, z];
    return { p: q, lines: [{ a: c.s.p, ang: c.a }], label: `${c.s.base ? 'Kutupsal' : 'Nesne izleme'}: ${M.fmt(c.t, 3)} < ${fa(c.a)}` };
  };

  /* çizim: izleme çizgileri + dinamik uzunluk / açı */
  const P = C.View2D.prototype, d0 = P.draw;
  P.draw = function () {
    d0.call(this);
    if (this.isMap || this.isLayout || !this.cursor || !E.waiting || E.waiting.kind !== 'pt') return;
    const ctx = this.ctx, dpr = this.dpr || 1; ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tr = this.track, cur = this.w2s(this.cursor);
    if (tr) {
      ctx.strokeStyle = '#3ddc84'; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
      for (const l of tr.lines) { const a = this.w2s(l.a), u = [Math.cos(l.ang * RAD), -Math.sin(l.ang * RAD)], far = Math.hypot(this.W, this.H); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + u[0] * far, a[1] + u[1] * far); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(a[0] - 4, a[1] - 4); ctx.lineTo(a[0] + 4, a[1] + 4); ctx.moveTo(a[0] - 4, a[1] + 4); ctx.lineTo(a[0] + 4, a[1] - 4); ctx.stroke(); ctx.setLineDash([6, 4]); }
      ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(cur[0] - 5, cur[1] - 5); ctx.lineTo(cur[0] + 5, cur[1] + 5); ctx.moveTo(cur[0] - 5, cur[1] + 5); ctx.lineTo(cur[0] + 5, cur[1] - 5); ctx.stroke();
      tag(ctx, cur[0] + 16, cur[1] + 30, tr.label, '#3ddc84');
    }
    // dinamik ölçü: lastik çizginin üzerinde uzunluk ve açı
    if (st.dyn && E.base && E.rubber !== false) {
      const b = this.w2s(E.base), L = M.dist2(E.base, this.cursor); if (L > 1e-9 && Math.hypot(cur[0] - b[0], cur[1] - b[1]) > 18) {
        let ang = Math.atan2(this.cursor[1] - E.base[1], this.cursor[0] - E.base[0]) / RAD; if (ang < 0) ang += 360;
        const mx = (b[0] + cur[0]) / 2, my = (b[1] + cur[1]) / 2, sx = cur[0] - b[0], sy = cur[1] - b[1], sl = Math.hypot(sx, sy), nx = -sy / sl, ny = sx / sl, off = 16;
        tag(ctx, mx + nx * off, my + ny * off, M.fmt(L, 3), '#cfe3ff', true);
        // açı yayı (tabanda, yatayla)
        const r = Math.min(40, sl * 0.4); ctx.strokeStyle = 'rgba(160,190,230,.7)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] + r * 1.3, b[1]); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(b[0], b[1], r, 0, -ang * RAD, ang > 0 && ang <= 360 ? true : false); ctx.stroke();
        const ha = -ang * RAD / 2; tag(ctx, b[0] + Math.cos(ha) * (r + 22), b[1] + Math.sin(ha) * (r + 12), (+ang.toFixed(1)) + '°', '#cfe3ff', true);
      }
    }
    ctx.restore();
  };
  function tag(ctx, x, y, txt, col, center) {
    ctx.font = '12px system-ui, sans-serif'; const w = ctx.measureText(txt).width + 10, h = 18, x0 = center ? x - w / 2 : x, y0 = y - h / 2;
    ctx.fillStyle = 'rgba(16,20,26,.88)'; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x0 + 5, y0 + h / 2 + 0.5);
  }

  /* komutlar ve kısayollar */
  C.addCommand(['POLAR', 'KUTUPSAL', 'POLARIZLEME'], 'Kutupsal izleme: POLAR = aç/kapa · POLAR 15 ya da POLAR 30,45 = açı artımları · F10', async (I) => {
    const v = E.queue.length ? E.queue.shift() : null;
    if (v && /[\d]/.test(v)) { const a = String(v).split(/[,;\s]+/).map(Number).filter(x => x > 0 && x <= 180); if (a.length) { st.polarInc = a; st.polar = true; } }
    else st.polar = !st.polar;
    C.emit('state'); C.log(`Kutupsal izleme ${st.polar ? 'AÇIK' : 'KAPALI'} · açılar: ${st.polarInc.join(', ')}° katları`);
  }, { noUndo: true });
  C.addCommand(['OTRACK', 'NESNEIZLEME', 'IZLEME'], 'Nesne izleme aç/kapa (F11): çizginin önceki noktalarından ve üzerinden geçilen uç/orta/merkez noktalarından hizalama çizgileri', async () => { st.otrack = !st.otrack; C.emit('state'); C.log(`Nesne izleme ${st.otrack ? 'AÇIK' : 'KAPALI'}`); }, { noUndo: true });
  C.addCommand(['DYN', 'DINAMIK', 'DINAMIKOLCU'], 'Dinamik ölçü aç/kapa (F12): çizerken lastik çizginin üzerinde uzunluk ve açı', async () => { st.dyn = !st.dyn; C.emit('state'); C.log(`Dinamik ölçü ${st.dyn ? 'AÇIK' : 'KAPALI'}`); }, { noUndo: true });
  document.addEventListener('keydown', e => { const m = { F10: 'POLAR', F11: 'OTRACK', F12: 'DYN' }[e.key]; if (m) { e.preventDefault(); C.cmd.running ? (m === 'POLAR' ? (st.polar = !st.polar) : m === 'OTRACK' ? (st.otrack = !st.otrack) : (st.dyn = !st.dyn), C.emit('state'), C.log(`${m} ${(m === 'POLAR' ? st.polar : m === 'OTRACK' ? st.otrack : st.dyn) ? 'AÇIK' : 'KAPALI'}`)) : C.cmd.run(m); } });
  /* durum çubuğuna düğmeler */
  setTimeout(() => {
    const bar = document.querySelector('#plan3dBtn'); if (!bar) return;
    const mk = (id, txt, key, title) => { const b = document.createElement('button'); b.id = id; b.textContent = txt; b.title = title; b.onclick = () => { st[key] = !st[key]; C.emit('state'); }; bar.parentElement.insertBefore(b, bar); return b; };
    const bp = mk('polarBtn', 'KUTUPSAL', 'polar', 'Kutupsal izleme 30°/45° katları (F10) — POLAR 15 ile açı değiştirilebilir'), bo = mk('otrackBtn', 'N.İZLEME', 'otrack', 'Nesne izleme (F11): önceki noktalardan hizalama, dik köşe yakalama'), bd = mk('dynBtn', 'DİNAMİK', 'dyn', 'Dinamik ölçü (F12): çizerken uzunluk ve açı');
    const sync = () => { bp.classList.toggle('on', !!st.polar); bo.classList.toggle('on', !!st.otrack); bd.classList.toggle('on', !!st.dyn); }; C.on('state', sync); sync();
  }, 0);
})(window.C);

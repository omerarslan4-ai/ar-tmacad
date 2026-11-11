/* ArıtmaCAD — 3B'DE KUTUPSAL İZLEME + NESNE İZLEME + DİNAMİK ÖLÇÜ (2B'deki POLAR / OTRACK / DYN'in 3B karşılığı)
   - Taban noktasından çalışma düzleminde 0-30-45-60-90… derecelik izleme çizgileri ve dikey Z+ / Z− izleme çizgisi
   - Çizginin önceki noktalarından ve üzerinden geçilen uç / orta / merkez noktalarından hizalama çizgileri (düzlemde X / Y yönleri + dikey Z)
   - İki izleme çizgisinin kesişimi (ör. "Kesişim: 315° × 0°"), dikey Z çizgisinde başka bir noktanın yüksekliği ("yükseklik hizası")
   - Lastik çizginin üzerinde uzunluk, tabanda açı yayı ve açı.  F10 / F11 / F12 ve durum çubuğu düğmeleri 2B ile ortaktır. */
(function (C) {
  'use strict';
  if (!C.View3D) return;
  const M = C.M, st = C.state, RAD = Math.PI / 180, P3 = C.View3D.prototype;
  const fa = a => (+(+a).toFixed(1)) + '°';
  const scr = (v, p) => v.project(p);
  const sd = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  function frame() {
    const pl = C.cmd.plane3;
    if (pl && pl.ux && pl.uy) { const ux = M.norm(pl.ux), uy = M.norm(pl.uy); return { ux, uy, n: M.norm(pl.n || M.cross(ux, uy)), pl: true }; }
    return { ux: [1, 0, 0], uy: [0, 1, 0], n: [0, 0, 1], pl: false };
  }
  /* ekrandaki ışına en yakın doğru noktası */
  function nearOnLine(r, o, u) { const a = r[0], d = M.sub(r[1], r[0]), w = M.sub(a, o), b = M.dot(d, u), c = M.dot(d, d), dd = M.dot(u, w), e = M.dot(d, w), den = c - b * b; if (Math.abs(den) < 1e-12) return null; const t = (c * dd - b * e) / den; return { q: M.add(o, M.mul(u, t)), t }; }
  /* iki 3B doğrunun kesişimi (gerçekten kesişiyorsa) */
  function lineX(A, B) {
    const w0 = M.sub(A.o, B.o), a = M.dot(A.u, A.u), b = M.dot(A.u, B.u), c = M.dot(B.u, B.u), d = M.dot(A.u, w0), e = M.dot(B.u, w0), den = a * c - b * b;
    if (Math.abs(den) < 1e-9) return null;
    const s = (b * e - c * d) / den, t = (a * e - b * d) / den, pA = M.add(A.o, M.mul(A.u, s)), pB = M.add(B.o, M.mul(B.u, t));
    const sc = Math.max(1, M.len(pA) * 1e-7); if (M.dist(pA, pB) > sc * 1e-3 + 1e-6) return null;
    if (s <= 1e-9 || t <= 1e-9) return null; return pA;
  }

  /* bu komutta tıklanan noktalar (3B'de çizginin önceki köşeleri de izleme kaynağıdır) */
  let clicked = []; C.on('cmdstart', () => { clicked = []; });
  { const E = C.cmd, ck = E.click; E.click = function (p) { try { if (E.waiting && E.waiting.kind === 'pt' && p) { const q = M.p3(p); if (!clicked.some(o => M.dist(o, q) < 1e-9)) { clicked.push(q); if (clicked.length > 8) clicked.shift(); } } } catch (er) { } return ck.apply(this, arguments); }; }
  function solve(v, sx, sy, p) {
    const E = C.cmd, r = v.ray(sx, sy); if (!r || !C.trackSrc) return null;
    const S = C.trackSrc(); if (st.otrack) for (const q of clicked) if (!S.some(o => M.dist(o.p, q) < 1e-9)) S.push({ p: q });
    if (!S.length) return null;
    const base = E.base ? M.p3(E.base) : null, F = frame(), org = base || M.p3(p), cur = [sx, sy];
    const toPlane = q => M.sub(q, M.mul(F.n, M.dot(M.sub(q, org), F.n)));
    const dirOf = a => M.add(M.mul(F.ux, Math.cos(a * RAD)), M.mul(F.uy, Math.sin(a * RAD)));
    const angs = C.trackAngles ? C.trackAngles() : [0, 90, 180, 270];
    const lines = [];
    for (const s of S) {
      if (s.base) { if (!st.polar) continue; for (const a of angs) lines.push({ o: s.p, u: dirOf(a), lbl: fa(a), base: true, src: s.p }); lines.push({ o: s.p, u: F.n, lbl: 'Z+', z: 1, base: true, src: s.p }, { o: s.p, u: M.mul(F.n, -1), lbl: 'Z−', z: -1, base: true, src: s.p }); continue; }
      if (!st.otrack) continue;
      const o2 = toPlane(s.p);
      for (const a of angs.filter(x => x % 90 === 0 || st.polar)) lines.push({ o: o2, u: dirOf(a), lbl: fa(a), src: s.p });
      lines.push({ o: s.p, u: F.n, lbl: 'Z+', z: 1, src: s.p }, { o: s.p, u: M.mul(F.n, -1), lbl: 'Z−', z: -1, src: s.p });
    }
    const cands = [];
    for (const L of lines) {
      const h = nearOnLine(r, L.o, L.u); if (!h || h.t <= 0) continue; const so = scr(v, L.o), sq = scr(v, h.q); if (!sq || (so && sd(so, sq) < 8)) continue;
      const d = sd(sq, cur); if (d < 10) cands.push(Object.assign({ q: h.q, t: h.t, d }, L));
    }
    if (!cands.length) return null;
    cands.sort((x, y) => x.d - y.d);
    let best = null;
    // iki izleme çizgisinin kesişimi
    for (let i = 0; i < cands.length && i < 14; i++) for (let j = i + 1; j < cands.length && j < 14; j++) {
      const A = cands[i], B = cands[j]; if (M.dist(A.src, B.src) < 1e-9) continue; const X = lineX(A, B); if (!X) continue;
      const sx2 = scr(v, X); if (!sx2) continue; const dd = sd(sx2, cur); if (dd < 16 && (!best || dd < best.dd)) best = { dd, p: X, lines: [A, B], label: `Kesişim: ${A.lbl} × ${B.lbl}` };
    }
    // dikey (Z) çizgide başka bir noktanın yüksekliği
    if (!best) for (const c of cands) {
      if (!c.z) continue;
      for (const s of S) {
        const h = M.dot(M.sub(s.p, c.o), F.n) * c.z; if (h <= 1e-6 || M.dist(s.p, c.src) < 1e-9) continue;
        const X = M.add(c.o, M.mul(c.u, h)), q = scr(v, X); if (!q) continue; const dd = sd(q, cur);
        if (dd < 12 && (!best || dd < best.dd)) best = { dd, p: X, lines: [c], guide: [s.p, X], label: 'Z izleme · yükseklik hizası' };
      }
    }
    if (best) { best.two = true; best.axis = null; return best; }
    const c = cands[0], ax = Math.abs(M.dot(c.u, F.ux)) > 0.9999 ? (F.pl ? 3 : 0) : Math.abs(M.dot(c.u, F.uy)) > 0.9999 ? (F.pl ? 4 : 1) : c.z ? 2 : null;
    const label = c.z ? `${c.base ? 'Z izleme' : 'Nesne izleme Z'}: Δz ${M.fmt(c.t * c.z, 3)}` : `${c.base ? 'Kutupsal' : 'Nesne izleme'}: ${M.fmt(c.t, 3)} < ${c.lbl}`;
    return { p: c.q, lines: [c], label, axis: ax, two: false };
  }

  const pa0 = P3.pointAt;
  P3.pointAt = function (sx, sy) {
    const p = pa0.call(this, sx, sy); this.track = null; const E = C.cmd;
    if (this.snapHit) { if (C.trackAcquire) C.trackAcquire(this.snapHit); return p; }
    if (!p || E.axisLock || this.shift || E.noSnap || !E.waiting || E.waiting.kind !== 'pt' || (!st.polar && !st.otrack)) return p;
    let tr = null; try { tr = solve(this, sx, sy, p); } catch (er) { tr = null; }
    if (!tr) return p;
    if (!tr.two && this.axisHit != null) return p; // tek çizgi: mevcut eksen çıkarımı (kırmızı / yeşil / mavi) yeterli
    this.track = tr; this.axisHit = tr.axis; this.faceHit = null; this.alignRef = null; this.inferTag = tr.label;
    return tr.p;
  };

  function tag(g, x, y, txt, col, center) {
    g.font = '12px system-ui, sans-serif'; const w = g.measureText(txt).width + 10, h = 18, x0 = center ? x - w / 2 : x, y0 = y - h / 2;
    g.fillStyle = 'rgba(16,20,26,.88)'; g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.rect(x0, y0, w, h); g.fill(); g.stroke();
    g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(txt, x0 + 5, y0 + h / 2 + 0.5);
  }
  const xmark = (g, q, s) => { g.beginPath(); g.moveTo(q[0] - s, q[1] - s); g.lineTo(q[0] + s, q[1] + s); g.moveTo(q[0] - s, q[1] + s); g.lineTo(q[0] + s, q[1] - s); g.stroke(); };
  /* doğruyu ekranda uzun çiz (kamera arkasına düşmeden) */
  function farPt(v, o, u) { let L = (v.dist || 50) * 4; for (let i = 0; i < 12; i++, L /= 2) { const q = v.project(M.add(o, M.mul(u, L))); if (q && Math.abs(q[0]) < 2e4 && Math.abs(q[1]) < 2e4) return q; } return null; }

  const dm0 = P3.drawMarks;
  P3.drawMarks = function () {
    dm0.call(this);
    const c = this.ovc, E = C.cmd; if (!c || !this.cursor || !E.waiting || E.waiting.kind !== 'pt') return;
    const g = c.getContext('2d'), d = window.devicePixelRatio || 1; g.save(); g.setTransform(d, 0, 0, d, 0, 0);
    const tr = this.track, cur = this.project(this.cursor);
    if (tr && cur) {
      g.strokeStyle = '#3ddc84'; g.lineWidth = 1;
      for (const L of tr.lines) { const a = this.project(L.o), b = farPt(this, L.o, L.u); if (!a || !b) continue; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.setLineDash([]); xmark(g, a, 4); if (L.src && M.dist(L.src, L.o) > 1e-9) { const s = this.project(L.src); if (s) { g.setLineDash([2, 3]); g.beginPath(); g.moveTo(s[0], s[1]); g.lineTo(a[0], a[1]); g.stroke(); g.setLineDash([]); xmark(g, s, 4); } } }
      if (tr.guide) { const a = this.project(tr.guide[0]), b = this.project(tr.guide[1]); if (a && b) { g.setLineDash([6, 4]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.setLineDash([]); xmark(g, a, 4); } }
      g.setLineDash([]); xmark(g, cur, 5);
    }
    // dinamik ölçü: lastik çizgi üzerinde uzunluk, tabanda açı yayı
    if (st.dyn && E.base && E.rubber !== false && cur) {
      const b3 = M.p3(E.base), c3 = M.p3(this.cursor), L = M.dist(b3, c3), b = this.project(b3);
      if (b && L > 1e-9 && sd(b, cur) > 18) {
        const F = frame(), v = M.sub(c3, b3), x = M.dot(v, F.ux), y = M.dot(v, F.uy), dz = M.dot(v, F.n), hl = Math.hypot(x, y);
        const mx = (b[0] + cur[0]) / 2, my = (b[1] + cur[1]) / 2, sx = cur[0] - b[0], sy = cur[1] - b[1], sl = Math.hypot(sx, sy);
        tag(g, mx - sy / sl * 16, my + sx / sl * 16, M.fmt(L, 3), '#cfe3ff', true);
        if (hl > 1e-9 && hl / L > 0.05) {
          let ang = Math.atan2(y, x) / RAD; if (ang < 0) ang += 360;
          const pr = this.project(M.add(b3, M.mul(F.ux, 1))), ppu = pr ? Math.max(1e-6, sd(pr, b)) : 1, R = Math.min(40 / ppu, hl * 0.4);
          g.strokeStyle = 'rgba(160,190,230,.75)'; g.lineWidth = 1; g.setLineDash([3, 3]);
          const ref = this.project(M.add(b3, M.mul(F.ux, R * 1.3))); if (ref) { g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(ref[0], ref[1]); g.stroke(); }
          g.setLineDash([]); g.beginPath(); let ok = false;
          for (let i = 0; i <= 32; i++) { const th = ang * RAD * i / 32, q = this.project(M.add(b3, M.add(M.mul(F.ux, R * Math.cos(th)), M.mul(F.uy, R * Math.sin(th))))); if (!q) continue; ok ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); ok = true; }
          g.stroke();
          const hm = ang * RAD / 2, lq = this.project(M.add(b3, M.add(M.mul(F.ux, R * 1.45 * Math.cos(hm)), M.mul(F.uy, R * 1.45 * Math.sin(hm)))));
          if (lq) tag(g, lq[0], lq[1], fa(ang), '#cfe3ff', true);
        }
        if (Math.abs(dz) > 1e-6 && hl / L > 0.05) { const top = this.project(M.add(b3, M.mul(F.n, dz))); if (top) { g.strokeStyle = 'rgba(110,150,255,.7)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(top[0], top[1]); g.stroke(); g.setLineDash([]); tag(g, top[0] - 26, top[1], 'Δz ' + M.fmt(dz, 3), '#9fb8ff', true); } }
      }
    }
    g.restore();
  };
})(window.C);

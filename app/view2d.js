/* ArıtmaCAD — 2B görünüm (plan ve harita altlıklı görünüm için ortak çizici) */
(function (C) {
  'use strict';
  const M = C.M;

  class View2D {
    constructor(canvas, opts = {}) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.cx = 0; this.cy = 0; this.s = 20; this.rot = 0;
      this.opts = opts; this.dirty = true;
      this.cursor = null; this.cursorScr = null; this.snapHit = null; this.hover = null;
      this.win = null; // seçim penceresi
      this.grid = true;
      this.bg = opts.bg || null;
      this.dark = opts.dark !== false;
      this.resize();
      const loop = () => { if (this.dirty && this.visible()) { this.dirty = false; this.draw(); } requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
    visible() { return this.cv.offsetParent !== null; }
    resize() {
      const r = this.cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      this.W = Math.max(1, r.width); this.H = Math.max(1, r.height); this.dpr = dpr;
      this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
      this.dirty = true;
    }
    w2s(p) {
      const dx = p[0] - this.cx, dy = p[1] - this.cy, c = Math.cos(this.rot), s = Math.sin(this.rot);
      return [this.W / 2 + (dx * c - dy * s) * this.s, this.H / 2 - (dx * s + dy * c) * this.s];
    }
    s2w(x, y) {
      const xr = (x - this.W / 2) / this.s, yr = -(y - this.H / 2) / this.s, c = Math.cos(this.rot), s = Math.sin(this.rot);
      return [this.cx + xr * c + yr * s, this.cy - xr * s + yr * c, 0];
    }
    viewBox() {
      const pts = [this.s2w(0, 0), this.s2w(this.W, 0), this.s2w(0, this.H), this.s2w(this.W, this.H)];
      return [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
    }
    zoomAt(sx, sy, f) {
      const w = this.s2w(sx, sy);
      this.s = Math.min(1e7, Math.max(1e-5, this.s * f));
      const w2 = this.s2w(sx, sy);
      this.cx += w[0] - w2[0]; this.cy += w[1] - w2[1];
      this.dirty = true; if (this.onViewChange) this.onViewChange();
    }
    zoomBox(bb, pad = 0.08) {
      if (!bb) return;
      const w = Math.max(bb[2] - bb[0], 1e-3), h = Math.max(bb[3] - bb[1], 1e-3);
      this.cx = (bb[0] + bb[2]) / 2; this.cy = (bb[1] + bb[3]) / 2;
      this.s = Math.min(this.W / w, this.H / h) * (1 - pad * 2);
      this.dirty = true; if (this.onViewChange) this.onViewChange();
    }
    zoomExtents() { const bb = C.extents(); if (bb) this.zoomBox(bb); else { this.cx = 10; this.cy = 5; this.s = this.W / 40; this.dirty = true; } }
    pan(dx, dy) {
      const c = Math.cos(this.rot), s = Math.sin(this.rot);
      const xr = -dx / this.s, yr = dy / this.s;
      this.cx += xr * c + yr * s; this.cy += -xr * s + yr * c;
      this.dirty = true; if (this.onViewChange) this.onViewChange();
    }

    /* ----- stil ----- */
    css(aci) { if (aci === 7) return this.dark ? '#f2f2f2' : '#111'; return C.aciCss(aci); }
    lwPx(lw) { if (!C.doc.set.lwdisp) return 1; return Math.max(1, lw / 100 * 3.6); }
    dash(lt) {
      const def = C.LT[lt]; if (!def || !def.p.length) return null;
      const k = (this.ltk != null ? this.ltk : C.doc.set.ltscale) * this.s;
      const arr = def.p.map(v => Math.max(Math.abs(v) * k, v === 0 ? 1 : 0.5));
      const tot = arr.reduce((a, b) => a + b, 0);
      return tot < 4 ? null : arr;
    }

    /* çizgiler aynı renk / kalınlık / çizgi tipinde birleşik yol olarak tek seferde çizilir (büyük çizimlerde hız) */
    flushB() { if (this._bk) { this.ctx.stroke(); this._bk = null; } }
    drawPrims(prims, style, ent) {
      const ctx = this.ctx, B = !!this._batch;
      for (const pr of prims) {
        const color = style.color || this.css(C.entColor(ent, pr.color));
        const lw = style.lw || this.lwPx(C.entLw(ent, pr.lw));
        const dsh = style.dash !== undefined ? style.dash : this.dash(C.entLt(ent, pr.lt));
        const k = pr.k;
        if (k === 'L' || k === 'P' || k === 'C' || k === 'A') {
          if (k === 'P' && pr.pts.length < 2) continue;
          let c, r; if (k === 'C') { c = this.w2s(pr.c); r = pr.r * this.s; if (r < 0.3) continue; }
          const key = color + '|' + lw + '|' + (dsh ? dsh.join(',') : '');
          if (this._bk !== key) { this.flushB(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.setLineDash(dsh || []); ctx.beginPath(); this._bk = key; this._bn = 0; }
          if (k === 'L') { const a = this.w2s(pr.a), b = this.w2s(pr.b); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
          else if (k === 'P') { const p0 = this.w2s(pr.pts[0]); ctx.moveTo(p0[0], p0[1]); for (let i = 1; i < pr.pts.length; i++) { const q = this.w2s(pr.pts[i]); ctx.lineTo(q[0], q[1]); } if (pr.c) ctx.closePath(); }
          else if (k === 'C') { ctx.moveTo(c[0] + r, c[1]); ctx.arc(c[0], c[1], r, 0, Math.PI * 2); }
          else { const cc = this.w2s(pr.c), rr = pr.r * this.s, a0 = -(pr.a0 + this.rot); ctx.moveTo(cc[0] + rr * Math.cos(a0), cc[1] + rr * Math.sin(a0)); ctx.arc(cc[0], cc[1], rr, a0, -(pr.a1 + this.rot), true); }
          if (!B) this.flushB(); else if (++this._bn > 3000) { ctx.stroke(); ctx.beginPath(); this._bn = 0; }
          continue;
        }
        this.flushB();
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.setLineDash(dsh || []);
        switch (k) {
          case 'S': { if (pr.maske) ctx.fillStyle = this.dark ? '#1b1f24' : '#ffffff'; /* yazı maskesi: arka plan rengiyle (elektrik etiketleri, 15.11.2026) */ ctx.beginPath(); pr.pts.forEach((p, i) => { const q = this.w2s(p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fill(); break; }
          case 'X': { const q = this.w2s(pr.p); ctx.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3); break; }
          case 'T': { C.drawTextCanvas(ctx, pr, { w2s: q => this.w2s(q), s: this.s, rot: this.rot }); break; }
        }
      }
    }

    draw() {
      const ctx = this.ctx, d = this.dpr;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.fillStyle = this.dark ? '#1b1f24' : '#ffffff';
      ctx.fillRect(0, 0, this.W, this.H);
      if (this.bg) this.bg(ctx, this);
      if (this.grid && !this.bg) this.drawGrid();
      if (!C.doc || (this.isMap && !C.geo.isSet())) { this.drawCursorOnly && this.drawCursorOnly(); return; }
      const vb = this.viewBox();
      ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
      const selIds = new Set(C.sel.map(e => e.id));
      const ents = C.doc.ents.some(e => e.type === 'hatch') ? C.doc.ents.filter(e => e.type === 'hatch').concat(C.doc.ents.filter(e => e.type !== 'hatch')) : C.doc.ents; // taramalar arkada
      this._batch = true; this._bk = null;
      for (const e of ents) {
        const lay = C.layer(e.layer); if (!lay.on) continue;
        if (C.state.annoAll === false && C.annoVisible && !C.annoVisible(e, C.doc.set.anno)) continue;
        const b = C.bbox(e); if (b[2] < vb[0] || b[0] > vb[2] || b[3] < vb[1] || b[1] > vb[3]) continue;
        if (lay.lock && lay.fade > 0) { this.flushB(); ctx.globalAlpha = Math.max(0.1, 1 - lay.fade / 100); this.drawPrims(C.prims(e), {}, e); this.flushB(); ctx.globalAlpha = 1; } else this.drawPrims(C.prims(e), {}, e);
      }
      this.flushB(); this._batch = false;
      // seçili
      ctx.lineCap = 'round';
      for (const e of C.sel) { this.drawPrims(C.prims(e), { color: '#4aa8ff', lw: 2, dash: [6, 4] }, e); }
      if (this.hover && !selIds.has(this.hover.id)) this.drawPrims(C.prims(this.hover), { color: '#ffd24a', lw: 2.5, dash: null }, this.hover);
      // tutamaçlar
      ctx.setLineDash([]); ctx.fillStyle = '#1f6fff';
      if (C.drawGrips && !this.isLayout) C.drawGrips(this, ctx); else if (C.sel.length && C.sel.length < 60) for (const e of C.sel) { let n = 0; for (const sp of C.snapPts(e)) { if (sp.k !== 'end' && sp.k !== 'cen') continue; const q = this.w2s(sp.p); ctx.fillRect(q[0] - 3.5, q[1] - 3.5, 7, 7); if (++n > 40) break; } }
      // önizleme
      if (C.cmd && C.cmd.preview && this.cursor) {
        let pr = []; try { pr = C.cmd.preview(this.cursor) || []; } catch (err) { }
        const ghost = C.cmd.previewEnt || { layer: C.doc.cur.layer, color: C.doc.cur.color, lt: C.doc.cur.lt, lw: C.doc.cur.lw };
        this.drawPrims(pr, {}, ghost);
      }
      if (C.cmd && C.cmd.base && this.cursor && C.cmd.rubber !== false) {
        const a = this.w2s(C.cmd.base), b = this.w2s(this.cursor);
        ctx.strokeStyle = '#9aa4ae'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.setLineDash([]);
      }
      // pencere
      if (this.win) {
        const [x0, y0, x1, y1] = this.win, cross = x1 < x0;
        ctx.fillStyle = cross ? 'rgba(80,200,120,0.12)' : 'rgba(80,140,255,0.12)'; ctx.strokeStyle = cross ? '#5c8' : '#58f';
        ctx.setLineDash(cross ? [5, 4] : []); ctx.lineWidth = 1;
        ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)); ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)); ctx.setLineDash([]);
      }
      // imleç
      if (this.cursorScr) {
        const [x, y] = this.snapHit ? this.w2s(this.snapHit.p) : this.hoverGrip && this.hoverGrip.p ? this.w2s(this.hoverGrip.p) : this.cursorScr; // tutamağa mıknatıs gibi yapış
        ctx.strokeStyle = this.dark || this.bg ? 'rgba(255,255,255,0.85)' : '#000'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 40, y); ctx.lineTo(x + 40, y); ctx.moveTo(x, y - 40); ctx.lineTo(x, y + 40); ctx.stroke();
        if (!C.cmd || !C.cmd.waiting || C.cmd.waiting.kind === 'sel' || C.cmd.cursorIcon) ctx.strokeRect(x - 4, y - 4, 8, 8);
        if (C.cmd && C.cmd.cursorIcon === 'brush' && C.drawBrush) C.drawBrush(ctx, x, y);
        if (this.snapHit) {
          const k = this.snapHit.k; ctx.strokeStyle = '#3f6'; ctx.lineWidth = 2; ctx.beginPath();
          if (k === 'end') ctx.rect(x - 6, y - 6, 12, 12);
          else if (k === 'mid') { ctx.moveTo(x, y - 7); ctx.lineTo(x + 7, y + 6); ctx.lineTo(x - 7, y + 6); ctx.closePath(); }
          else if (k === 'cen') ctx.arc(x, y, 7, 0, Math.PI * 2);
          else if (k === 'int') { ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6); }
          else if (k === 'qua') { ctx.moveTo(x, y - 7); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 7, y); ctx.closePath(); }
          else if (k === 'grid') { ctx.arc(x, y, 3, 0, Math.PI * 2); }
          else if (k === 'fcen') { ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10); }
          else if (k === 'per') { ctx.moveTo(x - 7, y + 6); ctx.lineTo(x + 7, y + 6); ctx.moveTo(x - 7, y + 6); ctx.lineTo(x - 7, y - 7); ctx.moveTo(x - 7, y); ctx.lineTo(x, y); ctx.lineTo(x, y + 6); }
          else if (k === 'nea') { ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6); ctx.lineTo(x + 6, y + 6); ctx.closePath(); }
          else ctx.rect(x - 5, y - 5, 10, 10);
          ctx.stroke();
        }
      }
      if (this.hoverGrip && C.drawGripHint && !this.isLayout) C.drawGripHint(this, ctx);
      if (this.afterDraw) this.afterDraw(ctx);
    }
    gridStep() { const px = 18; let st = Math.pow(10, Math.ceil(Math.log10(px / this.s))); if (st * this.s / 2 > px * 2.5) st /= 2; if (st * this.s / 2 > px) st /= 2; return st; }
    drawGrid() {
      const ctx = this.ctx, st = this.gridStep(), vb = this.viewBox();
      if ((vb[2] - vb[0]) / st > 400) return;
      ctx.lineWidth = 1;
      for (const [mult, col] of [[1, 'rgba(255,255,255,0.045)'], [5, 'rgba(255,255,255,0.09)']]) {
        const s = st * mult; ctx.strokeStyle = this.dark ? col : 'rgba(0,0,0,0.07)'; ctx.beginPath();
        for (let x = Math.ceil(vb[0] / s) * s; x <= vb[2]; x += s) { const a = this.w2s([x, vb[1]]), b = this.w2s([x, vb[3]]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        for (let y = Math.ceil(vb[1] / s) * s; y <= vb[3]; y += s) { const a = this.w2s([vb[0], y]), b = this.w2s([vb[2], y]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        ctx.stroke();
      }
      // eksenler
      const o = this.w2s([0, 0]); ctx.strokeStyle = 'rgba(255,80,80,0.5)'; ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(o[0] + 30, o[1]); ctx.stroke();
      ctx.strokeStyle = 'rgba(80,255,120,0.5)'; ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(o[0], o[1] - 30); ctx.stroke();
    }

    /* ----- seçim / yakalama ----- */
    pick(sx, sy) {
      const w = this.s2w(sx, sy), tol = 6 / this.s;
      let best = null, bd = tol;
      for (let i = C.doc.ents.length - 1; i >= 0; i--) {
        const e = C.doc.ents[i]; const lay = C.layer(e.layer); if (!lay.on || lay.lock) continue;
        const b = C.bbox(e); if (w[0] < b[0] - tol || w[0] > b[2] + tol || w[1] < b[1] - tol || w[1] > b[3] + tol) continue;
        const d = C.entDist(e, w); if (d < bd) { bd = d; best = e; }
      }
      if (!best && C.hatchAt) best = C.hatchAt(w); // boş yere tıklandıysa: içinde kalınan tarama
      return best;
    }
    windowSel(x0, y0, x1, y1) {
      const cross = x1 < x0, a = this.s2w(Math.min(x0, x1), Math.max(y0, y1)), b = this.s2w(Math.max(x0, x1), Math.min(y0, y1));
      const wb = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
      return C.doc.ents.filter(e => {
        const lay = C.layer(e.layer); if (!lay.on || lay.lock) return false;
        const bb = C.bbox(e); if (bb[0] === Infinity) return false;
        if (!cross) return bb[0] >= wb[0] && bb[2] <= wb[2] && bb[1] >= wb[1] && bb[3] <= wb[3];
        if (bb[2] < wb[0] || bb[0] > wb[2] || bb[3] < wb[1] || bb[1] > wb[3]) return false;
        if (bb[0] >= wb[0] && bb[2] <= wb[2] && bb[1] >= wb[1] && bb[3] <= wb[3]) return true;
        // kenar kesişimi kontrolü
        const box = [[wb[0], wb[1]], [wb[2], wb[1]], [wb[2], wb[3]], [wb[0], wb[3]]];
        for (const pr of C.prims(e)) { const segs = C.primSegs(pr); for (const [p, q] of segs) { if (inBox(p, wb) || inBox(q, wb)) return true; for (let i = 0; i < 4; i++) { const r = M.segInt(p, q, box[i], box[(i + 1) % 4]); if (r && r.t >= 0 && r.t <= 1 && r.u >= 0 && r.u <= 1) return true; } } }
        return false;
      });
    }
    snap(sx, sy) {
      const raw = this.s2w(sx, sy), tol = 12 / this.s, st = C.state;
      let best = null, bd = tol;
      if (st.osnap && !C.cmd.noSnap) {
        const near = [];
        for (const e of C.tempSnapEnts().concat(C.doc.ents)) {
          const lay = C.layer(e.layer); if (!lay.on) continue;
          const b = C.bbox(e); if (raw[0] < b[0] - tol || raw[0] > b[2] + tol || raw[1] < b[1] - tol || raw[1] > b[3] + tol) continue;
          if (C.entDist(e, raw) > tol * 1.5 && !(e.type === 'pump' || e.type === 'valve' || e.type === 'ctank')) continue;
          near.push(e);
          for (const sp of C.snapPts(e)) { if (!st.snapKinds[sp.k]) continue; const d = M.dist2(sp.p, raw); if (d < bd) { bd = d; best = { p: M.p3(sp.p), k: sp.k, e }; } }
          if (near.length > 60) break;
        }
        if (st.snapKinds.fcen !== false && C.polyCentroid2) { // kapalı şeklin merkezi
          for (const e of C.tempSnapEnts().length ? C.doc.ents : C.doc.ents) {
            if (!(e.type === 'pline' && e.closed) && e.type !== 'solid' && e.type !== 'slab') continue; if (!C.layer(e.layer).on) continue;
            const b = C.bbox(e); if (raw[0] < b[0] || raw[0] > b[2] || raw[1] < b[1] || raw[1] > b[3]) continue;
            const pr = C.prims(e)[0]; if (!pr || !pr.pts || pr.pts.length < 3) continue; const c = C.polyCentroid2(pr.pts); if (!c) continue;
            const d = M.dist2(c, raw); if (d < bd) { bd = d; best = { p: [c[0], c[1], pr.pts[0][2] || 0], k: 'fcen', e }; }
          }
        }
        if (st.snapKinds.int && (!best || best.k !== 'end')) {
          const segs = [];
          for (const e of near) for (const pr of C.prims(e)) for (const s of C.primSegs(pr)) if (M.segDist(raw, s[0], s[1]) < tol) segs.push(s);
          for (let i = 0; i < segs.length && i < 80; i++) for (let j = i + 1; j < segs.length && j < 80; j++) {
            const r = M.segInt(segs[i][0], segs[i][1], segs[j][0], segs[j][1]);
            if (r && r.t > -1e-9 && r.t < 1 + 1e-9 && r.u > -1e-9 && r.u < 1 + 1e-9) { const d = M.dist2(r.p, raw); if (d < bd * 0.9) { bd = d; best = { p: [r.p[0], r.p[1], segs[i][0][2] || 0], k: 'int' }; } }
          }
        }
        if (!best && (st.snapKinds.per || st.snapKinds.nea)) {
          const base = C.cmd.base && C.cmd.waiting ? C.cmd.base : null; let bn = null, bnd = tol;
          for (const e of near) for (const pr of C.prims(e)) for (const [a, b] of C.primSegs(pr)) {
            const v = [b[0] - a[0], b[1] - a[1]], L2 = v[0] * v[0] + v[1] * v[1]; if (L2 < 1e-18) continue;
            if (st.snapKinds.per && base) { const t = ((base[0] - a[0]) * v[0] + (base[1] - a[1]) * v[1]) / L2; if (t >= 0 && t <= 1) { const f = [a[0] + v[0] * t, a[1] + v[1] * t, (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * t]; const d = M.dist2(f, raw); if (d < bd && M.dist2(f, base) > 1e-9) { bd = d; best = { p: f, k: 'per', e }; } } }
            if (st.snapKinds.nea) { let t = ((raw[0] - a[0]) * v[0] + (raw[1] - a[1]) * v[1]) / L2; t = Math.max(0, Math.min(1, t)); const f = [a[0] + v[0] * t, a[1] + v[1] * t, (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * t], d = M.dist2(f, raw); if (d < bnd) { bnd = d; bn = { p: f, k: 'nea', e }; } }
          }
          if (!best && bn) best = bn;
        }
      }
      if (!best && st.osnap && C.nearestOnPipes) { const h = C.nearestOnPipes(raw, tol); if (h) best = { p: h.q, k: 'nea', e: h.e }; }
      if (!best && st.gridSnap) { const g = this.gridStep(); best = { p: [Math.round(raw[0] / g) * g, Math.round(raw[1] / g) * g, 0], k: 'grid' }; }
      return best;
    }
  }
  const inBox = (p, b) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3];
  C.View2D = View2D;
})(window.C);

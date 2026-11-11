/* ArıtmaCAD — Düzen (layout / kağıt alanı): kağıt, antet, ölçekli görünüm pencereleri, yazdırma */
(function (C) {
  'use strict';
  const M = C.M;
  /* ölçüye bağlı (açıklama) nesneleri: görünüm penceresinin ölçeğine göre yeniden boyutlanır */
  const ANNO = new Set(['dim', 'kot', 'pipe', 'tank', 'ctank', 'pump', 'valve', 'text', 'ctext', 'hatch']);
  C.ANNO_TYPES = ANNO;
  C.STD_SCALES = [1, 2, 5, 10, 20, 25, 50, 75, 100, 200, 250, 500, 1000, 2000, 2500, 5000];

  C.withAnno = function (scale, fn) {
    const s = C.doc.set, a0 = s.anno, l0 = s.ltscale;
    s.anno = scale; s.ltscale = l0 * scale / a0;
    try { return fn(); } finally { s.anno = a0; s.ltscale = l0; }
  };
  /* bir görünüm penceresinde çizilecek ilkel listesi (ölçüye bağlı nesneler o ölçekte üretilir) */
  C.vpPrims = function (vp, cb) {
    const L0 = (C.doc.layouts || []).find(L => L.vps.includes(vp)), u0 = C._dimU; C._dimU = C.dimUnitFor ? C.dimUnitFor((L0 && L0.grp) || 'Genel') : null;
    try { return vpPrims0(vp, cb); } finally { C._dimU = u0; }
  };
  const vpPrims0 = function (vp, cb) {
    const k = 1000 / vp.scale, hw = vp.w / 2 / k, hh = vp.h / 2 / k;
    const vb = [vp.cx - hw, vp.cy - hh, vp.cx + hw, vp.cy + hh];
    C.withAnno(vp.scale, () => {
      const ents = C.doc.ents.some(e => e.type === 'hatch') ? C.doc.ents.filter(e => e.type === 'hatch').concat(C.doc.ents.filter(e => e.type !== 'hatch')) : C.doc.ents;
      for (const e of ents) {
        if (e.type === 'sheet') continue;
        const lay = C.layer(e.layer); if (!lay.on || (vp.frozen || []).includes(e.layer) || (e.layer === 'PAFTA_INDEKS' && !vp.showIndex)) continue;
        const b = C.bbox(e); if (b[2] < vb[0] || b[0] > vb[2] || b[3] < vb[1] || b[1] > vb[3]) continue;
        if (C.annoVisible && !C.annoVisible(e, vp.scale, vp.annoMode)) continue;
        let pr; try { pr = ANNO.has(e.type) ? C.T[e.type].prims(e) : C.prims(e); if (ANNO.has(e.type) && e.aoff && C.annoShift) pr = C.annoShift(e, pr); } catch (err) { continue; }
        cb(e, pr);
      }
    });
  };
  /* görünüm penceresi çerçevesi (sınır çizgisi): katman, renk, çizgi tipi, kalınlık; null = yazdırılmaz */
  C.vpFrame = vp => {
    const f = vp.frame;
    if (f) { if (f.on === false) return null; const lay = C.layer(f.layer || '0'); if (lay && lay.on === false) return null; return { layer: f.layer || '0', color: f.color == null ? 256 : f.color, lt: f.lt || 'BYLAYER', lw: f.lw == null ? -1 : f.lw, lts: f.lts || 1 }; }
    if (vp.border || (vp.border == null && vp.clip)) return { layer: '0', color: 7, lt: 'CONTINUOUS', lw: vp.label ? 50 : 25, lts: 1 };
    return null;
  };
  C.paperSize = L => { let [w, h] = L.size === 'OZEL' && L.pw > 0 && L.ph > 0 ? [L.pw, L.ph] : (C.PAPER[L.size] || C.PAPER.A1); if (L.orient === 'P') [w, h] = [h, w]; return { w, h }; };
  C.layoutFrame = L => { const { w, h } = C.paperSize(L), m = L.margin || {}; const x0 = m.l != null ? m.l : 20, y0 = m.b != null ? m.b : 10, x1 = w - (m.r != null ? m.r : 10), y1 = h - (m.t != null ? m.t : 10); return { x0, y0, x1, y1, tbTop: L.noTitle ? y0 : y0 + 66, tbX: x1 - 180 }; };
  const scaleTxt = L => L.vps.length ? [...new Set(L.vps.map(v => '1/' + v.scale))].join(', ') : '-';
  C.titlePrims = L => {
    if (L.noTitle) { const { w, h } = C.paperSize(L), fr = C.layoutFrame(L); return [C.prim.P([[0, 0, 0], [w, 0, 0], [w, h, 0], [0, h, 0]], true, { lw: 13 }), C.prim.P([[fr.x0, fr.y0, 0], [fr.x1, fr.y0, 0], [fr.x1, fr.y1, 0], [fr.x0, fr.y1, 0]], true, { lw: 70 })]; }
    const def = C.T.sheet.prims({ type: 'sheet', o: [0, 0, 0], size: L.size, pw: L.pw, ph: L.ph, margin: L.margin, orient: L.orient, scale: 1000, f: L.f || {}, scaleText: scaleTxt(L) });
    const tb = C.doc.set.titleBlock || C.defaultTitleBlock;
    if (!tb || !tb.ents || !tb.ents.length) return def;
    const { w, h } = C.paperSize(L), fr = C.layoutFrame(L), f = L.f || {};
    const vals = { PROJE: f.proje, BASLIK: f.baslik, PAFTAADI: f.baslik, CIZEN: f.cizen, KONTROL: f.kontrol, ONAY: f.onay, TARIH: f.tarih || new Date().toLocaleDateString('tr-TR'), OLCEK: scaleTxt(L), NO: f.no, PAFTANO: f.no, PAFTA_NO: f.no, REV: f.rev, REVIZYON: f.rev, FIRMA: f.firma, KAGIT: L.size, DOSYA: C.doc.set.name, DUZEN: L.name };
    const sub = t => String(t).replace(/\{([^}]+)\}/g, (m, k) => { const v = vals[C.up(k).replace(/[^A-Z_]/g, '')]; return v == null ? '' : v; });
    let sc = 1, dx, dy; const bw = tb.bb[2] - tb.bb[0];
    if (tb.full) { sc = w / bw; dx = -tb.bb[0] * sc; dy = -tb.bb[1] * sc; } else { dx = fr.x1 - tb.bb[2]; dy = fr.y0 - tb.bb[1]; }
    const X = C.makeX(q => [q[0] * sc + dx, q[1] * sc + dy], [sc, 0, 0, sc]);
    const out = tb.full ? [] : def.slice(0, 2);
    for (const e0 of tb.ents) {
      const e = JSON.parse(JSON.stringify(e0)); if (e.s != null) e.s = sub(e.s);
      C.xform(e, X); try { for (const pr of C.T[e.type].prims(e)) { if (e.lw != null && e.lw >= 0 && pr.lw == null) pr.lw = e.lw; out.push(pr); } } catch (err) { }
    }
    return out;
  };
  try { C.defaultTitleBlock = JSON.parse(localStorage.getItem('aritmacad.titleblock') || 'null'); } catch (e) { }
  C.newLayout = function (name, size = 'A1', orient = 'L') {
    const L = { name: name || 'Düzen' + ((C.doc.layouts || []).length + 1), size, orient, f: { proje: '', baslik: '', cizen: C.userName || '', no: String((C.doc.layouts || []).length + 1).padStart(2, '0') }, vps: [] };
    const fr = C.layoutFrame(L);
    const vp = { x: fr.x0 + 5, y: fr.tbTop + 5, w: fr.x1 - fr.x0 - 10, h: fr.y1 - fr.tbTop - 10, cx: 0, cy: 0, scale: C.doc.set.anno };
    const bb = C.extents(C.doc.ents.filter(e => e.type !== 'sheet'));
    if (bb) { vp.cx = (bb[0] + bb[2]) / 2; vp.cy = (bb[1] + bb[3]) / 2; vp.scale = C.fitScale(bb, vp.w, vp.h); }
    L.vps.push(vp);
    (C.doc.layouts = C.doc.layouts || []).push(L);
    return L;
  };
  C.fitScale = (bb, wmm, hmm) => { const need = Math.max((bb[2] - bb[0]) * 1000 / (wmm * 0.95), (bb[3] - bb[1]) * 1000 / (hmm * 0.95)); return C.STD_SCALES.find(s => s >= need) || Math.ceil(need / 1000) * 1000; };

  /* ---------- SVG (yazdırma / PDF) ---------- */
  const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  C.primsSvg = function (out, prims, e, P, k, mono, ltk) { // P: model -> kağıt mm (y aşağı); k: mm / birim
    for (const pr of prims) {
      const aci = C.entColor(e, pr.color), col = mono ? '#000' : (aci === 7 ? '#000' : C.aciCss(aci));
      const lw = Math.max(0.09, C.entLw(e, pr.lw) / 100), lt = C.entLt(e, pr.lt);
      const pat = C.LT[lt] && C.LT[lt].p.length ? C.LT[lt].p.map(v => Math.max(Math.abs(v) * ltk, v === 0 ? 0.01 : 0.1).toFixed(3)).join(' ') : null;
      const st = `stroke="${col}" stroke-width="${lw}"${pat ? ` stroke-dasharray="${pat}"` : ''}`;
      const q = p => { const r = P(p); return r[0].toFixed(3) + ',' + r[1].toFixed(3); };
      switch (pr.k) {
        case 'L': { const a = P(pr.a), b = P(pr.b); out.push(`<line x1="${a[0].toFixed(3)}" y1="${a[1].toFixed(3)}" x2="${b[0].toFixed(3)}" y2="${b[1].toFixed(3)}" ${st}/>`); break; }
        case 'P': out.push(`<${pr.c ? 'polygon' : 'polyline'} points="${pr.pts.map(q).join(' ')}" ${st}/>`); break;
        case 'S': out.push(`<polygon points="${pr.pts.map(q).join(' ')}" fill="${col}" stroke="none"/>`); break;
        case 'C': { const c = P(pr.c); out.push(`<circle cx="${c[0].toFixed(3)}" cy="${c[1].toFixed(3)}" r="${(pr.r * k).toFixed(3)}" ${st}/>`); break; }
        case 'A': { const p0 = P(M.polar(pr.c, pr.a0, pr.r)), p1 = P(M.polar(pr.c, pr.a1, pr.r)), sw = M.normAng(pr.a1 - pr.a0); out.push(`<path d="M${p0[0].toFixed(3)} ${p0[1].toFixed(3)} A${(pr.r * k).toFixed(3)} ${(pr.r * k).toFixed(3)} 0 ${sw > Math.PI ? 1 : 0} 0 ${p1[0].toFixed(3)} ${p1[1].toFixed(3)}" ${st}/>`); break; }
        case 'X': { const c = P(pr.p); out.push(`<circle cx="${c[0].toFixed(3)}" cy="${c[1].toFixed(3)}" r="0.2" fill="${col}"/>`); break; }
        case 'T': out.push(C.textSvg(pr, P, k, col)); break;
      }
    }
  };
  C.layoutSvg = function (L, opts = {}) {
    const { w, h } = C.paperSize(L), mono = opts.mono !== false;
    const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">`, `<rect x="0" y="0" width="${w}" height="${h}" fill="#fff"/>`, '<g fill="none" stroke-linecap="round" stroke-linejoin="round">'];
    L.vps.forEach((vp, i) => {
      const k = 1000 / vp.scale;
      const cpts = (C.vpClipPoly ? C.vpClipPoly(vp) : [[vp.x, vp.y], [vp.x + vp.w, vp.y], [vp.x + vp.w, vp.y + vp.h], [vp.x, vp.y + vp.h]]).map(q => q[0].toFixed(3) + ',' + (h - q[1]).toFixed(3)).join(' ');
      out.push(`<defs><clipPath id="vp${i}"><polygon points="${cpts}"/></clipPath></defs><g clip-path="url(#vp${i})">`);
      const P = p => [vp.x + vp.w / 2 + (p[0] - vp.cx) * k, h - (vp.y + vp.h / 2 + (p[1] - vp.cy) * k)];
      const ltk = C.doc.set.ltscale * (vp.scale / C.doc.set.anno) * k;
      C.vpPrims(vp, (e, pr) => C.primsSvg(out, pr, e, P, k, mono, ltk));
      out.push('</g>');
      const fe = C.vpFrame(vp); if (fe) C.primsSvg(out, [C.prim.P(C.vpClipPoly(vp).map(q => [q[0], q[1], 0]), true)], fe, p => [p[0], h - p[1]], 1, mono, fe.lts || 1);
    });
    const stub = { layer: '0', color: 7, lt: 'CONTINUOUS', lw: -1 };
    C.primsSvg(out, C.titlePrims(L), stub, p => [p[0], h - p[1]], 1, true, 1);
    if (C.vpLabelPrims) C.primsSvg(out, C.vpLabelPrims(L), stub, p => [p[0], h - p[1]], 1, true, 1);
    out.push('</g></svg>');
    return { svg: out.join('\n'), w, h };
  };

  /* ---------- Düzen görünümü (ekran) ---------- */
  const pip = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  class LayoutView extends C.View2D {
    constructor(canvas) { super(canvas, { dark: false }); this.grid = false; this.isLayout = true; }
    cur() { const ls = C.doc.layouts || []; return ls[Math.min(C.layoutIdx || 0, ls.length - 1)] || null; }
    lwPx(lw) { return C.doc.set.lwdisp ? Math.max(1, lw / 100 * this.s) : 1; }
    zoomExtents() { const L = this.cur(); if (!L) return; const { w, h } = C.paperSize(L); this.zoomBox([0, 0, w, h], 0.04); }
    vpAt(p) { const L = this.cur(); if (!L) return null; for (let i = L.vps.length - 1; i >= 0; i--) { const v = L.vps[i]; if (p[0] >= v.x && p[0] <= v.x + v.w && p[1] >= v.y && p[1] <= v.y + v.h && (!v.clip || pip(p, C.vpClipPoly(v)))) return v; } return null; }
    draw() {
      const ctx = this.ctx, d = this.dpr; ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.fillStyle = '#4a515c'; ctx.fillRect(0, 0, this.W, this.H);
      const L = this.cur();
      if (!L) { ctx.fillStyle = '#ddd'; ctx.font = '14px system-ui'; ctx.textAlign = 'center'; ctx.fillText('Düzen yok — üstteki "+ Yeni düzen" ile oluşturun.', this.W / 2, this.H / 2); return; }
      const { w, h } = C.paperSize(L), a = this.w2s([0, h]), b = this.w2s([w, 0]);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(a[0] + 5, a[1] + 5, b[0] - a[0], b[1] - a[1]);
      ctx.fillStyle = '#fff'; ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
      ctx.lineCap = 'butt';
      for (const vp of L.vps) {
        const p0 = this.w2s([vp.x, vp.y + vp.h]), p1 = this.w2s([vp.x + vp.w, vp.y]);
        const cp = (C.vpClipPoly ? C.vpClipPoly(vp) : [[vp.x, vp.y], [vp.x + vp.w, vp.y], [vp.x + vp.w, vp.y + vp.h], [vp.x, vp.y + vp.h]]).map(q => this.w2s(q));
        const path = () => { ctx.beginPath(); cp.forEach((q, j) => j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); };
        ctx.save(); path(); ctx.clip();
        const k = 1000 / vp.scale, self = this;
        const proxy = Object.create(C.View2D.prototype);
        Object.assign(proxy, { ctx, dark: false, rot: 0, s: this.s * k, W: this.W, H: this.H });
        proxy.w2s = p => self.w2s([vp.x + vp.w / 2 + (p[0] - vp.cx) * k, vp.y + vp.h / 2 + (p[1] - vp.cy) * k]);
        proxy.lwPx = lw => self.lwPx(lw);
        C.vpPrims(vp, (e, pr) => proxy.drawPrims(pr, {}, e));
        ctx.restore();
        const sel = C.layoutSel === vp, act = C.activeVp === vp;
        if (act) { ctx.save(); path(); ctx.lineWidth = 4; ctx.strokeStyle = '#0a7d3c'; ctx.setLineDash([]); ctx.stroke(); ctx.restore(); const t = vp.lock ? `MODEL · 1/${vp.scale} · 🔒 kilitli (kaydırma/ölçek kapalı, düzenleme açık) — dışarı çift tık: çık` : `MODEL · 1/${vp.scale} — çizimi düzenleyin · orta tuş: kaydır · tekerlek: ölçek · dışarı çift tık / Esc: çık`; ctx.font = '12px system-ui'; const w = ctx.measureText(t).width, x0 = Math.min(...cp.map(q => q[0])), y0 = Math.max(...cp.map(q => q[1])) + 4; ctx.fillStyle = 'rgba(10,125,60,0.92)'; ctx.fillRect(x0, y0, w + 12, 19); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(t, x0 + 6, y0 + 3); ctx.textBaseline = 'alphabetic'; }
        const fe = C.vpFrame(vp);
        if (fe) { const sv = this.ltk; this.ltk = fe.lts || 1; try { this.drawPrims([C.prim.P(C.vpClipPoly(vp).map(q => [q[0], q[1], 0]), true)], {}, fe); } finally { this.ltk = sv; } }
        if (sel || (!fe && !(vp.frame && vp.frame.on === false))) { ctx.setLineDash(sel ? [] : [4, 3]); ctx.strokeStyle = sel ? '#1f6fff' : '#9aa3ad'; ctx.lineWidth = sel ? 2 : 1; path(); ctx.stroke(); ctx.setLineDash([]); }
        if (sel) { ctx.fillStyle = '#1f6fff'; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillText(`1/${vp.scale}${vp.annoMode === 'hepsi' ? ' · tüm açıklamalar' : ''}`, Math.min(...cp.map(q => q[0])) + 26, Math.min(...cp.map(q => q[1])) + 14); }
      }
      this.drawPrims(C.titlePrims(L), {}, { layer: '0', color: 7, lt: 'CONTINUOUS', lw: -1 });
      if (C.vpLabelPrims) this.drawPrims(C.vpLabelPrims(L), {}, { layer: '0', color: 7, lt: 'CONTINUOUS', lw: -1 });
      if (C.cmd && C.cmd.preview && this.cursor) { try { this.drawPrims(C.cmd.preview(this.cursor) || [], { color: '#1f6fff', lw: 1, dash: [5, 4] }, { layer: '0', color: 7 }); } catch (e) { } }
      // seçili pencere: tutamaçlar ve kilit
      const sv = C.layoutSel && L.vps.includes(C.layoutSel) && !C.vpEdit ? C.layoutSel : null;
      if (sv) {
        if (C.vpGrips) for (const g of C.vpGrips(sv)) { const q = this.w2s([g[1], g[2]]), hot = this.hotGrip && this.hotGrip.k === g[0], hv = this.hoverGrip && this.hoverGrip.k === g[0]; const r = hot ? 6 : hv ? 8 : 4.5; if (hv || hot) { ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = hot ? '#ff2a2a' : '#ff7ac0'; ctx.beginPath(); ctx.arc(q[0], q[1], r + 7, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } ctx.fillStyle = hot ? '#ff2a2a' : hv ? '#ff7ac0' : '#1f6fff'; ctx.strokeStyle = '#0b2a66'; ctx.lineWidth = 1; ctx.setLineDash([]); if (g[0] === 'c') { ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } else { ctx.fillRect(q[0] - r, q[1] - r, 2 * r, 2 * r); ctx.strokeRect(q[0] - r, q[1] - r, 2 * r, 2 * r); } }
      }
      for (const vp of L.vps) { if (!vp.lock && vp !== sv) continue; const q = this.w2s([vp.x + 7, vp.y + vp.h - 7]); ctx.font = '15px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(q[0] - 10, q[1] - 10, 20, 20); ctx.fillStyle = '#000'; ctx.fillText(vp.lock ? '🔒' : '🔓', q[0], q[1] + 1); ctx.textBaseline = 'alphabetic'; }
      // imleç (AutoCAD gibi her zaman görünür artı + seçim kutusu)
      if (this.cursorScr) {
        const [x, y] = this.cursorScr, inAct = C.activeVp && this.vpAt(this.cursor || [0, 0]) === C.activeVp;
        ctx.setLineDash([]); ctx.lineWidth = 1; const cw = this.cursor || [0, 0], onPaper = cw[0] >= 0 && cw[1] >= 0 && cw[0] <= w && cw[1] <= h; ctx.strokeStyle = inAct ? '#0a7d3c' : C.cmd.waiting ? '#1f6fff' : onPaper ? '#222' : '#f2f2f2';
        const r = inAct || C.cmd.waiting ? 40 : 18; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
        if (!C.cmd.waiting || C.cmd.waiting.kind === 'sel') ctx.strokeRect(x - 4, y - 4, 8, 8);
      }
    }
  }
  C.LayoutView = LayoutView;

  /* ---------- komutlar ---------- */
  const needLayout = () => { if (C.currentView !== 'layout') { C.setView('layout'); } const L = C.views.lay.cur(); if (!L) throw new Error('Önce bir düzen oluşturun (DUZEN YENI).'); return L; };
  C.addCommand(['LAYOUT', 'DUZEN', 'DÜZEN'], 'Düzen (kağıt alanı): DUZEN YENI [A1] [Y/D] | SIL | AD yeniad | LISTE', async (I) => {
    const op = await I.kw('Seçenek', [['YENI', 'Yeni', 'NEW'], ['SIL', 'Sil', 'DELETE'], ['AD', 'Yeniden adlandır', 'RENAME'], ['LISTE', 'Liste']], 'YENI');
    if (op === 'YENI') {
      const size = await I.kw('Kağıt', [['A0'], ['A1'], ['A2'], ['A3'], ['A4']], 'A1');
      const or = await I.kw('Yön', [['Y', 'Yatay'], ['D', 'Dikey']], 'Y');
      const L = C.newLayout(null, size, or === 'D' ? 'P' : 'L'); C.layoutIdx = C.doc.layouts.length - 1;
      C.setView('layout'); C.views.lay.zoomExtents(); C.log(`${L.name} oluşturuldu: ${size}, görünüm penceresi 1/${L.vps[0].scale}.`);
    } else if (op === 'LISTE') { (C.doc.layouts || []).forEach((L, i) => C.log(`${i + 1}. ${L.name} ${L.size} ${L.orient === 'P' ? 'dikey' : 'yatay'} — ${L.vps.map(v => '1/' + v.scale).join(', ')}`)); }
    else { const L = needLayout(); if (op === 'SIL') { C.doc.layouts.splice(C.doc.layouts.indexOf(L), 1); C.layoutIdx = 0; } else { const n = await I.str('Yeni ad', L.name); if (n) L.name = n; } }
    C.changed(); C.emit('layouts');
  });
  C.addCommand(['MVIEW', 'MV', 'GPENCERE', 'GORUNUMPENCERESI'], 'Düzende ölçekli görünüm penceresi: MVIEW köşe köşe ölçek', async (I) => {
    const L = needLayout();
    const a = await I.pt('Görünüm penceresi ilk köşe (kağıt mm)'); if (!a || typeof a === 'string') return;
    C.cmd.base = a; C.cmd.rubber = false; C.cmd.preview = c => [C.prim.P([a, [c[0], a[1]], c, [a[0], c[1]]], true)];
    const b = await I.pt('Karşı köşe'); if (!b || typeof b === 'string') return; C.cmd.preview = null;
    const vp = { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]), cx: C.views.plan.cx, cy: C.views.plan.cy, scale: C.doc.set.anno };
    if (vp.w < 5 || vp.h < 5) { C.warn('Pencere çok küçük'); return; }
    vp.scale = await I.num('Ölçek 1:', vp.scale) || vp.scale;
    L.vps.push(vp); C.layoutSel = vp; C.changed(); C.emit('layouts');
    C.log('Görünüm penceresi eklendi. Ctrl + sürükle ile içini kaydırabilir, Özellikler penceresinden ölçek ve merkezi değiştirebilirsiniz.');
  });
  /* ---------- Sayfa düzeni (AutoCAD Page Setup) ---------- */
  C.pageSetup = (L) => new Promise(res => {
    const { w, h } = C.paperSize(L), m = L.margin || {}, v = (k, d) => m[k] != null ? m[k] : d;
    const sizes = Object.keys(C.PAPER).concat(['OZEL']);
    const b = C.modal('Sayfa düzeni — ' + L.name, `
      <div class="fld"><label>Kağıt</label><select id="psSize">${sizes.map(z => `<option value="${z}" ${z === (L.size || 'A1') ? 'selected' : ''}>${z === 'OZEL' ? 'Özel boyut' : z + ' (' + C.PAPER[z].join('×') + ')'}</option>`).join('')}</select></div>
      <div class="fld" id="psCustom"><label>Genişlik × yükseklik (mm)</label><span style="display:flex;gap:4px"><input id="psW" type="text" inputmode="decimal" style="width:70px" value="${L.pw || w}"> × <input id="psH" type="text" inputmode="decimal" style="width:70px" value="${L.ph || h}"></span></div>
      <div class="fld"><label>Yön</label><select id="psOr"><option value="L" ${L.orient !== 'P' ? 'selected' : ''}>Yatay</option><option value="P" ${L.orient === 'P' ? 'selected' : ''}>Dikey</option></select></div>
      <div class="fld"><label>Kenar boşlukları (mm) sol / sağ / üst / alt</label><span style="display:flex;gap:4px">${[['l', 20], ['r', 10], ['t', 10], ['b', 10]].map(([k, d]) => `<input data-m="${k}" type="text" inputmode="decimal" style="width:44px" value="${v(k, d)}">`).join('')}</span></div>
      <div class="fld"><label>Antet</label><input type="checkbox" id="psTitle" ${L.noTitle ? '' : 'checked'}></div>
      <div class="fld"><label>Pencereleri yeni çerçeveye uydur</label><input type="checkbox" id="psFit" checked></div>
      <p class="hint">Pencereler uydurulunca ölçekleri değişmez; çerçeve büyürse daha geniş alan görünür. Tek tek pencere boyutu: pencereyi seçip köşe/kenar tutamaçlarını sürükleyin, ortadaki yuvarlak tutamaçla taşıyın.</p>
      <div class="bar" style="justify-content:flex-end"><button id="psCancel">İptal</button><button id="psOk" class="pri">Uygula</button></div>`);
    const upd = () => { b.querySelector('#psCustom').style.display = b.querySelector('#psSize').value === 'OZEL' ? '' : 'none'; }; b.querySelector('#psSize').onchange = upd; upd();
    let done = false; const end = r => { if (done) return; done = true; clearInterval(tm); C.closeModal(); res(r); };
    const num = (x, d) => { const n = parseFloat(String(x).replace(',', '.')); return isFinite(n) ? n : d; };
    b.querySelector('#psOk').onclick = () => {
      C.undoStack.push(C.snapshot());
      const fr0 = C.layoutFrame(L);
      L.size = b.querySelector('#psSize').value; L.orient = b.querySelector('#psOr').value;
      if (L.size === 'OZEL') { let pw = Math.max(50, num(b.querySelector('#psW').value, 841)), ph = Math.max(50, num(b.querySelector('#psH').value, 594)); if (L.orient === 'P' && pw > ph || L.orient !== 'P' && pw < ph) [pw, ph] = [ph, pw]; L.pw = Math.max(pw, ph); L.ph = Math.min(pw, ph); } else { delete L.pw; delete L.ph; }
      const mg = {}; b.querySelectorAll('[data-m]').forEach(i => mg[i.dataset.m] = Math.max(0, num(i.value, 10))); L.margin = mg;
      L.noTitle = !b.querySelector('#psTitle').checked;
      if (b.querySelector('#psFit').checked) {
        const fr1 = C.layoutFrame(L), sx = (fr1.x1 - fr1.x0) / (fr0.x1 - fr0.x0), sy = (fr1.y1 - fr1.tbTop) / Math.max(1, fr0.y1 - fr0.tbTop);
        for (const vp of L.vps) { const ocx = vp.x + vp.w / 2, ocy = vp.y + vp.h / 2; vp.x = fr1.x0 + (vp.x - fr0.x0) * sx; vp.y = fr1.tbTop + (vp.y - fr0.tbTop) * sy; vp.w *= sx; vp.h *= sy; if (vp.clip) vp.clip = vp.clip.map(q => [q[0] * sx, q[1] * sy]); }
      }
      C.changed(); C.emit('layouts'); if (C.views && C.views.lay) C.views.lay.zoomExtents(); const ps = C.paperSize(L); C.log(`Sayfa: ${L.size === 'OZEL' ? 'özel' : L.size} ${ps.w}×${ps.h} mm ${L.orient === 'P' ? 'dikey' : 'yatay'}${L.noTitle ? ', antetsiz' : ''}.`); end(true);
    };
    b.querySelector('#psCancel').onclick = () => end(false);
    const tm = setInterval(() => { if (document.querySelector('#modal').classList.contains('hidden')) end(false); }, 300);
  });
  C.addCommand(['PAGESETUP', 'SAYFADUZENI', 'SAYFA'], 'Sayfa düzeni: kağıt boyutu (A0–A4 ya da özel mm), yön, kenar boşlukları, antet; pencereleri yeni çerçeveye uydurur', async () => {
    if (C.currentView !== 'layout') C.setView('layout'); const L = C.views.lay.cur(); if (!L) return; await C.pageSetup(L);
  }, { noUndo: true });
  C.printLayout = async function (I, svgOnly) {
    const L = needLayout();
    const mode = await I.kw('Renk', [['S', 'Siyah-beyaz'], ['R', 'Renkli']], 'S');
    const { svg, w, h } = C.layoutSvg(L, { mono: mode === 'S' });
    if (svgOnly) { C.download(svg, C.ascii(C.doc.set.name + '_' + L.name).replace(/\W+/g, '_') + '.svg', 'image/svg+xml'); return; }
    const win = window.open('', '_blank'); if (!win) { C.warn('Açılır pencere engellendi.'); return; }
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${xml(C.doc.set.name)} - ${xml(L.name)}</title><style>@page{size:${w}mm ${h}mm;margin:0}html,body{margin:0;background:#888}svg{display:block;background:#fff;margin:0 auto}@media print{body{background:#fff}}</style></head><body>${svg}<script>setTimeout(()=>print(),400)<\/script></body></html>`);
    win.document.close();
    C.log(`${L.name} (${L.size}) yazdırma penceresinde. "PDF olarak kaydet" seçip kağıt boyutunu ${L.size}, kenar boşluğunu "Yok" yapın.`);
  };
  C.addCommand(['ANTET', 'TITLEBLOCK'], 'Kendi antetiniz: ANTET YUKLE (DXF/DWG, mm, 1:1) | VARSAYILAN | SABITLE (yeni çizimlerde de kullan) | KALDIR', async (I) => {
    const op = await I.kw('Seçenek', [['YUKLE', 'Yükle', 'LOAD'], ['SABITLE', 'Tüm çizimlerde kullan'], ['VARSAYILAN', 'Varsayılan antete dön'], ['KALDIR', 'Sabit anteti kaldır']], 'YUKLE');
    if (op === 'YUKLE') {
      const f = await C.pickFile('.dxf,.dwg'); if (!f) return;
      let text; const nm = f.name.toLowerCase();
      if (nm.endsWith('.dwg')) text = C.dxfDecode(await C.dwg.toDxf(new Uint8Array(await f.arrayBuffer()))); else text = C.dxfDecode(new Uint8Array(await f.arrayBuffer()));
      const r = C.dxfImport(text, { noParam: true });
      let ents = r.ents.filter(e => ['line', 'pline', 'circle', 'arc', 'text', 'solid', 'point'].includes(e.type));
      if (!ents.length) { C.warn('Dosyada antet çizgisi bulunamadı.'); return; }
      let bb = C.extents(ents.map(e => Object.assign({ layer: '0' }, e)));
      if ((bb[2] - bb[0]) < 3) { const X = C.xScale([0, 0, 0], 1000); ents.forEach(e => C.xform(e, X)); bb = C.extents(ents.map(e => Object.assign({ layer: '0' }, e))); }
      else if (r.insUnits === 5 && (bb[2] - bb[0]) < 40) { const X = C.xScale([0, 0, 0], 10); ents.forEach(e => C.xform(e, X)); bb = C.extents(ents.map(e => Object.assign({ layer: '0' }, e))); }
      ents = ents.map(e => { const o = C.cleanEnt(e); o.layer = '0'; if (o.color === 256) o.color = 7; return o; });
      const full = (bb[2] - bb[0]) > 250;
      C.doc.set.titleBlock = { ents, bb, full, name: f.name };
      C.log(`Antet yüklendi: ${f.name} (${M.fmt(bb[2] - bb[0], 0)}×${M.fmt(bb[3] - bb[1], 0)} mm, ${full ? 'tam pafta çerçevesi — kağıda sığdırılır' : 'sağ alt köşeye yerleşir'}). Yazılarda {PROJE} {BASLIK} {CIZEN} {KONTROL} {ONAY} {TARIH} {OLCEK} {NO} {REV} {FIRMA} alanları otomatik doldurulur.`);
    } else if (op === 'SABITLE') { const tb = C.doc.set.titleBlock; if (!tb) { C.warn('Önce ANTET YUKLE ile antet yükleyin.'); return; } localStorage.setItem('aritmacad.titleblock', JSON.stringify(tb)); C.defaultTitleBlock = tb; C.log('Bu antet artık tüm yeni çizimlerde kullanılacak.'); }
    else if (op === 'VARSAYILAN') { C.doc.set.titleBlock = null; C.defaultTitleBlock = null; C.log('Bu çizimde varsayılan antet kullanılıyor.'); }
    else { localStorage.removeItem('aritmacad.titleblock'); C.defaultTitleBlock = null; C.log('Sabit antet kaldırıldı.'); }
    C.changed(); C.emit('layouts');
  });
  C.addCommand(['PAFTALA', 'SHEETSET', 'OTOPAFTA'], 'Paftalama: model alanını seçin, kağıt ve ölçeğe göre otomatik paftalara (düzenlere) bölünür. PAFTALA köşe köşe A1 Y 500', async (I) => {
    if (C.currentView === 'layout') C.setView('plan');
    const a = await I.pt('Paftalanacak alanın ilk köşesi'); if (!a || typeof a === 'string') return;
    C.cmd.base = a; C.cmd.rubber = false; C.cmd.preview = c => [C.prim.P([a, [c[0], a[1]], c, [a[0], c[1]]], true)];
    const b = await I.pt('Karşı köşe'); if (!b || typeof b === 'string') return; C.cmd.preview = null;
    const size = await I.kw('Kağıt', [['A0'], ['A1'], ['A2'], ['A3'], ['A4']], 'A1');
    const or = await I.kw('Yön', [['Y', 'Yatay'], ['D', 'Dikey']], 'Y');
    const tmp = { size, orient: or === 'D' ? 'P' : 'L', vps: [] }, fr = C.layoutFrame(tmp);
    const vw = fr.x1 - fr.x0 - 10, vh = fr.y1 - fr.tbTop - 10;
    const one = C.fitScale([Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])], vw, vh);
    const cnt = sc => { const kk = 1000 / sc; return Math.max(1, Math.ceil((Math.abs(b[0] - a[0]) - vw / kk) / (vw / kk * 0.95)) + 1) * Math.max(1, Math.ceil((Math.abs(b[1] - a[1]) - vh / kk) / (vh / kk * 0.95)) + 1); };
    C.log('Ölçeğe göre pafta sayısı: ' + C.STD_SCALES.filter(s => s >= 20 && s <= 2000 && cnt(s) <= 60).map(s => `1/${s} → ${cnt(s)}`).join(' · '));
    const scale = await I.num(`Ölçek 1: (tek paftaya sığan 1/${one})`, C.STD_SCALES.includes(C.doc.set.anno) && cnt(C.doc.set.anno) <= 60 ? C.doc.set.anno : one) || one;
    const ov = await I.num('Bindirme (%)', 5) || 0;
    const k = 1000 / scale;
    const tw = vw / k, th = vh / k, sw = tw * (1 - ov / 100), sh = th * (1 - ov / 100);
    const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]), W = Math.abs(b[0] - a[0]), H = Math.abs(b[1] - a[1]);
    const nx = Math.max(1, Math.ceil((W - tw) / sw) + 1), ny = Math.max(1, Math.ceil((H - th) / sh) + 1);
    if (nx * ny > 60) { C.warn(`${nx * ny} pafta çıkıyor; ölçeği büyütün ya da daha büyük kağıt seçin.`); return; }
    const proje = await I.str('Proje adı', (C.doc.layouts[0] && C.doc.layouts[0].f.proje) || C.doc.set.name);
    const lay = C.std('PAFTA'); C.ensureLayer('PAFTA_INDEKS', 6, 'DASHED', 25);
    const total = nx * ny; let n = 0;
    const offX = (nx - 1) * sw + tw - W, offY = (ny - 1) * sh + th - H;
    for (let j = ny - 1; j >= 0; j--) for (let i = 0; i < nx; i++) {
      n++;
      const cx = x0 - offX / 2 + i * sw + tw / 2, cy = y0 - offY / 2 + j * sh + th / 2;
      const L = { name: `Pafta ${String(n).padStart(2, '0')}`, size, orient: tmp.orient, f: { proje, baslik: `PAFTA ${n} / ${total}`, cizen: C.userName || '', no: String(n).padStart(2, '0') }, vps: [{ x: fr.x0 + 5, y: fr.tbTop + 5, w: vw, h: vh, cx, cy, scale }] };
      C.doc.layouts.push(L);
      const r = [[cx - tw / 2, cy - th / 2, 0], [cx + tw / 2, cy - th / 2, 0], [cx + tw / 2, cy + th / 2, 0], [cx - tw / 2, cy + th / 2, 0]];
      C.add(C.newEnt('pline', { pts: r, closed: true, layer: 'PAFTA_INDEKS' }));
      C.add(C.newEnt('text', { p: [cx, cy, 0], h: C.annoH(8), s: L.name, rot: 0, al: 'M', layer: 'PAFTA_INDEKS' }));
    }
    C.layoutIdx = C.doc.layouts.length - total;
    if (scale !== C.doc.set.anno) C.log(`İpucu: yazı ve ölçülerin bu paftalarda doğru boyda çıkması için durum çubuğundan açıklama ölçeğini 1/${scale} yapın (pencere özelliklerinde "Ölçeği geçerli yap").`);
    C.log(`${total} pafta oluşturuldu (${nx}×${ny}, ${size}, 1/${scale}). Pafta sınırları modelde PAFTA_INDEKS katmanında. Düzen sekmesinden her paftayı görüp yazdırabilirsiniz.`);
    C.emit('layouts'); C.setView('layout'); C.views.lay.zoomExtents();
  });
  C.addCommand(['PRINTALL', 'TUMUNUYAZDIR', 'PAFTALARIYAZDIR'], 'Tüm düzenleri tek yazdırma işinde (çok sayfalı PDF) yazdırır', async (I) => {
    const ls = C.doc.layouts || []; if (!ls.length) { C.warn('Düzen yok.'); return; }
    const mode = await I.kw('Renk', [['S', 'Siyah-beyaz'], ['R', 'Renkli']], 'S');
    const pages = ls.map(L => C.layoutSvg(L, { mono: mode === 'S' }));
    const { w, h } = pages[0];
    const win = window.open('', '_blank'); if (!win) { C.warn('Açılır pencere engellendi.'); return; }
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${xml(C.doc.set.name)} - paftalar</title><style>@page{size:${w}mm ${h}mm;margin:0}html,body{margin:0;background:#888}svg{display:block;background:#fff;margin:0 auto 10px;page-break-after:always}@media print{body{background:#fff}svg{margin:0}}</style></head><body>${pages.map(p => p.svg).join('\n')}<script>setTimeout(()=>print(),500)<\/script></body></html>`);
    win.document.close(); C.log(`${pages.length} pafta yazdırma penceresinde (tüm paftalar ${ls[0].size} kabul edildi).`);
  }, { noUndo: true });
  C.addCommand(['LAYOUTPRINT', 'DUZENYAZDIR'], 'Geçerli düzeni yazdırır / PDF', I => C.printLayout(I, false), { noUndo: true });
  C.addCommand(['LAYOUTSVG', 'DUZENSVG'], 'Geçerli düzeni SVG indirir', I => C.printLayout(I, true), { noUndo: true });
})(window.C);

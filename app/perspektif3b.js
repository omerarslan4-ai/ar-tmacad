/* ArıtmaCAD — PAFTADA 3B GÖRÜNÜŞ (perspektif / izometrik)
   PERSPEKTIFPAFTA (3BPAFTA): disiplin paftalarına modelin 3B görüntüsünü koyar.
     Tip RENKLI : 3B görüntünün resmi (gölgeli, renkli). Statik'te beton röntgen + donatı, Mekanik'te ekipman öne çıkar.
     Tip VEKTOR : gizli çizgileri ayıklanmış çizgisel izometrik (GORUNUS motoru), disiplin şablonuyla renklenir.
   Model değişince paftadaki 3B görünüşler kendiliğinden yenilenir (pafta açıkken / yazdırmadan önce).
   3BPAFTAGUNCELLE: hepsini hemen yeniler. Diğer modüllere dokunmaz; yalnız sarmalayıcı ekler. */
(function (C) {
  'use strict';
  if (typeof document === 'undefined') return;
  const D = Math.PI / 180;
  const DIS = { MIMARI: 'Mimari', STATIK: 'Statik', MEKANIK: 'Mekanik', ELEKTRIK: 'Elektrik' };
  const YON = { GD: -45, GB: -135, KD: 45, KB: 135 }, YON_AD = { GD: 'Güneydoğu', GB: 'Güneybatı', KD: 'Kuzeydoğu', KB: 'Kuzeybatı' };
  const isoP = Math.atan(1 / Math.SQRT2) / D; // 35.26°

  /* ---------------- ekran dışı 3B çizici ---------------- */
  let V = null;
  const ciziciAl = () => {
    if (V) return V;
    const box = document.createElement('div'); box.style.cssText = 'display:none;position:fixed;left:-99999px;top:0';
    const cv = document.createElement('canvas'); box.appendChild(cv); document.body.appendChild(box);
    V = new C.View3D(cv); if (V.failed) { V = null; throw new Error('WebGL yok: renkli 3B görüntü üretilemiyor (VEKTOR tipini kullanın).'); }
    return V;
  };
  const t3Temizle = () => { for (const e of C.doc.ents) if (e._c) delete e._c.t3; };
  const kirp = (src, W, H) => { // beyaz kenarları kırp
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0, W, H);
    const d = x.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let j = 0; j < H; j += 2) for (let i = 0; i < W; i += 2) { const k = (j * W + i) * 4; if (d[k] < 246 || d[k + 1] < 246 || d[k + 2] < 246) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; } }
    if (x1 < 0) return null;
    const p = Math.round(Math.max(W, H) * 0.015); x0 = Math.max(0, x0 - p); y0 = Math.max(0, y0 - p); x1 = Math.min(W - 1, x1 + p); y1 = Math.min(H - 1, y1 + p);
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; const ox = o.getContext('2d'); ox.fillStyle = '#fff'; ox.fillRect(0, 0, o.width, o.height); ox.drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    return { src: o.toDataURL('image/jpeg', 0.95), iw: o.width, ih: o.height };
  };
  /* görünüşe girecek nesneler: yalnız 3B gövdesi olanlar (2B çizgiler, pafta çizimleri, kesit / görünüş grupları, arazi hariç) */
  const govdeler = g => {
    const ids = g.ids && g.ids.length ? new Set(g.ids) : null;
    return C.doc.ents.filter(e => {
      if (!C.layer(e.layer).on || e.gv || e.type === 'sheet' || e.type === 'arazi' || e.type === 'kazi' || !C.in3D(e)) return false;
      if (C.dis3bAlfa && !(C.dis3bAlfa(e) > 0)) return false;
      if (ids && !ids.has(e.id) && e.type !== 'donati3') return false;
      const t = C.entTris(e); return !!(t && t.pos.length);
    });
  };
  const kutu3 = ents => { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (const e of ents) { const p = C.entTris(e).pos; for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { const v = p[i + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v; } } return mn[0] === Infinity ? null : { mn, mx }; };
  const izdus = (b, yaw, pitch) => { // görüntü düzlemine izdüşüm genişliği / yüksekliği (m)
    const d = [Math.cos(pitch) * Math.cos(yaw), Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch)], r = [-Math.sin(yaw), Math.cos(yaw), 0], u = [r[1] * d[2] - r[2] * d[1], r[2] * d[0] - r[0] * d[2], r[0] * d[1] - r[1] * d[0]];
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const x of [b.mn[0], b.mx[0]]) for (const y of [b.mn[1], b.mx[1]]) for (const z of [b.mn[2], b.mx[2]]) { const pr = x * r[0] + y * r[1], pu = x * u[0] + y * u[1] + z * u[2]; a0 = Math.min(a0, pr); a1 = Math.max(a1, pr); b0 = Math.min(b0, pu); b1 = Math.max(b1, pu); }
    return [a1 - a0, b1 - b0];
  };
  const STD = () => C.STD_SCALES || [1, 2, 5, 10, 20, 25, 50, 75, 100, 125, 200, 250, 500, 1000, 2000, 5000];
  C.render3B = (g, wmm, hmm) => {
    const v = ciziciAl(), st = C.state, sv = { dis3b: st.dis3b, v3bg: st.v3bg, v3grid: st.v3grid, v3alpha: st.v3alpha }, all = C.doc.ents;
    Object.assign(st, { dis3b: g.mod, v3bg: 'beyaz', v3grid: false, v3alpha: 0 });
    // beyaz kağıtta saydam beton çok silik kalır: saydamlığı biraz azalt (yalnız bu çizimde)
    const MD = C.DISIPLIN3B && C.DISIPLIN3B[g.mod], md0 = MD ? Object.assign({}, MD) : null;
    if (MD) for (const k in MD) if (typeof MD[k] === 'number' && MD[k] > 0 && MD[k] < 1) MD[k] = Math.min(0.85, MD[k] + (1 - MD[k]) * 0.3);
    t3Temizle();
    try {
      const ents = govdeler(g), b = kutu3(ents); if (!b) return null;
      const kam = g.kam, yaw = kam ? kam.yaw : (YON[g.yon] || -45) * D, pitch = kam ? kam.pitch : (g.tip === 'IZOMETRIK' ? isoP : 28) * D, tn = Math.tan(22.5 * D);
      let [wP, hP] = izdus(b, yaw, pitch); if (kam && g.tip === 'IZOMETRIK') { hP = 2 * kam.dist * tn; wP = hP * kam.asp; } // ekrandaki çerçeve aynen
      const MAXP = Math.min(4096, (() => { try { const m = v.gl.getParameter(v.gl.MAX_VIEWPORT_DIMS); return Math.min(m[0], m[1]); } catch (er) { return 4096; } })());
      let W, H, dpmm = 220 / 25.4, olc = null; // 220 dpi: keskin, kenar çizgileri baskıda görünür kalınlıkta
      if (g.tip === 'IZOMETRIK') { // ölçekli: kağıtta 1 mm = olc/1000 m
        olc = g.olcek || STD().find(q => q >= Math.max(wP * 1000 / (wmm * 0.95), hP * 1000 / (hmm * 0.95))) || 1000;
        let ppm = 1000 / olc * dpmm; W = Math.ceil(wP * ppm * (kam ? 1 : 1.08)) + (kam ? 0 : 24); H = Math.ceil(hP * ppm * (kam ? 1 : 1.08)) + (kam ? 0 : 24);
        const f = Math.min(1, MAXP / Math.max(W, H)); if (f < 1) { dpmm *= f; ppm *= f; W = Math.ceil(W * f); H = Math.ceil(H * f); }
        g._ppm = ppm;
      } else { const k = Math.min(1, MAXP / Math.max(wmm * dpmm, hmm * dpmm)); W = Math.max(200, Math.round(wmm * dpmm * k)); H = Math.max(150, Math.round(hmm * dpmm * k)); }
      C.doc.ents = ents; v.build(); C.doc.ents = all;
      v.cv.width = W; v.cv.height = H; v.W = W; v.H = H; v.cursor = null; v.clip = null;
      v.persp = g.tip !== 'IZOMETRIK'; v.yaw = yaw; v.pitch = pitch;
      const o = v.origin || [0, 0, 0]; v.t = kam ? [kam.t[0] - o[0], kam.t[1] - o[1], kam.t[2]] : [(b.mn[0] + b.mx[0]) / 2 - o[0], (b.mn[1] + b.mx[1]) / 2 - o[1], (b.mn[2] + b.mx[2]) / 2];
      const diag = Math.hypot(b.mx[0] - b.mn[0], b.mx[1] - b.mn[1], b.mx[2] - b.mn[2]);
      if (kam && v.persp) v.dist = kam.dist;
      else if (v.persp) v.dist = Math.max(hP, wP * H / W) / (2 * tn) * 1.08 + diag / 2;
      else v.dist = (H / (2 * g._ppm)) / tn; // orto: görüntü yarı yüksekliği = dist·tan(22.5°)
      v.draw();
      const r = kirp(v.cv, W, H); if (!r) return null;
      return Object.assign(r, { dpmm: olc ? dpmm : null, olcekG: olc });
    } finally {
      C.doc.ents = all; Object.assign(st, sv); if (MD && md0) Object.assign(MD, md0); t3Temizle(); delete g._ppm;
      const v3 = C.views && C.views.v3; if (v3) { v3.needBuild = true; v3.dirty = true; }
    }
  };

  /* ---------------- vektör (çizgisel) 3B görünüş ---------------- */
  const vektorUret = (g) => {
    const st = C.state, s0 = st.dis3b; st.dis3b = g.mod;
    let ents; try { ents = govdeler(g).filter(e => e.type !== 'donati3'); } finally { st.dis3b = s0; }
    C.remove(C.doc.ents.filter(e => e.gv === g.gv));
    const bb = C.extents(C.doc.ents.filter(e => !e.gv)) || [0, 0, 10, 10], gb = C.extents(C.doc.ents.filter(e => e.gv)) || bb;
    const res = C.makeView({ kind: 'view', dir: g.yon, ents, hatch: 'YOK', gv: g.gv, place: g.yer || [Math.max(bb[2], gb[2]) + 20, bb[1]] });
    if (!res) return null;
    const vb = C.extents(C.doc.ents.filter(e => e.gv === g.gv)); if (vb && !g.yer) g.yer = [vb[0], vb[1]];
    return vb;
  };
  /* vektör görünüşler Tasarım planında gizli (yalnız paftada) */
  {
    const P2 = C.View2D && C.View2D.prototype, gizli = e => typeof e.gv === 'string' && e.gv.indexOf('G3B_') === 0;
    if (P2) for (const k of ['draw', 'pick', 'windowSel', 'snap', 'zoomExtents']) { const f0 = P2[k]; if (f0) P2[k] = function () { if (this.isLayout || C.vpEdit || C.state.gorunusModel) return f0.apply(this, arguments); const all = C.doc.ents; if (!all.some(gizli)) return f0.apply(this, arguments); C.doc.ents = all.filter(e => !gizli(e)); try { return f0.apply(this, arguments); } finally { C.doc.ents = all; } }; }
  }

  /* ---------------- model imzası (değişti mi?) ---------------- */
  const imza = () => { let h = 0, n = 0; const rep = (k, v) => (k[0] === '_' || k === 'no' ? undefined : v); for (const e of C.doc.ents) { if (e.gv || e.type === 'sheet') continue; const s = JSON.stringify(e, rep); n++; for (let i = 0; i < s.length; i += 3) h = (h * 31 + s.charCodeAt(i)) | 0; } return n + ':' + h; };
  const g3Ler = () => { const o = []; for (const L of C.doc.layouts || []) for (const vp of L.vps) if (vp.g3) o.push([L, vp]); return o; };
  const vpGuncelle = (vp, sig) => {
    const g = vp.g3;
    if (g.tip === 'VEKTOR') {
      const vb = vektorUret(g); if (!vb) return false;
      const k = Math.max((vb[2] - vb[0]) * 1000 / (vp.w * 0.92), (vb[3] - vb[1]) * 1000 / (vp.h * 0.92));
      Object.assign(vp, { cx: (vb[0] + vb[2]) / 2, cy: (vb[1] + vb[3]) / 2, scale: g.olcek || STD().find(q => q >= k) || Math.max(1, Math.ceil(k)), gvOnly: g.gv });
    } else { const r = C.render3B(g, vp.w, vp.h); if (!r) return false; Object.assign(g, r); if (r.olcekG) { Object.assign(vp, { scale: r.olcekG, cx: 0, cy: 0 }); if (vp._yeni) { vp.w = Math.max(vp.w * 0.5, r.iw / r.dpmm + 6); vp.h = Math.max(40, r.ih / r.dpmm + 6); } } delete vp._yeni; }
    g.sig = sig || imza(); return true;
  };
  C.g3Guncelle = (zorla) => { const sig = imza(); let n = 0; for (const [, vp] of g3Ler()) if (zorla || vp.g3.sig !== sig) { try { if (vpGuncelle(vp, sig)) n++; } catch (er) { console.error('3B pafta', er); } } if (n && C.views && C.views.lay) C.views.lay.dirty = true; return n; };

  /* ---------------- paftada çizim: resim primi ---------------- */
  const IMGS = new Map();
  const resim = src => { let im = IMGS.get(src); if (!im) { if (IMGS.size > 30) IMGS.clear(); im = new Image(); im.onload = () => { if (C.views && C.views.lay) C.views.lay.dirty = true; }; im.src = src; IMGS.set(src, im); } return im; };
  const STUB = { layer: '0', color: 7, lt: 'CONTINUOUS', lw: -1 };
  const imgRect = vp => { const g = vp.g3; if (g.dpmm) { const w = g.iw / g.dpmm * vp.scale / 1000, h = g.ih / g.dpmm * vp.scale / 1000; return [vp.cx - w / 2, vp.cy - h / 2, vp.cx + w / 2, vp.cy + h / 2]; } const k = 1000 / vp.scale, W = vp.w / k, H = vp.h / k, a = g.iw / g.ih; let w = W, h = W / a; if (h > H) { h = H; w = H * a; } return [vp.cx - w / 2, vp.cy - h / 2, vp.cx + w / 2, vp.cy + h / 2]; };
  {
    const v0 = C.vpPrims;
    C.vpPrims = function (vp, cb) {
      if (!vp || !vp.g3 || vp.g3.tip === 'VEKTOR') return v0.apply(this, arguments);
      if (!vp.g3.src) return; const r = imgRect(vp);
      cb(STUB, [{ k: 'IMG', a: [r[0], r[1], 0], b: [r[2], r[3], 0], src: vp.g3.src }]);
    };
    const P2 = C.View2D.prototype, d0 = P2.drawPrims;
    P2.drawPrims = function (prims, style, ent) {
      if (!prims.some(p => p.k === 'IMG')) return d0.apply(this, arguments);
      for (const p of prims) {
        if (p.k !== 'IMG') { d0.call(this, [p], style, ent); continue; }
        if (this.flushB) try { this.flushB(); } catch (er) { }
        const im = resim(p.src); if (!im.complete || !im.naturalWidth) continue;
        const q0 = this.w2s([p.a[0], p.b[1]]), q1 = this.w2s([p.b[0], p.a[1]]);
        this.ctx.imageSmoothingEnabled = true; this.ctx.imageSmoothingQuality = 'high'; this.ctx.drawImage(im, q0[0], q0[1], q1[0] - q0[0], q1[1] - q0[1]);
      }
      if (C.currentView === 'layout') zamanla();
    };
    const s0 = C.primsSvg;
    C.primsSvg = function (out, prims, e, P) {
      if (!prims.some(p => p.k === 'IMG')) return s0.apply(this, arguments);
      for (const p of prims) { if (p.k !== 'IMG') { s0.call(this, out, [p], ...[].slice.call(arguments, 2)); continue; } const a = P([p.a[0], p.b[1]]), b = P([p.b[0], p.a[1]]); out.push(`<image href="${p.src}" x="${a[0].toFixed(3)}" y="${a[1].toFixed(3)}" width="${(b[0] - a[0]).toFixed(3)}" height="${(b[1] - a[1]).toFixed(3)}" preserveAspectRatio="none"/>`); }
    };
    const l0 = C.layoutSvg; C.layoutSvg = function () { try { C.g3Guncelle(false); } catch (er) { } return l0.apply(this, arguments); };
  }
  /* başlık: "3B GÖRÜNÜŞ — …" / ÖLÇEKSİZ */
  if (C.vpLabelPrims) {
    const lb0 = C.vpLabelPrims, TX = C.prim.TX, L = C.prim.L;
    C.vpLabelPrims = Lay => {
      const g3 = Lay.vps.filter(v => v.g3 && v.g3.tip === 'PERSPEKTIF'), sv = g3.map(v => v.label); g3.forEach(v => { v.label = null; });
      let out; try { out = lb0(Lay); } finally { g3.forEach((v, i) => { v.label = sv[i]; }); }
      for (const vp of g3) { if (!vp.label) continue; const x = vp.x + vp.w / 2, y = vp.y - 7, w1 = C.measureText ? C.measureText(vp.label, 5) : vp.label.length * 4; out.push(TX([x, y, 0], 5, vp.label, 0, 'BC'), TX([x, y - 4.5, 0], 3, 'ÖLÇEKSİZ', 0, 'TC'), L([x - w1 / 2 - 2, y - 1.2, 0], [x + w1 / 2 + 2, y - 1.2, 0], { lw: 50 })); }
      return out;
    };
  }

  /* model değişince: pafta görünüyorsa kısa bir bekleme sonra yenile */
  let tmr = null;
  const zamanla = () => { if (tmr) return; tmr = setTimeout(() => { tmr = null; if (C.currentView !== 'layout' || (C.cmd && C.cmd.running)) return; const L = C.views.lay && C.views.lay.cur(); if (!L || !L.vps.some(v => v.g3)) return; const sig = imza(); let n = 0; for (const vp of L.vps) if (vp.g3 && vp.g3.sig !== sig) { try { if (vpGuncelle(vp, sig)) n++; } catch (er) { console.error(er); } } if (n) { C.views.lay.dirty = true; C.log(`Paftadaki ${n} 3B görünüş modele göre yenilendi.`); } }, 900); };

  /* ---------------- yerleştirme ---------------- */
  const yerBul = (L, w, h) => {
    const fr = C.layoutFrame(L), x0 = fr.x0 + 5, x1 = fr.x1 - 5, y0 = fr.tbTop + 5, y1 = fr.y1 - 5;
    const dolu = (x, y) => L.vps.some(v => !(x + w + 6 < v.x || x > v.x + v.w + 6 || y + h + 14 < v.y || y > v.y + v.h + 14));
    for (let y = y1 - h; y >= y0; y -= 10) for (let x = x1 - w; x >= x0; x -= 10) if (!dolu(x, y)) return [x, y];
    return null;
  };
  const yerlestir = (grup, w, h) => {
    const lays = C.doc.layouts = C.doc.layouts || [];
    for (const X of lays) if (X.grp === grup && (X.kesitPaftasi || X.g3Paftasi)) { const q = yerBul(X, w, h); if (q) return [X, q, w, h]; }
    const n = lays.filter(X => X.grp === grup && X.g3Paftasi).length + 1, gp = C.grpCur;
    C.grpCur = grup; const L = C.newLayout(`${grup.toLocaleUpperCase('tr')} — 3B GÖRÜNÜŞ${n > 1 ? ' ' + n : ''}`, 'A3', 'L'); C.grpCur = gp;
    L.grp = grup; L.g3Paftasi = true; L.vps = []; L.f = Object.assign(L.f || {}, { baslik: `${grup.toLocaleUpperCase('tr')} 3B GÖRÜNÜŞ` });
    const fr = C.layoutFrame(L); // yeni A3 pafta: görünüş antetin üstündeki alanı doldurur
    return [L, [fr.x0 + 8, fr.tbTop + 16], fr.x1 - fr.x0 - 16, fr.y1 - fr.tbTop - 24];
  };

  const etiket = (grup, yon, tip) => { const p = [YON_AD[yon] ? YON_AD[yon].toLocaleUpperCase('tr') : null, tip === 'PERSPEKTIF' ? 'PERSPEKTİF' : 'İZOMETRİK'].filter(Boolean); return `3B GÖRÜNÜŞ — ${grup.toLocaleUpperCase('tr')} (${p.join(', ')})`; };
  const kameraAl = () => { const v = C.views && C.views.v3; if (!v || !v.W || !v.H || v.failed) return null; const o = v.origin || [0, 0, 0]; return { yaw: v.yaw, pitch: v.pitch, persp: !!v.persp, dist: v.dist, t: [v.t[0] + o[0], v.t[1] + o[1], v.t[2]], asp: v.W / v.H }; };
  const enYakinYon = yaw => { let b = 'GD', bd = 9; for (const [k, a] of Object.entries(YON)) { let d = Math.abs(((yaw / D - a) % 360 + 540) % 360 - 180); if (d < bd) { bd = d; b = k; } } return b; };
  C.addCommand(['PERSPEKTIFPAFTA', '3BPAFTA', 'PAFTA3B'], 'Paftaya modelin 3B görünüşünü koyar: disiplin (Statik = beton röntgen + donatı), yön, perspektif / izometrik, renkli resim ya da çizgisel (vektör). Model değişince kendiliğinden yenilenir.', async (I) => {
    const gc = C.currentView === 'layout' && C.views.lay.cur() ? C.up(C.views.lay.cur().grp || '') : '', dfl = /STAT/.test(gc) ? 'STATIK' : /M[İI]MAR/.test(gc) ? 'MIMARI' : /MEKAN/.test(gc) ? 'MEKANIK' : /ELEKT/.test(gc) ? 'ELEKTRIK' : 'STATIK';
    const dm = await I.kw('Disiplin', [['STATIK', 'Statik'], ['MIMARI', 'Mimari'], ['MEKANIK', 'Mekanik'], ['ELEKTRIK', 'Elektrik'], ['HEPSI', 'Dört disipline de']], dfl); if (!dm) return;
    let yon = await I.kw('Bakış', [['EKRAN', '3B ekrandaki açı (döndürüp yakınlaştırdığınız gibi)'], ['GD', 'Güneydoğu'], ['GB', 'Güneybatı'], ['KD', 'Kuzeydoğu'], ['KB', 'Kuzeybatı']], 'EKRAN'); if (!yon) return;
    let kam = null; if (yon === 'EKRAN') { kam = kameraAl(); if (!kam) { C.warn('3B ekran henüz açılmamış: önce 3B sekmesinde yapıyı istediğiniz açıya getirin. Şimdilik Güneydoğu kullanıldı.'); yon = 'GD'; } }
    let tip;
    if (kam) { const t0 = await I.kw('Görüntü', [['RENKLI', kam.persp ? 'Renkli — ekrandaki perspektif' : 'Renkli — ekrandaki izometrik (ölçekli)'], ['VEKTOR', 'Çizgisel izometrik (ölçekli, en yakın köşe yönünden)']], 'RENKLI'); if (!t0) return; tip = t0 === 'VEKTOR' ? 'VEKTOR' : kam.persp ? 'PERSPEKTIF' : 'IZOMETRIK'; if (tip === 'VEKTOR') { yon = enYakinYon(kam.yaw); kam = null; } }
    else { tip = await I.kw('Görüntü', [['IZOMETRIK', 'Renkli izometrik (ölçekli)'], ['PERSPEKTIF', 'Renkli perspektif (ölçeksiz)'], ['VEKTOR', 'Çizgisel izometrik (ölçekli)']], 'IZOMETRIK'); if (!tip) return; }
    const olcek = tip === 'PERSPEKTIF' ? 0 : Math.max(0, +(await I.num('Ölçek 1: (0 = pencereye sığdır)', 0)) || 0);
    const kap = await I.kw('Kapsam', [['T', 'Tüm 3B model'], ['N', 'Nesne seç']], 'T'); if (!kap) return;
    let ids = null;
    if (kap === 'N') { const lv = C.currentView; if (lv === 'layout') C.setView('plan'); const sl = await I.sel('Görünüşe girecek yapıyı seçin'); if (!sl || !sl.length) { if (lv === 'layout') C.setView('layout'); return; } ids = sl.map(e => e.id); if (lv === 'layout') C.setView('layout'); }
    const yer = dm === 'HEPSI' || C.currentView !== 'layout' ? 'OTO' : await I.kw('Yer', [['OTO', 'Disiplin paftasında boş yere'], ['PENCERE', 'Bu paftada köşe köşe']], 'OTO'); if (!yer) return;
    let rect = null;
    if (yer === 'PENCERE') {
      const a = await I.pt('Görünüş ilk köşe (kağıt mm)'); if (!a || typeof a === 'string') return;
      C.cmd.base = a; C.cmd.rubber = false; C.cmd.preview = c => [C.prim.P([a, [c[0], a[1]], c, [a[0], c[1]]], true)];
      const b = await I.pt('Karşı köşe'); C.cmd.preview = null; if (!b || typeof b === 'string') return;
      rect = { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]) }; if (rect.w < 20 || rect.h < 20) { C.warn('Pencere çok küçük.'); return; }
    }
    const modlar = dm === 'HEPSI' ? Object.keys(DIS) : [dm], sig = imza(); let son = null, n = 0;
    for (const m of modlar) {
      const grup = DIS[m]; let L, at, w = 280, h = 190;
      if (kam && !rect) { h = Math.min(230, Math.max(120, w / kam.asp)); w = Math.min(380, h * kam.asp); } // ekran oranı
      if (rect) { L = C.views.lay.cur(); at = [rect.x, rect.y]; w = rect.w; h = rect.h; } else[L, at, w, h] = yerlestir(grup, w, h);
      const g3 = { mod: m, yon, tip, kam, olcek: olcek || null, ids, gv: tip === 'VEKTOR' ? 'G3B_' + Date.now().toString(36) + n : null };
      const vp = { _yeni: !rect, x: at[0], y: at[1], w, h, cx: 0, cy: 0, scale: 100, lock: true, frame: { on: false }, g3, label: etiket(grup, yon, tip) };
      if (tip === 'VEKTOR') { vp.disiplin = grup; vp.label = null; } // çizgisel görünüş kendi başlığını ve ölçeğini taşır
      try { if (!vpGuncelle(vp, sig)) { C.warn(grup + ': görünecek 3B nesne yok.'); continue; } } catch (er) { C.warn(er.message); return; }
      L.vps.push(vp); son = L; n++;
    }
    if (!son) return;
    C.changed(); C.emit('layouts');
    C.layoutIdx = C.doc.layouts.indexOf(son); if (son.grp) C.grpCur = son.grp; C.setView('layout'); C.emit('layouts'); C.views.lay.zoomExtents();
    C.log(`${n} paftaya 3B görünüş eklendi (${son.name}${n > 1 ? ' …' : ''}). Model değişince pafta açıldığında kendiliğinden yenilenir; hemen yenilemek için 3BPAFTAGUNCELLE.`);
  });
  C.addCommand(['3BPAFTAACI', '3BACI', 'PAFTAACI'], 'Paftadaki 3B görünüşün açısı: önce paftada görünüşü seçin. EKRANDAN = 3B ekrandaki açıyı (döndürme, yakınlaştırma, perspektif / izometrik) bu görünüşe uygular · GOSTER = 3B ekranı bu görünüşün açısına getirir', async (I) => {
    const vp = C.layoutSel && C.layoutSel.g3 ? C.layoutSel : null;
    if (!vp) { C.warn('Önce paftada bir 3B görünüşü seçin (pencereye bir kez tıklayın).'); return; }
    const op = await I.kw('Seçenek', [['EKRANDAN', '3B ekrandaki açıyı uygula'], ['GOSTER', '3B ekranı bu açıya getir']], 'GOSTER'); if (!op) return;
    const v3 = C.views.v3, g = vp.g3;
    if (op === 'GOSTER') {
      C.setView('3d'); if (C.dis3bSec) C.dis3bSec(g.mod);
      setTimeout(() => { try { const o = v3.origin || [0, 0, 0]; if (g.kam) { Object.assign(v3, { yaw: g.kam.yaw, pitch: g.kam.pitch, persp: g.kam.persp, dist: g.kam.dist }); v3.t = [g.kam.t[0] - o[0], g.kam.t[1] - o[1], g.kam.t[2]]; } else { v3.yaw = (YON[g.yon] || -45) * D; v3.pitch = (g.tip === 'IZOMETRIK' ? isoP : 28) * D; v3.persp = g.tip !== 'IZOMETRIK'; v3.fit(); } const cb = document.querySelector('#v3persp'); if (cb) cb.checked = v3.persp; v3.dirty = true; } catch (er) { console.error(er); } }, 300);
      C._g3Duzen = vp; C.log('3B ekranı paftadaki açıya getirildi. Döndürüp yakınlaştırın (izometrik ve ölçekli için "Perspektif" kutusunu kapatın), sonra pafta sekmesine dönüp görünüşü seçin ve 3BPAFTAACI → EKRANDAN.');
      return;
    }
    if (g.tip === 'VEKTOR') { C.warn('Çizgisel görünüş yalnız dört köşe yönünden üretilir; renkli görünüşte serbest açı kullanılabilir.'); return; }
    const kam = kameraAl(); if (!kam) { C.warn('3B ekran henüz açılmamış.'); return; }
    g.kam = kam; g.tip = kam.persp ? 'PERSPEKTIF' : 'IZOMETRIK'; g.yon = 'EKRAN';
    const L = (C.doc.layouts || []).find(X => X.vps.includes(vp)); if (L) vp.label = etiket(DIS[g.mod] || 'Statik', 'EKRAN', g.tip);
    try { vpGuncelle(vp); } catch (er) { C.warn(er.message); return; }
    C.changed(); C.emit('layouts'); if (C.views.lay) C.views.lay.dirty = true; C.log('3B görünüşün açısı güncellendi' + (g.tip === 'IZOMETRIK' ? ` (izometrik, Ö: 1/${vp.scale}).` : ' (perspektif).'));
  });
  C.addCommand(['3BPAFTAGUNCELLE', 'PERSPEKTIFGUNCELLE'], 'Paftalardaki 3B görünüşleri modelden yeniden üretir', async () => { const n = C.g3Guncelle(true); C.log(n ? n + ' 3B görünüş yenilendi.' : 'Paftalarda 3B görünüş yok.'); });

  try {
    const tab = C.ribbon && C.ribbon.tabs && C.ribbon.tabs.find(t => t[0] === 'Pafta'), pn = tab && tab[1].find(p => p[0] === 'Disiplin');
    if (pn && !pn[1].some(b => b.cmd === 'PERSPEKTIFPAFTA')) { pn[1].push({ cmd: 'PERSPEKTIFPAFTA', t: '3B görünüş', i: 'found' }, { cmd: '3BPAFTAACI', t: '3B açı', i: 'found' }); C.ribbon.render(); }
  } catch (er) { console.error('perspektif3b şerit', er); }
})(window.C);

/* ArıtmaCAD — Revit benzeri görünüş üretimi
   - 3B model (katı, kutu, 3B sekmesinde çizilenler) Plan sekmesinde görünmez; üretilen kesit/plan/görünüşler 3B'de görünmez
   - KOTPLANI: verilen kottan yatay kesit planı (kesilen kısım kalın + taralı, altta kalan görünen kenarlar gizli çizgi ayıklamalı)
   - GORUNUS: ön, arka, sağ, sol, üst, izometrik (4 yön) görünüşler; gizli çizgiler ayıklanır
   - Üretilen her görünüş kendi katmanlarında, başlığı ölçekle güncellenir; GORUNUSGUNCELLE ile modelden yeniden üretilir; isteğe bağlı paftaya ölçekli yerleştirilir */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, { P } = C.prim;
  const SOLID3D = C.SOLID3D = new Set(['kati', 'box', 'cyl', 'poly3', 'grup3', 'sweep', 'face', 'pmesh']);
  const CONC = new Set(['tretuvar', 'cati', 'yalitim', 'kaplama', 'dolgu', 'perde', 'kolon', 'kiris', 'plak', 'temel', 'tank', 'ctank', 'wall', 'slab', 'kati', 'box', 'poly3', 'grup3', 'sweep', 'cyl', 'pmesh', 'face', 'anaerobik', 'onaritma', 'kumtutucu']); // anaerobik, onaritma: tek beton katı ünite yapıları
  const GEN_LAYERS = new Set(['KESIT', 'GORUNEN', 'KESIT_TARAMA']);
  if (C.state.show3dInPlan == null) { try { C.state.show3dInPlan = localStorage.getItem('aritmacad.show3dInPlan') === '1'; } catch (e) { C.state.show3dInPlan = false; } }
  C.is3DOnly = e => e.sp === '3d' || SOLID3D.has(e.type);
  C.inPlan = e => C.state.show3dInPlan || !C.is3DOnly(e);
  C.in3D = e => !e.gv && !GEN_LAYERS.has(e.layer) && !/_(KESIT|GORUNEN|TARAMA)$/.test(e.layer || '') && !/^(KESIT|GORUNEN)_/.test(e.layer || '') && !/_(KESIT|GORUNEN|TARAMA)_[A-Z0-9_]+$/.test(e.layer || '');
  /* 3B sekmesinde oluşturulanlar "3B model" olarak işaretlenir */
  { const ne0 = C.newEnt; C.newEnt = function (type, props) { const e = ne0.apply(this, arguments); if (C._gvCur && e.gv == null) e.gv = C._gvCur; if (C.currentView === '3d' && !e.gv && !(props && props.gv) && e.sp == null && !['text', 'dim', 'kot', 'baslik', 'hatch'].includes(type)) e.sp = '3d'; return e; }; }

  /* ---------- görünürlük filtreleri ---------- */
  { const P2 = C.View2D.prototype;
    const draw0 = P2.draw; // çizim döngüsünde katman kontrolünden önce süzmek için C.doc.ents'i geçici süz
    const withFilter = (self, fn) => { if (self.isLayout || C.state.show3dInPlan) return fn(); const all = C.doc.ents; if (!all.some(C.is3DOnly)) return fn(); C.doc.ents = all.filter(C.inPlan); try { return fn(); } finally { C.doc.ents = all; } };
    P2.draw = function () { return withFilter(this, () => draw0.apply(this, arguments)); };
    for (const k of ['pick', 'windowSel', 'snap']) { const f0 = P2[k]; if (f0) P2[k] = function () { return withFilter(this, () => f0.apply(this, arguments)); }; }
  }
  { const vp0 = C.vpPrims; C.vpPrims = function (vp, cb) { return vp0.call(this, vp, (e, pr) => { if (!C.inPlan(e)) return; if (vp.gvOnly && e.gv !== vp.gvOnly) return; cb(e, pr); }); }; }
  if (C.View3D || C.views) setTimeout(() => {
    const v3 = C.views && C.views.v3; if (!v3 || !v3.build) return; const b0 = v3.build.bind(v3);
    v3.build = function () { const all = C.doc.ents; if (!all.some(e => !C.in3D(e))) return b0.apply(this, arguments); C.doc.ents = all.filter(C.in3D); try { return b0.apply(this, arguments); } finally { C.doc.ents = all; } };
    if (v3.snapAt) { const s0 = v3.snapAt.bind(v3); v3.snapAt = function () { const all = C.doc.ents; C.doc.ents = all.filter(C.in3D); try { return s0.apply(this, arguments); } finally { C.doc.ents = all; } }; }
  }, 0);
  { const d0 = C.cmds.SECTION; if (d0) C.addCommand(d0.names, d0.help, async (I, Cx) => { C._gvCur = 'K' + Date.now().toString(36); try { return await d0.fn(I, Cx); } finally { C._gvCur = null; } }); }
  C.addCommand(['PLAN3B', 'MODELIPLANDAGOSTER'], 'Planda 3B modeli (katılar, 3B sekmesinde çizilenler) göster/gizle', async () => {
    C.state.show3dInPlan = !C.state.show3dInPlan; try { localStorage.setItem('aritmacad.show3dInPlan', C.state.show3dInPlan ? '1' : '0'); } catch (e) { }
    C.emit('state'); C.changed(); C.log('Planda 3B model ' + (C.state.show3dInPlan ? 'GÖSTERİLİYOR' : 'GİZLİ (Revit gibi: planı KOTPLANI ile üretin)'));
  }, { noUndo: true });

  /* ---------- izdüşüm motoru (z-tampon ile gizli çizgi ayıklama) ---------- */
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const VIEWS = {
    ON: { d: [0, 1, 0], t: 'ÖN GÖRÜNÜŞ' }, ARKA: { d: [0, -1, 0], t: 'ARKA GÖRÜNÜŞ' }, SAG: { d: [-1, 0, 0], t: 'SAĞ YAN GÖRÜNÜŞ' }, SOL: { d: [1, 0, 0], t: 'SOL YAN GÖRÜNÜŞ' },
    UST: { d: [0, 0, -1], t: 'ÜST GÖRÜNÜŞ' }, GB: { d: [1, 1, -1], t: 'İZOMETRİK (GB)' }, GD: { d: [-1, 1, -1], t: 'İZOMETRİK (GD)' }, KD: { d: [-1, -1, -1], t: 'İZOMETRİK (KD)' }, KB: { d: [1, -1, -1], t: 'İZOMETRİK (KB)' },
  };
  const frameOf = d => { const D = nrm(d); let R = cross(D, [0, 0, 1]); if (Math.hypot(...R) < 1e-9) R = [1, 0, 0]; R = nrm(R); const U = cross(R, D); return { D, R, U }; };
  /* opts: {ents, d (bakış yönü), cut: {h} (yatay kesit) ya da null, depth} -> {cut:[[u,v],[u,v]] (g,conc), vis:[[u,v],[u,v]]} */
  C.projectModel = (opts) => {
    const { D, R, U } = frameOf(opts.d), cutW = opts.cutW, depth = opts.depth || 1e9;
    const uvw = p => [dot(p, R), dot(p, U), dot(p, D)];
    const tris = [], edges = [], cut = [];
    const keep = w => cutW == null || w >= cutW - 1e-9;
    const kenarsiz = opts.kenarsiz || null; // bu nesneler yalnız z-tamponu doldurur (önündekini örter), çizgisi çıkmaz (görünüşte doğrama: çizimi detaydan)
    for (const e of opts.ents) {
      let t; try { t = C.entTris(e); } catch (err) { continue; } if (!t || !t.pos.length) continue;
      const P0 = t.pos, cizgisiz = kenarsiz && kenarsiz.has(e.id);
      for (let i = 0; i < P0.length; i += 9) {
        const a = uvw([P0[i], P0[i + 1], P0[i + 2]]), b = uvw([P0[i + 3], P0[i + 4], P0[i + 5]]), c = uvw([P0[i + 6], P0[i + 7], P0[i + 8]]);
        if (cutW == null) { tris.push(a, b, c); continue; }
        // kesit düzlemiyle kırp (w >= cutW kalır)
        const poly = [], pts = [a, b, c];
        for (let k = 0; k < 3; k++) { const p = pts[k], q = pts[(k + 1) % 3], ip = keep(p[2]), iq = keep(q[2]); if (ip) poly.push(p); if (ip !== iq) { const s = (cutW - p[2]) / (q[2] - p[2]); poly.push([p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s, cutW]); } }
        for (let k = 1; k + 1 < poly.length; k++) tris.push(poly[0], poly[k], poly[k + 1]);
        // kesit çizgisi
        const da = a[2] - cutW, db = b[2] - cutW, dc = c[2] - cutW, X = [];
        for (const [p, q, dp, dq] of [[a, b, da, db], [b, c, db, dc], [c, a, dc, da]]) if ((dp < 0) !== (dq < 0) && dp !== dq) { const s = dp / (dp - dq); X.push([p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s]); }
        if (!cizgisiz && X.length === 2 && Math.hypot(X[0][0] - X[1][0], X[0][1] - X[1][1]) > 1e-6) { X.g = e.id; X.lk = C.secLk ? C.secLk(e) : undefined; X.conc = CONC.has(e.type) || (e.type === 'merdiven' && (e.tip || 'beton') === 'beton'); /* betonarme merdiven kesilen beton (ANSI36), dolu ekipman taraması değil — ana oturum kararı 14.11.2026 */ if (C.secMat) X.mat = C.secMat(e); cut.push(X); }
      }
      const elk = C.secLk ? C.secLk(e) : undefined; if (cizgisiz) continue;
      for (const [p, q] of (t.edges.length || !C.creaseEdges ? t.edges : C.creaseEdges(t, 35)).concat(C.siluetKenar ? C.siluetKenar(t, D) : C.silEdges ? C.silEdges(t, D) : [])) {
        let a = uvw(p), b = uvw(q);
        if (cutW != null) { const ia = keep(a[2]), ib = keep(b[2]); if (!ia && !ib) continue; if (ia !== ib) { const s = (cutW - a[2]) / (b[2] - a[2]), m = [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, cutW]; if (ia) b = m; else a = m; } if (Math.min(a[2], b[2]) > cutW + depth) continue; }
        const sg = [a, b]; sg.lk = elk; edges.push(sg);
      }
    }
    if (!tris.length && !edges.length) return { cut, vis: [] };
    // z-tampon
    let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity, w0 = Infinity, w1 = -Infinity;
    for (const p of tris) { u0 = Math.min(u0, p[0]); v0 = Math.min(v0, p[1]); u1 = Math.max(u1, p[0]); v1 = Math.max(v1, p[1]); w0 = Math.min(w0, p[2]); w1 = Math.max(w1, p[2]); }
    for (const [a, b] of edges) for (const p of [a, b]) { u0 = Math.min(u0, p[0]); v0 = Math.min(v0, p[1]); u1 = Math.max(u1, p[0]); v1 = Math.max(v1, p[1]); }
    const N = opts.res || 1600, span = Math.max(u1 - u0, v1 - v0, 1e-6), ps = span / N, nx = Math.ceil((u1 - u0) / ps) + 3, ny = Math.ceil((v1 - v0) / ps) + 3;
    const Z = new Float32Array(nx * ny).fill(Infinity), X = u => (u - u0) / ps + 1, Y = v => (v - v0) / ps + 1;
    for (let i = 0; i < tris.length; i += 3) {
      const a = tris[i], b = tris[i + 1], c = tris[i + 2], ax = X(a[0]), ay = Y(a[1]), bx = X(b[0]), by = Y(b[1]), cx = X(c[0]), cy = Y(c[1]);
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(den) < 1e-12) continue;
      const xa = Math.max(0, Math.floor(Math.min(ax, bx, cx))), xb = Math.min(nx - 1, Math.ceil(Math.max(ax, bx, cx))), ya = Math.max(0, Math.floor(Math.min(ay, by, cy))), yb = Math.min(ny - 1, Math.ceil(Math.max(ay, by, cy)));
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
        const px = x + 0.5, py = y + 0.5, l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den, l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den, l3 = 1 - l1 - l2;
        if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue; const w = l1 * a[2] + l2 * b[2] + l3 * c[2], k = y * nx + x; if (w < Z[k]) Z[k] = w;
      }
    }
    const tol = Math.max(ps * 2, (w1 - w0) * 1e-4);
    const zAt = (u, v) => { const ix = Math.floor(X(u)), iy = Math.floor(Y(v)); return ix < 0 || iy < 0 || ix >= nx || iy >= ny ? Infinity : Z[iy * nx + ix]; }; // noktadaki en yakın yüzeyin derinliği
    const vis = [];
    const visible = (x, y, w) => { const ix = Math.floor(x), iy = Math.floor(y); let m = -Infinity, any = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = ix + dx, yy = iy + dy; if (xx < 0 || yy < 0 || xx >= nx || yy >= ny) continue; const z = Z[yy * nx + xx]; if (z === Infinity) { any = true; continue; } if (z > m) m = z; } return any || w <= m + tol; };
    for (const ed of edges) {
      const [a, b] = ed, vis0 = vis.length;
      const L = Math.hypot(X(b[0]) - X(a[0]), Y(b[1]) - Y(a[1])); if (L < 0.5) continue;
      const n = Math.max(2, Math.ceil(L)); let run = null;
      for (let i = 0; i <= n; i++) {
        const t = i / n, u = a[0] + (b[0] - a[0]) * t, v = a[1] + (b[1] - a[1]) * t, w = a[2] + (b[2] - a[2]) * t, ok = visible(X(u), Y(v), w);
        if (ok && run == null) run = t; if ((!ok || i === n) && run != null) { const te = ok ? t : (i - 1) / n; if (te > run) vis.push([[a[0] + (b[0] - a[0]) * run, a[1] + (b[1] - a[1]) * run], [a[0] + (b[0] - a[0]) * te, a[1] + (b[1] - a[1]) * te]]); run = null; }
      }
      if (ed.lk) for (let k = vis0; k < vis.length; k++) vis[k].lk = ed.lk;
    }
    return { cut, vis, frame: { D, R, U }, zAt };
  };

  /* ---------- görünüş üretimi ve yerleştirme ---------- */
  const modelEnts = () => C.doc.ents.filter(e => C.layer(e.layer).on && !e.gv && C.in3D(e) && e.type !== 'arazi' && e.type !== 'kazi' && e.type !== 'sheet');
  const tagName = s => C.ascii(s).toUpperCase().replace(/[^A-Z0-9+\-.]+/g, '_').replace(/^_|_$/g, '');
  const kotTxt = h => (h >= 0 ? '+' : '') + h.toFixed(2);
  let gvSeq = 1;
  /* plan kotları: boşluklarda (havuz içi, oda) alttaki taban kotu, kesilen gövdelerde üst kot */
  const planKots = (ents, R, def, W, gv, tag) => {
    const T3 = []; for (const e of ents) { let t; try { t = C.entTris(e); } catch (err) { continue; } if (!t || !t.pos.length) continue; const P0 = t.pos; for (let i = 0; i < P0.length; i += 9) T3.push([P0[i], P0[i + 1], P0[i + 2], P0[i + 3], P0[i + 4], P0[i + 5], P0[i + 6], P0[i + 7], P0[i + 8]]); }
    const zsAt = (x, y) => { const out = []; for (const t of T3) { const ax = t[0], ay = t[1], bx = t[3], by = t[4], cx = t[6], cy = t[7]; if (x < Math.min(ax, bx, cx) - 1e-9 || x > Math.max(ax, bx, cx) + 1e-9 || y < Math.min(ay, by, cy) - 1e-9 || y > Math.max(ay, by, cy) + 1e-9) continue; const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(den) < 1e-14) continue; const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den, l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den, l3 = 1 - l1 - l2; if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue; out.push(l1 * t[2] + l2 * t[5] + l3 * t[8]); } return out; };
    const loops = R.loops.concat(R.equip), LB = loops.map(lp => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const q of lp) { a = Math.min(a, q[0]); b = Math.min(b, q[1]); c = Math.max(c, q[0]); d = Math.max(d, q[1]); } return [a, b, c, d]; }), inAny = q => { let n = 0; for (const lp of loops) if (C.pointInPoly(q, lp)) n++; return n % 2 === 1; };
    const dEdge = (q, lp) => { let m = Infinity; for (let i = 0; i < lp.length; i++) { const a = lp[i], b = lp[(i + 1) % lp.length], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); m = Math.min(m, Math.hypot(q[0] - a[0] - dx * t, q[1] - a[1] - dy * t)); } return m; };
    /* halkanın içinde, kenarlardan en uzak (yaklaşık) nokta; want: dolu (true) ya da boş (false) bölge */
    const spot = (lp, want) => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const q of lp) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
      let best = null, bd = 0; const n = 24;
      const near = loops.filter((l2, k) => { const b = LB[k]; return !(b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1); }); // yalnız bu halkanın bölgesindekiler (içeren halka zaten buradadır)
      const inNear = q => { let c = 0; for (const l2 of near) if (C.pointInPoly(q, l2)) c++; return c % 2 === 1; };
      for (let i = 1; i < n; i++) for (let j = 1; j < n; j++) { const q = [x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * j / n]; if (!C.pointInPoly(q, lp) || inNear(q) !== want) continue; let d = Infinity; for (const l2 of near) d = Math.min(d, dEdge(q, l2)); if (d > bd) { bd = d; best = q; } }
      return best;
    };
    const lay = tag + '_KOT'; C.ensureLayer(lay, 2, 'CONTINUOUS', 18);
    /* kaplama (zemin kaplaması nesnesi): noktadaki kaplama üstü ve altındaki kaba döşeme üstü */
    const KP = ents.filter(e => e.type === 'kaplama' && Array.isArray(e.pts) && e.pts.length > 2);
    const kpOf = (q, zb) => KP.find(e => C.pointInPoly(q, e.pts) && Math.abs((+e.z0 || 0) + kalinlik(e) - zb) < 0.02 || C.pointInPoly(q, e.pts) && Math.abs((+e.z0 || 0) - zb) < 0.02);
    const kalinlik = e => ((+e.zbt || 0) + (+e.sap || 0) + (+e.kt || 0) + (+e.xps || 0)) / 100;
    const kaplamaUst = KP.length ? (q, zb) => { const e = kpOf(q, zb); return e ? (+e.z0 || 0) + kalinlik(e) : null; } : null;
    const kabaAlt = (q, zb) => { const e = kpOf(q, zb); return e ? (+e.z0 || 0) : null; };
    const put = (q, v, txt) => C.add(C.newEnt('kot', { gv, pk: true, p: W(q), v: +v.toFixed(3), txt: txt || '', layer: lay }));
    let n = 0; const h = def.h;
    const SKIPK = new Set(['KORKULUK', 'MERDIVEN', 'SU_TUTUCU_BANT']);
    for (const lp of loops) {
      if (n >= 40) break; if (SKIPK.has(lp.lk)) continue; const hole = M.polyArea(lp) < 0;
      const q = spot(lp, !hole); if (!q) continue; const zs = zsAt(q[0], q[1]);
      /* firma kuralı 14.11.2026: planda kot yalnız bina içinde görünen döşemelere (boş bölgede aşağıda görünen yüzey); duvar / perde / kolon / kiriş üstüne kot yazılmaz.
         Döşemenin üstünde kaplama varsa iki kot: kaba döşeme ve bitmiş kaplama (Çokal İdari planı) */
      if (hole) { const below = zs.filter(z => z <= h + 1e-6); if (below.length) { const zb = Math.max(...below), kp = kaplamaUst ? kaplamaUst(q, zb) : null;
        if (kp != null && kp > (kabaAlt(q, zb) == null ? zb : kabaAlt(q, zb)) + 0.005) { const kab = kabaAlt(q, zb); C.add(C.newEnt('kot', { gv, pk: true, p: W(q), v: +(kab != null ? kab : zb).toFixed(3), v2: +kp.toFixed(3), txt: '', layer: lay })); } else put(q, zb); n++; } }
      else if (zs.length && def.ustKot === true) { const top = Math.max(...zs); if (top > h + 1e-6) { put(q, top, 'üst'); n++; } }
    }
    /* odalar (düşey elemanlarla çevrili bölgeler; mimari-oto.js → mahalBul): her odada görünen döşeme yüzeyleri kotlarına göre ayrılır (galeri, kanal tabanı …),
       1 m²'den büyük her bölgeye bir kot, bölgenin ortasına en yakın noktaya */
    const OA = C.mimariOtoApi;
    if (OA && OA.mahalBul && loops.length && n < 40) { try {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const b of LB) { x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); }
      const MR = ents.filter(e => e.type === 'merdiven' && C.merdivenGeom).map(e => { try { const Gm = C.merdivenGeom(e), b = C.bbox(e); return { b, z: [Gm.z0, Gm.zTop].concat((Gm.pieces || []).filter(q => q.kind === 'sah').map(q => +q.z)).filter(isFinite) }; } catch (er) { return null; } }).filter(Boolean);
      const merdivenKolu = (q, zb) => MR.some(m => q[0] >= m.b[0] && q[0] <= m.b[2] && q[1] >= m.b[1] && q[1] <= m.b[3] && !m.z.some(z => Math.abs(z - zb) < 0.02));
      /* kesme kotu pencereden geçince (Konya ±0.00 planı: +1,20, parapet 1,00) duvar halkaları pencerede açılır, oda dışarı taşar ve kot konmazdı:
         doğrama boşlukları (planda duvar içindeki dikdörtgen) oda bulmada duvar sayılır */
      const bosluk = C.doc.ents.filter(e => e.type === 'acik' && !e.gv && C.layer(e.layer).on).map(e => { let b = null; try { b = C.bbox(e); } catch (er) { } return b && isFinite(b[0]) ? [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]] : null; }).filter(Boolean);
      const odalar = OA.mahalBul(loops.concat(bosluk), [x0, y0, x1, y1], { h: 0.1, enAz: 1 }), konan = [];
      for (const o of odalar) { const [a0, b0, a1, b1] = o.bb, st = Math.max(0.2, Math.min(a1 - a0, b1 - b0) / 14), G = new Map();
        for (let x = a0 + st / 2; x < a1; x += st) for (let y = b0 + st / 2; y < b1; y += st) { const q = [x, y]; if (inAny(q)) continue; const zs = zsAt(x, y).filter(z => z <= h + 1e-6); if (!zs.length) continue;
          const zb = Math.round(Math.max(...zs) * 100) / 100; if (!G.has(zb)) G.set(zb, []); G.get(zb).push(q); }
        for (const [zb, Q] of G) { if (Q.length * st * st < 1 || n >= 40) continue; if (merdivenKolu(Q[Math.floor(Q.length / 2)], zb)) continue; /* merdiven kolu döşeme değil (sahanlık döşeme sayılır) */ const c = Q.reduce((s2, q) => [s2[0] + q[0] / Q.length, s2[1] + q[1] / Q.length], [0, 0]);
          let q = Q[0], bd = Infinity; for (const p of Q) { const d = Math.hypot(p[0] - c[0], p[1] - c[1]); if (d < bd && !konan.some(k => Math.hypot(k[0] - p[0], k[1] - p[1]) < 1.5)) { bd = d; q = p; } }
          konan.push(q); const kp = kaplamaUst ? kaplamaUst(q, zb) : null;
          if (kp != null && kp > (kabaAlt(q, zb) == null ? zb : kabaAlt(q, zb)) + 0.005) { const kab = kabaAlt(q, zb); C.add(C.newEnt('kot', { gv, pk: true, p: W(q), v: +(kab != null ? kab : zb).toFixed(3), v2: +kp.toFixed(3), txt: '', layer: lay })); } else put(q, zb); n++; } }
    } catch (er) { console.error('plan kotları', er); } }
    /* bina dışı (kullanıcı 14.11.2026: "tretuvar ve döşeme kotları, onları da unutma"): tretuvarın üstüne bir kot (en uzun kenarın ortasında, bandın ortası),
       kapı önü rampasına alt ve üst kot. Yalnız plan kesme kotunun altında görünenler */
    try {
      const ust = q => { const z = zsAt(q[0], q[1]).filter(v => v <= h + 1e-6); return z.length ? Math.max(...z) : null; };
      for (const e of ents) { if (n >= 40) break;
        if (e.type === 'tretuvar' && Array.isArray(e.pts) && e.pts.length > 1) { const P = e.pts, w = +e.w || 0.8, kap = P.length > 2;
          /* doğrama numarası / ebat yazısı duvarın dışında, tretuvarın üstünde (mimari-oto.js): kot doğramalardan en uzak yere (bütün kenarlar boyunca) */
          const DB = C.doc.ents.filter(x => x.type === 'acik' && !x.gv).map(x => { try { const b = C.bbox(x); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; } catch (er) { return null; } }).filter(Boolean);
          let en = null;
          for (let i = 0; i < P.length - (kap ? 0 : 1); i++) { const A = P[i], B = P[(i + 1) % P.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]); if (L < 1) continue; const u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
            for (let f = 0.1; f <= 0.901; f += 0.05) for (const sg of [1, -1]) { const q = [A[0] + u[0] * L * f - sg * u[1] * w / 2, A[1] + u[1] * L * f + sg * u[0] * w / 2]; if (inAny(q) || (kap && C.pointInPoly(q, P))) continue;
              const d = DB.length ? Math.min(...DB.map(c => Math.hypot(c[0] - q[0], c[1] - q[1]))) : 99, pu = Math.min(d, 3) - Math.abs(f - 0.5) * 0.1; if (!en || pu > en.pu) en = { q, pu }; } }
          if (en) { const z = ust(en.q); if (z != null) { put(en.q, z); n++; } } }
        else if (e.type === 'kati' && (/rampa/i.test(e.ad || '') || /RAMPA/.test(e.layer || ''))) { let b; try { b = C.bbox(e); } catch (er) { continue; } if (!b || !isFinite(b[0])) continue;
          let lo = null, hi = null; for (let i = 1; i < 8; i++) for (let j = 1; j < 8; j++) { const q = [b[0] + (b[2] - b[0]) * i / 8, b[1] + (b[3] - b[1]) * j / 8], z = ust(q); if (z == null) continue; if (!lo || z < lo.z) lo = { q, z }; if (!hi || z > hi.z) hi = { q, z }; }
          if (lo && hi && hi.z - lo.z > 0.02) { put(hi.q, hi.z); put(lo.q, lo.z); n += 2; } else if (hi) { put(hi.q, hi.z); n++; } }
      }
    } catch (er) { console.error('plan dış kotları', er); }
    return n;
  };
  C.makeView = (def) => { // def: {kind:'plan'|'view', h, depth, dir, title, place:[x,y]|'yerinde', ref, gv}
    let ents = def.ents || modelEnts();
    if (def.ids && def.ids.length) { const S = new Set(def.ids); ents = ents.filter(e => S.has(e.id)); }
    /* görünüşte (cephe) bina içindeki elemanlar çizilmez: merdiven, iç duvar, ara döşeme, ekipman … (firma kuralı; pencere camı opak sayılır) */
    if (def.kind !== 'plan' && /^(ON|ARKA|SAG|SOL)$/.test(def.dir || '') && def.ic !== true && C.gorunusIcElemanlar) { const ic = C.gorunusIcElemanlar(ents); if (ic.size) ents = ents.filter(e => !ic.has(e.id)); }
    if (def.area) { const a = def.area, m = 0.01; ents = ents.filter(e => { const b = C.bbox(e); return !(b[2] < a[0] - m || b[0] > a[2] + m || b[3] < a[1] - m || b[1] > a[3] + m); }); }
    /* doğrama detaydan (def.dograma, MIMARIPAFTA; firma kuralı 14.11.2026): planda doğramanın 3B ağı kesilmez, 1-1 kesiti çizilir; görünüşte ağ yalnız örter
       (pencere camı opak), çizgisi tip detayının görünüşünden gelir (mimari-oto.js) */
    const dogr = def.dograma === true && (def.kind === 'plan' ? !!C.dogramaCizPlan : (!!C.dogramaCizGorunus && VIEWS[def.dir] && Math.abs(VIEWS[def.dir].d[2]) < 1e-9)), entsD = ents;
    if (dogr && def.kind === 'plan') ents = ents.filter(e => e.type !== 'acik');
    const opts = def.kind === 'plan' ? { ents, d: [0, 0, -1], cutW: -def.h, depth: def.depth } : { ents, d: VIEWS[def.dir].d, kenarsiz: dogr ? new Set(ents.filter(e => e.type === 'acik').map(e => e.id)) : null };
    const r = C.projectModel(opts);
    if (!r.cut.length && !r.vis.length) return null;
    const R = C.sectionMerge ? C.sectionMerge(r.cut, r.vis) : { loops: [], equip: [], open: [], vis: r.vis };
    /* görünüşte toprak altı çizilmez (firma kuralı 14.11.2026; Çokal 6-Blower ÖN GÖRÜNÜŞ: görünüş zemin çizgisinde biter, zemin çizgisi Toprak katmanında, binanın iki yanına uzar) */
    let zg = null; const OA = C.mimariOtoApi;
    if (def.kind !== 'plan' && /^(ON|ARKA|SAG|SOL)$/.test(def.dir || '') && def.zemin !== false && OA && OA.zeminAltiKirp) {
      zg = def.zemin != null && isFinite(+def.zemin) ? +def.zemin : OA.zeminKotu(C.doc.ents.filter(e => !e.gv), C.seviyeler ? C.seviyeler() : []);
      if (zg != null) { const K = OA.zeminAltiKirp(R, zg); Object.assign(R, K); if (!R.loops.length && !R.vis.length && !R.open.length && !R.equip.length) return null; } }
    if (def.area && def.kind === 'plan') { // alan kırpma (planda u=x, v=y)
      const a = def.area, ins = (q, k) => k === 0 ? q[0] >= a[0] : k === 1 ? q[0] <= a[2] : k === 2 ? q[1] >= a[1] : q[1] <= a[3];
      const isect = (p, q, k) => { const t = k === 0 ? (a[0] - p[0]) / (q[0] - p[0]) : k === 1 ? (a[2] - p[0]) / (q[0] - p[0]) : k === 2 ? (a[1] - p[1]) / (q[1] - p[1]) : (a[3] - p[1]) / (q[1] - p[1]); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
      const clipPoly = poly => { let out = poly; for (let k = 0; k < 4 && out.length; k++) { const inp = out; out = []; for (let i = 0; i < inp.length; i++) { const p = inp[i], q = inp[(i + 1) % inp.length], ip = ins(p, k), iq = ins(q, k); if (ip) out.push(p); if (ip !== iq) out.push(isect(p, q, k)); } } return out; };
      const clipSeg = ([p, q]) => { let t0 = 0, t1 = 1; const dx = q[0] - p[0], dy = q[1] - p[1]; for (const [pp, qq] of [[-dx, p[0] - a[0]], [dx, a[2] - p[0]], [-dy, p[1] - a[1]], [dy, a[3] - p[1]]]) { if (Math.abs(pp) < 1e-15) { if (qq < 0) return null; continue; } const t = qq / pp; if (pp < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t); if (t0 > t1) return null; } return [[p[0] + dx * t0, p[1] + dy * t0], [p[0] + dx * t1, p[1] + dy * t1]]; };
      const big = lp => lp.length >= 3 && Math.abs(M.polyArea(lp)) > 1e-8;
      const cpk = lp => { const q = clipPoly(lp); q.lk = lp.lk; return q; }; R.loops = R.loops.map(cpk).filter(big); if (R.byMat) R.byMat.forEach(g => { g.loops = g.loops.map(cpk).filter(big); }); R.equip = R.equip.map(cpk).filter(big);
      const segs = []; for (const pl of R.open) for (let i = 1; i < pl.length; i++) { const c = clipSeg([pl[i - 1], pl[i]]); if (c) { c.lk = pl.lk; segs.push(c); } }
      R.open = segs.map(sg => { const q = sg.slice(); q.terr = false; q.lk = sg.lk; return q; });
      R.vis = R.vis.map(sg => { const c = clipSeg(sg); if (c) c.lk = sg.lk; return c; }).filter(Boolean);
    }
    const all = [...R.loops.flat(), ...R.equip.flat(), ...R.open.flat(), ...R.vis.flat()];
    const ub = [Math.min(...all.map(q => q[0])), Math.min(...all.map(q => q[1])), Math.max(...all.map(q => q[0])), Math.max(...all.map(q => q[1]))];
    const gv = def.gv || ('G' + Date.now().toString(36) + (gvSeq++));
    let ref = def.ref, base = def.place;
    if (def.place === 'yerinde') { ref = [0, 0]; base = [0, 0]; } else if (!ref) ref = [ub[0], ub[1]];
    const W = q => [base[0] + q[0] - ref[0], base[1] + q[1] - ref[1], 0];
    const tag = def.tag || tagName(def.kind === 'plan' ? `PLAN${kotTxt(def.h)}` : `GORUNUS_${def.dir}`);
    const LK = tag + '_KESIT', LG = tag + '_GORUNEN', LT = tag + '_TARAMA';
    // her elemanın çizgileri kendi katmanında: <ETİKET>_KESIT_PERDE, <ETİKET>_GORUNEN_PERDE, <ETİKET>_TARAMA_PERDE …
    const col = lk => (C.secLkCol ? C.secLkCol(lk) : 7);
    const LKf = lk => { if (!lk) { C.ensureLayer(LK, 7, 'CONTINUOUS', 50); return LK; } const n = LK + '_' + lk; C.ensureLayer(n, col(lk), 'CONTINUOUS', 50); return n; };
    const LGf = lk => { if (!lk) { C.ensureLayer(LG, 8, 'CONTINUOUS', 18); return LG; } const n = LG + '_' + lk; C.ensureLayer(n, col(lk), 'CONTINUOUS', 18); return n; };
    const LTf = lk => { const n = lk ? LT + '_' + lk : LT; C.ensureLayer(n, 8, 'CONTINUOUS', 13); return n; };
    const mk = (type, p) => C.add(C.newEnt(type, Object.assign({ gv }, p)));
    if (zg != null) { const yan = 2.0; C.ensureLayer('ARAZI', 27, 'CONTINUOUS', 20); mk('pline', { pts: [W([ub[0] - yan, zg]), W([ub[2] + yan, zg])], closed: false, layer: 'ARAZI' }); } // zemin çizgisi (Toprak); yanlara 2 m — KABUL
    for (const lp of R.loops.concat(R.equip)) C.addFitted(lp, true, W, { gv, layer: LKf(lp.lk) });
    for (const pl of R.open) C.addFitted(pl, false, W, { gv, layer: LKf(pl.lk) });
    { const vg = new Map(); for (const sg of R.vis) { const k = sg.lk || ''; if (!vg.has(k)) vg.set(k, []); vg.get(k).push(sg); } for (const [k, vs] of vg) C.addFittedSegs(vs, W, { gv, layer: def.kind === 'plan' ? LGf(k || null) : LKf(k || null) }); }
    if (R.loops.length && def.hatch !== 'YOK' && C.T.hatch) { if (C.secHatches) C.secHatches(R, W, g => LTf(g.lk), def.hatch || 'ANSI31', def.kind === 'plan', mk); else mk('hatch', { loops: R.loops.map(lp => (C.denseLoop ? C.denseLoop(lp) : lp).map(q => { const w = W(q); return [w[0], w[1]]; })), pat: def.hatch || 'ANSI31', sc: 1, ang: 0, ann: true, orig: [0, 0], layer: LT }); }
    if (R.equip.length && def.hatch !== 'YOK' && C.T.hatch) { const eg = new Map(); for (const lp of R.equip) { const k = lp.lk || ''; if (!eg.has(k)) eg.set(k, []); eg.get(k).push(lp); } for (const [k, eqs] of eg) mk('hatch', { loops: eqs.map(lp => (C.denseLoop ? C.denseLoop(lp) : lp).map(q => { const w = W(q); return [w[0], w[1]]; })), ...(C.ekipTarama ? C.ekipTarama() : { pat: 'ANSI37', sc: 0.5 }), ang: 0, ann: true, orig: [0, 0], layer: LTf(k || null) }); }
    const dKot = []; // görünen doğramaların denizlik / lento altı kotları (görünüş kotları için)
    if (dogr) { try { if (def.kind === 'plan') C.dogramaCizPlan(gv, W, def.h, entsD); else C.dogramaCizGorunus({ ents: entsD, D: r.frame.D, R: r.frame.R, zAt: r.zAt, W, gv, layer: tag + '_DOGRAMA', zg, kotlar: dKot }); } catch (er) { console.error('doğrama çizimi', er); } }
    /* GÖRÜNÜŞ KOTLARI (denetim 14.11.2026; Çokal R2 görünüşleri ölçüldü — 10-İdari ÖN / ARKA / SAĞ / SOL: kot var, ölçü yok): zemin, kat seviyeleri, saçak ve
       mahya kotu yapının solunda dışarıda; pencere denizliği ve lento altı (kapıda lento altı) doğramanın solunda. Her kot değeri görünüşte bir kez. */
    if (dogr && def.kind !== 'plan' && C.pstil && C.pstil()) { try {
      const k = C.annoH(1), LKt = tag + '_KOT', yaz = new Set(), kon = []; C.ensureLayer(LKt, 7, 'CONTINUOUS', 18);
      const koy = (sx, z) => { if (!isFinite(z) || z < ub[1] - 0.01 || z > ub[3] + 0.01) return; const key = z.toFixed(2); if (yaz.has(key)) return;
        let x = sx; for (let i = 0; i < 4 && kon.some(q => Math.abs(q[0] - x) < 17 * k && Math.abs(q[1] - z) < 5 * k); i++) x -= 18 * k; // aynı yerde üst üste binmesin: bir sütun sola
        yaz.add(key); kon.push([x, z]); const e = mk('kot', { p: W([x, z]), v: +z.toFixed(3), txt: '', layer: LKt, ters: true }); if (e) delete e.sp; };
      const sol = ub[0] - 3 * k, svl = (C.seviyeler ? C.seviyeler() : []).filter(q => isFinite(+q.z) && !/temel|toprak/i.test(String(q.ad || '')));
      if (zg != null) koy(sol, zg); for (const q of svl) koy(sol, +q.z);
      for (const c of ents.filter(e => e.type === 'cati' && !e.gv)) { try { const V = C.catiOkVerisi ? C.catiOkVerisi(c) : null; if (V && isFinite(V.zSacak)) koy(sol, V.zSacak); if (C.catiMahyaKotu) koy(sol, C.catiMahyaKotu(c)); } catch (er) { } }
      for (const d of dKot.sort((p, q) => p.s0 - q.s0)) { if (!d.kapi) koy(d.s0 - 2 * k, d.z0); koy(d.s0 - 2 * k, d.z1); }
    } catch (er) { console.error('görünüş kotları', er); } }
    if (def.kind === 'plan' && def.kot !== false) planKots(ents, R, def, W, gv, tag);
    // mekanik: boru / ek parça eksen çizgileri, boru adları ve poz numaraları (kot planında)
    if (def.kind === 'plan' && def.mek !== false) {
      const inA = q => !def.area || (q[0] >= def.area[0] - 0.01 && q[0] <= def.area[2] + 0.01 && q[1] >= def.area[1] - 0.01 && q[1] <= def.area[3] + 0.01);
      const zOK = e => { let zmin = Infinity; const pts = e.type === 'pipe' ? (C.pipePath ? C.pipePath(e).pts : e.pts.map(M.p3)) : (C.fit3Ports ? C.fit3Ports(e).map(q => q.p) : []); for (const q of pts) zmin = Math.min(zmin, q[2] || 0); return zmin <= def.h + 1e-6 && zmin >= def.h - (def.depth || 20) - 1e-6; };
      const mekE = ents.filter(e => (e.type === 'pipe' || e.type === 'fit3') && zOK(e));
      const LE = tag + '_EKSEN', LY = tag + '_BORU_YAZI'; let nE = 0;
      if (mekE.length) { C.ensureLayer(LE, 1, 'CENTER', 13); C.ensureLayer(LY, 7, 'CONTINUOUS', 18); }
      for (const e of mekE) {
        const segs = e.type === 'pipe' ? (() => { const P = C.pipePath ? C.pipePath(e).pts : e.pts.map(M.p3), o = []; for (let i = 1; i < P.length; i++) o.push([P[i - 1], P[i]]); return o; })() : (C.fit3Line ? C.fit3Line(e) : []);
        for (const [a, b] of segs) { if (M.dist2(a, b) < 1e-4 || (!inA(a) && !inA(b))) continue; mk('line', { a: W([a[0], a[1]]), b: W([b[0], b[1]]), layer: LE, lt: 'CENTER', lw: 13 }); nE++; }
        if (e.type === 'pipe' && e.label && def.yazi !== false) { // boru adı: en uzun yatay parça boyunca
          let best = null, bl = 0; for (let i = 1; i < e.pts.length; i++) { const a = M.p3(e.pts[i - 1]), b = M.p3(e.pts[i]), l = M.dist2(a, b); if (l > bl) { bl = l; best = [a, b]; } }
          if (best && bl > C.annoH(12) && inA(M.lerp(best[0], best[1], 0.5))) { let ang = Math.atan2(best[1][1] - best[0][1], best[1][0] - best[0][0]) * 180 / Math.PI; if (ang > 90.01) ang -= 180; if (ang < -89.99) ang += 180; const r = (e.od || e.dn || 100) / 2000, h = C.annoH(2.5), mid = M.lerp(best[0], best[1], 0.5), up = [-Math.sin(ang * Math.PI / 180), Math.cos(ang * Math.PI / 180)];
            mk('text', { p: W([mid[0] + up[0] * (r + h * 0.7), mid[1] + up[1] * (r + h * 0.7)]), h, s: String(e.label).replace(/\s*\([^)]*\)\s*$/, ''), rot: ang, al: 'C', layer: LY }); }
        }
      }
      if (C.mekPozListe && C.pozBalon && def.poz !== false) {
        const { pozOf } = C.mekPozListe(), used = [], seen = new Set(); let nP = 0; C.ensureLayer(tag + '_POZ', 2, 'CONTINUOUS', 18);
        for (const e of ents) { if (!C.isMekanik || !C.isMekanik(e) || !pozOf.has(e.id)) continue; if ((e.type === 'pipe' || e.type === 'fit3') && !mekE.includes(e)) continue; const a3 = C.pozAnchor(e); if (!inA(a3)) continue; const no = pozOf.get(e.id), key = no + '|' + Math.round(a3[0] * 2) + '|' + Math.round(a3[1] * 2); if (seen.has(key)) continue; seen.add(key);
          C.pozBalon(W([a3[0], a3[1]]), no, e.id, { gv, layer: tag + '_POZ' }, used); nP++; }
      }
    }
    let aksBot = Infinity;
    if (C.aksAll && def.aks !== false) { // modeldeki akslar plan / kesit / görünüşe otomatik
      const LA = tag + '_AKS'; C.ensureLayer(LA, 1, 'CENTER', 18); aksBot = Infinity;
      if (def.kind === 'plan' || def.dir === 'UST') {
        for (const e of C.aksAll()) {
          const b = C.bbox(e); if (def.area && (b[2] < def.area[0] || b[0] > def.area[2] || b[3] < def.area[1] || b[1] > def.area[3])) continue;
          if (b[2] < ub[0] - 2 || b[0] > ub[2] + 2 || b[3] < ub[1] - 2 || b[1] > ub[3] + 2) continue;
          const o = W([e.o[0], e.o[1]]), c = JSON.parse(JSON.stringify(e)); delete c.id; delete c._c; delete c.sp; delete c.gv;
          const na = mk('aks', Object.assign(c, { o: [o[0], o[1]], layer: LA })); aksBot = Math.min(aksBot, C.bbox(na)[1]);
        }
      } else if (VIEWS[def.dir] && Math.abs(VIEWS[def.dir].d[2]) < 1e-9) { // yan/ön görünüş: bakış doğrultusuna paralel akslar
        const D = VIEWS[def.dir].d, Rr = frameOf(D).R, pos = [];
        for (const e of C.aksAll()) for (const l of C.aksLines(e)) { if (Math.abs(l.d[0] * D[0] + l.d[1] * D[1]) < 0.98) continue; const s = l.p[0] * Rr[0] + l.p[1] * Rr[1]; if (s < ub[0] - 0.5 || s > ub[2] + 0.5 || pos.some(q => Math.abs(q.s - s) < 1e-4)) continue; pos.push({ s, lab: l.lab }); }
        pos.sort((p, q) => p.s - q.s); const ae = C.aksAddSection(pos, ub[1], ub[3], W, { gv, layer: LA });
        /* pafta stilinde görünüşte ölçü yok (denetim 14.11.2026: aks arası ölçü Aks katmanına ARIAL 5 mm düşüyordu). Çokal R2 görünüşleri ölçüldü
           (10-İdari ÖN / ARKA / SAĞ / SOL, 6-Blower ÖN / ARKA / SAĞ / SOL): akslar ve balonlar var, DIMENSION yok — aks ölçüsü yazılmaz; balon
           çizimin 14 mm üstünde (ilk ölçü sırası yerinde) */
        if (ae && C.pstil && C.pstil()) { const AKm = (C.cizimKural && C.cizimKural.MIMARI && C.cizimKural.MIMARI.aks) || {}; Object.assign(ae, { dims: false, extp: 14 - (AKm.balonR || 6) }); delete ae._c; }
      }
    }
    const title = def.title || (def.kind === 'plan' ? `${kotTxt(def.h)} KOTU PLANI` : VIEWS[def.dir].t);
    const bx = W([(ub[0] + ub[2]) / 2, ub[1]]), th = C.annoH(5), dmm = aksBot < Infinity ? 44 : 11; // akslar varsa balon + ölçü payı (kağıtta mm)
    C.std('YAZI');
    mk(C.T.baslik ? 'baslik' : 'text', C.T.baslik ? { p: [bx[0], bx[1] - C.annoH(dmm), 0], ay: bx[1], dmm, s: title, hp: 5, layer: 'YAZI', gdef: Object.assign({}, def, { ents: undefined, gv, ref, place: base, tag }) } : { p: [bx[0], bx[1] - th * 3, 0], h: th, s: title, rot: 0, al: 'C', layer: 'YAZI' });
    const bb = [W([ub[0], ub[1]]), W([ub[2], ub[3]])];
    const eb = C.extents(C.doc.ents.filter(e => e.gv === gv)), bb2 = [bb[0][0], bb[0][1] - th * 4, bb[1][0], bb[1][1]];
    if (eb) { bb2[0] = Math.min(bb2[0], eb[0]); bb2[1] = Math.min(bb2[1], eb[1]); bb2[2] = Math.max(bb2[2], eb[2]); bb2[3] = Math.max(bb2[3], eb[3]); }
    return { gv, title, n: R.loops.length + R.equip.length + R.vis.length, bb: bb2 };
  };
  /* paftaya yerleştir: ölçekli dikdörtgen pencere, yalnız bu görünüşü gösterir */
  const toSheet = async (I, res) => {
    const sc = parseFloat(String(await I.str('Pafta ölçeği 1:', '50', { whole: false })).replace(/^1[:/]/, '')) || 50, k = 1000 / sc;
    if (!(C.doc.layouts || []).length) { C.newLayout(); C.layoutIdx = 0; }
    C.setView('layout'); const L = C.views.lay.cur(); const w = (res.bb[2] - res.bb[0]) * k + 12, h = (res.bb[3] - res.bb[1]) * k + 12;
    E.preview = c => [P([[c[0] - w / 2, c[1] - h / 2], [c[0] + w / 2, c[1] - h / 2], [c[0] + w / 2, c[1] + h / 2], [c[0] - w / 2, c[1] + h / 2]], true, { lt: 'DASHED' })];
    const at = await I.pt(`Paftada yeri (merkez) — 1/${sc}, ${Math.round(w)}×${Math.round(h)} mm`); E.preview = null; if (!at || typeof at === 'string') return;
    const vp = { x: at[0] - w / 2, y: at[1] - h / 2, w, h, cx: (res.bb[0] + res.bb[2]) / 2, cy: (res.bb[1] + res.bb[3]) / 2, scale: sc, gvOnly: res.gv, frame: { on: false } };
    L.vps.push(vp); C.layoutSel = vp; C.changed(); C.emit('layouts'); C.log(`"${res.title}" paftaya 1/${sc} yerleştirildi (pencere yalnız bu görünüşü gösterir).`);
  };
  /* kapsam: tüm model, alan (dikdörtgen) ya da seçilen nesneler; seçim sırasında 3B model planda geçici görünür */
  const askScope = async (I, allowArea) => {
    const kw = [['T', 'Tüm model'], ...(allowArea ? [['A', 'Alan seç']] : []), ['N', 'Nesne seç']];
    if (E.queue.length && !/^(T|A|N)$/i.test(E.queue[0])) return {}; // betikte kapsam verilmediyse: tüm model
    const m = await I.kw('Kapsam', kw, 'T'); if (!m) return null; if (m === 'T') return {};
    const prev = C.state.show3dInPlan; if (C.currentView !== '3d') { C.state.show3dInPlan = true; C.changed(); }
    try {
      if (m === 'A') {
        const a = await I.pt('Kesit planı alanının ilk köşesi'); if (!a || typeof a === 'string') return null;
        E.base = a; E.rubber = false; E.preview = c => [P([a, [c[0], a[1]], c, [a[0], c[1]]], true, { lt: 'DASHED', color: 3 })];
        const b = await I.pt('Karşı köşe'); E.preview = null; E.base = null; E.rubber = true; if (!b || typeof b === 'string') return null;
        return { area: [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])] };
      }
      const sel = (await I.sel('Kesit planı alınacak 3B nesneleri seçin')).filter(e => { try { const t = C.entTris(e); return t && t.pos.length; } catch (err) { return false; } });
      if (!sel.length) { C.warn('3B nesne seçilmedi'); return null; }
      return { ids: sel.map(e => e.id) };
    } finally { if (C.state.show3dInPlan !== prev) { C.state.show3dInPlan = prev; C.changed(); } }
  };
  const askPlace = async (I, auto) => {
    const r = await I.pt('Yerleşim noktası (sol alt) [Yerinde(Y)] — Enter: modelin yanına', { kw: [['Y', 'Yerinde']] });
    if (r === 'Y') return 'yerinde'; if (r && typeof r !== 'string') return [r[0], r[1]]; return auto();
  };
  const autoPlace = (() => { let n = 0; return () => { const bb = C.extents(modelEnts()) || [0, 0, 10, 10], gb = C.extents(C.doc.ents.filter(e => e.gv)) || bb; n++; return [Math.max(bb[2], gb[2]) + Math.max(10, (bb[2] - bb[0]) * 0.3), bb[1]]; }; })();

  C.addCommand(['KOTPLANI', 'PLANAL', 'KATPLANI', 'LEVELPLAN'], 'Revit gibi kot planı: 3B modeli verilen kottan yatay keser (kesilen kısım kalın ve taralı, altındakiler görünen çizgi). KOTPLANI 2 [derinlik] [yer] — başlık "+2.00 KOTU PLANI"', async (I) => {
    const kv = {}; E.queue = E.queue.filter(t => { const m = /^([A-Za-z]+)=(.*)$/.exec(t); if (m) { kv[C.up(m[1])] = C.up(m[2]); return false; } return true; });
    if (!modelEnts().some(e => { const t = C.entTris(e); return t && t.pos.length; })) { C.warn('3B model yok.'); return; }
    const h = await I.num('Kesit kotu (m)', 1.2); if (h == null) return;
    const depth = await I.num('Görüş derinliği aşağı (m)', 20) || 20;
    const sc = await askScope(I, true); if (!sc) return;
    const place = await askPlace(I, autoPlace);
    const res = C.makeView(Object.assign({ kind: 'plan', h, depth, place, hatch: kv.T || 'ANSI31' }, sc));
    if (!res) { C.warn(`${kotTxt(h)} kotunda kesilen ya da görünen bir şey yok.`); return; }
    C.log(`${res.title} üretildi (${res.n} çizgi). Katmanlar elemana göre: ${tagName('PLAN' + kotTxt(h))}_KESIT_<ELEMAN> / _GORUNEN_<ELEMAN> / _TARAMA_<ELEMAN>. Model değişince: GORUNUSGUNCELLE.`);
    if (!E.scriptMode && (await I.kw('Paftaya yerleştirilsin mi?', [['H', 'Hayır'], ['E', 'Evet']], 'H')) === 'E') await toSheet(I, res);
  });
  C.addCommand(['GORUNUS', 'VIEWBASE', 'GORUNUSAL3B', 'IZOMETRIK'], 'Revit/AutoCAD VIEWBASE gibi: 3B modelden ön, arka, sağ, sol, üst ya da izometrik görünüş üretir (gizli çizgiler ayıklanır) ve isteğe bağlı paftaya ölçekli yerleştirir', async (I) => {
    if (!modelEnts().some(e => { const t = C.entTris(e); return t && t.pos.length; })) { C.warn('3B model yok.'); return; }
    const dir = await I.kw('Görünüş', [['ON', 'Ön'], ['ARKA', 'Arka'], ['SAG', 'Sağ'], ['SOL', 'Sol'], ['UST', 'Üst'], ['GB', 'İzometrik GB'], ['GD', 'İzometrik GD'], ['KD', 'İzometrik KD'], ['KB', 'İzometrik KB']], 'ON'); if (!dir) return;
    const sc = await askScope(I, false); if (!sc) return;
    const place = await askPlace(I, autoPlace);
    const res = C.makeView(Object.assign({ kind: 'view', dir, place: place === 'yerinde' ? autoPlace() : place, hatch: 'YOK' }, sc));
    if (!res) { C.warn('Görünecek bir şey yok.'); return; }
    C.log(`${res.title} üretildi (${res.n} çizgi). Model değişince: GORUNUSGUNCELLE.`);
    if (!E.scriptMode && (await I.kw('Paftaya yerleştirilsin mi?', [['H', 'Hayır'], ['E', 'Evet']], 'H')) === 'E') await toSheet(I, res);
  });
  C.addCommand(['GORUNUSGUNCELLE', 'VIEWUPDATE', 'GUNCELLE3B'], 'Üretilmiş kot planı / görünüşü 3B modelden yeniden üretir (yeri, katmanı, paftası korunur). Seçim yoksa hepsini günceller.', async (I) => {
    const s = await I.sel('Güncellenecek görünüşten bir nesne seçin (Enter = tümü)');
    const ids = new Set((s.length ? s : C.doc.ents).filter(e => e.gv).map(e => e.gv)); let n = 0;
    for (const gv of ids) {
      const b = C.doc.ents.find(e => e.gv === gv && e.gdef); if (!b) continue; const def = b.gdef;
      C.remove(C.doc.ents.filter(e => e.gv === gv));
      const res = C.makeView(Object.assign({}, def, { gv, place: def.place, ref: def.ref })); if (res) n++;
    }
    C.log(n ? `${n} görünüş güncellendi.` : 'Güncellenecek üretilmiş görünüş bulunamadı.');
  });
  C.addCommand(['GORUNUSPAFTA', 'VIEWTOSHEET'], 'Üretilmiş bir görünüşü ölçekli olarak paftaya yerleştirir', async (I) => {
    const s = await I.sel('Görünüşten bir nesne seçin'); const e = s.find(q => q.gv); if (!e) { C.warn('Üretilmiş görünüş seçilmedi'); return; }
    const all = C.doc.ents.filter(q => q.gv === e.gv), bb = C.extents(all), b = all.find(q => q.gdef);
    await toSheet(I, { gv: e.gv, title: b ? b.s : 'Görünüş', bb });
  });
  if (typeof document !== 'undefined') setTimeout(() => { const b = document.querySelector('#plan3dBtn'); if (!b) return; const sync = () => b.classList.toggle('on', !!C.state.show3dInPlan); b.onclick = () => C.runTool('PLAN3B'); C.on('state', sync); sync(); }, 0);
})(window.C);

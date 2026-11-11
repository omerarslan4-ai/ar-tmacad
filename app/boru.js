/* ArıtmaCAD — boru hattı: standart dirsekler, TE (eşit / inegal), flanş / flanş adaptörü, hatta vana */
(function (C) {
  'use strict';
  const M = C.M, RAD = Math.PI / 180, { L, P, CI, TX } = C.prim, { cylSeg } = C.meshDef;
  const STD_ANG = [90, 60, 45, 30, 22.5, 11.25];
  const PN16 = { 50: 165, 65: 185, 80: 200, 100: 220, 125: 250, 150: 285, 200: 340, 250: 405, 300: 460, 350: 520, 400: 580, 450: 640, 500: 715, 600: 840, 700: 910, 800: 1025, 900: 1125, 1000: 1255 };
  C.flangeOD = dn => { const ks = Object.keys(PN16).map(Number); const k = ks.reduce((a, b) => Math.abs(b - dn) < Math.abs(a - dn) ? b : a); return PN16[k] * dn / k; };
  /* ---------- malzeme kataloğu (standart dış çaplar ve fitting ölçüleri) ---------- */
  // Çelik: EN 10220 / ASME B36.10 dış çaplar, ASME B16.9 TE merkez-uç (C) ölçüleri; uzun yarıçaplı dirsek R = 1.5·NPS
  const ST_OD = { 50: 60.3, 65: 76.1, 80: 88.9, 100: 114.3, 125: 139.7, 150: 168.3, 200: 219.1, 250: 273, 300: 323.9, 350: 355.6, 400: 406.4, 450: 457, 500: 508, 600: 610 };
  const ST_NPS = { 50: 2, 65: 2.5, 80: 3, 100: 4, 125: 5, 150: 6, 200: 8, 250: 10, 300: 12, 350: 14, 400: 16, 450: 18, 500: 20, 600: 24 };
  const ST_TEE = { 50: 64, 65: 76, 80: 86, 100: 105, 125: 124, 150: 143, 200: 178, 250: 216, 300: 254, 350: 279, 400: 305, 450: 343, 500: 381, 600: 432 };
  // Duktil: EN 545 dış çaplar (DE)
  const DI_OD = { 80: 98, 100: 118, 125: 144, 150: 170, 200: 222, 250: 274, 300: 326, 350: 378, 400: 429, 450: 480, 500: 532, 600: 635, 700: 738, 800: 842, 900: 945, 1000: 1048, 1200: 1255 };
  // PE / PVC: boyut = dış çap (Ø). Flanş adaptörü için eşleşen flanş DN'i
  const PE_DN = { 63: 50, 75: 65, 90: 80, 110: 100, 125: 100, 140: 125, 160: 150, 180: 150, 200: 200, 225: 200, 250: 250, 280: 250, 315: 300, 355: 350, 400: 400, 450: 450, 500: 500, 560: 500, 630: 600, 710: 700, 800: 800 };
  C.CATALOG = {
    PE: { name: 'PE100 (EN 12201 / ISO 4427)', sizes: [63, 75, 90, 110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500, 560, 630], label: d => 'Ø' + d },
    PVC: { name: 'PVC-U (EN 1452)', sizes: [63, 75, 90, 110, 125, 140, 160, 200, 225, 250, 280, 315, 355, 400, 450, 500, 630], label: d => 'Ø' + d },
    CELIK: { name: 'Çelik (EN 10220 / ASME B16.9)', sizes: Object.keys(ST_OD).map(Number), label: d => 'DN' + d },
    DUKTIL: { name: 'Duktil (EN 545)', sizes: Object.keys(DI_OD).map(Number), label: d => 'DN' + d },
  };
  const nearKey = (tbl, v) => { const ks = Object.keys(tbl).map(Number); return ks.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a); };
  C.pipeOD = (mat, dn) => { const k = C.matKind(mat); if (k === 'CELIK') return ST_OD[dn] || dn * 1.08; if (k === 'DUKTIL') return DI_OD[dn] || dn * 1.1; return dn; };
  C.flangeDN = (mat, dn) => { const k = C.matKind(mat); return k === 'PE' || k === 'PVC' ? (PE_DN[dn] || PE_DN[nearKey(PE_DN, dn)]) : dn; };
  C.bendR = (mat, dn) => { const k = C.matKind(mat), od = C.pipeOD(mat, dn); if (k === 'CELIK') return 1.5 * (ST_NPS[dn] || dn / 25) * 25.4; if (k === 'DUKTIL') return Math.max(dn, 150); if (k === 'PVC') return od; return 1.5 * od; };
  C.teeC = (mat, dn) => { const k = C.matKind(mat), od = C.pipeOD(mat, dn); if (k === 'CELIK') return ST_TEE[dn] || od * 0.8; if (k === 'DUKTIL') return dn * 0.85 + 90; return Math.max(od * 0.85, 90); };
  C.adaptorLen = (mat, dn) => { const od = C.pipeOD(mat, dn); return C.matKind(mat) === 'PVC' ? Math.max(120, od * 0.9) : Math.max(150, od * 1.25); };
  C.matKind = m => { const u = C.ascii(m || '').toUpperCase(); if (/PE|HDPE|POLIET/.test(u)) return 'PE'; if (/PVC/.test(u)) return 'PVC'; if (/CEL|STEEL|ST37|P235|PASLANMAZ|SS/.test(u)) return 'CELIK'; if (/DUK|DUCT|DOKME|GGG/.test(u)) return 'DUKTIL'; return u || 'DUKTIL'; };

  /* boru ekseni: köşelerde standart (R = 1.5·DN) dirsekli yol */
  C.pipePath = function (e) {
    const c = e._c || (e._c = {}); if (c.path) return c.path;
    const pts = e.pts.map(M.p3), out = [pts[0]], elbows = [];
    const R0 = e.br ? e.br * e.dn / 1000 : C.bendR(e.mat, e.dn) / 1000; const seams = [];
    const trimmed = pts.map(() => 0);
    for (let i = 1; i < pts.length - 1; i++) {
      const V = pts[i], u1 = M.norm(M.sub(V, pts[i - 1])), u2 = M.norm(M.sub(pts[i + 1], V));
      const cs = Math.max(-1, Math.min(1, M.dot(u1, u2)));
      if (cs > 0.99995 || e.noElbow) { out.push(V); continue; }
      const th = Math.acos(cs);
      let t = R0 * Math.tan(th / 2);
      const l1 = M.dist(V, pts[i - 1]) - trimmed[i - 1], l2 = M.dist(pts[i + 1], V) / 2;
      t = Math.max(0, Math.min(t, l1 * 0.98, l2 * 0.98));
      const R = t / Math.tan(th / 2);
      const P1 = M.sub(V, M.mul(u1, t)), P2 = M.add(V, M.mul(u2, t));
      const bis = M.norm(M.sub(u2, u1)), Cc = M.add(V, M.mul(bis, R / Math.cos(th / 2)));
      const a = M.sub(P1, Cc), b = M.sub(P2, Cc), n = Math.max(2, Math.ceil(th / (Math.PI / 12)));
      seams.push(out.length); for (let k = 0; k <= n; k++) { const s = k / n, w1 = Math.sin((1 - s) * th) / Math.sin(th), w2 = Math.sin(s * th) / Math.sin(th); out.push(M.add(Cc, M.add(M.mul(a, w1), M.mul(b, w2)))); }
      seams.push(out.length - 1); trimmed[i] = t;
      const deg = M.deg(th), std = STD_ANG.reduce((x, y) => Math.abs(y - deg) < Math.abs(x - deg) ? y : x);
      elbows.push({ p: V, ang: deg, std, R });
    }
    out.push(pts[pts.length - 1]);
    return (c.path = { pts: out, elbows, seams });
  };
  C.pipeElbows = e => C.pipePath(e).elbows;

  C.T.pipe.r = e => (e.od || C.pipeOD(e.mat, e.dn)) / 2000;
  const offRun = (run, r) => { // 2B çoklu çizgiyi ±r ötele (gönye)
    const n = run.length, L2 = [], R2 = [];
    for (let i = 0; i < n; i++) {
      const dPrev = i > 0 ? M.norm([run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1], 0]) : null, dNext = i < n - 1 ? M.norm([run[i + 1][0] - run[i][0], run[i + 1][1] - run[i][1], 0]) : null;
      const d0 = dPrev || dNext, d1 = dNext || dPrev;
      const n0 = [-d0[1], d0[0]], n1 = [-d1[1], d1[0]];
      let nv = [n0[0] + n1[0], n0[1] + n1[1]]; const nl = Math.hypot(nv[0], nv[1]) || 1; nv = [nv[0] / nl, nv[1] / nl];
      const k = r / Math.max(0.35, nv[0] * n0[0] + nv[1] * n0[1]);
      L2.push([run[i][0] + nv[0] * k, run[i][1] + nv[1] * k, run[i][2]]); R2.push([run[i][0] - nv[0] * k, run[i][1] - nv[1] * k, run[i][2]]);
    }
    return [L2, R2];
  };
  const readable = deg => { deg = ((deg % 360) + 360) % 360; if (deg > 90 && deg <= 270) deg -= 180; return deg; };

  Object.assign(C.T.pipe, {
    prims: e => {
      const r = C.T.pipe.r(e), path = C.pipePath(e).pts, out = [];
      let run = [path[0]];
      const flush = () => { if (run.length > 1) { const [a, b] = offRun(run, r); out.push(P(a, false), P(b, false), P(run, false, { lt: 'CENTER', lw: 13 })); } run = []; };
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i], hl = M.dist2(a, b);
        if (hl < 1e-6) { flush(); if (Math.abs((b[2] || 0) - (a[2] || 0)) > 1e-6) { out.push(CI(a, r)); out.push(L([a[0] - r * 0.7, a[1], a[2]], [a[0] + r * 0.7, a[1], a[2]], { lt: 'CENTER', lw: 13 }), L([a[0], a[1] - r * 0.7, a[2]], [a[0], a[1] + r * 0.7, a[2]], { lt: 'CENTER', lw: 13 })); } run = [b]; continue; }
        if (!run.length) run = [a];
        run.push(b);
      }
      flush();
      if (e.label) {
        let best = null, bl = 0; for (let i = 1; i < e.pts.length; i++) { const hl = M.dist2(e.pts[i - 1], e.pts[i]); if (hl > bl) { bl = hl; best = [M.p3(e.pts[i - 1]), M.p3(e.pts[i])]; } }
        if (best) { const dg = readable(M.deg(M.ang(best[0], best[1]))), mid = M.lerp(best[0], best[1], 0.5), up = [-Math.sin(dg * RAD), Math.cos(dg * RAD), 0], h = C.annoH(C.doc.set.textH); out.push(TX(M.add(mid, M.mul(up, r + h * 0.6)), h, e.label, dg * RAD, 'C')); }
      }
      return out;
    },
    mesh: e => { const r = C.T.pipe.r(e), pp = C.pipePath(e); const pts = pp.pts.filter((p, i) => i === 0 || M.dist(p, pp.pts[i - 1]) > 1e-6); return pts.length > 1 ? [{ t: 'tube', pts, r, seg: 18, seams: pp.seams }] : []; },
    info: e => { let l = 0; for (let i = 1; i < e.pts.length; i++) l += M.dist(e.pts[i - 1], e.pts[i]); const el = C.pipeElbows(e); return `DN${e.dn} ${e.mat || ''} uzunluk=${M.fmt(l)} m${el.length ? ', ' + el.length + ' dirsek (' + el.map(x => x.std + '°').join(', ') + ')' : ''}`; },
  });

  /* ---------- FİTİNG varlığı: te, flans, adaptor, reduksiyon ---------- */
  C.T.fit = {
    label: 'Fitting', ifc: 'IfcPipeFitting',
    dims: e => { const r = C.pipeOD(e.mat, e.dn) / 2000, fdn = C.flangeDN(e.mat, e.dn), D = C.flangeOD(fdn) / 2000, tf = fdn <= 150 ? 0.02 : fdn <= 400 ? 0.026 : 0.034; return { r, D, tf, C: C.teeC(e.mat, e.dn) / 1000 }; },
    prims: e => {
      const { r, D, tf, C: Ct } = C.T.fit.dims(e), p = M.p3(e.p), f = C.frame(p, e.rot), out = [];
      const rect = (x0, y0, x1, y1, o) => P([f.at(x0, y0), f.at(x1, y0), f.at(x1, y1), f.at(x0, y1)], true, o);
      if (e.kind === 'te') {
        const r2 = C.pipeOD(e.mat, e.dn2 || e.dn) / 2000, Cm = Ct, Cb = Ct;
        out.push(rect(-Cm, -r * 1.08, Cm, r * 1.08, { lw: 35 }));
        const g = C.frame(p, e.ang2 != null ? e.ang2 : (e.rot || 0) + 90);
        out.push(P([g.at(r * 1.08, -r2 * 1.08), g.at(Cb, -r2 * 1.08), g.at(Cb, r2 * 1.08), g.at(r * 1.08, r2 * 1.08)], false, { lw: 35 }));
        out.push(L(g.at(0, 0), g.at(Cb, 0), { lt: 'CENTER', lw: 13 }));
      } else if (e.kind === 'flans') { out.push(rect(-tf, -D, 0, D, { lw: 35 }), rect(0, -r * 1.25, tf * 2.5, r * 1.25)); }
      else if (e.kind === 'adaptor') { const La = e.len || 0.2; out.push(rect(-tf, -D, 0, D, { lw: 35 }), rect(0, -r * 1.35, tf * 1.6, r * 1.35), rect(tf * 1.6, -r * 1.06, La, r * 1.06)); }
      else if (e.kind === 'reduksiyon') { const r2 = (e.dn2 || e.dn) / 2000, Lr = Math.max(0.15, (r - r2) * 6); out.push(P([f.at(0, -r), f.at(Lr, -r2), f.at(Lr, r2), f.at(0, r)], true, { lw: 35 })); }
      return out;
    },
    mesh: e => {
      const { r, D, tf, C: Ct } = C.T.fit.dims(e), p = M.p3(e.p), z = p[2], f = C.frame(p, e.rot), A = (x, y) => f.at(x, y, z), out = [];
      if (e.kind === 'te') { const r2 = C.pipeOD(e.mat, e.dn2 || e.dn) / 2000, Cm = Ct, Cb = Ct, g = C.frame(p, e.ang2 != null ? e.ang2 : (e.rot || 0) + 90); out.push(cylSeg(A(-Cm, 0), A(Cm, 0), r * 1.08, { seg: 16 }), cylSeg(g.at(0, 0, z), g.at(Cb, 0, z), r2 * 1.08, { seg: 16 })); }
      else if (e.kind === 'flans') out.push(cylSeg(A(-tf, 0), A(0, 0), D, { seg: 24 }), cylSeg(A(0, 0), A(tf * 2.5, 0), r * 1.25, { seg: 16 }));
      else if (e.kind === 'adaptor') { const La = e.len || 0.2; out.push(cylSeg(A(-tf, 0), A(0, 0), D, { seg: 24 }), cylSeg(A(0, 0), A(tf * 1.6, 0), r * 1.35, { seg: 16 }), cylSeg(A(tf * 1.6, 0), A(La, 0), r * 1.06, { seg: 16 })); }
      else if (e.kind === 'reduksiyon') { const r2 = (e.dn2 || e.dn) / 2000, Lr = Math.max(0.15, (r - r2) * 6); out.push(cylSeg(A(0, 0), A(Lr / 2, 0), r, { seg: 16 }), cylSeg(A(Lr / 2, 0), A(Lr, 0), r2, { seg: 16 })); }
      return out.filter(Boolean);
    },
    snaps: e => [{ p: M.p3(e.p), k: 'cen' }],
    xf: (e, X) => { e.p = X.p(e.p); const v = X.v([Math.cos((e.rot || 0) * RAD), Math.sin((e.rot || 0) * RAD), 0]); e.rot = M.deg(Math.atan2(v[1], v[0])); if (e.ang2 != null) { const w = X.v([Math.cos(e.ang2 * RAD), Math.sin(e.ang2 * RAD), 0]); e.ang2 = M.deg(Math.atan2(w[1], w[0])); } },
    info: e => C.fitName(e) + ' DN' + e.dn + (e.dn2 && e.dn2 !== e.dn ? '/' + e.dn2 : ''),
  };
  C.fitName = e => e.kind === 'te' ? ((e.dn2 || e.dn) === e.dn ? 'TE (eşit)' : 'TE (inegal)') : e.kind === 'flans' ? 'Kaynak boyunlu flanş' : e.kind === 'adaptor' ? `Flanş adaptörü ${C.matKind(e.mat) === 'PVC' ? 'PVC' : 'PE'} + gevşek flanş` : e.kind === 'reduksiyon' ? 'Redüksiyon' : 'Fitting';

  /* yeni borunun uçları başka bir borunun gövdesine değiyorsa TE ekle */
  C.autoTee = function (pe) {
    const added = [];
    for (const [q, nxt] of [[pe.pts[0], pe.pts[1]], [pe.pts[pe.pts.length - 1], pe.pts[pe.pts.length - 2]]]) {
      for (const o of C.doc.ents) {
        if (o === pe || o.type !== 'pipe') continue;
        const ro = o.dn / 2000;
        for (let i = 1; i < o.pts.length; i++) {
          const a = M.p3(o.pts[i - 1]), b = M.p3(o.pts[i]), ab = M.sub(b, a), L2 = M.dot(ab, ab); if (L2 < 1e-9) continue;
          const t = M.dot(M.sub(q, a), ab) / L2; if (t < 0.02 || t > 0.98) continue;
          const pr = M.add(a, M.mul(ab, t)); if (M.dist(pr, M.p3(q)) > ro + 0.02) continue;
          const sl = Math.sqrt(L2); if (t * sl < ro * 2.5 || (1 - t) * sl < ro * 2.5) continue;
          const f = C.newEnt('fit', { kind: 'te', p: pr, rot: M.deg(Math.atan2(ab[1], ab[0])), ang2: M.deg(M.ang(pr, nxt)), dn: o.dn, dn2: pe.dn, mat: o.mat, layer: o.layer });
          C.add(f); added.push(f); break;
        }
      }
    }
    return added;
  };

  /* boru çizim komutunu TE algılamasıyla sar */
  const pipeCmd = C.cmds['BORU'];
  if (pipeCmd) {
    const fn0 = pipeCmd.fn;
    pipeCmd.fn = async (I, Cx) => {
      const before = new Set(C.doc.ents.map(e => e.id));
      await fn0(I, Cx);
      const nw = C.doc.ents.filter(e => e.type === 'pipe' && !before.has(e.id));
      for (const pe of nw) { const t = C.autoTee(pe); if (t.length) C.log(t.map(x => C.fitName(x) + ` DN${x.dn}/${x.dn2}`).join(', ') + ' eklendi.'); }
      if (nw.length && !C.cmd.scriptMode) C.log('İpucu: hatta vana koymak için VB (BORUVANA) komutunu kullanın.');
    };
    pipeCmd.help = 'Boru (3B, standart dirsekli, otomatik TE). BORU DN=200 Z=-1.5 MAL=PE|PVC|CELIK|DUKTIL nokta nokta ... (Z seçeneği ile düşey parça)';
  }

  /* ---------- HATTA VANA: boruyu böler, vanayı eksene oturtur, malzemeye göre flanş / adaptör ekler ---------- */
  C.nearestOnPipes = function (p, tol) {
    let best = null;
    for (const e of C.doc.ents) {
      if (e.type !== 'pipe' || !C.layer(e.layer).on) continue;
      for (let i = 1; i < e.pts.length; i++) {
        const a = M.p3(e.pts[i - 1]), b = M.p3(e.pts[i]), ab = [b[0] - a[0], b[1] - a[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1];
        if (L2 < 1e-12) continue;
        let t = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2; t = Math.max(0, Math.min(1, t));
        const q = M.lerp(a, b, t), d = M.dist2(q, p);
        if (d < (tol != null ? tol : e.dn / 2000 + 0.3) && (!best || d < best.d)) best = { e, i, t, q, d };
      }
    }
    return best;
  };
  const VALVE_KINDS = [['S', 'Sürgülü vana'], ['K', 'Kelebek vana'], ['C', 'Çekvalf'], ['P', 'Pislik tutucu'], ['D', 'Demontaj parçası'], ['B', 'Diğer (kütüphaneden ad)']];
  C.addCommand(['BORUVANA', 'VB', 'HATVANA'], 'Boru üzerine vana: boruyu böler, vanayı eksenine/kotuna oturtur; PE/PVC için flanş adaptörü, çelik için kaynak boyunlu flanş ekler. Kütüphanede 3B modeliniz varsa onu kullanır.', async (I) => {
    const k = await I.kw('Vana cinsi', VALVE_KINDS.map(([a, b]) => [a, b]), C.cmd.lastVK || 'S'); C.cmd.lastVK = k;
    let tur = (VALVE_KINDS.find(v => v[0] === k) || [])[1];
    let byName = null;
    if (k === 'B') { byName = await I.str('Kütüphanedeki blok adı (ya da adın bir parçası)'); if (!byName) return; }
    for (; ;) {
      const p = await I.pt('Vana konumu (boru üzerine tıklayın, Enter = bitir)'); if (!p || typeof p === 'string') return;
      const hit = C.nearestOnPipes(p); if (!hit) { C.warn('Yakında boru yok.'); continue; }
      const e = hit.e, a = M.p3(e.pts[hit.i - 1]), b = M.p3(e.pts[hit.i]), u = M.norm(M.sub(b, a));
      if (Math.abs(u[2]) > 0.2) { C.warn('Düşey/eğimli boru parçasına vana bu sürümde konamıyor.'); continue; }
      let def = byName ? C.blib.all().find(d => C.ascii(d.name).toLowerCase().includes(C.ascii(byName).toLowerCase()) && (!d.dn || d.dn === e.dn)) || C.blib.all().find(d => C.ascii(d.name).toLowerCase().includes(C.ascii(byName).toLowerCase())) : C.resolveDef(tur, C.flangeDN(e.mat, e.dn), 'plan');
      if (!def) { C.warn('Uygun blok bulunamadı.'); continue; }
      def = C.useDef(def);
      const uk = C.unitK(def), Lv = (def.bb[2] - def.bb[0]) * uk;
      const mk = C.matKind(e.mat), conn = mk === 'PE' || mk === 'PVC' ? 'adaptor' : mk === 'CELIK' ? 'flans' : null;
      const La = conn === 'adaptor' ? C.adaptorLen(e.mat, e.dn) / 1000 : 0;
      const segLen = M.dist(a, b), tc = hit.t * segLen, half = Lv / 2 + La;
      if (tc < half + 0.02 || segLen - tc < half + 0.02) { C.warn('Vana bu parçaya sığmıyor (parçanın ortasına yakın tıklayın).'); continue; }
      const P0 = M.add(a, M.mul(u, tc)), P1 = M.sub(P0, M.mul(u, half)), P2 = M.add(P0, M.mul(u, half));
      const base = { dn: e.dn, mat: e.mat, layer: e.layer, color: e.color, lt: e.lt, lw: e.lw, br: e.br };
      const A = Object.assign({}, base, { pts: [...e.pts.slice(0, hit.i).map(M.p3), P1], label: e.label });
      const B = Object.assign({}, base, { pts: [P2, ...e.pts.slice(hit.i).map(M.p3)], label: '' });
      C.remove([e]); C.add(C.newEnt('pipe', A)); C.add(C.newEnt('pipe', B));
      const rot = M.deg(Math.atan2(u[1], u[0]));
      const vl = C.doc.cur.layer === '0' ? C.std('VANA') : C.doc.cur.layer;
      C.add(C.newEnt('blk', { ref: def.id, p: P0, rot, sx: uk, sy: uk, tur: def.tur, dn: C.flangeDN(e.mat, e.dn), view: 'plan', layer: vl }));
      if (conn) for (const [pt, ang] of [[M.sub(P0, M.mul(u, Lv / 2)), rot + 180], [M.add(P0, M.mul(u, Lv / 2)), rot]]) C.add(C.newEnt('fit', { kind: conn, p: pt, rot: ang, dn: e.dn, mat: e.mat, len: La, layer: e.layer }));
      C.log(`${def.tur} DN${e.dn} yerleşti (eksen kotu ${M.fmt(P0[2], 2)})${conn ? ', ' + (conn === 'adaptor' ? 'flanş adaptörleri' : 'kaynak boyunlu flanşlar') + ' eklendi' : ''}.`);
      if (C.cmd.scriptMode) return;
    }
  });

  /* ---------- standart fitting blokları (malzemeye göre, mm, 3B gövdeli) ---------- */
  C.FIT_TYPES = [['dirsek90', 'Dirsek 90°'], ['dirsek45', 'Dirsek 45°'], ['te', 'TE (eşit)'], ['tei', 'TE (inegal)'], ['red', 'Redüksiyon'], ['flans', 'Flanş / flanş adaptörü'], ['kor', 'Kör flanş']];
  C.fittingDef = function (mat, kind, dn, dn2) {
    const mk = C.matKind(mat), od = C.pipeOD(mk, dn), r = od / 2, ents = [], tubes = [];
    const E = (type, pr) => ents.push(Object.assign({ type, layer: '0', color: 0, lt: 'BYBLOCK', lw: -2 }, pr));
    const cl = (a, b) => E('line', { a, b, lt: 'CENTER', lw: 13 });
    const outline = (pts, rr) => { const [Lp, Rp] = offRun(pts, rr); E('pline', { pts: Lp, closed: false }); E('pline', { pts: Rp, closed: false }); E('line', { a: Lp[0], b: Rp[0] }); E('line', { a: Lp[Lp.length - 1], b: Rp[Rp.length - 1] }); E('pline', { pts, closed: false, lt: 'CENTER', lw: 13 }); };
    const fdn = C.flangeDN(mk, dn), D = C.flangeOD(fdn), tf = fdn <= 150 ? 20 : fdn <= 400 ? 26 : 34;
    let tur, name, view = 'plan', dnLabel = dn;
    const sz = (mk === 'PE' || mk === 'PVC') ? 'Ø' + dn : 'DN' + dn;
    if (kind === 'dirsek90' || kind === 'dirsek45') {
      const ang = (kind === 'dirsek90' ? 90 : 45) * RAD, R = C.bendR(mk, dn), t = R * Math.tan(ang / 2), cx = -t, cy = R, n = kind === 'dirsek90' ? 12 : 6, pts = [];
      for (let k = 0; k <= n; k++) { const a = -Math.PI / 2 + ang * k / n; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a), 0]); }
      outline(pts, r); tubes.push({ t: 'tube', pts, r, seg: 20 });
      tur = 'Dirsek'; name = `Dirsek ${kind === 'dirsek90' ? 90 : 45}° ${sz} ${mk}`;
    } else if (kind === 'te' || kind === 'tei') {
      const d2 = kind === 'tei' ? (dn2 || dn) : dn, r2 = C.pipeOD(mk, d2) / 2, Cc = C.teeC(mk, dn);
      outline([[-Cc, 0, 0], [Cc, 0, 0]], r); outline([[0, r * 0.98, 0], [0, Cc, 0]], r2);
      tubes.push({ t: 'tube', pts: [[-Cc, 0, 0], [Cc, 0, 0]], r, seg: 20 }, { t: 'tube', pts: [[0, 0, 0], [0, Cc, 0]], r: r2, seg: 20 });
      tur = d2 === dn ? 'TE (eşit)' : 'TE (inegal)'; name = `${tur} ${sz}${d2 !== dn ? '×' + (mk === 'PE' || mk === 'PVC' ? 'Ø' : 'DN') + d2 : ''} ${mk}`; dnLabel = dn;
    } else if (kind === 'red') {
      const d2 = dn2 || dn, r2 = C.pipeOD(mk, d2) / 2, H = mk === 'CELIK' ? Math.max(90, Math.min(od * 0.9, 510)) : Math.max(120, od * 1.2);
      E('pline', { pts: [[0, -r, 0], [H * 0.15, -r, 0], [H * 0.85, -r2, 0], [H, -r2, 0], [H, r2, 0], [H * 0.85, r2, 0], [H * 0.15, r, 0], [0, r, 0]], closed: true }); cl([-15, 0, 0], [H + 15, 0, 0]);
      tubes.push({ t: 'tube', pts: [[0, 0, 0], [H * 0.15, 0, 0], [H * 0.85, 0, 0], [H, 0, 0]], rs: [r, r, r2, r2], seg: 20 });
      tur = 'Redüksiyon'; name = `Redüksiyon ${sz}×${d2} ${mk}`;
    } else if (kind === 'flans') {
      if (mk === 'PE' || mk === 'PVC') { const La = C.adaptorLen(mk, dn); E('pline', { pts: [[-tf, -D / 2, 0], [0, -D / 2, 0], [0, D / 2, 0], [-tf, D / 2, 0]], closed: true }); E('pline', { pts: [[0, -r * 1.35, 0], [tf * 1.6, -r * 1.35, 0], [tf * 1.6, r * 1.35, 0], [0, r * 1.35, 0]], closed: true }); E('pline', { pts: [[tf * 1.6, -r, 0], [La, -r, 0], [La, r, 0], [tf * 1.6, r, 0]], closed: true }); cl([-tf - 15, 0, 0], [La + 15, 0, 0]);
        tubes.push({ t: 'tube', pts: [[-tf, 0, 0], [0, 0, 0]], r: D / 2, seg: 24 }, { t: 'tube', pts: [[0, 0, 0], [tf * 1.6, 0, 0]], r: r * 1.35, seg: 20 }, { t: 'tube', pts: [[tf * 1.6, 0, 0], [La, 0, 0]], r, seg: 20 });
        tur = 'Flanş adaptörü'; name = `Flanş adaptörü ${sz} ${mk} + gevşek flanş DN${fdn} PN16`; }
      else { const hub = tf * 2.5; E('pline', { pts: [[-tf, -D / 2, 0], [0, -D / 2, 0], [0, D / 2, 0], [-tf, D / 2, 0]], closed: true }); E('pline', { pts: [[0, -r * 1.25, 0], [hub, -r, 0], [hub, r, 0], [0, r * 1.25, 0]], closed: true }); cl([-tf - 15, 0, 0], [hub + 15, 0, 0]);
        tubes.push({ t: 'tube', pts: [[-tf, 0, 0], [0, 0, 0]], r: D / 2, seg: 24 }, { t: 'tube', pts: [[0, 0, 0], [hub, 0, 0]], rs: [r * 1.25, r], seg: 20 });
        tur = 'Flanş'; name = `${mk === 'CELIK' ? 'Kaynak boyunlu flanş' : 'Flanş'} DN${dn} PN16`; }
    } else { // kör flanş
      E('pline', { pts: [[-tf, -D / 2, 0], [0, -D / 2, 0], [0, D / 2, 0], [-tf, D / 2, 0]], closed: true }); cl([-tf - 15, 0, 0], [15, 0, 0]);
      tubes.push({ t: 'tube', pts: [[-tf, 0, 0], [0, 0, 0]], r: D / 2, seg: 24 }); tur = 'Kör flanş'; name = `Kör flanş DN${fdn} PN16`; dnLabel = fdn;
    }
    const t = { pos: [], nrm: [], edges: [] }; tubes.forEach(d => C.meshTris(d, t));
    const def = { id: `FIT_${mk}_${kind}_${dn}_${dn2 || ''}`, name, tur, dn: dnLabel, view, unit: 'mm', ents, mesh3d: C.trisToMesh(t.pos), src: C.CATALOG[mk] ? C.CATALOG[mk].name : mk, mat: mk };
    def.bb = C.defBox(def); return def;
  };
  C.addCommand(['FITEKLE', 'FITTING', 'FITTINGEKLE'], 'Standart fitting yerleştir: FITEKLE MAL=PE TIP=dirsek90|dirsek45|te|tei|red|flans|kor DN=200 [DN2=160] nokta [ölçek] [açı]', async (I) => {
    const kv = {}; C.cmd.queue = C.cmd.queue.filter(t => { const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; });
    const mat = kv.MAL || await I.kw('Malzeme', [['PE'], ['PVC'], ['CELIK', 'Çelik'], ['DUKTIL', 'Duktil']], 'PE');
    const kind = (kv.TIP || await I.kw('Fitting', C.FIT_TYPES.map(([k, l]) => [k, l]), 'dirsek90')).toLowerCase();
    const dn = kv.DN ? +kv.DN : await I.num('Çap (PE/PVC: dış çap Ø mm, çelik/duktil: DN)', 200);
    const dn2 = (kind === 'tei' || kind === 'red') ? (kv.DN2 ? +kv.DN2 : await I.num('İkinci (küçük) çap', Math.round(dn * 0.8))) : null;
    const def = C.fittingDef(mat, kind, dn, dn2);
    await C.insertBlock(I, def, { f: kv.OLCEK ? C.num(kv.OLCEK) : (C.cmd.scriptMode ? 1 : undefined), rot: kv.ACI != null ? C.num(kv.ACI) : undefined });
  });
})(window.C);

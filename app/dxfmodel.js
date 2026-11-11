/* ArıtmaCAD — DXF PLANDAN 3B MODEL (yarı otomatik)
   Açılmış bir DXF / DWG planında: seçilen pencere içindeki betonarme / duvar katmanlarındaki çizgilerden
   • kolonlar (küçük kapalı dikdörtgen / daire),
   • perdeler ve duvarlar (karşılıklı paralel çizgi çiftleri: aradaki mesafe = kalınlık, orta aks = duvar ekseni),
   • pencere / kapı (aynı eksendeki duvar parçaları arasındaki boşlukta kapı-pencere katmanı varsa; yay varsa kapı),
   • taban (radye) ve üst döşeme (betonarme dış sınırından)
   tanınır; alt / üst kot verilerek 3B elemanlar (PERDE, KOLON, DÖŞEME …) oluşturulur. İkinci planda aynı aks kesişimi seçilerek katlar üst üste oturtulur. */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd;
  const I_ = () => C._ins;
  const LIN = new Set(['line', 'pline', 'arc', 'circle', 'polyline', 'lwpolyline', 'ellipse', 'spline']);
  const segsIn = (lays, win) => {
    const out = [], set = new Set(lays);
    for (const e of C.doc.ents) {
      if (!set.has(e.layer) || !LIN.has(e.type)) continue; const b = C.bbox(e); if (!b || b[0] < win[0] - 1e-6 || b[2] > win[2] + 1e-6 || b[1] < win[1] - 1e-6 || b[3] > win[3] + 1e-6) continue;
      let prs; try { prs = C.prims(e); } catch (err) { continue; }
      for (const pr of prs) for (const [a, b2] of C.primSegs(pr)) if (M.dist2(a, b2) > 1e-4) out.push({ a: [a[0], a[1]], b: [b2[0], b2[1]], e, arc: e.type === 'arc' || e.type === 'circle' });
    }
    return out;
  };
  const kots = () => { const v = new Set(); for (const e of C.doc.ents) { if (e.type !== 'text' && e.type !== 'kot') continue; const s = String(e.type === 'kot' ? (e.v != null ? e.v : '') : e.s || '').replace(/%%[uUoO]/g, '').replace('±', '').replace(',', '.').trim(); const m = /^([+\-]?)\s*(\d{1,3}\.\d{2})(\s|$)/.exec(s); if (m) v.add((m[1] === '-' ? -1 : 1) * parseFloat(m[2])); } return [...v].sort((a, b) => a - b); };
  const pick2 = async (I, msg) => { const a = await I.pt(msg + ' — 1. köşe'); if (!a || typeof a === 'string') return null; E.base = a; E.preview = c => [C.prim.P([a, [c[0], a[1], 0], c, [a[0], c[1], 0]], true, { lt: 'DASHED', color: 3 })]; const b = await I.pt('Karşı köşe'); E.preview = null; E.base = null; if (!b || typeof b === 'string') return null; return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; };
  /* kolonlar: küçük kapalı yüzler */
  const findCols = (segs, kmin, kmax) => {
    const faces = segs.length ? C.planarFaces(segs.map(s => [s.a, s.b])) : [], cols = [];
    for (const f of faces) {
      const A = M.polyArea(f); if (A <= 0) continue; const xs = f.map(p => p[0]), ys = f.map(p => p[1]);
      // yönlü sınır kutusu: en uzun kenar doğrultusunda
      let best = null; for (let i = 0; i < f.length; i++) { const a = f[i], b = f[(i + 1) % f.length], l = M.dist2(a, b); if (l < 1e-6) continue; const u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], pu = f.map(p => p[0] * u[0] + p[1] * u[1]), pv = f.map(p => -p[0] * u[1] + p[1] * u[0]), w = Math.max(...pu) - Math.min(...pu), h = Math.max(...pv) - Math.min(...pv); if (!best || w * h < best.w * best.h) best = { u, w, h, cu: (Math.max(...pu) + Math.min(...pu)) / 2, cv: (Math.max(...pv) + Math.min(...pv)) / 2 }; }
      if (!best) continue; const w = Math.max(best.w, best.h), h = Math.min(best.w, best.h); void xs; void ys;
      if (w > kmax + 1e-6 || h < kmin - 1e-6 || w / h > 2.6) continue;
      const fill = A / (best.w * best.h), circ = f.length > 10 && Math.abs(A - Math.PI * w * w / 4) < 0.08 * A;
      if (fill < 0.88 && !circ) continue;
      const c = [best.cu * best.u[0] - best.cv * best.u[1], best.cu * best.u[1] + best.cv * best.u[0]];
      cols.push({ c, b: best.w, d: best.h, rot: Math.atan2(best.u[1], best.u[0]) * 180 / Math.PI, circ, D: w, f });
    }
    return cols;
  };
  /* duvarlar: karşılıklı paralel çizgi çiftleri */
  const findWalls = (segs, tmin, tmax, lmin) => {
    const S = segs.filter(s => !s.arc && M.dist2(s.a, s.b) >= Math.min(0.12, lmin)).map(s => { const l = M.dist2(s.a, s.b); let u = [(s.b[0] - s.a[0]) / l, (s.b[1] - s.a[1]) / l]; if (u[0] < -1e-9 || (Math.abs(u[0]) < 1e-9 && u[1] < 0)) u = [-u[0], -u[1]]; const n = [-u[1], u[0]], c = n[0] * s.a[0] + n[1] * s.a[1], t0 = u[0] * s.a[0] + u[1] * s.a[1], t1 = u[0] * s.b[0] + u[1] * s.b[1]; return { u, n, c, t0: Math.min(t0, t1), t1: Math.max(t0, t1), ang: Math.atan2(u[1], u[0]), s }; });
    const pieces = [];
    for (let i = 0; i < S.length; i++) {
      const A = S[i]; let best = null;
      for (let j = 0; j < S.length; j++) {
        if (i === j) continue; const B = S[j]; if (Math.abs(A.u[0] * B.u[1] - A.u[1] * B.u[0]) > 0.009) continue; // paralel
        const d = Math.abs(B.n[0] * B.s.a[0] + B.n[1] * B.s.a[1] - A.c) * (A.n[0] * B.n[0] + A.n[1] * B.n[1] > 0 ? 1 : 1), dd = (A.n[0] * B.s.a[0] + A.n[1] * B.s.a[1]) - A.c;
        if (Math.abs(dd) < tmin - 1e-6 || Math.abs(dd) > tmax + 1e-6) continue; void d;
        const b0 = Math.min(A.u[0] * B.s.a[0] + A.u[1] * B.s.a[1], A.u[0] * B.s.b[0] + A.u[1] * B.s.b[1]), b1 = Math.max(A.u[0] * B.s.a[0] + A.u[1] * B.s.a[1], A.u[0] * B.s.b[0] + A.u[1] * B.s.b[1]);
        const o0 = Math.max(A.t0, b0), o1 = Math.min(A.t1, b1); if (o1 - o0 < Math.min(lmin, 0.6 * Math.min(A.t1 - A.t0, b1 - b0))) continue;
        const side = Math.sign(dd); if (!best || Math.abs(dd) < Math.abs(best.dd) - 1e-6) best = { j, dd, o0, o1, b0, b1, side };
      }
      if (!best) continue;
      // yalnız karşılıklı en yakın eşler (aynı çift iki kez sayılmasın)
      const B = S[best.j]; let back = null; for (let k = 0; k < S.length; k++) { if (k === best.j) continue; const Cc = S[k]; if (Math.abs(B.u[0] * Cc.u[1] - B.u[1] * Cc.u[0]) > 0.009) continue; const dd2 = (A.n[0] * Cc.s.a[0] + A.n[1] * Cc.s.a[1]) - (A.n[0] * B.s.a[0] + A.n[1] * B.s.a[1]); if (Math.sign(dd2) !== -best.side || Math.abs(dd2) < tmin - 1e-6 || Math.abs(dd2) > tmax + 1e-6) continue; const c0 = Math.min(A.u[0] * Cc.s.a[0] + A.u[1] * Cc.s.a[1], A.u[0] * Cc.s.b[0] + A.u[1] * Cc.s.b[1]), c1 = Math.max(A.u[0] * Cc.s.a[0] + A.u[1] * Cc.s.a[1], A.u[0] * Cc.s.b[0] + A.u[1] * Cc.s.b[1]); if (Math.min(best.b1, c1) - Math.max(best.b0, c0) < 0.6 * Math.min(best.b1 - best.b0, c1 - c0)) continue; if (!back || Math.abs(dd2) < Math.abs(back)) back = dd2; }
      if (back != null && Math.abs(back) < Math.abs(best.dd) - 1e-6) continue; // B'nin daha yakın eşi var
      if (i > best.j && Math.abs(best.dd) > 0 && pieces.some(p => p.i === best.j && p.j === i)) continue;
      // uzatma: birleşim köşelerinde kısa çizgi uzun çizgiye kadar (en fazla bir kalınlık)
      const t = Math.abs(best.dd), u0 = Math.min(A.t0, best.b0), u1 = Math.max(A.t1, best.b1), s0 = best.o0 - u0 <= t + 0.06 ? u0 : best.o0, s1 = u1 - best.o1 <= t + 0.06 ? u1 : best.o1;
      pieces.push({ i, j: best.j, u: A.u, n: A.n, c: A.c + best.dd / 2, t, s0, s1 });
    }
    // aynı eksen ve kalınlıktaki parçaları birleştir
    const W = []; pieces.sort((a, b) => a.s0 - b.s0);
    for (const p of pieces) { const q = W.find(w => Math.abs(w.u[0] * p.u[1] - w.u[1] * p.u[0]) < 0.009 && Math.abs(w.c - p.c) < 0.01 && Math.abs(w.t - p.t) < 0.012 && p.s0 <= w.s1 + 0.01 && p.s1 >= w.s0 - 0.01); if (q) { q.s0 = Math.min(q.s0, p.s0); q.s1 = Math.max(q.s1, p.s1); } else W.push(Object.assign({}, p)); }
    return W.filter(w => w.s1 - w.s0 >= lmin);
  };
  /* aynı eksendeki duvarlar arasında kapı / pencere boşlukları */
  const joinOpenings = (W, opSegs) => {
    const res = [], used = new Set();
    const groups = []; for (const w of W) { const g = groups.find(g2 => Math.abs(g2[0].u[0] * w.u[1] - g2[0].u[1] * w.u[0]) < 0.009 && Math.abs(g2[0].c - w.c) < 0.01 && Math.abs(g2[0].t - w.t) < 0.012); if (g) g.push(w); else groups.push([w]); }
    for (const g of groups) {
      g.sort((a, b) => a.s0 - b.s0); let cur = Object.assign({ ops: [] }, g[0]);
      for (let k = 1; k < g.length; k++) {
        const w = g[k], gap = w.s0 - cur.s1;
        if (gap > 0.4 && gap < 4.0) {
          const P = s => [cur.u[0] * s + cur.n[0] * cur.c, cur.u[1] * s + cur.n[1] * cur.c], m0 = P(cur.s1), m1 = P(w.s0), lo = [Math.min(m0[0], m1[0]) - cur.t, Math.min(m0[1], m1[1]) - cur.t], hi = [Math.max(m0[0], m1[0]) + cur.t, Math.max(m0[1], m1[1]) + cur.t];
          const hit = opSegs.filter(s => Math.min(s.a[0], s.b[0]) >= lo[0] - 1.2 && Math.max(s.a[0], s.b[0]) <= hi[0] + 1.2 && Math.min(s.a[1], s.b[1]) >= lo[1] - 1.2 && Math.max(s.a[1], s.b[1]) <= hi[1] + 1.2 && [s.a, s.b].some(p => p[0] >= lo[0] && p[0] <= hi[0] && p[1] >= lo[1] && p[1] <= hi[1]));
          if (hit.length) { cur.ops.push({ s: (cur.s1 + w.s0) / 2 - cur.s0, w: gap, kind: hit.some(s => s.arc) ? 'kapi' : 'pencere' }); hit.forEach(s => used.add(s)); cur.s1 = w.s1; continue; }
        }
        res.push(cur); cur = Object.assign({ ops: [] }, w);
      }
      res.push(cur);
    }
    return res;
  };
  C.addCommand(['DXFMODEL', 'DXF3B', 'PLANDAN3B'], "DXF / DWG planından 3B model: pencereyle planı seçin, aks kesişimini (referans) tıklayın; betonarme ve duvar katmanlarından perde / duvar / kolon / kapı-pencere / taban ve üst döşeme otomatik oluşturulur. Alt ve üst kotu kesitlerden okuyup girin.", async (I) => {
    const lays = Object.keys(C.doc.layers), up = s => C.up(String(s)), find = (re, ex) => lays.find(l => re.test(up(l)) && !(ex && ex.test(up(l)))) || 'YOK';
    const LO = [['YOK', '— yok —'], ...lays.map(l => [l, l])];
    const kv = kots(); if (kv.length) C.log('Çizimdeki kot yazıları: ' + kv.map(v => (v > 0 ? '+' : v < 0 ? '' : '±') + v.toFixed(2)).join('  ·  '));
    const r = await I_().getParams('DXF planından 3B model', [
      { k: 'bet', t: 'Betonarme (perde / kolon) katmanı', opts: LO, d: find(/BETON|PERDE|CONC|S-WALL/, /KESIK|TARAMA|HATCH|DASH/), al: ['BET'] },
      { k: 'duv', t: 'Duvar (tuğla / gazbeton) katmanı', opts: LO, d: find(/DUVAR|WALL|TUGLA|BRICK/, /KESIK|FNSH|SIVA|TARAMA/), al: ['DUV'] },
      { k: 'acik', t: 'Kapı / pencere katmanı', opts: LO, d: find(/KAPI|PENCERE|DOOR|WINDOW/), al: ['ACIK'] },
      { k: 'z0', t: 'Alt kot — perde / duvar tabanı (m)', d: kv.length ? kv[0] : 0, al: ['Z0'] }, { k: 'z1', t: 'Üst kot — perde / duvar üstü (m)', d: kv.length ? kv[kv.length - 1] : 3, al: ['Z1'] },
      { k: 'dz0', t: 'Duvar alt kotu (m, boş = perdeyle aynı)', d: '', s: true, al: ['DZ0'] }, { k: 'dz1', t: 'Duvar üst kotu (m, boş = perdeyle aynı)', d: '', s: true, al: ['DZ1'] },
      { k: 'malz', t: 'Duvar malzemesi', opts: [['tugla', 'Tuğla'], ['gazbeton', 'Gazbeton'], ['briket', 'Briket']], d: 'tugla', al: ['MALZ'] },
      { k: 'tmin', t: 'En ince duvar (cm)', d: 8, al: ['TMIN'] }, { k: 'tmax', t: 'En kalın perde (cm)', d: 120, al: ['TMAX'] }, { k: 'kmax', t: 'En büyük kolon (cm)', d: 100, al: ['KMAX'] }, { k: 'lmin', t: 'En kısa duvar parçası (cm)', d: 20, al: ['LMIN'] },
      { k: 'radye', t: 'Taban döşemesi / radye kalınlığı (cm, 0 = yok) — alt kotun altına', d: 0, al: ['RADYE'] }, { k: 'ust', t: 'Üst döşeme kalınlığı (cm, 0 = yok) — üst kotun altına', d: 0, al: ['USTDOS'] },
      { k: 'kolon', t: 'Kolonları tanı', opts: [['E', 'Evet'], ['H', 'Hayır']], d: 'E', al: ['KOLON'] },
    ], 'dxfmodel'); if (!r) return;
    const win = await pick2(I, 'Dönüştürülecek planı pencereyle seçin'); if (!win) return;
    const ref = await I.pt('Referans noktası — bir aks kesişimi (sonraki planlarda aynı aksı seçin, üst üste oturur)'); if (!ref || typeof ref === 'string') return;
    const set = C.doc.set; if (!set.dxfRef) set.dxfRef = [ref[0], ref[1]]; const off = [set.dxfRef[0] - ref[0], set.dxfRef[1] - ref[1]], T = p => [p[0] + off[0], p[1] + off[1]];
    const tmin = (+r.tmin || 8) / 100, tmax = (+r.tmax || 120) / 100, kmax = (+r.kmax || 100) / 100, lmin = (+r.lmin || 20) / 100, z0 = +r.z0, z1 = +r.z1, dz0 = r.dz0 === '' || r.dz0 == null || isNaN(+r.dz0) ? z0 : +r.dz0, dz1 = r.dz1 === '' || r.dz1 == null || isNaN(+r.dz1) ? z1 : +r.dz1;
    if (!(z1 > z0)) { C.warn('Üst kot alt kottan büyük olmalı.'); return; }
    const gv0 = C._gvCur; C._gvCur = null;
    const opSegs = r.acik !== 'YOK' ? segsIn([r.acik], win) : [];
    let nK = 0, nP = 0, nD = 0, nA = 0; const made = [];
    const mkWalls = (lay, malz, za, zb) => {
      if (!lay || lay === 'YOK') return []; let segs = segsIn([lay], win); if (!segs.length) return [];
      let cols = [];
      if (malz === 'beton' && r.kolon !== 'H') { cols = findCols(segs, 0.15, kmax); const onCol = s => cols.some(k => [s.a, s.b, M.lerp([...s.a, 0], [...s.b, 0], 0.5)].every(p => { const f = k.f; for (let i = 0; i < f.length; i++) { const a = f[i], b = f[(i + 1) % f.length], l = M.dist2(a, b); if (l < 1e-9) continue; const t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (l * l), d = Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / l; if (t >= -0.01 && t <= 1.01 && d < 0.005) return true; } return false; })); segs = segs.filter(s => !onCol(s));
        for (const k of cols) { const c = T(k.c), e = C.add(C.newEnt('kolon', k.circ ? { sek: 'D', D: +k.D.toFixed(3), p: [c[0], c[1], 0], h: +(z1 - z0).toFixed(3), z0, rot: 0, beton: 'C30/37', layer: 'INS_KOLON' } : { sek: 'R', b: +k.b.toFixed(3), d: +k.d.toFixed(3), p: [c[0], c[1], 0], h: +(z1 - z0).toFixed(3), z0, rot: +k.rot.toFixed(3), beton: 'C30/37', layer: 'INS_KOLON' })); delete e.sp; made.push(e); nK++; } }
      const W = joinOpenings(findWalls(segs, tmin, tmax, lmin), opSegs), out = [];
      for (const w of W) {
        const P = s => T([w.u[0] * s + w.n[0] * w.c, w.u[1] * s + w.n[1] * w.c]), e = C.add(C.newEnt('perde', { pts: [P(w.s0), P(w.s1)], closed: false, hiza: 'O', ofs: 0, egim: 'R', tb: +w.t.toFixed(3), tt: +w.t.toFixed(3), h: +(zb - za).toFixed(3), z0: za, malz, beton: 'C30/37', layer: malz === 'beton' ? 'INS_PERDE' : 'INS_DUVAR_TUGLA' })); delete e.sp; made.push(e); out.push(e);
        if (malz === 'beton') nP++; else nD++;
        for (const o of w.ops) { const a = C.add(C.newEnt('acik', { host: e.id, seg: 0, s: +o.s.toFixed(3), kind: o.kind, w: +o.w.toFixed(3), hh: o.kind === 'kapi' ? 2.1 : 1.4, par: o.kind === 'kapi' ? 0 : 0.9, kanat: 1, yon: 'L', el: 'L', lento: malz !== 'beton', lb: 0.1, lh: 0, layer: o.kind === 'kapi' ? 'INS_KAPI' : 'INS_PENCERE' })); delete a.sp; made.push(a); nA++; }
      }
      return segs;
    };
    const bseg = mkWalls(r.bet, 'beton', z0, z1), dseg = mkWalls(r.duv, r.malz, dz0, dz1);
    // döşemeler: betonarme dış sınırı
    if (+r.radye > 0 || +r.ust > 0) {
      const all = bseg.concat(dseg); const faces = all.length ? C.planarFaces(all.map(s => [s.a, s.b])) : []; let outer = null, oa = 0; for (const f of faces) { const A = M.polyArea(f); if (A < 0 && -A > oa) { oa = -A; outer = f.slice().reverse(); } }
      // dış sınır kapalı değilse (ör. yalnız kolonlar + aralıklı duvarlar) tüm elemanların dışbükey zarfı
      const hp = all.flatMap(s => [s.a, s.b]); let hull = null; if (hp.length > 2) { const P2 = hp.slice().sort((a2, b2) => a2[0] - b2[0] || a2[1] - b2[1]), cr = (o, a2, b2) => (a2[0] - o[0]) * (b2[1] - o[1]) - (a2[1] - o[1]) * (b2[0] - o[0]), lo = [], upp = []; for (const q of P2) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of P2.slice().reverse()) { while (upp.length >= 2 && cr(upp[upp.length - 2], upp[upp.length - 1], q) <= 0) upp.pop(); upp.push(q); } hull = lo.slice(0, -1).concat(upp.slice(0, -1)); }
      if (hull && (!outer || oa < 0.6 * Math.abs(M.polyArea(hull)))) outer = hull;
      if (outer) {
        const pts = outer.map(T);
        if (+r.radye > 0) { const e = C.add(C.newEnt('plak', { kind: 'radye', pts, t: +r.radye / 100, zt: z0, beton: 'C30/37', layer: 'INS_TEMEL_RADYE' })); delete e.sp; made.push(e); }
        if (+r.ust > 0) { const e = C.add(C.newEnt('plak', { kind: 'doseme', pts, t: +r.ust / 100, zt: z1, beton: 'C30/37', layer: 'INS_DOSEME' })); delete e.sp; made.push(e); }
      }
    }
    C._gvCur = gv0; for (const e of made) { if (C.insFixLayer) C.insFixLayer(e); delete e.sp; }
    C.changed(); C.emit('layers');
    C.log(`DXF → 3B: ${nP} betonarme perde, ${nD} duvar, ${nK} kolon, ${nA} kapı / pencere${+r.radye > 0 ? ', radye' : ''}${+r.ust > 0 ? ', üst döşeme' : ''} oluşturuldu (kot ${z0} … ${z1}). Referans: ${off[0] || off[1] ? 'önceki plana göre kaydırıldı' : 'planın kendi yerinde'}. 3B sekmesinde kontrol edin; yanlış tanınanları silip düzeltebilirsiniz (Geri al ile tamamı geri alınır).`);
  });
  C.addCommand(['DXFMODELREF'], 'DXF → 3B referans noktasını sıfırla (yeni model için)', async () => { delete C.doc.set.dxfRef; C.log('DXF → 3B referans noktası sıfırlandı.'); }, { noUndo: true });
})(window.C);

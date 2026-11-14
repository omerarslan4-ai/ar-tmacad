/* ArıtmaCAD — SU (havuz / kanal içine su doldurma): atıksu, temiz su, arıtılmış su, havalandırma (köpüklü), çamur
   Perdelerle çevrili iç alana tıklayın (ya da kapalı çoklu çizgi / döşeme içine); su yüksekliğini (tabandan) ya da su kotunu verin.
   3B'de yarı saydam, hafif dalgalanan su yüzeyi (gerçek zamanlı). Planda kesikli sınır, su kotu ve "~" işareti.
   su nesnesi: { pts (2B), zb: taban kotu, zs: su kotu, tur } */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, P, TX } = C.prim, I_ = () => C._ins;
  const TUR = {
    atiksu: ['Atıksu (ham)', [0.36, 0.38, 0.24], 0.90, 0.9], temiz: ['Temiz su', [0.22, 0.52, 0.82], 0.55, 1.0], aritilmis: ['Arıtılmış su', [0.20, 0.55, 0.55], 0.65, 0.9],
    havalandirma: ['Havalandırma havuzu (köpüklü)', [0.46, 0.42, 0.30], 0.92, 1.6], camur: ['Çamur', [0.33, 0.25, 0.16], 0.97, 0.4], yagmur: ['Yağmur suyu', [0.40, 0.50, 0.55], 0.70, 0.9],
  };
  C.SU_TUR = TUR;
  const ccw = q => (M.polyArea(q) < 0 ? q.slice().reverse() : q.slice());
  const buildMesh = e => { // yalnız gövde (view3d su olarak çizer)
    const q = ccw(e.pts.map(p => [p[0], p[1]])), zb = +e.zb || 0, zs = +e.zs || 1, out = { t: 'tri', v: [], f: [], fc: [], edges3: [] }, col = (TUR[e.tur] || TUR.temiz)[1];
    let tris = []; try { tris = C.earClip(q); } catch (er) { } const n = q.length;
    for (const p of q) out.v.push([p[0], p[1], zs]); for (const p of q) out.v.push([p[0], p[1], zb]);
    for (const t of tris) { out.f.push([t[0], t[1], t[2]]); out.fc.push(col); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; out.f.push([i, n + i, n + j], [i, n + j, j]); out.fc.push(col, col); }
    for (let i = 0; i < n; i++) out.edges3.push([[q[i][0], q[i][1], zs], [q[(i + 1) % n][0], q[(i + 1) % n][1], zs]]);
    return out;
  };
  T.su = {
    label: 'Su', ifc: 'IfcBuildingElementProxy',
    prims: e => { const q = e.pts.map(p => [p[0], p[1], 0]), c = q.reduce((s, p) => [s[0] + p[0] / q.length, s[1] + p[1] / q.length], [0, 0]), th = C.annoH(2), out = [P(q, true, { lt: 'DASHED', lw: 18 })];
      for (let k = -1; k <= 1; k++) { const y = c[1] - th * 1.3 + k * th * 0.5, x0 = c[0] - th * 1.5, pts = []; for (let i = 0; i <= 12; i++) pts.push([x0 + i * th * 0.25, y + Math.sin(i * Math.PI / 3) * th * 0.12, 0]); out.push(P(pts, false, { lw: 13 })); }
      out.push(TX([c[0], c[1], 0], th, `${(TUR[e.tur] || TUR.temiz)[0].toUpperCase()}  S.K. ${M.fmt(+e.zs || 0, 2)}`, 0, 'C')); return out; },
    mesh: e => [buildMesh(e)],
    xf: (e, X) => { let dz = 0; try { const q = X.p([0, 0, 0]); dz = q && q.length > 2 ? (q[2] || 0) : 0; } catch (er) { } e.zb = (+e.zb || 0) + dz; e.zs = (+e.zs || 0) + dz; e.pts = e.pts.map(q => X.p([q[0], q[1], 0]).slice(0, 2)); },
    snaps: e => e.pts.map(p => ({ p: [p[0], p[1], +e.zs || 0], k: 'end' })),
    info: e => { const A = Math.abs(M.polyArea(e.pts)), d = (+e.zs || 0) - (+e.zb || 0); return `${(TUR[e.tur] || TUR.temiz)[0]} · su kotu ${M.fmt(+e.zs || 0, 2)} · taban ${M.fmt(+e.zb || 0, 2)} · derinlik ${M.fmt(d, 2)} m · yüzey ${M.fmt(A, 2)} m² · hacim ${M.fmt(A * d, 1)} m³`; },
  };
  /* tabanın kotu: radye / temel / döşeme / katı üstü (noktanın altındaki en yüksek, su kotunun altında) */
  const floorAt = (p, zmax) => { let z = null; const t0 = I_().fndTop ? I_().fndTop(p) : null; if (t0 != null && (zmax == null || t0 < zmax)) z = t0;
    for (const x of C.doc.ents) { if (x.type === 'plak' && C.pointInPoly(p, x.pts)) { const t = +x.zt || 0; if ((zmax == null || t < zmax - 0.05) && (z == null || t > z)) z = t; } }
    return z; };
  const FIELDS = [
    { k: 'tur', t: 'Su türü', opts: Object.entries(TUR).map(([k, v]) => [k, v[0]]), d: 'atiksu', al: ['TUR'] },
    { k: 'mod', t: 'Su seviyesi', opts: [['der', 'Su yüksekliği — tabandan (m)'], ['kot', 'Su kotu (mutlak, m)']], d: 'der', al: ['MOD'] },
    { k: 'h', t: 'Su yüksekliği (m) / su kotu (m)', d: 3.0, al: ['H'] },
    { k: 'taban', t: 'Taban', opts: [['OTO', 'Radye / döşeme üstü (otomatik)'], ['EL', 'Elle']], d: 'OTO', al: ['TABAN'] }, { k: 'zb', t: 'Taban kotu — elle (m)', d: 0, al: ['ZB'] },
  ];
  C.addCommand(['SU', 'SUDOLDUR', 'HAVUZSU'], 'Havuz / kanal içine su: türünü seçin (atıksu, temiz, arıtılmış, havalandırma, çamur), su yüksekliğini (tabandan) ya da su kotunu verin, perdelerle çevrili alana tıklayın. 3B\'de yarı saydam, hafif dalgalı su.', async (I) => {
    const r = await I_().getParams('Su', FIELDS, 'su'); if (!r) return;
    C.ensureLayer('INS_SU', 150, 'CONTINUOUS', 13); let n = 0;
    for (; ;) {
      const p = await I.pt('Su doldurulacak alana tıklayın (perdelerle çevrili iç alan; Enter bitir)'); if (!p || typeof p === 'string') break;
      const zmaxGuess = r.mod === 'kot' ? +r.h : null;
      let zb = r.taban === 'EL' ? +r.zb : floorAt([p[0], p[1]], zmaxGuess); if (zb == null) zb = Math.abs(p[2] || 0) > 1e-6 ? p[2] : 0;
      const zs = r.mod === 'kot' ? +r.h : zb + (+r.h || 1);
      if (!(zs > zb + 0.01)) { C.warn('Su kotu tabandan yüksek olmalı.'); continue; }
      let poly = null;
      try { const { cells } = I_().dolguCells(zb + Math.min(0.1, (zs - zb) / 2)); let best = null; for (const c of cells) if (C.pointInPoly([p[0], p[1]], c.f) && (!best || c.A < best.A)) best = c; if (best) poly = best.f.map(q => [q[0], q[1]]); } catch (er) { }
      if (!poly) { const cand = C.doc.ents.filter(x => ((x.type === 'pline' && x.closed) || x.type === 'plak') && x.pts && C.pointInPoly([p[0], p[1]], x.pts)).sort((a, b) => Math.abs(M.polyArea(a.pts)) - Math.abs(M.polyArea(b.pts))); if (cand[0]) poly = cand[0].pts.map(q => [q[0], q[1]]); }
      if (!poly) { C.warn('Tıkladığınız yer perdelerle ya da kapalı bir çizgiyle çevrili değil.'); if (E.scriptMode && !E.queue.length) break; continue; }
      const e = C.add(C.newEnt('su', { pts: poly, zb: +(+zb).toFixed(4), zs: +(+zs).toFixed(4), tur: r.tur, layer: 'INS_SU' })); delete e.sp; n++; C.log(T.su.info(e));
      if (E.scriptMode && !E.queue.length) break;
    }
    if (n) C.changed();
  });
  (C.PROPFIELDS = C.PROPFIELDS || {}).su = /* ui.js özellik tablosunu kurarken bu kaydı korur */ [['tur', 'Tür (atiksu / temiz / aritilmis / havalandirma / camur / yagmur)', 's'], ['zs', 'Su kotu (m)'], ['zb', 'Taban kotu (m)']];
})(window.C);

/* ArıtmaCAD — YAĞMUR OLUĞU ve YAĞMUR İNİŞ BORUSU (çizim ve model)
   Kaynak: Çokal AAT R2, 10-İdari Bina_R2 çatı paftası ÇKL-AAT-İB-03 (ÇATI PLANI, A'-A', B'-B', DETAY-A) — "DN155 Çinko Yağmur Oluğu" (yarım daire,
   dış dudakta kıvrık kenar), "DN120 Çinko Yağmur İniş Borusu" (saçaktan duvara 45° kaz boynu, duvar boyunca düşey, kelepçeli), "Yağmur Borusu Süzgeci";
   katman `Oluk`. Çap ve adet: C.yagmurHesap (mt-sihhi.js, TS EN 12056-3; mekanik tesisat). Hesap yoksa oluk DN155, boru DN120, borular dış köşelerde.
   1) Çatı nesnesinin oluğu ve boruları: C.yagmurCati(e) → { olukDN, borDN, oluk (saçak 7 cm dışı çevre), borular: [{ no, p, yol }], zSacak, zAlt }
      cati.js bunlardan 3B ağ (yarım daire oluk, boru, kelepçe), plan sembolü ve metraj üretir.
   2) Elle çizilen: yagmur nesnesi { kind: 'oluk', pts, z, dn } | { kind: 'boru', p, z0, z1, dn } — YAGMUROLUGU, INISBORUSU komutları (Mimari şeridi).
   Saf kısım (yol, kesit) Node ile denenir: node test/yagmur-cizim.test.js */
(function (C) {
  'use strict';

  /* ======================= SAF KISIM ======================= */
  /* iniş borusunun yolu: oluk ağzından (g, z = oluk altı) 10 cm düşey, 45° kaz boynuyla duvara (w: duvar yüzünden boru ekseni kadar dışarıdaki nokta),
     duvar boyunca düşey, altta 45° dirsekle 15 cm dışa (zemine / rögara bağlantı). Döner: [[x, y, z] …] */
  const inisYolu = (g, w0, zUst, zAlt) => {
    const d = Math.hypot(w0[0] - g[0], w0[1] - g[1]), w = d > 0.03 ? w0 : g, Y = [[g[0], g[1], zUst]];
    let z = zUst - 0.10; Y.push([g[0], g[1], z]);
    if (d > 0.03) { z -= d; Y.push([w[0], w[1], z]); }
    const u = d > 0.03 ? [(g[0] - w[0]) / d, (g[1] - w[1]) / d] : [0, 0], zA = Math.min(z - 0.05, zAlt + 0.15);
    if (zA > zAlt + 0.01) { Y.push([w[0], w[1], zA]); Y.push([w[0] + u[0] * 0.15, w[1] + u[1] * 0.15, zAlt]); } else Y.push([w[0], w[1], zAlt]);
    return Y.map(p => p.map(v => +v.toFixed(4)));
  };
  /* yarım daire oluk kesiti (yerel: n dışa, z yukarı; merkez oluk ağzının ortası): r = DN / 2, dış dudakta kıvrık kenar (Çokal DETAY-A) */
  const olukKesit = (dn, n = 8) => { const r = dn / 2000, o = []; for (let i = 0; i <= n; i++) { const t = Math.PI * i / n; o.push([-r * Math.cos(t), -r * Math.sin(t)]); } return o; };
  /* bir kenardaki boruların sırası: kenar başından s (m) */
  const api = { inisYolu, olukKesit };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!C) return;
  C.yagmurApi = api;

  /* ======================= MODEL ======================= */
  const M = C.M;
  const offsetPoly = (q, d) => { const n = q.length, out = []; for (let i = 0; i < n; i++) { const a = q[(i - 1 + n) % n], b = q[i], c = q[(i + 1) % n], u1 = M.norm([b[0] - a[0], b[1] - a[1], 0]), u2 = M.norm([c[0] - b[0], c[1] - b[1], 0]), n1 = [u1[1], -u1[0]], n2 = [u2[1], -u2[0]], k = 1 + n1[0] * n2[0] + n1[1] * n2[1]; if (k < 1e-6) { out.push([b[0] + n1[0] * d, b[1] + n1[1] * d]); continue; } out.push([b[0] + (n1[0] + n2[0]) * d / k, b[1] + (n1[1] + n2[1]) * d / k]); } return out; };
  const alan = q => { let s = 0; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  const yakin = (q, P) => { let en = null; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); const p = [a[0] + dx * t, a[1] + dy * t], d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (!en || d < en.d) en = { p, d, i }; } return en; };
  /* zemin: binayı çeviren tretuvarın üstü (bina tarafı), yoksa çatı döşemesinin altındaki en düşük döşeme üstü, yoksa 0 */
  const zemin = () => { const t = C.doc.ents.filter(e => e.type === 'tretuvar' && !e.gv); if (t.length) return Math.max(...t.map(e => (+e.zg || 0) + (+e.h || 0.15))); return 0; };
  const hesapAyar = e => Object.assign({}, (C.MT && C.MT.yagmurAyar ? (() => { try { return C.MT.yagmurAyar() || {}; } catch (er) { return {}; } })() : {}), e.yagmur || {});
  /* çatının oluk ve boruları (çizim, 3B ve metraj için tek kaynak) */
  C.yagmurCati = e => {
    const G = C.catiGeom(e), foot = G.foot.map(p => [p[0], p[1]]), ccw = alan(foot) < 0 ? foot.slice().reverse() : foot;
    let H = null; try { if (C.yagmurHesap) H = C.yagmurHesap(e, hesapAyar(e)); } catch (er) { H = null; }
    const olukDN = (H && H.olukDN) || +e.olukDn || 155, borDN = (H && H.borDN) || +e.boruDn || 120, ro = olukDN / 2000, rb = borDN / 2000;
    const oluk = offsetPoly(ccw, ro), zE = G.lines.eave.length ? Math.min(...G.lines.eave.flat().map(p => p[2])) : G.Z0, zAlt = zemin();
    /* boru duvar boyunca iner: çatının oturduğu döşeme saçaklıysa (Konya: döşeme 50 cm konsol) duvar yüzü döşeme kenarı değil, düşey elemanların dış yüzüdür */
    let wall = alan(G.wall) < 0 ? G.wall.slice().reverse() : G.wall.slice();
    { const D = C.doc.ents.filter(x => !x.gv && /^(perde|kolon|duvar|wall)$/.test(x.type) && C.layer(x.layer).on); const b = D.length ? C.extents(D) : null;
      if (b && isFinite(b[0])) { const R = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]]; if (R.every(q => C.pointInPoly ? C.pointInPoly(q, ccw) || yakin(q, ccw).d < 0.02 : true)) wall = R; } }
    let P = H && H.borular && H.borular.length ? H.borular.map(b => ({ no: b.no, p: b.p, kenar: b.kenarIndex })) : null;
    if (!P) { P = []; for (let i = 0; i < ccw.length; i++) { const a = ccw[(i - 1 + ccw.length) % ccw.length], b = ccw[i], c = ccw[(i + 1) % ccw.length]; if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) > 1e-9) P.push({ no: 'YB' + (P.length + 1), p: b, kenar: i }); } }
    const borular = P.map(b => { const g = yakin(b.p, oluk).p, wq = yakin(g, wall), dw = Math.hypot(g[0] - wq.p[0], g[1] - wq.p[1]) || 1, w = [wq.p[0] + (g[0] - wq.p[0]) / dw * (0.04 + rb), wq.p[1] + (g[1] - wq.p[1]) / dw * (0.04 + rb)];
      return { no: b.no, p: g, kenar: b.kenar, yol: inisYolu(g, w, zE - ro, zAlt) }; });
    return { olukDN, borDN, ro, rb, oluk, borular, zSacak: zE, zAlt, hesap: H };
  };
  /* 3B: yarım daire oluk (saçak çevresi boyunca) ve borular (8 yüzlü boru, 2 m arayla kelepçe) — cati.js buildAll içine eklenir */
  const ZINK = [0.62, 0.64, 0.66];
  const tup = (out, A, B, r, col, n = 8) => { const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L = Math.hypot(...d); if (L < 1e-6) return; const u = d.map(v => v / L), a = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], p = M.norm(M.cross(u, a)), q = M.cross(u, p), v0 = out.v.length;
    for (const C0 of [A, B]) for (let i = 0; i < n; i++) { const t = 2 * Math.PI * i / n, c = Math.cos(t) * r, s = Math.sin(t) * r; out.v.push([C0[0] + p[0] * c + q[0] * s, C0[1] + p[1] * c + q[1] * s, C0[2] + p[2] * c + q[2] * s]); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; out.f.push([v0 + i, v0 + j, v0 + n + j], [v0 + i, v0 + n + j, v0 + n + i]); out.fc.push(col, col); } };
  C.yagmurAg = (out, Y) => {
    const K = olukKesit(Y.olukDN), n = Y.oluk.length, z0 = Y.zSacak, O = Y.oluk, nk = K.length;
    // oluk: köşelerde açıortay doğrultusunda (ofsetin kendisi) — kesit noktası = oluk ekseni + n·x + z
    const nrm = i => { const a = O[(i - 1 + n) % n], b = O[i], c = O[(i + 1) % n], u1 = M.norm([b[0] - a[0], b[1] - a[1], 0]), u2 = M.norm([c[0] - b[0], c[1] - b[1], 0]), m = M.norm([u1[1] + u2[1], -(u1[0] + u2[0]), 0]), k = Math.max(0.3, m[0] * u1[1] - m[1] * u1[0]); return [m[0] / k, m[1] / k]; };
    const N = O.map((p, i) => nrm(i)), v0 = out.v.length;
    for (let i = 0; i < n; i++) for (const [x, z] of K) out.v.push([O[i][0] + N[i][0] * x, O[i][1] + N[i][1] * x, z0 + z]);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; for (let k = 0; k + 1 < nk; k++) { const a = v0 + i * nk + k, b = v0 + j * nk + k; out.f.push([a, b, b + 1], [a, b + 1, a + 1]); out.fc.push(ZINK, ZINK); } }
    for (const k of [0, nk - 1, Math.floor(nk / 2)]) for (let i = 0; i < n; i++) { const j = (i + 1) % n; out.edges3.push([out.v[v0 + i * nk + k], out.v[v0 + j * nk + k]]); }
    for (const b of Y.borular) { const Yo = b.yol; for (let i = 1; i < Yo.length; i++) tup(out, Yo[i - 1], Yo[i], Y.rb, ZINK);
      /* kelepçe: duvar boyunca düşey parçada (yolun en uzun düşey parçası) 2 m arayla */ let dz = null; for (let i = 1; i < Yo.length; i++) { const a = Yo[i - 1], c = Yo[i]; if (Math.hypot(c[0] - a[0], c[1] - a[1]) < 1e-6 && (!dz || a[2] - c[2] > dz.h)) dz = { a, h: a[2] - c[2], zb: c[2] }; }
      if (dz) for (let z = dz.a[2] - 0.3; z > dz.zb + 0.2; z -= 2.0) tup(out, [dz.a[0], dz.a[1], z], [dz.a[0], dz.a[1], z + 0.03], Y.rb + 0.008, [0.45, 0.46, 0.48], 8); }
  };
  /* metraj: oluk boyu (m), boru boyu (m) ve adedi */
  C.yagmurMetraj = Y => { let Lo = 0; for (let i = 0; i < Y.oluk.length; i++) { const a = Y.oluk[i], b = Y.oluk[(i + 1) % Y.oluk.length]; Lo += Math.hypot(b[0] - a[0], b[1] - a[1]); }
    let Lb = 0; for (const b of Y.borular) for (let i = 1; i < b.yol.length; i++) Lb += Math.hypot(...[0, 1, 2].map(k => b.yol[i][k] - b.yol[i - 1][k]));
    return [[`Çinko yağmur oluğu DN${Y.olukDN} (yarım daire)`, 'm', Lo], [`Çinko yağmur iniş borusu DN${Y.borDN}`, 'm', Lb], [`Yağmur iniş borusu DN${Y.borDN} (süzgeç, dirsek, kelepçe ile)`, 'adet', Y.borular.length]]; };

  /* ======================= ELLE ÇİZİLEN (yagmur nesnesi) ======================= */
  const { L, P, CI } = C.prim;
  C.T.yagmur = {
    label: 'Yağmur oluğu / iniş borusu', ifc: 'IfcPipeSegment',
    prims: e => e.kind === 'boru' ? [CI([e.p[0], e.p[1], 0], (+e.dn || 120) / 2000, { lw: 18 })] : [P(e.pts.map(p => [p[0], p[1], 0]), false, { lw: 13, lt: 'DASHED' })],
    mesh: e => { const out = C._ins.newMesh(), dn = +e.dn || (e.kind === 'boru' ? 120 : 155);
      if (e.kind === 'boru') { tup(out, [e.p[0], e.p[1], +e.z0 || 0], [e.p[0], e.p[1], +e.z1 || 3], dn / 2000, ZINK); }
      else { const K = olukKesit(dn), z = +e.z || 3, Q = e.pts; for (let i = 1; i < Q.length; i++) { const a = Q[i - 1], b = Q[i], u = M.norm([b[0] - a[0], b[1] - a[1], 0]), nn = [u[1], -u[0]], v0 = out.v.length;
          for (const p of [a, b]) for (const [x, zz] of K) out.v.push([p[0] + nn[0] * x, p[1] + nn[1] * x, z + zz]);
          for (let k = 0; k + 1 < K.length; k++) { out.f.push([v0 + k, v0 + K.length + k, v0 + K.length + k + 1], [v0 + k, v0 + K.length + k + 1, v0 + k + 1]); out.fc.push(ZINK, ZINK); }
          out.edges3.push([out.v[v0], out.v[v0 + K.length]], [out.v[v0 + K.length - 1], out.v[v0 + 2 * K.length - 1]]); } }
      return [out]; },
    snaps: e => e.kind === 'boru' ? [{ p: [e.p[0], e.p[1], 0], k: 'cen' }] : e.pts.map(p => ({ p: [p[0], p[1], 0], k: 'end' })),
    xf: (e, X) => { if (e.kind === 'boru') e.p = X.p([e.p[0], e.p[1], 0]).slice(0, 2); else e.pts = e.pts.map(p => X.p([p[0], p[1], 0]).slice(0, 2)); delete e._c; },
    info: e => e.kind === 'boru' ? `Yağmur iniş borusu DN${+e.dn || 120} (çinko), ${M.fmt((+e.z1 || 0) - (+e.z0 || 0), 2)} m` : `Yağmur oluğu DN${+e.dn || 155} (çinko, yarım daire), ${M.fmt(e.pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - e.pts[i][0], p[1] - e.pts[i][1]), 0), 2)} m`,
  };
  if (C.PROPFIELDS) C.PROPFIELDS.yagmur = [['dn', 'DN (mm)', 'n'], ['z', 'Oluk kotu (m)', 'n'], ['z0', 'Boru alt kotu (m)', 'n'], ['z1', 'Boru üst kotu (m)', 'n']];
  /* metraj: çatı metrajına elle çizilenler de katılır */
  { const m0 = C.catiMetraj; C.catiMetraj = () => { const R = m0 ? m0() : [], m = new Map();
      for (const e of C.doc.ents) { if (e.type !== 'yagmur' || e.gv || !C.lyLive(e.layer)) continue; const dn = +e.dn || (e.kind === 'boru' ? 120 : 155);
        if (e.kind === 'boru') { const k = `Çinko yağmur iniş borusu DN${dn}|m`; m.set(k, (m.get(k) || 0) + Math.abs((+e.z1 || 0) - (+e.z0 || 0))); const k2 = `Yağmur iniş borusu DN${dn} (süzgeç, dirsek, kelepçe ile)|adet`; m.set(k2, (m.get(k2) || 0) + 1); }
        else { const k = `Çinko yağmur oluğu DN${dn} (yarım daire)|m`; m.set(k, (m.get(k) || 0) + e.pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - e.pts[i][0], p[1] - e.pts[i][1]), 0)); } }
      return R.concat([...m.entries()].map(([k, v]) => { const [ad, br] = k.split('|'); return [ad, br, v]; })); }; }
  const katman = () => { if (C.ensureLayer) C.ensureLayer('INS_OLUK', 251, 'CONTINUOUS', 25); return 'INS_OLUK'; };
  C.addCommand(['YAGMUROLUGU', 'OLUK', 'GUTTER'], 'Yağmur oluğu (çinko, yarım daire): saçak kenarı boyunca noktaları tıklayın (Enter ile bitir). Çap ve kot sorulur; plan, kesit, görünüş ve metraja girer.', async (I) => {
    const dn = await I.num('Oluk DN (mm; 100, 125, 155, 192)', 155); const z = await I.num('Oluk kotu (m, oluk ağzı)', 3); const pts = [];
    for (;;) { const p = await I.pt(pts.length ? 'Sonraki nokta (Enter: bitir)' : 'Oluğun ilk noktası'); if (!p || typeof p === 'string') break; pts.push([p[0], p[1]]); C.cmd.base = p; }
    C.cmd.base = null; if (pts.length < 2) return; C.add(C.newEnt('yagmur', { kind: 'oluk', pts, z: +z, dn: +dn, layer: katman() })); C.changed(); C.log(`Yağmur oluğu DN${dn}: ${pts.length - 1} parça.`); });
  C.addCommand(['INISBORUSU', 'YAGMURBORUSU', 'DOWNPIPE'], 'Yağmur iniş borusu (çinko): noktaya tıklayın; çap, alt ve üst kot sorulur; plan, kesit, görünüş ve metraja girer.', async (I) => {
    const dn = await I.num('Boru DN (mm; 80, 100, 120, 150)', 120); const z1 = await I.num('Üst kot (oluk altı, m)', 3); const z0 = await I.num('Alt kot (zemin, m)', 0); let n = 0;
    for (;;) { const p = await I.pt(n ? 'Sonraki boru (Enter: bitir)' : 'Boru yeri'); if (!p || typeof p === 'string') break; C.add(C.newEnt('yagmur', { kind: 'boru', p: [p[0], p[1]], z0: +z0, z1: +z1, dn: +dn, layer: katman() })); n++; }
    if (n) { C.changed(); C.log(`${n} yağmur iniş borusu DN${dn}.`); } });
  if (window.DIL) window.DIL.ekle('en', 'English', [['Yağmur oluğu / iniş borusu', 'Rain gutter / downpipe'], ['Yağmur oluğu', 'Rain gutter'], ['İniş borusu', 'Downpipe'], ['Oluk DN (mm; 100, 125, 155, 192)', 'Gutter DN (mm; 100, 125, 155, 192)'], ['Oluk kotu (m, oluk ağzı)', 'Gutter level (m, rim)'], ['Oluğun ilk noktası', 'First point of the gutter'], ['Sonraki nokta (Enter: bitir)', 'Next point (Enter: finish)'], ['Boru DN (mm; 80, 100, 120, 150)', 'Pipe DN (mm; 80, 100, 120, 150)'], ['Üst kot (oluk altı, m)', 'Top level (below gutter, m)'], ['Alt kot (zemin, m)', 'Bottom level (ground, m)'], ['Boru yeri', 'Pipe position'], ['Sonraki boru (Enter: bitir)', 'Next pipe (Enter: finish)']]);
})(typeof window !== 'undefined' ? window.C : null);

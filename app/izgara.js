/* ArıtmaCAD — MEKANİK KABA IZGARA (eğimli, zincirli tırmıklı) — parametrik 3B ekipman
   Varsayılan ölçüler üretici çiziminden (02-FF-010102010301 MECHANICAL COARSE SCREEN) alınmıştır:
   açı 75°, toplam yükseklik 6.945 m, çerçeve 630 mm (dış), derinlik 354 mm, kanal / ızgara net genişliği 500 mm,
   çubuk 10 mm + 20 mm açıklık, ızgara boyu ≈1.0 m (eğim boyunca), tahrik kafası (4 muayene kapaklı) ≈3.45 m, deşarj ağzı +5.615 m, yanda motor-redüktör.
   izgara nesnesi: { p: ön alt orta nokta (kanal tabanı), rot: akış yönü (°), z: taban kotu, a, H, b, W, d, bt, bg, Lr, Lh, hd, ms ('L' | 'R'), ad } */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, P, TX } = C.prim, RAD = Math.PI / 180;
  const I_ = () => C._ins;
  const COL = { frame: [0.50, 0.56, 0.62], bar: [0.78, 0.79, 0.80], head: [0.58, 0.63, 0.68], door: [0.42, 0.47, 0.52], hood: [0.62, 0.65, 0.69], motor: [0.18, 0.34, 0.62], gear: [0.30, 0.32, 0.36], base: [0.35, 0.36, 0.38], rake: [0.85, 0.62, 0.15] };
  const DEF = { a: 75, H: 6.945, b: 0.50, W: 0.63, d: 0.354, bt: 10, bg: 20, Lr: 1.0, Lh: 3.45, hd: 5.615, ms: 'L' };
  const par = e => { const o = {}; for (const k of Object.keys(DEF)) o[k] = e[k] != null && e[k] !== '' ? (typeof DEF[k] === 'number' ? +e[k] : e[k]) : DEF[k]; return o; };
  /* yerel → dünya: x = kanal enine (sol +), y = akış yönü, z = yukarı */
  const frame = e => { const r = (+e.rot || 0) * RAD, c = Math.cos(r), s = Math.sin(r), p = M.p3(e.p), z0 = +e.z || 0; return ([x, y, z]) => [p[0] + y * c - x * s, p[1] + y * s + x * c, z0 + z]; };
  const geom = e => {
    const q = par(e), a = q.a * RAD, ca = Math.cos(a), sa = Math.sin(a), Lf = q.H / sa, u = [0, ca, sa], n = [0, sa, -ca]; // u: eğim boyunca yukarı (akış yönüne yatık), n: arka (mansap) yüz normali
    const at = (s, o, x) => [x, u[1] * s + n[1] * o, u[2] * s + n[2] * o]; // s: eğim boyunca, o: ön yüzden arkaya, x: enine
    return { q, a, ca, sa, Lf, at, yb: z => z / Math.tan(a) + q.d / sa };
  };
  const box = (out, W2, pts, col) => I_().hexa(out, pts.map(p => W2([p[0], p[1], Math.max(0, p[2])])), col); // taban altına inen köşeler kanal tabanında yatay kesilir
  /* eğim boyunca kutu: s0..s1, o0..o1, x0..x1 */
  const sbox = (out, G, W2, s0, s1, o0, o1, x0, x1, col) => box(out, W2, [G.at(s0, o0, x0), G.at(s1, o0, x0), G.at(s1, o0, x1), G.at(s0, o0, x1), G.at(s0, o1, x0), G.at(s1, o1, x0), G.at(s1, o1, x1), G.at(s0, o1, x1)], col);
  const hbox = (out, W2, x0, x1, y0, y1, z0, z1, col) => box(out, W2, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], col);
  const buildMesh = e => {
    const G = geom(e), q = G.q, W2 = frame(e), out = I_().newMesh(), hw = q.W / 2, tp = 0.06; // yan profil eni
    // yan profiller (U), arka sac (ızgara üstünden kafaya kadar), enine kayıtlar
    for (const sg of [-1, 1]) sbox(out, G, W2, 0, G.Lf - q.Lh + 0.05, 0, q.d, sg * hw - (sg > 0 ? tp : 0), sg * hw + (sg < 0 ? tp : 0), COL.frame);
    sbox(out, G, W2, q.Lr, G.Lf - q.Lh + 0.05, q.d - 0.006, q.d, -hw + tp, hw - tp, COL.frame);
    for (let s = q.Lr + 0.6; s < G.Lf - q.Lh - 0.2; s += 1.25) { sbox(out, G, W2, s, s + 0.08, -0.03, 0.02, -hw - 0.05, hw + 0.05, COL.frame); }
    // ızgara çubukları (kanal net genişliğinde, ön yüzde)
    const pitch = (q.bt + q.bg) / 1000, nB = Math.max(2, Math.floor((q.b + q.bg / 1000) / pitch)), x0 = -((nB - 1) * pitch) / 2;
    for (let i = 0; i < nB; i++) { const x = x0 + i * pitch; sbox(out, G, W2, 0.02, q.Lr, 0.0, 0.06, x - q.bt / 2000, x + q.bt / 2000, COL.bar); }
    sbox(out, G, W2, q.Lr, q.Lr + 0.06, -0.02, 0.08, -q.b / 2, q.b / 2, COL.frame); // ızgara üst kayıt
    sbox(out, G, W2, q.Lr * 0.55, q.Lr * 0.55 + 0.05, -0.12, -0.02, -q.b / 2 + 0.02, q.b / 2 - 0.02, COL.rake); // tırmık (temsili)
    // tahrik kafası: geniş kutu + muayene kapakları
    const s0h = G.Lf - q.Lh, hwH = hw + 0.06;
    sbox(out, G, W2, s0h, G.Lf, -0.03, q.d + 0.03, -hwH, hwH, COL.head);
    for (let k = 0; k < 4; k++) { const sk = s0h + 0.15 + k * (q.Lh - 0.3) / 4, sl = sk + (q.Lh - 0.3) / 4 - 0.12; sbox(out, G, W2, sk, sl, -0.045, -0.03, -hwH + 0.1, hwH - 0.1, COL.door); for (const sg of [-1, 1]) sbox(out, G, W2, s0h + k * q.Lh / 4, s0h + k * q.Lh / 4 + 0.05, -0.05, q.d + 0.05, sg > 0 ? hwH : -hwH - 0.03, sg > 0 ? hwH + 0.03 : -hwH, COL.frame); }
    // deşarj kaputu (mansap tarafında) ve çıkış ağzı
    const zb = q.hd + 0.25, zt = Math.min(q.H - 0.12, q.hd + 1.17), yb1 = G.yb(zb), yb2 = G.yb(zt), ext = 0.95;
    box(out, W2, [[-hw, yb1, zb], [hw, yb1, zb], [hw, yb1 + ext, zb], [-hw, yb1 + ext, zb], [-hw, yb2, zt], [hw, yb2, zt], [hw, yb1 + ext, zt - 0.35], [-hw, yb1 + ext, zt - 0.35]], COL.hood);
    hbox(out, W2, -q.b / 2, q.b / 2, yb1 + 0.35, yb1 + ext - 0.05, q.hd, zb, COL.hood);
    // motor - redüktör (yanda, kafanın üst kısmında)
    const sg = q.ms === 'R' ? -1 : 1, sm = G.Lf - 0.75, cM = G.at(sm, q.d * 0.5, 0), xg = sg * (hwH + 0.04);
    hbox(out, W2, Math.min(xg, xg + sg * 0.26), Math.max(xg, xg + sg * 0.26), cM[1] - 0.14, cM[1] + 0.14, cM[2] - 0.16, cM[2] + 0.14, COL.gear);
    hbox(out, W2, Math.min(xg + sg * 0.05, xg + sg * 0.21), Math.max(xg + sg * 0.05, xg + sg * 0.21), cM[1] - 0.09, cM[1] + 0.09, cM[2] + 0.14, cM[2] + 0.58, COL.motor);
    // taban ayakları ve ankraj plakaları
    for (const s2 of [-1, 1]) hbox(out, W2, s2 > 0 ? hw - 0.06 : -hw - 0.10, s2 > 0 ? hw + 0.10 : -hw + 0.06, -0.06, G.yb(0) + 0.10, 0, 0.02, COL.base);
    // kanal üst kotunda duvara bağlantı konsolları (kafanın altı)
    { const zc = Math.max(0.8, G.sa * (G.Lf - q.Lh) - 0.1), sc = zc / G.sa; for (const s2 of [-1, 1]) sbox(out, G, W2, sc, sc + 0.12, 0, q.d, s2 > 0 ? hw : -hw - 0.25, s2 > 0 ? hw + 0.25 : -hw, COL.base); }
    return out;
  };
  T.izgara = {
    label: 'Mekanik kaba ızgara', ifc: 'IfcFlowTreatmentDevice',
    prims: e => {
      const G = geom(e), q = G.q, W2 = frame(e), hw = q.W / 2, yTop = q.H / Math.tan(G.a) + q.d / G.sa, z = p => { const w = W2(p); return [w[0], w[1], 0]; }, out = [];
      out.push(P([[-hw, 0, 0], [hw, 0, 0], [hw, yTop, 0], [-hw, yTop, 0]].map(z), true, { lw: 35 }));
      const yb1 = G.yb(q.hd + 0.25); out.push(P([[-hw, yb1, 0], [hw, yb1, 0], [hw, yb1 + 0.95, 0], [-hw, yb1 + 0.95, 0]].map(z), true, { lw: 18, lt: 'DASHED' }));
      const pitch = (q.bt + q.bg) / 1000, nB = Math.max(2, Math.floor((q.b + q.bg / 1000) / pitch)), x0 = -((nB - 1) * pitch) / 2, yr = q.Lr * G.ca;
      for (let i = 0; i < nB; i += Math.max(1, Math.floor(nB / 12))) { const x = x0 + i * pitch; out.push(L(z([x, 0, 0]), z([x, yr, 0]), { lw: 9 })); }
      const sg = q.ms === 'R' ? -1 : 1, cM = G.at(G.Lf - 0.75, q.d * 0.5, 0), xg = sg * (hw + 0.1); out.push(P([[xg, cM[1] - 0.14, 0], [xg + sg * 0.26, cM[1] - 0.14, 0], [xg + sg * 0.26, cM[1] + 0.14, 0], [xg, cM[1] + 0.14, 0]].map(z), true, { lw: 18 }));
      const th = C.annoH(2); out.push(L(z([0, -1.2, 0]), z([0, -0.3, 0]), { lw: 25 }), L(z([0, -0.3, 0]), z([0.12, -0.5, 0]), { lw: 25 }), L(z([0, -0.3, 0]), z([-0.12, -0.5, 0]), { lw: 25 }));
      const sl = sg > 0 ? -(hw + 0.12) - th : hw + 0.12; out.push(TX(z([sl, 0, 0]), th, `${e.ad || 'MEKANİK KABA IZGARA'} — b=${Math.round(q.b * 1000)} mm, açıklık ${q.bg} mm, ${q.a}°`, (+e.rot || 0) * RAD, 'L'));
      return out;
    },
    mesh: e => [buildMesh(e)],
    xf: (e, X) => { e.p = X.p(M.p3(e.p)); const v = X.v([Math.cos((e.rot || 0) * RAD), Math.sin((e.rot || 0) * RAD), 0]); e.rot = Math.atan2(v[1], v[0]) / RAD; let dz = 0; try { const o = X.p([0, 0, 0]); dz = o[2] || 0; } catch (err) { } e.z = (+e.z || 0) + dz; },
    snaps: e => [{ p: M.p3(e.p), k: 'ins' }],
    info: e => { const q = par(e), nB = Math.max(2, Math.floor((q.b + q.bg / 1000) / ((q.bt + q.bg) / 1000))); return `${e.ad || 'Mekanik kaba ızgara'} · açı ${q.a}° · yükseklik ${M.fmt(q.H, 3)} m (eğim boyu ${M.fmt(q.H / Math.sin(q.a * RAD), 2)} m) · net genişlik ${Math.round(q.b * 1000)} mm · çubuk ${q.bt} mm / açıklık ${q.bg} mm (${nB} çubuk) · deşarj +${M.fmt((+e.z || 0) + q.hd, 3)} · taban ${M.fmt(+e.z || 0, 2)}`; },
  };
  C.addCommand(['KABAIZGARA', 'MEKANIKIZGARA', 'IZGARA'], 'Mekanik kaba ızgara (eğimli, zincirli tırmıklı) 3B — kanal tabanında ızgaranın ön alt orta noktasını ve akış yönünü tıklayın. Varsayılan ölçüler üretici çiziminden (75°, 6.945 m, 500 mm, 10/20 mm).', async (I) => {
    const r = await I_().getParams('Mekanik kaba ızgara', [
      { k: 'b', t: 'Kanal / ızgara net genişliği (mm)', d: 500, al: ['B'] }, { k: 'W', t: 'Çerçeve dış genişliği (mm)', d: 630, al: ['W'] }, { k: 'd', t: 'Çerçeve derinliği (mm)', d: 354, al: ['D'] },
      { k: 'a', t: 'Açı (° yataydan)', d: 75, al: ['A', 'ACI'] }, { k: 'H', t: 'Toplam yükseklik — kanal tabanından (m)', d: 6.945, al: ['H'] },
      { k: 'bt', t: 'Çubuk kalınlığı (mm)', d: 10, al: ['BT'] }, { k: 'bg', t: 'Çubuk açıklığı (mm)', d: 20, al: ['BG'] }, { k: 'Lr', t: 'Izgara boyu — eğim boyunca (m)', d: 1.0, al: ['LR'] },
      { k: 'Lh', t: 'Tahrik kafası boyu (m)', d: 3.45, al: ['LH'] }, { k: 'hd', t: 'Deşarj ağzı yüksekliği — tabandan (m)', d: 5.615, al: ['HD'] },
      { k: 'ms', t: 'Motor tarafı (akışa bakarken)', opts: [['L', 'Sol'], ['R', 'Sağ']], d: 'L', al: ['MS'] }, { k: 'z', t: 'Kanal taban kotu (m)', d: 0, al: ['Z'] },
    ], 'kabaizgara'); if (!r) return;
    E.preview = c => C.prims(Object.assign({ type: 'izgara', p: c, rot: 0 }, r, { b: r.b / 1000, W: r.W / 1000, d: r.d / 1000 }));
    const p = await I.pt('Izgaranın ön alt orta noktası (kanal tabanı)'); E.preview = null; if (!p || typeof p === 'string') return;
    E.base = p; E.preview = c => C.prims(Object.assign({ type: 'izgara', p, rot: Math.atan2(c[1] - p[1], c[0] - p[0]) / RAD }, r, { b: r.b / 1000, W: r.W / 1000, d: r.d / 1000 }));
    const q = await I.pt('Akış yönü (ızgara bu yöne yatık, deşarj bu tarafta)'); E.preview = null; E.base = null; if (!q || typeof q === 'string') return;
    C.ensureLayer('ARI_IZGARA', 4, 'CONTINUOUS', 25);
    const z = Math.abs(p[2] || 0) > 1e-6 ? p[2] : +r.z || 0;
    const e = C.add(C.newEnt('izgara', { p: [p[0], p[1], 0], rot: Math.atan2(q[1] - p[1], q[0] - p[0]) / RAD, z, a: +r.a, H: +r.H, b: r.b / 1000, W: r.W / 1000, d: r.d / 1000, bt: +r.bt, bg: +r.bg, Lr: +r.Lr, Lh: +r.Lh, hd: +r.hd, ms: r.ms, ad: 'MEKANİK KABA IZGARA', layer: 'ARI_IZGARA' })); delete e.sp;
    C.changed(); C.log(T.izgara.info(e));
  });
})(window.C);

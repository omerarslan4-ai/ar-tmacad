/* ArıtmaCAD — KAPI TİPLERİ: seksiyonel kapı ve çelik kapı (ayrı modül)
   Komutlar (insaat.js): SEKSIYONELKAPI, CELIKKAPI — ebatlar ayar penceresinden, sonradan Özellikler'den değişir.
   Nesne: type 'acik', kind 'kapi', kTip 'S' (seksiyonel: pnl panel yüksekliği, ray tavan rayı) | 'C' (çelik: kasa genişliği, kanat 1/2).
   Burada: plan sembolü, 3B görünüş ve bilgi satırı. */
(function (C) {
  'use strict';
  const T = C.T, I = C._ins; if (!T || !T.acik || !I || !I.hostFrame) return;
  const M = C.M, { L, P, A } = C.prim, hexa = I.hexa, newMesh = I.newMesh;
  const D = T.acik, p0 = D.prims, m0 = D.mesh, i0 = D.info;

  D.prims = o => {
    if (o.kind !== 'kapi' || (o.kTip !== 'S' && o.kTip !== 'C')) return p0(o);
    const H = I.hostFrame(o); if (!H) return []; const { sf, F } = H, w = +o.w || 1, s0 = (+o.s || 0) - w / 2, s1 = (+o.s || 0) + w / 2, out = [];
    const Pp = (s, of) => [sf.a[0] + sf.u[0] * s + sf.nn[0] * of, sf.a[1] + sf.u[1] * s + sf.nn[1] * of, 0], mid = (F.lB + F.rB) / 2;
    const side = o.yon === 'R' ? F.rB : F.lB, sg = o.yon === 'R' ? -1 : 1;
    if (o.kTip === 'S') {
      // kapı paneli iç yüzde (kalın çizgi), yan kasalar; tavan rayı iç tarafa kesik çizgi (kapı yüksekliği kadar)
      const tp = 0.05, o1 = side + sg * 0.02, o2 = o1 + sg * tp;
      out.push(P([Pp(s0, o1), Pp(s1, o1), Pp(s1, o2), Pp(s0, o2)], true, { lw: 35 }));
      for (const s of [s0, s1]) out.push(L(Pp(s, F.lB), Pp(s, F.rB), { lw: 25 }));
      if (o.ray !== false) { const Lr = +o.hh || 4, k = 0.05; for (const s of [s0 + k, s1 - k]) out.push(L(Pp(s, o2), Pp(s, o2 + sg * Lr), { lw: 13, lt: 'HIDDEN', color: 8 })); out.push(L(Pp(s0 + k, o2 + sg * Lr), Pp(s1 - k, o2 + sg * Lr), { lw: 13, lt: 'HIDDEN', color: 8 })); }
      out.push(L(Pp(s0, mid), Pp(s1, mid), { lw: 13, lt: 'HIDDEN', color: 8 }));
      return out;
    }
    // çelik kapı: kasa (iki yanda, duvar kalınlığında), kalın kanat çizgisi ve açılış yayı
    const ks = Math.max(0.03, +o.kasa || 0.05);
    for (const [a, b] of [[s0, s0 + ks], [s1 - ks, s1]]) out.push(P([Pp(a, F.lB), Pp(b, F.lB), Pp(b, F.rB), Pp(a, F.rB)], true, { lw: 25 }));
    const a0 = s0 + ks, a1 = s1 - ks, hinge = o.el === 'S' ? a1 : a0, other = o.el === 'S' ? a0 : a1;
    const leaves = o.kanat === 2 ? [[a0, (a0 + a1) / 2, 1], [a1, (a0 + a1) / 2, -1]] : [[hinge, other, hinge === a0 ? 1 : -1]];
    for (const [hs, os, dir] of leaves) {
      const lw = Math.abs(os - hs), pH = Pp(hs, side), t = 0.05, tip = [pH[0] + sf.nn[0] * sg * lw, pH[1] + sf.nn[1] * sg * lw, 0], tip2 = [tip[0] + sf.u[0] * dir * t, tip[1] + sf.u[1] * dir * t, 0], pH2 = [pH[0] + sf.u[0] * dir * t, pH[1] + sf.u[1] * dir * t, 0];
      out.push(P([pH, tip, tip2, pH2], true, { lw: 35 }));
      const b0 = Math.atan2(sf.u[1] * dir, sf.u[0] * dir), b1 = Math.atan2(sf.nn[1] * sg, sf.nn[0] * sg); let s = b0, e2 = b1; if (M.normAng(e2 - s) > Math.PI) { const q = s; s = e2; e2 = q; }
      out.push(A(pH, lw, s, e2, { lw: 13 }));
    }
    return out;
  };

  D.mesh = o => {
    if (o.kind !== 'kapi' || (o.kTip !== 'S' && o.kTip !== 'C')) return m0(o);
    const H = I.hostFrame(o); if (!H) return []; const { h, sf, F } = H, w = +o.w || 1, s0 = (+o.s || 0) - w / 2, s1 = (+o.s || 0) + w / 2, z0 = +h.z0 || 0, z1 = z0 + (+o.hh || 2.1);
    const Pp = (s, of, z) => [sf.a[0] + sf.u[0] * s + sf.nn[0] * of, sf.a[1] + sf.u[1] * s + sf.nn[1] * of, z], out = newMesh();
    const box = (sa, sb, oa, ob, za, zb, col) => hexa(out, [Pp(sa, oa, za), Pp(sb, oa, za), Pp(sb, ob, za), Pp(sa, ob, za), Pp(sa, oa, zb), Pp(sb, oa, zb), Pp(sb, ob, zb), Pp(sa, ob, zb)], col);
    const side = o.yon === 'R' ? F.rB : F.lB, sg = o.yon === 'R' ? -1 : 1;
    if (o.kTip === 'S') {
      const GRI = [0.72, 0.74, 0.76], KOYU = [0.45, 0.47, 0.50], o1 = side + sg * 0.01, o2 = o1 + sg * 0.045, fr = 0.08, pn = Math.max(0.2, +o.pnl || 0.5);
      // yan kasalar ve üst kasa (iç yüzde)
      box(s0 - fr, s0, Math.min(o1, o2), Math.max(o1, o2), z0, z1 + fr, KOYU); box(s1, s1 + fr, Math.min(o1, o2), Math.max(o1, o2), z0, z1 + fr, KOYU); box(s0, s1, Math.min(o1, o2), Math.max(o1, o2), z1, z1 + fr, KOYU);
      // paneller (aralarında ince derz)
      const n = Math.max(1, Math.round((z1 - z0) / pn)), ph = (z1 - z0) / n, dz = 0.008;
      for (let i = 0; i < n; i++) { const za = z0 + i * ph + (i ? dz / 2 : 0), zb = z0 + (i + 1) * ph - (i < n - 1 ? dz / 2 : 0); box(s0, s1, Math.min(o1, o2), Math.max(o1, o2), za, zb, GRI); out.edges3.push([Pp(s0, o2, za), Pp(s1, o2, za)]); }
      return [out];
    }
    const CEL = [0.42, 0.45, 0.48], KAN = [0.55, 0.58, 0.62], ks = Math.max(0.03, +o.kasa || 0.05), mid = (F.lB + F.rB) / 2, ft = Math.abs(F.lB - F.rB) / 2;
    box(s0, s0 + ks, mid - ft, mid + ft, z0, z1, CEL); box(s1 - ks, s1, mid - ft, mid + ft, z0, z1, CEL); box(s0, s1, mid - ft, mid + ft, z1 - ks, z1, CEL);
    const of = side - sg * 0.03, a0 = s0 + ks + 0.005, a1 = s1 - ks - 0.005, lv = o.kanat === 2 ? [[a0, (a0 + a1) / 2 - 0.003], [(a0 + a1) / 2 + 0.003, a1]] : [[a0, a1]];
    for (const [a, b] of lv) {
      box(a, b, Math.min(of, of - sg * 0.05), Math.max(of, of - sg * 0.05), z0 + 0.01, z1 - ks - 0.005, KAN);
      const kol = Math.abs(b - a) > 0.4 ? (o.kanat === 2 ? (a < (a0 + a1) / 2 ? b - 0.08 : a + 0.08) : (o.el === 'S' ? a + 0.08 : b - 0.08)) : (a + b) / 2, zk = z0 + 1.05, ok = of + sg * 0.005;
      box(kol - 0.06, kol + 0.06, Math.min(ok, ok + sg * 0.05), Math.max(ok, ok + sg * 0.05), zk - 0.012, zk + 0.012, [0.85, 0.86, 0.88]);
    }
    return [out];
  };

  D.info = o => {
    if (o.kind !== 'kapi' || (o.kTip !== 'S' && o.kTip !== 'C')) return i0(o);
    const wh = `${M.fmt((+o.w || 1) * 100, 0)}×${M.fmt((+o.hh || 2.1) * 100, 0)} cm`;
    if (o.kTip === 'S') { const n = Math.max(1, Math.round((+o.hh || 4) / Math.max(0.2, +o.pnl || 0.5))); return `Seksiyonel kapı ${wh} · ${n} panel (${M.fmt((+o.hh || 4) / n * 100, 0)} cm)`; }
    return `Çelik kapı ${wh} · ${o.kanat === 2 ? 'çift' : 'tek'} kanat · kasa ${M.fmt((+o.kasa || 0.05) * 100, 0)} cm`;
  };
})(window.C);

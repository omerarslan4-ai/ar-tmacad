/* ArıtmaCAD — KILAVUZ OK (LEADER) nesnesi
   leader: { pts: [uç (okun gösterdiği nokta), kırılma, …, son], asz (ok boyu, model birimi) }
   Ekranda: çoklu çizgi + uca doğru dolu üçgen ok (ilk parça doğrultusunda — ok ucu çizgiyle hep hizalı).
   DXF (R2000+): gerçek AutoCAD LEADER olarak yazılır (ok boyu DSTYLE geçersiz kılmasıyla: DIMASZ = asz, DIMSCALE = 1);
   AutoCAD'de noktalar taşınsa da ok bozulmaz. R12'de çizgi + SOLID ok. Statik paftalarındaki poz okları bu nesneyle gelir. */
(function (C) {
  'use strict'; if (!C || !C.T) return;
  const M = C.M, { P, S } = C.prim;
  const ok = (e) => { const p = e.pts.map(M.p3); if (p.length < 2) return []; const a = p[0], b = p[1], d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]) || 1, u = [d[0] / l, d[1] / l], n = [-u[1], u[0]], s = +e.asz || 0.1, w = s / 3.2;
    return [S([a, [a[0] + u[0] * s + n[0] * w, a[1] + u[1] * s + n[1] * w, a[2]], [a[0] + u[0] * s - n[0] * w, a[1] + u[1] * s - n[1] * w, a[2]]])]; };
  C.T.leader = {
    label: 'Kılavuz ok',
    prims: e => [P(e.pts, false), ...ok(e)],
    snaps: e => e.pts.map((q, i) => ({ p: M.p3(q), k: i ? 'end' : 'nea' })),
    xf: (e, X) => { e.pts = e.pts.map(q => X.p(q)); },
    info: e => `Kılavuz ok (${e.pts.length} nokta)`,
  };
  if (C.PROPFIELDS) C.PROPFIELDS.leader = [['asz', 'Ok boyu', 'n']];
  C.leaderOk = ok;
})(window.C);

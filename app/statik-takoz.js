/* ArıtmaCAD — 3B paspayı takozu gösterimi (ayrı modül)
   donati3 nesnesi tip:'takoz' ise her "çubuk" [kalıp yüzü → donatı] arası bir beton takoz silindiri (kapaklı) olarak çizilir. */
(function (C) {
  'use strict';
  const T = C.T && C.T.donati3; if (!T) return;
  const RENK = [0.62, 0.60, 0.56];
  const silindir = (out, a, b, r, n) => {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d); if (L < 1e-6) return; const u = d.map(v => v / L);
    const p = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]; let v1 = [u[1] * p[2] - u[2] * p[1], u[2] * p[0] - u[0] * p[2], u[0] * p[1] - u[1] * p[0]]; const l1 = Math.hypot(...v1); v1 = v1.map(x => x / l1);
    const v2 = [u[1] * v1[2] - u[2] * v1[1], u[2] * v1[0] - u[0] * v1[2], u[0] * v1[1] - u[1] * v1[0]], i0 = out.v.length;
    for (let k = 0; k < n; k++) { const t = k / n * Math.PI * 2, o = [v1[0] * Math.cos(t) + v2[0] * Math.sin(t), v1[1] * Math.cos(t) + v2[1] * Math.sin(t), v1[2] * Math.cos(t) + v2[2] * Math.sin(t)]; out.v.push([a[0] + o[0] * r, a[1] + o[1] * r, a[2] + o[2] * r], [b[0] + o[0] * r, b[1] + o[1] * r, b[2] + o[2] * r]); out.vn.push(o, o); }
    for (let k = 0; k < n; k++) { const j = (k + 1) % n, A = i0 + 2 * k, B = A + 1, Cc = i0 + 2 * j, D = Cc + 1; out.f.push([A, Cc, D], [A, D, B]); out.fc.push(RENK, RENK); }
    const ca = out.v.length; out.v.push(a.slice(), b.slice()); out.vn.push(u.map(x => -x), u.slice());
    for (let k = 0; k < n; k++) { const j = (k + 1) % n; out.f.push([ca, i0 + 2 * j, i0 + 2 * k], [ca + 1, i0 + 2 * k + 1, i0 + 2 * j + 1]); out.fc.push(RENK, RENK); }
  };
  const m0 = T.mesh, i0 = T.info;
  T.mesh = e => { if (e.tip !== 'takoz') return m0(e); const out = { t: 'tri', v: [], vn: [], f: [], fc: [], edges3: [] }, r = +e.r || 0.02; for (const b of e.bars || []) for (let i = 1; i < b.length; i++) silindir(out, b[i - 1], b[i], r, 8); return [out]; };
  T.info = e => (e.tip === 'takoz' ? `${e.eleman || ''} · ${e.tanim || 'Paspayı takozu'} · ${(e.bars || []).length} adet` : i0(e));
})(window.C);

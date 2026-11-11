/* ArıtmaCAD — 3B donatının hafif gösterimi (ayrı modül)
   Büyük yapılarda (ör. 50 bin m³/gün anaerobik havuz: 65 bin çubuk, 560 bin parça) her çubuk parçasını altıgen boru olarak
   çizmek milyonlarca üçgen ve birkaç GB bellek ister; program kilitlenir. Bu modül:
   • sade(bars, tol): eğri çubuklardaki sık noktaları seyreltir (kiriş sapması ≤ tol; kanca ve köşeler korunur).
   • T.donati3.lines3: modeldeki toplam çubuk parçası SINIR'ı aşınca donatı 3B'de çap renginde ince çizgi olarak çizilir.
     Bu kipte gövde ağı (C.meshes) da üretilmez. Seçilen (küçük) grup yine boru olarak çizilir — ayrıntıya bakmak için grubu seçmek yeter.
   Test: node test/donati-hafif.test.js */
(function (C) {
  'use strict';
  /* p noktasının a–b doğru parçasına uzaklığı */
  const uzak = (p, a, b) => {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], L2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
    const t = L2 > 1e-12 ? Math.max(0, Math.min(1, (w[0] * d[0] + w[1] * d[1] + w[2] * d[2]) / L2)) : 0;
    return Math.hypot(w[0] - t * d[0], w[1] - t * d[1], w[2] - t * d[2]);
  };
  /* tek çubuk: çıpadan başlayıp aradaki bütün noktalar kirişe tol'dan yakın kaldıkça ilerler */
  const sadeCubuk = (b, tol) => {
    if (!b || b.length < 3) return b;
    const out = [b[0]]; let a = 0;
    while (a < b.length - 1) {
      let e = a + 1;
      for (let j = a + 2; j < b.length; j++) { let ok = true; for (let k = a + 1; k < j; k++) if (uzak(b[k], b[a], b[j]) > tol) { ok = false; break; } if (!ok) break; e = j; }
      out.push(b[e]); a = e;
    }
    return out;
  };
  const sade = (bars, tol) => (bars || []).map(b => sadeCubuk(b, tol == null ? 0.003 : tol));
  const parcaSay = bars => { let n = 0; for (const b of bars || []) n += Math.max(0, b.length - 1); return n; };
  if (typeof module !== 'undefined' && module.exports) module.exports = { sade, sadeCubuk, parcaSay };
  if (!C || !C.T || !C.T.donati3) return;

  const T = C.T.donati3, SINIR = 40000, SEC_SINIR = 6000, sayac = new WeakMap();
  const nSeg = e => { const B = e.bars || []; let n = sayac.get(B); if (n == null) { n = parcaSay(B); sayac.set(B, n); } return n; };
  C._statikDonatiSade = sade;
  C.donati3Parca = () => { let n = 0; for (const e of C.doc.ents) if (e.type === 'donati3' && C.layer(e.layer).on) n += nSeg(e); return n; };
  C.donati3Hafif = () => C.donati3Parca() > SINIR;
  /* kalın (boru) mı çizilecek: toplam az ise hep; çok ise yalnız seçili küçük grup */
  const kalin = e => !C.donati3Hafif() || (nSeg(e) <= SEC_SINIR && (C.sel || []).includes(e));
  /* hafif kipte gövde ağı üretilmez: 3B görünüm dışındaki her yer de (kesit, görünüş, dışa aktarım, yakalama) C.meshes / C.entTris
     üzerinden bu ağı ister; milyonlarca üçgen orada da belleği doldurur */
  const m0 = T.mesh; T.mesh = e => (kalin(e) ? m0(e) : []);
  /* 3B görünüm: { seg: [x,y,z, x,y,z, ...], col } döndürürse nesne üçgen yerine çizgi olarak çizilir (view3d.build) */
  T.lines3 = e => {
    const k = kalin(e), dolu = !!(e._c && e._c.t && e._c.t.pos && e._c.t.pos.length);
    if (e._c && (e._c.t !== undefined || e._c.m !== undefined) && dolu !== k) delete e._c; // kip değişti: saklanan ağı at
    if (k) return null;
    const seg = []; for (const b of e.bars || []) for (let i = 1; i < b.length; i++) { const p = b[i - 1], q = b[i]; seg.push(p[0], p[1], p[2], q[0], q[1], q[2]); }
    return { seg, col: e.tip === 'takoz' ? [0.62, 0.60, 0.56] : (C._don3Renk && C._don3Renk[e.F]) || [0.8, 0.2, 0.2] };
  };
})(typeof window !== 'undefined' ? window.C : null);

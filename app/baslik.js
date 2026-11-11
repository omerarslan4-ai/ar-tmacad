/* ArıtmaCAD — görünüş başlığı (AutoCAD "view label" benzeri): altı çizili başlık + altında yarı boyda ölçek yazısı.
   Açıklama nesnesidir: her düzen penceresinde o pencerenin ölçeğini yazar ve boyu kağıtta sabit kalır. */
(function (C) {
  'use strict';
  const M = C.M, { L, TX } = C.prim;
  C.T.baslik = {
    label: 'Görünüş başlığı',
    prims: e => {
      const k = C.doc.set.anno / 1000, h = (e.hp || 5) * k, st = e.st || undefined, p = M.p3(e.p);
      if (e.ay != null && e.dmm != null) p[1] = e.ay - e.dmm * k; // çizimin altına kağıtta sabit mesafe: her pencere ölçeğinde çakışmaz
      const w = C.measureText ? C.measureText(e.s, h, C.textStyle ? C.textStyle(st) : undefined) * ((C.textStyle && C.textStyle(st).wf) || 1) : e.s.length * h * 0.8;
      const out = [TX(p, h, e.s, 0, 'BC', { st })];
      const y1 = p[1] - h * 0.35, y2 = y1 - h * 0.18;
      out.push(L([p[0] - w / 2 - h * 0.2, y1, 0], [p[0] + w / 2 + h * 0.2, y1, 0], { lw: 50 }));
      if (e.dbl !== false) out.push(L([p[0] - w / 2 - h * 0.2, y2, 0], [p[0] + w / 2 + h * 0.2, y2, 0], { lw: 18 }));
      if (e.olcek !== false) out.push(TX([p[0], y2 - h * 0.3, 0], h / 2, (e.on || 'Ölçek') + ' ' + (e.ol || ('1/' + (+C.doc.set.anno.toFixed(2)))), 0, 'TC', { st }));
      return out;
    },
    xf: (e, X) => { if (e.ay != null) { const q = X.p([e.p[0], e.ay, 0]); e.ay = q[1]; } e.p = X.p(e.p); },
    snaps: e => [{ p: M.p3(e.p), k: 'ins' }],
    info: e => `"${e.s}" · ${e.hp || 5} mm · ölçek yazısı ${e.olcek === false ? 'yok' : 'var'}`,
  };
  if (C.ANNO_TYPES) C.ANNO_TYPES.add('baslik');
  C.addCommand(['VIEWLABEL', 'BASLIK', 'GORUNUSBASLIGI'], 'Görünüş başlığı: altı çizili yazı + altında yarı boyda ölçek (pafta/pencere ölçeğine göre kendini günceller). BASLIK nokta "PLAN" [yükseklik mm]', async (I) => {
    const p = await I.pt('Başlığın yeri (alt orta)'); if (!p || typeof p === 'string') return;
    const s = await I.str('Başlık', 'PLAN'); if (!s) return;
    const hp = await I.num('Yazı yüksekliği (kağıtta mm)', 5) || 5;
    C.std('YAZI'); C.add(C.newEnt('baslik', { p: M.p3(p), s, hp, layer: 'YAZI' }));
  });
})(window.C);

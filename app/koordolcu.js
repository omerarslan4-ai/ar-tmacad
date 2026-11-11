/* ArıtmaCAD — KOORDİNAT ÖLÇÜSÜ (AutoCAD DIMORDINATE + harita tipi Y/X etiketi)
   koord nesnesi: { p: ölçülen nokta, q: yazı/kılavuz ucu, m: 'XY' | 'X' | 'Y', lab: 'H' (harita: Y=Sağa, X=Yukarı) | 'A' (AutoCAD: X=doğu, Y=kuzey), dec }
   Açıklama nesnesidir (yazı boyu pafta ölçeğine göre); nokta taşınınca değer kendini günceller. */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, T = C.T, { L, TX, CI, S } = C.prim, RAD = Math.PI / 180;
  const fmt = (v, d) => { const s = Math.abs(v).toFixed(d), [i, f] = s.split('.'); return (v < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (f ? ',' + f : ''); };
  const labels = e => {
    const d = e.dec != null ? e.dec : 3, x = e.p[0], y = e.p[1];
    if (String(e.lab || '').toUpperCase() === 'A') return { e: 'X = ' + fmt(x, d), n: 'Y = ' + fmt(y, d) };
    return { e: 'Y = ' + fmt(x, d), n: 'X = ' + fmt(y, d) }; // harita (Türkiye): Y sağa (doğu), X yukarı (kuzey)
  };
  T.koord = {
    label: 'Koordinat ölçüsü',
    prims: e => {
      const set = C.doc.set, th = C.annoH(set.dimTextH || 2.5), ah = C.annoH(set.dimArrow || 2.5), p = M.p3(e.p), q = M.p3(e.q), out = [];
      const lb = labels(e), m = String(e.m || 'XY').toUpperCase();
      if (m === 'XY') {
        const r = ah * 0.45; out.push(CI(p, r, { lw: 18 }), L([p[0] - r * 1.8, p[1], 0], [p[0] + r * 1.8, p[1], 0], { lw: 13 }), L([p[0], p[1] - r * 1.8, 0], [p[0], p[1] + r * 1.8, 0], { lw: 13 }));
        const side = q[0] >= p[0] ? 1 : -1, w = Math.max(lb.e.length, lb.n.length) * th * 0.62 + th * 0.6, q2 = [q[0] + side * w, q[1], 0];
        out.push(L(p, q, { lw: 18 }), L(q, q2, { lw: 18 }));
        const tx = side > 0 ? q[0] + th * 0.3 : q2[0] + th * 0.3;
        out.push(TX([tx, q[1] + th * 0.45, 0], th, lb.e, 0, 'L'), TX([tx, q[1] - th * 1.45, 0], th, lb.n, 0, 'L'));
        return out;
      }
      // AutoCAD ordinat: X ölçüsü düşey kılavuz, Y ölçüsü yatay kılavuz; değer kılavuz ucunda
      const val = m === 'X' ? lb.e : lb.n;
      if (m === 'X') { const qq = [p[0], q[1], 0], dir = Math.sign(q[1] - p[1]) || 1; out.push(L([p[0], p[1] + dir * ah * 0.6, 0], qq, { lw: 18 })); out.push(TX([qq[0] - th * 0.5, qq[1] + dir * th * 0.4, 0], th, val, Math.PI / 2, dir > 0 ? 'L' : 'R')); }
      else { const qq = [q[0], p[1], 0], dir = Math.sign(q[0] - p[0]) || 1; out.push(L([p[0] + dir * ah * 0.6, p[1], 0], qq, { lw: 18 })); out.push(TX([qq[0] + dir * th * 0.4, qq[1] - th * 0.5, 0], th, val, 0, dir > 0 ? 'L' : 'R')); }
      return out;
    },
    xf: (e, X) => { e.p = X.p(M.p3(e.p)); e.q = X.p(M.p3(e.q)); },
    snaps: e => [{ p: M.p3(e.p), k: 'end' }],
    info: e => { const lb = labels(e); return `${lb.e} · ${lb.n}`; },
  };
  if (C.ANNO_TYPES) C.ANNO_TYPES.add('koord');

  C.addCommand(['DIMORDINATE', 'DOR', 'KOORDOLCU', 'KOORDINATOLCU', 'KOORDINATOLCUSU'], 'Koordinat ölçüsü: noktayı seçin, yazının yerini gösterin. Seçenek: XY = iki satır Y/X etiketi (varsayılan), X / Y = AutoCAD ordinat ölçüsü. E = etiket biçimi (Harita: Y=Sağa X=Yukarı / AutoCAD: X,Y). Ondalık hane ve etiket biçimi sonradan Özellikler\'den değiştirilebilir.', async (I) => {
    const st = C.doc.set; let mode = st.koordMode || 'XY';
    for (; ;) {
      const r = await E.ask('pt', `Koordinatı yazılacak nokta [${mode}]`, { kw: [['XY', 'İki satır Y/X'], ['X', 'Ordinat X'], ['Y', 'Ordinat Y'], ['E', 'Etiket biçimi']] });
      if (r == null || r === '') return;
      if (r === 'XY' || r === 'X' || r === 'Y') { mode = st.koordMode = r; continue; }
      if (r === 'E') { const k = await I.kw('Etiket', [['H', 'Harita: Y=Sağa (doğu), X=Yukarı (kuzey)'], ['A', 'AutoCAD: X=doğu, Y=kuzey']], st.koordLab || 'H'); if (k) st.koordLab = k; continue; }
      if (!Array.isArray(r)) return;
      const p = r, base = { p: M.p3(p), m: mode, lab: st.koordLab || 'H', dec: st.koordDec != null ? st.koordDec : 3, layer: 'OLCU' };
      E.base = p; E.rubber = true; E.preview = q => C.prims(Object.assign({ type: 'koord', q: M.p3(q) }, base));
      const q = await I.pt('Yazının yeri (kılavuz ucu)'); E.preview = null; if (!q || typeof q === 'string') return;
      C.ensureLayer('OLCU', 3, 'CONTINUOUS', 18);
      const e = C.add(C.newEnt('koord', Object.assign({}, base, { q: M.p3(q) })));
      C.log('Koordinat: ' + T.koord.info(e));
      if (E.scriptMode) return;
    }
  });
})(window.C);

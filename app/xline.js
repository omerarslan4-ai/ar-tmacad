/* ArıtmaCAD — YARDIMCI ÇİZGİ (AutoCAD XLINE / XL gibi), 2B ve 3B
   XLINE (XL, YARDIMCICIZGI): bir noktadan geçen sonsuz yardımcı çizgi.
     X = yatay (X ekseni), Y = yatay (Y ekseni), Z = düşey (Z ekseni), A = açı (XY düzleminde), O = ofset (seçilen çizgiye paralel),
     varsayılan = iki nokta (3B'de eğik doğrultu dahil). Her seçenekte art arda noktalar verilir (Enter = bitir), AutoCAD'deki gibi.
   Varlık: { type: 'xline', p: [x,y,z] geçtiği nokta, d: [dx,dy,dz] birim doğrultu }. "Tümünü göster" ve model sınırlarına katılmaz.
   Çizim: geçtiği noktadan iki yöne 5 km (pratikte sonsuz). Katman: YARDIMCI (gri, kesikli) — kapatılabilir / dondurulabilir. */
(function () {
  'use strict';
  const C = window.C; if (!C || !C.T || !C.addCommand) return;
  const { L } = C.prim, R = 5000;
  const nrm = v => { const l = Math.hypot(v[0], v[1], v[2] || 0) || 1; return [v[0] / l, v[1] / l, (v[2] || 0) / l]; };
  const p3 = p => [p[0], p[1], p[2] || 0];
  const uc = e => { const p = p3(e.p), d = nrm(e.d); return [[p[0] - d[0] * R, p[1] - d[1] * R, p[2] - d[2] * R], [p[0] + d[0] * R, p[1] + d[1] * R, p[2] + d[2] * R]]; };
  C.T.xline = {
    label: 'Yardımcı çizgi (XLINE)',
    prims: e => { const [a, b] = uc(e); return [L(a, b)]; },
    snaps: e => [{ p: p3(e.p), k: 'end' }],
    xf: (e, X) => { const p = p3(e.p), q = [p[0] + e.d[0], p[1] + e.d[1], p[2] + (e.d[2] || 0)], P2 = X.p(p), Q2 = X.p(q); e.p = p3(P2); e.d = nrm([Q2[0] - P2[0], Q2[1] - P2[1], (Q2[2] || 0) - (P2[2] || 0)]); },
    info: e => { const d = nrm(e.d), yon = Math.abs(d[2]) > 0.999 ? 'düşey (Z)' : Math.abs(d[2]) < 1e-6 ? `yatay, XY açısı ${(Math.atan2(d[1], d[0]) * 180 / Math.PI).toFixed(2)}°` : `eğik (Z eğimi ${(Math.asin(d[2]) * 180 / Math.PI).toFixed(2)}°)`; return `sonsuz yardımcı çizgi · ${yon} · nokta ${p3(e.p).map(v => v.toFixed(3)).join(', ')}`; },
  };
  const katman = () => { const n = 'YARDIMCI'; if (!C.doc.layers[n]) { const Ly = C.ensureLayer(n, 8, 'DASHED', 13); if (Ly) Object.assign(Ly, { color: 8 }); } return n; };
  const yeni = (p, d) => { const e = C.add(C.newEnt('xline', { p: p3(p), d: nrm(d), layer: katman() })); return e; };
  const onizle = d => c => { const [a, b] = uc({ p: c, d }); return [L(a, b)]; };

  C.addCommand(['XLINE', 'XL', 'YARDIMCICIZGI', 'YC'], 'Sonsuz yardımcı çizgi (AutoCAD XLINE gibi), 2B ve 3B: X / Y yatay, Z düşey, A açı, O ofset ya da iki nokta. Art arda nokta verilir, Enter bitirir. Katman YARDIMCI.', async (I) => {
    const E = C.cmd;
    const s = await I.pt('Nokta ya da seçenek', { kw: [['X', 'Yatay X'], ['Y', 'Yatay Y'], ['Z', 'Düşey Z'], ['A', 'Açı'], ['O', 'Ofset']] });
    if (s == null) return;
    let d = null;
    if (s === 'X') d = [1, 0, 0]; else if (s === 'Y') d = [0, 1, 0]; else if (s === 'Z') d = [0, 0, 1];
    else if (s === 'A') { const a = await I.num('Açı (°, X ekseninden, XY düzleminde)', 45); if (a == null || !isFinite(+a)) return; d = [Math.cos(+a * Math.PI / 180), Math.sin(+a * Math.PI / 180), 0]; }
    else if (s === 'O') {
      const off = await I.num('Ofset mesafesi (m)', 1); if (off == null || !isFinite(+off)) return;
      for (; ;) {
        const ss = await I.sel('Paralel alınacak çizgi / yardımcı çizgi (bir tane)'); if (!ss || !ss.length) break; const e = ss[0];
        let p0, dd; if (e.type === 'xline') { p0 = p3(e.p); dd = nrm(e.d); } else if (e.type === 'line') { p0 = p3(e.a); dd = nrm([e.b[0] - e.a[0], e.b[1] - e.a[1], (e.b[2] || 0) - (e.a[2] || 0)]); } else { C.warn('Çizgi ya da yardımcı çizgi seçin.'); continue; }
        const yan = await I.pt('Hangi tarafa'); if (!yan || typeof yan === 'string') break;
        const v = [yan[0] - p0[0], yan[1] - p0[1], (yan[2] || 0) - p0[2]], t = v[0] * dd[0] + v[1] * dd[1] + v[2] * dd[2], w = nrm([v[0] - dd[0] * t, v[1] - dd[1] * t, v[2] - dd[2] * t]);
        yeni([p0[0] + w[0] * +off, p0[1] + w[1] * +off, p0[2] + w[2] * +off], dd);
      }
      return;
    }
    if (d) { // sabit doğrultu: art arda geçtiği noktalar
      for (; ;) { E.base = null; E.preview = onizle(d); const p = await I.pt(`Geçtiği nokta (${s === 'Z' ? 'düşey' : 'yatay ' + s})`); if (!p || typeof p === 'string') break; yeni(p, d); }
      return;
    }
    // iki nokta: ilk nokta s, sonra art arda doğrultu noktaları (hepsi s'den geçer)
    const a = p3(s);
    for (; ;) {
      E.base = a; E.preview = c => { const v = [c[0] - a[0], c[1] - a[1], (c[2] || 0) - a[2]]; return Math.hypot(...v) < 1e-9 ? [] : onizle(nrm(v))(a); };
      const p = await I.pt('Doğrultu noktası (ORTO F8: X / Y / Z)'); if (!p || typeof p === 'string') break;
      const v = [p[0] - a[0], p[1] - a[1], (p[2] || 0) - a[2]]; if (Math.hypot(...v) < 1e-9) continue; yeni(a, v);
    }
  });
})();

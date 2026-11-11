/* ArıtmaCAD — MALZEME AÇILIMI: DİK ÇİZGİ STİLİ (mimari paftalar)
   Açılım çizgisi katmanlara diktir ve bütün katmanları keser; her katman sınırında nokta vardır.
     Döşeme / temel : düşey çizgi katmanları keser, yapının üstüne çıkar; yazılar üst üste, her satır altı çizili,
                      sıra üstteki katmandan alttakine.
     Duvar / perde  : yatay çizgi katmanları keser, yana çıkar, sonra yukarı döner; yazılar yığın halinde.
   Katman sınırları kesitin 3B modeldeki yerinden okunur (KESITAL kesit bilgisi). Bilgi yoksa çizgi tek noktadan çıkar.
   Stil: ACILIMSTIL (DIK | ESKI). Diğer dosyalara dokunmaz; T.acilim çiziminin üstüne sarılır. */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, { L, TX, S } = C.prim;
  if (!T.acilim) return;
  const p0 = T.acilim.prims;
  const tH = () => C.annoH(C.doc.set.acilimH || 1.8);
  const stil = () => (C.doc.set.acilimStil || 'DIK');
  const nokta = (c, r) => { const o = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; o.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, 0]); } return S(o); };

  /* katman sınırları (kesit çizim koordinatında) */
  const sinirlar = e => {
    try {
      const pr = C._probe; if (!e.src || !pr) return null;
      const km = (C.doc.set.kesitMeta || {})[e.src.k]; if (!km) return null;
      const m = Object.assign({ nm: e.src.k }, km), s = e.src.s, z = e.src.z, ep = 0.004;
      const x = m.a[0] + m.u[0] * s + m.n[0] * ep, y = m.a[1] + m.u[1] * s + m.n[1] * ep;
      const st = pr.vStack(x, y, m.gb || 0), hit = pr.chainV(st, z).find(it => z <= it.zt + 0.004 && z >= it.zb - 0.004);
      const ch = hit && pr.isWall(hit) ? [] : pr.chainV(st.filter(it => !pr.isWall(it)), z);
      if (ch.length && !(hit && pr.isWall(hit))) { // döşeme: z sınırları
        const zs = [ch[0].zt]; ch.forEach(it => zs.push(it.zb));
        return { mod: 'doseme', x: m.q0[0] + s, ys: [...new Set(zs.map(v => +(m.q0[1] + v).toFixed(4)))].sort((a, b) => b - a) };
      }
      const d = [m.u[0], m.u[1], 0], H = pr.hStack([x, y, z], d), it = H && H.items; if (!it || !it.length) return null;
      const sc = 60; let k = it.findIndex(q => sc >= q.s0 - 0.004 && sc <= q.s1 + 0.004); if (k < 0) return null;
      let a = k, b = k; while (a > 0 && it[a].s0 - it[a - 1].s1 < 0.03) a--; while (b < it.length - 1 && it[b + 1].s0 - it[b].s1 < 0.03) b++;
      const xs = []; for (let i = a; i <= b; i++) xs.push(it[i].s0, it[i].s1);
      return { mod: 'duvar', y: m.q0[1] + z, xs: [...new Set(xs.map(v => +(m.q0[0] + s + (v - sc)).toFixed(4)))].sort((p, q) => p - q) };
    } catch (er) { return null; }
  };

  let SN = new WeakMap();
  const dik = e => {
    const th = tH(), lsp = th * 1.8, a = M.p3(e.a), p = M.p3(e.p), ln = e.lines || [], n = Math.max(1, ln.length), out = [], r = th * 0.3;
    const sd = e.side || (p[0] >= a[0] ? 1 : -1), uz = s => th * 0.75 + s.length * th * 0.72; // satır çizgisi boyu
    const yigin = (x0, yb, yon) => { // yb: en alt satırın çizgisi; satırlar yukarı doğru, ilk satır en üstte
      ln.forEach((s, i) => { const y = yb + (n - 1 - i) * lsp, w = uz(s); out.push(L([x0, y, 0], [x0 + yon * w, y, 0])); out.push(TX([x0 + yon * th * 0.35, y + th * 0.3, 0], th, s, 0, yon > 0 ? 'L' : 'R')); });
    };
    let K = SN.get(e); if (K === undefined) { K = sinirlar(e); SN.set(e, K); }
    if (K && K.mod === 'doseme' && K.ys.length) {
      const x = K.x, ytop = K.ys[0], ybot = K.ys[K.ys.length - 1];
      const yb = Math.max(p[1], ytop + th * 2.5);           // yazı yığınının tabanı (kullanıcının gösterdiği yükseklik)
      out.push(L([x, ybot - th * 0.8, 0], [x, yb + (n - 1) * lsp, 0]));
      K.ys.forEach(y => out.push(nokta([x, y, 0], r)));
      yigin(x, yb, sd);
      return out;
    }
    if (K && K.mod === 'duvar' && K.xs.length) {
      const y = K.y, xmin = K.xs[0], xmax = K.xs[K.xs.length - 1];
      const xr = sd > 0 ? xmax + th * 3 : xmin - th * 3; // dönüş noktası: elemanın hemen yanında (başka elemanı kesmesin)
      out.push(L([sd > 0 ? xmin - th * 0.8 : xmax + th * 0.8, y, 0], [xr, y, 0]));
      K.xs.forEach(x => out.push(nokta([x, y, 0], r)));
      const yb = Math.max(p[1] - (n - 1) * lsp, y + th * 1.5);
      out.push(L([xr, y, 0], [xr, yb + (n - 1) * lsp, 0]));
      yigin(xr, yb, sd);
      return out;
    }
    // sınır bilgisi yok: noktadan dik çıkış
    out.push(nokta(a, r)); const yb = Math.max(p[1], a[1] + th * 2.5);
    out.push(L(a, [a[0], yb + (n - 1) * lsp, 0])); yigin(a[0], yb, sd);
    return out;
  };
  T.acilim.prims = e => (stil() === 'ESKI' ? p0(e) : dik(e));
  // model değişince sınırlar yeniden okunsun
  C.on && C.on('change', () => { if (!C.doc) return; SN = new WeakMap(); for (const e of C.doc.ents) if (e.type === 'acilim') delete e._c; });

  C.addCommand(['ACILIMSTIL', 'ACILIMSTILI'], 'Malzeme açılımı çizim stili: DIK (katmanlara dik çizgi, sınırlarda nokta, altı çizili satırlar) ya da ESKI (oklu kırık çizgi)', async (I) => {
    const s = await I.kw('Açılım stili', [['DIK', 'Dik çizgi (katmanları keser)'], ['ESKI', 'Oklu kırık çizgi']], stil()); if (!s) return;
    C.doc.set.acilimStil = s; for (const e of C.doc.ents) if (e.type === 'acilim') delete e._c; C.changed(); C.log('Malzeme açılımı stili: ' + (s === 'DIK' ? 'dik çizgi.' : 'oklu kırık çizgi.'));
  }, { noUndo: true });
})(window.C);

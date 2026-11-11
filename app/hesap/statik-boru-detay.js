/* ArıtmaCAD — Statik: perde boru boşluğu (boru geçişi) donatı detayı, ayrı ölçekte (varsayılan 1/20)
   Perde görünüşündeki boşluk çevresi (kesik çubuklar + gönyeler, ilave ve köşe çubukları, etiketler)
   pencereyle kırpılıp büyütülerek aynı paftaya ayrı blok olarak eklenir; görünüşte detay işareti konur. */
(function () {
  'use strict';
  const P = window.STATIK; if (!P) return;
  const prev = P.paftaEk;
  const r2 = v => Math.round(v * 100) / 100, cmi = v => String(Math.round(v * 100));

  // Liang–Barsky: [a,b] parçasını W=[x0,y0,x1,y1] ile kırp
  const kirp = (a, b, W) => { const dx = b[0] - a[0], dy = b[1] - a[1]; let t0 = 0, t1 = 1;
    for (const [p, q] of [[-dx, a[0] - W[0]], [dx, W[2] - a[0]], [-dy, a[1] - W[1]], [dy, W[3] - a[1]]]) {
      if (Math.abs(p) < 1e-12) { if (q < 0) return null; } else { const r = q / p; if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; } } }
    return t1 - t0 < 1e-9 ? null : [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]]; };
  const icinde = (p, W) => p && p[0] >= W[0] && p[0] <= W[2] && p[1] >= W[1] && p[1] <= W[3];

  P.paftaEk = function (o) {
    const ret = prev ? prev.apply(this, arguments) : undefined;   // önce boşluk kesimleri (KAYIT) ve diğer ekler
    try { boruDetay(o); } catch (e) { console.error('boru detayı', e); }
    return ret;
  };

  function boruDetay({ R, K, B, DT, yeniCizim }) {
    const S = R.S, tas = S.tas || {}; if (tas.boruDetay === false) return;
    const olc = Math.round(K * 1000), dOlc = +(tas.boruDetayOlcek || 20); if (!(dOlc < olc)) return;
    const f = olc / dOlc, mm = v => v * K, z0 = S.geo.kAlt;
    (DT.perdeler || []).forEach((pd, i) => {
      const H = pd.delik || []; if (!H.length) return;
      const blok = B.find(b => b.pafta === 2 + i && b.spec && b.spec.some(e => e.k === 'T' && / BOŞLUK$/.test(e.s || ''))); if (!blok) return;
      H.forEach((h, hi) => {
        const ilv = pd.poz.filter(p => p.ilave && !p.kesik && (p.delik === hi || (p.delikler || []).includes(hi)));
        const yar = Math.max(0.6, ...ilv.map(p => (p.boy || 0) / 2 + 0.15));
        const xa = h.s - h.w / 2 - yar, xb = h.s + h.w / 2 + yar, ya = Math.max(0, h.z - z0 - h.h / 2 - yar), yb = h.z - z0 + h.h / 2 + yar;
        const W = [xa, ya, xb, yb], X = p => [(p[0] - xa) * f, (p[1] - ya) * f], D = yeniCizim(K), out = D.out;
        // 1) görünüşteki sürekli çubuklar / kalıp çizgileri (boşluk çizimine ait olmayanlar): kırpılıp büyütülür
        const pozC = blok.spec.filter(e => e.k === 'C' && e.ly === 'STA_POZ' && !e.koru);
        for (const e of blok.spec) {
          if (e.koru) continue;
          if (e.k === 'L' && e.ly !== 'STA_YAZI') { const s = kirp(e.a, e.b, W); if (s) out.push(Object.assign({}, e, { a: X(s[0]), b: X(s[1]) })); }
          else if (e.k === 'P' && e.pts && e.ly !== 'STA_YAZI') { const pts = e.cl ? e.pts.concat([e.pts[0]]) : e.pts; let cur = null; const bitir = () => { if (cur && cur.length > 1) out.push(Object.assign({}, e, { cl: false, pts: cur.map(X) })); cur = null; };
            for (let j = 0; j < pts.length - 1; j++) { const s = kirp(pts[j], pts[j + 1], W); if (!s) { bitir(); continue; } if (cur && Math.hypot(cur[cur.length - 1][0] - s[0][0], cur[cur.length - 1][1] - s[0][1]) < 1e-9) cur.push(s[1]); else { bitir(); cur = [s[0], s[1]]; } } bitir(); }
          else if (e.k === 'C' && e.ly === 'STA_POZ' && icinde(e.c, W)) out.push(Object.assign({}, e, { c: X(e.c) }));
          else if (e.k === 'T' && e.ly === 'STA_POZ' && icinde(e.p, W)) { const pc = pozC.find(c => Math.hypot(c.c[0] - e.p[0], c.c[1] - e.p[1]) < mm(1.5)); if (pc) out.push(Object.assign({}, e, { p: [X(pc.c)[0] + (e.p[0] - pc.c[0]), X(pc.c)[1] + (e.p[1] - pc.c[1])] })); }
        }
        // 2) boşluk çizimi (kesik çubuklar + gönyeler, ilave/köşe çubukları, etiketler) detay ölçeğinde yeniden: yazı/işaret boyları kağıtta doğru kalır
        if (P.perdeDelikCiz) { const D2 = yeniCizim(K / f); P.perdeDelikCiz(D2, R, Object.assign({}, pd, { delik: H }));
          for (const e of D2.out) {
            if (e.k === 'L') { const s = kirp(e.a, e.b, W); if (s) out.push(Object.assign({}, e, { a: X(s[0]), b: X(s[1]) })); }
            else if (e.k === 'P' && e.pts) { const pts = e.cl ? e.pts.concat([e.pts[0]]) : e.pts; let cur = null; const bitir = () => { if (cur && cur.length > 1) out.push(Object.assign({}, e, { cl: false, pts: cur.map(X) })); cur = null; };
              for (let j = 0; j < pts.length - 1; j++) { const s = kirp(pts[j], pts[j + 1], W); if (!s) { bitir(); continue; } if (cur && Math.hypot(cur[cur.length - 1][0] - s[0][0], cur[cur.length - 1][1] - s[0][1]) < 1e-9) cur.push(s[1]); else { bitir(); cur = [s[0], s[1]]; } } bitir(); }
            else if (e.k === 'C') { if (icinde(e.c, W)) out.push(Object.assign({}, e, { c: X(e.c), r: e.r * f })); }
            else if (e.k === 'T') { if (icinde(e.p, W) && !/BOŞLUK$|^eksen |^kesilen /.test(e.s)) out.push(Object.assign({}, e, { p: X(e.p), h: e.h * f })); } // boşluk adı/notu başlıkta
            else if (e.k === 'D') { if (icinde(e.a, W) && icinde(e.b, W)) out.push(Object.assign({}, e, { a: X(e.a), b: X(e.b), p: X(e.p) })); }
          } }
        // etiketi pencere dışında kalan kesik çubuklar: pencere içinde poz + "nØF/s" / "L=…"
        const kGor = new Map(); pd.poz.filter(p => p.kesik && (p.delikler || [p.delik]).includes(hi)).forEach(p => { const kk = [p.yonP, r2(p.a), r2(p.b), r2(p.vRep)].join('|'); if (kGor.has(kk)) { kGor.get(kk).push(p); return; } kGor.set(kk, [p]); });
        [...kGor.values()].forEach(gp => { const p = gp[0], yat = p.yonP === 'y', v = yat ? p.vRep - z0 : p.vRep, m = (p.a + p.b) / 2, lp = yat ? [m, v] : [v, m - z0]; if (icinde(lp, W)) return;
          const u0 = Math.max(p.a, yat ? xa : ya + z0), u1 = Math.min(p.b, yat ? xb : yb + z0); if (u1 <= u0) return; const um = u0 + Math.min(0.08, (u1 - u0) * 0.1), q = X(yat ? [um, v] : [v, um - z0]);
          const qp = yat ? [q[0], q[1] + mm(3.6)] : [q[0] - mm(3.6), q[1]], ad = gp.length > 1 ? `${gp.length}*${p.adet}Ø${p.F}/${cmi(p.s)}` : `${p.adet}Ø${p.F}/${cmi(p.s)}`;
          gp.forEach((x, k) => D.POZ(yat ? [qp[0] + k * mm(5.2), qp[1]] : [qp[0], qp[1] + k * mm(5.2)], x.no)); const tp = yat ? [qp[0] + gp.length * mm(5.2) - mm(1.8), qp[1] - mm(1)] : [qp[0] + mm(1), qp[1] + gp.length * mm(5.2) - mm(1.8)]; D.TX(tp, `${ad} L=${cmi(p.boy)}`, 2.0, 'L', 'STA_POZ', yat ? 0 : 90); });
        // çerçeve + boşluk ölçüleri
        const Wx = (xb - xa) * f, Wy = (yb - ya) * f; D.PL([[0, 0], [Wx, 0], [Wx, Wy], [0, Wy]], true, 'STA_GORUNUS');
        const hx0 = (h.s - h.w / 2 - xa) * f, hx1 = (h.s + h.w / 2 - xa) * f, hy0 = (h.z - z0 - h.h / 2 - ya) * f, hy1 = (h.z - z0 + h.h / 2 - ya) * f;
        D.DM([hx0, Wy], [hx1, Wy], 'h', 6, h.daire ? 'Ø' + cmi(h.w) : cmi(h.w));
        D.DM([Wx, hy0], [Wx, hy1], 'v', 6, cmi(h.h));
        if (ya <= 1e-6) D.DM([Wx, 0], [Wx, hy0], 'v', 6, cmi(h.z - z0 - h.h / 2 - S.geo.hr));
        const ad = `${pd.no} ${h.ad || 'H' + (hi + 1)}`;
        D.BASLIK([Wx / 2, -mm(10)], `${ad} BORU GEÇİŞİ DONATI DETAYI`, `Ö:1/${dOlc}`);
        D.TX([0, -mm(19)], `Boşluk eksen kotu ${(h.z >= 0 ? '+' : '') + h.z.toFixed(2)} · kesilen çubuklar boşluk kenarında ${cmi(Math.max(0.05, r2(pd.w.t - 2 * S.mal.cP)))} cm gönyeli (perde kalınlığı − 2·paspayı)`, 2.0, 'L');
        B.push({ pafta: blok.pafta, spec: out, kutu: D.kutu() });
        // görünüşte detay işareti
        const r = Math.max(h.w, h.h) / 2 + mm(6), c = [h.s, h.z - z0];
        blok.spec.push({ k: 'C', c, r, ly: 'STA_YAZI' });
        blok.spec.push({ k: 'T', p: [c[0] - r * 0.7, c[1] - r * 0.7 - mm(4)], s: `DETAY ${h.ad || 'H' + (hi + 1)} (1/${dOlc})`, h: mm(2.2), al: 'R', ly: 'STA_YAZI', rot: 0 });
        if (blok.kutu) { /* kutu blok sınırıdır; işaret görünüş içinde kaldığı için değişmez */ }
      });
    });
  }
})();

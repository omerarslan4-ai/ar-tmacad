/* ArıtmaCAD Statik — DÖŞEME BOŞLUKLARI (ayrı modül)
   Modelden okunan döşeme boşlukları (S.geo.doseme[i].delik = [{ pts:[[x,y]…], tam }]) için:
   • Kalıp planı ve döşeme donatı planında boşluk çizimi (çarpılı), ölçüsü ve yazısı
   • Boşluk çevresi ilave donatısı (TS 500 Md. 11.4 / yaygın uygulama): boşlukta kesilen çubuklar kadar donatı,
     her iki yüzde, boşluğun iki yanına yarı yarıya; boy = boşluk + 2 × bindirme. Köşelerde 45° çatlak donatısı.
     İlave pozlar döşeme metrajına eklenir.
   • 3B donatıda boşluktan geçen çubuklar paspayı kadar geride kesilir; ilave ve köşe çubukları eklenir. */
(function () {
  'use strict';
  const P = window.STATIK; if (!P) return;
  const r2 = v => Math.round(v * 100) / 100, AG = F => 0.006165 * F * F;
  const kutu = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
  const delikler = (d, ham) => (d.delik || []).filter(b => b && b.pts && b.pts.length >= 3 && (ham || !b.bolen)).map(b => { const k = kutu(b.pts); return Object.assign({}, b, { k: ham && b.bolen ? k : [Math.max(k[0], d.x0), Math.max(k[1], d.y0), Math.min(k[2], d.x1), Math.min(k[3], d.y1)] }); }).filter(b => b.k[2] - b.k[0] > 0.01 && b.k[3] - b.k[1] > 0.01);
  /* [u0,u1] aralığından boşluk aralıklarını çıkar → [[a, b, kancaA, kancaB]] (kancalar: uçta hA/hB, boşlukta g) */
  const parcalaU = (u0, u1, gaps, hA, hB, g) => { const out = []; let cur = u0, hk = hA; for (const [g0, g1] of gaps.slice().sort((x, y) => x[0] - y[0])) { if (g1 <= cur) continue; if (g0 > cur + 0.15) out.push([cur, Math.min(g0, u1), hk, g]); cur = Math.max(cur, g1); hk = g; if (cur >= u1) break; } if (u1 > cur + 0.15) out.push([cur, u1, hk, hB]); return out; };
  const daireMi = pts => { if (pts.length < 12) return false; const k = kutu(pts), cx = (k[0] + k[2]) / 2, cy = (k[1] + k[3]) / 2, r = pts.map(p => Math.hypot(p[0] - cx, p[1] - cy)); return Math.max(...r) - Math.min(...r) < 0.01 * Math.max(...r) + 0.003; };
  const KOSE_F = 12, KOSE_MIN = 0.40; // köşe 45° çubuğu: boşluğun büyük kenarı 40 cm'den büyükse
  const KOSELER = b => { const [x0, y0, x1, y1] = b.k; return [[x0, y0, -1, -1], [x1, y0, 1, -1], [x1, y1, 1, 1], [x0, y1, -1, 1]]; };
  // köşe çubuğu: köşeden o kadar dışarıda, köşegene dik; uçlar döşeme içinde (paspayı) kalacak kadar kısaltılır
  const koseCubuk = (d, cD, x, y, sx, sy, o, L2) => { const qx = x + sx * o, qy = y + sy * o, ux = sy / Math.SQRT2, uy = -sx / Math.SQRT2, rx0 = d.x0 + cD, rx1 = d.x1 - cD, ry0 = d.y0 + cD, ry1 = d.y1 - cD;
    if (qx <= rx0 || qx >= rx1 || qy <= ry0 || qy >= ry1) return null; const h = Math.min(L2, Math.min(qx - rx0, rx1 - qx) / Math.abs(ux), Math.min(qy - ry0, ry1 - qy) / Math.abs(uy)); return h < 0.15 ? null : [[qx - h * ux, qy - h * uy], [qx + h * ux, qy + h * uy]]; };

  /* ---- detay: ilave pozlar ---- */
  const d0 = P.detayDsi;
  if (d0) P.detayDsi = function (R) {
    const DT = d0.apply(this, arguments), c = R.S.mal;
    const adim = (a, b, st) => { if (b <= a) return [a]; const n = Math.max(1, Math.round((b - a) / st)), r = []; for (let i = 0; i <= n; i++) r.push(a + (b - a) * i / n); return r; };
    for (const dd of DT.doseme) {
      const B = delikler(dd.d).filter(b => b.tam); if (!B.length) continue;
      const ana = (yuz, yon) => dd.poz.find(p => p.yon === yon && (yuz === 'alt' ? p.yuz === 'alt' : (p.tek || p.yuz === 'üst')));
      const ek = [], d = dd.d, cD = c.cD, gD = Math.max(0.05, Math.round((d.t - 2 * cD) * 100) / 100);
      /* boşlukta kesilen ana çubuklar: kesilen adet ana pozdan düşülür, boşluğun iki yanındaki parçalar boşluk kenarında gönyeli ayrı pozlar */
      const anaPoz = dd.poz.filter(p => !p.ilave && (p.yuz === 'alt' || p.tek) && (p.yon === 'x' || p.yon === 'y'));
      for (const p of anaPoz) {
        const xd = p.yon === 'x', v0 = xd ? d.y0 + cD : d.x0 + cD, v1 = xd ? d.y1 - cD : d.x1 - cD, u0 = xd ? d.x0 + cD : d.y0 + cD, u1 = xd ? d.x1 - cD : d.y1 - cD;
        if (Math.abs((p.tek ? p.boy - (p.ga || 0) - (p.gb || 0) : p.boy - (p.segs[0].a ? p.segs[0].L : 0) - (p.segs[p.segs.length - 1].a ? p.segs[p.segs.length - 1].L : 0)) - (u1 - u0)) > 0.05) continue; // eklenmiş (çok parçalı) çubuk: dokunma
        const ha = p.tek ? (p.ga || 0) : (p.segs[0].a ? p.segs[0].L : 0), hb = p.tek ? (p.gb || 0) : (p.segs[p.segs.length - 1].a ? p.segs[p.segs.length - 1].L : 0), aci = p.tek ? -90 : 90;
        const vs = adim(v0, v1, p.s), grp = new Map(); let kesN = 0;
        for (const v of vs) {
          const gaps = []; B.forEach((b, bi) => { const k0 = (xd ? b.k[1] : b.k[0]) - cD, k1 = (xd ? b.k[3] : b.k[2]) + cD; if (v >= k0 && v <= k1) gaps.push([(xd ? b.k[0] : b.k[1]) - cD, (xd ? b.k[2] : b.k[3]) + cD, bi]); });
          if (!gaps.length) continue; kesN++;
          for (const [a, b, hA, hB] of parcalaU(u0, u1, gaps, ha, hb, gD)) { const key = [r2(a), r2(b), hA, hB].join('|'); if (!grp.has(key)) grp.set(key, { a, b, hA, hB, vs: [], dl: new Set() }); const q = grp.get(key); q.vs.push(v); gaps.forEach(gg => q.dl.add(gg[2])); }
        }
        if (!kesN) continue; p.adet -= kesN;
        for (const q of grp.values()) { const L = r2(q.b - q.a), boy = r2(L + q.hA + q.hB); ek.push({ F: p.F, s: p.s, adet: q.vs.length, boy, segs: [...(q.hA ? [{ L: q.hA, a: aci }] : []), { L, a: 0 }, ...(q.hB ? [{ L: q.hB, a: aci }] : [])], ad: p.ad + ' (boşlukta kesik)', yon: p.yon, yuz: 'kesik', yuzA: p.tek ? 'üst' : 'alt', kesik: true, ilave: true, delik: [...q.dl][0], delikler: [...q.dl], a: q.a, b: q.b, hA: q.hA, hB: q.hB, vRep: q.vs[Math.floor(q.vs.length / 2)] }); }
      }
      B.forEach((b, bi) => {
        const [hx0, hy0, hx1, hy1] = b.k;
        for (const yuz of ['alt', 'üst']) for (const yon of ['x', 'y']) {
          const a = ana(yuz, yon); if (!a) continue;
          const kes = Math.ceil(((yon === 'x' ? hy1 - hy0 : hx1 - hx0) + 2 * c.cD) / a.s), yan = Math.max(2, Math.ceil(kes / 2)), Lh = yon === 'x' ? hx1 - hx0 : hy1 - hy0;
          const lim = yon === 'x' ? [dd.d.x0 + c.cD, dd.d.x1 - c.cD] : [dd.d.y0 + c.cD, dd.d.y1 - c.cD], u0 = Math.max(lim[0], (yon === 'x' ? hx0 : hy0) - P.bindirme(a.F)), u1 = Math.min(lim[1], (yon === 'x' ? hx1 : hy1) + P.bindirme(a.F));
          const yanlar = yon === 'x' ? [hy0 > dd.d.y0 + 2 * c.cD + 0.05, hy1 < dd.d.y1 - 2 * c.cD - 0.05] : [hx0 > dd.d.x0 + 2 * c.cD + 0.05, hx1 < dd.d.x1 - 2 * c.cD - 0.05], ny = yanlar.filter(Boolean).length; if (!ny) continue;
          ek.push({ F: a.F, s: 0.1, adet: ny * yan, boy: r2(u1 - u0), segs: [{ L: r2(u1 - u0), a: 0 }], ad: `Boşluk ilave ${yon.toUpperCase()}`, yon, yuz: 'ilave', yuzA: yuz, ilave: true, delik: bi, yan, yanlar, u0, u1, kes, Lh });
        }
        if (Math.max(hx1 - hx0, hy1 - hy0) <= KOSE_MIN) return;
        const L0 = Math.min(1.6, 2 * P.bindirme(KOSE_F)), cb = KOSELER(b).map(([x, y, sx, sy]) => koseCubuk(dd.d, c.cD, x, y, sx, sy, c.cD + 0.07, L0 / 2)).filter(Boolean); if (!cb.length) return;
        const Lk = r2(Math.min(...cb.map(q => Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1])))); b.kose = Lk;
        ek.push({ F: KOSE_F, s: 1, adet: cb.length * 2, boy: Lk, segs: [{ L: Lk, a: 0 }], ad: 'Boşluk köşe 45°', yon: 'k', yuz: 'ilave', yuzA: 'alt+üst', ilave: true, kose: true, delik: bi });
      });
      // aynı çap / boy / yön olanları birleştir, numarala
      for (let i = dd.poz.length - 1; i >= 0; i--) if (dd.poz[i].adet <= 0) dd.poz.splice(i, 1);
      for (const p of ek) { const q = dd.poz.find(o => o.ilave && o.F === p.F && o.boy === p.boy && o.ad === p.ad && o.yuzA === p.yuzA); if (q) { q.adet += p.adet; (q.delikler = q.delikler || [q.delik]).push(p.delik); } else dd.poz.push(p); }
      dd.poz.forEach((p, k) => { p.no = k + 1; p.top = r2(p.boy * p.adet); p.kg = p.top * AG(p.F); });
      dd.delik = B;
    }
    // ---- perde boşlukları (boru geçişleri) ----
    for (const pd of DT.perdeler) {
      const H = P.perdeDelikleri(R, pd.w); if (!H.length) continue; pd.delik = H;
      const dus = pd.poz.find(p => p.ad === 'Düşey'), yat = pd.poz.find(p => p.ad === 'Yatay'), ek = [];
      /* boşlukta kesilen perde çubukları: ana pozdan düşülür, parçalar boşluk kenarında perde kalınlığınca gönyeli ayrı pozlar */
      { const g = R.S.geo, cP = c.cP, tE = g.tw, w = pd.w, zR = g.kAlt + g.hr, zU = g.kUst, gP = Math.max(0.05, r2(w.t - 2 * cP)), dis = w.tip === 'dis', Fv = dus ? dus.F / 1000 : 0.016;
        const hk = (p, ilk) => { const sg = p.segs; if (sg.length < 2) return 0; const q = ilk ? sg[0] : sg[sg.length - 1], dik = p.ad === 'Düşey' ? 0 : 90; return q.a === dik ? q.L : 0; };
        // yatay: aynı yüzün tüm parçaları (12 m'den uzun çubuklar bindirmeli parçalar) bir çubuk hattı sayılır
        const yatGrup = new Map(); pd.poz.filter(q => !q.ilave && q.ad === 'Yatay').forEach(q => { const kk = q.yuzA + '|' + q.F + '|' + q.s; if (!yatGrup.has(kk)) yatGrup.set(kk, []); yatGrup.get(kk).push(q); });
        for (const ps of yatGrup.values()) { const p0 = ps[0], k = p0.kat || 1, uc = tE / 2 - cP - Fv - p0.F / 2000, ya = -uc, yb = w.L + uc, zs = adim(zR + 0.05, zU - cP - 0.03, p0.s), nH = zs.length;
          if (ps.length < 2 && Math.abs(p0.boy - hk(p0, true) - hk(p0, false) - (yb - ya)) <= 0.1) continue; // tek parça: aşağıda
          const kanca = ps.map(q => Math.max(hk(q, true), hk(q, false))).find(v => v > 0) || 0, grp = new Map(); let kesN = 0;
          for (const z of zs) { const gaps = []; H.forEach((h, hi) => { if (z >= h.z - h.h / 2 - cP && z <= h.z + h.h / 2 + cP) gaps.push([h.s - h.w / 2 - cP, h.s + h.w / 2 + cP, hi]); }); if (!gaps.length) continue; kesN++;
            for (const [a, b, ka, kb] of parcalaU(ya, yb, gaps, kanca, kanca, gP)) { const lap = P.bindirme(p0.F), m = Math.max(1, Math.ceil((b - a - 0.3) / (12 - lap))), Lp = (b - a + (m - 1) * lap) / m;
              for (let j = 0; j < m; j++) { const a2 = a + j * (Lp - lap), b2 = a2 + Lp, k1 = j === 0 ? ka : 0, k2 = j === m - 1 ? kb : 0, key = [r2(a2), r2(b2), k1, k2].join('|'); if (!grp.has(key)) grp.set(key, { a: a2, b: b2, ka: k1, kb: k2, vs: [], dl: new Set() }); const q = grp.get(key); q.vs.push(z); gaps.forEach(gg => q.dl.add(gg[2])); } } }
          if (!kesN) continue;
          ps.forEach(q => { const pn = Math.max(1, Math.round(q.adet / (k * nH))); q.adet = Math.max(0, q.adet - kesN * k * pn); });
          for (const q of grp.values()) { const L = r2(q.b - q.a); ek.push({ F: p0.F, s: p0.s, adet: q.vs.length * k, boy: r2(L + q.ka + q.kb), segs: [...(q.ka ? [{ L: q.ka, a: 90 }] : []), { L, a: 0 }, ...(q.kb ? [{ L: q.kb, a: 90 }] : [])], ad: 'Yatay (boşlukta kesik)', yuz: 'kesik', yuzA: p0.yuzA, kesik: true, ilave: true, yonP: 'y', delik: [...q.dl][0], delikler: [...q.dl], a: q.a, b: q.b, ka: q.ka, kb: q.kb, vRep: q.vs.reduce((mm2, v) => (Math.abs(v - H[[...q.dl][0]].z) < Math.abs(mm2 - H[[...q.dl][0]].z) ? v : mm2), q.vs[0]) }); }
        }
        for (const p of pd.poz.filter(q => !q.ilave && (q.ad === 'Yatay' || q.ad === 'Düşey'))) {
          const k = p.kat || 1, grp = new Map(); let kesN = 0;
          if (p.ad === 'Yatay') {
            const uc = tE / 2 - cP - Fv - p.F / 2000, ya = -uc, yb = w.L + uc, hA = hk(p, true), hB = hk(p, false);
            if (Math.abs(p.boy - hA - hB - (yb - ya)) > 0.1) continue; // eklenmiş yatay: yukarıda hat olarak işlendi
            for (const z of adim(zR + 0.05, zU - cP - 0.03, p.s)) { const gaps = []; H.forEach((h, hi) => { if (z >= h.z - h.h / 2 - cP && z <= h.z + h.h / 2 + cP) gaps.push([h.s - h.w / 2 - cP, h.s + h.w / 2 + cP, hi]); }); if (!gaps.length) continue; kesN++;
              for (const [a, b, ka, kb] of parcalaU(ya, yb, gaps, hA, hB, gP)) { const key = [r2(a), r2(b), ka, kb].join('|'); if (!grp.has(key)) grp.set(key, { a, b, ka, kb, vs: [], dl: new Set() }); const q = grp.get(key); q.vs.push(z); gaps.forEach(gg => q.dl.add(gg[2])); } }
          } else {
            const z0 = g.kAlt + p.za, z1 = g.kAlt + p.zu, hA = hk(p, true), hB = hk(p, false), kose = dis && Math.abs(w.e[0]) > 0.5, va = kose ? -(tE / 2 - cP - p.F / 2000) : tE / 2 + 0.05, vb = kose ? w.L + (tE / 2 - cP - p.F / 2000) : w.L - tE / 2 - 0.05;
            for (const sv of adim(va, vb, p.s)) { const gaps = []; H.forEach((h, hi) => { const g0 = h.z - h.h / 2 - cP, g1 = h.z + h.h / 2 + cP; if (sv >= h.s - h.w / 2 - cP && sv <= h.s + h.w / 2 + cP && g1 > z0 && g0 < z1) gaps.push([g0, g1, hi]); }); if (!gaps.length) continue; kesN++;
              for (const [a, b, ka, kb] of parcalaU(z0, z1, gaps, hA, hB, gP)) { const key = [r2(a), r2(b), ka, kb].join('|'); if (!grp.has(key)) grp.set(key, { a, b, ka, kb, vs: [], dl: new Set() }); const q = grp.get(key); q.vs.push(sv); gaps.forEach(gg => q.dl.add(gg[2])); } }
          }
          if (!kesN) continue; p.adet = Math.max(0, p.adet - kesN * k);
          for (const q of grp.values()) { const L = r2(q.b - q.a), yat2 = p.ad === 'Yatay', aci = yat2 ? 90 : 0;
            ek.push({ F: p.F, s: p.s, adet: q.vs.length * k, boy: r2(L + q.ka + q.kb), segs: [...(q.ka ? [{ L: q.ka, a: aci }] : []), { L, a: yat2 ? 0 : 90 }, ...(q.kb ? [{ L: q.kb, a: aci }] : [])], ad: p.ad + ' (boşlukta kesik)', yuz: 'kesik', yuzA: p.yuzA, parca: p.parca, kesik: true, ilave: true, yonP: yat2 ? 'y' : 'd', delik: [...q.dl][0], delikler: [...q.dl], a: q.a, b: q.b, ka: q.ka, kb: q.kb, vRep: q.vs.reduce((m, v) => (Math.abs(v - (yat2 ? H[[...q.dl][0]].z : H[[...q.dl][0]].s)) < Math.abs(m - (yat2 ? H[[...q.dl][0]].z : H[[...q.dl][0]].s)) ? v : m), q.vs[0]) }); }
        }
      }
      H.forEach((h, hi) => {
        if (dus) { const kes = Math.ceil((h.w + 2 * c.cP) / dus.s), yan = Math.max(2, Math.ceil(kes / 2)), L = r2(h.h + 2 * P.bindirme(dus.F)); ek.push({ F: dus.F, s: 0.1, adet: 2 * 2 * yan, boy: L, segs: [{ L, a: 90 }], ad: 'Boşluk ilave düşey', yuz: 'ilave', yuzA: 'iki yüz', ilave: true, delik: hi, yan, yonP: 'd' }); }
        if (yat) { const kes = Math.ceil((h.h + 2 * c.cP) / yat.s), yan = Math.max(2, Math.ceil(kes / 2)), L = r2(h.w + 2 * P.bindirme(yat.F)); ek.push({ F: yat.F, s: 0.1, adet: 2 * 2 * yan, boy: L, segs: [{ L, a: 0 }], ad: 'Boşluk ilave yatay', yuz: 'ilave', yuzA: 'iki yüz', ilave: true, delik: hi, yan, yonP: 'y' }); }
        const Lk = r2(Math.min(1.6, 2 * P.bindirme(KOSE_F))); if (Math.max(h.w, h.h) > KOSE_MIN) ek.push({ F: KOSE_F, s: 1, adet: 4 * 2, boy: Lk, segs: [{ L: Lk, a: 45 }], ad: 'Boşluk köşe 45°', yuz: 'ilave', yuzA: 'iki yüz', ilave: true, kose: true, delik: hi });
      });
      for (let i = pd.poz.length - 1; i >= 0; i--) if (pd.poz[i].adet <= 0) pd.poz.splice(i, 1);
      for (const p of ek) { const q = pd.poz.find(o => o.ilave && o.F === p.F && o.boy === p.boy && o.ad === p.ad && o.yuzA === p.yuzA && o.parca === p.parca && !o.kesik === !p.kesik); if (q && !p.kesik) { q.adet += p.adet; (q.delikler = q.delikler || [q.delik]).push(p.delik); } else if (q && p.kesik) { q.adet += p.adet; } else pd.poz.push(p); }
      pd.poz.forEach((p, k) => { p.no = k + 1; p.top = r2(p.boy * p.adet); p.kg = p.top * AG(p.F); });
    }
    return DT;
  };

  /* perdeye ait boşluklar: perde boyunca s (aks başından), z (mutlak), genişlik w, yükseklik h */
  P.perdeDelikleri = (R, w) => { const g = R.S.geo, tE = g.tw, xA = Math.abs(w.e[0]) > 0.5;
    return (g.perdeDelik || []).filter(h => (xA ? h.yon === 'y' : h.yon === 'x')).map(h => { const dx = h.x - w.p0[0], dy = h.y - w.p0[1]; return Object.assign({}, h, { s: dx * w.e[0] + dy * w.e[1], o: dx * w.n[0] + dy * w.n[1] }); })
      .filter(h => Math.abs(h.o) <= w.t / 2 + 0.15 && h.s >= -tE / 2 - 0.05 && h.s <= w.L + tE / 2 + 0.05); };
  const uyan = (p, hi) => p.delik === hi || (p.delikler || []).includes(hi);
  /* perde sınırı (paspayı içi): s ∈ [s0,s1] (aks başından), z ∈ [z0,z1] (mutlak) — ilave / köşe çubukları perde dışına taşmasın */
  const sinir = (R, w) => { const g = R.S.geo, cP = R.S.mal.cP, tE = g.tw, tA = w.tA != null ? w.tA : tE, tB = w.tB != null ? w.tB : tE, zb = w.zB != null ? w.zB : g.kAlt + g.hr, zu = w.zU != null ? w.zU : g.kUst;
    return { s0: -tA / 2 + cP, s1: w.L + tB / 2 - cP, z0: zb + cP, z1: zu - cP }; };
  const kirp2 = (a, b, B) => { const dx = b[0] - a[0], dy = b[1] - a[1]; let t0 = 0, t1 = 1;
    for (const [p, q] of [[-dx, a[0] - B[0]], [dx, B[2] - a[0]], [-dy, a[1] - B[1]], [dy, B[3] - a[1]]]) { if (Math.abs(p) < 1e-12) { if (q < 0) return null; } else { const r = q / p; if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; } } }
    const A = [a[0] + dx * t0, a[1] + dy * t0], Bq = [a[0] + dx * t1, a[1] + dy * t1]; return Math.hypot(Bq[0] - A[0], Bq[1] - A[1]) < 0.15 ? null : [A, Bq]; };
  P._perdeSinir = sinir; P._kirp2 = kirp2;

  /* referans çizim etiketi: "4*2Ø16" / "L=240" iki satır, altı çizgili, yanında poz dairesi */
  const etiket2 = (D, p0, ust, alt, no, yon) => { const { mm, TX, L } = D, g = mm(22), sg = yon === 'R' ? -1 : 1, x1 = p0[0] + sg * g;
    L([p0[0], p0[1]], [x1, p0[1]], 'STA_POZ'); TX([Math.min(p0[0], x1) + mm(0.8), p0[1] + mm(4.2)], ust, 2.2, 'L', 'STA_POZ'); TX([Math.min(p0[0], x1) + mm(0.8), p0[1] + mm(0.8)], alt, 2.2, 'L', 'STA_POZ'); D.POZ([Math.min(p0[0], x1) + g / 2, p0[1] - mm(4)], no); };
  P._etiket2 = etiket2;

  /* perde görünüşünde boşluk (görünüş koordinatı: x = s, y = z − kAlt) */
  P.perdeDelikCiz = (D, R, pd) => {
    const H = pd.delik || P.perdeDelikleri(R, pd.w); if (!H.length) return;
    const { mm, TX, L, PL, CI } = D, g = R.S.geo, c = R.S.mal, cP = c.cP, z0 = g.kAlt, bas = D.out.length, cmi = v => String(Math.round(v * 100)), rects = [];
    const SN = sinir(R, pd.w), SB = [SN.s0, SN.z0 - z0, SN.s1, SN.z1 - z0]; // görünüş koordinatında perde sınırı
    H.forEach((h, hi) => {
      const x0 = h.s - h.w / 2, x1 = h.s + h.w / 2, y0 = h.z - h.h / 2 - z0, y1 = h.z + h.h / 2 - z0, yc = h.z - z0;
      if (h.daire) CI([h.s, yc], h.w / 2, 'STA_KALIP'); else PL([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], false, 'STA_KALIP');
      /* örnek paftadaki gösterim: boru geçişi → iç içe iki daire + çizgi, B.E.K (boru eksen kotu); dikdörtgen boşluk → yırtık işareti, D.T.K (delik taban kotu) */
      if (h.daire) { const r = h.w / 2; CI([h.s, yc], r * 0.78, 'STA_SU'); CI([h.s, yc], r * 0.55, 'STA_SU'); L([h.s - r * 0.55, yc], [h.s + r * 0.55, yc], 'STA_SU'); }
      else { const i = Math.min(h.w, h.h) * 0.08, ax = x0 + i, bx = x1 - i, ay = y1 - i, by = y0 + i; PL([[ax, ay], [bx, ay], [ax + (bx - ax) * 0.18, ay - (ay - by) * 0.18], [ax, by], [ax, ay]], false, 'STA_KALIP'); }
      const kS = v => (v >= 0 ? '+' : '') + v.toFixed(2);
      TX([x1 + mm(2), y1 + mm(1)], `${h.ad ? h.ad + ' ' : ''}${h.daire ? 'Ø' + cmi(h.w) + ' boru geçişi —' : cmi(h.w) + '*' + cmi(h.h)} BOŞLUK`, 2.2, 'L', 'STA_YAZI');
      TX([x1 + mm(2), y1 - mm(2.6)], h.daire ? `B.E.K ${kS(h.z)}` : `D.T.K ${kS(h.z - h.h / 2)}`, 2.0, 'L', 'STA_OLCU');
      TX([x1 + mm(2), y1 - mm(5.6)], `kesilen çubuklar boşluk kenarında ${cmi(R.S.geo.tw && pd.w.t ? pd.w.t - 2 * cP : 0.3)} cm gönyeli`, 1.8, 'L', 'STA_YAZI');
      rects.push([x0 - cP, y0 - cP, x1 + cP, y1 + cP]);
      for (const p of pd.poz.filter(q => q.ilave && uyan(q, hi))) {
        if (p.kesik) continue;
        if (p.kose) { const o = cP + 0.07, h2 = Math.min(p.boy / 2, 0.7) / Math.SQRT2; [[x0, y0, -1, -1], [x1, y0, 1, -1], [x1, y1, 1, 1], [x0, y1, -1, 1]].forEach(([x, y, sx, sy]) => { const qx = x + sx * o, qy = y + sy * o, q = kirp2([qx - h2 * sy, qy + h2 * sx], [qx + h2 * sy, qy - h2 * sx], SB); if (q) PL(q, false, 'STA_DONATI'); }); etiket2(D, [x1 + o + h2 * 0.5, y0 - o - h2 * 0.5], `2*2Ø${p.F}`, `L=${cmi(p.boy)}`, p.no, 'L'); etiket2(D, [x0 - o - h2 * 0.5, y0 - o - h2 * 0.5], `2*2Ø${p.F}`, `L=${cmi(p.boy)}`, p.no, 'R'); }
        else if (p.yonP === 'd') { const a = Math.max(yc - p.boy / 2, SB[1]), b = Math.min(yc + p.boy / 2, SB[3]); for (const x of [x0 - cP, x1 + cP]) if (x >= SB[0] && x <= SB[2]) PL([[x, a], [x, b]], false, 'STA_DONATI'); etiket2(D, [x0 - cP, yc], `4*${p.yan}Ø${p.F}`, `L=${cmi(p.boy)}`, p.no, 'R'); }
        else { const a = Math.max(h.s - p.boy / 2, SB[0]), b = Math.min(h.s + p.boy / 2, SB[2]); for (const y of [y0 - cP, y1 + cP]) if (y >= SB[1] && y <= SB[3]) PL([[a, y], [b, y]], false, 'STA_DONATI'); etiket2(D, [h.s - mm(8), y1 + cP + mm(6)], `4*${p.yan}Ø${p.F}`, `L=${cmi(p.boy)}`, p.no, 'L'); }
      }
    });
    // boşlukta kesilen çubuklar: boru hizasındaki gerçek konumlarında, boşluk kenarında gönye işaretiyle
    const tk = mm(1.6), gor = new Set();
    pd.poz.filter(p => p.kesik).forEach(p => { const yat2 = p.yonP === 'y', key = [yat2, r2(p.a), r2(p.b), r2(p.vRep)].join('|'); if (gor.has(key)) return; gor.add(key);
      const v = yat2 ? p.vRep - z0 : p.vRep, P2 = (u, w2) => (yat2 ? [u, w2] : [w2, u - z0]), U = u => u;
      const ucB = u => rects.some(r => (yat2 ? [r[0], r[2]] : [r[1] + z0, r[3] + z0]).some(e => Math.abs(e - u) < 0.02)), kay = mm(1.3); // boşluk kenarındaki uç: ilave çubukla çakışmasın diye çizimde az geri çek
      const ua = p.a + (p.ka && ucB(p.a) ? kay : 0), ub = p.b - (p.kb && ucB(p.b) ? kay : 0);
      PL([...(p.ka ? [P2(ua, v + tk)] : []), P2(ua, v), P2(ub, v), ...(p.kb ? [P2(ub, v + tk)] : [])], false, 'STA_DONATI');
      const m = (p.a + p.b) / 2, lp = yat2 ? [m, v] : [v, m - z0];
      etiket2(D, [lp[0] + (yat2 ? -mm(11) : mm(2)), lp[1] + (yat2 ? mm(2) : 0)], `${p.adet}Ø${p.F}/${cmi(p.s)}`, `L=${cmi(p.boy)}`, p.no, 'L'); });
    kayit(D, bas, rects, false);
  };

  /* ---- pafta çizimi (statik-pafta-dsi.js içinden çağrılır) ---- */
  P.delikCiz = (D, d, mod, poz) => {
    try { P._cD = S.mal.cD || 0.025; } catch (e) { }
    const bas = D.out.length;
    const B = delikler(d, true); if (!B.length) return;
    const { mm, TX, L, PL } = D, cmi = v => String(Math.round(v * 100));
    const cD0 = P._cD || 0.025;
    if (mod === 'donati') { const rr = B.filter(b => b.tam && !b.bolen).map(b => [b.k[0] - cD0, b.k[1] - cD0, b.k[2] + cD0, b.k[3] + cD0]); D._delikRects = rr; }
    const Bn = B.filter(b => !b.bolen);
    B.forEach((b, bj) => {
      const bi = Bn.indexOf(b), [x0, y0, x1, y1] = b.k, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, ci = daireMi(b.pts);
      PL(b.pts.concat([b.pts[0]]), false, 'STA_KALIP');
      if (b.tam) { L([x0, y0], [x1, y1], 'STA_KALIP'); L([x0, y1], [x1, y0], 'STA_KALIP'); } else PL([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], false, 'STA_GORUNUS', 'HIDDEN');
      const yazi = (b.tam ? 'BOŞLUK ' : 'CEP ') + (ci ? `Ø${cmi(x1 - x0)}` : `${cmi(x1 - x0)}×${cmi(y1 - y0)}`);
      TX([cx, cy - mm(1.2)], yazi, 2.2, 'C', 'STA_YAZI');
      if (mod === 'kalip') { D.DM([x0, y0], [x1, y0], 'h', -5, cmi(x1 - x0)); if (!ci) D.DM([x1, y0], [x1, y1], 'v', 5, cmi(y1 - y0)); D.DM([d.x0, y0], [x0, y0], 'h', -5, cmi(x0 - d.x0)); D.DM([x0, d.y0], [x0, y0], 'v', -5, cmi(y0 - d.y0)); }
      if (mod !== 'donati' || !b.tam || !poz || b.bolen) return;
      // ilave donatı: boşluğun iki yanında birer temsili çubuk, köşelerde 45° çubuk
      const ilv = poz.filter(p => p.ilave && !p.kose && !p.kesik && (p.delik === bi || (p.delikler || []).includes(bi)));
      ilv.filter(p => p.yuzA === 'alt').forEach(p => {
        const yl = p.yanlar || [true, true], ny = yl.filter(Boolean).length;
        if (p.yon === 'x') { [y0 - mm(2.5), y1 + mm(2.5)].forEach((y, j) => { if (yl[j]) PL([[p.u0, y], [p.u1, y]], false, 'STA_DONATI'); }); D.POZ([p.u0 - mm(4), y1 + mm(2.5)], p.no); TX([p.u0, y1 + mm(5)], `${2 * ny}*${p.yan}Ø${p.F} L=${cmi(p.boy)} (alt ve üst)`, 2.2, 'L', 'STA_POZ'); }
        else { [x0 - mm(2.5), x1 + mm(2.5)].forEach((x, j) => { if (yl[j]) PL([[x, p.u0], [x, p.u1]], false, 'STA_DONATI'); }); D.POZ([x0 - mm(2.5), p.u0 - mm(4)], p.no); TX([x0 - mm(5), p.u0], `${2 * ny}*${p.yan}Ø${p.F} L=${cmi(p.boy)} (alt ve üst)`, 2.2, 'L', 'STA_POZ', 90); }
      });
      const kp = poz.find(p => p.kose && (p.delik === bi || (p.delikler || []).includes(bi))), cD = (P._cD || 0.025);
      if (kp) { const sg = KOSELER(b).map(([x, y, sx, sy]) => koseCubuk(d, cD, x, y, sx, sy, cD + 0.07, kp.boy / 2)).filter(Boolean); sg.forEach(q => PL(q, false, 'STA_DONATI'));
        const n = sg.length; D.POZ([d.x1 + mm(5), y1], kp.no); TX([d.x1 + mm(8), y1 - mm(1)], `${n}*2Ø${kp.F} L=${cmi(kp.boy)} köşe 45° (alt ve üst)`, 2.2, 'L', 'STA_POZ'); }
    });
    // boşlukta kesilen ana çubuklar: her kesik poz için gerçek aralığında bir temsili parça, uçlarda gönye işareti
    if (mod === 'donati' && poz) { const tk = mm(1.6); poz.filter(p => p.kesik).forEach((p, j) => {
      const xd = p.yon === 'x', alt = p.yuzA === 'alt', sg = alt ? 1 : -1, v = p.vRep + (alt ? -1 : 1) * mm(1.4), P2 = (u, w2) => (xd ? [u, w2] : [w2, u]);
      PL([...(p.hA ? [P2(p.a, v + sg * tk)] : []), P2(p.a, v), P2(p.b, v), ...(p.hB ? [P2(p.b, v + sg * tk)] : [])], false, 'STA_DONATI');
      const m = p.a + Math.min(mm(4), (p.b - p.a) / 4), lp = v + (alt ? -mm(3.4) : mm(2.4));
      D.POZ(P2(m, lp), p.no); TX(xd ? [m + mm(3), lp - mm(0.8)] : [lp + mm(0.8), m + mm(3)], `${p.adet}Ø${p.F}/${cmi(p.s)} L=${cmi(p.boy)} ${alt ? 'alt' : 'üst'}`, 2.0, 'L', 'STA_POZ', xd ? 0 : 90); }); }
    if (mod === 'donati' && D._delikRects && D._delikRects.length) kayit(D, bas, D._delikRects);
  };

  /* ---- çizimde temsili çubukları boşlukta kes ---- */
  const KAYIT = [];
  const kayit = (D, bas, rects, tik) => { for (let i = bas; i < D.out.length; i++) D.out[i].koru = true; KAYIT.push({ out: D.out, rects, tik: tik !== false }); };
  const kes2 = (pts, r) => { const g = pts.map(q => [q[0], q[1], 0]); g.ca = pts.ca; g.cb = pts.cb; return kesDis(g, r).map(p => { const o = p.map(q => [q[0], q[1]]); o.ca = p.ca; o.cb = p.cb; return o; }); };
  const e0 = P.paftaEk;
  P.paftaEk = function (o) {
    try { for (const k of KAYIT) { const yeni = []; for (const it of k.out) { if (it.k === 'P' && it.ly === 'STA_DONATI' && !it.koru && !it.cl) { let parca = [it.pts]; for (const r of k.rects) parca = parca.flatMap(p => kes2(p, r));
          const q = it.pts, n = q.length, mmK = (o.K || 0.05), kisa = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]) < mmK * 4;
          let tk = n > 2 && kisa(q[0], q[1]) ? [q[0][0] - q[1][0], q[0][1] - q[1][1]] : n > 2 && kisa(q[n - 1], q[n - 2]) ? [q[n - 1][0] - q[n - 2][0], q[n - 1][1] - q[n - 2][1]] : null;
          if (!tk) { const a = q[0], b = q[n - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; tk = [-(b[1] - a[1]) / L * mmK * 1.6, (b[0] - a[0]) / L * mmK * 1.6]; }
          parca.forEach(pp => { let r = pp.slice(); if (k.tik && parca.length > 1 || k.tik && (pp.ca || pp.cb)) { if (pp.ca) r = [[r[0][0] + tk[0], r[0][1] + tk[1]], ...r]; if (pp.cb) r = [...r, [r[r.length - 1][0] + tk[0], r[r.length - 1][1] + tk[1]]]; } yeni.push(Object.assign({}, it, { pts: r })); }); } else if (it.k === 'L' && (it.ly === 'STA_DONATI' || it.ly === 'STA_OLCU') && !it.koru) { let parca = [[it.a, it.b]]; for (const r of k.rects) parca = parca.flatMap(p => kes2(p, r)); parca.forEach(pp => yeni.push(Object.assign({}, it, { a: pp[0], b: pp[pp.length - 1] }))); } else yeni.push(it); } k.out.length = 0; yeni.forEach(x => k.out.push(x)); } } catch (e) { console.error('boşluk kesimi', e); }
    KAYIT.length = 0;
    return e0 ? e0.apply(this, arguments) : undefined;
  };

  /* ---- 3B: kes + ilave ---- */
  const kesDis = (pts, R2) => { // çoklu çizgiden dikdörtgen içini çıkar (planda), parçalar
    const out = []; let cur = [pts[0]]; cur.ca = !!pts.ca;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1]; let t0 = 0, t1 = 1, ic = true;
      for (const [p, q] of [[-dx, a[0] - R2[0]], [dx, R2[2] - a[0]], [-dy, a[1] - R2[1]], [dy, R2[3] - a[1]]]) { if (Math.abs(p) < 1e-12) { if (q < 0) { ic = false; break; } } else { const r = q / p; if (p < 0) { if (r > t1) { ic = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ic = false; break; } if (r < t1) t1 = r; } } }
      if (!ic || t1 - t0 < 1e-9) { cur.push(b); continue; }
      const A = [a[0] + dx * t0, a[1] + dy * t0, a[2] + (b[2] - a[2]) * t0], Bq = [a[0] + dx * t1, a[1] + dy * t1, a[2] + (b[2] - a[2]) * t1];
      if (t0 > 1e-9) cur.push(A); if (cur.length > 1) { cur.cb = true; out.push(cur); } cur = t1 < 1 - 1e-9 ? [Bq, b] : [Bq]; cur.ca = true;
    }
    if (cur.length > 1) { cur.cb = !!pts.cb; out.push(cur); }
    return out.filter(p => p.length > 1 && p.some((q, i) => i && Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1], q[2] - p[i - 1][2]) > 0.05));
  };
  const b0 = P.donati3BDsi;
  if (b0) P.donati3BDsi = function (R) {
    const out = b0.apply(this, arguments), S = R.S, c = S.mal, zU = S.geo.kUst, DT = P.detayDsi(R);
    for (const dd of DT.doseme) {
      const B = (dd.delik || []); if (!B.length) continue; const ad = 'Döşeme ' + (dd.d.ad || ''), zb = zU - dd.d.t + c.cD, zt = zU - c.cD;
      const gD = Math.max(0.05, Math.round((dd.d.t - 2 * c.cD) * 100) / 100), zm = (zb + zt) / 2;
      out.filter(o => o.eleman === ad).forEach(o => { for (const b of B) { const g = [b.k[0] - c.cD, b.k[1] - c.cD, b.k[2] + c.cD, b.k[3] + c.cD]; o.bars = o.bars.flatMap(br => kesDis(br, g)); }
        if (o.tip) return; // takoz: yalnız kesilir
        o.bars = o.bars.map(br => { let r = br.slice(); const yon = (q => (q[2] < zm ? 1 : -1)); if (br.ca) r = [[r[0][0], r[0][1], r[0][2] + yon(r[0]) * gD], ...r]; if (br.cb) { const q = r[r.length - 1]; r = [...r, [q[0], q[1], q[2] + yon(q) * gD]]; } return r; }); });
      for (const p of dd.poz.filter(q => q.ilave && !q.kesik)) {
        const o = { poz: p.no, F: p.F, s: p.s, eleman: ad, tanim: p.ad + ' · ' + p.yuzA, bars: [] }, F = p.F / 1000;
        for (const [bi, b] of B.entries()) {
          if (!(p.delik === bi || (p.delikler || []).includes(bi))) continue; const [x0, y0, x1, y1] = b.k;
          if (p.kose) { const sg = KOSELER(b).map(([x, y, sx, sy]) => koseCubuk(dd.d, c.cD, x, y, sx, sy, c.cD + 0.07, p.boy / 2)).filter(Boolean); for (const z of [zb + 0.03, zt - 0.03]) sg.forEach(q => o.bars.push([[q[0][0], q[0][1], z], [q[1][0], q[1][1], z]])); continue; }
          const z = p.yuzA === 'alt' ? zb + (p.yon === 'x' ? F / 2 : 0.012 + F / 2) : zt - (p.yon === 'x' ? F / 2 : 0.012 + F / 2), ar = Math.max(0.05, 2.5 * F);
          for (let k = 0; k < p.yan; k++) { const e = c.cD + F / 2 + k * ar;
            const yl = p.yanlar || [true, true];
            if (p.yon === 'x') { if (yl[0]) o.bars.push([[p.u0, y0 - e, z], [p.u1, y0 - e, z]]); if (yl[1]) o.bars.push([[p.u0, y1 + e, z], [p.u1, y1 + e, z]]); }
            else { if (yl[0]) o.bars.push([[x0 - e, p.u0, z], [x0 - e, p.u1, z]]); if (yl[1]) o.bars.push([[x1 + e, p.u0, z], [x1 + e, p.u1, z]]); } }
        }
        if (o.bars.length) out.push(o);
      }
    }
    // perde boşlukları: çubukları kes, ilave ekle
    const kes3 = (pts, bx) => { const out2 = []; let cur = [pts[0]]; cur.ca = !!pts.ca;
      for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; let t0 = 0, t1 = 1, ic = true;
        for (let k = 0; k < 3 && ic; k++) for (const [p, q] of [[-d[k], a[k] - bx[k][0]], [d[k], bx[k][1] - a[k]]]) { if (Math.abs(p) < 1e-12) { if (q < 0) { ic = false; break; } } else { const r = q / p; if (p < 0) { if (r > t1) { ic = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ic = false; break; } if (r < t1) t1 = r; } } }
        if (!ic || t1 - t0 < 1e-9) { cur.push(b); continue; } const A = a.map((v, k) => v + d[k] * t0), Bq = a.map((v, k) => v + d[k] * t1); if (t0 > 1e-9) cur.push(A); if (cur.length > 1) { cur.cb = true; out2.push(cur); } cur = t1 < 1 - 1e-9 ? [Bq, b] : [Bq]; cur.ca = true; }
      if (cur.length > 1) { cur.cb = !!pts.cb; out2.push(cur); } return out2.filter(p => p.some((q, i) => i && Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1], q[2] - p[i - 1][2]) > 0.04)); };
    for (const pd of DT.perdeler) {
      const H = pd.delik || []; if (!H.length) continue; const w = pd.w, ad = pd.no + ' perde', cP = c.cP, Pt = (s2, o, z) => [w.p0[0] + w.e[0] * s2 + w.n[0] * o, w.p0[1] + w.e[1] * s2 + w.n[1] * o, z];
      H.forEach(h => { const a = Pt(h.s - h.w / 2 - cP, -w.t / 2 - 0.05, 0), b = Pt(h.s + h.w / 2 + cP, w.t / 2 + 0.05, 0), bx = [[Math.min(a[0], b[0]), Math.max(a[0], b[0])], [Math.min(a[1], b[1]), Math.max(a[1], b[1])], [h.z - h.h / 2 - cP, h.z + h.h / 2 + cP]];
        out.filter(o => o.eleman === ad).forEach(o => { o.bars = o.bars.flatMap(br => kes3(br, bx)); }); });
      const gP = Math.max(0.05, Math.round((w.t - 2 * cP) * 100) / 100), ofs = q => (q[0] - w.p0[0]) * w.n[0] + (q[1] - w.p0[1]) * w.n[1], don = q => { const sg = ofs(q) > 0 ? -1 : 1; return [q[0] + w.n[0] * sg * gP, q[1] + w.n[1] * sg * gP, q[2]]; };
      out.filter(o => o.eleman === ad && !o.tip && !/Çiroz/.test(o.tanim || '')).forEach(o => { o.bars = o.bars.map(br => { let r = br.slice(); if (br.ca) r = [don(r[0]), ...r]; if (br.cb) r = [...r, don(r[r.length - 1])]; return r; }); });
      const dus = pd.poz.find(p => p.ad === 'Düşey'), Fv = dus ? dus.F / 1000 : 0.016; const SN3 = sinir(R, w), SB3 = [SN3.s0, SN3.z0, SN3.s1, SN3.z1];
      for (const p of pd.poz.filter(q => q.ilave)) {
        const o = { poz: p.no, F: p.F, s: p.s, eleman: ad, tanim: p.ad + ' · iki yüz', bars: [] }, F = p.F / 1000;
        H.forEach((h, hi) => { if (!uyan(p, hi)) return; const x0 = h.s - h.w / 2, x1 = h.s + h.w / 2, za = h.z - h.h / 2, zb2 = h.z + h.h / 2;
          for (const sg of [1, -1]) {
            const oV = sg * (w.t / 2 - cP - Fv / 2), oH = sg * (w.t / 2 - cP - Fv - F / 2), oK = sg * (w.t / 2 - cP - Fv - 0.02);
            if (p.kose) { const of = cP + 0.07, h2 = p.boy / 2 / Math.SQRT2; [[x0, za, -1, -1], [x1, za, 1, -1], [x1, zb2, 1, 1], [x0, zb2, -1, 1]].forEach(([x, z, sx, sz]) => { const qx = x + sx * of, qz = z + sz * of, q = kirp2([qx - h2 * sz, qz + h2 * sx], [qx + h2 * sz, qz - h2 * sx], SB3); if (q) o.bars.push([Pt(q[0][0], oK, q[0][1]), Pt(q[1][0], oK, q[1][1])]); }); continue; }
            for (let k = 0; k < p.yan; k++) { const e2 = cP + F / 2 + k * Math.max(0.05, 2.5 * F);
              if (p.yonP === 'd') { const zA = Math.max(h.z - p.boy / 2, SB3[1]), zB = Math.min(h.z + p.boy / 2, SB3[3]); for (const x of [x0 - e2, x1 + e2]) if (x >= SB3[0] && x <= SB3[2] && zB - zA > 0.15) o.bars.push([Pt(x, oV, zA), Pt(x, oV, zB)]); }
              else { const sA = Math.max(h.s - p.boy / 2, SB3[0]), sB = Math.min(h.s + p.boy / 2, SB3[2]); for (const z of [za - e2, zb2 + e2]) if (z >= SB3[1] && z <= SB3[3] && sB - sA > 0.15) o.bars.push([Pt(sA, oH, z), Pt(sB, oH, z)]); } }
          } });
        if (o.bars.length) out.push(o);
      }
    }
    return out;
  };
})();

/* ---- PERDE 2-2 YATAY KESİTİ (görünüşün altında; referans çizim düzeni) ----
   Perde boyunca planda kesit: iki yüzde yatay çubuklar (uçlarda dik perdeye kanca), düşey çubuklar nokta,
   çirozlar, dik perde başlangıçları; kesit boru / boşluk hizasından geçer, boşlukta kesilen çubuklar gönyeli gösterilir. */
(function () {
  'use strict';
  const P = window.STATIK; if (!P) return;
  P.perdeKesit22 = (D, R, pd, yTop) => {
    const { mm, TX, L, PL, REC } = D, g = R.S.geo, c = R.S.mal, cP = c.cP, w = pd.w, t = w.t, tE = g.tw, zR = w.zB != null ? w.zB : g.kAlt + g.hr, zU = w.zU != null ? w.zU : g.kUst, cmi = v => String(Math.round(v * 100));
    const H = pd.delik || [], zK = H.length ? H[0].z : zR + (zU - zR) / 2; // kesit kotu
    const yat = pd.poz.filter(p => p.yon === 'yatay'), dus = pd.poz.filter(p => p.yon === 'düşey'), cir = pd.poz.find(p => p.ciroz);
    const Fv = dus.length ? dus[0].F / 1000 : 0.016, Fh = yat.length ? yat[0].F / 1000 : 0.014;
    const yc = yTop - mm(10) - t / 2 - 0.6, Y = o => yc - o; // o: +n (dış) yukarı
    const tA = w.tA != null ? w.tA : tE, tB = w.tB != null ? w.tB : tE, x0 = -tA / 2, x1 = w.L + tB / 2;
    // beton: perde + uçlarda dik perde başlangıçları (kısa perdenin serbest ucunda yok)
    PL([[x0, Y(t / 2)], [x1, Y(t / 2)]], false, 'STA_KALIP'); PL([[x0, Y(-t / 2)], [x1, Y(-t / 2)]], false, 'STA_KALIP');
    if (w.kisa) { if (!tA) PL([[x0, Y(t / 2)], [x0, Y(-t / 2)]], false, 'STA_KALIP'); if (!tB) PL([[x1, Y(t / 2)], [x1, Y(-t / 2)]], false, 'STA_KALIP'); }
    for (const [xa, xb] of [[x0, x0 + tA], [x1 - tB, x1]].filter(q => q[1] - q[0] > 0.01)) { const ic = xa === x0 ? xb : xa, dsr = xa === x0 ? xa : xb; PL([[dsr, Y(t / 2)], [dsr, Y(-t / 2) + 0.6]], false, 'STA_KALIP'); PL([[ic, Y(-t / 2)], [ic, Y(-t / 2) + 0.6]], false, 'STA_KALIP'); L([xa - 0.05, Y(-t / 2) + 0.6], [xb + 0.05, Y(-t / 2) + 0.6], 'STA_GORUNUS', 'HIDDEN'); }
    // boşluk (kesit boşluktan geçiyorsa)
    const kes = H.filter(h => Math.abs(zK - h.z) <= h.h / 2), gaps = kes.map(h => [h.s - h.w / 2, h.s + h.w / 2]);
    kes.forEach(h => { const a = h.s - h.w / 2, b = h.s + h.w / 2; REC(a, Y(t / 2), b, Y(-t / 2), 'STA_KALIP'); L([a, Y(t / 2)], [b, Y(-t / 2)], 'STA_KALIP'); L([a, Y(-t / 2)], [b, Y(t / 2)], 'STA_KALIP'); TX([h.s, Y(-t / 2) + 0.6 + mm(2)], (h.ad ? h.ad + ' ' : '') + (h.daire ? 'Ø' + cmi(h.w) : cmi(h.w) + '×' + cmi(h.h)), 2.0, 'C'); });
    const parca = (a, b) => { let out = [[a, b, false, false]]; for (const [g0, g1] of gaps) out = out.flatMap(([u, v, ka, kb]) => (g1 <= u + cP || g0 >= v - cP ? [[u, v, ka, kb]] : [...(g0 - cP > u + 0.1 ? [[u, g0 - cP, ka, true]] : []), ...(v > g1 + cP + 0.1 ? [[g1 + cP, v, true, kb]] : [])])); return out; };
    // yatay çubuklar (iki yüz)
    const yuz = p => (p.yuzA === 'iç-dış' ? [1, -1] : /dış|yüz 1/.test(p.yuzA) ? [1] : [-1]), gor = new Set(), gP = t - 2 * cP;
    yat.forEach(p => yuz(p).forEach(sg => { if (gor.has(sg)) return; gor.add(sg); const o = sg * (t / 2 - cP - Fv - Fh / 2), uc = tE / 2 - cP - Fv - Fh / 2, kan = p.kanca || 0.2;
      const kA = w.kisa ? (w.uA === 'bagli' ? -p.hA : sg * p.hA) : sg * kan, kB = w.kisa ? (w.uB === 'bagli' ? -p.hB : sg * p.hB) : sg * kan; // kısa perde: bağlı uç kancası perde boyunca, serbest uç karşı yüze
      parca(w.kisa ? p.ua : -uc, w.kisa ? p.ub : w.L + uc).forEach(([a, b, ka, kb], j) => {
        const pr = P.yatayParcalar ? P.yatayParcalar(a, b, p.F, ka ? gP : Math.abs(kA), kb ? gP : Math.abs(kB)) : [[a, b]], ls = P.bindirme(p.F); // 12 m'yi aşan: bindirmeli parçalar
        pr.forEach(([a2, b2], m) => { const dy = (m % 2) * sg * mm(1.2), pts = []; if (m === 0) pts.push(ka ? [a2, Y(o - sg * gP) + dy] : [a2, Y(o - kA) + dy]); pts.push([a2, Y(o) + dy], [b2, Y(o) + dy]); if (m === pr.length - 1) pts.push(kb ? [b2, Y(o - sg * gP) + dy] : [b2, Y(o - kB) + dy]); PL(pts, false, 'STA_DONATI', p.F); });
        for (let m = 0; m < pr.length - 1; m++) if (sg > 0) D.DM([pr[m + 1][0], Y(o)], [pr[m][1], Y(o)], 'h', -7, cmi(ls)); });
      const dar = x1 - x0 < 6, xm = dar ? x1 + mm(6) : w.L * 0.62, yl = dar ? Y(o) - (sg > 0 ? mm(3) : -mm(3)) : sg > 0 ? Y(t / 2) - mm(4.5) : Y(-t / 2) + mm(3.5); D.POZ([xm, yl], p.no); TX([xm + mm(3), yl - mm(0.8)], `${p.adet}Ø${p.F}/${cmi(p.s)} L=${cmi(p.boy)} ${p.kat === 2 ? 'iç-dış' : p.yuzA}`, 2.0, 'L', 'STA_POZ'); }));
    // düşey çubuklar: nokta
    const dp = dus[0];
    if (dp) { const va = w.kisa ? -x0 * 0 + (w.kisa.a - (w.p0[0] * w.e[0] + w.p0[1] * w.e[1])) + cP : tE / 2 + 0.05, vb = w.kisa ? (w.kisa.b - (w.p0[0] * w.e[0] + w.p0[1] * w.e[1])) - cP : w.L - tE / 2 - 0.05, n = Math.max(1, Math.round((vb - va) / dp.s));
      for (let k = 0; k <= n; k++) { const sv = va + (vb - va) * k / n; if (gaps.some(([g0, g1]) => sv > g0 - cP && sv < g1 + cP)) continue; for (const sg of [1, -1]) D.out.push({ k: 'C', c: [sv, Y(sg * (t / 2 - cP - Fv / 2))], r: Math.max(mm(0.45), Fv / 2), ly: 'STA_DONATI_KESIT' }); }
      TX([x1 - x0 < 6 ? x0 : w.L * 0.12, Y(-t / 2) + mm(3.2)], `${dus.filter(q => /filiz|tek/.test(q.parca || '')).map(q => (q.kat === 2 ? '2*' + (q.nYuz || Math.round(q.adet / 2)) : q.adet) + 'Ø' + q.F + '/' + cmi(q.s)).join(' + ') || ('Ø' + dp.F + '/' + cmi(dp.s))} düşey (her iki yüz)`, 2.0, 'L', 'STA_POZ'); }
    // çirozlar
    if (cir) { const a = cir.s || 0.5, o = t / 2 - cP - Fv / 2, k = 0.06; for (let sv = tE / 2 + 0.2; sv < w.L - tE / 2 - 0.1; sv += a) { if (gaps.some(([g0, g1]) => sv > g0 - cP - 0.05 && sv < g1 + cP + 0.05)) continue; PL([[sv + k * 0.7, Y(o - k * 0.7)], [sv, Y(o)], [sv, Y(-o)], [sv + k, Y(-o)]], false, 'STA_DONATI', cir.F); }
      D.POZ([tE / 2 + 0.2 + a * 1.5, Y(t / 2) - mm(10)], cir.no); TX([tE / 2 + 0.2 + a * 1.5 + mm(3), Y(t / 2) - mm(10.8)], `çiroz Ø${cir.F}/${cmi(a)}-${cmi(a)}`, 2.0, 'L', 'STA_POZ'); }
    D.DM([x0, Y(t / 2)], [x0, Y(-t / 2)], 'v', -6, cmi(t));
    D.BASLIK([(x0 + x1) / 2, Y(t / 2) - mm(16)], '2-2 KESİTİ', `kot ${(zK >= 0 ? '+' : '') + zK.toFixed(2)}`);
    // görünüşte kesit izleri
    const zg = zK - g.kAlt; L([x0 - mm(6), zg], [x0 - mm(1), zg], 'STA_BASLIK'); L([x1 + mm(1), zg], [x1 + mm(6), zg], 'STA_BASLIK'); TX([x0 - mm(7), zg - mm(1)], '2', 2.8, 'R', 'STA_BASLIK'); TX([x1 + mm(7), zg - mm(1)], '2', 2.8, 'L', 'STA_BASLIK');
    const sx = w.L * 0.5, Ht = zU - g.kAlt; L([sx, Ht + mm(1)], [sx, Ht + mm(6)], 'STA_BASLIK'); { const zb = (w.zB != null ? w.zB - (w.tD || 0.2) : g.kAlt) - g.kAlt; L([sx, zb - mm(1)], [sx, zb - mm(6)], 'STA_BASLIK'); } TX([sx + mm(1), Ht + mm(7)], '1', 2.8, 'L', 'STA_BASLIK');
    return (yTop - (Y(t / 2) - mm(32)));
  };
})();

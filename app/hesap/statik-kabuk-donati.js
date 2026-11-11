/* ArıtmaCAD — STATİK: yay / oval planlı hazne (3B kabuk) — DONATI AÇILIMLARI, ÇİROZ ve MODELE 3B DONATI
   Firma paftası örnek alınmıştır (ÇOKAL AAT T-106 perde donatı paftası):
     • YATAY DONATI AÇILIMI  — her perde için dış / iç yüz yatay çubukları planda gerçek şekliyle (yaylar eğri, R yazılı),
                               12 m'lik parçalara bölünmüş, bindirmeler kaydırılarak gösterilir; her parçada poz, Ø/s, L
     • DÜŞEY DONATI AÇILIMI  — perde grubu başına dış / iç yüz düşey çubuk şekilleri (filiz + gövde, kanca boyları)
     • ÇİROZ DETAYI          — iki yüz donatısını bağlayan Ø8 çiroz (135° kancalı), 2s × 2s şaşırtmalı; metraja eklenir;
                               planda yaylı perdelerde ışınsal çiroz çizgileri
     • DONATIYI MODELE YERLEŞTİR — kabuk modunda perde (yatay halka + düşey), çiroz ve radye (alt / üst X-Y) çubukları
                               mutlak koordinatlarla ArıtmaCAD'e 3B donatı olarak gönderilir */
'use strict';
(function () {
  const P = window.STATIK, $ = s => document.querySelector(s); if (!P) return;
  const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000, cmi = v => String(Math.round(v * 100)), DEG = 180 / Math.PI;
  const CF = 8; // çiroz çapı
  const kotS = v => (v >= 0 ? '+' : '') + (+v).toFixed(2);
  const Y = () => P._kabukYard;
  const pip = (q, poly) => { let c2 = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c2 = !c2; } return c2; };
  // perde yüzleri: [{yuz, isaret, s (seçim yatay), v (seçim düşey), dOf}] — kabukBloklar ile aynı ölçüt
  // seçim: hesap yeterliyse tasarım; yetersizse (kesit yetersiz) yine de hesaplanan en yakın çubuk düzeni çizilsin / aktarılsın
  const secim = (K, wi, yon, yuz) => { const s0 = Y().secim(K, wi, yon, yuz); if (s0) return s0; const t = K.tasarim.find(x => x.grup.tur !== 'radye' && x.grup.tur !== 'doseme' && K.AG.els[x.grup.ids[0]].wi === wi); if (!t) return null;
    const k = t.katman.find(q => q.yon.startsWith(yon) && q.yuz === yuz) || t.katman.find(q => q.yon.startsWith(yon)); return k && k.sec && k.sec.F && k.sec.s ? Object.assign({}, k.sec, { yetersiz: true }) : null; };
  const yuzler = (K, w, IC, cP) => { const { ofset } = Y(); const sol = w.sol || ofset(w.pts, w.t / 2, w.kapali), solIc = w.tip === 'dis' ? pip(sol[Math.floor(sol.length / 2)], IC) : true, out = [];
    for (const [yuz, isr] of [[w.tip === 'dis' ? 'dış' : '1. yüz', 1], [w.tip === 'dis' ? 'iç' : '2. yüz', -1]]) {
      const sH = secim(K, w.wi, 'M11', yuz), sV = secim(K, w.wi, 'M22', yuz); if (!sH && !sV) continue;
      const isaret = w.tip === 'dis' ? ((yuz === 'iç') === solIc ? 1 : -1) : isr, F0 = (sH || sV).F / 1000;
      const dOf = isaret * (w.t / 2 - cP - F0 / 2), dOfT = w.tt != null ? (isaret > 0 ? w.solUst : w.sagUst) - isaret * (cP + F0 / 2) : dOf; // eğimli perde: üstte yüz ötelemesi farklı
      out.push({ yuz, isaret, sH, sV, dOf, dOfT }); }
    return out; };
  /* boşluk donatı planı (paftada metraj + detay, modelde 3B aynı kuralla):
     • kesilen yatay çubuklar boşluğun iki yanında, kesilen düşey çubuklar alt / üstte boşluk kenarından paspayı geride biter;
       her kesilen çubuk sırasına bir U FİRKETE (gönye) konur: bir yüzden girip perde kalınlığını geçer, öbür yüzde biter (bacaklar bindirme boyu)
     • iki yanda 2'şer düşey, alt / üstte 2'şer yatay İLAVE (iki yüzde), boşluk + 2 × bindirme boyunda
     • büyük kenar 40 cm'den büyükse köşelerde 45° Ø12 çubuk (iki yüzde) */
  const bosPlan = (w, h, yz, cP, zR, zu) => {
    const fH = yz.find(q => q.sH) || {}, fV = yz.find(q => q.sV) || {}, sH = fH.sH || fV.sV, sV = fV.sV || fH.sH; if (!sH || !sV) return null;
    const lapH = P.bindirme(sH.F), lapV = P.bindirme(sV.F), ic = r2(w.t - 2 * cP - Math.max(sH.F, sV.F) / 1000), n2 = yz.length >= 2 ? 2 : 1;
    const hh = h.daire ? h.w : h.h, z0 = Math.max(zR + 0.05, h.zc - hh / 2 - cP), z1 = Math.min(zu, h.zc + hh / 2 + cP);
    const nYan = Math.max(1, Math.floor((z1 - z0) / sH.s) + 1), nUst = Math.max(1, Math.floor((h.w + 2 * cP) / sV.s) + 1);
    const uY = { F: sH.F, n: 2 * nYan, bac: r2(Math.max(0.4, lapH * 0.6)), ic }, uU = { F: sV.F, n: (h.zc - hh / 2 - cP > zR + 0.1 ? 1 : 0) * nUst + (h.zc + hh / 2 + cP < zu - 0.05 ? 1 : 0) * nUst, bac: r2(Math.max(0.4, lapV * 0.6)), ic };
    uY.boy = r2(2 * uY.bac + ic); uU.boy = r2(2 * uU.bac + ic);
    const iV = { F: sV.F, n: 2 * 2 * n2, L: r2(hh + 2 * lapV) }, iY = { F: sH.F, n: 2 * 2 * n2, L: r2(h.w + 2 * lapH) };
    const kose = Math.max(h.w, hh) > 0.4 ? { F: 12, n: 4 * n2, L: 1.0 } : null; // köşe çubuğu 2 × 40Ø ≈ 1.00 m
    return { sH, sV, lapH, lapV, ic, hh, z0, z1, nYan, nUst, uY, uU, iV, iY, kose };
  };
  // çoklu çizgi üzerinde yay uzunluğu → nokta / teğet
  const yol = (pts, kap) => { const Q = kap ? pts.concat([pts[0]]) : pts.slice(), cum = [0]; for (let i = 1; i < Q.length; i++) cum.push(cum[i - 1] + Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1])); const L = cum[cum.length - 1];
    const at = s => { if (kap) { s %= L; if (s < 0) s += L; } else s = Math.max(0, Math.min(L, s)); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const a = Q[i - 1], b = Q[i], l = cum[i] - cum[i - 1] || 1, u = (s - cum[i - 1]) / l; return { p: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], t: [(b[0] - a[0]) / l, (b[1] - a[1]) / l], i }; };
    const parca = (s0, s1) => { const out = [at(s0).p]; for (let k = 0; k < (kap ? 2 : 1); k++) for (let i = 1; i < cum.length - 1; i++) { const si = cum[i] + k * L; if (si > s0 + 1e-6 && si < s1 - 1e-6) out.push(Q[i]); } out.push(at(s1).p);
      // sıralama: kapalıda iki tur birleşiminde artan s sırası
      return out; };
    return { L, at, parca, cum, Q }; };
  const egriR = (w, s0, s1, ya) => { // parçanın büyük kısmı yaydaysa yarıçap (çubuk ekseni)
    let best = null; for (const p of w.parca) if (p.tip === 'yay') { const d = Math.hypot(...[0, 1].map(k => ya.at((s0 + s1) / 2).p[k] - p.c[k])); if (Math.abs(d - p.R) < w.t + 0.05) best = d; } return best; };

  /* ================= PAFTA EKLERİ ================= */
  const b0 = P.kabukBloklar;
  if (b0) P.kabukBloklar = function (K, S, olcek) {
    const res = b0.apply(this, arguments); try { ekle(res, K, S, olcek); } catch (er) { console.error('kabuk donatı açılımı', er); } try { if (!arguments[3]) perspektifEkle(res, K, S); } catch (er) { console.error('kabuk perspektif', er); } return res; };
  const ekle = (res, K, S, olcek) => {
    const G = P._kabukSon, D0 = P._dsi, c = S.mal, cP = c.cP, cR = c.cR, { B, perdePoz } = res; if (!G || !D0) return;
    const { W, rad, zR, Kf, RP } = G, IC = G.ICd || RP, OL = olcek || 50;
    // ---- çiroz pozları (metraja) ----
    let pno = Math.max(100, ...perdePoz.map(p => p.no || 0));
    const cirozlar = [];
    for (const w of W) { const yz = yuzler(K, w, IC, cP); if (yz.length < 2) continue; const sh = Math.max(...yz.map(q => q.sH ? q.sH.s : 0.2)), sv = Math.max(...yz.map(q => q.sV ? q.sV.s : 0.2)), ax = r2(Math.min(0.5, 2 * sv)), az = r2(Math.min(0.5, 2 * sh));
      const Lf = Y().plen(w.pts, w.kapali), H = w.zt - zR, n = Math.ceil((Math.floor(Lf / ax) + 1) * (Math.floor((H - 0.1) / az) + 1) / 2), ic = r2(w.t - 2 * cP), hk = r2(Math.max(0.08, 10 * CF / 1000)), boy = r2(ic + 2 * hk);
      const p = Y().pozEkle(perdePoz, { F: CF, s: ax, adet: n, boy, segs: [{ L: hk, a: 135 }, { L: ic, a: 0 }, { L: hk, a: 135 }], grup: 'W' + w.wi + 'C', ad: `${w.ad} çiroz ${cmi(ax)}×${cmi(az)} şaşırtmalı` }); if (p && !p.no) p.no = ++pno;
      cirozlar.push({ w, ax, az, ic, hk, boy, p }); }
    // ---- PERDE BOŞLUKLARI: pozlar + demirci için açık detay (görünüş + U firkete + imalat sırası) ----
    const olB = Math.min(OL, 25), fb = OL / olB;
    // boşluğun PLANDAKİ YERİ: dönük pafta çerçevesinde merkez + en yakın akslara uzaklık (demirci / kalıpçı yeri buradan bulur)
    const cs = Math.cos(-G.th), sn = Math.sin(-G.th), DN = q => [q[0] * cs - q[1] * sn, q[0] * sn + q[1] * cs];
    const konum = (h, hi, w) => { const c = DN(h.c), u = DN(h.u), AX = G.ax || [], AY = G.ay || [], hf = G.harf || (i => String.fromCharCode(65 + i));
      const ix = AX.length ? AX.reduce((b, x, i) => (Math.abs(x - c[0]) < Math.abs(AX[b] - c[0]) ? i : b), 0) : -1, iy = AY.length ? AY.reduce((b, y, i) => (Math.abs(y - c[1]) < Math.abs(AY[b] - c[1]) ? i : b), 0) : -1;
      const ms = []; if (ix >= 0) ms.push(Math.abs(c[0] - AX[ix]) < 0.03 ? `${ix + 1} aksı üzerinde` : `${ix + 1} aksından ${(c[0] - AX[ix] >= 0 ? 'sağa' : 'sola')} ${Math.abs(c[0] - AX[ix]).toFixed(2)} m`); if (iy >= 0) ms.push(Math.abs(c[1] - AY[iy]) < 0.03 ? `${hf(iy)} aksı üzerinde` : `${hf(iy)} aksından ${(c[1] - AY[iy] >= 0 ? 'yukarı' : 'aşağı')} ${Math.abs(c[1] - AY[iy]).toFixed(2)} m`);
      return { c, u, ix, iy, x0: ix >= 0 ? AX[ix] : null, y0: iy >= 0 ? AY[iy] : null, metin: ms.join(', '), ad: `${w.ad} B${hi + 1}` }; };
    const planlar = [B.find(b => b.pafta === 0), B.find(b => b.pafta === 3)].filter(Boolean);
    { const xs0 = RP.map(q => q[0]), ys0 = RP.map(q => q[1]), mx = (Math.min(...xs0) + Math.max(...xs0)) / 2, my = (Math.min(...ys0) + Math.max(...ys0)) / 2;
      for (const pb of planlar) { const D = D0.yeniCizim(Kf), { mm, PL, L, TX } = D; let say = 0;
        for (const w of W) (w.delik || []).forEach((h, hi) => { if (!(h.w > 0.02)) return; const k = konum(h, hi, w), n = [k.u[1], -k.u[0]], dd = w.t / 2 + 0.06, hw = h.w / 2, c = k.c;
          const Q = (a, b2) => [c[0] + k.u[0] * a + n[0] * b2, c[1] + k.u[1] * a + n[1] * b2]; PL([Q(-hw, -dd), Q(hw, -dd), Q(hw, dd), Q(-hw, dd)], true, 'STA_KALIP'); L(Q(-hw, -dd), Q(hw, dd), 'STA_KALIP'); L(Q(-hw, dd), Q(hw, -dd), 'STA_KALIP');
          const dis = Math.sign((c[0] - mx) * n[0] + (c[1] - my) * n[1]) || 1, p1 = Q(0, dis * (dd + mm(4))), p2 = [p1[0] + n[0] * dis * mm(10), p1[1] + n[1] * dis * mm(10)];
          L(Q(0, dis * dd), p2, 'STA_YAZI'); L(p2, [p2[0] + mm(34), p2[1]], 'STA_YAZI');
          TX([p2[0] + mm(1), p2[1] + mm(1)], `${k.ad} BOŞLUK ${h.daire ? 'Ø' + cmi(h.w) : cmi(h.w) + '×' + cmi(h.h)} · alt ${kotS(h.zc - (h.daire ? h.w : h.h) / 2)}`, 2.2, 'L', 'STA_BASLIK');
          TX([p2[0] + mm(1), p2[1] - mm(3.2)], k.metin + ' (boşluk ortası)', 1.9, 'L', 'STA_YAZI');
          if (k.x0 != null && Math.abs(c[0] - k.x0) > 0.05) D.DM([k.x0, c[1]], [c[0], c[1]], 'h', 0, cmi(Math.abs(c[0] - k.x0)));
          if (k.y0 != null && Math.abs(c[1] - k.y0) > 0.05) D.DM([c[0], k.y0], [c[0], c[1]], 'v', 0, cmi(Math.abs(c[1] - k.y0)));
          say++; });
        if (say) { const T = D0.yeniCizim(Kf); T.out.push(...pb.spec, ...D.out); pb.spec = T.out; pb.kutu = T.kutu(); } } }
    for (const w of W) { const HL = (w.delik || []).filter(h => h.w > 0.02 && h.h > 0.02); if (!HL.length) continue; const yz = yuzler(K, w, IC, cP), zu = w.zt - cP;
      HL.forEach((h, hi) => { const bp = bosPlan(w, h, yz, cP, zR, zu); if (!bp) return; const ad = `${w.ad} B${hi + 1}`, pz = {};
        const ekleP = (k, o) => { const q = Y().pozEkle(perdePoz, o); if (q && !q.no) q.no = ++pno; pz[k] = q; };
        ekleP('iV', { F: bp.iV.F, s: 0.1, adet: bp.iV.n, boy: bp.iV.L, segs: [{ L: bp.iV.L, a: 0 }], grup: 'W' + w.wi + 'B' + hi + 'iV', ad: `${ad} ilave düşey` });
        ekleP('iY', { F: bp.iY.F, s: 0.1, adet: bp.iY.n, boy: bp.iY.L, segs: [{ L: bp.iY.L, a: 0 }], grup: 'W' + w.wi + 'B' + hi + 'iY', ad: `${ad} ilave yatay` });
        ekleP('uY', { F: bp.uY.F, s: bp.sH.s, adet: bp.uY.n, boy: bp.uY.boy, segs: [{ L: bp.uY.bac, a: 90 }, { L: bp.uY.ic, a: 0 }, { L: bp.uY.bac, a: 90 }], grup: 'W' + w.wi + 'B' + hi + 'uY', ad: `${ad} U firkete (yanlar)` });
        if (bp.uU.n) ekleP('uU', { F: bp.uU.F, s: bp.sV.s, adet: bp.uU.n, boy: bp.uU.boy, segs: [{ L: bp.uU.bac, a: 90 }, { L: bp.uU.ic, a: 0 }, { L: bp.uU.bac, a: 90 }], grup: 'W' + w.wi + 'B' + hi + 'uU', ad: `${ad} U firkete (alt / üst)` });
        if (bp.kose) ekleP('k', { F: 12, s: 1, adet: bp.kose.n, boy: bp.kose.L, segs: [{ L: bp.kose.L, a: 45 }], grup: 'W' + w.wi + 'B' + hi + 'k', ad: `${ad} köşe 45°` });
        // ---- detay çizimi (açılım görünüşü, 1/25): x = boşluk ekseninden perde boyunca, y = kot ----
        const D = D0.yeniCizim(Kf), { mm, PL, L, TX, POZ, BASLIK } = D, X = v => v * fb, Zc = z => (z - h.zc) * fb;
        const sW = h.w / 2 + Math.max(bp.lapH, 0.5) + 0.35, zLo = Math.max(zR, h.zc - bp.hh / 2 - bp.lapV - 0.35), zHi = Math.min(w.zt, h.zc + bp.hh / 2 + bp.lapV + 0.35), e0 = h.w / 2 + cP, ez = bp.hh / 2 + cP;
        // örnek paftadaki gibi: boşluk + içinde boşluk işareti, ölçü (cm) ve D.T.K (delik taban kotu); her kenarda bir temsili ilave çubuk
        // (boşluk + 2 bindirme boyunda, uzatılmış), köşelerde 45° çubuklar; çubuk üstünde poz dairesi ve "kenar*yüz*adet ØF L=" yazısı
        const hh0 = bp.hh, x0 = -h.w / 2, x1 = h.w / 2, y0 = h.zc - hh0 / 2, y1 = h.zc + hh0 / 2, R4 = v => r2(v);
        if (h.daire) D.CI([0, 0], X(h.w / 2), 'STA_UYARI'); else PL([[X(x0), Zc(y0)], [X(x1), Zc(y0)], [X(x1), Zc(y1)], [X(x0), Zc(y1)]], true, 'STA_UYARI');
        if (h.daire) { const r = X(h.w / 2); D.CI([0, 0], r * 0.78, 'STA_SU'); D.CI([0, 0], r * 0.55, 'STA_SU'); L([-r * 0.55, 0], [r * 0.55, 0], 'STA_SU'); } // boru geçişi işareti
        else { const i = Math.min(h.w, hh0) * 0.08, ax = X(x0 + i), bx = X(x1 - i), ay2 = Zc(y1 - i), by = Zc(y0 + i); PL([[ax, ay2], [bx, ay2], [ax + (bx - ax) * 0.18, ay2 - (ay2 - by) * 0.18], [ax, by]], true, 'STA_KALIP'); } // yırtık (boşluk) işareti
        if (h.daire) { TX([X(h.w / 2) + mm(3), Zc(h.zc) + mm(1)], `Ø${cmi(h.w)} boru geçişi`, 2.8, 'L', 'STA_BASLIK'); TX([X(h.w / 2) + mm(3), Zc(h.zc) - mm(4)], `B.E.K ${(h.zc).toFixed(2)}`, 2.4, 'L', 'STA_OLCU'); }
        else { TX([X(0.08 * h.w), Zc(h.zc) + mm(1)], `${cmi(h.w)}*${cmi(hh0)}`, 2.8, 'C', 'STA_BASLIK'); TX([X(0.08 * h.w), Zc(h.zc) - mm(4)], `D.T.K ${(y0).toFixed(2)}`, 2.4, 'C', 'STA_OLCU'); }
        { const kk = konum(h, hi, w); if (kk.metin) TX([0, Zc(zLo) - mm(27)], `Boşluğun yeri (ortası): ${kk.metin} — kalıp planına bakınız`, 2.4, 'C', 'STA_BASLIK'); }
        const e1 = cP + 0.03, nF = yz.length >= 2 ? 2 : 1;
        // yatay ilaveler (alt / üst)
        for (const sg of [-1, 1]) { const z = h.zc + sg * (hh0 / 2 + e1); if (z < zR + 0.05 || z > zu) continue; L([X(-h.w / 2 - bp.lapH), Zc(z)], [X(h.w / 2 + bp.lapH), Zc(z)], 'STA_DONATI'); }
        // düşey ilaveler (iki yan)
        const iv0 = Math.max(zR + 0.05, h.zc - hh0 / 2 - bp.lapV), iv1 = Math.min(zu, h.zc + hh0 / 2 + bp.lapV);
        for (const sg of [-1, 1]) L([X(sg * (h.w / 2 + e1)), Zc(iv0)], [X(sg * (h.w / 2 + e1)), Zc(iv1)], 'STA_DONATI');
        // köşe 45°
        const kc = []; if (bp.kose) { const of = cP + 0.07, h2 = bp.kose.L / 2 / Math.SQRT2; for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const rr = h.daire ? (h.w / 2 + of) / Math.SQRT2 : null, qs = h.daire ? sx * rr : sx * (h.w / 2 + of), qz = h.daire ? h.zc + sz * rr : h.zc + sz * (hh0 / 2 + of); if (qz - h2 < zR + 0.05 || qz + h2 > zu) continue; const A2 = [X(qs + h2 * sz), Zc(qz - h2 * sx)], B2 = [X(qs - h2 * sz), Zc(qz + h2 * sx)]; L(A2, B2, 'STA_DONATI'); kc.push([A2, B2, sx, sz]); } }
        // etiketler
        const nY = Math.round(pz.iY.adet / (2 * nF)), nV = Math.round(pz.iV.adet / (2 * nF)), ayni = pz.iY.F === pz.iV.F && Math.abs(pz.iY.boy - pz.iV.boy) < 0.01;
        { const z = h.zc + hh0 / 2 + e1, q = [X(-h.w / 2 - bp.lapH * 0.55), Zc(z)]; POZ([q[0] - mm(1), q[1] + mm(4.5)], String(pz.iY.no)); TX([q[0] + mm(4), q[1] + mm(2.5)], ayni ? `4*${nF}*${nY}Ø${pz.iY.F} L=${cmi(pz.iY.boy)}` : `2*${nF}*${nY}Ø${pz.iY.F} L=${cmi(pz.iY.boy)}`, 2.6, 'L', 'STA_POZ'); POZ([X(h.w / 2 + bp.lapH * 0.6), Zc(h.zc - hh0 / 2 - e1) - mm(4.5)], String(pz.iY.no)); }
        { const x = X(h.w / 2 + e1); POZ([x + mm(4.5), Zc(h.zc + hh0 / 2 + bp.lapV * 0.55)], String(pz.iV.no)); POZ([X(-h.w / 2 - e1) - mm(4.5), Zc(h.zc - hh0 / 2 - bp.lapV * 0.45)], String(pz.iV.no)); if (!ayni) TX([x + mm(2), Zc(h.zc - hh0 / 2 - bp.lapV * 0.2)], `2*${nF}*${nV}Ø${pz.iV.F} L=${cmi(pz.iV.boy)}`, 2.6, 'L', 'STA_POZ', 90); }
        if (pz.k && kc.length) { const [A2, B2, sx, sz] = kc[kc.length - 1], m = [(A2[0] + B2[0]) / 2, (A2[1] + B2[1]) / 2], rot = Math.atan2(B2[1] - A2[1], B2[0] - A2[0]) * 180 / Math.PI, rr = ((rot + 90) % 180 + 180) % 180 - 90;
          TX([m[0] + mm(1.5), m[1] + mm(1.5)], `4*${nF}*1Ø12 L=${cmi(pz.k.boy)}`, 2.6, 'C', 'STA_POZ', rr); kc.forEach(([a2, b2]) => POZ([a2[0] + (b2[0] - a2[0]) * 0.8, a2[1] + (b2[1] - a2[1]) * 0.8], String(pz.k.no))); void sx; void sz; }
        // gönye (U firkete) notu — kesilen çubuklar
        TX([0, Zc(Math.max(zR + 0.05, h.zc - hh0 / 2 - bp.lapV)) - mm(6)], `Boşlukta kesilen çubuk uçları U firketeyle kapatılır: ${pz.uY ? `${pz.uY.no} (${pz.uY.adet}Ø${pz.uY.F} L=${cmi(pz.uY.boy)})` : ''}${pz.uU ? `, ${pz.uU.no} (${pz.uU.adet}Ø${pz.uU.F} L=${cmi(pz.uU.boy)})` : ''}`, 2.0, 'C', 'STA_YAZI');
        void sW; void zHi; void e0; void ez; void R4;
        BASLIK([0, Zc(zLo) - mm(12)], `${ad} BOŞLUK DONATI DETAYI — perde görünüşü (açılım)`, `Ö: 1/${olB}`);
        // ---- U firkete plan detayı (perde kalınlığı) ----
        const ux = X(sW) + mm(28), uy = Zc(zHi) - mm(10), sk = Math.min(8, 30 * Kf / Math.max(w.t, 0.2)) * 1, T = w.t * sk, bac = bp.uY.bac * sk * 0.6, icS = bp.ic * sk;
        D.REC(ux, uy - T, ux + bac + mm(14), uy, 'STA_KALIP'); L([ux + mm(14), uy], [ux + mm(14), uy - T], 'STA_KALIP'); TX([ux + mm(7), uy - T / 2], 'BOŞLUK', 1.8, 'C', 'STA_YAZI', 90);
        const yA = uy - (T - icS) / 2, yB = yA - icS, xs = ux + mm(14) + cP * sk;
        PL([[xs + bac, yA], [xs, yA], [xs, yB], [xs + bac, yB]], false, 'STA_DONATI_KESIT');
        D.DM([xs, yB], [xs, yA], 'v', -6, cmi(bp.ic)); D.DM([xs, yA], [xs + bac, yA], 'h', 4, cmi(bp.uY.bac)); D.DM([ux + bac + mm(14), uy - T], [ux + bac + mm(14), uy], 'v', 4, cmi(w.t));
        TX([ux + mm(14) + mm(1), uy - T - mm(4)], `paspayı ${cmi(cP)} cm`, 1.8, 'L');
        TX([ux, uy + mm(4)], 'U FİRKETE (GÖNYE) — PLANDA', 2.4, 'L', 'STA_BASLIK');
        // ---- imalat sırası (demirci için) ----
        const ad2 = q => (q ? `poz ${q.no}` : ''); let ny = uy - T - mm(14);
        [ 'İMALAT SIRASI:',
          `1) Boşluk yerini kalıpta işaretle: ${h.daire ? 'çap ' + cmi(h.w) : cmi(h.w) + ' × ' + cmi(bp.hh)} cm, alt kot ${kotS(h.zc - bp.hh / 2)}.`,
          `    Yeri: ${konum(h, hi, w).metin || '—'} (boşluk ortası, perde ekseninde) — kalıp planında "${ad}" ile işaretli.`,
          `2) Boşluktan geçen perde çubuklarını boşluk kenarından ${cmi(cP)} cm geride kes.`,
          `3) Kesilen her çubuk ucuna U firkete (${ad2(pz.uY)}${pz.uU ? ', ' + ad2(pz.uU) : ''}) tak: sırtı boşluğa bakar,`,
          '    bacaklar iki yüzdeki çubukların üstüne yatar ve tel ile bağlanır.',
          `4) Boşluğun iki yanına 2'şer düşey (${ad2(pz.iV)}), altına ve üstüne 2'şer yatay (${ad2(pz.iY)}) ilave koy — iki yüzde de.`,
          ...(pz.k ? [`5) Dört köşeye 45° çubuk (${ad2(pz.k)}) koy — iki yüzde de.`, '6) Kalıbı kapatmadan önce paspayı takozlarını kontrol et.'] : ['5) Kalıbı kapatmadan önce paspayı takozlarını kontrol et.'])
        ].forEach((t, i) => { TX([ux, ny], t, i ? 2.0 : 2.4, 'L', i ? 'STA_YAZI' : 'STA_BASLIK'); ny -= mm(4.2); });
        B.push({ pafta: 3, spec: D.out, kutu: D.kutu() }); }); }
    // metraj tablosunu yeniden kur (çiroz dahil)
    { const i = B.map((b, k) => [b, k]).filter(([b]) => b.pafta === 3 && b.kg != null).map(([, k]) => k).pop(); if (i != null) { const T = D0.yeniCizim(Kf), r = D0.tablo(T, 0, 0, 'PERDE DONATI METRAJI', perdePoz.map(p => Object.assign({}, p))); B[i] = { pafta: 3, spec: T.out, kutu: T.kutu(), kg: r.top }; } }
    // ---- planda yaylı perdelerde ışınsal çiroz çizgileri ----
    { const plan = B.find(b => b.pafta === 3); if (plan) for (const cz of cirozlar) { const w = cz.w; for (const p of w.parca) if (p.tip === 'yay') { const n = Math.max(2, Math.floor(Math.abs(p.aci || 0) * p.R / cz.ax)), a0 = Math.atan2(p.pts[0][1] - p.c[1], p.pts[0][0] - p.c[0]);
          for (let k = 1; k < n; k++) { const a = a0 + (p.aci || 0) * k / n, u = [Math.cos(a), Math.sin(a)], r0 = p.R - cz.ic / 2, r1 = p.R + cz.ic / 2; plan.spec.push({ k: 'L', a: [p.c[0] + u[0] * r0, p.c[1] + u[1] * r0], b: [p.c[0] + u[0] * r1, p.c[1] + u[1] * r1], ly: 'STA_DONATI' }); } } } }
    // ---- YATAY DONATI AÇILIMI (perde başına) — örnek paftadaki gibi: 12 m'lik çubuklar perde ortasından simetrik,
    //      her parça numaralı (poz), Ø/s, L, eğri ise R; bindirmeler ölçülü; boşluklar temsili; iç / dış yüz aralığı çizimde açılmıştır ----
    const wGr = new Map(); for (const w of W) { if (!wGr.has(w.wi)) wGr.set(w.wi, []); wGr.get(w.wi).push(w); }
    for (const ws of wGr.values()) { const D = D0.yeniCizim(Kf), { mm, PL, TX, POZ, BASLIK, L } = D; let say = 0;
     for (const w of ws) { const yz = yuzler(K, w, IC, cP).filter(q => q.sH && w._yatay && w._yatay[q.yuz]); if (!yz.length) continue;
      // perde adı ve sınırı (parçalı perdede)
      if (ws.length > 1) { const ax = yol(w.pts, false), m = ax.at(ax.L / 2), a0 = ax.at(0), nn = [-a0.t[1], a0.t[0]]; L([a0.p[0] - nn[0] * mm(18), a0.p[1] - nn[1] * mm(18)], [a0.p[0] + nn[0] * mm(18), a0.p[1] + nn[1] * mm(18)], 'STA_AKS'); D.CI(m.p, mm(4.5), 'STA_BASLIK'); TX([m.p[0], m.p[1] - mm(1.3)], w.ad, 2.6, 'C', 'STA_BASLIK'); }
      for (const f of yz) { const YD = w._yatay[f.yuz], GG = YD.G; if (GG && GG.ilk !== w.ad) continue; /* parçalı perde: çubuklar ana perde boyunca bir kez çizilir */
        const kap = GG ? GG.kap : w.kapali, bar = GG ? GG.bar : Y().ofset(w.pts, YD.dOf, w.kapali), ya = yol(bar, kap), F = YD.F, lap = P.bindirme(F), pr = YD.duz, ac = f.isaret * mm(12);
        pr.forEach((pc, j) => { const kay = ac + f.isaret * (j % 2) * mm(1.8), seg = ya.parca(pc.a, pc.b), off = Y().ofset(seg, kay, false); PL(off, false, 'STA_DONATI'); say++;
          const kanca = (s2, k) => { const m = ya.at(s2), n = [-m.t[1] * f.isaret, m.t[0] * f.isaret], q = k ? off[off.length - 1] : off[0]; L(q, [q[0] - n[0] * mm(3), q[1] - n[1] * mm(3)], 'STA_DONATI'); };
          if (pc.kS) kanca(pc.a, 0); if (pc.kB) kanca(pc.b, 1);
          const m = ya.at((pc.a + pc.b) / 2), nn = [-m.t[1] * f.isaret, m.t[0] * f.isaret], g = Math.abs(kay) + mm(5), q = [m.p[0] + nn[0] * g, m.p[1] + nn[1] * g], rot = Math.atan2(m.t[1], m.t[0]) * DEG, rr = ((rot + 90) % 180 + 180) % 180 - 90;
          POZ(q, String(pc.no || '')); TX([q[0] + nn[0] * mm(3.5) + m.t[0] * mm(3), q[1] + nn[1] * mm(3.5) + m.t[1] * mm(3)], `${YD.n}Ø${F}/${cmi(YD.s)} L=${cmi(pc.boy)}${pc.R ? ' R=' + cmi(pc.R) : ''}`, 1.9, 'L', 'STA_POZ', rr); });
        // bindirmeler (ardışık parçaların örtüştüğü bölge) ölçülü
        const n = pr.length; for (let j = 0; j < (kap ? n : n - 1); j++) { const A = pr[j], Bq = pr[(j + 1) % n], b1 = A.b, a2 = Bq.a + (j + 1 >= n ? ya.L : 0); const ov = b1 - a2; if (ov < 0.05) continue;
          const m1 = ya.at(a2), m2 = ya.at(b1), nn = [-m1.t[1] * f.isaret, m1.t[0] * f.isaret], o = Math.abs(ac) + mm(7), p1 = [m1.p[0] + nn[0] * o, m1.p[1] + nn[1] * o], p2 = [m2.p[0] + nn[0] * o, m2.p[1] + nn[1] * o];
          L(p1, p2, 'STA_OLCU'); L([p1[0] - nn[0] * mm(1.5), p1[1] - nn[1] * mm(1.5)], [p1[0] + nn[0] * mm(1.5), p1[1] + nn[1] * mm(1.5)], 'STA_OLCU'); L([p2[0] - nn[0] * mm(1.5), p2[1] - nn[1] * mm(1.5)], [p2[0] + nn[0] * mm(1.5), p2[1] + nn[1] * mm(1.5)], 'STA_OLCU');
          TX([(p1[0] + p2[0]) / 2 + nn[0] * mm(1.5), (p1[1] + p2[1]) / 2 + nn[1] * mm(1.5)], cmi(ov), 1.8, 'C', 'STA_OLCU'); }
        // perde boşlukları temsili (çubuk bu bölgede kesilir; ayrıntı boşluk detayında)
        (GG ? ws : [w]).forEach(wq => (wq.delik || []).forEach((h, hi) => { if (!(h.w > 0.02)) return; const c = DN(h.c); let sb = 0, db = 1e9; for (let k = 0; k <= Math.ceil(ya.L / 0.05); k++) { const mq = ya.at(k * 0.05), d = Math.hypot(mq.p[0] - c[0], mq.p[1] - c[1]); if (d < db) { db = d; sb = k * 0.05; } }
          const sg2 = ya.parca(sb - h.w / 2, sb + h.w / 2), A2 = Y().ofset(sg2, ac - f.isaret * mm(2.5), false), B2 = Y().ofset(sg2, ac + f.isaret * mm(4.5), false);
          PL(A2.concat(B2.slice().reverse()), true, 'STA_UYARI'); const mq = ya.at(sb), nn = [-mq.t[1] * f.isaret, mq.t[0] * f.isaret]; TX([mq.p[0] + nn[0] * (Math.abs(ac) - mm(6)), mq.p[1] + nn[1] * (Math.abs(ac) - mm(6))], `${wq.ad} B${hi + 1}`, 1.9, 'C', 'STA_UYARI'); }));
        // yüz adı
        { const m = ya.at(pr.length ? pr[0].a + 0.5 : 0), nn = [-m.t[1] * f.isaret, m.t[0] * f.isaret], o = Math.abs(ac) + mm(16); TX([m.p[0] + nn[0] * o, m.p[1] + nn[1] * o], f.yuz.toLocaleUpperCase('tr') + ' YÜZ', 2.4, 'L', 'STA_BASLIK'); } }
     }
      if (!say) continue;
      const pts = ws.flatMap(q => q.pts), w = ws[0], xm = (Math.min(...pts.map(q => q[0])) + Math.max(...pts.map(q => q[0]))) / 2, y0 = Math.min(...pts.map(q => q[1]));
      TX([xm, y0 - mm(40)], 'Yatay çubuklar 12 m\'liktir; en uzun düz perdenin ortasından başlar, perde birleşimlerinde kesilmeden sürer, eklerde Ø\'ya göre bindirme yapılır; yalnız kapatan çubuk kalan boydadır. İç / dış yüz arası çizimde açılmıştır (ölçü alınmaz).', 2.0, 'C');
      BASLIK([xm, y0 - mm(30)], `${ws.map(q => q.ad).join(', ')} PERDELERİ YATAY DONATI AÇILIMI (iç / dış${ws.some(q => q.parca.some(x => x.tip === 'yay')) ? ', eğri çubuklar' : ''})`, `Ö: 1/${OL}`);
      B.push({ pafta: 3, spec: D.out, kutu: D.kutu() }); }
    // ---- DÜŞEY DONATI AÇILIMI + ÇİROZ DETAYI (perde grubu başına) ----
    const grp = new Map(); for (const w of W) { const k = w.tip + '|' + Math.round(w.t * 1000); if (!grp.has(k)) grp.set(k, []); grp.get(k).push(w); }
    const olD = Math.min(OL, 25), fk = OL / olD;
    for (const ws of grp.values()) { const w = ws[0], yz = yuzler(K, w, IC, cP), D = D0.yeniCizim(Kf), { mm, PL, TX, POZ, BASLIK } = D; let x = 0;
      const zt = Math.max(...ws.map(q => q.zt)), Lv = r2((zt - cP) - (rad.kAlt + cR)), legV = 0.30, legT = 0.30, Z = z => (z - rad.kAlt) * fk;
      for (const f of yz) { if (!f.sV) continue; const F = f.sV.F, dp = Y().dusParca(rad.kAlt + cR, zR, zt, cP, F, legV, legT), pr = dp.parca, grup = 'W' + w.wi + f.yuz + 'V';
        TX([x, Z(zt) + mm(14)], `${f.yuz.toLocaleUpperCase('tr')}${/yüz/i.test(f.yuz) ? '' : ' YÜZ'}`, 2.4, 'L', 'STA_BASLIK');
        pr.forEach((pc, j) => { const z0 = pc.z0, z1 = pc.z1, pts = [];
          if (pc.legA) pts.push([x + pc.legA * fk, Z(z0)]); pts.push([x, Z(z0)], [x, Z(z1)]); if (pc.legB) pts.push([x + pc.legB * fk, Z(z1)]); PL(pts, false, 'STA_DONATI', F, fk);
          const pz = perdePoz.find(p => p.grup === grup && Math.abs(p.boy - pc.boy) < 0.02) || perdePoz.find(p => p.grup === grup);
          TX([x - mm(2), (Z(z0) + Z(z1)) / 2], cmi(pc.L), 2.0, 'C', 'STA_OLCU', 90); TX([x + mm(4), (Z(z0) + Z(z1)) / 2], `${pz ? pz.adet : ''}Ø${F}/${cmi(f.sV.s)} L=${cmi(pc.boy)}`, 2.0, 'C', 'STA_POZ', 90); TX([x + mm(7.5), (Z(z0) + Z(z1)) / 2], pc.ad, 1.9, 'C', 'STA_YAZI', 90);
          if (pc.legA) TX([x + pc.legA * fk / 2, Z(z0) - mm(3.5)], cmi(pc.legA), 2.0, 'C', 'STA_OLCU'); if (pc.legB) TX([x + pc.legB * fk / 2, Z(z1) + mm(1.5)], cmi(pc.legB), 2.0, 'C', 'STA_OLCU');
          if (pz) POZ([x, Z(z0) - mm(8)], String(pz.no)); if (j < pr.length - 1) D.DM([x, Z(pr[j + 1].z0)], [x, Z(z1)], 'v', -6, cmi(P.bindirme(F))); /* bindirme: kıvrım kaybı ihmal, yönetmelik değeri */
          x += mm(16); });
        if (dp.derz != null) TX([x - mm(14), Z(dp.derz) + mm(1)], `derz ${kotS(dp.derz)}`, 1.9, 'L', 'STA_SU');
        x += mm(10); }
      // çiroz detayı
      const cz = cirozlar.find(q => ws.includes(q.w));
      if (cz) { const s = 1 / Kf * 0.004 * 0 + 5 * Kf * 1000 / 1000 * 0 + 1, k = Math.min(8, 60 * Kf / Math.max(cz.ic, 0.1)) * s, x0 = x + mm(6), y0 = Z(zt) - mm(10), hk = cz.hk * k, ic = cz.ic * k, h45 = hk / Math.SQRT2;
        PL([[x0 + h45, y0 - h45], [x0, y0], [x0 + ic, y0], [x0 + ic - h45, y0 - h45]], false, 'STA_DONATI');
        D.CI([x0, y0 + mm(1.2)], mm(1.2), 'STA_DONATI'); D.CI([x0 + ic, y0 + mm(1.2)], mm(1.2), 'STA_DONATI');
        TX([x0 + ic / 2, y0 + mm(4)], cmi(cz.ic), 2.0, 'C', 'STA_OLCU'); TX([x0 - mm(1), y0 - h45 - mm(3)], cmi(cz.hk), 2.0, 'L', 'STA_OLCU');
        if (cz.p) POZ([x0 + ic / 2, y0 - mm(12)], String(cz.p.no));
        TX([x0 + ic / 2 + mm(5), y0 - mm(13)], `Ø${CF} L=${cmi(cz.boy)}  ${cmi(cz.ax)}×${cmi(cz.az)} şaşırtmalı`, 2.0, 'L', 'STA_POZ');
        TX([x0, y0 - mm(19)], 'Çiroz iki yüzün yatay ve düşey çubuklarının kesiştiği noktaları', 1.8, 'L');
        TX([x0, y0 - mm(22.5)], 'sarar; uçlar 135° kancalı (10Ø).', 1.8, 'L');
        BASLIK([x0 + ic / 2, y0 + mm(14)], 'ÇİROZ DETAYI', 'Ö: ölçeksiz'); }
      TX([mm(30), -mm(18)], `${ws.map(q => q.ad).join(', ')} DÜŞEY DONATI AÇILIMI`, 2.4, 'C', 'STA_BASLIK');
      // açılımı ilgili perde kesitinin hemen yanına koy (örnek paftadaki gibi: kesit + yanında çıkarılmış çubuklar)
      const ki = B.findIndex(b => b.pafta === 3 && b.spec.some(e => e.k === 'T' && /PERDE KESİTİ/.test(e.s) && ws.some(q => e.s.includes(q.ad))));
      if (ki >= 0) { const kb = B[ki], my = D.kutu(), dx = kb.kutu[2] - my[0] + mm(14), T = D0.yeniCizim(Kf); T.out.push(...kb.spec, ...D0.kaydir(D.out, dx, 0)); B[ki] = Object.assign({}, kb, { spec: T.out, kutu: T.kutu() }); }
      else B.push({ pafta: 3, spec: D.out, kutu: D.kutu() }); }
    { const D = acilimBlok(D0, Kf, 'PERDE DONATILARI AÇILIMI (bükme listesi)', perdePoz); B.push({ pafta: 3, spec: D.out, kutu: D.kutu() }); }
    // ---- TEMEL: radye çubukları planın yanına çıkarılmış (açılım) ----
    { const pi = B.findIndex(b => b.pafta === 2 && b.kg == null), TP = res.temelPoz || []; if (pi >= 0 && TP.length) { const D = D0.yeniCizim(Kf), { mm, PL, TX, POZ } = D, kb = B[pi].kutu, H = kb[3] - kb[1], adim = mm(11);
        const sat = Math.max(4, Math.floor((H - mm(10)) / adim)); let col = 0, row = 0, x0 = kb[2] + mm(20), colW = mm(105); const Lmax = Math.max(...TP.map(p => p.boy));
        TX([x0, kb[3] + mm(4)], 'RADYE DONATISI AÇILIMI', 2.6, 'L', 'STA_BASLIK');
        for (const p of TP) { const y = kb[3] - mm(8) - row * adim; let pts = [[0, 0]], dir = 0, q = [0, 0];
          for (const sg of (p.segs || [{ L: p.boy, a: 0 }])) { const ang = (sg.a || 0) / DEG; const d = [Math.cos(dir + ang), Math.sin(dir + ang)]; q = [q[0] + d[0] * sg.L, q[1] + d[1] * sg.L]; pts.push(q); }
          // ana parça yatay: ilk segment kancaysa yönü yine yatay kalsın diye kancaları ana parçaya göre çiz
          const segs = p.segs || [{ L: p.boy, a: 0 }], ana = segs.reduce((m, sg) => (Math.abs(sg.a || 0) < 1 && sg.L > m.L ? sg : m), { L: 0 }), Lw = ana.L || p.boy;
          const iA = segs.indexOf(ana), sol = segs.slice(0, Math.max(0, iA)), sag = segs.slice(iA + 1); pts = [];
          const x = x0 + col * colW, kanca = (arr, ters) => arr.reduce((h, sg) => h + (Math.abs(sg.a || 0) > 1 ? Math.sin(Math.abs(sg.a) / DEG) * sg.L * Math.sign(sg.a) : 0), 0) * (ters ? 1 : 1);
          const hA = Math.sign(kanca(sol)) * mm(3), hB = Math.sign(kanca(sag)) * mm(3), Ld = mm(18) + mm(42) * Lw / Lmax; if (hA) pts.push([x, y + hA]); pts.push([x, y], [x + Ld, y]); if (hB) pts.push([x + Ld, y + hB]); // ölçeksiz şema: boy yazıyla
          if (p.grup === 'sehpa') { const h = mm(5); pts = [[x, y], [x + mm(3), y + h], [x + mm(9), y + h], [x + mm(12), y]]; }
          PL(pts, false, 'STA_DONATI'); POZ([x - mm(4), y + mm(1)], String(p.no)); TX([x + mm(2), y + mm(1.5)], `${p.adet}Ø${p.F}${p.s && p.s < 1 ? '/' + cmi(p.s) : ''} L=${cmi(p.boy)}  ${p.ad || ''}`, 1.9, 'L', 'STA_POZ');
          row++; if (row >= sat) { row = 0; col++; } }
        const T = D0.yeniCizim(Kf); T.out.push(...B[pi].spec, ...D.out); B[pi] = Object.assign({}, B[pi], { spec: T.out, kutu: T.kutu() }); } }
  };

  /* ---- DONATI AÇILIMLARI: numaralanan her pozun şekli, ölçüleri (cm), çap, adet ve boyu — demirci bükme listesi gibi ---- */
  const acilimBlok = (D0, Kf, baslik, pozlar) => {
    const D = D0.yeniCizim(Kf), { mm, PL, TX, POZ, BASLIK } = D, cw = mm(82), ch = mm(19), sat = 20; let i = 0;
    for (const p of pozlar.slice().sort((a, b) => a.no - b.no)) {
      const col = Math.floor(i / sat), row = i % sat, x0 = col * cw + mm(10), y0 = -row * ch; i++;
      const segs = p.segs && p.segs.length ? p.segs : [{ L: p.boy, a: 0 }], im = segs.reduce((b, q, k) => ((Math.abs(q.a || 0) < 1 && q.L > (segs[b].L || 0)) || Math.abs(segs[b].a || 0) >= 1 ? (Math.abs(q.a || 0) < 1 ? k : b) : b), 0), ana = segs[im];
      const top = segs.reduce((t, q) => t + q.L, 0), sc = Math.min(mm(48) / Math.max(ana.L, 0.2), mm(48) / Math.max(top, 0.2) * 1.6), Lm = Math.max(mm(14), ana.L * sc), bacak = q => Math.max(mm(3), Math.min(mm(10), q.L * sc));
      POZ([x0 - mm(5), y0 + mm(2)], String(p.no));
      if (segs.length === 1 && Math.abs(ana.a || 0) === 45) { PL([[x0, y0 - mm(3)], [x0 + mm(9), y0 + mm(6)]], false, 'STA_DONATI'); TX([x0 + mm(11), y0 + mm(1)], `45° ${cmi(ana.L)}`, 2.0, 'L', 'STA_OLCU'); }
      else if (ana.R) { // eğri çubuk: düz + yay + düz (gerçek oranla, hücreye sığdırılmış), R yazılı
        const yy = ana.yay || { L1: 0, La: ana.L, L2: 0 }, th = yy.La / ana.R, pts = [[0, 0]]; let x = 0, y = 0, d = 0;
        if (yy.L1 > 0) { x += yy.L1; pts.push([x, y]); } const cx = x, cy = y + ana.R; for (let k = 1; k <= 24; k++) { const a = -Math.PI / 2 + th * k / 24; pts.push([cx + ana.R * Math.cos(a), cy + ana.R * Math.sin(a)]); } d = th; x = pts[pts.length - 1][0]; y = pts[pts.length - 1][1];
        if (yy.L2 > 0) pts.push([x + Math.cos(d) * yy.L2, y + Math.sin(d) * yy.L2]);
        const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), W0 = Math.max(...xs) - Math.min(...xs) || 1, H0 = Math.max(...ys) - Math.min(...ys) || 1, k2 = Math.min(mm(46) / W0, mm(13) / H0), mnx = Math.min(...xs), mny = Math.min(...ys);
        PL(pts.map(q => [x0 + (q[0] - mnx) * k2, y0 - mm(5) + (q[1] - mny) * k2]), false, 'STA_DONATI');
        TX([x0 + mm(23), y0 - mm(8)], `${yy.L1 ? cmi(yy.L1) + ' düz + ' : ''}${cmi(yy.La)} yay R=${cmi(ana.R)}${yy.L2 ? ' + ' + cmi(yy.L2) + ' düz' : ''}`, 1.8, 'C', 'STA_OLCU'); }
      else { const pts = [], pre = segs.slice(0, im), post = segs.slice(im + 1);
        pre.reverse().forEach(q => { const f = Math.abs(q.a) === 135 ? Math.PI / 4 : Math.PI / 2, sg = q.a < 0 ? -1 : 1, l = bacak(q); pts.unshift([x0 + Math.cos(f) * l, y0 + sg * Math.sin(f) * l]); TX([x0 - mm(1), y0 + sg * l / 2], cmi(q.L), 1.8, 'R', 'STA_OLCU'); });
        pts.push([x0, y0], [x0 + Lm, y0]);
        post.forEach(q => { const f = Math.abs(q.a) === 135 ? Math.PI / 4 : Math.PI / 2, sg = q.a < 0 ? -1 : 1, l = bacak(q); pts.push([x0 + Lm - Math.cos(f) * l, y0 + sg * Math.sin(f) * l]); TX([x0 + Lm + mm(1), y0 + sg * l / 2], cmi(q.L), 1.8, 'L', 'STA_OLCU'); });
        PL(pts, false, 'STA_DONATI'); TX([x0 + Lm / 2, y0 + (segs.some(q => q.a < 0) ? mm(1.2) : -mm(3.4))], cmi(ana.L), 2.0, 'C', 'STA_OLCU'); }
      TX([x0 + mm(54), y0 + mm(2.2)], `${p.adet} ad. Ø${p.F}`, 2.1, 'L', 'STA_POZ'); TX([x0 + mm(54), y0 - mm(1.6)], `L=${cmi(p.boy)} cm`, 2.1, 'L', 'STA_POZ'); TX([x0 + mm(54), y0 - mm(5)], (p.ad || '').replace(/^\S+ /, '').slice(0, 30), 1.6, 'L', 'STA_YAZI');
    }
    BASLIK([mm(80), -sat * ch - mm(6) + Math.max(0, sat - i) * ch * 0], baslik, 'ölçeksiz — ölçüler cm');
    return D; };
  /* ---- DONATI PERSPEKTİFİ: yarısı kesilmiş yapı (içi görünsün) + bir perde parçasının yakın detayı ---- */
  const yariKes = (pts, f) => { const out = []; let cur = []; for (let i = 0; i < pts.length; i++) { const q = pts[i], v = f(q); if (i) { const a = pts[i - 1], va = f(a); if ((va <= 0) !== (v <= 0)) { const t = va / (va - v), m = a.map((x, k) => x + (q[k] - x) * t); if (va <= 0) { cur.push(m); out.push(cur); cur = []; } else cur = [m]; } } if (v <= 0) cur.push(q); } if (cur.length > 1) out.push(cur); return out.filter(b => b.length > 1); };
  const perspektifEkle = (res, K, S) => {
    const per = P._perspektif, D0 = P._dsi, G = P._kabukSon; if (!per || !D0 || !G) return;
    const gr = P.kabukDonati3B(K, S, { perdePoz: res.perdePoz, temelPoz: res.temelPoz }); if (!gr.length) return;
    const M = S.kabuk, rad = M.radye, zR = rad.kAlt + rad.t, { ofset } = Y(), kap = q => q.concat([q[0]]);
    const bet = [kap(rad.pts).map(q => [q[0], q[1], rad.kAlt]), kap(rad.pts).map(q => [q[0], q[1], zR])];
    for (const w of M.walls) for (const o of [w.t / 2, -w.t / 2]) { const L = ofset(w.pts, o, w.kapali), Q = w.kapali ? kap(L) : L; bet.push(Q.map(q => [q[0], q[1], zR]), Q.map(q => [q[0], q[1], w.zt])); if (!w.kapali) for (const q of [L[0], L[L.length - 1]]) bet.push([[q[0], q[1], zR], [q[0], q[1], w.zt]]); }
    const xs = rad.pts.map(q => q[0]), ys = rad.pts.map(q => q[1]), ym = (Math.min(...ys) + Math.max(...ys)) / 2, Kf = G.Kf, yaw = -35, pitch = 30;
    // 1) yarı kesit: ön yarı (bakan tarafa yakın, y < orta) kaldırılır → arka yarı ve içi görünür
    const f1 = q => ym - q[1];
    const og1 = gr.map(o => ({ bars: o.bars.flatMap(b => yariKes(b, f1)), F: o.F, kay: false })).filter(o => o.bars.length), bet1 = bet.flatMap(b => yariKes(b, f1));
    const D1 = per(D0.yeniCizim, Kf, 'YAPI DONATI PERSPEKTİFİ (ön yarı kaldırılmış)', og1, bet1, yaw, pitch, 520, 330, '', {}); if (D1) res.B.push({ pafta: 4, spec: D1.out, kutu: D1.kutu() });
    // 2) yakın detay: en uzun dış perdenin yay (yoksa orta) bölgesinde 3 m'lik parça + altındaki radye şeridi
    const w = M.walls.slice().sort((a, b) => (b.tip === 'dis') - (a.tip === 'dis') || Y().plen(b.pts, b.kapali) - Y().plen(a.pts, a.kapali))[0]; if (!w) return;
    const pr = Y().parcala(w.pts, w.kapali), yy = pr.find(p => p.tip === 'yay'), m = yy ? yy.pts[Math.floor(yy.pts.length / 2)] : w.pts[Math.floor(w.pts.length / 2)], R0 = 1.6;
    const ic = q => Math.hypot(q[0] - m[0], q[1] - m[1]) - R0; // daire içinde kalan kısım
    const og2 = gr.map(o => ({ bars: o.bars.flatMap(b => { const d = []; for (let i = 0; i < b.length; i++) { d.push(b[i]); if (i < b.length - 1) { const a = b[i], c2 = b[i + 1], L = Math.hypot(c2[0] - a[0], c2[1] - a[1]), n = Math.ceil(L / 0.1); for (let k = 1; k < n; k++) d.push(a.map((x, j) => x + (c2[j] - x) * k / n)); } } return yariKes(d, ic); }), F: o.F, kay: /düşey/.test(o.tanim || '') })).filter(o => o.bars.length);
    const bet2 = bet.flatMap(b => { const d = []; for (let i = 0; i < b.length; i++) { d.push(b[i]); if (i < b.length - 1) { const a = b[i], c2 = b[i + 1], L = Math.hypot(c2[0] - a[0], c2[1] - a[1]), n = Math.ceil(L / 0.1); for (let k = 1; k < n; k++) d.push(a.map((x, j) => x + (c2[j] - x) * k / n)); } } return yariKes(d, ic); });
    const D2 = per(D0.yeniCizim, Kf, `${w.ad} PERDESİ DONATI PERSPEKTİFİ (${yy ? 'yay bölgesi' : 'perde ortası'}, 3 m'lik parça)`, og2, bet2, yaw, pitch, 300, 330, 'düşey çubuklar (bindirmeler okunsun diye yana kaydırılmıştır)', {}); if (D2) res.B.push({ pafta: 4, spec: D2.out, kutu: D2.kutu() });
  };

  /* ================= MODELE 3B DONATI ================= */
  P.kabukDonati3B = (K, S, pozlar) => {
    const M = S.kabuk, c = S.mal, cP = c.cP, cR = c.cR, rad = M.radye, zR = rad.kAlt + rad.t, IC = (K.YT && K.YT.IC) || rad.pts, out = [], { ofset, parcala, secR, kesisim } = Y();
    let son = pozlar || null; if (!son) try { son = P.kabukBloklar(K, S, 50, true); } catch (er) { console.warn(er); } const PP = son ? son.perdePoz : [], TP = son ? son.temelPoz : [];
    const noBul = (L, g) => { const p = L.find(q => q.grup === g); return p ? p.no : ''; };
    M.walls.forEach((w0, wi) => { const g0 = out.length; const adP = ((P._kabukSon && P._kabukSon.W) || []).filter(x => x.wi === wi).map(x => x.ad).join('-') || w0.ad; const w = Object.assign({}, w0, { wi, ad: adP, parca: parcala(w0.pts, w0.kapali), sol: ofset(w0.pts, w0.t / 2, w0.kapali) }), yz = yuzler(K, w, IC, cP), zb = rad.kAlt + cR, zu = w.zt - cP;
      for (const f of yz) { const bar = ofset(w.pts, f.dOf, w.kapali), ya = yol(bar, w.kapali);
        if (f.sH) { const g = { poz: noBul(PP, 'W' + wi + f.yuz + 'H'), F: f.sH.F, s: f.sH.s, eleman: w.ad + ' perde', tanim: `${w.ad} ${f.yuz} yatay Ø${f.sH.F}/${cmi(f.sH.s)}`, mutlak: true, bars: [] };
          for (let z = zR + 0.05; z <= zu + 1e-6; z += f.sH.s) { const k = Math.max(0, Math.min(1, (z - zR) / Math.max(0.1, w.zt - zR))), b2 = f.dOfT !== f.dOf ? ofset(w.pts, f.dOf + (f.dOfT - f.dOf) * k, w.kapali) : bar, pts = (w.kapali ? b2.concat([b2[0]]) : b2).map(q => [r3(q[0]), r3(q[1]), r3(z)]); g.bars.push(pts); } out.push(g); }
        if (f.sV) { const g = { poz: noBul(PP, 'W' + wi + f.yuz + 'V'), F: f.sV.F, s: f.sV.s, eleman: w.ad + ' perde', tanim: `${w.ad} ${f.yuz} düşey Ø${f.sV.F}/${cmi(f.sV.s)}`, mutlak: true, bars: [] }, ust = Math.min(0.3, w.t - 2 * cP);
          const n = Math.floor(ya.L / f.sV.s) + (w.kapali ? 0 : 1);
          for (let k = 0; k < n; k++) { const m = ya.at(Math.min(ya.L, k * f.sV.s + (w.kapali ? 0 : 0))), nl = [-m.t[1] * f.isaret, m.t[0] * f.isaret], p = m.p;
            const nL = [-m.t[1], m.t[0]], PZ = z => { const dd = (f.dOfT - f.dOf) * ((Math.max(z, zR) - zR) / Math.max(0.1, w.zt - zR)); return [p[0] + nL[0] * dd, p[1] + nL[1] * dd]; }, DPc = Y().dusParca(zb, zR, w.zt, cP, f.sV.F, 0.3, ust);
            DPc.parca.forEach((pc, j) => { const kay = (j % 2) * 0.012, Q = z => { const q = PZ(z); return [r3(q[0] - nl[0] * kay), r3(q[1] - nl[1] * kay), r3(z)]; }, pts = []; if (pc.legA) { const q = PZ(pc.z0); pts.push([r3(q[0] + nl[0] * pc.legA), r3(q[1] + nl[1] * pc.legA), r3(pc.z0)]); } pts.push(Q(pc.z0)); if (pc.z0 < zR && pc.z1 > zR) pts.push(Q(zR)); pts.push(Q(pc.z1)); if (pc.legB) { const q = PZ(pc.z1); pts.push([r3(q[0] - nl[0] * pc.legB), r3(q[1] - nl[1] * pc.legB), r3(pc.z1)]); } g.bars.push(pts); }); }
          out.push(g); } }
      // çiroz
      if (yz.length >= 2) { const sh = Math.max(...yz.map(q => q.sH ? q.sH.s : 0.2)), sv = Math.max(...yz.map(q => q.sV ? q.sV.s : 0.2)), ax = Math.min(0.5, 2 * sv), az = Math.min(0.5, 2 * sh), ya = yol(w.pts, w.kapali), h = (w.t - 2 * cP) / 2, g = { poz: noBul(PP, 'W' + wi + 'C'), F: CF, s: ax, eleman: w.ad + ' perde', tanim: `${w.ad} çiroz Ø${CF} ${cmi(ax)}×${cmi(az)}`, mutlak: true, bars: [] };
        let r = 0; for (let z = zR + 0.05; z <= zu - 0.05; z += az, r++) for (let s = (r % 2) * ax / 2; s <= ya.L - (w.kapali ? ax / 2 : 0) + 1e-6; s += ax) { const m = ya.at(s), nl = [-m.t[1], m.t[0]], k = Math.max(0, Math.min(1, (z - zR) / Math.max(0.1, w.zt - zR))), oA = yz[0].dOf + (yz[0].dOfT - yz[0].dOf) * k, oB = yz[1].dOf + (yz[1].dOfT - yz[1].dOf) * k; void h; g.bars.push([[r3(m.p[0] + nl[0] * oA), r3(m.p[1] + nl[1] * oA), r3(z)], [r3(m.p[0] + nl[0] * oB), r3(m.p[1] + nl[1] * oB), r3(z)]]); }
        if (g.bars.length) out.push(g); }
      // ---- perde boşlukları: geçen çubukları kes, çevresine ilave çubuk koy ----
      const HL = (w0.delik || []).filter(h => h.w > 0.02 && h.h > 0.02);
      if (HL.length) {
        const mar = cP, ic = (q) => HL.some(h => { const dx = q[0] - h.c[0], dy = q[1] - h.c[1], sA = dx * h.u[0] + dy * h.u[1], oA = dx * h.u[1] - dy * h.u[0], dz = q[2] - h.zc;
          if (Math.abs(oA) > Math.max(h.d, w0.t) / 2 + 0.3) return false; return h.daire ? Math.hypot(sA, dz) <= h.w / 2 + mar : Math.abs(sA) <= h.w / 2 + mar && Math.abs(dz) <= h.h / 2 + mar; });
        const kes = br => { const runs = []; let cur = [];
          const bitir = () => { if (cur.length > 1) { let L = 0; for (let i = 1; i < cur.length; i++) L += Math.hypot(cur[i][0] - cur[i - 1][0], cur[i][1] - cur[i - 1][1], cur[i][2] - cur[i - 1][2]); if (L > 0.12) runs.push(cur); } cur = []; };
          for (let i = 0; i < br.length; i++) { const a = br[i]; if (i === 0) { if (!ic(a)) cur.push(a); continue; } const b0 = br[i - 1], L = Math.hypot(a[0] - b0[0], a[1] - b0[1], a[2] - b0[2]), n = Math.max(1, Math.ceil(L / 0.04));
            let any = false; const sm = []; for (let k = 1; k <= n; k++) { const t = k / n, q = [b0[0] + (a[0] - b0[0]) * t, b0[1] + (a[1] - b0[1]) * t, b0[2] + (a[2] - b0[2]) * t], inn = ic(q); sm.push([q, inn]); if (inn) any = true; }
            if (!any && !ic(b0)) { cur.push(a); continue; }
            for (const [q, inn] of sm) { if (inn) bitir(); else cur.push(q.map(r3)); } }
          bitir(); return runs; };
        for (let gi = g0; gi < out.length; gi++) out[gi].bars = out[gi].bars.flatMap(kes);
        // ilave: her boşluk, her yüz: iki yanda 2'şer düşey, alt / üstte 2'şer yatay (yüz eğrisini izler)
        for (const f of yz) { const s0 = f.sV || f.sH, F = s0.F, lap = P.bindirme ? P.bindirme(F) : 0.6, bar = ofset(w.pts, f.dOf, w.kapali), ya = yol(bar, w.kapali), g = { poz: '', F, s: 0.1, eleman: w.ad + ' perde', tanim: `${w.ad} ${f.yuz} boşluk ilave Ø${F}`, mutlak: true, bars: [] };
          for (const h of HL) { // boşluk merkezinin bu yüz çubuğu üzerindeki konumu
            let sb = 0, db = 1e9; for (let k = 0; k <= Math.ceil(ya.L / 0.05); k++) { const m = ya.at(k * 0.05), d = Math.hypot(m.p[0] - h.c[0], m.p[1] - h.c[1]); if (d < db) { db = d; sb = k * 0.05; } }
            const zA = Math.max(zR + 0.05, h.zc - h.h / 2 - lap), zB = Math.min(zu, h.zc + h.h / 2 + lap);
            for (const sg of [-1, 1]) for (let k = 0; k < 2; k++) { const m = ya.at(sb + sg * (h.w / 2 + cP + 0.03 + k * 0.06)); if (zB - zA > 0.2) g.bars.push([[r3(m.p[0]), r3(m.p[1]), r3(zA)], [r3(m.p[0]), r3(m.p[1]), r3(zB)]]); }
            for (const sg of [-1, 1]) for (let k = 0; k < 2; k++) { const z = h.zc + sg * (h.h / 2 + cP + 0.03 + k * 0.06); if (z < zR + 0.05 || z > zu) continue; const pts = ya.parca(sb - h.w / 2 - lap, sb + h.w / 2 + lap); g.bars.push(pts.map(q => [r3(q[0]), r3(q[1]), r3(z)])); } }
          if (g.bars.length) out.push(g); }
        // U firkete (gönye) ve köşe 45° çubukları — perde ekseni boyunca konum
        const ax = yol(w.pts, w.kapali);
        for (const h of HL) { const bp = bosPlan(w0, h, yz, cP, zR, zu); if (!bp) continue;
          let sb = 0, db = 1e9; for (let k = 0; k <= Math.ceil(ax.L / 0.05); k++) { const m = ax.at(k * 0.05), d = Math.hypot(m.p[0] - h.c[0], m.p[1] - h.c[1]); if (d < db) { db = d; sb = k * 0.05; } }
          const o = bp.ic / 2, Q = (s2, z, sg) => { const m = ax.at(s2), nl = [-m.t[1], m.t[0]]; return [r3(m.p[0] + nl[0] * o * sg), r3(m.p[1] + nl[1] * o * sg), r3(z)]; };
          const gU = { poz: '', F: bp.uY.F, s: bp.sH.s, eleman: w.ad + ' perde', tanim: `${w.ad} boşluk U firkete (gönye) Ø${bp.uY.F}`, mutlak: true, bars: [] };
          for (const sg of [-1, 1]) { const se = sb + sg * (h.w / 2 + cP); for (let k = 0; k < bp.nYan; k++) { const z = bp.z0 + k * bp.sH.s; gU.bars.push([Q(se + sg * bp.uY.bac, z, 1), Q(se, z, 1), Q(se, z, -1), Q(se + sg * bp.uY.bac, z, -1)]); } }
          for (const sg of [-1, 1]) { const ze = h.zc + sg * (bp.hh / 2 + cP); if (ze < zR + 0.1 || ze > zu - 0.05) continue; for (let k = 0; k < bp.nUst; k++) { const s2 = sb - h.w / 2 - cP + k * bp.sV.s; gU.bars.push([Q(s2, ze + sg * bp.uU.bac, 1), Q(s2, ze, 1), Q(s2, ze, -1), Q(s2, ze + sg * bp.uU.bac, -1)]); } }
          if (gU.bars.length) out.push(gU);
          if (bp.kose) { const gK = { poz: '', F: 12, s: 1, eleman: w.ad + ' perde', tanim: `${w.ad} boşluk köşe 45° Ø12`, mutlak: true, bars: [] }, of = cP + 0.07, h2 = bp.kose.L / 2 / Math.SQRT2;
            for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const rr = h.daire ? (h.w / 2 + of) / Math.SQRT2 : 0, qs = sb + sx * (h.daire ? rr : h.w / 2 + of), qz = h.zc + sz * (h.daire ? rr : bp.hh / 2 + of); if (qz - h2 < zR + 0.05 || qz + h2 > zu) continue;
              for (const sg of (yz.length >= 2 ? [1, -1] : [1])) { const pts = []; for (let k = 0; k <= 8; k++) { const t = -1 + k / 4; pts.push(Q(qs - t * h2 * sz, qz + t * h2 * sx, sg * 0.85)); } gK.bars.push(pts); } }
            if (gK.bars.length) out.push(gK); } } }
    });
    // radye: M11 → X, M22 → Y (global), alt / üst
    const RP = rad.pts, xs = RP.map(q => q[0]), ys = RP.map(q => q[1]); const SK = Y().sektorler(M.walls, RP);
    for (const [yon, yuz, eks] of [['M11', 'alt', 'y'], ['M11', 'üst', 'y'], ['M22', 'alt', 'x'], ['M22', 'üst', 'x']]) { const s = secR(K, yon, yuz); if (!s) continue;
      const z = yuz === 'alt' ? rad.kAlt + cR + (eks === 'x' ? s.F / 1000 : 0) : zR - cR - (eks === 'x' ? s.F / 1000 : 0), lo = (eks === 'y' ? Math.min(...ys) : Math.min(...xs)) + cR, hi = (eks === 'y' ? Math.max(...ys) : Math.max(...xs)) - cR, leg = Math.max(0.05, rad.t - 2 * cR), dl = yuz === 'alt' ? leg : -leg;
      const g = { poz: noBul(TP, 'R' + yon + yuz), F: s.F, s: s.s, eleman: 'Radye', tanim: `Radye ${yuz} ${eks === 'y' ? 'X' : 'Y'} Ø${s.F}/${cmi(s.s)}`, mutlak: true, bars: [] };
      for (let v = lo; v <= hi + 1e-6; v += s.s) for (const q of Y().ortoAralik(RP, SK, eks, v, cR, P.bindirme(s.F))) { const a = q.a, b = q.b; const P2 = (u, zz) => eks === 'y' ? [r3(u), r3(v), r3(zz)] : [r3(v), r3(u), r3(zz)]; g.bars.push([...(q.kA ? [P2(a, z + dl)] : []), P2(a, z), P2(b, z), ...(q.kB ? [P2(b, z + dl)] : [])]); }
      if (g.bars.length) out.push(g); }
    // yay bölgeleri: halka + ışınsal (paftayla aynı kural)
    SK.forEach((sk, si) => { const Rk = sk.Rout - cR, A = sk.aci, P2 = (r, a, zz) => [r3(sk.c[0] + Math.cos(a) * r), r3(sk.c[1] + Math.sin(a) * r), r3(zz)], leg = Math.max(0.05, rad.t - 2 * cR);
      for (const yuz of ['alt', 'üst']) { const sH = secR(K, 'M11', yuz) || secR(K, 'M22', yuz), sV = secR(K, 'M22', yuz) || sH; if (!sH) continue; const lap = P.bindirme(sH.F), z = yuz === 'alt' ? rad.kAlt + cR + sH.F / 1000 : zR - cR - sH.F / 1000, zv = yuz === 'alt' ? rad.kAlt + cR : zR - cR, dl = yuz === 'alt' ? leg : -leg;
        const gH = { poz: noBul(TP, 'RS' + yuz + 'H'), F: sH.F, s: sH.s, eleman: 'Radye', tanim: `Radye ${yuz} halka Ø${sH.F}/${cmi(sH.s)}`, mutlak: true, bars: [] }, gR = { poz: noBul(TP, 'RS' + yuz + 'R'), F: sV.F, s: sV.s, eleman: 'Radye', tanim: `Radye ${yuz} ışınsal Ø${sV.F}`, mutlak: true, bars: [] };
        for (let r = Rk; r >= Math.max(0.3, sH.s) - 1e-6; r -= sH.s) { const da = lap / r, pts = []; const n = Math.max(8, Math.ceil(Math.abs(A) * r / 0.2)); for (let k = 0; k <= n; k++) pts.push(P2(r, sk.a0 - Math.sign(A) * da + (A + 2 * Math.sign(A) * da) * k / n, z)); gH.bars.push(pts); }
        const nR = Math.ceil(Math.abs(A) * Rk / sV.s) + 1; for (let k = 0; k < nR; k++) { const a = sk.a0 + A * k / (nR - 1), r0 = k % 2 === 0 ? 0.3 : Rk / 2; gR.bars.push([P2(r0, a, zv), P2(Rk, a, zv), P2(Rk, a, zv + dl)]); }
        out.push(gH, gR); } });
    // döşemeler: alt / üst, X / Y ağ (paftayla aynı kural: uçlar perde içinde gönyeli)
    { const cD = c.cD || 0.025, twM = Math.max(...M.walls.map(w => w.t)), e = Math.max(0.05, twM / 2 - cP);
      /* çubuk uçları: döşeme kenarındaki perdenin DIŞ yüzünden paspayı kadar içeride (döşeme poligonu perde ekseni de, yüzü de olabilir) */
      const WL = M.walls.map(w => w.kapali ? [ofset(w.pts, w.t / 2, true), ofset(w.pts, -w.t / 2, true)] : [ofset(w.pts, w.t / 2, false).concat(ofset(w.pts, -w.t / 2, false).reverse())]).flat();
      const uclar = (eks, v, a0, b0) => { const iv = kesisim(WL, eks, v); let a = a0, b = b0; for (const [p, q] of iv) { if (p <= a0 + 0.05 && q >= a0 - twM - 0.05) a = Math.min(a, p); if (q >= b0 - 0.05 && p <= b0 + twM + 0.05) b = Math.max(b, q); } return [a + cP, b - cP]; }; void e; let DPz = []; try { DPz = (son && son.dosemePoz) || []; } catch (er) { }
      (M.dosemeler || []).forEach((d, k) => { const t = K.tasarim.find(x => x.grup.tur === 'doseme' && x.eleman === `${d.ad || 'D' + (k + 1)} döşeme`) || K.tasarim.filter(x => x.grup.tur === 'doseme')[k]; if (!t) return;
        const xs = d.pts.map(q => q[0]), ys = d.pts.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), leg = Math.max(0.1, d.t - 2 * cD), dAd = d.ad || 'D' + (k + 1);
        for (const [yon, yuz, eks] of [['M11', 'alt', 'y'], ['M11', 'üst', 'y'], ['M22', 'alt', 'x'], ['M22', 'üst', 'x']]) { const q = t.katman.find(z => z.yon.startsWith(yon) && z.yuz === yuz), s0 = q && q.sec && q.sec.F ? q.sec : null; if (!s0) continue;
          const F = s0.F / 1000, z = yuz === 'alt' ? d.zt - d.t + cD + F / 2 + (eks === 'x' ? F : 0) : d.zt - cD - F / 2 - (eks === 'x' ? F : 0), dl = yuz === 'alt' ? leg : -leg;
          const g = { poz: (DPz.find(p => p.grup === 'D' + k + yon + yuz) || {}).no || '', F: s0.F, s: s0.s, eleman: dAd + ' döşeme', tanim: `${dAd} ${yuz} ${eks === 'y' ? 'X' : 'Y'} Ø${s0.F}/${cmi(s0.s)}`, mutlak: true, bars: [] };
          const lo = (eks === 'y' ? y0 : x0) + cD + 0.03, hi = (eks === 'y' ? y1 : x1) - cD - 0.03;
          for (let v = lo; v <= hi + 1e-6; v += s0.s) for (const [a0, b0] of kesisim([d.pts], eks, v)) { const [a, b] = uclar(eks, v, a0, b0), P2 = (u, zz) => eks === 'y' ? [r3(u), r3(v), r3(zz)] : [r3(v), r3(u), r3(zz)]; g.bars.push([P2(a, z + dl), P2(a, z), P2(b, z), P2(b, z + dl)]); }
          if (g.bars.length) out.push(g); } }); }
    // kolon / kiriş (çerçeve hesabı)
    try { if (typeof RC !== 'undefined' && RC && RC.donati) out.push(...RC.donati); } catch (er) { }
    return out;
  };

  /* ================= DÜĞME: Donatıyı modele yerleştir (kabuk) ================= */
  if (typeof document !== 'undefined' && $('#bDon3')) {
    const kabukMu = () => typeof S !== 'undefined' && S && S.mod === 'kabuk' && S.kabuk && window._KR;
    const h0 = window.hepsi; if (h0) window.hepsi = function () { const r = h0.apply(this, arguments); try { if (kabukMu()) { const b = $('#bDon3'); if (b) b.disabled = false; } } catch (er) { } return r; };
    const bD = $('#bDon3'), d0 = bD.onclick;
    bD.onclick = function () {
      if (!kabukMu()) return d0 && d0.apply(this, arguments);
      let gr; try { gr = P.kabukDonati3B(window._KR, S); } catch (er) { console.error(er); $('#pMsg').innerHTML = `<div class="msg">3B donatı üretilemedi: ${er.message}</div>`; return; }
      if (!gr.length) { $('#pMsg').innerHTML = '<div class="msg">Aktarılacak donatı yok (kesitler yetersiz olabilir — önce Hesapla / Kalınlık öner).</div>'; return; }
      const payload = { t: Date.now(), koken: null, kAlt: null, Lx: null, Ly: null, gruplar: gr };
      try { localStorage.setItem('aritmacad.statik.donati', JSON.stringify(payload)); } catch (e) { alert('Donatı verisi aktarılamadı: ' + e.message); return; }
      let direkt = false; try { if (window.opener && window.opener.C && window.opener.C.cmd) { window.opener.C.cmd.run('STATIKDONATI'); window.opener.focus(); direkt = true; } } catch (e) { }
      const nb = gr.reduce((s, o) => s + o.bars.length, 0);
      $('#pMsg').innerHTML = `<div class="msg info">3B kabuk: ${gr.length} poz grubu, ${nb} çubuk (perde, çiroz, radye, döşeme${typeof RC !== 'undefined' && RC ? ', kolon ve kiriş' : ''}) modele gönderildi. ArıtmaCAD'de 3B görünümde <b>Disiplin: Statik</b> seçin${direkt ? '' : '; gelmezse komut satırına <b>STATIKDONATI</b> yazın'}.</div>`;
    };
  }
})();

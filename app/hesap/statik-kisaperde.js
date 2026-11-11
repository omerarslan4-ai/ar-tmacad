/* ArıtmaCAD Statik — KISA (BÖLME OLUŞTURMAYAN) İÇ PERDELER (ayrı modül)
   Modelden: S.geo.kisaPerde = [{ ad, yon:'X'|'Y', v, a, b, t, uA, uB:'bagli'|'serbest', tA, tB, z0, zt, su }]
   • Hesap: her kısa perde ayrı plak (sonlu eleman): taban radyeye ankastre; bağlı uç ankastre, serbest uç serbest;
     üstü döşeme altındaysa mesnetli, değilse serbest. Yük: su (tek taraf dolu – güvenli; ya da iki taraf eşit) + deprem su itkisi.
     İki yüz eşit donatı (iç = dış), çatlak kontrolü iki yüzde.
   • Detay: düşey (filiz / gövde / üst parçalar, H kuralı), yatay (bağlı uçta bağlandığı perdeye kancalı, serbest uçta karşı yüze gönyeli – firkete),
     çiroz; perde paftası, metraj, 3B donatı, perspektifler. */
(function () {
  'use strict';
  const P = window.STATIK; if (!P) return;
  const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000, gw = 9.81, AG = F => 0.006165 * F * F;
  const gonye = (t, c1, c2) => Math.max(0.05, Math.round((t - c1 - (c2 == null ? c1 : c2)) * 100) / 100);
  const adim = (a, b, s) => { if (b <= a) return [(a + b) / 2]; const n = Math.max(1, Math.round((b - a) / s)), r = []; for (let i = 0; i <= n; i++) r.push(a + (b - a) * i / n); return r; };

  /* model kaydı → perde nesnesi (aks konvansiyonu: bağlı uçta bağlandığı perdenin aksı) */
  const duvar = (S, kp) => {
    const a = kp.a - (kp.uA === 'bagli' ? kp.tA / 2 : 0), b = kp.b + (kp.uB === 'bagli' ? kp.tB / 2 : 0), X = kp.yon === 'X';
    return { ad: 'kısa perde', tip: 'kisa', kisa: kp, t: kp.t, p0: X ? [a, kp.v] : [kp.v, a], e: X ? [1, 0] : [0, 1], n: X ? [0, 1] : [1, 0], L: b - a, sup: [0, b - a], uA: kp.uA, uB: kp.uB, tA: kp.uA === 'bagli' ? kp.tA : 0, tB: kp.uB === 'bagli' ? kp.tB : 0, zU: kp.zt != null ? (kp.aski ? kp.zt : Math.min(kp.zt, S.geo.kUst)) : S.geo.kUst, no: kp.ad, ...(kp.aski ? { zB: kp.z0, tD: kp.tD || 0.2 } : {}) };
  };
  const dosemeAltinda = (S, w) => (S.geo.doseme || []).some(d => { const m = [w.p0[0] + w.e[0] * w.L / 2, w.p0[1] + w.e[1] * w.L / 2]; return m[0] > d.x0 && m[0] < d.x1 && m[1] > d.y0 && m[1] < d.y1 && Math.abs(w.zU - S.geo.kUst) < 0.1; });

  /* ---- hesap ---- */
  const h0 = P.hesapla;
  P.hesapla = function (S) {
    const R = h0.apply(this, arguments), K = (S.geo && S.geo.kisaPerde) || [];
    R.kisa = [];
    if (!K.length || S.suYapisi === false) return R;
    { // numarasız kısa perdeler ('Kısa perde X=3.65') → sıradaki perde numarası (P7, P8 …): pafta, metraj ve kalıp planında aynı ad
      const kul = new Set((R.GM.walls || []).map((w, i) => w.no || ((/^(\S+) (— |\(ara perde\))/.exec(w.ad || '') || [])[1]) || `P${i + 1}`)); K.forEach(kp => { if (/^P\d+$/.test(kp.ad || '')) kul.add(kp.ad); });
      let nx = 1; K.forEach(kp => { if (/^P\d+$/.test(kp.ad || '')) return; while (kul.has('P' + nx)) nx++; kp.adEski = kp.adEski || kp.ad; kp.ad = 'P' + nx; kul.add(kp.ad); });
    }
    const MAL = R.MAL, GM = R.GM, YK = R.YK, g = S.geo, E = MAL.Ec * 1000, h = S.tas.mesh || 0.25;
    K.forEach((kp, i) => {
      const w = duvar(S, kp), zr0 = kp.aski ? kp.z0 : GM.zr, Lc = kp.b - kp.a, Hm = w.zU - zr0, ust = dosemeAltinda(S, w) ? 'M' : 'S', su = kp.su || 'tek';
      const xs = P.gridLines([0, Lc], Math.min(h, Lc / 6)), ys = P.gridLines([0, Hm, g.kSu - zr0].filter(v => v > 0 && v < Hm + 1e-9).concat([0, Hm]), Math.min(h, Hm / 8));
      const bc = { B: 'A', T: ust, L: kp.uA === 'bagli' ? 'A' : 'S', R: kp.uB === 'bagli' ? 'A' : 'S' };
      const pl = P.Plate({ xs, ys, t: kp.t, E, nu: 0.2, bc }), n = pl.nx * pl.ny;
      const res = su === 'tek' ? { Hs: pl.solve({ p: (x, y) => YK.fn.Hs(zr0 + y) }), EHs: pl.solve({ p: (x, y) => YK.fn.EHs(zr0 + y) }) } : {};
      const Z = { tsm: { x: 0, y: 0 }, emn: { x: 0, y: 0 } };
      for (const cb of S.komb || []) for (const ty of ['tsm', 'emn']) {
        const f = cb[ty] || {}; if (!res.Hs) continue;
        for (let j = 0; j < n; j++) { let Mx = 0, My = 0, Mxy = 0; for (const c of ['Hs', 'EHs']) if (f[c] && res[c]) { Mx += f[c] * res[c].Mx[j]; My += f[c] * res[c].My[j]; Mxy += f[c] * res[c].Mxy[j]; } const a = Math.abs(Mxy); Z[ty].x = Math.max(Z[ty].x, Math.abs(Mx) + a); Z[ty].y = Math.max(Z[ty].y, Math.abs(My) + a); }
      }
      // kesme: taban tepkisi ≈ üçgen su yükü (güvenli yaklaşım)
      const hw = Math.max(0, g.kSu - (kp.aski ? kp.z0 : g.kAlt + g.hr)), Vd = su === 'tek' ? 1.6 * 0.5 * gw * hw * hw : 0;
      const c = S.mal.cP, katman = [];
      for (const [yon, M, Ms, kat] of [['Düşey', Z.tsm.y, Z.emn.y, 1], ['Yatay', Z.tsm.x, Z.emn.x, 2]]) {
        const sec = P.donatiSec({ M, Ms, h: kp.t, c, kat, su: true }, S, MAL);
        katman.push({ yon, yuz: 'Yüz 1', M, Ms, kat, suYuz: true, sec }, { yon, yuz: 'Yüz 2', M, Ms, kat, suYuz: true, sec: Object.assign({}, sec) });
      }
      const dmin = Math.min(...katman.map(k => k.sec.d || kp.t - c)), eleman = `Kısa perde ${kp.ad} (t=${r2(kp.t * 100)} cm, L=${r2(Lc)} m, ${kp.uA === 'bagli' ? 'bağlı' : 'serbest'}/${kp.uB === 'bagli' ? 'bağlı' : 'serbest'} uç, üst ${ust === 'M' ? 'döşemeye mesnetli' : 'serbest'}${su === 'tek' ? ', tek taraf su' : ', iki taraf eşit su'})`;
      const T = { eleman, h: kp.t, c, katman, kesme: P.kesme(Vd, dmin, MAL), kisa: i };
      R.tasarim.push(T); R.kisa.push({ w, kp, bc, Z, T, Lc });
    });
    R.ok = R.ok && R.tasarim.every(t => t.katman.every(k => k.sec.ok) && t.kesme.ok);
    return R;
  };

  /* ---- detay: perde paftası pozları ---- */
  const d0 = P.detayDsi;
  if (d0) P.detayDsi = function (R) {
    const DT = d0.apply(this, arguments); if (!R.kisa || !R.kisa.length) return DT;
    const S = R.S, g = S.geo, c = S.mal, zR = g.kAlt + g.hr;
    R.kisa.forEach(({ w, kp, T }, k) => {
      const dK = T.katman.find(q => q.yon === 'Düşey').sec, yK = T.katman.find(q => q.yon === 'Yatay').sec, liste = [];
      const zR = kp.aski ? kp.z0 : g.kAlt + g.hr, Hp = w.zU - zR, zT = w.zU - c.cP, zb = kp.aski ? kp.z0 - (kp.tD || 0.2) + (c.cD || 0.025) + 0.02 : g.kAlt + c.cR + 0.03, cP = c.cP, t = kp.t, gP = gonye(t, cP), FIL = kp.aski ? 'döşeme filizi' : 'temel filizi';
      if (dK && dK.F) { // düşey (iki yüz)
        const xa = kp.a + cP, xb = kp.b - cP, n = Math.floor((xb - xa) / dK.s) + 1, fl = kp.aski ? gonye(kp.tD || 0.2, c.cD || 0.025) : gonye(g.hr, c.cR), lap = P.bindirme(dK.F), zj = Hp >= 6 ? zR + Math.round(Hp / 2 * 20) / 20 : null;
        const par = Hp <= 2 ? [{ ad: 'tek parça (filizsiz, gönyeli)', za: zb, zu: zT, alt: fl, ustK: gP }] : Hp < 6 ? [{ ad: FIL, za: zb, zu: zR + lap, alt: fl, ustK: 0 }, { ad: 'gövde', za: zR, zu: zT, alt: 0, ustK: gP }]
          : [{ ad: FIL, za: zb, zu: zR + lap, alt: fl, ustK: 0 }, { ad: 'orta (derz üstüne bindirmeli)', za: zR, zu: zj + lap, alt: 0, ustK: 0 }, { ad: 'üst (döşemeye kadar)', za: zj, zu: zT, alt: 0, ustK: gP }];
        par.forEach(pc => { const Lv = pc.zu - pc.za; liste.push({ F: dK.F, s: dK.s, adet: 2 * n, nYuz: n, kat: 2, boy: r2(pc.alt + Lv + pc.ustK), segs: [...(pc.alt ? [{ L: pc.alt, a: 0 }] : []), { L: r2(Lv), a: 90 }, ...(pc.ustK ? [{ L: pc.ustK, a: 0 }] : [])], ad: 'Düşey', yon: 'düşey', parca: pc.ad, yuzA: 'iç-dış', za: pc.za - g.kAlt, zu: pc.zu - g.kAlt, fl: pc.alt, ustK: pc.ustK, lap, Lv: r2(Lv) }); });
        if (zj) liste.derz = zj - g.kAlt;
      }
      if (yK && yK.F) { // yatay (iki yüz): bağlı uç → bağlandığı perdenin uzak yüzüne kadar + kanca; serbest uç → karşı yüze gönye (firkete)
        const Fv = dK ? dK.F / 1000 : 0.016, n = Math.floor((Hp - cP - 0.05) / yK.s) + 1;
        const ua = kp.uA === 'bagli' ? kp.a - kp.tA + cP + Fv : kp.a + cP, ub = kp.uB === 'bagli' ? kp.b + kp.tB - cP - Fv : kp.b - cP;
        const hA = kp.uA === 'bagli' ? gonye(kp.tA, cP) : gP, hB = kp.uB === 'bagli' ? gonye(kp.tB, cP) : gP, Ls = r2(ub - ua);
        liste.push({ F: yK.F, s: yK.s, adet: 2 * n, nYuz: n, kat: 2, boy: r2(Ls + hA + hB), segs: [{ L: hA, a: 90 }, { L: Ls, a: 0 }, { L: hB, a: 90 }], ad: 'Yatay', yon: 'yatay', yuzA: 'iç-dış', kanca: Math.max(hA, hB), ua: ua - w.p0[0] * w.e[0] - w.p0[1] * w.e[1], ub: ub - w.p0[0] * w.e[0] - w.p0[1] * w.e[1], hA, hB });
      }
      { const ca = (P.pasAyar ? P.pasAyar(S).cirozAra : 0) || 0.5, cF = (P.pasAyar ? P.pasAyar(S).cirozF : 12) || 12, Lc = r2(t - 2 * cP); liste.push({ F: cF, s: ca, adet: Math.max(1, Math.ceil((kp.b - kp.a) * Hp / (ca * ca))), boy: r2(Lc + 0.2), segs: [{ L: 0.1, a: 45 }, { L: Lc, a: 0 }, { L: 0.1, a: -90 }], ad: 'Çiroz', ciroz: true, Lc, kanca: 0.1 }); }
      liste.forEach((p, j) => { p.no = j + 1; p.top = r2(p.boy * p.adet); p.kg = p.top * AG(p.F); });
      DT.perdeler.push({ w, i: 1000 + k, no: kp.ad, poz: liste, Lo: kp.b - kp.a, Hp, derz: liste.derz || null, dsm: { Lc: 0, ln: 99, ar: [] }, kisa: true });
    });
    return DT;
  };

  /* ---- kalıp planlarında kısa perdeler (taralı) ---- */
  P.kalipEk = (D, R, o) => { (R.kisa || []).forEach(({ kp }) => { if (kp.aski && o && o.kot != null && o.kot < kp.z0 - 0.01) return; const X = kp.yon === 'X', h = kp.t / 2, r = X ? [kp.a, kp.v - h, kp.b, kp.v + h] : [kp.v - h, kp.a, kp.v + h, kp.b];
    D.REC(r[0], r[1], r[2], r[3], 'STA_KALIP'); D.TARA([r], [], 2.0); D.TX(X ? [(r[0] + r[2]) / 2, r[3] + D.mm(4)] : [r[2] + D.mm(4), (r[1] + r[3]) / 2], kp.ad, 2.6, 'C', 'STA_BASLIK', X ? 0 : 90);
    D.DM(X ? [r[0], r[3]] : [r[2], r[1]], X ? [r[2], r[3]] : [r[2], r[3]], X ? 'h' : 'v', 8, String(Math.round((kp.b - kp.a) * 100))); }); };

  /* ---- 3B donatı (genel perde döngüsü kısa perdeleri atlar) ---- */
  const b0 = P.donati3BDsi;
  if (b0) P.donati3BDsi = function (R) {
    const out = b0.apply(this, arguments); if (!R.kisa || !R.kisa.length) return out;
    const S = R.S, g = S.geo, c = S.mal, DT = P.detayDsi(R), zR = g.kAlt + g.hr, cP = c.cP, rb = F => (P.bukmeR ? P.bukmeR(F) : F / 1000 * 2.5), bk = (pts, F) => (P.bukumlu ? P.bukumlu(pts, rb(F), 3) : pts);
    for (const pd of DT.perdeler.filter(q => q.kisa)) {
      const w = pd.w, kp = w.kisa, t = w.t, ad = pd.no + ' perde', Pt = (s, o, z) => [w.p0[0] + w.e[0] * s + w.n[0] * o, w.p0[1] + w.e[1] * s + w.n[1] * o, z];
      const sA = kp.a - (w.p0[0] * w.e[0] + w.p0[1] * w.e[1]), sB = kp.b - (w.p0[0] * w.e[0] + w.p0[1] * w.e[1]), dus = pd.poz.filter(p => p.yon === 'düşey'), Fv = dus.length ? dus[0].F / 1000 : 0.016;
      for (const p of dus) { const o = { poz: p.no, F: p.F, s: p.s, eleman: ad, tanim: ['Düşey', p.parca, 'iç-dış'].join(' · '), bars: [] }, F = p.F / 1000, ilk = p.za < 0.3;
        for (const sg of [1, -1]) { const off = sg * (t / 2 - cP - F / 2);
          for (const s0 of adim(sA + cP + F / 2, sB - cP - F / 2, p.s)) { const s1 = s0 + (ilk ? 0 : F * 1.1), pts = []; if (p.fl) pts.push(Pt(s1, off - sg * p.fl, g.kAlt + p.za)); pts.push(Pt(s1, off, g.kAlt + p.za), Pt(s1, off, g.kAlt + p.zu)); if (p.ustK) pts.push(Pt(s1, off - sg * p.ustK, g.kAlt + p.zu)); o.bars.push(bk(pts, p.F)); } }
        out.push(o); }
      for (const p of pd.poz.filter(q => q.yon === 'yatay')) { const o = { poz: p.no, F: p.F, s: p.s, eleman: ad, tanim: 'Yatay · iç-dış', bars: [] }, F = p.F / 1000;
        for (const sg of [1, -1]) { const off = sg * (t / 2 - cP - Fv - F / 2);
          for (const z of adim((kp.aski ? kp.z0 : zR) + 0.05, w.zU - cP - 0.03, p.s)) { const pts = [];
            // bağlı uç: bağlandığı perdenin içinde, uzak yüzde perde boyunca kanca; serbest uç: karşı yüze gönye
            pts.push(kp.uA === 'bagli' ? Pt(p.ua, off + p.hA, z) : Pt(p.ua, off - sg * p.hA, z)); pts.push(Pt(p.ua, off, z), Pt(p.ub, off, z)); pts.push(kp.uB === 'bagli' ? Pt(p.ub, off + p.hB, z) : Pt(p.ub, off - sg * p.hB, z));
            o.bars.push(bk(pts, p.F)); } }
        out.push(o); }
    }
    return out;
  };

  /* ---- statik penceresi: kısa perde ayarları ---- */
  if (typeof document === 'undefined' || !document.getElementById || !document.getElementById('form')) return;
  const mu0 = window.modelUygula;
  if (typeof mu0 === 'function') window.modelUygula = function (d) { try { const es = (S.geo && S.geo.kisaPerde) || []; ((d && d.geo && d.geo.kisaPerde) || []).forEach(k => { const o = es.find(q => q.ad === k.ad); if (o && o.su) k.su = o.su; }); if (d && d.geo && !d.geo.kisaPerde) d.geo.kisaPerde = []; } catch (e) { } return mu0.apply(this, arguments); };
  const formEk = () => {
    const f = document.querySelector('#form'); if (!f || f.querySelector('#kisaAyar')) return; const K = (S.geo && S.geo.kisaPerde) || []; if (!K.length) return;
    f.insertAdjacentHTML('beforeend', `<details class="sec" id="kisaAyar" open><summary>Kısa iç perdeler (${K.length})</summary><div class="body">
      <p class="hint full">Bölme oluşturmayan iç perdeler ayrı eleman olarak hesaplanır: taban ankastre, bağlı uç ankastre, serbest uç serbest; döşeme altındaysa üstü mesnetli. Yük durumunu seçin.</p>
      ${K.map((k, i) => `<label class="f">${k.ad} — ${r2(k.b - k.a)} m, t=${r2(k.t * 100)} cm, ${k.uA === 'bagli' ? 'bağlı' : 'serbest'}/${k.uB === 'bagli' ? 'bağlı' : 'serbest'}<select data-kisa="${i}"><option value="tek"${(k.su || 'tek') === 'tek' ? ' selected' : ''}>Tek taraf su dolu, diğer taraf boş (güvenli)</option><option value="esit"${k.su === 'esit' ? ' selected' : ''}>İki tarafta eşit su (yalnız minimum donatı)</option></select></label>`).join('')}
    </div></details>`);
    f.querySelectorAll('[data-kisa]').forEach(el => el.onchange = () => { S.geo.kisaPerde[+el.dataset.kisa].su = el.value; changed(); });
  };
  setTimeout(formEk, 0); { const bf = window.buildForm; window.buildForm = buildForm = function () { const x = bf.apply(this, arguments); setTimeout(formEk, 0); return x; }; }
})();

/* ---- 12 m'yi aşan perdelerde yatay donatı bindirmeleri (görünüş) + kalıp planı eleman adları ---- */
(function () {
  'use strict';
  const P = window.STATIK; if (!P) return;
  const parcalar = (a, b, F, hA, hB) => P.parcala(b - a, F, hA || 0, hB || 0).map(q => [a + q[0], a + q[1]]);
  P.yatayParcalar = parcalar;
  P.perdeBindirme = (D, R, pd, x0, x1, H0, Ht) => {
    const { mm, TX, PL, L } = D, c = R.S.mal, cP = c.cP, cmi = v => String(Math.round(v * 100)), w = pd.w;
    const yat0 = pd.poz.filter(p => p.yon === 'yatay'), yat = yat0.filter((p, i) => yat0.findIndex(q => q.yuzA === p.yuzA && q.F === p.F && q.s === p.s) === i); if (!yat.length) return;
    const xa = x0 + cP, xb = x1 - cP; if (!yat.some(p => parcalar(xa, xb, p.F, p.kanca || 0.2, p.kanca || 0.2).length > 1)) return;
    const gor = new Set();
    yat.forEach((p, k) => { const y = H0 + (Ht - H0) * (0.62 - k * 0.32); // görünüşteki temsili çubuğun yeri: tam boy çizgiyi parçalı olanla değiştir
      for (let i = D.out.length - 1; i >= 0; i--) { const it = D.out[i]; if (it.k === 'P' && it.ly === 'STA_DONATI' && it.pts && it.pts.length === 4 && Math.abs(it.pts[1][1] - y) < 1e-6 && Math.abs(it.pts[1][0] - xa) < 1e-6 && Math.abs(it.pts[2][0] - xb) < 1e-6) D.out.splice(i, 1); }
      if (gor.has(p.F + '|' + p.yuzA + '|' + y)) return; gor.add(p.F + '|' + p.yuzA + '|' + y);
      const ls = P.bindirme(p.F), kan = p.kanca || 0.2, pr = parcalar(xa, xb, p.F, kan, kan);
      pr.forEach(([a, b], j) => { const dy = (j % 2) * mm(1.4); PL([...(j === 0 ? [[a, y + dy + kan]] : []), [a, y + dy], [b, y + dy], ...(j === pr.length - 1 ? [[b, y + dy + kan]] : [])], false, 'STA_DONATI', p.F); });
      for (let j = 0; j < pr.length - 1; j++) { const a = pr[j + 1][0], b = pr[j][1]; D.DM([a, y - mm(1)], [b, y - mm(1)], 'h', -5, cmi(ls)); }
      { const gr = yat0.filter(q => q.yuzA === p.yuzA && q.F === p.F && q.s === p.s); gr.forEach((q, i) => { if (!i) return; const j = i === gr.length - 1 ? pr.length - 1 : Math.min(i, pr.length - 1); D.POZ([pr[j][0] + Math.min(0.4 * (pr[j][1] - pr[j][0]), ls + mm(4)), y + (j % 2) * mm(1.4) + mm(3.4)], q.no); }); }
      TX([xb - mm(14), y - mm(6.5)], `Ø${p.F} yatay: ${pr.length} parça, bindirme ${cmi(ls)} cm (${pr.map(q => cmi(q[1] - q[0])).join(' + ')})${p.yuzA ? ' — ' + p.yuzA : ''}`, 2.0, 'R', 'STA_POZ');
    });
  };

  // kalıp planı: perde (var olan) + temel, döşeme, kolon, kiriş adları
  const e0 = P.kalipEk;
  P.kalipEk = function (D, R, o) {
    if (e0) e0.apply(this, arguments);
    o = o || {}; const S = R.S, g = S.geo, GM = R.GM, { mm, TX, L, REC, PL } = D, cmi = v => String(Math.round(v * 100)), Rb = GM.R;
    if (o.temel) { const p = [Rb.x0 + 0.3, Rb.y0], q = [Rb.x0 + 0.3 - mm(2), Rb.y0 - mm(16)]; L(p, q, 'STA_YAZI'); L(q, [q[0] - mm(30), q[1]], 'STA_YAZI'); TX([q[0] - mm(29), q[1] + mm(1)], `T1 RADYE TEMEL  h=${cmi(g.hr)}`, 2.6, 'L', 'STA_BASLIK'); }
    if (o.doseme && (g.doseme || []).length) { /* döşeme adları planda yazılı (D1 h=..) */ }
    const cer = S.cer, k0 = S.koken; if (!cer || !k0) return;
    const icinde = (x, y) => x > Rb.x0 - 0.5 && x < Rb.x1 + 0.5 && y > Rb.y0 - 0.5 && y < Rb.y1 + 0.5;
    (cer.kolonlar || []).forEach((k, i) => { const x = k.x - k0[0], y = k.y - k0[1]; if (!icinde(x, y)) return; const ad = k.no || 'S' + (i + 1);
      if (k.D) D.CI([x, y], k.D / 2, 'STA_KALIP'); else REC(x - k.bx / 2, y - k.by / 2, x + k.bx / 2, y + k.by / 2, 'STA_KALIP');
      if (D.TARA && !k.D) D.TARA([[x - k.bx / 2, y - k.by / 2, x + k.bx / 2, y + k.by / 2]], [], 1.0);
      TX([x + (k.D ? k.D / 2 : k.bx / 2) + mm(1.5), y + (k.D ? k.D / 2 : k.by / 2) + mm(1)], `${ad} ${k.D ? 'Ø' + cmi(k.D) : cmi(k.bx) + '/' + cmi(k.by)}`, 2.4, 'L', 'STA_BASLIK'); });
    if (o.doseme) (cer.kirisler || []).forEach((b, i) => { const A = [b.a[0] - k0[0], b.a[1] - k0[1]], B = [b.b[0] - k0[0], b.b[1] - k0[1]]; if (!icinde(A[0], A[1]) && !icinde(B[0], B[1])) return; if (Math.abs((b.zt || 0) - g.kUst) > 1.0) return;
      const Lb = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, n = [-(B[1] - A[1]) / Lb * b.bw / 2, (B[0] - A[0]) / Lb * b.bw / 2], ad = b.no || 'K' + (101 + i);
      L([A[0] + n[0], A[1] + n[1]], [B[0] + n[0], B[1] + n[1]], 'STA_GORUNUS', 'HIDDEN'); L([A[0] - n[0], A[1] - n[1]], [B[0] - n[0], B[1] - n[1]], 'STA_GORUNUS', 'HIDDEN');
      const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], ang = Math.atan2(B[1] - A[1], B[0] - A[0]) * 180 / Math.PI, rot = Math.abs(ang) > 90 ? ang - 180 : ang;
      TX([m[0] + n[0] * 2.2, m[1] + n[1] * 2.2], `${ad} ${cmi(b.bw)}/${cmi(b.hb)}`, 2.4, 'C', 'STA_BASLIK', rot); });
  };
})();

/* ---- donatı etiketleri: "nØF/s L=xxx" → üstte poz yazısı, çubuğun altında "L=xxx" (firma detayı gibi) ---- */
(function () {
  'use strict';
  const P = window.STATIK; if (!P || !P.paftalarDsi) return;
  P.Lalti = spec => {
    const seg = [];
    for (const e of spec) { if (e.ly !== 'STA_DONATI') continue; const pts = e.k === 'P' ? e.pts : e.k === 'L' ? [e.a, e.b] : null; if (!pts) continue; for (let i = 0; i < pts.length - 1; i++) seg.push([pts[i], pts[i + 1]]); }
    const ek = [];
    for (const e of spec) {
      if (e.k !== 'T' || e.ly !== 'STA_POZ' || !/\sL=\d/.test(e.s) || e.s.includes('\n')) continue;
      const m = e.s.match(/^(.*?)\s+L=(\d+(?:[.,]\d+)?)\s*(.*)$/); if (!m || !m[1].trim()) continue;
      const r = (e.rot || 0) * Math.PI / 180, u = [Math.cos(r), Math.sin(r)], n = [-Math.sin(r), Math.cos(r)], h = e.h, ana = (m[1] + ' ' + m[3]).trim();
      const w = 0.78 * h * ana.length, s0 = e.al === 'C' ? -w / 2 : e.al === 'R' ? -w : 0, s1 = s0 + w;
      let best = null, ust = null;
      for (const [A, B] of seg) { const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy); if (l < h) continue; if (Math.abs(dx / l * u[1] - dy / l * u[0]) > 0.03) continue;
        const tA = (A[0] - e.p[0]) * u[0] + (A[1] - e.p[1]) * u[1], tB = (B[0] - e.p[0]) * u[0] + (B[1] - e.p[1]) * u[1]; if (Math.min(Math.max(tA, tB), s1) - Math.max(Math.min(tA, tB), s0) < w * 0.25) continue;
        const d = (A[0] - e.p[0]) * n[0] + (A[1] - e.p[1]) * n[1]; if (d < 0 && d > -4 * h && (best == null || d > best)) best = d; if (d > 0 && d < 4 * h && (ust == null || d < ust)) ust = d; }
      const dd0 = best != null ? best - 1.3 * h : ust != null ? ust + 0.45 * h : -1.45 * h, mid = (s0 + s1) / 2, yon = best == null && ust != null ? 1 : -1;
      e.s = ana;
      // başka yazının üstüne düşmesin: aynı doğrultudaki yazılarla çakışırsa çubuktan uzaklaştır
      const Lt = 'L=' + m[2], wL = 0.62 * h * Lt.length, cak = q => { for (const o of spec.concat(ek)) { if (o.k !== 'T' || o === e || !o.s || Math.abs(((o.rot || 0) - (e.rot || 0) + 540) % 360 - 180) > 1) continue;
          const du = (o.p[0] - q[0]) * u[0] + (o.p[1] - q[1]) * u[1], dn = (o.p[0] - q[0]) * n[0] + (o.p[1] - q[1]) * n[1], ow = 0.6 * o.h * o.s.length, os = o.al === 'C' ? -ow / 2 : o.al === 'R' ? -ow : 0;
          if (du + os < wL / 2 && du + os + ow > -wL / 2 && dn < h * 0.95 && dn + o.h * 0.95 > 0) return true; } return false; };
      let q = null; for (let k = 0; k < 5 && !q; k++) { const dd = dd0 + yon * k * 1.15 * h, c = [e.p[0] + u[0] * mid + n[0] * dd, e.p[1] + u[1] * mid + n[1] * dd]; if (!cak(c) || k === 4) q = c; }
      ek.push({ k: 'T', p: q, s: Lt, h: e.h, al: 'C', ly: 'STA_POZ', rot: e.rot || 0 });
    }
    return spec.concat(ek);
  };
  const p0 = P.paftalarDsi;
  P.paftalarDsi = function () { const paf = p0.apply(this, arguments); try { (paf || []).forEach(pf => { if (pf && pf.spec) pf.spec = P.Lalti(pf.spec); }); } catch (e) { console.error('L alti', e); } return paf; };
})();

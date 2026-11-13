/* ArıtmaCAD — STATİK MOTORU
   Su tutucu dikdörtgen betonarme yapılar (havuz, kanal, ızgara yapısı, pompa ıslak hacmi):
   yanal itkiler, yükleme durumları ve kombinasyonlar, plak SEY analizi (perdeler + Winkler radye + üst döşeme),
   TS 500 kesit hesabı (eğilme, kesme, çatlak), zemin gerilmesi ve kaldırma kontrolü, donatı seçimi ve metraj.
   Birimler: kN, m, kN/m², MPa (malzeme). Kot: m. */
(function (G) {
  'use strict';
  const P = G.STATIK;
  const RAD = Math.PI / 180, gw = 10.0; // su birim hacim ağırlığı kN/m³
  const r2 = v => Math.round(v * 100) / 100;

  /* ================= VARSAYILANLAR ================= */
  P.ornekSaray = () => ({
    proj: { ad: 'IZGARA YAPISI', tesis: 'SARAY (TEKİRDAĞ) ATIKSU ARITMA TESİSİ', idare: 'DSİ ATIKSU DAİRESİ BAŞKANLIĞI', hazirlayan: '', kontrol: '', tarih: new Date().toLocaleDateString('tr-TR'), no: '' },
    geo: {
      Lx: 13.80, Ly: 3.10, tw: 0.40, ti: 0.30, hr: 0.40, toe: 0.20,
      bolX: [], bolY: [1.55],
      kAlt: 142.60, kUst: 146.30, kZemin: 146.00, kSu: 144.72, kYAS: 143.00, ust: 'Z',
      doseme: [{ x0: 0, y0: 0, x1: 2.0, y1: 3.10, t: 0.15, g: 1.5, q: 5.0, ad: 'D1' }, { x0: 11.40, y0: 0, x1: 13.80, y1: 3.10, t: 0.15, g: 1.5, q: 5.0, ad: 'D2' }],
    },
    mal: { fck: 30, fyk: 420, gc: 25, cP: 0.05, cR: 0.05, cD: 0.025 },
    zemin: { g: 18, gs: 20, phi: 25, dR: 0.667, K: 'K0', kw: 17300, sig: 150, q: 15 },
    dep: { yon: 'TBDY2018', SDS: 0.35, r: 1.0, A0: 0.10, I: 1.5, yontem: 'MO', eYAS: true },
    komb: P.kombVars(),
    tas: { phiMin: 12, sMax: 0.20, wmax: 0.10, rhoMin: 0.002, FSk: 1.10, mesh: 0.25, kenarZarf: true, azalt: false, olcek: 50 },
  });
  P.CASES = ['G', 'Q', 'Hs', 'Ht', 'Qs', 'YAS', 'EHt', 'EHs', 'EQs', 'E_YAS'];
  P.CASE_AD = { G: 'Zati yükler', Q: 'Hareketli yükler', Hs: 'Yapı içi hidrostatik su itkisi', Ht: 'Statik toprak itkisi', Qs: 'Sürşarj yanal itkisi', YAS: 'Yeraltı suyu (yanal + kaldırma)', EHt: 'Depremde toprak itkisi artışı', EHs: 'Depremde hidrodinamik su itkisi', EQs: 'Depremde sürşarj itkisi', E_YAS: 'Depremde yeraltı suyu itkisi' };
  /* kombinasyonlar: TS 500 7.4 / TBDY 2018 4.4 — deprem içeren kombinasyonlarda yük katsayıları 1.0 */
  P.kombVars = () => [
    { ad: 'COMB1', acik: 'Sızdırmazlık deneyi: içerisi dolu, dışta toprak yok (TEST)', tsm: { G: 1.4, Q: 1.6, Hs: 1.6 }, emn: { G: 1, Q: 1, Hs: 1 } },
    { ad: 'COMB2', acik: 'İşletme: içerisi dolu, dışta toprak + YAS + sürşarj (SERVİS)', tsm: { G: 1.4, Q: 1.6, Hs: 1.6, Ht: 1.6, Qs: 1.6, YAS: 1.6 }, emn: { G: 1, Q: 1, Hs: 1, Ht: 1, Qs: 1, YAS: 1 } },
    { ad: 'COMB3', acik: 'Bakım: içerisi boş, dışta toprak + YAS + sürşarj (BAKIM)', tsm: { G: 1.4, Q: 1.6, Ht: 1.6, Qs: 1.6, YAS: 1.6 }, emn: { G: 1, Q: 1, Ht: 1, Qs: 1, YAS: 1 } },
    { ad: 'COMB4', acik: 'İşletme + deprem (SERVİS + DEPREM)', tsm: { G: 1, Q: 1, Hs: 1, Ht: 1, Qs: 1, YAS: 1, EHt: 1, EHs: 1, EQs: 1, E_YAS: 1 }, emn: { G: 1, Q: 1, Hs: 1, Ht: 1, Qs: 1, YAS: 1, EHt: 1, EHs: 1, EQs: 1, E_YAS: 1 } },
    { ad: 'COMB5', acik: 'Bakım + deprem (BAKIM + DEPREM)', tsm: { G: 1, Q: 1, Ht: 1, Qs: 1, YAS: 1, EHt: 1, EQs: 1, E_YAS: 1 }, emn: { G: 1, Q: 1, Ht: 1, Qs: 1, YAS: 1, EHt: 1, EQs: 1, E_YAS: 1 } },
  ];

  /* ================= MALZEME ================= */
  P.malzeme = m => {
    const fcd = m.fck / 1.5, fyd = m.fyk / 1.15, fctk = 0.35 * Math.sqrt(m.fck), fctd = fctk / 1.5, Ec = 3250 * Math.sqrt(m.fck) + 14000, Es = 200000;
    const lb = Math.max(20, Math.ceil(0.12 * fyd / fctd)); // kenetlenme boyu / Φ (TS500 9.1)
    return { fck: m.fck, fyk: m.fyk, fcd, fyd, fctk, fctd, Ec, Es, n: Es / Ec, lb };
  };

  /* ================= İTKİ KATSAYILARI ================= */
  const coulombKA = (phi, delta, theta) => { // düşey duvar, yatay dolgu; theta: deprem açısı
    const a = Math.sin((phi + delta) * RAD) * Math.sin((phi - theta) * RAD), b = Math.cos((delta + theta) * RAD);
    if (phi - theta <= 0) return NaN;
    return Math.cos((phi - theta) * RAD) ** 2 / (Math.cos(theta * RAD) * b * (1 + Math.sqrt(a / b)) ** 2);
  };
  P.itki = (S) => {
    const z = S.zemin, d = S.dep, phi = z.phi, delta = z.dR * phi;
    const K0 = 1 - Math.sin(phi * RAD), KAr = Math.tan((45 - phi / 2) * RAD) ** 2, KA = coulombKA(phi, delta, 0);
    const Ks = z.K === 'K0' ? K0 : z.K === 'KAR' ? KAr : KA;
    let kh, kv, khSu, notu;
    if (d.yon === 'TBDY2018') { kh = 0.4 * d.SDS / (d.r || 1); kv = 0.5 * kh; khSu = kh; notu = `TBDY 2018 Bölüm 16.12: kh = 0,4·S_DS / r = 0,4·${d.SDS}/${d.r} ; kv = 0,5·kh`; }
    else { const mes = S.geo.ust !== 'S'; kh = (mes ? 0.3 : 0.2) * (d.I + 1) * d.A0; kv = mes ? 0 : 2 * kh / 3; khSu = 0.3 * (d.I + 1) * d.A0; notu = `DBYBHY 2007: Ch = ${mes ? '0,3' : '0,2'}·(I+1)·A0 ; Cv = ${mes ? '0' : '2Ch/3'}`; }
    const g = z.g, gb = z.gs - gw;
    const th1 = Math.atan(kh / (1 - kv)) / RAD, th2 = Math.atan(kh / (1 + kv)) / RAD;
    const thw1 = Math.atan(z.gs / gb * kh / (1 - kv)) / RAD, thw2 = Math.atan(z.gs / gb * kh / (1 + kv)) / RAD;
    const KAE1 = coulombKA(phi, delta, th1), KAE2 = coulombKA(phi, delta, th2), KAEw1 = coulombKA(phi, delta, thw1), KAEw2 = coulombKA(phi, delta, thw2);
    const KatK = Math.max((1 - kv) * KAE1, (1 + kv) * KAE2), KatW = Math.max((1 - kv) * KAEw1, (1 + kv) * KAEw2);
    const dK = Math.max(0, KatK - KA), dKw = Math.max(0, KatW - KA);
    return { phi, delta, K0, KAr, KA, Ks, kh, kv, khSu, notu, th1, th2, thw1, thw2, KAE1, KAE2, KAEw1, KAEw2, KatK, KatW, dK, dKw, g, gb };
  };

  /* ================= GEOMETRİ ================= */
  P.geometri = (S) => {
    const g = S.geo, tw = g.tw, ti = g.ti;
    const zr = g.kAlt + g.hr / 2, zTop = g.kAlt + g.hr, Hm = g.kUst - zr, Hn = g.kUst - zTop;
    const xC = [tw / 2, ...g.bolX.slice().sort((a, b) => a - b), g.Lx - tw / 2], yC = [tw / 2, ...g.bolY.slice().sort((a, b) => a - b), g.Ly - tw / 2];
    const walls = [];
    // dış perdeler (normal dışa)
    const PA = g.perdeAd || {}, nm = (k, d) => (PA[k] ? PA[k] + ' — ' + d : d);
    walls.push({ ad: nm('S', 'Güney (A aksı)'), tip: 'dis', t: tw, p0: [xC[0], yC[0]], e: [1, 0], n: [0, -1], sup: xC.map(x => x - xC[0]) });
    walls.push({ ad: nm('N', 'Kuzey'), tip: 'dis', t: tw, p0: [xC[0], yC[yC.length - 1]], e: [1, 0], n: [0, 1], sup: xC.map(x => x - xC[0]) });
    walls.push({ ad: nm('W', 'Batı (1 aksı)'), tip: 'dis', t: tw, p0: [xC[0], yC[0]], e: [0, 1], n: [-1, 0], sup: yC.map(y => y - yC[0]) });
    walls.push({ ad: nm('E', 'Doğu'), tip: 'dis', t: tw, p0: [xC[xC.length - 1], yC[0]], e: [0, 1], n: [1, 0], sup: yC.map(y => y - yC[0]) });
    g.bolX.forEach((x, k) => walls.push({ ad: (PA.X && PA.X[k] ? PA.X[k] + ' (ara perde)' : 'Ara perde X=' + r2(x)), tip: 'ic', t: ti, p0: [x, yC[0]], e: [0, 1], n: [1, 0], sup: yC.map(y => y - yC[0]) }));
    g.bolY.forEach((y, k) => walls.push({ ad: (PA.Y && PA.Y[k] ? PA.Y[k] + ' (ara perde)' : 'Ara perde Y=' + r2(y)), tip: 'ic', t: ti, p0: [xC[0], y], e: [1, 0], n: [0, 1], sup: xC.map(x => x - xC[0]) }));
    walls.forEach(w => { w.L = w.sup[w.sup.length - 1]; });
    // bölmeler (iç net alanlar)
    const comps = [];
    for (let i = 0; i < xC.length - 1; i++) for (let j = 0; j < yC.length - 1; j++) {
      const tl = i === 0 ? tw : ti, tr = i === xC.length - 2 ? tw : ti, tb = j === 0 ? tw : ti, tt = j === yC.length - 2 ? tw : ti;
      comps.push({ x0: xC[i] + tl / 2, x1: xC[i + 1] - tr / 2, y0: yC[j] + tb / 2, y1: yC[j + 1] - tt / 2 });
    }
    const R = { x0: -g.toe, y0: -g.toe, x1: g.Lx + g.toe, y1: g.Ly + g.toe };
    return { zr, zTop, Hm, Hn, xC, yC, walls, comps, R, A: (R.x1 - R.x0) * (R.y1 - R.y0) };
  };

  /* ================= PERDE YÜKLERİ (yükseklik z [kot] → +w yönünde basınç kN/m²) =================
     dış perdede +w = dışarı. Su içeriden (+), toprak/YAS/sürşarj dışarıdan (−). */
  P.perdeYukleri = (S, GM, IT) => {
    const g = S.geo, z = S.zemin, d = S.dep;
    const zb = g.kAlt, Ht = Math.max(0, g.kZemin - zb); // toprak itkisi yüksekliği (radye altından)
    const yas = g.kYAS != null && g.kYAS > zb ? g.kYAS : null, hgw = yas ? yas - zb : 0;
    const hw = Math.max(0, g.kSu - GM.zTop); // su derinliği (radye üstünden)
    const sigV = zz => { // düşey efektif gerilme
      if (zz >= g.kZemin) return 0;
      if (!yas || zz >= yas) return z.g * (g.kZemin - zz);
      const ust = z.g * (g.kZemin - Math.min(g.kZemin, yas));
      return ust + (z.gs - gw) * (Math.min(g.kZemin, yas) - zz);
    };
    // dinamik toprak itkisi artışı: ΔP = ½·ΔK·γ*·H² (M-O, TBDY 16.12, H/2'de) ya da Wood: ΔP = kh·γ*·H² (rijit)
    const gStar = Ht > 0 ? (2 * (sigV(zb)) / (Ht * Ht)) * Ht / 2 : 0; // ortalama efektif birim hacim ağırlık
    const hIslak = yas ? Math.max(0, Math.min(yas, g.kZemin) - zb) : 0, dK = Ht > 0 ? (IT.dK * (Ht - hIslak) + IT.dKw * hIslak) / Ht : IT.dK; // kuru / su altı ağırlıklı
    const dPt = d.yontem === 'WOOD' ? IT.kh * gStar * Ht * Ht : 0.5 * dK * gStar * Ht * Ht;
    const pEHt = Ht > 0 ? dPt / Ht : 0; // H/2'de bileşke → üniform yayılı
    const dPq = (d.yontem === 'WOOD' ? IT.kh : dK) * z.q * Ht; // sürşarj artışı, 2H/3'te → ters üçgen
    const fn = {
      Hs: zz => (zz < g.kSu ? gw * (g.kSu - zz) : 0),
      EHs: zz => (zz < g.kSu ? 7 / 8 * IT.khSu * gw * Math.sqrt(Math.max(0, (g.kSu - Math.max(zz, GM.zTop))) * hw) : 0),
      Ht: zz => -IT.Ks * sigV(zz),
      YAS: zz => (yas && zz < yas ? -gw * (yas - zz) : 0),
      Qs: zz => (zz < g.kZemin ? -IT.Ks * z.q : 0),
      EHt: zz => (zz < g.kZemin && zz >= zb ? -pEHt : 0),
      EQs: zz => (zz < g.kZemin && zz >= zb && Ht > 0 ? -2 * dPq / Ht * ((zz - zb) / Ht) : 0),
      E_YAS: zz => (yas && d.eYAS && zz < yas ? -7 / 8 * IT.kh * gw * Math.sqrt((yas - zz) * hgw) : 0),
    };
    return { fn, Ht, hw, hgw, yas, sigV, gStar, dK, dPt, pEHt, dPq };
  };

  /* ================= KOMBİNASYON + ZARF ================= */
  const zarfInit = n => ({ xp: new Float64Array(n), xn: new Float64Array(n), yp: new Float64Array(n), yn: new Float64Array(n) });
  const zarfAdd = (Z, Mx, My, Mxy) => { // Wood-Armer: M ± |Mxy|
    for (let i = 0; i < Mx.length; i++) {
      const a = Math.abs(Mxy[i]);
      Z.xp[i] = Math.max(Z.xp[i], Mx[i] + a); Z.xn[i] = Math.min(Z.xn[i], Mx[i] - a);
      Z.yp[i] = Math.max(Z.yp[i], My[i] + a); Z.yn[i] = Math.min(Z.yn[i], My[i] - a);
    }
  };
  const combine = (res, fac, n, sgn) => {
    const Mx = new Float64Array(n), My = new Float64Array(n), Mxy = new Float64Array(n), w = new Float64Array(n);
    for (const c in fac) { const r = res[c]; if (!r || !fac[c]) continue; const f = fac[c] * (sgn && sgn[c] ? sgn[c] : 1); for (let i = 0; i < n; i++) { Mx[i] += f * r.Mx[i]; My[i] += f * r.My[i]; Mxy[i] += f * r.Mxy[i]; w[i] += f * r.w[i]; } }
    return { Mx, My, Mxy, w };
  };

  /* ================= PERDE ANALİZİ ================= */
  function perdeAnaliz(S, GM, MAL, YK, w, kom) {
    const g = S.geo, h = S.tas.mesh, E = MAL.Ec * 1000, nu = 0.2;
    const ustV = g.ust === 'Z' ? ['S', 'M'] : [g.ust];
    const kenV = S.tas.kenarZarf ? ['A', 'M'] : ['A'];
    const cases = w.tip === 'dis' ? ['Hs', 'Ht', 'YAS', 'Qs', 'EHt', 'EHs', 'EQs', 'E_YAS'] : ['Hs', 'EHs'];
    const panels = [];
    for (let k = 0; k < w.sup.length - 1; k++) {
      const L = w.sup[k + 1] - w.sup[k];
      const xs = P.gridLines([0, L], h), ys = P.gridLines([0, GM.Hm, g.kSu - GM.zr, g.kZemin - GM.zr].filter(v => v > 0 && v < GM.Hm + 1e-9).concat([0, GM.Hm]), h);
      const pan = { k, L, s0: w.sup[k], xs, ys, var: [] };
      for (const ust of ustV) for (const ken of kenV) {
        const pl = P.Plate({ xs, ys, t: w.t, E, nu, bc: { B: 'A', T: ust, L: ken, R: ken } });
        const res = {};
        for (const c of cases) res[c] = pl.solve({ p: (x, y) => YK.fn[c](GM.zr + y) });
        pan.var.push({ ust, ken, pl, res });
      }
      panels.push(pan);
    }
    // zarflar
    const sgnList = w.tip === 'ic' ? [null, { Hs: -1, EHs: -1 }] : [null];
    const out = { tsm: { xp: 0, xn: 0, yp: 0, yn: 0 }, emn: { xp: 0, xn: 0, yp: 0, yn: 0 }, Vd: 0, krit: null };
    for (const pan of panels) for (const v of pan.var) {
      const n = v.pl.nx * v.pl.ny;
      v.Z = { tsm: zarfInit(n), emn: zarfInit(n) };
      for (const cb of kom) for (const sg of sgnList) for (const ty of ['tsm', 'emn']) {
        const C = combine(v.res, cb[ty], n, sg); zarfAdd(v.Z[ty], C.Mx, C.My, C.Mxy);
        if (ty === 'tsm') { // kesme: taban ve yan mesnet tepkileri (köşe düğümler hariç)
          // köşe tekilliğinden kaçınmak için kenar uçlarından perde kalınlığı kadar içerideki düğümler alınır
          const xs = v.pl.xs, ys = v.pl.ys, uz = w.t;
          for (let i = 1; i < v.pl.nx - 1; i++) { if (xs[i] < uz - 1e-9 || xs[i] > pan.L - uz + 1e-9) continue; const nd = v.pl.nid(i, 0); let R = 0; for (const c in cb.tsm) if (v.res[c]) R += cb.tsm[c] * (sg && sg[c] ? sg[c] : 1) * v.res[c].R[nd * 3]; out.Vd = Math.max(out.Vd, Math.abs(R) / v.pl.tribX(i)); }
          if (v.ken === 'A') for (let j = 1; j < v.pl.ny - 1; j++) { if (ys[j] < uz - 1e-9 || ys[j] > ys[ys.length - 1] - uz + 1e-9) continue; for (const i of [0, v.pl.nx - 1]) { const nd = v.pl.nid(i, j); let R = 0; for (const c in cb.tsm) if (v.res[c]) R += cb.tsm[c] * (sg && sg[c] ? sg[c] : 1) * v.res[c].R[nd * 3]; out.Vd = Math.max(out.Vd, Math.abs(R) / v.pl.tribY(j)); } }
        }
      }
      for (const ty of ['tsm', 'emn']) { const Z = v.Z[ty], o = out[ty]; o.xp = Math.max(o.xp, ...Z.xp); o.xn = Math.min(o.xn, ...Z.xn); o.yp = Math.max(o.yp, ...Z.yp); o.yn = Math.min(o.yn, ...Z.yn); }
    }
    out.panels = panels; out.cases = cases;
    return out;
  }

  /* ================= RADYE ANALİZİ (Winkler) ================= */
  function radyeAnaliz(S, GM, MAL, YK, perdeler, kom) {
    const g = S.geo, z = S.zemin, h = S.tas.mesh, R = GM.R, E = MAL.Ec * 1000;
    const fx = [R.x0, 0, g.Lx, R.x1, ...GM.xC], fy = [R.y0, 0, g.Ly, R.y1, ...GM.yC];
    GM.comps.forEach(c => { fx.push(c.x0, c.x1); fy.push(c.y0, c.y1); });
    (g.doseme || []).forEach(d => { fx.push(d.x0, d.x1); fy.push(d.y0, d.y1); });
    const xs = P.gridLines(fx.filter(v => v >= R.x0 - 1e-9 && v <= R.x1 + 1e-9), h), ys = P.gridLines(fy.filter(v => v >= R.y0 - 1e-9 && v <= R.y1 + 1e-9), h);
    const pl = P.Plate({ xs, ys, t: g.hr, E, nu: 0.2, k: z.kw });
    const nx = xs.length, ny = ys.length, n = nx * ny;
    const ix = x => { let b = 0; for (let i = 1; i < nx; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[b] - x)) b = i; return b; };
    const iy = y => { let b = 0; for (let j = 1; j < ny; j++) if (Math.abs(ys[j] - y) < Math.abs(ys[b] - y)) b = j; return b; };
    const inComp = (x, y) => GM.comps.some(c => x > c.x0 - 1e-9 && x < c.x1 + 1e-9 && y > c.y0 - 1e-9 && y < c.y1 + 1e-9);
    const inBox = (x, y) => x > -1e-9 && x < g.Lx + 1e-9 && y > -1e-9 && y < g.Ly + 1e-9;
    // çizgi yükü (kN/m, + yukarı) ve çizgi momenti
    const lineNodes = (p0, e, L) => { // çizgi üzerindeki düğümler: [{nd, s, trib}]
      const out = [];
      if (e[0]) { const j = iy(p0[1]); const a = p0[0], b = p0[0] + L; const is = []; for (let i = 0; i < nx; i++) if (xs[i] >= a - 1e-9 && xs[i] <= b + 1e-9) is.push(i); is.forEach((i, k) => { const l = (k > 0 ? xs[i] - xs[is[k - 1]] : 0) / 2 + (k < is.length - 1 ? xs[is[k + 1]] - xs[i] : 0) / 2; out.push({ nd: pl.nid(i, j), s: xs[i] - a, trib: l }); }); }
      else { const i = ix(p0[0]); const a = p0[1], b = p0[1] + L; const js = []; for (let j = 0; j < ny; j++) if (ys[j] >= a - 1e-9 && ys[j] <= b + 1e-9) js.push(j); js.forEach((j, k) => { const l = (k > 0 ? ys[j] - ys[js[k - 1]] : 0) / 2 + (k < js.length - 1 ? ys[js[k + 1]] - ys[j] : 0) / 2; out.push({ nd: pl.nid(i, j), s: ys[j] - a, trib: l }); }); }
      return out;
    };
    const loads = {}; P.CASES.forEach(c => loads[c] = { pf: [], nodal: [] });
    const lineLoad = (c, p0, e, L, q) => lineNodes(p0, e, L).forEach(o => loads[c].nodal.push({ n: o.nd, dof: 0, v: q * o.trib }));
    // G: radye zati, perde zati, pabuç üstü toprak, döşeme
    loads.G.pf.push(() => -MAL.gc0 * g.hr);
    loads.G.pf.push((x, y) => (inBox(x, y) ? 0 : -z.g * Math.max(0, g.kZemin - GM.zTop)));
    for (const w of GM.walls) lineLoad('G', w.p0, w.e, w.L, -MAL.gc0 * w.t * GM.Hn);
    for (const d of g.doseme || []) {
      const per = 2 * ((d.x1 - d.x0) + (d.y1 - d.y0)), A = (d.x1 - d.x0) * (d.y1 - d.y0), qg = (MAL.gc0 * d.t + d.g) * A / per, qq = d.q * A / per;
      const kenar = [[[d.x0, d.y0], [1, 0], d.x1 - d.x0], [[d.x0, d.y1], [1, 0], d.x1 - d.x0], [[d.x0, d.y0], [0, 1], d.y1 - d.y0], [[d.x1, d.y0], [0, 1], d.y1 - d.y0]];
      for (const [p0, e, L] of kenar) { const pc = [Math.min(Math.max(p0[0], GM.xC[0]), GM.xC[GM.xC.length - 1]), Math.min(Math.max(p0[1], GM.yC[0]), GM.yC[GM.yC.length - 1])]; lineLoad('G', pc, e, L, -qg); lineLoad('Q', pc, e, L, -qq); }
    }
    // Hs: bölmelerdeki su ağırlığı
    loads.Hs.pf.push((x, y) => (inComp(x, y) ? -gw * YK.hw : 0));
    // YAS: kaldırma
    if (YK.yas) loads.YAS.pf.push(() => gw * (YK.yas - g.kAlt));
    // dış perde taban momentlerinin aktarımı (ana varyant: yan kenarlar ankastre)
    for (let wi = 0; wi < GM.walls.length; wi++) {
      const w = GM.walls[wi]; if (w.tip !== 'dis') continue;
      const pd = perdeler[wi];
      for (const pan of pd.panels) {
        const v = pan.var.find(q => q.ken === 'A') || pan.var[0], pl2 = v.pl;
        const ms = []; for (let i = 0; i < pl2.nx; i++) ms.push([pan.s0 + pl2.xs[i], i]);
        const p0 = [w.p0[0] + w.e[0] * pan.s0, w.p0[1] + w.e[1] * pan.s0];
        const nodes = lineNodes(p0, w.e, pan.L);
        for (const c of pd.cases) {
          const Rr = v.res[c].R, md = i => Rr[pl2.nid(i, 0) * 3 + 2] / pl2.tribX(i); // kNm/m
          const mAt = s => { // doğrusal enterpolasyon
            const xx = pl2.xs; let i = 0; while (i < xx.length - 2 && xx[i + 1] < s) i++; const t = Math.min(1, Math.max(0, (s - xx[i]) / (xx[i + 1] - xx[i]))); return md(i) * (1 - t) + md(i + 1) * t;
          };
          for (const o of nodes) { const m = mAt(o.s) * o.trib; loads[c].nodal.push({ n: o.nd, dof: 1, v: w.n[0] * m }, { n: o.nd, dof: 2, v: w.n[1] * m }); }
        }
      }
    }
    const res = {};
    for (const c of P.CASES) { const L = loads[c]; res[c] = pl.solve({ p: L.pf.length ? (x, y) => L.pf.reduce((s, f) => s + f(x, y), 0) : null, nodal: L.nodal }); }
    // zarf
    const Z = { tsm: zarfInit(n), emn: zarfInit(n) };
    let qmax = 0, qmin = 1e9, Vd = 0; const kombQ = [];
    const nearWall = (x, y, d) => GM.xC.some(xc => Math.abs(x - xc) < d && y > GM.yC[0] - d && y < GM.yC[GM.yC.length - 1] + d) || GM.yC.some(yc => Math.abs(y - yc) < d && x > GM.xC[0] - d && x < GM.xC[GM.xC.length - 1] + d);
    const dEf = g.hr - S.mal.cR - 0.016;
    for (const cb of kom) for (const ty of ['tsm', 'emn']) {
      const C = combine(res, cb[ty], n); zarfAdd(Z[ty], C.Mx, C.My, C.Mxy);
      if (ty === 'emn') { let mx = 0, mn = 1e9; for (let i = 0; i < n; i++) { if (!pl.used[i]) continue; const q = -z.kw * C.w[i]; mx = Math.max(mx, q); mn = Math.min(mn, q); } qmax = Math.max(qmax, mx); qmin = Math.min(qmin, mn); kombQ.push({ ad: cb.ad, qmax: mx, qmin: mn }); }
      else { // kesme: eleman merkezinde Q = ∂M/∂x + ∂Mxy/∂y (perde yüzünden d kadar ötede)
        for (const e of pl.elems) {
          const xc = e.x0 + e.d.a / 2, yc = e.y0 + e.d.b / 2; if (nearWall(xc, yc, Math.max(...GM.walls.map(w => w.t)) / 2 + dEf)) continue;
          const [n0, n1, n2, n3] = e.ns;
          const dMx = ((C.Mx[n1] + C.Mx[n2]) - (C.Mx[n0] + C.Mx[n3])) / (2 * e.d.a), dMxyY = ((C.Mxy[n3] + C.Mxy[n2]) - (C.Mxy[n0] + C.Mxy[n1])) / (2 * e.d.b);
          const dMy = ((C.My[n3] + C.My[n2]) - (C.My[n0] + C.My[n1])) / (2 * e.d.b), dMxyX = ((C.Mxy[n1] + C.Mxy[n2]) - (C.Mxy[n0] + C.Mxy[n3])) / (2 * e.d.a);
          Vd = Math.max(Vd, Math.abs(dMx + dMxyY), Math.abs(dMy + dMxyX));
        }
      }
    }
    const env = {}; for (const ty of ['tsm', 'emn']) { const z2 = Z[ty]; env[ty] = { xp: Math.max(...z2.xp), xn: Math.min(...z2.xn), yp: Math.max(...z2.yp), yn: Math.min(...z2.yn) }; }
    return { pl, res, Z, env, qmax, qmin, kombQ, Vd, xs, ys };
  }

  /* ================= ÜST DÖŞEME ================= */
  function dosemeAnaliz(S, MAL, d, kom) {
    // paneller: döşeme altındaki ara perdelerden bölünür; kenar mesnetleri perde varsa ankastre (S.tas.dosemeMesnet: 'A' ankastre, 'Z' mafsallı+ankastre zarfı), perde yoksa serbest
    const pan = P.dosemePanel ? P.dosemePanel(S, d).paneller : [{ x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1, kn: null }], E = MAL.Ec * 1000;
    const out = { tsm: { xp: 0, xn: 0, yp: 0, yn: 0 }, emn: { xp: 0, xn: 0, yp: 0, yn: 0 }, Vd: 0, vars: [], paneller: pan };
    const fac = { tsm: { G: 1.4, Q: 1.6 }, emn: { G: 1, Q: 1 } }, bcs = S.tas.dosemeMesnet === 'Z' ? ['M', 'A'] : ['A'];
    for (const pn of pan) {
      const lx = pn.x1 - pn.x0, ly = pn.y1 - pn.y0, h = Math.min(S.tas.mesh, Math.min(lx, ly) / 8);
      const xs = P.gridLines([0, lx], h), ys = P.gridLines([0, ly], h), dayanak = pn.kn ? ['B', 'T', 'L', 'R'].filter(k => pn.kn[k]).length : 4;
      for (const bc of bcs) {
        const b = k => (pn.kn && dayanak > 0 && !pn.kn[k] ? 'S' : bc);
        const pl = P.Plate({ xs, ys, t: d.t, E, nu: 0.2, bc: { B: b('B'), T: b('T'), L: b('L'), R: b('R') } }), v = { bc, pl, pn, res: { G: pl.solve({ p: () => -(MAL.gc0 * d.t + d.g) }), Q: pl.solve({ p: () => -d.q }) } };
        out.vars.push(v); const n = pl.nx * pl.ny;
        for (const ty of ['tsm', 'emn']) { const Z = zarfInit(n), C = combine(v.res, fac[ty], n); zarfAdd(Z, C.Mx, C.My, C.Mxy); const o = out[ty]; o.xp = Math.max(o.xp, ...Z.xp); o.xn = Math.min(o.xn, ...Z.xn); o.yp = Math.max(o.yp, ...Z.yp); o.yn = Math.min(o.yn, ...Z.yn); }
      }
      const ser = pn.kn && ['B', 'T', 'L', 'R'].some(k => !pn.kn[k]) ? Math.min(lx, ly) : Math.min(lx, ly) / 2; // serbest kenar varsa tek doğrultuda taşır
      out.Vd = Math.max(out.Vd, (1.4 * (MAL.gc0 * d.t + d.g) + 1.6 * d.q) * ser);
    }
    return out;
  }

  /* ================= TS 500 KESİT HESABI ================= */
  const CAPLAR = [12, 14, 16, 18, 20, 22, 25, 28, 32], ARALIK = [0.25, 0.20, 0.175, 0.15, 0.125, 0.10];
  P.asGerekli = (M, d, MAL) => { // M kNm/m, d m → m²/m ; dikdörtgen gerilme bloğu
    if (M <= 0) return { As: 0, a: 0 };
    const fcd = MAL.fcd * 1000, fyd = MAL.fyd * 1000, disc = d * d - 2 * M / (0.85 * fcd);
    if (disc < 0) return { As: NaN, a: NaN, yetersiz: true };
    const a = d - Math.sqrt(disc); return { As: 0.85 * fcd * a / fyd, a };
  };
  P.catlak = (Mser, As, d, h, s, MAL) => { // TS500 Denklem 13.5 (Gergely-Lutz), σs çatlamış elastik kesitten
    if (Mser <= 0 || !As) return { w: 0, ss: 0 };
    const n = MAL.n, rho = As / d, k = -n * rho + Math.sqrt((n * rho) ** 2 + 2 * n * rho), z = d * (1 - k / 3);
    const ss = Mser / (As * z) / 1000; // MPa
    const dp = (h - d) * 1000, At = 2 * dp * s * 1000, c = dp; // mm², mm
    return { w: 1.3 * Math.cbrt(At * c) * ss * 1e-5, ss, k, z, At, c };
  };
  /* bir donatı katmanı için seçim. o: {M, Ms, h, c, kat(1 dış,2 iç), su(bool), V} */
  P.donatiSec = (o, S, MAL) => {
    const T = S.tas, cands = [];
    for (const F of CAPLAR) {
      if (F < T.phiMin) continue;
      const Fm = F / 1000, d = o.h - o.c - (o.kat === 2 ? Fm : 0) - Fm / 2;
      const req = P.asGerekli(o.M, d, MAL), Amin = T.rhoMin * d;
      for (const s of ARALIK) {
        if (s > T.sMax + 1e-9) continue;
        const As = Math.PI * Fm * Fm / 4 / s;
        if (!(As >= req.As - 1e-12) || As < Amin - 1e-12) continue;
        const ck = o.su ? P.catlak(o.Ms, As, d, o.h, s, MAL) : { w: 0 };
        const wk = T.azalt && req.As > 0 && As / req.As > 1.2 ? ck.w / (As / req.As) : ck.w;
        if (o.su && wk > T.wmax + 1e-9) continue;
        cands.push({ F, s, As, d, req: req.As, Amin, w: wk, ss: ck.ss || 0, ck });
      }
    }
    if (!cands.length) {
      const F = CAPLAR[CAPLAR.length - 1] / 1000, d = o.h - o.c - (o.kat === 2 ? F : 0) - F / 2;
      return { ok: false, msg: 'Uygun donatı bulunamadı — kesit kalınlığını artırın', d, req: P.asGerekli(o.M, d, MAL).As };
    }
    cands.sort((a, b) => a.As - b.As || b.s - a.s);
    /* kabuk (yay / oval / anaerobik) hesabında tercih edilen aralık (S.tas.sTercih, varsayılan 15 cm): o aralıkta yeten en küçük çap;
       hiçbir çap yetmiyorsa en az çelikli seçim. Dikdörtgen yapıda aynı tercihi P.esitle uygular. */
    const pref = S.mod === 'kabuk' ? (T.sTercih == null ? 0.15 : +T.sTercih) : 0;
    const best = (pref > 0 && cands.filter(c => Math.abs(c.s - pref) < 1e-9 && c.As / c.d <= 0.02).sort((x, y) => x.F - y.F)[0]) || cands[0]; best.ok = true; best.rho = best.As / best.d;
    if (best.rho > 0.02) { best.ok = false; best.msg = 'ρ > 0,02 — kesit kalınlığını artırın'; }
    return best;
  };
  P.kesme = (Vd, d, MAL) => { const Vcr = 0.65 * MAL.fctd * 1000 * d, Vmax = 0.22 * MAL.fcd * 1000 * d; return { Vd, Vcr, Vmax, ok: Vd <= Vcr && Vd <= Vmax }; };

  /* ================= ANA HESAP ================= */
  P.hesapla = (S) => {
    const t0 = Date.now();
    const MAL = P.malzeme(S.mal); MAL.gc0 = S.mal.gc;
    const IT = P.itki(S), GM = P.geometri(S), YK = P.perdeYukleri(S, GM, IT), kom = S.komb;
    const uyar = [];
    if (S.geo.kSu > S.geo.kUst) uyar.push('Su kotu perde üst kotunun üzerinde!');
    if (!(IT.KAE1 > 0) || !(IT.KAEw1 > 0)) uyar.push('Mononobe-Okabe: φ − θ < 0, deprem katsayısı içsel sürtünme açısına göre çok büyük.');
    const perdeler = GM.walls.map(w => perdeAnaliz(S, GM, MAL, YK, w, kom));
    const radye = radyeAnaliz(S, GM, MAL, YK, perdeler, kom);
    const dosemeler = (S.geo.doseme || []).map(d => dosemeAnaliz(S, MAL, d, kom));
    // grup zarfları
    const grup = tip => { const o = { tsm: { xp: 0, xn: 0, yp: 0, yn: 0 }, emn: { xp: 0, xn: 0, yp: 0, yn: 0 }, Vd: 0, t: 0 }; GM.walls.forEach((w, i) => { if (w.tip !== tip) return; o.t = w.t; const p = perdeler[i]; for (const ty of ['tsm', 'emn']) for (const k of ['xp', 'yp']) o[ty][k] = Math.max(o[ty][k], p[ty][k]); for (const ty of ['tsm', 'emn']) for (const k of ['xn', 'yn']) o[ty][k] = Math.min(o[ty][k], p[ty][k]); o.Vd = Math.max(o.Vd, p.Vd); }); return o; };
    const gDis = grup('dis'), gIc = GM.walls.some(w => w.tip === 'ic') ? grup('ic') : null;
    // kesit tasarımı — perde: y momenti → düşey donatı (dış katman), x momenti → yatay donatı (iç katman)
    // + yüz: dış yüz (dış perdede toprak tarafı), − yüz: iç yüz (su tarafı)
    const tasarim = [];
    const ekle = (eleman, h, c, Z, su, V, etiket) => {
      const katman = [
        { yon: etiket.y, yuz: etiket.p, M: Z.tsm.yp, Ms: Z.emn.yp, kat: 1, suYuz: su.p },
        { yon: etiket.y, yuz: etiket.n, M: -Z.tsm.yn, Ms: -Z.emn.yn, kat: 1, suYuz: su.n },
        { yon: etiket.x, yuz: etiket.p, M: Z.tsm.xp, Ms: Z.emn.xp, kat: 2, suYuz: su.p },
        { yon: etiket.x, yuz: etiket.n, M: -Z.tsm.xn, Ms: -Z.emn.xn, kat: 2, suYuz: su.n },
      ];
      const sec = katman.map(k => Object.assign(k, { sec: P.donatiSec({ M: k.M, Ms: k.Ms, h, c, kat: k.kat, su: k.suYuz }, S, MAL) }));
      const dmin = Math.min(...sec.map(k => k.sec.d || h - c));
      tasarim.push({ eleman, h, c, katman: sec, kesme: P.kesme(V, dmin, MAL) });
    };
    const PA0 = S.geo.perdeAd || {}, disNo = ['S', 'N', 'W', 'E'].map(k => PA0[k]).filter(Boolean), icNo = [...(PA0.X || []), ...(PA0.Y || [])].filter(Boolean);
    ekle('Dış perdeler (t=' + r2(S.geo.tw * 100) + ' cm)' + (disNo.length ? ' — ' + disNo.join(', ') : ''), S.geo.tw, S.mal.cP, gDis, { p: true, n: true }, gDis.Vd, { y: 'Düşey', x: 'Yatay', p: 'Dış yüz', n: 'İç yüz' });
    if (gIc) ekle('Ara perdeler (t=' + r2(S.geo.ti * 100) + ' cm)' + (icNo.length ? ' — ' + icNo.join(', ') : ''), S.geo.ti, S.mal.cP, gIc, { p: true, n: true }, gIc.Vd, { y: 'Düşey', x: 'Yatay', p: 'Yüz 1', n: 'Yüz 2' });
    // radye: +M üst yüz (w yukarı). x momenti → X doğrultusu donatısı (dış katman)
    { const Z = radye.env; ekle('Radye temel (h=' + r2(S.geo.hr * 100) + ' cm)', S.geo.hr, S.mal.cR, { tsm: { yp: Z.tsm.xp, yn: Z.tsm.xn, xp: Z.tsm.yp, xn: Z.tsm.yn }, emn: { yp: Z.emn.xp, yn: Z.emn.xn, xp: Z.emn.yp, xn: Z.emn.yn } }, { p: true, n: true }, radye.Vd, { y: 'X yönü', x: 'Y yönü', p: 'Üst', n: 'Alt' }); }
    dosemeler.forEach((D, i) => { const d = S.geo.doseme[i]; ekle('Üst döşeme ' + (d.ad || i + 1) + ' (h=' + r2(d.t * 100) + ' cm)', d.t, S.mal.cD, { tsm: { yp: D.tsm.xp, yn: D.tsm.xn, xp: D.tsm.yp, xn: D.tsm.yn }, emn: { yp: D.emn.xp, yn: D.emn.xn, xp: D.emn.yp, xn: D.emn.yn } }, { p: false, n: false }, D.Vd, { y: 'X yönü', x: 'Y yönü', p: 'Üst (mesnet)', n: 'Alt (açıklık)' }); });
    // zemin gerilmesi + kaldırma
    const g = S.geo, A = GM.A;
    const Wr = MAL.gc0 * g.hr * A, Ww = GM.walls.reduce((s, w) => s + MAL.gc0 * w.t * GM.Hn * w.L, 0), Wd = (g.doseme || []).reduce((s, d) => s + (MAL.gc0 * d.t + d.g) * (d.x1 - d.x0) * (d.y1 - d.y0), 0), Qd = (g.doseme || []).reduce((s, d) => s + d.q * (d.x1 - d.x0) * (d.y1 - d.y0), 0);
    const Asu = GM.comps.reduce((s, c) => s + (c.x1 - c.x0) * (c.y1 - c.y0), 0), Wsu = gw * YK.hw * Asu;
    const Apab = A - g.Lx * g.Ly, hT = Math.max(0, g.kZemin - GM.zTop);
    const Wt = Apab * (YK.yas && YK.yas > GM.zTop ? (S.zemin.g * Math.max(0, g.kZemin - YK.yas) + (S.zemin.gs - gw) * (Math.min(YK.yas, g.kZemin) - GM.zTop)) : S.zemin.g * hT);
    const U = YK.yas ? gw * (YK.yas - g.kAlt) * A : 0;
    const Ntop = Wr + Ww + Wd + Qd + Wsu + Wt;
    const zem = { Wr, Ww, Wd, Qd, Wsu, Wt, U, A, Ntop, sOrt: (Ntop - U) / A, sMax: radye.qmax, sig: S.zemin.sig, ok: Math.max((Ntop - U) / A, radye.qmax) <= S.zemin.sig };
    const kald = { Wdir: Wr + Ww + Wd + Wt, U, FS: U > 0 ? (Wr + Ww + Wd + Wt) / U : Infinity, gerekli: S.tas.FSk }; kald.ok = kald.FS >= kald.gerekli;
    const ok = tasarim.every(t => t.katman.every(k => k.sec.ok) && t.kesme.ok) && zem.ok && kald.ok;
    const R = { S: JSON.parse(JSON.stringify(S)), MAL, IT, GM, YK, perdeler, radye, dosemeler, gDis, gIc, tasarim, zem, kald, ok, uyar, sure: Date.now() - t0 };
    R.metraj = P.metraj(R);
    return R;
  };

  /* KALINLIK SINIRLARI (docs/tasarim-standartlari.md › "Statik ve donatı" › kalınlık basamakları; Çokal AAT statik raporundaki 14 yapıdan):
     kalınlıklar 5 cm adımlı değil basamaklıdır; dış perde en ince max(25 cm, H/18), en kalın H/9,5'i karşılayan ilk basamak;
     radye perdenin en çok iki basamak üstü; üst döşeme 15 – 30 cm. Öneri bu aralığın dışına çıkmaz. */
  P.KALINLIK = { basamak: [0.20, 0.25, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80], doseme: [0.15, 0.20, 0.25, 0.30], perdeMin: 0.25, inceOran: 18, kalinOran: 9.5, radyeEk: 2 };
  const basUst = (v, L) => { const b = (L || P.KALINLIK.basamak).find(x => x >= v - 1e-6); return b == null ? (L || P.KALINLIK.basamak).slice(-1)[0] : b; };   // v'yi karşılayan ilk basamak
  const basSonra = (t, L) => (L || P.KALINLIK.basamak).find(x => x > t + 1e-6);                                                                                // bir üst basamak (yoksa undefined)
  /* perde yüksekliği H (m) → dış perde için kabul edilen kalınlık aralığı */
  P.perdeKalinlikAraligi = H => { const K = P.KALINLIK, min = basUst(Math.max(K.perdeMin, H / K.inceOran)); return { H, min, max: Math.max(min, basUst(H / K.kalinOran)) }; };
  P.kalinlikSinir = S => { const g = S.geo, K = P.KALINLIK, H = Math.max(0.5, (+g.kUst || 0) - (+g.kAlt || 0) - (+g.hr || 0)), p = P.perdeKalinlikAraligi(H);
    let rMax = Math.max(0.40, g.tw); for (let i = 0; i < K.radyeEk; i++) rMax = basSonra(rMax) || rMax;
    return { H, perde: p, radyeMax: rMax, dosemeMax: K.doseme.slice(-1)[0] }; };

  /* kalınlık önerisi: yetersiz (ya da donatı oranı %1'i geçen) eleman bir üst kalınlık basamağına çıkarılır, yeniden hesaplanır.
     Her eleman grubu turda en çok bir basamak büyür ve firma aralığını (P.kalinlikSinir) aşmaz; üst sınırda da yetmiyorsa kalınlık
     büyütülmez, neden yetmediği `sinir` listesinde bildirilir (çözüm kalınlık değil: donatı, ara mesnet, açıklık). */
  P.kalinlikOner = (S, maxIter = 12) => {
    const S2 = JSON.parse(JSON.stringify(S)); let R = P.hesapla(S2), it = 0; const log = [], sinir = [], dolu = new Set();
    const cm = v => r2(v * 100), agirT = t => t.katman.some(k => k.sec.ok && k.sec.As > 0.01 * t.h), yetersizT = t => !(t.katman.every(k => k.sec.ok) && t.kesme.ok);
    const ustSinir = (anahtar, ad, t, max, yetersiz) => { if (yetersiz && !dolu.has(anahtar)) { dolu.add(anahtar); sinir.push(`${ad} ${cm(t)} cm üst sınırda (en çok ${cm(max)} cm): kalınlık artırılmadı — donatıyı sıklaştırın ya da ara mesnet (bölme perdesi, payanda, kiriş) ekleyin.`); } };
    while (it++ < maxIter) {
      const L = P.kalinlikSinir(S2), g = S2.geo, ist = {};           // ist: bu turda büyütülecek gruplar → yetersiz mi (true) yoksa yalnız ağır donatılı mı (false)
      for (const t of R.tasarim) {
        const y = yetersizT(t), a = agirT(t); if (!y && !a) continue;  // brüt donatı oranı > %1 → ekonomik değil
        const k = /^Dış perde/.test(t.eleman) ? 'tw' : /^Ara perde/.test(t.eleman) ? 'ti' : /^Radye/.test(t.eleman) ? 'hr' : 'd' + g.doseme.findIndex(d => t.eleman.includes(' ' + (d.ad || '') + ' '));
        if (k !== 'd-1') ist[k] = ist[k] || y;
      }
      if (!R.kald.ok) ist.hr = true;
      let degisti = false;
      for (const [k, y] of Object.entries(ist)) {
        if (k === 'tw') { const n = basSonra(g.tw); if (n != null && n <= L.perde.max + 1e-9) { g.tw = n; degisti = true; log.push('Dış perde → ' + cm(n) + ' cm'); } else ustSinir(k, 'Dış perde', g.tw, L.perde.max, y); }
        else if (k === 'ti') { const n = basSonra(g.ti), mx = Math.min(L.perde.max, Math.max(g.tw, g.ti)); if (n != null && n <= mx + 1e-9) { g.ti = n; degisti = true; log.push('Ara perde → ' + cm(n) + ' cm'); } else ustSinir(k, 'Ara perde', g.ti, mx, y); }
        else if (k === 'hr') { const n = basSonra(g.hr); if (n != null && n <= L.radyeMax + 1e-9) { g.hr = n; degisti = true; log.push('Radye → ' + cm(n) + ' cm'); } else ustSinir(k, 'Radye', g.hr, L.radyeMax, y); }
        else { const d = g.doseme[+k.slice(1)], n = basSonra(d.t, P.KALINLIK.doseme); if (n != null) { d.t = n; degisti = true; log.push('Döşeme ' + d.ad + ' → ' + cm(n) + ' cm'); } else ustSinir(k, 'Döşeme ' + d.ad, d.t, L.dosemeMax, y); }
      }
      if (!R.kald.ok) { g.toe = r2(g.toe + 0.20); degisti = true; log.push('Kaldırma: pabuç ' + cm(g.toe) + ' cm'); }
      if (!R.zem.ok) { g.toe = r2(g.toe + 0.25); degisti = true; log.push('Zemin gerilmesi: pabuç ' + cm(g.toe) + ' cm'); }
      if (!degisti) break;
      R = P.hesapla(S2);
    }
    for (const s of sinir) log.push('⚠ ' + s);
    return { S: S2, R, log, sinir };
  };

  /* ================= DONATI METRAJI ================= */
  P.agirlik = F => 0.006165 * F * F; // kg/m (Φ mm)
  P.metraj = (R) => {
    const S = R.S, g = S.geo, c = S.mal, GM = R.GM, lb = R.MAL.lb, poz = [];
    const sec = (el, yon, yuz) => { const t = R.tasarim.find(x => x.eleman.startsWith(el)); if (!t) return null; const k = t.katman.find(q => q.yon === yon && q.yuz === yuz); return k && k.sec.ok !== undefined ? k.sec : null; };
    const add = (eleman, tanim, s, boy, adet, sekil) => { if (!s || !s.F || !s.ok || !(adet > 0)) return; poz.push({ no: poz.length + 1, eleman, tanim, F: s.F, s: s.s, boy: r2(boy), adet: Math.ceil(adet), sekil }); };
    const H = g.kUst - g.kAlt, Hn = GM.Hn;
    // dış perdeler
    const perimC = 2 * ((GM.xC[GM.xC.length - 1] - GM.xC[0]) + (GM.yC[GM.yC.length - 1] - GM.yC[0]));
    const perimD = 2 * (g.Lx + g.Ly) - 8 * c.cP, perimI = GM.comps.reduce((s, q) => s + 2 * ((q.x1 - q.x0) + (q.y1 - q.y0)), 0) - 8 * c.cP * GM.comps.length;
    const lap = (L, F) => Math.max(0, Math.ceil(L / 12) - 1) * lb * F / 1000;
    let s;
    if ((s = sec('Dış perde', 'Düşey', 'Dış yüz'))) add('Dış perde', 'Düşey dış (filiz radyeye L)', s, H - 2 * c.cP + Math.max(0.30, 20 * s.F / 1000), perimC / s.s, 'L');
    if ((s = sec('Dış perde', 'Düşey', 'İç yüz'))) add('Dış perde', 'Düşey iç (filiz radyeye L)', s, H - 2 * c.cP + Math.max(0.30, 20 * s.F / 1000), perimC / s.s, 'L');
    if ((s = sec('Dış perde', 'Yatay', 'Dış yüz'))) add('Dış perde', 'Yatay dış (çevre, bindirmeli)', s, perimD + lap(perimD, s.F), Hn / s.s + 1, 'C');
    if ((s = sec('Dış perde', 'Yatay', 'İç yüz'))) add('Dış perde', 'Yatay iç (bölme çevresi)', s, perimI + GM.comps.length * lap(perimI / GM.comps.length, s.F), Hn / s.s + 1, 'C');
    const ic = GM.walls.filter(w => w.tip === 'ic'), icL = ic.reduce((t, w) => t + w.L, 0);
    if (ic.length) {
      for (const yz of ['Yüz 1', 'Yüz 2']) {
        if ((s = sec('Ara perde', 'Düşey', yz))) add('Ara perde', 'Düşey ' + yz.toLowerCase() + ' (filiz radyeye L)', s, H - 2 * c.cP + Math.max(0.30, 20 * s.F / 1000), icL / s.s, 'L');
        if ((s = sec('Ara perde', 'Yatay', yz))) for (const w of ic) add('Ara perde', 'Yatay ' + yz.toLowerCase() + ' (' + w.ad.replace('Ara perde ', '') + ', uçlar dış perdeye kenetli)', s, w.L + 2 * (g.tw / 2 - c.cP) + 2 * Math.max(0.15, 12 * s.F / 1000), Hn / s.s + 1, 'U');
      }
    }
    // radye
    const LXr = GM.R.x1 - GM.R.x0, LYr = GM.R.y1 - GM.R.y0, bk = g.hr - 2 * c.cR;
    if ((s = sec('Radye', 'X yönü', 'Alt'))) add('Radye', 'Alt X (uçlar kıvrık)', s, LXr - 2 * c.cR + 2 * bk + lap(LXr, s.F), (LYr - 2 * c.cR) / s.s + 1, 'U');
    if ((s = sec('Radye', 'Y yönü', 'Alt'))) add('Radye', 'Alt Y (uçlar kıvrık)', s, LYr - 2 * c.cR + 2 * bk + lap(LYr, s.F), (LXr - 2 * c.cR) / s.s + 1, 'U');
    if ((s = sec('Radye', 'X yönü', 'Üst'))) add('Radye', 'Üst X (uçlar kıvrık)', s, LXr - 2 * c.cR + 2 * bk + lap(LXr, s.F), (LYr - 2 * c.cR) / s.s + 1, 'U');
    if ((s = sec('Radye', 'Y yönü', 'Üst'))) add('Radye', 'Üst Y (uçlar kıvrık)', s, LYr - 2 * c.cR + 2 * bk + lap(LYr, s.F), (LXr - 2 * c.cR) / s.s + 1, 'U');
    // döşemeler
    (g.doseme || []).forEach(d => {
      const el = 'Üst döşeme ' + (d.ad || ''), lx = d.x1 - d.x0, ly = d.y1 - d.y0, k = Math.max(0.15, 10 * 0.012);
      if ((s = sec(el, 'X yönü', 'Alt (açıklık)'))) add(el, 'Alt X', s, lx + 2 * k, ly / s.s + 1, 'D');
      if ((s = sec(el, 'Y yönü', 'Alt (açıklık)'))) add(el, 'Alt Y', s, ly + 2 * k, lx / s.s + 1, 'D');
      if ((s = sec(el, 'X yönü', 'Üst (mesnet)'))) add(el, 'Üst X (mesnet ilavesi, iki kenar)', s, lx / 4 + 0.40, 2 * (ly / s.s + 1), 'D');
      if ((s = sec(el, 'Y yönü', 'Üst (mesnet)'))) add(el, 'Üst Y (mesnet ilavesi, iki kenar)', s, ly / 4 + 0.40, 2 * (lx / s.s + 1), 'D');
    });
    poz.forEach(p => { p.top = r2(p.boy * p.adet); p.kg = p.top * P.agirlik(p.F); });
    const caplar = [...new Set(poz.map(p => p.F))].sort((a, b) => a - b);
    const ozet = caplar.map(F => { const L = poz.filter(p => p.F === F).reduce((s, p) => s + p.top, 0); return { F, L: r2(L), birim: P.agirlik(F), kg: L * P.agirlik(F) }; });
    const top = ozet.reduce((s, o) => s + o.kg, 0);
    const beton = { radye: GM.A * g.hr, perde: GM.walls.reduce((s2, w) => s2 + w.t * GM.Hn * w.L, 0), doseme: (g.doseme || []).reduce((s2, d) => s2 + d.t * (d.x1 - d.x0) * (d.y1 - d.y0), 0) };
    beton.top = beton.radye + beton.perde + beton.doseme;
    return { poz, ozet, top, beton, lb };
  };
})(typeof window !== 'undefined' ? window : globalThis);

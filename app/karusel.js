/* ArıtmaCAD — KARUSEL (oksidasyon hendeği) HAVALANDIRMA HAVUZU şablonu
   Kaynak düzen: Zeytinli AAT T107 (PFT-0401…0406). Ölçüler metre.
   Bir havuz: dış duvar iç yüzü Ro yarıçaplı yarış pisti; ortada tw kalınlıklı orta duvar (uçları yuvarlak);
   her dönüşte orta duvar ucuna merkezli rg–rg+tg yarım halka kılavuz duvar; iki koridor b = Ro − tw/2.
   Varlık: { type:'karusel', u:'bio', o, rot, N, Ls, Ro, tw, two, rg, tg, ara[], h, fb, zt, tb, ... }
   - Mikserler mikser programının itki dengesi yöntemiyle otomatik seçilir (C.mikserSec).
   - Merdiven yüksekliği arazi kotundan (ARAZI) güncellenir.
   - Ünite / ekipman numaraları ünite ekle-çıkar ile otomatik yeniden verilir (C.uniteNumarala). */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, RAD = Math.PI / 180;
  const { L, P, CI, A, TX } = C.prim;
  const { ext, boxM } = C.meshDef;
  const tH = mm => C.annoH(mm == null ? C.doc.set.textH : mm);
  const f2 = v => M.fmt(v, 2).replace('.', ','), f1 = v => M.fmt(v, 1).replace('.', ','), f0 = v => Math.round(v).toLocaleString('tr-TR');
  const LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  /* Zeytinli T107 varsayılanları */
  const DEF = { N: 4, Ls: 135, Ro: 9.0, tw: 0.40, two: 0.80, rg: 4.40, tg: 0.40, ara: [0, 0.83, 0], h: 6.45, fb: 1.05, zt: 5.69, tb: 0.60,
    xm: 17.5, nMix: 4, dif: { x0: 23.0, x1: 116.0, sx: 0.80, sy: 0.88, n: 0 }, zg: 4.00, merd: [{ x: -1, y: -1 }], rise: 0.18, going: 0.30, mw: 1.0,
    kapGiris: '3000×2250', kapCikis: '3000×1500' };
  C.KARUSEL_DEF = DEF;

  /* ================= MİKSER SEÇİMİ (mikser programının itki dengesi) =================
     Kaynak: app/hesap/mikser.html — LIB, PROC.ditch, geometry() 'oval', mixerCalc(), analyse(). */
  const MLIB = {
    slow25: { name: 'Yavaş devirli Ø2,5', D: 2.5, rpm: 40, P: 3.0 },
    slow18: { name: 'Yavaş devirli Ø1,8', D: 1.8, rpm: 55, P: 2.2 },
    mid75: { name: 'Orta devirli Ø0,75', D: 0.75, rpm: 480, P: 4.0 },
    fast37: { name: 'Kompakt Ø0,37', D: 0.37, rpm: 1400, P: 2.5 },
  };
  const MPAR = { rho: 1000, lam: 0.03, zTurnOval: 0.8, etaInst: 0.85, fm: 0.65, vTarget: 0.30, pMin: 1, pMax: 4 };
  C.MIKSER_LIB = MLIB;
  C.mikserSec = function (o) { // o: { b, tw, Ls, H, n0 (havuz başına mikser sayısı; boşsa otomatik), lib (zorunlu tip) }
    const Ro = o.b + o.tw / 2, ri = o.tw / 2, H = o.H, Ls = o.Ls, rho = MPAR.rho;
    const area = Ls * 2 * Ro + Math.PI * Ro * Ro - (Ls * o.tw + Math.PI * o.tw * o.tw / 4), V = area * H;
    const w = Ro - ri, Ac = w * H, Dh = 4 * Ac / (w + 2 * H), Lpath = 2 * Ls + 2 * Math.PI * (ri + Ro) / 2;
    const zeta = MPAR.lam * Lpath / Dh + 2 * MPAR.zTurnOval;
    const Freq = 0.5 * rho * MPAR.vTarget ** 2 * Ac * zeta, FreqGross = Freq / MPAR.etaInst;
    const cands = [];
    for (const [k, m] of Object.entries(MLIB)) {
      if (o.lib && o.lib !== k) continue;
      const Am = Math.PI * m.D * m.D / 4, F = Math.cbrt(2 * rho * Am) * Math.pow(MPAR.fm * m.P * 1000, 2 / 3);
      const etaFree = Math.max(0.3, Math.min(1, (Ls - 2) / (5 * m.D)));
      let n = o.n0 || Math.max(2, Math.ceil(FreqGross / (F * etaFree)));
      if (!o.n0 && n % 2) n++; // her düz kısımda eşit sayı
      const Feff = n * F * MPAR.etaInst * etaFree, v = Math.sqrt(2 * Feff / (rho * Ac * zeta)), Ptot = n * m.P;
      const pSpec = Ptot * 1000 / V, fitW = 0.75 * m.D * 2 * Math.ceil(n / 2) <= o.b; // koridora sığar mı (0,75·D yan boşluk)
      const ok = v >= MPAR.vTarget - 1e-9 && fitW && m.D / 2 + 0.3 <= H / 2;
      cands.push({ k, ...m, n, F, Feff, v, Ptot, pSpec, ok, warn: pSpec < MPAR.pMin ? 'özgül güç alt sınırın altında' : pSpec > MPAR.pMax ? 'özgül güç üst sınırın üstünde' : '' });
    }
    const okC = cands.filter(c => c.ok).sort((a, b) => a.Ptot - b.Ptot || b.D - a.D);
    const best = okC[0] || cands.sort((a, b) => b.v - a.v)[0];
    return Object.assign({ V, Ac, zeta, Freq, FreqGross, area, cands }, best);
  };

  /* ================= GEOMETRİ ================= */
  const P_ = e => Object.assign({}, DEF, e, { dif: Object.assign({}, DEF.dif, e.dif || {}) });
  function geo(e) {
    const q = P_(e), N = Math.max(1, Math.round(q.N)), out = { q, N, basins: [] };
    const xc1 = q.two + q.Ro, xc2 = xc1 + q.Ls;
    let y = q.two;
    for (let i = 0; i < N; i++) {
      if (i > 0) y += (q.ara[i] || 0) + q.two; // havuzlar arası ortak duvar + ek aralık
      const yc = y + q.Ro; out.basins.push({ i, yc, xc1, xc2, let: LET[i] });
      y = yc + q.Ro;
    }
    out.Lo = xc2 + q.Ro + q.two; out.Wo = y + q.two; out.xc1 = xc1; out.xc2 = xc2;
    out.b = q.Ro - q.tw / 2; out.Htot = q.h + q.fb; out.zIn = q.zt - out.Htot;
    // hacim
    const ring = Math.PI * ((q.rg + q.tg) ** 2 - q.rg ** 2); // iki uçta yarım halka = 1 tam halka
    out.Abas = q.Ls * 2 * q.Ro - q.Ls * q.tw + Math.PI * q.Ro * q.Ro - ring; out.V = out.Abas * q.h * N;
    // difüzör sayısı (ızgara): her koridorda x0..x1 boyunca sx, enine sy
    const nx = Math.max(0, Math.floor((q.dif.x1 - q.dif.x0) / q.dif.sx) + 1), ny = Math.max(0, Math.floor((out.b - 0.6) / q.dif.sy) + 1);
    out.difGrid = { nx, ny, perBasin: 2 * nx * ny }; out.nDif = q.dif.n > 0 ? q.dif.n : out.difGrid.perBasin * N;
    // mikser
    const key = [out.b, q.tw, q.Ls, q.h, q.nMix, q.mlib].join('|');
    if (!e._mx || e._mx.key !== key) e._mx = { key, r: C.mikserSec({ b: out.b, tw: q.tw, Ls: q.Ls, H: q.h, n0: q.nMix || 0, lib: q.mlib }) };
    out.mix = e._mx.r;
    return out;
  }
  C.karuselGeo = geo;

  /* hesaptan gelen hacme göre düz uzunluk */
  C.karuselLs = (V, e) => { const q = P_(e), N = Math.max(1, Math.round(q.N)), ring = Math.PI * ((q.rg + q.tg) ** 2 - q.rg ** 2); const A = V / (q.h * N); return Math.max(10, (A - Math.PI * q.Ro * q.Ro + ring) / (2 * q.Ro - q.tw)); };

  /* ünite numarası → etiket kökü: T107 → 107 */
  const unum = e => (String(e.code || '').match(/\d+/) || ['1xx'])[0];

  /* merdiven: arazi kotu */
  function zemin(e, p) {
    const ars = C.doc.ents.filter(x => x.type === 'arazi');
    for (const a of ars) { const z = C.araziKot && C.araziKot(a, p); if (z != null) return { z: z - (a.ref || 0), src: 'arazi' }; }
    return { z: P_(e).zg, src: 'varsayılan' };
  }
  function stairs(e, G, f) {
    const q = G.q, out = [];
    (q.merd || []).forEach((m, k) => {
      const lx = m.x < 0 ? G.xc1 - q.Ro * 0.2 : m.x, ly = m.y < 0 ? -q.mw - 0.3 : m.y; // varsayılan: ilk havuzun sol-alt dış yüzü boyunca
      const pw = f.at(lx, ly, 0), zg = zemin(e, pw), H = Math.max(0, q.zt - zg.z);
      const n = Math.max(1, Math.ceil(H / q.rise - 1e-9)), r = H / n, len = (n - 1) * q.going;
      out.push({ k, lx, ly, n, r, len, H, zg: zg.z, src: zg.src, w: q.mw });
    });
    return out;
  }
  C.karuselMerdiven = e => { const G = geo(e); return stairs(e, G, C.frame(e.o, e.rot)); };

  /* ================= ÇİZİM ================= */
  const ringPts = (cx, cy, r, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * RAD; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; };
  const sector = (cx, cy, r1, r2, a0, a1) => { const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 6)); return [...ringPts(cx, cy, r2, a0, a1, n), ...ringPts(cx, cy, r1, a1, a0, n)]; };
  function wallsLocal(G) { // 2B duvar poligonları (yerel), plan ve 3B için
    const q = G.q, W = [];
    for (const B of G.basins) {
      const { yc, xc1, xc2 } = B;
      W.push({ t: 'out', pts: [[xc1, yc - q.Ro - q.two], [xc2, yc - q.Ro - q.two], [xc2, yc - q.Ro], [xc1, yc - q.Ro]] });
      W.push({ t: 'out', pts: [[xc1, yc + q.Ro], [xc2, yc + q.Ro], [xc2, yc + q.Ro + q.two], [xc1, yc + q.Ro + q.two]] });
      W.push({ t: 'out', pts: sector(xc1, yc, q.Ro, q.Ro + q.two, 90, 270) });
      W.push({ t: 'out', pts: sector(xc2, yc, q.Ro, q.Ro + q.two, -90, 90) });
      const r = q.tw / 2; // orta duvar, uçları yuvarlak
      W.push({ t: 'mid', pts: [...ringPts(xc2, yc, r, -90, 90, 8), ...ringPts(xc1, yc, r, 90, 270, 8)] });
      W.push({ t: 'gui', pts: sector(xc1, yc, q.rg, q.rg + q.tg, 90, 270) });
      W.push({ t: 'gui', pts: sector(xc2, yc, q.rg, q.rg + q.tg, -90, 90) });
    }
    return W;
  }
  function mixPos(G) { // her havuzda: sol dönüş çıkışı üst koridor, sağ dönüş çıkışı alt koridor
    const q = G.q, n = G.mix.n, per = Math.ceil(n / 2), out = [];
    for (const B of G.basins) {
      let k = 0;
      for (const side of [0, 1]) {
        const cnt = side ? n - per : per; if (cnt <= 0) continue;
        const x = side ? B.xc2 - q.xm : B.xc1 + q.xm, dir = side ? 180 : 0;
        const y0 = side ? B.yc - q.tw / 2 - G.b : B.yc + q.tw / 2;
        for (let j = 0; j < cnt; j++) out.push({ B, x, y: y0 + G.b * (j + 0.5) / cnt, dir, idx: k++ });
      }
    }
    return out;
  }
  T.karusel = {
    label: 'Karusel havalandırma havuzu', ifc: 'IfcTank',
    prims: e => {
      const G = geo(e), q = G.q, f = C.frame(e.o, e.rot), z = q.zt, out = [], h = tH(), hB = tH(3.5);
      const rd = (() => { let r = ((e.rot || 0) % 360 + 360) % 360; if (r > 90 && r <= 270) r -= 180; return r * RAD; })();
      const PL = (pts, c, o) => P(pts.map(p => f.at(p[0], p[1], z)), c, o);
      for (const w of wallsLocal(G)) out.push(PL(w.pts, true, { lw: w.t === 'gui' ? 35 : 50, color: w.t === 'gui' ? 8 : undefined }));
      const un = unum(e);
      for (const B of G.basins) {
        // havuz adı, bölge
        out.push(TX(f.at((B.xc1 + B.xc2) / 2, B.yc + q.tw / 2 + G.b * 0.5, z), hB, `${e.code || ''}/${B.let}`, rd, 'M', { color: 2 }));
        // akış okları
        for (const [yy, s] of [[B.yc + q.tw / 2 + G.b * 0.5, 1], [B.yc - q.tw / 2 - G.b * 0.5, -1]]) {
          const xa = (B.xc1 + B.xc2) / 2 + s * q.Ls * 0.18, ln = Math.min(6, q.Ls * 0.05);
          out.push(L(f.at(xa - s * ln, yy - 1.2, z), f.at(xa + s * ln, yy - 1.2, z), { color: 5, lw: 35 }), L(f.at(xa + s * ln, yy - 1.2, z), f.at(xa + s * (ln - 1.2), yy - 0.7, z), { color: 5, lw: 35 }), L(f.at(xa + s * ln, yy - 1.2, z), f.at(xa + s * (ln - 1.2), yy - 1.7, z), { color: 5, lw: 35 }));
        }
        // difüzör alanları (ayrıntı: DIFUZORPAFTA)
        for (const [y0] of [[B.yc + q.tw / 2 + 0.3], [B.yc - q.tw / 2 - G.b + 0.3]]) {
          const x0 = B.xc1 + q.dif.x0, x1 = B.xc1 + Math.min(q.dif.x1, q.Ls), wy = G.b - 0.6;
          out.push(PL([[x0, y0], [x1, y0], [x1, y0 + wy], [x0, y0 + wy]], true, { color: 3, lw: 18, lt: 'DASHED' }));
          const ny = G.difGrid.ny, nxs = Math.min(G.difGrid.nx, 60), stepx = (x1 - x0) / Math.max(1, nxs - 1);
          for (let a = 0; a < nxs; a += 1) for (let b = 0; b < ny; b++) if ((a + b) % 3 === 0) out.push(CI(f.at(x0 + a * stepx, y0 + (ny > 1 ? b * wy / (ny - 1) : wy / 2), z), 0.115, { color: 3, lw: 9 }));
        }
        out.push(TX(f.at(B.xc1 + (q.dif.x0 + Math.min(q.dif.x1, q.Ls)) / 2, B.yc - q.tw / 2 - G.b * 0.5, z), h, `9" difüzör: ${f0(G.nDif / G.N)} adet`, rd, 'M', { color: 3 }));
        // kapaklar: giriş sağ uç, çıkış sol uç
        const gate = (x, lab, t) => { out.push(L(f.at(x, B.yc - 1.5, z), f.at(x, B.yc + 1.5, z), { color: 6, lw: 70 }), TX(f.at(x + (x > B.xc1 + 1 ? 0.8 : -0.8), B.yc + 2.0, z), h, `${lab}  ${t}`, rd, x > B.xc1 + 1 ? 'L' : 'R', { color: 6 })); };
        gate(B.xc2 + q.Ro + q.two / 2, `SK-${un}G/${B.let}`, q.kapGiris);
        gate(B.xc1 - q.Ro - q.two / 2, `SK-${un}C/${B.let}`, q.kapCikis);
        // ölçüler (yalnız ilk havuzda)
        if (B.i === 0) {
          const dl = (a, b, off, txt) => { const ax = f.at(a[0], a[1], z), bx = f.at(b[0], b[1], z), d = M.norm(M.sub(bx, ax)), nn = [-d[1] * off, d[0] * off, 0]; out.push(L(M.add(ax, nn), M.add(bx, nn), { color: 3, lw: 13 }), L(ax, M.add(ax, M.mul(nn, 1.1)), { color: 3, lw: 13 }), L(bx, M.add(bx, M.mul(nn, 1.1)), { color: 3, lw: 13 }), TX(M.add(M.lerp(ax, bx, 0.5), M.mul(nn, 1.35)), h, txt, rd + (Math.abs(d[1]) > 0.7 ? Math.PI / 2 : 0), 'C', { color: 3 })); };
          dl([B.xc1, B.yc - q.Ro - q.two], [B.xc2, B.yc - q.Ro - q.two], -h * 4, f2(q.Ls));
          dl([B.xc2 + q.Ro + q.two + 1, B.yc - q.tw / 2 - G.b], [B.xc2 + q.Ro + q.two + 1, B.yc - q.tw / 2], -h * 3, f2(G.b));
          dl([B.xc2 + q.Ro + q.two + 1, B.yc + q.tw / 2], [B.xc2 + q.Ro + q.two + 1, B.yc + q.tw / 2 + G.b], -h * 3, f2(G.b));
          out.push(TX(f.at(B.xc1 - q.Ro * 0.55, B.yc - q.Ro * 0.62, z), h, `R${f2(q.Ro)}`, rd, 'M', { color: 3 }));
        }
      }
      // mikserler
      const tags = C.karuselEtiket(e, G);
      mixPos(G).forEach((m, i) => {
        const c = [m.x, m.y], s = m.dir ? -1 : 1, D = G.mix.D, r = Math.max(0.35, D * 0.25);
        out.push(PL([[c[0] - s * r * 2.2, c[1] - r * 0.6], [c[0], c[1] - r * 0.6], [c[0], c[1] + r * 0.6], [c[0] - s * r * 2.2, c[1] + r * 0.6]], true, { color: 1, lw: 35 }));
        out.push(L(f.at(c[0] + s * 0.15, c[1] - D / 2, z), f.at(c[0] + s * 0.15, c[1] + D / 2, z), { color: 1, lw: 50 }));
        for (const dy of [-D * 0.3, 0, D * 0.3]) out.push(L(f.at(c[0] + s * 0.4, c[1] + dy, z), f.at(c[0] + s * 1.6, c[1] + dy, z), { color: 1, lw: 13 }));
        out.push(TX(f.at(c[0] - s * r * 2.6, c[1], z), h * 0.9, tags.mix[i] || '', rd, s > 0 ? 'R' : 'L', { color: 1 }));
      });
      // merdivenler
      for (const st of stairs(e, G, f)) {
        const x0 = st.lx, y0 = st.ly, w = st.w, Lm = Math.max(st.len, q.going);
        out.push(PL([[x0, y0], [x0 + Lm, y0], [x0 + Lm, y0 + w], [x0, y0 + w]], true, { color: 30, lw: 35 }));
        for (let k = 1; k < st.n; k++) out.push(L(f.at(x0 + k * q.going, y0, z), f.at(x0 + k * q.going, y0 + w, z), { color: 30, lw: 13 }));
        out.push(L(f.at(x0, y0 + w / 2, z), f.at(x0 + Lm, y0 + w / 2, z), { color: 30, lw: 13 }), L(f.at(x0 + Lm, y0 + w / 2, z), f.at(x0 + Lm - 0.3, y0 + w / 2 + 0.2, z), { color: 30, lw: 13 }));
        out.push(TX(f.at(x0 + Lm / 2, y0 - h * 1.2, z), h * 0.9, `Çelik merdiven ${st.n}×${f2(st.r * 100).replace(',00', '')}/${f0(q.going * 100)} — H=${f2(st.H)} (zemin ${C.fmtKot(st.zg)}${st.src === 'arazi' ? ', araziden' : ''})`, rd, 'C', { color: 30 }));
      }
      // başlık
      out.push(TX(f.at(G.Lo / 2, G.Wo + h * 9, z), tH(5), `${e.code || ''} ${e.name || 'Havalandırma havuzu'}`.trim(), rd, 'C', { color: 2 }));
      out.push(TX(f.at(G.Lo / 2, G.Wo + h * 5.5, z), h, `${G.N} havuz karusel · düz ${f1(q.Ls)} m · koridor ${f2(G.b)} m · su ${f2(q.h)} m · V = ${f0(G.V)} m³ · mikser ${G.N}×${G.mix.n} ${G.mix.name} ${f1(G.mix.P)} kW (v = ${f2(G.mix.v)} m/s)`, rd, 'C'));
      return out;
    },
    mesh: e => {
      const G = geo(e), q = G.q, f = C.frame(e.o, e.rot), zIn = G.zIn, H = q.zt - zIn, out = [];
      for (const w of wallsLocal(G)) out.push(ext(f.at(0, 0, zIn), f.ux, [0, 0, 1], w.pts, H));
      out.push(boxM(f, 0, 0, zIn - q.tb, G.Lo, G.Wo, q.tb));
      return out;
    },
    snaps: e => { const G = geo(e), f = C.frame(e.o, e.rot); return [[0, 0], [G.Lo, 0], [G.Lo, G.Wo], [0, G.Wo]].map(p => ({ p: f.at(p[0], p[1], P_(e).zt), k: 'end' })); },
    xf: (e, X) => { const G = geo(e), f = C.frame(e.o, e.rot); const o2 = X.mir ? X.p(f.at(0, G.Wo)) : X.p(e.o); const v = X.v([Math.cos((e.rot || 0) * RAD), Math.sin((e.rot || 0) * RAD), 0]); e.rot = Math.atan2(v[1], v[0]) / RAD; e.o = [o2[0], o2[1], 0]; },
    info: e => { const G = geo(e); return `${e.code || ''} karusel: ${G.N} havuz, düz ${f1(G.q.Ls)} m, koridor ${f2(G.b)} m, V=${f0(G.V)} m³, ${G.mix.n}×${G.mix.name}/havuz, ${f0(G.nDif)} difüzör`; },
  };

  /* ekipman etiketleri (ünite numarasından): mikser Z-107/A…, kapak SK-… */
  C.karuselEtiket = (e, G) => { G = G || geo(e); const un = unum(e), mix = mixPos(G).map((m, i) => `Z-${un}/${LET[i] || i + 1}`); return { mix }; };

  /* ================= KESİT için yerleşim (KESITUNITE ile ortak) ================= */
  function lay(e) {
    const G = geo(e), q = G.q, B0 = G.basins[0], walls = [], parts = [], cells = [];
    for (const B of G.basins) {
      walls.push([B.xc1, B.yc - q.Ro - q.two, q.Ls, q.two], [B.xc1, B.yc + q.Ro, q.Ls, q.two]);
      parts.push([B.xc1, B.yc - q.tw / 2, q.Ls, q.tw]);
      cells.push({ x: B.xc1, y: B.yc - q.tw / 2 - G.b, L: q.Ls, W: G.b, lab: `${B.let} koridor` }, { x: B.xc1, y: B.yc + q.tw / 2, L: q.Ls, W: G.b, lab: `${B.let} koridor` });
    }
    // boyuna kesit (ilk koridor ekseni) için uç duvar ve kılavuz duvar kesişimleri
    const dy = q.tw / 2 + G.b / 2, yl = B0.yc - dy, e1 = (r) => (r > dy ? Math.sqrt(r * r - dy * dy) : null);
    for (const [xc, s] of [[B0.xc1, -1], [B0.xc2, 1]]) {
      const a = e1(q.Ro), b = e1(q.Ro + q.two);
      if (a != null && b != null) walls.push([s < 0 ? xc - b : xc + a, yl - 0.01, b - a, 0.02]);
      const g1 = e1(q.rg + q.tg), g0 = e1(q.rg);
      if (g1 != null) { const w = g1 - (g0 || 0); parts.push([s < 0 ? xc - g1 : xc + (g0 || 0), yl - 0.01, w, 0.02]); }
    }
    // KESITUNITE ilk hücrenin ortasından keser: boyuna = koridor ekseni, enine = düz kısmın ortası
    cells.unshift({ x: 0, y: yl - G.b / 2, L: G.Lo, W: G.b, lab: `${B0.let} koridor` });
    return { cells, walls, parts, circles: [], pumps: [], Lo: G.Lo, Wo: G.Wo, Htot: G.Htot, hw: q.h, open: false };
  }
  const baseLayout = C.uniteLayout;
  C.uniteLayout = e => (e && e.type === 'karusel' ? lay(e) : baseLayout(e));

  /* ================= ÜNİTE NUMARALANDIRMA ================= */
  const ORDER = C.PROSES_ORDER || ['cs', 'ps', 'fs', 'gr', 'pc', 'cp', 'an', 'bio', 'sc', 'pt', 'et', 'dw', 'uv'];
  C.uniteNumarala = function (quiet) {
    if (!C.doc) return 0;
    const list = C.doc.ents.filter(e => (e.type === 'unite' || e.type === 'karusel'));
    const set = C.doc.set, base = set.uniteBas != null ? set.uniteBas : 101, pre = set.uniteOnek || 'T';
    const sorted = list.slice().sort((a, b) => ((ORDER.indexOf(a.u) + 1 || 99) - (ORDER.indexOf(b.u) + 1 || 99)) || (a.sira || a.id) - (b.sira || b.id));
    let n = 0, used = new Set(list.filter(e => e.kodSabit).map(e => e.code));
    let k = base;
    for (const e of sorted) {
      if (e.kodSabit) continue;
      while (used.has(pre + k)) k++;
      const code = pre + k++; used.add(code);
      if (e.code !== code) { e.code = code; delete e._c; n++; }
    }
    if (n) { C.changed(); if (!quiet) C.log(`Ünite numaraları güncellendi (${n} ünite).`); }
    return n;
  };
  let lastCount = -1;
  C.on('changeIdle', () => { const c = C.doc ? C.doc.ents.filter(e => e.type === 'unite' || e.type === 'karusel').map(e => e.id + ':' + e.u).join(',') : ''; if (c !== lastCount) { lastCount = c; C.uniteNumarala(); } });
  C.addCommand(['UNITENUMARA', 'NUMARALA'], 'Üniteleri akış sırasına göre yeniden numaralar: UNITENUMARA [BAS=101 ONEK=T]', async (I) => {
    const kv = {}; C.cmd.queue = C.cmd.queue.filter(t => { const m = t.match(/^([A-Za-z]+)=(.*)$/); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; });
    if (kv.BAS) C.doc.set.uniteBas = +kv.BAS; if (kv.ONEK) C.doc.set.uniteOnek = kv.ONEK;
    C.doc.ents.forEach(e => { if (e.type === 'unite' || e.type === 'karusel') delete e.kodSabit; });
    const n = C.uniteNumarala(true); C.log(`✓ Numaralandırma: ${n} ünite değişti.`);
  });

  /* ================= MEKANİK LİSTE ================= */
  C.mekListe = function (ents) {
    ents = ents || C.doc.ents; const rows = [];
    for (const e of ents) {
      if (e.type !== 'karusel') continue;
      const G = geo(e), q = G.q, tags = C.karuselEtiket(e, G), mx = G.mix, un = unum(e);
      rows.push({ tag: tags.mix.length ? `${tags.mix[0]} … ${tags.mix[tags.mix.length - 1]}` : '', mal: `Dalgıç mikser, ${mx.name}, ${mx.rpm} d/dk`, oz: `P=${f1(mx.P)} kW, itki≈${f0(mx.F)} N, v=${f2(mx.v)} m/s, özgül güç ${f2(mx.pSpec)} W/m³`, q: tags.mix.length, unit: 'adet', unite: e.code });
      rows.push({ tag: `D-${un}`, mal: '9" disk difüzör (EPDM membran)', oz: `ızgara ${f2(q.dif.sx)}×${f2(q.dif.sy)} m`, q: G.nDif, unit: 'adet', unite: e.code });
      rows.push({ tag: `SK-${un}G/A…`, mal: 'Motor kumandalı sürgülü kapak (giriş)', oz: q.kapGiris, q: G.N, unit: 'adet', unite: e.code });
      rows.push({ tag: `SK-${un}C/A…`, mal: 'Motor kumandalı sürgülü kapak (çıkış)', oz: q.kapCikis, q: G.N, unit: 'adet', unite: e.code });
      const st = stairs(e, G, C.frame(e.o, e.rot));
      if (st.length) rows.push({ tag: '', mal: 'Çelik merdiven', oz: st.map(s => `${s.n} basamak, H=${f2(s.H)} m`).join('; '), q: st.length, unit: 'adet', unite: e.code });
    }
    return rows.map((r, i) => Object.assign({ poz: i + 1 }, r));
  };
  const baseBom = C.bom;
  if (baseBom) C.bom = function (ents) {
    const rows = baseBom(ents), extra = C.mekListe(ents);
    const all = rows.concat(extra.map(r => ({ mal: `${r.tag ? r.tag + ' ' : ''}${r.mal}${r.oz ? ' — ' + r.oz : ''}`, dn: null, q: r.q, unit: r.unit })));
    return all.map((r, i) => Object.assign({}, r, { poz: i + 1 }));
  };
  C.addCommand(['MEKLISTE', 'MEKANIKLISTE', 'EKIPMANLISTESI'], 'Mekanik ekipman listesi (mikser, difüzör, kapak, merdiven): MEKLISTE [CSV]', async (I) => {
    const rows = C.mekListe(); if (!rows.length) return C.warn('Listede ekipman yok (önce KARUSEL ile havuz yerleştirin).');
    rows.forEach(r => C.log(`${r.poz}. ${r.unite} ${r.tag} — ${r.mal}; ${r.oz} — ${r.q} ${r.unit}`));
    const a = await I.kw('Ne yapılsın', [['CSV', 'Excel (CSV) indir'], ['TABLO', 'Çizime tablo'], ['YOK', 'Sadece listele']], 'CSV');
    if (a === 'CSV' && C.download) { const csv = '﻿Poz;Ünite;Etiket;Tanım;Özellik;Adet;Birim\n' + rows.map(r => [r.poz, r.unite, r.tag, r.mal, r.oz, r.q, r.unit].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n'); C.download(csv, 'mekanik_liste.csv', 'text/csv'); }
    if (a === 'TABLO' && C.bomTable) { const p = await I.pt('Tablonun sol üst köşesi'); if (p && typeof p !== 'string') C.bomTable(rows.map(r => ({ poz: r.poz, mal: `${r.tag} ${r.mal} — ${r.oz}`, dn: null, q: r.q, unit: r.unit })), p); }
  }, { noUndo: true });

  /* ================= KOMUTLAR ================= */
  const takeKV = () => { const kv = {}; C.cmd.queue = C.cmd.queue.filter(t => { const m = t.match(/^([A-Za-zÇĞİÖŞÜçğıöşü_0-9]+)=(.*)$/); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; }); return kv; };
  const KV_MAP = { N: 'N', LS: 'Ls', R: 'Ro', ORTA: 'tw', DIS: 'two', H: 'h', HP: 'fb', Z: 'zt', TABAN: 'tb', XM: 'xm', MIKSER: 'nMix', ZEMIN: 'zg' };
  C.addCommand(['KARUSEL', 'KARUSELHAVUZ', 'HAVALANDIRMAHAVUZU'], 'Karusel havalandırma havuzu (Zeytinli T107 düzeni). KARUSEL [N=4 LS=135 R=9 H=6.45 Z=5.69 MIKSER=… V=hacim]; hacim proses verisinden de alınır', async (I) => {
    const kv = takeKV(), e = C.newEnt('karusel', Object.assign(JSON.parse(JSON.stringify(DEF)), { layer: C.std('BETON'), u: 'bio', name: 'Havalandırma havuzu', o: [0, 0, 0], rot: 0, sira: Date.now() }));
    for (const [k, p] of Object.entries(KV_MAP)) if (kv[k] != null && !isNaN(C.num(kv[k]))) e[p] = C.num(kv[k]);
    let V = kv.V != null ? C.num(kv.V) : null; const j = C.proses && C.proses();
    if (V == null && j && j.units && j.units.bio) { const d = j.units.bio.dim; V = (d.N || 1) * d.L * d.W * d.h; if (kv.H == null) e.h = d.h; if (kv.N == null && d.N) e.N = Math.max(1, Math.round(d.N)); }
    if (V != null && kv.LS == null) { e.Ls = Math.round(C.karuselLs(V, e) * 2) / 2; e.vHesap = V; C.log(`Hesap hacmi ${f0(V)} m³ → düz uzunluk ${f1(e.Ls)} m`); }
    C.cmd.base = null; C.cmd.preview = c => T.karusel.prims(Object.assign({}, e, { o: c, _c: null }));
    const p = await I.pt('Havuz bloğunun sol alt köşesi'); C.cmd.preview = null; if (!p || typeof p === 'string') return;
    e.o = [p[0], p[1], 0];
    C.cmd.base = p; C.cmd.preview = c => T.karusel.prims(Object.assign({}, e, { rot: M.deg(M.ang(p, c)), _c: null }));
    const a = await I.angle('Dönüş açısı', p, 0); C.cmd.preview = null; e.rot = typeof a === 'number' ? a : 0;
    C.add(e); C.uniteNumarala(true);
    const G = geo(e); C.log(`✓ ${e.code} ${T.karusel.info(e)}`); C.log(`  Mikser seçimi: ${G.mix.n}×${G.mix.name} (${f1(G.mix.P)} kW) /havuz — gerekli itki ${f0(G.mix.FreqGross)} N, ortalama hız ${f2(G.mix.v)} m/s, özgül güç ${f2(G.mix.pSpec)} W/m³${G.mix.warn ? ' (' + G.mix.warn + ')' : ''}`);
  });
  C.addCommand(['KARUSELDUZENLE', 'KARUSELAYAR'], 'Seçilen karusel havuzun parametrelerini değiştirir: KARUSELDUZENLE N= LS= R= ORTA= DIS= H= HP= Z= TABAN= XM= MIKSER= ZEMIN=', async (I) => {
    const kv = takeKV(); const s = (await I.sel('Karusel havuzu seçin')).filter(e => e.type === 'karusel'); if (!s.length) return C.warn('Karusel havuz seçilmedi.');
    if (!Object.keys(kv).length) { const t = await I.str('Değişiklik (ör. LS=120 MIKSER=6)', ''); (t || '').split(/\s+/).forEach(x => { const m = x.match(/^([A-Za-z]+)=(.*)$/); if (m) kv[C.up(m[1])] = m[2]; }); }
    for (const e of s) { for (const [k, p] of Object.entries(KV_MAP)) if (kv[k] != null && !isNaN(C.num(kv[k]))) e[p] = C.num(kv[k]); delete e._mx; C.touch(e); C.log(`✓ ${T.karusel.info(e)}`); }
  });
  C.addCommand(['MERDIVENGUNCELLE'], 'Karusel havuz merdivenlerini arazi kotuna göre yeniden hesaplar', async () => {
    const s = C.doc.ents.filter(e => e.type === 'karusel'); s.forEach(e => { C.touch(e); C.karuselMerdiven(e).forEach(m => C.log(`${e.code}: merdiven ${m.n} basamak, H=${f2(m.H)} m (zemin ${C.fmtKot(m.zg)} — ${m.src})`)); });
  }, { noUndo: true });
  // arazi değişince merdivenler kendiliğinden yenilenir
  let araziSig = '';
  C.on('changeIdle', () => { if (!C.doc) return; const sig = C.doc.ents.filter(e => e.type === 'arazi').map(e => e.id + ':' + (e.ref || 0) + ':' + JSON.stringify(e.o || e.p || '').length).join(','); if (sig !== araziSig) { araziSig = sig; C.doc.ents.filter(e => e.type === 'karusel').forEach(e => delete e._c); C.emit('change'); } });

  /* proses verisi değişince: hacimden düz uzunluk (e.vHesap varsa) */
  C.on('proses', j => {
    if (!j || !j.units || !j.units.bio) return; const d = j.units.bio.dim, V = (d.N || 1) * d.L * d.W * d.h;
    for (const e of C.doc.ents.filter(x => x.type === 'karusel' && x.vHesap != null)) { e.h = d.h; e.Ls = Math.round(C.karuselLs(V, e) * 2) / 2; e.vHesap = V; delete e._mx; C.touch(e); C.log(`✓ ${e.code} karusel hesaptan güncellendi: düz ${f1(e.Ls)} m`); }
  });

  /* şerit */
  if (typeof document !== 'undefined' && C.ribbon && C.ribbon.tabs) {
    const tab = C.ribbon.tabs.find(t => t[0] === 'Arıtma'), pr = tab && tab[1].find(p => p[0] === 'Proses');
    if (pr && !pr[1].some(b => b.cmd === 'KARUSEL')) { pr[1].splice(2, 0, { cmd: 'KARUSEL', t: 'Karusel havuz', i: 'ctank', big: true }, { cmd: 'MEKLISTE', t: 'Mekanik liste', i: 'table' }, { cmd: 'UNITENUMARA', t: 'Numarala', i: 'table' }); try { C.ribbon.render(); } catch (err) { } }
  }
})(typeof window !== 'undefined' ? window.C : globalThis.C);

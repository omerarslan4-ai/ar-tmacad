/* ArıtmaCAD — ANAEROBİK HAVUZ (Çokal AAT T-105 biçimi) çizim varlığı
   Ölçüler metre; ayak izinin sol alt köşesi yerel (0,0). Ünite kartı: app/unite-kart.js → K.anaerobikKart.
   Düzen:
   - n karusel halkası yan yana (1. halka geri devir / RAS, diğerleri ham su), halkalar arası ortak duvar (two).
   - Her halkada orta duvar (uçları yuvarlak) ve iki uçta R rg–rg+tg yuvarlak perde (kılavuz duvar);
     perde çıkış ucunda ext kadar düz devam eder. Komşu halkalar ters yönde döner (ortak duvarda akış aynı yönde).
   - Halka uçlarında (orta duvar ekseninde) kapaklı ağız ag × ah; alt kotu su yüzünden 0,89 m aşağıda (Çokal 95,75).
   - Ortak duvarda tabanda kare orifis (or) ve köprünün yanında kapaklı pencere (ow × ah).
   - Solda giriş kanalı (bG), sağda çıkış kanalı (bC); kanal dış duvarı tK. Sağ kanal RAS halkasıyla 2. halka
     arasında ara duvarla bölünür (kapaklı geçiş): alt bölüm RAS girişi, üst bölüm çıkış.
   - Borular: giriş borusu sol kanalın alt ucundan, RAS borusu sağ kanalın alt ucundan, çıkış borusu sağ dış duvardan.
   - Ortadan enine servis köprüsü (kb), duvar üstünden 0,20 m yukarıda.
   Geometri saf fonksiyondur (anaerobikGeo) ve Node ile denenir: node test/anaerobik.test.js */
(function (C) {
  'use strict';
  const RAD = Math.PI / 180;
  const LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  /* Çokal AAT T-105 varsayılanları (3-Çokal_AAT_Anaerobik_R3.dwg) */
  const DEF = {
    n: 3, Ls: 11.0, Ro: 1.50, tw: 0.30, two: 0.40, rg: 0.70, tg: 0.30, ext: 0.60,
    bG: 0.80, bC: 1.00, tK: 0.30, ag: 0.60, ah: 1.00, dAg: 0.89, kp: 0.40,
    or: 0.50, ow: 1.50, kb: 1.50, kbX: 1.40, kbT: 0.20,
    dG: 0.50, dR: 0.30, dC: 0.30,
    h: 3.14, fb: 0.61, tb: 0.50, zt: 97.25,
  };

  /* yardımcılar (yerel 2B) */
  const arc = (cx, cy, r, a0, a1, n) => { const o = []; n = n || Math.max(6, Math.ceil(Math.abs(a1 - a0) / 6)); for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * RAD; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; };
  const sector = (cx, cy, r1, r2, a0, a1) => [...arc(cx, cy, r2, a0, a1), ...arc(cx, cy, r1, a1, a0)];
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const alan = pts => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  const ccw = pts => (alan(pts) < 0 ? pts.slice().reverse() : pts);

  /* yuvarlak perde: sol uç (dir −1) ya da sağ uç (dir +1); çıkış ucu üstte (s +1) ya da altta (s −1); çıkışta ext düz uzantı */
  function perde(xc, yc, r1, r2, ext, dir, s) {
    const c = (r2 - r1) / 2, p = [];
    p.push([ext, r2], [0, r2], ...arc(0, 0, r2, 90, 270).slice(1), ...arc(0, -(r1 + c), c, -90, 90, 6).slice(1), ...arc(0, 0, r1, 270, 90).slice(1), [ext, r1], ...arc(ext, r1 + c, c, -90, 90, 6).slice(1, -1));
    const mx = dir < 0 ? 1 : -1;
    return ccw(p.map(q => [xc + mx * q[0], yc + s * q[1]]));
  }

  function geo(e) {
    const q = Object.assign({}, DEF, e || {});
    const n = Math.max(1, Math.round(q.n)), R2 = q.Ro + q.two;
    const xc1 = q.tK + q.bG + q.two + q.Ro, xc2 = xc1 + q.Ls, xR = xc2 + R2, Lo = xR + q.bC + q.tK;
    const yc = Array.from({ length: n }, (_, i) => q.two + q.Ro + i * (2 * q.Ro + q.two));
    const Wo = n * 2 * q.Ro + (n + 1) * q.two;
    const zTop = q.zt, zW = zTop - q.fb, zB = zW - q.h, zS = zW - q.dAg, zH = zS + q.ah;
    const G = { q, n, xc1, xc2, xR, Lo, Wo, yc, zTop, zW, zB, zS, zH, zF: zB - q.tb, b: q.Ro - q.tw / 2, parca: [], acik: [], kapak: [], boru: [], halka: [] };
    const full = (pts, k) => G.parca.push({ pts: ccw(pts), z0: zB, z1: zTop, k });
    const kat = (pts, z0, z1, k) => { if (z1 - z0 > 1e-6) G.parca.push({ pts: ccw(pts), z0, z1, k }); };
    const dA = Math.asin(Math.min(1, (q.ag / 2) / R2)) / RAD; // ağız açısı (dış yüzde ag)
    const dAi = Math.asin(Math.min(1, (q.ag / 2) / q.Ro)) / RAD;
    // ---- halkalar ----
    for (let i = 0; i < n; i++) {
      const y = yc[i], s = i % 2 === 0 ? 1 : -1; // RAS saat yönünde (üst koridor +x), komşu ters
      G.halka.push({ i, yc: y, yon: s, ad: i === 0 && n > 1 ? 'RAS' : String(n > 1 ? i : 1) });
      // uç duvarları (yarım daire) — uçta ağız: alt ve üst parça
      for (const [xc, a0, a1, am] of [[xc1, 90, 270, 180], [xc2, -90, 90, 0]]) {
        full(sector(xc, y, q.Ro, R2, a0, am - dA), 'duvar'); full(sector(xc, y, q.Ro, R2, am + dA, a1), 'duvar');
        const ag = sector(xc, y, q.Ro, R2, am - dA, am + dA);
        kat(ag, zB, zS, 'duvar'); kat(ag, zH, zTop, 'duvar');
        const xd = xc + (am ? -1 : 1) * R2, xi = xc + (am ? -1 : 1) * q.Ro;
        G.acik.push({ k: 'agiz', pts: rect(Math.min(xd, xi), y - q.ag / 2, Math.max(xd, xi), y + q.ag / 2), z0: zS, z1: zH, halka: i, yan: am ? 'sol' : 'sag' });
        G.kapak.push({ k: 'agiz', a: [xd, y - q.ag / 2 - 0.1], b: [xd, y + q.ag / 2 + 0.1], halka: i, yan: am ? 'sol' : 'sag', eb: `${(q.ag * 1000).toFixed(0)}×${(q.ah * 1000).toFixed(0)}` });
      }
      // orta duvar, uçları yuvarlak
      const r = q.tw / 2;
      full([...arc(xc2, y, r, -90, 90, 8), ...arc(xc1, y, r, 90, 270, 8)], 'orta');
      // yuvarlak perdeler: sol uçta çıkış s yönünde, sağ uçta −s yönünde
      full(perde(xc1, y, q.rg, q.rg + q.tg, q.ext, -1, s), 'perde');
      full(perde(xc2, y, q.rg, q.rg + q.tg, q.ext, 1, -s), 'perde');
    }
    // dış uzun duvarlar (ilk halkanın altı, son halkanın üstü)
    full(rect(xc1, yc[0] - R2, xc2, yc[0] - q.Ro), 'duvar');
    full(rect(xc1, yc[n - 1] + q.Ro, xc2, yc[n - 1] + R2), 'duvar');
    // ---- ortak duvarlar: orifis + kapaklı pencere ----
    const e1 = Math.sqrt(R2 * R2 - q.Ro * q.Ro);
    const xk0 = Math.max(xc1 + 0.5, xc2 - q.kbX - q.kb);
    let xw1 = xk0 - 0.10, xw0 = xw1 - q.ow, xo = xw0 - 0.05 - q.or;
    if (xo < xc1) { const kay = xc1 + 0.3 - xo; xo += kay; xw0 += kay; xw1 += kay; }
    G.kopru = { x0: xk0, x1: xk0 + q.kb, z0: zTop, z1: zTop + q.kbT };
    for (let i = 0; i + 1 < n; i++) {
      const y0 = yc[i] + q.Ro, y1 = y0 + q.two, xa = xc1 - e1, xb = xc2 + e1;
      full(rect(xa, y0, xo, y1), 'duvar');
      kat(rect(xo, y0, xo + q.or, y1), zB + q.or, zTop, 'duvar');
      full(rect(xo + q.or, y0, xw0, y1), 'duvar');
      kat(rect(xw0, y0, xw1, y1), zB, zS, 'duvar'); kat(rect(xw0, y0, xw1, y1), zH, zTop, 'duvar');
      full(rect(xw1, y0, xb, y1), 'duvar');
      G.acik.push({ k: 'orifis', pts: rect(xo, y0, xo + q.or, y1), z0: zB, z1: zB + q.or, arasi: [i, i + 1] });
      G.acik.push({ k: 'pencere', pts: rect(xw0, y0, xw1, y1), z0: zS, z1: zH, arasi: [i, i + 1] });
      G.kapak.push({ k: 'pencere', a: [xw0, y1], b: [xw1, y1], arasi: [i, i + 1], eb: `${(q.ow * 1000).toFixed(0)}×${(q.ah * 1000).toFixed(0)}` });
    }
    // ---- kanallar ----
    const yb = yc[0] - q.ag / 2 - q.kp - q.tK, yt = yc[n - 1] + q.ag / 2 + q.kp + q.tK;
    G.kanal = { yb, yt };
    const xiL = (y, c) => xc1 - Math.sqrt(Math.max(0, R2 * R2 - (y - c) ** 2)), xiR = (y, c) => xc2 + Math.sqrt(Math.max(0, R2 * R2 - (y - c) ** 2));
    // sol kanal: dış duvar + uç duvarları (halka yayına kadar), alt uçta giriş borusu
    full(rect(0, yb, q.tK, yt), 'kanal');
    const gx = q.tK + q.bG / 2;
    full(rect(q.tK, yb, gx - q.dG / 2, yb + q.tK), 'kanal');
    kat(rect(gx - q.dG / 2, yb, gx + q.dG / 2, yb + q.tK), zB + q.dG, zTop, 'kanal');
    full([[gx + q.dG / 2, yb], [xiL(yb, yc[0]), yb], [xiL(yb + q.tK, yc[0]), yb + q.tK], [gx + q.dG / 2, yb + q.tK]], 'kanal');
    full([[q.tK, yt - q.tK], [xiL(yt - q.tK, yc[n - 1]), yt - q.tK], [xiL(yt, yc[n - 1]), yt], [q.tK, yt]], 'kanal');
    G.boru.push({ k: 'giris', p: [gx, yb], yon: [0, -1], d: q.dG, z: zB + q.dG / 2 });
    G.acik.push({ k: 'boru', pts: rect(gx - q.dG / 2, yb, gx + q.dG / 2, yb + q.tK), z0: zB, z1: zB + q.dG });
    // sağ kanal: dış duvar (çıkış borusu delikli), uç duvarları, ara duvar
    const xo1 = xR + q.bC, rx = xR + q.bC / 2;
    const ysh = n > 1 ? yc[0] + q.Ro + q.two / 2 : null;
    const yCk = n > 2 ? yc[n - 2] + q.Ro + q.two / 2 : n > 1 ? (ysh + q.tK / 2 + yt - q.tK) / 2 : yc[0]; // ham su halkaları arasındaki duvar hizası (Çokal 6,80)
    full(rect(xo1, yb, Lo, yCk - q.dC / 2), 'kanal'); kat(rect(xo1, yCk - q.dC / 2, Lo, yCk + q.dC / 2), zB + q.dC, zTop, 'kanal'); full(rect(xo1, yCk + q.dC / 2, Lo, yt), 'kanal');
    G.boru.push({ k: 'cikis', p: [Lo, yCk], yon: [1, 0], d: q.dC, z: zB + q.dC / 2 });
    G.acik.push({ k: 'boru', pts: rect(xo1, yCk - q.dC / 2, Lo, yCk + q.dC / 2), z0: zB, z1: zB + q.dC });
    full([[xiR(yb + q.tK, yc[0]), yb + q.tK], [xiR(yb, yc[0]), yb], [rx - q.dR / 2, yb], [rx - q.dR / 2, yb + q.tK]], 'kanal');
    kat(rect(rx - q.dR / 2, yb, rx + q.dR / 2, yb + q.tK), zB + q.dR, zTop, 'kanal');
    full(rect(rx + q.dR / 2, yb, xo1, yb + q.tK), 'kanal');
    G.boru.push({ k: 'ras', p: [rx, yb], yon: [0, -1], d: q.dR, z: zB + q.dR / 2 });
    G.acik.push({ k: 'boru', pts: rect(rx - q.dR / 2, yb, rx + q.dR / 2, yb + q.tK), z0: zB, z1: zB + q.dR });
    full([[xiR(yt, yc[n - 1]), yt], [xiR(yt - q.tK, yc[n - 1]), yt - q.tK], [xo1, yt - q.tK], [xo1, yt]], 'kanal');
    if (n > 1) { // ara duvar: RAS bölümü / çıkış bölümü, kapaklı geçiş
      const ya = ysh - q.tK / 2, yb2 = ysh + q.tK / 2, g0 = xR + 0.20, g1 = g0 + q.ag;
      full(rect(xc2 + e1, ya, g0, yb2), 'kanal'); full(rect(g1, ya, xo1, yb2), 'kanal');
      G.acik.push({ k: 'bolme', pts: rect(g0, ya, g1, yb2), z0: zB, z1: zTop });
      G.kapak.push({ k: 'bolme', a: [g0 - 0.1, yb2], b: [g1 + 0.1, yb2], eb: `${(q.ag * 1000).toFixed(0)}×${((zTop - zB) * 1000).toFixed(0)}` });
      G.ara = { y: ysh, g0, g1 };
    }
    // taban plağı ve köprü
    G.taban = { pts: rect(0, 0, Lo, Wo), z0: G.zF, z1: zB };
    // hacim (halka alanı × h × n) — karusel.js ile aynı formül
    const ring = Math.PI * ((q.rg + q.tg) ** 2 - q.rg ** 2);
    G.Ahalka = q.Ls * 2 * q.Ro - q.Ls * q.tw + Math.PI * q.Ro * q.Ro - ring;
    G.V = G.Ahalka * q.h * n;
    G.pen = { xo, xw0, xw1 };
    return G;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { geo, DEF };
  if (!C) return;
  C.ANAEROBIK_DEF = DEF;
  C.anaerobikGeo = geo;
  if (!C.T || !C.prim || typeof document === 'undefined') return;

  /* ================= ÇİZİM ================= */
  const M = C.M, T = C.T;
  const { L, P, TX } = C.prim;
  const { ext } = C.meshDef;
  const tH = mm => C.annoH(mm == null ? C.doc.set.textH : mm);
  const f2 = v => M.fmt(v, 2).replace('.', ','), f0 = v => Math.round(v).toLocaleString('tr-TR');
  const kot = z => (C.fmtKot ? C.fmtKot(z) : f2(z));
  const unum = e => (String(e.code || '').match(/\d+/) || ['1xx'])[0];
  const mix = (e, G) => { // halka başına mikser (mikser programının itki dengesi)
    const key = [G.b, G.q.tw, G.q.Ls, G.q.h].join('|');
    if (!e._mx || e._mx.key !== key) e._mx = { key, r: C.mikserSec ? C.mikserSec({ b: G.b, tw: G.q.tw, Ls: G.q.Ls, H: G.q.h, n0: 0 }) : null };
    return e._mx.r;
  };
  const halkaAd = (e, G, i) => (i === 0 && G.n > 1 ? 'RAS' : `${e.code || ''}/${G.n > 1 ? i : 1}`);

  T.anaerobik = {
    label: 'Anaerobik havuz', ifc: 'IfcTank',
    prims: e => {
      const G = geo(e), q = G.q, f = C.frame(e.o, e.rot), z = G.zTop, out = [], h = tH(), hB = tH(3.5);
      const rd = (() => { let r = ((e.rot || 0) % 360 + 360) % 360; if (r > 90 && r <= 270) r -= 180; return r * RAD; })();
      const PL = (pts, c, o) => P(pts.map(p => f.at(p[0], p[1], z)), c, o);
      const T1 = (x, y, s, o, al) => TX(f.at(x, y, z), o && o.h || h, s, rd, al || 'M', o);
      // duvarlar: üste kadar çıkan parçalar (planda görünen)
      for (const p of G.parca) if (p.z1 >= G.zTop - 1e-6) out.push(PL(p.pts, true, { lw: p.k === 'perde' || p.k === 'orta' ? 35 : 50 }));
      // görünmeyen açıklıklar (kesikli): ağız, orifis, pencere, boru
      for (const a of G.acik) if (a.k !== 'bolme') out.push(PL(a.pts, true, { lt: 'DASHED', color: 8, lw: 18 }));
      // köprü
      const k = G.kopru; out.push(PL([[k.x0, -0.3], [k.x1, -0.3], [k.x1, G.Wo + 0.3], [k.x0, G.Wo + 0.3]], true, { color: 30, lw: 35 }));
      out.push(T1((k.x0 + k.x1) / 2, G.Wo + 0.9, `Servis köprüsü ${f2(q.kb)} m · ${kot(k.z1)}`, { color: 30 }));
      // kapaklar
      const un = unum(e);
      G.kapak.forEach((c, i) => out.push(L(f.at(c.a[0], c.a[1], z), f.at(c.b[0], c.b[1], z), { color: 6, lw: 70 })));
      const agL = G.kapak.filter(c => c.k === 'agiz' && c.yan === 'sol'), agR = G.kapak.filter(c => c.k === 'agiz' && c.yan === 'sag');
      agL.forEach((c, i) => out.push(T1(c.a[0] - 0.15, c.b[1] + 0.25, `SK-${un}G/${LET[i]}`, { color: 6 }, 'R')));
      agR.forEach((c, i) => out.push(T1(c.a[0] + 0.15, c.b[1] + 0.25, `SK-${un}C/${LET[i]}`, { color: 6 }, 'L')));
      G.kapak.filter(c => c.k === 'pencere').forEach((c, i) => out.push(T1((c.a[0] + c.b[0]) / 2, c.a[1] + 0.45, `SK-${un}P/${LET[i]} ${c.eb}`, { color: 6 })));
      G.kapak.filter(c => c.k === 'bolme').forEach(c => out.push(T1(c.b[0] + 0.2, c.b[1] + 0.35, `SK-${un}B ${c.eb}`, { color: 6 }, 'L')));
      // halka adları, akış okları, mikserler
      const mx = mix(e, G);
      for (const H of G.halka) {
        out.push(T1(G.xc1 + q.Ls * 0.35, H.yc + q.tw / 2 + G.b * 0.5, halkaAd(e, G, H.i), { color: 2, h: hB }));
        for (const [yy, sg] of [[H.yc + q.tw / 2 + G.b * 0.5, H.yon], [H.yc - q.tw / 2 - G.b * 0.5, -H.yon]]) {
          const xa = G.xc1 + q.Ls * 0.62, ln = Math.min(1.2, q.Ls * 0.08);
          out.push(L(f.at(xa - sg * ln, yy, z), f.at(xa + sg * ln, yy, z), { color: 5, lw: 35 }), L(f.at(xa + sg * ln, yy, z), f.at(xa + sg * (ln - 0.35), yy + 0.18, z), { color: 5, lw: 35 }), L(f.at(xa + sg * ln, yy, z), f.at(xa + sg * (ln - 0.35), yy - 0.18, z), { color: 5, lw: 35 }));
        }
        if (mx) { // çıkış uçlarında: sol dönüş çıkışı ve sağ dönüş çıkışı koridorları
          const per = Math.ceil(mx.n / 2);
          [[G.xc1 + 2.0, H.yon > 0 ? 1 : -1, 1, per], [G.xc2 - 2.0, H.yon > 0 ? -1 : 1, -1, mx.n - per]].forEach(([x, side, dir, cnt], j) => {
            for (let m = 0; m < cnt; m++) {
              const y = side > 0 ? H.yc + q.tw / 2 + G.b * (m + 0.5) / cnt : H.yc - q.tw / 2 - G.b * (m + 0.5) / cnt, D = Math.min(mx.D, G.b * 0.8);
              out.push(L(f.at(x, y - D / 2, z), f.at(x, y + D / 2, z), { color: 1, lw: 50 }), L(f.at(x, y, z), f.at(x - dir * 0.6, y, z), { color: 1, lw: 35 }));
            }
          });
        }
      }
      // kotlar ve açıklama yazıları
      out.push(T1(q.tK + q.bG / 2, G.kanal.yb - 0.9, `Giriş borusu Ø${f0(q.dG * 1000)}`, { color: 1 }));
      out.push(T1(G.xR + q.bC / 2, G.kanal.yb - 0.9, `RAS borusu Ø${f0(q.dR * 1000)}`, { color: 1 }));
      const cb = G.boru.find(b => b.k === 'cikis'); if (cb) out.push(T1(cb.p[0] + 0.3, cb.p[1], `Çıkış Ø${f0(q.dC * 1000)}`, { color: 1 }, 'L'));
      out.push(T1(q.tK + q.bG / 2, (G.kanal.yb + G.kanal.yt) / 2, `Giriş kanalı ${f2(q.bG)}`, { color: 8 }), T1(G.xR + q.bC / 2, (G.kanal.yb + G.kanal.yt) / 2 + 1.2, `Çıkış kanalı ${f2(q.bC)}`, { color: 8 }));
      if (G.n > 1) out.push(T1(G.xR + q.bC / 2, G.yc[0], 'RAS girişi', { color: 8 }));
      const o0 = G.acik.find(a => a.k === 'orifis'); if (o0) out.push(T1(G.pen.xo + q.or / 2, o0.pts[0][1] - 0.35, `Orifis ${f0(q.or * 100)}×${f0(q.or * 100)} (${kot(G.zB)})`, { color: 8 }));
      out.push(T1(G.Lo / 2, -1.4, `Ağız ${f2(q.ag)}×${f2(q.ah)} m: ${kot(G.zS)} – ${kot(G.zH)} · su ${kot(G.zW)} · taban ${kot(G.zB)} · duvar üstü ${kot(G.zTop)}`, { color: 3 }));
      // başlık
      out.push(TX(f.at(G.Lo / 2, G.Wo + h * 9, z), tH(5), `${e.code || ''} ${e.name || 'Anaerobik havuz'}`.trim(), rd, 'C', { color: 2 }));
      out.push(TX(f.at(G.Lo / 2, G.Wo + h * 5.5, z), h, `${G.n} halka · düz ${f2(q.Ls)} m · koridor ${f2(G.b)} m · su ${f2(q.h)} m · V = ${f0(G.V)} m³${mx ? ` · mikser ${G.n}×${mx.n} ${mx.name}` : ''} · ${f2(G.Lo)} × ${f2(G.Wo)} m`, rd, 'C'));
      return out;
    },
    mesh: e => {
      const G = geo(e), f = C.frame(e.o, e.rot), out = [];
      for (const p of G.parca) out.push(ext(f.at(0, 0, p.z0), f.ux, [0, 0, 1], p.pts, p.z1 - p.z0));
      out.push(ext(f.at(0, 0, G.taban.z0), f.ux, [0, 0, 1], G.taban.pts, G.taban.z1 - G.taban.z0));
      const k = G.kopru; out.push(ext(f.at(0, 0, k.z0), f.ux, [0, 0, 1], [[k.x0, 0], [k.x1, 0], [k.x1, G.Wo], [k.x0, G.Wo]], k.z1 - k.z0));
      return out;
    },
    snaps: e => { const G = geo(e), f = C.frame(e.o, e.rot); return [[0, 0], [G.Lo, 0], [G.Lo, G.Wo], [0, G.Wo]].map(p => ({ p: f.at(p[0], p[1], G.zTop), k: 'end' })); },
    xf: (e, X) => { const G = geo(e), f = C.frame(e.o, e.rot); const o2 = X.mir ? X.p(f.at(0, G.Wo)) : X.p(e.o); const v = X.v([Math.cos((e.rot || 0) * RAD), Math.sin((e.rot || 0) * RAD), 0]); e.rot = Math.atan2(v[1], v[0]) / RAD; e.o = [o2[0], o2[1], 0]; },
    info: e => { const G = geo(e); return `${e.code || ''} anaerobik havuz: ${G.n} halka, düz ${f2(G.q.Ls)} m, koridor ${f2(G.b)} m, V=${f0(G.V)} m³, ${f2(G.Lo)} × ${f2(G.Wo)} m`; },
  };

  /* ================= KOMUT ================= */
  const takeKV = () => { const kv = {}; C.cmd.queue = C.cmd.queue.filter(t => { const m = t.match(/^([A-Za-zÇĞİÖŞÜçğıöşü_0-9]+)=(.*)$/); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; }); return kv; };
  const KV = { N: 'n', LS: 'Ls', H: 'h', HP: 'fb', Z: 'zt', R: 'Ro' };
  /* ünite kartından değerler (varsa): halka sayısı, düz boy, su derinliği, standartlar, duvar üstü */
  const karttan = () => {
    try {
      const Z = C.kart && C.kart.hesapla && C.kart.hesapla(); const x = Z && Z.su.find(y => y.id === 'an'); const k = x && x.kart; if (!k || !k.halka) return null;
      const v = id => (k.params.find(p => p.k === id) || {}).v, o = { n: k.halka.n, Ls: k.halka.Ls, h: k.halka.h, Ro: k.halka.Ro, tw: k.halka.tw, two: k.halka.two, rg: k.halka.rg, tg: k.halka.tg };
      for (const id of ['bG', 'bC', 'tK', 'ag', 'ah', 'or', 'kb', 'tb']) if (v(id) != null) o[id] = v(id);
      if (v('hp') != null) o.fb = v('hp'); if (v('zu') != null && v('zs')) o.zt = v('zu');
      return o;
    } catch (err) { return null; }
  };
  C.addCommand(['ANAEROBIK', 'ANAEROBIKHAVUZ'], 'Anaerobik havuz (Çokal T-105 düzeni: karusel halkaları, giriş/çıkış kanalları, ağızlar, orifisler, köprü). ANAEROBIK [N=3 LS=11 H=3.14 HP=0.61 Z=97.25]; değerler ünite kartından da alınır', async (I) => {
    const kv = takeKV(), kt = karttan();
    const e = C.newEnt('anaerobik', Object.assign(JSON.parse(JSON.stringify(DEF)), kt || {}, { layer: C.std('BETON'), u: 'an', name: 'Anaerobik havuz', o: [0, 0, 0], rot: 0, sira: Date.now() }));
    for (const [k, p] of Object.entries(KV)) if (kv[k] != null && !isNaN(C.num(kv[k]))) e[p] = C.num(kv[k]);
    if (kt) C.log('Değerler ünite kartından alındı.');
    C.cmd.base = null; C.cmd.preview = c => T.anaerobik.prims(Object.assign({}, e, { o: c, _c: null }));
    const p = await I.pt('Havuzun sol alt köşesi'); C.cmd.preview = null; if (!p || typeof p === 'string') return;
    e.o = [p[0], p[1], 0];
    C.cmd.base = p; C.cmd.preview = c => T.anaerobik.prims(Object.assign({}, e, { rot: M.deg(M.ang(p, c)), _c: null }));
    const a = await I.angle('Dönüş açısı', p, 0); C.cmd.preview = null; e.rot = typeof a === 'number' ? a : 0;
    C.add(e); if (C.uniteNumarala) C.uniteNumarala(true);
    C.log(`✓ ${T.anaerobik.info(e)}`);
  });

  /* şerit: Arıtma › Proses */
  if (C.ribbon && C.ribbon.tabs) {
    const tab = C.ribbon.tabs.find(t => t[0] === 'Arıtma'), pr = tab && tab[1].find(p => p[0] === 'Proses');
    if (pr && !pr[1].some(b => b.cmd === 'ANAEROBIK')) { pr[1].push({ cmd: 'ANAEROBIK', t: 'Anaerobik havuz', i: 'ctank' }); try { C.ribbon.render(); } catch (err) { } }
  }
  if (window.DIL) window.DIL.ekle('en', 'English', [['Anaerobik havuz', 'Anaerobic tank'], ['Servis köprüsü', 'Service bridge'], ['Giriş kanalı', 'Inlet channel'], ['Çıkış kanalı', 'Outlet channel'], ['RAS girişi', 'RAS inlet'], ['Giriş borusu', 'Inlet pipe'], ['RAS borusu', 'RAS pipe']]);
})(typeof window !== 'undefined' ? window.C : (globalThis.C || null));

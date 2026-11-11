/* ArıtmaCAD — ANAEROBİK HAVUZ (Çokal AAT T-105 biçimi) çizim varlığı
   Ölçüler metre; ayak izinin sol alt köşesi yerel (0,0). Ünite kartı: app/unite-kart.js → K.anaerobikKart.
   Düzen:
   - n karusel halkası yan yana (1. halka geri devir / RAS, diğerleri ham su), halkalar arası ortak duvar (two).
   - Her halkada orta duvar (uçları yuvarlak) ve iki uçta R rg–rg+tg yuvarlak perde (kılavuz duvar);
     perde çıkış ucunda ext kadar düz devam eder. Komşu halkalar ters yönde döner (ortak duvarda akış aynı yönde).
   - Halka uçlarında (orta duvar ekseninde) kapaklı ağız ag × ah; alt kotu su yüzünden 0,89 m aşağıda (Çokal 95,75).
   - Ortak duvarda köprünün yanında kapaklı pencere (ow × ah). Sağ kanaldaki ara duvarda tabanda kapaklı orifis (ag × bO), üstü perde.
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
    n: 3, Ls: 11.0, Ro: 1.50, tw: 0.30, two: 0.40, rg: 0.70, tg: 0.30, ext: null, kbA: null, kAc: 2.50, kOtur: null, m1: null, m2: null, // merdiven yeri: 'ust-sol', 'alt-sag' … // kOtur: E / H elle zorlama // yönlendirme perdesi bastonu ve baston–yürüyüş yolu arası: boşsa kulvar / 2 (Çokal 0,60 ≈ 0,675)
    bG: 0.80, bC: 1.00, tK: 0.30, ag: 0.60, ah: 1.00, dAg: 0.89, kp: 0.40,
    or: 0.50, ow: 1.50, kb: 1.50, kbT: 0.20,
    dG: 0.50, dR: 0.30, dC: 0.30,
    h: 3.14, fb: 0.61, tb: 0.50, zt: 97.25,
    oh: null, dPe: null, // pencere yüksekliği ve eşik derinliği (boşsa ağızla aynı)
    mw: 1.00, mb: 0.25, mh: 0.19, sahE: 0.30, tre: 1.00, treT: 0.15, xm: 2.0, tahrik: 'OTO', akA: 1.0, akF: 10, sahX: 0.40, kpA: 0.20, bO: 0.60, kY: 0.06, pD: 0.20, sahG: 0.45, k2: 0, yE: 0.085, yP: 0.05, yD: 0.30,
  };

  const PAR = [...Object.keys(DEF), 'gx', 'rx', 'yC', 'hG', 'hR', 'hC']; // elle taşınan boru delikleri

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

  /* delikli plan şeklini üçgenle (yatay şeritlere bölerek; kesişmeyen halkalar için sağlam) → [[a,b,c], …] (saat yönü tersi) */
  function ucgenle(halkalar) {
    const K = [];
    for (const h of halkalar) for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length]; if (Math.abs(a[1] - b[1]) > 1e-12) K.push(a[1] < b[1] ? [a, b] : [b, a]); }
    const ys = [...new Set(halkalar.flat().map(p => +p[1].toFixed(9)))].sort((a, b) => a - b), out = [];
    const xAt = (k, y) => k[0][0] + (y - k[0][1]) / (k[1][1] - k[0][1]) * (k[1][0] - k[0][0]);
    for (let j = 0; j + 1 < ys.length; j++) {
      const y0 = ys[j], y1 = ys[j + 1]; if (y1 - y0 < 1e-9) continue; const ym = (y0 + y1) / 2;
      const ks = K.filter(k => k[0][1] < ym && k[1][1] > ym).sort((a, b) => xAt(a, ym) - xAt(b, ym));
      for (let i = 0; i + 1 < ks.length; i += 2) {
        const l = ks[i], r = ks[i + 1], a = [xAt(l, y0), y0], b = [xAt(r, y0), y0], c = [xAt(r, y1), y1], d = [xAt(l, y1), y1];
        if (b[0] - a[0] > 1e-9) out.push([a, b, c]); if (c[0] - d[0] > 1e-9) out.push([a, c, d]);
      }
    }
    return out;
  }
  /* plan şeklinden katı (yerel): üst/alt yüzler, yan yüzler, yalnız gerçek kenar çizgileri */
  function bolgeKati(B, z0, z1) {
    const v = [], f = [], vn = [], e = [], hs = [B.dis, ...B.delik];
    const tri = (a, b, c, n) => { const k = v.length; v.push(a, b, c); vn.push(n, n, n); f.push([k, k + 1, k + 2]); };
    for (const [a, b, c] of ucgenle(hs)) { tri([a[0], a[1], z1], [b[0], b[1], z1], [c[0], c[1], z1], [0, 0, 1]); tri([a[0], a[1], z0], [c[0], c[1], z0], [b[0], b[1], z0], [0, 0, -1]); }
    for (const h of hs) {
      const m = h.length;
      for (let i = 0; i < m; i++) {
        const a = h[i], b = h[(i + 1) % m], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 1e-12) continue;
        const n = [dy / L, -dx / L, 0]; // dış yüz saat yönü tersi, delik saat yönü → normal hep betondan dışarı
        tri([a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], n); tri([a[0], a[1], z0], [b[0], b[1], z1], [a[0], a[1], z1], n);
        e.push([[a[0], a[1], z0], [b[0], b[1], z0]], [[a[0], a[1], z1], [b[0], b[1], z1]]);
        const p = h[(i + m - 1) % m], u0 = [a[0] - p[0], a[1] - p[1]], l0 = Math.hypot(u0[0], u0[1]);
        if (l0 > 1e-12 && (u0[0] * dx + u0[1] * dy) / (l0 * L) < 0.94) e.push([[a[0], a[1], z0], [a[0], a[1], z1]]); // keskin köşede düşey kenar
      }
    }
    return { v, f, vn, e };
  }

  function geo(e) {
    const q = {}; e = e || {}; for (const k of PAR) q[k] = e[k] != null ? e[k] : DEF[k]; // yalnız geometri parametreleri (önbellek, 3B ağ vb. alınmaz)
    const n = Math.max(1, Math.round(q.n)), R2 = q.Ro + q.two;
    const xc1 = q.tK + q.bG + q.two + q.Ro, xc2 = xc1 + q.Ls, xR = xc2 + R2, Lo = xR + q.bC + q.tK;
    const yc = Array.from({ length: n }, (_, i) => q.two + q.Ro + i * (2 * q.Ro + q.two));
    const Wo = n * 2 * q.Ro + (n + 1) * q.two;
    const zTop = q.zt, zW = zTop - q.fb, zB = zW - q.h, zS = zW - q.dAg, zH = zS + q.ah, zSp = zW - (q.dPe != null ? q.dPe : q.dAg), zHp = zSp + (q.oh != null ? q.oh : q.ah); // ağız ve pencere ayrı
    const G = { q, n, xc1, xc2, xR, Lo, Wo, yc, zTop, zW, zB, zS, zH, zSp, zHp, zF: zB - q.tb, b: q.Ro - q.tw / 2, parca: [], acik: [], kapak: [], boru: [], halka: [], kes: [] };
    const ada = (pts, k) => G.parca.push({ pts: ccw(pts), z0: zB, z1: zTop, k }); // bağımsız perdeler (orta duvar, yuvarlak perde)
    const kes = (pts, z0, z1, k) => G.kes.push({ pts, z0, z1, k }); // betondan çıkarılacak boşluk prizması
    const e1 = Math.sqrt(R2 * R2 - q.Ro * q.Ro), fi = Math.asin(q.Ro / R2) / RAD;
    // yürüyüş yolu: dar kulvarda (≤ kAc) Çokal gibi bastondan kulvar/2 sonra; geniş kulvarda bastonun üstüne oturur (baston en az köprü eni) — köprü açıklığı yarıya iner
    const ust = q.kOtur === 'E' || (q.kOtur !== 'H' && G.b > q.kAc + 1e-9);
    const eB = q.ext != null ? +q.ext : ust ? Math.max(G.b / 2, q.kb) : G.b / 2, aB = q.kbA != null ? +q.kbA : G.b / 2; G.baston = eB; G.kopruBaston = ust;
    const dl = 0.05; // boşluk prizması duvar yüzlerinden taşma payı
    // ---- halkalar: ağızlar, orta duvar, yuvarlak perdeler ----
    for (let i = 0; i < n; i++) {
      const y = yc[i], s = i % 2 === 0 ? 1 : -1; // RAS saat yönünde (üst koridor +x), komşu ters
      G.halka.push({ i, yc: y, yon: s, ad: i === 0 && n > 1 ? 'RAS' : String(n > 1 ? i : 1) });
      for (const sol of [true, false]) {
        const xc = sol ? xc1 : xc2, sg = sol ? -1 : 1, xd = xc + sg * R2, xi = xc + sg * q.Ro;
        const pts = rect(Math.min(xd, xi), y - q.ag / 2, Math.max(xd, xi), y + q.ag / 2);
        G.acik.push({ k: 'agiz', pts, z0: zS, z1: zH, halka: i, yan: sol ? 'sol' : 'sag' });
        kes(rect(Math.min(xd, xi) - dl, y - q.ag / 2, Math.max(xd, xi) + dl, y + q.ag / 2), zS, zH, 'agiz');
        G.kapak.push({ k: 'agiz', a: [xd, y - q.ag / 2 - 0.1], b: [xd, y + q.ag / 2 + 0.1], halka: i, yan: sol ? 'sol' : 'sag', eb: `${(q.ag * 1000).toFixed(0)}×${(q.ah * 1000).toFixed(0)}` });
      }
      const r = q.tw / 2;
      ada([...arc(xc2, y, r, -90, 90, 8), ...arc(xc1, y, r, 90, 270, 8)], 'orta');
      ada(perde(xc1, y, q.rg, q.rg + q.tg, eB, -1, s), 'perde'); // sol uçta çıkış s yönünde
      ada(perde(xc2, y, q.rg, q.rg + q.tg, eB, 1, -s), 'perde'); // sağ uçta −s yönünde
    }
    // ---- ortak duvarlarda orifis ve kapaklı pencere; köprü ----
    // yürüyüş yolu bastonun ucundan (yuvarlak uç dahil) kulvar / 2 sonra başlar (Çokal köprü 11,00 – 12,50)
    const xk0 = Math.max(xc1 + 0.5, ust ? xc2 - eB - q.tg / 2 : xc2 - eB - q.tg / 2 - aB - q.kb);
    let xw1 = xk0 - q.kpA, xw0 = xw1 - q.ow, xo = xw0;
    if (xo < xc1) { const kay = xc1 + 0.3 - xo; xo += kay; xw0 += kay; xw1 += kay; }
    G.kopru = { x0: xk0, x1: xk0 + q.kb, z0: zTop, z1: zTop + q.kbT };
    for (let i = 0; i + 1 < n; i++) {
      const y0 = yc[i] + q.Ro, y1 = y0 + q.two;
      G.acik.push({ k: 'pencere', pts: rect(xw0, y0, xw1, y1), z0: zSp, z1: zHp, arasi: [i, i + 1] });
      kes(rect(xw0, y0 - dl, xw1, y1 + dl), zSp, zHp, 'pencere');
      G.kapak.push({ k: 'pencere', a: [xw0, y1], b: [xw1, y1], arasi: [i, i + 1], eb: `${(q.ow * 1000).toFixed(0)}×${((zHp - zSp) * 1000).toFixed(0)}` });
    }
    // ---- beton duvarlar tek plan şekli: dış kabuk (halkalar + kanallar) eksi su hacimleri ----
    const yb = yc[0] - q.ag / 2 - q.kp - q.tK, yt = yc[n - 1] + q.ag / 2 + q.kp + q.tK;
    G.kanal = { yb, yt };
    const xo1 = xR + q.bC, rx = xR + q.bC / 2, gx = q.tK + q.bG / 2;
    // halkaların dış sınırı: sağda alttan üste, solda üstten alta (aralarda ortak duvar ucu düşey)
    const zR = [], zL = [];
    // ağız önünde düz yüz: kapak çerçevesi yuvarlak duvara değil düz yüze oturur (yüz eni = ağız + 2 × pD)
    const wD = Math.min(2 * R2 - 0.1, q.ag + 2 * q.pD);
    const duzle = (pts, xc, y0, sg) => {
      const yA = y0 - wD / 2, yB = y0 + wD / 2, xF = xc + sg * R2, xa = yy => xc + sg * Math.sqrt(Math.max(0, R2 * R2 - (yy - y0) ** 2));
      const art = pts.length > 1 && pts[pts.length - 1][1] > pts[0][1], [y1, y2] = art ? [yA, yB] : [yB, yA], o = []; let kondu = false;
      for (const p of pts) { const ic = p[1] > yA + 1e-9 && p[1] < yB - 1e-9; if (ic) { if (!kondu) { o.push([xa(y1), y1], [xF, y1], [xF, y2], [xa(y2), y2]); kondu = true; } continue; } o.push(p); }
      return o;
    };
    for (let i = 0; i < n; i++) zR.push(...duzle(arc(xc2, yc[i], R2, i === 0 ? -90 : -fi, i === n - 1 ? 90 : fi), xc2, yc[i], 1));
    for (let i = n - 1; i >= 0; i--) zL.push(...duzle(arc(xc1, yc[i], R2, i === n - 1 ? 90 : 180 - fi, i === 0 ? 270 : 180 + fi), xc1, yc[i], -1));
    G.duzYuz = wD;
    const kirp = (z, ya, yb_) => { // tek yönlü (y'ye göre sıralı) zinciri [ya, yb_] aralığına kırp
      const lo = Math.min(ya, yb_), hi = Math.max(ya, yb_), o = [], ic = y => y >= lo - 1e-9 && y <= hi + 1e-9;
      for (let k = 0; k < z.length; k++) {
        const a = z[k]; if (ic(a[1])) o.push(a);
        const b = z[k + 1]; if (!b) break;
        for (const yy of [lo, hi]) if ((a[1] - yy) * (b[1] - yy) < 0) { const t = (yy - a[1]) / (b[1] - a[1]); o.push([a[0] + t * (b[0] - a[0]), yy]); }
      }
      return o;
    };
    const dis = [...kirp(zR, zR[0][1], yb), [Lo, yb], [Lo, yt], ...kirp(zR, yt, zR[zR.length - 1][1]), ...kirp(zL, zL[0][1], yt), [0, yt], [0, yb], ...kirp(zL, yb, zL[zL.length - 1][1])];
    const delik = [];
    for (let i = 0; i < n; i++) delik.push([...arc(xc2, yc[i], q.Ro, -90, 90), ...arc(xc1, yc[i], q.Ro, 90, 270)]);
    delik.push([[q.tK, yt - q.tK], ...kirp(zL, yt - q.tK, yb + q.tK), [q.tK, yb + q.tK]]); // giriş kanalı suyu
    const ysh = n > 1 ? yc[0] + q.Ro + q.two / 2 : null;
    if (n > 1) { // çıkış kanalı ara duvarla ikiye bölünür: alt RAS bölümü, üst çıkış bölümü
      const ya = ysh - q.tK / 2, yb2 = ysh + q.tK / 2, g0 = xR + 0.20, g1 = g0 + q.ag;
      // ara duvar boydan boya perde; tabanda kapaklı orifis (RAS bölümü ↔ çıkış bölümü)
      delik.push([...kirp(zR, yb + q.tK, ya), [xo1, ya], [xo1, yb + q.tK]]);
      delik.push([...kirp(zR, yb2, yt - q.tK), [xo1, yt - q.tK], [xo1, yb2]]);
      G.acik.push({ k: 'orifis', pts: rect(g0, ya, g1, yb2), z0: zB, z1: zB + q.bO });
      kes(rect(g0, ya - dl, g1, yb2 + dl), zB - 0.01, zB + q.bO, 'orifis');
      G.kapak.push({ k: 'bolme', a: [g0 - 0.1, yb2], b: [g1 + 0.1, yb2], eb: `${(q.ag * 1000).toFixed(0)}×${(q.bO * 1000).toFixed(0)}` });
      G.ara = { y: ysh, g0, g1 };
    } else delik.push([...kirp(zR, yb + q.tK, yt - q.tK), [xo1, yt - q.tK], [xo1, yb + q.tK]]);
    G.bolge = { dis: ccw(dis), delik: delik.map(d => ccw(d).reverse()) }; // dış saat yönü tersi, delikler saat yönü
    // ---- borular (duvar delikleri): yer, çap ve alt kotu ayarlanabilir (saha borulamasından ya da elle: gx, rx, yC; dG/dR/dC; hG/hR/hC tabandan) ----
    const ara = (v, a, b) => Math.min(Math.max(a, b), Math.max(a, v));
    const yC0 = n > 2 ? yc[n - 2] + q.Ro + q.two / 2 : n > 1 ? (ysh + q.tK / 2 + yt - q.tK) / 2 : yc[0]; // ham su halkaları arasındaki duvar hizası (Çokal 6,80)
    const cA = n > 1 ? ysh + q.tK / 2 : yb + q.tK, cB = yt - q.tK;
    const gX = ara(q.gx != null ? +q.gx : gx, q.tK + q.dG / 2, q.tK + q.bG - q.dG / 2), rX = ara(q.rx != null ? +q.rx : rx, xR + q.dR / 2, xo1 - q.dR / 2), yCk = ara(q.yC != null ? +q.yC : yC0, cA + q.dC / 2, cB - q.dC / 2);
    const zGi = zB + Math.max(0, +q.hG || 0), zRa = zB + Math.max(0, +q.hR || 0), zCi = zB + Math.max(0, +q.hC || 0);
    // boru delikleri yalnız saha borulamasından ya da elle yer verilince açılır (gx / rx / yC); yer bilgisi her zaman G.boruYer'de
    G.boruYer = {}; const AKTIF = { giris: q.gx != null, ras: q.rx != null, cikis: q.yC != null };
    const boru = (k, p, yon, d, z0, pts, kp, duvar) => { G.boruYer[k] = { k, p, yon, d, z: z0 + d / 2, z0, duvar }; if (!AKTIF[k]) return; G.boru.push({ k, p, yon, d, z: z0 + d / 2, z0, duvar }); G.acik.push({ k: 'boru', boru: k, pts, z0, z1: z0 + d }); kes(kp, z0 - (z0 <= zB + 1e-9 ? 0.01 : 0), z0 + d, 'boru'); };
    boru('giris', [gX, yb], [0, -1], q.dG, zGi, rect(gX - q.dG / 2, yb, gX + q.dG / 2, yb + q.tK), rect(gX - q.dG / 2, yb - dl, gX + q.dG / 2, yb + q.tK + dl), { eksen: 'x', y: yb, a: q.tK + q.dG / 2, b: q.tK + q.bG - q.dG / 2, ad: 'Giriş borusu (giriş kanalı alt ucu)' });
    boru('ras', [rX, yb], [0, -1], q.dR, zRa, rect(rX - q.dR / 2, yb, rX + q.dR / 2, yb + q.tK), rect(rX - q.dR / 2, yb - dl, rX + q.dR / 2, yb + q.tK + dl), { eksen: 'x', y: yb, a: xR + q.dR / 2, b: xo1 - q.dR / 2, ad: 'RAS borusu (çıkış kanalı alt ucu)' });
    boru('cikis', [Lo, yCk], [1, 0], q.dC, zCi, rect(xo1, yCk - q.dC / 2, Lo, yCk + q.dC / 2), rect(xo1 - dl, yCk - q.dC / 2, Lo + dl, yCk + q.dC / 2), { eksen: 'y', x: Lo, a: cA + q.dC / 2, b: cB - q.dC / 2, ad: 'Çıkış borusu (çıkış kanalı dış duvarı)' });
    // taban plağı ve köprü
    // su tutucu bant: temel–perde birleşiminde perde eksenleri boyunca (taban plağı üstünden 0,10 m yukarıda)
    { const zb = zB + 0.10, rc = q.Ro + q.two / 2, B = []; const R2b = q.Ro + q.two, xiL = (y, c) => xc1 - Math.sqrt(Math.max(0, R2b * R2b - (y - c) ** 2)), xiR = (y, c) => xc2 + Math.sqrt(Math.max(0, R2b * R2b - (y - c) ** 2)); const yol = (k, pts, closed) => B.push({ anahtar: k, pts, closed: !!closed, z: zb });
      for (let i = 0; i < n; i++) { const y = yc[i]; yol('sol-' + i, arc(xc1, y, rc, 90, 270)); yol('sag-' + i, arc(xc2, y, rc, -90, 90)); yol('orta-' + i, [[xc1, y], [xc2, y]]);
        const s = i % 2 === 0 ? 1 : -1, rp = q.rg + q.tg / 2; yol('perde-sol-' + i, [[xc1 + eB, y + s * rp], ...arc(xc1, y, rp, s > 0 ? 90 : 270, s > 0 ? 270 : 90).map(p => p)]); yol('perde-sag-' + i, [[xc2 - eB, y - s * rp], ...arc(xc2, y, rp, s > 0 ? 270 : 90, s > 0 ? 450 : -90)]); }
      yol('alt', [[xc1, yc[0] - rc], [xc2, yc[0] - rc]]); yol('ust', [[xc1, yc[n - 1] + rc], [xc2, yc[n - 1] + rc]]);
      for (let i = 0; i + 1 < n; i++) { const y = yc[i] + q.Ro + q.two / 2; yol('ortak-' + i, [[xc1 - e1, y], [xc2 + e1, y]]); }
      const m = q.tK / 2; yol('kanal-sol', [[xiL(yb + m, yc[0]), yb + m], [m, yb + m], [m, yt - m], [xiL(yt - m, yc[n - 1]), yt - m]]);
      yol('kanal-sag', [[xiR(yb + m, yc[0]), yb + m], [Lo - m, yb + m], [Lo - m, yt - m], [xiR(yt - m, yc[n - 1]), yt - m]]);
      if (G.ara) yol('ara', [[xc2 + e1, G.ara.y], [Lo - m, G.ara.y]]);
      G.bantlar = B; }
    G.taban = { pts: rect(0, 0, Lo, Wo), z0: G.zF, z1: zB };
    // hacim (halka alanı × h × n) — karusel.js ile aynı formül
    const ring = Math.PI * ((q.rg + q.tg) ** 2 - q.rg ** 2);
    G.Ahalka = q.Ls * 2 * q.Ro - q.Ls * q.tw + Math.PI * q.Ro * q.Ro - ring;
    G.V = G.Ahalka * q.h * n;
    G.pen = { xo, xw0, xw1 };
    // köprü dışarıda merdiven sahanlığı kadar uzar; pencere kapakları için köprüye bitişik işletme sahanlıkları
    const altY = m => /alt/.test(String(m || '')); // merdiven havuzun alt uzun yanındaysa yolun dış ucu (merdiven sahanlığı) altta
    G.kopru.y0 = altY(q.m1) ? -q.mw : 0; G.kopru.y1 = altY(q.m1) ? Wo : Wo + q.mw;
    // ikinci yürüyüş yolu (halka başına 2 ve üzeri mikserde): uzun kısmın öbür ucunda, servis köprüsünün aynası
    if (q.k2) { const x0 = xc1 + (xc2 - G.kopru.x1); if (x0 + q.kb < xw0 - q.sahX - 0.5) G.kopru2 = { x0, x1: x0 + q.kb, y0: altY(q.m2) ? -q.mw : 0, y1: altY(q.m2) ? Wo : Wo + q.mw, z0: zTop, z1: zTop + q.kbT }; }
    G.sahanlik = [];
    // kapak işletme sahanlığı: perde yüzündeki pencere kapağını içine alır (kapak tarafında 0,45, öbür yanda 0,30 taşar), ortak duvarın iki yanına taşar (kapak, korkuluk ve yürüme yolu kesişmez)
    // döşemede kapak yarıkları: kapak çerçevesi (açıklık + 2 × 85 mm yuva gömmesi) + her yanda 5 cm; akış yönünde 0,30 m (çerçeve, kapak ve kaburgalar geçer)
    const yarik = (xm, B, ym) => { const w = B + 2 * q.yE + 2 * q.yP; return rect(xm - w / 2, ym - q.yD / 2, xm + w / 2, ym + q.yD / 2); };
    for (let i = 0; i + 1 < n; i++) { const y0 = yc[i] + q.Ro, y1 = y0 + q.two, ym = y0 - q.kY; G.sahanlik.push({ x0: xw0 - q.sahX, x1: xk0, y0: y0 - q.sahG, y1: y1 + q.sahE, z0: zTop, z1: zTop + q.kbT, yarik: [yarik((xw0 + xw1) / 2, q.ow, ym)] }); }
    // tretuvar (zemin kotunda, havuz çevresinde): kanallar boyunca dar, halkalar boyunca geniş, aralarda pahlı
    const t = q.tre, xa = Math.max(0, xc1 - R2 - t), xb = Math.min(Lo, xc2 + R2 + t * 0.6);
    G.tretuvar = { dis: [[-t, yb - t], [xa, yb - t], [xc1, -t], [xc2, -t], [xb, yb - t], [Lo + t, yb - t], [Lo + t, yt + t], [xb, yt + t], [xc2, Wo + t], [xc1, Wo + t], [xa, yt + t], [-t, yt + t]], kal: q.treT };
    return G;
  }

  /* ekipman yerleri (yerel koordinat; ünite çizimine göre): penstok, mikser, merdiven, korkuluk.
     mx: mikser seçimi {n, D, name, P, rpm} (yoksa mikser yok); zg: merdiven başındaki zemin kotu */
  function ekipmanYer(G, mx, zg) {
    const q = G.q, n = G.n, R2 = q.Ro + q.two, out = [], zK = G.kopru.z1;
    /* tahrik: zorla (EL / AKT) ya da kural (OTO): kapak alanı > akA m² ya da su kuvveti > akF kN ise elektrikli aktüatör */
    const pen = (anahtar, etiket, p, aci, z0, B, H) => {
      const hw = Math.max(0, G.zW - z0), F = hw >= H ? 9.81 * B * H * (hw - H / 2) : 9.81 * B * hw * hw / 2;
      const tahrik = q.tahrik === 'EL' || q.tahrik === 'AKT' ? q.tahrik : (B * H > q.akA + 1e-9 || F > q.akF + 1e-9 ? 'AKT' : 'EL');
      out.push({ anahtar, tur: 'penstok', etiket, p, aci, z: z0, B, H, D: G.zTop - z0, hw, F, tahrik });
    };
    for (let i = 0; i < n; i++) {
      pen(`pen-sol-${i}`, `G/${LET[i]}`, [G.xc1 - R2 - q.kY, G.yc[i]], 0, G.zS, q.ag, q.ah); // giriş kanalından halkaya; düz yüze dayalı
      pen(`pen-sag-${i}`, `C/${LET[i]}`, [G.xc2 + R2 + q.kY, G.yc[i]], n > 1 && i === 0 ? 180 : 0, G.zS, q.ag, q.ah); // RAS halkasına giriş, diğerlerinde çıkış
    }
    for (let i = 0; i + 1 < n; i++) { // ortak duvarda: pencere kapağı perdenin yüzünde
      pen(`pen-pen-${i}`, `P/${LET[i]}`, [(G.pen.xw0 + G.pen.xw1) / 2, G.yc[i] + q.Ro - q.kY], 90, G.zSp, q.ow, G.zHp - G.zSp); // perde yüzüne monte (akışın geldiği yüz)
      if (q.tahrik !== 'EL' && q.tahrik !== 'AKT') { // aynı perdedeki kapaklar tek tip: biri aktüatörlüyse ikisi de
        const ik = out.slice(-2); if (ik.some(x => x.tahrik === 'AKT')) ik.forEach(x => { x.tahrik = 'AKT'; });
      }
    }
    if (G.ara) pen('pen-bolme', 'B', [(G.ara.g0 + G.ara.g1) / 2, G.ara.y - q.tK / 2 - q.kY], 90, G.zB, q.ag, q.bO); // ara duvarda tabandaki orifis kapağı, perdenin RAS yüzünde
    /* mikserler: yürüyüş yolunun uzun kısma bakan yüzünde, uzun kısma doğru akan koridorda (kılavuz direk köprü kenarında, vinçle köprüden alınır).
       Servis köprüsünde ceil(n/2), ikinci yürüyüş yolunda (halka başına 2 ve üzeri mikserde) kalanı */
    if (mx && mx.n) {
      const Lm = 0.70, n1 = G.kopru2 ? Math.ceil(mx.n / 2) : mx.n, n2 = G.kopru2 ? mx.n - n1 : 0; let k = 0;
      for (const H of G.halka) for (const [kp, dir, cnt] of [[G.kopru, -1, n1], [G.kopru2, 1, n2]]) {
        if (!kp || !cnt) continue;
        const ust = H.yon === dir, xd = dir > 0 ? kp.x1 + 0.06 : kp.x0 - 0.06, x = xd + dir * (Lm / 2 + 0.12); // üst koridor akışı = yon; direk tabliye ön yüzünde
        for (let m = 0; m < cnt; m++) {
          let y = ust ? H.yc + q.tw / 2 + G.b * (m + 0.5) / cnt : H.yc - q.tw / 2 - G.b * (m + 0.5) / cnt; // köprü bastonun üstündeyse direk baston ucunun önünde (ona da bağlanır)
          for (const s of kp === G.kopru ? G.sahanlik : []) if (y > s.y0 - 0.12 && y < s.y1 + 0.12) y = y < (s.y0 + s.y1) / 2 ? s.y0 - 0.12 : s.y1 + 0.12; // direk kapak sahanlığına değmesin
          out.push({ anahtar: `mik-${H.i}-${dir > 0 ? 'k2' : 'k1'}-${m}`, tur: 'mikser', etiket: `${LET[k++]}`, p: [x, y], aci: dir > 0 ? 0 : 180, z: G.zB, D: mx.D, P: mx.P, rpm: mx.rpm, ad: mx.name, Hd: kp.z1 - G.zB, direk: [xd, y], vinc: [xd - dir * 0.36, y] });
        }
      }
    }
    // merdiven(ler): yer seçimli — havuzun yanı (üst / alt uzun yan) ve yola giriş yönü (soldan / sağdan); m1 = servis köprüsü, m2 = ikinci yol.
    // Varsayılan: üst yanda, iki merdiven birbirine bakar (ikisi de aradaki uzun kısımdan kendi yoluna çıkar); yer yetmezse yön çevrilir.
    const z0 = zg != null ? zg : G.zTop - 2.25, H = zK - z0, a = 0.05;
    const nr = Math.max(2, Math.ceil(H / q.mh - 1e-9)), Lk = (nr - 1) * q.mb;
    for (const [kp, sfx] of [[G.kopru, ''], [G.kopru2, '-2']]) {
      if (!kp) continue;
      const m = merdivenYeri(G, kp === G.kopru ? 1 : 2, Lk), alt = m.yan === 'alt', sag = m.yon === 'sag';
      if (H > 0.3) {
        const ym = alt ? -q.mw / 2 : G.Wo + q.mw / 2, xs = sag ? kp.x1 : kp.x0, d = sag ? 1 : -1;
        const kork = (sag ? -1 : 1) * (alt ? -1 : 1) > 0 ? 'sol' : 'sag'; // dış korkuluk havuzun dışında kalan yanda
        out.push({ anahtar: 'merdiven' + sfx, tur: 'merdiven', pts: [[xs + d * Lk, ym], [xs, ym]], z0, z1: zK, w: q.mw, b: q.mb, hmax: q.mh, nr, usL: kp.x1 - kp.x0, t: q.kbT, kork, yan: m.yan, yon: m.yon });
      }
      // korkuluk: yolun ve merdiven sahanlığının çevresi; merdivenin çıktığı kenar açık, sol kenar kapak sahanlıklarının çevresinden dolanır
      const k0 = kp.x0 + a, k1 = kp.x1 - a, yA = kp.y0 + a, yB = kp.y1 - a, dol = [];
      if (kp === G.kopru) for (const s of G.sahanlik) dol.push([k0, s.y0 + a], [s.x0 + a, s.y0 + a], [s.x0 + a, s.y1 - a], [k0, s.y1 - a]);
      const dolA = dol.slice().reverse(); // sol kenar yukarıdan aşağı
      const [lo, hi] = alt ? [yA, 0] : [G.Wo, yB];
      const pts = !sag
        ? [[k0, lo], ...dolA.filter(p => p[1] < lo), [k0, yA], [k1, yA], [k1, yB], [k0, yB], ...dolA.filter(p => p[1] > hi), [k0, hi]]
        : [[k1, hi], [k1, yB], [k0, yB], ...dolA, [k0, yA], [k1, yA], [k1, lo]];
      out.push({ anahtar: 'korkuluk-kopru' + sfx, tur: 'korkuluk', pts, z: zK });
    }
    return out;
  }
  /* merdiven yeri: { yan: 'ust' | 'alt', yon: 'sol' | 'sag' } — q.m1 / q.m2 ('ust-sol' gibi) ya da varsayılan */
  function merdivenYeri(G, k, Lk) {
    const q = G.q, kp = k === 1 ? G.kopru : G.kopru2, el = String((k === 1 ? q.m1 : q.m2) || '');
    const yan = /alt/.test(el) ? 'alt' : 'ust';
    // merdiven hep içe bakar: yola havuzun ortasındaki uzun kısımdan çıkar (servis köprüsüne soldan, ikinci yola sağdan); aynı yandaki öbür merdivenle çakışırsa ya da yer yetmezse dıştan
    let yon = k === 1 ? 'sol' : 'sag';
    if (k === 2 && G.kopru2) { const yan1 = /alt/.test(String(q.m1 || '')) ? 'alt' : 'ust'; if (yan1 === yan && !(G.kopru2.x1 + Lk + 1.0 <= G.kopru.x0 - Lk)) yon = 'sol'; }
    if (yon === 'sol' && kp.x0 - Lk < -q.tre) yon = 'sag'; else if (yon === 'sag' && kp.x1 + Lk > G.Lo + q.tre) yon = 'sol';
    return { yan, yon };
  }

  /* ================= HİDROLİK: maks. ve min. su kotları =================
     Akış: ham su giriş kanalından kapaklı ağızla ilk ham su halkasına, RAS sağ kanalın alt bölümünden RAS halkasına;
     halkalar arası pencereler (RAS → 1 → 2 …), son halkadan sağ ağızla çıkış kanalına. Ağız / pencere / orifis batık orifis:
     Δh = (Q / (Cd·A))² / 2g. Kotlar mansaptan (çıkış kanalı) yukarı toplanır.
     Mansap (3. parçada hidrolik profilden gelecek): maks. debide son halka = tasarım su yüzü; min. debide çıkış kanalı,
     mansap savağının (boy Ls) yük farkı kadar düşer: h = (Q / (1,84·Ls))^(2/3).
     o: { Qmax, Qmin, QRS (m³/h), Cd (0,61), Ls (m), zRef (son halkada maks. su yüzü; yoksa tasarım su yüzü) } */
  function hidrolik(G, o) {
    o = o || {}; const q = G.q, n = G.n, g = 9.81, Cd = o.Cd || 0.61, Ls = o.Ls || 2.0, QRS = n > 1 ? (+o.QRS || 0) : 0;
    // ıslak alan: açıklık eni × (mansap su yüzü − eşik), en çok açıklık yüksekliği (Çokal'da su 96,64 ağız üstü 96,75'in altında)
    const dh = (Qh, b, zd, z0, hA) => { const Q = Qh / 3600, A = b * Math.min(hA, Math.max(0.05, zd - z0)); return Math.pow(Q / (Cd * A), 2) / (2 * g); };
    const hS = Qh => Math.pow(Qh / 3600 / (1.84 * Ls), 2 / 3), h0 = n > 1 ? 1 : 0, ag = (Q, zd) => dh(Q, q.ag, zd, G.zS, q.ah), pen = (Q, zd) => dh(Q, q.ow, zd, G.zSp, G.zHp - G.zSp);
    const zRef = o.zRef != null ? +o.zRef : G.zW, Qx = +o.Qmax || 0, Qn = +o.Qmin || 0;
    const zCmax = zRef - ag(Qx + QRS, zRef - 0.01), zCmin = zCmax - (hS(Qx + QRS) - hS(Qn + QRS));
    const hal = (Q, zC) => {
      const z = new Array(n); z[n - 1] = zC + ag(Q + QRS, zC);
      for (let i = n - 2; i >= 0; i--) z[i] = z[i + 1] + pen((i === 0 && n > 1 ? QRS : QRS + Q), z[i + 1]);
      const r = { cikis: zC, halka: z, giris: z[h0] + ag(Q, z[h0]) };
      if (n > 1) r.ras = z[0] + ag(QRS, z[0]); // RAS bölümü; ara duvar orifisi normalde kapalı
      return r;
    };
    const maks = hal(Qx, zCmax), min = hal(Qn, zCmin), uyari = [];
    const enYuksek = Math.max(maks.giris, ...(maks.ras != null ? [maks.ras] : []), ...maks.halka);
    if (G.zTop - enYuksek < 0.30) uyari.push(`Maks. su kotu ${enYuksek.toFixed(2)}: duvar üstüne ${(G.zTop - enYuksek).toFixed(2)} m kalıyor (en az 0,30 m olmalı).`);
    if (min.cikis < G.zS + 0.10) uyari.push(`Min. debide çıkış kanalı su kotu (${min.cikis.toFixed(2)}) ağız eşiğine (${G.zS.toFixed(2)}) çok yakın.`);
    return { maks, min, uyari, kabul: { Cd, Ls, QRS, zRef } };
  }

  /* ================= DEBİDEN BOYUTLANDIRMA (öneri kuralları; Çokal T-105 oranlarından) =================
     o: { Qd (m³/gün), Qmax, Qmin, QRS (m³/h; boşsa Çokal oranları), h (su derinliği; boşsa 4,5 m), n (3), t (temas süresi 0,75 sa),
          v (pencere ve orifiste en çok hız 0,30 m/s), va (ağızda 0,50 m/s), vb (borularda 1,0 m/s), k (düz boy / halka iç eni, Çokal 11/3 ≈ 3,7) }
     - Debiler: Q ort. = Qd/24, Q maks. = 1,9 × Q ort. (Çokal 275,83 / 145,83), Q min. = 0,5 × Q ort., RAS = %75 × Q maks.
     - Hacim = t × (Q ort. + RAS); halka iç yarıçapı, düz boy = k × halka iç eni olacak şekilde; kılavuz perde rg = 0,47 Ro (Çokal 0,70/1,50).
     - Ağız, pencere, orifis: ıslak alan ≥ Q / v; ağız ve pencere üstü su yüzünden 0,11 m yukarıda (Çokal 96,75 / 96,64).
     - Borular PE100 SDR17, iç çap hızdan; delik = boru dış çapı. */
  const PE = [315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000, 1200, 1400, 1600];
  const yukari = (v, s) => Math.ceil(v / s - 1e-9) * s;
  function boyutla(o) {
    o = o || {}; const n = o.n || 3, Qo = (+o.Qd || 0) / 24, Qx = +o.Qmax || 1.9 * Qo, Qn = +o.Qmin || 0.5 * Qo, QRS = +o.QRS || 0.75 * Qx;
    const t = o.t || 0.75, h = o.h || 4.5, v = o.v || 0.30, va = o.va || 0.50, vb = o.vb || 1.0, k = o.k || 11 / 3, tw = DEF.tw, tg = DEF.tg, ust = 0.11;
    const V = t * (Qo + QRS), A = V / (h * n);
    const alan = (Ro, Ls) => { const rg = 0.47 * Ro; return Ls * (2 * Ro - tw) + Math.PI * Ro * Ro - Math.PI * ((rg + tg) ** 2 - rg * rg); };
    let a = 0.75, b = 15; for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (alan(m, k * 2 * m) < A) a = m; else b = m; }
    const Ro = +Math.max(1.5, yukari(b, 0.05)).toFixed(2), rg = +(Math.round(0.47 * Ro / 0.05) * 0.05).toFixed(2), Ls0 = (A - (Math.PI * Ro * Ro - Math.PI * ((rg + tg) ** 2 - rg * rg))) / (2 * Ro - tw);
    const Ls = +Math.max(2, yukari(Ls0, 0.10)).toFixed(2);
    // açıklık: en az genişlik / yükseklik (Çokal); önce genişlik büyür (en çok wMax), sonra yükseklik
    const acik = (Qh, w0, wMax, h0, vv) => { const Ar = Qh / 3600 / (vv || v); let w = w0, hw = h0 - ust; if (w * hw < Ar) { w = Math.min(wMax, yukari(Ar / hw, 0.05)); if (w * hw < Ar) hw = Ar / w; } const hh = Math.min(h - 0.5, yukari(hw + ust, 0.05)); return { w: +w.toFixed(2), h: +hh.toFixed(2), d: +(hh - ust).toFixed(2), A: w * (hh - ust) }; };
    const ag = acik(Qx + QRS, 0.60, Math.min(2.00, Ro), 1.0, va); // ağızda hız sınırı 0,50 m/s (onaylandı) // en büyük akış: son halkadan çıkış ağzı
    const pe = acik(Qx + QRS, 1.50, Math.min(3.00, 2 * Ro - 0.6), 1.0);
    const bO = Math.max(0.60, yukari(QRS / 3600 / v / ag.w, 0.05)); // ara duvar orifisi (RAS)
    const boru = Qh => { const di = Math.sqrt(4 * Qh / 3600 / (Math.PI * vb)); const od = PE.find(d => d / 1000 * (1 - 2 / 17) >= di) || PE[PE.length - 1]; return od / 1000; };
    // kanallar açıklıkla birlikte büyür (Çokal: ağız 0,60 → giriş kanalı 0,80, çıkış kanalı 1,00; çıkışta ara duvar kapağı 0,20 içeride) ve kanal hızı ≤ v
    const dK = h; // kanal tabanı halka tabanıyla aynı
    const bG = Math.max(0.80, yukari(ag.w + 0.20, 0.05), yukari((Qx / 3600) / (v * dK), 0.05)), bC = Math.max(1.00, yukari(ag.w + 0.40, 0.05), yukari(((Qx + QRS) / 3600) / (v * dK), 0.05));
    const par = { n, h, Ro, rg, tg, tw, Ls, ag: ag.w, ah: ag.h, dAg: ag.d, ow: pe.w, oh: pe.h, dPe: pe.d, bO: +bO.toFixed(2), bG: +bG.toFixed(2), bC: +bC.toFixed(2), dG: boru(Qx), dR: boru(QRS), dC: boru(Qx + QRS) };
    const Ah = alan(Ro, Ls) - (Ls0 > 0 ? 0 : 0); // bilgi
    return { par, debi: { Qort: Qo, Qmax: Qx, Qmin: Qn, QRS }, V, Vk: alan(Ro, Ls) * h * n, t: alan(Ro, Ls) * h * n / (Qo + QRS), hiz: { agiz: (Qx + QRS) / 3600 / ag.A, pencere: (Qx + QRS) / 3600 / pe.A }, Ah };
  }

  /* ================= AKIŞ YOLU (3B canlandırma için) =================
     Halkada su, koridor ekseni boyunca yarış pisti yolunda döner: r yarıçaplı yolda s mesafesindeki nokta (yerel).
     yon +1: üst koridor +x (saat yönü), −1: alt koridor +x. Yol boyu = 2·Ls + 2πr. */
  function akisNokta(G, i, r, s) {
    const q = G.q, H = G.halka[i], L = q.Ls, P = 2 * L + 2 * Math.PI * r; let u = ((s % P) + P) % P;
    let x, y; // saat yönü tersi: alt düz (+x) → sağ yay → üst düz (−x) → sol yay
    if (u < L) { x = G.xc1 + u; y = H.yc - r; }
    else if ((u -= L) < Math.PI * r) { const a = -Math.PI / 2 + u / r; x = G.xc2 + r * Math.cos(a); y = H.yc + r * Math.sin(a); }
    else if ((u -= Math.PI * r) < L) { x = G.xc2 - u; y = H.yc + r; }
    else { u -= L; const a = Math.PI / 2 + u / r; x = G.xc1 + r * Math.cos(a); y = H.yc + r * Math.sin(a); }
    if (H.yon > 0) y = 2 * H.yc - y; // saat yönü: aynala (üst koridor +x)
    return [x, y];
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { geo, DEF, ucgenle, bolgeKati, ekipmanYer, hidrolik, boyutla, akisNokta };
  if (!C) return;
  C.ANAEROBIK_DEF = DEF;
  C.anaerobikGeo = geo;
  /* STATİK: anaerobik havuzdan statik penceresinin 3B kabuk modeli (statik-oval.js C.statikKabukModel ile aynı biçim).
     Perde eksenleri su tutucu bant yollarından (G.bantlar) alınır; dış duvar / halka yayları / ortak duvarlar / kanal duvarları
     dış ya da bölme perde, orta ve yönlendirme perdeleri iç perde (iki yanda aynı su). Radye: taban plağı. */
  const r3 = v => Math.round(v * 1000) / 1000;
  C.anaerobikStatikModel = e => {
    const G = geo(e), q = G.q, f = C.frame(e.o, e.rot), W = p => { const w = f.at(p[0], p[1], 0); return [r3(w[0]), r3(w[1])]; };
    const tur = k => /^(sol|sag)-/.test(k) ? { t: q.two, tip: 'dis', bolme: true } : /^(alt|ust)$/.test(k) ? { t: q.two, tip: 'dis', bolme: false }
      : /^kanal-/.test(k) ? { t: q.tK, tip: 'dis', bolme: false } : /^ortak-/.test(k) ? { t: q.two, tip: 'ic', bolme: true } : k === 'ara' ? { t: q.tK, tip: 'ic', bolme: true }
      : /^orta-/.test(k) ? { t: q.tw, tip: 'ic', bolme: false } : { t: q.tg, tip: 'ic', bolme: false };
    const ad = k => k.replace(/^sol-(\d+)/, (m, i) => `Y${+i + 1}S`).replace(/^sag-(\d+)/, (m, i) => `Y${+i + 1}D`).replace(/^orta-(\d+)/, (m, i) => `O${+i + 1}`).replace(/^perde-sol-(\d+)/, (m, i) => `YP${+i + 1}S`).replace(/^perde-sag-(\d+)/, (m, i) => `YP${+i + 1}D`).replace(/^ortak-(\d+)/, (m, i) => `OR${+i + 1}`).replace('kanal-sol', 'KG').replace('kanal-sag', 'KC').replace('alt', 'DA').replace('ust', 'DU').replace('ara', 'AR');
    const walls = G.bantlar.map(b => Object.assign({ id: `${e.id}:${b.anahtar}`, ad: ad(b.anahtar), pts: b.pts.map(W), kapali: !!b.closed, zt: r3(G.zTop) }, tur(b.anahtar)));
    const radye = { id: e.id, pts: G.taban.pts.map(W), t: r3(q.tb), kAlt: r3(G.zF) };
    // su bölmeleri: halkalar (iç yüze kadar oval) ve iki kanal (dış duvarla halka yaylarının dış yüzü arası); senaryolar (kullanıcı kabulü):
    // hepsi dolu · her ara halka boş, öbürleri dolu (3 halkada "iki yan dolu, orta boş") · iki uç halka için de bir yanı boş
    const bolmeler = [], R2b = q.Ro + q.two, ks = G.bantlar.find(b => b.anahtar === 'kanal-sol').pts, yA = ks[1][1] + q.tK / 2, yU = ks[2][1] - q.tK / 2;
    G.yc.forEach((yc, i) => { const P = []; for (let k = 0; k <= 24; k++) { const a = (-90 + 180 * k / 24) * Math.PI / 180; P.push([G.xc2 + q.Ro * Math.cos(a), yc + q.Ro * Math.sin(a)]); } for (let k = 0; k <= 24; k++) { const a = (90 + 180 * k / 24) * Math.PI / 180; P.push([G.xc1 + q.Ro * Math.cos(a), yc + q.Ro * Math.sin(a)]); } bolmeler.push({ ad: 'H' + (i + 1), pts: P.map(W) }); });
    const kanal = (sag) => { const P = [], x0 = sag ? G.Lo - q.tK : q.tK, xs = y => { let x = sag ? G.xc2 : G.xc1; for (const yc of G.yc) { const d = Math.abs(y - yc); if (d < R2b) { const s = Math.sqrt(R2b * R2b - d * d); x = sag ? Math.max(x, G.xc2 + s) : Math.min(x, G.xc1 - s); } } return x; };
      const N = Math.max(8, Math.ceil((yU - yA) / 0.1)); P.push([x0, yA]); for (let k = 0; k <= N; k++) { const y = yA + (yU - yA) * k / N; P.push([xs(y), y]); } P.push([x0, yU]); return P.map(W); };
    bolmeler.push({ ad: 'KG', pts: kanal(false) }, { ad: 'KC', pts: kanal(true) });
    const tum = bolmeler.map(b => b.ad), senaryolar = [{ ad: 'Hepsi dolu', dolu: tum }];
    for (let i = 0; i < G.n; i++) if (G.n === 1 ? false : (i > 0 && i < G.n - 1) || G.n === 2) senaryolar.push({ ad: G.n === 3 ? 'İki yan dolu, orta boş' : `H${i + 1} boş, diğerleri dolu`, dolu: tum.filter(a => a !== 'H' + (i + 1)) });
    const xs = walls.flatMap(w => w.pts.map(p => p[0])), ys = walls.flatMap(w => w.pts.map(p => p[1]));
    const tw = Math.max(...walls.filter(w => w.tip === 'dis').map(w => w.t)), ti = Math.max(...walls.filter(w => w.tip !== 'dis').map(w => w.t));
    const geo0 = { Lx: r3(Math.max(...xs) - Math.min(...xs)), Ly: r3(Math.max(...ys) - Math.min(...ys)), tw, ti, hr: radye.t, toe: 0, bolX: [], bolY: [], doseme: [], kAlt: radye.kAlt, kUst: r3(G.zTop), kSu: r3(G.zW), ust: 'S' };
    return { t: Date.now(), kaynak: 'anaerobik', kabuk: { walls, radye, dosemeler: [], bolmeler, senaryolar }, geo: geo0, koken: [Math.min(...xs), Math.min(...ys)],
      ozet: `${e.code || ''} anaerobik havuz: ${walls.length} perde (${walls.filter(w => w.tip === 'dis').length} dış), radye ${Math.round(radye.t * 100)} cm · kot ${r3(radye.kAlt)} → ${r3(G.zTop)}, su ${r3(G.zW)}`, uyar: [] };
  };
  C.bolgeKati = bolgeKati; C.ucgenle = ucgenle; // ortak: delikli plan şeklinden katı (ön arıtma vb. de kullanır)
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
  /* mikser sayısı ve tipi: önce mikser hesabı penceresinin sonucu (aynı halka için yapılmışsa: koridor ve düz boy tutuyorsa),
     yoksa programın aynı yöntemle otomatik seçimi. Hesap sonucu projeye (e.mikser) yazılır, dosyayla birlikte saklanır. */
  const tutar = (t, G) => t && Math.abs(+t.b - G.b) < 0.15 && Math.abs(+t.Ls - G.q.Ls) <= Math.max(1, 0.15 * G.q.Ls);
  const mixKaynak = (e, G) => {
    let S = null; try { S = JSON.parse(localStorage.getItem('mixer-analysis-v1') || 'null'); } catch (er) { S = null; }
    if (S && S.tank && S.tank.type !== 'rect' && S.tank.type !== 'circ' && Array.isArray(S.mixers) && S.mixers.length && tutar(S.tank, G)) {
      const m0 = S.mixers[0], yeni = { n: S.mixers.length, D: +m0.D, P: +m0.P, rpm: +m0.rpm, name: `Ø${String(m0.D).replace('.', ',')} m, ${String(m0.P).replace('.', ',')} kW`, kaynak: 'Mikser hesabı', b: +S.tank.b, Ls: +S.tank.Ls };
      if (JSON.stringify(yeni) !== JSON.stringify(e.mikser)) e.mikser = yeni;
    }
    if (e.mikser && e.mikser.kaynak === 'Mikser hesabı' && tutar(e.mikser, G)) return e.mikser;
    const r = mix(e, G); return r ? Object.assign({ kaynak: 'otomatik seçim' }, r) : null;
  };
  const halkaAd = (e, G, i) => (i === 0 && G.n > 1 ? 'RAS' : `${e.code || ''}/${G.n > 1 ? i : 1}`);

  T.anaerobik = {
    label: 'Anaerobik havuz', ifc: 'IfcTank',
    prims: e => {
      const G = geo(e), q = G.q, f = C.frame(e.o, e.rot), z = G.zTop, out = [], h = tH(), hB = tH(3.5);
      const rd = (() => { let r = ((e.rot || 0) % 360 + 360) % 360; if (r > 90 && r <= 270) r -= 180; return r * RAD; })();
      const PL = (pts, c, o) => P(pts.map(p => f.at(p[0], p[1], z)), c, o);
      const T1 = (x, y, s, o, al) => TX(f.at(x, y, z), o && o.h || h, s, rd, al || 'M', o);
      // beton: dış kabuk, su hacimleri (delikler), bağımsız perdeler
      for (const h of [G.bolge.dis, ...G.bolge.delik]) out.push(PL(h, true, { lw: 50 }));
      for (const p of G.parca) out.push(PL(p.pts, true, { lw: 35 }));
      // görünmeyen açıklıklar (kesikli): ağız, orifis, pencere, boru
      for (const a of G.acik) out.push(PL(a.pts, true, { lt: 'DASHED', color: 8, lw: 18 }));
      // köprü
      const k = G.kopru; out.push(PL([[k.x0, k.y0], [k.x1, k.y0], [k.x1, k.y1], [k.x0, k.y1]], true, { color: 30, lw: 35 }));
      for (const sh of G.sahanlik) { out.push(PL([[sh.x0, sh.y0], [k.x0, sh.y0], [k.x0, sh.y1], [sh.x0, sh.y1]], true, { color: 30, lw: 25 })); for (const y of sh.yarik || []) out.push(PL(y, true, { color: 30, lw: 18 })); }
      out.push(P(G.tretuvar.dis.map(p => f.at(p[0], p[1], z)), true, { color: 8, lw: 18 }));
      out.push(T1((k.x0 + k.x1) / 2, G.Wo + 0.9, `Servis köprüsü ${f2(q.kb)} m · ${kot(k.z1)}`, { color: 30 }));
      if (G.kopru2) { const k2 = G.kopru2; out.push(PL([[k2.x0, k2.y0], [k2.x1, k2.y0], [k2.x1, k2.y1], [k2.x0, k2.y1]], true, { color: 30, lw: 35 }), T1((k2.x0 + k2.x1) / 2, G.Wo + 0.9, `Yürüyüş yolu ${f2(q.kb)} m · ${kot(k2.z1)}`, { color: 30 })); }
      // kapaklar
      const un = unum(e);
      if (!e.ekipman) G.kapak.forEach((c, i) => out.push(L(f.at(c.a[0], c.a[1], z), f.at(c.b[0], c.b[1], z), { color: 6, lw: 70 })));
      const agL = G.kapak.filter(c => c.k === 'agiz' && c.yan === 'sol'), agR = G.kapak.filter(c => c.k === 'agiz' && c.yan === 'sag');
      agL.forEach((c, i) => out.push(T1(c.a[0] - 0.15, c.b[1] + 0.25, `SK-${un}G/${LET[i]}`, { color: 6 }, 'R')));
      agR.forEach((c, i) => out.push(T1(c.a[0] + 0.15, c.b[1] + 0.25, `SK-${un}C/${LET[i]}`, { color: 6 }, 'L')));
      G.kapak.filter(c => c.k === 'pencere').forEach((c, i) => out.push(T1((c.a[0] + c.b[0]) / 2, c.a[1] + 0.45, `SK-${un}P/${LET[i]} ${c.eb}`, { color: 6 })));
      G.kapak.filter(c => c.k === 'bolme').forEach(c => out.push(T1(c.b[0] + 0.2, c.b[1] + 0.35, `SK-${un}B ${c.eb}`, { color: 6 }, 'L')));
      // halka adları, akış okları, mikserler
      const mx = mixKaynak(e, G);
      for (const H of G.halka) {
        out.push(T1(G.xc1 + q.Ls * 0.35, H.yc + q.tw / 2 + G.b * 0.5, halkaAd(e, G, H.i), { color: 2, h: hB }));
        for (const [yy, sg] of [[H.yc + q.tw / 2 + G.b * 0.5, H.yon], [H.yc - q.tw / 2 - G.b * 0.5, -H.yon]]) {
          const xa = G.xc1 + q.Ls * 0.62, ln = Math.min(1.2, q.Ls * 0.08);
          out.push(L(f.at(xa - sg * ln, yy, z), f.at(xa + sg * ln, yy, z), { color: 5, lw: 35 }), L(f.at(xa + sg * ln, yy, z), f.at(xa + sg * (ln - 0.35), yy + 0.18, z), { color: 5, lw: 35 }), L(f.at(xa + sg * ln, yy, z), f.at(xa + sg * (ln - 0.35), yy - 0.18, z), { color: 5, lw: 35 }));
        }
        if (mx && !e.ekipman) { // çıkış uçlarında: sol dönüş çıkışı ve sağ dönüş çıkışı koridorları
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
      for (const [k, ad] of [['giris', 'Giriş borusu'], ['ras', 'RAS borusu']]) { const b = G.boru.find(x => x.k === k); if (b) out.push(T1(b.p[0], G.kanal.yb - 0.9, `${ad} Ø${f0(b.d * 1000)}`, { color: 1 })); }
      const cb = G.boru.find(b => b.k === 'cikis'); if (cb) out.push(T1(cb.p[0] + 0.3, cb.p[1], `Çıkış Ø${f0(cb.d * 1000)}`, { color: 1 }, 'L'));
      out.push(T1(q.tK + q.bG / 2, (G.kanal.yb + G.kanal.yt) / 2, `Giriş kanalı ${f2(q.bG)}`, { color: 8 }), T1(G.xR + q.bC / 2, (G.kanal.yb + G.kanal.yt) / 2 + 1.2, `Çıkış kanalı ${f2(q.bC)}`, { color: 8 }));
      if (G.n > 1) out.push(T1(G.xR + q.bC / 2, G.yc[0], 'RAS girişi', { color: 8 }));
      const o0 = G.acik.find(a => a.k === 'orifis'); if (o0) out.push(T1((G.ara.g0 + G.ara.g1) / 2, o0.pts[0][1] - 0.35, `Orifis ${f0(q.ag * 100)}×${f0(q.bO * 100)} (${kot(G.zB)})`, { color: 8 }));
      out.push(T1(G.Lo / 2, -1.4, `Ağız ${f2(q.ag)}×${f2(q.ah)} m: ${kot(G.zS)} – ${kot(G.zH)} · su ${kot(G.zW)} · taban ${kot(G.zB)} · duvar üstü ${kot(G.zTop)}`, { color: 3 }));
      // başlık
      out.push(TX(f.at(G.Lo / 2, G.Wo + h * 9, z), tH(5), `${e.code || ''} ${e.name || 'Anaerobik havuz'}`.trim(), rd, 'C', { color: 2 }));
      out.push(TX(f.at(G.Lo / 2, G.Wo + h * 5.5, z), h, `${G.n} halka · düz ${f2(q.Ls)} m · koridor ${f2(G.b)} m · su ${f2(q.h)} m · V = ${f0(G.V)} m³${mx ? ` · mikser ${G.n}×${mx.n} ${mx.name}` : ''} · ${f2(G.Lo)} × ${f2(G.Wo)} m`, rd, 'C'));
      return out;
    },
    mesh: e => {
      const G = geo(e), f = C.frame(e.o, e.rot), out = [];
      // beton duvarlar: tek katı, ağız / pencere / orifis / boru boşlukları katıdan çıkarılır (birleşme izi kalmaz)
      const key = JSON.stringify([G.q, e.o, e.rot]);
      if (!e._ag || e._agK !== key) {
        const uy = M.cross([0, 0, 1], f.ux), W = p => f.at(p[0], p[1], p[2]), Wn = n => [f.ux[0] * n[0] + uy[0] * n[1], f.ux[1] * n[0] + uy[1] * n[1], n[2]];
        const K = bolgeKati(G.bolge, G.zB, G.zTop);
        const ag = { t: 'tri', v: K.v.map(W), vn: K.vn.map(Wn), f: K.f, edges3: K.e.map(ab => ab.map(W)) };
        let son = ag;
        if (C.boslukAg) { try { son = C.boslukAg([ag], G.kes.map(k => ({ pts: k.pts.map(p => f.at(p[0], p[1], k.z0)), d: [0, 0, k.z1 - k.z0] })), [0.74, 0.74, 0.71]); } catch (er) { console.error('anaerobik boşluk', er); son = ag; } }
        e._ag = son; e._agK = key;
      }
      out.push(e._ag);
      for (const p of G.parca) out.push(ext(f.at(0, 0, p.z0), f.ux, [0, 0, 1], p.pts, p.z1 - p.z0));
      out.push(ext(f.at(0, 0, G.taban.z0), f.ux, [0, 0, 1], G.taban.pts, G.taban.z1 - G.taban.z0));
      const k = G.kopru; out.push(ext(f.at(0, 0, k.z0), f.ux, [0, 0, 1], [[k.x0, 0], [k.x1, 0], [k.x1, G.Wo], [k.x0, G.Wo]], k.z1 - k.z0)); // dışarıdaki uç merdivenin üst sahanlığı
      if (G.kopru2) { const k2 = G.kopru2; out.push(ext(f.at(0, 0, k2.z0), f.ux, [0, 0, 1], [[k2.x0, 0], [k2.x1, 0], [k2.x1, G.Wo], [k2.x0, G.Wo]], k2.z1 - k2.z0)); }
      for (const sh of G.sahanlik) { // kapak yarıklı döşeme
        const uy = M.cross([0, 0, 1], f.ux), W = p => f.at(p[0], p[1], p[2]), Wn = n => [f.ux[0] * n[0] + uy[0] * n[1], f.ux[1] * n[0] + uy[1] * n[1], n[2]];
        const Ks = bolgeKati({ dis: [[sh.x0, sh.y0], [k.x0, sh.y0], [k.x0, sh.y1], [sh.x0, sh.y1]], delik: (sh.yarik || []).map(y => y.slice().reverse()) }, sh.z0, sh.z1);
        out.push({ t: 'tri', v: Ks.v.map(W), vn: Ks.vn.map(Wn), f: Ks.f, edges3: Ks.e.map(ab => ab.map(W)) });
      }
      { // tretuvar: zemin kotunda havuz çevresi
        const zg = zemin(e, G), uy = M.cross([0, 0, 1], f.ux), W = p => f.at(p[0], p[1], p[2]), Wn = n => [f.ux[0] * n[0] + uy[0] * n[1], f.ux[1] * n[0] + uy[1] * n[1], n[2]];
        const Kt = bolgeKati({ dis: G.tretuvar.dis, delik: [G.bolge.dis.slice().reverse()] }, zg - G.tretuvar.kal, zg);
        out.push({ t: 'tri', v: Kt.v.map(W), vn: Kt.vn.map(Wn), f: Kt.f, edges3: Kt.e.map(ab => ab.map(W)), fc: Kt.f.map(() => [0.62, 0.62, 0.60]) });
      }
      return out;
    },
    snaps: e => { const G = geo(e), f = C.frame(e.o, e.rot); return [[0, 0], [G.Lo, 0], [G.Lo, G.Wo], [0, G.Wo]].map(p => ({ p: f.at(p[0], p[1], G.zTop), k: 'end' })); },
    xf: (e, X) => { const G = geo(e), f = C.frame(e.o, e.rot); const o2 = X.mir ? X.p(f.at(0, G.Wo)) : X.p(e.o); const v = X.v([Math.cos((e.rot || 0) * RAD), Math.sin((e.rot || 0) * RAD), 0]); e.rot = Math.atan2(v[1], v[0]) / RAD; e.o = [o2[0], o2[1], 0]; },
    info: e => { const G = geo(e); return `${e.code || ''} anaerobik havuz: ${G.n} halka, düz ${f2(G.q.Ls)} m, koridor ${f2(G.b)} m, V=${f0(G.V)} m³, ${f2(G.Lo)} × ${f2(G.Wo)} m`; },
  };

  /* ================= SU TUTUCU BANT (tüm su yapıları, ortak) =================
     yollar: [{ anahtar, pts (yerel), closed, z }] → perde eksenleri boyunca yalıtım/bant nesneleri (PVC iç tip, 24 cm); yapıyla birlikte güncellenir */
  C.suYapiBant = (e, yollar) => {
    if (!yollar || !C.T.yalitim) return; const f = C.frame(e.o, e.rot), W2 = p => { const w = f.at(p[0], p[1], 0); return [+w[0].toFixed(4), +w[1].toFixed(4)]; };
    if (C.ensureLayer) C.ensureLayer('INS_SU_TUTUCU_BANT', 5, 'CONTINUOUS', 25);
    const mevcut = new Map(C.doc.ents.filter(x => x.type === 'yalitim' && x.kind === 'bant' && x.bag === e.id).map(x => [x.anahtar, x])), yeni = new Set();
    for (const y of yollar) { const k = 'bant-' + y.anahtar, props = { pts: y.pts.map(W2), closed: !!y.closed, z: +(+y.z).toFixed(4) }; yeni.add(k); const x = mevcut.get(k);
      if (x) { if (JSON.stringify([x.pts, x.closed, x.z]) !== JSON.stringify([props.pts, props.closed, props.z])) { Object.assign(x, props); delete x._c; } }
      else { const z = C.add(C.newEnt('yalitim', Object.assign({ kind: 'bant', tip: 'pvc_ic', w: 24, t: 5, layer: 'INS_SU_TUTUCU_BANT', bag: e.id, anahtar: k }, props))); delete z.sp; } }
    const sil = [...mevcut.values()].filter(x => !yeni.has(x.anahtar)); if (sil.length && C.remove) C.remove(sil);
  };

  /* ================= EKİPMAN (penstok, mikser, merdiven, korkuluk) ================= */
  /* merdiven başındaki zemin kotu: arazi (ARAZI) varsa oradan, yoksa e.zg, yoksa duvar üstü − 2,25 (Çokal) */
  function zemin(e, G) {
    const f = C.frame(e.o, e.rot), pw = f.at(G.kopru.x0 - 2, G.Wo + G.q.mw / 2, 0);
    for (const a of C.doc.ents.filter(x => x.type === 'arazi')) { const z = C.araziKot && C.araziKot(a, pw); if (z != null) return z - (a.ref || 0); }
    return e.zg != null && isFinite(+e.zg) ? +e.zg : G.zTop - 2.25;
  }
  const mm = v => Math.round(v * 1000);
  const imza = x => JSON.stringify(x.type === 'aile' ? [x.p, x.rot, x.z, x.par] : [x.pts, x.z0, x.z1]);
  /* yerel ekipman yeri → çizim nesnesi özellikleri (dünya koordinatı) */
  function nesne(e, y) {
    const f = C.frame(e.o, e.rot), un = unum(e), W2 = p => { const w = f.at(p[0], p[1], 0); return [w[0], w[1]]; };
    if (y.tur === 'penstok' || y.tur === 'mikser') {
      const fam = y.tur === 'penstok' ? 'penstock_kanal' : 'dalgic_mikser', d = C.AILELER && C.AILELER[fam]; if (!d) return null;
      const t0 = d.tipler && d.tipler[0], par = Object.assign({}, t0 ? t0.p : {}, y.tur === 'penstok'
        ? { B: mm(y.B), H: mm(y.H), D: mm(y.D), hw: mm(y.hw), tahrik: y.tahrik, konum: 'K' }
        : { D: mm(y.D), P: y.P, rpm: y.rpm, hm: Math.max(300, mm(y.D) / 2 + 250), Hd: mm(y.Hd) });
      return { type: 'aile', props: { fam, tip: t0 ? t0.ad : null, tipU: t0 ? t0.ad : null, par, p: [...W2(y.p), 0], rot: (e.rot || 0) + y.aci, z: y.z, ad: y.tur === 'penstok' ? `SK-${un}${y.etiket}` : `Z-${un}/${y.etiket}`, layer: d.katman || C.doc.cur.layer } };
    }
    if (y.tur === 'merdiven') return { type: 'merdiven', props: { pts: y.pts.map(W2), z0: y.z0, z1: y.z1, w: y.w, hmax: y.hmax * 100, b: y.b * 100, tip: 'beton', kork: y.kork || 'sol', km: 'galvaniz', kh: 110, dik: 150, tk: 'E', hiza: 'O', uz: 30, us: 'E', usL: Math.round(y.usL * 100), usW: Math.round(y.w * 100), usKork: 'H', as: 'H', sah: 0, nos: 0, t: Math.round(y.t * 100), rk: 'H' } }; // plaklı betonarme; üst sahanlık merdivenin parçası (plağı merdiven plağına bağlı)
    if (y.tur === 'korkuluk') return { type: 'korkuluk', props: { pts: y.pts.map(p => [...W2(p), y.z]), km: 'galvaniz', kh: 110, dik: 150, tk: 'E', kapali: false } };
    return null;
  }
  /* yerleştir / güncelle: programın koyduğu ve yerinde duran ekipman güncellenir; elle taşınan korunur; kullanıcının sildiği yeniden konmaz */
  C.anaerobikEkipman = (e, sessiz) => {
    if (!e.code && C.uniteNumarala) C.uniteNumarala(true); // etiketler ünite numarasından
    const mxS = mixKaynak(e, geo(e)), k2 = mxS && mxS.n >= 2 ? 1 : 0; if ((e.k2 || 0) !== k2) { e.k2 = k2; delete e._c; delete e._ag; } // halka başına 2+ mikser → ikinci yürüyüş yolu
    const G = geo(e), yer = ekipmanYer(G, mxS, zemin(e, G)), once = new Set(e.ekAnahtar || []), yeniK = new Set(yer.map(y => y.anahtar));
    const mevcut = new Map(C.doc.ents.filter(x => x.bag === e.id && x.anahtar).map(x => [x.anahtar, x]));
    let n = 0, g = 0, el = 0, s = 0;
    for (const y of yer) {
      const x = mevcut.get(y.anahtar), o = nesne(e, y); if (!o) continue;
      if (!x) { if (once.has(y.anahtar)) continue; const z = C.add(C.newEnt(o.type, Object.assign({}, o.props, { bag: e.id, anahtar: y.anahtar }))); delete z.sp; z.oto = imza(z); n++; continue; }
      if (x.oto !== imza(x)) { el++; continue; } // elle taşınmış / değiştirilmiş
      const eski = x.oto; Object.assign(x, o.props); delete x._c; delete x._g; delete x._q; x.oto = imza(x); if (x.oto !== eski) { g++; if (C.touch) C.touch(x); }
    }
    const sil = [...mevcut.values()].filter(x => !yeniK.has(x.anahtar) && x.oto === imza(x)); if (sil.length && C.remove) { C.remove(sil); s = sil.length; }
    if (!e.suAnahtar) try { C.anaerobikSu(e); } catch (er) { console.error(er); }
    if (C.suYapiBant) C.suYapiBant(e, G.bantlar);
    e.ekipman = true; e.ekAnahtar = [...yeniK]; e._ekK = JSON.stringify([G.q, e.o, e.rot, e.code]); delete e._c;
    if (n || g || s) C.changed && C.changed();
    if (!sessiz || n || s) C.log(`✓ ${e.code || ''} ekipman (mikser: ${mxS ? mxS.n + ' / halka, ' + mxS.kaynak : 'yok'}): ${n} yeni, ${g} güncellendi${el ? `, ${el} elle taşınmış (korundu)` : ''}${s ? `, ${s} kaldırıldı` : ''}.`);
  };
  // havuz değişince (ölçü, konum, dönüş) ekipman kendiliğinden güncellenir
  C.on && C.on('changeIdle', () => { if (!C.doc) return; for (const e of C.doc.ents) if (e.type === 'anaerobik' && e.ekipman) { const k = JSON.stringify([geo(e).q, e.o, e.rot, e.code]); if (e._ekK !== k) { if (e._ekK == null) { e._ekK = k; continue; } C.anaerobikEkipman(e, true); } } });

  // mikser hesabı penceresinde sonuç değişince (aynı tarayıcı belleği) ekipman güncellenir
  if (typeof window !== 'undefined') window.addEventListener('storage', ev => { if (ev.key !== 'mixer-analysis-v1' || !C.doc) return; for (const e of C.doc.ents) if (e.type === 'anaerobik' && e.ekipman) C.anaerobikEkipman(e, true); });

  /* ================= BORU DELİKLERİ: elle ya da saha borulamasından ================= */
  const BORU = { GIRIS: ['giris', 'gx', 'dG', 'hG'], RAS: ['ras', 'rx', 'dR', 'hR'], CIKIS: ['cikis', 'yC', 'dC', 'hC'] };
  const yerel = (e, p) => { const r = -(e.rot || 0) * RAD, dx = p[0] - e.o[0], dy = p[1] - e.o[1]; return [dx * Math.cos(r) - dy * Math.sin(r), dx * Math.sin(r) + dy * Math.cos(r)]; };
  /* saha borularının uçlarını en yakın boru deliğine bağla: yer, dış çap, alt kotu */
  C.anaerobikBorudan = (e, sessiz) => {
    const G = geo(e), borular = C.doc.ents.filter(x => x.type === 'pipe' && Array.isArray(x.pts) && x.pts.length > 1); let n = 0;
    for (const [K, [k, pk, pd, ph]] of Object.entries(BORU)) {
      const b = G.boruYer[k]; if (!b) continue; const dv = b.duvar; let best = null;
      for (const x of borular) for (const p of [x.pts[0], x.pts[x.pts.length - 1]]) {
        const l = yerel(e, p), uz = dv.eksen === 'x' ? Math.abs(l[1] - dv.y) : Math.abs(l[0] - dv.x), boy = dv.eksen === 'x' ? l[0] : l[1];
        if (uz > 1.5 || boy < dv.a - 1 || boy > dv.b + 1) continue; if (!best || uz < best.uz) best = { uz, boy, p, x };
      }
      if (!best) continue;
      const od = (+best.x.od || (C.pipeOD ? C.pipeOD(best.x.mat, best.x.dn) : 0)) / 1000;
      const yeni = { [pk]: +best.boy.toFixed(3) }; if (od > 0) yeni[pd] = +od.toFixed(3);
      if (best.p[2] != null && isFinite(best.p[2])) yeni[ph] = +Math.max(0, best.p[2] - (od || b.d) / 2 - G.zB).toFixed(3);
      if (Object.entries(yeni).some(([a, v]) => e[a] !== v)) { Object.assign(e, yeni); n++; }
    }
    if (n) { delete e._c; delete e._ag; if (C.touch) C.touch(e); C.changed && C.changed(); }
    if (!sessiz) C.log(n ? `✓ ${e.code || ''}: ${n} boru deliği saha borularına göre güncellendi.` : 'Havuz duvarına yakın saha borusu ucu bulunamadı (boru ucu duvara 1,5 m yakın olmalı).');
    return n;
  };
  // saha boruları değişince bağlı havuzlarda delikler kendiliğinden kayar
  let boruImza = '';
  C.on && C.on('changeIdle', () => { if (!C.doc) return; const s = C.doc.ents.filter(x => x.type === 'pipe').map(x => x.id + ':' + JSON.stringify([x.pts[0], x.pts[x.pts.length - 1], x.od, x.dn])).join('|'); if (s === boruImza) return; boruImza = s; for (const e of C.doc.ents) if (e.type === 'anaerobik' && e.boruBagli) C.anaerobikBorudan(e, true); });

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
    if (kv.EKIPMAN !== 'H') C.anaerobikEkipman(e);
  });
  C.addCommand(['ANAEKIPMAN', 'ANAEROBIKEKIPMAN'], 'Anaerobik havuzun penstok, mikser, merdiven ve korkuluklarını yerleştirir / günceller (elle taşınanlar korunur). ANAEKIPMAN [TAHRIK=EL|AKT]', async (I) => {
    const kv = takeKV(); let s = (C.sel || []).filter(x => x.type === 'anaerobik'); if (!s.length) s = C.doc.ents.filter(x => x.type === 'anaerobik');
    if (!s.length) return C.warn('Çizimde anaerobik havuz yok (önce ANAEROBIK).');
    for (const e of s) { if (kv.TAHRIK) e.tahrik = C.up(kv.TAHRIK) === 'AKT' ? 'AKT' : 'EL'; C.anaerobikEkipman(e); }
  });

  C.addCommand(['ANABORU', 'ANAEROBIKBORU'], 'Anaerobik havuzun boru deliklerini taşır: ANABORU [GIRIS|RAS|CIKIS] → yeni yer (duvar boyunca), çap, alt kotu; ANABORU BORUDAN → saha borularının uçlarına bağlar ve izler', async (I) => {
    let e = (C.sel || []).find(x => x.type === 'anaerobik') || C.doc.ents.find(x => x.type === 'anaerobik'); if (!e) return C.warn('Çizimde anaerobik havuz yok.');
    const s = await I.kw('Boru', [['GIRIS', 'Giriş borusu'], ['RAS', 'RAS borusu'], ['CIKIS', 'Çıkış borusu'], ['BORUDAN', 'Saha borularından (otomatik, izler)'], ['SERBEST', 'Saha boru bağını kaldır']], 'BORUDAN');
    if (s === 'BORUDAN') { e.boruBagli = true; C.anaerobikBorudan(e); return; }
    if (s === 'SERBEST') { e.boruBagli = false; C.log('Boru delikleri artık saha borularını izlemiyor.'); return; }
    const [k, pk, pd, ph] = BORU[s], G = geo(e), b = G.boruYer[k];
    const p = await I.pt(`${b.duvar.ad}: yeni eksen noktası (duvar boyunca)`); if (!p || typeof p === 'string') return;
    const l = yerel(e, p); e[pk] = +(b.duvar.eksen === 'x' ? l[0] : l[1]).toFixed(3);
    const d = await I.num('Boru dış çapı (m)', b.d); if (typeof d === 'number' && d > 0) e[pd] = d;
    const h = await I.num('Boru alt kotu tabandan (m)', b.z0 - G.zB); if (typeof h === 'number' && h >= 0) e[ph] = h;
    e.boruBagli = false; delete e._c; delete e._ag; if (C.touch) C.touch(e); C.changed && C.changed();
    const b2 = geo(e).boruYer[k]; C.log(`✓ ${b.duvar.ad}: Ø${Math.round(b2.d * 1000)}, alt kotu ${kot(b2.z0)}`);
  });
  /* ================= SU: bölmelere maks. / min. su kotlarıyla su ================= */
  const debiler = e => { // mevcut kademe debileri (proses verisi + ünite kartı ayarı); yoksa havuzdaki elle değerler
    let o = {};
    try { const j = C.proses && C.proses(); if (j && C.kart && C.kart.kademeSec) { const A = (C.doc.set.uniteKart || {}), d = C.kart.kademeSec(j, A.sec || {}).mevcut.debi || {}, ras = +(((A.par || {}).an || {}).ras) || 0.75; o = { Qmax: +d.Qww || 0, Qmin: +d.Qmin || (+d.Qd || 0) / 24 * 0.5, QRS: ras * (+d.Qww || 0), kaynak: 'proses verisi' }; } } catch (er) { }
    for (const k of ['Qmax', 'Qmin', 'QRS']) if (e[k] != null && isFinite(+e[k])) { o[k] = +e[k]; o.kaynak = 'elle'; }
    return o.Qmax ? o : null;
  };
  C.anaerobikHidrolik = e => { const G = geo(e), d = debiler(e); return d ? Object.assign(hidrolik(G, Object.assign({ Ls: e.Lsav || 2.0 }, d)), { debi: d }) : null; };
  C.anaerobikSu = (e, durum) => {
    const G = geo(e), H = C.anaerobikHidrolik(e); if (!H) return null;
    if (durum) e.suDurum = durum; const dm = e.suDurum === 'min' ? 'min' : 'maks', f = C.frame(e.o, e.rot), W2 = p => { const w = f.at(p[0], p[1], 0); return [w[0], w[1]]; };
    const D = G.bolge.delik, n = G.n, bol = [];
    for (let i = 0; i < n; i++) bol.push(['su-halka-' + i, D[i], H.maks.halka[i], H.min.halka[i], i === 0 && n > 1 ? 'RAS halkası' : `${n > 1 ? i : 1}. halka`]);
    bol.push(['su-giris', D[n], H.maks.giris, H.min.giris, 'Giriş kanalı']);
    if (n > 1) bol.push(['su-ras', D[n + 1], H.maks.ras, H.min.ras, 'RAS bölümü'], ['su-cikis', D[n + 2], H.maks.cikis, H.min.cikis, 'Çıkış bölümü']);
    else bol.push(['su-cikis', D[n + 1], H.maks.cikis, H.min.cikis, 'Çıkış kanalı']);
    const mevcut = new Map(C.doc.ents.filter(x => x.type === 'su' && x.bag === e.id).map(x => [x.anahtar, x])), once = new Set(e.suAnahtar || []);
    C.ensureLayer && C.ensureLayer('INS_SU', 150, 'CONTINUOUS', 13);
    for (const [k, pts, zx, zn, ad] of bol) {
      if (!pts) continue; const zs = +(dm === 'min' ? zn : zx).toFixed(3), props = { pts: pts.map(W2), zb: +G.zB.toFixed(3), zs, zsMaks: +zx.toFixed(3), zsMin: +zn.toFixed(3), tur: 'atiksu', ad, layer: 'INS_SU' };
      const x = mevcut.get(k);
      if (!x) { if (once.has(k)) continue; const z = C.add(C.newEnt('su', Object.assign(props, { bag: e.id, anahtar: k }))); delete z.sp; }
      else if (JSON.stringify([x.pts, x.zs, x.zsMaks, x.zsMin]) !== JSON.stringify([props.pts, props.zs, props.zsMaks, props.zsMin])) { Object.assign(x, props); delete x._c; if (C.touch) C.touch(x); }
    }
    e.suAnahtar = bol.map(b => b[0]); e.suDurum = dm; e._suK = JSON.stringify([G.q, e.o, e.rot, H.debi]);
    return H;
  };
  // havuz ya da debi değişince su kotları kendiliğinden güncellenir
  C.on && C.on('changeIdle', () => { if (!C.doc) return; for (const e of C.doc.ents) if (e.type === 'anaerobik' && e.suAnahtar) { const d = debiler(e), k = JSON.stringify([geo(e).q, e.o, e.rot, d]); if (e._suK !== k) C.anaerobikSu(e); } });
  C.addCommand(['ANASU', 'ANAEROBIKSU'], 'Anaerobik havuzun bölmelerine su: maks. ya da min. debideki su kotlarıyla (hidrolik hesap). ANASU [MAKS|MIN|KALDIR] [QMAX= QMIN= QRS= m³/h] [LSAV= mansap savak boyu m]', async (I) => {
    const kv = takeKV(); let e = (C.sel || []).find(x => x.type === 'anaerobik') || C.doc.ents.find(x => x.type === 'anaerobik'); if (!e) return C.warn('Çizimde anaerobik havuz yok.');
    for (const [a, b] of [['QMAX', 'Qmax'], ['QMIN', 'Qmin'], ['QRS', 'QRS'], ['LSAV', 'Lsav']]) if (kv[a] != null && isFinite(C.num(kv[a]))) e[b] = C.num(kv[a]);
    const s = await I.kw('Su', [['MAKS', 'Maks. debideki su kotları'], ['MIN', 'Min. debideki su kotları'], ['KALDIR', 'Suyu kaldır']], e.suDurum === 'maks' ? 'MIN' : 'MAKS');
    if (s === 'KALDIR') { const x = C.doc.ents.filter(y => y.type === 'su' && y.bag === e.id); if (x.length && C.remove) C.remove(x); delete e.suAnahtar; C.changed && C.changed(); return C.log('Anaerobik havuz suyu kaldırıldı.'); }
    const H = C.anaerobikSu(e, s === 'MIN' ? 'min' : 'maks'); if (!H) return C.warn('Debi yok: proses verisi aktarın ya da ANASU QMAX=… QMIN=… QRS=… girin.');
    C.changed && C.changed();
    const f3 = v => v.toFixed(2).replace('.', ',');
    C.log(`✓ Su (${s === 'MIN' ? 'min.' : 'maks.'}) — Q maks. ${Math.round(H.debi.Qmax)}, Q min. ${Math.round(H.debi.Qmin)}, RAS ${Math.round(H.debi.QRS)} m³/h (${H.debi.kaynak}); mansap savağı ${f3(H.kabul.Ls)} m (kabul, 3. parçada hidrolik profilden)`);
    C.log(`  maks.: giriş ${f3(H.maks.giris)}${H.maks.ras != null ? ' · RAS ' + f3(H.maks.ras) : ''} · halkalar ${H.maks.halka.map(f3).join(' / ')} · çıkış ${f3(H.maks.cikis)}`);
    C.log(`  min.:  giriş ${f3(H.min.giris)}${H.min.ras != null ? ' · RAS ' + f3(H.min.ras) : ''} · halkalar ${H.min.halka.map(f3).join(' / ')} · çıkış ${f3(H.min.cikis)}`);
    for (const u of H.uyari) C.warn(u);
  });

  C.addCommand(['ANABOYUT', 'ANAEROBIKBOYUT'], 'Anaerobik havuzu debiden boyutlandırır (halka, ağız, pencere, orifis, boru delikleri) ve çizimi günceller. ANABOYUT Q=20000 (m³/gün) [H=4.5 T=0.75 V=0.30 QMAX= QMIN= QRS= m³/h]', async (I) => {
    const kv = takeKV(); let e = (C.sel || []).find(x => x.type === 'anaerobik') || C.doc.ents.find(x => x.type === 'anaerobik'); if (!e) return C.warn('Çizimde anaerobik havuz yok.');
    let Qd = kv.Q != null ? C.num(kv.Q) : null; if (Qd == null) { const r = await I.num('Arıtma debisi (m³/gün)', 20000); if (typeof r !== 'number') return; Qd = r; }
    const o = { Qd }; for (const [a, b] of [['H', 'h'], ['T', 't'], ['V', 'v'], ['QMAX', 'Qmax'], ['QMIN', 'Qmin'], ['QRS', 'QRS']]) if (kv[a] != null && isFinite(C.num(kv[a]))) o[b] = C.num(kv[a]);
    const B = boyutla(o); Object.assign(e, B.par, { Qmax: B.debi.Qmax, Qmin: B.debi.Qmin, QRS: B.debi.QRS }); for (const k of ['gx', 'rx', 'yC']) delete e[k]; delete e._c; delete e._ag; delete e._mx;
    if (C.touch) C.touch(e); if (e.ekipman) C.anaerobikEkipman(e, true); if (e.suAnahtar) C.anaerobikSu(e); C.changed && C.changed();
    const f = v => (+v).toFixed(2).replace('.', ','), p = B.par, G = geo(e);
    C.log(`✓ Anaerobik ${Math.round(Qd)} m³/gün: Q ort. ${Math.round(B.debi.Qort)}, Q maks. ${Math.round(B.debi.Qmax)}, RAS ${Math.round(B.debi.QRS)} m³/h → V ${Math.round(B.Vk)} m³, temas ${f(B.t)} sa`);
    C.log(`  ${p.n} halka: iç eni ${f(2 * p.Ro)}, düz boy ${f(p.Ls)}, su ${f(p.h)} m → dış ölçü ${f(G.Lo)} × ${f(G.Wo)} m`);
    C.log(`  Ağız ${f(p.ag)} × ${f(p.ah)} (v ${f(B.hiz.agiz)} m/s) · pencere ${f(p.ow)} × ${f(p.oh)} (v ${f(B.hiz.pencere)} m/s) · ara duvar orifisi ${f(p.ag)} × ${f(p.bO)} · borular Ø${Math.round(p.dG * 1000)} / Ø${Math.round(p.dR * 1000)} / Ø${Math.round(p.dC * 1000)}`);
  });
  /* mikser canlandırması: seçili halkanın ölçüleri ve yerleşen mikserler mikser hesabı penceresine aktarılır (akış parçacıkları orada) */
  C.addCommand(['ANAMIKSER', 'ANAEROBIKMIKSER'], 'Anaerobik havuzun bir halkasını mikser hesabı penceresinde açar: halka ölçüleri ve yerleşen mikserlerle akış canlandırması. ANAMIKSER [HALKA=0]', async (I) => {
    const kv = takeKV(), r3 = v => Math.round(v * 1000) / 1000; const e = (C.sel || []).find(x => x.type === 'anaerobik') || C.doc.ents.find(x => x.type === 'anaerobik'); if (!e) return C.warn('Çizimde anaerobik havuz yok.');
    const G = geo(e), q = G.q, hi = Math.max(0, Math.min(G.n - 1, kv.HALKA != null ? Math.round(C.num(kv.HALKA)) : 0)), H = G.halka[hi];
    const mx = mixKaynak(e, G), yer = ekipmanYer(G, mx, zemin(e, G)).filter(y => y.tur === 'mikser' && Math.abs(y.p[1] - H.yc) < q.Ro);
    const x0 = G.xc1 - q.Ro, y0 = H.yc - q.Ro, un = unum(e);
    const mixers = yer.map((y, i) => ({ name: `Z-${un}/${y.etiket}`, D: +y.D, rpm: +y.rpm || 0, P: +y.P, F: null, x: +(y.p[0] - x0).toFixed(3), y: +(y.p[1] - y0).toFixed(3), z: +Math.max(0.3, y.D / 2 + 0.25).toFixed(2), ang: y.aci }));
    if (!mixers.length) return C.warn('Bu halkada mikser yok (önce ANAEKIPMAN).');
    const S = { projName: `${e.code || ''} Anaerobik havuz — ${halkaAd(e, G, hi)}`, projBy: '', tank: { type: 'oval', L: r3(q.Ls + 2 * q.Ro), W: r3(2 * q.Ro), Dc: r3(2 * q.Ro), Ls: r3(q.Ls), b: r3(G.b), tw: r3(q.tw), H: r3(q.h) },
      process: 'ditch', vTarget: 0.30, vDead: 0.15, pMin: 1, pMax: 4, rho: 1000, lam: 0.03, zTurn: 2.0, zTurnOval: 0.8, zSec: 1.5, etaInst: 0.85, fm: 0.65, zBottom: 0.3, plane: 'bottom', particles: true, dead: true, mixers };
    try { localStorage.setItem('mixer-analysis-v1', JSON.stringify(S)); } catch (er) { return C.warn('Tarayıcı belleğine yazılamadı.'); }
    const w = window.open('app/hesap/mikser.html', 'hesap_MIKSER', 'width=1280,height=900'); if (!w) return C.warn('Açılır pencere engellendi.');
    try { if (w.location && /mikser/.test(w.location.href)) w.location.reload(); } catch (er) { }
    C.log(`✓ ${halkaAd(e, G, hi)}: ${mixers.length} mikser (${mixers.map(m => m.name).join(', ')}) mikser penceresinde; akış parçacıkları suya verilen hareketi gösterir.`);
  });

  /* ================= 3B AKIŞ CANLANDIRMASI =================
     Halkalarda su yüzünde akış parçacıkları; hız mikser seçiminin ortalama hızı (≥ 0,30 m/s), görüntüde HIZLANDIR katı kadar hızlı.
     3B görünümün çizim üstü katmanına (C.h3.draw) eklenir; açıkken görünüm sürekli yenilenir. */
  const AKIS = { hizlandir: 4, n: 140, t0: performance.now() };
  const parcaciklar = (e, G) => { // halka başına sabit rastgele dağılım (yarıçap, başlangıç)
    if (e._akP && e._akP.key === G.n + '|' + G.q.Ro + '|' + G.q.Ls) return e._akP.p;
    const p = []; let sd = 12345; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < G.n; i++) for (let k = 0; k < AKIS.n; k++) { const r = G.q.tw / 2 + 0.12 + rnd() * (G.q.Ro - G.q.tw / 2 - 0.24); p.push({ i, r, s0: rnd() * (2 * G.q.Ls + 2 * Math.PI * r), f: 0.85 + rnd() * 0.3 }); }
    e._akP = { key: G.n + '|' + G.q.Ro + '|' + G.q.Ls, p }; return p;
  };
  const akisCiz = (v, g) => {
    if (!C.doc) return; const ts = (performance.now() - AKIS.t0) / 1000;
    for (const e of C.doc.ents) {
      if (e.type !== 'anaerobik' || !e.akis) continue;
      const G = geo(e), f = C.frame(e.o, e.rot), mx = mixKaynak(e, G), hz = (mx && mx.v ? +mx.v : 0.30) * AKIS.hizlandir;
      const zs = (C.doc.ents.find(x => x.type === 'su' && x.bag === e.id) || {}).zs, z = (zs != null ? zs : G.zW) + 0.02;
      g.save(); g.lineCap = 'round';
      for (const P of parcaciklar(e, G)) {
        const s = P.s0 + ts * hz * P.f, a = akisNokta(G, P.i, P.r, s), b = akisNokta(G, P.i, P.r, s - 0.7);
        const A = v.project(f.at(a[0], a[1], z)), B = v.project(f.at(b[0], b[1], z)); if (!A || !B) continue;
        const gr = g.createLinearGradient(B[0], B[1], A[0], A[1]); gr.addColorStop(0, 'rgba(220,245,255,0)'); gr.addColorStop(1, 'rgba(235,250,255,0.95)');
        g.strokeStyle = gr; g.lineWidth = 2; g.beginPath(); g.moveTo(B[0], B[1]); g.lineTo(A[0], A[1]); g.stroke();
      }
      g.restore();
    }
  };
  const kancaKur = () => { if (!C.h3 || C.h3._akis) return; const d0 = C.h3.draw; C.h3.draw = (v, g) => { try { if (d0) d0(v, g); } finally { try { akisCiz(v, g); } catch (er) { } } }; C.h3._akis = true; };
  let akisZ = null;
  const akisDongu = () => { const on = C.doc && C.doc.ents.some(x => x.type === 'anaerobik' && x.akis); if (on && !akisZ) akisZ = setInterval(() => { kancaKur(); if (C.views && C.views.v3) C.views.v3.dirty = true; }, 40); if (!on && akisZ) { clearInterval(akisZ); akisZ = null; if (C.views && C.views.v3) C.views.v3.dirty = true; } };
  setTimeout(() => { kancaKur(); akisDongu(); }, 0);
  C.on && C.on('changeIdle', akisDongu);
  C.addCommand(['ANAKIS', 'ANAEROBIKAKIS'], 'Anaerobik havuzda 3B akış canlandırması (su yüzünde akış parçacıkları, mikserlerin verdiği hızla): ANAKIS [AC|KAPAT] [HIZLANDIR=4]', async (I) => {
    const kv = takeKV(); if (kv.HIZLANDIR != null && isFinite(C.num(kv.HIZLANDIR))) AKIS.hizlandir = Math.max(1, C.num(kv.HIZLANDIR));
    const L = (C.sel || []).filter(x => x.type === 'anaerobik'), s = L.length ? L : C.doc.ents.filter(x => x.type === 'anaerobik'); if (!s.length) return C.warn('Çizimde anaerobik havuz yok.');
    const a = await I.kw('Akış canlandırması', [['AC', 'Aç'], ['KAPAT', 'Kapat']], s[0].akis ? 'KAPAT' : 'AC');
    for (const e of s) e.akis = a === 'AC'; kancaKur(); akisDongu();
    if (a === 'AC') { const G = geo(s[0]), mx = mixKaynak(s[0], G); C.log(`✓ 3B akış: halkada ortalama ${mx && mx.v ? (+mx.v).toFixed(2).replace('.', ',') : '0,30'} m/s (görüntü ${AKIS.hizlandir} kat hızlı). 3B görünüme geçin.`); if (C.setView && C.currentView !== '3d') C.setView('3d'); }
    else C.log('3B akış canlandırması kapatıldı.');
  });

  C.addCommand(['ANAMERDIVEN', 'ANAEROBIKMERDIVEN'], 'Anaerobik havuzda merdiven yeri: havuzun üst ya da alt yanında yürüyüş yolunun yakınına tıklayın (en yakın yolun merdiveni o yana taşınır, hep içe bakar). ANAMERDIVEN VARSAYILAN → ikisi de üst yanda', async (I) => {
    const kv = takeKV(); const e = (C.sel || []).find(x => x.type === 'anaerobik') || C.doc.ents.find(x => x.type === 'anaerobik'); if (!e) return C.warn('Çizimde anaerobik havuz yok.');
    if (C.cmd.queue.some(t => /^VARSAYILAN$/i.test(t))) { C.cmd.queue = C.cmd.queue.filter(t => !/^VARSAYILAN$/i.test(t)); e.m1 = null; e.m2 = null; }
    else {
      const p = await I.pt('Merdiveni istediğiniz yana tıklayın (havuzun üst ya da alt uzun yanında, yürüyüş yolunun yakınında)'); if (!p || typeof p === 'string') return;
      const G = geo(e), l = yerel(e, p), yollar = [[1, G.kopru], [2, G.kopru2]].filter(x => x[1]);
      const [k, kp] = yollar.reduce((a, b) => (Math.abs(l[0] - (b[1].x0 + b[1].x1) / 2) < Math.abs(l[0] - (a[1].x0 + a[1].x1) / 2) ? b : a));
      const yer = l[1] < G.Wo / 2 ? 'alt' : 'ust'; e['m' + k] = yer;
      C.log(`✓ ${k === 1 ? 'Servis köprüsünün' : 'İkinci yolun'} merdiveni havuzun ${yer === 'alt' ? 'alt' : 'üst'} yanında; içe bakar (yola ortadaki uzun kısımdan çıkar).`);
    }
    delete e._c; delete e._ag; if (C.touch) C.touch(e); if (e.ekipman) C.anaerobikEkipman(e, true); C.changed && C.changed();
  });
  /* şerit: Arıtma › Proses */
  if (C.ribbon && C.ribbon.tabs) {
    const tab = C.ribbon.tabs.find(t => t[0] === 'Arıtma'), pr = tab && tab[1].find(p => p[0] === 'Proses');
    if (pr && !pr[1].some(b => b.cmd === 'ANAEROBIK')) { pr[1].push({ cmd: 'ANAEROBIK', t: 'Anaerobik havuz', i: 'ctank' }, { cmd: 'ANAEKIPMAN', t: 'Anaerobik ekipman', i: 'table' }, { cmd: 'ANABORU', t: 'Boru delikleri', i: 'table' }, { cmd: 'ANASU', t: 'Su (maks./min.)', i: 'water' }, { cmd: 'ANABOYUT', t: 'Debiden boyutla', i: 'calc' }, { cmd: 'ANAMIKSER', t: 'Mikser akışı', i: 'calc' }, { cmd: 'ANAKIS', t: 'Akış 3B', i: 'water' }, { cmd: 'ANAMERDIVEN', t: 'Merdiven yeri', i: 'table' }); try { C.ribbon.render(); } catch (err) { } }
  }
  if (window.DIL) window.DIL.ekle('en', 'English', [['Anaerobik havuz', 'Anaerobic tank'], ['Servis köprüsü', 'Service bridge'], ['Giriş kanalı', 'Inlet channel'], ['Çıkış kanalı', 'Outlet channel'], ['RAS girişi', 'RAS inlet'], ['Giriş borusu', 'Inlet pipe'], ['RAS borusu', 'RAS pipe'], ['Anaerobik ekipman', 'Anaerobic tank equipment'], ['Dalgıç mikser — kılavuz direkli', 'Submersible mixer — guide mast'], ['Su (maks./min.)', 'Water (max./min.)'], ['Boru delikleri', 'Pipe openings'], ['Debiden boyutla', 'Size from flow'], ['Mikser akışı', 'Mixer flow'], ['Akış 3B', 'Flow 3D'], ['Merdiven yeri', 'Stair position']]);
})(typeof window !== 'undefined' ? window.C : (globalThis.C || null));

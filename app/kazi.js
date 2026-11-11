/* ArıtmaCAD — KAZI / DOLGU: yapıları araziye oturtma
   kazi nesnesi: { ar: arazi id, fp: yapı taban izi (kapalı çokgen), st: [yapı izleri] (geri dolgu dışı), w: çalışma payı,
                   zb: kazı taban kotu, n: kazı şevi (yatay/1 düşey), zt: tesviye kotu (null = mevcut arazi), nf: dolgu şevi,
                   durum: 'kazi' (açık çukur) | 'dolgu' (geri dolgu yapılmış), res: hesap ızgarası (m) }
   Yüzeyler (model kotu):  T = mevcut arazi,  E = kazı yüzeyi = min(T, zb + D/n),  F = tesviye = T ya da clamp(T, zt − D/nf, zt + D/n)
   D = (yapı izinden uzaklık − çalışma payı)⁺.  Hacimler ızgara üzerinde (prizmoidal) hesaplanır.
   Komutlar: KAZI, KAZIDURUM (geri dolgu), KAZIKESIT (kot tablolu kazı kesiti), KAZIHACIM (kübaj cetveli), ARAZIAYAR (saydamlık, zemin bloğu) */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, P, TX, S } = C.prim;
  const EPS = 0.005;
  C.entAlpha = e => (e && e.alpha != null ? e.alpha : 1);

  /* ---------- geometri yardımcıları ---------- */
  const segD = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); const x = a[0] + dx * t, y = a[1] + dy * t; return [Math.hypot(p[0] - x, p[1] - y), x, y]; };
  const polyDist = (p, poly) => { if (C.pointInPoly(p, poly)) return [0, p[0], p[1]]; let best = [Infinity, 0, 0]; for (let i = 0; i < poly.length; i++) { const r = segD(p, poly[i], poly[(i + 1) % poly.length]); if (r[0] < best[0]) best = r; } return best; };
  const hull = pts => { const p = pts.map(q => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p; const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 1e-12) lo.pop(); lo.push(q); } for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 1e-12) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
  const arOf = e => {
    let a = C.byId(e.ar); if (a && a.type === 'arazi') return a;
    if (!C.doc || !e.fp || !e.fp.length) return null; // dosyadan okununca kimlikler değişir: izin altındaki araziyi bul
    const c = e.fp.reduce((m, q) => [m[0] + q[0] / e.fp.length, m[1] + q[1] / e.fp.length], [0, 0]);
    a = C.doc.ents.find(x => x.type === 'arazi' && C.araziKot(x, c) != null); if (a) e.ar = a.id; return a || null;
  };
  const afr = a => { const ux = a.ux || [1, 0], uy = [-ux[1], ux[0]]; return { ux, uy, at: (u, v) => [a.o[0] + (ux[0] * u + uy[0] * v) * a.d, a.o[1] + (ux[1] * u + uy[1] * v) * a.d], uv: p => { const dx = p[0] - a.o[0], dy = p[1] - a.o[1]; return [(dx * ux[0] + dy * ux[1]) / a.d, (dx * uy[0] + dy * uy[1]) / a.d]; } }; };
  const tModel = (a, p) => { const z = C.araziKot(a, p); return z == null ? null : z - (a.ref || 0); };
  /* bir noktada yüzeyler */
  const surfAt = (e, p, Tz) => {
    const d = polyDist(p, e.fp)[0], Dw = Math.max(0, d - (e.w || 0)), n = e.n > 0 ? e.n : 1, nf = e.nf > 0 ? e.nf : 1.5;
    const Ez = Math.min(Tz, e.zb + Dw * n);
    const Fz = e.zt == null || e.zt === '' ? Tz : Math.max(e.zt - Dw * nf, Math.min(e.zt + Dw * n, Tz));
    const inS = (e.st && e.st.length ? e.st : [e.fp]).some(q => C.pointInPoly(p, q));
    return { T: Tz, E: Ez, F: Fz, inS, Dw, Dr: d - (e.w || 0) };
  };
  C.kaziSurf = surfAt;

  /* ---------- ızgara hesabı (önbellekli) ---------- */
  const calc = e => {
    const c = e._c || (e._c = {}); if (c.k !== undefined) return c.k;
    const a = arOf(e); if (!a || !e.fp || e.fp.length < 3) return (c.k = null);
    const f = afr(a), ref = a.ref || 0; let lo = Infinity, hi = -Infinity; for (const v of a.h) { if (v < lo) lo = v; if (v > hi) hi = v; } lo -= ref; hi -= ref;
    const n = e.n > 0 ? e.n : 1, nf = e.nf > 0 ? e.nf : 1.5, zt = e.zt == null || e.zt === '' ? null : +e.zt;
    let reach = Math.max(0, (hi - e.zb) * n); if (zt != null) reach = Math.max(reach, (zt - lo) * nf, (hi - zt) * n);
    reach = Math.min(reach, 400) + (e.w || 0) + a.d * 2;
    let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
    for (const q of e.fp) for (const [dx, dy] of [[-reach, -reach], [reach, -reach], [reach, reach], [-reach, reach]]) { const uv = f.uv([q[0] + dx, q[1] + dy]); u0 = Math.min(u0, uv[0]); v0 = Math.min(v0, uv[1]); u1 = Math.max(u1, uv[0]); v1 = Math.max(v1, uv[1]); }
    const i0 = Math.max(0, Math.floor(u0)), j0 = Math.max(0, Math.floor(v0)), i1 = Math.min(a.nx - 1, Math.ceil(u1)), j1 = Math.min(a.ny - 1, Math.ceil(v1));
    if (i1 <= i0 || j1 <= j0) return (c.k = null);
    const res = e.res > 0 ? e.res : Math.min(0.3, a.d);
    let sub = Math.max(1, Math.ceil(a.d / res)); const ni = i1 - i0, nj = j1 - j0;
    while (sub > 1 && (ni * sub + 1) * (nj * sub + 1) > 160000) sub--;
    const NX = ni * sub + 1, NY = nj * sub + 1, cnt = NX * NY;
    const Ta = new Float32Array(cnt), Ea = new Float32Array(cnt), Fa = new Float32Array(cnt), Sa = new Uint8Array(cnt), Dr = new Float32Array(cnt), PX = new Float64Array(cnt), PY = new Float64Array(cnt);
    const Hh = (i, j) => a.h[j * a.nx + i] - ref;
    for (let b = 0; b < NY; b++) for (let q = 0; q < NX; q++) {
      const u = i0 + q / sub, v = j0 + b / sub, ci = Math.min(a.nx - 2, Math.floor(u)), cj = Math.min(a.ny - 2, Math.floor(v)), fu = u - ci, fv = v - cj;
      const Tz = Hh(ci, cj) * (1 - fu) * (1 - fv) + Hh(ci + 1, cj) * fu * (1 - fv) + Hh(ci, cj + 1) * (1 - fu) * fv + Hh(ci + 1, cj + 1) * fu * fv;
      const p = f.at(u, v), k = b * NX + q, s = surfAt(e, p, Tz);
      Ta[k] = Tz; Ea[k] = s.E; Fa[k] = s.F; Sa[k] = s.inS ? 1 : 0; Dr[k] = s.Dr; PX[k] = p[0]; PY[k] = p[1];
    }
    // etkilenen arazi hücreleri (arazi ağından çıkarılır, yerine kazı yüzeyi çizilir)
    const cells = new Set(); let ci0 = Infinity, cj0 = Infinity, ci1 = -Infinity, cj1 = -Infinity;
    for (let cj = 0; cj < nj; cj++) for (let cii = 0; cii < ni; cii++) {
      let hit = false; for (let b = cj * sub; b <= (cj + 1) * sub && !hit; b++) for (let q = cii * sub; q <= (cii + 1) * sub; q++) { const k = b * NX + q; if (Ta[k] - Ea[k] > 1e-4 || Math.abs(Fa[k] - Ta[k]) > 1e-4) { hit = true; break; } }
      if (hit) { ci0 = Math.min(ci0, cii); cj0 = Math.min(cj0, cj); ci1 = Math.max(ci1, cii); cj1 = Math.max(cj1, cj); }
    }
    if (ci0 === Infinity) { ci0 = cj0 = 0; ci1 = cj1 = -1; }
    else { ci0 = Math.max(0, ci0 - 1); cj0 = Math.max(0, cj0 - 1); ci1 = Math.min(ni - 1, ci1 + 1); cj1 = Math.min(nj - 1, cj1 + 1); for (let cj = cj0; cj <= cj1; cj++) for (let cii = ci0; cii <= ci1; cii++) cells.add((j0 + cj) * a.nx + (i0 + cii)); }
    // hacimler (her ince hücre: 4 köşe ortalaması × alan)
    const A = (a.d / sub) * (a.d / sub); let cut = 0, back = 0, fill = 0, areaTop = 0;
    for (let b = 0; b < NY - 1; b++) for (let q = 0; q < NX - 1; q++) {
      const ks = [b * NX + q, b * NX + q + 1, (b + 1) * NX + q, (b + 1) * NX + q + 1]; let dc = 0, db = 0, df = 0, ins = 0;
      for (const k of ks) { dc += Ta[k] - Ea[k]; db += Math.max(0, Math.min(Fa[k], Ta[k]) - Ea[k]); df += Math.max(0, Fa[k] - Ta[k]); ins += Sa[k]; }
      cut += dc / 4 * A; if (dc > 4e-4) areaTop += A;
      if (ins < 3) { back += db / 4 * A * (1 - ins / 4); fill += df / 4 * A * (1 - ins / 4); }
    }
    return (c.k = { a, f, i0, j0, ni, nj, sub, NX, NY, Ta, Ea, Fa, Sa, Dr, PX, PY, cells, ci0, cj0, ci1, cj1, cut, back, fill, areaTop, zt });
  };
  C.kaziCalc = calc;
  /* arazi ağından çıkarılacak hücreler */
  C.kaziCells = ar => { let set = null; for (const e of C.doc.ents) if (e.type === 'kazi' && (arOf(e) || {}).id === ar.id && C.layer(e.layer).on) { const k = calc(e); if (k && k.cells.size) { set = set || new Set(); for (const c of k.cells) set.add(c); } } return set; };

  /* eş değer eğrisi (yürüyen kareler, üçgenli) — val(k) alanında 'lev' seviyesi; z(k): 3B yükseklik */
  const contour = (K, val, lev, zf) => {
    const segs = [], { NX, NY, PX, PY } = K;
    const tri = (ks) => { const pts = []; for (let i = 0; i < 3; i++) { const p = ks[i], q = ks[(i + 1) % 3], a = val(p), b = val(q); if ((a < lev) !== (b < lev)) { const t = (lev - a) / (b - a); pts.push([PX[p] + (PX[q] - PX[p]) * t, PY[p] + (PY[q] - PY[p]) * t, zf ? zf(p) + (zf(q) - zf(p)) * t : 0]); } } if (pts.length === 2) segs.push(pts); };
    for (let b = 0; b < NY - 1; b++) for (let q = 0; q < NX - 1; q++) { const k00 = b * NX + q, k10 = k00 + 1, k01 = k00 + NX, k11 = k01 + 1; tri([k00, k10, k11]); tri([k00, k11, k01]); }
    return chainS(segs);
  };
  const chainS = segs => {
    const key = p => Math.round(p[0] * 1e4) + ',' + Math.round(p[1] * 1e4), map = new Map(), used = new Uint8Array(segs.length), out = [];
    segs.forEach((s, i) => { for (const p of s) { const k = key(p); if (!map.has(k)) map.set(k, []); map.get(k).push(i); } });
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue; used[i] = 1; const pts = [segs[i][0], segs[i][1]];
      for (const dir of [1, 0]) for (; ;) { const end = dir ? pts[pts.length - 1] : pts[0], c = (map.get(key(end)) || []).find(j => !used[j]); if (c == null) break; used[c] = 1; const s = segs[c], nx = key(s[0]) === key(end) ? s[1] : s[0]; if (dir) pts.push(nx); else pts.unshift(nx); }
      out.push(pts);
    }
    return out;
  };
  const plen = pts => { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; };
  const fmtK = v => (v >= 0 ? '+' : '') + v.toFixed(2);
  const fmtV = v => v.toLocaleString('tr-TR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

  /* ---------- nesne ---------- */
  T.kazi = {
    label: 'Kazı / dolgu',
    prims: e => {
      const out = [], K = calc(e), th = C.annoH(2.5), st = C.annoH(3);
      out.push(P(e.fp.map(q => [q[0], q[1], 0]), true, { lt: 'HIDDEN', color: 8 }));
      if (!K) { out.push(TX([e.fp[0][0], e.fp[0][1] + th, 0], th, 'KAZI (arazi bulunamadı)', 0, 'L')); return out; }
      const dolgu = e.durum === 'dolgu';
      // kazı taban sınırı (çalışma payı dahil)
      const nS = e.n > 0 ? e.n : 1, nF = e.nf > 0 ? e.nf : 1.5, Dw = k => Math.max(0, K.Dr[k]);
      const bot = contour(K, k => K.Dr[k], 0);
      for (const pl of bot) out.push(P(pl.map(q => [q[0], q[1], 0]), false, { color: 1, lw: 25 }));
      // kazı üst sınırı (şev üstü)
      const top = contour(K, k => K.Ta[k] - (e.zb + Dw(k) * nS), 0);
      for (const pl of top) out.push(P(pl.map(q => [q[0], q[1], 0]), false, { color: 1, lw: 35, lt: dolgu ? 'DASHED' : undefined }));
      // şev çizgileri (uzun / kısa dönüşümlü), üst sınırdan tabana doğru
      const ticks = (lines, toFp) => { for (const pl of lines) { const Lp = plen(pl); if (Lp < st) continue; let s = 0, k = 1, idx = 0; for (let d = st / 2; d < Lp; d += st) { while (k < pl.length && s + Math.hypot(pl[k][0] - pl[k - 1][0], pl[k][1] - pl[k - 1][1]) < d) { s += Math.hypot(pl[k][0] - pl[k - 1][0], pl[k][1] - pl[k - 1][1]); k++; } if (k >= pl.length) break; const a = pl[k - 1], b = pl[k], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = (d - s) / l, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; const r = polyDist(p, e.fp), len = Math.max(0, r[0] - (e.w || 0)); if (len < 1e-3) continue; const dx = (r[1] - p[0]) / r[0], dy = (r[2] - p[1]) / r[0], f = (idx++ % 2 === 0 ? 1 : 0.5) * (toFp ? 1 : 1); out.push(L([p[0], p[1], 0], [p[0] + dx * len * f, p[1] + dy * len * f, 0], { color: toFp ? 1 : 3, lw: 13 })); } } };
      if (!dolgu) ticks(top, true);
      if (K.zt != null) { // tesviye: dolgu topuğu ve şevi
        const toe = contour(K, k => (K.zt - Dw(k) * nF) - K.Ta[k], 0); for (const pl of toe) out.push(P(pl.map(q => [q[0], q[1], 0]), false, { color: 3, lw: 25 }));
        if (dolgu) { ticks(toe, false); const cutTop = contour(K, k => K.Ta[k] - (K.zt + Dw(k) * nS), 0); for (const pl of cutTop) out.push(P(pl.map(q => [q[0], q[1], 0]), false, { color: 3, lw: 25 })); ticks(cutTop, false); }
      }
      // etiketler
      let tx = -Infinity, tp = null; for (const pl of top.length ? top : bot) for (const q of pl) if (q[1] > tx) { tx = q[1]; tp = q; }
      if (tp) {
        const ln = [`KAZI · taban ${fmtK(e.zb)} · şev 1/${(e.n || 1)} · çalışma payı ${(e.w || 0)} m${K.zt != null ? ` · tesviye ${fmtK(K.zt)}` : ''}${dolgu ? ' · GERİ DOLGU YAPILDI' : ''}`, `Kazı ${fmtV(K.cut)} m³ · geri dolgu ${fmtV(K.back)} m³${K.fill > 0.05 ? ` · dolgu ${fmtV(K.fill)} m³` : ''}`];
        ln.forEach((s, i) => out.push(TX([tp[0], tp[1] + th * (1.2 + (ln.length - 1 - i) * 1.6), 0], th, s, 0, 'L')));
      }
      // köşe kotları: üst sınırın uç noktalarında arazi kotu, tabanda kazı kotu
      if (top.length) { const all = top.flat(); const ext = [all.reduce((m, q) => q[0] < m[0] ? q : m), all.reduce((m, q) => q[0] > m[0] ? q : m), all.reduce((m, q) => q[1] < m[1] ? q : m)]; for (const q of ext) { const z = tModel(K.a, q); if (z != null) out.push(...C.prims({ type: 'kot', pk: true, p: [q[0], q[1], 0], v: +z.toFixed(2), txt: 'AK', layer: e.layer })); } }
      if (bot.length) { const q = bot[0].reduce((m, r) => r[1] < m[1] ? r : m); out.push(...C.prims({ type: 'kot', pk: true, p: [q[0], q[1] + (e.w || 0) / 2, 0], v: e.zb, txt: 'KAZI TABANI', layer: e.layer })); }
      return out;
    },
    mesh: e => {
      const K = calc(e); if (!K || K.ci1 < K.ci0) return [];
      const { NX, Ta, Ea, Fa, Sa, PX, PY, sub, a } = K, dolgu = e.durum === 'dolgu';
      const b0 = K.cj0 * sub, b1 = (K.cj1 + 1) * sub, q0 = K.ci0 * sub, q1 = (K.ci1 + 1) * sub, W = q1 - q0 + 1;
      const Zs = k => dolgu ? Fa[k] : Ea[k];
      const v = [], vn = [], F = [], fc = [], h = a.d / sub, ref = a.ref || 0;
      let lo = Infinity, hi = -Infinity; for (const x of a.h) { if (x < lo) lo = x; if (x > hi) hi = x; } lo -= ref; hi -= ref;
      const pal = [[0.33, 0.52, 0.27], [0.62, 0.66, 0.38], [0.78, 0.70, 0.48], [0.58, 0.43, 0.30], [0.86, 0.84, 0.82]], rg = Math.max(1e-6, hi - lo);
      const colz = z => { const t = Math.min(0.9999, Math.max(0, (z - lo) / rg)) * (pal.length - 1), k = Math.floor(t), al = t - k; return [0, 1, 2].map(c => pal[k][c] * (1 - al) + pal[k + 1][c] * al); };
      const idx = (b, q) => (b - b0) * W + (q - q0);
      for (let b = b0; b <= b1; b++) for (let q = q0; q <= q1; q++) {
        const k = b * NX + q; v.push([PX[k], PY[k], Zs(k)]);
        const kx0 = b * NX + Math.max(q0, q - 1), kx1 = b * NX + Math.min(q1, q + 1), ky0 = Math.max(b0, b - 1) * NX + q, ky1 = Math.min(b1, b + 1) * NX + q;
        const gx = (Zs(kx1) - Zs(kx0)) / (Math.max(1, Math.min(q1, q + 1) - Math.max(q0, q - 1)) * h), gy = (Zs(ky1) - Zs(ky0)) / (Math.max(1, Math.min(b1, b + 1) - Math.max(b0, b - 1)) * h);
        const ux = K.f.ux, uy = K.f.uy, nx = -(gx * ux[0] + gy * uy[0]), ny = -(gx * ux[1] + gy * uy[1]), l = Math.hypot(nx, ny, 1); vn.push([nx / l, ny / l, 1 / l]);
      }
      const CUT = [0.66, 0.46, 0.30], BASE = [0.55, 0.38, 0.25], BACK = [0.74, 0.63, 0.44], FILL = [0.82, 0.74, 0.50];
      for (let b = b0; b < b1; b++) for (let q = q0; q < q1; q++) {
        const k00 = b * NX + q, k10 = k00 + 1, k11 = k00 + NX + 1, k01 = k00 + NX;
        const colOf = ks => { let dc = 0, df = 0, dbk = 0, zs = 0, flat = 0, sa = 0; for (const k of ks) { dc += Ta[k] - (e.zb + Math.max(0, K.Dr[k]) * (e.n > 0 ? e.n : 1)); df += Fa[k] - Ta[k]; dbk += Math.min(Fa[k], Ta[k]) - Ea[k]; zs += Zs(k); flat += Math.abs(Ea[k] - e.zb) < 1e-4 ? 1 : 0; sa += Sa[k]; } dc /= 3; df /= 3; dbk /= 3;
          if (dolgu) return df > EPS ? FILL : dbk > EPS && sa < 2 ? BACK : dc > 0 ? BASE : colz(zs / 3);
          return dc > 0 ? (flat === 3 ? BASE : CUT) : colz(zs / 3); };
        for (const [tk, ti] of [[[k00, k10, k11], [idx(b, q), idx(b, q + 1), idx(b + 1, q + 1)]], [[k00, k11, k01], [idx(b, q), idx(b + 1, q + 1), idx(b + 1, q)]]]) { if (dolgu && Sa[tk[0]] && Sa[tk[1]] && Sa[tk[2]]) continue; F.push(ti); fc.push(colOf(tk)); } // geri dolguda yapının içi boş kalır
      }
      // kenarlar: kazı üst sınırı ve taban sınırı 3B
      const ed = [];
      const zK = k => Zs(k);
      const nS = e.n > 0 ? e.n : 1; for (const pl of contour(K, k => Ta[k] - (e.zb + Math.max(0, K.Dr[k]) * nS), 0, k => Ta[k])) for (let i = 1; i < pl.length; i++) ed.push([pl[i - 1], pl[i]]);
      if (!dolgu) for (const pl of contour(K, k => K.Dr[k], 0, zK)) for (let i = 1; i < pl.length; i++) ed.push([pl[i - 1], pl[i]]);
      const sal = 1 - Math.min(95, Math.max(0, +a.seff || 0)) / 100;
      return [{ t: 'tri', v, vn, f: F, fc, edges3: ed, al: sal < 0.995 ? sal : undefined }];
    },
    xf: (e, X) => { e.fp = e.fp.map(q => X.p([q[0], q[1], 0]).slice(0, 2)); if (e.st) e.st = e.st.map(pl => pl.map(q => X.p([q[0], q[1], 0]).slice(0, 2))); },
    snaps: e => e.fp.map(q => ({ p: [q[0], q[1], 0], k: 'end' })),
    info: e => { const K = calc(e); return `taban ${fmtK(e.zb)} · şev 1/${e.n || 1} · çalışma payı ${e.w || 0} m${K && K.zt != null ? ' · tesviye ' + fmtK(K.zt) : ''} · ${e.durum === 'dolgu' ? 'geri dolgu yapıldı' : 'açık kazı'}${K ? ` · KAZI ${fmtV(K.cut)} m³ · GERİ DOLGU ${fmtV(K.back)} m³ · DOLGU ${fmtV(K.fill)} m³ · FAZLA ${fmtV(K.cut - K.back - K.fill)} m³` : ' · arazi yok'}`; },
  };

  /* kazı ya da arazi değişince ilgili önbellekleri temizle */
  const sigOf = e => { const a = arOf(e); return JSON.stringify([e.fp, e.st, e.w, e.zb, e.n, e.zt, e.nf, e.durum, e.res, e.ar, C.layer(e.layer).on, a ? [a.h.length, a.ref, a.seff, a.d, a.o] : 0]); };
  C.on('change', () => {
    if (!C.doc) return; const dirtyAr = new Set();
    for (const e of C.doc.ents) if (e.type === 'kazi') { const s = sigOf(e); if (e._sig !== s) { e._sig = s; delete e._c; dirtyAr.add(e.ar); } }
    for (const e of C.doc.ents) if (e.type === 'arazi') { const ks = C.doc.ents.filter(k => k.type === 'kazi' && k.ar === e.id).map(k => k._sig).join('|'); if (dirtyAr.has(e.id) || e._ksig !== ks) { e._ksig = ks; delete e._c; } }
  });

  /* ---------- seçimden yapı izi ---------- */
  const footOf = ents => {
    const polys = [], all = [];
    for (const e of ents) {
      let pts = [];
      if (e.type === 'pline' && e.closed) { const pr = C.prims(e)[0]; pts = pr.pts.map(q => [q[0], q[1]]); polys.push(pts); all.push(...pts); continue; }
      if (e.type === 'circle') { for (let i = 0; i < 72; i++) pts.push([e.c[0] + e.r * Math.cos(i * Math.PI / 36), e.c[1] + e.r * Math.sin(i * Math.PI / 36)]); polys.push(pts); all.push(...pts); continue; }
      const t = C.entTris(e); if (t && t.pos.length) { for (let i = 0; i < t.pos.length; i += 3) pts.push([t.pos[i], t.pos[i + 1]]); }
      else for (const pr of C.prims(e)) for (const sg of C.primSegs(pr)) pts.push(...sg);
      if (pts.length >= 3) { const h = hull(pts); if (h.length >= 3) { polys.push(h); all.push(...h); } }
    }
    return { fp: all.length >= 3 ? hull(all) : null, st: polys };
  };
  const zMinOf = ents => { let z = Infinity; for (const e of ents) { const t = C.entTris(e); if (t) for (let i = 2; i < t.pos.length; i += 3) z = Math.min(z, t.pos[i]); } return z === Infinity ? null : z; };
  const parseSlope = s => { s = String(s == null ? '' : s).replace(',', '.').trim(); const m = /^(\d*\.?\d+)\s*[:/]\s*(\d*\.?\d+)$/.exec(s); if (m) return +m[2] / +m[1] === 0 ? null : (+m[1] === 1 ? +m[2] : +m[2] / +m[1]); const v = parseFloat(s); return v > 0 ? v : null; };

  C.addCommand(['KAZI', 'EXCAVATION', 'KAZIYAP', 'TEMELKAZISI'], 'Yapıyı araziye oturtur: seçilen yapıların (ya da kapalı çoklu çizginin) çevresinde, girdiğiniz çalışma payı, taban kotu ve şev oranıyla kazı oluşturur; isteğe bağlı tesviye kotu ve dolgu şevi. 3B\'de kazı çukuru, 2B\'de kazı planı (üst/taban sınırı, şev çizgileri, kotlar) ve kübaj görünür.', async (I) => {
    const ars = C.doc.ents.filter(e => e.type === 'arazi'); if (!ars.length) { C.warn('Önce arazi gerekli (ARAZI komutu).'); return; }
    const s = await I.sel('Araziye oturtulacak yapıları ya da kazı tabanı için kapalı çoklu çizgiyi seçin'); if (!s.length) return;
    const ft = footOf(s); if (!ft.fp) { C.warn('Seçimden yapı izi çıkarılamadı.'); return; }
    const cen = ft.fp.reduce((m, q) => [m[0] + q[0] / ft.fp.length, m[1] + q[1] / ft.fp.length], [0, 0]);
    const ar = ars.find(a => C.araziKot(a, cen) != null); if (!ar) { C.warn('Yapı arazi alanının dışında.'); return; }
    const zMin = zMinOf(s), Tc = tModel(ar, cen);
    const w = await I.num('Çalışma payı (yapı kenarından, m)', 0.5); if (w == null) return;
    const zb = await I.num(`Kazı taban kotu (yapı alt kotu ${zMin != null ? fmtK(zMin) : '?'}, arazi ${fmtK(Tc)})`, zMin != null ? +(zMin - 0.1).toFixed(2) : +(Tc - 2).toFixed(2)); if (zb == null) return;
    const ns = await I.str('Kazı şevi (yatay/düşey — ör. 1, 1.5 ya da 1:1, 3:2)', '1', { whole: false }); const n = parseSlope(ns) || 1;
    const zts = await I.str('Tesviye kotu (Enter = mevcut arazi kalsın)', '', { whole: false });
    const zt = zts && isFinite(parseFloat(String(zts).replace(',', '.'))) ? parseFloat(String(zts).replace(',', '.')) : null;
    let nf = 1.5; if (zt != null) { const nfs = await I.str('Dolgu şevi (yatay/düşey)', '1.5', { whole: false }); nf = parseSlope(nfs) || 1.5; }
    C.ensureLayer('KAZI', 30, 'CONTINUOUS', 25);
    const e = C.add(C.newEnt('kazi', { ar: ar.id, fp: ft.fp, st: ft.st, w, zb, n, zt, nf, durum: 'kazi', layer: 'KAZI' })); delete e.sp; delete e.gv;
    C.changed();
    const K = calc(e);
    C.log(K ? `Kazı oluşturuldu · taban ${fmtK(zb)} · şev 1/${n}${zt != null ? ` · tesviye ${fmtK(zt)} (dolgu şevi 1/${nf})` : ''} → KAZI ${fmtV(K.cut)} m³ · geri dolgu ${fmtV(K.back)} m³ · dolgu ${fmtV(K.fill)} m³ · fazla malzeme ${fmtV(K.cut - K.back - K.fill)} m³. Geri dolgu görünümü: KAZIDURUM · kesit: KAZIKESIT · cetvel: KAZIHACIM.` : 'Kazı oluşturuldu (hesap yapılamadı).');
  });

  C.addCommand(['KAZIDURUM', 'GERIDOLGU', 'BACKFILL'], 'Seçilen kazıları açık kazı ↔ geri dolgu yapılmış (tesviye) görünümü arasında değiştirir', async (I) => {
    let s = (await I.sel('Kazıları seçin (Enter = hepsi)')).filter(e => e.type === 'kazi'); if (!s.length) s = C.doc.ents.filter(e => e.type === 'kazi');
    if (!s.length) { C.warn('Kazı yok.'); return; }
    const to = s[0].durum === 'dolgu' ? 'kazi' : 'dolgu'; for (const e of s) { e.durum = to; delete e._c; } C.changed();
    C.log(to === 'dolgu' ? `${s.length} kazı geri dolduruldu (tesviye görünümü).` : `${s.length} kazı açık kazı görünümüne alındı.`);
  });

  /* ---------- KAZI KESİTİ (kot tablolu) ---------- */
  const groundAt = p => { for (const a of C.doc.ents) if (a.type === 'arazi' && C.layer(a.layer).on) { const z = tModel(a, p); if (z != null) return { a, z }; } return null; };
  const profileAt = p => {
    const g = groundAt(p); if (!g) return null; let Ez = g.z, Fz = g.z, inS = false;
    for (const e of C.doc.ents) if (e.type === 'kazi' && e.ar === g.a.id && C.layer(e.layer).on) { const s = surfAt(e, p, g.z); Ez = Math.min(Ez, s.E); if (Math.abs(s.F - g.z) > Math.abs(Fz - g.z)) Fz = s.F; if (s.inS) inS = true; }
    return { T: g.z, E: Ez, F: Fz, inS };
  };
  let kesNo = 1;
  C.addCommand(['KAZIKESIT', 'KAZIKESITI', 'KAZIPROFIL', 'CUTFILLSECTION'], 'Kazı / dolgu kesiti: kesit çizgisini çizin; mevcut arazi, kazı ve tesviye çizgileri, kazı / geri dolgu / dolgu taramaları, alanlar ve altta istasyon – arazi kotu – kazı kotu – tesviye kotu – kazı derinliği tablosu üretilir.', async (I) => {
    const a = await I.pt('Kesit çizgisi 1. nokta'); if (!a || typeof a === 'string') return;
    E.base = a; const b = await I.pt('Kesit çizgisi 2. nokta'); E.base = null; if (!b || typeof b === 'string') return;
    const Lc = M.dist2(a, b); if (Lc < 1) return; const u = [(b[0] - a[0]) / Lc, (b[1] - a[1]) / Lc];
    const ds = await I.num('İstasyon aralığı (m)', Lc > 100 ? 10 : 5) || 5;
    const nm = (await I.str('Kesit adı', 'K' + kesNo, { whole: false }) || 'K' + kesNo).toUpperCase();
    // örnekleme
    const step = Math.max(0.05, Math.min(0.25, Lc / 600)), smp = [];
    for (let s = 0; s <= Lc + 1e-9; s += step) { const p = [a[0] + u[0] * s, a[1] + u[1] * s], r = profileAt(p); smp.push(r ? Object.assign({ s }, r) : null); }
    if (smp[smp.length - 1] && smp[smp.length - 1].s < Lc - 1e-6) { const r = profileAt(b); if (r) smp.push(Object.assign({ s: Lc }, r)); }
    const ok = smp.filter(Boolean); if (ok.length < 2) { C.warn('Kesit çizgisi arazi üzerinde değil.'); return; }
    let zmin = Infinity, zmax = -Infinity; for (const r of ok) { zmin = Math.min(zmin, r.E, r.F); zmax = Math.max(zmax, r.T, r.F); }
    const datum = Math.floor(zmin - 1), th = C.annoH(2.5), rh = C.annoH(9), lw = C.annoH(42);
    const rows = [['İSTASYON (m)', r => r.s.toFixed(2)], ['ARAZİ KOTU', r => r.T.toFixed(2)], ['KAZI KOTU', r => r.E.toFixed(2)], ['TESVİYE KOTU', r => r.F.toFixed(2)], ['KAZI DERİNLİĞİ', r => Math.max(0, r.T - r.E).toFixed(2)], ['DOLGU YÜKSEKLİĞİ', r => Math.max(0, r.F - r.T).toFixed(2)]];
    const tabH = rh * rows.length, prH = zmax - datum;
    E.preview = c => [P([[c[0] - lw, c[1] - tabH, 0], [c[0] + Lc, c[1] - tabH, 0], [c[0] + Lc, c[1] + prH, 0], [c[0] - lw, c[1] + prH, 0]], true, { lt: 'DASHED' })];
    const q0 = await I.pt('Kesitin yerleşim noktası (sol alt — kıyas çizgisi başlangıcı)'); E.preview = null; if (!q0 || typeof q0 === 'string') return;
    const W = (s, z) => [q0[0] + s, q0[1] + (z - datum), 0];
    const LY = { T: 'ARAZI_MEVCUT', E: 'KAZI', F: 'TESVIYE', H: 'KAZI_TARAMA', Y: 'YAZI', G: 'KAZI_TABLO' };
    C.ensureLayer(LY.T, 34, 'DASHED', 18); C.ensureLayer(LY.E, 30, 'CONTINUOUS', 35); C.ensureLayer(LY.F, 3, 'CONTINUOUS', 35); C.ensureLayer(LY.H, 8, 'CONTINUOUS', 13); C.ensureLayer(LY.G, 8, 'CONTINUOUS', 13); C.std('YAZI');
    const runs = arr => { const o = []; let cur = []; for (const r of arr) { if (r) cur.push(r); else if (cur.length) { o.push(cur); cur = []; } } if (cur.length) o.push(cur); return o; };
    const line = (key, lay, only) => { for (const rn of runs(smp)) { let pts = []; const flush = () => { if (pts.length > 1) { const f = C.fitCurve ? C.fitCurve(pts, false) : null; if (f && f.type === 'pline' && !f.bul) C.add(C.newEnt('pline', { pts: f.pts.map(q => [q[0], q[1], 0]), closed: false, layer: lay })); else if (f && f.type === 'line') C.add(C.newEnt('line', { a: [...f.a, 0], b: [...f.b, 0], layer: lay })); else C.add(C.newEnt('pline', { pts: pts.map(q => [q[0], q[1], 0]), closed: false, layer: lay })); } pts = []; }; for (const r of rn) { if (only && !only(r)) { flush(); continue; } const w = W(r.s, r[key]); pts.push([w[0], w[1]]); } flush(); } };
    line('T', LY.T); line('E', LY.E, r => r.T - r.E > 1e-3); line('F', LY.F, r => !r.inS && (Math.abs(r.F - r.T) > 1e-3 || r.T - r.E > 1e-3));
    // kesitteki yapılar (kesilen katılar)
    { const nrm = [-u[1], u[0]], cut = [], ents = C.doc.ents.filter(e => C.layer(e.layer).on && e.type !== 'arazi' && e.type !== 'kazi' && e.type !== 'sheet' && C.meshes(e) && C.meshes(e).length);
      for (const e of ents) { const t = C.entTris(e); if (!t) continue; const Pp = t.pos; for (let i = 0; i < Pp.length; i += 9) { const v3 = [0, 3, 6].map(o => [Pp[i + o], Pp[i + o + 1], Pp[i + o + 2]]), dd = v3.map(q => (q[0] - a[0]) * nrm[0] + (q[1] - a[1]) * nrm[1]); if ((dd[0] > 0 && dd[1] > 0 && dd[2] > 0) || (dd[0] < 0 && dd[1] < 0 && dd[2] < 0)) continue; const pts = []; for (const [x, y] of [[0, 1], [1, 2], [2, 0]]) if ((dd[x] < 0) !== (dd[y] < 0) && dd[x] !== dd[y]) { const tt = dd[x] / (dd[x] - dd[y]), q = [v3[x][0] + (v3[y][0] - v3[x][0]) * tt, v3[x][1] + (v3[y][1] - v3[x][1]) * tt, v3[x][2] + (v3[y][2] - v3[x][2]) * tt]; pts.push([(q[0] - a[0]) * u[0] + (q[1] - a[1]) * u[1], q[2]]); } if (pts.length === 2 && pts[0][0] > -1 && pts[0][0] < Lc + 1 && Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]) > 1e-5) { pts.g = e.id; pts.conc = true; cut.push(pts); } } }
      if (cut.length && C.sectionMerge) { const R = C.sectionMerge(cut, []); C.std('KESIT'); const Wq = q => W(q[0], q[1]); for (const lp of R.loops.concat(R.equip)) C.addFitted(lp, true, Wq, { layer: 'KESIT' }); if (R.loops.length && C.T.hatch) { C.ensureLayer('KESIT_TARAMA', 8, 'CONTINUOUS', 13); C.add(C.newEnt('hatch', { loops: R.loops.map(lp => (C.denseLoop ? C.denseLoop(lp) : lp).map(q => { const w = Wq(q); return [w[0], w[1]]; })), pat: (C.kesitStil && C.kesitStil().pat !== 'YOK' && C.HATCH_PATTERNS && C.HATCH_PATTERNS[C.kesitStil().pat]) ? C.kesitStil().pat : 'ANSI31', sc: 1, ang: 0, ann: true, orig: [0, 0], layer: 'KESIT_TARAMA' })); } }
    }
    // taramalar ve alanlar
    let aCut = 0, aBack = 0, aFill = 0;
    const band = (top, bot, cond, pat, sc) => {
      for (const rn of runs(smp)) { let seg = []; const flush = () => { if (seg.length > 1) { const lp = seg.map(r => W(r.s, top(r))).concat(seg.slice().reverse().map(r => W(r.s, bot(r)))).map(q => [q[0], q[1]]); if (Math.abs(M.polyArea(lp)) > 1e-4) C.add(C.newEnt('hatch', { loops: [lp], pat, sc, ang: 0, ann: true, orig: [0, 0], layer: LY.H })); } seg = []; }; for (const r of rn) { if (cond(r)) seg.push(r); else flush(); } flush(); }
    };
    for (let i = 1; i < ok.length; i++) { const p = ok[i - 1], q = ok[i], dsx = q.s - p.s; if (dsx > step * 1.5) continue; aCut += dsx * ((p.T - p.E) + (q.T - q.E)) / 2; const bk = r => r.inS ? 0 : Math.max(0, Math.min(r.F, r.T) - r.E), fl = r => r.inS ? 0 : Math.max(0, r.F - r.T); aBack += dsx * (bk(p) + bk(q)) / 2; aFill += dsx * (fl(p) + fl(q)) / 2; }
    const anyDolgu = C.doc.ents.some(e => e.type === 'kazi' && e.durum === 'dolgu');
    const cutBot = r => anyDolgu ? Math.max(r.E, Math.min(r.F, r.T)) : r.E;
    band(r => r.T, cutBot, r => !r.inS && r.T - cutBot(r) > 1e-3, 'EARTH', 1);
    if (anyDolgu) band(r => Math.min(r.F, r.T), r => r.E, r => !r.inS && Math.min(r.F, r.T) - r.E > 1e-3, 'AR-SAND', 1);
    band(r => r.F, r => r.T, r => !r.inS && r.F - r.T > 1e-3, 'DOLGU', 1);
    // kıyas çizgisi ve tablo
    const tl = (p1, p2) => C.add(C.newEnt('line', { a: p1, b: p2, layer: LY.G }));
    const x0 = q0[0] - lw, x1 = q0[0] + Lc, yD = q0[1];
    tl([x0, yD, 0], [x1, yD, 0]); for (let k = 0; k <= rows.length; k++) tl([x0, yD - k * rh, 0], [x1, yD - k * rh, 0]); tl([x0, yD - tabH, 0], [x0, yD, 0]); tl([q0[0], yD - tabH, 0], [q0[0], yD, 0]); tl([x1, yD - tabH, 0], [x1, yD, 0]);
    C.add(C.newEnt('text', { p: [x0 + th * 0.5, yD + th * 0.6, 0], h: th, s: `KIYAS KOTU ${fmtK(datum)}`, rot: 0, al: 'L', layer: 'YAZI' }));
    rows.forEach(([t], k) => C.add(C.newEnt('text', { p: [x0 + th * 0.6, yD - (k + 0.5) * rh - th / 2, 0], h: th, s: t, rot: 0, al: 'L', layer: 'YAZI' })));
    const sts = []; for (let s = 0; s <= Lc + 1e-6; s += ds) sts.push(Math.min(s, Lc)); if (Lc - sts[sts.length - 1] > ds * 0.3) sts.push(Lc);
    // kazı kenarlarını (şev üstü / topuk) da istasyon olarak ekle
    for (let i = 1; i < ok.length; i++) { const p = ok[i - 1], q = ok[i]; const ch = (f) => (f(p) > 1e-3) !== (f(q) > 1e-3); if (ch(r => r.T - r.E) || ch(r => Math.abs(r.F - r.T))) { const s = q.s; if (!sts.some(x => Math.abs(x - s) < ds * 0.25)) sts.push(s); } }
    sts.sort((x, y) => x - y);
    for (const s of sts) {
      const r = profileAt([a[0] + u[0] * s, a[1] + u[1] * s]); if (!r) continue; r.s = s;
      const top = W(s, Math.max(r.T, r.F)); tl([q0[0] + s, yD, 0], [q0[0] + s, top[1], 0]);
      rows.forEach(([, fn], k) => C.add(C.newEnt('text', { p: [q0[0] + s + th * 0.45, yD - (k + 0.5) * rh, 0], h: th * 0.9, s: fn(r), rot: 90, al: 'C', layer: 'YAZI' })));
    }
    const yT = yD - tabH - th * 2.2;
    C.add(C.newEnt('text', { p: [q0[0], yT, 0], h: th, s: `Kazı alanı ${aCut.toFixed(2)} m² · Geri dolgu alanı ${aBack.toFixed(2)} m² · Dolgu alanı ${aFill.toFixed(2)} m²`, rot: 0, al: 'L', layer: 'YAZI' }));
    const tt = W(Lc / 2, zmax); C.add(C.newEnt(C.T.baslik ? 'baslik' : 'text', C.T.baslik ? { p: [tt[0], yT - th * 3.2, 0], s: `${nm}-${nm} KAZI KESİTİ`, hp: 5, layer: 'YAZI' } : { p: [tt[0], yT - th * 3, 0], h: th * 2, s: `${nm}-${nm} KAZI KESİTİ`, rot: 0, al: 'C', layer: 'YAZI' }));
    // lejant
    const lg = [['Mevcut arazi', LY.T], ['Kazı', LY.E], ['Tesviye / bitmiş zemin', LY.F]]; lg.forEach(([t, ly], k) => { const y = yD + prH + th * (2 + k * 1.6); C.add(C.newEnt('line', { a: [x0, y, 0], b: [x0 + th * 4, y, 0], layer: ly })); C.add(C.newEnt('text', { p: [x0 + th * 5, y - th / 2, 0], h: th, s: t, rot: 0, al: 'L', layer: 'YAZI' })); });
    // plandaki kesit çizgisi
    C.ensureLayer('KAZI_KESIT', 30, 'PHANTOM', 25);
    C.add(C.newEnt('line', { a: [a[0], a[1], 0], b: [b[0], b[1], 0], layer: 'KAZI_KESIT' }));
    for (const p of [a, b]) C.add(C.newEnt('text', { p: [p[0] - u[1] * th * 1.5, p[1] + u[0] * th * 1.5, 0], h: th * 1.4, s: nm, rot: 0, al: 'C', layer: 'KAZI_KESIT' }));
    kesNo++;
    C.log(`${nm}-${nm} kazı kesiti: kazı alanı ${aCut.toFixed(2)} m², geri dolgu ${aBack.toFixed(2)} m², dolgu ${aFill.toFixed(2)} m² · kıyas ${fmtK(datum)}.`);
  });

  /* ---------- KÜBAJ ---------- */
  C.addCommand(['KAZIHACIM', 'KUBAJ', 'KAZIKUBAJ', 'CUTFILL'], 'Kazı / geri dolgu / dolgu kübajlarını hesaplar; isteğe bağlı kübaj cetvelini çizime yerleştirir', async (I) => {
    const ks = C.doc.ents.filter(e => e.type === 'kazi'); if (!ks.length) { C.warn('Kazı yok (KAZI komutu).'); return; }
    let tc = 0, tb = 0, tf = 0; const rowsV = [];
    ks.forEach((e, i) => { const K = calc(e); if (!K) return; tc += K.cut; tb += K.back; tf += K.fill; rowsV.push([`Kazı ${i + 1} (taban ${fmtK(e.zb)}, şev 1/${e.n || 1})`, K.cut, K.back, K.fill, K.cut - K.back - K.fill]); C.log(`Kazı ${i + 1}: kazı ${fmtV(K.cut)} m³ · geri dolgu ${fmtV(K.back)} m³ · dolgu ${fmtV(K.fill)} m³ · kazı alanı (üst) ${fmtV(K.areaTop)} m²`); });
    rowsV.push(['TOPLAM', tc, tb, tf, tc - tb - tf]);
    C.log(`TOPLAM: kazı ${fmtV(tc)} m³ · geri dolgu ${fmtV(tb)} m³ · dolgu ${fmtV(tf)} m³ · ${tc - tb - tf >= 0 ? 'fazla (nakledilecek)' : 'eksik (getirilecek)'} malzeme ${fmtV(Math.abs(tc - tb - tf))} m³`);
    const p = await I.pt('Kübaj cetvelinin yeri (Enter = yerleştirme)'); if (!p || typeof p === 'string') return;
    const th = C.annoH(2.5), rh = th * 2.2, cw = [th * 26, th * 9, th * 9, th * 9, th * 11], X = [p[0]]; for (const w of cw) X.push(X[X.length - 1] + w);
    const hdr = ['KAZI-DOLGU KÜBAJ CETVELİ', 'KAZI (m³)', 'GERİ DOLGU (m³)', 'DOLGU (m³)', 'FAZLA / EKSİK (m³)'], all = [hdr].concat(rowsV.map(r => [r[0], fmtV(r[1]), fmtV(r[2]), fmtV(r[3]), fmtV(r[4])]));
    C.std('YAZI'); C.ensureLayer('KAZI_TABLO', 8, 'CONTINUOUS', 13);
    for (let k = 0; k <= all.length; k++) C.add(C.newEnt('line', { a: [X[0], p[1] - k * rh, 0], b: [X[X.length - 1], p[1] - k * rh, 0], layer: 'KAZI_TABLO' }));
    for (const x of X) C.add(C.newEnt('line', { a: [x, p[1], 0], b: [x, p[1] - all.length * rh, 0], layer: 'KAZI_TABLO' }));
    all.forEach((r, k) => r.forEach((t, c) => C.add(C.newEnt('text', { p: [c === 0 ? X[c] + th * 0.5 : X[c + 1] - th * 0.5, p[1] - (k + 0.5) * rh - th / 2, 0], h: k === 0 || k === all.length - 1 ? th * 0.95 : th * 0.9, s: t, rot: 0, al: c === 0 ? 'L' : 'R', layer: 'YAZI' }))));
  });

  /* ---------- ARAZİ AYARLARI ---------- */
  C.addCommand(['ARAZIAYAR', 'ARAZISEFFAF', 'TERRAINSET'], 'Arazi görünümü: yüzey saydamlığı (%), arazinin altında devam eden zemin bloğunun derinliği (m) ve saydamlığı (%). Betikte: ARAZIAYAR S=40 D=10 B=60', async (I) => {
    const kv = {}; E.queue = E.queue.filter(t => { const m = /^([A-Za-z]+)=(.*)$/.exec(t); if (m) { kv[C.up(m[1])] = parseFloat(String(m[2]).replace(',', '.')); return false; } return true; });
    let ars = C.doc.ents.filter(e => e.type === 'arazi'); if (!ars.length) { C.warn('Arazi yok.'); return; }
    if (ars.length > 1) { const s = (await I.sel('Arazileri seçin (Enter = hepsi)')).filter(e => e.type === 'arazi'); if (s.length) ars = s; }
    const apply = (S, D, B) => { C.undoStack.push(C.snapshot()); for (const e of ars) { if (S != null && isFinite(S)) e.seff = Math.max(0, Math.min(95, S)); if (D != null && isFinite(D)) e.dep = Math.max(0, D); if (B != null && isFinite(B)) e.bseff = Math.max(0, Math.min(97, B)); delete e._c; } for (const k of C.doc.ents) if (k.type === 'kazi') delete k._c; C.changed(); C.log(`Arazi: yüzey saydamlığı %${ars[0].seff || 0} · zemin bloğu ${ars[0].dep || 0} m (saydamlık %${ars[0].bseff != null ? ars[0].bseff : 60}).`); };
    if (Object.keys(kv).length || E.scriptMode) { apply(kv.S, kv.D, kv.B); return; }
    const a0 = ars[0];
    const b = C.modal('Arazi görünümü', `
      <div class="fld"><label>Yüzey saydamlığı (%) — 0 = opak</label><input id="arS" type="range" min="0" max="95" value="${a0.seff || 0}"><span id="arSv">${a0.seff || 0}</span></div>
      <div class="fld"><label>Zemin bloğu derinliği (m) — arazinin altında devam eden toprak; 0 = yok</label><input id="arD" type="text" inputmode="decimal" value="${a0.dep || 0}"></div>
      <div class="fld"><label>Zemin bloğu saydamlığı (%)</label><input id="arB" type="range" min="0" max="97" value="${a0.bseff != null ? a0.bseff : 60}"><span id="arBv">${a0.bseff != null ? a0.bseff : 60}</span></div>
      <p class="hint">Saydam arazi ve zemin bloğu ile kazı çukuru, temeller ve gömülü borular 3B'de arazinin içinden görünür.</p>
      <div class="bar" style="justify-content:flex-end"><button id="arCancel">İptal</button><button id="arOk" class="pri">Uygula</button></div>`);
    b.querySelector('#arS').oninput = ev => { b.querySelector('#arSv').textContent = ev.target.value; };
    b.querySelector('#arB').oninput = ev => { b.querySelector('#arBv').textContent = ev.target.value; };
    return new Promise(res => {
      b.querySelector('#arOk').onclick = () => { apply(+b.querySelector('#arS').value, parseFloat(String(b.querySelector('#arD').value).replace(',', '.')), +b.querySelector('#arB').value); C.closeModal(); res(); };
      b.querySelector('#arCancel').onclick = () => { C.closeModal(); res(); };
    });
  }, { noUndo: true });
  /* kazı kesiti ve kübaj cetveli 2B çizimdir: 3B sekmesinde çalıştırılsa da planda görünür (3B'de gizli) */
  for (const nm of ['KAZIKESIT', 'KAZIHACIM']) { const d0 = C.cmds[nm]; if (d0) C.addCommand(d0.names, d0.help, async (I, Cx) => { C._gvCur = 'Z' + Date.now().toString(36); try { return await d0.fn(I, Cx); } finally { C._gvCur = null; } }, d0.opts); }
})(window.C);

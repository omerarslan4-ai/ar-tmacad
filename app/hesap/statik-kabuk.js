/* ArıtmaCAD — STATİK: 3B KABUK SONLU ELEMAN ÇÖZÜCÜSÜ (yay / oval / serbest planlı su yapıları)
   SAP2000 "shell-thick" benzeri model: perdeler (düz + yay, yaylar düz parçalara bölünür), Winkler zemin üstünde radye, döşemeler.
   Eleman: 4 düğümlü düz kabuk — zar: Q4 (2×2 Gauss) + bükülme: MITC4 (Bathe–Dvorkin, kayma kilitlenmesiz) + küçük burulma (drilling) rijitliği.
   Düğümde 6 serbestlik (ux uy uz rx ry rz, global). Ağlar örtüşmeyen yerlerde (perde tabanı ↔ radye, perde üstü ↔ döşeme)
   ceza yöntemiyle çok noktalı bağ (MPC): bağlı düğüm = ana elemanın şekil fonksiyonlarıyla ara değer (6 serbestlik).
   Çözüm: ters Cuthill–McKee sıralama + gökyüzü (skyline) LDLᵀ — bir kez ayrıştır, tüm yükleme durumlarını çöz.
   Birimler: kN, m. Eleman yerel eksenleri: perdede 1 = yatay (perde boyunca), 2 = düşey yukarı, 3 = 1×2;
   radye / döşemede 1 = +X, 2 = +Y, 3 = +Z. M11: 1 yönünde gerilme doğuran moment (1 yönü donatısı), M22: 2 yönü.
   İşaret: M > 0 → yerel +3 yüzünde çekme. */
(function (G) {
  'use strict';
  const P = G.STATIK = G.STATIK || {};
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const GP = [-1 / Math.sqrt(3), 1 / Math.sqrt(3)], XI = [-1, 1, 1, -1], ET = [-1, -1, 1, 1];
  const shp = (x, y) => [0.25 * (1 - x) * (1 - y), 0.25 * (1 + x) * (1 - y), 0.25 * (1 + x) * (1 + y), 0.25 * (1 - x) * (1 + y)];
  const dshp = (x, y) => [[-0.25 * (1 - y), 0.25 * (1 - y), 0.25 * (1 + y), -0.25 * (1 + y)], [-0.25 * (1 - x), -0.25 * (1 + x), 0.25 * (1 + x), 0.25 * (1 - x)]];

  /* ---------- eleman yerel çerçevesi ---------- */
  const cerceve = X => {
    const c = mul(add(add(X[0], X[1]), add(X[2], X[3])), 0.25);
    let e3 = nrm(cross(sub(X[2], X[0]), sub(X[3], X[1])));
    let e1 = nrm(add(sub(X[1], X[0]), sub(X[2], X[3]))); e1 = nrm(sub(e1, mul(e3, dot(e1, e3))));
    const e2 = cross(e3, e1);
    const xl = X.map(p => { const d = sub(p, c); return [dot(d, e1), dot(d, e2)]; });
    return { c, e1, e2, e3, xl };
  };
  const jac = (xl, x, y) => { const d = dshp(x, y); let a = 0, b = 0, c = 0, e = 0; for (let i = 0; i < 4; i++) { a += d[0][i] * xl[i][0]; b += d[0][i] * xl[i][1]; c += d[1][i] * xl[i][0]; e += d[1][i] * xl[i][1]; } const det = a * e - b * c; return { J: [[a, b], [c, e]], det, inv: [[e / det, -b / det], [-c / det, a / det]], d }; };

  /* B matrisleri (yerel 24 serbestlik: düğüm başına u v w θx θy θz) */
  const Bmem = (xl, x, y) => { const j = jac(xl, x, y), B = [new Float64Array(24), new Float64Array(24), new Float64Array(24)];
    for (let i = 0; i < 4; i++) { const nx = j.inv[0][0] * j.d[0][i] + j.inv[0][1] * j.d[1][i], ny = j.inv[1][0] * j.d[0][i] + j.inv[1][1] * j.d[1][i]; B[0][6 * i] = nx; B[1][6 * i + 1] = ny; B[2][6 * i] = ny; B[2][6 * i + 1] = nx; }
    return { B, det: j.det }; };
  // βx = −θy , βy = θx (w = −θy·x + θx·y)
  const Bbend = (xl, x, y) => { const j = jac(xl, x, y), B = [new Float64Array(24), new Float64Array(24), new Float64Array(24)];
    for (let i = 0; i < 4; i++) { const nx = j.inv[0][0] * j.d[0][i] + j.inv[0][1] * j.d[1][i], ny = j.inv[1][0] * j.d[0][i] + j.inv[1][1] * j.d[1][i];
      B[0][6 * i + 4] = -nx; B[1][6 * i + 3] = ny; B[2][6 * i + 4] = -ny; B[2][6 * i + 3] = nx; }
    return { B, det: j.det }; };
  // MITC4 kovaryant kayma (bağlama noktaları A(0,−1) C(0,1) için γξ, B(1,0) D(−1,0) için γη)
  const covar = (xl, x, y, yon) => { // yon 0: γξ, 1: γη  → 24'lük satır
    const N = shp(x, y), d = dshp(x, y), r = new Float64Array(24); let xs = 0, ys = 0; for (let i = 0; i < 4; i++) { xs += d[yon][i] * xl[i][0]; ys += d[yon][i] * xl[i][1]; }
    for (let i = 0; i < 4; i++) { r[6 * i + 2] = d[yon][i]; r[6 * i + 4] = N[i] * xs; r[6 * i + 3] = -N[i] * ys; } // −(βx·x,s + βy·y,s) = θy·N·x,s − θx·N·y,s
    return r; };
  const Bshear = (xl, x, y) => { const gA = covar(xl, 0, -1, 0), gC = covar(xl, 0, 1, 0), gB = covar(xl, 1, 0, 1), gD = covar(xl, -1, 0, 1), j = jac(xl, x, y);
    const gx = new Float64Array(24), ge = new Float64Array(24); for (let k = 0; k < 24; k++) { gx[k] = 0.5 * (1 - y) * gA[k] + 0.5 * (1 + y) * gC[k]; ge[k] = 0.5 * (1 - x) * gD[k] + 0.5 * (1 + x) * gB[k]; }
    const B = [new Float64Array(24), new Float64Array(24)]; for (let k = 0; k < 24; k++) { B[0][k] = j.inv[0][0] * gx[k] + j.inv[0][1] * ge[k]; B[1][k] = j.inv[1][0] * gx[k] + j.inv[1][1] * ge[k]; }
    return { B, det: j.det }; };
  const btdb = (K, B, D, f) => { const n = B.length; for (let a = 0; a < 24; a++) for (let b = a; b < 24; b++) { let s = 0; for (let i = 0; i < n; i++) { const Bi = B[i][a]; if (!Bi) continue; for (let k = 0; k < n; k++) s += Bi * D[i][k] * B[k][b]; } if (s) { K[a * 24 + b] += s * f; if (a !== b) K[b * 24 + a] += s * f; } } };

  /* ---------- eleman rijitliği (global) ---------- */
  const elemK = (X, t, E, nu) => {
    const F = cerceve(X), xl = F.xl, Kl = new Float64Array(576);
    const Dm = E * t / (1 - nu * nu), Db = E * t * t * t / 12 / (1 - nu * nu), Gs = 5 / 6 * E / (2 * (1 + nu)) * t;
    const DM = [[Dm, nu * Dm, 0], [nu * Dm, Dm, 0], [0, 0, Dm * (1 - nu) / 2]], DB = [[Db, nu * Db, 0], [nu * Db, Db, 0], [0, 0, Db * (1 - nu) / 2]], DS = [[Gs, 0], [0, Gs]];
    let A = 0;
    for (const x of GP) for (const y of GP) { const m = Bmem(xl, x, y), b = Bbend(xl, x, y), s = Bshear(xl, x, y); btdb(Kl, m.B, DM, m.det); btdb(Kl, b.B, DB, b.det); btdb(Kl, s.B, DS, s.det); A += m.det; }
    const kd = 1e-4 * E * t * A; for (let i = 0; i < 4; i++) Kl[(6 * i + 5) * 25] += kd;
    // dönüşüm: Kg = Tᵀ Kl T , T = blok(R), R satırları e1 e2 e3
    const R = [F.e1, F.e2, F.e3], Kg = new Float64Array(576), tmp = new Float64Array(576);
    for (let a = 0; a < 24; a++) for (let B2 = 0; B2 < 8; B2++) for (let q = 0; q < 3; q++) { let s = 0; for (let k = 0; k < 3; k++) s += Kl[a * 24 + B2 * 3 + k] * R[k][q]; tmp[a * 24 + B2 * 3 + q] = s; }
    for (let A2 = 0; A2 < 8; A2++) for (let p = 0; p < 3; p++) for (let b = 0; b < 24; b++) { let s = 0; for (let k = 0; k < 3; k++) s += R[k][p] * tmp[(A2 * 3 + k) * 24 + b]; Kg[(A2 * 3 + p) * 24 + b] = s; }
    return { Kg, F, A };
  };

  /* ---------- iç kuvvetler (yerel, düğümlerde): M11 M22 M12 , N11 N22 N12 , V13 V23 ---------- */
  const elemKuvvet = (X, t, E, nu, ug) => {
    const F = cerceve(X), xl = F.xl, R = [F.e1, F.e2, F.e3], ul = new Float64Array(24);
    for (let i = 0; i < 8; i++) for (let p = 0; p < 3; p++) { let s = 0; for (let k = 0; k < 3; k++) s += R[p][k] * ug[i * 3 + k]; ul[i * 3 + p] = s; }
    const Dm = E * t / (1 - nu * nu), Db = E * t * t * t / 12 / (1 - nu * nu), Gs = 5 / 6 * E / (2 * (1 + nu)) * t, out = [];
    const ev = (B) => B.map(r => { let s = 0; for (let k = 0; k < 24; k++) s += r[k] * ul[k]; return s; });
    for (let i = 0; i < 4; i++) {
      const x = XI[i] * 0.999, y = ET[i] * 0.999, em = ev(Bmem(xl, x, y).B), kb = ev(Bbend(xl, x, y).B), gs = ev(Bshear(xl, 0, 0).B); // kayma merkezde (MITC)
      out.push({ N11: Dm * (em[0] + nu * em[1]), N22: Dm * (em[1] + nu * em[0]), N12: Dm * (1 - nu) / 2 * em[2],
        M11: -Db * (kb[0] + nu * kb[1]), M22: -Db * (kb[1] + nu * kb[0]), M12: -Db * (1 - nu) / 2 * kb[2], V13: Gs * gs[0], V23: Gs * gs[1] });
    }
    return out;
  };

  /* ---------- 3B ÇUBUK (kolon / kiriş) — Euler–Bernoulli, 12 serbestlik ----------
     Yerel eksenler: 1 = çubuk ekseni, 2 = güçlü eğilmede yer değiştirme yönü (perde normali / düşey), 3 = 1×2.
     Kesit: A, I3 (2 yönünde yer değiştirmeye karşı, M3), I2 (3 yönünde, M2), J. Perdeye / döşemeye gömülü elemanlarda
     yalnız perde / döşeme dışına taşan kısım (kaburga) alınır, eğilme rijitliği orta düzleme göre (paralel eksen). */
  const cubukEksen = (A, B, ref) => { const e1 = nrm(sub(B, A)); let r = sub(ref, mul(e1, dot(ref, e1))); if (Math.hypot(...r) < 1e-6) r = Math.abs(e1[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]; const e2 = nrm(sub(r, mul(e1, dot(r, e1)))); return [e1, e2, cross(e1, e2)]; };
  const cubukKl = (L, E, G, s) => { // yerel 12×12 (u1 u2 u3 θ1 θ2 θ3 | j ucu)
    const K = new Float64Array(144), k = (i, j, v) => { K[i * 12 + j] += v; if (i !== j) K[j * 12 + i] += v; };
    const a = E * s.A / L, t = G * s.J / L; k(0, 0, a); k(6, 6, a); k(0, 6, -a); k(3, 3, t); k(9, 9, t); k(3, 9, -t);
    const b3 = E * s.I3, L2 = L * L, L3 = L2 * L; // 1–2 düzlemi (u2, θ3)
    k(1, 1, 12 * b3 / L3); k(7, 7, 12 * b3 / L3); k(1, 7, -12 * b3 / L3); k(1, 5, 6 * b3 / L2); k(1, 11, 6 * b3 / L2); k(7, 5, -6 * b3 / L2); k(7, 11, -6 * b3 / L2); k(5, 5, 4 * b3 / L); k(11, 11, 4 * b3 / L); k(5, 11, 2 * b3 / L);
    const b2 = E * s.I2; // 1–3 düzlemi (u3, θ2)
    k(2, 2, 12 * b2 / L3); k(8, 8, 12 * b2 / L3); k(2, 8, -12 * b2 / L3); k(2, 4, -6 * b2 / L2); k(2, 10, -6 * b2 / L2); k(8, 4, 6 * b2 / L2); k(8, 10, 6 * b2 / L2); k(4, 4, 4 * b2 / L); k(10, 10, 4 * b2 / L); k(4, 10, 2 * b2 / L);
    return K; };
  const cubukKg = (X, E, nu, s, ref) => { const L = Math.hypot(...sub(X[1], X[0])), R = cubukEksen(X[0], X[1], ref), Kl = cubukKl(L, E, E / 2 / (1 + nu), s), Kg = new Float64Array(144), tmp = new Float64Array(144);
    for (let a = 0; a < 12; a++) for (let B2 = 0; B2 < 4; B2++) for (let q = 0; q < 3; q++) { let v = 0; for (let k = 0; k < 3; k++) v += Kl[a * 12 + B2 * 3 + k] * R[k][q]; tmp[a * 12 + B2 * 3 + q] = v; }
    for (let A2 = 0; A2 < 4; A2++) for (let p = 0; p < 3; p++) for (let b = 0; b < 12; b++) { let v = 0; for (let k = 0; k < 3; k++) v += R[k][p] * tmp[(A2 * 3 + k) * 12 + b]; Kg[(A2 * 3 + p) * 12 + b] = v; }
    return { Kg, Kl, R, L }; };
  // düzgün yayılı yük ql (yerel, kN/m) için eşdeğer düğüm yükleri (yerel 12)
  const cubukFeq = (L, q) => [q[0] * L / 2, q[1] * L / 2, q[2] * L / 2, 0, -q[2] * L * L / 12, q[1] * L * L / 12, q[0] * L / 2, q[1] * L / 2, q[2] * L / 2, 0, q[2] * L * L / 12, -q[1] * L * L / 12];
  /* kaburga kesiti: genişlik w (levhaya paralel), levha orta düzlemine dik yönde [y0, y1] aralığı; levha [−t/2, t/2] içindeki kısım düşülür */
  P.kaburgaKesit = (w, y0, y1, t) => {
    const pr = []; if (y0 < -t / 2) pr.push([y0, Math.min(y1, -t / 2)]); if (y1 > t / 2) pr.push([Math.max(y0, t / 2), y1]);
    const hD = pr.reduce((s, [a, b]) => s + (b - a), 0); if (!(hD > 1e-4)) return null;
    const I3 = w * pr.reduce((s, [a, b]) => s + (b ** 3 - a ** 3) / 3, 0), hm = Math.max(...pr.map(([a, b]) => b - a)), mn = Math.min(w, hm), mx = Math.max(w, hm);
    return { A: w * hD, I3, I2: hD * w ** 3 / 12, J: mn ** 3 * mx * (1 / 3 - 0.21 * mn / mx * (1 - mn ** 4 / 12 / mx ** 4)), hD };
  };
  P.dikdortgenKesit = (b, h) => { const mn = Math.min(b, h), mx = Math.max(b, h); return { A: b * h, I3: b * h ** 3 / 12, I2: h * b ** 3 / 12, J: mn ** 3 * mx * (1 / 3 - 0.21 * mn / mx * (1 - mn ** 4 / 12 / mx ** 4)) }; };

  /* ---------- seyrek (skyline) LDLᵀ — Bathe COLSOL ---------- */
  function Skyline(n, colMin) { // colMin[j]: j sütununda ilk sıfırdan farklı satır (üst üçgen)
    const ptr = new Float64Array(n + 1); for (let j = 0; j < n; j++) ptr[j + 1] = ptr[j] + (j - colMin[j] + 1);
    const top = ptr[n]; if (top > 9e7) throw new Error(`Rijitlik matrisi çok büyük (${Math.round(top / 1e6)} M terim) — ağ aralığını büyütün.`);
    this.n = n; this.m = colMin; this.p = ptr; this.a = new Float64Array(top);
  }
  Skyline.prototype.add = function (i, j, v) { if (i > j) { const t = i; i = j; j = t; } if (i < this.m[j]) throw new Error('profil dışı'); this.a[this.p[j] + (i - this.m[j])] += v; };
  Skyline.prototype.diag = function (j) { return this.a[this.p[j] + (j - this.m[j])]; };
  Skyline.prototype.factor = function () {
    const n = this.n, m = this.m, p = this.p, a = this.a;
    for (let j = 0; j < n; j++) {
      const mj = m[j], pj = p[j] - mj; // a[pj + i] = K(i,j)
      for (let i = mj + 1; i < j; i++) { const mi = m[i], pi = p[i] - mi, k0 = Math.max(mi, mj); let s = 0; for (let k = k0; k < i; k++) s += a[pi + k] * a[pj + k]; a[pj + i] -= s; }
      let d = a[pj + j]; for (let i = mj; i < j; i++) { const pii = p[i] - m[i] + i, gji = a[pj + i]; const l = gji / a[pii]; d -= l * gji; a[pj + i] = l; }
      if (!(d > 0)) { if (d === 0 || !isFinite(d)) throw new Error('Rijitlik matrisi tekil (serbestlik ' + j + ') — mesnet / bağlantı eksik.'); }
      a[pj + j] = d;
    }
  };
  Skyline.prototype.solve = function (b) {
    const n = this.n, m = this.m, p = this.p, a = this.a, x = Float64Array.from(b);
    for (let j = 0; j < n; j++) { const pj = p[j] - m[j]; let s = 0; for (let i = m[j]; i < j; i++) s += a[pj + i] * x[i]; x[j] -= s; }
    for (let j = 0; j < n; j++) x[j] /= a[p[j] - m[j] + j];
    for (let j = n - 1; j >= 0; j--) { const pj = p[j] - m[j], xj = x[j]; for (let i = m[j]; i < j; i++) x[i] -= a[pj + i] * xj; }
    return x;
  };

  /* ---------- ters Cuthill–McKee ---------- */
  const rcm = (nn, adj) => {
    const deg = adj.map(s => s.size), perm = [], seen = new Uint8Array(nn);
    const bfs = s => { const lv = new Int32Array(nn).fill(-1), q = [s]; lv[s] = 0; let last = s; for (let h = 0; h < q.length; h++) { const u = q[h]; last = u; for (const v of adj[u]) if (lv[v] < 0) { lv[v] = lv[u] + 1; q.push(v); } } return { last, q }; };
    for (let s0 = 0; s0 < nn; s0++) { if (seen[s0]) continue; let s = s0; for (let it = 0; it < 2; it++) s = bfs(s).last; // çevresel düğüm
      const q = [s]; seen[s] = 1; for (let h = 0; h < q.length; h++) { const u = q[h]; perm.push(u); const ns = [...adj[u]].filter(v => !seen[v]).sort((x, y) => deg[x] - deg[y]); for (const v of ns) { seen[v] = 1; q.push(v); } } }
    perm.reverse(); const inv = new Int32Array(nn); perm.forEach((u, i) => { inv[u] = i; }); return inv;
  };

  /* ================= MODEL → AĞ ================= */
  // M: { walls:[{ad, pts:[[x,y]..], kapali, t, zt, tip:'dis'|'ic', bolme}], radye:{pts, t, kAlt}, dosemeler:[{ad, pts, t, zt, g, q}] }
  P.kabukAg = (M, o) => {
    const h = o.h, rad = M.radye, zr = rad.kAlt + rad.t / 2;
    const nodes = [], key = new Map(), els = [], ties = [];
    const nod = (x, y, z) => { const k = Math.round(x * 200) + ',' + Math.round(y * 200) + ',' + Math.round(z * 200); let i = key.get(k); if (i == null) { i = nodes.length; nodes.push([x, y, z]); key.set(k, i); } return i; };
    // perde uçlarını komşu perde eksenine uzat / kesişim noktalarını kaydet
    const W = M.walls.map(w => ({ ...w, P: w.pts.map(p => [p[0], p[1]]), kir: [] }));
    const projSeg = (q, a, b) => { const d = [b[0] - a[0], b[1] - a[1]], L2 = d[0] * d[0] + d[1] * d[1] || 1, u = Math.max(0, Math.min(1, ((q[0] - a[0]) * d[0] + (q[1] - a[1]) * d[1]) / L2)); const r = [a[0] + d[0] * u, a[1] + d[1] * u]; return { r, d: Math.hypot(r[0] - q[0], r[1] - q[1]), u }; };
    for (const w of W) { if (w.kapali) continue;
      for (const uc of [0, 1]) { const q = uc ? w.P[w.P.length - 1] : w.P[0]; let best = null;
        for (const v of W) { if (v === w) continue; const n = v.kapali ? v.P.length : v.P.length - 1; for (let i = 0; i < n; i++) { const a = v.P[i], b = v.P[(i + 1) % v.P.length], pr = projSeg(q, a, b); if (pr.d < (v.t + w.t) / 2 + 0.15 && (!best || pr.d < best.d)) best = { v, i, r: pr.r, d: pr.d }; } }
        if (best) { let r = best.r; const a = best.v.P[best.i], b = best.v.P[(best.i + 1) % best.v.P.length]; if (Math.hypot(r[0] - a[0], r[1] - a[1]) < 0.02) r = a.slice(); else if (Math.hypot(r[0] - b[0], r[1] - b[1]) < 0.02) r = b.slice(); else best.v.kir.push({ i: best.i, r });
          if (uc) w.P[w.P.length - 1] = r; else w.P[0] = r; } } }
    /* kolonlar (M.kolonlar: x, y merkez, bx / by ya da D, z0, zt): perde ekseninden (t + kolon derinliği)/2 içinde olan kolon
       o perdeye gömülüdür — perde ağına o noktada düşey düğüm sırası açılır, perde dışına taşan kısmı kaburga çubuk olur
       (perdeyi düşeyde taşır). Perdeye değmeyen kolon tam kesitli serbest düşey çubuktur (radyeye, varsa üstteki döşemeye bağlı). */
    const KOL = [];
    for (const c of (M.kolonlar || [])) {
      const bx = c.D ? c.D : +c.bx || 0.4, by = c.D ? c.D : +c.by || 0.4, q = [c.x, c.y]; let best = null;
      for (const w of W) { const n = w.kapali ? w.P.length : w.P.length - 1;
        for (let i = 0; i < n; i++) { const a = w.P[i], b = w.P[(i + 1) % w.P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue;
          const u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], nv = [-u[1], u[0]], s = (q[0] - a[0]) * u[0] + (q[1] - a[1]) * u[1], off = (q[0] - a[0]) * nv[0] + (q[1] - a[1]) * nv[1];
          const boy = Math.abs(u[0]) * bx + Math.abs(u[1]) * by, dik = Math.abs(nv[0]) * bx + Math.abs(nv[1]) * by;
          if (s < -boy / 2 || s > L + boy / 2 || Math.abs(off) > (w.t + dik) / 2 - 0.01) continue;
          if (!best || Math.abs(off) < Math.abs(best.off)) best = { w, i, s: Math.max(0, Math.min(L, s)), L, a, u, nv, off, boy, dik }; } }
      if (best) { const { w, i, s, L, a, u } = best; let r = [a[0] + u[0] * s, a[1] + u[1] * s];
        if (s < 0.05) r = a.slice(); else if (s > L - 0.05) r = w.P[(i + 1) % w.P.length].slice(); else w.kir.push({ i, r });
        best.r = r; }
      KOL.push({ c, bx, by, g: best });
    }
    // döşemeler altındaki perdelerin üst kotu = döşeme orta düzlemi
    const pip = (q, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    const dos = (M.dosemeler || []).map(d => ({ ...d, zm: d.zt - d.t / 2 }));
    // döşeme kenarı çoğunlukla perde iç yüzündedir: perde ekseni döşeme poligonunun dışında kalır — perde yarı kalınlığı (+10 cm) kadar yakınlık yeterli
    const polyUz = (q, poly) => { let m = Infinity; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; m = Math.min(m, projSeg(q, a, b).d); } return m; };
    const dosta = (q, d0, w) => pip(q, d0.pts) || polyUz(q, d0.pts) <= w.t / 2 + 0.1;
    const segOrnek = w => { const out = []; const n = w.kapali ? w.P.length : w.P.length - 1; for (let i = 0; i < n; i++) { const a = w.P[i], b = w.P[(i + 1) % w.P.length]; for (let k = 0; k <= 10; k++) out.push([a[0] + (b[0] - a[0]) * k / 10, a[1] + (b[1] - a[1]) * k / 10]); } return out; };
    for (const w of W) { const d = dos.find(d0 => Math.abs(d0.zt - w.zt) < d0.t + 0.05 && segOrnek(w).some(p => dosta(p, d0, w))); w.ztm = d ? d.zm : w.zt; w.dos = d || null; }
    // kot seviyeleri
    const lv = new Set([zr]); for (const w of W) lv.add(+w.ztm.toFixed(4)); for (const z of (o.kotlar || [])) if (z > zr && z < Math.max(...W.map(w => w.ztm))) lv.add(+z.toFixed(4));
    const L0 = [...lv].sort((a, b) => a - b), duvarUst = new Set(W.map(w => +w.ztm.toFixed(4))), L1 = [L0[0]];
    for (let i = 1; i < L0.length; i++) { const z = L0[i]; if (z - L1[L1.length - 1] < 0.3 * h && !duvarUst.has(z)) continue; if (z - L1[L1.length - 1] < 0.3 * h && L1.length > 1 && !duvarUst.has(L1[L1.length - 1])) L1.pop(); L1.push(z); }
    const Z = [L1[0]]; for (let i = 1; i < L1.length; i++) { const d = L1[i] - L1[i - 1], n = Math.max(1, Math.round(d / h)); for (let k = 1; k <= n; k++) Z.push(L1[i - 1] + d * k / n); }
    // perde ağı
    const wallEls = [];
    W.forEach((w, wi) => {
      const n = w.kapali ? w.P.length : w.P.length - 1, S = []; // boy boyunca noktalar
      for (let i = 0; i < n; i++) { const a = w.P[i], b = w.P[(i + 1) % w.P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue;
        const ek = w.kir.filter(k => k.i === i).map(k => Math.hypot(k.r[0] - a[0], k.r[1] - a[1]) / L).filter(u => u > 1e-4 && u < 1 - 1e-4);
        const us = [0, ...ek, 1].sort((x, y) => x - y), pts = [0];
        for (let k = 1; k < us.length; k++) { const du = (us[k] - us[k - 1]) * L, m = Math.max(1, Math.round(du / h)); for (let s = 1; s <= m; s++) pts.push(us[k - 1] + (us[k] - us[k - 1]) * s / m); }
        for (let k = (S.length ? 1 : 0); k < pts.length; k++) { const u = pts[k]; S.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); } }
      if (w.kapali && S.length > 2 && Math.hypot(S[0][0] - S[S.length - 1][0], S[0][1] - S[S.length - 1][1]) < 1e-6) S.pop();
      const zs = Z.filter(z => z <= w.ztm + 1e-6), ns = w.kapali ? S.length : S.length - 1;
      for (let i = 0; i < ns; i++) { const a = S[i], b = S[(i + 1) % S.length];
        for (let k = 0; k < zs.length - 1; k++) { const e = { n: [nod(a[0], a[1], zs[k]), nod(b[0], b[1], zs[k]), nod(b[0], b[1], zs[k + 1]), nod(a[0], a[1], zs[k + 1])], t: w.tt != null ? w.t + (w.tt - w.t) * Math.max(0, Math.min(1, ((zs[k] + zs[k + 1]) / 2 - (rad.kAlt + rad.t)) / Math.max(0.1, w.zt - (rad.kAlt + rad.t)))) : w.t, grp: 'W' + wi, wi, tur: 'perde' }; els.push(e); wallEls.push(e); } }
      w.S = S; w.zs = zs;
    });
    // radye ağı (X/Y düzgün ızgara, merkezi poligon içindeki hücreler)
    const izgara = (poly, z, t, grp, tur) => {
      const xs0 = poly.map(p => p[0]), ys0 = poly.map(p => p[1]), x0 = Math.min(...xs0), x1 = Math.max(...xs0), y0 = Math.min(...ys0), y1 = Math.max(...ys0);
      const nx = Math.max(1, Math.round((x1 - x0) / h)), ny = Math.max(1, Math.round((y1 - y0) / h)), dx = (x1 - x0) / nx, dy = (y1 - y0) / ny, cell = new Map(), list = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const cx = x0 + (i + 0.5) * dx, cy = y0 + (j + 0.5) * dy; if (!pip([cx, cy], poly)) continue;
        const e = { n: [nod(x0 + i * dx, y0 + j * dy, z), nod(x0 + (i + 1) * dx, y0 + j * dy, z), nod(x0 + (i + 1) * dx, y0 + (j + 1) * dy, z), nod(x0 + i * dx, y0 + (j + 1) * dy, z)], t, grp, tur, ij: [i, j] }; els.push(e); list.push(e); cell.set(i + ',' + j, e); }
      return { x0, y0, dx, dy, nx, ny, cell, list, z, poly };
    };
    const RG = izgara(rad.pts, zr, rad.t, 'R', 'radye');
    const DG = dos.map((d, k) => izgara(d.pts, d.zm, d.t, 'D' + k, 'doseme'));
    const bagla = (s, grid) => { // s düğümünü grid elemanına bağla
      const p = nodes[s], fi = (p[0] - grid.x0) / grid.dx, fj = (p[1] - grid.y0) / grid.dy; let i = Math.min(grid.nx - 1, Math.max(0, Math.floor(fi))), j = Math.min(grid.ny - 1, Math.max(0, Math.floor(fj)));
      let e = grid.cell.get(i + ',' + j); if (!e) { let bd = Infinity; for (const c of grid.list) { const d = Math.hypot(c.ij[0] + 0.5 - fi, c.ij[1] + 0.5 - fj); if (d < bd) { bd = d; e = c; } } i = e.ij[0]; j = e.ij[1]; }
      const xi = Math.max(-1, Math.min(1, 2 * (fi - i) - 1)), et = Math.max(-1, Math.min(1, 2 * (fj - j) - 1)), N = shp(xi, et);
      for (let k = 0; k < 4; k++) if (e.n[k] === s) return; // zaten ortak düğüm
      ties.push({ s, m: e.n, N }); };
    const tabanD = new Set(), ustD = new Map();
    for (const w of W) { for (const q of w.S) tabanD.add(nod(q[0], q[1], zr)); if (w.dos) { const k = dos.indexOf(w.dos); for (const q of w.S) if (dosta(q, w.dos, w)) ustD.set(nod(q[0], q[1], w.ztm), k); } } // döşemenin olmadığı perde üstü (ör. boşluk kenarı) serbest kalır
    for (const s of tabanD) bagla(s, RG);
    for (const [s, k] of ustD) bagla(s, DG[k]);
    /* çubuklar: { n:[i,j], s: kesit, ref: güçlü eğilme yönü, ad, tur:'kolon'|'kiris', id } */
    const bars = [], uyarC = [];
    const cubuk = (i, j, s, ref, ad, tur, id) => { if (i !== j) bars.push({ n: [i, j], s, ref, ad, tur, id }); };
    // kolonlar
    const zUst = Math.max(...W.map(w => w.ztm));
    for (const K of KOL) { const c = K.c, ad = c.no || ('S' + (KOL.indexOf(K) + 1));
      if (K.g) { const { w, r, nv, off, boy, dik } = K.g, s = P.kaburgaKesit(boy, off - dik / 2, off + dik / 2, w.t); if (!s) continue; // perde içinde kalan kolon: perde zaten taşır
        const zs = w.zs.filter(z => z >= Math.max(zr, (+c.z0 || zr) - 0.3) - 1e-6 && z <= Math.min(w.ztm, c.zt != null ? +c.zt : w.ztm) + 1e-6);
        for (let k = 0; k + 1 < zs.length; k++) cubuk(nod(r[0], r[1], zs[k]), nod(r[0], r[1], zs[k + 1]), s, [nv[0], nv[1], 0], ad, 'kolon', c.id);
        K.gomulu = w.ad || true; continue; }
      const z1 = Math.min(zUst, c.zt != null ? +c.zt : zUst), zs = Z.filter(z => z <= z1 + 1e-6); if (zs.length < 2) continue; const s = c.D ? (() => { const r2 = c.D / 2, I = Math.PI * r2 ** 4 / 4; return { A: Math.PI * r2 * r2, I3: I, I2: I, J: 2 * I }; })() : P.dikdortgenKesit(K.bx, K.by);
      const ids = zs.map(z => nod(c.x, c.y, z)); for (let k = 0; k + 1 < ids.length; k++) cubuk(ids[k], ids[k + 1], s, [1, 0, 0], ad, 'kolon', c.id);
      K.bagT = ids[0]; K.bagU = ids[ids.length - 1]; K.zU = zs[zs.length - 1]; }
    /* döşeme altındaki kirişler: o.kirisRijit → eski kabul (eksen düğümleri rijit düşey mesnet); aksi halde kiriş, döşeme altına sarkan gövdesiyle
       döşemeye bağlı çubuk (kaburga): kiriş + kolon esnekliği hesaba girer */
    const mes = new Set(), kirisDug = [];
    for (const kb of (M.kirisler || [])) { let bulundu = false; DG.forEach((g, k) => { const d = dos[k]; if (bulundu || !(kb.zt <= d.zt + 0.15 && kb.zt >= d.zt - d.t - 0.15)) return; const a = kb.a, b = kb.b, dd = [b[0] - a[0], b[1] - a[1]], L2 = dd[0] * dd[0] + dd[1] * dd[1] || 1, tol = Math.max(g.dx, g.dy) * 0.51;
      if (o.kirisRijit) { for (const e of g.list) for (const n of e.n) { const p = nodes[n], u = ((p[0] - a[0]) * dd[0] + (p[1] - a[1]) * dd[1]) / L2; if (u < -0.02 || u > 1.02) continue; if (Math.hypot(a[0] + dd[0] * u - p[0], a[1] + dd[1] * u - p[1]) <= tol) mes.add(n); } bulundu = true; return; }
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if (!pip(m, d.pts) && !g.list.some(e => e.n.some(n => Math.hypot(nodes[n][0] - m[0], nodes[n][1] - m[1]) < tol * 1.5))) return;
      const hb = +kb.hb || 0.5, bw = +kb.bw || 0.3, s = P.kaburgaKesit(bw, -(d.zm - (kb.zt - hb)), kb.zt - d.zm, d.t); bulundu = true; if (!s) return; // döşeme kalınlığında kiriş: döşeme taşır
      const L = Math.sqrt(L2), nb = Math.max(1, Math.round(L / h)), ids = []; for (let j = 0; j <= nb; j++) ids.push(nod(a[0] + dd[0] * j / nb, a[1] + dd[1] * j / nb, d.zm));
      for (let j = 0; j < nb; j++) cubuk(ids[j], ids[j + 1], s, [0, 0, 1], kb.no || ('K' + ((M.kirisler || []).indexOf(kb) + 1)), 'kiris', kb.id);
      ids.forEach(n => kirisDug.push([n, k])); });
      if (!bulundu) uyarC.push(`${kb.no || 'Kiriş'} (üst ${kb.zt}) kabuk modelinde bir döşemenin altında değil — kabuk hesabına alınmadı.`); }
    for (const [n, k] of kirisDug) bagla(n, DG[k]);
    // serbest kolonların taban / üst bağları
    for (const K of KOL) { if (K.bagT == null) continue; bagla(K.bagT, RG); const k = dos.findIndex(d => Math.abs(d.zm - K.zU) < 0.05 && pip([K.c.x, K.c.y], d.pts)); if (k >= 0) bagla(K.bagU, DG[k]); }
    const gomulu = KOL.filter(K => K.gomulu).length; if (KOL.length) uyarC.push(`Kabuk modeli: ${KOL.length} kolon (${gomulu} perde içinde kaburga, ${KOL.length - gomulu - KOL.filter(K => K.g && !K.gomulu).length} serbest), ${new Set(bars.filter(b => b.tur === 'kiris').map(b => b.ad)).size} kiriş çubuk eleman olarak alındı.`);
    for (const e of els) e.F = cerceve(e.n.map(i => nodes[i]));
    return { nodes, els, ties, W, RG, DG, Z, zr, h, mes, bars, uyarC };
  };

  /* ================= ÇÖZÜM ================= */
  // yukler: { ad: (e, X[4], F) → her Gauss noktası için traksiyon vektörü fonksiyonu (p:[x,y,z]) → [fx,fy,fz] kN/m² } ya da null
  P.kabukCoz = (AG, o, yukler, ilerle) => {
    const { nodes, els, ties } = AG, nn = nodes.length, E = o.E, nu = o.nu;
    // komşuluk (eleman + bağ)
    const adj = Array.from({ length: nn }, () => new Set()); const bagl = (arr) => { for (const a of arr) for (const b of arr) if (a !== b) adj[a].add(b); };
    const bars = AG.bars || [];
    for (const e of els) bagl(e.n); for (const t of ties) bagl([t.s, ...t.m]); for (const b of bars) bagl(b.n);
    const inv = rcm(nn, adj), N = nn * 6, colMin = new Int32Array(N);
    for (let i = 0; i < nn; i++) { let mn = inv[i]; for (const v of adj[i]) mn = Math.min(mn, inv[v]); for (let d = 0; d < 6; d++) colMin[inv[i] * 6 + d] = mn * 6; }
    const K = new Skyline(N, colMin), dof = (n, d) => inv[n] * 6 + d;
    let kmax = 0;
    for (const e of els) { const X = e.n.map(i => nodes[i]), r = elemK(X, e.t, E, nu); e.F = r.F; e.A = r.A;
      for (let a = 0; a < 24; a++) { const ga = dof(e.n[a / 6 | 0], a % 6); for (let b = a; b < 24; b++) { const v = r.Kg[a * 24 + b]; if (v) K.add(ga, dof(e.n[b / 6 | 0], b % 6), v); } kmax = Math.max(kmax, Math.abs(r.Kg[a * 25])); } }
    // çubuklar (kolon / kiriş kaburgaları)
    for (const br of bars) { const X = br.n.map(i => nodes[i]), r = cubukKg(X, E, nu, br.s, br.ref); br.R = r.R; br.L = r.L; br.Kl = r.Kl;
      for (let a = 0; a < 12; a++) { const ga = dof(br.n[a / 6 | 0], a % 6); for (let b = a; b < 12; b++) { const v = r.Kg[a * 12 + b]; if (v) K.add(ga, dof(br.n[b / 6 | 0], b % 6), v); } } }
    // Winkler yayları (radye) + küçük yatay yay
    const kz = o.kw; const trib = new Float64Array(nn); for (const e of els) if (e.tur === 'radye') for (const n of e.n) trib[n] += e.A / 4;
    for (let i = 0; i < nn; i++) if (trib[i] > 0) { K.add(dof(i, 2), dof(i, 2), kz * trib[i]); K.add(dof(i, 0), dof(i, 0), 1e-3 * kz * trib[i]); K.add(dof(i, 1), dof(i, 1), 1e-3 * kz * trib[i]); }
    // kiriş mesnetleri (döşeme): düşey rijit yay
    for (const n of (AG.mes || [])) K.add(dof(n, 2), dof(n, 2), 1e3 * kmax);
    // MPC ceza
    const alfa = 1e4 * kmax;
    for (const t of ties) { const ids = [t.s, ...t.m], c = [1, -t.N[0], -t.N[1], -t.N[2], -t.N[3]];
      for (let d = 0; d < 6; d++) for (let a = 0; a < 5; a++) for (let b = a; b < 5; b++) { const v = alfa * c[a] * c[b]; if (v) { const ga = dof(ids[a], d), gb = dof(ids[b], d); if (ga === gb && a !== b) K.add(ga, gb, 2 * v); else K.add(ga, gb, v); } } }
    // bağlı düğümün kendi rz'si (perde tabanında θz yerel burulma) zaten elemanda; tamamen boşta kalan dönme yok
    if (ilerle) ilerle('ayrıştırma', N, K.a.length);
    K.factor();
    // yükler
    const sonuc = {};
    for (const [ad, fn] of Object.entries(yukler)) {
      const b = new Float64Array(N);
      for (const e of els) { const tr = fn(e); if (!tr) continue; const X = e.n.map(i => nodes[i]), F = e.F;
        for (const x of GP) for (const y of GP) { const Nn = shp(x, y), j = jac(F.xl, x, y), p = [0, 0, 0]; for (let k = 0; k < 4; k++) for (let q = 0; q < 3; q++) p[q] += Nn[k] * X[k][q]; const f = tr(p); if (!f) continue;
          for (let k = 0; k < 4; k++) for (let q = 0; q < 3; q++) b[dof(e.n[k], q)] += Nn[k] * f[q] * j.det; } }
      // çubuk yükleri: o.cubukYuk(durum, çubuk) → düzgün yayılı [qx, qy, qz] kN/m (global); eşdeğer düğüm yükü (kuvvet + moment)
      if (o.cubukYuk) for (const br of bars) { const qg = o.cubukYuk(ad, br); if (!qg) continue; const ql = br.R.map(r => dot(r, qg)), fe = cubukFeq(br.L, ql); br.q = br.q || {}; br.q[ad] = ql;
        for (let u = 0; u < 2; u++) for (let t = 0; t < 2; t++) for (let p = 0; p < 3; p++) { let v = 0; for (let k = 0; k < 3; k++) v += br.R[k][p] * fe[u * 6 + t * 3 + k]; b[dof(br.n[u], t * 3 + p)] += v; } }
      const u = K.solve(b), U = new Float64Array(N); for (let i = 0; i < nn; i++) for (let d = 0; d < 6; d++) U[i * 6 + d] = u[dof(i, d)];
      sonuc[ad] = U;
    }
    return { sonuc, N, prof: K.a.length };
  };

  /* eleman düğüm kuvvetleri (bir yer değiştirme vektörü için) */
  P.kabukKuvvet = (AG, o, U) => AG.els.map(e => { const X = e.n.map(i => AG.nodes[i]), ug = new Float64Array(24); for (let k = 0; k < 4; k++) for (let d = 0; d < 6; d++) ug[k * 6 + d] = U[e.n[k] * 6 + d]; return elemKuvvet(X, e.t, o.E, o.nu, ug); });
  /* çubuk uç kuvvetleri (yerel): [N, V2, V3, T, M2, M3] i ucu ve j ucu — uç kuvveti = Kl·u − eşdeğer yük (i ucunda işaret ters: iç kuvvet) */
  P.kabukCubukKuvvet = (AG, U, durum) => (AG.bars || []).map(br => { const ul = new Float64Array(12);
    for (let u = 0; u < 2; u++) for (let t = 0; t < 2; t++) for (let p = 0; p < 3; p++) { let v = 0; for (let k = 0; k < 3; k++) v += br.R[p][k] * U[br.n[u] * 6 + t * 3 + k]; ul[u * 6 + t * 3 + p] = v; }
    const fe = br.q && br.q[durum] ? cubukFeq(br.L, br.q[durum]) : null, f = new Float64Array(12); for (let a = 0; a < 12; a++) { let v = 0; for (let b = 0; b < 12; b++) v += br.Kl[a * 12 + b] * ul[b]; f[a] = v - (fe ? fe[a] : 0); }
    // iç kuvvet işareti: i ucunda −f, j ucunda +f (çekme +, M pozitif yerel eksen etrafında)
    return [-f[0], -f[1], -f[2], -f[3], -f[4], -f[5], f[6], f[7], f[8], f[9], f[10], f[11]]; });
  P._kabukIc = { cubukKl, cubukKg, cubukFeq, elemK, elemKuvvet, cerceve, Skyline, rcm, shp };
})(typeof window !== 'undefined' ? window : globalThis);

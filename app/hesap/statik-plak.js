/* ArıtmaCAD — STATİK: dikdörtgen plak sonlu eleman çözücüsü
   Eleman: ACM (Adini-Clough-Melosh) 12 serbestlikli dikdörtgen plak (düğümde w, ∂w/∂x, ∂w/∂y)
   Destek: Winkler yayı (radye), kenar koşulları A=ankastre, M=mafsallı, S=serbest
   Birimler: kN, m. Çözüm: bant Cholesky (bir kez ayrıştır, çok yükleme çöz).
   İşaret: w plak normali yönünde (+). M>0 → +w yüzünde çekme. */
(function (G) {
  'use strict';
  const P = G.STATIK = G.STATIK || {};

  /* ---- 12 terimli polinom ve türevleri ---- */
  const poly = (x, y) => [1, x, y, x * x, x * y, y * y, x * x * x, x * x * y, x * y * y, y * y * y, x * x * x * y, x * y * y * y];
  const polyX = (x, y) => [0, 1, 0, 2 * x, y, 0, 3 * x * x, 2 * x * y, y * y, 0, 3 * x * x * y, y * y * y];
  const polyY = (x, y) => [0, 0, 1, 0, x, 2 * y, 0, x * x, 2 * x * y, 3 * y * y, x * x * x, 3 * x * y * y];
  const polyXX = (x, y) => [0, 0, 0, 2, 0, 0, 6 * x, 2 * y, 0, 0, 6 * x * y, 0];
  const polyYY = (x, y) => [0, 0, 0, 0, 0, 2, 0, 0, 2 * x, 6 * y, 0, 6 * x * y];
  const polyXY = (x, y) => [0, 0, 0, 0, 1, 0, 0, 2 * x, 2 * y, 0, 3 * x * x, 3 * y * y];

  function inv(A) {
    const n = A.length, M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      const d = M[c][c]; if (Math.abs(d) < 1e-14) throw new Error('Tekil matris');
      for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f) for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; }
    }
    return M.map(r => r.slice(n));
  }
  const GP = { 3: [[-Math.sqrt(0.6), 5 / 9], [0, 8 / 9], [Math.sqrt(0.6), 5 / 9]], 4: [[-0.8611363115940526, 0.3478548451374538], [-0.3399810435848563, 0.6521451548625461], [0.3399810435848563, 0.6521451548625461], [0.8611363115940526, 0.3478548451374538]] };

  /* eleman tanımı (a×b) önbellekli */
  const cache = new Map();
  function elemDef(a, b) {
    const key = a.toFixed(6) + 'x' + b.toFixed(6);
    if (cache.has(key)) return cache.get(key);
    const nodes = [[0, 0], [a, 0], [a, b], [0, b]], A = [];
    for (const [x, y] of nodes) { A.push(poly(x, y)); A.push(polyX(x, y)); A.push(polyY(x, y)); }
    const Ci = inv(A); // katsayı = Ci · u
    const mulC = row => { const out = new Array(12).fill(0); for (let i = 0; i < 12; i++) { let s = 0; for (let j = 0; j < 12; j++) s += row[j] * Ci[j][i]; out[i] = s; } return out; };
    const N = (x, y) => mulC(poly(x, y));
    const B = (x, y) => [mulC(polyXX(x, y)), mulC(polyYY(x, y)), mulC(polyXY(x, y))]; // w_xx, w_yy, w_xy
    // birim D için rijitlik bileşenleri (ν'ye göre ayrık): K = K1 + ν·Kν
    const K1 = Array.from({ length: 12 }, () => new Array(12).fill(0)), Kn = Array.from({ length: 12 }, () => new Array(12).fill(0)), Kw = Array.from({ length: 12 }, () => new Array(12).fill(0));
    for (const [gx, wx] of GP[3]) for (const [gy, wy] of GP[3]) {
      const x = (gx + 1) * a / 2, y = (gy + 1) * b / 2, w = wx * wy * a * b / 4;
      const [bxx, byy, bxy] = B(x, y), n = N(x, y);
      for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {
        // U = ½D[(wxx+wyy)² - 2(1-ν)(wxx wyy - wxy²)] → wxx²+wyy²+2wxy² + ν(2wxx wyy - 2wxy²)
        K1[i][j] += w * (bxx[i] * bxx[j] + byy[i] * byy[j] + 2 * bxy[i] * bxy[j]);
        Kn[i][j] += w * (bxx[i] * byy[j] + byy[i] * bxx[j] - 2 * bxy[i] * bxy[j]);
      }
    }
    for (const [gx, wx] of GP[4]) for (const [gy, wy] of GP[4]) {
      const x = (gx + 1) * a / 2, y = (gy + 1) * b / 2, w = wx * wy * a * b / 4, n = N(x, y);
      for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) Kw[i][j] += w * n[i] * n[j];
    }
    const d = { a, b, N, B, K1, Kn, Kw };
    cache.set(key, d); return d;
  }

  /* ---- bant simetrik matris (alt üçgen, satır i: j = i-bw..i) ---- */
  function Band(n, bw) { this.n = n; this.bw = bw; this.a = new Float64Array(n * (bw + 1)); }
  Band.prototype.idx = function (i, j) { if (j > i) [i, j] = [j, i]; const k = i - j; if (k > this.bw) return -1; return i * (this.bw + 1) + (this.bw - k); };
  Band.prototype.add = function (i, j, v) { const k = this.idx(i, j); if (k < 0) throw new Error('bant dışı'); this.a[k] += v; };
  Band.prototype.chol = function () {
    const { n, bw, a } = this, W = bw + 1;
    for (let i = 0; i < n; i++) {
      const j0 = Math.max(0, i - bw);
      for (let j = j0; j <= i; j++) {
        let s = a[i * W + (bw - (i - j))];
        const k0 = Math.max(j0, j - bw);
        for (let k = k0; k < j; k++) s -= a[i * W + (bw - (i - k))] * a[j * W + (bw - (j - k))];
        if (i === j) { if (s <= 0) throw new Error('Rijitlik matrisi pozitif tanımlı değil (mesnet yetersiz?) düğüm dof ' + i); a[i * W + bw] = Math.sqrt(s); }
        else a[i * W + (bw - (i - j))] = s / a[j * W + bw];
      }
    }
  };
  Band.prototype.solve = function (b) {
    const { n, bw, a } = this, W = bw + 1, y = Float64Array.from(b);
    for (let i = 0; i < n; i++) { let s = y[i]; for (let k = Math.max(0, i - bw); k < i; k++) s -= a[i * W + (bw - (i - k))] * y[k]; y[i] = s / a[i * W + bw]; }
    for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k <= Math.min(n - 1, i + bw); k++) s -= a[k * W + (bw - (k - i))] * y[k]; y[i] = s / a[i * W + bw]; }
    return y;
  };

  /* ızgara çizgileri: zorunlu koordinatlar + en fazla h aralık */
  P.gridLines = function (fixed, hmax) {
    const xs = [...new Set(fixed.map(v => Math.round(v * 1e6) / 1e6))].sort((p, q) => p - q), out = [xs[0]];
    for (let i = 1; i < xs.length; i++) { const L = xs[i] - xs[i - 1]; if (L < 1e-6) continue; const n = Math.max(1, Math.ceil(L / hmax - 1e-9)); for (let k = 1; k <= n; k++) out.push(xs[i - 1] + L * k / n); }
    return out;
  };

  /* ---- plak modeli ----
     opt: { xs:[...], ys:[...], t, E (kN/m²), nu, k (Winkler kN/m³, 0=yok), active(cx,cy)->bool (eleman var mı),
            bc: {B,T,L,R: 'A'|'M'|'S'} (dış kenarlar), fixNodes: [{i,j,dofs:[0,1,2]}] } */
  P.Plate = function (opt) {
    const { xs, ys } = opt, nx = xs.length, ny = ys.length, nn = nx * ny, ndof = nn * 3;
    const Dp = opt.E * opt.t ** 3 / (12 * (1 - opt.nu * opt.nu)), nu = opt.nu;
    const nid = (i, j) => j * nx + i;
    const elems = [];
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
      if (opt.active && !opt.active(cx, cy)) continue;
      const d = elemDef(xs[i + 1] - xs[i], ys[j + 1] - ys[j]);
      const ns = [nid(i, j), nid(i + 1, j), nid(i + 1, j + 1), nid(i, j + 1)];
      const dofs = []; ns.forEach(n => dofs.push(n * 3, n * 3 + 1, n * 3 + 2));
      elems.push({ i, j, x0: xs[i], y0: ys[j], d, ns, dofs });
    }
    const used = new Uint8Array(nn); elems.forEach(e => e.ns.forEach(n => used[n] = 1));
    const bw = 3 * (nx + 2);
    const K = new Band(ndof, bw);
    const fixed = new Uint8Array(ndof);
    for (let n = 0; n < nn; n++) if (!used[n]) fixed[n * 3] = fixed[n * 3 + 1] = fixed[n * 3 + 2] = 1;
    const fix = (i, j, dofs) => dofs.forEach(k => fixed[nid(i, j) * 3 + k] = 1);
    const bc = opt.bc || {};
    const edge = (side, type) => {
      if (!type || type === 'S') return;
      // A: w, wx, wy = 0 ; M: w = 0 ve kenar boyunca eğim (teğet) = 0
      if (side === 'B' || side === 'T') { const j = side === 'B' ? 0 : ny - 1; for (let i = 0; i < nx; i++) fix(i, j, type === 'A' ? [0, 1, 2] : [0, 1]); }
      else { const i = side === 'L' ? 0 : nx - 1; for (let j = 0; j < ny; j++) fix(i, j, type === 'A' ? [0, 1, 2] : [0, 2]); }
    };
    ['B', 'T', 'L', 'R'].forEach(s => edge(s, bc[s]));
    (opt.fixNodes || []).forEach(f => fix(f.i, f.j, f.dofs));
    for (const e of elems) {
      const { d, dofs } = e;
      for (let a = 0; a < 12; a++) for (let b = 0; b <= a; b++) {
        let v = Dp * (e.d.K1[a][b] + nu * e.d.Kn[a][b]);
        if (opt.k) v += opt.k * d.Kw[a][b];
        const I = dofs[a], J = dofs[b];
        if (fixed[I] || fixed[J]) continue;
        K.add(I, J, v);
      }
    }
    for (let i = 0; i < ndof; i++) if (fixed[i]) K.a[K.idx(i, i)] = 1;
    K.chol();
    const self = { xs, ys, nx, ny, nid, elems, Dp, nu, fixed, ndof, t: opt.t, k: opt.k || 0 };

    /* yük vektörü: p(x,y) yayılı (+w yönünde kN/m²), çizgisel/düğüm yükleri: nodal:[{n,dof,v}] */
    self.loadVec = function (L) {
      const f = new Float64Array(ndof);
      if (L.p) for (const e of elems) {
        const { d } = e;
        for (const [gx, wx] of GP[4]) for (const [gy, wy] of GP[4]) {
          const x = (gx + 1) * d.a / 2, y = (gy + 1) * d.b / 2, w = wx * wy * d.a * d.b / 4;
          const pv = L.p(e.x0 + x, e.y0 + y); if (!pv) continue;
          const N = d.N(x, y); for (let a = 0; a < 12; a++) f[e.dofs[a]] += w * pv * N[a];
        }
      }
      (L.nodal || []).forEach(q => { f[q.n * 3 + q.dof] += q.v; });
      return f;
    };
    self.solve = function (L) {
      const f = self.loadVec(L), f2 = Float64Array.from(f);
      for (let i = 0; i < ndof; i++) if (fixed[i]) f2[i] = 0;
      const u = K.solve(f2);
      for (let i = 0; i < ndof; i++) if (fixed[i]) u[i] = 0;
      return self.post(u, f);
    };
    /* sonuçlar: düğüm momentleri (komşu eleman ortalaması), mesnet tepkileri */
    self.post = function (u, f) {
      const Mx = new Float64Array(nn), My = new Float64Array(nn), Mxy = new Float64Array(nn), cnt = new Float64Array(nn), R = new Float64Array(ndof);
      const corner = [[0, 0], [1, 0], [1, 1], [0, 1]];
      for (const e of elems) {
        const { d } = e, ue = e.dofs.map(k => u[k]);
        for (let c = 0; c < 4; c++) {
          const x = corner[c][0] * d.a, y = corner[c][1] * d.b, [bxx, byy, bxy] = d.B(x, y);
          let wxx = 0, wyy = 0, wxy = 0; for (let a = 0; a < 12; a++) { wxx += bxx[a] * ue[a]; wyy += byy[a] * ue[a]; wxy += bxy[a] * ue[a]; }
          const n = e.ns[c];
          Mx[n] += -Dp * (wxx + nu * wyy); My[n] += -Dp * (wyy + nu * wxx); Mxy[n] += -Dp * (1 - nu) * wxy; cnt[n]++;
        }
        // tepki: Ke·ue (yay dahil) — sonra f çıkarılır
        for (let a = 0; a < 12; a++) { let s = 0; for (let b = 0; b < 12; b++) { let k = Dp * (d.K1[a][b] + nu * d.Kn[a][b]); if (self.k) k += self.k * d.Kw[a][b]; s += k * ue[b]; } R[e.dofs[a]] += s; }
      }
      for (let n = 0; n < nn; n++) if (cnt[n]) { Mx[n] /= cnt[n]; My[n] /= cnt[n]; Mxy[n] /= cnt[n]; }
      for (let i = 0; i < ndof; i++) R[i] = fixed[i] ? R[i] - f[i] : 0;
      const w = new Float64Array(nn); for (let n = 0; n < nn; n++) w[n] = u[n * 3];
      return { u, w, Mx, My, Mxy, R };
    };
    /* düğümün kenar boyu payı (tepkiyi kN/m'ye çevirmek için) */
    self.tribX = i => ((i > 0 ? xs[i] - xs[i - 1] : 0) + (i < nx - 1 ? xs[i + 1] - xs[i] : 0)) / 2;
    self.tribY = j => ((j > 0 ? ys[j] - ys[j - 1] : 0) + (j < ny - 1 ? ys[j + 1] - ys[j] : 0)) / 2;
    self.used = used;
    return self;
  };
})(typeof window !== 'undefined' ? window : globalThis);

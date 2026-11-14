/* ArıtmaCAD — STATİK: KİRİŞ · KOLON · DÖŞEME (betonarme çerçeve) ön boyutlandırma ve donatı hesabı
   Girdi S.cer (modelden): kolonlar, kirisler, dosemeler, perdeler (mesnet olarak). Birimler kN, m.
   Yöntem:
   - Döşeme: dikdörtgen plak sonlu eleman (STATIK.Plate). Sürekli kenar ankastre / mafsallı zarfı, kirişli / perdeli kenar mafsallı,
     mesnetsiz kenar serbest. Döşeme yükü kirişlere en yakın mesnet kenarı (45° çizgileri) ile aktarılır.
   - Kiriş: aynı doğrultuda birbirine değen kirişler sürekli kiriş zinciri; kolonlarda düşey mesnet + kolon dönme rijitliği (yay),
     perdede düşey mesnet, kiriş üstüne oturan kirişte (tali) taşıyıcı kirişe tekil yük. Hareketli yük şaşırtmalı (tek / çift açıklık).
   - Deprem (yaklaşık, TBDY 2018 eşdeğer deprem yükü): Vt = W·SaR(T) ≥ 0.04·I·SDS·W, T = Ct·H^(3/4), kat kuvvetleri yüksekliğe göre;
     kat kesmesi kolon / perdelere rijitlikle, kolon uç momentleri (1. kat 0.6/0.4, diğer 0.5/0.5), düğümde kirişlere rijitlikle.
     Doğrultu birleşimi %100 + %30.
   - Tasarım: TS 500 (eğilme, kesme, minimum / maksimum donatı), TBDY 2018 (sarılma bölgeleri, kesme kapasite tasarımı, güçlü kolon).
   Bu hesap ön boyutlandırmadır: kesin proje için üç boyutlu çerçeve analizi (SAP2000, ideCAD, Probina vb.) ile doğrulanmalıdır. */
(function (G) {
  'use strict';
  const P = G.STATIK;
  const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
  const Ab = F => Math.PI * F * F / 4e6; // Ø mm → m²
  const CAP_D = [8, 10, 12, 14], CAP_K = [12, 14, 16, 18, 20, 22, 25], CAP_C = [14, 16, 18, 20, 22, 25, 28], AR = [0.25, 0.20, 0.175, 0.15, 0.125, 0.10];
  const g0 = 9.81;
  P.cerceveVars = () => ({ SD1: 0.15, R: 8, D: 3, I: 1, n: 0.3, Ct: 0, cD: 0.02, cK: 0.03, cC: 0.03, gD: 1.5, qD: 3.5 });

  /* ---------------- yardımcılar ---------------- */
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const len = a => Math.hypot(a[0], a[1]);
  const projS = (p, a, u) => dot(sub(p, a), u);
  const lineDist = (p, a, u) => Math.abs((p[0] - a[0]) * u[1] - (p[1] - a[1]) * u[0]);
  const yon = u => (Math.abs(u[0]) > 0.98 ? 'X' : Math.abs(u[1]) > 0.98 ? 'Y' : null);
  const kume = (vals, tol) => { const s = [...vals].sort((a, b) => a - b), o = []; for (const v of s) if (!o.length || v - o[o.length - 1].v > tol) o.push({ v, n: 1 }); else { const q = o[o.length - 1]; q.v = (q.v * q.n + v) / (q.n + 1); q.n++; } return o.map(q => q.v); };

  /* bant çözücü (yarı bant genişliği hb), simetrik pozitif tanımlı */
  const bandCoz = (K, f, n, hb) => {
    const A = K.slice(), b = f.slice();
    for (let k = 0; k < n; k++) {
      const pv = A[k * n + k]; if (Math.abs(pv) < 1e-12) throw new Error('Kiriş çözümü tekil (mesnet yetersiz)');
      for (let i = k + 1; i <= Math.min(n - 1, k + hb); i++) {
        const f2 = A[i * n + k] / pv; if (!f2) continue;
        for (let j = k; j <= Math.min(n - 1, k + hb); j++) A[i * n + j] -= f2 * A[k * n + j];
        b[i] -= f2 * b[k];
      }
    }
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j <= Math.min(n - 1, i + hb); j++) s -= A[i * n + j] * x[j]; x[i] = s / A[i * n + i]; }
    return x;
  };

  /* dikdörtgen kesit eğilme donatısı (b genişlik) */
  const asReq = (M, b, d, MAL) => { if (M <= 0) return 0; const r = P.asGerekli(M / b, d, MAL); return r.yetersiz ? NaN : r.As * b; };
  const Mr = (As, b, d, MAL) => { const fyd = MAL.fyd * 1000, fcd = MAL.fcd * 1000, a = As * fyd / (0.85 * fcd * b); return As * fyd * (d - a / 2); };
  const k1Of = fck => Math.max(0.70, Math.min(0.85, 0.85 - 0.006 * (fck - 25)));

  /* kiriş boyuna donatısı: n adet Ø */
  const kirisDon = (As, bw, cK, nmin = 2) => {
    let best = null;
    for (const F of CAP_K) {
      const cl = Math.max(0.025, F / 1000), nmax = Math.max(2, Math.floor((bw - 2 * (cK + 0.010) + cl) / (F / 1000 + cl)));
      for (let n = nmin; n <= 2 * nmax; n++) { const A = n * Ab(F); if (A + 1e-12 < As) continue; const c = { n, F, As: A, iki: n > nmax }; if (!best || A < best.As - 1e-9 || (Math.abs(A - best.As) < 1e-9 && n < best.n)) best = c; break; }
    }
    return best;
  };
  /* plak donatısı Ø/s */
  const plakDon = (As, h, sMax) => {
    let best = null;
    for (const F of CAP_D) for (const s of AR) { if (s > sMax + 1e-9) continue; const A = Ab(F) / s; if (A + 1e-12 < As) continue; if (!best || A < best.As - 1e-9) best = { F, s, As: A }; }
    return best;
  };

  /* kolon kesiti: dikdörtgen, donatı çevrede. eksen 'x': x doğrultusunda eğilme (basınç +x yüzü) */
  const kolonBars = (bx, by, F, nb, nh, cC) => { const c = cC + 0.010 + F / 2000, out = [], xs = bx / 2 - c, ys = by / 2 - c; for (let i = 0; i < nb; i++) { const x = -xs + 2 * xs * i / (nb - 1); out.push([x, -ys], [x, ys]); } for (let j = 1; j < nh - 1; j++) { const y = -ys + 2 * ys * j / (nh - 1); out.push([-xs, y], [xs, y]); } return out; };
  const kolonMr = (bx, by, bars, Ab1, N, eks, MAL) => { // N basınç + (kN) → Mr (kNm), yetersizse 0
    const h = eks === 'x' ? bx : by, b = eks === 'x' ? by : bx, k = eks === 'x' ? 0 : 1, fcd = MAL.fcd * 1000, fyd = MAL.fyd * 1000, Es = 2e8, k1 = k1Of(MAL.fck);
    const NM = c => { const a = Math.min(k1 * c, h), Fc = 0.85 * fcd * a * b; let Nn = Fc, M = Fc * (h / 2 - a / 2); for (const q of bars) { const dc = h / 2 - q[k], e = 0.003 * (c - dc) / c, s = Math.max(-fyd, Math.min(fyd, Es * e)) - (dc < a ? 0.85 * fcd : 0); Nn += s * Ab1; M += s * Ab1 * q[k]; } return [Nn, M]; };
    const Nmax = 0.85 * fcd * b * h + bars.length * Ab1 * fyd, Nmin = -bars.length * Ab1 * fyd;
    if (N >= Nmax * 0.999 || N <= Nmin * 0.999) return 0;
    let lo = 1e-4, hi = 20 * h; for (let i = 0; i < 70; i++) { const m = (lo + hi) / 2; if (NM(m)[0] > N) hi = m; else lo = m; }
    return Math.max(0, NM((lo + hi) / 2)[1]);
  };

  /* ================= ANA HESAP ================= */
  P.cerceveHesap = (S) => {
    const CF = S.cer || {}, MAL = P.malzeme(S.mal), gc = S.mal.gc, E = MAL.Ec * 1000, dv = Object.assign(P.cerceveVars(), CF.ayar || {});
    const uyar = [], SDS = +(S.dep && S.dep.SDS) || +(CF.ayar && CF.ayar.SDS) || 0;
    const kolonlar = (CF.kolonlar || []).map(c => Object.assign({}, c, { bx: c.D ? c.D * 0.886 : c.bx, by: c.D ? c.D * 0.886 : c.by }));
    const kirisler = (CF.kirisler || []).map(k => Object.assign({}, k));
    const perdeler = (CF.perdeler || []).map(w => Object.assign({}, w));
    const sayi = (v, v0) => (v === '' || v == null || !isFinite(+v) ? v0 : +v);   // boş / tanımsız yük (form boş bırakılmış, ör. modelden yeni alınmış döşeme) → varsayılan
    const dosemeler0 = (CF.dosemeler || []).map(d => Object.assign({}, d, { g: sayi(d.g, dv.gD), q: sayi(d.q, dv.qD) }));
    if (!kirisler.length && !kolonlar.length) return null;
    kolonlar.forEach(c => { if (c.D) uyar.push(`${c.no || 'Kolon'}: dairesel kolon eşdeğer kare (${Math.round(c.bx * 100)} cm) kabul edildi.`); });

    /* ---- seviyeler ---- */
    const seviyeler = kume([...kirisler.map(k => k.zt), ...dosemeler0.map(d => d.zt)], 0.15);
    const svOf = z => seviyeler.reduce((b, v) => (Math.abs(v - z) < Math.abs(b - z) ? v : b), seviyeler[0]);
    const tSv = z => Math.max(0, ...dosemeler0.filter(d => Math.abs(d.zt - z) < 0.15).map(d => d.t));
    /* kiriş altında biten kolon (model: kolon boyu kiriş altına kadar): kolon–kiriş düğümü kiriş üst kotundadır — kolon üstü üzerindeki
       kirişin üst kotuna uzatılır (aksi halde kiriş kolonu mesnet olarak görmez, 3B çerçevede de düğüm kopuk kalır). */
    const uzatilan = new Map();
    kolonlar.forEach(c => { const r = Math.max(c.bx, c.by) / 2 + 0.05;
      const ust = kirisler.filter(k => { if (!(c.zt < k.zt - tSv(k.zt) - 0.15 + 1e-9 && c.zt >= k.zt - (+k.hb || 0.5) - 0.05)) return false; const d = sub(k.b, k.a), L = len(d) || 1, u = [d[0] / L, d[1] / L], s = projS([c.x, c.y], k.a, u); return s > -r && s < L + r && lineDist([c.x, c.y], k.a, u) <= r; });
      if (!ust.length) return; const z = Math.max(...ust.map(k => k.zt)), k0 = `${Math.round(c.zt * 100) / 100} → ${Math.round(z * 100) / 100}`; if (!uzatilan.has(k0)) uzatilan.set(k0, []); uzatilan.get(k0).push(c.no || 'Kolon'); c.zt = z; });
    for (const [k0, ad] of uzatilan) uyar.push(`${ad.join(', ')}: kiriş altında bitiyor; kolon–kiriş düğümü kiriş üst kotunda alındı (${k0}).`);

    /* ---- kiriş zincirleri ---- */
    kirisler.forEach(k => { const d = sub(k.b, k.a), L = len(d); k.L = L; k.u = [d[0] / L, d[1] / L]; if (k.u[0] < -0.02 || (Math.abs(k.u[0]) <= 0.02 && k.u[1] < 0)) { const t = k.a; k.a = k.b; k.b = t; k.u = [-k.u[0], -k.u[1]]; } k.sv = svOf(k.zt); });
    const par = kirisler.map((_, i) => i), bul = i => (par[i] === i ? i : (par[i] = bul(par[i])));
    for (let i = 0; i < kirisler.length; i++) for (let j = i + 1; j < kirisler.length; j++) {
      const A = kirisler[i], B = kirisler[j]; if (Math.abs(A.sv - B.sv) > 0.05) continue;
      if (Math.abs(A.u[0] * B.u[1] - A.u[1] * B.u[0]) > 0.02 || lineDist(B.a, A.a, A.u) > 0.05) continue;
      const s0 = projS(B.a, A.a, A.u), s1 = projS(B.b, A.a, A.u); if (Math.max(s0, s1) < -0.3 || Math.min(s0, s1) > A.L + 0.3) continue;
      par[bul(i)] = bul(j);
    }
    const zg = new Map(); kirisler.forEach((k, i) => { const r = bul(i); if (!zg.has(r)) zg.set(r, []); zg.get(r).push(k); });
    const zincirler = [...zg.values()].map((ks, zi) => {
      const u = ks[0].u, a0 = ks[0].a; let smin = Infinity, smax = -Infinity;
      ks.forEach(k => { smin = Math.min(smin, projS(k.a, a0, u), projS(k.b, a0, u)); smax = Math.max(smax, projS(k.a, a0, u), projS(k.b, a0, u)); });
      const a = [a0[0] + u[0] * smin, a0[1] + u[1] * smin], L = smax - smin;
      const segs = ks.map(k => ({ k, s0: projS(k.a, a, u), s1: projS(k.b, a, u), bw: k.bw, hb: k.hb })).sort((p, q) => p.s0 - q.s0);
      return { id: zi, a, u, L, z: ks[0].sv, d: yon(u), segs, ad: ks.map(k => k.no || ('K' + (k.id || ''))).join('-'), sup: [], yG: [], yQ: [], tasi: [] };
    });
    const segAt = (ch, s) => ch.segs.find(q => s >= q.s0 - 1e-6 && s <= q.s1 + 1e-6) || ch.segs.reduce((b, q) => (Math.min(Math.abs(q.s0 - s), Math.abs(q.s1 - s)) < Math.min(Math.abs(b.s0 - s), Math.abs(b.s1 - s)) ? q : b));
    const ptOf = (ch, s) => [ch.a[0] + ch.u[0] * s, ch.a[1] + ch.u[1] * s];

    /* ---- kolon üst / alt ilişkileri ---- */
    kolonlar.forEach(c => { c.H = c.zt - c.z0; c.ust = kolonlar.find(o => o !== c && Math.abs(o.z0 - c.zt) < 0.15 && Math.hypot(o.x - c.x, o.y - c.y) < 0.3) || null; });
    kolonlar.forEach(c => { c.alt = kolonlar.find(o => o.ust === c) || null; });
    const Icol = (c, d) => (d === 'X' ? c.by * c.bx ** 3 / 12 : c.bx * c.by ** 3 / 12);

    /* ---- mesnetler ---- */
    for (const ch of zincirler) {
      const add = (s, o) => { s = Math.max(0, Math.min(ch.L, s)); if (ch.sup.some(q => Math.abs(q.s - s) < 0.2)) return; ch.sup.push(Object.assign({ s }, o)); };
      for (const c of kolonlar) {
        const ust = c.zt < ch.z + 0.15 && c.zt > ch.z - tSv(ch.z) - 0.15 /* döşeme altında biten kolon */, gecer = c.z0 < ch.z - 0.15 && c.zt > ch.z + 0.15; if (!ust && !gecer) continue;
        const p = [c.x, c.y], s = projS(p, ch.a, ch.u); if (s < -0.3 || s > ch.L + 0.3) continue;
        if (lineDist(p, ch.a, ch.u) > Math.max(c.bx, c.by) / 2 + 0.05) continue;
        const dd = ch.d || 'X', kth = ust ? [c, c.ust].filter(Boolean).reduce((t, q) => t + 3 * E * Icol(q, dd) / q.H, 0) : 2 * 3 * E * Icol(c, dd) / (c.H / 2);
        add(s, { tip: 'kolon', c, cUst: ust ? c.ust : null, kth: kth || 0 });
      }
      for (const w of perdeler) {
        if (!(w.zt > ch.z - 0.15 && w.z0 < ch.z - 0.3)) continue;
        const wu = sub(w.b, w.a), wl = len(wu), wn = [wu[0] / wl, wu[1] / wl], cr = ch.u[0] * wn[1] - ch.u[1] * wn[0];
        if (Math.abs(cr) > 0.1) { // kesişen
          const t = ((w.a[0] - ch.a[0]) * wn[1] - (w.a[1] - ch.a[1]) * wn[0]) / cr, q = ptOf(ch, t), sw = projS(q, w.a, wn);
          if (t > -w.t / 2 - 0.15 && t < ch.L + w.t / 2 + 0.15 && sw > -0.2 && sw < wl + 0.2) add(t, { tip: 'perde', w });
        } else if (lineDist(w.a, ch.a, ch.u) < w.t / 2 + 0.1) { // perde üstünde
          const s0 = Math.max(0, Math.min(projS(w.a, ch.a, ch.u), projS(w.b, ch.a, ch.u))), s1 = Math.min(ch.L, Math.max(projS(w.a, ch.a, ch.u), projS(w.b, ch.a, ch.u)));
          for (let s = s0; s <= s1 + 1e-6; s += Math.max(0.5, (s1 - s0) / Math.ceil((s1 - s0) / 1.0))) add(s, { tip: 'perde', w });
        }
      }
    }
    // kiriş üstüne oturan kiriş
    for (const A of zincirler) for (const B of zincirler) {
      if (A === B || Math.abs(A.z - B.z) > 0.05) continue;
      const cr = A.u[0] * B.u[1] - A.u[1] * B.u[0]; if (Math.abs(cr) < 0.1) continue;
      const t = ((B.a[0] - A.a[0]) * B.u[1] - (B.a[1] - A.a[1]) * B.u[0]) / cr, q = ptOf(A, t), tb = projS(q, B.a, B.u);
      if (t < -0.2 || t > A.L + 0.2 || tb < -0.2 || tb > B.L + 0.2) continue;
      if (A.sup.some(o => Math.abs(o.s - t) < 0.3 && o.tip !== 'kiris')) continue; // kolon / perde var
      const uA = t < 0.3 || t > A.L - 0.3, uB = tb < 0.3 || tb > B.L - 0.3;
      let tasinan = null;
      if (uA && !uB) tasinan = true; else if (!uA && !uB) { const ha = segAt(A, t).hb, hb2 = segAt(B, tb).hb; tasinan = ha < hb2 - 1e-6 || (Math.abs(ha - hb2) < 1e-6 && A.L < B.L); }
      if (tasinan) { A.sup.push({ s: Math.max(0, Math.min(A.L, t)), tip: 'kiris', ch: B, sOn: Math.max(0, Math.min(B.L, tb)) }); B.tasi.push(A); }
    }
    zincirler.forEach(ch => ch.sup.sort((a, b) => a.s - b.s));

    /* ---- döşemeler ---- */
    const dosemeler = [];
    const kenarMesnet = (dir, c, a0, a1, z) => { // kenar doğrultusu, sabit koordinat, aralık
      const Lk = a1 - a0;
      for (const ch of zincirler) {
        if (ch.z > z + 0.15 || ch.z < z - tSv(z) - 0.15 /* döşeme kirişin üstüne oturabilir */ || ch.d !== dir) continue;
        const cc = dir === 'X' ? ch.a[1] : ch.a[0], bw = Math.max(...ch.segs.map(q => q.bw)); if (Math.abs(cc - c) > bw / 2 + 0.25) continue;
        const c0 = dir === 'X' ? ch.a[0] : ch.a[1], ov = Math.min(a1, c0 + ch.L) - Math.max(a0, c0); if (ov < 0.5 * Lk) continue;
        return { tip: 'kiris', ch };
      }
      for (const w of perdeler) {
        if (!(w.zt > z - tSv(z) - 0.15 /* döşeme perde üstüne oturuyor */ && w.z0 < z - 0.3)) continue; const wu = sub(w.b, w.a), wl = len(wu); if (yon([wu[0] / wl, wu[1] / wl]) !== dir) continue;
        const cc = dir === 'X' ? w.a[1] : w.a[0]; if (Math.abs(cc - c) > w.t / 2 + 0.25) continue;
        const p0 = dir === 'X' ? Math.min(w.a[0], w.b[0]) : Math.min(w.a[1], w.b[1]), ov = Math.min(a1, p0 + wl) - Math.max(a0, p0); if (ov < 0.5 * Lk) continue;
        return { tip: 'perde', w };
      }
      return null;
    };
    const suYapisi = S.suYapisi !== false && S.geo; const yukPan = [];
    for (const d of dosemeler0) {
      const xs = d.pts.map(p => p[0]), ys = d.pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      let A = 0; for (let i = 0; i < d.pts.length; i++) { const p = d.pts[i], q = d.pts[(i + 1) % d.pts.length]; A += p[0] * q[1] - q[0] * p[1]; } A = Math.abs(A / 2);
      const o = Object.assign({}, d, { x0, x1, y0, y1, lx: x1 - x0, ly: y1 - y0, kenar: {} });
      if (A < 0.95 * o.lx * o.ly) uyar.push(`${d.no || 'Döşeme'}: dikdörtgen değil, çevreleyen dikdörtgen olarak hesaplandı.`);
      o.kenar.B = kenarMesnet('X', y0, x0, x1, d.zt); o.kenar.T = kenarMesnet('X', y1, x0, x1, d.zt); o.kenar.L = kenarMesnet('Y', x0, y0, y1, d.zt); o.kenar.R = kenarMesnet('Y', x1, y0, y1, d.zt);
      const kirisli = Object.values(o.kenar).some(k => k && k.tip === 'kiris');
      const hazneDos = (suYapisi && (S.geo.doseme || []).some(g => g.id != null && g.id === d.id)) || (S.mod === 'kabuk' && S.kabuk && (S.kabuk.dosemeler || []).some(g => g.id != null && g.id === d.id)); // su yapısı (ya da 3B kabuk) hesabının döşemesi // su yapısı hesabının üst döşemesi
      if (!kirisli && hazneDos && Object.values(o.kenar).some(Boolean)) { o.atla = true;
        /* su yapısı üst döşemesi altında ara kiriş varsa: döşeme su yapısı hesabında kirişlerle panellere bölünerek tasarlanır;
           burada yalnız panel yükleri kirişlere aktarılır (kiriş / kolon hesabı döşeme yükünü alsın) */
        const ic = zincirler.filter(ch => ch.z <= d.zt + 0.15 && ch.z >= d.zt - tSv(d.zt) - 0.15), xsI = [x0, x1], ysI = [y0, y1];
        for (const ch of ic) { const c0 = ch.d === 'X' ? ch.a[1] : ch.a[0], s0 = ch.d === 'X' ? ch.a[0] : ch.a[1], lo = ch.d === 'X' ? x0 : y0, hi = ch.d === 'X' ? x1 : y1; if (Math.min(hi, s0 + ch.L) - Math.max(lo, s0) < 0.5 * (hi - lo)) continue; if (ch.d === 'X' && c0 > y0 + 0.3 && c0 < y1 - 0.3) ysI.push(c0); if (ch.d === 'Y' && c0 > x0 + 0.3 && c0 < x1 - 0.3) xsI.push(c0); }
        if (xsI.length + ysI.length > 4) { xsI.sort((a, b) => a - b); ysI.sort((a, b) => b - a).reverse(); for (let i = 0; i + 1 < xsI.length; i++) for (let j = 0; j + 1 < ysI.length; j++) { const a0 = xsI[i], a1 = xsI[i + 1], b0 = ysI[j], b1 = ysI[j + 1]; yukPan.push(Object.assign({}, d, { no: (d.no || 'D') + '-' + (yukPan.length + 1), x0: a0, x1: a1, y0: b0, y1: b1, lx: a1 - a0, ly: b1 - b0, kenar: { B: kenarMesnet('X', b0, a0, a1, d.zt), T: kenarMesnet('X', b1, a0, a1, d.zt), L: kenarMesnet('Y', a0, b0, b1, d.zt), R: kenarMesnet('Y', a1, b0, b1, d.zt) } })); } }
        continue; } // yalnız perdeye oturan üst döşeme: su yapısı hesabında
      { const ust = perdeler.filter(w => w.zt - w.z0 > 0.3 && Math.abs(w.z0 - d.zt) < 0.2 && [w.a, w.b].some(q => q[0] > x0 - 0.05 && q[0] < x1 + 0.05 && q[1] > y0 - 0.05 && q[1] < y1 + 0.05));
        if (ust.length) uyar.push(`${d.no || 'Döşeme'} (üst kot ${d.zt}): üzerinde askıda perde var (${ust.map(w => (w.no || 'perde') + ' t=' + Math.round(w.t * 100) + ' cm, h=' + (Math.round((w.zt - w.z0) * 100) / 100) + ' m').join('; ')}). Perde ağırlığı ve perdeye gelen su itkisi döşeme / kolonlara bu hesapta AKTARILMIYOR — perde altına kiriş tanımlayın ya da elle kontrol edin.`); }
      dosemeler.push(o);
    }
    // süreklilik
    for (const o of dosemeler) {
      o.sur = {};
      for (const [k, dir, c, a0, a1, yonS] of [['B', 'X', o.y0, o.x0, o.x1, -1], ['T', 'X', o.y1, o.x0, o.x1, 1], ['L', 'Y', o.x0, o.y0, o.y1, -1], ['R', 'Y', o.x1, o.y0, o.y1, 1]]) {
        o.sur[k] = !!o.kenar[k] && dosemeler.some(p => p !== o && Math.abs(p.zt - o.zt) < 0.15 && (dir === 'X'
          ? Math.abs((yonS < 0 ? p.y1 : p.y0) - c) < 0.6 && Math.min(a1, p.x1) - Math.max(a0, p.x0) > 0.5 * (a1 - a0)
          : Math.abs((yonS < 0 ? p.x1 : p.x0) - c) < 0.6 && Math.min(a1, p.y1) - Math.max(a0, p.y0) > 0.5 * (a1 - a0)));
      }
    }
    for (const o of dosemeler) {
      const nMes = Object.values(o.kenar).filter(Boolean).length;
      o.gk = gc * o.t + o.g; o.qk = o.q; o.pd = 1.4 * o.gk + 1.6 * o.qk;
      if (!nMes) { o.hata = 'Mesnet (kiriş / perde) bulunamadı'; uyar.push(`${o.no || 'Döşeme'}: kenarlarında kiriş ya da perde bulunamadı, hesaplanmadı.`); continue; }
      const ls = Math.min(o.lx, o.ly), ll = Math.max(o.lx, o.ly), m = ll / ls;
      const bc = v => { const r = {}; for (const k of ['B', 'T', 'L', 'R']) r[k] = !o.kenar[k] ? 'S' : (nMes === 1 || (o.sur[k] && v === 'A')) ? 'A' : 'M'; return r; };
      const hh = Math.min(0.25, ls / 8), xsG = P.gridLines([0, o.lx], hh), ysG = P.gridLines([0, o.ly], hh);
      const vars = Object.values(o.sur).some(Boolean) ? ['A', 'M'] : ['M'];
      const Z = { xb: 0, yb: 0, xt: 0, yt: 0 };
      for (const v of vars) {
        const pl = P.Plate({ xs: xsG, ys: ysG, t: o.t, E, nu: 0.2, bc: bc(v) }), rG = pl.solve({ p: () => -o.gk }), rQ = pl.solve({ p: () => -o.qk });
        for (let i = 0; i < rG.Mx.length; i++) {
          const mx = 1.4 * rG.Mx[i] + 1.6 * rQ.Mx[i], my = 1.4 * rG.My[i] + 1.6 * rQ.My[i], ix = i % pl.nx, iy = Math.floor(i / pl.nx), kx = Math.min(xsG[ix], o.lx - xsG[ix]), ky = Math.min(ysG[iy], o.ly - ysG[iy]);
          const mxy = kx > 0.2 * ls && ky > 0.2 * ls ? Math.abs(1.4 * rG.Mxy[i] + 1.6 * rQ.Mxy[i]) : 0; // köşe bölgesindeki burulma köşe donatısı ile karşılanır (TS 500 11.4.3)
          Z.xb = Math.max(Z.xb, -(mx - mxy)); Z.yb = Math.max(Z.yb, -(my - mxy)); Z.xt = Math.max(Z.xt, mx + mxy); Z.yt = Math.max(Z.yt, my + mxy);
        }
      }
      o.M = Z; o.m = m; o.tek = m > 2 || nMes === 1 || (!o.kenar.L && !o.kenar.R) || (!o.kenar.B && !o.kenar.T);
      // TS 500 11.2: kalınlık
      const nSur = Object.values(o.sur).filter(Boolean).length, perim = 2 * (o.lx + o.ly);
      const surL = (o.sur.B ? o.lx : 0) + (o.sur.T ? o.lx : 0) + (o.sur.L ? o.ly : 0) + (o.sur.R ? o.ly : 0), as = surL / perim;
      let hmin;
      if (nMes === 1) hmin = ls / 12;
      else if (o.tek) { const kk = (o.kenar.L && o.kenar.R && !o.kenar.B && !o.kenar.T) ? [o.sur.L, o.sur.R] : (o.kenar.B && o.kenar.T && !o.kenar.L && !o.kenar.R) ? [o.sur.B, o.sur.T] : (o.lx < o.ly ? [o.sur.L, o.sur.R] : [o.sur.B, o.sur.T]); const ns = kk.filter(Boolean).length; hmin = ls / (ns === 2 ? 35 : ns === 1 ? 30 : 25); }
      else hmin = (ls / (15 + 20 / m)) * (1 - as / 4);
      o.hmin = Math.max(0.08, hmin); o.hOk = o.t >= o.hmin - 1e-6; void nSur;
      // donatı: kısa doğrultu dış katman
      const kisaX = o.lx <= o.ly, rmin = o.tek ? 0.002 : 0.0015, rminD = o.tek ? 0.0012 : 0.0015, sMx = Math.min(1.5 * o.t, 0.20);
      const tas = (M, dis, ana) => { const F0 = 0.010, d = o.t - dv.cD - F0 / 2 - (dis ? 0 : F0); const req = asReq(M, 1, d, MAL), Amin = (ana ? rmin : rminD) * o.t; const sel = plakDon(Math.max(req || 0, Amin), o.t, ana ? sMx : Math.min(0.25, 1.5 * o.t * 1.5)); return Object.assign({ M, d, req, Amin, ok: !!sel && isFinite(req) }, sel || {}); };
      const anaX = kisaX || !o.tek ? true : false, anaY = !kisaX || !o.tek ? true : false;
      o.don = { altX: tas(Z.xb, kisaX, anaX), altY: tas(Z.yb, !kisaX, anaY), ustX: tas(Z.xt, kisaX, true), ustY: tas(Z.yt, !kisaX, true) };
      o.Vd = o.pd * ls / 2; o.Vcr = 0.65 * MAL.fctd * 1000 * (o.t - dv.cD - 0.01); o.Vok = o.Vd <= o.Vcr;
      o.ok = o.hOk && o.Vok && Object.values(o.don).every(q => q.ok);
      // yük aktarımı (en yakın mesnet kenarı)
      const cs = Math.min(0.15, ls / 20), kenarlar = ['B', 'T', 'L', 'R'].filter(k => o.kenar[k]);
      for (let x = o.x0 + cs / 2; x < o.x1; x += cs) for (let y = o.y0 + cs / 2; y < o.y1; y += cs) {
        let best = null, bd = Infinity; for (const k of kenarlar) { const dd = k === 'B' ? y - o.y0 : k === 'T' ? o.y1 - y : k === 'L' ? x - o.x0 : o.x1 - x; if (dd < bd) { bd = dd; best = k; } }
        const kn = o.kenar[best], A1 = cs * cs; if (kn.tip !== 'kiris') { kn.yk = (kn.yk || 0) + A1; continue; }
        const p = best === 'B' || best === 'T' ? [x, best === 'B' ? o.y0 : o.y1] : [best === 'L' ? o.x0 : o.x1, y], s = Math.round(projS(p, kn.ch.a, kn.ch.u) / 0.1) * 0.1;
        kn.ch.yG.push([s, -o.gk * A1]); kn.ch.yQ.push([s, -o.qk * A1]);
      }
    }

    for (const o of yukPan) { o.gk = gc * o.t + o.g; o.qk = o.q; const ls = Math.min(o.lx, o.ly), cs = Math.min(0.15, ls / 20), kenarlar = ['B', 'T', 'L', 'R'].filter(k => o.kenar[k]); if (!kenarlar.length) continue;
      for (let x = o.x0 + cs / 2; x < o.x1; x += cs) for (let y = o.y0 + cs / 2; y < o.y1; y += cs) { let best = null, bd = Infinity; for (const k of kenarlar) { const dd = k === 'B' ? y - o.y0 : k === 'T' ? o.y1 - y : k === 'L' ? x - o.x0 : o.x1 - x; if (dd < bd) { bd = dd; best = k; } }
        const kn = o.kenar[best], A1 = cs * cs; if (kn.tip !== 'kiris') continue; const p = best === 'B' || best === 'T' ? [x, best === 'B' ? o.y0 : o.y1] : [best === 'L' ? o.x0 : o.x1, y], s = Math.round(projS(p, kn.ch.a, kn.ch.u) / 0.1) * 0.1; kn.ch.yG.push([s, -o.gk * A1]); kn.ch.yQ.push([s, -o.qk * A1]); } }
    if (yukPan.length) uyar.push(`Su yapısı üst döşemesi ara kirişlere oturuyor: ${yukPan.length} panel yükü kirişlere aktarıldı (döşeme donatısı su yapısı paftasında, kirişlerle bölünmüş sürekli döşeme olarak).`);
    /* ---- kiriş zinciri çözümü ---- */
    const coz = (ch) => {
      const dik = ch.sup.filter(q => q.tip);
      if (!dik.length) { ch.hata = 'Mesnet yok'; uyar.push(`${ch.ad}: kolon / perde / taşıyıcı kiriş mesnedi bulunamadı, hesaplanmadı.`); return false; }
      /* tek mesnedi perde olan kiriş (perdeye dik giren konsol, ör. yürüme yolu kirişi): perdeyle monolitik birleşim — dönme yayı:
         perde şeridinin (genişlik bw + 2t) perde yüksekliğince konsol rijitliği 3·E·I/H (yarı ankastre). Yalnız aksi halde dengesiz kalan kirişte. */
      if (dik.length === 1 && dik[0].tip === 'perde' && !(dik[0].kth > 0)) { const w = dik[0].w, H = Math.max(0.5, ch.z - (+w.z0 || 0)), bw = Math.max(...ch.segs.map(q => q.bw)), be = bw + 2 * w.t;
        dik[0].kth = 3 * E * (be * w.t ** 3 / 12) / H; uyar.push(`${ch.ad}: tek mesnedi perde — perdeye monolitik konsol (yarı ankastre, dönme yayı ${Math.round(dik[0].kth)} kNm/rad) olarak hesaplandı.`); }
      if (dik.length === 1 && !(dik[0].kth > 0)) { ch.hata = 'Tek mafsallı mesnet (dengesiz)'; uyar.push(`${ch.ad}: tek mesnetli, dengesiz; hesaplanmadı.`); return false; }
      const pts = new Set([0, ch.L, ...ch.sup.map(q => q.s), ...ch.segs.flatMap(q => [Math.max(0, q.s0), Math.min(ch.L, q.s1)]), ...ch.yG.map(q => q[0]), ...ch.tasiG.map(q => q[0])].map(v => Math.round(Math.max(0, Math.min(ch.L, v)) * 1000) / 1000));
      for (let s = 0; s < ch.L; s += 0.25) pts.add(Math.round(s * 1000) / 1000);
      const xs = [...pts].sort((a, b) => a - b).filter((v, i, a) => i === 0 || v - a[i - 1] > 1e-3), N = xs.length, n = 2 * N;
      const idx = s => { let b = 0; for (let i = 1; i < N; i++) if (Math.abs(xs[i] - s) < Math.abs(xs[b] - s)) b = i; return b; };
      const tsl = tSv(ch.z), elm = [];
      for (let i = 0; i < N - 1; i++) { const sm = (xs[i] + xs[i + 1]) / 2, sg = segAt(ch, sm); elm.push({ i, L: xs[i + 1] - xs[i], EI: E * sg.bw * sg.hb ** 3 / 12, wG: -(gc * sg.bw * Math.max(0.1, sg.hb - tsl) + (+sg.k.gd || 0)) }); }
      const K = new Float64Array(n * n), add = (I, J, v) => { K[I * n + J] += v; };
      for (const e of elm) { const L = e.L, k = e.EI / L ** 3, ke = [[12, 6 * L, -12, 6 * L], [6 * L, 4 * L * L, -6 * L, 2 * L * L], [-12, -6 * L, 12, -6 * L], [6 * L, 2 * L * L, -6 * L, 4 * L * L]].map(r => r.map(v => v * k)); e.ke = ke; const d = [2 * e.i, 2 * e.i + 1, 2 * e.i + 2, 2 * e.i + 3]; e.d = d; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) add(d[a], d[b], ke[a][b]); }
      const supN = ch.sup.map(q => Object.assign(q, { ni: idx(q.s) }));
      for (const q of supN) if (q.kth > 0) add(2 * q.ni + 1, 2 * q.ni + 1, q.kth);
      const fixV = new Set(supN.map(q => 2 * q.ni)), Kc = K.slice();
      for (const I of fixV) { for (let j = 0; j < n; j++) { Kc[I * n + j] = 0; Kc[j * n + I] = 0; } Kc[I * n + I] = 1; }
      const acik = [], ss = supN.map(q => q.s); // açıklık indeksleri (tek / çift)
      const acikNo = s => { let k = 0; for (const x of ss) if (s > x + 1e-6) k++; return k; };
      const solve = (wfac, Pts, filt) => {
        const f = new Float64Array(n), fe = elm.map(() => [0, 0, 0, 0]);
        for (const e of elm) { const sm = xs[e.i] + e.L / 2; if (filt && !filt(sm)) continue; const q = e.wG * wfac, L = e.L; if (!q) continue; const v = [q * L / 2, q * L * L / 12, q * L / 2, -q * L * L / 12]; fe[e.i] = v; for (let a = 0; a < 4; a++) f[e.d[a]] += v[a]; }
        const Pn = new Float64Array(N); for (const [s, Pv] of Pts) { if (filt && !filt(s)) continue; const i = idx(s); f[2 * i] += Pv; Pn[i] += Pv; }
        const fc = f.slice(); for (const I of fixV) fc[I] = 0;
        const u = bandCoz(Kc, fc, n, 3);
        const M = new Float64Array(N), V = [], R = supN.map(() => 0);
        const sumV = new Float64Array(N);
        elm.forEach(e => { const ue = e.d.map(k => u[k]), F = [0, 1, 2, 3].map(a => e.ke[a].reduce((t, kv, b) => t + kv * ue[b], 0) - fe[e.i][a]); e.F = F; M[e.i] = -F[1]; M[e.i + 1] = F[3]; V.push([F[0], -F[2]]); sumV[e.i] += F[0]; sumV[e.i + 1] += F[2]; });
        supN.forEach((q, j) => { R[j] = sumV[q.ni] - Pn[q.ni]; q._th = u[2 * q.ni + 1]; });
        const Msp = supN.map(q => (q.kth > 0 ? q.kth * u[2 * q.ni + 1] : 0));
        return { M, V, R, Msp };
      };
      const PG = [...ch.yG, ...ch.tasiG], PQ = [...ch.yQ, ...ch.tasiQ];
      ch.xs = xs; ch.elm = elm; ch.supN = supN;
      ch.G = solve(1, PG); ch.Q = solve(0, PQ);
      const tek = s => acikNo(s) % 2 === 1, cift = s => acikNo(s) % 2 === 0;
      ch.Qt = solve(0, PQ, tek); ch.Qc = solve(0, PQ, cift); void acik;
      return true;
    };
    // sıralama: taşınan kirişler önce
    zincirler.forEach(ch => { ch.tasiG = []; ch.tasiQ = []; });
    const sira = [], gor = new Set(), ziyaret = (ch, yol) => { if (gor.has(ch)) return; if (yol.has(ch)) { uyar.push(`${ch.ad}: kirişler birbirine dairesel oturuyor.`); return; } yol.add(ch); for (const t of ch.tasi) ziyaret(t, yol); yol.delete(ch); gor.add(ch); sira.push(ch); };
    zincirler.forEach(ch => ziyaret(ch, new Set()));
    for (const ch of sira) {
      ch.ok0 = coz(ch); if (!ch.ok0) continue;
      ch.supN.forEach((q, j) => { if (q.tip === 'kiris') { q.ch.tasiG.push([q.sOn, -ch.G.R[j]]); q.ch.tasiQ.push([q.sOn, -ch.Q.R[j]]); } });
    }

    /* ---- kolon düşey yükleri ---- */
    kolonlar.forEach(c => { c.NGu = 0; c.NQu = 0; c.Mg = { X: { G: 0, Q: 0 }, Y: { G: 0, Q: 0 } }; c.ME = { X: { t: 0, b: 0, V: 0 }, Y: { t: 0, b: 0, V: 0 } }; c.NE = { X: 0, Y: 0 }; });
    for (const ch of zincirler) if (ch.ok0) ch.supN.forEach((q, j) => {
      if (q.tip !== 'kolon') return; const c = q.c; c.NGu += ch.G.R[j]; c.NQu += ch.Q.R[j];
      const d = ch.d || 'X', kb = 3 * E * Icol(c, d) / c.H, ka = q.cUst ? 3 * E * Icol(q.cUst, d) / q.cUst.H : 0, fb = kb / (kb + ka || 1);
      c.Mg[d].G = Math.max(c.Mg[d].G, Math.abs(ch.G.Msp[j]) * fb); c.Mg[d].Q = Math.max(c.Mg[d].Q, Math.abs(ch.Q.Msp[j]) * fb);
      if (q.cUst) { const u = q.cUst; u.Mg[d].G = Math.max(u.Mg[d].G, Math.abs(ch.G.Msp[j]) * (1 - fb)); u.Mg[d].Q = Math.max(u.Mg[d].Q, Math.abs(ch.Q.Msp[j]) * (1 - fb)); }
    });
    const kSira = kolonlar.slice().sort((a, b) => b.zt - a.zt);
    for (const c of kSira) { const ow = gc * (c.D ? Math.PI * c.D * c.D / 4 : c.bx * c.by) * c.H; c.Gw = ow; c.NG = c.NGu + ow + (c.ust ? c.ust.NG : 0); c.NQ = c.NQu + (c.ust ? c.ust.NQ : 0); }

    /* ---- deprem (eşdeğer deprem yükü) ---- */
    const kSv = kume(kolonlar.map(c => c.zt), 0.15), taban = kolonlar.length ? Math.min(...kolonlar.map(c => c.z0)) : 0;
    const katlar = kSv.map((z, i) => ({ i, z, H: z - taban, kol: kolonlar.filter(c => Math.abs(c.zt - z) < 0.15), w: 0 }));
    katlar.forEach((k, i) => { k.alt = i ? katlar[i - 1].z : taban; k.h = k.z - k.alt; k.per = perdeler.filter(w => w.z0 < k.alt + 0.15 && w.zt > k.z - 0.15); });
    for (const k of katlar) {
      let W = 0;
      dosemeler.filter(d => Math.abs(d.zt - k.z) < 0.15).forEach(d => { W += (d.gk + dv.n * d.qk) * d.lx * d.ly; });
      zincirler.filter(ch => Math.abs(ch.z - k.z) < 0.15).forEach(ch => ch.segs.forEach(sg => { W += (gc * sg.bw * Math.max(0.1, sg.hb - tSv(ch.z)) + (+sg.k.gd || 0)) * (sg.s1 - sg.s0); }));
      k.kol.forEach(c => { W += c.Gw / 2; if (c.ust) W += c.ust.Gw / 2; });
      k.per.forEach(w => { W += gc * w.t * len(sub(w.b, w.a)) * k.h / 2; });
      k.w = W;
    }
    const Wt = katlar.reduce((t, k) => t + k.w, 0), HN = katlar.length ? katlar[katlar.length - 1].H : 0;
    /* TBDY 2018 eşdeğer deprem yükü (4.7): T = Rayleigh (kat rijitlikleri, çatlamış kesit, kiriş esnekliği — Muto a katsayısı) ≤ 1.4·Ct·H^0.75,
       her yön ayrı T, Vt, Fi; kolon segmentleri bağlandıkları kirişli düğümler arasında (kat geçen sürekli kolon her iki katta da çalışır) */
    const perdeVar = katlar.some(k => k.per.length), Ct = dv.Ct || (perdeVar ? 0.07 : 0.1), Temp = Ct * Math.pow(Math.max(HN, 0.1), 0.75);
    const SD1 = +dv.SD1 || 0, TA = SDS > 0 ? 0.2 * SD1 / SDS : 0, TB = SDS > 0 ? SD1 / SDS : 0, TL = 6;
    const SaeF = (Sds, Sd1) => { const ta = Sds > 0 ? 0.2 * Sd1 / Sds : 0, tb = Sds > 0 ? Sd1 / Sds : 0; return T => (T < ta ? (0.4 + 0.6 * T / ta) * Sds : T <= tb ? Sds : T <= TL ? Sd1 / T : Sd1 * TL / (T * T)); };
    const Sae = SaeF(SDS, SD1), Sae3 = (+dv.SDS3 > 0 && +dv.SD13 > 0) ? SaeF(+dv.SDS3, +dv.SD13) : null;
    const RI = dv.R / dv.I, Ra = T => (T > TB ? RI : dv.D + (RI - dv.D) * T / (TB || 1));
    const kC = +dv.kKolon || 0.7, kB = +dv.kKiris || 0.35, rz = dv.rijitBolge != null ? +dv.rijitBolge : 0.75; // rijit bölgeler %25 azaltılmış (0.75) // etkin kesit rijitlik katsayıları (TBDY Tablo 4.2)
    // kolon segmentleri: kirişe bağlandığı ara kotlar düğüm
    const dugum = c => kSv.filter(z => z > c.z0 + 0.3 && z < c.zt - 0.15 && zincirler.some(ch => Math.abs(ch.z - z) < 0.15 && ch.supN && ch.supN.some(q => q.tip === 'kolon' && q.c === c)));
    const Kb = (c, z, d) => { let t = 0; for (const ch of zincirler) { if (ch.d !== d || Math.abs(ch.z - z) > 0.15 || !ch.supN) continue; const j = ch.supN.findIndex(q => q.tip === 'kolon' && q.c === c); if (j < 0) continue;
        for (const jj of [j - 1, j + 1]) { const o = ch.supN[jj]; if (!o) continue; const L = Math.abs(o.s - ch.supN[j].s); if (L < 0.3) continue; const sg = segAt(ch, (o.s + ch.supN[j].s) / 2), gen = q => (q.tip === 'kolon' ? (ch.d === 'Y' ? q.c.by : q.c.bx) : q.tip === 'perde' ? q.w.t : 0), Le = Math.max(0.5 * L, L - rz * (gen(o) + gen(ch.supN[j])) / 2); t += kB * E * sg.bw * sg.hb ** 3 / 12 / Le * (L / Le) ** 2; } } return t; };
    const hbUc = (c, z) => Math.max(0, ...zincirler.filter(ch => Math.abs(ch.z - z) < 0.15 && ch.supN && ch.supN.some(q => q.tip === 'kolon' && q.c === c)).map(ch => Math.max(...ch.segs.map(q => q.hb)))); // rijit bölge: kiriş yüksekliği
    const segler = []; for (const c of kolonlar) { const nd = [c.z0, ...dugum(c), c.zt]; for (let i = 0; i + 1 < nd.length; i++) segler.push({ c, za: nd[i], zb: nd[i + 1], h: nd[i + 1] - nd[i], tabanda: i === 0 && !c.alt }); }
    const segK = (q, d) => { const Ic = kC * E * Icol(q.c, d), Kc = Ic / q.h, kt = Kb(q.c, q.zb, d) + (q.c.ust && q.zb >= q.c.zt - 1e-6 ? kC * E * Icol(q.c.ust, d) / q.c.ust.H : 0) * 0, kb = q.tabanda ? 0 : Kb(q.c, q.za, d);
      let a; if (q.tabanda) { const kk = kt / Kc; a = (0.5 + kk) / (2 + kk); } else { const kk = (kt + kb) / (2 * Kc); a = kk / (2 + kk); } a = Math.max(0.05, Math.min(1, a || 0.05));
      const he = Math.max(0.5 * q.h, q.h - rz * hbUc(q.c, q.zb)); // kiriş düğümün altına sarkar: rijit bölge yalnız segmentin üst ucunda
      return { a, k: a * 12 * Ic / he ** 3, kTam: 12 * E * Icol(q.c, d) / q.h ** 3, he }; };
    katlar.forEach(k => { k.seg = segler.filter(q => q.za <= k.alt + 0.15 && q.zb >= k.z - 0.15); });
    const sWH = katlar.reduce((t, k) => t + k.w * k.H, 0), g9 = 9.81;
    const yonHesap = d => {
      const K = katlar.map(k => { const el = k.seg.map(q => Object.assign({ q }, segK(q, d))); const wl = k.per.filter(w => { const wu = sub(w.b, w.a), l = len(wu); return yon([wu[0] / l, wu[1] / l]) === d; }).map(w => { const L = len(sub(w.b, w.a)), I = 0.5 * w.t * L ** 3 / 12; return { w, k: 1 / (k.h ** 3 / (3 * E * I) + 1.2 * k.h / (0.4 * E * w.t * L)) }; }); return { el, wl, K: el.reduce((t, q) => t + q.k, 0) + wl.reduce((t, q) => t + q.k, 0) }; });
      const kuvvet = T => { const SaR = SDS > 0 ? Sae(T) / Ra(T) : 0, Vt = Math.max(Wt * SaR, 0.04 * dv.I * SDS * Wt), dFN = 0.0075 * katlar.length * Vt, F = katlar.map((k, i) => (sWH > 0 ? (Vt - dFN) * k.w * k.H / sWH : 0) + (i === katlar.length - 1 ? dFN : 0)), V = F.map((_, i) => F.slice(i).reduce((t, q) => t + q, 0)); return { SaR, Vt, F, V }; };
      // düğümler: taban (0) + kat kotları (1..n); her kolon segmenti / perde iki düğüm arasında yay → K·u = F
      const n = katlar.length, iz = z => { if (z <= katlar[0].alt + 0.15) return 0; let b = 0, e = 1e9; katlar.forEach((k, i) => { const d0 = Math.abs(k.z - z); if (d0 < e) { e = d0; b = i + 1; } }); return b; };
      const yay = []; const ekle = (a, b, k, ref) => { if (a !== b && k > 0) yay.push({ a: Math.min(a, b), b: Math.max(a, b), k, ref }); };
      const gor = new Set(); K.forEach((KK, i) => { KK.el.forEach(q => { if (gor.has(q.q)) return; gor.add(q.q); ekle(iz(q.q.za), iz(q.q.zb), q.k, q); }); KK.wl.forEach(w => ekle(i, i + 1, w.k, w)); });
      const coz = F => { const A = Array.from({ length: n }, () => new Array(n).fill(0)), B = F.slice(); for (const y of yay) { const ia = y.a - 1, ib = y.b - 1; if (ia >= 0) A[ia][ia] += y.k; if (ib >= 0) A[ib][ib] += y.k; if (ia >= 0 && ib >= 0) { A[ia][ib] -= y.k; A[ib][ia] -= y.k; } }
        for (let i = 0; i < n; i++) if (A[i][i] <= 0) A[i][i] = 1e-9; // bağlantısız düğüm
        for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; [B[c], B[p]] = [B[p], B[c]]; for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; B[r] -= f * B[c]; } }
        const u = new Array(n).fill(0); for (let r = n - 1; r >= 0; r--) { let t = B[r]; for (let k = r + 1; k < n; k++) t -= A[r][k] * u[k]; u[r] = t / A[r][r]; } return u; };
      const f0 = kuvvet(Temp), dd = coz(f0.F);
      const TR = dd.some(v => v > 0) ? 2 * Math.PI * Math.sqrt(katlar.reduce((t, k, i) => t + k.w / g9 * dd[i] ** 2, 0) / Math.max(1e-9, katlar.reduce((t, k, i) => t + f0.F[i] * dd[i], 0))) : Temp;
      const T = dv.Ct > 0 && dv.Tyontem === 'AMP' ? Temp : Math.min(TR, 1.4 * Temp), r = kuvvet(T);
      const lam = Sae3 ? Sae3(T) / Sae(T) : null, kap = +dv.kappa || 1, lim = (+dv.otelemeLim || 0.008) * kap;
      const u = coz(r.F), Vs = new Map(); yay.forEach(y => Vs.set(y.ref, y.k * ((y.b ? u[y.b - 1] : 0) - (y.a ? u[y.a - 1] : 0))));
      const ote = katlar.map((k, i) => { const D0 = Math.abs(u[i] - (i ? u[i - 1] : 0)), de = D0 * dv.R / dv.I, oran = k.h > 0 ? de / k.h : 0; return { u: u[i], D0, de, oran, lam: lam != null ? lam * oran : null, ok: lam != null ? lam * oran <= lim : null }; });
      return { d, K, TR, T, Temp, Tlim: 1.4 * Temp, Sae: Sae(T), Ra: Ra(T), ...r, Vmin: 0.04 * dv.I * SDS * Wt, lam, lim, ote, Vs };
    };
    const YX = yonHesap('X'), YY = yonHesap('Y'), T1 = YX.T, SaR = YX.SaR, Vt = YX.Vt;
    katlar.forEach((k, i) => { k.Fd = { X: YX.F[i], Y: YY.F[i] }; k.Vd = { X: YX.V[i], Y: YY.V[i] }; k.F = YX.F[i]; k.V = YX.V[i]; });
    kolonlar.forEach(c => { c.ME = { X: { V: 0, t: 0, b: 0 }, Y: { V: 0, t: 0, b: 0 } }; });
    for (const [d, Y] of [['X', YX], ['Y', YY]]) katlar.forEach((k, i) => {
      const KK = Y.K[i]; k['perdePay' + d] = KK.K ? KK.wl.reduce((t, q) => t + q.k, 0) / KK.K : 0;
      for (const q of KK.el) { const Vc = Math.abs(Y.Vs.has(q.q) ? Y.Vs.get(q.q) : (KK.K ? Y.V[i] * q.k / KK.K : 0)), f = q.q.tabanda ? [0.4, 0.6] : [0.5, 0.5], m = q.q.c.ME[d]; if (Vc * q.q.h > m.t + m.b) q.q.c.ME[d] = { V: Vc, t: Vc * q.q.h * f[0], b: Vc * q.q.h * f[1] }; }
    });
    // düğümde kirişlere dağıtım; kiriş deprem uç momentleri
    for (const ch of zincirler) { ch.acik = []; if (!ch.ok0) continue; const sp = ch.supN; for (let j = 0; j < sp.length - 1; j++) { const s0 = sp[j].s, s1 = sp[j + 1].s; if (s1 - s0 < 0.3) continue; const sg = segAt(ch, (s0 + s1) / 2); ch.acik.push({ j, s0, s1, L: s1 - s0, kEI: sg.bw * sg.hb ** 3 / 12 / (s1 - s0), MEl: 0, MEr: 0 }); } }
    for (const c of kolonlar) for (const d of ['X', 'Y']) {
      const SM = c.ME[d].t + (c.ust ? c.ust.ME[d].b : 0); if (!SM) continue;
      const uc = []; for (const ch of zincirler) { if (ch.d !== d || !ch.ok0) continue; const j = ch.supN.findIndex(q => q.tip === 'kolon' && q.c === c); if (j < 0) continue; ch.acik.forEach(a => { if (a.j === j) uc.push([a, 'l']); if (a.j + 1 === j) uc.push([a, 'r']); }); }
      const sk = uc.reduce((t, [a]) => t + a.kEI, 0); uc.forEach(([a, sd]) => { a['ME' + sd] += SM * a.kEI / sk; });
    }
    for (const ch of zincirler) for (const a of ch.acik) {
      a.VE = (a.MEl + a.MEr) / a.L;
      const qa = ch.supN[a.j], qb = ch.supN[a.j + 1], d = ch.d || 'X';
      if (qa.tip === 'kolon') qa.c.NE[d] += a.VE; if (qb.tip === 'kolon') qb.c.NE[d] -= a.VE;
    }
    for (const c of kSira) { c.NEt = { X: c.NE.X + (c.ust ? c.ust.NEt.X : 0), Y: c.NE.Y + (c.ust ? c.ust.NEt.Y : 0) }; }
    const deprem = { W: Wt, HN, T1, Ct, Temp, SDS, SD1, TA, TB, Sae: SDS > 0 ? Sae(T1) : 0, Ra: Ra(T1), SaR, Vt, Vmin: 0.04 * dv.I * SDS * Wt, yon: { X: YX, Y: YY }, kC, kB, katlar: katlar.map(k => ({ z: k.z, H: k.H, h: k.h, w: k.w, F: k.F, V: k.V, Fd: k.Fd, Vd: k.Vd, nk: k.seg.length, perdePayX: k.perdePayX, perdePayY: k.perdePayY })), R: dv.R, D: dv.D, I: dv.I, n: dv.n };

    /* ---- kiriş tasarımı ---- */
    const fctd = MAL.fctd * 1000, fcd = MAL.fcd * 1000, fyd = MAL.fyd * 1000, fywd = 420 / 1.15 * 1000, fywk = 420e3;
    for (const ch of zincirler) {
      if (!ch.ok0) continue;
      const xs = ch.xs, Nn = xs.length, mE = (a, s) => { const xi = (s - a.s0) / a.L; return a.MEl * (1 - xi) - a.MEr * xi; };
      const acOf = s => ch.acik.find(a => s >= a.s0 - 1e-6 && s <= a.s1 + 1e-6);
      const Mmax = new Float64Array(Nn), Mmin = new Float64Array(Nn);
      for (let i = 0; i < Nn; i++) {
        const G1 = ch.G.M[i], Qs = [ch.Q.M[i], ch.Qt.M[i], ch.Qc.M[i]], a = acOf(xs[i]), Ee = a ? mE(a, xs[i]) : 0;
        const vals = [...Qs.map(q => 1.4 * G1 + 1.6 * q), G1 + ch.Q.M[i] + Ee, G1 + ch.Q.M[i] - Ee, 0.9 * G1 + Ee, 0.9 * G1 - Ee];
        Mmax[i] = Math.max(...vals); Mmin[i] = Math.min(...vals);
      }
      ch.Mmax = Mmax; ch.Mmin = Mmin;
      // mesnet ve açıklık tasarımı
      const tasD = (M, bw, hb) => { const d = hb - dv.cK - 0.010 - 0.008, req = asReq(M, bw, d, MAL), Amin = 0.8 * fctd / fyd * bw * d; return { M, d, req, Amin, A: Math.max(req || 0, Amin) }; };
      ch.mes = ch.supN.map((q, j) => {
        const sg = segAt(ch, q.s), win = 0.3 * Math.max(1, ...ch.acik.filter(a => a.j === j || a.j + 1 === j).map(a => a.L));
        let Mn = 0, Mp = 0; for (let i = 0; i < Nn; i++) if (Math.abs(xs[i] - q.s) <= win / 3) { Mn = Math.max(Mn, -Mmin[i]); Mp = Math.max(Mp, Mmax[i]); }
        const ust = tasD(Mn, sg.bw, sg.hb), alt = tasD(Mp, sg.bw, sg.hb);
        return { j, s: q.s, tip: q.tip, bw: sg.bw, hb: sg.hb, ust, alt };
      });
      for (const a of ch.acik) {
        const sg = segAt(ch, (a.s0 + a.s1) / 2); let Mp = 0, Vd = 0;
        for (let i = 0; i < Nn; i++) if (xs[i] > a.s0 + 1e-6 && xs[i] < a.s1 - 1e-6) Mp = Math.max(Mp, Mmax[i]);
        ch.elm.forEach(e => { const sm = xs[e.i] + e.L / 2; if (sm < a.s0 || sm > a.s1) return; for (const k of [0, 1]) { const vg = ch.G.V[e.i][k], vq = Math.max(...[ch.Q, ch.Qt, ch.Qc].map(r => Math.abs(r.V[e.i][k]))); Vd = Math.max(Vd, Math.abs(1.4 * vg) + 1.6 * vq); } });
        a.bw = sg.bw; a.hb = sg.hb; a.alt = tasD(Mp, sg.bw, sg.hb); a.Vd = Vd;
        a.Vg = 0; ch.elm.forEach(e => { const sm = xs[e.i] + e.L / 2; if (sm < a.s0 || sm > a.s1) return; for (const k of [0, 1]) a.Vg = Math.max(a.Vg, Math.abs(ch.G.V[e.i][k] + ch.Q.V[e.i][k])); });
      }
      // konsollar (zincir ucu mesnet dışı)
      ch.konsol = [];
      const s0 = ch.supN[0].s, s1 = ch.supN[ch.supN.length - 1].s;
      if (s0 > 0.3) ch.konsol.push({ s0: 0, s1: s0, uc: 'bas' }); if (ch.L - s1 > 0.3) ch.konsol.push({ s0: s1, s1: ch.L, uc: 'son' });
      // donatı seçimi
      ch.mes.forEach(m => { m.ustD = kirisDon(m.ust.A, m.bw, dv.cK); });
      ch.acik.forEach(a => {
        const mL = ch.mes[a.j], mR = ch.mes[a.j + 1];
        const altA = Math.max(a.alt.A, mL.alt.A, mR.alt.A, 0.5 * Math.max(mL.ust.A, mR.ust.A) * (SDS > 0 ? 1 : 0.3)); // TBDY: mesnette alt ≥ 0.5 üst
        a.altD = kirisDon(altA, a.bw, dv.cK);
        // süreklilik (montaj) üst: ≥ 2Ø12 ve ≥ mesnet üstünün 1/4'ü
        a.montaj = kirisDon(Math.max(2 * Ab(12), Math.max(mL.ust.A, mR.ust.A) / 4), a.bw, dv.cK);
        // ρ kontrolleri
        const d = a.alt.d, rb = 0.85 * k1Of(MAL.fck) * fcd / fyd * 0.003 * 2e8 / (0.003 * 2e8 + fyd); a.rhoMax = Math.min(0.02, 0.85 * rb);
        const ustMax = Math.max(mL.ustD ? mL.ustD.As : 0, mR.ustD ? mR.ustD.As : 0);
        a.rho = Math.max(a.altD ? a.altD.As : 0, ustMax) / (a.bw * d); a.rhoOk = a.rho <= a.rhoMax + 1e-9;
        // kesme: TBDY kapasite (Mp = 1.4 Mr)
        const MrL = mL.ustD ? Mr(mL.ustD.As, a.bw, d, MAL) : 0, MrR = mR.ustD ? Mr(mR.ustD.As, a.bw, d, MAL) : 0, MrA = a.altD ? Mr(a.altD.As, a.bw, d, MAL) : 0;
        const cw = q => (q.tip === 'kolon' ? (ch.d === 'Y' ? q.c.by : q.c.bx) / 2 : q.tip === 'perde' ? q.w.t / 2 : 0.15), ln = Math.max(0.3, a.L - cw(ch.supN[a.j]) - cw(ch.supN[a.j + 1]));
        a.ln = ln; a.Ve = SDS > 0 ? a.Vg + 1.4 * Math.max(MrL + MrA, MrA + MrR) / ln : 0; a.Vtas = Math.max(a.Vd, a.Ve);
        a.Vmax = 0.22 * fcd * a.bw * d; a.Vok = a.Vtas <= a.Vmax;
        const Vc = 0.8 * 0.65 * fctd * a.bw * d, Fl = Math.min(a.altD ? a.altD.F : 12, mL.ustD ? mL.ustD.F : 12);
        const etr = (V, VcU, sMax) => { const need = Math.max((V - VcU) / (fywd * d), 0.3 * fctd / fywd * a.bw); for (const Fe of [8, 10, 12]) for (const nl of [2, 3, 4]) { const sReq = nl * Ab(Fe) / need, s = Math.floor(Math.min(sReq, sMax) * 100) / 100; if (s >= 0.05) return { F: Fe, n: nl, s }; } return null; };
        a.etrS = etr(a.Vtas, SDS > 0 ? 0 : Vc, Math.min(a.hb / 4, 8 * Fl / 1000, 0.15)); // sarılma (2h)
        a.etrO = etr(Math.max(a.Vd, a.Vg), Vc, Math.min(d / 2, 0.20));
        a.lsar = 2 * a.hb;
        a.dimOk = a.bw >= 0.25 - 1e-6 && a.hb >= 0.30 - 1e-6 && a.hb >= 3 * tSv(ch.z) - 1e-6 && a.hb <= 3.5 * a.bw + 1e-6;
        a.sehimOk = a.hb >= a.L / (ch.acik.length > 1 ? 14 : 12) - 1e-6;
        a.ok = !!(a.altD && mL.ustD && mR.ustD && a.etrS && a.etrO) && a.Vok && a.rhoOk && isFinite(a.alt.req) && isFinite(mL.ust.req) && isFinite(mR.ust.req);
        a.MrL = MrL; a.MrR = MrR; a.MrA = MrA;
      });
      ch.ok = ch.acik.every(a => a.ok);
    }

    if (P.cerceve3BHook) { try { P.cerceve3BHook({ kolonlar, zincirler, katlar, perdeler, dosemeler, dv, E, gc, SDS, tSv, segAt, deprem, zRijit: S.geo && S.suYapisi !== false && S.geo.kUst != null ? +S.geo.kUst : null }); } catch (er) { uyar.push('3B çerçeve analizi yapılamadı (yaklaşık yöntem kullanıldı): ' + er.message); console.error(er); } }
    /* ---- kolon tasarımı ---- */
    for (const c of kolonlar) {
      const Ac = c.bx * c.by, em = d => 0.015 + 0.03 * (d === 'X' ? c.bx : c.by);
      const MgX = c.Mg.X, MgY = c.Mg.Y, MEx = Math.max(c.ME.X.t, c.ME.X.b), MEy = Math.max(c.ME.Y.t, c.ME.Y.b), NEx = c.NEt.X, NEy = c.NEt.Y;
      const K0 = [{ ad: '1.4G+1.6Q', N: 1.4 * c.NG + 1.6 * c.NQ, Mx: 1.4 * MgX.G + 1.6 * MgX.Q, My: 1.4 * MgY.G + 1.6 * MgY.Q, dep: false }];
      if (SDS > 0) for (const [d, sg] of [['X', 1], ['X', -1], ['Y', 1], ['Y', -1]]) {
        const NE = d === 'X' ? NEx + 0.3 * NEy : NEy + 0.3 * NEx, mx = d === 'X' ? MEx : 0.3 * MEx, my = d === 'Y' ? MEy : 0.3 * MEy;
        K0.push({ ad: `G+Q${sg > 0 ? '+' : '−'}E${d}`, N: c.NG + c.NQ + sg * NE, Mx: MgX.G + MgX.Q + mx, My: MgY.G + MgY.Q + my, dep: true });
        K0.push({ ad: `0.9G${sg > 0 ? '+' : '−'}E${d}`, N: 0.9 * c.NG + sg * NE, Mx: 0.9 * MgX.G + mx, My: 0.9 * MgY.G + my, dep: true });
      }
      /* su yapısı (3B kabuk) yükleri: perdeye gömülü kolonun toprak / su / YAS / deprem itkisinden aldığı moment (TSM zarfı, P.kabukKolonYuk).
         Kabuk "güçlü" moment perde normali doğrultusunda yer değiştirmedir: perde X boyunca → yer değiştirme Y → My; zayıf → Mx.
         Çerçeve momentleriyle aynı noktada oluşmasalar da güvenli tarafta mutlak değerce toplanır (depremli kombinasyonlara depremli zarf). */
      const KB = (P.kabukKolonYuk || []).find(q => q.id != null && q.id === c.id);
      if (KB) { c.kabuk = KB; K0.forEach(k => { const z = k.dep ? KB.Md : KB.Mn, gu = z.M3, za = z.M2; if (KB.yon === 'Y') { k.My = Math.abs(k.My) + gu; k.Mx = Math.abs(k.Mx) + za; } else { k.Mx = Math.abs(k.Mx) + gu; k.My = Math.abs(k.My) + za; } k.kabuk = true; }); }
      K0.forEach(k => { k.Mx = Math.max(Math.abs(k.Mx), Math.abs(k.N) * em('X')); k.My = Math.max(Math.abs(k.My), Math.abs(k.N) * em('Y')); });
      c.komb = K0;
      c.Nmax = Math.max(...K0.map(k => k.N)); c.NdmD = Math.max(...K0.filter(k => k.dep).map(k => k.N), 0);
      c.eksenOk = K0[0].N <= 0.6 * MAL.fck * 1000 * Ac + 1e-6 && (!SDS || c.NdmD <= 0.4 * MAL.fck * 1000 * Ac + 1e-6);
      c.dimOk = Math.min(c.bx, c.by) >= 0.30 - 1e-6 && Ac >= 0.075 - 1e-9;
      // boyuna donatı
      let best = null;
      for (const F of CAP_C) {
        const c1 = dv.cC + 0.010 + F / 2000, nb0 = Math.max(2, Math.ceil((c.bx - 2 * c1) / 0.20) + 1), nh0 = Math.max(2, Math.ceil((c.by - 2 * c1) / 0.20) + 1);
        for (let nb = nb0; nb <= nb0 + 3; nb++) for (let nh = nh0; nh <= nh0 + 3; nh++) {
          const bars = kolonBars(c.bx, c.by, F, nb, nh, dv.cC), As = bars.length * Ab(F), rho = As / Ac;
          if (rho < 0.01 - 1e-9 || rho > 0.04 + 1e-9) continue;
          if (best && As >= best.As - 1e-9) continue;
          let ok = true, um = 0;
          for (const k of K0) { const mx = kolonMr(c.bx, c.by, bars, Ab(F), k.N, 'x', MAL), my = kolonMr(c.bx, c.by, bars, Ab(F), k.N, 'y', MAL); const u = (mx > 0 ? k.Mx / mx : 9) + (my > 0 ? k.My / my : 9); um = Math.max(um, u); if (u > 1) { ok = false; break; } }
          if (ok) best = { F, nb, nh, n: bars.length, As, rho, bars, um };
        }
      }
      c.don = best; c.donOk = !!best;
      // etriye (TBDY 7.3.4 sarılma, 7.3.7 kesme)
      const Fl = best ? best.F : 16, bmin = Math.min(c.bx, c.by), bmax = Math.max(c.bx, c.by), ln = Math.max(0.5, c.H - 0.5);
      const sS = Math.max(0.05, Math.floor(Math.min(bmin / 3, 0.15, 6 * Fl / 1000) * 100) / 100), sO = Math.floor(Math.min(bmin / 2, 0.20, 8 * Fl / 1000) * 100) / 100;
      const Ndm = SDS > 0 ? c.NdmD : 0;
      const Mrk = best ? Math.max(...['x', 'y'].map(e => kolonMr(c.bx, c.by, best.bars, Ab(best.F), Math.max(c.NG + c.NQ, 1), e, MAL))) : 0;
      const VE = Math.max(c.ME.X.V, c.ME.Y.V), Ve = SDS > 0 ? Math.min(2 * 1.4 * Mrk / ln, (VE ? VE * dv.D : Infinity)) : 0;
      const d = Math.max(c.bx, c.by) - dv.cC - 0.02, bw = Math.min(c.bx, c.by), Vmax = 0.22 * fcd * bw * d;
      c.Ve = Ve; c.Vok = Ve <= Vmax;
      const etr = (Fe) => {
        const nl = d2 => { const bk = d2 - 2 * dv.cC, Ack = (c.bx - 2 * dv.cC) * (c.by - 2 * dv.cC); const Ash = Math.max(Ndm > 0.2 * MAL.fck * 1000 * Ac ? 0.30 * sS * bk * (Ac / Ack - 1) * MAL.fck / 420 : 0, 0.075 * sS * bk * MAL.fck / 420); const Asw = SDS > 0 ? Ve * sS / (fywd * d) : 0; return Math.max(2, Math.ceil(Math.max(Ash, Asw) / Ab(Fe))); };
        return { F: Fe, nx: nl(c.by), ny: nl(c.bx) };
      };
      let e = etr(8); if (Math.max(e.nx, e.ny) > 4) e = etr(10); if (Math.max(e.nx, e.ny) > 5) e = etr(12);
      c.etr = Object.assign(e, { sS, sO, lsar: Math.max(bmax, ln / 6, 0.5) });
      c.Mrk = Mrk; c.ok = c.donOk && c.eksenOk && c.dimOk && c.Vok;
      if (best && best.n > 0) { c.etr.ok = Math.max(e.nx, e.ny) <= 6; c.ok = c.ok && c.etr.ok; }
    }
    { const kk = kolonlar.filter(c => c.kabuk); if (kk.length) uyar.push(`Su yapısı (3B kabuk) modelinden perdeye gömülü kolonlara gelen momentler kolon kombinasyonlarına eklendi (depremsiz / depremli, kNm): ${kk.map(c => `${c.no || 'Kolon'} ${Math.round(c.kabuk.Mn.M3)} / ${Math.round(c.kabuk.Md.M3)}`).join(', ')}.`); }
    // güçlü kolon (TBDY 7.3.6): (Mra + Mrü) ≥ 1.2 (Mri + Mrj)
    const gk = [];
    for (const c of kolonlar) {
      if (!c.ust || !c.don || !c.ust.don) continue;
      for (const d of ['X', 'Y']) {
        let Mb = 0; for (const ch of zincirler) { if (ch.d !== d || !ch.ok0) continue; const j = ch.supN.findIndex(q => q.tip === 'kolon' && q.c === c); if (j < 0) continue; const aL = ch.acik.find(a => a.j + 1 === j), aR = ch.acik.find(a => a.j === j); const v1 = (aL ? aL.MrR : 0) + (aR ? aR.MrA : 0), v2 = (aL ? aL.MrA : 0) + (aR ? aR.MrL : 0); Mb += Math.max(v1, v2); }
        if (!Mb) continue;
        const e = d === 'X' ? 'x' : 'y', Na = Math.max(...c.ust.komb.filter(k => k.dep).map(k => k.N), c.ust.NG + c.ust.NQ), Nu = Math.max(...c.komb.filter(k => k.dep).map(k => k.N), c.NG + c.NQ);
        const Mc = kolonMr(c.ust.bx, c.ust.by, c.ust.don.bars, Ab(c.ust.don.F), Na, e, MAL) + kolonMr(c.bx, c.by, c.don.bars, Ab(c.don.F), Nu, e, MAL);
        gk.push({ c, d, Mc, Mb, ok: Mc >= 1.2 * Mb });
      }
    }

    const RC = { MAL, ayar: dv, seviyeler, dosemeler, zincirler, kolonlar, katlar, deprem, gk, uyar, perdeler };
    RC.ok = dosemeler.every(d => d.ok !== false) && zincirler.every(ch => ch.ok !== false) && kolonlar.every(c => c.ok) && gk.every(q => q.ok);
    RC.donati = P.cerceveDonati3B(RC);
    RC.metraj = metraj(RC.donati);
    return RC;
  };

  const metraj = gr => { const m = {}; for (const g of gr) for (const b of g.bars) { let L = 0; for (let i = 1; i < b.length; i++) L += Math.hypot(b[i][0] - b[i - 1][0], b[i][1] - b[i - 1][1], b[i][2] - b[i - 1][2]); m[g.F] = (m[g.F] || 0) + L; } return Object.keys(m).map(F => ({ F: +F, L: m[F], kg: m[F] * Ab(+F) * 7850 })).sort((a, b) => a.F - b.F); };

  /* ================= 3B DONATI (mutlak koordinat) ================= */
  P.cerceveDonati3B = (RC) => {
    const out = [], dv = RC.ayar, grup = (eleman, tanim, F, s) => { const o = { mutlak: true, poz: null, F, s: s || 0, eleman, tanim, bars: [] }; out.push(o); return o; };
    const rr = q => q.map(v => Math.round(v * 1000) / 1000);
    // döşemeler
    for (const d of RC.dosemeler) {
      if (!d.don) continue; const c = dv.cD, z0 = d.zt - d.t + c, z1 = d.zt - c, ad = d.no || 'Döşeme';
      const X0 = d.x0 + c, X1 = d.x1 - c, Y0 = d.y0 + c, Y1 = d.y1 - c;
      const sir = (a, b, s) => { const n = Math.max(1, Math.round((b - a) / s)), r = []; for (let i = 0; i <= n; i++) r.push(a + (b - a) * i / n); return r; };
      const kisaX = d.lx <= d.ly, zA = (dis, F) => z0 + F / 2000 + (dis ? 0 : 0.010), zU = (dis, F) => z1 - F / 2000 - (dis ? 0 : 0.010);
      const ax = d.don.altX, ay = d.don.altY, ux = d.don.ustX, uy = d.don.ustY;
      if (ax && ax.F) { const o = grup(ad, 'Alt X', ax.F, ax.s); for (const y of sir(Y0, Y1, ax.s)) o.bars.push([rr([X0, y, zA(kisaX, ax.F)]), rr([X1, y, zA(kisaX, ax.F)])]); }
      if (ay && ay.F) { const o = grup(ad, 'Alt Y', ay.F, ay.s); for (const x of sir(X0, X1, ay.s)) o.bars.push([rr([x, Y0, zA(!kisaX, ay.F)]), rr([x, Y1, zA(!kisaX, ay.F)])]); }
      if (ux && ux.F) { const o = grup(ad, 'Üst X (mesnet)', ux.F, ux.s); const l = d.lx / 4 + 0.3; for (const y of sir(Y0, Y1, ux.s)) { if (d.kenar.L) o.bars.push([rr([X0, y, zU(kisaX, ux.F)]), rr([X0 + l, y, zU(kisaX, ux.F)])]); if (d.kenar.R) o.bars.push([rr([X1 - l, y, zU(kisaX, ux.F)]), rr([X1, y, zU(kisaX, ux.F)])]); } }
      if (uy && uy.F) { const o = grup(ad, 'Üst Y (mesnet)', uy.F, uy.s); const l = d.ly / 4 + 0.3; for (const x of sir(X0, X1, uy.s)) { if (d.kenar.B) o.bars.push([rr([x, Y0, zU(!kisaX, uy.F)]), rr([x, Y0 + l, zU(!kisaX, uy.F)])]); if (d.kenar.T) o.bars.push([rr([x, Y1 - l, zU(!kisaX, uy.F)]), rr([x, Y1, zU(!kisaX, uy.F)])]); } }
    }
    // kirişler
    for (const ch of RC.zincirler) {
      if (!ch.acik || !ch.acik.length) continue;
      const u = ch.u, n = [-u[1], u[0]], P3 = (s, o, z) => rr([ch.a[0] + u[0] * s + n[0] * o, ch.a[1] + u[1] * s + n[1] * o, z]);
      const s0 = 0.03, s1 = ch.L - 0.03, ad = ch.ad;
      for (const a of ch.acik) {
        const bw = a.bw, hb = a.hb, c = dv.cK + 0.010, zt = ch.z - c, zb = ch.z - hb + c, yy = k => { const w = bw / 2 - c; return k.n === 1 ? [0] : Array.from({ length: Math.min(k.n, 8) }, (_, i) => -w + 2 * w * i / (Math.min(k.n, 8) - 1)); };
        const A0 = Math.max(s0, a.s0 - 0.3), A1 = Math.min(s1, a.s1 + 0.3);
        if (a.altD) { const o = grup(ad, `Alt ${a.altD.n}Ø${a.altD.F}`, a.altD.F); for (const y of yy(a.altD)) o.bars.push([P3(A0, y, zb + a.altD.F / 2000), P3(A1, y, zb + a.altD.F / 2000)]); }
        if (a.montaj) { const o = grup(ad, `Üst montaj ${a.montaj.n}Ø${a.montaj.F}`, a.montaj.F); for (const y of yy(a.montaj)) o.bars.push([P3(A0, y, zt - a.montaj.F / 2000), P3(A1, y, zt - a.montaj.F / 2000)]); }
        // etriyeler
        const e1 = a.etrS, e2 = a.etrO; if (e1 && e2) {
          const o = grup(ad, `Etriye Ø${e1.F}/${Math.round(e1.s * 100)}-${Math.round(e2.s * 100)}`, e1.F), w = bw / 2 - dv.cK - e1.F / 2000, z0e = ch.z - hb + dv.cK + e1.F / 2000, z1e = ch.z - dv.cK - e1.F / 2000;
          const ilk = a.s0 + (a.L - a.ln) / 2 + 0.05, son = a.s1 - (a.L - a.ln) / 2 - 0.05; let s = ilk; const sar = x => x < ilk + a.lsar || x > son - a.lsar;
          while (s <= son + 1e-6) { o.bars.push([P3(s, -w, z0e), P3(s, w, z0e), P3(s, w, z1e), P3(s, -w, z1e), P3(s, -w, z0e)]); s += sar(s) ? e1.s : e2.s; }
        }
      }
      // mesnet ek üst donatıları
      ch.mes.forEach((m, j) => {
        if (!m.ustD) return; const aL = ch.acik.find(a => a.j + 1 === j), aR = ch.acik.find(a => a.j === j);
        const ekA = Math.max(0, m.ustD.As - Math.max(aL && aL.montaj ? aL.montaj.As : 0, aR && aR.montaj ? aR.montaj.As : 0)); if (ekA < 1e-6) return;
        const ek = kirisDon(ekA, m.bw, dv.cK, 1); if (!ek) return;
        const l0 = Math.max(0.03, m.s - (aL ? aL.L / 3 : 0)), l1 = Math.min(ch.L - 0.03, m.s + (aR ? aR.L / 3 : 0)), c = dv.cK + 0.010, w = m.bw / 2 - c - 0.03, zt = ch.z - c - ek.F / 2000;
        const o = grup(ad, `Mesnet ek üst ${ek.n}Ø${ek.F}`, ek.F); const ys = ek.n === 1 ? [0] : Array.from({ length: Math.min(ek.n, 6) }, (_, i) => -w + 2 * w * i / (Math.min(ek.n, 6) - 1));
        for (const y of ys) o.bars.push([P3(l0, y, zt - 0.03), P3(l1, y, zt - 0.03)]);
      });
    }
    // kolonlar
    for (const c of RC.kolonlar) {
      if (!c.don) continue; const ad = c.no || 'Kolon', z0 = c.z0 + 0.05, z1 = c.zt - 0.04 + (c.ust ? 0.6 : 0);
      const o = grup(ad, `Boyuna ${c.don.n}Ø${c.don.F}`, c.don.F); for (const q of c.don.bars) o.bars.push([rr([c.x + q[0], c.y + q[1], z0]), rr([c.x + q[0], c.y + q[1], z1])]);
      const e = c.etr, oe = grup(ad, `Etriye Ø${e.F}/${Math.round(e.sS * 100)}-${Math.round(e.sO * 100)}`, e.F), wx = c.bx / 2 - RC.ayar.cC - e.F / 2000, wy = c.by / 2 - RC.ayar.cC - e.F / 2000;
      let z = c.z0 + 0.05; const sar = zz => zz < c.z0 + e.lsar || zz > c.zt - e.lsar;
      while (z <= c.zt - 0.03) { oe.bars.push([rr([c.x - wx, c.y - wy, z]), rr([c.x + wx, c.y - wy, z]), rr([c.x + wx, c.y + wy, z]), rr([c.x - wx, c.y + wy, z]), rr([c.x - wx, c.y - wy, z])]); z += sar(z) ? e.sS : e.sO; }
    }
    return out;
  };

  /* ================= RAPOR (HTML) ================= */
  P.cerceveRapor = (RC0, f2) => {
    const ss = (a, b) => String(a || '').localeCompare(String(b || ''), 'tr', { numeric: true }), RC = Object.assign({}, RC0, { zincirler: RC0.zincirler.slice().sort((a, b) => ss(a.ad, b.ad)), kolonlar: RC0.kolonlar.slice().sort((a, b) => ss(a.no, b.no)), dosemeler: RC0.dosemeler.slice().sort((a, b) => ss(a.no, b.no)) });
    const cmS = v => Math.round(v * 100), D = RC.deprem, M = RC.MAL, ok = v => (v ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>');
    let h = `<h2>KİRİŞ · KOLON · DÖŞEME HESABI</h2>`;
    h += `<p>Çerçeve elemanları ArıtmaCAD modelinden alınmıştır: ${RC.kolonlar.length} kolon, ${RC.zincirler.reduce((t, c) => t + c.segs.length, 0)} kiriş (${RC.zincirler.length} sürekli kiriş zinciri), ${RC.dosemeler.length} döşeme. Hesap TS 500:2000 ve TBDY 2018'e göre ön boyutlandırma niteliğindedir; döşemeler sonlu eleman plak, kirişler kolon dönme rijitliği yaylı sürekli kiriş olarak çözülmüş, deprem eşdeğer deprem yükü yöntemiyle yaklaşık dağıtılmıştır. Kesin projede üç boyutlu çerçeve analizi ile doğrulanmalıdır.</p>`;
    if (RC.uyar.length) h += `<div class="msg">${RC.uyar.map(u => '⚠ ' + u).join('<br>')}</div>`;
    if (P.tbdyRapor) h += P.tbdyRapor(RC, f2); else {
    h += `<h3>Deprem (TBDY 2018 eşdeğer deprem yükü)</h3><p>W = ${f2(D.W, 0)} kN (G + ${D.n}Q) · H<sub>N</sub> = ${f2(D.HN)} m · T<sub>1</sub> = C<sub>t</sub>·H<sup>3/4</sup> = ${D.Ct}·${f2(D.HN)}<sup>0.75</sup> = ${f2(D.T1, 3)} s · S<sub>DS</sub> = ${f2(D.SDS, 3)}, S<sub>D1</sub> = ${f2(D.SD1, 3)}, T<sub>A</sub> = ${f2(D.TA, 3)}, T<sub>B</sub> = ${f2(D.TB, 3)} s · S<sub>ae</sub>(T) = ${f2(D.Sae, 3)} g · R = ${D.R}, D = ${D.D}, I = ${D.I} → R<sub>a</sub> = ${f2(D.Ra)} · S<sub>aR</sub> = ${f2(D.SaR, 4)} g</p>`;
    h += `<p>V<sub>t</sub> = max(W·S<sub>aR</sub> ; 0.04·I·S<sub>DS</sub>·W) = max(${f2(D.W * D.SaR, 1)} ; ${f2(D.Vmin, 1)}) = <b>${f2(D.Vt, 1)} kN</b></p>`;
    h += `<table><tr><th>Kat kotu</th><th>H (m)</th><th>h (m)</th><th>w (kN)</th><th>F (kN)</th><th>V (kN)</th><th>Kolon</th><th>Perde payı X / Y</th></tr>${D.katlar.map(k => `<tr><td>${f2(k.z)}</td><td>${f2(k.H)}</td><td>${f2(k.h)}</td><td>${f2(k.w, 0)}</td><td>${f2(k.F, 1)}</td><td>${f2(k.V, 1)}</td><td>${k.nk}</td><td>%${Math.round((k.perdePayX || 0) * 100)} / %${Math.round((k.perdePayY || 0) * 100)}</td></tr>`).join('')}</table>`;
    }
    h += `<h3>Döşemeler (TS 500 Bölüm 11)</h3><table><tr><th>Döşeme</th><th>l<sub>x</sub> × l<sub>y</sub></th><th>h (cm)</th><th>h<sub>min</sub></th><th>Tip</th><th>g / q (kN/m²)</th><th>p<sub>d</sub></th><th>M alt X / Y</th><th>M üst X / Y</th><th>Alt X</th><th>Alt Y</th><th>Üst X</th><th>Üst Y</th><th>V</th><th></th></tr>`;
    for (const d of RC.dosemeler) {
      if (d.hata) { h += `<tr><td>${d.no || ''}</td><td colspan="14">${d.hata}</td></tr>`; continue; }
      const dd = q => (q && q.F ? `Ø${q.F}/${cmS(q.s)}` : '<span class="bad">—</span>');
      h += `<tr><td>${d.no || ''}</td><td>${f2(d.lx)} × ${f2(d.ly)}</td><td>${cmS(d.t)}</td><td>${f2(d.hmin * 100, 1)} ${ok(d.hOk)}</td><td>${d.tek ? 'tek doğr.' : 'çift doğr.'}</td><td>${f2(d.g, 1)} / ${f2(d.q, 1)}</td><td>${f2(d.pd)}</td><td>${f2(d.M.xb)} / ${f2(d.M.yb)}</td><td>${f2(d.M.xt)} / ${f2(d.M.yt)}</td><td>${dd(d.don.altX)}</td><td>${dd(d.don.altY)}</td><td>${dd(d.don.ustX)}</td><td>${dd(d.don.ustY)}</td><td>${f2(d.Vd, 1)} ≤ ${f2(d.Vcr, 1)} ${ok(d.Vok)}</td><td>${ok(d.ok)}</td></tr>`;
    }
    h += `</table><p class="f">Momentler kNm/m (tasarım, 1.4G+1.6Q, Wood-Armer). Sürekli kenarlar ankastre / mafsallı zarfı, kiriş / perde kenarları mafsallı, mesnetsiz kenarlar serbest. Köşe bölgelerinde (0.2 l<sub>s</sub>) burulma momenti köşe donatısı ile karşılanır: iki kenarı süreksiz köşelerde l<sub>s</sub>/5 boyunca alt ve üstte açıklık donatısı kadar köşe donatısı konmalıdır. h<sub>min</sub>: TS 500 Denklem 11.1 (çift doğrultu), 11.2 (tek doğrultu l/25–l/35, konsol l/12).</p>`;
    h += `<h3>Kirişler (TS 500 Bölüm 7–8, TBDY 7.4)</h3><table><tr><th>Kiriş</th><th>Açıklık</th><th>b/h (cm)</th><th>M<sub>d</sub>⁺</th><th>Alt donatı</th><th>Mesnet sol / sağ M<sub>d</sub>⁻</th><th>Üst (sol / sağ)</th><th>V<sub>d</sub> / V<sub>e</sub></th><th>Etriye sarılma / orta</th><th>ρ</th><th>Boyut</th><th></th></tr>`;
    for (const ch of RC.zincirler) {
      if (!ch.acik) { h += `<tr><td>${ch.ad}</td><td colspan="11">${ch.hata || 'hesaplanmadı'}</td></tr>`; continue; }
      ch.acik.forEach((a, i) => {
        const mL = ch.mes[a.j], mR = ch.mes[a.j + 1], kd = k => (k ? `${k.n}Ø${k.F}${k.iki ? ' (2 sıra)' : ''}` : '<span class="bad">—</span>'), et = e => (e ? `Ø${e.F}/${cmS(e.s)}${e.n > 2 ? ' ' + e.n + ' kol' : ''}` : '<span class="bad">—</span>');
        h += `<tr><td>${i ? '' : ch.ad}</td><td>${f2(a.L)} m</td><td>${cmS(a.bw)}/${cmS(a.hb)}</td><td>${f2(a.alt.M, 1)}</td><td>${kd(a.altD)}</td><td>${f2(mL.ust.M, 1)} / ${f2(mR.ust.M, 1)}</td><td>${kd(mL.ustD)} / ${kd(mR.ustD)}</td><td>${f2(a.Vd, 1)} / ${f2(a.Ve, 1)} ${ok(a.Vok)}</td><td>${et(a.etrS)} · ${et(a.etrO)}</td><td>${f2(a.rho * 100, 2)}% ${ok(a.rhoOk)}</td><td>${ok(a.dimOk)}${a.sehimOk ? '' : ' <span class="bad">h &lt; L/12</span>'}</td><td>${ok(a.ok)}</td></tr>`;
      });
    }
    h += `</table><p class="f">M kNm. Kombinasyonlar 1.4G+1.6Q (hareketli yük tüm / tek / çift açıklıklarda), G+Q±E, 0.9G±E. V<sub>e</sub> = V<sub>dy</sub> + (M<sub>pi</sub> + M<sub>pj</sub>)/l<sub>n</sub>, M<sub>p</sub> = 1.4 M<sub>r</sub> (TBDY 7.4.5). Sarılma bölgesi mesnet yüzünden 2h, s ≤ min(h/4, 8Ø, 150 mm); orta bölge s ≤ d/2. Mesnette alt donatı ≥ üst donatının yarısı, sürekli üst ≥ 2Ø12.</p>`;
    h += `<h3>Kolonlar (TS 500 Bölüm 7, TBDY 7.3)</h3><table><tr><th>Kolon</th><th>b<sub>x</sub>/b<sub>y</sub> (cm)</th><th>H (m)</th><th>N<sub>G</sub> / N<sub>Q</sub> (kN)</th><th>N<sub>d,max</sub></th><th>N<sub>dm</sub> ≤ 0.40f<sub>ck</sub>A<sub>c</sub></th><th>M<sub>E</sub> X / Y</th><th>Boyuna</th><th>ρ</th><th>Etkileşim</th><th>Etriye sarılma / orta</th><th>V<sub>e</sub></th><th></th></tr>`;
    for (const c of RC.kolonlar) {
      const dn = c.don, e = c.etr;
      h += `<tr><td>${c.no || ''}</td><td>${c.D ? 'Ø' + cmS(c.D) : cmS(c.bx) + '/' + cmS(c.by)}</td><td>${f2(c.H)}</td><td>${f2(c.NG, 0)} / ${f2(c.NQ, 0)}</td><td>${f2(c.Nmax, 0)}</td><td>${f2(c.NdmD, 0)} ≤ ${f2(0.4 * M.fck * 1000 * c.bx * c.by, 0)} ${ok(c.eksenOk)}</td><td>${f2(Math.max(c.ME.X.t, c.ME.X.b), 1)} / ${f2(Math.max(c.ME.Y.t, c.ME.Y.b), 1)}</td><td>${dn ? dn.n + 'Ø' + dn.F : '<span class="bad">yetersiz — kesiti büyütün</span>'}</td><td>${dn ? f2(dn.rho * 100, 2) + '%' : '—'}</td><td>${dn ? f2(dn.um, 2) + ' ≤ 1' : '—'}</td><td>Ø${e.F}/${cmS(e.sS)} (${e.nx}×${e.ny} kol) · Ø${e.F}/${cmS(e.sO)}</td><td>${f2(c.Ve, 1)} ${ok(c.Vok)}</td><td>${ok(c.ok)}${c.dimOk ? '' : ' <span class="bad">boyut</span>'}</td></tr>`;
    }
    h += `</table><p class="f">Etkileşim: M<sub>x</sub>/M<sub>rx</sub> + M<sub>y</sub>/M<sub>ry</sub> ≤ 1 (her kombinasyonda, M<sub>r</sub> uyumlu birim şekil değiştirme ile N<sub>d</sub> altında). En küçük dışmerkezlik 15 mm + 0.03h. Deprem doğrultu birleşimi %100 + %30. Sarılma bölgesi uzunluğu max(b<sub>max</sub>, l<sub>n</sub>/6, 500 mm). Narinlik etkisi hesaba katılmamıştır (kısa kolon kabulü).</p>`;
    if (RC.gk.length) h += `<h3>Güçlü kolon kontrolü (TBDY 7.3.6)</h3><table><tr><th>Düğüm</th><th>Doğrultu</th><th>M<sub>ra</sub> + M<sub>rü</sub></th><th>1.2 (M<sub>ri</sub> + M<sub>rj</sub>)</th><th></th></tr>${RC.gk.map(q => `<tr><td>${q.c.no || ''} üstü</td><td>${q.d}</td><td>${f2(q.Mc, 1)}</td><td>${f2(1.2 * q.Mb, 1)}</td><td>${ok(q.ok)}</td></tr>`).join('')}</table>`;
    if (RC.metraj.length) h += `<h3>Donatı metrajı (çerçeve)</h3><table><tr><th>Çap</th><th>Uzunluk (m)</th><th>Ağırlık (kg)</th></tr>${RC.metraj.map(m => `<tr><td>Ø${m.F}</td><td>${f2(m.L, 1)}</td><td>${f2(m.kg, 0)}</td></tr>`).join('')}<tr><td><b>Toplam</b></td><td></td><td><b>${f2(RC.metraj.reduce((t, m) => t + m.kg, 0), 0)}</b></td></tr></table><p class="f">Bindirme ve kanca boyları dahil değildir.</p>`;
    return h;
  };

  /* ================= ÇİZİM (pafta) ================= */
  P.specKutu = spec => { const b = [Infinity, Infinity, -Infinity, -Infinity], ad = p => { if (!p) return; b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]); b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]); }; for (const q of spec) { ad(q.a); ad(q.b); ad(q.p); ad(q.c); (q.pts || []).forEach(ad); if (q.k === 'C') { ad([q.c[0] - q.r, q.c[1] - q.r]); ad([q.c[0] + q.r, q.c[1] + q.r]); } } return b[0] === Infinity ? null : b; };
  P.specKaydir = (spec, dx, dy) => { const m = p => (p ? [p[0] + dx, p[1] + dy] : p); return spec.map(q => Object.assign({}, q, { a: m(q.a), b: m(q.b), p: m(q.p), c: q.k === 'C' ? m(q.c) : q.c, pts: q.pts ? q.pts.map(m) : q.pts })); };
  P.cerceveCizim = (RC, olcek, sec) => { sec = sec || {}; // sec: { sv: [kotlar], kiris: false, kolon: false } — paftalara bölmek için
    let out = []; const bloklar = [], blok = () => { if (out.length) bloklar.push(out); out = []; }; const K = (olcek || 50) / 50, T1 = 0.125 * K, T2 = 0.175 * K, T3 = 0.30 * K, cmS = v => Math.round(v * 100);
    const L = (a, b, ly) => out.push({ k: 'L', a, b, ly }), PL = (pts, cl, ly) => out.push({ k: 'P', pts, cl: !!cl, ly }), CI = (c, r, ly) => out.push({ k: 'C', c, r, ly });
    const TX = (p, s, h, al, ly, rot) => out.push({ k: 'T', p, s: String(s), h: h || T1, al: al || 'L', ly: ly || 'STA_YAZI', rot: rot || 0 });
    const REC = (x0, y0, x1, y1, ly) => PL([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true, ly);
    const BAS = (p, s, alt) => { TX(p, s, T3, 'C', 'STA_BASLIK'); const w = s.length * T3 * 0.72; L([p[0] - w / 2, p[1] - 0.08 * K], [p[0] + w / 2, p[1] - 0.08 * K], 'STA_BASLIK'); if (alt) TX([p[0], p[1] - 0.42 * K], alt, T1, 'C', 'STA_YAZI'); };
    // model kapsamı
    const xs = [], ys = []; RC.kolonlar.forEach(c => { xs.push(c.x - c.bx, c.x + c.bx); ys.push(c.y - c.by, c.y + c.by); }); RC.zincirler.forEach(ch => { xs.push(ch.a[0], ch.a[0] + ch.u[0] * ch.L); ys.push(ch.a[1], ch.a[1] + ch.u[1] * ch.L); }); RC.dosemeler.forEach(d => { xs.push(d.x0, d.x1); ys.push(d.y0, d.y1); });
    if (!xs.length) return [];
    const X0 = Math.min(...xs) - 1, Y0 = Math.min(...ys) - 1, Wm = Math.max(...xs) - X0 + 1, Hm = Math.max(...ys) - Y0 + 1, gap = Math.max(4 * K, Wm * 0.15);
    const svl = RC.seviyeler.length ? RC.seviyeler : [0];
    let oy = 0;
    svl.forEach((z, si) => { if (sec.sv && !sec.sv.some(v => Math.abs(v - z) < 1e-6)) return;
      const tr = p => [p[0] - X0, p[1] - Y0 + oy], tr2 = p => [p[0] - X0 + Wm + gap, p[1] - Y0 + oy];
      for (const [f, baslik, don] of [[tr, `${z >= 0 ? '+' : ''}${z.toFixed(2)} KOTU KALIP PLANI`, false], [tr2, `${z >= 0 ? '+' : ''}${z.toFixed(2)} KOTU DÖŞEME DONATI PLANI`, true]]) {
        blok();
        // kolonlar (bu kota ulaşan)
        RC.kolonlar.filter(c => (c.zt < z + 0.15 && c.zt > z - Math.max(0, ...RC.dosemeler.filter(d => Math.abs(d.zt - z) < 0.15).map(d => d.t)) - 0.15) || (c.z0 < z && c.zt > z)).forEach(c => { REC(...f([c.x - c.bx / 2, c.y - c.by / 2]), ...f([c.x + c.bx / 2, c.y + c.by / 2]), 'STA_KALIP'); if (!don) TX(f([c.x + c.bx / 2 + 0.05, c.y - c.by / 2 - 0.25 * K]), `${c.no || ''} ${cmS(c.bx)}/${cmS(c.by)}`, T1, 'L', 'STA_YAZI'); });
        // kirişler
        RC.zincirler.filter(ch => Math.abs(ch.z - z) < 0.15).forEach(ch => ch.segs.forEach(sg => { const n = [-ch.u[1], ch.u[0]], w = sg.bw / 2, A = s => [ch.a[0] + ch.u[0] * s, ch.a[1] + ch.u[1] * s]; const a = A(sg.s0), b = A(sg.s1); L(f([a[0] + n[0] * w, a[1] + n[1] * w]), f([b[0] + n[0] * w, b[1] + n[1] * w]), 'STA_GORUNUS'); L(f([a[0] - n[0] * w, a[1] - n[1] * w]), f([b[0] - n[0] * w, b[1] - n[1] * w]), 'STA_GORUNUS'); if (!don) { const m = A((sg.s0 + sg.s1) / 2), rot = Math.atan2(ch.u[1], ch.u[0]) * 180 / Math.PI; TX(f([m[0] + n[0] * (w + 0.08), m[1] + n[1] * (w + 0.08)]), `${sg.k.no || ''} (${cmS(sg.bw)}/${cmS(sg.hb)})`, T1, 'C', 'STA_YAZI', rot); } }));
        // perdeler
        RC.perdeler.filter(w => w.zt > z - 0.15 && w.z0 < z - 0.3).forEach(w => { const u = sub(w.b, w.a), l = len(u), n = [-u[1] / l, u[0] / l], t = w.t / 2; PL([f([w.a[0] + n[0] * t, w.a[1] + n[1] * t]), f([w.b[0] + n[0] * t, w.b[1] + n[1] * t]), f([w.b[0] - n[0] * t, w.b[1] - n[1] * t]), f([w.a[0] - n[0] * t, w.a[1] - n[1] * t])], true, 'STA_KALIP'); });
        // döşemeler
        RC.dosemeler.filter(d => Math.abs(d.zt - z) < 0.15).forEach(d => {
          const c = [(d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2];
          if (!don) { TX(f([c[0], c[1] + 0.1 * K]), d.no || 'D', T2, 'C', 'STA_YAZI'); TX(f([c[0], c[1] - 0.2 * K]), `h=${cmS(d.t)} cm`, T1, 'C', 'STA_YAZI'); L(f([d.x0, d.y0]), f([d.x1, d.y1]), 'STA_GORUNUS'); L(f([d.x0, d.y1]), f([d.x1, d.y0]), 'STA_GORUNUS'); return; }
          if (!d.don) return; const q = d.don, dd = k => (k && k.F ? `Ø${k.F}/${cmS(k.s)}` : '—');
          const yA = d.y0 + d.ly * 0.4, xA = d.x0 + d.lx * 0.4;
          L(f([d.x0 + 0.05, yA]), f([d.x1 - 0.05, yA]), 'STA_DONATI'); TX(f([c[0], yA + 0.06]), `${dd(q.altX)} alt`, T1, 'C', 'STA_POZ');
          L(f([xA, d.y0 + 0.05]), f([xA, d.y1 - 0.05]), 'STA_DONATI'); TX(f([xA - 0.06, c[1]]), `${dd(q.altY)} alt`, T1, 'C', 'STA_POZ', 90);
          const lx4 = d.lx / 4 + 0.3, ly4 = d.ly / 4 + 0.3, yU = d.y0 + d.ly * 0.65, xU = d.x0 + d.lx * 0.65;
          if (d.kenar.L) { PL([f([d.x0 - 0.05, yU - 0.08]), f([d.x0 - 0.05, yU]), f([d.x0 + lx4, yU]), f([d.x0 + lx4, yU - 0.08])], false, 'STA_DONATI'); TX(f([d.x0 + 0.05, yU + 0.06]), `${dd(q.ustX)} üst`, T1, 'L', 'STA_POZ'); }
          if (d.kenar.R) { PL([f([d.x1 - lx4, yU - 0.08]), f([d.x1 - lx4, yU]), f([d.x1 + 0.05, yU]), f([d.x1 + 0.05, yU - 0.08])], false, 'STA_DONATI'); TX(f([d.x1 - 0.05, yU + 0.06]), `${dd(q.ustX)} üst`, T1, 'R', 'STA_POZ'); }
          if (d.kenar.B) { PL([f([xU - 0.08, d.y0 - 0.05]), f([xU, d.y0 - 0.05]), f([xU, d.y0 + ly4]), f([xU - 0.08, d.y0 + ly4])], false, 'STA_DONATI'); TX(f([xU + 0.06, d.y0 + 0.1]), `${dd(q.ustY)} üst`, T1, 'L', 'STA_POZ', 90); }
          if (d.kenar.T) { PL([f([xU - 0.08, d.y1 - ly4]), f([xU, d.y1 - ly4]), f([xU, d.y1 + 0.05]), f([xU - 0.08, d.y1 + 0.05])], false, 'STA_DONATI'); TX(f([xU + 0.06, d.y1 - 0.1]), `${dd(q.ustY)} üst`, T1, 'R', 'STA_POZ', 90); }
        });
        BAS(f([X0 + Wm / 2, Y0 - 0.8 * K]), baslik, `Ö: 1/${olcek || 50}`);
      }
      oy -= Hm + 3 * K; void si;
    });
    let ky = oy;
    if (sec.kiris !== false) {
    // kiriş açılımları
    blok(); oy -= 1 * K; ky = oy;
    BAS([Wm / 2, ky], 'KİRİŞ AÇILIMLARI', `Ö: 1/${olcek || 50}`); ky -= 1.5 * K;
    for (const ch of RC.zincirler) {
      if (!ch.acik || !ch.acik.length) continue;
      blok(); const hb = Math.max(...ch.segs.map(q => q.hb)), x0 = 0, yb = ky - hb, f = (s, z) => [x0 + s, yb + z];
      TX([x0, ky + 0.55 * K], `${ch.ad}  (${(ch.z >= 0 ? '+' : '') + ch.z.toFixed(2)})`, T2, 'L', 'STA_BASLIK');
      ch.segs.forEach(sg => REC(...f(sg.s0, 0), ...f(sg.s1, sg.hb), 'STA_KALIP'));
      ch.supN.forEach(q => { const w = q.tip === 'kolon' ? (ch.d === 'Y' ? q.c.by : q.c.bx) : q.tip === 'perde' ? q.w.t : 0.2; REC(...f(q.s - w / 2, -0.6), ...f(q.s + w / 2, 0), 'STA_GORUNUS'); TX(f(q.s, -0.8), q.tip === 'kolon' ? (q.c.no || 'S') : q.tip === 'perde' ? (q.w.no || 'P') : 'kiriş', T1, 'C'); });
      for (const a of ch.acik) {
        const c = 0.05, m = (a.s0 + a.s1) / 2;
        if (a.altD) { L(f(Math.max(0.03, a.s0 - 0.3), c), f(Math.min(ch.L - 0.03, a.s1 + 0.3), c), 'STA_DONATI'); TX(f(a.s0 + a.L * 0.3, c + 0.04), `${a.altD.n}Ø${a.altD.F} alt`, T1, 'C', 'STA_POZ'); }
        if (a.montaj) { L(f(Math.max(0.03, a.s0 - 0.3), a.hb - c), f(Math.min(ch.L - 0.03, a.s1 + 0.3), a.hb - c), 'STA_DONATI'); TX(f(a.s0 + a.L * 0.7, a.hb - c - 0.17), `${a.montaj.n}Ø${a.montaj.F} montaj`, T1, 'C', 'STA_POZ'); }
        if (a.etrS && a.etrO) { TX(f(m, -0.35), `etriye Ø${a.etrS.F}/${cmS(a.etrS.s)} (${cmS(a.lsar)} cm) — Ø${a.etrO.F}/${cmS(a.etrO.s)}`, T1, 'C', 'STA_POZ'); for (const s of [a.s0 + (a.L - a.ln) / 2 + a.lsar, a.s1 - (a.L - a.ln) / 2 - a.lsar]) L(f(s, -0.1), f(s, a.hb + 0.1), 'STA_OLCU'); }
        TX(f(m, a.hb + 0.35), `${cmS(a.bw)}/${cmS(a.hb)}  L=${a.L.toFixed(2)}`, T1, 'C');
      }
      ch.mes.forEach((m, j) => { if (!m.ustD) return; const aL = ch.acik.find(a => a.j + 1 === j), aR = ch.acik.find(a => a.j === j), l0 = Math.max(0.03, m.s - (aL ? aL.L / 3 : 0)), l1 = Math.min(ch.L - 0.03, m.s + (aR ? aR.L / 3 : 0)); L(f(l0, m.hb - 0.09), f(l1, m.hb - 0.09), 'STA_DONATI'); TX(f(m.s, m.hb + 0.08), `${m.ustD.n}Ø${m.ustD.F} mesnet`, T1, 'C', 'STA_POZ'); });
      ky = yb - 1.6 * K;
    }
    }
    if (sec.kolon !== false) {
    // kolon aplikasyon tablosu
    blok(); ky -= 0.5 * K; BAS([Wm / 2, ky], 'KOLON APLİKASYON TABLOSU', ''); ky -= 1.2 * K;
    const tipler = new Map(); for (const c of RC.kolonlar) { if (!c.don) continue; const k = `${cmS(c.bx)}/${cmS(c.by)} ${c.don.n}Ø${c.don.F} Ø${c.etr.F}/${cmS(c.etr.sS)}-${cmS(c.etr.sO)}`; if (!tipler.has(k)) tipler.set(k, { c, ad: [] }); tipler.get(k).ad.push(c.no || '?'); }
    let tx = 0; const hucre = 2.6 * K;
    for (const [k, t] of tipler) {
      const c = t.c, s = Math.min(1, (hucre * 0.6) / Math.max(c.bx, c.by)), cx = tx + hucre / 2, cy = ky - hucre * 0.55;
      REC(tx, ky - hucre * 1.3, tx + hucre, ky, 'STA_TABLO');
      REC(cx - c.bx * s / 2, cy - c.by * s / 2, cx + c.bx * s / 2, cy + c.by * s / 2, 'STA_KALIP');
      const e = (RC.ayar.cC + 0.01) * s; REC(cx - c.bx * s / 2 + e, cy - c.by * s / 2 + e, cx + c.bx * s / 2 - e, cy + c.by * s / 2 - e, 'STA_DONATI');
      c.don.bars.forEach(q => CI([cx + q[0] * s, cy + q[1] * s], Math.max(0.012, c.don.F / 2000 * s * 1.6), 'STA_DONATI_KESIT'));
      TX([cx, ky - 0.25 * K], t.ad.join(', '), T1, 'C', 'STA_BASLIK'); TX([cx, ky - hucre * 1.05], k.split(' ').slice(0, 2).join('  '), T1, 'C'); TX([cx, ky - hucre * 1.2], `etr. ${k.split(' ')[2]}`, T1, 'C');
      tx += hucre;
    }
    }
    blok();
    // blokları rafa diz (pafta oranına yakın, yatay)
    const kt = bloklar.map(b => ({ b, k: P.specKutu(b) })).filter(q => q.k), ara = 1.5 * K;
    const alan = kt.reduce((t, q) => t + (q.k[2] - q.k[0] + ara) * (q.k[3] - q.k[1] + ara), 0), Wmax = Math.max(...kt.map(q => q.k[2] - q.k[0]), Math.sqrt(alan * 1.45));
    let x = 0, y = 0, sh = 0; const son = [];
    for (const q of kt) { const w = q.k[2] - q.k[0], h = q.k[3] - q.k[1]; if (x > 0 && x + w > Wmax) { x = 0; y -= sh + ara; sh = 0; } son.push(...P.specKaydir(q.b, x - q.k[0], y - q.k[3])); x += w + ara; sh = Math.max(sh, h); }
    return son;
  };
})(typeof window !== 'undefined' ? window : globalThis);

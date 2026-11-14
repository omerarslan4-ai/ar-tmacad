/* ArıtmaCAD Statik — 3B ÇERÇEVE ANALİZİ (ProBina yöntemi)
   • Kolon ve kirişler 3B çubuk eleman (12 serbestlik), her kat kotunda rijit diyafram (kütle merkezinde ana düğüm: Ux, Uy, Θz),
     kolon tabanları ankastre, perde mesnetleri ankastre.
   • Birleşimlerde rijit bölgeler %25 azaltılmış (kolon üst ucunda 0.75·kiriş yüksekliği, kiriş uçlarında 0.75·kolon yarı genişliği);
     tasarım kuvvetleri rijit bölge yüzünde.
   • Etkin kesit rijitlikleri: deprem ve modal analizde kolon 0.70, kiriş 0.35 (TBDY Tablo 4.2); düşey yüklerde çatlamamış.
   • Modal analiz: diyafram serbestliklerine statik yoğunlaştırma (Guyan) + Jacobi özdeğer → periyotlar, etkin kütle oranları.
     Her yönde hakim periyot (en büyük etkin kütleli mod) ≤ 1.4·Ct·H^0.75 ile eşdeğer deprem yükü (TBDY 4.7).
   • Yük durumları: G, Q (döşeme yükleri kirişlere, kiriş öz ağırlığı, kolon öz ağırlığı), Ex+, Ex−, Ey+, Ey− (±%5 ek dışmerkezlik).
   • Sonuçlar kolon tasarım girdilerine yazılır (NG, NQ, Mg, ME, NE, NEt): kolonlar 3B analiz kuvvetleriyle boyutlandırılır.
   Kanca: statik-cerceve.js kolon tasarımından önce P.cerceve3BHook(ctx) çağırır. */
(function () {
  'use strict';
  const P = window.STATIK; if (!P) return;
  const g9 = 9.81;
  const sub = (a, b) => a.map((v, i) => v - b[i]), dot = (a, b) => a.reduce((t, v, i) => t + v * b[i], 0), crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], nrm = a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); };

  /* yoğun simetrik sistem çözücü (Gauss, kısmi pivot); B: dizi ya da dizi dizisi (çok sağ taraf) */
  const coz = (A0, B0) => {
    const n = A0.length, A = A0.map(r => r.slice()), multi = Array.isArray(B0[0]), B = multi ? B0.map(r => r.slice()) : B0.map(v => [v]), m = B[0].length;
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-12) { A[p][c] = 1e-12; }
      if (p !== c) { [A[c], A[p]] = [A[p], A[c]]; [B[c], B[p]] = [B[p], B[c]]; }
      const Ac = A[c], piv = Ac[c];
      for (let r = c + 1; r < n; r++) { const f = A[r][c] / piv; if (!f) continue; const Ar = A[r]; for (let k = c; k < n; k++) Ar[k] -= f * Ac[k]; const Br = B[r], Bc = B[c]; for (let k = 0; k < m; k++) Br[k] -= f * Bc[k]; }
    }
    const X = Array.from({ length: n }, () => new Array(m).fill(0));
    for (let r = n - 1; r >= 0; r--) for (let k = 0; k < m; k++) { let t = B[r][k]; for (let q = r + 1; q < n; q++) t -= A[r][q] * X[q][k]; X[r][k] = t / A[r][r]; }
    return multi ? X : X.map(r => r[0]);
  };
  /* simetrik özdeğer (Jacobi) */
  const jacobi = (A0) => {
    const n = A0.length, A = A0.map(r => r.slice()), V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
    for (let sw = 0; sw < 100; sw++) {
      let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] ** 2; if (off < 1e-18) break;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-30) continue; const th = (A[q][q] - A[p][p]) / (2 * A[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const a = A[k][p], b = A[k][q]; A[k][p] = c * a - s * b; A[k][q] = s * a + c * b; }
        for (let k = 0; k < n; k++) { const a = A[p][k], b = A[q][k]; A[p][k] = c * a - s * b; A[q][k] = s * a + c * b; }
        for (let k = 0; k < n; k++) { const a = V[k][p], b = V[k][q]; V[k][p] = c * a - s * b; V[k][q] = s * a + c * b; }
      }
    }
    return { val: A.map((r, i) => r[i]), vec: V };
  };
  const Jrect = (a, b) => { const A = Math.max(a, b), B = Math.min(a, b); return A * B ** 3 * (1 / 3 - 0.21 * (B / A) * (1 - B ** 4 / (12 * A ** 4))); };

  /* 12×12 yerel rijitlik (esnek boy Lf, rijit uç ofsetleri a, b) */
  const kLocal = (E, G, A, Iy, Iz, J, L, a, b) => {
    const Lf = Math.max(0.2 * L, L - a - b), K = Array.from({ length: 12 }, () => new Array(12).fill(0)), s = (i, j, v) => { K[i][j] += v; if (i !== j) K[j][i] += v; };
    const EA = E * A / Lf, GJ = G * J / Lf, z12 = 12 * E * Iz / Lf ** 3, z6 = 6 * E * Iz / Lf ** 2, z4 = 4 * E * Iz / Lf, z2 = 2 * E * Iz / Lf, y12 = 12 * E * Iy / Lf ** 3, y6 = 6 * E * Iy / Lf ** 2, y4 = 4 * E * Iy / Lf, y2 = 2 * E * Iy / Lf;
    s(0, 0, EA); s(0, 6, -EA); s(6, 6, EA); s(3, 3, GJ); s(3, 9, -GJ); s(9, 9, GJ);
    s(1, 1, z12); s(1, 5, z6); s(1, 7, -z12); s(1, 11, z6); s(5, 5, z4); s(5, 7, -z6); s(5, 11, z2); s(7, 7, z12); s(7, 11, -z6); s(11, 11, z4);
    s(2, 2, y12); s(2, 4, -y6); s(2, 8, -y12); s(2, 10, -y6); s(4, 4, y4); s(4, 8, y6); s(4, 10, y2); s(8, 8, y12); s(8, 10, y6); s(10, 10, y4);
    // rijit ofset dönüşümü: esnek uç = düğüm + θ × r
    const O = Array.from({ length: 12 }, (_, i) => Array.from({ length: 12 }, (_, j) => (i === j ? 1 : 0)));
    O[1][5] = a; O[2][4] = -a; O[7][11] = -b; O[8][10] = b;
    const KO = K.map(r => O[0].map((_, j) => r.reduce((t, v, k) => t + v * O[k][j], 0)));
    const Kn = O[0].map((_, i) => O[0].map((_, j) => O.reduce((t, r, k) => t + r[i] * KO[k][j], 0)));
    return { K: Kn, Kf: K, O, Lf };
  };

  P.cerceve3B = (ctx) => {
    const { kolonlar, zincirler, perdeler, dv, E: E0, gc, SDS, tSv, segAt } = ctx, E = E0, G = E / 2.4, zR = ctx.zRijit;
    // su yapısı: hazne üst kotu ve altı rijit (perdelerle tutulu) — deprem tabanı hazne üstü; bu kotlardaki kütle çerçeveye katılmaz
    const katlar = zR != null ? ctx.katlar.filter(k => k.z > zR + 0.05) : ctx.katlar; if (!katlar.length) return null;
    const kC = +dv.kKolon || 0.7, kB = +dv.kKiris || 0.35, rz = dv.rijitBolge != null ? +dv.rijitBolge : 0.75, kJ = 0.15;
    const taban = zR != null ? Math.max(zR, Math.min(...kolonlar.map(c => c.z0))) : Math.min(...kolonlar.map(c => c.z0)), lev = katlar.map(k => k.z);
    const levIdx = z => { let b = -1, e = 0.16; lev.forEach((v, i) => { const d = Math.abs(v - z); if (d < e) { e = d; b = i; } }); return b; };
    /* ---- düğümler ---- */
    const nodes = [], key = new Map(), nod = (x, y, z, o) => { const k = `${Math.round(x * 200)}|${Math.round(y * 200)}|${Math.round(z * 100)}`; let n = key.get(k); if (n == null) { n = nodes.length; nodes.push(Object.assign({ x, y, z, fix: false, lv: -1 }, o || {})); key.set(k, n); } else if (o) Object.assign(nodes[n], o); return n; };
    // kolon düğümleri: taban, kirişin bağlandığı ara kotlar, üst
    const kolDug = new Map();
    for (const c of kolonlar) {
      const zs = new Set([c.z0, c.zt]); (c.guse || []).forEach(g => { if (g.zt > c.z0 + 0.1 && g.zt < c.zt - 0.1) zs.add(g.zt); }); // guse kotunda düğüm (yük noktası)
      for (const ch of zincirler) if (ch.supN && ch.supN.some(q => q.tip === 'kolon' && q.c === c) && ch.z > c.z0 + 0.3 && ch.z < c.zt + 0.16) zs.add(ch.z <= c.zt - 0.15 ? ch.z : c.zt);
      const zl = [...zs].sort((a, b) => a - b); kolDug.set(c, zl.map(z => nod(c.x, c.y, z, z === c.z0 && !c.alt ? { fix: true } : null)));
    }
    const els = [];
    // kolon elemanları
    for (const c of kolonlar) {
      const nl = kolDug.get(c); for (let i = 0; i + 1 < nl.length; i++) {
        const zb = nodes[nl[i + 1]].z, hbU = Math.max(0, ...zincirler.filter(ch => Math.abs(ch.z - zb) < 0.16 && ch.supN && ch.supN.some(q => q.tip === 'kolon' && q.c === c)).map(ch => Math.max(...ch.segs.map(q => q.hb))));
        els.push({ tip: 'kolon', c, i: nl[i], j: nl[i + 1], bx: c.bx, by: c.by, A: c.bx * c.by, a: 0, b: rz * hbU, seg: i });
      }
    }
    // kiriş elemanları: zincir boyunca düğüm noktaları (kolon, perde, kiriş-kiriş kesişimleri)
    const kirisDug = new Map();
    for (const ch of zincirler) {
      if (!ch.supN) continue; const P0 = s => [ch.a[0] + ch.u[0] * s, ch.a[1] + ch.u[1] * s];
      const pts = [];
      for (const q of ch.supN) {
        if (q.tip === 'kolon') { pts.push({ s: q.s, n: nod(q.c.x, q.c.y, Math.min(ch.z, q.c.zt)), kol: q.c }); }
        else if (q.tip === 'perde') { const p = P0(q.s); pts.push({ s: q.s, n: nod(p[0], p[1], ch.z, { fix: true }) }); }
        else if (q.tip === 'kiris') { const p = P0(q.s); pts.push({ s: q.s, n: nod(p[0], p[1], ch.z) }); }
      }
      for (const o of zincirler) if (o !== ch && o.supN) for (const q of o.supN) if (q.tip === 'kiris' && q.ch === ch) { const p = P0(q.sOn); pts.push({ s: q.sOn, n: nod(p[0], p[1], ch.z) }); }
      pts.sort((a, b) => a.s - b.s); const tek = pts.filter((p, i) => !i || p.s - pts[i - 1].s > 0.05);
      kirisDug.set(ch, tek);
      for (let i = 0; i + 1 < tek.length; i++) {
        const A0 = tek[i], B0 = tek[i + 1], sg = segAt(ch, (A0.s + B0.s) / 2), gen = p => (p.kol ? (ch.d === 'Y' ? p.kol.by : p.kol.bx) / 2 : 0);
        els.push({ tip: 'kiris', ch, i: A0.n, j: B0.n, bw: sg.bw, hb: sg.hb, A: sg.bw * sg.hb, a: rz * gen(A0), b: rz * gen(B0), s0: A0.s, s1: B0.s, sg });
      }
    }
    // diyafram: kat kotlarındaki kiriş düğümleri
    if (zR != null) nodes.forEach(n => { if (n.z <= zR + 0.05) n.rijit = true; });
    nodes.forEach(n => { if (!n.fix) { const li = levIdx(n.z); if (li >= 0 && Math.abs(n.z - lev[li]) < 0.16 && els.some(e => e.tip === 'kiris' && (e.i === nodes.indexOf(n) || e.j === nodes.indexOf(n)))) n.lv = li; } });
    // kat kütle merkezi ve kütle ataleti (döşeme alanları ağırlıklı)
    const kat = katlar.map((k, li) => {
      const ds = ctx.dosemeler.filter(d => Math.abs(d.zt - k.z) < 0.16 && !d.atla); let A = 0, Sx = 0, Sy = 0, Ix = 0;
      ds.forEach(d => { const a = d.lx * d.ly, cx = (d.x0 + d.x1) / 2, cy = (d.y0 + d.y1) / 2; A += a; Sx += a * cx; Sy += a * cy; });
      const nl = nodes.filter(n => n.lv === li); let xc = A ? Sx / A : nl.reduce((t, n) => t + n.x, 0) / (nl.length || 1), yc = A ? Sy / A : nl.reduce((t, n) => t + n.y, 0) / (nl.length || 1);
      ds.forEach(d => { const cx = (d.x0 + d.x1) / 2, cy = (d.y0 + d.y1) / 2, a = d.lx * d.ly; Ix += a * ((d.lx ** 2 + d.ly ** 2) / 12 + (cx - xc) ** 2 + (cy - yc) ** 2); });
      const xs = ds.flatMap(d => [d.x0, d.x1]), ys = ds.flatMap(d => [d.y0, d.y1]), Bx = xs.length ? Math.max(...xs) - Math.min(...xs) : 1, By = ys.length ? Math.max(...ys) - Math.min(...ys) : 1;
      const m = k.w / g9, r2 = A ? Ix / A : (Bx ** 2 + By ** 2) / 12;
      return { li, z: k.z, xc, yc, m, mr2: m * r2, Bx, By, H: k.z - taban, w: k.w, h: k.h };
    });
    /* ---- serbestlik numaralandırma (diyafram ana düğüm: 3 sb / kat) ---- */
    let nd = 0; const master = kat.map(() => [nd++, nd++, nd++]);
    const map = nodes.map(n => { // her düğüm 6 sb → [[idx, katsayı], …]
      if (n.fix) return Array.from({ length: 6 }, () => []);
      if (n.rijit) return [[], [], [[nd++, 1]], [[nd++, 1]], [[nd++, 1]], []]; // hazne içi: yatayda ve burulmada tutulu
      const m = n.lv >= 0 ? master[n.lv] : null, K = n.lv >= 0 ? kat[n.lv] : null, r = [];
      r[0] = m ? [[m[0], 1], [m[2], -(n.y - K.yc)]] : [[nd++, 1]];
      r[1] = m ? [[m[1], 1], [m[2], (n.x - K.xc)]] : [[nd++, 1]];
      r[2] = [[nd++, 1]]; r[3] = [[nd++, 1]]; r[4] = [[nd++, 1]];
      r[5] = m ? [[m[2], 1]] : [[nd++, 1]];
      return r;
    });
    const N = nd, nM = master.length * 3;
    /* ---- eleman matrisleri ---- */
    const Rot = e => { const pi = nodes[e.i], pj = nodes[e.j], x = nrm(sub([pj.x, pj.y, pj.z], [pi.x, pi.y, pi.z])); let y, z; if (Math.abs(x[2]) > 0.99) { y = [1, 0, 0]; z = nrm(crs(x, y)); y = crs(z, x); } else { z = nrm(crs(x, [0, 0, 1])); y = crs(z, x); } return [x, y, z]; };
    const elK = (e, catlak) => {
      const R = Rot(e), pi = nodes[e.i], pj = nodes[e.j], L = Math.hypot(pj.x - pi.x, pj.y - pi.y, pj.z - pi.z);
      let Iy, Iz, J; if (e.tip === 'kolon') { Iz = e.by * e.bx ** 3 / 12; Iy = e.bx * e.by ** 3 / 12; J = Jrect(e.bx, e.by); } else { Iz = e.bw * e.hb ** 3 / 12; Iy = e.hb * e.bw ** 3 / 12; J = Jrect(e.bw, e.hb) * kJ; }
      const f = catlak ? (e.tip === 'kolon' ? kC : kB) : 1, kl = kLocal(E, G, e.A, Iy * f, Iz * f, J, L, e.a, e.b);
      return Object.assign(kl, { R, L });
    };
    const T12 = R => { const T = Array.from({ length: 12 }, () => new Array(12).fill(0)); for (let b = 0; b < 4; b++) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) T[b * 3 + i][b * 3 + j] = R[i][j]; return T; };
    const kGlob = (kl) => { const T = T12(kl.R), KT = kl.K.map(r => T[0].map((_, j) => r.reduce((t, v, k) => t + v * T[k][j], 0))); return T[0].map((_, i) => T[0].map((_, j) => T.reduce((t, r, k) => t + r[i] * KT[k][j], 0))); };
    const topla = (Kg, kg, e) => { const dm = [...map[e.i], ...map[e.j]]; for (let a = 0; a < 12; a++) for (const [ia, ca] of dm[a]) for (let b = 0; b < 12; b++) { const v = kg[a][b]; if (!v) continue; for (const [ib, cb] of dm[b]) Kg[ia][ib] += ca * cb * v; } };
    const kur = catlak => { const Kg = Array.from({ length: N }, () => new Array(N).fill(0)); els.forEach(e => { e['k' + (catlak ? 'c' : 'u')] = elK(e, catlak); topla(Kg, kGlob(e['k' + (catlak ? 'c' : 'u')]), e); }); for (let i = 0; i < N; i++) if (Math.abs(Kg[i][i]) < 1e-9) Kg[i][i] = 1e-6; return Kg; };
    const Ku = kur(false), Kc = kur(true);
    /* ---- düşey yükler (G, Q): kiriş noktasal döşeme yükleri + kiriş / kolon öz ağırlığı ---- */
    const sabitUc = (e, kl, Pz, a) => { // global düşey kuvvet Pz (kN, + yukarı) esnek bölgede a (m, esnek başlangıçtan): yerel sabit uç kuvvetleri → düğüm
      const Lf = kl.Lf, aa = Math.max(0, Math.min(Lf, a)), bb = Lf - aa, R = kl.R, py = Pz * R[1][2], pz = Pz * R[2][2], px = Pz * R[0][2];
      const f = new Array(12).fill(0);
      f[0] = px * bb / Lf; f[6] = px * aa / Lf;
      f[1] = py * bb * bb * (3 * aa + bb) / Lf ** 3; f[7] = py * aa * aa * (aa + 3 * bb) / Lf ** 3; f[5] = py * aa * bb * bb / Lf ** 2; f[11] = -py * aa * aa * bb / Lf ** 2;
      f[2] = pz * bb * bb * (3 * aa + bb) / Lf ** 3; f[8] = pz * aa * aa * (aa + 3 * bb) / Lf ** 3; f[4] = -pz * aa * bb * bb / Lf ** 2; f[10] = pz * aa * aa * bb / Lf ** 2;
      return f; // esnek uç kuvvetleri (yerel)
    };
    const yuk = { G: new Array(N).fill(0), Q: new Array(N).fill(0) }, femEl = new Map(); // femEl: eleman → {G: f12 yerel esnek, Q}
    const yukTop = { G: 0, Q: 0 }; // uygulanan toplam düşey yük (kN, + yukarı) — denge denetimi: kolon ayağı tepkileri toplamı buna eşittir
    const elYuk = (e, cas, Pz, sAbs) => { // kiriş elemanına noktasal yük
      yukTop[cas] += Pz; const kl = e.ku, a = (sAbs - e.s0) - e.a; const f = sabitUc(e, kl, Pz, a), F = femEl.get(e) || { G: new Array(12).fill(0), Q: new Array(12).fill(0) }; for (let i = 0; i < 12; i++) F[cas][i] += f[i]; femEl.set(e, F);
    };
    const nodYuk = (n, cas, Fz) => { for (const [ix, cf] of map[n][2]) yuk[cas][ix] += cf * Fz; };
    for (const e of els) if (e.tip === 'kiris') {
      const ch = e.ch, s0 = e.s0, s1 = e.s1;
      for (const [cas, arr] of [['G', ch.yG], ['Q', ch.yQ]]) for (const [s, Pz] of arr) { if (s >= s0 - 1e-6 && (s < s1 - 1e-6 || (s1 >= ch.L - 1e-6 && s <= s1 + 1e-6))) elYuk(e, cas, Pz, s); }
      const w = gc * e.bw * Math.max(0.1, e.hb - tSv(ch.z)) + (+e.sg.k.gd || 0), L = s1 - s0, n = Math.max(2, Math.ceil(L / 0.25)); for (let k = 0; k < n; k++) elYuk(e, 'G', -w * L / n, s0 + (k + 0.5) * L / n);
    }
    for (const e of els) if (e.tip === 'kolon') { const pi = nodes[e.i], pj = nodes[e.j], W = gc * e.A * (pj.z - pi.z); yukTop.G -= W; nodYuk(e.i, 'G', -W / 2); nodYuk(e.j, 'G', -W / 2); }
    // guse (vinç kirişi) yükleri: düşey kuvvet + kolon eksenine göre dışmerkezlik momenti (G: kiriş ağırlığı, Q: vinç tekerlek yükü)
    const nodKuv = (n, cas, k, v) => { for (const [ix, cf] of map[n][k]) yuk[cas][ix] += cf * v; };
    for (const c of kolonlar) for (const g of (c.guse || [])) {
      const n = (kolDug.get(c) || []).find(i => Math.abs(nodes[i].z - g.zt) < 0.02); if (n == null) continue; const e = g.f0 + (dv.guseA != null && dv.guseA !== '' ? +dv.guseA : g.gL / 2), rx = g.yon[0] * e, ry = g.yon[1] * e;
      for (const [cas, P0] of [['G', +dv.guseG || 0], ['Q', +dv.guseP || 0]]) { if (!P0) continue; yukTop[cas] -= P0; nodKuv(n, cas, 2, -P0); nodKuv(n, cas, 3, -ry * P0); nodKuv(n, cas, 4, rx * P0); }
    }
    // eleman sabit uç kuvvetleri → düğüm yükleri (−Oᵀ f, global)
    const femNode = (e, f) => { const kl = e.ku, O = kl.O, T = T12(kl.R), fn = O[0].map((_, j) => O.reduce((t, r, k) => t + r[j] * f[k], 0)), fg = T[0].map((_, j) => T.reduce((t, r, k) => t + r[j] * fn[k], 0)); return fg; };
    for (const [e, F] of femEl) for (const cas of ['G', 'Q']) { const fg = femNode(e, F[cas]), dm = [...map[e.i], ...map[e.j]]; for (let a = 0; a < 12; a++) for (const [ix, cf] of dm[a]) yuk[cas][ix] += cf * fg[a]; } // eşdeğer düğüm yükleri
    /* ---- modal analiz (yoğunlaştırılmış diyafram serbestlikleri) ---- */
    const mIdx = master.flat(), sIdx = [...Array(N).keys()].filter(i => !mIdx.includes(i));
    const Kss = sIdx.map(i => sIdx.map(j => Kc[i][j])), Ksm = sIdx.map(i => mIdx.map(j => Kc[i][j]));
    const X = coz(Kss, Ksm), Kcd = mIdx.map((i, a) => mIdx.map((j, b) => Kc[i][j] - sIdx.reduce((t, s, k) => t + Kc[i][s] * X[k][b], 0)));
    const Mv = kat.flatMap(k => [k.m, k.m, k.mr2]), Ms = Mv.map(v => 1 / Math.sqrt(Math.max(v, 1e-9)));
    const Ah = Kcd.map((r, i) => r.map((v, j) => v * Ms[i] * Ms[j])), Ah2 = Ah.map((r, i) => r.map((v, j) => (v + Ah[j][i]) / 2)), ej = jacobi(Ah2);
    const modlar = ej.val.map((lam, k) => { const phi = ej.vec.map((r, i) => r[k] * Ms[i]), Mn = phi.reduce((t, v, i) => t + Mv[i] * v * v, 0), rX = kat.map((_, l) => phi[3 * l] * Mv[3 * l]).reduce((a, b) => a + b, 0), rY = kat.map((_, l) => phi[3 * l + 1] * Mv[3 * l + 1]).reduce((a, b) => a + b, 0), rT = kat.map((_, l) => phi[3 * l + 2] * Mv[3 * l + 2]).reduce((a, b) => a + b, 0); const Mt = kat.reduce((t, k) => t + k.m, 0), It = kat.reduce((t, k) => t + k.mr2, 0); return { T: lam > 0 ? 2 * Math.PI / Math.sqrt(lam) : 0, mx: rX * rX / Mn / Mt, my: rY * rY / Mn / Mt, mt: rT * rT / Mn / It, phi }; }).filter(m => m.T > 0).sort((a, b) => b.T - a.T);
    const hakim = d => modlar.reduce((b, m) => ((d === 'X' ? m.mx : m.my) > (d === 'X' ? b.mx : b.my) ? m : b), modlar[0]);
    /* ---- eşdeğer deprem yükü ---- */
    const Ct = dv.Ct || 0.1, HN = Math.max(...kat.map(k => k.H)), Temp = Ct * Math.pow(Math.max(HN, 0.1), 0.75), SD1 = +dv.SD1 || 0, TA = SDS > 0 ? 0.2 * SD1 / SDS : 0, TB = SDS > 0 ? SD1 / SDS : 0;
    const Sae = T => (T < TA ? (0.4 + 0.6 * T / TA) * SDS : T <= TB ? SDS : T <= 6 ? SD1 / T : SD1 * 6 / (T * T)), RI = dv.R / dv.I, Ra = T => (T > TB ? RI : dv.D + (RI - dv.D) * T / (TB || 1));
    const Wt = kat.reduce((t, k) => t + k.w, 0), sWH = kat.reduce((t, k) => t + k.w * k.H, 0);
    const SDS3 = +dv.SDS3, SD13 = +dv.SD13, Sae3 = SDS3 > 0 && SD13 > 0 ? (T => { const ta = 0.2 * SD13 / SDS3, tb = SD13 / SDS3; return T < ta ? (0.4 + 0.6 * T / ta) * SDS3 : T <= tb ? SDS3 : T <= 6 ? SD13 / T : SD13 * 6 / (T * T); }) : null;
    const yon = {};
    for (const d of ['X', 'Y']) {
      const md = hakim(d), Tm = md ? md.T : Temp, T = Math.min(Tm, 1.4 * Temp), SaR = SDS > 0 ? Sae(T) / Ra(T) : 0, Vt = Math.max(Wt * SaR, 0.04 * dv.I * SDS * Wt), dFN = 0.0075 * kat.length * Vt;
      const F = kat.map((k, i) => (sWH > 0 ? (Vt - dFN) * k.w * k.H / sWH : 0) + (k.H >= HN - 1e-6 ? dFN : 0)), V = F.map((_, i) => kat.filter(k => k.z >= kat[i].z - 1e-6).reduce((t, k) => t + F[k.li], 0));
      yon[d] = { Tmod: Tm, T, Temp, Tlim: 1.4 * Temp, Sae: Sae(T), Ra: Ra(T), SaR, Vt, Vmin: 0.04 * dv.I * SDS * Wt, F, V, lam: Sae3 ? Sae3(T) / Sae(T) : null };
      for (const sg of [1, -1]) { const v = new Array(N).fill(0); kat.forEach((k, i) => { const m = master[i], e = 0.05 * (d === 'X' ? k.By : k.Bx); v[m[d === 'X' ? 0 : 1]] += F[i]; v[m[2]] += F[i] * e * sg * (d === 'X' ? -1 : 1); }); yuk['E' + d + (sg > 0 ? '+' : '-')] = v; }
    }
    /* ---- statik çözümler ---- */
    const U = {}; U.G = coz(Ku, yuk.G); U.Q = coz(Ku, yuk.Q); for (const c of ['EX+', 'EX-', 'EY+', 'EY-']) U[c] = coz(Kc, yuk[c]);
    const dugU = (u, n) => [0, 1, 2, 3, 4, 5].map(k => map[n][k].reduce((t, [ix, cf]) => t + cf * u[ix], 0));
    // eleman uç kuvvetleri (yerel, esnek uçlarda): f = Kf·O·Tᵀ... + sabit uç
    const elKuv = (e, cas) => {
      const kl = cas === 'G' || cas === 'Q' ? e.ku : e.kc, T = T12(kl.R), ug = [...dugU(U[cas], e.i), ...dugU(U[cas], e.j)], ul = T.map(r => r.reduce((t, v, k) => t + v * ug[k], 0)), uf = kl.O.map(r => r.reduce((t, v, k) => t + v * ul[k], 0)), f = kl.Kf.map(r => r.reduce((t, v, k) => t + v * uf[k], 0));
      const F0 = (cas === 'G' || cas === 'Q') && femEl.get(e) ? femEl.get(e)[cas] : null; if (F0) for (let i = 0; i < 12; i++) f[i] -= F0[i]; return f; // uç kuvvetleri = K·u − eşdeğer yük
    };
    /* ---- göreli kat ötelemeleri (kolon uçları) ---- */
    const ote = {};
    for (const d of ['X', 'Y']) {
      const k0 = d === 'X' ? 0 : 1, sonuc = kat.map(() => ({ D0: 0, el: null }));
      for (const cas of ['E' + d + '+', 'E' + d + '-']) for (const e of els) if (e.tip === 'kolon') {
        const li = levIdx(nodes[e.j].z); if (li < 0) continue; const D0 = Math.abs(dugU(U[cas], e.j)[k0] - dugU(U[cas], e.i)[k0]), h = nodes[e.j].z - nodes[e.i].z;
        const kh = kat[li].h; const D = h > kh + 0.2 ? D0 * kh / h : D0; if (D > sonuc[li].D0) sonuc[li] = { D0: D, el: e.c.no };
      }
      const Y = yon[d], lim = (+dv.otelemeLim || 0.008) * (+dv.kappa || 1);
      ote[d] = sonuc.map((s, i) => { const de = s.D0 * dv.R / dv.I, oran = kat[i].h > 0 ? de / kat[i].h : 0; return { D0: s.D0, de, oran, el: s.el, lam: Y.lam != null ? Y.lam * oran : null, ok: Y.lam != null ? Y.lam * oran <= lim : null }; });
      Y.ote = ote[d]; Y.lim = lim;
    }
    /* ---- kolon tasarım girdileri ---- */
    for (const c of kolonlar) {
      const ce = els.filter(e => e.tip === 'kolon' && e.c === c); if (!ce.length) continue; const tab = ce[0];
      const N0 = cas => elKuv(tab, cas)[0]; // alt uçta (i) eleman eksenel kuvveti: basınç +
      const Mx = (e, cas, uc) => { const f = elKuv(e, cas); return Math.abs(f[uc ? 11 : 5]); }, My = (e, cas, uc) => { const f = elKuv(e, cas); return Math.abs(f[uc ? 10 : 4]); };
      // yerel y = global X → yerel z momenti (Mz) X yönü eğilme; yerel My Y yönü eğilme
      const mxG = Math.max(...ce.flatMap(e => [Mx(e, 'G', 0), Mx(e, 'G', 1)])), myG = Math.max(...ce.flatMap(e => [My(e, 'G', 0), My(e, 'G', 1)])), mxQ = Math.max(...ce.flatMap(e => [Mx(e, 'Q', 0), Mx(e, 'Q', 1)])), myQ = Math.max(...ce.flatMap(e => [My(e, 'Q', 0), My(e, 'Q', 1)]));
      c.NG = N0('G'); c.NQ = N0('Q'); c.Mg = { X: { G: mxG, Q: mxQ }, Y: { G: myG, Q: myQ } };
      for (const d of ['X', 'Y']) {
        let best = { V: 0, t: 0, b: 0 }, NE = 0;
        for (const cas of ['E' + d + '+', 'E' + d + '-']) { NE = Math.max(NE, Math.abs(elKuv(tab, cas)[0])); for (const e of ce) { const f = elKuv(e, cas), V = Math.hypot(f[1], f[2]), mb = d === 'X' ? Math.abs(f[5]) : Math.abs(f[4]), mt = d === 'X' ? Math.abs(f[11]) : Math.abs(f[10]); if (mb + mt > best.t + best.b) best = { V, t: mt, b: mb }; } }
        c.ME[d] = best; c.NE[d] = NE; c.NEt = c.NEt || {}; c.NEt[d] = NE;
      }
      c.k3B = true;
      /* kolon ayağı tepkisi (alt yapıya / temele aktarılan yük, global eksenler, kN · kNm): kolonun tabandaki ucundan mesnede etkiyen kuvvet
         = −(eleman uç kuvveti), G'de taban düğümüne düşen yarım kolon ağırlığı da eklenir. [Fx, Fy, Fz, Mx, My, Mz] (Fz < 0: aşağı) */
      if (nodes[tab.i].fix) { const R0 = tab.ku.R, glob = (f, o) => [0, 1, 2].map(k => R0[0][k] * f[o] + R0[1][k] * f[o + 1] + R0[2][k] * f[o + 2]);
        c.tabanYuk = {}; for (const cas of ['G', 'Q', 'EX+', 'EX-', 'EY+', 'EY-']) { const f = elKuv(tab, cas), F = glob(f, 0), Mm = glob(f, 3); c.tabanYuk[cas] = [-F[0], -F[1], -F[2], -Mm[0], -Mm[1], -Mm[2]]; }
        const pi = nodes[tab.i], pj = nodes[tab.j]; c.tabanYuk.G[2] -= gc * tab.A * (pj.z - pi.z) / 2; c.tabanZ = pi.z; }
    }
    return { yukTop, dugum: nodes.length, eleman: els.length, sb: N, kat, modlar, yon, ote, Wt, HN, Temp, TA, TB, SDS, SD1, R: dv.R, D: dv.D, I: dv.I, n: dv.n, kC, kB };
  };
  P.cerceve3BHook = ctx => { if (ctx.dv.analiz3B === false || !ctx.kolonlar.length || !ctx.zincirler.length) return null; const r = P.cerceve3B(ctx); if (ctx.deprem) ctx.deprem.cer3B = r; return r; };
})();

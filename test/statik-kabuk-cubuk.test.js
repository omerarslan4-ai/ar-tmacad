/* Kabuk sonlu eleman modelinde kolon / kiriş çubukları (app/hesap/statik-kabuk.js).
   1) Tek çubuk konsol: uç sehimi P·L³/(3·E·I), uç dönmesi P·L²/(2·E·I), eksenel P·L/(E·A) — iki eğilme düzleminde.
   2) Kaburga kesiti: 30 cm perdenin bir yüzüyle aynı hizada 50/50 kolon → perde dışına taşan 20 cm (A, I orta düzleme göre).
   3) Kabuk kutu (Konya terfi pompa holüne benzer, toprak itkisi gibi yatay yük): perde içine gömülü kolonlar perdeyi taşır —
      perde ortasındaki yatay sehim kolonsuz modele göre azalır (üstü döşeme şeridiyle tutulu perdede ≈ %20); kirişli döşeme sehimi kirişsizden küçüktür.
   Çalıştır: node test/statik-kabuk-cubuk.test.js */
'use strict';
const assert = require('assert');
require('../app/hesap/statik-kabuk.js');
const P = globalThis.STATIK, I = P._kabukIc;
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yak = (a, b, r) => assert.ok(Math.abs(a - b) <= r * Math.abs(b), `${a} ≉ ${b} (±%${r * 100})`);

// küçük yoğun çözücü (Gauss)
const coz = (K, f, serbest) => { const m = serbest.length, A = serbest.map(i => serbest.map(j => K[i * 12 + j])), b = serbest.map(i => f[i]);
  for (let c = 0; c < m; c++) { let p = c; for (let r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < m; r++) { const k = A[r][c] / A[c][c]; for (let q = c; q < m; q++) A[r][q] -= k * A[c][q]; b[r] -= k * b[c]; } }
  const x = new Array(m).fill(0); for (let r = m - 1; r >= 0; r--) { let s = b[r]; for (let q = r + 1; q < m; q++) s -= A[r][q] * x[q]; x[r] = s / A[r][r]; }
  const u = new Array(12).fill(0); serbest.forEach((i, k) => { u[i] = x[k]; }); return u; };

t('konsol çubuk: sehim, dönme ve eksenel boy değişimi (iki düzlem, eğik eksen)', () => {
  const E = 3e7, nu = 0.2, s = { A: 0.12, I3: 0.004, I2: 0.0016, J: 0.002 }, L = 4;
  const A = [1, 2, 0], d = [0.6, 0.0, 0.8], B = A.map((v, i) => v + d[i] * L), ref = [0, 1, 0];
  const { Kg, R } = I.cubukKg([A, B], E, nu, s, ref), serbest = [6, 7, 8, 9, 10, 11];
  for (const [yon, Iy, dth] of [[1, s.I3, 5], [2, s.I2, 4]]) { const Pk = 10, f = new Array(12).fill(0); for (let p = 0; p < 3; p++) f[6 + p] = Pk * R[yon][p];
    const u = coz(Kg, f, serbest), dl = [0, 1, 2].map(k => R[yon].reduce((s2, r, p) => s2 + r * u[6 + p], 0))[0], th = R.map(r => r[0] * u[9] + r[1] * u[10] + r[2] * u[11]);
    const w = R[yon][0] * u[6] + R[yon][1] * u[7] + R[yon][2] * u[8]; void dl;
    yak(w, Pk * L ** 3 / (3 * E * Iy), 1e-9); yak(Math.abs(th[dth % 3 === 2 ? 2 : 1]), Pk * L ** 2 / (2 * E * Iy), 1e-9); }
  const f = new Array(12).fill(0); for (let p = 0; p < 3; p++) f[6 + p] = 100 * R[0][p]; const u = coz(Kg, f, serbest);
  yak(R[0][0] * u[6] + R[0][1] * u[7] + R[0][2] * u[8], 100 * L / (E * s.A), 1e-9);
});

t('kaburga kesiti: 30 cm perde + 50/50 kolon (bir yüz hizalı) → dışa taşan 20 cm', () => {
  const s = P.kaburgaKesit(0.5, 0.10 - 0.25, 0.10 + 0.25, 0.30);
  yak(s.A, 0.5 * 0.2, 1e-12); yak(s.I3, 0.5 * (0.35 ** 3 - 0.15 ** 3) / 3, 1e-12); yak(s.I2, 0.2 * 0.5 ** 3 / 12, 1e-12);
  assert.strictEqual(P.kaburgaKesit(0.3, -0.1, 0.1, 0.3), null);                                      // perde içinde kalan kolon: çubuk yok
  const k = P.kaburgaKesit(0.4, -(0.075 + 0.35), 0.075, 0.15); yak(k.A, 0.4 * 0.35, 1e-12);            // 15 cm döşeme altında 40/50 kiriş
});

/* kutu: 12 × 6 m, perdeler 30 cm, yükseklik 6 m, radye 40 cm; üstte kenarlarda 1,5 m'lik yürüme şeridi (ortası boşluk) */
const kutu = (kolon, kiris) => ({
  walls: [{ ad: 'P1', pts: [[0, 0], [12, 0]], t: 0.3, zt: 0, tip: 'dis' }, { ad: 'P2', pts: [[12, 0], [12, 6]], t: 0.3, zt: 0, tip: 'dis' },
    { ad: 'P3', pts: [[12, 6], [0, 6]], t: 0.3, zt: 0, tip: 'dis' }, { ad: 'P4', pts: [[0, 6], [0, 0]], t: 0.3, zt: 0, tip: 'dis' }],
  radye: { pts: [[-0.5, -0.5], [12.5, -0.5], [12.5, 6.5], [-0.5, 6.5]], t: 0.4, kAlt: -6.4 },
  dosemeler: [{ ad: 'D1', pts: [[0, 0], [12, 0], [12, 1.5], [0, 1.5]], t: 0.15, zt: 0.075, g: 1.5, q: 5 }],
  kolonlar: kolon ? [3, 6, 9].map(x => ({ no: 'S' + x, x, y: 0.1, bx: 0.5, by: 0.5, z0: -6.0, zt: 0 })) : [],
  kirisler: kiris ? [{ no: 'K1', a: [0, 1.3], b: [12, 1.3], zt: 0.075, bw: 0.4, hb: 0.5 }] : [],
});
const coz3 = (M) => { const AG = P.kabukAg(M, { h: 0.5 }), yuk = { H: e => { if (e.tur !== 'perde') return null; const y = AG.nodes[e.n[0]][1], y2 = AG.nodes[e.n[1]][1]; if (Math.abs(y - y2) > 1e-6 || (y > 0.5 && y < 5.5)) return null; const s2 = y < 3 ? 1 : -1; return p => [0, s2 * 30 * Math.max(0, -p[2]) / 6, 0]; }, // iki uzun perdeye içe doğru üçgen yük (toprak itkisi gibi, dengeli)
  V: e => (e.tur === 'doseme' ? () => [0, 0, -10] : null) };
  const r = P.kabukCoz(AG, { E: 3.2e7, nu: 0.2, kw: 30000 }, yuk); return { AG, r }; };
const nokta = (AG, U, x, y, z, d) => { let bi = 0, bd = 1e9; AG.nodes.forEach((p, i) => { const q = Math.hypot(p[0] - x, p[1] - y, p[2] - z); if (q < bd) { bd = q; bi = i; } }); return U[bi * 6 + d]; };

t('kabuk kutu: perde içine gömülü kolonlar kaburga çubuk olur ve perdenin yatay sehimini azaltır', () => {
  const a = coz3(kutu(false, false)), b = coz3(kutu(true, false));
  assert.strictEqual(a.AG.bars.length, 0); assert.ok(b.AG.bars.length >= 3 * 12, 'her kolon perde boyunca çubuklara bölünmeli');
  assert.ok(b.AG.bars.every(br => br.tur === 'kolon' && Math.abs(br.s.A - 0.5 * 0.2) < 1e-9));
  const rel = (G, U) => Math.abs(nokta(G, U, 4.5, 0, -3, 1) - nokta(G, U, 0, 0, -3, 1)), ua = rel(a.AG, a.r.sonuc.H), ub = rel(b.AG, b.r.sonuc.H);
  assert.ok(ub < 0.9 * ua, `kolonlu sehim ${ub} kolonsuzun (${ua}) %90'ından küçük olmalı`);
  const kf = P.kabukCubukKuvvet(b.AG, b.r.sonuc.H, 'H'); assert.strictEqual(kf.length, b.AG.bars.length);
  assert.ok(Math.max(...kf.map(f => Math.max(Math.abs(f[5]), Math.abs(f[11])))) > 1, 'kolonda toprak itkisinden moment oluşmalı');
});

t('kabuk kutu: döşeme altındaki kiriş çubuk eleman — döşeme kenar sehimini azaltır, eski rijit mesnet kabulü seçilebilir', () => {
  const a = coz3(kutu(true, false)), b = coz3(kutu(true, true));
  const wa = Math.abs(nokta(a.AG, a.r.sonuc.V, 6, 1.3, 0, 2)), wb = Math.abs(nokta(b.AG, b.r.sonuc.V, 6, 1.3, 0, 2));
  assert.ok(b.AG.bars.some(br => br.tur === 'kiris')); assert.ok(wb < wa, `kirişli ${wb} < kirişsiz ${wa}`);
  const r = P.kabukAg(kutu(true, true), { h: 0.5, kirisRijit: true }); assert.ok(r.mes.size > 0 && !r.bars.some(br => br.tur === 'kiris'));
});

t('döşeme kenarı perde iç yüzünde (perde ekseni poligon dışında) olsa da döşeme perdeye bağlanır', () => {
  const M = kutu(false, false); M.dosemeler[0].pts = [[0.15, 0.15], [11.85, 0.15], [11.85, 1.5], [0.15, 1.5]];
  const { AG, r } = coz3(M); let wm = 0; AG.nodes.forEach((p, i) => { wm = Math.max(wm, Math.abs(r.sonuc.V[i * 6 + 2])); });
  assert.ok(wm < 0.01, `döşeme sehimi ${wm} m — döşeme perdeye bağlanmamış (havada)`);
});

console.log(`\n${n} test geçti.`);

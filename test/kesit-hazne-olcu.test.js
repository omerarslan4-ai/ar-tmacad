/* Hazne / havuz kesitinde içeriden ölçü (app/cizim-kural.js kesitIcOlculerHazne) — çalıştır: node test/kesit-hazne-olcu.test.js
   Kullanıcı 20.11.2026: "ölçülendirmede kesitler için yapı içerisinde verebilirsin; iki ölçü arası birbirine değmeyecek şekilde".
   GERÇEK PROJE: 50.000 m³/gün anaerobik havuzunun B-B kesiti (test-proje/Anaerobik-50bin-statik.aritma, ANABOYUT Q=50000):
   radye 0,80 (92,14 − 0,80 = 91,34), duvar üstü 97,25; enine: dış duvar 0,70 · koridor 3,925 · orta perde 0,35 · koridor 3,925 · ortak duvar 0,70 … (3 halka). */
'use strict';
const assert = require('assert'); require('../app/cizim-kural.js');
const K = globalThis.C.cizimKural; let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yakin = (a, b, m) => assert.ok(Math.abs(a - b) < 0.002, m + ': ' + a + ' ≠ ' + b);
const R = (x0, z0, x1, z1) => ({ lk: 'BETON', pts: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] });

/* B-B: 3 halka; her halkada iki koridor ve orta perde */
const zr0 = 91.34, zr1 = 92.14, zt = 97.25, two = 0.7, tw = 0.35, b = 3.925;
const H = [R(0, zr0, 3 * (2 * b + tw) + 4 * two, zr1)]; let x = 0;
H.push(R(x, zr1 - 0.01, x + two, zt)); x += two;
for (let i = 0; i < 3; i++) { x += b; H.push(R(x, zr1 - 0.01, x + tw, zt)); x += tw + b; H.push(R(x, zr1 - 0.01, x + two, zt)); x += two; }
const mm = 0.1;
assert.strictEqual(K.MIMARI.olcuYeri.genel.icYatayHazne, 12, 'tablodaki değer'); // // 1/100: kâğıtta 1 mm = modelde 0,10 m

t('50 bin B-B: yatay zincir içeride — duvar · koridor · orta perde … ; düşey zincir ilk bölmede — radye · net yükseklik', () => {
  const O = K.kesitIcOlculer(H, mm, { icYatay: 25, icDusey: 20, icYatayHazne: 12 }), Hd = O.filter(q => q.k === 'h'), Vd = O.filter(q => q.k === 'v');
  const boy = Hd.map(q => +(q.b[0] - q.a[0]).toFixed(3));
  assert.deepStrictEqual(boy, [0.7, 3.925, 0.35, 3.925, 0.7, 3.925, 0.35, 3.925, 0.7, 3.925, 0.35, 3.925, 0.7], 'yatay zincir: ' + boy.join(' '));
  for (const q of Hd) { assert.ok(q.p[1] > zr1 && q.p[1] < zt, 'yatay zincir yapının içinde'); yakin(q.p[1], zr1 + 1.2, 'radye üstünden 12 mm (1/100: 1,20 m; duvar kodlarının altında)'); }
  assert.deepStrictEqual(Vd.map(q => +(q.b[1] - q.a[1]).toFixed(3)), [0.8, 5.11], 'düşey: radye 0,80 + net 5,11');
  assert.ok(Vd.every(q => q.p[0] > two && q.p[0] < two + b), 'düşey zincir ilk koridorun içinde');
});
t('zincir kot / yazı kutusuna binmez; tek parça olmayan (perde / döşeme) kesit eski kurala gider', () => {
  const engel = [[0, zr1 + 1.0, 40, zr1 + 1.5]]; // radye üstünden 1,0 – 1,5 m arası bir kot şeridi
  const Hd = K.kesitIcOlculer(H, mm, { icYatay: 25, icDusey: 20, icYatayHazne: 12, engelK: engel }).filter(q => q.k === 'h');
  assert.ok(Hd.every(q => q.p[1] - mm - 0.5 * mm >= zr1 + 1.5 - 1e-9 || q.p[1] + 3 * mm <= zr1 + 1.0 + 1e-9), 'zincir kot şeridinin dışında: ' + Hd[0].p[1]);
  const bina = [{ lk: 'PERDE', pts: [[0, 0], [0.3, 0], [0.3, 3], [0, 3]] }, { lk: 'PERDE', pts: [[5, 0], [5.3, 0], [5.3, 3], [5, 3]] }, { lk: 'DOSEME', pts: [[0, -0.3], [5.3, -0.3], [5.3, 0], [0, 0]] }, { lk: 'DOSEME', pts: [[0, 3], [5.3, 3], [5.3, 3.3], [0, 3.3]] }];
  const Ob = K.kesitIcOlculer(bina, 0.05, { icYatay: 25, icDusey: 20 }); assert.ok(Ob.some(q => q.k === 'h') && Ob.some(q => q.k === 'v'), 'bina kesitinde eski kural çalışır');
  assert.deepStrictEqual(K.kesitIcOlculerHazne([], mm), [], 'boş kesit');
});

console.log(String.fromCharCode(10) + n + ' test geçti.');

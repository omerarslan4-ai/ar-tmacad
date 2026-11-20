/* Anaerobik havuz plan aksları ve ölçüleri testi — çalıştır: node test/anaerobik-olcu.test.js
   GERÇEK PROJE: kullanıcının 50.000 m³/gün havuzu (test-proje/Anaerobik-50bin-statik.aritma): 3 halka, Ro 4,10, düz boy 29,40,
   orta perde 35, dış / ortak duvar 70, kanal duvarı 65 cm, giriş kanalı 2,20, çıkış kanalı 2,40, ağız 2,00, pencere 3,00.
   Beklenen değerler elle: dış ölçü boy 0,65+2,20+0,70+4,10+29,40+4,10+0,70+2,40+0,65 = 44,90; en 3·8,20 + 4·0,70 = 27,40. */
'use strict';
const assert = require('assert');
const A = require('../app/anaerobik.js'), O = require('../app/anaerobik-olcu.js');
let n = 0; const t = (ad, fn) => { fn(); n++; console.log('✓ ' + ad); };
const yakin = (a, b, m) => assert.ok(Math.abs(a - b) < 0.0015, m + ': ' + a + ' ≠ ' + b);
const fark = v => v.slice(1).map((x, i) => +(x - v[i]).toFixed(3));
const E50 = { n: 3, Ls: 29.4, Ro: 4.1, tw: 0.35, two: 0.7, rg: 1.95, tg: 0.3, bG: 2.2, bC: 2.4, tK: 0.65, ag: 2, ah: 2.05, dAg: 1.94, ow: 3, oh: 2.25, dPe: 2.14, bO: 1.4, h: 4.5, tb: 0.8, k2: 1 };
const G = A.geo(E50), P = O.olcuPlan(G, { mm: 0.05 });
const zin = (g, yon) => P.zincir.filter(z => z.grup === g && (!yon || z.yon === yon));

t('50 bin: akslar duvar eksenlerinde', () => {
  assert.deepStrictEqual(P.aks.xs, [0.325, 3.2, 7.65, 37.05, 41.5, 44.575]);
  assert.deepStrictEqual(P.aks.ys, [0.35, 4.8, 9.25, 13.7, 18.15, 22.6, 27.05]);
});
t('dış sıralar: dış yüz – akslar – dış yüz ve toplam; sıra aralığı 25 cm, ilk sıra 14 mm dışarıda', () => {
  const [ax] = zin('aks', 'x'), [tx] = zin('toplam', 'x'), [ay] = zin('aks', 'y'), [ty] = zin('toplam', 'y');
  assert.deepStrictEqual(ax.nok, [0, 0.325, 3.2, 7.65, 37.05, 41.5, 44.575, 44.9]); assert.deepStrictEqual(tx.nok, [0, 44.9]);
  assert.deepStrictEqual(ay.nok, [0, 0.35, 4.8, 9.25, 13.7, 18.15, 22.6, 27.05, 27.4]); assert.deepStrictEqual(ty.nok, [0, 27.4]);
  yakin(ax.p - tx.p, 0.25, 'alt sıra aralığı'); yakin(ay.p - ty.p, 0.25, 'sol sıra aralığı');
  yakin(ay.p, -1.0 - 14 * 0.05, 'sol ilk sıra tretuvarın 14 mm dışında'); assert.ok(ax.p < -1.4 - 14 * 0.05 + 1e-9, 'alt ilk sıra açıklama yazısının dışında');
  assert.ok(P.balon.ALT > 0 && P.balon.SOL > 0);
});
t('ünite içi: koridor zinciri, düz boy, kanal enleri', () => {
  const [k] = zin('koridor');
  assert.deepStrictEqual(fark(k.nok), [0.7, 3.925, 0.35, 3.925, 0.7, 3.925, 0.35, 3.925, 0.7, 3.925, 0.35, 3.925, 0.7]);
  assert.deepStrictEqual(fark(zin('duzboy')[0].nok), [4.1, 29.4, 4.1]);
  const [sol, sag] = zin('kanal'); assert.deepStrictEqual(fark(sol.nok), [0.65, 2.2, 0.7]); assert.deepStrictEqual(fark(sag.nok), [0.7, 2.4, 0.65]);
});
t('ağız, pencere, orifis ve köprü yerleri', () => {
  const [sol, sag] = zin('agiz');
  yakin(sol.nok[0], G.kanal.yb, 'kanal alt ucu'); assert.strictEqual(fark(sol.nok).filter(v => v === 2).length, 3, 'üç ağız 2,00');
  assert.strictEqual(fark(sol.nok)[0], 0.65); assert.ok(fark(sag.nok).filter(v => v === 0.65).length === 3, 'sağ kanalda ara duvar da (0,65)');
  const pen = zin('pencere'); assert.strictEqual(pen.length, 2); yakin(fark(pen[0].nok)[1], 3.0, 'pencere eni');
  const [orf] = zin('orifis'); assert.deepStrictEqual(fark(orf.nok), [0.2, 2, 0.2]);
  const [kp] = zin('kopru'); assert.strictEqual(fark(kp.nok).filter(v => v === 1.5).length, 2, 'köprü ve ikinci yürüyüş yolu 1,50');
  assert.deepStrictEqual(P.yaricap.map(y => y.r), [4.1, 1.95, 4.8]);
});
t('Çokal T-105 (varsayılan) ve tek halka: zincirler tutarlı', () => {
  const Gc = A.geo({}), Pc = O.olcuPlan(Gc, { mm: 0.05 });
  for (const z of Pc.zincir) for (const d of fark(z.nok)) assert.ok(d > 0.005, z.grup);
  assert.deepStrictEqual(fark(Pc.zincir.find(z => z.grup === 'koridor').nok), [0.4, 1.35, 0.3, 1.35, 0.4, 1.35, 0.3, 1.35, 0.4, 1.35, 0.3, 1.35, 0.4]);
  yakin(Pc.zincir.find(z => z.grup === 'toplam' && z.yon === 'x').nok[1], 17.2, 'Çokal boy 17,20');
  const P1 = O.olcuPlan(A.geo({ n: 1 }), { mm: 0.05 });
  assert.strictEqual(P1.zincir.filter(z => z.grup === 'pencere' || z.grup === 'orifis').length, 0); assert.strictEqual(P1.aks.ys.length, 3);
});
console.log(String.fromCharCode(10) + n + ' test geçti.');

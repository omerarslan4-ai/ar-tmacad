/* KSB AmaProp 2603 üretici modelli dalgıç mikser testi — çalıştır: node test/mikser-ksb.test.js
   GERÇEK VERİ: KSB föyü "AmaProp V 045 2603" (3Dfindit): pervane Ø2603 mm, 45 d/dk, 5,5 kW, MA16M 4 kutup, SP190 X dişli, kılavuz ray 6000 mm,
   mikser merkezi "tabandan" 1450 mm. Modelden ölçülen: pervane ekseni ayak altından 1610 mm (= 1450 + rayın başladığı 160 mm),
   üst tutucunun arka yüzü motor arkasından 518 mm geride (dalgıç mikser ailesinde tabliye ön yüzü 700/2 + 120 + 50 = 520 mm geride).
   50 bin m³/gün anaerobik havuzu: taban 92,14, yürüme yolu üstü 97,45 → Hd = 5310 mm. */
'use strict';
const assert = require('assert');
globalThis.C = {}; require('../app/mikser-ksb-veri.js');
const V = globalThis.C.MIKSER_KSB_VERI['2603'], K = require('../app/mikser-ksb.js');
let n = 0; const t = (ad, fn) => { fn(); n++; console.log('✓ ' + ad); };
const yakin = (a, b, m, tol) => assert.ok(Math.abs(a - b) <= (tol == null ? 1 : tol), m + ': ' + a + ' ≠ ' + b);
const coz = s => { const b = Buffer.from(s, 'base64'); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };

t('model verisi: föydeki 8 parça (BOM 1.1 … 1.8), üçgenler geçerli', () => {
  assert.deepStrictEqual(V.parca.map(p => p.ad), ['ayak', 'ray', 'ustTutucu', 'kizak', 'motor', 'disli', 'pervane', 'askiKolu']);
  let top = 0;
  for (const p of V.parca) { const A = new Int16Array(coz(p.v)), F = new Uint16Array(coz(p.f)); assert.ok(F.length % 3 === 0 && A.length % 3 === 0); for (const i of F) assert.ok(i < A.length / 3, p.ad + ': üçgen köşesi dizide'); top += F.length / 3; assert.ok(p.plan.length >= 3, p.ad + ': plan zarfı'); }
  assert.ok(top > 10000 && top < 13000, 'üçgen sayısı ' + top);
});
t('ölçüler föyle tutuyor: ray 6000 mm, pervane ekseni 1450 + 160, itki +y, eksen ortada', () => {
  const bb = ad => V.parca.find(p => p.ad === ad).bb;
  yakin(bb('ray')[2][1] - bb('ray')[2][0], 6000, 'kılavuz ray boyu');
  yakin(V.gobek[1], 1450 + bb('ray')[2][0], 'pervane ekseni (föy 1450, rayın başladığı yükseklikten)', 2); yakin(V.gobek[0], 0, 'eksen enine ortada', 2);
  assert.ok(bb('pervane')[1][0] > bb('disli')[1][0] && bb('motor')[1][0] > bb('ray')[1][1], 'sıra itki yönünde: ray → motor → dişli → pervane');
  assert.strictEqual(bb('ayak')[2][0], 0, 'ayak altı = havuz tabanı');
  yakin(V.parca.find(p => p.ad === 'ustTutucu').bb[1][0], K.MODEL.ksb_amaprop_2603.tutucuY, 'üst tutucu arka yüzü');
  yakin(K.MODEL.ksb_amaprop_2603.tutucuY, -(700 / 2 + 120 + 50), 'aile direğinin tabliyeye değdiği yer', 3);
});
t('düşey yerleşim: üst tutucu tabliye üstünün 50 mm altında, ray tutucuya kadar (50 bin: Hd 5310)', () => {
  const Y = K.yerlesim(V, 5310), tut = V.parca.find(p => p.ad === 'ustTutucu').bb[2], ray = V.parca.find(p => p.ad === 'ray').bb[2];
  yakin(Y.tutucuUst, 5260, 'tutucu üstü'); yakin(tut[1] + Y.dz, 5260, 'tutucu kaydı');
  yakin(Y.z0 + (ray[1] - Y.z0) * Y.k, ray[1] + Y.dz, 'ray üstü tutucuyla birlikte iner'); yakin(Y.rayBoy, 6000 + (5260 - 6253), 'ray boyu');
  assert.ok(Y.k > 0.8 && Y.k < 1, 'ray kısalır');
  const Y2 = K.yerlesim(V, 8000); assert.ok(Y2.k > 1 && Y2.tutucuUst === 7950, 'derin havuzda ray uzar');
  const Y3 = K.yerlesim(V, 1000); assert.ok(Y3.tutucuUst >= 2183 + 600 - 50 - 1e-9, 'sığ değerde tutucu askı kolunun altına inmez');
});
t('seçim: 5,5 kW yavaş devirli mikser bu modeli kullanır; başka güç ya da hızlı mikser kullanmaz', () => {
  assert.strictEqual(K.modelBul({ D: 2.603, P: 5.5 }), 'ksb_amaprop_2603');
  assert.strictEqual(K.modelBul({ D: 2500, P: 5.5 }), 'ksb_amaprop_2603', 'mm ile ve mikser hesabındaki Ø2,5');
  assert.strictEqual(K.modelBul({ D: 2.5, P: 3.0 }), null); assert.strictEqual(K.modelBul({ D: 0.75, P: 5.5 }), null); assert.strictEqual(K.modelBul(null), null);
  const M = K.MODEL.ksb_amaprop_2603; assert.deepStrictEqual([M.D, M.P, M.rpm], [2603, 5.5, 45]);
});

t('katalog: KSB AmaProp 2603 yalnız anaerobikte aday, gücü sabit 5,5 kW; karusel seçimi değişmez (50 bin halkası: b 3,925, düz 29,40, su 4,50)', () => {
  globalThis.C = Object.assign(globalThis.C, { M: { fmt: (v, d) => (+v).toFixed(d) }, T: {}, prim: {}, meshDef: {}, addCommand() { }, on() { }, doc: { set: {} } });
  require('../app/karusel.js'); const C = globalThis.C, h = { b: 3.925, tw: 0.35, Ls: 29.4, H: 4.5, n0: 0 };
  const s = C.mikserSec(h), a = C.mikserSec(Object.assign({ unite: 'anaerobik' }, h));
  assert.ok(!s.cands.some(c => c.k === 'ksb2603'), 'karuselde aday değil');
  const k = a.cands.find(c => c.k === 'ksb2603'); assert.ok(k, 'anaerobikte aday'); assert.strictEqual(k.P, 5.5, 'güç indirilmez'); assert.strictEqual(k.model, 'ksb_amaprop_2603');
  assert.strictEqual(a.k, s.k, 'bu halkada en az güç yine aynı tip (KSB gereğinden hızlı: ' + k.v.toFixed(2) + ' m/s)');
  assert.ok(k.v > 0.30, 'KSB hız hedefini sağlar');
});

console.log(String.fromCharCode(10) + n + ' test geçti.');

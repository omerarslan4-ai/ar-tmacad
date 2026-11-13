/* Kabuk (3B) modelinde kalınlık önerisi adımı (app/hesap/statik-motor.js › P.kabukKalinlikAdim):
   firma basamakları (25 – 30 – 40 – 50 – 60 – 70 – 80; döşeme 15 – 30) ve perde yüksekliğine bağlı aralık [max(25, H/18) ; H/9,5'i karşılayan ilk basamak].
   Konya terfi: perdeler 6,50 m → en az 40, en çok 70 cm; 30 cm perde kurala göre zaten ince.
   Çalıştır: node test/statik-kabuk-kalinlik.test.js */
'use strict';
const assert = require('assert');
globalThis.STATIK = {};
require('../app/hesap/statik-plak.js'); require('../app/hesap/statik-motor.js');
const P = globalThis.STATIK;
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const model = () => ({ radye: { t: 0.40, kAlt: -7.16 }, walls: [{ ad: 'P1', t: 0.30, zt: -0.26 }, { ad: 'P2', t: 0.30, zt: -0.26 }, { ad: 'P3', t: 0.30, zt: -4.76 }], dosemeler: [{ ad: 'D5', t: 0.15 }] });

t('Konya: 6,50 m perde en az 40 cm basamağına çekilir, kısa perde (2 m) 30 cm kalır', () => {
  const M = model(), a = P.kabukKalinlikAdim(M, []);
  assert.ok(a.degisti); assert.strictEqual(M.walls[0].t, 0.40); assert.strictEqual(M.walls[1].t, 0.40); assert.strictEqual(M.walls[2].t, 0.30);
  assert.deepStrictEqual(P.perdeKalinlikAraligi(6.5), { H: 6.5, min: 0.40, max: 0.70 });
});

t('yetersiz perde bir basamak büyür, 70 cm üst sınırda durur ve uyarır; radye perde + iki basamağı geçmez; döşeme 30 cm’de durur', () => {
  const M = model(); P.kabukKalinlikAdim(M, []);
  for (let i = 0; i < 6; i++) P.kabukKalinlikAdim(M, [{ tur: 'perde', i: 0 }]);
  assert.strictEqual(M.walls[0].t, 0.70);
  const a = P.kabukKalinlikAdim(M, [{ tur: 'perde', i: 0 }]); assert.ok(!a.degisti && /üst sınırda/.test(a.sinir[0]));
  for (let i = 0; i < 6; i++) P.kabukKalinlikAdim(M, [{ tur: 'radye', i: 0 }]);
  assert.strictEqual(M.radye.t, 0.80); assert.ok(Math.abs(M.radye.kAlt + M.radye.t - (-6.76)) < 1e-9, 'radye üstü yerinde kalır');
  for (let i = 0; i < 5; i++) P.kabukKalinlikAdim(M, [{ tur: 'doseme', i: 0 }]);
  assert.strictEqual(M.dosemeler[0].t, 0.30);
});

console.log(`\n${n} test geçti.`);

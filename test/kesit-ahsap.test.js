/* Kesilen çatı ahşabının çaprazı (app/kesit.js ahsapCapraz) — Çokal 10-İdari Bina_R2 A-A / A'-A': aşık, mertek, dikme kesitte
   taramasız kutu + iki köşegen; boyuna kesilen tahta (kuşaklama, göğüsleme) çaprazsız.
   Çalıştır: node test/kesit-ahsap.test.js */
'use strict';
const assert = require('assert');
const { ahsapCapraz } = require('../app/kesit.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

t('aşık 10x10 enine kesit: iki köşegen (karşı köşeler)', () => {
  const X = ahsapCapraz([[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1]]);
  assert.strictEqual(X.length, 2); assert.deepStrictEqual(X[0], [[0, 0], [0.1, 0.1]]); assert.deepStrictEqual(X[1], [[0.1, 0], [0, 0.1]]);
});
t('eş doğrultulu ara noktalar köşe sayılmaz (kesit kenarında bölünmüş dörtgen)', () => {
  const X = ahsapCapraz([[0, 0], [0.05, 0], [0.1, 0], [0.1, 0.1], [0.1, 0.12], [0, 0.12]]); assert.strictEqual(X.length, 2);
});
t('eğik kesilen mertek 5x10 (30° dönük): yine iki köşegen', () => {
  const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6), R = ([x, y]) => [x * c - y * s, x * s + y * c];
  const X = ahsapCapraz([[0, 0], [0.05, 0], [0.05, 0.1], [0, 0.1]].map(R)); assert.strictEqual(X.length, 2);
  const d = X.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1])); assert.ok(Math.abs(d[0] - Math.hypot(0.05, 0.1)) < 1e-9 && Math.abs(d[1] - d[0]) < 1e-9);
});
t('boyuna kesilen tahta (kuşaklama 2,40 m × 10 cm): çapraz yok', () => {
  assert.deepStrictEqual(ahsapCapraz([[0, 0], [2.4, 0], [2.4, 0.1], [0, 0.1]]), []);
});
t('sınır: 35 cm kenar çaprazlı, 36 cm çaprazsız', () => {
  assert.strictEqual(ahsapCapraz([[0, 0], [0.35, 0], [0.35, 0.1], [0, 0.1]]).length, 2);
  assert.strictEqual(ahsapCapraz([[0, 0], [0.36, 0], [0.36, 0.1], [0, 0.1]]).length, 0);
});
t('dörtgen olmayan kesit (üçgen, beşgen): çapraz yok', () => {
  assert.deepStrictEqual(ahsapCapraz([[0, 0], [0.1, 0], [0, 0.1]]), []);
  assert.deepStrictEqual(ahsapCapraz([[0, 0], [0.1, 0], [0.12, 0.05], [0.1, 0.1], [0, 0.1]]), []);
});
console.log(`\n${n} test geçti.`);

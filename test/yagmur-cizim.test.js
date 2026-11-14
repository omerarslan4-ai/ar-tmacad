/* Yağmur oluğu ve iniş borusu (app/yagmur.js) — Çokal 10-İdari Bina_R2 DETAY-A (DN155 yarım daire çinko oluk, DN120 iniş borusu, 45° kaz boynu)
   ve Konya terfi (saçak 50 cm döşeme konsolu, tretuvar üstü −0,10): borunun yolu ve oluk kesiti.
   Çalıştır: node test/yagmur-cizim.test.js */
'use strict';
const assert = require('assert');
const Y = require('../app/yagmur.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yakin = (a, b, e = 1e-6) => Math.abs(a - b) < e;

t('iniş borusu yolu: oluk ağzından 10 cm düşey, 45° kaz boynuyla duvara, duvar boyunca, altta 45° dirsek 15 cm dışa', () => {
  // Konya: oluk ekseni saçak kenarının 7,75 cm dışında (DN155), saçak 50 cm; boru ekseni duvar yüzünden 4 + 6 = 10 cm dışarıda
  const g = [-0.5775, 4], w = [-0.1, 4], P = Y.inisYolu(g, w, 5.12, -0.1);
  assert.strictEqual(P.length, 5);
  assert.deepStrictEqual(P[0], [-0.5775, 4, 5.12]); assert.ok(yakin(P[1][2], 5.02));
  const d = Math.hypot(w[0] - g[0], w[1] - g[1]); assert.ok(yakin(P[1][2] - P[2][2], d, 1e-3), '45°'); assert.deepStrictEqual(P[2].slice(0, 2), w);
  assert.ok(yakin(P[3][2], 0.05)); assert.ok(yakin(P[4][2], -0.1)); assert.ok(yakin(P[4][0], -0.25), 'dirsek 15 cm dışa');
});
t('iniş borusu yolu: saçaksız (oluk duvarın dibinde) — kaz boynu yok', () => {
  const P = Y.inisYolu([0, 0], [0.01, 0], 3, 0); assert.strictEqual(P.length, 4); assert.ok(P.every(p => p[0] === 0 && p[1] === 0));
});
t('oluk kesiti: DN155 yarım daire (r 7,75 cm), ağız oluk kotunda, taban 7,75 cm aşağıda', () => {
  const K = Y.olukKesit(155); assert.ok(yakin(K[0][0], -0.0775) && yakin(K[0][1], 0)); assert.ok(yakin(K[K.length - 1][0], 0.0775, 1e-9));
  assert.ok(yakin(Math.min(...K.map(q => q[1])), -0.0775, 1e-9));
});
console.log(`\n${n} test geçti.`);

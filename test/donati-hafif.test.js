/* 3B donatı seyreltme (app/statik-donati-hafif.js) — sık örneklenmiş halka demiri ve kancalı düz çubuk.
   Gerçek örnek: 50 bin m³/gün anaerobik havuz radyesinde halka demiri çubuk başına ~190 parça. Çalıştır: node test/donati-hafif.test.js */
'use strict';
const assert = require('assert');
const { sade, sadeCubuk, parcaSay } = require('../app/statik-donati-hafif.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const uzak = (p, a, b) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], L2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2], k = Math.max(0, Math.min(1, (w[0] * d[0] + w[1] * d[1] + w[2] * d[2]) / L2)); return Math.hypot(w[0] - k * d[0], w[1] - k * d[1], w[2] - k * d[2]); };

t('halka demiri (R = 20 m, yarım daire, 190 parça): parça sayısı düşer, sapma ≤ 3 mm, uçlar yerinde', () => {
  const R = 20, b = []; for (let i = 0; i <= 190; i++) { const a = Math.PI * i / 190; b.push([R * Math.cos(a), R * Math.sin(a), 91.39]); }
  const s = sadeCubuk(b, 0.003);
  assert.deepStrictEqual(s[0], b[0]); assert.deepStrictEqual(s[s.length - 1], b[b.length - 1]);
  assert.ok(s.length - 1 <= 100 && s.length - 1 >= 60, 'parça: ' + (s.length - 1));
  for (const p of b) { let d = Infinity; for (let i = 1; i < s.length; i++) d = Math.min(d, uzak(p, s[i - 1], s[i])); assert.ok(d <= 0.003 + 1e-9, 'sapma ' + d); }
});

t('kancalı düz çubuk: doğrudaş ara noktalar gider, kanca köşeleri kalır', () => {
  const b = [[0, 0, 0.7], [0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [3, 0, 0.7]];
  assert.deepStrictEqual(sadeCubuk(b, 0.003), [[0, 0, 0.7], [0, 0, 0], [3, 0, 0], [3, 0, 0.7]]);
});

t('iki noktalı çubuk ve boş liste değişmez; parça sayımı', () => {
  const b = [[0, 0, 0], [5, 0, 0]]; assert.strictEqual(sadeCubuk(b, 0.003), b);
  assert.deepStrictEqual(sade([]), []); assert.strictEqual(parcaSay([b, [[0, 0, 0], [1, 0, 0], [1, 1, 0]]]), 3);
});

t('geri dönen çubuk (U firkete) düzleştirilmez', () => {
  const b = [[0, 0, 0], [1, 0, 0], [0, 0, 0.001]]; assert.strictEqual(sadeCubuk(b, 0.003).length, 3);
});
console.log(n + ' test geçti');

/* Elektrikli aktüatör kataloğu (app/aktuator-katalog.js) — üretici föyündeki sayılar ve 50 bin anaerobik kapaklarının seçimi.
   Çalıştır: node test/aktuator-katalog.test.js */
'use strict';
const assert = require('assert');
const A = require('../app/aktuator-katalog.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

t('katalog föyle aynı: tork aralıkları ve 32 / 45 d/dk motor gücü', () => {
  const i32 = A.DEVIR.indexOf(32), i45 = A.DEVIR.indexOf(45);
  const bek = { 'AKT-1': [10, 30, 0.10], 'AKT-2': [20, 60, 0.20], 'AKT-3': [40, 120, 0.40], 'AKT-4': [100, 250, 0.75], 'AKT-5': [200, 500, 1.60], 'AKT-6': [400, 1000, 3.00] };
  for (const k of A.KATALOG) { const b = bek[k.boy]; assert.deepStrictEqual([k.Tmin, k.Tmax, k.P[i32]], b, k.boy); assert.strictEqual(k.P[i45], b[2], k.boy + ' 45 d/dk'); assert.strictEqual(k.P.length, A.DEVIR.length); }
});

t('hidrostatik kuvvet ve mil torku (TR48×8)', () => {
  const r = A.penstokTork({ B: 1000, H: 1000, hw: 2000, G: 0, mil: 48 }); // 9,81 × 1 × 1 × 1,5 = 14,715 kN
  assert.ok(Math.abs(r.Fw - 14.715) < 1e-3); assert.ok(Math.abs(r.F - 0.3 * 14.715) < 1e-3); assert.strictEqual(r.adim, 8);
  const s = A.penstokTork({ B: 1000, H: 1000, hw: 500, G: 0, mil: 48 }); assert.ok(Math.abs(s.Fw - 9.81 * 0.125) < 1e-6, 'su kapaktan alçakta: üçgen basınç');
});

t('50 bin anaerobik kapakları: boy ve güç (Çorlu E-BP kapak motorları 0,37 kW ile aynı mertebe)', () => {
  const sec = (B, H, hw, G) => A.penstokAktuator({ B, H, hw, G, mil: 48 });
  assert.strictEqual(sec(2000, 1050, 1050, 300).P, 0.20); // giriş ağzı
  assert.strictEqual(sec(2600, 1350, 1350, 400).P, 0.40); // çıkış ağzı
  assert.strictEqual(sec(3000, 1200, 1200, 420).P, 0.40); // pencere
  assert.strictEqual(sec(1200, 1400, 5400, 600).boy, 'AKT-4'); // derin kanal kapağı (aile varsayılanı)
  assert.strictEqual(A.sec(5000), null, 'katalog yetmezse null');
});

console.log(String.fromCharCode(10) + n + ' test geçti.');

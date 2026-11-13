/* Kalınlık önerisi (app/hesap/statik-motor.js › P.kalinlikOner, P.perdeKalinlikAraligi).
   Karşılaştırma: ÇOKAL AAT statik raporu (ÇOKAL_AAT_SR_R2) — 14 su yapısının perde yüksekliği ve gerçek dış perde kalınlığı.
   1) Gerçek projedeki her dış perde kalınlığı programın kabul ettiği aralıkta kalır (aralık gerçek projeyi dışlamaz).
   2) Öneri yalnız firma basamaklarını kullanır (25 / 30 / 40 / 50 / 60 …), 35 / 45 gibi ara değer üretmez.
   3) Öneri aralığın üstüne çıkmaz; üst sınırda da yetmiyorsa kalınlığı büyütmek yerine uyarı verir (eskiden 5 cm adımla sınırsız büyüyordu).
   Çalıştır: node test/statik-kalinlik.test.js */
'use strict';
const assert = require('assert');
globalThis.STATIK = {};
require('../app/hesap/statik-plak.js'); require('../app/hesap/statik-motor.js');
const P = globalThis.STATIK;
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

/* [yapı, perde yüksekliği Hp (m), gerçek dış perde kalınlığı (cm)] — rapor 16.12 yük şemaları ve betonarme hesap sayfaları */
const COKAL = [
  ['T-101/102 ızgara + giriş terfi', 10.65, 60], ['T-103 kum ve yağ tutucu', 4.85, 40], ['T-104 giriş debimetre', 2.20, 25], ['T-105 anaerobik', 3.75, 40],
  ['T-106 havalandırma', 6.32, 40], ['T-108 çöktürme', 5.55, 40], ['T-113 geri devir', 6.00, 40], ['T-114 köpük terfi', 2.75, 25], ['T-112 yoğunlaştırma', 4.50, 30],
  ['T-109 kum filtre pompa', 4.75, 30], ['T-111 UV / çıkış debimetre', 2.60, 30], ['T-115/116 klor temas', 4.20, 40], ['T-117 manevra odası', 2.75, 30],
];
t('Çokal AAT: gerçek dış perde kalınlıkları kabul aralığının içinde', () => {
  for (const [ad, H, tcm] of COKAL) { const a = P.perdeKalinlikAraligi(H); assert.ok(tcm / 100 >= a.min - 1e-9 && tcm / 100 <= a.max + 1e-9, `${ad}: H=${H} m, gerçek ${tcm} cm, aralık ${a.min * 100}–${a.max * 100} cm`); }
});
t('aralık dar: 4 – 6 m perdede 30 – 70 cm; 80 cm üstü hiç önerilmez', () => {
  const a = P.perdeKalinlikAraligi(4.5); assert.strictEqual(a.min, 0.25); assert.strictEqual(a.max, 0.50);
  assert.strictEqual(P.perdeKalinlikAraligi(6.5).max, 0.70); assert.strictEqual(P.perdeKalinlikAraligi(6.5).min, 0.40);
  assert.strictEqual(P.perdeKalinlikAraligi(25).max, 0.80);
});

const basamakta = v => P.KALINLIK.basamak.some(b => Math.abs(b - v) < 1e-9);
t('örnek yapı (H = 3,30 m, 40 cm perde): yeterli perde kalınlaştırılmaz, radye basamakla büyür', () => {
  const S = P.ornekSaray(), o = P.kalinlikOner(S), L = P.kalinlikSinir(o.S);
  assert.strictEqual(o.S.geo.tw, 0.40, 'dış perde 40 cm kalmalı (H/9,5 sınırı): ' + o.log.join(' | '));
  assert.ok(basamakta(o.S.geo.hr) && o.S.geo.hr <= L.radyeMax + 1e-9, 'radye ' + o.S.geo.hr);
  assert.ok(!o.log.some(s => /→ (35|45|55) cm/.test(s)), 'ara değer yok');
});
t('aşırı yüklü perde: kalınlık üst sınırda durur, uyarı verilir (sınırsız büyümez)', () => {
  const S = P.ornekSaray(); S.geo.tw = 0.25; S.geo.ti = 0.25; S.geo.kUst = S.geo.kAlt + S.geo.hr + 6.0; S.geo.kSu = S.geo.kUst - 0.3; S.geo.kZemin = S.geo.kUst - 0.3; S.geo.Ly = 12; S.geo.bolY = []; S.geo.doseme = [];
  const o = P.kalinlikOner(S), a = P.perdeKalinlikAraligi(6.0);
  assert.ok(o.S.geo.tw <= a.max + 1e-9, `dış perde ${o.S.geo.tw * 100} cm > üst sınır ${a.max * 100} cm`);
  assert.ok(basamakta(o.S.geo.tw));
  if (!o.R.ok) assert.ok(o.sinir.length > 0, 'yetmiyorsa uyarı olmalı');
});
t('her turda bir eleman grubu en çok bir basamak büyür', () => {
  const S = P.ornekSaray(), o = P.kalinlikOner(S, 1);
  for (const k of ['Dış perde', 'Ara perde', 'Radye']) assert.ok(o.log.filter(s => s.startsWith(k + ' →')).length <= 1, k);
});

console.log(`\n${n} test geçti.`);

/* Çok ölçekli pafta denetimi (araclar/cizim-oku.js + cizim-karsilastir.js): model uzayındaki yazı, onu gösteren pafta penceresinin ölçeğiyle
   kâğıt mm'ye çevrilir. Mimari paftada 1/50 plan ve 1/20 detay aynı dosyada: 0,10 m yazı 1/50'de 2 mm, 0,04 m yazı 1/20'de 2 mm; 1/20'de 0,10 m = 5 mm (hata).
   Hiçbir pencerede görünmeyen yazı uyarı olarak yazılır. Çalıştır: node test/cizim-coklu-olcek.test.js */
'use strict';
const assert = require('assert');
const { oku } = require('../araclar/cizim-oku.js');
const { denetle } = require('../araclar/cizim-karsilastir.js'), KR = globalThis.C.cizimKural;
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const dxf = parca => ['0', 'SECTION', '2', 'ENTITIES', ...parca.flat(), '0', 'ENDSEC', '0', 'EOF'].join('\n');
/* pafta penceresi: kâğıtta merkez (10, 20), boy 40 × 41 mm, model merkezi (12, 22), model yüksekliği 45 */
const vp = (cx, cy, w, h, mx, my, vh) => ['0', 'VIEWPORT', '8', '0', '67', '1', '10', cx, '20', cy, '40', w, '41', h, '12', mx, '22', my, '45', vh];
const yz = (x, y, h, kat) => ['0', 'TEXT', '8', kat || 'Mim_Yazi25', '7', 'YZ', '10', x, '20', y, '40', h, '1', 'A'];

const P = oku(dxf([vp(100, 100, 200, 100, 0, 0, 5), vp(400, 100, 200, 100, 50, 0, 2), yz(0, 0, 0.1), yz(50, 0, 0.04), yz(50.5, 0, 0.1), yz(200, 200, 0.1)]));
t('pencere ölçeği: 1/50 penceredeki 0,10 m yazı 2 mm, 1/20 penceredeki 0,04 m 2 mm, 0,10 m 5 mm; pencere dışındaki yazı ayrı sayılır', () => {
  assert.strictEqual(P.pencereler.length, 2);
  assert.deepStrictEqual(P.yazilarKagit.Mim_Yazi25, { 'YZ | 2': 2, 'YZ | 5': 1 });
  assert.deepStrictEqual(P.penceresizYazi, { Mim_Yazi25: 1 });
});
t('karşılaştırma: 1/20 detaydaki 5 mm yazı HATA, pencereden taşan yazı UYARI', () => {
  const R = denetle(P, KR.MIMARI, { olcek: 50, birim: 'm' });
  assert.ok(R.bulgular.some(b => b.duzey === 'HATA' && b.konu === 'yazı yüksekliği' && /5 mm/.test(b.mesaj)), JSON.stringify(R.bulgular));
  assert.ok(R.bulgular.some(b => b.duzey === 'UYARI' && /hiçbir pafta penceresinde/.test(b.mesaj)));
  assert.ok(!R.bulgular.some(b => b.konu === 'yazı yüksekliği' && / 2 mm/.test(b.mesaj.split(',')[0])), '2 mm yazılar hata değil');
});

console.log(`\n${n} test geçti.`);

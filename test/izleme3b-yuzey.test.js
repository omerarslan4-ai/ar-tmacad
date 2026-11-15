/* 3B'de yüzeye çizim: imleç bir yüzün (perde yüzü) üstündeyken nesne / kutupsal izleme noktası yüzün dışına düşmemelidir (app/izleme3b.js → C.izleme3bYuzey).
   Kullanıcı (15.11.2026): "perde yüzeylerine tıkladığımda çizim yapamıyorum".
   Çalıştır: node test/izleme3b-yuzey.test.js */
'use strict';
const assert = require('assert');
const M = { sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, len: a => Math.hypot(a[0], a[1], a[2]), dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), p3: p => [p[0], p[1], p[2] || 0], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] };
const P3 = function () { }; P3.prototype.pointAt = () => null; P3.prototype.drawMarks = () => { };
global.window = { C: { View3D: P3, M, state: { snapKinds: {} }, cmd: { click() { } }, on() { }, addCommand() { } }, devicePixelRatio: 1 };
try { require('../app/izleme3b.js'); } catch (e) { /* arayüz kısmı Node'da çalışmayabilir; saf fonksiyon tanımlanmışsa yeter */ }
const yuzey = global.window.C.izleme3bYuzey; assert.strictEqual(typeof yuzey, 'function');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
/* perde yüzü: y = 2 düzlemi, normal -y; ekran izdüşümü: x → ekran x (100 px/m), z → ekran y */
const f = { p: [3, 2, 1], n: [0, -1, 0] }, proj = q => [q[0] * 100, q[2] * 100];

t('izleme noktası yüzün düzlemindeyse olduğu gibi kullanılır', () => {
  const tr = { p: [4, 2, 1.5], lines: [{ o: [4, 2, 0], u: [0, 0, 1], lbl: 'Z+' }], label: 'Nesne izleme Z' };
  assert.strictEqual(yuzey(tr, f, proj, [400, 150]), tr);
});
t('izleme noktası yüzün dışındaysa ve izleme çizgisi yüzü imlecin yakınında deliyorsa o nokta alınır', () => {
  const tr = { p: [4, 0.5, 1], lines: [{ o: [4, 0, 1], u: [0, 1, 0], lbl: '90°' }], label: 'Nesne izleme: 0.500 < 90°' };
  const r = yuzey(tr, f, proj, [402, 101]); assert.ok(r && r !== tr); assert.deepStrictEqual(r.p.map(x => +x.toFixed(6)), [4, 2, 1]); assert.ok(/Yüzeyde/.test(r.label));
});
t('izleme noktası yüzün dışındaysa ve çizgi yüzü imleçten uzakta deliyorsa ya da yüze paralelse: yüzey noktası kalır', () => {
  assert.strictEqual(yuzey({ p: [4, 0.5, 1], lines: [{ o: [4, 0, 1], u: [0, 1, 0], lbl: '90°' }] }, f, proj, [700, 300]), null);
  assert.strictEqual(yuzey({ p: [5, 1, 0], lines: [{ o: [0, 1, 0], u: [1, 0, 0], lbl: '0°' }, { o: [5, 1, -3], u: [0, 0, 1], lbl: 'Z+' }] }, f, proj, [500, 0]), null);
  assert.strictEqual(yuzey({ p: [4, 3, 1], lines: [{ o: [4, 3, 1], u: [0, 1, 0], lbl: '90°' }] }, f, proj, [400, 100]), null); // çizgi yüzden uzaklaşıyor
});
console.log(`\n${n} test geçti.`);

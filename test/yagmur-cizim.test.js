/* Yağmur oluğu ve iniş borusu (app/yagmur.js) — borunun yolu ve oluk kesiti.
   Dirsekler Çokal 10-İdari Bina_R2 SAĞ YAN GÖRÜNÜŞ'ünden ölçüldü (cm, 1/50; çizimde boru Ø15, oluk altı +3,45, zemin ±0,00):
   oluk altından 30,2 cm düşey (iki manşon) · 60° dirsek (eksen yarıçapı 22,5 = 1,5·D) · yatayla 30° düz parça · 60° dirsek · duvar boyunca düşey
   (manşonlar 94 / 107 cm arayla) · altta 90° dirsek (yarıçap 22,5) dışa · 14,5 cm düz çıkış; kaz boynu yatay ötelemesi 48,1 cm, düşüşü 54,7 cm.
   Malzeme PVC (firma kuralı 15.11.2026). Çalıştır: node test/yagmur-cizim.test.js */
'use strict';
const assert = require('assert');
const Y = require('../app/yagmur.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yakin = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const dusey = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-6;

t('iniş borusu yolu Çokal görünüşündeki gibi: 30 cm düşey, iki 60° dirsekli kaz boynu, duvar boyunca düşey, altta 90° dirsekle dışa 15 cm', () => {
  // Çokal: boru Ø15 (R = 22,5 cm), öteleme 48,1 cm, oluk altı +3,45, zemin ±0,00
  const g = [0, 0], w = [0.481, 0], P = Y.inisYolu(g, w, 3.45, 0, { D: 0.15 });
  assert.deepStrictEqual(P[0], [0, 0, 3.45]); assert.deepStrictEqual(P[1], [0, 0, 3.15], 'oluk altından 30 cm düşey');
  assert.deepStrictEqual(P.dirsek.map(Math.round), [60, 60, 90], 'iki 60° ve bir 90° dirsek');
  const iw = P.findIndex(p => yakin(p[0], 0.481, 1e-4)); assert.ok(iw > 2, 'kaz boynu duvara ulaşır');
  assert.ok(yakin(3.15 - P[iw][2], 0.547, 0.015), 'kaz boynu düşüşü ≈ 54,7 cm: ' + (3.15 - P[iw][2]).toFixed(3));
  // kaz boynu ortasındaki düz parça yatayla 30°
  let duz = null; for (let i = 2; i < iw; i++) { const a = P[i - 1], b = P[i], L = Math.hypot(b[0] - a[0], b[2] - a[2]); if (L > 0.1) duz = Math.atan2(a[2] - b[2], b[0] - a[0]) * 180 / Math.PI; }
  assert.ok(duz != null && yakin(duz, 30, 0.5), 'düz parça yatayla 30°: ' + duz);
  assert.ok(dusey(P[iw], P[iw + 1]) && P[iw + 1][2] > 0.2, 'duvar boyunca düşey');
  const son = P[P.length - 1]; assert.ok(yakin(son[2], 0.075, 1e-4), 'çıkış ekseni zemin + D/2 (alt yüzü zeminde)');
  assert.ok(yakin(0.481 - son[0], 0.225 + 0.15, 1e-4), 'alt dirsek (R 22,5) + 15 cm çıkış, duvardan dışa (oluk tarafına)');
  // manşonlar: oluk altında ve dirsek başında birer, düz parçanın iki ucunda, duvar boyunca ~1 m arayla, alt dirsek başında
  const MZ = P.manson.filter(m => m.t[2] === -1 && yakin(m.p[0], 0.481, 1e-4)).map(m => m.p[2]).sort((a, b) => b - a);
  assert.ok(P.manson.length >= 7, 'manşon sayısı ' + P.manson.length);
  for (let i = 1; i < MZ.length; i++) assert.ok(MZ[i - 1] - MZ[i] <= 1.05, 'duvar boyunca manşon aralığı ≤ 1 m');
});
t('kısa saçak: öteleme 2·R(1 − cos 60°)\'den küçükse dirsek açısı küçülür, düz parça yok', () => {
  const P = Y.inisYolu([0, 0], [0.10, 0], 3, 0, { D: 0.11 }); // R = 16,5 cm
  assert.ok(P.dirsek[0] < 60 && P.dirsek[0] > 30, 'dirsek ' + P.dirsek[0]);
  const iw = P.findIndex(p => yakin(p[0], 0.10, 1e-4)); assert.ok(iw > 0 && yakin(P[iw][1], 0));
});
t('saçaksız (oluk duvarın dibinde): kaz boynu yok; duvar normali verilince altta dışa 90° dirsek', () => {
  const P = Y.inisYolu([0, 0], [0.01, 0], 3, 0, { D: 0.11, n: [0, -1] });
  assert.ok(P.slice(0, -10).every(p => p[0] === 0 && p[1] === 0)); assert.deepStrictEqual(P.dirsek, [90]);
  const son = P[P.length - 1]; assert.ok(son[1] < -0.3 && yakin(son[2], 0.055, 1e-4), 'çıkış duvardan dışa (normal yönünde)');
  const Q = Y.inisYolu([0, 0], [0.01, 0], 3, 0); assert.ok(Q.every(p => p[0] === 0 && p[1] === 0), 'normal yoksa düz iner');
});
t('oluk kesiti: Ø150 yarım daire (r 7,5 cm), ağız oluk kotunda, taban 7,5 cm aşağıda', () => {
  const K = Y.olukKesit(150); assert.ok(yakin(K[0][0], -0.075) && yakin(K[0][1], 0)); assert.ok(yakin(K[K.length - 1][0], 0.075, 1e-9));
  assert.ok(yakin(Math.min(...K.map(q => q[1])), -0.075, 1e-9));
});
t('çatı önbellek imzası: yağmur ayarı, kolon yeri, düşey eleman zarfı ya da tretuvar kotu değişince değişir (oluk / boru / metraj yenilenir)', () => {
  // Konya terfi: yağış 300 l/s·ha, C 1, oluk Ø150, iniş Ø110, eğim %0,3, aralık sınırsız; zarf 0..8,4 × 0..6,9; tretuvar üstü −0,10
  const a = { yagis: 300, C: 1, olukDN: 150, borDN: 110, egim: 0.3, maksAralik: 0, kolonlar: [[0, 0], [8.4, 6.9]] }, z = [0, 0, 8.4, 6.9], i0 = Y.imza(a, z, -0.1);
  assert.strictEqual(Y.imza(Object.assign({}, a), z.slice(), -0.1), i0, 'aynı girdi → aynı imza');
  for (const [k, v] of [['yagis', 400], ['C', 0.9], ['olukDN', 200], ['borDN', 90], ['egim', 0.5], ['maksAralik', 12]]) assert.notStrictEqual(Y.imza(Object.assign({}, a, { [k]: v }), z, -0.1), i0, k);
  assert.notStrictEqual(Y.imza(Object.assign({}, a, { kolonlar: [[0, 0], [8.4, 7.2]] }), z, -0.1), i0, 'kolon taşındı');
  assert.notStrictEqual(Y.imza(a, [0, 0, 8.4, 7.2], -0.1), i0, 'perde zarfı'); assert.notStrictEqual(Y.imza(a, z, 0.05), i0, 'tretuvar');
  assert.strictEqual(Y.imza(a, [0, 0, 8.4, 6.9000001], -0.1), i0, 'mm altı fark imzayı değiştirmez');
});
console.log(`\n${n} test geçti.`);

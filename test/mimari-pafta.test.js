/* Mimari pafta düzeni (app/mimari-pafta.js) — Çokal AAT R2 mimari paftalarından ölçülen sayılarla.
   Kaynak: 6-Çokal_AAT_Blower Binası_R2.dwg, "MİMARİ" düzeni (ODA → DXF; kağıt mm). Görünüm pencerelerinin boyları
   örnekteki pencerelerdir; programın bloğu pencereden her yanda 5 mm (pay) küçük verilir.
   Çalıştır: node test/mimari-pafta.test.js */
'use strict';
const assert = require('assert');
const { PAFTA_R2, paftaPlanla, katKotlari, kesitHatlari, kotYaz } = require('../app/mimari-pafta.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const pay = PAFTA_R2.pay, blk = (id, w, h) => ({ id, w: w - 2 * pay, h: h - 2 * pay }); // örnekteki pencere boyu → blok
const yakin = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} ≠ ${b} (±${tol})`);

t('R2 kağıt: yükseklik 594, en az 841, iç çerçeve solda 30 / öbür kenarlarda 10, antet sütunu 200', () => {
  assert.strictEqual(PAFTA_R2.ph, 594); assert.strictEqual(PAFTA_R2.wMin, 841);
  assert.deepStrictEqual(PAFTA_R2.kenar, { l: 30, r: 10, t: 10, b: 10 }); assert.strictEqual(PAFTA_R2.antetSutun, 200); assert.strictEqual(PAFTA_R2.olcek, 50);
});

t('BB-01 kat planı (pencere 511 × 555): tek A1 genişliği 841; plan ortada (örnekte x 65, y 25)', () => {
  const P = paftaPlanla([blk('plan', 511, 555)]);
  assert.strictEqual(P.pw, 841); assert.strictEqual(P.ph, 594); assert.deepStrictEqual(P.tasan, []);
  yakin(P.yer.plan[0] - pay, 65, 12, 'plan x'); yakin(P.yer.plan[1] - pay, 25, 8, 'plan y');
});

t('BB-02 çatı + A-A + B-B + açılım: genişlik 1261 (örnekle aynı); A-A çatının hemen sağında (x 628), açılım B-B yanında', () => {
  const P = paftaPlanla([blk('cati', 598, 574), blk('AA', 423, 271), blk('BB', 315, 258), blk('acilim', 63, 266)]);
  assert.strictEqual(P.pw, 1261);
  yakin(P.yer.cati[0] - pay, 30, 0.01, 'çatı x'); yakin(P.yer.AA[0] - pay, 628, 0.01, 'A-A x'); yakin(P.yer.BB[0] - pay, 628, 20, 'B-B x (örnekte 644)');
  assert.ok(P.yer.AA[1] > P.yer.BB[1], 'A-A üstte, B-B altta');
  yakin(P.yer.acilim[0] - pay, 943, 30, 'açılım x (örnekte 972)'); assert.ok(P.yer.acilim[0] + 63 <= 1261 - 10 - 200 + 1e-6, 'açılım antet sütununa girmez');
});

t('BB-03 görünüşler: ön + arka üst sırada (811), sağ + sol yan altta (640) → genişlik 1051 (örnekle aynı), alt sıra ortalı (örnekte x 113)', () => {
  const P = paftaPlanla([blk('ON', 406, 230), blk('ARKA', 405, 230), blk('SAG', 320, 213), blk('SOL', 320, 213)], { duzen: 'satir', satirlar: [['ON', 'ARKA'], ['SAG', 'SOL']] });
  assert.strictEqual(P.pw, 1051);
  yakin(P.yer.ON[0] - pay, 30, 0.01, 'ön x'); yakin(P.yer.SAG[0] - pay, 113, 4, 'sağ x'); assert.ok(P.yer.ON[1] > P.yer.SAG[1], 'ön / arka üst sırada');
  assert.strictEqual(P.yer.ON[1], P.yer.ARKA[1]);
  // derin yapı (görünüş 300 mm boyunda): iki sıra 594'e sığmaz → sütun düzeni, kağıttan taşmaz
  const D = paftaPlanla([blk('ON', 460, 300), blk('ARKA', 460, 300), blk('SAG', 200, 300), blk('SOL', 200, 300)], { duzen: 'satir', satirlar: [['ON', 'ARKA'], ['SAG', 'SOL']] });
  for (const k of ['ON', 'ARKA', 'SAG', 'SOL']) assert.ok(D.yer[k][1] - pay >= 10 - 1e-6, k + ' alttan taşmaz');
});

t('çok kesit: sütunlar sağa uzar; iç yüksekliği (574) aşan blok bildirilir; yüklenen antet 200 mm\'den genişse sütun genişler', () => {
  const P = paftaPlanla([blk('a', 600, 280), blk('b', 600, 280), blk('c', 600, 280)]);
  assert.strictEqual(P.pw, 30 + 1200 + 200 + 10);
  const Q = paftaPlanla([blk('uzun', 400, 700)]); assert.deepStrictEqual(Q.tasan, ['uzun']);
  const W = paftaPlanla([blk('p', 700, 500)], { antetW: 250 }); assert.strictEqual(W.pw, 30 + 700 + 250 + 10); assert.strictEqual(W.antet, 250);
});

t('kat kotları: seviyelerden (temel altı hariç, çatı seviyesi çatı planına kalır); kesit kot + 1,20, üst katın altında', () => {
  const sv = [{ ad: 'Temel altı', z: -1.2 }, { ad: 'Zemin kat', z: 0 }, { ad: '1. kat', z: 3.2 }, { ad: 'Çatı', z: 6.4 }];
  const K = katKotlari({ seviyeler: sv, zmin: -0.6, zmax: 6.6 });
  assert.deepStrictEqual(K.map(k => k.z), [0, 3.2]); assert.deepStrictEqual(K.map(k => k.h), [1.2, 4.4]);
  assert.deepStrictEqual(K.map(k => k.baslik), ['±0.00 KOTU PLANI', '+3.20 KOTU PLANI']);
});

t('kat kotları: seviye yoksa döşeme üst kotlarından; Blower "+0.25 KOTU PLANI"; mutlak kot parantezde (İdari "±0.00 (95.50)")', () => {
  const K = katKotlari({ dosemeUst: [0.25, 4.6], zmin: -0.5, zmax: 4.6 });
  assert.deepStrictEqual(K.map(k => k.z), [-0.5, 0.25]); assert.strictEqual(K[1].baslik, '+0.25 KOTU PLANI'); assert.ok(K[0].h < 0.25, 'alt kesit üst kattan aşağıda');
  assert.strictEqual(katKotlari({ dosemeUst: [], zmin: 0, zmax: 4, abs0: 95.5 })[0].baslik, '±0.00 (95.50) KOTU PLANI');
  assert.strictEqual(kotYaz(-1.2), '-1.20');
  // çatı döşemesi (üstünde duvar yok, yalnız çatı makası) kat planı olmaz: Konya terfi
  assert.deepStrictEqual(katKotlari({ dosemeUst: [0, 4.2], zmin: -1, zmax: 6.5, dikeyUst: 4.4 }).map(k => k.z), [-1, 0]);
});

t('kesit hatları: A-A uzun yönde, B-B enine; ikisi de ortadan, yapıdan 1,5 m taşar', () => {
  const [A, B] = kesitHatlari([0, 0, 20, 8]);
  assert.strictEqual(A.nm, 'A'); assert.deepStrictEqual(A.a, [-1.5, 4]); assert.deepStrictEqual(A.b, [21.5, 4]); assert.strictEqual(A.depth, 4.5);
  assert.deepStrictEqual(B.a, [10, -1.5]); assert.deepStrictEqual(B.b, [10, 9.5]);
  const [A2] = kesitHatlari([0, 0, 6, 15]); assert.deepStrictEqual(A2.a, [3, -1.5]);
});

console.log(`\n${n} test geçti.`);

/* Altyapı elektrik: kablo tavası metrajı, ek parçalar, kablo döşeme açılımı, detaylar (app/el-tava.js). Çalıştır: node test/el-tava.test.js */
'use strict';
const assert = require('assert');
const T = require('../app/el-tava.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const bul = (R, ad) => R.parcalar.filter(x => x.ad === ad).reduce((s, x) => s + x.miktar, 0);

t('27 m tek tava: 9 parça, 8 ek, 19 konsol, 2 uç kapağı, 64 M6, 38 M10', () => {
  const R = T.tavaMetraj([{ yol: 1, sinif: 'ag', w: 200, h: 60, n: 1, L: 27, dolu: 0.3, nKablo: 12 }]);
  assert.strictEqual(R.satir[0].parca, 9); assert.strictEqual(R.toplamM, 27);
  assert.strictEqual(bul(R, 'Delikli galvaniz kablo tavası'), 9); assert.strictEqual(bul(R, 'Tava düz ek takımı'), 8); assert.strictEqual(bul(R, 'Duvar konsolu'), 19);
  assert.strictEqual(bul(R, 'Tava uç kapağı'), 2); assert.strictEqual(bul(R, 'Topraklama köprüsü'), 8); assert.strictEqual(bul(R, 'Civata, somun, pul'), 64); assert.strictEqual(bul(R, 'Ankraj'), 38);
});
t('Aynı ölçü birleşir, farklı ölçü ayrı satır; 3 m\'den kısa tavada ek yok', () => {
  const R = T.tavaMetraj([{ yol: 1, sinif: 'ag', w: 100, h: 60, L: 6 }, { yol: 2, sinif: 'ag', w: 100, h: 60, L: 3 }, { yol: 2, sinif: 'zayif', w: 200, h: 60, L: 2 }]);
  assert.strictEqual(R.parcalar.find(x => /100x60 mm, L/.test(x.oz)).miktar, 3); assert.strictEqual(R.parcalar.find(x => /200x60 mm, L/.test(x.oz)).miktar, 1); assert.strictEqual(bul(R, 'Tava düz ek takımı'), 1);
});
t('Branş boruları çapa göre toplanır; adaptör ve kelepçe sayılır', () => {
  const B = T.boruMetraj([{ boru: '1"', L: 2 }, { boru: '1"', L: 1 }, { boru: '3/4"', L: 3 }]);
  assert.deepStrictEqual(B.boru, [{ boru: '1"', L: 3 }, { boru: '3/4"', L: 3 }]); assert.strictEqual(B.adaptor, 3); assert.strictEqual(B.kelepce, 3 + 2 + 3);
  assert.strictEqual(T.boruMetraj([{ boru: '1"', L: 2 }, { boru: '1"', L: 2, tava: false }]).adaptor, 1, 'LCU → motor borusu tavadan çıkmaz');
});
t('Kablo döşeme: kalından inceye, tava içinde, üst üste binmez; sığmayan üst sıraya geçer', () => {
  const K = Array.from({ length: 12 }, (_, i) => ({ kod: 'K' + i, cins: '4x2.5', d: i % 2 ? 14 : 16 })), D = T.dosemeDizilim(K, 100, 60);
  assert.ok(D.sigdi); assert.ok(D.yer[0].r === 8); assert.ok(D.yer.every(q => q.x + q.r <= 100 + 1e-9 && q.x - q.r >= 0)); assert.ok(new Set(D.yer.map(q => q.y)).size > 1);
  for (let i = 0; i < D.yer.length; i++) for (let j = i + 1; j < D.yer.length; j++) assert.ok(Math.hypot(D.yer[i].x - D.yer[j].x, D.yer[i].y - D.yer[j].y) >= D.yer[i].r + D.yer[j].r - 1e-9);
});
t('Paralel tavada kablolar iki tavaya bölünür, numaralar tam', () => {
  const K = Array.from({ length: 20 }, (_, i) => ({ kod: 'K' + i, cins: '4x2.5', d: 14 })), g = T.detayDoseme({ yol: 1, ag: { w: 100, h: 60, n: 2, kablolar: K }, zayif: null });
  assert.ok(g.T.some(x => x[3] === '2x100x60' || /AG KABLO TAVASI 2x100x60 mm/.test(x[3]))); assert.strictEqual(g.T.filter(x => /^\d+  K\d+/.test(x[3])).length, 20);
});
t('Kablo girişi: varsayılan baca, seçilince galeri; yer tava ucu hizasında yapı kenarının dışında', () => {
  assert.strictEqual(T.kabloGiris({}), 'baca'); assert.strictEqual(T.kabloGiris({ elKabloGiris: 'galeri' }), 'galeri');
  const G = T.girisYeri([5, 8], [0, 1], [[0, 0], [10, 0], [10, 10], [0, 10]], 0.7); assert.deepStrictEqual(G.kenar, [5, 10]); assert.deepStrictEqual(G.merkez, [5, 10.7]);
  for (const x of ['baca', 'galeri']) { const g = T.detayGiris(x); assert.ok(g.L.length > 8 && g.L.every(l => l.slice(0, 4).every(Number.isFinite))); assert.ok(g.T.some(q => new RegExp(x === 'baca' ? 'KABLO BACASI' : 'KABLO GALERİSİ').test(q[3]))); }
  assert.ok(T.detayGiris('baca', { dis: 1, ic: 0.8 }).T.some(q => /100x100 cm \(İÇ 80x80\)/.test(q[3])), 'Çorlu baca ölçüsü');
});
t('Giriş genel yerleşimden gelen tarafta: en yakın kenar, yön hedefe; tavalar çevreden kısa yoldan bağlanır', () => {
  const D = [[0, 0], [10, 0], [10, 6], [0, 6]], H = T.hedefGiris([15, 2], D, 0.7);
  assert.deepStrictEqual(H.kenar, [10, 2]); assert.deepStrictEqual(H.yon, [1, 0]); assert.deepStrictEqual(H.merkez, [10.7, 2]);
  assert.deepStrictEqual(T.hedefGiris([10, 2], D, 0.5).yon.map(v => Math.round(v) + 0), [1, 0], 'nokta kenardaysa dışa');
  for (const h of [[9.5, 2], [5, 3], [1, 5]]) { const G = T.hedefGiris(h, D, 0.7), q = G.merkez; assert.ok(q[0] < 0 || q[0] > 10 || q[1] < 0 || q[1] > 6, 'yapı içinden seçilse de baca dışarıda: ' + h); }
  assert.deepStrictEqual(T.cevreYol(D, [2, 6], [10, 2]), [[2, 6], [10, 6], [10, 2]], 'üst kenardan sağ kenara kısa yol');
  assert.deepStrictEqual(T.cevreYol(D, [2, 0], [8, 0]), [[2, 0], [8, 0]], 'aynı kenarda düz');
  assert.deepStrictEqual(T.cevreYol(D, [1, 0], [0, 3]), [[1, 0], [0, 0], [0, 3]], 'geri yön kısa ise geriden');
});
t('Lokal pano: Otomatik-0-Manuel, Start, Stop, lambalar, prensip şeması, 10 damar', () => {
  const g = T.detayLCU(), y = g.T.map(x => String(x[3])); for (const a of ['OTOMATİK', 'MANUEL', '0', 'START', 'STOP', 'ÇALIŞIYOR', 'ARIZA', 'K1']) assert.ok(y.includes(a), a);
  assert.strictEqual(T.LCU_DAMAR.length, 10); assert.ok(g.L.every(l => l.slice(0, 4).every(Number.isFinite)));
});
t('Tava yürüyüş yolunun kenarında: sahanlık çıkıntısı kenar sayılmaz, ekipmanı az olan kenar seçilir', () => {
  const a = { u: [0, 1], n: [1, 0], c: [0, 10] }, P = [[-1, 0], [1, 0], [1, 20], [-1, 20], [-1, 12], [-3, 12], [-3, 10], [-1, 10], [-1, 0]], K0 = T.yolKenar(P, a);
  assert.deepStrictEqual(K0, { oA: -1, oB: 1 }); assert.deepStrictEqual(T.yolKenar(P, { u: [0, 1], n: [1, 0], c: [-2, 10] }), { oA: 1, oB: 3 }, 'merkez sahanlığa kaysa da iki uzun kenar'); assert.deepStrictEqual(T.tavaYani(K0, [-1.5, -1.6, 1.4]), { o: 1, sg: 1, oDiger: -1 }); assert.deepStrictEqual(T.tavaYani(K0, [1.5, 1.6, -1.4]), { o: -1, sg: -1, oDiger: 1 });
});
t('Detaylar çiziliyor, sayılar geçerli', () => {
  const o = { yol: 1, ag: { w: 100, h: 60, kablolar: [{ kod: 'GK-1/Z', cins: '4x2.5 mm² NYY', d: 14 }] }, zayif: { w: 200, h: 60, kablolar: [{ kod: 'KK-1/Z', cins: '10x1.5 mm² NYY', d: 15.5 }] } };
  for (const g of [T.detayDoseme(o), T.detayEk(), T.detayKonsol({ wAg: 100, wZ: 200 }), T.detayCikis()]) { assert.ok(g.L.length > 5 && g.T.length > 1); assert.ok(g.L.every(l => l.slice(0, 4).every(Number.isFinite))); assert.ok(g.T.every(x => Number.isFinite(x[0]) && Number.isFinite(x[1]))); }
  assert.ok(T.detayDoseme(o).T.some(x => /GK-1\/Z/.test(x[3])));
});
console.log(`\n${n} test geçti.`);

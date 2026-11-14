/* Mimari pafta ölçeği, en az kâğıt yerleşimi ve Tasarım alanında disiplin bölgeleri (app/mimari-pafta.js).
   Konya terfi merkezi sayıları: yapı 21,3 × 9,6 m (tretuvar dahil), yükseklik ≈ 14 m (temel altı → mahya); MIMARIPAFTA'nın ürettiği blokların
   kâğıt boyları (1/50; 14.11.2026 tarayıcıda ölçüldü): planlar 514 × 311 ve 563 × 325, mahal listesi 218 × 99, kesitler 626 × 346 / 365 × 346 / 365 × 346,
   açılım 420 × 90, görünüşler (toprak altı kırpılmış) 458 × 180 ×2, 194 × 180 ×2, doğrama detayları (1/20) 6 adet, korkuluk 323 × 136, kapak 98 × 112, kenar 172 × 80.
   Çalıştır: node test/mimari-yerlesim.test.js */
'use strict';
const assert = require('assert');
const A = require('../app/mimari-pafta.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

t('ölçek: Konya 1/50 A1 (en büyük çizim A1 kullanılabilir alanının %86\'sı); eşik %40', () => {
  const r = A.olcekSec([{ id: 'plan', w: 21.3, h: 9.6, kenarMm: 41, altMm: 15 }, { id: 'kesit', w: 21.3, h: 14, kenarMm: 30, altMm: 15 }]);
  assert.strictEqual(r.olcek, 50); assert.strictEqual(r.kagit, 'A1'); assert.ok(r.oranA1 > 0.8 && r.oranA1 < 0.9, String(r.oranA1)); assert.strictEqual(r.esik, 0.4);
  assert.deepStrictEqual(A.icOlcu('A1', A.PAFTA_R2), { W: 601, H: 574 }); assert.deepStrictEqual(A.icOlcu('A0', A.PAFTA_R2), { W: 949, H: 821 });
});
t('ölçek: küçük yapı (5 × 3 m vana odası) 1/25; büyük yapı (60 × 30 m) A0\'a sığmaz → 1/100; orta (30 × 14 m) 1/50 A0 yüksekliği', () => {
  assert.strictEqual(A.olcekSec([{ w: 5, h: 3, kenarMm: 41, altMm: 15 }, { w: 5, h: 4, kenarMm: 30, altMm: 15 }]).olcek, 25);
  assert.strictEqual(A.olcekSec([{ w: 60, h: 30, kenarMm: 41, altMm: 15 }]).olcek, 100);
  const o = A.olcekSec([{ w: 30, h: 26, kenarMm: 41, altMm: 15 }]); assert.strictEqual(o.olcek, 50); assert.strictEqual(o.kagit, 'A0');
});

const pay = A.PAFTA_R2.pay, B = (id, w, h, grup) => ({ id, w: w - 2 * pay, h: h - 2 * pay, grup });
const KONYA = [B('p1', 514, 311, 'KAT PLANLARI'), B('p2', 563, 325, 'KAT PLANLARI'), B('mah', 218, 99, 'KAT PLANLARI'), B('AA', 626, 346, 'KESİTLER'), B('BB', 365, 346, 'KESİTLER'), B('CC', 365, 346, 'KESİTLER'), B('ac', 420, 90, 'KESİTLER'),
  B('on', 458, 180, 'GÖRÜNÜŞLER'), B('ar', 458, 180, 'GÖRÜNÜŞLER'), B('sa', 194, 180, 'GÖRÜNÜŞLER'), B('so', 194, 180, 'GÖRÜNÜŞLER'),
  B('d1', 177, 183, 'KAPI VE PENCERE'), B('d2', 247, 187, 'KAPI VE PENCERE'), B('d3', 292, 142, 'KAPI VE PENCERE'), B('d4', 115, 289, 'KAPI VE PENCERE'), B('d5', 123, 274, 'KAPI VE PENCERE'), B('d6', 265, 357, 'KAPI VE PENCERE'),
  B('k', 323, 136, 'KORKULUK'), B('sk', 98, 112, 'KAPAK'), B('kn', 172, 80, 'KAPAK')];
const cakisma = P => { const r = P.ids.map(id => { const b = KONYA.find(q => q.id === id), q = P.yer[id]; return [q[0], q[1], q[0] + b.w, q[1] + b.h]; }); for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], c = r[j]; if (Math.min(a[2], c[2]) - Math.max(a[0], c[0]) > 1e-6 && Math.min(a[3], c[3]) - Math.max(a[1], c[1]) > 1e-6) return true; } return false; };

t('en az kâğıt: Konya bütün mimari görünümleri 2 pafta; bütün kesitler (A-A, B-B, C-C + açılım) aynı paftada; çakışma yok, kâğıttan taşmaz', () => {
  const r = A.enAzKagit(KONYA);
  assert.strictEqual(r.adet, 2, JSON.stringify(r.paftalar.map(P => [P.kagit, P.pw, P.gruplar])));
  const kes = r.paftalar.filter(P => P.ids.some(id => ['AA', 'BB', 'CC', 'ac'].includes(id))); assert.strictEqual(kes.length, 1); assert.ok(['AA', 'BB', 'CC', 'ac'].every(id => kes[0].ids.includes(id)));
  const gor = r.paftalar.filter(P => P.ids.some(id => ['on', 'ar', 'sa', 'so'].includes(id))); assert.strictEqual(gor.length, 1, 'görünüşler tek paftada');
  for (const P of r.paftalar) { assert.ok(!cakisma(P), P.ids.join(',')); assert.deepStrictEqual(P.tasan, []); assert.ok(P.pw <= Math.round(A.KAGIT[P.kagit].w * A.UZAMA)); assert.strictEqual(P.ph, A.KAGIT[P.kagit].h);
    for (const id of P.ids) { const b = KONYA.find(q => q.id === id), q = P.yer[id]; assert.ok(q[0] >= A.PAFTA_R2.kenar.l - 1e-6 && q[1] >= A.PAFTA_R2.kenar.b - 1e-6 && q[0] + b.w <= P.pw - A.PAFTA_R2.kenar.r - P.antet + 1e-6 && q[1] + b.h <= P.ph - A.PAFTA_R2.kenar.t + 1e-6, id + ' kâğıtta'); } }
  // eski düzen (tür başına bir pafta, A1, R2 sütun düzeni): 8 pafta, 5,26 m² (14.11.2026 Konya tarayıcı çıktısı); yeni en çok 2,4 m²
  assert.ok(r.alan <= 2.4, String(r.alan));
});
t('en az kâğıt: tek tür, A1\'e sığıyorsa A1 (BB-01: plan 511 × 555 → 841 × 594)', () => {
  const r = A.enAzKagit([B('plan', 511, 555, 'KAT PLANLARI')]); assert.strictEqual(r.adet, 1); assert.strictEqual(r.paftalar[0].kagit, 'A1'); assert.strictEqual(r.paftalar[0].pw, 841);
});

t('Tasarım alanı ızgarası: her tür bir sıra, soldan sağa; sıralar arası 6 m, görünümler arası 4 m', () => {
  const Z = A.izgaraDiz([[{ id: 'p1', w: 25, h: 15 }, { id: 'p2', w: 25, h: 16 }], [{ id: 'k1', w: 30, h: 17 }]]);
  assert.deepStrictEqual(Z.yer, { p1: [0, 0], p2: [29, 0], k1: [0, -22] }); assert.strictEqual(Z.w, 54); assert.strictEqual(Z.h, 39);
});
t('disiplin bölgeleri: modelin sağında 20 m arayla; ikinci disiplin birincinin sağında; var olan bölge çakışmıyorsa yerinde kalır', () => {
  const model = [0, 0, 20, 8];
  const m = A.bolgeYeri(model, {}, 'Mimari', 100, 100); assert.deepStrictEqual(m, { x0: 40, yUst: 8 });
  const B2 = { Mimari: { x0: 40, yUst: 8, w: 100, h: 100 } }; assert.deepStrictEqual(A.bolgeYeri(model, B2, 'Mekanik', 50, 50), { x0: 160, yUst: 8 });
  assert.deepStrictEqual(A.bolgeYeri(model, B2, 'Mimari', 110, 100), { x0: 40, yUst: 8 });
  const B3 = { Mimari: { x0: 40, yUst: 8, w: 100, h: 100 }, Mekanik: { x0: 160, yUst: 8, w: 50, h: 50 } };
  assert.deepStrictEqual(A.bolgeYeri(model, B3, 'Mimari', 130, 100), { x0: 230, yUst: 8 }, 'büyüyen bölge komşusuna binmez, en sağa taşınır');
});

t('ölçü sıraları arası modelde 25 cm, her ölçekte aynı (firma kuralı): kâğıtta 1/50 5 mm, 1/25 10 mm, 1/100 2,5 mm, 1/20 12,5 mm; 1/25 eşiği %40', () => {
  globalThis.C = globalThis.C || {}; require('../app/cizim-kural.js'); const Y = globalThis.C.cizimKural.MIMARI.olcuYeri;
  assert.strictEqual(Y.genel.siraModel, 0.25); assert.strictEqual(Y.detay.siraModel, 0.25);
  assert.deepStrictEqual([50, 25, 100, 20].map(s => Y.genel.siraModel * 1000 / s), [5, 10, 2.5, 12.5]);
  assert.strictEqual(A.OLCEK_ESIK, 0.4);
});

t('merdivenli katta plan kesme kotu: Konya −5.90 katı, merdiven sahanlıkları −4.11 / −2.32 → kesme −2.91 (ilk sahanlık + 1,20; ikinci sahanlığın altında); ±0.00 katında merdiven başlamıyor → değişmez', () => {
  const M = [{ z0: -5.9, sahanliklar: [-4.112, -2.324] }];
  assert.deepStrictEqual(A.planKesmeKotu({ z: -5.9, h: -4.7 }, M, { ust: 0 }), { h: -2.91, sahanlik: -4.11 });
  assert.deepStrictEqual(A.planKesmeKotu({ z: 0, h: 1.2 }, M), { h: 1.2, sahanlik: null });
  assert.strictEqual(A.planKesmeKotu({ z: 0, h: 1.2 }, [{ z0: 0, sahanliklar: [0.9, 1.6] }]).h, 1.55, 'ikinci sahanlığın 5 cm altı');
});

t('başlık boyları kural tablosunda: görünüş 4 mm, kesit 5 mm, ölçek satırı 3 mm (10-İdari, 6-Blower); seviye ve kot yazılarında özel eksi (U+2212) yok', () => {
  globalThis.C = globalThis.C || {}; require('../app/cizim-kural.js');
  assert.deepStrictEqual(globalThis.C.cizimKural.MIMARI.baslik, { gorunusMm: 4, kesitMm: 5, olcekMm: 3 });
  const fs = require('fs'), path = require('path'), sv = fs.readFileSync(path.join(__dirname, '..', 'app', 'seviye.js'), 'utf8');
  assert.ok(/const fz = v => .*'-'\)/.test(sv) && !/const fz = v => .*'−'/.test(sv), 'seviye yazısı normal tire');
  // Çokal aks ölçü zinciri yalnız Mimari kesitlerde: disiplin kesiti Mimari ise KESITAL'e MIMARI=E gider, kesit.js zinciri bu anahtarla çizer
  const gr = fs.readFileSync(path.join(__dirname, '..', 'app', 'gorunumler.js'), 'utf8'), ks = fs.readFileSync(path.join(__dirname, '..', 'app', 'kesit.js'), 'utf8');
  assert.ok(/'MIMARI=E'/.test(gr) && /kv\.MIMARI === 'E'/.test(ks));
});

console.log(`\n${n} test geçti.`);

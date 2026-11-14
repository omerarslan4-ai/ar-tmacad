/* 3B kabuk yolunda kalınlık önerisi (app/hesap/statik-kabuk-arayuz.js › P.kabukSinir, P.kabukOnerHesap, P.kabukOvUygula).
   Kural: docs/tasarim-standartlari.md › "Kalınlık basamakları ve sınırları" (Çokal AAT statik raporundan) —
   kalınlıklar basamaklı (25 / 30 / 40 / 50 / 60 …), dış perde H/9,5'i karşılayan ilk basamağı aşmaz, radye en kalın dış perdenin
   en çok iki basamak üstü, üst döşeme en çok 30 cm. Eskiden bu yolda 5 cm adımla perde 150 / radye 200 / döşeme 80 cm'e kadar büyüyordu
   (Konya terfi: uzun perde 30 → 80, radye 40 → 90, galeri döşemesi 15 → 65 cm).
   Çalıştır: node test/statik-kabuk-oner.test.js */
'use strict';
const assert = require('assert');
const O = require('./statik-ortam.js'), P = O.pencere();
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const basamakta = (v, L) => (L || P.KALINLIK.basamak).some(b => Math.abs(b - v) < 1e-9);

/* küçük dikdörtgen hazne: 8 × 5 m, perde yüksekliği H (radye üstünden), dışta toprak perde üstüne kadar */
const kutu = (H, tw, o) => {
  const S = P.ornekSaray(), kAlt = 100, hr = 0.40, zt = kAlt + hr + H;
  S.kabuk = { walls: [['P1', [[0, 0], [8, 0]]], ['P2', [[8, 0], [8, 5]]], ['P3', [[8, 5], [0, 5]]], ['P4', [[0, 5], [0, 0]]]].map(([ad, pts], i) => ({ id: i + 1, ad, pts, kapali: false, t: tw, zt, tip: 'dis' })),
    radye: { id: 9, pts: [[-0.5, -0.5], [8.5, -0.5], [8.5, 5.5], [-0.5, 5.5]], t: hr, kAlt }, dosemeler: [] };
  S.geo = Object.assign(S.geo, { Lx: 8, Ly: 5, tw, ti: tw, hr, toe: 0.5, bolX: [], bolY: [], doseme: [], kAlt, kUst: zt, kZemin: zt - 0.2, kSu: kAlt + hr, kYAS: null, ust: 'S' });
  S.mod = 'kabuk'; S.suYapisi = false; S.dep.SDS = 0; S.tas.kmesh = 0.8; Object.assign(S, o || {});
  return S;
};

t('kabukSinir: perde aralığı yüksekliğe göre, radye iki basamak üstü, döşeme 30 cm', () => {
  const L = P.kabukSinir(kutu(4.5, 0.30).kabuk);
  assert.strictEqual(L.perde.length, 4); for (const a of L.perde) { assert.strictEqual(a.min, 0.25); assert.strictEqual(a.max, 0.50); }
  assert.strictEqual(L.radyeMax, 0.60); assert.strictEqual(L.dosemeMax, 0.30);          // max(40; dış perde 30) → 50 → 60
  const M = kutu(6.5, 0.60).kabuk; M.walls.push({ id: 7, ad: 'P5', pts: [[4, 0], [4, 5]], kapali: false, t: 0.30, zt: M.walls[0].zt, tip: 'ic' });
  const L2 = P.kabukSinir(M); assert.strictEqual(L2.perde[0].max, 0.70); assert.strictEqual(L2.perde[4].max, 0.60, 'ara perde dış perdeden kalın olmaz'); assert.strictEqual(L2.radyeMax, 0.80);
});

t('Konya terfi modeli: sınırlar (6,50 m perde → en çok 70 cm; en kalın dış perde 60 cm → radye en çok 80 cm)', () => {
  const { d } = O.modelCevir(O.konyaDoc()), L = P.kabukSinir(d.kabuk);
  assert.strictEqual(d.kabuk.walls.length, 4); for (const a of L.perde) { assert.ok(Math.abs(a.H - 6.5) < 1e-6); assert.strictEqual(a.max, 0.70); }
  assert.strictEqual(L.radyeMax, 0.80); /* Konya statik: perdeler B 50 / A 60 cm → radye en çok 80 */ assert.strictEqual(L.dosemeMax, 0.30);
});

t('aşırı yüklü ince perde: öneri basamakla büyür, üst sınırı aşmaz, yetmiyorsa nedenini söyler; girdi değişmez', () => {
  const S = kutu(6.0, 0.25), once = JSON.stringify(S), a = P.perdeKalinlikAraligi(6.0);
  const o = P.kabukOnerHesap(S);
  assert.strictEqual(JSON.stringify(S), once, 'saf fonksiyon: S değişmemeli');
  for (const w of o.kabuk.walls) { assert.ok(basamakta(w.t), `${w.ad} ${w.t}`); assert.ok(w.t <= a.max + 1e-9, `${w.ad} ${w.t * 100} cm > ${a.max * 100} cm`); }
  assert.ok(basamakta(o.kabuk.radye.t) && o.kabuk.radye.t <= P.kabukSinir(o.kabuk).radyeMax + 1e-9);
  assert.ok(Math.abs(o.kabuk.radye.kAlt + o.kabuk.radye.t - 100.40) < 1e-6, 'radye üst kotu sabit kalmalı');
  assert.ok(!o.log.some(s => /\b(35|45|55|65) cm/.test(s)), 'ara değer yok: ' + o.log.join(' | '));
  if (!o.yeterli) { assert.ok(o.sinir.length > 0, 'yetmiyorsa uyarı olmalı'); assert.ok(o.sinir.every(s => /üst sınırında/.test(s) && /Yetmeyen: (kesme|.*donatı)/.test(s)), o.sinir.join('\n')); assert.ok(o.sinir.some(s => /üst kenarı boydan boya serbest/.test(s)), 'serbest üst kenar söylenmeli'); }
});

t('her turda bir eleman en çok bir basamak büyür (6 m perde önce en az kalınlığa, 40 cm, çekilir)', () => {
  const S = kutu(6.0, 0.25), o = P.kabukOnerHesap(S, { maxTur: 1 });
  assert.strictEqual(P.perdeKalinlikAraligi(6.0).min, 0.40);
  for (const w of o.kabuk.walls) assert.ok(w.t >= 0.40 - 1e-9 && w.t <= 0.50 + 1e-9, `${w.ad} tek turda ${w.t}`);
  assert.ok(o.kabuk.radye.t <= 0.50 + 1e-9);
});

t('yeterli yapı kalınlaştırılmaz', () => {
  const S = kutu(2.0, 0.30); S.geo.kZemin = S.geo.kAlt + 0.4; // toprak yok
  const o = P.kabukOnerHesap(S); assert.deepStrictEqual(o.log, []); assert.deepStrictEqual(o.sinir, []); assert.ok(o.yeterli);
});

t('eski oturumdan kalan aralık dışı öneriler geri gelmez (S.kabukOv)', () => {
  const K = kutu(6.5, 0.30).kabuk;                                   // perde en çok 70, radye en çok 60 (→ perde 40 olunca yine 60)
  const ov = { W1: { t: 0.80, t0: 0.30 }, W2: { t: 0.40, t0: 0.30 }, W3: { t: 0.55, t0: 0.30 }, W4: { t: 0.50, t0: 0.25 }, R9: { t: 0.90, t0: 0.40 } };
  const q = P.kabukOvUygula(K, ov);
  assert.strictEqual(K.walls[0].t, 0.30, '80 cm (aralık dışı) uygulanmamalı'); assert.strictEqual(K.walls[1].t, 0.40, '40 cm (aralıkta, basamakta) uygulanmalı');
  assert.strictEqual(K.walls[2].t, 0.30, '55 cm basamak değil'); assert.strictEqual(K.walls[3].t, 0.30, 'modeldeki kalınlık değişmiş: kayıt geçersiz');
  assert.strictEqual(K.radye.t, 0.40); assert.strictEqual(K.radye.kAlt, 100);
  assert.strictEqual(q.n, 1); assert.strictEqual(q.atilan.length, 3); assert.deepStrictEqual(Object.keys(ov), ['W2']);
  // aralıktaki radye önerisi: üst kot sabit, alt kot iner
  const K2 = kutu(6.5, 0.30).kabuk, q2 = P.kabukOvUygula(K2, { R9: { t: 0.50, t0: 0.40 } });
  assert.strictEqual(q2.n, 1); assert.strictEqual(K2.radye.t, 0.50); assert.ok(Math.abs(K2.radye.kAlt - 99.90) < 1e-9);
});

console.log(`\n${n} test geçti.`);

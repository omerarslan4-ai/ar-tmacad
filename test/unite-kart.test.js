/* Ünite kartı çekirdeği testi — çalıştır: node test/unite-kart.test.js
   Veri: ATV penceresinin West Benghazi örneğinden aktarılan iki kademe (2025 mevcut, 2035 nihai).
   Beklenen değerler elle hesaplandı (firma standardı: hava payı 1,0 m, duvar 0,30 m, taban 0,40 m,
   konteyner 1,37 m, konteyner payı 0,30 m, düşü 0,15 m; katalog: deşarj ağzı platformdan 0,215 m, kafa üstü 1,545 m). */
'use strict';
const assert = require('assert');
const path = require('path');
const K = require('../app/unite-kart.js');
const j = require(path.join(__dirname, 'veri', 'atv_west_benghazi_iki_kademe.json'));

let n = 0;
const t = (ad, fn) => { fn(); n++; console.log('✓ ' + ad); };
const yakin = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.0015, `${msg}: ${a} ≠ ${b}`);
const p = (kart, k) => kart.params.find(x => x.k === k);

t('kademe seçimi: nihai = en büyük debi, mevcut = ATV etkin kademe', () => {
  const kd = K.kademeSec(j, {});
  assert.strictEqual(kd.nihai.ad, '2. Kademe (2035)');
  assert.strictEqual(kd.mevcut.ad, '1. Kademe (2025)');
  assert.strictEqual(kd.uyari.length, 0);
});

t('akış zinciri (ön arıtma A): sıra, numara, kademe', () => {
  const Z = K.zincir(j, {});
  assert.deepStrictEqual(Z.su.map(x => x.id), ['cs', 'ps', 'fs', 'gr', 'dm', 'pc', 'an', 'bio', 'dg2', 'sc', 'cik']);
  assert.deepStrictEqual(Z.camur.map(x => x.id), ['pt', 'et', 'dw']);
  assert.deepStrictEqual(Z.yard.map(x => x.id), ['cp']);
  assert.deepStrictEqual(Z.su.map(x => x.kod).slice(0, 3), ['T-101', 'T-102', 'T-103']);
  assert.strictEqual(Z.yard[0].kod, 'T-115');
  assert.strictEqual(Z.su[0].sonraki, 'T-102');
  assert.strictEqual(Z.su.find(x => x.id === 'cs').kademe, 'nihai');
  assert.strictEqual(Z.su.find(x => x.id === 'bio').kademe, 'mevcut');
  // mevcut kademede tek biyolojik havuz → dağıtma yok; iki son çökeltme → dağıtma var
  assert.ok(!Z.su.some(x => x.id === 'dg1'));
  assert.strictEqual(Z.su.find(x => x.id === 'dg2').hat, 2);
});

t('nihai kademeyi 2025 seçince ızgaralar küçülür, 2035 mevcut olunca dağıtma yapıları gelir', () => {
  const Z = K.kartlar(j, { sec: { nihai: 0, mevcut: 1 } }, { katalog: null });
  const cs = Z.su.find(x => x.id === 'cs').kart;
  assert.strictEqual(p(cs, 'N').v, 1);
  assert.ok(Z.su.some(x => x.id === 'dg1') && Z.su.find(x => x.id === 'dg2').hat === 8);
  assert.ok(Z.uyari.some(u => u.includes('Nihai kademe debisi')));
});

t('kaba ızgara yapısı kartı (2035): ayak izi ve kot zinciri', () => {
  const Z = K.kartlar(j, {});
  const k = Z.su.find(x => x.id === 'cs').kart;
  assert.strictEqual(p(k, 'N').v, 4); assert.strictEqual(p(k, 'Nsb').v, 1); assert.strictEqual(p(k, 'n').v, 5);
  assert.strictEqual(p(k, 'b').kaynak, 'hesap'); assert.strictEqual(p(k, 'hp').kaynak, 'standart'); assert.strictEqual(p(k, 'hBos').kaynak, 'katalog'); assert.strictEqual(p(k, 'zp').kaynak, 'türetilen');
  yakin(k.ayakIzi.en, 5 * 1.8 + 6 * 0.3, 'en'); yakin(k.ayakIzi.boy, 6, 'boy');
  // zemin = kanal üstü (2,2); platform konteynerden: 2,2 + 1,37 + 0,30 + 0,15 − 0,215 = 3,805
  yakin(k.kot.platform, 3.805, 'platform'); yakin(p(k, 'D').v, 3.805, 'kanal derinliği');
  yakin(k.kot.desarj, 4.02, 'deşarj'); yakin(k.kot.bant, 3.87, 'bant'); yakin(k.kot.temel, -0.4, 'temel');
  yakin(p(k, 'Ht').v, 5.35, 'ızgara yüksekliği'); yakin(p(k, 'Le').v, 5.35 / Math.sin(75 * Math.PI / 180), 'eğim boyu');
  assert.ok(k.uyari.some(u => u.includes('Kanal derinleşti')));
  assert.ok(k.uyari.some(u => u.includes('80°')), 'ATV açısı farkı uyarısı');
  yakin(k.giris.y, k.ayakIzi.en / 2, 'giriş ortada'); yakin(k.cikis.x, 6, 'çıkış uçta');
});

t('zemin alçaksa platform standarttan gelir (su derinliği + 1 m)', () => {
  const k = K.izgaraKart('cs', [{ rol: 'kaba', dim: j.kademeler[1].units.cs.dim }], { zz: -2 });
  yakin(k.kot.platform, 2.2, 'platform'); assert.ok(!k.uyari.some(u => u.includes('Kanal derinleşti')));
  assert.ok(p(k, 'zz').deg);
});

t('proje bazında standart değişikliği', () => {
  const k = K.izgaraKart('cs', [{ rol: 'kaba', dim: j.kademeler[1].units.cs.dim }], { zz: -2, hp: 0.8, zt: 10 });
  yakin(k.kot.platform, 12.0, 'platform'); yakin(k.kot.temel, 9.6, 'temel');
  assert.strictEqual(p(k, 'hp').kaynak, 'standart'); assert.ok(p(k, 'hp').deg); assert.strictEqual(p(k, 'hp').vars, 1.0);
});

t('ön arıtma B: kaba ve ince aynı kanalda tek yapı', () => {
  const Z = K.kartlar(j, { sec: { onaritma: 'B' } });
  assert.deepStrictEqual(Z.su.slice(0, 2).map(x => x.id), ['izB', 'ps']);
  const k = Z.su[0].kart;
  yakin(p(k, 'b').v, 3.4, 'büyük genişlik'); yakin(p(k, 'h').v, 1.2, 'büyük su derinliği');
  yakin(k.ayakIzi.boy, 6 + 3.0, 'boy = kanal + ara'); yakin(k.ayakIzi.en, 5 * 3.4 + 6 * 0.3, 'en');
  assert.ok(p(k, 'e_kaba') && p(k, 'e_ince'));
});

t('yedek kanal yoksa uyarı (baypas zorunlu)', () => {
  const k = K.izgaraKart('cs', [{ rol: 'kaba', dim: { N: 2, Nsb: 0, b: 1, h: 1, L: 5 } }], {});
  assert.ok(k.uyari.some(u => u.includes('baypas')));
});

t('tek kademeli eski veri açılır ve uyarı verir', () => {
  const eski = { format: 'AritmaCAD-proses', surum: 2, kademe: 'Tek', debi: { Qww: 100 }, units: { cs: j.units.cs, gr: j.units.gr, bio: j.units.bio, sc: j.units.sc } };
  const Z = K.kartlar(eski, {});
  assert.strictEqual(Z.kademe.liste.length, 1);
  assert.ok(Z.uyari.some(u => u.includes('tek kademe')));
  assert.strictEqual(Z.su.find(x => x.id === 'cs').kart.ayakIzi.boy, 6);
});

t('eksik zorunlu ünite listede kalır ve uyarılır', () => {
  const Z = K.zincir({ units: { bio: j.units.bio } }, {});
  assert.strictEqual(Z.su.find(x => x.id === 'cs').durum, 'eksik');
  assert.ok(Z.uyari.some(u => u.includes('Kaba ızgara yapısı')));
});

console.log(`\n${n} test geçti.`);

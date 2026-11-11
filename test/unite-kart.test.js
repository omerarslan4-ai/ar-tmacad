/* Ünite kartı çekirdeği testi — çalıştır: node test/unite-kart.test.js
   Veri: ATV penceresinin West Benghazi örneğinden aktarılan iki kademe (2025 mevcut, 2035 nihai).
   Beklenen değerler elle hesaplandı (firma standardı: hava payı 1,0 m, duvar 0,30 m, taban 0,40 m,
   konteyner 1,37 m, konteyner payı 0,30 m, düşü 0,15 m, platform zeminden ≥ 0,65 m;
   katalog: deşarj ağzı platformdan 1,0 m (halatlı tip), kafa üstü 1,545 m). */
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
  // en = 5 kanal × 1,8 + süzüntü kanalı 0,6 + bölme yok + 2 × dış duvar 0,3
  yakin(k.ayakIzi.en, 5 * 1.8 + 0.6 + 2 * 0.3, 'en'); yakin(k.ayakIzi.boy, 6, 'boy');
  // zemin bilinmiyor → 2,2 − 0,65 = 1,55; platform konteynerden: 1,55 + 1,37 + 0,30 + 0,15 − 1,0 = 2,37
  yakin(k.kot.zemin, 1.55, 'zemin'); yakin(k.kot.platform, 2.37, 'platform'); yakin(p(k, 'D').v, 2.37, 'kanal derinliği');
  yakin(k.kot.desarj, 3.37, 'deşarj'); yakin(k.kot.bant, 3.22, 'bant'); yakin(k.kot.temel, -0.4, 'temel');
  yakin(p(k, 'Ht').v, 3.915, 'ızgara yüksekliği'); yakin(p(k, 'Le').v, 3.915 / Math.sin(75 * Math.PI / 180), 'eğim boyu');
  yakin(p(k, 'hBos').v, 1.0, 'katalog deşarj ağzı');
  assert.ok(p(k, 'zp').not.includes('konteyner'));
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
  yakin(k.ayakIzi.boy, 6 + 3.0, 'boy = kanal + ara'); yakin(k.ayakIzi.en, 5 * 3.4 + 0.6 + 2 * 0.3, 'en');
  assert.ok(p(k, 'e_kaba') && p(k, 'e_ince'));
});

/* GERÇEK PROJE: Çokal AAT, T-101 Kaba ve İnce Izgara (1-Çokal_AAT_Kaba-İnce-Giriş-Kum Yağ Tutucu_R3.dwg, C-C kesiti)
   Proses raporu R07: kaba ve ince ızgara 1 asıl + 1 yedek, kanal 0,60 m, Q maks. su derinliği 0,23 m, 75°.
   Çizim: kanal tabanı 86,75; tabii zemin 94,80; platform 95,45 (ölçü 870); iç 60 + 60 + 60 (ortada süzüntü kanalı), dış duvar 40 cm → 2,60 m.
   Çokal'a özgü değerler: dış duvar 0,40 (8,7 m derinlik), halatlı ızgara deşarj ağzı platformdan ≈ 1,0 m, konteyner 1 m³ ≈ 1,05 m. */
t('Çokal AAT T-101: platform, kanal derinliği ve genişlik çizimle aynı', () => {
  const kaba = { N: 1, Nsb: 1, b: 0.60, h: 0.23, L: 6, th: 75, e: 40 }, ince = { N: 1, Nsb: 1, b: 0.60, h: 0.23, L: 6, th: 75, e: 10 };
  const k = K.izgaraKart('izB', [{ rol: 'kaba', dim: kaba }, { rol: 'ince', dim: ince }], { zt: 86.75, zz: 94.80, tw: 0.40, hBos: 1.0, Hk: 1.05 });
  yakin(k.kot.platform, 95.45, 'platform (çizim 95,45)');
  yakin(p(k, 'D').v, 8.70, 'kanal derinliği (çizim 870)');
  yakin(k.ayakIzi.en, 2.60, 'dış genişlik (çizim 260)');
  assert.ok(p(k, 'zp').not.includes('zemin + platform payı'), 'platformu zemin + 0,65 belirler');
  // firma standardı konteynerle (1,37 m) platform 0,17 m yükselir
  const s = K.izgaraKart('izB', [{ rol: 'kaba', dim: kaba }, { rol: 'ince', dim: ince }], { zt: 86.75, zz: 94.80, tw: 0.40, hBos: 1.0 });
  yakin(s.kot.platform, 95.62, 'standart konteynerle platform');
});

/* GERÇEK PROJE: Çokal AAT, T-103 Kum ve Yağ Tutucu (aynı çizim, F-F enine kesit ve plan)
   2 göz; göz iç 1,60 m (kum 1,00 + lamel 0,10 + yağ 0,50); ara duvar 30, dış duvar 40 → en 4,30 m.
   Boyuna: 40 | 150 dağıtma | 40 | 1100 havuz | 40 | 150 çıkış | 40 → 15,60 m.
   Kotlar: su 98,30; duvar üstü 99,15; kum oluğu üstü 96,19, dibi 95,69; temel altı (grobeton üstü) 95,05; tabii zemin 95,40. */
t('Çokal AAT T-103: kum tutucu ayak izi ve kotları çizimle aynı', () => {
  const k = K.kumKart('gr', { N: 2, b: 1.00, bF: 0.50, tw: 0.10, h: 2.11, L: 11.0 }, { zs: 98.30, zz: 95.40 });
  yakin(k.ayakIzi.en, 4.30, 'en (çizim 430)'); yakin(k.ayakIzi.boy, 15.60, 'boy (çizim 1560)');
  yakin(k.kot.ust, 99.15, 'duvar üstü'); yakin(k.kot.taban, 96.19, 'kum oluğu üstü');
  yakin(k.kot.oluk, 95.69, 'kum oluğu dibi'); yakin(k.kot.temel, 95.05, 'temel altı');
  assert.ok(p(k, 'zu').not.includes('su yüzü'));
  assert.strictEqual(p(k, 'b').kaynak, 'hesap'); assert.strictEqual(p(k, 'hp').kaynak, 'standart'); assert.strictEqual(p(k, 'en').kaynak, 'türetilen');
});

t('kum tutucu: gömülü yapıda duvar üstü zemin + 0,65', () => {
  const k = K.kumKart('gr', { N: 2, b: 1, bF: 0.5, tw: 0.1, h: 2, L: 10 }, { zs: 98.30, zz: 99.00 });
  yakin(k.kot.ust, 99.65, 'duvar üstü'); assert.ok(k.uyari.some(u => u.includes('zemin')));
});

t('akış zincirinde kum tutucu kartı ATV verisinden (2035)', () => {
  const Z = K.kartlar(j, { sec: { blowerKum: 'AYRI' } });
  const x = Z.su.find(y => y.id === 'gr');
  assert.strictEqual(x.durum, 'kart'); assert.strictEqual(x.kademe, 'nihai');
  // ATV 2035: 4 hat, b 3,5, b_FF 1,75, ayırma 0,3, h 3,5, L 39
  yakin(x.ayakIzi.en, 4 * (3.5 + 0.3 + 1.75) + 3 * 0.30 + 2 * 0.40, 'en'); yakin(x.ayakIzi.boy, 1.5 + 39 + 1.5 + 4 * 0.4, 'boy');
  assert.ok(p(x.kart, 'blower').v.includes('küçük binada'));
});

/* GERÇEK PROJE: Çokal AAT, T-102 Giriş Terfi Merkezi (aynı çizim, D-D kesiti ve plan)
   Hazne iç 3,90 × 2,50, duvar 40 → 4,70 × 3,30; 3 pompa (2+1) aks aralığı 1,00, duvara 0,95.
   Giriş (ızgara) tabanı 86,75; h1 85,89; hölü 85,15; taban 84,80; döşeme 95,45 (ölçü 1065); vinç 98,15; zemin 94,80. */
t('Çokal AAT T-102: terfi haznesi kotları ve ayak izi çizimle aynı', () => {
  const k = K.terfiKart('ps', { L: 2.5, W: 3.9, hd: 0.35, hu: 0.74, n: 3, nd: 2, nc: 1 }, { zg: 86.75, zz: 94.80 }, { nd: 1 });
  yakin(k.kot.ust, 85.89, 'h1'); yakin(k.kot.durma, 85.15, 'hölü'); yakin(k.kot.taban, 84.80, 'taban');
  yakin(k.kot.temel, 84.40, 'temel'); yakin(k.kot.doseme, 95.45, 'döşeme'); yakin(p(k, 'D').v, 10.65, 'derinlik (çizim 1065)');
  yakin(p(k, 'zv').v, 98.15, 'monoray'); yakin(p(k, 'Wmin').v, 3.90, 'pompalar sığıyor');
  yakin(k.ayakIzi.en, 4.70, 'en'); yakin(k.ayakIzi.boy, 3.30, 'boy');
  assert.strictEqual(p(k, 'ndM').v, 1); assert.strictEqual(k.uyari.length, 0);
});

t('terfi zincirde: yapı nihai kademeden, pompa sayısı iki kademeyle; pompa sığma kontrolü', () => {
  const Z = K.kartlar(j, {});
  const x = Z.su.find(y => y.id === 'ps');
  assert.strictEqual(x.durum, 'kart'); assert.strictEqual(x.kademe, 'nihai');
  assert.strictEqual(p(x.kart, 'nd').v, 14); assert.strictEqual(p(x.kart, 'ndM').v, 4);
  yakin(x.ayakIzi.en, 2 + 2 * 0.4, 'en'); yakin(x.ayakIzi.boy, 36 + 2 * 0.4, 'boy');
  // 18 pompa 36 m'lik uzun kenara sığar (17 × 1,0 + 2 × 0,95 = 18,9 m)
  assert.ok(!x.kart.uyari.some(u => u.includes('dar')));
  const dar = K.terfiKart('ps', { L: 3, W: 2, hd: 1, hu: 1.5, n: 5, nd: 4, nc: 1 }, {});
  assert.ok(dar.uyari.some(u => u.includes('dar')));
});

t('terfi yerleşimi: bitişik (varsayılan) ya da ayrı yapı', () => {
  const bit = K.kartlar(j, {}).su.find(y => y.id === 'ps');
  assert.strictEqual(bit.bitisik, true); assert.ok(p(bit.kart, 'yer').v.includes('bitişik'));
  const ayr = K.kartlar(j, { sec: { terfiYer: 'AYRI' } }).su.find(y => y.id === 'ps');
  assert.strictEqual(ayr.bitisik, false); assert.ok(p(ayr.kart, 'zg').ad.includes('borusu'));
  // ayak izi ve kotlar yerleşimden etkilenmez (Çokal'da bitişik yapılar duvar paylaşmaz)
  assert.deepStrictEqual(ayr.ayakIzi, bit.ayakIzi);
});

/* GERÇEK PROJE: Çokal AAT, T-104 Giriş Debimetre (2-Çokal_AAT_Giriş Debimetre_R3.dwg)
   Proses raporu: Q maks. (2060) 0,083 m³/s, Q min. (2045) 0,029 m³/s; çizimde DN315 HDPE.
   Oda iç 2,00 × 1,50, duvar 25 → 2,50 × 2,00; boru altı 93,67; taban 93,25; döşeme 95,45; zemin 95,00. */
t('Çokal AAT T-104: debimetre borusu ve odası çizimle aynı', () => {
  const k = K.debimetreKart('dm', { Qww: 0.083 * 3600 }, { Qmin: 0.029 * 3600 }, { zb: 93.67, zz: 95.00 }, {});
  assert.strictEqual(p(k, 'OD').v, 315); assert.strictEqual(p(k, 'DN').v, 300);
  yakin(k.kot.taban, 93.25, 'taban'); yakin(k.kot.doseme, 95.45, 'döşeme');
  yakin(k.ayakIzi.en, 2.00, 'en'); yakin(k.ayakIzi.boy, 2.50, 'boy');
  yakin(p(k, 'Lu').v, 1.5, '5·DN'); assert.strictEqual(k.uyari.length, 0);
});

t('debimetre: zincirde nihai kademe; büyük debide boru yetmez uyarısı; Parshall seçeneği', () => {
  const x = K.kartlar(j, {}).su.find(y => y.id === 'dm');
  assert.strictEqual(x.durum, 'kart'); assert.strictEqual(x.kademe, 'nihai');
  assert.ok(x.kart.uyari.some(u => u.includes('yetmiyor')));
  const pr = K.debimetreKart('dm', { Qww: 0.083 * 3600 }, { Qmin: 0.029 * 3600 }, {}, { debimetre: 'PAR' });
  yakin(p(pr, 'W').v, 0.152, '6 inç boğaz (Q maks. 0,111)'); yakin(p(pr, 'Ha').v, Math.pow(0.083 / 0.381, 1 / 1.58), 'Ha');
  assert.strictEqual(pr.ayakIzi, null);
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

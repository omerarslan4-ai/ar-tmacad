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
  assert.deepStrictEqual(Z.su.map(x => x.id), ['cs', 'ps', 'fs', 'gr', 'dm', 'pc', 'dg1', 'an', 'bio', 'dg2', 'sc', 'fp', 'kf', 'uv', 'dmc']);
  assert.deepStrictEqual(Z.camur.map(x => x.id), ['pt', 'et', 'dw']);
  assert.deepStrictEqual(Z.yard.map(x => x.id), ['cp']);
  assert.deepStrictEqual(Z.su.map(x => x.kod).slice(0, 3), ['T-101', 'T-102', 'T-103']);
  assert.strictEqual(Z.yard[0].kod, 'T-119');
  assert.strictEqual(Z.su[0].sonraki, 'T-102');
  assert.strictEqual(Z.su.find(x => x.id === 'cs').kademe, 'nihai');
  assert.strictEqual(Z.su.find(x => x.id === 'bio').kademe, 'mevcut');
  // mevcut kademede tek biyolojik havuz ama nihaide 3 → dağıtma var (2 kör savakla); iki son çökeltme → dağıtma var
  const d1 = Z.su.find(x => x.id === 'dg1');
  assert.strictEqual(d1.hat, 1); assert.strictEqual(d1.hatN, 3);
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

/* GERÇEK PROJE: Çokal AAT, T-103 Kum ve Yağ Tutucu (aynı çizim, G-G enine kesit ve plan; ölçüler DXF'ten okundu)
   2 göz; göz iç 1,60 m (kum 1,00 + ayırma kirişi 0,20 + yağ 0,40); ara duvar 30, dış duvar 40 → en 4,30 m.
   Boyuna: 40 | 150 dağıtma | 40 | 1140 havuz | 40 | 150 çıkış | 40 → 16,00 m.
   Kotlar: su 97,45; duvar üstü 99,15 (orta yürüme yolu 98,30); kum oluğu üstü 96,19, dibi 95,69; taban plağı üstü 95,05, altı 94,55; tabii zemin 95,40. */
t('Çokal AAT T-103: kum tutucu ayak izi ve kotları çizimle aynı', () => {
  const k = K.kumKart('gr', { N: 2, b: 1.00, bF: 0.40, tw: 0.20, h: 1.26, L: 11.4 }, { zs: 97.45, zz: 95.40 });
  yakin(k.ayakIzi.en, 4.30, 'en (çizim 430)'); yakin(k.ayakIzi.boy, 16.00, 'boy (çizim 1600)');
  yakin(k.kot.ust, 99.15, 'duvar üstü'); yakin(k.kot.taban, 96.19, 'kum oluğu üstü');
  yakin(k.kot.oluk, 95.69, 'kum oluğu dibi'); yakin(k.kot.plak, 95.05, 'taban plağı üstü'); yakin(k.kot.temel, 94.55, 'temel altı');
  assert.ok(p(k, 'zu').not.includes('su yüzü'));
  assert.strictEqual(p(k, 'b').kaynak, 'hesap'); assert.strictEqual(p(k, 'hp').kaynak, 'standart'); assert.strictEqual(p(k, 'en').kaynak, 'türetilen');
});

t('kum tutucu: gömülü yapıda duvar üstü zemin + 0,65', () => {
  const k = K.kumKart('gr', { N: 2, b: 1, bF: 0.5, tw: 0.1, h: 2, L: 10 }, { zs: 98.30, zz: 99.50 });
  yakin(k.kot.ust, 100.15, 'duvar üstü'); assert.ok(k.uyari.some(u => u.includes('zemin')));
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

/* BİYOLOJİK HAVUZ: karusel şablonu (app/karusel.js, Zeytinli AAT T107). Modül tarayıcı için yazılmış;
   testte çizim kısımları boş bırakılarak yüklenir, hesap fonksiyonları (hacim, düz uzunluk, mikser) aynen çalışır. */
const karuselYukle = () => {
  const once = globalThis.C;
  globalThis.C = { M: { fmt: (v, n) => (+v).toFixed(n == null ? 2 : n) }, T: {}, prim: {}, meshDef: {}, uniteLayout: () => ({}), on() { }, addCommand() { } };
  require('../app/karusel.js');
  const c = globalThis.C; globalThis.C = once;
  return { DEF: c.KARUSEL_DEF, Ls: c.karuselLs, geo: c.karuselGeo };
};
const KAR = karuselYukle();

/* GERÇEK PROJE: Çokal AAT, T-105 Anaerobik havuz (3-Çokal_AAT_Anaerobik_R3.dwg, proses raporu Tablo 20)
   Rapor: 3 göz, 2,70 × 11,00, su 3,00 m; 1. kademe Q proje 145,83, Q maks. 275,83 m³/h, geri devir %75 (= 206,87 m³/h).
   Çizim: 3 karusel halkası (RAS, T-105/1, T-105/2), halka iç eni 3,00, orta duvar 30, halkalar arası 40 cm, R0,70–R1,00 kılavuz,
   düz boy 11,00; giriş kanalı 0,80 (sol), çıkış kanalı 1,00 (sağ), kanal duvarı 30 → dış ölçü 17,20 × 10,60.
   Halka eksenleri sol alt köşeden: x 3,00; y 1,90 / 5,30 / 8,70. Su 96,64, duvar üstü 97,25, ağız 95,75–96,75, zemin 95,00. */
t('Çokal AAT T-105: anaerobik karusel halkaları, ayak izi, temas süresi ve kotlar', () => {
  const k = K.anaerobikKart('an', { N: 3, L: 11, W: 2.7, h: 3.0 }, { Qd: 145.83 * 24, Qww: 275.83 }, { zs: 96.64, zz: 95.00, Ls: 11 }, {}, KAR);
  yakin(k.ayakIzi.en, 10.60, 'en (çizim 10,60)'); yakin(k.ayakIzi.boy, 17.20, 'boy (çizim 17,20)');
  yakin(k.halka.x1, 3.00, 'sol yarım daire merkezi'); assert.deepStrictEqual(k.halka.yc, [1.9, 5.3, 8.7]);
  assert.ok(Math.abs(p(k, 'QRS').v - 206.87) < 0.01, 'geri devir (rapor 206,87)');
  const Vk = (11 * 3 - 11 * 0.3 + Math.PI * 2.25 - Math.PI * (1 - 0.49)) * 3 * 3;
  assert.ok(Math.abs(p(k, 'Vk').v - Vk) < 0.01, 'geometri hacmi'); yakin(p(k, 'b').v, 1.35, 'koridor');
  assert.ok(p(k, 't').v > 0.57 && p(k, 't').v < 0.95, 'raporun temas aralığında');
  yakin(k.kot.ust, 97.24, 'duvar üstü (çizim 97,25)'); yakin(k.kot.agiz, 95.75, 'ağız alt kotu (çizim 95,75)');
  assert.ok(p(k, 'mix').v.includes('×'), 'mikser seçildi');
  assert.deepStrictEqual(k.uyari, []); assert.deepStrictEqual(k.girisler, ['ham su', 'geri devir', 'süzüntü suyu']);
});

t('anaerobik: düz boy hacimden; tek halka; zincirde mevcut kademe', () => {
  const k = K.anaerobikKart('an', { N: 3, L: 11, W: 2.7, h: 3.0 }, { Qd: 3500, Qww: 275.83 }, {}, {}, KAR);
  assert.ok(Math.abs(p(k, 'Vk').v - 267.3) < 0.01, 'hacim korunur'); yakin(p(k, 'Ls').v, (29.7 - (Math.PI * 2.25 - Math.PI * 0.51)) / 2.7, 'düz boy');
  const t1 = K.anaerobikKart('an', { N: 3, L: 11, W: 2.7, h: 3.0 }, { Qd: 3500, Qww: 275.83 }, {}, { anGoz: '1' }, KAR);
  yakin(t1.ayakIzi.en, 3.8, 'tek halka eni'); assert.ok(Math.abs(p(t1, 'Vk').v - 267.3) < 0.01, 'tek halkada da hacim');
  const az = K.anaerobikKart('an', { N: 3, L: 11, W: 2.7, h: 3.0 }, { Qd: 3500, Qww: 275.83 }, { Ls: 5 }, {}, KAR);
  assert.ok(az.uyari.some(u => u.includes('düz boyu artırın')));
  const x = K.kartlar(j, {}, { karusel: KAR }).su.find(y => y.id === 'an');
  assert.strictEqual(x.durum, 'kart'); assert.strictEqual(x.kademe, 'mevcut');
  yakin(p(x.kart, 't').v, p(x.kart, 'Vk').v / (55300 / 24 + 0.75 * 4608), 'WB 2025 temas süresi');
  const kisa = K.anaerobikKart('an', { N: 1, L: 5, W: 5, h: 3 }, { Qd: 24000, Qww: 2000 }, {}, {});
  assert.ok(kisa.uyari.some(u => u.includes('Temas süresi')));
});

t('biyolojik havuz: Zeytinli T107 hacmi verilince şablonun düz uzunluğu (135 m) geri bulunur', () => {
  const Gz = KAR.geo(Object.assign({}, KAR.DEF));
  const k = K.bioKart('bio', { N: 4, h: 6.45, L: Gz.V / (4 * 6.45), W: 1 }, { sistemAd: 'Simultane DN' }, {}, KAR);
  yakin(p(k, 'Ls').v, 135, 'düz uzunluk'); yakin(p(k, 'Vk').v, Gz.V, 'şablon hacmi = ATV hacmi');
  yakin(k.ayakIzi.boy, Gz.Lo, 'boy'); yakin(k.ayakIzi.en, Gz.Wo, 'en');
  yakin(k.ayakIzi.boy, 0.8 + 9 + 135 + 9 + 0.8, 'boy = dış duvar + Ro + Ls + Ro + dış duvar');
  assert.ok(p(k, 'mix').v.includes('×'));
});

t('biyolojik havuz zincirde (WB 2025, A2O): bölge sırası, kotlar, mevcut kademe', () => {
  const Z = K.kartlar(j, {}, { karusel: KAR });
  const x = Z.su.find(y => y.id === 'bio');
  assert.strictEqual(x.durum, 'kart'); assert.strictEqual(x.kademe, 'mevcut');
  const k = x.kart;
  assert.strictEqual(p(k, 'V').v, 72 * 36 * 6);
  assert.ok(p(k, 'sira').v.startsWith('Anoksik %22 → Aerobik %78'), p(k, 'sira').v);
  assert.ok(Math.abs(p(k, 'Vk').v - 72 * 36 * 6) < 0.05, 'şablon hacmi tutar (düz uzunluk mm yuvarlanır)');
  const q = K.bioKart('bio', j.units.bio.dim, j, { zs: 100, zz: 98 }, KAR);
  yakin(q.kot.ust, 101.05, 'duvar üstü = su + 1,05'); yakin(q.kot.taban, 94, 'taban'); yakin(q.kot.temel, 93.4, 'temel');
});

/* GERÇEK PROJE: Çokal AAT, T-108 Son çökeltme (7-Çokal_AAT_Çökeltme Havuzu_R2.dwg, A-A kesiti ve plan)
   Rapor: 1. kademede 1, 2. kademede 1 daha (toplam 2) dairesel havuz. Çizim: iç Ø12,20, duvar 20, giriş yapısı Ø2,00,
   taban eğimi 1/12; su 96,05, savak 96,00, kanal tabanı 95,55, kenar taban 93,50, huni ≈ 91,70, duvar üstü 97,25, zemin 94,40. */
t('Çokal AAT T-108: son çökeltme kotları, ayak izi ve gelecek kademe havuzu', () => {
  const k = K.scKart('sc', { N: 1, D: 12.2, Din: 2.0, h: 2.55, slope: 1 / 12 }, { zs: 96.05, zz: 94.40 }, { N: 2, D: 12.2 });
  yakin(k.kot.ust, 97.25, 'duvar üstü'); yakin(k.kot.savak, 96.00, 'savak'); yakin(p(k, 'zk').v, 95.55, 'kanal tabanı');
  yakin(k.kot.kenar, 93.50, 'kenar taban'); yakin(k.kot.merkez, 93.50 - (6.10 - 1.00) / 12, 'merkez taban');
  assert.ok(Math.abs(k.kot.huni - 91.70) < 0.02, 'huni dibi ≈ 91,70');
  yakin(k.ayakIzi.en, 12.60, 'dış çap'); yakin(k.ayakIzi.boy, 12.60 + 1.50 + 0.30, 'çıkış yapısıyla');
  assert.strictEqual(k.gelecek, 1); assert.strictEqual(k.uyari.length, 0);
});

t('son çökeltme zincirde: mevcut kademe havuzları, nihaideki fazlası gelecek kademe; giriş yapısı oranı uyarısı', () => {
  const x = K.kartlar(j, {}).su.find(y => y.id === 'sc');
  assert.strictEqual(x.durum, 'kart'); assert.strictEqual(x.kademe, 'mevcut');
  assert.strictEqual(x.adet, 2); assert.strictEqual(x.gelecek, 6);
  assert.ok(x.kart.uyari.some(u => u.includes('Giriş yapısı')));
});

/* GERÇEK PROJE: Çokal AAT, T-107 Son çökeltme dağıtma yapısı (4-Çokal_AAT_Havalandırma Havuzu_R3.dwg, F-F kesiti)
   1. kademede 1, nihaide 2 son çökeltme → 2 ağız (1'i kör). Q maks. 2060 298,33, 2045 275,83 m³/h; geri devir %75.
   Çizim: giriş haznesi su 96,46–96,48; savak 96,37; çıkış haznesi su 96,11; taban 91,13; duvar üstü 97,25; en 7,90 m. */
t('Çokal AAT T-107: dağıtma yapısı savak kotu, düşü ve genişlik çizimle aynı', () => {
  const k = K.dagitmaKart('dg2', { hat: 1, hatN: 2, hedef: 'sc' }, { Qww: 298.33 }, { Qww: 275.83 }, { zs: 96.45 }, { dgYer: 'BITISIK' });
  assert.ok(Math.abs(k.kot.savak - 96.37) < 0.005, 'savak 96,37');
  assert.ok(Math.abs(k.kot.cikis - 96.11) < 0.005, 'çıkış su 96,11');
  assert.ok(Math.abs(k.kot.taban - 91.13) < 0.005, 'taban 91,13');
  assert.ok(Math.abs(p(k, 'zsM').v - 96.48) < 0.015, 'mevcut kademede giriş su ≈ 96,48');
  yakin(k.ayakIzi.en, 7.90, 'en (çizim 790)'); assert.strictEqual(p(k, 'kor').v, 1);
  assert.ok(p(k, 'Pv').v < 30); assert.strictEqual(k.uyari.length, 0);
});

t('dağıtma yapısı ayrı yapı (varsayılan): derinlik çıkış borusundan; bitişikte havuz tabanı girilebilir', () => {
  const a = K.dagitmaKart('dg2', { hat: 1, hatN: 2, hedef: 'sc' }, { Qww: 298.33 }, { Qww: 275.83 }, { zs: 96.45, zz: 95.0 }, {});
  assert.strictEqual(a.bitisik, false); assert.strictEqual(p(a, 'ODc').v, 315);
  // çıkış su 96,109 − dalma 0,50 − Ø0,315 = boru tabanı 95,294; taban 0,27 altı
  assert.ok(Math.abs(p(a, 'zbc').v - 95.294) < 0.002 && Math.abs(a.kot.taban - 95.024) < 0.002, 'taban borudan');
  yakin(a.kot.ust, 97.24, 'duvar üstü'); yakin(a.ayakIzi.en, 7.90, 'ayak izi aynı');
  const b = K.dagitmaKart('dg2', { hat: 1, hatN: 2, hedef: 'sc' }, { Qww: 298.33 }, { Qww: 275.83 }, { zs: 96.45, zh: 91.00 }, { dgYer: 'BITISIK' });
  yakin(b.kot.taban, 91.00, 'havuz tabanı elle'); assert.strictEqual(p(b, 'zt').kaynak, 'elle');
});

t('dağıtma yapıları zincirde kart; biyolojik dağıtımda geri devir yok', () => {
  const Z = K.kartlar(j, {}, { karusel: KAR });
  const d1 = Z.su.find(x => x.id === 'dg1'), d2 = Z.su.find(x => x.id === 'dg2');
  assert.strictEqual(d1.durum, 'kart'); assert.strictEqual(p(d1.kart, 'kor').v, 2);
  yakin(p(d1.kart, 'QN').v, 20000 / 3600, 'bio dağıtımı Q maks.'); yakin(p(d2.kart, 'QN').v, 20000 / 3600 * 1.75, 'çökeltme dağıtımı + geri devir');
  // büyük debide savak uzar, savak yükü sınırda kalır, enerji sınırı sağlanır
  assert.ok(p(d2.kart, 'Lsv').v > 1.7 && p(d2.kart, 'hN').v <= 0.1505, 'savak boyu debiden');
  assert.ok(p(d2.kart, 'Pv').v <= 30.01 && !d2.kart.uyari.some(u => u.includes('enerji')), 'enerji sınırı');
  assert.ok(d2.kart.uyari.some(u => u.includes('yetmiyor')), 'her hatta 1,2 m³/s: tek PE boru yetmez uyarısı');
});

t('çıkış hattı yuvaları: AKM filtresi → [UF] → UV (her zaman) → çıkış debimetresi → [klor + temiz su]', () => {
  const ids = sec => K.zincir(j, sec).su.slice(11).map(x => x.id);
  assert.deepStrictEqual(ids({}), ['fp', 'kf', 'uv', 'dmc']);
  assert.deepStrictEqual(ids({ akm: 'DISK', uf: 'VAR', uvTip: 'BORU', klor: 'VAR' }), ['df', 'uf', 'uv', 'dmc', 'kt', 'ts']);
  assert.deepStrictEqual(ids({ cikis: 'GK' }), ['fp', 'kf', 'uv', 'dmc', 'kt', 'ts'], 'eski "Geri kazanım" seçimi açılır');
  assert.strictEqual(K.zincir(j, { uvTip: 'BORU' }).su.find(x => x.id === 'uv').secenek, 'Boru tipi');
  const Z = K.kartlar(j, { par: { uv: { grup: 'İleri arıtma binası' }, dmc: { grup: 'İleri arıtma binası' } } }, { karusel: KAR });
  const dmc = Z.su.find(x => x.id === 'dmc');
  assert.strictEqual(dmc.durum, 'kart'); assert.strictEqual(dmc.kademe, 'nihai'); assert.strictEqual(p(dmc.kart, 'tip').v, 'Manyetik debimetre');
  assert.strictEqual(dmc.grup, 'İleri arıtma binası'); assert.strictEqual(Z.su.find(x => x.id === 'uv').grup, 'İleri arıtma binası');
  const P = K.kartlar(j, { sec: { debimetre: 'PAR' } }, { karusel: KAR }).su;
  assert.strictEqual(p(P.find(x => x.id === 'dm').kart, 'tip').v, 'Parshall savağı'); assert.strictEqual(p(P.find(x => x.id === 'dmc').kart, 'tip').v, 'Manyetik debimetre');
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

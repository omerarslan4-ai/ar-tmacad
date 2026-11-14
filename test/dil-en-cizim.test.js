/* app/dil-en-cizim.js — çizim / pafta yazılarının İngilizce sözlüğü.
   Tarayıcısız: app/dil.js + app/dil-en.js + app/dil-en-cizim.js window taklidiyle yüklenir; çizim çevirisi C.txL
   app/mimari.js kaynağından aynen kesilip (EN tablosu … C.txL) çalıştırılır. Örnek yazılar Bekçi, Anaerobik,
   Konya ve GT6 paftalarında EN modda Türkçe kalan gerçek yazılardır (14.11.2026 taraması).
   node test/dil-en-cizim.test.js */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const KOK = path.join(__dirname, '..');
const depo = { 'aritmacad.dil': 'en' };
globalThis.window = globalThis;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: { getItem: k => (k in depo ? depo[k] : null), setItem: (k, v) => { depo[k] = String(v); } } });
const yukDinle = [];
globalThis.addEventListener = (ad, f) => { if (ad === 'load') yukDinle.push(f); };
const yukle = f => new Function(fs.readFileSync(path.join(KOK, f), 'utf8'))();
yukle('app/dil.js'); yukle('app/dil-en.js');
const DIL = globalThis.DIL, n0 = DIL.sz.en.tam.size;
yukle('app/dil-en-cizim.js');
let hata = 0, sayi = 0;
const dene = (ad, fn) => { sayi++; try { fn(); } catch (e) { hata++; console.log('  ✗ ' + ad + '\n    ' + (e.message || e)); } };

// C.txL: app/mimari.js'teki çizim çevirisi (EN tablosu, RX kalıpları, ortak sözlük, satır içi ifadeler) aynen
const src = fs.readFileSync(path.join(KOK, 'app/mimari.js'), 'utf8').split('\n');
const a = src.findIndex(l => /^\s*const EN = \{/.test(l)), b = src.findIndex(l => /^\s*C\.txL = s => \{/.test(l));
assert(a > 0 && b > a, 'app/mimari.js içinde EN tablosu / C.txL bulunamadı (testi güncelleyin)');
const C = { doc: { set: { lang: 'en' } } };
new Function('C', src.slice(a, b + 5).join('\n'))(C);
yukDinle.forEach(f => f()); // bütün modüller yüklendikten sonraki sözlük düzeni
const tx = s => C.txL(s);
const TRH = /[ÇĞİÖŞÜçğıöşü]/;

console.log('dil-en-cizim: ' + (DIL.sz.en.tam.size - n0) + ' yeni tam karşılık, ' + DIL._cizimSozluk.length + ' satır');

dene('sözlükteki İngilizce karşılıklarda Türkçe harf yok', () => {
  const kotu = DIL._cizimSozluk.filter(([, en]) => TRH.test(en)).map(([t]) => t);
  assert.deepStrictEqual(kotu, []);
});
dene('aynı Türkçe yazı iki kez farklı çevrilmemiş', () => {
  const g = new Map(), cift = [];
  for (const [t, en] of DIL._cizimSozluk) { if (g.has(t) && g.get(t) !== en) cift.push(t); g.set(t, en); }
  assert.deepStrictEqual(cift, []);
});

// gerçek pafta yazıları (TR kaynak → beklenen EN)
const ORNEK = [
  // mimari
  ['ARKA GÖRÜNÜŞ', 'REAR ELEVATION'], ['SAĞ YAN GÖRÜNÜŞ', 'RIGHT SIDE ELEVATION'], ['MİM-03', 'ARC-03'],
  ['MONTAJ HOLÜ (ZEMİN KAT)  ±0.00  (205.67)', 'ASSEMBLY HALL (GROUND FLOOR)  ±0.00  (205.67)'], ['POMPA HOLÜ  -5.90  (199.77)', 'PUMP HALL  -5.90  (199.77)'],
  ['TOPRAK KOTU  -0.20  (205.47)', 'GROUND LEVEL  -0.20  (205.47)'], ['ZEMİN ±0.00', 'GROUND FLOOR ±0.00'], ['Eğim %25', 'Slope 25%'], ['Yağmur borusu', 'Downpipe'],
  ['25 cm BRİKET DUVAR', '25 cm CONCRETE BLOCK WALL'], ['SK1 KAPAĞI PLANI (100×100)', 'SK1 COVER PLATE PLAN (100×100)'], ['MERDİVEN 33 × 17.9/27.0 cm · b=125 cm · YUKARI', 'STAIRS 33 × 17.9/27.0 cm · b=125 cm · UP'],
  ['Kırma mertek 8x16', 'Hip rafter 8x16'], ['Paslanmaz menteşe (gömme)', 'Stainless steel hinge (concealed)'],
  // statik
  ['+3.90 üst', '+3.90 top'], ['34 ad. Ø25', '34 pcs Ø25'], ['101,102 Ø12/25 dış yatay', '101,102 Ø12/25 outer face horizontal'], ['1,2,3  183Ø22/15 alt', '1,2,3  183Ø22/15 bottom'],
  ['131 Ø12/15 1. yüz yatay (eğri)', '131 Ø12/15 face 1 horizontal (curved)'], ['103 20Ø12/25 dış düşey', '103 20Ø12/25 outer face vertical'], ['1. yüz düşey gövde', 'face 1 vertical, main'],
  ['58Ø12/10 L=670  alt X', '58Ø12/10 L=670  bottom X'], ['28 düz + 799 yay R=201', '28 straight + 799 arc R=201'], ['Ö: 1/50', 'S: 1/50'], ['Ö: ölçeksiz', 'S: NTS'],
  ['+3.90 KOTU DÖŞEME DONATI PLANI', 'SLAB REINFORCEMENT PLAN AT LEVEL +3.90'], ['3.90 KOTU D1 DÖŞEME DONATI PLANI', 'SLAB D1 REINFORCEMENT PLAN AT LEVEL 3.90'],
  ['92.14 KOTU TEMEL DONATI DETAYI (1/2)', 'FOUNDATION REINFORCEMENT DETAIL AT LEVEL 92.14 (1/2)'], ['-0.60 ve 1.05 KOTLARI KALIP PLANI', 'FORMWORK PLAN AT LEVELS -0.60 AND 1.05'],
  ['P1, P2, P3, P4 PERDE KESİTİ (t=20)', 'P1, P2, P3, P4 WALL SECTION (t=20)'], ['KOLON APLİKASYON TABLOSU', 'COLUMN SCHEDULE'],
  ['3 – Kütle ve mesnet betonları ile grobetonların beton sınıfı "C16/20", eğim betonu "300 doz".', '3 – Concrete class of mass and support concrete and lean concrete is "C16/20"; screed concrete "300 dosage".'],
  ['kontrol mühendisince yerinde belirlenecektir.', 'the soil-dependent values given in the geological report.'],
  ['STATİK — IZGARA YAPISI — KALIP PLANI', 'STRUCTURAL — SCREEN STRUCTURE — FORMWORK PLAN'],
  // mekanik
  ['SIHHİ TESİSAT — ARMATÜR LİSTESİ', 'PLUMBING — FIXTURE LIST'], ['ELEKTRİKLİ ISITMA — CİHAZ LİSTESİ', 'ELECTRIC HEATING — EQUIPMENT LIST'], ['Klozet (rezervuarlı)', 'WC (with cistern)'],
  ['Toplam kalınlık 31,8 cm · yüzey alanı 27,6 m² · Yoğuşma yok', 'Total thickness 31.8 cm · surface area 27.6 m² · No condensation'], ['ŞEBEKEDEN 3/4"', 'FROM MAINS 3/4"'],
  ['Eİ1', 'EH1'], ['İÇ (ısıtılan hacim)', 'INSIDE (heated space)'],
  // proses / saha
  ["P1 PERDESİ DONATI PERSPEKTİFİ (perde ortası, 3 m'lik parça)", 'P1 WALL REINFORCEMENT PERSPECTIVE (mid-wall, 3 m segment)'],
  ['ATIKSU (HAM)  S.K. 96.61', 'RAW WASTEWATER  W.L. 96.61'], ['SK-101C/A — 2000×2050 (aktüatörlü)', 'SK-101C/A — 2000×2050 (actuated)'], ['ISLAK HACİM TABANI  -8.00', 'WET WELL FLOOR  -8.00'],
];
dene('örnek pafta yazıları C.txL ile İngilizce', () => {
  const yanlis = ORNEK.filter(([t, e]) => tx(t) !== e).map(([t, e]) => `${t}\n      → ${tx(t)}\n      ≠ ${e}`);
  assert(!yanlis.length, yanlis.join('\n    '));
});
dene('örnek pafta yazılarında Türkçe harf kalmıyor', () => {
  const kalan = ORNEK.map(([t]) => tx(t)).filter(s => TRH.test(s));
  assert.deepStrictEqual(kalan, []);
});
dene('karışık harfli karşılık küçük harfli kaynakta büyümüyor, büyük harflide büyüyor', () => {
  assert.strictEqual(tx('Sehpa Donatısı'), 'Chair Bar'); assert.strictEqual(tx('SEHPA DONATISI'), 'CHAIR BAR');
  assert.strictEqual(tx('Yer süzgeci'), 'Floor drain'); assert.strictEqual(tx('YER SÜZGECİ'), 'FLOOR DRAIN');
});
dene('Türkçe projede çeviri yok', () => { C.doc.set.lang = 'tr'; try { assert.strictEqual(tx('ARKA GÖRÜNÜŞ'), 'ARKA GÖRÜNÜŞ'); } finally { C.doc.set.lang = 'en'; } });
dene('statik penceresi (DIL.t): numaralı notlar ve poz etiketleri', () => {
  assert.strictEqual(DIL.t('10 – Zeminde betona zararlı kimyasal maddelerin bulunması durumunda TS 3440\'a göre önlem alınacaktır.'), '10 – If chemicals harmful to concrete are present in the soil, measures shall be taken according to TS 3440.');
  assert.strictEqual(DIL.t('101,102 Ø12/25 dış yatay'), '101,102 Ø12/25 outer face horizontal');
});
/* denetim 14.11.2026: satır parçası girdileri ('satir'), kısa kelimeler, harf biçimi, ondalık virgül, pafta adı öneki */
dene('bölünmüş not parçası metin içinde uygulanmıyor ("olacaktır." → "structures." değil)', () => {
  for (const s of ['Beton sınıfı C30/37 olacaktır.', 'Kalıp ilgililere bilgi verilecektir.']) { assert(!/structures|relevant parties/.test(tx(s)), 'C.txL: ' + tx(s)); assert(!/structures|relevant parties/.test(DIL.t(s)), 'DIL.t: ' + DIL.t(s)); }
  assert.strictEqual(tx('olacaktır.'), 'structures.'); assert.strictEqual(DIL.t('olacaktır.'), 'structures.'); // eski aktarımın satırı (tam satır)
});
dene('kısa kelimeler: yalnız tam satır ya da sayının ardında', () => {
  const B = [['Düz çatı', 'Flat roof'], ['DÜZ ÇATI', 'FLAT ROOF'], ['alt yapı', 'infrastructure'], ['taban kotu', 'base level'], ['Taban kotu', 'Base level'], ['üst', 'top'], ['alt', 'bottom'],
    ['+3.90 üst', '+3.90 top'], ['34 ad. Ø25', '34 pcs Ø25'], ['58Ø12/10 L=670  alt X', '58Ø12/10 L=670  bottom X'], ['28 düz + 799 yay R=201', '28 straight + 799 arc R=201']];
  const yanlis = B.filter(([t, e]) => tx(t) !== e).map(([t, e]) => `${t} → ${tx(t)} ≠ ${e}`); assert(!yanlis.length, yanlis.join('; '));
  assert(!/pcs/.test(tx('Proje ad.')), tx('Proje ad.')); assert(!/bottom/.test(tx('Proje alt başlığı')), tx('Proje alt başlığı'));
});
dene('açılım kodları İngilizcede FL / WL (kullanıcı kararı 14.11.2026)', () => {
  assert.strictEqual(tx('DÖ01'), 'FL01'); assert.strictEqual(tx('DU03'), 'WL03');
  assert.ok(/^FL02 /.test(tx('DÖ02 - 15 cm Betonarme döşeme')), tx('DÖ02 - 15 cm Betonarme döşeme'));
  assert.strictEqual(tx('ARC-01'), 'ARC-01');
});
dene('harf biçimi kaynak kelimeye uyar (C.txL ve DIL.t)', () => {
  assert.strictEqual(tx('Oda adı'), 'Room name'); assert.strictEqual(tx('Duvar'), 'Wall'); assert.strictEqual(tx('duvar'), 'wall'); assert.strictEqual(tx('DUVAR'), 'WALL');
  assert.strictEqual(tx('Tavan'), 'Ceiling'); assert.strictEqual(tx('Oda'), 'Room'); assert.strictEqual(DIL.t('Oda adı'), 'Room name');
  assert.strictEqual(DIL.harf('Duvar', 'wall'), 'Wall'); assert.strictEqual(DIL.harf('duvar', 'Wall'), 'wall'); assert.strictEqual(DIL.harf('ODA', 'Room'), 'ROOM'); assert.strictEqual(DIL.harf('Oda', 'ROOM', true), 'Room'); assert.strictEqual(DIL.harf('mss', 'mWC'), 'mWC');
});
dene('ondalık virgül yalnız ondalık sayıda (poz listeleri aynen)', () => {
  assert.strictEqual(tx('101,102'), '101,102'); assert.strictEqual(tx('1,2,3'), '1,2,3'); assert.strictEqual(tx('11,12 Ø12/25'), '11,12 Ø12/25');
  assert.strictEqual(tx('31,8 cm'), '31.8 cm'); assert.strictEqual(tx('2,50'), '2.50'); assert.strictEqual(tx('Toplam kalınlık 31,8 cm'), 'Total thickness 31.8 cm');
});
dene('pafta adı öneki ayrı çevrilir', () => {
  assert.strictEqual(tx('MİM-01 ZEMİN KAT PLANI'), 'ARC-01 GROUND FLOOR PLAN'); assert.strictEqual(tx('MİMARİ-02 KESİTLER'), 'ARCHITECTURAL-02 SECTIONS');
  assert.strictEqual(tx('MİMARİ-01 KAT PLANLARI, KESİTLER'), 'ARCHITECTURAL-01 FLOOR PLANS, SECTIONS'); assert.strictEqual(tx('MİM-03'), 'ARC-03');
});
dene('statik GENEL NOTLAR bölünmeden önce bütün cümle çevriliyor (Türkçe harf kalmıyor)', () => {
  const ds = fs.readFileSync(path.join(KOK, 'app/hesap/statik-pafta-dsi.js'), 'utf8'), m = /P\.NOTLAR_DSI = \[([\s\S]*?)\];/.exec(ds); assert(m, 'NOTLAR_DSI yok');
  const N = new Function('return [' + m[1] + '];')().map((n, i) => `${i + 1} – ` + n.replace('{BETON}', 'C30/37').replace('{CELIK}', 'B 420C').replace('{LB}', '50'));
  const kalan = N.map(n => DIL.t(n)).filter(s => TRH.test(s)); assert(!kalan.length, kalan.length + ' not Türkçe kaldı:\n      ' + kalan.join('\n      '));
});

console.log(`${sayi - hata}/${sayi} geçti`);
if (hata) process.exit(1);

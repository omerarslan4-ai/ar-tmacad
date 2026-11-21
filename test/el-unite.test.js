/* Proses ünitesi (havuz) elektrik projesi — saf kısım (app/el-unite.js).
   Gerçek proje 1: Çorlu AAT T-200 BİO-P ANAEROBİK HAVUZU, (31)(32)(33) ÇRL E-BP 001/002/003 — kablo kodları, kesitler, tava adları, galvaniz boru tablosu,
   BHAK tek hat şeması (3x50A, 4x6mm2 NYY, ışık 10A 3x2.5 NYY, priz panosu 3x40A 4x4 NYY), armatür aralığı 4,80 m.
   Gerçek proje 2: 50.000 m³/gün anaerobik havuz (unite-mekanik.test.js ile aynı ekipman: 6 × 5,5 kW mikser, aktüatörlü kapaklar).
   Çalıştır: node test/el-unite.test.js */
'use strict';
const assert = require('assert');
const E = require('../app/el-unite.js');
const U = require('../app/unite-mekanik.js');
const AK = require('../app/aktuator-katalog.js');
const { geo, ekipmanYer, boyutla } = require('../app/anaerobik.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

t('Çorlu E-BP 001: 0,37 kW kapak motoru ve 3,1 kW mikser → 4x2.5 mm² NYY (kesit motor gücünden, akım taşıma)', () => {
  assert.strictEqual(E.kesitSec(E.akim(0.37)).S, 2.5);
  assert.strictEqual(E.kesitSec(E.akim(3.1)).S, 2.5);
  assert.strictEqual(E.cins(4, 2.5), '4x2.5 mm² NYY', 'örnekteki yazım');
  /* büyük motor daha kalın kablo alır (akım taşıma) */
  assert.ok(E.kesitSec(E.akim(30)).S > 2.5);
  assert.ok(Math.abs(E.akim(5.5) - 10.74) < 0.05, '5,5 kW → In ≈ 10,7 A (cosφ 0,85, η 0,87)');
});

t('Çorlu E-BP 001 kablo düzeni: kapak GK-1 + KK-1 10x1.5; mikser KK-LK-1 10x1.5, GK-2 4x2.5, KK-2 3x1.5; boy boş', () => {
  const kp = E.kablolar({ kod: 'MK-200/4', tur: 'kapak', P: 0.37, S: 2.5 });
  assert.deepStrictEqual(kp.map(k => [k.kod, k.cins]), [['GK-1/MK-200/4', '4x2.5 mm² NYY'], ['KK-1/MK-200/4', '10x1.5 mm² NYY']]);
  const mk = E.kablolar({ kod: 'K-200C', tur: 'mikser', P: 3.1, S: 2.5 });
  assert.deepStrictEqual(mk.map(k => [k.kod, k.cins]), [['KK-LK-1/K-200C', '10x1.5 mm² NYY'], ['GK-2/K-200C', '4x2.5 mm² NYY'], ['KK-2/K-200C', '3x1.5 mm² NYY']]);
  assert.ok([...kp, ...mk].every(k => k.boy === null), 'MCC yeri genel yerleşimde: boy null (genel kablolamada doldurulur)');
  assert.strictEqual(mk[0].nereye, 'LCU-K-200C'); assert.strictEqual(mk[1].nereden, 'LCU-K-200C');
  assert.deepStrictEqual(E.etiketSatir(kp[0]), ['GK-1/MK-200/4', '4x2.5 mm² NYY'], 'boy yokken etiket yalnız cins');
  assert.deepStrictEqual(E.etiketSatir(Object.assign({}, kp[0], { boy: 167 })), ['GK-1/MK-200/4', '4x2.5 mm² NYY 167 mt'], 'boy gelince örnekteki gibi');
});

t('Çorlu "GALV. BORULARDAN GEÇEN KABLOLAR" tablosu birebir; 10x1.5 → 1" (kabul)', () => {
  assert.strictEqual(E.BORU_TABLO.length, 7);
  assert.deepStrictEqual(E.BORU_TABLO[0], ['3/4"', '2*1,5, 3*1,5, 4*1,5']);
  assert.deepStrictEqual(E.BORU_TABLO[6], ['3"', '3*120+70, 3*150+70']);
  assert.strictEqual(E.boruSec('3x1.5 mm² NYY'), '3/4"'); assert.strictEqual(E.boruSec('4x2.5 mm² NYY'), '1"'); assert.strictEqual(E.boruSec('4x6 mm² NYY'), '1 1/4"'); assert.strictEqual(E.boruSec('10x1.5 mm² NYY'), '1"');
});

t('Kablo tavası: az kablo 100mm, kalabalık güzergâh 2x100mm (örnekteki adlar)', () => {
  assert.strictEqual(E.tavaSec(['4x2.5 mm² NYY', '10x1.5 mm² NYY']).ad, '100mm KABLO TAVASI');
  assert.strictEqual(E.tavaSec(Array(12).fill('4x2.5 mm² NYY').concat(Array(12).fill('10x1.5 mm² NYY'))).ad, '2x100mm KABLO TAVASI');
});

t('Çorlu E-BP 003 BHAK tek hat şeması: 2 ışık (600 W) + 2 priz panosu (3000 W) → 3x50A, GK-1/BHAK 4x6mm2 NYY; çıkış sırası 01–06', () => {
  const B = E.bhak({ isik: [600, 600], priz: [3000, 3000], yedek: 2 });
  assert.strictEqual(B.In, 50); assert.strictEqual(B.kablo, '4x6mm2 NYY'); assert.strictEqual(B.kod, 'GK-1/BHAK');
  assert.deepStrictEqual(B.cik.map(c => [c.no, c.In, c.kablo, c.aciklama]), [['01', 10, '3x2.5 NYY', 'IŞIK LİNYESİ'], ['02', 10, '3x2.5 NYY', 'IŞIK LİNYESİ'], ['03', 40, '4x4 NYY', '3Ø PRİZ PANO BESLEME'], ['04', 40, '4x4 NYY', '3Ø PRİZ PANO BESLEME'], ['05', 10, '', 'YEDEK'], ['06', 40, '', 'YEDEK']]);
  assert.strictEqual(B.kurulu, 7200, 'çıkışların toplamı (örnekte 7400 W yazıyor: elektrik.md §15, soruldu)');
});

t('Armatür yerleri 4,80 m aralıkla, ilki 2,40 m\'de (E-BP 003\'te ölçülen aralık)', () => {
  const Y = E.armaturYerleri([[0, 0], [20, 0]], 4.8);
  assert.deepStrictEqual(Y.map(y => +y.p[0].toFixed(2)), [2.4, 7.2, 12, 16.8]);
  assert.strictEqual(E.linyeSay(9), 1); assert.strictEqual(E.linyeSay(10), 2);
});

t('Topraklama halkası: dış çizginin 0,50 m dışı; çubuklar köşelerde (örnekte 4 TE)', () => {
  const R = E.otele([[0, 0], [10, 0], [10, 6], [0, 6]], 0.5);
  assert.deepStrictEqual(R.map(p => p.map(v => +v.toFixed(3))), [[-0.5, -0.5], [10.5, -0.5], [10.5, 6.5], [-0.5, 6.5]]);
  const Rcw = E.otele([[0, 0], [0, 6], [10, 6], [10, 0]], 0.5); assert.ok(Math.abs(Math.abs(E.alan(Rcw)) - 11 * 7) < 1e-6, 'saat yönünde verilse de dışa öteler');
  const C4 = E.cubukYerleri(R, 4); assert.strictEqual(C4.length, 4);
  assert.ok(C4.some(p => p[0] === -0.5 && p[1] === -0.5) && C4.some(p => p[0] === 10.5 && p[1] === 6.5));
  assert.strictEqual(E.cubukYerleri(R, 6).length, 6);
});

t('Yapı türü: havuz tipi üniteler kendiliğinden havuz, bina yaşam alanı; elle seçim önce gelir', () => {
  assert.strictEqual(E.yapiTuru({ type: 'anaerobik' }), 'havuz');
  assert.strictEqual(E.yapiTuru({ type: 'unite' }), 'havuz');
  assert.strictEqual(E.yapiTuru({ type: 'mtmahal' }), 'yasam');
  assert.strictEqual(E.yapiTuru({ type: 'anaerobik', elYapi: 'yasam' }), 'yasam');
  assert.strictEqual(E.yapiTuru({ type: 'bina', elYapi: 'havuz' }), 'havuz');
});

/* ---- 50 bin anaerobik: motor listesi mekanik ekipman listesinden ---- */
const G = geo(Object.assign({ zt: 97.25, fb: 0.61, k2: 1 }, boyutla({ Qd: 50000 }).par));
const Y = ekipmanYer(G, { n: 2, D: 2.603, P: 5.5, rpm: 45, model: 'ksb_amaprop_2603', name: 'K' }, 95.00);
const mm = v => Math.round(v * 1000), un = '108';
const ents = Y.map((y, i) => {
  if (y.tur === 'penstok') return { id: 'k' + i, type: 'aile', fam: 'penstock_kanal', ad: `SK-${un}${y.etiket}`, par: { B: mm(y.B), H: mm(y.H), D: mm(y.D), hw: mm(y.hw), tahrik: y.tahrik, acilis: y.acilis, sasi: 'OTO' } };
  if (y.tur === 'mikser') return { id: 'm' + i, type: 'aile', fam: 'dalgic_mikser', ad: `Z-${un}/${y.etiket}`, par: { model: 'ksb_amaprop_2603', D: 2603, P: 5.5, rpm: 45, Hd: mm(y.Hd), hm: 1610 } };
  if (y.tur === 'vinc') return { id: 'v' + i, type: 'aile', fam: 'pergel_vinc', ad: `PV-${un}/${y.etiket}`, par: { model: 'jib', vh: 3129, L: mm(y.L), hh: 300, tahrik: i % 2 ? 'ELEKTRIKLI' : 'MANUEL', yuk: y.yuk, kap: 500, Pv: 0.75 } };
  return null;
}).filter(Boolean);
const ctx = { deger: e => e.par, mikserModel: () => null, vincModel: () => null, korkulukAd: k => k, aile: () => null, aktuator: q => AK.penstokAktuator({ B: q.B, H: q.H, hw: q.hw, G: q.G, mil: q.mil }) };
const K = ents.map(e => U.kalem(e, ctx)).filter(Boolean), MS = E.motorlar(K);

t('50 bin: 6 mikser 5,5 kW ve ekipman kodları aynen (Z-108/A …); manuel vinç ve el çarklı kapak motor sayılmaz', () => {
  const mk = MS.filter(m => m.tur === 'mikser');
  assert.strictEqual(mk.length, 6); assert.ok(mk.every(m => m.P === 5.5 && m.S === 2.5));
  assert.deepStrictEqual(mk.map(m => m.kod), ['Z-108/A', 'Z-108/B', 'Z-108/C', 'Z-108/D', 'Z-108/E', 'Z-108/F']);
  const vn = MS.filter(m => m.tur === 'vinc'), vK = K.filter(k => k.grup === 'vinc' && !k.gucYok);
  assert.strictEqual(vn.length, vK.length, 'yalnız elektrikli palangalar'); assert.ok(vn.every(m => m.P === 0.75));
  const kp = MS.filter(m => m.tur === 'kapak'), kA = K.filter(k => k.grup === 'kapak' && !k.gucYok);
  assert.strictEqual(kp.length, kA.length, 'yalnız aktüatörlü kapaklar'); assert.ok(kp.every(m => /^SK-108/.test(m.kod)));
  assert.ok(MS.indexOf(mk[0]) === 0, 'sıra: mikser, kapak, vinç');
});

t('50 bin: kablo listesi — mikser başına 3, kapak başına 2, vinç başına 1 kablo; liste satırlarında BOY "genel kablolamada"', () => {
  const KL = E.kabloListesi(MS), say = tur => MS.filter(m => m.tur === tur).length;
  assert.strictEqual(KL.length, say('mikser') * 3 + say('kapak') * 2 + say('vinc'));
  assert.ok(KL.some(k => k.kod === 'GK-2/Z-108/A') && KL.some(k => k.kod === 'KK-LK-1/Z-108/A'));
  const rows = E.listeSatirlari(KL); assert.ok(rows.every(r => r[7] === 'genel kablolamada'));
  const g = rows.find(r => r[0] === 'GK-2/Z-108/A'); assert.strictEqual(g[4], '5,5'); assert.strictEqual(g[5], '10,7'); assert.strictEqual(g[6], '1"');
  assert.strictEqual(E.LISTE_SUTUN.length, rows[0].length);
});

t('Rapor: her motorun In ve kesit hesabı, kablo boyu "genel kablolamada", BHAK; aydınlık hesabı yapılmadığı açık yazılır', () => {
  const KL = E.kabloListesi(MS), h = E.raporBolum('T-108', { motor: MS, kablo: KL, tava: [E.tavaSec(KL.map(k => k.cins))], bhak: E.bhak({ isik: [216], priz: [3000] }), arm: 6, armKod: 'U-LED36W' });
  for (const m of MS) assert.ok(h.includes(m.kod)); assert.ok(h.includes('10,74'), '5,5 kW In'); assert.ok(h.includes('16,77'), 'gerekli Iz = 1,25 · In / 0,80'); assert.ok(h.includes('genel kablolamada')); assert.ok(h.includes('GK-1/BHAK')); assert.ok(h.includes('aydınlık düzeyi hesabı yapılmamıştır'));
});

t('Hesapla ayrımı: mahal ya da havuza bağlı olmayan duvar bina sayılır; havuzun kendi perdesi, temel ve görünüm kopyası sayılmaz', () => {
  const H = new Set([1]); assert.strictEqual(E.binaVarMi([{ type: 'anaerobik', id: 1 }], H), false);
  assert.strictEqual(E.binaVarMi([{ type: 'mtmahal' }], H), true);
  assert.strictEqual(E.binaVarMi([{ type: 'perde', pts: [[0, 0], [5, 0]] }], H), true, 'mahali henüz bulunmamış bina');
  assert.strictEqual(E.binaVarMi([{ type: 'perde', bag: 1, pts: [[0, 0], [5, 0]] }, { type: 'perde', temel: true, pts: [[0, 0], [5, 0]] }, { type: 'perde', gv: 'x', pts: [[0, 0], [5, 0]] }], H), false);
});

console.log(`\n${n} test geçti.`);

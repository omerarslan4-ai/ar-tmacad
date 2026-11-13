/* Program katmanı → çizim katmanı eşlemesi ve AutoCAD çıktı dönüşümü (app/cizim-kural.js: esle, ciktiUygula).
   Beklenen değerler Çokal AAT örnek paftalarından (docs/cizim-kurallari/mimari.md): kesilen beton Beton 6 / 0,50; görünüş Ongor 9 / 0,15;
   gizli kenar Arkagor 8 / HIDDEN; ölçü ÖL 8 / 0,15; kot Kot 32 / 0,20; aks Aks 17 / ACAD_ISO04W100 / 0,13; tarama Tarama 136 / 0,09.
   Çalıştır: node test/cizim-esle.test.js */
'use strict';
const assert = require('assert'); require('../app/cizim-kural.js');
const { denetle } = require('../araclar/cizim-karsilastir.js');
const K = globalThis.C.cizimKural, M = K.MIMARI; let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const es = ad => K.esle(M, ad);

t('kesit, görünüş ve plan katmanları örnek katmanlara eşlenir', () => {
  assert.strictEqual(es('KESIT_PERDE'), 'Beton'); assert.strictEqual(es('KESIT'), 'Beton'); assert.strictEqual(es('KESIT_TEMEL_RADYE'), 'Beton'); assert.strictEqual(es('PLAN_0_00_KESIT_PERDE'), 'Beton');
  assert.strictEqual(es('GORUNEN_DOSEME'), 'Ongor'); assert.strictEqual(es('PLAN_0_00_GORUNEN_DOSEME'), 'Ongor'); assert.strictEqual(es('GORUNUS_ON_KESIT_PERDE'), 'Ongor'); // cephede kesilen yok
  assert.strictEqual(es('KESIT_PERDE_TARAMA'), 'Tarama'); assert.strictEqual(es('PLAN_0_00_TARAMA_PERDE'), 'Tarama'); assert.strictEqual(es('KESIT_GROBETON_TARAMA'), 'Grobeton'); assert.strictEqual(es('KESIT_GROBETON'), 'Grobeton');
  assert.strictEqual(es('KESIT_MERDIVEN'), 'Merdiven'); assert.strictEqual(es('GORUNEN_KORKULUK'), 'Korkuluk'); assert.strictEqual(es('KESIT_TRETUVAR'), 'Tretuvar'); assert.strictEqual(es('KESIT_SU'), 'Su'); assert.strictEqual(es('KESIT_SU_TUTUCU_BANT'), 'Sututucu');
});
t('ölçü, kot, aks, zemin, yazı ve kesit işareti', () => {
  for (const a of ['OLCU', 'KESIT_OLCU', 'DETAY_OLCU']) assert.strictEqual(es(a), 'ÖL');
  for (const a of ['KOT', 'PLAN_0_00_KOT']) assert.strictEqual(es(a), 'Kot');
  for (const a of ['AKS', 'AKS_BLOK', 'PLAN_0_00_AKS']) assert.strictEqual(es(a), 'Aks');
  assert.strictEqual(es('ZEMIN'), 'ZMN'); assert.strictEqual(es('YAZI'), 'Mim_Yazi25'); assert.strictEqual(es('MALZEME_ACILIM'), 'YZ'); assert.strictEqual(es('KESIT_ISARET'), 'Kesit_Cizgisi'); assert.strictEqual(es('MAHAL_ADI'), 'MAHAL İSİM');
});
t('mekanik nesneler mekanik katmanlara gider; statik ve kazı katmanlarına dokunulmaz; çizim katmanı kendisine eşlenir', () => {
  assert.strictEqual(es('KESIT_MEK_BORU_PE'), 'Mekanik'); assert.strictEqual(es('GORUNEN_POMPA'), 'Mekanik'); assert.strictEqual(es('KESIT_POZ'), 'Mek_Yazi'); assert.strictEqual(es('EKSEN'), 'Boru_Eksen');
  for (const a of ['STA_OLCU', 'STA_AKS', 'STA_POZ', 'STA_SU', 'STA_DONATI_KESIT', 'STA_TARAMA', 'STA_KALIP', 'MT_MAHAL', 'PENCERE', 'DETAY', 'PAFTA_INDEKS', 'KAZI_KESIT', 'KESIT_DUZLEMI', 'INS_SU_YALITIMI', 'BILINMEYEN']) assert.strictEqual(es(a), null, a); // gerçek statik (STA_), tesisat (MT_) ve pafta penceresi katmanları
  assert.strictEqual(es('Beton'), 'Beton'); assert.strictEqual(es('ÖL'), 'ÖL');
  for (const [, h] of M.esleme) if (h) assert.ok(K.tanim(M, h), 'eşleme hedefi tabloda yok: ' + h);
});
t('çıktı dönüşümü: ad çevrilir, özellik katmandan alınır, kesikli çizgi gizli kenar katmanına gider, eski katmanlar düşer', () => {
  const st = (layer, ek) => ({ st: Object.assign({ layer, color: 256, lt: 'BYLAYER', lw: -1 }, ek) });
  const kay = [st('KESIT_PERDE', { color: 8, lw: 50 }), st('GORUNEN_DOSEME', { lt: 'HIDDEN' }), st('KESIT_PERDE', { lt: 'DASHED' }), st('KESIT_OLCU', { color: 3 }), st('KOT'), st('AKS', { lt: 'DASHDOT', lw: 13 }), st('KESIT_PERDE_TARAMA'),
    st('PAFTA_ANTET', { color: 2 }), st('KESIT_MEK_BORU_PE', { color: 4 }), st('STA_DONATI', { color: 1 }), st('0')];
  const kat = { '0': { name: '0', color: 7, lt: 'CONTINUOUS', lw: 25 }, KESIT_PERDE: { name: 'KESIT_PERDE', color: 8, lt: 'CONTINUOUS', lw: 50 }, ESKI: { name: 'ESKI', color: 1, lt: 'CONTINUOUS', lw: 25 }, STA_DONATI: { name: 'STA_DONATI', color: 1, lt: 'CONTINUOUS', lw: 35 } };
  const r = K.ciktiUygula(M, kay, kat);
  assert.deepStrictEqual(kay.map(k => k.st.layer), ['Beton', 'Arkagor', 'Beton_Kesik', 'ÖL', 'Kot', 'Aks', 'Tarama', 'ANTET', 'Mekanik', 'STA_DONATI', '0']);
  assert.deepStrictEqual(kay[0].st, { layer: 'Beton', color: 256, lt: 'BYLAYER', lw: -1 });
  assert.deepStrictEqual(kay[5].st, { layer: 'Aks', color: 256, lt: 'BYLAYER', lw: -1 });
  assert.strictEqual(kay[7].st.color, 2);   // antet serbest: elle verilen renk kalır
  assert.strictEqual(kay[8].st.color, 4);   // mekanik: kuralı henüz yok, nesne özelliği kalır
  assert.deepStrictEqual(r, { eslenen: 9, eslenmeyen: ['STA_DONATI'] });
  assert.deepStrictEqual(Object.keys(kat).sort(), ['0', 'ANTET', 'Aks', 'Arkagor', 'Beton', 'Beton_Kesik', 'Kot', 'Mekanik', 'STA_DONATI', 'Tarama', 'ÖL'].sort());
  assert.deepStrictEqual([kat.Beton.color, kat.Beton.lt, kat.Beton.lw], [6, 'CONTINUOUS', 50]);
  assert.deepStrictEqual([kat.Arkagor.color, kat.Arkagor.lt, kat.Arkagor.lw], [8, 'HIDDEN', 15]);
  assert.deepStrictEqual([kat.Aks.color, kat.Aks.lt, kat.Aks.lw], [17, 'ACAD_ISO04W100', 13]);
  assert.deepStrictEqual([kat['ÖL'].color, kat['ÖL'].lw, kat.Kot.color, kat.Kot.lw, kat.Tarama.color, kat.Tarama.lw], [8, 15, 32, 20, 136, 9]);
});
t('dönüştürülen çıktı denetim aracından hatasız geçer', () => {
  const kul = (tur) => ({ tur, renk: { katmandan: 1 }, cizgiTipi: { katmandan: 1 }, kalinlik: { katmandan: 1 }, toplam: 1 });
  const kay = ['KESIT_PERDE', 'GORUNEN_DOSEME', 'KESIT_OLCU', 'KOT', 'AKS', 'ZEMIN', 'KESIT_PERDE_TARAMA', 'KESIT_MERDIVEN', 'GORUNEN_KORKULUK'].map(layer => ({ st: { layer, color: 3, lt: 'CONTINUOUS', lw: 18 } })), kat = { '0': { name: '0', color: 7, lt: 'CONTINUOUS', lw: 25 } };
  K.ciktiUygula(M, kay, kat);
  const P = { katmanlar: {}, yaziStilleri: {}, olcuStilleri: {}, kullanim: {}, yazilar: {}, olculer: {}, taramalar: { Tarama: { DASH: 1 } }, bloklar: {}, uzay: { model: kay.length, kagit: 0, blokIci: 0 } };
  for (const L of Object.values(kat)) P.katmanlar[L.name] = { renk: L.color, cizgiTipi: L.lt, kalinlik: L.lw };
  for (const k of kay) P.kullanim[k.st.layer] = kul({ LINE: 1 });
  const D = denetle(P, M); assert.deepStrictEqual(D.bulgular.filter(b => b.duzey === 'HATA').map(b => b.konu + ':' + b.yer), []);
});
console.log(`\n${n} test geçti.`);

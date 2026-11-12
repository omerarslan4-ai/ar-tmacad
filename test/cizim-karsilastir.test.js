/* Çizim kuralı denetimi (araclar/cizim-karsilastir.js + app/cizim-kural.js).
   Karşılaştırma değerleri Çokal AAT örnek paftalarından (docs/cizim-kurallari/mimari.md): Beton 6 / Continuous / 0,50; Arkagor 8 / HIDDEN / 0,15;
   ölçü ÖL katmanında eğik tikle; kot CK_TR1 bloğuyla; 1/50'de 10 birim yazı = 2 mm.
   Çalıştır: node test/cizim-karsilastir.test.js */
'use strict';
const assert = require('assert'), { denetle, rapor } = require('../araclar/cizim-karsilastir.js');
const K = globalThis.C.cizimKural.MIMARI; let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const kul = (tur, ek) => Object.assign({ tur, renk: { katmandan: 1 }, cizgiTipi: { katmandan: 1 }, kalinlik: { katmandan: 1 }, toplam: 1 }, ek || {});
const bos = () => ({ katmanlar: {}, yaziStilleri: {}, olcuStilleri: {}, kullanim: {}, yazilar: {}, olculer: {}, taramalar: {}, bloklar: {}, uzay: { model: 0, kagit: 0, blokIci: 0 } });
const dogru = () => { const P = bos();
  P.katmanlar = { Beton: { renk: 6, cizgiTipi: 'CONTINUOUS', kalinlik: 50 }, Arkagor: { renk: 8, cizgiTipi: 'HIDDEN', kalinlik: 15 }, 'ÖL': { renk: 8, cizgiTipi: 'Continuous', kalinlik: 15 }, Mim_Yazi25: { renk: 7, cizgiTipi: 'Continuous', kalinlik: 25 }, Kot: { renk: 32, cizgiTipi: 'Continuous', kalinlik: 20 }, Tarama: { renk: 136, cizgiTipi: 'Continuous', kalinlik: 9 }, Mekanik: { renk: 94, cizgiTipi: 'Continuous', kalinlik: 25 }, '0': { renk: 7, cizgiTipi: 'Continuous', kalinlik: -3 } };
  P.kullanim = { Beton: kul({ LINE: 1 }), Arkagor: kul({ LINE: 1 }), 'ÖL': kul({ DIMENSION: 1 }), Mim_Yazi25: kul({ TEXT: 1 }), Kot: kul({ INSERT: 1 }, { renk: { '32': 1 } }), Tarama: kul({ HATCH: 1 }), Mekanik: kul({ LINE: 1 }, { renk: { '1': 1 } }), '0': kul({ VIEWPORT: 1 }) };
  P.yaziStilleri = { YZ: { font: 'turkce.shx', genislik: 0.7 }, OL: { font: 'TURKCE.SHX', genislik: 0.75 } };
  P.yazilar = { Mim_Yazi25: { 'YZ | 10': 3, 'YZ | 12.5': 1, 'YZ | 6': 2 } };
  P.olcuStilleri = { '50': { DIMTAD: 1, DIMTIH: 0, DIMTOH: 0, DIMDEC: 2, yaziStili: 'OL', ok: '_ArchTick' } };
  P.olculer = { '50': { adet: 4, katman: { 'ÖL': 4 }, tur: {}, uzaklik: {}, elleYazi: 0 } };
  P.bloklar = { CK_TR1: { adet: 2, katman: { Kot: 2 } } }; P.taramalar = { Tarama: { DASH: 1 } }; P.uzay.model = 8; return P; };
const konular = R => R.bulgular.map(b => b.duzey + ':' + b.konu + ':' + b.yer);

t('örnek paftalara uyan çizim UYGUN çıkar; mekanik katmanlar ve "0" katmanı denetime girmez', () => {
  const R = denetle(dogru(), K); assert.deepStrictEqual(konular(R), []); assert.strictEqual(R.sonuc, 'UYGUN');
  assert.deepStrictEqual(R.atlanan.baskaDisiplin, ['Mekanik']); assert.deepStrictEqual(R.atlanan.sistem, ['0']);
  assert.ok(/SONUÇ: UYGUN\b/.test(rapor(R, K, 'a.dxf')));
});
t('katman adı: programın kendi adı, eski ad ve kodlu aile hata verir', () => {
  const P = dogru(); P.kullanim.KESIT_OLCU = kul({ DIMENSION: 1 }); P.kullanim.KOT = kul({ INSERT: 1 }); P.kullanim.YAZI_TEXT_20 = kul({ TEXT: 1 });
  const R = denetle(P, K), m = Object.fromEntries(R.bulgular.map(b => [b.yer, b.mesaj]));
  assert.ok(/kural tablosunda olmayan/.test(m.KESIT_OLCU)); assert.ok(/"KOT" yerine "Kot"/.test(m.KOT)); assert.ok(/kodlu katman ailesi/.test(m.YAZI_TEXT_20)); assert.strictEqual(R.sonuc, 'UYGUN DEĞİL');
});
t('katman özellikleri: renk, çizgi tipi ve kalınlık örnekle aynı olmalı', () => {
  const P = dogru(); P.katmanlar.Beton = { renk: 7, cizgiTipi: 'Continuous', kalinlik: 35 }; P.katmanlar.Arkagor.cizgiTipi = 'Continuous';
  assert.deepStrictEqual(konular(denetle(P, K)), ['HATA:katman rengi:Beton', 'HATA:çizgi kalınlığı:Beton', 'HATA:çizgi tipi:Arkagor']);
});
t('katmandan: elle verilen renk / çizgi tipi hata; katmanla aynı değer elle yazılmışsa hata değil', () => {
  const P = dogru(); P.kullanim.Beton.renk = { katmandan: 5, '1': 3, '6': 2 }; P.kullanim.Beton.cizgiTipi = { katmandan: 8, DASHED: 2, Continuous: 1 };
  const R = denetle(P, K); assert.deepStrictEqual(konular(R), ['HATA:katmandan alınmıyor:Beton', 'HATA:katmandan alınmıyor:Beton']);
  assert.ok(/3 nesnede renk/.test(R.bulgular[0].mesaj) && /2 nesnede çizgi tipi/.test(R.bulgular[1].mesaj));
});
t('yazı: stil ve kâğıt üstü yükseklik (model: ölçeklerden biri tutmalı; kâğıt: mm)', () => {
  const P = dogru(); P.yazilar.Mim_Yazi25 = { 'Standard | 10': 2, 'YZ | 8': 4 }; P.yaziStilleri.YZ.genislik = 0.75;
  assert.deepStrictEqual(konular(denetle(P, K)), ['HATA:yazı stili:YZ', 'HATA:yazı stili:Mim_Yazi25', 'HATA:yazı yüksekliği:Mim_Yazi25']);
  const Q = dogru(); Q.yazilar.Mim_Yazi25 = { 'YZ | 2': 5, 'YZ | 2.5': 1 }; assert.deepStrictEqual(konular(denetle(Q, K, { kagit: true })), []);
  Q.yazilar.Mim_Yazi25 = { 'YZ | 10': 1 }; assert.deepStrictEqual(konular(denetle(Q, K, { kagit: true })), ['HATA:yazı yüksekliği:Mim_Yazi25']); // kâğıtta 10 mm
  const Z = dogru(); Z.yazilar.Mim_Yazi25 = { 'YZ | 6': 1 }; assert.strictEqual(denetle(Z, K, { olcek: 50 }).hata, 1); assert.strictEqual(denetle(Z, K, { olcek: 20 }).hata, 0); // 6 birim: 1/20'de 3 mm
});
t('ölçü: katman, eğik tik, yazı üstte ve hizalı, yazı stili, ondalık', () => {
  const P = dogru(); P.olculer['50'].katman = { 'ÖL': 2, Beton: 2 }; P.olcuStilleri['50'] = { DIMTAD: 0, DIMTIH: 1, DIMTOH: 1, DIMDEC: 0, yaziStili: 'Standard', ok: null };
  const k = konular(denetle(P, K)); assert.deepStrictEqual(k, ['HATA:ölçü katmanı:50', 'HATA:ölçü ucu:50', 'HATA:ölçü yazısı:50', 'HATA:ölçü yazısı:50', 'HATA:ölçü yazısı:50', 'HATA:ölçü ondalığı:50', 'HATA:ölçü yazısı:50']);
});
t('kot bloğu ve tarama deseni', () => {
  const P = dogru(); P.bloklar.KOT101 = { adet: 3, katman: { Kot: 3 } }; P.bloklar.CK_TR1.katman = { Kot: 1, Beton: 1 }; P.taramalar.Tarama = { DASH: 5, SOLID: 1, 'AR-SAND': 2 }; P.taramalar.Beton = { SOLID: 1 };
  assert.deepStrictEqual(konular(denetle(P, K)), ['HATA:kot işareti:KOT101', 'HATA:kot işareti:CK_TR1', 'HATA:tarama deseni:Tarama', 'UYARI:tarama:Beton']);
});
console.log(`\n${n} test geçti.`);

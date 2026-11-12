/* Çizim kuralı okuyucu (araclar/cizim-oku.js): DXF'ten katman, yazı stili, ölçü stili ve kullanım profili.
   Karşılaştırma değerleri Çokal AAT örnek paftalarından (docs/cizim-kurallari/mimari.md): Beton 6 / 0,50; Arkagor 8 HIDDEN 0,15; ölçü stili "50", eğik tik, OL yazısı.
   Çalıştır: node test/cizim-oku.test.js */
'use strict';
const assert = require('assert'), { oku, ozet } = require('../araclar/cizim-oku.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const dxf = satirlar => satirlar.map(s => String(s)).join('\r\n') + '\r\n';
const ORNEK = dxf([
  0, 'SECTION', 2, 'HEADER', 9, '$INSUNITS', 70, 5, 9, '$DIMSTYLE', 2, '50', 0, 'ENDSEC',
  0, 'SECTION', 2, 'TABLES',
  0, 'TABLE', 2, 'LAYER',
  0, 'LAYER', 5, '10', 2, 'Beton', 70, 0, 62, 6, 6, 'Continuous', 370, 50,
  0, 'LAYER', 5, '11', 2, 'Arkagor', 70, 0, 62, 8, 6, 'HIDDEN', 370, 15,
  0, 'LAYER', 5, '12', 2, 'ÖL', 70, 0, 62, 8, 6, 'Continuous', 370, 15,
  0, 'LAYER', 5, '13', 2, 'Kapali', 70, 1, 62, -3, 6, 'Continuous',
  0, 'ENDTAB',
  0, 'TABLE', 2, 'STYLE',
  0, 'STYLE', 5, '20', 2, 'YZ', 70, 0, 40, 10, 41, 0.7, 50, 0, 3, 'turkce.shx', 4, '',
  0, 'STYLE', 5, '21', 2, 'OL', 70, 0, 40, 10, 41, 0.65, 3, 'turkce.shx', 4, '',
  0, 'ENDTAB',
  0, 'TABLE', 2, 'BLOCK_RECORD', 0, 'BLOCK_RECORD', 5, '30', 2, '_ArchTick', 0, 'ENDTAB',
  0, 'TABLE', 2, 'DIMSTYLE',
  0, 'DIMSTYLE', 105, '40', 2, '50', 70, 0, 40, 60, 41, 0.1, 44, 0.34, 140, 10, 77, 1, 73, 0, 74, 0, 271, 2, 340, '21', 342, '30',
  0, 'ENDTAB', 0, 'ENDSEC',
  0, 'SECTION', 2, 'BLOCKS',
  0, 'BLOCK', 8, '0', 2, 'KOT101', 70, 0, 10, 0, 20, 0, 0, 'LINE', 8, 'Beton', 10, 0, 20, 0, 11, 1, 21, 1, 0, 'ENDBLK', 8, '0',
  0, 'BLOCK', 8, '0', 2, '*Paper_Space0', 70, 0, 10, 0, 20, 0, 0, 'TEXT', 8, 'Beton', 7, 'YZ', 40, 2.5, 1, 'A', 0, 'ENDBLK', 8, '0',
  0, 'ENDSEC',
  0, 'SECTION', 2, 'ENTITIES',
  0, 'LINE', 8, 'Beton', 10, 0, 20, 0, 11, 100, 21, 0,
  0, 'LINE', 8, 'Beton', 62, 1, 10, 0, 20, 0, 11, 100, 21, 0,
  0, 'LWPOLYLINE', 8, 'Arkagor', 6, 'DASHED', 90, 2, 10, 0, 20, 0, 10, 5, 20, 5,
  0, 'TEXT', 8, 'Beton', 7, 'YZ', 10, 0, 20, 0, 40, 10, 1, 'P1',
  0, 'TEXT', 8, 'Beton', 7, 'YZ', 10, 0, 20, 0, 40, 12.5, 1, 'DU01',
  0, 'DIMENSION', 8, 'ÖL', 3, '50', 70, 33, 10, 100, 20, 30, 13, 0, 23, 0, 14, 100, 24, 0, 1, '',
  0, 'DIMENSION', 8, 'ÖL', 3, '50', 70, 33, 10, 100, 20, 30, 13, 0, 23, 0, 14, 100, 24, 0, 1, '250',
  0, 'HATCH', 8, 'Beton', 2, 'ANSI31', 70, 0,
  0, 'INSERT', 8, 'ÖL', 2, 'KOT101', 10, 5, 20, 5,
  0, 'TEXT', 8, 'Beton', 67, 1, 7, 'YZ', 40, 3, 1, 'kagit',
  0, 'ENDSEC', 0, 'EOF']);

t('katman tablosu: renk, çizgi tipi, kalınlık; kapalı ve dondurulmuş katman', () => {
  const P = oku(ORNEK);
  assert.deepStrictEqual([P.katmanlar.Beton.renk, P.katmanlar.Beton.cizgiTipi, P.katmanlar.Beton.kalinlik], [6, 'Continuous', 50]);
  assert.deepStrictEqual([P.katmanlar.Arkagor.renk, P.katmanlar.Arkagor.cizgiTipi, P.katmanlar.Arkagor.kalinlik], [8, 'HIDDEN', 15]);
  assert.ok(P.katmanlar.Kapali.kapali && P.katmanlar.Kapali.donuk && P.katmanlar.Kapali.renk === 3); assert.strictEqual(P.katmanlar.Kapali.kalinlik, -3);
});
t('yazı ve ölçü stilleri: font, genişlik; ölçü stilinin yazı stili ve ucu ada çevrilir', () => {
  const P = oku(ORNEK); assert.deepStrictEqual([P.yaziStilleri.YZ.font, P.yaziStilleri.YZ.genislik, P.yaziStilleri.YZ.yukseklik], ['turkce.shx', 0.7, 10]);
  const d = P.olcuStilleri['50']; assert.strictEqual(d.yaziStili, 'OL'); assert.strictEqual(d.ok, '_ArchTick'); assert.deepStrictEqual([d.DIMSCALE, d.DIMTXT, d.DIMTAD, d.DIMDEC, d.DIMEXE], [60, 10, 1, 2, 0.34]);
  assert.strictEqual(P.baslik.DIMSTYLE, '50');
});
t('kullanım: katman katman tür, elle verilen renk ve çizgi tipi; blok içi sayılmaz, kâğıt uzayı ayrı sayılır', () => {
  const P = oku(ORNEK), b = P.kullanim.Beton;
  assert.strictEqual(b.tur.LINE, 2); assert.strictEqual(b.renk['1'], 1); assert.strictEqual(b.renk.katmandan, b.toplam - 1); assert.strictEqual(P.kullanim.Arkagor.cizgiTipi.DASHED, 1);
  assert.deepStrictEqual(P.uzay, { model: 9, kagit: 2, blokIci: 1 });
});
t('yazı yükseklikleri, ölçüler (stil, katman, elle yazı, ölçü çizgisi uzaklığı), tarama ve bloklar', () => {
  const P = oku(ORNEK);
  assert.strictEqual(P.yazilar.Beton['YZ | 10'], 1); assert.strictEqual(P.yazilar.Beton['YZ | 12.5'], 1);
  const o = P.olculer['50']; assert.strictEqual(o.adet, 2); assert.strictEqual(o.katman['ÖL'], 2); assert.strictEqual(o.elleYazi, 1); assert.strictEqual(o.uzaklik['30'], 2);
  assert.strictEqual(P.taramalar.Beton.ANSI31, 1); assert.strictEqual(P.bloklar.KOT101.adet, 1);
  assert.ok(/Beton/.test(ozet(P)) && /_ArchTick/.test(ozet(P)));
});
console.log(`\n${n} test geçti.`);

/* Kodlu malzeme açılımı (app/acilim-kod.js) — Çokal AAT paftalarındaki biçim: "DÖ04 / - 8 cm KİLİT PARKE TAŞI".
   Çalıştır: node test/acilim-kod.test.js */
'use strict';
const assert = require('assert');
const { satirBicim, kaydir, kodVer } = require('../app/acilim-kod.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

t('satır biçimi: kalınlık başa, ad büyük harf (Türkçe), birim küçük', () => {
  assert.strictEqual(satirBicim('Kilit parke taşı, 8 cm'), '8 cm KİLİT PARKE TAŞI');
  assert.strictEqual(satirBicim('Kum serilmesi, 10 cm'), '10 cm KUM SERİLMESİ');
  assert.strictEqual(satirBicim('C30/37 hazır beton'), 'C30/37 HAZIR BETON');
  assert.strictEqual(satirBicim('Grobeton, 7,5 cm'), '7,5 cm GROBETON');
  assert.strictEqual(satirBicim('ısı yalıtımı 5 cm xps'), 'ISI YALITIMI 5 cm XPS');
  assert.strictEqual(satirBicim('Katran badana (3 kat)'), 'KATRAN BADANA (3 kat)');
  assert.strictEqual(satirBicim('C16/20 grobeton (10 cm)'), 'C16/20 GROBETON (10 cm)');
});

t('kod: aynı katmanlaşma aynı kodu alır; döşeme DÖ, duvar DU; sıra kayıtla korunur', () => {
  const K = {};
  assert.strictEqual(kodVer(K, 'doseme', ['C30/37 hazır beton']), 'DÖ01');
  assert.strictEqual(kodVer(K, 'doseme', ['C16/20 grobeton', 'C30/37 hazır beton']), 'DÖ02');
  assert.strictEqual(kodVer(K, 'duvar', ['C30/37 hazır beton', 'Katran badana (3 kat)']), 'DU01');
  assert.strictEqual(kodVer(K, 'doseme', ['C30/37 hazır beton']), 'DÖ01');
  assert.strictEqual(kodVer(K, 'duvar', ['C30/37 hazır beton']), 'DU02');
  assert.deepStrictEqual(Object.keys(K), ['DÖ', 'DU']); assert.strictEqual(K['DÖ'].length, 2);
});

t('uzun satır kelime sınırından bölünür', () => {
  assert.deepStrictEqual(kaydir('DOLGULAR, KAZIDAN ELDE EDİLEN UYGUN NİTELİKLİ MALZEME İLE YAPILACAKTIR', 30), ['DOLGULAR, KAZIDAN ELDE EDİLEN', 'UYGUN NİTELİKLİ MALZEME İLE', 'YAPILACAKTIR']);
  assert.deepStrictEqual(kaydir('C30/37 HAZIR BETON', 30), ['C30/37 HAZIR BETON']);
});
console.log(n + ' test geçti');

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
/* denetim 14.11.2026, Konya B-B: pencereler tuğla duvarı üç parçaya bölüyor (z 0,37 / 3,19 / 4,73), sağ duvarda iki parça (s 9,5 / 9,7) — her duvarda tek DU kodu */
t('aynı duvara tek kod: parçalı tuğla duvar (Konya B-B)', () => {
  const { tekDuvarKodu } = require('../app/acilim-kod.js'), T = ['Tuğla duvar, 20 cm'];
  const L = [{ id: 1, tur: 'duvar', lines: T, src: { s: 1.8, z: 4.73 } }, { id: 2, tur: 'duvar', lines: T, src: { s: 1.8, z: 3.19 } }, { id: 3, tur: 'duvar', lines: T, src: { s: 1.8, z: 0.37 } },
    { id: 4, tur: 'duvar', lines: ['Betonarme perde (C30/37), 50 cm'], src: { s: 1.75, z: -3.51 } }, { id: 5, tur: 'doseme', lines: T, src: { s: 1.8, z: 0 } },
    { id: 6, tur: 'duvar', lines: T, src: { s: 9.5, z: 4.73 } }, { id: 7, tur: 'duvar', lines: T, src: { s: 9.6, z: 3.19 } }, { id: 8, tur: 'duvar', lines: T, src: { s: 9.6, z: 0.37 } }, { id: 9, tur: 'duvar', lines: T, src: { s: 9.7, z: 4.73 } }];
  assert.deepStrictEqual([...tekDuvarKodu(L)].sort((a, b) => a - b), [1, 3, 6, 8, 9]); // her duvarda ortadaki (z 3,19) kalır; perde ve döşeme ayrı
});
console.log(n + ' test geçti');

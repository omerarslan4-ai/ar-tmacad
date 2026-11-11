/* Kum ve yağ tutucu — Çokal AAT T-103 (1-Çokal_AAT_Kaba-İnce-Giriş-Kum Yağ Tutucu_R3.dwg) plan ve G-G enine kesitiyle karşılaştırma.
   Çizimden okunan (cm): plan dış 1600 × 430; çıkış kanalı 150, göz 1140, dağıtma kanalı 150, duvarlar 40; gözler arası duvar 30.
   G-G (göz iç 160): yağ bölmesi 40 · ayırma kirişi 20 (97,20 – 97,75) · kum bölmesi 100; dolgu: yağ duvarında 96,79 → 96,19 (60 cm'de),
   kum oluğu üstü 70 / tabanı 50 cm, 95,69 – 96,19; kum duvarında 96,49; taban plağı üstü 95,05, altı 94,55; su 97,45; duvar üstü 99,15;
   orta duvar üstü 98,10 + 20 cm yürüme döşemesi (en 100) = 98,30; üst kum oluğu dış eni 60, tabanı 98,60, altı 98,40.
   Çalıştır: node test/kumtutucu.test.js */
'use strict';
const assert = require('assert');
const { geo, ekipmanYer, su, DEF } = require('../app/kumtutucu.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yakin = (a, b, msg, tol) => assert.ok(Math.abs(a - b) < (tol || 0.006), `${msg}: ${a} ≠ ${b}`);
const G = geo({});

t('Çokal T-103 planı: dış ölçü ve boyuna dizilim', () => {
  yakin(G.boy, 16.00, 'boy'); yakin(G.en, 4.30, 'en'); yakin(G.xD1 - G.xD0, 1.50, 'dağıtma kanalı'); yakin(G.xg1 - G.xg0, 11.40, 'göz boyu'); yakin(G.xC1 - G.xC0, 1.50, 'çıkış kanalı');
  assert.strictEqual(G.goz.length, 2); yakin(G.gz, 1.60, 'göz iç eni'); yakin(G.goz[1].y0 - G.goz[0].y1, 0.30, 'gözler arası duvar');
});

t('Çokal G-G: bölmeler aynalı, yağ bölmesi dış duvar tarafında', () => {
  const [a, b] = G.goz; assert.deepStrictEqual(a.yag.map(v => +v.toFixed(2)), [0.40, 0.80]); assert.deepStrictEqual(a.ayir.map(v => +v.toFixed(2)), [0.80, 1.00]); assert.deepStrictEqual(a.kum.map(v => +v.toFixed(2)), [1.00, 2.00]);
  assert.deepStrictEqual(b.yag.map(v => +v.toFixed(2)), [3.50, 3.90]); assert.deepStrictEqual(b.kum.map(v => +v.toFixed(2)), [2.30, 3.30]);
});

t('Çokal G-G: dolgu kesiti (kum oluğu ve 45° eğimler) ve kotlar', () => {
  const p = G.goz[0].prof.map(q => [+q[0].toFixed(2), +q[1].toFixed(2)]);
  assert.deepStrictEqual(p, [[0.40, 95.05], [2.00, 95.05], [2.00, 96.49], [1.70, 96.19], [1.60, 95.69], [1.10, 95.69], [1.00, 96.19], [0.40, 96.79]]);
  yakin(G.zt, 96.19, 'kum oluğu üstü'); yakin(G.zo, 95.69, 'kum oluğu dibi'); yakin(G.zr1, 95.05, 'taban plağı üstü'); yakin(G.zr0, 94.55, 'taban plağı altı');
  yakin(G.goz[0].yo, 1.35, 'kum oluğu ekseni'); yakin(G.goz[1].yo, 4.30 - 1.35, 'aynalı oluk ekseni');
});

t('Çokal G-G: orta yürüme yolu, ayırma kirişi, üst kum oluğu', () => {
  yakin(G.zmw, 98.10, 'orta duvar üstü'); yakin(G.zy, 98.30, 'yürüme yolu üstü'); const y = G.yol[0]; yakin(y.pts[2][1] - y.pts[0][1], 1.00, 'yürüme yolu eni'); yakin(y.ym, 2.15, 'yol ekseni');
  const k = G.kutu.find(x => x.k === 'kiris'); yakin(k.z0, 97.20, 'kiriş altı'); yakin(k.z1, 97.75, 'kiriş üstü');
  yakin(G.ustOluk.w, 0.60, 'üst oluk dış eni'); yakin(G.ustOluk.zf, 98.60, 'üst oluk tabanı'); yakin(G.ustOluk.zb, 98.40, 'üst oluk altı');
});

t('kapak, savak ve ekipman: göz başına bir kapak ve savak; köprü dış duvar eksenleri arasında', () => {
  assert.strictEqual(G.kapak.length, 2); assert.strictEqual(G.savak.length, 2); yakin(G.kapak[0].y, 1.50, 'kapak kum bölmesi ekseninde'); yakin(G.kapak[0].z0, 97.15, 'kapak eşiği');
  const E = ekipmanYer(G), kp = E.find(x => x.tur === 'kopru'); yakin(kp.Ls, 3.90, 'ray açıklığı'); yakin(kp.Hp, 99.15 - 95.69, 'emme derinliği'); yakin(kp.ap, 1.60, 'pompa aralığı = oluk eksenleri arası');
  assert.strictEqual(E.filter(x => x.tur === 'penstok').length, 2); assert.strictEqual(E.filter(x => x.tur === 'konteyner').length, 3); assert.strictEqual(E.filter(x => x.tur === 'korkuluk').length, 2);
  assert.strictEqual(su(G).length, 4);
});

t('üç gözlü: en ve yürüme yolları; eski kayıtlarda eksik parametre varsayılandan', () => {
  const H = geo({ N: 3 }); yakin(H.en, 3 * 1.60 + 2 * 0.30 + 0.80, 'en'); assert.strictEqual(H.yol.length, 2); assert.strictEqual(H.goz[2].alt, true);
  const J = geo({ N: 2, b: 1.2 }); yakin(J.q.ho, DEF.ho, 'varsayılan oluk derinliği'); yakin(J.ek, 0.50, 'kum tarafı eğim yükselmesi');
});
console.log(n + ' test geçti');

/* Çelik profil kataloğu (app/celik-profil.js): kesit dış hattından hesaplanan değerler yayımlanmış tablolarla karşılaştırılır
   (ArcelorMittal / EN 10365, DIN 1025-1, DIN 1026-1/-2, EN 10056-1, EN 10219, EN 10055 tablo değerleri).
   Çalıştır: node test/celik-profil.test.js */
'use strict';
const path = require('path'), assert = require('assert');
globalThis.C = {};
require(path.join(__dirname, '..', 'app', 'celik-profil.js'));
const K = C.celik;
let n = 0; const ok = (k, m) => { assert.ok(k, m); n++; };
const yuzde = (a, b, t, m) => ok(Math.abs(a / b - 1) <= t / 100, `${m}: ${a.toFixed(3)} ≠ ${b} (±%${t})`);

/* [ad, A cm², G kg/m, Ix cm⁴ (0 = karşılaştırma yok), tolerans %] */
const TABLO = [
  ['IPE200', 28.5, 22.4, 1943, 1.5], ['IPE400', 84.5, 66.3, 23130, 1.5], ['HEA200', 53.8, 42.3, 3692, 1.5], ['HEA400', 159, 125, 45070, 1.5],
  ['HEB300', 149.1, 117, 25170, 1.5], ['HEB100', 26.0, 20.4, 450, 1.5], ['HEM200', 131.3, 103, 10640, 1.5],
  ['IPN200', 33.4, 26.2, 2140, 1.5], ['IPN400', 118, 92.4, 29210, 1.5], ['UPN200', 32.2, 25.3, 1910, 1.5], ['UPN100', 13.5, 10.6, 206, 1.5],
  ['UPN400', 91.5, 71.8, 20350, 1.5], ['UPE200', 29.0, 22.8, 1910, 1.5],
  ['L100x100x10', 19.2, 15.0, 177, 1.5], ['L50x50x5', 4.80, 3.77, 0, 1.5], ['L100x50x8', 11.5, 8.99, 0, 1.5],
  ['KUTU100x100x5', 18.36, 14.4, 271, 1.5], ['BORU114.3x6.3', 21.4, 16.8, 0, 1.5], ['T50', 5.66, 4.44, 0, 3], ['T100', 20.9, 16.4, 0, 3],
];
for (const [ad, A, G, I, t] of TABLO) { const p = K.profil(ad); ok(p, ad + ' katalogda'); yuzde(p.A, A, t, ad + ' A'); yuzde(p.G, G, t, ad + ' kg/m'); if (I) yuzde(p.Ix, I, t, ad + ' Ix'); }

/* simetrik I'da ağırlık merkezi ortada, Wx = Ix / (h/2) */
{ const p = K.profil('HEA200'); ok(Math.abs(p.ex) < 0.01 && Math.abs(p.ey) < 0.01, 'HEA ağırlık merkezi ortada'); yuzde(p.Wx, p.Ix / (p.h / 20), 0.01, 'HEA200 Wx'); yuzde(p.Wx, 389, 1.5, 'HEA200 Wx tablo'); }
/* lama: tam dikdörtgen */
{ const p = K.profil('LAMA50x5'); yuzde(p.A, 2.5, 1e-6, 'lama A'); yuzde(p.Iy, 5 * 50 ** 3 / 12 / 1e4, 1e-6, 'lama Iy'); }
/* köşebent: eşit kenarlıda Ix = Iy, asal eksen Iv < Ix */
{ const p = K.profil('L100x100x10'); yuzde(p.Ix, p.Iy, 0.01, 'L Ix = Iy'); ok(p.Iv < p.Ix && p.Iu > p.Ix, 'L asal eksenler'); yuzde(p.Iv, 72.9, 2, 'L100 Iv'); }

/* ad çözme */
for (const [s, b] of [['HE200A', 'HEA200'], ['HEB 300', 'HEB300'], ['NPI200', 'IPN200'], ['U100', 'UPN100'], ['L50x5', 'L50x50x5'], ['Ø114,3×6,3', 'BORU114.3x6.3'], ['Kutu 100×100×5', 'KUTU100x100x5'], ['-50x5', 'LAMA50x5'], ['xyz', null]]) ok(K.adCoz(s) === b, `adCoz(${s}) = ${K.adCoz(s)}`);
/* her katalog kaydının kesiti ve değeri hesaplanır */
let say = 0; for (const a of Object.values(K.AILE)) for (const p of a.liste) { const q = K.profil(p.ad); ok(q && q.A > 0 && q.G > 0 && q.Ix > 0 && q.Iy > 0, p.ad + ' değerleri'); say++; }
ok(say > 250, 'katalog boyutu ' + say);

/* metraj: aynı profil toplanır, levha kg */
{ const m = K.metraj([{ prof: 'HEA200', L: 4 }, { prof: 'HE200A', L: 3, adet: 2 }, { prof: 'IPE200', L: 6 }], [{ ad: 'Taban levhası', a: 0.4, b: 0.3, t: 0.02, adet: 2 }], [{ ad: 'M20 ankraj', adet: 8, kg: 1.5 }]);
  ok(m.satirlar.length === 2, 'metraj iki profil'); const h = m.satirlar.find(r => r.prof === 'HEA200'); ok(h.adet === 3 && Math.abs(h.boy - 10) < 1e-9, 'HEA200 adet / boy');
  yuzde(h.kg, 10 * K.profil('HEA200').G, 1e-6, 'HEA200 kg'); yuzde(m.levha[0].kg, 0.4 * 0.3 * 0.02 * 7850 * 2, 1e-6, 'levha kg');
  yuzde(m.toplam, h.kg + 6 * K.profil('IPE200').G + m.levha[0].kg + 12, 1e-6, 'metraj toplam'); ok(m.satirlar[0].prof === 'HEA200', 'sıra: HEA önce'); }

/* birleşim önerileri makul */
{ const t = K.tabanOneri('HEA200'); ok(t.a >= 190 + 100 && t.b >= 200 + 100 && t.n === 4 && t.d === 20, 'taban levhası önerisi'); const a = K.alinOneri('IPE300'); ok(a.a > 300 && a.b >= 150 && a.d === 20, 'alın levhası önerisi'); }
/* statik çubuk (SI) */
{ const c = K.cubuk('IPE200'); yuzde(c.A, 28.5e-4, 1.5, 'çubuk A m²'); yuzde(c.Ix, 1943e-8, 1.5, 'çubuk Ix m⁴'); ok(c.E === 210e9, 'E'); }

console.log(`celik-profil: ${n} kontrol geçti`);

/* Yapı elemanlarında çakışma ve net hacim (app/yapi-cakisma.js).
   1) Elle hesaplanabilen küçük durumlar: kolon döşemeyi deler, kiriş kolon yüzünde biter, duvarda pencere boşluğu, L döşeme.
   2) Konya isale terfi merkezi modeli (araclar/konya-terfi-uret.js): ham modelde çakışan hacimler, birleşim kuralından sonra
      hiçbir hacmin iki kez sayılmadığı (net parçalar arası çakışma = 0) ve tür tür net beton hacmi.
   Çalıştır: node test/yapi-cakisma.test.js */
'use strict';
const assert = require('assert');
const Y = require('../app/yapi-cakisma.js');
const U = require('../araclar/konya-terfi-uret.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yak = (a, b, e) => assert.ok(Math.abs(a - b) <= e, `${a} ≉ ${b} (±${e})`);
const kare = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

t('kolon döşemeyi deler: döşeme neti = brüt − kolon izi × kalınlık; kolon bütün kalır', () => {
  const E = [
    { id: 1, type: 'plak', kind: 'doseme', pts: kare(0, 0, 4, 4), t: 0.2, zt: 3 },
    { id: 2, type: 'kolon', sek: 'R', b: 0.5, d: 0.4, h: 3, z0: 0, p: [2, 2, 0] },
  ];
  const c = Y.cakisma(E), N = Y.net(E);
  yak(c.toplam, 0.5 * 0.4 * 0.2, 1e-9); assert.strictEqual(c.hata, 0);
  yak(N.get(1).net, 16 * 0.2 - 0.04, 1e-9); yak(N.get(2).net, 0.5 * 0.4 * 3, 1e-9); yak(N.get(1).kesen.Kolon, 0.04, 1e-9);
  yak(Y.netCakisma(N), 0, 1e-9);
});

t('eksenden eksene çizilen kiriş kolon yüzünde biter; kiriş tam yükseklikte kirişe sayılır, döşeme kiriş yüzleri arasında kalır', () => {
  const E = [
    { id: 1, type: 'kolon', sek: 'R', b: 0.5, d: 0.5, h: 3, z0: 0, p: [0, 0, 0] },
    { id: 2, type: 'kolon', sek: 'R', b: 0.5, d: 0.5, h: 3, z0: 0, p: [6, 0, 0] },
    { id: 3, type: 'kiris', a: [0, 0, 0], b: [6, 0, 0], bw: 0.3, hb: 0.6, zt: 3 },
    { id: 4, type: 'plak', kind: 'doseme', pts: kare(-0.25, -2, 6.25, 2), t: 0.15, zt: 3 },
  ];
  const N = Y.net(E);
  yak(N.get(3).brut, 6 * 0.3 * 0.6, 1e-9);
  yak(N.get(3).net, 5.5 * 0.3 * 0.6, 1e-9);                                // temiz açıklık × tam kesit (döşeme dahil)
  yak(N.get(4).net, (6.5 * 4 - 2 * 0.25 - 5.5 * 0.3) * 0.15, 1e-9);        // döşeme − iki kolon izi − kiriş izi
  yak(Y.netCakisma(N), 0, 1e-9);
});

t('tuğla duvar kolonlar arasında kalır, pencere boşluğu düşülür; betonarme perde duvarı keser', () => {
  const E = [
    { id: 1, type: 'kolon', sek: 'R', b: 0.4, d: 0.4, h: 3, z0: 0, p: [0, 0, 0] },
    { id: 2, type: 'kolon', sek: 'R', b: 0.4, d: 0.4, h: 3, z0: 0, p: [5, 0, 0] },
    { id: 3, type: 'perde', malz: 'tugla', pts: [[0, 0], [5, 0]], tb: 0.2, tt: 0.2, z0: 0, h: 3, hiza: 'O' },
    { id: 4, type: 'acik', host: 3, seg: 0, s: 2.5, w: 1.2, hh: 1.5, par: 0.9, kind: 'pencere' },
    { id: 5, type: 'kiris', a: [0, 0, 0], b: [5, 0, 0], bw: 0.25, hb: 0.5, zt: 3 },
  ];
  const N = Y.net(E), d = N.get(3);
  yak(d.brut, (5 * 3 - 1.2 * 1.5) * 0.2, 1e-9);                            // pencere kendi minhası
  yak(d.net, (4.6 * 2.5 - 1.2 * 1.5) * 0.2, 1e-9);                         // kolon yüzleri arası × kiriş altı
  assert.ok(d.kesen.Kolon > 0 && d.kesen.Kiriş > 0);
});

t('aynı türden iki eleman üst üste: model hatası sayılır; çapraz kirişler birleşimdir', () => {
  const p = (id, x0, x1) => ({ id, type: 'perde', malz: 'beton', pts: [[x0, 0], [x1, 0]], tb: 0.3, tt: 0.3, z0: 0, h: 2, hiza: 'O' });
  const c = Y.cakisma([p(1, 0, 4), p(2, 3, 6)]);
  yak(c.hata, 1 * 0.3 * 2, 1e-9); assert.strictEqual(c.cift[0].sinif, 'hata');
  const k = Y.cakisma([{ id: 1, type: 'kiris', a: [0, 0, 0], b: [4, 0, 0], bw: 0.3, hb: 0.5, zt: 3 }, { id: 2, type: 'kiris', a: [2, -2, 0], b: [2, 2, 0], bw: 0.3, hb: 0.5, zt: 3 }]);
  yak(k.toplam, 0.3 * 0.3 * 0.5, 1e-9); assert.strictEqual(k.hata, 0);
});

t('L döşeme ve düşey boşluk: alan üçgenlemeden doğru çıkar', () => {
  const L = [[0, 0], [6, 0], [6, 2], [2, 2], [2, 5], [0, 5]];
  const e = { id: 1, type: 'plak', kind: 'doseme', pts: L, t: 0.2, zt: 0, bosluk3: [{ pts: [[4, 0.5, -0.3], [5, 0.5, -0.3], [5, 1.5, -0.3], [4, 1.5, -0.3]], d: [0, 0, 0.4] }] };
  yak(Y.hacim(Y.prizmalar(e, [e])), (6 * 2 + 2 * 3 - 1) * 0.2, 1e-9);
});

/* ---------- Konya terfi ---------- */
const E = U.uret().doc.ents;
t('Konya: ham modelde çakışmalar (eksenden eksene çizim) — kolon∩perde, kolon∩duvar, döşeme∩kiriş', () => {
  const c = Y.cakisma(E);
  assert.ok(c.toplam > 20, 'ham model eksenden eksene çizildiği için çakışır');
  yak(c.tur['Kolon ∩ Perde'], 11.83, 0.02);                                // 10 kolon × perde içindeki izleri × 6,50 m
  assert.strictEqual(c.hata, 0, 'aynı türden üst üste binen eleman olmamalı: ' + JSON.stringify(c.cift.filter(x => x.sinif === 'hata')));
});
t('Konya: birleşim kuralından sonra hiçbir hacim iki kez sayılmaz', () => {
  const N = Y.net(E); yak(Y.netCakisma(N), 0, 1e-6);
  const top = {}; for (const [, m] of N) top[m.ad] = (top[m.ad] || 0) + m.net;
  yak(top.Kolon, 10 * 0.5 * 0.5 * 11.2, 1e-6);                             // kolonlar bütün
  yak(top.Temel, 20.7 * 9.5 * 0.6, 1e-6);                                 // radye 60 cm (Konya statik, perdeler dışa kalınlaştı: B 50, A 60)
  assert.ok(top.Perde < 179.34 - 11.8 + 0.05 && top.Perde > 167.4, 'perde: kolon izleri düşülmüş ' + top.Perde); // brüt 179,34 m³ (B 50, A 60, kısa 40 cm × 6,50 m)
  assert.ok(top['Kiriş'] < 27.18 - 0.9 && top['Kiriş'] > 25.5, 'kiriş: kolon, perde ve çapraz kiriş içi düşülmüş, döşeme içi kirişte ' + top['Kiriş']);
});
t('Konya: her elemanın neti brütünden büyük değil; kesen türler öncelik sırasına uyar', () => {
  const N = Y.net(E);
  for (const [id, m] of N) {
    assert.ok(m.net <= m.brut + 1e-9, 'eleman ' + id);
    for (const k of Object.keys(m.kesen)) { const r = Object.keys(Y.TUR_AD).find(x => Y.TUR_AD[x] === k); assert.ok(Y.TUR[r] <= Y.TUR[m.tur], `${m.ad} #${id} kendinden düşük öncelikli ${k} tarafından kesilmiş`); }
  }
});

console.log(`\n${n} test geçti.`);

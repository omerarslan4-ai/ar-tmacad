/* Konya İsale Terfi Merkezi inşaat modeli üreticisi (araclar/konya-terfi-uret.js).
   Karşılaştırma değerleri: Konyaİsale_Terfi_mim+mek.dwg — planlar 1970×800, kesit kotları (+198,51 radye altı, +199,77 pompa holü,
   +205,41 galeri döşemesi üstü, +205,67 montaj holü, +210,11 kiriş altı, +210,91 çatı döşemesi), M1 merdiveni 33 × 17,88 / 27.
   Çalıştır: node test/konya-terfi.test.js */
'use strict';
const assert = require('assert');
const U = require('../araclar/konya-terfi-uret.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yak = (a, b, e) => assert.ok(Math.abs(a - b) <= e, `${a} ≉ ${b} (±${e})`);
const { doc } = U.uret(), E = doc.ents, tip = ty => E.filter(e => e.type === ty);
const alan = p => Math.abs(p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0) / 2);

t('kotlar: ±0.00 = +205,67, toprak −0,20', () => {
  assert.strictEqual(doc.set.seviye.abs0, 205.67); yak(doc.set.seviye.toprak, -0.20, 1e-9);
  yak(U.z(199.77), -5.90, 1e-9); yak(U.z(210.91), 5.24, 1e-9);
});
t('radye 40 cm, 50 cm taşar; grobeton 10 cm C16/20', () => {
  const [g, r] = tip('plak').filter(e => e.kind === 'radye');
  assert.ok(g.grobeton); assert.strictEqual(g.beton, 'C16/20'); yak(g.t, 0.10, 1e-9); yak(g.zt, U.z(198.51), 1e-9);
  yak(r.t, 0.40, 1e-9); yak(r.zt, U.z(198.91), 1e-9); yak(alan(r.pts), 20.7 * 9.0, 1e-6);
});
t('perdeler: uzun kenar 30, kısa kenar 40 cm, radye üstünden +205,41', () => {
  const p = tip('perde').filter(e => e.malz === 'beton');
  assert.strictEqual(p.length, 4); assert.deepStrictEqual(p.map(e => e.tb), [0.3, 0.3, 0.4, 0.4]);
  for (const e of p) { yak(e.z0, U.z(198.91), 1e-9); yak(e.z0 + e.h, U.z(205.41), 1e-6); }
});
t('kolonlar: 10 × 50/50 kiriş altına (+210,11) + 8 vinç konsolu', () => {
  const k = tip('kolon'), ana = k.filter(e => e.d === 0.5);
  assert.strictEqual(ana.length, 10); assert.strictEqual(k.length - ana.length, 8);
  for (const e of ana) yak(e.z0 + e.h, U.z(210.11), 1e-6);
});
t('galeri döşemesi: vinç boşluğu ve merdiven boşluğu dışarıda, kalınlığı sabit', () => {
  const g = tip('plak').find(e => e.ad === 'Galeri döşemesi');
  assert.ok(g.tSabit); yak(g.t, 0.15, 1e-9); yak(g.zt, U.z(205.41), 1e-9);
  // dış dikdörtgen − vinç boşluğu (9,10 × 5,70 + 4,30 × 3,20) − merdiven boşluğu (4,49 × 1,25)
  yak(alan(g.pts), 18.9 * 7.4 - (9.1 * 5.7 + 4.3 * 3.2 + 4.49 * 1.25), 1e-6);
});
t('pompa holü tabanı: 3 kanal kolu + ana kanal + drenaj + 3 kaide boşluğu', () => {
  const f = tip('plak').find(e => e.ad === 'Pompa holü taban betonu');
  assert.strictEqual(f.bosluk3.length, 8); yak(f.zt, -5.90, 1e-9);
  for (const k of U.KAIDE) { const a = Math.hypot(k[1][0] - k[0][0], k[1][1] - k[0][1]), b = Math.hypot(k[2][0] - k[1][0], k[2][1] - k[1][1]); yak(a, 2.0, 0.01); yak(b, 1.0, 0.01); }
});
t('merdiven: +199,77 → +205,67, 125 cm, rıht 17,88 → 33 rıht', () => {
  const m = tip('merdiven')[0];
  yak(m.z0, -5.90, 1e-9); assert.strictEqual(m.z1, 0); assert.strictEqual(m.w, 1.25);
  assert.strictEqual(Math.ceil((m.z1 - m.z0) / (m.hmax / 100) - 1e-9), 33);
  // programın kol paylaştırması (merdiven.js): 2 + (n − 2·kol) × boy / toplam, artanlar kesiri büyüğe → 10 / 10 / 13
  const L = []; for (let i = 0; i + 1 < m.pts.length; i++) L.push(Math.hypot(m.pts[i + 1][0] - m.pts[i][0], m.pts[i + 1][1] - m.pts[i][1]));
  const top = L.reduce((a, b) => a + b, 0), raw = L.map(l => 2 + (33 - 6) * l / top), ns = raw.map(Math.floor);
  let kalan = 33 - ns.reduce((a, b) => a + b, 0); raw.map((r, i) => [i, r - Math.floor(r)]).sort((a, b) => b[1] - a[1]).forEach(([i]) => { if (kalan > 0) { ns[i]++; kalan--; } });
  assert.deepStrictEqual(ns, [10, 10, 13]);
});
t('boşluklar: 31 pencere / kapı, hepsi bir duvara bağlı', () => {
  const a = tip('acik'), ids = new Set(tip('perde').map(e => e.id));
  assert.strictEqual(a.length, 31); assert.ok(a.every(o => ids.has(o.host)));
  assert.strictEqual(a.filter(o => o.kTip === 'S').length, 1); assert.strictEqual(a.filter(o => o.kind === 'kapi').length, 3);
});
t('mekanik nesne yok (yalnız inşaat)', () => {
  assert.ok(!E.some(e => ['pipe', 'pompa', 'vana', 'ekipman', 'aile'].includes(e.type)));
});

console.log(`\n${n} test geçti.`);

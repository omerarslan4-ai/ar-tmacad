/* GT-6 inşaat modeli üreticisi (araclar/gt6-uret.js).
   Karşılaştırma değerleri: test-proje/GT6/GT-6.dwg — alt plan 1880 × 1535 (L biçimli), dış perdeler 90 (D tarafı alt 100), radye 100,
   kotlar −1,75 / −0,75 / +5,45 / +9,85 / +10,00 / +14,64 / +14,84, A-A kesitinde 10 nervür (40 / 100), 5 filtre kirişi (30 / 50),
   +10,00 planında 6 × 150 ve 4 × 110 kapak boşluğu, bina 12 kolon 30/30, C cephesi 12 × 75/240, D cephesi 12 × 50/240 pencere.
   Çalıştır: node test/gt6.test.js */
'use strict';
const assert = require('assert');
const U = require('../araclar/gt6-uret.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yak = (a, b, e) => assert.ok(Math.abs(a - b) <= e, `${a} ≉ ${b} (±${e})`);
const { doc } = U.uret(), E = doc.ents, tip = ty => E.filter(e => e.type === ty);
const alan = p => Math.abs(p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0) / 2);
const ad = a => E.find(e => e.ad === a);

t('radye 100 cm, −1,75 → −0,75, ana hazne dış ölçüsü 18,80 × 12,55', () => {
  const r = tip('plak').filter(e => e.kind === 'radye' && !e.ad); assert.strictEqual(r.length, 1);
  yak(r[0].t, 1.0, 1e-9); yak(r[0].zt, -0.75, 1e-9); yak(alan(r[0].pts), 18.8 * 12.55, 1e-6);
});
t('dış perdeler: 1 ve 3 aksı 90, D aksı alt 100 / üst 90 (iç yüz aynı), +10,00 üstüne', () => {
  for (const a of ['Perde 1 aksı', 'Perde 3 aksı']) { const p = ad(a); yak(p.tb, 0.9, 1e-9); yak(p.z0, -0.75, 1e-9); yak(p.z0 + p.h, 10, 1e-9); }
  const da = ad('Perde D aksı (alt, 100 cm)'), du = ad('Perde D aksı (üst, 90 cm)');
  yak(da.tb, 1.0, 1e-9); yak(du.tb, 0.9, 1e-9); yak(da.pts[0][1] + da.tb / 2, 0.45, 1e-9); yak(du.pts[0][1] + du.tb / 2, 0.45, 1e-9);
  yak(da.z0 + da.h, 5.55, 1e-9); yak(du.z0, 5.55, 1e-9); yak(du.z0 + du.h, 10, 1e-9);
});
t('ara perde 75 cm (y 8,05 → 8,80) tabanında 5 geçiş boşluğu 50 cm', () => {
  const p = ad('Ara perde (C aksı altı)'); yak(p.tb, 0.75, 1e-9); yak(p.pts[0][1] - 0.375, 8.05, 1e-9);
  assert.strictEqual(p.bosluk3.length, 5); for (const b of p.bosluk3) { yak(b.pts[1][0] - b.pts[0][0], 0.5, 1e-9); yak(b.pts[0][2], -0.75, 1e-9); }
});
t('filtre döşemesi +5,45 / 30 cm ve 5 kiriş 30/50 (A-A kesiti)', () => {
  const d = ad('Filtre döşemesi'); yak(d.zt, 5.45, 1e-9); yak(d.t, 0.3, 1e-9); yak(alan(d.pts), 17 * 7.6, 1e-6);
  const k = tip('kiris').filter(e => e.ad === 'Filtre döşemesi kirişi'); assert.strictEqual(k.length, 5);
  for (const e of k) { yak(e.bw, 0.3, 1e-9); yak(e.zt - e.hb, 4.95, 1e-9); }
});
t('üst döşeme +10,00 / 30 cm, 6 × 150 boşluk; 10 nervür 40 cm, alt +9,00', () => {
  const d = ad('Üst döşeme'); yak(d.zt, 10, 1e-9); yak(d.t, 0.3, 1e-9); assert.strictEqual(d.bosluk3.length, 6); assert.ok(d.kenarSabit && d.tSabit);
  for (const b of d.bosluk3) { yak(b.pts[1][0] - b.pts[0][0], 1.5, 1e-9); yak(b.pts[2][1] - b.pts[1][1], 1.5, 1e-9); }
  const k = tip('kiris').filter(e => e.ad === 'Üst döşeme nervürü'); assert.strictEqual(k.length, 10);
  for (const e of k) { yak(e.bw, 0.4, 1e-9); yak(e.zt - e.hb, 9.0, 1e-9); }
});
t('küçük hazne döşemesi +9,85, 4 × 110 boşluk', () => {
  const d = ad('Küçük hazne üst döşemesi'); yak(d.zt, 9.85, 1e-9); assert.strictEqual(d.bosluk3.length, 4);
  for (const b of d.bosluk3) yak(b.pts[1][0] - b.pts[0][0], 1.1, 1e-9);
});
t('açık kanal (B-B): taban +2,15 / 80 cm, perdeler 80 cm +9,85; merdiven 28 rıht', () => {
  const k = ad('Kanal tabanı'); yak(k.zt, 2.15, 1e-9); yak(k.t, 0.8, 1e-9); yak(alan(k.pts), 12.2 * 2.8, 1e-6);
  const p = tip('perde').filter(e => /^Kanal perdesi/.test(e.ad)); assert.strictEqual(p.length, 3);
  for (const e of p) { yak(e.tb, 0.8, 1e-9); yak(e.z0 + e.h, 9.85, 1e-9); }
  const m = tip('merdiven')[0]; yak(m.z1 - m.z0, 7.7, 1e-9); assert.strictEqual(Math.round((m.z1 - m.z0) * 100 / m.hmax), 28);
});
t('bina: 12 kolon 30/30 (+10,00 → +14,64), 4 tuğla duvar 30 cm, çatı döşemesi 20 cm 75 cm saçaklı', () => {
  const k = tip('kolon'); assert.strictEqual(k.length, 12); for (const e of k) { yak(e.b, 0.3, 1e-9); yak(e.z0, 10, 1e-9); yak(e.z0 + e.h, 14.64, 1e-9); }
  const d = tip('perde').filter(e => e.malz === 'tugla'); assert.strictEqual(d.length, 4); for (const e of d) { yak(e.tb, 0.3, 1e-9); assert.ok(!('beton' in e)); }
  const c = ad('Çatı döşemesi'); yak(c.zt, 14.84, 1e-9); yak(c.t, 0.2, 1e-9); yak(alan(c.pts), (18.5 + 1.5) * (8.875 + 1.5), 1e-6);
});
t('pencere / kapı: duvar bölünmez, C 12 × 75/240, D 12 × 50/240 (denizlik +10,90), 2 kapı 90/200, SK1 350/350', () => {
  const a = tip('acik'), dC = ad('Cephe duvarı C'), dD = ad('Cephe duvarı D');
  const pc = a.filter(o => o.host === dC.id), pd = a.filter(o => o.host === dD.id);
  assert.strictEqual(pc.length, 12); assert.strictEqual(pd.length, 12);
  for (const o of pc) { yak(o.w, 0.75, 1e-9); yak(o.hh, 2.4, 1e-9); yak(dC.z0 + o.par, 10.9, 1e-9); }
  for (const o of pd) yak(o.w, 0.5, 1e-9);
  // pencere duvarın içinde, kolonlarla çakışmaz (kolonlar 130 + 300k … 160 + 300k)
  for (const o of pc.concat(pd)) { const x0 = o.s - o.w / 2 - 0.3, x1 = o.s + o.w / 2 - 0.3; for (const kx of U.BINA_KOLON_X) assert.ok(x1 <= kx / 100 + 1e-6 || x0 >= kx / 100 + 0.3 - 1e-6, `pencere ${x0}-${x1} kolon ${kx}`); }
  const k = a.filter(o => o.kind === 'kapi'); assert.strictEqual(k.length, 3);
  assert.deepStrictEqual(k.map(o => [o.w, o.hh]).sort(), [[0.9, 2], [0.9, 2], [3.5, 3.5]]);
});
console.log(`\n${n} test geçti.`);

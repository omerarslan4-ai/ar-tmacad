/* Hafif geri alma kopyası ve kullanılmayan blokların ayıklanması (app/blok-hafif.js).
   Ölçüt: bekçi binası dosyası — 13,7 MB kopyanın 9,4 MB'ı çizimde kullanılmayan iki 3B bloktu (klozet, lavabo).
   Çalıştır: node test/blok-hafif.test.js */
'use strict';
const assert = require('assert');
const { hafiflet, geriKoy, kullanilmayan, kayitYap } = require('../app/blok-hafif.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const govde = k => ({ v: Array.from({ length: 3000 * k }, (_, i) => i * 0.001), f: [0, 1, 2], fc: [7] });

t('hafif kopyada 3B gövde yazılmaz, geri koyunca aynı gövde döner', () => {
  const B = { KLOZET: { id: 'KLOZET', name: 'Klozet', ents: [{ type: 'line' }], mesh3d: govde(40) }, LAVABO: { id: 'LAVABO', ents: [], mesh3d: govde(20) }, OK: { id: 'OK', ents: [{ type: 'line' }] } };
  const kayit = kayitYap(), tam = JSON.stringify(B), hafif = JSON.stringify(hafiflet(B, kayit));
  assert.ok(hafif.length < tam.length / 100, `hafif ${hafif.length}, tam ${tam.length}`);
  assert.ok(B.KLOZET.mesh3d.v, 'belgedeki blok değişmez');
  const geri = geriKoy(JSON.parse(hafif), kayit);
  assert.strictEqual(geri.KLOZET.mesh3d, B.KLOZET.mesh3d); assert.strictEqual(geri.LAVABO.mesh3d, B.LAVABO.mesh3d);
  assert.deepStrictEqual(geri.OK, B.OK); assert.strictEqual(geri.KLOZET.name, 'Klozet');
  assert.strictEqual(JSON.stringify(hafiflet(B, kayit)), hafif, 'aynı gövde aynı numarayı alır');
});

t('kayıtta olmayan numara: gövde yedek kaynaktan (kütüphane) gelir, o da yoksa blok gövdesiz kalır ama silinmez', () => {
  const eski = { A: { id: 'A', ents: [], mesh3d: { $m3: 99 } }, B: { id: 'B', ents: [{ type: 'line' }], mesh3d: { $m3: 98 } } }, g = govde(1);
  const r = geriKoy(eski, kayitYap(), id => (id === 'A' ? g : null));
  assert.strictEqual(r.A.mesh3d, g); assert.ok(!('mesh3d' in r.B)); assert.strictEqual(r.B.ents.length, 1);
});

t('kullanılmayan blok: adı nesnede, ayarda, paftada ya da kullanılan başka bloğun içinde geçmeyen', () => {
  const doc = { ents: [{ type: 'insert', ref: 'POMPA', _c: { x: 'KLOZET' } }, { type: 'line' }], set: { secili: 'VANA' }, layouts: [{ vps: [{ blok: 'ANTET' }] }],
    blocks: { POMPA: { id: 'POMPA', ents: [{ type: 'insert', ref: 'FLANS' }] }, FLANS: { id: 'FLANS', ents: [] }, VANA: { id: 'VANA', ents: [] }, ANTET: { id: 'ANTET', ents: [] },
      KLOZET: { id: 'KLOZET', ents: [{ type: 'insert', ref: 'CIVATA' }], mesh3d: govde(2) }, CIVATA: { id: 'CIVATA', ents: [] }, LAVABO: { id: 'LAVABO', ents: [], mesh3d: govde(1) } } };
  assert.deepStrictEqual(kullanilmayan(doc).sort(), ['CIVATA', 'KLOZET', 'LAVABO']); // önbellekteki (_c) ad kullanım sayılmaz; yalnız kullanılmayan bloğun içindeki blok da kullanılmıyordur
  assert.deepStrictEqual(kullanilmayan({ ents: [], blocks: {} }), []);
  assert.deepStrictEqual(kullanilmayan({ ents: [{ type: 'insert', ref: 'POMPA_2' }], blocks: { POMPA: { id: 'POMPA', ents: [] } } }), ['POMPA']); // ad başka bir adın parçasıysa kullanım sayılmaz
});
console.log(`\n${n} test geçti.`);

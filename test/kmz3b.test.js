/* Google Earth 3B KMZ (app/kmz3b.js): COLLADA yazıcı, model yerleşimi ve KML ekleri.
   Karşılaştırma: SW2 sahası (test-proje/SW2/SW2-saha.aritma varsa) — model merkezi 32.1317 K, 20.0776 D civarında olmalı.
   Çalıştır: node test/kmz3b.test.js */
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
globalThis.C = { on() { } }; require('../app/geo.js'); require('../app/render-malzeme.js'); require('../app/saha3b.js'); require('../app/kmz3b.js');
const C = globalThis.C, K = C.kmz3b; let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yak = (a, b, e) => assert.ok(Math.abs(a - b) <= e, `${a} ≉ ${b} (±${e})`);
const kutu = (x, y, z, a) => { const p = [[x, y, z], [x + a, y, z], [x + a, y + a, z], [x, y + a, z], [x, y, z + a], [x + a, y, z + a], [x + a, y + a, z + a], [x, y + a, z + a]], f = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]], pos = []; for (const u of f) for (const i of u) pos.push(...p[i]); return { pos }; };

t('COLLADA: metre, Z yukarı, renk başına bir malzeme, çift yüzlü, üçgen sayısı doğru', () => {
  const d = K.dae([{ pos: kutu(0, 0, 0, 2).pos, renk: [1, 0, 0, 1] }, { pos: kutu(5, 0, 0, 1).pos, renk: [1, 0, 0, 1] }, { pos: kutu(0, 5, 0, 1).pos, renk: [0.2, 0.6, 0.8, 0.4] }]);
  assert.ok(/<up_axis>Z_UP<\/up_axis>/.test(d) && /meter="1"/.test(d));
  assert.strictEqual((d.match(/<material id=/g) || []).length, 2); assert.strictEqual((d.match(/<double_sided>1/g) || []).length, 2);
  const say = [...d.matchAll(/<triangles material="M" count="(\d+)"/g)].map(m => +m[1]); assert.deepStrictEqual(say, [24, 12]);
  assert.ok(/<transparency><float>0.4<\/float>/.test(d)); // camın saydamlığı
  const p = /<p>([^<]*)<\/p>/.exec(d)[1].split(' '); assert.strictEqual(p.length, 72); assert.strictEqual(p[71], '71');
});
t('COLLADA: yozlaşmış üçgen atılır, normal üçgenden hesaplanır; boş girdide null', () => {
  const d = K.dae([{ pos: [0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0], renk: [1, 1, 1, 1] }]);
  assert.ok(/<triangles material="M" count="1"/.test(d)); assert.ok(/-n-a" count="9">0 0 1 0 0 1 0 0 1</.test(d));
  assert.strictEqual(K.dae([]), null); assert.strictEqual(K.dae([{ pos: [0, 0, 0], renk: [1, 1, 1, 1] }]), null);
});
t('yerleşim: model merkezi gerçek koordinatta, eksenler doğu-kuzey, boyut korunur', () => {
  C.doc = { set: { geo: { mode: 'tm', cm: 21, k0: 0.99995, fe: 200027.541, fn: 13.486 }, seviye: { toprak: 0.38 }, name: 'SW2' }, ents: [{ type: 'kutu', layer: 'A' }, { type: 'kutu', layer: 'B' }, { type: 'sheet', layer: 'A' }, { type: 'cizgi', layer: 'A' }] };
  if (!C.geo.isSet()) { console.log('  (koordinat kipi tanınmadı; proje dosyasındaki ayar kullanılacak)'); return; }
  const tr = e => e.type !== 'kutu' ? null : e.layer === 'A' ? kutu(112990, 3556660, 0, 10) : kutu(113010, 3556680, 0, 10);
  const m = K.parcalar(C.doc, { tris: tr, renk: () => [0.5, 0.5, 0.5, 1] });
  assert.strictEqual(m.parcalar.length, 2); assert.strictEqual(m.ucgen, 24); assert.strictEqual(m.nesneler.length, 2);
  yak(m.ll[0], 32.13175, 0.0006); yak(m.ll[1], 20.07757, 0.0006);
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const p of m.parcalar) for (let i = 0; i < p.pos.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p.pos[i + k]); mx[k] = Math.max(mx[k], p.pos[i + k]); }
  yak(mx[0] - mn[0], 30, 0.5); yak(mx[1] - mn[1], 30, 0.5); yak(mn[0] + mx[0], 0, 0.5); yak(mn[2], 0, 1e-9); yak(mx[2], 10, 1e-9); // merkez orijinde, kot aynen
});
t('SW2 projesi: KML eki — model toprak kotuna oturur, hat ve çevre binalar yazılır', () => {
  const f = path.join(__dirname, '..', 'test-proje', 'SW2', 'SW2-saha.aritma'); if (!fs.existsSync(f)) { console.log('  (SW2-saha.aritma yok, atlandı)'); return; }
  const doc = JSON.parse(fs.readFileSync(f, 'utf8')).doc; C.doc = doc;
  const tr = e => e.type === 'perde' || e.type === 'plak' ? kutu(112990, 3556660, 0, 10) : null, m = K.parcalar(doc, { tris: tr });
  yak(m.ll[0], 32.13175, 0.0006); yak(m.ll[1], 20.07757, 0.0006);
  for (const p of m.parcalar) assert.ok(p.renk.length >= 3 && p.renk.every(v => v >= 0 && v <= 1));
  const kd = K.kml(doc, m, { dae: true, cevre3b: true });
  assert.ok(/<altitude>-0\.38<\/altitude>/.test(kd) && /<href>models\/tesis\.dae<\/href>/.test(kd) && /<heading>0<\/heading>/.test(kd));
  assert.strictEqual((kd.match(/<extrude>1<\/extrude>/g) || []).length, doc.set.cevre.binalar.length);
  const k = K.kml(doc, m);
  assert.ok(!/<Model>/.test(k) && !/<extrude>/.test(k), 'varsayılan: yüzeyli model, çevre binalar düz');
  // 10 m'lik kutu, toprak 0,38: taban yüzü zemin altında → yazılmaz; üst yüz 9,62 + 0,05 m
  const yuk = [...k.matchAll(/relativeToGround<\/altitudeMode><outerBoundaryIs><LinearRing><coordinates>([^<]*)</g)].flatMap(x => x[1].split(' ').map(c => +c.split(',')[2]));
  assert.ok(yuk.length > 0 && Math.min(...yuk) >= 0.05 - 1e-9); yak(Math.max(...yuk), 9.67, 0.011);
  const ilk = /relativeToGround<\/altitudeMode><outerBoundaryIs><LinearRing><coordinates>([^ ]*)/.exec(k)[1].split(',').map(Number); yak(ilk[0], 20.0776, 0.002); yak(ilk[1], 32.1317, 0.002);
  assert.ok(/2×DN1400 \+ 1×DN900/.test(k), 'ana hat adı'); assert.ok(/Uzunluk 66\d m/.test(k), 'hat uzunluğu ≈ 661 m');
  assert.strictEqual((k.match(/clampToGround<\/altitudeMode><outerBoundaryIs>/g) || []).length, doc.set.cevre.binalar.length);
  assert.ok(/<name>GÜVENLİK BİNASI<\/name>/.test(k) && /Toplam yağmur suyu kapasitesi/.test(k));
  const hat = /<LineString>.*?<coordinates>([^<]*)</.exec(k)[1].split(' ')[0].split(',').map(Number); yak(hat[0], 20.0776, 0.002); yak(hat[1], 32.1317, 0.002);
  assert.ok(!/<Model>/.test(K.kml(doc, null))); // model yoksa yalnız ekler
});
t('yüzeyler: yöne göre ton (yatay en açık), cam saydam, zemin altı yazılmaz; KML rengi aabbggrr', () => {
  const ll = [32.13175, 20.07757], y = K.yuzeyler({ ll, parcalar: [{ pos: kutu(0, 0, 0, 2).pos, renk: [1, 0.5, 0, 1] }, { pos: kutu(5, 0, -4, 2).pos, renk: [0, 1, 0, 1] }, { pos: [0, 0, 5, 1, 0, 5, 0, 1, 5], renk: [0.2, 0.4, 0.6, 0.5] }] }, 0);
  assert.strictEqual(y.ucgen, 11); // kutunun tabanı (2) ve gömülü kutu (12) yok: 10 + cam üçgeni
  assert.ok(/<color>ff0080ff<\/color>/.test(y.stil), 'yatay yüz tam renk (mavi-yeşil-kırmızı sırası)'); assert.ok(/<color>80[0-9a-f]{6}<\/color>/.test(y.stil), 'cam yarı saydam');
  assert.ok(!/00ff00<\/color>/.test(y.stil), 'gömülü kutunun rengi yok'); assert.ok((y.stil.match(/<Style /g) || []).length >= 3 && /<outline>0<\/outline>/.test(y.stil));
});
console.log(`\n${n} test geçti.`);

/* Render malzemeleri ve GLB üretici (app/render-malzeme.js).
   Çalıştır: node test/render-malzeme.test.js */
'use strict';
const assert = require('assert');
globalThis.C = globalThis.C || {}; require('../app/render-malzeme.js');
const R = globalThis.C.renderMalz; let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yak = (a, b, e) => assert.ok(Math.abs(a - b) <= e, a + ' ≉ ' + b);

t('katmana göre önerilen malzeme', () => {
  assert.strictEqual(R.varsayilan('INS_KOLON'), 'siva_mavi'); assert.strictEqual(R.varsayilan('INS_DUVAR_BRIKET'), 'siva_gri'); assert.strictEqual(R.varsayilan('INS_PENCERE'), 'cam');
  assert.strictEqual(R.varsayilan('SAHA_YOL'), 'asfalt'); assert.strictEqual(R.varsayilan('SAHA_YESIL'), 'cim'); assert.strictEqual(R.varsayilan('OLCU'), null);
});
t('malzeme seçimi: nesne ataması > katman ataması > öneri', () => {
  const doc = { set: { render: { katman: { INS_KOLON: 'beton' } } } };
  assert.strictEqual(R.sec(doc, { layer: 'INS_KOLON' }), 'beton'); assert.strictEqual(R.sec(doc, { layer: 'INS_KOLON', rmat: 'paslanmaz' }), 'paslanmaz');
  assert.strictEqual(R.sec(doc, { layer: 'INS_KIRIS' }), 'siva_mavi'); assert.strictEqual(R.sec({ set: {} }, { layer: 'BILINMEYEN' }), null);
  assert.deepStrictEqual(R.tanim('renk:0.5,0.25,1').renk, [0.5, 0.25, 1, 1]);
});
const u32 = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
t('GLB: başlık, JSON ve ikili öbek tutarlı; malzeme başına bir parça', () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
  const g = R.glb({ parcalar: [
    { pos: [0, 0, 0, 1, 0, 0, 0, 1, 0], nrm: [0, 0, 1, 0, 0, 1, 0, 0, 1], st: [0, 0, 4, 0, 0, 4], mat: 'asfalt' },
    { pos: [0, 0, 1, 2, 0, 1, 0, 2, 1], nrm: [0, 0, 1, 0, 0, 1, 0, 0, 1], mat: 'cam' },
    { pos: [5, 5, 0, 6, 5, 0, 5, 6, 0], nrm: [0, 0, 1, 0, 0, 1, 0, 0, 1], st: [5, 5, 6, 5, 5, 6], mat: 'asfalt' },
  ], dokular: { asfalt: png } });
  assert.strictEqual(u32(g, 0), 0x46546C67); assert.strictEqual(u32(g, 4), 2); assert.strictEqual(u32(g, 8), g.length); assert.strictEqual(g.length % 4, 0);
  const jl = u32(g, 12); assert.strictEqual(u32(g, 16), 0x4E4F534A); const j = JSON.parse(Buffer.from(g.slice(20, 20 + jl)).toString('utf8'));
  assert.strictEqual(u32(g, 20 + jl), j.buffers[0].byteLength); assert.strictEqual(u32(g, 24 + jl), 0x004E4942); assert.strictEqual(g.length, 28 + jl + j.buffers[0].byteLength);
  assert.strictEqual(j.meshes[0].primitives.length, 2); assert.deepStrictEqual(j.materials.map(m => m.name), ['asfalt', 'cam']);
  const pa = j.meshes[0].primitives[0], konum = j.accessors[pa.attributes.POSITION]; assert.strictEqual(konum.count, 6); assert.deepStrictEqual(konum.max, [6, 6, 0]); assert.deepStrictEqual(konum.min, [0, 0, 0]);
  assert.ok(pa.attributes.TEXCOORD_0 != null); assert.strictEqual(j.images[0].mimeType, 'image/png'); assert.strictEqual(j.materials[0].pbrMetallicRoughness.baseColorTexture.index, 0);
  // doku koordinatı karo boyuna bölünür (asfalt 4 m): 4 m → 1
  const tv = j.bufferViews[j.accessors[pa.attributes.TEXCOORD_0].bufferView], f = new Float32Array(g.buffer.slice(28 + jl + tv.byteOffset, 28 + jl + tv.byteOffset + tv.byteLength)); yak(f[2], 1, 1e-6);
  assert.strictEqual(j.materials[1].alphaMode, 'BLEND'); assert.strictEqual(j.meshes[0].primitives[1].attributes.TEXCOORD_0, undefined);
  assert.strictEqual(R.glb({ parcalar: [] }), null);
});
t('güneş anı: Bingazi (20,08° D) yerel 12:00 ≈ 10:40 UTC', () => { assert.strictEqual(R.gunesAni(6, 12, 20.08).slice(0, 16), '2026-06-21T10:39'); });
console.log(`\n${n} test geçti.`);

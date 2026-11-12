/* Yapay zekâ render (app/yz-render.js): iş akışı, betim ve model önerisi; ambiyans ve fon maskesi (app/render-malzeme.js).
   Çalıştır: node test/yz-render.test.js */
'use strict';
const assert = require('assert');
globalThis.C = globalThis.C || {}; require('../app/render-malzeme.js'); require('../app/yz-render.js');
const Y = globalThis.C.yzRender, R = globalThis.C.renderMalz; let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

t('iş akışı (kılavuzsuz): görüntüden başlar, benzetim gücü sınırlanır, çıktı kaydedilir', () => {
  const w = Y.isAkisi({ model: 'a.safetensors', resim: 'x.png', betim: 'p', guc: 0.5, tohum: 7 });
  assert.strictEqual(w['1'].inputs.ckpt_name, 'a.safetensors'); assert.strictEqual(w['4'].inputs.image, 'x.png'); assert.deepStrictEqual(w['5'].inputs.pixels, ['4', 0]);
  assert.strictEqual(w['6'].inputs.denoise, 0.5); assert.strictEqual(w['6'].inputs.seed, 7); assert.deepStrictEqual(w['6'].inputs.positive, ['2', 0]); assert.strictEqual(w['8'].class_type, 'SaveImage'); assert.strictEqual(w['9'], undefined);
  assert.strictEqual(Y.isAkisi({ model: 'a', resim: 'x', betim: 'p', guc: 5 })['6'].inputs.denoise, 0.95); assert.strictEqual(Y.isAkisi({ model: 'a', resim: 'x', betim: 'p', guc: 0.01 })['6'].inputs.denoise, 0.2);
  // her bağlantı var olan bir düğümü gösterir
  for (const d of Object.values(w)) for (const v of Object.values(d.inputs)) if (Array.isArray(v)) assert.ok(w[v[0]], 'kopuk bağlantı ' + v[0]);
});
t('iş akışı (kenar kılavuzlu): Canny + ControlNet örnekleyiciye bağlanır', () => {
  const w = Y.isAkisi({ model: 'a', kilavuz: 'cn.safetensors', resim: 'x.png', betim: 'p', guc: 0.7 });
  assert.strictEqual(w['9'].class_type, 'Canny'); assert.strictEqual(w['10'].inputs.control_net_name, 'cn.safetensors'); assert.deepStrictEqual(w['11'].inputs.image, ['9', 0]);
  assert.deepStrictEqual(w['6'].inputs.positive, ['11', 0]); assert.deepStrictEqual(w['6'].inputs.negative, ['11', 1]);
  for (const d of Object.values(w)) for (const v of Object.values(d.inputs)) if (Array.isArray(v)) assert.ok(w[v[0]], 'kopuk bağlantı ' + v[0]);
});
t('betim: ambiyans ve kullanıcı tarifi eklenir', () => {
  const b = Y.betim(R.ambiyans('gunbatimi').tarif, 'ıslak asfalt'); assert.ok(/sunset/.test(b) && /ıslak asfalt/.test(b) && /photorealistic/.test(b)); assert.ok(/clear blue sky/.test(Y.betim('', '')));
  // tesis tarifi projeden gelir; verilmezse genel tanım (SW2'ye özgü sözler yazılmaz)
  assert.ok(Y.betim('', '').includes(Y.TESIS) && !/pumping station|yellow handrail/.test(Y.betim('', '')));
  const o = Y.betim('', '', 'wastewater treatment plant, circular clarifiers'); assert.ok(/circular clarifiers/.test(o) && !o.includes(Y.TESIS));
});
t('model önerisi: gerçekçi model öne, kılavuz aynı aileden (XL ↔ XL)', () => {
  assert.deepStrictEqual(Y.oner(['sd_xl_base_1.0.safetensors', 'realvisxlV50.safetensors', 'sdxl_inpaint.safetensors'], ['control_v11p_sd15_canny.pth', 'controlnet-union-sdxl-1.0.safetensors']), { model: 'realvisxlV50.safetensors', kilavuz: 'controlnet-union-sdxl-1.0.safetensors' });
  assert.deepStrictEqual(Y.oner(['v1-5-pruned.safetensors'], ['controlnet-canny-sdxl.safetensors']), { model: 'v1-5-pruned.safetensors', kilavuz: '' }); assert.deepStrictEqual(Y.oner([], []), { model: '', kilavuz: '' });
});
t('ambiyanslar ve fon maskesi', () => {
  assert.deepStrictEqual(Object.keys(R.AMBIYANS), ['gunduz', 'sabah', 'gunbatimi', 'bulutlu']); assert.strictEqual(R.ambiyans('yok'), R.AMBIYANS.gunduz);
  for (const a of Object.values(R.AMBIYANS)) { assert.ok(a.saat >= 6 && a.saat <= 19 && a.golge > 0 && a.golge <= 1 && a.tarif && a.isik.length === 3); }
  assert.strictEqual(R.fonAgirlik(255, 0, 255), 1); assert.strictEqual(R.fonAgirlik(128, 128, 128), 0); assert.strictEqual(R.fonAgirlik(60, 110, 200), 0); // gökyüzü olmayan mavi / gri etkilenmez
  const k = R.fonAgirlik(215, 70, 215); assert.ok(k > 0 && k < 1);                                                                                         // kenar pikseli: kısmi
});
console.log(`\n${n} test geçti.`);

/* COLLADA (.dae) okuyucu (app/dae-oku.js) — SketchUp 3D Warehouse modelleri için.
   Karşılaştırma: programın kendi KMZ çıktısının COLLADA yazıcısı (kmz3b.js) ile yazılan model geri okunur;
   test-proje/SW2/SW2-saha-3B.kmz varsa içindeki .dae de okunur.
   Çalıştır: node test/dae-oku.test.js */
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
globalThis.C = { on() { } }; require('../app/dae-oku.js');
const C = globalThis.C, D = C.daeOku; let n = 0; const t = async (ad, f) => { await f(); n++; console.log('✓ ' + ad); };
const yak = (a, b, e) => assert.ok(Math.abs(a - b) <= (e || 1e-6), `${a} ≉ ${b}`);
const kutuSinir = v => { const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; for (const p of v) for (let i = 0; i < 3; i++) { b[i] = Math.min(b[i], p[i]); b[i + 3] = Math.max(b[i + 3], p[i]); } return b; };

/* SketchUp'ın yazdığı biçime benzeyen dosya: inç, Z yukarı, library_nodes + instance_node, VERTEX + NORMAL girdisi, doku */
const SKP = `<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
  <asset><contributor><authoring_tool>SketchUp 23</authoring_tool></contributor><unit meter="0.0254" name="inch" /><up_axis>Z_UP</up_axis></asset>
  <library_images><image id="ID5"><init_from>kapi/ahsap.jpg</init_from></image></library_images>
  <library_materials>
    <material id="ID3" name="kirmizi"><instance_effect url="#ID4" /></material>
    <material id="ID6" name="ahsap"><instance_effect url="#ID7" /></material>
  </library_materials>
  <library_effects>
    <effect id="ID4"><profile_COMMON><technique sid="COMMON"><lambert><diffuse><color>1 0 0 1</color></diffuse></lambert></technique></profile_COMMON></effect>
    <effect id="ID7"><profile_COMMON>
      <newparam sid="ID8"><surface type="2D"><init_from>ID5</init_from></surface></newparam>
      <newparam sid="ID9"><sampler2D><source>ID8</source></sampler2D></newparam>
      <technique sid="COMMON"><lambert><diffuse><texture texture="ID9" texcoord="UVSET0" /></diffuse></lambert></technique></profile_COMMON></effect>
  </library_effects>
  <library_geometries>
    <geometry id="ID10"><mesh>
      <source id="ID11"><float_array id="ID12" count="12">0 0 0 10 0 0 10 20 0 0 20 0</float_array><technique_common><accessor count="4" source="#ID12" stride="3"><param name="X" type="float" /><param name="Y" type="float" /><param name="Z" type="float" /></accessor></technique_common></source>
      <source id="ID13"><float_array id="ID14" count="12">0 0 1 0 0 1 0 0 1 0 0 1</float_array><technique_common><accessor count="4" source="#ID14" stride="3" /></technique_common></source>
      <vertices id="ID15"><input semantic="POSITION" source="#ID11" /><input semantic="NORMAL" source="#ID13" /></vertices>
      <triangles count="2" material="Material2"><input offset="0" semantic="VERTEX" source="#ID15" /><input offset="1" semantic="TEXCOORD" source="#ID13" set="0" /><p>0 0 1 1 2 2 0 0 2 2 3 3</p></triangles>
      <lines count="1" material="Material2"><input offset="0" semantic="VERTEX" source="#ID15" /><p>0 1</p></lines>
    </mesh></geometry>
  </library_geometries>
  <library_nodes>
    <node id="ID20" name="bilesen"><instance_geometry url="#ID10"><bind_material><technique_common><instance_material symbol="Material2" target="#ID6" /></technique_common></bind_material></instance_geometry></node>
  </library_nodes>
  <library_visual_scenes>
    <visual_scene id="ID1"><node name="SketchUp">
      <instance_geometry url="#ID10"><bind_material><technique_common><instance_material symbol="Material2" target="#ID3" /></technique_common></bind_material></instance_geometry>
      <node id="ID21" name="kopya"><matrix>1 0 0 100 0 1 0 0 0 0 1 50 0 0 0 1</matrix><instance_node url="#ID20" /></node>
      <node id="ID22" name="ayna"><scale>-1 1 1</scale><instance_node url="#ID20" /></node>
    </node></visual_scene>
  </library_visual_scenes>
  <scene><instance_visual_scene url="#ID1" /></scene>
</COLLADA>`;

(async () => {
  await t('XML: ad alanı önekleri, yorum, CDATA, varlık (&amp;) ve kendiliğinden kapanan etiket', async () => {
    const k = D.xml('<?xml version="1.0"?><!-- yorum --><a:kok x="1&amp;2"><b/><c y=\'z\'>m&lt;n<![CDATA[<ham>]]></c></a:kok>');
    const kok = k.c[0]; assert.strictEqual(kok.ad, 'kok'); assert.strictEqual(kok.at.x, '1&2');
    assert.deepStrictEqual(kok.c.map(x => x.ad), ['b', 'c']); assert.strictEqual(kok.c[1].t, 'm<n<ham>'); assert.strictEqual(kok.c[1].at.y, 'z');
  });

  await t('SketchUp biçimi: inç → metre, Z yukarı, instance_node + matris, çizgiler atlanır', async () => {
    const m = D.oku(SKP);
    assert.ok(m.birimli); assert.strictEqual(m.f.length, 6); // 3 kopya × 2 üçgen (lines yok)
    assert.strictEqual(m.v.length, 12);
    yak(m.v[2][0], 10 * 0.0254); yak(m.v[2][1], 20 * 0.0254); yak(m.v[2][2], 0);
    yak(m.v[4][0], 100 * 0.0254); yak(m.v[4][2], 50 * 0.0254); // kopya: 100" sağa, 50" yukarı
    const b = kutuSinir(m.v); yak(b[0], -10 * 0.0254); yak(b[3], 110 * 0.0254); yak(b[5], 50 * 0.0254);
  });

  await t('Malzeme: renk doğrudan, bind_material sembolü hedefe bağlanır; dokulu malzeme renkle() ile boyanır', async () => {
    const m = D.oku(SKP);
    assert.deepStrictEqual(m.fc[0], [1, 0, 0]); assert.strictEqual(m.fm[0], 'ID3');
    assert.strictEqual(m.fm[2], 'ID6'); assert.deepStrictEqual(m.fc[2], [0.8, 0.8, 0.8]); // doku bilinmeden gri
    assert.strictEqual(m.mats.ID6.doku, 'kapi/ahsap.jpg');
    const istenen = []; await D.renkle(m, async yol => { istenen.push(yol); return [0.5, 0.25, 0]; });
    assert.deepStrictEqual(istenen, ['kapi/ahsap.jpg']); assert.deepStrictEqual(m.fc[2], [0.5, 0.25, 0]); assert.deepStrictEqual(m.fc[0], [1, 0, 0]);
  });

  await t('Ayna (negatif ölçek) yüzün yönünü korur: normal hep yukarı', async () => {
    const m = D.oku(SKP);
    for (const f of m.f) { const [a, b, c] = f.map(i => m.v[i]); const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); assert.ok(nz > 0, 'yüz ters döndü'); }
  });

  await t('Y yukarı + santimetre + polylist (dörtgen → 2 üçgen), sahnesiz geometri de okunur', async () => {
    const d = `<COLLADA><asset><unit meter="0.01"/><up_axis>Y_UP</up_axis></asset><library_geometries><geometry id="g"><mesh>
      <source id="p"><float_array>0 0 0 200 0 0 200 300 0 0 300 0</float_array><technique_common><accessor stride="3"/></technique_common></source>
      <vertices id="v"><input semantic="POSITION" source="#p"/></vertices>
      <polylist count="1"><input semantic="VERTEX" source="#v" offset="0"/><vcount>4</vcount><p>0 1 2 3</p></polylist></mesh></geometry></library_geometries></COLLADA>`;
    const m = D.oku(d); assert.strictEqual(m.f.length, 2);
    const b = kutuSinir(m.v); yak(b[3], 2); yak(b[5], 3); yak(b[1], 0); yak(b[4], 0); // Y (3 m) → Z yukarı
  });

  await t('COLLADA olmayan / boş dosya anlaşılır hata verir', async () => {
    assert.throws(() => D.oku('<html></html>'), /COLLADA/);
    assert.throws(() => D.oku('<COLLADA><asset/></COLLADA>'), /üçgen/);
  });

  /* gerçek proje: programın kendi KMZ çıktısının COLLADA yazıcısı */
  let K = null; try { require('../app/geo.js'); require('../app/render-malzeme.js'); require('../app/saha3b.js'); require('../app/kmz3b.js'); K = C.kmz3b; } catch (e) { }
  if (K && K.dae) await t('Gidiş-dönüş: kmz3b COLLADA yazıcısının çıktısı aynı üçgen sayısı ve ölçülerle geri okunur', async () => {
    const kutu = (x, y, z, a) => { const p = [[x, y, z], [x + a, y, z], [x + a, y + a, z], [x, y + a, z], [x, y, z + a], [x + a, y, z + a], [x + a, y + a, z + a], [x, y + a, z + a]], f = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]], pos = []; for (const u of f) for (const i of u) pos.push(...p[i]); return pos; };
    const yazi = K.dae([{ pos: kutu(0, 0, 0, 2), renk: [1, 0, 0, 1] }, { pos: kutu(5, 0, 0, 1), renk: [0.2, 0.6, 0.8, 1] }]);
    const m = D.oku(yazi); const say = (yazi.match(/<triangles[^>]*count="(\d+)"/g) || []).map(s => +/count="(\d+)"/.exec(s)[1]).reduce((a, b) => a + b, 0);
    assert.strictEqual(m.f.length, say); const b = kutuSinir(m.v); yak(b[0], 0); yak(b[3], 6); yak(b[5], 2);
    assert.ok(m.fc.some(c => c[0] === 1 && c[1] === 0) && m.fc.some(c => Math.abs(c[2] - 0.8) < 1e-9), 'renkler');
  });

  const kmz = path.join(__dirname, '..', 'test-proje', 'SW2', 'SW2-saha-3B.kmz');
  if (fs.existsSync(kmz)) {
    const zlib = require('zlib'), buf = fs.readFileSync(kmz); const daeler = [];
    for (let i = 0; i + 30 < buf.length; i++) if (buf.readUInt32LE(i) === 0x04034b50) { const yon = buf.readUInt16LE(i + 8), cs = buf.readUInt32LE(i + 18), nl = buf.readUInt16LE(i + 26), xl = buf.readUInt16LE(i + 28), ad = buf.toString('utf8', i + 30, i + 30 + nl), bas = i + 30 + nl + xl; if (/\.dae$/i.test(ad)) { const ham = buf.slice(bas, bas + cs); daeler.push({ ad, veri: yon === 8 ? zlib.inflateRawSync(ham) : ham }); } }
    if (daeler.length) await t('SW2 saha KMZ içindeki model okunur (' + daeler[0].ad + ')', async () => {
      const m = D.oku(daeler[0].veri.toString('utf8')); assert.ok(m.f.length > 100, 'üçgen sayısı: ' + m.f.length);
      const b = kutuSinir(m.v); console.log(`   ${m.f.length} üçgen, ${(b[3] - b[0]).toFixed(1)} × ${(b[4] - b[1]).toFixed(1)} × ${(b[5] - b[2]).toFixed(1)} m`);
      assert.ok(b[3] - b[0] > 10 && b[3] - b[0] < 5000, 'saha genişliği makul olmalı');
    });
    else console.log('  (SW2 KMZ içinde .dae yok — yalnız KML yüzeyleri; atlandı)');
  }
  console.log(`\n${n} test geçti.`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });

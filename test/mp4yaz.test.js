/* MP4 yazıcı (app/mp4yaz.js): kutu boyları tutarlı mı, kare tablosu doğru mu.
   Çalıştır: node test/mp4yaz.test.js */
'use strict';
const assert = require('assert');
globalThis.C = globalThis.C || {}; require('../app/mp4yaz.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const birles = p => { const o = new Uint8Array(p.reduce((s, x) => s + x.length, 0)); let k = 0; for (const x of p) { o.set(x, k); k += x.length; } return o; };
const u32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0, tip = (b, i) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
const kutular = (b, bas, son) => { const o = []; let i = bas; while (i < son) { const L = u32(b, i); assert.ok(L >= 8 && i + L <= son, 'kutu boyu bozuk @' + i); o.push({ tip: tip(b, i + 4), bas: i, boy: L }); i += L; } assert.strictEqual(i, son); return o; };
const bul = (b, yol) => { let a = 0, s = b.length, k = null; for (const ad of yol) { k = kutular(b, a, s).find(x => x.tip === ad); assert.ok(k, ad + ' yok'); a = k.bas + 8; s = k.bas + k.boy; } return k; };

const y = globalThis.C.mp4yaz({ w: 1920, h: 1080, fps: 30, avcC: [1, 100, 0, 40, 255, 225, 0, 0] });
const kareler = [new Uint8Array(100).fill(7), new Uint8Array(40).fill(8), new Uint8Array(60).fill(9)];
y.ekle(kareler[0], true); y.ekle(kareler[1], false); y.ekle(kareler[2], false);
const b = birles(y.bitir());
t('üst düzey kutular: ftyp · mdat · moov, boylar dosyayı tam kaplar', () => { assert.deepStrictEqual(kutular(b, 0, b.length).map(k => k.tip), ['ftyp', 'mdat', 'moov']); });
t('mdat kare verisini sırayla taşır; stco ilk karenin yerini gösterir', () => {
  const mdat = bul(b, ['mdat']); assert.strictEqual(mdat.boy, 8 + 200);
  const stco = bul(b, ['moov', 'trak', 'mdia', 'minf', 'stbl', 'stco']), ofs = u32(b, stco.bas + 16); assert.strictEqual(ofs, mdat.bas + 8);
  assert.strictEqual(b[ofs], 7); assert.strictEqual(b[ofs + 100], 8); assert.strictEqual(b[ofs + 140], 9);
});
t('kare tablosu: 3 kare, boylar 100/40/60, anahtar kare 1, süre 3/30 sn', () => {
  const stsz = bul(b, ['moov', 'trak', 'mdia', 'minf', 'stbl', 'stsz']); assert.strictEqual(u32(b, stsz.bas + 16), 3); assert.deepStrictEqual([0, 1, 2].map(i => u32(b, stsz.bas + 20 + i * 4)), [100, 40, 60]);
  const stss = bul(b, ['moov', 'trak', 'mdia', 'minf', 'stbl', 'stss']); assert.strictEqual(u32(b, stss.bas + 12), 1); assert.strictEqual(u32(b, stss.bas + 16), 1);
  const mvhd = bul(b, ['moov', 'mvhd']); assert.strictEqual(u32(b, mvhd.bas + 20), 90000); assert.strictEqual(u32(b, mvhd.bas + 24), 9000);
});
t('görüntü boyutu avc1 ve tkhd içinde', () => {
  const stsd = bul(b, ['moov', 'trak', 'mdia', 'minf', 'stbl', 'stsd']), a = stsd.bas + 16; assert.strictEqual(tip(b, a + 4), 'avc1'); assert.strictEqual((b[a + 32] << 8) | b[a + 33], 1920); assert.strictEqual((b[a + 34] << 8) | b[a + 35], 1080);
  const tkhd = bul(b, ['moov', 'trak', 'tkhd']); assert.strictEqual(u32(b, tkhd.bas + tkhd.boy - 8) >>> 16, 1920); assert.strictEqual(u32(b, tkhd.bas + tkhd.boy - 4) >>> 16, 1080);
});
console.log(`\n${n} test geçti.`);

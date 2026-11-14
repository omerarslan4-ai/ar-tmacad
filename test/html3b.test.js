/* 3B HTML dışa aktarımı (app/html3b.js): geometri paketleme / çözme, sıkıştırma, sayfa metni.
   Karşılaştırma: Konya terfi modelinin boyutlarında bir kutu (25 m × 12 m × 9 m, kot −4,5 … +4,5) — 1 mm'den büyük kayma olmamalı.
   Çalıştır: node test/html3b.test.js */
'use strict';
const assert = require('assert'), vm = require('vm');
globalThis.C = {}; require('../app/html3b.js');
const H = globalThis.C.html3b; let n = 0;
const t = async (ad, f) => { await f(); n++; console.log('✓ ' + ad); };
const yak = (a, b, e, m) => assert.ok(Math.abs(a - b) <= e, `${m || ''} ${a} ≉ ${b} (±${e})`);
/* kutu: 12 üçgen, view3d.js düzeninde (konum, normal, renk) */
const kutu = (x0, y0, z0, a, b, c, renk) => {
  const p = [[x0, y0, z0], [x0 + a, y0, z0], [x0 + a, y0 + b, z0], [x0, y0 + b, z0], [x0, y0, z0 + c], [x0 + a, y0, z0 + c], [x0 + a, y0 + b, z0 + c], [x0, y0 + b, z0 + c]];
  const f = [[[0, 2, 1], [0, 0, -1]], [[0, 3, 2], [0, 0, -1]], [[4, 5, 6], [0, 0, 1]], [[4, 6, 7], [0, 0, 1]], [[0, 1, 5], [0, -1, 0]], [[0, 5, 4], [0, -1, 0]], [[1, 2, 6], [1, 0, 0]], [[1, 6, 5], [1, 0, 0]], [[2, 3, 7], [0, 1, 0]], [[2, 7, 6], [0, 1, 0]], [[3, 0, 4], [-1, 0, 0]], [[3, 4, 7], [-1, 0, 0]]];
  const v = []; for (const [u, nn] of f) for (const i of u) v.push(...p[i], ...nn, ...renk); return v;
};

(async () => {
  await t('paket → çöz: konum ±0,5 mm, normal ve renk korunur (Konya boyutunda kutu)', () => {
    const v = kutu(-12.5, -6, -4.5, 25, 12, 9, [0.72, 0.72, 0.70]);
    const pk = H.paketle([{ tur: 'tri', duzen: 'lit', veri: v }]);
    assert.strictEqual(pk.gruplar.length, 1); assert.strictEqual(pk.gruplar[0].n, 36);
    assert.strictEqual(pk.bayt.length, 36 * (12 + 3 + 3)); // bir köşe 18 bayt (Float32 ile 36)
    assert.ok(pk.bayt.length < v.length * 4 / 1.9, 'en az ~2 kat küçülmeli');
    const g = H.coz(pk.gruplar, pk.bayt)[0];
    assert.strictEqual(g.adim, 9); assert.strictEqual(g.veri.length, v.length);
    for (let i = 0; i < v.length; i++) { const k = i % 9; yak(g.veri[i], v[i], k < 3 ? 0.0005 : k < 6 ? 0.008 : 0.003, 'i=' + i); }
  });
  await t('çizgi: normal saklanmaz, (0,0,1) geri gelir; boş grup atlanır', () => {
    const v = [0, 0, 0, 0, 0, 1, 0.1, 0.2, 0.3, 10.1234, -3.5, 2.25, 0, 0, 1, 0.1, 0.2, 0.3];
    const pk = H.paketle([{ tur: 'line', duzen: 'cizgi', veri: v }, { tur: 'don', duzen: 'cizgi', veri: [] }]);
    assert.strictEqual(pk.gruplar.length, 1); assert.deepStrictEqual(pk.gruplar[0].alan.map(a => a.ad), ['p', 'c']);
    const g = H.coz(pk.gruplar, pk.bayt)[0];
    yak(g.veri[9], 10.1234, 0.0005); yak(g.veri[10], -3.5, 1e-9); assert.deepStrictEqual([g.veri[3], g.veri[4], g.veri[5]], [0, 0, 1]);
  });
  await t('dokulu yüzey: uv aynen, teğet birim vektör; ek alanlar (doku kodu, eğim, saydamlık) taşınır', () => {
    const v = [1, 2, 3, 0, 0, 1, 12.75, -0.125, 2, 0, 0, 4, 5, 6, 0, 1, 0, 0.5, 0.25, 0, 0, 3, 7, 8, 9, 1, 0, 0, 1e-3, 3, 0, 0, 0];
    const pk = H.paketle([{ tur: 'mat', duzen: 'doku', veri: v, k: 'beton', bump: 0.4 }, { tur: 'trans', duzen: 'lit', veri: kutu(0, 0, 0, 1, 1, 1, [1, 1, 1]), al: 0.35 }]);
    const [m, tr] = H.coz(pk.gruplar, pk.bayt);
    assert.strictEqual(m.k, 'beton'); assert.strictEqual(m.bump, 0.4); assert.strictEqual(m.adim, 11); assert.strictEqual(tr.al, 0.35);
    yak(m.veri[6], 12.75, 1e-6); yak(m.veri[7], -0.125, 1e-6); yak(m.veri[8], 1, 0.01); yak(m.veri[9], 0, 1e-9); // teğet (2,0,0) → (1,0,0)
    assert.deepStrictEqual([m.veri[30], m.veri[31], m.veri[32]], [0, 0, 0]); // sıfır teğet sıfır kalır
    for (const a of pk.gruplar.flatMap(g => g.alan)) assert.strictEqual(a.off % 4, 0, 'hizalama');
  });
  await t('gzip + base64 gidiş-dönüş', async () => {
    const v = []; for (let i = 0; i < 40; i++) v.push(...kutu(i * 3, 0, 0, 2, 2, 3, [0.5, 0.6, 0.7]));
    const pk = H.paketle([{ tur: 'tri', duzen: 'lit', veri: v }]), sk = await H.sikistir(pk.bayt);
    assert.strictEqual(sk.sik, 'gzip'); assert.ok(sk.bayt.length < pk.bayt.length);
    const b = H.b64coz(H.b64(sk.bayt));
    const ac = new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    assert.deepStrictEqual(Buffer.from(ac), Buffer.from(pk.bayt));
    const g = H.coz(pk.gruplar, ac)[0]; yak(g.veri[g.veri.length - 9], v[v.length - 9], 0.0005);
  });
  await t('sayfa: tek dosya, CDN / dış bağlantı yok, betik sözdizimi geçerli, düğmeler var', () => {
    const pk = H.paketle([{ tur: 'tri', duzen: 'lit', veri: kutu(0, 0, 0, 1, 1, 1, [1, 0, 0]) }]);
    const S = { ad: 'Konya </script> terfi', gruplar: pk.gruplar, sik: '', dokular: {}, kam: null, gc: [0, 0], size: 1, zr: [0, 1], clip: null, bg: 0, izgara: true, tex: true, dalga: true, yazi: H.yazilar() };
    const SH = { VS: 'a', FS: 'b', TVS: 'c', TFS: 'd', WVS: 'e', WFS: 'f', BVS: 'g', BFS: 'h' };
    const html = H.sayfa(S, SH, H.b64(pk.bayt));
    assert.ok(/^<!doctype html>/i.test(html)); assert.ok(!/(src|href)=["']?https?:/i.test(html), 'dış kaynak olmamalı'); assert.ok(!/\bimport\s*\(|<script[^>]+src=/i.test(html));
    for (const id of ['bBas', 'bTum', 'bYuru', 'cv', 'veri']) assert.ok(html.includes('id="' + id + '"'), id);
    assert.strictEqual((html.match(/<\/script>/g) || []).length, 2, 'proje adı betiği kapatmamalı');
    const kod = /<script>\n([\s\S]*?)<\/script>/.exec(html)[1]; new vm.Script(kod); // sözdizimi
    assert.ok(html.includes('Başa dön'));
  });
  console.log(n + ' test geçti.');
})().catch(e => { console.error(e); process.exit(1); });

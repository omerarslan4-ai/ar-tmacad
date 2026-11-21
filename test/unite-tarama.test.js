/* Ünite (havuz) plan ve kesit taraması ve görünüm yenileme sırası (mimari.md 6c).
   Kesilen beton dolu gri; öbür malzemeler ve bina kesitleri kendi deseninde; elle / donuk görünüme dokunulmaz.
   Çalıştır: node test/unite-tarama.test.js */
'use strict';
const assert = require('assert');
globalThis.C = globalThis.C || {}; require('../app/cizim-kural.js');
const { siraliGuncelle, sonraCalistir, donukIzi, donukKorunan, canliDevret, yinelenenIdler, kesitTarifBul, paftaGorunumGv, taramaAnahtar } = require('../app/mimari-pafta.js');
const K = globalThis.C.cizimKural, R = K.MIMARI;
let n = 0; const t = async (ad, f) => { await f(); n++; console.log('✓ ' + ad); };

(async () => {
  await t('ünite betonu dolu gri; grobeton, tretuvar ve bina kuralı değişmez', () => {
    for (const m of ['B', 'D']) assert.deepStrictEqual(K.uniteTaramaSec(R, m), { pat: 'SOLID', ang: 0, sc: 1, katman: 'Solid' }, m);
    for (const m of ['G', 'TR:beton', 'TR:stab', 'TR:bord', 'F', undefined]) assert.strictEqual(K.uniteTaramaSec(R, m), null, String(m));
    assert.strictEqual(K.kesitTaramaSec(R, 'B').pat, 'ANSI36'); assert.strictEqual(K.kesitTaramaSec(R, 'G').pat, 'AR-CONC');
  });
  await t('kesilen mekanik parça beton sayılmaz', () => {
    assert.ok(K.uniteTaramaHedef(R, { type: 'hatch', smat: 'B', layer: 'KESIT_ANAEROBIK_HAVUZ_TARAMA' }));
    assert.strictEqual(K.uniteTaramaHedef(R, { type: 'hatch', smat: 'B', layer: 'PLAN+96.25_TARAMA_MEK_KAPAK' }), null);
    assert.strictEqual(K.uniteTaramaHedef(R, { type: 'hatch', smat: 'B', layer: 'KESIT_MEK_KAPAK_TARAMA' }), null);
  });
  await t('görünüm seçimi: katman adına değil kayda bakar; bina, elle ve donuk görünüm çıkar', () => {
    const h = (gv, layer, ek) => Object.assign({ type: 'hatch', gv, smat: 'B', pat: 'ANSI36', layer }, ek);
    const E = [h('UNITE', 'KESIT_BETON_TARAMA'), h('BINA', 'KESIT_GROBETON_TARAMA'), h('BINA2', 'KESIT_DUVAR_GAZBETON_TARAMA'), h('DONUK', 'KESIT_BETON_TARAMA'), h('ESKI', 'Solid', { pat: 'SOLID', monoRenk: true })];
    assert.deepStrictEqual(K.uniteTaramaGv(R, E, ['UNITE', 'DONUK', 'SILINMIS'], new Set(['DONUK'])).sort(), ['ESKI', 'UNITE']);
  });
  const kur = f0 => { const iz = { sonra: 0, log: [], hata: 0 }; return { iz, f: siraliGuncelle(f0, { liste: () => ['a', 'b', 'c'], sonra: () => iz.sonra++, log: k => iz.log.push(k), hata: () => iz.hata++, sessiz: fn => fn() }) }; };
  await t('yenileme: tek tek, hata öbürlerini durdurmaz, son düzeltme ve ileti bir kez', async () => {
    const yapilan = [], { iz, f } = kur(async ([id]) => { yapilan.push(id); if (id === 'b') throw new Error('x'); return 1; });
    assert.strictEqual(await f(), 2); assert.deepStrictEqual(yapilan, ['a', 'b', 'c']); assert.deepStrictEqual([iz.sonra, iz.log, iz.hata], [1, [2], 1]);
  });
  await t('yenileme: iki çağrı iç içe girmez; üretim yoksa son düzeltme çalışmaz', async () => {
    let acik = 0, enCok = 0; const a = kur(async () => { enCok = Math.max(enCok, ++acik); await new Promise(r => setTimeout(r, 1)); acik--; return 1; });
    await Promise.all([a.f(['a', 'b']), a.f(['c'])]); assert.strictEqual(enCok, 1); assert.strictEqual(a.iz.sonra, 2);
    const b = kur(async () => 0); assert.strictEqual(await b.f(), 0); assert.deepStrictEqual([b.iz.sonra, b.iz.log.length], [0, 0]);
  });
  await t('komut çalışırken: liste bölünmez, tek yeniden deneme; bitince tek ileti ve tek son düzeltme', async () => {
    let mesgul = true, f; const iz = { sonra: 0, log: [], tekrar: [], uret: [] };
    f = siraliGuncelle(async ([id]) => { iz.uret.push(id); return 1; }, { liste: () => ['a', 'b', 'c'], sonra: () => iz.sonra++, log: k => iz.log.push(k), hata: er => { throw er; }, sessiz: fn => fn(), mesgul: () => mesgul, tekrar: (ids, q) => iz.tekrar.push([ids, q]) });
    assert.strictEqual(await f(null, false), 0); assert.deepStrictEqual(iz.tekrar, [[null, false]]); assert.deepStrictEqual(iz.uret, []);
    mesgul = false; assert.strictEqual(await f(...iz.tekrar[0]), 3); assert.deepStrictEqual([iz.uret, iz.sonra, iz.log], [['a', 'b', 'c'], 1, [3]]);
  });
  await t('komut hata verse de son düzeltme çalışır, hata gizlenmez', async () => {
    let s = 0; await assert.rejects(sonraCalistir(async () => { throw new Error('x'); }, () => s++)(), /x/); assert.strictEqual(s, 1);
    assert.strictEqual(await sonraCalistir(async a => a + 1, () => s++)(1), 2); assert.strictEqual(s, 2);
  });
  await t('donuk görünüm: başka görünüm güncellenince ve iptalde korunur, kendisi üretilince kural alır', () => {
    const V = { d: { donuk: true }, a: {} }, h = (id, gv, canli) => ({ id, type: 'hatch', gv, canli }), E0 = [h(1, 'D', 'd'), h(2, 'A', 'a')], iz = donukIzi(E0, V);
    assert.deepStrictEqual([...donukKorunan(E0, iz)], ['D'], 'iptal: hiçbir şey üretilmedi');
    assert.deepStrictEqual([...donukKorunan([h(1, 'D', 'd'), h(3, 'A', 'a')], iz)], ['D'], 'yalnız başka görünüm üretildi');
    assert.deepStrictEqual([...donukKorunan([h(4, 'D'), h(2, 'A', 'a')], iz)], [], 'donuk görünüm yeniden üretildi (canli etiketi olmasa da)');
  });
  await t('güncelleme izi önce alınır, son düzeltmeye aynı iz gider (hata ve iptalde de)', async () => {
    const gelen = []; await assert.rejects(sonraCalistir(async () => { throw new Error('iptal'); }, x => gelen.push(x), () => 'iz')(), /iptal/); assert.deepStrictEqual(gelen, ['iz']);
    const iz = { s: [] }, f = siraliGuncelle(async () => 1, { liste: () => ['a'], once: () => 'iz2', sonra: x => iz.s.push(x), log: () => {}, hata: er => { throw er; }, sessiz: fn => fn() }); await f(); assert.deepStrictEqual(iz.s, ['iz2']);
  });
  await t('canlı kayıt devri: yalnız aynı ad ve aynı hat, nesnesiz kayıt; donuk taşınır', () => {
    const k = (nm, x, ek) => Object.assign({ cmd: 'KESITAL', tokens: [`${x},0,0`, `${x + 10},0,0`, `${x},1,0`, '5', nm, '300,300,0'] }, ek);
    const V = { yeni: k('A', 0), eski: k('A', 0.0001, { donuk: true }), baskaHat: k('A', 100, { donuk: true }), baskaAd: k('B', 0), duruyor: k('A', 0) };
    assert.strictEqual(canliDevret(V, 'yeni', new Set(['yeni', 'duruyor'])), 1);
    assert.deepStrictEqual(Object.keys(V).sort(), ['baskaAd', 'baskaHat', 'duruyor', 'yeni']); assert.strictEqual(V.yeni.donuk, true);
    const W = { yeni: k('A', 0), baska: k('A', 100, { donuk: true }) }; canliDevret(W, 'yeni', new Set(['yeni'])); assert.ok(W.baska); assert.ok(!W.yeni.donuk, 'başka hattın donuk bayrağı geçmez');
  });
  await t('çift oklu açıklama ve yazı teklenir; farklı yer ve farklı yazı kalır', () => {
    const y = (id, s, x) => ({ id, type: 'text', layer: 'YAZI', s, p: [x, 0, 0] }), o = (id, x) => ({ id, type: 'leader', layer: 'OK', pts: [[x, 0], [x + 1, 1]] });
    assert.deepStrictEqual(yinelenenIdler([y(1, 'KR1', 0), y(2, 'KR1', 0), y(3, 'KR1', 5), y(4, 'KR2', 0), o(5, 0), o(6, 0), o(7, 2), { id: 8, type: 'line' }]), [2, 6]);
  });
  await t('güncellenen kesit, ünite tarifindeki kesitle hattından eşlenir', () => {
    const K = [{ nm: 'A', a: [0, 0], b: [10, 0] }, { nm: 'B', a: [5, -1], b: [5, 9] }];
    assert.strictEqual(kesitTarifBul(K, { nm: 'Z', a: [5.0001, -1], b: [5, 9] }).nm, 'B'); assert.strictEqual(kesitTarifBul(K, { nm: 'A', a: [1, 0], b: [10, 0] }), null);
  });
  await t('pafta görünümleri: yalnız MİMARİ ve ünite mekanik paftaları korunur', () => {
    const L = [{ mimPafta: true, vps: [{ gvOnly: 'M1' }, {}] }, { uniteMek: 7, vps: [{ gvOnly: 'U1' }] }, { vps: [{ gvOnly: 'SERBEST' }] }];
    assert.deepStrictEqual([...paftaGorunumGv(L)].sort(), ['M1', 'U1']);
  });
  await t('görünüm üretildikten sonra hata çıkarsa son düzeltme yine bir kez çalışır, ileti yazılmaz', async () => {
    const { iz, f } = kur(async () => { throw new Error('sonradan'); }); assert.strictEqual(await f(), 0); assert.deepStrictEqual([iz.sonra, iz.log, iz.hata], [1, [], 3]);
  });
  await t('paftaya yerleşmiş görünüm canlıda yeniden üretilmez, atlandığı bildirilir', async () => {
    const uret = [], at = [], iz = { s: 0, l: [] }, f = siraliGuncelle(async ([id]) => { uret.push(id); return 1; }, { liste: () => ['a', 'b', 'c'], ayir: L => ({ serbest: L.filter(x => x !== 'b'), atlanan: 1 }), atlandi: (k, q) => at.push([k, q]), sonra: () => iz.s++, log: k => iz.l.push(k), hata: er => { throw er; }, sessiz: fn => fn() });
    assert.strictEqual(await f(null, false), 2); assert.deepStrictEqual([uret, at, iz.s, iz.l], [['a', 'c'], [[1, false]], 1, [2]]);
  });
  await t('tarama anahtarı: aynı sınır ve malzeme eşleşir, desen değişse de; başka sınır ya da malzeme ayrılır', () => {
    const h = (smat, x, pat) => ({ smat, pat, loops: [[[x, 0], [x + 2, 0], [x + 2, 1], [x, 1]]] });
    assert.strictEqual(taramaAnahtar(h('B', 1, 'ANSI36')), taramaAnahtar(h('B', 1, 'SOLID'))); assert.notStrictEqual(taramaAnahtar(h('B', 1)), taramaAnahtar(h('G', 1))); assert.notStrictEqual(taramaAnahtar(h('B', 1)), taramaAnahtar(h('B', 2)));
  });
  console.log(String.fromCharCode(10) + n + ' test geçti.');
})().catch(er => { console.error(er); process.exit(1); });

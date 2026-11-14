/* Disiplin kesitleri (app/gorunumler.js → kesitUret; firma kuralı 14.11.2026 ve denetim 14.11.2026):
   - Mimari kesit Mimari içerikli (KESITAL'e MIMARI=E: aks zinciri, doğrama detayı, korkuluk / çatı okları, gizli çizgi),
   - Mekanik ve Elektrik kesitinde yalnız gizli çizgi (GIZLI=E: arkadaki doğrama ve eleman örtülür),
   - Statik (ve öbürleri) eski KESITAL (anahtar yok).
   Bir kesit birden çok gruba gönderilince her tür ayrı görünüm; pafta penceresi kendi grubunun görünümünü gösterir; MIMARIPAFTA yalnız Mimari türünü yeniler.
   gorunumler.js küçük bir C taklidiyle yüklenir; KESITAL yerine kuyruğu kaydeden sahte komut.
   Çalıştır: node test/gorunum-disiplin.test.js */
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
let n = 0; const t = async (ad, f) => { await f(); n++; console.log('✓ ' + ad); };

const kur = () => {
  let id = 1; const kuyruk = [];
  const C = {
    M: {}, cmd: { queue: [] }, state: {}, doc: { ents: [], set: {}, layouts: [] }, up: s => String(s).toLocaleUpperCase('tr'),
    addCommand: () => { }, vpPrims: () => { }, extents: L => L.length ? [0, 0, 1, 1] : null, layoutFrame: () => ({ x0: 0, x1: 800, y1: 580, tbTop: 0 }),
    newLayout: (name) => { const L = { name, vps: [], f: {} }; C.doc.layouts.push(L); return L; },
    cmds: { KESITAL: { fn: async () => { const q = C.cmd.queue.slice(); kuyruk.push(q); const anah = q.filter(x => /=/.test(x)); C.doc.ents.push({ id: id++, type: 'pline', anah: anah.join(' ') }, { id: id++, type: 'kesitisaret', name: q[q.length - 2] }); } } },
  };
  const ctx = { window: { C }, C, console, setTimeout }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app', 'gorunumler.js'), 'utf8'), ctx);
  return { C, G: C.gorunumApi, kuyruk };
};
const v0 = (gruplar, ek) => Object.assign({ id: 'G1', tip: 'kesit', nm: 'A', a: [0, 0], b: [10, 0], sp: [5, 2], depth: 3, yer: [20, 0], olcek: 50, gruplar }, ek || {});

(async () => {
  await t('anahtar: Mimari → MIMARI=E, Mekanik / Elektrik → GIZLI=E, Statik → yok', async () => {
    const { G } = kur();
    assert.deepStrictEqual(['Mimari', 'Mekanik', 'Elektrik', 'Statik', 'Genel'].map(G.disTur), ['MIMARI', 'GIZLI', 'GIZLI', 'DUZ', 'DUZ']);
    assert.deepStrictEqual(Array.from(G.turler(v0(['Mimari', 'Statik', 'Mekanik', 'Elektrik']))), ['MIMARI', 'DUZ', 'GIZLI']);
    assert.deepStrictEqual(Array.from(G.turler(v0([], { kaynak: 'MIMARIPAFTA' }))), ['MIMARI']);
  });
  await t('ortak kesit (Mimari + Statik + Mekanik): her türe ayrı görünüm; Statik penceresi anahtarsız (eski) görünümü, Mekanik GIZLI=E görünümü gösterir; işaret tek', async () => {
    const { C, G, kuyruk } = kur(); const v = v0(['Mimari', 'Statik', 'Mekanik']);
    assert.ok(await G.kesitUret(v) > 0);
    assert.deepStrictEqual(kuyruk.map(q => q.filter(x => /=/.test(x)).join(' ')), ['MIMARI=E', '', 'GIZLI=E']);
    const anah = gv => C.doc.ents.filter(e => e.gv === gv && e.type === 'pline').map(e => e.anah).join();
    assert.strictEqual(anah(G.gvOf(v, 'Mimari')), 'MIMARI=E'); assert.strictEqual(anah(G.gvOf(v, 'Statik')), ''); assert.strictEqual(anah(G.gvOf(v, 'Mekanik')), 'GIZLI=E'); assert.strictEqual(anah(G.gvOf(v, 'Elektrik')), 'GIZLI=E');
    assert.strictEqual(C.doc.ents.filter(e => e.type === 'kesitisaret').length, 1, 'planda tek kesit işareti');
    for (const g of ['Mimari', 'Statik', 'Mekanik']) G.paftayaKoy(v, g);
    const vp = g => C.doc.layouts.flatMap(L => L.vps).find(q => q.disiplin === g);
    assert.strictEqual(vp('Statik').gvOnly, G.gvOf(v, 'Statik')); assert.notStrictEqual(vp('Statik').gvOnly, vp('Mimari').gvOnly);
  });
  await t('yalnız Statik kesiti: eski KESITAL (anahtarsız), tek görünüm', async () => {
    const { G, kuyruk } = kur(); const v = v0(['Statik']); await G.kesitUret(v);
    assert.deepStrictEqual(kuyruk.map(q => q.filter(x => /=/.test(x)).length), [0]); assert.ok(!v.gvD || !Object.keys(v.gvD).length);
  });
  await t('MIMARIPAFTA yenilemesi (yalniz MIMARI): Statik ve Mekanik görünümleri aynen kalır', async () => {
    const { C, G, kuyruk } = kur(); const v = v0(['Mimari', 'Statik', 'Mekanik']); await G.kesitUret(v);
    const once = gv => C.doc.ents.filter(e => e.gv === gv).map(e => e.id).join();
    const st0 = once(G.gvOf(v, 'Statik')), mk0 = once(G.gvOf(v, 'Mekanik')), mi0 = once(G.gvOf(v, 'Mimari'));
    kuyruk.length = 0; G.silTur(v, 'MIMARI'); await G.kesitUret(v, 'MIMARI');
    assert.deepStrictEqual(kuyruk.map(q => q.filter(x => /=/.test(x)).join(' ')), ['MIMARI=E']);
    assert.strictEqual(once(G.gvOf(v, 'Statik')), st0); assert.strictEqual(once(G.gvOf(v, 'Mekanik')), mk0); assert.notStrictEqual(once(G.gvOf(v, 'Mimari')), mi0);
  });
  console.log(`\n${n} test geçti.`);
})().catch(e => { console.error(e); process.exit(1); });

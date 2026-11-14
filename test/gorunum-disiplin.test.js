/* Disiplin kesitleri (app/gorunumler.js → kesitUret). Kullanıcı kararı 14.11.2026 (tasarim-standartlari.md "Paftalama ve çizim" 1. madde):
   "Statik, mekanik ve elektrik kesit istemiyorum; sadece mimari kesit alınacak."
   - kesit görünümü yalnız Mimari türünde (KESITAL'e MIMARI=E); Statik / Mekanik / Elektrik türü (v.gvD) üretilmez, proje açılınca da eklenmez,
   - eski projelerde: otomatik kesit paftalarındaki disiplin pencereleri ve hiçbir pencerenin göstermediği tür görünümleri temizlenir (tekDisiplinTemizle);
     elle düzeltilmiş görünüm (v.elle), elle işaretli pafta (L.elle) ve başka içerikli paftadaki pencere kalır.
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
  await t('tür: kesit her zaman yalnız MIMARI (hangi gruba gönderilmiş olursa olsun); disTur değişmedi', async () => {
    const { G } = kur();
    assert.deepStrictEqual(['Mimari', 'Mekanik', 'Elektrik', 'Statik', 'Genel'].map(G.disTur), ['MIMARI', 'GIZLI', 'GIZLI', 'DUZ', 'DUZ']);
    assert.deepStrictEqual(Array.from(G.turler(v0(['Mimari', 'Statik', 'Mekanik', 'Elektrik']))), ['MIMARI']);
    assert.deepStrictEqual(Array.from(G.turler(v0(['Statik']))), ['MIMARI']);
    assert.deepStrictEqual(Array.from(G.turler(v0([], { kaynak: 'MIMARIPAFTA' }))), ['MIMARI']);
  });
  await t('ortak kesit (Mimari + Statik + Mekanik): yalnız Mimari görünümü üretilir (MIMARI=E), gvD yok, işaret tek', async () => {
    const { C, G, kuyruk } = kur(); const v = v0(['Mimari', 'Statik', 'Mekanik']);
    assert.ok(await G.kesitUret(v) > 0);
    assert.deepStrictEqual(kuyruk.map(q => q.filter(x => /=/.test(x)).join(' ')), ['MIMARI=E']);
    assert.ok(!v.gvD || !Object.keys(v.gvD).length, 'disiplin türü görünümü yok');
    assert.strictEqual(G.gvOf(v, 'Statik'), v.gv); assert.strictEqual(C.doc.ents.filter(e => e.type === 'kesitisaret').length, 1);
  });
  await t('eski proje: eksik disiplin görünümü üretilmez', async () => {
    const { C, G, kuyruk } = kur(); const v = v0(['Mimari', 'Statik']); C.doc.set.gorunumler = [v]; await G.kesitUret(v); kuyruk.length = 0;
    assert.deepStrictEqual(Array.from(G.eksikTurler(v)), []); assert.strictEqual(await G.eksikleriTamamla(), 0); assert.strictEqual(kuyruk.length, 0);
  });
  await t('temizlik: otomatik STATİK kesit paftası silinir, kullanılmayan Statik görünümü silinir; elle görünüm, elle pafta ve başka içerikli Mekanik paftası kalır', async () => {
    const { C, G } = kur();
    const v = v0(['Mimari', 'Statik', 'Mekanik'], { gv: 'VM', gvD: { DUZ: 'VS', GIZLI: 'VK' }, yerD: { DUZ: [0, 0], GIZLI: [0, 0] } });
    const ve = v0(['Mimari', 'Statik'], { id: 'G2', nm: 'B', gv: 'VM2', gvD: { DUZ: 'VS2' }, elle: true });
    C.doc.set.gorunumler = [v, ve];
    C.doc.ents.push({ id: 1, gv: 'VM' }, { id: 2, gv: 'VS' }, { id: 3, gv: 'VK' }, { id: 4, gv: 'VM2' }, { id: 5, gv: 'VS2' });
    C.doc.layouts.push(
      { name: 'MİMARİ-02 KESİTLER', grp: 'Mimari', mimPafta: 'M2', vps: [{ gorunum: 'G1', gvOnly: 'VM' }] },
      { name: 'STATİK — KESİTLER 1', grp: 'Statik', kesitPaftasi: true, vps: [{ gorunum: 'G1', gvOnly: 'VS', disiplin: 'Statik' }] },
      { name: 'STATİK — KESİTLER 2', grp: 'Statik', kesitPaftasi: true, vps: [{ gorunum: 'G2', gvOnly: 'VS2', disiplin: 'Statik' }] },
      { name: 'MEKANİK — ISITMA', grp: 'Mekanik', vps: [{ gorunum: 'G1', gvOnly: 'VK', disiplin: 'Mekanik' }, { gvOnly: 'MT1' }] },
      { name: 'STATİK — KESİTLER 3 (elle)', grp: 'Statik', kesitPaftasi: true, elle: true, vps: [{ gorunum: 'G1', gvOnly: 'VS', disiplin: 'Statik' }] });
    const r = G.tekDisiplinTemizle();
    assert.deepStrictEqual(Array.from(r.pafta), ['STATİK — KESİTLER 1'], 'yalnız elle olmayan, boşalan otomatik kesit paftası');
    assert.strictEqual(r.pencere, 1);
    assert.ok(C.doc.layouts.some(L => L.name === 'STATİK — KESİTLER 2'), 'elle düzeltilmiş görünümün penceresi kalır');
    assert.ok(C.doc.layouts.some(L => L.name === 'MEKANİK — ISITMA' && L.vps.length === 2), 'başka içerikli pafta değişmez');
    assert.ok(v.gvD && v.gvD.GIZLI === 'VK' && v.gvD.DUZ === 'VS', 'elle işaretli paftadaki Statik ve Mekanik paftasındaki görünümler kalır');
    /* elle paftayı da kaldırınca Statik görünümü artık kullanılmıyor */
    C.doc.layouts = C.doc.layouts.filter(L => !L.elle); const r2 = G.tekDisiplinTemizle();
    assert.strictEqual(r2.gorunum, 1); assert.ok(!('DUZ' in v.gvD) && !(v.yerD && v.yerD.DUZ)); assert.ok(!C.doc.ents.some(e => e.gv === 'VS'), 'Statik görünüm nesneleri silindi');
    assert.ok(C.doc.ents.some(e => e.gv === 'VS2'), 'elle görünüme dokunulmaz'); assert.deepStrictEqual(Array.from(v.gruplar), ['Mimari', 'Mekanik']);
  });
  await t('MIMARIPAFTA yenilemesi ve GORUNUMGUNCELLE: başka paftada gösterilen eski Mekanik görünümü aynen kalır, yeni tür üretilmez', async () => {
    const { C, G, kuyruk } = kur(); const v = v0(['Mimari', 'Mekanik'], { gv: 'VM', gvD: { GIZLI: 'VK' } }); C.doc.set.gorunumler = [v];
    C.doc.ents.push({ id: 90, gv: 'VK' }); C.doc.layouts.push({ name: 'MEKANİK — ISITMA', grp: 'Mekanik', vps: [{ gorunum: 'G1', gvOnly: 'VK', disiplin: 'Mekanik' }] });
    G.silTur(v, 'MIMARI'); await G.kesitUret(v, 'MIMARI'); await G.kesitUret(v);
    assert.deepStrictEqual(kuyruk.map(q => q.filter(x => /=/.test(x)).join(' ')), ['MIMARI=E', 'MIMARI=E']);
    assert.ok(C.doc.ents.some(e => e.gv === 'VK') && v.gvD.GIZLI === 'VK');
  });
  console.log(`\n${n} test geçti.`);
})().catch(e => { console.error(e); process.exit(1); });

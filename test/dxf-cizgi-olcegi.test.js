/* DXF çizgi tipi ölçeği (app/io_dxf.js başlığı + app/mimari-pafta.js → dxfCizgiOlcegi).
   Çokal R2 örnekleri cm çizilmiş, 1/50 paftada $LTSCALE 20, $PSLTSCALE 0 (k1, k5, k6). Program metre çizer ve desenleri kâğıt mm'si tutar:
   1/50'de $LTSCALE = 50 / 1000 = 0,05, $PSLTSCALE 0 → aks deseni 12 mm × 0,05 = 0,6 m model = 1/50 kâğıtta 12 mm (örnekteki gibi: 24 × 20 × 0,125 cm = 60 cm).
   Başka ölçekli pencere (1/20 detay): nesne çizgi tipi ölçeği (kod 48) = 20 / 50 = 0,4. Seçenek verilmeyen çıktı (öbür disiplinler) eskisi gibi.
   Çalıştır: node test/dxf-cizgi-olcegi.test.js */
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../app/mimari-pafta.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

/* io_dxf.js'yi küçük bir C taklidiyle yükle */
const kur = (kural) => {
  const layers = { '0': { name: '0', color: 7, lt: 'CONTINUOUS', lw: -1, on: true }, AKS: { name: 'AKS', color: 1, lt: 'CENTER', lw: 13, on: true } };
  const ents = [{ id: 1, type: 'line', layer: 'AKS', a: [0, 0, 0], b: [10, 0, 0], color: 256, lt: 'BYLAYER', lw: -1, gv: 'D1' }, { id: 2, type: 'line', layer: 'AKS', a: [0, 5, 0], b: [10, 5, 0], color: 256, lt: 'BYLAYER', lw: -1, gv: 'P1' }];
  const C = {
    M: {}, T: { line: { prims: e => [{ k: 'L', a: e.a, b: e.b }] } }, LT: { CONTINUOUS: { d: 'Solid', p: [] }, CENTER: { d: 'Center', p: [12, -1.5, 0, -1.5] }, DASHED: { d: 'Dashed', p: [2, -1] }, HIDDEN: { d: 'Hidden', p: [2, -1] }, PHANTOM: { d: 'Phantom', p: [5, -1, 1, -1] } },
    doc: { layers, ents, set: { ltscale: 0.1, anno: 50, textH: 2.5 }, cur: { layer: '0' }, layouts: [
      { name: 'P', grp: 'Mimari', vps: [{ x: 0, y: 0, w: 300, h: 100, cx: 5, cy: 0, scale: 20, gvOnly: 'D1' }, { x: 0, y: 200, w: 600, h: 100, cx: 5, cy: 5, scale: 50, gvOnly: 'P1' }], pw: 841, ph: 594 }] },
    layer: nm => layers[nm] || { on: true }, meshes: () => null, prims: e => C.T[e.type].prims(e), annoH: v => v * 0.05, ascii: s => s,
    bbox: e => [Math.min(e.a[0], e.b[0]), Math.min(e.a[1], e.b[1]), Math.max(e.a[0], e.b[0]), Math.max(e.a[1], e.b[1])],
    extents: L => { if (!L.length) return null; const b = [Infinity, Infinity, -Infinity, -Infinity]; for (const e of L) { const q = C.bbox(e); b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[2]); b[3] = Math.max(b[3], q[3]); } return b; },
    warn: () => { }, log: () => { }, paperSize: L => ({ w: L.pw, h: L.ph }), titlePrims: () => [],
  };
  const ctx = { window: { C }, C, console }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app', 'io_dxf.js'), 'utf8'), ctx);
  if (kural) { // çizim kuralları (Çokal pafta stili açık: eski projelerde de varsayılan) — app/cizim-kural.js + app/cizim-kural-uygula.js
    Object.assign(C.LT, { HIDDEN: { d: 'Hidden', p: [6.35, -3.175] }, CENTER: { d: 'Center', p: [31.75, -6.35, 6.35, -6.35] } }); // app/core.js genel desenleri
    Object.assign(C, { pstil: () => ({}), ensureLayer: (nm, c, lt, lw) => (layers[nm] = layers[nm] || { name: nm, color: c, lt, lw, on: true }), addCommand: () => { }, on: () => { }, emit: () => { } });
    for (const f of ['cizim-kural.js', 'cizim-kural-uygula.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app', f), 'utf8'), ctx); }
  return C;
};
const baslik = (txt, ad) => { const L = txt.split(/\r?\n/); const i = L.indexOf(ad); return i >= 0 ? L[i + 2] : null; };
const kod48 = txt => { const L = txt.split(/\r?\n/).map(q => q.trim()), o = []; let tip = ''; for (let i = 0; i + 1 < L.length; i += 2) { if (L[i] === '0') tip = L[i + 1]; if (tip === 'LINE' && L[i] === '48') o.push(+L[i + 1]); } return o; }; // VIEWPORT'un kendi 48 kodu sayılmaz

t('dxfCizgiOlcegi: 1/50 → LTSCALE 0,05, PSLTSCALE 0; 1/25 → 0,025; 1/100 → 0,1', () => {
  assert.deepStrictEqual(P.dxfCizgiOlcegi(50), { ltscale: 0.05, psltscale: 0, celtOlcek: 50 });
  assert.strictEqual(P.dxfCizgiOlcegi(25).ltscale, 0.025); assert.strictEqual(P.dxfCizgiOlcegi(100).ltscale, 0.1);
  // aks deseni (kâğıt mm 12) model sekmesinde: 12 × 0,05 = 0,6 m; Çokal: 24 × 20 (LTSCALE) × 0,125 (nesne) = 60 cm
  assert.strictEqual(+(12 * P.dxfCizgiOlcegi(50).ltscale).toFixed(6), 0.6); assert.strictEqual(24 * 20 * 0.125 / 100, 0.6);
});

const C = kur();
t('io_dxf: seçenek yoksa başlık eskisi gibi ($LTSCALE = çizim ayarı, $PSLTSCALE 1, kod 48 yok) — öbür disiplinlerin çıktısı değişmez', () => {
  const txt = C.dxfWrite({ plain: '2b', withLayouts: true, grp: 'Statik' });
  assert.strictEqual(baslik(txt, '$LTSCALE'), '0.1'); assert.strictEqual(baslik(txt, '$PSLTSCALE'), '1'); assert.deepStrictEqual(kod48(txt), []);
});
t('io_dxf: Mimari seçeneğiyle $LTSCALE 0,05, $PSLTSCALE 0; 1/20 penceredeki nesneye kod 48 = 0,4, 1/50 penceredekine yok', () => {
  const txt = C.dxfWrite(Object.assign({ plain: '2b', withLayouts: true, grp: 'Mimari' }, P.dxfCizgiOlcegi(50)));
  assert.strictEqual(baslik(txt, '$LTSCALE'), '0.05'); assert.strictEqual(baslik(txt, '$PSLTSCALE'), '0');
  assert.deepStrictEqual(kod48(txt), [0.4]);
});

const eq = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b)); // vm bağlamındaki diziler için
const K = kur(true), once = { HIDDEN: K.LT.HIDDEN.p.slice(), CENTER: K.LT.CENTER.p.slice() };
t('çizim kuralları yüklüyken: genel çizgi tipi desenleri değişmez (HIDDEN 6,35 / 3,175); Mimari desenleri ayrı adla (HIDDEN_M 2 / 1, ACAD_ISO04W100_M 12 / 1,5)', () => {
  eq(K.LT.HIDDEN.p, once.HIDDEN); eq(K.LT.CENTER.p, once.CENTER);
  eq(K.LT.HIDDEN_M.p, [2, -1]); eq(K.LT.ACAD_ISO04W100_M.p, [12, -1.5, 0, -1.5]);
  eq(K.mimariLtDesen().HIDDEN, [2, -1]);
});
t('çizim kuralları yüklüyken: TESISATDXF benzeri (ents, plain 2b, grup yok) ve bütün çizimin 2B DXF\'i eskisi gibi — $LTSCALE çizim ayarı, $PSLTSCALE 1, kod 48 yok, HIDDEN deseni genel', () => {
  for (const o of [{ ents: K.doc.ents, plain: '2b', withLayouts: true }, { plain: '2b', withLayouts: true }]) {
    const txt = K.dxfWrite(o); assert.strictEqual(baslik(txt, '$LTSCALE'), '0.1'); assert.strictEqual(baslik(txt, '$PSLTSCALE'), '1'); assert.deepStrictEqual(kod48(txt), []);
    const L = txt.split(/\r?\n/), i = L.indexOf('HIDDEN'); if (i >= 0) { const j = L.indexOf('49', i); assert.strictEqual(+L[j + 1], 6.35); } }
});
t('pafta penceresi çizgi tipi ölçeği: varsayılanda ölçek / 1000 (1/50 → 0,05); kullanıcı LTSCALE\'i 2 katına çıkarırsa 2 kat', () => {
  K.doc.set.ltscale = 0.05; assert.strictEqual(+K.vpCizgiOlcegi(50).toFixed(9), 0.05); assert.strictEqual(+K.vpCizgiOlcegi(20).toFixed(9), 0.02);
  K.doc.set.ltscale = 0.1; assert.strictEqual(+K.vpCizgiOlcegi(50).toFixed(9), 0.1);
});

t('Mimari ekran desenleri (_M) DXF\'e hiç gitmez: katman HIDDEN_M → HIDDEN; Çokal ve KLASİK stilde, grup verilerek ve verilmeden', () => {
  K.doc.layers.GORUNEN_GIZLI = { name: 'GORUNEN_GIZLI', color: 8, lt: 'HIDDEN_M', lw: 15, on: true };
  const lt = txt => { const L = txt.split(/\r?\n/).map(q => q.trim()), o = []; for (let i = 0; i + 3 < L.length; i += 2) if (L[i] === '0' && L[i + 1] === 'LTYPE') { for (let j = i + 2; j < i + 40 && j + 1 < L.length; j += 2) if (L[j] === '2') { o.push(L[j + 1]); break; } } return o; };
  for (const st of [() => ({}), () => null]) { K.pstil = st;
    for (const o of [{ plain: '2b', withLayouts: true }, Object.assign({ plain: '2b', withLayouts: true, grp: 'Mimari' }, P.dxfCizgiOlcegi(50))]) {
      const txt = K.dxfWrite(o), adlar = lt(txt); assert.ok(adlar.length > 0 && !adlar.some(a => /_M$/.test(a)), adlar.join(',')); assert.ok(!/HIDDEN_M/.test(txt), '_M adı yok'); } }
  K.pstil = () => ({}); delete K.doc.layers.GORUNEN_GIZLI;
});

console.log(`\n${n} test geçti.`);

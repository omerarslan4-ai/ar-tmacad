/* Statik testleri için ortak ortam (test dosyası değildir; test/statik-*.test.js dosyaları kullanır).
   ArıtmaCAD tarafı : gerçek app/statik-model.js + app/statik-oval.js bir "C" taklidiyle yüklenir; perde eksen hesabı (faceOffs / segFrames)
                      app/insaat.js kaynağından aynen alınır. modelCevir(doc) → STATIKMODEL komutunun statik penceresine gönderdiği veri.
   Pencere tarafı   : app/hesap/statik-*.js dosyaları tarayıcı olmadan yüklenir (document / FORM taklidi). pencere() → STATIK (P).
   uygula(S, d)     : statik.html modelUygula + kabuk sarmalayıcısının yaptığı işin arayüzsüz karşılığı (P.modelKotUygula dahil). */
'use strict';
const fs = require('fs'), path = require('path'), KOK = path.join(__dirname, '..');
const depo = {};
globalThis.window = globalThis;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: { getItem: k => (k in depo ? depo[k] : null), setItem: (k, v) => { depo[k] = String(v); }, removeItem: k => { delete depo[k]; } } });
if (!globalThis.addEventListener) globalThis.addEventListener = () => { };

/* ---------- ArıtmaCAD (model) tarafı ---------- */
let C = null;
const modelOrtam = () => {
  if (C) return C;
  const M = {};
  M.dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  M.polyArea = pts => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  M.segDist = (q, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(q[0] - a[0] - dx * t, q[1] - a[1] - dy * t); };
  const logs = [];
  C = globalThis.C = {
    M, T: {}, cmds: {}, doc: null, sel: [], state: {}, logs, cmd: {}, I: {},
    addCommand: (names, d, fn) => { const c = { fn }; names.forEach(n => { C.cmds[n] = c; }); },
    layer: () => ({ on: true }), warn: s => logs.push('UYARI: ' + s), log: s => logs.push('LOG: ' + s), changed: () => { }, remove: () => { }, touch: () => { }, begin: () => { },
    byId: id => C.doc.ents.find(e => e.id === id),
    pointInPoly: (q, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; },
    bbox: e => { const ps = e.pts || [e.p, e.a, e.b].filter(Boolean), xs = ps.map(p => p[0]), ys = ps.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; },
    meshes: () => null,
  };
  // perde yüz ötelemeleri ve parça çerçeveleri: insaat.js içindeki kaynak metin (aynı hesap)
  const src = fs.readFileSync(path.join(KOK, 'app/insaat.js'), 'utf8').split('\n'), a = src.findIndex(l => /const faceOffs = e =>/.test(l)), b = src.findIndex(l => /const openingsOf = /.test(l));
  if (a < 0 || b < a) throw new Error('statik-ortam: app/insaat.js içinde faceOffs / segFrames bulunamadı (test ortamını güncelleyin)');
  C.yapiCakisma = require(path.join(KOK, 'app/yapi-cakisma.js')); // net eleman hacimleri (statik eleman listesi)
  C._ins = new Function('M', 'const p2 = q => [q[0], q[1]];\n' + src.slice(a, b).join('\n') + '\nreturn { faceOffs, segFrames };')(M);
  require(path.join(KOK, 'app/statik-model.js'));
  require(path.join(KOK, 'app/statik-oval.js'));
  return C;
};
/* doc: { ents, set, … } (ör. araclar/konya-terfi-uret.js › uret().doc) → STATIKMODEL'in gönderdiği veri */
const modelCevir = (doc, o) => {
  const c = modelOrtam(); c.doc = JSON.parse(JSON.stringify(doc)); c.sel = []; c.logs.length = 0;
  if (o && o.kabuk === false) c.doc.set.statikKabuk = false;
  delete depo['aritmacad.statik.model'];
  c.cmds.STATIKMODEL.fn(c.I, c);
  return { d: JSON.parse(depo['aritmacad.statik.model'] || 'null'), logs: c.logs.slice(), C: c };
};

/* ---------- statik penceresi tarafı ---------- */
let P = null;
const pencere = () => {
  if (P) return P;
  const el = () => ({ innerHTML: '', textContent: '', style: {}, disabled: false, value: '', onclick: null, insertAdjacentHTML() { }, querySelector() { return null; }, querySelectorAll() { return []; }, appendChild() { }, remove() { } });
  globalThis.STATIK = globalThis.STATIK || {};
  globalThis.document = { head: el(), body: el(), addEventListener() { }, querySelector: () => el(), querySelectorAll: () => [], getElementById: () => el(), createElement: () => el() };
  Object.assign(globalThis, { S: undefined, R: null, RC: null, FORM: [], F: () => ({}), buildForm: () => { }, changed: () => { }, save: () => { }, onizle: () => { }, hepsi: () => { }, modelUygula: () => { }, $: () => el(), rapor: () => { }, specAl: () => [], goster: () => { }, hesapla: () => { }, oner: () => { }, cizimeAktar: () => { }, dxfIndir: () => { }, cerGoster: () => { }, cerVar: () => !!(globalThis.S && globalThis.S.cer), f2: (v, d = 2) => (v == null || !isFinite(v) ? '—' : (+v).toFixed(d).replace('.', ',')), alert: s => { throw new Error('alert: ' + s); } });
  const H = path.join(KOK, 'app/hesap');
  for (const f of ['statik-plak', 'statik-motor', 'statik-cizim', 'statik-cerceve', 'statik-rapor-dsi', 'statik-pafta-dsi', 'statik-aradoseme', 'statik-tbdy-rapor', 'statik-cerceve3b', 'statik-guse', 'statik-kolon-pafta', 'statik-cerceve-perspektif', 'statik-kabuk', 'statik-kabuk-arayuz', 'statik-kabuk-rapor', 'statik-kabuk-pafta', 'statik-kabuk-donati', 'statik-yapi-turu'])
  { require(path.join(H, f + '.js')); if (f === 'statik-motor') globalThis.S = globalThis.STATIK.ornekSaray(); } // pencere girdisi S: rapor / pafta eklentileri yüklenirken okur
  P = globalThis.STATIK; return P;
};
/* modeli pencere girdisine (S) uygular — statik.html modelUygula ile aynı sıra */
const uygula = (S, d) => {
  const p = pencere();
  if (d.geo) { p.modelKotUygula(S, d); S.koken = d.koken; S.suYapisi = true; } else S.suYapisi = false;
  if (d.cerceve) S.cer = { kolonlar: d.cerceve.kolonlar, kirisler: d.cerceve.kirisler, dosemeler: d.cerceve.dosemeler, perdeler: d.cerceve.perdeler, ayar: Object.assign(p.cerceveVars(), d.cerceve.ayar || {}) }; else S.cer = null;
  if (d.cerceve && d.cerceve.ayar && +d.cerceve.ayar.SDS > 0) S.dep = Object.assign(S.dep || {}, { SDS: +d.cerceve.ayar.SDS }); // projeye kayıtlı deprem ayarı
  if (d.kabuk) { S.kabuk = d.kabuk; S.mod = 'kabuk'; S.suYapisi = false; if (d.kabuk.wmax > 0) S.tas.wmax = d.kabuk.wmax; if (S.tas.dH == null) S.tas.dH = 0.3; } else { S.mod = 'dik'; delete S.kabuk; }
  if (p.yapiSecim) { S.yapi = p.yapiSecim(d); S.hacim = d.hacim || null; p.statikAyarUygula(S, d); } // statik-yapi-turu.js eklentisi (yapı türü, projeye kayıtlı zemin / deprem / kot)
  return S;
};
const konyaDoc = () => require(path.join(KOK, 'araclar/konya-terfi-uret.js')).uret().doc;

module.exports = { modelCevir, pencere, uygula, konyaDoc, KOK };

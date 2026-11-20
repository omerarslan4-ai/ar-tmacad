/* ArıtmaCAD — çekirdek: matematik, renkler, çizgi tipleri, belge modeli, geri al */
(function (C) {
  'use strict';
  const M = C.M = {};
  M.EPS = 1e-9;
  M.add = (a, b) => [a[0] + b[0], a[1] + b[1], (a[2] || 0) + (b[2] || 0)];
  M.sub = (a, b) => [a[0] - b[0], a[1] - b[1], (a[2] || 0) - (b[2] || 0)];
  M.mul = (a, s) => [a[0] * s, a[1] * s, (a[2] || 0) * s];
  M.dot = (a, b) => a[0] * b[0] + a[1] * b[1] + (a[2] || 0) * (b[2] || 0);
  M.cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  M.len = a => Math.hypot(a[0], a[1], a[2] || 0);
  M.dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], (a[2] || 0) - (b[2] || 0));
  M.dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  M.norm = a => { const l = M.len(a) || 1; return [a[0] / l, a[1] / l, (a[2] || 0) / l]; };
  M.lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * t];
  M.ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  M.polar = (p, ang, d) => [p[0] + Math.cos(ang) * d, p[1] + Math.sin(ang) * d, p[2] || 0];
  M.p3 = p => [p[0], p[1], p[2] || 0];
  M.deg = r => r * 180 / Math.PI;
  M.rad = d => d * Math.PI / 180;
  M.perp = a => { // herhangi bir dik birim vektör
    const t = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    return M.norm(M.cross(t, a));
  };
  M.segDist = (p, a, b) => { // 2B nokta-doğru parçası uzaklığı
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  M.segInt = (a, b, c, d) => { // iki doğru parçasının kesişimi (2B)
    const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
    const den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-12) return null;
    const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
    const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    return { p: [a[0] + t * r[0], a[1] + t * r[1], 0], t, u };
  };
  M.lineCircle = (a, b, c, r) => { // doğru (sonsuz) ile çember kesişimi, t değerleri
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const fx = a[0] - c[0], fy = a[1] - c[1];
    const A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), Cc = fx * fx + fy * fy - r * r;
    const D = B * B - 4 * A * Cc;
    if (D < 0 || !A) return [];
    const sq = Math.sqrt(D);
    return [(-B - sq) / (2 * A), (-B + sq) / (2 * A)];
  };
  /* eğri bölme: kiriş hatası en fazla ~1 mm (büyük yarıçapta r/5000), açı adımı en fazla 11.25° */
  M.arcStep = r => { r = Math.abs(r) || 1; const err = Math.max(0.0008, r * 2e-4); return Math.min(Math.PI / 16, 2 * Math.acos(Math.max(-1, 1 - err / r))); };
  M.circN = (r, min = 48, max = 360) => Math.max(min, Math.min(max, Math.ceil(2 * Math.PI / M.arcStep(r) / 4) * 4));
  M.normAng = a => { a %= 2 * Math.PI; return a < 0 ? a + 2 * Math.PI : a; };
  M.angIn = (a, a0, a1) => { // a, a0'dan a1'e (saat yönü tersi) aralığında mı
    a = M.normAng(a - a0); const e = M.normAng(a1 - a0) || 2 * Math.PI; return a <= e + 1e-9;
  };
  M.polyArea = pts => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  M.fmt = (v, d = 2) => {
    if (!isFinite(v)) return '?';
    let s = (+v).toFixed(d);
    if (s === '-0.00' || /^-0\.?0*$/.test(s)) s = s.slice(1);
    return s;
  };

  /* ---------- AutoCAD renk dizini (ACI) ---------- */
  const ACI = C.ACI = [];
  (function () {
    const base = [[0, 0, 0], [255, 0, 0], [255, 255, 0], [0, 255, 0], [0, 255, 255], [0, 0, 255], [255, 0, 255], [255, 255, 255], [128, 128, 128], [192, 192, 192]];
    for (let i = 0; i < 10; i++) ACI[i] = base[i];
    const vs = [1, 1, 0.65, 0.65, 0.5, 0.5, 0.3, 0.3, 0.15, 0.15];
    for (let i = 10; i < 250; i++) {
      const h = Math.floor((i - 10) / 10) * 15, r = (i - 10) % 10;
      const v = vs[r], s = r % 2 ? 0.5 : 1;
      const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
      let rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
      ACI[i] = rgb.map(q => Math.round((q + m) * 255));
    }
    [51, 91, 132, 173, 214, 255].forEach((g, k) => { ACI[250 + k] = [g, g, g]; });
  })();
  C.aciCss = (i, darkBg = true) => {
    if (i === 7) return darkBg ? '#ffffff' : '#000000';
    const c = ACI[i] || [255, 255, 255];
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
  C.aciRgb = i => (ACI[i] || [255, 255, 255]);
  C.rgbToAci = (r, g, b) => {
    let best = 7, bd = 1e9;
    for (let i = 1; i < 256; i++) { const c = ACI[i]; const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  };
  C.COLOR_NAMES = { kirmizi: 1, sari: 2, yesil: 3, camgobegi: 4, cyan: 4, mavi: 5, mor: 6, magenta: 6, beyaz: 7, siyah: 7, gri: 8, acikgri: 9, turuncu: 30, kahverengi: 34, red: 1, yellow: 2, green: 3, blue: 5, white: 7, gray: 8, grey: 8, orange: 30, bylayer: 256, katman: 256, katmandan: 256, byblock: 0 };

  /* ---------- Çizgi tipleri (acadiso.lin, mm) ---------- */
  C.LT = {
    CONTINUOUS: { d: 'Solid line', p: [] },
    DASHED: { d: 'Dashed __ __ __', p: [12.7, -6.35] },
    HIDDEN: { d: 'Hidden _ _ _ _', p: [6.35, -3.175] },
    CENTER: { d: 'Center ____ _ ____', p: [31.75, -6.35, 6.35, -6.35] },
    PHANTOM: { d: 'Phantom ____ _ _ ____', p: [31.75, -6.35, 6.35, -6.35, 6.35, -6.35] },
    DOT: { d: 'Dot . . . .', p: [0, -6.35] },
    DASHDOT: { d: 'Dash dot __ . __ .', p: [12.7, -6.35, 0, -6.35] },
    DIVIDE: { d: 'Divide __ . . __', p: [12.7, -6.35, 0, -6.35, 0, -6.35] },
    BORDER: { d: 'Border __ __ . __', p: [12.7, -6.35, 12.7, -6.35, 0, -6.35] },
  };
  C.LT_ALIAS = { SUREKLI: 'CONTINUOUS', DUZ: 'CONTINUOUS', KESIKLI: 'DASHED', GIZLI: 'HIDDEN', EKSEN: 'CENTER', NOKTALI: 'DOT', NOKTAKESIK: 'DASHDOT' };
  C.LW_VALUES = [0, 5, 9, 13, 15, 18, 20, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140, 158, 200, 211];
  C.snapLw = mm => { const v = Math.round(mm * 100); let best = 0, bd = 1e9; for (const w of C.LW_VALUES) { if (Math.abs(w - v) < bd) { bd = Math.abs(w - v); best = w; } } return best; };

  /* ---------- Türkçe karakter sadeleştirme ---------- */
  C.ascii = s => String(s).replace(/[çÇğĞıİöÖşŞüÜ]/g, ch => ({ ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U' })[ch]);
  C.up = s => C.ascii(String(s)).toUpperCase();

  /* ---------- Olay sistemi ---------- */
  const listeners = {};
  C.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  C.emit = (ev, ...a) => { (listeners[ev] || []).forEach(f => { try { f(...a); } catch (e) { console.error(e); } }); };

  /* ---------- Belge ---------- */
  C.defaultLayers = () => ({
    '0': { name: '0', color: 7, lt: 'CONTINUOUS', lw: 25, on: true, lock: false },
  });
  C.newDoc = function () {
    C.doc = {
      ents: [],
      layers: C.defaultLayers(),
      cur: { layer: '0', color: 256, lt: 'BYLAYER', lw: -1 },
      set: {
        anno: 100,          // açıklama ölçeği 1:100
        ltscale: 0.1,       // çizgi tipi ölçeği (anno/1000)
        textH: 2.5,         // yazı yüksekliği (kağıtta mm)
        dimTextH: 2.5,
        dimArrow: 2.5,
        dimDec: 2,
        dimTick: false,
        lwdisp: true,
        geo: { mode: 'none', lat0: 32.1, lon0: 20.07, rot: 0, cm: 21, k0: 0.9996, fe: 500000, fn: 0, zone: 34 },
        name: 'Adsiz',
      },
      nextId: 1,
      layouts: [],
      blocks: {},
    };
    C.sel = [];
    C.undoStack = []; C.redoStack = [];
    C.emit('doc');
  };
  C.layer = name => C.doc.layers[name] || C.doc.layers['0'];
  C.ensureLayer = (name, color = 7, lt = 'CONTINUOUS', lw = 25) => {
    if (!C.doc.layers[name]) C.doc.layers[name] = { name, color, lt, lw, on: true, lock: false };
    return C.doc.layers[name];
  };
  C.annoH = mm => mm * C.doc.set.anno / 1000; // kağıt mm -> model metre

  /* entity yardımcıları */
  C.newEnt = function (type, props) {
    const d = C.doc.cur;
    const e = Object.assign({ id: C.doc.nextId++, type, layer: d.layer, color: d.color, lt: d.lt, lw: d.lw }, props);
    if (!C.doc.layers[e.layer]) C.ensureLayer(e.layer);
    return e;
  };
  C.add = function (type, props) {
    const e = typeof type === 'object' ? type : C.newEnt(type, props);
    if (!e.id) e.id = C.doc.nextId++;
    if (e.id >= C.doc.nextId) C.doc.nextId = e.id + 1;
    C.doc.ents.push(e);
    C.lastEnt = e;
    C.changed();
    return e;
  };
  C.remove = function (list) {
    const ids = new Set(list.map(e => e.id));
    C.doc.ents = C.doc.ents.filter(e => !ids.has(e.id));
    C.sel = C.sel.filter(e => !ids.has(e.id));
    C.changed();
  };
  C.touch = e => { delete e._c; C.changed(); };
  C.byId = id => C.doc.ents.find(e => e.id === id);

  let changeTimer = null;
  C.rev = 0;
  /* toplu değişim: uzun üretimlerde (MIMARIPAFTA …) her C.add / C.changed ekranı ve 'change' dinleyicilerini yeniden çalıştırıyordu
     (40 bin nesnede çağrı başına ~9 ms, 10 bin çağrı → 86 sn; kullanıcı 20.11.2026: "paftaları hazırla dediğimde program kitleniyor").
     C.toplu(fn) süresince yalnız C.rev artar; duvar önbelleği, 'change' ve 'changeIdle' sonunda bir kez çalışır. İç içe çağrılabilir. */
  let topluDerin = 0, topluVar = false;
  C.toplu = async fn => { topluDerin++; try { return await fn(); } finally { if (--topluDerin === 0 && topluVar) { topluVar = false; C.changed(); } } };
  C.changed = function () {
    C.rev++;
    if (topluDerin > 0) { topluVar = true; return; }
    if (C.doc) for (const w of C.doc.ents) if (w.type === 'wall' && w._c) delete w._c; // duvar birleşimleri komşuya bağlı
    C.emit('change');
    if (changeTimer) clearTimeout(changeTimer);
    changeTimer = setTimeout(() => { changeTimer = null; C.emit('changeIdle'); }, 400);
  };

  /* ---------- Geri al / Yinele ---------- */
  const clean = e => { const o = {}; for (const k in e) if (k[0] !== '_') o[k] = k === 'parts' && Array.isArray(e[k]) ? e[k].map(clean) : e[k]; return o; };
  /* tam = true: kalıcı kayıt için eksiksiz kopya. Varsayılan (geri alma kopyası): blokların büyük 3B gövdesi yazılmaz, numarası yazılır (app/blok-hafif.js) */
  C.snapshot = (tam) => JSON.stringify({ ents: C.doc.ents.map(clean), layers: C.doc.layers, cur: C.doc.cur, set: C.doc.set, nextId: C.doc.nextId, layouts: C.doc.layouts || [], blocks: !tam && C.blokKopyaHafif ? C.blokKopyaHafif(C.doc.blocks || {}) : (C.doc.blocks || {}), styles: C.doc.styles || null });
  C.restore = function (s) {
    const o = JSON.parse(s);
    if (o.blocks && C.blokKopyaGeri) C.blokKopyaGeri(o.blocks); /* hafif kopyadaki 3B gövde numaraları gövdelere çevrilir */
    Object.assign(C.doc, o); if (!C.doc.layouts) C.doc.layouts = []; if (!C.doc.blocks) C.doc.blocks = {}; if (!C.doc.styles) delete C.doc.styles;
    C.sel = [];
    C.changed();
    C.emit('layers');
  };
  C.begin = function () { // değişiklikten önce çağrılır
    C.undoStack.push(C.snapshot());
    if (C.undoStack.length > 60) C.undoStack.shift();
    C.redoStack = [];
  };
  C.undo = function () {
    if (!C.undoStack.length) return false;
    C.redoStack.push(C.snapshot());
    C.restore(C.undoStack.pop());
    return true;
  };
  C.redo = function () {
    if (!C.redoStack.length) return false;
    C.undoStack.push(C.snapshot());
    C.restore(C.redoStack.pop());
    return true;
  };
  C.cleanEnt = clean;
  C.clone = e => { const o = JSON.parse(JSON.stringify(clean(e))); o.id = C.doc.nextId++; return o; };

  /* stil çözümleme */
  C.entColor = (e, primColor) => {
    let c = primColor != null ? primColor : e.color;
    if (c === 256 || c == null) c = C.layer(e.layer).color;
    if (c === 0) c = 7;
    return c;
  };
  C.entLt = (e, primLt) => {
    let lt = primLt || e.lt;
    if (!lt || lt === 'BYLAYER') lt = C.layer(e.layer).lt;
    if (lt === 'BYBLOCK') lt = 'CONTINUOUS';
    return lt;
  };
  C.entLw = (e, primLw) => {
    let lw = primLw != null ? primLw : e.lw;
    if (lw == null || lw === -1) lw = C.layer(e.layer).lw;
    if (lw < 0) lw = 25;
    return lw;
  };

  C.log = (...a) => C.emit('log', a.join(' '));
  C.warn = (...a) => C.emit('log', '⚠ ' + a.join(' '), 'warn');
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : (globalThis.C = globalThis.C || {}));

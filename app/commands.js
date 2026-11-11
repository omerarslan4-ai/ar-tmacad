/* ArıtmaCAD — komut motoru ve temel komutlar (AutoCAD tarzı) */
(function (C) {
  'use strict';
  const M = C.M, RAD = Math.PI / 180, { L, P, CI, A } = C.prim;

  C.state = { osnap: true, snapKinds: { end: true, mid: true, cen: true, int: true, qua: true, ins: true, grid: true, per: true, nea: false, face: true, axis: true, fcen: true }, ortho: false, gridSnap: false };
  try { const sv = JSON.parse(localStorage.getItem('aritmacad.snap') || 'null'); if (sv) Object.assign(C.state.snapKinds, sv); if (!localStorage.getItem('aritmacad.snap.dik')) { C.state.snapKinds.per = true; localStorage.setItem('aritmacad.snap.dik', '1'); } } catch (e) { } // Dik (perpendicular) yakalama bir kez açılır
  C.cmds = {}; C.cmdList = [];
  class Cancel extends Error { constructor() { super('İptal'); this.cancel = true; } }
  C.Cancel = Cancel;

  /* komut kaydı: names[0] ana isim */
  C.addCommand = function (names, help, fn, opts = {}) {
    if (typeof names === 'string') names = [names];
    const def = { names: names.map(C.up), help, fn, opts };
    def.names.forEach(n => { C.cmds[n] = def; });
    const i = C.cmdList.findIndex(d => d.names[0] === def.names[0]);
    if (i >= 0) C.cmdList[i] = def; else C.cmdList.push(def);
    return def;
  };

  const E = C.cmd = { waiting: null, queue: [], running: null, base: null, preview: null, scriptMode: false, lastCmd: null, lastPt: [0, 0, 0], cursor: null, selAcc: null };

  E.tokenize = line => {
    const out = []; let cur = '', q = false;
    for (const ch of line) {
      if (ch === '"') { q = !q; if (!q) { out.push(cur); cur = ''; } continue; }
      if (!q && /\s/.test(ch)) { if (cur) { out.push(cur); cur = ''; } continue; }
      cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  };
  const num = s => { if (s == null) return NaN; s = String(s).trim().replace(',', '.'); return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s) ? parseFloat(s) : NaN; };
  C.num = num;
  const prompt = (txt) => C.emit('prompt', txt);

  E.parsePoint = function (tok, opts = {}) {
    const t = tok.trim();
    let m;
    const base = E.base || E.lastPt;
    if ((m = t.match(/^@?\s*([-+]?[\d.]+)\s*<\s*([-+]?[\d.]+)$/))) {
      const rel = t[0] === '@'; const b = rel ? base : [0, 0, 0];
      return M.polar(b, parseFloat(m[2]) * RAD, parseFloat(m[1]));
    }
    if ((m = t.match(/^(@?)\s*([-+]?[\d.eE+-]+)\s*[,;]\s*([-+]?[\d.eE+-]+)(?:\s*[,;]\s*([-+]?[\d.eE+-]+))?$/))) {
      const x = parseFloat(m[2]), y = parseFloat(m[3]), z = m[4] != null ? parseFloat(m[4]) : null;
      if (isNaN(x) || isNaN(y)) return null;
      if (m[1]) return [base[0] + x, base[1] + y, (base[2] || 0) + (z || 0)];
      return [x, y, z != null ? z : 0];
    }
    if (t === '@') return M.p3(base);
    const d = num(t);
    if (!isNaN(d) && E.base) { // doğrudan mesafe girişi (3B yönde de çalışır)
      if (E.cursor) { const v = M.sub(M.p3(E.cursor), M.p3(E.base)); if (Math.abs(v[2]) > 1e-9 && M.len(v) > 1e-9) return M.add(M.p3(E.base), M.mul(M.norm(v), d)); }
      let ang = E.cursor ? M.ang(E.base, E.cursor) : (E.lastDir || 0);
      if (C.state.ortho) ang = Math.round(ang / (Math.PI / 2)) * (Math.PI / 2);
      return M.polar(E.base, ang, d);
    }
    return null;
  };
  const matchKw = (tok, kws) => {
    if (!kws) return null; const u = C.up(tok);
    for (const k of kws) { const ks = Array.isArray(k) ? k : [k]; for (const s of ks) if (C.up(s) === u) return C.up(ks[0]); }
    for (const k of kws) { const ks = Array.isArray(k) ? k : [k]; for (const s of ks) if (u.length >= 1 && C.up(s).startsWith(u) && u.length >= Math.min(2, C.up(s).length)) return C.up(ks[0]); }
    return null;
  };

  /* bir girdi jetonunu bekleyen istem tipine göre çöz */
  E.resolveToken = function (w, tok) {
    const o = w.opts || {};
    if (tok === '' || tok == null) { return { ok: true, v: o.def !== undefined ? o.def : null }; }
    const kw = matchKw(tok, o.kw); if (kw) return { ok: true, v: kw };
    if (w.kind === 'pt') {
      if (o.num && !isNaN(num(tok))) return { ok: true, v: num(tok) };
      const p = E.parsePoint(tok, o); if (p) { E.lastPt = p; return { ok: true, v: p }; }
      return { ok: false, msg: 'Geçersiz nokta: ' + tok + ' (örn. 10,5  @3,0  @5<45)' };
    }
    if (w.kind === 'num') { const v = num(tok); if (!isNaN(v)) return { ok: true, v }; return { ok: false, msg: 'Sayı bekleniyor: ' + tok }; }
    if (w.kind === 'str') return { ok: true, v: tok };
    if (w.kind === 'kw') return { ok: false, msg: 'Seçenekler: ' + o.kw.map(k => Array.isArray(k) ? k[0] : k).join(' / ') };
    if (w.kind === 'sel') {
      const u = C.up(tok); let add = [];
      if (['ALL', 'HEPSI', 'TUMU', 'T'].includes(u)) add = C.doc.ents.filter(e => C.layer(e.layer).on && !C.layer(e.layer).lock);
      else if (['L', 'SON', 'LAST'].includes(u)) add = C.lastEnt && C.byId(C.lastEnt.id) ? [C.lastEnt] : [];
      else if (['P', 'ONCEKI', 'PREVIOUS', 'Ö', 'O'].includes(u)) { add = (E.prevSel || []).filter(e => C.byId(e.id)); if (!add.length) return { ok: false, msg: 'Önceki seçim yok (ya da nesneler silinmiş).' }; }
      else if (/^(KATMAN|LAYER)=/.test(u)) { const n = tok.split('=')[1]; add = C.doc.ents.filter(e => C.up(e.layer) === C.up(n)); }
      else if (/^(TIP|TYPE)=/.test(u)) { const n = C.up(tok.split('=')[1]); const map = { POMPA: 'pump', VANA: 'valve', BORU: 'pipe', DUVAR: 'wall', HAVUZ: 'tank', CIZGI: 'line', YAZI: 'text', OLCU: 'dim', DAIRE: 'circle', PAFTA: 'sheet' }; const ty = map[n] || n.toLowerCase(); add = C.doc.ents.filter(e => e.type === ty); }
      else if (/^#\d+$/.test(tok)) { const e = C.byId(parseInt(tok.slice(1))); if (e) add = [e]; }
      else if (/^\d+$/.test(tok)) { const e = C.byId(parseInt(tok)); if (e) add = [e]; }
      else if (/^-?[\d.]+\s*,\s*-?[\d.]+/.test(tok)) { const p = E.parsePoint(tok); const e = p && C.pickAt(p); if (e) add = [e]; }
      else return { ok: false, msg: 'Seçim: tıklayın, pencere çizin ya da HEPSI / SON / KATMAN=ad / TIP=POMPA / #id yazın' };
      return { ok: true, add };
    }
    return { ok: true, v: tok };
  };

  /* temel girdi: kind = pt | num | str | kw | sel */
  E.ask = function (kind, text, opts = {}) {
    return new Promise((res, rej) => {
      const w = { kind, text, opts, res, rej };
      if (kind === 'sel') { w.acc = []; }
      const tryQueue = () => {
        while (E.queue.length) {
          let tok = kind === 'str' && opts.whole ? E.queue.splice(0).join(' ') : E.queue.shift();
          const r = E.resolveToken(w, tok);
          if (!r.ok) { C.warn(r.msg); if (E.scriptMode) { rej(new Error(r.msg)); return true; } continue; }
          if (kind === 'sel') { if (r.add) { addSel(w, r.add); continue; } finishSel(w); return true; }
          res(r.v); return true;
        }
        return false;
      };
      if (kind === 'sel' && opts.pre !== false && !C.sel.length && C.selFace && C.selFace.e.type === 'kati' && Math.abs(C.selFace.e.h || 0) < 1e-7 && !E.queue.length) { const s = [C.selFace.e]; C.selFace = null; C.emit('selection'); res(s); return; }
      if (kind === 'sel' && opts.pre !== false && C.sel.length && !E.queue.length) { const s = C.sel.slice(); E.prevSel = s.slice(); C.sel = []; C.emit('selection'); res(s); return; }
      if (tryQueue()) return;
      if (E.scriptMode) { if (kind === 'sel') { finishSel(w); return; } res(opts.def !== undefined ? opts.def : null); return; }
      E.waiting = w;
      w.feed = tryQueue;
      let kwTxt = '';
      if (opts.kw) kwTxt = ' [' + opts.kw.map(k => (Array.isArray(k) ? k[k.length > 1 ? 1 : 0] + '(' + k[0] + ')' : k)).join('/') + ']';
      if (kind === 'sel' && !opts.kw) kwTxt = ' [Önceki seçim (P) / Son (L) / Hepsi]';
      prompt(text + kwTxt + (opts.def !== undefined && opts.def !== null && kind !== 'sel' ? ` <${typeof opts.def === 'number' ? M.fmt(opts.def, 3) : opts.def}>` : '') + ':');
    });
  };
  const addSel = (w, list) => { const ids = new Set(w.acc.map(e => e.id)); for (const e of list) if (!ids.has(e.id)) w.acc.push(e); C.sel = w.acc.slice(); C.emit('selection'); prompt(`${w.acc.length} nesne seçili. Devam edin ya da Enter:`); };
  C.on('selection', () => { if (!E.running && C.sel && C.sel.length) E.prevSel = C.sel.slice(); });
  const finishSel = w => { E.waiting = null; const s = w.acc; E.prevSel = s.slice(); C.sel = []; C.emit('selection'); w.res(s); };

  /* komut sürerken henüz nesne olmamış noktalar (çoklu çizgi, döşeme, boru...) da yakalansın */
  C.tempSnapEnts = () => (E.waiting && E.temp ? E.temp : []).filter(q => q && q.length >= 2).map(pts => ({ type: 'pline', id: -1, layer: '0', pts: pts.map(M.p3), closed: false, _tmp: true }));
  const I = C.I = {
    pt: (t, o) => E.ask('pt', t, o),
    num: (t, def, o = {}) => E.ask('num', t, Object.assign({ def }, o)),
    str: (t, def, o = {}) => E.ask('str', t, Object.assign({ def, whole: true }, o)),
    kw: (t, kws, def) => E.ask('kw', t, { kw: kws, def }),
    sel: (t, o) => E.ask('sel', t || 'Nesne seçin', o),
    /* mesafe: sayı ya da tabandan noktaya uzaklık */
    dist: async (t, base, def) => { E.base = base; const v = await E.ask('pt', t, { num: true, def }); if (v == null) return def != null ? def : null; return typeof v === 'number' ? v : (typeof v === 'string' ? v : M.dist2(base, v)); },
    angle: async (t, base, def) => { E.base = base; const v = await E.ask('pt', t, { num: true, def }); if (v == null) return def != null ? def : null; return typeof v === 'number' ? v : M.deg(M.ang(base, v)); },
  };

  /* dışarıdan gelen girdiler */
  E.input = function (line) {
    line = line == null ? '' : String(line);
    if (E.waiting) {
      const w = E.waiting;
      if (line.trim() === '') { if (w.kind === 'sel') { finishSel(w); return; } E.waiting = null; w.res(w.opts.def !== undefined ? w.opts.def : null); return; }
      const toks = w.kind === 'str' && w.opts.whole ? [line] : E.tokenize(line);
      E.queue.push(...toks);
      E.waiting = null;
      if (!w.feed()) E.waiting = w;
      return;
    }
    if (line.trim() === '') { if (E.lastCmd) return E.run(E.lastCmd); return; }
    return E.run(line);
  };
  E.click = function (p) {
    const w = E.waiting; if (!w) return false;
    if (w.kind === 'pt') { E.waiting = null; E.lastPt = p; E.clicked = p; w.res(w.opts.num && w.opts.clickNum ? M.dist2(E.base, p) : p); return true; }
    if (w.kind === 'num' && E.base) { E.waiting = null; w.res(M.dist2(E.base, p)); return true; }
    return false;
  };
  E.selectAdd = function (list) { const w = E.waiting; if (!w || w.kind !== 'sel') return false; addSel(w, list); return true; };
  E.enter = () => E.input('');
  E.cancel = function () {
    E.queue = [];
    if (E.waiting) { const w = E.waiting; E.waiting = null; w.rej(new Cancel()); }
    else if (C.sel.length || C.selFace) { C.sel = []; C.selFace = null; C.emit('selection'); }
    E.preview = null; E.base = null;
  };

  /* bir komut satırını çalıştır */
  E.run = async function (line) {
    if (E.running) { E.input(line); return; }
    const toks = E.tokenize(line); if (!toks.length) return;
    let name = C.up(toks[0]).replace(/^[_.-]+/, '');
    const def = C.cmds[name];
    if (!def) {
      if (C.onUnknownCommand && C.onUnknownCommand(line)) return;
      C.warn(`Bilinmeyen komut: ${toks[0]}  (YARDIM yazın)`); return;
    }
    E.queue = toks.slice(1);
    E.running = def; E.lastCmd = def.names[0];
    C.emit('cmdstart', def.names[0]);
    C.emit('log', '› ' + line, 'cmd');
    const snap = def.opts.noUndo ? null : C.snapshot(), r0 = C.rev;
    try { await def.fn(I, C); }
    catch (err) { if (err && err.cancel) C.log('*İptal*'); else { C.warn('Hata: ' + (err && err.message || err)); console.error(err); if (E.scriptMode) { E.lastError = err; } } }
    finally {
      if (snap && C.rev !== r0) { C.undoStack.push(snap); if (C.undoStack.length > 60) C.undoStack.shift(); C.redoStack = []; }
      E.running = null; E.waiting = null; E.preview = null; E.base = null; E.queue = []; E.rubber = true; E.axisLock = null; E.plane3 = null; E.hover = null; E.noSnap = false; E.tagFn = null; E.hl = null; E.lockPts = null; E.temp = null; E.lastEdge = null; E.cursorIcon = null; E.previewEnt = null;
      C.emit('cmdend'); prompt('Komut:');
    }
  };
  /* çok satırlı betik (sohbet/yapay zekâ için): her satır bir komut, eksik girdiler Enter sayılır */
  E.script = async function (text) {
    const lines = String(text).split(/\r?\n/).map(s => s.replace(/(^|\s)(\/\/|;;).*$/, '').trim()).filter(Boolean);
    E.scriptMode = true; const errors = []; let n = 0;
    try {
      for (const ln of lines) { E.lastError = null; await E.run(ln); n++; if (E.lastError) errors.push(ln + ' → ' + E.lastError.message); }
    } finally { E.scriptMode = false; }
    return { n, errors };
  };

  /* ============ KOMUTLAR ============ */
  const add = C.add.bind(C);
  const ne = (type, props) => C.add(C.newEnt(type, props));

  C.addCommand(['LINE', 'L', 'CIZGI'], 'Çizgi çizer. LINE x1,y1 x2,y2 ...', async (I) => {
    let a = await I.pt('İlk nokta'); if (!a || typeof a === 'string') return;
    const first = a, made = [];
    for (; ;) {
      E.base = a; E.preview = c => [L(a, c)];
      const p = await I.pt('Sonraki nokta', { kw: made.length >= 2 ? [['C', 'Kapat'], ['U', 'Geri']] : [['U', 'Geri']] });
      if (p == null) break;
      if (p === 'U') { const l = made.pop(); if (l) { C.remove([l]); a = l.a; } continue; }
      if (p === 'C') { made.push(ne('line', { a, b: first })); break; }
      E.lastDir = M.ang(a, p);
      made.push(ne('line', { a, b: p })); a = p;
    }
  });
  C.addCommand(['PLINE', 'PL', 'COKLUCIZGI'], 'Çoklu çizgi. PLINE nokta nokta ... [C=kapat]', async (I) => {
    const p0 = await I.pt('Başlangıç noktası'); if (!p0 || typeof p0 === 'string') return;
    const pts = [p0]; let closed = false;
    for (; ;) {
      const a = pts[pts.length - 1]; E.base = a; E.temp = [pts]; E.preview = c => [P([...pts, c], false)];
      const p = await I.pt('Sonraki nokta', { kw: pts.length >= 2 ? [['C', 'Kapat'], ['U', 'Geri']] : [['U', 'Geri']] });
      if (p == null) break; if (p === 'U') { if (pts.length > 1) pts.pop(); continue; } if (p === 'C') { closed = true; break; }
      pts.push(p);
    }
    if (pts.length >= 2) ne('pline', { pts, closed });
  });
  C.addCommand(['RECTANG', 'REC', 'DIKDORTGEN'], 'Dikdörtgen. REC köşe1 köşe2 (veya @genişlik,yükseklik)', async (I) => {
    const a = await I.pt('İlk köşe'); if (!a || typeof a === 'string') return;
    E.base = a; E.rubber = false; E.preview = c => [P([a, [c[0], a[1]], c, [a[0], c[1]]], true)];
    const b = await I.pt('Karşı köşe (@g,y)'); if (!b || typeof b === 'string') return;
    ne('pline', { pts: [a, [b[0], a[1], a[2]], b, [a[0], b[1], a[2]]], closed: true });
  });
  C.addCommand(['CIRCLE', 'C', 'DAIRE', 'CEMBER'], 'Daire. CIRCLE merkez yarıçap  | CIRCLE merkez D çap', async (I) => {
    const c = await I.pt('Merkez'); if (!c || typeof c === 'string') return;
    E.base = c; E.preview = q => [CI(c, M.dist2(c, q))];
    let r = await E.ask('pt', 'Yarıçap', { num: true, kw: [['D', 'Çap']] });
    if (r === 'D') { E.preview = q => [CI(c, M.dist2(c, q) / 2)]; const d = await I.dist('Çap', c); r = d / 2; }
    if (Array.isArray(r)) r = M.dist2(c, r);
    if (r > 0) ne('circle', { c, r });
  });
  const circum = (a, b, c) => {
    const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])); if (Math.abs(d) < 1e-12) return null;
    const ux = ((a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) + (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) + (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])) / d;
    const uy = ((a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) + (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) + (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])) / d;
    return [ux, uy, a[2] || 0];
  };
  const arc3 = (a, b, c) => { const o = circum(a, b, c); if (!o) return null; const r = M.dist2(o, a); let a0 = M.ang(o, a), a1 = M.ang(o, c); const ccw = ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) > 0; if (!ccw) [a0, a1] = [a1, a0]; return { c: o, r, a0: M.deg(a0), a1: M.deg(a1) }; };
  C.addCommand(['ARC', 'A', 'YAY'], 'Üç noktalı yay. ARC p1 p2 p3 | ARC M merkez başlangıç bitiş', async (I) => {
    const p1 = await I.pt('Başlangıç noktası', { kw: [['M', 'Merkez']] }); if (p1 == null) return;
    if (p1 === 'M') {
      const c = await I.pt('Merkez'); E.base = c; const s = await I.pt('Başlangıç noktası'); const r = M.dist2(c, s);
      E.preview = q => [A(c, r, M.ang(c, s), M.ang(c, q))];
      const e = await I.angle('Bitiş noktası/açısı', c); ne('arc', { c, r, a0: M.deg(M.ang(c, s)), a1: e }); return;
    }
    E.base = p1; const p2 = await I.pt('İkinci nokta'); if (!p2) return;
    E.preview = q => { const a = arc3(p1, p2, q); return a ? [A(a.c, a.r, a.a0 * RAD, a.a1 * RAD)] : []; };
    const p3 = await I.pt('Bitiş noktası'); if (!p3) return;
    const a = arc3(p1, p2, p3); if (a) ne('arc', a);
  });
  C.addCommand(['TEXT', 'DT', 'T', 'YAZI', 'MTEXT'], 'Yazı. TEXT nokta yükseklik açı metin  (yükseklik model biriminde, varsayılan ölçeğe göre)', async (I) => {
    const p = await I.pt('Yazı başlangıç noktası', { kw: [['J', 'Hizala']] }); if (p == null) return;
    let al = 'L', pp = p;
    if (p === 'J') { al = await I.kw('Hizalama', [['L', 'Sol'], ['C', 'Orta'], ['R', 'Sağ'], ['M', 'Merkez']], 'L'); pp = await I.pt('Nokta'); }
    const h = await I.dist('Yükseklik', pp, C.annoH(C.doc.set.textH));
    const rot = await I.angle('Açı', pp, 0);
    const s = await I.str('Metin'); if (!s) return;
    ne('text', { p: pp, h, rot, s: s.replace(/\\n/g, '\n'), al });
  });
  C.addCommand(['POINT', 'PO', 'NOKTA'], 'Nokta koyar', async (I) => { for (; ;) { const p = await I.pt('Nokta'); if (!p || typeof p === 'string') return; ne('point', { p }); } });

  /* ---- düzenleme ---- */
  const ghost = (sel, X) => sel.slice(0, 300).flatMap(e => { const c = JSON.parse(JSON.stringify(C.cleanEnt(e))); C.xform(c, X); return C.prims(c); });
  C.addCommand(['ERASE', 'E', 'SIL', 'DELETE'], 'Seçilenleri siler', async (I) => { const s = await I.sel(); if (s.length) { C.remove(s); C.log(s.length + ' nesne silindi'); } });
  C.addCommand(['MOVE', 'M', 'TASI'], 'Taşı. MOVE seçim taban hedef', async (I) => {
    const s = await I.sel(); if (!s.length) return;
    const b = await I.pt('Taban noktası'); if (!b || typeof b === 'string') return;
    E.base = b; E.preview = q => ghost(s, C.xMove(M.sub(q, b)));
    const t = await I.pt('İkinci nokta'); if (!t || typeof t === 'string') return;
    const X = C.xMove(M.sub(t, b)); s.forEach(e => C.xform(e, X)); C.changed();
  });
  C.addCommand(['COPY', 'CO', 'CP', 'KOPYALA'], 'Kopyala (çoklu). COPY seçim taban hedef1 hedef2 ...', async (I) => {
    const s = await I.sel(); if (!s.length) return;
    const b = await I.pt('Taban noktası'); if (!b || typeof b === 'string') return;
    for (; ;) {
      E.base = b; E.preview = q => ghost(s, C.xMove(M.sub(q, b)));
      const t = await I.pt('İkinci nokta'); if (!t || typeof t === 'string') return;
      const X = C.xMove(M.sub(t, b)); s.forEach(e => { const c = C.clone(e); C.xform(c, X); add(c); });
    }
  });
  C.addCommand(['ROTATE', 'RO', 'DONDUR'], 'Döndür. ROTATE seçim taban açı', async (I) => {
    const s = await I.sel(); if (!s.length) return;
    const b = await I.pt('Taban noktası'); if (!b || typeof b === 'string') return;
    E.preview = q => ghost(s, C.xRot(b, M.ang(b, q)));
    const a = await I.angle('Dönme açısı', b); if (a == null) return;
    const X = C.xRot(b, a * RAD); s.forEach(e => C.xform(e, X)); C.changed();
  });
  C.addCommand(['SCALE', 'SC', 'OLCEKLE'], 'Ölçekle. SCALE seçim taban çarpan | R = referans (eski uzunluk → yeni uzunluk) | C = kopyalayarak ölçekle', async (I) => {
    const s = await I.sel(); if (!s.length) return;
    const b = await I.pt('Taban noktası'); if (!b || typeof b === 'string') return;
    let copy = false, f;
    E.base = b; E.preview = q => { const d = M.dist2(b, q); return d > 1e-9 ? ghost(s, C.xScale(b, d)) : []; };
    for (; ;) {
      const v = await E.ask('pt', `Ölçek çarpanı${copy ? ' (kopya)' : ''}`, { num: true, kw: [['R', 'Referans'], ['C', 'Kopya']] });
      if (v == null) { E.preview = null; return; }
      if (v === 'C') { copy = !copy; continue; }
      if (v === 'R') {
        E.preview = null; const r1 = await E.ask('pt', 'Referans uzunluk (sayı ya da iki nokta)', { num: true }); if (r1 == null) return;
        let ref = typeof r1 === 'number' ? r1 : null;
        if (ref == null && Array.isArray(r1)) { E.base = r1; const r2 = await I.pt('İkinci nokta'); if (!r2 || typeof r2 === 'string') return; ref = M.dist2(r1, r2); }
        if (!(ref > 0)) { C.warn('Referans uzunluk sıfır olamaz'); return; }
        E.base = b; E.preview = q => { const d = M.dist2(b, q) / ref; return d > 1e-9 ? ghost(s, C.xScale(b, d)) : []; };
        const n = await E.ask('pt', `Yeni uzunluk (referans ${M.fmt(ref, 3)})`, { num: true }); E.preview = null; if (n == null) return;
        const nl = typeof n === 'number' ? n : M.dist2(b, n); f = nl / ref; break;
      }
      f = typeof v === 'number' ? v : M.dist2(b, v); break;
    }
    E.preview = null; if (!(f > 0)) return;
    const X = C.xScale(b, f);
    if (copy) s.forEach(e => { const c = C.clone(e); C.xform(c, X); C.add(c); }); else s.forEach(e => C.xform(e, X));
    C.changed(); C.log(`Ölçek çarpanı ${M.fmt(f, 4)}${copy ? ' (kopya)' : ''}`);
  });
  C.addCommand(['MIRROR', 'MI', 'AYNA'], 'Aynala. MIRROR seçim p1 p2 [E/H kaynağı sil]', async (I) => {
    const s = await I.sel(); if (!s.length) return;
    const a = await I.pt('Ayna ekseni 1. nokta'); if (!a || typeof a === 'string') return;
    E.base = a; E.preview = q => M.dist2(a, q) > 1e-9 ? ghost(s, C.xMirror(a, q)) : [];
    const b = await I.pt('Ayna ekseni 2. nokta'); if (!b || typeof b === 'string') return;
    const del = await I.kw('Kaynak nesneler silinsin mi?', [['H', 'Hayır', 'N'], ['E', 'Evet', 'Y']], 'H');
    const X = C.xMirror(a, b);
    if (del === 'E') { s.forEach(e => C.xform(e, X)); C.changed(); } else s.forEach(e => { const c = C.clone(e); C.xform(c, X); add(c); });
  });
  C.addCommand(['ARRAY', 'AR', 'DIZI'], 'Dikdörtgen dizi. ARRAY seçim satır sütun satıraralığı sütunaralığı', async (I) => {
    const s = await I.sel(); if (!s.length) return;
    const r = await I.num('Satır sayısı', 1), c = await I.num('Sütun sayısı', 2);
    const dy = r > 1 ? await I.num('Satır aralığı (Y)', 1) : 0, dx = c > 1 ? await I.num('Sütun aralığı (X)', 1) : 0;
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) { if (!i && !j) continue; const X = C.xMove([j * dx, i * dy, 0]); s.forEach(e => { const k = C.clone(e); C.xform(k, X); add(k); }); }
  });
  C.addCommand(['EXPLODE', 'X', 'PATLAT'], 'Bileşik nesneyi çizgilere ayırır', async (I) => {
    const s = await I.sel(); let n = 0;
    for (const e of s) { if (['line', 'circle', 'arc', 'text', 'point', 'solid'].includes(e.type)) continue; const parts = C.explode(e); C.remove([e]); parts.forEach(p => add(C.newEnt(p.type, p))); n++; }
    C.log(n + ' nesne patlatıldı');
  });
  C.addCommand(['OFFSET', 'O', 'OTELE'], 'Ötele. OFFSET mesafe, nesne, taraf', async (I) => {
    const d = await I.num('Öteleme mesafesi', E.offD || 1); if (!d) return; E.offD = d;
    for (; ;) {
      const p = await I.pt('Ötelenecek nesneyi seçin (Enter bitir)'); if (!p || typeof p === 'string') return;
      const e = C.pickAt(p); if (!e) { C.warn('Nesne yok'); continue; }
      const side = await I.pt('Taraf noktası'); if (!side || typeof side === 'string') return;
      const r = C.offsetEnt(e, d, side); if (r) { r.layer = e.layer; r.color = e.color; r.lt = e.lt; r.lw = e.lw; add(r); } else C.warn('Bu nesne ötelenemiyor');
    }
  });
  C.pickAt = p => { let best = null, bd = 0.5 / (C.viewScale ? C.viewScale() : 1) * 12; for (const e of C.doc.ents) { if (!C.layer(e.layer).on) continue; const d = C.entDist(e, p); if (d < bd) { bd = d; best = e; } } return best; };
  C.offsetEnt = (e, d, side) => {
    const sgn = (a, b, p) => Math.sign((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) || 1;
    if (e.type === 'line') { const s = sgn(e.a, e.b, side), u = M.norm(M.sub(e.b, e.a)), n = [-u[1] * d * s, u[0] * d * s, 0]; return C.newEnt('line', { a: M.add(e.a, n), b: M.add(e.b, n) }); }
    if (e.type === 'circle') { const out = M.dist2(side, e.c) > e.r; const r = out ? e.r + d : e.r - d; return r > 0 ? C.newEnt('circle', { c: e.c, r }) : null; }
    if (e.type === 'arc') { const out = M.dist2(side, e.c) > e.r; const r = out ? e.r + d : e.r - d; return r > 0 ? C.newEnt('arc', { c: e.c, r, a0: e.a0, a1: e.a1 }) : null; }
    if (e.type === 'ellipse' && C.ellPts) { // elipsin ötelenmişi elips değildir (AutoCAD'de spline): yoğun çoklu çizgi
      const full = !(e.t1 - e.t0 < Math.PI * 2 - 1e-9), q = C.ellPts(e, 360), a = Math.hypot(...e.mj), u = [e.mj[0] / a, e.mj[1] / a], dx = side[0] - e.c[0], dy = side[1] - e.c[1], x = (dx * u[0] + dy * u[1]) / a, y = (-dx * u[1] + dy * u[0]) / (a * e.ra), out = x * x + y * y > 1 ? 1 : -1;
      const pts = q.map((p, i) => { const t = full ? e.t0 + 2 * Math.PI * i / 360 : e.t0 + (e.t1 - e.t0) * i / 360, mn = [-e.mj[1] * e.ra, e.mj[0] * e.ra], tg = [-e.mj[0] * Math.sin(t) + mn[0] * Math.cos(t), -e.mj[1] * Math.sin(t) + mn[1] * Math.cos(t)], l = Math.hypot(...tg) || 1; return [p[0] + tg[1] / l * d * out, p[1] - tg[0] / l * d * out, p[2] || 0]; });
      if (out < 0 && d >= a * e.ra) return null;
      return C.newEnt('pline', { pts, closed: full });
    }
    if (e.type === 'pline') {
      const v = e.pts, n = v.length, cl = e.closed; let bi = 0, bd = Infinity;
      for (let i = 1; i < n + (cl ? 1 : 0); i++) { const dd = M.segDist(side, v[i - 1], v[i % n]); if (dd < bd) { bd = dd; bi = i; } }
      const s = sgn(v[bi - 1], v[bi % n], side);
      const segs = []; for (let i = 1; i < n + (cl ? 1 : 0); i++) { const a = v[i - 1], b = v[i % n], u = M.norm(M.sub(b, a)), no = [-u[1] * d * s, u[0] * d * s, 0]; segs.push([M.add(a, no), M.add(b, no)]); }
      const pts = [];
      const ln = (s1, s2) => { const r = M.segInt(s1[0], s1[1], s2[0], s2[1]); return r ? r.p : s1[1]; };
      if (cl) for (let i = 0; i < segs.length; i++) pts.push(ln(segs[(i + segs.length - 1) % segs.length], segs[i]));
      else { pts.push(segs[0][0]); for (let i = 1; i < segs.length; i++) pts.push(ln(segs[i - 1], segs[i])); pts.push(segs[segs.length - 1][1]); }
      return C.newEnt('pline', { pts, closed: cl });
    }
    return null;
  };
  /* kesişim parametreleri: çizgi a-b ile sınır varlıkları */
  const cutParams = (a, b, edges, self) => {
    const ts = [];
    for (const e of edges) {
      if (e === self) continue;
      for (const pr of C.prims(e)) {
        if (pr.k === 'C' || pr.k === 'A') { for (const t of M.lineCircle(a, b, pr.c, pr.r)) { const p = M.lerp(a, b, t); if (pr.k === 'A' && !M.angIn(M.ang(pr.c, p), pr.a0, pr.a1)) continue; ts.push(t); } continue; }
        for (const [p, q] of C.primSegs(pr)) { const r = M.segInt(a, b, p, q); if (r && r.u >= -1e-9 && r.u <= 1 + 1e-9) ts.push(r.t); }
      }
    }
    return ts;
  };
  C.addCommand(['TRIM', 'TR', 'BUDA'], 'Budama: kesici kenarları seçin (Enter=hepsi), sonra budanacak çizgilere tıklayın', async (I) => {
    let edges = await I.sel('Kesici kenarlar (Enter = tümü)', { pre: true }); if (!edges.length) edges = C.doc.ents.slice();
    for (; ;) {
      const p = await I.pt('Budanacak çizgi (Enter bitir)'); if (!p || typeof p === 'string') return;
      const e = C.pickAt(p); if (!e || e.type !== 'line') { C.warn('Yalnız çizgi (LINE) budanabilir; çoklu çizgiyi önce PATLAT'); continue; }
      const len = M.dist2(e.a, e.b), tp = M.dot(M.sub(p, e.a), M.sub(e.b, e.a)) / (len * len);
      const ts = cutParams(e.a, e.b, edges, e).filter(t => t > 1e-6 && t < 1 - 1e-6).sort((x, y) => x - y);
      let lo = 0, hi = 1; for (const t of ts) { if (t < tp) lo = t; else { hi = t; break; } }
      if (lo === 0 && hi === 1) { C.warn('Kesişim yok'); continue; }
      const A0 = e.a, B0 = e.b; C.remove([e]);
      if (lo > 0) add(C.newEnt('line', { a: A0, b: M.lerp(A0, B0, lo), layer: e.layer, color: e.color, lt: e.lt, lw: e.lw }));
      if (hi < 1) add(C.newEnt('line', { a: M.lerp(A0, B0, hi), b: B0, layer: e.layer, color: e.color, lt: e.lt, lw: e.lw }));
    }
  });
  C.addCommand(['EXTEND', 'EX', 'UZAT'], 'Uzatma: sınırları seçin (Enter=hepsi), sonra uzatılacak çizginin ucuna yakın tıklayın', async (I) => {
    let edges = await I.sel('Sınır kenarları (Enter = tümü)', { pre: true }); if (!edges.length) edges = C.doc.ents.slice();
    for (; ;) {
      const p = await I.pt('Uzatılacak çizgi (Enter bitir)'); if (!p || typeof p === 'string') return;
      const e = C.pickAt(p); if (!e || e.type !== 'line') { C.warn('Yalnız çizgi uzatılabilir'); continue; }
      const nearB = M.dist2(p, e.b) < M.dist2(p, e.a);
      const ts = cutParams(e.a, e.b, edges, e);
      const cand = nearB ? ts.filter(t => t > 1 + 1e-9).sort((x, y) => x - y)[0] : ts.filter(t => t < -1e-9).sort((x, y) => y - x)[0];
      if (cand == null) { C.warn('Sınır bulunamadı'); continue; }
      const np = M.lerp(e.a, e.b, cand); if (nearB) e.b = np; else e.a = np; C.touch(e);
    }
  });
  C.addCommand(['FILLET', 'F', 'KOSE', 'PAH'], 'Köşe birleştir. FILLET [R yarıçap] çizgi1 çizgi2', async (I) => {
    let r = E.filR || 0;
    let p1 = await I.pt(`Birinci çizgi (yarıçap=${M.fmt(r, 3)})`, { kw: [['R', 'Yarıçap']] });
    if (p1 === 'R') { r = E.filR = await I.num('Köşe yarıçapı', r); p1 = await I.pt('Birinci çizgi'); }
    if (!p1 || typeof p1 === 'string') return;
    const e1 = C.pickAt(p1); const p2 = await I.pt('İkinci çizgi'); if (!p2 || typeof p2 === 'string') return; const e2 = C.pickAt(p2);
    if (!e1 || !e2 || e1.type !== 'line' || e2.type !== 'line' || e1 === e2) { C.warn('İki ayrı çizgi seçin'); return; }
    const x = M.segInt(e1.a, e1.b, e2.a, e2.b); if (!x) { C.warn('Çizgiler paralel'); return; }
    const X = x.p;
    const keep = (e, p) => { const da = M.dot(M.sub(e.a, X), M.sub(p, X)), db = M.dot(M.sub(e.b, X), M.sub(p, X)); return Math.abs(da) > Math.abs(db) || (da > 0 && db <= 0) ? (da > 0 ? 'a' : 'b') : (db > 0 ? 'b' : 'a'); };
    const k1 = keep(e1, p1), k2 = keep(e2, p2);
    const u1 = M.norm(M.sub(e1[k1], X)), u2 = M.norm(M.sub(e2[k2], X));
    if (r <= 0) { e1[k1 === 'a' ? 'b' : 'a'] = X; e2[k2 === 'a' ? 'b' : 'a'] = X; C.touch(e1); C.touch(e2); return; }
    const th = Math.acos(Math.max(-1, Math.min(1, M.dot(u1, u2)))) / 2; if (th < 1e-6) return;
    const t = r / Math.tan(th), T1 = M.add(X, M.mul(u1, t)), T2 = M.add(X, M.mul(u2, t));
    const bis = M.norm(M.add(u1, u2)), cen = M.add(X, M.mul(bis, r / Math.sin(th)));
    e1[k1 === 'a' ? 'b' : 'a'] = T1; e2[k2 === 'a' ? 'b' : 'a'] = T2; C.touch(e1); C.touch(e2);
    let a0 = M.ang(cen, T1), a1 = M.ang(cen, T2); if (M.normAng(a1 - a0) > Math.PI) [a0, a1] = [a1, a0];
    add(C.newEnt('arc', { c: cen, r, a0: M.deg(a0), a1: M.deg(a1), layer: e1.layer }));
  });

  /* ---- özellikler ---- */
  const parseColor = v => { if (v == null) return null; const u = C.ascii(String(v)).toLowerCase().replace(/[^a-z0-9]/g, ''); if (C.COLOR_NAMES[u] != null) return C.COLOR_NAMES[u]; const n = parseInt(v); return n >= 0 && n <= 256 ? n : null; };
  const parseLt = v => { if (!v) return null; const u = C.up(v); if (u === 'BYLAYER' || u === 'KATMAN' || u === 'KATMANDAN') return 'BYLAYER'; if (C.LT[u]) return u; if (C.LT_ALIAS[u]) return C.LT_ALIAS[u]; return null; };
  const parseLw = v => { if (v == null) return null; const u = C.up(v); if (u === 'BYLAYER' || u === 'KATMAN' || u === 'KATMANDAN') return -1; const n = num(v); if (isNaN(n)) return null; return C.snapLw(n); };
  C.parseColor = parseColor; C.parseLt = parseLt; C.parseLw = parseLw;

  C.addCommand(['LAYER', 'LA', 'KATMAN'], 'Katman. LAYER YENI ad [renk] [cizgitipi] [kalınlık-mm] | AYARLA ad | RENK ad n | CT ad tip | KALINLIK ad mm | KAPAT/AC/KILIT/COZ ad | SIL ad | LISTE', async (I) => {
    const op = await I.kw('Seçenek', [['YENI', 'Yeni', 'NEW', 'N'], ['AYARLA', 'Ayarla', 'SET', 'S'], ['RENK', 'Renk', 'COLOR'], ['CT', 'Çizgitipi', 'LTYPE'], ['KALINLIK', 'Kalınlık', 'LW', 'LWEIGHT'], ['KAPAT', 'Kapat', 'OFF'], ['AC', 'Aç', 'ON'], ['KILIT', 'Kilitle', 'LOCK'], ['COZ', 'Çöz', 'UNLOCK'], ['SIL', 'Sil', 'DELETE'], ['LISTE', 'Liste', 'LIST'], ['PANEL', 'Panel']], 'PANEL');
    if (op === 'PANEL') { C.emit('openLayers'); return; }
    if (op === 'LISTE') { Object.values(C.doc.layers).forEach(l => C.log(`${l.name}  renk=${l.color} ${l.lt} ${(l.lw / 100).toFixed(2)}mm ${l.on ? '' : '(kapalı)'}${l.lock ? '(kilitli)' : ''}`)); return; }
    const name = await I.str('Katman adı', C.doc.cur.layer, { whole: false }); if (!name) return;
    if (op === 'YENI') {
      const col = parseColor(await I.str('Renk', 7, { whole: false })) || 7;
      const lt = parseLt(await I.str('Çizgi tipi', 'CONTINUOUS', { whole: false })) || 'CONTINUOUS';
      const lw = parseLw(await I.str('Kalınlık (mm)', 0.25, { whole: false }));
      const L0 = C.ensureLayer(name, col, lt === 'BYLAYER' ? 'CONTINUOUS' : lt, lw == null || lw < 0 ? 25 : lw);
      L0.color = col; L0.lt = lt === 'BYLAYER' ? 'CONTINUOUS' : lt; L0.lw = lw == null || lw < 0 ? 25 : lw;
      C.doc.cur.layer = name; C.log(`Katman ${name} oluşturuldu ve geçerli yapıldı`);
    } else {
      const l = C.doc.layers[name] || Object.values(C.doc.layers).find(x => C.up(x.name) === C.up(name));
      if (!l) { C.warn('Katman yok: ' + name); return; }
      if (op === 'AYARLA') C.doc.cur.layer = l.name;
      else if (op === 'RENK') l.color = parseColor(await I.str('Renk', l.color, { whole: false })) ?? l.color;
      else if (op === 'CT') l.lt = parseLt(await I.str('Çizgi tipi', l.lt, { whole: false })) || l.lt;
      else if (op === 'KALINLIK') { const w = parseLw(await I.str('Kalınlık (mm)', l.lw / 100, { whole: false })); if (w != null && w >= 0) l.lw = w; }
      else if (op === 'KAPAT') l.on = false; else if (op === 'AC') l.on = true;
      else if (op === 'KILIT') l.lock = true; else if (op === 'COZ') l.lock = false;
      else if (op === 'SIL') { if (l.name === '0') { C.warn('0 katmanı silinemez'); return; } if (C.doc.ents.some(e => e.layer === l.name)) { C.warn('Katman boş değil'); return; } delete C.doc.layers[l.name]; if (C.doc.cur.layer === l.name) C.doc.cur.layer = '0'; }
    }
    C.doc.ents.forEach(e => { delete e._c; }); C.emit('layers'); C.changed();
  });
  C.addCommand(['COLOR', 'COL', 'RENK'], 'Geçerli renk: COLOR 1..255 | kırmızı | BYLAYER', async (I) => { const c = parseColor(await I.str('Renk', 'BYLAYER', { whole: false })); if (c != null) { C.doc.cur.color = c; C.emit('layers'); } }, { noUndo: true });
  C.addCommand(['LINETYPE', 'LT', 'CIZGITIPI'], 'Geçerli çizgi tipi: CONTINUOUS DASHED HIDDEN CENTER PHANTOM DOT DASHDOT BYLAYER', async (I) => { const t = parseLt(await I.str('Çizgi tipi', 'BYLAYER', { whole: false })); if (t) { C.doc.cur.lt = t; C.emit('layers'); } else C.warn('Tanınmayan çizgi tipi'); }, { noUndo: true });
  C.addCommand(['LWEIGHT', 'LW', 'KALINLIK'], 'Geçerli çizgi kalınlığı (mm): 0.13 0.18 0.25 0.35 0.50 0.70 1.00 | BYLAYER', async (I) => { const w = parseLw(await I.str('Kalınlık (mm)', 'BYLAYER', { whole: false })); if (w != null) { C.doc.cur.lw = w; C.emit('layers'); } }, { noUndo: true });
  C.addCommand(['LTSCALE', 'LTS', 'CTOLCEK'], 'Çizgi tipi ölçeği', async (I) => { const v = await I.num('Çizgi tipi ölçeği', C.doc.set.ltscale); if (v > 0) { C.doc.set.ltscale = v; C.changed(); } });
  C.addCommand(['LWDISPLAY', 'LWD', 'KALINLIKGOSTER'], 'Çizgi kalınlığını ekranda göster AC/KAPAT', async (I) => { const v = await I.kw('Kalınlık gösterimi', [['AC', 'Aç', 'ON'], ['KAPAT', 'Kapat', 'OFF']], C.doc.set.lwdisp ? 'KAPAT' : 'AC'); C.doc.set.lwdisp = v === 'AC'; C.changed(); }, { noUndo: true });
  C.addCommand(['CHPROP', 'CH', 'DEGISTIR'], 'Özellik değiştir. CHPROP seçim KATMAN ad | RENK n | CT tip | KALINLIK mm', async (I) => {
    const s = await I.sel(); if (!s.length) return;
    for (; ;) {
      const k = await I.kw('Özellik', [['KATMAN', 'Katman', 'LA', 'LAYER'], ['RENK', 'Renk', 'C', 'COLOR'], ['CT', 'Çizgitipi', 'LT', 'LTYPE'], ['KALINLIK', 'Kalınlık', 'LW'], ['YAZI', 'Yazı']], null); if (!k) break;
      const v = await I.str('Değer', null, { whole: k === 'YAZI' }); if (v == null) break;
      for (const e of s) {
        if (k === 'KATMAN') { if (!C.doc.layers[v]) C.ensureLayer(v); e.layer = v; }
        else if (k === 'RENK') { const c = parseColor(v); if (c != null) e.color = c; }
        else if (k === 'CT') { const t = parseLt(v); if (t) e.lt = t; }
        else if (k === 'KALINLIK') { const w = parseLw(v); if (w != null) e.lw = w; }
        else if (k === 'YAZI' && 's' in e) e.s = v;
        else if (k === 'YAZI' && e.type === 'dim') e.txt = v;
        delete e._c;
      }
      C.changed(); C.emit('layers');
    }
  });
  C.addCommand(['MATCHPROP', 'MA', 'OZELLIKKOPYALA'], 'Özellikleri kopyala: kaynak sonra hedefler', async (I) => {
    const p = await I.pt('Kaynak nesne'); if (!p || typeof p === 'string') return; const src = C.pickAt(p); if (!src) return;
    for (; ;) { const q = await I.pt('Hedef nesne'); if (!q || typeof q === 'string') return; const e = C.pickAt(q); if (e) { e.layer = src.layer; e.color = src.color; e.lt = src.lt; e.lw = src.lw; C.touch(e); } }
  });

  /* ---- sorgu ---- */
  C.addCommand(['DIST', 'DI', 'MESAFE'], 'İki nokta arası mesafe', async (I) => {
    const a = await I.pt('İlk nokta'); if (!a || typeof a === 'string') return; E.base = a; const b = await I.pt('İkinci nokta'); if (!b || typeof b === 'string') return;
    C.log(`Mesafe = ${M.fmt(M.dist(a, b), 3)} m  (yatay ${M.fmt(M.dist2(a, b), 3)}, ΔX=${M.fmt(b[0] - a[0], 3)} ΔY=${M.fmt(b[1] - a[1], 3)} ΔZ=${M.fmt((b[2] || 0) - (a[2] || 0), 3)}, açı ${M.fmt(M.deg(M.ang(a, b)), 2)}°)`);
  }, { noUndo: true });
  C.addCommand(['AREA', 'AA', 'ALAN'], 'Alan: noktalar ya da N (nesne)', async (I) => {
    const p0 = await I.pt('İlk nokta', { kw: [['N', 'Nesne', 'O']] }); if (p0 == null) return;
    if (p0 === 'N') { const s = await I.sel(); for (const e of s) { if (e.type === 'circle') C.log(`Alan=${M.fmt(Math.PI * e.r * e.r, 3)} m² çevre=${M.fmt(2 * Math.PI * e.r, 3)} m`); else if (e.type === 'pline' || e.type === 'slab') { const v = C.prims(e)[0].pts; let per = 0; for (let i = 0; i < v.length; i++) per += M.dist2(v[i], v[(i + 1) % v.length]); C.log(`Alan=${M.fmt(Math.abs(M.polyArea(v)), 3)} m² çevre=${M.fmt(per, 3)} m`); } else if (e.type === 'tank') C.log(`Taban alanı=${M.fmt(e.L * e.W, 3)} m² hacim=${M.fmt(e.L * e.W * e.H, 3)} m³`); } return; }
    const pts = [p0];
    for (; ;) { E.base = pts[pts.length - 1]; E.temp = [pts]; E.preview = c => [P([...pts, c], true)]; const p = await I.pt('Sonraki nokta'); if (!p || typeof p === 'string') break; pts.push(p); }
    let per = 0; for (let i = 0; i < pts.length; i++) per += M.dist2(pts[i], pts[(i + 1) % pts.length]);
    C.log(`Alan = ${M.fmt(Math.abs(M.polyArea(pts)), 3)} m², çevre = ${M.fmt(per, 3)} m`);
  }, { noUndo: true });
  C.addCommand(['ID', 'KOORDINATSOR'], 'Nokta koordinatı (harita tanımlıysa enlem/boylam da)', async (I) => {
    const p = await I.pt('Nokta'); if (!p || typeof p === 'string') return;
    let s = `X=${M.fmt(p[0], 3)} Y=${M.fmt(p[1], 3)} Z=${M.fmt(p[2] || 0, 3)}`;
    if (C.geo.isSet()) { const ll = C.geo.toLL(p); s += `  |  Enlem ${ll[0].toFixed(7)}  Boylam ${ll[1].toFixed(7)}`; }
    C.log(s);
  }, { noUndo: true });
  C.addCommand(['LIST', 'LI', 'LISTE'], 'Seçilen nesnelerin bilgisini listeler', async (I) => { const s = await I.sel(); s.slice(0, 100).forEach(e => C.log(C.describe(e))); if (s.length > 100) C.log(`... +${s.length - 100}`); }, { noUndo: true });

  /* ---- görünüm / ayar ---- */
  C.addCommand(['ZOOM', 'Z', 'YAKINLAS'], 'ZOOM E (tümü) | W (pencere) | çarpan', async (I) => {
    const v = await E.ask('pt', 'Seçenek [Tümü(E)/Pencere(W)/çarpan]', { kw: [['E', 'Tümü', 'T', 'EXTENTS'], ['W', 'Pencere', 'P', 'WINDOW']], num: true, def: 'E' });
    const v3 = C.views && C.views.v3; if (v3 && v3.visible && v3.visible()) { // 3B görünüm
      if (v === 'E' || v == null || v === 'W') { v3.fit(); if (v === 'W') C.log('3B\'de pencere yakınlaştırma yok: tümü gösterildi.'); }
      else if (typeof v === 'number' && v > 0) v3.zoomBy(1 / v, v3.W / 2, v3.H / 2);
      return;
    }
    const vw = C.activeView && C.activeView(); if (!vw) return;
    if (v === 'E' || v == null) vw.zoomExtents();
    else if (v === 'W') { const a = await I.pt('İlk köşe'); E.base = a; E.rubber = false; E.preview = c => [P([a, [c[0], a[1]], c, [a[0], c[1]]], true)]; const b = await I.pt('Karşı köşe'); if (a && b) vw.zoomBox([Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])], 0.02); }
    else if (typeof v === 'number') vw.zoomAt(vw.W / 2, vw.H / 2, v);
  }, { noUndo: true });
  C.addCommand(['UNDO', 'U', 'GERIAL'], 'Geri al', async (I) => { const n = Math.max(1, parseInt(E.queue[0]) || 1); E.queue = []; let k = 0; for (let i = 0; i < n; i++) if (C.undo()) k++; C.log(k ? `${k} adım geri alındı` : 'Geri alınacak bir şey yok'); }, { noUndo: true });
  C.addCommand(['REDO', 'YINELE'], 'Yinele', async () => { C.log(C.redo() ? 'Yinelendi' : 'Yinelenecek bir şey yok'); }, { noUndo: true });
  C.addCommand(['OSNAP', 'OS', 'YAKALAMA'], 'Nesne yakalama aç/kapat', async () => { C.state.osnap = !C.state.osnap; C.log('Nesne yakalama ' + (C.state.osnap ? 'AÇIK' : 'KAPALI')); C.emit('state'); }, { noUndo: true });
  C.addCommand(['ORTHO', 'ORTO'], 'Orto aç/kapat (F8)', async () => { C.state.ortho = !C.state.ortho; C.log('Orto ' + (C.state.ortho ? 'AÇIK' : 'KAPALI')); C.emit('state'); }, { noUndo: true });
  C.addCommand(['SNAP', 'SN', 'IZGARAYAKALA'], 'Izgara yakalama aç/kapat (F9)', async () => { C.state.gridSnap = !C.state.gridSnap; C.log('Izgara yakalama ' + (C.state.gridSnap ? 'AÇIK' : 'KAPALI')); C.emit('state'); }, { noUndo: true });
  C.addCommand(['OLCEK', 'ANNOSCALE', 'CIZIMOLCEGI'], 'Çizim/açıklama ölçeği 1:N (yazı, ölçü, çizgi tipi ölçeği buna göre). OLCEK 100', async (I) => {
    const v = await I.num('Ölçek paydası 1:', C.doc.set.anno); if (!(v > 0)) return;
    C.doc.set.anno = v; C.doc.set.ltscale = v / 1000; C.doc.ents.forEach(e => delete e._c); C.changed(); C.log(`Ölçek 1/${v}, LTSCALE=${v / 1000}`);
  });
  C.addCommand(['AYAR', 'SETVAR', 'SET'], 'Ayar değiştir: AYAR YAZI 2.5 | OKUCU 2.5 | ONDALIK 2 | TIK E/H | KOT 0', async (I) => {
    const k = await I.kw('Ayar', [['YAZI', 'Yazı', 'TEXTH'], ['OLCUYAZI', 'Ölçüyazı', 'DIMTXT'], ['OKUCU', 'Okucu', 'DIMASZ'], ['ONDALIK', 'Ondalık', 'DIMDEC'], ['TIK', 'Tik', 'DIMTICK']]); if (!k) return;
    const s = C.doc.set;
    if (k === 'TIK') { s.dimTick = C.up(await I.str('Eğik çizgi ok (E/H)', 'H', { whole: false })).startsWith('E'); }
    else { const v = await I.num('Değer'); if (v == null) return; if (k === 'YAZI') s.textH = v; if (k === 'OLCUYAZI') s.dimTextH = v; if (k === 'OKUCU') s.dimArrow = v; if (k === 'ONDALIK') s.dimDec = Math.round(v); }
    C.doc.ents.forEach(e => delete e._c); C.changed();
  });

  /* ---- ölçülendirme ---- */
  const dimCmd = (k) => async (I) => {
    const a = await I.pt('Birinci uzatma çizgisi başlangıcı', { kw: [['N', 'Nesne']] }); if (a == null) return;
    let p1 = a, p2;
    if (a === 'N') { const q = await I.pt('Ölçülecek çizgi'); const e = q && C.pickAt(q); if (!e || !(e.type === 'line')) { C.warn('Çizgi seçin'); return; } p1 = e.a; p2 = e.b; }
    else { E.base = p1; p2 = await I.pt('İkinci uzatma çizgisi başlangıcı'); if (!p2 || typeof p2 === 'string') return; }
    const kk = q => { if (k !== 'auto') return k; const mid = M.lerp(p1, p2, 0.5); const dx = Math.abs(q[0] - mid[0]), dy = Math.abs(q[1] - mid[1]); const inX = q[0] > Math.min(p1[0], p2[0]) && q[0] < Math.max(p1[0], p2[0]); const inY = q[1] > Math.min(p1[1], p2[1]) && q[1] < Math.max(p1[1], p2[1]); if (inX && !inY) return 'h'; if (inY && !inX) return 'v'; return dy > dx ? 'h' : 'v'; };
    E.base = null; E.preview = q => C.prims({ type: 'dim', k: kk(q), a: p1, b: p2, p: q, layer: C.doc.cur.layer });
    const p = await I.pt('Ölçü çizgisi konumu (ya da ofset mesafesi)', { num: true }); if (p == null) return;
    let pp = p;
    if (typeof p === 'number') { const u = M.norm(M.sub(p2, p1)); const n = k === 'h' ? [0, 1, 0] : k === 'v' ? [-1, 0, 0] : [-u[1], u[0], 0]; pp = M.add(M.lerp(p1, p2, 0.5), M.mul(n, p)); }
    C.ensureLayer('OLCU', 3, 'CONTINUOUS', 18);
    const e = C.newEnt('dim', { k: kk(pp), a: p1, b: p2, p: pp }); if (C.doc.cur.layer === '0') e.layer = 'OLCU';
    add(e);
  };
  C.addCommand(['DIMLINEAR', 'DLI', 'OLCU', 'OLCULENDIR'], 'Yatay/düşey ölçü: DIMLINEAR p1 p2 konum', dimCmd('auto'));
  C.addCommand(['DIMHOR', 'OLCUYATAY'], 'Yatay ölçü', dimCmd('h'));
  C.addCommand(['DIMVER', 'OLCUDUSEY'], 'Düşey ölçü', dimCmd('v'));
  C.addCommand(['DIMALIGNED', 'DAL', 'OLCUHIZALI'], 'Hizalı (eğik) ölçü', dimCmd('al'));
  C.addCommand(['DIMRADIUS', 'DRA', 'OLCUYARICAP'], 'Yarıçap ölçüsü: daire/yay/havuz seçin', async (I) => {
    const q = await I.pt('Daire veya yay seçin'); if (!q || typeof q === 'string') return; const e = C.pickAt(q);
    const c = e && (e.c || e.p), r = e && (e.r || (e.D ? e.D / 2 : (e.d ? e.d / 2 : null))); if (!c || !r) { C.warn('Daire seçin'); return; }
    E.preview = p => C.prims({ type: 'dim', k: 'r', c, r, ang: M.deg(M.ang(c, p)), layer: '0' });
    const p = await I.pt('Ölçü konumu'); if (!p || typeof p === 'string') return;
    C.ensureLayer('OLCU', 3, 'CONTINUOUS', 18); add(C.newEnt('dim', { k: 'r', c, r, ang: M.deg(M.ang(c, p)), layer: 'OLCU' }));
  });
  C.addCommand(['DIMDIAMETER', 'DDI', 'OLCUCAP'], 'Çap ölçüsü', async (I) => {
    const q = await I.pt('Daire seçin'); if (!q || typeof q === 'string') return; const e = C.pickAt(q);
    const c = e && (e.c || e.p), r = e && (e.r || (e.D ? e.D / 2 : (e.d ? e.d / 2 : null))); if (!c || !r) { C.warn('Daire seçin'); return; }
    E.preview = p => C.prims({ type: 'dim', k: 'd', c, r, ang: M.deg(M.ang(c, p)), layer: '0' });
    const p = await I.pt('Ölçü konumu'); if (!p || typeof p === 'string') return;
    C.ensureLayer('OLCU', 3, 'CONTINUOUS', 18); add(C.newEnt('dim', { k: 'd', c, r, ang: M.deg(M.ang(c, p)), layer: 'OLCU' }));
  });
  C.addCommand(['KOT', 'LEVEL', 'KOTISARETI'], 'Kot işareti. KOT nokta değer [açıklama]  (kesitte değer varsayılan = Y)', async (I) => {
    for (; ;) {
      const p = await I.pt('Kot noktası'); if (!p || typeof p === 'string') return;
      const v = await I.num('Kot değeri', +(E.kotRef != null ? p[1] - E.kotRef : p[1]).toFixed(2));
      const t = await I.str('Açıklama (Enter yok)', '');
      C.ensureLayer('KOT', 2, 'CONTINUOUS', 18); add(C.newEnt('kot', { p, v, txt: t || '', layer: 'KOT' }));
      if (E.scriptMode) return;
    }
  });

  C.addCommand(['HELP', 'YARDIM', '?', 'KOMUTLAR'], 'Komut listesi', async (I) => {
    const q = E.queue.length ? C.up(E.queue.shift()) : null;
    if (q && C.cmds[q]) { const d = C.cmds[q]; C.log(`${d.names.join(', ')}: ${d.help}`); return; }
    C.emit('help');
    C.cmdList.forEach(d => C.log(`${d.names[0].padEnd(16)} ${d.names.slice(1).join(',')} — ${d.help}`));
  }, { noUndo: true });
})(typeof window !== 'undefined' ? window.C : globalThis.C);

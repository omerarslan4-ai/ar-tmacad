/* ArıtmaCAD — blok kütüphanesi (vanalar vb.), blok yerleştirme, malzeme listesi (BOM) */
(function (C) {
  'use strict';
  const M = C.M, RAD = Math.PI / 180, { L, P, CI, S } = C.prim;

  /* ---------- adlandırmadan cins / DN / görünüş tanıma ---------- */
  C.TURLER = [
    ['Sürgülü vana', /s[uü]rg[uü]l[uü]|gate|\bsv\b|surgu/i], ['Kelebek vana', /kelebek|butterfly|\bkv\b/i], ['Çekvalf', /[cç]ek ?valf|check|non.?return|\bcv\b|geri ?d[oö]n/i],
    ['Küresel vana', /k[uü]resel|ball/i], ['Vantuz', /vantuz|air ?valve|hava ?tahliye/i], ['Pislik tutucu', /pislik|strainer|filtre/i], ['Demontaj parçası', /demontaj|dismant/i],
    ['Debimetre', /debimetre|flow ?meter|\bemf\b|manyetik/i], ['Bıçaklı vana', /b[ıi][cç]akl[ıi]|knife/i], ['Basınç düşürücü', /bas[ıi]n[cç] d[uü]ş|prv|reducing/i],
    ['Flanş', /fl[aa]n[sş]|flange/i], ['Dirsek', /dirsek|elbow|bend/i], ['TE', /\bte\b|tee/i], ['Redüksiyon', /red[uü]ks|reducer/i], ['Pompa', /pompa|pump/i],
  ];
  C.parseBlockName = n => {
    const s = String(n || ''); let tur = 'Diğer';
    for (const [t, re] of C.TURLER) if (re.test(s)) { tur = t; break; }
    const m = s.match(/DN\s*[-_ ]?\s*(\d{2,4})/i) || s.match(/[ØΦ⌀]\s*(\d{2,4})/) || s.match(/(?:^|[_\- ])(\d{2,4})(?:mm)?(?:$|[_\- ])/);
    const view = /kesit|section|yan|side|elev|g[oö]r[uü]n[uü][sş]|front|[oö]n/i.test(s) ? 'kesit' : /plan|[uü]st|top/i.test(s) ? 'plan' : 'plan';
    return { tur, dn: m ? +m[1] : null, view };
  };

  /* ---------- EN 558 boy (mm) ve EN 1092-1 PN16 flanş dış çapı ---------- */
  const DNS = [50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600];
  const tbl = arr => Object.fromEntries(DNS.map((d, i) => [d, arr[i]]));
  const FLD = tbl([165, 185, 200, 220, 250, 285, 340, 405, 460, 520, 580, 640, 715, 840]);
  const FTF = { 'Sürgülü vana': tbl([150, 170, 180, 190, 200, 210, 230, 250, 270, 290, 310, 330, 350, 390]), 'Kelebek vana': tbl([43, 46, 46, 52, 56, 56, 60, 68, 78, 78, 102, 114, 127, 154]), 'Çekvalf': tbl([230, 290, 310, 350, 400, 480, 600, 730, 850, 980, 1100, 1200, 1250, 1450]), 'Pislik tutucu': tbl([230, 290, 310, 350, 400, 480, 600, 730, 850, 980, 1100, 1200, 1250, 1450]), 'Demontaj parçası': tbl([200, 200, 200, 200, 200, 200, 220, 220, 250, 250, 250, 300, 300, 300]) };
  C.SCHEMA_TURLER = Object.keys(FTF);
  C.SCHEMA_DNS = DNS;
  const near = (t, dn) => { const k = DNS.reduce((a, b) => Math.abs(b - dn) < Math.abs(a - dn) ? b : a); return t[k]; };

  /* şematik blok tanımı (mm, merkez 0,0, akış X yönünde) */
  C.schematicDef = function (tur, dn, view) {
    const D = near(FLD, dn), Lf = near(FTF[tur] || FTF['Sürgülü vana'], dn), tf = D < 300 ? 18 : D < 500 ? 24 : 30, r = dn / 2;
    const ents = [], E = (type, props) => ents.push(Object.assign({ type, layer: '0', color: 0, lt: 'BYBLOCK', lw: -2 }, props));
    const rect = (x0, y0, x1, y1, extra) => E('pline', Object.assign({ pts: [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]], closed: true }, extra));
    const h = Lf / 2;
    E('line', { a: [-h - 25, 0, 0], b: [h + 25, 0, 0], lt: 'CENTER', lw: 13 });
    const flanges = () => { rect(-h, -D / 2, -h + tf, D / 2); rect(h - tf, -D / 2, h, D / 2); };
    if (tur === 'Kelebek vana') {
      rect(-h, -D * 0.43, h, D * 0.43);
      if (view === 'kesit') { E('line', { a: [-h * 0.6, -r * 0.9, 0], b: [h * 0.6, r * 0.9, 0] }); rect(-dn * 0.12, D * 0.43, dn * 0.12, D * 0.43 + dn * 0.6); rect(-dn * 0.35, D * 0.43 + dn * 0.6, dn * 0.35, D * 0.43 + dn * 0.6 + 40); }
      else { rect(-dn * 0.12, -dn * 0.12, dn * 0.12, dn * 0.12); rect(-D * 0.45, -20, -D * 0.12, 20); }
    } else if (tur === 'Çekvalf') {
      flanges();
      E('pline', { pts: [[-h + tf, -D * 0.38, 0], [-h * 0.4, -D * 0.55, 0], [h * 0.4, -D * 0.55, 0], [h - tf, -D * 0.38, 0], [h - tf, D * 0.38, 0], [h * 0.4, D * 0.55, 0], [-h * 0.4, D * 0.55, 0], [-h + tf, D * 0.38, 0]], closed: true });
      E('line', { a: [-h * 0.35, 0, 0], b: [h * 0.3, 0, 0] }); E('solid', { pts: [[h * 0.42, 0, 0], [h * 0.25, D * 0.08, 0], [h * 0.25, -D * 0.08, 0]] });
      if (view === 'kesit') rect(-h * 0.3, D * 0.55, h * 0.3, D * 0.55 + 30);
      else E('circle', { c: [0, 0, 0], r: D * 0.18 });
    } else if (tur === 'Pislik tutucu') {
      flanges(); rect(-h + tf, -D * 0.4, h - tf, D * 0.4);
      const sx0 = h * 0.1, sy0 = -D * 0.3, len = D * 0.9, w = D * 0.28, dx = Math.SQRT1_2, dy = -Math.SQRT1_2, nx = Math.SQRT1_2, ny = Math.SQRT1_2;
      if (view === 'kesit') E('pline', { pts: [[sx0 - nx * w / 2, sy0 - ny * w / 2, 0], [sx0 + nx * w / 2, sy0 + ny * w / 2, 0], [sx0 + nx * w / 2 + dx * len, sy0 + ny * w / 2 + dy * len, 0], [sx0 - nx * w / 2 + dx * len, sy0 - ny * w / 2 + dy * len, 0]], closed: true });
      else E('circle', { c: [sx0 + len * 0.35, 0, 0], r: w / 2 });
    } else if (tur === 'Demontaj parçası') {
      flanges(); rect(-h + tf, -r - 8, 10, r + 8); rect(-10, -r - 16, h - tf, r + 16);
      for (const y of [-D * 0.42, D * 0.42]) E('line', { a: [-h, y, 0], b: [h, y, 0], lt: 'HIDDEN', lw: 13 });
    } else { // sürgülü vana
      flanges(); rect(-h + tf, -D * 0.42, h - tf, D * 0.42);
      if (view === 'kesit') { rect(-h * 0.45, D * 0.42, h * 0.45, D / 2 + dn * 0.9); E('line', { a: [0, D / 2 + dn * 0.9, 0], b: [0, D / 2 + dn * 1.25, 0], lw: 35 }); rect(-D * 0.4, D / 2 + dn * 1.25, D * 0.4, D / 2 + dn * 1.25 + 14); }
      else { E('circle', { c: [0, 0, 0], r: D * 0.4 }); E('circle', { c: [0, 0, 0], r: D * 0.06 }); E('line', { a: [-D * 0.4, 0, 0], b: [D * 0.4, 0, 0] }); E('line', { a: [0, -D * 0.4, 0], b: [0, D * 0.4, 0] }); }
    }
    const def3 = C.schematic3D(tur, dn, D, Lf, tf, r);
    const def = { mesh3d: view === 'plan' ? def3 : null, id: `SEMA_${C.ascii(tur).toUpperCase().replace(/\W+/g, '_')}_DN${dn}_${view.toUpperCase()}`, name: `${tur} DN${dn} ${view === 'kesit' ? 'kesit' : 'plan'}`, tur, dn, view, unit: 'mm', ents, src: 'şematik (EN 558 / PN16 yaklaşık)' };
    def.bb = defBox(def); return def;
  };
  /* şematik 3B gövde (mm, eksen X, merkez 0,0,0) -> {v, f} */
  C.schematic3D = function (tur, dn, D, Lf, tf, r) {
    const { cylSeg, cylZ, boxM } = C.meshDef, h = Lf / 2, ds = [];
    const X = (x, y, z) => [x, y || 0, z || 0];
    const fl = () => { ds.push(cylSeg(X(-h), X(-h + tf), D / 2, { seg: 24 }), cylSeg(X(h - tf), X(h), D / 2, { seg: 24 })); };
    if (tur === 'Kelebek vana') { ds.push(cylSeg(X(-h), X(h), D * 0.43, { seg: 24 }), cylZ([0, 0], dn * 0.12, D * 0.4, dn * 0.6, { seg: 12 }), boxM(C.frame([0, 0, 0], 0), -dn * 0.35, -dn * 0.25, D * 0.4 + dn * 0.6, dn * 0.7, dn * 0.5, dn * 0.35)); }
    else if (tur === 'Çekvalf') { fl(); ds.push(cylSeg(X(-h + tf), X(h - tf), D * 0.52, { seg: 24 }), cylZ([0, 0], h * 0.3, D * 0.45, D * 0.15, { seg: 16 })); }
    else if (tur === 'Pislik tutucu') { fl(); ds.push(cylSeg(X(-h + tf), X(h - tf), D * 0.4, { seg: 24 }), cylSeg(X(h * 0.1, 0, 0), X(h * 0.1 + D * 0.64, 0, -D * 0.64), D * 0.14, { seg: 16 })); }
    else if (tur === 'Demontaj parçası') { fl(); ds.push(cylSeg(X(-h + tf), X(10), r + 8, { seg: 24 }), cylSeg(X(-10), X(h - tf), r + 16, { seg: 24 })); }
    else { fl(); ds.push(cylSeg(X(-h + tf), X(h - tf), D * 0.42, { seg: 24 }), cylZ([0, 0], h * 0.42, D * 0.3, D / 2 + dn * 0.9 - D * 0.3, { seg: 18 }), cylZ([0, 0], Math.max(4, dn * 0.04), D / 2 + dn * 0.9, dn * 0.35, { seg: 8 }), cylZ([0, 0], D * 0.4, D / 2 + dn * 1.25, 14, { seg: 24 })); }
    const t = { pos: [], nrm: [], edges: [] }; ds.filter(Boolean).forEach(d => C.meshTris(d, t));
    return C.trisToMesh(t.pos);
  };
  C.trisToMesh = pos => { const v = [], f = [], key = new Map(); const vi = (x, y, z) => { const k = x.toFixed(3) + ',' + y.toFixed(3) + ',' + z.toFixed(3); let i = key.get(k); if (i == null) { i = v.length; v.push([+x.toFixed(4), +y.toFixed(4), +z.toFixed(4)]); key.set(k, i); } return i; }; for (let i = 0; i < pos.length; i += 9) f.push([vi(pos[i], pos[i + 1], pos[i + 2]), vi(pos[i + 3], pos[i + 4], pos[i + 5]), vi(pos[i + 6], pos[i + 7], pos[i + 8])]); return { v, f }; };
  function defBox(def) { const bb = [Infinity, Infinity, -Infinity, -Infinity]; for (const e of def.ents) { const t = C.T[e.type]; if (!t) continue; for (const pr of t.prims(e)) C.primBox(pr, bb); } if (bb[0] === Infinity && def.mesh3d) for (const v of def.mesh3d.v) { bb[0] = Math.min(bb[0], v[0]); bb[1] = Math.min(bb[1], v[1]); bb[2] = Math.max(bb[2], v[0]); bb[3] = Math.max(bb[3], v[1]); } return bb; }
  C.defBox = defBox;

  /* ---------- kütüphane (kalıcı, tarayıcıda) ---------- */
  /* kütüphane IndexedDB'de (büyük 3B modeller için), bellek önbelleğiyle */
  const IDB = typeof indexedDB !== 'undefined' ? indexedDB : null;
  const idb = (mode, fn) => new Promise((res, rej) => { if (!IDB) return res(null); const rq = IDB.open('aritmacad', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('blocks', { keyPath: 'id' }); rq.onerror = () => rej(rq.error); rq.onsuccess = () => { const db = rq.result, tx = db.transaction('blocks', mode), st = tx.objectStore('blocks'); const r = fn(st); tx.oncomplete = () => { db.close(); res(r && r.result); }; tx.onerror = () => rej(tx.error); }; });
  C.blib = {
    cache: {},
    async init() {
      try { const all = await idb('readonly', st => st.getAll()); (all || []).forEach(d => { this.cache[d.id] = d; }); } catch (e) { }
      try { const old = JSON.parse(localStorage.getItem('aritmacad.bloklib') || 'null'); if (old) { for (const d of Object.values(old)) { this.cache[d.id] = d; await idb('readwrite', st => st.put(d)); } localStorage.removeItem('aritmacad.bloklib'); } } catch (e) { }
      C.emit('blib');
    },
    load() { return this.cache; },
    save(lib) { this.cache = lib; idb('readwrite', st => { st.clear(); for (const d of Object.values(lib)) st.put(d); }).catch(e => C.warn('Kütüphane kaydedilemedi: ' + e.message)); return true; },
    put(def) { this.cache[def.id] = def; idb('readwrite', st => st.put(def)).catch(e => C.warn('Kütüphane kaydedilemedi: ' + e.message)); },
    remove(id) { delete this.cache[id]; idb('readwrite', st => st.delete(id)).catch(() => { }); },
    all() { return Object.values(this.cache); },
  };
  C.blib.init();
  const uid = C.blkUid = name => 'U_' + C.ascii(name).toUpperCase().replace(/\W+/g, '_').slice(0, 40) + '_' + Date.now().toString(36).slice(-4);

  /* ---------- BLOK varlığı ---------- */
  C.T.blk = {
    label: 'Blok',
    X: e => { const r = (e.rot || 0) * RAD, cs = Math.cos(r), sn = Math.sin(r), sx = e.sx || 1, sy = e.sy || e.sx || 1, p = M.p3(e.p); return C.makeX(q => [p[0] + q[0] * sx * cs - q[1] * sy * sn, p[1] + q[0] * sx * sn + q[1] * sy * cs], [sx * cs, sx * sn, -sy * sn, sy * cs], p[2] || 0); },
    prims: e => {
      const def = (C.doc.blocks || {})[e.ref]; if (!def) return [CI(e.p, 0.1), L(M.add(e.p, [-0.1, -0.1]), M.add(e.p, [0.1, 0.1]))];
      const X = C.T.blk.X(e), out = [];
      for (const d0 of def.ents) { const d = JSON.parse(JSON.stringify(d0)); C.xform(d, X); const t = C.T[d.type]; if (!t) continue; for (const pr of t.prims(d)) { if (d.color != null && d.color !== 0 && pr.color == null) pr.color = d.color; if (d.lt && d.lt !== 'BYBLOCK' && d.lt !== 'BYLAYER' && !pr.lt) pr.lt = d.lt; if (d.lw != null && d.lw >= 0 && pr.lw == null) pr.lw = d.lw; out.push(pr); } }
      return out;
    },
    mesh: e => {
      const def = (C.doc.blocks || {})[e.ref]; if (!def || !def.mesh3d || e.view === 'kesit') return null;
      const X = C.T.blk.X(e), z0 = (e.p[2] || 0), sz = Math.abs(e.sx || 1);
      return [{ t: 'tri', v: def.mesh3d.v.map(q => { const w = X.p([q[0], q[1], 0]); return [w[0], w[1], z0 + q[2] * sz]; }), f: X.mir ? def.mesh3d.f.map(f => [f[0], f[2], f[1]]) : def.mesh3d.f, fc: def.mesh3d.fc }];
    },
    snaps: e => [{ p: M.p3(e.p), k: 'ins' }],
    xf: (e, X) => { e.p = X.p(e.p); const r0 = (e.rot || 0) * RAD, v = X.v([Math.cos(r0), Math.sin(r0), 0]); e.rot = Math.atan2(v[1], v[0]) / RAD; e.sx = (e.sx || 1) * X.s; e.sy = (e.sy || e.sx || 1) * X.s * (X.mir ? -1 : 1); },
    info: e => `${e.tur || ''} ${e.dn ? 'DN' + e.dn : ''} ${e.view || ''} [${((C.doc.blocks || {})[e.ref] || {}).name || e.ref}]`,
  };
  C.useDef = def => { C.doc.blocks = C.doc.blocks || {}; if (!C.doc.blocks[def.id]) C.doc.blocks[def.id] = JSON.parse(JSON.stringify(def)); return C.doc.blocks[def.id]; };
  C.unitK = def => def.unit === 'm' ? 1 : def.unit === 'cm' ? 0.01 : 0.001;

  /* ---------- tanım bul ---------- */
  C.findDefs = (tur, dn, view) => {
    const user = C.blib.all().filter(d => (!tur || d.tur === tur) && (!dn || d.dn === dn) && (!view || d.view === view));
    return user;
  };
  C.resolveDef = (tur, dn, view) => {
    const u = C.findDefs(tur, dn, view); if (u.length) return u[0];
    if (C.SCHEMA_TURLER.includes(tur)) return C.schematicDef(tur, dn || 150, view || 'plan');
    return null;
  };

  /* ---------- yerleştirme komutu ---------- */
  const takeKV = () => { const kv = {}; C.cmd.queue = C.cmd.queue.filter(t => { const m = t.match(/^([A-Za-zÇĞİÖŞÜçğıöşü_]+)=(.*)$/); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; }); return kv; };
  const turFrom = s => { if (!s) return null; const u = C.ascii(s).toLowerCase(); for (const [t, re] of C.TURLER) if (re.test(s) || re.test(u) || C.ascii(t).toLowerCase().startsWith(u)) return t; return s; };
  C.insertBlock = async function (I, def, opts = {}) {
    def = C.useDef(def);
    const k = C.unitK(def);
    const tmp = { type: 'blk', ref: def.id, p: [0, 0, 0], rot: opts.rot || 0, sx: k, sy: k, layer: C.doc.cur.layer };
    C.cmd.preview = c => { tmp.p = c; return C.T.blk.prims(tmp); };
    const p = await I.pt(`Yerleştirme noktası (${def.name})`); C.cmd.preview = null; if (!p || typeof p === 'string') return null;
    const f = opts.f != null ? opts.f : await I.num('Ölçek çarpanı (1 = gerçek boyut)', 1);
    tmp.sx = tmp.sy = k * (f || 1); tmp.p = p;
    C.cmd.base = p; C.cmd.preview = c => { tmp.rot = M.deg(M.ang(p, c)); return C.T.blk.prims(tmp); };
    const rot = opts.rot != null ? opts.rot : await I.angle('Döndürme açısı (boru yönü)', p, 0); C.cmd.preview = null;
    const lay = C.doc.cur.layer === '0' ? (def.layer ? (C.ensureLayer(def.layer, def.layerColor || 8, 'CONTINUOUS', 25), def.layer) : C.std(def.tur === 'Pompa' ? 'POMPA' : 'VANA')) : C.doc.cur.layer;
    return C.add(C.newEnt('blk', { ref: def.id, p, rot: rot || 0, sx: tmp.sx, sy: tmp.sx, tur: def.tur, dn: def.dn, view: def.view, layer: lay }));
  };
  C.addCommand(['BLOKEKLE', 'VANAEKLE', 'BINSERT', 'INSERT', 'I'], 'Kütüphaneden blok yerleştirir: VANAEKLE TUR=surgulu DN=150 GORUNUS=plan nokta [ölçek] [açı] — parametresiz: kütüphane penceresi', async (I) => {
    const kv = takeKV();
    if (!kv.TUR && !kv.AD && !kv.ID) { if (C.openBlockLib) { C.openBlockLib(); return; } }
    let def = kv.ID ? (C.blib.load()[kv.ID]) : null;
    if (!def && kv.AD) def = C.blib.all().find(d => C.up(d.name) === C.up(kv.AD));
    if (!def) def = C.resolveDef(turFrom(kv.TUR), kv.DN ? +kv.DN : null, kv.GORUNUS ? (/kes|yan|sec/i.test(kv.GORUNUS) ? 'kesit' : 'plan') : null);
    if (!def) { C.warn('Uygun blok bulunamadı. BLOKKUTUPHANESI ile kütüphaneye bakın.'); return; }
    await C.insertBlock(I, def, { f: kv.OLCEK ? C.num(kv.OLCEK) : (C.cmd.scriptMode ? 1 : undefined), rot: kv.ACI != null ? C.num(kv.ACI) : undefined });
  });
  C.addCommand(['BLOKYAP', 'BLOCK', 'B', 'BMAKE'], 'Seçili çizgilerden kütüphaneye blok yapar (cins, DN, görünüş sorulur)', async (I) => {
    const s = await I.sel('Blok yapılacak nesneler'); if (!s.length) return;
    const b = await I.pt('Taban (yerleştirme) noktası'); if (!b || typeof b === 'string') return;
    const name = await I.str('Blok adı', 'SURGULU_VANA_DN150_PLAN');
    const g = C.parseBlockName(name);
    const tur = turFrom(await I.str('Cinsi', g.tur)) || g.tur, dn = await I.num('DN', g.dn || 150), view = /kes|yan/i.test(await I.str('Görünüş (plan/kesit)', g.view)) ? 'kesit' : 'plan';
    const X = C.xMove(M.mul(M.p3(b), -1));
    const ents = s.flatMap(e => (['line', 'pline', 'circle', 'arc', 'text', 'solid', 'point'].includes(e.type) ? [e] : C.explode(e))).map(e => { const c = JSON.parse(JSON.stringify(C.cleanEnt(e))); C.xform(c, X); c.layer = '0'; delete c.id; return c; });
    const def = { id: uid(name), name, tur, dn, view, unit: 'm', ents, src: 'çizimden' }; def.bb = defBox(def);
    C.blib.put(def); C.log(`"${name}" kütüphaneye eklendi (${tur} DN${dn} ${view}).`);
    if (C.up(await I.str('Çizimdekileri bu blokla değiştir? (E/H)', 'E')).startsWith('E')) { C.remove(s); C.useDef(def); C.add(C.newEnt('blk', { ref: def.id, p: b, rot: 0, sx: 1, sy: 1, tur, dn, view, layer: s[0].layer })); }
  });
  /* DXF/DWG dosyasındaki tüm blokları kütüphaneye al */
  C.importBlockFile = async function (file) {
    let bytes = new Uint8Array(await file.arrayBuffer());
    if (file.name.toLowerCase().endsWith('.dwg')) bytes = await C.dwg.toDxf(bytes);
    const r = C.dxfImport(C.dxfDecode(bytes), { noParam: true, blocks: true });
    const unitByIns = { 4: 'mm', 5: 'cm', 6: 'm' };
    let n = 0; const lib = C.blib.load();
    const addDef = (name, ents) => {
      ents = ents.filter(e => C.T[e.type] && e.type !== 'blk').map(e => { const o = C.cleanEnt(e); delete o.id; return o; });
      const m3 = ents.filter(e => e.type === 'pmesh' || e.type === 'face'); ents = ents.filter(e => !(e.type === 'pmesh' || e.type === 'face'));
      let mesh3d = null;
      if (m3.length) { const t = { pos: [], nrm: [], edges: [] }; for (const e of m3) for (const d of C.T[e.type].mesh(e)) C.meshTris(d, t); mesh3d = C.trisToMesh(t.pos); }
      if (!ents.length && mesh3d) ents = C.planFromMesh(mesh3d);
      if (!ents.length) return;
      const g = C.parseBlockName(name), def = { id: uid(name), name, tur: g.tur, dn: g.dn, view: g.view, ents, mesh3d, src: file.name };
      def.bb = defBox(def); const w = Math.max(def.bb[2] - def.bb[0], def.bb[3] - def.bb[1]);
      def.unit = unitByIns[r.insUnits] || (w > 30 ? 'mm' : 'm');
      lib[def.id] = def; n++;
    };
    for (const [name, b] of Object.entries(r.blockDefs || {})) { if (name.startsWith('*') || /^A\$C|^_/.test(name)) continue; addDef(name, b); }
    if (!n && r.ents.length) { // blok yoksa tüm çizim tek blok
      const bb = C.extents(r.ents.map(e => Object.assign({ layer: '0' }, e))); const X = C.xMove([-(bb[0] + bb[2]) / 2, -(bb[1] + bb[3]) / 2, 0]);
      r.ents.forEach(e => C.xform(e, X)); addDef(file.name.replace(/\.[^.]+$/, ''), r.ents);
    }
    C.blib.save(lib);
    return n;
  };
  /* 3B modelden plan sembolü: üstten görünüş dış çizgisi + eksen */
  C.planFromMesh = m => {
    let bb = [Infinity, Infinity, -Infinity, -Infinity]; for (const v of m.v) { bb[0] = Math.min(bb[0], v[0]); bb[1] = Math.min(bb[1], v[1]); bb[2] = Math.max(bb[2], v[0]); bb[3] = Math.max(bb[3], v[1]); }
    const E = (type, pr) => Object.assign({ type, layer: '0', color: 0, lt: 'BYBLOCK', lw: -2 }, pr);
    return [E('pline', { pts: [[bb[0], bb[1], 0], [bb[2], bb[1], 0], [bb[2], bb[3], 0], [bb[0], bb[3], 0]], closed: true }), E('line', { a: [bb[0], 0, 0], b: [bb[2], 0, 0], lt: 'CENTER', lw: 13 }), E('line', { a: [bb[0], bb[1], 0], b: [bb[2], bb[3], 0], lw: 13 }), E('line', { a: [bb[0], bb[3], 0], b: [bb[2], bb[1], 0], lw: 13 })];
  };
  /* STL / OBJ 3B model okuma -> {v,f} */
  C.readModel = function (name, buf) {
    const b = new Uint8Array(buf), low = name.toLowerCase();
    if (low.endsWith('.obj')) {
      const v = [], f = []; for (const ln of new TextDecoder().decode(b).split(/\r?\n/)) { const t = ln.trim().split(/\s+/); if (t[0] === 'v') v.push([+t[1], -(+t[3]), +t[2]]); else if (t[0] === 'f') { const ix = t.slice(1).map(x => parseInt(x) - 1); for (let i = 1; i < ix.length - 1; i++) f.push([ix[0], ix[i], ix[i + 1]]); } }
      return { v, f };
    }
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const n = b.length >= 84 ? dv.getUint32(80, true) : 0;
    if (b.length === 84 + n * 50) { const pos = []; for (let i = 0; i < n; i++) { const o = 84 + i * 50 + 12; for (let k = 0; k < 9; k++) pos.push(dv.getFloat32(o + k * 4, true)); } return C.trisToMesh(pos); }
    const pos = []; for (const m of new TextDecoder().decode(b).matchAll(/vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g)) pos.push(+m[1], +m[2], +m[3]); return C.trisToMesh(pos);
  };
  C.importModelFile = async function (file, unit, center) {
    const m = C.readModel(file.name, await file.arrayBuffer()); if (!m.f.length) throw new Error('Modelde üçgen bulunamadı');
    if (center) { let bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; for (const v of m.v) for (let k = 0; k < 3; k++) { bb[k] = Math.min(bb[k], v[k]); bb[k + 3] = Math.max(bb[k + 3], v[k]); } const c = [(bb[0] + bb[3]) / 2, (bb[1] + bb[4]) / 2, (bb[2] + bb[5]) / 2]; m.v = m.v.map(v => [v[0] - c[0], v[1] - c[1], v[2] - c[2]]); }
    const name = file.name.replace(/\.[^.]+$/, ''), g = C.parseBlockName(name);
    const def = { id: uid(name), name, tur: g.tur, dn: g.dn, view: 'plan', unit: unit || 'mm', ents: C.planFromMesh(m), mesh3d: m, src: file.name };
    def.bb = defBox(def); C.blib.put(def); return def;
  };
  C.addCommand(['MODELYUKLE', '3BMODEL', 'STLYUKLE'], '3B vana modeli (STL / OBJ) kütüphaneye ekler. Model: akış X yönünde, Z yukarı, orijin vana ekseninin ortasında olmalı', async (I) => {
    const f = await C.pickFile('.stl,.obj'); if (!f) return;
    const unit = await I.kw('Model birimi', [['mm'], ['cm'], ['m']], 'mm');
    const cen = await I.kw('Orijini modelin ortasına al?', [['H', 'Hayır (modeldeki orijin)'], ['E', 'Evet']], 'H');
    const def = await C.importModelFile(f, unit, cen === 'E');
    C.log(`3B model eklendi: ${def.name} (${def.mesh3d.f.length} üçgen). Cins/DN: ${def.tur} ${def.dn ? 'DN' + def.dn : '?'} — kütüphaneden düzeltebilirsiniz.`);
  }, { noUndo: true });
  C.addCommand(['BLOKYUKLE', 'KUTUPHANEYUKLE'], 'DWG/DXF dosyasındaki blokları (ör. vana çizimleriniz) kütüphaneye alır', async () => {
    const f = await C.pickFile('.dwg,.dxf'); if (!f) return;
    const n = await C.importBlockFile(f); C.log(`${n} blok kütüphaneye eklendi. Cins/DN/görünüşü blok adından tanındı; kütüphane penceresinden düzeltebilirsiniz.`);
    if (C.openBlockLib) C.openBlockLib();
  }, { noUndo: true });
  C.addCommand(['BLOKKUTUPHANESI', 'KUTUPHANE', 'BLOKLAR', 'VANALAR'], 'Blok/vana kütüphanesi penceresi', async () => { if (C.openBlockLib) C.openBlockLib(); }, { noUndo: true });

  /* ---------- MALZEME LİSTESİ (BOM) ---------- */
  C.bom = function (ents) {
    const rows = new Map();
    const add = (key, mal, dn, q, unit) => { const r = rows.get(key) || { mal, dn, q: 0, unit }; r.q += q; rows.set(key, r); };
    const VK = { surgulu: 'Sürgülü vana', cekvalf: 'Çekvalf', kelebek: 'Kelebek vana' };
    for (const e of ents) {
      if (e.type === 'blk') { if (e.view === 'kesit' && ents.some(o => o !== e && o.type === 'blk' && o.view !== 'kesit' && o.tur === e.tur && o.dn === e.dn)) continue; const dfx = (C.doc.blocks || {})[e.ref] || {}; const nm = String(e.ref).startsWith('FIT_') ? dfx.name : (e.tur && e.tur !== 'Diğer' ? e.tur : dfx.name || 'Blok'); add('n|' + nm + '|' + (e.dn || ''), nm, e.dn, 1, 'adet'); }
      else if (e.type === 'valve') add('n|' + (VK[e.kind] || 'Vana') + '|' + (e.dn || ''), VK[e.kind] || 'Vana', e.dn, 1, 'adet');
      else if (e.type === 'pump') add('p|' + (e.kind || '') + '|' + (e.q || ''), `${e.kind === 'kuru' ? 'Kuru tip' : 'Dalgıç'} pompa${e.q ? ` Q=${e.q} l/s` : ''}${e.hm ? ` H=${e.hm} m` : ''}`, null, 1, 'adet');
      else if (e.type === 'fit') add('f|' + C.fitName(e) + '|' + e.dn + '|' + (e.dn2 || ''), C.fitName(e) + (e.kind === 'te' && e.dn2 && e.dn2 !== e.dn ? ` ${e.dn}/${e.dn2}` : ''), e.dn, 1, 'adet');
      if (e.type === 'pipe' && C.pipeElbows) for (const el of C.pipeElbows(e)) add('e|' + el.std + '|' + e.dn + '|' + C.matKind(e.mat), `Dirsek ${String(el.std).replace('.', ',')}° (${C.matKind(e.mat)})`, e.dn, 1, 'adet');
      if (e.type === 'pipe') { let l = 0; for (let i = 1; i < e.pts.length; i++) l += M.dist(e.pts[i - 1], e.pts[i]); add('r|' + e.dn + '|' + (e.mat || ''), `Boru ${e.mat || ''}`.trim(), e.dn, l, 'm'); }
    }
    return [...rows.values()].sort((a, b) => a.mal.localeCompare(b.mal, 'tr') || (a.dn || 0) - (b.dn || 0)).map((r, i) => Object.assign({ poz: i + 1 }, r));
  };
  C.bomTable = function (rows, p) {
    const k = C.annoH(1), lay = C.std('YAZI'); C.ensureLayer('BOM', 7, 'CONTINUOUS', 25);
    const cols = [['POZ', 12, 'C'], ['MALZEME', 74, 'L'], ['DN', 18, 'C'], ['MİKTAR', 22, 'R'], ['BİRİM', 16, 'C']], rh = 7;
    const W = cols.reduce((a, c) => a + c[1], 0), nR = rows.length + 2;
    const x0 = p[0], yTop = p[1];
    const ln = (a, b, lw) => C.add(C.newEnt('line', { a, b, layer: 'BOM', lw: lw || -1 }));
    const tx = (x, y, s, al, h) => C.add(C.newEnt('text', { p: [x, y, 0], h: (h || 2.5) * k, s: String(s), rot: 0, al, layer: 'BOM' }));
    for (let r = 0; r <= nR; r++) ln([x0, yTop - r * rh * k, 0], [x0 + W * k, yTop - r * rh * k, 0], r <= 2 || r === nR ? 50 : 18);
    let x = 0; ln([x0, yTop, 0], [x0, yTop - nR * rh * k, 0], 50);
    for (const [, w] of cols) { x += w; ln([x0 + x * k, yTop - rh * k, 0], [x0 + x * k, yTop - nR * rh * k, 0], x === W ? 50 : 18); }
    ln([x0 + W * k, yTop, 0], [x0 + W * k, yTop - rh * k, 0], 50);
    tx(x0 + W / 2 * k, yTop - rh * 0.72 * k, 'MALZEME LİSTESİ', 'C', 3.5);
    const row = (ri, vals) => { let cx = 0; cols.forEach(([, w, al], ci) => { const xx = al === 'L' ? cx + 2 : al === 'R' ? cx + w - 2 : cx + w / 2; tx(x0 + xx * k, yTop - (ri + 0.72) * rh * k, vals[ci], al); cx += w; }); };
    row(1, cols.map(c => c[0]));
    rows.forEach((r, i) => row(i + 2, [r.poz, r.mal, r.dn ? 'DN' + r.dn : '-', r.unit === 'm' ? M.fmt(r.q, 1) : r.q, r.unit]));
  };
  C.addCommand(['BOM', 'MALZEME', 'MALZEMELISTESI', 'METRAJ'], 'Malzeme listesi (vana/blok adetleri, pompalar, boru metrajı): BOM [HEPSI|SECIM]', async (I) => {
    const m = await I.kw('Kapsam', [['HEPSI', 'Tüm çizim'], ['SECIM', 'Seçim']], 'HEPSI');
    const ents = m === 'SECIM' ? await I.sel('Nesneleri seçin') : C.doc.ents;
    const rows = C.bom(ents);
    if (!rows.length) { C.warn('Listelenecek vana, blok, pompa ya da boru yok.'); return; }
    rows.forEach(r => C.log(`${String(r.poz).padStart(2)}  ${r.mal.padEnd(26)} ${r.dn ? 'DN' + r.dn : ''}  ${r.unit === 'm' ? M.fmt(r.q, 1) : r.q} ${r.unit}`));
    if (C.showBom && !C.cmd.scriptMode) { C.showBom(rows); return; }
    const p = await I.pt('Tablonun sol üst köşesi (Enter = çizme)'); if (p && typeof p !== 'string') C.bomTable(rows, p);
  });
})(window.C);

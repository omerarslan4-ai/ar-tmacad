/* ArıtmaCAD — DXF okuma / yazma (AutoCAD 2000 = AC1015, kalınlıklı; isteğe bağlı R12) */
(function (C) {
  'use strict';
  const M = C.M, RAD = Math.PI / 180;
  const COMPOSITE = C.COMPOSITE = new Set(['seviyecizgi', 'acilim', 'mahaltablo', 'su', 'korkuluk', 'merdiven', 'izgara', 'tretuvar', 'cati', 'yalitim', 'kaplama', 'dolgu', 'perde', 'kolon', 'kiris', 'plak', 'temel', 'acik', 'kduzlem', 'kazi', 'koord', 'kesitisaret', 'baslik', 'arazi', 'grup3', 'sweep', 'ctext', 'wall', 'slab', 'tank', 'ctank', 'pipe', 'pump', 'valve', 'kot', 'dim', 'sheet', 'box', 'cyl', 'kati', 'poly3']);
  const BLK_PREFIX = { wall: 'DUVAR', slab: 'DOSEME', tank: 'HAVUZ', ctank: 'DHAVUZ', pipe: 'BORU', pump: 'POMPA', valve: 'VANA', kot: 'KOT', dim: 'OLCU', sheet: 'PAFTA', box: 'KUTU', grup3: 'BIRLESIK', sweep: 'SUPURME', ctext: 'EGRIYAZI', cyl: 'SILINDIR', kati: 'KATI', poly3: 'COKYUZLU' };

  /* ---- metin kodlama ---- */
  const enc = s => String(s).replace(/°/g, '%%d').replace(/±/g, '%%p').replace(/Ø/g, '%%c').replace(/[^\x20-\x7e]/g, ch => '\\U+' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));
  const dec = s => String(s).replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/%%[dD]/g, '°').replace(/%%[pP]/g, '±').replace(/%%[cC]/g, 'Ø').replace(/%%%/g, '%').replace(/%%[uUoO]/g, '');
  const nameSafe = s => enc(String(s).replace(/[<>\/\\":;?*|=,`]/g, '_')); // önce yasak karakterler, sonra kodlama (Ö, İ … \U+ kaçışı bozulmasın)
  const fx = v => { if (!isFinite(v)) v = 0; const s = (Math.abs(v) < 1e-12 ? 0 : v).toFixed(10).replace(/\.?0+$/, ''); return s === '-0' ? '0' : s; };

  /* ---- polyface yüzleri (görünmez kenar bilgisiyle) ---- */
  C.meshFaces = function (d) {
    const V = [], F = [], key = new Map();
    const vi = p => { const k = p.map(v => v.toFixed(6)).join(','); let i = key.get(k); if (i == null) { i = V.length; V.push(p); key.set(k, i); } return i + 1; };
    if (d.t === 'tri') { for (const f of d.f) F.push(f.map(i => vi(M.p3(d.v[i])))); return { V, F }; }
    if (d.t === 'tube') { const t = C.meshTris(d); for (let i = 0; i < t.pos.length; i += 9) F.push([vi([t.pos[i], t.pos[i + 1], t.pos[i + 2]]), vi([t.pos[i + 3], t.pos[i + 4], t.pos[i + 5]]), vi([t.pos[i + 6], t.pos[i + 7], t.pos[i + 8]])]); return { V, F }; }
    const ux = d.ux, uz = d.uz, uy = M.cross(uz, ux), o = d.o, h = d.h;
    const W = (u, v, w) => [o[0] + ux[0] * u + uy[0] * v + uz[0] * w, o[1] + ux[1] * u + uy[1] * v + uz[1] * w, o[2] + ux[2] * u + uy[2] * v + uz[2] * w];
    const pr = d.prof;
    if (Array.isArray(pr)) {
      let pts = pr.slice(); if (M.polyArea(pts) < 0) pts.reverse(); const n = pts.length;
      const top = pts.map(p => vi(W(p[0], p[1], h))), bot = pts.map(p => vi(W(p[0], p[1], 0)));
      if (n <= 4) { F.push(top.slice()); F.push(bot.slice().reverse()); }
      else {
        for (const t of C.earClip(pts)) {
          const vis = (a, b) => (b === (a + 1) % n) || (a === (b + 1) % n);
          const tf = [t[0], t[1], t[2]].map((ii, k) => vis(ii, t[(k + 1) % 3]) ? top[ii] : -top[ii]);
          F.push(tf);
          const bt = [t[0], t[2], t[1]]; F.push(bt.map((ii, k) => vis(ii, bt[(k + 1) % 3]) ? bot[ii] : -bot[ii]));
        }
      }
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; F.push([bot[i], bot[j], top[j], top[i]]); }
      return { V, F };
    }
    const n = d.seg || (pr.r > 2 ? 48 : 24), ring = (r, w) => { const a = []; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; a.push(vi(W(Math.cos(t) * r, Math.sin(t) * r, w))); } return a; };
    const ob = ring(pr.r, 0), ot = ring(pr.r, h);
    if (pr.ri) {
      const ib = ring(pr.ri, 0), it = ring(pr.ri, h);
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        F.push([ob[i], -ob[j], ot[j], -ot[i]]); F.push([ib[j], -ib[i], it[i], -it[j]]);
        F.push([ot[i], -ot[j], it[j], -it[i]]); F.push([ob[j], -ob[i], ib[i], -ib[j]]);
      }
    } else {
      const ct = vi(W(0, 0, h)), cb = vi(W(0, 0, 0));
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; F.push([ob[i], -ob[j], ot[j], -ot[i]]); F.push([-ct, ot[i], -ot[j]]); F.push([-cb, ob[j], -ob[i]]); }
    }
    return { V, F };
  };

  /* ================= YAZICI ================= */
  C.dxfWrite = function (opts = {}) {
    const r12 = !!opts.r12, ents = opts.ents || C.doc.ents;
    const out = []; let H = 0x30;
    const nh = () => (H++).toString(16).toUpperCase();
    const g = (c, v) => { out.push(String(c), String(v)); };
    const doc = C.doc;
    const usedLt = new Set(['CONTINUOUS']);
    Object.values(doc.layers).forEach(l => usedLt.add(l.lt));
    ents.forEach(e => { if (e.lt && C.LT[e.lt]) usedLt.add(e.lt); });
    ['CENTER', 'DASHED', 'HIDDEN', 'PHANTOM'].forEach(n => usedLt.add(n));
    const layers = Object.assign({}, doc.layers);
    const addLayer = (name, like) => { if (!layers[name]) layers[name] = Object.assign({}, like || layers['0'], { name }); };
    ents.forEach(e => { if (!layers[e.layer]) addLayer(e.layer); if (C.meshes(e) && COMPOSITE.has(e.type)) addLayer(e.layer + '_3B', layers[e.layer]); });

    const bb = C.extents(ents) || [0, 0, 1, 1];
    // handle'lar
    const hT = {}; ['VPORT', 'LTYPE', 'LAYER', 'STYLE', 'VIEW', 'UCS', 'APPID', 'DIMSTYLE', 'BLOCK_RECORD'].forEach(t => hT[t] = nh());
    const hRootDict = nh(), hGroupDict = nh(), hPSD = nh(), hPH = nh();
    const hMS = nh(), hPS = nh(), hMSblk = nh(), hMSend = nh(), hPSblk = nh(), hPSend = nh();

    /* --- varlıkları önce ara listeye çevir (bloklar dahil) --- */
    const blocks = []; // {name, hBR, ents:[...]}
    const body = []; // model uzayı
    /* veri kayıtları (paftalar, arazi kotları, büyük nesneler): boş AC_VERI bloğunun eklemesine XDATA olarak (AutoCAD çok parçalı XDATA'lı POINT'i açmıyor) */
    let veriBlk = null; const dataRec = (layer, xd) => { if (!veriBlk) { veriBlk = { name: 'AC_VERI', hBR: nh(), items: [] }; blocks.push(veriBlk); } return { kind: 'insert', name: 'AC_VERI', ip: [0, 0, 0], st: { layer, color: 256, lt: 'BYLAYER', lw: -1 }, xd }; };
    let bigN = 0;
    /* ArıtmaCAD verisi XDATA'ya yalnız harf / rakam olarak (base64) yazılır: AutoCAD süslü parantez, ters bölü, tırnak gibi karakterleri yorumlayıp dosyayı açmayabiliyor */
    const b64 = str => { const u = new TextEncoder().encode(str); let bin = ''; for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(bin); };
    const split240 = t => { const p = []; for (let i = 0; i < t.length; i += 240) p.push(t.slice(i, i + 240)); return p; };
    const xdataOf = (e, json) => { const s = 'B64:' + b64(JSON.stringify(json));
      // AutoCAD bir nesnede en çok 16 KB XDATA kabul eder: büyük veri ayrı veri kayıtlarına parça parça yazılır (okurken birleştirilir)
      if (s.length > 14000 && !r12) { const k = 'K' + (++bigN) + Date.now().toString(36), n = Math.ceil(s.length / 12000);
        if (!layers['AC_VERI']) layers['AC_VERI'] = { name: 'AC_VERI', color: 8, lt: 'CONTINUOUS', lw: 25, on: false, lock: false };
        for (let i = 0; i < n; i++) body.push(dataRec('AC_VERI', split240(`P:${k}:${i}:${n}:` + s.slice(i * 12000, (i + 1) * 12000))));
        return [`R:${k}`]; }
      return split240(s); };
    /* AutoCAD paftaları (LAYOUT): ArıtmaCAD'de yazı / ölçü / kot / balon her pencerede o pencerenin ölçeğinde çizilir.
       AutoCAD'de model tek ölçekli olduğundan her açıklama nesnesi, onu gösteren pencerenin ölçeğiyle yazılır (paftada doğru boyda görünür). */
    const LAYS = (!r12 && (!opts.ents || opts.withLayouts) && opts.layouts !== false) ? (C.doc.layouts || []).filter(L => L && Array.isArray(L.vps) && (!opts.grp || (L.grp || 'Genel') === opts.grp)) : [];
    const VPW = []; for (const L of LAYS) for (const vp of L.vps) { const k = 1000 / (vp.scale || 100), hw = vp.w / 2 / k, hh = vp.h / 2 / k; VPW.push({ sc: vp.scale || 100, gv: vp.gvOnly || null, x0: vp.cx - hw, x1: vp.cx + hw, y0: vp.cy - hh, y1: vp.cy + hh }); }
    const annoSc = e => { if (!VPW.length) return null; let b; try { b = C.bbox(e); } catch (er) { return null; } if (!b || !isFinite(b[0])) return null; const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2; for (const w of VPW) { if (w.gv && e.gv !== w.gv) continue; if (cx >= w.x0 && cx <= w.x1 && cy >= w.y0 && cy <= w.y1) return w.sc; } return null; };
    const primsAt = e => { const sc = annoSc(e); if (!sc || sc === doc.set.anno || !C.T[e.type] || !C.withAnno) return C.prims(e); try { return C.withAnno(sc, () => { let pr = C.T[e.type].prims(e); if (e.aoff && C.annoShift) pr = C.annoShift(e, pr); return pr; }); } catch (er) { return C.prims(e); } };
    /* nesne çizgi tipi ölçeği (kod 48): opts.celtOlcek verildiyse, ana ölçekten başka ölçekli pafta penceresinde görünen nesne için pencere ölçeği / ana ölçek */
    const ltOlcek = e => { if (!opts.celtOlcek || r12) return 0; const sc = annoSc(e); return sc && Math.abs(sc - opts.celtOlcek) > 1e-9 ? sc / opts.celtOlcek : 0; };
    const primRecs = (e, layer) => {
      const comp = COMPOSITE.has(e.type), recs = [], ltK = ltOlcek(e), vsc = VPW.length ? annoSc(e) : null; // vsc: nesneyi gösteren pafta penceresinin ölçeği (çizim kuralı yazı boyu için)
      for (const pr of primsAt(e)) {
        const st = comp
          ? { layer, color: pr.color != null ? pr.color : (e.color === 256 ? 256 : 0), lt: pr.lt || 'BYLAYER', lw: pr.lw != null ? pr.lw : -1 }
          : { layer, color: pr.color != null ? pr.color : e.color, lt: pr.lt || e.lt, lw: pr.lw != null ? pr.lw : e.lw };
        if (ltK) st.lts = ltK; if (vsc) st.vsc = vsc;
        recs.push({ pr, st });
      }
      return recs;
    };
    let bn = 0; const blkMap = {};
    const FAILS = [];
    for (const e of ents) { const _b0 = body.length, _k0 = blocks.length, _bm = e.type === 'blk' && !blkMap[e.ref]; try { // bir nesne hata verirse atlanır, kayıt durmaz
      if (!C.layer(e.layer)) continue;
      if (opts.plain) { // AutoCAD'e sade çıktı: blok / ArıtmaCAD verisi yok — 2B: çizgi, yazı, tarama · 3B: yüzey ağları
        if (opts.plain === '3b') { const ms = C.meshes(e); if (ms) for (const d of ms) body.push({ kind: 'mesh', d, st: { layer: e.layer, color: e.color === 256 || e.color == null ? 256 : e.color, lt: 'BYLAYER', lw: -1 } }); continue; }
        if (e.type === 'hatch') { body.push({ kind: 'hatch', e, tip: 'hatch', sc: annoSc(e), st: { layer: e.layer, color: e.color, lt: 'BYLAYER', lw: e.lw } }); continue; }
        if (e.type === 'leader' && !r12) { body.push({ kind: 'leader', e, tip: 'leader', st: { layer: e.layer, color: e.color, lt: 'BYLAYER', lw: e.lw } }); continue; }
        for (const r of primRecs(e, e.layer)) body.push({ kind: 'prim', ...r, tip: e.type }); continue; // tip: çizim kuralı eşlemesi için (başlık, kot, ölçü …)
      }
      if (e.type === 'leader' && !r12) { body.push({ kind: 'leader', e, st: { layer: e.layer, color: e.color, lt: 'BYLAYER', lw: e.lw } }); continue; }
      if (e.type === 'blk') {
        const def = (C.doc.blocks || {})[e.ref];
        if (!def) continue;
        if (!blkMap[e.ref]) {
          const items = [];
          for (const d of def.ents) { const t = C.T[d.type]; if (!t) continue; for (const pr of t.prims(d)) items.push({ kind: 'prim', pr, st: { layer: d.layer || '0', color: pr.color != null ? pr.color : (d.color != null ? d.color : 0), lt: pr.lt || d.lt || 'BYBLOCK', lw: pr.lw != null ? pr.lw : (d.lw != null ? d.lw : -2) } }); }
          if (def.mesh3d && def.view !== 'kesit' && !opts.noMesh) { items.push({ kind: 'mesh', d: { t: 'tri', v: def.mesh3d.v, f: def.mesh3d.f }, st: { layer: 'VANA_3B', color: 0, lt: 'BYLAYER', lw: -1 } }); if (!layers['VANA_3B']) addLayer('VANA_3B', layers[e.layer]); }
          let nm = C.ascii(def.name || e.ref).replace(/[^A-Za-z0-9_\-]+/g, '_').slice(0, 60) || 'BLOK'; const used = new Set(Object.values(blkMap).map(b => b.name)); let nm2 = nm, i = 2; while (used.has(nm2)) nm2 = nm + '_' + i++;
          blkMap[e.ref] = { name: nm2, hBR: nh(), items }; blocks.push(blkMap[e.ref]);
          for (const it of items) if (!layers[it.st.layer]) addLayer(it.st.layer);
        }
        const meta = { id: def.id, name: def.name, tur: def.tur, dn: def.dn, view: def.view, unit: def.unit, src: def.src };
        body.push({ kind: 'insert', name: blkMap[e.ref].name, ip: e.p, sx: e.sx || 1, sy: e.sy || e.sx || 1, rot: e.rot || 0, st: { layer: e.layer, color: e.color, lt: 'BYLAYER', lw: -1 }, xd: xdataOf(null, { o: C.cleanEnt(e), d: meta }) });
        continue;
      }
      if (COMPOSITE.has(e.type)) {
        const name = `AC_${BLK_PREFIX[e.type] || e.type.toUpperCase()}_${e.id}_${++bn}`;
        const items = primRecs(e, e.layer).map(r => ({ kind: 'prim', ...r }));
        const ms = C.meshes(e);
        if (ms && !opts.noMesh) for (const d of ms) items.push({ kind: 'mesh', d, st: { layer: e.layer + '_3B', color: 256, lt: 'BYLAYER', lw: -1 } });
        blocks.push({ name, hBR: nh(), items });
        let oj = C.cleanEnt(e);
        if (e.type === 'arazi') { // kotlar AutoCAD XDATA sınırı (16 KB) yüzünden gizli noktalara parça parça yazılır
          oj = Object.assign({}, oj); const hk = 'A' + e.id + '_' + bn; delete oj.h; oj.hk = hk;
          let prev = 0; const enc = e.h.map(v => { const c = Math.round(v * 100), d = c - prev; prev = c; return d.toString(36); }).join(',');
          if (!layers['AC_ARAZI']) layers['AC_ARAZI'] = { name: 'AC_ARAZI', color: 8, lt: 'CONTINUOUS', lw: 25, on: false, lock: false };
          const parts = Math.ceil(enc.length / 12000); for (let i = 0; i < parts; i++) body.push(dataRec('AC_ARAZI', xdataOf(null, { arazi: { k: hk, i, n: parts, d: enc.slice(i * 12000, (i + 1) * 12000) } })));
        }
        body.push({ kind: 'insert', name, st: { layer: e.layer, color: e.color === 256 ? 256 : e.color, lt: 'BYLAYER', lw: -1 }, xd: xdataOf(e, { o: oj }) });
      } else if (e.type === 'hatch' && !r12) {
        body.push({ kind: 'hatch', e, sc: annoSc(e), st: { layer: e.layer, color: e.color, lt: 'BYLAYER', lw: e.lw }, xd: xdataOf(e, { h: { pat: e.pat, sc: e.sc, ang: e.ang, ann: e.ann, ascales: e.ascales } }) });
      } else {
        for (const r of primRecs(e, e.layer)) body.push({ kind: 'prim', ...r });
        if (e.type === 'face' || e.type === 'pmesh') for (const d of C.meshes(e) || []) body.push({ kind: 'mesh', d, st: { layer: e.layer, color: e.color, lt: e.lt, lw: e.lw } });
      }
    } catch (err) { body.length = _b0; blocks.length = _k0; if (_bm) delete blkMap[e.ref]; FAILS.push(`${e.type || '?'} #${e.id}: ${(err && err.message) || err}`); console.error('DXF yazılamadı', e, err); } }

    if ((C.doc.layouts || []).length && !opts.ents && !opts.plain) {
      layers['AC_DUZEN'] = { name: 'AC_DUZEN', color: 8, lt: 'CONTINUOUS', lw: 25, on: false, lock: false };
      body.push(dataRec('AC_DUZEN', xdataOf(null, { layouts: C.doc.layouts })));
    }
    { const KEEP = ['seviye', 'kesitMeta', 'lang', 'ceviri', 'kotStil', 'acilimH', 'grups', 'kesitStil', 'dwgVer', 'tipler', 'canli', 'canliSig'], ay = {}; for (const k of KEEP) if (C.doc.set[k] != null) ay[k] = C.doc.set[k];
      if (!r12 && !opts.ents && !opts.plain && Object.keys(ay).length) { layers['AC_DUZEN'] = layers['AC_DUZEN'] || { name: 'AC_DUZEN', color: 8, lt: 'CONTINUOUS', lw: 25, on: false, lock: false }; body.push(dataRec('AC_DUZEN', xdataOf(null, { ayar: ay }))); }
    }
    /* --- AutoCAD paftaları: antet ve yazılar kağıt alanında (mm), görünüm pencereleri gerçek VIEWPORT --- */
    const PSL = LAYS.map((L, i) => {
      const { w, h } = C.paperSize(L), items = [], P = (pr, layer) => items.push({ kind: 'prim', pr, st: { layer, color: pr.color != null ? pr.color : 7, lt: pr.lt || 'BYLAYER', lw: pr.lw != null ? pr.lw : -1, ps: 1 } });
      items.push({ kind: 'vport', id: 1, v: { cx: w / 2, cy: h / 2, w: w * 1.1, h: h * 1.1, mx: w / 2, my: h / 2, vh: h * 1.1 }, st: { layer: '0', color: 256, lt: 'BYLAYER', lw: -1, ps: 1 } }); // kağıdın kendi penceresi
      try { for (const pr of C.titlePrims(L)) P(pr, 'PAFTA_ANTET'); } catch (er) { FAILS.push('antet: ' + er.message); }
      try { if (C.vpLabelPrims) for (const pr of C.vpLabelPrims(L)) P(pr, 'PAFTA_YAZI'); } catch (er) { }
      L.vps.forEach((vp, k) => { const fe = C.vpFrame ? C.vpFrame(vp) : null, sc = vp.scale || 100;
        items.push({ kind: 'vport', id: k + 2, lock: !!vp.lock, v: { cx: vp.x + vp.w / 2, cy: vp.y + vp.h / 2, w: vp.w, h: vp.h, mx: vp.cx, my: vp.cy, vh: vp.h * sc / 1000 }, st: { layer: fe ? (fe.layer || 'PAFTA_PENCERE') : 'PAFTA_PENCERE_GIZLI', color: fe && fe.color != null ? fe.color : 256, lt: 'BYLAYER', lw: -1, ps: 1 } }); });
      return { L, i, items, w, h, hBR: i === 0 ? hPS : nh(), hL: nh(), name: i === 0 ? '*Paper_Space' : '*Paper_Space' + (i - 1), tab: i + 1 };
    });
    const hLM = PSL.length ? nh() : null, hLD = PSL.length ? nh() : null;
    if (PSL.length) { for (const [n, c, on] of [['PAFTA_ANTET', 7, true], ['PAFTA_YAZI', 7, true], ['PAFTA_PENCERE', 8, true], ['PAFTA_PENCERE_GIZLI', 8, false]]) if (!layers[n]) layers[n] = { name: n, color: c, lt: 'CONTINUOUS', lw: -1, on, lock: false };
      for (const P of PSL) for (const it of P.items) if (!layers[it.st.layer]) addLayer(it.st.layer); }
    /* çizim kuralı: 2B çıktıda program katmanları örnek çizimlerin katmanlarına çevrilir (app/cizim-kural-uygula.js) */
    if (opts.plain === '2b' && C.cizimKuralCikti) { try { C.cizimKuralCikti({ body, blocks, PSL, layers, usedLt, opts }); } catch (er) { console.error(er); } }
    /* --- HEADER --- */
    g(0, 'SECTION'); g(2, 'HEADER');
    g(9, '$ACADVER'); g(1, r12 ? 'AC1009' : 'AC1015');
    if (!r12) { g(9, '$DWGCODEPAGE'); g(3, 'ANSI_1254'); }
    g(9, '$INSBASE'); g(10, 0); g(20, 0); g(30, 0);
    g(9, '$EXTMIN'); g(10, fx(bb[0])); g(20, fx(bb[1])); g(30, 0);
    g(9, '$EXTMAX'); g(10, fx(bb[2])); g(20, fx(bb[3])); g(30, 0);
    g(9, '$LTSCALE'); g(40, fx(opts.ltscale != null ? opts.ltscale : doc.set.ltscale)); // opts.ltscale / psltscale: Mimari pafta çıktısı (mimari-pafta.js → dxfCizgiOlcegi)
    g(9, '$TEXTSIZE'); g(40, fx(C.annoH(doc.set.textH)));
    g(9, '$CLAYER'); g(8, nameSafe(doc.cur.layer));
    g(9, '$MEASUREMENT'); g(70, 1);
    if (!r12) { g(9, '$INSUNITS'); g(70, 6); g(9, '$LWDISPLAY'); g(290, doc.set.lwdisp ? 1 : 0); g(9, '$PSLTSCALE'); g(70, opts.psltscale != null ? opts.psltscale : 1); }
    const seedIdx = out.length; if (!r12) { g(9, '$HANDSEED'); g(5, 'FFFFF'); }
    g(0, 'ENDSEC');
    if (!r12) { g(0, 'SECTION'); g(2, 'CLASSES'); g(0, 'ENDSEC'); }

    /* --- TABLES --- */
    const tbl = (name, n, extra) => { g(0, 'TABLE'); g(2, name); if (!r12) { g(5, hT[name]); g(330, 0); g(100, 'AcDbSymbolTable'); } g(70, n); if (extra) extra(); };
    const rec = (type, sub, h) => { g(0, type); if (!r12) { g(type === 'DIMSTYLE' ? 105 : 5, h || nh()); g(330, hT[type]); g(100, 'AcDbSymbolTableRecord'); g(100, sub); } };
    g(0, 'SECTION'); g(2, 'TABLES');
    tbl('VPORT', 1);
    rec('VPORT', 'AcDbViewportTableRecord'); g(2, '*ACTIVE'); g(70, 0); g(10, 0); g(20, 0); g(11, 1); g(21, 1);
    g(12, fx((bb[0] + bb[2]) / 2)); g(22, fx((bb[1] + bb[3]) / 2)); g(13, 0); g(23, 0); g(14, 1); g(24, 1); g(15, 1); g(25, 1); g(16, 0); g(26, 0); g(36, 1); g(17, 0); g(27, 0); g(37, 0);
    g(40, fx(Math.max(bb[3] - bb[1], (bb[2] - bb[0]) / 1.6) * 1.1 || 10)); g(41, 1.6); g(42, 50); g(43, 0); g(44, 0); g(50, 0); g(51, 0); g(71, 0); g(72, 100); g(73, 1); g(74, 3); g(75, 0); g(76, 0); g(77, 0); g(78, 0);
    g(0, 'ENDTAB');
    // nesnelerin kullandığı tüm çizgi tipleri tabloda tanımlı olmalı (tanımsız çizgi tipi = AutoCAD dosyayı açmaz)
    { const addLt = n => { if (n && n !== 'BYLAYER' && n !== 'BYBLOCK' && C.LT[n]) usedLt.add(n); }; for (const it of body) addLt(it.st && it.st.lt); for (const b of blocks) for (const it of b.items || []) addLt(it.st && it.st.lt); }
    const lts = [...usedLt].filter(n => C.LT[n]);
    tbl('LTYPE', lts.length + (r12 ? 0 : 2));
    const ltRec = (name, desc, pat) => {
      rec('LTYPE', 'AcDbLinetypeTableRecord'); g(2, name); g(70, 0); g(3, desc); g(72, 65); g(73, pat.length); g(40, fx(pat.reduce((a, b) => a + Math.abs(b), 0)));
      pat.forEach(v => { g(49, fx(v)); if (!r12) g(74, 0); });
    };
    if (!r12) { ltRec('ByBlock', '', []); ltRec('ByLayer', '', []); }
    lts.forEach(n => ltRec(n === 'CONTINUOUS' ? 'Continuous' : n, C.LT[n].d, C.LT[n].p));
    g(0, 'ENDTAB');
    const ltName = n => (!n || n === 'CONTINUOUS' || !C.LT[n] || !usedLt.has(n)) ? 'Continuous' : n; // tabloda olmayan çizgi tipi hiç yazılmaz
    const lays = Object.values(layers);
    tbl('LAYER', lays.length);
    for (const l of lays) {
      rec('LAYER', 'AcDbLayerTableRecord'); g(2, nameSafe(l.name)); g(70, l.lock ? 4 : 0); g(62, (l.on ? 1 : -1) * (l.color || 7)); g(6, ltName(l.lt));
      if (!r12) { g(370, l.lw >= 0 ? l.lw : -3); g(390, hPH); }
    }
    g(0, 'ENDTAB');
    { const S = Object.values(C.styles ? C.styles() : { Standard: { name: 'Standard', font: 'Arial', h: 0, wf: 1, obl: 0 } });
      tbl('STYLE', S.length); for (const y of S) { rec('STYLE', 'AcDbTextStyleTableRecord'); g(2, nameSafe(y.name)); g(70, 0); g(40, fx(y.h || 0)); g(41, fx(y.wf || 1)); g(50, fx(y.obl || 0)); g(71, 0); g(42, 2.5); g(3, y.bold && /^arial$/i.test(y.font || '') ? 'arialbd.ttf' : C.fontFile ? C.fontFile(y.font) : 'arial.ttf'); g(4, '');
        if (!r12 && !/\.shx$/i.test(C.fontFile ? C.fontFile(y.font) : '')) { g(1001, 'ACAD'); g(1000, y.font); g(1071, (y.italic ? 0x1000000 : 0) | (y.bold ? 0x2000000 : 0) | 34); } }
      g(0, 'ENDTAB'); }
    tbl('VIEW', 0); g(0, 'ENDTAB');
    tbl('UCS', 0); g(0, 'ENDTAB');
    tbl('APPID', 2); rec('APPID', 'AcDbRegAppTableRecord'); g(2, 'ACAD'); g(70, 0); rec('APPID', 'AcDbRegAppTableRecord'); g(2, 'ARITMACAD'); g(70, 0); g(0, 'ENDTAB');
    tbl('DIMSTYLE', 1, () => { if (!r12) g(100, 'AcDbDimStyleTable'); });
    rec('DIMSTYLE', 'AcDbDimStyleTableRecord'); g(2, 'Standard'); g(70, 0);
    g(0, 'ENDTAB');
    if (!r12) {
      tbl('BLOCK_RECORD', 2 + blocks.length + Math.max(0, PSL.length - 1));
      const br = (h, name, hl) => { g(0, 'BLOCK_RECORD'); g(5, h); g(330, hT.BLOCK_RECORD); g(100, 'AcDbSymbolTableRecord'); g(100, 'AcDbBlockTableRecord'); g(2, name); if (hl) g(340, hl); };
      br(hMS, '*Model_Space', hLM); br(hPS, '*Paper_Space', PSL[0] ? PSL[0].hL : null); PSL.slice(1).forEach(P => br(P.hBR, P.name, P.hL));
      blocks.forEach(b => br(b.hBR, b.name));
      g(0, 'ENDTAB');
    }
    g(0, 'ENDSEC');

    /* --- varlık yazımı --- */
    const head = (type, sub, st, owner) => {
      g(0, type);
      if (!r12) { g(5, nh()); g(330, owner); g(100, 'AcDbEntity'); if (st.ps) g(67, 1); }
      g(8, nameSafe(st.layer));
      if (st.lt && st.lt !== 'BYLAYER' && C.LT[st.lt]) g(6, ltName(st.lt)); else if (st.lt === 'BYBLOCK') g(6, 'ByBlock');
      if (st.color != null && st.color !== 256) g(62, st.color);
      if (!r12 && st.lw != null && st.lw !== -1) g(370, st.lw);
      if (!r12 && st.lts) g(48, fx(st.lts));
      if (!r12 && sub) g(100, sub);
    };
    const writePrim = (pr, st, owner) => {
      switch (pr.k) {
        case 'L': head('LINE', 'AcDbLine', st, owner); g(10, fx(pr.a[0])); g(20, fx(pr.a[1])); g(30, fx(pr.a[2] || 0)); g(11, fx(pr.b[0])); g(21, fx(pr.b[1])); g(31, fx(pr.b[2] || 0)); break;
        case 'P': {
          const flat = pr.pts.every(p => Math.abs((p[2] || 0) - (pr.pts[0][2] || 0)) < 1e-9);
          if (!r12 && pr.ell) { // gerçek ELLIPSE
            const q = pr.ell; head('ELLIPSE', 'AcDbEllipse', st, owner); g(10, fx(q.c[0])); g(20, fx(q.c[1])); g(30, fx(q.c[2] || 0)); g(11, fx(q.mj[0])); g(21, fx(q.mj[1])); g(31, 0); g(210, 0); g(220, 0); g(230, 1); g(40, fx(q.ra)); g(41, fx(q.t0 || 0)); g(42, fx(q.t1 == null ? Math.PI * 2 : q.t1)); break;
          }
          if (!r12 && flat && pr.verts && pr.bul && pr.bul.some(b => b)) { // yaylı çoklu çizgi (bulge)
            head('LWPOLYLINE', 'AcDbPolyline', st, owner); g(90, pr.verts.length); g(70, pr.c ? 1 : 0); g(38, fx(pr.verts[0][2] || 0));
            pr.verts.forEach((p, i) => { g(10, fx(p[0])); g(20, fx(p[1])); if (pr.bul[i]) g(42, fx(pr.bul[i])); }); break;
          }
          if (!r12 && flat) {
            head('LWPOLYLINE', 'AcDbPolyline', st, owner); g(90, pr.pts.length); g(70, pr.c ? 1 : 0); g(38, fx(pr.pts[0][2] || 0));
            pr.pts.forEach(p => { g(10, fx(p[0])); g(20, fx(p[1])); });
          } else {
            head('POLYLINE', r12 ? null : (flat ? 'AcDb2dPolyline' : 'AcDb3dPolyline'), st, owner);
            const ph = r12 ? null : (H - 1).toString(16).toUpperCase();
            g(66, 1); g(10, 0); g(20, 0); g(30, flat ? fx(pr.pts[0][2] || 0) : 0); g(70, (pr.c ? 1 : 0) | (flat ? 0 : 8));
            pr.pts.forEach(p => { head('VERTEX', null, st, ph); if (!r12) { g(100, 'AcDbVertex'); g(100, flat ? 'AcDb2dVertex' : 'AcDb3dPolylineVertex'); } g(10, fx(p[0])); g(20, fx(p[1])); g(30, fx(flat ? (p[2] || 0) : (p[2] || 0))); g(70, flat ? 0 : 32); });
            head('SEQEND', null, st, ph);
          }
          break;
        }
        case 'C': head('CIRCLE', 'AcDbCircle', st, owner); g(10, fx(pr.c[0])); g(20, fx(pr.c[1])); g(30, fx(pr.c[2] || 0)); g(40, fx(pr.r)); break;
        case 'A': head('ARC', 'AcDbCircle', st, owner); g(10, fx(pr.c[0])); g(20, fx(pr.c[1])); g(30, fx(pr.c[2] || 0)); g(40, fx(pr.r)); if (!r12) g(100, 'AcDbArc'); g(50, fx(M.deg(M.normAng(pr.a0)))); g(51, fx(M.deg(M.normAng(pr.a1)))); break;
        case 'X': head('POINT', 'AcDbPoint', st, owner); g(10, fx(pr.p[0])); g(20, fx(pr.p[1])); g(30, fx(pr.p[2] || 0)); break;
        case 'S': {
          if (pr.tris && pr.pts.length > 4) { for (const t of pr.tris) writePrim({ k: 'S', pts: [pr.pts[t[0]], pr.pts[t[1]], pr.pts[t[2]]] }, st, owner); break; }
          const p = pr.pts; const q = p.length === 3 ? [p[0], p[1], p[2], p[2]] : [p[0], p[1], p[3], p[2]];
          head('SOLID', 'AcDbTrace', st, owner); q.forEach((v, i) => { g(10 + i, fx(v[0])); g(20 + i, fx(v[1])); g(30 + i, fx(v[2] || 0)); }); break;
        }
        case 'T': {
          const stn = nameSafe(pr.st && C.doc.styles && C.doc.styles[pr.st] ? pr.st : 'Standard'), sty = C.textStyle ? C.textStyle(stn) : { wf: 1, obl: 0 };
          const wf = pr.wf || sty.wf || 1, obl = pr.obl != null && pr.obl !== '' ? +pr.obl : (sty.obl || 0), al = pr.al || 'L';
          if (pr.mt && !r12) { // MTEXT
            const att = { TL: 1, TC: 2, TR: 3, ML: 4, MC: 5, MR: 6, BL: 7, BC: 8, BR: 9, L: 7, C: 8, R: 9, M: 5 }[al] || 1;
            head('MTEXT', 'AcDbMText', st, owner); g(10, fx(pr.p[0])); g(20, fx(pr.p[1])); g(30, fx(pr.p[2] || 0)); g(40, fx(pr.h)); g(41, fx(pr.mw || 0)); g(71, att); g(72, 1);
            let txt = enc(C.txL ? C.txL(pr.s) : pr.s).replace(/\r?\n/g, '\\P'); if (wf !== 1) txt = `\\W${fx(wf)};` + txt; if (obl) txt = `\\Q${fx(obl)};` + txt;
            while (txt.length > 250) { g(3, txt.slice(0, 250)); txt = txt.slice(250); } g(1, txt);
            g(7, stn); g(11, fx(Math.cos(pr.rot))); g(21, fx(Math.sin(pr.rot))); g(31, 0); g(73, 1); g(44, fx(pr.ls || 1));
            break;
          }
          const L = C.textLayout ? C.textLayout(pr) : null, J = C.JUST ? C.JUST[al] || C.JUST.L : [0, 'base'];
          const lines = L ? L.lines : pr.s.split('\n').map((s2, i) => ({ s: s2, x: 0, y: -i * pr.h * 1.6, w: 0 }));
          const cs = Math.cos(pr.rot), sn = Math.sin(pr.rot), W = (x, y) => [pr.p[0] + x * cs - y * sn, pr.p[1] + x * sn + y * cs, pr.p[2] || 0];
          const single = lines.length === 1;
          const ha = J[0] === 0 ? 0 : J[0] === 1 ? 2 : (al === 'M' && single ? 4 : 1), va = !single ? 0 : al === 'M' ? 0 : { base: 0, bot: 1, mid: 2, top: 3 }[J[1]];
          lines.forEach(ln => {
            const p0 = W(ln.x, ln.y), pa = single ? M.p3(pr.p) : W(ln.x + J[0] * ln.w, ln.y);
            head('TEXT', 'AcDbText', st, owner); g(10, fx(p0[0])); g(20, fx(p0[1])); g(30, fx(p0[2])); g(40, fx(pr.h)); g(1, enc(ln.s)); g(50, fx(M.deg(pr.rot)));
            if (wf !== 1) g(41, fx(wf)); if (obl) g(51, fx(obl)); g(7, stn);
            if (ha || va) { g(72, ha); g(11, fx(pa[0])); g(21, fx(pa[1])); g(31, fx(pa[2])); }
            if (!r12) g(100, 'AcDbText');
            if (va) g(73, va);
          });
          break;
        }
      }
    };
    const writeMesh = (d, st, owner) => {
      const { V, F } = C.meshFaces(d); if (!V.length || !F.length) return;
      head('POLYLINE', r12 ? null : 'AcDbPolyFaceMesh', st, owner);
      const ph = r12 ? null : (H - 1).toString(16).toUpperCase();
      g(66, 1); g(10, 0); g(20, 0); g(30, 0); g(70, 64); g(71, V.length); g(72, F.length);
      for (const v of V) { head('VERTEX', null, st, ph); if (!r12) { g(100, 'AcDbVertex'); g(100, 'AcDbPolyFaceMeshVertex'); } g(10, fx(v[0])); g(20, fx(v[1])); g(30, fx(v[2])); g(70, 192); }
      for (const f of F) { head('VERTEX', null, st, ph); if (!r12) { g(100, 'AcDbFaceRecord'); } g(10, 0); g(20, 0); g(30, 0); g(70, 128); f.forEach((ix, k) => g(71 + k, ix)); }
      head('SEQEND', null, st, ph);
    };
    const writeItem = (it, owner) => { const n0 = out.length; try { writeItem0(it, owner); } catch (err) { out.length = n0; FAILS.push(`${it.kind}: ${(err && err.message) || err}`); console.error('DXF öğe yazılamadı', it, err); } };
    const writeItem0 = (it, owner) => {
      if (it.kind === 'prim') { writePrim(it.pr, it.st, owner); if (it.xd) { g(1001, 'ARITMACAD'); it.xd.forEach(q => g(1000, q)); } }
      else if (it.kind === 'mesh') writeMesh(it.d, it.st, owner);
      else if (it.kind === 'leader') { // gerçek AutoCAD LEADER: ok boyu DSTYLE geçersiz kılmasıyla (DIMASZ = 41, DIMSCALE = 40)
        const e = it.e, pts = e.pts.map(M.p3); head('LEADER', 'AcDbLeader', it.st, owner); g(3, 'Standard'); g(71, 1); g(72, 0); g(73, 3); g(74, 1); g(75, 0); g(40, 0); g(41, 0); g(76, pts.length);
        pts.forEach(q => { g(10, fx(q[0])); g(20, fx(q[1])); g(30, fx(q[2] || 0)); });
        g(1001, 'ACAD'); g(1000, 'DSTYLE'); g(1002, '{'); g(1070, 41); g(1040, fx(+e.asz || 0.1)); g(1070, 40); g(1040, 1); g(1070, 147); g(1040, fx((+e.asz || 0.1) * 0.5)); g(1002, '}'); }
      else if (it.kind === 'hatch') {
        const e = it.e, d = it.sc && it.sc !== doc.set.anno && C.withAnno ? C.withAnno(it.sc, () => C.hatchDxfDef(e)) : C.hatchDxfDef(e), solid = d.solid;
        head('HATCH', 'AcDbHatch', it.st, owner); g(10, 0); g(20, 0); g(30, 0); g(210, 0); g(220, 0); g(230, 1);
        g(2, solid ? 'SOLID' : nameSafe(e.pat || 'USER')); g(70, solid ? 1 : 0); g(71, 0); g(91, e.loops.length);
        e.loops.forEach((lp, i) => { g(92, i === 0 ? 3 : 2); g(72, 0); g(73, 1); g(93, lp.length); lp.forEach(p => { g(10, fx(p[0])); g(20, fx(p[1])); }); g(97, 0); });
        // desen tanımı her zaman dosyanın içinde (özel = 2): AutoCAD acad.pat / acadiso.pat aramaz (LT ya da destek yolu eksik olsa da açılır)
        if (!solid && !d.lines.length) d.lines = [{ a: 45, o: [0, 0], off: [-Math.SQRT1_2 * 3.175 * d.k, Math.SQRT1_2 * 3.175 * d.k], dash: [] }];
        g(75, 0); g(76, solid ? 1 : 2);
        if (!solid) { g(52, fx(e.ang || 0)); g(41, fx(d.k)); g(77, 0); g(78, d.lines.length); for (const f of d.lines) { g(53, fx(f.a)); g(43, fx(f.o[0])); g(44, fx(f.o[1])); g(45, fx(f.off[0])); g(46, fx(f.off[1])); g(79, f.dash.length); f.dash.forEach(v => g(49, fx(v))); } }
        g(98, 1); const sp = e.loops[0][0]; g(10, fx(sp[0])); g(20, fx(sp[1]));
        if (it.xd) { g(1001, 'ARITMACAD'); it.xd.forEach(q => g(1000, q)); }
      }
      else if (it.kind === 'vport') {
        const v = it.v; head('VIEWPORT', 'AcDbViewport', it.st, owner);
        g(10, fx(v.cx)); g(20, fx(v.cy)); g(30, 0); g(40, fx(v.w)); g(41, fx(v.h)); g(68, it.id === 1 ? 1 : it.id); g(69, it.id);
        g(12, fx(v.mx)); g(22, fx(v.my)); g(13, 0); g(23, 0); g(14, 10); g(24, 10); g(15, 10); g(25, 10); g(16, 0); g(26, 0); g(36, 1); g(17, 0); g(27, 0); g(37, 0);
        g(42, 50); g(43, 0); g(44, 0); g(45, fx(v.vh)); g(50, 0); g(51, 0); g(72, 1000); g(90, 32864 | (it.lock ? 16384 : 0)); g(1, ''); g(281, 0); g(71, 1); g(74, 0);
        g(110, 0); g(120, 0); g(130, 0); g(111, 1); g(121, 0); g(131, 0); g(112, 0); g(122, 1); g(132, 0); g(79, 0); g(146, 0); g(170, 0);
      }
      else if (it.kind === 'insert') {
        head('INSERT', 'AcDbBlockReference', it.st, owner); g(2, nameSafe(it.name));
        const ip = it.ip || [0, 0, 0]; g(10, fx(ip[0])); g(20, fx(ip[1])); g(30, fx(ip[2] || 0));
        if (it.sx != null && (it.sx !== 1 || it.sy !== 1)) { g(41, fx(it.sx)); g(42, fx(it.sy)); g(43, fx(Math.abs(it.sx))); }
        if (it.rot) g(50, fx(((it.rot % 360) + 360) % 360));
        if (it.xd && !r12) { g(1001, 'ARITMACAD'); it.xd.forEach(s => g(1000, s)); }
        if (it.xd && r12) { g(1001, 'ARITMACAD'); it.xd.forEach(s => g(1000, s)); }
      }
    };

    /* --- BLOCKS --- */
    g(0, 'SECTION'); g(2, 'BLOCKS');
    const blk = (name, hBR, hB, hE, items, ps) => {
      g(0, 'BLOCK'); if (!r12) { g(5, hB || nh()); g(330, hBR); g(100, 'AcDbEntity'); if (ps) g(67, 1); } g(8, '0'); if (!r12) g(100, 'AcDbBlockBegin');
      g(2, name); g(70, 0); g(10, 0); g(20, 0); g(30, 0); g(3, name); g(1, '');
      for (const it of items || []) writeItem(it, hBR);
      g(0, 'ENDBLK'); if (!r12) { g(5, hE || nh()); g(330, hBR); g(100, 'AcDbEntity'); if (ps) g(67, 1); } g(8, '0'); if (!r12) g(100, 'AcDbBlockEnd');
    };
    if (!r12) { blk('*Model_Space', hMS, hMSblk, hMSend); blk('*Paper_Space', hPS, hPSblk, hPSend, null, true); PSL.slice(1).forEach(P => blk(P.name, P.hBR, null, null, P.items, true)); }
    blocks.forEach(b => blk(nameSafe(b.name), b.hBR, null, null, b.items));
    g(0, 'ENDSEC');

    /* --- ENTITIES --- */
    g(0, 'SECTION'); g(2, 'ENTITIES');
    for (const it of body) writeItem(it, hMS);
    if (PSL[0]) for (const it of PSL[0].items) writeItem(it, hPS); // ilk paftanın kağıt alanı
    g(0, 'ENDSEC');

    /* --- OBJECTS --- */
    if (!r12) {
      g(0, 'SECTION'); g(2, 'OBJECTS');
      g(0, 'DICTIONARY'); g(5, hRootDict); g(330, 0); g(100, 'AcDbDictionary'); g(281, 1); g(3, 'ACAD_GROUP'); g(350, hGroupDict); if (hLD) { g(3, 'ACAD_LAYOUT'); g(350, hLD); } g(3, 'ACAD_PLOTSTYLENAME'); g(350, hPSD);
      g(0, 'DICTIONARY'); g(5, hGroupDict); g(330, hRootDict); g(100, 'AcDbDictionary'); g(281, 1);
      g(0, 'ACDBDICTIONARYWDFLT'); g(5, hPSD); g(330, hRootDict); g(100, 'AcDbDictionary'); g(281, 1); g(3, 'Normal'); g(350, hPH); g(100, 'AcDbDictionaryWithDefault'); g(340, hPH);
      g(0, 'ACDBPLACEHOLDER'); g(5, hPH); g(102, '{ACAD_REACTORS'); g(330, hPSD); g(102, '}'); g(330, hPSD);
      if (hLD) {
        const used = new Set(['MODEL']), lname = P => { let n = C.ascii ? C.ascii(String(P.L.name || ('Pafta' + P.tab))) : String(P.L.name); n = n.replace(/[<>\/\\":;?*|=,`]/g, '_').slice(0, 250) || ('Pafta' + P.tab); let m = n, k = 2; while (used.has(m.toUpperCase())) m = n + ' (' + k++ + ')'; used.add(m.toUpperCase()); return m; };
        const names = PSL.map(lname);
        g(0, 'DICTIONARY'); g(5, hLD); g(102, '{ACAD_REACTORS'); g(330, hRootDict); g(102, '}'); g(330, hRootDict); g(100, 'AcDbDictionary'); g(281, 1);
        g(3, 'Model'); g(350, hLM); PSL.forEach((P, i) => { g(3, names[i]); g(350, P.hL); });
        const lay = (h, name, tab, hBR, w, hh, model) => {
          g(0, 'LAYOUT'); g(5, h); g(102, '{ACAD_REACTORS'); g(330, hLD); g(102, '}'); g(330, hLD);
          g(100, 'AcDbPlotSettings'); g(1, ''); g(2, 'none_device'); g(4, ''); g(6, ''); g(40, 0); g(41, 0); g(42, 0); g(43, 0); g(44, fx(w)); g(45, fx(hh)); g(46, 0); g(47, 0); g(48, 0); g(49, 0); g(140, 0); g(141, 0); g(142, 1); g(143, 1);
          g(70, model ? 1712 : 688); g(72, 1); g(73, 0); g(74, model ? 0 : 5); g(7, ''); g(75, 16); g(147, 1); g(148, 0); g(149, 0);
          g(100, 'AcDbLayout'); g(1, name); g(70, 1); g(71, tab); g(10, 0); g(20, 0); g(11, fx(w)); g(21, fx(hh)); g(12, 0); g(22, 0); g(32, 0); g(14, 0); g(24, 0); g(34, 0); g(15, fx(w)); g(25, fx(hh)); g(35, 0);
          g(146, 0); g(13, 0); g(23, 0); g(33, 0); g(16, 1); g(26, 0); g(36, 0); g(17, 0); g(27, 1); g(37, 0); g(76, 0); g(330, hBR); };
        lay(hLM, 'Model', 0, hMS, 420, 297, true); PSL.forEach((P, i) => lay(P.hL, names[i], P.tab, P.hBR, P.w, P.h, false));
      }
      g(0, 'ENDSEC');
    }
    g(0, 'EOF');
    if (!r12) out[seedIdx + 3] = (H + 1).toString(16).toUpperCase();
    C.dxfFails = FAILS; if (FAILS.length) C.warn(`DXF: ${FAILS.length} nesne yazılamadı ve atlandı (çizimin geri kalanı kaydedildi): ${FAILS.slice(0, 5).join(' · ')}${FAILS.length > 5 ? ' …' : ''}`);
    return out.join('\r\n') + '\r\n';
  };

  /* ================= OKUYUCU ================= */
  C.dxfDecode = function (bytes) {
    if (typeof bytes === 'string') return bytes;
    const head = new TextDecoder('latin1').decode(bytes.slice(0, 4000));
    const ver = (head.match(/\$ACADVER\s*\r?\n\s*1\s*\r?\n\s*(AC\d+)/) || [])[1] || '';
    if (ver >= 'AC1021') return new TextDecoder('utf-8').decode(bytes);
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (e) { }
    const cp = (head.match(/\$DWGCODEPAGE\s*\r?\n\s*3\s*\r?\n\s*ANSI_(\d+)/) || [])[1] || '1254';
    try { return new TextDecoder('windows-' + cp).decode(bytes); } catch (e) { return new TextDecoder('windows-1254').decode(bytes); }
  };
  C.dxfParse = function (text) {
    if (text.startsWith('AutoCAD Binary DXF')) throw new Error('İkili (binary) DXF desteklenmiyor; AutoCAD\'de ASCII DXF olarak kaydedin.');
    const lines = text.split(/\r?\n/);
    const pairs = [];
    for (let i = 0; i + 1 < lines.length; i += 2) { const c = parseInt(lines[i].trim(), 10); if (isNaN(c)) { i--; continue; } pairs.push([c, lines[i + 1].replace(/\s+$/, '')]); }
    const res = { header: {}, layers: {}, ltypes: {}, styles: {}, blocks: {}, ents: [] };
    let i = 0;
    const readEntityList = (stopAt) => { // 0-grupları arasında ham varlık listesi
      const list = []; let cur = null;
      while (i < pairs.length) {
        const [c, v] = pairs[i];
        if (c === 0) { if (stopAt.includes(v)) break; cur = { type: v, g: [] }; list.push(cur); i++; continue; }
        if (cur) cur.g.push([c, v]); i++;
      }
      return list;
    };
    while (i < pairs.length) {
      const [c, v] = pairs[i];
      if (c === 0 && v === 'SECTION') {
        const name = pairs[i + 1][1]; i += 2;
        if (name === 'HEADER') { let key = null; while (i < pairs.length && !(pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC')) { const [cc, vv] = pairs[i]; if (cc === 9) key = vv; else if (key) { (res.header[key] = res.header[key] || []).push([cc, vv]); } i++; } }
        else if (name === 'TABLES') {
          const list = readEntityList(['ENDSEC']);
          for (const r of list) {
            const get = k => { const p = r.g.find(q => q[0] === k); return p ? p[1] : null; };
            if (r.type === 'LAYER') { const col = parseInt(get(62) || '7'); const lw = get(370); res.layers[dec(get(2))] = { name: dec(get(2)), color: Math.abs(col) || 7, on: col >= 0, lt: (get(6) || 'CONTINUOUS').toUpperCase(), lw: lw != null && +lw >= 0 ? +lw : 25, lock: !!(parseInt(get(70) || '0') & 4), frozen: !!(parseInt(get(70) || '0') & 1) }; }
            if (r.type === 'STYLE') { const nm = dec(get(2) || ''); if (nm && !/^\*/.test(nm) && !(parseInt(get(70) || '0') & 1)) { const xi = r.g.findIndex(q => q[0] === 1001 && q[1] === 'ACAD'); const fam = xi >= 0 && r.g[xi + 1] && r.g[xi + 1][0] === 1000 ? r.g[xi + 1][1] : null; const fl = xi >= 0 ? parseInt((r.g.slice(xi).find(q => q[0] === 1071) || [0, 0])[1]) : 0; res.styles[nm] = { name: nm, font: fam || (C.fontFromFile ? C.fontFromFile(get(3)) : 'Arial'), h: parseFloat(get(40) || '0'), wf: parseFloat(get(41) || '1') || 1, obl: parseFloat(get(50) || '0'), bold: !!(fl & 0x2000000), italic: !!(fl & 0x1000000) }; } }
            if (r.type === 'LTYPE') { const n = (get(2) || '').toUpperCase(); res.ltypes[n] = r.g.filter(q => q[0] === 49).map(q => +q[1]); }
          }
        } else if (name === 'BLOCKS') {
          for (; ;) {
            while (i < pairs.length && !(pairs[i][0] === 0 && (pairs[i][1] === 'BLOCK' || pairs[i][1] === 'ENDSEC'))) i++;
            if (i >= pairs.length || pairs[i][1] === 'ENDSEC') break;
            i++; const hdr = []; while (i < pairs.length && pairs[i][0] !== 0) { hdr.push(pairs[i]); i++; }
            const nm = (hdr.find(q => q[0] === 2) || [0, ''])[1];
            const base = [+(hdr.find(q => q[0] === 10) || [0, 0])[1], +(hdr.find(q => q[0] === 20) || [0, 0])[1], +(hdr.find(q => q[0] === 30) || [0, 0])[1]];
            const list = readEntityList(['ENDBLK', 'ENDSEC']);
            res.blocks[dec(nm)] = { base, ents: list };
            if (pairs[i] && pairs[i][1] === 'ENDBLK') i++;
          }
        } else if (name === 'ENTITIES') { res.ents = readEntityList(['ENDSEC']); }
        else { while (i < pairs.length && !(pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC')) i++; }
        continue;
      }
      i++;
    }
    return res;
  };

  /* ham varlık listesini model varlıklarına dönüştür */
  C.dxfImport = function (text, opts = {}) {
    const d = C.dxfParse(text);
    const stats = { ok: 0, skip: {}, comp: 0 };
    const layers = {};
    for (const [n, l] of Object.entries(d.layers)) { const lt = C.LT[l.lt] ? l.lt : (l.lt === 'CONTINUOUS' ? 'CONTINUOUS' : (d.ltypes[l.lt] && d.ltypes[l.lt].length ? 'DASHED' : 'CONTINUOUS')); layers[n] = { name: n, color: l.color, lt, lw: l.lw, on: l.on && !l.frozen, lock: l.lock }; }
    if (!layers['0']) layers['0'] = { name: '0', color: 7, lt: 'CONTINUOUS', lw: 25, on: true, lock: false };
    const insUnits = d.header.$INSUNITS ? +d.header.$INSUNITS[0][1] : 0;
    const out = []; let layoutsOut = null, ayarOut = null; const defsOut = {}; const araziParts = {}; const kParts = {}; const ub64 = t => { const bin = atob(t), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new TextDecoder().decode(u); };
    const parseX = str => { if (str.startsWith('P:')) { const m = /^P:([^:]+):(\d+):(\d+):/.exec(str); if (m) { (kParts[m[1]] = kParts[m[1]] || [])[+m[2]] = str.slice(m[0].length); return { __chunk: true }; } } if (str.startsWith('R:')) { const ps = kParts[str.slice(2)]; if (!ps || ps.some(q => q == null)) return {}; return parseX(ps.join('')); } if (str.startsWith('B64:')) return JSON.parse(ub64(str.slice(4))); return JSON.parse(str); };
    const bigParts = {}; const unBig = o => { if (o && o.big && bigParts[o.big]) { const ps = bigParts[o.big]; if (ps.some(q => q == null)) return o; return JSON.parse(ps.join('')); } return o; };
    const pbn = n => (C.parseBlockName ? C.parseBlockName(n) : { tur: 'Diğer', dn: null, view: 'plan' });
    const convBlock = (nm, depth) => {
      const b = blocksG[nm]; if (!b) return [];
      const bs = b.base, Xb = q => [q[0] - bs[0], q[1] - bs[1], (q[2] || 0) - bs[2]]; Xb.s = 1; Xb.rot = 0; Xb.mir = false;
      const save = out.length;
      for (const sub of b.ents) conv(sub, Xb, { layer: '0', color: 0, lt: 'BYBLOCK', lw: -2 }, depth + 1);
      const ents = out.splice(save);
      for (const e of ents) { if (e.color === 256 && e.layer !== '0' && layers[e.layer]) e.color = layers[e.layer].color; }
      return ents;
    };
    const splitDef = d => { // 3B ağları (polyface / 3DFACE / MESH) mesh3d'e taşı
      const m3 = d.ents.filter(e => e.type === 'pmesh' || e.type === 'face'); if (!m3.length) return d;
      d.ents = d.ents.filter(e => !(e.type === 'pmesh' || e.type === 'face'));
      const t = { pos: [], nrm: [], edges: [] }; for (const e of m3) for (const q of C.T[e.type].mesh(e)) C.meshTris(q, t);
      const v = [], f = [], key = new Map(); for (let i = 0; i < t.pos.length; i += 3) { const k = t.pos[i].toFixed(4) + ',' + t.pos[i + 1].toFixed(4) + ',' + t.pos[i + 2].toFixed(4); let ix = key.get(k); if (ix == null) { ix = v.length; v.push([t.pos[i], t.pos[i + 1], t.pos[i + 2]]); key.set(k, ix); } if (i % 9 === 0) f.push([]); f[f.length - 1].push(ix); }
      d.mesh3d = { v, f }; return d;
    };
    const mapLt = v => { if (!v) return 'BYLAYER'; const u = v.toUpperCase(); if (u === 'BYLAYER') return 'BYLAYER'; if (u === 'BYBLOCK') return 'BYBLOCK'; if (C.LT[u]) return u; if (u === 'CONTINUOUS') return 'CONTINUOUS'; const pat = d.ltypes[u]; if (!pat || !pat.length) return 'CONTINUOUS'; if (u.includes('CENT') || u.includes('EKSEN')) return 'CENTER'; if (u.includes('HID') || u.includes('GIZ')) return 'HIDDEN'; if (u.includes('PHAN')) return 'PHANTOM'; if (u.includes('DOT') && pat.length > 2) return 'DASHDOT'; if (u.includes('DOT')) return 'DOT'; return 'DASHED'; };

    // pairs -> nesne; POLYLINE/VERTEX gruplama
    const group = list => {
      const res = []; let k = 0;
      while (k < list.length) {
        const r = list[k];
        if (r.type === 'POLYLINE') { const verts = []; k++; while (k < list.length && list[k].type === 'VERTEX') { verts.push(list[k]); k++; } if (k < list.length && list[k].type === 'SEQEND') k++; r.verts = verts; res.push(r); continue; }
        if (r.type === 'INSERT') { const att = []; k++; while (k < list.length && list[k].type === 'ATTRIB') { att.push(list[k]); k++; } if (att.length && k < list.length && list[k].type === 'SEQEND') k++; r.attribs = att; res.push(r); continue; }
        res.push(r); k++;
      }
      return res;
    };
    const blocksG = {}; for (const [n, b] of Object.entries(d.blocks)) blocksG[n] = { base: b.base, ents: group(b.ents) };

    const conv = (r, X, inh, depth) => {
      const gv = (c, def) => { const p = r.g.find(q => q[0] === c); return p ? p[1] : def; };
      if (depth === 0 && (r.type === 'VIEWPORT' || String(gv(67, '0')).trim() === '1')) return; // kağıt alanı (AutoCAD paftası) modele alınmaz — paftalar ArıtmaCAD verisinden gelir
      const gn = (c, def = 0) => { const v = gv(c); return v == null ? def : parseFloat(v); };
      const gall = c => r.g.filter(q => q[0] === c).map(q => q[1]);
      let layer = dec(gv(8, '0')); if (layer === '0' && inh) layer = inh.layer;
      if (!layers[layer]) layers[layer] = { name: layer, color: 7, lt: 'CONTINUOUS', lw: 25, on: true, lock: false };
      let color = gv(62) != null ? parseInt(gv(62)) : 256; if (color === 0 && inh) color = inh.color; if (color < 0) color = Math.abs(color);
      if (gv(420) != null && color === 256) { const t = parseInt(gv(420)); color = C.rgbToAci((t >> 16) & 255, (t >> 8) & 255, t & 255); }
      let lt = mapLt(gv(6)); if (lt === 'BYBLOCK') lt = inh ? inh.lt : 'BYLAYER';
      let lw = gv(370) != null ? parseInt(gv(370)) : -1; if (lw === -2) lw = inh ? inh.lw : -1; if (lw === -3) lw = -1;
      const base = { layer, color, lt, lw };
      const ocsFlip = gn(230, 1) < -0.5;
      const P3 = (cx, cy, cz, ocs) => { let x = gn(cx), y = gn(cy), z = gn(cz); if (ocs && ocsFlip) x = -x, z = -z; return X([x, y, z]); };
      const push = (type, props) => { out.push(Object.assign({ type }, base, props)); stats.ok++; };
      // ArıtmaCAD XDATA
      const xi = r.g.findIndex(q => q[0] === 1001 && q[1] === 'ARITMACAD');
      if (xi >= 0 && r.type === 'POINT') {
        let s2 = ''; for (let j = xi + 1; j < r.g.length && r.g[j][0] === 1000; j++) s2 += r.g[j][1];
        try { const o0 = parseX(s2); if (o0.__chunk) return; if (o0.bigp) { (bigParts[o0.bigp.k] = bigParts[o0.bigp.k] || [])[o0.bigp.i] = o0.d; return; } const o = unBig(o0); if (o.layouts) { layoutsOut = o.layouts; return; } if (o.ayar) { ayarOut = o.ayar; return; } if (o.arazi) { (araziParts[o.arazi.k] = araziParts[o.arazi.k] || [])[o.arazi.i] = o.arazi.d; return; } } catch (err) { }
      }
      if (xi >= 0 && r.type === 'INSERT' && !opts.noParam) {
        let s = ''; for (let j = xi + 1; j < r.g.length && r.g[j][0] === 1000; j++) s += r.g[j][1];
        try { const o0 = parseX(s); if (o0.__chunk) return; if (o0.bigp) { (bigParts[o0.bigp.k] = bigParts[o0.bigp.k] || [])[o0.bigp.i] = o0.d; return; } const o = unBig(o0); if (o.layouts) { layoutsOut = o.layouts; return; } if (o.ayar) { ayarOut = o.ayar; return; } if (o.arazi) { (araziParts[o.arazi.k] = araziParts[o.arazi.k] || [])[o.arazi.i] = o.arazi.d; return; } if (o.o) { const e = o.o; delete e.id; if (e.type === 'blk' && !defsOut[e.ref]) { const d = Object.assign({}, o.d || { id: e.ref, name: e.ref }); d.ents = convBlock(dec(gv(2, '')), 0); defsOut[e.ref] = splitDef(d); } out.push(e); stats.comp++; stats.ok++; return; } } catch (err) { }
      }
      switch (r.type) {
        case 'LINE': push('line', { a: X([gn(10), gn(20), gn(30)]), b: X([gn(11), gn(21), gn(31)]) }); break;
        case 'POINT': push('point', { p: X([gn(10), gn(20), gn(30)]) }); break;
        case 'CIRCLE': { const c = P3(10, 20, 30, true), sc = X.s || 1; push('circle', { c, r: gn(40) * sc }); break; }
        case 'ARC': {
          const c = P3(10, 20, 30, true), sc = X.s || 1; let a0 = gn(50), a1 = gn(51);
          if (ocsFlip) { [a0, a1] = [180 - a1, 180 - a0]; }
          if (X.rot) { a0 += X.rot; a1 += X.rot; } if (X.mir) { [a0, a1] = [180 - a1, 180 - a0]; }
          push('arc', { c, r: gn(40) * sc, a0, a1 }); break;
        }
        case 'LWPOLYLINE': {
          const xs = gall(10), ys = gall(20), z = gn(38); const pts = [], bul = [];
          let vi = -1; for (const [c, v] of r.g) { if (c === 10) { vi++; bul[vi] = 0; } if (c === 42 && vi >= 0) bul[vi] = parseFloat(v); }
          for (let k = 0; k < xs.length; k++) { let x = +xs[k], y = +ys[k]; if (ocsFlip) x = -x; pts.push(X([x, y, z])); }
          let b2 = bul.map(b => (ocsFlip ? -b : b) * (X.mir ? -1 : 1));
          if (pts.length >= 2) push('pline', { pts, closed: !!(gn(70) & 1), bul: b2.some(b => b) ? b2 : undefined });
          break;
        }
        case 'POLYLINE': {
          const fl = gn(70);
          if (fl & 64) { // polyface
            const vs = [], fs = [];
            for (const v of r.verts) { const vg = c => { const p = v.g.find(q => q[0] === c); return p ? +p[1] : 0; }; const vf = vg(70); if (vf & 128 && !(vf & 64)) { const idx = [71, 72, 73, 74].map(vg).filter(x => x !== 0); fs.push(idx.map(x => (x < 0 ? -1 : 1) * (Math.abs(x) - 1))); } else vs.push(X([vg(10), vg(20), vg(30)])); }
            if (vs.length && fs.length) push('pmesh', { v: vs, f: fs.map(f => f.map(Math.abs)) });
            break;
          }
          if (fl & 16) { // polygon mesh M×N
            const m = gn(71), n = gn(72); const vs = r.verts.map(v => { const vg = c => { const p = v.g.find(q => q[0] === c); return p ? +p[1] : 0; }; return X([vg(10), vg(20), vg(30)]); });
            const fs = []; for (let a = 0; a < m - 1; a++) for (let b = 0; b < n - 1; b++) fs.push([a * n + b, a * n + b + 1, (a + 1) * n + b + 1, (a + 1) * n + b]);
            if (vs.length) push('pmesh', { v: vs, f: fs }); break;
          }
          const elev = gn(30); const pts = [], bul = [];
          for (const v of r.verts) { const vg = c => { const p = v.g.find(q => q[0] === c); return p ? +p[1] : 0; }; let x = vg(10); if (ocsFlip && !(fl & 8)) x = -x; pts.push(X([x, vg(20), fl & 8 ? vg(30) : elev])); bul.push(vg(42) * (ocsFlip ? -1 : 1) * (X.mir ? -1 : 1)); }
          if (pts.length >= 2) push('pline', { pts, closed: !!(fl & 1), bul: bul.some(b => b) ? bul : undefined });
          break;
        }
        case 'TEXT': case 'ATTRIB': case 'ATTDEF': {
          if (r.type === 'ATTRIB' && (gn(70) & 1)) break;
          if (r.type === 'ATTDEF' && depth > 0) break;
          const ha = gn(72), va = gn(73), sc = X.s || 1;
          let p = X([gn(10), gn(20), gn(30)]), rot = gn(50) + (X.rot || 0), al = 'L', wf = gn(41, 1) || 1, h = gn(40, 1) * sc;
          const s1 = r.type === 'ATTDEF' ? '{' + dec(gv(2, '')) + '}' : dec(gv(1, ''));
          if ((ha === 3 || ha === 5) && gv(11) != null) { const q = X([gn(11), gn(21), gn(31)]); rot = Math.atan2(q[1] - p[1], q[0] - p[0]) / RAD; if (C.measureText) { const w0 = C.measureText(s1, h, C.textStyle(dec(gv(7, 'Standard')))) || 1, d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (ha === 3) h *= d / (w0 * wf); else wf = d / w0; } }
          else if (ha || va) { p = X([gn(11), gn(21), gn(31)]); const hc = ha === 1 ? 'C' : ha === 2 ? 'R' : 'L'; al = ha === 4 ? 'M' : va === 3 ? 'T' + hc : va === 2 ? 'M' + hc : va === 1 ? 'B' + hc : hc; }
          const o = { p, h, s: s1, rot, al, st: dec(gv(7, 'Standard')) }; if (Math.abs(wf - 1) > 1e-9) o.wf = wf; if (gn(51)) o.obl = gn(51);
          o.ann = false; push('text', o);
          break;
        }
        case 'MTEXT': {
          let raw = dec(gall(3).join('') + (gv(1) || '')); let wf = 1, obl = 0;
          const mW = raw.match(/\\W([\d.]+);/), mQ = raw.match(/\\Q(-?[\d.]+);/); if (mW) wf = +mW[1]; if (mQ) obl = +mQ[1];
          const s1 = raw.replace(/\\P/g, '\n').replace(/\\[ACFHQTWfhqtwp][^;]*;/g, '').replace(/\\[LlOoKkNX]/g, '').replace(/\\S([^;]*);/g, (m0, a1) => a1.replace(/[#^]/, '/')).replace(/\\~/g, ' ').replace(/[{}]/g, '').replace(/\\\\/g, '\\');
          const att = gn(71, 1), h = gn(40, 1) * (X.s || 1); let rot = gn(50) * (Math.abs(gn(50)) > 6.3 ? 1 : 180 / Math.PI);
          if (gv(11) != null) rot = Math.atan2(gn(21), gn(11)) / RAD;
          const al = ['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR'][Math.max(0, Math.min(8, att - 1))];
          const o = { p: X([gn(10), gn(20), gn(30)]), h, s: s1, rot: rot + (X.rot || 0), al, mt: true, mw: gn(41) * (X.s || 1), st: dec(gv(7, 'Standard')) };
          if (gn(44)) o.ls = gn(44); if (wf !== 1) o.wf = wf; if (obl) o.obl = obl;
          o.ann = false; push('text', o);
          break;
        }
        case 'SOLID': case 'TRACE': { const q = [0, 1, 2, 3].map(k => X([gn(10 + k), gn(20 + k), gn(30 + k)])); const pts = M.dist(q[2], q[3]) < 1e-9 ? [q[0], q[1], q[2]] : [q[0], q[1], q[3], q[2]]; push('solid', { pts }); break; }
        case '3DFACE': { const q = [0, 1, 2, 3].map(k => X([gn(10 + k), gn(20 + k), gn(30 + k)])); push('face', { pts: M.dist(q[2], q[3]) < 1e-9 ? q.slice(0, 3) : q }); break; }
        case 'MESH': {
          const g = r.g; let i = g.findIndex(q => q[0] === 92); if (i < 0) break;
          const nv = +g[i][1], vs = []; i++;
          while (vs.length < nv && i < g.length) { if (g[i][0] === 10) { vs.push(X([+g[i][1], +g[i + 1][1], +g[i + 2][1]])); i += 3; } else i++; }
          const j0 = g.findIndex((q, k) => k >= i && q[0] === 93); const fs = [];
          if (j0 >= 0) { const nf = +g[j0][1]; const lst = []; for (let k = j0 + 1; k < g.length && lst.length < nf; k++) if (g[k][0] === 90) lst.push(+g[k][1]); for (let k = 0; k < lst.length;) { const c = lst[k++]; const f = lst.slice(k, k + c); k += c; for (let q = 1; q < f.length - 1; q++) fs.push([f[0], f[q], f[q + 1]]); } }
          if (vs.length && fs.length) push('pmesh', { v: vs, f: fs });
          break;
        }
        case 'ELLIPSE': {
          const cc = [gn(10), gn(20), gn(30)], mx = gn(11), my = gn(21), ra = gn(40, 1), t0 = gn(41, 0), t1 = gn(42, Math.PI * 2);
          const c = X(cc), e1 = X([cc[0] + mx, cc[1] + my, cc[2]]), e2 = X([cc[0] - my * ra, cc[1] + mx * ra, cc[2]]);
          const mj = [e1[0] - c[0], e1[1] - c[1]], mn = [e2[0] - c[0], e2[1] - c[1]], lM = Math.hypot(...mj), lm = Math.hypot(...mn);
          const flip = mj[0] * mn[1] - mj[1] * mn[0] < 0, full = Math.abs(t1 - t0 - Math.PI * 2) < 1e-6 || Math.abs(t1 - t0) < 1e-9;
          let a0 = t0, a1 = t1; if (flip && !full) { a0 = -t1; a1 = -t0; }
          push('ellipse', { c, mj, ra: lM > 1e-12 ? lm / lM : ra, t0: full ? 0 : a0, t1: full ? Math.PI * 2 : a1 }); break;
        }
        case 'SPLINE': {
          let xs = gall(11), ys = gall(21), zs = gall(31); if (!xs.length) { xs = gall(10); ys = gall(20); zs = gall(30); }
          const pts = xs.map((x, k) => X([+x, +ys[k], +(zs[k] || 0)])); if (pts.length >= 2) push('pline', { pts, closed: !!(gn(70) & 1) }); break;
        }
        case 'LEADER': { const pts = gall(10).map((x, k) => X([+x, +gall(20)[k], +(gall(30)[k] || 0)])); const k41 = gall(1070).findIndex(v => +v === 41), a41 = k41 >= 0 ? +gall(1040)[k41] : null; if (pts.length >= 2) push('leader', { pts, asz: a41 > 0 ? a41 * (X.s || 1) : 0.1 }); break; }
        case 'INSERT': case 'DIMENSION': {
          const nm = dec(gv(2, '')), b = blocksG[nm]; if (!b || depth > 8) { stats.skip[r.type] = (stats.skip[r.type] || 0) + 1; break; }
          if (r.type === 'INSERT' && depth === 0 && !opts.explode && !nm.startsWith('*') && !/^AC_/.test(nm) && gn(70, 1) <= 1 && gn(71, 1) <= 1 && !ocsFlip) {
            const ref = 'DXF_' + C.ascii(nm).replace(/[^A-Za-z0-9_]+/g, '_');
            if (!defsOut[ref]) { const g2 = pbn(nm); defsOut[ref] = { id: ref, name: nm, tur: g2.tur, dn: g2.dn, view: g2.view, unit: 'm', src: 'DXF', ents: convBlock(nm, depth) }; splitDef(defsOut[ref]); }
            const d0 = defsOut[ref];
            push('blk', { ref, p: X([gn(10), gn(20), gn(30)]), rot: gn(50), sx: gn(41, 1), sy: gn(42, 1), tur: d0.tur, dn: d0.dn, view: d0.view });
            for (const a of r.attribs || []) conv(a, X, null, depth + 1);
            break;
          }
          let ip = [gn(10), gn(20), gn(30)], sx = gn(41, 1), sy = gn(42, 1), rot = gn(50);
          if (r.type === 'DIMENSION') { ip = [0, 0, 0]; sx = sy = 1; rot = 0; }
          if (ocsFlip) { ip = [-ip[0], ip[1], -ip[2]]; sx = -sx; rot = -rot; }
          const cs = Math.cos(rot * RAD), sn = Math.sin(rot * RAD), bs = b.base;
          const isD = r.type === 'DIMENSION', cols = isD ? 1 : Math.max(1, gn(70, 1)), rows = isD ? 1 : Math.max(1, gn(71, 1)), cdx = isD ? 0 : gn(44), rdy = isD ? 0 : gn(45); // ölçüde 70/71 dizi değil, ölçü tipi / yazı hizası
          const inh2 = { layer, color: color === 256 ? 256 : color, lt: lt === 'BYLAYER' ? 'BYLAYER' : lt, lw };
          for (let ci = 0; ci < cols; ci++) for (let ri = 0; ri < rows; ri++) {
            const off = [ci * cdx, ri * rdy];
            const Xl = q => { const x = (q[0] - bs[0]) * sx + off[0], y = (q[1] - bs[1]) * sy + off[1]; return X([ip[0] + x * cs - y * sn, ip[1] + x * sn + y * cs, ip[2] + (q[2] || 0) - bs[2]]); };
            Xl.s = (X.s || 1) * Math.sqrt(Math.abs(sx * sy)); Xl.rot = (X.rot || 0) + rot; Xl.mir = !!X.mir !== (sx * sy < 0);
            for (const sub of b.ents) conv(sub, Xl, inh2, depth + 1);
          }
          for (const a of r.attribs || []) conv(a, X, null, depth + 1);
          break;
        }
        case 'HATCH': {
          const gg = r.g, loops = []; let i = gg.findIndex(q => q[0] === 91); if (i < 0) { stats.skip.HATCH = (stats.skip.HATCH || 0) + 1; break; }
          const nl = +gg[i][1]; i++;
          const val = c => { while (i < gg.length && gg[i][0] !== c) i++; return i < gg.length ? gg[i++][1] : null; };
          const num = () => +gg[i++][1];
          for (let l = 0; l < nl; l++) {
            const fl = +val(92), pts = [];
            if (fl & 2) {
              const hasB = +val(72), n = +val(93); const vs = [];
              for (let k = 0; k < n; k++) { while (gg[i] && gg[i][0] !== 10) i++; const x = num(), y = +gg[i++][1]; let b = 0; if (hasB && gg[i] && gg[i][0] === 42) b = num(); vs.push([x, y, b]); }
              vs.forEach((v, k) => { pts.push([v[0], v[1]]); if (v[2]) { const w = vs[(k + 1) % vs.length]; const bp = C.bulgePts ? C.bulgePts([v[0], v[1]], [w[0], w[1]], v[2]) : []; bp.forEach(q => pts.push([q[0], q[1]])); } });
            } else {
              const ne = +val(93);
              for (let k = 0; k < ne; k++) {
                while (gg[i] && gg[i][0] !== 72) i++; const ty = num();
                const rd = c => { while (gg[i] && gg[i][0] !== c) i++; return num(); };
                if (ty === 1) { const x0 = rd(10), y0 = rd(20), x1 = rd(11), y1 = rd(21); pts.push([x0, y0]); }
                else if (ty === 2) { const cx = rd(10), cy = rd(20), rr = rd(40), a0 = rd(50), a1 = rd(51), ccw = rd(73); let s0 = a0 * RAD, s1 = a1 * RAD; if (!ccw) { s0 = -a0 * RAD; s1 = -a1 * RAD; } let sw = s1 - s0; if (ccw && sw <= 0) sw += Math.PI * 2; if (!ccw && sw >= 0) sw -= Math.PI * 2; const nn = Math.max(4, Math.ceil(Math.abs(sw) / (Math.PI * 2) * 72)); for (let q = 0; q < nn; q++) { const a = s0 + sw * q / nn; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } }
                else if (ty === 3) { const cx = rd(10), cy = rd(20), mx = rd(11), my = rd(21), ratio = rd(40), a0 = rd(50), a1 = rd(51), ccw = rd(73); const ma = Math.hypot(mx, my), ang = Math.atan2(my, mx); let s0 = a0 * RAD, s1 = a1 * RAD; let sw = s1 - s0; if (sw <= 0) sw += Math.PI * 2; const nn = Math.max(8, Math.ceil(sw / (Math.PI * 2) * 72)); for (let q = 0; q < nn; q++) { let t = s0 + sw * q / nn; if (!ccw) t = -t; const x = ma * Math.cos(t), y = ma * ratio * Math.sin(t); pts.push([cx + x * Math.cos(ang) - y * Math.sin(ang), cy + x * Math.sin(ang) + y * Math.cos(ang)]); } }
                else if (ty === 4) { rd(94); const nk = rd(95), nc = (() => { while (gg[i] && gg[i][0] !== 96) i++; return num(); })(); for (let q = 0; q < nk; q++) rd(40); for (let q = 0; q < nc; q++) { const x = rd(10), y = rd(20); pts.push([x, y]); } }
              }
            }
            const nsrc = +(val(97) || 0); for (let q = 0; q < nsrc; q++) val(330);
            const cl = pts.filter((p, k) => k === 0 || Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]) > 1e-12);
            if (cl.length > 1 && Math.hypot(cl[0][0] - cl[cl.length - 1][0], cl[0][1] - cl[cl.length - 1][1]) < 1e-9) cl.pop();
            if (cl.length >= 3) loops.push(cl.map(p => { const q = X([p[0], p[1], 0]); return [q[0], q[1]]; }));
          }
          const rest = gg.slice(i), rv = (c, d) => { const p = rest.find(q => q[0] === c); return p ? p[1] : d; };
          const name = C.up(dec(gv(2, 'ANSI31')).trim()), solid = +gv(70, 0) === 1 || name === 'SOLID';
          const ang = +rv(52, 0), k = +rv(41, 1) || 1;
          const an0 = C.doc.set.anno || 100, o = { loops, pat: solid ? 'SOLID' : name, ang: ang + (X.rot || 0), sc: k * 1000 / an0, ann: true, orig: [0, 0], defAnno: an0 }; // dışarıdan gelen tarama da paftada ölçeğe göre değişir
          if (!solid && !C.HATCH_PATTERNS[name]) { // gömülü desen tanımı
            const def = []; let j = rest.findIndex(q => q[0] === 78);
            if (j >= 0) { const nd = +rest[j][1]; j++; for (let q = 0; q < nd; q++) { const f = {}; const rn = c => { while (j < rest.length && rest[j][0] !== c) j++; return +rest[j++][1]; }; f.a = rn(53); const ox = rn(43), oy = rn(44), dx = rn(45), dy = rn(46), nd2 = rn(79); f.dash = []; for (let w = 0; w < nd2; w++) f.dash.push(rn(49)); const O = X([ox, oy, 0]), s2 = X.s || 1; f.o = [O[0], O[1]]; f.off = [dx * s2, dy * s2]; f.a += (X.rot || 0); f.dash = f.dash.map(v => v * s2); def.push(f); } }
            if (def.length) o.def = def;
          }
          if (C.HATCH_PATTERNS[name] && C.HATCH_PATTERNS[name].real) o.sc = k * 1000; if (C.HATCH_PATTERNS[name] && C.HATCH_PATTERNS[name].f) o.sc /= C.HATCH_PATTERNS[name].f;
          const xd = gall(1000).join(''); if (xd) { try { const h = parseX(xd).h; if (h) { Object.assign(o, { pat: h.pat || o.pat, sc: h.sc, ang: h.ang, ann: h.ann }); if (h.ascales) o.ascales = h.ascales; delete o.def; } } catch (err) { } }
          if (loops.length) push('hatch', o); else stats.skip.HATCH = (stats.skip.HATCH || 0) + 1;
          break;
        }
        case 'VIEWPORT': case 'IMAGE': case 'WIPEOUT': case 'XLINE': case 'RAY': case '3DSOLID': case 'REGION': case 'BODY': case 'MLINE': case 'OLE2FRAME': case 'ACAD_PROXY_ENTITY':
        default: stats.skip[r.type] = (stats.skip[r.type] || 0) + 1;
      }
    };
    const ID = q => [q[0], q[1], q[2] || 0]; ID.s = 1; ID.rot = 0; ID.mir = false;
    for (const r of group(d.ents)) {
      // kağıt uzayı varlıklarını atla
      if (r.g.some(q => q[0] === 67 && q[1].trim() === '1')) { stats.skip.paperspace = (stats.skip.paperspace || 0) + 1; continue; }
      try { conv(r, ID, null, 0); } catch (err) { console.warn(err); stats.skip.error = (stats.skip.error || 0) + 1; }
    }
    const ltscale = d.header.$LTSCALE ? +d.header.$LTSCALE[0][1] : null;
    delete layers['AC_DUZEN'];
    let blockDefs = null;
    if (opts.blocks) { blockDefs = {}; for (const nm of Object.keys(blocksG)) { if (nm.startsWith('*')) continue; blockDefs[nm] = convBlock(nm, 0); } }
    for (let k = out.length - 1; k >= 0; k--) { const e = out[k]; if (e.type !== 'arazi' || !e.hk) continue; const ps = araziParts[e.hk]; delete e.hk; if (!ps || ps.some(q => q == null)) { out.splice(k, 1); stats.skip.arazi = (stats.skip.arazi || 0) + 1; continue; } let prev = 0; e.h = ps.join('').split(',').map(t => { prev += parseInt(t, 36); return prev / 100; }); }
    delete layers['AC_ARAZI'];
    return { ents: out, layers, styles: d.styles, stats, insUnits, ltscale, layouts: layoutsOut, ayar: ayarOut, blocks: defsOut, blockDefs };
  };
})(typeof window !== 'undefined' ? window.C : globalThis.C);

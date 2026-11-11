/* ArıtmaCAD — gelişmiş açıklama ölçeği (AutoCAD annotative benzeri) ve detay paftaları
   - açıklama nesneleri (ölçü, kot, yazı, tarama, etiketler) bir ya da birkaç ölçeğe bağlanabilir (ascales); boş = tüm ölçekler
   - ölçeğe özel konum (aoff[ölçek] = [dx,dy]): aynı yazı detayda başka, genel planda başka yerde durabilir
   - görünüm pencereleri: ölçek, açıklama görünürlüğü (yalnız bu ölçek / hepsi), başlık, şekil (dikdörtgen, daire, üçgen, yamuk, çokgen)
   - DETAY: modelde alan seç -> ölçek -> kağıda yerleştir; modelde detay çerçevesi + etiket, kağıtta başlık */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, { L, P, TX } = C.prim;
  const set = () => C.doc.set;
  const isAnno = e => C.ANNO_TYPES && C.ANNO_TYPES.has(e.type);
  const fmtS = sc => '1/' + sc;

  /* ---------- görünürlük ve ölçeğe özel konum ---------- */
  C.annoVisible = (e, scale, mode) => {
    if (!isAnno(e) || mode === 'hepsi' || !e.ascales || !e.ascales.length) return true;
    return e.ascales.includes(scale);
  };
  const shiftPr = (pr, d) => {
    const s = p => [p[0] + d[0], p[1] + d[1], p[2] || 0], o = Object.assign({}, pr);
    if (o.a) o.a = s(o.a); if (o.b) o.b = s(o.b); if (o.c) o.c = s(o.c); if (o.p) o.p = s(o.p); if (o.pts) o.pts = o.pts.map(s); if (o.verts) o.verts = o.verts.map(s);
    return o;
  };
  C.annoShift = (e, prims) => { const d = e.aoff && e.aoff[set().anno]; return d && (d[0] || d[1]) ? prims.map(pr => shiftPr(pr, d)) : prims; };

  /* yeni açıklamalar: ayara göre geçerli ölçeğe bağlanır */
  { const ne0 = C.newEnt; C.newEnt = function (type, props) { const e = ne0.apply(this, arguments); if (C.ANNO_TYPES && C.ANNO_TYPES.has(type)) { if (e.acs == null) e.acs = set().anno; if (!e.ascales && set().annoNew === 'GECERLI' && !(props && props._noAnno)) e.ascales = [set().anno]; } return e; }; }

  /* ölçek değişince (OTO-ÖLÇEK açıksa) eski ölçeği destekleyen açıklamalara yenisini ekle */
  C.on && C.on('annoChanged', ({ from, to }) => {
    if (!set().annoAuto || from === to) return; let n = 0;
    for (const e of C.doc.ents) if (isAnno(e) && e.ascales && e.ascales.includes(from) && !e.ascales.includes(to)) { e.ascales.push(to); delete e._c; n++; }
    if (n) C.log(`OTO-ÖLÇEK: ${n} açıklamaya ${fmtS(to)} ölçeği eklendi.`);
  });
  { const d0 = C.cmds.OLCEK; const f0 = d0.fn; C.addCommand(d0.names, d0.help + ' — açıklama ölçeği (ölçü, kot, yazı, tarama boyutu buna göre).', async (I, Cx) => { const a = set().anno; const r = await f0(I, Cx); if (set().anno !== a) C.emit('annoChanged', { from: a, to: set().anno }); return r; }); }

  /* ---------- açıklama ölçeği komutları ---------- */
  const parseScales = s => String(s || '').split(/[\s,;]+/).map(t => parseFloat(t.replace(/^1[:/]/, ''))).filter(v => v > 0);
  C.addCommand(['ANNOSCALEADD', 'OLCEKEKLE', 'ACIKLAMAOLCEGIEKLE'], 'Seçili açıklamalara (ölçü, kot, yazı, tarama, etiket) ölçek ekler: OLCEKEKLE seçim "100 50 20"', async (I) => {
    const s = (await I.sel('Açıklama nesnelerini seçin')).filter(isAnno); if (!s.length) { C.warn('Açıklama nesnesi (ölçü, kot, yazı, tarama…) seçilmedi'); return; }
    const sc = parseScales(await I.str('Eklenecek ölçek(ler) (ör. 100 50 20)', String(set().anno))); if (!sc.length) return;
    for (const e of s) { e.ascales = [...new Set([...(e.ascales && e.ascales.length ? e.ascales : [e.acs || set().anno]), ...sc])].sort((a, b) => a - b); delete e._c; }
    C.changed(); C.log(`${s.length} açıklamaya ${sc.map(fmtS).join(', ')} eklendi.`);
  });
  C.addCommand(['ANNOSCALEDELETE', 'OLCEKCIKAR', 'ACIKLAMAOLCEGICIKAR'], 'Seçili açıklamalardan ölçek çıkarır (en az bir ölçek kalır)', async (I) => {
    const s = (await I.sel('Açıklama nesnelerini seçin')).filter(isAnno); if (!s.length) return;
    const sc = parseScales(await I.str('Çıkarılacak ölçek(ler)', String(set().anno))); let n = 0;
    for (const e of s) { const cur = e.ascales && e.ascales.length ? e.ascales : C.STD_SCALES.slice(); const left = cur.filter(v => !sc.includes(v)); if (left.length) { e.ascales = left; delete e._c; n++; } }
    C.changed(); C.log(`${n} açıklamadan ${sc.map(fmtS).join(', ')} çıkarıldı.`);
  });
  C.addCommand(['ANNOSCALEALL', 'OLCEKTUM', 'TUMOLCEKLER'], 'Seçili açıklamaları tüm ölçeklerde görünür yapar (ölçek listesini temizler)', async (I) => {
    const s = (await I.sel('Açıklama nesnelerini seçin')).filter(isAnno); for (const e of s) { delete e.ascales; delete e._c; } C.changed(); C.log(`${s.length} açıklama tüm ölçeklerde görünür.`);
  });
  C.addCommand(['ANNOMOVE', 'OLCEKKONUM', 'ACIKLAMATASI'], 'Açıklamayı yalnız GEÇERLİ ölçekte taşır (ör. detayda yazının yeri başka olsun). S = bu ölçekteki konumu sıfırla', async (I) => {
    const s = (await I.sel(`Taşınacak açıklamalar (yalnız ${fmtS(set().anno)} ölçeğinde)`)).filter(isAnno); if (!s.length) { C.warn('Açıklama nesnesi seçilmedi'); return; }
    const b = await I.pt('Taban noktası', { kw: [['S', 'Sıfırla']] }); if (b == null) return;
    const sc = set().anno;
    if (b === 'S') { for (const e of s) { if (e.aoff) delete e.aoff[sc]; delete e._c; } C.changed(); C.log('Konumlar sıfırlandı.'); return; }
    E.base = b; E.preview = q => s.slice(0, 200).flatMap(e => C.prims(e).map(pr => shiftPr(pr, [q[0] - b[0], q[1] - b[1]])));
    const t = await I.pt('İkinci nokta'); E.preview = null; if (!t || typeof t === 'string') return;
    for (const e of s) { e.aoff = e.aoff || {}; const o = e.aoff[sc] || [0, 0]; e.aoff[sc] = [o[0] + t[0] - b[0], o[1] + t[1] - b[1]]; delete e._c; }
    C.changed(); C.log(`${s.length} açıklama yalnız ${fmtS(sc)} ölçeğinde taşındı.`);
  });
  C.addCommand(['ANNOSETTINGS', 'OLCEKAYAR', 'ACIKLAMAAYAR'], 'Açıklama ölçeği ayarları: YENI=TUM|GECERLI (yeni açıklamalar hangi ölçeklere bağlanır), OTO=AC|KAPAT (ölçek değişince ekle), GOSTER=TUM|GECERLI (modelde)', async (I) => {
    const kv = {}; E.queue = E.queue.filter(t => { const m = /^([A-Za-z]+)=(.*)$/.exec(t); if (m) { kv[C.up(m[1])] = C.up(m[2]); return false; } return true; });
    if (kv.YENI) set().annoNew = kv.YENI.startsWith('G') ? 'GECERLI' : 'TUM';
    if (kv.OTO) set().annoAuto = kv.OTO.startsWith('A'); if (kv.GOSTER) C.state.annoAll = !kv.GOSTER.startsWith('G');
    if (!Object.keys(kv).length) { const v = await I.kw('Yeni açıklamalar', [['TUM', 'Tüm ölçeklerde'], ['GECERLI', 'Yalnız geçerli ölçekte (AutoCAD gibi)']], set().annoNew || 'TUM'); set().annoNew = v; }
    C.emit('state'); C.changed(); C.log(`Yeni açıklamalar: ${set().annoNew === 'GECERLI' ? 'yalnız geçerli ölçek' : 'tüm ölçekler'} · OTO-ÖLÇEK: ${set().annoAuto ? 'açık' : 'kapalı'} · modelde: ${C.state.annoAll === false ? 'yalnız geçerli ölçek' : 'tümü'}`);
  }, { noUndo: true });
  if (C.state.annoAll == null) C.state.annoAll = true;

  /* ---------- pencere şekli (kırpma) ve başlık ---------- */
  C.vpClipPoly = vp => { const cx = vp.x + vp.w / 2, cy = vp.y + vp.h / 2; return vp.clip && vp.clip.length >= 3 ? vp.clip.map(([dx, dy]) => [cx + dx, cy + dy]) : [[vp.x, vp.y], [vp.x + vp.w, vp.y], [vp.x + vp.w, vp.y + vp.h], [vp.x, vp.y + vp.h]]; };
  C.vpLabelPrims = Lay => {
    const out = [];
    for (const vp of Lay.vps) {
      if (!vp.label) continue; const poly = C.vpClipPoly(vp), x = (Math.min(...poly.map(q => q[0])) + Math.max(...poly.map(q => q[0]))) / 2, y = Math.min(...poly.map(q => q[1])) - 7;
      const t1 = vp.label, w1 = C.measureText ? C.measureText(t1, 5) : t1.length * 4;
      out.push(TX([x, y, 0], 5, t1, 0, 'BC'), TX([x, y - 4.5, 0], 3, 'Ö: ' + fmtS(vp.scale), 0, 'TC'), L([x - w1 / 2 - 2, y - 1.2, 0], [x + w1 / 2 + 2, y - 1.2, 0], { lw: 50 }));
    }
    return out;
  };
  const shapePts = (kind, pts) => { // model noktaları -> çokgen
    if (kind === 'circle') { const [c, r] = pts, o = []; for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; o.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, 0]); } return o; }
    if (kind === 'rect') { const [a, b] = pts; return [[a[0], a[1], 0], [b[0], a[1], 0], [b[0], b[1], 0], [a[0], b[1], 0]]; }
    return pts.map(M.p3);
  };
  /* model şekli (çokgen) ve ölçekten pencere oluştur */
  C.makeShapedVp = (poly, scale, at) => {
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, k = 1000 / scale;
    const clip = poly.map(p => [(p[0] - cx) * k, (p[1] - cy) * k]), w = (Math.max(...xs) - Math.min(...xs)) * k, h = (Math.max(...ys) - Math.min(...ys)) * k;
    return { x: at[0] - w / 2, y: at[1] - h / 2, w, h, cx, cy, scale, clip };
  };
  const SC_KW = [['20'], ['10'], ['25'], ['50'], ['5'], ['100'], ['200']];
  const askScale = async (I, def) => { const v = await I.str(`Ölçek 1: (ör. ${C.STD_SCALES.filter(s => s <= 500).join(', ')})`, String(def), { whole: false }); const n = parseFloat(String(v).replace(/^1[:/]/, '')); return n > 0 ? n : def; };
  const askShape = async (I, kindDef) => {
    const kind = await I.kw('Detay alanının şekli', [['D', 'Dikdörtgen'], ['C', 'Daire'], ['U', 'Üçgen'], ['Y', 'Yamuk (4 köşe)'], ['P', 'Çokgen'], ['N', 'Nesne seç']], kindDef || 'D');
    if (kind === 'N') {
      const s = await I.sel('Kapalı çoklu çizgi ya da daire seçin', { pre: false }); const e = s.find(q => (q.type === 'pline' && q.closed) || q.type === 'circle'); if (!e) { C.warn('Kapalı şekil seçilmedi'); return null; }
      return { poly: e.type === 'circle' ? shapePts('circle', [e.c, e.r]) : C.prims(e)[0].pts.map(M.p3), src: e };
    }
    if (kind === 'D') { const a = await I.pt('İlk köşe'); if (!a || typeof a === 'string') return null; E.base = a; E.rubber = false; E.preview = c => [P(shapePts('rect', [a, c]), true, { lt: 'DASHED' })]; const b = await I.pt('Karşı köşe'); E.preview = null; if (!b || typeof b === 'string') return null; return { poly: shapePts('rect', [a, b]) }; }
    if (kind === 'C') { const c = await I.pt('Merkez'); if (!c || typeof c === 'string') return null; E.base = c; E.preview = q => [C.prim.CI(c, M.dist2(c, q), { lt: 'DASHED' })]; const r = await I.dist('Yarıçap', c); E.preview = null; if (!(r > 0)) return null; return { poly: shapePts('circle', [c, r]), circle: [c, r] }; }
    const need = kind === 'U' ? 3 : kind === 'Y' ? 4 : 0, pts = [];
    for (; ;) {
      const a = pts[pts.length - 1]; E.base = a || null; E.temp = [pts]; E.preview = c => pts.length ? [P([...pts, c], true, { lt: 'DASHED' })] : [];
      const q = await I.pt(`${pts.length + 1}. köşe${!need && pts.length >= 3 ? ' (Enter = bitir)' : ''}`); E.preview = null;
      if (!q || typeof q === 'string') break; pts.push(q); if (need && pts.length === need) break;
    }
    if (pts.length < 3) { C.warn('En az 3 köşe gerekir'); return null; }
    return { poly: pts.map(M.p3) };
  };
  const nextLetter = () => { const used = new Set(); for (const Lay of C.doc.layouts || []) for (const vp of Lay.vps) if (vp.label) used.add(vp.label.replace(/^DETAY\s+/i, '')); for (let i = 0; i < 26; i++) { const ch = String.fromCharCode(65 + i); if (!used.has(ch)) return ch; } return 'Z'; };

  C.addCommand(['DETAIL', 'DETAY', 'DETAYPAFTA'], 'Detay paftası: modelde detay alanını çizin (dikdörtgen, daire, üçgen, yamuk, çokgen ya da kapalı nesne), ölçeği verin, kağıtta yerini seçin. Kağıtta o şekilde kırpılmış pencere + "DETAY A — Ö: 1/20" başlığı; modelde detay çerçevesi ve etiketi oluşur.', async (I) => {
    if (C.currentView === 'layout') C.setView('plan');
    const sh = await askShape(I); if (!sh) return;
    const ad = (await I.str('Detay adı', nextLetter(), { whole: false }) || 'A').toUpperCase();
    const scale = await askScale(I, 20);
    // modelde detay çerçevesi + etiket
    C.std('DETAY'); C.ensureLayer('DETAY', 6, 'DASHED', 35);
    if (!sh.src) { if (sh.circle) C.add(C.newEnt('circle', { c: M.p3(sh.circle[0]), r: sh.circle[1], layer: 'DETAY' })); else C.add(C.newEnt('pline', { pts: sh.poly, closed: true, layer: 'DETAY' })); }
    const xs = sh.poly.map(p => p[0]), ys = sh.poly.map(p => p[1]);
    C.add(C.newEnt('text', { p: [Math.max(...xs), Math.max(...ys), 0], h: C.annoH(3.5), s: 'DETAY ' + ad, al: 'BL', rot: 0, layer: 'DETAY' }));
    // kağıda yerleştir
    if (!(C.doc.layouts || []).length) { C.newLayout(); C.layoutIdx = 0; }
    C.setView('layout'); const Lay = C.views.lay.cur(); if (!Lay) { C.warn('Düzen yok'); return; }
    const k = 1000 / scale, poly = sh.poly, cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    E.preview = c => [P(poly.map(p => [c[0] + (p[0] - cx) * k, c[1] + (p[1] - cy) * k, 0]), true, { lt: 'DASHED' })];
    const at = await I.pt(`Kağıtta detayın yeri (merkez, mm) — ${fmtS(scale)}`); E.preview = null; if (!at || typeof at === 'string') return;
    const vp = C.makeShapedVp(poly, scale, at); vp.label = 'DETAY ' + ad; C.ensureLayer('PENCERE', 7, 'CONTINUOUS', 50); vp.frame = C.vpFrameDefault ? C.vpFrameDefault() : { on: true, layer: 'PENCERE', color: 256, lt: 'BYLAYER', lw: -1, lts: 1 };
    Lay.vps.push(vp); C.layoutSel = vp; C.changed(); C.emit('layouts');
    C.log(`DETAY ${ad} oluşturuldu: ${fmtS(scale)}, ${Math.round(vp.w)}×${Math.round(vp.h)} mm. Bu ölçeğe özel yazı/ölçü için: durum çubuğunda ölçeği ${fmtS(scale)} yapın, yazın; genel plandaki açıklamalar detayda görünmez (pencere özelliklerinden "tüm açıklamalar" seçilebilir).`);
  });

  /* görünüm penceresi: şekil, ölçek, yer */
  C.addCommand(['MVIEW', 'MV', 'GPENCERE', 'GORUNUMPENCERESI'], 'Düzende ölçekli görünüm penceresi. Şekil: dikdörtgen (2 köşe), C = daire, P = çokgen (üçgen, yamuk…). Ardından ölçek ve modelde gösterilecek yer seçilir.', async (I) => {
    if (C.currentView !== 'layout') C.setView('layout'); const Lay = C.views.lay.cur(); if (!Lay) { C.warn('Önce bir düzen oluşturun (DUZEN YENI).'); return; }
    let a = await I.pt('Pencerenin ilk köşesi (kağıt mm) — M: modelden alan seç', { kw: [['M', 'Modelden alan seç'], ['C', 'Daire'], ['P', 'Çokgen']] }); if (a == null) return;
    if (a === 'M') { // Plan'a geç, gösterilecek alanı seç, düzene dön, istediğin yere bırak
      C.setView('plan'); let bb;
      try {
        const p1 = await I.pt('Düzende gösterilecek model alanının ilk köşesi'); if (!p1 || typeof p1 === 'string') return;
        E.base = p1; E.rubber = false; E.preview = c => [P([p1, [c[0], p1[1]], c, [p1[0], c[1]]], true, { lt: 'DASHED', color: 4 })];
        const p2 = await I.pt('Karşı köşe'); E.preview = null; E.base = null; if (!p2 || typeof p2 === 'string') return;
        bb = [Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1]), Math.max(p1[0], p2[0]), Math.max(p1[1], p2[1])];
      } finally { C.setView('layout'); }
      if (bb[2] - bb[0] < 1e-6 || bb[3] - bb[1] < 1e-6) return;
      const fr = C.layoutFrame(Lay), aw = (fr.x1 - fr.x0) * 0.85, ah = (fr.y1 - (fr.tbTop || fr.y0)) * 0.85, need = Math.max((bb[2] - bb[0]) * 1000 / aw, (bb[3] - bb[1]) * 1000 / ah);
      const sug = Math.min(C.STD_SCALES.find(s2 => s2 >= Math.max(set().anno, need)) || Math.ceil(need), Math.max(set().anno, need) > 1e5 ? 1e5 : 1e9);
      const sc = await askScale(I, sug), k = 1000 / sc, w = (bb[2] - bb[0]) * k, h = (bb[3] - bb[1]) * k;
      E.preview = c => [P(shapePts('rect', [[c[0] - w / 2, c[1] - h / 2], [c[0] + w / 2, c[1] + h / 2]]), true)];
      const at = await I.pt(`Pencerenin yeri (merkez) — 1/${sc}, ${Math.round(w)}×${Math.round(h)} mm`); E.preview = null; if (!at || typeof at === 'string') return;
      C.ensureLayer('PENCERE', 7, 'CONTINUOUS', 50);
      const vp = { x: at[0] - w / 2, y: at[1] - h / 2, w, h, cx: (bb[0] + bb[2]) / 2, cy: (bb[1] + bb[3]) / 2, scale: sc, frame: C.vpFrameDefault ? C.vpFrameDefault() : { on: true, layer: 'PENCERE', color: 256, lt: 'BYLAYER', lw: -1, lts: 1 } };
      if (vp.frame.layer) C.ensureLayer(vp.frame.layer, 7, 'CONTINUOUS', 50);
      Lay.vps.push(vp); C.layoutSel = vp; C.changed(); C.emit('layouts'); if (C.fillVpBar) C.fillVpBar();
      C.log(`Görünüm penceresi eklendi (${fmtS(sc)}). Tutamaçlardan boyutlandırın, ortadan taşıyın; sağ tık: sil / kilitle / çerçeve.`);
      return;
    }
    let poly;
    if (a === 'C') { const c = await I.pt('Merkez'); if (!c || typeof c === 'string') return; E.base = c; E.preview = q => [C.prim.CI(c, M.dist2(c, q))]; const r = await I.dist('Yarıçap (mm)', c); E.preview = null; if (!(r > 3)) return; poly = shapePts('circle', [c, r]); }
    else if (a === 'P') { const pts = []; for (; ;) { E.base = pts[pts.length - 1] || null; E.preview = c => pts.length ? [P([...pts, c], true)] : []; const q = await I.pt(`${pts.length + 1}. köşe${pts.length >= 3 ? ' (Enter = bitir)' : ''}`); E.preview = null; if (!q || typeof q === 'string') break; pts.push(q); } if (pts.length < 3) return; poly = pts.map(M.p3); }
    else { if (typeof a === 'string') return; E.base = a; E.rubber = false; E.preview = c => [P(shapePts('rect', [a, c]), true)]; const b = await I.pt('Karşı köşe'); E.preview = null; if (!b || typeof b === 'string') return; poly = shapePts('rect', [a, b]); }
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0; if (w < 5 || h < 5) { C.warn('Pencere çok küçük'); return; }
    const vp = { x: x0, y: y0, w, h, cx: C.views.plan.cx, cy: C.views.plan.cy, scale: set().anno };
    if (a === 'C' || a === 'P') vp.clip = poly.map(p => [p[0] - (x0 + w / 2), p[1] - (y0 + h / 2)]);
    vp.scale = await askScale(I, set().anno);
    const yer = E.scriptMode ? 'O' : await I.kw('Modelde gösterilecek yer', [['M', 'Merkez noktası seç'], ['A', 'Alan seç (ölçek alana göre)'], ['S', 'Çizime sığdır'], ['O', 'Plan görünümünün ortası']], 'M');
    C.ensureLayer('PENCERE', 7, 'CONTINUOUS', 50); vp.frame = C.vpFrameDefault ? C.vpFrameDefault() : { on: true, layer: 'PENCERE', color: 256, lt: 'BYLAYER', lw: -1, lts: 1 };
    Lay.vps.push(vp); C.layoutSel = vp;
    await C.vpPickPlace(I, vp, yer);
    C.changed(); C.emit('layouts'); C.log(`Görünüm penceresi eklendi (${fmtS(vp.scale)}). Ctrl + sürükle ile içini kaydırabilir, üstteki kutudan ölçeğini ve yerini değiştirebilirsiniz.`);
  });
  C.vpPickPlace = async (I, vp, yer) => {
    if (yer === 'S') { const bb = C.extents(C.doc.ents.filter(e => e.type !== 'sheet')); if (bb) { vp.cx = (bb[0] + bb[2]) / 2; vp.cy = (bb[1] + bb[3]) / 2; vp.scale = C.fitScale(bb, vp.w, vp.h); } return; }
    if (yer === 'O' || !yer) { vp.cx = C.views.plan.cx; vp.cy = C.views.plan.cy; return; }
    C.setView('plan'); const k = 1000 / vp.scale, hw = vp.w / 2 / k, hh = vp.h / 2 / k;
    try {
      if (yer === 'M') { E.preview = c => [P([[c[0] - hw, c[1] - hh], [c[0] + hw, c[1] - hh], [c[0] + hw, c[1] + hh], [c[0] - hw, c[1] + hh]], true, { lt: 'DASHED' })]; const c = await I.pt(`Pencerenin göstereceği yerin merkezi (${fmtS(vp.scale)})`); E.preview = null; if (c && typeof c !== 'string') { vp.cx = c[0]; vp.cy = c[1]; } }
      else if (yer === 'A') { const a = await I.pt('Gösterilecek alanın ilk köşesi'); if (a && typeof a !== 'string') { E.base = a; E.rubber = false; E.preview = c => [P([a, [c[0], a[1]], c, [a[0], c[1]]], true, { lt: 'DASHED' })]; const b = await I.pt('Karşı köşe'); E.preview = null; if (b && typeof b !== 'string') { const bb = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; vp.cx = (bb[0] + bb[2]) / 2; vp.cy = (bb[1] + bb[3]) / 2; const need = Math.max((bb[2] - bb[0]) * 1000 / vp.w, (bb[3] - bb[1]) * 1000 / vp.h); vp.scale = C.STD_SCALES.find(s => s >= need) || Math.ceil(need); } } }
    } finally { C.setView('layout'); }
  };
  C.addCommand(['VPYER', 'VPLOCATE', 'PENCEREYERI'], 'Seçili görünüm penceresinin modelde göstereceği yeri seçer: M = merkez, A = alan (ölçek alana göre ayarlanır), S = çizime sığdır', async (I) => {
    const vp = C.layoutSel; if (!vp) { C.warn('Önce Düzen\'de bir pencere seçin'); return; } if (vp.lock) { C.warn('🔒 Pencere kilitli; önce kilidi açın.'); return; }
    const yer = await I.kw('Modelde gösterilecek yer', [['M', 'Merkez noktası'], ['A', 'Alan'], ['S', 'Çizime sığdır']], 'M');
    C.undoStack.push(C.snapshot()); await C.vpPickPlace(I, vp, yer); C.changed(); C.emit('layouts');
  }, { noUndo: true });

  /* ---------- durum çubuğu: açıklama ölçeği ---------- */
  const $ = s => document.querySelector(s);
  const syncBar = () => {
    const sel = $('#annoSel'); if (!sel || !C.doc || !C.doc.set) return; const cur = set().anno;
    const list = [...new Set([...C.STD_SCALES.filter(s => s <= 5000), cur])].sort((a, b) => a - b);
    const html = list.map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>1/${v}</option>`).join('') + '<option value="?">Özel…</option>';
    if (sel._h !== html) { sel.innerHTML = html; sel._h = html; }
    $('#annoAllBtn').classList.toggle('on', C.state.annoAll !== false); $('#annoAutoBtn').classList.toggle('on', !!set().annoAuto);
  };
  if (typeof document !== 'undefined' && $('#annoSel')) {
    $('#annoSel').onchange = e => { let v = e.target.value; if (v === '?') v = prompt('Açıklama ölçeği 1:', set().anno); v = parseFloat(v); if (v > 0 && C.runTool) C.runTool('OLCEK ' + v); else syncBar(); };
    $('#annoAllBtn').onclick = () => { C.state.annoAll = C.state.annoAll === false; C.emit('state'); C.changed(); syncBar(); };
    $('#annoAutoBtn').onclick = () => { set().annoAuto = !set().annoAuto; syncBar(); C.log('OTO-ÖLÇEK ' + (set().annoAuto ? 'AÇIK: ölçek değişince geçerli ölçekteki açıklamalara yeni ölçek eklenir.' : 'KAPALI')); };
    C.on('change', () => setTimeout(syncBar, 0)); C.on('state', syncBar); C.on('doc', syncBar); setTimeout(syncBar, 0);
  }
})(window.C);

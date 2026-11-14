/* ArıtmaCAD — arayüz: görünümler, fare/klavye, komut satırı, paneller, dosya işlemleri, eklenti API */
(function (C) {
  'use strict';
  const M = C.M, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');

  C.newDoc();
  const plan = new C.View2D($('#cvPlan'));
  const map = new C.MapView($('#cvMap'));
  const v3 = new C.View3D($('#cv3d'));
  if (v3.failed) C.warn('WebGL kullanılamıyor; 3B görünüm kapalı.');
  const lay = new C.LayoutView($('#cvLayout'));
  let cur = 'plan';
  C.viewName = () => cur;
  C.activeView = () => (cur === 'map' ? map : plan);
  C.viewScale = () => C.activeView().s;
  const redraw = () => { plan.dirty = true; map.dirty = true; lay.dirty = true; };
  const LAYOUT_OK = new Set(['ERASE', 'PAGESETUP', 'MVIEW', 'LAYOUT', 'LAYOUTPRINT', 'LAYOUTSVG', 'PRINTALL', 'ANTET', 'PLOT', 'PAFTALA', 'PROPERTIES', 'DETAIL', 'VPYER', 'PAFTALISTESI']);

  /* ---------------- görünüm geçişi ---------------- */
  let mapFirst = true, v3First = true;
  let layFirst = true;
  C.setView = function (v) {
    cur = v; C.currentView = v;
    $('#cvLayout').classList.toggle('on', v === 'layout'); $('#layoutCtl').classList.toggle('hidden', v !== 'layout');
    if (v === 'layout') { if (!(C.doc.layouts || []).length) { C.newLayout(); C.layoutIdx = 0; } fillLayouts(); lay.resize(); if (layFirst) { lay.zoomExtents(); layFirst = false; } renderProps(); }
    else { C.layoutSel = null; renderProps(); }
    $$('#viewTabs button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
    $('#cvPlan').classList.toggle('on', v === 'plan'); $('#cv3d').classList.toggle('on', v === '3d'); $('#cvMap').classList.toggle('on', v === 'map');
    $('#mapCtl').classList.toggle('hidden', v !== 'map'); $('#view3dCtl').classList.toggle('hidden', v !== '3d'); $('#v3tools').classList.toggle('hidden', v !== '3d');
    if (v === 'map') { map.resize(); if (mapFirst && C.geo.isSet()) map.zoomExtents(); mapFirst = false; updateGeoUi(); }
    if (v === '3d' && !v3.failed) { v3.resize(); v3.invalidate(); if (v3First) { v3.build(); v3.fit(); v3First = false; } }
    if (v === 'plan') plan.resize();
  };
  $$('#viewTabs button').forEach(b => b.onclick = () => C.setView(b.dataset.view));
  new ResizeObserver(() => { plan.resize(); map.resize(); lay.resize(); if (!v3.failed) v3.resize(); }).observe($('#views'));
  function fillLayouts() {
    const ls = C.doc.layouts || []; C.layoutIdx = Math.min(C.layoutIdx || 0, Math.max(0, ls.length - 1));
    $('#layoutSel').innerHTML = ls.map((L, i) => `<option value="${i}" ${i === C.layoutIdx ? 'selected' : ''}>${esc(L.name)} — ${L.size === 'OZEL' ? (L.pw + '×' + L.ph) : L.size}</option>`).join('');
    lay.dirty = true;
  }
  $('#layoutSel').onchange = e => { C.layoutIdx = +e.target.value; C.layoutSel = null; lay.zoomExtents(); renderProps(); };
  C.on('layouts', () => { fillLayouts(); renderProps(); });
  C.on('doc', () => { C.layoutIdx = 0; C.layoutSel = null; if (cur === 'layout') { if (!(C.doc.layouts || []).length) C.newLayout(); fillLayouts(); lay.zoomExtents(); } });
  C.on('cmdstart', name => { if (cur === 'layout' && !C.vpEdit && !LAYOUT_OK.has(name) && !(C.cmds[name] && C.cmds[name].opts.noUndo)) { C.setView('plan'); C.log('Çizim komutları model alanında çalışır; Plan sekmesine geçildi.'); } });

  C.on('change', () => { redraw(); if (!v3.failed) v3.invalidate(); });
  C.on('selection', () => { redraw(); renderProps(); });
  C.on('layers', () => { redraw(); renderLayers(); fillCurrent(); if (!v3.failed) v3.invalidate(); });
  C.on('doc', () => { redraw(); renderLayers(); fillCurrent(); renderProps(); });
  C.on('zoomExtents', () => { if (cur === '3d') v3.fit(); else if (cur === 'layout') lay.zoomExtents(); else C.activeView().zoomExtents(); });
  C.on('state', () => { syncStatus(); redraw(); });

  /* ---------------- fare ---------------- */
  function attach(view, isMap) {
    const cv = view.cv; let down = null;
    const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const st = () => { const w = C.cmd.waiting; return { pt: !!w && (w.kind === 'pt' || w.kind === 'num'), sel: !!w && w.kind === 'sel', idle: !C.cmd.running }; };
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); const s = st();
      down = { x, y, x0: x, y0: y, b: e.button, shift: e.shiftKey, moved: false, pan: e.button === 1 || (isMap && e.button === 0 && !s.pt && !e.shiftKey) || (e.button === 0 && e.altKey) };
      if (e.button === 0 && s.idle && !isMap && !view.isLayout && !e.altKey && C.gripAt) { const gh = C.gripAt(view, x, y); if (gh) { down.grip = true; C.gripState = gh; view.hoverGrip = null; C.cmd.run('GRIPEDIT'); view.dirty = true; } }
      if (e.button === 1) e.preventDefault();
    });
    cv.addEventListener('pointermove', e => {
      const [x, y] = pos(e); const s = st();
      if (down) {
        const dx = x - down.x, dy = y - down.y; down.x = x; down.y = y;
        if (Math.hypot(x - down.x0, y - down.y0) > 4) down.moved = true;
        if (down.pan) { view.pan(dx, dy); }
        else if (down.b === 0 && down.moved && !s.pt) view.win = [down.x0, down.y0, x, y];
      }
      const raw = view.s2w(x, y);
      let hit = null, p = raw;
      if (s.pt && C.doc && (!isMap || C.geo.isSet())) { hit = view.snap(x, y); if (hit) p = hit.p; }
      if (s.pt && C.state.ortho && C.cmd.base && (!hit || hit.k === 'grid')) { const b = C.cmd.base; p = Math.abs(p[0] - b[0]) > Math.abs(p[1] - b[1]) ? [p[0], b[1], b[2] || 0] : [b[0], p[1], b[2] || 0]; }
      if (s.pt && C.trackPoint && !isMap && !C.state.ortho && (!hit || hit.k === 'grid')) { const tr = C.trackPoint(view, raw); view.track = tr; if (tr) { p = tr.p; hit = null; } } else view.track = null;
      if (hit && C.trackAcquire) C.trackAcquire(hit);
      view.snapHit = hit; view.cursor = p; view.cursorScr = [x, y]; C.cmd.cursor = p;
      view.hoverGrip = s.idle && !down && !isMap && C.gripAt ? (C.gripAt(view, x, y) || null) : null;
      view.hover = (s.idle || s.sel) && !down && !view.hoverGrip && (!isMap || C.geo.isSet()) ? view.pick(x, y) : null;
      view.dirty = true;
      let txt = `${M.fmt(p[0], 3)}, ${M.fmt(p[1], 3)}${p[2] ? ', ' + M.fmt(p[2], 3) : ''}`;
      if (isMap) { const lat = C.geo.wmLat(C.geo.wmY(view.lat, view.z) + y - view.H / 2, view.z), lon = C.geo.wmLon(C.geo.wmX(view.lon, view.z) + x - view.W / 2, view.z); txt = (C.geo.isSet() ? txt + '  |  ' : '') + `${lat.toFixed(6)}, ${lon.toFixed(6)}`; }
      $('#coords').textContent = txt;
    });
    cv.addEventListener('pointerleave', () => { view.cursorScr = null; view.hover = null; view.dirty = true; });
    cv.addEventListener('pointerup', e => {
      const d = down; down = null; if (!d) return; const [x, y] = pos(e); const s = st();
      if (d.pan && d.moved) return;
      if (d.grip) { if (d.moved && C.cmd.waiting && C.cmd.waiting.kind === 'pt') C.cmd.click(view.cursor); return; } // tutamaç: tıkla-bırak ya da sürükle-bırak
      if (d.b === 2) { if (s.idle && !isMap && C.entMenu) { const ent = view.pick(x, y) || (C.sel.length === 1 ? C.sel[0] : null); if (ent) { C.entMenu(ent, e.clientX, e.clientY); return; } } C.cmd.enter(); return; }
      if (d.b !== 0) return;
      if (isMap && !C.geo.isSet()) { if (s.pt) C.warn('Önce koordinat sistemini tanımlayın (sağ üst panel).'); return; }
      if (view.win) {
        const list = view.windowSel(...view.win); view.win = null; view.dirty = true;
        if (s.sel) C.cmd.selectAdd(list); else if (s.idle) { const ids = new Set(C.sel.map(q => q.id)); C.sel = C.sel.concat(list.filter(q => !ids.has(q.id))); C.emit('selection'); }
        return;
      }
      if (d.moved && !s.pt) return;
      if (s.pt) { C.cmd.click(view.cursor); return; }
      const ent = view.pick(x, y);
      if (s.sel) { if (ent) C.cmd.selectAdd([ent]); return; }
      if (s.idle) {
        if (ent) { if (e.shiftKey) C.sel = C.sel.filter(q => q.id !== ent.id); else if (!C.sel.includes(ent)) C.sel = C.sel.concat([ent]); }
        else if (!e.shiftKey && !d.moved) C.sel = [];
        C.emit('selection');
      }
    });
    cv.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = pos(e); view.zoomAt(x, y, Math.pow(1.0018, -e.deltaY)); }, { passive: false });
    cv.addEventListener('dblclick', e => { if (e.button === 1 || e.ctrlKey) view.zoomExtents(); });
    cv.addEventListener('auxclick', e => { if (e.button === 1 && e.detail === 2) view.zoomExtents(); });
  }
  attach(plan, false); attach(map, true);
  (function attachLayout(view) {
    const cv = view.cv; let down = null, hotGrip = null;
    const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const av = () => { const L = view.cur(); return C.activeVp && L && L.vps.includes(C.activeVp) ? C.activeVp : null; };
    C.vpEnter = vp => { C.activeVp = vp || null; view.dirty = true; if (vp) { C.layoutSel = vp; renderProps(); C.log(`Pencerenin içindesiniz (1/${vp.scale})${vp.lock ? ' — görünüm KİLİTLİ' : ''}: çizimi burada düzenleyebilirsiniz. Çıkmak için pencere dışına çift tıklayın ya da Esc.`); } };
    C.vpToggleLock = vp => { vp = vp || C.layoutSel; if (!vp) { C.warn('Önce bir görünüm penceresi seçin'); return; } C.undoStack.push(C.snapshot()); vp.lock = !vp.lock; C.changed(); C.emit('layouts'); C.log(vp.lock ? '🔒 Pencere görünümü kilitlendi: içi kaydırılamaz, ölçeği değişmez.' : '🔓 Pencere görünümünün kilidi açıldı.'); };
    /* tutamaçlar: köşe/kenar ortası = boyutlandır, merkez = taşı, kilit simgesi */
    const gripsOf = vp => { const x0 = vp.x, y0 = vp.y, x1 = vp.x + vp.w, y1 = vp.y + vp.h, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2; return [['sw', x0, y0], ['se', x1, y0], ['ne', x1, y1], ['nw', x0, y1], ['s', xm, y0], ['e', x1, ym], ['n', xm, y1], ['w', x0, ym], ['c', xm, ym]]; };
    C.vpGrips = gripsOf;
    const lockPos = vp => [vp.x + 7, vp.y + vp.h - 7];
    const gripAt = (sx, sy) => { const vp = C.layoutSel, L = view.cur(); if (C.vpEdit || !vp || !L || !L.vps.includes(vp)) return null; for (const g of gripsOf(vp)) { const q = view.w2s([g[1], g[2]]); if (Math.abs(q[0] - sx) <= 7 && Math.abs(q[1] - sy) <= 7) return { vp, k: g[0] }; } const lq = view.w2s(lockPos(vp)); if (Math.abs(lq[0] - sx) <= 9 && Math.abs(lq[1] - sy) <= 9) return { vp, k: 'lock' }; return null; };
    const applyGrip = (g, p) => { // p: kağıt noktası
      const vp = g.vp, o = g.orig, k = 1000 / vp.scale; let x0 = o.x, y0 = o.y, x1 = o.x + o.w, y1 = o.y + o.h;
      const snap = v => Math.round(v * 2) / 2; const px = snap(p[0]), py = snap(p[1]);
      if (g.k === 'c') { const dx = px - (o.x + o.w / 2), dy = py - (o.y + o.h / 2); vp.x = o.x + dx; vp.y = o.y + dy; vp.cx = o.cx; vp.cy = o.cy; view.dirty = true; return; }
      if (g.k.includes('w')) x0 = Math.min(px, x1 - 5); if (g.k.includes('e')) x1 = Math.max(px, x0 + 5);
      if (g.k.includes('s')) y0 = Math.min(py, y1 - 5); if (g.k.includes('n')) y1 = Math.max(py, y0 + 5);
      vp.x = x0; vp.y = y0; vp.w = x1 - x0; vp.h = y1 - y0;
      if (o.clip) { const fx = vp.w / o.w, fy = vp.h / o.h; vp.clip = o.clip.map(q => [q[0] * fx, q[1] * fy]); }
      // model kağıt üzerinde yerinde kalsın (AutoCAD gibi)
      vp.cx = o.cx + ((x0 + x1) / 2 - (o.x + o.w / 2)) / k; vp.cy = o.cy + ((y0 + y1) / 2 - (o.y + o.h / 2)) / k; view.dirty = true;
    };
    const startGrip = g => { C.undoStack.push(C.snapshot()); g.orig = { x: g.vp.x, y: g.vp.y, w: g.vp.w, h: g.vp.h, cx: g.vp.cx, cy: g.vp.cy, clip: g.vp.clip ? g.vp.clip.map(q => q.slice()) : null }; return g; };
    const endGrip = () => { hotGrip = null; view.hotGrip = null; C.changed(); C.emit('layouts'); renderProps(); };
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      { const ae = document.activeElement; if (ae && ae !== document.body && ae.id !== 'cmd' && ae.blur) ae.blur(); }
      cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); const p = view.s2w(x, y);
      if (hotGrip && e.button === 0) { applyGrip(hotGrip, p); endGrip(); down = { x, y, x0: x, y0: y, b: -1, moved: false }; return; }
      if (e.button === 0 && !C.cmd.waiting) { const g = gripAt(x, y); if (g) { if (g.k === 'lock') { C.vpToggleLock(g.vp); down = { x, y, x0: x, y0: y, b: -1, moved: false }; return; } hotGrip = startGrip(g); view.hotGrip = g; down = { x, y, x0: x, y0: y, b: 0, moved: false, grip: true }; view.dirty = true; return; } }
      const a = av(), inA = a && view.vpAt(p) === a;
      const vpPan = e.ctrlKey ? view.vpAt(p) : (inA && !C.cmd.waiting && (e.button === 0 || e.button === 1)) ? a : null;
      down = { x, y, x0: x, y0: y, b: e.button, moved: false, vp: vpPan && !vpPan.lock ? vpPan : null, sel: e.button === 0 && !inA && !e.ctrlKey };
      if (vpPan && vpPan.lock && !view._lockWarned) { C.log('🔒 Bu pencere kilitli: sürükleme kağıdı kaydırır. Kilidi açmak için pencerenin sol üstündeki kilide ya da üstteki “🔒 Kilitli” düğmesine tıklayın.'); view._lockWarned = true; }
      if (down.vp) C.undoStack.push(C.snapshot());
    });
    cv.addEventListener('pointermove', e => {
      const [x, y] = pos(e); const p = view.s2w(x, y);
      if (hotGrip) applyGrip(hotGrip, p);
      if (down && !down.grip && down.b >= 0) {
        const dx = x - down.x, dy = y - down.y; down.x = x; down.y = y; if (Math.hypot(x - down.x0, y - down.y0) > 3) down.moved = true;
        if (down.vp) { const k = 1000 / down.vp.scale; down.vp.cx -= dx / (view.s * k); down.vp.cy += dy / (view.s * k); view.dirty = true; }
        else if (down.b === 1 || down.b === 0 && !C.cmd.waiting || down.b === 2) view.pan(dx, dy);
      } else if (down && down.grip && Math.hypot(x - down.x0, y - down.y0) > 3) down.moved = true;
      view.cursor = p; view.cursorScr = [x, y]; C.cmd.cursor = p; view.dirty = true;
      view.hoverGrip = !hotGrip && !down && !C.cmd.waiting ? gripAt(x, y) : null;
      cv.style.cursor = view.hoverGrip && view.hoverGrip.k === 'lock' ? 'pointer' : 'none';
      const a = av(), k = a && view.vpAt(p) === a ? 1000 / a.scale : 0;
      $('#coords').textContent = k ? `Model: ${M.fmt(a.cx + (p[0] - a.x - a.w / 2) / k, 3)}, ${M.fmt(a.cy + (p[1] - a.y - a.h / 2) / k, 3)} (1/${a.scale})` : `Kağıt: ${M.fmt(p[0], 1)}, ${M.fmt(p[1], 1)} mm`;
    });
    cv.addEventListener('pointerleave', () => { view.cursorScr = null; view.hoverGrip = null; view.dirty = true; });
    cv.addEventListener('pointerup', e => {
      const d = down; down = null; if (!d) return; const [x, y] = pos(e);
      if (d.grip) { if (d.moved) endGrip(); else C.log('Tutamaç seçildi: yeni yere tıklayın (Esc: iptal).'); return; }
      if (d.b < 0) return;
      if (d.vp) { if (!d.moved) { C.undoStack.pop(); if (d.b === 0 && !e.ctrlKey) { C.layoutSel = d.vp; renderProps(); } return; } renderProps(); C.changed(); return; }
      if (d.moved) return;
      if (d.b === 2) { const v2 = !C.cmd.running ? view.vpAt(view.s2w(x, y)) : null; if (v2) { C.layoutSel = v2; view.dirty = true; renderProps(); fillVpBar(); vpMenu(v2, e.clientX, e.clientY); return; } C.cmd.enter(); return; }
      if (d.b !== 0) return;
      const p = view.s2w(x, y);
      if (C.cmd.waiting && C.cmd.waiting.kind === 'pt') { C.cmd.click(p); return; }
      C.layoutSel = view.vpAt(p); view.dirty = true; renderProps(); fillVpBar();
    });
    cv.addEventListener('dblclick', e => { if (C.cmd.waiting) return; const [x, y] = pos(e); const v = view.vpAt(view.s2w(x, y)); if (v) C.vpEnter(v); else if (C.activeVp) { C.activeVp = null; view.dirty = true; C.log('Pencereden çıkıldı (kağıt alanı).'); } });
    let wAcc = 0;
    cv.addEventListener('wheel', e => {
      e.preventDefault(); const [x, y] = pos(e), p = view.s2w(x, y), a = av();
      if (a && view.vpAt(p) === a && !a.lock) { // pencere içinde: standart ölçekler arasında, imleç altındaki nokta sabit
        wAcc += e.deltaY; if (Math.abs(wAcc) < 60) return; const dir = Math.sign(wAcc); wAcc = 0;
        const list = C.STD_SCALES, cur0 = a.scale; let ns = dir < 0 ? [...list].reverse().find(v => v < cur0 - 1e-9) : list.find(v => v > cur0 + 1e-9); if (!ns) return;
        const k0 = 1000 / cur0, k1 = 1000 / ns, ox = a.x + a.w / 2, oy = a.y + a.h / 2, mx = a.cx + (p[0] - ox) / k0, my = a.cy + (p[1] - oy) / k0;
        C.undoStack.push(C.snapshot()); a.cx = mx - (p[0] - ox) / k1; a.cy = my - (p[1] - oy) / k1; a.scale = ns; view.dirty = true; C.changed(); renderProps(); fillVpBar(); C.log(`Pencere ölçeği 1/${ns}`); return;
      }
      view.zoomAt(x, y, Math.pow(1.0018, -e.deltaY));
    }, { passive: false });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || C.currentView !== 'layout' || C.cmd.running) return;
      if (hotGrip) { const o = hotGrip.orig; Object.assign(hotGrip.vp, { x: o.x, y: o.y, w: o.w, h: o.h, cx: o.cx, cy: o.cy }); if (o.clip) hotGrip.vp.clip = o.clip; C.undoStack.pop(); hotGrip = null; view.hotGrip = null; view.dirty = true; return; }
      if (C.activeVp) { if (C.vpEdit && (C.sel.length || C.gripState)) return; C.activeVp = null; view.dirty = true; } else if (C.layoutSel) { C.layoutSel = null; view.dirty = true; renderProps(); fillVpBar(); }
    });
    C.on('layouts', () => { if (C.activeVp && !(view.cur() && view.cur().vps.includes(C.activeVp))) C.activeVp = null; fillVpBar(); });
    /* düzen üst çubuğu: seçili pencere için ölçek + kilit */
    const bar = document.createElement('div'); bar.className = 'row'; bar.id = 'vpBar';
    bar.innerHTML = '<span class="hint" id="vpBarL">Pencere seçilmedi</span><select id="vpBarSc" title="Seçili pencerenin ölçeği"></select><button id="vpBarLock" title="Pencere görünümünü kilitle / aç">🔓</button><button id="vpBarIn" title="Pencerenin içine gir (kaydır)">İçine gir</button><button data-cmd="SAYFADUZENI" title="Kağıt boyutu, yön, antet">Sayfa düzeni</button>';
    const lc = $('#layoutCtl'); if (lc) lc.insertBefore(bar, lc.querySelector('.hint'));
    function fillVpBar() {
      const vp = C.layoutSel, L = view.cur(), ok = vp && L && L.vps.includes(vp);
      $('#vpBarL').textContent = ok ? (vp.label || 'Pencere') + ':' : 'Pencere seçilmedi';
      const sc = $('#vpBarSc'); sc.disabled = !ok; $('#vpBarLock').disabled = !ok; if ($('#vpBarDel')) $('#vpBarDel').disabled = !ok; if ($('#vpBarFr')) $('#vpBarFr').disabled = !ok; $('#vpBarIn').disabled = !ok;
      if (ok) { sc.innerHTML = [...new Set([...C.STD_SCALES, vp.scale])].sort((a, b) => a - b).map(v => `<option value="${v}" ${v === vp.scale ? 'selected' : ''}>1/${v}</option>`).join(''); $('#vpBarLock').textContent = vp.lock ? '🔒 Kilitli' : '🔓 Kilitle'; }
      else { sc.innerHTML = ''; $('#vpBarLock').textContent = '🔓'; }
    }
    C.fillVpBar = fillVpBar;
    /* pencere sağ tık menüsü */
    const vpMenu = (vp, cx, cy) => {
      document.querySelectorAll('.rdrop.vpm').forEach(x => x.remove());
      const m = document.createElement('div'); m.className = 'rdrop vpm';
      const items = [['🗑 Pencereyi sil', () => C.vpDelete([vp])], [vp.lock ? '🔓 Kilidi aç' : '🔒 Kilitle', () => C.vpToggleLock(vp)], ['↘ İçine gir (kaydır / ölçek)', () => C.vpEnter(vp)], ['▭ Çerçeve: görünürlük, renk, çizgi tipi, kalınlık…', () => C.vpFrameDialog(vp)], ['⌖ Modelde göstereceği yeri seç', () => { C.layoutSel = vp; C.runTool('VPYER'); }], ['☰ Özellikler', () => { C.layoutSel = vp; if (C.showProps) C.showProps(); renderProps(); }]];
      for (const [t, fn] of items) { const b = document.createElement('button'); b.textContent = t; b.onclick = () => { m.remove(); fn(); }; m.appendChild(b); }
      document.body.appendChild(m); m.style.left = Math.min(cx, innerWidth - 300) + 'px'; m.style.top = Math.min(cy, innerHeight - 230) + 'px';
      const off = ev => { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); } }; setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
    };
    /* çerçeve ayar penceresi (seçili pencere(ler) + yeni pencereler için varsayılan) */
    C.vpFrameDialog = vp => {
      const L = view.cur(); vp = vp || C.layoutSel; if (!vp) { C.warn('Önce düzende bir pencere seçin.'); return; }
      const f0 = vp.frame || (() => { const d = C.vpFrame(vp); return d ? Object.assign({ on: true }, d) : { on: false, layer: 'PENCERE', color: 256, lt: 'BYLAYER', lw: -1, lts: 1 }; })(), orig = JSON.stringify(vp.frame || null);
      const layOpts = Object.keys(C.doc.layers).map(n => `<option ${n === f0.layer ? 'selected' : ''}>${esc(n)}</option>`).join('') + '<option value="?">+ Yeni katman…</option>';
      const b = C.modal('Pencere çerçevesi', `
        <div class="fld"><label>Çerçeve görünür (ekranda ve çıktıda)</label><input type="checkbox" id="vfOn" ${f0.on !== false ? 'checked' : ''}></div>
        <div class="fld"><label>Katman</label><select id="vfLay">${layOpts}</select></div>
        <div class="fld"><label>Renk</label><select id="vfCol">${colorOpts(f0.color == null ? 256 : f0.color)}</select></div>
        <div class="fld"><label>Çizgi tipi</label><select id="vfLt">${ltOpts(f0.lt || 'BYLAYER')}</select></div>
        <div class="fld"><label>Çizgi kalınlığı</label><select id="vfLw">${lwOpts(f0.lw == null ? -1 : f0.lw)}</select></div>
        <div class="fld"><label>Çizgi tipi ölçeği (kağıtta)</label><input id="vfLts" type="text" inputmode="decimal" value="${f0.lts || 1}"></div>
        <div class="fld"><label>Bu düzendeki tüm pencerelere uygula</label><input type="checkbox" id="vfAll"></div>
        <div class="fld"><label>Yeni pencereler için varsayılan yap</label><input type="checkbox" id="vfDef"></div>
        <p class="hint">Değişiklikler anında görünür. Çerçeve kapalıyken pencere yalnız seçiliyken ince kesik çizgiyle gösterilir, yazdırılmaz.</p>
        <div class="bar" style="justify-content:flex-end"><button id="vfCancel">İptal</button><button id="vfOk" class="pri">Tamam</button></div>`);
      let colVal = f0.color == null ? 256 : f0.color;
      const read = () => ({ on: b.querySelector('#vfOn').checked, layer: b.querySelector('#vfLay').value, color: colVal, lt: b.querySelector('#vfLt').value, lw: parseInt(b.querySelector('#vfLw').value), lts: Math.max(0.01, parseFloat(String(b.querySelector('#vfLts').value).replace(',', '.')) || 1) });
      const live = () => { vp.frame = read(); view.dirty = true; };
      b.querySelectorAll('input,select').forEach(el => el.addEventListener('change', () => {
        if (el.id === 'vfLay' && el.value === '?') { const v = (prompt('Yeni katman adı', 'PENCERE') || '').trim(); if (v) { C.ensureLayer(v, 7, 'CONTINUOUS', 35); C.emit('layers'); el.insertAdjacentHTML('afterbegin', `<option>${esc(v)}</option>`); el.value = v; } else el.value = f0.layer || '0'; }
        if (el.id === 'vfCol') { askColor(el, n => { if (n != null) colVal = n; live(); }); return; }
        live();
      }));
      b.querySelector('#vfCancel').onclick = () => { vp.frame = JSON.parse(orig) || undefined; if (!vp.frame) delete vp.frame; view.dirty = true; C.closeModal(); };
      b.querySelector('#vfOk').onclick = () => {
        const fr = read(); vp.frame = JSON.parse(orig) || undefined; C.undoStack.push(C.snapshot()); vp.frame = fr;
        if (b.querySelector('#vfAll').checked && L) for (const v of L.vps) v.frame = Object.assign({}, fr);
        if (b.querySelector('#vfDef').checked) { C.doc.set.vpFrameDef = Object.assign({}, fr); try { localStorage.setItem('aritmacad.vpFrameDef', JSON.stringify(fr)); } catch (e) { } }
        C.changed(); C.emit('layouts'); renderProps(); C.closeModal(); C.log(`Pencere çerçevesi: ${fr.on ? 'görünür' : 'gizli'} · ${fr.layer} · ${fr.lt} · ${fr.lw < 0 ? 'katmandan' : (fr.lw / 100).toFixed(2) + ' mm'}`);
      };
    };
    C.vpFrameDefault = () => { let d = C.doc.set.vpFrameDef; if (!d) { try { d = JSON.parse(localStorage.getItem('aritmacad.vpFrameDef') || 'null'); } catch (e) { } } return Object.assign({ on: true, layer: 'PENCERE', color: 256, lt: 'BYLAYER', lw: -1, lts: 1 }, d || {}); };
    { const fb = document.createElement('button'); fb.id = 'vpBarFr'; fb.title = 'Pencere çerçevesi: görünürlük, renk, çizgi tipi, kalınlık'; fb.textContent = '▭ Çerçeve'; bar.insertBefore(fb, bar.querySelector('#vpBarDel')); fb.onclick = () => C.vpFrameDialog(C.layoutSel); }
    /* pencere (layout kutusu) silme: Delete tuşu, SIL/ERASE komutu, çubuktaki 🗑 düğmesi */
    C.vpDelete = vps => {
      const L = view.cur(); if (!L) return 0; vps = (vps || []).filter(v => L.vps.includes(v)); if (!vps.length) return 0;
      if (!C.cmd.running) { C.undoStack.push(C.snapshot()); C.redoStack = []; }
      for (const v of vps) L.vps.splice(L.vps.indexOf(v), 1);
      if (vps.includes(C.activeVp)) C.activeVp = null; C.layoutSel = null; view.dirty = true;
      C.changed(); C.emit('layouts'); renderProps(); fillVpBar(); C.log(`${vps.length} görünüm penceresi silindi (Ctrl+Z ile geri alınır). Modeldeki çizim silinmedi.`);
      return vps.length;
    };
    const eraseDef = C.cmds.ERASE;
    C.addCommand(['ERASE', 'E', 'SIL', 'DELETE'], eraseDef.help + ' · Düzen sekmesinde: görünüm pencerelerini (kutularını) siler', async (I) => {
      if (C.currentView === 'layout' && !C.activeVp) {
        if (C.layoutSel && view.cur() && view.cur().vps.includes(C.layoutSel)) { C.vpDelete([C.layoutSel]); return; }
        const picked = [];
        for (; ;) {
          const p = await I.pt(picked.length ? `${picked.length} pencere seçildi — başka pencere ya da Enter ile sil` : 'Silinecek görünüm penceresine (kutusuna) tıklayın'); if (!p || typeof p === 'string') break;
          const v = view.vpAt(p); if (v && !picked.includes(v)) { picked.push(v); C.layoutSel = v; view.dirty = true; } else if (!v) C.warn('Orada pencere yok');
        }
        if (picked.length) C.vpDelete(picked); return;
      }
      return eraseDef.fn(I);
    }, eraseDef.opts);
    const barDel = document.createElement('button'); barDel.id = 'vpBarDel'; barDel.title = 'Seçili pencereyi sil (Delete)'; barDel.textContent = '🗑 Sil';
    bar.insertBefore(barDel, bar.querySelector('[data-cmd=SAYFADUZENI]')); barDel.onclick = () => C.layoutSel && C.vpDelete([C.layoutSel]);
    $('#vpBarSc').onchange = e => { const vp = C.layoutSel; if (!vp) return; if (vp.lock) { C.warn('Pencere kilitli; önce kilidi açın.'); fillVpBar(); return; } C.undoStack.push(C.snapshot()); vp.scale = +e.target.value; C.changed(); C.emit('layouts'); renderProps(); };
    $('#vpBarLock').onclick = () => C.vpToggleLock(C.layoutSel);
    $('#vpBarIn').onclick = () => C.layoutSel && C.vpEnter(C.layoutSel);
    fillVpBar();
  })(lay);
  $('#cvPlan').addEventListener('dblclick', e => { if (C.cmd.running) return; const r = e.target.getBoundingClientRect(); const ent = plan.pick(e.clientX - r.left, e.clientY - r.top); if (ent && (ent.type === 'text' || ent.type === 'ctext') && C.editText) { C.editText(ent); return; } if (ent) { C.sel = [ent]; C.emit('selection'); openProps(); } });

  /* ---------------- komut satırı ---------------- */
  const cmdIn = $('#cmd'), logEl = $('#log'), hist = []; let hi = 0;
  C.on('prompt', t => { $('#prompt').textContent = t; });
  C.on('log', (m, cls) => {
    const d = document.createElement('div'); d.textContent = m; if (cls) d.className = cls; logEl.appendChild(d);
    while (logEl.childNodes.length > 500) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
  });
  const submit = v => { if (v.trim()) { hist.push(v); hi = hist.length; } cmdIn.value = ''; C.cmd.input(v); };
  cmdIn.addEventListener('keydown', e => {
    const v = cmdIn.value, w = C.cmd.waiting;
    if (e.key === 'Enter') { e.preventDefault(); submit(v); }
    else if (e.key === ' ') {
      const strWhole = w && w.kind === 'str' && w.opts.whole;
      if (!strWhole && !v.startsWith('"') && (w || v === '' || C.cmds[C.up(v)])) { e.preventDefault(); submit(v); }
    }
    else if (e.key === 'Escape') { cmdIn.value = ''; C.cmd.cancel(); }
    else if (e.key === 'ArrowUp' && hist.length) { hi = Math.max(0, hi - 1); cmdIn.value = hist[hi]; e.preventDefault(); }
    else if (e.key === 'ArrowDown' && hist.length) { hi = Math.min(hist.length, hi + 1); cmdIn.value = hist[hi] || ''; e.preventDefault(); }
  });
  C.onUnknownCommand = line => { if (/\s/.test(line.trim()) || /[çğıöşü]/i.test(line)) { C.chat.mode = 'cizim'; setMode('cizim'); C.chat.send(line); return true; } return false; };

  const inField = el => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.id !== 'cmd') || el.tagName === 'SELECT' || el.isContentEditable);
  document.addEventListener('keydown', e => {
    const k = e.key;
    if (k === 'F2') { e.preventDefault(); toggleMic(); return; }
    { const ae = document.activeElement, typing = ae && (ae.tagName === 'TEXTAREA' || ae.isContentEditable || (ae.tagName === 'INPUT' && ae.id !== 'cmd' && !/checkbox|radio|range|button/.test(ae.type)) || (ae.id === 'cmd' && ae.value));
      if ((k === 'Delete' || k === 'Del' || e.keyCode === 46 || (k === 'Backspace' && !typing)) && !typing && C.currentView === 'layout' && !C.activeVp && C.layoutSel && C.vpDelete && !C.cmd.running) { e.preventDefault(); if (ae && ae.blur && ae.id !== 'cmd') ae.blur(); C.vpDelete([C.layoutSel]); return; } }
    // Ctrl+S: bir yazı kutusundayken de programın kaydı çalışsın (tarayıcının "sayfayı kaydet" penceresi açılmasın); kutudaki değer önce işlensin diye odak bırakılır
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && k.toLowerCase() === 's') { e.preventDefault(); const ae = document.activeElement; if (ae && ae.id !== 'cmd' && inField(ae) && ae.blur) ae.blur(); C.cmd.run('KAYDET'); return; }
    if (inField(document.activeElement)) { if (k === 'Escape') document.activeElement.blur(); return; }
    if (e.ctrlKey || e.metaKey) {
      const kk = k.toLowerCase();
      if (kk === '1') { e.preventDefault(); toggleProps(); return; }
      if (kk === 's' && e.shiftKey) { e.preventDefault(); toggleSide(); return; }
      if (kk === 'z') { e.preventDefault(); C.cmd.run('UNDO'); } else if (kk === 'y') { e.preventDefault(); C.cmd.run('REDO'); }
      else if (kk === 's') { e.preventDefault(); C.cmd.run('KAYDET'); } else if (kk === 'o') { e.preventDefault(); C.cmd.run('AC'); } else if (kk === 'q') { e.preventDefault(); C.cmd.run('CIKIS'); }
      else if (kk === 'a' && document.activeElement !== cmdIn) { e.preventDefault(); C.sel = C.doc.ents.filter(q => C.layer(q.layer).on); C.emit('selection'); }
      return;
    }
    if (k === 'F3') { e.preventDefault(); toggle('osnap'); } else if (k === 'F7') { e.preventDefault(); toggle('grid'); } else if (k === 'F8') { e.preventDefault(); toggle('ortho'); } else if (k === 'F9') { e.preventDefault(); toggle('gridSnap'); }
    else if (k === 'Escape') { C.cmd.cancel(); cmdIn.value = ''; }
    else if ((k === 'Delete' || k === 'Backspace' && C.currentView === 'layout') && !C.cmd.running && C.currentView === 'layout' && !C.activeVp && C.layoutSel && C.vpDelete) { e.preventDefault(); C.vpDelete([C.layoutSel]); }
    else if (k === 'Delete' && !C.cmd.running && C.sel.length) { C.cmd.run('ERASE'); }
    else if (document.activeElement !== cmdIn && (k.length === 1 || k === 'Enter') ) { cmdIn.focus(); if (k === 'Enter' || k === ' ') { e.preventDefault(); submit(cmdIn.value); } }
  });

  /* ---------------- durum çubuğu ---------------- */
  function toggle(k) {
    if (k === 'grid') { plan.grid = !plan.grid; } else if (k === 'lwdisp') { C.doc.set.lwdisp = !C.doc.set.lwdisp; } else C.state[k] = !C.state[k];
    syncStatus(); redraw(); C.emit('state');
  }
  function syncStatus() {
    const v = { osnap: C.state.osnap, ortho: C.state.ortho, gridSnap: C.state.gridSnap, grid: plan.grid, lwdisp: C.doc.set.lwdisp };
    $$('#status [data-tg]').forEach(b => b.classList.toggle('on', !!v[b.dataset.tg]));
    $('#scaleInfo').textContent = `Ölçek 1/${C.doc.set.anno}`;
    $('#geoState').textContent = C.geo.isSet() ? '🌐 ' + C.geo.describe() : '';
    $('#docname').textContent = C.doc.set.name;
  }
  $$('#status [data-tg]').forEach(b => b.onclick = () => toggle(b.dataset.tg));
  /* yakalama türleri paneli (AutoCAD OSNAP ayarları gibi) */
  const SNAPS = [['end', 'Uç nokta', '□'], ['mid', 'Orta nokta', '△'], ['cen', 'Merkez', '○'], ['qua', 'Çeyrek', '◇'], ['int', 'Kesişim', '✕'], ['per', 'Dik', '⊥'], ['nea', 'En yakın (çizgi üzerinde)', '⧗'], ['fcen', 'Yüz / şekil merkezi', '⊕'], ['ins', 'Ekleme noktası', '⊞'], ['grid', 'Izgara noktası', '·']];
  const SNAPS3 = [['face', 'Yüzeye yapış (3B)', '▰'], ['axis', 'Eksen hizalama kırmızı/yeşil/mavi (3B)', '⟂']];
  function openSnapPop(anchor) {
    let p = $('#osnapPop'); if (p) { p.remove(); return; }
    p = document.createElement('div'); p.id = 'osnapPop';
    const K = C.state.snapKinds, row = ([k, l, ic]) => `<label><input type="checkbox" data-k="${k}" ${K[k] !== false && K[k] ? 'checked' : ''}><i>${ic}</i>${l}</label>`;
    p.innerHTML = `<h4>Nesne yakalama</h4><label><input type="checkbox" id="osOn" ${C.state.osnap ? 'checked' : ''}><b>Yakalama açık (F3)</b></label><div class="sub">Yakalanacak noktalar</div>${SNAPS.map(row).join('')}<div class="sub">3B çizim yardımı</div>${SNAPS3.map(row).join('')}<div class="row"><button data-all="1">Tümü</button><button data-all="0">Hiçbiri</button><button data-close>Kapat</button></div>`;
    document.body.appendChild(p);
    const r = anchor.getBoundingClientRect(); p.style.left = Math.max(4, Math.min(innerWidth - p.offsetWidth - 4, r.left)) + 'px'; p.style.top = Math.max(4, r.top - p.offsetHeight - 6 < 0 ? r.bottom + 6 : r.top - p.offsetHeight - 6) + 'px';
    const save = () => { try { localStorage.setItem('aritmacad.snap', JSON.stringify(C.state.snapKinds)); } catch (e) { } if (!v3.failed) v3.dirty = true; redraw(); };
    p.querySelectorAll('[data-k]').forEach(cb => cb.onchange = () => { C.state.snapKinds[cb.dataset.k] = cb.checked; save(); });
    p.querySelector('#osOn').onchange = e => { C.state.osnap = e.target.checked; syncStatus(); save(); };
    p.querySelectorAll('[data-all]').forEach(b => b.onclick = () => { const v = b.dataset.all === '1'; SNAPS.forEach(([k]) => { if (k !== 'grid') C.state.snapKinds[k] = v; }); p.querySelectorAll('[data-k]').forEach(cb => { if (SNAPS.some(([k]) => k === cb.dataset.k && k !== 'grid')) cb.checked = v; }); save(); });
    p.querySelector('[data-close]').onclick = () => p.remove();
    setTimeout(() => { const off = e => { if (!p.contains(e.target) && e.target !== anchor) { p.remove(); document.removeEventListener('pointerdown', off, true); } }; document.addEventListener('pointerdown', off, true); }, 0);
  }
  C.openSnapPop = openSnapPop;
  C.addCommand(['DSETTINGS', 'DS', 'OSAYAR', 'YAKALAMAAYAR'], 'Yakalama türlerini seçme paneli (uç, orta, merkez, kesişim, dik, en yakın, 3B yüzey/eksen)', async () => openSnapPop($('#osnapMenu')), { noUndo: true });
  $('#osnapMenu').onclick = e => openSnapPop(e.currentTarget);
  $('#status [data-tg=osnap]').addEventListener('contextmenu', e => { e.preventDefault(); openSnapPop(e.currentTarget); });
  C.on('changeIdle', syncStatus);

  /* ---------------- araç çubuğu ---------------- */
  const ICON = {
    join: '<path d="M3 16h7M14 16h7" stroke="currentColor" stroke-width="1.8"/><path d="M10 13l2 3-2 3M14 13l-2 3 2 3" fill="none" stroke="currentColor"/>',
    align: '<rect x="3" y="13" width="7" height="5" fill="none" stroke="currentColor" stroke-dasharray="2 2"/><rect x="13" y="4" width="5" height="7" transform="rotate(20 15 8)" fill="none" stroke="currentColor"/><path d="M8 12l6-5" stroke="currentColor"/>',
    hatch: '<rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor"/><path d="M4 12l8-8M4 20L20 4M12 20l8-8" stroke="currentColor"/>',
    detay: '<circle cx="9" cy="10" r="6" fill="none" stroke="currentColor" stroke-dasharray="2 2"/><path d="M13 14l6 6" stroke="currentColor"/><path d="M14 20h6" stroke="currentColor"/>',
    fillet: '<path d="M4 20V12a8 8 0 0 1 8-8h8" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    pah: '<path d="M4 20V9l5-5h11" fill="none" stroke="currentColor"/><path d="M4 9l5-5" stroke="currentColor" stroke-width="2.2"/>',
    sweep: '<path d="M3 18c4 0 5-12 9-12s5 12 9 12" fill="none" stroke="currentColor" stroke-dasharray="2 2"/><rect x="2" y="15" width="4" height="5" fill="none" stroke="currentColor"/>',
    mtext: '<rect x="4" y="5" width="16" height="14" rx="1" fill="none" stroke="currentColor" stroke-dasharray="2 2"/><path d="M7 9h10M7 12h10M7 15h6" stroke="currentColor"/>',
    ctext: '<path d="M4 17 Q12 3 20 17" fill="none" stroke="currentColor" stroke-dasharray="2 2"/><text x="7" y="13" font-size="7" fill="currentColor" stroke="none" transform="rotate(-25 9 12)">AB</text>',
    style: '<text x="4" y="17" font-size="13" font-weight="bold" fill="currentColor" stroke="none">A</text><text x="13" y="17" font-size="11" font-style="italic" fill="currentColor" stroke="none">a</text>',
    line: '<path d="M4 20L20 4"/><circle cx="4" cy="20" r="1.5"/><circle cx="20" cy="4" r="1.5"/>', pline: '<path d="M3 18L9 8l6 6 6-9"/>', rec: '<rect x="4" y="6" width="16" height="12"/>', circle: '<circle cx="12" cy="12" r="8"/>', ellipse: '<ellipse cx="12" cy="12" rx="9" ry="5.5"/>', dimd: '<circle cx="12" cy="12" r="8"/><path d="M6 18L18 6"/>', koord: '<circle cx="6" cy="18" r="2"/><path d="M7.5 16.5L13 9h8M13 6h8M13 12h8"/>', scale: '<rect x="3" y="13" width="8" height="8"/><rect x="3" y="3" width="18" height="18" stroke-dasharray="2 2"/>',
    arc: '<path d="M4 18A9 9 0 0 1 20 18"/>', text: '<path d="M6 6h12M12 6v13"/>', wall: '<rect x="3" y="9" width="18" height="6"/><path d="M6 15l3-6M10 15l3-6M14 15l3-6"/>', tank: '<rect x="3" y="5" width="18" height="14"/><rect x="6" y="8" width="12" height="8"/>',
    ctank: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/>', pipe: '<path d="M3 9h18M3 15h18"/><path d="M3 12h3M9 12h2M14 12h3M20 12h1" stroke-dasharray="0"/>', pump: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v-2"/>',
    valve: '<path d="M4 7l8 5-8 5zM20 7l-8 5 8 5z"/><path d="M12 12V5M9 5h6"/>', kot: '<path d="M8 14l4-6 4 6z"/><path d="M8 8h13"/>', dim: '<path d="M4 12h16M4 8v8M20 8v8"/><path d="M4 12l3-2v4zM20 12l-3-2v4z"/>', dimal: '<path d="M5 17L17 5M3 15l4 4M15 3l4 4"/>',
    dimr: '<circle cx="12" cy="12" r="8"/><path d="M12 12l6-6"/>', move: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M21 12l-3-3M21 12l-3 3"/>', copy: '<rect x="4" y="4" width="11" height="11"/><rect x="9" y="9" width="11" height="11"/>',
    rot: '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M17 3v3h3"/>', mirror: '<path d="M12 3v18" stroke-dasharray="2 2"/><path d="M9 7L4 17h5zM15 7l5 10h-5z"/>', offset: '<path d="M4 8h16M4 16h16"/><path d="M12 9v6"/>',
    trim: '<path d="M4 12h16"/><path d="M14 4v16" stroke-dasharray="3 2"/><path d="M15 9l4 6M19 9l-4 6"/>', ext: '<path d="M4 12h10" /><path d="M14 12h5" stroke-dasharray="2 2"/><path d="M20 5v14"/>', fillet: '<path d="M4 20V10a6 6 0 0 1 6-6h10"/>',
    erase: '<path d="M5 5l14 14M19 5L5 19"/>', explode: '<path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/>', sheet: '<rect x="3" y="4" width="18" height="16"/><rect x="12" y="14" width="8" height="5"/>',
    station: '<path d="M3 20h18M5 20V9l7-5 7 5v11"/><circle cx="12" cy="14" r="3"/>', box: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z M4 8l8 4 8-4 M12 12v9"/>', array: '<rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><rect x="15" y="15" width="6" height="6"/>',
    dist: '<path d="M4 20L20 4"/><path d="M4 16v4h4M20 8V4h-4"/>', area: '<path d="M4 18l4-12 12 4-6 10z"/>', layer: '<path d="M12 3l9 5-9 5-9-5z M3 13l9 5 9-5"/>', match: '<path d="M4 20l7-7M14 4l6 6-8 8-6-6z"/>',
  };
  C.ICON = ICON;
  const TOOLS = [
    ['Çiz', [['Çizgi', 'LINE', 'line'], ['Çoklu', 'PLINE', 'pline'], ['Dikdört.', 'REC', 'rec'], ['Daire', 'CIRCLE', 'circle'], ['Yay', 'ARC', 'arc'], ['Elips', 'ELLIPSE', 'ellipse'], ['Yazı', 'TEXT', 'text'], ['Paragraf', 'MTEXT', 'mtext'], ['Eğri yazı', 'EGRIYAZI', 'ctext'], ['Y. stili', 'STYLE', 'style'], ['Tarama', 'TARAMA', 'hatch']]],
    ['Değiştir', [['Taşı', 'MOVE', 'move'], ['Kopyala', 'COPY', 'copy'], ['Döndür', 'ROTATE', 'rot'], ['Ayna', 'MIRROR', 'mirror'], ['Ölçekle', 'SCALE', 'scale'], ['Ötele', 'OFFSET', 'offset'], ['Buda', 'TRIM', 'trim'], ['Uzat', 'EXTEND', 'ext'], ['Yuvarla', 'FILLET', 'fillet'], ['Pah', 'CHAMFER', 'pah'], ['Dizi', 'ARRAY', 'array'], ['Bağla', 'JOIN', 'join'], ['Hizala', 'ALIGN', 'align'], ['Patlat', 'EXPLODE', 'explode'], ['Özel.Kop.', 'MATCHPROP', 'match'], ['Sil', 'ERASE', 'erase']]],
    ['Ölçü', [['Oto.Ölçü', 'QDIM', 'dim'], ['Doğrusal', 'DIMLINEAR', 'dim'], ['Hizalı', 'DIMALIGNED', 'dimal'], ['Yarıçap', 'DIMRADIUS', 'dimr'], ['Çap', 'DIMDIAMETER', 'dimd'], ['Kot', 'KOT', 'kot'], ['Koordinat', 'DIMORDINATE', 'koord'], ['Aks', 'AKS', 'dim'], ['Mesafe', 'DIST', 'dist'], ['Alan', 'AREA', 'area']]],
    ['Arıtma', [['Pompa İst.', 'POMPAISTASYONU', 'station'], ['Duvar', 'DUVAR', 'wall'], ['Havuz', 'HAVUZ', 'tank'], ['D.Havuz', 'DHAVUZ', 'ctank'], ['Boru', 'BORU', 'pipe'], ['Pompa', 'POMPA', 'pump'], ['Hatta vana', 'VB', 'valve'], ['Kütüphane', 'KUTUPHANE', 'valve'], ['Kazı', 'KAZI', 'tank'], ['Kazı kes.', 'KAZIKESIT', 'trim'], ['Kübaj', 'KAZIHACIM', 'area'], ['BOM', 'BOM HEPSI', 'area']]],
    ['İnşaat', [['Perde', 'PERDE', 'wall'], ['Perde parçası', 'PERDEPARCA', 'wall'], ['Duvar', 'IDUVAR', 'wall'], ['Kolon', 'KOLON', 'rec'], ['Kiriş', 'KIRIS', 'line'], ['Temel', 'TEMEL', 'box'], ['Döşeme', 'IDOSEME', 'area'], ['Pencere', 'PENCERE', 'rec'], ['Kapı', 'KAPI', 'arc'], ['Metraj', 'INSMETRAJ', 'area']]],
    ['3B / Kesit', [['Kutu', 'KUTU', 'box'], ['Süpür', 'SWEEP', 'sweep'], ['Kesit al', 'KESITAL', 'trim'], ['Kot planı', 'KOTPLANI', 'area'], ['Görünüş', 'GORUNUS', 'box']]],
    ['Pafta', [['Düzen', 'DUZEN YENI', 'sheet'], ['Paftala', 'PAFTALA', 'array'], ['Detay', 'DETAY', 'detay'], ['Yazdır', 'YAZDIR', 'sheet']]],
    ['Hesap', [['ATV-A131', 'ATV131', 'area'], ['Blower', 'BLOWER', 'circle'], ['Pompa H.', 'POMPAHESAP', 'pump'], ['Mikser', 'MIKSER', 'rot']]],
  ];
  const toolsEl = $('#tools');
  C.runTool = function (cmd) { if (typeof cmd === 'function') return cmd(); if (C.cmd.running) { C.cmd.cancel(); setTimeout(() => C.cmd.run(cmd), 0); } else C.cmd.run(cmd); cmdIn.focus(); };
  for (const [g, items] of TOOLS) {
    const h = document.createElement('div'); h.className = 'grp'; h.textContent = g; toolsEl.appendChild(h);
    for (const [lbl, cmd, ic] of items) { const b = document.createElement('button'); b.title = `${lbl} (${cmd})`; b.innerHTML = `<svg viewBox="0 0 24 24">${ICON[ic] || ''}</svg>${lbl}`; b.onclick = () => C.runTool(cmd); toolsEl.appendChild(b); }
  }
  const plugGrp = document.createElement('div'); plugGrp.className = 'grp hidden'; plugGrp.textContent = 'Eklenti'; toolsEl.appendChild(plugGrp);
  document.addEventListener('click', e => { const b = e.target.closest('[data-cmd]'); if (b) { C.runTool(b.dataset.cmd); b.closest('.drop') && b.blur(); } });

  /* ---------------- geçerli özellikler ---------------- */
  const COLORS = [[256, 'Katmandan'], [1, 'Kırmızı'], [2, 'Sarı'], [3, 'Yeşil'], [4, 'Camgöbeği'], [5, 'Mavi'], [6, 'Mor'], [7, 'Beyaz/Siyah'], [8, 'Gri'], [9, 'Açık gri'], [30, 'Turuncu'], [32, 'Kahve'], [140, 'Gök mavisi'], [0, 'Bloktan']];
  const colorOpts = (val, withLayer = true) => { let o = COLORS.filter(c => withLayer || (c[0] !== 256 && c[0] !== 0)).map(([n, t]) => `<option value="${n}" ${n === val ? 'selected' : ''}>${n === 256 || n === 0 ? t : n + ' ' + t}</option>`).join(''); if (!COLORS.some(c => c[0] === val)) o += `<option value="${val}" selected>${val}</option>`; return o + '<option value="?">Diğer…</option>'; };
  const ltOpts = (val, withLayer = true) => (withLayer ? `<option value="BYLAYER" ${val === 'BYLAYER' ? 'selected' : ''}>Katmandan</option>` : '') + Object.keys(C.LT).map(k => `<option ${k === val ? 'selected' : ''}>${k}</option>`).join('');
  const lwOpts = (val, withLayer = true) => (withLayer ? `<option value="-1" ${val === -1 ? 'selected' : ''}>Katmandan</option>` : '') + C.LW_VALUES.map(w => `<option value="${w}" ${w === val ? 'selected' : ''}>${(w / 100).toFixed(2)} mm</option>`).join('');
  const askColor = (sel, cb) => { const v = sel.value; if (v === '?') C.pickColor(null, n => cb(n)); else cb(parseInt(v)); };
  /* AutoCAD renk dizini (ACI) paleti */
  C.pickColor = function (curVal, cb) {
    const sw = i => `<button data-c="${i}" title="${i}" style="background:${C.aciCss(i)}"></button>`;
    let grid = ''; for (let row = 0; row < 10; row++) for (let col = 0; col < 24; col++) { const i = 10 + col * 10 + (row % 2 === 0 ? row : row); grid += sw(10 + col * 10 + row); }
    const body = modal('Renk seç (AutoCAD renk dizini)', `<div class="aci">${grid}</div>
      <div style="display:flex;gap:18px;flex-wrap:wrap"><div><div class="hint">Standart renkler</div><div class="aci9">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(sw).join('')}</div></div>
      <div><div class="hint">Gri tonlar</div><div class="acig">${[250, 251, 252, 253, 254, 255].map(sw).join('')}</div></div></div>
      <div class="bar"><button data-c="256">Katmandan (ByLayer)</button><button data-c="0">Bloktan (ByBlock)</button><span id="acInfo" class="hint"></span></div>
      <div class="fld"><label>Renk numarası</label><input id="acNum" type="number" min="0" max="256" value="${curVal != null ? curVal : 7}"><button class="pri" id="acOk">Tamam</button></div>`);
    body.querySelectorAll('[data-c]').forEach(b => { b.onmouseenter = () => { const n = +b.dataset.c; const rgb = C.aciRgb(n); $('#acInfo').textContent = n > 0 && n < 256 ? `Renk ${n}  RGB ${rgb.join(',')}` : ''; }; b.onclick = () => { closeModal(); cb(+b.dataset.c); }; });
    body.querySelector('#acOk').onclick = () => { const n = parseInt($('#acNum').value); closeModal(); cb(n >= 0 && n <= 256 ? n : null); };
  };
  function fillCurrent() {
    const d = C.doc.cur;
    $('#curLayer').innerHTML = Object.keys(C.doc.layers).map(n => `<option ${n === d.layer ? 'selected' : ''}>${esc(n)}</option>`).join('');
    $('#curColor').innerHTML = colorOpts(d.color); $('#curLt').innerHTML = ltOpts(d.lt); $('#curLw').innerHTML = lwOpts(d.lw);
  }
  $('#curLayer').onchange = e => { C.doc.cur.layer = e.target.value; renderLayers(); };
  $('#curColor').onchange = e => askColor(e.target, n => { if (n != null) C.doc.cur.color = n; fillCurrent(); });
  $('#curLt').onchange = e => { C.doc.cur.lt = e.target.value; };
  $('#curLw').onchange = e => { C.doc.cur.lw = parseInt(e.target.value); };

  /* ---------------- katman paneli ---------------- */
  function renderLayers() {
    const tb = $('#layerTable tbody'); tb.innerHTML = '';
    const counts = {}; C.doc.ents.forEach(e => counts[e.layer] = (counts[e.layer] || 0) + 1);
    for (const l of Object.values(C.doc.layers).sort((a, b) => a.name.localeCompare(b.name))) {
      const tr = document.createElement('tr'); if (l.name === C.doc.cur.layer) tr.className = 'cur'; tr.dataset.lay = l.name;
      tr.innerHTML = `<td><button class="tg" data-a="on">${l.on ? '👁' : '◌'}</button></td><td class="nm" title="Geçerli yap — ${counts[l.name] || 0} nesne">${esc(l.name)}</td>
        <td><button class="swbtn" data-a="color" title="Renk seç"><span class="sw" style="background:${C.aciCss(l.color)}"></span>${l.color}</button></td>
        <td><select data-a="lt">${ltOpts(l.lt, false)}</select></td><td><select data-a="lw">${lwOpts(l.lw, false)}</select></td>
        <td><button class="tg" data-a="lock">${l.lock ? '🔒' : '🔓'}</button></td><td><button class="tg" data-a="del" title="Sil">✕</button></td>`;
      tr.querySelector('.nm').onclick = () => { C.doc.cur.layer = l.name; C.emit('layers'); };
      tr.querySelector('[data-a=on]').onclick = () => { l.on = !l.on; C.changed(); C.emit('layers'); };
      tr.querySelector('[data-a=lock]').onclick = () => { l.lock = !l.lock; C.emit('layers'); };
      tr.querySelector('[data-a=del]').onclick = () => C.cmd.run(`LAYER SIL "${l.name}"`);
      tr.querySelector('[data-a=color]').onclick = () => C.pickColor(l.color, n => { if (n != null && n > 0 && n < 256) { l.color = n; C.doc.ents.forEach(q => delete q._c); C.changed(); } C.emit('layers'); });
      tr.querySelector('[data-a=lt]').onchange = e => { l.lt = e.target.value; C.changed(); C.emit('layers'); };
      tr.querySelector('[data-a=lw]').onchange = e => { l.lw = parseInt(e.target.value); C.changed(); C.emit('layers'); };
      tb.appendChild(tr);
    }
    markSelLayers(false);
  }
  /* seçili nesnelerin katmanları katman listesinde vurgulansın (ilk satıra kaydırılır) */
  function markSelLayers(scroll) {
    const tb = $('#layerTable tbody'); if (!tb) return; const set = new Set((C.sel || []).slice(0, 2000).map(e => e.layer || '0')); let first = null;
    for (const tr of tb.children) { const on = set.has(tr.dataset.lay); tr.classList.toggle('selLay', on); if (on && !first) first = tr; }
    if (scroll && first) { try { first.scrollIntoView({ block: 'nearest' }); } catch (er) { } }
  }
  C.on('selection', () => markSelLayers(true));
  $('#btnNewLayer').onclick = () => { const n = prompt('Yeni katman adı:'); if (n) C.cmd.run(`LAYER YENI "${n.replace(/"/g, '')}" 7 CONTINUOUS 0.25`); };
  $('#btnStdLayers').onclick = () => { Object.keys(C.STD_LAYERS).forEach(C.std); C.emit('layers'); C.log('Standart arıtma katmanları eklendi.'); };

  /* ---------------- özellikler paneli ---------------- */
  const FIELDS = {
    text: [['s', 'Metin', 's'], ['h', 'Yükseklik'], ['hp', 'Kağıtta yükseklik (mm, açıklama)'], ['rot', 'Açı (°)'], ['al', 'Taşıma noktası (L C R M TL TC TR ML MC MR BL BC BR)', 's'], ['st', 'Stil', 's'], ['wf', 'Genişlik çarpanı (boş = stil)'], ['obl', 'Eğiklik ° (boş = stil)'], ['mw', 'MTEXT kutu genişliği'], ['ls', 'Satır aralığı çarpanı']],
    aks: [['xsS', 'X aks aralıkları (m) ör. 5 5 4 ya da 3*5', 's'], ['ysS', 'Y aks aralıkları (m)', 's'], ['rot', 'Dönme açısı (°)'], ['bp', 'Balon yarıçapı (kağıtta mm)'], ['extp', 'Aks uzantısı (kağıtta mm)']],
    kesitisaret: [['name', 'Ad (harf)', 's'], ['sym', 'Sembol (ucgendaire/yarimok/okdaire/bayrak/ok/daire/ucgen)', 's'], ['mode', 'Çizgi (tam/uc)', 's'], ['th', 'Yazı yüksekliği (kağıtta mm)']],
    baslik: [['s', 'Başlık', 's'], ['hp', 'Yazı yüksekliği (kağıtta mm)'], ['on', 'Ölçek ön yazısı (Ölçek)', 's'], ['st', 'Stil', 's']],
    perde: [['tb', 'Alt kalınlık (m)'], ['tt', 'Üst kalınlık (m)'], ['egim', 'Eğimli yüz (R / L / B)', 's'], ['hiza', 'Hiza (O / L / R)', 's'], ['ofs', 'Çizgiden öteleme (m, + içeri)'], ['h', 'Yükseklik (m)'], ['z0', 'Alt kot (m)'], ['beton', 'Beton sınıfı', 's'], ['malz', 'Malzeme (beton / tugla / gazbeton / briket)', 's']],
    kolon: [['b', 'b (m)'], ['d', 'd (m)'], ['D', 'Çap (m, dairesel)'], ['h', 'Yükseklik (m)'], ['z0', 'Alt kot (m)'], ['rot', 'Açı (°)'], ['beton', 'Beton sınıfı', 's']],
    kiris: [['bw', 'Genişlik (m)'], ['hb', 'Yükseklik (m)'], ['zt', 'Üst kot (m)'], ['beton', 'Beton sınıfı', 's']],
    plak: [['t', 'Kalınlık (m)'], ['zt', 'Üst kot (m)'], ['beton', 'Beton sınıfı', 's']],
    izgara: [['ad', 'Ad', 's'], ['a', 'Açı (°)'], ['H', 'Toplam yükseklik (m)'], ['b', 'Net genişlik (m)'], ['W', 'Çerçeve genişliği (m)'], ['d', 'Çerçeve derinliği (m)'], ['bt', 'Çubuk kalınlığı (mm)'], ['bg', 'Çubuk açıklığı (mm)'], ['Lr', 'Izgara boyu (m)'], ['Lh', 'Tahrik kafası boyu (m)'], ['hd', 'Deşarj yüksekliği (m)'], ['ms', 'Motor tarafı (L / R)', 's'], ['z', 'Taban kotu (m)'], ['rot', 'Akış yönü (°)']],
    tretuvar: [['w', 'Genişlik (m)'], ['egim', 'Eğim (%)'], ['h', 'Üst kot — zeminden (m)'], ['zg', 'Zemin kotu (m)'], ['kap', 'Kaplama (karo / parke / tas / granit / beton)', 's'], ['tk', 'Kaplama (cm)'], ['th', 'Harç (cm)'], ['tb', 'Beton (cm)'], ['ts', 'Stabilize (cm)'], ['bw', 'Bordür eni (cm)'], ['bh', 'Bordür yüksekliği (cm)'], ['derz', 'Derz aralığı (m)']],
    cati: [['kind', 'Tür (kirma / besik / tek / mansart)', 's'], ['deg', 'Eğim (°)'], ['ov', 'Saçak (m)'], ['knee', 'Ayak duvarı (m)'], ['xps', 'XPS (cm)'], ['ortu', 'Örtü (marsilya / alaturka / shingle / trapez / sandvic …)', 's'], ['su', 'Su yalıtımı (membran / bitum / yok)', 's'], ['alt', 'Kaplama altı (osb / tahta)', 's'], ['isk', 'Ahşap iskelet (E / H)', 's'], ['msp', 'Mertek aralığı (m)'], ['asp', 'Aşık aralığı (m)'], ['dsp', 'Dikme aralığı (m)'], ['yon', 'Tek eğim yönü (on / arka / sol / sag)', 's']],
    yalitim: [['mat', 'Isı yalıtımı malzemesi', 's'], ['t', 'Isı yalıtımı kalınlığı (cm)'], ['su', 'Su yalıtımı', 's'], ['tip', 'Tip', 's'], ['w', 'Bant genişliği (cm)'], ['z', 'Kot (m)'], ['h', 'Yükseklik (m)']],
    kaplama: [['ad', 'Mahal adı (zemin)', 's'], ['z0', 'Taban / alt kot (m)'], ['h', 'Yükseklik (duvar, m)'], ['zc', 'Döşeme altı (tavan, m)'], ['kap', 'Kaplama / bitiş kodu', 's'], ['siva', 'Sıva kodu', 's'], ['kt', 'Kaplama kalınlığı (cm)'], ['sap', 'Şap (cm)'], ['zbt', 'Zemin betonu (cm)'], ['kh', 'Alt kaplama yüksekliği (m)'], ['ub', 'Üst kısım bitişi', 's'], ['bit', 'Tavan bitişi', 's'], ['drop', 'Asma tavan sarkma (cm)']],
    dolgu: [['za', 'Alt kot (m)'], ['zb', 'Üst kot (m)'], ['malz', 'Malzeme (stab/kum/toprak)', 's']],
    temel: [['bx', 'bx (m)'], ['by', 'by (m)'], ['t', 'Yükseklik (m)'], ['zt', 'Üst kot (m)'], ['rot', 'Açı (°)'], ['beton', 'Beton sınıfı', 's']],
    acik: [['w', 'Genişlik (m)'], ['hh', 'Yükseklik (m)'], ['par', 'Parapet (m, pencere)'], ['s', 'Konum (segment başından, m)'], ['kanat', 'Kanat sayısı (kapı)'], ['yon', 'Açılış yönü (L / R)', 's'], ['el', 'Menteşe (L / S)', 's']],
    kduzlem: [['h', 'Yatay düzlem kotu (m)'], ['on', 'Etkin (true / false)', 's']],
    kazi: [['zb', 'Kazı taban kotu (m)'], ['n', 'Kazı şevi (yatay / 1 düşey)'], ['w', 'Çalışma payı (m)'], ['zt', 'Tesviye kotu (boş = mevcut arazi)', 's'], ['nf', 'Dolgu şevi (yatay / 1 düşey)'], ['durum', 'Durum: kazi / dolgu', 's']],
    arazi: [['seff', 'Yüzey saydamlığı (%)'], ['dep', 'Zemin bloğu derinliği (m)'], ['bseff', 'Zemin bloğu saydamlığı (%)'], ['ci', 'Eş yükselti aralığı (m)'], ['cmaj', 'Kalın eğri her … eğride'], ['ref', 'Kot 0 karşılığı (m, deniz seviyesinden)']],
    hatch: [['pat', 'Desen (ANSI31, SOLID, AR-CONC…)', 's'], ['sc', 'Desen ölçeği', 's'], ['ang', 'Açı (°)', 's']],
    ctext: [['s', 'Metin', 's'], ['h', 'Yükseklik'], ['hp', 'Kağıtta yükseklik (mm, açıklama)'], ['hp', 'Kağıtta yükseklik (mm, açıklama)'], ['al', 'Konum (L C R F)', 's'], ['off', 'Eğriden mesafe'], ['cs', 'Harf aralığı'], ['st', 'Stil', 's']],
    kati: [['h', 'Yükseklik / kalınlık (m)'], ['o.2', 'Taban Z (m)'], ['prof.r', 'Yarıçap (dairesel)']],
    wall: [['t', 'Kalınlık (m)'], ['h', 'Yükseklik (m)'], ['z', 'Taban kotu']], slab: [['t', 'Kalınlık'], ['z', 'Alt kot']],
    tank: [['label', 'Ad', 's'], ['L', 'İç en (m)'], ['W', 'İç boy (m)'], ['H', 'İç derinlik'], ['tw', 'Duvar kalınlığı'], ['tb', 'Taban kalınlığı'], ['zt', 'Üst kot'], ['rot', 'Dönüş (°)']],
    ctank: [['label', 'Ad', 's'], ['D', 'İç çap'], ['H', 'İç derinlik'], ['tw', 'Duvar kalınlığı'], ['tb', 'Taban kalınlığı'], ['zt', 'Üst kot']],
    pipe: [['label', 'Etiket', 's'], ['dn', 'DN (mm)'], ['mat', 'Malzeme', 's']], pump: [['tag', 'Etiket', 's'], ['kind', 'Tip (dalgic/kuru)', 's'], ['d', 'Gövde çapı'], ['h', 'Yükseklik'], ['q', 'Debi (l/s)'], ['hm', 'Basma (m)']],
    valve: [['tag', 'Etiket', 's'], ['dn', 'DN'], ['kind', 'Tip (surgulu/cekvalf/kelebek)', 's'], ['rot', 'Yön (°)']], text: [['s', 'Metin', 's'], ['h', 'Yükseklik'], ['hp', 'Kağıtta yükseklik (mm, açıklama)'], ['rot', 'Açı (°)'], ['al', 'Hizalama L/C/R/M', 's']],
    koord: [['dec', 'Ondalık hane'], ['lab', 'Etiket (H = harita Y/X, A = AutoCAD X/Y)', 's'], ['m', 'Tip (XY / X / Y)', 's']], ellipse: [['ra', 'Küçük/büyük eksen oranı']], dim: [['txt', 'Metin (<> = değer)', 's']], kaplama_ad: [], acilim: [], kot: [['v', 'Kot'], ['txt', 'Açıklama', 's'], ['ters', 'Yazı üçgenin solunda (1 = evet, 0 = hayır)']],
    box: [['sx', 'En'], ['sy', 'Boy'], ['sz', 'Yükseklik'], ['rot', 'Dönüş (°)']], cyl: [['r', 'Yarıçap'], ['h', 'Yükseklik']],
    sheet: [['size', 'Kağıt (A0-A4)', 's'], ['orient', 'Yön L/P', 's'], ['scale', 'Ölçek 1:'], ['f.proje', 'Proje', 's'], ['f.baslik', 'Pafta adı', 's'], ['f.cizen', 'Çizen', 's'], ['f.kontrol', 'Kontrol', 's'], ['f.onay', 'Onay', 's'], ['f.tarih', 'Tarih', 's'], ['f.no', 'Pafta no', 's'], ['f.rev', 'Revizyon', 's'], ['f.firma', 'Firma', 's']],
  };
  C.PROPFIELDS = FIELDS;
  const getK = (e, k) => k.split('.').reduce((o, p) => (o || {})[p], e);
  const setK = (e, k, v) => { const ps = k.split('.'); let o = e; for (let i = 0; i < ps.length - 1; i++) o = o[ps[i]] = o[ps[i]] || {}; o[ps[ps.length - 1]] = v; };
  function renderLayoutProps(b) {
    const L = lay.cur(); if (!L) { b.innerHTML = '<p class="hint">Düzen yok.</p>'; return; }
    const vp = C.layoutSel && L.vps.includes(C.layoutSel) ? C.layoutSel : null;
    const fld = (k, lbl, v, num) => `<div class="fld"><label>${lbl}</label><input data-k="${k}" ${num ? 'type="number" step="any"' : ''} value="${esc(v == null ? '' : v)}"></div>`;
    if (vp) {
      $('#propSub').textContent = 'Görünüm penceresi';
      const tabs = `<div class="tabs" style="display:flex;gap:4px;margin-bottom:8px"><button data-vt="gor" class="${C._vpTab !== 'cer' ? 'on pri' : ''}">Görünüm</button><button data-vt="cer" class="${C._vpTab === 'cer' ? 'on pri' : ''}">Çerçeve (sınır çizgisi)</button></div>`;
      if (C._vpTab === 'cer') {
        const f = vp.frame || (() => { const d = C.vpFrame(vp); return d ? Object.assign({ on: true }, d) : { on: false, layer: '0', color: 256, lt: 'BYLAYER', lw: -1, lts: 1 }; })();
        const layOpts = Object.keys(C.doc.layers).map(n => `<option ${n === f.layer ? 'selected' : ''}>${esc(n)}</option>`).join('') + '<option value="?">+ Yeni katman…</option>';
        b.innerHTML = tabs + `<h4>Çerçeve — yazdırılan sınır çizgisi</h4>
          <div class="fld"><label>Çerçeveyi çiz ve yazdır</label><input type="checkbox" data-fr="on" ${f.on !== false ? 'checked' : ''}></div>
          <div class="fld"><label>Katman</label><select data-fr="layer">${layOpts}</select></div>
          <div class="fld"><label>Renk</label><select data-fr="color">${colorOpts(f.color == null ? 256 : f.color)}</select></div>
          <div class="fld"><label>Çizgi tipi</label><select data-fr="lt">${ltOpts(f.lt || 'BYLAYER')}</select></div>
          <div class="fld"><label>Çizgi kalınlığı</label><select data-fr="lw">${lwOpts(f.lw == null ? -1 : f.lw)}</select></div>
          <div class="fld"><label>Çizgi tipi ölçeği (kağıtta)</label><input data-fr="lts" type="text" inputmode="decimal" value="${f.lts || 1}"></div>
          <div class="bar"><button id="frAll">Bu düzendeki tüm pencerelere uygula</button></div>
          <p class="hint">Katmanı kapalı olan çerçeve yazdırılmaz (AutoCAD'deki gibi çerçeveyi gizlemek için ayrı bir katman kullanabilirsiniz). Daire / çokgen pencerelerde çerçeve şeklin kendisidir.</p>`;
        const put = (k, v) => { C.undoStack.push(C.snapshot()); vp.frame = Object.assign({}, f, { [k]: v }); C.changed(); C.emit('layouts'); lay.dirty = true; renderProps(); };
        b.querySelectorAll('[data-vt]').forEach(t => t.onclick = () => { C._vpTab = t.dataset.vt; renderProps(); });
        b.querySelector('[data-fr=on]').onchange = e => put('on', e.target.checked);
        b.querySelector('[data-fr=layer]').onchange = e => { let v = e.target.value; if (v === '?') { v = (prompt('Yeni katman adı', 'PENCERE') || '').trim(); if (!v) { renderProps(); return; } C.ensureLayer(v, 7, 'CONTINUOUS', 35); C.emit('layers'); } put('layer', v); };
        b.querySelector('[data-fr=color]').onchange = e => askColor(e.target, n => { if (n != null) put('color', n); else renderProps(); });
        b.querySelector('[data-fr=lt]').onchange = e => put('lt', e.target.value);
        b.querySelector('[data-fr=lw]').onchange = e => put('lw', parseInt(e.target.value));
        b.querySelector('[data-fr=lts]').onchange = e => { const n = parseFloat(String(e.target.value).replace(',', '.')); if (n > 0) put('lts', n); };
        b.querySelector('#frAll').onclick = () => { C.undoStack.push(C.snapshot()); const fr = vp.frame || f; for (const v of L.vps) v.frame = Object.assign({}, fr); C.changed(); C.emit('layouts'); C.log(`${L.vps.length} pencereye aynı çerçeve ayarı uygulandı.`); };
        return;
      }
      b.innerHTML = tabs + `<h4>Görünüm penceresi</h4>
        <div class="fld"><label>Ölçek 1:</label><select data-k="scale">${[...new Set([...C.STD_SCALES, vp.scale])].sort((x, y) => x - y).map(v => `<option ${v === vp.scale ? 'selected' : ''}>${v}</option>`).join('')}<option value="?">Özel…</option></select></div>
        ${fld('cx', 'Merkez X (m)', +vp.cx.toFixed(3), 1)}${fld('cy', 'Merkez Y (m)', +vp.cy.toFixed(3), 1)}
        ${fld('x', 'Kağıtta X (mm)', +vp.x.toFixed(1), 1)}${fld('y', 'Kağıtta Y (mm)', +vp.y.toFixed(1), 1)}${fld('w', 'Genişlik (mm)', +vp.w.toFixed(1), 1)}${fld('h', 'Yükseklik (mm)', +vp.h.toFixed(1), 1)}
        <div class="fld"><label>Çerçeve</label><span>${C.vpFrame(vp) ? 'yazdırılır' : 'yazdırılmaz'} — <a href="#" data-vt="cer">Çerçeve sekmesi</a></span></div>
        <div class="fld"><label>Görünümü kilitle</label><input type="checkbox" data-k="lock" ${vp.lock ? 'checked' : ''}></div>
        <div class="fld"><label>Gizli katmanlar</label><input data-k="frozen" value="${esc((vp.frozen || []).join(', '))}" placeholder="ör: OLCU, SU"></div>
        <div class="fld"><label>Başlık</label><input data-k="label" value="${esc(vp.label || '')}" placeholder="ör: DETAY A"></div>
        <div class="fld"><label>Açıklamalar</label><select data-k="annoMode"><option value="">Bu ölçeği destekleyenler (AutoCAD gibi)</option><option value="hepsi" ${vp.annoMode === 'hepsi' ? 'selected' : ''}>Hepsi</option></select></div>
        <div class="fld"><label>Şekil</label><span>${vp.clip ? (vp.clip.length >= 40 ? 'Daire' : vp.clip.length + ' köşeli çokgen') : 'Dikdörtgen'}</span></div>
        <div class="bar"><button id="vpIn">Pencereye gir (kaydır)</button><button id="vpPick">Modelde yerini seç</button><button id="vpArea">Alan seç</button><button id="vpCur">Ölçeği geçerli yap</button></div>
        <div class="bar"><button id="vpFromPlan">Plan görünümünün merkezini al</button><button id="vpFit">Çizime sığdır</button><button id="vpDel">Sil</button></div>
        <p class="hint">"Ölçeği geçerli yap": çizim ölçeği 1/${vp.scale} olur; bundan sonra yazdığınız yazı ve ölçüler bu pencerede doğru boyda çıkar (OLCEKAYAR YENI=GECERLI ise yalnız bu ölçekteki pencerelerde görünür). Ölçüler, kotlar ve etiketler bu pencerenin ölçeğine göre otomatik boyutlanır. Ctrl + sürükle ile içini kaydırın.</p>`;
      const set = (k, v) => { if (vp.lock && (k === 'scale' || k === 'cx' || k === 'cy')) { C.warn('🔒 Pencere kilitli: ölçek ve konum değiştirilemez. Önce kilidi açın.'); renderProps(); return; } C.undoStack.push(C.snapshot()); vp[k] = v; C.changed(); lay.dirty = true; };
      b.querySelectorAll('[data-vt]').forEach(t => t.onclick = () => { C._vpTab = t.dataset.vt; renderProps(); });
      b.querySelector('select[data-k=annoMode]').onchange = e => { set('annoMode', e.target.value || undefined); C.emit('layouts'); };
      b.querySelector('#vpPick').onclick = () => C.runTool('VPYER M');
      b.querySelector('#vpIn').onclick = () => C.vpEnter(vp);
      b.querySelector('#vpArea').onclick = () => C.runTool('VPYER A');
      b.querySelector('#vpCur').onclick = () => C.runTool('OLCEK ' + vp.scale);
      b.querySelectorAll('input[data-k]').forEach(inp => inp.onchange = () => { const k = inp.dataset.k; if (k === 'border' || k === 'lock') set(k, inp.checked); else if (k === 'label') set(k, inp.value.trim() || undefined); else if ((k === 'w' || k === 'h') && vp.clip) { const v = parseFloat(inp.value); if (v > 0) { const f = v / vp[k], j = k === 'w' ? 0 : 1; C.undoStack.push(C.snapshot()); vp.clip = vp.clip.map(q => { const r = q.slice(); r[j] *= f; return r; }); if (k === 'w') vp.x -= (v - vp.w) / 2; else vp.y -= (v - vp.h) / 2; vp[k] = v; C.changed(); lay.dirty = true; } } else if (k === 'frozen') set(k, inp.value.split(',').map(x => x.trim()).filter(Boolean)); else { const v = parseFloat(inp.value); if (!isNaN(v)) set(k, v); } C.emit('layouts'); });
      b.querySelector('select[data-k=scale]').onchange = e => { let v = e.target.value; if (v === '?') v = prompt('Ölçek 1:', vp.scale); v = parseFloat(v); if (v > 0) set('scale', v); C.emit('layouts'); };
      b.querySelector('#vpFromPlan').onclick = () => { set('cx', plan.cx); set('cy', plan.cy); renderProps(); };
      b.querySelector('#vpFit').onclick = () => { const bb = C.extents(C.doc.ents.filter(e => e.type !== 'sheet')); if (!bb) return; set('cx', (bb[0] + bb[2]) / 2); set('cy', (bb[1] + bb[3]) / 2); set('scale', C.fitScale(bb, vp.w, vp.h)); C.emit('layouts'); };
      b.querySelector('#vpDel').onclick = () => { C.undoStack.push(C.snapshot()); L.vps.splice(L.vps.indexOf(vp), 1); C.layoutSel = null; C.changed(); C.emit('layouts'); };
      return;
    }
    $('#propSub').textContent = 'Düzen: ' + L.name;
    const f = L.f || (L.f = {});
    const tf = [['proje', 'Proje'], ['baslik', 'Pafta adı'], ['cizen', 'Çizen'], ['kontrol', 'Kontrol'], ['onay', 'Onay'], ['tarih', 'Tarih'], ['no', 'Pafta no'], ['rev', 'Revizyon'], ['firma', 'Firma / kurum']];
    b.innerHTML = `<h4>Düzen (pafta)</h4>${fld('name', 'Ad', L.name)}
      <div class="fld"><label>Kağıt</label><select data-k="size">${Object.keys(C.PAPER).map(z => `<option ${z === L.size ? 'selected' : ''}>${z}</option>`).join('')}</select></div>
      <div class="fld"><label>Yön</label><select data-k="orient"><option value="L" ${L.orient !== 'P' ? 'selected' : ''}>Yatay</option><option value="P" ${L.orient === 'P' ? 'selected' : ''}>Dikey</option></select></div>
      <h4>Antet</h4>${tf.map(([k, l]) => fld('f.' + k, l, f[k])).join('')}
      <p class="hint">Antet: ${esc((C.doc.set.titleBlock || C.defaultTitleBlock || {}).name || 'varsayılan')} — kendi antetiniz için Düzen › "Kendi antetimi yükle".</p>
      <div class="bar"><button data-cmd="SAYFADUZENI">Sayfa düzeni (kağıt, özel boyut, kenar)…</button></div><div class="bar"><button data-cmd="MVIEW">+ Görünüm penceresi</button><button data-cmd="DUZENYAZDIR" class="pri">Yazdır / PDF</button></div>`;
    b.querySelectorAll('[data-k]').forEach(inp => inp.onchange = () => { C.undoStack.push(C.snapshot()); const k = inp.dataset.k; if (k.startsWith('f.')) f[k.slice(2)] = inp.value; else L[k] = inp.value; C.changed(); C.emit('layouts'); });
  }
  function renderProps() {
    const b = $('#propBody'), s = C.sel;
    if (cur === 'layout' && !(C.vpEdit && C.sel.length)) return renderLayoutProps(b);
    $('#propSub').textContent = s.length ? (s.length === 1 ? (C.T[s[0].type] ? C.T[s[0].type].label : s[0].type) + ' #' + s[0].id : s.length + ' nesne') : 'seçim yok';
    if (!s.length && C.selFace && C.byId(C.selFace.e.id)) {
      const f = C.selFace; let A = [0, 0, 0]; const L = f.pts; for (let i = 0; i < L.length; i++) A = M.add(A, M.cross(L[i], L[(i + 1) % L.length])); let area = Math.abs(M.dot(A, f.n)) / 2; for (const hl of f.holes || []) { let B = [0, 0, 0]; for (let i = 0; i < hl.length; i++) B = M.add(B, M.cross(hl[i], hl[(i + 1) % hl.length])); area -= Math.abs(M.dot(B, f.n)) / 2; }
      const dir = Math.abs(f.n[2]) > 0.999 ? (f.n[2] > 0 ? 'üst (yukarı bakan)' : 'alt (aşağı bakan)') : Math.abs(f.n[2]) < 1e-6 ? 'düşey yan yüz' : 'eğik';
      $('#propSub').textContent = 'yüz';
      b.innerHTML = `<h4>Yüz</h4><p>Nesne: ${esc(C.describe(f.e))}</p><p>Alan: <b>${M.fmt(area, 3)} m²</b> · ${f.pts.length} kenar${(f.holes || []).length ? ' · ' + f.holes.length + ' delik' : ''}</p><p>Yön: ${dir} (n = ${f.n.map(v => M.fmt(v, 3)).join(', ')})</p>
        <div class="bar"><button data-cmd="OFFSET">Ötele (Offset)</button><button data-cmd="PUSHPULL">İt / Çek</button><button data-cmd="ESNET">Esnet</button></div><p class="hint">Çift tıklayınca nesnenin tamamı seçilir.</p>`;
      return;
    }
    if (!s.length) {
      const st = C.doc.set;
      b.innerHTML = `<h4>Çizim ayarları</h4>
        <div class="fld"><label>Ad</label><input data-s="name" value="${esc(st.name)}"></div>
        <div class="fld"><label>Ölçek 1:</label><input data-s="anno" type="number" value="${st.anno}"></div>
        <div class="fld"><label>Yazı yük. (mm)</label><input data-s="textH" type="number" step="0.5" value="${st.textH}"></div>
        <div class="fld"><label>Ölçü yazısı (mm)</label><input data-s="dimTextH" type="number" step="0.5" value="${st.dimTextH}"></div>
        <div class="fld"><label>Ok boyu (mm)</label><input data-s="dimArrow" type="number" step="0.5" value="${st.dimArrow}"></div>
        <div class="fld"><label>Ölçü ondalık</label><input data-s="dimDec" type="number" value="${st.dimDec}"></div>
        <div class="fld"><label>Proje dili</label><select data-lang><option value="tr" ${C.lang && C.lang() === 'en' ? '' : 'selected'}>Türkçe</option><option value="en" ${C.lang && C.lang() === 'en' ? 'selected' : ''}>English</option></select> <button data-cmd="CEVIRI" title="Yazıların İngilizce karşılıkları">Çeviri…</button></div>
        <div class="fld"><label>Kot işareti</label><button data-cmd="KOTSTIL" title="Kot işaretinin şeklini seç — tüm kotlara uygulanır">${esc(((C.KOT_STILLER || []).find(q => q[0] === (C.kotStil ? C.kotStil() : '')) || ['', 'Seç…'])[1])} …</button></div>
        <div class="fld"><label>LTSCALE</label><input data-s="ltscale" type="number" step="0.01" value="${st.ltscale}"></div>
        <p class="hint">Koordinat sistemi: ${esc(C.geo.describe())}<br>Nesne sayısı: ${C.doc.ents.length}</p>`;
      { const sl = b.querySelector('[data-lang]'); if (sl) sl.onchange = () => { C.setLang && C.setLang(sl.value); renderProps(); }; }
      b.querySelectorAll('[data-s]').forEach(inp => inp.onchange = () => { const k = inp.dataset.s; st[k] = k === 'name' ? inp.value : parseFloat(inp.value); if (k === 'anno') st.ltscale = st.anno / 1000; C.doc.ents.forEach(e => delete e._c); C.changed(); syncStatus(); renderProps(); });
      return;
    }
    const e0 = s[0], same = k => s.every(e => e[k] === e0[k]);
    let h = `<h4>${s.length > 1 ? s.length + ' nesne' : esc(C.T[e0.type] ? C.T[e0.type].label : e0.type) + ' #' + e0.id}</h4>`;
    h += `<div class="fld"><label>Katman</label><select data-c="layer">${(same('layer') ? '' : '<option value="">*farklı*</option>') + Object.keys(C.doc.layers).map(n => `<option ${same('layer') && n === e0.layer ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;
    h += `<div class="fld"><label>Renk</label><select data-c="color">${colorOpts(same('color') ? e0.color : 256)}</select></div>`;
    h += `<div class="fld"><label>Çizgi tipi</label><select data-c="lt">${ltOpts(same('lt') ? e0.lt : 'BYLAYER')}</select></div>`;
    h += `<div class="fld"><label>Kalınlık</label><select data-c="lw">${lwOpts(same('lw') ? e0.lw : -1)}</select></div>`;
    if (C.DISIPLINLER) { const dv = same('dis') ? (e0.dis || '') : '*', auto = !e0.dis && C.disOf ? C.disOf(e0) : null; h += `<div class="fld"><label>Disiplin</label><select data-c="dis" title="Seçilirse nesne yalnız o disiplinin paftalarında görünür">${dv === '*' ? '<option value="*">*farklı*</option>' : ''}<option value="" ${dv === '' ? 'selected' : ''}>${auto ? 'Otomatik (' + auto + ')' : 'Tümü (her paftada)'}</option>${C.DISIPLINLER.map(d => `<option ${dv === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>`; }
    if (s.length === 1 && FIELDS[e0.type]) { h += '<h4>Nesne</h4>'; for (const [k, lbl, t] of FIELDS[e0.type]) { const v = getK(e0, k); h += `<div class="fld"><label>${lbl}</label><input data-f="${k}" ${t === 's' ? '' : 'type="number" step="any"'} value="${v == null ? '' : esc(v)}"></div>`; } }
    if (C.geomPropsHTML) h += C.geomPropsHTML(s, esc);
    if (C.tipPropsHTML) h += C.tipPropsHTML(s);
    if (C.seviyePropsHTML) h += C.seviyePropsHTML(s);
    if (s.length && s.every(e => e.type === 'hatch')) h += '<div class="bar"><button class="pri" data-hedit>Tarama desenini / ölçeğini düzenle…</button></div>';
    if (s.length >= 1 && C.ANNO_TYPES && s.every(e => C.ANNO_TYPES.has(e.type))) { const sc = s[0].ascales; h += `<h4>Açıklama ölçeği</h4><div class="fld"><label>Ölçekler (boş = tümü)</label><input data-an="ascales" value="${esc(sc && sc.length ? sc.join(', ') : '')}" placeholder="ör: 100, 50, 20"></div>${s[0].type === 'text' || s[0].type === 'ctext' || s[0].type === 'hatch' ? `<div class="fld"><label>${s[0].type === 'hatch' ? 'Paftada ölçeğe göre ayarla' : 'Açıklama (ölçekle boyutlanır)'}</label><input type="checkbox" data-an="ann" ${s[0].ann ? 'checked' : ''}></div>` : ''}<p class="hint">Geçerli ölçek 1/${C.doc.set.anno}. Ölçeğe özel konum: OLCEKKONUM.</p>`; }
    if (s.length === 1) h += `<p class="hint">${esc(C.describe(e0))}</p>`;
    b.innerHTML = h;
    const apply = fn => { C.undoStack.push(C.snapshot()); C.redoStack = []; s.forEach(e => { fn(e); delete e._c; }); C.changed(); C.emit('layers'); };
    if (C.tipPropsWire) C.tipPropsWire(b, s, apply);
    if (C.seviyePropsWire) C.seviyePropsWire(b, s, apply);
    { const ds = b.querySelector('[data-c=dis]'); if (ds) ds.onchange = ev => { const v = ev.target.value; if (v === '*') return; apply(e => { if (v) e.dis = v; else delete e.dis; }); C.emit('layouts'); }; }
    b.querySelector('[data-c=layer]').onchange = ev => { const v = ev.target.value; if (v) apply(e => e.layer = v); };
    b.querySelector('[data-c=color]').onchange = ev => askColor(ev.target, n => { if (n != null) apply(e => e.color = n); renderProps(); });
    b.querySelector('[data-c=lt]').onchange = ev => apply(e => e.lt = ev.target.value);
    b.querySelector('[data-c=lw]').onchange = ev => apply(e => e.lw = parseInt(ev.target.value));
    b.querySelectorAll('[data-f]').forEach(inp => inp.onchange = () => { const k = inp.dataset.f; const num = inp.type === 'number'; let v = num ? parseFloat(inp.value) : inp.value; if (num && isNaN(v)) return; if (k === 's' && e0.type === 'text') v = v.replace(/\\n/g, '\n'); if (k === 'h' && C.textSetH) apply(e => C.textSetH(e, v)); else if (k === 'hp') apply(e => { e.hp = v; e.ann = true; e.h = C.annoH(v); }); else if (e0.type === 'aks' && (k === 'xsS' || k === 'ysS')) apply(e => C.aksSet(e, k, v)); else if (e0.type === 'hatch' && (k === 'sc' || k === 'ang')) { const n = parseFloat(String(v).replace(',', '.')); if (isFinite(n) && (k === 'ang' || n > 0)) apply(e => { e[k] = n; }); } else if (e0.type === 'hatch' && k === 'pat') apply(e => { e.pat = C.up(v.trim()); delete e.def; }); else apply(e => setK(e, k, v)); });
    if (C.geomPropsBind) C.geomPropsBind(b, s, apply, renderProps);
    { const he = b.querySelector('[data-hedit]'); if (he) he.onclick = () => C.runTool('HATCHEDIT'); }
    b.querySelectorAll('[data-an]').forEach(inp => inp.onchange = () => { const k = inp.dataset.an; if (k === 'ann' && e0.type === 'hatch') apply(e => { const an = C.doc.set.anno; if (inp.checked && e.ann === false) { e.sc = (e.sc || 1) / an; e.ann = true; e.defAnno = an; } else if (!inp.checked && e.ann !== false) { e.sc = (e.sc || 1) * an; e.ann = false; } }); else if (k === 'ann') apply(e => { if (inp.checked) { e.ann = true; e.hp = (C.textH ? C.textH(e) : e.h) * 1000 / C.doc.set.anno; } else { e.h = C.textH ? C.textH(e) : e.h; e.ann = false; } }); else { const l = inp.value.split(/[\s,;]+/).map(t => parseFloat(t.replace(/^1[:/]/, ''))).filter(x => x > 0); apply(e => { if (l.length) e.ascales = [...new Set(l)].sort((x, y) => x - y); else delete e.ascales; }); } renderProps(); });
  }

  /* ---------------- özellikler penceresi (AutoCAD gibi ayrı palet) ---------------- */
  const pw = $('#propWin');
  (function () {
    let st = {}; try { st = JSON.parse(localStorage.getItem('aritmacad.propwin') || '{}'); } catch (e) { }
    pw.style.left = (st.x != null ? st.x : 90) + 'px'; pw.style.top = (st.y != null ? st.y : 60) + 'px';
    if (st.w) pw.style.width = st.w + 'px'; if (st.h) pw.style.height = st.h + 'px';
    const save = () => { try { localStorage.setItem('aritmacad.propwin', JSON.stringify({ x: pw.offsetLeft, y: pw.offsetTop, w: pw.offsetWidth, h: pw.offsetHeight, open: !pw.classList.contains('hidden') })); } catch (e) { } };
    let drag = null;
    $('#propHead').addEventListener('pointerdown', e => { if (e.target.closest('button')) return; drag = { x: e.clientX - pw.offsetLeft, y: e.clientY - pw.offsetTop }; $('#propHead').setPointerCapture(e.pointerId); });
    $('#propHead').addEventListener('pointermove', e => { if (!drag) return; pw.style.left = Math.max(0, Math.min(innerWidth - 80, e.clientX - drag.x)) + 'px'; pw.style.top = Math.max(0, Math.min(innerHeight - 40, e.clientY - drag.y)) + 'px'; });
    $('#propHead').addEventListener('pointerup', () => { drag = null; save(); });
    new ResizeObserver(save).observe(pw);
    $('#propClose').onclick = () => { pw.classList.add('hidden'); save(); };
    if (st.open) pw.classList.remove('hidden');
  })();
  function openProps() { pw.classList.remove('hidden'); renderProps(); }
  C.openProps = openProps;
  function toggleProps() { if (pw.classList.contains('hidden')) openProps(); else pw.classList.add('hidden'); }
  $('#btnProps').onclick = toggleProps;
  C.addCommand(['PROPERTIES', 'PR', 'OZELLIKLER', 'ÖZELLİKLER'], 'Özellikler penceresini açar/kapatır (Ctrl+1)', async () => toggleProps(), { noUndo: true });
  /* ---------------- sohbet paneli aç/kapa ---------------- */
  function toggleSide(force) {
    const app = $('#app'), hide = force != null ? !force : !app.classList.contains('noside');
    app.classList.toggle('noside', hide); try { localStorage.setItem('aritmacad.noside', hide ? '1' : '0'); } catch (e) { }
    $('#btnSide').classList.toggle('on', !hide);
    setTimeout(() => { plan.resize(); map.resize(); lay.resize(); if (!v3.failed) v3.resize(); }, 30);
  }
  $('#btnSide').onclick = () => toggleSide();
  try { if (localStorage.getItem('aritmacad.noside') === '1') toggleSide(false); else $('#btnSide').classList.add('on'); } catch (e) { }
  C.toggleSide = toggleSide;

  /* ---------------- dosya işlemleri ---------------- */
  const download = (data, name, mime) => { const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000); };
  C.download = download;
  const base = () => C.ascii(C.doc.set.name || 'cizim').replace(/[^\w\-]+/g, '_');
  const pickFile = accept => new Promise(res => { const fi = $('#fileIn'); fi.value = ''; fi.accept = accept; fi.onchange = () => res(fi.files[0] || null); fi.oncancel = () => res(null); fi.click(); });
  C.pickFile = pickFile;
  /* ---- DWG: yerel DWG yardımcısı (ODA File Converter) ---- */
  C.dwg = {
    base: 'http://127.0.0.1:47321',
    async ping() { try { const c = new AbortController(); setTimeout(() => c.abort(), 1500); const r = await fetch(this.base + '/ping', { cache: 'no-store', signal: c.signal }); return await r.json(); } catch (e) { return null; } },
    async conv(path, bytes) {
      const st = await this.ping();
      if (!st) { dwgHelp(); throw new C.Cancel(); }
      if (!st.oda) { dwgHelp(true); throw new C.Cancel(); }
      C.log('DWG dönüştürülüyor…');
      const r = await fetch(this.base + path, { method: 'POST', body: bytes, headers: { 'Content-Type': 'application/octet-stream' } });
      if (!r.ok) throw new Error('DWG dönüştürme hatası: ' + (await r.text()));
      return new Uint8Array(await r.arrayBuffer());
    },
    toDxf(bytes) { return this.conv('/dwg2dxf', bytes); },
    toDwg(text, ver) { return this.conv('/dxf2dwg?ver=' + (ver || 'ACAD2018'), new TextEncoder().encode(text)); },
  };
  function dwgHelp(noOda) {
    modal('DWG için bir kerelik kurulum', `<p>DWG, Autodesk'in kapalı formatıdır. ArıtmaCAD DWG dosyalarını <b>ücretsiz ODA File Converter</b> ile, kendi bilgisayarınızda (internete göndermeden) açar ve kaydeder.</p>
      <ol><li><b>ODA File Converter</b>'ı indirip kurun: opendesign.com › "ODA File Converter" (Windows, ücretsiz, kayıt ister).</li>
      <li>ArıtmaCAD'i kapatın ve <b>AritmaCAD-Baslat.bat</b> ile yeniden açın. Başlatıcı, DWG yardımcısını arka planda otomatik çalıştırır.</li>
      <li>Artık <b>Dosya › Aç</b> ile .dwg seçebilir, <b>Dosya › DWG olarak kaydet</b> ile AutoCAD 2000–2018 DWG kaydedebilirsiniz.</li></ol>
      <p class="hint">${noOda ? '⚠ DWG yardımcısı çalışıyor ama ODA File Converter bulunamadı. Varsayılan konuma (C:\\Program Files\\ODA\\…) kurun.' : '⚠ DWG yardımcısına ulaşılamadı: program AritmaCAD-Baslat.bat ile açılmamış olabilir.'} O zamana kadar AutoCAD'den DXF olarak kaydedip açabilirsiniz.</p>`);
  }
  C.addCommand(['DWGOUT', 'DWGKAYDET', 'SAVEDWG'], 'DWG olarak kaydeder (AutoCAD 2000-2018). DWGKAYDET [2018|2013|2010|2007|2004|2000]', async (I) => {
    const v = await I.kw('DWG sürümü', [['2018'], ['2013'], ['2010'], ['2007'], ['2004'], ['2000']], C.doc.set.dwgVer || '2018');
    C.doc.set.dwgVer = v;
    const bytes = await C.dwg.toDwg(C.dxfWrite(), 'ACAD' + v);
    const name = base() + '.dwg';
    if (window.showSaveFilePicker) {
      try { const h = (C.dwgHandle && !I.as) ? C.dwgHandle : await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'AutoCAD DWG', accept: { 'application/acad': ['.dwg'] } }] }); C.dwgHandle = h; const w = await h.createWritable(); await w.write(bytes); await w.close(); C.markSaved && C.markSaved(); C.log(`Kaydedildi: ${h.name} (AutoCAD ${v} DWG)`); C.lastFormat = 'dwg'; return; }
      catch (err) { if (err.name === 'AbortError') return; }
    }
    download(bytes, name, 'application/acad'); C.markSaved && C.markSaved(); C.log(`İndirildi: ${name} (AutoCAD ${v} DWG)`); C.lastFormat = 'dwg';
  }, { noUndo: true });
  C.readAny = (f, m, h) => readAny(f, m, h);
  async function readAny(file, merge, handle) {
    const nm = file.name.toLowerCase(); if (nm.endsWith('.aritma') && C.openProject) return C.openProject(file, merge, merge ? null : handle);
    let buf = new Uint8Array(await file.arrayBuffer());
    if (nm.endsWith('.dwg')) { buf = await C.dwg.toDxf(buf); if (!merge) { C.lastFormat = 'dwg'; C.dwgHandle = null; } }
    else if (!merge) C.lastFormat = 'dxf';
    if (nm.endsWith('.kmz') || nm.endsWith('.kml')) {
      let txt; if (nm.endsWith('.kmz')) { const fs = await C.unzip(buf); const k = fs.find(f => f.name.toLowerCase().endsWith('.kml')); if (!k) throw new Error('KMZ içinde KML yok'); txt = new TextDecoder().decode(k.data); } else txt = new TextDecoder().decode(buf);
      if (!merge) C.newDoc();
      const ents = C.kmlImport(txt); ents.forEach(e => { C.ensureLayer(e.layer, 30, 'CONTINUOUS', 25); C.add(C.newEnt(e.type, e)); });
      C.log(`${ents.length} nesne KMZ/KML'den alındı.`); C.emit('layers'); C.emit('geo'); return;
    }
    const text = C.dxfDecode(buf);
    const r = C.dxfImport(text);
    if (!merge) { C.newDoc(); C.doc.layers = Object.assign({}, r.layers); C.doc.set.name = file.name.replace(/\.[^.]+$/, ''); if (r.ltscale) C.doc.set.ltscale = r.ltscale; if (r.layouts) C.doc.layouts = r.layouts; if (r.ayar) { Object.assign(C.doc.set, r.ayar); C.langReset && C.langReset(); } if (r.styles && Object.keys(r.styles).length) C.doc.styles = Object.assign({}, r.styles); }
    else for (const [n, l] of Object.entries(r.layers)) if (!C.doc.layers[n]) C.doc.layers[n] = l;
    if (merge && r.styles) { const S = C.styles(); for (const [n, y] of Object.entries(r.styles)) if (!S[n]) S[n] = y; }
    C.doc.blocks = Object.assign(C.doc.blocks || {}, r.blocks || {});
    let ents = r.ents;
    const bb = (() => { const t = ents.map(e => Object.assign({ _tmp: 1 }, e)); return C.extents(t); })();
    const big = bb && (bb[2] - bb[0] > 3000 || bb[3] - bb[1] > 3000);
    { // birim: ArıtmaCAD metre ile çalışır. Dosya mm / cm ise (ya da birim yanlış yazılmışsa — ör. inç görünen cm çizim) sorulur
      const geo = bb && /^\d{6}/.test(String(Math.round(bb[0]))); // UTM koordinatlı haritalar metre kabul
      const known = { 4: 'mm', 5: 'cm', 6: 'm' }[r.insUnits];
      if (!geo && (known === 'mm' || known === 'cm' || (big && known !== 'm'))) {
        const guess = known || 'cm';
        const ans = (prompt(`Çizim büyük görünüyor (${Math.round(bb[2] - bb[0])} × ${Math.round(bb[3] - bb[1])} birim). Dosya birimi nedir?  m / cm / mm  (ArıtmaCAD metre ile çalışır; seçtiğiniz birim metreye çevrilir)`, guess) || '').trim().toLowerCase();
        const k = ans === 'cm' ? 0.01 : ans === 'mm' ? 0.001 : ans === 'dm' ? 0.1 : 1;
        if (k !== 1) { const X = C.xScale([0, 0, 0], k); ents.forEach(e => C.xform(e, X)); if (!merge) C.doc.set.ltscale *= k; C.log(`Birim ${ans} → m çevrildi (×${k}).`); }
      }
    }
    for (const e of ents) { const ne = C.newEnt(e.type, e); ne.id = C.doc.nextId++; C.doc.ents.push(ne); }
    C.changed(); C.emit('layers'); C.emit('doc');
    const sk = Object.entries(r.stats.skip).map(([k, v]) => `${k}:${v}`).join(' ');
    C.log(`${file.name}: ${r.stats.ok} nesne okundu${r.stats.comp ? ` (${r.stats.comp} ArıtmaCAD nesnesi parametrik olarak geri yüklendi)` : ''}${sk ? ' — atlanan: ' + sk : ''}`);
    setTimeout(() => C.emit('zoomExtents'), 50);
  }
  C.openFile = readAny;
  C.addCommand(['OPEN', 'AC', 'AÇ'], 'ArıtmaCAD proje / DWG / DXF / KMZ / KML dosyası açar (birden fazla seçilebilir; her biri ayrı sekmede)', async () => {
    if (C.docTabs) { // çoklu seçim: her dosya kendi sekmesinde
      /* dosya erişimi varsa dosyanın kendisini tut: .aritma açıldıktan sonra Ctrl+S her seferinde yer sormadan aynı dosyanın üstüne kaydeder */
      if (window.showOpenFilePicker) {
        let hs = null; try { hs = await window.showOpenFilePicker({ multiple: true, types: [{ description: 'ArıtmaCAD / AutoCAD / Google Earth', accept: { 'application/octet-stream': ['.aritma', '.dwg', '.dxf', '.kmz', '.kml'] } }] }); } catch (err) { if (err && err.name === 'AbortError') return; hs = null; }
        if (hs) {
          for (const h of hs) { if (!C.docTabs.acmaIcin()) break; try { const f = await h.getFile(); await readAny(f, false, h); } catch (err) { C.warn(h.name + ': ' + err.message); continue; } C.fileHandle = null; C.undoStack = []; C.redoStack = []; C.markSaved && C.markSaved(); C.emit('doc'); }
          return;
        }
      }
      const fs = await new Promise(res => { const fi = $('#fileIn'); fi.value = ''; fi.accept = '.aritma,.dwg,.dxf,.kmz,.kml'; fi.multiple = true; fi.onchange = () => { const a = [...fi.files]; fi.multiple = false; res(a); }; fi.oncancel = () => { fi.multiple = false; res([]); }; fi.click(); });
      for (const f of fs) { if (!C.docTabs.acmaIcin()) break; try { await readAny(f, false); } catch (err) { C.warn(f.name + ': ' + err.message); continue; } C.fileHandle = null; C.undoStack = []; C.redoStack = []; C.markSaved && C.markSaved(); C.emit('doc'); }
      return;
    }
    if (C.askSave && !(await C.askSave('Başka bir dosya açmadan önce'))) return; const f = await pickFile('.aritma,.dwg,.dxf,.kmz,.kml'); if (!f) return; await readAny(f, false); C.fileHandle = null; C.undoStack = []; C.markSaved && C.markSaved(); }, { noUndo: true });
  C.addCommand(['IMPORT', 'ICEAKTAR', 'INSERTDXF'], 'DWG / DXF / KMZ dosyasını mevcut çizime ekler', async () => { const f = await pickFile('.aritma,.dwg,.dxf,.kmz,.kml'); if (f) await readAny(f, true); });
  C.addCommand(['KMZIN', 'KMLIN', 'KMZAC'], 'Google Earth KMZ/KML içe aktarır', async () => { const f = await pickFile('.kmz,.kml'); if (f) await readAny(f, true); });
  C.addCommand(['NEW', 'YENI'], 'Yeni çizim (yeni sekmede)', async () => { if (C.docTabs) { C.docTabs.yeni(); return; } if (C.askSave) { if (!(await C.askSave('Yeni çizime geçmeden önce'))) return; } else if (C.doc.ents.length && !confirm('Mevcut çizim kapatılsın mı? (Kaydedilmemiş değişiklikler kaybolur)')) return; C.newDoc(); C.markSaved && C.markSaved(); C.fileHandle = null; plan.zoomExtents(); }, { noUndo: true });
  const saveDxf = async (as) => {
    let txt; try { txt = C.dxfWrite(); } catch (err) { console.error(err); const m = 'DXF kaydedilemedi: ' + ((err && err.message) || err); C.warn(m + ' — çiziminiz kaybolmadı; KURTAR ile otomatik kopyalar duruyor. Bu mesajı bildirin.'); try { alert(m); } catch (e2) { } return; }
    const name = base() + '.dxf';
    if (window.showSaveFilePicker) {
      try {
        if (!C.fileHandle || as) C.fileHandle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'AutoCAD DXF', accept: { 'application/dxf': ['.dxf'] } }] });
        const w = await C.fileHandle.createWritable(); await w.write(txt); await w.close();
        C.doc.set.name = C.fileHandle.name.replace(/\.dxf$/i, ''); syncStatus(); C.markSaved && C.markSaved(); C.log('Kaydedildi: ' + C.fileHandle.name + ' (DXF 2000)'); return;
      } catch (err) { if (err.name === 'AbortError') return; C.fileHandle = null; C.warn('Dosyaya yazılamadı (' + (err.message || err.name) + ') — dosya başka programda (ör. AutoCAD) açık olabilir. Çizim İndirilenler klasörüne indiriliyor.'); }
    }
    download(txt, name, 'application/dxf'); C.markSaved && C.markSaved(); C.log('İndirildi: ' + name + ' (DXF 2000)');
  };
  C.addCommand(['SAVE', 'KAYDET', 'QSAVE'], 'Kaydeder: yeni çizim ArıtmaCAD proje dosyası (.aritma); DXF açtıysanız DXF, DWG açtıysanız DWG', () => C.lastFormat === 'dwg' ? C.cmd.run('DWGKAYDET ' + (C.doc.set.dwgVer || '2018')) : C.lastFormat === 'dxf' || !C.saveProject ? saveDxf(false) : C.saveProject(false), { noUndo: true });
  C.addCommand(['SAVEAS', 'FARKLIKAYDET'], 'Farklı kaydet (DXF)', () => saveDxf(true), { noUndo: true });
  /* AutoCAD'e ayrı çıktılar: 2B (plan, kesit, tablo, paftalar) ya da 3B model — sade DXF, çizimin kendi dosyasına dokunmaz */
  const saveExport = async (txt, name) => {
    if (window.showSaveFilePicker) {
      try { const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'AutoCAD DXF', accept: { 'application/dxf': ['.dxf'] } }] }); const w = await h.createWritable(); await w.write(txt); await w.close(); C.log('Kaydedildi: ' + h.name + ' — AutoCAD\'de açabilirsiniz.'); return; }
      catch (err) { if (err.name === 'AbortError') return; C.warn('Dosyaya yazılamadı (' + (err.message || err.name) + ') — dosya AutoCAD\'de açık olabilir; İndirilenler klasörüne indiriliyor.'); }
    }
    download(txt, name, 'application/dxf'); C.log('İndirildi: ' + name);
  };
  const has3d = e => { try { const m = C.meshes(e); return !!(m && m.length); } catch (er) { return false; } };
  C.addCommand(['DXF2B', '2BDXF', 'PAFTADXF', 'CIKTI2B'], '2B çizimleri AutoCAD için DXF olarak kaydeder: plan ve kot planları, kesitler, görünüşler, tablolar (metraj, boru listesi), ölçü, kot, yazı, balon ve paftalar (AutoCAD Layout sekmeleri, ölçekli pencereler). 3B model elemanları alınmaz.', async () => {
    const ents = C.doc.ents.filter(is2d); if (!ents.length) { C.warn('Çizimde 2B nesne yok (önce KOTPLANI / KESITAL ile plan ve kesit alın).'); return; }
    let txt; try { txt = C.dxfWrite({ ents, plain: '2b', withLayouts: true }); } catch (err) { C.warn('2B DXF yazılamadı: ' + err.message); try { alert('2B DXF yazılamadı: ' + err.message); } catch (e2) { } return; }
    C.log(`2B çıktı: ${ents.length} nesne, ${(C.doc.layouts || []).length} pafta.`); await saveExport(txt, base() + '_2B.dxf');
  }, { noUndo: true });
  const is2d = e => e.type !== 'sheet' && (e.gv || (C.inPlan ? C.inPlan(e) : !has3d(e)));
  /* disiplin (pafta grubu) başına ayrı AutoCAD dosyası: o grubun paftaları + pencerelerinde görünen 2B çizim; klasöre DWG-YAP.bat da yazılır */
  const DWG_BAT = ['@echo off', 'chcp 65001 >nul', 'title ArItmaCAD - DXF dosyalarini DWG yap', 'set "ACC="',
    'for /d %%D in ("%ProgramFiles%\\Autodesk\\AutoCAD *") do if exist "%%D\\accoreconsole.exe" set "ACC=%%D\\accoreconsole.exe"',
    'if not defined ACC goto yok', 'set "SCR=%TEMP%\\aritmacad_dwg.scr"',
    '> "%SCR%" echo (setq n (getvar "DWGNAME"))',
    '>>"%SCR%" echo (command "_.SAVEAS" "2018" (strcat (getvar "DWGPREFIX") (substr n 1 (- (strlen n) 4)) ".dwg"))',
    '>>"%SCR%" echo _.QUIT', 'echo AutoCAD: %ACC%', 'echo.',
    'for %%F in ("%~dp0*.dxf") do call :cevir "%%~fF"', 'echo.', 'echo Bitti. DWG dosyalari bu klasorde.', 'pause', 'exit /b 0',
    ':cevir', 'if exist "%~dpn1.dwg" del /q "%~dpn1.dwg"', 'echo Ceviriliyor: %~nx1', '"%ACC%" /i "%~1" /s "%SCR%" >nul 2>&1',
    'if exist "%~dpn1.dwg" (echo    tamam: %~n1.dwg) else (echo    HATA: %~n1.dwg olusmadi - DXF dosyasini AutoCAD ile acip Farkli Kaydet ile DWG yapabilirsiniz)', 'exit /b 0',
    ':yok', 'echo AutoCAD bulunamadi (C:\\Program Files\\Autodesk\\AutoCAD ...\\accoreconsole.exe).', 'echo DXF dosyalarini AutoCAD ile acip Farkli Kaydet ile DWG yapabilirsiniz.', 'pause', ''].join('\r\n');
  C.dwgBat = DWG_BAT;
  const grpEnts = g => {
    const set = new Set(), vps = (C.doc.layouts || []).filter(L => (L.grp || 'Genel') === g).flatMap(L => L.vps || []);
    for (const vp of vps) { try { C.vpPrims(vp, e => set.add(e)); } catch (err) { console.error(err); } }
    return C.doc.ents.filter(e => set.has(e) && is2d(e));
  };
  C.grpDxf = g => C.dxfWrite({ ents: grpEnts(g), plain: '2b', withLayouts: true, grp: g });
  const safeNm = s => String(s).replace(/[\\/:*?"<>|]+/g, '_').trim() || 'Pafta';
  C.exportGroups = async (only) => {
    const all = [...new Set((C.doc.layouts || []).map(L => L.grp || 'Genel'))], gs = only && only.length ? all.filter(g => only.includes(g)) : all;
    if (!gs.length) { C.warn('Pafta yok: önce Paftalar çubuğundan disiplin grubu ve pafta oluşturun.'); return; }
    const files = [];
    for (const g of gs) { try { const ents = grpEnts(g), txt = C.dxfWrite({ ents, plain: '2b', withLayouts: true, grp: g }); files.push({ name: safeNm(base() + '_' + g) + '.dxf', txt, g, n: ents.length, L: (C.doc.layouts || []).filter(L => (L.grp || 'Genel') === g).length }); } catch (err) { C.warn(`${g}: DXF yazılamadı — ${err.message}`); } }
    if (!files.length) return;
    files.push({ name: 'DWG-YAP.bat', txt: DWG_BAT, bat: true });
    const rep = () => files.filter(f => !f.bat).map(f => `${f.g}: ${f.L} pafta, ${f.n} nesne → ${f.name}`).join(' · ');
    if (window.showDirectoryPicker) {
      try {
        const dir = await window.showDirectoryPicker({ id: 'aritmacad-autocad', mode: 'readwrite' });
        for (const f of files) { const h = await dir.getFileHandle(f.name, { create: true }), w = await h.createWritable(); await w.write(f.txt); await w.close(); }
        C.log(`📁 "${dir.name}" klasörüne yazıldı — ${rep()}. AutoCAD'de her biri ayrı açılır; DWG için klasördeki DWG-YAP.bat'a çift tıklayın.`);
        try { alert(`"${dir.name}" klasörüne ${files.length - 1} dosya yazıldı:\n\n${files.filter(f => !f.bat).map(f => '• ' + f.name).join('\n')}\n\nDWG yapmak için o klasördeki DWG-YAP.bat dosyasına çift tıklayın (AutoCAD açık olmasa da çalışır).`); } catch (e2) { }
        return;
      } catch (err) { if (err.name === 'AbortError') return; C.warn('Klasöre yazılamadı (' + (err.message || err.name) + ') — dosyalar İndirilenler klasörüne indiriliyor.'); }
    }
    for (const f of files) { download(f.txt, f.name, f.bat ? 'application/octet-stream' : 'application/dxf'); await new Promise(r => setTimeout(r, 400)); }
    C.log('İndirildi: ' + rep() + ' + DWG-YAP.bat (İndirilenler klasöründe çift tıklayın).');
  };
  C.addCommand(['DISIPLINDXF', 'PAFTAGRUPDXF', 'DXFDISIPLIN', 'DWGPAFTA', 'AUTOCADPAFTA'], 'Her pafta grubunu (Mekanik, Mimari, Statik, Elektrik…) ayrı AutoCAD dosyası yapar: o grubun paftaları (Layout sekmeleri, ölçekli pencereler) ve pencerelerinde görünen 2B çizim. Seçtiğiniz klasöre yazar; yanına DWG-YAP.bat koyar (çift tık → hepsi DWG).', () => C.exportGroups(), { noUndo: true });
  C.addCommand(['DXF3B', '3BDXF', 'MODEL3BDXF', 'CIKTI3B'], '3B modeli AutoCAD için DXF olarak kaydeder: perde, döşeme, temel, kolon, kiriş, dolgu, boru, ekipman… yüzey ağı (polyface) olarak, kendi katmanlarında. 2B çizimler ve paftalar alınmaz.', async () => {
    const ents = C.doc.ents.filter(e => !e.gv && has3d(e)); if (!ents.length) { C.warn('Çizimde 3B eleman yok.'); return; }
    let txt; try { txt = C.dxfWrite({ ents, plain: '3b' }); } catch (err) { C.warn('3B DXF yazılamadı: ' + err.message); try { alert('3B DXF yazılamadı: ' + err.message); } catch (e2) { } return; }
    C.log(`3B çıktı: ${ents.length} eleman.`); await saveExport(txt, base() + '_3B.dxf');
  }, { noUndo: true });
  C.quickSave = () => C.lastFormat === 'dwg' ? C.cmds.DWGKAYDET.fn({ kw: async (t, k, d) => d, as: false }, C) : C.lastFormat === 'dxf' || !C.saveProject ? saveDxf(false) : C.saveProject(false);
  C.addCommand(['DXF12OUT', 'DXFR12'], 'DXF R12 (kalınlıksız, en geniş uyumluluk)', async () => { download(C.dxfWrite({ r12: true }), base() + '_R12.dxf', 'application/dxf'); C.log('DXF R12 indirildi.'); }, { noUndo: true });
  C.addCommand(['IFCOUT', 'IFC', 'REVIT'], 'IFC4 dışa aktarır (Revit, ArchiCAD, Tekla, BIM)', async () => {
    const r = C.ifcWrite(); if (!r.count) { C.warn('3B nesne yok (duvar, havuz, boru, pompa, vana, kutu...). 2B çizgiler IFC\'ye aktarılmaz.'); return; }
    download(r.text, base() + '.ifc', 'application/x-step'); C.log(`IFC4: ${r.count} yapı elemanı (${Object.entries(r.stats).map(([k, v]) => C.T[k].label + ' ' + v).join(', ')}). Revit: Ekle › IFC Bağla ya da Aç › IFC.`);
  }, { noUndo: true });
  C.addCommand(['STLOUT', 'STL', '3DPRINT'], '3B yazıcı için STL (mm). STLOUT ölçek', async (I) => {
    const n = await I.num('Model ölçeği 1:', 100); const k = 1000 / (n || 1);
    const r = C.stlWrite({ k, note: `1/${n} mm` }); if (!r.tris) { C.warn('3B nesne yok.'); return; }
    download(r.data, base() + `_1-${n}.stl`, 'model/stl'); C.log(`STL: ${r.tris} üçgen, ölçek 1/${n}, birim mm.`);
  }, { noUndo: true });
  C.addCommand(['OBJOUT', 'OBJ'], 'OBJ dışa aktarır (renkli, metre, Y yukarı)', async () => { const r = C.objWrite(); if (!r.verts) { C.warn('3B nesne yok.'); return; } download(r.text, base() + '.obj', 'model/obj'); C.log('OBJ indirildi.'); }, { noUndo: true });
  C.addCommand(['KMZOUT', 'KMZ', 'GOOGLEEARTH'], 'Google Earth KMZ dışa aktarır (koordinat sistemi gerekir)', async () => {
    if (!C.geo.isSet()) { C.warn('Önce koordinat sistemini tanımlayın: Harita sekmesi ya da KOORDINAT komutu.'); C.setView('map'); return; }
    if (C.kmz3b) { const r = C.kmz3b.yaz({}); download(r.veri, base() + '.kmz', 'application/vnd.google-earth.kmz'); C.log(r.model ? 'KMZ indirildi — 3B model içinde (' + r.ucgen + ' üçgen). Google Earth ile açın.' : 'KMZ indirildi — Google Earth\'te açabilirsiniz.'); return; } // kmz3b.js: gerçek 3B model + deniz hattı + çevre binalar
    download(C.kmzWrite({}), base() + '.kmz', 'application/vnd.google-earth.kmz'); C.log('KMZ indirildi — Google Earth\'te açabilirsiniz.');
  }, { noUndo: true });
  C.addCommand(['KMLOUT', 'KML'], 'KML dışa aktarır', async () => { if (!C.geo.isSet()) { C.warn('Önce koordinat sistemini tanımlayın.'); return; } download(C.kmlWrite({}), base() + '.kml', 'application/vnd.google-earth.kml+xml'); }, { noUndo: true });
  const pickSheet = async (I) => {
    const sheets = C.doc.ents.filter(e => e.type === 'sheet');
    if (sheets.length === 1) return sheets[0];
    if (sheets.length > 1) { const p = await I.pt('Yazdırılacak paftaya tıklayın'); if (!p || typeof p === 'string') return null; return sheets.find(s => { const b = C.bbox(s); return p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3]; }) || null; }
    C.log('Pafta yok — yazdırılacak alanı pencere ile seçin.');
    const a = await I.pt('İlk köşe'); if (!a || typeof a === 'string') return null; C.cmd.base = a; C.cmd.rubber = false; C.cmd.preview = c => [C.prim.P([a, [c[0], a[1]], c, [a[0], c[1]]], true)];
    const b = await I.pt('Karşı köşe'); if (!b || typeof b === 'string') return null;
    const size = await I.kw('Kağıt', [['A4'], ['A3'], ['A2'], ['A1'], ['A0']], 'A3');
    const w = Math.abs(b[0] - a[0]), h = Math.abs(b[1] - a[1]), orient = w >= h ? 'L' : 'P';
    let [pw, ph] = C.PAPER[size]; if (orient === 'P') [pw, ph] = [ph, pw];
    const need = Math.max(w * 1000 / (pw - 20), h * 1000 / (ph - 20));
    const sc = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000].find(s => s >= need) || Math.ceil(need);
    const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
    return { type: 'sheet', size, orient, scale: sc, o: [cx - pw * sc / 2000, cy - ph * sc / 2000, 0], f: {}, layer: '0', _tmp: true };
  };
  C.addCommand(['PLOT', 'YAZDIR', 'PRINT', 'PDF'], 'Paftayı yazdırır / PDF kaydeder (tarayıcının "PDF olarak kaydet" seçeneği)', async (I) => {
    if (cur === 'layout') return C.printLayout(I, false);
    const sh = await pickSheet(I); if (!sh) return;
    const mode = await I.kw('Renk', [['S', 'Siyah-beyaz'], ['R', 'Renkli']], 'S');
    const { svg, w, h } = C.sheetSvg(sh, { mono: mode === 'S' });
    const win = window.open('', '_blank'); if (!win) { C.warn('Açılır pencere engellendi; SVGOUT ile indirebilirsiniz.'); return; }
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(C.doc.set.name)} - 1/${sh.scale}</title><style>@page{size:${w}mm ${h}mm;margin:0}html,body{margin:0;background:#888}svg{display:block;background:#fff;margin:0 auto}@media print{body{background:#fff}}</style></head><body>${svg}<script>setTimeout(()=>print(),400)<\/script></body></html>`);
    win.document.close(); C.log(`Pafta ${sh.size} 1/${sh.scale} yazdırma penceresinde. "Hedef: PDF olarak kaydet" seçerek PDF alabilirsiniz; kağıt boyutu ${sh.size}, kenar boşluğu yok.`);
  }, { noUndo: true });
  C.addCommand(['SVGOUT', 'SVG'], 'Paftayı SVG olarak indirir', async (I) => { const sh = await pickSheet(I); if (!sh) return; download(C.sheetSvg(sh, { mono: true }).svg, base() + '.svg', 'image/svg+xml'); }, { noUndo: true });
  C.addCommand(['VIEW', 'GORUNUM', 'GÖRÜNÜM'], 'Görünüm: PLAN | 3B | HARITA', async (I) => { const v = await I.kw('Görünüm', [['PLAN'], ['3B', '3D'], ['HARITA', 'MAP', 'UYDU']], 'PLAN'); C.setView(v === '3B' ? '3d' : v === 'HARITA' ? 'map' : 'plan'); }, { noUndo: true });
  C.addCommand(['GEOREF', 'KOORDINAT', 'KOORDINATSISTEMI'], 'Koordinat sistemi: KOORDINAT UTM 35 | TM3 33 | YEREL enlem boylam [dönüş] | YOK', async (I) => {
    const g = C.doc.set.geo;
    const m = await I.kw('Sistem', [['UTM'], ['TM3', 'ITRF96'], ['YEREL', 'LOCAL'], ['YOK', 'NONE']], g.mode === 'none' ? 'TM3' : g.mode.toUpperCase());
    if (m === 'UTM') { g.zone = await I.num('UTM dilimi (Türkiye 35-38, Libya 33-35)', g.mode === 'utm' ? g.zone : C.geo.utmZone(map.lon)); g.mode = 'utm'; }
    else if (m === 'TM3') { g.cm = await I.num('Dilim orta meridyeni (27,30,33,36,39,42,45)', g.mode === 'tm3' ? g.cm : C.geo.tm3Cm(map.lon)); g.mode = 'tm3'; }
    else if (m === 'YEREL') { g.lat0 = await I.num('0,0 noktasının enlemi', map.lat); g.lon0 = await I.num('0,0 noktasının boylamı', map.lon); g.rot = await I.num('Çizim X ekseninin doğudan dönüşü (°)', 0); g.mode = 'local'; }
    else g.mode = 'none';
    C.log('Koordinat sistemi: ' + C.geo.describe()); C.emit('geo'); C.changed();
  });

  /* ---------------- hesap araçları (ayrı pencerede) ---------------- */
  const CALC = { ATV131: ['atv-a131.html', 'ATV-A 131 proses hesabı'], BLOWER: ['blower.html', 'Blower hava hesabı'], POMPAHESAP: ['pompa-hidrolik.html', 'Pompa hidrolik hesabı'], MIKSER: ['mikser.html', 'Dalgıç mikser karışım analizi'] };
  for (const [k, [f, t]] of Object.entries(CALC)) C.addCommand([k, k === 'ATV131' ? 'ATV' : k === 'POMPAHESAP' ? 'POMPAHIDROLIK' : k + 'HESAP'], t + ' (ayrı pencerede açılır)', async () => { const w = window.open('app/hesap/' + f, 'hesap_' + k, 'width=1280,height=900'); if (!w) C.warn('Açılır pencere engellendi.'); else C.log(t + ' açıldı.'); }, { noUndo: true });

  /* ---------------- harita kontrolleri ---------------- */
  $('#mapSrc').innerHTML = Object.entries(C.TILES).map(([k, t]) => `<option value="${k}">${t.name}</option>`).join('');
  $('#mapSrc').onchange = e => { map.src = e.target.value; map.dirty = true; };
  $('#mapLabels').onchange = e => { map.labels = e.target.checked; map.dirty = true; };
  const doSearch = async () => {
    const q = $('#mapSearch').value; if (!q.trim()) return; const box = $('#mapResults'); box.textContent = 'Aranıyor…';
    try { const r = await C.geocode(q); box.innerHTML = ''; if (!r.length) box.textContent = 'Sonuç yok'; r.forEach(x => { const b = document.createElement('button'); b.textContent = x.name; b.onclick = () => { map.goTo(x.lat, x.lon, 17); box.innerHTML = ''; }; box.appendChild(b); }); if (r.length === 1) { map.goTo(r[0].lat, r[0].lon, 17); box.innerHTML = ''; } }
    catch (err) { box.textContent = err.message; }
  };
  $('#mapGo').onclick = doSearch; $('#mapSearch').onkeydown = e => { if (e.key === 'Enter') doSearch(); };
  function updateGeoUi() {
    const g = C.doc.set.geo; $('#geoMode').value = g.mode;
    $('#geoZone').classList.toggle('hidden', !(g.mode === 'utm' || g.mode === 'tm3'));
    $('#geoZone').value = g.mode === 'utm' ? g.zone : g.cm;
    $('#geoInfo').textContent = C.geo.describe() + (g.mode === 'none' ? '' : ' — çizim komutları haritada çalışır.');
    syncStatus();
  }
  $('#geoMode').onchange = e => {
    const g = C.doc.set.geo, m = e.target.value;
    if (m === 'utm') { g.zone = C.geo.utmZone(map.lon); } if (m === 'tm3') { g.cm = C.geo.tm3Cm(map.lon); }
    if (m === 'local' && g.mode !== 'local') { g.lat0 = map.lat; g.lon0 = map.lon; g.rot = 0; }
    g.mode = m; C.emit('geo'); C.changed();
  };
  $('#geoZone').onchange = e => { const g = C.doc.set.geo, v = parseInt(e.target.value); if (g.mode === 'utm') g.zone = v; if (g.mode === 'tm3') g.cm = v; C.emit('geo'); C.changed(); };
  $('#geoHere').onclick = () => { const g = C.doc.set.geo; g.mode = 'local'; g.lat0 = map.lat; g.lon0 = map.lon; g.rot = g.rot || 0; C.log(`Çizimin 0,0 noktası ${map.lat.toFixed(6)}, ${map.lon.toFixed(6)} olarak ayarlandı.`); C.emit('geo'); C.changed(); };
  $('#mapToDwg').onclick = () => map.zoomExtents();
  $('#mapMe').onclick = () => { if (!navigator.geolocation) return C.warn('Konum desteklenmiyor'); navigator.geolocation.getCurrentPosition(p => map.goTo(p.coords.latitude, p.coords.longitude, 17), err => C.warn('Konum alınamadı: ' + err.message)); };
  C.on('geo', () => { map.sync(); updateGeoUi(); redraw(); renderProps(); });

  /* ---------------- 3B kontrolleri ---------------- */
  $$('[data-v3]').forEach(b => b.onclick = () => { const k = b.dataset.v3; if (k === 'fit') v3.fit(); else v3.preset(k); });
  $('#v3persp').onchange = e => { v3.persp = e.target.checked; v3.dirty = true; };
  $('#v3edges').onchange = e => { v3.edges = e.target.checked; v3.invalidate(); };
  $('#v3lines').onchange = e => { v3.showLines = e.target.checked; v3.invalidate(); };
  $('#v3plane').onchange = e => { v3.plane = e.target.value; v3.dirty = true; };
  $('#v3help').onclick = () => $('#v3hint').classList.toggle('hidden');
  $('#v3sel').onclick = () => { C.cmd.cancel(); };
  { // 3B görünüm ayarları: arka plan, şeffaflık, doku, ızgara (tarayıcıda hatırlanır)
    const ld = (k, d) => { try { const v = localStorage.getItem('aritmacad.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, sv = (k, v) => { try { localStorage.setItem('aritmacad.' + k, JSON.stringify(v)); } catch (e) { } };
    const rd = () => { const v = C.views && C.views.v3; if (v) { v.dirty = true; if (v.draw && C.currentView === '3d') try { v.draw(); } catch (e) { } } };
    const bg = $('#v3bg'), al = $('#v3alpha'), tx = $('#v3tex'), gr = $('#v3grid');
    C.state.v3bg = ld('v3bg', 'ufuk'); C.state.v3alpha = 0; C.state.v3tex = ld('v3tex', true); C.state.v3grid = ld('v3grid', true);
    if (bg) { bg.value = C.state.v3bg; bg.onchange = () => { C.state.v3bg = bg.value; sv('v3bg', bg.value); rd(); }; }
    if (al) al.oninput = () => { C.state.v3alpha = +al.value; rd(); };
    if (tx) { tx.checked = C.state.v3tex; tx.onchange = () => { C.state.v3tex = tx.checked; sv('v3tex', tx.checked); rd(); }; }
    if (gr) { gr.checked = C.state.v3grid; gr.onchange = () => { C.state.v3grid = gr.checked; sv('v3grid', gr.checked); rd(); }; }
  }
  { const sp = $('#v3orbSp'); if (sp) { try { const v = parseFloat(localStorage.getItem('aritmacad.orbitSpeed')); if (v > 0) { C.state.orbitSpeed = v; sp.value = v; } } catch (e) { } sp.oninput = () => { C.state.orbitSpeed = +sp.value; try { localStorage.setItem('aritmacad.orbitSpeed', sp.value); } catch (e) { } }; } }
  $('#v3snap').onclick = e => openSnapPop(e.currentTarget);
  $('#v3pan') && ($('#v3pan').onclick = () => { v3.panLeft = !v3.panLeft; if (v3.panLeft) { v3.orbitLeft = false; $('#v3orbit').classList.remove('on'); } $('#v3pan').classList.toggle('on', v3.panLeft); v3.cv.style.cursor = v3.panLeft ? 'grab' : ''; C.log(v3.panLeft ? 'Kaydır (el): sol tuşla sürükleyerek ekranı kaydırın. Kapatmak için tekrar basın.' : 'Kaydır modu kapalı.'); });
  $('#v3orbit').onclick = () => { v3.orbitLeft = !v3.orbitLeft; if (v3.orbitLeft && v3.panLeft) { v3.panLeft = false; $('#v3pan') && $('#v3pan').classList.remove('on'); } $('#v3orbit').classList.toggle('on', v3.orbitLeft); C.log(v3.orbitLeft ? 'Sol sürükle: yörünge (döndürme)' : 'Sol sürükle: pencereyle seçim (döndürmek için orta tuş)'); };
  const markTool = () => { const n = C.cmd.running && C.cmd.running.names[0]; $$('#v3tools [data-cmd]').forEach(b => b.classList.toggle('on', !!n && C.cmds[b.dataset.cmd] && C.cmds[b.dataset.cmd].names[0] === n)); };
  C.on('cmdstart', markTool); C.on('cmdend', markTool);
  C.on('selection', () => { if (!v3.failed && cur === '3d') v3.invalidate(); });
  $('#v3elev').onchange = e => { v3.elev = parseFloat(e.target.value) || 0; };
  v3.onCursor = (p, hit) => { if (p) $('#coords').textContent = `${M.fmt(p[0], 3)}, ${M.fmt(p[1], 3)}, ${M.fmt(p[2] || 0, 3)}${hit ? '  [' + ({ end: 'uç', mid: 'orta', cen: 'merkez', qua: 'çeyrek', ins: 'ekleme', int: 'kesişim', per: 'dik', nea: 'en yakın', face: 'arka yüz', fcen: 'yüz merkezi' }[hit.k] || hit.k) + ']' : ''}`; };
  v3.onStats = s => { $('#v3stats').textContent = `${s.tris.toLocaleString('tr-TR')} üçgen · ${s.lines.toLocaleString('tr-TR')} çizgi`; };

  /* ---------------- yan paneller ---------------- */
  $$('#sideTabs button').forEach(b => b.onclick = () => { $$('#sideTabs button').forEach(x => x.classList.toggle('on', x === b)); $$('.pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + b.dataset.p)); if (b.dataset.p === 'layers') renderLayers(); if (b.dataset.p === 'plugins') renderPlugins(); });
  const showPane = p => $(`#sideTabs [data-p=${p}]`).click();
  C.on('openLayers', () => showPane('layers'));

  /* ---------------- modal ---------------- */
  const modal = (title, html) => { $('#mTitle').textContent = title; $('#mBody').innerHTML = html; $('#modal').classList.remove('hidden'); $('#modal .box').classList.toggle('wide', /kütüphane|malzeme|3B model/i.test(title)); return $('#mBody'); };
  const closeModal = () => $('#modal').classList.add('hidden');
  $('#mClose').onclick = closeModal; $('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
  C.modal = modal; C.closeModal = closeModal;

  /* ---------------- sohbet ---------------- */
  const msgs = $('#msgs');
  function addMsg(m) {
    const d = document.createElement('div'); d.className = 'msg ' + m.role;
    d.innerHTML = m.role === 'cmd' ? esc(m.text) : md(m.text);
    const acts = document.createElement('div'); acts.className = 'acts';
    if (m.scripts && m.scripts.length) { const pre = document.createElement('pre'); pre.textContent = m.scripts.join('\n'); d.appendChild(pre); if (!C.settings.autoRun) { const b = document.createElement('button'); b.className = 'pri'; b.textContent = '▶ Çalıştır'; b.onclick = () => C.chat.runScripts(m.scripts); acts.appendChild(b); } }
    if (m.plugin) { const b = document.createElement('button'); b.className = 'pri'; b.textContent = 'Eklentiyi incele / kur'; b.onclick = () => proposePlugin(m.plugin); acts.appendChild(b); }
    if (m.devPrompt) { const b = document.createElement('button'); b.textContent = '📋 İsteği kopyala (claude.ai için)'; b.onclick = async () => { try { await navigator.clipboard.writeText(m.devPrompt); b.textContent = '✓ Kopyalandı — claude.ai\'ye yapıştırın'; } catch (e) { modal('İsteği kopyalayın', `<textarea>${esc(m.devPrompt)}</textarea>`); } }; acts.appendChild(b); const b2 = document.createElement('button'); b2.textContent = 'Gelen kodu yapıştır'; b2.onclick = () => pastePlugin(); acts.appendChild(b2); }
    if (m.restore) { const b = document.createElement('button'); b.className = 'pri'; b.textContent = 'Geri yükle'; b.onclick = () => { C.restore(m.restore); C.emit('doc'); C.emit('zoomExtents'); b.disabled = true; b.textContent = 'Yüklendi'; }; acts.appendChild(b); }
    if (acts.children.length) d.appendChild(acts);
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
  }
  C.on('chatMsg', addMsg);
  C.on('chatBusy', b => { $('#aiState').textContent = b ? 'Claude düşünüyor…' : aiLabel(); $('#btnSend').disabled = b; });
  const aiLabel = () => C.settings.apiKey ? '● Claude bağlı' : '○ Çevrimdışı mod';
  const setMode = m => { C.chat.mode = m; $$('#chatMode button').forEach(b => b.classList.toggle('on', b.dataset.m === m)); $('#chatText').placeholder = m === 'gelistir' ? 'Ör: "Seçtiğim boruların toplam uzunluğunu DN\'e göre tablo yapan bir komut ekle"' : 'Ör: 60 l/s, 3 pompalı pompa istasyonu çiz, giriş kotu -3.5'; };
  $$('#chatMode button').forEach(b => b.onclick = () => setMode(b.dataset.m));
  const sendChat = () => { const t = $('#chatText').value; $('#chatText').value = ''; C.chat.send(t); };
  $('#btnSend').onclick = sendChat;
  $('#chatText').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } });
  function toggleMic() {
    const b = $('#btnMic');
    if (C.voice.active) { C.voice.stop(); return; }
    toggleSide(true); showPane('chat');
    const ok = C.voice.start(t => { $('#chatText').value = t; }, final => { b.classList.remove('rec'); if (final && C.settings.voiceAutoSend) sendChat(); });
    if (ok) b.classList.add('rec');
  }
  $('#btnMic').onclick = toggleMic;
  $('#btnSettings').onclick = () => {
    const s = C.settings;
    const body = modal('Ayarlar', `
      <div class="fld"><label>Adınız (antet/IFC)</label><input id="sName" value="${esc(s.userName)}"></div>
      <div class="fld"><label>Claude API anahtarı</label><input id="sKey" type="password" value="${esc(s.apiKey)}" placeholder="sk-ant-..."></div>
      <div class="fld"><label>Çizim modeli</label><input id="sModel" value="${esc(s.model)}"></div>
      <div class="fld"><label>Geliştir modeli</label><input id="sDev" value="${esc(s.devModel)}"></div>
      <div class="fld"><label>Komutları otomatik çalıştır</label><input id="sAuto" type="checkbox" ${s.autoRun ? 'checked' : ''}></div>
      <div class="fld"><label>Sesli girişte otomatik gönder</label><input id="sVoice" type="checkbox" ${s.voiceAutoSend ? 'checked' : ''}></div>
      <p class="hint">Anahtar yalnızca bu bilgisayarda, tarayıcının yerel deposunda tutulur ve sadece api.anthropic.com'a gönderilir. Anahtarı console.anthropic.com adresinden alabilirsiniz; kullanım ücretlidir. Anahtar olmadan çevrimdışı Türkçe asistan ve tüm çizim komutları çalışır.</p>
      <div class="bar"><button class="pri" id="sSave">Kaydet</button></div>`);
    body.querySelector('#sSave').onclick = () => { s.userName = $('#sName').value.trim(); s.apiKey = $('#sKey').value.trim(); s.model = $('#sModel').value.trim() || 'claude-sonnet-5-5'; s.devModel = $('#sDev').value.trim() || s.model; s.autoRun = $('#sAuto').checked; s.voiceAutoSend = $('#sVoice').checked; C.saveSettings(); $('#aiState').textContent = aiLabel(); closeModal(); };
  };
  $('#btnHelp').onclick = () => modal('Hızlı kılavuz', HELP_HTML);

  /* ---------------- eklentiler ---------------- */
  const pluginEls = {};
  C.pluginApi = p => {
    (pluginEls[p.id] || []).forEach(el => el.remove()); pluginEls[p.id] = [];
    return {
      button(label, cmd, tip) {
        const b = document.createElement('button'); b.title = tip || label; b.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 8v8M8 12h8"/></svg>${esc(label)}`;
        b.onclick = () => C.runTool(cmd); toolsEl.appendChild(b); plugGrp.classList.remove('hidden'); pluginEls[p.id].push(b); return b;
      },
      panel(title, html) { const d = document.createElement('div'); d.className = 'plug'; d.innerHTML = `<div class="t"><b>${esc(title)}</b></div><div class="pb">${html || ''}</div>`; $('#pluginPanels').appendChild(d); pluginEls[p.id].push(d); return d.querySelector('.pb'); },
    };
  };
  function renderPlugins() {
    const el = $('#pluginList'); const list = C.plugins.list();
    el.innerHTML = list.length ? '' : '<p class="hint">Henüz eklenti yok.</p>';
    for (const p of list) {
      const d = document.createElement('div'); d.className = 'plug';
      d.innerHTML = `<div class="t"><input type="checkbox" ${p.enabled ? 'checked' : ''} title="Etkin"><b>${esc(p.name)}</b><button class="ic" data-a="code" title="Kodu gör/düzenle">{ }</button><button class="ic" data-a="exp" title="Dışa aktar">⤓</button><button class="ic" data-a="del" title="Sil">✕</button></div><div class="hint">${esc(p.desc || '')}</div>${p.error ? `<div class="err">${esc(p.error)}</div>` : ''}`;
      d.querySelector('input').onchange = e => { C.plugins.toggle(p.id, e.target.checked); if (!e.target.checked) { (pluginEls[p.id] || []).forEach(x => x.remove()); C.log('Eklenti kapatıldı; eklediği komutlar programı yeniden açınca kalkar.'); } renderPlugins(); };
      d.querySelector('[data-a=code]').onclick = () => proposePlugin(p.code, true);
      d.querySelector('[data-a=exp]').onclick = () => download(p.code, C.ascii(p.name).replace(/\W+/g, '_') + '.js', 'text/javascript');
      d.querySelector('[data-a=del]').onclick = () => { if (confirm(`"${p.name}" silinsin mi?`)) { (pluginEls[p.id] || []).forEach(x => x.remove()); C.plugins.remove(p.id); renderPlugins(); } };
      el.appendChild(d);
    }
  }
  C.on('plugins', renderPlugins);
  function proposePlugin(code, existing) {
    const m = C.plugins.meta(code);
    const body = modal(existing ? 'Eklenti kodu' : 'Yeni eklenti önerisi', `<p><b>${esc(m.name)}</b> — ${esc(m.desc)}</p><p class="hint">Kodu inceleyip düzenleyebilirsiniz. "Kur" dediğinizde kod bu bilgisayarda çalışır ve saklanır; istediğiniz zaman Eklentiler sekmesinden kapatıp silebilirsiniz.</p><textarea id="plCode" spellcheck="false">${esc(code)}</textarea><div class="bar"><button class="pri" id="plOk">${existing ? 'Kaydet ve çalıştır' : 'Kur ve çalıştır'}</button><button id="plNo">Vazgeç</button></div>`);
    body.querySelector('#plNo').onclick = closeModal;
    body.querySelector('#plOk').onclick = () => { const r = C.plugins.install($('#plCode').value); closeModal(); C.emit('chatMsg', { role: 'bot', text: r.ok ? `✓ "${r.p.name}" ${r.replaced ? 'güncellendi' : 'kuruldu'}. Yeni komutlar komut satırında hazır.` : `⚠ "${r.p.name}" kaydedildi ama çalıştırılamadı: ${r.p.error}` }); renderPlugins(); };
  }
  C.on('pluginProposal', code => proposePlugin(code));
  function pastePlugin() {
    const body = modal('Eklenti kodu yapıştır', `<p class="hint">claude.ai'den ya da bir dosyadan aldığınız eklenti kodunu yapıştırın (\`\`\`js blokları otomatik temizlenir).</p><textarea id="plPaste" spellcheck="false"></textarea><div class="bar"><button class="pri" id="plGo">Devam</button></div>`);
    body.querySelector('#plGo').onclick = () => { let c = $('#plPaste').value; const m = c.match(/```(?:js|javascript)?\s*\n([\s\S]*?)```/); if (m) c = m[1]; if (c.trim()) proposePlugin(c.trim()); };
  }
  $('#btnPastePlugin').onclick = pastePlugin;
  $('#btnLoadPlugin').onclick = async () => { const f = await pickFile('.js,.txt'); if (f) proposePlugin(await f.text()); };

  /* ---------------- otomatik kayıt ---------------- */
  C.on('changeIdle', () => { try { const s = C.snapshot(); if (s.length < 4.5e6) localStorage.setItem('aritmacad.autosave', s); } catch (e) { } });

  /* ---------------- yardım ---------------- */
  const HELP_HTML = `
<h3>Çalışma şekli</h3>
<p>AutoCAD gibi: araç çubuğundan bir komut seçin ya da alttaki komut satırına yazın (<code>LINE</code>, <code>L</code>, <code>CIZGI</code>…). Noktaları fareyle tıklayın ya da yazın: <code>10,5</code> mutlak, <code>@3,0</code> göreli, <code>@5&lt;45</code> kutupsal, sadece <code>4</code> = imleç yönünde 4 m. <b>Boşluk/Enter</b> onaylar, <b>Esc</b> iptal, <b>sağ tık</b> = Enter.</p>
<p>Birim <b>metre</b>, Z yukarı. Ölçek (OLCEK 100) yazı, ölçü ve çizgi tipi boyutlarını kağıda göre ayarlar.</p>
<h3>Kısayollar</h3><p>F2 sesli komut · F3 nesne yakalama · F7 ızgara · F8 orto · F9 ızgara yakalama · Ctrl+Z/Y geri/yinele · Ctrl+S kaydet · Ctrl+O aç · Del sil · orta tuş sürükle = kaydır · tekerlek = yakınlaş · Alt+sol sürükle = kaydır</p>
<h3>Arıtma / pompa istasyonu</h3>
<p><code>POMPAISTASYONU 0,0 Q=60 N=3 Z=10 ZG=0 ZIN=-3.5 DIN=300</code> → ıslak hazne, vana odası, pompalar, çekvalf + sürgülü vanalar, kollektör, giriş borusu, A-A kesiti, su seviyeleri, kotlar, ölçüler, hesap özeti ve pafta.<br>
<code>HAVUZ</code>, <code>DHAVUZ</code>, <code>DUVAR K=0.3 Y=3</code>, <code>BORU DN=200 Z=-1.5</code>, <code>POMPA</code>, <code>VANA</code>, <code>KOT</code>, <code>HAZNEHESAP</code>, <code>BORUHESAP</code>.</p>
<h3>Sohbet ve ses</h3><p>Sağdaki sohbete Türkçe yazın ya da 🎤 ile söyleyin. Anahtarsız çevrimdışı mod sık istekleri anlar; Claude API anahtarı girerseniz serbest istekleri komutlara çevirir. <b>Geliştir</b> modunda programa yeni komut ve özellik ekletebilirsiniz.</p>
<h3>Dosyalar</h3><p><b>DXF 2000</b> (katman, renk, çizgi tipi, kalınlık; parametrik nesneler blok olarak, 3B gövdeler <code>_3B</code> katmanlarında) · <b>DXF R12</b> · <b>IFC4</b> Revit/BIM · <b>STL</b> 3B yazıcı · <b>OBJ</b> · <b>KMZ/KML</b> Google Earth · <b>Yazdır/PDF</b> paftadan.</p>
<h3>Harita</h3><p>Harita sekmesinde sahayı arayın, koordinat sistemini seçin (TM3/UTM ya da "Merkezi orijin yap"). Sonra tüm çizim komutları uydu görüntüsü üzerinde çalışır; çizdikleriniz Google Earth'e KMZ olarak gider.</p>`;

  /* ---------------- başlat ---------------- */
  fillCurrent(); renderLayers(); renderProps(); syncStatus(); updateGeoUi();
  C.plugins.loadAll(); renderPlugins();
  $('#aiState').textContent = aiLabel();
  C.emit('prompt', 'Komut:');
  setTimeout(() => { plan.resize(); plan.zoomExtents(); }, 30);
  addMsg({ role: 'bot', text: `Merhaba${C.settings.userName ? ' ' + C.settings.userName : ''}! Çizmek istediğinizi yazın ya da 🎤 ile söyleyin.\nÖrnek: **"60 l/s, 3 pompalı pompa istasyonu çiz, giriş kotu -3.5"**\n"yardım" yazarak örnekleri görebilirsiniz.` });
  try { const s = localStorage.getItem('aritmacad.autosave'); if (s && JSON.parse(s).ents.length) addMsg({ role: 'bot', text: 'Önceki oturumdan kaydedilmemiş bir çalışma bulundu.', restore: s }); } catch (e) { }
  C.VERSION = '2026.11.05j';
  C.log(`ArıtmaCAD hazır (sürüm ${C.VERSION} — yeni: KORKULUK, SU, eleman tarayıcısı, 3B yüz okları, MERDIVEN (beton / ızgara / CTP, L-U-helezon, korkuluk), malzeme dokusu MALZEME (tuğla, beton, taş, kendi resminiz + bump), 3B'de + / − / Home ile yakınlaştırma, çizgiden yapı elemanı ELEMANYAP, özellikler penceresinden geometri düzenleme, mekanik kaba ızgara). YARDIM yazarak komutları görebilirsiniz.`);
  cmdIn.focus();
  C.views = { plan, map, v3, lay };
})(window.C);

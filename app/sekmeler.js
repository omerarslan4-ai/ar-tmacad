/* ArıtmaCAD — ÇİZİM SEKMELERİ (AutoCAD dosya sekmeleri gibi): birden fazla çizim aynı anda açık.
   Her sekmenin kendi çizimi, geri al / yinele geçmişi, kayıt durumu, dosya bağlantısı ve görünümü (plan / 3B / pafta, yakınlık) vardır.
   Aç / Yeni, mevcut çizim boş değilse yeni sekmede açılır. Sekmeye tıklayınca geçilir; × ile kapanır (kaydedilmemişse sorulur).
   Ctrl+Tab / Ctrl+Shift+Tab: sonraki / önceki sekme. Orta tuş: sekmeyi kapat. */
(function (C) {
  'use strict';
  if (typeof document === 'undefined') return;
  const $ = s => document.querySelector(s), E = C.cmd;
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const views = document.querySelector('#views'); if (!views) return;

  /* ---- yerleşim: çizim alanının içeriği iç kapsayıcıya, üstte sekme çubuğu ---- */
  const bar = document.createElement('div'); bar.id = 'docTabs'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'Açık çizimler');
  const inner = document.createElement('div'); inner.id = 'viewsIn';
  while (views.firstChild) inner.appendChild(views.firstChild);
  views.appendChild(bar); views.appendChild(inner);
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n !== bar && n !== inner && n.parentElement === views) inner.appendChild(n); }).observe(views, { childList: true });
  const st = document.createElement('style'); st.textContent = `
#docTabs{position:absolute;left:0;right:0;top:0;height:28px;display:flex;align-items:stretch;gap:1px;background:#15181d;border-bottom:1px solid #2c323b;overflow-x:auto;overflow-y:hidden;z-index:6;scrollbar-width:thin}
#viewsIn{position:absolute;left:0;right:0;top:28px;bottom:0}
#docTabs .dt{display:flex;align-items:center;gap:6px;padding:0 6px 0 12px;max-width:240px;min-width:90px;background:#1f242b;color:#aab3bd;border:0;border-right:1px solid #2c323b;font-size:12.5px;cursor:pointer;white-space:nowrap}
#docTabs .dt span.n{overflow:hidden;text-overflow:ellipsis}
#docTabs .dt.on{background:#2a313b;color:#fff;box-shadow:inset 0 2px 0 #4a90e2}
#docTabs .dt:hover{color:#fff}
#docTabs .dt .x{width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;color:#8d97a3;background:transparent;border:0;cursor:pointer;font-size:13px;padding:0}
#docTabs .dt .x:hover{background:#3a4250;color:#fff}
#docTabs .add{min-width:30px;background:transparent;color:#aab3bd;border:0;font-size:16px;cursor:pointer}
#docTabs .add:hover{color:#fff;background:#2a313b}`;
  document.head.appendChild(st);
  const relayout = () => { try { const V = C.views || {}; for (const k of ['plan', 'lay', 'map']) if (V[k] && V[k].resize) { V[k].resize(); V[k].dirty = true; } if (V.v3 && !V.v3.failed && V.v3.resize) { V.v3.resize(); V.v3.dirty = true; } } catch (er) { } };
  setTimeout(relayout, 0); setTimeout(relayout, 300);

  /* ---- sekme kayıtları ---- */
  let tabs = [], act = 0, seq = 1;
  const rec0 = () => ({ id: seq++, doc: null, undo: [], redo: [], lastFormat: null, fileHandle: null, projHandle: null, dwgHandle: null, dirty: false, vs: null });
  const viewState = () => { const V = C.views || {}, p = V.plan, v3 = V.v3; return { view: C.currentView, plan: p ? { cx: p.cx, cy: p.cy, s: p.s, rot: p.rot } : null, v3: v3 ? { yaw: v3.yaw, pitch: v3.pitch, dist: v3.dist, t: v3.t && v3.t.slice(), elev: v3.elev } : null, layoutIdx: C.layoutIdx, grpCur: C.grpCur, planSv: C.state.planSv }; };
  const putViewState = vs => { if (!vs) { setTimeout(() => C.emit('zoomExtents'), 30); return; } const V = C.views || {};
    if (vs.view && vs.view !== C.currentView && C.setView) { try { C.setView(vs.view === 'layout' && !(C.doc.layouts || []).length ? 'plan' : vs.view); } catch (er) { } }
    if (vs.plan && V.plan) Object.assign(V.plan, vs.plan, { dirty: true }); if (vs.v3 && V.v3) { Object.assign(V.v3, vs.v3); V.v3.dirty = true; V.v3.needBuild = true; }
    if (vs.layoutIdx != null && (C.doc.layouts || [])[vs.layoutIdx]) C.layoutIdx = vs.layoutIdx; if (vs.grpCur !== undefined) C.grpCur = vs.grpCur; C.state.planSv = vs.planSv || null; C.emit('layouts'); };
  const saveCur = () => { const r = tabs[act]; if (!r) return; Object.assign(r, { doc: C.doc, undo: C.undoStack, redo: C.redoStack, lastFormat: C.lastFormat, fileHandle: C.fileHandle, projHandle: C.projHandle, dwgHandle: C.dwgHandle, dirty: C.isDirty ? C.isDirty() : false, vs: viewState() }); };
  const loadRec = r => {
    C.doc = r.doc; C.undoStack = r.undo || []; C.redoStack = r.redo || []; C.lastFormat = r.lastFormat; C.fileHandle = r.fileHandle; C.projHandle = r.projHandle; C.dwgHandle = r.dwgHandle;
    C.sel = []; C.activeVp = null; C.langReset && C.langReset();
    C.emit('doc'); C.emit('layers'); C.emit('selection'); C.changed();
    C.savedRev = r.dirty ? -1 : C.rev;
    setTimeout(() => { putViewState(r.vs); C.emit('layers'); render(); C.emit('doc:sekme'); }, 0);
  };
  const busy = () => { if (E.running) { C.warn('Önce çalışan komutu bitirin ya da Esc ile iptal edin.'); return true; } if (C.vpEdit && C.vpEditExit) C.vpEditExit(); return false; };
  C.docTabs = {
    list: () => tabs, active: () => act,
    gec: i => { if (i === act || !tabs[i] || busy()) return false; saveCur(); act = i; loadRec(tabs[i]); return true; },
    yeni: () => { if (busy()) return false; saveCur(); const r = rec0(); tabs.push(r); act = tabs.length - 1; C.newDoc(); C.undoStack = []; C.redoStack = []; C.lastFormat = null; C.fileHandle = null; C.projHandle = null; C.dwgHandle = null; C.markSaved && C.markSaved(); C.emit('doc'); setTimeout(() => { C.emit('zoomExtents'); render(); }, 30); render(); return true; },
    /* dosya açmadan önce: mevcut çizim boş ve kaydedilmişse aynı sekme, değilse yeni sekme */
    acmaIcin: () => { const empty = !C.doc.ents.length && !(C.doc.layouts || []).length && !(C.isDirty && C.isDirty()); if (empty) return true; return C.docTabs.yeni(); },
    kapat: async i => {
      if (!tabs[i]) return; if (i !== act && !C.docTabs.gec(i)) return; if (busy()) return;
      if (C.askSave && !(await C.askSave(`"${C.doc.set.name || 'Adsiz'}" kapanmadan önce`))) return;
      tabs.splice(act, 1);
      if (!tabs.length) { tabs.push(rec0()); act = 0; C.newDoc(); C.undoStack = []; C.redoStack = []; C.lastFormat = null; C.fileHandle = C.projHandle = C.dwgHandle = null; C.markSaved && C.markSaved(); C.emit('doc'); render(); return; }
      act = Math.min(act, tabs.length - 1); loadRec(tabs[act]); render();
    },
  };
  /* ---- çubuk ---- */
  const name = (r, i) => { const d = i === act ? C.doc : r.doc, nm = (d && d.set && d.set.name) || 'Adsiz', dirty = i === act ? (C.isDirty && C.isDirty()) : r.dirty; return { nm, dirty }; };
  const render = () => {
    if (!tabs.length) { tabs.push(rec0()); act = 0; }
    bar.innerHTML = tabs.map((r, i) => { const { nm, dirty } = name(r, i); return `<div class="dt ${i === act ? 'on' : ''}" role="tab" aria-selected="${i === act}" tabindex="0" data-i="${i}" title="${esc(nm)}${dirty ? ' — kaydedilmemiş değişiklik var' : ''}"><span class="n">${esc(nm)}${dirty ? ' *' : ''}</span><button class="x" data-x="${i}" aria-label="${esc(nm)} sekmesini kapat" title="Kapat">✕</button></div>`; }).join('') + `<button class="add" data-add title="Yeni çizim (yeni sekme)" aria-label="Yeni çizim sekmesi">+</button>`;
    bar.querySelectorAll('.dt').forEach(el => { const i = +el.dataset.i; el.onclick = ev => { if (ev.target.closest('[data-x]')) return; C.docTabs.gec(i); }; el.onauxclick = ev => { if (ev.button === 1) { ev.preventDefault(); C.docTabs.kapat(i); } }; el.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); C.docTabs.gec(i); } }; });
    bar.querySelectorAll('[data-x]').forEach(b => b.onclick = ev => { ev.stopPropagation(); C.docTabs.kapat(+b.dataset.x); });
    bar.querySelector('[data-add]').onclick = () => C.docTabs.yeni();
    const on = bar.querySelector('.dt.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  let rt = null; const later = () => { clearTimeout(rt); rt = setTimeout(render, 150); };
  C.on('doc', later); C.on('changeIdle', later); C.on('change', later);
  document.addEventListener('keydown', ev => { if (ev.ctrlKey && ev.key === 'Tab' && tabs.length > 1) { ev.preventDefault(); C.docTabs.gec((act + (ev.shiftKey ? tabs.length - 1 : 1)) % tabs.length); } }, true);
  window.addEventListener('beforeunload', ev => { if (tabs.some((r, i) => i !== act && r.dirty)) { ev.preventDefault(); ev.returnValue = 'Kaydedilmemiş çizim sekmeleri var.'; } });
  C.addCommand(['SEKMEKAPAT', 'CIZIMKAPAT', 'CLOSE'], 'Açık çizim sekmesini kapatır (kaydedilmemişse sorar).', () => C.docTabs.kapat(act), { noUndo: true });
  C.addCommand(['SEKMEYENI', 'YENISEKME'], 'Yeni çizim sekmesi açar.', () => C.docTabs.yeni(), { noUndo: true });
  /* ---- sekmeler arası pano: Ctrl+C seçimi kopyalar, Ctrl+V aynı koordinatlara yapıştırır (AutoCAD PASTEORIG gibi) ---- */
  let pano = null;
  const cleanE = e => { const o = {}; for (const k in e) if (k[0] !== '_') o[k] = k === 'parts' && Array.isArray(e[k]) ? e[k].map(cleanE) : e[k]; return o; };
  C.addCommand(['KOPYALAPANO', 'COPYCLIP'], 'Seçili nesneleri panoya kopyalar (başka çizim sekmesine yapıştırmak için Ctrl+V).', () => {
    if (!C.sel.length) { C.warn('Önce nesne seçin.'); return; }
    const ents = C.sel.map(e => JSON.parse(JSON.stringify(cleanE(e))));
    const lay = {}, blk = {}; for (const e of ents) { if (C.doc.layers[e.layer]) lay[e.layer] = C.doc.layers[e.layer]; }
    for (const k in (C.doc.blocks || {})) blk[k] = C.doc.blocks[k];
    pano = { ents, layers: JSON.parse(JSON.stringify(lay)), blocks: JSON.parse(JSON.stringify(blk)), from: C.doc.set.name || 'Adsiz' };
    C.log(`${ents.length} nesne panoya kopyalandı. Başka sekmede Ctrl+V ile aynı koordinatlara yapıştırılır.`);
  }, { noUndo: true });
  C.addCommand(['YAPISTIR', 'PASTECLIP', 'PASTEORIG'], 'Panodaki nesneleri aynı koordinatlara yapıştırır (eksik katman ve bloklar da gelir).', () => {
    if (!pano || !pano.ents.length) { C.warn('Pano boş. Önce Ctrl+C ile kopyalayın.'); return; }
    for (const k in pano.layers) if (!C.doc.layers[k]) C.doc.layers[k] = JSON.parse(JSON.stringify(pano.layers[k]));
    C.doc.blocks = C.doc.blocks || {}; for (const k in pano.blocks) if (!C.doc.blocks[k]) C.doc.blocks[k] = JSON.parse(JSON.stringify(pano.blocks[k]));
    const map = new Map(), out = [];
    for (const s of pano.ents) { const e = JSON.parse(JSON.stringify(s)); const old = e.id; e.id = C.doc.nextId++; map.set(old, e.id); delete e.canli; out.push(e); }
    for (const e of out) for (const k of ['host', 'parent', 'wall', 'ref', 'grp']) if (typeof e[k] === 'number' && map.has(e[k])) e[k] = map.get(e[k]);
    for (const e of out) C.add(e);
    C.sel = out; C.emit('layers'); C.emit('selection'); C.changed();
    C.log(`${out.length} nesne yapıştırıldı ("${pano.from}" çiziminden).`);
  });
  document.addEventListener('keydown', ev => {
    if (!(ev.ctrlKey || ev.metaKey) || ev.shiftKey || ev.altKey) return;
    const k = ev.key.toLowerCase(); if (k !== 'c' && k !== 'v') return;
    const ae = document.activeElement; if (ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT' || ae.isContentEditable || (ae.tagName === 'INPUT' && (ae.id !== 'cmd' || ae.value)))) return;
    if (window.getSelection && String(window.getSelection())) return;
    if (E.running) return;
    if (k === 'c' && C.sel.length) { ev.preventDefault(); E.run('KOPYALAPANO'); }
    else if (k === 'v' && pano) { ev.preventDefault(); E.run('YAPISTIR'); }
  }, true);
  render();
})(window.C);

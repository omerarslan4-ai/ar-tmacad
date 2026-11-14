/* ArıtmaCAD — Alt sekme çubuğu (AutoCAD Model / Layout mantığı)
   [Tasarım] = model (çizim alanı) · disiplin grupları: Mimari, Mekanik, Statik, Elektrik, Genel (eklenir, adı değiştirilir, silinir)
   Bir gruba tıklayınca o grubun paftaları ikinci sırada sekme olarak açılır; pafta = düzen (layout).
   Çift tık: yeniden adlandır · sağ tık: menü (yeniden adlandır / kopyala / sil / sola-sağa taşı) · "+": yeni grup ya da yeni pafta.
   Veri: C.doc.set.grups = ['Mimari', …] (sıra), her düzende L.grp = grup adı. */
(function (C) {
  'use strict';
  const DEF = ['Mimari', 'Mekanik', 'Statik', 'Elektrik', 'Genel'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lays = () => (C.doc && C.doc.layouts) || [];
  const grups = () => {
    const s = C.doc.set; if (!Array.isArray(s.grups) || !s.grups.length) s.grups = DEF.slice();
    for (const L of lays()) { if (!L.grp) L.grp = C.grpCur || 'Genel'; if (!s.grups.includes(L.grp)) s.grups.push(L.grp); }
    return s.grups;
  };
  const inGrp = g => lays().map((L, i) => ({ L, i })).filter(o => o.L.grp === g);
  const pad = n => String(n).padStart(2, '0');
  const nextName = g => { const used = new Set(inGrp(g).map(o => o.L.name)); let n = inGrp(g).length + 1; while (used.has(`${g}-${pad(n)}`)) n++; return `${g}-${pad(n)}`; };
  C.grpCur = null; // null = Tasarım (model)

  /* yeni düzenler etkin gruba girer, adı "Statik-01" gibi */
  const nl0 = C.newLayout;
  C.newLayout = function (name, size, orient) { const g = C.grpCur || (grups(), 'Genel'); const L = nl0.call(this, name || nextName(g), size, orient); L.grp = g; return L; };

  /* ---------- çubuk ---------- */
  const css = document.createElement('style');
  css.textContent = `
#layBar{display:flex;align-items:stretch;gap:2px;padding:2px 8px 0;background:#101318;border-top:1px solid var(--line);font-size:12px;overflow-x:auto;white-space:nowrap;scrollbar-width:thin}
#layBar .lt{border:1px solid var(--line);border-bottom:none;border-radius:5px 5px 0 0;background:var(--panel2);color:var(--mut);padding:3px 11px;cursor:pointer;user-select:none;flex:none}
#layBar .lt:hover{color:var(--tx)}
#layBar .lt.on{background:var(--panel);color:var(--tx);border-color:var(--acc);box-shadow:inset 0 2px 0 var(--acc)}
#layBar .lt.model{font-weight:600}
#layBar .lt.add{padding:3px 8px;font-weight:700}
#layBar .sep{width:1px;background:var(--line);margin:3px 6px;flex:none}
#layBar .sub{display:flex;gap:2px;align-items:stretch}
#layBar .sub .lt{font-size:11.5px;padding:3px 9px}
#layBar .sub .lt.on{box-shadow:inset 0 2px 0 var(--ok);border-color:var(--ok)}
#layBar input.ren{font-size:12px;width:120px;padding:1px 4px;margin:1px 0}
#layMenu{position:fixed;z-index:9999;background:var(--panel);border:1px solid var(--line);border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.45);padding:4px;min-width:170px;font-size:12.5px}
#layMenu button{display:block;width:100%;text-align:left;background:none;border:none;color:var(--tx);padding:5px 10px;border-radius:4px;cursor:pointer}
#layMenu button:hover{background:var(--panel2)}
#layMenu button.del{color:#ff7b72}
#layMenu hr{border:none;border-top:1px solid var(--line);margin:3px 0}`;
  document.head.appendChild(css);
  const bar = document.createElement('div'); bar.id = 'layBar';
  const foot = document.getElementById('bottom'), st = document.getElementById('status');
  if (foot) { if (st && st.parentNode === foot) foot.insertBefore(bar, st); else foot.appendChild(bar); }

  const isModel = () => C.currentView !== 'layout';
  const openLayout = i => { C.layoutIdx = i; C.layoutSel = null; C.activeVp = null; const L = lays()[i]; if (L) C.grpCur = L.grp; if (C.currentView !== 'layout') C.setView('layout'); else { C.emit('layouts'); if (C.views && C.views.lay) { C.views.lay.zoomExtents(); C.views.lay.dirty = true; } } render(); };
  /* gruba tıklama: o disiplinin çalışma alanı — üst şerit o sekmeye geçer (ör. Mekanik), paftaları yanında listelenir; görünüm değişmez */
  const openGroup = g => {
    C.grpCur = g; if (C.ribbon && C.ribbon.tabs && C.ribbon.tabs.some(t => t[0] === g)) C.ribbon.select(g);
    if (C.currentView === 'layout') { const it = inGrp(g); if (it.length) { const curL = lays()[C.layoutIdx]; openLayout(curL && curL.grp === g ? C.layoutIdx : it[0].i); return; } C.setView('plan'); }
    render();
  };

  /* yerinde yeniden adlandırma */
  const rename = (el, old, done) => {
    const inp = document.createElement('input'); inp.className = 'ren'; inp.value = old; el.replaceWith(inp); inp.focus(); inp.select();
    let fin = false; const end = ok => { if (fin) return; fin = true; const v = inp.value.trim(); inp.remove(); if (ok && v && v !== old) done(v); render(); };
    inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') end(true); else if (e.key === 'Escape') end(false); };
    inp.onblur = () => end(true);
  };
  const renameGroup = (g, v) => { const s = grups(); if (s.includes(v)) { C.warn(`"${v}" adında bir grup zaten var.`); return; } C.undoStack && C.undoStack.push(C.snapshot()); s[s.indexOf(g)] = v; for (const L of lays()) if (L.grp === g) L.grp = v; if (C.grpCur === g) C.grpCur = v; C.changed(); C.emit('layouts'); C.log(`Grup adı: ${g} → ${v}`); };
  const renameLayout = (i, v) => { const L = lays()[i]; if (!L) return; C.undoStack && C.undoStack.push(C.snapshot()); const o = L.name; L.name = v; C.changed(); C.emit('layouts'); C.log(`Pafta adı: ${o} → ${v}`); };
  const confirmBox = (title, msg, ok) => { const b = C.modal(title, `<p>${msg}</p><div class="bar" style="justify-content:flex-end"><button id="lyNo">Vazgeç</button><button id="lyYes" class="pri">Sil</button></div>`); b.querySelector('#lyNo').onclick = () => C.closeModal(); b.querySelector('#lyYes').onclick = () => { C.closeModal(); ok(); }; };
  const delGroup = g => {
    const it = inGrp(g);
    confirmBox('Grubu sil', `<b>${esc(g)}</b> grubu${it.length ? ` ve içindeki <b>${it.length} pafta</b>` : ''} silinsin mi? (Ctrl+Z ile geri alınır; modeldeki çizim silinmez.)`, () => {
      C.undoStack && C.undoStack.push(C.snapshot()); const s = grups(); s.splice(s.indexOf(g), 1); C.doc.layouts = lays().filter(L => L.grp !== g); if (!s.length) s.push('Genel');
      if (C.grpCur === g) { C.grpCur = null; C.setView('plan'); } C.layoutIdx = 0; C.changed(); C.emit('layouts'); render(); C.log(`"${g}" grubu silindi.`);
    });
  };
  const delLayout = i => { const L = lays()[i]; if (!L) return; confirmBox('Paftayı sil', `<b>${esc(L.name)}</b> paftası silinsin mi? (Ctrl+Z ile geri alınır; modeldeki çizim silinmez.)`, () => {
    C.undoStack && C.undoStack.push(C.snapshot()); const g = L.grp; lays().splice(i, 1); const rest = inGrp(g); C.layoutIdx = rest.length ? rest[Math.min(rest.length - 1, Math.max(0, rest.findIndex(o => o.i >= i)))].i : 0;
    C.changed(); C.emit('layouts'); if (!rest.length) { C.setView('plan'); C.grpCur = g; } render(); C.log(`"${L.name}" paftası silindi.`); }); };
  const copyLayout = i => { const L = lays()[i]; if (!L) return; C.undoStack && C.undoStack.push(C.snapshot()); const c = JSON.parse(JSON.stringify(L)); c.name = nextName(L.grp); lays().splice(i + 1, 0, c); C.changed(); C.log(`"${L.name}" kopyalandı → ${c.name}`); openLayout(i + 1); };
  const moveLayout = (i, d) => { const it = inGrp(lays()[i].grp).map(o => o.i), k = it.indexOf(i), j = it[k + d]; if (j == null) return; const a = lays(); [a[i], a[j]] = [a[j], a[i]]; C.changed(); openLayout(j); };
  const moveGroup = (g, d) => { const s = grups(), k = s.indexOf(g), j = k + d; if (j < 0 || j >= s.length) return; [s[k], s[j]] = [s[j], s[k]]; C.changed(); render(); };
  const moveToGroup = (i, g) => { const L = lays()[i]; C.undoStack && C.undoStack.push(C.snapshot()); L.grp = g; C.changed(); C.emit('layouts'); C.log(`"${L.name}" → ${g} grubuna taşındı.`); openLayout(i); };

  /* sağ tık menüsü */
  let menu = null; const closeMenu = () => { if (menu) { menu.remove(); menu = null; } };
  document.addEventListener('pointerdown', e => { if (menu && !menu.contains(e.target)) closeMenu(); }, true);
  const showMenu = (x, y, items) => {
    closeMenu(); menu = document.createElement('div'); menu.id = 'layMenu';
    menu.innerHTML = items.map((it, k) => it === '-' ? '<hr>' : `<button data-k="${k}" class="${it.cls || ''}">${it.t}</button>`).join('');
    document.body.appendChild(menu); const r = menu.getBoundingClientRect(); menu.style.left = Math.min(x, innerWidth - r.width - 6) + 'px'; menu.style.top = Math.max(6, y - r.height) + 'px';
    menu.onclick = e => { const b = e.target.closest('button[data-k]'); if (!b) return; const it = items[+b.dataset.k]; closeMenu(); it.f(); };
  };

  function render() {
    if (!C.doc || bar.querySelector('input.ren')) return; const s = grups(), model = isModel(), cl = lays()[C.layoutIdx];
    const activeG = model ? C.grpCur : (cl ? cl.grp : C.grpCur);
    let h = `<div class="lt model ${model ? 'on' : ''}" data-a="model" title="Tasarım (model): çizim alanı">Tasarım</div>`;
    h += s.map(g => `<div class="lt ${activeG === g ? 'on' : ''}" data-a="grp" data-g="${esc(g)}" title="${esc(g)} paftaları (${inGrp(g).length}) — çift tık: yeniden adlandır, sağ tık: menü">${esc(g)}</div>`).join('');
    h += `<div class="lt add" data-a="addgrp" title="Yeni grup (disiplin) ekle">+</div>`;
    const g = activeG;
    if (g) {
      h += `<div class="sep"></div><div class="sub">` + inGrp(g).map(o => `<div class="lt ${!model && o.i === C.layoutIdx ? 'on' : ''}" data-a="lay" data-i="${o.i}" title="${esc(adG(o.L))} — ${o.L.size === 'OZEL' ? 'özel' : o.L.size} · çift tık: yeniden adlandır, sağ tık: menü">${esc(adG(o.L))}</div>`).join('')
        + `<div class="lt add" data-a="addlay" data-g="${esc(g)}" title="${esc(g)} grubuna yeni pafta">+ Pafta</div></div>`;
    }
    bar.innerHTML = h;
  }
  C.renderLayBar = render;
  /* sekmede gösterilen ad: proje dili İngilizce iken çevrilir (C.txL); kayıtlı ad (L.name) Türkçe kalır, yeniden adlandırma onu düzenler */
  function adG(L) { return C.txL ? C.txL(L.name) : L.name; }

  let clk = null;
  bar.addEventListener('click', e => {
    const t = e.target.closest('.lt'); if (!t || e.detail > 1) return; const a = t.dataset.a;
    if (a === 'grp' || a === 'lay') { clearTimeout(clk); const d = Object.assign({}, t.dataset); clk = setTimeout(() => { clk = null; if (d.a === 'grp') openGroup(d.g); else openLayout(+d.i); }, 230); return; }
    if (a === 'model') { C.setView('plan'); render(); }
    else if (a === 'grp') openGroup(t.dataset.g);
    else if (a === 'lay') openLayout(+t.dataset.i);
    else if (a === 'addgrp') { const s = grups(); let n = 1; while (s.includes('Grup ' + n)) n++; const nm = 'Grup ' + n; s.push(nm); C.changed(); render(); const el = [...bar.querySelectorAll('.lt[data-a=grp]')].find(x => x.dataset.g === nm); if (el) rename(el, nm, v => renameGroup(nm, v)); }
    else if (a === 'addlay') { C.grpCur = t.dataset.g; C.undoStack && C.undoStack.push(C.snapshot()); C.newLayout(); C.changed(); openLayout(lays().length - 1); }
  });
  bar.addEventListener('dblclick', e => {
    clearTimeout(clk); clk = null; const t = e.target.closest('.lt'); if (!t) return;
    if (t.dataset.a === 'grp') { const g = t.dataset.g; rename(t, g, v => renameGroup(g, v)); }
    else if (t.dataset.a === 'lay') { const i = +t.dataset.i; rename(t, lays()[i].name, v => renameLayout(i, v)); }
  });
  bar.addEventListener('contextmenu', e => {
    const t = e.target.closest('.lt'); if (!t) return; e.preventDefault();
    if (t.dataset.a === 'grp') { const g = t.dataset.g; showMenu(e.clientX, e.clientY, [
      { t: 'Aç', f: () => openGroup(g) }, { t: 'Yeniden adlandır', f: () => { const el = [...bar.querySelectorAll('.lt[data-a=grp]')].find(x => x.dataset.g === g); if (el) rename(el, g, v => renameGroup(g, v)); } },
      { t: 'AutoCAD dosyası olarak kaydet (DXF → DWG)…', f: () => C.exportGroups && C.exportGroups([g]) },
      { t: 'Yeni pafta ekle', f: () => { C.grpCur = g; C.undoStack && C.undoStack.push(C.snapshot()); C.newLayout(); C.changed(); openLayout(lays().length - 1); } },
      { t: '◀ Sola taşı', f: () => moveGroup(g, -1) }, { t: 'Sağa taşı ▶', f: () => moveGroup(g, 1) }, '-',
      { t: 'Grubu sil', cls: 'del', f: () => delGroup(g) }]); }
    else if (t.dataset.a === 'lay') { const i = +t.dataset.i, L = lays()[i]; showMenu(e.clientX, e.clientY, [
      { t: 'Aç', f: () => openLayout(i) }, { t: 'Yeniden adlandır', f: () => { const el = bar.querySelector(`.lt[data-a=lay][data-i="${i}"]`); if (el) rename(el, L.name, v => renameLayout(i, v)); } },
      { t: 'Kopyala', f: () => copyLayout(i) }, { t: '◀ Sola taşı', f: () => moveLayout(i, -1) }, { t: 'Sağa taşı ▶', f: () => moveLayout(i, 1) },
      ...grups().filter(g => g !== L.grp).map(g => ({ t: `→ ${esc(g)} grubuna taşı`, f: () => moveToGroup(i, g) })), '-',
      { t: 'Paftayı sil', cls: 'del', f: () => delLayout(i) }]); }
    else if (t.dataset.a === 'model') showMenu(e.clientX, e.clientY, [{ t: 'Tasarım (model) — çizim alanı', f: () => C.setView('plan') }]);
  });

  /* görünüm değişince / düzenler değişince çubuğu yenile */
  const sv = C.setView; C.setView = function (v) { const r = sv.apply(this, arguments); if (v !== 'layout') { /* model */ } else { const L = lays()[C.layoutIdx]; if (L) C.grpCur = L.grp; } render(); return r; };
  C.on('layouts', render); C.on('doc', () => { C.grpCur = null; render(); });
  { let rq = 0; C.on('change', () => { if (rq) return; rq = requestAnimationFrame(() => { rq = 0; render(); }); }); }
  /* üstteki "Plan" sekmesinin adı: Tasarım */
  const pb = document.querySelector('#viewTabs [data-view=plan]'); if (pb) { pb.textContent = 'Tasarım'; pb.title = 'Tasarım (model): çizim alanı'; }
  setTimeout(render, 0);

  /* komut: PAFTAGRUP [YENI ad | AD eski yeni | SIL ad | LISTE] */
  C.addCommand(['PAFTAGRUP', 'DISIPLIN', 'SEKMEGRUP'], 'Alt sekme grupları (Mimari, Mekanik, Statik, Elektrik, Genel …): PAFTAGRUP YENI ad · PAFTAGRUP AD eski yeni · PAFTAGRUP SIL ad · PAFTAGRUP LISTE. Sekmeye çift tıklayarak da adlandırabilir, sağ tıkla silebilirsiniz.', async (I) => {
    const op = C.up(String((await I.str('İşlem [YENI / AD / SIL / LISTE]', 'LISTE')) || 'LISTE'));
    const s = grups();
    if (op === 'YENI') { const n = await I.str('Grup adı', 'Grup ' + (s.length + 1)); if (n && !s.includes(n)) { s.push(n); C.changed(); render(); C.log(`"${n}" grubu eklendi.`); } }
    else if (op === 'AD') { const o = await I.str('Eski ad', C.grpCur || s[0]); const n = await I.str('Yeni ad', o); if (o && n && s.includes(o)) renameGroup(o, n); }
    else if (op === 'SIL') { const o = await I.str('Silinecek grup', C.grpCur || ''); if (o && s.includes(o)) { C.undoStack && C.undoStack.push(C.snapshot()); s.splice(s.indexOf(o), 1); C.doc.layouts = lays().filter(L => L.grp !== o); if (!s.length) s.push('Genel'); C.layoutIdx = 0; C.changed(); C.emit('layouts'); C.log(`"${o}" grubu silindi.`); } }
    else s.forEach(g => C.log(`${g}: ${inGrp(g).map(o => o.L.name).join(', ') || '(pafta yok)'}`));
  });
})(window.C);
/* ölçü birimi: Tasarım cm · Mimari / Statik cm · Mekanik mm · Genel m — OLCUBIRIM ile grup başına değiştirilir */
(function (C) {
  'use strict';
  C.addCommand(['OLCUBIRIM', 'DIMUNIT', 'OLCUBIRIMI'], 'Ölçü yazılarının birimi (sekme / pafta grubuna göre): varsayılan Tasarım cm, Mimari cm, Statik cm, Mekanik mm, Genel m. OLCUBIRIM Mekanik MM · OLCUBIRIM TASARIM CM · OLCUBIRIM LISTE', async (I) => {
    const s = C.doc.set, gs = ['TASARIM'].concat(s.grups || []); s.dimUnits = s.dimUnits || {};
    const g = await I.str('Grup (TASARIM, ' + (s.grups || []).join(', ') + ') ya da LISTE', 'LISTE', { whole: false }); if (!g) return;
    const show = () => gs.forEach(x => C.log(`${x === 'TASARIM' ? 'Tasarım (model)' : x}: ${C.dimUnitFor(x === 'TASARIM' ? null : x)}`));
    if (C.up(g) === 'LISTE') { show(); return; }
    const key = C.up(g) === 'TASARIM' ? 'TASARIM' : ((s.grups || []).find(x => C.up(x) === C.up(g)) || g);
    const u = await I.kw('Birim', [['M', 'Metre'], ['CM', 'Santimetre'], ['MM', 'Milimetre']], C.up(C.dimUnitFor(key === 'TASARIM' ? null : key))); if (!u) return;
    C.undoStack.push(C.snapshot()); s.dimUnits[key] = u.toLowerCase(); C.doc.ents.forEach(e => { if (e._c) { delete e._c.p; delete e._c.b; } }); C.changed(); C.emit('layouts'); show();
  });
})(window.C);

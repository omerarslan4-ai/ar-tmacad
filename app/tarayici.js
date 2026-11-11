/* ArıtmaCAD — ELEMAN TARAYICISI (Revit "Proje tarayıcısı" gibi, ekranın solunda)
   Çizimdeki elemanlar türlerine göre gruplu listelenir; isim verilir, aranır; listeden tıklanan eleman çizimde seçilir
   (çift tık: o elemana yakınlaştır). Altta seçili elemanın tüm özellikleri (Özellikler penceresi panele yerleşir). */
(function (C) {
  'use strict';
  const M = C.M, $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const SKIP = new Set(['sheet', 'dim', 'text', 'ctext', 'hatch', 'point', 'kot', 'koord', 'kesitisaret', 'baslik', 'solid', 'face']);
  const nameOf = e => e.ad || e.label || e.tag || `${(C.T[e.type] && C.T[e.type].label) || e.type} #${e.id}`;
  C.entName = nameOf;
  let panel = null, bodyEl = null, host = 'sol', open = false, filt = '', onlyModel = true; const closedG = new Set(), MAXG = 300; let showAll = new Set();
  const css = `#elPanel{position:fixed;z-index:55;width:300px;display:flex;flex-direction:column;background:var(--panel);border-right:1px solid #4b5566;box-shadow:6px 0 24px rgba(0,0,0,.35)}
#elPanel .eh{display:flex;align-items:center;gap:6px;padding:6px 8px;background:var(--panel2);border-bottom:1px solid var(--line)}
#elPanel .eh b{flex:1}
#elPanel input.es{margin:6px 8px;padding:5px 8px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:inherit}
#elPanel .el{flex:1 1 50%;overflow:auto;padding:0 4px 6px;min-height:120px;font-size:12.5px}
#elPanel .eg{margin-top:4px}#elPanel .eg>div.gt{cursor:pointer;padding:3px 6px;border-radius:5px;font-weight:600;display:flex;gap:6px;align-items:center}
#elPanel .eg>div.gt:hover{background:rgba(127,127,127,.12)}#elPanel .eg .cnt{opacity:.6;font-weight:400;margin-left:auto}
#elPanel .ei{padding:2px 6px 2px 22px;border-radius:5px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#elPanel .ei:hover{background:rgba(127,127,127,.12)}#elPanel .ei.on{background:#2e6fd8;color:#fff}
#elPanel .ep{flex:1 1 50%;min-height:160px;overflow:auto;border-top:1px solid var(--line);display:flex;flex-direction:column}
#elPanel .ep .nm{display:flex;gap:6px;align-items:center;padding:6px 8px;border-bottom:1px solid var(--line)}#elPanel .ep .nm input{flex:1;padding:4px 6px;border-radius:5px;border:1px solid var(--line);background:var(--bg);color:inherit}
#elPanel .ep #propWin{position:static!important;width:auto!important;height:auto!important;flex:1;box-shadow:none;border:0;border-radius:0;resize:none;display:flex}
#elPanel .ep #propWin .ph{cursor:default;border-radius:0}#elPanel .ep #propClose{display:none}
#elTab{position:fixed;z-index:54;writing-mode:vertical-rl;transform:rotate(180deg);padding:10px 4px;background:var(--panel2);border:1px solid #4b5566;border-left:0;border-radius:0 6px 6px 0;cursor:pointer;font-size:12px;user-select:none}
#elTab:hover{background:#2e6fd8;color:#fff}
#elPanel .ei .zm,#p-elemanlar .ei .zm{float:right;opacity:0;padding:0 4px;border-radius:4px}#elPanel .ei:hover .zm,#p-elemanlar .ei:hover .zm{opacity:.8}#elPanel .ei .zm:hover,#p-elemanlar .ei .zm:hover{background:rgba(255,255,255,.2);opacity:1}
#elPanel .ei input,#p-elemanlar .ei input{width:calc(100% - 4px);padding:1px 4px;border-radius:4px;border:1px solid #2e6fd8;background:var(--bg);color:inherit;font:inherit}
#p-elemanlar{padding:0!important}#p-elemanlar .elBody{display:flex;flex-direction:column;flex:1;min-height:0}
.elBody{display:flex;flex-direction:column;flex:1;min-height:0}
#p-elemanlar .el{flex:1 1 50%;overflow:auto;padding:0 4px 6px;min-height:120px;font-size:12.5px}
#p-elemanlar .eg{margin-top:4px}#p-elemanlar .eg>div.gt{cursor:pointer;padding:3px 6px;border-radius:5px;font-weight:600;display:flex;gap:6px;align-items:center}#p-elemanlar .eg .cnt{opacity:.6;font-weight:400;margin-left:auto}
#p-elemanlar .ei{padding:2px 6px 2px 22px;border-radius:5px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#p-elemanlar .ei:hover{background:rgba(127,127,127,.12)}#p-elemanlar .ei.on{background:#2e6fd8;color:#fff}
#p-elemanlar input.es{margin:6px 8px;padding:5px 8px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:inherit}
#p-elemanlar .ep{flex:1 1 50%;min-height:160px;overflow:auto;border-top:1px solid var(--line);display:flex;flex-direction:column}
#p-elemanlar .ep .nm{display:flex;gap:6px;align-items:center;padding:6px 8px;border-bottom:1px solid var(--line)}#p-elemanlar .ep .nm input{flex:1;padding:4px 6px;border-radius:5px;border:1px solid var(--line);background:var(--bg);color:inherit}
#p-elemanlar .ep #propWin{position:static!important;width:auto!important;height:auto!important;flex:1;box-shadow:none;border:0;border-radius:0;resize:none;display:flex}#p-elemanlar .ep #propWin .ph{cursor:default;border-radius:0}#p-elemanlar .ep #propClose{display:none}
#p-elemanlar .eh2{display:flex;align-items:center;gap:6px;padding:4px 8px 0}`;
  const place = () => { const v = $('#views'), b = $('#bottom'); if (!v) return; const r = v.getBoundingClientRect(), bt = b ? b.getBoundingClientRect().top : innerHeight; if (panel) Object.assign(panel.style, { left: r.left + 'px', top: r.top + 'px', height: Math.max(200, (b ? bt : r.bottom) - r.top) + 'px' }); const t = $('#elTab'); if (t) Object.assign(t.style, { left: (open && host === 'sol' ? r.left + 300 : r.left) + 'px', top: (r.top + 40) + 'px' }); };
  const items = () => { const q = filt.trim().toLocaleLowerCase('tr'); const G = new Map(); for (const e of C.doc.ents) { if (onlyModel && SKIP.has(e.type)) continue; if (onlyModel && !C.meshes(e) && !['line', 'pline', 'circle', 'arc', 'ellipse'].includes(e.type)) continue; const n = nameOf(e); if (q && !n.toLocaleLowerCase('tr').includes(q) && !String(e.layer).toLocaleLowerCase('tr').includes(q) && !String(e.id).includes(q)) continue; const g = (C.T[e.type] && C.T[e.type].label) || e.type; if (!G.has(g)) G.set(g, []); G.get(g).push(e); } return [...G.entries()].sort((a, b) => a[0].localeCompare(b[0], 'tr')); };
  const renderList = () => {
    if (!panel || !open) return; const L = bodyEl.querySelector('.el'), sel = new Set((C.sel || []).map(e => e.id)), groups = items();
    let h = ''; let tot = 0;
    for (const [g, arr] of groups) { tot += arr.length; const cl = closedG.has(g) || (!filt && arr.length > MAXG && !showAll.has(g) && !arr.some(e => sel.has(e.id)) && !closedG.has('!' + g)); const lim = showAll.has(g) ? arr.length : MAXG;
      h += `<div class="eg"><div class="gt" data-g="${esc(g)}">${cl ? '▸' : '▾'} ${esc(g)}<span class="cnt">${arr.length}</span></div>`;
      if (!cl) { for (const e of arr.slice(0, lim)) h += `<div class="ei${sel.has(e.id) ? ' on' : ''}" data-id="${e.id}" title="${esc(nameOf(e))} · ${esc(e.layer)} — çift tık: yeniden adlandır"><span class="zm" title="Yakınlaştır">⌖</span>${esc(nameOf(e))}</div>`; if (arr.length > lim) h += `<div class="ei" data-more="${esc(g)}" style="opacity:.7">… ${arr.length - lim} tane daha (göster)</div>`; }
      h += '</div>'; }
    L.innerHTML = h || '<p class="hint" style="padding:8px">Eleman yok.</p>'; document.querySelectorAll('.ecnt').forEach(x => { x.textContent = tot; });
    L.querySelectorAll('.gt').forEach(el => el.onclick = () => { const g = el.dataset.g; if (closedG.has(g)) closedG.delete(g); else if (el.textContent.startsWith('▸')) closedG.add('!' + g); else { closedG.add(g); closedG.delete('!' + g); } renderList(); });
    L.querySelectorAll('[data-more]').forEach(el => el.onclick = () => { showAll.add(el.dataset.more); renderList(); });
    L.querySelectorAll('.ei[data-id]').forEach(el => { el.onclick = ev => { if (el.querySelector('input')) return; const e = C.byId(+el.dataset.id); if (!e) return; if (ev.target.classList.contains('zm')) { zoomTo(e); return; } C.selFace = null; C.sel = ev.ctrlKey || ev.shiftKey ? (C.sel.includes(e) ? C.sel.filter(x => x !== e) : C.sel.concat([e])) : [e]; C.emit('selection'); };
      el.ondblclick = ev => { const e = C.byId(+el.dataset.id); if (!e || ev.target.classList.contains('zm')) return; renameInline(el, e); }; });
    L.onkeydown = ev => { if (ev.key === 'F2' && C.sel.length === 1) { const el = L.querySelector(`.ei[data-id="${C.sel[0].id}"]`); if (el) { ev.preventDefault(); renameInline(el, C.sel[0]); } } };
    const on = L.querySelector('.ei.on'); if (on && !L._noScroll) { const r = on.getBoundingClientRect(), lr = L.getBoundingClientRect(); if (r.top < lr.top || r.bottom > lr.bottom) on.scrollIntoView({ block: 'nearest' }); }
  };
  const renameInline = (el, e) => { // listede yerinde yeniden adlandır (Enter kaydet, Esc vazgeç)
    el.innerHTML = `<input value="${esc(e.ad || '')}" placeholder="${esc(nameOf(Object.assign({}, e, { ad: '' })))}">`; const inp = el.querySelector('input'); inp.focus(); inp.select(); let done = false;
    const fin = ok => { if (done) return; done = true; if (ok) { const v = inp.value.trim(); if ((e.ad || '') !== v) { C.undoStack.push(C.snapshot()); C.redoStack = []; if (v) e.ad = v; else delete e.ad; C.changed(); } } renderList(); renderName(); };
    inp.onkeydown = ev => { ev.stopPropagation(); if (ev.key === 'Enter') fin(true); else if (ev.key === 'Escape') fin(false); }; inp.onblur = () => fin(true); inp.onclick = ev => ev.stopPropagation();
  };
  const renderName = () => {
    if (!panel || !open) return; const box = bodyEl.querySelector('.nm'), s = C.sel || [];
    if (s.length !== 1) { box.style.display = 'none'; return; } box.style.display = ''; const e = s[0], inp = box.querySelector('input'); if (document.activeElement !== inp) inp.value = e.ad || '';
    inp.placeholder = nameOf(Object.assign({}, e, { ad: '' }));
    inp.onchange = () => { C.undoStack.push(C.snapshot()); C.redoStack = []; const v = inp.value.trim(); if (v) e.ad = v; else delete e.ad; delete e._c; C.changed(); renderList(); };
  };
  const zoomTo = e => {
    let bb = null; try { const t = C.entTris(e); if (t && t.pos.length) { bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; for (let i = 0; i < t.pos.length; i += 3) { bb[0] = Math.min(bb[0], t.pos[i]); bb[1] = Math.min(bb[1], t.pos[i + 1]); bb[2] = Math.min(bb[2], t.pos[i + 2]); bb[3] = Math.max(bb[3], t.pos[i]); bb[4] = Math.max(bb[4], t.pos[i + 1]); bb[5] = Math.max(bb[5], t.pos[i + 2]); } } } catch (er) { }
    if (!bb) { const ext = C.entExtents ? C.entExtents(e) : null; if (ext) bb = [ext[0], ext[1], 0, ext[2], ext[3], 0]; else { const sp = (C.snapPts(e) || []).map(q => q.p); if (!sp.length) return; bb = [Math.min(...sp.map(p => p[0])), Math.min(...sp.map(p => p[1])), 0, Math.max(...sp.map(p => p[0])), Math.max(...sp.map(p => p[1])), 0]; } }
    const v3 = C.views && C.views.v3;
    if (v3 && v3.visible()) { const o = v3.origin, c = [(bb[0] + bb[3]) / 2 - o[0], (bb[1] + bb[4]) / 2 - o[1], (bb[2] + bb[5]) / 2], sz = Math.max(bb[3] - bb[0], bb[4] - bb[1], bb[5] - bb[2], 0.5); v3.t = c; v3.dist = sz * 2.2; v3.dirty = true; }
    else if (C.views && C.views.plan && C.views.plan.zoomBox) C.views.plan.zoomBox([bb[0], bb[1], bb[3], bb[4]], 0.25);
  };
  const dockProps = on => { const pw = $('#propWin'); if (!pw) return; if (on) { bodyEl.querySelector('.ep').appendChild(pw); pw.classList.remove('hidden'); if (C.openProps) C.openProps(); } else if (pw.parentElement !== document.body) { document.body.appendChild(pw); pw.classList.add('hidden'); } };
  const build = () => {
    if (panel) return; const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    panel = document.createElement('div'); panel.id = 'elPanel'; panel.style.display = 'none';
    panel.innerHTML = `<div class="eh"><b>Elemanlar</b><span class="hint ecnt"></span><label class="hint" title="Yalnız yapı elemanları / 3B nesneler ve çizgiler"><input type="checkbox" class="eo" checked> model</label><button class="ic ex" title="Paneli kapat">«</button></div>`;
    bodyEl = document.createElement('div'); bodyEl.className = 'elBody';
    bodyEl.innerHTML = `<input class="es" placeholder="Ara: isim, katman, #no …"><div class="el" tabindex="0"></div>
      <div class="ep"><div class="nm"><b style="font-size:12px">İsim</b><input placeholder="Elemana isim verin (ör. Havalandırma havuzu 1)"></div></div>`;
    panel.appendChild(bodyEl); document.body.appendChild(panel);
    const tab = document.createElement('div'); tab.id = 'elTab'; tab.textContent = '☰ Elemanlar'; tab.title = 'Eleman tarayıcısı (aç / kapat)'; tab.onclick = () => toggle(); document.body.appendChild(tab);
    panel.querySelector('.ex').onclick = () => toggle(false);
    bodyEl.querySelector('.es').oninput = ev => { filt = ev.target.value; renderList(); };
    panel.querySelector('.eo').onchange = ev => { onlyModel = ev.target.checked; renderList(); };
    // sağ paneldeki sekme (Sohbet / Katmanlar / Eklentiler yanında) — panel » ile kapanır / otomatik gizlenir
    const tabs = document.querySelector('#sideTabs'), side = document.querySelector('#side');
    if (tabs && side) {
      const pane = document.createElement('section'); pane.id = 'p-elemanlar'; pane.className = 'pane';
      pane.innerHTML = `<div class="eh2"><b style="font-size:12.5px">Elemanlar</b><span class="hint ecnt"></span><label class="hint" style="margin-left:auto"><input type="checkbox" class="eo2" checked> model</label></div>`;
      const panes = side.querySelectorAll('.pane'); (panes[panes.length - 1] || tabs).after(pane);
      pane.querySelector('.eo2').onchange = ev => { onlyModel = ev.target.checked; renderList(); };
      const b = document.createElement('button'); b.dataset.p = 'elemanlar'; b.textContent = 'Elemanlar'; const ctl = tabs.querySelector('#sideCtl'); tabs.insertBefore(b, ctl || null);
      b.onclick = () => { tabs.querySelectorAll('button[data-p]').forEach(x => x.classList.toggle('on', x === b)); side.querySelectorAll('.pane').forEach(p2 => p2.classList.toggle('on', p2 === pane)); showRight(true); };
      tabs.querySelectorAll('button[data-p]').forEach(x => { if (x !== b) x.addEventListener('click', () => { if (host === 'sag') showRight(false); }); });
    }
    addEventListener('resize', place); setTimeout(place, 50);
  };
  const moveBody = where => { const tgt = where === 'sag' ? document.querySelector('#p-elemanlar') : panel; if (tgt && bodyEl.parentElement !== tgt) tgt.appendChild(bodyEl); host = where; };
  const showRight = on => { build(); if (on) { if (open && host === 'sol') { panel.style.display = 'none'; } moveBody('sag'); open = true; dockProps(true); renderList(); renderName(); } else { dockProps(false); open = false; moveBody('sol'); } place(); };
  const toggle = force => { build(); const want = force != null ? force : !(open && host === 'sol'); if (host === 'sag' && want) { const chat = document.querySelector('#sideTabs [data-p=chat]'); if (chat) chat.click(); } moveBody('sol'); open = want; panel.style.display = open ? 'flex' : 'none'; try { localStorage.setItem('aritmacad.elpanel', open ? '1' : '0'); } catch (er) { } dockProps(open); place(); if (open) { renderList(); renderName(); } };
  C.toggleElPanel = toggle;
  let tm = null; const later = () => { if (!open) return; clearTimeout(tm); tm = setTimeout(() => { renderList(); renderName(); }, 120); };
  C.on('change', later); C.on('doc', later); C.on('selection', () => { if (open) { renderList(); renderName(); } });
  C.addCommand(['ELEMANLAR', 'TARAYICI', 'PROJETARAYICI', 'ELEMANLISTESI'], 'Eleman tarayıcısı (sol panel; sağ panelde de Elemanlar sekmesi): türlerine göre liste, arama, listeden seçme, çift tık / F2 ile yeniden adlandırma, ⌖ yakınlaştır; altta tüm özellikler.', async () => toggle(), { noUndo: true });
  setTimeout(() => { build(); let o = false; try { o = localStorage.getItem('aritmacad.elpanel') === '1'; } catch (er) { } if (o) toggle(true); place(); }, 300);
})(window.C);

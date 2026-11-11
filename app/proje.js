/* ArıtmaCAD — PROJE DOSYASI (.aritma) ve CANLI GÖRÜNÜMLER
   1) .aritma: çizimin tamamı (model, katmanlar, paftalar, seviyeler, tipler, ayarlar) tek dosyada, kayıpsız. DXF / DWG teslim biçimidir.
      Yeni çizim Ctrl+S ile .aritma kaydedilir; DXF / DWG açtıysanız Ctrl+S o biçimde kaydeder.
   2) Canlı görünüm: KESITAL ve KOTPLANI girdileri kaydedilir, ürettikleri nesneler etiketlenir (e.canli). 3B model değişince
      görünümler kendiliğinden (ya da Görünümler › Güncelle ile) aynı yerde yeniden üretilir; sonradan eklediğiniz ölçü, yazı, açılım kalır. */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd;
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const download = (txt, name, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: type || 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); };
  const base = () => (C.doc.set.name || 'Adsiz').replace(/[\\/:*?"<>|]+/g, '_');

  /* =================== PROJE DOSYASI =================== */
  const projText = () => JSON.stringify({ format: 'aritmacad-proje', v: 1, app: C.VERSION, kaydedildi: new Date().toISOString(), doc: JSON.parse(C.snapshot()) });
  C.saveProject = async (as) => {
    let txt; try { txt = projText(); } catch (err) { C.warn('Proje kaydedilemedi: ' + err.message); return false; }
    const name = base() + '.aritma';
    if (window.showSaveFilePicker) {
      try {
        if (!C.projHandle || as) C.projHandle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'ArıtmaCAD proje', accept: { 'application/json': ['.aritma'] } }] });
        const w = await C.projHandle.createWritable(); await w.write(txt); await w.close();
        C.doc.set.name = C.projHandle.name.replace(/\.aritma$/i, ''); C.lastFormat = 'aritma'; C.markSaved && C.markSaved();
        C.log(`💾 Kaydedildi: ${C.projHandle.name} (ArıtmaCAD proje, ${(txt.length / 1024).toFixed(0)} KB). AutoCAD'e vermek için Dosya › AutoCAD'e … çıktıları.`); return true;
      } catch (err) { if (err.name === 'AbortError') return false; C.projHandle = null; C.warn('Dosyaya yazılamadı (' + (err.message || err.name) + ') — İndirilenler klasörüne indiriliyor.'); }
    }
    download(txt, name); C.lastFormat = 'aritma'; C.markSaved && C.markSaved(); C.log('İndirildi: ' + name); return true;
  };
  C.openProject = async (file, merge, handle) => {
    const txt = await file.text(); let o; try { o = JSON.parse(txt); } catch (err) { C.warn('Proje dosyası okunamadı: ' + err.message); return; }
    if (!o || o.format !== 'aritmacad-proje' || !o.doc) { C.warn('Bu bir ArıtmaCAD proje dosyası değil.'); return; }
    if (merge) { const d = o.doc; let n = 0; for (const e of d.ents || []) { const ne = C.newEnt(e.type, e); ne.id = C.doc.nextId++; C.doc.ents.push(ne); n++; } for (const [k, l] of Object.entries(d.layers || {})) if (!C.doc.layers[k]) C.doc.layers[k] = l; C.changed(); C.emit('layers'); C.log(`${file.name}: ${n} nesne eklendi.`); return; }
    C.newDoc(); C.restore(JSON.stringify(o.doc)); C.doc.set.name = file.name.replace(/\.aritma$/i, ''); C.lastFormat = 'aritma'; C.projHandle = handle || null;
    C.undoStack = []; C.redoStack = []; C.langReset && C.langReset(); C.emit('doc'); C.markSaved && C.markSaved();
    C.log(`📂 ${file.name}: ${C.doc.ents.length} nesne, ${(C.doc.layouts || []).length} pafta${o.app ? ' (ArıtmaCAD ' + o.app + ')' : ''}.`); setTimeout(() => C.emit('zoomExtents'), 50);
  };
  C.addCommand(['PROJEKAYDET', 'ARITMAKAYDET', 'SAVEPROJECT'], 'ArıtmaCAD proje dosyası (.aritma) olarak kaydeder: model, paftalar, seviyeler, tipler ve tüm ayarlar kayıpsız.', () => C.saveProject(false), { noUndo: true });
  C.addCommand(['PROJEFARKLI', 'ARITMAFARKLI'], 'Proje dosyası olarak farklı kaydet (.aritma)…', () => C.saveProject(true), { noUndo: true });
  C.addCommand(['PROJEAC', 'ARITMAAC', 'OPENPROJECT'], 'ArıtmaCAD proje dosyası (.aritma) açar.', async () => {
    if (!C.docTabs && C.askSave && !(await C.askSave('Proje açmadan önce'))) return;
    if (window.showOpenFilePicker) { try { const hs = await window.showOpenFilePicker({ multiple: true, types: [{ description: 'ArıtmaCAD proje', accept: { 'application/json': ['.aritma'] } }] }); for (const h of hs) { if (C.docTabs && !C.docTabs.acmaIcin()) break; const f = await h.getFile(); await C.openProject(f, false, h); } return; } catch (err) { if (err.name === 'AbortError') return; } }
    C.runTool ? C.runTool('AC') : C.cmd.run('AC');
  }, { noUndo: true });

  /* =================== CANLI GÖRÜNÜMLER =================== */
  const VIEWS = () => C.doc.set.canli || (C.doc.set.canli = {});
  if (C.state.canliOto == null) { try { C.state.canliOto = localStorage.getItem('aritmacad.canliOto') !== '0'; } catch (er) { C.state.canliOto = true; } }
  let cap = null, replayId = null;
  { const a0 = C.add; C.add = function (e) { const r = a0.apply(this, arguments); if (cap && e) cap.push(e); return r; }; }
  const tok = v => { if (v == null) return '""'; if (Array.isArray(v)) return v.slice(0, 3).map(x => (+x || 0).toFixed(6)).concat(v.length < 3 ? ['0'] : []).join(','); if (typeof v === 'number') return String(+v.toFixed(6)); const s = String(v); return /\s/.test(s) || s === '' ? `"${s.replace(/"/g, '')}"` : s; };
  const REC = ['pt', 'num', 'str', 'kw', 'int', 'dist', 'angle'];
  const wrapLive = (cmdName, kind, label) => {
    const d0 = C.cmds[cmdName]; if (!d0) return;
    const fn0 = d0.fn;
    d0.fn = async function (I, Cx) {
      if (replayId) { const id = replayId; cap = []; try { return await fn0.call(this, I, Cx); } finally { for (const e of cap) e.canli = id; cap = null; } }
      const kv = (E.queue || []).filter(t => /^[A-Za-zİıÜüŞşÇçĞğÖö]+=/.test(t)), rec = [];
      const I2 = new Proxy(I, { get(t, k) { const f = t[k]; if (typeof f !== 'function' || !REC.includes(k)) return typeof f === 'function' ? f.bind(t) : f; return async (...a) => { const r = await f.apply(t, a); rec.push(tok(r)); return r; }; } });
      cap = []; let res;
      try { res = await fn0.call(this, I2, Cx); }
      finally {
        const made = cap; cap = null;
        if (made.length) {
          const id = 'V' + Date.now().toString(36); for (const e of made) e.canli = id;
          const title = (made.find(e => (e.type === 'baslik' || e.type === 'text') && /KES|PLAN|GÖRÜN/i.test(e.s || '')) || {}).s;
          VIEWS()[id] = { cmd: cmdName, kind, kv, tokens: rec, ad: title || label, ts: Date.now(), oto: true };
          prev = scan(); sigNow = prev.sig; C.doc.set.canliSig = sigNow; renderPane();
        }
      }
      return res;
    };
  };
  const later = () => { wrapLive('KESITAL', 'kesit', 'Kesit'); wrapLive('KOTPLANI', 'plan', 'Kot planı'); };
  setTimeout(later, 0);
  /* 3B model imzası: yalnız 3B gövdeli model elemanları */
  const h32 = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };
  const is3d = e => !e.gv && !e.canli && C.T[e.type] && (C.T[e.type].mesh || C.T[e.type].meshes) && (!C.layer(e.layer) || C.layer(e.layer).on !== false);
  /* her 3B elemanın imzası, plan kutusu ve kot aralığı: değişenler hangi görünümleri etkiliyor? */
  const scan = () => { const map = new Map(), hs = []; for (const e of C.doc.ents) if (is3d(e)) { const o = {}; for (const k in e) if (k[0] !== '_' && k !== 'id' && k !== 'sv' && k !== 'svU' && k !== 'sv2') o[k] = e[k]; const h = h32(JSON.stringify(o)); hs.push(h); let bb = null, zr = null; try { bb = C.bbox(e); } catch (er) { } try { zr = C.zRange ? C.zRange(e) : null; } catch (er) { } map.set(e.id, { h, bb, zr }); } const lv = C.doc.set.seviye ? JSON.stringify(C.doc.set.seviye.list) : ''; return { sig: h32(hs.join('|') + lv), map, lv }; };
  const modelSig = () => scan().sig;
  const P3 = t => { const a = String(t).split(',').map(Number); return a.length >= 2 && a.every(isFinite) ? a : null; };
  const affects = (v, ch) => {
    if (v.cmd === 'KESITAL') { const [a, b, sp] = v.tokens.slice(0, 3).map(P3), dep = parseFloat(v.tokens[3]); if (!a || !b || !sp) return true; const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; let n = [-u[1], u[0]]; if ((sp[0] - a[0]) * n[0] + (sp[1] - a[1]) * n[1] < 0) n = [-n[0], -n[1]]; const d = isFinite(dep) ? dep : 30;
      const ps = [a, b, [b[0] + n[0] * d, b[1] + n[1] * d], [a[0] + n[0] * d, a[1] + n[1] * d]], rb = [Math.min(...ps.map(q => q[0])) - 1, Math.min(...ps.map(q => q[1])) - 1, Math.max(...ps.map(q => q[0])) + 1, Math.max(...ps.map(q => q[1])) + 1];
      return ch.some(c => !c.bb || !(c.bb[2] < rb[0] || c.bb[0] > rb[2] || c.bb[3] < rb[1] || c.bb[1] > rb[3])); }
    if (v.cmd === 'KOTPLANI') { const z = parseFloat(v.tokens[0]), dep = parseFloat(v.tokens[1]); if (!isFinite(z)) return true; const lo = z - (isFinite(dep) ? dep : 1e9) - 0.05; return ch.some(c => !c.zr || (c.zr[1] > lo && c.zr[0] < z + 0.05)); }
    return true;
  };
  let prev = null; const staleIds = new Set();
  C.modelSig = () => modelSig();
  let sigNow = null;
  const stale = () => staleIds.size > 0;
  /* yeniden üret */
  C.canliGuncelle = async (ids, quiet) => {
    const V = VIEWS(); ids = (ids || Object.keys(V)).filter(id => V[id]); if (!ids.length) return 0;
    if (E.running) { setTimeout(() => C.canliGuncelle(ids, quiet), 800); return 0; }
    let n = 0;
    for (const id of ids) {
      const v = V[id]; if (v.donuk && quiet) continue;
      const olds = C.doc.ents.filter(e => e.canli === id); if (olds.length) { if (C.remove) C.remove(olds); else C.doc.ents = C.doc.ents.filter(e => e.canli !== id); }
      const d = C.cmds[v.cmd]; const nu = d.opts.noUndo; d.opts.noUndo = true; replayId = id;
      try { await E.script(`${v.cmd} ${v.kv.join(' ')} ${v.tokens.join(' ')}`); n++; } catch (er) { C.warn(`${v.ad}: yeniden üretilemedi — ${er.message}`); } finally { replayId = null; d.opts.noUndo = nu; }
    }
    if (C.acilimYenile) C.acilimYenile();
    for (const id of ids) if (!(V[id] && V[id].donuk && quiet)) staleIds.delete(id);
    prev = scan(); C.doc.set.canliSig = sigNow = prev.sig; C.changed(); renderPane();
    if (!quiet || n) C.log(`🔄 ${n} görünüm modelden yeniden üretildi${quiet ? ' (otomatik)' : ''}.`);
    return n;
  };
  let tm = null;
  C.on('changeIdle', () => {
    if (!C.doc || replayId) return; const V = VIEWS(); if (!Object.keys(V).length) return;
    const cur = scan(); if (cur.sig === sigNow) return;
    const ch = []; let all = !prev || prev.lv !== cur.lv;
    if (!all) { for (const [id, st] of cur.map) { const o = prev.map.get(id); if (!o) ch.push(st); else if (o.h !== st.h) ch.push(o, st); } for (const [id, o] of prev.map) if (!cur.map.has(id)) ch.push(o); }
    for (const id of Object.keys(V)) if (all || affects(V[id], ch)) staleIds.add(id);
    prev = cur; sigNow = cur.sig; renderPane();
    if (!C.state.canliOto || !stale()) return;
    clearTimeout(tm); tm = setTimeout(() => { if (E.running || C.vpEdit || (C.cmd && C.cmd.waiting)) { tm = null; C.emit('changeIdle'); return; } const ids = [...staleIds].filter(id => V[id] && !V[id].donuk); if (ids.length) C.canliGuncelle(ids, true); }, 1200);
  });
  C.on('doc', () => { sigNow = null; prev = null; staleIds.clear(); setTimeout(() => { prev = scan(); sigNow = prev.sig; if (!C.doc.set.canliSig) C.doc.set.canliSig = sigNow; renderPane(); }, 0); });
  C.addCommand(['GORUNUMGUNCELLE', 'KESITGUNCELLE', 'CANLIGUNCELLE', 'REGEN3B'], 'Canlı kesit ve kot planlarını 3B modelden yeniden üretir (aynı yerde; sonradan eklediğiniz ölçü / yazı / açılım kalır).', () => C.canliGuncelle(null, false), { noUndo: true });

  /* =================== Görünümler sekmesi =================== */
  let pane = null;
  const buildPane = () => {
    const tabs = document.querySelector('#sideTabs'), side = document.querySelector('#side'); if (!tabs || !side || pane) return;
    pane = document.createElement('section'); pane.id = 'p-gorunum'; pane.className = 'pane';
    const panes = side.querySelectorAll('.pane'); (panes[panes.length - 1] || tabs).after(pane);
    const b = document.createElement('button'); b.dataset.p = 'gorunum'; b.textContent = 'Görünümler'; const ctl = tabs.querySelector('#sideCtl'); tabs.insertBefore(b, ctl || null);
    b.onclick = () => { tabs.querySelectorAll('button[data-p]').forEach(x => x.classList.toggle('on', x === b)); side.querySelectorAll('.pane').forEach(p2 => p2.classList.toggle('on', p2 === pane)); renderPane(); };
    const st = document.createElement('style'); st.textContent = `#p-gorunum{padding:10px;overflow:auto;font-size:12.5px}#p-gorunum .gv-h{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px}#p-gorunum .gv-r{border-bottom:1px solid var(--line,#333);padding:6px 2px;display:flex;flex-direction:column;gap:4px}#p-gorunum .gv-a{display:flex;gap:4px;flex-wrap:wrap}#p-gorunum .gv-a button{font-size:11.5px;padding:2px 6px}#p-gorunum .eski{color:#e0a040}`;
    document.head.appendChild(st);
  };
  const renderPane = () => {
    buildPane(); if (!pane) return; const V = VIEWS(), ids = Object.keys(V).sort((a, b) => V[a].ts - V[b].ts), old = stale();
    let h = `<div class="gv-h"><b>Canlı görünümler</b><span class="hint">${ids.length}</span><span style="flex:1"></span><button data-all ${ids.length ? '' : 'disabled'}>Hepsini güncelle</button></div>
      <div class="gv-h"><label class="hint"><input type="checkbox" data-oto ${C.state.canliOto ? 'checked' : ''}> Model değişince otomatik güncelle</label></div>
      ${old ? `<p class="eski">⚠ 3B model değişti: ${staleIds.size} görünüm güncel değil.</p>` : ''}`;
    if (!ids.length) h += `<p class="hint">KESITAL ile kesit ya da KOTPLANI ile kot planı aldığınızda burada listelenir ve model değişince kendiliğinden güncellenir. Bu sürümden önce alınmış kesitleri bir kez yeniden alın.</p>`;
    for (const id of ids) { const v = V[id], n = C.doc.ents.filter(e => e.canli === id).length; h += `<div class="gv-r" data-id="${id}"><div><b>${esc(v.ad)}</b> <span class="hint">${v.kind === 'kesit' ? 'kesit' : 'kot planı'} · ${n} nesne${v.donuk ? ' · donduruldu' : ''}</span>${staleIds.has(id) ? ' <span class="eski">● güncel değil</span>' : ''}</div><div class="gv-a"><button data-go>Göster</button><button data-up>Güncelle</button><button data-fr title="Dondurulan görünüm otomatik güncellenmez">${v.donuk ? 'Çöz' : 'Dondur'}</button><button data-del title="Görünümü ve ürettiği çizgileri sil">Sil</button></div></div>`; }
    h += `<p class="hint" style="margin-top:8px">Görünümün ürettiği çizgileri elle değiştirmeyin; güncellemede yeniden çizilir. Üzerine eklediğiniz ölçü, yazı ve malzeme açılımları korunur.</p>`;
    pane.innerHTML = h;
    const Q = s => pane.querySelector(s); const all = Q('[data-all]'); if (all) all.onclick = () => C.canliGuncelle(null, false);
    Q('[data-oto]').onchange = ev => { C.state.canliOto = ev.target.checked; try { localStorage.setItem('aritmacad.canliOto', ev.target.checked ? '1' : '0'); } catch (er) { } if (ev.target.checked && stale()) C.canliGuncelle(null, true); };
    pane.querySelectorAll('.gv-r').forEach(r => { const id = r.dataset.id, v = V[id];
      r.querySelector('[data-go]').onclick = () => { const es = C.doc.ents.filter(e => e.canli === id); if (!es.length) return; let bb = null; for (const e of es) { let b; try { b = C.bbox(e); } catch (er) { continue; } bb = bb ? [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])] : b.slice(); } if (!bb) return; if (C.currentView !== 'plan') C.setView('plan'); const pv = C.views.plan; pv.cx = (bb[0] + bb[2]) / 2; pv.cy = (bb[1] + bb[3]) / 2; pv.s = Math.min(pv.W / (bb[2] - bb[0] + 2), pv.H / (bb[3] - bb[1] + 2)) * 0.9; pv.dirty = true; };
      r.querySelector('[data-up]').onclick = () => C.canliGuncelle([id], false);
      r.querySelector('[data-fr]').onclick = () => { v.donuk = !v.donuk; C.changed(); renderPane(); };
      r.querySelector('[data-del]').onclick = () => { C.undoStack.push(C.snapshot()); { const olds = C.doc.ents.filter(x => x.canli === id); if (olds.length && C.remove) C.remove(olds); } delete V[id]; C.changed(); renderPane(); };
    });
  };
  setTimeout(() => { buildPane(); renderPane(); }, 400);
})(window.C);

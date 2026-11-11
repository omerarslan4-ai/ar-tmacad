/* ArıtmaCAD — ÖZELLİK KOPYALA (MATCHPROP / MA, AutoCAD "Özellik Eşleştirme" fırçası)
   kaynak nesne -> fırça imleci ile hedeflere tıkla / pencere çiz; üzerine gelince sonucu önizler; A = Ayarlar penceresi */
(function (C) {
  'use strict';
  const E = C.cmd, M = C.M;
  const GROUPS = [
    ['color', 'Renk', 'temel'], ['layer', 'Katman', 'temel'], ['lt', 'Çizgi tipi', 'temel'], ['lw', 'Çizgi kalınlığı', 'temel'],
    ['text', 'Yazı (stil, yükseklik, genişlik, eğiklik)', 'özel'], ['hatch', 'Tarama (desen, ölçek, açı)', 'özel'], ['anno', 'Açıklama ölçekleri', 'özel'], ['pline', 'Çoklu çizgi (kot / z)', 'özel'], ['vp', 'Görünüm penceresi (ölçek, açıklama ayarı) — Düzen\'de', 'özel'],
  ];
  const cfg = C.matchSet = (() => { const d = {}; GROUPS.forEach(g => d[g[0]] = true); try { return Object.assign(d, JSON.parse(localStorage.getItem('aritmacad.matchprop') || '{}')); } catch (e) { return d; } })();
  const save = () => { try { localStorage.setItem('aritmacad.matchprop', JSON.stringify(cfg)); } catch (e) { } };
  const TXT = new Set(['text', 'ctext']);

  /* src özelliklerini e'ye uygula (e değişir); değişti mi */
  C.matchApply = (src, e) => {
    if (cfg.color && src.color != null) e.color = src.color;
    if (cfg.layer && src.layer) { e.layer = src.layer; }
    if (cfg.lt && src.lt != null) e.lt = src.lt;
    if (cfg.lw && src.lw != null) e.lw = src.lw;
    if (cfg.text && TXT.has(src.type) && TXT.has(e.type)) {
      for (const k of ['st', 'wf', 'obl', 'ann']) { if (src[k] != null) e[k] = src[k]; else delete e[k]; }
      if (src.ann && src.hp) { e.hp = src.hp; e.h = C.annoH(src.hp); } else { e.h = src.h; delete e.hp; }
    }
    if (cfg.hatch && src.type === 'hatch' && e.type === 'hatch') { for (const k of ['pat', 'sc', 'ang', 'ann']) e[k] = src[k]; if (src.def) e.def = JSON.parse(JSON.stringify(src.def)); else delete e.def; }
    if (cfg.anno && C.ANNO_TYPES && C.ANNO_TYPES.has(src.type) && C.ANNO_TYPES.has(e.type)) { if (src.ascales) e.ascales = src.ascales.slice(); else delete e.ascales; }
    if (cfg.pline && src.type === 'pline' && e.type === 'pline' && src.pts.length) { const z = src.pts[0][2] || 0; e.pts = e.pts.map(p => [p[0], p[1], z]); }
    delete e._c;
  };

  /* fırça imleci */
  C.drawBrush = (ctx, x, y) => {
    ctx.save(); ctx.translate(x + 9, y - 9); ctx.rotate(Math.PI / 4); ctx.scale(1.35, 1.35); ctx.setLineDash([]);
    ctx.fillStyle = '#d9a441'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.fillRect(-2, -16, 4, 10); ctx.strokeRect(-2, -16, 4, 10);                         // sap
    ctx.fillStyle = '#c0c4c8'; ctx.fillRect(-3.5, -6, 7, 4); ctx.strokeRect(-3.5, -6, 7, 4); // bilezik
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(-3.5, -2); ctx.lineTo(3.5, -2); ctx.lineTo(2.5, 5); ctx.quadraticCurveTo(0, 8, -2.5, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); // kıl
    ctx.restore();
  };

  const settingsDialog = (src) => new Promise(res => {
    const row = g => `<label style="display:flex;gap:8px;align-items:center;padding:2px 0"><input type="checkbox" data-g="${g[0]}" ${cfg[g[0]] ? 'checked' : ''}>${g[1]}</label>`;
    const b = C.modal('Özellik ayarları', `
      <p class="hint">Kaynak: <b>${(C.T[src.type] && C.T[src.type].label) || src.type}</b> — katman ${src.layer}, renk ${src.color === 256 ? 'Katmandan' : src.color === 0 ? 'Bloktan' : src.color}, çizgi tipi ${src.lt || 'Katmandan'}</p>
      <div style="display:flex;gap:30px;flex-wrap:wrap"><div><h4>Temel özellikler</h4>${GROUPS.filter(g => g[2] === 'temel').map(row).join('')}</div><div><h4>Özel özellikler</h4>${GROUPS.filter(g => g[2] === 'özel').map(row).join('')}</div></div>
      <div class="bar" style="justify-content:space-between"><span><button id="mpAll">Tümü</button><button id="mpNone">Hiçbiri</button></span><span><button id="mpCancel">İptal</button><button id="mpOk" class="pri">Tamam</button></span></div>`);
    let done = false; const end = v => { if (done) return; done = true; clearInterval(tm); C.closeModal(); res(v); };
    b.querySelector('#mpAll').onclick = () => b.querySelectorAll('[data-g]').forEach(c => c.checked = true);
    b.querySelector('#mpNone').onclick = () => b.querySelectorAll('[data-g]').forEach(c => c.checked = false);
    b.querySelector('#mpOk').onclick = () => { b.querySelectorAll('[data-g]').forEach(c => cfg[c.dataset.g] = c.checked); save(); end(true); };
    b.querySelector('#mpCancel').onclick = () => end(false);
    const tm = setInterval(() => { if (document.querySelector('#modal').classList.contains('hidden')) end(false); }, 300);
  });

  const tol = () => { try { return 7 / C.viewScale(); } catch (e) { return 0.1; } };
  const pick = p => (C.pickTrimmable ? C.pickTrimmable(p, tol(), true) : C.pickAt(p)) || (C.hatchAt ? C.hatchAt(p) : null);

  /* ---- düzen görünüm penceresi eşleştirme ---- */
  const matchVp = async (I) => {
    const Lay = C.views.lay.cur(); if (!Lay) return;
    let src = C.layoutSel; if (!src) { const p = await I.pt('Kaynak görünüm penceresini seçin'); if (!p || typeof p === 'string') return; src = C.views.lay.vpAt(p); }
    if (!src) { C.warn('Görünüm penceresi seçilmedi'); return; }
    E.cursorIcon = 'brush'; let n = 0;
    for (; ;) { const q = await I.pt('Hedef pencereler (Enter = bitir)'); if (!q || typeof q === 'string') break; const v = C.views.lay.vpAt(q); if (!v || v === src) continue; v.scale = src.scale; if (src.annoMode) v.annoMode = src.annoMode; else delete v.annoMode; v.border = src.border; if (src.frozen) v.frozen = src.frozen.slice(); n++; C.changed(); C.emit('layouts'); }
    C.log(`${n} pencereye ölçek 1/${src.scale} ve ayarlar kopyalandı.`);
  };

  /* ---- seçmeli özellik eşleştirme (3B ve yapı elemanları): kaynağın TÜM özellikleri listelenir, işaretlediklerinizi hedeflere uygulayın ---- */
  const GEN = [['layer', 'Katman'], ['color', 'Renk'], ['lt', 'Çizgi tipi'], ['lw', 'Çizgi kalınlığı']];
  const EXTRA = { kolon: [['sek', 'Kesit (R dikdörtgen / D dairesel)', 's']], perde: [['tb', 'Alt kalınlık (m)'], ['tt', 'Üst kalınlık (m)']], plak: [['t', 'Kalınlık (m)'], ['zt', 'Üst kot (m)'], ['kind', 'Tür (radye / döşeme)', 's']], kaplama: [], yalitim: [] };
  const fieldsOf = src => { const F = ((C.PROPFIELDS || {})[src.type] || []).concat(EXTRA[src.type] || []), seen = new Set(), out = []; for (const f of F) { if (seen.has(f[0]) || src[f[0]] == null || typeof src[f[0]] === 'object') continue; seen.add(f[0]); out.push(f); } return out; };
  const fmtV = (k, v) => k === 'color' ? (v === 256 ? 'Katmandan' : v === 0 ? 'Bloktan' : String(v)) : k === 'lw' ? (v < 0 ? 'Katmandan' : (v / 100).toFixed(2) + ' mm') : typeof v === 'number' ? String(+v.toFixed(4)) : String(v);
  const lbl = e => (C.T[e.type] && C.T[e.type].label) || e.type;
  C.matchPick = (src, targets) => new Promise(res => {
    const F = fieldsOf(src), key = 'aritmacad.matchsel.' + src.type; let mem = {}; try { mem = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { }
    const same = targets.filter(t => t.type === src.type).length, cnt = {}; targets.forEach(t => cnt[lbl(t)] = (cnt[lbl(t)] || 0) + 1);
    const row = (k, l, grp) => `<label style="display:flex;gap:8px;align-items:center;padding:3px 0"><input type="checkbox" data-k="${k}" data-g="${grp}" ${mem[k] != null ? (mem[k] ? 'checked' : '') : (grp === 'tur' ? 'checked' : '')}><span style="min-width:190px">${l}</span><b>${fmtV(k, src[k])}</b></label>`;
    const b = C.modal('Özellik eşleştir — uygulanacak özellikleri seçin', `
      <p class="hint">Kaynak: <b>${lbl(src)}</b>${C.T[src.type] && C.T[src.type].info ? ' — ' + C.T[src.type].info(src) : ''}<br>Hedef: <b>${targets.length}</b> nesne (${Object.entries(cnt).map(([a, n]) => `${n} ${a}`).join(', ')})</p>
      <div style="display:flex;gap:28px;flex-wrap:wrap">
        ${F.length ? `<div><h4>${lbl(src)} özellikleri ${same < targets.length ? `<span class="hint">(yalnız ${same} ${lbl(src).toLowerCase()} hedefe)</span>` : ''}</h4>${F.map(f => row(f[0], f[1], 'tur')).join('')}</div>` : ''}
        <div><h4>Genel</h4>${GEN.filter(g => src[g[0]] != null).map(g => row(g[0], g[1], 'gen')).join('')}</div>
      </div>
      <div class="bar" style="justify-content:space-between"><span><button id="mpA">Tümü</button><button id="mpN">Hiçbiri</button></span><span><button id="mpC">İptal</button><button id="mpO" class="pri">Uygula</button></span></div>`);
    let done = false; const end = v => { if (done) return; done = true; clearInterval(tm); C.closeModal(); res(v); };
    b.querySelector('#mpA').onclick = () => b.querySelectorAll('[data-k]').forEach(c => c.checked = true);
    b.querySelector('#mpN').onclick = () => b.querySelectorAll('[data-k]').forEach(c => c.checked = false);
    b.querySelector('#mpC').onclick = () => end(null);
    b.querySelector('#mpO').onclick = () => { const ks = []; b.querySelectorAll('[data-k]').forEach(c => { mem[c.dataset.k] = c.checked; if (c.checked) ks.push(c.dataset.k); }); try { localStorage.setItem(key, JSON.stringify(mem)); } catch (e) { } end(ks); };
    const tm = setInterval(() => { if (document.querySelector('#modal').classList.contains('hidden')) end(null); }, 300);
  });
  C.matchApplyKeys = (src, targets, keys) => {
    const gen = new Set(GEN.map(g => g[0])); let n = 0;
    for (const t of targets) { if (t === src) continue; let ch = false; for (const k of keys) { if (!gen.has(k) && t.type !== src.type) continue; if (src[k] == null) continue; t[k] = src[k]; ch = true; } if (ch) { delete t._c; n++; } }
    if (n) { C.changed(); C.emit('layers'); C.emit('selection'); } return n;
  };
  const RICH = new Set(['kolon', 'kiris', 'perde', 'plak', 'temel', 'acik', 'dolgu', 'kaplama', 'yalitim', 'tank', 'ctank', 'pipe', 'pump', 'valve', 'box', 'cyl', 'kati', 'wall', 'slab']);
  const matchRich = async (I, src0) => {
    let src = src0;
    if (!src) { const s1 = await I.sel('Kaynak nesneyi seçin (özellikleri kopyalanacak, ör. bir kolon)', { pre: true }); if (!s1 || !s1.length) return; src = s1[0]; }
    C.log(`Kaynak: ${lbl(src)}. Şimdi hedefleri seçin (tıklayın ya da pencere çizin), Enter = özellik listesini aç.`);
    const tg = await I.sel(`Hedef nesneleri seçin — Enter ile özellik listesi açılır`, { pre: false }); if (!tg || !tg.length) return;
    const targets = tg.filter(t => t !== src); if (!targets.length) return;
    let keys;
    if (E.scriptMode) { keys = (C.matchKeysScript || fieldsOf(src).map(f => f[0])); }
    else keys = await C.matchPick(src, targets);
    if (!keys || !keys.length) { C.log('Özellik seçilmedi — değişiklik yok.'); return; }
    const n = C.matchApplyKeys(src, targets, keys);
    C.log(`${n} nesneye uygulandı: ${keys.map(k => (fieldsOf(src).find(f => f[0] === k) || GEN.find(g => g[0] === k) || [k, k])[1].split(' (')[0]).join(', ')}.`);
  };
  C.addCommand(['MATCHPROP', 'MA', 'OZELLIKKOPYALA', 'PAINTER'], 'Özellik kopyala (AutoCAD fırçası): kaynak nesneyi seçin, sonra fırça ile hedeflere tıklayın ya da pencere çizin (soldan sağa: içinde kalanlar, sağdan sola: değenler). A = Ayarlar (hangi özellikler kopyalansın). Enter bitirir.', async (I) => {
    if (C.currentView === 'layout' && !C.vpEdit) return matchVp(I);
    if (C.currentView === '3d') { const s0 = C.sel.length === 1 ? C.sel[0] : null; if (s0) { C.sel = []; C.emit('selection'); } return matchRich(I, s0); }
    let src = C.sel.length === 1 ? C.sel[0] : null; if (src) { C.sel = []; C.emit('selection'); }
    E.noSnap = true;
    if (!src) {
      for (; ;) { const p = await I.pt('Kaynak nesneyi seçin'); if (!p || typeof p === 'string') return; src = pick(p); if (src) break; C.warn('Nesne bulunamadı'); }
    }
    if (RICH.has(src.type)) return matchRich(I, src); // yapı / 3B elemanı: seçmeli özellik listesi
    C.log(`Kaynak: ${(C.T[src.type] && C.T[src.type].label) || src.type} — katman ${src.layer}. Geçerli ayarlar: ${GROUPS.filter(g => cfg[g[0]]).map(g => g[1].split(' (')[0]).join(', ')}`);
    E.cursorIcon = 'brush';
    const hl = C.views && C.views.plan;
    E.preview = cur => { // üzerine gelince sonucu göster
      const e = pick(cur); if (!e || e === src) { E.previewEnt = null; return []; }
      const c = JSON.parse(JSON.stringify(C.cleanEnt(e))); C.matchApply(src, c); E.previewEnt = c;
      try { return C.T[c.type].prims(c); } catch (err) { return []; }
    };
    let n = 0;
    const apply = list => { const t = list.filter(e => e !== src); if (!t.length) return; for (const e of t) C.matchApply(src, e); n += t.length; C.changed(); C.emit('layers'); };
    try {
      for (; ;) {
        const r = await I.pt('Hedef nesneleri seçin (fırça)', { kw: [['A', 'Ayarlar', 'S']] });
        if (r == null || r === '') break;
        if (r === 'A' || r === 'S') { if (!E.scriptMode) await settingsDialog(src); continue; }
        if (typeof r === 'string') continue;
        const e = pick(r);
        if (e) { apply([e]); continue; }
        if (E.scriptMode) continue;
        // boş yere tıklama: pencere (soldan sağa) / kesişen (sağdan sola) — AutoCAD gibi
        const pv = E.preview; E.base = r; E.rubber = false;
        E.preview = c => [C.prim.P([r, [c[0], r[1]], c, [r[0], c[1]]], true, { lt: c[0] >= r[0] ? 'CONTINUOUS' : 'DASHED', color: c[0] >= r[0] ? 5 : 3 })]; E.previewEnt = null;
        const b = await I.pt('Karşı köşe'); E.preview = pv; E.base = null; E.rubber = true;
        if (!b || typeof b === 'string') continue;
        const v = C.views.plan, a1 = v.w2s(r), b1 = v.w2s(b);
        const list = v.windowSel ? v.windowSel(a1[0], a1[1], b1[0], b1[1]) : [];
        apply(list);
      }
    } finally { E.preview = null; E.previewEnt = null; E.cursorIcon = null; }
    if (n) C.log(`${n} nesneye özellikler kopyalandı.`);
  });
  C.addCommand(['PAINTERSET', 'OZELLIKAYAR'], 'Özellik kopyalama ayarları (hangi özellikler kopyalansın)', async () => { await settingsDialog({ type: '-', layer: '-', color: 256 }); }, { noUndo: true });
})(window.C);

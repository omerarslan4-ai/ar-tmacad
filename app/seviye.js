/* ArıtmaCAD — KAT SEVİYELERİ (Revit "Levels" gibi)
   C.doc.set.seviye = { abs0: ±0.00'ın mutlak kotu (m) | null, toprak: doğal toprak proje kotu, list: [{ id, ad, z, kh (plan kesit yüksekliği) }], aktif: id }
   - Yeni projede / ilk açılışta toprak kotu ve ±0.00 sorulur, yapı tipine göre hazır seviyeler önerilir.
   - Seviyeler paneli (sağ panel): ad / kot düzenleme, aktif seviye, seviye planı (Tasarım'da filtre), kot planı çıkar, paftaya plan.
   - Elemanlar alt seviyeye (e.sv) ve perde / kolon üst seviyeye (e.svU) bağlanır; seviye kotu değişince birlikte kayar / uzar.
   - Kesitlerde seviye çizgileri (seviyecizgi nesnesi; sağ uçtan çekince kot değişir) ve toprak çizgisi; 3B'de yarı saydam seviye düzlemleri. */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, TX } = C.prim;
  const SV = () => (C.doc && C.doc.set && C.doc.set.seviye && Array.isArray(C.doc.set.seviye.list)) ? C.doc.set.seviye : null;
  const list = () => { const s = SV(); return s ? s.list.slice().sort((a, b) => a.z - b.z) : []; };
  C.seviyeler = list;
  C.svGet = id => { const s = SV(); if (!s) return null; if (id === 'toprak') return { id: 'toprak', ad: 'Toprak kotu', z: +s.toprak || 0, toprak: true }; return s.list.find(l => l.id === id) || null; };
  C.svAktif = () => { const s = SV(); return s ? (s.list.find(l => l.id === s.aktif) || list().find(l => Math.abs(l.z) < 1e-6) || list()[0] || null) : null; };
  const fz = v => (Math.abs(v) < 0.0005 ? '±0.00' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(2));
  const absOf = z => { const s = SV(); return s && s.abs0 != null && isFinite(s.abs0) ? +s.abs0 + z : null; };
  C.svFmt = fz; C.svAbs = absOf;
  const nid = () => 'L' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const num = v => { const x = parseFloat(String(v).replace('−', '-').replace('±', '').replace(',', '.')); return isFinite(x) ? x : null; };
  const redraw = () => { for (const e of C.doc.ents) if (e.type === 'seviyecizgi' && e._c) { delete e._c.p; delete e._c.b; } const v3 = C.views && C.views.v3; if (v3) { v3.needBuild = true; v3.dirty = true; } if (C.views) for (const w of Object.values(C.views)) if (w && 'dirty' in w) w.dirty = true; C.emit('seviye'); C.emit('layouts'); };

  /* ---------- hazır seviyeler ---------- */
  const PRESET = {
    pompa: (kh, d) => [['Çatı', kh], ['Zemin kat', 0], ['Islak hacim tabanı', -d], ['Temel altı', -d - 0.6]],
    havuz: (kh, d) => [['Havuz üstü', 0.5], ['Zemin', 0], ['Havuz tabanı', -d], ['Temel altı', -d - 0.6]],
    bina: (kh) => [['Çatı', 2 * kh], ['1. kat', kh], ['Zemin kat', 0], ['Temel altı', -1.2]],
    bos: () => [['Zemin kat', 0]],
  };
  /* ---------- eleman z aralığı ---------- */
  const zRange = e => {
    if (!e || e.gv) return null; if (e._c && e._c.zr !== undefined) return e._c.zr;
    let r = null; try { const t = C.entTris(e); if (t && t.pos && t.pos.length) { let a = Infinity, b = -Infinity; for (let i = 2; i < t.pos.length; i += 3) { const z = t.pos[i]; if (z < a) a = z; if (z > b) b = z; } if (isFinite(a)) r = [a, b]; } } catch (er) { }
    if (e._c) e._c.zr = r; else e._c = { zr: r }; return r;
  };
  C.zRange = zRange;
  const TALL = new Set(['perde', 'kolon']), TOPB = new Set(['plak', 'temel', 'dolgu', 'kaplama', 'tretuvar']);
  const bindOne = e => {
    const ls = list(); if (!ls.length) return; const zr = zRange(e); if (!zr) { e.sv = null; return; }
    let best = null, bd = Infinity;
    if (TOPB.has(e.type)) for (const l of ls) { const d = Math.abs(zr[1] - l.z); if (d < 0.02 && d < bd) { bd = d; best = l; } } // döşeme / temel: üst yüzüyle seviyede
    if (!best) for (const l of ls) { const d = Math.min(Math.abs(zr[0] - l.z), Math.abs(zr[1] - l.z)); if (d < bd) { bd = d; best = l; } }
    if (bd > 0.6) { const below = ls.filter(l => l.z <= zr[0] + 1e-6); best = below.length ? below[below.length - 1] : ls[0]; }
    e.sv = best.id; delete e.svU;
    if (TALL.has(e.type) && e.h != null) { let u = null, ud = Infinity; for (const l of ls) { if (l === best) continue; const d = zr[1] - l.z; if (Math.abs(d) <= 0.6 && Math.abs(d) < ud) { ud = Math.abs(d); u = l; } } if (u) e.svU = u.id; }
  };
  const bindAll = force => { if (!list().length) return; for (const e of C.doc.ents) if (force || e.sv === undefined) bindOne(e); };
  C.svBindAll = bindAll;
  let binding = false;
  C.on('change', () => { if (binding || !SV()) return; binding = true; try { for (const e of C.doc.ents) if (e.sv === undefined && !e.gv && C.T[e.type] && (C.T[e.type].mesh || C.T[e.type].meshes)) bindOne(e); } catch (er) { console.error(er); } finally { binding = false; } });

  /* ---------- seviye kotu değişince ---------- */
  C.setSeviyeZ = (id, z2, noUndo) => {
    const s = SV(); if (!s || z2 == null || !isFinite(z2)) return false; z2 = Math.round(z2 * 1000) / 1000;
    if (!noUndo) { C.undoStack && C.undoStack.push(C.snapshot()); C.redoStack = []; }
    if (id === 'toprak') { s.toprak = z2; C.changed(); redraw(); return true; }
    const lv = s.list.find(l => l.id === id); if (!lv) return false; const dz = z2 - lv.z; if (Math.abs(dz) < 1e-9) return true; lv.z = z2;
    let nM = 0, nH = 0;
    for (const e of C.doc.ents) {
      if (e.sv === id) { try { C.xform(e, C.xMove([0, 0, dz])); nM++; } catch (er) { } if (e.svU && e.svU !== id && e.h != null) { e.h = Math.max(0.05, +e.h - dz); delete e._c; } }
      else if (e.svU === id && e.h != null) { e.h = Math.max(0.05, +e.h + dz); delete e._c; nH++; }
    }
    if (s.aktif === id) setElev(z2);
    C.changed(); redraw(); if (!noUndo) C.log(`${lv.ad}: ${fz(z2)}${absOf(z2) != null ? ' (' + absOf(z2).toFixed(2) + ')' : ''} — ${nM} eleman kaydırıldı${nH ? ', ' + nH + ' perde/kolon boyu güncellendi' : ''}.`); return true;
  };
  const setElev = z => { const v3 = C.views && C.views.v3; if (v3) v3.elev = z; const el = document.querySelector('#v3elev'); if (el) el.value = String(+z.toFixed(3)); };
  C.setSvAktif = id => { const s = SV(); if (!s) return; s.aktif = id; const l = C.svGet(id); if (l) setElev(l.z); redraw(); renderBar(); };

  /* ---------- kurulum ---------- */
  C.setSeviyeler = cfg => {
    C.undoStack && C.undoStack.push(C.snapshot()); C.redoStack = [];
    const old = SV(), keep = old ? old.list : [];
    const lst = cfg.rows.filter(r => r.ad && r.z != null).map(r => { const prev = keep.find(k => k.ad === r.ad); return { id: (prev && prev.id) || nid(), ad: r.ad, z: +r.z, kh: prev && prev.kh != null ? prev.kh : 1.2 }; });
    C.doc.set.seviye = { abs0: cfg.abs0, toprak: cfg.toprak, list: lst, aktif: (lst.find(l => Math.abs(l.z) < 1e-6) || lst[0] || {}).id };
    for (const e of C.doc.ents) delete e.sv; bindAll(true);
    const a = C.svAktif(); if (a) setElev(a.z);
    C.changed(); redraw(); renderBar(); renderPane();
    C.log(`📐 Kat seviyeleri: ${lst.length} seviye${cfg.abs0 != null ? ` · ±0.00 = ${(+cfg.abs0).toFixed(2)}` : ''} · toprak ${fz(cfg.toprak)}. Seviyeler panelinden düzenleyebilirsiniz.`);
  };
  C.seviyeKurulum = (o = {}) => {
    if (!C.modal) return; const s = SV(), abs0 = s && s.abs0 != null ? s.abs0 : '', tAbs = s && s.abs0 != null ? (+s.abs0 + (+s.toprak || 0)).toFixed(2) : '';
    let rows = s ? list().slice().reverse().map(l => ({ ad: l.ad, z: l.z })) : PRESET.pompa(4.2, 5.2).map(([ad, z]) => ({ ad, z }));
    const b = C.modal(o.yeni ? 'Yeni proje — kot sistemi' : 'Kat seviyeleri — kurulum', `
      <p class="hint">Çizime başlamadan önce toprak kotunu ve ±0.00 kotunu belirleyin. Tüm kat seviyeleri buna göre kurulur; sonradan <b>Seviyeler</b> panelinden değiştirebilirsiniz.</p>
      <div class="svk-grid">
        <label>Doğal toprak (arazi) kotu — mutlak, m<input data-k="tabs" value="${esc(tAbs)}" placeholder="ör. 125.40"></label>
        <label>±0.00 kotu (bitmiş zemin kat) — mutlak, m<input data-k="abs0" value="${esc(abs0)}" placeholder="ör. 125.85"></label>
        <label>Toprak kotu — proje kotu (mutlak bilinmiyorsa)<input data-k="trel" value="${s ? esc((+s.toprak || 0).toFixed(2)) : '-0.45'}"></label>
        <label>Yapı tipi (hazır seviyeler)<select data-k="tip"><option value="">— mevcut liste —</option><option value="pompa">Pompa istasyonu (ıslak hacim + üst bina)</option><option value="havuz">Arıtma havuzu</option><option value="bina">Bina (çok katlı)</option><option value="bos">Boş — kendim ekleyeceğim</option></select></label>
        <label>Kat yüksekliği (üst bina), m<input data-k="kh" value="4.20"></label>
        <label>Islak hacim / havuz derinliği, m<input data-k="d" value="5.20"></label>
      </div>
      <div class="svk-tab"><div class="svk-h"><span>Seviye</span><span>Proje kotu</span><span>Mutlak</span><span></span></div><div data-rows></div>
      <button data-add class="svk-btn">+ Seviye ekle</button></div>
      <div class="svk-row2"><span data-tinfo class="hint"></span></div>
      <div class="bar" style="justify-content:flex-end;gap:8px;margin-top:10px">${o.yeni ? '<label class="hint" style="margin-right:auto"><input type="checkbox" data-nosor> Yeni projede bir daha sorma</label><button data-skip>Kotsuz başla</button>' : ''}<button class="pri" data-ok>${s ? 'Uygula' : 'Seviyeleri oluştur ve başla'}</button></div>`);
    const q = k => b.querySelector(`[data-k=${k}]`);
    const absNow = () => num(q('abs0').value), trel = () => { const ta = num(q('tabs').value), a0 = absNow(); return ta != null && a0 != null ? +(ta - a0).toFixed(3) : num(q('trel').value) || 0; };
    const draw = () => {
      const a0 = absNow(), host = b.querySelector('[data-rows]'); host.innerHTML = '';
      const all = rows.map((r, i) => ({ r, i })).concat([{ r: { ad: 'Toprak kotu', z: trel() }, i: -1 }]).sort((x, y) => y.r.z - x.r.z);
      for (const { r, i } of all) {
        const d = document.createElement('div'); d.className = 'svk-r' + (i < 0 ? ' toprak' : '');
        d.innerHTML = i < 0 ? `<span>Toprak kotu</span><span>${fz(r.z)}</span><span>${a0 != null ? (a0 + r.z).toFixed(2) : '—'}</span><span class="hint">arazi çizgisi</span>`
          : `<input data-ad value="${esc(r.ad)}" aria-label="Seviye adı"><input data-z value="${(+r.z).toFixed(2)}" aria-label="Proje kotu"><span>${a0 != null ? (a0 + r.z).toFixed(2) : '—'}</span><button data-del title="Sil" aria-label="Seviyeyi sil">✕</button>`;
        if (i >= 0) { d.querySelector('[data-ad]').oninput = ev => { rows[i].ad = ev.target.value; }; d.querySelector('[data-z]').onchange = ev => { const v = num(ev.target.value); if (v != null) rows[i].z = v; draw(); }; d.querySelector('[data-del]').onclick = () => { rows.splice(i, 1); draw(); }; }
        host.appendChild(d);
      }
      const ti = b.querySelector('[data-tinfo]'); ti.textContent = a0 != null ? `Toprak kotu proje kotuyla ${fz(trel())} (mutlak ${(a0 + trel()).toFixed(2)})` : 'Mutlak kot girilmezse yalnız proje kotları kullanılır.';
      q('trel').disabled = num(q('tabs').value) != null && a0 != null;
    };
    q('tabs').oninput = draw; q('abs0').oninput = draw; q('trel').oninput = draw;
    const preset = () => { const t = q('tip').value; if (!t) return; rows = PRESET[t](num(q('kh').value) || 4.2, num(q('d').value) || 5.2).map(([ad, z]) => ({ ad, z: +z.toFixed(3) })); draw(); };
    q('tip').onchange = preset; q('kh').onchange = preset; q('d').onchange = preset;
    b.querySelector('[data-add]').onclick = () => { const top = rows.reduce((m, r) => Math.max(m, r.z), 0); rows.push({ ad: `Seviye ${rows.length + 1}`, z: +(top + (num(q('kh').value) || 3)).toFixed(2) }); draw(); };
    const sk = b.querySelector('[data-skip]'); if (sk) sk.onclick = () => { const ns = b.querySelector('[data-nosor]'); if (ns && ns.checked) try { localStorage.setItem('aritmacad.seviyeSorma', '1'); } catch (er) { } C.doc.set.seviyeAtla = true; C.closeModal(); };
    b.querySelector('[data-ok]').onclick = () => { const ns = b.querySelector('[data-nosor]'); if (ns && ns.checked) try { localStorage.setItem('aritmacad.seviyeSorma', '1'); } catch (er) { } C.setSeviyeler({ abs0: absNow(), toprak: trel(), rows }); C.closeModal(); };
    if (!s) q('tip').value = 'pompa';
    draw(); setTimeout(() => q('tabs').focus(), 40);
  };
  C.addCommand(['SEVIYEKUR', 'KATSEVIYE', 'LEVELS', 'SEVIYELER', 'TOPRAKKOTU'], 'Kat seviyeleri kurulumu: toprak kotu, ±0.00 mutlak kotu, hazır seviyeler (pompa istasyonu, havuz, bina).', () => C.seviyeKurulum({}), { noUndo: true });
  C.addCommand(['SEVIYE', 'YENISEVIYE', 'LEVEL'], 'Yeni kat seviyesi: SEVIYE ad kot  (ör. SEVIYE "Asma kat" 2.40). Seviye yoksa önce kurulum açılır.', async (I) => {
    if (!SV()) { C.seviyeKurulum({}); return; }
    const ad = await I.str('Seviye adı', `Seviye ${SV().list.length + 1}`, { whole: false }); if (!ad) return; const z = await I.num('Proje kotu (m)', 3); if (z == null) return;
    C.undoStack.push(C.snapshot()); SV().list.push({ id: nid(), ad: String(ad), z: +z, kh: 1.2 }); C.changed(); redraw(); renderBar(); renderPane(); C.log(`Seviye eklendi: ${ad} ${fz(+z)}`);
  });
  C.addCommand(['SEVIYEKOT', 'SEVIYEDEGISTIR'], 'Seviye kotunu değiştir: SEVIYEKOT ad yeniKot — bağlı elemanlar birlikte kayar.', async (I) => {
    if (!SV()) return C.warn('Seviye yok (SEVIYEKUR).'); const ad = await I.str('Seviye adı', (C.svAktif() || {}).ad, { whole: false }); const z = await I.num('Yeni proje kotu', 0); if (z == null) return;
    const l = C.up(String(ad)) === 'TOPRAK' ? { id: 'toprak' } : SV().list.find(x => C.up(x.ad) === C.up(String(ad))); if (!l) return C.warn('Seviye bulunamadı: ' + ad); C.setSeviyeZ(l.id, +z);
  });

  /* ---------- açılışta / yeni projede sor ---------- */
  const askOK = () => { try { return localStorage.getItem('aritmacad.seviyeSorma') !== '1'; } catch (er) { return true; } };
  const maybeAsk = () => { if (!askOK() || SV() || (C.doc.set && C.doc.set.seviyeAtla) || C.doc.ents.length || E.scriptMode || (E.queue && E.queue.length) || navigator.webdriver) return; const m = document.querySelector('#modal'); if (m && !m.classList.contains('hidden')) return; C.seviyeKurulum({ yeni: true }); };
  { const nd = C.newDoc; C.newDoc = function () { const r = nd.apply(this, arguments); if (C._svStarted) setTimeout(maybeAsk, 250); return r; }; }
  setTimeout(() => { C._svStarted = true; maybeAsk(); }, 1500);

  /* ---------- plan filtresi (seviye planı) ---------- */
  const nextAbove = l => { const ls = list(), i = ls.findIndex(x => x.id === l.id); return i >= 0 && i < ls.length - 1 ? ls[i + 1].z : Infinity; };
  const levelOk = (e, sid) => {
    if (!sid || e.gv) return true; if (e.sv2) return e.sv2 === sid; const lv = C.svGet(sid); if (!lv) return true;
    if (!(C.T[e.type] && (C.T[e.type].mesh || C.T[e.type].meshes))) return true; const zr = zRange(e); if (!zr) return true;
    return zr[1] > lv.z - 0.02 && zr[0] < nextAbove(lv) - 0.005;
  };
  C.svLevelOk = levelOk;
  /* göz: seçilen seviye ve altındakiler görünür, üstündekiler kapanır (plan + 3B) */
  const gozOk = e => {
    const gid = C.state.svGoz; if (!gid || e.gv || e.type === 'seviyecizgi') return true; const lv = C.svGet(gid); if (!lv) return true;
    if (e.sv2) { const l2 = C.svGet(e.sv2); return !l2 || l2.z <= lv.z + 1e-6; }
    if (!(C.T[e.type] && (C.T[e.type].mesh || C.T[e.type].meshes))) return true;
    const ls = e.sv && C.svGet(e.sv); if (ls) return ls.z <= lv.z + 1e-6; // elemanın bağlı olduğu seviye
    const zr = zRange(e); if (!zr) return true; return zr[0] < nextAbove(lv) - 0.005;
  };
  C.svGozOk = gozOk;
  C.svGoz = id => {
    C.state.svGoz = id || null; redraw(); if (C.views) for (const k in C.views) { const v = C.views[k]; if (v) { v.dirty = true; if ('needBuild' in v) v.needBuild = true; } } renderPane();
    const l = id && C.svGet(id); C.log(l ? `👁 ${l.ad} (${fz(l.z)}) ve altındaki seviyeler gösteriliyor; üstündekiler gizlendi. Tümünü açmak için gözü tekrar tıklayın.` : '👁 Tüm seviyeler görünür.');
  };
  { const P2 = C.View2D && C.View2D.prototype; if (P2) {
      const wf = (self, fn) => { const sid = C.vpEdit ? C.vpEdit.sv : C.state.planSv, gz = !self.isLayout && C.state.svGoz; if (self.isLayout || (!sid && !gz) || !SV()) return fn(); const all = C.doc.ents; C.doc.ents = all.filter(e => (!sid || levelOk(e, sid)) && (!gz || gozOk(e))); try { return fn(); } finally { C.doc.ents = all; } };
      for (const k of ['draw', 'pick', 'windowSel', 'snap']) { const f0 = P2[k]; if (f0) P2[k] = function () { return wf(this, () => f0.apply(this, arguments)); }; }
    } }
  const outHide = e => { if (e.type !== 'seviyecizgi') return false; const s = SV(); if (!s) return false; return e.sid === 'toprak' ? s.ciktiToprak === false : s.cikti === false; };
  C.svOutHide = outHide;
  { const v0 = C.vpPrims; C.vpPrims = function (vp, cb) { return v0.call(this, vp, (e, pr) => { if (outHide(e)) return; if (vp && vp.sv && !levelOk(e, vp.sv)) return; cb(e, pr); }); }; }
  { const w0 = C.dxfWrite; if (w0) C.dxfWrite = function (opts) { if (opts && opts.plain && SV()) { const o2 = Object.assign({}, opts); if (o2.ents) o2.ents = o2.ents.filter(e => !outHide(e)); else { const all = C.doc.ents; C.doc.ents = all.filter(e => !outHide(e)); try { return w0.call(this, o2); } finally { C.doc.ents = all; } } return w0.call(this, o2); } return w0.apply(this, arguments); }; }
  /* planda seviye görünümündeyken çizilen 2B nesneler o seviyeye ait */
  { const ne0 = C.newEnt; C.newEnt = function (type, props) { const e = ne0.apply(this, arguments); if (C.state.planSv && C.currentView === 'plan' && !e.gv && !(C.T[type] && (C.T[type].mesh || C.T[type].meshes)) && e.sv2 == null) e.sv2 = C.state.planSv; return e; }; }
  C.svPlan = id => { C.state.planSv = id || null; if (C.currentView !== 'plan' && C.setView) C.setView('plan'); if (C.views && C.views.plan) C.views.plan.dirty = true; renderPane(); renderBar(); const l = id && C.svGet(id); C.log(l ? `🗺 ${l.ad} planı (${fz(l.z)}): yalnız bu seviyedeki elemanlar gösterilir. Tümünü görmek için Seviyeler › Tümü.` : 'Plan: tüm seviyeler.'); };
  C.svKotPlani = id => { const l = C.svGet(id); if (!l) return; C.runTool ? C.runTool(`KOTPLANI ${(l.z + (l.kh != null ? l.kh : 1.2)).toFixed(2)}`) : C.cmd.run(`KOTPLANI ${(l.z + 1.2).toFixed(2)}`); };
  C.svPafta = id => {
    const l = C.svGet(id); if (!l) return; let bb = null;
    for (const e of C.doc.ents) { if (e.gv || !levelOk(e, id) || !zRange(e)) continue; let b; try { b = C.bbox(e); } catch (er) { continue; } bb = bb ? [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])] : b.slice(); }
    if (!bb) return C.warn(`${l.ad} seviyesinde eleman yok.`);
    C.undoStack.push(C.snapshot()); const Ly = C.newLayout(`${l.ad} planı`); const fr = C.layoutFrame(Ly), y0 = (fr.tbTop || fr.y0) + 12, w = fr.x1 - fr.x0 - 24, h = fr.y1 - y0 - 12;
    const need = Math.max((bb[2] - bb[0] + 2) * 1000 / w, (bb[3] - bb[1] + 2) * 1000 / h), sc = (C.STD_SCALES || [50, 100, 200]).find(v => v >= need) || 500;
    Ly.vps = [{ x: fr.x0 + 12, y: y0, w, h, cx: (bb[0] + bb[2]) / 2, cy: (bb[1] + bb[3]) / 2, scale: sc, sv: id, label: `${l.ad.toLocaleUpperCase('tr')} PLANI  ${fz(l.z)}` }];
    C.changed(); C.emit('layouts'); C.log(`📄 "${Ly.name}" paftası: ${l.ad} planı, 1/${sc}.`);
    if (C.layoutIdx != null) { C.layoutIdx = C.doc.layouts.indexOf(Ly); C.setView && C.setView('layout'); }
  };

  /* ---------- kesitte seviye çizgisi ---------- */
  const svLay = () => { C.ensureLayer('SEVIYE', 4, 'DASHED', 18); return 'SEVIYE'; };
  T.seviyecizgi = {
    label: 'Seviye çizgisi',
    prims: e => {
      const lv = C.svGet(e.sid), out = []; if (!lv) return out; const y = e.y0 + lv.z, ps = C.pstil ? C.pstil() : null, th = C.annoH(ps ? ((C.cizimKural && C.cizimKural.MIMARI.yazi.ZMN.mm[0]) || 2.5) : 2.2), st = ps ? { st: ps.yazi } : (C.styles && C.styles().KOT ? { st: 'KOT' } : {}); // pafta stilinde: YZ, 2,5 mm (zemin kotu yazısı kuralı)
      const top = lv.toprak, col = top ? { color: 30 } : {};
      if (top) {
        const segs = [[e.x0, e.ix0 != null ? e.ix0 : e.x0], [e.ix1 != null ? e.ix1 : e.x1, e.x1]];
        for (const [a, b] of segs) { if (b - a < 1e-3) continue; out.push(L([a, y, 0], [b, y, 0], Object.assign({ lw: 35 }, col))); const hs = th * 1.1; for (let x = a; x < b - hs * 0.5; x += hs) out.push(L([x, y, 0], [Math.min(b, x + hs), y - hs, 0], col)); }
        if (e.ix0 != null) out.push(L([e.ix0, y, 0], [e.ix1, y, 0], Object.assign({ lt: 'DASHED' }, col)));
      } else out.push(L([e.x0, y, 0], [e.x1, y, 0], { lt: 'DASHED' }));
      const x = e.x1 + th * 0.8, ab = absOf(lv.z);
      out.push(L([e.x1, y, 0], [x, y, 0], col));
      out.push(TX([x + th * 0.3, top ? y - th * 1.35 : y + th * 0.35, 0], th, `${(lv.ad || '').toLocaleUpperCase('tr')}  ${fz(lv.z)}${ab != null ? `  (${ab.toFixed(2)})` : ''}`, 0, 'L', Object.assign({}, st, col)));
      return out;
    },
    xf: (e, X) => { const a = X.p([e.x0, e.y0, 0]), b = X.p([e.x1, e.y0, 0]); e.x0 = Math.min(a[0], b[0]); e.x1 = Math.max(a[0], b[0]); e.y0 = a[1]; if (e.ix0 != null) { const c = X.p([e.ix0, e.y0, 0])[0], d = X.p([e.ix1, e.y0, 0])[0]; e.ix0 = Math.min(c, d); e.ix1 = Math.max(c, d); } },
    snaps: e => { const lv = C.svGet(e.sid); if (!lv) return []; const y = e.y0 + lv.z; return [{ p: [e.x0, y, 0], k: 'end' }, { p: [e.x1, y, 0], k: 'end' }]; },
    info: e => { const lv = C.svGet(e.sid); return lv ? `Seviye çizgisi · ${lv.ad} ${fz(lv.z)}${absOf(lv.z) != null ? ' (' + absOf(lv.z).toFixed(2) + ')' : ''} — sağ uçtaki tutamacı yukarı / aşağı çekince seviye kotu değişir` : 'Seviye çizgisi (seviye silinmiş)'; },
  };
  if (C.ANNO_TYPES && C.ANNO_TYPES.add) C.ANNO_TYPES.add('seviyecizgi');
  { const g0 = C.gripsOf; if (g0) C.gripsOf = e => { if (e.type !== 'seviyecizgi') return g0(e); const lv = C.svGet(e.sid); if (!lv) return []; const y = e.y0 + lv.z;
    return [{ p: [e.x1, y, 0], k: 'end', set: (x, q) => { const z = Math.round((q[1] - x.y0) * 100) / 100; C.setSeviyeZ(x.sid, z, true); } }, { p: [e.x0, y, 0], k: 'end', set: (x, q) => { x.x0 = Math.min(q[0], x.x1 - 0.5); } }]; }; }
  /* KESITAL'den çağrılır: W = kesit → dünya, ub = kesit sınırları */
  C.seviyeKesit = (W, ub) => {
    if (!list().length) return false; const ly = svLay(), y0 = W([0, 0])[1], x0 = W([ub[0] - 2, 0])[0], x1 = W([ub[2] + 2, 0])[0];
    for (const l of list()) C.add(C.newEnt('seviyecizgi', { sid: l.id, x0, x1, y0, layer: ly }));
    C.add(C.newEnt('seviyecizgi', { sid: 'toprak', x0, x1, y0, ix0: W([ub[0], 0])[0], ix1: W([ub[2], 0])[0], layer: ly }));
    return true;
  };

  /* ---------- 3B seviye düzlemleri ---------- */
  if (C.state.v3sev == null) { try { C.state.v3sev = localStorage.getItem('aritmacad.v3sev') !== '0'; } catch (er) { C.state.v3sev = true; } }
  const extent = () => { let bb = null; for (const e of C.doc.ents) { if (e.gv || !zRange(e)) continue; let b; try { b = C.bbox(e); } catch (er) { continue; } bb = bb ? [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])] : b.slice(); } if (!bb) bb = [-10, -10, 10, 10]; const m = Math.max(2, 0.08 * Math.max(bb[2] - bb[0], bb[3] - bb[1])); return [bb[0] - m, bb[1] - m, bb[2] + m, bb[3] + m]; };
  const planes = () => { if (!SV() || !C.state.v3sev) return []; const a = C.svAktif(); return list().map(l => ({ l, z: l.z, col: [0.29, 0.56, 0.89], al: a && a.id === l.id ? 0.2 : 0.09, on: a && a.id === l.id })).concat([{ l: C.svGet('toprak'), z: +SV().toprak || 0, col: [0.75, 0.54, 0.24], al: 0.12, top: true }]); };
  const hook3d = () => {
    const v3 = C.views && C.views.v3; if (!v3) { setTimeout(hook3d, 200); return; } if (v3._svHooked) return; v3._svHooked = true;
    const b0 = v3.build.bind(v3);
    v3.build = function () { let r; if (C.state.svGoz && SV()) { const all = C.doc.ents; C.doc.ents = all.filter(gozOk); try { r = b0.apply(this, arguments); } finally { C.doc.ents = all; } } else r = b0.apply(this, arguments); try { const P = planes(); if (P.length && this.makeBuf) { const o = this.origin, bb = extent(); this._svBB = bb; for (const p of P) { const c = p.col, v = (x, y) => [x - o[0], y - o[1], p.z, 0, 0, 1, c[0], c[1], c[2]]; const arr = [...v(bb[0], bb[1]), ...v(bb[2], bb[1]), ...v(bb[2], bb[3]), ...v(bb[0], bb[1]), ...v(bb[2], bb[3]), ...v(bb[0], bb[3])]; this.trans.push({ al: p.al, b: this.makeBuf(arr, 9), sev: true }); } this.trans.sort((a, b) => b.al - a.al); } } catch (er) { console.error(er); } return r; };
    const d0 = v3.drawMarks.bind(v3);
    v3.drawMarks = function () { const r = d0.apply(this, arguments); try { const P = planes(), bb = this._svBB; if (!P.length || !bb || !this.ovc) return r; const g = this.ovc.getContext('2d');
      const used = [];
      for (const p of P) { const cs = [[bb[0], bb[1]], [bb[2], bb[1]], [bb[2], bb[3]], [bb[0], bb[3]]].map(q => this.project([q[0], q[1], p.z])); if (!cs.every(Boolean)) continue;
        g.save(); g.setLineDash(p.top ? [6, 4] : []); g.strokeStyle = p.top ? 'rgba(192,138,62,.9)' : p.on ? '#4a90e2' : 'rgba(74,144,226,.55)'; g.lineWidth = p.on ? 2 : 1; g.beginPath(); cs.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.stroke(); g.restore();
        const rt = cs.reduce((m, q) => (q[0] > m[0] ? q : m), cs[0]), txt = `${(p.l.ad || '').toLocaleUpperCase('tr')} ${fz(p.z)}${p.on ? ' · aktif' : ''}`; g.font = '600 12px "Segoe UI", system-ui, sans-serif'; const w = g.measureText(txt).width; let ly = rt[1]; for (let k = 0; k < 20 && used.some(u => Math.abs(u - ly) < 18); k++) ly += 18; used.push(ly); rt[1] = ly;
        if (p.on) { g.fillStyle = '#3d7ee0'; g.fillRect(rt[0] + 8, rt[1] - 10, w + 10, 18); g.fillStyle = '#fff'; } else g.fillStyle = p.top ? '#e0a040' : '#7fb0ff'; g.fillText(txt, rt[0] + 13, rt[1] + 3); }
    } catch (er) { } return r; };
  };
  hook3d();
  C.on('seviye', () => { const v3 = C.views && C.views.v3; if (v3) { v3.needBuild = true; v3.dirty = true; } });

  /* ---------- özellikler: alt / üst seviye ---------- */
  C.seviyePropsHTML = (s) => {
    if (!list().length || !s.length || !s.every(e => zRange(e))) return '';
    const e0 = s[0], same = k => s.every(e => e[k] === e0[k]), opt = (v, none) => (none ? `<option value="">${none}</option>` : '') + list().slice().reverse().map(l => `<option value="${l.id}" ${v === l.id ? 'selected' : ''}>${esc(l.ad)} (${fz(l.z)})</option>`).join('');
    const zr = zRange(e0), lb = C.svGet(e0.sv), lu = C.svGet(e0.svU);
    let h = `<h4>Seviye</h4><div class="fld"><label>Alt seviye</label><select data-svb>${same('sv') ? '' : '<option value="*">*farklı*</option>'}${opt(same('sv') ? e0.sv : '*', '— bağlı değil —')}</select></div>`;
    if (s.length === 1 && lb) h += `<div class="fld"><label>Alt öteleme (m)</label><input data-svbo type="number" step="0.01" value="${(zr[0] - lb.z).toFixed(3)}"></div>`;
    if (s.every(e => TALL.has(e.type) && e.h != null)) { h += `<div class="fld"><label>Üst seviye</label><select data-svu>${same('svU') ? '' : '<option value="*">*farklı*</option>'}${opt(same('svU') ? e0.svU : '*', '— yükseklik serbest —')}</select></div>`; if (s.length === 1 && lu) h += `<div class="fld"><label>Üst öteleme (m)</label><input data-svuo type="number" step="0.01" value="${(zr[1] - lu.z).toFixed(3)}"></div>`; }
    return h;
  };
  C.seviyePropsWire = (b, s, apply) => {
    const sb = b.querySelector('[data-svb]'), so = b.querySelector('[data-svbo]'), su = b.querySelector('[data-svu]'), suo = b.querySelector('[data-svuo]');
    if (sb) sb.onchange = () => { const id = sb.value; if (id === '*') return; apply(e => { const old = C.svGet(e.sv), nw = C.svGet(id); if (!nw) { e.sv = null; return; } if (old) C.xform(e, C.xMove([0, 0, nw.z - old.z])); e.sv = id; }); C.renderProps && C.renderProps(); };
    if (so) so.onchange = () => { const v = num(so.value); if (v == null) return; apply(e => { const lb = C.svGet(e.sv), zr = zRange(e); if (lb && zr) { C.xform(e, C.xMove([0, 0, lb.z + v - zr[0]])); if (e.svU && e.h != null) e.h = Math.max(0.05, +e.h - (lb.z + v - zr[0])); } }); };
    if (su) su.onchange = () => { const id = su.value; if (id === '*') return; apply(e => { if (!id) { delete e.svU; return; } const nu = C.svGet(id), zr = zRange(e), ou = C.svGet(e.svU), off = ou && zr ? zr[1] - ou.z : 0; if (nu && zr && e.h != null) { e.h = Math.max(0.05, +e.h + (nu.z + off - zr[1])); } e.svU = id; }); };
    if (suo) suo.onchange = () => { const v = num(suo.value); if (v == null) return; apply(e => { const lu = C.svGet(e.svU), zr = zRange(e); if (lu && zr && e.h != null) e.h = Math.max(0.05, +e.h + (lu.z + v - zr[1])); }); };
  };

  /* ---------- durum çubuğu: aktif seviye ---------- */
  let barEl = null;
  const renderBar = () => {
    const box = document.querySelector('#annoBox'); if (!box) return;
    if (!barEl) { barEl = document.createElement('span'); barEl.id = 'svBox'; barEl.title = 'Aktif kat seviyesi: 3B çalışma kotu ve plan görünümü'; box.parentElement.insertBefore(barEl, box); }
    const ls = list(); if (!ls.length) { barEl.innerHTML = `<button data-svkur title="Kat seviyelerini kur">Seviye…</button>`; barEl.querySelector('[data-svkur]').onclick = () => C.seviyeKurulum({}); return; }
    const a = C.svAktif(); barEl.innerHTML = `Seviye <select aria-label="Aktif seviye" style="max-width:130px">${ls.slice().reverse().map(l => `<option value="${l.id}" ${a && a.id === l.id ? 'selected' : ''}>${esc(l.ad)} ${fz(l.z)}</option>`).join('')}</select>`;
    barEl.querySelector('select').onchange = ev => { C.setSvAktif(ev.target.value); if (C.state.planSv) C.svPlan(ev.target.value); };
  };

  /* ---------- sağ panel: Seviyeler sekmesi ---------- */
  let pane = null;
  const buildPane = () => {
    const tabs = document.querySelector('#sideTabs'), side = document.querySelector('#side'); if (!tabs || !side || pane) return;
    pane = document.createElement('section'); pane.id = 'p-seviyeler'; pane.className = 'pane';
    const panes = side.querySelectorAll('.pane'); (panes[panes.length - 1] || tabs).after(pane);
    const b = document.createElement('button'); b.dataset.p = 'seviyeler'; b.textContent = 'Seviyeler'; const ctl = tabs.querySelector('#sideCtl'); tabs.insertBefore(b, ctl || null);
    b.onclick = () => { tabs.querySelectorAll('button[data-p]').forEach(x => x.classList.toggle('on', x === b)); side.querySelectorAll('.pane').forEach(p2 => p2.classList.toggle('on', p2 === pane)); renderPane(); };
    const st = document.createElement('style'); st.textContent = `#p-seviyeler{padding:10px;overflow:auto;font-size:12.5px}#p-seviyeler .svp-h{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px}#p-seviyeler .svp-r{display:grid;grid-template-columns:20px 24px minmax(0,1fr) 62px 54px;gap:4px;align-items:center;padding:5px 4px;border-bottom:1px solid var(--line,#333)}#p-seviyeler .svp-r.on{background:rgba(61,126,224,.18)}#p-seviyeler .svp-r.toprak{background:rgba(192,138,62,.13)}#p-seviyeler input{width:100%;box-sizing:border-box}#p-seviyeler .svp-r .goz{padding:0;width:24px;height:22px;display:flex;align-items:center;justify-content:center;opacity:.55}#p-seviyeler .svp-r .goz.on{opacity:1;background:rgba(61,126,224,.45);border-color:#3d7ee0}#p-seviyeler .svp-r .goz.kapali{opacity:.25}#p-seviyeler .svp-a{grid-column:3/-1;display:flex;gap:4px;flex-wrap:wrap}#p-seviyeler .svp-a button{font-size:11.5px;padding:2px 6px}#p-seviyeler .abs{color:var(--mut,#999);font-size:11px}
      .svk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px;margin:10px 0}.svk-grid label{display:flex;flex-direction:column;gap:4px;font-size:12.5px}.svk-grid input,.svk-grid select{height:32px;box-sizing:border-box}
      .svk-tab{border:1px solid var(--line,#3a4250);border-radius:6px;padding:8px}.svk-h,.svk-r{display:grid;grid-template-columns:minmax(0,1.6fr) 90px 90px 40px;gap:8px;align-items:center;padding:3px 0}.svk-h{font-size:11.5px;color:var(--mut,#999)}.svk-r.toprak{color:#e0a040}.svk-r input{width:100%;box-sizing:border-box}.svk-btn{margin-top:6px}`;
    document.head.appendChild(st);
  };
  const GOZ = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const renderPane = () => {
    buildPane(); if (!pane) return; const s = SV();
    if (!s) { pane.innerHTML = `<div class="svp-h"><b>Kat seviyeleri</b></div><p class="hint">Henüz seviye yok. Toprak kotunu ve ±0.00'ı girip hazır seviyelerle başlayın.</p><button class="pri" data-kur>Seviyeleri kur…</button>`; pane.querySelector('[data-kur]').onclick = () => C.seviyeKurulum({}); return; }
    const a = C.svAktif(), ls = list().slice().reverse();
    let h = `<div class="svp-h"><b>Kat seviyeleri</b><span class="hint">${s.abs0 != null ? '±0.00 = ' + (+s.abs0).toFixed(2) : 'mutlak kot yok'}</span><span style="flex:1"></span><button data-kur title="Kurulum: toprak, ±0.00, hazır seviyeler">Kurulum…</button><button data-add>+ Seviye</button></div>
      <div class="svp-h"><button data-plan="" class="${C.state.planSv ? '' : 'on'}">Plan: tümü</button><label class="hint"><input type="checkbox" data-v3 ${C.state.v3sev ? 'checked' : ''}> 3B'de düzlemler</label><button data-cog title="En üst seviyenin üstüne kat yüksekliğiyle yeni seviye">Kat çoğalt</button><button data-tipler title="Katmanlı perde / döşeme / radye tipleri">Tipler…</button><button data-sablon title="Proje şablonları">Şablonlar…</button></div>
      <div class="svp-h"><label class="hint" title="Kapalıysa seviye çizgileri paftada, PDF'te ve AutoCAD çıktısında görünmez (Tasarım'da görünür)"><input type="checkbox" data-out ${s.cikti === false ? '' : 'checked'}> Seviye çizgileri çıktıda</label><label class="hint" title="Toprak çizgisi ve taraması çıktıda"><input type="checkbox" data-outt ${s.ciktiToprak === false ? '' : 'checked'}> Toprak çizgisi çıktıda</label></div>`;
    const rowsHtml = [];
    const tz = +s.toprak || 0; let tDone = false;
    const trow = () => `<div class="svp-r toprak"><span title="Toprak">⏚</span><span></span><span style="color:#e0a040;font-weight:600">Toprak kotu</span><input data-tz value="${tz.toFixed(2)}" aria-label="Toprak proje kotu"><span class="abs">${absOf(tz) != null ? absOf(tz).toFixed(2) : ''}</span></div>`;
    for (const l of ls) {
      if (!tDone && tz > l.z) { rowsHtml.push(trow()); tDone = true; }
      const on = a && a.id === l.id, pl = C.state.planSv === l.id, gz = C.state.svGoz;
      rowsHtml.push(`<div class="svp-r ${on ? 'on' : ''}" data-id="${l.id}"><input type="radio" name="svakt" ${on ? 'checked' : ''} aria-label="Aktif seviye" data-akt><button data-goz class="goz ${gz === l.id ? 'on' : gz && l.z > (C.svGet(gz) || { z: Infinity }).z + 1e-6 ? 'kapali' : ''}" title="${gz === l.id ? 'Tüm seviyeleri göster' : 'Yalnız bu seviye ve altındakileri göster (üsttekiler kapanır)'}" aria-label="Seviye görünürlüğü">${GOZ}</button><input data-ad value="${esc(l.ad)}" aria-label="Seviye adı"><input data-z value="${l.z.toFixed(2)}" aria-label="Proje kotu"><span class="abs">${absOf(l.z) != null ? absOf(l.z).toFixed(2) : ''}</span>
        <div class="svp-a"><button data-pl class="${pl ? 'on' : ''}" title="Tasarım'da bu seviyenin planı">Plan</button><button data-kp title="Bu seviyeden kesilmiş kot planı çiz (KOTPLANI)">Kot planı</button><button data-pf title="Bu seviyenin planını yeni paftaya ölçekli pencere olarak koy">Paftaya</button><button data-del title="Seviyeyi sil" aria-label="Seviyeyi sil">✕</button></div></div>`);
    }
    if (!tDone) rowsHtml.push(trow());
    pane.innerHTML = h + rowsHtml.join('') + `<p class="hint" style="margin-top:8px">Kotu değiştirince o seviyeye bağlı elemanlar birlikte kayar; perde ve kolonlar üst seviyeye göre uzar. Kesitte seviye çizgisinin sağ ucundaki tutamacı çekerek de kot değişir.</p>`;
    const Q = sel => pane.querySelector(sel);
    Q('[data-kur]').onclick = () => C.seviyeKurulum({}); Q('[data-add]').onclick = () => C.runTool ? C.runTool('SEVIYE') : C.cmd.run('SEVIYE');
    Q('[data-plan]').onclick = () => C.svPlan(null);
    Q('[data-v3]').onchange = ev => { C.state.v3sev = ev.target.checked; try { localStorage.setItem('aritmacad.v3sev', ev.target.checked ? '1' : '0'); } catch (er) { } redraw(); };
    Q('[data-cog]').onclick = () => { const top = ls[0]; if (!top) return; const below = ls[1], kh = below ? +(top.z - below.z).toFixed(2) || 3 : 3; C.undoStack.push(C.snapshot()); s.list.push({ id: nid(), ad: `Seviye ${s.list.length + 1}`, z: +(top.z + kh).toFixed(2), kh: 1.2 }); C.changed(); redraw(); renderBar(); renderPane(); };
    Q('[data-out]').onchange = ev => { C.undoStack.push(C.snapshot()); s.cikti = ev.target.checked; C.changed(); C.emit('layouts'); C.log(ev.target.checked ? 'Seviye çizgileri çıktıda gösterilecek.' : 'Seviye çizgileri paftada / PDF / AutoCAD çıktısında gösterilmeyecek (Tasarım ekranında görünür).'); };
    Q('[data-outt]').onchange = ev => { C.undoStack.push(C.snapshot()); s.ciktiToprak = ev.target.checked; C.changed(); C.emit('layouts'); };
    { const tb = Q('[data-tipler]'); if (tb) tb.onclick = () => C.tipEditor && C.tipEditor(); const sb = Q('[data-sablon]'); if (sb) sb.onclick = () => C.sablonYonetici && C.sablonYonetici(); }
    Q('[data-tz]').onchange = ev => { const v = num(ev.target.value); if (v != null) C.setSeviyeZ('toprak', v); renderPane(); };
    pane.querySelectorAll('.svp-r[data-id]').forEach(r => {
      const id = r.dataset.id, l = s.list.find(x => x.id === id);
      r.querySelector('[data-akt]').onchange = () => { C.setSvAktif(id); renderPane(); };
      r.querySelector('[data-ad]').onchange = ev => { C.undoStack.push(C.snapshot()); l.ad = ev.target.value.trim() || l.ad; C.changed(); redraw(); renderBar(); };
      r.querySelector('[data-z]').onchange = ev => { const v = num(ev.target.value); if (v != null) C.setSeviyeZ(id, v); renderPane(); renderBar(); };
      r.querySelector('[data-goz]').onclick = () => C.svGoz(C.state.svGoz === id ? null : id);
      r.querySelector('[data-pl]').onclick = () => C.svPlan(C.state.planSv === id ? null : id);
      r.querySelector('[data-kp]').onclick = () => C.svKotPlani(id);
      r.querySelector('[data-pf]').onclick = () => C.svPafta(id);
      r.querySelector('[data-del]').onclick = () => { if (s.list.length <= 1) return C.warn('En az bir seviye kalmalı.'); C.undoStack.push(C.snapshot()); s.list = s.list.filter(x => x.id !== id); for (const e of C.doc.ents) { if (e.sv === id) delete e.sv; if (e.svU === id) delete e.svU; if (e.sv2 === id) delete e.sv2; } if (s.aktif === id) s.aktif = null; if (C.state.planSv === id) C.state.planSv = null; bindAll(false); C.changed(); redraw(); renderBar(); renderPane(); };
    });
  };
  C.on('doc', () => { C.state.planSv = null; C.state.svGoz = null; setTimeout(() => { renderBar(); renderPane(); const a = C.svAktif(); if (a) setElev(a.z); }, 0); });
  C.on('seviye', () => { renderBar(); });
  setTimeout(() => { renderBar(); buildPane(); renderPane(); }, 300);
})(window.C);

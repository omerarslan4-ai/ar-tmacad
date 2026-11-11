/* ArıtmaCAD — PROJE ŞABLONLARI: katmanlar, kat seviyeleri, eleman tipleri, kot stili, dil ve çeviri tablosu, pafta grupları ve
   pafta düzenleri (pencereler hariç), yazı / ölçü ayarları bir şablon olarak saklanır; yeni projede seçilir. */
(function (C) {
  'use strict';
  const KEY = 'aritmacad.sablonlar', SETK = ['anno', 'ltscale', 'textH', 'dimTextH', 'dimArrow', 'dimDec', 'dimTick', 'lwdisp', 'seviye', 'tipler', 'kotStil', 'lang', 'ceviri', 'grups', 'kesitStil', 'acilimH', 'dimUnits', 'geo'];
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const all = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (er) { return {}; } };
  const saveAll = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch (er) { C.warn('Şablon kaydedilemedi: ' + er.message); return false; } };
  const make = ad => { const s = {}; for (const k of SETK) if (C.doc.set[k] != null) s[k] = JSON.parse(JSON.stringify(C.doc.set[k])); return { ad, ts: Date.now(), app: C.VERSION, layers: JSON.parse(JSON.stringify(C.doc.layers)), set: s, styles: C.doc.styles ? JSON.parse(JSON.stringify(C.doc.styles)) : null, layouts: (C.doc.layouts || []).map(L => Object.assign(JSON.parse(JSON.stringify(L)), { vps: [] })) }; };
  C.sablonUygula = (t, keepEnts) => {
    if (!t) return; Object.assign(C.doc.layers, JSON.parse(JSON.stringify(t.layers || {})));
    for (const [k, v] of Object.entries(t.set || {})) C.doc.set[k] = JSON.parse(JSON.stringify(v));
    if (C.doc.set.seviye) { delete C.doc.set.seviye.aktif; } if (C.doc.set.kesitMeta) delete C.doc.set.kesitMeta;
    if (t.styles) C.doc.styles = JSON.parse(JSON.stringify(t.styles));
    if (!keepEnts && Array.isArray(t.layouts) && t.layouts.length) C.doc.layouts = JSON.parse(JSON.stringify(t.layouts));
    C.langReset && C.langReset(); C.changed(); C.emit('layers'); C.emit('layouts'); C.emit('doc'); C.log(`📋 Şablon uygulandı: ${t.ad}`);
  };
  C.sablonYonetici = () => {
    const draw = () => {
      const S = all(), names = Object.keys(S).sort((a, b) => S[b].ts - S[a].ts);
      const b = C.modal('Proje şablonları', `<p class="hint">Şablon; katmanları, kat seviyelerini, eleman tiplerini, kot stilini, dili ve çeviri tablosunu, pafta gruplarını ve pafta düzenlerini (pencereler hariç), yazı / ölçü ayarlarını saklar. Yeni projede seçilir.</p>
        <div style="display:flex;gap:6px;align-items:center;margin:8px 0"><input data-ad placeholder="Şablon adı (ör. Pompa istasyonu standart)" style="flex:1"><button class="pri" data-save>Bu çizimi şablon olarak kaydet</button></div>
        ${names.length ? names.map(n => `<div style="display:flex;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line,#333)"><b style="flex:1">${esc(n)}</b><span class="hint">${new Date(S[n].ts).toLocaleDateString('tr-TR')}</span><button data-use="${esc(n)}">Bu çizime uygula</button><button data-exp="${esc(n)}">Dosyaya</button><button data-del="${esc(n)}" aria-label="Sil">✕</button></div>`).join('') : '<p class="hint">Kayıtlı şablon yok.</p>'}
        <div class="bar" style="margin-top:8px"><button data-imp>Dosyadan şablon al…</button></div>`);
      b.querySelector('[data-save]').onclick = () => { const ad = b.querySelector('[data-ad]').value.trim(); if (!ad) return C.warn('Şablon adı yazın.'); const S2 = all(); S2[ad] = make(ad); if (saveAll(S2)) C.log(`📋 Şablon kaydedildi: ${ad}`); draw(); };
      b.querySelectorAll('[data-use]').forEach(x => x.onclick = () => { C.undoStack.push(C.snapshot()); C.sablonUygula(all()[x.dataset.use], C.doc.ents.length > 0); C.closeModal(); });
      b.querySelectorAll('[data-del]').forEach(x => x.onclick = () => { const S2 = all(); delete S2[x.dataset.del]; saveAll(S2); draw(); });
      b.querySelectorAll('[data-exp]').forEach(x => x.onclick = () => { const t = all()[x.dataset.exp]; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ format: 'aritmacad-sablon', t })], { type: 'application/json' })); a.download = x.dataset.exp.replace(/[\\/:*?"<>|]+/g, '_') + '.aritmasablon'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000); });
      b.querySelector('[data-imp]').onclick = () => { const fi = document.createElement('input'); fi.type = 'file'; fi.accept = '.aritmasablon,.json'; fi.onchange = async () => { const f = fi.files[0]; if (!f) return; try { const o = JSON.parse(await f.text()); if (o.format !== 'aritmacad-sablon' || !o.t) throw new Error('şablon dosyası değil'); const S2 = all(); S2[o.t.ad] = o.t; saveAll(S2); C.log('Şablon alındı: ' + o.t.ad); draw(); } catch (er) { C.warn('Şablon okunamadı: ' + er.message); } }; fi.click(); };
    };
    draw();
  };
  C.addCommand(['SABLON', 'SABLONLAR', 'PROJESABLONU', 'TEMPLATE'], 'Proje şablonları: bu çizimin ayarlarını şablon olarak kaydet, uygula, dosyaya ver / dosyadan al.', () => C.sablonYonetici(), { noUndo: true });
  /* yeni projede önce şablon seçimi */
  { const k0 = C.seviyeKurulum; if (k0) C.seviyeKurulum = function (o = {}) {
      const S = all(), names = Object.keys(S); if (!o.yeni || !names.length || o._sablonDone) return k0.call(this, o);
      const b = C.modal('Yeni proje — şablon', `<p class="hint">Bir şablonla başlarsanız katmanlar, seviyeler, eleman tipleri, kot stili, dil ve pafta düzenleri hazır gelir.</p>${names.sort((a, c) => S[c].ts - S[a].ts).map(n => `<button data-s="${esc(n)}" style="display:block;width:100%;text-align:left;margin:4px 0;padding:10px">${esc(n)}</button>`).join('')}<div class="bar" style="justify-content:flex-end"><button data-none>Şablonsuz başla</button></div>`);
      b.querySelectorAll('[data-s]').forEach(x => x.onclick = () => { C.sablonUygula(S[x.dataset.s], false); C.closeModal(); setTimeout(() => k0.call(this, Object.assign({}, o, { _sablonDone: true })), 60); });
      b.querySelector('[data-none]').onclick = () => { C.closeModal(); setTimeout(() => k0.call(this, Object.assign({}, o, { _sablonDone: true })), 60); };
    }; }
})(window.C);

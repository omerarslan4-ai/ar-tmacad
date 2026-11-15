/* ArıtmaCAD — kapatırken "kaydedilsin mi?" sorusu, kaydedilmemiş değişiklik izleme, kurtarma kopyası */
(function (C) {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ---------- değişiklik izleme ---------- */
  C.savedRev = C.rev;
  C.markSaved = () => { C.savedRev = C.rev; C.clearRecovery(); updTitle(); };
  C.isDirty = () => C.rev !== C.savedRev && !!(C.doc && (C.doc.ents.length || (C.doc.layouts || []).length));
  const updTitle = () => { const d = C.isDirty(), n = (C.doc && C.doc.set.name) || 'Adsiz'; document.title = `${d ? '● ' : ''}${n} — ArıtmaCAD`; const el = $('#docname'); if (el) { el.textContent = n + (d ? ' *' : ''); el.title = d ? 'Kaydedilmemiş değişiklikler var' : 'Kaydedildi'; } };
  C.on('change', () => setTimeout(updTitle, 0)); C.on('changeIdle', updTitle); C.on('doc', updTitle);

  /* ---------- kurtarma kopyası (IndexedDB + localStorage) ---------- */
  const DB = 'aritmacad-kurtarma';
  const idb = (mode, fn) => new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onerror = () => rej(r.error); r.onsuccess = () => { const db = r.result, tx = db.transaction('kv', mode), st = tx.objectStore('kv'); const q = fn(st); tx.oncomplete = () => { db.close(); res(q && q.result); }; tx.onerror = () => { db.close(); rej(tx.error); }; }; });
  const pack = () => ({ name: C.doc.set.name, time: Date.now(), n: C.doc.ents.length, snap: C.snapshotTam ? C.snapshotTam() : C.snapshot(true) }); /* kalıcı kayıt: tam kopya, kullanılmayan kütüphane blokları olmadan */
  C.saveRecovery = (sync) => {
    if (!C.isDirty()) return;
    const rec = pack();
    try { localStorage.setItem('aritmacad.kurtarma', JSON.stringify(rec)); } catch (e) { try { localStorage.setItem('aritmacad.kurtarma', JSON.stringify({ name: rec.name, time: rec.time, n: rec.n, big: true })); } catch (e2) { } }
    if (!sync) idb('readwrite', st => st.put(rec, 'son')).catch(() => { });
  };
  C.clearRecovery = () => { try { localStorage.removeItem('aritmacad.kurtarma'); } catch (e) { } idb('readwrite', st => st.delete('son')).catch(() => { }); };
  setInterval(() => { if (C.isDirty()) C.saveRecovery(); }, 60000); // dakikada bir otomatik kurtarma kopyası
  const readRecovery = async () => {
    let a = null, b = null; try { a = JSON.parse(localStorage.getItem('aritmacad.kurtarma') || 'null'); } catch (e) { }
    try { b = await idb('readonly', st => st.get('son')); } catch (e) { }
    const c = [a, b].filter(r => r && r.snap).sort((x, y) => y.time - x.time); return c[0] || null;
  };

  /* ---------- "kaydedilsin mi?" penceresi ---------- */
  let asking = null;
  C.askSave = function (why) { // true = devam edilebilir, false = iptal
    if (!C.isDirty()) return Promise.resolve(true);
    if (asking) return asking;
    asking = new Promise(res => {
      const body = C.modal('Kaydedilmemiş değişiklikler', `
        <p style="font-size:14px;margin:4px 0 12px">“<b>${esc(C.doc.set.name)}</b>” çiziminde kaydedilmemiş değişiklikler var.<br>${esc(why || 'Kapatmadan önce')} kaydedilsin mi?</p>
        <div class="bar" style="justify-content:flex-end"><button id="ksCancel">İptal</button><button id="ksNo">Kaydetme</button><button id="ksYes" class="pri">Kaydet</button></div>
        <p class="hint">Kaydetmezseniz son hâli bu bilgisayarda bir kurtarma kopyası olarak saklanır; programı yeniden açtığınızda geri yüklemeniz önerilir.</p>`);
      let done = false;
      const end = v => { if (done) return; done = true; clearInterval(tm); C.closeModal(); asking = null; res(v); };
      body.querySelector('#ksCancel').onclick = () => end(false);
      body.querySelector('#ksNo').onclick = () => { C.saveRecovery(); C.savedRev = C.rev; updTitle(); end(true); };
      body.querySelector('#ksYes').onclick = async () => {
        done = true; clearInterval(tm); C.closeModal(); asking = null;
        try { await C.quickSave(); } catch (e) { C.warn('Kaydedilemedi: ' + (e.message || e)); }
        if (C.isDirty()) { C.warn('Kaydedilmedi (iptal edildi ya da hata oluştu).'); res(false); } else res(true);
      };
      const tm = setInterval(() => { if ($('#modal').classList.contains('hidden')) end(false); }, 300);
      setTimeout(() => body.querySelector('#ksYes').focus(), 30);
    });
    return asking;
  };

  /* ---------- kapatma ---------- */
  let closing = false;
  const doClose = () => {
    closing = true; window.close();
    setTimeout(() => { // tarayıcı kapatmaya izin vermezse
      if (document.visibilityState !== 'hidden') C.modal('Kapatılabilir', `<p style="font-size:14px">Çizim güvende. Pencereyi sağ üstteki <b>×</b> ile kapatabilirsiniz; artık soru sorulmayacak.</p><div class="bar" style="justify-content:flex-end"><button class="pri" onclick="C.closeModal()">Tamam</button></div>`);
    }, 400);
  };
  C.addCommand(['QUIT', 'EXIT', 'CIKIS', 'KAPAT'], 'Programı kapatır; kaydedilmemiş değişiklik varsa kaydedilsin mi diye sorar (Ctrl+Q)', () => { setTimeout(async () => { if (await C.askSave('Kapatmadan önce')) doClose(); }, 0); }, { noUndo: true });

  /* pencerenin × düğmesi / sekmeyi kapatma: tarayıcı yalnız kendi "Ayrıl / İptal" sorusunu gösterebilir.
     "İptal" denirse hemen ardından programın Kaydet / Kaydetme / İptal penceresi açılır. */
  window.addEventListener('beforeunload', e => {
    if (closing || !C.isDirty()) return;
    C.saveRecovery(true);
    e.preventDefault(); e.returnValue = 'Kaydedilmemiş değişiklikler var.';
    setTimeout(() => setTimeout(async () => { if (await C.askSave('Kapatmadan önce')) doClose(); }, 200), 0);
    return e.returnValue;
  });

  /* ---------- otomatik kopya geçmişi (son 10 sürüm, IndexedDB) — KURTAR ile geri yüklenir; kaydetmek geçmişi silmez ---------- */
  let lastHist = 0, lastSig = '';
  const pushHist = async (force) => {
    if (!C.doc || !C.doc.ents.length) return; const now = Date.now(); if (!force && now - lastHist < 120000) return;
    const sig = C.doc.ents.length + '|' + C.rev; if (sig === lastSig) return; lastHist = now; lastSig = sig;
    try { const rec = pack(); const list = (await idb('readonly', st => st.get('gecmis'))) || []; list.unshift(rec); while (list.length > 10) list.pop(); await idb('readwrite', st => st.put(list, 'gecmis')); } catch (e) { }
  };
  C.on('changeIdle', () => pushHist(false));
  window.addEventListener('beforeunload', () => { try { if (C.doc && C.doc.ents.length) { const rec = pack(); localStorage.setItem('aritmacad.sonkapanis', JSON.stringify(rec)); } } catch (e) { } });
  C.addCommand(['KURTAR', 'RECOVER', 'OTOKOPYA', 'GECMIS'], 'Otomatik kopyalar: son 10 otomatik kopya (2 dakikada bir, kaydetseniz de silinmez) ve son kapanıştaki çizim listelenir; seçtiğinizi geri yükler.', async () => {
    let list = []; try { list = (await idb('readonly', st => st.get('gecmis'))) || []; } catch (e) { }
    const extra = []; for (const k of ['aritmacad.sonkapanis', 'aritmacad.kurtarma']) { try { const r = JSON.parse(localStorage.getItem(k) || 'null'); if (r && r.snap) extra.push(r); } catch (e) { } }
    try { const s = localStorage.getItem('aritmacad.autosave'); if (s) { const o = JSON.parse(s); if (o.ents && o.ents.length) extra.push({ name: (o.set && o.set.name) || 'Otomatik kayıt', time: 0, n: o.ents.length, snap: s, auto: true }); } } catch (e) { }
    try { const b = await idb('readonly', st => st.get('son')); if (b && b.snap) extra.push(b); } catch (e) { }
    const all = list.concat(extra).filter(r => r && r.snap); if (!all.length) { C.warn('Otomatik kopya bulunamadı.'); return; }
    const row = (r, i) => `<tr><td>${esc(r.name)}</td><td>${r.time ? esc(new Date(r.time).toLocaleString('tr-TR')) : 'son otomatik kayıt'}</td><td style="text-align:right">${r.n} nesne</td><td><button data-i="${i}" class="pri">Geri yükle</button></td></tr>`;
    const body = C.modal('Otomatik kopyalar — KURTAR', `<p style="font-size:13px;margin:2px 0 8px">Geri yüklemeden önce açık çizimi kaydetmek isterseniz İptal deyip kaydedin.</p><table style="width:100%;font-size:13px;border-collapse:collapse">${all.map(row).join('')}</table><div class="bar" style="justify-content:flex-end;margin-top:8px"><button id="krClose">Kapat</button></div>`);
    body.querySelector('#krClose').onclick = () => C.closeModal();
    body.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const r = all[+b.dataset.i]; C.closeModal(); try { pushHist(true); } catch (e) { } C.restore(r.snap); if (r.name) C.doc.set.name = r.name; C.undoStack = []; C.savedRev = -1; C.emit('doc'); C.emit('layers'); C.emit('layouts'); updTitle(); setTimeout(() => C.emit('zoomExtents'), 50); C.log(`Geri yüklendi: ${r.name} (${r.n} nesne). Kaydetmeyi unutmayın (Ctrl+S).`); });
  });
  /* ---------- açılışta kurtarma ---------- */
  setTimeout(async () => {
    let r = await readRecovery(); if (!r || !r.snap) { try { const k = JSON.parse(localStorage.getItem('aritmacad.sonkapanis') || 'null'); if (k && k.snap && !C.doc.ents.length) { C.log(`Son kapanıştaki çizim (${k.name}, ${k.n} nesne) KURTAR komutuyla geri yüklenebilir.`); } } catch (e) { } return; }
    if (C.doc.ents.length) return; // kullanıcı zaten çalışmaya başlamış
    const t = new Date(r.time).toLocaleString('tr-TR');
    const body = C.modal('Kaydedilmemiş çizim bulundu', `
      <p style="font-size:14px">Son oturumda kaydedilmeden kapatılan bir çizim var:<br><b>${esc(r.name)}</b> — ${esc(t)} · ${r.n} nesne</p>
      <div class="bar" style="justify-content:flex-end"><button id="krDel">Sil</button><button id="krLater">Şimdi değil</button><button id="krYes" class="pri">Geri yükle</button></div>`);
    body.querySelector('#krYes').onclick = () => { C.closeModal(); C.restore(r.snap); C.doc.set.name = r.name; C.undoStack = []; C.savedRev = -1; C.emit('doc'); C.emit('layers'); updTitle(); setTimeout(() => C.emit('zoomExtents'), 50); C.log(`Kurtarma kopyası geri yüklendi: ${r.name} (${t}). Kaydetmeyi unutmayın (Ctrl+S).`); };
    body.querySelector('#krDel').onclick = () => { C.closeModal(); C.clearRecovery(); };
    body.querySelector('#krLater').onclick = () => C.closeModal();
  }, 700);
  updTitle();
})(window.C);

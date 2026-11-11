/* ArıtmaCAD — pencereler arası BÜYÜK veri aktarımı (IndexedDB) (ayrı modül, core.js'den ÖNCE yüklenir)
   Statik pencere büyük verileri (paftalar, 3B donatı) localStorage'a (≈5 MB sınır) değil IndexedDB'ye yazar,
   localStorage'a yalnız küçük bir işaret ({"__idb":anahtar,"t":zaman}) koyar.
   Bu modül: • 'storage' dinleyicilerine işaret yerine gerçek veriyi verir (veri IndexedDB'den yüklendikten sonra)
             • localStorage.getItem işaretli anahtarlar için bellekteki gerçek veriyi döndürür
             • açılışta bekleyen işaretli verileri önceden belleğe alır. */
(function () {
  'use strict';
  const DB = 'aritmacad-aktar', ST = 'veri', bellek = {}, yukleniyor = {};
  const isaret = v => typeof v === 'string' && v.length < 300 && v.startsWith('{"__idb"');
  const ac = () => new Promise((ok, no) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  const oku = k => ac().then(db => new Promise((ok, no) => { const q = db.transaction(ST, 'readonly').objectStore(ST).get(k); q.onsuccess = () => { ok(q.result); db.close(); }; q.onerror = () => { no(q.error); db.close(); }; }));
  const yukle = (k, m) => { const id = k + '@' + m.t; if (bellek[k] && bellek[k].t === m.t) return Promise.resolve(bellek[k].v); if (!yukleniyor[id]) yukleniyor[id] = oku(k).then(v => { bellek[k] = { t: m.t, v: v == null ? null : String(v) }; delete yukleniyor[id]; return bellek[k].v; }); return yukleniyor[id]; };
  window.AritmaAktar = { isaret, yukle, bellek };
  const gi0 = Storage.prototype.getItem;
  Storage.prototype.getItem = function (k) { const v = gi0.call(this, k); if (isaret(v)) { try { const m = JSON.parse(v), c = bellek[k]; if (c && c.t === m.t) return c.v; } catch (e) { } return null; } return v; };
  const ael = window.addEventListener;
  window.addEventListener = function (tip, fn, op) {
    if (tip === 'storage' && typeof fn === 'function') {
      const f2 = function (ev) {
        if (isaret(ev.newValue)) { let m; try { m = JSON.parse(ev.newValue); } catch (e) { return fn.call(this, ev); } const self = this;
          yukle(ev.key, m).then(v => { if (v != null) fn.call(self, { key: ev.key, newValue: v, oldValue: ev.oldValue, storageArea: ev.storageArea, url: ev.url, type: 'storage' }); }).catch(e => console.error('IndexedDB aktarım okunamadı', e)); return; }
        return fn.call(this, ev);
      };
      return ael.call(this, tip, f2, op);
    }
    return ael.call(this, tip, fn, op);
  };
  // açılışta bekleyen işaretli veriler
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i), v = gi0.call(localStorage, k); if (isaret(v)) yukle(k, JSON.parse(v)).catch(() => { }); } } catch (e) { }
})();

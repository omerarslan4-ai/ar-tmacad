/* ArıtmaCAD Statik — donatıyı modele aktarma (ayrı modül)
   • Kota hatası çözümü: ArıtmaCAD açıksa veri localStorage'a yazılmadan doğrudan pencereye verilir;
     değilse eski kayıt silinip sıkıştırılmış (mm, farklar) biçimde yazılır.
   • ArıtmaCAD veriyi okuyunca anahtarı siler (depo dolmaz). */
(function () {
  'use strict';
  const P = window.STATIK; if (!P || typeof document === 'undefined' || !document.getElementById('bDon3')) return;
  const K_DON = 'aritmacad.statik.donati', ac = () => { try { return window.opener && window.opener.C ? window.opener.C : null; } catch (e) { return null; } };
  const sikistir = o => Object.assign({}, o, { sikistir: true, gruplar: o.gruplar.map(g => Object.assign({}, g, { z: 1, bars: g.bars.map(b => { const f = []; let x = 0, y = 0, z = 0; for (const q of b) { const X = Math.round(q[0] * 1000), Y = Math.round(q[1] * 1000), Z = Math.round(q[2] * 1000); f.push(X - x, Y - y, Z - z); x = X; y = Y; z = Z; } return f; }) })) });
  const s0 = Storage.prototype.setItem;
  // depo dolarsa: eski aktarım anahtarlarını (pencereler arası geçici veriler) boşaltıp bir kez daha dene
  const GECICI = ['aritmacad.statik.donati', 'aritmacad.statik.cizim', 'aritmacad.statik.model', 'aritmacad.statik.kalinlik', 'aritmacad.statik.modelIstek'];
  /* büyük veri: IndexedDB'ye yaz, localStorage'a küçük işaret koy (ArıtmaCAD tarafı aktar-idb.js çözer) */
  const IDB = (k, v) => new Promise((ok, no) => { const r = indexedDB.open('aritmacad-aktar', 1); r.onupgradeneeded = () => r.result.createObjectStore('veri'); r.onerror = () => no(r.error);
    r.onsuccess = () => { const db = r.result, tx = db.transaction('veri', 'readwrite'); tx.objectStore('veri').put(v, k); tx.oncomplete = () => { db.close(); ok(); }; tx.onerror = () => { db.close(); no(tx.error); }; }; });
  const BUYUK = 150000;
  const yazIdb = (st, k, v) => { const t = Date.now(); IDB(k, v).then(() => { try { st.removeItem(k); } catch (e) { } s0.call(st, k, JSON.stringify({ __idb: k, t })); }).catch(e => { try { yazLS(st, k, v); } catch (e2) { alert(e2.message); } }); };
  const yazLS = (st, k, v) => { try { return s0.call(st, k, v); } catch (e) { if (!/quota/i.test(e.name + e.message)) throw e; GECICI.filter(x => x !== k).forEach(x => { try { st.removeItem(x); } catch (er) { } }); try { st.removeItem(k); } catch (er) { } try { return s0.call(st, k, v); } catch (e2) { throw new Error('Tarayıcı deposu dolu (' + Math.round(v.length / 1e5) / 10 + ' MB gönderilemedi). ArıtmaCAD\'i http üzerinden (ör. yerel sunucu) açarsanız veri depo kullanılmadan doğrudan aktarılır.'); } } };
  const yaz = (st, k, v) => (v && v.length > BUYUK && window.indexedDB ? yazIdb(st, k, v) : yazLS(st, k, v));
  Storage.prototype.setItem = function (k, v) {
    if (this !== window.localStorage || !/^aritmacad\.statik\./.test(k)) return s0.call(this, k, v);
    if (k !== K_DON) return yaz(this, k, v);
    let o; try { o = JSON.parse(v); } catch (e) { return s0.call(this, k, v); }
    try { o.toe = S.geo.toe; o.cR = S.mal.cR; } catch (e) { }
    const C = ac(); if (C) { C._statikDonatiVeri = o; try { this.removeItem(K_DON); } catch (e) { } return; }
    try { this.removeItem(K_DON); } catch (e) { }
    return yaz(this, k, JSON.stringify(sikistir(o)));
  };

})();

/* ArıtmaCAD — HAFİF GERİ ALMA KOPYASI ve KULLANILMAYAN BLOKLARIN AYIKLANMASI
   Sorun (bekçi binası, 15.11.2026): çizime bir kez eklenen 3B kütüphane blokları (klozet 6,4 MB, lavabo 3,0 MB) belgede kalıyor ve her komuttan
   önce alınan geri alma kopyasına (C.snapshot), kurtarma kaydına ve proje dosyasına yeniden yazılıyordu: 13,7 MB'lık kopyanın 9,4 MB'ı.
   Son 60 komutun kopyası bellekte tutulduğu için program çıktılar hazırlandıkça ağırlaşıyordu.
   Çözüm:
     1) Geri alma kopyasında bloğun 3B gövdesi (mesh3d) yazılmaz; yerine numarası yazılır, gövdenin kendisi bellekte bir kez tutulur.
        Geri yüklerken numaradan gövde geri konur (bulunamazsa blok kütüphanesinden alınır).
     2) Kalıcı kayıtlarda (.aritma dosyası, kurtarma kopyası, otomatik kopya geçmişi) tam kopya kullanılır: C.snapshotTam().
        Tam kopyaya, çizimde hiçbir nesnenin kullanmadığı VE blok kütüphanesinde zaten duran bloklar yazılmaz (kütüphanede yoksa blok korunur).
   Saf kısım (hafifletme, geri koyma, kullanılmayanı bulma) Node ile denenir: node test/blok-hafif.test.js */
(function (C) {
  'use strict';
  const IM = '$m3';
  /* gövde ↔ numara kaydı (bellekte; oturum boyunca) */
  const kayitYap = () => { const no = new Map(), govde = new Map(); let n = 0; return { no: m => { let i = no.get(m); if (i == null) { i = ++n; no.set(m, i); govde.set(i, m); } return i; }, al: i => govde.get(i) }; };
  /* bloklar → 3B gövdesi yerine numara taşıyan kopya (blokların kendisi değişmez) */
  const hafiflet = (blocks, kayit) => { const o = {}; for (const k in blocks || {}) { const b = blocks[k], m = b && b.mesh3d; o[k] = m && typeof m === 'object' && m[IM] == null ? Object.assign({}, b, { mesh3d: { [IM]: kayit.no(m) } }) : b; } return o; };
  /* numaraların yerine gövdeleri geri koyar; bul(id): kayıtta yoksa (ör. başka oturumdan kalan kopya) gövdeyi getiren yedek kaynak */
  const geriKoy = (blocks, kayit, bul) => { for (const k in blocks || {}) { const b = blocks[k], m = b && b.mesh3d; if (m && typeof m === 'object' && m[IM] != null) { const g = kayit.al(m[IM]) || (bul && bul(k)); if (g) b.mesh3d = g; else delete b.mesh3d; } } return blocks; };
  /* çizimde kullanılmayan blokların adları. Blok, adı nesnelerde / ayarlarda / paftalarda ya da kullanılan başka bir bloğun içinde geçiyorsa kullanılıyordur. */
  const kucuk = b => JSON.stringify(Object.assign({}, b, { mesh3d: undefined, thumb: undefined }));
  const kullanilmayan = doc => {
    const B = (doc && doc.blocks) || {}, adlar = Object.keys(B); if (!adlar.length) return [];
    const temiz = e => { const o = {}; for (const k in e) if (k[0] !== '_') o[k] = e[k]; return o; };
    const dis = JSON.stringify({ e: (doc.ents || []).map(temiz), s: doc.set || null, l: doc.layouts || [] }), ic = {}; for (const k of adlar) ic[k] = kucuk(B[k]);
    const var_ = new Set(adlar.filter(k => dis.includes(JSON.stringify(k)))); let degisti = true;
    while (degisti) { degisti = false; for (const u of [...var_]) for (const k of adlar) if (!var_.has(k) && k !== u && ic[u].includes(JSON.stringify(k))) { var_.add(k); degisti = true; } }
    return adlar.filter(k => !var_.has(k));
  };
  const api = { hafiflet, geriKoy, kullanilmayan, kayitYap, IM };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!C || !C.snapshot) return;

  const kayit = kayitYap(), kutuphane = () => (C.blib && C.blib.cache) || {};
  C.blokHafif = api;
  /* core.js bu ikisini çağırır */
  C.blokKopyaHafif = blocks => hafiflet(blocks, kayit);
  C.blokKopyaGeri = blocks => geriKoy(blocks, kayit, id => (kutuphane()[id] || {}).mesh3d);
  /* kalıcı kayıt için tam kopya (metin): 3B gövdeler içinde; kullanılmayan ve kütüphanede duran bloklar yazılmaz */
  C.snapshotTam = () => {
    const lib = kutuphane(), at = new Set(kullanilmayan(C.doc).filter(k => lib[k])); if (!at.size) return C.snapshot(true);
    const hepsi = C.doc.blocks, kalan = {}; for (const k in hepsi) if (!at.has(k)) kalan[k] = hepsi[k];
    C.doc.blocks = kalan; try { return C.snapshot(true); } finally { C.doc.blocks = hepsi; }
  };
})(typeof window !== 'undefined' ? window.C : null);

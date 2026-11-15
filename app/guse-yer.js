/* ArıtmaCAD — GUSE YERLEŞİMİ (saf fonksiyonlar; arayüzden bağımsız, Node'da da yüklenir)
   Guse, kolonun kendi seçeneğidir (e.guse 'E', gYon, gRef UST|KOT, gZ, gL, gHf, gHu, gW — bkz. app/insaat.js). Bu modül gusenin KOTUNU hesaplar:
     guse üst kotu = kiriş alt kotu − mesafe            (mesafe: guse üst yüzü ile kolona oturan kirişin altı arasındaki düşey açıklık)
   Kiriş altı: kolona planda değen kirişlerden en üsttekilerin (çatı kirişleri) en derin olanının alt kotu; kolona kiriş oturmuyorsa kolon üstü alınır.
   Dosya biçimi değişmez: sonuç yine e.gZ'ye yazılır (gRef UST ise kolon üstünden aşağı mesafe, KOT ise mutlak kot); 3B, kesit, metraj ve statik aynı değeri okur.
   C.guseYer = { guseli, kolonUst, ustKot, kirisAlt, mesafe, yerles, gZicin, sinir, yeni, kaydir, ortak }
   Arayüz (Guse sekmesi, ok ile çekme): app/guse.js. Deneme: node test/guse-yer.test.js */
(function (C) {
  'use strict';
  const r4 = v => +(+v).toFixed(4);
  const guseli = e => !!e && e.type === 'kolon' && e.guse === 'E';
  const kolonUst = e => (+e.z0 || 0) + (+e.h || 3);
  const gzOf = e => (e.gZ == null || e.gZ === '' ? 1 : +e.gZ);
  /* guse üst yüzünün kotu (vinç kirişinin oturduğu yüz) */
  const ustKot = e => (e.gRef === 'KOT' ? gzOf(e) : kolonUst(e) - gzOf(e));
  const yukseklik = e => Math.max(0.05, +e.gHf || 0.6);          // kolon yüzündeki guse yüksekliği
  /* istenen üst kot için yazılacak gZ (kolonun kendi kot tanımına göre) */
  const gZicin = (e, ust) => r4(e.gRef === 'KOT' ? ust : kolonUst(e) - ust);
  const yerles = (kirisAltKot, mesafe) => kirisAltKot - mesafe;

  const noktaParca = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 > 1e-12 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); };
  /* kolona oturan kirişlerin alt kotu → { z, n, kaynak: 'kiris' | 'kolon' } */
  const kirisAlt = (kolon, ents) => {
    const p = kolon.p || [0, 0], ust = kolonUst(kolon), z0 = +kolon.z0 || 0, yari = (kolon.sek === 'D' ? (+kolon.D || 0.5) : Math.max(+kolon.b || 0.4, +kolon.d || 0.4)) / 2;
    const deg = (ents || []).filter(k => k && k.type === 'kiris' && k.a && k.b).filter(k => {
      const zt = +k.zt || 0, hb = +k.hb || 0.5; if (zt <= z0 || zt - hb > ust + 0.05) return false;      // kolon boyunun dışında
      return noktaParca(p, k.a, k.b) <= yari + (+k.bw || 0.3) / 2 + 0.05;
    });
    if (!deg.length) return { z: ust, n: 0, kaynak: 'kolon' };
    const zmax = Math.max(...deg.map(k => +k.zt || 0)), ustler = deg.filter(k => (+k.zt || 0) >= zmax - 0.05);
    return { z: r4(Math.min(...ustler.map(k => (+k.zt || 0) - (+k.hb || 0.5)))), n: ustler.length, kaynak: 'kiris' };
  };
  /* guse üstü ile kiriş altı arasındaki mesafe (m) */
  const mesafe = (kolon, ents) => r4(kirisAlt(kolon, ents).z - ustKot(kolon));
  /* guse kolonun içinde kalıyor mu */
  const sinir = (e, ust) => {
    if (ust > kolonUst(e) + 1e-6) return { ok: false, neden: 'guse üstü kolon üstünü aşıyor' };
    if (ust - yukseklik(e) < (+e.z0 || 0) - 1e-6) return { ok: false, neden: 'guse kolonun altına taşıyor' };
    return { ok: true };
  };
  /* istenen kiriş altı mesafesi için yeni değerler (kolonu değiştirmez) → { ok, gZ, ust, kirisAlt, kaynak, neden } */
  const yeni = (kolon, ents, ms) => {
    const ka = kirisAlt(kolon, ents), ust = r4(yerles(ka.z, +ms)), s = +ms < -1e-9 ? { ok: false, neden: 'mesafe eksi olamaz (guse kirişin içine girer)' } : sinir(kolon, ust);
    return { ok: s.ok, neden: s.neden, gZ: gZicin(kolon, ust), ust, kirisAlt: ka.z, kaynak: ka.kaynak };
  };
  /* guseyi t (m) kadar yukarı (+) / aşağı (−) kaydırınca yazılacak gZ; kolon boyunun dışına çıkmaz */
  const kaydir = (e, t) => { const alt = (+e.z0 || 0) + yukseklik(e), ust = Math.max(alt, Math.min(kolonUst(e), ustKot(e) + (+t || 0))); return gZicin(e, ust); };
  /* seçimdeki ortak değer: hepsi aynıysa { deger }, değilse { farkli: true } */
  const ortak = (list, fn, tol) => { let d; for (let i = 0; i < list.length; i++) { const v = fn(list[i]); if (!i) d = v; else if (typeof v === 'number' && typeof d === 'number' ? Math.abs(v - d) > (tol || 5e-4) : v !== d) return { farkli: true }; } return { deger: d, farkli: false }; };

  C.guseYer = { guseli, kolonUst, ustKot, kirisAlt, mesafe, yerles, gZicin, sinir, yeni, kaydir, ortak };
})(typeof window !== 'undefined' ? window.C : (globalThis.C = globalThis.C || {}));

/* ArıtmaCAD — İT / ÇEK: çizgilerle çevrili HER kapalı alan
   Önceden yalnız kapalı çoklu çizgi, daire ve uç uca birleşen çizgiler İt/Çek alanı oluyordu.
   Artık imleç hangi kapalı alanın üstündeyse o alan seçilir: çizgiler birbirini kesse, T birleşse, uçları taşsa,
   yay / açık çoklu çizgi / daire karışık olsa bile (TARA'daki "iç nokta" gibi). İçindeki adacıklar delik olur.
   Kaynak çizgiler silinmez (komşu alanlar da aynı çizgileri kullanır). Yalnız C.regionAt sarılır; diğer dosyalara dokunmaz. */
(function (C) {
  'use strict';
  const r0 = C.regionAt; if (!r0 || C._itcekAlan) return; C._itcekAlan = true;
  const M = C.M, TUR = new Set(['line', 'arc', 'pline', 'circle', 'ellipse', 'spline']);
  const zOf = e => { const q = e.a || e.c || (e.pts && e.pts[0]) || e.p; return (q && q[2]) || +e.z || 0; };
  let cache = null, cache_acik = [], cache_kap = []; const ACIKLIK = 0.05; if (C.on) C.on('change', () => { cache = null; });
  const yuzler = z => {
    if (cache && Math.abs(cache.z - z) < 1e-6 && cache.n === C.doc.ents.length) return cache.f;
    const all = C.doc.ents, ents = all.filter(e => TUR.has(e.type) && !e.gv && !e.k3 && C.layer(e.layer).on && Math.abs(zOf(e) - z) < 1e-3);
    let f = [];
    if (ents.length >= 2 && ents.length < 20000 && C.boundarySegs && C.planarFaces) {
      let segs = []; C.doc.ents = ents; try { segs = C.boundarySegs(null); } catch (er) { segs = []; } finally { C.doc.ents = all; }
      // küçük açıklıkları kapat (≤ 5 cm): uç uca gelmeyen çizgi / yay uçları — "kapalı görünen" şekiller de alan olsun
      if (segs.length && segs.length < 40000) { try {
        const key = p => Math.round(p[0] * 1000) + ',' + Math.round(p[1] * 1000), cnt = new Map(); for (const sg of segs) for (const p of sg) cnt.set(key(p), (cnt.get(key(p)) || 0) + 1);
        const acik = [], gor = new Set(), kap = []; for (const sg of segs) for (const p of sg) { const k = key(p); if (cnt.get(k) === 1 && !gor.has(k)) { gor.add(k); acik.push(p); } }
        if (acik.length && acik.length < 4000) { const kul = new Set(); for (let i = 0; i < acik.length; i++) { if (kul.has(i)) continue; let bj = -1, bd = ACIKLIK; for (let j = 0; j < acik.length; j++) { if (j === i || kul.has(j)) continue; const d = Math.hypot(acik[i][0] - acik[j][0], acik[i][1] - acik[j][1]); if (d > 1e-6 && d < bd) { bd = d; bj = j; } } if (bj >= 0) { kul.add(i); kul.add(bj); segs.push([acik[i], acik[bj]]); kap.push([acik[i], acik[bj], bd]); } } }
        cache_acik = acik.filter((q, i) => !kap.some(k => k[0] === q || k[1] === q)); cache_kap = kap;
        f = C.planarFaces(segs); } catch (er) { f = []; } }
    }
    cache = { z, n: all.length, f }; return f;
  };
  const kenarda = (p, poly) => { for (let i = 0; i < poly.length; i++) if (M.segDist(p, poly[i], poly[(i + 1) % poly.length]) < 1e-7) return true; return false; };
  /* tanı: noktanın çevresindeki açık uçlar (İt/Çek bulamazsa uyarıda söylenir) */
  C.itcekAcikUclar = (p, r) => { if (!cache) return []; return cache_acik.filter(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < (r || 5)); };
  C.regionAt = function (p, tol, ents) {
    const r = r0.apply(this, arguments);
    if (r || ents || !p) return r;
    const z = p[2] || 0, F = yuzler(z); if (!F.length) return null;
    let best = null, ba = Infinity;
    for (const f of F) { const a = M.polyArea(f); if (a <= 1e-8 || a >= ba) continue; if (C.pointInPoly([p[0], p[1]], f)) { best = f; ba = a; } }
    if (!best) return null;
    const delik = [];
    for (const f of F) { const a = M.polyArea(f); if (a >= 0 || -a >= ba) continue; if (f.every(q => C.pointInPoly(q, best) || kenarda(q, best)) && !f.every(q => kenarda(q, best))) delik.push(f); }
    const cur = C.doc.cur || {}, stub = { layer: cur.layer || '0', color: cur.color != null ? cur.color : 256, lt: cur.lt || 'BYLAYER', lw: cur.lw != null ? cur.lw : -1 }; // kaynak çizgiler silinmesin: belge dışı örnek
    const out = { kind: 'region', A: ba, src: [stub], n: [0, 0, 1], pts: best.map(q => [q[0], q[1], z]), alan: true };
    const sinirda = q => best.some(v => Math.hypot(v[0] - q[0], v[1] - q[1]) < 1e-6); const kp = cache_kap.filter(k => sinirda(k[0]) && sinirda(k[1])); if (kp.length) out.bosluklar = kp;
    if (delik.length) out.drawnHoles = delik.map(h => h.map(q => [q[0], q[1], z]));
    return out;
  };
  /* ---------- açıklık uyarısı: İt/Çek tıklamasında alan kapalı değilse (ya da küçük açıklık kapatıldıysa) yerini göster ---------- */
  const LY = 'ACIKLIK_UYARI';
  const isaretTemizle = () => { const eski = C.doc.ents.filter(e => e.layer === LY); if (eski.length) C.remove(eski); return eski.length; };
  const isaretKoy = (bos, z) => { C.ensureLayer(LY, 1, 'CONTINUOUS', 50); const L = C.layer(LY); if (L) { L.on = true; delete L.frz; }
    for (const [a, b, d] of bos) { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z], r = Math.max(0.25, d * 1.5), h = Math.max(0.15, r * 0.6);
      for (const e of [C.newEnt('circle', { c: m, r, layer: LY, color: 1 }), C.newEnt('line', { a: [a[0], a[1], z], b: [b[0], b[1], z], layer: LY, color: 1, lw: 70 }), C.newEnt('text', { p: [m[0] + r * 1.1, m[1] + r * 0.2, z], h, s: `AÇIKLIK ${d < 0.01 ? (d * 1000).toFixed(1) + ' mm' : (d * 100).toFixed(1) + ' cm'}`, al: 'L', layer: LY, color: 1, ann: false })]) C.add(e); } };
  const goster = (bos, p) => { try { const vw = C.activeView && C.activeView(); if (!vw || !vw.zoomBox || vw.isLayout) return; // işaretler ekranda değilse görünümü onlara kaydır
      const X = [p[0]], Y = [p[1]]; for (const [a, b] of bos) { X.push(a[0], b[0]); Y.push(a[1], b[1]); }
      const x0 = Math.min(...X), x1 = Math.max(...X), y0 = Math.min(...Y), y1 = Math.max(...Y), w2 = vw.W / 2 / vw.s, h2 = vw.H / 2 / vw.s;
      if (x0 < vw.cx - w2 || x1 > vw.cx + w2 || y0 < vw.cy - h2 || y1 > vw.cy + h2) { const m = Math.max(x1 - x0, y1 - y0, 2) * 0.3; vw.zoomBox([x0 - m, y0 - m, x1 + m, y1 + m], 0.05); }
    } catch (er) { } };
  const yakinBosluklar = (p, z) => { // tıklanan yerin çevresindeki açık uçlar: her ucu en yakın diğer açık uca eşle (≤ 2 m)
    yuzler(z); const A = cache_acik.map(q => ({ q, d: Math.hypot(q[0] - p[0], q[1] - p[1]) })).filter(o => o.d < 25).sort((x, y) => x.d - y.d).slice(0, 40).map(o => o.q), out = [], kul = new Set();
    for (let i = 0; i < A.length; i++) { if (kul.has(i)) continue; let bj = -1, bd = 2.0; for (let j = 0; j < A.length; j++) { if (j === i || kul.has(j)) continue; const d = Math.hypot(A[i][0] - A[j][0], A[i][1] - A[j][1]); if (d < bd) { bd = d; bj = j; } } if (bj >= 0) { kul.add(i); kul.add(bj); out.push([A[i], A[bj], bd]); } else out.push([A[i], A[i], 0]); }
    return out; };
  const fmtCm = d => (d < 0.01 ? (d * 1000).toFixed(1) + ' mm' : (d * 100).toFixed(1) + ' cm');
  let ppAktif = 0; // uyarı yalnız İt/Çek komutunun tıklamasında (merdiven/doku vb. önizlemelerde değil)
  const ppSar = () => { const k = C.cmds && C.cmds.PUSHPULL; if (!k || k._acik) return; const f0 = k.fn; k.fn = async function () { ppAktif++; try { return await f0.apply(this, arguments); } finally { ppAktif--; } }; k._acik = true; };
  ppSar(); window.addEventListener('load', ppSar);
  const ft0 = C.faceTarget;
  if (ft0) C.faceTarget = function (p, hit) {
    const r = ft0.apply(this, arguments);
    if (arguments.length === 1 && p && ppAktif > 0 && !(C.cmd && C.cmd.scriptMode)) { // komutta tıklama (imleç gezinmesi değil)
      try {
        const z = p[2] || 0;
        if (!r) { const bos = yakinBosluklar(p, z).filter(b => b[2] > 0); isaretTemizle();
          if (bos.length) { isaretKoy(bos, z); bos.sort((a, b) => a[2] - b[2]); C.changed(); goster(bos, p);
            C.warn(`Alan kapalı değil: tıkladığınız yerin çevresinde ${bos.length} açıklık var (en küçüğü ${fmtCm(bos[0][2])}). Yerleri kırmızı daire ile işaretlendi (ACIKLIK_UYARI katmanı). Çizgileri birleştirin (≤ 5 cm açıklıklar otomatik kapatılır); işaretleri silmek için ACIKLIKTEMIZLE.`); } }
        else if (r.bosluklar && r.bosluklar.length) { isaretTemizle(); isaretKoy(r.bosluklar, z); C.changed(); goster(r.bosluklar, p);
          C.warn(`Dikkat: alanın sınırında ${r.bosluklar.length} küçük açıklık vardı (${r.bosluklar.map(b => fmtCm(b[2])).join(', ')}) — otomatik kapatılarak İt/Çek yapıldı. Yerleri kırmızı daire ile işaretlendi (ACIKLIK_UYARI); silmek için ACIKLIKTEMIZLE.`); }
        else if (C.doc.ents.some(e => e.layer === LY)) { isaretTemizle(); C.changed(); }
      } catch (er) { console.error('açıklık uyarısı', er); }
    }
    return r;
  };
  C.addCommand(['ACIKLIKTEMIZLE', 'ACIKLIKSIL'], 'İt/Çek açıklık uyarı işaretlerini (ACIKLIK_UYARI katmanı) siler', async () => { const n = isaretTemizle(); C.changed(); C.log(n ? n + ' açıklık işareti silindi.' : 'Açıklık işareti yok.'); });
})(window.C);

/* ArıtmaCAD — ARAZİ: seçilen alan için açık yükseklik verisinden (Terrain Tiles on AWS — SRTM vb., ücretsiz)
   üçgen arazi modeli (TIN), eş yükselti eğrileri, 3B görünüm, kesit, DXF. ARAZIKOT: tıklanan noktanın arazi kotu. */
(function (C) {
  'use strict';
  const M = C.M, G = C.geo, T = C.T, E = C.cmd, { L, P, TX } = C.prim;
  const SRC = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
  const ATTR = 'Yükseklik: Terrain Tiles on AWS (Mapzen/Linux Foundation) — SRTM (NASA), Copernicus/diğer açık veriler';
  const RAD = Math.PI / 180;

  /* ---------- ızgara yardımcıları ---------- */
  const frameOf = e => { const ux = e.ux || [1, 0], uy = [-ux[1], ux[0]]; return { ux, uy, at: (i, j) => [e.o[0] + (ux[0] * i + uy[0] * j) * e.d, e.o[1] + (ux[1] * i + uy[1] * j) * e.d] }; };
  const H = (e, i, j) => e.h[j * e.nx + i];
  const mm = a => { let lo = Infinity, hi = -Infinity; for (const v of a) { if (v < lo) lo = v; if (v > hi) hi = v; } return [lo, hi]; };
  /* (x,y) -> ızgara içi bilineer kot (mutlak), dışarıda null */
  C.araziKot = (e, p) => {
    const f = frameOf(e), dx = p[0] - e.o[0], dy = p[1] - e.o[1], u = (dx * f.ux[0] + dy * f.ux[1]) / e.d, v = (dx * f.uy[0] + dy * f.uy[1]) / e.d;
    if (u < -1e-9 || v < -1e-9 || u > e.nx - 1 + 1e-9 || v > e.ny - 1 + 1e-9) return null;
    const i = Math.min(e.nx - 2, Math.max(0, Math.floor(u))), j = Math.min(e.ny - 2, Math.max(0, Math.floor(v))), a = u - i, b = v - j;
    return H(e, i, j) * (1 - a) * (1 - b) + H(e, i + 1, j) * a * (1 - b) + H(e, i, j + 1) * (1 - a) * b + H(e, i + 1, j + 1) * a * b;
  };
  const chain = (segs, tol) => { // uç uca birleştir
    const key = p => Math.round(p[0] / tol) + ',' + Math.round(p[1] / tol), map = new Map(), used = new Uint8Array(segs.length);
    segs.forEach((s, i) => { for (const k of [key(s[0]), key(s[1])]) { if (!map.has(k)) map.set(k, []); map.get(k).push(i); } });
    const out = [];
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue; used[i] = 1; const pts = [segs[i][0], segs[i][1]];
      for (const dir of [1, 0]) for (; ;) { const end = dir ? pts[pts.length - 1] : pts[0], c = (map.get(key(end)) || []).find(j => !used[j]); if (c == null) break; used[c] = 1; const s = segs[c], nx = Math.hypot(s[0][0] - end[0], s[0][1] - end[1]) < tol * 1.5 ? s[1] : s[0]; if (dir) pts.push(nx); else pts.unshift(nx); }
      out.push(pts);
    }
    return out;
  };
  /* eş yükselti eğrileri (yürüyen kareler, üçgen bölmeli: belirsizlik yok) */
  const contours = e => {
    const f = frameOf(e), ci = e.ci > 0 ? e.ci : 1, [mn0, mx0] = mm(e.h), lo = Math.ceil(mn0 / ci) * ci, hi = mx0, levels = [];
    for (let z = lo; z <= hi + 1e-9 && levels.length < 400; z += ci) levels.push(+z.toFixed(6));
    const out = [];
    for (const z of levels) {
      const segs = [];
      const tri = (pa, pb, pc, ha, hb, hc) => {
        const pts = [];
        for (const [p, q, a, b] of [[pa, pb, ha, hb], [pb, pc, hb, hc], [pc, pa, hc, ha]]) if ((a < z) !== (b < z)) { const t = (z - a) / (b - a); pts.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
        if (pts.length === 2) segs.push(pts);
      };
      for (let j = 0; j < e.ny - 1; j++) for (let i = 0; i < e.nx - 1; i++) {
        const h00 = H(e, i, j), h10 = H(e, i + 1, j), h01 = H(e, i, j + 1), h11 = H(e, i + 1, j + 1);
        if (Math.max(h00, h10, h01, h11) < z || Math.min(h00, h10, h01, h11) >= z) continue;
        const p00 = f.at(i, j), p10 = f.at(i + 1, j), p01 = f.at(i, j + 1), p11 = f.at(i + 1, j + 1);
        tri(p00, p10, p11, h00, h10, h11); tri(p00, p11, p01, h00, h11, h01);
      }
      for (const pl of chain(segs, e.d * 1e-4)) out.push({ z, pts: pl });
    }
    return out;
  };

  T.arazi = {
    label: 'Arazi (TIN)',
    prims: e => {
      const f = frameOf(e), out = [], maj = (e.cmaj || 5) * (e.ci || 1);
      out.push(P([f.at(0, 0), f.at(e.nx - 1, 0), f.at(e.nx - 1, e.ny - 1), f.at(0, e.ny - 1)], true, { color: 8, lt: 'DASHED' }));
      const th = C.annoH ? C.annoH(1.8) : 0.2;
      for (const c of contours(e)) {
        const major = Math.abs(c.z / maj - Math.round(c.z / maj)) < 1e-6;
        out.push(P(c.pts, false, major ? { lw: 35 } : { lw: 13, color: e.color === 256 ? 9 : undefined }));
        if (major && c.pts.length > 6) { // etiket: çizginin ortasında, okunur yönde
          let len = 0; for (let i = 1; i < c.pts.length; i++) len += Math.hypot(c.pts[i][0] - c.pts[i - 1][0], c.pts[i][1] - c.pts[i - 1][1]);
          if (len > th * 12) { let s = 0, k = 1; for (; k < c.pts.length; k++) { s += Math.hypot(c.pts[k][0] - c.pts[k - 1][0], c.pts[k][1] - c.pts[k - 1][1]); if (s >= len / 2) break; } const a = c.pts[Math.max(0, k - 1)], b = c.pts[Math.min(c.pts.length - 1, k)]; let ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI; out.push(TX([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0], th, (+c.z.toFixed(2)).toString(), ang, 'M', { color: 7 })); }
        }
      }
      return out;
    },
    mesh: e => {
      const f = frameOf(e), ref = e.ref || 0, nx = e.nx, ny = e.ny, out = [], hole = C.kaziCells ? C.kaziCells(e) : null, sal = 1 - Math.min(95, Math.max(0, +e.seff || 0)) / 100;
      const rows = Math.max(1, Math.floor(30000 / nx) - 1); // AutoCAD çok yüzlü ağ sınırı (32767 köşe) için şeritler
      for (let j0 = 0; j0 < ny - 1; j0 += rows) {
        const j1 = Math.min(ny - 1, j0 + rows), v = [], vn = [];
        for (let j = j0; j <= j1; j++) for (let i = 0; i < nx; i++) {
          const p = f.at(i, j); v.push([p[0], p[1], H(e, i, j) - ref]);
          const hx = (H(e, Math.min(nx - 1, i + 1), j) - H(e, Math.max(0, i - 1), j)) / ((Math.min(nx - 1, i + 1) - Math.max(0, i - 1)) * e.d), hy = (H(e, i, Math.min(ny - 1, j + 1)) - H(e, i, Math.max(0, j - 1))) / ((Math.min(ny - 1, j + 1) - Math.max(0, j - 1)) * e.d);
          const nxv = -(hx * f.ux[0] + hy * f.uy[0]), nyv = -(hx * f.ux[1] + hy * f.uy[1]), l = Math.hypot(nxv, nyv, 1); vn.push([nxv / l, nyv / l, 1 / l]);
        }
        const F = [], id = (i, j) => (j - j0) * nx + i;
        for (let j = j0; j < j1; j++) for (let i = 0; i < nx - 1; i++) { if (hole && hole.has(j * nx + i)) continue; F.push([id(i, j), id(i + 1, j), id(i + 1, j + 1)], [id(i, j), id(i + 1, j + 1), id(i, j + 1)]); }
        const ed = [], P3 = (i, j) => { const p = f.at(i, j); return [p[0], p[1], H(e, i, j) - ref]; };
        if (j0 === 0) for (let i = 0; i < nx - 1; i++) ed.push([P3(i, 0), P3(i + 1, 0)]);
        if (j1 === ny - 1) for (let i = 0; i < nx - 1; i++) ed.push([P3(i, ny - 1), P3(i + 1, ny - 1)]);
        for (let j = j0; j < j1; j++) ed.push([P3(0, j), P3(0, j + 1)], [P3(nx - 1, j), P3(nx - 1, j + 1)]);
        // yüksekliğe göre renk (yeşil → bej → kahverengi)
        const [lo, hi] = mm(e.h), rg = Math.max(1e-6, hi - lo), pal = [[0.33, 0.52, 0.27], [0.62, 0.66, 0.38], [0.78, 0.70, 0.48], [0.58, 0.43, 0.30], [0.86, 0.84, 0.82]];
        const colz = hz => { const t = Math.min(0.9999, Math.max(0, (hz - lo) / rg)) * (pal.length - 1), k = Math.floor(t), a = t - k; return [0, 1, 2].map(c => pal[k][c] * (1 - a) + pal[k + 1][c] * a); };
        const fc = F.map(q => colz((v[q[0]][2] + v[q[1]][2] + v[q[2]][2]) / 3 + ref));
        out.push({ t: 'tri', v, f: F, vn, fc, edges3: ed, al: sal < 0.995 ? sal : undefined });
      }
      // zemin bloğu: arazi kenarlarından aşağı (derinlik) yan yüzler + taban, ayrı saydamlıkla
      const dep = +e.dep || 0;
      if (dep > 0) {
        const [lo] = mm(e.h), zb = lo - ref - dep, bal = 1 - Math.min(97, Math.max(0, e.bseff != null ? +e.bseff : 60)) / 100, v = [], F = [], ed = [], soil = [0.55, 0.42, 0.30];
        const side = pts => { for (let k = 0; k + 1 < pts.length; k++) { const a = pts[k], b = pts[k + 1], i0 = v.length; v.push([a[0], a[1], a[2]], [b[0], b[1], b[2]], [b[0], b[1], zb], [a[0], a[1], zb]); F.push([i0, i0 + 1, i0 + 2], [i0, i0 + 2, i0 + 3]); ed.push([[a[0], a[1], zb], [b[0], b[1], zb]]); } };
        const P3 = (i, j) => { const p = f.at(i, j); return [p[0], p[1], H(e, i, j) - ref]; };
        const S = [], E2 = [], N = [], W2 = [];
        for (let i = 0; i < nx; i++) { S.push(P3(i, 0)); N.push(P3(nx - 1 - i, ny - 1)); }
        for (let j = 0; j < ny; j++) { E2.push(P3(nx - 1, j)); W2.push(P3(0, ny - 1 - j)); }
        side(S); side(E2); side(N); side(W2);
        const c4 = [P3(0, 0), P3(nx - 1, 0), P3(nx - 1, ny - 1), P3(0, ny - 1)].map(q => [q[0], q[1], zb]), b0 = v.length; v.push(...c4); F.push([b0, b0 + 2, b0 + 1], [b0, b0 + 3, b0 + 2]);
        for (const c of c4) ed.push([[c[0], c[1], zb], [c[0], c[1], zb]]);
        for (const q of [P3(0, 0), P3(nx - 1, 0), P3(nx - 1, ny - 1), P3(0, ny - 1)]) ed.push([q, [q[0], q[1], zb]]);
        out.push({ t: 'tri', v, f: F, fc: F.map(() => soil), edges3: ed, al: bal });
      }
      return out;
    },
    xf: (e, X) => { e.o = X.p([e.o[0], e.o[1], 0]).slice(0, 2); const u = X.v([...(e.ux || [1, 0]), 0]), l = Math.hypot(u[0], u[1]) || 1; e.ux = [u[0] / l, u[1] / l]; e.d *= X.s; },
    snaps: e => { const f = frameOf(e); return [[0, 0], [e.nx - 1, 0], [e.nx - 1, e.ny - 1], [0, e.ny - 1]].map(([i, j]) => ({ p: [...f.at(i, j), 0], k: 'end' })); },
    info: e => { const [mn, mx] = mm(e.h); return `${+e.seff ? 'yüzey saydamlığı %' + e.seff + ' · ' : ''}${+e.dep ? 'zemin bloğu ' + e.dep + ' m (saydamlık %' + (e.bseff != null ? e.bseff : 60) + ') · ' : ''}${e.nx}×${e.ny} nokta, aralık ${M.fmt(e.d, 2)} m, ${M.fmt((e.nx - 1) * e.d, 1)}×${M.fmt((e.ny - 1) * e.d, 1)} m · kot ${M.fmt(mn, 2)} … ${M.fmt(mx, 2)} m · eş yükselti ${e.ci} m · kot 0 = ${M.fmt(e.ref || 0, 2)} m · ${e.src || ''}`; },
  };

  /* ---------- karo okuma ---------- */
  const tileCache = new Map();
  const loadTile = (z, x, y) => {
    const k = z + '/' + x + '/' + y; if (tileCache.has(k)) return tileCache.get(k);
    const p = new Promise((res, rej) => {
      const im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = () => { try { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(im, 0, 0); const d = cx.getImageData(0, 0, 256, 256).data, h = new Float32Array(256 * 256); for (let i = 0; i < h.length; i++) h[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768; res(h); } catch (err) { rej(new Error('Yükseklik karosu okunamadı (tarayıcı izin vermedi): ' + err.message)); } };
      im.onerror = () => { tileCache.delete(k); rej(new Error('Yükseklik verisi indirilemedi (internet bağlantısı?)')); };
      im.src = SRC.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    });
    tileCache.set(k, p); return p;
  };
  /* lat/lon listesi için kot (bilineer, karolar arası) */
  const sampleLL = async (lls, z, onProg) => {
    const need = new Set(); const pix = lls.map(([lat, lon]) => { const gx = G.wmX(lon, z) - 0.5, gy = G.wmY(lat, z) - 0.5; for (const tx of [Math.floor(gx / 256), Math.floor((gx + 1) / 256)]) for (const ty of [Math.floor(gy / 256), Math.floor((gy + 1) / 256)]) need.add(tx + ',' + ty); return [gx, gy]; });
    const keys = [...need]; if (keys.length > 64) throw new Error(`Alan çok büyük (${keys.length} karo). Daha küçük bir alan seçin.`);
    const tiles = new Map(); let n = 0;
    await Promise.all(keys.map(async k => { const [tx, ty] = k.split(',').map(Number); tiles.set(k, await loadTile(z, tx, ty)); n++; if (onProg) onProg(n, keys.length); }));
    const px = (x, y) => { const tx = Math.floor(x / 256), ty = Math.floor(y / 256), t = tiles.get(tx + ',' + ty); if (!t) return NaN; return t[(y - ty * 256) * 256 + (x - tx * 256)]; };
    return pix.map(([gx, gy]) => { const x0 = Math.floor(gx), y0 = Math.floor(gy), a = gx - x0, b = gy - y0; return px(x0, y0) * (1 - a) * (1 - b) + px(x0 + 1, y0) * a * (1 - b) + px(x0, y0 + 1) * (1 - a) * b + px(x0 + 1, y0 + 1) * a * b; });
  };
  const autoCi = rng => { const t = rng / 25; for (const c of [0.25, 0.5, 1, 2, 5, 10, 20, 50]) if (c >= t) return c; return 100; };

  /* ---------- komutlar ---------- */
  C.addCommand(['ARAZI', 'TERRAIN', 'ARAZIAL', 'DEM'], 'Seçilen alan için açık yükseklik verisinden 3B arazi (üçgen model / TIN) ve eş yükselti eğrileri üretir. ARAZI köşe köşe [aralık] [G/M/K]. Koordinat sistemi tanımlı olmalı; internet gerekir.', async (I) => {
    if (!G.isSet()) { C.warn('Önce Harita sekmesinde koordinat sistemini (TM3, UTM…) tanımlayın; arazinin yeri buna göre bulunur.'); return; }
    const a = await I.pt('Arazi alanının ilk köşesi'); if (!a || typeof a === 'string') return;
    E.base = a; E.rubber = false; E.preview = c => [P([a, [c[0], a[1]], c, [a[0], c[1]]], true, { lt: 'DASHED', color: 3 })];
    const b = await I.pt('Karşı köşe'); E.preview = null; if (!b || typeof b === 'string') return;
    const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]), W = Math.abs(b[0] - a[0]), Hh = Math.abs(b[1] - a[1]);
    if (W < 10 || Hh < 10) { C.warn('Alan çok küçük (en az 10×10 m).'); return; }
    if (W > 20000 || Hh > 20000) { C.warn('Alan çok büyük (en çok 20×20 km).'); return; }
    const auto = Math.max(5, Math.ceil(Math.sqrt(W * Hh / 60000))), d = Math.max(1, await I.num(`Nokta aralığı (m) — veri çözünürlüğü ≈30 m, önerilen ${auto}`, auto) || auto);
    const nx = Math.floor(W / d) + 1, ny = Math.floor(Hh / d) + 1;
    if (nx * ny > 250000) { C.warn(`${nx}×${ny} nokta çok fazla; aralığı büyütün.`); return; }
    const mode = await I.kw('Kot sistemi', [['G', 'Göreli: alan ortası kot 0 (tesis modeliyle aynı)'], ['M', 'Mutlak: deniz seviyesinden'], ['K', 'Kot 0 değerini ben gireyim']], 'G');
    let refIn = null; if (mode === 'K') refIn = await I.num('Kot 0 karşılığı (deniz seviyesinden, m)', 0);
    const lls = []; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) lls.push(G.toLL([x0 + i * d, y0 + j * d]));
    const cLat = G.toLL([x0 + W / 2, y0 + Hh / 2])[0], mpp = z => 156543.03 * Math.cos(cLat * RAD) / Math.pow(2, z);
    let z = 14; while (z > 8 && W / mpp(z) > 256 * 6) z--; // en çok ~6×6 karo
    C.log(`Yükseklik verisi indiriliyor (zoom ${z}, ~${M.fmt(mpp(z), 1)} m/piksel)…`);
    let hs;
    try { hs = await sampleLL(lls, z, (n, t) => { if (t > 2) C.log(`  karo ${n}/${t}`); }); }
    catch (err) { C.warn(err.message || String(err)); return; }
    if (hs.some(v => !isFinite(v))) { C.warn('Bazı noktalarda yükseklik verisi yok.'); hs = hs.map(v => isFinite(v) ? v : 0); }
    const h = hs.map(v => Math.round(v * 100) / 100), [mn, mx] = mm(h);
    const ref = mode === 'M' ? 0 : mode === 'K' ? (refIn || 0) : Math.round(h[Math.floor(ny / 2) * nx + Math.floor(nx / 2)] * 100) / 100;
    C.std('ARAZI'); C.ensureLayer('ARAZI', 34, 'CONTINUOUS', 13);
    const e = C.add(C.newEnt('arazi', { o: [x0, y0], ux: [1, 0], d, nx, ny, h, ref, ci: autoCi(mx - mn), cmaj: 5, layer: 'ARAZI', src: 'Terrain Tiles on AWS (SRTM vb.), ' + new Date().toISOString().slice(0, 10) }));
    C.log(`Arazi oluşturuldu: ${nx}×${ny} nokta (${(nx - 1) * (ny - 1) * 2} üçgen), aralık ${d} m · kot ${M.fmt(mn, 2)} … ${M.fmt(mx, 2)} m · eş yükselti ${e.ci} m · kot 0 = ${M.fmt(ref, 2)} m. 3B sekmesinde görün; KESITAL ile kesit alın.`);
    C.log(`Kaynak: ${ATTR}. Doğruluk birkaç metre olabilir — ön proje içindir; uygulama projesi için halihazır ölçümü kullanın.`);
  });
  C.addCommand(['ARAZIKOT', 'TERRAINZ'], 'Tıkladığınız noktalarda arazi kotunu (mutlak ve tesis kotu) yazar', async (I) => {
    const ar = C.doc.ents.filter(e => e.type === 'arazi'); if (!ar.length) { C.warn('Çizimde arazi yok (ARAZI komutu).'); return; }
    for (; ;) {
      const p = await I.pt('Nokta (Enter = bitir)'); if (!p || typeof p === 'string') return;
      let done = false; for (const e of ar) { const z = C.araziKot(e, p); if (z != null) { C.log(`(${M.fmt(p[0], 2)}, ${M.fmt(p[1], 2)}) arazi kotu ${M.fmt(z, 2)} m · tesis kotu ${M.fmt(z - (e.ref || 0), 2)} m`); done = true; break; } }
      if (!done) C.warn('Bu nokta arazi alanının dışında.');
    }
  }, { noUndo: true });
})(window.C);

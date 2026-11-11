/* ArıtmaCAD — KESIT3B (2B plan + kesitlerden 3B) için çizim yazım şekilleri
   Revit'ten DWG/DXF'e aktarılmış projeler (ör. DOLSAR / İller Bankası paftaları) şu şekilde yazılır; KESIT3B bunları da tanır:
     • Başlık parçalı yazı: "A-A KES" + "İTİ" (Türkçe harften bölünmüş, \U+0130 kodlu) ve altında "Ö:1/100" — aynı satırdaki yan yana
       yazılar birleştirilip başlık olarak okunur ("A-A KESİTİ", "+4.65 KOTU PLANI", "ZEMİN KAT PLANI").
     • Kot işaretleri "Spot Elevations - Kot Kesit" blokları + yanındaki kot yazısı.
     • Birim: dosya başlığında mm yazsa da çizim cm (ölçüler 20, 405, 730 …). Kot işaretlerinin düşey aralığı kot farkıyla
       karşılaştırılır; çizim metre değilse KESIT3B açılırken metreye çevirmeyi önerir.
     • Aks balonları blok içinde (daire + harf/rakam) olabilir: blok tanımındaki daire ve kısa yazı balon sayılır.
   Diğer dosyalara dokunmaz; C.k3.detect ve C.k3.detectWithUser sarılır. */
(function (C) {
  'use strict';
  const K = C.k3; if (!K || !K.detect || K._yazim) return; K._yazim = true;
  const M = C.M;
  const txtOf = e => String(e.s || '').replace(/\\[A-Za-z][^;\\]*;/g, '').replace(/\\P/g, ' ').replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
  const kotVal = s => { const m = /^(±|\+|-|−)?\s*(\d{1,4}[.,]\d{2,3})$/.exec(String(s).trim()); if (!m) return null; const v = parseFloat(m[2].replace(',', '.')); return m[1] === '-' || m[1] === '−' ? -v : v; };
  const genis = (s, h) => (C.measureText ? C.measureText(s, h) : s.length * h * 0.72);

  /* aynı satırdaki parçalı yazıları birleştir (geçici sentetik yazılar) */
  const birlesik = () => {
    const T = [];
    for (const e of C.doc.ents) if ((e.type === 'text' || e.type === 'mtext') && e.p && !e._k3tmp && Math.abs(((e.rot || 0) % 180)) < 1) { const s = txtOf(e); if (s && s.length < 60 && !/\n/.test(e.s || '')) T.push({ e, s, h: e.h || 0.2, x: e.p[0], y: e.p[1] }); }
    T.sort((a, b) => a.y - b.y || a.x - b.x);
    const out = [], used = new Set();
    const byRow = new Map(); for (const t of T) { const k = Math.round(t.y / Math.max(t.h, 1e-6) * 2); (byRow.get(k) || byRow.set(k, []).get(k)).push(t); }
    for (const t of T) {
      if (used.has(t)) continue; let cur = t, s = t.s, n = 1; const zinc = [t];
      for (; ;) {
        const xe = cur.x + genis(cur.s, cur.h); let best = null;
        for (const dk of [-1, 0, 1]) for (const q of byRow.get(Math.round(cur.y / Math.max(cur.h, 1e-6) * 2) + dk) || []) {
          if (q === cur || used.has(q) || zinc.includes(q) || q.e.layer !== t.e.layer || Math.abs(q.h - t.h) > t.h * 0.06 || Math.abs(q.y - t.y) > t.h * 0.35) continue;
          const gap = q.x - xe; if (gap < -t.h * 0.4 || gap > t.h * 2.2) continue; if (!best || q.x < best.x) best = q;
        }
        if (!best) break; zinc.push(best); s += (best.x - xe > t.h * 1.1 || /\s$/.test(cur.s) ? ' ' : '') + best.s; cur = best; n++;
      }
      if (n > 1) { zinc.forEach(q => used.add(q)); out.push({ type: 'text', s, p: t.e.p.slice(), h: t.h, layer: t.e.layer, rot: 0, al: t.e.al, _k3tmp: true }); }
    }
    return out;
  };
  /* bloklardaki aks balonları: tanımında daire + kısa yazı olan bloklar (ölçeklenmiş) */
  const balonlar = () => {
    const out = [], defs = C.doc.blocks || {};
    for (const e of C.doc.ents) {
      if (e.type !== 'blk' || !e.p) continue; const d = defs[e.ref]; if (!d || !Array.isArray(d.ents)) continue;
      const ci = d.ents.find(q => q.type === 'circle'), tx = d.ents.filter(q => q.type === 'text' && /^[A-Z0-9]{1,2}$/i.test(txtOf(q)));
      if (!ci || tx.length !== 1 || d.ents.length > 12) continue;
      const s = Math.abs(e.sx || e.s || 1), rot = (e.rot || 0) * Math.PI / 180, cs = Math.cos(rot), sn = Math.sin(rot), W = q => [e.p[0] + (q[0] * cs - q[1] * sn) * s, e.p[1] + (q[0] * sn + q[1] * cs) * s, 0];
      const c = W(ci.c), t = tx[0];
      out.push({ type: 'circle', c, r: ci.r * s, layer: 'AKS_BLOK', _k3tmp: true }, { type: 'text', s: txtOf(t).toUpperCase(), p: c, h: (t.h || ci.r) * s, layer: 'AKS_BLOK', _k3tmp: true });
    }
    return out;
  };
  /* betonarme tarama deseni: SOLID yoksa en büyük alanlı yapı taraması (ANSI36, ANSI31, AR-CONC …) — su, toprak, dolgu, grobeton, yazı katmanları hariç */
  const DISLA = /(^|_|-)SU($|_|-)|WATER|TOPRAK|SOIL|ZEMIN|DOLGU|FILL|GRO|LEAN|BLIND|KORUMA|AGREGA|CAKIL|KUM|SAND|YAZI|TEXT|ANNO|GNY|ANTET|LOGO|BASLIK|TITLE|MEK|BORU|PIPE|MOBIL|FURN/i;
  K.betonDeseni = () => {
    const A = (C.doc.set.k3 || {}); if (A.betonPat) return A.betonPat;
    const alan = new Map();
    for (const e of C.doc.ents) { if (e.type !== 'hatch' || DISLA.test(e.layer || '')) continue; const pat = String(e.pat || '').toLocaleUpperCase('tr-TR').replace(/İ/g, 'I'); if (/DASH|SAND|DOTS|GRAVEL|EARTH|SWAMP|LINE$|^AR-B|BRICK|BRSTD|TUGLA|ANSI32/.test(pat)) continue; let b; try { b = C.bbox(e); } catch (er) { continue; } if (!b) continue; let a = 0; for (const lp of e.loops || []) a += Math.abs(M.polyArea(lp)); if (!a) a = (b[2] - b[0]) * (b[3] - b[1]) * 0.3; alan.set(pat, (alan.get(pat) || 0) + a); }
    if ((alan.get('SOLID') || 0) > 0) return 'SOLID';
    let best = 'SOLID', ba = 0; for (const [p, a] of alan) if (a > ba) { ba = a; best = p; } return best;
  };
  /* Beton katmanı çizgilerinden kapalı betonarme yüzleri (ince yüzler: alan / çevre ≤ tmax/2); açık duvar uçları kapatılır */
  const BETON_KAT = () => { const A = C.doc.set.k3 || {}; return A.betonKatman ? new RegExp('^(' + A.betonKatman + ')$', 'i') : /^(BETON|BETONARME|S-?WALL|S-?CONC)$/i; };
  let yuzCache = null;
  K.betonYuzleri = (win) => {
    const re = BETON_KAT(), A = C.doc.set.k3 || {}, tm = A.tmaxDuvar || 0.8;
    const bents = C.doc.ents.filter(e => re.test(e.layer || '') && ['line', 'arc', 'pline', 'circle', 'ellipse', 'spline'].includes(e.type) && !e.k3 && !e.gv && !e._k3tmp && (!win || (() => { try { const b = C.bbox(e); return b[0] >= win[0] && b[2] <= win[2] && b[1] >= win[1] && b[3] <= win[3]; } catch (er) { return false; } })()));
    if (bents.length < 4 || !C.planarFaces || !C.boundarySegs) return { n: bents.length, yuz: [] };
    const sig = (C.rev || 0) + '|' + bents.length + '|' + (win || []).join(','); if (yuzCache && yuzCache.sig === sig) return yuzCache.v;
    let segs = []; { const all = C.doc.ents; C.doc.ents = bents; try { segs = C.boundarySegs(null); } finally { C.doc.ents = all; } }
    { const key = p => Math.round(p[0] * 1000) + ',' + Math.round(p[1] * 1000), cnt = new Map(); for (const sg of segs) for (const p of sg) cnt.set(key(p), (cnt.get(key(p)) || 0) + 1);
      const icinde = p => segs.some(([a, b]) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; if (l2 < 1e-12) return false; const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2; if (t < 1e-4 || t > 1 - 1e-4) return false; return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]) < 2e-3; });
      const acik = [], gor = new Set(); for (const sg of segs) for (const p of sg) { const k = key(p); if (cnt.get(k) === 1 && !gor.has(k) && !icinde(p)) { gor.add(k); acik.push(p); } }
      const kul = new Set(); for (let i = 0; i < acik.length; i++) { if (kul.has(i)) continue; let bj = -1, bd = tm; for (let j = 0; j < acik.length; j++) { if (j === i || kul.has(j)) continue; const d = Math.hypot(acik[i][0] - acik[j][0], acik[i][1] - acik[j][1]); if (d > 0.02 && d < bd) { bd = d; bj = j; } } if (bj >= 0) { kul.add(i); kul.add(bj); segs.push([acik[i], acik[bj]]); } } }
    const yuz = []; let dis = null, da = 0;
    for (const f of C.planarFaces(segs)) { const ar = M.polyArea(f); if (ar < 0 && -ar > da) { da = -ar; dis = f.slice().reverse(); } if (ar <= 0.01) continue; let per = 0; for (let i = 0; i < f.length; i++) per += Math.hypot(f[(i + 1) % f.length][0] - f[i][0], f[(i + 1) % f.length][1] - f[i][1]); if (ar / per > tm / 2) continue; yuz.push(f); }
    const v = { n: bents.length, yuz, dis }; yuzCache = { sig, v }; return v;
  };
  const d0 = K.detect;
  K.detect = function (opt) {
    if (!opt || !opt.betonPat) { try { const bp = K.betonDeseni(); if (bp && bp !== 'SOLID') opt = Object.assign({}, opt || {}, { betonPat: bp }); } catch (er) { } }

    let ek = []; try { ek = birlesik().concat(balonlar()); } catch (er) { console.error('KESIT3B yazım', er); }
    // kotsuz plan başlıkları ("ZEMİN KAT PLANI", "HAVUZ PLANI"): ±0.00 kabul edilir, panelde düzeltilir
    try { for (const t of ek.concat(C.doc.ents.filter(e => (e.type === 'text' || e.type === 'mtext') && e.p))) { const S = String(txtOf(t)).toLocaleUpperCase('tr-TR'); if (!/\bPLAN(I|LARI)?\b/.test(S) || /İPTAL|IPTAL|PLAN\s*NO|ARŞİV|\d[.,]\d{2}/.test(S) || S.length > 50) continue; ek.push({ type: 'text', s: '+0.00 ' + S, p: t.p.slice(), h: t.h, layer: t.layer, rot: 0, al: t.al, _k3tmp: true }); } } catch (er) { }
    const gizle = e => e.type === 'circle' && /MEK|MARKA|POZ|EQPM|EKIPMAN|EQUIP/i.test(e.layer || ''); // ekipman numara daireleri aks balonu sayılmasın
    // betonarme taraması yoksa (ya da Beton katmanı varsa): Beton katmanı çizgilerinin kapalı ince yüzleri tarama sayılır — planlar ve kesitler
    try { const by = K.betonYuzleri(null); if (by.yuz.length) { C.ensureLayer('K3_BETON_CIZGI', 8, 'CONTINUOUS', 13); for (const f of by.yuz) ek.push({ type: 'hatch', loops: [f.map(p => [p[0], p[1]])], pat: 'SOLID', sc: 1, ang: 0, layer: 'K3_BETON_CIZGI', _k3tmp: true }); opt = Object.assign({}, opt || {}, { betonLay: ['K3_BETON_CIZGI'] }); } } catch (er) { console.error('KESIT3B beton yüzleri', er); }
    const all = C.doc.ents; C.doc.ents = all.filter(e => !gizle(e)).concat(ek);
    try { return d0.call(this, opt); } finally { C.doc.ents = all; }
  };

  /* birim kontrolü: her kesitte kot işaretlerinin düşey aralığı / kot farkı (eğim) — metre çizimde 1 */
  K.birimOrani = () => {
    let D; try { D = K.detect({}); } catch (er) { return null; }
    const r = [];
    for (const s of D.secs || []) { const k = s.kots || []; for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) { const dz = k[j].z - k[i].z; if (Math.abs(dz) < 0.3) continue; const v = (k[j].y - k[i].y) / dz; if (v > 0) r.push(v); } }
    if (r.length < 3) return null;
    const kova = new Map(); for (const k of r) { const b = Math.round(Math.log10(k) * 20); kova.set(b, (kova.get(b) || 0) + 1); }
    let bb = null, bn = 0; for (const [b, n] of kova) { const t = n + (kova.get(b - 1) || 0) + (kova.get(b + 1) || 0); if (t > bn) { bn = t; bb = b; } }
    const sec = r.filter(k => Math.abs(Math.log10(k) * 20 - bb) <= 1.01).sort((a, b) => a - b); 
    return sec.length >= 2 ? sec[sec.length >> 1] : null;
  };
  /* başlık yazı yüksekliğinden birim: 1/50–1/200 paftada başlık 2.5–7 mm → gerçekte ~0.12–1.2 m */
  K.birimBaslik = () => {
    const re = /([A-Z0-9]{1,3})\s*[-–—]\s*\1\s*(KESIT|SECTION)|PLAN|KESIT\s*[A-Z0-9]{1,3}\s*[-–—]/;
    const hs = birlesik().concat(C.doc.ents.filter(e => (e.type === 'text' || e.type === 'mtext') && e.s)).filter(t => re.test(String(txtOf(t)).toLocaleUpperCase('tr-TR').replace(/İ/g, 'I'))).map(t => t.h || 0).filter(h => h > 0).sort((a, b) => a - b);
    if (hs.length < 2) return null; const h = hs[hs.length >> 1]; if (h >= 0.1 && h <= 1.5) return 1;
    let best = 1, bd = Infinity; for (const f of [1e-3, 1e-2, 0.1, 10, 100, 1000]) { const d = Math.abs(Math.log10(h * f / 0.35)); if (d < bd) { bd = d; best = f; } } return best;
  };

  /* ---------- temiz 3B: duvarlar plandaki betonarme taramasının kendi sınırından (eğriler korunur), tek parça ----------
     Plan taramasının her döngüsü bir duvar gövdesi olur (yükseklik kesitlerden: o döngünün içindeki hücrelerin üst kotu);
     radye / döşeme / grobeton kalan hücrelerden üretilir. Ayar: C.doc.set.k3.temiz = false → eski (hücre) yöntemi. */
  const b0 = K.build; K.build = function (D) { const R = b0.apply(this, arguments); try { Object.defineProperty(R, '_D', { value: D, enumerable: false }); } catch (er) { } return R; };
  const sadeles = (q, tol) => { if (q.length < 4) return q; const out = []; for (let i = 0; i < q.length; i++) { const a = out.length ? out[out.length - 1] : q[q.length - 1], b = q[i], c = q[(i + 1) % q.length]; const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]), l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1; if (Math.abs(cr) / l < tol && Math.hypot(b[0] - a[0], b[1] - a[1]) < 1.5) continue; out.push(b); } return out.length >= 3 ? out : q; };
  const mod = a => { const m = new Map(); for (const v of a) { const k = Math.round(v * 50) / 50; m.set(k, (m.get(k) || 0) + 1); } let b = null, n = 0; for (const [k, c] of m) if (c > n || (c === n && k < b)) { n = c; b = k; } return b; };
  const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
  const kabuk = P => { const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
    return lo.slice(0, -1).concat(hi.slice(0, -1)); }; // dışbükey zarf (CCW)
  const mk0 = K.make;
  K.make = function (R, opt) {
    const A = C.doc.set.k3 || {}, D = R && R._D, ref = D && D.plans && D.plans[0];
    if (A.temiz === false || !ref || !(ref.hs || []).length) return mk0.apply(this, arguments);
    const { bb, g, nx, ny, N } = R, iv = R.iv.map(L => (L ? L.map(q => q.slice()) : L)), off = ref.off || [0, 0];
    const loops = [];
    // 1) plandaki "Beton" katmanı çizgileri: kapalı ince yüzler duvar gövdesi
    let disHat = null;
    try { const win = ref.win || [ref.b[0] - 3, ref.b[1] - 3, ref.b[2] + 3, ref.b[3] + 3], by = K.betonYuzleri(win); for (const f of by.yuz) loops.push(f.map(p => [p[0] + off[0], p[1] + off[1]])); if (loops.length) { R._kaynak = 'Beton katmanı (' + by.n + ' çizgi, ' + loops.length + ' duvar)'; disHat = kabuk(loops.flat()); } } catch (er) { console.error('KESIT3B beton katmanı', er); }
    // 2) yoksa plandaki betonarme taraması
    if (!loops.length) for (const h of ref.hs) for (const lp of h.e.loops || []) { const q = lp.map(p => [p[0] + off[0], p[1] + off[1]]); const ar = M.polyArea(q); if (Math.abs(ar) < 0.02) continue; loops.push(ar < 0 ? q.reverse() : q); }
    // döngüler içindeki hücreler
    const inLoop = loops.map(q => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of q) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } const cells = [];
      for (let j = Math.max(0, Math.floor((y0 - bb[1]) / g)); j <= Math.min(ny - 1, Math.ceil((y1 - bb[1]) / g)); j++) for (let i = Math.max(0, Math.floor((x0 - bb[0]) / g)); i <= Math.min(nx - 1, Math.ceil((x1 - bb[0]) / g)); i++) { const c = [bb[0] + (i + 0.5) * g, bb[1] + (j + 0.5) * g]; if (C.pointInPoly(c, q)) cells.push(j * nx + i); }
      return cells; });
    const duvarHucre = new Set(); inLoop.forEach(cs => cs.forEach(k => duvarHucre.add(k)));
    // radye üst kotu: duvar dışı hücrelerdeki en alt betonarme aralığının üstü (en sık değer)
    const altUst = []; for (let k = 0; k < N; k++) { if (!iv[k] || duvarHucre.has(k)) continue; const b = iv[k].filter(q => q[2] !== 'g').sort((p, q) => p[0] - q[0]); if (b.length) altUst.push(b[0][1]); }
    const zr = mod(altUst);
    const duvar = [];
    loops.forEach((q, li) => { const cs = inLoop[li]; if (cs.length < 3) return; const tops = [], bots = [];
      for (const k of cs) { const b = (iv[k] || []).filter(x => x[2] !== 'g'); if (!b.length) continue; const t = b.reduce((m, x) => (x[1] > m[1] ? x : m)); tops.push(t[1]); bots.push(t[0]); }
      let zt, zb; if (tops.length >= Math.max(2, cs.length * 0.05)) { zt = med(tops); zb = med(bots); } else { zt = null; zb = zr; }
      if (zt == null) { duvar.push({ q: sadeles(q, g * 0.25), zb: zr, zt: null, cs }); return; }
      if (zr != null && zb <= zr + 0.05) zb = zr; if (!(zt - zb > 0.5)) { duvar.push({ q: sadeles(q, g * 0.25), zb: zr, zt: null, cs }); return; }
      duvar.push({ q: sadeles(q, g * 0.25), zb, zt });
      for (const k of cs) if (iv[k]) iv[k] = iv[k].flatMap(x => { if (x[2] === 'g') return [x]; const r = []; if (x[0] < zb - 0.004) r.push([x[0], Math.min(x[1], zb)].concat(x.slice(2))); if (x[1] > zt + 0.004) r.push([Math.max(x[0], zt), x[1]].concat(x.slice(2))); return r; }).filter(x => x[1] - x[0] > 0.004);
    });
    // kesit görmeyen duvarlar: en sık duvar üst kotu
    { const zts = duvar.filter(w => w.zt != null).map(w => w.zt), zm = mod(zts); for (const w of duvar) if (w.zt == null) { w.zt = zm; } for (let i = duvar.length - 1; i >= 0; i--) if (duvar[i].zt == null || !(duvar[i].zt - duvar[i].zb > 0.1)) duvar.splice(i, 1);
      // duvar dışında kalan hücrelerde yalnız radye (ve altı), ince döşemeler ve grobeton kalsın: kesit çizgileri arasında uydurulan basamaklı parçalar çıkmasın
      if (zr != null && R._kaynak) for (let k = 0; k < N; k++) if (iv[k]) iv[k] = iv[k].filter(x => x[2] === 'g' || x[1] <= zr + 0.05 || (x[1] - x[0] <= 0.4 && zm != null && x[1] >= zm - 0.5)); }
    // radye: duvarların dış sınırı (+ kesitlerden okunan pabuç payı), tek parça; kalınlık kesitlerden
    let radye = null;
    if (disHat && zr != null) { try {
      const th = [], rc = []; for (let k = 0; k < N; k++) { if (!R.iv[k]) continue; const b = R.iv[k].filter(x => x[2] !== 'g').sort((p, q) => p[0] - q[0]); if (b.length && Math.abs(b[0][1] - zr) < 0.06) { th.push(zr - b[0][0]); rc.push(k); } }
      if (th.length > 20) { const tr = mod(th.filter(t => t > 0.15 && t < 2)) || med(th), Ao = Math.abs(M.polyArea(disHat)); let per = 0; for (let i = 0; i < disHat.length; i++) per += Math.hypot(disHat[(i + 1) % disHat.length][0] - disHat[i][0], disHat[(i + 1) % disHat.length][1] - disHat[i][1]);
        let ov = Math.max(0, Math.min(1, (rc.length * g * g - Ao) / per)); ov = Math.round(ov / 0.05) * 0.05; const q0 = M.polyArea(disHat) < 0 ? disHat.slice().reverse() : disHat; const q = ov > 0.02 && C.offsetPoly ? C.offsetPoly(q0, -ov) : q0;
        radye = { q: sadeles(q, g * 0.25), zt: zr, t: tr, ov };
        for (let k = 0; k < N; k++) if (iv[k]) iv[k] = iv[k].filter(x => x[2] === 'g' || x[1] > zr + 0.05); } } catch (er) { console.error('KESIT3B radye', er); } }
    const R2 = Object.assign({}, R, { iv }); const res = mk0.call(this, R2, opt); res.kaynak = R._kaynak || 'plan taraması';
    if (radye) { const o2 = Object.assign({}, R.o, opt || {}), f3 = v => +(+v).toFixed(3), e = C.newEnt('plak', { kind: 'radye', pts: radye.q.map(p => [f3(p[0]), f3(p[1])]), t: f3(radye.t), zt: f3(radye.zt), beton: 'C30/37', layer: (o2.layerPrefix || '') + 'INS_TEMEL_RADYE', ad: 'Radye temel' }); delete e.sp; e.k3 = o2.tag || 1; C.ensureLayer(e.layer); C.doc.ents.push(e); res.made.push(e); res.counts.radye = 1; res.kaynak += `, radye ${Math.round(radye.t * 100)} cm${radye.ov ? ', pabuç ' + Math.round(radye.ov * 100) + ' cm' : ''}`; }
    const o = Object.assign({}, R.o, opt || {}), lay = n => (o.layerPrefix || '') + n, f3 = v => +(+v).toFixed(3);
    C.ensureLayer(lay('INS_PERDE'));
    for (const w of duvar) { const e = C.newEnt('plak', { kind: 'doseme', pts: w.q.map(p => [f3(p[0]), f3(p[1])]), t: f3(w.zt - w.zb), zt: f3(w.zt), beton: 'C30/37', layer: lay('INS_PERDE'), ad: 'Betonarme perde (plandan)' }); delete e.sp; e.k3 = o.tag || 1; C.doc.ents.push(e); res.made.push(e); if (C.insFixLayer) try { C.insFixLayer(e); } catch (er) { } }
    res.counts.perdeGovde = duvar.length; C.changed(); return res;
  };
  const dw = K.detectWithUser;
  if (dw) K.detectWithUser = function () {
    try {
      const A = C.doc.set.k3 = C.doc.set.k3 || { rows: {}, grid: 0.05, gro: true };
      if (!A.birimSoruldu) {
        let f = K.birimBaslik(), neden = 'başlık yazılarının boyuna';
        if (f === 1 || f == null) { const k = K.birimOrani(); if (k && (k > 1.6 || k < 0.6)) { f = [0.001, 0.01, 0.1, 10, 100, 1000].find(q => Math.abs(Math.log10(k * q)) < 0.15) || null; neden = 'kot işaretlerinin aralığına'; } else f = null; }
        if (f && f !== 1) {
          A.birimSoruldu = true;
          if (confirm(`Çizim metre değil görünüyor (${neden} göre). Revit çıktılarında dosya başlığı "mm" yazsa da çizim çoğu zaman cm'dir.\n\nÇizim ×${f} ile metreye çevrilsin mi?`)) {
            const X = C.xScale([0, 0, 0], f); for (const e of C.doc.ents) if (!e.k3 && !e.gv) C.xform(e, X); C.changed(); C.log(`KESIT3B: çizim ×${f} ölçeklendi (metreye çevrildi).`);
          }
        }
      }
    } catch (er) { console.error('KESIT3B birim', er); }
    try { return dw.apply(this, arguments); }
    catch (er) { // plan / aks eksik: bulunan çizimleri yine listele (türü ve kotu panelden düzeltilebilir)
      const A = C.doc.set.k3 || { rows: {} }, D = K.detect({ grid: A.grid }), key = d => d.kind + ':' + Math.round(d.ti.t.p[0] * 10) + ',' + Math.round(d.ti.t.p[1] * 10), msg = String(er.message || er);
      for (const d of D.plans.concat(D.secs)) { d.key = key(d); const u = (A.rows || {})[d.key]; if (u && u.kind) d.kind = u.kind; if (u && u.level != null && d.kind === 'plan') d.level = +u.level; d.err = d.kind === 'kesit' ? msg.replace(/\.$/, '') : (d.err || ''); }
      return { D, msgs: [msg + (D.secs.length ? ` — ${D.secs.length} kesit bulundu; planı içeren çizimi de ekleyin ya da bir çizimin türünü "Plan" yapın.` : '')] };
    }
  };
})(window.C);

/* ArıtmaCAD — İNŞAAT menüsü (Revit benzeri yapı elemanları)
   perde  : betonarme perde / istinat perdesi / tuğla-gazbeton duvar — yol (çoklu çizgi) boyunca; alt ve üst kalınlık ayrı (eğimli yüz), hiza, beton sınıfı
   kolon  : dikdörtgen / dairesel;  kiris : iki nokta arası;  plak : radye temel / döşeme (çokgen);  temel : tekil (pad) ve sürekli (perde mantığıyla)
   acik   : pencere / kapı — perde ya da duvara yerleşir, 3B'de boşluk açar, planda sembolü çizilir
   Komutlar: PERDE, IDUVAR, KOLON, KIRIS, TEMEL, IDOSEME, PENCERE, KAPI, INSMETRAJ — her biri ayar penceresiyle (betikte ANAHTAR=değer) */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, P, TX, S, CI, A } = C.prim, RAD = Math.PI / 180;
  C.lyLive = C.lyLive || (() => true);
  const BETON = ['C16/20', 'C20/25', 'C25/30', 'C30/37', 'C35/45', 'C40/50', 'C45/55', 'C50/60'];
  const MALZ = { beton: { ad: 'Betonarme', col: [0.74, 0.74, 0.71] }, tugla: { ad: 'Tuğla', col: [0.72, 0.43, 0.34] }, gazbeton: { ad: 'Gazbeton', col: [0.90, 0.88, 0.82] }, briket: { ad: 'Briket', col: [0.62, 0.62, 0.60] } };
  const LAY = { perde: ['INS_PERDE', 8, 50], duvar: ['INS_DUVAR', 31, 35], kolon: ['INS_KOLON', 8, 50], kiris: ['INS_KIRIS', 8, 35], temel: ['INS_TEMEL', 252, 50], doseme: ['INS_DOSEME', 8, 35], pencere: ['INS_PENCERE', 4, 25], kapi: ['INS_KAPI', 30, 25] };
  const lay = k => { const d = LAY[k]; C.ensureLayer(d[0], d[1], 'CONTINUOUS', d[2]); return d[0]; };
  const set = () => { const s = C.doc.set; if (!s.insaat) { let d = {}; try { d = JSON.parse(localStorage.getItem('aritmacad.insaat') || '{}'); } catch (e) { } s.insaat = d; } return s.insaat; };
  const saveSet = () => { try { localStorage.setItem('aritmacad.insaat', JSON.stringify(set())); } catch (e) { } };
  const num = (v, d) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : d; };
  const p2 = q => [q[0], q[1]];
  const dzOf = X => { try { const q = X.p([0, 0, 0]); return q && q.length > 2 ? (q[2] || 0) : 0; } catch (e) { return 0; } };
  const flat = q => [q[0], q[1], 0];
  const colOf = e => (MALZ[e.malz] || MALZ.beton).col;

  /* ---------- kutu (sekiz köşe) ağı: yüzler dışa bakar ---------- */
  const hexa = (out, c8, col, skip) => { // c8: [b0,b1,b2,b3 (alt), t0,t1,t2,t3 (üst)] — b0..b3 çevre sırası
    const v0 = out.v.length; out.v.push(...c8);
    const cen = c8.reduce((s, q) => M.add(s, q), [0, 0, 0]).map(t => t / 8);
    const quads = [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
    for (let qi = 0; qi < quads.length; qi++) {
      const q = quads[qi]; if (skip && skip.includes(qi)) continue;
      const a = c8[q[0]], b = c8[q[1]], c = c8[q[2]], d = c8[q[3]], n = M.cross(M.sub(c, a), M.sub(d, b)), qc = M.mul(M.add(M.add(a, b), M.add(c, d)), 0.25);
      if (M.len(n) < 1e-12) continue;
      const flip = M.dot(n, M.sub(qc, cen)) < 0, id = q.map(k => v0 + k);
      const t1 = flip ? [id[0], id[2], id[1]] : [id[0], id[1], id[2]], t2 = flip ? [id[0], id[3], id[2]] : [id[0], id[2], id[3]];
      out.f.push(t1, t2); out.fc.push(col, col);
    }
  };
  /* tek dörtgen yüz (iki üçgen), gövde merkezine göre dışa bakar */
  const quadOut = (out, q4, col, cen) => {
    const [a, b, c, d] = q4, n = M.cross(M.sub(c, a), M.sub(d, b)), qc = M.mul(M.add(M.add(a, b), M.add(c, d)), 0.25); if (M.len(n) < 1e-12) return;
    const flip = M.dot(n, M.sub(qc, cen)) < 0, v0 = out.v.length; out.v.push(a, b, c, d);
    if (flip) out.f.push([v0, v0 + 2, v0 + 1], [v0, v0 + 3, v0 + 2]); else out.f.push([v0, v0 + 1, v0 + 2], [v0, v0 + 2, v0 + 3]); out.fc.push(col, col);
  };
  /* yelpaze yüz: merkez + kenar ortaları — kenarları komşu yüzlerin kenarlarıyla aynı uçlara sahip olmaz, kesit / görünüşte ortak kenardan
     dış hat (siluet) çizgisi doğmaz; gövde yine kapalı kalır (kesit sınırı kapanır). nW: istenen yüz normali */
  const fanFace = (out, ring, col, nW) => {
    const n = ring.length, c = ring.reduce((s2, q) => M.add(s2, q), [0, 0, 0]).map(t => t / n), v0 = out.v.length; out.v.push(c);
    for (let i = 0; i < n; i++) { const a = ring[i], b = ring[(i + 1) % n], m = M.mul(M.add(a, b), 0.5); out.v.push(a, m); }
    const ia = i => v0 + 1 + 2 * (i % n), im = i => v0 + 2 + 2 * (i % n);
    for (let i = 0; i < n; i++) { const A = out.v[ia(i)], Bm = out.v[im(i)], nn = M.cross(M.sub(A, c), M.sub(Bm, c)), fl = M.dot(nn, nW) < 0;
      const t1 = [v0, ia(i), im(i)], t2 = [v0, im(i), ia(i + 1)]; out.f.push(fl ? [t1[0], t1[2], t1[1]] : t1, fl ? [t2[0], t2[2], t2[1]] : t2); if (out.fc) out.fc.push(col, col); }
  };
  const edgeLoop = (out, pts) => { for (let i = 0; i < pts.length; i++) out.edges3.push([pts[i], pts[(i + 1) % pts.length]]); };
  const newMesh = () => ({ t: 'tri', v: [], f: [], fc: [], edges3: [] });

  /* ---------- PERDE / DUVAR geometrisi ---------- */
  // yüz ofsetleri (sol = +, sağ = −): hiza (O/L/R) ve eğimli yüz (R: sağ yüz eğik, L: sol yüz eğik, B: iki yüz)
  const faceOffs = e => {
    const tb = +e.tb || 0.3, tt = e.tt != null && e.tt !== '' ? +e.tt : tb; let j = e.hiza || 'O';
    const cl = isClosed(e), ccw = cl ? M.polyArea(pathOf(e)) > 0 : true;
    if (j === 'DIS') j = ccw ? 'R' : 'L'; else if (j === 'IC') j = ccw ? 'L' : 'R'; // kapalı şekilde: çizgi dış yüz → perde içeride
    const lB = j === 'L' ? 0 : j === 'R' ? tb : tb / 2, rB = lB - tb;
    let lT, rT; const g = e.egim || 'R';
    if (g === 'L') { rT = rB; lT = rB + tt; } else if (g === 'B') { const c = (lB + rB) / 2; lT = c + tt / 2; rT = c - tt / 2; } else { lT = lB; rT = lB - tt; }
    // çizgiden öteleme: + değer duvarı gövde tarafına (sağ yüz hizasında sola / içeri) kaydırır
    const of = +e.ofs || 0, sh = cl ? (ccw ? of : -of) : (j === 'L' ? -of : of); // kapalıda + = şeklin içine
    return { lB: lB + sh, rB: rB + sh, lT: lT + sh, rT: rT + sh, tb, tt };
  };
  const isClosed = e => !!e.closed || (e.pts.length > 3 && M.dist2(e.pts[0], e.pts[e.pts.length - 1]) < 1e-3);
  const pathOf = e => { const p = e.pts.map(p2); if (isClosed(e) && p.length > 2 && M.dist2(p[0], p[p.length - 1]) < 1e-3) p.pop(); return p; };
  /* segment çerçeveleri + gönye katsayıları (uç s = L + k·ofset) */
  const segFrames = e => {
    const p = pathOf(e), n = p.length, cl = isClosed(e) && n > 2, out = [];
    const segN = cl ? n : n - 1; if (segN < 1) return out;
    const dir = i => { const a = p[i % n], b = p[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
    for (let i = 0; i < segN; i++) {
      const a = p[i], b = p[(i + 1) % n], u = dir(i), nn = [-u[1], u[0]], Ls = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const kAt = (u2, sgn) => { const n2 = [-u2[1], u2[0]], m = [nn[0] + n2[0], nn[1] + n2[1]], ml = Math.hypot(m[0], m[1]); if (ml < 1e-6) return 0; const mm = [m[0] / ml, m[1] / ml], dn = mm[0] * nn[0] + mm[1] * nn[1]; if (Math.abs(dn) < 0.2) return 0; return (mm[0] * u[0] + mm[1] * u[1]) / dn * sgn; };
      const k0 = (i > 0 || cl) ? kAt(dir((i - 1 + segN) % segN), 1) : 0, k1 = (i < segN - 1 || cl) ? kAt(dir(i + 1), 1) : 0;
      out.push({ i, a, b, u, nn, L: Ls, k0, k1, openS: !(i > 0 || cl), openE: !(i < segN - 1 || cl) });
    }
    return out;
  };
  const openingsOf = e => (C.doc ? C.doc.ents.filter(o => o.type === 'acik' && o.host === e.id) : []);
  /* duvar kolondan kolona: segment boyunca kolonların kapladığı aralıklar [s0,s1] (birleşik) */
  const kolonPoly = k => { const c = M.p3(k.p); if (k.sek === 'D') { const r = (+k.D || 0.5) / 2; return Array.from({ length: 16 }, (_, i) => [c[0] + r * Math.cos(i * Math.PI / 8), c[1] + r * Math.sin(i * Math.PI / 8)]); } const b = +k.b || 0.4, d = +k.d || 0.4, cs = Math.cos((k.rot || 0) * RAD), sn = Math.sin((k.rot || 0) * RAD); return [[-b / 2, -d / 2], [b / 2, -d / 2], [b / 2, d / 2], [-b / 2, d / 2]].map(([x, y]) => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs]); };
  /* kesiciler: elemanı kesen (ondan öncelikli) gövdeler — kolon her şeyi keser; betonarme perde duvarı ve kirişi keser.
     Kolon / perde ölçüsü değişince (ör. 40×40 → 40×60) bağlı duvar, kiriş, döşeme kendiliğinden kısalır / uzar */
  const perdeQuads = x => { const F = faceOffs(x), lo = (F.lB + F.lT) / 2, ro = (F.rB + F.rT) / 2; return segFrames(x).map(sf => { const P = (s2, o) => [sf.a[0] + sf.u[0] * s2 + sf.nn[0] * o, sf.a[1] + sf.u[1] * s2 + sf.nn[1] * o]; return [P(sf.k0 * ro, ro), P(sf.L + sf.k1 * ro, ro), P(sf.L + sf.k1 * lo, lo), P(sf.k0 * lo, lo)]; }); };
  const cutters = e => {
    const out = []; if (!C.doc) return out;
    const wall = (e.type === 'perde' && (e.malz || 'beton') !== 'beton') || e.type === 'kiris';
    for (const x of C.doc.ents) {
      if (x === e || !C.lyLive(x.layer)) continue;
      if (x.type === 'kolon') { const z0 = +x.z0 || 0; out.push({ q: kolonPoly(x), z0, z1: z0 + (+x.h || 3) }); }
      else if (wall && x.type === 'perde' && !x.temel && (x.malz || 'beton') === 'beton') { const z0 = +x.z0 || 0; for (const q of perdeQuads(x)) out.push({ q, z0, z1: z0 + (+x.h || 3) }); }
    }
    return out;
  };
  const colCuts = (e, sf, F) => {
    if (e.temel || e.kolonKes === false || !C.doc) return [];
    const z0 = +e.z0 || 0, z1 = z0 + (+e.h || 3), oMin = Math.min(F.rB, F.rT) + 0.005, oMax = Math.max(F.lB, F.lT) - 0.005, out = [];
    for (const cb of cutters(e)) {
      if (cb.z1 <= z0 + 0.01 || cb.z0 >= z1 - 0.01) continue;
      const q = cb.q.map(p => [(p[0] - sf.a[0]) * sf.u[0] + (p[1] - sf.a[1]) * sf.u[1], (p[0] - sf.a[0]) * sf.nn[0] + (p[1] - sf.a[1]) * sf.nn[1]]);
      const omn = Math.min(...q.map(v => v[1])), omx = Math.max(...q.map(v => v[1])); if (omx < oMin || omn > oMax) continue;
      const s0 = Math.max(0, Math.min(...q.map(v => v[0]))), s1 = Math.min(sf.L, Math.max(...q.map(v => v[0]))); if (s1 - s0 > 0.01) out.push([s0, s1]);
    }
    out.sort((a, b) => a[0] - b[0]); const m = []; for (const iv of out) { const l = m[m.length - 1]; if (l && iv[0] <= l[1] + 1e-6) l[1] = Math.max(l[1], iv[1]); else m.push(iv.slice()); } return m;
  };
  /* kolonlar sürekli: döşeme / radye kolon izinden kesilir (çentik ya da delik) — geometri ve metraj üst üste binmez */
  const kolonsIn = (za, zb) => (C.doc ? C.doc.ents.filter(k => k.type === 'kolon' && C.lyLive(k.layer) && (+k.z0 || 0) < zb - 0.005 && (+k.z0 || 0) + (+k.h || 3) > za + 0.005) : []);
  const polyMinusKolon = (poly0, za, zb, ek) => { // ek: döşemeden ayrıca düşülecek çokgenler (düşey, boydan boya boşluklar) // [{outer, holes}] — kolonla kesişmeyen bölgeler
    const R5 = q => q.map(v => [Math.round(v[0] * 1e5) / 1e5, Math.round(v[1] * 1e5) / 1e5]).filter((v, i, a) => { const w = a[(i + a.length - 1) % a.length]; return a.length < 2 || v[0] !== w[0] || v[1] !== w[1]; }); // kayan nokta gürültüsü kesmeyi bozmasın
    const poly = R5(poly0);
    const ks = kolonsIn(za, zb).map(kolonPoly).concat(ek || []).map(R5).filter(kq => kq.length >= 3).filter(kq => kq.some(v => C.pointInPoly(v, poly)) || poly.some(v => C.pointInPoly(v, kq)) || kq.some((v, i) => { const w = kq[(i + 1) % kq.length]; return poly.some((a, j) => { const b = poly[(j + 1) % poly.length], d = (b[0] - a[0]) * (w[1] - v[1]) - (b[1] - a[1]) * (w[0] - v[0]); if (Math.abs(d) < 1e-12) return false; const t = ((v[0] - a[0]) * (w[1] - v[1]) - (v[1] - a[1]) * (w[0] - v[0])) / d, u = ((v[0] - a[0]) * (b[1] - a[1]) - (v[1] - a[1]) * (b[0] - a[0])) / d; return t > 0 && t < 1 && u > 0 && u < 1; }); }));
    if (!ks.length || !C.planarFaces) return [{ outer: poly, holes: [] }];
    const segs = []; for (const q of [poly, ...ks]) for (let i = 0; i < q.length; i++) segs.push([q[i], q[(i + 1) % q.length]]);
    const faces = C.planarFaces(segs), ip = f => { // yüzün İÇİNDE, sınıra bitişik nokta (en uzun kenarın ortasından içeri) — üçgen ağırlık merkezi başka bir kolonun / boşluğun içine düşüp döşemeyi yok edebiliyordu
      try { const g = M.polyArea(f) < 0 ? f.slice().reverse() : f; let bi = 0, bl = -1; for (let i = 0; i < g.length; i++) { const a = g[i], b = g[(i + 1) % g.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > bl) { bl = l; bi = i; } }
        const a = g[bi], b = g[(bi + 1) % g.length], nx = -(b[1] - a[1]) / bl, ny = (b[0] - a[0]) / bl; for (const d of [1e-4, 1e-5, 1e-6]) { const c = [(a[0] + b[0]) / 2 + nx * d, (a[1] + b[1]) / 2 + ny * d]; if (C.pointInPoly(c, g)) return c; }
        const t = C.earClip(g)[0]; return [(g[t[0]][0] + g[t[1]][0] + g[t[2]][0]) / 3, (g[t[0]][1] + g[t[1]][1] + g[t[2]][1]) / 3]; } catch (err) { return f[0]; } };
    const keep = faces.filter(f => M.polyArea(f) > 1e-8).filter(f => { const c = ip(f); return C.pointInPoly(c, poly) && !ks.some(kq => C.pointInPoly(c, kq)); });
    const holes = faces.filter(f => M.polyArea(f) < -1e-8).map(f => f.slice().reverse());
    const out = keep.map(f => ({ outer: f, holes: holes.filter(h => Math.abs(M.polyArea(h)) < Math.abs(M.polyArea(f)) - 1e-9 && C.pointInPoly(h[0], f) && ks.some(kq => C.pointInPoly(ip(h), kq))) }));
    for (const R of out) R.holes = R.holes.filter(h => !R.holes.some(g => g !== h && Math.abs(M.polyArea(g)) > Math.abs(M.polyArea(h)) && C.pointInPoly(h[0], g))); // başka bir boşluğun içinde kalan (iç içe) boşluk ayrıca delinmez
    return out.length ? out : [];
  };
  const slabMesh = (poly, za, zb, ek) => {
    const out = { t: 'tri', v: [], f: [], edges3: [] };
    for (const R of polyMinusKolon(poly, za, zb, ek)) {
      const loops = [R.outer, ...R.holes]; let r; try { r = C.earClipHoles(R.outer, R.holes.map(h => h.slice().reverse())); } catch (err) { try { r = { pts: R.outer, tris: C.earClip(R.outer) }; } catch (e2) { continue; } }
      const v0 = out.v.length, n = r.pts.length; for (const p of r.pts) out.v.push([p[0], p[1], za]); for (const p of r.pts) out.v.push([p[0], p[1], zb]);
      for (const t of r.tris) out.f.push([v0 + n + t[0], v0 + n + t[1], v0 + n + t[2]], [v0 + t[0], v0 + t[2], v0 + t[1]]);
      for (const lp of loops) { const ccwL = lp === R.outer; for (let i = 0; i < lp.length; i++) { const a = lp[i], b = lp[(i + 1) % lp.length], A = ccwL ? a : b, B = ccwL ? b : a, k = out.v.length; out.v.push([A[0], A[1], za], [B[0], B[1], za], [B[0], B[1], zb], [A[0], A[1], zb]); out.f.push([k, k + 1, k + 2], [k, k + 2, k + 3]); out.edges3.push([[a[0], a[1], za], [b[0], b[1], za]], [[a[0], a[1], zb], [b[0], b[1], zb]], [[a[0], a[1], za], [a[0], a[1], zb]]); } }
    }
    return out;
  };
  const slabArea = (poly, za, zb) => polyMinusKolon(poly, za, zb).reduce((s2, R) => s2 + Math.abs(M.polyArea(R.outer)) - R.holes.reduce((h, q) => h + Math.abs(M.polyArea(q)), 0), 0);
  /* kiriş ekseni boyunca kolonların kapladığı aralıklar */
  const beamCuts = e => {
    const [a, b] = kAxis(e), Lb = M.dist2(a, b); if (Lb < 1e-6) return { a, b, Lb, cuts: [] }; const u = [(b[0] - a[0]) / Lb, (b[1] - a[1]) / Lb], nn = [-u[1], u[0]], w = (+e.bw || 0.3) / 2, zt = +e.zt || 3, zb = zt - (+e.hb || 0.5), out = [];
    for (const cb of cutters(e)) { if (cb.z0 >= zt - 0.005 || cb.z1 <= zb + 0.005) continue; const q = cb.q.map(p => [(p[0] - a[0]) * u[0] + (p[1] - a[1]) * u[1], (p[0] - a[0]) * nn[0] + (p[1] - a[1]) * nn[1]]); if (Math.max(...q.map(v => v[1])) < -w + 0.005 || Math.min(...q.map(v => v[1])) > w - 0.005) continue; const s0 = Math.max(0, Math.min(...q.map(v => v[0]))), s1 = Math.min(Lb, Math.max(...q.map(v => v[0]))); if (s1 - s0 > 0.005) out.push([s0, s1]); }
    out.sort((x, y) => x[0] - y[0]); const m = []; for (const iv of out) { const l = m[m.length - 1]; if (l && iv[0] <= l[1] + 1e-6) l[1] = Math.max(l[1], iv[1]); else m.push(iv.slice()); }
    const pcs = []; let s = 0; for (const [c0, c1] of m) { if (c0 - s > 0.005) pcs.push([s, c0]); s = c1; } if (Lb - s > 0.005) pcs.push([s, Lb]);
    return { a, b, u, nn, w, zt, zb, Lb, cuts: m, pcs };
  };
  /* lento: kâgir duvardaki pencere / kapının üstünde, duvar kalınlığında demirsiz beton; iki yandan taşma (varsayılan 10 cm), yükseklik varsayılan duvar kalınlığı */
  const lentoOf = (e, o, sf, F) => {
    if ((e.malz || 'beton') === 'beton' || o.lento === false || o.lento === 'H') return null;
    const z0 = +e.z0 || 0, h = +e.h || 3, w = +o.w || 1, lb = o.lb != null ? +o.lb : 0.10, tw = (F.tb + F.tt) / 2, lh = +o.lh > 0 ? +o.lh : Math.max(0.1, Math.round(tw * 100) / 100);
    const za = z0 + (o.kind === 'kapi' ? 0 : (+o.par || 0.9)) + (+o.hh || (o.kind === 'kapi' ? 2.1 : 1.4)), zb = Math.min(z0 + h, za + lh); if (zb <= za + 0.01) return null;
    return { s0: Math.max(0, (+o.s || 0) - w / 2 - lb), s1: Math.min(sf.L, (+o.s || 0) + w / 2 + lb), za, zb, o: { kind: 'lento', host: o } };
  };
  C.lentoOf = (o) => { const H = hostFrame(o); return H ? lentoOf(H.h, o, H.sf, H.F) : null; };
  const perdeMesh = e => {
    const out = newMesh(), F = faceOffs(e), z0 = +e.z0 || 0, h = +e.h || 3, col = colOf(e);
    const off = (side, z) => { const t = (z - z0) / h; return side === 'L' ? F.lB + (F.lT - F.lB) * t : F.rB + (F.rT - F.rB) * t; };
    const ops = openingsOf(e);
    const SFS = segFrames(e);
    for (const sf of SFS) {
      const sfP = sf.openS ? null : SFS[(sf.i - 1 + SFS.length) % SFS.length], smooth = sfP && (sfP.u[0] * sf.u[0] + sfP.u[1] * sf.u[1]) > Math.cos(12 * RAD); const sfN = SFS[sf.i + 1] || (SFS[0] && !SFS[0].openS ? SFS[0] : null), smoothN1 = sfN && sfN !== sf && !sfN.openS && (sfN.u[0] * sf.u[0] + sfN.u[1] * sf.u[1]) > Math.cos(12 * RAD); // yay / daire üzerindeki köşeler: düşey kenar çizgisi çizilmez (pürüzsüz görünüm)
      const P3 = (s, side, z) => { const o = off(side, z); return [sf.a[0] + sf.u[0] * s + sf.nn[0] * o, sf.a[1] + sf.u[1] * s + sf.nn[1] * o, z]; };
      const sS = (side, z) => sf.k0 * off(side, z), sE = (side, z) => sf.L + sf.k1 * off(side, z);
      // boşluklar bu segmentte: [s0,s1]×[za,zb]
      const my = ops.filter(o => (o.seg || 0) === sf.i).map(o => { const w = +o.w || 1, s0 = Math.max(0.01, (+o.s || 0) - w / 2), s1 = Math.min(sf.L - 0.01, (+o.s || 0) + w / 2), za = z0 + (o.kind === 'kapi' ? 0 : (+o.par || 0.9)), zb = Math.min(z0 + h - 0.01, za + (+o.hh || (o.kind === 'kapi' ? 2.1 : 1.4))); return { s0, s1, za, zb, o }; }).filter(q => q.s1 > q.s0 + 0.02).concat(colCuts(e, sf, F).map(([s0, s1]) => ({ s0, s1, za: z0, zb: z0 + h, o: { kind: 'kolon' } }))).concat(ops.filter(o => (o.seg || 0) === sf.i).map(o => lentoOf(e, o, sf, F)).filter(Boolean)).sort((x, y) => x.s0 - y.s0);
      // s ekseninde parçalar: boşluk dışı tam yükseklik, boşluk içi altta denizlik ve üstte lento
      // (s, z) düzleminde dikdörtgen ayrışımı: kırılma noktaları arasındaki her şeritte boşluklarca örtülmeyen z aralıkları dolu
      // tek kütle (insaat-monolit.js): parçaların sırt sırta değdiği iç yüzler üretilmez — duvar 3B'de ve kesitte parça parça görünmez, yalnız boşluk yüzleri (söve, denizlik, lento altı) kalır
      const DP = C.insMono ? C.insMono.duvarParca(sf.L, z0, h, my) : null;
      const pieces = DP ? DP.pieces : [];
      for (const pc of pieces) {
        const sAt = (side, z, end) => end ? (pc.sb == null ? sE(side, z) : pc.sb) : (pc.sa == null ? sS(side, z) : pc.sa);
        const c8 = [];
        for (const z of [pc.za, pc.zb]) c8.push(P3(sAt('L', z, 0), 'L', z), P3(sAt('L', z, 1), 'L', z), P3(sAt('R', z, 1), 'R', z), P3(sAt('R', z, 0), 'R', z));
        // hexa yüz sırası: 0 alt, 1 üst, 2 sol yüz, 3 son uç, 4 sağ yüz, 5 baş uç
        // yay / daire üzerindeki pürüzsüz eklemlerde iç uç kapakları atılır (yüzeyde ince çizgi gibi görünmesin)
        const sk = []; if (!pc.alt) sk.push(0); if (!pc.ust) sk.push(1);
        if (pc.sa == null ? smooth : true) sk.push(5); if (pc.sb == null ? smoothN1 : true) sk.push(3);
        hexa(out, c8, col, sk);
        // iç uçlarda yalnız açıkta kalan kısım (pencere / kapı sövesi)
        const cen = c8.reduce((s2, q) => M.add(s2, q), [0, 0, 0]).map(t => t / 8);
        for (const [sv, ivs] of [[pc.sa, pc.bas], [pc.sb, pc.son]]) if (sv != null && ivs) for (const [z1, z2] of ivs) quadOut(out, [P3(sv, 'L', z1), P3(sv, 'R', z1), P3(sv, 'R', z2), P3(sv, 'L', z2)], col, cen);
      }
      // lento: önü ve arkası duvar yüzüyle aynı düzlemde (ayrı çizgi yok); altı yalnız boşluğun üstünde
      if (DP) for (const lt of DP.lentolar) { const q = lt.q, c8 = []; for (const z of [q.za, q.zb]) c8.push(P3(q.s0, 'L', z), P3(q.s1, 'L', z), P3(q.s1, 'R', z), P3(q.s0, 'R', z));
        const sk = [0]; if (!lt.ust) sk.push(1); if (!lt.son) sk.push(3); if (!lt.bas) sk.push(5); hexa(out, c8, col, sk); // duvar rengiyle: cephede ayrı parça gibi görünmez (lento verisi ve metrajı ayrı kalır)
        const cen = c8.reduce((s2, v) => M.add(s2, v), [0, 0, 0]).map(t => t / 8);
        for (const [a, b] of lt.alt) quadOut(out, [P3(a, 'L', q.za), P3(b, 'L', q.za), P3(b, 'R', q.za), P3(a, 'R', q.za)], col, cen); }
      // kenar çizgileri: yüz alt/üst çizgileri (boşluklarda kesik), uçlar, boşluk çerçeveleri
      for (const side of ['L', 'R']) for (const z of [z0, z0 + h]) {
        let sa = sS(side, z); const segs = []; for (const q of my) { if ((z === z0 && q.o.kind === 'kapi') || q.o.kind === 'kolon') { segs.push([sa, q.s0]); sa = q.s1; } } segs.push([sa, sE(side, z)]);
        for (const [x0, x1] of segs) if (x1 > x0) out.edges3.push([P3(x0, side, z), P3(x1, side, z)]);
      }
      const cutS = my.some(q => q.o.kind === 'kolon' && q.s0 <= 0.02), cutE = my.some(q => q.o.kind === 'kolon' && q.s1 >= sf.L - 0.02);
      if (cutS) { } else if (sf.openS) edgeLoop(out, [P3(sS('L', z0), 'L', z0), P3(sS('R', z0), 'R', z0), P3(sS('R', z0 + h), 'R', z0 + h), P3(sS('L', z0 + h), 'L', z0 + h)]);
      else if (!smooth) out.edges3.push([P3(sS('L', z0), 'L', z0), P3(sS('L', z0 + h), 'L', z0 + h)], [P3(sS('R', z0), 'R', z0), P3(sS('R', z0 + h), 'R', z0 + h)]);
      if (sf.openE && !cutE) edgeLoop(out, [P3(sE('L', z0), 'L', z0), P3(sE('R', z0), 'R', z0), P3(sE('R', z0 + h), 'R', z0 + h), P3(sE('L', z0 + h), 'L', z0 + h)]);
      for (const q of my) if (q.o.kind !== 'lento') for (const side of ['L', 'R']) edgeLoop(out, [P3(q.s0, side, q.za), P3(q.s1, side, q.za), P3(q.s1, side, q.zb), P3(q.s0, side, q.zb)]); // lento duvarın içinde: dış hattı çizilmez (sıvalı tek yüzey)
    }
    try { seamFix(out, perdeJoints(e)); } catch (er) { console.error(er); }
    return out;
  };
  /* uç uca, yüzleri aynı hizada devam eden iki perde (ör. PERDEPARCA / PERDEBOL parçaları): birleşim yüzü ve ara çizgi gösterilmez — tek yüzey */
  const perdeEnds = x => { const S = segFrames(x); if (!S.length || isClosed(x)) return []; const F = faceOffs(x), a = S[0], b = S[S.length - 1], z0 = +x.z0 || 0, zt = z0 + (+x.h || 3);
    const mk = (A, u, nn) => ({ A, u, L: [A[0] + nn[0] * F.lB, A[1] + nn[1] * F.lB], R: [A[0] + nn[0] * F.rB, A[1] + nn[1] * F.rB], z0, zt });
    return [mk(a.a, [-a.u[0], -a.u[1]], a.nn), mk(b.b, b.u, b.nn)]; };
  const perdeJoints = e => { const me = perdeEnds(e); if (!me.length || !C.doc) return []; const out = [], d2 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    for (const x of C.doc.ents) { if (x === e || x.type !== 'perde' || !x.pts || x.pts.length < 2 || !C.lyLive(x.layer)) continue; const xe = perdeEnds(x);
      for (const m of me) for (const n of xe) { if (d2(m.A, n.A) > 0.02 || m.u[0] * n.u[0] + m.u[1] * n.u[1] > -0.999) continue;
        if (!((d2(m.L, n.L) < 0.01 && d2(m.R, n.R) < 0.01) || (d2(m.L, n.R) < 0.01 && d2(m.R, n.L) < 0.01))) continue;
        const za = Math.max(m.z0, n.z0), zb = Math.min(m.zt, n.zt); if (zb - za < 0.01) continue;
        out.push({ A: m.A, u: m.u, za, zb, botEq: Math.abs(m.z0 - n.z0) < 1e-3, topEq: Math.abs(m.zt - n.zt) < 1e-3 }); } }
    return out; };
  C.perdeJoints = perdeJoints;
  const clipZ = (poly, z, below) => { const o = []; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], ip = below ? p[2] <= z + 1e-9 : p[2] >= z - 1e-9, iq = below ? q[2] <= z + 1e-9 : q[2] >= z - 1e-9; if (ip) o.push(p); if (ip !== iq) { const t = (z - p[2]) / (q[2] - p[2]); o.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, z]); } } return o; };
  const seamFix = (out, J) => { if (!J.length) return;
    for (const j of J) { const on = q => Math.abs((q[0] - j.A[0]) * j.u[0] + (q[1] - j.A[1]) * j.u[1]) < 1e-4, eps = 1e-4;
      const F = [], FC = [];
      out.f.forEach((t, i) => { const vs = t.map(k => out.v[k]); if (!vs.every(on)) { F.push(t); FC.push(out.fc[i]); return; }
        for (const poly of [clipZ(vs, j.za, true), clipZ(vs, j.zb, false)]) { if (poly.length < 3) continue; let ar = [0, 0, 0]; for (let k = 1; k + 1 < poly.length; k++) ar = M.add(ar, M.cross(M.sub(poly[k], poly[0]), M.sub(poly[k + 1], poly[0]))); if (M.len(ar) < 1e-8) continue; const v0 = out.v.length; out.v.push(...poly.map(p => p.slice())); for (let k = 1; k + 1 < poly.length; k++) { F.push([v0, v0 + k, v0 + k + 1]); FC.push(out.fc[i]); } } });
      out.f = F; out.fc = FC;
      const E3 = [];
      for (const [p, q] of out.edges3) { if (!on(p) || !on(q)) { E3.push([p, q]); continue; }
        if (Math.abs(p[2] - q[2]) < 1e-6) { const z = p[2], inside = z > j.za + eps && z < j.zb - eps, rm = inside || (Math.abs(z - j.za) <= eps && j.botEq) || (Math.abs(z - j.zb) <= eps && j.topEq); if (!rm) E3.push([p, q]); continue; }
        const lo = p[2] < q[2] ? p : q, hi = p[2] < q[2] ? q : p, at = z => { const t = (z - lo[2]) / (hi[2] - lo[2]); return [lo[0] + (hi[0] - lo[0]) * t, lo[1] + (hi[1] - lo[1]) * t, z]; };
        if (lo[2] < j.za - eps) E3.push([lo, at(Math.min(hi[2], j.za))]); if (hi[2] > j.zb + eps) E3.push([at(Math.max(lo[2], j.zb)), hi]); }
      out.edges3 = E3; } };
  /* komşu perde değişince birleşim yeniden hesaplansın */
  C.on('change', () => { if (!C.doc) return; for (const x of C.doc.ents) { if (x.type !== 'perde') continue; let sg = ''; try { sg = JSON.stringify(perdeJoints(x).map(j => [j.za, j.zb, j.botEq, j.topEq, j.A.map(v => +v.toFixed(3))])); } catch (er) { } if (x._jsig !== sg) { x._jsig = sg; delete x._c; } } });
  /* planda: alt (taban) izi ve üst yüz çizgileri; boşluklarda kesik + söve çizgileri; kesit taraması */
  const perdePrims = e => {
    const out = [], F = faceOffs(e), ops = openingsOf(e), beton = (e.malz || 'beton') === 'beton';
    for (const sf of segFrames(e)) {
      const Pp = (s, o) => [sf.a[0] + sf.u[0] * s + sf.nn[0] * o, sf.a[1] + sf.u[1] * s + sf.nn[1] * o, 0];
      const sS = o => sf.k0 * o, sE = o => sf.L + sf.k1 * o;
      const my = ops.filter(o => (o.seg || 0) === sf.i).map(o => { const w = +o.w || 1; return [Math.max(0.01, (+o.s || 0) - w / 2), Math.min(sf.L - 0.01, (+o.s || 0) + w / 2)]; }).concat(colCuts(e, sf, F)).sort((x, y) => x[0] - y[0]);
      const cS = my.some(([a]) => a <= 0.02), cE = my.some(([, b]) => b >= sf.L - 0.02); // kolonla başlayan / biten segment: köşe uzantısı çizilmez
      const lineSeg = (o, lw, lt) => { let sa = sS(o); for (const [s0, s1] of my) { if (!(s0 <= 0.02 && cS)) out.push(L(Pp(sa, o), Pp(s0, o), { lw, lt })); sa = s1; } if (!cE) out.push(L(Pp(sa, o), Pp(sE(o), o), { lw, lt })); };
      lineSeg(F.lB, 50); lineSeg(F.rB, 50);
      if (Math.abs(F.lT - F.lB) > 1e-6) lineSeg(F.lT, 18); if (Math.abs(F.rT - F.rB) > 1e-6) lineSeg(F.rT, 18);
      for (const [s0, s1] of my) { if (s0 > 0.02) out.push(L(Pp(s0, F.lB), Pp(s0, F.rB), { lw: 35 })); if (s1 < sf.L - 0.02) out.push(L(Pp(s1, F.lB), Pp(s1, F.rB), { lw: 35 })); }
      const jHide = P0 => { try { return perdeJoints(e).some(j => j.topEq && j.botEq && Math.hypot(j.A[0] - P0[0], j.A[1] - P0[1]) < 0.02); } catch (er) { return false; } }; // aynı yükseklikte devam eden perde: planda ara çizgi yok
      if (sf.openS && !cS && !jHide(sf.a)) out.push(L(Pp(sS(F.lB), F.lB), Pp(sS(F.rB), F.rB), { lw: 50 }));
      if (sf.openE && !cE && !jHide(sf.b)) out.push(L(Pp(sE(F.lB), F.lB), Pp(sE(F.rB), F.rB), { lw: 50 }));
      // tarama: betonarmede çapraz çizgi, duvarda tek yön (boşluklar hariç)
      const step = Math.max(C.annoH(2.5), 0.05), w = F.lB - F.rB; let sa = sS(F.lB); const ranges = []; for (const [s0, s1] of my) { if (!(s0 <= 0.02 && cS)) ranges.push([sa, s0]); sa = s1; } if (!cE) ranges.push([sa, sE(F.lB)]);
      for (const [x0, x1] of ranges) for (let s = x0 + step / 2; s < x1 - w * 0.2; s += step) { out.push(L(Pp(s, F.rB), Pp(s + w * 0.8, F.lB), { lw: 13, color: 8 })); if (beton) out.push(L(Pp(s + w * 0.8, F.rB), Pp(s, F.lB), { lw: 13, color: 8 })); }
    }
    return out;
  };
  T.perde = {
    label: 'Perde / duvar', ifc: 'IfcWall',
    prims: perdePrims,
    mesh: e => [perdeMesh(e)],
    xf: (e, X) => { e.z0 = (+e.z0 || 0) + dzOf(X); e.pts = e.pts.map(q => X.p([q[0], q[1], 0]).slice(0, 2)); if (X.mir) { const m = { L: 'R', R: 'L' }; if (m[e.hiza]) e.hiza = m[e.hiza]; if (m[e.egim]) e.egim = m[e.egim]; } },
    snaps: e => { const out = []; const F = faceOffs(e); for (const sf of segFrames(e)) for (const o of [F.lB, F.rB]) { out.push({ p: [sf.a[0] + sf.nn[0] * o, sf.a[1] + sf.nn[1] * o, 0], k: 'end' }); out.push({ p: [sf.b[0] + sf.nn[0] * o, sf.b[1] + sf.nn[1] * o, 0], k: 'end' }); } e.pts.forEach(q => out.push({ p: [q[0], q[1], 0], k: 'end' })); return out; },
    info: e => { const F = faceOffs(e), Lt = segFrames(e).reduce((s, f) => s + f.L, 0); return `${(MALZ[e.malz] || MALZ.beton).ad}${(e.malz || 'beton') === 'beton' ? ' ' + (e.beton || 'C30/37') : ''} · kalınlık alt ${M.fmt(F.tb * 100, 0)} / üst ${M.fmt(F.tt * 100, 0)} cm · h=${M.fmt(+e.h, 2)} m · alt kot ${M.fmt(+e.z0 || 0, 2)} · boy ${M.fmt(Lt, 2)} m · hacim ${M.fmt(perdeVol(e), 2)} m³`; },
  };
  const perdeVol = e => { const F = faceOffs(e), h = +e.h || 3; let V = 0; for (const sf of segFrames(e)) { const om = (F.lB + F.rB + F.lT + F.rT) / 4; V += (sf.L + (sf.k1 - sf.k0) * om) * (F.tb + F.tt) / 2 * h; for (const [a, b] of colCuts(e, sf, F)) V -= (b - a) * (F.tb + F.tt) / 2 * h; } for (const o of openingsOf(e)) { const za = o.kind === 'kapi' ? 0 : (+o.par || 0.9), hh = Math.min(h - za, +o.hh || (o.kind === 'kapi' ? 2.1 : 1.4)), zm = (za + hh / 2) / h; V -= (+o.w || 1) * hh * (F.tb + (F.tt - F.tb) * zm); const sf = segFrames(e).find(f => f.i === (o.seg || 0)), Lt = sf && lentoOf(e, o, sf, F); if (Lt) V -= (Lt.s1 - Lt.s0) * (Lt.zb - Lt.za) * (F.tb + F.tt) / 2; } return Math.max(0, V); };
  const lentoVol = e => { const F = faceOffs(e); let V = 0, n = 0; for (const o of openingsOf(e)) { const sf = segFrames(e).find(f => f.i === (o.seg || 0)), Lt = sf && lentoOf(e, o, sf, F); if (Lt) { V += (Lt.s1 - Lt.s0) * (Lt.zb - Lt.za) * (F.tb + F.tt) / 2; n++; } } return { V, n }; };
  const perdeKalip = e => { const F = faceOffs(e), h = +e.h || 3; let A2 = 0; for (const sf of segFrames(e)) { const sl = Math.hypot(h, Math.abs(F.lT - F.lB)), sr = Math.hypot(h, Math.abs(F.rT - F.rB)); A2 += (sf.L + (sf.k1 - sf.k0) * (F.lB + F.lT) / 2) * sl + (sf.L + (sf.k1 - sf.k0) * (F.rB + F.rT) / 2) * sr; if (sf.openS) A2 += h * (F.tb + F.tt) / 2; if (sf.openE) A2 += h * (F.tb + F.tt) / 2; } for (const o of openingsOf(e)) { const hh = +o.hh || (o.kind === 'kapi' ? 2.1 : 1.4); A2 -= 2 * (+o.w || 1) * hh; } return Math.max(0, A2); };

  /* ---------- KOLON ---------- */
  /* GUSE (vinç kirişi konsolu): kolon yüzünden çıkan, alt yüzü eğik konsol. e.guse 'E', gYon R|L|F|A|RL|FA|ALL, gRef UST|KOT, gZ (m), gL çıkma, gHf yüzde yükseklik, gHu uçta yükseklik, gW genişlik (m, 0 = kolon yüzü) */
  const GUSE_YON = [['R', 'Sağ (+b)'], ['L', 'Sol (−b)'], ['F', 'Ön (+d)'], ['A', 'Arka (−d)'], ['RL', 'Sağ + sol'], ['FA', 'Ön + arka'], ['ALL', 'Dört yön']];
  const guseList = e => {
    if (e.guse !== 'E') return [];
    const y = String(e.gYon || 'R'), sides = y === 'ALL' ? ['R', 'L', 'F', 'A'] : y === 'RL' ? ['R', 'L'] : y === 'FA' ? ['F', 'A'] : [y];
    const z0 = +e.z0 || 0, h = +e.h || 3, gz = e.gZ == null || e.gZ === '' ? 1 : +e.gZ, zt = e.gRef === 'KOT' ? gz : z0 + h - gz, gL = +e.gL || 0.4, hf = Math.max(0.05, +e.gHf || 0.6), hu = Math.max(0.02, Math.min(hf, +e.gHu || 0.3));
    const D = e.sek === 'D', b = D ? (+e.D || 0.5) : (+e.b || 0.4), d = D ? (+e.D || 0.5) : (+e.d || 0.4);
    return sides.map(sd => { const along = sd === 'R' || sd === 'L', f0 = (along ? b : d) / 2 - (D ? 0.02 : 0), w = +e.gW > 0 ? +e.gW : (along ? d : b) * (D ? 0.7 : 1), sg = sd === 'R' || sd === 'F' ? 1 : -1;
      const loc = (t, s2) => along ? [sg * t, s2] : [s2, sg * t]; return { sd, f0, w, zt, zf: zt - hf, zu: zt - hu, gL, loc }; });
  };
  C.kolonGuse = guseList;
  const guseVol = e => guseList(e).reduce((s2, g) => s2 + g.w * g.gL * (g.zt - g.zf + g.zt - g.zu) / 2, 0);
  T.kolon = {
    label: 'Kolon', ifc: 'IfcColumn',
    prims: e => {
      const c = M.p3(e.p), out = [];
      if (e.sek === 'D') { const r = (+e.D || 0.5) / 2; out.push(CI(c, r, { lw: 50 })); for (let k = -3; k <= 3; k++) { const y = k * r / 3.5, x = Math.sqrt(Math.max(0, r * r - y * y)); out.push(L([c[0] - x, c[1] + y, 0], [c[0] + x, c[1] + y, 0], { lw: 13, color: 8 })); } const cs0 = Math.cos((e.rot || 0) * RAD), sn0 = Math.sin((e.rot || 0) * RAD); for (const g of guseList(e)) { const Q = [[g.f0, -g.w / 2], [g.f0 + g.gL, -g.w / 2], [g.f0 + g.gL, g.w / 2], [g.f0, g.w / 2]].map(([t, s2]) => { const l = g.loc(t, s2); return [c[0] + l[0] * cs0 - l[1] * sn0, c[1] + l[0] * sn0 + l[1] * cs0, 0]; }); out.push(P(Q, false, { lw: 25, lt: 'HIDDEN' })); } return out; }
      const b = +e.b || 0.4, d = +e.d || 0.4, cs = Math.cos((e.rot || 0) * RAD), sn = Math.sin((e.rot || 0) * RAD), W = (x, y) => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs, 0];
      const q = [W(-b / 2, -d / 2), W(b / 2, -d / 2), W(b / 2, d / 2), W(-b / 2, d / 2)]; out.push(P(q, true, { lw: 50 }), L(q[0], q[2], { lw: 13, color: 8 }), L(q[1], q[3], { lw: 13, color: 8 }));
      for (const g of guseList(e)) { const Q = [[g.f0, -g.w / 2], [g.f0 + g.gL, -g.w / 2], [g.f0 + g.gL, g.w / 2], [g.f0, g.w / 2]].map(([t, s2]) => { const l = g.loc(t, s2); return W(l[0], l[1]); }); out.push(P(Q, false, { lw: 25, lt: 'HIDDEN' })); out.push(L(Q[3], Q[0], { lw: 13, lt: 'HIDDEN' })); }
      return out;
    },
    mesh: e => {
      const c = M.p3(e.p), z0 = +e.z0 || 0, h = +e.h || 3, col = MALZ.beton.col, out = newMesh();
      if (e.sek === 'D') { const r = (+e.D || 0.5) / 2, n = M.circN ? M.circN(r, 32) : 48; for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, P0 = [c[0] + r * Math.cos(a0), c[1] + r * Math.sin(a0)], P1 = [c[0] + r * Math.cos(a1), c[1] + r * Math.sin(a1)]; hexa(out, [[c[0], c[1], z0], [c[0], c[1], z0], [P1[0], P1[1], z0], [P0[0], P0[1], z0], [c[0], c[1], z0 + h], [c[0], c[1], z0 + h], [P1[0], P1[1], z0 + h], [P0[0], P0[1], z0 + h]], col); out.edges3.push([[P0[0], P0[1], z0], [P1[0], P1[1], z0]], [[P0[0], P0[1], z0 + h], [P1[0], P1[1], z0 + h]]); } return [out]; }
      const b = +e.b || 0.4, d = +e.d || 0.4, cs = Math.cos((e.rot || 0) * RAD), sn = Math.sin((e.rot || 0) * RAD), W = (x, y, z) => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs, z];
      const c8 = []; for (const z of [z0, z0 + h]) c8.push(W(-b / 2, -d / 2, z), W(b / 2, -d / 2, z), W(b / 2, d / 2, z), W(-b / 2, d / 2, z));
      hexa(out, c8, col); edgeLoop(out, c8.slice(0, 4)); edgeLoop(out, c8.slice(4)); for (let i = 0; i < 4; i++) out.edges3.push([c8[i], c8[i + 4]]); return [out];
    },
    xf: (e, X) => { e.z0 = (+e.z0 || 0) + dzOf(X); e.p = flat(X.p(flat(e.p))); const v = X.v([Math.cos((e.rot || 0) * RAD), Math.sin((e.rot || 0) * RAD), 0]); e.rot = Math.atan2(v[1], v[0]) / RAD; },
    snaps: e => { const c = M.p3(e.p), out = [{ p: c, k: 'cen' }]; if (e.sek === 'D') { const r = (+e.D || 0.5) / 2; for (let i = 0; i < 4; i++) out.push({ p: [c[0] + r * Math.cos(i * Math.PI / 2), c[1] + r * Math.sin(i * Math.PI / 2), 0], k: 'qua' }); return out; } const b = +e.b || 0.4, d = +e.d || 0.4, cs = Math.cos((e.rot || 0) * RAD), sn = Math.sin((e.rot || 0) * RAD), W = (x, y) => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs, 0]; const q = [W(-b / 2, -d / 2), W(b / 2, -d / 2), W(b / 2, d / 2), W(-b / 2, d / 2)]; q.forEach((p, i) => out.push({ p, k: 'end' }, { p: M.lerp(p, q[(i + 1) % 4], 0.5), k: 'mid' })); return out; },
    info: e => `Kolon ${e.sek === 'D' ? 'Ø' + M.fmt((+e.D || 0.5) * 100, 0) : M.fmt((+e.b || 0.4) * 100, 0) + '×' + M.fmt((+e.d || 0.4) * 100, 0)} cm · ${e.beton || 'C30/37'} · h=${M.fmt(+e.h || 3, 2)} m · hacim ${M.fmt(kolonVol(e), 3)} m³`,
  };
  const kolonVol = e => (e.sek === 'D' ? Math.PI * Math.pow((+e.D || 0.5) / 2, 2) : (+e.b || 0.4) * (+e.d || 0.4)) * (+e.h || 3) + guseVol(e);
  /* guse gövdesi (3B), yakalama noktaları (vinç kirişi oturma yüzü), bilgi */
  { const W3 = (e, l, z) => { const c = M.p3(e.p), cs = Math.cos((e.rot || 0) * RAD), sn = Math.sin((e.rot || 0) * RAD); return [c[0] + l[0] * cs - l[1] * sn, c[1] + l[0] * sn + l[1] * cs, z]; };
    const m0 = T.kolon.mesh; T.kolon.mesh = e => { const r = m0(e); if (e.guse === 'E' && r && r[0]) { const out = r[0], col = MALZ.beton.col; for (const g of guseList(e)) { const P3 = (t, s2, z) => W3(e, g.loc(t, s2), z), t0 = g.f0, t1 = g.f0 + g.gL, w2 = g.w / 2;
          const c8 = [P3(t0, -w2, g.zf), P3(t1, -w2, g.zu), P3(t1, w2, g.zu), P3(t0, w2, g.zf), P3(t0, -w2, g.zt), P3(t1, -w2, g.zt), P3(t1, w2, g.zt), P3(t0, w2, g.zt)];
          hexa(out, c8, col); edgeLoop(out, c8.slice(0, 4)); edgeLoop(out, c8.slice(4)); for (let i = 1; i < 3; i++) out.edges3.push([c8[i], c8[i + 4]]); } } return r; };
    const s0 = T.kolon.snaps; T.kolon.snaps = e => { const out = s0(e); for (const g of guseList(e)) { const m = g.f0 + g.gL / 2; out.push({ p: W3(e, g.loc(m, 0), g.zt), k: 'mid' }, { p: W3(e, g.loc(g.f0 + g.gL, -g.w / 2), g.zt), k: 'end' }, { p: W3(e, g.loc(g.f0 + g.gL, g.w / 2), g.zt), k: 'end' }, { p: W3(e, g.loc(m, 0), 0), k: 'cen' }); } return out; };
    const i0 = T.kolon.info; T.kolon.info = e => { const G = guseList(e); if (!G.length) return i0(e); const g = G[0]; return i0(e) + ` · guse ${G.length}× (çıkma ${M.fmt(g.gL * 100, 0)} cm, h ${M.fmt((g.zt - g.zf) * 100, 0)}/${M.fmt((g.zt - g.zu) * 100, 0)} cm, en ${M.fmt(g.w * 100, 0)} cm, üst kot ${M.fmt(g.zt, 2)})`; };
  }

  /* ---------- KİRİŞ ---------- */
  /* kiriş ekseni: hiza L = sol yüz çizgide (gövde sağda), R = sağ yüz çizgide */
  const kAxis = e => { const a = M.p3(e.a), b = M.p3(e.b), j = e.hiza || 'O'; if (j === 'O') return [a, b]; const u = M.norm([b[0] - a[0], b[1] - a[1], 0]), n = [-u[1], u[0], 0], o = (j === 'L' ? -1 : 1) * (+e.bw || 0.3) / 2; return [M.add(a, M.mul(n, o)), M.add(b, M.mul(n, o))]; };
  T.kiris = {
    label: 'Kiriş', ifc: 'IfcBeam',
    prims: e => { const [a, b] = kAxis(e), u = M.norm(M.sub(b, a)), n = [-u[1], u[0], 0], w = (+e.bw || 0.3) / 2; return [L(M.add(a, M.mul(n, w)), M.add(b, M.mul(n, w)), { lt: 'HIDDEN', lw: 25 }), L(M.sub(a, M.mul(n, w)), M.sub(b, M.mul(n, w)), { lt: 'HIDDEN', lw: 25 }), L(M.add(a, M.mul(n, w)), M.sub(a, M.mul(n, w)), { lt: 'HIDDEN' }), L(M.add(b, M.mul(n, w)), M.sub(b, M.mul(n, w)), { lt: 'HIDDEN' })]; },
    mesh: e => kirisMesh(e),
    xf: (e, X) => { e.zt = (+e.zt || 0) + dzOf(X); e.a = flat(X.p(flat(e.a))); e.b = flat(X.p(flat(e.b))); },
    snaps: e => { const [a, b] = kAxis(e), u = M.norm(M.sub(b, a)), n = [-u[1], u[0], 0], w = (+e.bw || 0.3) / 2; return [{ p: M.p3(e.a), k: 'end' }, { p: M.p3(e.b), k: 'end' }, { p: M.lerp(M.p3(e.a), M.p3(e.b), 0.5), k: 'mid' }, ...[a, b].flatMap(q => [{ p: M.add(q, M.mul(n, w)), k: 'end' }, { p: M.sub(q, M.mul(n, w)), k: 'end' }])]; },
    info: e => `Kiriş ${M.fmt((+e.bw || 0.3) * 100, 0)}×${M.fmt((+e.hb || 0.5) * 100, 0)} cm · ${e.beton || 'C30/37'} · üst kot ${M.fmt(+e.zt || 3, 2)} · L=${M.fmt(M.dist2(e.a, e.b), 2)} m · hacim ${M.fmt(kirisVol(e), 3)} m³`,
  };
  /* KİRİŞ + DÖŞEME TEK PARÇA (monolitik döküm): döşemeyle birlikte dökülen kirişin döşeme içindeki kısmı görünümde döşemeye gömülür.
     Veri ayrı kalır (kiriş ve döşeme ayrı nesne: statik modele çevirme, INSMETRAJ, statik-model-denetci kirişi ve döşemeyi ayrı okur);
     yalnız 3B ağ ve kesit birleşik: kirişin üstü döşeme altında biter, ortak yüzler ve ara çizgiler çizilmez, kesitte ikisi tek dış hat + tek tarama. */
  const dosemeD = p => { let pts = p.pts.map(p2); if (M.polyArea(pts) < 0) pts = pts.reverse(); const zt = +p.zt || 0; return { poly: pts, zt, za: zt - (+p.t || 0.3) }; };
  const kirisMono = e => {
    if (!C.doc || !C.insMono || e.monolit === false) return null; const B = beamCuts(e); if (!B.u) return null; let best = null;
    for (const p of C.doc.ents) { if (p.type !== 'plak' || p.kind === 'radye' || p.monolit === false || !p.pts || p.pts.length < 3 || !C.lyLive(p.layer)) continue; const r = C.insMono.kirisDoseme(B, dosemeD(p)); if (r && (!best || (r.ust && !best.r.ust))) best = { D: p, r, B }; if (best && best.r.ust) break; }
    return best;
  };
  C.kirisDoseme = e => { try { const m = e && e.type === 'kiris' ? kirisMono(e) : null; return m ? m.D : null; } catch (er) { return null; } };
  const dosemeRenk = p => { try { const a = C.entColor(p), c = C.aciRgb(a === 7 ? 9 : a); return [c[0] / 255, c[1] / 255, c[2] / 255]; } catch (er) { return MALZ.beton.col; } }; // 3B görünümün (view3d) döşemeye verdiği renk
  const kirisMesh = e => {
    const B = beamCuts(e), out = newMesh(); if (!B.pcs) return [out];
    const mo = kirisMono(e), col = mo ? dosemeRenk(mo.D) : MALZ.beton.col; // döşemeyle tek parça: 3B'de döşemenin rengiyle (ayrı eleman gibi görünmesin)
    const Pq = (s2, o, z) => [B.a[0] + B.u[0] * s2 + B.nn[0] * o, B.a[1] + B.u[1] * s2 + B.nn[1] * o, z];
    for (const [s0, s1] of B.pcs) {
      // parçayı döşeme altında kalan / kalmayan aralıklara böl
      const ust = mo ? C.insMono.kesisim([[s0, s1]], mo.r.ivs) : [], acik = C.insMono ? C.insMono.cikar(s0, s1, ust) : [[s0, s1]];
      const subs = ust.map(q => ({ a: q[0], b: q[1], z: mo.r.zc, gom: true })).concat(acik.map(q => ({ a: q[0], b: q[1], z: B.zt, gom: false }))).sort((x, y) => x.a - y.a);
      if (!subs.length) continue;
      subs.forEach((sb, i) => {
        if (sb.z <= B.zb + 1e-4) return;
        const c8 = []; for (const z of [B.zb, sb.z]) c8.push(Pq(sb.a, B.w, z), Pq(sb.b, B.w, z), Pq(sb.b, -B.w, z), Pq(sb.a, -B.w, z));
        const sk = []; if (sb.gom) sk.push(1); if (i > 0) sk.push(5); if (i < subs.length - 1) sk.push(3); // hexa: 1 üst, 3 son uç, 5 baş uç
        hexa(out, c8, col, sk);
        if (sb.gom) fanFace(out, c8.slice(4), col, [0, 0, 1]); // döşemeye değen üst yüz: gövde kapalı (kesit sınırı kapanır) ama yan yüzlerle ortak kenar çizgisi yok
        // üst kenarlar: döşemeye gömülü kısımda yalnız döşeme kenarıyla aynı hizada olmayan yüzlerde (iç köşe çizgisi)
        const ucMu = s => sb.gom && mo.r.uc.some(u => Math.abs(u - s) < 1e-6);
        for (const yan of [1, -1]) { const ks = sb.gom ? mo.r.kenar.filter(k => k.yan === yan).map(k => [k.s0, k.s1]) : []; for (const [x0, x1] of C.insMono.cikar(sb.a, sb.b, ks)) out.edges3.push([Pq(x0, yan * B.w, sb.z), Pq(x1, yan * B.w, sb.z)]); }
        if (i === 0 && !ucMu(sb.a)) out.edges3.push([c8[4], c8[7]]); if (i === subs.length - 1 && !ucMu(sb.b)) out.edges3.push([c8[5], c8[6]]);
        if (i > 0 && subs[i - 1].z !== sb.z) { const zl = Math.min(subs[i - 1].z, sb.z), zh = Math.max(subs[i - 1].z, sb.z); out.edges3.push([Pq(sb.a, B.w, zl), Pq(sb.a, B.w, zh)], [Pq(sb.a, -B.w, zl), Pq(sb.a, -B.w, zh)]); }
      });
      // alt kenarlar ve uç düşey çizgileri (parça boyunca tek çizgi)
      const zA = subs[0].z, zB = subs[subs.length - 1].z;
      out.edges3.push([Pq(s0, B.w, B.zb), Pq(s1, B.w, B.zb)], [Pq(s0, -B.w, B.zb), Pq(s1, -B.w, B.zb)], [Pq(s0, B.w, B.zb), Pq(s0, -B.w, B.zb)], [Pq(s1, B.w, B.zb), Pq(s1, -B.w, B.zb)]);
      out.edges3.push([Pq(s0, B.w, B.zb), Pq(s0, B.w, zA)], [Pq(s0, -B.w, B.zb), Pq(s0, -B.w, zA)], [Pq(s1, B.w, B.zb), Pq(s1, B.w, zB)], [Pq(s1, -B.w, B.zb), Pq(s1, -B.w, zB)]);
    }
    return [out];
  };
  /* döşemenin altına gömülü kirişler: alt yüz kiriş izleri kadar açılır (sırt sırta yüz kalmaz), döşeme kenarıyla aynı hizadaki kiriş yüzünde alt kenar çizgisi silinir */
  const plakKirisleri = p => (C.doc && C.insMono ? C.doc.ents.filter(k => k.type === 'kiris' && C.lyLive(k.layer)).map(k => kirisMono(k)).filter(m => m && m.D === p) : []);
  const monoSlabFix = (p, out, pts, za, zt, ek) => {
    const KB = plakKirisleri(p); if (!KB.length) return out;
    const rects = [], kes = [];
    for (const m of KB) { const B = m.B, P = (s, o) => [B.a[0] + B.u[0] * s + B.nn[0] * o, B.a[1] + B.u[1] * s + B.nn[1] * o];
      for (const [s0, s1] of C.insMono.kesisim(B.pcs || [[0, B.Lb]], m.r.ivs)) rects.push([P(s0, -B.w), P(s1, -B.w), P(s1, B.w), P(s0, B.w)]);
      for (const kn of m.r.kenar) kes.push([P(kn.s0, kn.yan * B.w), P(kn.s1, kn.yan * B.w)]);
      for (const s of m.r.uc) kes.push([P(s, -B.w), P(s, B.w)]); }
    const onZ = v => Math.abs(v[2] - za) < 1e-6;
    out.f = out.f.filter(f => !f.every(i => onZ(out.v[i])));
    for (const R of polyMinusKolon(pts, za, zt, (ek || []).concat(rects))) {
      let r; try { r = C.earClipHoles(R.outer, R.holes.map(h => h.slice().reverse())); } catch (err) { try { r = { pts: R.outer, tris: C.earClip(R.outer) }; } catch (e2) { continue; } }
      const v0 = out.v.length; for (const q of r.pts) out.v.push([q[0], q[1], za]); for (const t of r.tris) out.f.push([v0 + t[0], v0 + t[2], v0 + t[1]]);
    }
    for (const q of rects) fanFace(out, q.map(v => [v[0], v[1], za]), null, [0, 0, -1]); // kiriş izi: alt yüz kapalı kalsın (kesit sınırı), kenarı döşeme yan yüzüyle ortak olmasın
    if (kes.length) { const E3 = []; for (const [a, b] of out.edges3) { if (!onZ(a) || !onZ(b)) { E3.push([a, b]); continue; } for (const [x, y] of C.insMono.parcaCikar(a, b, kes, 2e-3)) E3.push([[x[0], x[1], za], [y[0], y[1], za]]); } out.edges3 = E3; }
    return out;
  };
  const kirisVol = e => { const B = beamCuts(e); return (B.pcs ? B.pcs.reduce((s2, [x0, x1]) => s2 + x1 - x0, 0) : B.Lb) * (+e.bw || 0.3) * (+e.hb || 0.5); }; // kolon içi hariç (net boy)

  /* ---------- PLAK: radye temel / döşeme (çokgen) ---------- */
  T.plak = {
    label: 'Radye / döşeme', ifc: 'IfcSlab',
    prims: e => { const q = e.pts.map(p => [p[0], p[1], 0]), out = [P(q, true, { lw: e.kind === 'radye' ? 50 : 35, lt: e.kind === 'doseme' ? 'HIDDEN' : undefined })]; if (e.kind === 'doseme' && q.length >= 3) { out.push(L(q[0], q[2], { lw: 13, color: 8 })); if (q.length >= 4) out.push(L(q[1], q[3], { lw: 13, color: 8 })); } return out; },
    mesh: e => { let pts = e.pts.map(p2); if (M.polyArea(pts) < 0) pts = pts.reverse(); const zt = +e.zt || 0, za = zt - (+e.t || 0.3), kb = e.kind !== 'radye' && plakKirisleri(e).length > 0; if (!kb && !kolonsIn(za, zt).length) return [{ t: 'ext', o: [0, 0, za], ux: [1, 0, 0], uz: [0, 0, 1], prof: pts, h: +e.t || 0.3 }]; const m = slabMesh(pts, za, zt); return [kb ? monoSlabFix(e, m, pts, za, zt) : m]; },
    xf: (e, X) => { e.zt = (+e.zt || 0) + dzOf(X); e.pts = e.pts.map(q => X.p([q[0], q[1], 0]).slice(0, 2)); },
    snaps: e => e.pts.map(q => ({ p: [q[0], q[1], 0], k: 'end' })),
    info: e => `${e.kind === 'radye' ? 'Radye temel' : 'Döşeme'} · ${e.beton || 'C30/37'} · kalınlık ${M.fmt((+e.t || 0.3) * 100, 0)} cm · üst kot ${M.fmt(+e.zt || 0, 2)} · alan ${M.fmt(Math.abs(M.polyArea(e.pts.map(p2))), 2)} m² · hacim ${M.fmt(plakVol(e), 2)} m³`,
  };
  /* boşluklu döşeme / radye: düşey boşluklar 2B çokgen farkıyla (kolon çentikleriyle aynı yöntem) açılır — insaat-bosluk.js kullanır */
  C.insPlakDelikliAg = (e, ek) => { let pts = e.pts.map(p2); if (M.polyArea(pts) < 0) pts = pts.reverse(); const zt = +e.zt || 0, za = zt - (+e.t || 0.3), m = slabMesh(pts, za, zt, ek); return e.kind !== 'radye' ? monoSlabFix(e, m, pts, za, zt, ek) : m; };
  const plakVol = e => { const zt = +e.zt || 0, t = +e.t || 0.3; let q = e.pts.map(p2); if (M.polyArea(q) < 0) q = q.reverse(); return slabArea(q, zt - t, zt) * t; }; // kolon izleri hariç

  /* ---------- TEKİL TEMEL ---------- */
  T.temel = {
    label: 'Tekil temel', ifc: 'IfcFooting',
    prims: e => { const c = M.p3(e.p), bx = +e.bx || 1.5, by = +e.by || 1.5, cs = Math.cos((e.rot || 0) * RAD), sn = Math.sin((e.rot || 0) * RAD), W = (x, y) => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs, 0]; return [P([W(-bx / 2, -by / 2), W(bx / 2, -by / 2), W(bx / 2, by / 2), W(-bx / 2, by / 2)], true, { lw: 35, lt: 'HIDDEN' })]; },
    mesh: e => { const c = M.p3(e.p), bx = +e.bx || 1.5, by = +e.by || 1.5, zt = +e.zt || 0, zb = zt - (+e.t || 0.6), cs = Math.cos((e.rot || 0) * RAD), sn = Math.sin((e.rot || 0) * RAD), W = (x, y, z) => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs, z], out = newMesh(), c8 = []; for (const z of [zb, zt]) c8.push(W(-bx / 2, -by / 2, z), W(bx / 2, -by / 2, z), W(bx / 2, by / 2, z), W(-bx / 2, by / 2, z)); hexa(out, c8, MALZ.beton.col); edgeLoop(out, c8.slice(0, 4)); edgeLoop(out, c8.slice(4)); for (let i = 0; i < 4; i++) out.edges3.push([c8[i], c8[i + 4]]); return [out]; },
    xf: (e, X) => { e.zt = (+e.zt || 0) + dzOf(X); e.p = flat(X.p(flat(e.p))); const v = X.v([Math.cos((e.rot || 0) * RAD), Math.sin((e.rot || 0) * RAD), 0]); e.rot = Math.atan2(v[1], v[0]) / RAD; },
    snaps: e => { const c = M.p3(e.p), bx = +e.bx || 1.5, by = +e.by || 1.5, cs = Math.cos((e.rot || 0) * RAD), sn = Math.sin((e.rot || 0) * RAD), W = (x, y) => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs, 0]; return [{ p: c, k: 'cen' }, ...[W(-bx / 2, -by / 2), W(bx / 2, -by / 2), W(bx / 2, by / 2), W(-bx / 2, by / 2)].map(p => ({ p, k: 'end' }))]; },
    info: e => `Tekil temel ${M.fmt((+e.bx || 1.5) * 100, 0)}×${M.fmt((+e.by || 1.5) * 100, 0)}×${M.fmt((+e.t || 0.6) * 100, 0)} cm · ${e.beton || 'C30/37'} · üst kot ${M.fmt(+e.zt || 0, 2)} · hacim ${M.fmt((+e.bx || 1.5) * (+e.by || 1.5) * (+e.t || 0.6), 3)} m³`,
  };

  /* ---------- PENCERE / KAPI ---------- */
  const hostFrame = o => { const h = C.byId(o.host); if (!h || h.type !== 'perde') return null; const sf = segFrames(h).find(f => f.i === (o.seg || 0)); if (!sf) return null; return { h, sf, F: faceOffs(h) }; };
  T.acik = {
    label: 'Pencere / kapı', ifc: 'IfcWindow',
    prims: o => {
      const H = hostFrame(o); if (!H) return []; const { sf, F } = H, w = +o.w || 1, s0 = (+o.s || 0) - w / 2, s1 = (+o.s || 0) + w / 2, out = [];
      const Pp = (s, of) => [sf.a[0] + sf.u[0] * s + sf.nn[0] * of, sf.a[1] + sf.u[1] * s + sf.nn[1] * of, 0], mid = (F.lB + F.rB) / 2;
      if (o.kind === 'kapi') {
        const side = o.yon === 'R' ? F.rB : F.lB, sg = o.yon === 'R' ? -1 : 1, hinge = o.el === 'S' ? s1 : s0, other = o.el === 'S' ? s0 : s1;
        const leaves = o.kanat === 2 ? [[s0, (s0 + s1) / 2, 1], [s1, (s0 + s1) / 2, -1]] : [[hinge, other, hinge === s0 ? 1 : -1]];
        for (const [hs, os, dir] of leaves) { const lw = Math.abs(os - hs), pH = Pp(hs, side), tip = [pH[0] + sf.nn[0] * sg * lw, pH[1] + sf.nn[1] * sg * lw, 0]; out.push(L(pH, tip, { lw: 25 })); const a0 = Math.atan2(sf.u[1] * dir, sf.u[0] * dir), a1 = Math.atan2(sf.nn[1] * sg, sf.nn[0] * sg); let s = a0, e2 = a1; if (M.normAng(e2 - s) > Math.PI) { const t = s; s = e2; e2 = t; } out.push(A(pH, lw, s, e2, { lw: 13 })); }
      } else {
        for (const of of [F.lB, F.rB]) out.push(L(Pp(s0, of), Pp(s1, of), { lw: 18 }));
        for (const k of [-0.12, 0.12]) out.push(L(Pp(s0, mid + (F.lB - F.rB) * k), Pp(s1, mid + (F.lB - F.rB) * k), { lw: 13, color: 4 }));
      }
      return out;
    },
    mesh: o => {
      const H = hostFrame(o); if (!H) return []; const { h, sf, F } = H, w = +o.w || 1, s0 = (+o.s || 0) - w / 2, s1 = (+o.s || 0) + w / 2, z0 = (+h.z0 || 0) + (o.kind === 'kapi' ? 0 : (+o.par || 0.9)), z1 = z0 + (+o.hh || (o.kind === 'kapi' ? 2.1 : 1.4));
      const mid = (F.lB + F.rB) / 2, Pp = (s, of, z) => [sf.a[0] + sf.u[0] * s + sf.nn[0] * of, sf.a[1] + sf.u[1] * s + sf.nn[1] * of, z], out = newMesh();
      const box = (sa, sb, oa, ob, za, zb, col) => hexa(out, [Pp(sa, oa, za), Pp(sb, oa, za), Pp(sb, ob, za), Pp(sa, ob, za), Pp(sa, oa, zb), Pp(sb, oa, zb), Pp(sb, ob, zb), Pp(sa, ob, zb)], col);
      const fr = 0.06, ft = 0.07, WOOD = [0.55, 0.38, 0.22], ALU = [0.85, 0.86, 0.88];
      if (o.kind === 'kapi') { box(s0, s0 + fr, mid - ft, mid + ft, z0, z1, WOOD); box(s1 - fr, s1, mid - ft, mid + ft, z0, z1, WOOD); box(s0, s1, mid - ft, mid + ft, z1 - fr, z1, WOOD); box(s0 + fr, s1 - fr, mid - 0.02, mid + 0.02, z0, z1 - fr, [0.66, 0.48, 0.30]); }
      else { box(s0, s0 + fr, mid - ft, mid + ft, z0, z1, ALU); box(s1 - fr, s1, mid - ft, mid + ft, z0, z1, ALU); box(s0, s1, mid - ft, mid + ft, z0, z0 + fr, ALU); box(s0, s1, mid - ft, mid + ft, z1 - fr, z1, ALU); const g = newMesh(); hexa(g, [Pp(s0 + fr, mid - 0.006, z0 + fr), Pp(s1 - fr, mid - 0.006, z0 + fr), Pp(s1 - fr, mid + 0.006, z0 + fr), Pp(s0 + fr, mid + 0.006, z0 + fr), Pp(s0 + fr, mid - 0.006, z1 - fr), Pp(s1 - fr, mid - 0.006, z1 - fr), Pp(s1 - fr, mid + 0.006, z1 - fr), Pp(s0 + fr, mid + 0.006, z1 - fr)], [0.55, 0.75, 0.90]); g.al = 0.35; return [out, g]; }
      return [out];
    },
    xf: (o, X) => { }, // konumu barındıran perdeye göre
    snaps: o => { const H = hostFrame(o); if (!H) return []; const { sf } = H; return [{ p: [sf.a[0] + sf.u[0] * (+o.s || 0), sf.a[1] + sf.u[1] * (+o.s || 0), 0], k: 'mid' }]; },
    info: o => `${o.kind === 'kapi' ? (o.kanat === 2 ? 'Çift kanatlı kapı' : 'Kapı') : 'Pencere'} ${M.fmt((+o.w || 1) * 100, 0)}×${M.fmt((+o.hh || (o.kind === 'kapi' ? 2.1 : 1.4)) * 100, 0)} cm${o.kind === 'kapi' ? '' : ' · parapet ' + M.fmt((+o.par || 0.9) * 100, 0) + ' cm'}`,
  };

  /* boşluk değişince barındıran perde yeniden çizilsin */
  /* aynı anda gelen değişiklikleri tek seferde işle (yüzlerce nesne eklenince her biri için baştan tarama yapılmasın) */
  const coalesce = fn => { let p = false; return () => { if (p) return; p = true; Promise.resolve().then(() => { p = false; try { fn(); } catch (er) { console.error(er); } }); }; };
  let kolSig = ''; C.on('change', coalesce(() => { if (!C.doc) return; const ks = JSON.stringify(C.doc.ents.filter(k => k.type === 'kolon' || (k.type === 'perde' && (k.malz || 'beton') === 'beton' && !k.temel)).map(k => k.type === 'kolon' ? [k.id, k.p, k.b, k.d, k.D, k.sek, k.rot, k.z0, k.h, C.lyLive(k.layer)] : [k.id, k.pts, k.tb, k.tt, k.h, k.z0, k.hiza, k.ofs, k.egim, k.closed, C.lyLive(k.layer)])); if (ks !== kolSig) { kolSig = ks; for (const w of C.doc.ents) if (w.type === 'perde' || w.type === 'plak' || w.type === 'kiris') delete w._c; } }));
  /* kiriş + döşeme tek parça: biri değişince ikisinin de görünümü yeniden hesaplansın */
  let kdSig = ''; C.on('change', coalesce(() => { if (!C.doc) return; const ks = JSON.stringify(C.doc.ents.filter(k => k.type === 'kiris' || (k.type === 'plak' && k.kind !== 'radye')).map(k => k.type === 'kiris' ? [k.id, k.a, k.b, k.bw, k.hb, k.zt, k.hiza, k.monolit, C.lyLive(k.layer)] : [k.id, k.pts, k.zt, k.t, k.kind, k.monolit, C.lyLive(k.layer), C.entColor ? C.entColor(k) : 0])); if (ks !== kdSig) { kdSig = ks; for (const w of C.doc.ents) if (w.type === 'plak' || w.type === 'kiris') delete w._c; } }));
  C.on('change', coalesce(() => { if (!C.doc) return; const sig = {}; for (const o of C.doc.ents) if (o.type === 'acik') (sig[o.host] = sig[o.host] || []).push([o.seg, o.s, o.w, o.hh, o.par, o.kind, o.kanat, o.yon, o.el, o.lento, o.lb, o.lh].join(',')); for (const e of C.doc.ents) if (e.type === 'perde') { const s = (sig[e.id] || []).join('|'); if (e._osig !== s) { e._osig = s; delete e._c; } } for (const o of C.doc.ents) if (o.type === 'acik') delete o._c; }));

  /* ---------- ayar penceresi ---------- */
  const dialog = (title, fields, vals, okTxt) => new Promise(res => {
    const one = f => { const v = vals[f.k] != null ? vals[f.k] : f.d; if (f.cb) return `<div class="fld" style="display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0"><label style="flex:1;min-width:0">${f.t}</label><input style="width:auto;flex:none" data-k="${f.k}" type="checkbox" ${v === 'E' ? 'checked' : ''}></div>`; if (f.opts) return `<div class="fld" style="display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0"><label style="flex:1;min-width:0">${f.t}</label><select style="width:170px;flex:none" data-k="${f.k}">${f.opts.map(o => { const [ov, ot] = Array.isArray(o) ? o : [o, o]; return `<option value="${ov}" ${String(ov) === String(v) ? 'selected' : ''}>${ot}</option>`; }).join('')}</select></div>`; return `<div class="fld" style="display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0"><label style="flex:1;min-width:0">${f.t}</label><input style="width:90px;flex:none" data-k="${f.k}" type="text" inputmode="decimal" value="${v}"></div>`; };
    const tabs = [...new Set(fields.map(f => f.tab || 'Genel'))], grid = fs => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:4px 22px">${fs.map(one).join('')}</div>`;
    const html = tabs.length < 2 ? grid(fields) : `<div class="instabs" role="tablist" style="display:flex;gap:4px;border-bottom:1px solid var(--line,#3a4250);margin-bottom:8px">${tabs.map((t, i) => `<button type="button" role="tab" data-tab="${i}" class="${i ? '' : 'on'}" style="border-radius:6px 6px 0 0">${t}</button>`).join('')}</div>${tabs.map((t, i) => `<div data-tabp="${i}" style="${i ? 'display:none' : ''}">${grid(fields.filter(f => (f.tab || 'Genel') === t))}${(fields.find(f => (f.tab || 'Genel') === t && f.tabHint) || {}).tabHint ? `<p class="hint">${fields.find(f => (f.tab || 'Genel') === t && f.tabHint).tabHint}</p>` : ''}</div>`).join('')}`;
    const b = C.modal(title, `${html}<p class="hint" id="insHint"></p><div class="bar" style="justify-content:flex-end"><button id="insCancel">İptal</button><button id="insOk" class="pri">${okTxt || 'Çiz'}</button></div>`);
    const read = () => { const o = {}; b.querySelectorAll('[data-k]').forEach(inp => { const f = fields.find(x => x.k === inp.dataset.k); o[inp.dataset.k] = f.cb ? (inp.checked ? 'E' : 'H') : f.opts || f.s ? inp.value : num(inp.value, f.d); }); return o; };
    b.querySelectorAll('[data-k]').forEach(inp => inp.onchange = () => { const f = fields.find(x => x.k === inp.dataset.k); if (f.onch) f.onch(inp.value, b); });
    b.querySelectorAll('[data-tab]').forEach(t => t.onclick = () => { b.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === t)); b.querySelectorAll('[data-tabp]').forEach(pn => { pn.style.display = pn.dataset.tabp === t.dataset.tab ? '' : 'none'; }); });
    let done = false; const fin = v => { if (done) return; done = true; clearInterval(tm); C.closeModal(); res(v); };
    b.querySelector('#insOk').onclick = () => fin(read()); b.querySelector('#insCancel').onclick = () => fin(null);
    const tm = setInterval(() => { if (document.querySelector('#modal').classList.contains('hidden')) fin(null); }, 300);
    setTimeout(() => { const f = b.querySelector('[data-k]'); if (f) f.focus(); }, 30);
  });
  /* betikte ANAHTAR=değer, değilse pencere */
  const getParams = async (title, fields, key) => {
    const kv = {}; E.queue = E.queue.filter(t => { const m = /^([A-Za-zİıÜüŞşÇçĞğÖö][A-Za-z0-9İıÜüŞşÇçĞğÖö]*)=(.*)$/.exec(t); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; });
    const s = set(), base = Object.assign({}, s[key] || {});
    for (const f of fields) { const k = C.up(f.k), al = (f.al || []).map(C.up); for (const kk of [k, ...al]) if (kv[kk] != null) base[f.k] = f.cb ? (/^(E|EVET|1|VAR|TRUE|ON)$/i.test(String(kv[kk]).trim()) ? 'E' : 'H') : f.opts ? (f.opts.map(o => Array.isArray(o) ? o[0] : o).find(o => C.up(String(o)) === C.up(kv[kk])) || kv[kk]) : f.s ? kv[kk] : num(kv[kk], f.d); }
    let r;
    if (E.scriptMode || Object.keys(kv).length) { r = {}; for (const f of fields) r[f.k] = base[f.k] != null ? base[f.k] : f.d; }
    else r = await dialog(title, fields, base);
    if (r) { s[key] = Object.assign({}, r); saveSet(); }
    return r;
  };
  const cm = v => v / 100;
  /* nokta zinciri (Enter bitir, K kapat, G geri al) */
  /* seviye: tıklanan noktanın kotu (3B'de yüzeyden) üst ya da alt kabul edilir */
  const levelOf = (r, pts) => { if (r.ref === 'SVU' || r.ref === 'SVA') { const a = C.svAktif && C.svAktif(), z = a ? +a.z || 0 : 0; return +(r.ref === 'SVA' ? z + cm(r.t) : z).toFixed(4); } const z = pts.reduce((m, q) => m + (q[2] || 0), 0) / pts.length; return r.ref === 'UST' ? +z.toFixed(4) : r.ref === 'ALT' ? +(z + cm(r.t)).toFixed(4) : r.zt; };
  const pickPath = async (I, prev) => {
    const pts = []; let closed = false;
    for (; ;) {
      E.base = pts.length ? pts[pts.length - 1] : null; E.preview = pts.length ? (c => prev(pts.concat([c]), false)) : null;
      const r = await E.ask('pt', pts.length ? 'Sonraki nokta (Enter bitir)' : 'Başlangıç noktası', { kw: pts.length >= 2 ? [['K', 'Kapat'], ['G', 'Geri al']] : pts.length ? [['G', 'Geri al']] : [] });
      if (r === 'K' || r === 'C') { closed = true; break; } if (r === 'G') { pts.pop(); continue; }
      if (!Array.isArray(r)) break;
      if (!C._noAutoClose && pts.length >= 2 && M.dist2(r, pts[0]) < Math.max(0.01, 6 / ((C.views && C.views.plan && C.views.plan.s) || 100))) { closed = true; C.log('Başlangıç noktasına dönüldü: çizgi kapatıldı (köşe gönyeli birleşir).'); break; }
      pts.push(M.p3(r));
    }
    if (!closed && pts.length > 3 && M.dist2(pts[0], pts[pts.length - 1]) < 0.05) { pts.pop(); closed = true; C.log('Son nokta başlangıca çok yakın: çizgi kapatıldı, köşe gönyeli birleşti.'); }
    E.preview = null; E.base = null; return { pts, closed };
  };

  /* ---------- ÖLÇÜYLE ÇİZİM: ayar penceresine girilen ölçülerle eleman aktif seviyede doğrudan çizilir ----------
     tur: 'alan' (radye / döşeme: X × Y dikdörtgen), 'hat' (perde / sürekli temel: Y=0 düz hat, Y>0 kapalı dikdörtgen),
          'kiris' (boy + açı), 'nokta' (kolon / tekil temel). Yerleşim: girilen X,Y (sol alt köşe / başlangıç) ya da tek tık. */
  const zSv = () => { const a = C.svAktif && C.svAktif(); return a ? +a.z || 0 : 0; };
  const svAd = () => { const a = C.svAktif && C.svAktif(); return a ? `${a.ad} ${C.svFmt ? C.svFmt(+a.z || 0) : a.z}` : 'kot 0'; };
  const OLF = tur => [
    { k: 'cizim', t: 'Çizim şekli', opts: tur === 'nokta' ? [['TIK', 'Tıklayarak yerleştir (art arda)'], ['XY', 'Girdiğim X, Y noktasına koy']] : [['YER', 'Ölçülerle YERLEŞTİR — imleçte, tıkla (art arda)'], ['TIK', 'Noktaları tıklayarak ÇİZ'], ['XY', 'Ölçülerle girdiğim X, Y noktasına çiz']], d: 'TIK', al: ['CIZIM'] },
    ...(tur === 'alan' || tur === 'hat' ? [{ k: 'lx', t: tur === 'hat' ? 'Ölçü: boy / X kenarı (cm)' : 'Ölçü: X kenarı (cm)', d: 1000, al: ['LX'] }, { k: 'ly', t: tur === 'hat' ? 'Ölçü: Y kenarı (cm; 0 = düz hat, >0 = kapalı dikdörtgen)' : 'Ölçü: Y kenarı (cm)', d: tur === 'hat' ? 0 : 500, al: ['LY'] }] : []),
    ...(tur === 'kiris' ? [{ k: 'lx', t: 'Ölçü: kiriş boyu (cm)', d: 500, al: ['LX'] }] : []),
    ...(tur !== 'nokta' ? [{ k: 'aci', t: 'Ölçü: açı (°, X ekseninden)', d: 0, al: ['ACI'] }] : []),
    ...(tur === 'alan' || tur === 'hat' ? [{ k: 'tut', t: 'Ölçü: tutma noktası (yerleştirirken)', opts: [['SA', 'Sol alt köşe'], ['M', 'Merkez'], ['SGA', 'Sağ alt köşe'], ['SU', 'Sol üst köşe'], ['SGU', 'Sağ üst köşe']], d: 'SA', al: ['TUT'] }] : []),
    { k: 'x0', t: 'Ölçü: X (m)', d: 0, al: ['X0'] }, { k: 'y0', t: 'Ölçü: Y (m)', d: 0, al: ['Y0'] },
  ];
  const olcuMu = r => r && (r.cizim === 'YER' || r.cizim === 'XY' || r.cizim === 'OLCU') && !(E.scriptMode && E.queue && E.queue.length);
  const olcuSekil = (r, tur, b) => { // b: başlangıç (sol alt köşe) → { pts, closed }
    const a = (+r.aci || 0) * RAD, u = [Math.cos(a), Math.sin(a)], v = [-u[1], u[0]], X = cm(+r.lx || 0), Y = tur === 'kiris' ? 0 : cm(+r.ly || 0), z = zSv();
    const tx = { SA: [0, 0], M: [0.5, 0.5], SGA: [1, 0], SU: [0, 1], SGU: [1, 1] }[r.cizim === 'YER' ? r.tut || 'SA' : 'SA'] || [0, 0], ox = -tx[0] * X, oy = -tx[1] * Y;
    const Q = (x, y) => [b[0] + u[0] * (x + ox) + v[0] * (y + oy), b[1] + u[1] * (x + ox) + v[1] * (y + oy), z];
    if (tur === 'nokta') return { pts: [[b[0], b[1], z]], closed: false };
    if (Y > 1e-6) return { pts: [Q(0, 0), Q(X, 0), Q(X, Y), Q(0, Y)], closed: true };
    return { pts: [Q(0, 0), Q(X, 0)], closed: false };
  };
  // ölçü modunda şekli üretir (XY: hemen; TIK: önizlemeyle tek tık), değilse eski nokta zinciri
  const yol = async (I, r, tur, prev) => {
    if (!olcuMu(r)) return pickPath(I, prev);
    if (tur !== 'nokta' && !(+r.lx > 0)) { C.warn('Ölçüyle çizim için boy / X kenarı girin.'); return { pts: [], closed: false }; }
    if (tur === 'alan' && !(+r.ly > 0)) { C.warn('Ölçüyle çizim için Y kenarı girin.'); return { pts: [], closed: false }; }
    if (r.cizim === 'YER') { // tekil temel gibi: şekil imleçte, tıkla → yerleşir; komut aynı ayarlarla tekrar başlar (Enter / Esc bitirir)
      E.preview = c => { const sh = olcuSekil(r, tur, c); return prev ? prev(sh.pts, sh.closed) : []; };
      const p = await I.pt(`Yerleştir — tıklayın (Enter bitir) · aktif seviye ${svAd()}`); E.preview = null;
      if (!p || typeof p === 'string') return { pts: [], closed: false };
      const ad = E.lastCmd; if (ad && !E.scriptMode) { const bekle = (n = 0) => { if (E.running) { if (n < 400) setTimeout(() => bekle(n + 1), 50); return; } C.cmd.run(ad + ' CIZIM=YER'); }; setTimeout(bekle, 30); }
      return olcuSekil(r, tur, p);
    }
    const sh = olcuSekil(r, tur, [+r.x0 || 0, +r.y0 || 0]); C.log(`Ölçüyle çizildi: ${tur === 'nokta' ? '' : `${M.fmt(+r.lx || 0, 0)}${sh.closed ? ' × ' + M.fmt(+r.ly || 0, 0) : ''} cm, `}başlangıç (${M.fmt(+r.x0 || 0, 2)}, ${M.fmt(+r.y0 || 0, 2)}), aktif seviye ${svAd()}.`); return sh;
  };
  const SVREF = [['SVU', 'Aktif seviye = elemanın ÜST yüzü'], ['SVA', 'Aktif seviye = elemanın ALT yüzü']];

  /* ---------- PERDE ---------- */
  const PERDE_TIP = [['p25', 'Perde 25 cm'], ['p30', 'Perde 30 cm'], ['p40', 'Perde 40 cm'], ['ist', 'İstinat perdesi (alt 80 / üst 30)'], ['ozel', 'Özel']];
  const perdeFields = mal => [
    ...(mal === 'beton' ? [{ k: 'tip', t: 'Hazır tip', opts: PERDE_TIP, d: 'p30', onch: (v, b) => { const m = { p25: [25, 25], p30: [30, 30], p40: [40, 40], ist: [80, 30] }[v]; if (m) { b.querySelector('[data-k=tb]').value = m[0]; b.querySelector('[data-k=tt]').value = m[1]; if (v === 'ist') b.querySelector('[data-k=egim]').value = 'R'; } } }] : [{ k: 'malz', t: 'Malzeme', opts: [['tugla', 'Tuğla'], ['gazbeton', 'Gazbeton'], ['briket', 'Briket']], d: 'tugla' }]),
    { k: 'tb', t: 'Alt kalınlık (cm)', d: mal === 'beton' ? 30 : 19, al: ['ALT', 'K'] }, { k: 'tt', t: 'Üst kalınlık (cm) — farklıysa yüz eğimli', d: mal === 'beton' ? 30 : 19, al: ['UST', 'ÜST'] },
    { k: 'egim', t: 'Eğimli yüz (alt ≠ üst ise)', opts: [['R', 'Sağ yüz eğimli'], ['L', 'Sol yüz eğimli'], ['B', 'İki yüz (ortadan)']], d: 'R', al: ['EGIM', 'EĞİM'] },
    { k: 'hiza', t: 'Çizim hizası (çizilen çizgi)', opts: [['DIS', 'Dış yüz (kapalıda perde içeride)'], ['IC', 'İç yüz (kapalıda perde dışarıda)'], ['O', 'Orta'], ['L', 'Sol yüz'], ['R', 'Sağ yüz']], d: 'O', al: ['HIZA'] },
    { k: 'ofs', t: 'Çizgiden içeri öteleme (cm) — kapalıda şeklin içine', d: 0, al: ['OTELE', 'OFS'] },
    { k: 'zoto', t: 'Alt kot', opts: [['OTO', 'Otomatik: altındaki döşeme / perde / temel üstü'], ['EL', 'Girdiğim değer'], ['SV', 'Aktif seviye']], d: mal === 'beton' ? 'EL' : 'OTO', al: ['ZOTO'] }, { k: 'z0', t: 'Alt kot (m) — elle', d: 0, al: ['Z', 'KOT'] },
    { k: 'hoto', t: 'Yükseklik', opts: [['OTO', 'Otomatik: üstteki döşeme / kiriş altına kadar'], ['EL', 'Girdiğim değer']], d: mal === 'beton' ? 'EL' : 'OTO', al: ['HOTO'] }, { k: 'h', t: 'Yükseklik (m) — elle / üstte eleman yoksa', d: mal === 'beton' ? 4 : 3, al: ['H', 'Y'] },
    ...(mal === 'beton' ? [{ k: 'beton', t: 'Beton sınıfı', opts: BETON, d: 'C30/37', al: ['BETON', 'C'] },
      { k: 'bant', t: 'Su tutucu bant (PVC I tipi, perde boyunca)', cb: true, d: 'H', al: ['BANT', 'SUTUTUCU'] },
      { k: 'bantw', t: 'Bant ölçüsü (genişlik / kalınlık)', opts: [['15', '15/5'], ['20', '20/5'], ['25', '25/5'], ['32', '32/5']], d: '20', al: ['BANTW'] },
      { k: 'bantyer', t: 'Bant yeri', opts: [['ALT', 'Bant alt ucu temel üst kotunda'], ['EKSEN', 'Bant ekseni temelden yukarıda (aşağıdaki cm)']], d: 'ALT', al: ['BANTYER'] },
      { k: 'bantz', t: 'Bant ekseni — temel üstünden yukarı (cm)', d: 10, al: ['BANTZ'] }] : []),
  ];
  const perdeCmd = mal => async (I) => {
    const r = await getParams(mal === 'beton' ? 'Perde (betonarme) — ayarlar' : 'Duvar — ayarlar', perdeFields(mal).concat(OLF('hat')), mal === 'beton' ? 'perde' : 'duvar'); if (!r) return; if (r.zoto === 'SV') r.z0 = zSv();
    const props = { tb: cm(r.tb), tt: cm(r.tt), egim: r.egim, hiza: r.hiza, ofs: cm(r.ofs || 0), h: r.h, z0: r.z0, malz: mal === 'beton' ? 'beton' : r.malz, beton: r.beton, layer: lay(mal === 'beton' ? 'perde' : 'duvar') };
    C.log(`${mal === 'beton' ? 'Perde' : 'Duvar'}: alt ${r.tb} / üst ${r.tt} cm${r.ofs ? ` · çizgiden ${r.ofs} cm içeri` : ''} · h=${r.h} m · alt kot ${r.z0}${r.beton ? ' · ' + r.beton : ''}. Noktaları tıklayın (K = kapat, G = geri al, Enter = bitir).`);
    const { pts, closed } = await yol(I, r, 'hat', (q, cl) => C.prims(Object.assign({ type: 'perde', id: -1, pts: q.map(p2), closed: cl }, props)));
    if (pts.length < 2) return;
    if (r.zoto === 'OTO' || r.hoto === 'OTO') { // seviyeler: altındaki elemanın üstü / üstteki elemanın altı
      const zref = pts.some(q => Math.abs(q[2] || 0) > 1e-6) ? Math.max(...pts.map(q => q[2] || 0)) : Infinity;
      const smp = []; for (let i = 0; i + 1 < pts.length; i++) smp.push(M.lerp(pts[i], pts[i + 1], 0.5)); if (closed) smp.push(M.lerp(pts[pts.length - 1], pts[0], 0.5));
      const lvlAt = q => { if (isFinite(zref)) return supportTop(q, zref); let z = Infinity, first = null; for (let k = 0; k < 12; k++) { const l = supportTop(q, z); if (l == null) break; if (first == null) first = l; if (ceilingAt(q, l) != null) return l; z = l - 0.05; } return first; }; // planda: üstü kapalı en üst kat tabanı
      const tops = smp.map(lvlAt).filter(v => v != null).sort((a, b) => a - b);
      if (r.zoto === 'OTO') { if (tops.length) { props.z0 = +tops[Math.floor(tops.length / 2)].toFixed(4); } else C.log('Altında döşeme / perde / temel bulunamadı: girdiğiniz alt kot kullanıldı.'); }
      if (r.hoto === 'OTO') { const cs = smp.map(q => ceilingAt(q, props.z0)).filter(v => v != null).sort((a, b) => a - b); if (cs.length) props.h = +(cs[0] - props.z0).toFixed(4); else C.log('Üstünde döşeme / kiriş bulunamadı: girdiğiniz yükseklik kullanıldı.'); }
    }
    const e = C.add(C.newEnt('perde', Object.assign({ pts: pts.map(p2), closed: closed && pts.length > 2 }, props))); delete e.sp;
    C.log(`${T.perde.info(e)}${r.zoto === 'OTO' ? ' · alt kot otomatik' : ''}${r.hoto === 'OTO' ? ' · yükseklik otomatik' : ''}`);
    if (mal === 'beton' && r.bant === 'E' && C.addPerdeBant) { const bw = +r.bantw || 20, alt = r.bantyer !== 'EKSEN', dz = alt ? cm(bw) / 2 : cm(r.bantz != null ? +r.bantz : 10);
      // döküm derzi bant merkezinde: altındaki kısım (ayak / kicker) temelle birlikte, üstü ayrı perde
      let b = null; const zJ = +e.z0 || 0;
      if (dz > 0.005 && dz < (+e.h || 3) - 0.05) {
        const mid = segFrames(e)[0], q = mid ? [(mid.a[0] + mid.b[0]) / 2, (mid.a[1] + mid.b[1]) / 2] : p2(pts[0]);
        const sup = C.doc.ents.find(x => C.lyLive(x.layer) && ((x.type === 'plak' && C.pointInPoly(q, x.pts) && Math.abs((+x.zt || 0) - zJ) < 0.03) || (x.type === 'perde' && x !== e && x.temel && Math.abs((+x.z0 || 0) + (+x.h || 0) - zJ) < 0.03) || (x.type === 'temel' && Math.abs((+x.zt || 0) - zJ) < 0.03)));
        e.z0 = +(zJ + dz).toFixed(4); e.h = +((+e.h || 3) - dz).toFixed(4); delete e._c;
        const k = C.add(C.newEnt('perde', { pts: e.pts.map(p => p.slice()), closed: e.closed, tb: e.tb, tt: e.tb, egim: e.egim, hiza: e.hiza, ofs: e.ofs, malz: 'beton', beton: e.beton, z0: zJ, h: +dz.toFixed(4), kicker: true, kOf: e.id, kh: +dz.toFixed(4), kLay: sup ? sup.layer : null, ad: 'Perde ayağı (temelle birlikte dökülür)', layer: sup ? sup.layer : e.layer })); delete k.sp;
        b = C.addPerdeBant(e, 0, { w: bw, t: 5 });
        C.log(`Perde döküm derzi bant merkezinde (kot ${M.fmt(+e.z0, 2)}): alttaki ${M.fmt(dz * 100, 0)} cm perde ayağı ${sup ? 'temelle birleşik (' + sup.layer + ')' : '(altında temel bulunamadı)'}, üstü ayrı perde (h=${M.fmt(+e.h, 2)} m).`);
      } else b = C.addPerdeBant(e, dz, { w: bw, t: 5 }); if (b) C.log(`Su tutucu bant: PVC I tipi ${bw}/5 · perde boyunca · ${alt ? `alt ucu temel üst kotunda (${M.fmt(+e.z0 || 0, 2)}), üst ucu ${M.fmt((+e.z0 || 0) + cm(bw), 2)}` : `ekseni temel üstünden ${M.fmt(dz * 100, 0)} cm yukarıda (kot ${M.fmt(b.z, 2)})`} · INS_SU_TUTUCU_BANT katmanı.`); }
  };
  /* noktanın altındaki taşıyıcı elemanların en üst kotu (zref altında) */
  const inBand = (e, q) => { const F = faceOffs(e); for (const sf of segFrames(e)) { const s2 = (q[0] - sf.a[0]) * sf.u[0] + (q[1] - sf.a[1]) * sf.u[1], o = (q[0] - sf.a[0]) * sf.nn[0] + (q[1] - sf.a[1]) * sf.nn[1]; if (s2 >= -0.02 && s2 <= sf.L + 0.02 && o <= Math.max(F.lB, F.lT) + 0.02 && o >= Math.min(F.rB, F.rT) - 0.02) return true; } return false; };
  const supportTop = (q, zref) => {
    let best = null; const take = z => { if (z <= zref + 0.02 && (best == null || z > best)) best = z; };
    for (const x of C.doc.ents) {
      if (!C.lyLive(x.layer)) continue;
      if (x.type === 'plak' && C.pointInPoly(q, x.pts)) take(+x.zt || 0);
      else if (x.type === 'perde' && (x.malz || 'beton') === 'beton' && inBand(x, q)) take((+x.z0 || 0) + (+x.h || 3));
      else if (x.type === 'kiris') { const [a, b] = kAxis(x), u = M.norm(M.sub(b, a)), sl = (q[0] - a[0]) * u[0] + (q[1] - a[1]) * u[1], o = Math.abs(-(q[0] - a[0]) * u[1] + (q[1] - a[1]) * u[0]); if (sl >= 0 && sl <= M.dist2(a, b) && o <= (+x.bw || 0.3) / 2 + 0.02) take(+x.zt || 0); }
      else if (x.type === 'temel') { const c = M.p3(x.p), r = (x.rot || 0) * RAD, dx = q[0] - c[0], dy = q[1] - c[1], lx = dx * Math.cos(-r) - dy * Math.sin(-r), ly = dx * Math.sin(-r) + dy * Math.cos(-r); if (Math.abs(lx) <= (+x.bx || 1.5) / 2 && Math.abs(ly) <= (+x.by || 1.5) / 2) take(+x.zt || 0); }
    }
    return best;
  };
  /* noktanın üstündeki ilk döşeme / kiriş alt kotu */
  const ceilingAt = (q, z0) => {
    let best = null; const take = z => { if (z > z0 + 0.1 && (best == null || z < best)) best = z; };
    for (const x of C.doc.ents) {
      if (!C.lyLive(x.layer)) continue;
      if (x.type === 'plak' && C.pointInPoly(q, x.pts)) take((+x.zt || 0) - (+x.t || 0.3));
      else if (x.type === 'kiris') { const [a, b] = kAxis(x), u = M.norm(M.sub(b, a)), sl = (q[0] - a[0]) * u[0] + (q[1] - a[1]) * u[1], o = Math.abs(-(q[0] - a[0]) * u[1] + (q[1] - a[1]) * u[0]); if (sl >= 0 && sl <= M.dist2(a, b) && o <= (+x.bw || 0.3) / 2 + 0.05) take((+x.zt || 0) - (+x.hb || 0.5)); }
    }
    return best;
  };
  /* eski çizimler: su tutucu bantlı ama ayağı (kicker) olmayan perde → derz bant ekseninde olsun (alt kısım temelle birlikte dökülür) */
  C.perdeKickerUpgrade = () => { if (!C.doc) return 0; let n = 0;
    for (const e of C.doc.ents.slice()) { if (e.type !== 'perde' || e.kicker || e.temel || (e.malz || 'beton') !== 'beton') continue; if (C.doc.ents.some(k => k.type === 'perde' && k.kicker && k.kOf === e.id)) continue;
      const b = C.doc.ents.find(x => x.type === 'yalitim' && x.kind === 'bant' && x.auto && x.host === e.id); if (!b) continue; const dz = +b.dz || 0; if (!(dz > 0.005 && dz < (+e.h || 3) - 0.05)) continue;
      const zJ = +e.z0 || 0; e.z0 = +(zJ + dz).toFixed(4); e.h = +((+e.h || 3) - dz).toFixed(4); b.dz = 0; delete e._c; delete b._c;
      const k = C.add(C.newEnt('perde', { pts: e.pts.map(p => p.slice()), closed: e.closed, tb: e.tb, tt: e.tb, egim: e.egim, hiza: e.hiza, ofs: e.ofs, malz: 'beton', beton: e.beton, z0: zJ, h: +dz.toFixed(4), kicker: true, kOf: e.id, kh: +dz.toFixed(4), kLay: null, ad: 'Perde ayağı (temelle birlikte dökülür)', layer: e.layer })); delete k.sp; n++; }
    if (n) { C.changed(); C.log(`${n} perdede su tutucu bant derzi bant eksenine alındı: bandın altındaki ayak temelle birlikte dökülür (kesitte temel taramasıyla gösterilir).`); } return n; };
  C.on('doc', () => setTimeout(() => { try { C.perdeKickerUpgrade(); } catch (er) { console.error(er); } }, 0));
  C.addCommand(['BANTDERZ', 'PERDEAYAK'], 'Su tutucu bantlı perdelerde döküm derzini bant eksenine alır: bandın altındaki perde ayağı temelle birlikte dökülür (eski çizimler için; açılışta kendiliğinden yapılır).', async () => { const n = C.perdeKickerUpgrade(); if (!n) C.log('Düzeltilecek perde yok (bantlı perdelerin derzi zaten bant ekseninde).'); });
  /* perde ayağı (kicker): üstündeki perdeyle aynı plan geometrisini izler, perde silinince o da silinir */
  C.on('change', () => { if (!C.doc) return; for (const k of C.doc.ents) { if (k.type !== 'perde' || !k.kicker || !k.kOf) continue; const u = C.byId(k.kOf); if (!u || u.type !== 'perde') continue;
    const want = { pts: u.pts, closed: !!u.closed, tb: u.tb, tt: u.tb, egim: u.egim, hiza: u.hiza, ofs: u.ofs, z0: +((+u.z0 || 0) - (+k.kh || 0)).toFixed(4), h: +k.kh || 0.1 };
    let ch = false; for (const [kk, v] of Object.entries(want)) if (JSON.stringify(k[kk]) !== JSON.stringify(v)) { k[kk] = kk === 'pts' ? v.map(p => p.slice()) : v; ch = true; } if (ch) delete k._c; } });
  { const rm0 = C.remove; C.remove = function (list) { const ids = new Set((list || []).filter(e => e && e.type === 'perde' && !e.kicker).map(e => e.id)); if (ids.size) list = list.concat(C.doc.ents.filter(k => k.type === 'perde' && k.kicker && ids.has(k.kOf) && !list.includes(k))); return rm0.call(this, list); }; }
  C.addCommand(['PERDE', 'SHEARWALL', 'ISTINAT'], 'Betonarme perde / istinat perdesi: ayar penceresinde alt ve üst kalınlık (eğimli perde, ör. alt 80 üst 30), eğimli yüz, hiza, yükseklik, alt kot, beton sınıfı; sonra çizgi gibi noktaları tıklayın. Betikte: PERDE ALT=80 UST=30 H=4 Z=0 BETON=C30/37 EGIM=R HIZA=O x,y x,y …', perdeCmd('beton'));
  C.addCommand(['IDUVAR', 'TUGLADUVAR', 'BOLMEDUVAR'], 'Duvar (tuğla / gazbeton / briket): kalınlık, yükseklik, alt kot; noktaları tıklayın. Pencere ve kapı yerleştirilebilir.', perdeCmd('duvar'));

  /* ---------- KOLON ---------- */
  /* kolon yerleşim noktası: M merkez, köşeler SA/SGA/SGU/SU, kenar ortaları AO/UO/SO/SGO; OTO = tıklanan nokta bir döşeme / temel / kapalı çizgi köşesiyse kolon o köşenin içine oturur */
  const KBASE = { M: [0, 0], SA: [-1, -1], SGA: [1, -1], SGU: [1, 1], SU: [-1, 1], AO: [0, -1], UO: [0, 1], SO: [-1, 0], SGO: [1, 0] };
  const KBN = { OTO: 'Otomatik (köşeye oturt)', M: 'Merkez', SA: 'Sol alt köşe', SGA: 'Sağ alt köşe', SGU: 'Sağ üst köşe', SU: 'Sol üst köşe', AO: 'Alt kenar ortası', UO: 'Üst kenar ortası', SO: 'Sol kenar ortası', SGO: 'Sağ kenar ortası' };
  const hostPolys = () => { const out = []; for (const x of C.doc.ents) { if (!C.lyLive(x.layer)) continue; if (x.type === 'plak') out.push(x.pts.map(p2)); else if (x.type === 'temel') { const c = M.p3(x.p), bx = +x.bx || 1.5, by = +x.by || 1.5, cs = Math.cos((x.rot || 0) * RAD), sn = Math.sin((x.rot || 0) * RAD), W = (u, v) => [c[0] + u * cs - v * sn, c[1] + u * sn + v * cs]; out.push([W(-bx / 2, -by / 2), W(bx / 2, -by / 2), W(bx / 2, by / 2), W(-bx / 2, by / 2)]); } else if ((x.type === 'pline' || x.type === 'lwpoly') && x.closed && x.pts && x.pts.length > 2) out.push(x.pts.map(p2)); else if (x.type === 'perde' && x.closed) { const F = faceOffs(x); for (const o of [F.lB, F.rB]) out.push(segFrames(x).map(sf => [sf.a[0] + sf.u[0] * sf.k0 * o + sf.nn[0] * o, sf.a[1] + sf.u[1] * sf.k0 * o + sf.nn[1] * o])); } } return out; };
  const kolonPlace = (p, props, base) => {
    const hw = props.sek === 'D' ? props.D / 2 : props.b / 2, hd = props.sek === 'D' ? props.D / 2 : props.d / 2;
    const at = (bx, by, rot) => { const cs = Math.cos(rot * RAD), sn = Math.sin(rot * RAD), dx = -bx * hw, dy = -by * hd; return { c: [p[0] + dx * cs - dy * sn, p[1] + dx * sn + dy * cs, p[2] || 0], rot }; };
    if (base !== 'OTO') return at(...(KBASE[base] || [0, 0]), props.rot || 0);
    const tol = 0.02;
    for (const q of hostPolys()) for (let i = 0; i < q.length; i++) {
      if (Math.hypot(q[i][0] - p[0], q[i][1] - p[1]) > tol) continue;
      const nx = q[(i + 1) % q.length], rot0 = props.rot || ((Math.atan2(nx[1] - q[i][1], nx[0] - q[i][0]) / RAD) % 90 + 90) % 90, rot = Math.abs(rot0 - 90) < 1e-6 ? 0 : rot0;
      const pp = [q[i][0], q[i][1], p[2] || 0], cs = Math.cos(rot * RAD), sn = Math.sin(rot * RAD); let best = null;
      for (const k of ['SA', 'SGA', 'SGU', 'SU']) {
        const [bx, by] = KBASE[k], dx = -bx * hw, dy = -by * hd, c = [pp[0] + dx * cs - dy * sn, pp[1] + dx * sn + dy * cs, pp[2]];
        const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [c[0] + u * hw * 0.98 * cs - v * hd * 0.98 * sn, c[1] + u * hw * 0.98 * sn + v * hd * 0.98 * cs]);
        const sc = pts.filter(z => C.pointInPoly(z, q)).length + (C.pointInPoly(c, q) ? 1 : 0); if (!best || sc > best.sc) best = { c, rot, sc, k };
      }
      if (best && best.sc >= 1) return best;
    }
    // kenar üzerinde: kolon yüzü kenara dayanır, içeri doğru oturur
    for (const q of hostPolys()) for (let i = 0; i < q.length; i++) {
      const a = q[i], b = q[(i + 1) % q.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue;
      const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, t = (p[0] - a[0]) * ux + (p[1] - a[1]) * uy; if (t < 0 || t > L || Math.abs(-(p[0] - a[0]) * uy + (p[1] - a[1]) * ux) > tol) continue;
      const rot0 = props.rot || ((Math.atan2(uy, ux) / RAD) % 90 + 90) % 90, rot = Math.abs(rot0 - 90) < 1e-6 ? 0 : rot0, cs = Math.cos(rot * RAD), sn = Math.sin(rot * RAD), pp = [a[0] + ux * t, a[1] + uy * t, p[2] || 0];
      for (const k of ['AO', 'UO', 'SO', 'SGO']) { const [bx, by] = KBASE[k], dx = -bx * hw, dy = -by * hd, c = [pp[0] + dx * cs - dy * sn, pp[1] + dx * sn + dy * cs, pp[2]], m = [pp[0] + (c[0] - pp[0]) * 0.5, pp[1] + (c[1] - pp[1]) * 0.5]; if (Math.abs((c[0] - pp[0]) * ux + (c[1] - pp[1]) * uy) < 1e-6 && C.pointInPoly(m, q)) return { c, rot, k }; }
    }
    return at(0, 0, props.rot || 0);
  };
  C.addCommand(['KOLON', 'COLUMN'], 'Kolon: dikdörtgen (b×d) ya da dairesel (Ø); yükseklik, alt kot, beton sınıfı, açı, yerleşim noktası (merkez / köşe / kenar ortası / OTO: döşeme-temel köşesine oturt). Yerleştirirken B yazıp Enter = yerleşim noktasını değiştir.', async (I) => {
    const r = await getParams('Kolon — ayarlar', [{ k: 'sek', t: 'Kesit', opts: [['R', 'Dikdörtgen'], ['D', 'Dairesel']], d: 'R' }, { k: 'b', t: 'b (cm)', d: 40 }, { k: 'd', t: 'd (cm)', d: 40 }, { k: 'D', t: 'Çap Ø (cm, dairesel)', d: 50 }, { k: 'h', t: 'Yükseklik (m)', d: 3 }, { k: 'z0', t: 'Alt kot (m)', d: 0, al: ['Z'] }, { k: 'zoto', t: 'Alt kot kaynağı', opts: [['OTO', "3B'de tıklanan noktanın kotu"], ['EL', 'Girdiğim alt kot'], ['SV', 'Aktif seviye']], d: 'OTO', al: ['ZOTO'] }, { k: 'rot', t: 'Açı (°)', d: 0 }, { k: 'yer', t: 'Yerleşim noktası (tuttuğum yer)', opts: Object.entries(KBN), d: 'OTO', al: ['YER', 'BAZ'] }, { k: 'beton', t: 'Beton sınıfı', opts: BETON, d: 'C30/37' }, { k: 'guse', t: 'Guse (vinç kirişi konsolu)', opts: [['H', 'Yok'], ['E', 'Var']], d: 'H', al: ['GUSE'], tab: 'Guse (vinç konsolu)', tabHint: 'Guse, kolon yüzünden çıkan ve alt yüzü eğik olan konsoldur; vinç kirişi (kren yolu kirişi) üst yüzüne oturur. Üst yüzün ortasına ve uç köşelerine yakalanılır. Üst kot "kolon üstünden aşağı" seçilirse kolon boyu değişince guse de birlikte kayar.' }, { k: 'gYon', t: 'Yön (kolon yüzü)', opts: GUSE_YON, d: 'R', al: ['GYON'], tab: 'Guse (vinç konsolu)' }, { k: 'gRef', t: 'Üst kot tanımı', opts: [['UST', 'Kolon üstünden aşağı mesafe'], ['KOT', 'Mutlak proje kotu']], d: 'UST', al: ['GREF'], tab: 'Guse (vinç konsolu)' }, { k: 'gZ', t: 'Üst kot değeri (m)', d: 1, al: ['GZ'], tab: 'Guse (vinç konsolu)' }, { k: 'gL', t: 'Çıkma (cm)', d: 40, al: ['GL'], tab: 'Guse (vinç konsolu)' }, { k: 'gHf', t: 'Kolon yüzünde yükseklik (cm)', d: 60, al: ['GHF'], tab: 'Guse (vinç konsolu)' }, { k: 'gHu', t: 'Uçta yükseklik (cm)', d: 30, al: ['GHU'], tab: 'Guse (vinç konsolu)' }, { k: 'gW', t: 'Genişlik (cm, 0 = kolon yüzü kadar)', d: 0, al: ['GW'], tab: 'Guse (vinç konsolu)' }].concat(OLF('nokta')), 'kolon'); if (!r) return; if (r.zoto === 'SV') { r.z0 = zSv(); r.zoto = 'EL'; }
    const props = { sek: r.sek, b: cm(r.b), d: cm(r.d), D: cm(r.D), h: r.h, z0: r.z0, rot: r.rot, beton: r.beton, layer: lay('kolon') };
    if (r.guse === 'E') Object.assign(props, { guse: 'E', gYon: r.gYon || 'R', gRef: r.gRef || 'UST', gZ: +r.gZ || 0, gL: cm(+r.gL || 40), gHf: cm(+r.gHf || 60), gHu: cm(+r.gHu || 30), gW: cm(+r.gW || 0) }); let n = 0, base = KBN[r.yer] ? r.yer : 'OTO';
    const ORD = Object.keys(KBN);
    const z0Of = p => (r.zoto !== 'EL' && Math.abs(p[2] || 0) > 1e-6 ? +(+p[2]).toFixed(4) : props.z0);
    if (olcuMu(r)) { // ölçüyle: girilen X,Y'ye (ya da tek tıkla) tek kolon
      const { pts } = await yol(I, r, 'nokta', q => C.prims(Object.assign({ type: 'kolon' }, props, { p: kolonPlace(q[0], props, base).c, rot: kolonPlace(q[0], props, base).rot })));
      if (!pts.length) return; const k = kolonPlace(pts[0], props, base); const e = C.add(C.newEnt('kolon', Object.assign({}, props, { p: [k.c[0], k.c[1], 0], rot: k.rot, z0: r.zoto === 'OTO' ? zSv() : props.z0 }))); delete e.sp; C.log('1 kolon yerleştirildi.'); return;
    }
    C.log(`Kolon yerleşim noktası: ${KBN[base]}. Değiştirmek için B (sırayla) ya da M, SA, SGA, SGU, SU, AO, UO, SO, SGO, OTO yazıp Enter.`);
    for (; ;) {
      E.preview = c => { const k = kolonPlace(c, props, base); return C.prims(Object.assign({ type: 'kolon' }, props, { p: k.c, rot: k.rot })); };
      const p = await I.pt(`Kolon yeri [${KBN[base]}] (B = yerleşim noktası, Enter bitir)`, { kw: ['B', ...ORD] }); E.preview = null;
      if (typeof p === 'string') { const t = C.up(p.trim()); if (t === 'B') { base = ORD[(ORD.indexOf(base) + 1) % ORD.length]; C.log('Yerleşim noktası: ' + KBN[base]); continue; } if (KBN[t]) { base = t; C.log('Yerleşim noktası: ' + KBN[base]); continue; } break; }
      if (!p) break;
      const k = kolonPlace(p, props, base); const e = C.add(C.newEnt('kolon', Object.assign({}, props, { p: [k.c[0], k.c[1], 0], rot: k.rot, z0: z0Of(p) }))); delete e.sp; n++;
      if (E.scriptMode && !E.queue.length) break;
    }
    if (n) C.log(`${n} kolon yerleştirildi.`);
  });
  /* ---------- KİRİŞ ---------- */
  C.addCommand(['KIRIS', 'BEAM'], 'Kiriş: genişlik × yükseklik (cm), üst kot, beton sınıfı; uç noktalarına tıklayın (zincirleme).', async (I) => {
    const r = await getParams('Kiriş — ayarlar', [{ k: 'bw', t: 'Genişlik (cm)', d: 30 }, { k: 'hb', t: 'Yükseklik (cm)', d: 50 }, { k: 'zt', t: 'Üst kot (m)', d: 3, al: ['Z'] }, { k: 'hiza', t: 'Çizim hizası (kolon köşesinden başlamak için yüz)', opts: [['O', 'Eksen (orta)'], ['L', 'Sol yüz çizgide'], ['R', 'Sağ yüz çizgide']], d: 'O', al: ['HIZA'] }, { k: 'zref', t: 'Üst kot kaynağı', opts: [['EL', 'Girdiğim üst kot'], ['SV', 'Aktif seviye = kiriş üstü']], d: 'EL', al: ['ZREF'] }, { k: 'beton', t: 'Beton sınıfı', opts: BETON, d: 'C30/37' }].concat(OLF('kiris')), 'kiris'); if (!r) return; if (r.zref === 'SV') r.zt = zSv();
    const props = { bw: cm(r.bw), hb: cm(r.hb), zt: r.zt, hiza: r.hiza, beton: r.beton, layer: lay('kiris') }; C.log('Kiriş: kolon köşesine (uç nokta) ya da kenar ortasına yakalanır; hiza ile kiriş yüzü kolon yüzüyle aynı hizaya gelir.');
    if (olcuMu(r)) { const { pts } = await yol(I, r, 'kiris', q => C.prims(Object.assign({ type: 'kiris', a: q[0], b: q[1] }, props))); if (pts.length < 2) return; const e = C.add(C.newEnt('kiris', Object.assign({ a: M.p3(pts[0]), b: M.p3(pts[1]) }, props))); delete e.sp; C.log('1 kiriş çizildi.'); return; }
    let a = await I.pt('Kiriş başlangıcı'); if (!a || typeof a === 'string') return; let n = 0;
    for (; ;) { E.base = a; E.preview = c => C.prims(Object.assign({ type: 'kiris', a, b: c }, props)); const b = await I.pt('Kiriş sonu (Enter bitir)'); E.preview = null; E.base = null; if (!b || typeof b === 'string') break; const e = C.add(C.newEnt('kiris', Object.assign({ a: M.p3(a), b: M.p3(b) }, props))); delete e.sp; n++; a = b; }
    if (n) C.log(`${n} kiriş çizildi.`);
  });
  /* ---------- TEMEL ---------- */
  C.addCommand(['TEMEL', 'FOOTING', 'RADYE'], 'Temel: R = radye (köşe noktaları), S = sürekli (temel hattı boyunca, genişlik × yükseklik), T = tekil (nokta). Üst kot, kalınlık, beton sınıfı ayar penceresinden.', async (I) => {
    const r = await getParams('Temel — ayarlar', [{ k: 'tip', t: 'Temel tipi', opts: [['R', 'Radye'], ['S', 'Sürekli (şerit)'], ['T', 'Tekil']], d: 'R' }, { k: 't', t: 'Kalınlık / yükseklik (cm)', d: 60 }, { k: 'gen', t: 'Genişlik (cm, sürekli)', d: 100 }, { k: 'bx', t: 'Tekil: bx (cm)', d: 150 }, { k: 'by', t: 'Tekil: by (cm)', d: 150 }, { k: 'zt', t: 'Üst kot (m)', d: 0, al: ['Z'] }, { k: 'ref', t: 'Seviye', opts: [['KOT', 'Üst kotu girdiğim değer'], ['UST', 'Tıkladığım nokta temelin ÜSTÜ'], ['ALT', 'Tıkladığım nokta temelin ALTI'], ...SVREF], d: 'KOT', al: ['REF'] }, { k: 'beton', t: 'Beton sınıfı', opts: BETON, d: 'C30/37' }].concat(OLF('alan').map(f => (f.k === 'ly' ? Object.assign({}, f, { t: 'Ölçü: Y kenarı (cm; radye — sürekli temelde 0 = düz hat, >0 = kapalı)' }) : f.k === 'lx' ? Object.assign({}, f, { t: 'Ölçü: X kenarı / boy (cm; radye ve sürekli temel)' }) : f))), 'temel'); if (!r) return;
    const ztSv = (r.ref === 'SVU' || r.ref === 'SVA') ? levelOf(r, [[0, 0, 0]]) : null; if (ztSv != null) r.zt = ztSv;
    const L0 = lay('temel');
    if (r.tip === 'T') { let n = 0; const props = { bx: cm(r.bx), by: cm(r.by), t: cm(r.t), zt: r.zt, beton: r.beton, rot: 0, layer: L0 }; if (olcuMu(r)) { const { pts } = await yol(I, r, 'nokta', q => C.prims(Object.assign({ type: 'temel', p: q[0] }, props))); if (!pts.length) return; const e = C.add(C.newEnt('temel', Object.assign({ p: M.p3(pts[0]) }, props))); delete e.sp; C.log('1 tekil temel.'); return; } for (; ;) { E.preview = c => C.prims(Object.assign({ type: 'temel', p: c }, props)); const p = await I.pt('Tekil temel yeri (Enter bitir)'); E.preview = null; if (!p || typeof p === 'string') break; const e = C.add(C.newEnt('temel', Object.assign({ p: M.p3(p) }, props))); delete e.sp; n++; if (E.scriptMode && !E.queue.length) break; } if (n) C.log(`${n} tekil temel.`); return; }
    if (r.tip === 'S') { const props = { tb: cm(r.gen), tt: cm(r.gen), egim: 'R', hiza: 'O', h: cm(r.t), z0: r.zt - cm(r.t), malz: 'beton', beton: r.beton, temel: true, layer: L0 }; const { pts, closed } = await yol(I, r, 'hat', (q, cl) => C.prims(Object.assign({ type: 'perde', id: -1, pts: q.map(p2), closed: cl }, props))); if (pts.length < 2) return; const e = C.add(C.newEnt('perde', Object.assign({ pts: pts.map(p2), closed: closed && pts.length > 2 }, props))); delete e.sp; C.log('Sürekli temel: ' + T.perde.info(e)); return; }
    const { pts } = await yol(I, r, 'alan', q => [P(q, true, { lt: 'DASHED' })]); if (pts.length < 3) return;
    const e = C.add(C.newEnt('plak', { kind: 'radye', pts: pts.map(p2), t: cm(r.t), zt: levelOf(r, pts), beton: r.beton, layer: L0 })); delete e.sp; C.log(T.plak.info(e));
  });
  /* döşeme / çatı döşemesi — çatıda istenen yükseklikte parapet (döşeme kenarında, dış yüzü döşeme kenarıyla aynı hizada; ayrı perde nesnesi: metraj, kesit, kalıp otomatik) */
  const parapetOf = pl => C.doc.ents.find(x => x.type === 'perde' && x.parapet && x.host === pl.id);
  const setParapet = (pl, ph, pt, pm) => {
    const old = parapetOf(pl); if (!(ph > 0)) { if (old) C.remove([old]); return null; }
    const props = { pts: pl.pts.map(p2), closed: true, hiza: 'DIS', ofs: 0, egim: 'R', tb: pt, tt: pt, h: ph, z0: +pl.zt || 0, malz: pm || 'beton', beton: pl.beton, parapet: true, host: pl.id, layer: lay(pm && pm !== 'beton' ? 'duvar' : 'perde') };
    if (old) { Object.assign(old, props); delete old._c; return old; }
    const e = C.add(C.newEnt('perde', props)); delete e.sp; return e;
  };
  C.setParapet = setParapet; C.parapetOf = parapetOf;
  C.on('change', () => { if (!C.doc) return; for (const w of C.doc.ents) if (w.type === 'perde' && w.parapet && w.host != null) { const pl = C.byId(w.host); if (!pl) continue; const z = +pl.zt || 0, js = JSON.stringify(pl.pts.map(p2)); if (Math.abs((+w.z0 || 0) - z) > 1e-9 || JSON.stringify(w.pts) !== js) { w.z0 = z; w.pts = JSON.parse(js); delete w._c; } } });
  /* çokgeni dışa ötele (döşeme saçağı / konsolu) */
  const offOut = (q0, d) => { let q = q0.map(p2); if (M.polyArea(q) < 0) q = q.reverse(); const n = q.length, out = []; for (let i = 0; i < n; i++) { const a = q[(i - 1 + n) % n], b = q[i], c = q[(i + 1) % n], u1 = M.norm([b[0] - a[0], b[1] - a[1], 0]), u2 = M.norm([c[0] - b[0], c[1] - b[1], 0]), n1 = [u1[1], -u1[0]], n2 = [u2[1], -u2[0]], k = 1 + n1[0] * n2[0] + n1[1] * n2[1]; out.push(k < 1e-6 ? [b[0] + n1[0] * d, b[1] + n1[1] * d] : [b[0] + (n1[0] + n2[0]) * d / k, b[1] + (n1[1] + n2[1]) * d / k]); } return out; };
  C.offOut = offOut;
  const dosemeCmd = (cati) => async (I) => {
    const r = await getParams(cati ? 'Çatı döşemesi — ayarlar' : 'Döşeme — ayarlar', [{ k: 't', t: 'Kalınlık (cm)', d: cati ? 15 : 20 }, { k: 'ref', t: 'Seviye', opts: [['KOT', 'Üst kotu girdiğim değer'], ['UST', 'Tıkladığım nokta döşemenin ÜSTÜ'], ['ALT', 'Tıkladığım nokta döşemenin ALTI'], ...SVREF], d: 'KOT', al: ['REF'] }, { k: 'zt', t: 'Üst kot (m)', d: 3, al: ['Z'] }, ...(cati ? [{ k: 'sacak', t: 'Saçak — döşeme konsolu, çizdiğiniz kenardan taşma (cm, 0 = yok)', d: 60, al: ['SACAK'] }, { k: 'ph', t: 'Parapet yüksekliği (m, 0 = parapet yok)', d: 1, al: ['PH', 'PARAPET'] }, { k: 'pt', t: 'Parapet kalınlığı (cm)', d: 20, al: ['PT'] }, { k: 'pm', t: 'Parapet malzemesi', opts: [['beton', 'Betonarme'], ['tugla', 'Tuğla'], ['gazbeton', 'Gazbeton'], ['briket', 'Briket']], d: 'beton', al: ['PM'] }] : []) /* parapet / saçak yalnız çatı döşemesinde */, { k: 'beton', t: 'Beton sınıfı', opts: BETON, d: 'C30/37' }].concat(OLF('alan')), cati ? 'cati' : 'doseme'); if (!r) return;
    const { pts } = await yol(I, r, 'alan', q => [P(q, true, { lt: 'DASHED' })]); if (pts.length < 3) return;
    const sc = cm(+r.sacak || 0), ptsS = sc > 0 ? offOut(pts, sc) : pts.map(p2);
    const e = C.add(C.newEnt('plak', { kind: 'doseme', cati: !!cati || +r.ph > 0, sacak: sc, pts: ptsS, t: cm(r.t), zt: levelOf(r, pts), beton: r.beton, layer: lay('doseme') })); delete e.sp; C.log(T.plak.info(e));
    const pp = setParapet(e, +r.ph || 0, cm(r.pt || 20), r.pm); if (pp) C.log(`Parapet: h=${M.fmt(+r.ph, 2)} m, ${M.fmt(+r.pt || 20, 0)} cm ${(MALZ[r.pm] || MALZ.beton).ad.toLowerCase()} · ${T.perde.info(pp)}`);
  };
  C.addCommand(['IDOSEME', 'BETONDOSEME', 'INSDOSEME'], 'Betonarme döşeme: kalınlık, üst kot, beton sınıfı; köşe noktalarını tıklayın (parapet ve saçak için Çatı döşemesi)', dosemeCmd(false));
  C.addCommand(['ICATI', 'CATIDOSEMESI', 'TERASDOSEME'], 'Çatı döşemesi: kalınlık, üst kot ve istediğiniz yükseklikte parapet (ör. 1 m ya da 0.5 m), parapet kalınlığı ve malzemesi; köşe noktalarını tıklayın', dosemeCmd(true));
  /* ---------- KOLONLARDAN OTOMATİK KİRİŞ (+ isteğe bağlı döşeme / çatı döşemesi parapetli) ----------
     seçilen kolonlar aks ızgarasına ayrılır; her sırada / dizide ardışık kolonlar kirişle bağlanır.
     Kenar (dış) kirişler kolonun dış yüzüyle aynı hizada, iç kirişler kolon merkez aksında. */
  C.addCommand(['OTOKIRIS', 'KOLONKIRIS', 'KIRISOTO'], 'Kolonlardan otomatik kiriş: kolonları tek tek ya da pencereyle seçin, Enter. Yan ve karşılıklı kolonlar kirişle bağlanır; kenar kirişleri kolon dış yüzünden, ara kirişler kolon merkezinden. İsteğe bağlı döşeme ya da parapetli çatı döşemesi.', async (I) => {
    const r = await getParams('Kolonlardan kiriş — ayarlar', [{ k: 'bw', t: 'Kiriş genişliği (cm)', d: 30, al: ['B', 'BW'] }, { k: 'hb', t: 'Kiriş yüksekliği (cm)', d: 50, al: ['H', 'HB'] }, { k: 'zoto', t: 'Kiriş üst kotu', opts: [['OTO', 'Kolon üst kotu (otomatik)'], ['EL', 'Elle']], d: 'OTO', al: ['ZOTO'] }, { k: 'zt', t: 'Kiriş üst kotu — elle (m)', d: 3, al: ['Z', 'ZT'] }, { k: 'dis', t: 'Kenar kirişleri', opts: [['DIS', 'Kolon dış yüzüyle aynı hizada'], ['O', 'Kolon merkezinden']], d: 'DIS', al: ['DIS'] }, { k: 'dos', t: 'Döşeme', opts: [['YOK', 'Döşeme yapma'], ['NORMAL', 'Normal döşeme'], ['CATI', 'Çatı döşemesi (parapetli)']], d: 'YOK', al: ['DOS'] }, { k: 'sacak', t: 'Saçak — döşemenin kenar kirişi / kolon dış yüzünden taşması (cm; −1 = otomatik: çatıda 60, normalde 0)', d: -1, al: ['SACAK'] }, { k: 't', t: 'Döşeme kalınlığı (cm)', d: 15, al: ['T'] }, { k: 'ph', t: 'Parapet yüksekliği (m, çatıda)', d: 1, al: ['PH', 'PARAPET'] }, { k: 'pt', t: 'Parapet kalınlığı (cm)', d: 20, al: ['PT'] }, { k: 'pm', t: 'Parapet malzemesi', opts: [['beton', 'Betonarme'], ['tugla', 'Tuğla'], ['gazbeton', 'Gazbeton'], ['briket', 'Briket']], d: 'beton', al: ['PM'] }, { k: 'beton', t: 'Beton sınıfı', opts: BETON, d: 'C30/37' }], 'otokiris'); if (!r) return;
    const sel = await I.sel('Kolonları seçin (tek tek tıklayın ya da pencere çizin), Enter = kirişleri oluştur', { pre: true }); if (!sel) return;
    const K = sel.filter(e => e.type === 'kolon'); if (K.length < 2) { C.warn('En az iki kolon seçin.'); return; }
    const bw = cm(r.bw), hb = cm(r.hb), tol = 0.05, rot = (+K[0].rot || 0) * RAD, cs = Math.cos(rot), sn = Math.sin(rot);
    const toL = p => [p[0] * cs + p[1] * sn, -p[0] * sn + p[1] * cs], toW = q => [q[0] * cs - q[1] * sn, q[0] * sn + q[1] * cs];
    const half = k => { if (k.sek === 'D') { const rr = (+k.D || 0.5) / 2; return [rr, rr]; } const kr = ((+k.rot || 0) * RAD) - rot, b = (+k.b || 0.4) / 2, d = (+k.d || 0.4) / 2, c = Math.abs(Math.cos(kr)), s2 = Math.abs(Math.sin(kr)); return [b * c + d * s2, b * s2 + d * c]; };
    const N = K.map(k => { const l = toL(M.p3(k.p)); return { k, x: l[0], y: l[1], h: half(k), top: (+k.z0 || 0) + (+k.h || 3) }; });
    const groups = (key) => { const g = []; for (const n of [...N].sort((a, b) => a[key] - b[key])) { const last = g[g.length - 1]; if (last && Math.abs(n[key] - last.v) <= tol) last.m.push(n); else g.push({ v: n[key], m: [n] }); } return g; };
    const rows = groups('y'), cols = groups('x'); // sıralar (y sabit, x boyunca) ve diziler (x sabit, y boyunca)
    const xs = N.map(n => n.x), ys = N.map(n => n.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const has = (a, b) => C.doc.ents.some(e => e.type === 'kiris' && ((M.dist2(e.a, a) < 0.02 && M.dist2(e.b, b) < 0.02) || (M.dist2(e.a, b) < 0.02 && M.dist2(e.b, a) < 0.02)));
    const mk = (A, B, off, dir) => { // A,B düğüm; off: yanal kaydırma (yerel); dir 'x' | 'y'
      const pa = dir === 'x' ? [A.x, A.y + off] : [A.x + off, A.y], pb = dir === 'x' ? [B.x, B.y + off] : [B.x + off, B.y];
      const a = toW(pa), b = toW(pb), zt = r.zoto === 'EL' ? r.zt : Math.min(A.top, B.top); if (has(a, b)) return false;
      const e = C.add(C.newEnt('kiris', { a: [a[0], a[1], 0], b: [b[0], b[1], 0], bw, hb, zt: +zt.toFixed(4), hiza: 'O', beton: r.beton, layer: lay('kiris') })); delete e.sp; return true;
    };
    // ızgara gözleri (dört köşesinde kolon olan): kirişin iki yanında göz varsa ara kiriş (merkez), tek yanında varsa kenar kirişi (dış yüz)
    const X = cols.map(c => c.v), Y = rows.map(rw => rw.v), at = (i, j) => N.find(nn => Math.abs(nn.x - X[i]) <= tol && Math.abs(nn.y - Y[j]) <= tol);
    const cell = new Set(); for (let i = 0; i + 1 < X.length; i++) for (let j = 0; j + 1 < Y.length; j++) if (at(i, j) && at(i + 1, j) && at(i, j + 1) && at(i + 1, j + 1)) cell.add(i + ',' + j);
    const ix = v => X.findIndex(x => Math.abs(x - v) <= tol), iy = v => Y.findIndex(y => Math.abs(y - v) <= tol);
    const side = (i0, i1, j, alongX) => { let ok = true; for (let i = i0; i < i1; i++) if (!cell.has(alongX ? i + ',' + j : j + ',' + i)) ok = false; return ok && i1 > i0; };
    let n = 0, nk = 0;
    for (const R of rows) { const m = R.m.sort((a, b) => a.x - b.x), j = iy(R.v); for (let q = 0; q + 1 < m.length; q++) { const A = m[q], B = m[q + 1], i0 = ix(A.x), i1 = ix(B.x); let off = 0; if (r.dis === 'DIS' && cell.size) { const lo = side(i0, i1, j - 1, true), hi = side(i0, i1, j, true); if (hi && !lo) { off = Math.min(-A.h[1], -B.h[1]) + bw / 2; nk++; } else if (lo && !hi) { off = Math.max(A.h[1], B.h[1]) - bw / 2; nk++; } } if (mk(A, B, off, 'x')) n++; } }
    for (const Cc of cols) { const m = Cc.m.sort((a, b) => a.y - b.y), i = ix(Cc.v); for (let q = 0; q + 1 < m.length; q++) { const A = m[q], B = m[q + 1], j0 = iy(A.y), j1 = iy(B.y); let off = 0; if (r.dis === 'DIS' && cell.size) { const lo = side(j0, j1, i - 1, false), hi = side(j0, j1, i, false); if (hi && !lo) { off = Math.min(-A.h[0], -B.h[0]) + bw / 2; nk++; } else if (lo && !hi) { off = Math.max(A.h[0], B.h[0]) - bw / 2; nk++; } } if (mk(A, B, off, 'y')) n++; } }
    C.log(`${n} kiriş oluşturuldu (${bw * 100}×${hb * 100} cm${r.dis === 'DIS' ? `, ${nk} kenar kirişi kolon dış yüzünde` : ''}, ara kirişler kolon merkezinde).`);
    if (r.dos === 'YOK') return;
    // döşeme: dört köşesinde kolon olan ızgara gözlerinin birleşimi, dış yüzlere kadar
    if (!cell.size) { C.warn('Döşeme için dört köşesinde kolon olan göz bulunamadı.'); return; }
    const E2 = new Map(), addE = (a, b) => { const k = b + '>' + a; if (E2.has(k)) E2.delete(k); else E2.set(a + '>' + b, [a, b]); };
    for (const c of cell) { const [i, j] = c.split(',').map(Number); const v = (p, q) => p + ',' + q; addE(v(i, j), v(i + 1, j)); addE(v(i + 1, j), v(i + 1, j + 1)); addE(v(i + 1, j + 1), v(i, j + 1)); addE(v(i, j + 1), v(i, j)); }
    const nxt = new Map(); for (const [a, b] of E2.values()) nxt.set(a, b);
    const hx = Math.max(...N.map(nn => nn.h[0])), hy = Math.max(...N.map(nn => nn.h[1]));
    const start = [...nxt.keys()][0]; const loop = []; let cur = start, g = 0; do { loop.push(cur.split(',').map(Number)); cur = nxt.get(cur); } while (cur && cur !== start && g++ < 10000);
    const P = loop.map(([i, j]) => [X[i], Y[j]]), m = P.length, out = [];
    for (let i = 0; i < m; i++) { const pv = P[(i - 1 + m) % m], c = P[i], nx2 = P[(i + 1) % m]; const n1 = [Math.sign(c[1] - pv[1]), -Math.sign(c[0] - pv[0])], n2 = [Math.sign(nx2[1] - c[1]), -Math.sign(nx2[0] - c[0])]; const ox = (n1[0] || n2[0]) * hx, oy = (n1[1] || n2[1]) * hy; if (n1[0] === n2[0] && n1[1] === n2[1]) continue; out.push(toW([c[0] + ox, c[1] + oy])); }
    const zt = r.zoto === 'EL' ? r.zt : Math.min(...N.map(nn => nn.top)), cati = r.dos === 'CATI';
    const scO = cm(+r.sacak >= 0 ? +r.sacak : (r.dos === 'CATI' ? 60 : 0)), outS = scO > 0 ? offOut(out, scO) : out.map(p2);
    const pl = C.add(C.newEnt('plak', { kind: 'doseme', cati, sacak: scO, pts: outS, t: cm(r.t), zt: +zt.toFixed(4), beton: r.beton, layer: lay('doseme') })); delete pl.sp; C.log(T.plak.info(pl));
    if (cati && +r.ph > 0) { const pp = setParapet(pl, +r.ph, cm(r.pt || 20), r.pm); if (pp) C.log(`Parapet: h=${M.fmt(+r.ph, 2)} m · ${T.perde.info(pp)}`); }
  });
  /* ---------- PENCERE / KAPI ---------- */
  const hostAt = p => { let best = null, bd = Infinity; for (const e of C.doc.ents) if (e.type === 'perde' && !e.temel && C.lyLive(e.layer)) { for (const sf of segFrames(e)) { if (sf.L < 0.02) continue; /* çift tıklamadan kalan sıfır boylu parça: her tıklamayı kapıyordu */ const s = (p[0] - sf.a[0]) * sf.u[0] + (p[1] - sf.a[1]) * sf.u[1], d = Math.abs((p[0] - sf.a[0]) * sf.nn[0] + (p[1] - sf.a[1]) * sf.nn[1] - (faceOffs(e).lB + faceOffs(e).rB) / 2); if (s < -0.05 || s > sf.L + 0.05) continue; const top = (+e.z0 || 0) + (+e.h || 3), zc = Math.abs(p[2] || 0) > 1e-6 ? p[2] : null, inZ = zc == null || (zc >= (+e.z0 || 0) - 0.05 && zc <= top + 0.05), sc = d + (inZ ? 0 : 10); if (sc < bd - 0.05 || (Math.abs(sc - bd) <= 0.05 && top > (best ? (+best.e.z0 || 0) + (+best.e.h || 3) : -Infinity))) { bd = sc; best = { e, sf, s: Math.max(0, Math.min(sf.L, s)), side: ((p[0] - sf.a[0]) * sf.nn[0] + (p[1] - sf.a[1]) * sf.nn[1]) >= (faceOffs(e).lB + faceOffs(e).rB) / 2 ? 'L' : 'R' }; } } } return best && bd < Math.max(1, faceOffs(best.e).tb * 3) ? best : null; };
  /* pencere / kapı: 1) duvarın dış yüzüne tıkla  2) duvar boyunca kaydır — sol ve sağ boş mesafe (kolon / duvar ucu / diğer boşluk) ölçü çizgileriyle gösterilir, 5 cm adımlarla;
     tıkla ya da sol mesafeyi cm olarak yaz. Pencere zeminden yüksekliği (parapet) varsayılan 80 cm. */
  const openCmd = (kind, tip) => async (I) => { const KT = kind === 'kapi' && (tip === 'S' || tip === 'C') ? tip : null; // KT: S seksiyonel, C çelik kapı
    const LF = [{ k: 'lento', t: 'Lento (kâgir duvarda, demirsiz beton)', opts: [['E', 'Var'], ['H', 'Yok']], d: 'E', al: ['LENTO'] }, { k: 'lb', t: 'Lento taşması — her iki yandan (cm)', d: 10, al: ['LB'] }, { k: 'lh', t: 'Lento yüksekliği (cm, 0 = duvar kalınlığı)', d: 0, al: ['LH'] }];
    const fields = KT === 'S' ? [{ k: 'w', t: 'Genişlik (cm)', d: 400 }, { k: 'hh', t: 'Yükseklik (cm)', d: 400 }, { k: 'pnl', t: 'Panel yüksekliği (cm)', d: 50, al: ['PANEL'] }, { k: 'ray', t: 'Tavan rayı (planda)', opts: [['E', 'Göster'], ['H', 'Gösterme']], d: 'E', al: ['RAY'] }, { k: 'adim', t: 'Kaydırma adımı (cm)', d: 5, al: ['ADIM'] }, ...LF]
      : KT === 'C' ? [{ k: 'w', t: 'Genişlik (cm)', d: 100 }, { k: 'hh', t: 'Yükseklik (cm)', d: 210 }, { k: 'kanat', t: 'Kanat', opts: [['1', 'Tek kanat'], ['2', 'Çift kanat']], d: '1' }, { k: 'kasa', t: 'Kasa genişliği (cm)', d: 5, al: ['KASA'] }, { k: 'adim', t: 'Kaydırma adımı (cm)', d: 5, al: ['ADIM'] }, ...LF]
      : kind === 'kapi' ? [{ k: 'w', t: 'Genişlik (cm)', d: 90 }, { k: 'hh', t: 'Yükseklik (cm)', d: 210 }, { k: 'kanat', t: 'Kanat', opts: [['1', 'Tek kanat'], ['2', 'Çift kanat']], d: '1' }, { k: 'adim', t: 'Kaydırma adımı (cm)', d: 5, al: ['ADIM'] }, ...LF] : [{ k: 'w', t: 'Genişlik (cm)', d: 120 }, { k: 'hh', t: 'Yükseklik (cm)', d: 140 }, { k: 'par', t: 'Zeminden yükseklik / parapet (cm)', d: 80, al: ['PAR'] }, { k: 'adim', t: 'Kaydırma adımı (cm)', d: 5, al: ['ADIM'] }, ...LF];
    const r = await getParams(KT === 'S' ? 'Seksiyonel kapı — ayarlar' : KT === 'C' ? 'Çelik kapı — ayarlar' : kind === 'kapi' ? 'Kapı — ayarlar' : 'Pencere — ayarlar', fields, KT ? kind + KT : kind); if (!r) return; let n = 0;
    if (cm(r.w) > 6 || cm(r.hh) > 6) C.warn(`${kind === 'kapi' ? 'Kapı' : 'Pencere'} ölçüsü ${r.w} × ${r.hh} cm girildi (${cm(r.w).toFixed(2)} × ${cm(r.hh).toFixed(2)} m). Değerler cm cinsindendir; mm yazdıysanız 10'a bölün (ör. 1200 mm → 120).`);
    const W = cm(r.w), HH = cm(r.hh), PAR = kind === 'kapi' ? 0 : cm(r.par == null ? 80 : r.par), st = Math.max(0.005, cm(+r.adim || 5)), nm = KT === 'S' ? 'Seksiyonel kapı' : KT === 'C' ? 'Çelik kapı' : kind === 'kapi' ? 'Kapı' : 'Pencere', EK = KT === 'S' ? { kTip: 'S', pnl: cm(+r.pnl || 50), ray: r.ray !== 'H' } : KT === 'C' ? { kTip: 'C', kasa: cm(+r.kasa || 5) } : {};
    // duvar segmentinde s'yi içeren boş aralık (kolon / betonarme perde kesimleri ve mevcut boşluklar sınır)
    const gap = (e, sf, sv) => { const F = faceOffs(e), b = colCuts(e, sf, F).concat(openingsOf(e).filter(o => (o.seg || 0) === sf.i).map(o => [(+o.s || 0) - (+o.w || 1) / 2, (+o.s || 0) + (+o.w || 1) / 2])).sort((x, y) => x[0] - y[0]); let a = 0, z = sf.L; for (const [c0, c1] of b) { if (c1 <= sv + 1e-9) a = Math.max(a, c1); else if (c0 >= sv - 1e-9) { z = Math.min(z, c0); break; } } return [a, z]; };
    const place = (H, c, typed) => { // -> { s, dl, dr, g } ya da null
      const sf = H.sf, sv0 = typed != null ? null : (c[0] - sf.a[0]) * sf.u[0] + (c[1] - sf.a[1]) * sf.u[1];
      const g = gap(H.e, sf, typed != null ? (H.g0 != null ? H.g0 : sf.L / 2) : sv0); if (g[1] - g[0] < W + 1e-6) return null;
      let dl = typed != null ? typed : Math.round((sv0 - W / 2 - g[0]) / st) * st; dl = Math.max(0, Math.min(g[1] - g[0] - W, dl));
      return { s: g[0] + dl + W / 2, dl, dr: g[1] - g[0] - W - dl, g };
    };
    const refPrims = (H, P) => {
      const e = H.e, sf = H.sf, F = faceOffs(e), oF = H.side === 'L' ? Math.max(F.lB, F.lT) : Math.min(F.rB, F.rT), sg = H.side === 'L' ? 1 : -1, z = (+e.z0 || 0) + (kind === 'kapi' ? 0.02 : PAR);
      const Q = (sv, o) => [sf.a[0] + sf.u[0] * sv + sf.nn[0] * o, sf.a[1] + sf.u[1] * sv + sf.nn[1] * o, z], d1 = oF + sg * 0.35, d2 = oF + sg * 0.45, th = C.annoH(2.2), out = [], col = { color: 3, lw: 18 };
      const dim = (x0, x1, v) => { out.push(L(Q(x0, d1), Q(x1, d1), col), L(Q(x0, oF), Q(x0, d2), col), L(Q(x1, oF), Q(x1, d2), col)); const m = Q((x0 + x1) / 2, d1 + sg * th * 0.9); out.push(TX(m, th, `${Math.round(v * 100)}`, Math.atan2(sf.u[1], sf.u[0]), 'MC', { color: 3 })); };
      dim(P.g[0], P.s - W / 2, P.dl); dim(P.s + W / 2, P.g[1], P.dr);
      return out;
    };
    for (; ;) {
      E.preview = c => { const h = hostAt(c); if (!h) return []; const F = faceOffs(h.e), oF = h.side === 'L' ? F.lB : F.rB, sf = h.sf, z = (+h.e.z0 || 0); return [L([sf.a[0] + sf.nn[0] * oF, sf.a[1] + sf.nn[1] * oF, z], [sf.b[0] + sf.nn[0] * oF, sf.b[1] + sf.nn[1] * oF, z], { color: 2, lw: 50 })]; };
      E.tagFn = c => { const h = hostAt(c); return h ? `${h.e.malz && h.e.malz !== 'beton' ? 'Duvar' : 'Perde'} — ${h.side === 'L' ? 'sol' : 'sağ'} yüz` : 'Duvar yok'; };
      const p0 = await I.pt(`${nm}: duvarın DIŞ yüzüne tıklayın (Enter bitir)`); E.preview = null; E.tagFn = null; if (!p0 || typeof p0 === 'string') break;
      const H = hostAt(p0); if (!H) { C.warn('Yakında perde / duvar yok (İnşaat › Perde ya da Duvar ile çizilmiş olmalı).'); if (E.scriptMode && !E.queue.length) break; continue; }
      H.g0 = (p0[0] - H.sf.a[0]) * H.sf.u[0] + (p0[1] - H.sf.a[1]) * H.sf.u[1]; let last = null;
      C.log(`${nm}: duvar boyunca kaydırın — sol / sağ boş mesafe ${Math.round(st * 100)} cm adımlarla gösterilir. Tıklayın ya da sol mesafeyi cm yazın. D = başka duvar, Enter = bitir.`);
      for (; ;) {
        E.preview = c => { const P = place(H, c); last = P; if (!P) return []; return C.prims(Object.assign({ type: 'acik', host: H.e.id, seg: H.sf.i, s: P.s, kind, w: W, hh: HH, par: PAR, kanat: +r.kanat || 1, yon: H.side, ...EK })).concat(refPrims(H, P)); };
        E.tagFn = c => { const P = place(H, c); if (P) return `Sol ${Math.round(P.dl * 100)} cm · Sağ ${Math.round(P.dr * 100)} cm`; const gg = gap(H.e, H.sf, (c[0] - H.sf.a[0]) * H.sf.u[0] + (c[1] - H.sf.a[1]) * H.sf.u[1]); return `Sığmıyor: genişlik ${Math.round(W * 100)} cm > boş aralık ${Math.round((gg[1] - gg[0]) * 100)} cm`; };
        const q = await I.pt(`${nm} yeri — sol mesafe (cm) yazın ya da tıklayın [D = başka duvar]`, { kw: [['D', 'DUVAR']], num: true }); E.preview = null; E.tagFn = null;
        if (q === 'D') break; if (q == null || q === '') { H.done = true; break; }
        let P = null;
        if (typeof q === 'string') { const v = parseFloat(q.replace(',', '.')); if (!isFinite(v)) continue; P = place(H, null, v / 100); }
        else if (typeof q === 'number') P = place(H, null, q / 100);
        else { H.g0 = (q[0] - H.sf.a[0]) * H.sf.u[0] + (q[1] - H.sf.a[1]) * H.sf.u[1]; P = place(H, q); }
        if (!P) { const gg = gap(H.e, H.sf, H.g0 != null ? H.g0 : H.sf.L / 2); C.warn(`${nm} bu aralığa sığmıyor: ${nm.toLocaleLowerCase('tr')} genişliği ${Math.round(W * 100)} cm, tıkladığınız yerdeki boş duvar aralığı ${Math.round((gg[1] - gg[0]) * 100)} cm (duvar parçası ${Math.round(H.sf.L * 100)} cm; kolon, betonarme perde ve diğer boşluklar düşüldü).${W > 6 ? ' Genişlik çok büyük görünüyor — ayar penceresindeki değerler cm cinsindendir (120 cm = 1,20 m).' : ''}`); continue; }
        const o = C.add(C.newEnt('acik', { host: H.e.id, seg: H.sf.i, s: +P.s.toFixed(4), kind, w: W, hh: HH, par: PAR, kanat: +r.kanat || 1, yon: H.side, el: 'L', ...EK, lento: r.lento !== 'H', lb: cm(r.lb == null ? 10 : r.lb), lh: +r.lh > 0 ? cm(r.lh) : 0, layer: lay(kind) })); delete o.sp; delete H.e._c; n++;
        C.changed(); C.log(`${nm}: sol ${Math.round(P.dl * 100)} cm · sağ ${Math.round(P.dr * 100)} cm${kind === 'kapi' ? '' : ` · zeminden ${Math.round(PAR * 100)} cm`}`);
        if (E.scriptMode && !E.queue.length) { H.done = true; break; }
      }
      if (H.done) break;
    }
    if (n) C.log(`${n} ${kind === 'kapi' ? 'kapı' : 'pencere'} yerleştirildi. Zeminden yükseklik, genişlik, yükseklik sağ tık › Ölçüleri düzenle'den değişir.`);
  };
  C.addCommand(['PENCERE', 'WINDOWADD', 'PENCEREKOY'], 'Pencere: genişlik, yükseklik, parapet; perde ya da duvar üzerine tıklayın — 3B\'de boşluk açılır, camlı pencere konur, planda sembolü çizilir', openCmd('pencere'));
  C.addCommand(['KAPI', 'DOOR', 'KAPIKOY'], 'Kapı: genişlik, yükseklik, tek/çift kanat; perde ya da duvar üzerine tıklayın (tıkladığınız taraf açılış yönü)', openCmd('kapi'));
  C.addCommand(['SEKSIYONELKAPI', 'SEKSIYONEL', 'GARAJKAPI'], 'Seksiyonel (endüstriyel, yukarı açılan panelli) kapı: genişlik, yükseklik, panel yüksekliği; perde ya da duvar üzerine tıklayın (tıkladığınız taraf iç taraf, tavan rayı o yöne)', openCmd('kapi', 'S'));
  C.addCommand(['CELIKKAPI', 'CELIK', 'STEELDOOR'], 'Çelik kapı: genişlik, yükseklik, tek/çift kanat, kasa genişliği; perde ya da duvar üzerine tıklayın (tıkladığınız taraf açılış yönü)', openCmd('kapi', 'C'));

  /* ---------- MİNHA: elemanlar dışbükey düşey prizmalara ayrılır, öncelik sırasıyla (temel > kolon > perde > kiriş > döşeme > duvar)
     her eleman kendinden önceki elemanların hacmini düşer — kesişen hacim iki kez sayılmaz ---------- */
  const ccw = q => (M.polyArea(q) < 0 ? q.slice().reverse() : q);
  const clipHalf = (poly, a, b, keepIn) => { // a→b kenarının solu (iç) / sağı (dış)
    const side = q => (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]), out = [];
    for (let i = 0; i < poly.length; i++) { const P = poly[i], Q = poly[(i + 1) % poly.length], sp = keepIn ? side(P) : -side(P), sq = keepIn ? side(Q) : -side(Q); if (sp >= -1e-12) out.push(P); if ((sp >= -1e-12) !== (sq >= -1e-12)) { const t = sp / (sp - sq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); } }
    return out;
  };
  const pArea = q => (q.length < 3 ? 0 : Math.abs(M.polyArea(q)));
  const pbb = q => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const v of q) { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); } return [x0, y0, x1, y1]; };
  const mkPr = (poly, za, zb) => { const q = ccw(poly.map(p2)); return { q, za, zb, bb: pbb(q) }; };
  const prismsOf = e => {
    const out = [];
    if (e.type === 'kolon') { const z0 = +e.z0 || 0; out.push(mkPr(kolonPoly(e), z0, z0 + (+e.h || 3))); }
    else if (e.type === 'kiris') { const B = beamCuts(e); for (const [s0, s1] of (B.pcs || [])) { const Pq = (s2, o) => [B.a[0] + B.u[0] * s2 + B.nn[0] * o, B.a[1] + B.u[1] * s2 + B.nn[1] * o]; out.push(mkPr([Pq(s0, -B.w), Pq(s1, -B.w), Pq(s1, B.w), Pq(s0, B.w)], B.zb, B.zt)); } }
    else if (e.type === 'temel') { const c = M.p3(e.p), bx = +e.bx || 1.5, by = +e.by || 1.5, cs = Math.cos((e.rot || 0) * RAD), sn = Math.sin((e.rot || 0) * RAD), W = (x, y) => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs], zt = +e.zt || 0; out.push(mkPr([W(-bx / 2, -by / 2), W(bx / 2, -by / 2), W(bx / 2, by / 2), W(-bx / 2, by / 2)], zt - (+e.t || 0.6), zt)); }
    else if (e.type === 'plak' || e.type === 'dolgu') { const zt = e.type === 'dolgu' ? +e.zb || 0 : +e.zt || 0, za = e.type === 'dolgu' ? +e.za || 0 : zt - (+e.t || 0.3), q = ccw(e.pts.map(p2)); try { if (e.type === 'plak') { for (const R of polyMinusKolon(q, za, zt)) { const r = C.earClipHoles(R.outer, R.holes.map(h => h.slice().reverse())); for (const t of r.tris) out.push(mkPr([r.pts[t[0]], r.pts[t[1]], r.pts[t[2]]], za, zt)); } } else for (const t of C.earClip(q)) out.push(mkPr([q[t[0]], q[t[1]], q[t[2]]], za, zt)); } catch (err) { } }
    else if (e.type === 'perde') {
      const F = faceOffs(e), z0 = +e.z0 || 0, h = +e.h || 3, lo = (F.lB + F.lT) / 2, ro = (F.rB + F.rT) / 2;
      for (const sf of segFrames(e)) {
        const P = (s2, o) => [sf.a[0] + sf.u[0] * s2 + sf.nn[0] * o, sf.a[1] + sf.u[1] * s2 + sf.nn[1] * o];
        const cuts = colCuts(e, sf, F); let sa = null; const pcs = [];
        for (const [c0, c1] of cuts) { if (!(sa == null ? c0 <= 0.02 : c0 - sa < 0.005)) pcs.push([sa, c0]); sa = c1; } if (!(sa != null && sa >= sf.L - 0.02)) pcs.push([sa, null]);
        for (const [a0, a1] of pcs) { const sL0 = a0 == null ? sf.k0 * lo : a0, sR0 = a0 == null ? sf.k0 * ro : a0, sL1 = a1 == null ? sf.L + sf.k1 * lo : a1, sR1 = a1 == null ? sf.L + sf.k1 * ro : a1; out.push(mkPr([P(sR0, ro), P(sR1, ro), P(sL1, lo), P(sL0, lo)], z0, z0 + h)); }
      }
    }
    return out.filter(r => r.zb > r.za + 1e-9 && pArea(r.q) > 1e-9);
  };
  const subPr = (A, B) => { // A − B → dışbükey parçalar
    if (B.za >= A.zb - 1e-9 || B.zb <= A.za + 1e-9 || B.bb[0] >= A.bb[2] - 1e-9 || B.bb[2] <= A.bb[0] + 1e-9 || B.bb[1] >= A.bb[3] - 1e-9 || B.bb[3] <= A.bb[1] + 1e-9) return [A];
    // xy kesişimi yoksa A aynen kalır
    let I = A.q; for (let i = 0; i < B.q.length && I.length >= 3; i++) I = clipHalf(I, B.q[i], B.q[(i + 1) % B.q.length], true);
    if (pArea(I) < 1e-9) return [A];
    const out = [], za = Math.max(A.za, B.za), zb = Math.min(A.zb, B.zb);
    if (za > A.za + 1e-9) out.push({ q: A.q, za: A.za, zb: za, bb: A.bb }); if (zb < A.zb - 1e-9) out.push({ q: A.q, za: zb, zb: A.zb, bb: A.bb });
    let cur = A.q; for (let i = 0; i < B.q.length && cur.length >= 3; i++) { const a = B.q[i], b = B.q[(i + 1) % B.q.length], o = clipHalf(cur, a, b, false); if (pArea(o) > 1e-9) out.push({ q: o, za, zb, bb: pbb(o) }); cur = clipHalf(cur, a, b, true); }
    return out;
  };
  const prVol = ls => ls.reduce((v, r) => v + pArea(r.q) * (r.zb - r.za), 0);
  const RANK = e => e.type === 'temel' || (e.type === 'plak' && e.kind === 'radye') || (e.type === 'perde' && e.temel) ? 0 : e.type === 'kolon' ? 1 : e.type === 'perde' && (e.malz || 'beton') === 'beton' ? 2 : e.type === 'plak' ? 3 : e.type === 'kiris' ? 4 : e.type === 'perde' ? 5 : e.type === 'dolgu' ? 6 : 9;
  const CAT = e => (RANK(e) === 0 ? 'Temel' : { 1: 'Kolon', 2: 'Perde', 3: 'Döşeme', 4: 'Kiriş', 5: 'Duvar', 6: 'Dolgu' }[RANK(e)]);
  /* her eleman için düşülecek (minha) hacim ve hangi elemanlarla çakıştığı */
  C.insMinha = (ents) => {
    // tek kaynak: app/yapi-cakisma.js (ham geometri + birleşim önceliği; pencere / kapı ve İT/ÇEK boşlukları da düşülür) — metraj ve statik aynı net parçaları kullanır
    if (C.yapiCakisma) { const N = C.yapiCakisma.net(ents || C.doc.ents, { canli: e => C.lyLive(e.layer) }), r2 = new Map(); for (const [id, m] of N) r2.set(id, { gross: m.brut, net: m.net, minha: m.minha, pairs: m.kesen, cat: m.ad, yeni: true }); return r2; }
    const L = (ents || C.doc.ents).filter(e => RANK(e) < 9 && C.lyLive(e.layer)).map((e, i) => ({ e, i, r: RANK(e), pr: prismsOf(e) }));
    L.sort((a, b) => a.r - b.r || a.i - b.i);
    const res = new Map();
    for (let j = 0; j < L.length; j++) {
      const J = L[j], g = prVol(J.pr); let rem = J.pr; const pairs = {};
      for (let i = 0; i < j; i++) { const Iq = L[i]; const before = prVol(rem); for (const B of Iq.pr) { const nx = []; for (const A of rem) nx.push(...subPr(A, B)); rem = nx; } const d = before - prVol(rem); if (d > 1e-6) { const k = CAT(Iq.e); pairs[k] = (pairs[k] || 0) + d; } }
      res.set(J.e.id, { gross: g, net: prVol(rem), minha: Math.max(0, g - prVol(rem)), pairs, cat: CAT(J.e) });
    }
    return res;
  };
  C.addCommand(['INSCAKISMA', 'CAKISMA', 'MINHA'], 'Taşıyıcı elemanların birbirine girdiği hacimleri (minha) listeler; olağan dışı çakışmaları (perde∩perde, kiriş∩kiriş, döşeme∩döşeme, duvar∩betonarme) seçer', async () => {
    const MN = C.insMinha(), byId = new Map(C.doc.ents.map(e => [e.id, e])), odd = []; let n = 0, tot = 0;
    for (const [id, m] of MN) { if (m.minha < 5e-4) continue; n++; tot += m.minha; const e = byId.get(id), ks = Object.keys(m.pairs); C.log(`${m.cat} #${id}: brüt ${m.gross.toFixed(3)} − minha ${m.minha.toFixed(3)} = net ${m.net.toFixed(3)} m³ (${ks.map(k => `${k} ${m.pairs[k].toFixed(3)}`).join(', ')})`); if (!m.yeni && (ks.includes(m.cat) || m.cat === 'Duvar')) odd.push(e); }
    if (C.yapiCakisma) { const ids = new Set(); for (const c of C.yapiCakisma.cakisma(C.doc.ents, { canli: e => C.lyLive(e.layer) }).cift) if (c.sinif === 'hata') { ids.add(c.a); ids.add(c.b); } for (const id of ids) { const e = byId.get(id); if (e) odd.push(e); } }
    if (!n) { C.log('Çakışan eleman yok: hiçbir hacim iki kez sayılmıyor.'); return; }
    C.log(`${n} elemanda toplam ${tot.toFixed(3)} m³ minha — INSMETRAJ bunları düşer.${odd.length ? ` ${odd.length} eleman aynı türden başka bir elemanla üst üste biniyor (seçildi): modeli düzeltin.` : ''}`);
    if (odd.length) { C.sel = odd; C.emit('selection'); }
  });
  /* ---------- SIKIŞTIRILMIŞ DOLGU: perdelerle çevrili iç alanı radye / temel üstünden döşeme altına (yoksa perde üstüne) kadar doldurur ---------- */
  const DOLGU = { stab: 'Sıkıştırılmış dolgu (stabilize)', kum: 'Sıkıştırılmış kum-çakıl', toprak: 'Sıkıştırılmış toprak dolgu' };
  T.dolgu = {
    label: 'Sıkıştırılmış dolgu', ifc: 'IfcBuildingElementProxy',
    prims: e => { const q = e.pts.map(p => [p[0], p[1], 0]), out = [P(q, true, { lw: 18, lt: 'DASHED' })]; const b = pbb(q), st = Math.max(0.25, Math.min(b[2] - b[0], b[3] - b[1]) / 12); for (let x = b[0] + st / 2; x < b[2]; x += st) for (let y = b[1] + st / 2; y < b[3]; y += st) { const pt = [x + ((Math.round(y / st) % 2) ? st / 2 : 0), y]; if (C.pointInPoly(pt, e.pts)) out.push(L([pt[0] - st * 0.06, pt[1], 0], [pt[0] + st * 0.06, pt[1], 0], { lw: 13 })); } return out; },
    mesh: e => { let pts = e.pts.map(p2); if (M.polyArea(pts) < 0) pts = pts.reverse(); const za = +e.za || 0, zb = +e.zb || 1; return zb > za ? [{ t: 'ext', o: [0, 0, za], ux: [1, 0, 0], uz: [0, 0, 1], prof: pts, h: zb - za }] : []; },
    xf: (e, X) => { const dz = dzOf(X); e.za = (+e.za || 0) + dz; e.zb = (+e.zb || 0) + dz; e.pts = e.pts.map(q => X.p([q[0], q[1], 0]).slice(0, 2)); },
    snaps: e => e.pts.map(q => ({ p: [q[0], q[1], 0], k: 'end' })),
    info: e => { const A = Math.abs(M.polyArea(e.pts.map(p2))), h = (+e.zb || 0) - (+e.za || 0); return `${DOLGU[e.malz] || DOLGU.stab} · alt kot ${M.fmt(+e.za || 0, 2)} · üst kot ${M.fmt(+e.zb || 0, 2)} · h=${M.fmt(h, 2)} m · alan ${M.fmt(A, 2)} m² · hacim ${M.fmt(A * h, 2)} m³`; },
  };
  const dolguCells = (zmid) => { // planda perde + kolon gövdeleriyle sınırlanan kapalı hücreler
    const bodies = []; for (const x of C.doc.ents) { if (!C.lyLive(x.layer) || !(x.type === 'perde' || x.type === 'kolon')) continue; for (const r of prismsOf(x)) if (r.za <= zmid && r.zb >= zmid) bodies.push(Object.assign({ e: x }, r)); }
    const segs = []; for (const b of bodies) for (let i = 0; i < b.q.length; i++) segs.push([b.q[i], b.q[(i + 1) % b.q.length]]);
    const inBody = pt => bodies.some(b => C.pointInPoly(pt, b.q));
    const cells = []; if (!segs.length) return { cells, bodies };
    for (const f of C.planarFaces(segs)) { const A = M.polyArea(f); if (A <= 1e-4) continue; let ip = null; try { const t = C.earClip(f)[0]; ip = [(f[t[0]][0] + f[t[1]][0] + f[t[2]][0]) / 3, (f[t[0]][1] + f[t[1]][1] + f[t[2]][1]) / 3]; } catch (err) { } if (!ip || inBody(ip)) continue; cells.push({ f, A, ip }); }
    return { cells, bodies };
  };
  const fndTop = q => { let z = null; for (const x of C.doc.ents) { if (!C.lyLive(x.layer)) continue; let t = null; if (x.type === 'plak' && x.kind === 'radye' && C.pointInPoly(q, x.pts)) t = +x.zt || 0; else if (x.type === 'temel') { const c = M.p3(x.p), r = (x.rot || 0) * RAD, dx = q[0] - c[0], dy = q[1] - c[1], lx = dx * Math.cos(-r) - dy * Math.sin(-r), ly = dx * Math.sin(-r) + dy * Math.cos(-r); if (Math.abs(lx) <= (+x.bx || 1.5) / 2 && Math.abs(ly) <= (+x.by || 1.5) / 2) t = +x.zt || 0; } if (t != null && (z == null || t > z)) z = t; } return z; };
  C.addCommand(['IDOLGU', 'DOLGU', 'SIKISTIRILMISDOLGU'], 'Sıkıştırılmış dolgu: perdelerle çevrili iç alana tıklayın (T = tüm iç alanlar). Alt kot radye / temel üstü, üst kot döşeme altı ya da perde üstü (otomatik) veya elle.', async (I) => {
    const r = await getParams('Sıkıştırılmış dolgu — ayarlar', [{ k: 'malz', t: 'Malzeme', opts: Object.entries(DOLGU), d: 'stab', al: ['MALZ'] }, { k: 'zaoto', t: 'Alt kot', opts: [['OTO', 'Radye / temel üstü (otomatik)'], ['EL', 'Elle']], d: 'OTO', al: ['ZAOTO'] }, { k: 'za', t: 'Alt kot — elle (m)', d: 0, al: ['ZA'] }, { k: 'zboto', t: 'Üst kot', opts: [['OTO', 'Döşeme altı / perde üstü (otomatik)'], ['EL', 'Elle']], d: 'OTO', al: ['ZBOTO'] }, { k: 'zb', t: 'Üst kot — elle (m)', d: 1, al: ['ZB'] }, { k: 'pay', t: 'Döşeme altında bırakılacak pay (cm, ör. grobeton/yalıtım)', d: 0, al: ['PAY'] }], 'dolgu'); if (!r) return;
    C.ensureLayer('INS_DOLGU', 33, 'CONTINUOUS', 18);
    const make = (cell) => {
      const za = r.zaoto === 'EL' ? r.za : fndTop(cell.ip); if (za == null) { C.warn('Bu alanın altında radye / temel yok: alt kotu elle verin (Alt kot = Elle).'); return null; }
      let zb = r.zb;
      if (r.zboto !== 'EL') { let wall = null; const { bodies } = dolguCells(za + 0.05); for (const b of bodies) if (b.e.type === 'perde' && cell.f.some(v => Math.min(...b.q.map(w => Math.hypot(w[0] - v[0], w[1] - v[1]))) < 0.02)) wall = Math.max(wall == null ? -Infinity : wall, b.zb); let slab = null; for (const x of C.doc.ents) if (x.type === 'plak' && x.kind !== 'radye' && C.lyLive(x.layer) && C.pointInPoly(cell.ip, x.pts)) { const bz = (+x.zt || 0) - (+x.t || 0.3); if (bz > za + 0.05 && (slab == null || bz < slab)) slab = bz; } zb = slab != null ? Math.min(slab, wall != null ? Math.max(wall, slab) : slab) : wall; if (zb == null) { C.warn('Üst kot bulunamadı (döşeme / perde yok): elle verin.'); return null; } zb -= cm(r.pay || 0); }
      if (!(zb > za + 0.01)) { C.warn('Üst kot alt kottan yüksek değil.'); return null; }
      const e = C.add(C.newEnt('dolgu', { pts: cell.f.map(p2), za: +za.toFixed(4), zb: +zb.toFixed(4), malz: r.malz, layer: 'INS_DOLGU' })); delete e.sp; C.log(T.dolgu.info(e)); return e;
    };
    let n = 0;
    for (; ;) {
      const p = await I.pt('Dolgu yapılacak iç alana tıklayın (T = tüm iç alanlar, Enter bitir)', { kw: [['T', 'TUMU', 'TÜMÜ']] });
      if (typeof p === 'string' && C.up(p.trim()) === 'T') { const zs = []; for (const x of C.doc.ents) if (C.lyLive(x.layer) && ((x.type === 'plak' && x.kind === 'radye') || x.type === 'temel')) zs.push(+x.zt || 0); const z = zs.length ? Math.max(...zs) : (r.za || 0); const { cells } = dolguCells((r.zaoto === 'EL' ? r.za : z) + 0.05); const have = C.doc.ents.filter(x => x.type === 'dolgu'); for (const c of cells) { if (have.some(h => C.pointInPoly(c.ip, h.pts))) continue; if (r.zaoto !== 'EL' && fndTop(c.ip) == null) continue; if (make(c)) n++; } break; }
      if (!p || typeof p === 'string') break;
      const za0 = r.zaoto === 'EL' ? r.za : fndTop(p); const { cells } = dolguCells((za0 == null ? 0 : za0) + 0.05);
      let best = null; for (const c of cells) if (C.pointInPoly(p, c.f) && (!best || c.A < best.A)) best = c;
      if (!best) { C.warn('Tıkladığınız nokta perdelerle kapalı bir alanın içinde değil.'); if (E.scriptMode && !E.queue.length) break; continue; }
      best = Object.assign({}, best, { ip: [p[0], p[1]] }); if (make(best)) n++;
      if (E.scriptMode && !E.queue.length) break;
    }
    if (n) C.log(`${n} dolgu alanı oluşturuldu.`);
  });
  C._ins = { MALZ, DOLGU, dolguCells, fndTop, hexa, newMesh, edgeLoop, hostFrame, segFrames, faceOffs, openingsOf, getParams, cm, pbb, kAxis };
  /* ---------- METRAJ ---------- */
  C.addCommand(['INSMETRAJ', 'BETONMETRAJ', 'YAPIMETRAJ'], 'İnşaat metrajı: beton sınıfına göre hacim (perde, kolon, kiriş, temel, döşeme), perde kalıp alanı, duvar alanı, pencere/kapı adetleri; isteğe bağlı tablo', async (I) => {
    const by = {}, add = (cls, k, v) => { const o = by[cls] || (by[cls] = {}); o[k] = (o[k] || 0) + v; };
    let kalip = 0, duvarA = 0, nP = 0, nK = 0, dolguV = 0;
    const MN = C.insMinha(), brut = {}, minha = {}, pairT = {}, mOf = e => { const m = MN.get(e.id); if (!m) return 0; for (const [k, v] of Object.entries(m.pairs)) { const key = `${m.cat} ∩ ${k}`; pairT[key] = (pairT[key] || 0) + v; } return m.minha; };
    const addN = (cls, k, v, e, ek) => { const m = MN.get(e.id); if (m && m.yeni) { mOf(e); brut[k] = (brut[k] || 0) + m.gross + (ek || 0); minha[k] = (minha[k] || 0) + m.minha; add(cls, k, m.net + (ek || 0)); return; } /* yeni: ham geometri − birleşim minhası (ek: kolon gusesi gibi prizma dışı hacim) */ const d = Math.min(v, mOf(e)); brut[k] = (brut[k] || 0) + v; minha[k] = (minha[k] || 0) + d; add(cls, k, v - d); };
    for (const e of C.doc.ents) {
      if (!C.lyLive(e.layer) && e.type !== 'acik') continue;
      if (e.type === 'perde') { if ((e.malz || 'beton') === 'beton') { addN(e.beton || 'C30/37', e.temel || e.kicker ? 'Temel' : 'Perde', perdeVol(e), e); if (!e.temel) kalip += perdeKalip(e); } else { const F = faceOffs(e), tm = Math.max(0.01, (F.tb + F.tt) / 2), dA = mOf(e) / tm; duvarA += Math.max(0, perdeKalip(e) / 2 - dA); minha.Duvar = (minha.Duvar || 0) + dA; } }
      else if (e.type === 'kolon') addN(e.beton || 'C30/37', 'Kolon', kolonVol(e), e, guseVol(e));
      else if (e.type === 'kiris') addN(e.beton || 'C30/37', 'Kiriş', kirisVol(e), e);
      else if (e.type === 'plak') addN(e.beton || 'C30/37', e.kind === 'radye' ? 'Temel' : 'Döşeme', plakVol(e), e);
      else if (e.type === 'temel') addN(e.beton || 'C30/37', 'Temel', (+e.bx || 1.5) * (+e.by || 1.5) * (+e.t || 0.6), e);
      else if (e.type === 'acik') { if (e.kind === 'kapi') nK++; else nP++; }
      else if (e.type === 'dolgu') { const g = Math.abs(M.polyArea(e.pts.map(p2))) * Math.max(0, (+e.zb || 0) - (+e.za || 0)), d = Math.min(g, mOf(e)); dolguV += g - d; minha.Dolgu = (minha.Dolgu || 0) + d; }
    }
    const mk = Object.keys(pairT).filter(k => pairT[k] > 5e-4);
    if (mk.length) C.log('MİNHA (çakışan hacim bir kez sayıldı — öncelik: temel > kolon > perde > kiriş > döşeme > duvar): ' + mk.map(k => `${k} ${pairT[k].toFixed(3)} m³`).join(' · ') + (minha.Duvar ? ` · duvar alanından ${minha.Duvar.toFixed(2)} m² düşüldü` : ''));
    const cats = ['Temel', 'Perde', 'Kolon', 'Kiriş', 'Döşeme'], rows = [];
    let tot = 0; for (const cls of Object.keys(by).sort()) { const o = by[cls], s = cats.reduce((x, c) => x + (o[c] || 0), 0); tot += s; rows.push([cls, ...cats.map(c => o[c] ? o[c].toFixed(2) : '-'), s.toFixed(2)]); C.log(`${cls}: ${cats.filter(c => o[c]).map(c => `${c} ${o[c].toFixed(2)}`).join(' · ')} → ${s.toFixed(2)} m³`); }
    C.log(`TOPLAM BETON (net, minhalar düşülmüş) ${tot.toFixed(2)} m³ ·${dolguV ? ` sıkıştırılmış dolgu ${dolguV.toFixed(2)} m³ ·` : ''} perde kalıbı ${kalip.toFixed(1)} m² · duvar ${duvarA.toFixed(1)} m² · ${nP} pencere · ${nK} kapı`);
    const KM = (C.kaplamaMetraj ? C.kaplamaMetraj() : []).concat(C.yalitimMetraj ? C.yalitimMetraj() : []).concat(C.catiMetraj ? C.catiMetraj() : []).concat(C.tretuvarMetraj ? C.tretuvarMetraj() : []); { let lv = 0, ln = 0; for (const x of C.doc.ents) if (x.type === 'perde' && C.lyLive(x.layer)) { const q = lentoVol(x); lv += q.V; ln += q.n; } if (ln) KM.unshift([`Lento betonu, demirsiz C16/20 (${ln} adet)`, 'm³', lv]); } for (const [ad, br, v] of KM) C.log(`Kaplama: ${ad} ${v.toFixed(2)} ${br}`);
    if (!rows.length && !dolguV && !KM.length) return;
    const p = await I.pt('Metraj tablosunun yeri (Enter = yerleştirme)'); if (!p || typeof p === 'string') return;
    const th = C.annoH(2.5), rh = th * 2.2, cw = [th * 9, ...cats.map(() => th * 8), th * 9], X = [p[0]]; for (const w of cw) X.push(X[X.length - 1] + w);
    const f2 = v => (v ? v.toFixed(2) : '-'), sb = cats.reduce((x, c) => x + (brut[c] || 0), 0), sm = cats.reduce((x, c) => x + (minha[c] || 0), 0);
    const all = [['BETON', ...cats.map(c => c + ' (m³)'), 'TOPLAM (m³)'], ...rows, ['BRÜT', ...cats.map(c => f2(brut[c])), sb.toFixed(2)], ['MİNHA (−)', ...cats.map(c => f2(minha[c])), sm.toFixed(2)], ['NET TOPLAM', ...cats.map(c => { const v = Object.values(by).reduce((x, o) => x + (o[c] || 0), 0); return f2(v); }), tot.toFixed(2)]];
    C.std('YAZI'); C.ensureLayer('METRAJ', 8, 'CONTINUOUS', 13);
    C.add(C.newEnt('text', { p: [X[0], p[1] + th * 0.8, 0], h: th * 1.2, s: `İNŞAAT METRAJI — kalıp ${kalip.toFixed(1)} m²${dolguV ? ` · sıkıştırılmış dolgu ${dolguV.toFixed(2)} m³` : ''} · duvar ${duvarA.toFixed(1)} m² · ${nP} pencere · ${nK} kapı`, rot: 0, al: 'L', layer: 'YAZI' }));
    for (let k = 0; k <= all.length; k++) C.add(C.newEnt('line', { a: [X[0], p[1] - k * rh, 0], b: [X[X.length - 1], p[1] - k * rh, 0], layer: 'METRAJ' }));
    for (const x of X) C.add(C.newEnt('line', { a: [x, p[1], 0], b: [x, p[1] - all.length * rh, 0], layer: 'METRAJ' }));
    all.forEach((r, k) => r.forEach((t, c) => C.add(C.newEnt('text', { p: [c === 0 ? X[c] + th * 0.5 : X[c + 1] - th * 0.5, p[1] - (k + 0.5) * rh - th / 2, 0], h: th * 0.9, s: t, rot: 0, al: c === 0 ? 'L' : 'R', layer: 'YAZI' }))));
    if (KM.length) { // ince işler (kaplama) tablosu
      const y0 = p[1] - (all.length + 2) * rh, w = [th * 30, th * 6, th * 9], XX = [X[0]]; for (const q of w) XX.push(XX[XX.length - 1] + q);
      const kr = [['KAPLAMA / YALITIM', 'Birim', 'Miktar'], ...KM.map(([ad, br, v]) => [ad, br, v.toFixed(2)])];
      C.add(C.newEnt('text', { p: [XX[0], y0 + th * 0.8, 0], h: th * 1.2, s: 'KAPLAMA / YALITIM METRAJI', rot: 0, al: 'L', layer: 'YAZI' }));
      for (let k = 0; k <= kr.length; k++) C.add(C.newEnt('line', { a: [XX[0], y0 - k * rh, 0], b: [XX[XX.length - 1], y0 - k * rh, 0], layer: 'METRAJ' }));
      for (const x of XX) C.add(C.newEnt('line', { a: [x, y0, 0], b: [x, y0 - kr.length * rh, 0], layer: 'METRAJ' }));
      kr.forEach((r, k) => r.forEach((t, c) => C.add(C.newEnt('text', { p: [c === 0 ? XX[c] + th * 0.5 : XX[c + 1] - th * 0.5, y0 - (k + 0.5) * rh - th / 2, 0], h: th * 0.9, s: t, rot: 0, al: c === 0 ? 'L' : 'R', layer: 'YAZI' }))));
    }
  });
  /* ---------- ÖLÇÜLERİ DÜZENLE (sağ tık): en, boy, yükseklik, kalınlık … ---------- */
  const isRect = q => q.length === 4 && [0, 1, 2, 3].every(i => { const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4]; const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]]; return Math.abs(u[0] * v[0] + u[1] * v[1]) < 1e-6 * (Math.hypot(...u) * Math.hypot(...v) + 1e-9); });
  const HZ = [['O', 'Orta'], ['L', 'Sol yüz'], ['R', 'Sağ yüz'], ['DIS', 'Dış yüz (kapalı)'], ['IC', 'İç yüz (kapalı)']];
  const SPEC = {
    perde: e => [{ k: 'tb', t: 'Alt kalınlık (cm)', cm: 1 }, { k: 'tt', t: 'Üst kalınlık (cm)', cm: 1 }, { k: 'h', t: 'Yükseklik (m)' }, { k: 'z0', t: 'Alt kot (m)' }, { k: 'ofs', t: 'Çizgiden öteleme (cm)', cm: 1 }, { k: 'hiza', t: 'Hiza', opts: HZ }, { k: 'egim', t: 'Eğimli yüz', opts: [['R', 'Sağ'], ['L', 'Sol'], ['B', 'İki yüz']] }, ...((e.malz || 'beton') === 'beton' ? [{ k: 'beton', t: 'Beton sınıfı', opts: BETON }] : [{ k: 'malz', t: 'Malzeme', opts: [['tugla', 'Tuğla'], ['gazbeton', 'Gazbeton'], ['briket', 'Briket']] }])],
    kolon: e => [{ k: 'sek', t: 'Kesit', opts: [['R', 'Dikdörtgen'], ['D', 'Dairesel']] }, { k: 'b', t: 'En b (cm)', cm: 1 }, { k: 'd', t: 'Boy d (cm)', cm: 1 }, { k: 'D', t: 'Çap Ø (cm)', cm: 1 }, { k: 'h', t: 'Yükseklik (m)' }, { k: 'z0', t: 'Alt kot (m)' }, { k: 'rot', t: 'Açı (°)' }, { k: 'beton', t: 'Beton sınıfı', opts: BETON }, { k: 'guse', t: 'Guse (vinç kirişi konsolu)', opts: [['H', 'Yok'], ['E', 'Var']], tab: 'Guse (vinç konsolu)' }, { k: 'gYon', t: 'Yön (kolon yüzü)', opts: GUSE_YON, tab: 'Guse (vinç konsolu)' }, { k: 'gRef', t: 'Üst kot tanımı', opts: [['UST', 'Kolon üstünden aşağı mesafe'], ['KOT', 'Mutlak proje kotu']], tab: 'Guse (vinç konsolu)' }, { def: 1, k: 'gZ', t: 'Üst kot değeri (m)', tab: 'Guse (vinç konsolu)' }, { def: 40, k: 'gL', t: 'Çıkma (cm)', cm: 1, tab: 'Guse (vinç konsolu)' }, { def: 60, k: 'gHf', t: 'Kolon yüzünde yükseklik (cm)', cm: 1, tab: 'Guse (vinç konsolu)' }, { def: 30, k: 'gHu', t: 'Uçta yükseklik (cm)', cm: 1, tab: 'Guse (vinç konsolu)' }, { def: 0, k: 'gW', t: 'Genişlik (cm, 0 = kolon yüzü)', cm: 1, tab: 'Guse (vinç konsolu)' }],
    kiris: e => [{ k: 'bw', t: 'Genişlik (cm)', cm: 1 }, { k: 'hb', t: 'Yükseklik (cm)', cm: 1 }, { k: '_L', t: 'Boy (m)' }, { k: 'zt', t: 'Üst kot (m)' }, { k: 'hiza', t: 'Hiza', opts: [['O', 'Eksen'], ['L', 'Sol yüz'], ['R', 'Sağ yüz']] }, { k: 'beton', t: 'Beton sınıfı', opts: BETON }],
    plak: e => [...(isRect(e.pts) ? [{ k: '_en', t: 'En (m)' }, { k: '_boy', t: 'Boy (m)' }] : []), { k: 't', t: 'Kalınlık (cm)', cm: 1 }, { k: 'zt', t: 'Üst kot (m)' }, { k: '_za', t: 'Alt kot (m)' }, ...(e.kind !== 'radye' && e.cati ? [{ k: '_ph', t: 'Parapet yüksekliği (m, 0 = yok)' }, { k: '_pt', t: 'Parapet kalınlığı (cm)' }] : []), { k: 'beton', t: 'Beton sınıfı', opts: BETON }],
    temel: e => [{ k: 'bx', t: 'En bx (cm)', cm: 1 }, { k: 'by', t: 'Boy by (cm)', cm: 1 }, { k: 't', t: 'Yükseklik (cm)', cm: 1 }, { k: 'zt', t: 'Üst kot (m)' }, { k: 'rot', t: 'Açı (°)' }, { k: 'beton', t: 'Beton sınıfı', opts: BETON }],
    dolgu: e => [{ k: 'za', t: 'Alt kot (m)' }, { k: 'zb', t: 'Üst kot (m)' }, { k: 'malz', t: 'Malzeme', opts: Object.entries(DOLGU) }],
    acik: e => [{ k: 'w', t: 'Genişlik (cm)', cm: 1 }, { k: 'hh', t: 'Yükseklik (cm)', cm: 1 }, ...(e.kind === 'kapi' ? [{ k: 'kTip', t: 'Kapı tipi', opts: [['', 'Kapı (ahşap)'], ['S', 'Seksiyonel kapı'], ['C', 'Çelik kapı']] }] : []), ...(e.kTip === 'S' ? [{ def: 50, k: 'pnl', t: 'Panel yüksekliği (cm)', cm: 1 }, { k: 'ray', t: 'Tavan rayı (planda)', opts: [['true', 'Göster'], ['false', 'Gösterme']] }] : e.kTip === 'C' ? [{ def: 5, k: 'kasa', t: 'Kasa genişliği (cm)', cm: 1 }] : []), ...(e.kind === 'kapi' && e.kTip !== 'S' ? [{ k: 'kanat', t: 'Kanat', opts: [['1', 'Tek'], ['2', 'Çift']] }, { k: 'yon', t: 'Açılış yönü', opts: [['L', 'Sol taraf'], ['R', 'Sağ taraf']] }, { k: 'el', t: 'Menteşe', opts: [['L', 'Başta'], ['S', 'Sonda']] }] : [{ k: 'par', t: 'Zeminden yükseklik (cm)', cm: 1 }]), { k: 's', t: 'Konum (duvar başından, m)' }, { k: 'lento', t: 'Lento', opts: [['true', 'Var'], ['false', 'Yok']] }, { k: 'lb', t: 'Lento taşması (cm, her yandan)', cm: 1 }, { k: 'lh', t: 'Lento yüksekliği (cm, 0 = duvar kalınlığı)', cm: 1 }],
    box: e => [{ k: 'sx', t: 'En X (m)' }, { k: 'sy', t: 'Boy Y (m)' }, { k: 'sz', t: 'Yükseklik Z (m)' }],
    cyl: e => [{ k: 'r', t: 'Yarıçap (m)' }, { k: 'h', t: 'Yükseklik (m)' }],
    kati: e => [{ k: 'h', t: 'Yükseklik / kalınlık (m)' }],
    tank: e => [{ k: 'L', t: 'İç boy (m)' }, { k: 'W', t: 'İç en (m)' }, { k: 'H', t: 'Derinlik (m)' }, { k: 'tw', t: 'Duvar kalınlığı (m)' }, { k: 'tb', t: 'Taban kalınlığı (m)' }, { k: 'zt', t: 'Üst kot (m)' }],
    ctank: e => [{ k: 'D', t: 'İç çap (m)' }, { k: 'H', t: 'Derinlik (m)' }, { k: 'tw', t: 'Duvar kalınlığı (m)' }, { k: 'zt', t: 'Üst kot (m)' }],
    wall: e => [{ k: 't', t: 'Kalınlık (m)' }, { k: 'h', t: 'Yükseklik (m)' }, { k: 'z', t: 'Taban kotu (m)' }],
    slab: e => [{ k: 't', t: 'Kalınlık (m)' }, { k: 'z', t: 'Kot (m)' }],
    circle: e => [{ k: 'r', t: 'Yarıçap (m)' }],
  };
  C.canEditDims = e => !!(e && SPEC[e.type]);
  C.editDims = async e => {
    if (!e || !SPEC[e.type]) { if (C.openProps) { C.sel = [e]; C.emit('selection'); C.openProps(); } return; }
    const fs = SPEC[e.type](e), vals = {};
    for (const f of fs) {
      if (f.k === '_L') vals._L = +M.dist2(e.a, e.b).toFixed(4);
      else if (f.k === '_en') vals._en = +M.dist2(e.pts[0], e.pts[1]).toFixed(4);
      else if (f.k === '_boy') vals._boy = +M.dist2(e.pts[1], e.pts[2]).toFixed(4);
      else if (f.k === '_za') vals._za = +((+e.zt || 0) - (+e.t || 0.3)).toFixed(4);
      else if (f.k === '_ph') { const pp = parapetOf(e); vals._ph = pp ? +(+pp.h).toFixed(3) : 0; }
      else if (f.k === '_pt') { const pp = parapetOf(e); vals._pt = pp ? +((+pp.tb) * 100).toFixed(1) : 20; }
      else { const v = e[f.k]; vals[f.k] = f.opts ? (v == null ? (f.opts[0][0]) : String(v)) : (v == null || v === '' ? (f.def != null ? f.def : '') : +(f.cm ? (+v) * 100 : +v).toFixed(4)); }
    }
    const fields = fs.map(f => Object.assign({ d: vals[f.k] }, f));
    const r = await dialog(`${(T[e.type] && T[e.type].label) || e.type} — ölçüler`, fields, vals, 'Uygula'); if (!r) return;
    C.undoStack.push(C.snapshot()); C.redoStack = [];
    for (const f of fs) {
      const v = r[f.k]; if (v === '' || v == null || (typeof v === 'number' && !isFinite(v))) continue;
      if (f.k === '_L') { if (v > 0) { const u = M.norm(M.sub(M.p3(e.b), M.p3(e.a))); e.b = M.add(M.p3(e.a), M.mul(u, v)); } continue; }
      if (f.k === '_en' || f.k === '_boy') continue;
      if (f.k === '_za' || f.k === '_ph' || f.k === '_pt') continue;
      e[f.k] = f.opts ? (f.k === 'kanat' ? +v : v === 'true' ? true : v === 'false' ? false : v) : (f.cm ? v / 100 : v);
    }
    if (r._za != null && isFinite(r._za) && Math.abs(r._za - vals._za) > 1e-9) e.zt = r._za + (+e.t || 0.3); // alt kot verildiyse üstü buna göre
    if (e.type === 'plak' && isRect(e.pts) && (r._en > 0 || r._boy > 0)) { const p0 = e.pts[0], u = M.norm([e.pts[1][0] - p0[0], e.pts[1][1] - p0[1], 0]), w = M.norm([e.pts[3][0] - p0[0], e.pts[3][1] - p0[1], 0]), en = r._en > 0 ? r._en : vals._en, by = r._boy > 0 ? r._boy : vals._boy; e.pts = [p0, [p0[0] + u[0] * en, p0[1] + u[1] * en], [p0[0] + u[0] * en + w[0] * by, p0[1] + u[1] * en + w[1] * by], [p0[0] + w[0] * by, p0[1] + w[1] * by]].map(p2); }
    if (e.type === 'plak' && r._ph != null && isFinite(r._ph)) { const pp = parapetOf(e); setParapet(e, +r._ph, (+r._pt > 0 ? +r._pt : 20) / 100, pp ? pp.malz : 'beton'); }
    if (e.type === 'box' && C.T.box && C.T.box.sync) C.T.box.sync(e);
    delete e._c; C.changed(); C.emit('selection'); C.log('Ölçüler güncellendi: ' + ((T[e.type] && T[e.type].info) ? T[e.type].info(e) : e.type));
  };
  C.addCommand(['OLCUDUZENLE', 'EBAT', 'BOYUTLAR'], 'Seçilen elemanın en / boy / yükseklik / kalınlık ölçülerini pencereyle düzenler (sağ tık › Ölçüleri düzenle)', async (I) => { const s = await I.sel('Eleman seçin'); if (s.length) await C.editDims(s[0]); }, { noUndo: true });
  /* sağ tık menüsü (plan ve 3B) */
  C.entMenu = (ent, cx, cy) => {
    document.querySelectorAll('.rdrop.entm').forEach(x => x.remove());
    const m = document.createElement('div'); m.className = 'rdrop entm';
    const lbl = (T[ent.type] && T[ent.type].label) || ent.type;
    const sel = () => { if (!C.sel.includes(ent)) { C.sel = [ent]; C.emit('selection'); } };
    const items = [[`📐 Ölçüleri düzenle (${lbl})…`, () => C.editDims(ent)], ['☰ Özellikler', () => { sel(); C.openProps && C.openProps(); }], ['✥ Taşı', () => { sel(); C.runTool('MOVE'); }], ['⧉ Kopyala', () => { sel(); C.runTool('COPY'); }], ['↻ Döndür', () => { sel(); C.runTool('ROTATE'); }], ['⤢ Ölçekle', () => { sel(); C.runTool('SCALE'); }], ['✕ Sil', () => { sel(); C.runTool('ERASE'); }]];
    if (C.cmd.last || C.lastCmd) items.push(['↺ Son komutu tekrarla', () => C.cmd.enter()]);
    for (const [t, fn] of items) { const b = document.createElement('button'); b.textContent = t; b.onclick = () => { m.remove(); fn(); }; m.appendChild(b); }
    document.body.appendChild(m); m.style.left = Math.min(cx, innerWidth - 260) + 'px'; m.style.top = Math.min(cy, innerHeight - 260) + 'px';
    const off = ev => { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); } }; setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
  };
  /* metraj ve malzeme tabloları 2B çizimdir: 3B sekmesinde çalıştırılsa da planda tam görünür (3B'de gizli) */
  for (const nm of ['INSMETRAJ', 'BOMTABLO']) { const d0 = C.cmds[nm]; if (d0) C.addCommand(d0.names, d0.help, async (I, Cx) => { C._gvCur = 'T' + Date.now().toString(36); try { return await d0.fn(I, Cx); } finally { C._gvCur = null; } }, d0.opts); }
  /* 3B yakalama: kolon köşe çizgilerinin döşeme / perde / kiriş / temel üst-alt seviyeleriyle kesişimi (dış köşe noktaları) */
  C.insaatSnap3D = () => {
    if (!C.doc) return []; const lv = new Set(), out = [];
    for (const x of C.doc.ents) { if (!C.lyLive(x.layer)) continue; if (x.type === 'plak') { lv.add(+x.zt || 0); lv.add((+x.zt || 0) - (+x.t || 0.3)); } else if (x.type === 'perde') { lv.add(+x.z0 || 0); lv.add((+x.z0 || 0) + (+x.h || 3)); } else if (x.type === 'kiris') { lv.add(+x.zt || 0); lv.add((+x.zt || 0) - (+x.hb || 0.5)); } else if (x.type === 'temel') lv.add(+x.zt || 0); }
    for (const k of C.doc.ents) {
      if (k.type !== 'kolon' || !C.lyLive(k.layer)) continue; const z0 = +k.z0 || 0, z1 = z0 + (+k.h || 3), poly = kolonPoly(k), corners = k.sek === 'D' ? poly.filter((_, i) => i % 4 === 0) : poly;
      for (const z of lv) if (z > z0 + 1e-6 && z < z1 - 1e-6) for (const c of corners) out.push({ p: [c[0], c[1], z], k: 'int', e: k });
    }
    return out;
  };
  C.insaat = { faceOffs, segFrames, perdeVol, BETON };
})(window.C);

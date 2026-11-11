/* ArıtmaCAD — İNŞAAT ELEMANLARINDA BOŞLUK (İT/ÇEK ile) — döşeme, radye, perde, duvar, kiriş, kolon, temel …
   Kullanım: 3B'de elemanın yüzüne dikdörtgen / daire / kapalı çoklu çizgi çizin → İT/ÇEK → şeklin içine tıklayıp içeri itin
   (arka yüze tıklarsanız boydan boya delik). BOSLUKSIL ile kaldırılır. Aşağıdaki eski açıklama veri yapısı içindir.
   BOSLUK: elemanı seçin / tıklayın → boşluk şekli:
     R  planda dikdörtgen (iki köşe) + alt / üst kot      (döşeme, radye, temel, kiriş, perde — düşey geçiş)
     D  planda daire (merkez, yarıçap) + alt / üst kot
     S  seçili kapalı şekil (çoklu çizgi / dikdörtgen / daire) + alt / üst kot
     DR duvarda / kirişte dikdörtgen boşluk: yüzdeki nokta, genişlik, alt kot, yükseklik (yatay geçiş, eleman kalınlığınca)
     DD duvarda / kirişte dairesel delik (boru geçişi): nokta, eksen kotu, çap
     K  boşluğu kaldır (planda boşluğun içine tıklayın)
   Kot sorulduğunda Enter: elemanın tamamı (boydan boya). Birden çok eleman seçilirse boşluk hepsinden düşülür.
   Boşluk elemanın 3B ağından katı çıkarma (BSP-CSG) ile düşülür: 3B'de, kesitlerde ve görünüşlerde görünür; planda kesik çizgi
   (düşey boşlukta çarpı) ile gösterilir; eleman taşınınca / döndürülünce boşluk da gider. Veri: e.bosluk3 = [{pts:[[x,y,z]…], d:[dx,dy,dz]}] */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, P } = C.prim;

  /* ================= CSG (BSP ağacı, Evan Wallace csg.js yöntemi) ================= */
  const EPS = 1e-5;
  const V = { sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; } };
  class Plane { constructor(n, w) { this.n = n; this.w = w; } static from(a, b, c) { const n = V.norm(V.cross(V.sub(b, a), V.sub(c, a))); return new Plane(n, V.dot(n, a)); } flip() { this.n = [-this.n[0], -this.n[1], -this.n[2]]; this.w = -this.w; }
    split(poly, cpf, cpb, f, b) {
      const COP = 0, FR = 1, BK = 2, SP = 3; let pt = 0; const ty = [];
      for (const v of poly.v) { const t = V.dot(this.n, v) - this.w, k = t < -EPS ? BK : t > EPS ? FR : COP; pt |= k; ty.push(k); }
      if (pt === COP) (V.dot(this.n, poly.pl.n) > 0 ? cpf : cpb).push(poly);
      else if (pt === FR) f.push(poly); else if (pt === BK) b.push(poly);
      else { const fv = [], bv = []; for (let i = 0; i < poly.v.length; i++) { const j = (i + 1) % poly.v.length, ti = ty[i], tj = ty[j], vi = poly.v[i], vj = poly.v[j]; if (ti !== BK) fv.push(vi); if (ti !== FR) bv.push(vi); if ((ti | tj) === SP) { const t = (this.w - V.dot(this.n, vi)) / V.dot(this.n, V.sub(vj, vi)), v = V.lerp(vi, vj, t); fv.push(v); bv.push(v.slice()); } } if (fv.length >= 3) f.push(new Poly(fv, poly.s, poly.pl)); if (bv.length >= 3) b.push(new Poly(bv, poly.s, poly.pl)); }
    } }
  class Poly { constructor(v, s, pl) { this.v = v; this.s = s; this.pl = pl || Plane.from(v[0], v[1], v[2]); } flip() { this.v.reverse(); this.pl = new Plane(this.pl.n.map(x => -x), -this.pl.w); } clone() { return new Poly(this.v.map(x => x.slice()), this.s, new Plane(this.pl.n.slice(), this.pl.w)); } }
  class Node {
    constructor(ps) { this.pl = null; this.f = null; this.b = null; this.ps = []; if (ps) this.build(ps); }
    invert() { for (const p of this.ps) p.flip(); if (this.pl) this.pl.flip(); if (this.f) this.f.invert(); if (this.b) this.b.invert(); const t = this.f; this.f = this.b; this.b = t; }
    clipPolys(ps) { if (!this.pl) return ps.slice(); let f = [], b = []; for (const p of ps) this.pl.split(p, f, b, f, b); if (this.f) f = this.f.clipPolys(f); b = this.b ? this.b.clipPolys(b) : []; return f.concat(b); }
    clipTo(bsp) { this.ps = bsp.clipPolys(this.ps); if (this.f) this.f.clipTo(bsp); if (this.b) this.b.clipTo(bsp); }
    all() { let o = this.ps.slice(); if (this.f) o = o.concat(this.f.all()); if (this.b) o = o.concat(this.b.all()); return o; }
    build(ps) { if (!ps.length) return; if (!this.pl) this.pl = new Plane(ps[0].pl.n.slice(), ps[0].pl.w); const f = [], b = []; for (const p of ps) this.pl.split(p, this.ps, this.ps, f, b); if (f.length) { if (!this.f) this.f = new Node(); this.f.build(f); } if (b.length) { if (!this.b) this.b = new Node(); this.b.build(b); } }
  }
  const fark = (A, B) => { const a = new Node(A.map(p => p.clone())), b = new Node(B.map(p => p.clone())); a.invert(); a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert(); a.build(b.all()); a.invert(); return a.all(); };
  C.csgFark = fark;

  /* ağ ↔ çokgen */
  const agdanPoly = descs => {
    const out = [];
    for (const d of descs) {
      let t; try { t = C.meshTris(d, { pos: [], nrm: [], edges: [] }); } catch (er) { continue; }
      const p = t.pos, col = t.col;
      for (let i = 0; i < p.length; i += 9) { const a = [p[i], p[i + 1], p[i + 2]], b = [p[i + 3], p[i + 4], p[i + 5]], c = [p[i + 6], p[i + 7], p[i + 8]]; const n = V.cross(V.sub(b, a), V.sub(c, a)); if (Math.hypot(n[0], n[1], n[2]) < 1e-12) continue; const s = col && col[i / 3] >= 0 ? [col[i], col[i + 1], col[i + 2]] : null; out.push(new Poly([a, b, c], s)); }
    }
    return out;
  };
  const prizma = (b) => { // b: {pts (düzlemsel), d}: kapalı prizma çokgenleri (dışa bakan)
    let A = b.pts.map(q => [q[0], q[1], q[2] || 0]); const d = b.d, Bt = Array.isArray(b.ptsB) && b.ptsB.length === A.length ? b.ptsB.map(q => [q[0], q[1], q[2] || 0]) : A.map(q => [q[0] + d[0], q[1] + d[1], q[2] + d[2]]); // ptsB: kesik koni / piramit (pah)
    const n = V.cross(V.sub(A[1], A[0]), V.sub(A[2], A[0])); let s = 0; for (let i = 0; i < A.length; i++) { const q = A[i], r = A[(i + 1) % A.length]; s += V.dot(V.cross(q, r), V.norm(d)); }
    const ters = s > 0; // taban d yönüne bakıyorsa çevir (taban dışa = −d)
    const A2 = ters ? A.slice().reverse() : A, B2 = ters ? Bt.slice().reverse() : Bt; void n;
    const nd = V.norm(d), plA = () => new Plane([-nd[0], -nd[1], -nd[2]], -V.dot(nd, A2[0])), plB = () => new Plane(nd.slice(), V.dot(nd, B2[0])), ps = [];
    // içbükey tabanlar üçgenlere bölünür (BSP dışbükey çokgen ister)
    const ax = Math.abs(nd[0]) > Math.abs(nd[1]) ? (Math.abs(nd[0]) > Math.abs(nd[2]) ? 0 : 2) : (Math.abs(nd[1]) > Math.abs(nd[2]) ? 1 : 2), pr = q => (ax === 0 ? [q[1], q[2]] : ax === 1 ? [q[0], q[2]] : [q[0], q[1]]);
    const disbukey = (() => { let sg = 0; for (let i = 0; i < A2.length; i++) { const a = pr(A2[i]), b = pr(A2[(i + 1) % A2.length]), c = pr(A2[(i + 2) % A2.length]), cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (Math.abs(cr) < 1e-12) continue; if (!sg) sg = Math.sign(cr); else if (Math.sign(cr) !== sg) return false; } return true; })();
    if (disbukey) { ps.push(new Poly(A2.slice(), null, plA()), new Poly(B2.slice().reverse(), null, plB())); }
    else { const P2 = A2.map(pr), ccw2 = M.polyArea(P2) > 0, idx = ccw2 ? P2.map((_, i) => i) : P2.map((_, i) => P2.length - 1 - i), tris = C.earClip(idx.map(i => P2[i])).map(t => t.map(k => idx[k]));
      for (const t of tris) { const tA = t.map(k => A2[k]), tB = t.map(k => B2[k]); const pa = new Poly(tA.slice(), null, plA()); if (V.dot(V.cross(V.sub(tA[1], tA[0]), V.sub(tA[2], tA[0])), pa.pl.n) < 0) pa.v.reverse(); ps.push(pa); const pb = new Poly(tB.slice(), null, plB()); if (V.dot(V.cross(V.sub(tB[1], tB[0]), V.sub(tB[2], tB[0])), pb.pl.n) < 0) pb.v.reverse(); ps.push(pb); } }
    for (let i = 0; i < A2.length; i++) { const j = (i + 1) % A2.length; ps.push(new Poly([A2[i], B2[i], B2[j], A2[j]], null)); }
    return ps;
  };
  const polydenAg = (ps, varsCol) => {
    const out = { t: 'tri', v: [], f: [], fc: [], edges3: [] };
    for (const p of ps) { const v0 = out.v.length; p.v.forEach(q => out.v.push(q)); for (let i = 1; i < p.v.length - 1; i++) { out.f.push([v0, v0 + i, v0 + i + 1]); out.fc.push(p.s || varsCol || [0.75, 0.75, 0.72]); } }
    // kenar çizgileri: her düzlem grubunun sınırı (aynı düzlemdeki bölünme kenarları ve T-birleşimleri çizilmez)
    const r4 = v => Math.round(v * 1e4), gr = new Map();
    for (const p of ps) { const n = p.pl.n, k = [r4(n[0]), r4(n[1]), r4(n[2]), Math.round(p.pl.w * 1e3)].join(','); if (!gr.has(k)) gr.set(k, []); gr.get(k).push(p); }
    for (const g of gr.values()) {
      const lines = new Map();
      for (const p of g) for (let i = 0; i < p.v.length; i++) {
        const a = p.v[i], b = p.v[(i + 1) % p.v.length], d0 = V.sub(b, a), l = Math.hypot(d0[0], d0[1], d0[2]); if (l < 1e-7) continue;
        let d = [d0[0] / l, d0[1] / l, d0[2] / l], sg = 1; const big = Math.abs(d[0]) > 1e-6 ? 0 : Math.abs(d[1]) > 1e-6 ? 1 : 2; if (d[big] < 0) { d = d.map(x => -x); sg = -1; }
        const ta = V.dot(a, d), o = [a[0] - d[0] * ta, a[1] - d[1] * ta, a[2] - d[2] * ta], key = [r4(d[0]), r4(d[1]), r4(d[2]), Math.round(o[0] * 2000), Math.round(o[1] * 2000), Math.round(o[2] * 2000)].join(',');
        if (!lines.has(key)) lines.set(key, { d, o, iv: [] }); const tb = V.dot(b, d); lines.get(key).iv.push([Math.min(ta, tb), Math.max(ta, tb), sg]);
      }
      for (const L0 of lines.values()) {
        const br = [...new Set(L0.iv.flatMap(q => [q[0], q[1]]))].sort((x, y) => x - y);
        for (let i = 0; i < br.length - 1; i++) { const m = (br[i] + br[i + 1]) / 2; let sm = 0; for (const q of L0.iv) if (m > q[0] && m < q[1]) sm += q[2]; if (sm !== 0) { const P = t => [L0.o[0] + L0.d[0] * t, L0.o[1] + L0.d[1] * t, L0.o[2] + L0.d[2] * t]; const last = out.edges3[out.edges3.length - 1]; if (last && last._k === L0 && Math.abs(last._t - br[i]) < 1e-7) { last[1] = P(br[i + 1]); last._t = br[i + 1]; } else { const e2 = [P(br[i]), P(br[i + 1])]; e2._k = L0; e2._t = br[i + 1]; out.edges3.push(e2); } } }
      }
    }
    out.edges3 = out.edges3.map(e2 => [e2[0], e2[1]]);
    if (!ps.some(p => p.s)) delete out.fc;
    return out;
  };

  /* ================= boşluklu eleman ağı ================= */
  const TIPLER = ['plak', 'perde', 'kiris', 'kolon', 'temel', 'dolgu', 'kati', 'box', 'slab', 'cati', 'merdiven'];
  const bosluklar = e => (Array.isArray(e.bosluk3) ? e.bosluk3.filter(b => b && Array.isArray(b.pts) && b.pts.length >= 3 && Array.isArray(b.d)) : []);
  const varsayilanRenk = e => { const c = C.aciRgb ? C.aciRgb(e.color && e.color !== 256 ? e.color : (C.layer(e.layer).color || 7)) : [190, 190, 185]; return [0.74, 0.74, 0.71]; void c; };
  // yerel fark: yalnız boşluk prizmasının kutusuyla kesişen çokgenler CSG'ye girer (büyük / eğri elemanlarda yığın taşmasını ve yavaşlığı önler)
  const kutu = ps => { const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; for (const p of ps) for (const v of p.v) for (let k = 0; k < 3; k++) { if (v[k] < b[k]) b[k] = v[k]; if (v[k] > b[k + 3]) b[k + 3] = v[k]; } return b; };
  const farkYerel = (ps, pr) => { const K = kutu(pr), e = 1e-3, ic = [], dis = []; for (const p of ps) { const k = kutu([p]); (k[0] > K[3] + e || k[3] < K[0] - e || k[1] > K[4] + e || k[4] < K[1] - e || k[2] > K[5] + e || k[5] < K[2] - e ? dis : ic).push(p); } const temiz = q => q.filter(p => { if (!p || !p.v || p.v.length < 3 || !p.pl || !isFinite(p.pl.w) || !p.pl.n.every(isFinite)) return false; let a = 0; for (let i = 1; i < p.v.length - 1; i++) { const c = V.cross(V.sub(p.v[i], p.v[0]), V.sub(p.v[i + 1], p.v[0])); a += Math.hypot(c[0], c[1], c[2]); } return a > 1e-9; });
    if (!ic.length) return ps;
    const kaydir = (q, d) => q.map(p => { const v = p.v.map(x => [x[0] + d[0], x[1] + d[1], x[2] + d[2]]); return new Poly(v, p.s); });
    for (const d of [[0, 0, 0], [3.1e-4, 1.7e-4, 2.3e-4], [-2.9e-4, 3.7e-4, -1.3e-4], [1.1e-3, -0.7e-3, 0.9e-3]]) { // eş düzlem / dejenere durumda (sonsuz özyineleme) çok küçük kaydırmayla yeniden dene
      try { return dis.concat(temiz(fark(temiz(ic), temiz(d[0] || d[1] || d[2] ? kaydir(pr, d) : pr)))); } catch (er) { if (!(er instanceof RangeError)) throw er; } }
    throw new Error('boşluk çıkarılamadı'); };
  // düşey ve elemanı boydan boya geçen prizma boşluk mu? (pahsız, tabanı yatay, kalınlığın tamamını kesiyor)
  const dusDelik = (b, za, zt) => { if (b.ptsB || Math.hypot(b.d[0] || 0, b.d[1] || 0) > 1e-6 || !(Math.abs(b.d[2] || 0) > 1e-9)) return false; const z0 = b.pts[0][2] || 0; if (!b.pts.every(q => Math.abs((q[2] || 0) - z0) < 1e-6)) return false; const z1 = z0 + b.d[2]; return Math.min(z0, z1) <= za + 1e-4 && Math.max(z0, z1) >= zt - 1e-4; };
  for (const ty of TIPLER) {
    const D = T[ty]; if (!D || !D.mesh || D._bosluk) continue; D._bosluk = true;
    const m0 = D.mesh, p0 = D.prims, x0 = D.xf, i0 = D.info;
    D.mesh = e => { let base = m0(e), B = bosluklar(e); if (!B.length || !base) return base;
      if (ty === 'plak' && C.insPlakDelikliAg) { // döşeme / radye: düşey, boydan boya boşluklar 2B çokgen farkıyla açılır (CSG eş düzlemli yüzlerde döşemeyi bozuyordu)
        try { const zt = +e.zt || 0, za = zt - (+e.t || 0.3), dus = [], kalan = []; for (const b of B) (dusDelik(b, za, zt) ? dus : kalan).push(b);
          if (dus.length) { const ag = C.insPlakDelikliAg(e, dus.map(b => b.pts.map(q => [q[0], q[1]]))); if (ag && ag.f && ag.f.length) { base = [ag]; B = kalan; if (!B.length) return base; } }
        } catch (er) { console.error('boşluk (2B)', er); } }
      try { let ps = agdanPoly(base.filter(Boolean)); for (const b of B) ps = farkYerel(ps, prizma(b)); return [polydenAg(ps, varsayilanRenk(e))]; } catch (er) { console.error('boşluk', er); return base; } };
    if (p0) D.prims = e => { const out = p0(e), B = bosluklar(e); for (const b of B) out.push(...sembol(b)); return out; };
    if (x0) D.xf = (e, X) => { if (Array.isArray(e.bosluk3)) e.bosluk3 = e.bosluk3.map(b => { const pts = b.pts.map(q => { const r = X.p([q[0], q[1], q[2] || 0]); return [r[0], r[1], r[2] != null ? r[2] : q[2]]; }); const o = X.p([0, 0, 0]), dd = X.p([b.d[0], b.d[1], b.d[2]]); const tp = q => { const r = X.p([q[0], q[1], q[2] || 0]); return [r[0], r[1], r[2] != null ? r[2] : q[2]]; }; return Object.assign({}, b, { pts, d: [dd[0] - o[0], dd[1] - o[1], (dd[2] != null && o[2] != null ? dd[2] - o[2] : b.d[2])] }, Array.isArray(b.ptsB) ? { ptsB: b.ptsB.map(tp) } : {}); }); return x0(e, X); };
    if (i0) D.info = e => { const n = bosluklar(e).length; return i0(e) + (n ? ` · ${n} boşluk` : ''); };
  }
  /* başka modüller için: ağ tanımlarından (descs) prizma boşlukları {pts, d} düş; kenar çizgileri düzlem gruplarından yeniden çizilir (birleşme izi kalmaz) */
  C.boslukAg = (descs, B, renk) => { let ps = agdanPoly(descs.filter(Boolean)); for (const b of (B || [])) ps = farkYerel(ps, prizma(b)); return polydenAg(ps, renk); };
  /* planda sembol: düşey boşluk → kesik çerçeve + çarpı; yatay geçiş → kesik çerçeve */
  const sembol = b => {
    const dz = Math.abs(b.d[2]) > Math.hypot(b.d[0], b.d[1]);
    let q = dz ? b.pts.map(v => [v[0], v[1], 0]) : (() => { const all = b.pts.concat(b.pts.map(v => [v[0] + b.d[0], v[1] + b.d[1], 0])).map(v => [v[0], v[1]]); return hull(all).map(v => [v[0], v[1], 0]); })();
    if (q.length < 2) return [];
    const out = [P(q, true, { lw: 25, lt: 'DASHED' })];
    if (dz) { const xs = q.map(v => v[0]), ys = q.map(v => v[1]), a = [Math.min(...xs), Math.min(...ys), 0], c = [Math.max(...xs), Math.max(...ys), 0]; if (q.length === 4) out.push(L(q[0], q[2], { lw: 13 }), L(q[1], q[3], { lw: 13 })); else { const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2], k = Math.min(c[0] - a[0], c[1] - a[1]) / 2 * 0.7071; out.push(L([m[0] - k, m[1] - k, 0], [m[0] + k, m[1] + k, 0], { lw: 13 }), L([m[0] - k, m[1] + k, 0], [m[0] + k, m[1] - k, 0], { lw: 13 })); } }
    return out;
  };
  const hull = pts => { const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); };

  /* ================= İT / ÇEK İLE BOŞLUK =================
     Elemanın yüzüne çizilen kapalı şekil (dikdörtgen, daire, çoklu çizgi) İT/ÇEK ile içeri itilince
     eleman (perde, döşeme, radye, kiriş, kolon, temel …) o şekilde oyulur: cep ya da arka yüze kadar delik. */
  const INS = new Set(TIPLER.filter(t => !['kati', 'box', 'slab'].includes(t)));
  const kalinlik = (e, c, n) => { // c noktasından −n yönünde elemanın içinden çıkış mesafesi
    const t0 = C.entTris(e), p = t0 && t0.pos; if (!p) return null; const o = [c[0] - n[0] * 1e-4, c[1] - n[1] * 1e-4, c[2] - n[2] * 1e-4], d = [-n[0], -n[1], -n[2]]; let best = Infinity;
    for (let i = 0; i < p.length; i += 9) { const a = [p[i], p[i + 1], p[i + 2]], e1 = V.sub([p[i + 3], p[i + 4], p[i + 5]], a), e2 = V.sub([p[i + 6], p[i + 7], p[i + 8]], a), h = V.cross(d, e2), det = V.dot(e1, h); if (Math.abs(det) < 1e-12) continue; const f = 1 / det, s0 = V.sub(o, a), u = f * V.dot(s0, h); if (u < -1e-9 || u > 1 + 1e-9) continue; const q = V.cross(s0, e1), v = f * V.dot(d, q); if (v < -1e-9 || u + v > 1 + 1e-9) continue; const t = f * V.dot(e2, q); if (t > 1e-5 && t < best) best = t; }
    return isFinite(best) ? best + 1e-4 : null;
  };
  if (C.prepCut && !C.prepCut._ins) {
    const pc0 = C.prepCut;
    const kesisir = (A, B) => A.some(v => C.pointInPoly(v, B)) || B.some(v => C.pointInPoly(v, A)) || A.some((v, i) => { const w = A[(i + 1) % A.length]; return B.some((a, j) => { const b = B[(j + 1) % B.length]; const d1 = (w[0] - v[0]) * (a[1] - v[1]) - (w[1] - v[1]) * (a[0] - v[0]), d2 = (w[0] - v[0]) * (b[1] - v[1]) - (w[1] - v[1]) * (b[0] - v[0]), d3 = (b[0] - a[0]) * (v[1] - a[1]) - (b[1] - a[1]) * (v[0] - a[0]), d4 = (b[0] - a[0]) * (w[1] - a[1]) - (b[1] - a[1]) * (w[0] - a[0]); return d1 * d2 < 0 && d3 * d4 < 0; }); });
    /* şeklin düzleminde yüzü olan ve şekille örtüşen inşaat elemanları (şekil birden çok elemana taşabilir: kanal üstü, iki perde …) */
    const yuzdekiler = (pts, n) => {
      const F = C.planeFrame(n), o = pts[0], loc = q => { const v = V.sub(q, o); return [V.dot(v, F.ux), V.dot(v, F.uy)]; }, S2 = pts.map(loc), d0 = V.dot(n, o), out = [];
      const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      for (const e of C.doc.ents) {
        if (!INS.has(e.type) || e.gv || !C.layer(e.layer).on) continue;
        let eb; try { eb = C.bbox(e); } catch (er) { continue; } if (!eb || eb[0] > bb[2] + 0.01 || eb[2] < bb[0] - 0.01 || eb[1] > bb[3] + 0.01 || eb[3] < bb[1] - 0.01) continue;
        const t0 = C.entTris(e), p = t0 && t0.pos; if (!p) continue;
        for (let k = 0; k < p.length; k += 9) {
          const a = [p[k], p[k + 1], p[k + 2]], b = [p[k + 3], p[k + 4], p[k + 5]], c = [p[k + 6], p[k + 7], p[k + 8]], nn = V.norm(V.cross(V.sub(b, a), V.sub(c, a)));
          if (V.dot(nn, n) < 0.999 || Math.abs(V.dot(n, a) - d0) > 2e-3) continue;
          const T2 = [loc(a), loc(b), loc(c)]; if (kesisir(T2, S2) || T2.every(q => C.pointInPoly(q, S2))) { out.push(e); break; }
        }
      }
      return out;
    };
    C.prepCut = f => {
      const r = pc0(f); if (r && !r.unsupported) return r;
      if (r && r.e && !INS.has(r.e.type)) return r;
      const n = r ? r.nOut : f.n; if (!n || !f.pts || f.pts.length < 3) return r;
      const hosts = yuzdekiler(f.pts, n); if (!hosts.length) return r;
      const c0 = f.pts.reduce((t, q) => [t[0] + q[0] / f.pts.length, t[1] + q[1] / f.pts.length, t[2] + (q[2] || 0) / f.pts.length], [0, 0, 0]);
      const ornek = [c0, ...f.pts.map(q => V.lerp(c0, q, 0.85)), ...f.pts.map(q => V.lerp(c0, q, 0.5))];
      let t = 0; for (const h of hosts) for (const q of ornek) { const k = kalinlik(h, q, n); if (k > 0) { t = Math.max(t, k); break; } }
      if (!(t > 0)) return r;
      const fake = { type: 'kati', layer: hosts[0].layer, o: [0, 0, 0], ux: [1, 0, 0], uz: [0, 0, 1], h: 0, prof: [] };
      Object.defineProperty(fake, 'holes', { configurable: true, get: () => [], set: hs => { for (const h of hs || []) { if (!h || !Array.isArray(h.L)) continue; const D = h.thru ? h.D + 0.02 : h.D, sh = h.thru ? 0.01 : 0; const pts = h.L.map(q => [q[0] + n[0] * sh, q[1] + n[1] * sh, q[2] + n[2] * sh]); for (const host of hosts) { (host.bosluk3 = host.bosluk3 || []).push({ pts: pts.map(q => q.map(v => +v.toFixed(4))), d: h.dir.map(v => +(v * D).toFixed(4)) }); delete host._c; } } } });
      fake._insHost = hosts[0]; fake._insHosts = hosts;
      return { e: fake, owner: null, nOut: n, t, c: c0, ti: 0, backTi: 0, host: hosts[0] };
    };
    C.prepCut._ins = true;
    if (C.describe) { const d0 = C.describe; C.describe = e => (e && e._insHost ? (e._insHosts || [e._insHost]).map(h => `${h.no ? h.no + ' ' : ''}${(T[h.type] || {}).label || h.type}`).join(', ') + ' — boşluk açıldı' : d0(e)); }
  }
  /* 3B'de "−" tuşu uzaklaştırma kısayoludur; bir komut değer beklerken (İT/ÇEK mesafesi "−0,5" gibi) eksi işareti komut satırına yazılsın */
  if (typeof window !== 'undefined') window.addEventListener('keydown', ev => {
    if (!(ev.key === '-' || ev.code === 'NumpadSubtract') || ev.ctrlKey || ev.altKey || ev.metaKey) return;
    if (!C.cmd || !C.cmd.running || C.currentView !== '3d') return;
    const ae = document.activeElement, inp = document.getElementById('cmd'); if (!inp || (ae && ae !== document.body && ae !== inp && ae.tagName !== 'CANVAS')) return;
    if (ae === inp && inp.value) return; // dolu satırda zaten yazılır
    ev.preventDefault(); ev.stopImmediatePropagation(); inp.focus(); inp.value = '-'; try { inp.setSelectionRange(1, 1); } catch (er) { } inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, true);

  /* son boşluğu kaldır: BOSLUKSIL — elemana tıklayın (Enter: tümü) */
  C.addCommand(['BOSLUKSIL', 'DELIKSIL'], 'İT/ÇEK ile inşaat elemanında açılan boşlukları kaldırır: elemanı seçin; son boşluk (H = hepsi) silinir', async (I) => {
    let es = (C.sel || []).filter(e => bosluklar(e).length); if (!es.length) { es = ((await I.sel('Boşluğu kaldırılacak elemanı seçin')) || []).filter(e => bosluklar(e).length); }
    if (!es.length) { C.warn('Seçilen elemanda boşluk yok.'); return; }
    const k = await I.kw('Hangi boşluk', [['S', 'Son açılan'], ['H', 'Hepsi']], 'S'); if (!k) return;
    for (const e of es) { if (k === 'H') e.bosluk3 = []; else e.bosluk3.pop(); delete e._c; }
    C.changed(); C.log(k === 'H' ? 'Boşlukların hepsi kaldırıldı.' : 'Son boşluk kaldırıldı.');
  });
})(window.C);

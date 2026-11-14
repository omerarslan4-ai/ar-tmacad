/* ArıtmaCAD — İNŞAAT › KAPLAMA (ince işler)
   kaplama nesnesi: { kind: 'zemin' | 'duvar' | 'tavan', pts: oda sınırı (CCW), ... }
     zemin : z0 (taşıyıcı üstü), zbt (zemin betonu cm), xps (ısı yalıtımı cm), sap (şap cm), kap (kaplama kodu), kt (kaplama cm), sup (süpürgelik cm)
     duvar : side 'IC' | 'DIS', z0, h, siva (sıva kodu), kap (bitiş / kaplama kodu), kh (alt kaplama yüksekliği m, 0 = tam), ub (üst kısım boyası)
     tavan : zc (döşeme altı), siva, bit (bitiş kodu), drop (asma tavan sarkma cm), boya (asma tavan üstüne boya E/H)
   Komutlar: ZEMINKAPLAMA, DUVARKAPLAMA, TAVANKAPLAMA — odaya tıklayın (T = tüm odalar); dış cephe için DUVARKAPLAMA YON=DIS */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, P, TX } = C.prim;
  const I_ = () => C._ins;
  /* ---- kataloglar: ad, varsayılan kalınlık (cm), renk, desen (karo ölçüsü m / parke tahta eni m) ---- */
  const ZK = {
    seramik: { ad: 'Seramik yer karosu', t: 1.0, col: [0.86, 0.83, 0.77], g: 0.6 },
    granit: { ad: 'Granit seramik (porselen)', t: 1.0, col: [0.72, 0.72, 0.74], g: 0.6 },
    karo: { ad: 'Mozaik karo', t: 2.5, col: [0.76, 0.72, 0.65], g: 0.4 },
    mermer: { ad: 'Mermer kaplama', t: 3.0, col: [0.94, 0.93, 0.91], g: 0.6 },
    dogaltas: { ad: 'Doğal taş / granit plak', t: 3.0, col: [0.46, 0.46, 0.48], g: 0.6 },
    laminat: { ad: 'Laminat parke', t: 0.8, col: [0.74, 0.57, 0.38], p: 0.2 },
    lamine: { ad: 'Lamine (çok katmanlı) parke', t: 1.4, col: [0.68, 0.50, 0.32], p: 0.19 },
    masif: { ad: 'Masif ahşap parke', t: 2.0, col: [0.58, 0.39, 0.23], p: 0.1 },
    vinil: { ad: 'Vinil / PVC zemin kaplama', t: 0.3, col: [0.62, 0.66, 0.70] },
    hali: { ad: 'Halı / halı karo', t: 1.0, col: [0.56, 0.46, 0.50], g: 0.5 },
    epoksi: { ad: 'Epoksi zemin kaplama', t: 0.3, col: [0.52, 0.63, 0.67] },
    endustri: { ad: 'Endüstriyel zemin (yüzey sertleştirici + perdah)', t: 0.5, col: [0.63, 0.63, 0.61] },
    kaucuk: { ad: 'Kauçuk zemin kaplama', t: 1.0, col: [0.27, 0.27, 0.29] },
    yok: { ad: 'Kaplama yok', t: 0, col: [0.75, 0.75, 0.72] },
  };
  const SIVA = {
    yok: { ad: 'Sıva yok', t: 0, col: [0.80, 0.80, 0.78] },
    kaba: { ad: 'Kaba + ince sıva (kireç-çimento)', t: 2.5, col: [0.86, 0.85, 0.81] },
    alci: { ad: 'Alçı sıva', t: 1.0, col: [0.95, 0.95, 0.93] },
    makine: { ad: 'Makine sıvası (perlitli alçı)', t: 1.5, col: [0.94, 0.94, 0.92] },
    dis: { ad: 'Dış cephe sıvası (çimento esaslı)', t: 2.5, col: [0.84, 0.83, 0.79] },
    manto: { ad: 'Mantolama (5 cm EPS/taşyünü + file + sıva)', t: 6.0, col: [0.90, 0.88, 0.83] },
    tavan: { ad: 'Tavan sıvası (alçı)', t: 1.0, col: [0.97, 0.97, 0.96] },
  };
  const BIT = { // duvar bitişleri (boya / kaplama)
    plastik: { ad: 'Plastik (su bazlı) iç cephe boyası', t: 0, col: [0.93, 0.91, 0.86] },
    saten: { ad: 'Saten iç cephe boyası', t: 0, col: [0.90, 0.88, 0.82] },
    yagli: { ad: 'Yağlı boya', t: 0, col: [0.87, 0.86, 0.80] },
    silikon: { ad: 'Silikonlu dış cephe boyası', t: 0, col: [0.88, 0.82, 0.70] },
    akrilik: { ad: 'Akrilik dış cephe boyası', t: 0, col: [0.84, 0.78, 0.68] },
    kagit: { ad: 'Duvar kağıdı', t: 0.1, col: [0.80, 0.74, 0.62] },
    lambri: { ad: 'Ahşap lambri kaplama', t: 1.5, col: [0.62, 0.43, 0.26] },
    fayans: { ad: 'Seramik fayans (duvar)', t: 1.0, col: [0.84, 0.88, 0.90] },
    tas: { ad: 'Doğal taş duvar kaplama', t: 3.0, col: [0.62, 0.58, 0.52] },
    kompozit: { ad: 'Alüminyum kompozit panel (alt konstrüksiyonlu)', t: 4.0, col: [0.70, 0.72, 0.75] },
    alcipan: { ad: 'Alçıpan duvar kaplama', t: 1.25, col: [0.94, 0.94, 0.93] },
    yok: { ad: 'Bitiş yok', t: 0, col: null },
  };
  const TB = { // tavan bitişleri
    boya: { ad: 'Tavan boyası (plastik)', t: 0, col: [0.98, 0.98, 0.97] },
    alcipan: { ad: 'Asma tavan – alçıpan', t: 1.25, col: [0.97, 0.97, 0.96], asma: true },
    karo: { ad: 'Asma tavan – taşyünü / mineral karo 60×60', t: 1.5, col: [0.93, 0.93, 0.92], asma: true, g: 0.6 },
    metal: { ad: 'Asma tavan – metal (clip-in)', t: 1.0, col: [0.85, 0.86, 0.88], asma: true, g: 0.6 },
    ahsap: { ad: 'Asma tavan – ahşap lambri', t: 1.5, col: [0.64, 0.45, 0.28], asma: true, p: 0.1 },
    yok: { ad: 'Bitiş yok', t: 0, col: null },
  };
  const opts = O => Object.entries(O).map(([k, v]) => [k, v.ad + (v.t ? ` (${v.t} cm)` : '')]);
  /* ---- geometri yardımcıları ---- */
  const ccw = q => (M.polyArea(q) < 0 ? q.slice().reverse() : q.slice());
  const prismTri = (out, poly, za, zb, col) => {
    const q = ccw(poly), n = q.length, v0 = out.v.length; if (n < 3 || !(zb > za)) return;
    for (const p of q) out.v.push([p[0], p[1], za]); for (const p of q) out.v.push([p[0], p[1], zb]);
    let tr = []; try { tr = C.earClip(q); } catch (e) { }
    for (const t of tr) { out.f.push([v0 + n + t[0], v0 + n + t[1], v0 + n + t[2]], [v0 + t[0], v0 + t[2], v0 + t[1]]); out.fc.push(col, col); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; out.f.push([v0 + i, v0 + j, v0 + n + j], [v0 + i, v0 + n + j, v0 + n + i]); out.fc.push(col, col); out.edges3.push([[q[i][0], q[i][1], za], [q[j][0], q[j][1], za]], [[q[i][0], q[i][1], zb], [q[j][0], q[j][1], zb]]); }
  };
  const clipLine = (poly, A, B) => { // A-B doğrusunun poligon içindeki parçaları
    const d = [B[0] - A[0], B[1] - A[1]], ts = [];
    for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], e = [q[0] - p[0], q[1] - p[1]], den = d[0] * e[1] - d[1] * e[0]; if (Math.abs(den) < 1e-12) continue; const w = [p[0] - A[0], p[1] - A[1]], t = (w[0] * e[1] - w[1] * e[0]) / den, u = (w[0] * d[1] - w[1] * d[0]) / den; if (u >= 0 && u < 1) ts.push(t); }
    ts.sort((a, b) => a - b); const out = []; for (let k = 0; k + 1 < ts.length; k += 2) { const t0 = Math.max(0, ts[k]), t1 = Math.min(1, ts[k + 1]); if (t1 > t0) out.push([[A[0] + d[0] * t0, A[1] + d[1] * t0, 0], [A[0] + d[0] * t1, A[1] + d[1] * t1, 0]]); } return out;
  };
  const pattern = (poly, g, pk) => { // karo ızgarası (g) ya da parke çizgileri (pk)
    const b = I_().pbb(poly), out = [], cap = 160;
    if (g) { let n = 0; for (let x = b[0] + g; x < b[2] && n < cap; x += g, n++) out.push(...clipLine(poly, [x, b[1] - 1], [x, b[3] + 1])); n = 0; for (let y = b[1] + g; y < b[3] && n < cap; y += g, n++) out.push(...clipLine(poly, [b[0] - 1, y], [b[2] + 1, y])); }
    else if (pk) { const horiz = (b[2] - b[0]) >= (b[3] - b[1]); let n = 0; if (horiz) for (let y = b[1] + pk; y < b[3] && n < cap; y += pk, n++) out.push(...clipLine(poly, [b[0] - 1, y], [b[2] + 1, y])); else for (let x = b[0] + pk; x < b[2] && n < cap; x += pk, n++) out.push(...clipLine(poly, [x, b[1] - 1], [x, b[3] + 1])); }
    return out;
  };
  const inPt = q => { try { const t = C.earClip(ccw(q)), qq = ccw(q); let best = null, ba = -1; for (const k of t) { const a = Math.abs(M.polyArea([qq[k[0]], qq[k[1]], qq[k[2]]])); if (a > ba) { ba = a; best = [(qq[k[0]][0] + qq[k[1]][0] + qq[k[2]][0]) / 3, (qq[k[0]][1] + qq[k[1]][1] + qq[k[2]][1]) / 3]; } } return best || q[0]; } catch (e) { return q[0]; } };
  const perim = q => { let s = 0; for (let i = 0; i < q.length; i++) s += M.dist2(q[i], q[(i + 1) % q.length]); return s; };
  const area = q => Math.abs(M.polyArea(q));
  /* duvar yüzeyi kenarları: her kenarda kaplama tarafı normali ve üzerindeki boşluklar (pencere / kapı) */
  /* köşelerde gönye (miter) birleşim: kaplama / sıva katmanı köşede kesintisiz */
  const miterLoop = L2 => { const n = L2.length, mt = (p, q) => { const k = 1 + p[0] * q[0] + p[1] * q[1]; return k < 1e-6 ? q : [(p[0] + q[0]) / k, (p[1] + q[1]) / k]; }; L2.forEach((w, i) => { w.m0 = mt(L2[(i - 1 + n) % n].n, w.n); w.m1 = mt(w.n, L2[(i + 1) % n].n); }); return L2; };
  const mP = (w, s, o) => s <= 1e-9 && w.m0 ? [w.a[0] + w.m0[0] * o, w.a[1] + w.m0[1] * o] : s >= w.L - 1e-9 && w.m1 ? [w.b[0] + w.m1[0] * o, w.b[1] + w.m1[1] * o] : [w.a[0] + w.u[0] * s + w.n[0] * o, w.a[1] + w.u[1] * s + w.n[1] * o];
  const wallEdges = e => {
    const q = ccw(e.pts), sgn = e.side === 'DIS' ? -1 : 1, out = [];
    const ops = C.doc ? C.doc.ents.filter(o => o.type === 'acik') : [];
    for (let i = 0; i < q.length; i++) {
      const a = q[i], b = q[(i + 1) % q.length], Ls = M.dist2(a, b); if (Ls < 1e-6) continue; const u = [(b[0] - a[0]) / Ls, (b[1] - a[1]) / Ls], n = [-u[1] * sgn, u[0] * sgn];
      const hs = [];
      for (const o of ops) { const H = I_().hostFrame(o); if (!H) continue; const c = [H.sf.a[0] + H.sf.u[0] * (+o.s || 0), H.sf.a[1] + H.sf.u[1] * (+o.s || 0)], t = (c[0] - a[0]) * u[0] + (c[1] - a[1]) * u[1], d = Math.abs((c[0] - a[0]) * n[0] + (c[1] - a[1]) * n[1]); if (t < 0 || t > Ls || d > Math.max(H.F.tb, H.F.tt) + 0.2 || Math.abs(H.sf.u[0] * n[0] + H.sf.u[1] * n[1]) > 0.2) continue; const w = +o.w || 1, za = (+H.h.z0 || 0) + (o.kind === 'kapi' ? 0 : (+o.par || 0.9)), hh = +o.hh || (o.kind === 'kapi' ? 2.1 : 1.4); hs.push({ s0: Math.max(0, t - w / 2), s1: Math.min(Ls, t + w / 2), za: Math.max(za, +e.z0 || 0), zb: za + hh, td: Math.abs(H.F.rB - H.F.lB) || +H.F.tb || 0.2, kind: o.kind || 'pencere' }); }
      const ht = Array.isArray(e.ht) && e.ht[out.length] != null ? +e.ht[out.length] : (+e.h || 3);
      out.push({ a, b, u, n, L: Ls, ht, hs: hs.filter(h => h.s1 > h.s0 + 0.01 && h.zb > h.za + 0.01).sort((x, y) => x.s0 - y.s0) });
    }
    return miterLoop(out);
  };
  /* söve dönüşünün derinliği (duvar yüzünden kasaya, m): pencere kasası dış yüzden 3 cm içeride ve 7 cm derin; kapı ve seksiyonel kapıda 0 */
  const sove = (o, side) => (o.kind === 'kapi' || /sek|panjur/i.test(o.kind || '') ? 0 : side === 'DIS' ? 0.03 : Math.max(0, (o.td || 0.2) - 0.10));
  /* söve alanı metrajda (m²): alt kaplama (kh altı) ve üst boya (kh üstü) payları ayrı (denetim 14.11.2026: hepsi alt kaplamaya yazılıyordu).
     o { s0, s1, za, zb, kind, td } boşluk, z0 duvar tabanı, zt kenarın üstü, zk alt kaplamanın üst kotu (kh yoksa zt). Yanaklar kh'de bölünür;
     lento altı üst kenarın (zb), denizlik üstü alt kenarın (za) bulunduğu bölgeye yazılır. Döner { alt, ust } */
  const soveAlan = (o, side, z0, zt, zk) => {
    const sv = sove(o, side), w = o.s1 - o.s0, za = Math.max(o.za, z0), zb = Math.min(o.zb, zt), r = { alt: 0, ust: 0 }; if (!(sv > 0) || !(zb > za) || !(w > 0)) return r;
    const lo = Math.max(0, Math.min(zb, zk) - za); r.alt += 2 * sv * lo; r.ust += 2 * sv * (zb - za - lo); /* yanaklar */
    r[zb <= zk + 1e-6 ? 'alt' : 'ust'] += sv * w; /* lento altı */
    if (o.kind !== 'kapi') r[za < zk - 1e-6 ? 'alt' : 'ust'] += sv * w; /* denizlik üstü */
    return r;
  };
  const tSum = e => (e.kind === 'zemin' ? ((+e.zbt || 0) + (+e.xps || 0) + (+e.sap || 0) + (+e.kt || 0)) / 100 : e.kind === 'duvar' ? Math.max(0.005, ((SIVA[e.siva] || SIVA.yok).t + Math.max((BIT[e.kap] || BIT.yok).t, (BIT[e.ub] || BIT.yok).t)) / 100) : 0.01);
  /* metraj kalemleri: [ad, birim, miktar] */
  const qty = e => {
    const out = [], A = area(e.pts);
    if (e.kind === 'zemin') {
      if (+e.zbt > 0) out.push([`Zemin betonu C16/20 (${e.zbt} cm)`, 'm³', A * e.zbt / 100]);
      if (+e.xps > 0) out.push([`Isı yalıtımı XPS (${e.xps} cm)`, 'm²', A]);
      if (+e.sap > 0) out.push([`Tesviye şapı (${e.sap} cm)`, 'm²', A]);
      if (e.kap && e.kap !== 'yok') out.push([(ZK[e.kap] || ZK.seramik).ad, 'm²', A]);
      if (+e.sup > 0) out.push([`Süpürgelik (${e.sup} cm)`, 'm', perim(e.pts)]);
    } else if (e.kind === 'duvar') {
      const z0 = +e.z0 || 0, h = +e.h || 3, kh = +e.kh > 0 && +e.kh < h ? +e.kh : h; let Aall = 0, Alo = 0;
      for (const w of wallEdges(e)) { const hw = w.ht, kw = Math.min(kh, hw); Aall += w.L * hw; Alo += w.L * kw; for (const o of w.hs) { const oz = Math.max(0, Math.min(o.zb, z0 + hw) - Math.max(o.za, z0)); Aall -= (o.s1 - o.s0) * oz; Alo -= (o.s1 - o.s0) * Math.max(0, Math.min(o.zb, z0 + kw) - Math.max(o.za, z0));
          const SA = soveAlan(o, e.side, z0, z0 + hw, z0 + kw); Aall += SA.alt + SA.ust; Alo += SA.alt; } } /* söve dönüşü (yanaklar, lento altı, denizlik üstü): kh üstündeki pay üst boyaya */
      const sd = e.side === 'DIS' ? ' (dış cephe)' : ' (iç)';
      if (e.siva && e.siva !== 'yok') out.push([(SIVA[e.siva] || SIVA.kaba).ad + sd, 'm²', Aall]);
      if (e.kap && e.kap !== 'yok') out.push([(BIT[e.kap] || BIT.plastik).ad + sd, 'm²', Alo]);
      if (kh < h && e.ub && e.ub !== 'yok') out.push([(BIT[e.ub] || BIT.plastik).ad + sd, 'm²', Aall - Alo]);
    } else if (e.kind === 'tavan') {
      const b = TB[e.bit] || TB.boya;
      if (e.siva && e.siva !== 'yok' && !b.asma) out.push([(SIVA[e.siva] || SIVA.tavan).ad, 'm²', A]);
      if (e.bit && e.bit !== 'yok') out.push([b.ad, 'm²', A]);
      if (b.asma && e.boya === 'E') out.push([TB.boya.ad + ' (asma tavan üstüne)', 'm²', A]);
    }
    return out;
  };
  C.kaplamaMetraj = () => { const m = new Map(); for (const e of C.doc.ents) { if (e.type !== 'kaplama' || !C.lyLive(e.layer)) continue; for (const [ad, br, v] of qty(e)) { const k = ad + '|' + br; m.set(k, (m.get(k) || 0) + v); } } return [...m.entries()].map(([k, v]) => { const [ad, br] = k.split('|'); return [ad, br, v]; }); };
  C.kaplamaSove = sove; C.kaplamaSoveAlan = soveAlan; /* test ve 2B çizim için */
  T.kaplama = {
    label: 'Kaplama', ifc: 'IfcCovering',
    prims: e => {
      const q = e.pts.map(p => [p[0], p[1], 0]), out = [];
      if (e.kind === 'zemin') {
        const k = ZK[e.kap] || ZK.seramik; out.push(P(q, true, { lw: 13 }));
        for (const [a, b] of pattern(e.pts, k.g, k.p)) out.push(L(a, b, { lw: 9, color: 8 }));
        const c = inPt(e.pts), th = C.annoH(2); out.push(TX([c[0], c[1], 0], th, `${k.ad.toUpperCase()} · ${M.fmt(area(e.pts), 2)} m²`, 0, 'MC'));
      } else if (e.kind === 'duvar') { const t = tSum(e) + (+e.o0 || 0); for (const w of wallEdges(e)) { const a = mP(w, 0, t), b = mP(w, w.L, t); out.push(L([a[0], a[1], 0], [b[0], b[1], 0], { lw: 13 })); } }
      else out.push(P(q, true, { lw: 9, lt: 'HIDDEN' }));
      return out;
    },
    mesh: e => {
      const out = I_().newMesh();
      if (e.kind === 'zemin') {
        let z = +e.z0 || 0; const lay = [[+e.zbt, [0.70, 0.70, 0.68]], [+e.xps, [0.93, 0.74, 0.78]], [+e.sap, [0.80, 0.79, 0.76]], [+e.kt, (ZK[e.kap] || ZK.seramik).col]];
        for (const [t, col] of lay) if (t > 0) { prismTri(out, e.pts, z, z + t / 100, col); z += t / 100; }
        if (+e.sup > 0) { const q = ccw(e.pts), s = 0.012, h = +e.sup / 100, col = (ZK[e.kap] || ZK.seramik).col; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length], Ls = M.dist2(a, b); if (Ls < 1e-6) continue; const n = [-(b[1] - a[1]) / Ls * s, (b[0] - a[0]) / Ls * s]; I_().hexa(out, [[a[0], a[1], z], [b[0], b[1], z], [b[0] + n[0], b[1] + n[1], z], [a[0] + n[0], a[1] + n[1], z], [a[0], a[1], z + h], [b[0], b[1], z + h], [b[0] + n[0], b[1] + n[1], z + h], [a[0] + n[0], a[1] + n[1], z + h]], col); } }
      } else if (e.kind === 'duvar') {
        const t = tSum(e), z0 = +e.z0 || 0, h = +e.h || 3, zt = z0 + h, kh = +e.kh > 0 && +e.kh < h ? z0 + +e.kh : zt;
        const cLo = (BIT[e.kap] || {}).col || (SIVA[e.siva] || SIVA.yok).col, cHi = (BIT[e.ub] || {}).col || cLo;
        for (const w of wallEdges(e)) {
          const zt = z0 + w.ht;
          const box = (s0, s1, za, zb) => { if (s1 - s0 < 1e-4 || zb - za < 1e-4) return; const parts = kh > za && kh < zb ? [[za, kh], [kh, zb]] : [[za, zb]]; for (const [z1, z2] of parts) { const col = z2 <= kh + 1e-6 ? cLo : cHi, o0 = +e.o0 || 0, Pp = (s, o, z) => { const q = mP(w, s, o + o0); return [q[0], q[1], z]; }; I_().hexa(out, [Pp(s0, 0, z1), Pp(s1, 0, z1), Pp(s1, t, z1), Pp(s0, t, z1), Pp(s0, 0, z2), Pp(s1, 0, z2), Pp(s1, t, z2), Pp(s0, t, z2)], col); } };
          let s = 0; for (const o of w.hs) { const za = Math.max(o.za, z0), zb = Math.min(o.zb, zt); if (zb <= za) continue; box(s, o.s0, z0, zt); box(o.s0, o.s1, z0, za); box(o.s0, o.s1, zb, zt); s = o.s1;
            /* SÖVE DÖNÜŞÜ (kullanıcı isteği 14.11.2026): sıva / boya boşluğun yanaklarına, lento altına ve denizlik üstüne döner, doğrama kasasına kadar
               (pencere kasası dış yüzden 3 cm içeride, 7 cm derin — mimari-detay.js dograma22): iç yüzde derinlik duvar − 10 cm, dış yüzde 3 cm. Kapıda kasa duvar boyunca: dönüş yok */
            const sov = sove(o, e.side); if (sov > 0.005) { const R = (s0, s1, z1, z2, col) => { if (s1 - s0 < 1e-4 || z2 - z1 < 1e-4) return; const o0 = +e.o0 || 0, Pp = (ss, oo, z) => { const q = mP(w, ss, oo + o0); return [q[0], q[1], z]; }; I_().hexa(out, [Pp(s0, -sov, z1), Pp(s1, -sov, z1), Pp(s1, t, z1), Pp(s0, t, z1), Pp(s0, -sov, z2), Pp(s1, -sov, z2), Pp(s1, t, z2), Pp(s0, t, z2)], col); };
              const cz = z => (z <= kh + 1e-6 ? cLo : cHi); R(o.s0, Math.min(o.s1, o.s0 + t), za, zb, cz(za)); R(Math.max(o.s0, o.s1 - t), o.s1, za, zb, cz(za)); R(o.s0, o.s1, Math.max(za, zb - t), zb, cz(zb)); if (o.kind !== 'kapi') R(o.s0, o.s1, za, Math.min(zb, za + t), cz(za)); } }
          box(s, w.L, z0, zt);
        }
      } else {
        const b = TB[e.bit] || TB.boya, zc = +e.zc || 3;
        if (b.asma) { const z = zc - (+e.drop || 30) / 100; prismTri(out, e.pts, z - Math.max(0.01, b.t / 100), z, b.col); }
        else { const st = Math.max(0.006, (SIVA[e.siva] || SIVA.yok).t / 100); prismTri(out, e.pts, zc - st, zc, b.col || (SIVA[e.siva] || SIVA.tavan).col); }
      }
      return [out];
    },
    xf: (e, X) => { let dz = 0; try { const q = X.p([0, 0, 0]); dz = q && q.length > 2 ? (q[2] || 0) : 0; } catch (err) { } for (const k of ['z0', 'zc']) if (e[k] != null) e[k] = (+e[k] || 0) + dz; e.pts = e.pts.map(q => X.p([q[0], q[1], 0]).slice(0, 2)); },
    snaps: e => e.pts.map(q => ({ p: [q[0], q[1], 0], k: 'end' })),
    info: e => { const head = e.kind === 'zemin' ? `Zemin kaplaması · taşıyıcı üstü ${M.fmt(+e.z0 || 0, 2)} · bitmiş döşeme ${M.fmt((+e.z0 || 0) + tSum(e), 3)}` : e.kind === 'duvar' ? `${e.side === 'DIS' ? 'Dış cephe' : 'İç duvar'} kaplaması · h=${M.fmt(+e.h || 3, 2)} m` : `Tavan kaplaması · döşeme altı ${M.fmt(+e.zc || 3, 2)}`; return head + ' · ' + qty(e).map(([a, b, v]) => `${a} ${M.fmt(v, 2)} ${b}`).join(' · '); },
  };
  /* ---- oda bulma ---- */
  const zOf = x => x.type === 'plak' ? +x.zt || 0 : x.type === 'dolgu' ? +x.zb || 0 : +x.zt || 0;
  const covers = (x, q) => { if (x.type === 'plak' || x.type === 'dolgu') return C.pointInPoly(q, x.pts); if (x.type === 'temel') { const c = M.p3(x.p), r = (x.rot || 0) * Math.PI / 180, dx = q[0] - c[0], dy = q[1] - c[1], lx = dx * Math.cos(-r) - dy * Math.sin(-r), ly = dx * Math.sin(-r) + dy * Math.cos(-r); return Math.abs(lx) <= (+x.bx || 1.5) / 2 && Math.abs(ly) <= (+x.by || 1.5) / 2; } return false; };
  const ceilAt = (q, z) => { let b = null; for (const x of C.doc.ents) if (x.type === 'plak' && x.kind !== 'radye' && C.lyLive(x.layer) && C.pointInPoly(q, x.pts)) { const bz = (+x.zt || 0) - (+x.t || 0.3); if (bz > z + 0.3 && (b == null || bz < b)) b = bz; } return b; };
  const floorAt = (q, zref) => { const zs = []; for (const x of C.doc.ents) if ((x.type === 'plak' || x.type === 'dolgu' || x.type === 'temel') && C.lyLive(x.layer) && covers(x, q)) { const z = zOf(x); if (z <= zref + 0.02) zs.push(z); } if (!zs.length) return null; zs.sort((a, b) => b - a); if (!isFinite(zref)) { for (const z of zs) if (ceilAt(q, z) != null) return z; } return zs[0]; };
  const roomAt = (q, z) => { for (const zm of [z + 0.5, z - 0.05]) { const { cells } = I_().dolguCells(zm); let best = null; for (const c of cells) if (C.pointInPoly(q, c.f) && (!best || c.A < best.A)) best = c; if (best) return best; } return null; };
  const wallTop = (poly, z) => { let t = null; const { bodies } = I_().dolguCells(z + 0.05); for (const b of bodies) if (poly.some(v => b.q.some(w => Math.hypot(w[0] - v[0], w[1] - v[1]) < 0.05))) t = Math.max(t == null ? -Infinity : t, b.zb); return t; };
  const floorLevels = () => [...new Set(C.doc.ents.filter(x => (x.type === 'plak' || x.type === 'dolgu' || x.type === 'temel') && C.lyLive(x.layer)).map(x => +zOf(x).toFixed(4)))];
  const has = (kind, ip, z, side) => C.doc.ents.some(x => x.type === 'kaplama' && x.kind === kind && (side == null || x.side === side) && C.pointInPoly(ip, x.pts) && Math.abs((kind === 'tavan' ? +x.zc : +x.z0) - z) < 0.3);
  const lay = () => { C.ensureLayer('INS_KAPLAMA', 9, 'CONTINUOUS', 13); return 'INS_KAPLAMA'; };
  const zref3 = p => (Math.abs(p[2] || 0) > 1e-6 ? p[2] : Infinity);
  /* bina dış çevresi (z0 kotunda perde / duvar / kolon gövdelerinin dış sınırı) ve her kenarın üst kotu (z0'dan yükseklik) */
  const outerFacade = (z0in) => {
            const { bodies } = I_().dolguCells(z0in + 0.3); const segs = []; for (const b of bodies) for (let i = 0; i < b.q.length; i++) segs.push([b.q[i], b.q[(i + 1) % b.q.length]]);
      let outer = null, oa = 0; for (const f of (segs.length ? C.planarFaces(segs) : [])) { const A = M.polyArea(f); if (A < 0 && -A > oa) { oa = -A; outer = f.slice().reverse(); } }
      if (!outer) return null;
      let top = -Infinity; for (const b of bodies) top = Math.max(top, b.zb); for (const x of C.doc.ents) if (x.type === 'plak' && x.kind !== 'radye' && C.lyLive(x.layer)) top = Math.max(top, +x.zt || 0);
      const z0d = z0in, q = ccw(outer), ht = [];
      const dseg = (v, a, b) => { const d = [b[0] - a[0], b[1] - a[1]], l2 = d[0] * d[0] + d[1] * d[1] || 1, t = Math.max(0, Math.min(1, ((v[0] - a[0]) * d[0] + (v[1] - a[1]) * d[1]) / l2)); return Math.hypot(a[0] + d[0] * t - v[0], a[1] + d[1] * t - v[1]); };
      for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; if (M.dist2(a, b) < 1e-6) continue; let t = null; const Lm = M.dist2(a, b), mi = [(a[0] + b[0]) / 2 - (b[1] - a[1]) / Lm * 0.03, (a[1] + b[1]) / 2 + (b[0] - a[0]) / Lm * 0.03]; for (const zz of [z0d + 0.3, ...floorLevels().map(v => v + 0.3)]) for (const bd of I_().dolguCells(zz).bodies) if (C.pointInPoly(mi, bd.q)) t = Math.max(t == null ? -Infinity : t, bd.zb); const L2 = M.dist2(a, b), mid = [(a[0] + b[0]) / 2 - (b[1] - a[1]) / L2 * 0.2, (a[1] + b[1]) / 2 + (b[0] - a[0]) / L2 * 0.2]; for (const x of C.doc.ents) if (x.type === 'plak' && x.kind !== 'radye' && C.lyLive(x.layer) && C.pointInPoly(mid, x.pts) && (t == null || (+x.zt || 0) > t)) t = +x.zt || 0; ht.push(+((t == null ? top : t) - z0d).toFixed(4)); }
      return { q, ht };
  };
  /* her oda için: tıklama ya da T (tümü) */
  /* oda yoksa: tıklanan yerin altındaki döşeme / radye / dolgu / temelin üst yüzeyi (kotu z olan en küçük eleman) */
  const surfAt = (q, z) => {
    let best = null;
    for (const x of C.doc.ents) {
      if (!(x.type === 'plak' || x.type === 'dolgu' || x.type === 'temel') || !C.lyLive(x.layer) || !covers(x, q) || Math.abs(zOf(x) - z) > 0.011) continue;
      let f; if (x.type === 'temel') { const c = M.p3(x.p), r = (x.rot || 0) * Math.PI / 180, bx = (+x.bx || 1.5) / 2, by = (+x.by || 1.5) / 2, cs = Math.cos(r), sn = Math.sin(r); f = [[-bx, -by], [bx, -by], [bx, by], [-bx, by]].map(([u, v]) => [c[0] + u * cs - v * sn, c[1] + u * sn + v * cs]); } else f = x.pts.map(p => [p[0], p[1]]);
      const A = Math.abs(M.polyArea(f)); if (!best || A < best.A) best = { f: ccw(f), A, ip: [q[0], q[1]], src: x };
    }
    return best;
  };
  const roomLoop = async (I, label, makeAt, opt = {}) => {
    let n = 0;
    for (; ;) {
      const p = await I.pt(opt.surface ? `${label}: odaya ya da döşeme / radye / temel yüzeyine tıklayın (T = tüm odalar, Y = tüm döşeme / temel yüzeyleri, Enter bitir)` : `${label}: odanın içine tıklayın (T = tüm odalar, Enter bitir)`, { kw: opt.surface ? [['T', 'TUMU', 'TÜMÜ'], ['Y', 'YUZEY', 'YÜZEY']] : [['T', 'TUMU', 'TÜMÜ']] });
      if (opt.surface && p === 'Y') { // odası olmayan tüm döşeme / radye / temel üstleri
        for (const x of C.doc.ents) { if (!(x.type === 'plak' || x.type === 'dolgu' || x.type === 'temel') || !C.lyLive(x.layer)) continue; const z = zOf(x); const ip = x.type === 'temel' ? M.p3(x.p).slice(0, 2) : inPt(x.pts.map(q => [q[0], q[1]]));
          if (ceilAt(ip, z) != null && roomAt(ip, z)) continue; // oda ise T ile yapılır
          const c = surfAt(ip, z); if (c && c.src === x && makeAt(c, z, true)) n++; }
        break;
      }
      if (typeof p === 'string' && p === 'T') { for (const z of floorLevels()) for (const zm of [z + 0.5, z - 0.05]) for (const c of I_().dolguCells(zm).cells) { if (floorAt(c.ip, z + 0.001) == null || Math.abs(floorAt(c.ip, z + 0.001) - z) > 0.01) continue; if (makeAt(c, z, true)) n++; } break; }
      if (!p || typeof p === 'string') break;
      const z = floorAt(p, zref3(p)); if (z == null) { C.warn('Tıkladığınız yerin altında döşeme / dolgu / radye yok.'); if (E.scriptMode && !E.queue.length) break; continue; }
      let c = roomAt(p, z);
      if (!c && opt.surface) { c = surfAt(p, z); if (c) C.log(`Oda bulunamadı: ${(T[c.src.type] || {}).label || c.src.type} üst yüzeyinin tamamı kaplanıyor (kot ${M.fmt(z, 2)}, ${M.fmt(c.A, 2)} m²).`); }
      if (!c) { C.warn(opt.surface ? 'Tıkladığınız yerin altında oda, döşeme, radye ya da temel yüzeyi yok.' : 'Tıkladığınız nokta duvar / perdelerle kapalı bir odanın içinde değil.'); if (E.scriptMode && !E.queue.length) break; continue; }
      if (makeAt(Object.assign({}, c, { ip: [p[0], p[1]] }), z, false)) n++;
      if (E.scriptMode && !E.queue.length) break;
    }
    return n;
  };
  C.addCommand(['ZEMINKAPLAMA', 'IZEMIN', 'ZEMIN'], 'Zemin kaplaması: zemin betonu, ısı yalıtımı, tesviye şapı ve son kat kaplama (seramik, granit, karo, mermer, parke, vinil, epoksi …) + süpürgelik. Odaya ya da doğrudan döşeme / radye / temel yüzeyine tıklayın; T = tüm odalar, Y = tüm döşeme / temel yüzeyleri.', async (I) => {
    const r = await I_().getParams('Zemin kaplaması', [{ k: 'kap', t: 'Son kat kaplama', opts: opts(ZK), d: 'seramik', al: ['KAP'] }, { k: 'kt', t: 'Kaplama kalınlığı (cm, boş = kataloğa göre)', d: 0, al: ['KT'] }, { k: 'sap', t: 'Tesviye şapı (cm, 0 = yok)', d: 5, al: ['SAP'] }, { k: 'xps', t: 'Isı yalıtımı XPS (cm, 0 = yok)', d: 0, al: ['XPS'] }, { k: 'zbt', t: 'Zemin betonu (cm, 0 = yok)', d: 10, al: ['ZBT', 'BETON'] }, { k: 'sup', t: 'Süpürgelik yüksekliği (cm, 0 = yok)', d: 10, al: ['SUP'] }], 'zkap'); if (!r) return;
    const kt = +r.kt > 0 ? +r.kt : (ZK[r.kap] || ZK.seramik).t;
    const n = await roomLoop(I, 'Zemin kaplaması', (c, z0, all) => { const z = z0 + (C.yalitimZeminT ? C.yalitimZeminT(c.ip, z0) : 0); if (has('zemin', c.ip, z0) || has('zemin', c.ip, z)) { if (!all) C.warn('Bu odada zaten zemin kaplaması var.'); return false; } const e = C.add(C.newEnt('kaplama', { kind: 'zemin', pts: c.f.map(q => [q[0], q[1]]), z0: +z.toFixed(4), zbt: +r.zbt || 0, xps: +r.xps || 0, sap: +r.sap || 0, kap: r.kap, kt, sup: r.kap === 'yok' || c.src ? 0 : +r.sup || 0, layer: lay() })); delete e.sp; C.log(T.kaplama.info(e)); return true; }, { surface: true });
    if (n) C.log(`${n} yüzeye zemin kaplaması yapıldı.`);
  });
  C.addCommand(['DUVARKAPLAMA', 'IDUVARKAPLAMA', 'SIVA', 'BOYA'], 'Duvar sıva / boya / kaplama: iç duvarlar (odaya tıklayın, T = tümü) ya da dış cephe (YON=DIS, otomatik bina dış çevresi). Sıva, boya, duvar kağıdı, ahşap lambri, fayans, taş, kompozit panel, alçıpan; alt kaplama yüksekliği (ör. 1.5 m fayans + üstü boya).', async (I) => {
    const r = await I_().getParams('Duvar sıva / boya / kaplama', [{ k: 'yon', t: 'Yüzey', opts: [['IC', 'İç duvarlar (oda)'], ['DIS', 'Dış cephe (bina çevresi)']], d: 'IC', al: ['YON'] }, { k: 'siva', t: 'Sıva', opts: opts(SIVA).filter(o => o[0] !== 'tavan'), d: 'kaba', al: ['SIVA'] }, { k: 'kap', t: 'Bitiş / kaplama (alt kısım ya da tamamı)', opts: opts(BIT), d: 'plastik', al: ['KAP'] }, { k: 'kh', t: 'Alt kaplama yüksekliği (m, 0 = tam yükseklik)', d: 0, al: ['KH'] }, { k: 'ub', t: 'Üst kısım bitişi (alt kaplama yüksekliği verilirse)', opts: opts(BIT), d: 'plastik', al: ['UB'] }, { k: 'z0', t: 'Dış cephe alt kotu (m)', d: 0, al: ['Z'] }], 'dkap'); if (!r) return;
    const mk = (pts, z0, h, side) => { const e = C.add(C.newEnt('kaplama', { kind: 'duvar', side, pts: pts.map(q => [q[0], q[1]]), z0: +z0.toFixed(4), h: +h.toFixed(4), siva: r.siva, kap: r.kap, kh: +r.kh || 0, ub: r.ub, layer: lay() })); delete e.sp; C.log(T.kaplama.info(e)); return e; };
    if (r.yon === 'DIS') {
      const OF = outerFacade(+r.z0 || 0); if (!OF) { C.warn('Bina dış çevresi bulunamadı (perde / duvar yok).'); return; }
      const q = OF.q, ht = OF.ht, z0d = +r.z0 || 0, yc = C.doc.ents.find(x => x.type === 'yalitim' && x.kind === 'cephe');
      const e = mk(q, z0d, Math.max(...ht), 'DIS'); e.ht = ht; if (yc) e.o0 = (+yc.t || 5) / 100; C.log(T.kaplama.info(e)); return;
    }
    const n = await roomLoop(I, 'İç duvar kaplaması', (c, z, all) => { if (has('duvar', c.ip, z, 'IC')) { if (!all) C.warn('Bu odanın duvarları zaten kaplı.'); return false; } const cz = ceilAt(c.ip, z), wt = wallTop(c.f, z), top = cz != null ? cz : wt; if (top == null || top <= z + 0.1) { if (!all) C.warn('Duvar yüksekliği bulunamadı.'); return false; } mk(c.f, z, top - z, 'IC'); return true; });
    if (n) C.log(`${n} odanın duvarları kaplandı.`);
  });
  C.addCommand(['TAVANKAPLAMA', 'ITAVAN', 'TAVAN'], 'Tavan: sıva + tavan boyası ya da asma tavan (alçıpan, taşyünü karo, metal, ahşap) — odaya tıklayın, T = tüm odalar.', async (I) => {
    const r = await I_().getParams('Tavan kaplaması', [{ k: 'bit', t: 'Tavan bitişi', opts: opts(TB), d: 'boya', al: ['BIT'] }, { k: 'siva', t: 'Tavan sıvası', opts: [['tavan', SIVA.tavan.ad], ['makine', SIVA.makine.ad], ['kaba', SIVA.kaba.ad], ['yok', 'Sıva yok']], d: 'tavan', al: ['SIVA'] }, { k: 'drop', t: 'Asma tavan sarkma (cm)', d: 30, al: ['DROP'] }, { k: 'boya', t: 'Asma tavan üstüne boya', opts: [['E', 'Evet'], ['H', 'Hayır']], d: 'E', al: ['BOYA'] }], 'tkap'); if (!r) return;
    const n = await roomLoop(I, 'Tavan kaplaması', (c, z, all) => { const zc = ceilAt(c.ip, z); if (zc == null) { if (!all) C.warn('Bu odanın üstünde döşeme yok.'); return false; } if (has('tavan', c.ip, zc)) { if (!all) C.warn('Bu odada zaten tavan kaplaması var.'); return false; } const e = C.add(C.newEnt('kaplama', { kind: 'tavan', pts: c.f.map(q => [q[0], q[1]]), zc: +zc.toFixed(4), siva: r.siva, bit: r.bit, drop: +r.drop || 30, boya: r.boya, layer: lay() })); delete e.sp; C.log(T.kaplama.info(e)); return true; });
    if (n) C.log(`${n} odaya tavan kaplaması yapıldı.`);
  });
  C._kap = { ZK, SIVA, BIT, TB, tSum, wallEdges, outerFacade, roomAt, floorAt, floorLevels, ceilAt, prismTri, ccw, area, perim, inPt, roomLoop, wallTop, has, clipLine, pattern };
})(window.C);

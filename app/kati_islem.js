/* ArıtmaCAD — katı işlemleri: BİRLEŞTİR / AYIR (birleşik katı), PAH (2B köşe + 3B kenar), KONİK (taper), SÜPÜR (yol boyunca uzatma) */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, P } = C.prim, RAD = Math.PI / 180, S = C._sk;
  const copy = q => { const o = Object.assign({}, q); delete o._c; return o; };
  const clean = q => C.cleanEnt(q);
  const in3d = () => C.viewName && C.viewName() === '3d';
  const triVol = t => { let V = 0; const p = t.pos; for (let i = 0; i < p.length; i += 9) V += (p[i] * (p[i + 4] * p[i + 8] - p[i + 5] * p[i + 7]) - p[i + 1] * (p[i + 3] * p[i + 8] - p[i + 5] * p[i + 6]) + p[i + 2] * (p[i + 3] * p[i + 7] - p[i + 4] * p[i + 6])) / 6; return Math.abs(V); };
  const centroid = pts => pts.reduce((s, q) => M.add(s, q), [0, 0, 0]).map(v => v / pts.length);
  const inTri = (p, a, b, c, n) => M.dot(M.cross(M.sub(b, a), M.sub(p, a)), n) >= -1e-9 && M.dot(M.cross(M.sub(c, b), M.sub(p, b)), n) >= -1e-9 && M.dot(M.cross(M.sub(a, c), M.sub(p, c)), n) >= -1e-9;
  const rgb = aci => { const c = C.aciRgb(aci === 7 ? 9 : aci); return [c[0] / 255, c[1] / 255, c[2] / 255]; };

  /* ================= BİRLEŞİK KATI ================= */
  const unionMesh = e => {
    const data = e.parts.map(q => { const t = C.entTris(copy(q)); if (!t) return null; const P2 = t.pos, tris = [], bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      for (let i = 0; i < P2.length; i += 9) { const a = [P2[i], P2[i + 1], P2[i + 2]], b = [P2[i + 3], P2[i + 4], P2[i + 5]], c = [P2[i + 6], P2[i + 7], P2[i + 8]]; for (const p of [a, b, c]) for (let k = 0; k < 3; k++) { bb[k] = Math.min(bb[k], p[k]); bb[k + 3] = Math.max(bb[k + 3], p[k]); } let n = M.cross(M.sub(b, a), M.sub(c, a)); const l = M.len(n); if (l < 1e-14) { tris.push(null); continue; } n = M.mul(n, 1 / l); tris.push({ a, b, c, n, d: M.dot(n, a) }); }
      return { t, tris, bb, col: q.color != null && q.color !== 256 && q.color !== 0 ? rgb(q.color) : null }; });
    const total = data.reduce((s, x) => s + (x ? x.tris.length : 0), 0), doRm = total < 80000 && data.length > 1;
    const internal = (i, tr) => { const c = M.mul(M.add(M.add(tr.a, tr.b), tr.c), 1 / 3);
      for (let j = 0; j < data.length; j++) { if (j === i || !data[j]) continue; const bb = data[j].bb; if (c[0] < bb[0] - 1e-6 || c[1] < bb[1] - 1e-6 || c[2] < bb[2] - 1e-6 || c[0] > bb[3] + 1e-6 || c[1] > bb[4] + 1e-6 || c[2] > bb[5] + 1e-6) continue;
        for (const u of data[j].tris) { if (!u || M.dot(u.n, tr.n) > -0.9999 || Math.abs(M.dot(u.n, c) - u.d) > 1e-6) continue; if (inTri(c, u.a, u.b, u.c, u.n)) return true; } }
      return false; };
    const v = [], vn = [], f = [], fc = [], ed = [], seen = new Set(); let anyCol = false; const own = rgb(C.entColor(e));
    data.forEach((x, i) => { if (!x) return; const P2 = x.t.pos, N = x.t.nrm; if (x.col) anyCol = true;
      x.tris.forEach((tr, k) => { if (!tr || (doRm && internal(i, tr))) return; const j = k * 9, b0 = v.length; for (let q = 0; q < 3; q++) { v.push([P2[j + q * 3], P2[j + q * 3 + 1], P2[j + q * 3 + 2]]); vn.push([N[j + q * 3], N[j + q * 3 + 1], N[j + q * 3 + 2]]); } f.push([b0, b0 + 1, b0 + 2]); fc.push(x.col || own); });
      for (const [a, b] of x.t.edges) { const ka = a.map(t => t.toFixed(5)).join(','), kb = b.map(t => t.toFixed(5)).join(','), k = ka < kb ? ka + '|' + kb : kb + '|' + ka; if (seen.has(k)) continue; seen.add(k); ed.push([a, b]); } });
    return { t: 'tri', v, vn, f, fc: anyCol ? fc : undefined, edges3: ed };
  };
  T.grup3 = {
    label: 'Birleşik katı', ifc: 'IfcBuildingElementProxy',
    prims: e => e.parts.flatMap(q => { try { return C.prims(copy(q)); } catch (er) { return []; } }),
    mesh: e => [unionMesh(e)],
    snaps: e => e.parts.flatMap(q => { try { return C.snapPts(copy(q)); } catch (er) { return []; } }),
    xf: (e, X) => { for (const q of e.parts) C.xform(q, X); },
    info: e => { let V = 0; for (const q of e.parts) { const t = C.entTris(copy(q)); if (t) V += triVol(t); } return `${e.parts.length} parça (${[...new Set(e.parts.map(q => (T[q.type] || {}).label || q.type))].join(', ')}) · toplam hacim ≈ ${M.fmt(V, 3)} m³`; },
  };
  /* birleşik katının, verilen noktadaki yüzü içeren parçası */
  C.partAt = (owner, p, n) => {
    for (const part of owner.parts) { const t = C.entTris(part); if (!t) continue; const P2 = t.pos;
      for (let i = 0; i < P2.length; i += 9) { const a = [P2[i], P2[i + 1], P2[i + 2]], b = [P2[i + 3], P2[i + 4], P2[i + 5]], c = [P2[i + 6], P2[i + 7], P2[i + 8]]; let nn = M.cross(M.sub(b, a), M.sub(c, a)); const l = M.len(nn); if (l < 1e-14) continue; nn = M.mul(nn, 1 / l);
        if (Math.abs(M.dot(nn, n)) < 0.9999 || Math.abs(M.dot(nn, M.sub(p, a))) > 1e-4) continue; if (inTri(p, a, b, c, nn)) return { part, ti: i / 9 }; } }
    return null;
  };
  /* birleşik katının bir yüzündeki işlemi ilgili parçaya yönlendir; çıkan yeni katıları da birleşiğe kat */
  C.grupDelegate = (f, op) => {
    const owner = f.e, cands = [f.p, centroid(f.pts), ...f.pts.map(q => M.lerp(q, centroid(f.pts), 0.02))].filter(Boolean);
    let r = null; for (const q of cands) { r = C.partAt(owner, q, f.n); if (r) break; } if (!r) throw new Error('Birleşik katıda bu yüzün parçası bulunamadı');
    const fp = C.facePoly(r.part, r.ti, f.n); if (!fp) throw new Error('Yüz bulunamadı');
    const before = new Set(C.doc.ents);
    op({ kind: 'mesh', e: r.part, ti: r.ti, pts: fp.pts, n: fp.n, holes: fp.holes, p: f.p });
    const added = C.doc.ents.filter(x => !before.has(x) && x !== owner && C.meshes(x));
    if (added.length) { C.remove(added); for (const a of added) owner.parts.push(clean(a)); }
    delete r.part._c; delete owner._c; C.touch(owner); return owner;
  };
  C.joinInto = (host, k) => {
    if (host.type === 'grup3') { C.remove([k]); host.parts.push(clean(k)); delete host._c; C.touch(host); return host; }
    const g = C.newEnt('grup3', { layer: host.layer, color: host.color, parts: [clean(host), clean(k)] }); C.remove([host, k]); C.add(g); return g;
  };
  C.addCommand(['UNION', 'UNI', 'BIRLESTIR', 'BIRLES', 'TEKPARCA'], 'Seçilen 3B nesneleri (katı, kutu, silindir, havuz, boru, model…) tek parça yapar: birlikte seçilir, taşınır, kopyalanır, silinir; birbirine değen iç yüzler gizlenir. İT/ÇEK, ESNET, delik ve PAH birleşik parçanın yüzlerinde de çalışır. Ayırmak için AYIR.', async (I) => {
    const s = (await I.sel('Birleştirilecek 3B nesneleri seçin')).filter(e => { const m = C.meshes(e); return m && m.length; });
    if (s.length < 2) { C.warn('En az iki 3B nesne seçin (çizgi ve yazılar birleştirilmez).'); return; }
    const parts = s.flatMap(e => e.type === 'grup3' ? e.parts.map(clean) : [clean(e)]);
    const g = C.newEnt('grup3', { layer: s[0].layer, color: s[0].color, parts }); C.remove(s); C.add(g); C.lastEnt = g;
    C.log(`${parts.length} nesne tek parça yapıldı → ${C.describe(g)}`);
  });
  C.addCommand(['SEPARATE', 'AYIR', 'PARCALARAAYIR'], 'Birleşik katıyı parçalarına ayırır', async (I) => {
    const s = (await I.sel('Ayrılacak birleşik katıları seçin')).filter(e => e.type === 'grup3'); if (!s.length) { C.warn('Birleşik katı seçilmedi'); return; }
    let n = 0; for (const g of s) { for (const q of g.parts) { const o = JSON.parse(JSON.stringify(clean(q))); delete o.id; C.add(C.newEnt(o.type, o)); n++; } C.remove([g]); }
    C.log(`${n} parçaya ayrıldı.`);
  });
  C.addCommand(['OTOBIRLESTIR', 'AUTOUNION'], 'İT/ÇEK ile bir katının yüzünden çıkan parçaların otomatik birleştirilmesini açar/kapatır', async (I) => {
    const v = await I.kw('Otomatik birleştirme', [['AC', 'Aç'], ['KAPAT', 'Kapat']], C.autoJoinOff ? 'AC' : 'KAPAT'); C.autoJoinOff = v === 'KAPAT'; C.log('İT/ÇEK otomatik birleştirme ' + (C.autoJoinOff ? 'KAPALI' : 'AÇIK'));
  }, { noUndo: true });
  { const ex0 = C.explode; C.explode = e => e.type === 'grup3' ? e.parts.map(q => { const o = JSON.parse(JSON.stringify(clean(q))); delete o.id; return o; }) : ex0(e); }

  /* ================= ÇOKYÜZLÜ YARDIMCILARI ================= */
  const compact = e => { const used = [...new Set(e.faces.flat())].sort((a, b) => a - b), map = new Map(used.map((o, i) => [o, i])); e.v = used.map(i => e.v[i]); e.faces = e.faces.map(f => f.map(i => map.get(i))); };
  const ringsToPoly = (e, rings) => { // rings: [{pts:[[u,v]] CCW, w}] alttan üste; yerel çerçeve e (kati)
    const n = rings[0].pts.length, v = [], faces = [];
    for (const r of rings) for (const [u, w2] of r.pts) v.push(S.W(e, u, w2, r.w));
    faces.push([...Array(n).keys()].reverse());
    for (let k = 0; k + 1 < rings.length; k++) for (let i = 0; i < n; i++) { const j = (i + 1) % n, a = k * n; faces.push([a + i, a + j, a + n + j, a + n + i]); }
    faces.push([...Array(n).keys()].map(i => i + (rings.length - 1) * n));
    const keep = { id: e.id, layer: e.layer, color: e.color, lt: e.lt, lw: e.lw }; for (const k of Object.keys(e)) delete e[k];
    Object.assign(e, keep, { type: 'poly3', v, faces }); compact(e); return e;
  };
  const ccwProf = e => { const p = S.profPts(e).slice(); return M.polyArea(p) < 0 ? p.reverse() : p; };
  const offsetOk = (src, r, d) => { if (r.length !== src.length) return false; const a0 = M.polyArea(src), a1 = M.polyArea(r); if (a0 * a1 <= 0) return false; for (let i = 0; i < r.length; i++) { const a = src[i], b = src[(i + 1) % src.length], c = r[i], e2 = r[(i + 1) % r.length]; if ((b[0] - a[0]) * (e2[0] - c[0]) + (b[1] - a[1]) * (e2[1] - c[1]) <= 0) return false; } return d > 0 ? Math.abs(a1) < Math.abs(a0) : Math.abs(a1) >= Math.abs(a0); };
  const asKati = e => { if (e.type === 'box') S.boxToKati(e); if (e.type === 'cyl') { const keep = { id: e.id, layer: e.layer, color: e.color, lt: e.lt, lw: e.lw }, c = M.p3(e.c), r = e.r, h = e.h; for (const k of Object.keys(e)) delete e[k]; Object.assign(e, keep, { type: 'kati', o: c, ux: [1, 0, 0], uz: [0, 0, 1], prof: { r }, h, holes: [] }); } return e; };

  /* ================= PAH ================= */
  const chamferProf = (pts, i, d1, d2) => { const n = pts.length, Pp = pts[i], A = pts[(i - 1 + n) % n], B = pts[(i + 1) % n]; const la = Math.hypot(A[0] - Pp[0], A[1] - Pp[1]), lb = Math.hypot(B[0] - Pp[0], B[1] - Pp[1]); if (d1 >= la - 1e-9 || d2 >= lb - 1e-9) throw new Error('Pah mesafesi kenar boyundan büyük'); const p1 = [Pp[0] + (A[0] - Pp[0]) / la * d1, Pp[1] + (A[1] - Pp[1]) / la * d1], p2 = [Pp[0] + (B[0] - Pp[0]) / lb * d2, Pp[1] + (B[1] - Pp[1]) / lb * d2]; return pts.slice(0, i).concat([p1, p2], pts.slice(i + 1)); };
  const polyChamferEdge = (e, ia, ib, d1, d2) => {
    const F = e.faces, V = e.v, hasE = (f, a, b) => { const m = f.length; for (let i = 0; i < m; i++) { const x = f[i], y = f[(i + 1) % m]; if ((x === a && y === b) || (x === b && y === a)) return true; } return false; };
    const fs = F.map((f, k) => k).filter(k => hasE(F[k], ia, ib)); if (fs.length !== 2) throw new Error('Bu kenar iki yüz arasında değil');
    const nrm = k => S.newellN(F[k].map(i => V[i])); let [k1, k2] = fs; if (nrm(k2)[2] > nrm(k1)[2] + 1e-9) [k1, k2] = [k2, k1];
    const n1 = nrm(k1), n2 = nrm(k2); if (M.dot(n1, n2) > 0.9999) throw new Error('Bu kenar düz bir yüzün içinde; pahlanamaz');
    const deg = a => F.filter(f => f.includes(a)).length; if (deg(ia) !== 3 || deg(ib) !== 3) throw new Error('Bu kenarın köşelerinde 3\'ten fazla yüz birleşiyor; önce komşu pahları tek tek yapın');
    const other = (k, a, b) => { const f = F[k], m = f.length, i = f.indexOf(a), pv = f[(i - 1 + m) % m], nx = f[(i + 1) % m]; return pv === b ? nx : pv; };
    const at = (a, x, d) => { const l = M.dist(V[a], V[x]); if (d >= l - 1e-9) throw new Error('Pah mesafesi komşu kenardan uzun'); return M.add(V[a], M.mul(M.norm(M.sub(V[x], V[a])), d)); };
    const xa1 = other(k1, ia, ib), xa2 = other(k2, ia, ib), xb1 = other(k1, ib, ia), xb2 = other(k2, ib, ia), nv = V.length;
    V.push(at(ia, xa1, d1), at(ia, xa2, d2), at(ib, xb1, d1), at(ib, xb2, d2)); const a1 = nv, a2 = nv + 1, b1 = nv + 2, b2 = nv + 3;
    const ends = [[ia, xa1, a1, a2], [ib, xb1, b1, b2]].map(([v0, x1, p1, p2]) => ({ k: F.findIndex((f, kk) => kk !== k1 && kk !== k2 && f.includes(v0)), v0, x1, p1, p2 }));
    F[k1] = F[k1].map(i => i === ia ? a1 : i === ib ? b1 : i); F[k2] = F[k2].map(i => i === ia ? a2 : i === ib ? b2 : i);
    for (const t of ends) { const f = F[t.k], m = f.length, i = f.indexOf(t.v0), pv = f[(i - 1 + m) % m]; F[t.k] = f.slice(0, i).concat(pv === t.x1 ? [t.p1, t.p2] : [t.p2, t.p1], f.slice(i + 1)); }
    let nf = [a1, b1, b2, a2]; if (M.dot(S.newellN(nf.map(i => V[i])), M.add(n1, n2)) < 0) nf.reverse(); F.push(nf);
    compact(e);
  };
  const near = (p, q) => M.dist(p, q) < 1e-5;
  /* bir 3B kenarı pahla: e varlık, a/b dünya uçları, d1 (üst / ilk yüz boyunca), d2 (diğer yüz boyunca) */
  C.chamferEdge = (ent, a, b, d1, d2) => {
    let e = ent, owner = null;
    if (e.type === 'grup3') { owner = e; e = e.parts.find(q => { const t = C.entTris(q); return t && t.edges.some(([x, y]) => (near(x, a) && near(y, b)) || (near(x, b) && near(y, a))); }); if (!e) throw new Error('Kenarın parçası bulunamadı'); }
    asKati(e);
    if (e.type === 'kati') {
      if (Math.abs(e.h || 0) < 1e-7) throw new Error('Kalınlığı olmayan yüz pahlanamaz');
      const uy = M.cross(e.uz, e.ux), loc = q => { const v = M.sub(q, e.o); return [M.dot(v, e.ux), M.dot(v, uy), M.dot(v, e.uz)]; }, la = loc(a), lb = loc(b);
      if (Math.hypot(la[0] - lb[0], la[1] - lb[1]) < 1e-6 && Array.isArray(e.prof)) { // düşey kenar -> profil köşesi
        const i = e.prof.findIndex(q => Math.hypot(q[0] - la[0], q[1] - la[1]) < 1e-5); if (i < 0) throw new Error('Köşe bulunamadı');
        let pr = e.prof; const ccw = M.polyArea(pr) >= 0; e.prof = ccw ? chamferProf(pr, i, d1, d2) : chamferProf(pr, i, d2, d1); C.touch(e); if (owner) { delete owner._c; C.touch(owner); } return owner || e;
      }
      if (!Array.isArray(e.prof)) throw new Error('Silindirin dairesel kenarı için yüzü seçip PAH → Yüz kenarları kullanın');
      S.katiToPoly(e);
    }
    if (e.type !== 'poly3') throw new Error(`${(T[e.type] || {}).label || e.type} kenarı pahlanamaz (katı, kutu ve çokyüzlü katılarda çalışır)`);
    const ia = e.v.findIndex(q => near(q, a)), ib = e.v.findIndex(q => near(q, b)); if (ia < 0 || ib < 0) throw new Error('Kenar bulunamadı');
    polyChamferEdge(e, ia, ib, d1, d2); C.touch(e); if (owner) { delete owner._c; C.touch(owner); } return owner || e;
  };
  /* üst / alt yüzün tüm kenarlarını pahla (dH: yüz içinde yatay, dV: yanal yüz boyunca) */
  C.chamferCap = (ent, f, dH, dV) => {
    let e = ent, owner = null;
    if (e.type === 'grup3') { owner = e; const r = C.partAt(e, centroid(f.pts), f.n); if (!r) throw new Error('Parça bulunamadı'); e = r.part; }
    asKati(e); if (e.type !== 'kati') throw new Error('Yüz kenarları pahı katı, kutu ve silindirlerin üst/alt yüzünde çalışır');
    if ((e.holes || []).length) throw new Error('Delikli katıda yüz pahı yapılamıyor');
    const c = M.dot(f.n, e.uz); if (Math.abs(c) < 0.9999) throw new Error('Üst ya da alt yüzü seçin (yan yüzler için kenara tek tek tıklayın)');
    const pr = ccwProf(e), h = e.h, inner = C.offsetPoly(pr, dH); if (!offsetOk(pr, inner, dH)) throw new Error('Pah mesafesi yüz için çok büyük');
    if (dV >= h - 1e-9) throw new Error('Pah yüksekliği katı yüksekliğinden büyük');
    ringsToPoly(e, c > 0 ? [{ pts: pr, w: 0 }, { pts: pr, w: h - dV }, { pts: inner, w: h }] : [{ pts: inner, w: 0 }, { pts: pr, w: dV }, { pts: pr, w: h }]);
    C.touch(e); if (owner) { delete owner._c; C.touch(owner); } return owner || e;
  };
  const edgeNear = p => { // komut satırı: noktaya en yakın 3B kenar
    let best = null, bd = 1e-3; for (const e of C.doc.ents) { if (!C.layer(e.layer).on) continue; const t = C.entTris(e); if (!t) continue; for (const [a, b] of t.edges) { const v = M.sub(b, a), l2 = M.dot(v, v); if (l2 < 1e-12) continue; let s = M.dot(M.sub(p, a), v) / l2; s = Math.max(0, Math.min(1, s)); const d = M.dist(p, M.add(a, M.mul(v, s))); if (d < bd) { bd = d; best = { e, a, b }; } } }
    return best;
  };
  const st = { d: 0.1, a: 45 };
  const takeMA = () => { const kv = {}; E.queue = E.queue.filter(t => { const m = /^([A-Za-z]+)=(.*)$/.exec(t); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; }); if (kv.M) st.d = C.num(kv.M); if (kv.A) st.a = C.num(kv.A); };
  const chamfer3d = async I => {
    if (C.selFace && C.byId(C.selFace.e.id)) { // seçili yüz: tüm kenarları
      const sf = C.selFace; C.selFace = null; C.emit('selection');
      st.d = await I.num('Pah mesafesi (yüz içinde)', st.d); st.a = await I.num('Pah açısı (°; 45 = eşit)', st.a);
      const r = C.chamferCap(sf.e, sf, st.d, st.d * Math.tan(st.a * RAD)); C.lastEnt = r; C.log(`Yüz kenarları pahlandı (${M.fmt(st.d, 3)} m, ${st.a}°) → ${C.describe(r)}`); return;
    }
    let n = 0;
    for (; ;) {
      E.hover = 'edge'; E.noSnap = true;
      const p = await I.pt(`Pahlanacak kenara tıklayın (mesafe ${M.fmt(st.d, 3)} m, açı ${st.a}°)`, { kw: [['M', 'Mesafe'], ['A', 'Açı'], ['Y', 'Yüzün tüm kenarları']] });
      E.hover = null; E.noSnap = false;
      if (p == null) break;
      if (p === 'M') { st.d = await I.num('Pah mesafesi (m)', st.d); continue; }
      if (p === 'A') { st.a = await I.num('Pah açısı (°; 45 = eşit, ilk yüz: üstteki)', st.a); continue; }
      if (p === 'Y') { E.hover = 'face'; E.noSnap = true; const q = await I.pt('Kenarları pahlanacak üst/alt yüze tıklayın'); E.hover = null; E.noSnap = false; if (!q || typeof q === 'string') continue; const f = C.faceTarget(q); if (!f || f.kind !== 'mesh') { C.warn('Yüz bulunamadı'); continue; } try { const r = C.chamferCap(f.e, f, st.d, st.d * Math.tan(st.a * RAD)); C.lastEnt = r; n++; C.log('Yüz kenarları pahlandı → ' + C.describe(r)); } catch (er) { C.warn(er.message); } if (E.scriptMode) break; continue; }
      if (typeof p === 'string') break;
      const ed = E.lastEdge && E.lastEdge.e ? E.lastEdge : edgeNear(p); E.lastEdge = null;
      if (!ed) { C.warn('Burada bir 3B kenar yok'); if (E.scriptMode) break; continue; }
      try { const r = C.chamferEdge(ed.e, ed.a, ed.b, st.d, st.d * Math.tan(st.a * RAD)); C.lastEnt = r; n++; C.log(`Kenar pahlandı (${M.fmt(st.d, 3)} m, ${st.a}°) → ${C.describe(r)}`); }
      catch (er) { C.warn(er.message); }
      if (E.scriptMode) break;
    }
  };
  /* 2B pah: iki çizgi ya da çoklu çizgi köşesi */
  const chamfer2d = async I => {
    let p1;
    for (; ;) {
      p1 = await I.pt(`Birinci çizgi ya da çoklu çizgi köşesi (mesafe ${M.fmt(st.d, 3)}, açı ${st.a}°)`, { kw: [['M', 'Mesafe'], ['A', 'Açı'], ['P', 'Çoklu çizginin tüm köşeleri']] });
      if (p1 === 'M') { st.d = await I.num('Pah mesafesi', st.d); continue; }
      if (p1 === 'A') { st.a = await I.num('Pah açısı (°, birinci çizgiden; 45 = eşit)', st.a); continue; }
      break;
    }
    if (p1 == null) return; const d1 = st.d, d2 = st.d * Math.tan(st.a * RAD);
    if (p1 === 'P') {
      const s = (await I.sel('Çoklu çizgileri seçin')).filter(e => e.type === 'pline'); let n = 0;
      for (const e of s) { if (e.bul && e.bul.some(b => b)) { C.warn('Yaylı çoklu çizgi atlandı'); continue; } let pts = e.pts.map(q => [q[0], q[1]]); const z = e.pts[0][2] || 0; const idx = e.closed ? [...pts.keys()] : [...pts.keys()].slice(1, -1);
        for (const i of idx.reverse()) { try { pts = chamferProf(pts, i, d1, d2); n++; } catch (er) { } } e.pts = pts.map(q => [q[0], q[1], z]); delete e.bul; C.touch(e); }
      C.log(`${n} köşe pahlandı.`); return;
    }
    if (typeof p1 === 'string') return;
    const e1 = C.pickAt(p1);
    if (e1 && e1.type === 'pline') { // tek köşe
      if (e1.bul && e1.bul.some(b => b)) { C.warn('Yaylı çoklu çizgide pah yapılamıyor'); return; }
      const pts = e1.pts.map(q => [q[0], q[1]]); let i = -1, bd = Infinity; pts.forEach((q, k) => { if (!e1.closed && (k === 0 || k === pts.length - 1)) return; const d = Math.hypot(q[0] - p1[0], q[1] - p1[1]); if (d < bd) { bd = d; i = k; } });
      if (i < 0) { C.warn('Köşe bulunamadı'); return; }
      const z = e1.pts[0][2] || 0; e1.pts = chamferProf(pts, i, d1, d2).map(q => [q[0], q[1], z]); C.touch(e1); return;
    }
    const p2 = await I.pt('İkinci çizgi'); if (!p2 || typeof p2 === 'string') return; const e2 = C.pickAt(p2);
    if (!e1 || !e2 || e1.type !== 'line' || e2.type !== 'line' || e1 === e2) { C.warn('İki ayrı çizgi ya da bir çoklu çizgi köşesi seçin'); return; }
    const x = M.segInt(e1.a, e1.b, e2.a, e2.b); if (!x) { C.warn('Çizgiler paralel'); return; } const X = x.p;
    const keep = (e, p) => (M.dot(M.sub(e.a, X), M.sub(p, X)) > M.dot(M.sub(e.b, X), M.sub(p, X)) ? 'a' : 'b');
    const k1 = keep(e1, p1), k2 = keep(e2, p2), u1 = M.norm(M.sub(e1[k1], X)), u2 = M.norm(M.sub(e2[k2], X));
    if (M.dist2(e1[k1], X) < d1 || M.dist2(e2[k2], X) < d2) { C.warn('Pah mesafesi çizgiden uzun'); return; }
    const T1 = M.add(X, M.mul(u1, d1)), T2 = M.add(X, M.mul(u2, d2));
    e1[k1 === 'a' ? 'b' : 'a'] = T1; e2[k2 === 'a' ? 'b' : 'a'] = T2; C.touch(e1); C.touch(e2);
    C.add(C.newEnt('line', { a: T1, b: T2, layer: e1.layer }));
  };
  C.addCommand(['CHAMFER', 'CHA', 'PAH', 'PAHLA'], 'Pah. Planda: iki çizgi ya da çoklu çizgi köşesi (P = tüm köşeler); 3B görünümde: katı kenarına tıklayın (Y = seçili / tıklanan yüzün tüm kenarları). M = mesafe, A = açı (45° = eşit pah). Komut satırı: PAH M=0.1 A=45 ...', async (I) => { takeMA(); return in3d() ? chamfer3d(I) : chamfer2d(I); });


  /* ================= YUVARLATMA (FILLET) ================= */
  const arcSegs = sw => Math.max(3, Math.ceil(sw / (Math.PI / 16)));
  /* 2B profil köşesini r yarıçaplı yayla değiştir */
  const filletProf = (pts, i, r) => {
    const n = pts.length, Pp = pts[i], A = pts[(i - 1 + n) % n], B = pts[(i + 1) % n];
    const la = Math.hypot(A[0] - Pp[0], A[1] - Pp[1]), lb = Math.hypot(B[0] - Pp[0], B[1] - Pp[1]); if (la < 1e-12 || lb < 1e-12) return pts;
    const u1 = [(A[0] - Pp[0]) / la, (A[1] - Pp[1]) / la], u2 = [(B[0] - Pp[0]) / lb, (B[1] - Pp[1]) / lb], ph = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])));
    if (ph > Math.PI - 1e-6) return pts; const t = r / Math.tan(ph / 2); if (t >= la - 1e-9 || t >= lb - 1e-9) throw new Error('Yarıçap bu köşe için çok büyük');
    const bis = [u1[0] + u2[0], u1[1] + u2[1]], bl = Math.hypot(bis[0], bis[1]), c = [Pp[0] + bis[0] / bl * r / Math.sin(ph / 2), Pp[1] + bis[1] / bl * r / Math.sin(ph / 2)];
    const T1 = [Pp[0] + u1[0] * t, Pp[1] + u1[1] * t], T2 = [Pp[0] + u2[0] * t, Pp[1] + u2[1] * t];
    let a0 = Math.atan2(T1[1] - c[1], T1[0] - c[0]), a1 = Math.atan2(T2[1] - c[1], T2[0] - c[0]), sw = a1 - a0; while (sw > Math.PI) sw -= 2 * Math.PI; while (sw < -Math.PI) sw += 2 * Math.PI;
    const k = arcSegs(Math.abs(sw)), arc = []; for (let j = 0; j <= k; j++) { const a = a0 + sw * j / k; arc.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); }
    return pts.slice(0, i).concat(arc, pts.slice(i + 1));
  };
  C.filletProf = filletProf;
  /* çokyüzlüde bir kenarı yuvarlat (iki ucunda 3 yüz birleşmeli) */
  const polyFilletEdge = (e, ia, ib, r) => {
    const F = e.faces, V = e.v, hasE = (f, a, b) => { const m = f.length; for (let i = 0; i < m; i++) { const x = f[i], y = f[(i + 1) % m]; if ((x === a && y === b) || (x === b && y === a)) return true; } return false; };
    const fs = F.map((f, k) => k).filter(k => hasE(F[k], ia, ib)); if (fs.length !== 2) throw new Error('Bu kenar iki yüz arasında değil');
    const nrm = k => S.newellN(F[k].map(i => V[i])); const [k1, k2] = fs, n1 = nrm(k1), n2 = nrm(k2);
    if (M.dot(n1, n2) > 0.9999) throw new Error('Bu kenar düz bir yüzün içinde');
    const deg = a => F.filter(f => f.includes(a)).length; if (deg(ia) !== 3 || deg(ib) !== 3) throw new Error('Bu kenarın köşelerinde 3\'ten fazla yüz birleşiyor; yuvarlatılamıyor');
    const other = (k, a, b) => { const f = F[k], m = f.length, i = f.indexOf(a), pv = f[(i - 1 + m) % m], nx = f[(i + 1) % m]; return pv === b ? nx : pv; };
    const arcAt = (a, x1, x2) => { // a köşesinde F1 (x1 yönü) -> F2 (x2 yönü) yayı
      const P0 = V[a], u1 = M.norm(M.sub(V[x1], P0)), u2 = M.norm(M.sub(V[x2], P0)), ph = Math.acos(Math.max(-1, Math.min(1, M.dot(u1, u2))));
      const t = r / Math.tan(ph / 2); if (t >= M.dist(V[x1], P0) - 1e-9 || t >= M.dist(V[x2], P0) - 1e-9) throw new Error('Yarıçap bu kenar için çok büyük');
      const c = M.add(P0, M.mul(M.norm(M.add(u1, u2)), r / Math.sin(ph / 2))), T1 = M.add(P0, M.mul(u1, t)), T2 = M.add(P0, M.mul(u2, t));
      const v1 = M.sub(T1, c), v2 = M.sub(T2, c), sw = Math.acos(Math.max(-1, Math.min(1, M.dot(M.norm(v1), M.norm(v2))))), k = arcSegs(sw), out = [];
      for (let j = 0; j <= k; j++) { const s2 = j / k, w1 = Math.sin((1 - s2) * sw) / Math.sin(sw), w2 = Math.sin(s2 * sw) / Math.sin(sw); out.push(M.add(c, M.add(M.mul(v1, w1), M.mul(v2, w2)))); }
      return out;
    };
    const xa1 = other(k1, ia, ib), xa2 = other(k2, ia, ib), xb1 = other(k1, ib, ia), xb2 = other(k2, ib, ia);
    const Aa = arcAt(ia, xa1, xa2), Bb = arcAt(ib, xb1, xb2); if (Aa.length !== Bb.length) throw new Error('Kenar uçları farklı açıda; yuvarlatılamıyor');
    const m = Aa.length, base = V.length; Aa.forEach(p => V.push(p)); Bb.forEach(p => V.push(p)); const A = j => base + j, B = j => base + m + j;
    const ends = [[ia, xa1, A], [ib, xb1, B]].map(([v0, x1, idx]) => ({ k: F.findIndex((f, kk) => kk !== k1 && kk !== k2 && f.includes(v0)), v0, x1, idx }));
    F[k1] = F[k1].map(i => i === ia ? A(0) : i === ib ? B(0) : i); F[k2] = F[k2].map(i => i === ia ? A(m - 1) : i === ib ? B(m - 1) : i);
    for (const t of ends) { const f = F[t.k], mm = f.length, i = f.indexOf(t.v0), pv = f[(i - 1 + mm) % mm], seq = [...Array(m).keys()].map(t.idx); F[t.k] = f.slice(0, i).concat(pv === t.x1 ? seq : seq.reverse(), f.slice(i + 1)); }
    for (let j = 0; j + 1 < m; j++) { let q = [A(j), B(j), B(j + 1), A(j + 1)]; const nn = S.newellN(q.map(i => V[i])), out = M.sub(M.lerp(V[A(j)], V[B(j + 1)], 0.5), M.lerp(V[ia], V[ib], 0.5)); if (nn && M.dot(nn, M.add(n1, n2)) < 0) q.reverse(); void out; F.push(q); }
    compact(e);
  };
  C.filletEdge = (ent, a, b, r) => {
    let e = ent, owner = null;
    if (e.type === 'grup3') { owner = e; e = e.parts.find(q => { const t = C.entTris(q); return t && t.edges.some(([x, y]) => (near(x, a) && near(y, b)) || (near(x, b) && near(y, a))); }); if (!e) throw new Error('Kenarın parçası bulunamadı'); }
    asKati(e);
    if (e.type === 'kati') {
      if (Math.abs(e.h || 0) < 1e-7) throw new Error('Kalınlığı olmayan yüz yuvarlatılamaz');
      const uy = M.cross(e.uz, e.ux), loc = q => { const v = M.sub(q, e.o); return [M.dot(v, e.ux), M.dot(v, uy), M.dot(v, e.uz)]; }, la = loc(a), lb = loc(b);
      if (Math.hypot(la[0] - lb[0], la[1] - lb[1]) < 1e-6 && Array.isArray(e.prof)) { const i = e.prof.findIndex(q => Math.hypot(q[0] - la[0], q[1] - la[1]) < 1e-5); if (i < 0) throw new Error('Köşe bulunamadı'); e.prof = filletProf(e.prof, i, r); C.touch(e); if (owner) { delete owner._c; C.touch(owner); } return owner || e; }
      if (!Array.isArray(e.prof)) throw new Error('Silindirin dairesel kenarı için yüzü seçip YUVARLA → Yüz kenarları kullanın');
      S.katiToPoly(e);
    }
    if (e.type !== 'poly3') throw new Error(`${(T[e.type] || {}).label || e.type} kenarı yuvarlatılamaz`);
    const ia = e.v.findIndex(q => near(q, a)), ib = e.v.findIndex(q => near(q, b)); if (ia < 0 || ib < 0) throw new Error('Kenar bulunamadı');
    polyFilletEdge(e, ia, ib, r); C.touch(e); if (owner) { delete owner._c; C.touch(owner); } return owner || e;
  };
  /* üst / alt yüzün tüm kenarlarını yuvarlat (çeyrek daire halkaları) */
  C.filletCap = (ent, f, r) => {
    let e = ent, owner = null;
    if (e.type === 'grup3') { owner = e; const rr = C.partAt(e, centroid(f.pts), f.n); if (!rr) throw new Error('Parça bulunamadı'); e = rr.part; }
    asKati(e); if (e.type !== 'kati') throw new Error('Yüz kenarı yuvarlatma katı, kutu ve silindirin üst/alt yüzünde çalışır');
    if ((e.holes || []).length) throw new Error('Delikli katıda yüz yuvarlatma yapılamıyor');
    const c = M.dot(f.n, e.uz); if (Math.abs(c) < 0.9999) throw new Error('Üst ya da alt yüzü seçin');
    const pr = ccwProf(e), h = e.h; if (r >= h - 1e-9) throw new Error('Yarıçap katı yüksekliğinden büyük');
    const k = 8, rings = [];
    for (let j = 0; j <= k; j++) { const th = (Math.PI / 2) * j / k, inset = r - r * Math.cos(th), dz = r * Math.sin(th); const pts = j ? C.offsetPoly(pr, inset) : pr; if (j && !offsetOk(pr, pts, inset)) throw new Error('Yarıçap bu yüz için çok büyük'); rings.push({ pts, w: c > 0 ? h - r + dz : r - dz }); }
    ringsToPoly(e, c > 0 ? [{ pts: pr, w: 0 }, ...rings] : [...rings.reverse(), { pts: pr, w: h }]);
    C.touch(e); if (owner) { delete owner._c; C.touch(owner); } return owner || e;
  };
  const fst = { r: 0.1 };
  const fillet3d = async I => {
    const kv = {}; E.queue = E.queue.filter(t => { const m = /^([A-Za-z]+)=(.*)$/.exec(t); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; }); if (kv.R) fst.r = C.num(kv.R);
    if (C.selFace && C.byId(C.selFace.e.id)) { const sf = C.selFace; C.selFace = null; C.emit('selection'); fst.r = await I.num('Yuvarlatma yarıçapı (m)', fst.r); const r = C.filletCap(sf.e, sf, fst.r); C.lastEnt = r; C.log(`Yüz kenarları R=${M.fmt(fst.r, 3)} m yuvarlatıldı → ${C.describe(r)}`); return; }
    for (; ;) {
      E.hover = 'edge'; E.noSnap = true;
      const p = await I.pt(`Yuvarlatılacak kenara tıklayın (R = ${M.fmt(fst.r, 3)} m)`, { kw: [['R', 'Yarıçap'], ['Y', 'Yüzün tüm kenarları']] }); E.hover = null; E.noSnap = false;
      if (p == null) break;
      if (p === 'R') { fst.r = await I.num('Yuvarlatma yarıçapı (m)', fst.r); continue; }
      if (p === 'Y') { E.hover = 'face'; E.noSnap = true; const q = await I.pt('Kenarları yuvarlatılacak üst/alt yüze tıklayın'); E.hover = null; E.noSnap = false; if (!q || typeof q === 'string') continue; const f = C.faceTarget(q); if (!f || f.kind !== 'mesh') { C.warn('Yüz bulunamadı'); continue; } try { const r = C.filletCap(f.e, f, fst.r); C.lastEnt = r; C.log('Yüz kenarları yuvarlatıldı → ' + C.describe(r)); } catch (er) { C.warn(er.message); } if (E.scriptMode) break; continue; }
      if (typeof p === 'string') break;
      const ed = E.lastEdge && E.lastEdge.e ? E.lastEdge : edgeNear(p); E.lastEdge = null;
      if (!ed) { C.warn('Burada bir 3B kenar yok'); if (E.scriptMode) break; continue; }
      try { const r = C.filletEdge(ed.e, ed.a, ed.b, fst.r); C.lastEnt = r; C.log(`Kenar R=${M.fmt(fst.r, 3)} m yuvarlatıldı → ${C.describe(r)}`); } catch (er) { C.warn(er.message); }
      if (E.scriptMode) break;
    }
  };
  /* 2B: çoklu çizgi köşesine yay (bulge) */
  const plineFillet = (e, i, r) => {
    const n = e.pts.length, bul = (e.bul || []).slice(); while (bul.length < n) bul.push(0);
    const iP = (i - 1 + n) % n; if (bul[iP] || bul[i]) throw new Error('Yaylı kenarın köşesi yuvarlatılamaz');
    const Pp = e.pts[i], A = e.pts[iP], B = e.pts[(i + 1) % n], la = M.dist2(A, Pp), lb = M.dist2(B, Pp); if (la < 1e-12 || lb < 1e-12) return false;
    const u1 = [(A[0] - Pp[0]) / la, (A[1] - Pp[1]) / la], u2 = [(B[0] - Pp[0]) / lb, (B[1] - Pp[1]) / lb], ph = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])));
    if (ph > Math.PI - 1e-6) return false; const t = r / Math.tan(ph / 2); if (t >= la - 1e-9 || t >= lb - 1e-9) throw new Error('Yarıçap bu köşe için çok büyük');
    const z = Pp[2] || 0, T1 = [Pp[0] + u1[0] * t, Pp[1] + u1[1] * t, z], T2 = [Pp[0] + u2[0] * t, Pp[1] + u2[1] * t, z];
    const turn = (Pp[0] - A[0]) * (B[1] - Pp[1]) - (Pp[1] - A[1]) * (B[0] - Pp[0]), b = Math.tan((Math.PI - ph) / 4) * (turn > 0 ? 1 : -1);
    e.pts = e.pts.slice(0, i).concat([T1, T2], e.pts.slice(i + 1)); bul.splice(i, 1, b, 0); e.bul = bul; return true;
  };
  C.addCommand(['FILLET', 'F', 'KOSE', 'YUVARLA', 'YUVARLAT'], 'Yuvarlatma (yarıçaplı köşe). Planda: iki çizgi, çoklu çizgi köşesi ya da P = çoklu çizginin tüm köşeleri (R=0 → keskin köşe birleştir). 3B görünümde: katı kenarına tıklayın (R = yarıçap, Y = seçili / tıklanan yüzün tüm kenarları). Komut satırı: YUVARLA R=0.1 ...', async (I) => {
    if (in3d()) return fillet3d(I);
    const kv = {}; E.queue = E.queue.filter(t => { const m = /^([A-Za-z]+)=(.*)$/.exec(t); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; }); if (kv.R) E.filR = C.num(kv.R);
    let r = E.filR || 0, p1;
    for (; ;) { p1 = await I.pt(`Birinci çizgi ya da çoklu çizgi köşesi (yarıçap=${M.fmt(r, 3)})`, { kw: [['R', 'Yarıçap'], ['P', 'Çoklu çizginin tüm köşeleri']] }); if (p1 === 'R') { r = E.filR = await I.num('Köşe yarıçapı', r); continue; } break; }
    if (p1 == null) return;
    if (p1 === 'P') {
      if (r <= 0) { C.warn('Önce yarıçap verin (R)'); return; }
      const s2 = (await I.sel('Çoklu çizgileri seçin')).filter(e => e.type === 'pline'); let n = 0;
      for (const e of s2) { const idx = e.closed ? [...e.pts.keys()] : [...e.pts.keys()].slice(1, -1); for (const i of idx.reverse()) { try { if (plineFillet(e, i, r)) n++; } catch (er) { } } C.touch(e); }
      C.log(`${n} köşe R=${M.fmt(r, 3)} ile yuvarlatıldı.`); return;
    }
    if (typeof p1 === 'string') return;
    const e1 = C.pickAt(p1);
    if (e1 && e1.type === 'pline') {
      if (r <= 0) { C.warn('Çoklu çizgi köşesi için yarıçap verin (R)'); return; }
      let bi = -1, bd = Infinity; e1.pts.forEach((q, k) => { if (!e1.closed && (k === 0 || k === e1.pts.length - 1)) return; const d = M.dist2(q, p1); if (d < bd) { bd = d; bi = k; } });
      if (bi < 0) { C.warn('Köşe bulunamadı'); return; } plineFillet(e1, bi, r); C.touch(e1); return;
    }
    const p2 = await I.pt('İkinci çizgi'); if (!p2 || typeof p2 === 'string') return; const e2 = C.pickAt(p2);
    if (!e1 || !e2 || e1.type !== 'line' || e2.type !== 'line' || e1 === e2) { C.warn('İki ayrı çizgi ya da bir çoklu çizgi köşesi seçin'); return; }
    const x = M.segInt(e1.a, e1.b, e2.a, e2.b); if (!x) { C.warn('Çizgiler paralel'); return; } const X = x.p;
    const keep = (e, p) => (M.dot(M.sub(e.a, X), M.sub(p, X)) > M.dot(M.sub(e.b, X), M.sub(p, X)) ? 'a' : 'b');
    const k1 = keep(e1, p1), k2 = keep(e2, p2), u1 = M.norm(M.sub(e1[k1], X)), u2 = M.norm(M.sub(e2[k2], X));
    if (r <= 0) { e1[k1 === 'a' ? 'b' : 'a'] = X; e2[k2 === 'a' ? 'b' : 'a'] = X; C.touch(e1); C.touch(e2); return; }
    const th = Math.acos(Math.max(-1, Math.min(1, M.dot(u1, u2)))) / 2; if (th < 1e-6) return;
    const t = r / Math.tan(th); if (t > M.dist2(e1[k1], X) || t > M.dist2(e2[k2], X)) { C.warn('Yarıçap çizgiler için çok büyük'); return; }
    const T1 = M.add(X, M.mul(u1, t)), T2 = M.add(X, M.mul(u2, t)), bis = M.norm(M.add(u1, u2)), cen = M.add(X, M.mul(bis, r / Math.sin(th)));
    e1[k1 === 'a' ? 'b' : 'a'] = T1; e2[k2 === 'a' ? 'b' : 'a'] = T2; C.touch(e1); C.touch(e2);
    let a0 = M.ang(cen, T1), a1 = M.ang(cen, T2); if (M.normAng(a1 - a0) > Math.PI) [a0, a1] = [a1, a0];
    C.add(C.newEnt('arc', { c: cen, r, a0: M.deg(a0), a1: M.deg(a1), layer: e1.layer }));
  });
  /* ================= KONİK (TAPER) ================= */
  C.taperSolid = (ent, ang, fromTop) => {
    const e = asKati(ent); if (e.type !== 'kati') throw new Error('Konikleştirme katı, kutu ve silindirde çalışır');
    if ((e.holes || []).length) throw new Error('Delikli katı konikleştirilemiyor');
    const pr = ccwProf(e), h = e.h || 0, d = h * Math.tan(ang * RAD), top = C.offsetPoly(pr, d); if (!offsetOk(pr, top, d)) throw new Error('Açı bu katı için çok büyük (yüzler sivri uçta birleşiyor); daha küçük açı deneyin');
    ringsToPoly(e, fromTop === false ? [{ pts: top, w: 0 }, { pts: pr, w: h }] : [{ pts: pr, w: 0 }, { pts: top, w: h }]); C.touch(e); return e;
  };
  C.taperFace = (ent, f, ang) => {
    let e = ent, owner = null; if (e.type === 'grup3') { owner = e; const r = C.partAt(e, centroid(f.pts), f.n); if (!r) throw new Error('Parça bulunamadı'); e = r.part; }
    asKati(e); let up = [0, 0, 1];
    if (e.type === 'kati') { if ((e.holes || []).length) throw new Error('Delikli katıda yüz konikleştirilemiyor'); up = e.uz; if (Math.abs(M.dot(f.n, e.uz)) > 0.9999) { const r = C.taperSolid(e, ang, M.dot(f.n, e.uz) > 0); if (owner) { delete owner._c; C.touch(owner); } return owner || r; } S.katiToPoly(e); }
    if (e.type !== 'poly3') throw new Error('Bu nesnenin yüzü konikleştirilemez');
    const fi = S.polyFaceIdx(e, f); if (fi < 0) throw new Error('Yüz bulunamadı');
    const fc = e.faces[fi], n = S.newellN(fc.map(i => e.v[i])); if (Math.abs(M.dot(n, up)) > 0.99) throw new Error('Yan yüz seçin (üst yüz seçilirse bütün katı konikleşir)');
    const hs = fc.map(i => M.dot(e.v[i], up)), h0 = Math.min(...hs), tn = Math.tan(ang * RAD);
    fc.forEach((vi, k) => { const dz = hs[k] - h0; if (dz > 1e-9) e.v[vi] = M.sub(e.v[vi], M.mul(n, dz * tn)); });
    C.touch(e); if (owner) { delete owner._c; C.touch(owner); } return owner || e;
  };
  C.addCommand(['TAPER', 'KONIK', 'KONIKLESTIR', 'EGIMVER'], 'Konikleştir (taper): seçili katının yan yüzlerini düşeyden verilen açıyla içe eğer (kesik piramit / koni, şevli duvar). Önce bir yan yüz seçiliyse yalnız o yüz eğilir; üst yüz seçiliyse bütün katı. Eksi açı = dışa açılır.', async (I) => {
    if (C.selFace && C.byId(C.selFace.e.id)) { const sf = C.selFace; C.selFace = null; C.emit('selection'); const a = await I.num('Eğim açısı (° düşeyden, eksi = dışa)', 45); const r = C.taperFace(sf.e, sf, a); C.lastEnt = r; C.log(`Yüz ${a}° eğildi → ${C.describe(r)}`); return; }
    const s = (await I.sel('Konikleştirilecek katıları seçin (ya da önce tek bir yüz seçin)')).filter(e => ['kati', 'box', 'cyl'].includes(e.type)); if (!s.length) { C.warn('Katı, kutu ya da silindir seçin'); return; }
    const a = await I.num('Eğim açısı (° düşeyden, eksi = dışa)', 45);
    for (const e of s) { try { C.taperSolid(e, a); C.log(`${a}° konikleştirildi → ${C.describe(e)}`); } catch (er) { C.warn(er.message); } }
  });

  /* ================= SÜPÜR (yol boyunca uzatma) ================= */
  const sweepRings = e => {
    const path = e.path.map(M.p3).filter((p, i, a) => !i || M.dist(p, a[i - 1]) > 1e-9), n = path.length; if (n < 2) return null;
    const closed = !!e.closed && n > 2 && M.dist(path[0], path[n - 1]) > 1e-9 ? true : false;
    const seg = []; for (let i = 0; i + 1 < n; i++) seg.push(M.norm(M.sub(path[i + 1], path[i]))); if (closed) seg.push(M.norm(M.sub(path[0], path[n - 1])));
    const t0 = seg[0]; let up = [0, 0, 1]; if (Math.abs(M.dot(up, t0)) > 0.999) up = [0, 1, 0];
    let B = M.norm(M.sub(up, M.mul(t0, M.dot(up, t0)))), N = M.cross(t0, B); // N: profilin u (sağ), B: v (yukarı)
    const prof = Array.isArray(e.prof) ? e.prof : (() => { const o = []; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; o.push([Math.cos(a) * e.prof.r, Math.sin(a) * e.prof.r]); } return o; })();
    const ringAt = (o, Nn, Bn) => prof.map(([u, v]) => M.add(M.add(o, M.mul(Nn, u)), M.mul(Bn, v)));
    const rot = (v, a, b) => { const ax = M.cross(a, b), s = M.len(ax), c = M.dot(a, b); if (s < 1e-12) return v; const k = M.mul(ax, 1 / s); return M.add(M.add(M.mul(v, c), M.mul(M.cross(k, v), s)), M.mul(k, M.dot(k, v) * (1 - c))); };
    const rings = [], cen = [];
    const proj = (ring, dir, o, m) => ring.map(p => M.add(p, M.mul(dir, M.dot(M.sub(o, p), m) / (M.dot(dir, m) || 1e-12))));
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = path[i], b = path[(i + 1) % n], t = seg[i];
      if (i === 0) { if (closed) { const tp = seg[segs - 1], m = M.norm(M.add(tp, t)); rings.push(proj(ringAt(a, N, B), t, a, m)); } else rings.push(ringAt(a, N, B)); cen.push(a); }
      const isLast = i === segs - 1;
      if (!isLast || closed) { const tn = seg[(i + 1) % segs], m = M.norm(M.add(t, tn)); rings.push(proj(ringAt(a, N, B).map(p => M.add(p, M.sub(b, a))), t, b, m)); cen.push(b); N = rot(N, t, tn); B = rot(B, t, tn); }
      else { rings.push(ringAt(b, N, B)); cen.push(b); }
    }
    return { rings, cen, closed, circ: !Array.isArray(e.prof), prof };
  };
  const sweepMesh = e => {
    const R = sweepRings(e); if (!R) return null; const { rings, cen, closed, circ, prof } = R, m = prof.length, v = [], vn = [], f = [], ed = [];
    const add = (p, nr) => { v.push(p); vn.push(nr); return v.length - 1; };
    const tri = (i0, i1, i2, want) => { const g = M.cross(M.sub(v[i1], v[i0]), M.sub(v[i2], v[i0])); f.push(M.dot(g, want) < 0 ? [i0, i2, i1] : [i0, i1, i2]); };
    const nk = rings.length - (closed ? 0 : 1);
    for (let k = 0; k < nk; k++) { const A = rings[k], Bk = rings[(k + 1) % rings.length], ca = cen[k], cb = cen[(k + 1) % cen.length];
      for (let i = 0; i < m; i++) { const j = (i + 1) % m; let na, nb, nc, nd;
        if (circ) { na = M.norm(M.sub(A[i], ca)); nb = M.norm(M.sub(A[j], ca)); nc = M.norm(M.sub(Bk[j], cb)); nd = M.norm(M.sub(Bk[i], cb)); }
        else { const nn = M.norm(M.cross(M.sub(A[j], A[i]), M.sub(Bk[i], A[i]))), out = M.sub(M.lerp(A[i], A[j], 0.5), ca); const s2 = M.dot(nn, out) < 0 ? -1 : 1; na = nb = nc = nd = M.mul(nn, s2); }
        const i0 = add(A[i], na), i1 = add(A[j], nb), i2 = add(Bk[j], nc), i3 = add(Bk[i], nd), want = M.add(M.add(na, nb), M.add(nc, nd)); tri(i0, i1, i2, want); tri(i0, i2, i3, want); } }
    if (!closed) { const pr = M.polyArea(prof) >= 0 ? null : true, tris = C.earClip(pr ? prof.slice().reverse() : prof), map = i => pr ? m - 1 - i : i;
      for (const [ring, c, nrm] of [[rings[0], cen[0], M.norm(M.sub(cen[0], cen[1]))], [rings[rings.length - 1], cen[cen.length - 1], M.norm(M.sub(cen[cen.length - 1], cen[cen.length - 2]))]]) { const b0 = v.length; ring.forEach(p => add(p, nrm)); for (const t of tris) tri(b0 + map(t[0]), b0 + map(t[1]), b0 + map(t[2]), nrm); void c; } }
    const ring = r => { for (let i = 0; i < m; i++) ed.push([r[i], r[(i + 1) % m]]); };
    if (!closed) { ring(rings[0]); ring(rings[rings.length - 1]); }
    const lines = circ ? [0, 12, 24, 36] : [...Array(m).keys()];
    for (const i of lines) for (let k = 0; k + 1 < rings.length + (closed ? 1 : 0); k++) ed.push([rings[k][i], rings[(k + 1) % rings.length][i]]);
    return { t: 'tri', v, vn, f, edges3: ed };
  };
  T.sweep = {
    label: 'Yol boyunca katı',
    mesh: e => { const m = sweepMesh(e); return m ? [m] : []; },
    prims: e => { const R = sweepRings(e); if (!R) return []; const out = [P(e.path.map(M.p3), !!e.closed, { lt: 'CENTER' })]; if (!R.closed) out.push(P(R.rings[0], true), P(R.rings[R.rings.length - 1], true)); const lines = R.circ ? [0, 12, 24, 36] : [...Array(R.prof.length).keys()]; for (const i of lines) out.push(P(R.rings.map(r => r[i]).concat(R.closed ? [R.rings[0][i]] : []), false)); return out; },
    snaps: e => { const R = sweepRings(e); if (!R) return []; const o = [{ p: M.p3(e.path[0]), k: 'end' }, { p: M.p3(e.path[e.path.length - 1]), k: 'end' }]; for (const r of [R.rings[0], R.rings[R.rings.length - 1]]) if (!R.circ) r.forEach(p => o.push({ p, k: 'end' })); return o; },
    xf: (e, X) => { const s = X.s || 1; e.path = e.path.map(X.p); if (Array.isArray(e.prof)) e.prof = e.prof.map(([u, v]) => [u * s, v * s]); else e.prof = { r: e.prof.r * s }; if (X.mir && Array.isArray(e.prof)) e.prof = e.prof.map(([u, v]) => [-u, v]); },
    info: e => { let l = 0; for (let i = 1; i < e.path.length; i++) l += M.dist(e.path[i - 1], e.path[i]); if (e.closed) l += M.dist(e.path[0], e.path[e.path.length - 1]); const A = Array.isArray(e.prof) ? Math.abs(M.polyArea(e.prof)) : Math.PI * e.prof.r ** 2; return `profil alanı=${M.fmt(A, 4)} m² · yol=${M.fmt(l, 3)} m · hacim≈${M.fmt(A * l, 3)} m³`; },
  };
  const pathPts = e => {
    if (e.type === 'line') return { pts: [M.p3(e.a), M.p3(e.b)], closed: false };
    if (e.type === 'arc') { const a0 = e.a0 * RAD, sw = M.normAng((e.a1 - e.a0) * RAD) || Math.PI * 2, k = Math.max(8, Math.ceil(sw / (Math.PI / 32))), pts = []; for (let i = 0; i <= k; i++) { const a = a0 + sw * i / k; pts.push([e.c[0] + Math.cos(a) * e.r, e.c[1] + Math.sin(a) * e.r, e.c[2] || 0]); } return { pts, closed: false }; }
    if (e.type === 'circle') { const pts = []; for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; pts.push([e.c[0] + Math.cos(a) * e.r, e.c[1] + Math.sin(a) * e.r, e.c[2] || 0]); } return { pts, closed: true }; }
    if (e.type === 'pipe' && C.pipePath) return { pts: C.pipePath(e).pts.map(M.p3), closed: false };
    const pr = C.prims(e).find(q => q.k === 'P'); if (pr) return { pts: pr.pts.map(M.p3), closed: !!pr.c };
    return null;
  };
  C.addCommand(['SWEEP', 'SUPUR', 'YOLBOYUNCA', 'EXTRUDEPATH'], 'Kapalı bir 2B profili (çoklu çizgi, dikdörtgen, daire) bir yol (çizgi, çoklu çizgi, 3B çoklu çizgi, yay, daire, boru) boyunca uzatarak katı yapar — kanal, kiriş, bordür, korkuluk, boru vb. Profil planda çizilir; X sağa, Y yukarı olarak yolun başına dik yerleşir.', async (I) => {
    const s1 = await I.sel('Profili seçin (kapalı çoklu çizgi / dikdörtgen / daire)', { pre: false }); const pe = s1.find(e => (e.type === 'pline' && e.closed) || e.type === 'circle'); if (!pe) { C.warn('Kapalı profil seçilmedi'); return; }
    const s2 = await I.sel('Yolu seçin (çizgi / çoklu çizgi / yay / daire / boru)', { pre: false }); const qe = s2.find(e => e !== pe && ['line', 'pline', 'arc', 'circle', 'pipe'].includes(e.type)); if (!qe) { C.warn('Yol seçilmedi'); return; }
    let prof, base;
    if (pe.type === 'circle') { base = M.p3(pe.c); prof = { r: pe.r }; }
    else { const pts = C.prims(pe)[0].pts.map(M.p3); const c = C.polyCentroid2 ? C.polyCentroid2(pts) : null; base = c ? [c[0], c[1], 0] : centroid(pts); prof = pts.map(p => [p[0] - base[0], p[1] - base[1]]); }
    const bk = await I.kw('Profilin yola oturacak noktası', [['M', 'Merkez'], ['B', 'Nokta seç'], ['A', 'Alt orta']], 'M');
    if (bk === 'B') { const q = await I.pt('Profil üzerindeki taban noktası'); if (q && typeof q !== 'string') { const dx = q[0] - base[0], dy = q[1] - base[1]; if (Array.isArray(prof)) prof = prof.map(([u, v]) => [u - dx, v - dy]); else C.warn('Dairesel profilde merkez kullanılır'); } }
    else if (bk === 'A' && Array.isArray(prof)) { const ymin = Math.min(...prof.map(p => p[1])); prof = prof.map(([u, v]) => [u, v - ymin]); }
    const pp = pathPts(qe); if (!pp || pp.pts.length < 2) { C.warn('Yol okunamadı'); return; }
    const del = await I.kw('Profil silinsin mi?', [['E', 'Evet'], ['H', 'Hayır']], 'E');
    const k = C.add(C.newEnt('sweep', { prof, path: pp.pts, closed: pp.closed, layer: pe.layer, color: pe.color }));
    if (del === 'E') C.remove([pe]); C.lastEnt = k; C.log('Yol boyunca katı oluşturuldu → ' + C.describe(k));
  });
})(window.C);

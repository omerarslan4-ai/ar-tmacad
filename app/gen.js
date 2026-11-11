/* ArıtmaCAD — arıtma / pompa istasyonu nesne komutları, hesaplar ve üreteçler */
(function (C) {
  'use strict';
  const M = C.M, RAD = Math.PI / 180, { L, P } = C.prim, E = C.cmd;

  /* standart katmanlar */
  C.STD_LAYERS = {
    BETON: [8, 'CONTINUOUS', 50], DUVAR: [8, 'CONTINUOUS', 50], BORU: [4, 'CONTINUOUS', 35], POMPA: [1, 'CONTINUOUS', 35],
    VANA: [6, 'CONTINUOUS', 35], EKSEN: [1, 'CENTER', 13], OLCU: [3, 'CONTINUOUS', 18], YAZI: [7, 'CONTINUOUS', 18],
    KOT: [2, 'CONTINUOUS', 18], SU: [5, 'DASHED', 18], PAFTA: [7, 'CONTINUOUS', 50], KESIT: [7, 'CONTINUOUS', 50],
    ZEMIN: [32, 'CONTINUOUS', 35], GORUNEN: [9, 'CONTINUOUS', 18], GIZLI: [9, 'HIDDEN', 18], HARITA: [30, 'CONTINUOUS', 25],
  };
  C.std = name => { const d = C.STD_LAYERS[name] || [7, 'CONTINUOUS', 25]; C.ensureLayer(name, d[0], d[1], d[2]); return name; };
  const onLayer = (name) => (C.doc.cur.layer === '0' ? C.std(name) : C.doc.cur.layer);
  const ne = (type, props) => C.add(C.newEnt(type, props));

  C.DN = [50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1200];
  C.pickDN = (qls, v = 1.5) => { const d = Math.sqrt(4 * qls / 1000 / (Math.PI * v)) * 1000; return C.DN.find(x => x >= d) || C.DN[C.DN.length - 1]; };
  C.vel = (qls, dn) => (qls / 1000) / (Math.PI * (dn / 1000) ** 2 / 4);
  C.hazen = (qls, dn, Lm, Cc = 140) => 10.67 * Lm * Math.pow(qls / 1000, 1.852) / (Math.pow(Cc, 1.852) * Math.pow(dn / 1000, 4.87));

  /* anahtar=değer jetonlarını kuyruktan topla */
  const takeKV = () => { const kv = {}; E.queue = E.queue.filter(t => { const m = t.match(/^([A-Za-zÇĞİÖŞÜçğıöşü_]+)=(.*)$/); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; }); return kv; };
  const kvNum = (kv, k, def) => kv[k] != null && !isNaN(C.num(kv[k])) ? C.num(kv[k]) : def;

  /* ---- DUVAR ---- */
  C.addCommand(['WALL', 'DUVAR'], 'Duvar (3B). DUVAR [K=0.3 Y=3 Z=0] nokta nokta ...', async (I) => {
    const kv = takeKV(); const s = E.wall || (E.wall = { t: 0.3, h: 3, z: 0 });
    if (kv.K) s.t = kvNum(kv, 'K', s.t); if (kv.Y) s.h = kvNum(kv, 'Y', s.h); if (kv.Z) s.z = kvNum(kv, 'Z', s.z);
    let a = await I.pt(`İlk nokta (kalınlık=${s.t} yükseklik=${s.h} taban=${s.z})`, { kw: [['A', 'Ayarlar']] }); if (a == null) return;
    if (a === 'A') { s.t = await I.num('Kalınlık', s.t); s.h = await I.num('Yükseklik', s.h); s.z = await I.num('Taban kotu', s.z); a = await I.pt('İlk nokta'); if (!a) return; }
    for (; ;) {
      E.base = a; E.preview = c => C.prims({ type: 'wall', a, b: c, t: s.t, h: s.h, z: s.z });
      const b = await I.pt('Sonraki nokta'); if (!b || typeof b === 'string') return;
      ne('wall', { a, b, t: s.t, h: s.h, z: s.z, layer: onLayer('BETON') }); a = b;
    }
  });
  C.addCommand(['SLAB', 'DOSEME', 'PLAK'], 'Döşeme/plak. DOSEME [K=0.3 Z=0] köşe noktaları...', async (I) => {
    const kv = takeKV(); const t = kvNum(kv, 'K', 0.3), z = kvNum(kv, 'Z', 0);
    const p0 = await I.pt('İlk köşe'); if (!p0 || typeof p0 === 'string') return; const pts = [p0];
    for (; ;) { E.base = pts[pts.length - 1]; E.temp = [pts]; E.preview = c => [P([...pts, c], true)]; const p = await I.pt('Sonraki köşe'); if (!p || typeof p === 'string') break; pts.push(p); }
    if (pts.length >= 3) ne('slab', { pts, t, z, layer: onLayer('BETON') });
  });
  C.addCommand(['BOX', 'KUTU'], 'Kutu. KUTU köşe en boy yükseklik [taban kotu]', async (I) => {
    const o = await I.pt('Köşe'); if (!o || typeof o === 'string') return;
    E.base = o; E.rubber = false; E.preview = c => [P([o, [c[0], o[1]], c, [o[0], c[1]]], true)];
    const b = await I.pt('Karşı köşe ya da @en,boy'); if (!b || typeof b === 'string') return;
    const h = await I.num('Yükseklik', 1);
    const x0 = Math.min(o[0], b[0]), y0 = Math.min(o[1], b[1]);
    ne('box', { o: [x0, y0, o[2] || 0], sx: Math.abs(b[0] - o[0]), sy: Math.abs(b[1] - o[1]), sz: h, rot: 0 });
  });
  C.addCommand(['CYLINDER', 'CYL', 'SILINDIR'], 'Silindir. SILINDIR merkez yarıçap yükseklik', async (I) => {
    const c = await I.pt('Merkez'); if (!c || typeof c === 'string') return;
    E.preview = q => [C.prim.CI(c, M.dist2(c, q))];
    const r = await I.dist('Yarıçap', c); const h = await I.num('Yükseklik', 1);
    if (r > 0) ne('cyl', { c, r, h });
  });
  /* ---- HAVUZ ---- */
  C.addCommand(['TANK', 'HAVUZ', 'HAZNE'], 'Dikdörtgen havuz/hazne. HAVUZ köşe iç-en iç-boy derinlik [duvar] [üst kot] [ad]', async (I) => {
    const kv = takeKV();
    const o = await I.pt('İç alt-sol köşe'); if (!o || typeof o === 'string') return;
    E.base = o; E.rubber = false; E.preview = c => [P([o, [c[0], o[1]], c, [o[0], c[1]]], true)];
    const b = await I.pt('Karşı iç köşe (veya @en,boy)'); if (!b || typeof b === 'string') return;
    E.preview = null;
    const H = kvNum(kv, 'H', await I.num('İç derinlik (m)', 4));
    const tw = kvNum(kv, 'TW', await I.num('Duvar kalınlığı', 0.3));
    const zt = kvNum(kv, 'ZT', await I.num('Üst (duvar başı) kotu', 0.3));
    const label = kv.AD || await I.str('Ad', 'HAVUZ');
    ne('tank', { o: [Math.min(o[0], b[0]), Math.min(o[1], b[1]), 0], L: Math.abs(b[0] - o[0]), W: Math.abs(b[1] - o[1]), H, tw, tb: Math.max(0.3, tw + 0.1), zt, rot: 0, label, layer: onLayer('BETON') });
  });
  C.addCommand(['CTANK', 'DHAVUZ', 'DAIRESELHAVUZ', 'COKTURME'], 'Dairesel havuz (çöktürme vb.). DHAVUZ merkez iç-çap derinlik [duvar] [üst kot]', async (I) => {
    const c = await I.pt('Merkez'); if (!c || typeof c === 'string') return;
    E.preview = q => [C.prim.CI(c, M.dist2(c, q))];
    const D = (await I.dist('İç yarıçap (veya nokta)', c)) * 2;
    const H = await I.num('İç derinlik', 4), tw = await I.num('Duvar kalınlığı', 0.35), zt = await I.num('Üst kot', 0.5);
    const label = await I.str('Ad', 'ÇÖKTÜRME HAVUZU');
    ne('ctank', { c, D, H, tw, tb: 0.4, zt, label, layer: onLayer('BETON') });
  });
  /* ---- BORU ---- */
  C.addCommand(['PIPE', 'BORU'], 'Boru (3B). BORU DN=200 Z=-1.5 MAL=HDPE nokta nokta ... (Z seçeneği ile düşey parça)', async (I) => {
    const kv = takeKV(); const s = E.pipe || (E.pipe = { dn: 200, z: 0, mat: 'DUKTIL' });
    if (kv.DN) s.dn = kvNum(kv, 'DN', s.dn); if (kv.Z) s.z = kvNum(kv, 'Z', s.z); if (kv.MAL) s.mat = kv.MAL;
    let a = await I.pt(`Başlangıç (DN${s.dn} eksen kotu=${s.z})`, { kw: [['A', 'Ayarlar']] }); if (a == null) return;
    if (a === 'A') { s.dn = await I.num('DN (mm)', s.dn); s.z = await I.num('Eksen kotu', s.z); s.mat = await I.str('Malzeme', s.mat); a = await I.pt('Başlangıç'); if (!a || typeof a === 'string') return; }
    const pts = [[a[0], a[1], a[2] || s.z]];
    for (; ;) {
      const last = pts[pts.length - 1]; E.base = last; E.temp = [pts]; E.preview = c => C.prims({ type: 'pipe', dn: s.dn, pts: [...pts, [c[0], c[1], last[2]]] });
      const p = await I.pt('Sonraki nokta', { kw: [['Z', 'Kot'], ['U', 'Geri']] }); if (p == null) break;
      if (p === 'U') { if (pts.length > 1) pts.pop(); continue; }
      if (p === 'Z') { const z = await I.num('Yeni eksen kotu (düşey parça)', last[2]); pts.push([last[0], last[1], z]); continue; }
      pts.push([p[0], p[1], (p[2] && Math.abs(p[2]) > 1e-9) ? p[2] : last[2]]);
    }
    if (pts.length >= 2) ne('pipe', { pts, dn: s.dn, mat: s.mat, label: `DN${s.dn} ${s.mat}`, layer: onLayer('BORU') });
  });
  C.addCommand(['PUMP', 'POMPA'], 'Pompa. POMPA nokta [TIP=dalgic|kuru] [D=0.6] [Z=taban kotu] [AD=P1] [Q=l/s] [H=m]', async (I) => {
    const kv = takeKV();
    const p = await I.pt('Pompa merkezi'); if (!p || typeof p === 'string') return;
    const n = C.doc.ents.filter(e => e.type === 'pump').length + 1;
    const z = kvNum(kv, 'Z', p[2] || (E.scriptMode ? 0 : await I.num('Taban kotu', 0)));
    ne('pump', { p: [p[0], p[1], z], d: kvNum(kv, 'D', 0.6), h: kvNum(kv, 'YUK', 1.2), kind: kv.TIP || 'dalgic', tag: kv.AD || 'P' + n, q: kv.Q ? kvNum(kv, 'Q') : null, hm: kv.H ? kvNum(kv, 'H') : null, rot: 0, layer: onLayer('POMPA') });
  });
  C.addCommand(['VALVE', 'VANA'], 'Vana. VANA nokta açı [DN=150] [TIP=surgulu|cekvalf|kelebek] [Z=kot]', async (I) => {
    const kv = takeKV();
    const p = await I.pt('Vana merkezi'); if (!p || typeof p === 'string') return;
    const rot = await I.angle('Boru yönü (açı veya nokta)', p, 0);
    const dn = kvNum(kv, 'DN', E.scriptMode ? 150 : await I.num('DN', 150));
    const kind = (kv.TIP || (E.scriptMode ? 'surgulu' : await I.kw('Tip', [['surgulu', 'Sürgülü', 'S'], ['cekvalf', 'Çekvalf', 'C'], ['kelebek', 'Kelebek', 'K']], 'surgulu'))).toLowerCase();
    ne('valve', { p: [p[0], p[1], kvNum(kv, 'Z', p[2] || 0)], rot, dn, kind: kind.startsWith('c') ? 'cekvalf' : kind.startsWith('k') ? 'kelebek' : 'surgulu', layer: onLayer('VANA') });
  });

  /* ---- hesaplar ---- */
  C.addCommand(['HAZNEHESAP', 'ISLAKHAZNE'], 'Islak hazne faydalı hacmi: V = 0.9·Q / z  (Q l/s bir pompanın debisi, z saatlik kalkış)', async (I) => {
    const q = await I.num('Bir pompanın debisi Q (l/s)', 50), z = await I.num('Saatte en fazla kalkış sayısı z', 10);
    const V = 0.9 * q / z; C.log(`Gerekli faydalı hacim V = 0.9×${q}/${z} = ${M.fmt(V, 2)} m³  (çevrim süresi ${M.fmt(60 / z, 1)} dk)`);
    C.log(`Örnek: 1.0 m çalışma yüksekliği için taban alanı ≥ ${M.fmt(V, 2)} m²`);
  }, { noUndo: true });
  C.addCommand(['BORUHESAP', 'HIDROLIK'], 'Boru hızı ve Hazen-Williams kaybı. BORUHESAP Q(l/s) DN L(m) [C=140]', async (I) => {
    const q = await I.num('Debi Q (l/s)', 50), dn = await I.num('DN (mm)', C.pickDN(q)), Lm = await I.num('Boru boyu (m)', 100), cc = await I.num('Hazen-Williams C', 140);
    const v = C.vel(q, dn), hf = C.hazen(q, dn, Lm, cc);
    C.log(`v = ${M.fmt(v, 2)} m/s ${v < 0.6 ? '(düşük: çökelme riski)' : v > 2.5 ? '(yüksek)' : '(uygun)'}  |  hf = ${M.fmt(hf, 2)} m (${M.fmt(hf / Lm * 1000, 1)} m/km)  |  önerilen DN (v≈1.5) = ${C.pickDN(q)}`);
  }, { noUndo: true });

  /* ---- PAFTA ---- */
  C.addCommand(['SHEET', 'PAFTA', 'MODELPAFTA'], 'Pafta (antetli çerçeve). PAFTA A1 Y 100 köşe "Proje" "Başlık"', async (I) => {
    const size = await I.kw('Kağıt', [['A0'], ['A1'], ['A2'], ['A3'], ['A4']], 'A1');
    const orient = await I.kw('Yön', [['Y', 'Yatay', 'L'], ['D', 'Dikey', 'P']], 'Y');
    const scale = await I.num('Ölçek 1:', C.doc.set.anno);
    const tmp = { type: 'sheet', size, orient: orient === 'D' ? 'P' : 'L', scale, o: [0, 0, 0], f: {}, layer: 'PAFTA' };
    E.preview = c => { tmp.o = c; return C.T.sheet.prims(tmp).filter(p => p.k !== 'T'); };
    const o = await I.pt('Pafta sol-alt köşesi'); if (!o || typeof o === 'string') return; E.preview = null;
    const proje = await I.str('Proje adı', 'ATIKSU POMPA İSTASYONU');
    const baslik = await I.str('Pafta başlığı', 'PLAN VE KESİTLER');
    ne('sheet', { size, orient: tmp.orient, scale, o, f: { proje, baslik, cizen: C.userName || '', no: String(C.doc.ents.filter(e => e.type === 'sheet').length + 1).padStart(2, '0') }, layer: C.std('PAFTA') });
  });

  /* ======== OTOMATİK ÖLÇÜLENDİRME (QDIM) ======== */
  C.autoDim = function (sel, mode) {
    const segs = [], circs = [], arcs = [], ellDims = [], seen = new Set();
    const addArcB = (a, b, bu) => { const th = 4 * Math.atan(bu), d = M.dist2(a, b); if (d < 1e-9) return; const r = d / (2 * Math.sin(Math.abs(th) / 2)), m = M.lerp(a, b, 0.5), ang = M.ang(a, b), h = Math.sqrt(Math.max(0, r * r - d * d / 4)) * (Math.abs(th) > Math.PI ? -1 : 1), cd = ang + (bu > 0 ? Math.PI / 2 : -Math.PI / 2), c = [m[0] + Math.cos(cd) * h, m[1] + Math.sin(cd) * h, 0]; const a0 = Math.atan2(a[1] - c[1], a[0] - c[0]); arcs.push({ c, r, mid: a0 + th / 2 }); };
    const key = (a, b) => { const r = v => Math.round(v * 1000); const k1 = `${r(a[0])},${r(a[1])}`, k2 = `${r(b[0])},${r(b[1])}`; return k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1; };
    let own = null; const addSeg = (a, b) => { if (M.dist2(a, b) < C.annoH(4)) return; const k = key(a, b); if (seen.has(k)) return; seen.add(k); const sg = [M.p3(a), M.p3(b)]; sg.own = own; segs.push(sg); };
    for (const e of sel) {
      { const b0 = C.bbox(e); own = (e.type === 'pline' && e.closed) || e.type === 'tank' || e.type === 'box' || e.type === 'wall' ? [(b0[0] + b0[2]) / 2, (b0[1] + b0[3]) / 2, 0] : null; }
      if (e.type === 'line') addSeg(e.a, e.b);
      else if (e.type === 'pline') { const v = e.pts, n = v.length; for (let i = 1; i < n + (e.closed ? 1 : 0); i++) { const bu = e.bul && e.bul[i - 1]; if (!bu) addSeg(v[i - 1], v[i % n]); else addArcB(v[i - 1], v[i % n], bu); } }
      else if (e.type === 'arc') { const a0 = e.a0 * Math.PI / 180, a1 = e.a1 * Math.PI / 180, sw = M.normAng(a1 - a0) || Math.PI * 2; arcs.push({ c: M.p3(e.c), r: e.r, mid: a0 + sw / 2 }); }
      else if (e.type === 'ellipse') { /* elips: büyük ve küçük eksen ölçüsü */ const a = Math.hypot(...e.mj), u = [e.mj[0] / a, e.mj[1] / a], b = a * e.ra, c = M.p3(e.c); ellDims.push([[c[0] - u[0] * a, c[1] - u[1] * a, 0], [c[0] + u[0] * a, c[1] + u[1] * a, 0], u, a, b, c]); }
      else if (e.type === 'wall') { const o = C.T.wall.outline(e); addSeg(o[0], o[1]); addSeg(o[1], o[2]); }
      else if (e.type === 'tank' || e.type === 'box') { const f = C.frame(e.o, e.rot), L = e.L || e.sx, W = e.W || e.sy; addSeg(f.at(0, 0), f.at(L, 0)); addSeg(f.at(0, 0), f.at(0, W)); }
      else if (e.type === 'circle' || e.type === 'ctank' || e.type === 'cyl') circs.push(e);
    }
    const all = [...segs.flat(), ...circs.map(e => e.c), ...arcs.map(a => a.c), ...ellDims.map(q => q[5])];
    if (!all.length) return 0;
    const bb = [Math.min(...all.map(p => p[0])), Math.min(...all.map(p => p[1])), Math.max(...all.map(p => p[0])), Math.max(...all.map(p => p[1]))];
    const cen = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2, 0], off = C.annoH(7), lay = C.std('OLCU');
    let n = 0;
    const mk = props => { C.add(C.newEnt('dim', Object.assign({ layer: lay }, props))); n++; };
    if (mode === 'Z') {
      const tol = C.annoH(2);
      const uniq = arr => { arr.sort((a, b) => a - b); const o = []; for (const v of arr) if (!o.length || v - o[o.length - 1] > tol) o.push(v); return o; };
      const xs = uniq(segs.flat().map(p => p[0])), ys = uniq(segs.flat().map(p => p[1]));
      const yb = bb[1] - C.annoH(10), xl = bb[0] - C.annoH(10);
      for (let i = 1; i < xs.length; i++) mk({ k: 'h', a: [xs[i - 1], bb[1], 0], b: [xs[i], bb[1], 0], p: [xs[i - 1], yb, 0] });
      if (xs.length > 2) mk({ k: 'h', a: [xs[0], bb[1], 0], b: [xs[xs.length - 1], bb[1], 0], p: [xs[0], yb - C.annoH(8), 0] });
      for (let i = 1; i < ys.length; i++) mk({ k: 'v', a: [bb[0], ys[i - 1], 0], b: [bb[0], ys[i], 0], p: [xl, ys[i - 1], 0] });
      if (ys.length > 2) mk({ k: 'v', a: [bb[0], ys[0], 0], b: [bb[0], ys[ys.length - 1], 0], p: [xl - C.annoH(8), ys[0], 0] });
    } else {
      for (const sg of segs) {
        const [a, b] = sg, m = M.lerp(a, b, 0.5), d = M.norm(M.sub(b, a)), nn = [-d[1], d[0], 0];
        let side = Math.sign(M.dot(M.sub(m, sg.own || cen), nn)) || 1;
        const k = Math.abs(d[1]) < 1e-9 ? 'h' : Math.abs(d[0]) < 1e-9 ? 'v' : 'al';
        mk({ k, a, b, p: M.add(m, M.mul(nn, side * off)) });
      }
    }
    // daireler: çap (Ø), yaylar: yarıçap (R) — aynı merkez/yarıçaplı tekrarlar bir kez
    const rs = new Set(), cnt = {}, rk = (c, r, t) => t + Math.round(c[0] * 1000) + ',' + Math.round(c[1] * 1000) + ',' + Math.round(r * 1000);
    for (const e of circs) { const r = e.r || (e.D ? e.D / 2 + (e.tw || 0) : 0); if (r > 0 && !rs.has(rk(e.c, r, 'd'))) { rs.add(rk(e.c, r, 'd')); const ck = 'c' + Math.round(e.c[0] * 1000) + ',' + Math.round(e.c[1] * 1000), nth = (cnt[ck] = (cnt[ck] || 0) + 1) - 1; mk({ k: 'd', c: M.p3(e.c), r, ang: 45 + nth * 40 }); } }
    for (const a of arcs) { if (a.r < C.annoH(1) || rs.has(rk(a.c, a.r, 'r'))) continue; rs.add(rk(a.c, a.r, 'r')); mk({ k: 'r', c: a.c, r: a.r, ang: a.mid * 180 / Math.PI }); }
    for (const [p0, p1, u, a, b, c] of ellDims) { const nn = [-u[1], u[0], 0]; mk({ k: 'al', a: p0, b: p1, p: M.add(c, M.mul(nn, b + off)) }); mk({ k: 'al', a: M.add(c, M.mul(nn, -b)), b: M.add(c, M.mul(nn, b)), p: M.add(c, M.mul(u, a + off)) }); }
    return n;
  };
  C.addCommand(['QDIM', 'OTOOLCU', 'HIZLIOLCU', 'OTOMATIKOLCU'], 'Seçilen alandaki çizgileri otomatik ölçülendirir. QDIM seçim [H=her çizgi / Z=zincir (yatay+düşey)]', async (I) => {
    const s = await I.sel('Ölçülendirilecek alanı pencereyle seçin'); if (!s.length) return;
    const mode = await I.kw('Ölçü tipi', [['H', 'Her çizgi'], ['Z', 'Zincir (yatay+düşey)']], 'H');
    const n = C.autoDim(s, mode);
    C.log(n ? `${n} ölçü eklendi (ölçek 1/${C.doc.set.anno}; boyutlar ölçeğe göre ayarlıdır).` : 'Ölçülecek çizgi bulunamadı.');
  });

  /* ======== POMPA İSTASYONU ÜRETECİ ======== */
  C.pumpStation = function (o, prm) {
    const p = Object.assign({ Q: 50, N: 2, Z: 10, ZG: 0, ZIN: -3, DIN: 300, HEFF: 1.0, TW: 0.3, HM: 15, AD: 'POMPA İSTASYONU', PAFTA: true, DMAT: 'DUKTIL' }, prm);
    const out = []; const put = (type, props) => { const e = C.add(C.newEnt(type, props)); out.push(e); return e; };
    ['BETON', 'BORU', 'POMPA', 'VANA', 'EKSEN', 'OLCU', 'YAZI', 'KOT', 'SU', 'KESIT', 'ZEMIN', 'GORUNEN'].forEach(C.std);
    const nRun = p.NASIL ? Math.max(1, Math.min(p.N, +p.NASIL)) : Math.max(1, p.N - 1), Qp = p.Q / nRun; // NASIL: proje hesabından asil pompa sayısı
    const Vreq = p.VREQ > 0 ? +p.VREQ : 0.9 * Qp / p.Z;
    const HK = (e, k) => { if (p.HK && e) e.hk = k; return e; }; // proje hesabı kalemi (proje-hesap.js)
    const dP = Math.min(1.0, Math.max(0.45, 0.4 + Qp / 200)), hP = Math.max(0.9, dP * 1.8);
    const spacing = Math.max(1.2, dP + 0.8);
    const Lw = Math.max(2.5, Math.ceil((p.N * spacing + 0.4) * 10) / 10);
    const Ww = Math.max(2.0, Math.ceil(Vreq / (p.HEFF * Lw) * 10) / 10, Math.ceil((dP + 1.4) * 10) / 10);
    const Vact = Lw * Ww * p.HEFF;
    const zAlarm = p.ZIN - 0.05, zStart = p.ZIN - 0.20, zStop = zStart - p.HEFF, zMin = zStop - 0.30, zFloor = +(zStop - Math.max(0.6, hP * 0.6)).toFixed(2);
    const zt = p.ZG + 0.30, H = +(zt - zFloor).toFixed(2), tw = p.TW, tb = Math.max(0.4, tw + 0.1);
    const DNp = p.DNP || C.pickDN(Qp), DNh = p.DNH || C.pickDN(Qp * nRun);
    const vP = C.vel(Qp, DNp), vH = C.vel(Qp * nRun, DNh);
    const ox = o[0], oy = o[1];
    // ıslak hazne
    put('tank', { o: [ox, oy, 0], L: Lw, W: Ww, H, tw, tb, zt, rot: 0, label: 'ISLAK HAZNE', lp: [0.5, 0.13], layer: 'BETON' });
    // vana odası
    const Wv = 2.8, Hv = 1.6;
    put('tank', { o: [ox, oy + Ww + tw, 0], L: Lw, W: Wv, H: Hv, tw, tb: 0.3, zt, rot: 0, label: 'VANA ODASI', lp: [0.5, 0.91], skip: 's', layer: 'BETON' });
    // pompalar ve hatlar
    const yP = oy + Ww * 0.42, yR = oy + Ww - 0.30, zR = zt - 0.8;
    const yCv = oy + Ww + tw + 0.75, yGv = oy + Ww + tw + 1.45, yHd = oy + Ww + tw + 2.05;
    const xs = [];
    for (let i = 0; i < p.N; i++) {
      const x = ox + (i + 0.5) * Lw / p.N; xs.push(x);
      HK(put('pump', { p: [x, yP, zFloor], d: dP, h: hP, kind: 'dalgic', tag: `P${i + 1}${i >= nRun ? '-Y' : ''}`, q: +Qp.toFixed(1), hm: p.HM, rot: 90, layer: 'POMPA' }), 'pompa');
      const z0 = zFloor + hP * 0.45;
      HK(put('pipe', { pts: [[x, yP + dP / 2, z0], [x, yR, z0], [x, yR, zR], [x, yHd, zR]], dn: DNp, mat: p.DMAT, label: i === 0 ? `DN${DNp}` : '', layer: 'BORU' }), 'basma');
      { const cv = put('valve', { p: [x, yCv, zR], rot: 90, dn: DNp, kind: 'cekvalf', tag: i === 0 ? 'ÇV' : '', layer: 'VANA' }); if (p.VKC) cv.alt = p.VKC; HK(cv, 'basma'); }
      { const ik = p.VKI === 'kelebek' ? 'kelebek' : 'surgulu', iv = put('valve', { p: [x, yGv, zR], rot: 90, dn: DNp, kind: ik, tag: i === 0 ? (p.VKI === 'kelebek' ? 'KV' : p.VKI === 'bicakli' ? 'BV' : 'SV') : '', layer: 'VANA' }); if (p.VKI === 'bicakli') iv.alt = 'bicakli'; HK(iv, 'basma'); }
    }
    // kollektör ve çıkış
    HK(put('pipe', { pts: [[xs[0] - 0.3, yHd, zR], [ox + Lw + tw + 2.5, yHd, zR]], dn: DNh, mat: p.DMAT, label: '', layer: 'BORU' }), 'kollektor');
    put('text', { p: [ox + Lw + tw + 0.2, yHd + DNh / 2000 + C.annoH(1.2), 0], h: C.annoH(2.5), s: `TERFİ HATTI DN${DNh} ${p.DMAT}`, rot: 0, al: 'L', layer: 'YAZI' });
    // giriş borusu
    const zin = p.ZIN + p.DIN / 2000, yIn = oy + Ww * 0.75;
    put('pipe', { pts: [[ox - tw - 3.0, yIn, zin], [ox + 0.25, yIn, zin]], dn: p.DIN, mat: 'KORUGE', label: '', layer: 'BORU' });
    put('text', { p: [ox - tw - 3.15, yIn - C.annoH(1.2), 0], h: C.annoH(2.5), s: `GİRİŞ DN${p.DIN}`, rot: 0, al: 'R', layer: 'YAZI' });
    // kesit çizgisi A-A
    const ax0 = ox - tw - 1.2, ax1 = ox + Lw + tw + 1.2, th = C.annoH(3.5);
    put('line', { a: [ax0, yP, 0], b: [ax1, yP, 0], layer: 'EKSEN', lt: 'PHANTOM', lw: 35 });
    put('text', { p: [ax0 - th * 0.3, yP + th * 0.4, 0], h: th, s: 'A', rot: 0, al: 'R', layer: 'YAZI' });
    put('text', { p: [ax1 + th * 0.3, yP + th * 0.4, 0], h: th, s: 'A', rot: 0, al: 'L', layer: 'YAZI' });
    // ölçüler (plan)
    const dg = C.annoH(10);
    put('dim', { k: 'h', a: [ox, oy, 0], b: [ox + Lw, oy, 0], p: [ox, oy - tw - dg, 0], layer: 'OLCU' });
    put('dim', { k: 'h', a: [ox - tw, oy - tw, 0], b: [ox + Lw + tw, oy - tw, 0], p: [ox, oy - tw - dg * 2, 0], layer: 'OLCU' });
    put('dim', { k: 'v', a: [ox, oy, 0], b: [ox, oy + Ww, 0], p: [ox - tw - dg, oy, 0], layer: 'OLCU' });
    put('dim', { k: 'v', a: [ox, oy + Ww + tw, 0], b: [ox, oy + Ww + tw + Wv, 0], p: [ox - tw - dg, oy, 0], layer: 'OLCU' });
    put('dim', { k: 'v', a: [ox - tw, oy - tw, 0], b: [ox - tw, oy + Ww + 2 * tw + Wv, 0], p: [ox - tw - dg * 2, oy, 0], layer: 'OLCU' });
    for (let i = 1; i < xs.length; i++) put('dim', { k: 'h', a: [xs[i - 1], yP, 0], b: [xs[i], yP, 0], p: [xs[0], yP + dP / 2 + 0.3, 0], layer: 'OLCU' });
    const ttl = C.annoH(5);
    put('text', { p: [ox + Lw / 2, oy - tw - dg * 3.2, 0], h: ttl, s: 'PLAN', rot: 0, al: 'C', layer: 'YAZI' });

    /* ---- A-A kesiti (Y ekseni = gerçek kot) ---- */
    const X0 = ox + Lw + tw + 9, zb = zFloor - tb, Wtot = Lw + 2 * tw;
    const yz = z => z; // kesitte y = kot
    const R = (x, z, w, h, lay, lw) => put('pline', { pts: [[x, yz(z), 0], [x + w, yz(z), 0], [x + w, yz(z + h), 0], [x, yz(z + h), 0]], closed: true, layer: lay || 'KESIT', lw: lw != null ? lw : -1 });
    R(X0, zb, tw, zt - zb); R(X0 + tw + Lw, zb, tw, zt - zb); R(X0 + tw, zb, Lw, tb); R(X0 + tw, zt - 0.25, Lw, 0.25);
    put('line', { a: [X0 - 3.5, yz(p.ZG), 0], b: [X0, yz(p.ZG), 0], layer: 'ZEMIN' }); put('line', { a: [X0 + Wtot, yz(p.ZG), 0], b: [X0 + Wtot + 3.5, yz(p.ZG), 0], layer: 'ZEMIN' });
    const xe = X0 + Wtot;
    [[zAlarm, 'Alarm', 0.4], [zStart, 'Start', 2.7], [zStop, 'Stop', 0.4], [zMin, 'Min', 2.7]].forEach(([z, t, dx]) => {
      put('line', { a: [X0 + tw, yz(z), 0], b: [X0 + tw + Lw, yz(z), 0], layer: 'SU' });
      put('line', { a: [xe, yz(z), 0], b: [xe + dx, yz(z), 0], layer: 'SU', lw: 13 });
      put('kot', { p: [xe + dx, yz(z), 0], v: +z.toFixed(2), txt: t, layer: 'KOT' });
    });
    for (let i = 0; i < p.N; i++) {
      const cx = X0 + tw + (i + 0.5) * Lw / p.N;
      R(cx - dP / 2, zFloor, dP, hP, 'GORUNEN', 25);
      const r = DNp / 2000; put('line', { a: [cx - r, yz(zFloor + hP), 0], b: [cx - r, yz(zR), 0], layer: 'GORUNEN' }); put('line', { a: [cx + r, yz(zFloor + hP), 0], b: [cx + r, yz(zR), 0], layer: 'GORUNEN' });
      put('text', { p: [cx, yz(zFloor + hP / 2), 0], h: C.annoH(2.5), s: `P${i + 1}`, rot: 0, al: 'M', layer: 'YAZI' });
    }
    const rIn = p.DIN / 2000;
    put('line', { a: [X0 - 2.5, yz(zin - rIn), 0], b: [X0 + tw + 0.25, yz(zin - rIn), 0], layer: 'BORU' }); put('line', { a: [X0 - 2.5, yz(zin + rIn), 0], b: [X0 + tw + 0.25, yz(zin + rIn), 0], layer: 'BORU' });
    put('text', { p: [X0 - 2.4, yz(zin - rIn) - C.annoH(4.5), 0], h: C.annoH(2.5), s: `GİRİŞ DN${p.DIN}`, rot: 0, al: 'L', layer: 'YAZI' });
    put('kot', { p: [X0 - 2.3, yz(p.ZIN), 0], v: +p.ZIN.toFixed(2), txt: 'Giriş', layer: 'KOT' });
    put('kot', { p: [X0 + Wtot + 0.5, yz(zt), 0], v: +zt.toFixed(2), txt: '', layer: 'KOT' });
    put('kot', { p: [X0 + Wtot + 1.5, yz(p.ZG), 0], v: +p.ZG.toFixed(2), txt: 'Zemin', layer: 'KOT' });
    put('line', { a: [X0 - 2.6, yz(zFloor), 0], b: [X0, yz(zFloor), 0], layer: 'GORUNEN', lt: 'DASHED', lw: 13 });
    put('kot', { p: [X0 - 2.6, yz(zFloor), 0], v: +zFloor.toFixed(2), txt: 'Taban', layer: 'KOT' });
    put('dim', { k: 'v', a: [X0 + Wtot, yz(zFloor), 0], b: [X0 + Wtot, yz(zt), 0], p: [X0 + Wtot + C.annoH(50), 0, 0], layer: 'OLCU' });
    put('dim', { k: 'h', a: [X0 + tw, yz(zb), 0], b: [X0 + tw + Lw, yz(zb), 0], p: [X0, yz(zb) - dg, 0], layer: 'OLCU' });
    put('text', { p: [X0 + Wtot / 2, yz(zb) - dg * 2.2, 0], h: ttl, s: 'A-A KESİTİ', rot: 0, al: 'C', layer: 'YAZI' });
    // hesap özeti
    const note = [
      `${p.AD} — HESAP ÖZETİ`,
      `Toplam debi Q = ${M.fmt(p.Q, 1)} l/s, pompa: ${p.N} adet (${nRun} asil + ${p.N - nRun} yedek)`,
      `Pompa debisi Qp = ${M.fmt(Qp, 1)} l/s, Hm ≈ ${p.HM} m`,
      `Kalkış z = ${p.Z}/saat → Vgerekli = 0.9·Qp/z = ${M.fmt(Vreq, 2)} m³`,
      `Islak hazne iç ölçü ${M.fmt(Lw)} × ${M.fmt(Ww)} m, etkin yük. ${M.fmt(p.HEFF)} m → V = ${M.fmt(Vact, 2)} m³`,
      `Basma DN${DNp} (v=${M.fmt(vP)} m/s), kollektör DN${DNh} (v=${M.fmt(vH)} m/s)`,
      `Kotlar: zemin ${C.fmtKot(p.ZG)}, giriş ${C.fmtKot(p.ZIN)}, start ${C.fmtKot(zStart)}, stop ${C.fmtKot(zStop)}, taban ${C.fmtKot(zFloor)}`,
    ].join('\n');
    put('text', { p: [X0, yz(zb) - dg * 4, 0], h: C.annoH(2.5), s: note, rot: 0, al: 'L', layer: 'YAZI' });
    // pafta
    if (p.PAFTA) {
      const bb = C.extents(out); const w = bb[2] - bb[0] + 4, h = bb[3] - bb[1] + 4;
      let best = null;
      outer: for (const sc of [C.doc.set.anno, 50, 100, 200, 500]) for (const sz of ['A3', 'A2', 'A1', 'A0']) { const [pw, ph] = C.PAPER[sz]; if ((pw - 30) * sc / 1000 >= w && (ph - 20 - 70) * sc / 1000 >= h) { best = { sc, sz }; break outer; } }
      best = best || { sc: 200, sz: 'A0' };
      const [pw, ph] = C.PAPER[best.sz], k = best.sc / 1000;
      const ox2 = bb[0] - 2 - 20 * k - ((pw - 30) * k - w) / 2, oy2 = bb[1] - 2 - 80 * k;
      if (best.sc !== C.doc.set.anno) C.log(`Not: Pafta ölçeği 1/${best.sc}. Yazı/ölçü boyutları için OLCEK ${best.sc} yazıp yeniden üretebilirsiniz.`);
      put('sheet', { size: best.sz, orient: 'L', scale: best.sc, o: [ox2, oy2, 0], f: { proje: p.AD, baslik: 'PLAN VE A-A KESİTİ', cizen: C.userName || '', no: '01' }, layer: 'PAFTA' });
    }
    return { ents: out, Qp, Vreq, Vact, Lw, Ww, H, DNp, DNh, zFloor, zStart, zStop };
  };
  C.addCommand(['PUMPSTATION', 'POMPAISTASYONU', 'PI', 'TERFI'], 'Atıksu pompa istasyonu üretir (plan, A-A kesiti, 3B, hesap, pafta). POMPAISTASYONU nokta Q=50 N=2 Z=10 ZG=0 ZIN=-3 DIN=300 HEFF=1 HM=15 PAFTA=E', async (I) => {
    const kv = takeKV();
    const o = await I.pt('Islak hazne iç sol-alt köşesi', { def: [0, 0, 0] }) || [0, 0, 0];
    const quick = Object.keys(kv).length > 0;
    const ask = async (k, t, d) => kv[k] != null ? kvNum(kv, k, d) : (E.scriptMode || quick ? d : await I.num(t, d));
    const prm = {
      Q: await ask('Q', 'Tasarım debisi Q (l/s, toplam)', 50),
      N: await ask('N', 'Pompa sayısı (asil+yedek)', 2),
      Z: await ask('Z', 'Saatlik maks. kalkış sayısı', 10),
      ZG: await ask('ZG', 'Zemin kotu', 0),
      ZIN: await ask('ZIN', 'Giriş borusu alt kotu', -3),
      DIN: await ask('DIN', 'Giriş borusu DN', 300),
      HEFF: await ask('HEFF', 'Etkin çalışma yüksekliği (m)', 1.0),
      HM: await ask('HM', 'Manometrik yükseklik (bilgi, m)', 15),
    };
    prm.TW = kvNum(kv, 'TW', 0.3);
    prm.PAFTA = kv.PAFTA ? !/^(H|N|0|HAYIR|NO)/i.test(kv.PAFTA) : true;
    if (kv.AD) prm.AD = kv.AD;
    const r = C.pumpStation(o, prm);
    C.log(`Pompa istasyonu oluşturuldu: ıslak hazne ${M.fmt(r.Lw)}×${M.fmt(r.Ww)} m, derinlik ${M.fmt(r.H)} m, V=${M.fmt(r.Vact, 2)} m³ (gerekli ${M.fmt(r.Vreq, 2)}), basma DN${r.DNp}, kollektör DN${r.DNh}`);
    C.emit('zoomExtents');
  });
})(typeof window !== 'undefined' ? window.C : globalThis.C);

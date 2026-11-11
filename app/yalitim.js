/* ArıtmaCAD — İNŞAAT › YALITIM
   yalitim nesnesi: { kind, ... }
     cephe : dış cephe ısı yalıtımı (mantolama) — pts (bina dış çevresi, CCW), ht (kenar başına yükseklik), z0, mat, t (cm)
     cati  : çatı / teras yalıtımı — pts (çatı döşemesi), z (döşeme üstü), buhar (E/H), egim (cm), mat, t, su (membran tipi), kor (koruma)
     zemin : zemin betonu altı yalıtım — pts (oda), z0, su (membran), mat, t
     temel : temel yalıtımı — pts (radye / temel izi), zb (temel altı), zt (temel üstü), su, kb (koruma betonu cm), dikey: perde dış yüzü su + XPS (dt cm) + drenaj levhası, zg (zemin kotu)
     su    : su yalıtımı (ıslak hacim / havuz içi) — pts (oda / havuz), z0, h (duvarda yükseklik), tip, taban (E/H)  |  tank için host
     bant  : su tutucu bant — pts (çizgi), closed, z (derz kotu), tip, w (cm)
   Komutlar: CEPHEYALITIM, CATIYALITIM, ZEMINYALITIM, TEMELYALITIM, SUYALITIM, SUTUTUCUBANT */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, P, TX } = C.prim, RAD = Math.PI / 180;
  const K = () => C._kap, I_ = () => C._ins;
  const ISI = {
    eps: { ad: 'EPS (karbon katkılı) ısı yalıtım levhası', col: [0.80, 0.80, 0.82] },
    xps: { ad: 'XPS ısı yalıtım levhası', col: [0.93, 0.70, 0.76] },
    tasyunu: { ad: 'Taşyünü ısı yalıtım levhası', col: [0.86, 0.78, 0.52] },
    pir: { ad: 'Poliüretan (PIR) ısı yalıtım levhası', col: [0.92, 0.88, 0.62] },
    camyunu: { ad: 'Camyünü ısı yalıtım levhası', col: [0.95, 0.86, 0.45] },
    yok: { ad: 'Isı yalıtımı yok', col: null },
  };
  const SU = {
    bitum: { ad: 'Bitümlü su yalıtım örtüsü (2 kat, polyester keçe)', col: [0.20, 0.20, 0.22] },
    tpo: { ad: 'TPO / PVC su yalıtım membranı', col: [0.75, 0.78, 0.80] },
    sivipur: { ad: 'Sıvı poliüretan su yalıtımı', col: [0.40, 0.42, 0.45] },
    cimento: { ad: 'Çimento esaslı su yalıtımı (2 kat)', col: [0.62, 0.64, 0.66] },
    kristal: { ad: 'Kristalize su yalıtımı', col: [0.58, 0.60, 0.62] },
    polyurea: { ad: 'Polyurea su yalıtımı', col: [0.30, 0.45, 0.60] },
    epoksi: { ad: 'Epoksi kaplama (içme suyuna uygun)', col: [0.40, 0.62, 0.75] },
    bentonit: { ad: 'Bentonit su yalıtım örtüsü', col: [0.45, 0.38, 0.30] },
    hdpe: { ad: 'HDPE su yalıtım membranı', col: [0.15, 0.15, 0.17] },
    yok: { ad: 'Su yalıtımı yok', col: null },
  };
  const BANT = {
    pvc_i25: 'PVC I tipi su tutucu bant (orta)', pvc_ic: 'PVC su tutucu bant (iç tip)', pvc_dis: 'PVC su tutucu bant (dış tip)', hidrofil: 'Hidrofilik (suyla şişen) bant',
    bentonit: 'Bentonitli şişen bant', hortum: 'Enjeksiyon hortumu', metal: 'Galvaniz sac su tutucu',
  };
  const KOR = { cakil: { ad: 'Çakıl koruma tabakası (5 cm, geotekstil üstü)', t: 5, col: [0.60, 0.58, 0.55] }, sap: { ad: 'Koruma şapı (5 cm)', t: 5, col: [0.76, 0.75, 0.72] }, yok: { ad: 'Koruma yok', t: 0, col: null } };
  const o_ = O => Object.entries(O).map(([k, v]) => [k, typeof v === 'string' ? v : v.ad]);
  const MEM = 0.006; // membran görünen kalınlık (m)
  C._yal = { ISI, SU, KOR, BANT, MEM };
  const thkZemin = e => ((e.su && e.su !== 'yok') ? MEM : 0) + ((e.mat && e.mat !== 'yok') ? (+e.t || 0) / 100 : 0);
  /* zemin kaplaması tabanını yükseltmek için: odadaki zemin yalıtımı kalınlığı */
  C.yalitimZeminT = (ip, z0) => { let t = 0; for (const x of C.doc.ents) if (x.type === 'yalitim' && x.kind === 'zemin' && Math.abs((+x.z0 || 0) - z0) < 0.01 && C.pointInPoly(ip, x.pts)) t = Math.max(t, thkZemin(x)); return t; };
  const miterLoop = L2 => { const n = L2.length, mt = (p, q) => { const k = 1 + p[0] * q[0] + p[1] * q[1]; return k < 1e-6 ? q : [(p[0] + q[0]) / k, (p[1] + q[1]) / k]; }; L2.forEach((w, i) => { w.m0 = mt(L2[(i - 1 + n) % n].n, w.n); w.m1 = mt(w.n, L2[(i + 1) % n].n); }); return L2; };
  const mP = (w, s, o) => s <= 1e-9 && w.m0 ? [w.a[0] + w.m0[0] * o, w.a[1] + w.m0[1] * o] : s >= w.L - 1e-9 && w.m1 ? [w.b[0] + w.m1[0] * o, w.b[1] + w.m1[1] * o] : [w.a[0] + w.u[0] * s + w.n[0] * o, w.a[1] + w.u[1] * s + w.n[1] * o];
  const edges = (q, sgn) => { const out = []; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length], Ls = M.dist2(a, b); if (Ls < 1e-6) continue; const u = [(b[0] - a[0]) / Ls, (b[1] - a[1]) / Ls]; out.push({ a, b, u, n: [-u[1] * sgn, u[0] * sgn], L: Ls }); } return miterLoop(out); };
  const shell = (out, w, o0, o1, za, zb, col) => { if (!(zb > za) || !(o1 > o0) || !col) return; const Pp = (s, o, z) => { const q = mP(w, s, o); return [q[0], q[1], z]; }; I_().hexa(out, [Pp(0, o0, za), Pp(w.L, o0, za), Pp(w.L, o1, za), Pp(0, o1, za), Pp(0, o0, zb), Pp(w.L, o0, zb), Pp(w.L, o1, zb), Pp(0, o1, zb)], col); };
  const tankInner = x => { if (x.type === 'tank') { const cs = Math.cos((x.rot || 0) * RAD), sn = Math.sin((x.rot || 0) * RAD), o = M.p3(x.o), W = (u, v) => [o[0] + u * cs - v * sn, o[1] + u * sn + v * cs]; return { q: [W(0, 0), W(x.L, 0), W(x.L, x.W), W(0, x.W)], zb: x.zt - x.H, zt: x.zt, mid: [W(-x.tw / 2, -x.tw / 2), W(x.L + x.tw / 2, -x.tw / 2), W(x.L + x.tw / 2, x.W + x.tw / 2), W(-x.tw / 2, x.W + x.tw / 2)] }; } if (x.type === 'ctank') { const c = M.p3(x.c), n = 48, r = x.D / 2, rm = r + x.tw / 2; return { q: Array.from({ length: n }, (_, i) => [c[0] + r * Math.cos(i * 2 * Math.PI / n), c[1] + r * Math.sin(i * 2 * Math.PI / n)]), zb: x.zt - x.H, zt: x.zt, mid: Array.from({ length: n }, (_, i) => [c[0] + rm * Math.cos(i * 2 * Math.PI / n), c[1] + rm * Math.sin(i * 2 * Math.PI / n)]), circ: Math.PI * 2 * rm }; } return null; };
  /* ---- metraj ---- */
  const qty = e => {
    const out = [], A = e.pts ? K().area(e.pts) : 0, isi = (m, t) => m && m !== 'yok' && +t > 0 ? [`${ISI[m].ad} (${t} cm)`, 'm²'] : null, su = m => m && m !== 'yok' ? [SU[m].ad, 'm²'] : null;
    if (e.kind === 'cephe') { let a = 0; edges(K().ccw(e.pts), -1).forEach((w, i) => { a += w.L * (Array.isArray(e.ht) && e.ht[i] != null ? +e.ht[i] : (+e.h || 3)); }); const r = isi(e.mat, e.t); if (r) out.push([r[0] + ' — dış cephe (mantolama)', 'm²', a]); }
    else if (e.kind === 'cati') { if (e.buhar === 'E') out.push(['Buhar dengeleyici / kesici (çatı)', 'm²', A]); if (+e.egim > 0) out.push([`Eğim betonu (ort. ${e.egim} cm)`, 'm³', A * e.egim / 100]); const r = isi(e.mat, e.t); if (r) out.push([r[0] + ' — çatı', 'm²', A]); const s = su(e.su); if (s) out.push([s[0] + ' — çatı', 'm²', A]); if (e.kor && e.kor !== 'yok') out.push([KOR[e.kor].ad, 'm²', A]); }
    else if (e.kind === 'zemin') { const s = su(e.su); if (s) out.push([s[0] + ' — zemin betonu altı', 'm²', A]); const r = isi(e.mat, e.t); if (r) out.push([r[0] + ' — zemin betonu altı', 'm²', A]); }
    else if (e.kind === 'temel') {
      const s = su(e.su); if (s) out.push([s[0] + ' — temel altı (yatay)', 'm²', A]); if (+e.kb > 0) out.push([`Koruma betonu (${e.kb} cm) — temel altı`, 'm²', A]);
      const dv = dikeyAlan(e); if (dv > 0) { if (s) out.push([s[0] + ' — temel / perde dış yüzü (düşey)', 'm²', dv]); const r = isi(e.dmat || 'xps', e.dt); if (r) out.push([r[0] + ' — perde dış yüzü (düşey)', 'm²', dv]); if (e.dren === 'E') out.push(['Drenaj / koruma levhası (kabarcıklı HDPE)', 'm²', dv]); }
    }
    else if (e.kind === 'su') { const s = su(e.tip); if (s) { let a = 0; if (e.host) { const x = C.byId(e.host), ti = x && tankInner(x); if (ti) { a = (e.taban !== 'H' ? K().area(ti.q) : 0) + K().perim(ti.q) * (+e.h || (ti.zt - ti.zb)); } } else a = (e.taban !== 'H' ? A : 0) + K().perim(e.pts) * (+e.h || 0); out.push([s[0] + (e.host ? ' — havuz iç yüzeyi' : ' — ıslak hacim / havuz'), 'm²', a]); } }
    else if (e.kind === 'bant') { let Lb = 0; for (let i = 1; i < e.pts.length; i++) Lb += M.dist2(e.pts[i - 1], e.pts[i]); if (e.closed && e.pts.length > 2) Lb += M.dist2(e.pts[e.pts.length - 1], e.pts[0]); out.push([`${BANT[e.tip] || BANT.pvc_ic}${e.tip === 'pvc_i25' ? ` ${e.w || 20}/${e.t || 5}` : ''}${e.tip && e.tip.startsWith('pvc') && e.tip !== 'pvc_i25' ? ` (${e.w || 24} cm)` : ''}`, 'm', Lb]); }
    return out;
  };
  const dikeyAlan = e => { let a = 0; for (const seg of (e.dik || [])) a += M.dist2(seg.a, seg.b) * Math.max(0, seg.z1 - seg.z0); return a; };
  C.yalitimMetraj = () => { const m = new Map(); for (const e of C.doc.ents) { if (e.type !== 'yalitim' || !C.lyLive(e.layer)) continue; for (const [ad, br, v] of qty(e)) { const k = ad + '|' + br; m.set(k, (m.get(k) || 0) + v); } } return [...m.entries()].map(([k, v]) => { const [ad, br] = k.split('|'); return [ad, br, v]; }); };
  T.yalitim = {
    label: 'Yalıtım', ifc: 'IfcCovering',
    prims: e => {
      if (e.kind === 'bant') return [P(e.pts.map(q => [q[0], q[1], 0]), !!e.closed, { lt: 'DASHDOT', lw: 25, color: 5 })];
      if (e.kind === 'cephe') { const t = (+e.t || 5) / 100; return edges(K().ccw(e.pts), -1).map(w => { const a = mP(w, 0, t), b = mP(w, w.L, t); return L([a[0], a[1], 0], [b[0], b[1], 0], { lw: 13, lt: 'DASHED', color: 6 }); }); }
      let pp = e.pts; if (!pp && e.host) { const x = C.byId(e.host), ti = x && tankInner(x); pp = ti ? ti.q : null; } if (!pp) return []; return [P(pp.map(p => [p[0], p[1], 0]), true, { lw: 9, lt: 'DASHED', color: 6 })];
    },
    mesh: e => {
      const out = I_().newMesh(), K_ = K();
      if (e.kind === 'cephe') { const t = (+e.t || 5) / 100, z0 = +e.z0 || 0; edges(K_.ccw(e.pts), -1).forEach((w, i) => shell(out, w, 0, t, z0, z0 + (Array.isArray(e.ht) && e.ht[i] != null ? +e.ht[i] : (+e.h || 3)), (ISI[e.mat] || ISI.eps).col)); }
      else if (e.kind === 'cati') { let z = +e.z || 0; const lay = [[e.buhar === 'E' ? 0.004 : 0, [0.35, 0.55, 0.35]], [(+e.egim || 0) / 100, [0.70, 0.70, 0.68]], [e.mat !== 'yok' ? (+e.t || 0) / 100 : 0, (ISI[e.mat] || ISI.xps).col], [e.su !== 'yok' ? MEM : 0, (SU[e.su] || SU.bitum).col], [(KOR[e.kor] || KOR.yok).t / 100, (KOR[e.kor] || KOR.yok).col]]; for (const [t, col] of lay) if (t > 0 && col) { K_.prismTri(out, e.pts, z, z + t, col); z += t; } }
      else if (e.kind === 'zemin') { let z = +e.z0 || 0; if (e.su && e.su !== 'yok') { K_.prismTri(out, e.pts, z, z + MEM, SU[e.su].col); z += MEM; } if (e.mat && e.mat !== 'yok' && +e.t > 0) K_.prismTri(out, e.pts, z, z + e.t / 100, ISI[e.mat].col); }
      else if (e.kind === 'temel') {
        const zb = +e.zb || 0, kb = (+e.kb || 0) / 100, sc = (SU[e.su] || SU.bitum).col;
        if (kb > 0) K_.prismTri(out, e.pts, zb - kb, zb, [0.74, 0.74, 0.72]); if (e.su !== 'yok') K_.prismTri(out, e.pts, zb - kb - MEM, zb - kb, sc); // grobeton › su yalıtımı › koruma betonu › temel
        const dt = (+e.dt || 0) / 100;
        for (const sg of (e.dik || [])) { const Ls = M.dist2(sg.a, sg.b); if (Ls < 1e-6) continue; const u = [(sg.b[0] - sg.a[0]) / Ls, (sg.b[1] - sg.a[1]) / Ls], w = { a: sg.a, b: sg.b, u, n: [u[1], -u[0]], L: Ls }; if (e.su !== 'yok') shell(out, w, 0, MEM, sg.z0, sg.z1, sc); if (dt > 0) shell(out, w, MEM, MEM + dt, sg.z0, sg.z1, (ISI[e.dmat] || ISI.xps).col); if (e.dren === 'E') shell(out, w, MEM + dt, MEM + dt + 0.008, sg.z0, sg.z1, [0.12, 0.12, 0.14]); }
      }
      else if (e.kind === 'su') {
        const col = (SU[e.tip] || SU.cimento).col; let q = e.pts, z0 = +e.z0 || 0, h = +e.h || 0;
        if (e.host) { const x = C.byId(e.host), ti = x && tankInner(x); if (!ti) return [out]; q = ti.q; z0 = ti.zb; h = h || (ti.zt - ti.zb); }
        if (e.taban !== 'H') K_.prismTri(out, q, z0, z0 + MEM, col);
        if (h > 0) for (const w of edges(K_.ccw(q), 1)) shell(out, w, 0, MEM, z0, z0 + h, col);
      }
      else if (e.kind === 'bant') {
        const z = +e.z || 0, w2 = (+e.w || 24) / 200, n = e.pts.length, segs = []; for (let i = 1; i < n; i++) segs.push([e.pts[i - 1], e.pts[i]]); if (e.closed && n > 2) segs.push([e.pts[n - 1], e.pts[0]]);
        for (const [a, b] of segs) { const Ls = M.dist2(a, b); if (Ls < 1e-6) continue; const u = [(b[0] - a[0]) / Ls, (b[1] - a[1]) / Ls]; const th = Math.max(0.002, (+e.t || 8) / 2000); shell(out, { a, b, u, n: [-u[1], u[0]], L: Ls }, -th, th, z - w2, z + w2, [0.95, 0.75, 0.10]); }
      }
      return [out];
    },
    xf: (e, X) => { let dz = 0; try { const q = X.p([0, 0, 0]); dz = q && q.length > 2 ? (q[2] || 0) : 0; } catch (err) { } for (const k of ['z0', 'z', 'zb', 'zt', 'zg']) if (e[k] != null) e[k] = (+e[k] || 0) + dz; const f = q => X.p([q[0], q[1], 0]).slice(0, 2); if (e.pts) e.pts = e.pts.map(f); if (e.dik) e.dik = e.dik.map(s2 => Object.assign({}, s2, { a: f(s2.a), b: f(s2.b), z0: s2.z0 + dz, z1: s2.z1 + dz })); },
    snaps: e => (e.pts || []).map(q => ({ p: [q[0], q[1], 0], k: 'end' })),
    info: e => ({ cephe: 'Dış cephe ısı yalıtımı', cati: 'Çatı yalıtımı', zemin: 'Zemin betonu altı yalıtım', temel: 'Temel yalıtımı', su: 'Su yalıtımı', bant: 'Su tutucu bant' }[e.kind] || 'Yalıtım') + ' · ' + qty(e).map(([a, b, v]) => `${a} ${M.fmt(v, 2)} ${b}`).join(' · '),
  };
  const lay = () => { C.ensureLayer('INS_YALITIM', 6, 'CONTINUOUS', 13); return 'INS_YALITIM'; };
  const add = (props) => { const e = C.add(C.newEnt('yalitim', Object.assign({ layer: lay() }, props))); delete e.sp; C.log(T.yalitim.info(e)); return e; };
  const GP = (...a) => I_().getParams(...a);
  /* ---------- 1. DIŞ CEPHE ISI YALITIMI ---------- */
  C.addCommand(['CEPHEYALITIM', 'MANTOLAMA', 'DISYALITIM'], 'Dış cephe ısı yalıtımı (mantolama): EPS / XPS / taşyünü / PIR, kalınlık; bina dış çevresi ve her cephenin yüksekliği otomatik.', async () => {
    const r = await GP('Dış cephe ısı yalıtımı', [{ k: 'mat', t: 'Yalıtım malzemesi', opts: o_(ISI).filter(o => o[0] !== 'yok'), d: 'eps', al: ['MAT'] }, { k: 't', t: 'Kalınlık (cm)', d: 5, al: ['T'] }, { k: 'z0', t: 'Alt kot (m) — ör. su basman üstü / zemin kotu', d: 0, al: ['Z'] }], 'ycephe'); if (!r) return;
    const OF = K().outerFacade(+r.z0 || 0); if (!OF) { C.warn('Bina dış çevresi bulunamadı (perde / duvar yok).'); return; }
    C.remove(C.doc.ents.filter(x => x.type === 'yalitim' && x.kind === 'cephe'));
    add({ kind: 'cephe', pts: OF.q.map(q => [q[0], q[1]]), ht: OF.ht, z0: +r.z0 || 0, mat: r.mat, t: +r.t || 5 });
    for (const x of C.doc.ents) if (x.type === 'kaplama' && x.kind === 'duvar' && x.side === 'DIS') x.o0 = (+r.t || 5) / 100; // dış sıva / boya yalıtımın üstüne kayar
    C.emit && C.emit('change');
  });
  /* ---------- 2. ÇATI / TERAS YALITIMI ---------- */
  C.addCommand(['CATIYALITIM', 'TERASYALITIM'], 'Çatı / teras yalıtımı: buhar dengeleyici, eğim betonu, ısı yalıtımı, su yalıtımı (bitümlü örtü, TPO/PVC, sıvı PU …), koruma (çakıl / şap). Çatı döşemesine tıklayın, T = tüm çatı döşemeleri.', async (I) => {
    const r = await GP('Çatı / teras yalıtımı', [{ k: 'buhar', t: 'Buhar dengeleyici', opts: [['E', 'Var'], ['H', 'Yok']], d: 'E', al: ['BUHAR'] }, { k: 'egim', t: 'Eğim betonu ort. kalınlık (cm, 0 = yok)', d: 5, al: ['EGIM'] }, { k: 'mat', t: 'Isı yalıtımı', opts: o_(ISI), d: 'xps', al: ['MAT'] }, { k: 't', t: 'Isı yalıtımı kalınlığı (cm)', d: 8, al: ['T'] }, { k: 'su', t: 'Su yalıtımı', opts: o_(SU), d: 'bitum', al: ['SU'] }, { k: 'kor', t: 'Koruma tabakası', opts: o_(KOR), d: 'cakil', al: ['KOR'] }], 'ycati'); if (!r) return;
    const roofs = C.doc.ents.filter(x => x.type === 'plak' && x.kind !== 'radye' && C.lyLive(x.layer) && !C.doc.ents.some(y => y !== x && y.type === 'plak' && y.kind !== 'radye' && (+y.zt || 0) > (+x.zt || 0) + 0.5 && C.pointInPoly(K().inPt(x.pts), y.pts)));
    const mk = x => { if (C.doc.ents.some(y => y.type === 'yalitim' && y.kind === 'cati' && y.host === x.id)) return false; add({ kind: 'cati', host: x.id, pts: x.pts.map(q => [q[0], q[1]]), z: +x.zt || 0, buhar: r.buhar, egim: +r.egim || 0, mat: r.mat, t: +r.t || 0, su: r.su, kor: r.kor }); return true; };
    let n = 0;
    for (; ;) {
      const p = await I.pt('Çatı döşemesine tıklayın (T = tüm çatı döşemeleri, Enter bitir)', { kw: [['T', 'TUMU', 'TÜMÜ']] });
      if (p === 'T') { for (const x of roofs) if (mk(x)) n++; break; }
      if (!p || typeof p === 'string') break;
      const cand = C.doc.ents.filter(x => x.type === 'plak' && x.kind !== 'radye' && C.pointInPoly(p, x.pts)).sort((a, b) => (+b.zt || 0) - (+a.zt || 0)); if (!cand.length) { C.warn('Burada döşeme yok.'); if (E.scriptMode && !E.queue.length) break; continue; }
      if (mk(cand[0])) n++; if (E.scriptMode && !E.queue.length) break;
    }
    if (n) C.log(`${n} çatı döşemesi yalıtıldı.`);
  });
  /* ---------- 3. ZEMİN BETONU ALTI YALITIM ---------- */
  C.addCommand(['ZEMINYALITIM', 'DOSEMEALTIYALITIM'], 'Zemin betonu altı yalıtım: su yalıtımı (membran) + ısı yalıtımı (XPS …) — odaya tıklayın, T = tüm odalar. Zemin kaplaması (zemin betonu, şap, kaplama) bunun üstüne oturur.', async (I) => {
    const r = await GP('Zemin betonu altı yalıtım', [{ k: 'su', t: 'Su yalıtımı (alt)', opts: o_(SU), d: 'bitum', al: ['SU'] }, { k: 'mat', t: 'Isı yalıtımı', opts: o_(ISI), d: 'xps', al: ['MAT'] }, { k: 't', t: 'Isı yalıtımı kalınlığı (cm)', d: 5, al: ['T'] }], 'yzemin'); if (!r) return;
    const n = await K().roomLoop(I, 'Zemin altı yalıtım', (c, z, all) => {
      if (C.doc.ents.some(x => x.type === 'yalitim' && x.kind === 'zemin' && Math.abs((+x.z0 || 0) - z) < 0.01 && C.pointInPoly(c.ip, x.pts))) { if (!all) C.warn('Bu odada zaten zemin altı yalıtımı var.'); return false; }
      const e = add({ kind: 'zemin', pts: c.f.map(q => [q[0], q[1]]), z0: +z.toFixed(4), su: r.su, mat: r.mat, t: +r.t || 0 }), th = thkZemin(e);
      for (const x of C.doc.ents) if (x.type === 'kaplama' && x.kind === 'zemin' && Math.abs((+x.z0 || 0) - z) < 0.01 && C.pointInPoly(c.ip, x.pts)) x.z0 = +(z + th).toFixed(4); // kaplama yalıtımın üstüne çıkar
      return true;
    });
    if (n) C.log(`${n} odaya zemin altı yalıtımı yapıldı.`);
  });
  /* ---------- 4. TEMEL YALITIMI ---------- */
  C.addCommand(['TEMELYALITIM', 'BOHCALAMA'], 'Temel yalıtımı: temel altı su yalıtımı + koruma betonu; perde / temel dış yüzlerine düşey su yalıtımı + XPS + drenaj levhası (zemin kotuna kadar). Radye / temele tıklayın, T = tüm temeller.', async (I) => {
    const r = await GP('Temel yalıtımı', [{ k: 'su', t: 'Su yalıtımı', opts: o_(SU), d: 'bitum', al: ['SU'] }, { k: 'kb', t: 'Temel altı koruma betonu (cm, 0 = yok)', d: 5, al: ['KB'] }, { k: 'dik', t: 'Düşey yalıtım (perde dış yüzü)', opts: [['E', 'Yap'], ['H', 'Yapma']], d: 'E', al: ['DIK'] }, { k: 'dmat', t: 'Düşey ısı yalıtımı', opts: o_(ISI), d: 'xps', al: ['DMAT'] }, { k: 'dt', t: 'Düşey ısı yalıtımı kalınlığı (cm, 0 = yok)', d: 5, al: ['DT'] }, { k: 'dren', t: 'Drenaj / koruma levhası', opts: [['E', 'Var'], ['H', 'Yok']], d: 'E', al: ['DREN'] }, { k: 'zg', t: 'Zemin (toprak) kotu (m) — düşey yalıtım buraya kadar', d: 0, al: ['ZG'] }], 'ytemel'); if (!r) return;
    const fp = x => { if (x.type === 'plak') return { q: x.pts.map(q => [q[0], q[1]]), zt: +x.zt || 0, zb: (+x.zt || 0) - (+x.t || 0.3) }; const c = M.p3(x.p), bx = +x.bx || 1.5, by = +x.by || 1.5, cs = Math.cos((x.rot || 0) * RAD), sn = Math.sin((x.rot || 0) * RAD), W = (u, v) => [c[0] + u * cs - v * sn, c[1] + u * sn + v * cs]; return { q: [W(-bx / 2, -by / 2), W(bx / 2, -by / 2), W(bx / 2, by / 2), W(-bx / 2, by / 2)], zt: +x.zt || 0, zb: (+x.zt || 0) - (+x.t || 0.6) }; };
    const isF = x => (x.type === 'plak' && x.kind === 'radye') || x.type === 'temel';
    const mk = x => {
      if (C.doc.ents.some(y => y.type === 'yalitim' && y.kind === 'temel' && y.host === x.id)) return false;
      const F = fp(x), q = K().ccw(F.q), zg = +r.zg || 0, dik = [];
      if (r.dik === 'E') {
        for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; if (M.dist2(a, b) > 1e-6) dik.push({ a, b, z0: F.zb, z1: Math.min(F.zt, Math.max(F.zb, zg)) }); } // temel kenarı
        if (zg > F.zt + 0.01) { const OF = K().outerFacade(F.zt + 0.01); if (OF) { const oq = K().ccw(OF.q); for (let i = 0; i < oq.length; i++) { const a = oq[i], b = oq[(i + 1) % oq.length], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if (M.dist2(a, b) > 1e-6 && C.pointInPoly(m, F.q)) dik.push({ a, b, z0: F.zt, z1: Math.min(zg, F.zt + (OF.ht[i] != null ? OF.ht[i] : 0) + 0.01) }); } } } // perde dış yüzü
      }
      add({ kind: 'temel', host: x.id, pts: F.q, zb: F.zb, zt: F.zt, su: r.su, kb: +r.kb || 0, dik, dmat: r.dmat, dt: +r.dt || 0, dren: r.dren, zg }); return true;
    };
    let n = 0;
    for (; ;) {
      const p = await I.pt('Radye / temele tıklayın (T = tüm temeller, Enter bitir)', { kw: [['T', 'TUMU', 'TÜMÜ']] });
      if (p === 'T') { for (const x of C.doc.ents.filter(x => isF(x) && C.lyLive(x.layer))) if (mk(x)) n++; break; }
      if (!p || typeof p === 'string') break;
      const x = C.doc.ents.find(x => isF(x) && C.pointInPoly(p, fp(x).q)); if (!x) { C.warn('Burada radye / temel yok.'); if (E.scriptMode && !E.queue.length) break; continue; }
      if (mk(x)) n++; if (E.scriptMode && !E.queue.length) break;
    }
    if (n) C.log(`${n} temel yalıtıldı.`);
  });
  /* ---------- 5. SU YALITIMI (ıslak hacim / havuz içi) ---------- */
  C.addCommand(['SUYALITIM', 'HAVUZYALITIM', 'ISLAKHACIM'], 'Su yalıtımı: ıslak hacim ya da havuz iç yüzeyi (çimento esaslı, kristalize, poliüretan, polyurea, epoksi …) — odaya / havuza tıklayın, T = tüm havuzlar (HAVUZ / DHAVUZ nesneleri).', async (I) => {
    const r = await GP('Su yalıtımı (ıslak hacim / havuz)', [{ k: 'tip', t: 'Su yalıtımı', opts: o_(SU).filter(o => o[0] !== 'yok'), d: 'cimento', al: ['TIP'] }, { k: 'taban', t: 'Tabana uygula', opts: [['E', 'Evet'], ['H', 'Hayır']], d: 'E', al: ['TABAN'] }, { k: 'h', t: 'Duvarda yükseklik (m, 0 = tam yükseklik)', d: 0, al: ['H'] }], 'ysu'); if (!r) return;
    const tanks = () => C.doc.ents.filter(x => (x.type === 'tank' || x.type === 'ctank') && C.lyLive(x.layer));
    const mkTank = x => { if (C.doc.ents.some(y => y.type === 'yalitim' && y.kind === 'su' && y.host === x.id)) return false; add({ kind: 'su', host: x.id, tip: r.tip, taban: r.taban, h: +r.h || 0 }); return true; };
    let n = 0;
    for (; ;) {
      const p = await I.pt('Islak hacim / havuz içine tıklayın (T = tüm havuzlar, Enter bitir)', { kw: [['T', 'TUMU', 'TÜMÜ']] });
      if (p === 'T') { for (const x of tanks()) if (mkTank(x)) n++; const zs = K().floorLevels(); for (const z of zs) for (const c of I_().dolguCells(z - 0.05).cells) { const f = K().floorAt(c.ip, z + 0.001); if (f == null || Math.abs(f - z) > 0.01) continue; if (C.doc.ents.some(y => y.type === 'yalitim' && y.kind === 'su' && y.pts && C.pointInPoly(c.ip, y.pts))) continue; const wt = K().wallTop(c.f, z); if (wt == null || wt < z + 0.5) continue; if (C.doc.ents.some(y => y.type === 'dolgu' && C.pointInPoly(c.ip, y.pts))) continue; const fz = I_().fndTop(c.ip); if (fz == null || Math.abs(fz - z) > 0.01) continue; add({ kind: 'su', pts: c.f.map(q => [q[0], q[1]]), z0: z, h: +r.h || (wt - z), tip: r.tip, taban: r.taban }); n++; } break; }
      if (!p || typeof p === 'string') break;
      const tk = tanks().find(x => { const ti = tankInner(x); return ti && C.pointInPoly(p, ti.q); });
      if (tk) { if (mkTank(tk)) n++; if (E.scriptMode && !E.queue.length) break; continue; }
      const z = K().floorAt(p, Math.abs(p[2] || 0) > 1e-6 ? p[2] : Infinity); const c = z != null ? K().roomAt(p, z) : null; if (!c) { C.warn('Kapalı bir oda / havuz bulunamadı.'); if (E.scriptMode && !E.queue.length) break; continue; }
      const wt = K().wallTop(c.f, z) ?? K().ceilAt(p, z) ?? (z + 2.5), cz = K().ceilAt(p, z), top = cz != null ? Math.min(cz, Math.max(wt, z)) : wt;
      add({ kind: 'su', pts: c.f.map(q => [q[0], q[1]]), z0: z, h: +r.h || Math.max(0, top - z), tip: r.tip, taban: r.taban }); n++;
      if (E.scriptMode && !E.queue.length) break;
    }
    if (n) C.log(`${n} alana su yalıtımı yapıldı.`);
  });
  /* ---------- 6. SU TUTUCU BANT ---------- */
  /* perdeye bağlı su tutucu bant (PERDE penceresindeki "Su tutucu bant" kutusu): perde ekseni boyunca, perde alt kotundan dz yukarıda; perde değişince bant da güncellenir, perde silinince bant da silinir */
  const perdeBantPath = x => { const F = I_().faceOffs(x), om = (F.lB + F.rB) / 2, sfs = I_().segFrames(x); if (!sfs.length) return null;
    const pts = sfs.map(sf => [+(sf.a[0] + sf.nn[0] * om + sf.u[0] * sf.k0 * om).toFixed(5), +(sf.a[1] + sf.nn[1] * om + sf.u[1] * sf.k0 * om).toFixed(5)]); if (!x.closed) { const l = sfs[sfs.length - 1]; pts.push([+(l.b[0] + l.nn[0] * om).toFixed(5), +(l.b[1] + l.nn[1] * om).toFixed(5)]); }
    return { pts, closed: !!x.closed }; };
  C.addPerdeBant = (x, dz, o) => { o = o || {}; const pp = perdeBantPath(x); if (!pp) return null; C.ensureLayer('INS_SU_TUTUCU_BANT', 5, 'CONTINUOUS', 25);
    const e = C.add(C.newEnt('yalitim', { kind: 'bant', host: x.id, auto: true, dz: +dz || 0, pts: pp.pts, closed: pp.closed, z: +((+x.z0 || 0) + (+dz || 0)).toFixed(4), tip: o.tip || 'pvc_i25', w: +o.w || 20, t: +o.t || 5, layer: 'INS_SU_TUTUCU_BANT' })); delete e.sp; return e; };
  const syncBant = () => { if (!C.doc) return; for (const e of C.doc.ents) { if (e.type !== 'yalitim' || e.kind !== 'bant' || !e.auto || !e.host) continue; const x = C.byId(e.host); if (!x || x.type !== 'perde') continue;
    const pp = perdeBantPath(x); if (!pp) continue; const z = +((+x.z0 || 0) + (+e.dz || 0)).toFixed(4); if (JSON.stringify(pp.pts) !== JSON.stringify(e.pts) || pp.closed !== !!e.closed || Math.abs(z - (+e.z || 0)) > 1e-6) { e.pts = pp.pts; e.closed = pp.closed; e.z = z; delete e._c; } } };
  C.on('change', syncBant);
  { const rm0 = C.remove; C.remove = function (list) { const ids = new Set((list || []).filter(e => e && e.type === 'perde').map(e => e.id)); if (ids.size) list = list.concat(C.doc.ents.filter(b => b.type === 'yalitim' && b.kind === 'bant' && b.auto && ids.has(b.host) && !list.includes(b))); return rm0.call(this, list); }; }
  C.addCommand(['SUTUTUCUBANT', 'WATERSTOP', 'BANT'], 'Su tutucu bant: havuz / perde soğuk derzleri (perde–radye, perde–döşeme birleşimleri) otomatik ya da elle çizilen derz boyunca; PVC iç / dış tip, hidrofilik, bentonitli, enjeksiyon hortumu, galvaniz sac.', async (I) => {
    const r = await GP('Su tutucu bant', [{ k: 'tip', t: 'Bant tipi', opts: o_(BANT), d: 'pvc_ic', al: ['TIP'] }, { k: 'w', t: 'Bant genişliği (cm, PVC)', d: 24, al: ['W'] }, { k: 'mod', t: 'Yerleşim', opts: [['OTO', 'Otomatik: tüm perde–temel / havuz taban derzleri'], ['EL', 'Elle: derz çizgisini çiz']], d: 'OTO', al: ['MOD'] }], 'ybant'); if (!r) return;
    let n = 0; const has = (pts, z) => C.doc.ents.some(y => y.type === 'yalitim' && y.kind === 'bant' && Math.abs((+y.z || 0) - z) < 0.01 && y.pts.length === pts.length && y.pts.every((q, i) => M.dist2(q, pts[i]) < 0.01));
    if (r.mod === 'EL') {
      const pts = []; for (; ;) { E.base = pts.length ? pts[pts.length - 1] : null; const p = await I.pt(pts.length ? 'Sonraki nokta (Enter bitir)' : 'Derz başlangıcı'); E.base = null; if (!p || typeof p === 'string') break; pts.push(p); }
      if (pts.length < 2) return; const z = Math.abs(pts[0][2] || 0) > 1e-6 ? pts[0][2] : (await I.num('Derz kotu (m)', 0));
      add({ kind: 'bant', pts: pts.map(q => [q[0], q[1]]), closed: false, z: +z || 0, tip: r.tip, w: +r.w || 24 }); return;
    }
    // perde tabanları: altında radye / temel / döşeme üstü varsa soğuk derz
    const supAt = (q, z) => C.doc.ents.some(x => C.lyLive(x.layer) && ((x.type === 'plak' && C.pointInPoly(q, x.pts) && Math.abs((+x.zt || 0) - z) < 0.03) || (x.type === 'perde' && x.temel && Math.abs((+x.z0 || 0) + (+x.h || 0) - z) < 0.03)));
    for (const x of C.doc.ents) {
      if (x.type !== 'perde' || x.temel || (x.malz || 'beton') !== 'beton' || !C.lyLive(x.layer)) continue;
      const F = I_().faceOffs(x), om = (F.lB + F.rB) / 2, z = +x.z0 || 0, sfs = I_().segFrames(x); if (!sfs.length) continue;
      const pts = sfs.map(sf => [sf.a[0] + sf.nn[0] * om + sf.u[0] * sf.k0 * om, sf.a[1] + sf.nn[1] * om + sf.u[1] * sf.k0 * om]); if (!x.closed) { const l = sfs[sfs.length - 1]; pts.push([l.b[0] + l.nn[0] * om, l.b[1] + l.nn[1] * om]); }
      const mid = [(sfs[0].a[0] + sfs[0].b[0]) / 2, (sfs[0].a[1] + sfs[0].b[1]) / 2]; if (!supAt(mid, z)) continue;
      if (has(pts, z)) continue; add({ kind: 'bant', host: x.id, pts, closed: !!x.closed, z, tip: r.tip, w: +r.w || 24 }); n++;
    }
    for (const x of C.doc.ents) { if ((x.type !== 'tank' && x.type !== 'ctank') || !C.lyLive(x.layer)) continue; const ti = tankInner(x); if (!ti || has(ti.mid, ti.zb)) continue; add({ kind: 'bant', host: x.id, pts: ti.mid, closed: true, z: ti.zb, tip: r.tip, w: +r.w || 24 }); n++; }
    C.log(n ? `${n} derz boyunca su tutucu bant konuldu.` : 'Bant konulacak perde–temel / havuz taban derzi bulunamadı (elle çizmek için MOD=EL).');
  });
})(window.C);

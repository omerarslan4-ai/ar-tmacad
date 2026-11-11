/* ArıtmaCAD — PERDE PARÇASI (SketchUp gibi: duvarın yüzüne çizgi çekip o parçayı it / çek)
   PERDEPARCA: perdeyi seç (ya da tıkla) → parçanın başlangıcı (tıkla ya da en yakın uçtan mesafe yaz) → parça boyu → hangi yüz → mesafe.
     Ü = üst yüz (perde üstü iner / çıkar), A = alt yüz (perde tabanı derinleşir / yükselir), T = parçanın tamamı aşağı / yukarı taşınır.
     Ör: sağ uçtan 2 m'lik parçayı 4 m aşağı → uca yakın 0 yaz, 2 yaz, Ü (ya da T), −4.
   PERDEBOL: perdeyi tıkladığınız noktalardan böler (her parça ayrı perde; açıklıklar, ayak ve su tutucu bant parçalarla birlikte gider).
   Bölünen perde 3B'de kendi oklarıyla da tek tek uzatılıp kısaltılabilir. */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, { L, P } = C.prim;
  const p2 = p => [p[0], p[1]];
  const isClosed = e => !!e.closed || (e.pts.length > 3 && M.dist2(e.pts[0], e.pts[e.pts.length - 1]) < 1e-3);
  const pathOf = e => { const p = e.pts.map(p2), cl = isClosed(e) && p.length > 2; if (cl && M.dist2(p[0], p[p.length - 1]) < 1e-3) p.pop(); const cum = [0]; const n = cl ? p.length : p.length - 1; for (let i = 0; i < n; i++) cum.push(cum[i] + M.dist2(p[i], p[(i + 1) % p.length])); return { p, cl, cum, Lt: cum[cum.length - 1], n }; };
  const at = (P0, s) => { const { p, cl, cum, Lt, n } = P0; if (cl) s = ((s % Lt) + Lt) % Lt; else s = Math.max(0, Math.min(Lt, s)); for (let i = 0; i < n; i++) if (s <= cum[i + 1] + 1e-12 || i === n - 1) { const a = p[i], b = p[(i + 1) % p.length], l = cum[i + 1] - cum[i] || 1, t = Math.max(0, Math.min(1, (s - cum[i]) / l)); return { q: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], i, u: [(b[0] - a[0]) / l, (b[1] - a[1]) / l] }; } return { q: p[0], i: 0, u: [1, 0] }; };
  const proj = (P0, q) => { const { p, cum, n } = P0; let best = { d: Infinity, s: 0 }; for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % p.length], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-12; let t = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2; t = Math.max(0, Math.min(1, t)); const x = a[0] + dx * t, y = a[1] + dy * t, d = Math.hypot(q[0] - x, q[1] - y); if (d < best.d) best = { d, s: cum[i] + t * Math.sqrt(l2) }; } return best; };
  /* sa..sb arası yol noktaları (kapalıda sb > Lt olabilir: başa sarar) */
  const sub = (P0, sa, sb) => { const { p, cum, n, Lt, cl } = P0, out = [at(P0, sa).q]; const verts = []; for (let k = 0; k < (cl ? 2 : 1); k++) for (let i = 1; i <= n; i++) { const s = cum[i] + k * Lt; if (!cl && i === n) continue; if (s > sa + 1e-6 && s < sb - 1e-6) verts.push(p[i % p.length]); } out.push(...verts, at(P0, sb).q); return out; };
  /* kapalı perde açılınca yüzlerin yeri değişmesin: hiza / öteleme açık perde karşılığına çevrilir */
  const openProps = e => { let j = e.hiza || 'O'; const ccw = M.polyArea(pathOf(e).p) > 0; if (j === 'DIS') j = ccw ? 'R' : 'L'; else if (j === 'IC') j = ccw ? 'L' : 'R'; const of = +e.ofs || 0, sh = ccw ? of : -of; return { hiza: j, ofs: +(j === 'L' ? -sh : sh).toFixed(5) }; };
  const clone = e => { const c = JSON.parse(JSON.stringify(C.cleanEnt ? C.cleanEnt(e) : e)); delete c.id; delete c._c; delete c.sp; delete c._osig; return c; };
  /* perdeyi aralıklara böl: ranges = [[sa,sb],...] (kapalıda sarabilir). ilk aralık asıl perdede kalır. döner: parçalar (aynı sıra) */
  const splitBy = (e, ranges) => {
    const P0 = pathOf(e), cl = P0.cl, op = cl ? openProps(e) : null;
    const kick = C.doc.ents.filter(k => k.type === 'perde' && k.kicker && k.kOf === e.id), bands = C.doc.ents.filter(b => b.type === 'yalitim' && b.kind === 'bant' && b.auto && b.host === e.id);
    const ops = C.doc.ents.filter(o => o.type === 'acik' && o.host === e.id).map(o => ({ o, sg: (P0.cum[o.seg || 0] || 0) + (+o.s || 0) }));
    const base = clone(e), pieces = [];
    ranges.forEach(([sa, sb], i) => {
      const pts = sub(P0, sa, sb).map(q => [+q[0].toFixed(5), +q[1].toFixed(5)]);
      let x; if (i === 0) { x = e; x.pts = pts; x.closed = false; delete x._c; } else { x = C.add(C.newEnt('perde', Object.assign(clone(base), { pts, closed: false }))); delete x.sp; }
      if (op) Object.assign(x, op); pieces.push(x);
      if (i > 0) { for (const k of kick) { const k2 = C.add(C.newEnt('perde', Object.assign(clone(k), { kOf: x.id, pts: pts.map(q => q.slice()), closed: false }, op || {}))); delete k2.sp; } for (const b of bands) { const b2 = C.add(C.newEnt('yalitim', Object.assign(clone(b), { host: x.id }))); delete b2.sp; } }
    });
    for (const k of kick) { k.pts = pieces[0].pts.map(q => q.slice()); k.closed = false; if (op) Object.assign(k, op); delete k._c; }
    // açıklıklar hangi parçaya düşüyorsa ona geçer
    for (const { o, sg } of ops) {
      let hit = null; ranges.forEach(([sa, sb], i) => { for (const off of cl ? [0, P0.Lt] : [0]) { const g = sg + off; if (g >= sa - 1e-6 && g <= sb + 1e-6 && !hit) hit = { i, loc: g - sa }; } });
      if (!hit) continue; const x = pieces[hit.i], Q = pathOf(x); let seg = 0; while (seg < Q.n - 1 && hit.loc > Q.cum[seg + 1] + 1e-9) seg++;
      o.host = x.id; o.seg = seg; o.s = +(hit.loc - Q.cum[seg]).toFixed(4); delete o._c;
    }
    for (const x of pieces) delete x._c; return pieces;
  };
  /* sa..sb parçasını ayır (aralık dışında kalanlar ayrı perde olur); ortadaki parçayı döndürür */
  C.perdeParca = (e, sa, sb) => {
    const P0 = pathOf(e), eps = 0.005; if (sb < sa) [sa, sb] = [sb, sa];
    if (P0.cl) { if (sb - sa >= P0.Lt - eps) return e; const pc = splitBy(e, [[sb, sa + P0.Lt], [sa, sb]]); return pc[1]; }
    sa = Math.max(0, sa); sb = Math.min(P0.Lt, sb); const R = []; if (sa > eps) R.push([0, sa]); const mi = R.length; R.push([sa, sb]); if (sb < P0.Lt - eps) R.push([sb, P0.Lt]);
    if (R.length === 1) return e; const pc = splitBy(e, R); return pc[mi];
  };
  C.perdePath = pathOf;
  const findPerde = q => { let best = null, bd = Infinity; for (const x of C.doc.ents) { if (x.type !== 'perde' || x.kicker || x.parapet || x.host || !C.layer(x.layer).on) continue; const r = proj(pathOf(x), q), tol = Math.max(+x.tb || 0.3, +x.tt || 0.3) + 0.25; if (r.d < tol && r.d < bd) { bd = r.d; best = x; } } return best; };
  const in3d = () => C.viewName && C.viewName() === '3d';
  const pickPerde = async (I, msg) => {
    const s = (C.sel || []).filter(x => x.type === 'perde' && !x.kicker); if (s.length === 1) return s[0];
    for (; ;) { if (in3d()) E.hover = 'face'; const p = await I.pt(msg); E.hover = null; if (!p || typeof p === 'string') return null; const e = findPerde(p); if (e) { C.sel = [e]; C.emit('selection'); return e; } C.warn('Orada perde yok — perdenin üstüne / yüzüne tıklayın.'); if (E.scriptMode) return null; }
  };
  /* parça önizlemesi: alt ve üst kot boyunca yol + uçlarda dikey çizgiler */
  const outline = (e, pts, z0, z1) => { const A = pts.map(q => [q[0], q[1], z0]), B = pts.map(q => [q[0], q[1], z1]); return [P(A, false, { lw: 50 }), P(B, false, { lw: 50 }), L(A[0], B[0], { lw: 50 }), L(A[A.length - 1], B[B.length - 1], { lw: 50 })]; };
  const vline = (e, s, P0) => { const q = at(P0, s).q, z0 = +e.z0 || 0, z1 = z0 + (+e.h || 3); return [L([q[0], q[1], z0], [q[0], q[1], z1], { lw: 70 })]; };
  const fm = v => M.fmt(v, 2);
  let lastLen = 2, lastD = -1, lastMode = 'U';
  C.addCommand(['PERDEPARCA', 'PERDEPARCASI', 'PPERDE', 'PERDEITCEK'], 'SketchUp gibi perde parçası it / çek: perdenin bir kısmını ayırıp üstünü indir / kaldır, tabanını derinleştir ya da parçayı aşağı / yukarı taşı. Sıra: perde → başlangıç (tıkla ya da en yakın uçtan mesafe) → parça boyu → Ü üst / A alt / T taşı → mesafe (− aşağı). Ör: PERDEPARCA, sağ uca yakın 0, 2, Ü, −4.', async (I) => {
    const e = await pickPerde(I, 'Perdeye tıklayın (ya da önce perdeyi seçin)'); if (!e) return;
    const P0 = pathOf(e), Lt = P0.Lt, sOf = c => proj(P0, c).s;
    const tagS = s => `uçlara: ${fm(s)} m  ·  ${fm(Lt - s)} m`;
    E.noSnap = false; E.preview = c => c ? vline(e, sOf(c), P0) : []; E.tagFn = c => tagS(sOf(c));
    const r1 = await E.ask('pt', `Parçanın başlangıcı: duvarda tıklayın ya da imlece en yakın uçtan mesafe yazın (0 = uç) — perde boyu ${fm(Lt)} m`, { num: true, def: 0 });
    E.preview = null; E.tagFn = null; if (r1 == null || r1 === '') return;
    let sa; const cur = () => C.cmd.cursor ? sOf(C.cmd.cursor) : Lt;
    if (typeof r1 === 'number') { const near0 = P0.cl ? true : cur() < Lt / 2; sa = near0 ? r1 : Lt - r1; } else sa = sOf(r1);
    sa = P0.cl ? sa : Math.max(0, Math.min(Lt, sa));
    const dirOf = c => { if (!P0.cl && sa < 1e-3) return 1; if (!P0.cl && sa > Lt - 1e-3) return -1; const s = sOf(c); let d = s - sa; if (P0.cl) { if (d > Lt / 2) d -= Lt; if (d < -Lt / 2) d += Lt; } return d >= 0 ? 1 : -1; };
    const z0 = +e.z0 || 0, z1 = z0 + (+e.h || 3);
    E.preview = c => { if (!c) return []; let sb = sOf(c); if (P0.cl && Math.abs(sb - sa) > Lt / 2) sb += sb < sa ? Lt : -Lt; const [x0, x1] = sa < sb ? [sa, sb] : [sb, sa]; return vline(e, sa, P0).concat(outline(e, sub(P0, x0, x1), z0, z1)); };
    E.tagFn = c => { let sb = sOf(c), d = sb - sa; if (P0.cl) { if (d > Lt / 2) d -= Lt; if (d < -Lt / 2) d += Lt; } return `parça boyu ${fm(Math.abs(d))} m`; };
    const r2 = await E.ask('pt', 'Parça boyu (yazın ya da duvarda ikinci noktaya tıklayın)', { num: true, def: lastLen });
    E.preview = null; E.tagFn = null; if (r2 == null || r2 === '') return;
    let sb; if (typeof r2 === 'number') { if (!(r2 > 0.01)) { C.warn('Parça boyu 0’dan büyük olmalı'); return; } sb = sa + dirOf(C.cmd.cursor || [0, 0]) * r2; lastLen = r2; } else { sb = sOf(r2); if (P0.cl && Math.abs(sb - sa) > Lt / 2) sb += sb < sa ? Lt : -Lt; }
    if (!P0.cl) sb = Math.max(0, Math.min(Lt, sb)); if (Math.abs(sb - sa) < 0.01) { C.warn('Parça çok kısa'); return; }
    let x0 = Math.min(sa, sb), x1 = Math.max(sa, sb); if (P0.cl && x0 < 0) { x0 += Lt; x1 += Lt; }
    const piecePts = sub(P0, x0, x1);
    E.preview = () => outline(e, piecePts, z0, z1);
    const mode = await I.kw('Hangi yüz', [['U', 'Üst yüz (üstü iner / çıkar)'], ['A', 'Alt yüz (taban derinleşir / yükselir)'], ['T', 'Parçayı taşı (aşağı / yukarı)']], lastMode); if (!mode) { E.preview = null; return; } lastMode = mode;
    const zz = d => mode === 'U' ? [z0, z1 + d] : mode === 'A' ? [z0 + d, z1] : [z0 + d, z1 + d];
    const mid = piecePts[Math.floor(piecePts.length / 2)], pz = mode === 'A' ? z0 : z1, base = [mid[0], mid[1], pz];
    E.base = in3d() ? base : null; E.axisLock = in3d() ? { o: base, d: [0, 0, 1] } : null;
    const dOf = c => in3d() && c ? (c[2] || 0) - pz : 0;
    E.preview = c => { const d = dOf(c), [a, b] = zz(d); return outline(e, piecePts, a, b); };
    E.tagFn = c => { const d = dOf(c); return `${d >= 0 ? '+' : ''}${fm(d)} m`; };
    const r3 = await E.ask('pt', 'Mesafe (m): eksi = aşağı, artı = yukarı' + (in3d() ? ' — ya da imleci sürükleyip tıklayın' : ''), { num: true, def: lastD });
    E.preview = null; E.tagFn = null; E.base = null; E.axisLock = null; E.noSnap = false;
    const d = typeof r3 === 'number' ? r3 : Array.isArray(r3) ? dOf(r3) : null; if (d == null || Math.abs(d) < 1e-6) return;
    const [na, nb] = zz(d); if (nb - na < 0.05) { C.warn('Bu kadar indirilirse parçanın yüksekliği kalmaz (en az 5 cm).'); return; }
    const m = C.perdeParca(e, x0, x1); m.z0 = +na.toFixed(4); m.h = +(nb - na).toFixed(4); delete m._c; lastD = d;
    C.sel = [m]; C.changed(); C.emit('selection');
    C.log(`Perde parçası: ${fm(x1 - x0)} m · ${mode === 'U' ? 'üst yüz' : mode === 'A' ? 'alt yüz' : 'parça'} ${d >= 0 ? '+' : ''}${fm(d)} m → alt kot ${fm(m.z0)}, üst kot ${fm(m.z0 + m.h)} (h=${fm(m.h)} m). Perde ${C.doc.ents.filter(x => x.type === 'perde' && !x.kicker && (x === e || x === m || x.id > m.id - 3)).length > 1 ? 'parçalara bölündü' : 'güncellendi'}; her parça 3B'de oklarıyla ayrıca düzenlenebilir.`);
  });
  C.addCommand(['PERDEBOL', 'PERDEBOLME', 'BOLPERDE'], 'Perdeyi tıkladığınız noktalardan böler (her parça ayrı perde olur; açıklıklar, perde ayağı ve su tutucu bant parçalarla gider). Mesafe yazarsanız imlece en yakın uçtan ölçülür. Enter: bitir.', async (I) => {
    const e0 = await pickPerde(I, 'Bölünecek perdeye tıklayın'); if (!e0) return; let n = 0;
    const parts = () => C.doc.ents.filter(x => x.type === 'perde' && !x.kicker && (x === e0 || x._bolOf === e0.id));
    for (; ;) {
      E.preview = c => { if (!c) return []; const x = findPerde(c); return x && parts().includes(x) ? vline(x, proj(pathOf(x), c).s, pathOf(x)) : []; };
      E.tagFn = c => { const x = findPerde(c); if (!x || !parts().includes(x)) return ''; const Q = pathOf(x), s = proj(Q, c).s; return `uçlara: ${fm(s)} m · ${fm(Q.Lt - s)} m`; };
      const r = await E.ask('pt', 'Bölme noktası (tıklayın ya da en yakın uçtan mesafe yazın; Enter bitir)', { num: true });
      E.preview = null; E.tagFn = null; if (r == null || r === '') break;
      const c = Array.isArray(r) ? r : C.cmd.cursor; const x = c ? findPerde(c) : e0; const tgt = x && parts().includes(x) ? x : e0, Q = pathOf(tgt);
      let s = Array.isArray(r) ? proj(Q, r).s : (c && proj(Q, c).s > Q.Lt / 2 ? Q.Lt - r : r);
      if (Q.cl) { const pc = splitBy(tgt, [[s, s + Q.Lt]]); pc.forEach(p => { if (p !== e0) p._bolOf = e0.id; }); n++; C.changed(); continue; }
      if (s < 0.01 || s > Q.Lt - 0.01) { C.warn('Uçta bölünmez'); continue; }
      const pc = splitBy(tgt, [[0, s], [s, Q.Lt]]); pc.forEach(p => { if (p !== e0) p._bolOf = e0.id; }); n++; C.changed();
      if (E.scriptMode) break;
    }
    for (const x of C.doc.ents) delete x._bolOf;
    if (n) C.log(`Perde ${n} noktadan bölündü (${n + (pathOf(e0).cl ? 0 : 1)} parça). Her parça 3B'de oklarıyla ya da PERDEPARCA ile ayrı düzenlenebilir.`);;
  });
  /* sağ tık menüsü: perdede "Perde parçası…", çizgide "Bu çizgiden perde" */
  const LINEY = new Set(['line', 'pline', 'arc', 'circle', 'ellipse']);
  { const m0 = C.entMenu; if (m0) C.entMenu = (ent, cx, cy) => { m0(ent, cx, cy);
    if (ent && LINEY.has(ent.type)) { const m = document.querySelector('.rdrop.entm'); if (!m) return; for (const [t, cmd] of [['▦ Çizgiden başka eleman (duvar, kiriş, temel, döşeme…)', 'ELEMANYAP'], ['🧱 Bu çizgiden perde yap…', 'ELEMANYAP TIP=PERDE']]) { const b = document.createElement('button'); b.textContent = t; b.onclick = () => { m.remove(); if (!C.sel.includes(ent)) C.sel = [ent]; C.emit('selection'); C.runTool ? C.runTool(cmd) : C.cmd.run(cmd); }; m.insertBefore(b, m.children[0] || null); } return; }
    if (!ent || ent.type !== 'perde' || ent.kicker) return; const m = document.querySelector('.rdrop.entm'); if (!m) return; for (const [t, cmd] of [['⬇ Perde parçası it / çek…', 'PERDEPARCA'], ['✂ Perdeyi böl…', 'PERDEBOL']]) { const b = document.createElement('button'); b.textContent = t; b.onclick = () => { m.remove(); C.sel = [ent]; C.emit('selection'); C.runTool ? C.runTool(cmd) : C.cmd.run(cmd); }; m.insertBefore(b, m.children[1] || null); } }; }
  /* ---------- PERDE BİRLEŞTİR: uç uca gelen aynı kesitli perdeler tek perde olur (köşede gönye, düz devamda ara çizgi yok) ---------- */
  const nz = v => +(+v || 0).toFixed(4);
  /* açık perdenin yönünü ters çevir: yüzler aynı yerde kalsın */
  const reversed = e => { const j = e.hiza || 'O', g = e.egim || 'R'; return { pts: e.pts.map(q => q.slice()).reverse(), hiza: j === 'L' ? 'R' : j === 'R' ? 'L' : j, egim: g === 'L' ? 'R' : g === 'R' ? 'L' : g, ofs: j === 'L' || j === 'R' ? (+e.ofs || 0) : -(+e.ofs || 0) }; };
  const asOpen = e => isClosed(e) ? null : { pts: e.pts.map(q => q.slice()), hiza: e.hiza || 'O', egim: e.egim || 'R', ofs: +e.ofs || 0 };
  const sameSec = (a, b) => nz(a.z0) === nz(b.z0) && nz(a.h || 3) === nz(b.h || 3) && nz(a.tb || 0.3) === nz(b.tb || 0.3) && nz(a.tt != null && a.tt !== '' ? a.tt : a.tb) === nz(b.tt != null && b.tt !== '' ? b.tt : b.tb) && (a.malz || 'beton') === (b.malz || 'beton') && !a.kicker && !b.kicker && !a.parapet && !b.parapet;
  let curA = null, curB = null; // gerçek yüz konumları karşılaştırılır (hiza ayarı farklı olsa da yüzler aynı yerdeyse birleşir)
  const sameFaces = (A, B, cst) => { if (A.hiza === B.hiza && (cst || A.egim === B.egim) && Math.abs(A.ofs - B.ofs) < 1e-6) return true; const fo = C.insaat && C.insaat.faceOffs; if (!fo || !curA || !curB) return false;
    const FA = fo(Object.assign({}, curA, A, { closed: false })), FB = fo(Object.assign({}, curB, B, { closed: false })); return ['lB', 'rB', 'lT', 'rT'].every(k => Math.abs(FA[k] - FB[k]) < 1e-4); };
  const segCount = pts => pts.length - 1;
  /* a ile b'yi birleştirmeyi dene; olursa a güncellenir, b silinir */
  const mergeTwo = (a, b) => {
    if (!sameSec(a, b)) return false; const A0 = asOpen(a), B0 = asOpen(b); if (!A0 || !B0) return false; curA = a; curB = b;
    const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.01, as = A0.pts[0], ae = A0.pts[A0.pts.length - 1], bs = B0.pts[0], be = B0.pts[B0.pts.length - 1];
    const Brev = reversed(b), nA = segCount(A0.pts), nB = segCount(B0.pts), cst = nz(a.tt != null && a.tt !== '' ? a.tt : a.tb) === nz(a.tb || 0.3);
    let res = null, mapB = null, shiftA = 0;
    if (d(ae, bs) && sameFaces(A0, B0, cst)) { res = { ...A0, pts: A0.pts.concat(B0.pts.slice(1)) }; mapB = (seg, sv, L) => [nA + seg, sv]; }
    else if (d(ae, be) && sameFaces(A0, Brev, cst)) { res = { ...A0, pts: A0.pts.concat(Brev.pts.slice(1)) }; mapB = (seg, sv, L) => [nA + (nB - 1 - seg), L - sv]; }
    else if (d(as, be) && sameFaces(B0, A0, cst)) { res = { ...A0, pts: B0.pts.concat(A0.pts.slice(1)) }; mapB = (seg, sv) => [seg, sv]; shiftA = nB; }
    else if (d(as, bs) && sameFaces(Brev, A0, cst)) { res = { ...A0, pts: Brev.pts.concat(A0.pts.slice(1)) }; mapB = (seg, sv, L) => [nB - 1 - seg, L - sv]; shiftA = nB; }
    if (!res) return false;
    // açıklıklar: a'nınkiler kayar, b'ninkiler a'ya geçer
    const segL = (pts, i) => Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    for (const o of C.doc.ents) { if (o.type !== 'acik') continue; if (o.host === a.id && shiftA) { o.seg = (o.seg || 0) + shiftA; delete o._c; } else if (o.host === b.id) { const [sg, sv] = mapB(o.seg || 0, +o.s || 0, segL(B0.pts, o.seg || 0)); o.host = a.id; o.seg = sg; o.s = +sv.toFixed(4); delete o._c; } }
    // kapandı mı?
    let pts = res.pts, closed = false; if (pts.length > 3 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 0.01) { pts = pts.slice(0, -1); closed = true; }
    // doğrusal ara noktaları at (düz devam eden parçalar tek segment) — açıklık yoksa
    if (!C.doc.ents.some(o => o.type === 'acik' && o.host === a.id)) { const q = []; const n = pts.length; for (let i = 0; i < n; i++) { if (!closed && (i === 0 || i === n - 1)) { q.push(pts[i]); continue; } const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2v = pts[(i + 1) % n], cr = (p1[0] - p0[0]) * (p2v[1] - p1[1]) - (p1[1] - p0[1]) * (p2v[0] - p1[0]), dt = (p1[0] - p0[0]) * (p2v[0] - p1[0]) + (p1[1] - p0[1]) * (p2v[1] - p1[1]); if (Math.abs(cr) < 1e-9 && dt > 0) continue; q.push(p1); } pts = q; }
    a.pts = pts; a.closed = closed; a.egim = res.egim; a.hiza = res.hiza;
    if (closed) { const ccw = M.polyArea(pts) > 0, sh = res.hiza === 'L' ? -res.ofs : res.ofs; a.ofs = +(ccw ? sh : -sh).toFixed(5); } else a.ofs = res.ofs;
    delete a._c; C.remove([b]); return true; };
  C.perdeBirlestir = list => { let ps = list.filter(e => e.type === 'perde' && !e.kicker && C.doc.ents.includes(e)), n = 0, go = true;
    while (go) { go = false; outer: for (let i = 0; i < ps.length; i++) for (let j = 0; j < ps.length; j++) { if (i === j) continue; if (mergeTwo(ps[i], ps[j])) { n++; ps.splice(j, 1); go = true; break outer; } } }
    return { n, kalan: ps }; };
  /* BİRLEŞTİR (UNION): seçimde perde varsa önce perdeler gerçekten tek perde yapılır; diğer 3B nesneler eskisi gibi tek parça olur */
  { const U0 = C.cmds.UNION; if (U0) C.addCommand(U0.names, U0.help + ' Perdeler: uç uca gelen aynı kesitli (kalınlık, yükseklik, kot) perdeler tek perde olur — köşede gönye, düz devamda ara çizgi kalmaz; perdeler grup yapılmaz.', async (I) => {
    let s = await I.sel('Birleştirilecek perdeleri / 3B nesneleri seçin'); if (!s || !s.length) return;
    // daha önce grup yapılmış perdeleri aç
    const out = []; for (const e of s) { if (e.type === 'grup3' && e.parts && e.parts.length && e.parts.every(q => q.type === 'perde')) { for (const q of e.parts) { const o = JSON.parse(JSON.stringify(q)); delete o.id; delete o._c; const x = C.add(C.newEnt('perde', o)); delete x.sp; out.push(x); } C.remove([e]); } else out.push(e); }
    s = out; const ps = s.filter(e => e.type === 'perde' && !e.kicker), others = s.filter(e => !(e.type === 'perde') && (() => { const m = C.meshes(e); return m && m.length; })());
    let msg = [];
    if (ps.length) { const r = C.perdeBirlestir(ps); C.changed(); msg.push(r.n ? `${ps.length} perde → ${r.kalan.length} perde (birleşim çizgisi yok)` : `perdeler birleştirilemedi: uçları değmiyor ya da kalınlık / yükseklik / alt kot / hiza farklı (aynı hizada devam ediyorlarsa yine tek yüzey görünürler)`); C.sel = r.kalan.slice(); C.emit('selection'); }
    if (others.length >= 2) { const parts = others.flatMap(e => e.type === 'grup3' ? e.parts.map(q => JSON.parse(JSON.stringify(q))) : [JSON.parse(JSON.stringify(C.cleanEnt(e)))]); const g = C.newEnt('grup3', { layer: others[0].layer, color: others[0].color, parts }); C.remove(others); C.add(g); C.lastEnt = g; msg.push(`${parts.length} 3B nesne tek parça yapıldı`); }
    if (!ps.length && others.length < 2) { C.warn('En az iki 3B nesne seçin (çizgi ve yazılar birleştirilmez).'); return; }
    C.log('Birleştir: ' + msg.join(' · '));
  }, U0.opts); }
})(window.C);

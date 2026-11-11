/* ArıtmaCAD — KORKULUK (yürüyüş yolu, platform, havuz kenarı, döşeme kenarı)
   Merdiven korkuluğuyla aynı yapı ve malzemeler: küpeşte (110 cm), ara küpeşte, dikmeler, 15 cm tekmelik.
   Yerleştirme: (1) döşeme kenarlarını seç, (2) noktalarla yol çiz. Merdiven korkuluğunun ucuna 60 cm'den yakınsa tam o noktaya bağlanır
   (küpeşteler aynı kotta birleşir, merdivenin üst küpeşte uzatması kaldırılır).
   korkuluk nesnesi: { pts: [x,y,z] (yürüme yüzeyi kotunda), km, kh, dik, tk, kapali } */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, P, TX } = C.prim, cm = v => v / 100;
  const I_ = () => C._ins, K = () => C._mrd;
  const buildMesh = e => {
    const out = I_().newMesh(), km = (K().KM[e.km] || K().KM.galvaniz)[1], q = e.pts.map(M.p3), n = q.length; let len = 0;
    const segN = e.kapali && n > 2 ? n : n - 1;
    for (let i = 0; i < segN; i++) { const a = q[i], b = q[(i + 1) % n]; len += K().railRun(out, [a[0], a[1]], [b[0], b[1]], a[2], b[2], e, km, Math.abs(b[2] - a[2]) > 1e-3); }
    e._len = len; return out;
  };
  T.korkuluk = {
    label: 'Korkuluk', ifc: 'IfcRailing',
    prims: e => { const q = e.pts.map(p => [p[0], p[1], 0]), out = [P(q, !!e.kapali, { lw: 25 })]; const sp = Math.max(0.5, cm(+e.dik || 150)); for (let i = 0; i + 1 < q.length + (e.kapali ? 1 : 0); i++) { const a = q[i], b = q[(i + 1) % q.length], l = M.dist2(a, b), nP = Math.max(1, Math.ceil(l / sp)); for (let k = 0; k <= nP; k++) { const p = M.lerp(a, b, k / nP); out.push(P([[p[0] - 0.03, p[1] - 0.03, 0], [p[0] + 0.03, p[1] - 0.03, 0], [p[0] + 0.03, p[1] + 0.03, 0], [p[0] - 0.03, p[1] + 0.03, 0]], true, { lw: 13 })); } } return out; },
    mesh: e => [buildMesh(e)],
    xf: (e, X) => { e.pts = e.pts.map(p => { const r = X.p(M.p3(p)); return [r[0], r[1], r[2] != null ? r[2] : (p[2] || 0)]; }); delete e._c; },
    snaps: e => e.pts.map(p => ({ p: M.p3(p), k: 'end' })),
    info: e => { if (e._len == null) { try { C.meshes(e); } catch (er) { } } return `Korkuluk · ${(K().KM[e.km] || K().KM.galvaniz)[0]} · h=${+e.kh || 110} cm · dikme aralığı ${+e.dik || 150} cm · ${e.tk === 'H' ? 'tekmeliksiz' : '15 cm tekmelik'} · boy ${M.fmt(e._len || 0, 2)} m`; },
  };
  /* merdiven korkuluk uçlarına bağlan */
  const stairEnds = () => { const out = []; for (const m of C.doc.ents) if (m.type === 'merdiven' && C.merdivenRailEnds) for (const r of C.merdivenRailEnds(m)) out.push(Object.assign({ m }, r)); return out; };
  const joinStairs = (pts, tol = 0.6) => {
    const ends = stairEnds(); if (!ends.length || pts.length < 2) return { pts, n: 0 }; let n = 0; const q = pts.map(M.p3);
    const used = new Set(), pick = p => { let best = null, bd = tol; for (const r of ends) { if (used.has(r)) continue; const d = Math.hypot(r.p[0] - p[0], r.p[1] - p[1]); if (d < bd && Math.abs(r.p[2] - p[2]) < 0.25) { bd = d; best = r; } } if (best) used.add(best); return best ? { r: best, d: bd } : null; };
    const A = pick(q[0]), B = pick(q[q.length - 1]); // uçlar değişmeden önce ikisi de bulunur
    for (const [hit, atEnd] of [[B, true], [A, false]]) { if (!hit) continue; const rp = [hit.r.p[0], hit.r.p[1], hit.r.p[2]], k = atEnd ? q.length - 1 : 0; if (hit.d < 0.12) q[k] = rp; else if (atEnd) q.push(rp); else q.unshift(rp); if (hit.r.end === 'ust') { hit.r.m.uzTopOff = true; delete hit.r.m._c; } n++; }
    return { pts: q, n };
  };
  /* döşeme kenarları: zincirler (seçilen kenarlar ardışıksa tek korkuluk) */
  const slabChains = (pl, sel, ins) => {
    const q = pl.pts.map(p => [p[0], p[1]]), N = q.length, ccw = M.polyArea(q) >= 0, z = +pl.zt || 0;
    const inner = i => { const a = q[i], b = q[(i + 1) % N], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], n = ccw ? [-u[1], u[0]] : [u[1], -u[0]]; return { a: [a[0] + n[0] * ins, a[1] + n[1] * ins], b: [b[0] + n[0] * ins, b[1] + n[1] * ins] }; };
    const lx = (A, B, Cc, D) => { const r = [B[0] - A[0], B[1] - A[1]], s = [D[0] - Cc[0], D[1] - Cc[1]], den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-9) return null; const t = ((Cc[0] - A[0]) * s[1] - (Cc[1] - A[1]) * s[0]) / den; return [A[0] + r[0] * t, A[1] + r[1] * t]; };
    const on = new Set(sel), chains = []; if (on.size === N) { const pts = []; for (let i = 0; i < N; i++) { const e1 = inner((i - 1 + N) % N), e2 = inner(i); pts.push(lx(e1.a, e1.b, e2.a, e2.b) || e2.a); } return [{ pts: pts.map(p => [p[0], p[1], z]), kapali: true }]; }
    let start = [...on].find(i => !on.has((i - 1 + N) % N)); const seen = new Set();
    for (let guard = 0; guard < N && start != null; guard++) {
      const pts = []; let i = start; const first = inner(i); pts.push(first.a);
      while (on.has(i) && !seen.has(i)) { seen.add(i); const cur = inner(i), nx = (i + 1) % N; if (on.has(nx) && !seen.has(nx)) { const e2 = inner(nx); pts.push(lx(cur.a, cur.b, e2.a, e2.b) || cur.b); i = nx; } else { pts.push(cur.b); break; } }
      chains.push({ pts: pts.map(p => [p[0], p[1], z]), kapali: false });
      start = [...on].find(j => !seen.has(j) && !on.has((j - 1 + N) % N)); if (start == null) start = [...on].find(j => !seen.has(j));
    }
    return chains;
  };
  const FIELDS = [
    { k: 'yer', t: 'Yerleştirme', opts: [['kenar', 'Döşeme kenarlarını seç (yürüyüş yolu / platform)'], ['yol', 'Noktalarla çiz (3B\'de yüzeye tıklayın)']], d: 'kenar', al: ['YER'] },
    { k: 'km', t: 'Malzeme', opts: [], d: 'galvaniz', al: ['KM'] }, { k: 'kh', t: 'Yükseklik (cm)', d: 110, al: ['KH'] },
    { k: 'dik', t: 'Dikme aralığı (cm)', d: 150, al: ['DIK'] }, { k: 'tk', t: 'Tekmelik (15 cm)', opts: [['E', 'Var'], ['H', 'Yok']], d: 'E', al: ['TK'] },
    { k: 'ic', t: 'Kenardan içeri (cm)', d: 5, al: ['IC'] }, { k: 'bag', t: 'Merdiven korkuluğuna bağla (60 cm içindeyse)', opts: [['E', 'Evet'], ['H', 'Hayır']], d: 'E', al: ['BAG'] },
  ];
  C.addCommand(['KORKULUK', 'RAILING', 'PARMAKLIK'], 'Korkuluk (yürüyüş yolu, platform, havuz / döşeme kenarı): döşeme kenarlarını seçin ya da noktalarla çizin. Galvaniz / paslanmaz / CTP …, 110 cm küpeşte, ara küpeşte, dikmeler, 15 cm tekmelik. Merdiven korkuluğunun ucuna yakınsa tam birleşir.', async (I) => {
    FIELDS[1].opts = Object.entries(K().KM).map(([k, v]) => [k, v[0]]);
    const r = await I_().getParams('Korkuluk', FIELDS, 'korkuluk'); if (!r) return;
    const pr = { km: r.km, kh: +r.kh || 110, dik: +r.dik || 150, tk: r.tk, layer: 'INS_MERDIVEN' }; C.ensureLayer('INS_MERDIVEN', 30, 'CONTINUOUS', 25);
    const made = [];
    const finish = (pts, kapali) => { let J = { pts, n: 0 }; if (r.bag !== 'H' && !kapali) J = joinStairs(pts); const e = C.add(C.newEnt('korkuluk', Object.assign({ pts: J.pts, kapali: !!kapali }, pr))); delete e.sp; made.push(e); return J.n; };
    let joined = 0;
    if (r.yer === 'kenar') {
      const p = await I.pt('Korkuluk yapılacak döşemeye tıklayın (yürüyüş yolu / platform)'); if (!p || typeof p === 'string') return;
      const cand = C.doc.ents.filter(x => x.type === 'plak' && C.pointInPoly([p[0], p[1]], x.pts)); const pl = cand.sort((a, b) => Math.abs((+a.zt || 0) - (p[2] || 0)) - Math.abs((+b.zt || 0) - (p[2] || 0)))[0]; if (!pl) { C.warn('Burada döşeme yok.'); return; }
      const q = pl.pts, N = q.length, sel = new Set();
      const edgeAt = c => { let bi = -1, bd = Infinity; for (let i = 0; i < N; i++) { const a = q[i], b = q[(i + 1) % N], v = [b[0] - a[0], b[1] - a[1]], l2 = v[0] * v[0] + v[1] * v[1]; let t = ((c[0] - a[0]) * v[0] + (c[1] - a[1]) * v[1]) / (l2 || 1); t = Math.max(0, Math.min(1, t)); const d = Math.hypot(a[0] + v[0] * t - c[0], a[1] + v[1] * t - c[1]); if (d < bd) { bd = d; bi = i; } } return bi; };
      const ins = cm(+r.ic || 5);
      E.preview = c => { const hi = c ? edgeAt(c) : -1, out = []; const zt = +pl.zt || 0; for (let i = 0; i < N; i++) { const a = q[i], b = q[(i + 1) % N]; if (sel.has(i) || i === hi) out.push(L([a[0], a[1], zt], [b[0], b[1], zt], { color: sel.has(i) ? 3 : 2, lw: 50 })); } return out; };
      for (; ;) { const c = await E.ask('pt', `Korkuluk olacak kenarlara tıklayın (seçili: ${sel.size}; tekrar tıklamak kaldırır) — T = tüm kenarlar, Enter = bitir`, { kw: [['T', 'TUMU', 'TÜMÜ']] });
        if (c === 'T') { for (let i = 0; i < N; i++) sel.add(i); break; } if (!Array.isArray(c)) break; const i = edgeAt(c); if (sel.has(i)) sel.delete(i); else sel.add(i); if (E.scriptMode && !E.queue.length) break; }
      E.preview = null; if (!sel.size) return;
      for (const ch of slabChains(pl, [...sel], ins)) joined += finish(ch.pts, ch.kapali);
    } else {
      const pts = [];
      for (; ;) { E.base = pts.length ? pts[pts.length - 1] : null; E.preview = pts.length ? (c => [P(pts.concat([M.p3(c)]), false, { lw: 25 })]) : null;
        const c = await E.ask('pt', pts.length ? 'Sonraki nokta (Enter bitir, G geri al)' : 'Korkuluk başlangıcı (yürüme yüzeyine tıklayın; merdiven korkuluğu ucuna yakalanır)', { kw: pts.length ? [['G', 'Geri al']] : [] });
        E.preview = null; E.base = null; if (c === 'G') { pts.pop(); continue; } if (!Array.isArray(c)) break; pts.push(M.p3(c)); if (E.scriptMode && !E.queue.length) break; }
      if (pts.length < 2) return; joined += finish(pts, false);
    }
    C.changed(); C.sel = made.slice(); C.emit('selection');
    C.log(`${made.length} korkuluk oluşturuldu${joined ? ` · ${joined} uç merdiven korkuluğuna bağlandı (küpeşteler birleşti)` : ''}. ${made.length ? T.korkuluk.info(made[0]) : ''}`);
  });
  if (C.PROPFIELDS) C.PROPFIELDS.korkuluk = [['km', 'Malzeme (galvaniz / paslanmaz / paslanmaz316 / ctp_sari / ctp_gri / ctp_yesil / boyali / boyali_sari / aluminyum / ahsap)', 's'], ['kh', 'Yükseklik (cm)'], ['dik', 'Dikme aralığı (cm)'], ['tk', 'Tekmelik (E / H)', 's']];
})(window.C);

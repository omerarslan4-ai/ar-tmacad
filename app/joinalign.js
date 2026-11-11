/* ArıtmaCAD — JOIN (BAGLA) ve ALIGN (AutoCAD gibi)
   JOIN: aynı doğru üzerindeki çizgiler tek çizgi, aynı çemberdeki yaylar tek yay (tamamlanırsa daire),
         uç uca gelen çizgi/yay/çoklu çizgiler tek çoklu çizgi (yaylar yaylı segment olarak korunur).
   ALIGN: 1 nokta çifti = taşı, 2 çift = taşı + döndür (+ isteğe bağlı ölçekle). */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, TAU = Math.PI * 2, RAD = Math.PI / 180;
  const props = e => ({ layer: e.layer, color: e.color, lt: e.lt, lw: e.lw });
  const near = (a, b, t) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= t;

  /* ---------- JOIN ---------- */
  const mergeLines = (lines, tol) => { // aynı doğru üzerindeki, değen/çakışan çizgiler
    const out = [], used = new Set();
    for (const a of lines) {
      if (used.has(a)) continue; used.add(a);
      const d = M.norm([a.b[0] - a.a[0], a.b[1] - a.a[1], 0]); let t0 = 0, t1 = M.dist2(a.a, a.b); const grp = [a];
      let grew = true;
      while (grew) {
        grew = false;
        for (const b of lines) {
          if (used.has(b)) continue; const d2 = M.norm([b.b[0] - b.a[0], b.b[1] - b.a[1], 0]);
          if (Math.abs(d[0] * d2[1] - d[1] * d2[0]) > 1e-7) continue;
          const off = q => Math.abs((q[0] - a.a[0]) * d[1] - (q[1] - a.a[1]) * d[0]); if (off(b.a) > tol || off(b.b) > tol) continue;
          const pa = (b.a[0] - a.a[0]) * d[0] + (b.a[1] - a.a[1]) * d[1], pb = (b.b[0] - a.a[0]) * d[0] + (b.b[1] - a.a[1]) * d[1];
          const lo = Math.min(pa, pb), hi = Math.max(pa, pb); if (lo > t1 + tol || hi < t0 - tol) continue;
          t0 = Math.min(t0, lo); t1 = Math.max(t1, hi); used.add(b); grp.push(b); grew = true;
        }
      }
      if (grp.length > 1) { const z = a.a[2] || 0; out.push({ grp, a: [a.a[0] + d[0] * t0, a.a[1] + d[1] * t0, z], b: [a.a[0] + d[0] * t1, a.a[1] + d[1] * t1, z] }); }
    }
    return out;
  };
  const mergeArcs = (arcs, tol) => {
    const out = [], used = new Set();
    for (const a of arcs) {
      if (used.has(a)) continue; used.add(a);
      let s = a.a0 * RAD, sw = M.normAng(a.a1 * RAD - s) || TAU; const grp = [a]; let grew = true;
      while (grew && sw < TAU - 1e-9) {
        grew = false;
        for (const b of arcs) {
          if (used.has(b) || !near(a.c, b.c, tol) || Math.abs(a.r - b.r) > tol) continue;
          const bs = b.a0 * RAD, bsw = M.normAng(b.a1 * RAD - bs) || TAU, et = tol / a.r;
          const rel = M.normAng(bs - s); // b'nin başlangıcı a aralığında mı (ya da a'nın sonuna değiyor mu)
          if (rel <= sw + et) { sw = Math.max(sw, rel + bsw); }
          else { const rel2 = M.normAng(s - bs); if (rel2 <= bsw + et) { s = bs; sw = Math.max(bsw, rel2 + sw); } else continue; }
          used.add(b); grp.push(b); grew = true; if (sw >= TAU - et) { sw = TAU; break; }
        }
      }
      if (grp.length > 1) out.push({ grp, c: a.c, r: a.r, s, sw });
    }
    return out;
  };
  const toPiece = e => {
    if (e.type === 'line') return { e, pts: [M.p3(e.a), M.p3(e.b)], bul: [0] };
    if (e.type === 'arc') { const s = e.a0 * RAD, sw = M.normAng(e.a1 * RAD - s) || TAU; return { e, pts: [M.polar(e.c, s, e.r), M.polar(e.c, s + sw, e.r)].map(M.p3), bul: [Math.tan(sw / 4)] }; }
    if (e.type === 'pline' && !e.closed && e.pts.length >= 2) return { e, pts: e.pts.map(M.p3), bul: e.pts.slice(0, -1).map((_, i) => (e.bul && e.bul[i]) || 0) };
    return null;
  };
  const rev = p => ({ e: p.e, pts: p.pts.slice().reverse(), bul: p.bul.slice().reverse().map(b => -b) });
  C.joinEnts = (ents, tol = 1e-4) => {
    let made = 0, removed = 0; const res = [];
    const lines = ents.filter(e => e.type === 'line'), arcs = ents.filter(e => e.type === 'arc');
    for (const g of mergeLines(lines, tol)) { const n = C.newEnt('line', Object.assign(props(g.grp[0]), { a: g.a, b: g.b })); C.remove(g.grp); C.add(n); res.push(n); made++; removed += g.grp.length; }
    for (const g of mergeArcs(arcs, tol)) { const n = g.sw >= TAU - 1e-9 ? C.newEnt('circle', Object.assign(props(g.grp[0]), { c: M.p3(g.c), r: g.r })) : C.newEnt('arc', Object.assign(props(g.grp[0]), { c: M.p3(g.c), r: g.r, a0: ((g.s / RAD) % 360 + 360) % 360, a1: (((g.s + g.sw) / RAD) % 360 + 360) % 360 })); C.remove(g.grp); C.add(n); res.push(n); made++; removed += g.grp.length; }
    // uç uca zincir
    const pool = C.doc.ents.filter(e => (ents.includes(e) || res.includes(e))).map(toPiece).filter(Boolean);
    const used = new Set();
    for (const p0 of pool) {
      if (used.has(p0)) continue; used.add(p0); let ch = { pts: p0.pts.slice(), bul: p0.bul.slice() }; const grp = [p0.e];
      for (const atEnd of [true, false]) {
        for (; ;) {
          const end = atEnd ? ch.pts[ch.pts.length - 1] : ch.pts[0]; if (grp.length > 1 && near(ch.pts[0], ch.pts[ch.pts.length - 1], tol)) break;
          let found = null;
          for (const q of pool) { if (used.has(q)) continue; if (near(q.pts[0], end, tol)) { found = atEnd ? q : rev(q); break; } if (near(q.pts[q.pts.length - 1], end, tol)) { found = atEnd ? rev(q) : q; break; } }
          if (!found) break; used.add(pool.find(q => q.e === found.e)); grp.push(found.e);
          if (atEnd) { ch.pts.push(...found.pts.slice(1)); ch.bul.push(...found.bul); } else { ch.pts = found.pts.slice(0, -1).concat(ch.pts); ch.bul = found.bul.concat(ch.bul); }
        }
      }
      if (grp.length < 2) continue;
      let closed = false; if (near(ch.pts[0], ch.pts[ch.pts.length - 1], tol) && ch.pts.length > 2) { ch.pts.pop(); closed = true; } else ch.bul.push(0);
      const z = ch.pts[0][2] || 0, base = grp.find(e => e.type === 'pline') || grp[0];
      const n = C.newEnt('pline', Object.assign(props(base), { pts: ch.pts.map(p => [p[0], p[1], z]), closed }));
      if (ch.bul.some(b => Math.abs(b) > 1e-12)) n.bul = ch.bul;
      C.remove(grp); C.add(n); made++; removed += grp.length;
    }
    return { made, removed };
  };
  C.addCommand(['JOIN', 'J', 'BAGLA', 'CIZGIBIRLESTIR'], 'Birleştir (AutoCAD JOIN): aynı doğrudaki çizgiler tek çizgi, aynı çemberdeki yaylar tek yay/daire, uç uca gelen çizgi-yay-çoklu çizgiler tek çoklu çizgi olur. T = tolerans (uçlar arası boşluk)', async (I) => {
    let tol = C.joinTol || 1e-4;
    if (E.queue[0] && /^T$/i.test(E.queue[0])) { E.queue.shift(); tol = C.joinTol = Math.max(0, await I.num('Birleştirme toleransı (m)', tol) || 0) || 1e-6; }
    const s = (await I.sel('Birleştirilecek nesneleri seçin (çizgi, yay, açık çoklu çizgi)')).filter(e => ['line', 'arc', 'pline'].includes(e.type));
    if (s.length < 2) { C.warn('En az iki çizgi/yay/çoklu çizgi seçin'); return; }
    const r = C.joinEnts(s, tol);
    if (!r.made) C.warn(`Birleşecek nesne bulunamadı (uçlar ${tol} m'den yakın değil ya da aynı doğru/çember üzerinde değiller). Tolerans için: JOIN T`);
    else C.log(`${r.removed} nesne ${r.made} nesneye birleştirildi.`);
  });

  /* ---------- ALIGN ---------- */
  const ghost = (sel, X) => sel.slice(0, 300).flatMap(e => { const c = JSON.parse(JSON.stringify(C.cleanEnt(e))); C.xform(c, X); try { return C.T[c.type].prims(c); } catch (err) { return []; } });
  const xAlign = (s1, d1, ang, sc) => { const c = Math.cos(ang) * sc, sn = Math.sin(ang) * sc; return C.makeX(q => [d1[0] + (q[0] - s1[0]) * c - (q[1] - s1[1]) * sn, d1[1] + (q[0] - s1[0]) * sn + (q[1] - s1[1]) * c], [c, sn, -sn, c], (d1[2] || 0) - (s1[2] || 0)); };
  C.addCommand(['ALIGN', 'AL', 'HIZAYLA', 'YERLESTIR'], 'Hizala (AutoCAD ALIGN): nesneleri seçin; 1. kaynak → 1. hedef noktası (taşır), 2. kaynak → 2. hedef (döndürür), Enter; isteğe bağlı ölçekleme', async (I) => {
    const sel = await I.sel('Hizalanacak nesneleri seçin'); if (!sel.length) return;
    const s1 = await I.pt('1. kaynak noktası'); if (!s1 || typeof s1 === 'string') return;
    E.base = s1; E.preview = q => ghost(sel, xAlign(s1, q, 0, 1));
    const d1 = await I.pt('1. hedef noktası'); E.preview = null; if (!d1 || typeof d1 === 'string') return;
    E.base = null;
    const s2 = await I.pt('2. kaynak noktası (Enter = yalnız taşı)');
    if (!s2 || typeof s2 === 'string') { const X = xAlign(s1, d1, 0, 1); sel.forEach(e => C.xform(e, X)); C.changed(); C.log(`${sel.length} nesne taşındı.`); return; }
    const a0 = M.ang(s1, s2), L0 = M.dist2(s1, s2); if (L0 < 1e-12) { C.warn('Kaynak noktaları aynı'); return; }
    E.base = d1; E.preview = q => M.dist2(d1, q) > 1e-12 ? ghost(sel, xAlign(s1, d1, M.ang(d1, q) - a0, 1)) : [];
    const d2 = await I.pt('2. hedef noktası'); E.preview = null; E.base = null; if (!d2 || typeof d2 === 'string') return;
    const s3 = await I.pt('3. kaynak noktası (Enter = devam)'); if (s3 && typeof s3 !== 'string') { await I.pt('3. hedef noktası'); C.log('Not: plan çiziminde 3. nokta çifti dikkate alınmaz (3B eğme yapılmaz); 2 çifte göre hizalandı.'); }
    const sc = await I.kw('Hizalama noktalarına göre ölçeklensin mi?', [['H', 'Hayır'], ['E', 'Evet']], 'H');
    const f = sc === 'E' ? M.dist2(d1, d2) / L0 : 1, ang = M.ang(d1, d2) - a0, X = xAlign(s1, d1, ang, f);
    sel.forEach(e => C.xform(e, X)); C.changed();
    C.log(`${sel.length} nesne hizalandı: dönme ${M.fmt(M.deg(ang), 3)}°${f !== 1 ? `, ölçek ${M.fmt(f, 4)}` : ''}.`);
  });
})(window.C);

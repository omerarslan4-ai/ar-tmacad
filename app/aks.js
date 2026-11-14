/* ArıtmaCAD — AKS sistemi: aks çizgileri + balonlar (1,2,3… / A,B,C…) + otomatik zincir ve toplam ölçüler
   AKS: nesnelerden otomatik (duvar/havuz/çizgi çiftlerinin orta çizgileri) ya da aralık girerek. Açıklama nesnesi: balon/ölçü boyu pafta ölçeğine göre. */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, { L, CI, TX } = C.prim, RAD = Math.PI / 180;
  const deg0 = e => e.rot || 0;
  const letters = i => { let s = '', n = i; do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0); return s; };
  const parseSp = str => { const out = []; for (const t of String(str || '').replace(/,/g, ' ').split(/\s+/).filter(Boolean)) { const m = /^(\d+)\*([\d.]+)$/.exec(t); if (m) for (let i = 0; i < +m[1]; i++) out.push(+m[2]); else if (+t > 0) out.push(+t); } return out; };
  const toPos = sp => { const p = [0]; for (const s of sp) p.push(+(p[p.length - 1] + s).toFixed(6)); return p; };
  const spTxt = pos => pos.slice(1).map((v, i) => +(v - pos[i]).toFixed(4)).join(' ');
  C.T.aks = {
    label: 'Aks sistemi',
    prims: e => {
      const k = C.doc.set.anno / 1000, r = (e.bp || 4) * k, ext = (e.extp || 22) * k, rot = (e.rot || 0) * RAD, cs = Math.cos(rot), sn = Math.sin(rot);
      const W = (x, y) => [e.o[0] + x * cs - y * sn, e.o[1] + x * sn + y * cs, 0];
      const xs = e.xs || [0], ys = e.ys || [0], x0 = xs[0], x1 = xs[xs.length - 1], y0 = ys[0], y1 = ys[ys.length - 1], out = [];
      const ax = { lt: 'CENTER' }, th = e.thp ? e.thp * k : r * 1.0, dcol = (C.doc.layers.OLCU && C.doc.layers.OLCU.color) || 3;
      const lab = (i, isX) => C.aksLabel(e, i, isX);
      if (e.sec) { // kesit / görünüşteki akslar: düşey çizgiler + üstte balon + zincir ölçü
        const yb = ys[0], yt = ys[ys.length - 1], dcol2 = dcol;
        xs.forEach((x, i) => { out.push(L(W(x, yb - ext * 0.3), W(x, yt + ext), ax)); const c = W(x, yt + ext + r); out.push(CI(c, r), TX(c, th, (e.lx && e.lx[i]) || String(i + 1), 0, 'MC')); });
        if (e.dims !== false && xs.length > 1) { for (let i = 1; i < xs.length; i++) { try { out.push(...C.T.dim.prims({ type: 'dim', k: 'rot', ang: deg0(e), a: W(xs[i - 1], yt), b: W(xs[i], yt), p: W(xs[i - 1], yt + ext * 0.45), layer: e.layer }).map(pr => Object.assign(pr, { color: pr.color != null ? pr.color : dcol2, lt: 'CONTINUOUS' }))); } catch (err) { } } }
        return out;
      }
      /* extK: kenar kenar uzatma (mm; ALT / UST / SOL / SAG) — MIMARIPAFTA balonu her kenarda en dış ölçü sırasının dışına koyar */
      const eK = kn => (e.extK && e.extK[kn] != null ? e.extK[kn] * k : ext), eA = eK('ALT'), eU = eK('UST'), eS = eK('SOL'), eG = eK('SAG');
      xs.forEach((x, i) => {
        out.push(L(W(x, y0 - eA), W(x, y1 + eU), ax));
        for (const end of e.both === false ? [-1] : [-1, 1]) { const c = W(x, end < 0 ? y0 - eA - r : y1 + eU + r); out.push(CI(c, r), TX(c, th, lab(i, true), 0, 'MC')); }
      });
      ys.forEach((y, i) => {
        out.push(L(W(x0 - eS, y), W(x1 + eG, y), ax));
        for (const end of e.both === false ? [-1] : [-1, 1]) { const c = W(end < 0 ? x0 - eS - r : x1 + eG + r, y); out.push(CI(c, r), TX(c, th, lab(i, false), 0, 'MC')); }
      });
      if (e.dims !== false) { // zincir + toplam ölçü (alt ve sol)
        const dim = (a, b, p, ang) => { try { return C.T.dim.prims({ type: 'dim', k: 'rot', ang, a, b, p, layer: e.layer }).map(pr => Object.assign(pr, { color: pr.color != null ? pr.color : dcol, lt: 'CONTINUOUS' })); } catch (err) { return []; } };
        const deg = e.rot || 0, yc = y0 - ext * 0.38, yt = y0 - ext * 0.72, xc = x0 - ext * 0.38, xt = x0 - ext * 0.72;
        if (xs.length > 1) { for (let i = 1; i < xs.length; i++) out.push(...dim(W(xs[i - 1], y0), W(xs[i], y0), W(xs[i - 1], yc), deg)); if (xs.length > 2) out.push(...dim(W(x0, y0), W(x1, y0), W(x0, yt), deg)); }
        if (ys.length > 1) { for (let i = 1; i < ys.length; i++) out.push(...dim(W(x0, ys[i - 1]), W(x0, ys[i]), W(xc, ys[i - 1]), deg + 90)); if (ys.length > 2) out.push(...dim(W(x0, y0), W(x0, y1), W(xt, y0), deg + 90)); }
      }
      return out;
    },
    xf: (e, X) => { e.o = X.p(e.o).slice(0, 2); const v = X.v([Math.cos((e.rot || 0) * RAD), Math.sin((e.rot || 0) * RAD), 0]); e.rot = Math.atan2(v[1], v[0]) / RAD; if (X.s !== 1) { e.xs = e.xs.map(q => q * X.s); e.ys = e.ys.map(q => q * X.s); } C.aksSync(e); },
    snaps: e => { const rot = (e.rot || 0) * RAD, cs = Math.cos(rot), sn = Math.sin(rot), out = []; for (const x of e.xs) for (const y of e.ys) out.push({ p: [e.o[0] + x * cs - y * sn, e.o[1] + x * sn + y * cs, 0], k: 'int' }); return out; },
    info: e => e.sec ? `kesitte ${e.xs.length} aks (${(e.lx || []).join(', ')})` : `${e.xs.length} × ${e.ys.length} aks · X: ${e.xsS} · Y: ${e.ysS}`,
  };
  if (C.ANNO_TYPES) C.ANNO_TYPES.add('aks');
  /* aks çizgileri (dünya koordinatında): {p: çizgi üzerinde nokta, d: doğrultu, lab} */
  /* yTers: Y doğrultusundaki akslar yukarıdan aşağıya adlanır (A en üstte) — Çokal ve Konya planlarındaki gibi (MIMARIPAFTA'nın türettiği aks) */
  C.aksLabel = (e, i, isX) => { const xl = e.xl || 'num', j = !isX && e.yTers ? (e.ys || [0]).length - 1 - i : i; return isX ? (xl === 'num' ? String(j + 1) : letters(j)) : (xl === 'num' ? letters(j) : String(j + 1)); };
  C.aksLines = e => {
    if (e.sec) return [];
    const rot = (e.rot || 0) * RAD, cs = Math.cos(rot), sn = Math.sin(rot), W = (x, y) => [e.o[0] + x * cs - y * sn, e.o[1] + x * sn + y * cs], out = [];
    (e.xs || []).forEach((x, i) => out.push({ p: W(x, 0), d: [-sn, cs], lab: C.aksLabel(e, i, true) }));
    (e.ys || []).forEach((y, i) => out.push({ p: W(0, y), d: [cs, sn], lab: C.aksLabel(e, i, false) }));
    return out;
  };
  C.aksAll = () => C.doc.ents.filter(e => e.type === 'aks' && !e.gv && !e.sec && C.layer(e.layer).on);
  /* kesit çizgisi (a, u birim) boyunca aksların kesişim konumları: [{s, lab}] */
  C.aksOnLine = (a, u, s0, s1) => {
    const out = [];
    for (const e of C.aksAll()) for (const l of C.aksLines(e)) {
      const den = u[0] * l.d[1] - u[1] * l.d[0]; if (Math.abs(den) < 0.2) continue; // kesite (neredeyse) paralel akslar atlanır
      const t = ((l.p[0] - a[0]) * l.d[1] - (l.p[1] - a[1]) * l.d[0]) / den; if (t < s0 - 1e-6 || t > s1 + 1e-6) continue;
      if (!out.some(q => Math.abs(q.s - t) < 1e-4)) out.push({ s: t, lab: l.lab });
    }
    return out.sort((p, q) => p.s - q.s);
  };
  /* kesit / görünüş için aks nesnesi ekle: W = (u,v)->dünya, pos = [{s, lab}], v0..v1 yükseklik aralığı */
  C.aksAddSection = (pos, v0, v1, W, props) => {
    if (!pos.length) return null; C.ensureLayer('AKS', 1, 'CENTER', 18);
    const o = W([pos[0].s, 0]);
    const AK = C.pstil && C.pstil() && C.cizimKural && C.cizimKural.MIMARI && C.cizimKural.MIMARI.aks, bal = AK ? { bp: AK.balonR, thp: AK.yaziMm } : { bp: 4 }; // pafta stilinde balon ölçüsü kural tablosundan (Çokal: yarıçap 6 mm, harf 5 mm)
    return C.add(C.newEnt('aks', Object.assign({ sec: true, o: [o[0], o[1]], xs: pos.map(p => +(p.s - pos[0].s).toFixed(6)), ys: [v0, v1], lx: pos.map(p => p.lab), rot: 0, extp: 14, dims: true, layer: 'AKS' }, bal, props || {})));
  };
  C.aksSync = e => { e.xsS = spTxt(e.xs); e.ysS = spTxt(e.ys); return e; };
  C.aksSet = (e, k, v) => { const sp = parseSp(v); if (k === 'xsS') e.xs = toPos(sp); else e.ys = toPos(sp); C.aksSync(e); delete e._c; };

  /* nesnelerden aks konumları: eksene paralel kenarlar; birbirine yakın paralel çiftlerin (duvar) ortası */
  C.aksFromEnts = (ents, maxT = 0.8) => {
    const V = [], H = [];
    for (const e of ents) {
      if (e.type === 'wall' && e.a && e.b) { const dx = e.b[0] - e.a[0], dy = e.b[1] - e.a[1], l = Math.hypot(dx, dy); if (l < 1e-6) continue; if (Math.abs(dx) / l < 1e-3) V.push({ c: (e.a[0] + e.b[0]) / 2, lo: Math.min(e.a[1], e.b[1]), hi: Math.max(e.a[1], e.b[1]), w: true }); else if (Math.abs(dy) / l < 1e-3) H.push({ c: (e.a[1] + e.b[1]) / 2, lo: Math.min(e.a[0], e.b[0]), hi: Math.max(e.a[0], e.b[0]), w: true }); continue; }
      let prs; try { prs = C.prims(e); } catch (err) { continue; }
      for (const pr of prs) if (!(pr.lt && pr.lt !== 'CONTINUOUS' && pr.lt !== 'BYLAYER') && pr.k !== 'T') for (const [a, b] of C.primSegs(pr)) { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); if (l < 0.2) continue; if (Math.abs(dx) / l < 1e-4) V.push({ c: (a[0] + b[0]) / 2, lo: Math.min(a[1], b[1]), hi: Math.max(a[1], b[1]) }); else if (Math.abs(dy) / l < 1e-4) H.push({ c: (a[1] + b[1]) / 2, lo: Math.min(a[0], b[0]), hi: Math.max(a[0], b[0]) }); }
    }
    const axesOf = segs => {
      const walls = segs.filter(s => s.w).map(s => s.c), rest = segs.filter(s => !s.w).sort((a, b) => a.c - b.c), used = new Set(), mids = [];
      for (let i = 0; i < rest.length; i++) { if (used.has(i)) continue; let best = -1, bd = Infinity; for (let j = i + 1; j < rest.length && rest[j].c - rest[i].c <= maxT; j++) { if (used.has(j) || rest[j].c - rest[i].c < 0.05) continue; const ov = Math.min(rest[i].hi, rest[j].hi) - Math.max(rest[i].lo, rest[j].lo); if (ov > 0.5 * Math.min(rest[i].hi - rest[i].lo, rest[j].hi - rest[j].lo) && rest[j].c - rest[i].c < bd) { bd = rest[j].c - rest[i].c; best = j; } } if (best >= 0) { used.add(i); used.add(best); mids.push((rest[i].c + rest[best].c) / 2); } }
      let cs = walls.concat(mids); if (!cs.length) cs = rest.map(s => s.c);
      cs.sort((a, b) => a - b); const grp = []; for (const c of cs) { const g = grp[grp.length - 1]; if (g && c - g[g.length - 1] <= maxT * 0.9) g.push(c); else grp.push([c]); } return grp.map(g => +(g.reduce((a, b) => a + b, 0) / g.length).toFixed(4));
    };
    return { xs: axesOf(V), ys: axesOf(H) };
  };

  C.addCommand(['AKS', 'AKSAT', 'GRIDLINE', 'AKSLAR'], 'Aks sistemi: N = seçilen nesnelerden otomatik (duvar/havuz orta çizgileri), A = aralık girerek (ör. X: 5 5 4 ya da 3*5, Y: 6 6). Aks balonları (1,2,3 / A,B,C) ve zincir + toplam ölçüler otomatik; açıklama ölçeğine göre boyutlanır.', async (I) => {
    const mode = await I.kw('Aks', [['N', 'Nesnelerden otomatik'], ['A', 'Aralık gir']], C.sel.length ? 'N' : 'A'); if (!mode) return;
    let o, xs, ys;
    if (mode === 'N') {
      const s = await I.sel('Akslanacak nesneleri seçin (duvar, havuz, yapı çizgileri)'); if (!s.length) return;
      const r = C.aksFromEnts(s); if (r.xs.length < 1 || r.ys.length < 1) { C.warn('Yatay/düşey yapı kenarı bulunamadı; A ile aralık girin.'); return; }
      o = [r.xs[0], r.ys[0]]; xs = r.xs.map(v => +(v - r.xs[0]).toFixed(4)); ys = r.ys.map(v => +(v - r.ys[0]).toFixed(4));
    } else {
      const p = await I.pt('Aks başlangıç noktası (1-A kesişimi)'); if (!p || typeof p === 'string') return; o = [p[0], p[1]];
      xs = toPos(parseSp(await I.str('X yönü aks aralıkları (m) — ör. 5 5 4 ya da 3*5', '5 5 5', { whole: false }) || '5'));
      ys = toPos(parseSp(await I.str('Y yönü aks aralıkları (m)', '6 6', { whole: false }) || '6'));
    }
    C.std('EKSEN'); C.ensureLayer('AKS', 1, 'CENTER', 18);
    const e = C.add(C.newEnt('aks', C.aksSync({ o, xs, ys, rot: 0, bp: 4, extp: 22, dims: true, both: true, xl: 'num', layer: 'AKS' })));
    C.log(`Aks sistemi: ${xs.length} × ${ys.length} aks (X: ${e.xsS} · Y: ${e.ysS}). Aralıkları Özellikler'den değiştirebilirsiniz; ölçüler kendini günceller. Aks kesişimleri yakalanır.`);
  });
})(window.C);

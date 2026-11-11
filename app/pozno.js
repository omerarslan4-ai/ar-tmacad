/* ArıtmaCAD — MEKANİK POZ NUMARALARI: tüm mekanik ekipmana (borular, ek parçalar, vanalar, pompalar, 3B ekipmanlar) liste ile aynı poz numarası
   pozno nesnesi: { p (gösterilen nokta), q (balon merkezi), n (numara), ref (eleman id) } — balon + kılavuz çizgisi, açıklama ölçeğinde
   POZNO: numaraları hesaplar, plandaki tüm mekanik elemanlara balon koyar (öncekileri yeniler); E = elle (elemana tıkla, balon yeri tıkla)
   KESITAL: kesitte görünen mekanik elemanlara da aynı numaralı balon konur (KESITAL POZ=H ile kapatılır). BORULISTE ve tablo aynı numaraları kullanır. */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, CI, TX } = C.prim;
  const MEKTUR = new Set(['Pompa', 'Dalgıç pompa', 'Blower / kompresör', 'Mikser', 'Difüzör', 'Sıyırıcı / köprü', 'Izgara / elek', 'Vana', 'Dozaj / kimyasal', 'Dekantör / susuzlaştırma', 'Tank / depo', 'Vinç / kaldırma', 'Ölçüm / enstrüman', 'Diğer ekipman', 'Ekipman']);
  const isMek = e => { if (!e || !C.layer(e.layer).on) return false; if (['pipe', 'fit', 'fit3', 'valve', 'pump', 'izgara'].includes(e.type)) return true; if (e.type === 'blk') { const d = (C.doc.blocks || {})[e.ref] || {}; return !!(d.mek || MEKTUR.has(d.tur) || MEKTUR.has(e.tur) || /^FIT_/.test(String(e.ref))); } return false; };
  C.isMekanik = isMek;
  /* mekanik liste: satırlar + eleman → poz */
  C.mekPozListe = () => {
    const ents = C.doc.ents.filter(isMek), rows = C.bom ? C.bom(ents) : []; rows.forEach((r, i) => r.poz = i + 1);
    const byMal = new Map(rows.map(r => [r.mal, r.poz])), pozOf = new Map();
    for (const e of ents) { let rs = []; try { rs = C.bom([e]); } catch (er) { } const r = rs.find(x => x.unit === 'm') || rs.find(x => !/^(Conta|Cıvata)/.test(x.mal)) || rs[0]; if (r && byMal.has(r.mal)) pozOf.set(e.id, byMal.get(r.mal)); }
    return { rows, pozOf };
  };
  /* ---------- balon nesnesi ---------- */
  /* balon merkezi: off (kağıt mm) varsa ölçeğe göre — paftada her pencere ölçeğinde balon boyu da konumu da aynı kalır */
  const qOf = e => e.off ? [e.p[0] + C.annoH(e.off[0]), e.p[1] + C.annoH(e.off[1]), 0] : M.p3(e.q);
  C.pozQ = qOf;
  T.pozno = {
    label: 'Poz numarası',
    prims: e => { const R = C.annoH(3.2), p = M.p3(e.p), q = qOf(e), d = M.sub(p, q), l = M.len([d[0], d[1], 0]), out = [CI(q, R, { lw: 25 }), TX([q[0], q[1], q[2]], C.annoH(3.4), String(e.n), 0, 'MC')];
      if (l > R * 1.05) { const s = M.add(q, M.mul([d[0] / l, d[1] / l, 0], R)); out.push(L(s, p, { lw: 18 }), CI(p, R * 0.12, { lw: 25 })); } return out; },
    snaps: e => [{ p: qOf(e), k: 'cen' }],
    xf: (e, X) => { e.p = X.p(e.p); if (e.p0) { const t = X.p([e.p0[0], e.p0[1], 0]); e.p0 = [t[0], t[1]]; } if (!e.off) e.q = X.p(e.q); else e.q = qOf(e); },
    info: e => `Poz ${e.n}${e.ref && C.byId(e.ref) ? ' → ' + C.describe(C.byId(e.ref)) : ''}`,
  };
  if (C.ANNO_TYPES) C.ANNO_TYPES.add('pozno');
  if (C.PROPFIELDS) C.PROPFIELDS.pozno = [['n', 'Numara', 's']];
  /* elemanın planda gösterilecek noktası */
  const anchorOf = e => {
    if (e.type === 'pipe' && e.pts && e.pts.length > 1) { let best = null, bl = -1; for (let i = 1; i < e.pts.length; i++) { const a = M.p3(e.pts[i - 1]), b = M.p3(e.pts[i]), l = M.dist2(a, b); if (l > bl) { bl = l; best = [a, b]; } } return M.lerp(best[0], best[1], 0.5); }
    if (e.type === 'fit3' && C.fit3Ports) { const ps = C.fit3Ports(e).map(q => q.p); return ps.reduce((s, q) => M.add(s, q), [0, 0, 0]).map(v => v / ps.length); }
    if (e.p) return M.p3(e.p);
    const b = C.bbox(e); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2, 0];
  };
  C.pozAnchor = anchorOf;
  const LAY = 'MEK_POZ';
  /* yerleştirme: aday konumlar (kağıt mm) — başka balonlarla ve kılavuzlarla çakışmayan ilk konum */
  const CAND = []; for (const r of [10, 14, 19, 25, 32, 40]) for (let k = 0; k < 16; k++) { const a = Math.PI / 4 + k * Math.PI / 8; CAND.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const segHit = (a, b, c, R) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(a[0] + dx * t - c[0], a[1] + dy * t - c[1]) < R; };
  const segX = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b); };
  const place = (p, n, ref, extra, used) => {
    C.ensureLayer(LAY, 2, 'CONTINUOUS', 18); const k = C.annoH(1), R = 3.2 * k; let best = CAND[0];
    if (used) {
      const pen = c => { const q = [p[0] + c[0] * k, p[1] + c[1] * k]; let v = 0; for (const u of used) { if (M.dist2(u.q, q) < 2 * R + k * 1.2) v += 1000; if (segHit(u.p, u.q, q, R * 1.05)) v += 100; if (segHit(p, q, u.q, R * 1.05)) v += 100; if (segX(p, q, u.p, u.q)) v += 10; } return v; };
      let bp = Infinity; for (const c of CAND) { const v = pen(c); if (v < bp) { bp = v; best = c; if (!v) break; } }
    }
    let off = [+best[0].toFixed(2), +best[1].toFixed(2)], pp = [p[0], p[1], 0];
    const lay = (extra && extra.layer) || LAY, kk = keyOf(lay, ref, p), kept = KEEP.get(kk); // elle taşınmış balon: yenilenince yerini korusun
    if (kept) { off = kept.off.slice(); if (kept.p) pp = kept.p.slice(); }
    const e = C.add(C.newEnt('pozno', Object.assign({ p: pp, off, n, ref, layer: LAY }, extra || {}, { p0: [p[0], p[1]] }))); if (kept) e.man = true; e.q = qOf(e); delete e.sp; if (used) used.push({ p: [pp[0], pp[1]], q: e.q }); return e;
  };
  C.pozBalon = place;
  /* ---------- AutoCAD çok-kılavuzlu (MLEADER) gibi tutamaçlar ----------
     balon tutamacı: balonu istenen yere çeker, kılavuz çizgisi uzar/kısalır; ok tutamacı: kılavuzun ucunu taşır (balon yerinde kalır) */
  const KEEP = new Map(), keyOf = (lay, ref, p) => `${lay}|${ref}|${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
  const setQ = (x, Q) => { const k = C.annoH(1); if (x.off || !x.q) x.off = [+((Q[0] - x.p[0]) / k).toFixed(3), +((Q[1] - x.p[1]) / k).toFixed(3)]; x.q = [Q[0], Q[1], 0]; x.man = true; delete x._c; };
  { const g0 = C.gripsOf; if (g0) C.gripsOf = e => { if (e.type !== 'pozno') return g0(e); const q = qOf(e), p = M.p3(e.p);
    return [{ p: q, k: 'end', set: (x, Q) => setQ(x, Q) }, { p, k: 'end', set: (x, P) => { const q0 = qOf(x); x.p = [P[0], P[1], 0]; setQ(x, q0); } }]; }; }
  { const rm0 = C.remove; C.remove = function (list) { for (const e of list || []) if (e && e.type === 'pozno' && e.man && e.p0) KEEP.set(keyOf(e.layer, e.ref, e.p0), { off: e.off ? e.off.slice() : [(e.q[0] - e.p[0]) / C.annoH(1), (e.q[1] - e.p[1]) / C.annoH(1)], p: M.dist2(e.p, e.p0) > 1e-6 ? M.p3(e.p) : null }); return rm0.apply(this, arguments); }; }
  C.addCommand(['POZNO', 'EKIPMANNO', 'NUMARALA', 'BALON'], 'Mekanik poz numaraları: tüm borulara, ek parçalara, vanalara, pompalara ve 3B ekipmanlara malzeme listesindeki (BORULISTE) poz numarasıyla balon koyar. T = tümü (plandaki önceki otomatik balonları yeniler), E = elle (elemana tıkla, balon yerine tıkla), S = yalnız numaraları listele.', async (I) => {
    const { rows, pozOf } = C.mekPozListe(); if (!rows.length) { C.warn('Çizimde mekanik eleman (boru, ek parça, vana, pompa, ekipman) yok.'); return; }
    for (const e of C.doc.ents) if (pozOf.has(e.id)) e.poz = pozOf.get(e.id);
    const m = await I.kw('Numaralama', [['T', 'Tüm mekanik elemanlar (otomatik)'], ['E', 'Elle (tek tek)'], ['S', 'Yalnız liste']], 'T'); if (!m) return;
    if (m === 'S') { rows.forEach(r => C.log(`${r.poz}. ${r.mal} — ${r.unit === 'm' ? M.fmt(r.q, 2) : r.q} ${r.unit}`)); return; }
    if (m === 'T') {
      C.remove(C.doc.ents.filter(x => x.type === 'pozno' && x.auto && !x.sec));
      const used = []; let n = 0;
      for (const e of C.doc.ents.filter(isMek)) { const no = pozOf.get(e.id); if (!no) continue; place(anchorOf(e), no, e.id, { auto: true }, used); n++; } // üst üste binmesin
      C.changed(); C.log(`${n} mekanik elemana poz numarası kondu (${rows.length} kalem). Balonları sürükleyip taşıyabilirsiniz; liste: BORULISTE.`); return;
    }
    for (; ;) {
      const p = await I.pt('Numaralanacak elemana tıklayın (Enter bitir)'); if (!p || typeof p === 'string') break;
      let best = null, bd = Infinity; for (const e of C.doc.ents) { if (!isMek(e) || !pozOf.has(e.id)) continue; let d = Infinity; try { d = C.entDist(e, p); } catch (er) { } if (d < bd) { bd = d; best = e; } }
      if (!best || bd > C.annoH(10)) { C.warn('Yakında mekanik eleman yok.'); continue; }
      E.base = p; const q = await I.pt(`Poz ${pozOf.get(best.id)} — balon yeri`); E.base = null; if (!q || typeof q === 'string') break;
      C.ensureLayer(LAY, 2, 'CONTINUOUS', 18); const k1 = C.annoH(1); const b = C.add(C.newEnt('pozno', { p: [p[0], p[1], 0], off: [+((q[0] - p[0]) / k1).toFixed(2), +((q[1] - p[1]) / k1).toFixed(2)], n: pozOf.get(best.id), ref: best.id, layer: LAY })); b.q = qOf(b); delete b.sp; C.changed();
    }
  });
  /* liste komutları aynı numaralamayı kullansın */
  const bl = C.cmds.BORULISTE;
  if (bl) C.addCommand(bl.names, bl.help + ' Numaralar POZNO balonlarıyla aynıdır.', async (I) => {
    const { rows, pozOf } = C.mekPozListe(); if (!rows.length) { C.warn('Çizimde mekanik eleman yok.'); return; }
    for (const e of C.doc.ents) if (pozOf.has(e.id)) e.poz = pozOf.get(e.id);
    C._bomRows = rows; rows.forEach(r => C.log(`${String(r.poz).padStart(2)}  ${r.mal}  ${r.unit === 'm' ? M.fmt(r.q, 2) : r.q} ${r.unit}`));
    if (C.showBom && !E.scriptMode) { C.showBom(rows); return; }
    const p = await I.pt('Tablonun sol üst köşesi (Enter = yalnız liste)'); if (p && typeof p !== 'string') C.bomTable(rows, p);
  });
  /* şerit */
  const p0 = C.borulamaPanel;
  if (p0) { C.borulamaPanel = () => { const pn = p0(); if (!pn[1].some(x => x.cmd === 'POZNO')) pn[1].splice(3, 0, { cmd: 'POZNO', t: 'Poz numarası', i: 'dot', big: true }); return pn; }; setTimeout(() => { if (C.ekipmanRefresh) C.ekipmanRefresh(); }, 0); }
})(window.C);

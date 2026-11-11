/* ArıtmaCAD — KESİT DÜZLEMİ (AutoCAD SECTIONPLANE / Revit kesit kutusu gibi)
   3B'de modeli canlı keser: düzlemin önündeki kısım gizlenir, kesilen yüzeyler kırmızı kapakla dolar.
   kduzlem nesnesi: { m: 'D' (düşey) | 'Y' (yatay), a, b: düzlem izi (plan), n: bakış yönü (düşeyde), h: kot (yatayda), on: etkin, ad }
   Komutlar: KESITDUZLEMI (oluştur / aç / kapat), KDKESIT (düzlemden 2B kesit ya da kot planı üret) */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, P, TX, S } = C.prim;
  const planes = () => C.doc ? C.doc.ents.filter(e => e.type === 'kduzlem') : [];
  const isOn = e => e.on === true || /^(true|evet|e|1|açık|acik)$/i.test(String(e.on));
  C.activeSectionPlane = () => planes().find(e => isOn(e) && C.layer(e.layer).on) || null;

  /* çizgiye bağlı düzlem: çizgi değişince (taşı, döndür, tutamaç) düzlem de ona dik kalacak şekilde güncellenir */
  const refSeg = e => {
    const r = e.ref != null ? C.byId(e.ref) : null; if (!r) return null;
    if (r.type === 'line') return [M.p3(r.a), M.p3(r.b)];
    if (r.type === 'pline' && r.pts.length > 1) { const i = Math.max(0, Math.min(r.pts.length - (r.closed ? 1 : 2), e.seg || 0)); return [M.p3(r.pts[i]), M.p3(r.pts[(i + 1) % r.pts.length])]; }
    return null;
  };
  const syncRef = e => {
    if (e.ref == null) return false; const sg = refSeg(e); if (!sg) { delete e.ref; return false; }
    const [a, b] = sg; if (M.dist2(a, b) < 1e-9) return false;
    if (e.a && M.dist2(e.a, a) < 1e-9 && M.dist2(e.b, b) < 1e-9) return false;
    const u = M.norm([b[0] - a[0], b[1] - a[1], 0]); let n = [-u[1], u[0]]; if (e.n && n[0] * e.n[0] + n[1] * e.n[1] < 0) n = [-n[0], -n[1]];
    e.a = a; e.b = b; e.n = n; delete e._c; return true;
  };
  C.on('change', () => { for (const e of planes()) { syncRef(e); if (e.ref != null || e.on) delete e._c; } });
  T.kduzlem = {
    label: 'Kesit düzlemi',
    prims: e => {
      const th = C.annoH(3), out = [];
      if (e.m === 'Y') { const c = e.a || [0, 0]; out.push(TX([c[0], c[1], 0], th, `${e.ad || 'KD'} yatay kesit düzlemi ${(e.h >= 0 ? '+' : '') + (+e.h).toFixed(2)}${e.on ? ' (etkin)' : ''}`, 0, 'L')); return out; }
      const a = M.p3(e.a), b = M.p3(e.b), n = [e.n[0], e.n[1], 0], l = th * 2.2;
      out.push(L(a, b, { lt: 'PHANTOM', lw: e.on ? 50 : 25 }));
      { const bb = C.extents(C.doc.ents.filter(x => x.type !== 'kduzlem')); if (bb) { const u = M.norm(M.sub(b, a)), R = Math.hypot(bb[2] - bb[0], bb[3] - bb[1]) + Math.max(M.dist2(a, bb), M.dist2(a, [bb[2], bb[3]])); out.push(L(a, M.sub(a, M.mul(u, R)), { lt: 'DASHED', lw: 13 }), L(b, M.add(b, M.mul(u, R)), { lt: 'DASHED', lw: 13 })); } } // düzlem sınırsız: iz model boyunca uzar
      for (const p of [a, b]) { const q = M.add(p, M.mul(n, l)); out.push(L(p, q, { lw: 35 })); const u = M.norm(M.sub(b, a)), w = th * 0.5; out.push(S([M.add(q, M.mul(n, th * 0.9)), M.add(q, M.mul(u, w)), M.sub(q, M.mul(u, w))])); out.push(TX(M.add(p, M.mul(n, -th * 1.2)), th, e.ad || 'KD', 0, 'MC')); }
      return out;
    },
    xf: (e, X) => { if (e.a) e.a = X.p(M.p3(e.a)); if (e.b) e.b = X.p(M.p3(e.b)); if (e.n) { const v = X.v([e.n[0], e.n[1], 0]), l = Math.hypot(v[0], v[1]) || 1; e.n = [v[0] / l, v[1] / l]; } },
    snaps: e => e.m === 'Y' ? [] : [{ p: M.p3(e.a), k: 'end' }, { p: M.p3(e.b), k: 'end' }],
    info: e => e.m === 'Y' ? `yatay kesit düzlemi, kot ${(+e.h).toFixed(2)} · ${e.on ? 'etkin' : 'kapalı'}` : `düşey kesit düzlemi ${e.ad || ''}${e.ref != null ? ' · çizgiye bağlı (#' + e.ref + ')' : ''} · sınırsız · ${e.on ? 'etkin (3B kesiliyor)' : 'kapalı'}`,
  };
  /* tutamaçlar: uçlar ve orta (taşı) */
  { const g0 = C.gripsOf; if (g0) C.gripsOf = e => { if (e.type !== 'kduzlem' || e.m === 'Y') return g0(e); const G = [], add = (p, k, set) => G.push({ p: M.p3(p), k, set }); add(e.a, 'end', (x, q) => { x.a = M.p3(q); delete x.ref; }); add(e.b, 'end', (x, q) => { x.b = M.p3(q); delete x.ref; }); add(M.lerp(M.p3(e.a), M.p3(e.b), 0.5), 'move', (x, q, d) => C.xform(x, C.xMove([d[0], d[1], 0]))); return G; }; }

  /* görünüm için: kesme denklemi, kesit kapakları, çerçeve (o: sahne merkezi) */
  C.sectionPlaneGeom = (kp, o) => {
    const ents = C.doc.ents.filter(e => C.layer(e.layer).on && e.type !== 'kduzlem' && (!C.in3D || C.in3D(e)));
    let eq, toUV, toW, dist;
    if (kp.m === 'Y') {
      const h = +kp.h || 0; eq = [0, 0, -1, h]; // z <= h kalır
      dist = p => h - p[2]; toUV = p => [p[0], p[1]]; toW = q => [q[0], q[1], h];
    } else {
      const a = M.p3(kp.a), b = M.p3(kp.b), u = M.norm([b[0] - a[0], b[1] - a[1], 0]), n = [kp.n[0], kp.n[1], 0];
      eq = [n[0], n[1], 0, -(n[0] * (a[0] - o[0]) + n[1] * (a[1] - o[1]))]; // bakış yönündeki kısım kalır
      dist = p => (p[0] - a[0]) * n[0] + (p[1] - a[1]) * n[1]; toUV = p => [(p[0] - a[0]) * u[0] + (p[1] - a[1]) * u[1], p[2]]; toW = q => [a[0] + u[0] * q[0], a[1] + u[1] * q[0], q[1]];
    }
    const cut = [];
    let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
    for (const e of ents) {
      const t = C.entTris(e); if (!t || !t.pos.length) continue; const Pp = t.pos, conc = !(e.type === 'arazi' || e.type === 'kazi');
      for (let i = 0; i < Pp.length; i += 9) {
        const v3 = [[Pp[i], Pp[i + 1], Pp[i + 2]], [Pp[i + 3], Pp[i + 4], Pp[i + 5]], [Pp[i + 6], Pp[i + 7], Pp[i + 8]]];
        for (const q of v3) { const uv = toUV(q); lo = [Math.min(lo[0], uv[0]), Math.min(lo[1], uv[1])]; hi = [Math.max(hi[0], uv[0]), Math.max(hi[1], uv[1])]; }
        const d = v3.map(dist); if ((d[0] > 0 && d[1] > 0 && d[2] > 0) || (d[0] < 0 && d[1] < 0 && d[2] < 0)) continue;
        const pts = []; for (const [x, y] of [[0, 1], [1, 2], [2, 0]]) if ((d[x] < 0) !== (d[y] < 0) && d[x] !== d[y]) { const s = d[x] / (d[x] - d[y]); pts.push(toUV(M.lerp(v3[x], v3[y], s))); }
        if (pts.length === 2 && Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]) > 1e-6) { pts.g = e.id; pts.conc = conc; pts.terr = !conc; cut.push(pts); }
      }
    }
    const cap = [], frame = [], RED = [0.80, 0.27, 0.22], EQ = [0.86, 0.55, 0.20], SOIL = [0.55, 0.40, 0.27];
    const P3 = q => { const w = toW(q); return [w[0] - o[0], w[1] - o[1], w[2]]; };
    const nn = kp.m === 'Y' ? [0, 0, 1] : [-kp.n[0], -kp.n[1], 0];
    if (cut.length && C.sectionMerge) {
      const R = C.sectionMerge(cut, []);
      const fillLoops = (loops, col) => {
        const outers = loops.filter(lp => M.polyArea(lp) > 0), holes = loops.filter(lp => M.polyArea(lp) < 0);
        for (const ou of outers) {
          const hs = holes.filter(h => C.pointInPoly(h[0], ou));
          let r; try { r = C.earClipHoles(ou, hs); } catch (err) { continue; }
          for (const t of r.tris) for (const k of t) { const w = P3(r.pts[k]); cap.push(w[0], w[1], w[2], nn[0], nn[1], nn[2], col[0], col[1], col[2]); }
          for (const lp of [ou, ...hs]) for (let i = 0; i < lp.length; i++) { const a = P3(lp[i]), b = P3(lp[(i + 1) % lp.length]); frame.push(...a, 0, 0, 1, 0.35, 0.05, 0.05, ...b, 0, 0, 1, 0.35, 0.05, 0.05); }
        }
      };
      fillLoops(R.loops, RED); fillLoops(R.equip, EQ);
      for (const pl of R.open) for (let i = 1; i < pl.length; i++) { const a = P3(pl[i - 1]), b = P3(pl[i]); frame.push(...a, 0, 0, 1, ...SOIL, ...b, 0, 0, 1, ...SOIL); }
    }
    // düzlem çerçevesi (modelin bu düzlemdeki sınırları, biraz taşkın)
    if (lo[0] < Infinity) { const m = Math.max(hi[0] - lo[0], hi[1] - lo[1]) * 0.6 + 2, c4 = [[lo[0] - m, lo[1] - m], [hi[0] + m, lo[1] - m], [hi[0] + m, hi[1] + m], [lo[0] - m, hi[1] + m]].map(P3), FC = [0.35, 0.75, 1]; for (let i = 0; i < 4; i++) frame.push(...c4[i], 0, 0, 1, ...FC, ...c4[(i + 1) % 4], 0, 0, 1, ...FC); }
    return { eq, cap, frame };
  };

  let seq = 1;
  const nextName = () => { const used = new Set(planes().map(e => e.ad)); let s; do { s = 'KD' + seq++; } while (used.has(s)); return s; };
  const activate = e => { for (const x of planes()) { x.on = x === e; delete x._c; } };
  C.addCommand(['KESITDUZLEMI', 'SECTIONPLANE', 'KDUZLEM', 'KESITPLANI3B'], '3B kesit düzlemi: modeli canlı keser, kesilen yüzeyler kırmızı görünür. D = düşey (iki nokta + bakış yönü), Y = yatay (kot), K = kesmeyi kapat, A = son düzlemi aç, S = düzlemi sil. Düzlemi plandan tutamaçlarla taşıyabilir, KDKESIT ile 2B kesit/plan üretebilirsiniz.', async (I) => {
    const pre = (C.sel || []).find(x => x.type === 'line' || x.type === 'pline');
    const op = await I.kw('Kesit düzlemi', [['N', 'Çizgiye dik (çizgi seç)'], ['D', 'Düşey (iki nokta)'], ['Y', 'Yatay (kot)'], ['K', 'Kesmeyi kapat'], ['A', 'Düzlemi aç'], ['S', 'Sil']], pre ? 'N' : 'D'); if (!op) return;
    if (op === 'N') {
      let ln = pre, seg = 0, pk = null;
      if (!ln || E.scriptMode) { pk = await I.pt('Kesit düzleminin dik duracağı çizgiyi seçin'); if (!pk || typeof pk === 'string') return; ln = C.pickAt(pk); if (!ln || (ln.type !== 'line' && ln.type !== 'pline')) { C.warn('Çizgi ya da çoklu çizgi seçin.'); return; } }
      if (ln.type === 'pline') { const q = pk || ln.pts[0]; let bd = Infinity; for (let i = 0; i < ln.pts.length - (ln.closed ? 0 : 1); i++) { const d = M.segDist(q, ln.pts[i], ln.pts[(i + 1) % ln.pts.length]); if (d < bd) { bd = d; seg = i; } } }
      const tmp = { ref: ln.id, seg }, sg = refSeg(tmp), u = M.norm([sg[1][0] - sg[0][0], sg[1][1] - sg[0][1], 0]);
      E.preview = c => { let n = [-u[1], u[0]]; if ((c[0] - sg[0][0]) * n[0] + (c[1] - sg[0][1]) * n[1] < 0) n = [-n[0], -n[1]]; const m = M.lerp(sg[0], sg[1], 0.5), L0 = M.dist2(sg[0], sg[1]) * 0.2; return [L(m, [m[0] + n[0] * L0, m[1] + n[1] * L0, 0])]; };
      const sp = await I.pt('Bakış yönü (görülecek taraf)'); E.preview = null; if (!sp || typeof sp === 'string') return;
      let n = [-u[1], u[0]]; if ((sp[0] - sg[0][0]) * n[0] + (sp[1] - sg[0][1]) * n[1] < 0) n = [-n[0], -n[1]];
      C.ensureLayer('KESIT_DUZLEMI', 4, 'CONTINUOUS', 25);
      const e = C.add(C.newEnt('kduzlem', { m: 'D', a: sg[0], b: sg[1], n, ref: ln.id, seg, ad: nextName(), on: true, layer: 'KESIT_DUZLEMI' })); delete e.sp; delete e.gv;
      activate(e); C.changed();
      C.log(`${e.ad}: çizgiye dik, sınırsız düşey kesit düzlemi. Çizgiyi taşıyınca / döndürünce / tutamacından çekince düzlem de onunla birlikte döner ve kayar.`);
      if (C.currentView !== '3d' && C.setView && !E.scriptMode) C.setView('3d');
      return;
    }
    if (op === 'K') { for (const x of planes()) { x.on = false; delete x._c; } C.changed(); C.log('3B kesme kapatıldı (düzlemler duruyor; A ile açılır).'); return; }
    if (op === 'A' || op === 'S') {
      const ps = planes(); if (!ps.length) { C.warn('Kesit düzlemi yok.'); return; }
      let e = ps[ps.length - 1];
      if (ps.length > 1) { const nm = C.up(await I.str(`Düzlem adı (${ps.map(x => x.ad).join(', ')})`, e.ad, { whole: false }) || e.ad); e = ps.find(x => C.up(x.ad) === nm) || e; }
      if (op === 'S') { C.remove([e]); C.log(`${e.ad} silindi.`); } else { activate(e); C.changed(); C.log(`${e.ad} etkin: 3B model kesiliyor.`); }
      return;
    }
    let ent;
    if (op === 'Y') {
      const h = await I.num('Yatay kesit kotu (m)', 1.2); if (h == null) return;
      const bb = C.extents(C.doc.ents.filter(e => e.type !== 'kduzlem')) || [0, 0, 10, 10];
      ent = { m: 'Y', h, a: [bb[0], bb[3] + C.annoH(8), 0] };
    } else {
      const a = await I.pt('Kesit düzleminin 1. noktası (plan izinde)'); if (!a || typeof a === 'string') return;
      E.base = a; const b = await I.pt('2. nokta'); E.base = null; if (!b || typeof b === 'string') return;
      const u = M.norm([b[0] - a[0], b[1] - a[1], 0]); if (!isFinite(u[0])) return;
      E.preview = c => { let n = [-u[1], u[0]]; if ((c[0] - a[0]) * n[0] + (c[1] - a[1]) * n[1] < 0) n = [-n[0], -n[1]]; const m = M.lerp(a, b, 0.5), L0 = M.dist2(a, b) * 0.15; return [L(a, b, { lt: 'PHANTOM' }), L(m, [m[0] + n[0] * L0, m[1] + n[1] * L0, 0])]; };
      const sp = await I.pt('Bakış yönü (görülecek taraf)'); E.preview = null; if (!sp || typeof sp === 'string') return;
      let n = [-u[1], u[0]]; if ((sp[0] - a[0]) * n[0] + (sp[1] - a[1]) * n[1] < 0) n = [-n[0], -n[1]];
      ent = { m: 'D', a: M.p3(a), b: M.p3(b), n };
    }
    C.ensureLayer('KESIT_DUZLEMI', 4, 'CONTINUOUS', 25);
    const e = C.add(C.newEnt('kduzlem', Object.assign(ent, { ad: nextName(), on: true, layer: 'KESIT_DUZLEMI' }))); delete e.sp; delete e.gv;
    activate(e); C.changed();
    C.log(`${e.ad} oluşturuldu ve etkin: 3B sekmesinde model bu düzlemden kesilmiş görünür (kırmızı = kesilen yapı). Planda tutamaçlarla kaydırabilirsiniz. 2B kesit/plan için: KDKESIT · kapatmak için: KESITDUZLEMI K.`);
    if (C.currentView !== '3d' && C.setView && !E.scriptMode) C.setView('3d');
  });
  C.addCommand(['KDKESIT', 'SECTIONPLANETOSECTION', 'DUZLEMDENKESIT'], 'Etkin (ya da seçilen) kesit düzleminden 2B kesit (düşey düzlem → KESITAL) ya da kot planı (yatay düzlem → KOTPLANI) üretir', async (I) => {
    let e = C.activeSectionPlane() || planes().slice(-1)[0]; if (!e) { C.warn('Kesit düzlemi yok (KESITDUZLEMI).'); return; }
    const f = v => (+v).toFixed(4);
    if (e.m === 'Y') { if (C.setView) C.setView('plan'); setTimeout(() => C.cmd.run(`KOTPLANI ${f(e.h)}`), 0); return; }
    let a = M.p3(e.a), b = M.p3(e.b); const u = M.norm(M.sub(b, a)), bb = C.extents(C.doc.ents.filter(x => x.type !== 'kduzlem' && x.type !== 'sheet'));
    if (bb) { const ts = [[bb[0], bb[1]], [bb[2], bb[1]], [bb[2], bb[3]], [bb[0], bb[3]]].map(q => (q[0] - a[0]) * u[0] + (q[1] - a[1]) * u[1]); const t0 = Math.min(0, ...ts) - 1, t1 = Math.max(M.dist2(a, b), ...ts) + 1, a0 = a; a = M.add(a0, M.mul(u, t0)); b = M.add(a0, M.mul(u, t1)); } // sınırsız düzlem: model boyunca
    const m = M.lerp(a, b, 0.5), sp = [m[0] + e.n[0], m[1] + e.n[1]];
    if (C.setView) C.setView('plan');
    setTimeout(() => C.cmd.run(`KESITAL ${f(a[0])},${f(a[1])} ${f(b[0])},${f(b[1])} ${f(sp[0])},${f(sp[1])}`), 0);
  });
})(window.C);

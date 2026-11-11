/* ArıtmaCAD — 2B PLAN + KESİTLERDEN 3B MODEL (KESIT3B / 2B3B)
   Çizimdeki plan ve kesitleri başlıklarından bulur ("-8.30 ELEVATION PLAN", "SECTION A-A", "KESİT B-B", "… KOTU PLANI"):
   • planlar aks balonlarıyla (1, 2 … / A, B …) üst üste oturtulur,
   • kesit çizgileri plandaki harflerden (A … A), kesitin yatay ölçeği aks balonlarından, düşey ölçeği kot işaretlerinden okunur,
   • betonarme = dolu (SOLID) tarama; plandaki her nokta için o noktaya plan üzerinden "aynı bölgeden" (duvar içinden ya da oda içinden)
     ulaşılabilen en yakın kesit seçilir ve o kesitteki düşey betonarme aralıkları alınır,
   • sonuç katmanlara ayrılır: perde, kolon, radye, döşeme, grobeton (düzenlenebilir ArıtmaCAD elemanları).
   Panel: 2B3B — çizim ekle (DXF / DWG), bulunan plan / kesitleri gözden geçir, 3B oluştur. */
(function (C) {
  'use strict';
  const M = C.M;
  const K = C.k3 = {};
  /* ---------------- yardımcılar ---------------- */
  const txtOf = e => String(e.s || '').replace(/\\[A-Za-z][^;\\]*;/g, '').replace(/\\P/g, ' ').replace(/[{}]/g, '').replace(/%%[uUoOcCdDpP]/g, '').replace(/\s+/g, ' ').trim();
  const upTR = s => String(s).toLocaleUpperCase('tr-TR').replace(/İ/g, 'I');
  const kotVal = s => { const m = /^(±|\+|-|−)?\s*(\d{1,4}[.,]\d{2,3})$/.exec(String(s).trim()); if (!m) return null; const v = parseFloat(m[2].replace(',', '.')); return m[1] === '-' || m[1] === '−' ? -v : v; };
  const bbOf = e => { try { return C.bbox(e); } catch (er) { return null; } };
  const inW = (p, w) => p[0] >= w[0] && p[0] <= w[2] && p[1] >= w[1] && p[1] <= w[3];
  const bIn = (b, w) => b && b[0] >= w[0] && b[2] <= w[2] && b[1] >= w[1] && b[3] <= w[3];
  const grow = (b, d) => [b[0] - d, b[1] - d, b[2] + d, b[3] + d];
  const uni = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
  const median = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
  const NOT_STRUCT = /MEK|MECH|EQUIP|EKIPMAN|BORU|PIPE|VANA|VALVE|KOT|YAZI|TEXT|ANNO|DIM|OLCU|MOBIL|FURN|ELEK|ELEC/i;

  /* ---------------- 1. çizimleri bul ---------------- */
  K.defaults = () => ({ betonLay: null, betonPat: 'SOLID', groLay: /GROBETON|GRO_BETON|LEAN|BLINDING|KORUMA/i, duvarPat: /BRSTD|BRICK|BRELM|TUGLA|ANSI32/, grid: 0.05, tmax: 1.2 });
  const isBeton = (e, o) => e.type === 'hatch' && (o.betonLay ? o.betonLay.includes(e.layer) : (upTR(e.pat || '') === o.betonPat && !NOT_STRUCT.test(e.layer) && !o.groLay.test(e.layer)));
  const isGro = (e, o) => e.type === 'hatch' && o.groLay.test(e.layer);

  K.detect = (opt) => {
    const o = Object.assign(K.defaults(), opt || {}), ents = C.doc.ents;
    const texts = [], hatches = [], gro = [], duv = [], circles = [], blks = [];
    for (const e of ents) {
      if (e.type === 'text' || e.type === 'mtext') { const s = txtOf(e); if (s) texts.push({ e, s, S: upTR(s), p: e.p, h: e.h || 0.2, lay: e.layer }); }
      else if (e.type === 'hatch') { if (isBeton(e, o)) { const b = bbOf(e); if (b) hatches.push({ e, b }); } else if (isGro(e, o)) { const b = bbOf(e); if (b) gro.push({ e, b }); } else if (o.duvarPat.test(upTR(e.pat || ''))) { const b = bbOf(e); if (b) duv.push({ e, b }); } }
      else if (e.type === 'circle') circles.push(e);
      else if (e.type === 'blk' || e.type === 'insert') blks.push(e);
    }
    // başlıklar
    const titles = [];
    for (const t of texts) {
      const S = t.S;
      let m = /(?:SECTION|KESIT|SECT\.)\s*([A-Z0-9]{1,3})\s*[-–—]\s*([A-Z0-9]{1,3})/.exec(S) || /(?:^|[\s(])([A-Z0-9]{1,3})\s*[-–—]\s*([A-Z0-9]{1,3})\s*(?:KESITI|KESIT|KESITLERI|SECTION|SEC\.)(?:\b|$)/.exec(S);
      if (m && m[1] === m[2]) { titles.push({ kind: 'kesit', name: m[1] + '-' + m[2], letter: m[1], t }); continue; }
      m = /([+\-±−]?\s*\d{1,4}[.,]\d{2})\s*(?:M\.?\s+)?(?:ELEVATION\s+|LEVEL\s+|KOTU\s+|KOT\s+|KOTLU\s+)?(?:[A-ZÇĞÖŞÜ]+\s+){0,2}(?:PLAN|PLANI)(?:\b|$)/.exec(S) || /PLAN[I]?\s*[:(@]?\s*(?:KOT[U]?|EL\.?|LEVEL)?\s*[:=]?\s*\(?\s*([+\-±−]?\s*\d{1,4}[.,]\d{2})/.exec(S);
      if (m) { const v = kotVal(m[1].replace(/\s/g, '')); if (v != null) titles.push({ kind: 'plan', name: t.s, level: v, t }); }
    }
    // betonarme tarama kümeleri
    const cl = [];
    for (const h of hatches) cl.push({ b: h.b.slice(0, 4), hs: [h] });
    for (let ch = true; ch;) { ch = false; for (let i = 0; i < cl.length; i++) for (let j = cl.length - 1; j > i; j--) { const a = cl[i], c = cl[j]; if (c.b[0] < a.b[2] + 3 && c.b[2] > a.b[0] - 3 && c.b[1] < a.b[3] + 3 && c.b[3] > a.b[1] - 3) { a.b = uni(a.b, c.b); a.hs = a.hs.concat(c.hs); cl.splice(j, 1); ch = true; } } }
    // kümeyi başlığa bağla: başlık kümenin altında, yatayda içinde
    const draws = [];
    for (const c of cl) {
      let best = null;
      for (const ti of titles) { const p = ti.t.p; if (p[0] < c.b[0] - 3 || p[0] > c.b[2] + 3) continue; const dy = c.b[1] - p[1]; if (dy < -1 || dy > 25) continue; if (!best || dy < best.dy) best = { ti, dy }; }
      if (!best) continue;
      let d = draws.find(x => x.ti === best.ti); if (!d) { d = { ti: best.ti, kind: best.ti.kind, name: best.ti.name, level: best.ti.level, letter: best.ti.letter, b: c.b.slice(), hs: [] }; draws.push(d); }
      d.b = uni(d.b, c.b); d.hs = d.hs.concat(c.hs);
    }
    for (const d of draws) { const tp = d.ti.t.p; d.b = uni(d.b, [tp[0], tp[1], tp[0], tp[1]]); d.win = grow(d.b, 3.5); d.gro = gro.filter(g => bIn(g.b, grow(d.b, 1))); d.duv = duv.filter(g => bIn(g.b, grow(d.b, 1))); }
    // aks balonları: dairenin içindeki kısa yazı (aks katmanı varsa yalnız o)
    const aksLayRe = /AKS|AXIS|GRID/i, hasAksLay = circles.some(c => aksLayRe.test(c.layer));
    const labels = [];
    for (const t of texts) {
      if (!/^[A-Z0-9]{1,2}["'′″]?$/.test(t.S)) continue;
      for (const c of circles) { if (hasAksLay && !aksLayRe.test(c.layer)) continue; if (c.r < 0.12 || c.r > 1.5) continue; const dd = Math.hypot(t.p[0] - c.c[0], t.p[1] - c.c[1]); if (dd < c.r * 1.15) { labels.push({ lab: t.S.replace(/[′″]/g, m => m === '′' ? "'" : '"'), c: c.c, r: c.r, t }); break; } }
    }
    for (const d of draws) {
      const L = labels.filter(l => inW(l.c, [d.b[0] - 6, d.b[1] - 6, d.b[2] + 6, d.b[3] + 12]));
      if (d.kind === 'plan') { // aynı etiket iki kez: aynı x → düşey aks (x değeri), aynı y → yatay aks (y değeri)
        const ax = {}; const by = {}; for (const l of L) (by[l.lab] = by[l.lab] || []).push(l);
        for (const [lab, a] of Object.entries(by)) { if (a.length < 2) continue; const xs = a.map(q => q.c[0]), ys = a.map(q => q.c[1]); if (Math.max(...xs) - Math.min(...xs) < 0.08 && Math.max(...ys) - Math.min(...ys) > 1) ax[lab] = { k: 'x', v: median(xs) }; else if (Math.max(...ys) - Math.min(...ys) < 0.08 && Math.max(...xs) - Math.min(...xs) > 1) ax[lab] = { k: 'y', v: median(ys) }; }
        d.axes = ax;
      } else { // kesitte üst sıradaki balonlar
        const top = L.length ? Math.max(...L.map(l => l.c[1])) : 0; d.labels = L.filter(l => top - l.c[1] < 1.5).map(l => ({ lab: l.lab, s: l.c[0] }));
      }
      // kot işaretleri: blok (kot katmanı / adı) + en yakın kot yazısı; blok yoksa yazı
      const kt = texts.filter(t => inW(t.p, d.win) && kotVal(t.s) != null);
      const kb = blks.filter(b => b.p && inW(b.p, d.win) && (/KOT|LEVEL|ELEV/i.test(b.layer) || /KOT|LEVEL|ELEV|CK_TR/i.test(String(b.ref || b.name || ''))));
      const pairs = [];
      for (const b of kb) { let best = null; for (const t of kt) { const dx = t.p[0] - b.p[0], dy = t.p[1] - b.p[1]; if (Math.abs(dy) > 0.8 || Math.abs(dx) > 2.5) continue; const dd = Math.hypot(dx, dy * 2); if (!best || dd < best.dd) best = { dd, t }; } if (best) pairs.push({ y: b.p[1], z: kotVal(best.t.s), x: b.p[0] }); }
      if (!pairs.length) for (const t of kt) pairs.push({ y: t.p[1] - 0.05, z: kotVal(t.s), x: t.p[0], weak: true });
      d.kots = pairs;
    }
    // kesit çizgileri: plandaki harf çiftleri
    const plans = draws.filter(d => d.kind === 'plan').sort((a, b) => a.level - b.level), secs = draws.filter(d => d.kind === 'kesit');
    const labSet = new Set(labels.map(l => l.t));
    for (const s of secs) {
      let best = null;
      // kesitteki aks balonlarının plandaki türleri: harf (yatay aks, y) görünüyorsa kesit çizgisi düşey olmalı, rakam (x) görünüyorsa yatay
      const kinds = new Set(); for (const l of s.labels || []) for (const p of plans) { const a = (p.axes || {})[l.lab]; if (a) kinds.add(a.k); }
      for (const p of plans) {
        const cand = texts.filter(t => t.S === s.letter && !labels.some(l => l.t === t) && inW(t.p, grow(p.b, 8)));
        for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) {
          const A = cand[i], B = cand[j], dx = B.p[0] - A.p[0], dy = B.p[1] - A.p[1], L = Math.hypot(dx, dy); if (L < 1) continue;
          const ux = Math.abs(dx) / L, uy = Math.abs(dy) / L;
          let sc = Math.min(L, 60) / 60; // uzun çizgi
          if (kinds.has('y')) sc += uy > 0.3 ? 3 : -10; if (kinds.has('x')) sc += ux > 0.3 ? 3 : -10;
          if (ux > 0.995 || uy > 0.995) sc += 1; // eksene paralel
          if (/KES|SECT|CUT/i.test(A.lay) && /KES|SECT|CUT/i.test(B.lay)) sc += 2;
          if (Math.abs((A.h || 0) - (B.h || 0)) < 1e-6) sc += 0.5;
          if (!best || sc > best.sc) best = { sc, dd: L, a: A.p, b: B.p, plan: p };
        }
      }
      if (best) s.cut = { a: [best.a[0], best.a[1]], b: [best.b[0], best.b[1]], plan: best.plan };
    }
    return { o, plans, secs, titles, labels };
  };

  /* ---------------- 2. eşleştirme (planlar arası kayma, kesit ölçekleri) ---------------- */
  K.calibrate = (D) => {
    const msgs = [], ref = D.plans[0]; if (!ref) throw new Error('Plan bulunamadı (başlıkta "… PLAN" ve kot olmalı, ör. "-8.30 ELEVATION PLAN").');
    for (const p of D.plans) {
      if (p === ref) { p.off = [0, 0]; continue; }
      const dx = [], dy = []; for (const [lab, a] of Object.entries(p.axes || {})) { const r = (ref.axes || {})[lab]; if (!r || r.k !== a.k) continue; (a.k === 'x' ? dx : dy).push(r.v - a.v); }
      p.off = [median(dx) || 0, median(dy) || 0]; if (!dx.length || !dy.length) msgs.push(`${p.name}: aks eşleşmesi eksik (${dx.length} düşey, ${dy.length} yatay)`);
    }
    for (const s of D.secs) {
      s.ok = false; if (!s.cut) { msgs.push(`${s.name}: planda kesit çizgisi (${s.letter} … ${s.letter}) bulunamadı`); continue; }
      const off = s.cut.plan.off || [0, 0], a = [s.cut.a[0] + off[0], s.cut.a[1] + off[1]], b = [s.cut.b[0] + off[0], s.cut.b[1] + off[1]];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
      s.A = a; s.u = u; s.len = L;
      // aks → kesit yatay konum: lam = kesit çizgisi üzerindeki parametre
      const P = []; const axes = ref.axes || {};
      for (const l of s.labels || []) { const ax = axes[l.lab]; if (!ax) continue; let lam = null; if (ax.k === 'x' && Math.abs(u[0]) > 0.3) lam = (ax.v - a[0]) / u[0]; else if (ax.k === 'y' && Math.abs(u[1]) > 0.3) lam = (ax.v - a[1]) / u[1]; if (lam != null) P.push([lam, l.s]); }
      if (P.length < 2) { msgs.push(`${s.name}: kesitte plandaki akslardan en az ikisi bulunmalı (${P.length})`); continue; }
      const n = P.length, mx = P.reduce((t, q) => t + q[0], 0) / n, my = P.reduce((t, q) => t + q[1], 0) / n; let sxy = 0, sxx = 0; for (const q of P) { sxy += (q[0] - mx) * (q[1] - my); sxx += (q[0] - mx) ** 2; }
      let k = sxx > 1e-9 ? sxy / sxx : 1; if (Math.abs(Math.abs(k) - 1) < 0.03) k = Math.sign(k); s.hk = k; s.hb = my - k * mx;
      s.hres = Math.max(...P.map(q => Math.abs(k * q[0] + s.hb - q[1])));
      // düşey: z = (y - y0) * zk
      const K2 = s.kots || []; if (!K2.length) { msgs.push(`${s.name}: kot işareti yok`); continue; }
      const off2 = K2.map(q => q.y - q.z), y0 = median(off2); const good = K2.filter(q => Math.abs(q.y - q.z - y0) < 0.08);
      s.y0 = good.length ? good.reduce((t, q) => t + (q.y - q.z), 0) / good.length : y0; s.zk = 1; s.kotOk = good.length; s.kotN = K2.length;
      if (good.length < Math.max(2, K2.length * 0.5)) msgs.push(`${s.name}: kot işaretlerinin yalnız ${good.length}/${K2.length} tanesi aynı ölçekte`);
      s.ok = true;
    }
    return msgs;
  };

  /* ---------------- 3. tarama kesişimleri ---------------- */
  const edgesOf = (hs, off) => { const E = []; for (const h of hs) { const ed = []; for (const lp of h.e.loops || []) for (let i = 0; i < lp.length; i++) { const p = lp[i], q = lp[(i + 1) % lp.length]; ed.push([p[0] + off[0], p[1] + off[1], q[0] + off[0], q[1] + off[1]]); } E.push(ed); } return E; };
  // doğru x = X ile kesişen aralıklar (her tarama kendi içinde tek-çift, sonra birleşim) → y aralıkları
  const scan = (E, X, vert) => {
    const out = [];
    for (const ed of E) {
      const ys = [];
      for (const s of ed) { const a0 = vert ? s[0] : s[1], a1 = vert ? s[2] : s[3], b0 = vert ? s[1] : s[0], b1 = vert ? s[3] : s[2]; if ((a0 <= X) !== (a1 <= X)) ys.push(b0 + (X - a0) / (a1 - a0) * (b1 - b0)); }
      ys.sort((p, q) => p - q); for (let i = 0; i + 1 < ys.length; i += 2) if (ys[i + 1] - ys[i] > 1e-4) out.push([ys[i], ys[i + 1]]);
    }
    out.sort((p, q) => p[0] - q[0]); const U = []; for (const iv of out) { const l = U[U.length - 1]; if (l && iv[0] <= l[1] + 1e-3) l[1] = Math.max(l[1], iv[1]); else U.push(iv.slice()); }
    return U;
  };

  /* ---------------- 4. yeniden kurma ---------------- */
  K.build = (D, opt) => {
    const o = Object.assign(K.defaults(), D.o || {}, opt || {}), g = o.grid, plans = D.plans, secs = D.secs.filter(s => s.ok);
    if (!plans.length) throw new Error('Plan yok'); if (!secs.length) throw new Error('Eşleşen kesit yok');
    // ızgara: tüm planların betonarmesi (ortak koordinat)
    let bb = null; for (const p of plans) for (const h of p.hs) { const b = [h.b[0] + p.off[0], h.b[1] + p.off[1], h.b[2] + p.off[0], h.b[3] + p.off[1]]; bb = bb ? uni(bb, b) : b; }
    bb = grow(bb, 2 * g); const nx = Math.ceil((bb[2] - bb[0]) / g), ny = Math.ceil((bb[3] - bb[1]) / g), N = nx * ny;
    const cx = i => bb[0] + (i + 0.5) * g, cy = j => bb[1] + (j + 0.5) * g;
    // kesit kolonları (önbellekli)
    for (const s of secs) { s.E = edgesOf(s.hs, [0, 0]); s.EG = edgesOf(s.gro || [], [0, 0]); s.cache = new Map(); }
    const col = (s, lam, which) => { const key = which + Math.round(lam / (g / 2)); let v = s.cache.get(key); if (v) return v; const X = s.hk * lam + s.hb; v = scan(which === 'g' ? s.EG : s.E, X, true).map(iv => [+((iv[0] - s.y0) * s.zk).toFixed(3), +((iv[1] - s.y0) * s.zk).toFixed(3)]); s.cache.set(key, v); return v; };
    // bantlar
    const bands = plans.map((p, i) => ({ p, z0: i === 0 ? -1e9 : p.level, z1: i === plans.length - 1 ? 1e9 : plans[i + 1].level }));
    // plan sınıfları: 1 betonarme, 2 iç (oda), 0 dış
    for (const B of bands) {
      const p = B.p, E = edgesOf(p.hs, p.off), cls = new Uint8Array(N);
      for (let j = 0; j < ny; j++) { const y = cy(j); for (const iv of scan(E, y, false)) { const i0 = Math.max(0, Math.ceil((iv[0] - bb[0]) / g - 0.5)), i1 = Math.min(nx - 1, Math.floor((iv[1] - bb[0]) / g - 0.5)); for (let i = i0; i <= i1; i++) cls[j * nx + i] = 1; } }
      // iç: betonarmeyi 0.8 m kapatıp (kapı / boşluk) dıştan taşırma
      const wallM = new Uint8Array(N); for (let k = 0; k < N; k++) wallM[k] = cls[k];
      { const E2 = edgesOf(p.duv || [], p.off); if (E2.length) for (let j = 0; j < ny; j++) { const y = cy(j); for (const iv of scan(E2, y, false)) { const i0 = Math.max(0, Math.ceil((iv[0] - bb[0]) / g - 0.5)), i1 = Math.min(nx - 1, Math.floor((iv[1] - bb[0]) / g - 0.5)); for (let i = i0; i <= i1; i++) wallM[j * nx + i] = 1; } } }
      const R = Math.round(0.8 / g), dil = new Uint8Array(N);
      { const tmp = new Uint8Array(N); for (let j = 0; j < ny; j++) { let last = -1e9; for (let i = 0; i < nx; i++) { if (wallM[j * nx + i] === 1) last = i; if (i - last <= R) tmp[j * nx + i] = 1; } last = 1e9; for (let i = nx - 1; i >= 0; i--) { if (wallM[j * nx + i] === 1) last = i; if (last - i <= R) tmp[j * nx + i] = 1; } }
        for (let i = 0; i < nx; i++) { let last = -1e9; for (let j = 0; j < ny; j++) { if (tmp[j * nx + i]) last = j; if (j - last <= R) dil[j * nx + i] = 1; } last = 1e9; for (let j = ny - 1; j >= 0; j--) { if (tmp[j * nx + i]) last = j; if (last - j <= R) dil[j * nx + i] = 1; } } }
      const out = new Uint8Array(N), st = []; for (let i = 0; i < nx; i++) { st.push(i, (ny - 1) * nx + i); } for (let j = 0; j < ny; j++) st.push(j * nx, j * nx + nx - 1);
      while (st.length) { const k = st.pop(); if (out[k] || dil[k]) continue; out[k] = 1; const i = k % nx, j = (k / nx) | 0; if (i > 0) st.push(k - 1); if (i < nx - 1) st.push(k + 1); if (j > 0) st.push(k - nx); if (j < ny - 1) st.push(k + nx); }
      for (let k = 0; k < N; k++) if (!cls[k] && !out[k]) cls[k] = 2;
      B.cls = cls;
    }
    { const FP = new Uint8Array(N); for (const B of bands) for (let k = 0; k < N; k++) if (B.cls[k]) FP[k] = 1; for (const B of bands) for (let k = 0; k < N; k++) if (!B.cls[k] && FP[k]) B.cls[k] = 2; }
    // her hücre: aynı sınıftan geçerek ulaşılan en yakın kesit
    const iv = new Array(N); for (let k = 0; k < N; k++) iv[k] = null;
    const clip = (L, z0, z1) => { const r = []; for (const q of L) { const a = Math.max(q[0], z0), b = Math.min(q[1], z1); if (b - a > 0.004) r.push([a, b]); } return r; };
    const stats = { cells: 0, yol: 0, komsu: 0, tahmin: 0 };
    for (const B of bands) {
      const cls = B.cls, res = new Array(N).fill(null);
      for (let k = 0; k < N; k++) {
        const c = cls[k]; if (!c) continue; const i = k % nx, j = (k / nx) | 0, x = cx(i), y = cy(j);
        let best = null;
        for (const s of secs) {
          const lam = (x - s.A[0]) * s.u[0] + (y - s.A[1]) * s.u[1]; if (lam < -0.3 || lam > s.len + 0.3) continue;
          const fx = s.A[0] + s.u[0] * lam, fy = s.A[1] + s.u[1] * lam, d = Math.hypot(x - fx, y - fy); if (best && d >= best.d) continue;
          const n = Math.ceil(d / g); let okp = true; for (let t = 1; t <= n; t++) { const qx = x + (fx - x) * t / n, qy = y + (fy - y) * t / n, qi = Math.floor((qx - bb[0]) / g), qj = Math.floor((qy - bb[1]) / g); if (qi < 0 || qj < 0 || qi >= nx || qj >= ny || cls[qj * nx + qi] !== c) { okp = false; break; } }
          if (okp) best = { d, s, lam };
        }
        if (best) { const L = clip(col(best.s, best.lam, 'b'), B.z0, B.z1).concat(clip(col(best.s, best.lam, 'g'), B.z0, B.z1).map(q => [q[0], q[1], 'g'])); res[k] = L; stats.yol++; }
      }
      // komşudan doldur (aynı sınıf)
      const q = []; for (let k = 0; k < N; k++) if (res[k]) q.push(k);
      for (let h = 0; h < q.length; h++) { const k = q[h], i = k % nx, j = (k / nx) | 0; for (const n of [i > 0 ? k - 1 : -1, i < nx - 1 ? k + 1 : -1, j > 0 ? k - nx : -1, j < ny - 1 ? k + nx : -1]) { if (n < 0 || res[n] || cls[n] !== cls[k]) continue; res[n] = res[k]; q.push(n); stats.komsu++; } }
      // hâlâ boş betonarme (ör. kesitin kesmediği kolon): bant tabanından en yakın kesitteki ilk betonarmenin üstüne
      for (let k = 0; k < N; k++) {
        if (res[k] || cls[k] !== 1) continue; const i = k % nx, j = (k / nx) | 0, x = cx(i), y = cy(j); let best = null;
        for (const s of secs) { const lam = (x - s.A[0]) * s.u[0] + (y - s.A[1]) * s.u[1]; if (lam < -0.3 || lam > s.len + 0.3) continue; const d = Math.abs((x - s.A[0]) * s.u[1] - (y - s.A[1]) * s.u[0]); if (!best || d < best.d) best = { d, s, lam }; }
        if (!best) continue; const L = col(best.s, best.lam, 'b'), z0 = B.z0 > -1e8 ? B.z0 : Math.min(...L.map(q2 => q2[0])); const up = L.filter(q2 => q2[1] > z0 + 0.05).sort((a, b) => a[0] - b[0])[0];
        if (up) { res[k] = [[Math.max(z0, B.z0), Math.min(up[1], B.z1)]]; stats.tahmin++; }
      }
      for (let k = 0; k < N; k++) if (res[k] && res[k].length) iv[k] = (iv[k] || []).concat(res[k]);
    }
    for (let k = 0; k < N; k++) if (iv[k]) stats.cells++;
    return { bb, g, nx, ny, N, iv, stats, bands, o };
  };

  /* ---------------- 5. parçalara ayır (katman pastası; ince bölgeler dikdörtgen, kalınlar çokgen; aynısı üstte sürerse birleşir) ---------------- */
  K.pieces = (R, which, o) => {
    const { nx, ny, N, iv } = R, zs = new Set(), sel = q => (which === 'g') === (q[2] === 'g');
    for (let k = 0; k < N; k++) if (iv[k]) for (const q of iv[k]) if (sel(q)) { zs.add(+q[0].toFixed(2)); zs.add(+q[1].toFixed(2)); }
    const Z = [...zs].sort((a, b) => a - b), zi = z => { let lo = 0, hi = Z.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (Z[m] < z - 1e-6) lo = m + 1; else hi = m; } return lo; };
    const LC = Z.map(() => []);
    for (let k = 0; k < N; k++) if (iv[k]) { const seen = new Set(); for (const q of iv[k]) if (sel(q)) { const a = zi(+q[0].toFixed(2)), b = zi(+q[1].toFixed(2)); for (let l = a; l < b; l++) if (!seen.has(l)) { seen.add(l); LC[l].push(k); } } }
    const tmaxC = Math.round(o.tmax / 2 / R.g) + 1, out = []; let open = new Map();
    const stamp = new Int32Array(N).fill(-1), lab = new Int32Array(N).fill(-1);
    for (let li = 0; li + 1 < Z.length; li++) {
      const za = Z[li], zb = Z[li + 1], cells = LC[li], next = new Map(); if (zb - za < 0.005 || !cells.length) { open = next; continue; }
      for (const k of cells) stamp[k] = li;
      const units = [];
      for (const k of cells) { if (lab[k] === li) continue; const comp = [], st = [k]; lab[k] = li; while (st.length) { const c = st.pop(); comp.push(c); const i = c % nx, j = (c / nx) | 0; for (const n of [i > 0 ? c - 1 : -1, i < nx - 1 ? c + 1 : -1, j > 0 ? c - nx : -1, j < ny - 1 ? c + nx : -1]) if (n >= 0 && stamp[n] === li && lab[n] !== li) { lab[n] = li; st.push(n); } }
        comp.sort((a, b) => a - b);
        if (which !== 'g' && thick(comp, nx, ny) <= tmaxC) for (const r of rects(comp, nx)) units.push({ key: 'R' + r.join(','), rect: r });
        else for (const part of splitHoles(comp, nx, R, 0)) if (part.outer) units.push({ key: 'P' + part.cells.length + ':' + part.cells[0] + ':' + hashC(part.cells), outer: part.outer, n: part.cells.length }); }
      for (const u of units) { const pr = open.get(u.key); if (pr && Math.abs(pr.zt - za) < 1e-6) { pr.zt = zb; next.set(u.key, pr); } else { const pc = Object.assign({ zb: za, zt: zb }, u); out.push(pc); next.set(u.key, pc); } }
      open = next;
    }
    return out;
  };
  const hashC = a => { let h = 2166136261; for (let i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 16777619); } return h >>> 0; };

  /* ---------------- 6. biçim: dikdörtgenler, sınır izleme ---------------- */
  const rects = (cells, nx) => { // açgözlü dikdörtgen ayrıştırma
    const set = new Set(cells), used = new Set(), out = [];
    for (const k of cells) {
      if (used.has(k)) continue; const i0 = k % nx, j0 = (k / nx) | 0; let i1 = i0; while (set.has(j0 * nx + i1 + 1) && !used.has(j0 * nx + i1 + 1)) i1++;
      let j1 = j0; for (;;) { let ok = true; for (let i = i0; i <= i1; i++) { const c = (j1 + 1) * nx + i; if (!set.has(c) || used.has(c)) { ok = false; break; } } if (!ok) break; j1++; }
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) used.add(j * nx + i);
      out.push([i0, j0, i1, j1]);
    }
    return out;
  };
  const thick = (cells, nx, ny) => { // en büyük iç kalınlık (hücre) — satranç mesafesi
    const set = new Set(cells); let mx = 0; const d = new Map();
    for (const k of cells) { const i = k % nx, j = (k / nx) | 0; let a = 1e9; const nb = [[i - 1, j], [i, j - 1], [i - 1, j - 1], [i + 1, j - 1]]; let edge = false; for (const [p, q] of nb) { const c = q * nx + p; if (p < 0 || q < 0 || p >= nx || !set.has(c)) { edge = true; break; } a = Math.min(a, d.get(c)); } d.set(k, edge ? 1 : a + 1); }
    for (let t = cells.length - 1; t >= 0; t--) { const k = cells[t], i = k % nx, j = (k / nx) | 0; let a = d.get(k); for (const [p, q] of [[i + 1, j], [i, j + 1], [i + 1, j + 1], [i - 1, j + 1]]) { const c = q * nx + p; if (p < 0 || q < 0 || p >= nx || q >= ny || !set.has(c)) { a = 1; break; } a = Math.min(a, d.get(c) + 1); } d.set(k, a); if (a > mx) mx = a; }
    return mx; // yarı kalınlık (hücre)
  };
  const loopsOf = (cells, nx, R) => { // hücre sınırları → kapalı döngüler (içi solda)
    const set = new Set(cells), E = new Map(), P = (i, j) => [R.bb[0] + i * R.g, R.bb[1] + j * R.g];
    const add = (a, b) => { E.set(a[0] + ',' + a[1], b); };
    for (const k of cells) { const i = k % nx, j = (k / nx) | 0; if (!set.has(k - nx) || j === 0) add([i, j], [i + 1, j]); if (!set.has(k + 1) || i === nx - 1) add([i + 1, j], [i + 1, j + 1]); if (!set.has(k + nx)) add([i + 1, j + 1], [i, j + 1]); if (!set.has(k - 1) || i === 0) add([i, j + 1], [i, j]); }
    const loops = [];
    while (E.size) { const [k0, v0] = E.entries().next().value; const st = k0.split(',').map(Number); let cur = st, nxt = v0; const L = [st]; E.delete(k0); let guard = 0; while (!(nxt[0] === st[0] && nxt[1] === st[1]) && guard++ < 1e6) { L.push(nxt); const kk = nxt[0] + ',' + nxt[1]; const nn = E.get(kk); if (!nn) break; E.delete(kk); cur = nxt; nxt = nn; } void cur; loops.push(L); }
    return loops.map(L => { const q = []; for (let t = 0; t < L.length; t++) { const a = L[(t + L.length - 1) % L.length], b = L[t], c = L[(t + 1) % L.length]; if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0) q.push(P(b[0], b[1])); } return q; }).filter(q => q.length >= 3);
  };
  const splitHoles = (cells, nx, R, depth) => { // delikli parçayı delik sütunundan böl → deliksiz parçalar
    const L = loopsOf(cells, nx, R); const holes = L.filter(q => M.polyArea(q) < 0);
    if (!holes.length || depth > 12) return [{ cells, outer: L.filter(q => M.polyArea(q) > 0).sort((a, b) => M.polyArea(b) - M.polyArea(a))[0] }];
    const hx = Math.min(...holes[0].map(p => p[0])), ci = Math.round((hx - R.bb[0]) / R.g);
    const A = cells.filter(k => k % nx < ci), B = cells.filter(k => k % nx >= ci), out = [];
    for (const part of [A, B]) for (const comp of comps(part, nx)) out.push(...splitHoles(comp, nx, R, depth + 1));
    return out;
  };
  const comps = (cells, nx) => { const set = new Set(cells), seen = new Set(), out = []; for (const k of cells) { if (seen.has(k)) continue; const c = [], st = [k]; seen.add(k); while (st.length) { const a = st.pop(); c.push(a); const i = a % nx; for (const n of [i > 0 ? a - 1 : -1, a + 1, a - nx, a + nx]) if (n >= 0 && set.has(n) && !seen.has(n) && !(n === a + 1 && i === nx - 1)) { seen.add(n); st.push(n); } } out.push(c.sort((x, y) => x - y)); } return out; };

  /* ---------------- 7. ArıtmaCAD elemanları ---------------- */
  K.make = (R, opt) => {
    const o = Object.assign({}, R.o, opt || {}), g = R.g, made = [];
    const P = (i, j) => [R.bb[0] + i * g, R.bb[1] + j * g], f3 = v => +(+v).toFixed(3);
    let zmin = 1e9; for (const L of R.iv) if (L) for (const q of L) if (q[2] !== 'g' && q[0] < zmin) zmin = q[0];
    const lay = n => (o.layerPrefix || '') + n, counts = { perde: 0, kolon: 0, plak: 0, grobeton: 0 };
    const add = (type, props) => { const e = C.newEnt(type, props); delete e.sp; e.k3 = o.tag || 1; C.doc.ents.push(e); made.push(e); return e; };
    for (const which of ['b', 'g']) {
      for (const pc of K.pieces(R, which, o)) {
        const h = f3(pc.zt - pc.zb); if (h < 0.01) continue; const rad = pc.zb <= zmin + 0.01;
        if (which === 'g') { const pts = pc.outer || (() => { const r = pc.rect, a = P(r[0], r[1]), b = P(r[2] + 1, r[3] + 1); return [a, [b[0], a[1]], b, [a[0], b[1]]]; })(); add('plak', { kind: 'radye', grobeton: true, pts: pts.map(p => [f3(p[0]), f3(p[1])]), t: h, zt: f3(pc.zt), beton: 'C16/20', layer: lay('INS_GROBETON') }); counts.grobeton++; continue; }
        if (pc.outer) { if (pc.n < 3) continue; add('plak', { kind: rad ? 'radye' : 'doseme', pts: pc.outer.map(p => [f3(p[0]), f3(p[1])]), t: h, zt: f3(pc.zt), beton: 'C30/37', layer: lay(rad ? 'INS_TEMEL_RADYE' : 'INS_DOSEME') }); counts.plak++; continue; }
        const r = pc.rect, w = (r[2] - r[0] + 1) * g, d = (r[3] - r[1] + 1) * g, a = P(r[0], r[1]), b = P(r[2] + 1, r[3] + 1);
        if (w * d < 2.5 * g * g) continue;
        if (Math.max(w, d) <= o.tmax && Math.max(w, d) / Math.min(w, d) < 2.6 && h > Math.max(w, d)) { add('kolon', { sek: 'R', b: f3(w), d: f3(d), p: [f3((a[0] + b[0]) / 2), f3((a[1] + b[1]) / 2), 0], h, z0: f3(pc.zb), rot: 0, beton: 'C30/37', layer: lay('INS_KOLON') }); counts.kolon++; continue; }
        const hor = w >= d, t = hor ? d : w, cyy = (a[1] + b[1]) / 2, cxx = (a[0] + b[0]) / 2;
        if (t > o.tmax || h < t) { add('plak', { kind: rad ? 'radye' : 'doseme', pts: [a, [b[0], a[1]], b, [a[0], b[1]]].map(p => [f3(p[0]), f3(p[1])]), t: h, zt: f3(pc.zt), beton: 'C30/37', layer: lay(rad ? 'INS_TEMEL_RADYE' : 'INS_DOSEME') }); counts.plak++; continue; }
        const pts = hor ? [[a[0], cyy], [b[0], cyy]] : [[cxx, a[1]], [cxx, b[1]]];
        add('perde', { pts: pts.map(p => [f3(p[0]), f3(p[1])]), closed: false, hiza: 'O', ofs: 0, egim: 'R', tb: f3(t), tt: f3(t), h, z0: f3(pc.zb), malz: 'beton', beton: 'C30/37', layer: lay('INS_PERDE'), zoto: 'EL', hoto: 'EL' }); counts.perde++;
      }
    }
    for (const e of made) { if (!C.doc.layers[e.layer]) C.ensureLayer(e.layer); if (C.insFixLayer) C.insFixLayer(e); delete e.sp; }
    C.changed(); C.emit('layers');
    return { made, counts };
  };

  /* hepsi bir arada */
  K.run = (opt) => { const D = K.detect(opt); const msgs = K.calibrate(D); const R = K.build(D, opt); return { D, msgs, R }; };

  /* ---------------- 8. kullanıcı düzeltmeleri (çizimde saklanır) ---------------- */
  const keyOf = d => d.kind + ':' + Math.round(d.ti.t.p[0] * 10) + ',' + Math.round(d.ti.t.p[1] * 10);
  const ayar = () => { const s = C.doc.set; if (!s.k3) s.k3 = { rows: {}, grid: 0.05, gro: true }; return s.k3; };
  K.detectWithUser = () => {
    const A = ayar(), D = K.detect({ grid: A.grid });
    for (const d of D.plans.concat(D.secs)) { d.key = keyOf(d); const u = A.rows[d.key]; if (!u) continue; if (u.kind) d.kind = u.kind; if (u.level != null && d.kind === 'plan') d.level = +u.level; if (u.cut && d.kind === 'kesit') d.cutUser = u.cut; }
    const all = D.plans.concat(D.secs).filter(d => d.kind !== 'yok');
    D.plans = all.filter(d => d.kind === 'plan').sort((a, b) => a.level - b.level); D.secs = all.filter(d => d.kind === 'kesit');
    for (const s of D.secs) if (s.cutUser) { const ref = D.plans[0]; if (ref) s.cut = { a: s.cutUser[0], b: s.cutUser[1], plan: ref, user: true }; }
    if (!A.gro) for (const s of D.secs) s.gro = [];
    const msgs = K.calibrate(D);
    for (const d of D.plans.concat(D.secs)) { const m = msgs.find(q => q.startsWith(d.name + ':')); d.err = m ? m.slice(d.name.length + 1).trim() : ''; }
    for (const s of D.secs) if (s.cut && s.cut.user) { /* kullanıcı çizgisi zaten ortak (referans plan) koordinatında */ }
    return { D, msgs };
  };
  K.temizle = () => { const old = C.doc.ents.filter(e => e.k3); if (old.length) C.remove(old); return old.length; };

  /* ---------------- 9. panel: çizim ekle, gözden geçir, 3B oluştur ---------------- */
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const ekle = async files => { // DXF / DWG: mevcut çizimlerin sağına eklenir
    let n = 0;
    for (const f of files) {
      const ext0 = C.extents(C.doc.ents), i0 = C.doc.ents.length;
      try { await C.readAny(f, true); } catch (er) { C.warn(`${f.name}: ${er.message || er}`); continue; }
      const neu = C.doc.ents.slice(i0); if (!neu.length) continue;
      const eb = C.extents(neu);
      if (ext0 && eb) { const dx = ext0[2] + 20 - eb[0], dy = ext0[1] - eb[1]; const X = C.xMove ? C.xMove([dx, dy, 0]) : null; if (X) neu.forEach(e => C.xform(e, X)); else neu.forEach(e => { const T = C.T[e.type]; if (T && T.xf) T.xf(e, { p: q => [q[0] + dx, q[1] + dy, q[2] || 0], v: q => q, s: 1 }); delete e._c; }); }
      n++; C.log(`${f.name}: ${neu.length} nesne eklendi.`);
    }
    if (n) { C.changed(); C.emit('layers'); C.emit('zoomExtents'); }
    return n;
  };
  K.ekle = ekle;
  const pickFiles = () => new Promise(res => { const fi = document.createElement('input'); fi.type = 'file'; fi.multiple = true; fi.accept = '.dxf,.dwg'; fi.onchange = () => res([...fi.files]); fi.oncancel = () => res([]); fi.click(); });
  const rowHTML = (d, i) => {
    const st = d.kind === 'plan' ? (d.axes && Object.keys(d.axes).length >= 2 ? `✓ ${Object.keys(d.axes).length} aks${d.err ? ' · ' + d.err : ''}` : '⚠ aks yok') : d.ok ? `✓ kesit çizgisi${d.cut && d.cut.user ? ' (elle)' : ''} · ${(d.labels || []).length} aks · ${d.kotOk}/${d.kotN} kot` : `⚠ ${d.err || (!d.cut ? 'kesit çizgisi yok' : 'eşleşmedi')}`;
    return `<tr data-i="${i}"><td><select data-k="kind" aria-label="Tür"><option value="plan" ${d.kind === 'plan' ? 'selected' : ''}>Plan</option><option value="kesit" ${d.kind === 'kesit' ? 'selected' : ''}>Kesit</option><option value="yok">Kullanma</option></select></td>
      <td>${esc(d.name)}</td><td>${d.kind === 'plan' ? `<input data-k="level" aria-label="Plan kotu" style="width:70px" value="${(+d.level).toFixed(2)}">` : esc(d.letter + ' … ' + d.letter)}</td>
      <td style="color:${/✓/.test(st) ? '#7fd18b' : '#f0b45a'}">${esc(st)}</td>
      <td><button data-act="goster" title="Çizimde göster">Göster</button>${d.kind === 'kesit' ? ` <button data-act="cizgi" title="Plandaki kesit çizgisini iki noktayla elle verin">Çizgiyi seç</button>` : ''}</td></tr>`;
  };
  const snap = () => { C.undoStack.push(C.snapshot()); if (C.undoStack.length > 60) C.undoStack.shift(); C.redoStack = []; };
  C.addCommand(['2B3B', 'KESIT3B', 'PLANKESIT3B', '2DTO3D'], '2B plan ve kesitlerden 3B model: çizimdeki planları ("-8.30 PLAN", "ZEMİN KAT PLANI +0.00") ve kesitleri ("SECTION A-A", "KESİT B-B") bulur; aks balonları ve kot işaretleriyle eşleştirir; betonarme (dolu tarama) perde, kolon, radye, döşeme ve grobeton olarak 3B oluşturulur. Panelden başka DXF / DWG çizimler eklenebilir.', async (I) => {
    for (;;) {
      let found; try { found = K.detectWithUser(); } catch (er) { found = { D: { plans: [], secs: [] }, msgs: [String(er.message || er)] }; }
      const { D, msgs } = found, rows = D.plans.concat(D.secs), A = ayar(), nOld = C.doc.ents.filter(e => e.k3).length;
      const b = C.modal('2B plan + kesitlerden 3B model', `
        <div id="k3drop" style="border:1px dashed #3a4250;border-radius:8px;padding:10px 12px;margin-bottom:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <button id="k3add" class="pri">+ Çizim ekle (DXF / DWG)</button><span style="color:#8d97a3">ya da dosyaları buraya sürükleyin · eklenen çizimler mevcutların sağına konur</span></div>
        <table class="tbl" style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left">Tür</th><th style="text-align:left">Başlık</th><th style="text-align:left">Kot / kesit</th><th style="text-align:left">Eşleşme</th><th></th></tr></thead>
        <tbody>${rows.length ? rows.map(rowHTML).join('') : '<tr><td colspan="5" style="color:#f0b45a;padding:10px">Çizimde plan / kesit başlığı bulunamadı. Başlıklar "… PLAN" + kot (ör. "-8.30 ELEVATION PLAN") ve "SECTION A-A" / "KESİT A-A" biçiminde olmalı.</td></tr>'}</tbody></table>
        ${msgs.length ? `<div style="margin-top:8px;color:#f0b45a;font-size:12px">${msgs.map(esc).join('<br>')}</div>` : ''}
        <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:12px;align-items:center">
          <label>Hassasiyet <select id="k3grid"><option value="0.05" ${A.grid === 0.05 ? 'selected' : ''}>5 cm</option><option value="0.1" ${A.grid === 0.1 ? 'selected' : ''}>10 cm (hızlı)</option><option value="0.025" ${A.grid === 0.025 ? 'selected' : ''}>2.5 cm (yavaş)</option></select></label>
          <label><input type="checkbox" id="k3gro" ${A.gro ? 'checked' : ''}> Grobeton</label>
          <span style="color:#8d97a3;font-size:12px">Betonarme = dolu (SOLID) tarama · plan ↔ kesit eşleşmesi aks balonları ve kot işaretleriyle</span></div>
        <div class="bar" style="justify-content:space-between;margin-top:12px"><span>${nOld ? `<button id="k3del">Önceki 3B'yi sil (${nOld})</button>` : ''}</span><span><button id="k3cancel">Kapat</button> <button id="k3ok" class="pri" ${D.plans.length && D.secs.some(s => s.ok) ? '' : 'disabled'}>3B oluştur</button></span></div>`);
      const act = await new Promise(res => {
        let done = false; const end = v => { if (done) return; done = true; clearInterval(tm); res(v); };
        const save = () => { b.querySelectorAll('tr[data-i]').forEach(tr => { const d = rows[+tr.dataset.i], r = A.rows[d.key] = A.rows[d.key] || {}; const k = tr.querySelector('[data-k=kind]').value; if (k !== (d.ti.kind)) r.kind = k; else delete r.kind; const lv = tr.querySelector('[data-k=level]'); if (lv) { const v = parseFloat(String(lv.value).replace(',', '.')); if (!isNaN(v) && Math.abs(v - d.ti.level) > 1e-6) r.level = v; else delete r.level; } }); A.grid = +b.querySelector('#k3grid').value; A.gro = b.querySelector('#k3gro').checked; };
        b.querySelector('#k3add').onclick = async () => { const fs = await pickFiles(); if (fs.length) { save(); end({ ekle: fs }); } };
        const dz = b.querySelector('#k3drop'); dz.ondragover = e => { e.preventDefault(); dz.style.borderColor = '#4a90e2'; }; dz.ondragleave = () => { dz.style.borderColor = '#3a4250'; }; dz.ondrop = e => { e.preventDefault(); const fs = [...e.dataTransfer.files].filter(f => /\.(dxf|dwg)$/i.test(f.name)); if (fs.length) { save(); end({ ekle: fs }); } };
        b.querySelectorAll('tr[data-i] select, tr[data-i] input').forEach(x => x.onchange = () => { save(); end({ yenile: 1 }); });
        b.querySelectorAll('[data-act]').forEach(x => x.onclick = () => { save(); const d = rows[+x.closest('tr').dataset.i]; end({ [x.dataset.act]: d }); });
        b.querySelector('#k3cancel').onclick = () => { save(); end({ kapat: 1 }); };
        const del = b.querySelector('#k3del'); if (del) del.onclick = () => end({ sil: 1 });
        b.querySelector('#k3ok').onclick = () => { save(); end({ ok: 1 }); };
        const tm = setInterval(() => { if (document.querySelector('#modal').classList.contains('hidden')) end({ kapat: 1 }); }, 300);
      });
      C.closeModal();
      if (act.kapat) return;
      if (act.yenile) continue;
      if (act.ekle) { snap(); await ekle(act.ekle); continue; }
      if (act.sil) { snap(); const n = K.temizle(); C.log(`${n} eski 3B eleman silindi.`); continue; }
      if (act.goster) { const w = act.goster.b; C.setView && C.currentView !== 'plan' && C.setView('plan'); const v = C.views.plan; v.cx = (w[0] + w[2]) / 2; v.cy = (w[1] + w[3]) / 2; v.s = Math.min(v.W / (w[2] - w[0]), v.H / (w[3] - w[1])) * 0.9; v.dirty = true; await I.pt('Çizim gösteriliyor — devam etmek için bir noktaya tıklayın ya da Enter'); continue; }
      if (act.cizgi) {
        const s = act.cizgi, ref = D.plans[0]; if (!ref) { C.warn('Önce bir plan gerekli.'); continue; }
        const w = ref.b; C.setView && C.currentView !== 'plan' && C.setView('plan'); const v = C.views.plan; v.cx = (w[0] + w[2]) / 2; v.cy = (w[1] + w[3]) / 2; v.s = Math.min(v.W / (w[2] - w[0]), v.H / (w[3] - w[1])) * 0.9; v.dirty = true;
        const a = await I.pt(`${s.name}: kesit çizgisinin 1. ucu (${ref.name} üzerinde)`); if (!a || typeof a === 'string') continue;
        C.cmd.base = a; const bb2 = await I.pt('2. ucu'); C.cmd.base = null; if (!bb2 || typeof bb2 === 'string') continue;
        (A.rows[s.key] = A.rows[s.key] || {}).cut = [[a[0], a[1]], [bb2[0], bb2[1]]]; continue;
      }
      if (act.ok) {
        const t0 = performance.now();
        try {
          snap(); // Geri al: yalnız 3B model geri alınır, eklenen çizimler kalır
          const nDel = K.temizle(), R = K.build(D, { grid: A.grid }), Mk = K.make(R, { tag: 1 }), c = Mk.counts;
          C.log(`2B → 3B: ${c.perde} perde, ${c.kolon} kolon, ${c.plak} radye / döşeme${c.grobeton ? ', ' + c.grobeton + ' grobeton' : ''} oluşturuldu (${D.plans.length} plan, ${D.secs.filter(q => q.ok).length} kesit, ${((performance.now() - t0) / 1000).toFixed(1)} sn)${nDel ? ` · önceki ${nDel} eleman silindi` : ''}. Kesitlerin kesmediği yerler en yakın kesitten tamamlandı; 3B sekmesinde kontrol edin. Tamamı Geri al ile geri alınır.`);
          if (C.setView) C.setView('3d');
          setTimeout(() => { try { const v = C.views.v3; if (!v || v.failed) return; if (v.needBuild) v.build(); const bx = C.extents(Mk.made); let z0 = 1e9, z1 = -1e9; for (const e of Mk.made) { const zb = e.type === 'plak' ? (+e.zt || 0) - (+e.t || 0) : +e.z0 || 0, zt = e.type === 'plak' ? +e.zt || 0 : (+e.z0 || 0) + (+e.h || 0); z0 = Math.min(z0, zb); z1 = Math.max(z1, zt); } const o = v.origin || [0, 0]; v.t = [(bx[0] + bx[2]) / 2 - o[0], (bx[1] + bx[3]) / 2 - o[1], (z0 + z1) / 2]; v.dist = Math.hypot(bx[2] - bx[0], bx[3] - bx[1], z1 - z0) * 1.15; v.dirty = true; } catch (er) { } }, 500);
        } catch (er) { C.warn('2B → 3B yapılamadı: ' + (er.message || er)); }
        return;
      }
    }
  }, { noUndo: true });
})(window.C);

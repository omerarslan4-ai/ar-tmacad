/* ArıtmaCAD — BORU ↔ PERDE: duvar geçişi, duvar geçiş parçası, boru etiketi
   1) Boru çizilince (BORU / BORUHAT) geçtiği betonarme perdeler otomatik delinir. Boru perdenin yüzünden başlıyor / bitiyorsa
      perdenin içinden geçecek şekilde karşı yüze kadar uzatılır. Her perde için sorulur: duvar geçiş parçası (su tutucu flanşlı) konsun mu?
      (radye üstündeki perdelerde — su yapısı — varsayılan Evet). Boru taşınır / değişirse delik ve geçiş parçası güncellenir.
   2) Boru etiketi (planda, boru ekseni boyunca, okunur yönde): üstte "HAT ÇAP MALZEME (PN)", altta "BTK: kot" (boru alt kotu),
      ortada eksen üzerinde akış yönü oku (çizim yönü). Komutlar: BORUETIKET (açık / kapalı, hat kodu), BORUYON (akışı ters çevir).
   3) Duvar geçiş parçası nesnesi (dgp) + DGPDETAY: her tip için ölçülü detay ve özellik tablosu, Mekanik grubunda "DETAYLAR" paftasına. */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, RAD = Math.PI / 180, { L, P, TX, S } = C.prim;
  if (!T.pipe) return;
  const r2 = v => Math.round(v * 100) / 100, kot = v => (v >= 0 ? '+' : '') + v.toFixed(2);
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], (a[2] || 0) - (b[2] || 0)], add = (a, b) => [a[0] + b[0], a[1] + b[1], (a[2] || 0) + (b[2] || 0)], mul = (a, k) => [a[0] * k, a[1] * k, (a[2] || 0) * k];
  const len3 = a => Math.hypot(a[0], a[1], a[2] || 0), dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
  const AYAR = () => { const s = C.doc.set; s.boruEtiket = Object.assign({ acik: true, hat: '' }, s.boruEtiket || {}); return s.boruEtiket; };

  /* ================= BORU ETİKETİ ================= */
  const MALK = { pe: 'HDPE', pvc: 'PVC', pvck: 'PVC', ppr: 'PP-R', celik: 'ÇELİK', asme: 'ÇELİK', paslanmaz: 'PASLANMAZ', galvaniz: 'GALVANİZ', duktil: 'DUKTİL', ctp: 'CTP', beton: 'BETON' };
  const PN = { 'SDR7.4': 'PN25', SDR9: 'PN20', SDR11: 'PN16', 'SDR13.6': 'PN12.5', SDR17: 'PN10', SDR21: 'PN8', SDR26: 'PN6', SDR33: 'PN5', SDR41: 'PN4' };
  const PNPVC = { SDR41: 'PN6', SDR33: 'PN8', SDR26: 'PN10', SDR21: 'PN12.5', SDR17: 'PN16', 'SDR13.6': 'PN20' };
  const ustYazi = e => {
    const c = e.cins || '', od = Math.round(+e.od || +e.dn || 0), dn = Math.round(+e.dn || od), sn = String(e.sinif || '');
    const cap = ['pe', 'pvc', 'pvck', 'ppr'].includes(c) ? String(od) : 'DN' + dn, mal = e.kalite ? String(e.kalite).toLocaleUpperCase('tr') : c === 'paslanmaz' ? 'SS304' : (MALK[c] || (e.mat || '').toLocaleUpperCase('tr'));
    const sinif = c === 'pe' ? (PN[sn] || sn) : c === 'pvc' ? (PNPVC[sn] || sn) : sn;
    const hat = e.hat != null ? e.hat : AYAR().hat;
    return [hat, cap, mal].filter(Boolean).join(' ') + (sinif && sinif !== 'STD' && sinif !== 'N' && sinif !== 'M' ? ` (${sinif})` : '');
  };
  const okunur = a => { a = ((a % 360) + 360) % 360; if (a > 90 && a <= 270) a -= 180; return a; };
  const etiketPrims = e => {
    const r = (+e.od || +e.dn || 100) / 2000, th = C.annoH(2.5), out = [];
    let best = null, bl = 0; for (let i = 1; i < e.pts.length; i++) { const a = M.p3(e.pts[i - 1]), b = M.p3(e.pts[i]), l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > bl) { bl = l; best = [a, b]; } }
    if (!best || bl < th * 6) return out;
    let [a, b] = best; if (e.ters) [a, b] = [b, a];
    const u = [(b[0] - a[0]) / bl, (b[1] - a[1]) / bl, 0], ang = Math.atan2(u[1], u[0]) / RAD, ok = okunur(ang), tr = Math.abs(ok - ang) > 1 ? -1 : 1, up = [-Math.sin(ok * RAD), Math.cos(ok * RAD), 0];
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0], zm = ((a[2] || 0) + (b[2] || 0)) / 2;
    out.push(TX(add(m, mul(up, r + th * 0.55)), th, ustYazi(e), ok * RAD, 'BC'));
    out.push(TX(add(m, mul(up, -(r + th * 0.55))), th, 'BTK: ' + kot(zm - r), ok * RAD, 'TC'));
    // akış oku: eksen üzerinde, ortada
    const Lk = Math.min(Math.max(th * 3.2, r * 1.2), bl * 0.3), w1 = Math.min(r * 0.45, th * 0.45), w2 = Math.min(r * 0.9, th * 0.95), hl = Lk * 0.42, n = [-u[1], u[0], 0];
    const P0 = add(m, mul(u, -Lk / 2)), Ph = add(m, mul(u, Lk / 2 - hl)), Pt = add(m, mul(u, Lk / 2));
    const ok3 = [add(P0, mul(n, w1)), add(Ph, mul(n, w1)), add(Ph, mul(n, w2)), Pt, add(Ph, mul(n, -w2)), add(Ph, mul(n, -w1)), add(P0, mul(n, -w1))];
    out.push(S(ok3, { color: 254 }), P(ok3, true, { lw: 18 }));
    void tr; return out;
  };
  {
    const p0 = T.pipe.prims;
    T.pipe.prims = e => { const out = p0(e); if (!AYAR().acik || e.etiket === false || !e.pts || e.pts.length < 2) return out; return out.filter(q => !(q.k === 'T' && q.s === e.label)).concat(etiketPrims(e)); };
  }

  /* ================= KESİTTE BORU ETİKETİ =================
     KESITAL / KESITPAFTA / GORUNUMGUNCELLE ile üretilen her kesitte görünen borulara: üstte çap + özellik, altta BTK, ortada akış oku.
     Kesite dik giden (uçtan görünen) borulara: yanında çap + özellik ve BTK. Nesne: 'boruetk' (kesitin görünüm grubuna bağlanır). */
  const KLAY = () => { C.ensureLayer('MEK_BORU_YAZI', 4, 'CONTINUOUS', 18); return 'MEK_BORU_YAZI'; };
  T.boruetk = {
    label: 'Boru etiketi (kesit)',
    prims: x => {
      const th = C.annoH(2.5), out = [], c = M.p3(x.p), r = +x.r || 0.05;
      if (x.uc) { // uçtan görünüş: daire yanında iki satır
        const q = [c[0] + r + th * 0.8, c[1], 0];
        out.push(L([c[0] + r * 0.72, c[1] + r * 0.72, 0], [q[0] + th * 0.2, c[1] + r * 0.72 + th * 0.9, 0], { lw: 13 }));
        out.push(TX([q[0] + th * 0.4, c[1] + r * 0.72 + th * 1.25, 0], th, x.ust, 0, 'BL'), TX([q[0] + th * 0.4, c[1] + r * 0.72 + th * 0.6, 0], th, x.alt, 0, 'TL'));
        return out;
      }
      const ang = +x.ang || 0, u = [Math.cos(ang * RAD), Math.sin(ang * RAD), 0], ok = okunur(ang), up = [-Math.sin(ok * RAD), Math.cos(ok * RAD), 0];
      out.push(TX(add(c, mul(up, r + th * 0.55)), th, x.ust, ok * RAD, 'BC'), TX(add(c, mul(up, -(r + th * 0.55))), th, x.alt, ok * RAD, 'TC'));
      if (x.ok !== false) {
        const Lk = Math.min(Math.max(th * 3.2, r * 1.2), (+x.lmax || 9) * 0.3), w1 = Math.min(r * 0.45, th * 0.45), w2 = Math.min(r * 0.9, th * 0.95), hl = Lk * 0.42, n = [-u[1], u[0], 0];
        const P0 = add(c, mul(u, -Lk / 2)), Ph = add(c, mul(u, Lk / 2 - hl)), Pt = add(c, mul(u, Lk / 2));
        const ok3 = [add(P0, mul(n, w1)), add(Ph, mul(n, w1)), add(Ph, mul(n, w2)), Pt, add(Ph, mul(n, -w2)), add(Ph, mul(n, -w1)), add(P0, mul(n, -w1))];
        out.push(S(ok3, { color: 254 }), P(ok3, true, { lw: 18 }));
      }
      return out;
    },
    xf: (x, X) => { const p = X.p(M.p3(x.p)), o = X.p([0, 0, 0]), q = X.p([Math.cos((x.ang || 0) * RAD), Math.sin((x.ang || 0) * RAD), 0]); x.p = p; x.ang = Math.atan2(q[1] - o[1], q[0] - o[0]) / RAD; },
    snaps: x => [{ p: M.p3(x.p), k: 'ins' }],
    info: x => `Boru etiketi (kesit): ${x.ust} · ${x.alt}`,
  };
  if (C.ANNO_TYPES && C.ANNO_TYPES.add) C.ANNO_TYPES.add('boruetk');
  const kesitEtiketle = (km, yeniler) => {
    const a = km.a, u = km.u, n = km.n, q0 = km.q0, depth = +km.depth || 30, Lc = km.ub ? km.ub[2] + 2 : 1e9;
    const dist = p => (p[0] - a[0]) * n[0] + (p[1] - a[1]) * n[1], uv = p => [(p[0] - a[0]) * u[0] + (p[1] - a[1]) * u[1], p[2] || 0];
    const W = q => [q0[0] + q[0], q0[1] + q[1], 0]; let k = 0;
    const inU = s2 => s2 > (km.ub ? km.ub[0] - 0.5 : -2) && s2 < (km.ub ? km.ub[2] + 0.5 : Lc);
    const isler = [], tumSeg = [];
    for (const e of C.doc.ents) {
      if (e.type !== 'pipe' || !C.layer(e.layer).on || e.etiket === false || !e.pts || e.pts.length < 2) continue;
      const r = (+e.od || +e.dn || 100) / 2000; let best = null, uc = null;
      for (let i = 1; i < e.pts.length; i++) {
        let p = M.p3(e.pts[i - 1]), q = M.p3(e.pts[i]); if (e.ters) [p, q] = [q, p];
        const dp = dist(p), dq = dist(q), A = uv(p), B = uv(q), l = Math.hypot(B[0] - A[0], B[1] - A[1]);
        if (Math.max(dp, dq) < -1e-3 || Math.min(dp, dq) > depth) continue;
        if (l > r * 3 && dp >= -1e-3 && dq >= -1e-3 && (inU(A[0]) || inU(B[0]))) { tumSeg.push({ A, B, id: e.id }); if (!best || l > best.l) best = { A, B, l }; }
        else if (l <= r * 3) { const s2 = (dp < 0) !== (dq < 0) ? (0 - dp) / (dq - dp) : (Math.abs(dp) < Math.abs(dq) ? 0 : 1), X = [p[0] + (q[0] - p[0]) * s2, p[1] + (q[1] - p[1]) * s2, (p[2] || 0) + ((q[2] || 0) - (p[2] || 0)) * s2], U = uv(X); if (inU(U[0]) && (!uc || dist(X) < uc.d)) uc = { U, d: dist(X) }; if (inU(U[0])) tumSeg.push({ A: U, B: U, id: e.id }); }
      }
      if (best || uc) isler.push({ e, r, best, uc });
    }
    const segUz = (q, S2) => { const d = [S2.B[0] - S2.A[0], S2.B[1] - S2.A[1]], l2 = d[0] * d[0] + d[1] * d[1]; let t = l2 ? ((q[0] - S2.A[0]) * d[0] + (q[1] - S2.A[1]) * d[1]) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(q[0] - S2.A[0] - d[0] * t, q[1] - S2.A[1] - d[1] * t); };
    const konan = [], th0 = C.annoH(2.5);
    const engel = []; for (const x of (yeniler || [])) { if (!/^(KESIT|GORUNEN)/.test(x.layer || '') || /TARAMA/.test(x.layer || '')) continue; let pr; try { pr = C.prims(x); } catch (er) { continue; } for (const q of pr || []) { const pts = q.k === 'L' ? [q.a, q.b] : q.k === 'P' ? (q.c ? q.pts.concat([q.pts[0]]) : q.pts) : null; if (!pts) continue; for (let i = 1; i < pts.length; i++) engel.push([[pts[i - 1][0] - q0[0], pts[i - 1][1] - q0[1]], [pts[i][0] - q0[0], pts[i][1] - q0[1]]]); } }
    const kutuKesis = (cx, cy, hx, hy) => { let n = 0; for (const [p1, p2] of engel) { const l = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), k2 = Math.max(1, Math.ceil(l / 0.04)); for (let j = 0; j <= k2; j++) { const x = p1[0] + (p2[0] - p1[0]) * j / k2, y = p1[1] + (p2[1] - p1[1]) * j / k2; if (Math.abs(x - cx) < hx && Math.abs(y - cy) < hy) { n++; break; } } } return n; };
    const kutular = []; isler.sort((x, y) => (x.best ? 1 : 0) - (y.best ? 1 : 0)); // önce uçtan görünenler (yerleri sabit)
    for (const { e, r, best, uc } of isler) {
      const ust = ustYazi(e);
      if (best) {
        let { A, B, l } = best;
        // kesit sınırına kırp
        if (km.ub) { const lo = km.ub[0] - 0.3, hi = km.ub[2] + 0.3, dx = B[0] - A[0]; if (Math.abs(dx) > 1e-6) { const t0 = Math.max(0, Math.min((lo - A[0]) / dx, (hi - A[0]) / dx)), t1 = Math.min(1, Math.max((lo - A[0]) / dx, (hi - A[0]) / dx)); if (t1 > t0) { const A2 = [A[0] + (B[0] - A[0]) * t0, A[1] + (B[1] - A[1]) * t0], B2 = [A[0] + (B[0] - A[0]) * t1, A[1] + (B[1] - A[1]) * t1]; A = A2; B = B2; l = Math.hypot(B[0] - A[0], B[1] - A[1]); } } }
        // en boş yer: diğer borulara ve konmuş etiketlere en uzak aday
        let m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], sk = -1e12;
        for (let t = 0.06; t < 0.95; t += 0.04) {
          const q = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
          let d = Math.min(...tumSeg.filter(S2 => S2.id !== e.id).map(S2 => segUz(q, S2)), ...konan.map(c => Math.hypot(q[0] - c[0], q[1] - c[1])), 1e9);
          const hw = ustYazi(e).length * th0 * 0.42, ax = Math.abs(B[0] - A[0]) >= Math.abs(B[1] - A[1]), hx = ax ? hw : r + th0 * 1.6, hy = ax ? r + th0 * 1.6 : hw;
          d -= 50 * kutuKesis(q[0], q[1], hx, hy); for (const kk of kutular) if (Math.abs(q[0] - kk[0]) < hx + kk[2] && Math.abs(q[1] - kk[1]) < hy + kk[3]) d -= 60;
          d -= Math.abs(t - 0.5) * 0.3; if (isFinite(d) && d > sk) { sk = d; m = q; }
        }
        konan.push(m); { const hw = ustYazi(e).length * th0 * 0.42, ax = Math.abs(B[0] - A[0]) >= Math.abs(B[1] - A[1]); kutular.push(ax ? [m[0], m[1], hw, r + th0 * 1.6] : [m[0], m[1], r + th0 * 1.6, hw]); }
        const dus = Math.abs(B[1] - A[1]) > Math.abs(B[0] - A[0]) * 2;
        const alt = dus ? `KOT: ${kot(Math.min(A[1], B[1]))} / ${kot(Math.max(A[1], B[1]))}` : 'BTK: ' + kot(m[1] - r);
        const x = C.add(C.newEnt('boruetk', { p: W(m), ang: Math.atan2(B[1] - A[1], B[0] - A[0]) / RAD, r, lmax: l, ust, alt, boru: e.id, layer: KLAY(), _noAnno: true })); delete x.sp; k++;
      } else if (uc) { konan.push(uc.U); { const hw = ustYazi(e).length * th0 * 0.42; kutular.push([uc.U[0] + r + th0 + hw, uc.U[1] + r * 0.72 + th0, hw, th0 * 1.3]); } const x = C.add(C.newEnt('boruetk', { p: W(uc.U), uc: true, r, ust, alt: 'BTK: ' + kot(uc.U[1] - r), boru: e.id, layer: KLAY(), _noAnno: true })); delete x.sp; k++; }
    }
    return k;
  };
  {
    const def = C.cmds.SECTION || C.cmds.KESITAL;
    if (def && !def._boruEtk) {
      const f0 = def.fn; def._boruEtk = true;
      def.fn = async function (I, Cx) {
        const km0 = Object.assign({}, C.doc.set.kesitMeta || {}), ids0 = new Set(C.doc.ents.map(x => x.id)); const r = await f0.call(this, I, Cx);
        try { if (AYAR().acik) { const km = C.doc.set.kesitMeta || {}; const nm = Object.keys(km).find(k => km[k] !== km0[k]); if (nm) { const n = kesitEtiketle(km[nm], C.doc.ents.filter(x => !ids0.has(x.id))); if (n) { C.changed(); C.log(`${nm}-${nm} kesitinde ${n} boruya yazı ve akış oku kondu.`); } } } } catch (er) { console.error('kesit boru etiketi', er); }
        return r;
      };
    }
  }

  /* ================= PERDE GEÇİŞİ ================= */
  const perdeler = () => C.doc.ents.filter(w => w.type === 'perde' && (w.malz || 'beton') === 'beton' && !w.kicker && !w.parapet && !w.gv && C.layer(w.layer).on);
  const suYapisiMi = w => C.doc.ents.some(r => r.type === 'plak' && r.kind === 'radye' && Math.abs((+r.zt || 0) - (+w.z0 || 0)) < 0.25 && C.pointInPoly([w.pts[0][0], w.pts[0][1]], r.pts.map(q => [q[0], q[1]])));
  /* boru doğrusu (a→b) ile perde segmentinin kesişimi: [{w, sf, F, s (perde boyunca), t0,t1 (boru parametresi), giris, cikis}] */
  const gecisler = (a, b, ws) => {
    const out = [];
    for (const w of ws) {
      const F = C._ins.faceOffs(w), z0 = +w.z0 || 0, zt = z0 + (+w.h || 3);
      for (const sf of C._ins.segFrames(w)) {
        const da = (a[0] - sf.a[0]) * sf.nn[0] + (a[1] - sf.a[1]) * sf.nn[1], db = (b[0] - sf.a[0]) * sf.nn[0] + (b[1] - sf.a[1]) * sf.nn[1];
        if (Math.abs(db - da) < 1e-9) continue; // perdeye paralel
        const lo = Math.min(F.rB, F.lB), hi = Math.max(F.rB, F.lB);
        let t0 = (lo - da) / (db - da), t1 = (hi - da) / (db - da); if (t0 > t1) [t0, t1] = [t1, t0];
        const ta = Math.max(0, t0), tb = Math.min(1, t1); if (tb - ta < 1e-6) continue;
        const tm = (ta + tb) / 2, q = [a[0] + (b[0] - a[0]) * tm, a[1] + (b[1] - a[1]) * tm, (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * tm];
        const s = (q[0] - sf.a[0]) * sf.u[0] + (q[1] - sf.a[1]) * sf.u[1]; if (s < -0.01 || s > sf.L + 0.01) continue;
        if (q[2] < z0 || q[2] > zt) continue;
        out.push({ w, sf, F, s, t0, t1, ta, tb, q });
      }
    }
    return out;
  };
  /* uç perde yüzündeyse boruyu perdenin içinden karşı yüze uzat */
  const uzat = (e, ws) => {
    const P0 = e.pts; if (P0.length < 2) return false; let ok = false;
    for (const [i, j] of [[0, 1], [P0.length - 1, P0.length - 2]]) {
      const a = M.p3(P0[i]), b = M.p3(P0[j]), d = sub(a, b), Ld = len3(d); if (Ld < 1e-6) continue; const u = mul(d, 1 / Ld);
      for (const w of ws) {
        const F = C._ins.faceOffs(w), z0 = +w.z0 || 0, zt = z0 + (+w.h || 3); if (a[2] < z0 || a[2] > zt) continue;
        for (const sf of C._ins.segFrames(w)) {
          const da = (a[0] - sf.a[0]) * sf.nn[0] + (a[1] - sf.a[1]) * sf.nn[1], s = (a[0] - sf.a[0]) * sf.u[0] + (a[1] - sf.a[1]) * sf.u[1]; if (s < -0.01 || s > sf.L + 0.01) continue;
          const un = u[0] * sf.nn[0] + u[1] * sf.nn[1]; if (Math.abs(un) < 0.1) continue;
          for (const yz of [F.lB, F.rB]) {
            if (Math.abs(da - yz) > 0.03) continue; // uç bu yüzde değil
            const karsi = yz === F.lB ? F.rB : F.lB, k = (karsi - da) / un; if (k <= 0.01) continue; // uç doğrultusu perdenin içine gitmiyor
            P0[i] = add(a, mul(u, k)).map(v => +v.toFixed(4)); ok = true;
          }
        }
      }
    }
    return ok;
  };
  const daire = (c, u, r, n = 32) => { const ax = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], v1 = M.norm(M.cross(u, ax)), v2 = M.norm(M.cross(u, v1)); return Array.from({ length: n }, (_, i) => { const t = i * Math.PI * 2 / n; return add(c, add(mul(v1, Math.cos(t) * r), mul(v2, Math.sin(t) * r))); }); };
  /* deliği ve (istenirse) geçiş parçasını yeniden kur */
  const bosluguKur = (e, g, dgp) => {
    const a = M.p3(e.pts[g.i]), b = M.p3(e.pts[g.i + 1]), d = sub(b, a), Ld = len3(d), u = mul(d, 1 / Ld);
    const pA = add(a, mul(d, g.t0)), pB = add(a, mul(d, g.t1)), boy = len3(sub(pB, pA)) + 0.04, od = (+e.od || +e.dn || 100) / 1000;
    const Dd = dgp ? od + 0.004 : od + 0.05; // geçiş parçası betona gömülür; yalnız boru: karot boşluğu (+50 mm)
    const ring = daire(add(pA, mul(u, -0.02)), u, Dd / 2);
    g.w.bosluk3 = (g.w.bosluk3 || []).filter(x => x.boru !== e.id).concat([{ pts: ring.map(q => q.map(v => +v.toFixed(4))), d: mul(u, boy).map(v => +v.toFixed(4)), boru: e.id }]); delete g.w._c;
    return { merkez: add(pA, mul(sub(pB, pA), 0.5)), u, L: len3(sub(pB, pA)) };
  };
  const imza = e => JSON.stringify([e.pts, e.od, e.dn]);
  const isle = async (e, I, sor) => {
    const ws = perdeler(); uzat(e, ws);
    const gs = []; for (let i = 0; i < e.pts.length - 1; i++) for (const g of gecisler(M.p3(e.pts[i]), M.p3(e.pts[i + 1]), ws)) gs.push(Object.assign(g, { i }));
    // önceki delikler / parçalar
    for (const w of C.doc.ents.filter(w => w.type === 'perde' && Array.isArray(w.bosluk3) && w.bosluk3.some(x => x.boru === e.id))) { if (!gs.some(g => g.w === w)) { w.bosluk3 = w.bosluk3.filter(x => x.boru !== e.id); delete w._c; } }
    const eskiler = C.doc.ents.filter(x => x.type === 'dgp' && x.boru === e.id);
    let n = 0, np = 0;
    for (const g of gs) {
      const eski = eskiler.find(x => x.perde === g.w.id);
      let dgp = !!eski;
      if (sor && !eski) { const su = suYapisiMi(g.w); const k = await I.kw(`${ustYazi(e)} — ${g.w.no || 'perde'} perdesinden geçiyor${su ? ' (su yapısı)' : ''}. Duvar geçiş parçası konsun mu?`, [['E', 'Evet — su tutucu flanşlı geçiş parçası'], ['H', 'Hayır — yalnız boşluk']], su ? 'E' : 'H'); dgp = k === 'E'; }
      const r = bosluguKur(e, g, dgp); n++;
      if (dgp) {
        const t = Math.max(g.F.tb, g.F.tt), L = Math.max(Math.ceil(r.L * 20 - 1e-6) / 20, t), dn = +e.dn || Math.round(+e.od || 100);
        const o = { p: r.merkez.map(v => +v.toFixed(4)), u: r.u.map(v => +v.toFixed(5)), L: +L.toFixed(3), t: +t.toFixed(3), t0: +e.t || 0, od: +e.od || dn, dn, cins: e.cins, sinif: e.sinif, mat: e.mat, D: flansCap(e), tf: dn >= 600 ? 0.025 : 0.02, boru: e.id, perde: g.w.id, perdeNo: g.w.no || '', layer: ensL() };
        if (eski) Object.assign(eski, o, { _c: undefined }); else { const x = C.add(C.newEnt('dgp', o)); delete x.sp; } np++;
      }
    }
    for (const x of eskiler) if (!gs.some(g => g.w.id === x.perde)) C.remove([x]);
    e._pimza = imza(e);
    return { n, np };
  };
  const ensL = () => { C.ensureLayer('MEK_DUVAR_GECIS', 6, 'CONTINUOUS', 35); return 'MEK_DUVAR_GECIS'; };
  // EN 1092-1 PN10 flanş dış çapı (su tutucu flanş için yaklaşık): DN → mm
  const FL = { 50: 165, 65: 185, 80: 200, 100: 220, 125: 250, 150: 285, 200: 340, 250: 400, 300: 455, 350: 505, 400: 565, 450: 615, 500: 670, 600: 780, 700: 895, 800: 1015, 900: 1115, 1000: 1230, 1200: 1455 };
  const flansCap = e => { const od = +e.od || +e.dn || 100, dn = ['pe', 'pvc', 'pvck', 'ppr'].includes(e.cins) ? Math.max(...Object.keys(FL).map(Number).filter(k => k <= od * 0.98), 50) : (+e.dn || od); const k = Object.keys(FL).map(Number).reduce((b, x) => (Math.abs(x - dn) < Math.abs(b - dn) ? x : b), 100); return Math.max(FL[k], od + 120); };

  /* boru çizim komutlarının sonunda: yeni borular için geçişleri sor */
  for (const nm of ['BORU', 'PIPE', 'BORUCIZ', 'BORUHAT', 'BORU3B', 'HAT3B', 'PIPE3D', 'BH']) {
    const def = C.cmds[nm]; if (!def || def._perde) continue; const f0 = def.fn;
    def.fn = async function (I, Cx) { const once = new Set(C.doc.ents.map(x => x.id)); const r = await f0.call(this, I, Cx); const yeni = C.doc.ents.filter(x => x.type === 'pipe' && !once.has(x.id)); let n = 0, np = 0; for (const e of yeni) { try { const q = await isle(e, I, true); n += q.n; np += q.np; } catch (er) { console.error('boru-perde', er); } } if (n) { C.changed(); C.log(`${n} perde geçişi: boşluk açıldı${np ? ', ' + np + ' duvar geçiş parçası kondu (detay: DGPDETAY)' : ''}.`); } return r; };
    def._perde = true;
  }
  /* boru sonradan taşınır / düzenlenirse delik ve parça güncellensin (soru sorulmaz) */
  let mesgul = false;
  C.on && C.on('change', () => { if (mesgul || !C.doc) return; mesgul = true; try { for (const e of C.doc.ents) if (e.type === 'pipe' && e._pimza && e._pimza !== imza(e)) isle(e, null, false); } catch (er) { console.error(er); } finally { mesgul = false; } });
  /* boru silinince deliği ve parçası da gitsin */
  { const rm0 = C.remove; C.remove = function (list) { const ids = new Set((list || []).filter(x => x && x.type === 'pipe').map(x => x.id)); if (ids.size) { for (const w of C.doc.ents) if (w.type === 'perde' && Array.isArray(w.bosluk3) && w.bosluk3.some(x => ids.has(x.boru))) { w.bosluk3 = w.bosluk3.filter(x => !ids.has(x.boru)); delete w._c; } list = list.concat(C.doc.ents.filter(x => x.type === 'dgp' && ids.has(x.boru) && !list.includes(x))); } return rm0.call(this, list); }; }

  /* ================= DUVAR GEÇİŞ PARÇASI NESNESİ ================= */
  const dgpAd = x => `DGP ${['pe', 'pvc', 'pvck', 'ppr'].includes(x.cins) ? 'Ø' + Math.round(x.od) : 'DN' + x.dn} L=${Math.round(x.L * 1000)}`;
  T.dgp = {
    label: 'Duvar geçiş parçası', ifc: 'IfcPipeFitting',
    prims: x => {
      const u = [x.u[0], x.u[1]], l = Math.hypot(u[0], u[1]); if (l < 1e-6) return [];
      const e = [u[0] / l, u[1] / l, 0], n = [-e[1], e[0], 0], c = [x.p[0], x.p[1], 0], r = x.od / 2000 + 0.005, R = x.D / 2000, h = x.L / 2, tf = x.tf / 2;
      const Q = (s, o) => [c[0] + e[0] * s + n[0] * o, c[1] + e[1] * s + n[1] * o, 0];
      return [P([Q(-h, r), Q(h, r), Q(h, -r), Q(-h, -r)], true, { lw: 35 }), P([Q(-tf, R), Q(tf, R), Q(tf, -R), Q(-tf, -R)], true, { lw: 35 }), ...(x.no ? [TX(Q(0, -R - C.annoH(2) * 0.6), C.annoH(2), x.no, 0, 'TC', { color: 6 })] : [])];
    },
    mesh: x => { const u = M.norm(x.u), p = M.p3(x.p), h = x.L / 2, r = x.od / 2000; return [{ t: 'tube', pts: [sub(p, mul(u, h)), add(p, mul(u, h))], r: r + 0.006, ri: r - 0.001, seg: 28 }, { t: 'tube', pts: [sub(p, mul(u, x.tf / 2)), add(p, mul(u, x.tf / 2))], r: x.D / 2000, ri: r + 0.006, seg: 28 }]; },
    xf: (x, X) => { const p = X.p(M.p3(x.p)), o = X.p([0, 0, 0]), q = X.p(M.p3(x.u)); x.p = [p[0], p[1], p[2] != null ? p[2] : x.p[2]]; x.u = M.norm([q[0] - o[0], q[1] - o[1], x.u[2]]); },
    snaps: x => [{ p: M.p3(x.p), k: 'cen' }],
    info: x => `Duvar geçiş parçası ${dgpAd(x)} mm · su tutucu flanş Ø${Math.round(x.D)} × ${Math.round(x.tf * 1000)} mm · ${x.perdeNo || 'perde'} (t = ${Math.round(x.t * 100)} cm)`,
  };
  if (C.PROPFIELDS) C.PROPFIELDS.dgp = [['no', 'Poz / ad', 's'], ['L', 'Boy (m)'], ['D', 'Flanş çapı (mm)'], ['tf', 'Flanş kalınlığı (m)']];

  /* ================= KOMUTLAR ================= */
  C.addCommand(['BORUETIKET', 'BORUYAZI'], 'Boru etiketi: üstte hat kodu + çap + malzeme (PN), altta BTK (boru alt kotu), ortada akış oku. A = aç / kapa, H = hat kodu (seçili borulara ya da varsayılan)', async (I) => {
    const A = AYAR(), k = await I.kw('Boru etiketi', [['H', 'Hat kodu (WW, SW, AT …)'], ['A', A.acik ? 'Etiketleri kapat' : 'Etiketleri aç']], 'H'); if (!k) return;
    if (k === 'A') { A.acik = !A.acik; } else { const s = (C.sel || []).filter(x => x.type === 'pipe'); const v = await I.str(s.length ? `${s.length} boru için hat kodu` : 'Varsayılan hat kodu (boş = yok)', s.length ? (s[0].hat || '') : A.hat); if (v == null) return; if (s.length) s.forEach(x => { x.hat = v.trim(); delete x._c; }); else A.hat = v.trim(); }
    for (const x of C.doc.ents) if (x.type === 'pipe') delete x._c; C.changed();
  }, { noUndo: true });
  C.addCommand(['BORUYON', 'AKISYONU'], 'Seçili boruların akış yönü okunu ters çevirir', async (I) => {
    let s = (C.sel || []).filter(x => x.type === 'pipe'); if (!s.length) s = ((await I.sel('Boruları seçin')) || []).filter(x => x.type === 'pipe'); s.forEach(x => { x.ters = !x.ters; delete x._c; }); C.changed(); C.log(s.length + ' borunun akış yönü çevrildi.');
  });
  C.addCommand(['BORUGECIS', 'PERDEGECIS'], 'Seçili (ya da tüm) boruların perde geçişlerini yeniden kurar: delik açar, geçiş parçası sorar', async (I) => {
    let s = (C.sel || []).filter(x => x.type === 'pipe'); if (!s.length) s = C.doc.ents.filter(x => x.type === 'pipe'); let n = 0, np = 0;
    for (const e of s) { const q = await isle(e, I, true); n += q.n; np += q.np; } C.changed(); C.log(`${n} perde geçişi, ${np} duvar geçiş parçası.`);
  });

  /* ---- detay: her geçiş parçası tipi için ölçülü kesit + özellik tablosu, Mekanik › DETAYLAR paftası ---- */
  const gizli = x => typeof x.gv === 'string' && x.gv.indexOf('DGPD_') === 0;
  { const P2 = C.View2D && C.View2D.prototype; if (P2) for (const k of ['draw', 'pick', 'windowSel', 'snap', 'zoomExtents']) { const f0 = P2[k]; if (f0) P2[k] = function () { if (this.isLayout || C.vpEdit) return f0.apply(this, arguments); const all = C.doc.ents; if (!all.some(gizli)) return f0.apply(this, arguments); C.doc.ents = all.filter(x => !gizli(x)); try { return f0.apply(this, arguments); } finally { C.doc.ents = all; } }; } }
  const ucTipi = c => (['pe', 'pvc', 'ppr'].includes(c) ? 'Düz uç (elektrofüzyon / alın kaynağı)' : c === 'pvck' ? 'Muflu / düz uç' : c === 'duktil' ? 'Flanşlı FF (EN 1092-1 PN10 / PN16)' : c === 'beton' || c === 'ctp' ? 'Muflu' : 'Flanşlı / kaynak ağızlı');
  const malzeme = c => ({ pe: 'PE100 boru + PE100 su tutucu yaka (fabrika kaynaklı)', pvc: 'PVC-U boru + kum kaplı su tutucu bilezik', pvck: 'PVC-U boru + kum kaplı su tutucu bilezik', ppr: 'PP-R boru + su tutucu bilezik', duktil: 'Duktil döküm EN 545, epoksi kaplı, ortası kaynaklı su tutucu flanşlı', celik: 'St37 (S235) çelik, sıcak daldırma galvaniz ya da epoksi', asme: 'Karbon çelik, epoksi kaplı', paslanmaz: 'AISI 316L paslanmaz çelik', galvaniz: 'Galvaniz çelik', ctp: 'CTP, kum kaplı su tutucu yaka', beton: 'Beton boru, su tutucu conta' }[c] || 'Boru malzemesiyle aynı, su tutucu flanşlı');
  /* 45° tarama çizgileri, dikdörtgene kırpılmış */
  const tarama = (x0, y0, x1, y1, ad) => { const out = []; for (let c = x0 - (y1 - y0) + ad / 2; c < x1; c += ad) { const xa = Math.max(x0, c), xb = Math.min(x1, c + (y1 - y0)); if (xb - xa < 1e-4) continue; out.push([[xa, y0 + (xa - c), 0], [xb, y0 + (xb - c), 0]]); } return out; };
  C.addCommand(['DGPDETAY', 'GECISDETAY', 'DUVARGECISDETAY'], 'Duvar geçiş parçalarının ölçülü detayını (kesit + ön görünüş + özellik tablosu) Mekanik grubunda "MEKANİK — DETAYLAR" paftasına koyar (her tip bir detay)', async (I) => {
    const xs = C.doc.ents.filter(x => x.type === 'dgp'); if (!xs.length) { C.warn('Çizimde duvar geçiş parçası yok. Önce perdeden geçen bir boru çizin (geçiş parçası sorusuna Evet).'); return; }
    const tip = new Map(); for (const x of xs) { const k = [x.cins, x.sinif, Math.round(x.od), x.dn, Math.round(x.L * 1000), Math.round(x.D), Math.round(x.tf * 1000)].join('|'); if (!tip.has(k)) tip.set(k, []); tip.get(k).push(x); }
    C.doc.ents = C.doc.ents.filter(x => !gizli(x)); // eski detaylar
    const lays = C.doc.layouts = C.doc.layouts || []; let Ly = lays.find(X => X.dgpDetay);
    const gp = C.grpCur; if (!Ly) { C.grpCur = 'Mekanik'; Ly = C.newLayout('MEKANİK — DETAYLAR', 'A3', 'L'); C.grpCur = gp; Ly.grp = 'Mekanik'; Ly.dgpDetay = true; Ly.f = Object.assign(Ly.f || {}, { baslik: 'DUVAR GEÇİŞ PARÇASI DETAYLARI' }); }
    const bb = C.extents(C.doc.ents.filter(x => x.type !== 'sheet')) || [0, 0, 10, 10]; let ox = bb[2] + 30; const oy = bb[1];
    const bloklar = []; let ix = 0;
    for (const [, grup] of tip) {
      ix++; const x = grup[0], sc = x.D > 700 ? 20 : 10, mm = v => v * sc / 1000; // kağıt mm → model m
      const gv = 'DGPD_' + Date.now().toString(36) + ix, add2 = (type, props) => { const e = C.add(C.newEnt(type, Object.assign({ gv, layer: ensL() }, props))); delete e.sp; return e; };
      const no = `DGP-${ix}`; grup.forEach(g => { g.no = no; delete g._c; });
      const L2 = x.L / 2, r = x.od / 2000, R = x.D / 2000, tf = x.tf / 2, t = x.t / 2, H = R + mm(18), uz = mm(30), th = C.annoH(3), th2 = C.annoH(5), c = [ox + L2 + uz + mm(25), oy];
      const Pt = (s, z) => [c[0] + s, c[1] + z, 0];
      // KESİT — perde (taralı), deliksiz kısımlar
      for (const [z0, z1] of [[R + mm(4), H], [-H, -(R + mm(4))]]) {
        add2('pline', { pts: [Pt(-t, z0), Pt(t, z0), Pt(t, z1), Pt(-t, z1)], closed: true, color: 7, lw: 35 });
        for (const [a, b] of tarama(c[0] - t, c[1] + z0, c[0] + t, c[1] + z1, mm(2.5))) add2('line', { a, b, color: 8, lw: 13 });
      }
      add2('line', { a: Pt(-t, -(R + mm(4))), b: Pt(-t, R + mm(4)), color: 7, lt: 'HIDDEN', lw: 13 }); add2('line', { a: Pt(t, -(R + mm(4))), b: Pt(t, R + mm(4)), color: 7, lt: 'HIDDEN', lw: 13 });
      // geçiş parçası gövdesi (et kalınlığıyla), su tutucu flanş, eksen, bağlanan boru (kesik)
      const et = Math.max(mm(1), (+x.t0 || 0) / 1000 || r * 0.08);
      add2('pline', { pts: [Pt(-L2, r), Pt(L2, r), Pt(L2, -r), Pt(-L2, -r)], closed: true, color: 6, lw: 50 });
      add2('line', { a: Pt(-L2, r - et), b: Pt(L2, r - et), color: 6, lw: 25 }); add2('line', { a: Pt(-L2, -r + et), b: Pt(L2, -r + et), color: 6, lw: 25 });
      add2('pline', { pts: [Pt(-tf, R), Pt(tf, R), Pt(tf, r), Pt(-tf, r)], closed: true, color: 6, lw: 50 }); add2('pline', { pts: [Pt(-tf, -r), Pt(tf, -r), Pt(tf, -R), Pt(-tf, -R)], closed: true, color: 6, lw: 50 });
      add2('line', { a: Pt(-L2 - uz - mm(5), 0), b: Pt(L2 + uz + mm(5), 0), color: 1, lt: 'CENTER', lw: 18 });
      for (const s of [-1, 1]) for (const z of [r, -r]) add2('line', { a: Pt(s * L2, z), b: Pt(s * (L2 + uz), z), color: 8, lt: 'HIDDEN', lw: 18 });
      // ölçüler (yazı ölçeğe göre)
      add2('dim', { k: 'h', a: Pt(-L2, -H), b: Pt(L2, -H), p: Pt(0, -H - mm(10)), txt: `L=${Math.round(x.L * 1000)}`, color: 3 });
      add2('dim', { k: 'v', a: Pt(L2, -r), b: Pt(L2, r), p: Pt(L2 + uz + mm(10), 0), txt: `Ø${Math.round(x.od)}`, color: 3 });
      add2('dim', { k: 'v', a: Pt(-tf, -R), b: Pt(-tf, R), p: Pt(-L2 - uz - mm(10), 0), txt: `Ø${Math.round(x.D)}`, color: 3 });
      add2('dim', { k: 'h', a: Pt(-tf, H), b: Pt(tf, H), p: Pt(0, H + mm(7)), txt: `${Math.round(x.tf * 1000)}`, color: 3 });
      add2('text', { p: Pt(t + mm(2), H - mm(5)), h: th, s: `PERDE t=${Math.round(x.t * 100)} cm`, al: 'L', color: 7 });
      add2('text', { p: Pt(-t - mm(2), -H + mm(2)), h: th * 0.85, s: 'İÇ', al: 'R', color: 8 }); add2('text', { p: Pt(t + mm(2), -H + mm(2)), h: th * 0.85, s: 'DIŞ', al: 'L', color: 8 });
      add2('text', { p: Pt(0, H + mm(20)), h: th * 0.9, s: 'KESİT', al: 'C', color: 7 });
      // ÖN GÖRÜNÜŞ
      const fc = [c[0] + L2 + uz + mm(30) + R + mm(10), c[1]];
      add2('circle', { c: [fc[0], fc[1], 0], r: R, color: 6, lw: 50 }); add2('circle', { c: [fc[0], fc[1], 0], r, color: 6, lw: 35 }); add2('circle', { c: [fc[0], fc[1], 0], r: r - et, color: 6, lw: 18 });
      add2('line', { a: [fc[0] - R - mm(4), fc[1], 0], b: [fc[0] + R + mm(4), fc[1], 0], color: 1, lt: 'CENTER', lw: 18 }); add2('line', { a: [fc[0], fc[1] - R - mm(4), 0], b: [fc[0], fc[1] + R + mm(4), 0], color: 1, lt: 'CENTER', lw: 18 });
      add2('text', { p: [fc[0], fc[1] + H + mm(20), 0], h: th * 0.9, s: 'ÖN GÖRÜNÜŞ', al: 'C', color: 7 });
      // başlık
      const x0b = c[0] - L2 - uz - mm(25), x1b = fc[0] + R + mm(10);
      add2('text', { p: [(x0b + x1b) / 2, c[1] + H + mm(30), 0], h: th2, s: `DUVAR GEÇİŞ PARÇASI ${no}`, al: 'C', color: 2 });
      add2('text', { p: [(x0b + x1b) / 2, c[1] + H + mm(24), 0], h: th, s: `Ö: 1/${sc}`, al: 'C', color: 7 });
      // özellik tablosu
      const rows = [['Boru', ustYazi(x)], ['Uç tipi', ucTipi(x.cins)], ['Boy', `L = ${Math.round(x.L * 1000)} mm (perde t = ${Math.round(x.t * 1000)} mm)`], ['Su tutucu flanş', `Ø${Math.round(x.D)} × ${Math.round(x.tf * 1000)} mm, gövdeye çift taraflı kaynaklı`], ['Malzeme', malzeme(x.cins)], ['Adet', `${grup.length}`], ['Yeri', [...new Set(grup.map(g => g.perdeNo || '?'))].join(', ')], ['Not', 'Perde betonuyla birlikte dökülür; flanş perde ortasında']];
      const rh = mm(6), w1 = mm(32), w2 = Math.max(x1b - x0b - w1, mm(118)), ty0 = c[1] - H - mm(22);
      rows.forEach((rw, k) => { const y = ty0 - k * rh; add2('pline', { pts: [[x0b, y, 0], [x0b + w1 + w2, y, 0], [x0b + w1 + w2, y - rh, 0], [x0b, y - rh, 0]], closed: true, color: 8, lw: 18 }); add2('line', { a: [x0b + w1, y, 0], b: [x0b + w1, y - rh, 0], color: 8, lw: 18 }); add2('text', { p: [x0b + mm(1.5), y - rh * 0.68, 0], h: C.annoH(2.5), s: rw[0], al: 'L', color: 7 }); add2('text', { p: [x0b + w1 + mm(1.5), y - rh * 0.68, 0], h: C.annoH(2.5), s: rw[1], al: 'L', color: 7 }); });
      const ents = C.doc.ents.filter(q => q.gv === gv && q.type !== 'text' && q.type !== 'dim'), e0 = C.extents(ents), eb = [e0[0] - mm(22), e0[1] - mm(3), e0[2] + mm(22), Math.max(e0[3], c[1] + H + mm(36))], k = 1000 / sc;
      bloklar.push({ gv, sc, eb, w: (eb[2] - eb[0]) * k, h: (eb[3] - eb[1]) * k });
      ox = eb[2] + 5;
    }
    // pafta boyutu: bloklar yan yana (antet sağ altta) sığana kadar büyüt
    const yerles = () => { const fr = C.layoutFrame(Ly), out = []; let x = fr.x0 + 6, y = fr.y1 - 6, sh = 0; for (const B of bloklar) { if (x + B.w > fr.x1 - 6 && out.length) { x = fr.x0 + 6; y -= sh + 6; sh = 0; } const bot = y - B.h, xr = x + B.w; if (bot < fr.y0 + 4 || (bot < fr.tbTop + 2 && xr > fr.tbX - 2)) return null; out.push({ B, x, y: bot }); x += B.w + 6; sh = Math.max(sh, B.h); } return out; };
    let yer = null; for (const sz of ['A3', 'A2', 'A1', 'A0']) { Ly.size = sz; Ly.orient = 'L'; if ((yer = yerles())) break; }
    if (!yer) { Ly.size = 'A0'; yer = []; let y = C.layoutFrame(Ly).y1 - 6; for (const B of bloklar) { y -= B.h; yer.push({ B, x: C.layoutFrame(Ly).x0 + 6, y }); } }
    Ly.vps = yer.map(({ B, x, y }) => ({ x, y, w: B.w, h: B.h, cx: (B.eb[0] + B.eb[2]) / 2, cy: (B.eb[1] + B.eb[3]) / 2, scale: B.sc, gvOnly: B.gv, frame: { on: false }, lock: true }));
    C.changed(); C.layoutIdx = lays.indexOf(Ly); C.grpCur = 'Mekanik'; C.setView('layout'); C.emit('layouts'); setTimeout(() => { try { C.views.lay.zoomExtents(); } catch (er) { } }, 60);
    C.log(`${tip.size} tip duvar geçiş parçası detayı "${Ly.name}" (${Ly.size}) paftasına kondu — toplam ${xs.length} adet; planda ${[...tip.values()].map(g => g[0].no).join(', ')} olarak adlandırıldı.`);
  });

  try {
    const R = C.ribbon; if (R && Array.isArray(R.tabs)) { const tab = R.tabs.find(t => t[0] === 'Mekanik'); if (tab) { const pn = tab[1].find(p => p[0] === 'Borulama'); if (pn && !pn[1].some(b => b.cmd === 'DGPDETAY')) pn[1].push({ cmd: 'BORUETIKET', t: 'Boru etiketi', i: 'text' }, { cmd: 'BORUYON', t: 'Akış yönü çevir', i: 'rot' }, { cmd: 'BORUGECIS', t: 'Perde geçişleri', i: 'cut' }, { cmd: 'DGPDETAY', t: 'Geçiş parçası detayı', i: 'print' }); } R.render(); }
  } catch (er) { console.error('boru-perde şerit', er); }
})(window.C);

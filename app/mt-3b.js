/* ArıtmaCAD — MEKANİK TESİSAT · 3B
   1) Tesisat nesnelerinin 3B gövdeleri: radyatör / elektrikli ısıtıcı, borular, kolonlar, fancoil / klima, fan, panjur, menfez, hava kanalı, rooftop.
      Böylece 3B sekmesinde ve paftalardaki 3B görünüşlerde (PERSPEKTIFPAFTA) yerleriyle görünürler.
   2) Rapor için izometrik (perspektif) çizimler — SVG: bina ısı haritası (döşemeler W/m², dış duvar ve pencereler yüzey ısı akısı W/m²)
      ve tesisat perspektifleri (ısıtma, soğutma, havalandırma). */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, MT = C.MT, V = C.MTV; if (!T || !MT) return;
  const ins = () => C._ins, oda = id => C.doc.ents.find(e => e.id === id && e.type === 'mtmahal'), hOf = e => { const o = oda(e.mid); return o ? (+o.h || 3) : (MT.set().hKat || 3); };
  const f = (v, d = 0) => (isFinite(v) ? (+v).toFixed(d) : '—').replace('.', ',');

  /* ---------- 1) gövdeler ---------- */
  const kutu = (out, c, ang, Lx, Wy, z0, z1, col) => { const u = [Math.cos(ang), Math.sin(ang)], n = [-u[1], u[0]], p = (s, o, z) => [c[0] + u[0] * s + n[0] * o, c[1] + u[1] * s + n[1] * o, z], a = Lx / 2, b = Wy / 2; ins().hexa(out, [p(-a, -b, z0), p(a, -b, z0), p(a, b, z0), p(-a, b, z0), p(-a, -b, z1), p(a, -b, z1), p(a, b, z1), p(-a, b, z1)], col); };
  const hat = (out, pts, z, w, hh, col, off = 0) => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = M.dist2(a, b); if (l < 0.01) continue; const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), n = [-Math.sin(ang), Math.cos(ang)]; kutu(out, [(a[0] + b[0]) / 2 + n[0] * off, (a[1] + b[1]) / 2 + n[1] * off], ang, l + w, w, z, z + hh, col); } };
  const mesh = fn => e => { const I = ins(); if (!I) return []; const out = I.newMesh(); try { fn(e, out); } catch (er) { return []; } return out.v.length ? [out] : []; };
  const KIR = [0.85, 0.20, 0.18], MAV = [0.20, 0.35, 0.85], CAM = [0.20, 0.75, 0.80], MOR = [0.75, 0.30, 0.75], BEY = [0.94, 0.94, 0.92], TUR = [0.93, 0.55, 0.20], GRI = [0.72, 0.74, 0.76];
  /* bitmiş zemin (en üst kaplama — seramik vb.) ve tavan altı kotu: mahal kotu yerine modeldeki gerçek katmanlardan */
  const icinde = (p, pts) => { try { return C.pointInPoly ? C.pointInPoly(p, pts) : MT.inPoly(p, pts); } catch (er) { return false; } };
  MT.zeminUst = (p, z0) => { let z = z0; for (const x of C.doc.ents) { if (!x.pts || x.pts.length < 3) continue; if (x.type === 'kaplama' && x.kind === 'zemin') { const zk = +x.z0 || 0, t = ((+x.zbt || 0) + (+x.xps || 0) + (+x.sap || 0) + (+x.kt || 0)) / 100; if (zk > z0 - 0.6 && zk < z0 + 0.9 && icinde(p, x.pts)) z = Math.max(z, zk + t); } else if (x.type === 'yalitim' && x.kind === 'zemin') { const zk = +x.z0 || 0, t = (x.mat && x.mat !== 'yok' ? (+x.t || 0) / 100 : 0) + 0.006; if (zk > z0 - 0.6 && zk < z0 + 0.9 && icinde(p, x.pts)) z = Math.max(z, zk + t); } else if (x.type === 'plak' && x.kind !== 'radye') { const zt = +x.zt || 0; if (zt > z0 - 0.3 && zt < z0 + 0.6 && icinde(p, x.pts)) z = Math.max(z, zt); } } return z; };
  MT.tavanAlt = (p, z0, hOda) => { let z = null; for (const x of C.doc.ents) { if (x.type !== 'plak' || !x.pts || x.pts.length < 3) continue; const alt = (+x.zt || 0) - (+x.t || 0.15); if (alt > z0 + 1.8 && icinde(p, x.pts) && (z == null || alt < z)) z = alt; } return z != null ? z : z0 + hOda; };
  /* ---- gerçeğe yakın cihaz gövdeleri ---- */
  /* yerel eksen: s = duvar boyunca, o = duvardan odaya doğru, z */
  const eksen = (p, ang, ic) => { const u = [Math.cos(ang), Math.sin(ang)]; let n = [-u[1], u[0]]; if (ic && (ic[0] * n[0] + ic[1] * n[1]) < 0) n = [-n[0], -n[1]]; return { P: (s, o, z) => [p[0] + u[0] * s + n[0] * o, p[1] + u[1] * s + n[1] * o, z], u, n }; };
  const bx = (out, F, s0, s1, o0, o1, z0, z1, col) => { if (s1 - s0 < 1e-4 || o1 - o0 < 1e-4 || z1 - z0 < 1e-4) return; ins().hexa(out, [F.P(s0, o0, z0), F.P(s1, o0, z0), F.P(s1, o1, z0), F.P(s0, o1, z0), F.P(s0, o0, z1), F.P(s1, o0, z1), F.P(s1, o1, z1), F.P(s0, o1, z1)], col); };
  /* silindir: merkez c (3B), eksen yönü d (birim), yarıçap r, boy L */
  const sil = (out, c, d, r, Ln, col, n = 18) => { let a = Math.abs(d[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]; const x = M.norm(M.cross(d, a)), y = M.cross(d, x), v0 = out.v.length, c1 = [c[0] + d[0] * Ln, c[1] + d[1] * Ln, c[2] + d[2] * Ln];
    for (let i = 0; i < n; i++) { const t = 2 * Math.PI * i / n, q = [x[0] * Math.cos(t) + y[0] * Math.sin(t), x[1] * Math.cos(t) + y[1] * Math.sin(t), x[2] * Math.cos(t) + y[2] * Math.sin(t)]; out.v.push([c[0] + q[0] * r, c[1] + q[1] * r, c[2] + q[2] * r], [c1[0] + q[0] * r, c1[1] + q[1] * r, c1[2] + q[2] * r]); }
    const ia = out.v.length; out.v.push(c, c1);
    for (let i = 0; i < n; i++) { const a0 = v0 + 2 * i, b0 = v0 + 2 * ((i + 1) % n), a1 = a0 + 1, b1 = b0 + 1; out.f.push([a0, b0, b1], [a0, b1, a1], [ia, b0, a0], [ia + 1, a1, b1]); out.fc.push(col, col, col, col); } };
  MT._g3 = { eksen, bx, sil };
  const BYZ = [0.96, 0.96, 0.95], KOYU = [0.18, 0.19, 0.21], KROM = [0.80, 0.82, 0.84], GALV = [0.70, 0.72, 0.74], GRIA = [0.86, 0.87, 0.88];
  const radyator = (e, out) => {
    const zf = MT.zeminUst(e.cp || e.p, +e.z0 || 0), F = eksen(e.p, e.ang || 0, e.cp ? [e.cp[0] - e.p[0], e.cp[1] - e.p[1]] : null), z = zf + (e.tip === 'E' ? 0.08 : 0.12), H = (e.H || 600) / 1000, hl = e.L / 2;
    if (e.tip !== 'E') {
      const np = { '11': 1, '21': 2, '22': 2, '33': 3 }[e.tip] || 2, D = { '11': 0.06, '21': 0.07, '22': 0.10, '33': 0.155 }[e.tip] || 0.10, ob = -0.07, of = ob + D, pk = 0.012;
      for (let i = 0; i < np; i++) { const o = np === 1 ? of - pk : ob + (D - pk) * i / (np - 1); bx(out, F, -hl, hl, o, o + pk, z, z + H, BYZ); }
      /* konvektör kanatları + ön panel olukları */
      if (D > 0.05) bx(out, F, -hl + 0.02, hl - 0.02, ob + pk, of - pk, z + 0.03, z + H - 0.03, GALV);
      const adim = e.L > 1.6 ? 0.0667 : 0.0333, ns = Math.max(3, Math.round(e.L / adim)); for (let i = 0; i < ns; i++) { const s = -hl + e.L * (i + 0.5) / ns; bx(out, F, s - adim * 0.34, s + adim * 0.34, of, of + 0.004, z + 0.02, z + H - 0.02, BYZ); }
      bx(out, F, -hl, hl, ob, of, z + H, z + H + 0.006, GRIA); for (let i = 0; i < Math.round(e.L / 0.05); i++) bx(out, F, -hl + 0.012 + i * 0.05, -hl + 0.038 + i * 0.05, ob + 0.012, of - 0.012, z + H + 0.006, z + H + 0.008, KOYU);
      bx(out, F, -hl - 0.004, -hl, ob, of, z, z + H, BYZ); bx(out, F, hl, hl + 0.004, ob, of, z, z + H, BYZ);
      /* termostatik vana + geri dönüş rakoru + bağlantı boruları (zemine) */
      bx(out, F, hl + 0.004, hl + 0.05, of - 0.045, of - 0.015, z + H - 0.07, z + H - 0.04, KROM); sil(out, F.P(hl + 0.05, of - 0.03, z + H - 0.055), [F.u[0], F.u[1], 0], 0.018, 0.05, BYZ, 12);
      bx(out, F, hl + 0.004, hl + 0.04, of - 0.045, of - 0.015, z + 0.03, z + 0.06, KROM);
      sil(out, F.P(hl + 0.03, of - 0.03, zf), [0, 0, 1], 0.009, z - zf + H - 0.07, KIR, 10); sil(out, F.P(hl + 0.03, of - 0.03, zf), [0, 0, 1], 0.0091, 0.0001, KIR, 6); sil(out, F.P(hl + 0.07, of - 0.03, zf), [0, 0, 1], 0.009, z - zf + 0.05, MAV, 10); bx(out, F, hl + 0.03, hl + 0.075, of - 0.036, of - 0.024, z + 0.036, z + 0.05, MAV);
      for (const s of [-hl + 0.12, hl - 0.12]) bx(out, F, s - 0.015, s + 0.015, -0.1, ob, z + H * 0.75, z + H * 0.75 + 0.03, GALV);
      return;
    }
    if (e.elTip === 'fanli') { const w = e.L, zc = zf + 2.1; bx(out, F, -w / 2, w / 2, -0.06, w * 0.7, zc, zc + w, [0.85, 0.30, 0.20]); sil(out, F.P(0, w * 0.7, zc + w / 2), [F.n[0], F.n[1], 0], w * 0.4, 0.012, KOYU, 20); sil(out, F.P(0, w * 0.7 + 0.012, zc + w / 2), [F.n[0], F.n[1], 0], w * 0.12, 0.01, KROM, 12); for (let i = -2; i <= 2; i++) bx(out, F, -w * 0.4, w * 0.4, w * 0.7 + 0.012, w * 0.7 + 0.018, zc + w / 2 + i * w * 0.14 - 0.004, zc + w / 2 + i * w * 0.14 + 0.004, KROM); bx(out, F, -0.03, 0.03, -0.1, -0.06, zc + w * 0.3, zc + w * 0.7, GALV); return; }
    if (e.elTip === 'panel') { const zc = zf + 1.9; bx(out, F, -hl, hl, -0.07, -0.04, zc, zc + H, [0.97, 0.97, 0.96]); bx(out, F, -hl + 0.02, hl - 0.02, -0.04, -0.037, zc + 0.02, zc + H - 0.02, [0.90, 0.88, 0.84]); for (const s of [-hl + 0.1, hl - 0.1]) bx(out, F, s - 0.01, s + 0.01, -0.1, -0.07, zc + H / 2 - 0.02, zc + H / 2 + 0.02, GALV); return; }
    /* duvar tipi konvektör */
    const ob = -0.075, of = 0.015; bx(out, F, -hl, hl, ob, of - 0.006, z, z + H, BYZ); bx(out, F, -hl + 0.006, hl - 0.006, of - 0.006, of, z + 0.05, z + H - 0.07, [0.99, 0.99, 0.98]);
    for (let i = 0; i < 5; i++) bx(out, F, -hl + 0.03, hl - 0.11, of - 0.006, of - 0.002, z + H - 0.06 + i * 0.011, z + H - 0.054 + i * 0.011, KOYU);
    bx(out, F, -hl + 0.03, hl - 0.03, ob + 0.012, of - 0.02, z + H, z + H + 0.002, KOYU); bx(out, F, -hl + 0.03, hl - 0.03, ob + 0.012, of - 0.02, z - 0.002, z, KOYU);
    bx(out, F, hl - 0.09, hl - 0.02, of - 0.006, of + 0.004, z + H - 0.06, z + H - 0.012, KOYU); sil(out, F.P(hl - 0.055, of + 0.004, z + H - 0.036), [F.n[0], F.n[1], 0], 0.012, 0.01, KROM, 12);
    for (const s of [-hl + 0.08, hl - 0.08]) bx(out, F, s - 0.012, s + 0.012, -0.1, ob, z + H * 0.3, z + H * 0.7, GALV);
    for (const s2 of [-hl + 0.1, hl - 0.1]) bx(out, F, s2 - 0.012, s2 + 0.012, ob + 0.005, of - 0.01, zf, z, GALV); /* ayaklar bitmiş zemine (seramik) basar */
    /* kablo + priz */
    bx(out, F, hl + 0.06, hl + 0.14, -0.1, -0.085, z + 0.1, z + 0.18, BYZ); bx(out, F, hl, hl + 0.1, ob + 0.02, ob + 0.03, z + 0.13, z + 0.14, KOYU);
  };
  if (T.mtrad) T.mtrad.mesh = mesh(radyator);
  if (T.mtboru) T.mtboru.mesh = mesh((e, o) => { const sg = e.sys === 'sog', z = (+e.z0 || 0) + (sg ? hOf(e) - 0.45 : 0.06), d = 0.035; hat(o, e.pts, z, d, d, sg ? CAM : KIR, 0.04); hat(o, e.pts, z, d, d, sg ? MOR : MAV, -0.04); });
  if (T.mtkolon) T.mtkolon.mesh = mesh((e, o) => { const sg = e.sys === 'sog', zs = C.doc.ents.filter(x => x.type === (sg ? 'mtfc' : 'mtrad')).map(x => +x.z0 || 0); if (!zs.length) return; const z0 = Math.min(...zs) - 0.1, z1 = Math.max(...zs) + (sg ? 3 : 0.3); sil(o, [e.p[0] - 0.05, e.p[1], z0], [0, 0, 1], 0.025, z1 - z0, sg ? CAM : KIR, 12); sil(o, [e.p[0] + 0.05, e.p[1], z0], [0, 0, 1], 0.025, z1 - z0, sg ? MOR : MAV, 12); });
  /* dış ünite tretuvar üstüne oturur: noktadaki tretuvar üst kotu (yoksa null → duvar konsolu) */
  const tretuvarZ = p => { let best = null; for (const t of C.doc.ents) { if (t.type !== 'tretuvar' || !t.pts || t.pts.length < 2) continue; const w = +t.w || 1, n = t.pts.length; let d = Infinity; for (let i = 0; i < n; i++) { const a = t.pts[i], b = t.pts[(i + 1) % n], l2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2; if (l2 < 1e-9) continue; let k = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l2; k = Math.max(0, Math.min(1, k)); d = Math.min(d, Math.hypot(p[0] - a[0] - (b[0] - a[0]) * k, p[1] - a[1] - (b[1] - a[1]) * k)); } if (d <= w + 0.3) { const zt = (+t.zg || 0) + (+t.h || 0.15) - Math.min(d, w) * ((+t.egim || 2) / 100); if (best == null || zt > best) best = zt; } } return best; };
  const klima = (e, out) => {
    const z = +e.z0 || 0, h = hOf(e);
    if (e.tip === 'split') {
      const F = eksen(e.p, e.ang || 0, e.dp ? [e.p[0] - e.dp[0], e.p[1] - e.dp[1]] : null), tv = MT.tavanAlt(e.p, z, h), zb = Math.min(tv - 0.33, e.zm != null ? z + +e.zm : tv - 0.36), w = 0.45, ob = -0.12;
      /* iç ünite: gövde, yuvarlatılmış ön, üst emiş ızgarası, alt üfleme kanadı, gösterge */
      bx(out, F, -w, w, ob, ob + 0.16, zb, zb + 0.30, BYZ); bx(out, F, -w, w, ob + 0.16, ob + 0.20, zb + 0.07, zb + 0.28, BYZ); bx(out, F, -w, w, ob + 0.20, ob + 0.215, zb + 0.11, zb + 0.25, BYZ);
      bx(out, F, -w + 0.04, w - 0.04, ob + 0.02, ob + 0.15, zb + 0.30, zb + 0.303, KOYU); bx(out, F, -w + 0.05, w - 0.05, ob + 0.16, ob + 0.205, zb + 0.035, zb + 0.07, KOYU); bx(out, F, -w + 0.05, w - 0.05, ob + 0.15, ob + 0.21, zb + 0.022, zb + 0.032, GRIA);
      bx(out, F, w - 0.16, w - 0.06, ob + 0.215, ob + 0.217, zb + 0.13, zb + 0.15, [0.25, 0.75, 0.55]); bx(out, F, -w - 0.006, -w, ob, ob + 0.16, zb, zb + 0.30, GRIA); bx(out, F, w, w + 0.006, ob, ob + 0.16, zb, zb + 0.30, GRIA);
      if (e.dp) { /* dış ünite: gövde, fan ızgarası, ayaklar, soğutucu boru hattı */
        const dx = e.dp[0] - e.p[0], dy = e.dp[1] - e.p[1], dl = Math.hypot(dx, dy) || 1, G = eksen(e.dp, e.ang || 0, [dx, dy]), zTr = tretuvarZ(e.dp), yerde = zTr != null, z0 = yerde ? zTr + 0.06 : z + 0.3, W = 0.4, Dp = 0.15;
        bx(out, G, -W, W, -Dp, Dp, z0, z0 + 0.55, GRIA); bx(out, G, -W - 0.005, W + 0.005, -Dp - 0.005, Dp + 0.005, z0 + 0.55, z0 + 0.56, BYZ);
        sil(out, G.P(-0.1, Dp, z0 + 0.275), [G.n[0], G.n[1], 0], 0.22, 0.006, KOYU, 24); sil(out, G.P(-0.1, Dp + 0.006, z0 + 0.275), [G.n[0], G.n[1], 0], 0.05, 0.012, KROM, 12);
        for (let i = -3; i <= 3; i++) bx(out, G, -0.33, 0.13, Dp + 0.006, Dp + 0.012, z0 + 0.275 + i * 0.06 - 0.003, z0 + 0.275 + i * 0.06 + 0.003, BYZ); for (const s2 of [-0.1 - 0.22, -0.1, -0.1 + 0.22]) bx(out, G, s2 - 0.003, s2 + 0.003, Dp + 0.006, Dp + 0.012, z0 + 0.06, z0 + 0.49, BYZ);
        for (let i = 0; i < 8; i++) bx(out, G, W - 0.16, W - 0.03, Dp, Dp + 0.003, z0 + 0.08 + i * 0.05, z0 + 0.10 + i * 0.05, KOYU);
        if (yerde) { for (const s2 of [-W + 0.08, W - 0.08]) bx(out, G, s2 - 0.04, s2 + 0.04, -Dp - 0.02, Dp + 0.02, zTr, z0, KOYU); } /* tretuvar üstünde, titreşim takozlu ayaklar */
        else for (const s2 of [-W + 0.08, W - 0.08]) { bx(out, G, s2 - 0.03, s2 + 0.03, -Dp - 0.2, Dp + 0.02, z0 - 0.04, z0, GALV); bx(out, G, s2 - 0.02, s2 + 0.02, -Dp - 0.2, -Dp - 0.17, z0 - 0.3, z0, GALV); }
        sil(out, G.P(W - 0.05, -Dp - 0.1, z0 + 0.45), [0, 0, 1], 0.022, Math.max(0.1, zb + 0.1 - z0 - 0.45), [0.93, 0.93, 0.92], 10); sil(out, G.P(W - 0.05, -Dp - 0.1, zb + 0.1), [-G.n[0], -G.n[1], 0], 0.022, Math.max(0.1, dl - Dp - 0.1), [0.93, 0.93, 0.92], 10);
      }
      return;
    }
    /* kaset tipi fancoil: tavan içi gövde, ön panel, dört yön üfleme, ortada emiş ızgarası, boru bağlantıları */
    const F = eksen(e.p, 0, null), zt = z + h - 0.2;
    bx(out, F, -0.285, 0.285, -0.285, 0.285, zt - 0.2, zt + 0.06, GALV); bx(out, F, -0.31, 0.31, -0.31, 0.31, zt - 0.235, zt - 0.2, BYZ);
    bx(out, F, -0.18, 0.18, -0.18, 0.18, zt - 0.238, zt - 0.235, KOYU); for (let i = -3; i <= 3; i++) bx(out, F, -0.18, 0.18, i * 0.05 - 0.004, i * 0.05 + 0.004, zt - 0.241, zt - 0.238, GRIA);
    for (const [a, b] of [[-0.29, -0.24], [0.24, 0.29]]) { bx(out, F, -0.22, 0.22, a, b, zt - 0.238, zt - 0.235, KOYU); bx(out, F, a, b, -0.22, 0.22, zt - 0.238, zt - 0.235, KOYU); }
    sil(out, F.P(0.285, 0.15, zt - 0.05), [1, 0, 0], 0.014, 0.12, CAM, 10); sil(out, F.P(0.285, 0.21, zt - 0.05), [1, 0, 0], 0.014, 0.12, MOR, 10); sil(out, F.P(0.285, -0.2, zt - 0.1), [1, 0, 0], 0.012, 0.12, GRIA, 10);
    for (const [a, b] of [[-0.27, -0.27], [0.27, -0.27], [0.27, 0.27], [-0.27, 0.27]]) sil(out, F.P(a, b, zt + 0.06), [0, 0, 1], 0.005, 0.14, KROM, 6);
  };
  if (T.mtfc) T.mtfc.mesh = mesh(klima);
  if (T.mthv) T.mthv.mesh = mesh((e, o) => { const z = +e.z0 || 0, h = hOf(e), a = e.ang || 0, r = Math.max(0.15, (parseInt(String(e.model || '').replace(/\D/g, ''), 10) || 300) / 2000);
    switch (e.kind) {
      case 'duvarfan': kutu(o, e.p, a, 2 * r, (e.t || 0.2) + 0.1, z + h - 0.5 - 2 * r, z + h - 0.5, TUR); break;
      case 'kanalfan': kutu(o, e.p, a, 0.25, (e.t || 0.2) + 0.1, z + h - 0.75, z + h - 0.5, TUR); break;
      case 'panjur': kutu(o, e.p, a, e.w || 0.6, (e.t || 0.2) + 0.06, z + 0.3, z + 0.3 + (e.w || 0.6), [0.35, 0.70, 0.40]); break;
      case 'catifan': kutu(o, e.p, 0, 2 * r, 2 * r, z + h + 0.2, z + h + 0.65, TUR); break;
      case 'hucrefan': kutu(o, e.p, 0, 1.0, 0.7, z + h - 0.8, z + h - 0.2, TUR); break;
      case 'rooftop': kutu(o, e.p, 0, 2.2, 1.4, z + h + 0.3, z + h + 1.4, [0.55, 0.65, 0.85]); break;
      default: { const s = Math.max(0.15, (e.boy || 300) / 1000); kutu(o, e.p, 0, s, s, z + h - 0.12, z + h - 0.06, e.sys === 'besleme' ? MAV : TUR); }
    } });
  if (T.mtkanal) T.mtkanal.mesh = mesh((e, o) => { const z1 = (+e.z0 || 0) + hOf(e) - 0.15; hat(o, e.pts, z1 - e.b / 1000, e.a / 1000, e.b / 1000, e.sys === 'besleme' ? [0.55, 0.65, 0.90] : [0.93, 0.70, 0.45]); });
  for (const t of ['mtrad', 'mtboru', 'mtkolon', 'mtfc', 'mthv', 'mtkanal']) if (T[t] && !T[t].ifc) T[t].ifc = t === 'mtboru' ? 'IfcPipeSegment' : t === 'mtkanal' ? 'IfcDuctSegment' : 'IfcBuildingElementProxy';

  /* ---------- 2) rapor: izometrik SVG ---------- */
  const SEQ = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'], TRN = ['#fde3d3', '#f9c3a3', '#f3a074', '#eb6834', '#c9521f', '#9c3d14', '#6e2a0c'], MUT = '#898781', INK = '#0b0b0b', INK2 = '#52514e';
  const kad = (R, t) => R[Math.max(0, Math.min(R.length - 1, Math.floor(t * R.length - 1e-9)))];
  const nice = v => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return ([1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find(q => n <= q + 1e-9) || 10) * p; };
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  /* sahne: yüzeyler { p:[[x,y,z]…], fill, stroke, op, sw, kat, tt } ve çizgiler { p:[a,b], stroke, sw, dash, kat } → SVG */
  const sahne = (items, W, lej) => {
    if (!items.length) return ''; const c = 0.866, s = 0.5, pr = q => [(q[0] - q[1]) * c, -(q[0] + q[1]) * s - q[2] * 1.0];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const it of items) for (const q of it.p) { const a = pr(q); x0 = Math.min(x0, a[0]); y0 = Math.min(y0, a[1]); x1 = Math.max(x1, a[0]); y1 = Math.max(y1, a[1]); }
    const k = Math.min((W - 40) / (x1 - x0 || 1), 430 / (y1 - y0 || 1)), H = (y1 - y0) * k + 30, P = q => { const a = pr(q); return ((a[0] - x0) * k + (W - (x1 - x0) * k) / 2).toFixed(1) + ',' + ((a[1] - y0) * k + 15).toFixed(1); };
    /* derinlik: uzak (x+y büyük) önce çizilir; aynı katta döşeme en önce */
    const key = it => (it.kat || 0) * 1e6 + (it.sira || 0) * 1e5 - it.p.reduce((a, q) => a + q[0] + q[1], 0) / it.p.length * 100 + it.p.reduce((a, q) => a + q[2], 0) / it.p.length;
    const body = items.slice().sort((a, b) => key(a) - key(b)).map(it => it.p.length === 2 && !it.fill ? `<line x1="${P(it.p[0]).split(',')[0]}" y1="${P(it.p[0]).split(',')[1]}" x2="${P(it.p[1]).split(',')[0]}" y2="${P(it.p[1]).split(',')[1]}" stroke="${it.stroke}" stroke-width="${it.sw || 1.5}"${it.dash ? ' stroke-dasharray="' + it.dash + '"' : ''} stroke-linecap="round"/>` : `<polygon points="${it.p.map(P).join(' ')}" fill="${it.fill || 'none'}" fill-opacity="${it.op == null ? 1 : it.op}" stroke="${it.stroke || '#fcfcfb'}" stroke-width="${it.sw || 1}" stroke-linejoin="round">${it.tt ? `<title>${esc(it.tt)}</title>` : ''}</polygon>`).join('');
    return `<svg class="ch" viewBox="0 0 ${W} ${H + (lej ? 34 : 0)}" width="${W}" height="${H + (lej ? 34 : 0)}" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Arial, sans-serif" font-size="11">${body}${lej ? `<g transform="translate(0,${H + 6})">${lej}</g>` : ''}</svg>`;
  };
  const prizma = (out, c, ang, Lx, Wy, z0, z1, fill, o = {}) => { const u = [Math.cos(ang), Math.sin(ang)], n = [-u[1], u[0]], q = (sx, sy, z) => [c[0] + u[0] * sx + n[0] * sy, c[1] + u[1] * sx + n[1] * sy, z], a = Lx / 2, b = Wy / 2, cs = [[-a, -b], [a, -b], [a, b], [-a, b]]; for (let i = 0; i < 4; i++) { const p1 = cs[i], p2 = cs[(i + 1) % 4], m = q((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, 0), dx = m[0] - c[0], dy = m[1] - c[1]; if (dx + dy < 0) out.push(Object.assign({ p: [q(p1[0], p1[1], z0), q(p2[0], p2[1], z0), q(p2[0], p2[1], z1), q(p1[0], p1[1], z1)], fill, stroke: o.stroke || INK2, sw: 0.7, sira: 2 }, o)); } out.push(Object.assign({ p: cs.map(p => q(p[0], p[1], z1)), fill, stroke: o.stroke || INK2, sw: 0.7, sira: 2 }, o)); };
  const katNo = () => { const zs = [...new Set(MT.mahaller().map(e => +e.z0 || 0))].sort((a, b) => a - b); return z => Math.max(0, zs.findIndex(v => Math.abs(v - z) < 1e-6)); };
  /* bina iskeleti: döşemeler + dış duvarlar (soluk) */
  const iskelet = (out, dolu) => { const kn = katNo(); for (const e of MT.mahaller()) { const z = +e.z0 || 0, h = +e.h || 3, kt = kn(z); out.push({ p: e.pts.map(p => [p[0], p[1], z]), fill: dolu ? dolu(e) : '#f0efec', stroke: '#c3c2b7', sw: 0.8, kat: kt, sira: 0, tt: `${e.no} ${e.ad}` }); for (const y of e.yuz || []) { if (y.k !== 'dis') continue; const d = (y.a[0] + y.b[0] + y.a[1] + y.b[1]) / 2, cc = e.lp || MT.icNokta(e.pts), ark = d > cc[0] + cc[1]; out.push({ p: [[y.a[0], y.a[1], z], [y.b[0], y.b[1], z], [y.b[0], y.b[1], z + h], [y.a[0], y.a[1], z + h]], fill: '#e1e0d9', op: ark ? 0.55 : 0.12, stroke: '#898781', sw: 0.6, kat: kt, sira: ark ? 1 : 3 }); } } };
  const fig = (bas, svg) => svg ? `<figure><figcaption>${esc(bas)}</figcaption>${svg}</figure>` : '';

  MT.rapor3B = {
    isiHaritasi: hes => {
      const res = hes.res.filter(x => x.r.ti != null); if (!res.length) return ''; const kn = katNo(), out = [], qA = nice(Math.max(1, ...res.map(x => x.r.qA))); let qW = 1;
      const duv = []; for (const { e, r } of hes.res) { const z = +e.z0 || 0, h = +e.h || 3, kt = kn(z), cc = e.lp || MT.icNokta(e.pts);
        out.push({ p: e.pts.map(p => [p[0], p[1], z]), fill: r.ti == null ? '#e1e0d9' : kad(SEQ, r.qA / qA), stroke: '#fcfcfb', sw: 1.5, kat: kt, sira: 0, tt: `${e.no} ${e.ad}: ${r.ti == null ? 'ısıtılmıyor' : Math.round(r.Q) + ' W · ' + f(r.qA) + ' W/m²'}` });
        if (r.ti == null) continue;
        for (const it of r.items) { if (it.tur !== 'DD' || !it._y) continue; const y = it._y, q = it.U * it.dt, ark = (y.a[0] + y.b[0] + y.a[1] + y.b[1]) / 2 > cc[0] + cc[1]; qW = Math.max(qW, q); duv.push({ p: [[y.a[0], y.a[1], z], [y.b[0], y.b[1], z], [y.b[0], y.b[1], z + h], [y.a[0], y.a[1], z + h]], q, op: ark ? 0.9 : 0.28, kat: kt, sira: ark ? 1 : 3, tt: `${e.no} ${V.YON_AD[y.yon] || ''} dış duvar: ${f(q, 1)} W/m² (U = ${f(it.U, 2)})` });
          const ux = (y.b[0] - y.a[0]) / y.L, uy = (y.b[1] - y.a[1]) / y.L; for (const a of y.ac || []) { const o = C.byId(a.id), hf = o && ins() ? ins().hostFrame(o) : null; if (!hf) continue; const c0 = [hf.sf.a[0] + hf.sf.u[0] * (+o.s || 0), hf.sf.a[1] + hf.sf.u[1] * (+o.s || 0)], s = (c0[0] - y.a[0]) * ux + (c0[1] - y.a[1]) * uy, s0 = Math.max(0, s - a.w / 2), s1 = Math.min(y.L, s + a.w / 2), zb = z + (a.kind === 'kapi' ? 0 : (+o.par || 0.8)), pen = r.items.find(p => (p.tur === 'PN' || p.tur === 'KP') && p.yon === y.yon && Math.abs(p.w - a.w) < 1e-6), qp = pen ? pen.U * pen.dt : 0; qW = Math.max(qW, qp); duv.push({ p: [[y.a[0] + ux * s0, y.a[1] + uy * s0, zb], [y.a[0] + ux * s1, y.a[1] + uy * s1, zb], [y.a[0] + ux * s1, y.a[1] + uy * s1, zb + a.h], [y.a[0] + ux * s0, y.a[1] + uy * s0, zb + a.h]], q: qp, op: ark ? 1 : 0.5, kat: kt, sira: ark ? 1.5 : 3.5, pen: 1, tt: `${e.no} ${a.kind === 'kapi' ? 'kapı' : 'pencere'} ${f(a.w, 2)}×${f(a.h, 2)} m: ${f(qp, 1)} W/m²` }); } } }
      const qWm = nice(qW); duv.forEach(d => out.push({ p: d.p, fill: kad(TRN, d.q / qWm), op: d.op, stroke: d.pen ? INK : '#fcfcfb', sw: d.pen ? 1 : 0.8, kat: d.kat, sira: d.sira, tt: d.tt }));
      const lej = SEQ.map((c2, i) => `<rect x="${20 + i * 26}" y="0" width="24" height="10" fill="${c2}"/>`).join('') + `<text x="20" y="23" fill="${MUT}">Döşeme: mahal ısı kaybı 0 → ${Math.round(qA)} W/m²</text>` + TRN.map((c2, i) => `<rect x="${360 + i * 26}" y="0" width="24" height="10" fill="${c2}"/>`).join('') + `<text x="360" y="23" fill="${MUT}">Dış duvar, pencere, kapı: ısı akısı 0 → ${Math.round(qWm)} W/m²</text>`;
      return fig('Bina ısı haritası — perspektif: döşemeler mahal ısı kaybı yoğunluğu, dış duvar ve doğramalar yüzey ısı akısı (U·Δt); öndeki duvarlar saydam', sahne(out, 700, lej));
    },
    tesisat: (tur) => {
      const E = C.doc.ents, kn = katNo(), out = [], zk = e => kn(+e.z0 || 0); let var_ = false;
      const boru = (e, z, c1, c2) => { for (let i = 1; i < e.pts.length; i++) { const a = e.pts[i - 1], b = e.pts[i]; out.push({ p: [[a[0], a[1], z], [b[0], b[1], z]], stroke: c1, sw: 2, kat: zk(e), sira: 2 }); if (c2) out.push({ p: [[a[0] + 0.07, a[1] + 0.07, z - 0.05], [b[0] + 0.07, b[1] + 0.07, z - 0.05]], stroke: c2, sw: 1.6, dash: '5 3', kat: zk(e), sira: 2 }); } };
      const kolon = (sg, c1, c2) => { const k = E.find(e => e.type === 'mtkolon' && !!e.sys === sg), zs = E.filter(e => e.type === (sg ? 'mtfc' : 'mtrad')).map(e => +e.z0 || 0); if (!k || !zs.length) return; const z0 = Math.min(...zs) - 0.2, z1 = Math.max(...zs) + (sg ? 2.8 : 0.2); out.push({ p: [[k.p[0], k.p[1], z0], [k.p[0], k.p[1], z1]], stroke: c1, sw: 3, kat: 99, sira: 2 }, { p: [[k.p[0] + 0.1, k.p[1] + 0.1, z0], [k.p[0] + 0.1, k.p[1] + 0.1, z1]], stroke: c2, sw: 2.4, dash: '5 3', kat: 99, sira: 2 }); };
      if (tur === 'isitma') { for (const e of E) { if (e.type === 'mtrad') { var_ = true; const z = (+e.z0 || 0) + 0.15; prizma(out, e.p, e.ang || 0, e.L, 0.14, z, z + (e.H || 600) / 1000, e.tip === 'E' ? '#eda100' : '#ffffff', { stroke: '#d03b3b', kat: zk(e), tt: `${e.no} ${e.tip === 'E' ? 'elektrikli ısıtıcı' : e.tip + '/' + e.H + '/' + Math.round(e.L * 1000)} · ${Math.round(e.Qn)} W` }); } else if (e.type === 'mtboru' && !e.sys) boru(e, (+e.z0 || 0) + 0.08, '#d03b3b', '#2a78d6'); } kolon(false, '#d03b3b', '#2a78d6'); }
      else if (tur === 'sogutma') { for (const e of E) { if (e.type === 'mtfc') { var_ = true; const z = +e.z0 || 0, h = hOf(e); if (e.tip === 'split') { prizma(out, e.p, e.ang || 0, 0.9, 0.22, z + (e.zm != null ? +e.zm : 2.1), z + (e.zm != null ? +e.zm : 2.1) + 0.3, '#ffffff', { stroke: '#1baf7a', kat: zk(e), tt: `${e.no} ${e.model}` }); if (e.dp) prizma(out, e.dp, e.ang || 0, 0.8, 0.34, z + 0.3, z + 0.9, '#c3c2b7', { kat: zk(e), tt: 'dış ünite' }); } else prizma(out, e.p, 0, 0.6, 0.6, z + h - 0.45, z + h - 0.2, '#ffffff', { stroke: '#1baf7a', kat: zk(e), tt: `${e.no} ${e.model} · ${f(e.Qn / 1000, 1)} kW` }); } else if (e.type === 'mtboru' && e.sys === 'sog') boru(e, (+e.z0 || 0) + hOf(e) - 0.5, '#1baf7a', '#6250d6'); } kolon(true, '#1baf7a', '#6250d6'); }
      else { for (const e of E) { if (e.type === 'mtkanal') { var_ = true; const z1 = (+e.z0 || 0) + hOf(e) - 0.15, col = e.sys === 'besleme' ? '#9ec5f4' : '#f9c3a3'; for (let i = 1; i < e.pts.length; i++) { const a = e.pts[i - 1], b = e.pts[i], l = M.dist2(a, b); if (l < 0.02) continue; prizma(out, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], Math.atan2(b[1] - a[1], b[0] - a[0]), l, e.a / 1000, z1 - e.b / 1000, z1, col, { kat: zk(e), tt: `${e.sys === 'besleme' ? 'Besleme' : 'Egzoz'} kanalı ${e.a}×${e.b} · ${Math.round(e.V)} m³/h` }); } }
          else if (e.type === 'mthv') { var_ = true; const z = +e.z0 || 0, h = hOf(e), a = e.ang || 0, r = Math.max(0.15, (parseInt(String(e.model || '').replace(/\D/g, ''), 10) || 300) / 2000), o = { kat: zk(e), tt: `${e.no || ''} ${e.model || ''} · ${Math.round(e.V)} m³/h` };
            if (e.kind === 'duvarfan' || e.kind === 'kanalfan') prizma(out, e.p, a, 2 * r, (e.t || 0.2) + 0.12, z + h - 0.5 - 2 * r, z + h - 0.5, '#eb6834', o); else if (e.kind === 'panjur') prizma(out, e.p, a, e.w || 0.6, (e.t || 0.2) + 0.08, z + 0.3, z + 0.3 + (e.w || 0.6), '#1baf7a', o); else if (e.kind === 'catifan') prizma(out, e.p, 0, 2 * r, 2 * r, z + h + 0.2, z + h + 0.65, '#eb6834', Object.assign({ sira: 4 }, o)); else if (e.kind === 'hucrefan') prizma(out, e.p, 0, 1.0, 0.7, z + h - 0.8, z + h - 0.2, '#eb6834', o); else if (e.kind === 'rooftop') prizma(out, e.p, 0, 2.2, 1.4, z + h + 0.3, z + h + 1.4, '#6da7ec', Object.assign({ sira: 4 }, o)); else { const s = Math.max(0.2, (e.boy || 300) / 1000); prizma(out, e.p, 0, s, s, z + h - 0.14, z + h - 0.08, e.sys === 'besleme' ? '#2a78d6' : '#eb6834', o); } } } }
      if (!var_) return ''; iskelet(out);
      const L1 = (x, c2, t, dash) => `<line x1="${x}" y1="6" x2="${x + 24}" y2="6" stroke="${c2}" stroke-width="3"${dash ? ' stroke-dasharray="5 3"' : ''}/><text x="${x + 30}" y="10" fill="${INK2}">${t}</text>`, K1 = (x, c2, t) => `<rect x="${x}" y="1" width="12" height="10" fill="${c2}" stroke="${INK2}" stroke-width="0.7"/><text x="${x + 18}" y="10" fill="${INK2}">${t}</text>`;
      const lej = tur === 'isitma' ? L1(20, '#d03b3b', 'gidiş') + L1(110, '#2a78d6', 'dönüş', 1) + K1(210, '#ffffff', 'radyatör') + K1(300, '#eda100', 'elektrikli ısıtıcı') : tur === 'sogutma' ? L1(20, '#1baf7a', 'soğutulmuş su gidiş') + L1(190, '#6250d6', 'dönüş', 1) + K1(290, '#ffffff', 'fancoil / iç ünite') : K1(20, '#eb6834', 'fan / egzoz menfezi') + K1(180, '#f9c3a3', 'egzoz kanalı') + K1(290, '#9ec5f4', 'besleme kanalı') + K1(410, '#1baf7a', 'taze hava panjuru') + K1(550, '#6da7ec', 'rooftop');
      return fig(({ isitma: 'Isıtma tesisatı — perspektif', sogutma: 'Soğutma tesisatı — perspektif', hava: 'Havalandırma ve hava kanalları — perspektif' })[tur], sahne(out, 700, lej));
    },
  };
  MT.raporEk = MT.raporEk || [];
  MT.raporEk.push((hes) => { let h = ''; try { h = MT.rapor3B.isiHaritasi(hes || MT.hesapla()); } catch (er) { console.error(er); } const s = ['isitma', 'sogutma', 'hava'].map(t => MT.rapor3B.tesisat(t)).join(''); return h || s ? `<h2>13. Perspektif görünüşler</h2><p class="mut">Binanın güneybatıdan izometrik görünüşü. Isı haritasında renk koyulaştıkça ısı kaybı artar; tesisat görünüşlerinde bina soluk, tesisat elemanları renkli gösterilmiştir. Elemanların üzerine gelince değerleri görünür.</p>${h}${s}` : ''; });
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : (globalThis.C = globalThis.C || {}));

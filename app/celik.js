/* ArıtmaCAD — ÇELİK YAPI ARAÇLARI (şeritte "Çelik" sekmesi)
   Katalog ve kesit değerleri: app/celik-profil.js (C.celik). Katmanlar: app/cizim-kural.js → CELIK (taslak).
   Nesneler:
     celik       : çelik kolon / kiriş / çubuk { kind: kolon|kiris|cubuk, a, b (3B eksen uçları, m), prof, rot (°), ref: M (eksen kesit ortasında) | U (eksen üst yüzde),
                   malz, taban?: { a, b, t, d, n, kenar, L, harc } (mm; yalnız kolon) } — planda düşey eleman kesit dış hattıyla, yatay / eğik eleman
                   kenar çizgileri + eksen + profil adıyla; 3B'de kesit dış hattı eksen boyunca uzatılmış gerçek gövde (köşe yarıçaplarıyla).
     celikkesit  : ölçülü profil kesiti çizimi { p, prof, olcek }
     celikdetay  : birleşim detayı { p, tur: taban|alin|asik, prof, prof2, olcek } (2B, gerçek boyutta; yazılar ölçeğe göre)
     celik.rol   : cati (çatı kirişi) | asik | vinc (vinç kirişi) | ray (vinç rayı) — üretici komutların koyduğu etiket (bilgi ve metraj için)
     celik.vguse : vinç gusesi (yalnız kolon) { yon: F|A|R|L|FA|RL, tip: K konsol | D kademeli kolon, zt (guse üst kotu, m), e (ray ekseni – kolon ekseni, m), prof }
                   parçalar C.celikYer.guseParcalari ile kolondan türetilir; 3B, plan ve metraja kolonla birlikte girer.
     celiktakoz  : vinç yolu ucundaki durdurucu takoz { p (kiriş üstü uç noktası), t (içeri yön), L, bw, H (m) }
   Yerleşim hesapları (saf): app/celik-yerlesim.js (C.celikYer).
   Komutlar: CELIKPROFIL (katalog), CELIKKOLON, CELIKKIRIS, CELIKCUBUK, CELIKKESIT, TABANLEVHASI, CELIKDETAY, CELIKMETRAJ,
             CATIKIRISI (beşik / tek eğimli çatı kirişleri), ASIKDIZ (aşıklar), VINCGUSESI, VINCYOLU (vinç kirişi + ray + takoz).
   C.celikStatikCubuklar(): statik çözücüye çubuk eleman olarak verilmek üzere (ileride) uç noktaları ve kesit değerleri. */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, K = C.celik, { L, P, CI, TX, S } = C.prim, RAD = Math.PI / 180;
  const I_ = () => C._ins;
  const KR = () => (C.cizimKural && C.cizimKural.CELIK) || { katmanlar: {}, yaziMm: { etiket: 2.5, detay: 2.5, baslik: 4, tablo: 2.5 } };
  const lay = ad => { const t = KR().katmanlar[ad] || { renk: 7, tip: 'Continuous', kal: 0.25 }; C.ensureLayer(ad, t.renk, String(t.tip).toUpperCase(), Math.round(t.kal * 100)); return ad; };
  const yMm = k => (KR().yaziMm || {})[k] || 2.5;
  const KL = () => KR().cizgi || { kalin: 50, orta: 35, ince: 25, cokInce: 18, yardimci: 13, eksenRenk: 1 }; // çizgi kalınlığı (1/100 mm) ve eksen rengi: K.CELIK.cizgi
  const RENK = [0.42, 0.50, 0.58]; // boyalı çelik (3B)
  const gs = e => K.goster(e.prof);

  /* ---------------- eleman çerçevesi ---------------- */
  const frame = e => {
    const a = M.p3(e.a), b = M.p3(e.b), d = M.sub(b, a), len = M.len(d) || 1e-9, u = M.mul(d, 1 / len), r = (+e.rot || 0) * RAD, pr = K.profil(e.prof);
    let vx, vy; const dus = Math.abs(u[2]) > 0.99;
    if (dus) { vx = [Math.cos(r), Math.sin(r), 0]; vy = [-Math.sin(r), Math.cos(r), 0]; }
    else { const vy0 = M.norm(M.sub([0, 0, 1], M.mul(u, u[2]))), vx0 = M.cross(vy0, u); vx = M.add(M.mul(vx0, Math.cos(r)), M.mul(vy0, Math.sin(r))); vy = M.add(M.mul(vx0, -Math.sin(r)), M.mul(vy0, Math.cos(r))); }
    const dy = pr && e.ref === 'U' ? -pr.h / 2000 : 0;
    const W = (x, y, s) => [a[0] + vx[0] * x / 1000 + vy[0] * (y / 1000 + dy) + u[0] * s, a[1] + vx[1] * x / 1000 + vy[1] * (y / 1000 + dy) + u[1] * s, a[2] + vx[2] * x / 1000 + vy[2] * (y / 1000 + dy) + u[2] * s];
    return { a, b, u, len, vx, vy, dus, W, pr };
  };
  const boyOf = e => M.len(M.sub(M.p3(e.b), M.p3(e.a)));

  /* ---------------- 3B gövde ---------------- */
  const tri = (out, A, B, Cc, n, col) => { const v0 = out.v.length, nn = M.cross(M.sub(B, A), M.sub(Cc, A)); out.v.push(A, B, Cc); out.f.push(M.dot(nn, n) >= 0 ? [v0, v0 + 1, v0 + 2] : [v0, v0 + 2, v0 + 1]); out.fc.push(col); };
  const quad = (out, A, B, Cc, D, n, col) => { tri(out, A, B, Cc, n, col); tri(out, A, Cc, D, n, col); };
  /* düşey prizma (taban levhası, ankraj, somun): xy halkası (dışbükey), z0 → z1 */
  const prizma = (out, ring, z0, z1, col, kenar) => {
    const n = ring.length, c = ring.reduce((s, q) => [s[0] + q[0] / n, s[1] + q[1] / n], [0, 0]);
    for (let i = 0; i < n; i++) { const p = ring[i], q = ring[(i + 1) % n], nn = [q[1] - p[1], -(q[0] - p[0]), 0], o = [(p[0] + q[0]) / 2 - c[0], (p[1] + q[1]) / 2 - c[1], 0];
      quad(out, [p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1], M.dot(nn, o) >= 0 ? nn : M.mul(nn, -1), col);
      tri(out, [c[0], c[1], z0], [p[0], p[1], z0], [q[0], q[1], z0], [0, 0, -1], col); tri(out, [c[0], c[1], z1], [p[0], p[1], z1], [q[0], q[1], z1], [0, 0, 1], col);
      if (kenar) out.edges3.push([[p[0], p[1], z0], [q[0], q[1], z0]], [[p[0], p[1], z1], [q[0], q[1], z1]]); }
    if (kenar && n <= 8) for (const p of ring) out.edges3.push([[p[0], p[1], z0], [p[0], p[1], z1]]);
  };
  const cokgen = (c, r, n, a0) => { const o = []; for (let i = 0; i < n; i++) { const a = (a0 || 0) + i / n * Math.PI * 2; o.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); } return o; };
  /* taban levhası yerleşimi (mm → m, kolon ekseni ve dönmesiyle); ankraj noktaları */
  const tabanYer = e => {
    const t = e.taban, F = frame(e), a = F.a, A = t.a / 1000, B = t.b / 1000, k = t.kenar / 1000;
    // levhanın a kenarı profil derinliği (y) yönünde, b kenarı başlık (x) yönünde
    const P2 = (x, y) => [a[0] + F.vx[0] * x + F.vy[0] * y, a[1] + F.vx[1] * x + F.vy[1] * y];
    const kose = [P2(-B / 2, -A / 2), P2(B / 2, -A / 2), P2(B / 2, A / 2), P2(-B / 2, A / 2)];
    const ank = []; for (const sy of [-1, 1]) { ank.push(P2(-B / 2 + k, sy * (A / 2 - k)), P2(B / 2 - k, sy * (A / 2 - k))); if (t.n >= 6) ank.push(P2(0, sy * (A / 2 - k))); }
    return { kose, ank, z: a[2], P2 };
  };
  /* vinç gusesi parçaları (kolondan türetilir; sanal celik elemanları) */
  const guseOf = e => { const g = e.vguse; if (!g || e.kind !== 'kolon' || !C.celikYer) return []; const pr = K.profil(e.prof), F = frame(e); if (!pr || !F.dus) return [];
    return C.celikYer.guseParcalari({ a: F.a, b: F.b, rot: +e.rot || 0, hc: pr.h, bc: pr.b }, g).parcalar.map(p => ({ type: 'celik', kind: p.kind, a: p.a, b: p.b, ref: p.ref, rol: p.rol, prof: g.prof || e.prof, rot: p.kind === 'kolon' ? +e.rot || 0 : 0, malz: e.malz })); };
  const mesh = e => {
    const out = I_().newMesh(); govde(out, e); for (const p of guseOf(e)) govde(out, p); return [out];
  };
  const govde = (out, e) => {
    const F = frame(e), ks = K.kesit(e.prof); if (!ks) return;
    const rings = [ks.dis, ks.ic].filter(Boolean), Lm = F.len, col = RENK;
    // kapaklar
    const ec = C.earcutHalkalar(rings);
    for (const t3 of ec.tris) { const [p, q, r] = t3.map(i => ec.pts[i]); tri(out, F.W(p[0], p[1], 0), F.W(q[0], q[1], 0), F.W(r[0], r[1], 0), M.mul(F.u, -1), col); tri(out, F.W(p[0], p[1], Lm), F.W(q[0], q[1], Lm), F.W(r[0], r[1], Lm), F.u, col); }
    // yanlar: halka kenarının sağ normali (dış halka saat tersi, delik saat yönü → ikisinde de malzemeden dışa)
    for (const ring of rings) { const n = ring.length;
      for (let i = 0; i < n; i++) { const p = ring[i], q = ring[(i + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], nn = M.add(M.mul(F.vx, dy), M.mul(F.vy, -dx));
        quad(out, F.W(p[0], p[1], 0), F.W(q[0], q[1], 0), F.W(q[0], q[1], Lm), F.W(p[0], p[1], Lm), nn, col);
        out.edges3.push([F.W(p[0], p[1], 0), F.W(q[0], q[1], 0)], [F.W(p[0], p[1], Lm), F.W(q[0], q[1], Lm)]);
        // boyuna kenar yalnız keskin köşelerde (yay parçalarında değil)
        const o = ring[(i - 1 + n) % n], e1 = [p[0] - o[0], p[1] - o[1]], e2 = [dx, dy], cs = (e1[0] * e2[0] + e1[1] * e2[1]) / ((Math.hypot(...e1) * Math.hypot(...e2)) || 1);
        if (cs < Math.cos(20 * RAD)) out.edges3.push([F.W(p[0], p[1], 0), F.W(p[0], p[1], Lm)]); } }
    // taban levhası + ankrajlar (kolon altında)
    if (e.kind === 'kolon' && e.taban && F.dus) {
      const Y = tabanYer(e), t = e.taban, z = Y.z, zt = t.t / 1000, d = t.d / 1000;
      prizma(out, Y.kose, z - zt, z, [0.55, 0.58, 0.62], true);
      for (const p of Y.ank) { prizma(out, cokgen(p, d / 2, 12), z - zt - 0.25, z + 0.9 * d + 0.012, [0.6, 0.6, 0.55]); prizma(out, cokgen(p, d * 0.85, 6, Math.PI / 6), z + 0.004, z + 0.004 + 0.8 * d, [0.5, 0.5, 0.48], true); prizma(out, cokgen(p, d * 1.05, 16), z, z + 0.004, [0.55, 0.55, 0.5]); }
    }
  };

  /* ---------------- plan (2B) ---------------- */
  const th0 = () => (C.annoH ? C.annoH(yMm('etiket')) : 0.12);
  const okunur = a => { let r = a; while (r > 90) r -= 180; while (r <= -90) r += 180; return r; };
  const prims = e => {
    const F = frame(e), ks = K.kesit(e.prof), out = [], th = th0(); if (!ks) return [L(F.a, F.b, {})];
    const plan = Math.hypot(F.b[0] - F.a[0], F.b[1] - F.a[1]);
    const flat = q => [q[0], q[1], 0];
    if (F.dus || plan < 1e-4) {
      for (const ring of [ks.dis, ks.ic]) if (ring) out.push(P(ring.map(p => flat(F.W(p[0], p[1], 0))), true, { lw: KL().orta }));
      const pr = F.pr, r = Math.max(pr.h, pr.b) / 1000 * 0.75, c = flat(F.W(0, 0, 0));
      out.push(L([c[0] - F.vx[0] * r, c[1] - F.vx[1] * r, 0], [c[0] + F.vx[0] * r, c[1] + F.vx[1] * r, 0], { lt: 'CENTER', lw: KL().yardimci, color: KL().eksenRenk }), L([c[0] - F.vy[0] * r, c[1] - F.vy[1] * r, 0], [c[0] + F.vy[0] * r, c[1] + F.vy[1] * r, 0], { lt: 'CENTER', lw: KL().yardimci, color: KL().eksenRenk }));
      if (e.taban) { const Y = tabanYer(e); out.push(P(Y.kose.map(q => [q[0], q[1], 0]), true, { lw: KL().ince })); for (const p of Y.ank) out.push(CI([p[0], p[1], 0], e.taban.d / 2000, { lw: KL().cokInce })); }
      out.push(TX([c[0] + r * 0.75, c[1] + r * 0.75, 0], th, gs(e), 0, 'L', { color: 7 }));
      for (const g of guseOf(e)) for (const q of prims(g)) if (q.k !== 'T') out.push(Object.assign(q, q.lt === 'CENTER' ? {} : { lt: 'HIDDEN' })); // guse kiriş altında: kesikli
      if (e.vguse) out.push(TX([c[0] - r * 0.75, c[1] - r * 0.75 - th, 0], th * 0.8, `guse +${M.fmt(+e.vguse.zt, 2)}`, 0, 'R', { color: 7 }));
      return out;
    }
    const d2 = [(F.b[0] - F.a[0]) / plan, (F.b[1] - F.a[1]) / plan], n2 = [-d2[1], d2[0]];
    let omn = Infinity, omx = -Infinity; for (const p of ks.dis) { const w = F.W(p[0], p[1], 0), o = (w[0] - F.a[0]) * n2[0] + (w[1] - F.a[1]) * n2[1]; omn = Math.min(omn, o); omx = Math.max(omx, o); }
    const A0 = [F.a[0], F.a[1]], B0 = [F.b[0], F.b[1]], off = (p, o) => [p[0] + n2[0] * o, p[1] + n2[1] * o, 0];
    out.push(L(off(A0, omn), off(B0, omn), { lw: KL().orta }), L(off(A0, omx), off(B0, omx), { lw: KL().orta }), L(off(A0, omn), off(A0, omx), { lw: KL().ince }), L(off(B0, omn), off(B0, omx), { lw: KL().ince }));
    out.push(L([A0[0], A0[1], 0], [B0[0], B0[1], 0], { lt: 'CENTER', lw: KL().yardimci, color: KL().eksenRenk }));
    const ang = Math.atan2(d2[1], d2[0]) / RAD, rr = okunur(ang), m = [(A0[0] + B0[0]) / 2, (A0[1] + B0[1]) / 2], ny = rr === ang ? 1 : -1;
    const tp = [m[0] + n2[0] * ny * (Math.max(Math.abs(omn), Math.abs(omx)) + th * 0.5) * 1, m[1] + n2[1] * ny * (Math.max(Math.abs(omn), Math.abs(omx)) + th * 0.5), 0];
    out.push(TX(tp, th, gs(e) + (e.kind === 'cubuk' && Math.abs(F.u[2]) > 0.02 ? ` (eğik, L=${M.fmt(F.len, 2)} m)` : ''), rr, 'C', { color: 7 }));
    return out;
  };

  const ROL = { cati: 'Çatı kirişi', asik: 'Aşık', vinc: 'Vinç kirişi', ray: 'Vinç rayı', guse: 'Vinç gusesi', vincayak: 'Vinç ayağı' };
  T.celik = {
    label: 'Çelik eleman', ifc: 'IfcMember',
    prims, mesh,
    xf: (e, X) => { const tp = p => { const r = X.p(M.p3(p)); return [r[0], r[1], r[2] != null ? r[2] : (p[2] || 0)]; }; const F = frame(e), za = M.p3(e.a)[2]; e.a = tp(e.a); if (e.vguse) e.vguse.zt = +(+e.vguse.zt + e.a[2] - za).toFixed(6); e.b = tp(e.b); if (F.dus && X.v) { const r0 = (+e.rot || 0) * RAD, v = X.v([Math.cos(r0), Math.sin(r0), 0]); e.rot = +(Math.atan2(v[1], v[0]) / RAD).toFixed(6);
      if (e.vguse) { const g = e.vguse, r1 = e.rot * RAD, ax = [Math.cos(r1), Math.sin(r1)], ay = [-Math.sin(r1), Math.cos(r1)], yon0 = { F: [-Math.sin(r0), Math.cos(r0)], A: [Math.sin(r0), -Math.cos(r0)], R: [Math.cos(r0), Math.sin(r0)], L: [-Math.cos(r0), -Math.sin(r0)] };
        const yeniYon = sd => { const w = X.v([yon0[sd][0], yon0[sd][1], 0]), dx = w[0] * ax[0] + w[1] * ax[1], dy = w[0] * ay[0] + w[1] * ay[1], l = Math.hypot(w[0], w[1]) || 1; if (sd === 'F' || sd === 'A') g.e = +(+g.e * l).toFixed(6); return Math.abs(dy) >= Math.abs(dx) ? (dy >= 0 ? 'F' : 'A') : (dx >= 0 ? 'R' : 'L'); };
        if (g.yon === 'FA' || g.yon === 'RL') yeniYon(g.yon[0]); else g.yon = yeniYon(g.yon); } } delete e._c; },
    snaps: e => { const F = frame(e), out = [{ p: F.a, k: 'end' }, { p: F.b, k: 'end' }, { p: M.lerp(F.a, F.b, 0.5), k: 'mid' }]; if (F.dus && F.pr) { const h = F.pr.h / 2, b = F.pr.b / 2; for (const s of [0, F.len]) for (const [x, y] of [[-b, -h], [b, -h], [b, h], [-b, h], [0, h], [0, -h], [b, 0], [-b, 0]]) out.push({ p: F.W(x, y, s), k: 'end' }); } return out; },
    info: e => { const p = K.profil(e.prof), Lm = boyOf(e), g = e.vguse; return `${ROL[e.rol] || 'Çelik ' + (e.kind === 'kolon' ? 'kolon' : e.kind === 'kiris' ? 'kiriş' : 'çubuk')} ${gs(e)}${Math.abs(M.p3(e.a)[2] - M.p3(e.b)[2]) > 1e-3 && e.kind !== 'kolon' ? ` · eğim %${M.fmt(Math.abs(M.p3(e.b)[2] - M.p3(e.a)[2]) / (Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]) || 1) * 100, 1)}` : ''}${g ? ` · vinç gusesi ${g.tip === 'D' ? 'kademeli kolon' : 'konsol'} ${K.goster(g.prof || e.prof)}, üst +${M.fmt(+g.zt, 2)}, ray ekseni ${M.fmt(+g.e, 2)} m (${g.yon})` : ''} · ${e.malz || 'S275'} · L=${M.fmt(Lm, 2)} m · ${p ? M.fmt(p.G, 1) + ' kg/m · ' + M.fmt(p.G * Lm, 1) + ' kg' : 'profil bulunamadı'}${e.taban ? ` · taban levhası ${e.taban.a}×${e.taban.b}×${e.taban.t} mm, ${e.taban.n}×M${e.taban.d}` : ''}`; },
  };

  /* ---------------- 2B detay çizici (yerel mm; yazılar kâğıt mm × ölçek) ---------------- */
  const cizici = (p0, olcek) => {
    const out = [], k = 1 / 1000, X = (x, y) => [p0[0] + x * k, p0[1] + y * k, 0], tm = mm => mm * olcek; // tm: kâğıt mm → model mm
    const g = {
      out, tm,
      cizgi: (x1, y1, x2, y2, o) => out.push(L(X(x1, y1), X(x2, y2), Object.assign({ lw: KL().ince }, o))),
      cok: (pts, kapali, o) => out.push(P(pts.map(q => X(q[0], q[1])), kapali, Object.assign({ lw: KL().orta }, o))),
      dik: (x1, y1, x2, y2, o) => g.cok([[x1, y1], [x2, y1], [x2, y2], [x1, y2]], true, o),
      daire: (x, y, r, o) => out.push(CI(X(x, y), r * k, Object.assign({ lw: KL().cokInce }, o))),
      dolu: pts => out.push(S(pts.map(q => X(q[0], q[1])))),
      yazi: (x, y, s, mm, al, rot) => out.push(TX(X(x, y), tm(mm || yMm('detay')) * k, s, rot || 0, al || 'L')),
      // ölçü: (x1,y1)-(x2,y2) arası, d kadar dışarıda (yatay ya da düşey), yazı otomatik
      olcu: (x1, y1, x2, y2, d, s) => { const yat = Math.abs(y2 - y1) < Math.abs(x2 - x1), t = tm(1.2), h = tm(2);
        if (yat) { const y = y1 + d; g.cizgi(x1, y1, x1, y + Math.sign(d) * t, { lw: KL().yardimci }); g.cizgi(x2, y2, x2, y + Math.sign(d) * t, { lw: KL().yardimci }); g.cizgi(x1, y, x2, y, { lw: KL().yardimci }); for (const x of [x1, x2]) g.cizgi(x - t, y - t, x + t, y + t, { lw: KL().ince }); g.yazi((x1 + x2) / 2, y + h * 0.3, s != null ? s : M.fmt(Math.abs(x2 - x1), 0), yMm('olcu'), 'C'); }
        else { const x = x1 + d; g.cizgi(x1, y1, x + Math.sign(d) * t, y1, { lw: KL().yardimci }); g.cizgi(x2, y2, x + Math.sign(d) * t, y2, { lw: KL().yardimci }); g.cizgi(x, y1, x, y2, { lw: KL().yardimci }); for (const y of [y1, y2]) g.cizgi(x - t, y - t, x + t, y + t, { lw: KL().ince }); g.yazi(x - h * 0.3, (y1 + y2) / 2, s != null ? s : M.fmt(Math.abs(y2 - y1), 0), yMm('olcu'), 'C', 90); } },
      // oklu açıklama: (x,y) noktasından kırık çizgiyle yazıya
      not: (x, y, tx, ty, s) => { g.cizgi(x, y, tx, ty, { lw: KL().yardimci }); const sag = tx >= x, L2 = tm(3); g.cizgi(tx, ty, tx + (sag ? L2 : -L2), ty, { lw: KL().yardimci }); g.daire(x, y, tm(0.5), { lw: KL().ince }); g.yazi(tx + (sag ? L2 + tm(1) : -L2 - tm(1)), ty - tm(1), s, yMm('detay'), sag ? 'L' : 'R'); },
      eksen: (x1, y1, x2, y2) => g.cizgi(x1, y1, x2, y2, { lt: 'CENTER', lw: KL().yardimci, color: KL().eksenRenk }),
      kirik: (x1, y, x2) => { const w = x2 - x1, a = tm(2); g.cizgi(x1, y, x1 + w * 0.42, y, { lw: KL().yardimci }); g.cizgi(x1 + w * 0.42, y, x1 + w * 0.47, y + a, { lw: KL().yardimci }); g.cizgi(x1 + w * 0.47, y + a, x1 + w * 0.53, y - a, { lw: KL().yardimci }); g.cizgi(x1 + w * 0.53, y - a, x1 + w * 0.58, y, { lw: KL().yardimci }); g.cizgi(x1 + w * 0.58, y, x2, y, { lw: KL().yardimci }); },
      kaynak: (x, y, s, yx, yy) => g.dolu([[x, y], [x + s * yx, y], [x, y + s * yy]]),
      halka: (ring, dx, dy, sw, o) => g.cok(ring.map(q => sw ? [q[1] + dx, q[0] + dy] : [q[0] + dx, q[1] + dy]), true, o),
    };
    return g;
  };
  const tr = v => String(+(+v).toFixed(1)).replace('.', ',');

  /* ölçülü profil kesiti */
  T.celikkesit = {
    label: 'Çelik profil kesiti',
    prims: e => {
      const p = K.profil(e.prof), ks = K.kesit(e.prof), g = cizici(M.p3(e.p), +e.olcek || 10); if (!p) return [];
      const h = p.h, b = p.b, tm = g.tm;
      for (const r of [ks.dis, ks.ic]) if (r) g.halka(r, 0, 0, false, { lw: KL().kalin });
      g.eksen(-b / 2 - tm(4), p.ey, b / 2 + tm(4), p.ey); g.eksen(p.ex, -h / 2 - tm(4), p.ex, h / 2 + tm(4));
      g.yazi(b / 2 + tm(4.5), p.ey - tm(1), 'x', yMm('detay')); g.yazi(p.ex + tm(0.8), h / 2 + tm(4), 'y', yMm('detay'));
      g.olcu(-b / 2, h / 2, b / 2, h / 2, tm(7), `b=${tr(b)}`); g.olcu(-b / 2, -h / 2, -b / 2, h / 2, -tm(9), `h=${tr(h)}`);
      if (p.tur === 'I' || p.tur === 'IN' || p.tur === 'T') { g.not(p.tw / 2, 0, b / 2 + tm(6), -h / 6, `tw=${tr(p.tw)}`); g.not(b / 3, h / 2 - p.tf / 2, b / 2 + tm(6), h / 2 - tm(3), `tf=${tr(p.tf)}`); if (p.r) g.not(p.tw / 2 + p.r * 0.3, -h / 2 + p.tf + p.r * 0.3, b / 2 + tm(6), -h / 2 + tm(4), `r=${tr(p.r)}`); }
      else if (p.tur === 'U' || p.tur === 'UN') { g.not(-b / 2 + p.tw / 2, 0, b / 2 + tm(6), -h / 6, `tw=${tr(p.tw)}`); g.not(b / 4, h / 2 - p.tf / 2, b / 2 + tm(6), h / 2 - tm(3), `tf=${tr(p.tf)}`); }
      else if (p.tur === 'L') { g.olcu(-b / 2, -h / 2, b / 2, -h / 2, -tm(7), `b=${tr(b)}`); g.not(-b / 2 + p.t / 2, 0, b / 2 + tm(6), 0, `t=${tr(p.t)}`); }
      else if (p.tur === 'RHS' || p.tur === 'CHS') g.not(b / 2 - p.t / 2, 0, b / 2 + tm(6), -h / 4, `t=${tr(p.t)}`);
      const y0 = -h / 2 - tm(12), sat = tm(4.5), x0 = -b / 2 - tm(9);
      g.yazi(x0, y0, `${gs(e)}  (${p.std})`, yMm('baslik'));
      const f = (v, d) => M.fmt(v, d);
      const satir = [`A = ${f(p.A, 2)} cm²    G = ${f(p.G, 2)} kg/m    U = ${f(p.U, 3)} m²/m`, `Ix = ${f(p.Ix, p.Ix > 100 ? 0 : 2)} cm⁴    Wx = ${f(p.Wx, p.Wx > 100 ? 0 : 2)} cm³    ix = ${f(p.ix, 2)} cm`, `Iy = ${f(p.Iy, p.Iy > 100 ? 0 : 2)} cm⁴    Wy = ${f(p.Wy, p.Wy > 100 ? 0 : 2)} cm³    iy = ${f(p.iy, 2)} cm`];
      if (p.tur === 'L') satir.push(`Iv = ${f(p.Iv, 2)} cm⁴ (zayıf asal eksen)    iv = ${f(p.iv, 2)} cm`);
      satir.forEach((s, i) => g.yazi(x0, y0 - sat * (i + 1.3), s, yMm('detay')));
      g.yazi(x0, y0 - sat * (satir.length + 1.6), `Ölçek 1/${+e.olcek || 10} — ölçüler mm`, yMm('olcu'));
      return g.out;
    },
    xf: (e, X) => { e.p = X.p(M.p3(e.p)); },
    snaps: e => [{ p: M.p3(e.p), k: 'cen' }],
    info: e => `Profil kesiti ${gs(e)} · ölçek 1/${+e.olcek || 10}`,
  };

  /* ---------------- birleşim detayları ---------------- */
  const DETAY = {
    taban: (g, e) => { // kolon ayağı: görünüş + plan
      const p = K.profil(e.prof) || K.profil('HEA200'), t = Object.assign({}, K.tabanOneri(p.ad), e.ayar || {}), tm = g.tm, A = t.a, B = t.b, h = p.h, tp = t.t, d = t.d, k = t.kenar, H = Math.max(2 * h, 350);
      // görünüş (kolon gövdesine dik bakış: derinlik h yatayda)
      const bet = A / 2 + 150; g.cizgi(-bet, -t.harc, bet, -t.harc, { lw: KL().kalin }); g.cizgi(-bet, -t.harc - t.L - 120, -bet, -t.harc, { lw: KL().yardimci, lt: 'HIDDEN' }); g.cizgi(bet, -t.harc - t.L - 120, bet, -t.harc, { lw: KL().yardimci, lt: 'HIDDEN' });
      g.dik(-A / 2 - 25, -t.harc, A / 2 + 25, 0, { lw: KL().yardimci, lt: 'HIDDEN' });
      g.dik(-A / 2, 0, A / 2, tp, { lw: KL().kalin });
      g.cizgi(-h / 2, tp, -h / 2, tp + H, { lw: KL().kalin }); g.cizgi(h / 2, tp, h / 2, tp + H, { lw: KL().kalin });
      if (p.tf) { g.cizgi(-h / 2 + p.tf, tp, -h / 2 + p.tf, tp + H, { lw: KL().cokInce }); g.cizgi(h / 2 - p.tf, tp, h / 2 - p.tf, tp + H, { lw: KL().cokInce }); }
      g.kirik(-h / 2 - 30, tp + H, h / 2 + 30); g.eksen(0, -t.harc - t.L - 60, 0, tp + H + 40);
      const kw = Math.max(5, Math.round((p.tf || p.t || 8) * 0.6)); g.kaynak(h / 2, tp, kw * 1.4, 1, 1); g.kaynak(-h / 2, tp, kw * 1.4, -1, 1);
      for (const sx of [-1, 1]) { const x = sx * (A / 2 - k), zN = tp + 4; g.cizgi(x, zN + 0.8 * d + 12, x, -t.harc, { lw: KL().ince }); g.cizgi(x, -t.harc, x, -t.harc - t.L, { lw: KL().ince, lt: 'HIDDEN' }); g.cizgi(x, -t.harc - t.L, x - sx * 4 * d, -t.harc - t.L, { lw: KL().ince, lt: 'HIDDEN' });
        g.dik(x - 1.1 * d, tp, x + 1.1 * d, zN, { lw: KL().cokInce }); g.dik(x - 0.85 * d, zN, x + 0.85 * d, zN + 0.8 * d, { lw: KL().ince }); }
      g.olcu(-A / 2, -t.harc, A / 2, -t.harc, -tm(8) - 30, String(A)); g.olcu(A / 2, 0, A / 2, tp, tm(6), String(tp));
      g.olcu(-A / 2 + k, -t.harc - t.L, -A / 2 + k, -t.harc, -tm(16) - 60, `L=${t.L}`);
      g.not(-A / 4, tp / 2, -A / 2 - tm(14), tp + tm(10), `TABAN LEVHASI ${A}×${B}×${tp} (${e.malz || 'S275'})`);
      g.not(A / 2 - k, -t.harc - t.L * 0.5, A / 2 + tm(12), -t.harc - t.L * 0.3, `${t.n} AD. M${d} ANKRAJ L=${t.L} (8.8)`);
      g.not(A / 2 - 10, -t.harc / 2, A / 2 + tm(12), -t.harc + tm(3), `${t.harc} mm DÖKME HARCI (GROUT)`);
      g.not(h / 2, tp + H * 0.6, h / 2 + tm(12), tp + H * 0.7, `KOLON ${K.goster(p.ad)}`);
      g.not(h / 2 + kw * 0.5, tp + kw * 0.5, h / 2 + tm(12), tp + H * 0.25, `KÖŞE KAYNAĞI a=${kw} mm (çevre)`);
      g.yazi(-A / 2, -t.harc - t.L - tm(16), 'GÖRÜNÜŞ', yMm('baslik'));
      // plan
      const ox = A / 2 + bet + tm(40) + B / 2; g.dik(ox - B / 2, -A / 2 + 200, ox + B / 2, A / 2 + 200, { lw: KL().kalin });
      const ks = K.kesit(p.ad); for (const r of [ks.dis, ks.ic]) if (r) g.cok(r.map(q => [ox + q[0], 200 + q[1]]), true, { lw: KL().orta });
      const ay = []; for (const sy of [-1, 1]) { ay.push([ox - B / 2 + k, 200 + sy * (A / 2 - k)], [ox + B / 2 - k, 200 + sy * (A / 2 - k)]); if (t.n >= 6) ay.push([ox, 200 + sy * (A / 2 - k)]); }
      for (const [x, y] of ay) { g.daire(x, y, d / 2 + 3, { lw: KL().ince }); g.cizgi(x - d, y, x + d, y, { lw: KL().yardimci, lt: 'CENTER', color: KL().eksenRenk }); g.cizgi(x, y - d, x, y + d, { lw: KL().yardimci, lt: 'CENTER', color: KL().eksenRenk }); }
      g.eksen(ox - B / 2 - 40, 200, ox + B / 2 + 40, 200); g.eksen(ox, 200 - A / 2 - 40, ox, 200 + A / 2 + 40);
      g.olcu(ox - B / 2, 200 - A / 2, ox + B / 2, 200 - A / 2, -tm(7), String(B)); g.olcu(ox + B / 2, 200 - A / 2, ox + B / 2, 200 + A / 2, tm(7), String(A));
      g.olcu(ox - B / 2, 200 + A / 2, ox - B / 2 + k, 200 + A / 2, tm(5), String(k));
      g.yazi(ox - B / 2, 200 - A / 2 - tm(16), 'PLAN', yMm('baslik'));
      return { baslik: 'TABAN LEVHASI DETAYI', x0: -A / 2, y0: -t.harc - t.L - tm(26) };
    },
    alin: (g, e) => { // kiriş – kolon alın levhalı bulonlu birleşim (kolon başlığına)
      const pc = K.profil(e.prof) || K.profil('HEB200'), pb = K.profil(e.prof2) || K.profil('IPE300'), a = Object.assign({}, K.alinOneri(pb.ad), e.ayar || {}), tm = g.tm;
      const hc = pc.h, hb = pb.h, tp = a.t, d = a.d, Hc = hb / 2 + a.tas + 250, Lb = Math.max(500, 2 * hb);
      // kolon (görünüş: gövde düzlemine bakış)
      g.cizgi(-hc, -Hc, -hc, Hc, { lw: KL().kalin }); g.cizgi(0, -Hc, 0, Hc, { lw: KL().kalin }); g.cizgi(-pc.tf, -Hc, -pc.tf, Hc, { lw: KL().cokInce }); g.cizgi(-hc + pc.tf, -Hc, -hc + pc.tf, Hc, { lw: KL().cokInce });
      g.kirik(-hc - 30, Hc, 30); g.kirik(-hc - 30, -Hc, 30); g.eksen(-hc / 2, -Hc - 40, -hc / 2, Hc + 40);
      for (const sy of [-1, 1]) g.dik(-hc + pc.tf, sy * (hb / 2 - pb.tf / 2) - pb.tf / 2, -pc.tf, sy * (hb / 2 - pb.tf / 2) + pb.tf / 2, { lw: KL().ince }); // süreklilik (takviye) levhaları
      // alın levhası
      g.dik(0, -a.a / 2, tp, a.a / 2, { lw: KL().kalin });
      // kiriş
      g.cizgi(tp, hb / 2, tp + Lb, hb / 2, { lw: KL().kalin }); g.cizgi(tp, -hb / 2, tp + Lb, -hb / 2, { lw: KL().kalin }); g.cizgi(tp, hb / 2 - pb.tf, tp + Lb, hb / 2 - pb.tf, { lw: KL().cokInce }); g.cizgi(tp, -hb / 2 + pb.tf, tp + Lb, -hb / 2 + pb.tf, { lw: KL().cokInce });
      { const x = tp + Lb, w = tm(2); g.cizgi(x, hb / 2 + 20, x, hb * 0.1, { lw: KL().yardimci }); g.cizgi(x, hb * 0.1, x + w, 0, { lw: KL().yardimci }); g.cizgi(x + w, 0, x - w, -hb * 0.05, { lw: KL().yardimci }); g.cizgi(x - w, -hb * 0.05, x, -hb * 0.1, { lw: KL().yardimci }); g.cizgi(x, -hb * 0.1, x, -hb / 2 - 20, { lw: KL().yardimci }); }
      g.eksen(-40, 0, tp + Lb + 40, 0);
      const kw = Math.max(5, Math.round(pb.tf * 0.6)); for (const sy of [-1, 1]) { g.kaynak(tp, sy * hb / 2, kw * 1.4, 1, sy); g.kaynak(tp, sy * (hb / 2 - pb.tf), kw * 1.4, 1, -sy); }
      // bulon sıraları: taşma bölgesinde 1, başlık altında 1 (üst ve alt), 8 bulonda ortada ek sıra
      const ys = [hb / 2 + a.tas / 2, hb / 2 - pb.tf - 1.5 * d - 10]; if (a.n >= 8) ys.push(hb / 2 - pb.tf - 4.5 * d - 20); const sira = []; for (const y of ys) sira.push(y, -y);
      for (const y of sira) { const x0 = -pc.tf - 0.8 * d - 4, x1 = tp + 0.8 * d + 4; g.cizgi(x0, y, x1, y, { lw: KL().ince }); g.dik(-pc.tf - 0.8 * d - 4, y - 0.85 * d, -pc.tf - 4, y + 0.85 * d, { lw: KL().ince }); g.dik(tp + 4, y - 0.85 * d, tp + 4 + 0.8 * d, y + 0.85 * d, { lw: KL().ince }); g.cizgi(-pc.tf - 4, y - d, -pc.tf, y - d, { lw: KL().yardimci }); }
      g.olcu(0, -a.a / 2, tp, -a.a / 2, -tm(6), String(tp)); g.olcu(tp + Lb * 0.35, -a.a / 2, tp + Lb * 0.35, a.a / 2, 0, String(a.a));
      g.not(tp / 2, a.a / 2 - 10, tp + tm(12), a.a / 2 + tm(10), `ALIN LEVHASI ${a.a}×${a.b}×${tp}`);
      g.not(tp + 4 + 0.4 * d, sira[0], tp + tm(30), a.a / 2 + tm(4), `${a.n} AD. M${d} BULON (10.9)`);
      g.not(-hc / 2, Hc * 0.8, -hc - tm(10), Hc * 0.9, `KOLON ${K.goster(pc.ad)}`); g.not(tp + Lb * 0.7, hb / 2, tp + Lb * 0.75, hb / 2 + tm(12), `KİRİŞ ${K.goster(pb.ad)}`);
      g.not(-hc / 2, -(hb / 2 - pb.tf / 2), -hc - tm(10), -Hc * 0.6, `TAKVİYE LEVHASI t=${Math.ceil(pb.tf)}`);
      g.not(tp + kw * 0.4, -hb / 2 + kw * 0.4, tp + tm(14), -Hc * 0.85, `KÖŞE KAYNAĞI a=${kw} mm`);
      g.yazi(-hc, -Hc - tm(14), 'GÖRÜNÜŞ', yMm('baslik'));
      // alın levhası önden (bulon düzeni)
      const ox = tp + Lb + tm(30) + a.b / 2; g.dik(ox - a.b / 2, -a.a / 2, ox + a.b / 2, a.a / 2, { lw: KL().kalin });
      const ks = K.kesit(pb.ad); g.cok(ks.dis.map(q => [ox + q[0], q[1]]), true, { lw: KL().cokInce, lt: 'HIDDEN' });
      for (const y of sira) for (const sx of [-1, 1]) { const x = ox + sx * a.g / 2; g.daire(x, y, d / 2 + 2, { lw: KL().ince }); g.cizgi(x - d, y, x + d, y, { lw: KL().yardimci, lt: 'CENTER', color: KL().eksenRenk }); }
      g.olcu(ox - a.g / 2, -a.a / 2, ox + a.g / 2, -a.a / 2, -tm(6), String(a.g)); g.olcu(ox - a.b / 2, a.a / 2, ox + a.b / 2, a.a / 2, tm(6), String(a.b));
      g.yazi(ox - a.b / 2, -a.a / 2 - tm(16), 'ALIN LEVHASI GÖRÜNÜŞÜ', yMm('baslik'));
      return { baslik: 'KİRİŞ – KOLON ALIN LEVHALI BİRLEŞİM DETAYI', x0: -hc, y0: -Hc - tm(24) };
    },
    asik: (g, e) => { // aşık – çatı kirişi (makas) bağlantısı: kulak levhası + 2 bulon
      const pr = K.profil(e.prof) || K.profil('IPE300'), pa = K.profil(e.prof2) || K.profil('UPN160'), tm = g.tm;
      const hr = pr.h, ha = pa.h, ba = pa.b, tk = ha <= 160 ? 8 : 10, d = ha <= 160 ? 12 : 16, Lr = Math.max(700, 4 * ba + 300), hk = Math.round(ha * 0.75 / 5) * 5;
      // çatı kirişi görünüş (üst yüz y = 0)
      g.cizgi(-Lr / 2, 0, Lr / 2, 0, { lw: KL().kalin }); g.cizgi(-Lr / 2, -hr, Lr / 2, -hr, { lw: KL().kalin }); g.cizgi(-Lr / 2, -pr.tf, Lr / 2, -pr.tf, { lw: KL().cokInce }); g.cizgi(-Lr / 2, -hr + pr.tf, Lr / 2, -hr + pr.tf, { lw: KL().cokInce });
      for (const x of [-Lr / 2, Lr / 2]) { const w = tm(2); g.cizgi(x, 20, x, -hr * 0.45, { lw: KL().yardimci }); g.cizgi(x, -hr * 0.45, x + w, -hr * 0.5, { lw: KL().yardimci }); g.cizgi(x + w, -hr * 0.5, x - w, -hr * 0.55, { lw: KL().yardimci }); g.cizgi(x - w, -hr * 0.55, x, -hr * 0.6, { lw: KL().yardimci }); g.cizgi(x, -hr * 0.6, x, -hr - 20, { lw: KL().yardimci }); }
      g.eksen(-Lr / 2 - 40, -hr / 2, Lr / 2 + 40, -hr / 2);
      // aşık kesiti (kirişin üstünde; U'nun sırtı kulak levhasına)
      const ks = K.kesit(pa.ad), dx = tk / 2 + ba / 2; g.cok(ks.dis.map(q => [dx + q[0], ha / 2 + q[1]]), true, { lw: KL().kalin }); if (ks.ic) g.cok(ks.ic.map(q => [dx + q[0], ha / 2 + q[1]]), true, { lw: KL().kalin });
      // kulak levhası (kirişe kaynaklı)
      g.dik(-tk / 2, 0, tk / 2, hk, { lw: KL().kalin }); const kw = Math.max(4, Math.round(tk * 0.5)); g.kaynak(-tk / 2, 0, kw * 1.4, -1, 1); g.kaynak(tk / 2 + 0.01, 0, 0.01, 1, 1);
      const yb = [Math.round(hk * 0.35), Math.round(hk * 0.75)].filter(y => y < hk - d); const tw = pa.tw || pa.t || 6;
      for (const y of yb) { g.cizgi(-tk / 2 - 0.8 * d - 4, y, tk / 2 + tw + 0.8 * d + 4, y, { lw: KL().ince }); g.dik(-tk / 2 - 0.8 * d - 4, y - 0.85 * d, -tk / 2 - 4, y + 0.85 * d, { lw: KL().ince }); g.dik(tk / 2 + tw + 4, y - 0.85 * d, tk / 2 + tw + 4 + 0.8 * d, y + 0.85 * d, { lw: KL().ince }); }
      g.olcu(-tk / 2, hk, -tk / 2, 0, -tm(14), String(hk)); g.olcu(-tk / 2, 0, -tk / 2, yb[0], -tm(7), String(yb[0]));
      g.not(dx + ba * 0.3, ha - 2, dx + ba + tm(10), ha + tm(8), `AŞIK ${K.goster(pa.ad)}`);
      g.not(-tk / 2, hk * 0.9, -Lr / 4, ha + tm(8), `KULAK LEVHASI ${Math.round(ba + 40)}×${hk}×${tk}`);
      g.not(-tk / 2 - 0.8 * d, yb[yb.length - 1], -Lr / 3, hk + tm(2), `${yb.length * 1} AD. M${d} BULON (8.8)`);
      g.not(Lr / 3, -hr / 2, Lr / 3 + tm(6), -hr - tm(6), `ÇATI KİRİŞİ (MAKAS) ${K.goster(pr.ad)}`);
      g.not(-tk / 2 - kw * 0.4, kw * 0.4, -Lr / 2 + tm(4), -hr - tm(10), `KÖŞE KAYNAĞI a=${kw} mm (iki yandan)`);
      return { baslik: 'AŞIK BAĞLANTI DETAYI', x0: -Lr / 2, y0: -hr - tm(22) };
    },
  };
  const DETAY_AD = [['taban', 'Kolon ayağı — taban levhası ve ankraj'], ['alin', 'Kiriş – kolon alın levhalı birleşim'], ['asik', 'Aşık – çatı kirişi bağlantısı']];
  T.celikdetay = {
    label: 'Çelik birleşim detayı',
    prims: e => { const ol = +e.olcek || 10, g = cizici(M.p3(e.p), ol), f = DETAY[e.tur] || DETAY.taban; let r; try { r = f(g, e); } catch (er) { console.error('celikdetay', er); return g.out; } if (r) { g.yazi(r.x0, r.y0, r.baslik, yMm('baslik')); g.yazi(r.x0, r.y0 - g.tm(6), `Ölçek 1/${ol} — ölçüler mm — ön boyut, statik hesapla doğrulanmalıdır`, yMm('olcu')); } return g.out; },
    xf: (e, X) => { e.p = X.p(M.p3(e.p)); },
    snaps: e => [{ p: M.p3(e.p), k: 'cen' }],
    info: e => `${(DETAY_AD.find(x => x[0] === e.tur) || DETAY_AD[0])[1]} · ${K.goster(e.prof)}${e.prof2 ? ' / ' + K.goster(e.prof2) : ''} · 1/${+e.olcek || 10}`,
  };
  (C.PROPFIELDS = C.PROPFIELDS || {}).celik = [['prof', 'Profil (ör. HEA200, IPE300, UPN160, L80x80x8, KUTU100x100x5, BORU114.3x6.3)', 's'], ['rot', 'Dönme (°)'], ['malz', 'Malzeme (S235 / S275 / S355)', 's'], ['ref', 'Eksen (M orta / U üst yüz)', 's']];
  C.PROPFIELDS.celikkesit = [['prof', 'Profil', 's'], ['olcek', 'Ölçek (1/…)']];
  C.PROPFIELDS.celikdetay = [['tur', 'Tür (taban / alin / asik)', 's'], ['prof', 'Ana profil', 's'], ['prof2', 'İkinci profil (kiriş / aşık)', 's'], ['olcek', 'Ölçek (1/…)']];

  /* ---------------- ayar pencereleri ---------------- */
  const AILELER = Object.entries(K.AILE).map(([k, a]) => [k, a.uzun]);
  const kayitli = key => { try { const s = (C.doc.set.insaat) || JSON.parse(localStorage.getItem('aritmacad.insaat') || '{}'); return s[key] || {}; } catch (er) { return {}; } };
  const secili = () => (C.doc.set.celik && C.doc.set.celik.prof) || null;
  const profAlan = (key, varsAile, t) => {
    const s = kayitli(key), ail = s.aile && K.AILE[s.aile] ? s.aile : varsAile;
    const opts = a => K.adlar(a).map(n => [n, K.goster(n)]);
    return [
      { k: 'aile', t: t ? t + ' — aile' : 'Profil ailesi', opts: AILELER, d: ail, al: ['AILE'], onch: (v, b) => { const sel = b.querySelector('[data-k="prof"]'); if (sel) sel.innerHTML = opts(v).map(([o, g]) => `<option value="${o}">${g}</option>`).join(''); } },
      { k: 'prof', t: t || 'Profil', opts: opts(ail), d: K.adlar(ail)[Math.min(4, K.adlar(ail).length - 1)], al: ['PROF', 'PROFIL'], s: true },
    ];
  };
  const getP = async (title, fields, key) => { const r = await I_().getParams(title, fields, key); if (!r) return null; const k = K.adCoz(r.prof); if (!k) { C.warn(`Profil bulunamadı: ${r.prof}`); return null; } r.prof = k; r.aile = K.IDX[k].aile; return r; };
  const zSv = () => { const a = C.svAktif && C.svAktif(); return a ? +a.z || 0 : 0; };
  const zOf = p => (C.currentView === '3d' && p && p[2] != null ? +p[2] : zSv());
  const MALZ = C.celik.MALZEME;
  const yeni = (props) => C.add(C.newEnt('celik', Object.assign({ layer: lay('CELIK_ELEMAN') }, props)));

  /* ---------------- KATALOG ---------------- */
  C.addCommand(['CELIKPROFIL', 'PROFILKATALOG', 'CELIKKATALOG', 'STEELPROFILE'], 'Çelik profil kataloğu: HEA, HEB, HEM, IPE, IPN, UPN, UPE, köşebent, kutu, boru, T, lama — ölçüler ve kesit değerleri (A, kg/m, Ix, Iy, Wx, Wy). Seçilen profil kolon / kiriş / kesit çizimine aktarılır.', async () => {
    let aile = (secili() && K.aileOf(secili())) || 'HEA', sec = secili() || 'HEA200';
    const f = (v, d) => M.fmt(v, d);
    const tablo = () => { const a = K.AILE[aile], tur = a.tur, bas = tur === 'L' ? ['Profil', 'h', 'b', 't', 'r'] : tur === 'RHS' ? ['Profil', 'h', 'b', 't'] : tur === 'CHS' ? ['Profil', 'D', 't'] : tur === 'FL' ? ['Profil', 'b', 't'] : tur === 'RAY' ? ['Profil', 'k', 'h', 'b', 'tw'] : ['Profil', 'h', 'b', 'tw', 'tf', 'r'];
      const ol = p => tur === 'L' ? [p.h, p.b, p.t, p.r] : tur === 'RHS' ? [p.h, p.b, p.t] : tur === 'CHS' ? [p.D, p.t] : tur === 'FL' ? [p.b, p.t] : tur === 'RAY' ? [p.k, p.h, p.b, p.tw] : [p.h, p.b, p.tw, p.tf, p.r];
      const th = [...bas, 'A cm²', 'G kg/m', 'Ix cm⁴', 'Wx cm³', 'ix cm', 'Iy cm⁴', 'Wy cm³', 'iy cm'];
      return `<p class="hint">${a.uzun} · ${a.std} · ölçüler mm. Değerler kesitin gerçek dış hattından hesaplanır (tablolarla fark %2'den az). Satıra tıklayın.</p><div style="max-height:52vh;overflow:auto;border:1px solid var(--line)"><table class="clktab" style="border-collapse:collapse;width:100%;font-size:12px"><thead><tr>${th.map(x => `<th style="position:sticky;top:0;background:var(--panel2);padding:3px 6px;text-align:right">${x}</th>`).join('')}</tr></thead><tbody>${a.liste.map(p0 => { const p = K.profil(p0.ad); return `<tr data-p="${p.ad}" style="cursor:pointer;${p.ad === sec ? 'background:#1f3550' : ''}">${[K.goster(p.ad), ...ol(p).map(v => String(v).replace('.', ',')), f(p.A, 2), f(p.G, 2), f(p.Ix, p.Ix > 100 ? 0 : 2), f(p.Wx, p.Wx > 100 ? 0 : 2), f(p.ix, 2), f(p.Iy, p.Iy > 100 ? 0 : 2), f(p.Wy, p.Wy > 100 ? 0 : 2), f(p.iy, 2)].map((x, i) => `<td style="padding:2px 6px;text-align:${i ? 'right' : 'left'};border-top:1px solid var(--line)">${x}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div>`; };
    const b = C.modal('Çelik profil kataloğu', `<div class="bar" style="gap:6px;flex-wrap:wrap">${AILELER.map(([k, t]) => `<button data-a="${k}" title="${t}" class="${k === aile ? 'pri' : ''}">${k === 'LU' ? 'L (eşit olm.)' : k === 'L' ? 'L (eşit)' : k}</button>`).join('')}</div><div id="clkT"></div><div class="bar" style="justify-content:flex-end;gap:6px"><span id="clkSec" style="margin-right:auto"></span><button data-c="CELIKKOLON">Kolon yerleştir</button><button data-c="CELIKKIRIS">Kiriş çiz</button><button data-c="CELIKCUBUK">Çubuk çiz</button><button data-c="CELIKKESIT">Kesitini çiz</button><button id="clkKapat">Kapat</button></div>`);
    const ciz = () => { b.querySelector('#clkT').innerHTML = tablo(); b.querySelector('#clkSec').textContent = 'Seçili: ' + K.goster(sec); b.querySelectorAll('[data-a]').forEach(x => x.classList.toggle('pri', x.dataset.a === aile));
      b.querySelectorAll('tr[data-p]').forEach(tr => tr.onclick = () => { sec = tr.dataset.p; (C.doc.set.celik = C.doc.set.celik || {}).prof = sec; ciz(); }); };
    b.querySelectorAll('[data-a]').forEach(x => x.onclick = () => { aile = x.dataset.a; ciz(); });
    b.querySelectorAll('[data-c]').forEach(x => x.onclick = () => { (C.doc.set.celik = C.doc.set.celik || {}).prof = sec; C.closeModal(); setTimeout(() => C.runTool(`${x.dataset.c} AILE=${K.aileOf(sec)} PROF=${sec}`), 0); });
    b.querySelector('#clkKapat').onclick = () => C.closeModal();
    ciz(); const s = b.querySelector('tr[data-p="' + sec + '"]'); if (s) s.scrollIntoView({ block: 'center' });
  }, { noUndo: true });

  /* ---------------- KOLON ---------------- */
  C.addCommand(['CELIKKOLON', 'CKOLON', 'STEELCOLUMN'], 'Çelik kolon: profil seçin (HEA, HEB, IPE, kutu, boru …), yükseklik ve açı; tıklanan noktalara düşey kolon konur (alt kot: aktif seviye ya da 3B\'de tıklanan yüzey). İsteğe bağlı taban levhası + ankraj.', async (I) => {
    const r = await getP('Çelik kolon', [...profAlan('celikkolon', 'HEA'), { k: 'h', t: 'Yükseklik (m)', d: 4, al: ['H'] }, { k: 'rot', t: 'Açı (°; 0 = başlıklar X yönünde)', d: 0, al: ['ROT', 'ACI'] }, { k: 'malz', t: 'Çelik sınıfı', opts: MALZ, d: 'S275', al: ['MALZ'] }, { k: 'taban', t: 'Taban levhası + ankraj', opts: [['E', 'Var (ön boyut)'], ['H', 'Yok']], d: 'E', al: ['TABAN'] }], 'celikkolon'); if (!r) return;
    const made = [], pr = K.profil(r.prof), h = Math.max(0.1, +r.h || 4);
    E.preview = c => { if (!c) return []; const q = M.p3(c), e = { type: 'celik', kind: 'kolon', a: [q[0], q[1], 0], b: [q[0], q[1], h], prof: r.prof, rot: +r.rot || 0 }; return prims(e); };
    for (; ;) { const p = await I.pt(made.length ? `Sonraki kolon (${K.goster(r.prof)}; Enter bitir)` : `Kolon yeri (${K.goster(r.prof)}, h=${M.fmt(h, 2)} m)`); if (!Array.isArray(p)) break; const z = zOf(p);
      const e = yeni({ kind: 'kolon', a: [p[0], p[1], z], b: [p[0], p[1], z + h], prof: r.prof, rot: +r.rot || 0, ref: 'M', malz: r.malz }); if (r.taban === 'E') e.taban = K.tabanOneri(r.prof); made.push(e); if (E.scriptMode && !E.queue.length) break; }
    E.preview = null; if (!made.length) return; C.sel = made.slice(); C.emit('selection'); C.log(`${made.length} çelik kolon ${K.goster(r.prof)} (${M.fmt(pr.G, 1)} kg/m) · ${T.celik.info(made[0])}`);
  });
  /* ---------------- KİRİŞ ---------------- */
  C.addCommand(['CELIKKIRIS', 'CKIRIS', 'STEELBEAM'], 'Çelik kiriş: profil ve üst kot (çelik üst yüzü); noktaları tıklayın, her iki nokta arasına kiriş çizilir (Enter bitir). Eksen kirişin üst yüzündedir.', async (I) => {
    const r = await getP('Çelik kiriş', [...profAlan('celikkiris', 'IPE'), { k: 'zt', t: 'Üst kot (çelik üst yüzü, m)', d: 4, al: ['ZT', 'KOT'] }, { k: 'malz', t: 'Çelik sınıfı', opts: MALZ, d: 'S275', al: ['MALZ'] }, { k: 'zin', t: 'Çizim', opts: [['Z', 'Zincir (her nokta öncekine bağlanır)'], ['T', 'Tek tek (iki nokta)']], d: 'Z', al: ['CIZIM'] }], 'celikkiris'); if (!r) return;
    const made = [], zt = +r.zt; let prev = null;
    for (; ;) { E.base = prev; E.preview = prev ? (c => c ? prims({ type: 'celik', kind: 'kiris', a: [prev[0], prev[1], zt], b: [c[0], c[1], zt], prof: r.prof, ref: 'U' }) : []) : null;
      const p = await I.pt(prev ? 'Kirişin sonraki noktası (Enter bitir)' : `Kiriş başlangıcı (${K.goster(r.prof)}, üst kot ${M.fmt(zt, 2)})`); E.preview = null; E.base = null; if (!Array.isArray(p)) break;
      if (prev && M.dist2(prev, p) > 1e-3) made.push(yeni({ kind: 'kiris', a: [prev[0], prev[1], zt], b: [p[0], p[1], zt], prof: r.prof, rot: 0, ref: 'U', malz: r.malz }));
      prev = r.zin === 'T' && prev ? null : M.p3(p); if (E.scriptMode && !E.queue.length) break; }
    if (!made.length) return; C.sel = made.slice(); C.emit('selection'); C.log(`${made.length} çelik kiriş ${K.goster(r.prof)} · toplam ${M.fmt(made.reduce((s, e) => s + boyOf(e), 0), 2)} m`);
  });
  /* ---------------- ÇUBUK (çapraz, bağlantı, eğik) ---------------- */
  C.addCommand(['CELIKCUBUK', 'CAPRAZ', 'STEELMEMBER'], 'Çelik çubuk (çapraz, rüzgâr bağlantısı, eğik eleman): profil, başlangıç ve bitiş kotu; iki nokta tıklayın. 3B\'de tıklanan noktaların kendi kotu kullanılabilir.', async (I) => {
    const r = await getP('Çelik çubuk / çapraz', [...profAlan('celikcubuk', 'SHS'), { k: 'z1', t: 'Başlangıç kotu (m)', d: 0, al: ['Z1'] }, { k: 'z2', t: 'Bitiş kotu (m)', d: 4, al: ['Z2'] }, { k: 'kot', t: 'Kot', opts: [['G', 'Girilen kotlar'], ['T', 'Tıklanan noktaların kotu (3B)']], d: 'G', al: ['KOTMOD'] }, { k: 'malz', t: 'Çelik sınıfı', opts: MALZ, d: 'S275', al: ['MALZ'] }], 'celikcubuk'); if (!r) return;
    const made = [];
    for (; ;) { const p1 = await I.pt(made.length ? 'Sonraki çubuğun başlangıcı (Enter bitir)' : 'Çubuk başlangıcı'); if (!Array.isArray(p1)) break; E.base = p1;
      const z1 = r.kot === 'T' ? (+p1[2] || 0) : +r.z1; E.preview = c => c ? prims({ type: 'celik', kind: 'cubuk', a: [p1[0], p1[1], z1], b: [c[0], c[1], r.kot === 'T' ? (+c[2] || 0) : +r.z2], prof: r.prof, ref: 'M' }) : [];
      const p2 = await I.pt('Çubuk bitişi'); E.preview = null; E.base = null; if (!Array.isArray(p2)) break; const z2 = r.kot === 'T' ? (+p2[2] || 0) : +r.z2;
      if (Math.hypot(p2[0] - p1[0], p2[1] - p1[1], z2 - z1) < 1e-3) continue;
      made.push(yeni({ kind: Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) < 1e-3 ? 'kolon' : 'cubuk', a: [p1[0], p1[1], z1], b: [p2[0], p2[1], z2], prof: r.prof, rot: 0, ref: 'M', malz: r.malz })); if (E.scriptMode && !E.queue.length) break; }
    if (!made.length) return; C.sel = made.slice(); C.emit('selection'); C.log(`${made.length} çelik çubuk ${K.goster(r.prof)} · ${T.celik.info(made[0])}`);
  });
  /* ---------------- TABAN LEVHASI ---------------- */
  C.addCommand(['TABANLEVHASI', 'TABANPLAKASI', 'BASEPLATE'], 'Seçilen çelik kolonlara taban levhası + ankraj ekler (ölçüler 0 bırakılırsa kesit boyuna göre ön boyut). 3B\'de levha, ankraj ve somunlar; planda levha ve ankraj delikleri. Metraja girer.', async (I) => {
    const s = (await I.sel('Çelik kolonları seçin')).filter(e => e.type === 'celik' && frame(e).dus); if (!s.length) { C.warn('Seçimde düşey çelik kolon yok.'); return; }
    const r = await I_().getParams('Taban levhası', [{ k: 'a', t: 'Levha boyu a (mm; profil derinliği yönü, 0 = otomatik)', d: 0, al: ['A'] }, { k: 'b', t: 'Levha eni b (mm; 0 = otomatik)', d: 0, al: ['B'] }, { k: 't', t: 'Kalınlık (mm; 0 = otomatik)', d: 0, al: ['T'] }, { k: 'd', t: 'Ankraj çapı M (mm; 0 = otomatik)', d: 0, al: ['D'] }, { k: 'n', t: 'Ankraj adedi', opts: [['0', 'Otomatik'], ['4', '4'], ['6', '6']], d: '0', al: ['N'] }, { k: 'sil', t: 'İşlem', opts: [['E', 'Ekle / güncelle'], ['S', 'Taban levhasını kaldır']], d: 'E', al: ['ISLEM'] }], 'tabanlevhasi'); if (!r) return;
    for (const e of s) { if (r.sil === 'S') { delete e.taban; delete e._c; continue; } const o = K.tabanOneri(e.prof); for (const k of ['a', 'b', 't', 'd']) if (+r[k] > 0) o[k] = +r[k]; if (+r.n > 0) o.n = +r.n; o.kenar = Math.max(40, 2 * o.d); o.L = Math.ceil(25 * o.d / 50) * 50; e.taban = o; delete e._c; }
    C.changed(); C.log(r.sil === 'S' ? `${s.length} kolonun taban levhası kaldırıldı.` : `${s.length} kolona taban levhası: ${T.celik.info(s[0])}`);
  });
  /* ---------------- KESİT ÇİZİMİ ---------------- */
  C.addCommand(['CELIKKESIT', 'PROFILKESIT', 'STEELSECTION'], 'Ölçülü çelik profil kesiti çizer (gerçek köşe yarıçaplarıyla): h, b, tw, tf, r ölçüleri ve kesit değerleri tablosu. Detay ölçeği 1/10 varsayılan.', async (I) => {
    const r = await getP('Profil kesiti', [...profAlan('celikkesit', 'HEA'), { k: 'olcek', t: 'Detay ölçeği 1/…', d: 10, al: ['OLCEK'] }], 'celikkesit'); if (!r) return;
    const ol = Math.max(1, +r.olcek || 10); E.preview = c => c ? T.celikkesit.prims({ p: c, prof: r.prof, olcek: ol }) : [];
    const p = await I.pt('Kesitin yeri (profil merkezi)'); E.preview = null; if (!Array.isArray(p)) return;
    const e = C.add(C.newEnt('celikkesit', { p: [p[0], p[1], 0], prof: r.prof, olcek: ol, layer: lay('CELIK_DETAY') })); delete e.sp; C.log(`Profil kesiti: ${K.goster(r.prof)} (1/${ol}).`);
  });
  /* ---------------- BİRLEŞİM DETAYI ---------------- */
  C.addCommand(['CELIKDETAY', 'BIRLESIMDETAY', 'STEELDETAIL'], 'Çelik birleşim detayı (2B): kolon ayağı taban levhası + ankraj, kiriş–kolon alın levhalı bulonlu birleşim, aşık–çatı kirişi bağlantısı. Ölçüler kesit boyuna göre ön boyuttur.', async (I) => {
    const kv = (E.queue.find(t => /^TUR=/i.test(t)) || '').split('=')[1]; const tur0 = kv ? kv.toLowerCase() : (kayitli('celikdetay').tur || 'taban');
    const ad2 = { taban: null, alin: 'Kiriş profili', asik: 'Aşık profili' }, ad1 = { taban: 'Kolon profili', alin: 'Kolon profili', asik: 'Çatı kirişi (makas) profili' };
    const tur = DETAY[tur0] ? tur0 : 'taban';
    const f = [{ k: 'tur', t: 'Detay', opts: DETAY_AD, d: tur, al: ['TUR'] }, ...profAlan('celikdetay', tur === 'asik' ? 'IPE' : tur === 'alin' ? 'HEB' : 'HEA', ad1[tur])];
    if (ad2[tur]) { const s = kayitli('celikdetay'), a2 = s.aile2 && K.AILE[s.aile2] ? s.aile2 : (tur === 'asik' ? 'UPN' : 'IPE'), o2 = a => K.adlar(a).map(n => [n, K.goster(n)]);
      f.push({ k: 'aile2', t: ad2[tur] + ' — aile', opts: AILELER, d: a2, al: ['AILE2'], onch: (v, b) => { const sel = b.querySelector('[data-k="prof2"]'); if (sel) sel.innerHTML = o2(v).map(([o, g]) => `<option value="${o}">${g}</option>`).join(''); } }, { k: 'prof2', t: ad2[tur], opts: o2(a2), d: tur === 'asik' ? 'UPN160' : 'IPE300', al: ['PROF2'], s: true }); }
    f.push({ k: 'olcek', t: 'Detay ölçeği 1/…', d: 10, al: ['OLCEK'] }, { k: 'malz', t: 'Çelik sınıfı', opts: MALZ, d: 'S275', al: ['MALZ'] });
    const r = await getP('Çelik birleşim detayı', f, 'celikdetay'); if (!r) return;
    if (r.tur !== tur && !E.scriptMode) { C.log('Detay türü değişti: ayarlar yeni türe göre yeniden açılıyor.'); setTimeout(() => C.runTool('CELIKDETAY TUR=' + r.tur.toUpperCase()), 0); return; }
    const p2 = r.prof2 ? K.adCoz(r.prof2) : null; const ol = Math.max(1, +r.olcek || 10), base = { tur: r.tur, prof: r.prof, prof2: p2, olcek: ol, malz: r.malz };
    E.preview = c => c ? T.celikdetay.prims(Object.assign({ p: c }, base)) : [];
    const p = await I.pt('Detayın yeri (kolon / kiriş ekseni)'); E.preview = null; if (!Array.isArray(p)) return;
    const e = C.add(C.newEnt('celikdetay', Object.assign({ p: [p[0], p[1], 0], layer: lay('CELIK_DETAY') }, base))); delete e.sp; C.log(T.celikdetay.info(e));
  });

  /* ---------------- DURDURUCU TAKOZ (vinç yolu ucu) ---------------- */
  const takozKose = e => { const p = M.p3(e.p), t = e.t || [1, 0], n = [-t[1], t[0]], w = (+e.bw || 0.3) / 2, Lt = +e.L || 0.2;
    return [[p[0] - n[0] * w, p[1] - n[1] * w], [p[0] + t[0] * Lt - n[0] * w, p[1] + t[1] * Lt - n[1] * w], [p[0] + t[0] * Lt + n[0] * w, p[1] + t[1] * Lt + n[1] * w], [p[0] + n[0] * w, p[1] + n[1] * w]]; };
  const takozLevha = e => { const H = +e.H || 0.2, bw = +e.bw || 0.3, Lt = +e.L || 0.2; return [{ ad: 'Durdurucu takoz alın levhası', a: bw, b: H, t: 0.025 }, { ad: 'Durdurucu takoz yan levhası (üçgen)', a: Lt, b: H / 2, t: 0.015, adet: 2 }, { ad: 'Durdurucu takoz taban levhası', a: bw, b: Lt, t: 0.02 }]; };
  T.celiktakoz = {
    label: 'Vinç yolu durdurucu takozu',
    prims: e => { const q = takozKose(e); return [P(q.map(v => [v[0], v[1], 0]), true, { lw: KL().orta }), L([q[0][0], q[0][1], 0], [q[2][0], q[2][1], 0], { lw: KL().yardimci }), L([q[1][0], q[1][1], 0], [q[3][0], q[3][1], 0], { lw: KL().yardimci })]; },
    mesh: e => { const out = I_().newMesh(), z = M.p3(e.p)[2]; prizma(out, takozKose(e), z, z + (+e.H || 0.2), [0.75, 0.55, 0.15], true); return [out]; },
    xf: (e, X) => { const p = X.p(M.p3(e.p)); e.p = [p[0], p[1], p[2] != null ? p[2] : M.p3(e.p)[2]]; if (X.v) { const v = X.v([e.t[0], e.t[1], 0]), l = Math.hypot(v[0], v[1]) || 1; e.t = [v[0] / l, v[1] / l]; } },
    snaps: e => takozKose(e).map(q => ({ p: [q[0], q[1], M.p3(e.p)[2]], k: 'end' })),
    info: e => `Durdurucu takoz ${M.fmt((+e.bw || 0.3) * 1000, 0)}×${M.fmt((+e.L || 0.2) * 1000, 0)}×${M.fmt((+e.H || 0.2) * 1000, 0)} mm (kaynaklı levha; tampon ayrıca) · ${M.fmt(takozLevha(e).reduce((s, l) => s + l.a * l.b * l.t * (l.adet || 1) * K.RO, 0), 1)} kg`,
  };

  const YR = () => C.celikYer;
  const dusKolonlar = s => s.filter(e => e.type === 'celik' && e.kind === 'kolon' && frame(e).dus);
  const ustYuz = e => { const F = frame(e), h = F.pr ? F.pr.h : 0; return { a: F.W(0, h / 2, 0), b: F.W(0, h / 2, F.len) }; }; // kiriş üst yüz ekseni (ref M ya da U)
  /* ---------------- ÇATI KİRİŞİ (MAKAS) ---------------- */
  C.addCommand(['CATIKIRISI', 'MAKAS', 'CELIKCATI', 'RAFTER'], 'Çelik çatı kirişi (makas / eğimli kiriş): beşik ya da tek eğimli. Seçilen çelik kolonlardan (her çerçevede en uçtaki iki kolon saçak aksı, kot kolon üstü) ya da iki aks + son çerçeve hizası ve aralıkla; eğim % ya da mahya kotu, saçak taşması.', async (I) => {
    const r = await getP('Çatı kirişi (makas)', [...profAlan('catikirisi', 'IPE'), { k: 'tip', t: 'Çatı', opts: [['besik', 'Beşik (iki eğimli, mahya ortada)'], ['tek', 'Tek eğimli']], d: 'besik', al: ['TIP'] },
      { k: 'egim', t: 'Eğim (%)', d: 10, al: ['EGIM'] }, { k: 'mahya', t: 'Mahya kotu (m; 0 = eğimden; tek eğimde yüksek aks)', d: 0, al: ['MAHYA'] }, { k: 'tasma', t: 'Saçak taşması (m, yatay)', d: 0.5, al: ['TASMA'] },
      { k: 'kay', t: 'Yerleşim', opts: [['K', 'Seçilen çelik kolonlardan'], ['A', 'İki aks + tekrar']], d: 'K', al: ['YER'] }, { k: 'yon', t: 'Kiriş yönü (kolonlardan)', opts: [['oto', 'Otomatik (çok çerçeve veren yön)'], ['X', 'X yönü'], ['Y', 'Y yönü']], d: 'oto', al: ['YON'] },
      { k: 'zs', t: 'Saçak kotu (iki aks; kiriş üst yüzü, m)', d: 6, al: ['ZS'] }, { k: 'aralik', t: 'Çerçeve aralığı en çok (m; iki aks)', d: 6, al: ['ARALIK'] }, { k: 'malz', t: 'Çelik sınıfı', opts: MALZ, d: 'S275', al: ['MALZ'] }], 'catikirisi'); if (!r) return;
    const o = { tip: r.tip, egim: +r.egim, mahya: +r.mahya, tasma: +r.tasma }; let cer = [];
    if (r.kay === 'K') {
      const s = dusKolonlar(await I.sel('Çatı kirişlerinin oturacağı çelik kolonları seçin')); if (s.length < 2) { C.warn('En az iki düşey çelik kolon seçin (CELIKKOLON).'); return; }
      cer = YR().cerceveleriBul(s.map(e => ({ p: M.p3(e.a), z: Math.max(M.p3(e.a)[2], M.p3(e.b)[2]) })), r.yon).map(c => ({ A: c.A, B: c.B, zs: c.zA, mahya: +r.mahya > 0 ? +r.mahya : (r.tip === 'tek' && c.zB > c.zA + 0.01 ? c.zB : 0) }));
      if (!cer.length) { C.warn('Seçilen kolonlardan çerçeve bulunamadı: aynı hizada en az iki kolon olmalı (kiriş yönünü X / Y seçmeyi deneyin).'); return; }
    } else {
      const zs = +r.zs, ciz = (A, B) => (YR().catiKirisi(A, B, zs, o) || { parcalar: [] }).parcalar.flatMap(q => prims({ type: 'celik', kind: 'kiris', a: q.a, b: q.b, prof: r.prof, ref: 'U' }));
      const A = await I.pt('Birinci saçak aksı (kolon ekseni)'); if (!Array.isArray(A)) return; E.base = A; E.preview = c => c ? ciz(A, c) : [];
      const B = await I.pt('Karşı saçak aksı'); E.preview = null; E.base = null; if (!Array.isArray(B)) return;
      E.preview = c => c ? YR().cerceveTekrar(A, B, c, r.aralik).cerceveler.flatMap(f => ciz(f.A, f.B)) : [];
      const Cp = await I.pt('Son çerçevenin hizası (Enter = tek çerçeve)'); E.preview = null;
      cer = (Array.isArray(Cp) ? YR().cerceveTekrar(A, B, Cp, r.aralik).cerceveler : [{ A, B }]).map(f => ({ A: f.A, B: f.B, zs, mahya: +r.mahya }));
    }
    const made = []; let son = null;
    for (const c of cer) { const k = YR().catiKirisi(c.A, c.B, c.zs, Object.assign({}, o, { mahya: c.mahya })); if (!k) continue; son = k;
      for (const q of k.parcalar) made.push(yeni({ kind: 'kiris', a: q.a, b: q.b, prof: r.prof, rot: 0, ref: 'U', malz: r.malz, rol: 'cati' })); }
    if (!made.length) return; C.sel = made.slice(); C.emit('selection');
    C.log(`${cer.length} çerçevede ${made.length} çatı kirişi ${K.goster(r.prof)} · açıklık ${M.fmt(son.acikl, 2)} m · eğim %${M.fmt(son.egim, 1)} (${M.fmt(son.aci, 1)}°) · mahya +${M.fmt(son.mahya, 2)} · saçak ucu +${M.fmt(son.zu, 2)} · toplam ${M.fmt(made.reduce((s, e) => s + boyOf(e), 0), 1)} m`);
  });
  /* ---------------- AŞIK ---------------- */
  C.addCommand(['ASIKDIZ', 'ASIK', 'CELIKASIK', 'PURLIN'], 'Aşık: seçilen çatı kirişlerinin üstüne verilen en büyük aralıkla (eğim boyunca, eşit bölünür) aşıkları dizer; gövde çatıya dik döner, uçlarda taşma. Aynı çatı yüzündeki komşu kirişler arasında her açıklıkta bir parça (ya da sürekli).', async (I) => {
    const s = (await I.sel('Çatı kirişlerini seçin (CATIKIRISI)')).filter(e => e.type === 'celik' && !frame(e).dus); if (s.length < 2) { C.warn('En az iki çatı kirişi seçin (aynı çatı yüzünde yan yana).'); return; }
    const r = await getP('Aşık', [...profAlan('asik', 'UPN'), { k: 'aralik', t: 'Aşık aralığı en çok (m, eğim boyunca)', d: 1.5, al: ['ARALIK'] }, { k: 'bas', t: 'Saçak ucundan ilk aşık (m)', d: 0.15, al: ['BAS'] }, { k: 'son', t: 'Mahyadan son aşık (m)', d: 0.15, al: ['SON'] },
      { k: 'tasma', t: 'Uçlarda taşma (m)', d: 0.3, al: ['TASMA'] }, { k: 'sur', t: 'Parça', opts: [['A', 'Her açıklıkta ayrı'], ['S', 'Sürekli (baştan sona)']], d: 'A', al: ['PARCA'] }, { k: 'malz', t: 'Çelik sınıfı', opts: MALZ, d: 'S275', al: ['MALZ'] }], 'asik'); if (!r) return;
    const pr = K.profil(r.prof), as = YR().asikYerlesim(s.map(ustYuz), { aralik: +r.aralik, bas: +r.bas, son: +r.son, tasma: +r.tasma, h: pr.h, surekli: r.sur === 'S' });
    if (!as.length) { C.warn('Aşık konulacak çatı yüzü bulunamadı: seçimde aynı eğim ve saçak hizasında en az iki kiriş olmalı.'); return; }
    const made = as.map(q => yeni({ kind: 'kiris', a: q.a, b: q.b, prof: r.prof, rot: q.rot, ref: 'M', malz: r.malz, rol: 'asik' }));
    C.sel = made.slice(); C.emit('selection'); const Lt = made.reduce((t, e) => t + boyOf(e), 0);
    C.log(`${made.length} aşık ${K.goster(r.prof)} · eğim %${M.fmt(Math.abs(as[0].egim), 1)} · toplam ${M.fmt(Lt, 1)} m · ${M.fmt(Lt * pr.G, 0)} kg`);
  });
  /* ---------------- VİNÇ GUSESİ ---------------- */
  C.addCommand(['VINCGUSESI', 'CELIKGUSE', 'CRANEBRACKET'], 'Çelik kolona vinç gusesi: kolon yüzünden çıkan kısa kiriş parçası (konsol) ya da kademeli kolon (ray ekseni altında ayrı vinç ayağı). Guse üst kotu ve ray ekseni uzaklığı verilir; 3B, plan ve metraja kolonla girer. Yük / kapasite hesabı yapmaz.', async (I) => {
    const s = dusKolonlar(await I.sel('Vinç gusesi konacak çelik kolonları seçin')); if (!s.length) { C.warn('Seçimde düşey çelik kolon yok (CELIKKOLON).'); return; }
    const g0 = s[0].vguse || {};
    const r = await getP('Vinç gusesi', [{ k: 'tip', t: 'Guse', opts: [['K', 'Konsol (kısa kiriş parçası)'], ['D', 'Kademeli kolon (vinç ayağı)']], d: g0.tip || 'K', al: ['TIP'] },
      ...profAlan('vincguse', 'HEB', 'Konsol / ayak profili'), { k: 'yon', t: 'Yön', opts: [['ICE', 'İçe doğru (başlık yüzü, seçilen kolonların ortasına)'], ['ICERL', 'İçe doğru (gövde yanı)'], ['F', 'Ön (+ profil derinliği, başlık yüzü)'], ['A', 'Arka (− profil derinliği)'], ['R', 'Sağ (+ başlık yönü)'], ['L', 'Sol (− başlık yönü)'], ['FA', 'Ön + arka'], ['RL', 'Sağ + sol']], d: 'ICE', al: ['YON'] },
      { k: 'zt', t: 'Guse üst kotu (m; vinç kirişi altı)', d: g0.zt != null ? g0.zt : 5, al: ['ZT', 'KOT'] }, { k: 'e', t: 'Ray ekseni – kolon ekseni (m)', d: g0.e || 0.5, al: ['E'] },
      { k: 'isl', t: 'İşlem', opts: [['E', 'Ekle / güncelle'], ['S', 'Guseyi kaldır']], d: 'E', al: ['ISLEM'] }], 'vincguse'); if (!r) return;
    const orta = s.reduce((t, e) => [t[0] + M.p3(e.a)[0] / s.length, t[1] + M.p3(e.a)[1] / s.length], [0, 0]);
    const yonOf = e => r.yon === 'ICE' ? YR().iceYon({ a: M.p3(e.a), rot: e.rot }, orta, 'FA') : r.yon === 'ICERL' ? YR().iceYon({ a: M.p3(e.a), rot: e.rot }, orta, 'RL') : r.yon;
    for (const e of s) { if (r.isl === 'S') delete e.vguse; else e.vguse = { tip: r.tip, yon: yonOf(e), zt: +r.zt, e: +r.e, prof: r.prof }; delete e._c; }
    C.changed(); if (r.isl === 'S') { C.log(`${s.length} kolonun vinç gusesi kaldırıldı.`); return; }
    const ust = s.filter(e => +r.zt >= Math.max(M.p3(e.a)[2], M.p3(e.b)[2])); if (ust.length) C.warn(`${ust.length} kolonda guse üst kotu kolon üst kotunda ya da üstünde: kotu kontrol edin.`);
    C.log(`${s.length} kolona vinç gusesi: ${T.celik.info(s[0])}. Sonra VINCYOLU ile kiriş ve rayı koyun.`);
  });
  /* ---------------- VİNÇ YOLU ---------------- */
  C.addCommand(['VINCYOLU', 'VINCKIRISI', 'CRANERUNWAY'], 'Vinç yürüyüş yolu: gusesi olan çelik kolonları seçin; guselerin üstüne vinç kirişi (her açıklıkta bir parça), üstüne ray (A45 … A120 ya da lama) ve iki uca durdurucu takoz konur. Kiriş alt yüzü = guse üst kotu. Kapasite / tekerlek yükü hesabı yapmaz; profiller seçilir.', async (I) => {
    const s = dusKolonlar(await I.sel('Gusesi olan çelik kolonları seçin (VINCGUSESI)')).filter(e => e.vguse); if (s.length < 2) { C.warn('Gusesi olan en az iki çelik kolon seçin (VINCGUSESI).'); return; }
    const RAYLAR = [...K.adlar('RAY').map(n => [n, K.goster(n)]), ...['LAMA50x20', 'LAMA60x20', 'LAMA80x20', 'LAMA100x30'].filter(n => K.IDX[n]).map(n => [n, K.goster(n) + ' (lama ray)']), ['YOK', 'Ray yok']];
    const r = await getP('Vinç yolu', [...profAlan('vincyolu', 'HEB', 'Vinç kirişi'), { k: 'ray', t: 'Ray', opts: RAYLAR, d: 'A45', al: ['RAY'] }, { k: 'uz', t: 'Kiriş uç taşması (m; son kolondan öte)', d: 0.3, al: ['UZ'] },
      { k: 'takoz', t: 'Durdurucu takoz', opts: [['E', 'İki uçta var'], ['H', 'Yok']], d: 'E', al: ['TAKOZ'] }, { k: 'malz', t: 'Çelik sınıfı', opts: MALZ, d: 'S275', al: ['MALZ'] }], 'vincyolu'); if (!r) return;
    const pk = K.profil(r.prof), ray = r.ray !== 'YOK' ? K.adCoz(r.ray) : null, pr = ray ? K.profil(ray) : null, hr = pr ? pr.h : 0, uz = Math.max(0, +r.uz || 0);
    const yuk = s.flatMap(e => { const F = frame(e), p = K.profil(e.prof); return YR().guseParcalari({ a: F.a, b: F.b, rot: +e.rot || 0, hc: p.h, bc: p.b }, e.vguse).yuk; });
    const hat = YR().vincYoluHatlari(yuk); if (!hat.length) { C.warn('Aynı hizada en az iki guse bulunamadı (guse yönü ve ray ekseni uzaklığı aynı olmalı).'); return; }
    const made = [], Lt = 0.2, ly = lay('CELIK_ELEMAN');
    for (const h of hat) { const t = h.t, N = h.noktalar, at = (p, d) => [p[0] + t[0] * d, p[1] + t[1] * d];
      for (let i = 0; i + 1 < N.length; i++) { const zt = Math.max(N[i][2], N[i + 1][2]), k = YR().vincYoluKot(zt, pk.h, hr), a = at(N[i], i === 0 ? -uz : 0), b = at(N[i + 1], i + 2 === N.length ? uz : 0);
        made.push(yeni({ kind: 'kiris', a: [a[0], a[1], k.kirisUst], b: [b[0], b[1], k.kirisUst], prof: r.prof, rot: 0, ref: 'U', malz: r.malz, rol: 'vinc' })); }
      const z0 = Math.max(...N.map(p => p[2])), k = YR().vincYoluKot(z0, pk.h, hr), A = at(N[0], -uz), B = at(N[N.length - 1], uz), tk = r.takoz === 'E' ? Lt : 0;
      if (ray) { const a = [A[0] + t[0] * tk, A[1] + t[1] * tk], b = [B[0] - t[0] * tk, B[1] - t[1] * tk]; made.push(yeni({ kind: 'kiris', a: [a[0], a[1], k.rayOrta], b: [b[0], b[1], k.rayOrta], prof: ray, rot: 0, ref: 'M', malz: r.malz, rol: 'ray' })); }
      if (tk) for (const [p, d] of [[A, t], [B, [-t[0], -t[1]]]]) made.push(C.add(C.newEnt('celiktakoz', { p: [p[0], p[1], k.kirisUst], t: d, L: Lt, bw: pk.b / 1000, H: +(hr / 1000 + 0.15).toFixed(3), layer: ly })));
      C.log(`Vinç yolu hattı: ${N.length} guse · ${K.goster(r.prof)} kiriş üstü +${M.fmt(k.kirisUst, 3)}${ray ? ` · ${K.goster(ray)} ray üstü +${M.fmt(k.rayUst, 3)}` : ''} · boy ${M.fmt(Math.hypot(B[0] - A[0], B[1] - A[1]), 2)} m`); }
    C.sel = made.slice(); C.emit('selection'); C.log(`${hat.length} vinç yolu hattı. Vinç kapasitesi ve tekerlek yükleri girilmedi: kiriş / ray profili statik hesapla doğrulanmalıdır.`);
  });

  /* ---------------- METRAJ ---------------- */
  const ankrajKg = t => { const d = t.d / 1000, Lt = (t.L + t.harc + t.t + 1.2 * t.d + 4 * t.d) / 1000; return Math.PI * d * d / 4 * Lt * K.RO + 0.15 * d * 1000 * d * 10; }; // çubuk + kanca + 2 somun/pul (yaklaşık)
  C.celikMetrajVeri = (ents) => {
    const liste = [], levha = [], bulon = [];
    for (const e of ents || C.doc.ents) { if ((e.type !== 'celik' && e.type !== 'celiktakoz') || (C.lyLive && !C.lyLive(e.layer))) continue;
      if (e.type === 'celiktakoz') { levha.push(...takozLevha(e)); continue; }
      liste.push({ prof: e.prof, L: boyOf(e) }); for (const g of guseOf(e)) liste.push({ prof: g.prof, L: boyOf(g) });
      if (e.taban) { const t = e.taban; levha.push({ ad: 'Taban levhası', a: t.a / 1000, b: t.b / 1000, t: t.t / 1000 }); bulon.push({ ad: `M${t.d} ankraj L=${t.L}`, adet: t.n, kg: ankrajKg(t) }); } }
    return K.metraj(liste, levha, bulon);
  };
  C.addCommand(['CELIKMETRAJ', 'STEELBOM', 'CELIKLISTE'], 'Çelik malzeme listesi / metraj: profil, adet, toplam boy, kg/m, ağırlık (kg), boya alanı; taban levhaları ve ankrajlar. İsteğe bağlı tablo.', async (I) => {
    const m = C.celikMetrajVeri(); if (!m.satirlar.length) { C.warn('Çizimde çelik eleman yok (CELIKKOLON, CELIKKIRIS, CELIKCUBUK).'); return; }
    for (const r of m.satirlar) C.log(`${r.goster}: ${r.adet} adet · ${M.fmt(r.boy, 2)} m · ${M.fmt(r.G, 2)} kg/m → ${M.fmt(r.kg, 1)} kg`);
    for (const r of m.levha) C.log(`${r.ad} ${r.olcu} mm: ${r.adet} adet → ${M.fmt(r.kg, 1)} kg`); for (const r of m.bulon) C.log(`${r.ad}: ${r.adet} adet → ${M.fmt(r.kg, 1)} kg`);
    C.log(`TOPLAM ÇELİK ${M.fmt(m.toplam, 1)} kg (${M.fmt(m.toplam / 1000, 3)} t) · boya alanı ${M.fmt(m.boya, 1)} m²`);
    const p = await I.pt('Metraj tablosunun yeri (Enter = yerleştirme)'); if (!Array.isArray(p)) return;
    const th = C.annoH(yMm('tablo')), rh = th * 2.2, ly = lay('CELIK_METRAJ');
    const rows = [['ÇELİK MALZEME LİSTESİ', 'Adet', 'Boy (m)', 'kg/m', 'Ağırlık (kg)'], ...m.satirlar.map(r => [r.goster, String(r.adet), M.fmt(r.boy, 2), M.fmt(r.G, 2), M.fmt(r.kg, 1)]),
      ...m.levha.map(r => [`${r.ad} ${r.olcu}`, String(r.adet), '-', '-', M.fmt(r.kg, 1)]), ...m.bulon.map(r => [r.ad, String(r.adet), '-', '-', M.fmt(r.kg, 1)]),
      ['TOPLAM', '', M.fmt(m.satirlar.reduce((s, r) => s + r.boy, 0), 2), '', M.fmt(m.toplam, 1)]];
    const cw = [th * 20, th * 6, th * 8, th * 7, th * 10], X = [p[0]]; for (const w of cw) X.push(X[X.length - 1] + w);
    C._gvCur = 'T' + Date.now().toString(36);
    try {
      C.add(C.newEnt('text', { p: [X[0], p[1] + th * 0.8, 0], h: th * 1.2, s: `ÇELİK METRAJI — toplam ${M.fmt(m.toplam, 1)} kg · boya alanı ${M.fmt(m.boya, 1)} m²`, rot: 0, al: 'L', layer: ly }));
      for (let k = 0; k <= rows.length; k++) C.add(C.newEnt('line', { a: [X[0], p[1] - k * rh, 0], b: [X[X.length - 1], p[1] - k * rh, 0], layer: ly }));
      for (const x of X) C.add(C.newEnt('line', { a: [x, p[1], 0], b: [x, p[1] - rows.length * rh, 0], layer: ly }));
      rows.forEach((r, k) => r.forEach((t, c) => C.add(C.newEnt('text', { p: [c === 0 ? X[c] + th * 0.5 : X[c + 1] - th * 0.5, p[1] - (k + 0.5) * rh - th / 2, 0], h: th * 0.9, s: t, rot: 0, al: c === 0 ? 'L' : 'R', layer: ly }))));
    } finally { C._gvCur = null; }
  });

  /* statik çözücü için (ileride): çelik elemanlar çubuk eleman olarak */
  C.celikStatikCubuklar = () => (C.doc ? C.doc.ents : []).filter(e => e.type === 'celik' && e.rol !== 'ray').map(e => Object.assign({ id: e.id, a: M.p3(e.a), b: M.p3(e.b), rot: +e.rot || 0, malz: e.malz || 'S275', fy: { S235: 235e6, S275: 275e6, S355: 355e6 }[e.malz || 'S275'] }, K.cubuk(e.prof)));

  /* ---------------- şerit: Çelik sekmesi (İnşaat'tan sonra) ---------------- */
  try {
    if (C.ribbon && Array.isArray(C.ribbon.tabs) && !C.ribbon.tabs.some(t => t[0] === 'Çelik')) {
      const B = (cmd, t, i, opts) => ({ cmd, t, i, big: true, opts }), s = (cmd, t, i) => ({ cmd, t, i });
      const tab = ['Çelik', [
        ['Katalog', [B('CELIKPROFIL', 'Profil kataloğu', 'table'), s('CELIKKESIT', 'Profil kesiti', 'rec')]],
        ['Elemanlar', [B('CELIKKOLON', 'Çelik kolon', 'col', [['CELIKKOLON AILE=HEA PROF=HEA200', 'HEA 200'], ['CELIKKOLON AILE=HEB PROF=HEB200', 'HEB 200'], ['CELIKKOLON AILE=SHS PROF=KUTU100x100x5', 'Kutu 100×100×5'], ['CELIKKOLON', 'Ayarlar…']]), B('CELIKKIRIS', 'Çelik kiriş', 'beam', [['CELIKKIRIS AILE=IPE PROF=IPE200', 'IPE 200'], ['CELIKKIRIS AILE=IPE PROF=IPE300', 'IPE 300'], ['CELIKKIRIS AILE=UPN PROF=UPN160', 'UPN 160 (aşık)'], ['CELIKKIRIS', 'Ayarlar…']]), B('CELIKCUBUK', 'Çapraz / çubuk', 'line')]],
        ['Birleşim', [B('TABANLEVHASI', 'Taban levhası', 'found'), B('CELIKDETAY', 'Birleşim detayı', 'print', [['CELIKDETAY TUR=TABAN', 'Taban levhası + ankraj'], ['CELIKDETAY TUR=ALIN', 'Kiriş–kolon alın levhası'], ['CELIKDETAY TUR=ASIK', 'Aşık bağlantısı']])]],
        ['Çatı ve vinç', [B('CATIKIRISI', 'Çatı kirişi', 'beam', [['CATIKIRISI TIP=besik', 'Beşik çatı'], ['CATIKIRISI TIP=tek', 'Tek eğimli'], ['CATIKIRISI', 'Ayarlar…']]), B('ASIKDIZ', 'Aşık', 'grid', [['ASIKDIZ AILE=UPN PROF=UPN160', 'UPN 160'], ['ASIKDIZ AILE=IPE PROF=IPE160', 'IPE 160'], ['ASIKDIZ AILE=SHS PROF=KUTU100x100x4', 'Kutu 100×100×4'], ['ASIKDIZ', 'Ayarlar…']]), B('VINCGUSESI', 'Vinç gusesi', 'col', [['VINCGUSESI TIP=K', 'Konsol'], ['VINCGUSESI TIP=D', 'Kademeli kolon'], ['VINCGUSESI', 'Ayarlar…']]), B('VINCYOLU', 'Vinç yolu', 'rail')]],
        ['Metraj', [B('CELIKMETRAJ', 'Çelik metrajı', 'table')]],
      ]];
      const i = C.ribbon.tabs.findIndex(t => t[0] === 'İnşaat'); C.ribbon.tabs.splice(i >= 0 ? i + 1 : C.ribbon.tabs.length, 0, tab); C.ribbon.render();
    }
  } catch (er) { console.error('çelik şerit', er); }

  if (window.DIL) window.DIL.ekle('en', 'English', [
    ['Çelik', 'Steel'], ['Katalog', 'Catalogue'], ['Elemanlar', 'Members'], ['Birleşim', 'Connections'], ['Profil kataloğu', 'Section catalogue'], ['Profil kesiti', 'Section drawing'],
    ['Çelik kolon', 'Steel column'], ['Çelik kiriş', 'Steel beam'], ['Çapraz / çubuk', 'Brace / member'], ['Taban levhası', 'Base plate'], ['Birleşim detayı', 'Connection detail'], ['Çelik metrajı', 'Steel take-off'],
    ['Çelik profil kataloğu', 'Steel section catalogue'], ['Kolon yerleştir', 'Place column'], ['Kiriş çiz', 'Draw beam'], ['Çubuk çiz', 'Draw member'], ['Kesitini çiz', 'Draw section'], ['Kapat', 'Close'],
    ['Profil ailesi', 'Section family'], ['Profil', 'Section'], ['Yükseklik (m)', 'Height (m)'], ['Çelik sınıfı', 'Steel grade'], ['Taban levhası + ankraj', 'Base plate + anchors'], ['Var (ön boyut)', 'Yes (preliminary size)'],
    ['Üst kot (çelik üst yüzü, m)', 'Top level (top of steel, m)'], ['Zincir (her nokta öncekine bağlanır)', 'Chain (each point joins the previous)'], ['Tek tek (iki nokta)', 'One by one (two points)'],
    ['Başlangıç kotu (m)', 'Start level (m)'], ['Bitiş kotu (m)', 'End level (m)'], ['Girilen kotlar', 'Entered levels'], ['Tıklanan noktaların kotu (3B)', 'Levels of clicked points (3D)'],
    ['Detay ölçeği 1/…', 'Detail scale 1/…'], ['Detay', 'Detail'], ['Kolon profili', 'Column section'], ['Kiriş profili', 'Beam section'], ['Aşık profili', 'Purlin section'], ['Çatı kirişi (makas) profili', 'Rafter section'],
    ['Kolon ayağı — taban levhası ve ankraj', 'Column base — base plate and anchors'], ['Kiriş – kolon alın levhalı birleşim', 'Beam–column end-plate connection'], ['Aşık – çatı kirişi bağlantısı', 'Purlin–rafter connection'],
    ['Çelik kolonları seçin', 'Select steel columns'], ['Kolon yeri', 'Column position'], ['Kesitin yeri (profil merkezi)', 'Section position (centre)'], ['Detayın yeri (kolon / kiriş ekseni)', 'Detail position (column / beam axis)'],
    ['Metraj tablosunun yeri (Enter = yerleştirme)', 'Take-off table position (Enter = do not place)'], ['ÇELİK MALZEME LİSTESİ', 'STEEL MATERIAL LIST'], ['Adet', 'Qty'], ['Boy (m)', 'Length (m)'], ['Ağırlık (kg)', 'Weight (kg)'], ['TOPLAM', 'TOTAL'],
    ['Çatı ve vinç', 'Roof and crane'], ['Çatı kirişi', 'Rafter'], ['Aşık', 'Purlin'], ['Vinç gusesi', 'Crane bracket'], ['Vinç yolu', 'Crane runway'], ['Beşik çatı', 'Gable roof'], ['Tek eğimli', 'Mono-pitch'], ['Konsol', 'Cantilever'], ['Kademeli kolon', 'Stepped column'], ['Ayarlar…', 'Settings…'],
    ['Çatı kirişi (makas)', 'Rafter'], ['Çatı', 'Roof'], ['Beşik (iki eğimli, mahya ortada)', 'Gable (ridge at mid-span)'], ['Eğim (%)', 'Slope (%)'], ['Mahya kotu (m; 0 = eğimden; tek eğimde yüksek aks)', 'Ridge level (m; 0 = from slope; high axis for mono-pitch)'],
    ['Saçak taşması (m, yatay)', 'Eave overhang (m, horizontal)'], ['Yerleşim', 'Placement'], ['Seçilen çelik kolonlardan', 'From selected steel columns'], ['İki aks + tekrar', 'Two axes + repeat'], ['Kiriş yönü (kolonlardan)', 'Rafter direction (from columns)'],
    ['Otomatik (çok çerçeve veren yön)', 'Automatic (direction giving more frames)'], ['X yönü', 'X direction'], ['Y yönü', 'Y direction'], ['Saçak kotu (iki aks; kiriş üst yüzü, m)', 'Eave level (two axes; top of rafter, m)'], ['Çerçeve aralığı en çok (m; iki aks)', 'Max frame spacing (m; two axes)'],
    ['Çatı kirişlerinin oturacağı çelik kolonları seçin', 'Select the steel columns carrying the rafters'], ['Birinci saçak aksı (kolon ekseni)', 'First eave axis (column centre)'], ['Karşı saçak aksı', 'Opposite eave axis'], ['Son çerçevenin hizası (Enter = tek çerçeve)', 'Line of last frame (Enter = single frame)'],
    ['Aşık aralığı en çok (m, eğim boyunca)', 'Max purlin spacing (m, along slope)'], ['Saçak ucundan ilk aşık (m)', 'First purlin from eave end (m)'], ['Mahyadan son aşık (m)', 'Last purlin from ridge (m)'], ['Uçlarda taşma (m)', 'End overhang (m)'], ['Parça', 'Pieces'],
    ['Her açıklıkta ayrı', 'One per bay'], ['Sürekli (baştan sona)', 'Continuous'], ['Çatı kirişlerini seçin (CATIKIRISI)', 'Select rafters (CATIKIRISI)'],
    ['Guse', 'Bracket'], ['Konsol (kısa kiriş parçası)', 'Cantilever (short beam stub)'], ['Kademeli kolon (vinç ayağı)', 'Stepped column (crane leg)'], ['Konsol / ayak profili', 'Bracket / leg section'], ['Yön', 'Direction'],
    ['İçe doğru (başlık yüzü, seçilen kolonların ortasına)', 'Inward (flange face, towards the centre of selected columns)'], ['İçe doğru (gövde yanı)', 'Inward (web side)'], ['Ön (+ profil derinliği, başlık yüzü)', 'Front (+ section depth, flange face)'], ['Arka (− profil derinliği)', 'Back (− section depth)'], ['Sağ (+ başlık yönü)', 'Right (+ flange direction)'], ['Sol (− başlık yönü)', 'Left (− flange direction)'], ['Ön + arka', 'Front + back'], ['Sağ + sol', 'Right + left'],
    ['Guse üst kotu (m; vinç kirişi altı)', 'Bracket top level (m; underside of crane beam)'], ['Ray ekseni – kolon ekseni (m)', 'Rail axis to column axis (m)'], ['Guseyi kaldır', 'Remove bracket'], ['Vinç gusesi konacak çelik kolonları seçin', 'Select steel columns for crane brackets'],
    ['Vinç kirişi', 'Crane beam'], ['Ray', 'Rail'], ['Ray yok', 'No rail'], ['Kiriş uç taşması (m; son kolondan öte)', 'Beam end overhang (m; beyond last column)'], ['Durdurucu takoz', 'End stop'], ['İki uçta var', 'At both ends'], ['Yok', 'None'],
    ['Gusesi olan çelik kolonları seçin (VINCGUSESI)', 'Select steel columns with crane brackets (VINCGUSESI)'], ['Vinç rayı (A tipi)', 'Crane rail (type A)'], ['Vinç yolu durdurucu takozu', 'Crane runway end stop'],
    ['Vinç kirişi — aile', 'Crane beam — family'], ['Konsol / ayak profili — aile', 'Bracket / leg section — family'],
    ['TABAN LEVHASI DETAYI', 'BASE PLATE DETAIL'], ['KİRİŞ – KOLON ALIN LEVHALI BİRLEŞİM DETAYI', 'BEAM–COLUMN END PLATE CONNECTION DETAIL'], ['AŞIK BAĞLANTI DETAYI', 'PURLIN CONNECTION DETAIL'], ['GÖRÜNÜŞ', 'ELEVATION'], ['PLAN', 'PLAN'], ['ALIN LEVHASI GÖRÜNÜŞÜ', 'END PLATE VIEW'],
  ]);
  /* çizim (detay, kesit, metraj tablosu) ve istem metinleri: '#' sayı kalıpları ve metin içi terimler */
  if (window.DIL) window.DIL.ekle('en', 'English', [
    ['# AD. M# ANKRAJ L=# (#)', '# PCS M# ANCHOR BOLTS L=# (#)'], ['# AD. M# BULON (#)', '# PCS M# BOLTS (#)'], ['# mm DÖKME HARCI (GROUT)', '# mm GROUT'],
    ['KÖŞE KAYNAĞI a=# mm (çevre)', 'FILLET WELD a=# mm (all around)'], ['KÖŞE KAYNAĞI a=# mm (iki yandan)', 'FILLET WELD a=# mm (both sides)'], ['KÖŞE KAYNAĞI a=# mm', 'FILLET WELD a=# mm'],
    ['Ölçek 1/# — ölçüler mm — ön boyut, statik hesapla doğrulanmalıdır', 'Scale 1/# — dimensions in mm — preliminary sizes, to be verified by structural calculation'], ['Ölçek 1/# — ölçüler mm', 'Scale 1/# — dimensions in mm'],
    ['ÇELİK METRAJI — toplam # kg · boya alanı # m²', 'STEEL TAKE-OFF — total # kg · paint area # m²'], ['TAKVİYE LEVHASI t=#', 'STIFFENER PLATE t=#'],
    ['Vinç rayı', 'Crane rail'], ['Vinç ayağı', 'Crane leg'], ['vinç gusesi', 'crane bracket'], ['kademeli kolon', 'stepped column'], ['konsol', 'cantilever'], ['ray ekseni', 'rail axis'], ['eğim', 'slope'],
    ['Durdurucu takoz alın levhası', 'End stop front plate'], ['Durdurucu takoz yan levhası (üçgen)', 'End stop side plate (triangular)'], ['Durdurucu takoz taban levhası', 'End stop base plate'], ['guse +#', 'bracket +#'], ['(lama ray)', '(flat bar rail)'],
    ['Ray #', 'Rail #'], ['Gusesi olan en az iki çelik kolon seçin (VINCGUSESI).', 'Select at least two steel columns with crane brackets (VINCGUSESI).'], ['Aynı hizada en az iki guse bulunamadı (guse yönü ve ray ekseni uzaklığı aynı olmalı).', 'No two brackets found on one line (bracket direction and rail axis distance must match).'],
    ['En az iki çatı kirişi seçin (aynı çatı yüzünde yan yana).', 'Select at least two rafters (side by side on the same roof face).'], ['En az iki düşey çelik kolon seçin (CELIKKOLON).', 'Select at least two vertical steel columns (CELIKKOLON).'], ['Seçimde düşey çelik kolon yok (CELIKKOLON).', 'No vertical steel column in selection (CELIKKOLON).'],
    ['Vinç kapasitesi ve tekerlek yükleri girilmedi: kiriş / ray profili statik hesapla doğrulanmalıdır.', 'Crane capacity and wheel loads were not entered: beam / rail sections must be verified by structural calculation.'], ['(kaynaklı levha; tampon ayrıca)', '(welded plates; buffer separate)'],
    ['köşe kaynağı', 'fillet weld'], ['çatı kirişi (makas)', 'rafter'], ['taban levhası', 'base plate'], ['alın levhası', 'end plate'], ['takviye levhası', 'stiffener plate'], ['kulak levhası', 'cleat plate'],
    ['dökme harcı', 'grout'], ['ankraj', 'anchor bolt'], ['bulon', 'bolt'], ['aşık', 'purlin'], ['kolon', 'column'], ['kiriş', 'beam'], ['eğik', 'inclined'], ['(zayıf asal eksen)', '(minor principal axis)'], ['boya alanı', 'paint area'], ['profil bulunamadı', 'section not found'],
    ['Sonraki kolon', 'Next column'], ['Enter bitir', 'Enter to finish'], ['Kolon yeri', 'Column position'], ['Kirişin sonraki noktası', 'Next beam point'], ['Kiriş başlangıcı', 'Beam start'], ['üst kot', 'top level'],
    ['Sonraki çubuğun başlangıcı', 'Start of next member'], ['Çubuk başlangıcı', 'Member start'], ['Çubuk bitişi', 'Member end'],
    ['Seçili:', 'Selected:'], ['L (eşit)', 'L (equal)'], ['L (eşit olm.)', 'L (unequal)'], ['ölçüler mm', 'dimensions in mm'],
    ['Değerler kesitin gerçek dış hattından hesaplanır (tablolarla fark %2\'den az). Satıra tıklayın.', 'Values are computed from the true section outline (within 2% of published tables). Click a row.'],
    ['Geniş başlıklı I (HEA)', 'Wide flange I (HEA)'], ['Geniş başlıklı I (HEB)', 'Wide flange I (HEB)'], ['Geniş başlıklı I (HEM)', 'Wide flange I (HEM)'], ['I profil (IPE)', 'I section (IPE)'], ['I profil (IPN / NPI, eğimli başlık)', 'I section (IPN, tapered flange)'],
    ['U profil (UPN / NPU, eğimli başlık)', 'Channel (UPN, tapered flange)'], ['U profil (UPE, paralel başlık)', 'Channel (UPE, parallel flange)'], ['Eşit kenarlı köşebent', 'Equal angle'], ['Eşit olmayan kenarlı köşebent', 'Unequal angle'],
    ['Kare kutu profil (SHS)', 'Square hollow section (SHS)'], ['Dikdörtgen kutu profil (RHS)', 'Rectangular hollow section (RHS)'], ['Boru profil (CHS)', 'Circular hollow section (CHS)'], ['T profil', 'T section'], ['Lama (yassı çelik)', 'Flat bar'],
    ['Açı (°; 0 = başlıklar X yönünde)', 'Angle (°; 0 = flanges along X)'], ['Kot', 'Level'], ['Çizim', 'Drawing'], ['İşlem', 'Action'], ['— aile', '— family'], ['Otomatik', 'Automatic'],
    ['Levha boyu a (mm; profil derinliği yönü, 0 = otomatik)', 'Plate length a (mm; along section depth, 0 = automatic)'], ['Levha eni b (mm; 0 = otomatik)', 'Plate width b (mm; 0 = automatic)'], ['Kalınlık (mm; 0 = otomatik)', 'Thickness (mm; 0 = automatic)'],
    ['Ankraj çapı M (mm; 0 = otomatik)', 'Anchor diameter M (mm; 0 = automatic)'], ['Ankraj adedi', 'Number of anchors'], ['Ekle / güncelle', 'Add / update'], ['Taban levhasını kaldır', 'Remove base plate'],
    ['Eksen (M orta / U üst yüz)', 'Axis (M centre / U top face)'], ['Dönme (°)', 'Rotation (°)'], ['Malzeme (S235 / S275 / S355)', 'Material (S235 / S275 / S355)'], ['Ana profil', 'Main section'], ['İkinci profil (kiriş / aşık)', 'Second section (beam / purlin)'], ['Ölçek (1/…)', 'Scale (1/…)'], ['Tür (taban / alin / asik)', 'Type (taban / alin / asik)'],
  ]);
})(window.C);

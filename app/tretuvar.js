/* ArıtmaCAD — İNŞAAT › TRETUVAR (bina çevresi kaldırım)
   tretuvar nesnesi: { pts: bina dış yüzü çevresi (CCW), w: genişlik (m), egim: dışa eğim (%), zg: zemin kotu, h: tretuvar üst kotu (zeminden, m),
     kap: kaplama, tk: kaplama (cm), th: harç / yatak (cm), tb: beton (cm), ts: stabilize (cm), bw / bh: bordür eni / yüksekliği (cm), by: bordür yatak betonu (cm), derz: derz aralığı (m) }
   Katmanlar yukarıdan aşağı: kaplama › harç / kum yatak › beton (C16/20) › sıkıştırılmış stabilize; dış kenarda beton yatak üstünde gömülü bordür; bina dibinde elastik derz.
   Komutlar: TRETUVAR (bina çevresine otomatik), TRETUVARDETAY (1/10 kesit detayı) */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, P, TX } = C.prim;
  const K = () => C._kap, I_ = () => C._ins;
  const KAP = {
    karo: { ad: 'Beton karo 40×40', t: 3, col: [0.70, 0.69, 0.66], g: 0.4, yatak: 'Çimento harcı' },
    parke: { ad: 'Kilitli beton parke taşı', t: 6, col: [0.62, 0.55, 0.50], g: 0.2, yatak: 'Kum yatak' },
    tas: { ad: 'Doğal taş (andezit / bazalt)', t: 3, col: [0.50, 0.50, 0.52], g: 0.3, yatak: 'Çimento harcı' },
    granit: { ad: 'Granit plak', t: 3, col: [0.58, 0.57, 0.58], g: 0.6, yatak: 'Çimento harcı' },
    beton: { ad: 'Perdahlı beton (yüzey sertleştirici)', t: 0, col: [0.72, 0.72, 0.70], yatak: null },
  };
  C.TRETUVAR_KAP = KAP; // kaplama kataloğu: ünite yapıları (anaerobik havuz) tretuvar kaplamasını buradan seçer
  const COL = { harc: [0.80, 0.78, 0.72], beton: [0.68, 0.68, 0.66], stab: [0.62, 0.55, 0.44], bord: [0.80, 0.80, 0.78], yatak: [0.66, 0.66, 0.64] };
  const o_ = O => Object.entries(O).map(([k, v]) => [k, v.ad]);
  /* kesitte katman ayrımı: üçgen rengi → katman (kaplama / harç / beton / stabilize / bordür / bordür yatağı) */
  C.tretSecMat = (e, rgb) => { const kp = KAP[e.kap] || KAP.karo, L = [[kp.col, e.kap === 'beton' ? 'beton' : 'kap'], [COL.harc, 'harc'], [COL.beton, 'beton'], [COL.stab, 'stab'], [COL.bord, 'bord'], [COL.yatak, 'yatak']];
    let best = 'beton', bd = 0.02; for (const [c, k] of L) { const d = Math.abs(c[0] - rgb[0]) + Math.abs(c[1] - rgb[1]) + Math.abs(c[2] - rgb[2]); if (d < bd) { bd = d; best = k; } } return 'TR:' + best; };
  const ccw = q => (M.polyArea(q) < 0 ? q.slice().reverse() : q.slice());
  const off = (q, d) => { const n = q.length, out = []; for (let i = 0; i < n; i++) { const a = q[(i - 1 + n) % n], b = q[i], c = q[(i + 1) % n], u1 = M.norm([b[0] - a[0], b[1] - a[1], 0]), u2 = M.norm([c[0] - b[0], c[1] - b[1], 0]), n1 = [u1[1], -u1[0]], n2 = [u2[1], -u2[0]], k = 1 + n1[0] * n2[0] + n1[1] * n2[1]; out.push(k < 1e-6 ? [b[0] + n1[0] * d, b[1] + n1[1] * d] : [b[0] + (n1[0] + n2[0]) * d / k, b[1] + (n1[1] + n2[1]) * d / k]); } return out; };
  /* küçük girinti / çıkıntıları (kolon taşmaları) en dıştaki yüze hizalayarak kaldır */
  const dejog = (q0, lim) => {
    let q = ccw(q0).map(p => [p[0], p[1]]);
    const clean = () => { let ch = true; while (ch && q.length > 3) { ch = false; for (let i = 0; i < q.length; i++) { const a = q[(i - 1 + q.length) % q.length], b = q[i], c = q[(i + 1) % q.length]; if (M.dist2(a, b) < 1e-6 || Math.abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) < 1e-9 * (1 + M.dist2(a, b) * M.dist2(b, c))) { q.splice(i, 1); ch = true; break; } } } };
    clean();
    for (let guard = 0; guard < 200; guard++) {
      let done = true; const n = q.length; if (n < 5) break;
      for (let i = 0; i < n; i++) {
        const a = q[(i - 1 + n) % n], b = q[i], c = q[(i + 1) % n], d = q[(i + 2) % n], Ls = M.dist2(b, c); if (Ls >= lim) continue;
        const u1 = M.norm([b[0] - a[0], b[1] - a[1], 0]), u3 = M.norm([d[0] - c[0], d[1] - c[1], 0]); if (u1[0] * u3[0] + u1[1] * u3[1] < 0.999) continue;
        const nO = [u1[1], -u1[0]], del = (c[0] - b[0]) * nO[0] + (c[1] - b[1]) * nO[1];
        if (del > 0) { const ia = (i - 1 + n) % n; q[ia] = [a[0] + nO[0] * del, a[1] + nO[1] * del]; const pa = q[(ia - 1 + n) % n]; void pa; } else { const id = (i + 2) % n; q[id] = [d[0] - nO[0] * del, d[1] - nO[1] * del]; }
        q.splice(i, 1); const j = i < q.length ? i : 0; q.splice(j, 1); clean(); done = false; break;
      }
      if (done) break;
    }
    return q;
  };
  const per = q => q.reduce((s, p, i) => s + M.dist2(p, q[(i + 1) % q.length]), 0);
  const geo = e => {
    const q = ccw(e.pts), w = +e.w || 1, bw = (+e.bw || 10) / 100, s = (+e.egim || 2) / 100, zg = +e.zg || 0, top = zg + (+e.h || 0.15);
    const kp = KAP[e.kap] || KAP.karo, tk = (e.kap === 'beton' ? 0 : (+e.tk || kp.t)) / 100, th = (e.kap === 'beton' ? 0 : (+e.th || 3)) / 100, tb = (+e.tb || 10) / 100, ts = (+e.ts || 15) / 100;
    const inner = q, pav = off(q, w - bw), outer = off(q, w); // kaplama bordüre kadar, bordür en dışta
    const zt = d => top - d * s; // binadan d uzaklıkta üst kot
    return { q, w, bw, s, zg, top, tk, th, tb, ts, kp, inner, pav, outer, zt, bh: (+e.bh || 20) / 100, by: (+e.by || 10) / 100, tot: tk + th + tb + ts };
  };
  /* halka şerit: iç (d0) ile dış (d1) uzaklık arasında, üst kotlar eğimli, katman ofsetleri a (üstten aşağı) */
  const ring = (out, G, d0, d1, a0, a1, col) => {
    const L0 = d0 > 0 ? off(G.q, d0) : G.q, L1 = off(G.q, d1), n = G.q.length;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, z0t = G.zt(d0), z1t = G.zt(d1); const c8 = [[L0[i][0], L0[i][1], z0t - a1], [L0[j][0], L0[j][1], z0t - a1], [L1[j][0], L1[j][1], z1t - a1], [L1[i][0], L1[i][1], z1t - a1], [L0[i][0], L0[i][1], z0t - a0], [L0[j][0], L0[j][1], z0t - a0], [L1[j][0], L1[j][1], z1t - a0], [L1[i][0], L1[i][1], z1t - a0]]; I_().hexa(out, c8, col); }
  };
  const ringFlat = (out, G, d0, d1, zb, ztp, col) => { const L0 = off(G.q, d0), L1 = off(G.q, d1), n = G.q.length; for (let i = 0; i < n; i++) { const j = (i + 1) % n; I_().hexa(out, [[L0[i][0], L0[i][1], zb], [L0[j][0], L0[j][1], zb], [L1[j][0], L1[j][1], zb], [L1[i][0], L1[i][1], zb], [L0[i][0], L0[i][1], ztp], [L0[j][0], L0[j][1], ztp], [L1[j][0], L1[j][1], ztp], [L1[i][0], L1[i][1], ztp]], col); } };
  const qty = e => {
    const G = geo(e), A = Math.abs(M.polyArea(G.pav)) - Math.abs(M.polyArea(G.q)), Lb = per(off(G.q, G.w - G.bw / 2)), out = [];
    if (e.kap !== 'beton') { out.push([`Tretuvar kaplaması — ${G.kp.ad} (${Math.round(G.tk * 100)} cm)`, 'm²', A]); if (G.th > 0) out.push([`Tretuvar ${G.kp.yatak ? G.kp.yatak.toLowerCase() : 'yatak'} (${Math.round(G.th * 100)} cm)`, 'm²', A]); } else out.push(['Tretuvar perdahlı beton yüzey', 'm²', A]);
    out.push([`Tretuvar betonu C16/20 (${Math.round(G.tb * 100)} cm)`, 'm³', A * G.tb]);
    out.push([`Sıkıştırılmış stabilize (${Math.round(G.ts * 100)} cm)`, 'm³', (Math.abs(M.polyArea(G.outer)) - Math.abs(M.polyArea(G.q))) * G.ts]);
    out.push([`Beton bordür ${Math.round(G.bw * 100)}×${Math.round(G.bh * 100)}`, 'm', Lb]);
    out.push([`Bordür yatak betonu (${Math.round(G.by * 100)} cm)`, 'm³', Lb * (G.bw + 0.10) * G.by]);
    const dig = Math.max(0, G.zg - (G.top - G.tot)); out.push(['Tretuvar kazısı (zemin altı)', 'm³', (Math.abs(M.polyArea(G.outer)) - Math.abs(M.polyArea(G.q))) * dig]);
    out.push(['Bina dibi elastik derz (mastik)', 'm', per(G.q)]); if (+e.derz > 0) out.push([`Dilatasyon derzi (${e.derz} m ara)`, 'adet', Math.floor(per(G.q) / +e.derz)]);
    return out;
  };
  C.tretuvarMetraj = () => { const m = new Map(); for (const e of C.doc.ents) { if (e.type !== 'tretuvar') continue; for (const [ad, br, v] of qty(e)) { const k = ad + '|' + br; m.set(k, (m.get(k) || 0) + v); } } return [...m.entries()].map(([k, v]) => { const [ad, br] = k.split('|'); return [ad, br, v]; }); };
  T.tretuvar = {
    label: 'Tretuvar', ifc: 'IfcSlab',
    prims: e => {
      const G = geo(e), z = p => [p[0], p[1], 0], out = [P(G.q.map(z), true, { lw: 25 }), P(G.outer.map(z), true, { lw: 35 }), P(G.pav.map(z), true, { lw: 18 })], n = G.q.length, th = C.annoH(2);
      // derzler (dik kısa çizgiler) ve eğim okları
      const dz = +e.derz || 2;
      for (let i = 0; i < n; i++) { const a = G.q[i], b = G.q[(i + 1) % n], Ls = M.dist2(a, b); if (Ls < 0.1) continue; const u = [(b[0] - a[0]) / Ls, (b[1] - a[1]) / Ls], nn = [u[1], -u[0]]; for (let s = dz; s < Ls - 0.2; s += dz) out.push(L(z([a[0] + u[0] * s, a[1] + u[1] * s]), z([a[0] + u[0] * s + nn[0] * (G.w - G.bw), a[1] + u[1] * s + nn[1] * (G.w - G.bw)]), { lw: 9 }));
        if (Ls > 2.5) { const m = [a[0] + u[0] * Ls / 2 + nn[0] * G.w * 0.25, a[1] + u[1] * Ls / 2 + nn[1] * G.w * 0.25], m2 = [m[0] + nn[0] * G.w * 0.45, m[1] + nn[1] * G.w * 0.45], hw = G.w * 0.1; out.push(L(z(m), z(m2), { lw: 13 }), L(z(m2), z([m2[0] - nn[0] * hw + u[0] * hw * 0.6, m2[1] - nn[1] * hw + u[1] * hw * 0.6]), { lw: 13 }), L(z(m2), z([m2[0] - nn[0] * hw - u[0] * hw * 0.6, m2[1] - nn[1] * hw - u[1] * hw * 0.6]), { lw: 13 })); out.push(TX(z([m[0] + u[0] * th * 2, m[1] + u[1] * th * 2]), th * 0.8, `%${+e.egim || 2}`, 0, 'BL')); } }
      return out;
    },
    mesh: e => {
      const G = geo(e), out = I_().newMesh(), dP = G.w - G.bw;
      let a = 0; if (G.tk > 0) { ring(out, G, 0, dP, a, a + G.tk, G.kp.col); a += G.tk; } if (G.th > 0) { ring(out, G, 0, dP, a, a + G.th, COL.harc); a += G.th; }
      ring(out, G, 0, dP, a, a + G.tb, e.kap === 'beton' ? G.kp.col : COL.beton); a += G.tb; ring(out, G, 0, G.w, a, a + G.ts, COL.stab);
      const btop = G.zt(dP) + (+e.bc || 0) / 100, bbot = btop - G.bh; ringFlat(out, G, dP, G.w, bbot, btop, COL.bord); ringFlat(out, G, dP - 0.05, G.w + 0.05, bbot - G.by, bbot, COL.yatak);
      return [out];
    },
    xf: (e, X) => { let dz = 0; try { const q = X.p([0, 0, 0]); dz = q && q.length > 2 ? (q[2] || 0) : 0; } catch (err) { } e.zg = (+e.zg || 0) + dz; e.pts = e.pts.map(q => X.p([q[0], q[1], 0]).slice(0, 2)); },
    snaps: e => geo(e).outer.map(p => ({ p: [p[0], p[1], 0], k: 'end' })),
    info: e => { const G = geo(e); return `Tretuvar · genişlik ${Math.round(G.w * 100)} cm · eğim %${+e.egim || 2} · üst kot ${(G.top >= 0 ? '+' : '') + G.top.toFixed(2)} (zeminden ${Math.round((G.top - G.zg) * 100)} cm) · toplam kalınlık ${Math.round(G.tot * 100)} cm · zeminden ${Math.round(Math.max(0, G.zg - (G.top - G.tot)) * 100)} cm gömülü · ${qty(e).slice(0, 2).map(([a, b, v]) => `${a} ${M.fmt(v, 2)} ${b}`).join(' · ')}`; },
  };
  /* ---------- KOMUT ---------- */
  C.addCommand(['TRETUVAR', 'KALDIRIM', 'TROTUAR'], 'Tretuvar: bina çevresine otomatik — genişlik, dışa eğim, üst kot (zeminden), kaplama (karo / kilitli parke / doğal taş / granit / perdahlı beton), harç, beton, stabilize kalınlıkları, gömülü bordür ve yatak betonu, derz aralığı.', async (I) => {
    const r = await I_().getParams('Tretuvar — ayarlar', [
      { k: 'w', t: 'Genişlik (cm, bina yüzünden bordür dışına)', d: 100, al: ['W', 'GEN'] }, { k: 'egim', t: 'Dışa eğim (%)', d: 2, al: ['EGIM'] },
      { k: 'zg', t: 'Zemin (tabii / tesviye) kotu (m)', d: 0, al: ['ZG'] }, { k: 'h', t: 'Tretuvar üst kotu — zeminden yükseklik (cm)', d: 15, al: ['H'] },
      { k: 'kap', t: 'Kaplama', opts: o_(KAP), d: 'karo', al: ['KAP'] }, { k: 'tk', t: 'Kaplama kalınlığı (cm, 0 = kataloğa göre)', d: 0, al: ['TK'] }, { k: 'th', t: 'Harç / kum yatak (cm)', d: 3, al: ['TH'] },
      { k: 'tb', t: 'Beton C16/20 (cm)', d: 10, al: ['TB'] }, { k: 'ts', t: 'Sıkıştırılmış stabilize (cm)', d: 15, al: ['TS'] },
      { k: 'bw', t: 'Bordür eni (cm)', d: 10, al: ['BW'] }, { k: 'bh', t: 'Bordür yüksekliği (cm)', d: 30, al: ['BH'] }, { k: 'bc', t: 'Bordür üstü kaplamadan yükseklik (cm)', d: 0, al: ['BC'] }, { k: 'by', t: 'Bordür yatak betonu (cm)', d: 10, al: ['BY'] },
      { k: 'derz', t: 'Dilatasyon derzi aralığı (m)', d: 2, al: ['DERZ'] },
      { k: 'pay', t: 'Bina yüzünden ek pay (cm; mantolama / sıva otomatik eklenir)', d: 0, al: ['PAY'] },
    ], 'tretuvar'); if (!r) return;
    const OF = K() && K().outerFacade((+r.zg || 0) + 0.3); if (!OF) { C.warn('Bina dış çevresi bulunamadı (perde / duvar / kolon yok).'); return; }
    let ext = (+r.pay || 0) / 100; const yc = C.doc.ents.find(x => x.type === 'yalitim' && x.kind === 'cephe'); if (yc) ext += (+yc.t || 5) / 100; const dk = C.doc.ents.find(x => x.type === 'kaplama' && x.kind === 'duvar' && x.side === 'DIS'); if (dk) ext += 0.03;
    const base = dejog(OF.q, 0.25), q = ext > 0 ? off(base, ext) : base;
    C.remove(C.doc.ents.filter(x => x.type === 'tretuvar'));
    const e = C.add(C.newEnt('tretuvar', { pts: q.map(p => [p[0], p[1]]), w: (+r.w || 100) / 100, egim: +r.egim || 2, zg: +r.zg || 0, h: (+r.h || 15) / 100, kap: r.kap, tk: +r.tk || 0, th: +r.th || 0, tb: +r.tb || 10, ts: +r.ts || 15, bw: +r.bw || 10, bh: +r.bh || 30, bc: +r.bc || 0, by: +r.by || 10, derz: +r.derz || 2, layer: 'INS_TRETUVAR' })); delete e.sp;
    C.changed(); C.log(T.tretuvar.info(e));
  });
  /* ---------- 1/10 KESİT DETAYI ---------- */
  C.addCommand(['TRETUVARDETAY', 'KALDIRIMDETAY'], 'Tretuvar kesit detayı (1/10): bina duvarı, mantolama, kaplama, harç, beton, stabilize, gömülü bordür ve yatak betonu, zemin çizgisi, kotlar, ölçüler, eğim.', async (I) => {
    const e = C.doc.ents.find(x => x.type === 'tretuvar'); if (!e) { C.warn('Önce TRETUVAR ile tretuvar oluşturun.'); return; }
    const p0 = await I.pt('Detayın yeri'); if (!p0 || typeof p0 === 'string') return;
    const G = geo(e), O = [p0[0], p0[1]], gv0 = C._gvCur; C._gvCur = 'TR' + Date.now().toString(36);
    ['DETAY', 'DETAY_INCE', 'DETAY_TARAMA'].forEach((l, i) => C.ensureLayer(l, [7, 8, 8][i], 'CONTINUOUS', [35, 13, 9][i])); C.std('YAZI');
    const add = (t, pr) => { const x = C.add(C.newEnt(t, pr)); delete x.sp; return x; };
    const W = (x, y) => [O[0] + x, O[1] + y, 0], th = 0.02;
    const pl = (pts, cl, lay, o) => add('pline', Object.assign({ pts: pts.map(p => W(...p)), closed: !!cl, layer: lay || 'DETAY' }, o || {}));
    const ln = (a, b, lay, o) => add('line', Object.assign({ a: W(...a), b: W(...b), layer: lay || 'DETAY_INCE' }, o || {}));
    const ht = (q, pat, sc) => add('hatch', { loops: [q.map(p => { const w = W(...p); return [w[0], w[1]]; })], pat, sc: sc || 5, ang: 0, ann: false, orig: [O[0], O[1]], layer: 'DETAY_TARAMA' });
    const tx = (p, s, al, h) => add('text', { p: W(...p), h: h || th, s, rot: 0, al: al || 'L', layer: 'YAZI' });
    const lead = (p, q, s) => { ln(p, q); ln(q, [q[0] + 0.03, q[1]]); tx([q[0] + 0.035, q[1] + 0.004], s); };
    const kot = (x, y, v, s) => { pl([[x, y], [x - 0.02, y + 0.035], [x + 0.02, y + 0.035]], true, 'DETAY_INCE'); ln([x - 0.05, y], [x + 0.25, y]); tx([x + 0.03, y + 0.04], `${v >= 0 ? '+' : ''}${v.toFixed(2)}${s ? ' ' + s : ''}`); };
    // koordinat: x = binadan dışa (0 = bina dış yüzü), y = kot − zemin kotu
    const g = 0, top = G.top - G.zg, wP = G.w - G.bw, zt = x => top - x * G.s;
    // bina duvarı + mantolama (temsili)
    const yc = C.doc.ents.find(x => x.type === 'yalitim' && x.kind === 'cephe'), mt = yc ? (+yc.t || 5) / 100 : 0;
    pl([[-0.25 - mt, -0.6], [-mt, -0.6], [-mt, 0.9], [-0.25 - mt, 0.9]], false); ht([[-0.25 - mt, -0.6], [-mt, -0.6], [-mt, 0.9], [-0.25 - mt, 0.9]], 'ANSI31', 5);
    if (mt > 0) { pl([[-mt, -0.6], [0, -0.6], [0, 0.9], [-mt, 0.9]], true, 'DETAY_INCE'); ht([[-mt, -0.6], [0, -0.6], [0, 0.9], [-mt, 0.9]], 'DOTS', 3); lead([-mt / 2, 0.7], [0.25, 0.8], `ISI YALITIMI (MANTOLAMA ${Math.round(mt * 100)} cm)`); }
    ln([-0.27 - mt, 0.9], [-0.27 - mt, -0.6], 'DETAY_INCE', { lt: 'DASHED' });
    // katmanlar
    const band = (x0, x1, a0, a1, pat, sc, nm, ly) => { const q = [[x0, zt(x0) - a0], [x1, zt(x1) - a0], [x1, zt(x1) - a1], [x0, zt(x0) - a1]]; pl(q, true, 'DETAY'); if (pat) ht(q, pat, sc); if (nm) lead([x0 + (x1 - x0) * (ly || 0.3), zt(x0 + (x1 - x0) * (ly || 0.3)) - (a0 + a1) / 2], [x1 + 0.25, zt(0) + 0.35 - (a0 + a1) * 1.2], nm); };
    let a = 0; if (G.tk > 0) { band(0, wP, a, a + G.tk, 'SQUARE', 2, `${G.kp.ad.toUpperCase()} (${Math.round(G.tk * 100)} cm)`, 0.2); a += G.tk; } if (G.th > 0) { band(0, wP, a, a + G.th, 'AR-SAND', 2, `${(G.kp.yatak || 'YATAK').toUpperCase()} (${Math.round(G.th * 100)} cm)`, 0.35); a += G.th; }
    band(0, wP, a, a + G.tb, 'ANSI31', 3, `BETON C16/20 (${Math.round(G.tb * 100)} cm)`, 0.5); a += G.tb; band(0, G.w, a, a + G.ts, 'GRAVEL', 3, `SIKIŞTIRILMIŞ STABİLİZE (${Math.round(G.ts * 100)} cm)`, 0.65); a += G.ts;
    // bordür + yatak
    const btop = zt(wP) + (+e.bc || 0) / 100, bb = btop - G.bh; const bq = [[wP, bb], [G.w, bb], [G.w, btop], [wP, btop]]; pl(bq, true, 'DETAY'); ht(bq, 'ANSI31', 2);
    const yq = [[wP - 0.05, bb - G.by], [G.w + 0.05, bb - G.by], [G.w + 0.05, bb], [wP - 0.05, bb]]; pl(yq, true, 'DETAY'); ht(yq, 'AR-CONC', 1);
    lead([(wP + G.w) / 2, btop - G.bh * 0.4], [G.w + 0.25, btop + 0.05], `BETON BORDÜR ${Math.round(G.bw * 100)}x${Math.round(G.bh * 100)}`); lead([G.w, bb - G.by / 2], [G.w + 0.25, bb - G.by / 2 - 0.08], `BORDÜR YATAK BETONU (${Math.round(G.by * 100)} cm)`);
    // zemin çizgisi + tabii zemin taraması, elastik derz
    ln([G.w + 0.05, g], [G.w + 0.8, g], 'DETAY', { lw: 35 }); for (let x = G.w + 0.1; x < G.w + 0.8; x += 0.08) ln([x, g], [x - 0.04, g - 0.04]);
    const zb = top - G.tot; ln([-mt, zb], [G.w + 0.8, zb], 'DETAY_INCE', { lt: 'DASHED' });
    pl([[0, zt(0)], [0.01, zt(0)], [0.01, zt(0) - G.tk - G.th - G.tb], [0, zt(0) - G.tk - G.th - G.tb]], true, 'DETAY'); lead([0.005, zt(0) - 0.02], [-0.4, zt(0) + 0.3], 'ELASTİK DERZ (MASTİK)');
    // kotlar, eğim, ölçüler
    kot(-0.6, top, G.top, 'TRETUVAR'); kot(G.w + 0.45, g, G.zg, 'ZEMİN'); kot(G.w + 0.45, zb, G.top - G.tot, 'STABİLİZE ALTI');
    const ax = wP * 0.35; pl([[ax, zt(ax) + 0.06], [ax + 0.25, zt(ax + 0.25) + 0.06]], false, 'DETAY_INCE'); pl([[ax + 0.21, zt(ax + 0.21) + 0.08], [ax + 0.25, zt(ax + 0.25) + 0.06], [ax + 0.21, zt(ax + 0.21) + 0.04]], false, 'DETAY_INCE'); tx([ax, zt(ax) + 0.09], `Eğim %${+e.egim || 2}`);
    const dd = (x0, x1, y, s) => { ln([x0, y], [x1, y]); ln([x0, y - 0.015], [x0, y + 0.015]); ln([x1, y - 0.015], [x1, y + 0.015]); tx([(x0 + x1) / 2, y + 0.01], s, 'C'); };
    dd(0, G.w, top + 0.25, `${Math.round(G.w * 100)}`); dd(0, wP, top + 0.17, `${Math.round(wP * 100)}`); dd(wP, G.w, top + 0.17, `${Math.round(G.bw * 100)}`);
    const dv = (x, y0, y1, s) => { ln([x, y0], [x, y1]); ln([x - 0.015, y0], [x + 0.015, y0]); ln([x - 0.015, y1], [x + 0.015, y1]); tx([x - 0.02, (y0 + y1) / 2], s, 'R'); };
    dv(-0.45, zb, top, `${Math.round(G.tot * 100)}`); dv(-0.45 - 0.12, g, top, `${Math.round(top * 100)}`); dv(G.w + 0.9, zb, g, `${Math.round((g - zb) * 100)} (gömülü)`);
    add('text', { p: W(G.w / 2, zb - 0.25), h: 0.05, s: 'TRETUVAR DETAYI', rot: 0, al: 'C', layer: 'YAZI' }); add('text', { p: W(G.w / 2, zb - 0.32), h: th, s: 'ÖL:1/10', rot: 0, al: 'C', layer: 'YAZI' });
    C._gvCur = gv0; C.changed(); C.log('Tretuvar detayı çizildi (1/10).');
  });
})(window.C);

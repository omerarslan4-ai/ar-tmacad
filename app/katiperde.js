/* ArıtmaCAD — KATIDAN PERDE (KATIPERDE) ve KATIDAN YAPI ELEMANI (KATIELEMAN: perde, sürekli temel, radye, döşeme, kolon, tekil temel, kiriş)
   İt/Çek ile çizilmiş düşey katıyı (duvar biçimli: dikdörtgen, eğrisel bant, L / U) gerçek betonarme perdeye çevirir:
   perde ekseni ve kalınlığı katının taban şeklinden bulunur (iki uç kenar arasındaki iki uzun kenarın ortası), yükseklik ve alt kot katıdan.
   İsteğe bağlı: perdenin altında PVC su tutucu bant (alt ucu temel üst kotunda, perde boyunca — perde değişince bant da güncellenir).
   Kapalı halka katı (ortası delik: yuvarlak / dikdörtgen havuz duvarı) kapalı perde olur. Diğer dosyalara dokunmaz. */
(function (C) {
  'use strict';
  const M = C.M;
  const p2 = p => [p[0], p[1]];
  const per = q => { let s = 0; for (let i = 0; i < q.length; i++) s += Math.hypot(q[(i + 1) % q.length][0] - q[i][0], q[(i + 1) % q.length][1] - q[i][1]); return s; };
  const yolUz = q => { let s = 0; for (let i = 1; i < q.length; i++) s += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); return s; };
  const sadeles = (q, tol, kapali) => { if (q.length < 3) return q; const out = [q[0]]; for (let i = 1; i < q.length - (kapali ? 0 : 1); i++) { const a = out[out.length - 1], b = q[i], c = q[(i + 1) % q.length]; const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]), l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1; if (Math.abs(cr) / l < tol) continue; out.push(b); } if (!kapali) out.push(q[q.length - 1]); return out; };
  const yakin = (p, Q) => { let best = null, bd = Infinity; for (let i = 0; i + 1 < Q.length; i++) { const a = Q[i], b = Q[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); const q = [a[0] + dx * t, a[1] + dy * t], d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = q; } } return { q: best, d: bd }; };
  const ornekle = (Q, n) => { const L = yolUz(Q), out = []; let i = 0, acc = 0; for (let k = 0; k <= n; k++) { const s = L * k / n; while (i < Q.length - 2 && acc + Math.hypot(Q[i + 1][0] - Q[i][0], Q[i + 1][1] - Q[i][1]) < s) { acc += Math.hypot(Q[i + 1][0] - Q[i][0], Q[i + 1][1] - Q[i][1]); i++; } const sl = Math.hypot(Q[i + 1][0] - Q[i][0], Q[i + 1][1] - Q[i][1]) || 1, t = Math.max(0, Math.min(1, (s - acc) / sl)); out.push([Q[i][0] + (Q[i + 1][0] - Q[i][0]) * t, Q[i][1] + (Q[i + 1][1] - Q[i][1]) * t]); } return out; };

  /* açık (uçlu) duvar şekli: eksen + kalınlık */
  const eksenAcik = P => {
    const A = Math.abs(M.polyArea(P)), Pr = per(P), disk = Pr * Pr - 16 * A; if (disk <= 0) return null;
    const t0 = (Pr - Math.sqrt(disk)) / 4; if (!(t0 > 0.02)) return null; // bant şekli için tahmini kalınlık
    const n = P.length, L = i => Math.hypot(P[(i + 1) % n][0] - P[i][0], P[(i + 1) % n][1] - P[i][1]);
    const don = i => { const a = P[(i + n - 1) % n], b = P[i], c = P[(i + 1) % n], u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]], lu = Math.hypot(...u) || 1, lv = Math.hypot(...v) || 1; return Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / lu / lv))) * 180 / Math.PI; }; // köşedeki dönüş açısı
    let aday = []; for (let i = 0; i < n; i++) if (Math.abs(L(i) - t0) <= Math.max(0.35 * t0, 0.03) && don(i) > 45 && don((i + 1) % n) > 45) aday.push(i);
    if (aday.length < 2) { aday = []; for (let i = 0; i < n; i++) if (Math.abs(L(i) - t0) <= Math.max(0.35 * t0, 0.03)) aday.push(i); }
    if (aday.length < 2) return null;
    // en uzak iki uç kenar (çevre boyunca)
    const cum = [0]; for (let i = 0; i < n; i++) cum.push(cum[i] + L(i)); let bi = -1, bj = -1, bs = -1;
    for (const i of aday) for (const j of aday) { if (j <= i) continue; const d1 = cum[j] - cum[i + 1], d2 = Pr - (cum[j + 1] - cum[i]), s = Math.min(d1, d2); if (s > bs) { bs = s; bi = i; bj = j; } }
    if (bi < 0) return null;
    const zincir = (a, b) => { const o = []; for (let k = (a + 1) % n; ; k = (k + 1) % n) { o.push(P[k]); if (k === b) break; } return o; }; // P[a+1] … P[b]
    const c1 = zincir(bi, bj), c2 = zincir(bj, bi).reverse(); if (c1.length < 2 || c2.length < 2) return null;
    const N = Math.max(8, Math.min(400, Math.ceil(Math.max(yolUz(c1), yolUz(c2)) / 0.1))), s1 = ornekle(c1, N);
    const eks = [], ds = []; for (const p of s1) { const r = yakin(p, c2); ds.push(r.d); eks.push([(p[0] + r.q[0]) / 2, (p[1] + r.q[1]) / 2]); }
    ds.sort((a, b) => a - b); const t = ds[ds.length >> 1];
    // uçları uç kenarların ortasına oturt
    eks[0] = [(P[bi][0] + P[(bi + 1) % n][0]) / 2, (P[bi][1] + P[(bi + 1) % n][1]) / 2]; eks[eks.length - 1] = [(P[bj][0] + P[(bj + 1) % n][0]) / 2, (P[bj][1] + P[(bj + 1) % n][1]) / 2];
    let q = sadeles(eks, Math.max(0.004, t / 25), false);
    // köşe pahı: iki uzun kol arasındaki kısa (≤ 1.5 t) ara parça → kolların kesişimi (L / U köşesi keskin olsun)
    for (let i = 1; i + 2 < q.length; i++) { const a = q[i - 1], b = q[i], c = q[i + 1], d = q[i + 2], lb = Math.hypot(c[0] - b[0], c[1] - b[1]); if (lb > 1.5 * t || Math.hypot(b[0] - a[0], b[1] - a[1]) < 2 * t || Math.hypot(d[0] - c[0], d[1] - c[1]) < 2 * t) continue;
      const r = [b[0] - a[0], b[1] - a[1]], s2 = [d[0] - c[0], d[1] - c[1]], den = r[0] * s2[1] - r[1] * s2[0]; if (Math.abs(den) < 1e-9) continue; const w = [c[0] - a[0], c[1] - a[1]], tt = (w[0] * s2[1] - w[1] * s2[0]) / den, x = [a[0] + r[0] * tt, a[1] + r[1] * tt];
      if (Math.hypot(x[0] - b[0], x[1] - b[1]) > 2 * t) continue; q.splice(i, 2, x); }
    return { pts: q, t, closed: false };
  };
  /* kapalı halka (dış + iç sınır) */
  const eksenHalka = (D, I) => {
    const N = Math.max(16, Math.min(600, Math.ceil(per(D) / 0.1))), s = ornekle(D.concat([D[0]]), N), Ic = I.concat([I[0]]), eks = [], ds = [];
    for (const p of s.slice(0, -1)) { const r = yakin(p, Ic); ds.push(r.d); eks.push([(p[0] + r.q[0]) / 2, (p[1] + r.q[1]) / 2]); }
    ds.sort((a, b) => a - b); return { pts: sadeles(eks, 0.004, true), t: ds[ds.length >> 1], closed: true };
  };

  const donustur = (k, o) => {
    if (k.type !== 'kati' || !Array.isArray(k.prof) && !(k.prof && k.prof.r)) throw new Error('İt/Çek katısı değil');
    const uz = k.uz || [0, 0, 1]; if (Math.abs(Math.abs(uz[2]) - 1) > 1e-3) throw new Error('katı düşey değil (yan yüzden çekilmiş)');
    const h = Math.abs(+k.h || 0); if (h < 0.05) throw new Error('katı yüksekliği yok (önce İt/Çek ile yükseltin)');
    const b0 = C.katiLoop(k, 0), b1 = C.katiLoop(k, k.h), z0 = Math.min(...b0.map(p => p[2] || 0), ...b1.map(p => p[2] || 0));
    let P = b0.map(p2); if (M.polyArea(P) < 0) P = P.slice().reverse();
    const delik = (k.holes || []).filter(x => x && x.thru && Array.isArray(x.L));
    let ek;
    if (delik.length === 1) { const F = { o: k.o, ux: k.ux }; const Wl = q => { const u = q[0], v = q[1], ux = k.ux || [1, 0, 0], vy = M.cross(uz, ux); return [k.o[0] + ux[0] * u + vy[0] * v, k.o[1] + ux[1] * u + vy[1] * v]; }; void F; let Iq = delik[0].L.map(Wl); ek = eksenHalka(P, Iq); }
    else if (delik.length) throw new Error('birden çok delikli katı');
    else ek = eksenAcik(P);
    if (!ek || !(ek.t > 0.02) || ek.pts.length < 2) throw new Error('duvar biçimi bulunamadı (ince, uzun bir şekil olmalı)');
    const t = Math.round(ek.t * 1000) / 1000, lay = C.insLayerFor ? C.insLayerFor({ type: 'perde' }) : 'INS_PERDE'; if (C.INS_LAYERS && C.INS_LAYERS[lay]) C.ensureLayer(lay, C.INS_LAYERS[lay][0], 'CONTINUOUS', C.INS_LAYERS[lay][1]); else C.ensureLayer(lay);
    const e = C.add(C.newEnt('perde', { pts: ek.pts.map(p => [+p[0].toFixed(4), +p[1].toFixed(4)]), closed: ek.closed, hiza: 'O', ofs: 0, egim: 'R', tb: t, tt: t, h: +h.toFixed(4), z0: +z0.toFixed(4), malz: 'beton', beton: o.beton || 'C30/37', layer: lay, zoto: 'EL', hoto: 'EL' })); delete e.sp;
    let b = null; if (o.bant && C.addPerdeBant) { const bw = +o.bantw || 20; b = C.addPerdeBant(e, bw / 200, { w: bw, t: 5 }); }
    if (o.sil) C.remove([k]);
    return { e, b, t, h, z0 };
  };
  C.katiPerde = donustur;

  /* ======================= KATIDAN ELEMAN: perde, sürekli temel, radye, döşeme, kolon, tekil temel, kiriş ======================= */
  const TIPLER = [['OTO', 'Otomatik (şekle ve kota göre)'], ['PERDE', 'Betonarme perde'], ['STEMEL', 'Sürekli (şerit) temel'], ['RADYE', 'Radye temel'], ['DOSEME', 'Döşeme'], ['KOLON', 'Kolon'], ['TTEMEL', 'Tekil temel'], ['KIRIS', 'Kiriş']];
  const AD = Object.fromEntries(TIPLER);
  const katmanOf = type => { const lay = C.insLayerFor ? C.insLayerFor(type) : ('INS_' + String(type.type || '').toUpperCase()); if (C.INS_LAYERS && C.INS_LAYERS[lay]) C.ensureLayer(lay, C.INS_LAYERS[lay][0], 'CONTINUOUS', C.INS_LAYERS[lay][1]); else C.ensureLayer(lay); return lay; };
  /* dikdörtgen mi: 4 köşe, dik açılar → merkez, uzun / kısa kenar, uzun kenarın açısı (°) */
  const dikdortgen = P => { if (P.length !== 4) return null; const e = i => [P[(i + 1) % 4][0] - P[i][0], P[(i + 1) % 4][1] - P[i][1]]; for (let i = 0; i < 4; i++) { const a = e(i), b = e((i + 1) % 4); if (Math.abs(a[0] * b[0] + a[1] * b[1]) > 1e-4 * Math.hypot(...a) * Math.hypot(...b)) return null; }
    const l0 = Math.hypot(...e(0)), l1 = Math.hypot(...e(1)), uz = l0 >= l1 ? e(0) : e(1); return { c: [(P[0][0] + P[2][0]) / 2, (P[0][1] + P[2][1]) / 2], b: Math.max(l0, l1), d: Math.min(l0, l1), rot: Math.atan2(uz[1], uz[0]) * 180 / Math.PI }; };
  const analiz = k => {
    const uz = k.uz || [0, 0, 1]; if (Math.abs(Math.abs(uz[2]) - 1) > 1e-3) throw new Error('katı düşey değil (yan yüzden çekilmiş)');
    const h = Math.abs(+k.h || 0); if (h < 0.02) throw new Error('katı yüksekliği yok (önce İt/Çek ile yükseltin)');
    const b0 = C.katiLoop(k, 0), b1 = C.katiLoop(k, k.h), z0 = Math.min(...b0.map(p => p[2] || 0), ...b1.map(p => p[2] || 0));
    let P = b0.map(p2); if (M.polyArea(P) < 0) P = P.slice().reverse();
    const daire = !Array.isArray(k.prof) && k.prof && k.prof.r ? { c: p2(C.katiLoop(k, 0).reduce((s, q) => [s[0] + q[0] / b0.length, s[1] + q[1] / b0.length], [0, 0])), D: 2 * k.prof.r } : null;
    const delik = (k.holes || []).filter(x => x && x.thru && Array.isArray(x.L));
    let bant = null; try { if (delik.length === 1) { const ux = k.ux || [1, 0, 0], vy = M.cross(uz, ux), Wl = q => [k.o[0] + ux[0] * q[0] + vy[0] * q[1], k.o[1] + ux[1] * q[0] + vy[1] * q[1]]; bant = eksenHalka(P, delik[0].L.map(Wl)); } else if (!delik.length && !daire) bant = eksenAcik(P); } catch (er) { bant = null; }
    if (bant && !(bant.t > 0.02 && bant.pts.length >= 2)) bant = null;
    if (bant) { const Lb = yolUz(bant.closed ? bant.pts.concat([bant.pts[0]]) : bant.pts); if (Lb < 2.5 * bant.t) bant = null; }
    return { P, z0, h, daire, rect: dikdortgen(P), bant, delik: delik.length, A: Math.abs(M.polyArea(P)) };
  };
  /* otomatik tür: şekil + kot */
  const enAltKot = haric => { let z = Infinity; for (const e of C.doc.ents) { if (e === haric || e.gv) continue; let zb = null; if (e.type === 'plak') zb = (+e.zt || 0) - (+e.t || 0); else if (e.type === 'perde' || e.type === 'kolon') zb = +e.z0 || 0; else if (e.type === 'temel') zb = (+e.zt || 0) - (+e.t || 0); else if (e.type === 'kati') { try { zb = Math.min(...C.katiLoop(e, 0).map(q => q[2] || 0), ...C.katiLoop(e, e.h).map(q => q[2] || 0)); } catch (er) { } } if (zb != null && zb < z) z = zb; } return z; };
  /* tabanının altında (izinde) başka eleman var mı */
  const altindaVar = (a, k) => { for (const e of C.doc.ents) { if (e === k || e.gv || e.type === 'pline' || e.type === 'line') continue; let top = null, c = null;
      if (e.type === 'plak') { top = +e.zt || 0; c = e.pts && e.pts[0]; } else if (e.type === 'perde' || e.type === 'kolon') { top = (+e.z0 || 0) + (+e.h || 0); c = e.p || (e.pts && e.pts[0]); } else if (e.type === 'temel') { top = +e.zt || 0; c = e.p; } else if (e.type === 'kiris') { top = +e.zt || 0; c = e.a; } else if (e.type === 'kati') { try { const q = C.katiLoop(e, e.h); top = Math.max(...q.map(x => x[2] || 0), ...C.katiLoop(e, 0).map(x => x[2] || 0)); const bb = C.bbox(e); c = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2]; } catch (er) { } }
      if (top == null || !c || top > a.z0 + 0.01) continue; if (C.pointInPoly([c[0], c[1]], a.P)) return true; } return false; };
  const otoTur = (a, k) => {
    const z0 = enAltKot(k), altta = a.z0 <= Math.min(z0, a.z0) + 1.0 && !altindaVar(a, k);
    if (a.daire) return a.h >= 1.5 * a.daire.D ? 'KOLON' : a.daire.D > 3 ? (altta ? 'RADYE' : 'DOSEME') : 'TTEMEL';
    if (a.rect && a.rect.b <= 1.5) return a.h >= 1.5 * a.rect.b ? 'KOLON' : 'TTEMEL';
    if (a.bant && a.bant.t <= 0.8) { if (a.h > 1.2) return 'PERDE'; return altta ? 'STEMEL' : 'KIRIS'; }
    return altta ? 'RADYE' : 'DOSEME';
  };
  const yap = (k, tur, o) => {
    const a = analiz(k), t = tur === 'OTO' ? otoTur(a, k) : tur, f4 = v => +(+v).toFixed(4), beton = o.beton || 'C30/37', zt = f4(a.z0 + a.h), made = [];
    const ekle = (type, props) => { const e = C.add(C.newEnt(type, props)); delete e.sp; made.push(e); return e; };
    if (t === 'PERDE' || t === 'STEMEL') {
      if (!a.bant) throw new Error('duvar / şerit biçimi bulunamadı (ince, uzun bir şekil olmalı)');
      const tt = Math.round(a.bant.t * 1000) / 1000, e = ekle('perde', Object.assign({ pts: a.bant.pts.map(p => [f4(p[0]), f4(p[1])]), closed: a.bant.closed, hiza: 'O', ofs: 0, egim: 'R', tb: tt, tt, h: f4(a.h), z0: f4(a.z0), malz: 'beton', beton, zoto: 'EL', hoto: 'EL' }, t === 'STEMEL' ? { temel: true } : {}));
      e.layer = katmanOf(e); if (t === 'PERDE' && o.bant && C.addPerdeBant) { const bw = +o.bantw || 20; const b = C.addPerdeBant(e, bw / 200, { w: bw, t: 5 }); if (b) made.push(b); }
      return { t, made, bilgi: `${t === 'PERDE' ? 'perde' : 'sürekli temel'} ${Math.round(tt * 100)} cm · h ${M.fmt(a.h, 2)} m${t === 'PERDE' && o.bant ? ' · su tutucu bant ' + (o.bantw || 20) + '/5' : ''}` };
    }
    if (t === 'RADYE' || t === 'DOSEME') {
      const e = ekle('plak', { kind: t === 'RADYE' ? 'radye' : 'doseme', pts: a.P.map(p => [f4(p[0]), f4(p[1])]), t: f4(a.h), zt, beton }); e.layer = katmanOf(e);
      return { t, made, bilgi: `${t === 'RADYE' ? 'radye' : 'döşeme'} ${Math.round(a.h * 100)} cm · üst kot ${M.fmt(zt, 2)} · ${M.fmt(a.A, 2)} m²` };
    }
    if (t === 'KOLON') {
      const props = a.daire ? { sek: 'D', D: f4(a.daire.D), b: f4(a.daire.D), d: f4(a.daire.D), p: [f4(a.daire.c[0]), f4(a.daire.c[1]), 0], rot: 0 } : a.rect ? { sek: 'R', b: f4(a.rect.b), d: f4(a.rect.d), D: 0.5, p: [f4(a.rect.c[0]), f4(a.rect.c[1]), 0], rot: +a.rect.rot.toFixed(3) } : null;
      if (!props) throw new Error('kolon için taban dikdörtgen ya da daire olmalı');
      const e = ekle('kolon', Object.assign(props, { h: f4(a.h), z0: f4(a.z0), beton })); e.layer = katmanOf(e);
      return { t, made, bilgi: `kolon ${a.daire ? 'Ø' + Math.round(a.daire.D * 100) : Math.round(a.rect.b * 100) + '/' + Math.round(a.rect.d * 100)} · h ${M.fmt(a.h, 2)} m` };
    }
    if (t === 'TTEMEL') {
      const r = a.rect || (a.daire ? { c: a.daire.c, b: a.daire.D, d: a.daire.D, rot: 0 } : null); if (!r) throw new Error('tekil temel için taban dikdörtgen olmalı');
      const e = ekle('temel', { bx: f4(r.b), by: f4(r.d), t: f4(a.h), zt, rot: +r.rot.toFixed(3), p: [f4(r.c[0]), f4(r.c[1]), 0], beton }); e.layer = katmanOf(e);
      return { t, made, bilgi: `tekil temel ${Math.round(r.b * 100)}×${Math.round(r.d * 100)} · h ${Math.round(a.h * 100)} cm` };
    }
    if (t === 'KIRIS') {
      let pts, bw;
      if (a.rect) { const r = a.rect, u = [Math.cos(r.rot * Math.PI / 180), Math.sin(r.rot * Math.PI / 180)]; pts = [[r.c[0] - u[0] * r.b / 2, r.c[1] - u[1] * r.b / 2], [r.c[0] + u[0] * r.b / 2, r.c[1] + u[1] * r.b / 2]]; bw = r.d; }
      else if (a.bant) { pts = a.bant.closed ? a.bant.pts.concat([a.bant.pts[0]]) : a.bant.pts; bw = a.bant.t; } else throw new Error('kiriş için ince, uzun bir şekil olmalı');
      bw = Math.round(bw * 1000) / 1000;
      for (let i = 0; i + 1 < pts.length; i++) { const e = ekle('kiris', { a: [f4(pts[i][0]), f4(pts[i][1]), 0], b: [f4(pts[i + 1][0]), f4(pts[i + 1][1]), 0], bw, hb: f4(a.h), zt, hiza: 'O', beton }); e.layer = katmanOf(e); }
      return { t, made, bilgi: `kiriş ${Math.round(bw * 100)}/${Math.round(a.h * 100)} · üst kot ${M.fmt(zt, 2)}${pts.length > 2 ? ' · ' + (pts.length - 1) + ' parça' : ''}` };
    }
    throw new Error('bilinmeyen tür ' + t);
  };
  C.katiEleman = yap;
  C._katiAnaliz = analiz; // statik-oval: katı duvarları perde gibi okur
  const komut = async (I, tip0) => {
    let sel = (C.sel || []).filter(e => e.type === 'kati');
    if (!sel.length) sel = ((await I.sel('Yapı elemanına dönüştürülecek katıları seçin, Enter')) || []).filter(e => e.type === 'kati');
    if (!sel.length) { C.warn('Katı seçilmedi (İt/Çek ile çizilmiş 3B katı seçin).'); return; }
    const G = C._ins && C._ins.getParams; let r = { tip: tip0 || 'OTO', bant: 'E', bantw: '20', sil: 'E', beton: 'C30/37' };
    if (G) { r = await G(tip0 === 'PERDE' ? 'Katıdan perde' : 'Katıdan yapı elemanı', [
      ...(tip0 ? [] : [{ k: 'tip', t: 'Eleman türü', opts: TIPLER, d: 'OTO', al: ['TIP'] }]),
      { k: 'bant', t: 'Perdelerde su tutucu bant (PVC I tipi, perde altında boyunca)', opts: [['E', 'Konsun'], ['H', 'Konmasın']], d: 'E', al: ['BANT'] },
      { k: 'bantw', t: 'Bant ölçüsü (genişlik / kalınlık)', opts: [['15', '15/5'], ['20', '20/5'], ['25', '25/5'], ['32', '32/5']], d: '20', al: ['BANTW'] },
      { k: 'beton', t: 'Beton sınıfı', s: true, d: 'C30/37', al: ['BETON'] },
      { k: 'sil', t: 'Katı', opts: [['E', 'Silinsin (eleman yerine geçer)'], ['H', 'Kalsın']], d: 'E', al: ['SIL'] },
    ], tip0 === 'PERDE' ? 'katiperde' : 'katieleman'); if (!r) return; if (tip0) r.tip = tip0; }
    const made = [], say = {}; let n = 0;
    for (const k of sel) { try { const x = yap(k, r.tip || 'OTO', { bant: r.bant === 'E', bantw: r.bantw, beton: r.beton }); if (r.sil === 'E') C.remove([k]); made.push(...x.made); n++; say[x.t] = (say[x.t] || 0) + 1; C.log(`${AD[x.t]}: ${x.bilgi}`); } catch (er) { C.warn(`Katı ${k.id}: ${er.message}`); } }
    if (!n) return; C.changed(); C.sel = made.filter(e => e.type !== 'yalitim'); C.emit('selection');
    C.log(`${n} katı dönüştürüldü: ${Object.entries(say).map(([t, c]) => c + ' ' + AD[t].toLocaleLowerCase('tr')).join(', ')}. Elemanlar statik, metraj, kesit ve paftalarda gerçek yapı elemanı olarak görünür.`);
  };
  C.addCommand(['KATIELEMAN', 'KATIDANELEMAN', 'SOLIDELEMAN', 'ELEMANADONUSTUR'], 'İt/Çek ile çizilmiş düşey katıları yapı elemanına çevirir: perde (altında su tutucu bant), sürekli temel, radye, döşeme, kolon, tekil temel, kiriş. Otomatik: şekle ve kota göre (ince uzun + yüksek = perde, ince uzun + alçak = en altta sürekli temel / yukarıda kiriş, küçük dikdörtgen / daire = kolon ya da tekil temel, geniş = radye / döşeme). Ölçüler, eksen ve kotlar katıdan.', async I => komut(I, null));


  C.addCommand(['KATIPERDE', 'KATIDANPERDE', 'SOLIDPERDE', 'PERDEYEDONUSTUR'], 'İt/Çek ile çizilmiş düşey katıyı (duvar şekli: düz, eğrisel, L / U, ya da ortası delik halka) betonarme perdeye çevirir: eksen ve kalınlık şekilden, yükseklik ve alt kot katıdan. İsteğe bağlı altında PVC su tutucu bant. Diğer elemanlar: KATIELEMAN.', async I => komut(I, 'PERDE'));

  /* şerit: 3B Modelleme › Modelle ve İnşaat › Taşıyıcı sistem panellerine (şerit yeniden kurulsa da kalır) */
  const serit = () => { try {
    const R = C.ribbon, BT = [{ cmd: 'KATIELEMAN', t: 'Katıdan eleman', i: 'found' }, { cmd: 'KATIPERDE', t: 'Katıdan perde', i: 'wall' }];
    const ekle = () => { let d = false; for (const t of (R && R.tabs) || []) for (const p of t[1]) if ((t[0] === '3B Modelleme' && p[0] === 'Modelle') || (t[0] === 'İnşaat' && p[0] === 'Taşıyıcı sistem')) for (const b of BT) if (!p[1].some(x => x.cmd === b.cmd)) { p[1].push(Object.assign({}, b)); d = true; } return d; };
    if (R && !R._katiPerde) { R._katiPerde = true; const r0 = R.render; R.render = function () { try { ekle(); } catch (er) { } const x = r0.apply(this, arguments); try { if (ekle()) r0.apply(this, arguments); } catch (er) { } return x; }; R.render(); }
  } catch (er) { console.error('KATIELEMAN şerit', er); } };
  if (typeof window !== 'undefined') { if (document.readyState === 'complete') serit(); else window.addEventListener('load', serit); } // şerit (ribbon.js) bu dosyadan sonra yüklenir
})(window.C);

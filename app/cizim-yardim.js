/* ArıtmaCAD — ÇİZİM YARDIMCILARI (ayrı modül)
   YAYELEMAN (YAYPERDE, DAIREPERDE, YAYTEMEL, DAIRERADYE): merkez + yarıçap + açıyla dairesel / yarım daire / yay
     perde, sürekli temel, radye ya da döşeme. Yarıçap eksene, iç yüze ya da dış yüze verilebilir.
   KENARAL (KENARCIKAR): perde / radye / döşeme / katının üst (ya da alt) kenar çizgisini tıklayarak çizgiye çevirir —
     yaylar dahil tüm yüz çizgisi tek çoklu çizgi olur. Sonra OFFSET (Ötele) / COPY (Kopyala) ile çoğaltıp
     ELEMANYAP ile yeniden perdeye / temele çevirebilirsiniz. */
(function (C) {
  'use strict';
  const r4 = v => Math.round(v * 10000) / 10000, RAD = Math.PI / 180;
  const katman = type => { const lay = C.insLayerFor ? C.insLayerFor(type) : 'INS_' + String(type.type || '').toUpperCase(); if (C.INS_LAYERS && C.INS_LAYERS[lay]) C.ensureLayer(lay, C.INS_LAYERS[lay][0], 'CONTINUOUS', C.INS_LAYERS[lay][1]); else C.ensureLayer(lay); return lay; };
  const yayNok = (c, R, a0, sw) => { const n = Math.max(2, Math.ceil(Math.abs(sw) / (7.5 * RAD)), Math.ceil(Math.abs(sw) * R / 0.5)); return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + sw * i / n; return [r4(c[0] + R * Math.cos(a)), r4(c[1] + R * Math.sin(a))]; }); };

  /* ================= YAY / DAİRE ELEMAN ================= */
  const PAR = [
    { k: 'tur', t: 'Eleman', opts: [['PERDE', 'Betonarme perde'], ['STEMEL', 'Sürekli (şerit) temel'], ['RADYE', 'Radye temel (daire / yarım daire / dilim)'], ['DOSEME', 'Döşeme (daire / yarım daire / dilim)']], d: 'PERDE', al: ['TUR'] },
    { k: 'sekil', t: 'Şekil', opts: [['TAM', 'Tam daire (360°)'], ['YARIM', 'Yarım daire (180°)'], ['ACI', 'Açıya göre yay']], d: 'TAM', al: ['SEKIL'] },
    { k: 'R', t: 'Yarıçap R (m)', d: 5, al: ['R'] },
    { k: 'ref', t: 'Yarıçap neye göre (perde / temel)', opts: [['IC', 'İç yüz'], ['EKSEN', 'Eksen'], ['DIS', 'Dış yüz']], d: 'IC', al: ['REF'] },
    { k: 'a0', t: 'Başlangıç açısı (°) — 0: doğu (+X), saat yönünün tersine', d: 0, al: ['A0'] },
    { k: 'sw', t: 'Yay açısı (°) — yalnız "Açıya göre"; eksi: saat yönünde', d: 90, al: ['SW'] },
    { k: 't', t: 'Kalınlık (m) — perde / temel genişliği / plak kalınlığı', d: 0.30, al: ['T'] },
    { k: 'h', t: 'Yükseklik (m) — perde / temel', d: 4.0, al: ['H'] },
    { k: 'z', t: 'Kot (m) — perde / temel: alt kot · radye / döşeme: üst kot', d: 0, al: ['Z'] },
    { k: 'bant', t: 'Perdeye su tutucu bant', opts: [['E', 'Konsun'], ['H', 'Konmasın']], d: 'E', al: ['BANT'] },
    { k: 'beton', t: 'Beton sınıfı', s: true, d: 'C30/37', al: ['BETON'] },
  ];
  C.yayEleman = (o, c) => {
    const sw = o.sekil === 'TAM' ? 2 * Math.PI : o.sekil === 'YARIM' ? Math.PI : (+o.sw || 90) * RAD, a0 = (+o.a0 || 0) * RAD, t = +o.t, made = [];
    if (o.tur === 'PERDE' || o.tur === 'STEMEL') {
      const Re = +o.R + (o.ref === 'IC' ? t / 2 : o.ref === 'DIS' ? -t / 2 : 0); if (!(Re > t / 2)) throw new Error('yarıçap kalınlıktan küçük');
      let pts = yayNok(c, Re, a0, sw); const kap = o.sekil === 'TAM'; if (kap) pts = pts.slice(0, -1);
      const e = C.add(C.newEnt('perde', Object.assign({ pts, closed: kap, hiza: 'O', ofs: 0, egim: 'R', tb: t, tt: t, h: +o.h, z0: +o.z, malz: 'beton', beton: o.beton || 'C30/37', zoto: 'EL', hoto: 'EL' }, o.tur === 'STEMEL' ? { temel: true } : {})));
      delete e.sp; e.layer = katman(e); made.push(e);
      if (o.tur === 'PERDE' && o.bant === 'E' && C.addPerdeBant) { const b = C.addPerdeBant(e, 0.1, { w: 20, t: 5 }); if (b) made.push(b); }
    } else {
      const R = +o.R; if (!(R > 0)) throw new Error('yarıçap sıfır');
      let pts = yayNok(c, R, a0, sw); if (o.sekil === 'TAM') pts = pts.slice(0, -1); else pts.push([r4(c[0]), r4(c[1])]); // yarım / dilim: merkezden kapanır
      const e = C.add(C.newEnt('plak', { kind: o.tur === 'RADYE' ? 'radye' : 'doseme', pts, t, zt: +o.z, beton: o.beton || 'C30/37' })); delete e.sp; e.layer = katman(e); made.push(e);
    }
    return made;
  };
  C.addCommand(['YAYELEMAN', 'YAYPERDE', 'DAIREPERDE', 'YAYTEMEL', 'DAIRERADYE'], 'Merkez + yarıçap + açıyla dairesel / yarım daire / yay perde, sürekli temel, radye ya da döşeme', async (I) => {
    const G = C._ins && C._ins.getParams; let o = {}; PAR.forEach(f => { o[f.k] = f.d; });
    if (G) { const r = await G('Dairesel / yay eleman', PAR, 'yayEleman'); if (!r) return; o = r; }
    const c = await I.pt('Merkez noktası'); if (!c || typeof c === 'string') return;
    try { C.begin && C.begin(); const m = C.yayEleman(o, c); C.changed(); C.sel = m.filter(e => e.type !== 'yalitim'); C.emit('selection');
      C.log(`${{ PERDE: 'Perde', STEMEL: 'Sürekli temel', RADYE: 'Radye', DOSEME: 'Döşeme' }[o.tur]}: ${{ TAM: 'tam daire', YARIM: 'yarım daire', ACI: `${o.sw}° yay` }[o.sekil]}, R = ${o.R} m (${{ IC: 'iç yüz', EKSEN: 'eksen', DIS: 'dış yüz' }[o.ref] || ''}), kalınlık ${Math.round(o.t * 100)} cm.`);
    } catch (er) { C.warn('Yay eleman: ' + er.message); }
  });

  /* ================= KENAR AL ================= */
  // perde yüz çizgileri (sol / sağ), köşelerde kesişim
  const perdeYuzleri = e => {
    const I = C._ins; if (!I || !I.faceOffs || !I.segFrames) return [];
    const F = I.faceOffs(e), sf = I.segFrames(e); if (!sf.length) return []; const kap = !sf[sf.length - 1].openE && sf.length > 2, z0 = +e.z0 || 0, z1 = z0 + (+e.h || 3);
    const cizgi = off => { const S = sf.map(s => [[s.a[0] + s.nn[0] * off, s.a[1] + s.nn[1] * off], [s.b[0] + s.nn[0] * off, s.b[1] + s.nn[1] * off]]), out = [];
      const kes = (A, B) => { const d1 = [A[1][0] - A[0][0], A[1][1] - A[0][1]], d2 = [B[1][0] - B[0][0], B[1][1] - B[0][1]], den = d1[0] * d2[1] - d1[1] * d2[0]; if (Math.abs(den) < 1e-9) return A[1]; const t = ((B[0][0] - A[0][0]) * d2[1] - (B[0][1] - A[0][1]) * d2[0]) / den; return [A[0][0] + d1[0] * t, A[0][1] + d1[1] * t]; };
      for (let i = 0; i < S.length; i++) { if (i === 0) { if (!kap) out.push(S[0][0]); else out.push(kes(S[S.length - 1], S[0])); } if (i < S.length - 1) out.push(kes(S[i], S[i + 1])); else if (!kap) out.push(S[i][1]); }
      return out.map(q => [r4(q[0]), r4(q[1])]); };
    const L = cizgi(F.lB), R = cizgi(F.rB), r = [{ pts: L, kap, z0, z1, ad: 'perde yüzü' }, { pts: R, kap, z0, z1, ad: 'perde yüzü' }];
    if (!kap) { r.push({ pts: [L[0], R[0]], kap: false, z0, z1, ad: 'perde ucu' }); r.push({ pts: [L[L.length - 1], R[R.length - 1]], kap: false, z0, z1, ad: 'perde ucu' }); }
    return r;
  };
  const adaylar = () => {
    const out = [], vis = e => C.layer(e.layer).on && !(typeof e.gv === 'string');
    for (const e of C.doc.ents) { if (!vis(e)) continue;
      if (e.type === 'perde') perdeYuzleri(e).forEach(k => out.push(Object.assign(k, { e })));
      else if ((e.type === 'plak' || e.type === 'dolgu') && Array.isArray(e.pts)) { const zt = +e.zt || 0; out.push({ e, pts: e.pts.map(q => [q[0], q[1]]), kap: true, z1: zt, z0: zt - (+e.t || 0.3), ad: e.kind === 'radye' ? 'radye kenarı' : 'döşeme kenarı' }); }
      else if (e.type === 'kati' && C.katiLoop) { try { const b0 = C.katiLoop(e, 0), b1 = C.katiLoop(e, e.h); out.push({ e, pts: b1.map(q => [q[0], q[1]]), kap: true, z1: Math.max(...b1.map(q => q[2] || 0)), z0: Math.min(...b0.map(q => q[2] || 0)), ad: 'katı kenarı' }); } catch (er) { } } }
    return out;
  };
  const sd = (q, a, b) => { const d = [b[0] - a[0], b[1] - a[1]], L2 = d[0] * d[0] + d[1] * d[1] || 1, u = Math.max(0, Math.min(1, ((q[0] - a[0]) * d[0] + (q[1] - a[1]) * d[1]) / L2)); return { d: Math.hypot(a[0] + d[0] * u - q[0], a[1] + d[1] * u - q[1]), u }; };
  C.kenarBul = (p, mod) => { // mod: { alt, tek }
    let best = null; const z = p[2];
    for (const k of adaylar()) { const n = k.kap ? k.pts.length : k.pts.length - 1, zk = mod.alt ? k.z0 : k.z1;
      for (let i = 0; i < n; i++) { const a = k.pts[i], b = k.pts[(i + 1) % k.pts.length], r = sd(p, a, b); const dz = z != null && Math.abs(z) > 1e-6 ? Math.abs(z - zk) * 0.5 : 0, s = r.d + dz; if (!best || s < best.s) best = { s, k, i, zk }; } }
    if (!best) return null; const k = best.k;
    if (mod.tek) { const a = k.pts[best.i], b = k.pts[(best.i + 1) % k.pts.length]; return { pts: [a, b], kap: false, z: best.zk, ad: k.ad }; }
    return { pts: k.pts, kap: k.kap, z: best.zk, ad: k.ad, d: best.s };
  };
  C.addCommand(['KENARAL', 'KENARCIKAR', 'KENAR'], 'Perde / radye / döşeme / katının üst (ya da alt) kenarını tıklayarak çoklu çizgiye çevirir (yaylar dahil); sonra Ötele / Kopyala / ELEMANYAP', async (I) => {
    const mod = { alt: false, tek: false }, lay = 'KENAR_CIZGI'; C.ensureLayer(lay, 3, 'CONTINUOUS', 35); const made = [];
    for (;;) {
      const p = await I.pt(`Kenarı tıklayın (${mod.alt ? 'ALT' : 'ÜST'} kenar, ${mod.tek ? 'tek parça' : 'tüm yüz çizgisi'}) — Enter: bitir`, { kw: [['A', mod.alt ? 'Üst kenar' : 'Alt kenar'], ['T', mod.tek ? 'Tüm çizgi' : 'Tek parça'], ['U', 'Geri']] });
      if (!p) break; if (typeof p === 'string') { const k = p.toUpperCase(); if (k === 'A') mod.alt = !mod.alt; else if (k === 'T') mod.tek = !mod.tek; else if (k === 'U' && made.length) C.remove([made.pop()]); C.changed(); continue; }
      const r = C.kenarBul(p, mod); if (!r || r.d > 1.5) { C.warn('Yakında kenar bulunamadı.'); continue; }
      const e = C.add(C.newEnt('pline', { pts: r.pts.map(q => [q[0], q[1], r4(r.z)]), closed: r.kap, layer: lay, color: 3 })); delete e.sp; made.push(e); C.changed();
      C.log(`${r.ad} → çoklu çizgi (${r.pts.length} köşe${r.kap ? ', kapalı' : ''}, kot ${r.z.toFixed(2)}).`);
    }
    if (made.length) { C.sel = made; C.emit('selection'); C.log(`${made.length} kenar çizgisi oluşturuldu (KENAR_CIZGI katmanı). Şimdi: OFFSET (Ötele) ile ötele, COPY ile kopyala; ELEMANYAP ile perde / temele çevir (kot seçeneğinde "Çizgi = elemanın ÜST yüzü").`); }
  });

  /* şerit: İnşaat › Taşıyıcı sistem ve 3B Modelleme › Modelle */
  const serit = () => { try {
    const R = C.ribbon, BT = [{ cmd: 'YAYELEMAN', t: 'Dairesel / yay eleman', i: 'found' }, { cmd: 'KENARAL', t: 'Kenar al', i: 'offset' }];
    const ekle = () => { let d = false; for (const t of (R && R.tabs) || []) for (const p of t[1]) if ((t[0] === 'İnşaat' && p[0] === 'Taşıyıcı sistem') || (t[0] === '3B Modelleme' && p[0] === 'Modelle')) for (const b of BT) if (!p[1].some(x => x.cmd === b.cmd)) { p[1].push(b); d = true; } return d; };
    if (R && !R._cizYard) { R._cizYard = true; const r0 = R.render; R.render = function () { try { ekle(); } catch (er) { } const x = r0.apply(this, arguments); try { if (ekle()) r0.apply(this, arguments); } catch (er) { } return x; }; R.render(); }
  } catch (er) { console.error('çizim yardımcıları şerit', er); } };
  if (typeof window !== 'undefined') { if (document.readyState === 'complete') serit(); else window.addEventListener('load', serit); }
})(window.C);

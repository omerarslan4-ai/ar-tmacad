/* ArıtmaCAD — KOLAY SIKIŞTIRILMIŞ DOLGU (SketchUp gibi): alana tıkla → yüksekliği yaz ya da referans noktaya tıkla
   DOLGU: 1) perdelerle çevrili alanın içine tıklayın (3B'de temelin üstüne, planda alanın içine). Kapalı alan yoksa sınırı tıklayarak çizin
             ya da önceden kapalı bir çoklu çizgi / dikdörtgen seçin.
          2) Üst kot: kalınlık yazın (ör. 1.20 = alt kottan 1.20 m yukarı) · K = mutlak kot yazın (ör. K, −0.30) ·
             referans noktaya tıklayın (3B'de dolgu imleçle yükselir; perde üstü, basamak, döşeme altı gibi noktalara yakalanır; planda tıklanan elemanın üstü) ·
             O / Enter = otomatik (döşeme altı ya da perde üstü).
          Alt kot: alanın altındaki radye / temel üstü (yoksa tıklanan yüzeyin kotu). M = malzeme. Eski ayar pencereli komut: DOLGUAYAR. */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, { L, P } = C.prim;
  const p2 = p => [p[0], p[1]];
  const I_ = () => C._ins;
  const in3d = () => C.viewName && C.viewName() === '3d';
  const MALZ = [['stab', 'Sıkıştırılmış dolgu (stabilize)'], ['kum', 'Sıkıştırılmış kum-çakıl'], ['toprak', 'Sıkıştırılmış toprak dolgu']];
  const box = (q, za, zb) => { const A = q.map(p => [p[0], p[1], za]), B = q.map(p => [p[0], p[1], zb]), out = [P(A, true, { lw: 35 }), P(B, true, { lw: 50 })]; const st = Math.max(1, Math.floor(q.length / 12)); for (let i = 0; i < q.length; i += st) out.push(L(A[i], B[i], { lw: 25 })); return out; };
  const segD = (q, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-12; let t = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(q[0] - a[0] - dx * t, q[1] - a[1] - dy * t); };
  /* planda tıklanan noktadaki elemanın üst kotu (referans) */
  const topAt = q => { let best = null; const take = z => { if (best == null || z > best) best = z; };
    for (const x of C.doc.ents) { if (!C.lyLive(x.layer)) continue;
      if (x.type === 'perde' && x.pts) { const tol = Math.max(+x.tb || 0.3, +x.tt || 0.3) * 0.75 + 0.05; for (let i = 1; i < x.pts.length + (x.closed ? 1 : 0); i++) if (segD(q, x.pts[i - 1], x.pts[i % x.pts.length]) < tol) { take((+x.z0 || 0) + (+x.h || 3)); break; } }
      else if (x.type === 'plak' && C.pointInPoly(q, x.pts)) take(+x.zt || 0);
      else if (x.type === 'dolgu' && C.pointInPoly(q, x.pts)) take(+x.zb || 0);
      else if ((x.type === 'temel' || x.type === 'kolon') && x.p) { const b = C.bbox(x); if (q[0] >= b[0] && q[0] <= b[2] && q[1] >= b[1] && q[1] <= b[3]) take(x.type === 'temel' ? +x.zt || 0 : (+x.z0 || 0) + (+x.h || 3)); } }
    return best; };
  /* otomatik üst kot: alanın üstündeki döşeme altı, yoksa çevre perdelerin üstü */
  const autoTop = (f, ip, za) => { let wall = null; const { bodies } = I_().dolguCells(za + 0.05); for (const b of bodies) if (b.e.type === 'perde' && f.some(v => Math.min(...b.q.map(w => Math.hypot(w[0] - v[0], w[1] - v[1]))) < 0.02)) wall = Math.max(wall == null ? -Infinity : wall, b.zb);
    let slab = null; for (const x of C.doc.ents) if (x.type === 'plak' && x.kind !== 'radye' && C.lyLive(x.layer) && C.pointInPoly(ip, x.pts)) { const bz = (+x.zt || 0) - (+x.t || 0.3); if (bz > za + 0.05 && (slab == null || bz < slab)) slab = bz; }
    return slab != null ? slab : wall; };
  const run = async (I) => {
    const st = C.doc.set.insaat || (C.doc.set.insaat = {}), o = st.dolguK || (st.dolguK = { malz: 'stab' });
    C.ensureLayer('INS_DOLGU', 33, 'CONTINUOUS', 18);
    let n = 0;
    for (; ;) {
      /* 1) alan */
      let f = null, ip = null, zClick = null;
      const pre = (C.sel || []).find(x => x.type === 'pline' && x.closed && x.pts.length > 2);
      if (pre && !n) { f = pre.pts.map(p2); ip = f.reduce((s, q) => [s[0] + q[0] / f.length, s[1] + q[1] / f.length], [0, 0]); if (!C.pointInPoly(ip, f)) ip = f[0]; zClick = pre.pts[0][2] != null ? +pre.pts[0][2] : null; C.log('Seçili kapalı çizgi dolgu sınırı olarak kullanıldı.'); }
      else {
        if (in3d()) { E.hover = 'face'; E.noSnap = true; } // alan tıklaması: yakalama yok (yüz merkezine atlamasın)
        const p = await I.pt(n ? 'Başka dolgu alanına tıklayın (Enter bitir)' : 'Dolgu yapılacak alana tıklayın (perdelerle çevrili alanın içi; S = sınırı çiz, M = malzeme)', { kw: [['S', 'Sınır çiz'], ['M', 'Malzeme'], ['T', 'Tüm iç alanlar (otomatik kot)']] });
        E.hover = null; E.noSnap = false; if (!p) break;
        if (typeof p === 'string') {
          const k = C.up(p.trim());
          if (k === 'M') { const m = await I.kw('Malzeme', MALZ.map(([a, b]) => [a.toUpperCase(), b]), o.malz.toUpperCase()); if (m) o.malz = m.toLowerCase(); C.log('Dolgu malzemesi: ' + MALZ.find(x => x[0] === o.malz)[1]); continue; }
          if (k === 'T') { const zs = []; for (const x of C.doc.ents) if (C.lyLive(x.layer) && ((x.type === 'plak' && x.kind === 'radye') || x.type === 'temel')) zs.push(+x.zt || 0); const { cells } = I_().dolguCells((zs.length ? Math.max(...zs) : 0) + 0.05);
            for (const c of cells) { if (C.doc.ents.some(x => x.type === 'dolgu' && C.pointInPoly(c.ip, x.pts))) continue; const za = I_().fndTop(c.ip); if (za == null) continue; const zb = autoTop(c.f, c.ip, za); if (zb == null || !(zb > za + 0.005)) continue; const e = C.add(C.newEnt('dolgu', { pts: c.f.map(p2), za: +za.toFixed(4), zb: +zb.toFixed(4), malz: o.malz, layer: 'INS_DOLGU' })); delete e.sp; n++; }
            C.changed(); C.log(`${n} iç alana dolgu kondu (otomatik kot).`); return; }
          if (k !== 'S') break;
          const pts = []; for (; ;) { E.base = pts.length ? pts[pts.length - 1] : null; E.preview = c => pts.length ? [P(pts.concat([c]).map(q => [q[0], q[1], q[2] || 0]), pts.length > 1)] : []; const q = await I.pt(pts.length < 3 ? 'Sınır noktası' : 'Sınır noktası (Enter = kapat)'); E.preview = null; E.base = null; if (!q || typeof q === 'string') break; pts.push(M.p3(q)); }
          if (pts.length < 3) { C.warn('Sınır için en az 3 nokta gerekir.'); continue; }
          f = pts.map(p2); ip = f.reduce((s, q) => [s[0] + q[0] / f.length, s[1] + q[1] / f.length], [0, 0]); if (!C.pointInPoly(ip, f)) ip = f[0]; zClick = pts[0][2] || null;
        } else {
          zClick = in3d() && p[2] != null ? +p[2] : null;
          const zf = I_().fndTop(p2(p)), z0 = zf != null ? zf : (zClick != null ? zClick : 0);
          const { cells } = I_().dolguCells(z0 + 0.05); let best = null; for (const c of cells) if (C.pointInPoly(p2(p), c.f) && (!best || c.A < best.A)) best = c;
          if (!best) { C.warn('Burası perdelerle kapalı bir alan değil. Sınırı çizmek için S yazın (ya da kapalı bir çoklu çizgi / dikdörtgen seçip DOLGU verin).'); if (E.scriptMode && !E.queue.length) break; continue; }
          f = best.f.map(p2); ip = p2(p);
        }
      }
      if (C.doc.ents.some(x => x.type === 'dolgu' && C.lyLive(x.layer) && C.pointInPoly(ip, x.pts)) && !E.scriptMode) C.log('Not: bu alanda zaten dolgu var; yeni dolgu üstüne eklenir.');
      /* 2) alt kot */
      const zf = I_().fndTop(ip); let za = zf != null ? zf : zClick; if (za == null) { const v = await I.num('Altında temel yok — dolgunun alt kotu (m)', 0); if (v == null) break; za = v; }
      const zAuto = autoTop(f, ip, za);
      /* 3) üst kot: yaz / referans tıkla / otomatik */
      const mid = [ip[0], ip[1], za];
      E.base = in3d() ? mid : null; E.axisLock = in3d() ? { o: mid, d: [0, 0, 1] } : null; E.rubber = in3d();
      const zOfPt = c => in3d() ? (c[2] || 0) : topAt(p2(c));
      E.preview = c => { const zb = c ? zOfPt(c) : null; return box(f, za, zb != null && zb > za + 0.005 ? zb : za + 0.01); };
      E.tagFn = c => { const zb = c ? zOfPt(c) : null; return zb == null ? '' : `üst kot ${M.fmt(zb, 2)} · kalınlık ${M.fmt(zb - za, 2)} m`; };
      const msg = `Dolgu kalınlığı (m) yazın · K = üst kotu yaz · ${in3d() ? 'imleçle yükseltip referans noktaya tıklayın' : 'üst kotu alınacak elemana tıklayın'} · Enter/O = otomatik${zAuto != null ? ` (${M.fmt(zAuto, 2)})` : ''} — alt kot ${M.fmt(za, 2)}`;
      let r = await E.ask('pt', msg, { num: true, kw: [['K', 'Kot (mutlak)'], ['O', 'Otomatik']] });
      E.preview = null; E.tagFn = null; E.base = null; E.axisLock = null; E.rubber = true;
      let zb = null;
      if (r == null || r === '' || (typeof r === 'string' && C.up(r.trim()) === 'O')) { zb = zAuto; if (zb == null) { C.warn('Otomatik üst kot bulunamadı (üstte döşeme, çevrede perde yok): kalınlık ya da kot yazın.'); continue; } }
      else if (typeof r === 'string' && C.up(r.trim()) === 'K') { const v = await I.num('Dolgu üst kotu (m)', zAuto != null ? +zAuto.toFixed(3) : +(za + 1).toFixed(3)); if (v == null) continue; zb = v; }
      else if (typeof r === 'number') zb = za + r;
      else if (Array.isArray(r)) { zb = zOfPt(r); if (zb == null) { C.warn('Tıklanan yerde üst kotu alınacak eleman yok — kalınlık ya da K ile kot yazın.'); continue; } }
      if (zb == null || !(zb > za + 0.005)) { C.warn('Üst kot alt kottan yüksek olmalı.'); if (E.scriptMode && !E.queue.length) break; continue; }
      const e = C.add(C.newEnt('dolgu', { pts: f.map(q => [+q[0].toFixed(5), +q[1].toFixed(5)]), za: +za.toFixed(4), zb: +zb.toFixed(4), malz: o.malz, layer: 'INS_DOLGU' })); delete e.sp; n++;
      C.changed(); C.log(C.T.dolgu.info(e) + ' — kotları Özellikler penceresinden ya da 3B\'de üstteki okla (mesafe yazarak) değiştirebilirsiniz.');
      if (pre || (E.scriptMode && !E.queue.length)) break;
    }
    if (n > 1) C.log(`${n} dolgu alanı oluşturuldu.`);
  };
  /* eski (ayar pencereli) komut DOLGUAYAR olarak kalır; betikte ayar (ZB=…) verilirse o çalışır */
  const old = C.cmds.IDOLGU || C.cmds.DOLGU;
  if (old) C.addCommand(['DOLGUAYAR', 'DOLGUPENCERE'], old.help, old.fn, old.opts);
  C.addCommand(['DOLGU', 'IDOLGU', 'SIKISTIRILMISDOLGU'], 'Sıkıştırılmış dolgu (kolay): alanın içine tıklayın (perdelerle çevrili; S = sınırı çiz, kapalı çizgi seçiliyse o), sonra kalınlığı yazın (1.20), K ile üst kotu yazın, referans noktaya / elemana tıklayın ya da Enter = otomatik (döşeme altı / perde üstü). Alt kot radye / temel üstü. M = malzeme. Ayar pencereli eski sürüm: DOLGUAYAR.', async (I, Cx) => {
    if (old && (E.queue || []).some(t => /^[A-Za-z]+=/.test(t))) return old.fn(I, Cx);
    return run(I);
  });
})(window.C);

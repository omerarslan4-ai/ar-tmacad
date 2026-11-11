/* ArıtmaCAD — KALINLIK DEĞİŞİNCE BİRLEŞİMLER (ayrı modül)
   Statik hesaptan gelen perde kalınlığı değişiminde (STATIKKALINLIK / otomatik yansıtma):
   • bir perdenin yüzüne / içine dayanan başka perde uçları (ara perdeye bağlanan askı perde, T birleşimler)
   • perde yüzüne oturan döşeme (plak) kenarları
   aynı göreli konumu korur: yüze dayanan uç yeni yüze uzar / kısalır, döşeme kenarı yeni yüze kayar.
   C._kalBaglanti(haric) → değişiklikten ÖNCE çağrılır, sonra uygulanacak fonksiyonu döndürür (statik-kalinlik.js).
   Komut PERDEBIRLESIM: önceden bozulmuş modellerde açıkta kalan perde uçlarını / döşeme kenarlarını en yakın perde yüzüne (≤ 30 cm) bağlar. */
(function (C) {
  'use strict';
  if (!C) return;
  const r4 = v => Math.round(v * 10000) / 10000, I = () => C._ins;
  const canli = e => !C.lyLive || C.lyLive(e.layer);
  const zAr = e => { const z0 = +e.z0 || 0; return [z0, z0 + (+e.h || 3)]; };
  const zPl = e => { const zt = +e.zt || 0; return [zt - (+e.t || 0.2), zt]; };
  const ortus = (a, b, tol) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]) > -(tol || 0);
  const duvarlar = () => C.doc.ents.filter(e => e.type === 'perde' && !e.kicker && e.pts && e.pts.length >= 2 && canli(e));
  // perde parçaları: referans çizgi (a, u, nn, L) ve yüz ofsetleri
  const parcalar = e => { const F = I().faceOffs(e); return I().segFrames(e).map((sf, k) => ({ e, k, a: sf.a, u: sf.u, nn: sf.nn, L: Math.hypot(sf.b[0] - sf.a[0], sf.b[1] - sf.a[1]), lB: F.lB, rB: F.rB, z: zAr(e) })); };
  const yerel = (s, p) => { const dx = p[0] - s.a[0], dy = p[1] - s.a[1]; return { t: dx * s.u[0] + dy * s.u[1], d: dx * s.nn[0] + dy * s.nn[1] }; };
  const uclar = e => { if (e.closed) return []; const S = I().segFrames(e); if (!S.length) return []; const a = S[0], b = S[S.length - 1]; return [{ i: 0, u: [-a.u[0], -a.u[1]] }, { i: e.pts.length - 1, u: b.u }]; };

  /* ---------- değişiklik öncesi kayıt → sonrası uygulama ---------- */
  C._kalBaglanti = (haric) => {
    if (!I() || !I().segFrames || !I().faceOffs) return null;
    const hr = new Set((haric || []).filter(x => x != null));
    const D = duvarlar(), P = D.map(parcalar), rel = [], prel = [];
    D.forEach((e, ie) => { for (const uc of uclar(e)) { const p = e.pts[uc.i]; let en = null;
      D.forEach((x, ix) => { if (x === e) return; for (const s of P[ix]) {
        if (Math.abs(uc.u[0] * s.u[0] + uc.u[1] * s.u[1]) > 0.3 || !ortus(zAr(e), s.z, -0.01)) continue;
        const q = yerel(s, p), T = Math.max(Math.abs(s.lB), Math.abs(s.rB)) + 0.05, w = s.lB - s.rB; if (q.t < -T || q.t > s.L + T || Math.abs(w) < 1e-6) continue;
        const f = (q.d - s.rB) / w; if (f < -0.02 / Math.abs(w) || f > 1 + 0.02 / Math.abs(w)) continue;
        const sc = Math.abs(f - 0.5); if (!en || sc < en.sc) en = { x, k: s.k, f, sc }; } });
      if (en) rel.push({ e, i: uc.i, u: uc.u, ...en }); } });
    for (const pl of C.doc.ents) { if (pl.type !== 'plak' || pl.kind === 'radye' || hr.has(pl.id) || !pl.pts || !canli(pl)) continue;
      pl.pts.forEach((p, iv) => D.forEach((x, ix) => { for (const s of P[ix]) {
        if (!ortus(zPl(pl), s.z, 0.05)) continue; const q = yerel(s, p), T = Math.max(Math.abs(s.lB), Math.abs(s.rB)) + 0.05, w = s.lB - s.rB; if (q.t < -T || q.t > s.L + T || Math.abs(w) < 1e-6) continue;
        const f = (q.d - s.rB) / w; if (f < -0.02 / Math.abs(w) || f > 1 + 0.02 / Math.abs(w)) continue; prel.push({ pl, iv, x, k: s.k, f }); } })); }
    return (log, uyar) => {
      let n = 0, nd = 0; const dok = new Set();
      for (const r of rel) { const s = parcalar(r.x)[r.k]; if (!s) continue; const p = r.e.pts[r.i], q = yerel(s, p), dHedef = s.rB + r.f * (s.lB - s.rB), dn = r.u[0] * s.nn[0] + r.u[1] * s.nn[1];
        if (Math.abs(dHedef - q.d) < 1e-4 || Math.abs(dn) < 0.2) continue; const m = (dHedef - q.d) / dn; const pt = p.slice(); pt[0] = r4(p[0] + r.u[0] * m); pt[1] = r4(p[1] + r.u[1] * m); r.e.pts[r.i] = pt; dok.add(r.e); n++; }
      for (const r of prel) { const s = parcalar(r.x)[r.k]; if (!s) continue; const p = r.pl.pts[r.iv], q = yerel(s, p), dd = s.rB + r.f * (s.lB - s.rB) - q.d; if (Math.abs(dd) < 1e-4) continue;
        const pt = p.slice(); pt[0] = r4(p[0] + s.nn[0] * dd); pt[1] = r4(p[1] + s.nn[1] * dd); r.pl.pts[r.iv] = pt; dok.add(r.pl); nd++; }
      dok.forEach(e => { delete e._c; if (C.touch) C.touch(e); });
      if (n && log) log.push(`${n} perde ucu yeni perde yüzüne bağlandı`);
      if (nd && log) log.push(`${nd} döşeme köşesi yeni perde yüzüne kaydırıldı`);
      return n + nd;
    };
  };

  /* ---------- onarım: açıkta kalan uç / kenar en yakın yüze ---------- */
  const onar = (MAX) => {
    const D = duvarlar(), P = D.map(parcalar), log = []; let n = 0, nd = 0; const dok = new Set();
    const icinde = (p, z, haric) => D.some((x, ix) => x !== haric && P[ix].some(s => { if (!ortus(z, s.z, -0.01)) return false; const q = yerel(s, p), lo = Math.min(s.lB, s.rB), hi = Math.max(s.lB, s.rB); return q.t > -0.01 && q.t < s.L + 0.01 && q.d > lo - 0.005 && q.d < hi + 0.005; }));
    D.forEach(e => { for (const uc of uclar(e)) { const p = e.pts[uc.i]; if (icinde(p, zAr(e), e)) continue; let en = null;
      D.forEach((x, ix) => { if (x === e) return; for (const s of P[ix]) { const dn = uc.u[0] * s.nn[0] + uc.u[1] * s.nn[1]; if (Math.abs(dn) < 0.95 || !ortus(zAr(e), s.z, -0.01)) continue;
        const q = yerel(s, p); for (const fd of [s.lB, s.rB]) { const m = (fd - q.d) / dn; if (m < 0.02 || m > MAX) continue; /* ≤ 2 cm: derz olabilir */ const tt = q.t + (uc.u[0] * s.u[0] + uc.u[1] * s.u[1]) * m; if (tt < -0.01 || tt > s.L + 0.01) continue; if (!en || m < en.m) en = { m }; } } });
      if (en) { const pt = p.slice(); pt[0] = r4(p[0] + uc.u[0] * en.m); pt[1] = r4(p[1] + uc.u[1] * en.m); e.pts[uc.i] = pt; dok.add(e); n++; log.push(`${e.no || 'Perde #' + e.id} ucu ${Math.round(en.m * 100)} cm uzatıldı`); } } });
    for (const pl of C.doc.ents) { if (pl.type !== 'plak' || pl.kind === 'radye' || !pl.pts || pl.pts.length < 3 || !canli(pl)) continue; const N = pl.pts.length;
      // kenar bazında: perdeye paralel ve ≤ MAX uzakta, perdenin içine girmeyen kenar → yakın yüze
      let alan = 0; for (let i = 0; i < N; i++) { const a = pl.pts[i], b = pl.pts[(i + 1) % N]; alan += a[0] * b[1] - b[0] * a[1]; }
      for (let i = 0; i < N; i++) { const j = (i + 1) % N, a = pl.pts[i], b = pl.pts[j], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue; const ue = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], dis = alan > 0 ? [ue[1], -ue[0]] : [-ue[1], ue[0]];
        if (icinde(a, zPl(pl)) && icinde(b, zPl(pl))) continue; let en = null;
        D.forEach((x, ix) => { for (const s of P[ix]) { const cr = ue[0] * s.u[1] - ue[1] * s.u[0]; if (Math.abs(cr) > 0.02 || !ortus(zPl(pl), s.z, 0.05)) continue; const qa = yerel(s, a), qb = yerel(s, b), dn = dis[0] * s.nn[0] + dis[1] * s.nn[1];
          if (Math.min(qa.t, qb.t) > s.L - 0.05 || Math.max(qa.t, qb.t) < 0.05) continue; const lo = Math.min(s.lB, s.rB), hi = Math.max(s.lB, s.rB); if (qa.d > lo - 0.005 && qa.d < hi + 0.005) continue;
          const fd = Math.abs(qa.d - lo) < Math.abs(qa.d - hi) ? lo : hi, m = (fd - qa.d) / dn; if (m < 0.02 || m > MAX) continue; /* ≤ 2 cm: derz olabilir */ if (!en || m < en.m) en = { m }; } });
        if (en) { for (const k of [i, j]) { const p = pl.pts[k]; pl.pts[k] = [r4(p[0] + dis[0] * en.m), r4(p[1] + dis[1] * en.m), ...p.slice(2)]; } dok.add(pl); nd++; log.push(`Döşeme #${pl.id} kenarı ${Math.round(en.m * 100)} cm perde yüzüne kaydırıldı`); } } }
    // döşeme ÜSTÜNDE duran (askı) perde kenara paralelse döşeme kenarı perdenin dış yüzüyle aynı hizada olsun (diş kalmasın)
    const kolonKose = k => { const c = k.p; if (k.sek === 'D') { const r = (+k.D || 0.5) / 2; return Array.from({ length: 16 }, (_, i) => [c[0] + r * Math.cos(i * Math.PI / 8), c[1] + r * Math.sin(i * Math.PI / 8)]); }
      const b = +k.b || 0.4, d = +k.d || 0.4, R = (k.rot || 0) * Math.PI / 180, cs = Math.cos(R), sn = Math.sin(R); return [[-b / 2, -d / 2], [b / 2, -d / 2], [b / 2, d / 2], [-b / 2, d / 2]].map(([x, y]) => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs]); };
    const taban = x => Math.min(+x.z0 || 0, ...C.doc.ents.filter(k => k.type === 'perde' && k.kicker && k.kOf === x.id).map(k => +k.z0 || 0));
    for (const pl of C.doc.ents) { if (pl.type !== 'plak' || pl.kind === 'radye' || !pl.pts || pl.pts.length < 3 || !canli(pl)) continue; const N = pl.pts.length, zt = +pl.zt || 0;
      const ust = D.map((x, ix) => Math.abs(taban(x) - zt) < 0.03 ? ix : -1).filter(ix => ix >= 0);
      const kol = C.doc.ents.filter(k => k.type === 'kolon' && k.p && canli(k) && (() => { const kt = (+k.z0 || 0) + (+k.h || 0); return kt > zt - (+pl.t || 0.2) - 0.05 && kt < zt + 0.01; })()).map(kolonKose);
      if (!ust.length && !kol.length) continue;
      let alan = 0; for (let i = 0; i < N; i++) { const a = pl.pts[i], b = pl.pts[(i + 1) % N]; alan += a[0] * b[1] - b[0] * a[1]; }
      for (let i = 0; i < N; i++) { const j = (i + 1) % N, a = pl.pts[i], b = pl.pts[j], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue; const ue = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], dis = alan > 0 ? [ue[1], -ue[0]] : [-ue[1], ue[0]];
        let en = null;
        for (const ix of ust) for (const s of P[ix]) { const cr = ue[0] * s.u[1] - ue[1] * s.u[0]; if (Math.abs(cr) > 0.02) continue; const qa = yerel(s, a), qb = yerel(s, b);
          if (Math.min(qa.t, qb.t) > s.L - 0.05 || Math.max(qa.t, qb.t) < 0.05) continue; const dn = dis[0] * s.nn[0] + dis[1] * s.nn[1];
          const fo = dn > 0 ? Math.max(s.lB, s.rB) : Math.min(s.lB, s.rB), fi = dn > 0 ? Math.min(s.lB, s.rB) : Math.max(s.lB, s.rB);
          if (qa.d * dn <= fi * dn + 0.01) continue; // perde kenardan içeride: dokunma
          const m = (fo - qa.d) * dn; if (Math.abs(m) < 0.02 || Math.abs(m) > MAX) continue; if (!en || Math.abs(m) < Math.abs(en.m)) en = { m }; }
        // döşemeyi taşıyan kolon kenardan taşıyorsa kenar kolonun dış yüzüne kadar (perde hizasından daha dışarıdaysa)
        let mk = null;
        for (const q of kol) { const ts = q.map(c => (c[0] - a[0]) * ue[0] + (c[1] - a[1]) * ue[1]), ds = q.map(c => (c[0] - a[0]) * dis[0] + (c[1] - a[1]) * dis[1]);
          if (Math.max(...ts) < 0.02 || Math.min(...ts) > L - 0.02) continue; const dMin = Math.min(...ds), dMax = Math.max(...ds); if (dMin >= -0.01 || dMax > MAX) continue; if (mk == null || dMax > mk) mk = dMax; }
        if (mk != null) { const hedef = en ? Math.max(en.m, mk) : (mk >= 0.02 ? mk : null); en = hedef != null && Math.abs(hedef) >= 0.02 ? { m: hedef } : null; }
        if (en) { for (const k of [i, j]) { const p = pl.pts[k]; pl.pts[k] = [r4(p[0] + dis[0] * en.m), r4(p[1] + dis[1] * en.m), ...p.slice(2)]; } dok.add(pl); nd++; log.push(`Döşeme #${pl.id} kenarı perde / kolon dış yüzüne hizalandı (${en.m > 0 ? '+' : ''}${Math.round(en.m * 100)} cm)`); } } }
    dok.forEach(e => { delete e._c; if (C.touch) C.touch(e); });
    return { n, nd, log };
  };
  C._perdeBirlesimOnar = onar;

  /* ---------- ara döşemeler tek kalınlık: en kalın olana göre (üst kot sabit, alt yüz iner; altında biten kolonlar kısalır) ---------- */
  const araDosemeEsitle = () => {
    const D = duvarlar(), log = []; if (!D.length) return { n: 0, log };
    const rad = C.doc.ents.filter(e => e.type === 'plak' && e.kind === 'radye' && canli(e)), zRad = rad.length ? Math.max(...rad.map(e => +e.zt || 0)) : -1e9;
    const kapali = D.filter(e => e.closed), zUst = (kapali.length ? kapali : D).reduce((m, e) => Math.max(m, zAr(e)[1]), -1e9);
    const xs = [], ys = []; (kapali.length ? kapali : D).forEach(e => e.pts.forEach(p => { xs.push(p[0]); ys.push(p[1]); }));
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const ust = e => e.type === 'slab' ? (+e.z || 0) + (+e.t || 0.15) : (+e.zt || 0);
    const ara = C.doc.ents.filter(e => ((e.type === 'plak' && e.kind !== 'radye' && !e.cati && e.kind !== 'cati') || e.type === 'slab') && e.pts && e.pts.length >= 3 && canli(e)).filter(e => {
      const z = ust(e); if (!(z < zUst - 0.3 && z > zRad + 0.3)) return false;
      const c = e.pts.reduce((a, p) => [a[0] + p[0] / e.pts.length, a[1] + p[1] / e.pts.length], [0, 0]); return c[0] > x0 && c[0] < x1 && c[1] > y0 && c[1] < y1; });
    if (ara.length < 2) return { n: 0, log };
    const tMax = Math.max(...ara.map(e => +e.t || 0.15)); let n = 0;
    for (const e of ara) { const t0 = +e.t || 0.15; if (tMax - t0 < 0.004) continue; const alt0 = ust(e) - t0;
      if (e.type === 'slab') e.z = r4((+e.z || 0) - (tMax - t0)); e.t = r4(tMax); delete e._c; if (C.touch) C.touch(e); n++;
      log.push(`Ara döşeme #${e.id} ${Math.round(t0 * 100)} → ${Math.round(tMax * 100)} cm`);
      for (const k of C.doc.ents) { if (k.type !== 'kolon' || !k.p || !canli(k)) continue; const kt = (+k.z0 || 0) + (+k.h || 0);
        if (Math.abs(kt - alt0) > 0.02 || !(C.pointInPoly ? C.pointInPoly([k.p[0], k.p[1]], e.pts) : true)) continue;
        k.h = r4((+k.h || 0) - (tMax - t0)); delete k._c; if (C.touch) C.touch(k); log.push(`Kolon #${k.id} üstü döşeme altına (${Math.round((tMax - t0) * 100)} cm kısaldı)`); } }
    return { n, log };
  };
  C._araDosemeEsitle = araDosemeEsitle;
  /* otomatik: proje açılınca açık kalan birleşimler kapatılır (statik yansıtmada da statik-kalinlik.js çağırır) */
  const oto = (bas) => { try { if (!C.doc || !I() || !I().segFrames) return null;
      const snap = C.snapshot ? C.snapshot() : null, ad = araDosemeEsitle(), r = onar(0.30); r.n += ad.n; r.log = ad.log.concat(r.log); if (!r.n && !r.nd) return r;
      if (snap) { C.undoStack.push(snap); if (C.undoStack.length > 60) C.undoStack.shift(); C.redoStack = []; } // yalnız değişiklik olursa geri alma adımı
      C.changed(); C.log((bas || 'Model düzeltildi') + ' (geri almak için U): ' + r.log.join(' · ')); return r; } catch (er) { console.error(er); return null; } };
  C._perdeBirlesimOto = oto;
  if (C.on) C.on('doc', () => setTimeout(oto, 50));

  C.addCommand(['PERDEBIRLESIM', 'BIRLESIMONAR'], 'Kalınlık değişikliğinden sonra açıkta kalan perde uçlarını ve döşeme kenarlarını en yakın perde yüzüne (≤ 30 cm) bağlar', async () => {
    C.begin(); const r = onar(0.30);
    if (!r.n && !r.nd) { C.log('Açıkta kalan perde ucu / döşeme kenarı bulunamadı.'); return; }
    C.changed(); C.log(`Birleşimler onarıldı (geri almak için U): ` + r.log.join(' · '));
  }, { noUndo: true });
})(window.C);

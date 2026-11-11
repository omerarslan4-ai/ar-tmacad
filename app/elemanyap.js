/* ArıtmaCAD — ÇİZGİDEN YAPI ELEMANI (ELEMANYAP)
   Planda ya da 3B'de çizgi / çoklu çizgi / dikdörtgen / daire ile çizilmiş bir şekli seçip
   perde, duvar, kiriş, sürekli temel, radye, döşeme, çatı döşemesi, kolon ya da tekil temele dönüştürür.
   Uç uca değen ayrı çizgiler otomatik zincirlenir (kapalı şekil → kapalı eleman).
   Eleman komutlarının kendi ayar pencereleri kullanılır (ilk şekil için bir kez sorulur, sonrakiler aynı ayarla). */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, RAD = Math.PI / 180, TAU = Math.PI * 2;
  const I_ = () => C._ins;
  const p3 = p => [p[0], p[1], p[2] || 0];
  const TIP = [
    ['PERDE', 'Betonarme perde (istinat / havuz duvarı)'], ['DUVAR', 'Duvar (tuğla / gazbeton / briket)'], ['KIRIS', 'Kiriş'],
    ['STEMEL', 'Sürekli (şerit) temel'], ['RADYE', 'Radye temel'], ['DOSEME', 'Döşeme'], ['CATI', 'Çatı döşemesi (parapetli)'],
    ['KOLON', 'Kolon (dikdörtgen ya da daire)'], ['TTEMEL', 'Tekil temel (dikdörtgen)'],
  ];
  const KOT = [['OTO', 'Otomatik (çizgi Z ≠ 0 ise çizgi = elemanın altı)'], ['AYAR', 'Eleman ayar penceresindeki kot'], ['ALT', 'Çizgi = elemanın ALT yüzü'], ['UST', 'Çizgi = elemanın ÜST yüzü']];
  /* seçimden kenar parçaları */
  const segsOf = ents => {
    const S = [], circles = [];
    for (const e of ents) {
      if (e.type === 'line') S.push([p3(e.a), p3(e.b)]);
      else if (e.type === 'pline') {
        let q = e.pts.map(p3);
        if (e.bul && e.bul.some(b => b) && C.bulgePts) { const n = q.length, o = []; for (let i = 0; i < n; i++) { if (i === n - 1 && !e.closed) { o.push(q[i]); break; } o.push(q[i]); const b = e.bul[i] || 0; if (b) o.push(...C.bulgePts(q[i], q[(i + 1) % n], b).map(p3)); } q = o; }
        for (let i = 0; i + 1 < q.length; i++) S.push([q[i], q[i + 1]]); if (e.closed && q.length > 2) S.push([q[q.length - 1], q[0]]);
      }
      else if (e.type === 'arc') { const n = Math.max(8, Math.ceil(((((e.a1 - e.a0) % 360 + 360) % 360 || 360) * RAD) / (M.arcStep ? M.arcStep(e.r) : 0.05))); let sw = ((e.a1 - e.a0) % 360 + 360) % 360 || 360; let prev = null; for (let i = 0; i <= n; i++) { const t = (e.a0 + sw * i / n) * RAD, p = [e.c[0] + e.r * Math.cos(t), e.c[1] + e.r * Math.sin(t), e.c[2] || 0]; if (prev) S.push([prev, p]); prev = p; } }
      else if (e.type === 'circle') circles.push(e);
      else if (e.type === 'kati' && C.katiLoop) { const flat = Math.abs(e.h || 0) < 1e-7, top = !flat && (e.uz[2] || 0) < 0 ? 0 : (e.h || 0), q = C.katiLoop(e, flat ? 0 : top).map(p3); for (let i = 0; i < q.length; i++) S.push([q[i], q[(i + 1) % q.length]]); }
      else if (e.type === 'face' && e.pts) { const q = e.pts.map(p3); for (let i = 0; i < q.length; i++) S.push([q[i], q[(i + 1) % q.length]]); }
      else if (e.type === 'ellipse' && C.ellPts) { const q = C.ellPts(e, M.circN ? M.circN(Math.hypot(...e.mj), 96, 512) : 160).map(p3), full = q.length && (e.t1 == null || Math.abs((e.t1 - (e.t0 || 0)) - TAU) < 1e-9); for (let i = 0; i + 1 < q.length; i++) S.push([q[i], q[i + 1]]); if (full) S.push([q[q.length - 1], q[0]]); }
      else if (e._face) { const q = e.pts.map(p3); for (let i = 0; i < q.length; i++) S.push([q[i], q[(i + 1) % q.length]]); }
    }
    return { S, circles };
  };
  /* parçaları uç uca zincirle → yollar */
  const chain = (S, tol = 1e-3) => {
    const key = p => `${Math.round(p[0] / tol)}|${Math.round(p[1] / tol)}|${Math.round(p[2] / tol)}`;
    const used = new Array(S.length).fill(false), adj = new Map();
    const add = (k, i) => { if (!adj.has(k)) adj.set(k, []); adj.get(k).push(i); };
    S.forEach((s, i) => { if (M.dist(s[0], s[1]) < tol) { used[i] = true; return; } add(key(s[0]), i); add(key(s[1]), i); });
    const walk = (start, i0) => {
      const pts = [start]; let cur = start, i = i0;
      while (i != null) { used[i] = true; const s = S[i], nx = key(s[0]) === key(cur) ? s[1] : s[0]; pts.push(nx); cur = nx; i = (adj.get(key(cur)) || []).find(j => !used[j]); }
      return pts;
    };
    const out = [];
    // önce açık uçlardan (derece 1) başla, sonra kalan kapalı halkalar
    for (const [k, list] of adj) { if (list.length !== 1) continue; const i = list[0]; if (used[i]) continue; const s = S[i], st = key(s[0]) === k ? s[0] : s[1]; out.push(walk(st, i)); }
    for (let i = 0; i < S.length; i++) if (!used[i]) out.push(walk(S[i][0], i));
    return out.map(pts => {
      let closed = pts.length > 3 && M.dist(pts[0], pts[pts.length - 1]) < tol * 2; if (closed) pts = pts.slice(0, -1);
      // doğrusal ara noktaları ayıkla
      const q = []; const n = pts.length;
      for (let i = 0; i < n; i++) { const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n]; if ((closed || (i > 0 && i < n - 1)) && n > 2) { const u = M.sub(b, a), v = M.sub(c, b); if (M.len(M.cross(u, v)) < 1e-9 * Math.max(1, M.len(u) * M.len(v)) && M.dot(u, v) > 0) continue; } q.push(b); }
      // uçları çok yakın (küçük boşluk / taşma ≤ 5 cm) açık yol: kapalı say, son noktayı ilk noktaya birleştir — köşe tam birleşsin
      if (!closed && q.length > 3) { let L = 0; for (let i = 1; i < q.length; i++) L += M.dist(q[i - 1], q[i]); if (M.dist(q[0], q[q.length - 1]) < Math.min(0.05, L * 0.02)) { q.pop(); closed = true; } }
      return { pts: q, closed: closed && q.length > 2 };
    }).filter(p => p.pts.length >= 2);
  };
  /* yay gibi dizilmiş kısa kenarları (dönüş açısı küçük, ardışık) çember üzerinde ara noktalarla ince böl */
  const circ3 = (a, b, c) => { const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])); if (Math.abs(d) < 1e-12) return null; const A = a[0] ** 2 + a[1] ** 2, B = b[0] ** 2 + b[1] ** 2, Cc = c[0] ** 2 + c[1] ** 2; const x = (A * (b[1] - c[1]) + B * (c[1] - a[1]) + Cc * (a[1] - b[1])) / d, y = (A * (c[0] - b[0]) + B * (a[0] - c[0]) + Cc * (b[0] - a[0])) / d; return { c: [x, y], r: Math.hypot(a[0] - x, a[1] - y) }; };
  const turn = (a, b, c) => { const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]], lu = Math.hypot(...u), lv = Math.hypot(...v); if (lu < 1e-9 || lv < 1e-9) return 0; return Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]); };
  const smoothArcs = (pts, closed) => {
    const n = pts.length; if (n < 4) return pts; const z = pts[0][2] || 0; if (!pts.every(q => Math.abs((q[2] || 0) - z) < 1e-6)) return pts;
    const at = i => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))], curvy = i => { if (!closed && (i <= 0 || i >= n - 1)) return 0; const t = turn(at(i - 1), at(i), at(i + 1)); return Math.abs(t) > 1e-4 && Math.abs(t) < 25 * RAD ? Math.sign(t) : 0; };
    const out = [], segN = closed ? n : n - 1;
    for (let i = 0; i < segN; i++) {
      const a = at(i), b = at(i + 1); out.push(a);
      const sa = curvy(i), sb = curvy(i + 1); if (!sa || !sb || sa !== sb) continue; // iki ucu da aynı yönde kıvrılan kenar = yay parçası
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), c1 = circ3(at(i - 1), a, b), c2 = circ3(a, b, at(i + 2)); if (!c1 || !c2) continue;
      const cc = [(c1.c[0] + c2.c[0]) / 2, (c1.c[1] + c2.c[1]) / 2], r = (Math.hypot(a[0] - cc[0], a[1] - cc[1]) + Math.hypot(b[0] - cc[0], b[1] - cc[1])) / 2; if (!(r > L / 2) || r > L * 200) continue;
      const a0 = Math.atan2(a[1] - cc[1], a[0] - cc[0]); let da = Math.atan2(b[1] - cc[1], b[0] - cc[0]) - a0; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      const k = Math.min(16, Math.ceil(Math.abs(da) / (M.arcStep ? M.arcStep(r) : 0.05))); if (k < 2) continue;
      for (let j = 1; j < k; j++) { const t = j / k, an = a0 + da * t, ra = Math.hypot(a[0] - cc[0], a[1] - cc[1]) * (1 - t) + Math.hypot(b[0] - cc[0], b[1] - cc[1]) * t; out.push([cc[0] + ra * Math.cos(an), cc[1] + ra * Math.sin(an), z]); }
    }
    if (!closed) out.push(at(n - 1));
    return out;
  };
  /* küçük boşluklu (≤ gap) açık yolları uç uca birleştir; uçlar ortak noktada buluşur (çizimdeki hafif kaçıklıklar) */
  const joinGaps = (paths, gap) => {
    let P = paths.map(p => ({ pts: p.pts.slice(), closed: p.closed }));
    for (let guard = 0; guard < 500; guard++) {
      let done = false;
      for (let i = 0; i < P.length && !done; i++) { const a = P[i]; if (a.closed) continue;
        for (let j = i + 1; j < P.length && !done; j++) { const b = P[j]; if (b.closed) continue;
          const A0 = a.pts[0], A1 = a.pts[a.pts.length - 1], B0 = b.pts[0], B1 = b.pts[b.pts.length - 1];
          const mid = (x, y) => [(x[0] + y[0]) / 2, (x[1] + y[1]) / 2, ((x[2] || 0) + (y[2] || 0)) / 2];
          let m = null;
          if (M.dist(A1, B0) < gap) m = [...a.pts.slice(0, -1), mid(A1, B0), ...b.pts.slice(1)];
          else if (M.dist(A1, B1) < gap) m = [...a.pts.slice(0, -1), mid(A1, B1), ...b.pts.slice(0, -1).reverse()];
          else if (M.dist(A0, B1) < gap) m = [...b.pts.slice(0, -1), mid(B1, A0), ...a.pts.slice(1)];
          else if (M.dist(A0, B0) < gap) m = [...b.pts.slice(1).reverse(), mid(B0, A0), ...a.pts.slice(1)];
          if (m) { P.splice(j, 1); P[i] = { pts: m, closed: false }; done = true; }
        }
      }
      if (!done) break;
    }
    // kapanma: uçlar ≤ 5 cm ise kapalı
    return P.map(p => { if (!p.closed && p.pts.length > 3) { let L = 0; for (let i = 1; i < p.pts.length; i++) L += M.dist(p.pts[i - 1], p.pts[i]); const a = p.pts[0], b = p.pts[p.pts.length - 1]; if (M.dist(a, b) < Math.min(0.05, L * 0.02)) { const q = p.pts.slice(0, -1); q[0] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, ((a[2] || 0) + (b[2] || 0)) / 2]; return { pts: q, closed: true }; } } return p; });
  };
  /* dikdörtgen yol → merkez, b, d, açı */
  const rectInfo = pts => {
    if (pts.length !== 4) return null;
    for (let i = 0; i < 4; i++) { const a = pts[i], b = pts[(i + 1) % 4], c = pts[(i + 2) % 4], u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]], lu = Math.hypot(...u), lv = Math.hypot(...v); if (lu < 1e-6 || lv < 1e-6 || Math.abs(u[0] * v[0] + u[1] * v[1]) / (lu * lv) > 1e-3) return null; }
    const u = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]], v = [pts[3][0] - pts[0][0], pts[3][1] - pts[0][1]];
    let b = Math.hypot(...u), d = Math.hypot(...v), rot = Math.atan2(u[1], u[0]) / RAD;
    if (d > b + 1e-9) { [b, d] = [d, b]; rot += 90; } rot = ((rot % 180) + 180) % 180; if (rot > 90 + 1e-9) rot -= 180; // uzun kenar b, açı −90…90
    const c = [(pts[0][0] + pts[2][0]) / 2, (pts[0][1] + pts[2][1]) / 2, ((pts[0][2] || 0) + (pts[2][2] || 0)) / 2];
    return { c, rot: +rot.toFixed(6), b: +b.toFixed(6), d: +d.toFixed(6) };
  };
  const tk = p => `${+p[0].toFixed(6)},${+p[1].toFixed(6)},${+(p[2] || 0).toFixed(6)}`;
  const circlePts = (e, n = M.circN ? M.circN(e.r, 96, 512) : 128) => { const out = []; for (let i = 0; i < n; i++) { const t = TAU * i / n; out.push([e.c[0] + e.r * Math.cos(t), e.c[1] + e.r * Math.sin(t), e.c[2] || 0]); } return out; };
  /* oluşturulan elemanın kotunu çizginin kotuna göre ayarla */
  const applyZ = (e, zl, mode) => {
    if (mode === 'AYAR') return;
    const top = mode === 'UST';
    switch (e.type) {
      case 'perde': { const h = +e.h || 3; e.z0 = +(top ? zl - h : zl).toFixed(4); break; }
      case 'kolon': { const h = +e.h || 3; e.z0 = +(top ? zl - h : zl).toFixed(4); break; }
      case 'kiris': { const hb = +e.hb || 0.5; e.zt = +(top ? zl : zl + hb).toFixed(4); break; }
      case 'plak': { const t = +e.t || 0.2; e.zt = +(top ? zl : zl + t).toFixed(4); break; }
      case 'temel': { const t = +e.t || 0.6; e.zt = +(top ? zl : zl + t).toFixed(4); break; }
    }
    delete e._c;
  };
  const CMD = { PERDE: 'PERDE', DUVAR: 'IDUVAR', KIRIS: 'KIRIS', STEMEL: 'TEMEL', RADYE: 'TEMEL', DOSEME: 'IDOSEME', CATI: 'ICATI' };
  C.addCommand(['ELEMANYAP', 'CIZGIDENELEMAN', 'DONUSTUR', 'CIZGIDENYAPI'], 'Çizgiden yapı elemanı: planda ya da 3B\'de çizgi / çoklu çizgi / dikdörtgen / daire ile çizdiğiniz şekli seçin, eleman türünü seçin (perde, duvar, kiriş, sürekli temel, radye, döşeme, çatı döşemesi, kolon, tekil temel). Uç uca çizgiler zincirlenir; kot çizginin kotundan alınabilir.', async (I) => {
    const kvT = E.queue.filter(t => /^[A-Za-zİıÜüŞşÇçĞğÖö][A-Za-z0-9İıÜüŞşÇçĞğÖö]*=/.test(t)); E.queue = E.queue.filter(t => !kvT.includes(t)); // TIP=… gibi ayarlar seçimden önce ayrılır
    const OK = ['line', 'pline', 'arc', 'circle', 'ellipse', 'kati', 'face'];
    let sel;
    if (!C.sel.length && C.selFace && C.selFace.pts && C.byId(C.selFace.e.id)) { // 3B'de tıklanmış yüz: yüzün sınırı kullanılır
      sel = [{ _face: true, type: '_face', id: -1, pts: C.selFace.pts.map(p3) }]; C.log('Seçili yüzün sınırı kullanılıyor.'); C.selFace = null; C.emit('selection');
    } else sel = await I.sel('Dönüştürülecek çizgileri seçin (çizgi, çoklu çizgi, dikdörtgen, daire, yay, elips, 3B yüz / ötelenmiş çizgi), Enter', { pre: true });
    if (!sel || !sel.length) return;
    let src = sel.filter(e => e._face || OK.includes(e.type));
    // katı (kalınlığı olan) seçildiyse: üst yüzündeki ötelenmiş çizgi / yüz varsa onu kullan
    const solid = e => e.type === 'kati' && Math.abs(e.h || 0) >= 1e-7, flatK = e => e.type === 'kati' && Math.abs(e.h || 0) < 1e-7;
    if (src.some(solid)) {
      const others = src.filter(e => !solid(e));
      if (others.length) src = others; // çizgiler de seçildiyse katının kendisi kullanılmaz
      else {
        const on = [];
        for (const k of src) { const top = C.katiLoop(k, (k.uz[2] || 0) < 0 ? 0 : k.h), zt = Math.max(...top.map(p => p[2])), poly = top.map(p => [p[0], p[1]]);
          for (const x of C.doc.ents) { if (x === k || on.includes(x)) continue; let q = null; if (flatK(x)) q = C.katiLoop(x, 0); else if (x.type === 'pline') q = x.pts.map(p3); else if (x.type === 'circle') q = [p3(x.c)]; if (!q || !q.length) continue;
            const cx = q.reduce((t, p) => t + p[0], 0) / q.length, cy = q.reduce((t, p) => t + p[1], 0) / q.length;
            if (q.every(p => Math.abs((p[2] || 0) - zt) < 1e-4) && C.pointInPoly([cx, cy], poly)) on.push(x); } }
        if (on.length) { src = on; C.log(`Katının üst yüzündeki ${on.length} çizgi / yüz kullanıldı (katının dış kenarı değil). Dış kenarı isterseniz önce katının üst yüzüne tıklayın, sonra komutu verin.`); }
      }
    }
    if (!src.length) { C.warn('Seçimde çizgi, çoklu çizgi, daire, elips ya da 3B yüz yok.'); return; }
    if (E.scriptMode) E.queue.unshift(...kvT);
    else if (kvT.length) { // şerit menü ön ayarı (TIP=PERDE …): pencere yine açılır, tür seçili gelir
      const st0 = C.doc.set.insaat || (C.doc.set.insaat = {}), o = st0.elemanyap = Object.assign({}, st0.elemanyap || {});
      for (const t of kvT) { const [k, v] = t.split('='); const kk = { TIP: 'tip', KOT: 'kot', SIL: 'sil' }[C.up(k)]; if (kk) o[kk] = C.up(v); }
    }
    const r = await I_().getParams('Çizgiden yapı elemanı', [
      { k: 'tip', t: 'Eleman türü', opts: TIP, d: 'PERDE', al: ['TIP'] },
      { k: 'kot', t: 'Kot', opts: KOT, d: 'OTO', al: ['KOT'] },
      { k: 'sil', t: 'Seçilen çizgiler', opts: [['H', 'Kalsın'], ['E', 'Silinsin']], d: 'H', al: ['SIL'] },
    ], 'elemanyap'); if (!r) return;
    // seçilen parça açık uçluysa (konturun bir parçası tıklandıysa), uç uca bağlı diğer çizgi / yay / açık çoklu çizgileri de otomatik ekle (AutoCAD'deki zincir seçimi gibi)
    {
      const CT = 0.02, ends = e => e.type === 'line' ? [p3(e.a), p3(e.b)] : e.type === 'arc' ? [[e.c[0] + e.r * Math.cos(e.a0 * RAD), e.c[1] + e.r * Math.sin(e.a0 * RAD), e.c[2] || 0], [e.c[0] + e.r * Math.cos(e.a1 * RAD), e.c[1] + e.r * Math.sin(e.a1 * RAD), e.c[2] || 0]] : (e.type === 'pline' && !e.closed && e.pts.length > 1) ? [p3(e.pts[0]), p3(e.pts[e.pts.length - 1])] : null;
      const openP = () => joinGaps(chain(segsOf(src).S, 0.005), CT).filter(p => !p.closed);
      if (src.some(e => ends(e)) && openP().length) {
        const pool = C.doc.ents.filter(e => !src.includes(e) && ends(e) && (C.layer(e.layer) || {}).on !== false), before = src.length;
        for (let it = 0; it < 3000; it++) {
          const tips = []; for (const p of joinGaps(chain(segsOf(src).S, 0.005), CT)) if (!p.closed) tips.push(p.pts[0], p.pts[p.pts.length - 1]); if (!tips.length) break;
          const i = pool.findIndex(e => ends(e).some(q => tips.some(t => M.dist(q, t) < CT))); if (i < 0) break;
          src.push(pool.splice(i, 1)[0]);
        }
        if (src.length > before) C.log(`Uç uca bağlı ${src.length - before} parça daha otomatik eklendi (kontur tamamlandı).`);
      }
    }
    const { S, circles } = segsOf(src); let paths = joinGaps(chain(S, 0.005), 0.02);
    // kaba bölünmüş yayları (ötelenmiş yüz, eski çizim) ince böl: köşeler yerinde kalır, aradaki noktalar yerel çember üzerinde — daireler / yaylar pürüzsüz olsun
    paths = paths.map(p => ({ pts: smoothArcs(p.pts, p.closed), closed: p.closed }));
    const anyZ = src.some(e => (e._face || e.type === 'kati' || e.type === 'face') ? true : (e.type === 'line' && (Math.abs(e.a[2] || 0) > 1e-6 || Math.abs(e.b[2] || 0) > 1e-6)) || (e.pts && e.pts.some(p => Math.abs(p[2] || 0) > 1e-6)) || ((e.type === 'circle' || e.type === 'arc' || e.type === 'ellipse') && Math.abs(e.c[2] || 0) > 1e-6));
    const mode = r.kot === 'OTO' ? (anyZ ? 'ALT' : 'AYAR') : r.kot;
    const before = new Set(C.doc.ents.map(e => e.id)), made = [];
    const track = zl => { for (const e of C.doc.ents) if (!before.has(e.id)) { before.add(e.id); applyZ(e, zl, mode); made.push(e); } };
    const zOf = pts => pts.reduce((s, p) => s + (p[2] || 0), 0) / pts.length;
    const st = C.doc.set.insaat || (C.doc.set.insaat = {});
    if (r.tip === 'KOLON' || r.tip === 'TTEMEL') {
      const isK = r.tip === 'KOLON';
      const q = await I_().getParams(isK ? 'Kolon — ayarlar (ölçüler şekilden)' : 'Tekil temel — ayarlar (ölçüler şekilden)', isK
        ? [{ k: 'h', t: 'Yükseklik (m)', d: (st.kolon && st.kolon.h) || 3, al: ['H'] }, { k: 'z0', t: 'Alt kot (m) — kot AYAR ise', d: (st.kolon && st.kolon.z0) || 0, al: ['Z'] }, { k: 'beton', t: 'Beton sınıfı', s: true, d: (st.kolon && st.kolon.beton) || 'C30/37', al: ['BETON'] }]
        : [{ k: 't', t: 'Yükseklik (cm)', d: 60, al: ['T'] }, { k: 'zt', t: 'Üst kot (m) — kot AYAR ise', d: 0, al: ['Z'] }, { k: 'beton', t: 'Beton sınıfı', s: true, d: 'C30/37', al: ['BETON'] }], isK ? 'elemanyap_kolon' : 'elemanyap_ttemel'); if (!q) return;
      const lay = C.insLayerFor ? C.insLayerFor({ type: isK ? 'kolon' : 'temel' }) : '0'; if (C.INS_LAYERS && C.INS_LAYERS[lay]) C.ensureLayer(lay, C.INS_LAYERS[lay][0], 'CONTINUOUS', C.INS_LAYERS[lay][1]);
      const shapes = [];
      for (const c of circles) shapes.push({ c: p3(c.c), D: 2 * c.r, z: c.c[2] || 0 });
      for (const p of paths) { if (!p.closed) continue; const ri = rectInfo(p.pts); if (ri) shapes.push(Object.assign(ri, { z: zOf(p.pts) })); else C.warn('Dikdörtgen olmayan kapalı şekil atlandı (' + p.pts.length + ' köşe).'); }
      if (!shapes.length) { C.warn('Kolon / tekil temel için kapalı dikdörtgen ya da daire bulunamadı.'); return; }
      for (const s of shapes) {
        let e;
        if (isK) e = C.add(C.newEnt('kolon', s.D ? { sek: 'D', D: s.D, b: s.D, d: s.D, p: [s.c[0], s.c[1], 0], rot: 0, h: +q.h, z0: +q.z0, beton: q.beton, layer: lay } : { sek: 'R', b: s.b, d: s.d, D: 0.5, p: [s.c[0], s.c[1], 0], rot: s.rot, h: +q.h, z0: +q.z0, beton: q.beton, layer: lay }));
        else e = C.add(C.newEnt('temel', { bx: s.D || s.b, by: s.D || s.d, t: (+q.t || 60) / 100, zt: +q.zt, rot: s.D ? 0 : s.rot, p: [s.c[0], s.c[1], 0], beton: q.beton, layer: lay }));
        delete e.sp; before.add(e.id); applyZ(e, s.z, mode); made.push(e);
      }
    } else {
      // daireler yol olarak (yuvarlak havuz duvarı / döşeme)
      for (const c of circles) paths.push({ pts: circlePts(c), closed: true });
      const needClosed = ['RADYE', 'DOSEME', 'CATI'].includes(r.tip);
      if (needClosed) { const n0 = paths.length; paths = paths.filter(p => p.closed && p.pts.length >= 3); if (paths.length < n0) C.warn(`${n0 - paths.length} açık şekil atlandı (${r.tip === 'RADYE' ? 'radye' : 'döşeme'} için kapalı şekil gerekir).`); }
      if (!paths.length) { C.warn('Dönüştürülecek şekil bulunamadı.'); return; }
      if (r.tip === 'STEMEL' || r.tip === 'RADYE') { st.temel = Object.assign({}, st.temel || {}, { tip: r.tip === 'STEMEL' ? 'S' : 'R' }); }
      const def = C.cmds[CMD[r.tip]];
      for (let i = 0; i < paths.length; i++) {
        const p = paths[i], toks = [];
        if (i > 0) toks.push('ELEMANYAP=1'); // ilk şekilde ayar penceresi açılır, sonrakiler aynı ayarla
        if (r.tip === 'KIRIS') { toks.push(...p.pts.map(tk)); if (p.closed) toks.push(tk(p.pts[0])); toks.push(''); }
        else { toks.push(...p.pts.map(tk)); toks.push(p.closed ? 'K' : ''); }
        const n0 = made.length;
        E.queue = toks;
        C._noAutoClose = true;
        try { await def.fn(I, C); } finally { C._noAutoClose = false; E.queue = []; E.preview = null; E.base = null; }
        track(zOf(p.pts));
        if (i === 0 && made.length === n0) return; // ayar penceresi iptal edildi
      }
    }
    if (!made.length) { C.warn('Eleman oluşturulmadı.'); return; }
    if (r.sil === 'E') C.remove(src.filter(e => !e._face && C.byId(e.id)));
    C.changed();
    const lbl = (TIP.find(t => t[0] === r.tip) || [0, r.tip])[1];
    C.log(`${made.length} eleman oluşturuldu: ${lbl}${mode === 'ALT' ? ' · kot: çizgi = alt yüz' : mode === 'UST' ? ' · kot: çizgi = üst yüz' : ''}${r.sil === 'E' ? ' · çizgiler silindi' : ''}.`);
    C.sel = made.slice(); C.emit('selection');
  });
  /* DAİRESEL PERDE: merkez + yarıçap (tam daire) ya da yay; perdenin kendi ayar penceresi kullanılır */
  C.addCommand(['DAIRESELPERDE', 'PERDEDAIRE', 'YUVARLAKPERDE', 'DAIREPERDE'], 'Dairesel perde (yuvarlak havuz / çöktürme / tank duvarı): merkeze tıklayın, yarıçapı yazın ya da tıklayın (perde ekseni); Enter = tam daire, ya da yay için başlangıç ve bitiş noktalarına tıklayın. Kalınlık, yükseklik, alt kot, hiza perde ayar penceresinden.', async (I) => {
    const c = await I.pt('Dairesel perdenin merkezi'); if (!c || typeof c === 'string') return;
    E.base = c; E.preview = q => [C.prim.CI([c[0], c[1], c[2] || 0], M.dist2(c, q))];
    let r = await E.ask('pt', 'Yarıçap (perde ekseni; yazın ya da tıklayın) — D = çap', { num: true, kw: [['D', 'Cap', 'Çap']] });
    if (r === 'D') { const d = await E.ask('pt', 'Çap', { num: true }); r = typeof d === 'number' ? d / 2 : Array.isArray(d) ? M.dist2(c, d) / 2 : null; }
    if (Array.isArray(r)) r = M.dist2(c, r); E.preview = null; if (!(r > 0.05)) return;
    E.preview = q => { const a0 = Math.atan2(q[1] - c[1], q[0] - c[0]); return [C.prim.CI([c[0], c[1], c[2] || 0], r, { lt: 'DASHED' }), C.prim.L([c[0], c[1], c[2] || 0], [c[0] + Math.cos(a0) * r, c[1] + Math.sin(a0) * r, c[2] || 0])]; };
    const s0 = await E.ask('pt', 'Enter = tam daire · ya da yay perde için BAŞLANGIÇ noktası', {}); E.preview = null;
    const z = c[2] || 0, n = M.circN ? M.circN(r, 96, 512) : 128; let pts, closed = true;
    if (Array.isArray(s0)) { const a0 = Math.atan2(s0[1] - c[1], s0[0] - c[0]); E.preview = q => { let a1 = Math.atan2(q[1] - c[1], q[0] - c[0]); let sw = a1 - a0; while (sw <= 0) sw += 2 * Math.PI; const k = Math.max(4, Math.ceil(n * sw / (2 * Math.PI))), out = []; for (let i = 0; i <= k; i++) { const a = a0 + sw * i / k; out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, z]); } return [C.prim.P(out, false, { lw: 50 })]; };
      const s1 = await E.ask('pt', 'Yayın BİTİŞ noktası (saat yönü tersine)', {}); E.preview = null; E.base = null; if (!Array.isArray(s1)) return;
      let sw = Math.atan2(s1[1] - c[1], s1[0] - c[0]) - a0; while (sw <= 0) sw += 2 * Math.PI; const k = Math.max(4, Math.ceil(n * sw / (2 * Math.PI))); pts = []; for (let i = 0; i <= k; i++) { const a = a0 + sw * i / k; pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, z]); } closed = false; }
    else { E.base = null; pts = []; for (let i = 0; i < n; i++) { const a = 2 * Math.PI * i / n; pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, z]); } }
    const def = C.cmds.PERDE; E.queue = [...pts.map(tk), closed ? 'K' : '']; C._noAutoClose = true;
    try { await def.fn(I, C); } finally { C._noAutoClose = false; E.queue = []; E.preview = null; E.base = null; }
    const w = C.doc.ents.filter(x => x.type === 'perde').at(-1); if (w) C.log(`Dairesel perde: yarıçap ${M.fmt(r, 3)} m (eksen)${closed ? ', tam daire' : ', yay'} · ${C.T.perde.info(w)}`);
  });
  C._elemanyap = { chain, rectInfo, segsOf };
})(window.C);

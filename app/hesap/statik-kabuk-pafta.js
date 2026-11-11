/* ArıtmaCAD — STATİK: yay / oval / serbest planlı hazne (3B kabuk) için DSİ STATİK PAFTALARI
   Firma paftaları örnek alınmıştır (ÇOKAL AAT T-106 havalandırma havuzu):
     Pafta 1  KALIP PLANI          — radye + perdeler (yaylar gerçek eğri), akslar (harf / rakam balonları), ölçü zincirleri,
                                     yay yarıçapları (R…), perde kalınlıkları, kotlar, kesit okları
     Pafta 2  KESİTLER             — A-A (boyuna) ve B-B (enine): kesilen perde ve radye taralı, su / zemin / YAS, kotlar, ölçüler
     Pafta 3  TEMEL DONATI DETAYI  — radye X / Y alt-üst çubukları (yay kenarında boyları değişen pozlar), dağıtma çizgileri, metraj
     Pafta 4+ PERDE DONATI DETAYI  — plan üzerinde iç / dış yatay (yaylarda halka) donatı + ışınsal R yazıları, tipik perde kesiti
                                     (filiz, gövde, su tutucu bant), her perde grubu için metraj tablosu
   Çizim ilkelleri ve pafta düzeni statik-pafta-dsi.js ile aynıdır (P._dsi: yeniCizim, antet, notSutunu, tablo, kaydir). */
'use strict';
(function () {
  const P = window.STATIK, $ = s => document.querySelector(s);
  const r2 = v => Math.round(v * 100) / 100, cmi = v => String(Math.round(v * 100)), kotS = v => (v >= 0 ? '+' : '') + (+v).toFixed(2), DEG = 180 / Math.PI;
  const AG = F => P.agirlik ? P.agirlik(F) : F * F * 0.00617;
  const plen = (pts, kap) => { let L = 0; const n = kap ? pts.length : pts.length - 1; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); } return L; };
  const area = poly => { let a = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]); return a / 2; };

  /* ---------- geometri yardımcıları ---------- */
  const ofset = (pts, d, kap) => { // sola (+) d kadar ötele, köşelerde gönye (miter)
    const n = pts.length, N = [], out = [];
    const nrm = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / L, (b[0] - a[0]) / L]; };
    const ns = kap ? n : n - 1; for (let i = 0; i < ns; i++) N.push(nrm(pts[i], pts[(i + 1) % n]));
    for (let i = 0; i < n; i++) {
      const n0 = kap ? N[(i - 1 + ns) % ns] : (i > 0 ? N[i - 1] : null), n1 = kap ? N[i % ns] : (i < ns ? N[i] : null);
      if (!n0 || !n1) { const m = n0 || n1; out.push([pts[i][0] + m[0] * d, pts[i][1] + m[1] * d]); continue; }
      const s = [n0[0] + n1[0], n0[1] + n1[1]], dd = 1 + n0[0] * n1[0] + n0[1] * n1[1]; const k = dd > 0.2 ? d / dd : d / 0.2; out.push([pts[i][0] + s[0] * k, pts[i][1] + s[1] * k]);
    }
    return out;
  };
  const kesisim = (loops, ekseni, c) => { // loops: kapalı poligon listesi; ekseni 'y' → y = c doğrusu (x değerleri), 'x' → x = c
    const ts = [];
    for (const L of loops) for (let i = 0; i < L.length; i++) { const a = L[i], b = L[(i + 1) % L.length], u = ekseni === 'y' ? 1 : 0, v = 1 - u;
      if ((a[u] > c) === (b[u] > c)) continue; const t = (c - a[u]) / (b[u] - a[u]); ts.push(a[v] + (b[v] - a[v]) * t); }
    ts.sort((p, q) => p - q); const iv = []; for (let i = 0; i + 1 < ts.length; i += 2) if (ts[i + 1] - ts[i] > 1e-4) iv.push([ts[i], ts[i + 1]]); return iv;
  };
  // yay parçaları (statik-oval.js ile aynı ölçütler)
  const donus = (a, b, c) => { const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]]; return Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]); };
  const daire = Pp => { const n = Pp.length, mx = Pp.reduce((s, p) => s + p[0], 0) / n, my = Pp.reduce((s, p) => s + p[1], 0) / n; let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
    for (const p of Pp) { const u = p[0] - mx, v = p[1] - my; suu += u * u; svv += v * v; suv += u * v; suuu += u * u * u; svvv += v * v * v; suvv += u * v * v; svuu += v * u * u; }
    const det = suu * svv - suv * suv; if (Math.abs(det) < 1e-12) return null; const b1 = (suuu + suvv) / 2, b2 = (svvv + svuu) / 2, c = [mx + (b1 * svv - b2 * suv) / det, my + (b2 * suu - b1 * suv) / det];
    const R = Pp.reduce((s, p) => s + Math.hypot(p[0] - c[0], p[1] - c[1]), 0) / n; return { c, R, hata: Math.max(...Pp.map(p => Math.abs(Math.hypot(p[0] - c[0], p[1] - c[1]) - R))) }; };
  const parcala = (pts0, kap) => {
    let pts = pts0.slice(); if (kap) { let bi = 0, bl = -1; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > bl) { bl = l; bi = i; } } pts = pts.slice(bi).concat(pts.slice(0, bi)); pts.push(pts[0]); }
    const Pp = [pts[0]]; for (let i = 1; i < pts.length; i++) { if (Pp.length >= 2 && Math.abs(donus(Pp[Pp.length - 2], Pp[Pp.length - 1], pts[i])) < 1.5 / DEG) Pp[Pp.length - 1] = pts[i]; else Pp.push(pts[i]); }
    const n = Pp.length - 1, out = []; let i = 0;
    const ok = (i0, j) => { let sg = 0; for (let k = i0 + 1; k <= j; k++) { const d = donus(Pp[k - 1], Pp[k], Pp[k + 1]); if (Math.abs(d) < 1 / DEG || Math.abs(d) > 50 / DEG) return null; const s = Math.sign(d); if (sg && s !== sg) return null; sg = s; }
      const ls = []; for (let k = i0; k <= j; k++) ls.push(Math.hypot(Pp[k + 1][0] - Pp[k][0], Pp[k + 1][1] - Pp[k][1])); if (Math.max(...ls) > 2.5 * Math.min(...ls)) return null;
      const f = daire(Pp.slice(i0, j + 2)); if (!f || f.R > 150 || f.hata > Math.max(0.02, 0.004 * f.R)) return null; return f; };
    while (i < n) { let j = i + 2, f = null; if (j < n) { f = ok(i, j); if (f) while (j + 1 < n) { const g = ok(i, j + 1); if (!g) break; j++; f = g; } }
      if (f) { const Q = Pp.slice(i, j + 2); let aci = 0; for (let k = 1; k < Q.length; k++) { let d = Math.atan2(Q[k][1] - f.c[1], Q[k][0] - f.c[0]) - Math.atan2(Q[k - 1][1] - f.c[1], Q[k - 1][0] - f.c[0]); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; aci += d; } out.push({ tip: 'yay', pts: Q, R: f.R, c: f.c, aci }); i = j + 1; }
      else { out.push({ tip: 'duz', pts: [Pp[i], Pp[i + 1]] }); i++; } }
    return out;
  };

  /* ---------- donatı seçimi (kabuk tasarımından) ---------- */
  const secim = (K, wi, yon, yuz) => { // yon 'M11'|'M22' ; yuz 'dış'|'iç'|'1. yüz'|'2. yüz'|'üst'|'alt'
    const t = K.tasarim.find(x => x.grup.tur !== 'radye' && x.grup.tur !== 'doseme' && K.AG.els[x.grup.ids[0]].wi === wi) || null; if (!t) return null;
    const k = t.katman.find(q => q.yon.startsWith(yon) && q.yuz === yuz) || t.katman.find(q => q.yon.startsWith(yon)); return k && k.sec && k.sec.ok ? k.sec : null; };
  const secR = (K, yon, yuz) => { const t = K.tasarim.find(x => x.grup.tur === 'radye'); if (!t) return null; const k = t.katman.find(q => q.yon.startsWith(yon) && q.yuz === yuz); return k && k.sec && k.sec.ok ? k.sec : null; };

  /* ---------- poz listesi ---------- */
  const pozEkle = (liste, o) => { if (!o.F || !(o.adet > 0) || !(o.boy > 0)) return null; o.boy = r2(o.boy); o.adet = Math.ceil(o.adet - 1e-9); const ay = liste.find(p => p.F === o.F && Math.abs(p.boy - o.boy) < 0.005 && p.grup === o.grup && JSON.stringify(p.segs || null) === JSON.stringify(o.segs || null)); if (ay) { ay.adet += o.adet; ay.top = r2(ay.adet * ay.boy); return ay; } o.top = r2(o.adet * o.boy); liste.push(o); return o; };
  const parcaBoy = (L, F, hA, hB) => { const pr = P.parcala ? P.parcala(L, F, +hA || 0, +hB || 0) : [[0, L]], n = pr.length, ln = q => q[1] - q[0]; if (n === 1) return [{ L, sol: true, sag: true, n: 1 }]; return [{ L: ln(pr[0]), sol: true, sag: false, n: 1 }, ...(n > 2 ? [{ L: ln(pr[1]), sol: false, sag: false, n: n - 2 }] : []), { L: ln(pr[n - 1]), sol: false, sag: true, n: 1 }]; };

  /* yatay çubuk düzeni — ÖRNEK PAFTADAKİ GİBİ ORTALANMIŞ: ilk 12 m'lik çubuk perdenin (kapalıda en uzun düz kenarın) ortasına
     simetrik konur, iki yöne bindirmeli devam edilir; kapalı halkada karşı tarafta (simetri ekseninde) bindirmeyle kapanır.
     Dönen parçalar: [{a, b, boy, R (eğri ise yüz yarıçapı), sol/sag kanca}] — a, b çubuk yolu üzerinde (m) */
  const ortaDuzen = (bar, kap, F, kanca, parcaAks, uzat) => {
    const kA = Array.isArray(kanca) ? kanca[0] : kanca, kBk = Array.isArray(kanca) ? kanca[1] : kanca, eA = uzat ? uzat[0] : 0, eB = uzat ? uzat[1] : 0;
    const M = 12, lap = P.bindirme(F), n = bar.length, Q = kap ? bar.concat([bar[0]]) : bar, cum = [0]; for (let i = 1; i < Q.length; i++) cum.push(cum[i - 1] + Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1])); const Lf = cum[cum.length - 1]; void n;
    const at = s0 => { let s2 = kap ? ((s0 % Lf) + Lf) % Lf : Math.max(0, Math.min(Lf, s0)), i = 1; while (i < cum.length - 1 && cum[i] < s2) i++; const a = Q[i - 1], b = Q[i], l = cum[i] - cum[i - 1] || 1, u = (s2 - cum[i - 1]) / l; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; };
    const Rbul = (a, b) => { let R = null; const ds = new Map(); const yay = (parcaAks || []).filter(p => p.tip === 'yay'); const sv = []; for (let i = 0; i < cum.length; i++) for (let w2 = -1; w2 <= 1; w2++) { const si = cum[i] + w2 * Lf; if (si >= a - 1e-6 && si <= b + 1e-6) sv.push(si); } if (sv.length < 3) for (let k = 0; k <= 10; k++) sv.push(a + (b - a) * k / 10); /* yarıçap çubuk köşe noktalarından (tam yay üzerinde) */
      for (const sq of sv) { const q = at(sq); for (const p of yay) { const d = Math.hypot(q[0] - p.c[0], q[1] - p.c[1]); if (Math.abs(d - p.R) < 0.6 && Math.abs(Math.atan2(q[1] - p.c[1], q[0] - p.c[0])) <= 7) { const ang = a2 => Math.atan2(a2[1] - p.c[1], a2[0] - p.c[0]); const a0 = ang(p.pts[0]), a1 = ang(p.pts[p.pts.length - 1]), aq = ang(q); let t = (aq - a0) / ((a1 - a0) || 1e-9); const tw = ((aq - a0 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI, tt = ((a1 - a0 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI; t = tt ? tw / tt : 0; if (t > -0.02 && t < 1.02) { const k2 = r2(d); ds.set(k2, (ds.get(k2) || 0) + 1); } } } } let bn = 0; for (const [k2, v] of ds) if (v > bn) { bn = v; R = k2; } return R; }; /* çubuk yarıçapı: yay üzerindeki örneklerin en sık değeri (teğet düz uçlar sapmasın) */
    let s0 = Lf / 2; if (kap) { let bl = -1; for (let i = 1; i < Q.length; i++) { const l = cum[i] - cum[i - 1]; if (l > bl + 1e-6) { bl = l; s0 = (cum[i] + cum[i - 1]) / 2; } } }
    const P2 = []; const ekle2 = (a, b, sol, sag) => P2.push({ a, b, sol, sag });
    if (kap) {
      if (Lf + lap <= M + 1e-6) ekle2(s0 - Lf / 2 - lap / 2, s0 + Lf / 2 + lap / 2, false, false);
      else { /* tüm çubuklar 12 m; ekler bindirme boyu kadar; yalnız son (kapatan) çubuk kalan boyda — en az 2×bindirme */
        const st = s0 - M / 2, end = st + Lf + lap, fw = []; let a = st; for (;;) { const b = a + M; if (b >= end - 1e-6) { fw.push([a, end]); break; } fw.push([a, b]); a = b - lap; }
        const fL = fw[fw.length - 1]; if (fw.length > 1 && fL[1] - fL[0] < 2 * lap) fL[0] = fL[1] - 2 * lap;
        fw.forEach(q => ekle2(q[0], q[1], false, false)); } }
    else { // açık perde: perde ortasından simetrik; bağlı uçta komşu perdeye bindirme / 2 kadar uzar, serbest uçta kanca
      const u0 = -eA, u1 = Lf + eB, mid = (u0 + u1) / 2, uz = (a, b) => (b - a) + (a <= u0 + 1e-6 ? kA : 0) + (b >= u1 - 1e-6 ? kBk : 0);
      if (uz(u0, u1) <= M + 1e-6) ekle2(u0, u1, true, true);
      else { let a0 = Math.max(u0, mid - M / 2), b0 = Math.min(u1, mid + M / 2); if (uz(a0, b0) > M) { if (a0 <= u0 + 1e-6) b0 = a0 + M - kA; if (b0 >= u1 - 1e-6) a0 = b0 - M + kBk; }
        ekle2(a0, b0, a0 <= u0 + 1e-6, b0 >= u1 - 1e-6);
        let e = b0; while (e < u1 - 1e-6) { const a = e - lap; let b = Math.min(u1, a + M); if (b >= u1 - 1e-6 && uz(a, b) > M) b = a + M - 0.3; ekle2(a, b, false, b >= u1 - 1e-6); e = b; }
        let g = a0; while (g > u0 + 1e-6) { const b = g + lap; let a = Math.max(u0, b - M); if (a <= u0 + 1e-6 && uz(a, b) > M) a = b - M + 0.3; ekle2(a, b, a <= u0 + 1e-6, false); g = a; } } }
    if (kap) P2.forEach(q => { while (q.a < 0) { q.a += Lf; q.b += Lf; } while (q.a >= Lf) { q.a -= Lf; q.b -= Lf; } });
    return P2.map(q => { const L = q.b - q.a, kS = q.sol ? (kap ? 0 : kA) : 0, kB = q.sag ? (kap ? 0 : kBk) : 0; const R = Rbul(q.a, q.b); let yay = null; if (R) { const N = 60, on = []; for (let k = 0; k <= N; k++) on.push(!!Rbul(q.a + L * k / N, q.a + L * k / N)); const i0 = on.indexOf(true), i1 = on.lastIndexOf(true); if (i0 >= 0) { const L1 = r2(L * i0 / N), L2 = r2(L * (N - i1) / N); yay = { L1, La: r2(L - L1 - L2), L2 }; } } return { a: q.a, b: q.b, L: r2(L), boy: r2(L + kS + kB), kS, kB, R, yay, Lf }; }).sort((x, y) => x.a - y.a);
  };
  /* RADYE YAY BÖLGELERİ (örnek paftadaki gibi): dış perdenin ≥ 90°'lik yayının altında radye donatısı ışınsal + halka atılır;
     dik (X / Y) ağ bu bölgede kesilir ve bindirme boyu kadar içeri uzar. Dönen: [{c, R, a0, aci, Rout, poly}]
     Radye kenarı yayı izlemiyorsa (ör. anaerobik havuz: yuvarlak uçlu halkalar dikdörtgen radye üzerinde; yay açısı içinde radye kenarı
     yaydan 3 m'den fazla uzakta) bölge sayılmaz: radyenin tamamına dik X / Y ağ atılır. */
  const sektorler = (walls, RP) => { const out = [];
    for (const w of walls) { if (w.tip !== 'dis') continue; for (const p of parcala(w.pts, w.kapali)) { if (p.tip !== 'yay' || Math.abs(p.aci || 0) < Math.PI / 2 - 0.05) continue;
      const a0 = Math.atan2(p.pts[0][1] - p.c[1], p.pts[0][0] - p.c[0]), aci = p.aci, ic = q => { let d = Math.atan2(q[1] - p.c[1], q[0] - p.c[0]) - a0; d = ((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); if (aci < 0) d = 2 * Math.PI - d; return d <= Math.abs(aci) + 0.02 || d >= 2 * Math.PI - 0.02; };
      let Rout = p.R + w.t / 2, uzakR = 0; for (let i = 0; i < RP.length; i++) { const a = RP[i], b = RP[(i + 1) % RP.length]; for (let k = 0; k < 8; k++) { const q = [a[0] + (b[0] - a[0]) * k / 8, a[1] + (b[1] - a[1]) * k / 8]; if (ic(q)) uzakR = Math.max(uzakR, Math.hypot(q[0] - p.c[0], q[1] - p.c[1])); } }
      if (uzakR > p.R + w.t / 2 + 3 + 1e-6) continue; // radye bu yayı izlemiyor
      for (const q of RP) if (ic(q)) Rout = Math.max(Rout, Math.hypot(q[0] - p.c[0], q[1] - p.c[1])); for (let i = 0; i < RP.length; i++) { const a = RP[i], b = RP[(i + 1) % RP.length]; for (let k = 1; k < 8; k++) { const q = [a[0] + (b[0] - a[0]) * k / 8, a[1] + (b[1] - a[1]) * k / 8]; if (ic(q)) Rout = Math.max(Rout, Math.min(p.R + w.t / 2 + 3, Math.hypot(q[0] - p.c[0], q[1] - p.c[1]))); } }
      const poly = [p.c]; for (let k = 0; k <= 32; k++) { const a = a0 + aci * k / 32; poly.push([p.c[0] + Math.cos(a) * (Rout + 0.05), p.c[1] + Math.sin(a) * (Rout + 0.05)]); }
      out.push({ c: p.c, R: p.R, a0, aci, Rout: r2(Rout), poly }); } }
    return out; };
  // dik çubuk aralıkları − yay bölgeleri; kesilen uçta bindirme kadar bölgeye uzar, kanca yalnız radye kenarında
  const ortoAralik = (RP, SK, eks, v, cR, lap) => { const out = []; for (const [a, b] of kesisim([RP], eks, v)) { let parcs = [[a, b, true, true]];
      for (const sk of SK) for (const [sa, sb] of kesisim([sk.poly], eks, v)) { const yeni = []; for (const [x0, x1, kA, kB] of parcs) { if (sb <= x0 || sa >= x1) { yeni.push([x0, x1, kA, kB]); continue; } if (sa > x0) yeni.push([x0, sa, kA, false]); if (sb < x1) yeni.push([sb, x1, false, kB]); } parcs = yeni; }
      for (const [x0, x1, kA, kB] of parcs) { const A2 = kA ? x0 + cR : Math.max(a + cR, x0 - lap), B2 = kB ? x1 - cR : Math.min(b - cR, x1 + lap); if (B2 - A2 >= 0.3) out.push({ a: A2, b: B2, kA, kB }); } }
    return out; };
  /* PERDE DÜŞEY DONATI PARÇALARI (dikdörtgen hazne paftasıyla aynı kural):
     H ≤ 2,00 m: filizsiz tek parça · 2,00 < H < 6,00 m: temel filizi + bindirmeli gövde · H ≥ 6,00 m: filiz + alt gövde + üst gövde, ortada inşaat derzi */
  const dusParca = (zb, zR, zt, cP, F, legV, legT) => { const H = zt - zR, lap = P.bindirme(F), zu = zt - cP, out = []; let derz = null;
    if (H <= 2.0 + 1e-6) out.push({ z0: zb, z1: zu, legA: legV, legB: legT, ad: 'tek parça' });
    else { out.push({ z0: zb, z1: Math.min(zu, zR + lap), legA: legV, legB: 0, ad: 'filiz' });
      if (H < 6.0) out.push({ z0: zR, z1: zu, legA: 0, legB: legT, ad: 'gövde' });
      else { derz = zR + Math.round(H / 2 / 0.05) * 0.05; out.push({ z0: zR, z1: Math.min(zu, derz + lap), legA: 0, legB: 0, ad: 'alt gövde' }, { z0: derz, z1: zu, legA: 0, legB: legT, ad: 'üst gövde' }); } }
    out.forEach(q => { q.L = r2(q.z1 - q.z0); q.boy = r2(q.L + q.legA + q.legB); }); return { parca: out, derz, H }; };
  P._kabukDusey = dusParca;
  P._kabukYard = { ofset, parcala, secim, secR, plen, kesisim, area, pozEkle, parcaBoy, ortaDuzen, sektorler, ortoAralik, dusParca };
  /* ================= PAFTA BLOKLARI ================= */
  P.kabukBloklar = (K, S, olcek) => {
    // plan dönüklüğü: en uzun düz perde X / Y eksenine oturacak şekilde döndür (paftalar "yamuk" çıkmasın)
    const M0 = S.kabuk; let bL = 0, th = 0; for (const w of M0.walls) { const n = w.kapali ? w.pts.length : w.pts.length - 1; for (let i = 0; i < n; i++) { const a = w.pts[i], b = w.pts[(i + 1) % w.pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > bL) { bL = L; th = Math.atan2(b[1] - a[1], b[0] - a[0]); } } }
    th = th - Math.round(th / (Math.PI / 2)) * (Math.PI / 2); if (Math.abs(th) < 0.2 * Math.PI / 180) th = 0;
    const cs = Math.cos(-th), sn = Math.sin(-th), DON = q => [q[0] * cs - q[1] * sn, q[0] * sn + q[1] * cs, ...(q.length > 2 ? [q[2]] : [])];
    const M = th ? Object.assign({}, M0, { walls: M0.walls.map(w => Object.assign({}, w, { pts: w.pts.map(DON) })), radye: Object.assign({}, M0.radye, { pts: M0.radye.pts.map(DON) }), dosemeler: (M0.dosemeler || []).map(d => Object.assign({}, d, { pts: d.pts.map(DON) })) }) : M0;
    const ICd = K.YT && K.YT.IC ? (th ? K.YT.IC.map(DON) : K.YT.IC) : null; P._kabukDonme = th * 180 / Math.PI;
    const Kf = (olcek || 50) / 1000, D0 = P._dsi, c = S.mal, rad = M.radye, zR = rad.kAlt + rad.t, B = [], cR = c.cR, cP = c.cP;
    /* PERDELERİ AYIR: her model perdesi düz ve yay parçalarına bölünür (örnek paftadaki gibi her parça ayrı perde: P1, P2 …).
       Donatı hesabı ana perdenin tasarımından alınır (w.wi); parçalar arasında yatay çubuklar bindirmeyle sürer (kanca yok). */
    const W = []; let pNo = 0;
    M.walls.forEach((w, wi) => { const pr0 = parcala(w.pts, w.kapali), pr = [];
      for (const q of pr0) { const L = plen(q.pts, false); const son = pr[pr.length - 1]; if (son && (L < 0.6 || plen(son.pts, false) < 0.6) && (son.tip === q.tip || L < 0.6)) { son.pts = son.pts.concat(q.pts.slice(1)); if (q.tip === 'yay' && son.tip !== 'yay') Object.assign(son, { tip: 'yay', c: q.c, R: q.R, aci: q.aci }); } else pr.push(Object.assign({}, q, { pts: q.pts.slice() })); }
      if (w.kapali && pr.length > 1) { const a = pr[0], z = pr[pr.length - 1]; if (a.tip === z.tip && a.tip === 'duz') { const u1 = [a.pts[1][0] - a.pts[0][0], a.pts[1][1] - a.pts[0][1]], u2 = [z.pts[1][0] - z.pts[0][0], z.pts[1][1] - z.pts[0][1]]; if (Math.abs(u1[0] * u2[1] - u1[1] * u2[0]) < 1e-3 * Math.hypot(...u1) * Math.hypot(...u2)) { a.pts = z.pts.slice(0, -1).concat(a.pts); pr.pop(); } } }
      const tekParca = pr.length <= 1;
      pr.forEach((q, k) => { const pts = tekParca ? w.pts : q.pts, kap = tekParca ? w.kapali : false, sol = ofset(pts, w.t / 2, kap), sag = ofset(pts, -w.t / 2, kap);
        const bagA = !tekParca && (w.kapali || k > 0), bagB = !tekParca && (w.kapali || k < pr.length - 1), ad = 'P' + (++pNo);
        const dl = (w.delik || []).filter(h => { const c = DON(h.c); let dm = 1e9; for (let i = 1; i < pts.length; i++) { const A = pts[i - 1], Bq = pts[i], d = [Bq[0] - A[0], Bq[1] - A[1]], L2 = d[0] * d[0] + d[1] * d[1] || 1, u = Math.max(0, Math.min(1, ((c[0] - A[0]) * d[0] + (c[1] - A[1]) * d[1]) / L2)); dm = Math.min(dm, Math.hypot(A[0] + d[0] * u - c[0], A[1] + d[1] * u - c[1])); } return dm < w.t / 2 + 0.3; });
        W.push(Object.assign({}, w, { wi, ad, anaAd: w.ad, pts, kapali: kap, parca: tekParca ? pr0 : [q], sol, sag, loops: kap ? [sol, sag] : [sol.concat(sag.slice().reverse())], bagA, bagB, ana: tekParca ? null : { pts: w.pts, kapali: w.kapali, parca: pr0 }, delik: dl, ptip: tekParca ? (pr0.some(x => x.tip === 'yay') ? 'yay' : 'duz') : q.tip, R: q.R })); }); });
    const zUst = Math.max(...W.map(w => w.zt)), RP = rad.pts, xs = RP.map(p => p[0]), ys = RP.map(p => p[1]), X0 = Math.min(...xs), X1 = Math.max(...xs), Y0 = Math.min(...ys), Y1 = Math.max(...ys), xm0 = (X0 + X1) / 2, ym0 = (Y0 + Y1) / 2;
    // ---- akslar: düz perde eksenleri (X/Y doğrultulu) + yay merkezleri ----
    const ax = [], ay = []; const ekle = (arr, v) => { if (!arr.some(q => Math.abs(q - v) < 0.05)) arr.push(v); };
    for (const w of W) for (const p of w.parca) { if (p.tip === 'duz') { const [a, b] = p.pts, L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.5) continue; if (Math.abs(b[1] - a[1]) < 0.02 * L) ekle(ay, (a[1] + b[1]) / 2); else if (Math.abs(b[0] - a[0]) < 0.02 * L) ekle(ax, (a[0] + b[0]) / 2); } else { ekle(ax, p.c[0]); ekle(ay, p.c[1]); } }
    ax.sort((a, b) => a - b); ay.sort((a, b) => b - a);
    // kesit hatları: perdeleri boyuna kesmeyen, ortaya en yakın konum
    const kesYeri = (eks, lo, hi, mid) => { let best = mid, bs = Infinity; for (let k = 1; k < 40; k++) { const v = lo + (hi - lo) * k / 40; let boy = 0; for (const w of W) for (const [a, b] of kesisim(w.loops, eks, v)) boy += Math.max(0, (b - a) - w.t * 1.5); const sk = boy * 10 + Math.abs(v - mid) / (hi - lo); if (sk < bs) { bs = sk; best = v; } } return best; };
    const ym = kesYeri('y', Y0, Y1, ym0), xm = kesYeri('x', X0, X1, xm0);
    const harf = i => (i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + i - 26));
    /* kolon / kiriş (çerçeve modelinden): planlarda ve kesitlerde gösterilir */
    const CER = S.cer || {}, KIR = (CER.kirisler || []).map(k => Object.assign({}, k, { a: DON(k.a), b: DON(k.b), bw: k.bw || 0.3, hb: k.hb || 0.5 })), KOL = (CER.kolonlar || []).map(c => { const p = DON([c.x, c.y]); return Object.assign({}, c, { x: p[0], y: p[1], bx: c.bx || 0.4, by: c.by || 0.4 }); });
    const kAdi = k => k.no || 'K' + k.id, cAdi = c => c.no || 'S' + c.id;
    const cerCiz = (D, yaz) => { const { mm, L, TX, REC } = D;
      for (const k of KIR) { const d = [k.b[0] - k.a[0], k.b[1] - k.a[1]], l = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / l, d[0] / l], w = k.bw / 2;
        for (const sg of [1, -1]) L([k.a[0] + n[0] * w * sg, k.a[1] + n[1] * w * sg], [k.b[0] + n[0] * w * sg, k.b[1] + n[1] * w * sg], 'STA_GORUNUS', 'HIDDEN');
        if (yaz) { const m = [(k.a[0] + k.b[0]) / 2, (k.a[1] + k.b[1]) / 2], rot = Math.atan2(d[1], d[0]) * DEG, rr = ((rot + 90) % 180 + 180) % 180 - 90; TX([m[0] + n[0] * (w + mm(2.5)), m[1] + n[1] * (w + mm(2.5))], `${kAdi(k)} (${cmi(k.bw)}/${cmi(k.hb)})`, 2.0, 'C', 'STA_YAZI', rr); } }
      for (const c of KOL) { REC(c.x - c.bx / 2, c.y - c.by / 2, c.x + c.bx / 2, c.y + c.by / 2, 'STA_KALIP'); L([c.x - c.bx / 2, c.y - c.by / 2], [c.x + c.bx / 2, c.y + c.by / 2], 'STA_KALIP'); L([c.x - c.bx / 2, c.y + c.by / 2], [c.x + c.bx / 2, c.y - c.by / 2], 'STA_KALIP'); if (yaz) TX([c.x + c.bx / 2 + mm(1.5), c.y - c.by / 2 - mm(3.5)], `${cAdi(c)} ${cmi(c.bx)}/${cmi(c.by)}`, 2.0, 'L', 'STA_YAZI'); } };
    const aksCiz = (D, kisa) => { const { mm, L, BALON, DM } = D, e = mm(14), ly = 'STA_AKS';
      ax.forEach((x, i) => { L([x, Y0 - e], [x, Y1 + e], ly); BALON([x, Y1 + e + mm(5)], String(i + 1)); if (!kisa) BALON([x, Y0 - e - mm(5)], String(i + 1)); });
      ay.forEach((y, i) => { L([X0 - e, y], [X1 + e, y], ly); BALON([X0 - e - mm(5), y], harf(i)); if (!kisa) BALON([X1 + e + mm(5), y], harf(i)); });
      // ölçü zincirleri: aks arası + toplam
      const yD = Y1 + mm(8); for (let i = 0; i + 1 < ax.length; i++) DM([ax[i], yD], [ax[i + 1], yD], 'h', 0, cmi(ax[i + 1] - ax[i])); DM([X0, yD + mm(7)], [X1, yD + mm(7)], 'h', 0, cmi(X1 - X0));
      const xD = X0 - mm(8); for (let i = 0; i + 1 < ay.length; i++) DM([xD, ay[i + 1]], [xD, ay[i]], 'v', 0, cmi(ay[i] - ay[i + 1])); DM([xD - mm(7), Y0], [xD - mm(7), Y1], 'v', 0, cmi(Y1 - Y0)); };
    const perdeCiz = (D, ly) => { const { PL, L } = D; for (const w of W) { if (w.kapali) { PL(w.sol, true, ly); PL(w.sag, true, ly); } else { PL(w.sol, false, ly); PL(w.sag, false, ly); L(w.sol[0], w.sag[0], ly); L(w.sol[w.sol.length - 1], w.sag[w.sag.length - 1], ly); } } };
    const yayYaz = (D, ofs) => { const { mm, L, TX } = D; for (const w of W) for (const p of w.parca) { if (p.tip !== 'yay') continue; const m = p.pts[Math.floor(p.pts.length / 4)], u = [(m[0] - p.c[0]) / p.R, (m[1] - p.c[1]) / p.R];
      for (const [d, k] of [[-w.t / 2, 0], [w.t / 2, 1]]) { const r = p.R + d, q = [p.c[0] + u[0] * r, p.c[1] + u[1] * r]; L(p.c, q, 'STA_OLCU'); const tq = [p.c[0] + u[0] * (r * 0.55 + k * mm(4)), p.c[1] + u[1] * (r * 0.55 + k * mm(4))]; TX(tq, 'R' + cmi(r), 2.0, 'C', 'STA_OLCU', Math.atan2(u[1], u[0]) * DEG); } void ofs; } };
    const kesOklari = (D) => { const { mm, KESOK, L } = D, e = mm(34); KESOK([X0 - e, ym], 'A', [1, 0]); KESOK([X1 + e, ym], 'A', [-1, 0]); L([X0 - e + mm(5), ym], [X0 - mm(4), ym], 'STA_KALIP', 'DASHDOT'); L([X1 - (-mm(4)), ym], [X1 + e - mm(5), ym], 'STA_KALIP', 'DASHDOT');
      KESOK([xm, Y1 + e], 'B', [0, -1]); KESOK([xm, Y0 - e], 'B', [0, 1]); };

    /* ---- PAFTA 1: KALIP PLANI ---- */
    { const D = D0.yeniCizim(Kf), { mm, PL, TX, KOT, BASLIK } = D;
      PL(RP, true, 'STA_KALIP'); perdeCiz(D, 'STA_KALIP'); aksCiz(D); yayYaz(D); kesOklari(D); cerCiz(D, true); for (const d of (M.dosemeler || [])) { const xs = d.pts.map(q => q[0]), ys = d.pts.map(q => q[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2; D.TX([cx, cy + mm(9)], `${d.ad || 'D'} döşeme h=${cmi(d.t)}`, 2.6, 'C', 'STA_BASLIK'); D.TX([cx, cy + mm(5)], `üst ${kotS(d.zt)}`, 2.0, 'C'); }
      for (const w of W) { const m = w.pts[Math.floor(w.pts.length / 2)], m2 = w.pts[Math.min(w.pts.length - 1, Math.floor(w.pts.length / 2) + 1)], a = Math.atan2(m2[1] - m[1], m2[0] - m[0]) * DEG, rr = ((a % 180) + 180) % 180, rot = rr > 90 ? rr - 180 : rr;
        TX([m[0] + mm(2), m[1] + mm(2)], `${w.ad} (${cmi(w.t)}${w.tt != null ? '/' + cmi(w.tt) : ''})`, 2.0, 'L', 'STA_YAZI', rot); }
      KOT([X1 - mm(25), Y0 + mm(10)], zR); KOT([xm0, ym0 + mm(6)], zR); TX([xm0 + mm(16), ym0 + mm(6.5)], `Perde üst ${kotS(zUst)}`, 2.0, 'L');
      BASLIK([xm0, Y0 - mm(40)], `${kotS(rad.kAlt).replace('+', '')} ve ${kotS(zUst).replace('+', '')} KOTLARI KALIP PLANI`, `Ö: 1/${olcek}`);
      B.push({ pafta: 0, spec: D.out, kutu: D.kutu() }); }

    /* ---- PAFTA 2: KESİTLER ---- */
    const kesit = (ad, eks, c0) => { // eks 'y' → A-A (x boyunca), 'x' → B-B (y boyunca)
      const D = D0.yeniCizim(Kf), { mm, REC, TARA, L, TX, KOT, DM, BASLIK } = D, g = S.geo, rects = [];
      const rIv = kesisim([RP], eks, c0); for (const [a, b] of rIv) { REC(a, rad.kAlt, b, zR, 'STA_KALIP'); rects.push([a, rad.kAlt, b, zR]); L([a - 0.1, rad.kAlt - 0.1], [b + 0.1, rad.kAlt - 0.1], 'STA_KALIP'); L([a - 0.1, rad.kAlt - 0.1], [a - 0.1, rad.kAlt], 'STA_KALIP'); L([b + 0.1, rad.kAlt - 0.1], [b + 0.1, rad.kAlt], 'STA_KALIP'); }
      const kes = []; for (const w of W) for (const [a, b] of kesisim(w.loops, eks, c0)) { REC(a, zR, b, w.zt, 'STA_KALIP'); rects.push([a, zR, b, w.zt]); kes.push([a, b, w]); }
      TARA(rects, [], 2.5); kes.sort((p, q) => p[0] - q[0]);
      { const yaz = new Set(); for (const [a, b, w] of kes) { const k2 = w.ad + '|' + Math.round(a * 10); if (yaz.has(k2)) continue; yaz.add(k2); TX([(a + b) / 2, w.zt + mm(3)], w.ad, 2.6, 'C', 'STA_BASLIK'); } }
      for (const d of (M.dosemeler || [])) for (const [a, b] of kesisim([d.pts], eks, c0)) { REC(a, d.zt - d.t, b, d.zt, 'STA_KALIP'); TARA([[a, d.zt - d.t, b, d.zt]], [], 2.5); }
      { const U = q => (eks === 'y' ? q[0] : q[1]), V = q => (eks === 'y' ? q[1] : q[0]); // kirişler: kesilen (kesit) ya da arkada görünen (görünüş); kolonlar
        for (const k of KIR) { const va = V(k.a), vb = V(k.b), z1 = k.zt, z0 = k.zt - k.hb; if ((va - c0) * (vb - c0) <= 0 && Math.abs(va - vb) > 1e-6) { const u = U(k.a) + (U(k.b) - U(k.a)) * (c0 - va) / (vb - va); REC(u - k.bw / 2, z0, u + k.bw / 2, z1, 'STA_KALIP'); TARA([[u - k.bw / 2, z0, u + k.bw / 2, z1]], [], 2.5); TX([u, z0 - mm(3.5)], `${kAdi(k)} ${cmi(k.bw)}/${cmi(k.hb)}`, 2.0, 'C'); }
          else if (Math.abs(va - vb) < 1e-6 && Math.abs(va - c0) < 3) { const u0 = Math.min(U(k.a), U(k.b)), u1 = Math.max(U(k.a), U(k.b)); REC(u0, z0, u1, z1, 'STA_GORUNUS'); TX([(u0 + u1) / 2, z0 + mm(1.2)], `${kAdi(k)} (${cmi(k.bw)}/${cmi(k.hb)}) görünüş`, 1.9, 'C'); } }
        for (const c of KOL) { const v = eks === 'y' ? c.y : c.x, u = eks === 'y' ? c.x : c.y, b = eks === 'y' ? c.bx : c.by, h0 = eks === 'y' ? c.by : c.bx; if (Math.abs(v - c0) > 3) continue; const kes2 = Math.abs(v - c0) <= h0 / 2, zt2 = c.zt != null ? c.zt : zUst; REC(u - b / 2, zR, u + b / 2, zt2, kes2 ? 'STA_KALIP' : 'STA_GORUNUS'); if (kes2) TARA([[u - b / 2, zR, u + b / 2, zt2]], [], 2.5); TX([u, (zR + zt2) / 2], cAdi(c), 2.2, 'C', 'STA_YAZI', 90); } }
      const xa = rIv.length ? rIv[0][0] : X0, xb = rIv.length ? rIv[rIv.length - 1][1] : X1;
      if (g.kSu > zR) for (let i = 0; i + 1 < kes.length; i++) { const a = kes[i][1], b = kes[i + 1][0]; if (b - a > 0.3) { L([a, g.kSu], [b, g.kSu], 'STA_SU'); TX([a + mm(3), g.kSu + mm(1)], '∇ ' + kotS(g.kSu), 2.0, 'L', 'STA_SU'); } }
      if (g.kZemin != null) { L([xa - mm(30), g.kZemin], [xa, g.kZemin], 'STA_ZEMIN'); L([xb, g.kZemin], [xb + mm(30), g.kZemin], 'STA_ZEMIN'); KOT([xa - mm(18), g.kZemin], g.kZemin); }
      if (g.kYAS != null && g.kYAS > rad.kAlt - 3) { L([xb, g.kYAS], [xb + mm(30), g.kYAS], 'STA_SU', 'DASHED'); TX([xb + mm(2), g.kYAS + mm(1)], 'YAS ' + kotS(g.kYAS), 2.0, 'L', 'STA_SU'); }
      KOT([xb + mm(8), rad.kAlt], rad.kAlt, true); KOT([xb + mm(8), zR], zR); KOT([xb + mm(8), zUst], zUst);
      const yD = rad.kAlt - mm(12); let pr = xa; for (const [a, b] of kes) { if (a - pr > 1e-3) DM([pr, yD], [a, yD], 'h', 0, cmi(a - pr)); DM([a, yD], [b, yD], 'h', 0, cmi(b - a)); pr = b; } if (xb - pr > 1e-3) DM([pr, yD], [xb, yD], 'h', 0, cmi(xb - pr)); DM([xa, yD - mm(7)], [xb, yD - mm(7)], 'h', 0, cmi(xb - xa));
      DM([xb + mm(20), rad.kAlt], [xb + mm(20), zR], 'v', 0, cmi(rad.t)); DM([xb + mm(20), zR], [xb + mm(20), zUst], 'v', 0, cmi(zUst - zR));
      BASLIK([(xa + xb) / 2, yD - mm(20)], `${ad}-${ad} KESİTİ`, `Ö: 1/${olcek}`);
      // kesit koordinatı → çizim düzlemi (x/y yatay, kot düşey) — eks 'x' ise y ekseni yataya alınır (ilkel noktaları zaten [s, z])
      return { spec: D.out, kutu: D.kutu() };
    };
    { const a = kesit('A', 'y', ym); B.push({ pafta: 1, ...a }); const b = kesit('B', 'x', xm); B.push({ pafta: 1, ...b }); }

    /* ---- PAFTA 3: TEMEL DONATI DETAYI ---- */
    const temelPoz = [];
    { const D = D0.yeniCizim(Kf), { mm, PL, L, TX, POZ, BASLIK } = D, leg = Math.max(0.05, r2(rad.t - 2 * cR));
      PL(RP, true, 'STA_KALIP'); perdeCiz(D, 'STA_KALIP'); aksCiz(D, true);
      const yonlar = [['M11', 'alt', 'y'], ['M11', 'üst', 'y'], ['M22', 'alt', 'x'], ['M22', 'üst', 'x']]; let no = 1, sira = 0; const SK = sektorler(M.walls, RP);
      for (const [yon, yuz, eks] of yonlar) { // M11 (X yönü donatı) → y = sabit doğrularla kes
        const s = secR(K, yon, yuz); if (!s) continue; const lo = eks === 'y' ? Y0 + cR : X0 + cR, hi = eks === 'y' ? Y1 - cR : X1 - cR, gr = [];
        for (let v = lo; v <= hi + 1e-6; v += s.s) for (const q of ortoAralik(RP, SK, eks, v, cR, P.bindirme(s.F))) gr.push({ v, a: q.a, b: q.b, Ln: q.b - q.a, hA: q.kA, hB: q.kB });
        // boylara göre poz (5 cm)
        const byBoy = new Map(); for (const q of gr) { const k = Math.round(q.Ln * 20) / 20 + '|' + (q.hA ? 1 : 0) + (q.hB ? 1 : 0); if (!byBoy.has(k)) byBoy.set(k, []); byBoy.get(k).push(q); }
        const pozlar = [];
        for (const [key, arr] of [...byBoy.entries()].sort((p, q) => parseFloat(q[0]) - parseFloat(p[0]))) { const Ln = parseFloat(key), fl = key.split('|')[1], lA = fl[0] === '1' ? leg : 0, lB = fl[1] === '1' ? leg : 0; for (const pc of parcaBoy(Ln, s.F, lA || 0, lB || 0)) {
          const kS = pc.sol ? lA : 0, kE = pc.sag ? lB : 0, boy = pc.L + kS + kE, segs = [...(kS ? [{ L: leg, a: yuz === 'üst' ? -90 : 90 }] : []), { L: pc.L, a: 0 }, ...(kE ? [{ L: leg, a: yuz === 'üst' ? -90 : 90 }] : [])];
          const p = pozEkle(temelPoz, { F: s.F, s: s.s, adet: arr.length * pc.n, boy, segs, grup: 'R' + yon + yuz, ad: `${yuz} ${eks === 'y' ? 'X' : 'Y'}` }); if (p && !p.no) p.no = no++; if (p && !pozlar.includes(p)) pozlar.push(p); } }
        // temsili çubuk + dağıtma + etiket (yalnız en uzun stripe; diğer pozlar listede)
        const en = gr[Math.floor(gr.length / 2)]; if (!en) continue; const off = (sira++ % 2) * mm(4) + (yuz === 'üst' ? mm(2) : 0), v = en.v + off;
        const P0 = eks === 'y' ? [en.a, v] : [v, en.a], P1 = eks === 'y' ? [en.b, v] : [v, en.b], hk = mm(2.5) * (yuz === 'üst' ? -1 : 1);
        PL(eks === 'y' ? [[P0[0], P0[1] + hk], P0, P1, [P1[0], P1[1] + hk]] : [[P0[0] + hk, P0[1]], P0, P1, [P1[0] + hk, P1[1]]], false, 'STA_DONATI');
        const sp = pozlar[0], lbl = `${pozlar.map(p => p.no).join(',')}  ${gr.length}Ø${s.F}/${cmi(s.s)} ${yuz}`, mid = [(P0[0] + P1[0]) / 2, (P0[1] + P1[1]) / 2];
        POZ(eks === 'y' ? [mid[0] - mm(25), mid[1] + mm(3)] : [mid[0] - mm(3), mid[1] - mm(25)], String(sp ? sp.no : '')); TX(eks === 'y' ? [mid[0] - mm(21), mid[1] + mm(2)] : [mid[0] + mm(1), mid[1] - mm(22)], lbl, 2.2, 'L', 'STA_YAZI', eks === 'y' ? 0 : 90);
        const dv0 = gr[0].v, dv1 = gr[gr.length - 1].v, du = (eks === 'y' ? (X0 + X1) / 2 : (Y0 + Y1) / 2) + (sira * mm(6)) - mm(9);
        if (eks === 'y') { L([du, dv0], [du, dv1], 'STA_DONATI'); L([du - mm(1.2), dv0], [du + mm(1.2), dv0], 'STA_DONATI'); L([du - mm(1.2), dv1], [du + mm(1.2), dv1], 'STA_DONATI'); } else { L([dv0, du], [dv1, du], 'STA_DONATI'); L([dv0, du - mm(1.2)], [dv0, du + mm(1.2)], 'STA_DONATI'); L([dv1, du - mm(1.2)], [dv1, du + mm(1.2)], 'STA_DONATI'); }
      }
      // ---- yay bölgeleri: ışınsal + halka donatı (alt / üst) ----
      SK.forEach((sk, si) => { const leg2 = leg, A = Math.abs(sk.aci), sg = Math.sign(sk.aci) || 1, Rk = sk.Rout - cR, P2 = (r, a) => [sk.c[0] + Math.cos(a) * r, sk.c[1] + Math.sin(a) * r];
        L(sk.c, P2(sk.Rout, sk.a0), 'STA_GORUNUS', 'DASHED'); L(sk.c, P2(sk.Rout, sk.a0 + sk.aci), 'STA_GORUNUS', 'DASHED');
        [['alt', 0], ['üst', 1]].forEach(([yuz, j]) => { const sH = secR(K, 'M11', yuz) || secR(K, 'M22', yuz), sV = secR(K, 'M22', yuz) || sH; if (!sH) return; const lap = P.bindirme(sH.F), dz = j * mm(2.2);
          // halkalar: r adımı sH.s, yay + iki uçta bindirme (dik ağa); boy 25 cm'lik sınıflara yuvarlanır
          const r0 = Math.max(0.3, sH.s), halkalar = []; for (let r = Rk; r >= r0 - 1e-6; r -= sH.s) halkalar.push(r);
          const sinif = new Map(); for (const r of halkalar) { const boy = Math.ceil(r * A + 2 * lap); /* 1 m'lik sınıflar: sınıftaki en uzun halkaya göre (fazlası dik ağa bindirme olarak uzar) */ if (!sinif.has(boy)) sinif.set(boy, { boy, n: 0, r }); const o = sinif.get(boy); o.n++; o.r = Math.max(o.r, r); }
          const hp = []; for (const o of [...sinif.values()].sort((a, b) => b.boy - a.boy)) for (const pc of parcaBoy(o.boy, sH.F, 0, 0)) { const p = pozEkle(temelPoz, { F: sH.F, s: sH.s, adet: o.n * pc.n, boy: pc.L, segs: [{ L: pc.L, a: 0, R: r2(o.r) }], grup: 'RS' + yuz + 'H', ad: `${yuz} halka (R≤${cmi(o.r)})` }); if (p && !p.no) p.no = no++; if (p && !hp.includes(p)) hp.push(p); }
          // ışınsal: dış uçta kanca; uzun (her 2.) merkeze yakın, kısa yarı yarıçaptan
          const nR = Math.ceil(A * Rk / sV.s) + 1, Luz = r2(Rk - 0.3), Lks = r2(Rk / 2), rp = [];
          for (const [L0, n0, ad] of [[Luz, Math.ceil(nR / 2), 'uzun'], [Lks, Math.floor(nR / 2), 'kısa']]) { if (n0 < 1 || L0 < 0.3) continue; const p = pozEkle(temelPoz, { F: sV.F, s: sV.s, adet: n0, boy: r2(L0 + leg2), segs: [{ L: L0, a: 0 }, { L: leg2, a: yuz === 'üst' ? -90 : 90 }], grup: 'RS' + yuz + 'R', ad: `${yuz} ışınsal ${ad}` }); if (p && !p.no) p.no = no++; if (p && !rp.includes(p)) rp.push(p); }
          // çizim: 3 temsili halka + ışın demeti
          for (const r of [halkalar[0], halkalar[Math.floor(halkalar.length / 2)], halkalar[halkalar.length - 1]].filter(x => x != null)) { const pts = []; for (let k = 0; k <= 40; k++) pts.push(P2(r + dz, sk.a0 + sk.aci * k / 40)); PL(pts, false, 'STA_DONATI'); }
          const am = sk.a0 + sk.aci * (0.30 + 0.25 * j); for (let k = -3; k <= 3; k++) { const a = am + sg * k * sV.s / Rk, uz = (k % 2 === 0); PL([P2(uz ? 0.3 : Rk / 2, a), P2(Rk, a), P2(Rk - (yuz === 'üst' ? 0 : 0), a)], false, 'STA_DONATI'); }
          const lq = P2(Rk * 0.55, sk.a0 + sk.aci * (0.18 + 0.5 * j)), rot = ((Math.atan2(lq[1] - sk.c[1], lq[0] - sk.c[0]) * DEG + 90) % 180 + 180) % 180 - 90;
          if (hp.length) { POZ([lq[0], lq[1]], String(hp[0].no)); TX([lq[0] + mm(3.5), lq[1] - mm(1)], `${hp.map(p => p.no).join(',')} ${halkalar.length}Ø${sH.F}/${cmi(sH.s)} ${yuz} halka (eğri)`, 2.0, 'L', 'STA_YAZI', 0); }
          if (rp.length) { const q2 = P2(Rk * 0.8, am); POZ([q2[0], q2[1] + mm(5)], String(rp[0].no)); TX([q2[0] + mm(3.5), q2[1] + mm(4)], `${rp.map(p => p.no).join(',')} ${nR}Ø${sV.F} ${yuz} ışınsal (dışta ${cmi(sV.s)})`, 2.0, 'L', 'STA_YAZI', 0); void rot; } }); });
      // sehpa
      { const F = 12, h = Math.max(0.1, rad.t - 2 * cR - 0.03), n = Math.ceil(Math.abs(area(RP)) / 1.0); const p = pozEkle(temelPoz, { F, s: 1, adet: n, boy: 0.25 * 2 + h * 2 + 0.5, segs: [{ L: 0.25, a: -35 }, { L: h, a: 90 }, { L: 0.5, a: 0 }, { L: h, a: -90 }, { L: 0.25, a: 35 }], grup: 'sehpa', ad: 'Sehpa' }); if (p) p.no = no++; }
      BASLIK([xm0, Y0 - mm(30)], `${kotS(zR).replace('+', '')} KOTU TEMEL DONATI DETAYI`, `Ö: 1/${olcek}`);
      B.push({ pafta: 2, spec: D.out, kutu: D.kutu() });
      const T = D0.yeniCizim(Kf), r = D0.tablo(T, 0, 0, `${kotS(zR).replace('+', '')} KOTU TEMEL DONATI METRAJI`, temelPoz); B.push({ pafta: 2, spec: T.out, kutu: T.kutu(), kg: r.top });
      // sehpa donatısı kutusu (dikdörtgen hazne paftasındaki gibi)
      { const sh = temelPoz.find(p => p.grup === 'sehpa'); if (sh) { const D = D0.yeniCizim(Kf), { mm, REC, TX, PL } = D, h = Math.max(0.1, rad.t - 2 * cR - 0.03), ay = 0.25, ust = 0.5, ca = Math.cos(Math.PI / 6), sa = Math.sin(Math.PI / 6);
        REC(0, 0, mm(62), mm(52), 'STA_TABLO'); TX([mm(31), mm(46.5)], 'Sehpa Donatısı', 2.6, 'C', 'STA_BASLIK'); TX([mm(31), mm(41.5)], `d = ${cmi(rad.t)} cm`, 2.2, 'C');
        const sc2 = Math.min(mm(17) / Math.max(h, 0.1), mm(38) / (ust + 2 * ay * ca)), xa = mm(31) - ust * sc2 / 2, xb = xa + ust * sc2, yb = mm(19) + ay * sa * sc2, yt = yb + h * sc2;
        PL([[xa - ay * ca * sc2, yb - ay * sa * sc2], [xa, yb], [xa, yt], [xb, yt], [xb, yb], [xb + ay * ca * sc2, yb + ay * sa * sc2]], false, 'STA_DONATI', sh.F, sc2);
        TX([(xa + xb) / 2, yt + mm(1.2)], cmi(ust), 2.0, 'C'); TX([xa - mm(1.2), (yb + yt) / 2], cmi(h), 2.0, 'C', 'STA_YAZI', 90); TX([xb + mm(2.6), (yb + yt) / 2], cmi(h), 2.0, 'C', 'STA_YAZI', 90);
        TX([xa - ay * ca * sc2 / 2 - mm(1.5), yb - ay * sa * sc2 / 2 + mm(0.3)], cmi(ay), 2.0, 'C', 'STA_YAZI', 30); TX([xb + ay * ca * sc2 / 2 + mm(0.8), yb + ay * sa * sc2 / 2 + mm(1.6)], cmi(ay), 2.0, 'C', 'STA_YAZI', 30);
        const ss = Math.round((sh.s || 1) * 100); TX([mm(28), mm(9)], `${sh.adet}Ø${sh.F}/${ss}-${ss}`, 2.4, 'C', 'STA_POZ'); TX([mm(28), mm(4.2)], `L=${cmi(sh.boy)}`, 2.4, 'C', 'STA_POZ'); D.POZ([mm(53), mm(7)], sh.no);
        TX([mm(31), -mm(5)], 'Sehpalar 1,00 × 1,00 m aralıkla, alt ve üst ağ arasına; ayaklar alt ağa bağlanır.', 1.8, 'C');
        B.push({ pafta: 2, spec: D.out, kutu: D.kutu() }); } }
    }

    /* ---- PAFTA 6: DÖŞEME DONATI DETAYI (3B kabuk tasarımından): plan (alt / üst, X / Y), kiriş ve kolonlar, kesit, metraj ---- */
    const dosemePoz = [];
    { const cD = S.mal.cD || 0.025, twM = Math.max(...W.map(w => w.t)), e = Math.max(0.05, twM / 2 - cP); let no = 1;
      const WLs = W.flatMap(w => w.loops), uclarD = (eks, v, a0, b0) => { const iv = kesisim(WLs, eks, v); let a = a0, b = b0; for (const [p, q] of iv) { if (p <= a0 + 0.05 && q >= a0 - twM - 0.05) a = Math.min(a, p); if (q >= b0 - 0.05 && p <= b0 + twM + 0.05) b = Math.max(b, q); } return [a + cP, b - cP]; };
      (M.dosemeler || []).forEach((d, k) => {
        const t = K.tasarim.find(x => x.grup.tur === 'doseme' && (x.eleman === `${d.ad || 'D' + (k + 1)} döşeme`)) || K.tasarim.filter(x => x.grup.tur === 'doseme')[k]; if (!t) return;
        const sec = (yon, yuz) => { const q = t.katman.find(z => z.yon.startsWith(yon) && z.yuz === yuz); return q && q.sec && q.sec.F ? Object.assign({ yeter: !!q.sec.ok }, q.sec) : null; };
        const DP = d.pts, xs = DP.map(q => q[0]), ys = DP.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), leg = Math.max(0.1, r2(d.t - 2 * cD)), dAd = d.ad || 'D' + (k + 1);
        const D = D0.yeniCizim(Kf), { mm, PL, L, TX, POZ, BASLIK } = D; PL(DP, true, 'STA_KALIP'); perdeCiz(D, 'STA_KALIP'); aksCiz(D, true); cerCiz(D, true);
        const uy = []; let sira = 0;
        for (const [yon, yuz, eks] of [['M11', 'alt', 'y'], ['M11', 'üst', 'y'], ['M22', 'alt', 'x'], ['M22', 'üst', 'x']]) {
          const s0 = sec(yon, yuz); if (!s0) { uy.push(`${yuz} ${eks === 'y' ? 'X' : 'Y'}: donatı bulunamadı — KESİT YETERSİZ`); continue; } if (!s0.yeter) uy.push(`${yuz} ${eks === 'y' ? 'X' : 'Y'} Ø${s0.F}/${cmi(s0.s)}: çatlak / kesit sınırı aşılıyor — kalınlığı artırın`);
          const lo = (eks === 'y' ? y0 : x0) + cD + 0.03, hi = (eks === 'y' ? y1 : x1) - cD - 0.03, gr = [];
          for (let v = lo; v <= hi + 1e-6; v += s0.s) for (const [a0, b0] of kesisim([DP], eks, v)) { const [a, b] = uclarD(eks, v, a0, b0); gr.push({ v, a, b, Ln: b - a }); }
          const byBoy = new Map(); for (const q of gr) { const kk = Math.round(q.Ln * 20) / 20; if (!byBoy.has(kk)) byBoy.set(kk, []); byBoy.get(kk).push(q); }
          const pozlar = [];
          for (const [Ln, arr] of [...byBoy.entries()].sort((p, q) => q[0] - p[0])) for (const pc of parcaBoy(Ln, s0.F, leg, leg)) { const kS = pc.sol ? leg : 0, kE = pc.sag ? leg : 0, a90 = yuz === 'üst' ? -90 : 90;
            const p = pozEkle(dosemePoz, { F: s0.F, s: s0.s, adet: arr.length * pc.n, boy: pc.L + kS + kE, segs: [...(kS ? [{ L: leg, a: a90 }] : []), { L: pc.L, a: 0 }, ...(kE ? [{ L: leg, a: a90 }] : [])], grup: 'D' + k + yon + yuz, ad: `${dAd} ${yuz} ${eks === 'y' ? 'X' : 'Y'}` }); if (p && !p.no) p.no = no++; if (p && !pozlar.includes(p)) pozlar.push(p); }
          const en = gr[Math.floor(gr.length * (yuz === 'alt' ? 0.35 : 0.65))]; if (!en) continue; const v = en.v, hk = mm(2.5) * (yuz === 'üst' ? -1 : 1);
          const P0 = eks === 'y' ? [en.a, v] : [v, en.a], P1 = eks === 'y' ? [en.b, v] : [v, en.b];
          PL(eks === 'y' ? [[P0[0], P0[1] + hk], P0, P1, [P1[0], P1[1] + hk]] : [[P0[0] + hk, P0[1]], P0, P1, [P1[0] + hk, P1[1]]], false, 'STA_DONATI');
          const mid = [(P0[0] + P1[0]) / 2 + (eks === 'y' ? (sira % 2 ? mm(20) : -mm(20)) : 0), (P0[1] + P1[1]) / 2 + (eks === 'x' ? (sira % 2 ? mm(20) : -mm(20)) : 0)], lbl = `${pozlar.map(p => p.no).join(',')}  ${gr.length}Ø${s0.F}/${cmi(s0.s)} ${yuz}${s0.yeter ? '' : ' (YETERSİZ)'}`;
          POZ(eks === 'y' ? [mid[0] - mm(4), mid[1] + mm(3.5)] : [mid[0] - mm(3.5), mid[1] - mm(4)], String(pozlar[0] ? pozlar[0].no : '')); TX(eks === 'y' ? [mid[0], mid[1] + mm(2.5)] : [mid[0] + mm(1), mid[1]], lbl, 2.2, 'L', s0.yeter ? 'STA_POZ' : 'STA_UYARI', eks === 'y' ? 0 : 90);
          TX(eks === 'y' ? [mid[0], mid[1] - mm(1.5)] : [mid[0] - mm(2.6), mid[1]], `L=${pozlar.map(p => cmi(p.boy)).join(' / ')}`, 2.0, 'L', 'STA_POZ', eks === 'y' ? 0 : 90);
          // dağıtma çizgisi
          const dv0 = gr[0].v, dv1 = gr[gr.length - 1].v, du = (eks === 'y' ? x0 + (x1 - x0) * (0.18 + 0.1 * sira) : y0 + (y1 - y0) * (0.18 + 0.1 * sira));
          if (eks === 'y') { L([du, dv0], [du, dv1], 'STA_DONATI'); L([du - mm(1.2), dv0], [du + mm(1.2), dv0], 'STA_DONATI'); L([du - mm(1.2), dv1], [du + mm(1.2), dv1], 'STA_DONATI'); } else { L([dv0, du], [dv1, du], 'STA_DONATI'); L([dv0, du - mm(1.2)], [dv0, du + mm(1.2)], 'STA_DONATI'); L([dv1, du - mm(1.2)], [dv1, du + mm(1.2)], 'STA_DONATI'); }
          sira++; }
        uy.forEach((u, i) => TX([x0, y0 - mm(12) - i * mm(4)], `⚠ ${dAd} ${u}`, 2.2, 'L', 'STA_UYARI'));
        TX([x0, y0 - mm(12) - uy.length * mm(4)], `Alt ve üst donatı döşeme boyunca tek parça (12 m'yi aşan çubuklar bindirmeli), uçlar perde içinde ${cmi(leg)} cm gönyeli. Kirişler ara mesnettir; üst ağ kiriş üstlerinden kesintisiz geçer. Paspayı ${cmi(cD)} cm.`, 2.0, 'L');
        BASLIK([(x0 + x1) / 2, y0 - mm(30) - uy.length * mm(4)], `${kotS(d.zt).replace('+', '')} KOTU ${dAd} DÖŞEME DONATI PLANI`, `Ö: 1/${olcek}`);
        B.push({ pafta: 5, spec: D.out, kutu: D.kutu() });
        // kesit (y boyunca, x ortasından): döşeme + perdeler + kirişler + kolonlar, alt / üst ağ
        { const E = D0.yeniCizim(Kf), c0 = [0.5, 0.3, 0.7, 0.25].map(f2 => x0 + (x1 - x0) * f2).find(v => !KIR.some(kk => Math.abs(kk.a[0] - kk.b[0]) < 1e-6 && Math.abs(kk.a[0] - v) < kk.bw + 0.3)) || (x0 + x1) / 2, ivs = kesisim([DP], 'x', c0); if (ivs.length) { const u0 = ivs[0][0], u1 = ivs[ivs.length - 1][1], zt = d.zt, zb = d.zt - d.t;
          const [ua, ub] = uclarD('x', c0, u0, u1); E.REC(ua - cP, zb, ub + cP, zt, 'STA_KALIP');
          for (const [p, q] of kesisim(WLs, 'x', c0)) if (q >= u0 - twM - 0.05 && p <= u1 + twM + 0.05) { E.REC(p, zb - 0.8, q, zb, 'STA_KALIP'); E.L([p - mm(2), zb - 0.8], [q + mm(2), zb - 0.8], 'STA_KALIP'); }
          for (const kk of KIR) { const va = kk.a[0], vb = kk.b[0]; if ((va - c0) * (vb - c0) <= 0 && Math.abs(va - vb) > 1e-6) { const u = kk.a[1] + (kk.b[1] - kk.a[1]) * (c0 - va) / (vb - va); E.REC(u - kk.bw / 2, kk.zt - kk.hb, u + kk.bw / 2, Math.min(zb, kk.zt), 'STA_KALIP'); E.TX([u, kk.zt - kk.hb - mm(3.5)], `${kAdi(kk)} ${cmi(kk.bw)}/${cmi(kk.hb)}`, 2.0, 'C'); } }
          const sA = sec('M22', 'alt'), sU = sec('M22', 'üst'), sAx = sec('M11', 'alt'), sUx = sec('M11', 'üst');
          if (sA) { const z = zb + cD; E.PL([[ua, z + leg], [ua, z], [ub, z], [ub, z + leg]], false, 'STA_DONATI'); const p = dosemePoz.find(q => q.grup === 'D' + k + 'M22alt'); E.POZ([(u0 + u1) / 2 - mm(30), z - mm(5)], String(p ? p.no : '')); E.TX([(u0 + u1) / 2 - mm(26), z - mm(6)], `Ø${sA.F}/${cmi(sA.s)} alt (Y)`, 2.0, 'L', 'STA_POZ'); }
          if (sU) { const z = zt - cD; E.PL([[ua, z - leg], [ua, z], [ub, z], [ub, z - leg]], false, 'STA_DONATI'); const p = dosemePoz.find(q => q.grup === 'D' + k + 'M22üst'); E.POZ([(u0 + u1) / 2 + mm(10), z + mm(5)], String(p ? p.no : '')); E.TX([(u0 + u1) / 2 + mm(14), z + mm(4)], `Ø${sU.F}/${cmi(sU.s)} üst (Y)`, 2.0, 'L', 'STA_POZ'); }
          for (const [s2, z, ad2] of [[sAx, zb + cD + 0.012, 'alt (X)'], [sUx, zt - cD - 0.012, 'üst (X)']]) if (s2) { for (let u = u0 + 0.05; u < u1; u += s2.s) E.CI([u, z], mm(0.45), 'STA_DONATI_KESIT'); }
          E.DM([ub + cP, zb], [ub + cP, zt], 'v', 6, cmi(d.t)); let pr = u0; const ms = KIR.map(kk => { const va = kk.a[0], vb = kk.b[0]; return (va - c0) * (vb - c0) <= 0 && Math.abs(va - vb) > 1e-6 ? kk.a[1] + (kk.b[1] - kk.a[1]) * (c0 - va) / (vb - va) : null; }).filter(v => v != null).sort((a, b) => a - b);
          for (const m of [...ms, u1]) { E.DM([pr, zt], [m, zt], 'h', 8, cmi(m - pr)); pr = m; }
          E.KOT([ub + cP + mm(14), zt], zt);
          E.BASLIK([(u0 + u1) / 2, zb - 0.8 - mm(12)], `${dAd} DÖŞEME KESİTİ (x = ${cmi(c0 - x0)} cm)`, `Ö: 1/${olcek}`); B.push({ pafta: 5, spec: E.out, kutu: E.kutu() }); } }
      });
      if (dosemePoz.length) { const T = D0.yeniCizim(Kf), r = D0.tablo(T, 0, 0, 'DÖŞEME DONATI METRAJI', dosemePoz); B.push({ pafta: 5, spec: T.out, kutu: T.kutu(), kg: r.top }); } }

    /* ---- PAFTA 4: PERDE DONATI DETAYI ---- */
    const perdePoz = []; let pno = 100; const GLB = new Map();
    { const D = D0.yeniCizim(Kf), { mm, PL, L, TX, POZ, BASLIK } = D;
      PL(RP, true, 'STA_KALIP'); perdeCiz(D, 'STA_KALIP'); aksCiz(D, true);
      for (const w of W) {
        const Hn = w.zt - zR, Lv = r2((w.zt - cP) - (rad.kAlt + cR)), legV = Math.max(0.30, r2(rad.t - 2 * cR) * 0.0 + 0.30), uc = w.kapali ? 0 : r2(w.t - 2 * cP); const kAB = [w.bagA || w.kapali ? 0 : uc, w.bagB || w.kapali ? 0 : uc];
        for (const [yuz, isr] of [[w.tip === 'dis' ? 'dış' : '1. yüz', 1], [w.tip === 'dis' ? 'iç' : '2. yüz', -1]]) {
          const sH = secim(K, w.wi, 'M11', yuz), sV = secim(K, w.wi, 'M22', yuz); if (!sH || !sV) { const m = w.pts[Math.floor(w.pts.length / 3)]; TX([m[0], m[1] - isr * mm(4)], `${w.ad} ${yuz}: ${!sH ? 'yatay' : ''}${!sH && !sV ? ' + ' : ''}${!sV ? 'düşey' : ''} donatı bulunamadı — KESİT YETERSİZ`, 2.2, 'L', 'STA_UYARI'); } if (!sH && !sV) continue;
          // yüz yönü: dış perdede "dış" yüz = içerden uzak taraf (sol / sağ ofsetlerden içeri bakmayan)
          const pip = (q, poly) => { let c2 = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c2 = !c2; } return c2; };
          const IC = ICd || RP, solIc = w.tip === 'dis' ? pip(w.sol[Math.floor(w.sol.length / 2)], IC) : true;
          const isaret = w.tip === 'dis' ? ((yuz === 'iç') === solIc ? 1 : -1) : isr, F0 = (sH || sV).F / 1000, dOf = isaret * (w.t / 2 - cP - F0 / 2);
          const bar = ofset(w.pts, dOf, w.kapali), Lf = plen(bar, w.kapali);
          // yatay (halka) donatı
          if (sH) { const n = Math.floor((Hn - 0.10) / sH.s) + 1, kanca = w.kapali ? 0 : uc;
            /* parçalı perdede yatay çubuklar parça sınırında kesilmez: ana perde (halka) boyunca 12 m'lik çubuklar, eklerde bindirme */
            const gk = w.wi + '|' + yuz, G0 = w.ana && GLB.get(gk), G = w.ana ? (G0 || (() => { const gb = ofset(w.ana.pts, dOf, w.ana.kapali), g2 = { bar: gb, kap: w.ana.kapali, duz: ortaDuzen(gb, w.ana.kapali, sH.F, [uc, uc], w.ana.parca, null), ilk: w.ad }; GLB.set(gk, g2); return g2; })()) : null;
            const duz = G ? G.duz : ortaDuzen(bar, w.kapali, sH.F, kAB, w.parca, null); (w._yatay = w._yatay || {})[yuz] = { duz, G, F: sH.F, s: sH.s, n, isaret, dOf };
            if (!G0) for (const pc of duz) { const p = pozEkle(perdePoz, { F: sH.F, s: sH.s, adet: n, boy: pc.boy, segs: [...(pc.kS ? [{ L: pc.kS, a: 90 }] : []), { L: pc.L, a: 0, ...(pc.R ? { R: pc.R, yay: pc.yay } : {}) }, ...(pc.kB ? [{ L: pc.kB, a: 90 }] : [])], grup: 'W' + w.wi + yuz + 'H', ad: `${w.ad} ${yuz} yatay${pc.R ? ' eğri R=' + cmi(pc.R) : ''}` }); if (p && !p.no) p.no = ++pno; pc.no = p ? p.no : ''; }
            PL(bar, w.kapali, 'STA_DONATI');
            const pz = perdePoz.filter(p => p.grup === 'W' + w.wi + yuz + 'H').map(p => p.no), m = bar[Math.floor(bar.length * (isaret > 0 ? 0.3 : 0.7))];
            POZ([m[0], m[1] + isaret * mm(6)], String(pz[0] || '')); TX([m[0] + mm(3.5), m[1] + isaret * mm(6) - mm(1)], `${pz.join(',')} Ø${sH.F}/${cmi(sH.s)} ${yuz} yatay${w.parca.some(q => q.tip === 'yay') ? ' (eğri)' : ''}`, 2.0, 'L', 'STA_YAZI');
            // yaylarda ışınsal R yazıları (çubuk yarıçapı)
            for (const p of w.parca) if (p.tip === 'yay') { const k0 = Math.floor(p.pts.length * (isaret > 0 ? 0.25 : 0.75)), m2 = p.pts[k0], u = [(m2[0] - p.c[0]) / p.R, (m2[1] - p.c[1]) / p.R], Rb = p.R + (dOf * (p.aci > 0 ? -1 : 1));
              const q = [p.c[0] + u[0] * Rb, p.c[1] + u[1] * Rb]; L(p.c, q, 'STA_OLCU'); TX([p.c[0] + u[0] * Rb * 0.5, p.c[1] + u[1] * Rb * 0.5], 'R' + cmi(Math.abs(Rb)), 1.9, 'C', 'STA_OLCU', Math.atan2(u[1], u[0]) * DEG); } }
          // düşey donatı (filiz + gövde)
          if (sV) { const n = Math.floor(Lf / sV.s) + 1, legT = 0.30;
            void Lv; for (const pc of dusParca(rad.kAlt + cR, zR, w.zt, cP, sV.F, legV, 0.30).parca) { const p = pozEkle(perdePoz, { F: sV.F, s: sV.s, adet: n, boy: pc.boy, segs: [...(pc.legA ? [{ L: pc.legA, a: -90 }] : []), { L: pc.L, a: 0 }, ...(pc.legB ? [{ L: pc.legB, a: -90 }] : [])], grup: 'W' + w.wi + yuz + 'V', ad: `${w.ad} ${yuz} düşey ${pc.ad}` }); if (p && !p.no) p.no = ++pno; pc.no = p && p.no; }
            const pz = perdePoz.filter(p => p.grup === 'W' + w.wi + yuz + 'V').map(p => p.no), m = bar[Math.floor(bar.length * (isaret > 0 ? 0.45 : 0.55))];
            for (let k = -2; k <= 2; k++) { const j = Math.max(0, Math.min(bar.length - 1, Math.floor(bar.length * (isaret > 0 ? 0.45 : 0.55)) + k)); D.CI(bar[j], mm(0.6), 'STA_DONATI'); }
            TX([m[0] + mm(3.5), m[1] + isaret * mm(11) - mm(1)], `${pz.join(',')} ${n}Ø${sV.F}/${cmi(sV.s)} ${yuz} düşey`, 2.0, 'L', 'STA_YAZI'); }
        }
      }
      BASLIK([xm0, Y0 - mm(30)], `${kotS(zR).replace('+', '')} – ${kotS(zUst).replace('+', '')} PERDE DONATI DETAYI`, `Ö: 1/${olcek}`);
      B.push({ pafta: 3, spec: D.out, kutu: D.kutu() });
    }
    // tipik perde kesitleri (perde grubu başına: dış / iç × kalınlık)
    { const grp = new Map(); for (const w of W) { const k = w.tip + '|' + Math.round(w.t * 1000) + '|' + Math.round((w.tt != null ? w.tt : w.t) * 1000); if (!grp.has(k)) grp.set(k, []); grp.get(k).push(w); }
      const olD = Math.min(olcek || 50, 25), f = (olcek || 50) / olD; // detay ölçeği 1/25 (ya da pafta ölçeği daha büyükse o)
      for (const ws of grp.values()) { const w = ws[0], D = D0.yeniCizim(Kf), D1 = D0.yeniCizim(Kf), { mm, TX, KOT, BASLIK } = D, zt0 = Math.max(...ws.map(q => q.zt));
        const Sx = q => [q[0] * f, (q[1] - rad.kAlt) * f], REC = (a, b2, c2, d2, ly) => D.REC(a * f, (b2 - rad.kAlt) * f, c2 * f, (d2 - rad.kAlt) * f, ly), L = (a, b2, ly) => D.L(Sx(a), Sx(b2), ly), PL = (pts, cl, ly) => D.PL(pts.map(Sx), cl, ly), CI = (cc, r, ly) => D.CI(Sx(cc), r, ly), TARA = (rs, h2, a2) => D.TARA(rs.map(r => [r[0] * f, (r[1] - rad.kAlt) * f, r[2] * f, (r[3] - rad.kAlt) * f]), h2, a2);
        const TXs = (q, ...a) => TX(Sx(q), ...a), KOTs = (q, v, tt) => KOT(Sx(q), v, tt); void D1;
        const t = w.t, zt = zt0;
        const yA = w.tip === 'dis' ? 'dış' : '1. yüz', yB = w.tip === 'dis' ? 'iç' : '2. yüz', sVa = secim(K, w.wi, 'M22', yA), sVb = secim(K, w.wi, 'M22', yB), sHa = secim(K, w.wi, 'M11', yA), sHb = secim(K, w.wi, 'M11', yB);
        // eğimli perde (alt / üst kalınlığı farklı): kesit yamuk; x = A yüzünün (dış / 1. yüz) alt noktasından içeri
        const pipK = (q2, poly) => { let c2 = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > q2[1]) !== (b[1] > q2[1]) && q2[0] < (b[0] - a[0]) * (q2[1] - a[1]) / (b[1] - a[1]) + a[0]) c2 = !c2; } return c2; };
        const aSol = w.tip === 'dis' ? !pipK(w.sol[Math.floor(w.sol.length / 2)], ICd || RP) : true, xOf = off => (aSol ? t / 2 - off : off + t / 2);
        const xAt = w.tt != null ? xOf(aSol ? w.solUst : w.sagUst) : 0, xBt = w.tt != null ? xOf(aSol ? w.sagUst : w.solUst) : t, ttop = xBt - xAt;
        // radye: dış perdede dış tarafta gerçek taşma (modelden), iç tarafta 1,00 m gösterilip kırık çizgiyle kesilir
        const toe = (() => { if (w.tip !== 'dis') return null; const F2 = aSol ? w.sol : w.sag, m = F2[Math.floor(F2.length / 2)]; let d = 1e9; for (let i = 0; i < RP.length; i++) { const a = RP[i], b = RP[(i + 1) % RP.length], dd = [b[0] - a[0], b[1] - a[1]], L2 = dd[0] * dd[0] + dd[1] * dd[1] || 1, u = Math.max(0, Math.min(1, ((m[0] - a[0]) * dd[0] + (m[1] - a[1]) * dd[1]) / L2)); d = Math.min(d, Math.hypot(a[0] + dd[0] * u - m[0], a[1] + dd[1] * u - m[1])); } return d < 3 ? r2(d) : null; })();
        const rx0 = toe != null ? -toe : Math.min(0, xAt) - 1.0, rx1 = Math.max(t, xBt) + 1.0; REC(rx0, rad.kAlt, rx1, zR, 'STA_KALIP');
        { const kx = rx1, zm = (rad.kAlt + zR) / 2, k = mm(1.5) / f; PL([[kx, rad.kAlt - k], [kx, zm - k], [kx + k, zm - k * 0.3], [kx - k, zm + k * 0.3], [kx, zm + k], [kx, zR + k]], false, 'STA_KALIP'); if (toe == null) PL([[rx0, rad.kAlt - k], [rx0, zm - k], [rx0 + k, zm - k * 0.3], [rx0 - k, zm + k * 0.3], [rx0, zm + k], [rx0, zR + k]], false, 'STA_KALIP'); } PL([[0, zR], [t, zR], [xBt, zt], [xAt, zt]], true, 'STA_KALIP'); void TARA; // perde kesitinde tarama yok (donatı okunsun)
        // (perde gövdesi taraması kaldırıldı)
        const zb = rad.kAlt + cR, zu = zt - cP, lz = (xb2, xt2, z) => xb2 + (xt2 - xb2) * (z - zR) / Math.max(0.1, zt - zR), xa = cP, xb = t - cP, xaU = lz(cP, xAt + cP, zu), xbU = lz(t - cP, xBt - cP, zu);
        // düşey çubuklar parça parça (filiz / gövde / derzde bindirme); bindirmeler okunsun diye filiz paspayı yönünde hafif içeri kaydırılır
        const DP = (s0) => dusParca(zb, zR, zt, cP, s0.F, 0.30, Math.min(0.3, ttop - 2 * cP));
        for (const [s0, sgn] of [[sVa, 1], [sVb, -1]]) { if (!s0) continue; const dp = DP(s0), xf = z => (sgn > 0 ? lz(cP, xAt + cP, Math.max(z, zR)) : lz(t - cP, xBt - cP, Math.max(z, zR)));
          dp.parca.forEach((pc, j) => { const kay = (j % 2 ? 1 : 0) * sgn * mm(0.9) / f, pts = []; if (pc.legA) pts.push([xf(pc.z0) - sgn * pc.legA, pc.z0]); pts.push([xf(pc.z0) + kay, pc.z0]); if (pc.z0 < zR && pc.z1 > zR) pts.push([xf(zR) + kay, zR]); pts.push([xf(pc.z1) + kay, pc.z1]); if (pc.legB) pts.push([xf(pc.z1) + kay + sgn * pc.legB, pc.z1]); PL(pts, false, 'STA_DONATI'); }); }
        { const dp = DP(sVa || sVb || { F: 12 }); if (dp.derz != null) { const zd = dp.derz, x0d = lz(0, xAt, zd), x1d = lz(t, xBt, zd); L([x0d - 0.15, zd], [x1d + 0.15, zd], 'STA_SU'); REC((x0d + x1d) / 2 - 0.01, zd - 0.1, (x0d + x1d) / 2 + 0.01, zd + 0.1, 'STA_BANT'); TXs([x1d + mm(18) / f, zd + mm(1) / f], `İnşaat derzi ${kotS(zd)} (su tutucu bant)`, 2.0, 'L', 'STA_SU'); } }
        for (const [s0, A2] of [[sHa, 1], [sHb, -1]]) if (s0) for (let z = zR + 0.05; z < zt - 0.03; z += s0.s) CI([A2 > 0 ? lz(cP, xAt + cP, z) + 0.012 : lz(t - cP, xBt - cP, z) - 0.012, z], mm(0.6), 'STA_DONATI');
        // ÖLÇÜLER (örnek paftadaki gibi): üstte perde kalınlığı + aksa uzaklıklar; altta taşma | perde; sağda radye ve perde yüksekliği
        const xAks = t / 2; // perde ekseni (alt)
        D.DM(Sx([xAt, zt]), Sx([xBt, zt]), 'h', 14, cmi(ttop)); if (Math.abs(xAks - xAt) > 0.005 && Math.abs(xBt - xAks) > 0.005) { D.DM(Sx([xAt, zt]), Sx([xAks, zt]), 'h', 8, cmi(xAks - xAt)); D.DM(Sx([xAks, zt]), Sx([xBt, zt]), 'h', 8, cmi(xBt - xAks)); }
        { const yb = rad.kAlt; if (toe != null) D.DM(Sx([rx0, yb]), Sx([0, yb]), 'h', -10, cmi(toe)); D.DM(Sx([0, yb]), Sx([t, yb]), 'h', -10, cmi(t)); if (toe != null) D.DM(Sx([rx0, yb]), Sx([t, yb]), 'h', -16, cmi(t + toe)); }
        { const xd = rx1 + mm(28) / f; D.DM(Sx([xd, rad.kAlt]), Sx([xd, zR]), 'v', 0, cmi(rad.t)); D.DM(Sx([xd, zR]), Sx([xd, zt]), 'v', 0, cmi(zt - zR)); D.DM(Sx([xd + mm(7) / f, rad.kAlt]), Sx([xd + mm(7) / f, zt]), 'v', 0, cmi(zt - rad.kAlt)); }
        // AKSLAR: düz perdeler için plan aksları (harf / rakam), yay perdede perde adı
        { const adlar = []; for (const q of ws) { if (q.ptip === 'duz' && q.pts.length >= 2) { const a = q.pts[0], b = q.pts[q.pts.length - 1], Lq = Math.hypot(b[0] - a[0], b[1] - a[1]); if (Math.abs(b[1] - a[1]) < 0.02 * Lq) { const j = ay.findIndex(v => Math.abs(v - (a[1] + b[1]) / 2) < 0.06); if (j >= 0) adlar.push(harf(j)); } else if (Math.abs(b[0] - a[0]) < 0.02 * Lq) { const j = ax.findIndex(v => Math.abs(v - (a[0] + b[0]) / 2) < 0.06); if (j >= 0) adlar.push(String(j + 1)); } } }
          const ad2 = [...new Set(adlar)].slice(0, 4), zt2 = zt + mm(24) / f; L([xAks, zt + mm(2) / f], [xAks, zt2], 'STA_AKS'); L([xAks, zR - mm(2) / f], [xAks, rad.kAlt - mm(20) / f], 'STA_AKS');
          (ad2.length ? ad2 : []).forEach((n, i) => D.BALON(Sx([xAks + (i - (ad2.length - 1) / 2) * mm(11) / f, zt2 + mm(5) / f]), n)); }
        REC(t / 2 - 0.01, zR - 0.08, t / 2 + 0.01, zR + 0.12, 'STA_BANT'); TXs([t / 2 + mm(4), zR + 0.05], 'Su tutucu bant (PVC 20 cm)', 1.9, 'L');
        const pz = (gk) => [...new Set(perdePoz.filter(p => ws.some(q => p.grup.startsWith('W' + q.wi + gk))).map(p => p.no))].join(',');
        // etiketler: çubuktan çıkan oklu kılavuz çizgisi + yazı (perdenin hemen yanında, tarama dışında)
        // örnek paftadaki gibi: çubukta ok, eğik kılavuz, yatay çizgi üstünde "Ø16/15", sonunda poz dairesi
        const ok = (uc, yon, dx, metin, no, egik) => { const u = mm(1.4) / f, tip = uc, kir = [uc[0] + yon * dx, uc[1] + (egik || 0)], son = [kir[0] + yon * mm(16) / f, kir[1]];
          void u; D.out.push({ k: 'LD', pts: [tip, kir, son].map(Sx), asz: mm(2.2), ly: 'STA_YAZI' }); // gerçek kılavuz (AutoCAD LEADER)
          TXs([kir[0] + yon * mm(1) / f + (yon < 0 ? -mm(15) / f : 0), kir[1] + mm(0.8) / f], metin, 2.2, 'L', 'STA_POZ'); if (no) D.POZ(Sx([son[0] + yon * mm(3.2) / f, son[1]]), String(no).split(',')[0]); };
        const xL = Math.min(0, xAt) - 0.12, xR = Math.max(t, xBt) + 0.12, zH = zR + (zt - zR) * 0.35, zH2 = zR + (zt - zR) * 0.6, zD1 = zR + (zt - zR) * 0.8, zD2 = zR + (zt - zR) * 0.15;
        const eg = mm(5) / f;
        if (sVa) { const x = lz(cP, xAt + cP, zH); ok([x, zH], -1, x - xL + 0.05, `Ø${sVa.F}/${cmi(sVa.s)}`, pz(yA + 'V'), eg); }
        if (sVb) { const x = lz(t - cP, xBt - cP, zH2); ok([x, zH2], 1, xR - x + 0.25, `Ø${sVb.F}/${cmi(sVb.s)}`, pz(yB + 'V'), eg); }
        if (sHa) { const zq = zR + 0.05 + Math.round((zD1 - zR - 0.05) / sHa.s) * sHa.s, x = lz(cP, xAt + cP, zq) + 0.012; ok([x, zq], -1, x - xL + 0.05, `Ø${sHa.F}/${cmi(sHa.s)}`, pz(yA + 'H'), eg); }
        if (sHb) { const zq = zR + 0.05 + Math.round((zD2 - zR - 0.05) / sHb.s) * sHb.s, x = lz(t - cP, xBt - cP, zq) - 0.012; ok([x, zq], 1, xR - x + 0.25, `Ø${sHb.F}/${cmi(sHb.s)}`, pz(yB + 'H'), eg); }
        // perde adı (P1 …) kılavuzla
        { const zq = zR + (zt - zR) * 0.25, x = lz(0, xAt, zq); L([x, zq], [x - 0.25, zq - 0.15], 'STA_YAZI'); TXs([x - 0.27, zq - 0.17 - mm(1) / f], ws.map(q => q.ad).join(', '), 2.6, 'R', 'STA_BASLIK'); }
        // ADET GÖSTERİMİ: perdenin hemen sağında dağıtma çizgisi + "2*nØF/s" (örnekteki 1 ve 4 numaralı demirler gibi)
        { const xd = Math.max(t, xBt) + 0.1, z0d = zR + 0.05, z1d = zt - 0.05, k = mm(1.2) / f; L([xd, z0d], [xd, z1d], 'STA_DONATI'); for (const zq of [z0d, z1d]) L([xd - k, zq - k], [xd + k, zq + k], 'STA_DONATI');
          const nA = sHa ? Math.floor((z1d - z0d) / sHa.s) + 1 : 0, nB = sHb ? Math.floor((z1d - z0d) / sHb.s) + 1 : 0, ayni = sHa && sHb && sHa.F === sHb.F && sHa.s === sHb.s;
          const yaz = ayni ? [`2*${nA}Ø${sHa.F}/${cmi(sHa.s)} (iki yüz yatay)`] : [sHa ? `${nA}Ø${sHa.F}/${cmi(sHa.s)} ${yA} yatay` : '', sHb ? `${nB}Ø${sHb.F}/${cmi(sHb.s)} ${yB} yatay` : ''].filter(Boolean);
          yaz.forEach((m, i) => TXs([xd + mm(2.6 + i * 3.2) / f, (z0d + z1d) / 2], m, 2.2, 'C', 'STA_POZ', 90));
          const nos = [...new Set([pz(yA + 'H'), pz(yB + 'H')].join(',').split(',').filter(Boolean))].slice(0, 3); nos.forEach((n, i) => D.POZ(Sx([xd + mm(4) / f, z0d + (z1d - z0d) * 0.18 + i * mm(6) / f]), n)); }
        KOTs([rx1 + mm(4) / f, zt], zt); KOTs([rx1 + mm(4) / f, zR], zR); KOTs([rx1 + mm(4) / f, rad.kAlt], rad.kAlt, true); L([rx0, rad.kAlt - 0.1], [rx1, rad.kAlt - 0.1], 'STA_KALIP');
        BASLIK([t / 2 * f, -mm(30)], `${ws.map(q => q.ad).join(', ')} PERDE KESİTİ (t=${w.tt != null ? 'alt ' + cmi(t) + ' / üst ' + cmi(w.tt) : cmi(t)})`, `Ö: 1/${olD}`);
        B.push({ pafta: 3, spec: D.out, kutu: D.kutu() }); }
      const T = D0.yeniCizim(Kf), r = D0.tablo(T, 0, 0, 'PERDE DONATI METRAJI', perdePoz.map(p => Object.assign({}, p, { no: p.no }))); B.push({ pafta: 3, spec: T.out, kutu: T.kutu(), kg: r.top });
    }
    P._kabukSon = { W, M, th, ICd, RP, rad, zR, Kf, olcek: olcek || 50, ax: ax.slice(), ay: ay.slice(), harf };
    return { B, temelPoz, perdePoz, dosemePoz };
  };

  /* ================= PAFTA DÜZENİ (statik-pafta-dsi.js ile aynı) ================= */
  P.kabukPaftalar = (K, S, olcek, rp, pr) => {
    const Kf = (olcek || 50) / 1000, mm = v => v * Kf, D0 = P._dsi, { B } = P.kabukBloklar(K, S, olcek);
    const ad = (pr.ad || 'YAPI').toLocaleUpperCase('tr'), kod = rp.kod || '', zR = S.kabuk.radye.kAlt + S.kabuk.radye.t;
    const adlar = ['KALIP PLANI', 'KESİTLER', `${kotS(zR).replace('+', '')} KOTU TEMEL DONATI DETAYI`, 'PERDE DONATI DETAYI', 'DONATI PERSPEKTİFİ', 'DÖŞEME DONATI DETAYI'];
    const PH = 594, MARJ = { l: 20, r: 10, t: 10, b: 10 }, SUT = 185, IC = PH - MARJ.t - MARJ.b - 8, out = [];
    for (const pi of [0, 1, 2, 5, 3, 4]) { // döşeme paftası temelden sonra
      const bl = B.filter(b => b.pafta === pi); if (!bl.length) continue;
      let cols = [], cur = { w: 0, h: 0, items: [] };
      for (const b of bl) { const w = (b.kutu[2] - b.kutu[0]) / Kf + 12, h = (b.kutu[3] - b.kutu[1]) / Kf + 10; if (cur.items.length && cur.h + h > IC) { cols.push(cur); cur = { w: 0, h: 0, items: [] }; } cur.items.push({ b, w, h, y: cur.h }); cur.h += h; cur.w = Math.max(cur.w, w); }
      cols.push(cur);
      /* uzun pafta bölünür: çizim sütunları A0 boyuna (1189 mm) sığacak kadar; fazlası aynı adla (1/n, 2/n …) yeni paftaya */
      const MAXW = 1189 - MARJ.l - 8 - SUT - MARJ.r - 6, parts = [[]]; { let w = 0; for (const c of cols) { if (parts[parts.length - 1].length && w + c.w > MAXW) { parts.push([]); w = 0; } parts[parts.length - 1].push(c); w += c.w; } }
      parts.forEach((cols, ci) => { const pAd = adlar[pi] + (parts.length > 1 ? ` (${ci + 1}/${parts.length})` : '');
      const cizW = cols.reduce((s, c) => s + c.w, 0), PW = Math.max(420, MARJ.l + 8 + cizW + SUT + MARJ.r + 6), D = D0.yeniCizim(Kf); let spec = [];
      const fx0 = mm(MARJ.l), fy0 = mm(MARJ.b), fx1 = mm(PW - MARJ.r), fy1 = mm(PH - MARJ.t); D.REC(fx0, fy0, fx1, fy1, 'STA_CERCEVE'); D.REC(0, 0, mm(PW), mm(PH), 'STA_TABLO');
      const sx = fx1 - mm(SUT); D.L([sx, fy0], [sx, fy1], 'STA_CERCEVE');
      let cx = fx0 + mm(6); for (const col of cols) { for (const it of col.items) { const b = it.b, tx = cx + (mm(col.w) - (b.kutu[2] - b.kutu[0])) / 2 - b.kutu[0], ty = fy1 - mm(6 + it.y) - (b.kutu[3] - b.kutu[1]) - b.kutu[1]; spec = spec.concat(D0.kaydir(b.spec, tx, ty)); } cx += mm(col.w); }
      const info = { idare: rp.idare || 'DEVLET SU İŞLERİ GENEL MÜDÜRLÜĞÜ\nİÇMESUYU VE ATIKSU DAİRESİ BAŞKANLIĞI', sehir: rp.idareSehir || 'ANKARA', bolge: rp.bolge || '', bolgeSehir: rp.bolgeSehir || '', proje: rp.projeAd || (pr.tesis || '').toLocaleUpperCase('tr'), kod, yapi: ad, pafta: pAd, yapan: rp.yapan || pr.hazirlayan || '', yapanUnv: rp.yapanUnv || '', cizen: rp.cizen || '', cizenUnv: rp.cizenUnv || '', kontrol: rp.kontrol || pr.kontrol || '', kontrolUnv: rp.kontrolUnv || '', tarih: pr.tarih || '', arsiv: rp.arsiv || '', olcek: `1/${olcek}`, yuklenici: rp.yuklenici || '', resimNo: (rp.resimNo || (kod ? kod + '-' : '') + 'S') + '-' + String(out.length + 1).padStart(2, '0') };
      D0.antet(D, sx + mm(2), fy0 + mm(2), mm(SUT - 4), mm(P.ANTET_YUK), info);
      if (D0.notSutunu) D0.notSutunu(D, sx + mm(4), fy1 - mm(2), SUT - 8, { S, MAL: K.MAL }, rp);
      spec = spec.concat(D.out); out.push({ ad: pAd, spec, pw: PW, ph: PH, olcek: olcek || 50, resimNo: info.resimNo }); });
    }
    return out;
  };

  /* ================= DÜĞMELER ================= */
  const kabukMu = () => typeof S !== 'undefined' && S && S.mod === 'kabuk' && S.kabuk && window._KR;
  const KAT = () => Object.assign({}, P.KATMANLAR_DSI || P.KATMANLAR || {}, { STA_SU: { c: 5, lt: 'CONTINUOUS', lw: 25 }, STA_ZEMIN: { c: 32, lt: 'CONTINUOUS', lw: 25 }, STA_BANT: { c: 6, lt: 'CONTINUOUS', lw: 35 } });
  const gonder = () => {
    const K = window._KR, rp = Object.assign({}, S.rap || {}), paf = P.kabukPaftalar(K, S, S.tas.olcek || 50, rp, S.proj);
    if (typeof RC !== 'undefined' && RC && P.cercevePaftalar) { try { paf.push(...P.cercevePaftalar(RC, S.tas.olcek || 50)); } catch (er) { console.error('çerçeve paftaları', er); } } // kolon / kiriş paftaları
    const payload = { t: Date.now(), ad: S.proj.ad, tesis: S.proj.tesis, hazirlayan: S.proj.hazirlayan, no: S.proj.no, olcek: S.tas.olcek || 50, katman: KAT(), spec: paf[0].spec, paftalar: paf, dsi: true };
    try { localStorage.setItem('aritmacad.statik.cizim', JSON.stringify(payload)); } catch (e) { alert('Çizim verisi aktarılamadı: ' + e.message); return; }
    let direkt = false; try { if (window.opener && window.opener.C && window.opener.C.cmd) { window.opener.C.cmd.run('STATIKCIZ'); window.opener.focus(); direkt = true; } } catch (e) { }
    $('#pMsg').innerHTML = `<div class="msg info">${paf.length} statik pafta ArıtmaCAD'e gönderildi (${paf.map(p => p.ad).join(' · ')}) — alt sekmelerde <b>Statik</b> grubunda${direkt ? '' : '; açılmazsa komut satırına <b>STATIKCIZ</b> yazın'}.</div>`;
  };
  const dxf = () => { const K = window._KR, paf = P.kabukPaftalar(K, S, S.tas.olcek || 50, Object.assign({}, S.rap || {}), S.proj), Kf = (S.tas.olcek || 50) / 1000; let x = 0, sp = [];
    if (typeof RC !== 'undefined' && RC && P.cercevePaftalar) { try { paf.push(...P.cercevePaftalar(RC, S.tas.olcek || 50).map(p => { const b = P.specKutu(p.spec); return b ? Object.assign({}, p, { spec: P._dsi.kaydir(p.spec, -b[0], -b[1]), pw: (b[2] - b[0]) / Kf }) : p; })); } catch (er) { console.error(er); } }
    for (const p of paf) { sp = sp.concat(P._dsi.kaydir(p.spec, x, 0)); x += (p.pw + 30) * Kf; }
    const bytes = P.dxf(sp, KAT()), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/dxf' })); a.download = (S.proj.ad || 'statik').replace(/[^\wçğıöşüÇĞİÖŞÜ-]+/g, '_') + '_oval_statik_paftalar.dxf'; a.click(); };
  P.kabukCizimGonder = gonder; P.kabukDxf = dxf;
  const sar = (id, f) => { const b = $(id); if (!b) return; const f0 = b.onclick; b.onclick = function () { if (kabukMu()) return f(); return f0 && f0.apply(this, arguments); }; };
  setTimeout(() => { sar('#bCiz', gonder); sar('#bDxf', dxf); }, 0);
  // hesap bitince kabuk modunda "Çizime aktar" ve "DXF indir" açılsın
  const h0 = window.hepsi; window.hepsi = function () { const r = h0.apply(this, arguments); try { if (kabukMu()) ['#bCiz', '#bDxf'].forEach(s => { const b = $(s); if (b) b.disabled = false; }); } catch (e) { } return r; };
})();

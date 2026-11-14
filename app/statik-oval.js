/* ArıtmaCAD — OVAL / DAİRESEL / SERBEST PLANLI SU HAZNESİ STATİK HESABI (ayrı modül; statik.js, statik-model.js'e dokunmaz)
   Statik hesap penceresi yalnız X / Y doğrultulu perdelerden oluşan DİKDÖRTGEN hazneyi çözer. Planda yay (yarım daire uçlu
   oval havuz, dairesel havuz) ya da eğik perde varsa:
     • STATIKMODEL artık dikdörtgen modeli göndermez, açıkça uyarır ve eğik / yay perdeleri kırmızı işaretler (STA_OVAL_UYARI);
     • STATIKOVAL (otomatik çağrılır) perdeleri DÜZ ve YAY parçalarına ayırır ve hesaplar:
         - yay perdeler : tabanı radyeye ankastre silindirik kabuk (Timoshenko kabuk denklemi D·w'''' + (E·t/R²)·w = p,
                          sonlu elemanla çözülür) → halka çekmesi N = E·t·w/R ve düşey moment;
         - düz dış perdeler : konsol (üstte döşeme varsa üstü mesnetli) + komşu yaydan gelen eksenel çekme N = p·R;
         - iç perdeler (orta perde, yönlendirme perdeleri) : bir tarafı dolu, öbür tarafı boş konsol (iki yüz aynı);
         - radye : zemin gerilmesi, perde tabanı momenti, boşken net yukarı zemin basıncı (basitleştirilmiş);
       Yük durumları: (1) dolu havuz, dışta toprak yok (sızdırmazlık deneyi) · (2) boş havuz, dışta toprak itkisi (K0) + sürşarj.
       Donatı: TS 500 taşıma gücü (1.6 su / toprak) ve su yapısı kullanım gerilmesi sınırı (eğilme σs, eksenel çekme σs) — büyüğü.
     • Sonuç: ayrı pencerede rapor (yazdırılabilir / PDF), planda eleman etiketleri (STA_OVAL katmanı). */
(function (C) {
  'use strict';
  const M = C.M, r3 = v => Math.round(v * 1000) / 1000, LY_E = 'STA_OVAL', LY_U = 'STA_OVAL_UYARI', DEG = 180 / Math.PI;
  let SEC = null, BOLGE = null; // STATIKMODEL sırasında: seçim (varsa yalnız seçilenler) ve hesaplanacak yapının bölgesi (birden çok radye varsa)
  const vis = e => C.layer(e.layer).on && !(typeof e.gv === 'string') && (!SEC || SEC.has(e)) && (!BOLGE || bolgede(e));
  const bolgede = e => { const bb = C.bbox ? C.bbox(e) : null; if (!bb) return true; const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2; return cx >= BOLGE[0] && cx <= BOLGE[2] && cy >= BOLGE[1] && cy <= BOLGE[3]; };
  const anaPerdeler = () => C.doc.ents.filter(vis).filter(e => e.type === 'perde' && (e.malz || 'beton') === 'beton' && !e.temel && !e.parapet && !e.kicker);

  /* ---------- perde eksen çizgisi (statik-model.js ile aynı hesap) ---------- */
  const eksen = e => {
    const I = C._ins; if (!I || !I.faceOffs || !I.segFrames) return null;
    const F = I.faceOffs(e), c = (F.lB + F.rB) / 2, sf = I.segFrames(e); if (!sf.length) return null;
    // eksen = her parçanın ötelenmiş doğrusu; köşe = komşu ötelenmiş doğruların kesişimi (sol / sağ hizalı perdede köşeler kaymasın, plan yamulmasın)
    const son = sf[sf.length - 1], kapali = !son.openE && sf.length > 2, n = sf.length;
    const ot = (s, q) => [q[0] + s.nn[0] * c, q[1] + s.nn[1] * c];
    const kes = (s1, s2) => { const p1 = ot(s1, s1.a), d1 = [s1.b[0] - s1.a[0], s1.b[1] - s1.a[1]], p2 = ot(s2, s2.a), d2 = [s2.b[0] - s2.a[0], s2.b[1] - s2.a[1]], cr = d1[0] * d2[1] - d1[1] * d2[0];
      if (Math.abs(cr) < 1e-9 * Math.hypot(...d1) * Math.hypot(...d2) + 1e-12) return p2; const t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / cr; return [p1[0] + d1[0] * t, p1[1] + d1[1] * t]; };
    const pts = sf.map((s, i) => i === 0 && !kapali ? ot(s, s.a) : kes(sf[(i - 1 + n) % n], s));
    if (!kapali) pts.push(ot(son, son.b));
    const tt = F.tt != null ? F.tt : (F.lT - F.rT); // eğimli (alt / üst kalınlığı farklı) perde: yüzlerin üst ötelemesi eksene göre
    return { pts, kapali, t: F.tb, z0: +e.z0 || 0, zt: (+e.z0 || 0) + (+e.h || 3), ...(Math.abs(tt - F.tb) > 0.004 ? { tt, solUst: F.lT - c, sagUst: F.rT - c } : {}) };
  };
  const egikMi = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) return false; return Math.abs(b[1] - a[1]) / L > 0.02 && Math.abs(b[0] - a[0]) / L > 0.02; };

  /* katı (İt/Çek) duvarlar: dik, ince-uzun, ≥ 1.2 m yüksek → perde gibi */
  const katiDuvarlar = () => { const A = C._katiAnaliz; if (!A) return []; const out = [];
    for (const k of C.doc.ents.filter(vis).filter(e => e.type === 'kati')) { try { const a = A(k); if (a && a.bant && a.h > 1.2 && a.bant.t > 0.08 && a.bant.t < 1.0) out.push({ e: k, pts: a.bant.pts.map(p => [p[0], p[1]]), kapali: !!a.bant.closed, t: a.bant.t, z0: a.z0, zt: a.z0 + a.h, kati: true }); } catch (er) { } }
    return out; };
  const katiRadye = () => { const A = C._katiAnaliz; if (!A) return null; let best = null;
    for (const k of C.doc.ents.filter(vis).filter(e => e.type === 'kati')) { try { const a = A(k); if (a && !a.bant && a.h <= 1.5 && a.A > 4 && (!best || a.A > best.A)) best = { pts: a.P, t: a.h, zt: a.z0 + a.h, A: a.A, kati: true }; } catch (er) { } }
    return best; };
  const duvarlar = () => { const out = []; for (const e of anaPerdeler()) { const x = eksen(e); if (x) out.push(Object.assign({ e }, x)); } return out.concat(katiDuvarlar()); };

  /* ---------- daire uydurma (Kåsa) ---------- */
  const daire = P => {
    const n = P.length, mx = P.reduce((s, p) => s + p[0], 0) / n, my = P.reduce((s, p) => s + p[1], 0) / n;
    let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
    for (const p of P) { const u = p[0] - mx, v = p[1] - my; suu += u * u; svv += v * v; suv += u * v; suuu += u * u * u; svvv += v * v * v; suvv += u * v * v; svuu += v * u * u; }
    const det = suu * svv - suv * suv; if (Math.abs(det) < 1e-12) return null;
    const b1 = (suuu + suvv) / 2, b2 = (svvv + svuu) / 2, uc = (b1 * svv - b2 * suv) / det, vc = (b2 * suu - b1 * suv) / det;
    const c = [mx + uc, my + vc], R = P.reduce((s, p) => s + Math.hypot(p[0] - c[0], p[1] - c[1]), 0) / n;
    const hata = Math.max(...P.map(p => Math.abs(Math.hypot(p[0] - c[0], p[1] - c[1]) - R)));
    return { c, R, hata };
  };
  const donus = (a, b, c) => { const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]]; return Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]); };

  /* ---------- polyline → düz ve yay parçaları ---------- */
  const parcala = (pts0, kapali) => {
    let pts = pts0.slice();
    if (kapali) { // başlangıcı en uzun kenarın başına al (yay ek yerinde bölünmesin)
      let bi = 0, bl = -1; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > bl) { bl = l; bi = i; } }
      pts = pts.slice(bi).concat(pts.slice(0, bi)); pts.push(pts[0]);
    }
    // ardışık eşdoğrultulu kenarları birleştir
    const P = [pts[0]]; for (let i = 1; i < pts.length; i++) { if (P.length >= 2 && i < pts.length && Math.abs(donus(P[P.length - 2], P[P.length - 1], pts[i])) < 1.5 / DEG) P[P.length - 1] = pts[i]; else P.push(pts[i]); }
    const n = P.length - 1, out = []; let i = 0;
    const yayOk = (i0, j) => { // kenarlar i0..j (noktalar i0..j+1)
      let isaret = 0; for (let k = i0 + 1; k <= j; k++) { const d = donus(P[k - 1], P[k], P[k + 1]); if (Math.abs(d) < 1 / DEG || Math.abs(d) > 50 / DEG) return null; const s = Math.sign(d); if (isaret && s !== isaret) return null; isaret = s; }
      const ls = []; for (let k = i0; k <= j; k++) ls.push(Math.hypot(P[k + 1][0] - P[k][0], P[k + 1][1] - P[k][1])); if (Math.max(...ls) > 2.5 * Math.min(...ls)) return null; // yay kenarları benzer boyda (uzun düz perde yaya katılmasın)
      const f = daire(P.slice(i0, j + 2)); if (!f || f.R > 150 || f.hata > Math.max(0.02, 0.004 * f.R)) return null; return f; };
    while (i < n) {
      let j = i + 2, f = null;
      if (j < n) { f = yayOk(i, j); if (f) { while (j + 1 < n) { const g = yayOk(i, j + 1); if (!g) break; j++; f = g; } } }
      if (f) {
        const Q = P.slice(i, j + 2); let aci = 0; for (let k = 1; k < Q.length; k++) { const a1 = Math.atan2(Q[k - 1][1] - f.c[1], Q[k - 1][0] - f.c[0]), a2 = Math.atan2(Q[k][1] - f.c[1], Q[k][0] - f.c[0]); let d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; aci += d; }
        out.push({ tip: 'yay', pts: Q, R: f.R, c: f.c, aci: Math.abs(aci), L: f.R * Math.abs(aci) }); i = j + 1;
      } else { const a = P[i], b = P[i + 1]; out.push({ tip: 'duz', pts: [a, b], L: Math.hypot(b[0] - a[0], b[1] - a[1]) }); i++; }
    }
    // kısa düz parça iki yayın arasında / yayın içinde kalırsa (örnekleme kusuru) yaya kat
    return out;
  };

  /* ---------- dışbükey kabuk ---------- */
  const kabuk = pts => { const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
  const kabukMesafe = (H, p) => { let m = Infinity; for (let i = 0; i < H.length; i++) m = Math.min(m, M.segDist ? M.segDist(p, H[i], H[(i + 1) % H.length]) : (() => { const a = H[i], b = H[(i + 1) % H.length], d = [b[0] - a[0], b[1] - a[1]], L2 = d[0] * d[0] + d[1] * d[1] || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / L2)); return Math.hypot(a[0] + d[0] * t - p[0], a[1] + d[1] * t - p[1]); })()); return m; };
  const enDar = H => { let m = Infinity; for (let i = 0; i < H.length; i++) { const a = H[i], b = H[(i + 1) % H.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue; const n = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L]; let w = 0; for (const q of H) w = Math.max(w, Math.abs((q[0] - a[0]) * n[0] + (q[1] - a[1]) * n[1])); m = Math.min(m, w); } return m; };

  /* ---------- hazne: model okuma ---------- */
  const modelOku = () => {
    const D = duvarlar(); if (!D.length) throw new Error('Modelde betonarme perde (ya da dik katı duvar) yok.');
    const radyeler = C.doc.ents.filter(vis).filter(e => e.type === 'plak' && e.kind === 'radye');
    const parca = [], uyar = []; let egikVar = false;
    const nk = D.filter(x => x.kati).length; if (nk) uyar.push(`${nk} katı (İt/Çek) duvar perde değil — bu hesapta perde gibi alındı. Paftalar ve donatı için İnşaat › Katıdan eleman ile perdeye dönüştürün.`);
    for (const x of D) {
      const e = x.e, n = x.kapali ? x.pts.length : x.pts.length - 1;
      for (let i = 0; i < n; i++) if (egikMi(x.pts[i], x.pts[(i + 1) % x.pts.length])) egikVar = true;
      parcala(x.pts, x.kapali).forEach(p => parca.push(Object.assign(p, { e, t: x.t, z0: x.z0, zt: x.zt, no: e.no || null })));
    }
    const tumN = parca.flatMap(p => p.pts), H = kabuk(tumN), tmax = Math.max(...parca.map(p => p.t));
    for (const p of parca) { const m = p.tip === 'yay' ? p.pts[Math.floor(p.pts.length / 2)] : [(p.pts[0][0] + p.pts[1][0]) / 2, (p.pts[0][1] + p.pts[1][1]) / 2]; p.m = m; p.dis = kabukMesafe(H, m) < tmax * 0.6 + 0.05; }
    // dış yay → komşu düz dış perdeye eksenel çekme (aynı uçtan bağlı)
    const yakin = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < tmax + 0.05;
    for (const p of parca.filter(q => q.tip === 'duz' && q.dis)) { const R = parca.filter(q => q.tip === 'yay' && q.dis && [q.pts[0], q.pts[q.pts.length - 1]].some(u => yakin(u, p.pts[0]) || yakin(u, p.pts[1]))).map(q => q.R); p.Rkomsu = R.length ? Math.max(...R) : 0; }
    // iç perdeler: uçları başka perdeye bağlı mı? (iki ucu bağlı = bölme; serbest uçlu = su iki yanda aynı seviyede)
    const segs = parca.flatMap(p => p.pts.slice(0, -1).map((a, i) => ({ a, b: p.pts[i + 1], e: p.e, t: p.t })));
    const sd = (q, a, b) => { const d = [b[0] - a[0], b[1] - a[1]], L2 = d[0] * d[0] + d[1] * d[1] || 1, u = Math.max(0, Math.min(1, ((q[0] - a[0]) * d[0] + (q[1] - a[1]) * d[1]) / L2)); return Math.hypot(a[0] + d[0] * u - q[0], a[1] + d[1] * u - q[1]); };
    const bagli = (q, e, t) => segs.some(s => s.e !== e && sd(q, s.a, s.b) < (t + s.t) / 2 + 0.05);
    // bölme: iki ucu da dış perdeye ya da başka bir bölmeye bağlı iç perde (bölmeler zinciri ardışık bulunur)
    const icE = [...new Set(parca.filter(p => !p.dis).map(p => p.e))], disE = new Set(parca.filter(p => p.dis).map(p => p.e)), bolE = new Set();
    const ucBagli = (q, e, t) => segs.some(s => s.e !== e && (disE.has(s.e) || bolE.has(s.e)) && sd(q, s.a, s.b) < (t + s.t) / 2 + 0.05);
    for (let tur = 0, degisti = true; degisti && tur < 10; tur++) { degisti = false; for (const e of icE) { if (bolE.has(e)) continue; const x = D.find(d => d.e === e); if (!x) continue;
      if (x.kapali || (ucBagli(x.pts[0], e, x.t) && ucBagli(x.pts[x.pts.length - 1], e, x.t))) { bolE.add(e); degisti = true; } } }
    parca.forEach(p => { p.bolme = !p.dis && bolE.has(p.e); }); void bagli;
    // radye
    let rad = null; if (radyeler.length) { rad = radyeler.slice().sort((a, b) => Math.abs(M.polyArea(b.pts)) - Math.abs(M.polyArea(a.pts)))[0]; } else { rad = katiRadye(); if (rad) uyar.push('Radye katı (İt/Çek) elemandan okundu.'); }
    const hr = rad ? +rad.t || 0.4 : 0.4, zR = rad ? +rad.zt || 0 : Math.min(...parca.map(p => p.z0)), Arad = rad ? Math.abs(M.polyArea(rad.pts)) : Math.abs(M.polyArea(H));
    if (!rad) uyar.push('Radye bulunamadı: 40 cm, perde altında kabul edildi.');
    const kUst = Math.max(...parca.map(p => p.zt));
    // üst döşeme (kabuk ağırlık merkezini örten, perde üstünde)
    const cx = H.reduce((s, q) => s + q[0], 0) / H.length, cy = H.reduce((s, q) => s + q[1], 0) / H.length;
    const ust = C.doc.ents.filter(vis).find(e => e.type === 'plak' && e.kind !== 'radye' && Array.isArray(e.pts) && Math.abs((+e.zt || 0) - (+e.t || 0.2) - kUst) < 0.3 + (+e.t || 0.2) && C.pointInPoly && C.pointInPoly([cx, cy], e.pts));
    return { parca, H, rad, hr, zR, Arad, kUst, ust, uyar, egikVar, Aic: Math.abs(M.polyArea(H)), genislik: enDar(H) };
  };

  /* ---------- kabuk / konsol şeridi: sonlu eleman (Euler-Bernoulli + Winkler halka yayı) ---------- */
  // H: yükseklik, t: kalınlık, R: yarıçap (0 = düz), p(x): basınç (+ dışa doğru), ust: 'serbest' | 'mesnet', alt: 'ankastre' | 'mafsal'
  const coz = (H, t, R, p, E, ust, alt) => {
    const ne = 80, h = H / ne, nu = 0.2, D = E * t * t * t / (12 * (1 - nu * nu)), ks = R > 0 ? E * t / (R * R) : 0, N = 2 * (ne + 1);
    const K = Array.from({ length: N }, () => new Float64Array(N)), F = new Float64Array(N);
    const k = D / (h * h * h), ke = [[12, 6 * h, -12, 6 * h], [6 * h, 4 * h * h, -6 * h, 2 * h * h], [-12, -6 * h, 12, -6 * h], [6 * h, 2 * h * h, -6 * h, 4 * h * h]];
    for (let e = 0; e < ne; e++) { const d = [2 * e, 2 * e + 1, 2 * e + 2, 2 * e + 3]; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) K[d[a]][d[b]] += k * ke[a][b];
      // tutarlı yük (doğrusal yaklaşık) ve yay
      const x0 = e * h, x1 = x0 + h, p0 = p(x0), p1 = p(x1);
      F[d[0]] += h * (7 * p0 + 3 * p1) / 20; F[d[1]] += h * h * (3 * p0 + 2 * p1) / 60; F[d[2]] += h * (3 * p0 + 7 * p1) / 20; F[d[3]] -= h * h * (2 * p0 + 3 * p1) / 60;
      if (ks) { const kk = ks * h / 420, km = [[156, 22 * h, 54, -13 * h], [22 * h, 4 * h * h, 13 * h, -3 * h * h], [54, 13 * h, 156, -22 * h], [-13 * h, -3 * h * h, -22 * h, 4 * h * h]]; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) K[d[a]][d[b]] += kk * km[a][b]; } }
    const sabit = new Set([0]); if (alt !== 'mafsal') sabit.add(1); if (ust === 'mesnet') sabit.add(2 * ne);
    for (const s of sabit) { for (let j = 0; j < N; j++) { K[s][j] = 0; K[j][s] = 0; } K[s][s] = 1; F[s] = 0; }
    // Gauss
    const A = K.map((r, i) => { const x = Array.from(r); x.push(F[i]); return x; });
    for (let c = 0; c < N; c++) { let pv = c; for (let r = c + 1; r < N; r++) if (Math.abs(A[r][c]) > Math.abs(A[pv][c])) pv = r; [A[c], A[pv]] = [A[pv], A[c]]; const d = A[c][c]; if (Math.abs(d) < 1e-30) continue;
      for (let r = c + 1; r < N; r++) { const f = A[r][c] / d; if (!f) continue; for (let j = c; j <= N; j++) A[r][j] -= f * A[c][j]; } }
    const u = new Float64Array(N); for (let r = N - 1; r >= 0; r--) { let s = A[r][N]; for (let j = r + 1; j < N; j++) s -= A[r][j] * u[j]; u[r] = A[r][r] ? s / A[r][r] : 0; }
    // düğüm büyüklükleri: w, M (+ = iç yüzde çekme: dışa doğru basınçta ankastre tabanda pozitif), N halka (+ çekme), V
    const x = [], w = [], Mi = [], Nh = [], V = [];
    const w2 = (e, ucu) => { const w0 = u[2 * e], t0 = u[2 * e + 1], w1 = u[2 * e + 2], t1 = u[2 * e + 3]; return ucu ? (6 * w0 + 2 * h * t0 - 6 * w1 + 4 * h * t1) / (h * h) : (-6 * w0 - 4 * h * t0 + 6 * w1 - 2 * h * t1) / (h * h); };
    for (let i = 0; i <= ne; i++) { x.push(i * h); w.push(u[2 * i]); const c = i === 0 ? w2(0, 0) : i === ne ? w2(ne - 1, 1) : (w2(i - 1, 1) + w2(i, 0)) / 2; Mi.push(D * c); Nh.push(R > 0 ? E * t * u[2 * i] / R : 0); }
    for (let i = 0; i < ne; i++) V.push(D * (12 * u[2 * i] + 6 * h * u[2 * i + 1] - 12 * u[2 * i + 2] + 6 * h * u[2 * i + 3]) / (h * h * h));
    // ankastre tabanda tutarlı uç momenti dahil
    const V0 = Math.abs((-3 * Mi[0] + 4 * Mi[1] - Mi[2]) / (2 * h)); // taban kesmesi = dM/dx
    return { x, w, M: Mi, N: Nh, V0, Vmax: Math.max(...V.map(Math.abs)) };
  };

  /* ---------- donatı ---------- */
  const CAP = [12, 14, 16, 18, 20, 22, 25], ARA = [10, 12.5, 15, 17.5, 20];
  const sec = (As) => { // cm²/m → en ekonomik Ø/s (s ≥ 10 cm)
    let best = null; for (const d of CAP) for (const s of ARA) { const a = Math.PI * d * d / 400 * 100 / s; if (a + 1e-9 >= As && (!best || a < best.a - 1e-9 || (Math.abs(a - best.a) < 0.3 && s > best.s))) best = { d, s, a }; }
    return best ? { ...best, t: `Ø${best.d}/${String(best.s).replace('.', ',')}`, a: r3(best.a) } : { d: 25, s: 10, a: 49.1, t: 'Ø25/10 (YETERSİZ!)' }; };
  const egilmeAs = (Mk, t, P) => { // Mk: kullanım momenti kNm/m → cm²/m (tek yüz)
    const d = t - P.pas - 0.008, Mu = 1.6 * Math.abs(Mk), fcd = P.fck / 1.5 * 1000, fyd = P.fyk / 1.15 * 1000, disk = d * d - 2 * Mu / (0.85 * fcd);
    const asU = disk < 0 ? Infinity : 0.85 * fcd * (d - Math.sqrt(disk)) / fyd * 1e4, asS = Math.abs(Mk) / (P.sigE * 1000 * 0.87 * d) * 1e4;
    return { asU, asS, as: Math.max(asU, asS), yetersiz: disk < 0 }; };
  const cekmeAs = (Nk, P) => { const n = Math.max(0, Nk); return { asU: 1.6 * n / (P.fyk / 1.15 * 1000) * 1e4, asS: n / (P.sigN * 1000) * 1e4, get as() { return Math.max(this.asU, this.asS); } }; };
  const asMin = (t, P) => P.rhoMin * 100 * t * 100 / 2; // tek yüz, cm²/m (ρ toplam kesit için, iki yüze eşit)
  const kesmeKontrol = (V, t, P) => { const d = t - P.pas - 0.008, Vcr = 0.65 * 0.35 * Math.sqrt(P.fck) / 1.5 * 1000 * d; return { Vu: 1.6 * V, Vcr, ok: 1.6 * V <= Vcr }; };

  /* ---------- hesap ---------- */
  const hesapla = (G, P) => {
    const Ec = (3250 * Math.sqrt(P.fck) + 14000) * 1000, K0 = 1 - Math.sin(P.phi / DEG), sonuc = [], uyar = G.uyar.slice();
    const ustD = G.ust ? 'mesnet' : 'serbest';
    if (G.ust) uyar.push(`Üst döşeme ${G.ust.no || ''} perdelerin üstünde: perde üst ucu mesnetli kabul edildi.`);
    for (const p of G.parca) {
      const Hn = Math.max(0.3, p.zt - Math.max(p.z0, G.zR)), Hw = Math.min(Hn, P.hw > 0 ? P.hw : Hn), Hs = Math.max(0, Math.min(Hn, P.zZemin - G.zR));
      const dengeli = !p.dis && (P.icYuk === 'DENGE' || (P.icYuk === 'OTO' && !p.bolme)), dH = Math.min(Hw, Math.max(0, P.dH));
      const su = dengeli ? (x => x < Hw ? P.gw * Math.min(dH, Hw - x) : 0) : (x => x < Hw ? P.gw * (Hw - x) : 0), top = x => x < Hs ? -K0 * (P.gs * (Hs - x) + P.q) : 0;
      const R = p.tip === 'yay' && p.dis ? p.R : 0, alt = P.taban === 'M' ? 'mafsal' : 'ankastre';
      const d1 = coz(Hn, p.t, R, su, Ec, ustD, alt), d2 = p.dis && Hs > 0 ? coz(Hn, p.t, R, top, Ec, ustD, alt) : null;
      const Mic = Math.max(0, ...d1.M, ...(d2 ? d2.M : [])), Mdis = Math.max(0, ...d1.M.map(v => -v), ...(d2 ? d2.M.map(v => -v) : []));
      // yatay donatı: yay → halka çekmesi; düz dış → komşu yaydan eksenel çekme p·R
      const Nx = d1.x.map((x, i) => R > 0 ? d1.N[i] : (p.dis && p.Rkomsu ? su(x) * p.Rkomsu : 0));
      const bolge = [[0, Hn / 3, 'alt'], [Hn / 3, 2 * Hn / 3, 'orta'], [2 * Hn / 3, Hn + 1e-9, 'üst']].map(([a, b, ad]) => { const Nm = Math.max(0, ...Nx.filter((_, i) => d1.x[i] >= a - 1e-9 && d1.x[i] <= b)); const c = cekmeAs(Nm, P), yuz = Math.max(c.as / 2, asMin(p.t, P)); return { ad, z: [r3(a), r3(Math.min(b, Hn))], N: r3(Nm), as: r3(yuz), sec: sec(yuz) }; });
      const Nmin = Math.min(0, ...(d2 ? d2.N : [0])), sigC = -Nmin / p.t / 1000; // halka basıncı MPa
      const ic = p.dis ? egilmeAs(Mic, p.t, P) : egilmeAs(Math.max(Mic, Mdis), p.t, P), dis = p.dis ? egilmeAs(Mdis, p.t, P) : ic;
      const icAs = Math.max(ic.as, asMin(p.t, P)), disAs = Math.max(dis.as, asMin(p.t, P)), ks = kesmeKontrol(Math.max(d1.V0, d2 ? d2.V0 : 0), p.t, P);
      const ad = (p.no ? p.no + ' ' : '') + (p.tip === 'yay' ? `yay R=${r3(p.R)} m (${Math.round(p.aci * DEG)}°)` : `düz L=${r3(p.L)} m`);
      if (ic.yetersiz || dis.yetersiz) uyar.push(`${ad}: kesit yetersiz (perde kalınlığını artırın).`);
      if (!ks.ok) uyar.push(`${ad}: taban kesmesi Vd=${r3(ks.Vu)} > Vcr=${r3(ks.Vcr)} kN/m — kalınlığı artırın ya da guse yapın.`);
      if (sigC > 0.45 * P.fck) uyar.push(`${ad}: halka basınç gerilmesi ${r3(sigC)} MPa yüksek.`);
      if (p.tip === 'duz' && p.dis && p.L / Hn < 2) uyar.push(`${ad}: L/H = ${r3(p.L / Hn)} < 2 — plak davranışı (köşe etkisi) ihmal edildi, konsol kabulü güvenli tarafta.`);
      sonuc.push({ p, ad, tur: p.tip === 'yay' ? (p.dis ? 'Dış yay perde (silindirik kabuk)' : (dengeli ? `İç yay perde (iki yanda su, seviye farkı ${dH} m)` : 'İç yay perde (bölme: bir taraf dolu, konsol)')) : (p.dis ? (p.Rkomsu ? 'Dış düz perde + yaydan eksenel çekme' : 'Dış düz perde (konsol)') : (dengeli ? `İç perde (iki yanda su, seviye farkı ${dH} m)` : 'İç perde (bölme: bir taraf dolu)')),
        Hn: r3(Hn), Hw: r3(Hw), Hs: r3(Hs), t: p.t, R: R ? r3(R) : 0, d1, d2, Mic: r3(Mic), Mdis: r3(Mdis), Nmax: r3(Math.max(0, ...Nx)), sigC: r3(sigC), V: r3(Math.max(d1.V0, d2 ? d2.V0 : 0)), kesme: ks,
        dusey: { ic: { as: r3(icAs), asU: r3(ic.asU), asS: r3(ic.asS), sec: sec(icAs) }, dis: { as: r3(disAs), asU: r3(dis.asU), asS: r3(dis.asS), sec: sec(disAs) } }, yatay: bolge });
    }
    // radye (basitleştirilmiş)
    const Wp = G.parca.reduce((s, p) => s + p.L * p.t * Math.max(0.3, p.zt - Math.max(p.z0, G.zR)) * 25, 0), Wr = G.Arad * G.hr * 25;
    const Hw0 = Math.max(...sonuc.map(s => s.Hw)), Ww = Math.max(0, G.Aic - G.parca.reduce((s, p) => s + p.L * p.t, 0)) * Hw0 * P.gw, Wd = G.ust ? Math.abs(M.polyArea(G.ust.pts)) * (+G.ust.t || 0.2) * 25 + Math.abs(M.polyArea(G.ust.pts)) * 5 : 0;
    const qz = (Wp + Wr + Ww + Wd) / G.Arad, qnet = (Wp + Wd) / G.Arad, Lr = Math.max(0.5, G.genislik - Math.max(...G.parca.map(p => p.t)));
    const Mtab = Math.max(...sonuc.filter(s => s.p.dis).map(s => s.Mic), 0), MtabD = Math.max(...sonuc.filter(s => s.p.dis).map(s => s.Mdis), 0), Mac = qnet * Lr * Lr / 8;
    const rUst = egilmeAs(Math.max(Mac, Mtab), G.hr, P), rAlt = egilmeAs(MtabD, G.hr, P);
    const radye = { hr: G.hr, A: r3(G.Arad), W: { perde: r3(Wp), radye: r3(Wr), su: r3(Ww), doseme: r3(Wd) }, qz: r3(qz), qnet: r3(qnet), L: r3(Lr), Mac: r3(Mac), Mtab: r3(Mtab), MtabD: r3(MtabD),
      ust: { as: r3(Math.max(rUst.as, asMin(G.hr, P))), sec: sec(Math.max(rUst.as, asMin(G.hr, P))) }, alt: { as: r3(Math.max(rAlt.as, asMin(G.hr, P))), sec: sec(Math.max(rAlt.as, asMin(G.hr, P))) } };
    if (qz > P.qem) uyar.push(`Radye zemin gerilmesi ${r3(qz)} kPa > zemin emniyet gerilmesi ${P.qem} kPa.`);
    if (rUst.yetersiz || rAlt.yetersiz) uyar.push('Radye kesiti yetersiz.');
    return { sonuc, radye, uyar, K0: r3(K0), Ec: r3(Ec / 1e6) };
  };

  /* ---------- rapor ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f2 = v => (v == null || !isFinite(v) ? '—' : (+v).toFixed(2).replace('.', ','));
  const grafik = (s) => { // M ve N yükseklik boyunca (1: dolu, 2: boş + toprak)
    const W = 300, Hh = 200, pad = 28, d1 = s.d1, d2 = s.d2, xs = d1.x, Hn = xs[xs.length - 1];
    const ciz = (vals, maks, renk, ox) => { if (!maks) return ''; return `<polyline fill="none" stroke="${renk}" stroke-width="1.6" points="${vals.map((v, i) => `${(ox + v / maks * (W / 4 - 8)).toFixed(1)},${(Hh - pad - xs[i] / Hn * (Hh - 2 * pad)).toFixed(1)}`).join(' ')}"/>`; };
    const mM = Math.max(1e-6, ...d1.M.map(Math.abs), ...(d2 ? d2.M.map(Math.abs) : [])), Nv = d1.x.map((x, i) => s.R ? d1.N[i] : (s.p.Rkomsu ? 0 : 0)), mN = Math.max(1e-6, ...d1.N.map(Math.abs), ...(d2 ? d2.N.map(Math.abs) : []));
    const ox1 = W / 4 + 10, ox2 = 3 * W / 4 + 4, eks = (ox, t) => `<line x1="${ox}" y1="${pad}" x2="${ox}" y2="${Hh - pad}" stroke="#999"/><text x="${ox}" y="14" font-size="10" text-anchor="middle">${t}</text>`;
    return `<svg width="${W}" height="${Hh}" style="background:#fafafa;border:1px solid #ddd">${eks(ox1, 'M (kNm/m)')}${s.R ? eks(ox2, 'N halka (kN/m)') : ''}
      ${ciz(d1.M, mM, '#1565c0', ox1)}${d2 ? ciz(d2.M, mM, '#c62828', ox1) : ''}${s.R ? ciz(d1.N, mN, '#1565c0', ox2) + (d2 ? ciz(d2.N, mN, '#c62828', ox2) : '') : ''}
      <text x="4" y="${Hh - 6}" font-size="9" fill="#1565c0">— dolu</text><text x="50" y="${Hh - 6}" font-size="9" fill="#c62828">— boş + toprak</text><text x="${W - 4}" y="${Hh - 6}" font-size="9" text-anchor="end">H=${f2(Hn)} m · max M ${f2(mM)}${s.R ? ' · max N ' + f2(mN) : ''}</text></svg>`; void Nv; };
  const rapor = (G, P, R) => {
    const satir = s => `<tr><td>${esc(s.ad)}${s.adet > 1 ? ` <b>×${s.adet}</b>` : ''}</td><td>${esc(s.tur)}</td><td>${Math.round(s.t * 100)}</td><td>${f2(s.Hn)}</td><td>${f2(s.Mic)}</td><td>${f2(s.Mdis)}</td><td>${f2(s.Nmax)}</td><td>${f2(s.V)}</td>
      <td><b>${s.dusey.ic.sec.t}</b><br><small>${f2(s.dusey.ic.as)} cm²</small></td><td><b>${s.dusey.dis.sec.t}</b><br><small>${f2(s.dusey.dis.as)} cm²</small></td>
      <td>${s.yatay.map(b => `${b.ad}: <b>${b.sec.t}</b> <small>(${f2(b.as)})</small>`).join('<br>')}</td></tr>`;
    const tekil = []; const g = new Map(); for (const s of R.sonuc) { const k = [s.tur, Math.round(s.t * 100), s.R ? Math.round(s.R * 10) : Math.round(s.p.L * 2), s.Hn, s.dusey.ic.sec.t, s.dusey.dis.sec.t].join('|'); if (!g.has(k)) { g.set(k, s); s.adet = 1; tekil.push(s); } else g.get(k).adet++; }
    const r = R.radye;
    return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>Oval / dairesel hazne statik hesabı</title><style>
      body{font:13px/1.45 Segoe UI,Arial,sans-serif;margin:24px;color:#222}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 6px;border-bottom:2px solid #1565c0;padding-bottom:3px}
      table{border-collapse:collapse;width:100%;margin:6px 0}td,th{border:1px solid #bbb;padding:4px 6px;text-align:center;vertical-align:middle}th{background:#e8eef7}td:first-child{text-align:left}
      .uy{background:#fff4e5;border-left:4px solid #f57c00;padding:6px 10px;margin:4px 0}.not{color:#555;font-size:12px}.kart{display:inline-block;vertical-align:top;margin:6px 10px 6px 0}
      @media print{button{display:none}body{margin:10mm}}</style></head><body>
      <button onclick="print()" style="float:right;padding:6px 14px">Yazdır / PDF</button>
      <h1>SU HAZNESİ STATİK HESABI — YAY / OVAL PLANLI HAZNE</h1>
      <div class="not">ArıtmaCAD · ${new Date().toLocaleString('tr-TR')} · ${R.sonuc.length} perde parçası (${R.sonuc.filter(s => s.p.tip === 'yay').length} yay, ${R.sonuc.filter(s => s.p.tip === 'duz').length} düz)</div>
      <h2>1. Malzeme ve yükler</h2><table><tr><th>Beton</th><th>Ec</th><th>Donatı</th><th>Paspayı</th><th>γsu</th><th>Su yüksekliği</th><th>Zemin kotu</th><th>γtoprak / φ / K0</th><th>Sürşarj</th><th>σs eğilme / çekme</th><th>ρmin</th></tr>
      <tr><td>C${P.fck}</td><td>${f2(R.Ec)} GPa</td><td>B${P.fyk}C</td><td>${Math.round(P.pas * 100)} cm</td><td>${P.gw} kN/m³</td><td>${P.hw > 0 ? f2(P.hw) + ' m' : 'perde boyu'}</td><td>${f2(P.zZemin)}</td><td>${P.gs} / ${P.phi}° / ${f2(R.K0)}</td><td>${P.q} kPa</td><td>${P.sigE} / ${P.sigN} MPa</td><td>%${(P.rhoMin * 100).toFixed(2)}</td></tr></table>
      <p class="not">Yük durumları: <b>(1)</b> havuz dolu, dışta toprak yok (sızdırmazlık deneyi); <b>(2)</b> havuz boş, dışta toprak itkisi K0·(γ·z + q). Taşıma gücü 1.6·(su / toprak) TS 500; donatı ayrıca kullanım yükünde su yapısı gerilme sınırına göre (σs) hesaplanır, büyüğü alınır.
      Taban: ${P.taban === 'M' ? 'mafsallı' : 'radyeye ankastre'}; üst uç: ${G.ust ? 'döşeme ile mesnetli' : 'serbest'}.</p>
      <h2>2. Yöntem</h2><p class="not"><b>Yay perdeler</b>: eksenel simetrik silindirik kabuk, D·w'''' + (E·t/R²)·w = p(x) (Timoshenko); 80 kiriş elemanı + halka yayı ile sonlu eleman çözümü. Halka çekmesi N = E·t·w/R, düşey moment M = D·w''.
      Bu çözüm PCA "Circular Concrete Tanks" tablolarıyla aynı kuramdır (H²/Dt'ye bağlı). <b>Düz dış perdeler</b>: konsol (ya da üstü mesnetli) şerit; bağlandığı yarım daire uçtan gelen halka kuvveti düz perdede eksenel çekme N = p(z)·R olarak alınır.
      <b>İç perdeler</b>: iki ucu başka perdeye bağlı bölme perdeleri bir taraf dolu / öbür taraf boş konsol; ucu serbest perdelerde (oksidasyon hendeği orta perdesi, yönlendirme perdeleri) su iki yanda aynı seviyededir, yalnız seviye farkı (ΔH) kadar net basınç alınır. İki yüz aynı donatı.</p>
      <h2>3. Perde sonuçları</h2><table><tr><th>Eleman</th><th>Tür</th><th>t (cm)</th><th>H (m)</th><th>M iç yüz (kNm/m)</th><th>M dış yüz (kNm/m)</th><th>N çekme (kN/m)</th><th>V taban (kN/m)</th><th>Düşey iç yüz</th><th>Düşey dış yüz</th><th>Yatay (her yüz) alt / orta / üst</th></tr>${tekil.map(satir).join('')}</table>
      <h2>4. Kesit tesir diyagramları (tip elemanlar)</h2>${tekil.map(s => `<div class="kart"><b>${esc(s.ad)}</b> — ${esc(s.tur)}<br>${grafik(s)}</div>`).join('')}
      <h2>5. Radye (basitleştirilmiş)</h2><table><tr><th>Kalınlık</th><th>Alan</th><th>Ağırlıklar (kN): perde / radye / su / döşeme</th><th>Zemin gerilmesi (dolu)</th><th>Net yukarı basınç (boş)</th><th>Açıklık / M açıklık</th><th>M taban iç / dış</th><th>Üst donatı</th><th>Alt donatı</th></tr>
      <tr><td>${Math.round(r.hr * 100)} cm</td><td>${f2(r.A)} m²</td><td>${f2(r.W.perde)} / ${f2(r.W.radye)} / ${f2(r.W.su)} / ${f2(r.W.doseme)}</td><td>${f2(r.qz)} kPa (σem ${P.qem})</td><td>${f2(r.qnet)} kPa</td><td>${f2(r.L)} m / ${f2(r.Mac)}</td><td>${f2(r.Mtab)} / ${f2(r.MtabD)}</td><td><b>${r.ust.sec.t}</b> (${f2(r.ust.as)})</td><td><b>${r.alt.sec.t}</b> (${f2(r.alt.as)})</td></tr></table>
      <p class="not">Radye, düz perdeler arası en dar genişlikte tek doğrultulu şerit olarak alınmıştır (boşken perde yükünden doğan net yukarı zemin basıncı · L²/8 ile perde taban momentinin büyüğü). Ayrıntılı radye için elastik zemine oturan plak çözümü önerilir.</p>
      <h2>6. Uyarılar</h2>${R.uyar.length ? R.uyar.map(u => `<div class="uy">${esc(u)}</div>`).join('') : '<p>Uyarı yok.</p>'}
      <p class="not">Donatı seçimi: Ø12–Ø25, aralık 10–20 cm, her yüz için. Yatay donatı (yay perdelerde halka donatısı) bindirmeleri şaşırtmalı yapılmalıdır. Bu hesap ön tasarım / kontrol amaçlıdır; nihai proje mühendis onayı gerektirir.</p></body></html>`;
  };
  let raporWin = null;
  const raporAc = html => { try { raporWin = window.open('', 'hesap_STATIKOVAL', 'width=1300,height=900'); if (raporWin) { raporWin.document.open(); raporWin.document.write(html); raporWin.document.close(); return true; } } catch (er) { console.error(er); } return false; };

  /* ---------- planda etiket / uyarı işaretleri ---------- */
  const katmanTemizle = ly => { const x = C.doc.ents.filter(e => e.layer === ly); if (x.length) C.remove(x); };
  const etiketle = (R, z, G) => {
    katmanTemizle(LY_E); C.ensureLayer(LY_E, 4, 'CONTINUOUS', 18);
    const cx = G.H.reduce((a, q) => a + q[0], 0) / G.H.length, cy = G.H.reduce((a, q) => a + q[1], 0) / G.H.length;
    for (const s of R.sonuc) { const p = s.p, h = 0.16; let m = p.m, rot = 0;
      if (p.tip === 'yay') { const d = [p.c[0] - m[0], p.c[1] - m[1]], L = Math.hypot(d[0], d[1]) || 1, o = Math.min(0.8, p.R * 0.35); m = [m[0] + d[0] / L * o, m[1] + d[1] / L * o]; rot = Math.atan2(d[1], d[0]) * DEG + 90; }
      else { const a = p.pts[0], b = p.pts[1]; rot = Math.atan2(b[1] - a[1], b[0] - a[0]) * DEG; const L = p.L || 1, n = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L], sg = Math.sign((cx - m[0]) * n[0] + (cy - m[1]) * n[1]) || 1, o = p.t / 2 + 0.25; m = [m[0] + n[0] * o * sg, m[1] + n[1] * o * sg]; }
      while (rot > 90) rot -= 180; while (rot < -90) rot += 180;
      const c = rot * Math.PI / 180, dn = [Math.sin(c) * h * 1.5, -Math.cos(c) * h * 1.5], col = p.tip === 'yay' ? 4 : 3;
      C.add(C.newEnt('text', { p: [m[0], m[1], z], h, s: `${p.tip === 'yay' ? 'YAY R=' + f2(p.R) : 'DÜZ L=' + f2(p.L)} · t=${Math.round(p.t * 100)}`, rot, al: 'C', layer: LY_E, color: col, ann: false }));
      C.add(C.newEnt('text', { p: [m[0] + dn[0], m[1] + dn[1], z], h: h * 0.8, s: `düşey ${s.dusey.ic.sec.t} / ${s.dusey.dis.sec.t} · yatay ${s.yatay[0].sec.t}`, rot, al: 'C', layer: LY_E, color: col, ann: false }));
      if (p.tip === 'yay' && p.dis) C.add(C.newEnt('circle', { c: [p.c[0], p.c[1], z], r: 0.1, layer: LY_E, color: 4 })); }
  };
  const isaretle = (z) => { // eğik / yay perde parçaları kırmızı
    katmanTemizle(LY_U); C.ensureLayer(LY_U, 1, 'CONTINUOUS', 70);
    for (const x of duvarlar()) { const n = x.kapali ? x.pts.length : x.pts.length - 1; for (let i = 0; i < n; i++) { const a = x.pts[i], b = x.pts[(i + 1) % x.pts.length]; if (egikMi(a, b)) C.add(C.newEnt('line', { a: [a[0], a[1], z], b: [b[0], b[1], z], layer: LY_U, color: 1, lw: 70 })); } }
  };

  /* ---------- komutlar ---------- */
  const PAR = [
    { k: 'fck', t: 'Beton fck (MPa)', d: 30, al: ['FCK'] }, { k: 'fyk', t: 'Donatı fyk (MPa)', d: 420, al: ['FYK'] }, { k: 'pas', t: 'Paspayı (m)', d: 0.05, al: ['PAS'] },
    { k: 'hw', t: 'Su yüksekliği, radye üstünden (m) — 0: perde boyu', d: 0, al: ['HW'] }, { k: 'gw', t: 'Su birim hacim ağırlığı (kN/m³)', d: 10, al: ['GW'] },
    { k: 'zZemin', t: 'Dış zemin (dolgu) kotu (m)', d: 0, al: ['ZEMIN'] }, { k: 'gs', t: 'Toprak birim hacim ağırlığı (kN/m³)', d: 19, al: ['GS'] }, { k: 'phi', t: 'Toprak içsel sürtünme açısı φ (°)', d: 30, al: ['PHI'] }, { k: 'q', t: 'Sürşarj (kPa)', d: 10, al: ['Q'] },
    { k: 'icYuk', t: 'İç perdelerde su yükü', opts: [['OTO', 'Otomatik: uçları bağlı bölme → bir taraf dolu; serbest uçlu → iki yanda su'], ['TEK', 'Hepsi bir taraf dolu (bakım / boşaltma)'], ['DENGE', 'Hepsi iki yanda su']], d: 'OTO', al: ['ICYUK'] },
    { k: 'dH', t: 'İki yanda su olan iç perdede seviye farkı (m)', d: 0.3, al: ['DH'] },
    { k: 'taban', t: 'Perde tabanı', opts: [['A', 'Radyeye ankastre'], ['M', 'Mafsallı']], d: 'A', al: ['TABAN'] },
    { k: 'sigE', t: 'Kullanımda donatı gerilmesi sınırı — eğilme (MPa)', d: 170, al: ['SIGE'] }, { k: 'sigN', t: 'Kullanımda donatı gerilmesi sınırı — eksenel çekme (MPa)', d: 140, al: ['SIGN'] },
    { k: 'rhoMin', t: 'En az donatı oranı ρmin (toplam kesit)', d: 0.004, al: ['RHO'] }, { k: 'qem', t: 'Zemin emniyet gerilmesi (kPa)', d: 200, al: ['QEM'] },
  ];
  C.statikOval = async (sorma) => {
    const G = modelOku(); let P = {}; PAR.forEach(f => { P[f.k] = f.d; });
    const gp = C._ins && C._ins.getParams; if (gp && !sorma) { const r = await gp('Oval / dairesel hazne statik hesabı', PAR, 'statikOval'); if (!r) return null; P = r; }
    for (const f of PAR) if (!f.opts) P[f.k] = +P[f.k];
    const R = hesapla(G, P), z = G.kUst + 0.01;
    etiketle(R, z, G); katmanTemizle(LY_U); C.changed();
    C.doc.set = C.doc.set || {}; C.doc.set.statikOval = { t: Date.now(), P, sonuc: R.sonuc.map(s => ({ ad: s.ad, tur: s.tur, t: s.t, Hn: s.Hn, Mic: s.Mic, Mdis: s.Mdis, Nmax: s.Nmax, dusey: { ic: s.dusey.ic.sec.t, dis: s.dusey.dis.sec.t }, yatay: s.yatay.map(b => b.ad + ' ' + b.sec.t) })), radye: { ust: R.radye.ust.sec.t, alt: R.radye.alt.sec.t, qz: R.radye.qz } };
    const html = rapor(G, P, R); C._statikOvalRapor = html;
    const ac = raporAc(html);
    const ny = R.sonuc.filter(s => s.p.tip === 'yay').length, nd = R.sonuc.length - ny;
    C.log(`Oval hazne statik hesabı: ${ny} yay + ${nd} düz perde parçası çözüldü${ac ? '; rapor ayrı pencerede açıldı' : ' (açılır pencere engellendi — STATIKOVALRAPOR ile açın)'}. Etiketler: ${LY_E} katmanı.`);
    R.uyar.forEach(u => C.warn(u));
    return R;
  };
  C.addCommand(['STATIKOVAL', 'OVALSTATIK', 'DAIRESELHAVUZ'], 'Yay / oval / dairesel planlı su haznesi statik hesabı (silindirik kabuk + konsol perdeler + radye), rapor ayrı pencerede', async () => { try { await C.statikOval(); } catch (er) { C.warn('Oval hazne hesabı: ' + er.message); console.error(er); } }, { noUndo: false });
  C.addCommand(['STATIKOVALRAPOR'], 'Son oval hazne statik hesap raporunu yeniden açar', async () => { if (!C._statikOvalRapor) { C.warn('Önce STATIKOVAL çalıştırın.'); return; } if (!raporAc(C._statikOvalRapor)) C.warn('Açılır pencere engellendi.'); }, { noUndo: true });

  /* ---------- STATIKMODEL koruması: eğik / yay perde varsa dikdörtgen hesap gönderilmez ---------- */
  const egikToplam = () => { let L = 0; for (const x of duvarlar()) { const n = x.kapali ? x.pts.length : x.pts.length - 1; for (let i = 0; i < n; i++) { const a = x.pts[i], b = x.pts[(i + 1) % x.pts.length]; if (egikMi(a, b)) L += Math.hypot(b[0] - a[0], b[1] - a[1]); } } return L; };
  // perde boşlukları (yatay delikler: pencere / boru geçişi) — kabuk donatısında çubuklar burada kesilir
  const delikler = e => (Array.isArray(e && e.bosluk3) ? e.bosluk3 : []).filter(b => b && !b.pahIcin && Array.isArray(b.pts) && b.pts.length >= 3 && Array.isArray(b.d) && Math.hypot(b.d[0] || 0, b.d[1] || 0) > Math.abs(b.d[2] || 0)).map(b => {
    const dl = Math.hypot(b.d[0], b.d[1]), nd = [b.d[0] / dl, b.d[1] / dl], u = [-nd[1], nd[0]], n = b.pts.length, m = [0, 1, 2].map(k => b.pts.reduce((t, q) => t + (+q[k] || 0), 0) / n), c = [m[0] + b.d[0] / 2, m[1] + b.d[1] / 2, m[2]];
    const ss = b.pts.map(q => (q[0] - c[0]) * u[0] + (q[1] - c[1]) * u[1]), zs = b.pts.map(q => +q[2] || 0);
    return { c: c.map(r3), u: u.map(v => Math.round(v * 1e6) / 1e6), w: r3(Math.max(...ss) - Math.min(...ss)), h: r3(Math.max(...zs) - Math.min(...zs)), zc: r3((Math.max(...zs) + Math.min(...zs)) / 2), d: r3(dl), daire: n >= 12 }; });
  C._statikEgikUzunluk = egikToplam;
  // statik (kabuk) kalınlıklarını modele yansıt: items [{id, t, tur:'perde'|'radye'|'doseme', tip:'dis'|'ic'}]
  // dış perde: hazne iç yüzü sabit, dışa kalınlaşır · iç perde: eksen sabit · radye / döşeme: üst kot sabit
  C._statikKabukKalinlik = (items) => {
    const I = C._ins, log = [], uyar = []; if (!I || !I.faceOffs || !I.segFrames) return { hata: 'perde modülü yok' };
    const D = duvarlar(), H = kabuk(D.flatMap(x => x.pts)), pip = (q, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    const kap = D.filter(x => x.kapali).sort((a, b) => Math.abs(M.polyArea(b.pts)) - Math.abs(M.polyArea(a.pts)))[0], IC = kap ? kap.pts : H;
    let n = 0; C.begin && C.begin();
    // anaerobik havuz (tek katı ünite): perde grupları parametreye gider — dış / halka yayı / ortak → two, orta → tw, yönlendirme → tg, kanal → tK, radye → tb
    const anP = new Map();
    for (const it of items) { const m = String(it.id == null ? '' : it.id).match(/^(\d+):(.+)$/), e = m ? C.byId(+m[1]) : (it.tur === 'radye' && it.id != null ? C.byId(it.id) : null); if (!e || e.type !== 'anaerobik') continue;
      const k = m ? m[2] : '', p = it.tur === 'radye' ? 'tb' : /^orta-/.test(k) ? 'tw' : /^perde-/.test(k) ? 'tg' : /^kanal-|^ara$/.test(k) ? 'tK' : 'two';
      const o = anP.get(e) || {}; o[p] = Math.max(o[p] || 0, r3(it.t)); anP.set(e, o); it._an = true; }
    for (const [e, o] of anP) { const ch = []; for (const [p, t] of Object.entries(o)) { const t0 = +e[p] || (C.anaerobikGeo ? C.anaerobikGeo(e).q[p] : 0); if (Math.abs(t - t0) < 0.004) continue; e[p] = t; ch.push(`${p} ${Math.round(t0 * 100)} → ${Math.round(t * 100)} cm`); }
      if (ch.length) { delete e._c; delete e._ag; delete e._mx; C.touch && C.touch(e); if (e.ekipman && C.anaerobikEkipman) C.anaerobikEkipman(e, true); n++; log.push(`${e.code || 'Anaerobik'}: ${ch.join(', ')}`); } }
    for (const it of items) { if (it._an) continue; const e = it.id != null ? C.byId(it.id) : null; if (!e) { uyar.push(`${it.ad || it.id}: modelde bulunamadı (Modelden yeniden alın)`); continue; }
      if (e.type === 'perde') { const F = I.faceOffs(e), tOld = F.tb; if (Math.abs(it.t - tOld) < 0.004) continue; const sf = I.segFrames(e)[0], m = [(sf.a[0] + sf.b[0]) / 2, (sf.a[1] + sf.b[1]) / 2], solIc = pip([m[0] + sf.nn[0] * 0.3, m[1] + sf.nn[1] * 0.3], IC);
        const sabit = it.tip === 'dis' ? (solIc ? F.lB : F.rB) : (F.lB + F.rB) / 2, of = +e.ofs || 0; e.tb = r3(it.t); e.tt = r3(it.t);
        const F2 = I.faceOffs(e); e.ofs = of + 1; const F3 = I.faceOffs(e), k = (F3.lB - F2.lB) || 1; e.ofs = of; const yeni = it.tip === 'dis' ? (solIc ? F2.lB : F2.rB) : (F2.lB + F2.rB) / 2, dd = sabit - yeni; if (Math.abs(dd) > 1e-6) e.ofs = r3(of + dd / k);
        delete e._c; C.touch && C.touch(e); n++; log.push(`${e.no || 'Perde'} ${Math.round(tOld * 100)} → ${Math.round(it.t * 100)} cm${it.tip === 'dis' ? ' (dışa)' : ''}`); }
      else if (e.type === 'plak') { const tOld = +e.t || 0.3; if (Math.abs(it.t - tOld) < 0.004) continue; e.t = r3(it.t); delete e._c; C.touch && C.touch(e); n++; log.push(`${e.kind === 'radye' ? 'Radye' : 'Döşeme ' + (e.no || '')} ${Math.round(tOld * 100)} → ${Math.round(it.t * 100)} cm (üst kot sabit)`); }
      else uyar.push(`${it.ad || it.id}: katı eleman — kalınlığı elle değiştirin (Katıdan eleman ile perdeye çevirmeniz önerilir)`); }
    if (n) { C.changed(); C.log('Statik kalınlıklar modele yansıtıldı (geri almak için U): ' + log.join(' · ')); } else C.log('Statik kalınlıklar modelle aynı — değişiklik yok.');
    uyar.forEach(u => C.warn(u));
    let model = null; if (n) { try { model = C.statikKabukModel(); localStorage.setItem('aritmacad.statik.model', JSON.stringify(model)); } catch (er) { uyar.push(er.message); } }
    return { n, log, uyar, model };
  };
  /* yapı türü önerisi girdileri (statik penceresi › P.yapiTuru) */
  // zemin kotu: en yüksek toprak (seviye listesindeki "toprak") ya da tretuvar üstü kotu; yoksa null
  const zeminKotu = () => { const z = [], sv = C.doc.set && C.doc.set.seviye; if (sv && sv.toprak != null && isFinite(+sv.toprak)) z.push(+sv.toprak);
    for (const e of C.doc.ents) if (e.type === 'tretuvar' && C.layer(e.layer).on && !(typeof e.gv === 'string') && isFinite(+e.zg)) z.push(+e.zg + (+e.h || 0));
    return z.length ? r3(Math.max(...z)) : null; };
  /* statik eleman listesi: metrajla aynı net parçalar (app/yapi-cakisma.js › net; öncelik temel > kolon > perde > kiriş > döşeme).
     Statik hesaba girmeyenler sayılmaz: tuğla duvar, sıkıştırılmış dolgu, zemine (radye / dolgu üstüne) oturan döşeme (taban betonu, kaide). */
  const netHacimler = () => {
    const Y = C.yapiCakisma; if (!Y || !Y.net) return null;
    const ents = C.doc.ents.filter(vis), zemin = ents.filter(e => (e.type === 'plak' && e.kind === 'radye') || e.type === 'dolgu').map(e => ({ z: e.type === 'dolgu' ? +e.zb : +e.zt || 0, pts: e.pts }));
    const icinde = (q, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    const oturur = e => { if (e.type !== 'plak' || e.kind === 'radye' || !Array.isArray(e.pts) || !e.pts.length) return false; const za = (+e.zt || 0) - (+e.t || 0.15), m = e.pts.reduce((q, p) => [q[0] + p[0] / e.pts.length, q[1] + p[1] / e.pts.length], [0, 0]);
      return zemin.some(g => Math.abs(g.z - za) < 0.06 && Array.isArray(g.pts) && icinde(m, g.pts)); };
    const N = Y.net(ents), liste = [], top = {}; let net = 0, brut = 0;
    for (const [id, m] of N) { if (m.tur === 'duvar' || m.tur === 'dolgu') continue; const e = ents.find(x => x.id === id); if (!e || oturur(e)) continue;
      liste.push({ id, tur: m.tur, ad: m.ad, no: e.no || e.ad || null, brut: r3(m.brut), net: r3(m.net) }); top[m.ad] = r3((top[m.ad] || 0) + m.net); net += m.net; brut += m.brut; }
    return { liste, top, net: r3(net), brut: r3(brut) };
  };
  C._statikNetHacim = netHacimler;
  // statik penceresinden projeye kayıtlı statik ayarı yazar (yapı türü, alt yapı üst kotu …) — C.doc.set.statikAyar
  C._statikAyarYaz = o => { C.doc.set = C.doc.set || {}; const A = C.doc.set.statikAyar = Object.assign({}, C.doc.set.statikAyar || {});
    for (const [k, v] of Object.entries(o || {})) { if (v == null) delete A[k]; else A[k] = v; } if (C.changed) C.changed(); return A; };
  // statik penceresi için 3B kabuk modeli (perde eksenleri, radye, döşemeler, kotlar)
  C.statikKabukModel = () => {
    // tek katı ünite yapıları (anaerobik havuz): seçiliyse ya da modelde perde yokken varsa onun modeli
    if (C.anaerobikStatikModel) { const an = C.doc.ents.filter(e => e.type === 'anaerobik' && C.layer(e.layer).on && !(typeof e.gv === 'string')), sec = an.find(e => SEC && SEC.has(e));
      if (sec || (an.length && !(SEC && [...SEC].some(e => e.type === 'perde')) && !anaPerdeler().length)) return C.anaerobikStatikModel(sec || an[an.length - 1]); }
    const G = modelOku(), D = duvarlar(); if (!D.length) throw new Error('perde yok');
    const walls = D.map((x, i) => { const ps = G.parca.filter(p => p.e === x.e), Ld = ps.filter(p => p.dis).reduce((s, p) => s + p.L, 0), Lt = ps.reduce((s, p) => s + p.L, 0) || 1;
      return { id: x.e.id, kati: !!x.kati, ...(delikler(x.e).length ? { delik: delikler(x.e) } : {}), ad: x.e.no || (x.kati ? 'K' : 'P') + (i + 1), pts: x.pts.map(q => [r3(q[0]), r3(q[1])]), kapali: !!x.kapali, t: r3(x.t), ...(x.tt != null ? { tt: r3(x.tt), solUst: r3(x.solUst), sagUst: r3(x.sagUst) } : {}), zt: r3(x.zt), tip: Ld / Lt > 0.5 ? 'dis' : 'ic', bolme: ps.some(p => p.bolme) }; });
    const rad = G.rad ? { id: G.rad.id != null ? G.rad.id : null, pts: (G.rad.pts || []).map(q => [r3(q[0]), r3(q[1])]), t: r3(G.hr), kAlt: r3(G.zR - G.hr) } : null;
    if (!rad || rad.pts.length < 3) throw new Error('radye bulunamadı (plak radye ya da katı taban gerekli)');
    const dosDisi = [];
    const dos = C.doc.ents.filter(vis).filter(e => e.type === 'plak' && e.kind !== 'radye' && Array.isArray(e.pts) && e.pts.length >= 3).map((e, k) => ({ id: e.id, ad: e.no || 'D' + (k + 1), pts: e.pts.map(q => [r3(q[0]), r3(q[1])]), t: r3(+e.t || 0.2), zt: r3(+e.zt || 0), g: +e.g || 1.5, q: +e.q || 5 })).filter(d => { // yalnız perde üstüne oturan döşemeler kabuk modeline girer; çatı / ara / zemine oturan döşemeler çerçeve hesabındadır
      const ok = walls.some(w => Math.abs(d.zt - w.zt) < d.t + 0.05); if (!ok) dosDisi.push(`${d.ad} (üst ${d.zt})`); return ok; });
    const xs = walls.flatMap(w => w.pts.map(q => q[0])), ys = walls.flatMap(w => w.pts.map(q => q[1])), kUst = Math.max(...walls.map(w => w.zt));
    const tw = Math.max(...walls.filter(w => w.tip === 'dis').map(w => w.t), 0.3), ti = Math.max(...walls.filter(w => w.tip !== 'dis').map(w => w.t), tw);
    const geo = { Lx: r3(Math.max(...xs) - Math.min(...xs)), Ly: r3(Math.max(...ys) - Math.min(...ys)), tw, ti, hr: rad.t, toe: 0, bolX: [], bolY: [], doseme: [], kAlt: rad.kAlt, kUst: r3(kUst), ust: dos.length ? 'M' : 'S' };
    const ny = G.parca.filter(p => p.tip === 'yay').length;
    return { t: Date.now(), kabuk: { walls, radye: rad, dosemeler: dos }, geo, koken: [Math.min(...xs), Math.min(...ys)], ozet: `${walls.length} perde (${walls.filter(w => w.tip === 'dis').length} dış, ${ny} yay parçası), radye ${Math.round(rad.t * 100)} cm, ${dos.length} döşeme · kot ${r3(rad.kAlt)} → ${r3(kUst)}`, uyar: (G.uyar || []).concat(dosDisi.length ? [`Perde üstünde olmayan döşemeler kabuk (su yapısı) hesabına alınmadı, kiriş · kolon · döşeme hesabında tasarlanır: ${dosDisi.join(', ')}`] : []) };
  };
  const sar = () => {
    const k = C.cmds && C.cmds.STATIKMODEL; if (!k || k._oval) return !!k;
    const f0 = k.fn; k._oval = true;
    k.fn = function (I) { // eşzamanlı: statik penceresi çağırdıktan hemen sonra sonucu (ya da hatayı) okuyabilsin
      try { const p = govde.apply(this, arguments); if (p && p.catch) p.catch(er => { console.error(er); C.warn('Statik ← model: ' + er.message); }); return p; }
      catch (er) { console.error(er); SEC = null; BOLGE = null; C.warn('Statik ← model gönderilemedi: ' + er.message);
        try { localStorage.setItem('aritmacad.statik.model', JSON.stringify({ t: Date.now(), hata: 'ArıtmaCAD modeli okuyamadı: ' + er.message })); } catch (e2) { } }
    };
    const govde = function (I) {
      SEC = C.sel && C.sel.length ? new Set(C.sel) : null; BOLGE = null;
      // seçim yoksa ve modelde birden çok radye varsa: en son çizilen radyenin üstündeki yapı (eski / başka yapılar karışmasın)
      if (!SEC) { const rs = C.doc.ents.filter(e => e.type === 'plak' && e.kind === 'radye' && C.layer(e.layer).on && !(typeof e.gv === 'string'));
        if (rs.length > 1) { const r0 = rs.slice().sort((a, b) => (+b.id || 0) - (+a.id || 0))[0], bb = C.bbox(r0); BOLGE = [bb[0] - 1, bb[1] - 1, bb[2] + 1, bb[3] + 1];
          C.warn(`Modelde ${rs.length} radye (ayrı yapı) var: yalnız EN SON çizilen radyenin üstündeki yapı alınıyor. Başka bir yapıyı hesaplamak için o yapının perde ve radyesini seçip "Modelden al" deyin.`); } }
      let L = 0; try { L = egikToplam(); } catch (er) { console.error(er); }
      const kabukHep = !(C.doc.set && C.doc.set.statikKabuk === false); /* dikdörtgen yapılar da 3B kabukla (SAP2000 tipi) çözülür; eski yönteme dönmek için C.doc.set.statikKabuk = false */
      if (L < 0.3 && !kabukHep) { const sel0 = C.sel; try { if (BOLGE && !SEC) C.sel = C.doc.ents.filter(e => vis(e) && e.type !== 'sheet'); SEC = null; BOLGE = null; return f0.apply(this, arguments); } finally { C.sel = sel0; SEC = null; BOLGE = null; } }
      const eski = C.doc.ents.filter(e => e.type === 'donati3' || e.layer === 'STA_DONATI_3B'); if (eski.length) { C.remove(eski); C.warn(`Önceki 3B donatı silindi (yeniden hesaplanacak): ${eski.length} grup.`); }
      katmanTemizle(LY_U);
      let d; try { d = C.statikKabukModel(); } catch (er) { d = { t: Date.now(), hata: er.message }; C.warn('Kabuk modeli: ' + er.message); }
      // kolon / kiriş (çerçeve): ayrı çerçeve hesabı için modele eklenir; kabuk modelinde de çubuk eleman olurlar (perdeye gömülü kolon = düşey kaburga, döşeme altındaki kiriş = döşemeye bağlı kaburga)
      if (d && !d.hata && C._cerceveOku) { try { const cer = C._cerceveOku(); if (cer) { d.cerceve = cer; d.kabuk.kirisler = (cer.kirisler || []).map(k => ({ id: k.id, no: k.no, a: k.a, b: k.b, zt: k.zt, bw: k.bw, hb: k.hb })); d.kabuk.kolonlar = (cer.kolonlar || []).map(c => ({ id: c.id, no: c.no, x: c.x, y: c.y, bx: c.bx, by: c.by, D: c.D, z0: c.z0, zt: c.zt })); d.ozet += ' · çerçeve: ' + cer.ozet; d.uyar = (d.uyar || []).concat(cer.uyar || []); } } catch (er) { console.error(er); } }
      // projeye kayıtlı yapıya özgü kabuk tasarım kabulleri (C.doc.set.statikAyar: wmax çatlak sınırı mm, seritOrt şerit ortalaması m) — anaerobik modeli gibi kabuk verisiyle gider
      if (d && !d.hata && d.kabuk) { const A = (C.doc.set && C.doc.set.statikAyar) || {}; if (+A.wmax > 0 && !(d.kabuk.wmax > 0)) d.kabuk.wmax = +A.wmax; if (+A.seritOrt > 0 && !(d.kabuk.seritOrt > 0)) d.kabuk.seritOrt = +A.seritOrt; }
      // perde + radye yoksa (yalnız kolon / kiriş: bina) kabuk modeli kurulamaz — çerçeve yine gönderilir (yapı türü: yalnız üst yapı)
      if (d && d.hata && C._cerceveOku) { try { const cer = C._cerceveOku(); if (cer) d = { t: Date.now(), cerceve: cer, geo: null, koken: null, ozet: 'çerçeve: ' + cer.ozet, uyar: (cer.uyar || []).concat([`Perde + radye (kabuk) modeli kurulamadı (${d.hata}) — yalnız kolon / kiriş / döşeme gönderildi.`]) }; } catch (er) { console.error(er); } }
      // yapı türü önerisi için (statik penceresi, P.yapiTuru): zemin / tretuvar kotu, haznede su, projeye kayıtlı statik ayarları ve
      // metrajla aynı net eleman hacimleri (app/yapi-cakisma.js) — statik eleman listesi ve ağırlık bunlardan
      if (d && !d.hata) { try { d.zeminKot = zeminKotu(); d.su = !!(d.geo && d.geo.kSu != null && d.geo.kAlt != null && +d.geo.kSu > +d.geo.kAlt + (+d.geo.hr || 0) + 0.05); const A = C.doc.set && C.doc.set.statikAyar; if (A) d.statikAyar = JSON.parse(JSON.stringify(A)); d.hacim = netHacimler(); } catch (er) { console.error(er); } }
      C._statikSonModel = d; // pencere doğrudan buradan da okur (localStorage dolu / yazılamazsa eski model kalmasın)
      try { localStorage.setItem('aritmacad.statik.model', JSON.stringify(d)); } catch (er) { try { ['aritmacad.statik.cizim', 'aritmacad.statik.donati', 'aritmacad.statik.model'].forEach(x => localStorage.removeItem(x)); localStorage.setItem('aritmacad.statik.model', JSON.stringify(d)); } catch (er2) { C.warn('Model aktarılamadı: ' + er2.message); } }
      if (!d.hata) { C.log(`${L >= 0.3 ? `Yay / oval planlı hazne (${r3(L)} m yay / eğik perde)` : 'Dikdörtgen yapı'}: statik penceresine 3B KABUK modeli (SAP2000 tipi) gönderildi — ${d.ozet}. Statik penceresinde Hesapla'ya basın.`); C.changed();
        C.doc.set = C.doc.set || {}; if (d.koken) C.doc.set.statikKoken = d.koken; (d.uyar || []).forEach(u => C.warn(u)); }
      SEC = null; BOLGE = null;
    };
    return true;
  };
  const E0 = () => C.cmd || {};
  if (!sar()) { let n = 0; const t = setInterval(() => { if (sar() || ++n > 40) clearInterval(t); }, 300); }

  /* ---------- şerit: Statik → Hesap ve Hesap → Yapı panellerine düğme ---------- */
  const serit = () => {
    const R = C.ribbon; if (!R || !Array.isArray(R.tabs)) return false; let ok = false;
    let yeni = false;
    for (const [tab, pan] of [['Statik', 'Hesap'], ['Hesap', 'Yapı']]) { const T = R.tabs.find(t => t[0] === tab), pn = T && T[1].find(p => p[0] === pan); if (pn) { if (!pn[1].some(b => b.cmd === 'STATIKOVAL')) { pn[1].push({ cmd: 'STATIKOVAL', t: 'Oval / dairesel hazne', i: 'found' }); yeni = true; } ok = tab === 'Statik' || ok; } }
    if (yeni && R.render) R.render(); return ok;
  };
  window.addEventListener('load', () => { let n = 0; const t = setInterval(() => { try { if (serit() || ++n > 40) clearInterval(t); } catch (er) { clearInterval(t); } }, 400); });
})(window.C);

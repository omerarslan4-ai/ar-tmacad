/* ArıtmaCAD — MERDİVEN (Revit benzeri): düz, L, U (sahanlıklı, köşeli dönüşlü) ve helezon (döner) merdiven
   Tipler: betonarme (plak kalınlıklı ya da zemine kadar dolu), çelik ızgaralı (galvaniz, UPN limonlu), CTP (FRP ızgara + CTP limon)
   Standart: rıht ≤ max (vars. 17.5 cm), basamak 2h + b = 63 cm (Blondel), korkuluk 110 cm + ara küpeşte + 15 cm tekmelik
   merdiven nesnesi: { pts: yürüme çizgisi köşe noktaları (2B), z0, z1, w, hmax, b, t, sah, tip, km, kork, kh, tk, dik, nos, uz, hiza, ks(kat sayısı), spiral: {c, r0, r1, a0, yon, aci} } */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, P, TX, CI } = C.prim, RAD = Math.PI / 180;
  const I_ = () => C._ins, cm = v => v / 100;
  const TIP = [['beton', 'Betonarme merdiven'], ['izgara', 'Çelik ızgaralı merdiven (galvaniz, UPN limon)'], ['ctp', 'CTP (FRP) merdiven (CTP ızgara + CTP limon)']];
  const KM = { // korkuluk malzemeleri: ad, renk
    galvaniz: ['Sıcak daldırma galvaniz çelik', [0.70, 0.72, 0.74]], paslanmaz: ['Paslanmaz çelik (AISI 304, saten)', [0.86, 0.87, 0.89]], paslanmaz316: ['Paslanmaz çelik AISI 316 (arıtma / korozif ortam)', [0.82, 0.84, 0.86]],
    ctp_sari: ['CTP (FRP) — sarı', [0.95, 0.74, 0.12]], ctp_gri: ['CTP (FRP) — gri', [0.56, 0.58, 0.60]], ctp_yesil: ['CTP (FRP) — yeşil', [0.20, 0.52, 0.30]],
    boyali: ['Boyalı çelik RAL 7016 antrasit', [0.22, 0.25, 0.28]], boyali_sari: ['Boyalı çelik RAL 1023 trafik sarısı', [0.96, 0.78, 0.10]], aluminyum: ['Alüminyum (eloksal)', [0.78, 0.80, 0.82]], ahsap: ['Ahşap küpeşte + çelik dikme', [0.55, 0.36, 0.20]],
  };
  const COL = { beton: [0.76, 0.76, 0.73], izg: [0.58, 0.60, 0.62], izgK: [0.50, 0.52, 0.54], ctp: [0.93, 0.72, 0.14], ctpK: [0.80, 0.60, 0.10], cel: [0.45, 0.47, 0.50] };
  const o_ = O => Object.entries(O).map(([k, v]) => [k, v[0]]);
  C.KORKULUK_KM = KM; // korkuluk malzeme kataloğu: ünite yapıları (anaerobik havuz) buradan seçer
  /* ---------- kurala göre rıht / basamak ---------- */
  const rule = e => {
    const H = Math.abs((+e.z1 || 0) - (+e.z0 || 0)), hmax = cm(+e.hmax || 17.5), n = Math.max(2, Math.ceil(H / hmax - 1e-9)), h = H / n;
    const b = +e.b > 0 ? cm(+e.b) : Math.max(0.25, Math.min(0.34, 0.63 - 2 * h));
    return { H, n, h, b, blondel: 2 * h + b, alpha: Math.atan2(h, b) / RAD };
  };
  /* ---------- geometri: parçalar (kol / sahanlık) ---------- */
  const norm2 = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
  const offsetPath = (pts, d) => { // sol (+) ofset, köşelerde gönye
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const u1 = i > 0 ? norm2([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]) : null, u2 = i < n - 1 ? norm2([pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]]) : null;
      const n1 = u1 ? [-u1[1], u1[0]] : null, n2 = u2 ? [-u2[1], u2[0]] : null;
      if (!n1) out.push([pts[i][0] + n2[0] * d, pts[i][1] + n2[1] * d]); else if (!n2) out.push([pts[i][0] + n1[0] * d, pts[i][1] + n1[1] * d]);
      else { const m = norm2([n1[0] + n2[0], n1[1] + n2[1]]), k = m[0] * n1[0] + m[1] * n1[1]; out.push([pts[i][0] + m[0] * d / Math.max(0.2, k), pts[i][1] + m[1] * d / Math.max(0.2, k)]); }
    }
    return out;
  };
  const geom = e => {
    if (e._g) return e._g;
    const R = rule(e), w = Math.max(0.5, +e.w || 1.2), sah = +e.sah > 0 ? +e.sah : w, z0 = Math.min(+e.z0 || 0, +e.z1 || 0), up = (+e.z1 || 0) >= (+e.z0 || 0);
    let pts = (e.pts || []).map(p => [p[0], p[1]]);
    if (e.hiza === 'L') pts = offsetPath(pts, -w / 2); else if (e.hiza === 'R') pts = offsetPath(pts, w / 2);
    const segs = []; for (let i = 0; i + 1 < pts.length; i++) { const d = [pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]], l = Math.hypot(d[0], d[1]); if (l > 1e-6) segs.push({ u: [d[0] / l, d[1] / l], len: l }); }
    if (!segs.length) segs.push({ u: [1, 0], len: 1 });
    // rıhtları kollara paylaştır: 1 m'den kısa ara parça = yalnız sahanlık
    const act = segs.map((s, i) => segs.length === 1 || i === 0 || i === segs.length - 1 || s.len > Math.max(1.5, 1.6 * w)) // ara kısa parça (U dönüşü) = yalnız sahanlık, tot = segs.reduce((q, s, i) => q + (act[i] ? s.len : 0), 0) || 1;
    const ns = segs.map(() => 0), idx = segs.map((s2, i) => i).filter(i => act[i]); if (!idx.length) idx.push(0);
    if (idx.length * 2 > R.n) { idx.forEach((i, k) => { ns[i] = Math.floor(R.n / idx.length) + (k < R.n % idx.length ? 1 : 0); }); }
    else { const tl = idx.reduce((q, i) => q + segs[i].len, 0) || 1, raw = idx.map(i => 2 + (R.n - 2 * idx.length) * segs[i].len / tl); idx.forEach((i, k) => { ns[i] = Math.floor(raw[k]); }); let rem = R.n - idx.reduce((q, i) => q + ns[i], 0); const ord = idx.map((i, k) => [i, raw[k] - Math.floor(raw[k])]).sort((a, b) => b[1] - a[1]); for (let k = 0; rem > 0; k = (k + 1) % ord.length, rem--) ns[ord[k][0]]++; }
    const pieces = []; let Pc = pts[0].slice(), z = z0, zz = up ? 0 : 1;
    segs.forEach((s, i) => {
      if (i > 0) { const pu = segs[i - 1].u; pieces.push({ kind: 'sah', o: Pc.slice(), u: pu, len: sah, w, z, conIn: true }); const Lc = [Pc[0] + pu[0] * sah / 2, Pc[1] + pu[1] * sah / 2]; Pc = [Lc[0] + s.u[0] * sah / 2, Lc[1] + s.u[1] * sah / 2]; pieces[pieces.length - 1].lc = Lc; pieces[pieces.length - 1].uOut = s.u; }
      if (ns[i] > 0) { const Lf = (ns[i] - 1) * R.b; pieces.push({ kind: 'kol', o: Pc.slice(), u: s.u, len: Lf, w, z, n: ns[i], h: R.h, b: R.b }); Pc = [Pc[0] + s.u[0] * Lf, Pc[1] + s.u[1] * Lf]; z += ns[i] * R.h; }
      else { const Ls = Math.max(0, s.len - sah); if (Ls > 1e-3) { pieces.push({ kind: 'sah', o: Pc.slice(), u: s.u, len: Ls, w, z, strip: true }); Pc = [Pc[0] + s.u[0] * Ls, Pc[1] + s.u[1] * Ls]; } }
    });
    if (e.us === 'E') { const lu = segs[segs.length - 1].u, uw = +e.usW > 0 ? cm(+e.usW) : w, ul = +e.usL > 0 ? cm(+e.usL) : w; pieces.push({ kind: 'sah', o: Pc.slice(), u: lu, len: ul, w: uw, z, top: true }); } // üst sahanlık (en × boy)
    if (e.as === 'E' && pieces.length) { const f = pieces[0], aw = +e.asW > 0 ? cm(+e.asW) : w, al = +e.asL > 0 ? cm(+e.asL) : w; pieces.unshift({ kind: 'sah', o: [f.o[0] - f.u[0] * al, f.o[1] - f.u[1] * al], u: f.u, len: al, w: aw, z: z0, bot: true }); } // alt sahanlık (zemin kotunda)
    return (e._g = { R, w, sah, z0, zTop: z, pieces, ns, up });
  };
  /* ---------- helezon (döner) merdiven ---------- */
  const spiralGeom = e => {
    if (e._g) return e._g;
    const S = e.spiral, R = rule(e), r0 = Math.max(0.05, +S.r0 || 0.15), r1 = Math.max(r0 + 0.4, +S.r1 || 1.0), rw = r0 + (r1 - r0) * 0.6; // yürüme çizgisi (iç kenardan ~ %60)
    const dA = R.b / rw * (S.yon === 'CW' ? -1 : 1), z0 = Math.min(+e.z0 || 0, +e.z1 || 0);
    return (e._g = { R, r0, r1, rw, dA, z0, zTop: z0 + R.n * R.h, n: R.n, h: R.h, c: S.c, a0: (+S.a0 || 0) * RAD, spiral: true });
  };
  /* ---------- ağ yardımcıları ---------- */
  const tube = (out, a, b, r, col, n = 10) => { // a→b silindir (boru)
    const d = M.sub(b, a), l = M.len(d); if (l < 1e-6) return; const u = M.mul(d, 1 / l), t0 = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], x = M.norm(M.cross(u, t0)), y = M.cross(u, x), v0 = out.v.length;
    for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2, o = M.add(M.mul(x, Math.cos(t) * r), M.mul(y, Math.sin(t) * r)); out.v.push(M.add(a, o), M.add(b, o)); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, A = v0 + i * 2, B = v0 + i * 2 + 1, Cc = v0 + j * 2, D = v0 + j * 2 + 1; out.f.push([A, Cc, D], [A, D, B]); out.fc.push(col, col); }
  };
  const quadBox = (out, c8, col, edges) => { I_().hexa(out, c8, col); if (edges) { I_().edgeLoop(out, c8.slice(0, 4)); I_().edgeLoop(out, c8.slice(4)); for (let i = 0; i < 4; i++) out.edges3.push([c8[i], c8[i + 4]]); } };
  /* yerel (s: kol yönü, o: sola, z) → dünya */
  const Wd = (pc, s, o, z) => [pc.o[0] + pc.u[0] * s - pc.u[1] * o, pc.o[1] + pc.u[1] * s + pc.u[0] * o, z];
  const sbox = (out, pc, s0, s1, o0, o1, zb0, zb1, zt0, zt1, col, edges) => quadBox(out, [Wd(pc, s0, o0, zb0), Wd(pc, s1, o0, zb1), Wd(pc, s1, o1, zb1), Wd(pc, s0, o1, zb0), Wd(pc, s0, o0, zt0), Wd(pc, s1, o0, zt1), Wd(pc, s1, o1, zt1), Wd(pc, s0, o1, zt0)], col, edges);
  /* basamak yüzeyi kotu (kol içinde s'de) */
  const stepTop = (pc, s) => pc.z + Math.min(pc.n, Math.floor(Math.max(0, s) / pc.b + 1e-9) + 1) * pc.h;
  /* korkuluk: çizgi boyunca dikmeler, küpeşte, ara küpeşte, tekmelik (ağaç: alt kot fonksiyonu) */
  const railRun = (out, A, B, zA, zB, e, col, slope) => { // A,B: 2B; zA,zB: yürüme yüzeyi kotu (dikme tabanı)
    const kh = cm(+e.kh || 110), L2 = Math.hypot(B[0] - A[0], B[1] - A[1]); if (L2 < 0.05) return 0;
    const at = t => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, zA + (zB - zA) * t];
    const rr = (e.km || '').startsWith('ctp') ? 0.025 : 0.0213, rp = (e.km || '').startsWith('ctp') ? 0.025 : 0.0213; // Ø42.4 boru / CTP 50 mm
    const top = t => { const p = at(t); return [p[0], p[1], p[2] + kh]; }, mid = t => { const p = at(t); return [p[0], p[1], p[2] + kh * 0.5]; };
    tube(out, top(0), top(1), rr, col, 12); tube(out, mid(0), mid(1), rr * 0.8, col, 10);
    const sp = Math.max(0.5, Math.min(2.0, cm(+e.dik || 150))), nP = Math.max(1, Math.ceil(L2 / sp));
    for (let i = 0; i <= nP; i++) { const p = at(i / nP); tube(out, [p[0], p[1], p[2]], [p[0], p[1], p[2] + kh], rp, col, 10); }
    if (e.tk !== 'H') { // tekmelik 150 mm
      const th = (e.km || '').startsWith('ctp') ? 0.01 : 0.004, hT = 0.15, d = norm2([B[0] - A[0], B[1] - A[1]]), nn = [-d[1] * th / 2, d[0] * th / 2], a = at(0), b = at(1);
      quadBox(out, [[a[0] - nn[0], a[1] - nn[1], a[2]], [b[0] - nn[0], b[1] - nn[1], b[2]], [b[0] + nn[0], b[1] + nn[1], b[2]], [a[0] + nn[0], a[1] + nn[1], a[2]], [a[0] - nn[0], a[1] - nn[1], a[2] + hT], [b[0] - nn[0], b[1] - nn[1], b[2] + hT], [b[0] + nn[0], b[1] + nn[1], b[2] + hT], [a[0] + nn[0], a[1] + nn[1], a[2] + hT]], col);
    }
    return Math.hypot(L2, zB - zA);
  };
  /* ---------- 3B ağ ---------- */
  const buildMesh = e => {
    const out = I_().newMesh(), Q = { beton: 0, kalip: 0, kork: 0, izg: 0, limon: 0, basamak: 0 };
    if (e.spiral) return buildSpiral(e, out, Q);
    const G = geom(e), hw = G.w / 2, t = cm(+e.t || 0), dolu = !(t > 0), tip = e.tip || 'beton', kc = (KM[e.km] || KM.galvaniz)[1];
    const tread = tip === 'ctp' ? COL.ctp : COL.izg, limonC = tip === 'ctp' ? COL.ctpK : COL.izgK, nos = cm(+e.nos || 0);
    const sides = e.kork === 'yok' ? [] : e.kork === 'sol' ? [1] : e.kork === 'sag' ? [-1] : [1, -1];
    const rIn = tip === 'beton' ? hw - 0.06 : hw + 0.05; // korkuluk ekseni
    G.pieces.forEach((pc, pi) => {
      if (pc.kind === 'kol') {
        const tanA = pc.h / pc.b, cosA = Math.cos(Math.atan(tanA));
        for (let j = 0; j < pc.n - 1; j++) {
          const s0 = j * pc.b - (j > 0 ? nos : 0), s1 = (j + 1) * pc.b, zt = pc.z + (j + 1) * pc.h; Q.basamak++;
          if (tip === 'beton') {
            const zb = s => dolu ? G.z0 : Math.max(dolu ? G.z0 : pc.z - (pi === 0 ? 0 : t), pc.z + s * tanA - t / cosA);
            const zb0 = Math.min(zt - 0.02, zb(Math.max(0, s0))), zb1 = Math.min(zt - 0.02, zb(s1));
            sbox(out, pc, Math.max(0, s0), s1, -hw, hw, zb0, zb1, zt, zt, COL.beton, false);
            Q.beton += (s1 - Math.max(0, s0)) * G.w * (zt - (zb0 + zb1) / 2);
            // kenar çizgileri: burun ve rıht
            out.edges3.push([Wd(pc, Math.max(0, s0), -hw, zt), Wd(pc, Math.max(0, s0), hw, zt)], [Wd(pc, j * pc.b, -hw, zt - pc.h), Wd(pc, j * pc.b, hw, zt - pc.h)], [Wd(pc, Math.max(0, s0), -hw, zt), Wd(pc, s1, -hw, zt)], [Wd(pc, Math.max(0, s0), hw, zt), Wd(pc, s1, hw, zt)], [Wd(pc, j * pc.b, -hw, zt - pc.h), Wd(pc, j * pc.b, -hw, zt)], [Wd(pc, j * pc.b, hw, zt - pc.h), Wd(pc, j * pc.b, hw, zt)]);
          } else { // ızgara basamak (30 mm), limonlar arası
            sbox(out, pc, s0 + 0.005, s1 - 0.005, -hw + 0.01, hw - 0.01, zt - 0.03, zt - 0.03, zt, zt, tread, true); Q.izg += (s1 - s0) * G.w;
            if (tip === 'ctp' || e.rk === 'E') sbox(out, pc, s0 + 0.02, s0 + 0.03, -hw + 0.01, hw - 0.01, zt - pc.h, zt - pc.h, zt - 0.03, zt - 0.03, tread); // kapalı rıht levhası (isteğe bağlı)
          }
        }
        // son rıht: üst sahanlık / döşeme kenarı
        if (tip === 'beton') { const s0 = (pc.n - 1) * pc.b, zt = pc.z + pc.n * pc.h; out.edges3.push([Wd(pc, s0, -hw, zt - pc.h), Wd(pc, s0, hw, zt - pc.h)]); }
        // plaklı merdivende alt yüz, sonraki sahanlığın alt yüzüne kavuşana kadar sahanlığın altında devam eder (birleşimde basamaklanma olmaz)
        if (tip === 'beton' && !dolu && pi < G.pieces.length - 1) {
          const sE = (pc.n - 1) * pc.b, zbE = pc.z + sE * tanA - t / cosA, zL = pc.z + pc.n * pc.h - t;
          if (zL - zbE > 1e-3 && tanA > 1e-6) { const sI = sE + (zL - zbE) / tanA; sbox(out, pc, sE, sI, -hw, hw, zbE, zL, zL, zL, COL.beton, false); Q.beton += 0.5 * (sI - sE) * (zL - zbE) * G.w; out.edges3.push([Wd(pc, sI, -hw, zL), Wd(pc, sI, hw, zL)]); }
        }
        if (tip !== 'beton') { // limonlar (UPN 200 / CTP U 200), alt uç zemine oturur
          const dep = 0.2, th = 0.075;
          for (const sg of [1, -1]) { const o0 = sg > 0 ? hw : -hw - th, o1 = sg > 0 ? hw + th : -hw, sEnd = pc.len + pc.b * 0.3, zTop0 = pc.z + pc.h * 0.6, zTop1 = pc.z + pc.h + sEnd * tanA + 0.03;
            sbox(out, pc, -0.05, sEnd, o0, o1, pc.z, zTop1 - dep / cosA, zTop0 + 0.05, zTop1, limonC, true); Q.limon += Math.hypot(sEnd, zTop1 - pc.z); }
        }
        // korkuluk
        for (const sg of sides) {
          const o = sg * rIn, A = Wd(pc, 0.03, o, 0), B = Wd(pc, pc.len - 0.03, o, 0), zA = pc.z + pc.h, zB = pc.z + pc.n * pc.h;
          Q.kork += railRun(out, A, B, zA, zB, e, kc, true);
          if (+e.uz > 0 && pi === G.pieces.length - 1 && !e.uzTopOff) { const uz = cm(+e.uz), C2 = Wd(pc, pc.len + uz, o, 0); tube(out, [B[0], B[1], zB + cm(+e.kh || 110)], [C2[0], C2[1], zB + cm(+e.kh || 110)], 0.0213, kc, 10); } // küpeşte uzatma (üst)
          if (+e.uz > 0 && pi === 0) { const uz = cm(+e.uz), C0 = Wd(pc, -uz, o, 0); tube(out, [C0[0], C0[1], zA + cm(+e.kh || 110) - pc.h], [A[0], A[1], zA + cm(+e.kh || 110)], 0.0213, kc, 10); }
        }
      } else { // sahanlık
        const zt = pc.z, hw = pc.w / 2;
        if (tip === 'beton') { const zb = dolu ? G.z0 : zt - t; sbox(out, pc, 0, pc.len, -hw, hw, zb, zb, zt, zt, COL.beton, true); Q.beton += pc.len * pc.w * (zt - zb); }
        else {
          sbox(out, pc, 0, pc.len, -hw, hw, zt - 0.03, zt - 0.03, zt, zt, tread, true); Q.izg += pc.len * pc.w;
          for (const [s0, s1, o0, o1] of [[0, pc.len, -hw - 0.075, -hw], [0, pc.len, hw, hw + 0.075], [-0.075, 0, -hw - 0.075, hw + 0.075], [pc.len, pc.len + 0.075, -hw - 0.075, hw + 0.075]]) sbox(out, pc, s0, s1, o0, o1, zt - 0.2, zt - 0.2, zt - 0.03, zt - 0.03, limonC, true); // çerçeve
          if (zt - G.z0 > 0.3 && !pc.bot) for (const [s, o] of [[0.05, -hw], [0.05, hw], [pc.len - 0.05, -hw], [pc.len - 0.05, hw]]) sbox(out, pc, s - 0.05, s + 0.05, o - 0.05, o + 0.05, G.z0, G.z0, zt - 0.2, zt - 0.2, COL.cel, true); // ayaklar (□100)
        }
        if (sides.length && !(pc.top && e.usKork === 'H')) { // serbest kenarlarda korkuluk: kola bağlanan kenarlar hariç (usKork=H: üst sahanlık başka yapıya bağlı, korkuluğu orada)
          const cs = [[0, -hw], [pc.len, -hw], [pc.len, hw], [0, hw]].map(([s, o]) => Wd(pc, s, o, 0)), prevEnd = pc.bot ? null : pc.o, nextStart = pc.bot ? [pc.o[0] + pc.u[0] * pc.len, pc.o[1] + pc.u[1] * pc.len] : (G.pieces[pi + 1] || {}).o;
          for (let k = 0; k < 4; k++) { const a = cs[k], b = cs[(k + 1) % 4], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            if (prevEnd && Math.hypot(m[0] - prevEnd[0], m[1] - prevEnd[1]) < 0.05 + 1e-6 && !pc.strip) continue; if (pc.bot) { if (k === 1) continue; if (k === 3) continue; } if (nextStart && Math.hypot(m[0] - nextStart[0], m[1] - nextStart[1]) < G.w / 2 + 0.06 && Math.abs(Math.hypot(b[0] - a[0], b[1] - a[1]) - G.w) < 0.02) continue;
            if (pc.strip && (k === 1 || k === 3)) continue;
            const ins = 0.06, d = norm2([b[0] - a[0], b[1] - a[1]]), nI = [-d[1] * ins, d[0] * ins]; // içeri al
            Q.kork += railRun(out, [a[0] + nI[0], a[1] + nI[1]], [b[0] + nI[0], b[1] + nI[1]], zt, zt, e, kc, false); }
        }
      }
    });
    e._q = Q; return out;
  };
  const buildSpiral = (e, out, Q) => {
    const G = spiralGeom(e), c = G.c, tip = e.tip || 'beton', kc = (KM[e.km] || KM.galvaniz)[1], tread = tip === 'ctp' ? COL.ctp : tip === 'izgara' ? COL.izg : COL.beton;
    const P2 = (a, r) => [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
    tube(out, [c[0], c[1], G.z0], [c[0], c[1], G.zTop + 0.1], G.r0, tip === 'beton' ? COL.beton : COL.cel, 20); // orta direk / göbek
    for (let j = 0; j < G.n; j++) {
      const a0 = G.a0 + j * G.dA, a1 = a0 + G.dA * 1.08, zt = G.z0 + (j + 1) * G.h, th = tip === 'beton' ? Math.min(0.2, G.h) : 0.03;
      const q = [P2(a0, G.r0), P2(a0, G.r1), P2(a1, G.r1), P2(a1, G.r0)];
      quadBox(out, [...q.map(p => [p[0], p[1], zt - th]), ...q.map(p => [p[0], p[1], zt])].map((p, i) => p), tread, true); Q.basamak++;
      if (tip === 'beton') Q.beton += Math.abs(G.dA) * (G.r1 ** 2 - G.r0 ** 2) / 2 * th;
      else Q.izg += Math.abs(G.dA) * (G.r1 ** 2 - G.r0 ** 2) / 2;
    }
    if (e.kork !== 'yok') { // dış kenar korkuluk: helis küpeşte + dikmeler
      const kh = cm(+e.kh || 110), rr = G.r1 - 0.05, N = G.n * 3; let prevT = null, prevM = null;
      for (let i = 0; i <= N; i++) { const t = i / N, a = G.a0 + t * G.n * G.dA, z = G.z0 + G.h + t * (G.n - 1) * G.h, p = P2(a, rr), top = [p[0], p[1], z + kh], md = [p[0], p[1], z + kh * 0.5]; if (prevT) { tube(out, prevT, top, 0.0213, kc, 8); tube(out, prevM, md, 0.017, kc, 8); } prevT = top; prevM = md; if (i % 3 === 0) tube(out, [p[0], p[1], z], top, 0.0213, kc, 8); }
      Q.kork += Math.hypot(Math.abs(G.n * G.dA) * rr, G.n * G.h);
    }
    e._q = Q; return out;
  };
  /* ---------- plan çizimi ---------- */
  const prims = e => {
    const out = [], th = C.annoH(2), z = p => [p[0], p[1], 0];
    if (e.spiral) {
      const G = spiralGeom(e), c = G.c; out.push(CI([c[0], c[1], 0], G.r1, { lw: 35 }), CI([c[0], c[1], 0], G.r0, { lw: 25 }));
      for (let j = 0; j <= G.n; j++) { const a = G.a0 + j * G.dA; out.push(L([c[0] + Math.cos(a) * G.r0, c[1] + Math.sin(a) * G.r0, 0], [c[0] + Math.cos(a) * G.r1, c[1] + Math.sin(a) * G.r1, 0], { lw: 18 })); }
      const wl = []; for (let j = 0; j <= G.n * 2; j++) { const a = G.a0 + j / 2 * G.dA; wl.push([c[0] + Math.cos(a) * G.rw, c[1] + Math.sin(a) * G.rw, 0]); } out.push(P(wl, false, { lw: 13 }));
      const aE = G.a0 + G.n * G.dA, pE = [c[0] + Math.cos(aE) * G.rw, c[1] + Math.sin(aE) * G.rw];
      out.push(TX([c[0] + G.r1 + th, c[1], 0], th, `HELEZON MERDİVEN  ${G.n} × ${M.fmt(G.h * 100, 1)} cm  YUKARI`, 0, 'L'), CI([pE[0], pE[1], 0], th * 0.3, { lw: 25 }));
      return out;
    }
    const G = geom(e), hw = G.w / 2;
    G.pieces.forEach(pc => {
      const hw = pc.w / 2, cs = [[0, -hw], [pc.len, -hw], [pc.len, hw], [0, hw]].map(([s, o]) => Wd(pc, s, o, 0)); out.push(P(cs, true, { lw: 35 }));
      if (pc.kind === 'kol') for (let j = 1; j < pc.n; j++) out.push(L(Wd(pc, j * pc.b, -hw, 0), Wd(pc, j * pc.b, hw, 0), { lw: 18 }));
      if (e.kork !== 'yok') for (const sg of (e.kork === 'sol' ? [1] : e.kork === 'sag' ? [-1] : [1, -1])) { const o = sg * (hw - 0.06); out.push(L(Wd(pc, 0, o, 0), Wd(pc, pc.len, o, 0), { lw: 9, lt: 'DASHED' })); }
    });
    // yürüme çizgisi ve YUKARI oku
    const wl = []; G.pieces.filter(pc => !pc.top && !pc.bot).forEach(pc => { wl.push(Wd(pc, 0, 0, 0)); if (pc.kind === 'sah' && pc.lc) wl.push([pc.lc[0], pc.lc[1], 0]); wl.push(Wd(pc, pc.len, 0, 0)); });
    out.push(P(wl, false, { lw: 13 }), CI(wl[0], th * 0.35, { lw: 25 }));
    const kols = G.pieces.filter(p => p.kind === 'kol'), lp = kols[kols.length - 1] || G.pieces[G.pieces.length - 1], tip2 = Wd(lp, lp.len, 0, 0), bk = Wd(lp, lp.len - th * 1.2, th * 0.6, 0), bk2 = Wd(lp, lp.len - th * 1.2, -th * 0.6, 0);
    out.push(L(tip2, bk, { lw: 25 }), L(tip2, bk2, { lw: 25 }));
    // kesim (kırık) çizgisi: ilk kolda yürüme yüzeyinden 1.20 m yükseklikte
    const k0 = G.pieces.find(p => p.kind === 'kol'); if (k0) { const sc = Math.min(k0.len * 0.8, Math.max(0.3, (1.2 / k0.h) * k0.b)); out.push(P([Wd(k0, sc - 0.15, -hw, 0), Wd(k0, sc + 0.05, -0.1, 0), Wd(k0, sc - 0.05, 0.1, 0), Wd(k0, sc + 0.15, hw, 0)], false, { lw: 18 })); }
    const R = G.R, f0 = kols[0] || G.pieces[0]; out.push(TX(Wd(f0, 0.1, hw + th * 0.6, 0), th, `MERDİVEN ${R.n} × ${M.fmt(R.h * 100, 1)}/${M.fmt(R.b * 100, 1)} cm · b=${M.fmt(G.w * 100, 0)} cm · YUKARI`, Math.atan2(f0.u[1], f0.u[0]), 'L'));
    out.push(TX(Wd(f0, -0.15, -hw - th * 1.5, 0), th * 0.85, `±${M.fmt(G.z0, 2)}`, 0, 'L'), TX(Wd(lp, lp.len + 0.15, -hw - th * 1.5, 0), th * 0.85, `+${M.fmt(G.zTop, 2)}`, 0, 'L'));
    return out;
  };
  T.merdiven = {
    label: 'Merdiven', ifc: 'IfcStair',
    prims: e => prims(e),
    mesh: e => [buildMesh(e)],
    xf: (e, X) => { let dz = 0; try { const q = X.p([0, 0, 0]); dz = q && q.length > 2 ? (q[2] || 0) : 0; } catch (err) { } e.z0 = (+e.z0 || 0) + dz; e.z1 = (+e.z1 || 0) + dz; if (e.spiral) { const c = X.p([e.spiral.c[0], e.spiral.c[1], 0]), a = X.p([e.spiral.c[0] + Math.cos((+e.spiral.a0 || 0) * RAD), e.spiral.c[1] + Math.sin((+e.spiral.a0 || 0) * RAD), 0]); e.spiral = Object.assign({}, e.spiral, { c: [c[0], c[1]], a0: Math.atan2(a[1] - c[1], a[0] - c[0]) / RAD }); if (X.mir) e.spiral.yon = e.spiral.yon === 'CW' ? 'CCW' : 'CW'; } else e.pts = e.pts.map(q => X.p([q[0], q[1], 0]).slice(0, 2)); delete e._g; delete e._c; },
    snaps: e => { if (e.spiral) return [{ p: [e.spiral.c[0], e.spiral.c[1], +e.z0 || 0], k: 'cen' }]; const G = geom(e), out = (C.merdivenRailEnds ? C.merdivenRailEnds(e) : []).map(r => ({ p: r.p, k: 'end' })); G.pieces.forEach(pc => { for (const [s, o] of [[0, -pc.w / 2], [pc.len, -pc.w / 2], [pc.len, pc.w / 2], [0, pc.w / 2]]) out.push({ p: Wd(pc, s, o, pc.z), k: 'end' }); }); return out; },
    info: e => { if (!e._q) { try { C.meshes(e); } catch (er) { } } const G = e.spiral ? spiralGeom(e) : geom(e), R = G.R, Q = e._q || {}; const ok = R.blondel >= 0.60 && R.blondel <= 0.65 && R.h <= 0.18; return `${(TIP.find(t => t[0] === (e.tip || 'beton')) || [0, ''])[1]}${e.spiral ? ' (helezon)' : ''} · ${R.n} rıht × ${M.fmt(R.h * 100, 1)} cm · basamak ${M.fmt(R.b * 100, 1)} cm · 2h+b = ${M.fmt(R.blondel * 100, 1)} cm ${ok ? '✓' : '(!) 60–65 cm dışında'} · eğim ${M.fmt(R.alpha, 1)}° · genişlik ${M.fmt((e.spiral ? (G.r1 - G.r0) : G.w) * 100, 0)} cm · ${M.fmt(G.z0, 2)} → ${M.fmt(G.zTop, 2)}${!e.spiral ? ` · ${G.pieces.filter(p => p.kind === 'kol').length} kol, ${G.pieces.filter(p => p.kind === 'sah').length} sahanlık` : ''}${e.tip === 'beton' || !e.tip ? ` · beton ${M.fmt(Q.beton || 0, 2)} m³${+e.t > 0 ? '' : ' (zemine kadar dolu)'}` : ` · ızgara ${M.fmt(Q.izg || 0, 2)} m²`}${e.kork !== 'yok' ? ` · korkuluk ${M.fmt(Q.kork || 0, 1)} m (${(KM[e.km] || KM.galvaniz)[0]})` : ''}`; },
  };
  C.merdivenGeom = e => (e.spiral ? spiralGeom(e) : geom(e));
  /* korkuluk uçları (yürüme yüzeyi kotunda): ayrı KORKULUK ile birleşim için */
  C.merdivenRailEnds = e => { if (e.spiral || e.kork === 'yok') return []; const G = geom(e), hw = G.w / 2, rIn = (e.tip || 'beton') === 'beton' ? hw - 0.06 : hw + 0.05, sides = e.kork === 'sol' ? [1] : e.kork === 'sag' ? [-1] : [1, -1], kols = G.pieces.filter(p => p.kind === 'kol'), out = []; if (!kols.length) return out;
    const f = kols[0], l = kols[kols.length - 1]; for (const sg of sides) { const A = Wd(f, 0.03, sg * rIn, f.z + f.h), B = Wd(l, l.len - 0.03, sg * rIn, l.z + l.n * l.h); out.push({ p: A, end: 'alt', sg }, { p: B, end: 'ust', sg }); } return out; };
  C._mrd = { tube, railRun, quadBox, KM };
  C.merdivenMetraj = () => { const rows = []; for (const e of C.doc.ents) if (e.type === 'merdiven') { C.meshes(e); const Q = e._q || {}; rows.push({ id: e.id, ...Q }); } return rows; };
  /* kenar çizgisi seç: 3B'de bir elemanın kenarı, planda çizgi / çoklu çizgi / döşeme kenarı */
  const pickEdgeLine = async (I, msg) => {
    const in3 = C.views && C.views.v3 && C.views.v3.visible(); E.hover = 'edge'; E.noSnap = true; E.lastEdge = null;
    const p = await I.pt(msg); E.hover = null; E.noSnap = false; if (!p || typeof p === 'string') return null;
    if (E.lastEdge && E.lastEdge.a) { const ed = E.lastEdge; E.lastEdge = null; return { a: M.p3(ed.a), b: M.p3(ed.b), p: M.p3(ed.p || p) }; }
    // planda: tıklanan noktaya en yakın çizgi parçası (2B çizimler + 3B elemanların plan izleri)
    const tol = in3 ? 0.3 : Math.max(0.05, 10 / ((C.views && C.views.plan && C.views.plan.s) || 50)); let best = null, bd = tol;
    for (const e of C.doc.ents) { if (!C.layer(e.layer).on || e.type === 'merdiven') continue; let prs; try { prs = C.prims(e); } catch (er) { continue; } for (const pr0 of prs) for (const [a, b] of C.primSegs(pr0)) { const v = [b[0] - a[0], b[1] - a[1]], l2 = v[0] * v[0] + v[1] * v[1]; if (l2 < 1e-10) continue; let t = ((p[0] - a[0]) * v[0] + (p[1] - a[1]) * v[1]) / l2; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(a[0] + v[0] * t - p[0], a[1] + v[1] * t - p[1]); if (d < bd) { bd = d; const zt = e.type === 'plak' ? (+e.zt || 0) : (a[2] || 0); best = { a: [a[0], a[1], zt], b: [b[0], b[1], e.type === 'plak' ? zt : (b[2] || 0)], p: [p[0], p[1], zt] }; } } }
    if (!best) C.warn('Tıkladığınız yerde kenar çizgisi bulunamadı (3B\'de kenarın üstüne, planda çizginin üstüne tıklayın).'); return best;
  };
  /* ---------- komut ---------- */
  const FIELDS = [
    { k: 'tip', t: 'Merdiven tipi', opts: TIP, d: 'beton', al: ['TIP'] },
    { k: 'sekil', t: 'Şekil', opts: [['yol', 'Düz / L / U — yürüme çizgisini tıklayın (köşede sahanlık)'], ['helezon', 'Helezon (döner) — merkez ve başlangıç yönü']], d: 'yol', al: ['SEKIL'] },
    { k: 'z0', t: 'Alt kot (m) — 3B\'de yüzeye tıklarsanız oradan alınır', d: 0, al: ['Z0'] }, { k: 'z1', t: 'Üst kot (m)', d: 3.0, al: ['Z1'] },
    { k: 'w', t: 'Merdiven genişliği (cm)', d: 120, al: ['W'] }, { k: 'hmax', t: 'En büyük rıht (cm) — standart 17.5', d: 17.5, al: ['HMAX', 'RIHT'] },
    { k: 'b', t: 'Basamak genişliği (cm) — 0 = otomatik (2h + b = 63)', d: 0, al: ['B', 'BASAMAK'] }, { k: 'nos', t: 'Basamak burnu çıkıntısı (cm)', d: 0, al: ['NOS'] },
    { k: 't', t: 'Beton plak kalınlığı (cm) — 0 / boş = zemine kadar dolu', d: 0, al: ['T'] }, { k: 'sah', t: 'Sahanlık derinliği (cm) — 0 = merdiven genişliği', d: 0, al: ['SAH'] },
    { k: 'hiza', t: 'Tıkladığınız çizgi', opts: [['O', 'Merdiven ekseni'], ['L', 'Sol kenar'], ['R', 'Sağ kenar']], d: 'O', al: ['HIZA'] },
    { k: 'kork', t: 'Korkuluk', opts: [['iki', 'İki yanda'], ['sol', 'Yalnız sol'], ['sag', 'Yalnız sağ'], ['yok', 'Yok']], d: 'iki', al: ['KORK'] },
    { k: 'km', t: 'Korkuluk malzemesi', opts: o_(KM), d: 'galvaniz', al: ['KM'] }, { k: 'kh', t: 'Korkuluk yüksekliği (cm) — iş güvenliği 110', d: 110, al: ['KH'] },
    { k: 'dik', t: 'Dikme aralığı (cm)', d: 150, al: ['DIK'] }, { k: 'tk', t: 'Tekmelik (15 cm)', opts: [['E', 'Var'], ['H', 'Yok']], d: 'E', al: ['TK'] },
    { k: 'yer', t: 'Yerleştirme', opts: [['iki', 'İki yüzey seç: ALT yüzey (ör. tretuvar) + ÜST yüzey (ör. perde üstü) — en kolay'], ['nokta', 'Noktalarla: başlangıç + yön (köşede dönüş)'], ['altkenar', 'Kenar çizgisi seç: merdiven bu kenara OTURUR (alt, buradan çıkar)'], ['ustkenar', 'Kenar çizgisi seç: merdiven bu kenara ÇIKAR (üst, döşeme / platform kenarı)']], d: 'nokta', al: ['YER'] },
    { k: 'us', t: 'Üst sahanlık', opts: [['H', 'Yok'], ['E', 'Var']], d: 'H', al: ['US'] }, { k: 'usL', t: 'Üst sahanlık boyu — merdiven yönünde (cm, 0 = genişlik)', d: 120, al: ['USL'] }, { k: 'usW', t: 'Üst sahanlık eni (cm, 0 = merdiven genişliği)', d: 0, al: ['USW'] },
    { k: 'as', t: 'Alt sahanlık (başlangıçta)', opts: [['H', 'Yok'], ['E', 'Var']], d: 'H', al: ['AS'] }, { k: 'asL', t: 'Alt sahanlık boyu (cm, 0 = genişlik)', d: 0, al: ['ASL'] }, { k: 'asW', t: 'Alt sahanlık eni (cm, 0 = merdiven genişliği)', d: 0, al: ['ASW'] },
    { k: 'uz', t: 'Küpeşte uzatma (cm, uçlarda)', d: 30, al: ['UZ'] }, { k: 'rk', t: 'Çelik merdivende rıht levhası', opts: [['H', 'Açık rıht'], ['E', 'Kapalı rıht']], d: 'H', al: ['RK'] },
    { k: 'r1', t: 'Helezon: dış yarıçap (cm)', d: 100, al: ['R1'] }, { k: 'r0', t: 'Helezon: orta direk yarıçapı (cm)', d: 10, al: ['R0'] }, { k: 'yon', t: 'Helezon dönüş yönü', opts: [['CCW', 'Saat yönü tersi'], ['CW', 'Saat yönü']], d: 'CCW', al: ['YON'] },
  ];
  const propsOf = r => ({ us: r.us, usL: +r.usL || 0, usW: +r.usW || 0, as: r.as, asL: +r.asL || 0, asW: +r.asW || 0, tip: r.tip, z0: +r.z0, z1: +r.z1, w: cm(+r.w || 120), hmax: +r.hmax || 17.5, b: +r.b || 0, nos: +r.nos || 0, t: +r.t || 0, sah: +r.sah > 0 ? cm(+r.sah) : 0, hiza: r.hiza, kork: r.kork, km: r.km, kh: +r.kh || 110, dik: +r.dik || 150, tk: r.tk, uz: +r.uz || 0, rk: r.rk });
  C.addCommand(['MERDIVEN', 'STAIR', 'MERDİVEN'], 'Merdiven (Revit benzeri): betonarme, çelik ızgaralı ya da CTP; düz / L / U (köşede sahanlık) ya da helezon. Standart rıht ≤ 17.5 cm ve 2h + b = 63 cm ile otomatik basamak, genişlik, plak kalınlığı (0 = zemine kadar dolu), korkuluk (110 cm, ara küpeşte, 15 cm tekmelik) ve malzemesi (galvaniz, paslanmaz, CTP …).', async (I) => {
    if (!E.scriptMode) { const kvT = E.queue.filter(t => /^[A-Za-z0-9]+=/.test(t)); if (kvT.length) { E.queue = E.queue.filter(t => !kvT.includes(t)); const st = C.doc.set.insaat || (C.doc.set.insaat = {}), o = st.merdiven = Object.assign({}, st.merdiven || {}); for (const t of kvT) { const [k, v] = t.split('='); const f = FIELDS.find(f2 => C.up(f2.k) === C.up(k) || (f2.al || []).some(a2 => C.up(a2) === C.up(k))); if (f) o[f.k] = f.opts ? v : +v; } } } // şerit menü ön ayarı: pencere yine açılır
    const r = await I_().getParams('Merdiven', FIELDS, 'merdiven'); if (!r) return;
    const pr = propsOf(r); C.ensureLayer('INS_MERDIVEN', 30, 'CONTINUOUS', 25); pr.layer = 'INS_MERDIVEN';
    if (r.sekil === 'helezon') {
      const c = await I.pt('Helezon merdiven merkezi'); if (!c || typeof c === 'string') return;
      if (Math.abs(c[2] || 0) > 1e-6 && Math.abs(pr.z0) < 1e-9) { const d = pr.z1 - pr.z0; pr.z0 = +(+c[2]).toFixed(4); pr.z1 = pr.z0 + d; }
      const sp = { c: [c[0], c[1]], r0: cm(+r.r0 || 10), r1: cm(+r.r1 || 100), yon: r.yon, a0: 0 };
      E.base = c; E.preview = q => C.prims(Object.assign({ type: 'merdiven', spiral: Object.assign({}, sp, { a0: Math.atan2(q[1] - c[1], q[0] - c[0]) / RAD }) }, pr));
      const q = await I.pt('İlk basamağın yönü (başlangıç açısı)'); E.preview = null; E.base = null; if (!q || typeof q === 'string') return;
      sp.a0 = Math.atan2(q[1] - c[1], q[0] - c[0]) / RAD;
      const e = C.add(C.newEnt('merdiven', Object.assign({ spiral: sp }, pr))); delete e.sp; C.changed(); C.log(T.merdiven.info(e)); return;
    }
    if (r.yer === 'iki') { // alt yüzey + üst yüzey: kotlar yüzeylerden, merdiven alt tıklamanın hattında, üst tıklamaya varır
      const in3 = C.views && C.views.v3 && C.views.v3.visible(); E.hover = 'face';
      const B = await I.pt('1) ALT yüzeye tıklayın — merdivenin oturacağı yüzey ve hattı (ör. tretuvar ortası)'); E.hover = null; if (!B || typeof B === 'string') return;
      const H0 = pr.z1 - pr.z0; if (in3 || Math.abs(B[2] || 0) > 1e-6) pr.z0 = +(+(B[2] || 0)).toFixed(4);
      const dirOf = (T, F) => { let u = norm2([T[0] - B[0], T[1] - B[1]]); // üst yüzün en yakın kenarına paralelse (duvar boyunca) hizala
        if (F && F.pts && F.pts.length > 2) { let be = null, bd = Infinity; for (let i = 0; i < F.pts.length; i++) { const a = F.pts[i], b = F.pts[(i + 1) % F.pts.length], v = [b[0] - a[0], b[1] - a[1]], l2 = v[0] * v[0] + v[1] * v[1]; if (l2 < 1e-6) continue; let t = ((T[0] - a[0]) * v[0] + (T[1] - a[1]) * v[1]) / l2; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(a[0] + v[0] * t - T[0], a[1] + v[1] * t - T[1]); if (d < bd) { bd = d; be = norm2(v); } }
          if (be) { const c = u[0] * be[0] + u[1] * be[1]; if (Math.abs(c) > Math.cos(35 * RAD)) u = c > 0 ? be : [-be[0], -be[1]]; } }
        return u; };
      const mk = (T, F, z1) => { const p2 = Object.assign({}, pr, { z1 }); const R = rule(p2), Lf = (R.n - 1) * R.b, u = dirOf(T, F), tt = (T[0] - B[0]) * u[0] + (T[1] - B[1]) * u[1], Te = [B[0] + u[0] * tt, B[1] + u[1] * tt]; return { pts: [[Te[0] - u[0] * Lf, Te[1] - u[1] * Lf], Te], z1 }; };
      E.base = B; E.hover = 'face';
      E.preview = c => { if (!Array.isArray(c)) return []; const z1 = in3 && Math.abs((c[2] || 0) - pr.z0) > 0.2 ? c[2] : pr.z0 + H0; const F = in3 && C.faceTarget ? (() => { try { return C.faceTarget(c); } catch (er) { return null; } })() : null; const m = mk(c, F, z1); return C.prims(Object.assign({ type: 'merdiven' }, pr, { z1: m.z1, pts: m.pts })); };
      const Tp = await I.pt('2) ÜST yüzeye tıklayın — merdivenin çıkacağı yer (ör. perde üstü); merdiven duvara paralel hizalanır'); E.preview = null; E.base = null; E.hover = null; if (!Tp || typeof Tp === 'string') return;
      const F = in3 && C.faceTarget ? (() => { try { return C.faceTarget(Tp); } catch (er) { return null; } })() : null;
      pr.z1 = in3 || Math.abs(Tp[2] || 0) > 1e-6 ? +(+(Tp[2] || 0)).toFixed(4) : pr.z0 + H0; if (!(pr.z1 > pr.z0 + 0.15)) { C.warn('Üst yüzey alt yüzeyden yüksek olmalı (ya da 3B görünümde yüzeylere tıklayın).'); return; }
      const m = mk(Tp, F, pr.z1); const e = C.add(C.newEnt('merdiven', Object.assign({}, pr, { pts: m.pts }))); delete e.sp; C.changed();
      C.log(`Alt yüzey ${M.fmt(pr.z0, 2)} → üst yüzey ${M.fmt(pr.z1, 2)}: ` + T.merdiven.info(e)); return;
    }
    if (r.yer === 'altkenar' || r.yer === 'ustkenar') {
      const ed = await pickEdgeLine(I, r.yer === 'altkenar' ? 'Merdivenin OTURACAĞI kenar çizgisine tıklayın (merdiven ortası tıkladığınız yerde olur)' : 'Merdivenin ÇIKACAĞI üst kenar çizgisine tıklayın (döşeme / platform kenarı)'); if (!ed) return;
      const ev = [ed.b[0] - ed.a[0], ed.b[1] - ed.a[1]], el = Math.hypot(ev[0], ev[1]); if (el < 1e-6) { C.warn('Kenar çok kısa.'); return; }
      const eu = [ev[0] / el, ev[1] / el], ze = ((ed.a[2] || 0) + (ed.b[2] || 0)) / 2, t0 = Math.max(0, Math.min(el, (ed.p[0] - ed.a[0]) * eu[0] + (ed.p[1] - ed.a[1]) * eu[1])), pc = [ed.a[0] + eu[0] * t0, ed.a[1] + eu[1] * t0];
      if (!(+r.w > 0)) pr.w = el; // genişlik 0 = kenar boyu
      if (r.yer === 'altkenar') { const d = pr.z1 - pr.z0; pr.z0 = +ze.toFixed(4); if (!(pr.z1 > pr.z0 + 0.2)) pr.z1 = pr.z0 + Math.max(0.5, d); }
      else { pr.z1 = +ze.toFixed(4); if (!(pr.z0 < pr.z1 - 0.2)) pr.z0 = 0 < pr.z1 - 0.2 ? 0 : pr.z1 - 3; }
      const mkPts = q => { const nn = [-eu[1], eu[0]], sg = Math.sign((q[0] - pc[0]) * nn[0] + (q[1] - pc[1]) * nn[1]) || 1, u = [nn[0] * sg, nn[1] * sg];
        if (r.yer === 'altkenar') return [pc, [pc[0] + u[0], pc[1] + u[1]]];
        const R = rule(Object.assign({}, pr)), Lf = (R.n - 1) * R.b; return [[pc[0] + u[0] * Lf, pc[1] + u[1] * Lf], pc]; };
      E.base = [pc[0], pc[1], ze]; E.preview = q => C.prims(Object.assign({ type: 'merdiven', pts: mkPts(q) }, pr, { us: r.yer === 'ustkenar' ? 'H' : pr.us }));
      const q = await I.pt('Merdivenin hangi tarafa uzanacağı: kenarın o yanına tıklayın'); E.preview = null; E.base = null; if (!q || typeof q === 'string') return;
      if (r.yer === 'ustkenar') pr.us = 'H'; // üst kenar zaten döşeme / platform
      const e = C.add(C.newEnt('merdiven', Object.assign({ pts: mkPts(q) }, pr))); delete e.sp; C.changed(); C.log(`${r.yer === 'altkenar' ? 'Kenara oturtuldu' : 'Üst kenara bağlandı'} (kenar kotu ${M.fmt(ze, 2)}). ` + T.merdiven.info(e)); return;
    }
    const pts = [];
    const p0 = await I.pt('Merdiven başlangıcı (ilk rıht, alt kot) — 3B\'de yüzeye tıklarsanız alt kot oradan alınır'); if (!p0 || typeof p0 === 'string') return;
    if (Math.abs(p0[2] || 0) > 1e-6 && Math.abs(pr.z0) < 1e-9) { const d = pr.z1 - pr.z0; pr.z0 = +(+p0[2]).toFixed(4); pr.z1 = pr.z0 + d; }
    pts.push([p0[0], p0[1]]);
    for (; ;) {
      E.base = [pts[pts.length - 1][0], pts[pts.length - 1][1], pr.z0]; E.preview = c => C.prims(Object.assign({ type: 'merdiven', pts: pts.concat([[c[0], c[1]]]) }, pr));
      const q = await E.ask('pt', pts.length === 1 ? 'Çıkış yönü (kol boyu standarda göre hesaplanır)' : 'Dönüş: sonraki kolun yönü (köşede sahanlık) — Enter bitir', { kw: pts.length > 1 ? [['G', 'Geri al']] : [] });
      E.preview = null; E.base = null;
      if (q === 'G') { pts.pop(); continue; } if (!Array.isArray(q)) break;
      pts.push([q[0], q[1]]); if (E.scriptMode && !E.queue.length) break;
    }
    if (pts.length < 2) return;
    const e = C.add(C.newEnt('merdiven', Object.assign({ pts }, pr))); delete e.sp; C.changed();
    C.log(T.merdiven.info(e));
  });
  (C.PROPFIELDS = C.PROPFIELDS || {}).merdiven = /* ui.js özellik tablosunu kurarken bu kaydı korur */ [['tip', 'Tip (beton / izgara / ctp)', 's'], ['z0', 'Alt kot (m)'], ['z1', 'Üst kot (m)'], ['w', 'Genişlik (m)'], ['hmax', 'En büyük rıht (cm)'], ['b', 'Basamak (cm, 0 = oto)'], ['t', 'Plak kalınlığı (cm, 0 = dolu)'], ['sah', 'Sahanlık (m, 0 = genişlik)'], ['kork', 'Korkuluk (iki / sol / sag / yok)', 's'], ['km', 'Korkuluk malzemesi (galvaniz / paslanmaz / paslanmaz316 / ctp_sari / ctp_gri / ctp_yesil / boyali / boyali_sari / aluminyum / ahsap)', 's'], ['kh', 'Korkuluk yüksekliği (cm)'], ['dik', 'Dikme aralığı (cm)'], ['tk', 'Tekmelik (E / H)', 's'], ['uz', 'Küpeşte uzatma (cm)'], ['nos', 'Burun çıkıntısı (cm)']];
  C.on('change', () => { if (!C.doc) return; for (const e of C.doc.ents) if (e.type === 'merdiven') delete e._g; });
})(window.C);

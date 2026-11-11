/* ArıtmaCAD — MEKANİK TESİSAT · HAVALANDIRMA, HAVA KANALLARI, ROOFTOP
   Havalandırma ihtiyacı (mahal): hava değişim sayısı (V = n·hacim), kişi başına taze hava, ortam ısı yükü (V = Q / (0,335·Δt)) — en büyüğü.
   Sistemler: duvar tipi aksiyel aspiratör · çatı tipi fan · küçük kanal / pencere tipi aspiratör · hücreli fan + egzoz kanalları (merkezi) · doğal.
     Taze hava girişi için panjur serbest alanı. Fan modeli tipik katalog kademesinden seçilir.
   Rooftop (paket klima): soğutulan mahallere besleme havası V = Qduyulur / (0,335·Δt), cihaz soğutma / ısıtma kapasitesi, difüzörler ve besleme kanalları.
   Kanal hesabı: eşit sürtünme (R ≤ Rmax Pa/m, v ≤ vmax), dikdörtgen kesit a×b (yükseklik ≤ hmax), eşdeğer çap De = 1,3·(ab)^0,625 / (a+b)^0,25.
   Nesneler: mthv { kind: duvarfan | catifan | kanalfan | hucrefan | panjur | menfez | difuzor | rooftop, p, ang, model, V, mid, z0 }
             mtkanal { pts, a, b (mm), V (m³/h), v, R, sys: egzoz | besleme, z0 }
   Komutlar: HAVALANDIRMA, HUCREFANYERI, ROOFTOP, ROOFTOPYERI, HAVALANDIRMASIL */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, V = C.MTV, MT = C.MT, { L, P, TX, CI } = C.prim || {};
  const f = (v, d = 2) => (isFinite(v) ? (+v).toFixed(d) : '—').replace('.', ',');
  const fi = v => isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—';
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  /* ---------- veriler ---------- */
  /* mahal tipine göre (V.MAHAL sırası): [hava değişim sayısı 1/h, kişi başına taze hava aranır mı, varsayılan mekanik mi] */
  const HVT = [[3, 1, 0], [6, 1, 1], [1, 0, 0], [1, 0, 0], [8, 1, 1], [15, 0, 1], [8, 0, 1], [10, 0, 1], [8, 0, 1], [2, 0, 0], [1, 0, 0], [8, 1, 1], [4, 1, 0], [6, 0, 1], [2, 0, 0], [10, 0, 1], [0, 0, 0], [6, 0, 1], [12, 0, 1], [10, 0, 1], [15, 0, 1], [10, 0, 1], [10, 0, 1], [12, 0, 1], [12, 0, 1]];
  /* tipik fan kademeleri: [anma ölçüsü, debi m³/h, güç W] */
  const FAN = {
    duvar: { ad: 'Duvar tipi aksiyel aspiratör', l: [['Ø200', 700, 40], ['Ø250', 1200, 60], ['Ø300', 1900, 90], ['Ø350', 2900, 140], ['Ø400', 4200, 200], ['Ø450', 5800, 300], ['Ø500', 7800, 450], ['Ø560', 10500, 650], ['Ø630', 14500, 1000], ['Ø710', 19500, 1500], ['Ø800', 26000, 2200]] },
    cati: { ad: 'Çatı tipi radyal fan', l: [['Ø250', 900, 80], ['Ø310', 1700, 150], ['Ø355', 2600, 250], ['Ø400', 3800, 370], ['Ø450', 5200, 550], ['Ø500', 7000, 750], ['Ø560', 9500, 1100], ['Ø630', 13000, 1500], ['Ø710', 17500, 2200]] },
    kanal: { ad: 'Kanal / pencere tipi küçük aspiratör', l: [['Ø100', 90, 15], ['Ø125', 180, 25], ['Ø150', 300, 35], ['Ø200', 550, 70], ['Ø250', 900, 120]] },
    hucre: { ad: 'Hücreli (kabinli) radyal fan', l: [1000, 1500, 2500, 3500, 5000, 7500, 10000, 15000, 20000, 30000, 40000].map(v => ['HF-' + v, v, 0]) },
  };
  const MOTOR = [0.18, 0.25, 0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30];
  const ROOFTOP = [10, 15, 20, 25, 30, 40, 50, 60, 75, 90, 110, 130, 150, 200, 250, 300];
  const TERM = [[150, 150], [225, 300], [300, 550], [375, 800], [450, 1100], [600, 1700]]; // difüzör / menfez kenarı mm, en büyük debi m³/h
  const TURAD = { duvar: 'Duvar tipi aspiratör', cati: 'Çatı fanı', kanal: 'Küçük aspiratör', hucre: 'Hücreli fan + kanal', dogal: 'Doğal havalandırma', rooftop: 'Rooftop besleme havası', yok: '—' };
  MT.HVTUR = TURAD; MT.FAN = FAN;
  MT.hv = () => { const m = MT.set(); if (!m.hv) m.hv = {}; const k = m.hv, d = { dT: 8, Rmax: 1.0, vAna: 7, vDal: 4.5, hmax: 400, panjurV: 2.5, dTbes: 10, rtL: 0 }; for (const q in d) if (k[q] == null) k[q] = d[q]; return k; };
  const hvs = () => C.doc.ents.filter(e => e.type === 'mthv'), kanallar = () => C.doc.ents.filter(e => e.type === 'mtkanal');
  const ustKat = (e, all) => !all.some(o => (+o.z0 || 0) > (+e.z0 || 0) + 0.5 && MT.inPoly(e.lp || MT.icNokta(e.pts), o.pts));

  /* ---------- ihtiyaç ---------- */
  MT.hvIhtiyac = (e, all, m) => {
    all = all || MT.mahaller(); m = m || MT.set(); const k = MT.hv(), t = HVT[e.tip || 0] || HVT[0], A = MT.alan(e), h = +e.h || m.hKat, hac = A * h, u = MT.kulOf ? MT.kulOf(e) : { kisi: 0, sog: false };
    const ach = e.hvAch != null && e.hvAch !== '' ? +e.hvAch : t[0], Vach = ach * hac, Vkisi = t[1] ? u.kisi * (MT.sog ? MT.sog().tazeKisi : 36) : 0, Visi = (+e.hvIsi || 0) > 0 ? (+e.hvIsi) * 1000 / (0.335 * k.dT) : 0;
    const Vv = Math.max(Vach, Vkisi, Visi), yontem = Vv <= 0 ? '—' : Vv === Visi ? 'ısı yükü' : Vv === Vkisi ? 'kişi' : 'hava değişimi';
    let tur = e.hvTur && e.hvTur !== 'oto' ? e.hvTur : null; const dis = (e.yuz || []).some(y => y.k === 'dis');
    if (!tur) { if (MT.sog && MT.sog().sistem === 'rooftop' && u.sog) tur = 'rooftop'; else if (!t[2] && !Visi) tur = 'dogal'; else if (Vv <= 0) tur = 'yok'; else if (dis) tur = Vv <= 500 ? 'kanal' : 'duvar'; else tur = ustKat(e, all) ? 'cati' : 'hucre'; }
    return { ach, hac, Vach, Vkisi, Visi, V: Vv, yontem, tur, dis, achGer: hac ? Vv / hac : 0 };
  };
  const fanSec = (tur, Vv) => { const Lf = FAN[tur].l, mx = Lf[Lf.length - 1][1], n = Math.max(1, Math.ceil(Vv / mx)), s = Lf.find(x => x[1] >= Vv / n) || Lf[Lf.length - 1]; return { n, model: s[0], Vn: s[1], P: s[2] }; };
  const terminal = Vt => (TERM.find(x => x[1] >= Vt) || TERM[TERM.length - 1])[0];

  /* ---------- kanal boyutu ---------- */
  MT.kanalSec = (Vh, ana, k) => {
    k = k || MT.hv(); const Q = Vh / 3600, vmax = ana ? k.vAna : k.vDal, rho = 1.2, nu = 15.1e-6, eps = 0.00015, Rof = D => { const v = Q / (Math.PI * D * D / 4), Re = v * D / nu, fr = Re < 2300 ? 64 / Math.max(Re, 1) : 0.25 / Math.pow(Math.log10(eps / (3.7 * D) + 5.74 / Math.pow(Re, 0.9)), 2); return { v, R: fr / D * rho * v * v / 2 }; };
    let D = 0.08; while (D < 3) { const r = Rof(D); if (r.R <= k.Rmax && r.v <= vmax) break; D += 0.005; }
    const De = (a, b) => 1.3 * Math.pow(a * b, 0.625) / Math.pow(a + b, 0.25); let best = null;
    for (const b of [100, 150, 200, 250, 300, 350, 400, 500, 600, 800].filter(x => x <= Math.max(100, k.hmax))) { let a = b; while (De(a / 1000, b / 1000) < D && a < 4000) a += 50; if (a / b > 4 && b < k.hmax) continue; if (!best || a * b < best.a * best.b) best = { a, b }; }
    if (!best) { const b = k.hmax; let a = b; while (De(a / 1000, b / 1000) < D && a < 6000) a += 50; best = { a, b }; }
    const de = De(best.a / 1000, best.b / 1000), r = Rof(de); return { a: best.a, b: best.b, De: de, D, v: Q / (best.a * best.b / 1e6), R: r.R, V: Vh };
  };

  /* ---------- nesneler ---------- */
  if (T) {
    const REN = { egzoz: 30, besleme: 5 };
    T.mthv = {
      label: 'Havalandırma elemanı',
      prims: e => { const z = +e.z0 || 0, c = e.p, a = e.ang || 0, u = [Math.cos(a), Math.sin(a)], n = [-u[1], u[0]], pt = (s, o) => [c[0] + u[0] * s + n[0] * o, c[1] + u[1] * s + n[1] * o, z], h = C.annoH(2), out = [], col = e.sys === 'besleme' ? 5 : 30, etk = (s1, s2, dy) => { out.push(TX([c[0], c[1] + dy, z], h, s1, 0, 'MC', { color: col })); if (s2) out.push(TX([c[0], c[1] + dy - h * 1.5, z], h, s2, 0, 'MC', { color: 7 })); };
        const kare = (s, o) => P([[c[0] - s, c[1] - s, z], [c[0] + s, c[1] - s, z], [c[0] + s, c[1] + s, z], [c[0] - s, c[1] + s, z]], true, o);
        switch (e.kind) {
          case 'duvarfan': case 'kanalfan': { const r = e.kind === 'kanalfan' ? 0.12 : Math.max(0.15, (parseInt(String(e.model).replace(/\D/g, ''), 10) || 300) / 2000), t = (e.t || 0.2) / 2; out.push(P([pt(-r, -t), pt(r, -t), pt(r, t), pt(-r, t)], true, { lw: 30, color: col }), L(pt(-r, -t), pt(r, t), { lw: 18, color: col }), L(pt(-r, t), pt(r, -t), { lw: 18, color: col }), L(pt(0, -t), pt(0, -t - 0.45), { lw: 25, color: col }), L(pt(-0.08, -t - 0.3), pt(0, -t - 0.45), { lw: 25, color: col }), L(pt(0.08, -t - 0.3), pt(0, -t - 0.45), { lw: 25, color: col })); out.push(TX(pt(0, t + h * 1.4), h, `${e.no} ${e.model}`, 0, 'MC', { color: col }), TX(pt(0, t + h * 2.9), h, `${fi(e.V)} m³/h`, 0, 'MC', { color: 7 })); break; }
          case 'panjur': { const w = (e.w || 0.6) / 2, t = (e.t || 0.2) / 2; out.push(P([pt(-w, -t), pt(w, -t), pt(w, t), pt(-w, t)], true, { lw: 25, color: 3 })); for (let i = 0; i < 5; i++) { const s = -w + (2 * w) * (i + 0.5) / 5; out.push(L(pt(s - 0.04, -t), pt(s + 0.04, t), { lw: 13, color: 3 })); } out.push(TX(pt(0, t + h * 1.4), h, `Panjur ${e.model}`, 0, 'MC', { color: 3 })); break; }
          case 'catifan': { const r = Math.max(0.2, (parseInt(String(e.model).replace(/\D/g, ''), 10) || 400) / 1600); out.push(CI([c[0], c[1], z], r, { lw: 30, color: col }), CI([c[0], c[1], z], r * 0.55, { lw: 13, color: col }), L([c[0] - r, c[1] - r, z], [c[0] + r, c[1] + r, z], { lw: 13, color: col }), L([c[0] - r, c[1] + r, z], [c[0] + r, c[1] - r, z], { lw: 13, color: col })); etk(`${e.no} çatı fanı ${e.model}`, `${fi(e.V)} m³/h`, r + h * 2.6); break; }
          case 'hucrefan': { out.push(P([[c[0] - 0.5, c[1] - 0.35, z], [c[0] + 0.5, c[1] - 0.35, z], [c[0] + 0.5, c[1] + 0.35, z], [c[0] - 0.5, c[1] + 0.35, z]], true, { lw: 35, color: col }), CI([c[0], c[1], z], 0.22, { lw: 18, color: col })); etk(`${e.no} hücreli fan ${e.model}`, `${fi(e.V)} m³/h · ${fi(e.dp)} Pa · ${f(e.kW, 2)} kW`, 0.35 + h * 2.8); break; }
          case 'rooftop': { out.push(P([[c[0] - 1.1, c[1] - 0.7, z], [c[0] + 1.1, c[1] - 0.7, z], [c[0] + 1.1, c[1] + 0.7, z], [c[0] - 1.1, c[1] + 0.7, z]], true, { lw: 50, color: 5 }), CI([c[0] - 0.5, c[1], z], 0.35, { lw: 18, color: 5 }), CI([c[0] + 0.5, c[1], z], 0.35, { lw: 18, color: 5 })); out.push(TX([c[0], c[1] + 0.7 + h * 2.9, z], h * 1.2, `ROOFTOP ${e.model}`, 0, 'MC', { color: 2 }), TX([c[0], c[1] + 0.7 + h * 1.2, z], h, `${fi(e.V)} m³/h · soğutma ${f(e.Qs, 0)} kW · ısıtma ${f(e.Qi, 0)} kW`, 0, 'MC', { color: 7 })); break; }
          default: { const s = Math.max(0.1, (e.boy || 300) / 2000); out.push(kare(s, { lw: 25, color: col })); if (e.kind === 'difuzor') { out.push(kare(s * 0.6, { lw: 13, color: col }), L([c[0] - s, c[1] - s, z], [c[0] + s, c[1] + s, z], { lw: 13, color: col }), L([c[0] - s, c[1] + s, z], [c[0] + s, c[1] - s, z], { lw: 13, color: col })); } else for (let i = 1; i < 4; i++) out.push(L([c[0] - s, c[1] - s + 2 * s * i / 4, z], [c[0] + s, c[1] - s + 2 * s * i / 4, z], { lw: 13, color: col })); etk(`${e.boy}×${e.boy}`, `${fi(e.V)} m³/h`, -s - h * 1.2); }
        } return out; },
      snaps: e => [{ p: [e.p[0], e.p[1], +e.z0 || 0], k: 'ins' }],
      xf: (e, X) => { const q = X.p([e.p[0], e.p[1], 0]), q2 = X.p([e.p[0] + Math.cos(e.ang || 0), e.p[1] + Math.sin(e.ang || 0), 0]); e.p = [q[0], q[1]]; e.ang = Math.atan2(q2[1] - q[1], q2[0] - q[0]); },
      info: e => `${({ duvarfan: 'Duvar tipi aspiratör', kanalfan: 'Küçük aspiratör', catifan: 'Çatı fanı', hucrefan: 'Hücreli fan', panjur: 'Taze hava panjuru', menfez: 'Egzoz menfezi', difuzor: 'Besleme difüzörü', rooftop: 'Rooftop paket klima' })[e.kind] || e.kind} ${e.model || ''} · ${fi(e.V)} m³/h`,
    };
    T.mtkanal = {
      label: 'Hava kanalı',
      prims: e => { const z = +e.z0 || 0, o = e.a / 2000, col = REN[e.sys] || 30, off = s => e.pts.map((p, i) => { const a = e.pts[Math.max(0, i - 1)], b = e.pts[Math.min(e.pts.length - 1, i + 1)], l = M.dist2(a, b) || 1, n = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l], kk = (i > 0 && i < e.pts.length - 1) ? Math.SQRT2 : 1; return [p[0] + n[0] * s * kk, p[1] + n[1] * s * kk, z]; }), A = off(o), B = off(-o), out = [P(A, false, { lw: 35, color: col }), P(B, false, { lw: 35, color: col }), L(A[A.length - 1], B[B.length - 1], { lw: 35, color: col })];
        let bi = -1, bl = 0.8; for (let i = 1; i < e.pts.length; i++) { const l = M.dist2(e.pts[i - 1], e.pts[i]); if (l > bl) { bl = l; bi = i; } }
        if (bi > 0) { const a = e.pts[bi - 1], b = e.pts[bi], h = C.annoH(1.8); let ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > Math.PI / 2 + 1e-6 || ang <= -Math.PI / 2 + 1e-6) ang += Math.PI; const nx = -Math.sin(ang), ny = Math.cos(ang); out.push(TX([(a[0] + b[0]) / 2 + nx * (o + h * 0.9), (a[1] + b[1]) / 2 + ny * (o + h * 0.9), z], h, `${e.a}×${e.b}`, ang, 'MC', { color: 7 })); }
        return out; },
      snaps: e => e.pts.map(p => ({ p: [p[0], p[1], +e.z0 || 0], k: 'end' })),
      xf: (e, X) => { e.pts = e.pts.map(p => X.p([p[0], p[1], 0]).slice(0, 2)); },
      info: e => `${e.sys === 'besleme' ? 'Besleme' : 'Egzoz'} kanalı ${e.a}×${e.b} mm · ${fi(e.V)} m³/h · v=${f(e.v, 1)} m/s · R=${f(e.R, 2)} Pa/m`,
    };
  }

  /* ---------- kanal ağı: kökten terminallere, her kat için ---------- */
  const kanalAg = (root, terms, sys, k) => {
    const zs = [...new Set(terms.map(t => +t.z0 || 0))].sort((a, b) => a - b), katlar = [];
    for (const z of zs) {
      const lst = terms.filter(t => (+t.z0 || 0) === z).map(t => ({ p: t.p, cp: t.p, Qn: t.V, term: t })), N = MT._agac(root, lst), zincir = [], Vt = N[0].Q;
      const yuru = (j, c) => { const pts = [N[j].p, N[c].p]; let u = c; while (N[u].ch.length === 1 && !N[u].rad) { u = N[u].ch[0]; pts.push(N[u].p); } const Lz = pts.reduce((s, p, i) => i ? s + M.dist2(pts[i - 1], p) : 0, 0), b = MT.kanalSec(N[c].Q, N[c].Q > Vt * 0.5, k); zincir.push({ pts, V: N[c].Q, L: Lz, b, dp: b.R * Lz * 1.5, bas: j, son: u }); N[u].ch.forEach(x => yuru(u, x)); };
      N[0].ch.forEach(c => yuru(0, c));
      const up = new Map(); zincir.forEach((zc, i) => up.set(zc.son, i));
      const yol = n => { let dp = 0, u = n; while (u !== 0) { const i = up.get(u); if (i == null) { u = N[u].par; continue; } dp += zincir[i].dp; u = zincir[i].bas; } return dp; };
      katlar.push({ z, zincir: zincir.filter(q => q.L > 0.05), V: Vt, dpMax: Math.max(0, ...N.map((n, i) => n.rad ? yol(i) : 0)), sv: (terms.find(t => (+t.z0 || 0) === z) || {}).sv2 });
    }
    let dpS = 0; const saft = []; katlar.forEach((kt, i) => { if (!i) { kt.dpSaft = 0; return; } const Vs = katlar.slice(i).reduce((s, x) => s + x.V, 0), Lk = kt.z - katlar[i - 1].z, b = MT.kanalSec(Vs, true, k), dp = b.R * Lk * 1.5; dpS += dp; saft.push({ z0: katlar[i - 1].z, z1: kt.z, V: Vs, b, L: Lk, dp }); kt.dpSaft = dpS; });
    const Vtop = katlar.reduce((s, x) => s + x.V, 0), dpKrit = Math.max(0, ...katlar.map(kt => kt.dpMax + kt.dpSaft));
    return { katlar, saft, Vtop, dpKrit, sys };
  };
  const terminalYer = (e, n) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; e.pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }); const ux = (x1 - x0) >= (y1 - y0), c0 = MT.icNokta(e.pts), out = []; for (let i = 0; i < n; i++) { let p = ux ? [x0 + (x1 - x0) * (i + 0.5) / n, (y0 + y1) / 2 + 0.6] : [(x0 + x1) / 2 + 0.6, y0 + (y1 - y0) * (i + 0.5) / n]; if (!MT.inPoly(p, e.pts)) p = n === 1 ? c0 : [(p[0] + c0[0]) / 2, (p[1] + c0[1]) / 2]; if (!MT.inPoly(p, e.pts)) p = c0; out.push(p.map(v => +v.toFixed(3))); } return out; };
  const ekle = (list) => { const chg = C.changed; C.changed = () => { }; try { list.forEach(o => { const sv = o.sv2; delete o.sv2; const type = o._t || 'mthv'; delete o._t; o.dis = 'Mekanik'; o.layer = MT._lay(o.sys === 'besleme' ? 'MT_KLIMA_KANAL' : 'MT_HAVALANDIRMA', o.sys === 'besleme' ? 5 : 30, 30); const x = C.newEnt(type, o); if (sv != null) x.sv2 = sv; else delete x.sv2; C.add(x); }); } finally { C.changed = chg; } C.changed(); C.emit && C.emit('layers'); };
  const kanalEnt = (ag) => ag.katlar.flatMap(kt => kt.zincir.map(z => ({ _t: 'mtkanal', sys: ag.sys, pts: z.pts.map(p => [+p[0].toFixed(3), +p[1].toFixed(3)]), a: z.b.a, b: z.b.b, V: Math.round(z.V), v: +z.b.v.toFixed(2), R: +z.b.R.toFixed(2), z0: kt.z, sv2: kt.sv })));
  const motorSec = (Vh, dp) => { const kw = Vh / 3600 * dp / 0.55 / 1000 * 1.2; return MOTOR.find(x => x >= kw) || MOTOR[MOTOR.length - 1]; };

  /* ---------- havalandırma: fanlar, panjurlar, egzoz kanalları ---------- */
  MT.hvHesap = () => { const m = MT.set(), all = MT.mahaller(); return { m, k: MT.hv(), res: all.map(e => ({ e, r: MT.hvIhtiyac(e, all, m) })) }; };
  MT.hvYerlestir = (hucreP) => {
    const H = MT.hvHesap(), k = H.k, yeni = [], term = []; let no = 0;
    for (const { e, r } of H.res) {
      if (r.V <= 0 || r.tur === 'dogal' || r.tur === 'yok' || r.tur === 'rooftop') continue; const ccw = M.polyArea(e.pts) > 0, z0 = +e.z0 || 0, sv2 = e.sv != null ? e.sv : null, ys = (e.yuz || []).filter(y => y.k === 'dis').sort((a, b) => b.L - a.L);
      const duvarda = (y, s) => { const u = [(y.b[0] - y.a[0]) / y.L, (y.b[1] - y.a[1]) / y.L], n = ccw ? [u[1], -u[0]] : [-u[1], u[0]], t = y.t || 0.2; return { p: [y.a[0] + u[0] * s + n[0] * t / 2, y.a[1] + u[1] * s + n[1] * t / 2], ang: Math.atan2(u[1], u[0]) + (ccw ? 0 : Math.PI), t }; };
      let tur = r.tur; if ((tur === 'duvar' || tur === 'kanal') && !ys.length) tur = 'hucre';
      if (tur === 'duvar' || tur === 'kanal') {
        const fs = fanSec(tur, r.V), y = ys[0]; for (let i = 0; i < fs.n; i++) { const d = duvarda(y, y.L * (fs.n === 1 ? 0.78 : (i + 0.5) / fs.n)); yeni.push(Object.assign(d, { kind: tur === 'kanal' ? 'kanalfan' : 'duvarfan', no: 'AF' + (++no), model: fs.model, V: Math.round(r.V / fs.n), Vn: fs.Vn, W: fs.P, mid: e.id, z0, sv2, sys: 'egzoz' })); }
        /* taze hava panjuru: başka bir dış duvarda, yoksa aynı duvarın öbür ucunda */
        const Ap = r.V / 3600 / k.panjurV / 0.5, kenar = Math.max(0.3, Math.ceil(Math.sqrt(Ap) * 10) / 10), y2 = ys.find(q => q !== y && q.yon !== y.yon) || y, d2 = duvarda(y2, y2 === y ? y.L * 0.15 : y2.L / 2); yeni.push(Object.assign(d2, { kind: 'panjur', model: `${Math.round(kenar * 1000)}×${Math.round(kenar * 1000)}`, w: kenar, V: Math.round(r.V), A: +Ap.toFixed(2), mid: e.id, z0, sv2, sys: 'egzoz' }));
      } else if (tur === 'cati') { const fs = fanSec('cati', r.V), ps = terminalYer(e, fs.n); ps.forEach(p => yeni.push({ kind: 'catifan', p, no: 'ÇF' + (++no), model: fs.model, V: Math.round(r.V / fs.n), Vn: fs.Vn, W: fs.P, mid: e.id, z0, sv2, sys: 'egzoz' })); }
      else if (tur === 'hucre') { const n = Math.min(8, Math.max(1, Math.ceil(r.V / 1100), Math.ceil(MT.alan(e) / 40))), ps = terminalYer(e, n); ps.forEach(p => { const o = { kind: 'menfez', p, boy: terminal(r.V / n), V: Math.round(r.V / n), mid: e.id, z0, sv2, sys: 'egzoz' }; yeni.push(o); term.push(o); }); }
    }
    let ag = null, hf = null;
    if (term.length) { const eski = hvs().find(e => e.kind === 'hucrefan'), root = hucreP || (eski ? eski.p : (() => { let x = 0, y = 0; term.forEach(t => { x += t.p[0]; y += t.p[1]; }); return [x / term.length + 0.9, y / term.length + 0.9]; })()); ag = kanalAg(root, term, 'egzoz', k); const dp = Math.ceil((ag.dpKrit + 30 + 50 + 40) / 10) * 10, fs = FAN.hucre.l.find(x => x[1] >= ag.Vtop) || FAN.hucre.l[FAN.hucre.l.length - 1]; hf = { kind: 'hucrefan', p: root.map(v => +v.toFixed(3)), no: 'HF1', model: fs[0], V: Math.round(ag.Vtop), Vn: fs[1], dp, kW: motorSec(ag.Vtop, dp), z0: ag.katlar[ag.katlar.length - 1].z, sys: 'egzoz' }; yeni.push(hf); kanalEnt(ag).forEach(x => yeni.push(x)); }
    C.undoStack.push(C.snapshot()); const sil = new Set(C.doc.ents.filter(e => (e.type === 'mthv' || e.type === 'mtkanal') && e.sys !== 'besleme').map(e => e.id)); C.doc.ents = C.doc.ents.filter(e => !sil.has(e.id));
    if (yeni.length) ekle(yeni); else C.changed();
    return { n: yeni.filter(o => /fan$/.test(o.kind || '')).length, kanal: ag ? ag.katlar.reduce((s, x) => s + x.zincir.length, 0) : 0, ag, hf };
  };

  /* ---------- rooftop ---------- */
  MT.rooftopHesap = () => {
    if (!MT.kazancHesapla) return null; const kz = MT.kazancHesapla(), k = MT.hv(), ks = kz.k, m = kz.m, hes = MT.hesapla(); if (!kz.sg.length) return null;
    const oda = kz.sg.map(({ e, r }) => { const duy = Math.max(0, r.tepe.duy - r.tepe.tazeD) * (1 + ks.emniyet / 100), Vb = Math.max(duy / (0.335 * k.dTbes), r.taze), hk = hes.res.find(x => x.e === e); return { e, r, duy, V: Math.ceil(Vb / 10) * 10, taze: r.taze, Qh: hk ? hk.r.Q : 0 }; });
    const Vtop = oda.reduce((s, o) => s + o.V, 0), Vtaze = oda.reduce((s, o) => s + o.taze, 0), Qs = kz.Qblok / 1000, Qi = (oda.reduce((s, o) => s + o.Qh, 0) + 0.335 * Vtaze * (20 - m.td)) / 1000, kW = ROOFTOP.find(x => x >= Qs) || ROOFTOP[ROOFTOP.length - 1], adet = Math.max(1, Math.ceil(Qs / ROOFTOP[ROOFTOP.length - 1]));
    return { kz, k, oda, Vtop, Vtaze, Qs, Qi, kW, adet, tazeOran: Vtop ? Vtaze / Vtop : 0, oz: Qs ? Vtop / Qs : 0 };
  };
  MT.rooftopYerlestir = (rp) => {
    const R = MT.rooftopHesap(); if (!R) return null; const k = R.k, yeni = [], term = [];
    for (const o of R.oda) { const e = o.e, n = Math.min(10, Math.max(1, Math.ceil(o.V / 1100), Math.ceil(o.r.A / 25))), ps = terminalYer(e, n); ps.forEach(p => { const d = { kind: 'difuzor', p, boy: terminal(o.V / n), V: Math.round(o.V / n), mid: e.id, z0: +e.z0 || 0, sv2: e.sv != null ? e.sv : null, sys: 'besleme' }; yeni.push(d); term.push(d); }); }
    const eski = hvs().find(e => e.kind === 'rooftop'), root = rp || (eski ? eski.p : (() => { let x = 0, y = 0; term.forEach(t => { x += t.p[0]; y += t.p[1]; }); return [x / term.length, y / term.length + 1.2]; })());
    const ag = kanalAg(root, term, 'besleme', k), dp = Math.ceil((ag.dpKrit + 40 + 60) / 10) * 10, ust = ag.katlar[ag.katlar.length - 1];
    yeni.push({ kind: 'rooftop', p: root.map(v => +v.toFixed(3)), no: 'RT1', model: `${R.kW} kW`, V: Math.round(R.Vtop), Qs: R.kW, Qi: Math.ceil(R.Qi), dp, z0: ust.z, sv2: ust.sv, sys: 'besleme' }); kanalEnt(ag).forEach(x => yeni.push(x));
    C.undoStack.push(C.snapshot()); const sil = new Set(C.doc.ents.filter(e => (e.type === 'mthv' || e.type === 'mtkanal') && e.sys === 'besleme').map(e => e.id)); C.doc.ents = C.doc.ents.filter(e => !sil.has(e.id)); ekle(yeni);
    return Object.assign(R, { ag, dp, nDif: term.length });
  };
  /* çizili kanallardan özet (rapor için) */
  const kanalOzet = sys => kanallar().filter(e => e.sys === sys).map(e => ({ e, L: e.pts.reduce((s, p, i) => i ? s + M.dist2(e.pts[i - 1], p) : 0, 0) }));

  /* ---------- rapor ---------- */
  MT.raporEk = MT.raporEk || [];
  MT.raporEk.push(() => {
    const H = MT.hvHesap(), k = H.k, mek = H.res.filter(x => x.r.V > 0 && x.r.tur !== 'yok'); if (!mek.length) return ''; const U = hvs(), kn = kanalOzet('egzoz'), hf = U.find(e => e.kind === 'hucrefan'), fanlar = U.filter(e => /fan$/.test(e.kind) && e.sys !== 'besleme');
    let s = `<h2>11. Havalandırma</h2><p class="mut">Mahal hava ihtiyacı üç ölçütün en büyüğüdür: hava değişim sayısı (V = n·hacim), kişi başına taze hava ve ortam ısı yükünün atılması V = Q / (0,335·Δt), Δt = ${f(k.dT, 0)} K. Terfi ve arıtma yapılarında kuru hazne 6, ıslak hazne 12, kimyasal odası 15 hava değişimi/saat başlangıç değeridir. Taze hava panjuru serbest alanı A = V / (3600·v), v = ${f(k.panjurV, 1)} m/s, serbest alan oranı 0,5.</p>
<table><tr><th>No</th><th>Mahal</th><th class="n">Hacim (m³)</th><th class="n">n (1/h)</th><th class="n">Değişim (m³/h)</th><th class="n">Kişi (m³/h)</th><th class="n">Isı yükü (m³/h)</th><th class="n">Seçilen V (m³/h)</th><th>Ölçüt</th><th>Sistem</th></tr>${H.res.map(({ e, r }) => `<tr><td>${esc(e.no)}</td><td>${esc(e.ad)}</td><td class="n">${f(r.hac, 1)}</td><td class="n">${f(r.ach, 1)}</td><td class="n">${fi(r.Vach)}</td><td class="n">${r.Vkisi ? fi(r.Vkisi) : '—'}</td><td class="n">${r.Visi ? fi(r.Visi) : '—'}</td><td class="n"><b>${fi(r.V)}</b></td><td>${r.yontem}</td><td>${esc(TURAD[r.tur] || r.tur)}</td></tr>`).join('')}</table>`;
    if (fanlar.length) s += `<h3>Fan listesi</h3><table><tr><th>No</th><th>Mahal</th><th>Fan</th><th>Model</th><th class="n">Gereken (m³/h)</th><th class="n">Anma debisi (m³/h)</th><th class="n">Güç</th></tr>${fanlar.map(u => { const mh = MT.mahaller().find(q => q.id === u.mid) || {}; return `<tr><td>${u.no}</td><td>${u.kind === 'hucrefan' ? 'Merkezi egzoz' : esc((mh.no || '') + ' ' + (mh.ad || ''))}</td><td>${({ duvarfan: FAN.duvar.ad, kanalfan: FAN.kanal.ad, catifan: FAN.cati.ad, hucrefan: FAN.hucre.ad })[u.kind]}</td><td>${esc(u.model)}</td><td class="n">${fi(u.V)}</td><td class="n">${fi(u.Vn)}</td><td class="n">${u.kind === 'hucrefan' ? f(u.kW, 2) + ' kW · ' + fi(u.dp) + ' Pa' : fi(u.W) + ' W'}</td></tr>`; }).join('')}</table>`;
    const pj = U.filter(e => e.kind === 'panjur'); if (pj.length) s += `<p>Taze hava panjurları: ${pj.map(p => { const mh = MT.mahaller().find(q => q.id === p.mid) || {}; return `${esc(mh.no || '')} ${p.model} mm (${f(p.A, 2)} m² brüt)`; }).join(' · ')}.</p>`;
    const kt = (rows, bas) => rows.length ? `<h3>${bas}</h3><table><tr><th>#</th><th>Kot</th><th class="n">Debi (m³/h)</th><th class="n">Kesit (mm)</th><th class="n">v (m/s)</th><th class="n">R (Pa/m)</th><th class="n">Boy (m)</th><th class="n">Sac (m²)</th></tr>${rows.map((x, i) => `<tr><td>${i + 1}</td><td>${f(+x.e.z0 || 0, 2)}</td><td class="n">${fi(x.e.V)}</td><td class="n">${x.e.a} × ${x.e.b}</td><td class="n">${f(x.e.v, 1)}</td><td class="n">${f(x.e.R, 2)}</td><td class="n">${f(x.L, 2)}</td><td class="n">${f(2 * (x.e.a + x.e.b) / 1000 * x.L, 1)}</td></tr>`).join('')}<tr class="top"><td colspan="6">Toplam</td><td class="n">${f(rows.reduce((a, x) => a + x.L, 0), 1)}</td><td class="n">${f(rows.reduce((a, x) => a + 2 * (x.e.a + x.e.b) / 1000 * x.L, 0), 1)}</td></tr></table>` : '';
    s += kt(kn, `Egzoz kanalları${hf ? ` — hücreli fan ${hf.model}, ${fi(hf.V)} m³/h, ${fi(hf.dp)} Pa, motor ${f(hf.kW, 2)} kW` : ''}`);
    const rt = U.find(e => e.kind === 'rooftop'), R = rt && MT.rooftopHesap ? MT.rooftopHesap() : null;
    if (R) s += `<h2>12. Rooftop paket klima ve besleme kanalları</h2><div class="kart"><div><b>${R.adet > 1 ? R.adet + ' × ' : ''}${R.kW} kW</b><span>Soğutma kapasitesi (yük ${f(R.Qs, 1)} kW)</span></div><div><b>${f(R.Qi, 1)} kW</b><span>Isıtma ihtiyacı (ısı kaybı + taze hava)</span></div><div><b>${fi(R.Vtop)} m³/h</b><span>Besleme havası · ${f(R.oz, 0)} m³/h·kW</span></div><div><b>%${f(R.tazeOran * 100, 0)}</b><span>Taze hava oranı (${fi(R.Vtaze)} m³/h)</span></div></div><p class="mut">Besleme havası V = Q<sub>duyulur</sub> / (0,335·Δt), Δt = ${f(k.dTbes, 0)} K (taze hava yükü cihaz serpantininde karşılanır, mahal debisine girmez); debi taze hava ihtiyacından küçük olamaz. Cihaz dış statik basıncı ${fi(rt.dp)} Pa (kanal + difüzör + dönüş). Dönüş havası tavan arası / koridor menfezleriyle toplanır; dönüş kanalı bu aşamada çizilmemiştir.</p><table><tr><th>No</th><th>Mahal</th><th class="n">Duyulur yük (W)</th><th class="n">Besleme (m³/h)</th><th class="n">Taze hava (m³/h)</th><th class="n">Hava değişimi (1/h)</th><th class="n">Isı kaybı (W)</th></tr>${R.oda.map(o => `<tr><td>${esc(o.e.no)}</td><td>${esc(o.e.ad)}</td><td class="n">${fi(o.duy)}</td><td class="n">${fi(o.V)}</td><td class="n">${fi(o.taze)}</td><td class="n">${f(o.V / (o.r.V || 1), 1)}</td><td class="n">${fi(o.Qh)}</td></tr>`).join('')}</table>` + kt(kanalOzet('besleme'), 'Besleme kanalları');
    s += `<div class="not">Kanal kesitleri eşit sürtünme yöntemiyle (R ≤ ${f(k.Rmax, 1)} Pa/m, ana kanalda v ≤ ${f(k.vAna, 0)} m/s, dallarda ≤ ${f(k.vDal, 1)} m/s, yükseklik ≤ ${k.hmax} mm) seçilmiştir; yerel kayıplar sürtünme kaybının %50'si alınmıştır. Fan ve rooftop modelleri tipik katalog kademeleridir; seçilen markanın eğrileriyle doğrulanmalıdır. Patlayıcı ortam (ıslak hazne, klor odası) fanları ex-proof seçilmelidir.</div>`;
    return s;
  });

  /* ---------- komutlar ---------- */
  if (C.addCommand) {
    C.addCommand(['HAVALANDIRMA', 'HAVALANDIRMAHESAP'], 'Havalandırma: mahal hava ihtiyacını hesaplar; duvar / çatı / küçük aspiratörleri, taze hava panjurlarını yerleştirir; dış duvarı olmayan mahaller için hücreli fan ve egzoz kanallarını çizer.', async () => { const r = MT.hvYerlestir(); if (!r.n && !r.kanal) { C.warn('Mekanik havalandırma gereken mahal yok. Tesisat paneli › Havalandırma sekmesinden mahallerin sistemini seçebilirsiniz.'); return; } C.log(`Havalandırma: ${r.n} fan${r.kanal ? `, ${r.kanal} egzoz kanalı parçası (hücreli fan ${r.hf.model}, ${fi(r.hf.V)} m³/h, ${fi(r.hf.dp)} Pa)` : ''}.`); });
    C.addCommand(['HUCREFANYERI'], 'Hücreli egzoz fanının yerini seçin; egzoz kanalları bu noktadan yeniden çizilir.', async (I) => { const p = await I.pt('Hücreli fan yeri'); if (!p || typeof p === 'string') return; const r = MT.hvYerlestir([p[0], p[1]]); if (!r.kanal) C.warn('Hücreli fan gerektiren mahal yok (sistemi "Hücreli fan + kanal" olan mahal).'); });
    C.addCommand(['ROOFTOP', 'PAKETKLIMA'], 'Rooftop paket klima: soğutulan mahallere besleme havası debisi, cihaz kapasitesi, difüzörler ve besleme kanalları (cihaz yerini tıklayın, Enter = orta).', async (I) => { if (!MT.rooftopHesap || !MT.rooftopHesap()) { C.warn('Soğutulan mahal yok: önce MAHALBUL ve Soğutma sekmesi.'); return; } const var_ = hvs().find(e => e.kind === 'rooftop'); let p = null; if (!var_) { p = await I.pt('Rooftop cihazının plandaki yeri (çatıda; Enter = orta)'); if (typeof p === 'string') p = null; } const R = MT.rooftopYerlestir(p ? [p[0], p[1]] : null); if (MT.sog) MT.sog().sistem = 'rooftop'; C.log(`Rooftop: ${R.kW} kW soğutma · ${f(R.Qi, 1)} kW ısıtma · ${fi(R.Vtop)} m³/h · ${R.nDif} difüzör · dış statik basınç ${fi(R.dp)} Pa.`); });
    C.addCommand(['ROOFTOPYERI'], 'Rooftop cihazının yerini değiştirir; besleme kanalları yeniden çizilir.', async (I) => { const p = await I.pt('Rooftop yeri'); if (!p || typeof p === 'string') return; if (!MT.rooftopYerlestir([p[0], p[1]])) C.warn('Soğutulan mahal yok.'); });
    C.addCommand(['HAVALANDIRMASIL'], 'Fan, panjur, menfez, difüzör, rooftop ve hava kanallarını siler.', async () => { const l = C.doc.ents.filter(e => e.type === 'mthv' || e.type === 'mtkanal'); if (!l.length) return; C.undoStack.push(C.snapshot()); C.remove(l); C.log(`${l.length} havalandırma nesnesi silindi.`); });
  }
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : (globalThis.C = globalThis.C || {}));

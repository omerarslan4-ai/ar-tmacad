/* ArıtmaCAD — MEKANİK TESİSAT · SIHHİ TESİSAT
   Temiz su (soğuk + sıcak), pis su, havalık; armatür kütüphanesi (plan sembolü + 3B gövde + bağlantı noktaları),
   yükleme birimi yöntemi (Q = K·√YB), sarfiyat birimi yöntemi, elektrikli termosifon seçimi, kolon şeması, armatür listesi, rapor.
   Tablolar kullanıcının sıhhi tesisat paftasındaki (AAT-B101-TP-01) değerleridir; panelden değiştirilebilir (MT.sh()).
   Nesneler: mtarm   { p:[x,y] (duvar yüzü), cp:[x,y] (oda içi), ang, tip, mid, no, z0, hacim? }
             mtsboru { pts:[[x,y,z]…], sys:'soguk'|'sicak'|'pis'|'havalik', dn (etiket), d (dış çap m), yb | sb, z0 }
             mtsnokta{ kind:'giris'|'rogar', p:[x,y], dis:[x,y]?, no }
   Komutlar: SIHHITESISAT, ARMATURYERLESTIR, ARMATUR, SUGIRISI, ROGARYERI, SIHHIBORU, SIHHISEMA, SIHHISIL */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, MT = C.MT, V = C.MTV, { L, P, TX, CI } = C.prim || {}; if (!T || !MT || !C.addCommand) return;
  const f = (v, d = 2) => (isFinite(v) ? (+v).toFixed(d) : '—').replace('.', ',');
  const fi = v => isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—';
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const lay = (n, c, lw) => { C.ensureLayer(n, c, 'CONTINUOUS', lw); return n; };
  const G3 = () => MT._g3, r3 = v => +(+v).toFixed(3);

  /* ====================================================================
     VERİLER (paftadaki tablolar)
     ==================================================================== */
  /* armatür: yb = temiz su yük birimi, sb = pis su sarf birimi, ss = sıcak su ihtiyacı (lt/h, iş yeri), zs = su bağlantı kotu (bitmiş zeminden),
     pis: ['duvar', kot] | ['doseme', duvardan uzaklık] , dp = pis su bağlantı çapı (mm), w × d = plan ölçüsü */
  const ARM = {
    lavabo: { ad: 'Lavabo', yb: 0.5, sb: 2, ss: 7.5, sicak: 1, zs: 0.55, pis: ['duvar', 0.50], dp: 50, w: 0.55, d: 0.45 },
    klozet: { ad: 'Klozet (rezervuarlı)', yb: 0.25, sb: 8, ss: 0, sicak: 0, zs: 0.20, pis: ['doseme', 0.30], dp: 100, w: 0.40, d: 0.68 },
    alaturka: { ad: 'Alaturka hela (rezervuarlı)', yb: 0.25, sb: 8, ss: 0, sicak: 0, zs: 0.40, pis: ['doseme', 0.45], dp: 100, w: 0.50, d: 0.75 },
    pisuvar: { ad: 'Pisuvar', yb: 0.25, sb: 1, ss: 0, sicak: 0, zs: 1.15, pis: ['duvar', 0.45], dp: 50, w: 0.36, d: 0.32 },
    dus: { ad: 'Duş', yb: 2.5, sb: 7, ss: 114, sicak: 1, zs: 1.10, pis: ['doseme', 0.45], dp: 70, w: 0.90, d: 0.90 },
    evye: { ad: 'Evye', yb: 1.0, sb: 4, ss: 38, sicak: 1, zs: 0.55, pis: ['duvar', 0.45], dp: 50, w: 1.20, d: 0.60 },
    labevye: { ad: 'Laboratuvar evyesi', yb: 1.0, sb: 4, ss: 60, sicak: 1, zs: 0.55, pis: ['duvar', 0.45], dp: 50, w: 1.20, d: 0.60 },
    camasir: { ad: 'Çamaşır makinesi bağlantısı', yb: 2.5, sb: 4, ss: 0, sicak: 0, zs: 0.80, pis: ['duvar', 0.60], dp: 50, w: 0.60, d: 0.60 },
    bulasik: { ad: 'Bulaşık makinesi bağlantısı', yb: 2.5, sb: 4, ss: 0, sicak: 0, zs: 0.60, pis: ['duvar', 0.50], dp: 50, w: 0.60, d: 0.60 },
    suzgec: { ad: 'Yer süzgeci', yb: 0, sb: 2, ss: 0, sicak: 0, zs: 0, pis: ['doseme', 0], dp: 70, w: 0.15, d: 0.15, yer: 1 },
    termosifon: { ad: 'Elektrikli termosifon', yb: 0, sb: 0, ss: 0, sicak: 0, zs: 1.45, pis: null, dp: 0, w: 0.46, d: 0.48, cihaz: 1 },
  };
  /* temiz su: yük birimi üst sınırı → çap [inç etiketi, PPRC dış çap mm, iç çap mm] */
  const TEMIZ = [[1.5, '1/2"', 20, 13.2], [5.5, '3/4"', 25, 16.6], [15, '1"', 32, 21.2], [41, '1 1/4"', 40, 26.6], [100, '1 1/2"', 50, 33.4], [245, '2"', 63, 42.0], [700, '2 1/2"', 75, 50.0], [1000, '3"', 90, 60.0]];
  const PISY = [[4, 50], [25, 70], [100, 100], [270, 125], [600, 150]];   // yatay: SB üst sınırı → Ø
  const PISD = [[40, 70], [150, 100], [400, 125], [900, 150]];              // düşey
  const TERMO = [50, 65, 80, 100, 120, 150, 200, 300];
  MT.ARM = ARM; MT.SHT = { TEMIZ, PISY, PISD, TERMO };
  MT.sh = () => { const m = MT.set(); if (!m.sh) m.sh = {}; const k = m.sh; if (k.surum !== 2) { k.dagitim = 'duvar'; k.surum = 2; } const d = { K: 0.25, minCap: 1, dagitim: 'duvar', eszaman: 0.3, depolama: 2.0, egim: 2, minPis: 70, akma: 10, sayac: 5, yerel: 30, girisDerin: 0.6, yagis: 300 }; for (const q in d) if (k[q] == null) k[q] = d[q]; return k; };
  MT.temizCap = (yb, k) => { k = k || MT.sh(); let i = TEMIZ.findIndex(t => yb <= t[0] + 1e-9); if (i < 0) i = TEMIZ.length - 1; i = Math.max(i, Math.min(TEMIZ.length - 1, +k.minCap || 0)); const t = TEMIZ[i], Q = k.K * Math.sqrt(Math.max(0, yb)), A = Math.PI * Math.pow(t[3] / 1000, 2) / 4, v = Q / 1000 / A, D = t[3] / 1000, Re = v * D / 1.0e-6, fr = Re < 2300 ? 64 / Math.max(Re, 1) : 0.25 / Math.pow(Math.log10(0.007 / 1000 / (3.7 * D) + 5.74 / Math.pow(Math.max(Re, 1), 0.9)), 2); return { i, inc: t[1], dis: t[2], ic: t[3], Q, v, R: fr / D * 1000 * v * v / 2, yb }; };
  MT.pisCap = (sb, dusey, minD) => { const Tb = dusey ? PISD : PISY; let d = (Tb.find(t => sb <= t[0] + 1e-9) || Tb[Tb.length - 1])[1]; return Math.max(d, minD || 0); };

  const arms = () => C.doc.ents.filter(e => e.type === 'mtarm' && !e.gv), borular = () => C.doc.ents.filter(e => e.type === 'mtsboru' && !e.gv), nokta = k => C.doc.ents.find(e => e.type === 'mtsnokta' && e.kind === k);
  const oda = id => MT.mahaller().find(o => o.id === id), zemin = e => MT.zeminUst ? MT.zeminUst(e.cp || e.p, +e.z0 || 0) : (+e.z0 || 0);
  const nIc = e => { const d = e.cp ? [e.cp[0] - e.p[0], e.cp[1] - e.p[1]] : [-Math.sin(e.ang || 0), Math.cos(e.ang || 0)], l = Math.hypot(d[0], d[1]) || 1; return [d[0] / l, d[1] / l]; };

  /* ====================================================================
     NESNELER
     ==================================================================== */
  const BYZ = [0.97, 0.97, 0.96], KRM = [0.80, 0.82, 0.85], KOY = [0.20, 0.21, 0.23], PAS = [0.72, 0.74, 0.77], TAS = [0.55, 0.55, 0.57], AHS = [0.90, 0.88, 0.84];
  /* ---- kullanıcı modeli: çizimdeki bir 3B nesne (blok, ekipman, katı) armatür tipinin gövdesi olarak kaydedilir ----
     Yerel eksen: s = duvar boyunca, o = duvardan odaya, z = bitmiş zeminden. Veri: { v:[s,o,z,…], f:[i,j,k,…], pal:[[r,g,b]…], fi:[…], w, d, h } (m) */
  const LSK = 'aritmacad.mt.armModel';
  const kutup = () => { try { return JSON.parse(localStorage.getItem(LSK) || '{}') || {}; } catch (er) { return {}; } };
  /* tarayıcı deposu (≈5 MB) statik hesap ve diğer modüllerle ortaktır: büyük armatür modelleri orada tutulmaz, yalnız çizime kaydedilir */
  const LS_SINIR = 300000;
  try { const ham = localStorage.getItem(LSK); if (ham && ham.length > LS_SINIR) { const k = JSON.parse(ham) || {}; for (const t of Object.keys(k)) if (JSON.stringify(k[t]).length > LS_SINIR / 2) delete k[t]; const yeni = JSON.stringify(k); if (yeni.length > LS_SINIR) localStorage.removeItem(LSK); else localStorage.setItem(LSK, yeni); } } catch (er) { try { localStorage.removeItem(LSK); } catch (e2) { } }
  MT.armModel = tip => { const m = MT.sh(); if (m.model && m.model[tip]) return m.model[tip]; const k = kutup(); return k[tip] || null; };
  const modelCiz = (e, out, md) => { const g = G3(), F = g.eksen(e.p, e.ang || 0, nIc(e)), z = zemin(e), v0 = out.v.length, V2 = md.v, n = V2.length / 3; for (let i = 0; i < n; i++) out.v.push(F.P(V2[3 * i], V2[3 * i + 1], z + V2[3 * i + 2])); /* ayna: yerel eksen sol-elli olabilir → üçgen yönü korunur */
    const ters = (() => { const a = F.P(1, 0, 0), b = F.P(0, 1, 0), o = F.P(0, 0, 0); return ((a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])) < 0; })();
    for (let i = 0; i < md.f.length; i += 3) { out.f.push(ters ? [v0 + md.f[i], v0 + md.f[i + 2], v0 + md.f[i + 1]] : [v0 + md.f[i], v0 + md.f[i + 1], v0 + md.f[i + 2]]); out.fc.push(md.pal[md.fi ? md.fi[i / 3] : 0] || [0.96, 0.96, 0.95]); } };
  /* dönel yüzey (hafif ama yuvarlak gövdeler için): eksen (cs, co), profil [[yarıçap, z]…], elips oranları es × eo, açı a0…a1; ic = iç yüzey (çanak) */
  const donel = (out, F, cs, co, z0, prof, col, o) => { o = o || {}; const n = o.n || 14, a0 = o.a0 || 0, a1 = o.a1 != null ? o.a1 : 2 * Math.PI, es = o.es || 1, eo = o.eo || 1, K = prof.length, v0 = out.v.length, W = [];
    for (let k = 0; k < K; k++) for (let j = 0; j <= n; j++) { const a = a0 + (a1 - a0) * j / n, r = prof[k][0], q = F.P(cs + r * es * Math.cos(a), co + r * eo * Math.sin(a), z0 + prof[k][1]); W.push(q); out.v.push(q); }
    const id = (k, j) => k * (n + 1) + j;
    for (let k = 0; k < K - 1; k++) { const ax = F.P(cs, co, z0 + (prof[k][1] + prof[k + 1][1]) / 2); for (let j = 0; j < n; j++) { const A = id(k, j), B = id(k, j + 1), Cc = id(k + 1, j + 1), D = id(k + 1, j), pa = W[A], pb = W[B], pc = W[Cc], pd = W[D];
        let nr = M.cross(M.sub(pc, pa), M.sub(pd, pb)); if (M.len(nr) < 1e-12) continue; const qc = [(pa[0] + pb[0] + pc[0] + pd[0]) / 4, (pa[1] + pb[1] + pc[1] + pd[1]) / 4, (pa[2] + pb[2] + pc[2] + pd[2]) / 4]; let ist = [qc[0] - ax[0], qc[1] - ax[1], 0]; const li = Math.hypot(ist[0], ist[1]) || 1, ln = M.len(nr);
        let dt = (nr[0] * ist[0] + nr[1] * ist[1]) / (li * ln); if (o.ic) dt = -dt; if (Math.abs(dt) < 0.25) dt = (o.asagi ? -1 : 1) * nr[2] / ln; /* yataya yakın yüz: yukarı (ya da aşağı) baksın */
        const ters = dt < 0, t1 = ters ? [A, Cc, B] : [A, B, Cc], t2 = ters ? [A, D, Cc] : [A, Cc, D]; out.f.push([v0 + t1[0], v0 + t1[1], v0 + t1[2]], [v0 + t2[0], v0 + t2[1], v0 + t2[2]]); out.fc.push(col, col); } } };
  const govde = (e, out) => { const g = G3(); if (!g) return; const md = MT.armModel(e.tip); if (md && md.v && md.f) { modelCiz(e, out, md); return; }
    const n = nIc(e), F = g.eksen(e.p, e.ang || 0, n), z = zemin(e), b = (s0, s1, o0, o1, z0, z1, c) => g.bx(out, F, s0, s1, o0, o1, z + z0, z + z1, c), cy = (s, o, zz, d, r, Ln, c, k) => g.sil(out, F.P(s, o, z + zz), d, r, Ln, c, k || 12), dn = (cs, co, prof, c, o) => donel(out, F, cs, co, z, prof, c, o), UP = [0, 0, 1], IN = [n[0], n[1], 0], SU = [0.62, 0.80, 0.90], IC = [0.90, 0.92, 0.94];
    const batarya = (s, o, zz, boy) => { cy(s, o, zz, UP, 0.016, 0.10, KRM, 10); cy(s, o, zz + 0.09, IN, 0.011, boy, KRM, 8); cy(s, o + boy, zz + 0.06, UP, 0.011, 0.035, KRM, 8); b(s - 0.03, s + 0.03, o - 0.008, o + 0.008, zz + 0.10, zz + 0.115, KRM); };
    switch (e.tip) {
      case 'lavabo': /* ayaklı lavabo: oval çanak + arka tabla + ayak */
        dn(0, 0.24, [[0.07, 0.66], [0.19, 0.70], [0.255, 0.78], [0.275, 0.85]], BYZ, { eo: 0.82 }); dn(0, 0.24, [[0.275, 0.85], [0.225, 0.85]], BYZ, { eo: 0.82 }); dn(0, 0.26, [[0.225, 0.85], [0.19, 0.78], [0.09, 0.735], [0.0, 0.73]], IC, { eo: 0.78, ic: 1 });
        b(-0.24, 0.24, 0, 0.11, 0.79, 0.855, BYZ); dn(0, 0.26, [[0.022, 0.732], [0, 0.732]], KRM, { n: 8 }); dn(0, 0.20, [[0.095, 0], [0.075, 0.25], [0.068, 0.66]], BYZ, { eo: 0.85, n: 10 }); batarya(0, 0.06, 0.855, 0.13);
        b(-0.25, 0.25, -0.004, 0.0, 1.05, 1.65, [0.80, 0.90, 0.95]); break;
      case 'klozet': /* oval hazne + rezervuar */
        dn(0, 0.46, [[0.09, 0], [0.12, 0.10], [0.165, 0.28], [0.185, 0.385]], BYZ, { eo: 1.22 }); b(-0.10, 0.10, 0.04, 0.32, 0, 0.36, BYZ); dn(0, 0.46, [[0.185, 0.385], [0.135, 0.385]], BYZ, { eo: 1.22 }); dn(0, 0.46, [[0.135, 0.385], [0.115, 0.26], [0.06, 0.17], [0.0, 0.16]], IC, { eo: 1.25, ic: 1 }); dn(0, 0.47, [[0.07, 0.185], [0, 0.185]], SU, { eo: 1.2, n: 10 });
        dn(0, 0.46, [[0.192, 0.385], [0.192, 0.405], [0.125, 0.405]], [0.99, 0.99, 0.985], { eo: 1.22 }); /* oturak */
        b(-0.19, 0.19, 0, 0.19, 0.39, 0.80, BYZ); b(-0.20, 0.20, -0.002, 0.20, 0.80, 0.83, BYZ); cy(0.05, 0.095, 0.83, UP, 0.018, 0.008, KRM, 10); cy(-0.24, 0.02, 0.20, UP, 0.008, 0.2, KRM, 6); break;
      case 'alaturka': b(-0.26, 0.26, 0.12, 0.78, 0, 0.035, BYZ); dn(0, 0.47, [[0.105, 0.036], [0.085, 0.0], [0.03, -0.03], [0, -0.03]], IC, { eo: 1.9, es: 0.85, ic: 1 }); b(-0.23, -0.11, 0.26, 0.62, 0.035, 0.05, BYZ); b(0.11, 0.23, 0.26, 0.62, 0.035, 0.05, BYZ); for (let i = 0; i < 6; i++) { b(-0.225, -0.115, 0.28 + i * 0.055, 0.30 + i * 0.055, 0.05, 0.054, IC); b(0.115, 0.225, 0.28 + i * 0.055, 0.30 + i * 0.055, 0.05, 0.054, IC); }
        b(-0.2, 0.2, 0, 0.14, 1.80, 2.12, BYZ); cy(0, 0.07, 0.30, UP, 0.016, 1.50, BYZ, 8); cy(-0.2, 0.04, 0.40, UP, 0.012, 0.1, KRM, 8); break;
      case 'pisuvar': b(-0.17, 0.17, 0, 0.05, 0.52, 1.16, BYZ); dn(0, 0.03, [[0.04, 0.50], [0.13, 0.56], [0.175, 0.70], [0.18, 0.80]], BYZ, { a0: 0, a1: Math.PI, eo: 1.5, n: 10 }); dn(0, 0.03, [[0.18, 0.80], [0.18, 1.04], [0.14, 1.16]], BYZ, { a0: 0, a1: Math.PI, eo: 0.55, n: 10 }); dn(0, 0.05, [[0.165, 0.80], [0.12, 0.66], [0.03, 0.60]], IC, { a0: 0, a1: Math.PI, eo: 1.35, n: 10, ic: 1 }); dn(0, 0.03, [[0.18, 0.80], [0.165, 0.80]], BYZ, { a0: 0, a1: Math.PI, eo: 1.5, n: 10 });
        cy(0, 0.03, 1.16, UP, 0.012, 0.10, KRM, 8); cy(0, 0.08, 0.40, UP, 0.02, 0.11, KRM, 8); b(-0.42, -0.40, 0, 0.4, 0.5, 1.4, [0.85, 0.9, 0.92]); break;
      case 'dus': b(-0.45, 0.45, 0, 0.90, 0, 0.12, BYZ); b(-0.40, 0.40, 0.05, 0.85, 0.12, 0.123, IC); dn(0, 0.45, [[0.045, 0.124], [0, 0.124]], KRM, { n: 10 }); b(-0.09, 0.09, 0, 0.05, 1.05, 1.12, KRM); cy(-0.09, 0.03, 1.085, [F.u[0], F.u[1], 0], 0.018, 0.02, KRM, 8); cy(0.07, 0.03, 1.085, [F.u[0], F.u[1], 0], 0.018, 0.02, KRM, 8); cy(0, 0.03, 1.12, UP, 0.011, 0.95, KRM, 8); cy(0, 0.03, 2.07, IN, 0.011, 0.30, KRM, 8); dn(0, 0.33, [[0.10, 2.03], [0.10, 2.045], [0.02, 2.06]], KRM, { n: 12 }); dn(0, 0.33, [[0.10, 2.03], [0, 2.03]], KOY, { n: 12, asagi: 1 });
        b(0.45, 0.458, 0, 0.9, 0.12, 2.0, [0.80, 0.92, 0.96]); b(-0.45, 0.45, 0.892, 0.90, 0.12, 2.0, [0.80, 0.92, 0.96]); break;
      case 'evye': case 'labevye': { const tz = e.tip === 'labevye' ? [0.30, 0.32, 0.36] : TAS; b(-0.6, 0.6, 0, 0.60, 0.82, 0.86, tz); b(-0.58, 0.58, 0.03, 0.575, 0.10, 0.82, AHS); b(-0.58, 0.58, 0.05, 0.56, 0, 0.10, KOY); b(-0.003, 0.003, 0.575, 0.58, 0.14, 0.80, KOY); b(-0.33, -0.31, 0.575, 0.585, 0.44, 0.50, KRM); b(0.31, 0.33, 0.575, 0.585, 0.44, 0.50, KRM);
        dn(0, 0.31, [[0.235, 0.862], [0.21, 0.862]], PAS, { es: 1.15, eo: 0.82 }); dn(0, 0.31, [[0.21, 0.862], [0.195, 0.74], [0.06, 0.715], [0, 0.715]], [0.62, 0.64, 0.67], { es: 1.15, eo: 0.82, ic: 1 }); dn(0, 0.31, [[0.025, 0.717], [0, 0.717]], KOY, { n: 8 });
        cy(0, 0.07, 0.86, UP, 0.017, 0.26, KRM, 10); cy(0, 0.07, 1.11, IN, 0.012, 0.17, KRM, 8); cy(0, 0.24, 1.07, UP, 0.012, 0.04, KRM, 8); b(0.04, 0.09, 0.062, 0.078, 0.90, 0.915, KRM); break; }
      case 'camasir': case 'bulasik': b(-0.3, 0.3, 0.02, 0.60, 0, 0.85, BYZ); if (e.tip === 'camasir') { cy(0, 0.60, 0.46, IN, 0.19, 0.012, PAS, 18); cy(0, 0.612, 0.46, IN, 0.15, 0.004, KOY, 18); } else b(-0.27, 0.27, 0.60, 0.606, 0.10, 0.68, [0.90, 0.91, 0.92]); b(-0.28, 0.28, 0.60, 0.606, 0.72, 0.82, [0.85, 0.86, 0.88]); cy(0.2, 0.606, 0.77, IN, 0.025, 0.012, KRM, 10); break;
      case 'suzgec': { const c = e.cp || e.p, F2 = g.eksen(c, 0, null); g.bx(out, F2, -0.075, 0.075, -0.075, 0.075, z, z + 0.006, PAS); for (let i = -2; i <= 2; i++) g.bx(out, F2, -0.055, 0.055, i * 0.022 - 0.006, i * 0.022 + 0.006, z + 0.006, z + 0.0075, KOY); break; }
      case 'termosifon': { const hv = +e.hacim || 80, Ln = Math.max(0.50, Math.min(1.5, hv / 1000 / (Math.PI * 0.21 * 0.21))), z0 = 1.60; cy(0, 0.23, z0, UP, 0.21, Ln, BYZ, 18); dn(0, 0.23, [[0.21, z0], [0.185, z0 - 0.045], [0.10, z0 - 0.075], [0, z0 - 0.08]], [0.88, 0.89, 0.91], { n: 18, asagi: 1 }); dn(0, 0.23, [[0.21, z0 + Ln], [0.185, z0 + Ln + 0.045], [0.10, z0 + Ln + 0.075], [0, z0 + Ln + 0.08]], BYZ, { n: 18 });
        b(-0.055, 0.055, 0.425, 0.447, z0 + 0.06, z0 + 0.16, KOY); cy(0, 0.447, z0 + 0.11, IN, 0.018, 0.012, KRM, 10); cy(-0.08, 0.23, 1.45, UP, 0.012, z0 - 0.07 - 1.45, [0.25, 0.45, 0.85], 8); cy(0.08, 0.23, 1.45, UP, 0.012, z0 - 0.07 - 1.45, [0.85, 0.25, 0.22], 8); b(-0.16, 0.16, 0, 0.03, z0 + Ln * 0.25, z0 + Ln * 0.25 + 0.04, PAS); b(-0.16, 0.16, 0, 0.03, z0 + Ln * 0.72, z0 + Ln * 0.72 + 0.04, PAS); break; }
    } };
  T.mtarm = {
    label: 'Sıhhi tesisat armatürü', ifc: 'IfcSanitaryTerminal',
    prims: e => { const A = ARM[e.tip] || ARM.lavabo, n = nIc(e), a = e.ang || 0, u = [Math.cos(a), Math.sin(a)], c = e.p, pt = (s, o) => [c[0] + u[0] * s + n[0] * o, c[1] + u[1] * s + n[1] * o, 0], w = A.w / 2, d = A.d, out = [], col = 4, R = (s0, s1, o0, o1, st) => out.push(P([pt(s0, o0), pt(s1, o0), pt(s1, o1), pt(s0, o1)], true, st || { lw: 25, color: col }));
      switch (e.tip) {
        case 'lavabo': R(-w, w, 0, d); out.push(CI(pt(0, d * 0.55), 0.14, { lw: 13, color: col }), CI(pt(0, 0.07), 0.02, { lw: 13, color: col })); break;
        case 'klozet': R(-0.19, 0.19, 0, 0.20); out.push(CI(pt(0, 0.46), 0.19, { lw: 25, color: col }), CI(pt(0, 0.46), 0.11, { lw: 13, color: col })); break;
        case 'alaturka': R(-0.25, 0.25, 0.12, 0.75); R(-0.09, 0.09, 0.30, 0.62, { lw: 13, color: col }); break;
        case 'pisuvar': R(-0.18, 0.18, 0, 0.30); out.push(CI(pt(0, 0.17), 0.09, { lw: 13, color: col })); break;
        case 'dus': R(-0.45, 0.45, 0, 0.90); out.push(L(pt(-0.45, 0), pt(0.45, 0.9), { lw: 9, color: col }), L(pt(-0.45, 0.9), pt(0.45, 0), { lw: 9, color: col }), CI(pt(0, 0.45), 0.04, { lw: 13, color: col })); break;
        case 'evye': case 'labevye': R(-0.6, 0.6, 0, 0.60); R(-0.25, 0.25, 0.10, 0.50, { lw: 13, color: col }); out.push(CI(pt(0, 0.30), 0.03, { lw: 13, color: col })); break;
        case 'camasir': case 'bulasik': R(-0.3, 0.3, 0.02, 0.60); out.push(CI(pt(0, 0.31), 0.2, { lw: 13, color: col })); break;
        case 'suzgec': { const q = e.cp || e.p, k = 0.075; out.push(P([[q[0] - k, q[1] - k, 0], [q[0] + k, q[1] - k, 0], [q[0] + k, q[1] + k, 0], [q[0] - k, q[1] + k, 0]], true, { lw: 25, color: 6 }), L([q[0] - k, q[1] - k, 0], [q[0] + k, q[1] + k, 0], { lw: 9, color: 6 }), L([q[0] - k, q[1] + k, 0], [q[0] + k, q[1] - k, 0], { lw: 9, color: 6 })); break; }
        case 'termosifon': out.push(CI(pt(0, 0.23), 0.21, { lw: 30, color: 1 }), TX(pt(0, 0.23), C.annoH(1.6), 'ET', 0, 'MC', { color: 1 })); break;
      }
      const h = C.annoH(1.8), tp = e.tip === 'suzgec' ? [(e.cp || e.p)[0], (e.cp || e.p)[1] + 0.18, 0] : pt(0, d + h * 1.2); out.push(TX(tp, h, e.no || '', 0, 'MC', { color: 2 })); return out; },
    mesh: e => { const g = G3(), I = C._ins; if (!g || !I) return []; const o = I.newMesh(); try { govde(e, o); } catch (er) { console.error(er); return []; } return o.v.length ? [o] : []; },
    snaps: e => [{ p: [e.p[0], e.p[1], +e.z0 || 0], k: 'ins' }],
    xf: (e, X) => { const q = X.p([e.p[0], e.p[1], 0]), q2 = X.p([e.p[0] + Math.cos(e.ang || 0), e.p[1] + Math.sin(e.ang || 0), 0]); e.p = [q[0], q[1]]; e.ang = Math.atan2(q2[1] - q[1], q2[0] - q[0]); if (e.cp) { const c = X.p([e.cp[0], e.cp[1], 0]); e.cp = [c[0], c[1]]; } },
    info: e => { const A = ARM[e.tip] || {}; return `${A.ad || e.tip}${e.tip === 'termosifon' ? ' ' + (e.hacim || 80) + ' L' : ''} ${e.no || ''} · ${A.yb ? f(A.yb, 2) + ' YB · ' : ''}${A.sb ? A.sb + ' SB' : ''}`; },
  };
  const SYS = { soguk: { ad: 'Soğuk su', col: 5, c3: [0.20, 0.42, 0.90] }, sicak: { ad: 'Sıcak su', col: 1, c3: [0.88, 0.22, 0.20], lt: 'HIDDEN' }, pis: { ad: 'Pis su', col: 6, c3: [0.55, 0.36, 0.22] }, havalik: { ad: 'Havalık', col: 8, c3: [0.70, 0.72, 0.74], lt: 'DASHED' } };
  T.mtsboru = {
    label: 'Sıhhi tesisat borusu', ifc: 'IfcPipeSegment',
    prims: e => { const S = SYS[e.sys] || SYS.soguk, out = [], z0 = 0, of = e.sys === 'sicak' ? 0.07 : 0, q = e.pts.map(p => [p[0] + of, p[1] + of, z0]), yat = [];
      for (let i = 1; i < q.length; i++) { const l = M.dist2(q[i - 1], q[i]); if (l > 0.02) { out.push(L(q[i - 1], q[i], { lw: e.sys === 'pis' ? 40 : 30, color: S.col, lt: S.lt })); yat.push([l, q[i - 1], q[i]]); } else if (Math.abs(e.pts[i][2] - e.pts[i - 1][2]) > 0.15) out.push(CI(q[i], Math.max(0.03, (e.d || 0.03) / 2 + 0.015), { lw: 18, color: S.col })); }
      yat.sort((a, b) => b[0] - a[0]); if (yat.length && yat[0][0] > 0.45 && e.dn) { const [, a, b] = yat[0], h = C.annoH(1.5); let ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > Math.PI / 2 + 1e-6 || ang <= -Math.PI / 2 + 1e-6) ang += Math.PI; const nx = -Math.sin(ang), ny = Math.cos(ang), s = e.sys === 'sicak' ? -1 : 1; out.push(TX([(a[0] + b[0]) / 2 + nx * h * 0.9 * s, (a[1] + b[1]) / 2 + ny * h * 0.9 * s, 0], h, e.dn, ang, 'MC', { color: S.col })); }
      return out; },
    mesh: e => { const g = G3(), I = C._ins; if (!g || !I) return []; const o = I.newMesh(), S = SYS[e.sys] || SYS.soguk, r = Math.max(0.008, (e.d || 0.025) / 2), of = e.sys === 'sicak' ? 0.07 : 0; for (let i = 1; i < e.pts.length; i++) { const a = e.pts[i - 1], b = e.pts[i], d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(d[0], d[1], d[2]); if (l < 0.005) continue; const u = [d[0] / l, d[1] / l, d[2] / l]; g.sil(o, [a[0] + of - u[0] * r * 0.9, a[1] + of - u[1] * r * 0.9, a[2] - u[2] * r * 0.9], u, r, l + r * 1.8, S.c3, r > 0.03 ? 14 : 10); } return o.v.length ? [o] : []; },
    snaps: e => e.pts.map(p => ({ p: [p[0], p[1], 0], k: 'end' })),
    xf: (e, X) => { e.pts = e.pts.map(p => { const q = X.p([p[0], p[1], 0]); return [q[0], q[1], p[2]]; }); },
    info: e => `${(SYS[e.sys] || SYS.soguk).ad} borusu ${e.dn || ''} · boy ${f(e.pts.reduce((s, p, i) => i ? s + Math.hypot(p[0] - e.pts[i - 1][0], p[1] - e.pts[i - 1][1], p[2] - e.pts[i - 1][2]) : 0, 0), 2)} m${e.Q ? ' · ' + f(e.Q, 2) + ' l/s · v=' + f(e.v, 2) + ' m/s' : ''}`,
  };
  T.mtsnokta = {
    label: 'Sıhhi tesisat bağlantısı',
    prims: e => { const p = [e.p[0], e.p[1], 0], h = C.annoH(2); if (e.kind === 'rogar') return [CI(p, 0.4, { lw: 40, color: 6 }), CI(p, 0.3, { lw: 13, color: 6 }), TX([p[0], p[1] + 0.4 + h, 0], h, e.no || 'R1', 0, 'MC', { color: 6 })]; const r = C.annoH(1.6); return [CI(p, r, { lw: 35, color: 5 }), L([p[0] - r, p[1], 0], [p[0] + r, p[1], 0], { lw: 13, color: 5 }), L([p[0], p[1] - r, 0], [p[0], p[1] + r, 0], { lw: 13, color: 5 }), TX([p[0], p[1] + r * 2.2, 0], h * 0.9, 'ŞEBEKEDEN', 0, 'MC', { color: 5 })]; },
    mesh: e => { const g = G3(), I = C._ins; if (!g || !I || e.kind !== 'rogar') return []; const o = I.newMesh(), z = +e.zt || 0; g.sil(o, [e.p[0], e.p[1], z - 1.2], [0, 0, 1], 0.42, 1.2, [0.62, 0.62, 0.60], 20); g.sil(o, [e.p[0], e.p[1], z], [0, 0, 1], 0.33, 0.03, [0.25, 0.25, 0.27], 20); return [o]; },
    snaps: e => [{ p: [e.p[0], e.p[1], 0], k: 'cen' }], xf: (e, X) => { const q = X.p([e.p[0], e.p[1], 0]); e.p = [q[0], q[1]]; if (e.disP) { const d = X.p([e.disP[0], e.disP[1], 0]); e.disP = [d[0], d[1]]; } },
    info: e => e.kind === 'rogar' ? `Rögar ${e.no || 'R1'} (pis su çıkışı)` : 'Temiz su girişi (şebekeden)',
  };

  /* ====================================================================
     ARMATÜR YERLEŞİMİ
     ==================================================================== */
  const islak = e => { const s = ((V.MAHAL[e.tip || 0] || [''])[0] + ' ' + (e.ad || '')).toLocaleLowerCase('tr'); if (/engelli/.test(s) && /wc|tuvalet/.test(s)) return ['klozet', 'lavabo', 'suzgec']; if (/banyo|duş|dus/.test(s)) return ['dus', 'lavabo', 'klozet', 'suzgec']; if (/wc|tuvalet|hela/.test(s)) return ['klozet', 'lavabo', 'suzgec']; if (/soyunma/.test(s)) return ['dus', 'lavabo', 'suzgec']; if (/laboratuvar|\blab\b/.test(s)) return ['labevye', 'labevye']; if (/mutfak|çay ocağı|cay ocagi|yemekhane/.test(s)) return ['evye']; if (/lavabo/.test(s)) return ['lavabo', 'suzgec']; return null; };
  MT.armYerlestir = () => {
    const yeni = [], all = MT.mahaller(); let ilkSicak = null;
    for (const e of all) { const lst = islak(e); if (!lst) continue; const ccw = M.polyArea(e.pts) > 0;
      /* kapısız, uzun duvarlar önce; armatürler duvar boyunca köşeden başlayarak dizilir */
      const ys = (e.yuz || []).filter(y => y.L > 0.7).map(y => ({ y, kapi: (y.ac || []).some(a => a.kind === 'kapi'), pen: (y.ac || []).some(a => a.kind !== 'kapi') })).sort((a, b) => (a.kapi - b.kapi) || (b.y.k === 'dis') - (a.y.k === 'dis') || b.y.L - a.y.L); if (!ys.length) continue;
      let yi = 0, s = 0.25; const koy = (tip) => { const A = ARM[tip]; if (A.yer) { const c = e.lp || MT.icNokta(e.pts); yeni.push({ tip, p: [r3(c[0]), r3(c[1])], cp: [r3(c[0]), r3(c[1])], ang: 0, mid: e.id, z0: +e.z0 || 0, sv2: e.sv }); return; }
          for (let dene = 0; dene < ys.length * 2; dene++) { const y = ys[yi % ys.length].y; if (s + A.w + 0.1 <= y.L) { const u = [(y.b[0] - y.a[0]) / y.L, (y.b[1] - y.a[1]) / y.L], n = ccw ? [-u[1], u[0]] : [u[1], -u[0]], sc = s + A.w / 2, w = [y.a[0] + u[0] * sc, y.a[1] + u[1] * sc]; yeni.push({ tip, p: [r3(w[0] + n[0] * 0.01), r3(w[1] + n[1] * 0.01)], cp: [r3(w[0] + n[0] * 0.35), r3(w[1] + n[1] * 0.35)], ang: Math.atan2(u[1], u[0]), mid: e.id, z0: +e.z0 || 0, sv2: e.sv }); s += A.w + 0.2; return; } yi++; s = 0.25; } };
      for (const t of lst) { koy(t); if (ARM[t].sicak && !ilkSicak) ilkSicak = { e, koy }; }
    }
    if (!yeni.length) return { n: 0 };
    if (ilkSicak) ilkSicak.koy('termosifon');
    C.undoStack.push(C.snapshot()); const sil = new Set(arms().concat(borular()).map(e => e.id)); C.doc.ents = C.doc.ents.filter(e => !sil.has(e.id) && !(e.type === 'mtsema' && (e.tur === 'shkolon' || e.tur === 'shlist')));
    const say = {}, KIS = { lavabo: 'L', klozet: 'K', alaturka: 'H', pisuvar: 'P', dus: 'D', evye: 'E', labevye: 'E', camasir: 'ÇM', bulasik: 'BM', suzgec: 'YS', termosifon: 'ET' }, chg = C.changed; C.changed = () => { };
    try { for (const o of yeni) { const k = KIS[o.tip]; say[k] = (say[k] || 0) + 1; o.no = k + say[k]; o.layer = lay('MT_SIHHI_ARMATUR', 4, 25); o.dis = 'Mekanik'; const sv = o.sv2; delete o.sv2; const x = C.newEnt('mtarm', o); if (sv != null) x.sv2 = sv; else delete x.sv2; C.add(x); } } finally { C.changed = chg; }
    C.changed(); C.emit && C.emit('layers'); return { n: yeni.length, oda: new Set(yeni.map(o => o.mid)).size };
  };

  /* ====================================================================
     HESAP + BORU GÜZERGÂHI
     ==================================================================== */
  const zincirler = N => { const out = []; const yuru = (j, c, ust) => { const pts = [N[j].p, N[c].p], dug = [j, c]; let u = c; while (N[u].ch.length === 1 && !N[u].rad) { u = N[u].ch[0]; pts.push(N[u].p); dug.push(u); } const i = out.length; out.push({ pts, dug, Q: N[c].Q, bas: j, son: u, ust, rad: N[u].rad || null }); N[u].ch.forEach(x => yuru(u, x, i)); }; N[0].ch.forEach(c => yuru(0, c, -1)); return out; };
  const boy3 = pts => pts.reduce((s, p, i) => i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]) : 0, 0);
  const disDuvar = (pref) => { /* tercih edilen mahalin (yoksa herhangi birinin) dış duvarı: iç yüz noktası + dışa doğru birim */ const all = MT.mahaller(), sira = pref ? [pref].concat(all.filter(o => o !== pref)) : all; for (const e of sira) { const ccw = M.polyArea(e.pts) > 0, ys = (e.yuz || []).filter(y => y.k === 'dis' && y.L > 0.6).sort((a, b) => b.L - a.L); if (ys.length) { const y = ys[0], u = [(y.b[0] - y.a[0]) / y.L, (y.b[1] - y.a[1]) / y.L], n = ccw ? [-u[1], u[0]] : [u[1], -u[0]]; return { e, y, u, n, t: y.t || 0.2 }; } } return null; };
  /* ---------- duvar içi dağıtım: borular mahal çevresindeki duvarların içinden (iç yüzden 4 cm içeride) gider ----------
     Soğuk su bitmiş zeminden 30 cm, sıcak su 40 cm yukarıda yatay; armatüre duvar içinde düşey çıkar / iner. Kapı boşluğunda kapı üstünden dolanır.
     Girişin / termosifonun bulunmadığı ıslak hacimlere besleme tavan altından gelir, o mahalin duvarına iner. */
  const cevre = (o) => { let q = o.pts.map(p => [p[0], p[1]]); const ccw = M.polyArea(q) > 0, n = q.length, L0 = [], kum = [0]; for (let i = 0; i < n; i++) { const a = q[i], b = q[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]); L0.push(l); kum.push(kum[i] + l); }
    const P = kum[n], dis = i => { const a = q[i], b = q[(i + 1) % n], l = L0[i] || 1, u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; return ccw ? [u[1], -u[0]] : [-u[1], u[0]]; };
    /* köşe: iki kenarın dış normaline göre gönyeli öteleme */
    const kose = (i, d) => { const n1 = dis((i - 1 + n) % n), n2 = dis(i), kk = 1 + n1[0] * n2[0] + n1[1] * n2[1], m = kk < 0.2 ? n2 : [(n1[0] + n2[0]) / kk, (n1[1] + n2[1]) / kk]; return [q[i][0] + m[0] * d, q[i][1] + m[1] * d]; };
    const nok = (t, d) => { t = ((t % P) + P) % P; let i = 0; while (i < n - 1 && kum[i + 1] < t) i++; const a = q[i], b = q[(i + 1) % n], l = L0[i] || 1, k2 = (t - kum[i]) / l, nn = dis(i); return [a[0] + (b[0] - a[0]) * k2 + nn[0] * d, a[1] + (b[1] - a[1]) * k2 + nn[1] * d]; };
    const par = p => { let best = 0, bd = Infinity; for (let i = 0; i < n; i++) { const a = q[i], b = q[(i + 1) % n], l = L0[i]; if (l < 1e-6) continue; const k2 = Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (l * l))), d = Math.hypot(p[0] - a[0] - (b[0] - a[0]) * k2, p[1] - a[1] - (b[1] - a[1]) * k2); if (d < bd) { bd = d; best = kum[i] + l * k2; } } return best; };
    /* kapılar: çevre parametresinde [t0, t1, üst kot] */
    const kapilar = []; for (const y of o.yuz || []) for (const a of y.ac || []) { if (a.kind !== 'kapi') continue; const e = C.byId(a.id), hf = e && C._ins ? C._ins.hostFrame(e) : null; if (!hf) continue; const c = [hf.sf.a[0] + hf.sf.u[0] * (+e.s || 0), hf.sf.a[1] + hf.sf.u[1] * (+e.s || 0)], t = par(c), w = (a.w || 0.9) / 2 + 0.12; kapilar.push([t - w, t + w, (+hf.h.z0 || 0) + (+e.hh || a.h || 2.1) + 0.12]); }
    return { q, n, P, kum, nok, par, kose, kapilar }; };
  /* çevre boyunca t0 → t1 (yon = +1 / −1) 3B nokta dizisi; kapıda üstten dolanır */
  const cevreYol = (cv, t0, t1, yon, z, d) => { const P = cv.P, uz = yon > 0 ? (((t1 - t0) % P) + P) % P : (((t0 - t1) % P) + P) % P, olay = [];
    for (let i = 0; i < cv.n; i++) { const dt = yon > 0 ? (((cv.kum[i] - t0) % P) + P) % P : (((t0 - cv.kum[i]) % P) + P) % P; if (dt > 1e-6 && dt < uz - 1e-6) olay.push([dt, 'k', i]); }
    for (const kp of cv.kapilar) for (const [tt, tip] of [[kp[0], 'a'], [kp[1], 'b']]) { const dt = yon > 0 ? (((tt - t0) % P) + P) % P : (((t0 - tt) % P) + P) % P; if (dt > 1e-6 && dt < uz - 1e-6) olay.push([dt, tip, kp[2]]); }
    olay.sort((a, b) => a[0] - b[0]); const pts = [], T2 = dt => t0 + yon * dt; let zc = z; const ekle = (xy, zz) => { const p = [r3(xy[0]), r3(xy[1]), r3(zz)], s2 = pts[pts.length - 1]; if (!s2 || Math.hypot(s2[0] - p[0], s2[1] - p[1], s2[2] - p[2]) > 0.004) pts.push(p); };
    /* başlangıç kapı aralığının içindeyse yukarıdan başla */ for (const kp of cv.kapilar) { const tt = ((t0 % P) + P) % P, a = ((kp[0] % P) + P) % P, b = ((kp[1] % P) + P) % P; if (a < b ? (tt > a && tt < b) : (tt > a || tt < b)) zc = kp[2]; }
    ekle(cv.nok(t0, d), zc);
    for (const [dt, tip, v] of olay) { if (tip === 'k') ekle(cv.kose(v, d), zc); else { const xy = cv.nok(T2(dt), d), gir = (tip === 'a') === (yon > 0); ekle(xy, zc); zc = gir ? v : z; ekle(xy, zc); } }
    ekle(cv.nok(t1, d), zc); if (Math.abs(zc - z) > 1e-6) ekle(cv.nok(t1, d), z); return { pts, uz, kapi: olay.filter(o2 => o2[1] === 'a').length }; };
  const duvarIci = (res, o) => { const k = res.k, D = 0.04, all = MT.mahaller(), hat = (sys, pts, yb, arm) => { const c = MT.temizCap(Math.max(yb, 0.25), k), h = { sys, pts, yb, c, L: boy3(pts), arm: arm || null }; h.dp = c.R * h.L * (1 + k.yerel / 100); res.hat.push(h); return h; };
    const grup = lst => { const m = new Map(); for (const a of lst) { if (!m.has(a.mid)) m.set(a.mid, []); m.get(a.mid).push(a); } return m; };
    /* bir mahalde: kaynak parametresi ts'den armatürlere iki yöne dallanma (toplam boyu en kısa bölme) */
    const dagit = (sys, od, ts, lst, zh, ybOf, onceki, kritik) => { const cv = cevre(od), P = cv.P, it = lst.map(a => ({ a, t: (((cv.par(a.p) - ts) % P) + P) % P })).sort((x, y) => x.t - y.t); if (!it.length) return;
        let best = null; for (let s2 = 0; s2 <= it.length; s2++) { const ileri = s2 ? it[s2 - 1].t : 0, geri = s2 < it.length ? P - it[s2].t : 0, kp = (s2 ? cevreYol(cv, ts, ts + ileri, 1, zh, D).kapi : 0) + (s2 < it.length ? cevreYol(cv, ts, ts - geri, -1, zh, D).kapi : 0), mal = ileri + geri + kp * 4; if (!best || mal < best.mal) best = { s2, mal }; }
        const kol = (dizi, yon) => { let tp = 0, kalan = dizi.reduce((s3, x) => s3 + ybOf(x.a), 0), yol = onceki.slice(); for (const x of dizi) { const dt = yon > 0 ? x.t : P - x.t, yb = kalan, pr = cevreYol(cv, ts + yon * tp, ts + yon * dt, yon, zh, D); if (pr.uz > 0.02) yol.push(hat(sys, pr.pts, yb)); const a = x.a, wp = cv.nok(ts + yon * dt, D), zs = o.zf(a) + ARM[a.tip].zs, h2 = hat(sys, [[r3(wp[0]), r3(wp[1]), r3(zh)], [r3(wp[0]), r3(wp[1]), r3(zs)], [r3(a.p[0]), r3(a.p[1]), r3(zs)]], ybOf(a), a); if (kritik) kritik(a, yol.concat([h2])); kalan -= ybOf(a); tp = dt; } };
        kol(it.slice(0, best.s2), 1); kol(it.slice(best.s2).reverse().map(x => x), -1); return cv; };
    const odaOf = id => all.find(q => q.id === id), enYakin = (od, p) => { const cv = cevre(od); return { cv, t: cv.par(p) }; };
    /* ---- soğuk su ---- */
    if (o.G && o.su.length) { const G = o.G, zg = o.zb - k.girisDerin, gr = grup(o.su), ybA = a => a.tip === 'termosifon' ? o.ybSicak : ARM[a.tip].yb, ybTop = o.su.reduce((s2, a) => s2 + ybA(a), 0); res.ybEk = o.ts.length ? o.ybSicak : 0;
      const ilk = all.find(q => gr.has(q.id) && MT.inPoly(G.p, q.pts)) || odaOf([...gr.keys()].sort((a, b) => { const A = odaOf(a), B = odaOf(b), da = A ? Math.hypot((A.lp || MT.icNokta(A.pts))[0] - G.p[0], (A.lp || MT.icNokta(A.pts))[1] - G.p[1]) : 1e9, db = B ? Math.hypot((B.lp || MT.icNokta(B.pts))[0] - G.p[0], (B.lp || MT.icNokta(B.pts))[1] - G.p[1]) : 1e9; return da - db; })[0]);
      const zh = a => o.zf(a) + 0.30, a0 = gr.get(ilk.id)[0], g0 = enYakin(ilk, G.p), w0 = g0.cv.nok(g0.t, D), zm = o.tavan(a0) - 0.15, diger = [...gr.keys()].filter(id => id !== ilk.id), ybDiger = diger.reduce((s2, id) => s2 + gr.get(id).reduce((s3, a) => s3 + ybA(a), 0), 0);
      const hG = hat('soguk', [[r3(G.dis ? G.dis[0] : G.p[0]), r3(G.dis ? G.dis[1] : G.p[1]), r3(zg)], [r3(G.p[0]), r3(G.p[1]), r3(zg)], [r3(G.p[0]), r3(G.p[1]), r3(zh(a0))], [r3(w0[0]), r3(w0[1]), r3(zh(a0))]], ybTop); hG.giris = true; res.hat.splice(res.hat.indexOf(hG), 1); res.hat.unshift(hG);
      let kr = null; const krit = (a, yol) => { const dp = yol.reduce((s2, h) => s2 + h.dp, 0), hs = (o.zf(a) + ARM[a.tip].zs) - zg, top = dp / 9810 + hs + k.akma + k.sayac; if (!kr || top > kr.top) kr = { arm: a, dp, hs, top, yol }; };
      dagit('soguk', ilk, g0.t, gr.get(ilk.id), zh(a0), ybA, [hG], krit);
      if (diger.length) { const yuk = hat('soguk', [[r3(w0[0]), r3(w0[1]), r3(zh(a0))], [r3(w0[0]), r3(w0[1]), r3(zm)]], ybDiger);
        for (const id of diger) { const od = odaOf(id); if (!od) continue; const lst = gr.get(id), en = enYakin(od, w0), wE = en.cv.nok(en.t, D), yb = lst.reduce((s2, a) => s2 + ybA(a), 0), bes = hat('soguk', [[r3(w0[0]), r3(w0[1]), r3(zm)], [r3(wE[0]), r3(w0[1]), r3(zm)], [r3(wE[0]), r3(wE[1]), r3(zm)], [r3(wE[0]), r3(wE[1]), r3(zh(lst[0]))]], yb); dagit('soguk', od, en.t, lst, zh(lst[0]), ybA, [hG, yuk, bes], krit); } }
      Object.assign(res, { ybTop, QTop: hG.c.Q, cG: hG.c, kritik: kr });
    } else if (o.su.length) res.uyari.push('Temiz su girişi için dış duvar bulunamadı: SUGIRISI ile giriş noktasını gösterin.');
    /* ---- sıcak su ---- */
    if (o.ts.length && o.sic.length) { const t0 = o.ts[0], od0 = odaOf(t0.mid), gr = grup(o.sic), ybA = a => ARM[a.tip].yb, zhh = a => o.zf(a) + 0.40, zT = o.zf(t0) + 1.45;
      if (od0) { const e0 = enYakin(od0, t0.p), w0 = e0.cv.nok(e0.t, D), zm = o.tavan(t0) - 0.25, cik = hat('sicak', [[r3(t0.p[0]), r3(t0.p[1]), r3(zT)], [r3(w0[0]), r3(w0[1]), r3(zT)], [r3(w0[0]), r3(w0[1]), r3(zhh(t0))]], o.ybSicak);
        if (gr.has(od0.id)) dagit('sicak', od0, e0.t, gr.get(od0.id), zhh(t0), ybA, [cik], null);
        const diger = [...gr.keys()].filter(id => id !== od0.id); if (diger.length) { hat('sicak', [[r3(w0[0]), r3(w0[1]), r3(zT)], [r3(w0[0]), r3(w0[1]), r3(zm)]], diger.reduce((s2, id) => s2 + gr.get(id).reduce((s3, a) => s3 + ybA(a), 0), 0));
          for (const id of diger) { const od = odaOf(id); if (!od) continue; const lst = gr.get(id), en = enYakin(od, w0), wE = en.cv.nok(en.t, D), yb = lst.reduce((s2, a) => s2 + ybA(a), 0); hat('sicak', [[r3(w0[0]), r3(w0[1]), r3(zm)], [r3(wE[0]), r3(w0[1]), r3(zm)], [r3(wE[0]), r3(wE[1]), r3(zm)], [r3(wE[0]), r3(wE[1]), r3(zhh(lst[0]))]], yb); dagit('sicak', od, en.t, lst, zhh(lst[0]), ybA, [], null); } } }
    } else if (o.sic.length) res.uyari.push('Sıcak su kullanan armatür var ama termosifon yok: ARMATUR ile termosifon ekleyin.');
  };

  MT.sihhiHesap = () => {
    const k = MT.sh(), A = arms(); if (!A.length) return null; const su = A.filter(a => ARM[a.tip] && (ARM[a.tip].yb > 0 || a.tip === 'termosifon')), pis = A.filter(a => ARM[a.tip] && ARM[a.tip].sb > 0), ts = A.filter(a => a.tip === 'termosifon'), sic = A.filter(a => ARM[a.tip] && ARM[a.tip].sicak);
    const ilkOda = oda((pis[0] || su[0] || A[0]).mid), zb = Math.min(...A.map(a => +a.z0 || 0)), zf = a => zemin(a), hO = ilkOda ? (+ilkOda.h || 3) : 3, tavan = (a) => (MT.tavanAlt ? MT.tavanAlt(a.cp || a.p, +a.z0 || 0, (oda(a.mid) || { h: hO }).h || hO) : (+a.z0 || 0) + hO);
    /* --- bağlantı noktaları --- */
    let gir = nokta('giris'), rog = nokta('rogar'); const dd = disDuvar(ilkOda), otoG = !gir && dd ? { p: [dd.y.a[0] + dd.u[0] * 0.35 + dd.n[0] * 0.12, dd.y.a[1] + dd.u[1] * 0.35 + dd.n[1] * 0.12], dis: [dd.y.a[0] + dd.u[0] * 0.35 - dd.n[0] * (dd.t + 1.2), dd.y.a[1] + dd.u[1] * 0.35 - dd.n[1] * (dd.t + 1.2)] } : null;
    const G = gir ? { p: gir.p, dis: gir.disP } : otoG; const cx = pis.reduce((s, a) => s + a.p[0], 0) / Math.max(1, pis.length), cy = pis.reduce((s, a) => s + a.p[1], 0) / Math.max(1, pis.length);
    let cik = null, Rp = rog ? rog.p : null; if (dd) { const y = dd.y, tt = Math.max(0.15, Math.min(1 - 0.15 / 1, ((cx - y.a[0]) * dd.u[0] + (cy - y.a[1]) * dd.u[1]) / y.L)), w = [y.a[0] + dd.u[0] * y.L * Math.max(0.1, Math.min(0.9, tt)), y.a[1] + dd.u[1] * y.L * Math.max(0.1, Math.min(0.9, tt))]; cik = [w[0] + dd.n[0] * 0.15, w[1] + dd.n[1] * 0.15]; if (!Rp) Rp = [w[0] - dd.n[0] * (dd.t + 2.5), w[1] - dd.n[1] * (dd.t + 2.5)]; }
    if (rog && !dd) cik = rog.p; if (rog && dd) { /* çıkış: rögara en yakın iç nokta */ let best = null; for (const e of MT.mahaller()) for (const y of e.yuz || []) { if (y.k !== 'dis') continue; const u = [(y.b[0] - y.a[0]) / y.L, (y.b[1] - y.a[1]) / y.L], ccw = M.polyArea(e.pts) > 0, n = ccw ? [-u[1], u[0]] : [u[1], -u[0]], s = Math.max(0.2, Math.min(y.L - 0.2, (rog.p[0] - y.a[0]) * u[0] + (rog.p[1] - y.a[1]) * u[1])), w = [y.a[0] + u[0] * s, y.a[1] + u[1] * s], d = Math.hypot(w[0] - rog.p[0], w[1] - rog.p[1]); if (!best || d < best.d) best = { d, p: [w[0] + n[0] * 0.15, w[1] + n[1] * 0.15] }; } if (best) cik = best.p; }
    const res = { k, A, su, pis, ts, sic, G, cik, Rp, hat: [], uyari: [] };
    /* --- sıcak su: termosifon --- */
    const ssTop = sic.reduce((s, a) => s + ARM[a.tip].ss, 0), ani = ssTop * k.eszaman, hacimH = ani * k.depolama, hacim = TERMO.find(v => v >= hacimH - 1e-9) || TERMO[TERMO.length - 1], ybSicak = sic.reduce((s, a) => s + ARM[a.tip].yb, 0);
    Object.assign(res, { ssTop, ani, hacimH, hacim, ybSicak, ssList: Object.entries(sic.reduce((m, a) => { m[a.tip] = (m[a.tip] || 0) + 1; return m; }, {})).map(([t, n]) => ({ tip: t, ad: ARM[t].ad, n, ss: ARM[t].ss })) });
    if (k.dagitim === 'duvar') duvarIci(res, { su, sic, ts, G, zb, zf, tavan, ybSicak });
    else {
    /* --- temiz su ağacı --- */
    const zAna = a => k.dagitim === 'sap' ? zf(a) + 0.03 : tavan(a) - 0.15;
    if (G && su.length) {
      const N = MT._agac(G.p, su.map(a => ({ cp: a.cp, p: a.p, Qn: a.tip === 'termosifon' ? 0 : ARM[a.tip].yb, arm: a }))), Z = zincirler(N), zm = zAna(su[0]), zg = zb - k.girisDerin;
      Z.forEach(z => { const yb = z.rad && z.rad.arm.tip === 'termosifon' ? ybSicak : z.Q + 0, c = MT.temizCap(Math.max(yb, 0.25), k), pts = z.pts.map(p => [r3(p[0]), r3(p[1]), r3(zm)]); if (z.rad) { const a = z.rad.arm, zs = zf(a) + ARM[a.tip].zs; pts.push([r3(a.p[0]), r3(a.p[1]), r3(zs)]); }
        z.h = { sys: 'soguk', pts, yb, c, L: boy3(pts), arm: z.rad ? z.rad.arm : null }; z.h.dp = c.R * z.h.L * (1 + k.yerel / 100); res.hat.push(z.h); });
      const ybTop = su.reduce((s, a) => s + (ARM[a.tip].yb || 0), 0), cG = MT.temizCap(Math.max(ybTop, 0.25), k), gp = [[r3(G.dis ? G.dis[0] : G.p[0]), r3(G.dis ? G.dis[1] : G.p[1]), r3(zg)], [r3(G.p[0]), r3(G.p[1]), r3(zg)], [r3(G.p[0]), r3(G.p[1]), r3(zm)]];
      const hG = { sys: 'soguk', pts: gp, yb: ybTop, c: cG, L: boy3(gp), giris: true }; hG.dp = cG.R * hG.L * (1 + k.yerel / 100); res.hat.unshift(hG);
      /* kritik devre */
      let kr = null; Z.forEach(z => { if (!z.rad) return; let dp = hG.dp, u = z; const yol = []; for (; ;) { dp += u.h.dp; yol.push(u.h); if (u.ust < 0) break; u = Z[u.ust]; } const a = z.rad.arm, hs = (zf(a) + ARM[a.tip].zs) - zg, top = dp / 9810 + hs + k.akma + k.sayac; if (!kr || top > kr.top) kr = { arm: a, dp, hs, top, yol }; });
      Object.assign(res, { ybTop, QTop: cG.Q, cG, kritik: kr });
    } else if (su.length) res.uyari.push('Temiz su girişi için dış duvar bulunamadı: SUGIRISI ile giriş noktasını gösterin.');
    /* --- sıcak su ağacı (termosifondan) --- */
    if (ts.length && sic.length) { const t0 = ts[0], zT = zf(t0) + 1.45, zmh = zAna(t0) - (k.dagitim === 'sap' ? 0 : 0.10), N = MT._agac(t0.cp, sic.map(a => ({ cp: a.cp, p: a.p, Qn: ARM[a.tip].yb, arm: a }))), Z = zincirler(N);
      const cT = MT.temizCap(Math.max(ybSicak, 0.25), k), cp0 = [[r3(t0.p[0]), r3(t0.p[1]), r3(zT)], [r3(t0.p[0]), r3(t0.p[1]), r3(zmh)], [r3(t0.cp[0]), r3(t0.cp[1]), r3(zmh)]]; res.hat.push({ sys: 'sicak', pts: cp0, yb: ybSicak, c: cT, L: boy3(cp0) });
      Z.forEach(z => { const c = MT.temizCap(Math.max(z.Q, 0.25), k), pts = z.pts.map(p => [r3(p[0]), r3(p[1]), r3(zmh)]); if (z.rad) { const a = z.rad.arm; pts.push([r3(a.p[0]), r3(a.p[1]), r3(zf(a) + ARM[a.tip].zs)]); } res.hat.push({ sys: 'sicak', pts, yb: z.Q, c, L: boy3(pts), arm: z.rad ? z.rad.arm : null }); }); }
    else if (sic.length) res.uyari.push('Sıcak su kullanan armatür var ama termosifon yok: ARMATUR ile termosifon ekleyin.');
    }
    /* --- pis su ağacı --- */
    if (cik && pis.length) {
      const cikN = a => { const A2 = ARM[a.tip], n = nIc(a); return A2.pis[0] === 'duvar' ? { p: a.p, cp: [a.p[0] + n[0] * 0.25, a.p[1] + n[1] * 0.25] } : (A2.yer ? { p: a.cp || a.p, cp: a.cp || a.p } : { p: [a.p[0] + n[0] * A2.pis[1], a.p[1] + n[1] * A2.pis[1]], cp: [a.p[0] + n[0] * A2.pis[1], a.p[1] + n[1] * A2.pis[1]] }); };
      const N = MT._agac(cik, pis.map(a => Object.assign({ Qn: ARM[a.tip].sb, arm: a }, cikN(a)))), eg = k.egim / 100, ust = new Array(N.length).fill(0), wc = new Array(N.length).fill(false);
      const dol = i => { let m = 0, w = !!(N[i].rad && ARM[N[i].rad.arm.tip].dp >= 100); for (const c of N[i].ch) { const r = dol(c); m = Math.max(m, M.dist2(N[i].p, N[c].p) + r.m); w = w || r.w; } ust[i] = m; wc[i] = w; return { m, w }; }; dol(0);
      const zBas = zb - 0.30, zN = i => zBas - eg * ust[i], Z = zincirler(N);
      Z.forEach(z => { const yol = z.dug;
        const d = MT.pisCap(z.Q, false, Math.max(k.minPis, wc[z.son] ? 100 : 0)), pts = yol.map(i => [r3(N[i].p[0]), r3(N[i].p[1]), r3(zN(i))]).reverse(); /* akış yönünde: armatürden çıkışa */
        if (z.rad) { const a = z.rad.arm, A2 = ARM[a.tip], zc = A2.pis[0] === 'duvar' ? zf(a) + A2.pis[1] : zf(a); pts.unshift([pts[0][0], pts[0][1], r3(zc)]); }
        res.hat.push({ sys: 'pis', pts, sb: z.Q, d, L: boy3(pts), arm: z.rad ? z.rad.arm : null }); });
      const sbTop = N[0].Q, dC = MT.pisCap(sbTop, false, Math.max(k.minPis, wc[0] ? 100 : 0)), Lc = M.dist2(cik, Rp), zR = zN(0) - eg * Lc; res.hat.push({ sys: 'pis', pts: [[r3(cik[0]), r3(cik[1]), r3(zN(0))], [r3(Rp[0]), r3(Rp[1]), r3(zR)]], sb: sbTop, d: dC, L: Lc, cikis: true });
      /* havalık: ilk klozetin (yoksa ilk armatürün) yanından çatı üstüne */
      const hv = pis.find(a => ARM[a.tip].dp >= 100) || pis[0], n = nIc(hv), uu = [Math.cos(hv.ang || 0), Math.sin(hv.ang || 0)], hp = [hv.p[0] + uu[0] * 0.28 + n[0] * 0.03, hv.p[1] + uu[1] * 0.28 + n[1] * 0.03], c0 = cikN(hv).cp, zTop = Math.max(...C.doc.ents.filter(e => e.type === 'plak').map(e => +e.zt || 0), (+hv.z0 || 0) + hO) + 0.6;
      res.hat.push({ sys: 'havalik', pts: [[r3(c0[0]), r3(c0[1]), r3(zBas)], [r3(hp[0]), r3(hp[1]), r3(zBas)], [r3(hp[0]), r3(hp[1]), r3(zTop)]], sb: 0, d: 70, L: zTop - zBas });
      Object.assign(res, { sbTop, dC, zR, zCik: zN(0) });
    } else if (pis.length) res.uyari.push('Pis su çıkışı için dış duvar bulunamadı: ROGARYERI ile rögarın yerini gösterin.');
    /* --- yağmur suyu (ön hesap) --- */
    const cati = C.doc.ents.filter(e => e.type === 'plak' && e.kind !== 'radye' && e.pts && e.pts.length >= 3), zmax = cati.length ? Math.max(...cati.map(e => +e.zt || 0)) : 0, Ac = cati.filter(e => (+e.zt || 0) > zmax - 0.3).reduce((s, e) => s + Math.abs(M.polyArea(e.pts.map(q => [q[0], q[1]]))), 0);
    Object.assign(res, { catiA: Ac, Qy: Ac * k.yagis / 10000, nY: Math.max(Ac > 0 ? 2 : 0, Math.ceil(Ac * k.yagis / 10000 / 4.7)) });
    return res;
  };
  const etiket = h => h.sys === 'pis' ? `Ø${h.d}-${f(h.sb, h.sb % 1 ? 1 : 0)}sb` : h.sys === 'havalik' ? 'Ø70 havalık' : `${h.c.inc}-${f(h.yb, (h.yb * 100) % 100 ? 2 : (h.yb % 1 ? 1 : 0))}yb`;
  MT.sihhiBoruCiz = () => {
    const h = MT.sihhiHesap(); if (!h) return null; C.undoStack.push(C.snapshot()); const sil = new Set(borular().map(e => e.id)); C.doc.ents = C.doc.ents.filter(e => !sil.has(e.id));
    const chg = C.changed; C.changed = () => { }; let n = 0;
    try { for (const b of h.hat) { if (b.L < 0.03) continue; const x = C.newEnt('mtsboru', { layer: lay(b.sys === 'pis' || b.sys === 'havalik' ? 'MT_SIHHI_PIS' : 'MT_SIHHI_TEMIZ', b.sys === 'pis' ? 6 : 5, 30), dis: 'Mekanik', pts: b.pts, sys: b.sys, dn: etiket(b), d: b.sys === 'pis' || b.sys === 'havalik' ? b.d / 1000 : b.c.dis / 1000, yb: b.yb, sb: b.sb, Q: b.c ? +b.c.Q.toFixed(3) : undefined, v: b.c ? +b.c.v.toFixed(2) : undefined, z0: +(h.A[0].z0) || 0 }); delete x.sv2; C.add(x); n++; }
      /* bağlantı işaretleri */
      if (h.G && !nokta('giris')) { const x = C.add(C.newEnt('mtsnokta', { layer: lay('MT_SIHHI_TEMIZ', 5, 30), dis: 'Mekanik', kind: 'giris', p: h.G.p.map(r3) })); if (h.G.dis) x.disP = h.G.dis.map(r3); }
      if (h.Rp && !nokta('rogar')) C.add(C.newEnt('mtsnokta', { layer: lay('MT_SIHHI_PIS', 6, 30), dis: 'Mekanik', kind: 'rogar', p: h.Rp.map(r3), no: 'R1', zt: Math.min(...h.A.map(a => +a.z0 || 0)) - 0.15 }));
      for (const t of h.ts) { t.hacim = h.hacim; delete t._c; }
    } finally { C.changed = chg; }
    C.changed(); C.emit && C.emit('layers'); return Object.assign(h, { nBoru: n });
  };

  /* ====================================================================
     KOLON ŞEMASI (açılım) + ARMATÜR LİSTESİ — kağıt mm
     ==================================================================== */
  MT.sihhiSema = (h) => { h = h || MT.sihhiHesap(); if (!h) return null; const g = { L: [], T: [] }, Ln = (a, b, c, d, s) => g.L.push([a, b, c, d, s || 'i']), Tx = (x, y, hh, s, al, rot, col) => g.T.push([x, y, hh, s, al || 'L', rot || 0, col || 7]);
    const k = h.k, ar = h.A.filter(a => a.tip !== 'termosifon'), ad = a => MT._mhAd ? MT._mhAd(a.mid) : '', gx = 26, n = ar.length, W = 30 + n * gx, yS = 64, yH = 58, yP = 0, yA = 22;
    /* armatürler girişten uzaklığa göre: en uzak sağda */
    const uz = a => h.G ? Math.abs(a.p[0] - h.G.p[0]) + Math.abs(a.p[1] - h.G.p[1]) : 0; ar.sort((a, b) => uz(a) - uz(b));
    Ln(-30, 76, W, 76, 'k'); Tx(-30, 78, 2.2, 'TAVAN', 'L', 0, 8); Ln(-30, yP + 8, W, yP + 8, 'k'); Tx(-30, yP + 9.5, 2.2, 'ZEMİN ±0.00', 'L', 0, 8);
    /* soğuk su ana hattı (mavi 's'), sıcak su (kırmızı 'd' kesikli), pis su (mor 'x') */
    let ybK = 0, sbK = 0; const ybs = [], sbs = []; for (let i = n - 1; i >= 0; i--) { ybK += ARM[ar[i].tip].yb; ybs[i] = ybK; } for (let i = n - 1; i >= 0; i--) { sbK += ARM[ar[i].tip].sb; sbs[i] = sbK; }
    Ln(-18, yP - 8, -18, yS, 's'); Ln(-18, yS, 14 + (n - 1) * gx, yS, 's'); Tx(-20, yP - 12, 2.2, `ŞEBEKEDEN ${h.cG ? h.cG.inc : ''}`, 'L', 0, 5); if (h.cG) Tx(-16, yS + 1.5, 2, `${h.cG.inc}-${f(h.ybTop, 2)}yb`, 'L', 0, 5);
    const sicVar = h.ts.length && h.sic.length, tx = -6; if (sicVar) { Ln(tx - 5, 34, tx + 5, 34, 'k'); Ln(tx - 5, 52, tx + 5, 52, 'k'); Ln(tx - 5, 34, tx - 5, 52, 'k'); Ln(tx + 5, 34, tx + 5, 52, 'k'); Tx(tx, 45, 2, 'ELK.', 'MC'); Tx(tx, 42, 2, 'TERM.', 'MC'); Tx(tx, 38.5, 2, `${h.hacim} LT`, 'MC', 0, 2); Ln(tx - 3, 52, tx - 3, yS, 's'); Ln(tx + 3, 52, tx + 3, yH, 'd'); const son = ar.reduce((m, a, i) => ARM[a.tip].sicak ? i : m, -1); if (son >= 0) Ln(tx + 3, yH, 14 + son * gx - 3, yH, 'd'); }
    Ln(8, yP, 14 + (n - 1) * gx + 4, yP, 'x'); Ln(8, yP, -24, yP - 3, 'x'); Tx(-24, yP - 7.5, 2.2, `RÖGAR R1 · Ø${h.dC || 100}-${f(h.sbTop || 0, 0)}sb · eğim %${k.egim}`, 'L', 0, 6); Tx(-2, yP + 1.5, 1.8, 'ÇEK VALF', 'MC', 0, 6);
    ar.forEach((a, i) => { const A2 = ARM[a.tip], x = 14 + i * gx;
      /* armatür kutusu */
      Ln(x - 8, yA, x + 8, yA, 'r'); Ln(x - 8, yA + 14, x + 8, yA + 14, 'r'); Ln(x - 8, yA, x - 8, yA + 14, 'r'); Ln(x + 8, yA, x + 8, yA + 14, 'r'); Tx(x, yA + 9, 2.2, a.no || '', 'MC', 0, 2); Tx(x, yA + 5.5, 1.7, A2.ad.split(' (')[0].slice(0, 14), 'MC'); Tx(x, yA + 2.2, 1.6, ad(a).slice(0, 15), 'MC', 0, 8);
      if (A2.yb > 0) { Ln(x - 3, yS, x - 3, yA + 14, 's'); const c = MT.temizCap(A2.yb, k); Tx(x - 4.5, yA + 24, 1.7, `${c.inc}-${f(A2.yb, 2)}yb`, 'MC', Math.PI / 2, 5); if (i < n - 1) { const c2 = MT.temizCap(Math.max(0.25, ybs[i + 1] || 0), k); if (ybs[i + 1] > 0) Tx(x + gx / 2, yS + 1.5, 1.7, `${c2.inc}-${f(ybs[i + 1], 2)}yb`, 'MC', 0, 5); } }
      if (A2.sicak && sicVar) { Ln(x + 3, yH, x + 3, yA + 14, 'd'); }
      if (A2.sb > 0) { Ln(x, yA, x, yP, 'x'); Tx(x + 1.8, yP + 12, 1.7, `Ø${Math.max(A2.dp, k.minPis)}-${A2.sb}sb`, 'MC', Math.PI / 2, 6); if (i > 0) Tx(x - gx / 2, yP - 3.5, 1.7, `Ø${MT.pisCap(sbs[i], false, Math.max(k.minPis, ar.slice(i).some(q => ARM[q.tip].dp >= 100) ? 100 : 0))}-${f(sbs[i], 0)}sb`, 'MC', 0, 6); }
    });
    /* havalık */
    const hi = ar.findIndex(a => ARM[a.tip].dp >= 100); if (hi >= 0) { const x = 14 + hi * gx + 9.5; Ln(x, yP, x, 84, 'i'); Ln(x - 2, 84, x + 2, 84, 'i'); Tx(x + 1.5, 80, 1.7, 'Ø70 HAVALIK', 'L', 0, 8); }
    Ln(-30, -22, -20, -22, 's'); Tx(-18, -23, 2, 'soğuk su', 'L'); Ln(2, -22, 12, -22, 'd'); Tx(14, -23, 2, 'sıcak su', 'L'); Ln(34, -22, 44, -22, 'x'); Tx(46, -23, 2, 'pis su', 'L');
    Tx(-30, 94, 4, 'SIHHİ TESİSAT KOLON ŞEMASI', 'L', 0, 2); Tx(-30, 88.5, 2.2, `Q = ${f(k.K, 2)}·√YB${h.QTop ? ' = ' + f(h.QTop, 2) + ' l/s' : ''} · temiz su PPRC PN25 · pis su PVC · gerekli giriş basıncı ${h.kritik ? f(h.kritik.top, 1) + ' mSS' : '—'}`, 'L');
    return g; };
  MT.sihhiListe = (h) => { h = h || MT.sihhiHesap(); if (!h) return null; const g = { L: [], T: [] }, col = [0, 14, 62, 112, 132, 152, 176, 214], bas = ['No', 'Mahal', 'Armatür', 'YB', 'SB', 'Sıcak su (lt/h)', 'Bağlantı'], rh = 6, rows = h.A.map(a => { const A2 = ARM[a.tip]; return [a.no, MT._mhAd ? MT._mhAd(a.mid) : '', A2.ad + (a.tip === 'termosifon' ? ` ${a.hacim || h.hacim} L` : ''), A2.yb ? f(A2.yb, 2) : '—', A2.sb || '—', A2.ss || '—', (A2.yb ? MT.temizCap(A2.yb, h.k).inc : '') + (A2.sb ? (A2.yb ? ' / ' : '') + 'Ø' + Math.max(A2.dp, h.k.minPis) : '')]; }), n = rows.length, top = (n + 2) * rh;
    for (let i = 0; i <= n + 2; i++) g.L.push([0, top - i * rh, col[7], top - i * rh, i < 2 || i >= n + 1 ? 'k' : 'i']); col.forEach((x, i) => g.L.push([x, top, x, top - (n + 2) * rh, i === 0 || i === 7 ? 'k' : 'i']));
    bas.forEach((b, i) => g.T.push([col[i] + 1.5, top - rh + 1.8, 2.2, b, 'L', 0, 2])); rows.forEach((r, i) => r.forEach((t, j) => g.T.push([col[j] + 1.5, top - (i + 2) * rh + 1.8, 2, String(t).slice(0, Math.floor((col[j + 1] - col[j]) / 1.2)), 'L', 0, 7])));
    const yt = top - (n + 2) * rh + 1.8; g.T.push([col[0] + 1.5, yt, 2.2, 'TOPLAM', 'L', 0, 2], [col[3] + 1.5, yt, 2.2, f(h.ybTop || 0, 2), 'L', 0, 2], [col[4] + 1.5, yt, 2.2, f(h.sbTop || 0, 0), 'L', 0, 2], [col[5] + 1.5, yt, 2.2, f(h.ssTop || 0, 1), 'L', 0, 2]);
    g.T.push([0, top + 4, 4, 'SIHHİ TESİSAT — ARMATÜR LİSTESİ', 'L', 0, 2], [0, -5, 2.2, `Temiz su: Q = ${f(h.k.K, 2)}·√YB · Çap: ${TEMIZ.slice(0, 5).map((t, i) => (i ? f(TEMIZ[i - 1][0], 1) : '0') + '–' + f(t[0], 1) + ' YB ' + t[1]).join(' · ')}`, 'L', 0, 7], [0, -9.5, 2.2, `Pis su yatay: ${PISY.map((t, i) => (i ? PISY[i - 1][0] : 0) + '–' + t[0] + ' SB Ø' + t[1]).join(' · ')}`, 'L', 0, 7]);
    return g; };

  /* ====================================================================
     PAFTA, ÇAKIŞMA, RAPOR bağlantıları
     ==================================================================== */
  if (MT._SIS) MT._SIS.sihhi = { ad: 'SIHHİ TESİSAT', kisa: 'SIHHİ TESİSAT', var: () => arms().length > 0, ents: e => e.type === 'mtarm' || e.type === 'mtsboru' || e.type === 'mtsnokta', sema: () => { const h = MT.sihhiHesap(); return [['shkolon', MT.sihhiSema(h)], ['shlist', MT.sihhiListe(h)]]; } };
  MT.cakismaHat = MT.cakismaHat || [];
  MT.cakismaHat.push(() => { const out = []; for (const e of borular()) { const r = Math.max(0.01, (e.d || 0.025) / 2), S = SYS[e.sys] || SYS.soguk; for (let i = 1; i < e.pts.length; i++) { const a = e.pts[i - 1], b = e.pts[i]; if (Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) < 0.03) continue; out.push({ a, b, id: e.id, r, hw: r, hh: r, cap: r, sys: 'Sıhhi', ad: `${S.ad} borusu ${e.dn || ''}`, dusey: Math.abs(b[2] - a[2]) > Math.hypot(b[0] - a[0], b[1] - a[1]) }); } } return out; });
  MT.raporEk = MT.raporEk || [];
  MT.raporEk.push(() => { const h = MT.sihhiHesap(); if (!h) return ''; const k = h.k, B = borular(), say = Object.entries(h.A.reduce((m, a) => { m[a.tip] = (m[a.tip] || 0) + 1; return m; }, {})), boyTop = s => B.filter(b => b.sys === s).reduce((t, b) => t + boy3(b.pts), 0);
    const capBoy = (s) => { const m = new Map(); for (const b of B.filter(q => q.sys === s)) { const key = s === 'pis' ? 'Ø' + Math.round(b.d * 1000) : String(b.dn || '').split('-')[0]; m.set(key, (m.get(key) || 0) + boy3(b.pts)); } return [...m].map(([a, l]) => `<tr><td>${esc(a)}</td><td class="n">${f(l, 1)}</td></tr>`).join(''); };
    return `<h2>15. Sıhhi tesisat</h2><div class="kart"><div><b>${f(h.ybTop || 0, 2)} YB</b><span>Toplam yük birimi</span></div><div><b>${f(h.QTop || 0, 2)} l/s</b><span>Temiz su tüketim debisi</span></div><div><b>${h.cG ? h.cG.inc : '—'}</b><span>Şebeke bağlantı çapı (PPRC Ø${h.cG ? h.cG.dis : '—'})</span></div><div><b>${h.hacim} L</b><span>Elektrikli termosifon</span></div><div><b>Ø${h.dC || '—'}</b><span>Bina pis su çıkışı (${f(h.sbTop || 0, 0)} SB)</span></div></div>
<h3>Temiz su tesisatı</h3><p>Kullanma suyu şebekeden alınır. Boru çapları yükleme birimi yöntemiyle belirlenmiştir: bir binada bütün muslukların aynı anda kullanılması beklenmediğinden debi, yükleme birimleri toplamının kareköküyle orantılı alınır.</p>
<p><b>Q = K · √YB</b> &nbsp; K = ${f(k.K, 2)} l/s &nbsp; YB = ${f(h.ybTop || 0, 2)} &nbsp;→&nbsp; Q = ${f(k.K, 2)} × √${f(h.ybTop || 0, 2)} = <b>${f(h.QTop || 0, 2)} l/s</b></p>
<table><tr><th>Armatür</th><th class="n">Adet</th><th class="n">Yükleme birimi</th><th class="n">Toplam YB</th><th class="n">Sarfiyat birimi</th><th class="n">Toplam SB</th></tr>${say.filter(([t]) => t !== 'termosifon').map(([t, n]) => `<tr><td>${esc(ARM[t].ad)}</td><td class="n">${n}</td><td class="n">${ARM[t].yb ? f(ARM[t].yb, 2) : '—'}</td><td class="n">${ARM[t].yb ? f(ARM[t].yb * n, 2) : '—'}</td><td class="n">${ARM[t].sb || '—'}</td><td class="n">${ARM[t].sb ? ARM[t].sb * n : '—'}</td></tr>`).join('')}${h.ybEk ? `<tr><td>Termosifon beslemesi (sıcak su kullanan armatürlerin yük birimi)</td><td class="n">1</td><td class="n">${f(h.ybEk, 2)}</td><td class="n">${f(h.ybEk, 2)}</td><td class="n">—</td><td class="n">—</td></tr>` : ''}<tr class="top"><td colspan="3">Toplam</td><td class="n">${f(h.ybTop || 0, 2)}</td><td></td><td class="n">${f(h.sbTop || 0, 0)}</td></tr></table>
<table style="width:auto"><tr><th>Yükleme birimi</th>${TEMIZ.map((t, i) => `<td class="n">${i ? f(TEMIZ[i - 1][0], 1) : '0'} – ${f(t[0], 1)}</td>`).join('')}</tr><tr><th>Boru çapı</th>${TEMIZ.map(t => `<td class="n">${t[1]}</td>`).join('')}</tr><tr><th>PPRC</th>${TEMIZ.map(t => `<td class="n">Ø${t[2]}</td>`).join('')}</tr></table>
<p class="mut">Borular PN25 cam elyaf takviyeli PPRC; en küçük çap ${TEMIZ[Math.min(TEMIZ.length - 1, +k.minCap || 0)][1]}. ${k.dagitim === 'duvar' ? 'Soğuk ve sıcak su boruları duvar içinden gider: soğuk su bitmiş zeminden 30 cm, sıcak su 40 cm yukarıda yatay, armatüre duvar içinde düşey; kapı boşluklarında kapı üstünden dolanır.' : 'Ana dağıtım ' + (k.dagitim === 'sap' ? 'şap içinden' : 'tavan altından') + ', armatürlere duvardan iniş.'} Islak hacim girişlerinde ve kolon dibinde küresel kesme vanası kullanılır.</p>
${h.kritik ? `<p>Kritik devre: <b>${esc(h.kritik.arm.no)}</b> (${esc(ARM[h.kritik.arm.tip].ad)}) — sürtünme + yerel kayıplar ${f(h.kritik.dp / 9810, 2)} mSS + statik yükseklik ${f(h.kritik.hs, 2)} m + akma basıncı ${f(k.akma, 0)} mSS + sayaç ${f(k.sayac, 0)} mSS = <b>${f(h.kritik.top, 1)} mSS (${f(h.kritik.top / 10.2, 2)} bar)</b> gerekli şebeke basıncı.</p>` : ''}
<h3>Sıcak su ihtiyacı</h3><p>Sıcak kullanma suyu elektrikli termosifon ile sağlanır.</p>
<table style="width:auto"><tr><th>Cihaz</th><th class="n">Adet</th><th class="n">Debi (lt/h)</th><th class="n">Toplam (lt/h)</th></tr>${h.ssList.map(x => `<tr><td>${esc(x.ad)}</td><td class="n">${x.n}</td><td class="n">${f(x.ss, 1)}</td><td class="n">${f(x.ss * x.n, 1)}</td></tr>`).join('')}<tr class="top"><td colspan="3">Toplam</td><td class="n">${f(h.ssTop, 1)}</td></tr></table>
<p>Kullanma eş zaman faktörü = ${f(k.eszaman, 2)} &nbsp;·&nbsp; Ortalama ani ihtiyaç = ${f(k.eszaman, 2)} × ${f(h.ssTop, 1)} = ${f(h.ani, 2)} lt/h<br>Depolama faktörü = ${f(k.depolama, 2)} &nbsp;·&nbsp; Termosifon hacmi = ${f(h.ani, 2)} × ${f(k.depolama, 2)} = ${f(h.hacimH, 1)} lt &nbsp;→&nbsp; <b>seçilen: ${h.hacim} lt, elektrik ısıtıcılı</b> (su debisi ${f(h.ssTop, 1)} lt/h, 10–45 °C)</p>
<h3>Pis su tesisatı</h3><p>Islak hacimlerden gelen atık sular PVC borularla en kısa yoldan rögara verilir; yatay borular %${k.egim} eğimle döşeme altından gider, bina çıkışında çek valf bulunur. Çaplar sarfiyat birimine göre belirlenmiştir.</p>
<table style="width:auto"><tr><th>Yatay — sarfiyat birimi</th>${PISY.map((t, i) => `<td class="n">${i ? PISY[i - 1][0] : 0} – ${t[0]}</td>`).join('')}</tr><tr><th>Boru çapı</th>${PISY.map(t => `<td class="n">Ø${t[1]}</td>`).join('')}</tr></table>
<table style="width:auto"><tr><th>Düşey — sarfiyat birimi</th>${PISD.map((t, i) => `<td class="n">${i ? PISD[i - 1][0] : 0} – ${t[0]}</td>`).join('')}</tr><tr><th>Boru çapı</th>${PISD.map(t => `<td class="n">Ø${t[1]}</td>`).join('')}</tr></table>
<p>Bina çıkışı: ${f(h.sbTop || 0, 0)} SB → <b>Ø${h.dC || '—'}</b>, rögar giriş akar kotu ${f(h.zR != null ? h.zR : 0, 2)} m. En küçük yatay çap Ø${k.minPis}; klozet bağlanan hatlar en az Ø100. Havalık borusu Ø70 çatı üstüne çıkarılır.</p>
${B.length ? `<h3>Boru metrajı</h3><table style="width:auto"><tr><th>Soğuk su</th><th class="n">m</th></tr>${capBoy('soguk')}<tr class="top"><td>Toplam</td><td class="n">${f(boyTop('soguk'), 1)}</td></tr></table><table style="width:auto"><tr><th>Sıcak su</th><th class="n">m</th></tr>${capBoy('sicak')}<tr class="top"><td>Toplam</td><td class="n">${f(boyTop('sicak'), 1)}</td></tr></table><table style="width:auto"><tr><th>Pis su (PVC)</th><th class="n">m</th></tr>${capBoy('pis')}<tr class="top"><td>Toplam</td><td class="n">${f(boyTop('pis'), 1)}</td></tr></table>` : '<p class="mut">Borular henüz çizilmedi (SIHHITESISAT).</p>'}
${h.catiA > 0 ? `<h3>Yağmur suyu (ön hesap)</h3><p>Çatı alanı ${f(h.catiA, 1)} m² · yağış şiddeti ${k.yagis} l/s·ha → Q = ${f(h.Qy, 2)} l/s → en az <b>${h.nY} adet Ø100</b> yağmur inişi (Ø100 iniş ≈ 4,7 l/s). İnişler çatı modülündeki yağmur borularıyla eşleştirilmelidir; bu modül yağmur borusu çizmez.</p>` : ''}
<div class="not">Yükleme ve sarfiyat birimleri ile çap tabloları sıhhi tesisat paftasındaki değerlerdir (MMO 2002/260-2, TS 1258). Basınç hesabı ön boyutlandırmadır: sayaç ve cihaz kayıpları sabit alınmıştır. Boru güzergâhı dik açılı en kısa yol mantığıyla çizilir; uygulamadan önce denetlenmelidir.</div>`; });

  /* ====================================================================
     PANEL SEKMESİ
     ==================================================================== */
  MT.sihhiPanel = (el, m, U) => { const k = MT.sh(), F = U.F, h = arms().length ? MT.sihhiHesap() : null, N = (q, st = 1) => `<input type="number" step="${st}" data-q="${q}" value="${k[q]}">`, kom = async c => { C.closeModal(); try { await C.cmd.run(c); } catch (e) { } };
    el.innerHTML = `<div class="g2"><div>
${F('Temiz su ana dağıtımı', `<select data-q="dagitim" data-s>${U.opt([['duvar', 'Duvar içinden (mahal çevresi boyunca)'], ['tavan', 'Tavan altından (duvardan iniş)'], ['sap', 'Şap içinden (duvardan çıkış)']], k.dagitim)}</select>`)}
${F('En küçük temiz su çapı', `<select data-q="minCap">${U.opt(TEMIZ.slice(0, 3).map((t, i) => [i, t[1] + ' (PPRC Ø' + t[2] + ')']), k.minCap)}</select>`)}
${F('Debi katsayısı K (l/s) — Q = K·√YB', N('K', 0.05))}
${F('Sıcak su: eş zaman faktörü / depolama faktörü', `<div style="display:flex;gap:6px"><input type="number" step="0.05" data-q="eszaman" value="${k.eszaman}" style="flex:1"><input type="number" step="0.1" data-q="depolama" value="${k.depolama}" style="flex:1"></div>`)}
</div><div>
${F('Pis su eğimi (%) / en küçük yatay çap (mm)', `<div style="display:flex;gap:6px"><input type="number" step="0.5" data-q="egim" value="${k.egim}" style="flex:1"><select data-q="minPis" style="flex:1">${U.opt([[50, 'Ø50'], [70, 'Ø70'], [100, 'Ø100']], k.minPis)}</select></div>`)}
${F('Akma basıncı / sayaç kaybı (mSS)', `<div style="display:flex;gap:6px"><input type="number" data-q="akma" value="${k.akma}" style="flex:1"><input type="number" data-q="sayac" value="${k.sayac}" style="flex:1"></div>`)}
${F('Şebeke borusu derinliği (m) / yerel kayıp (%)', `<div style="display:flex;gap:6px"><input type="number" step="0.1" data-q="girisDerin" value="${k.girisDerin}" style="flex:1"><input type="number" step="5" data-q="yerel" value="${k.yerel}" style="flex:1"></div>`)}
${F('Yağış şiddeti (l/s·ha)', N('yagis', 10))}
</div></div>
<div class="bar" style="margin-top:10px"><button class="pri" data-c="SIHHITESISAT">Sıhhi tesisatı oluştur (armatür + boru)</button><button data-c="ARMATURYERLESTIR">Yalnız armatürler</button><button data-c="ARMATUR">Armatür ekle…</button><button data-c="ARMATURMODEL">Kütüphaneye model ata…</button><button data-c="SUGIRISI">Su girişini göster</button><button data-c="ROGARYERI">Rögar yerini göster</button><button data-c="SIHHIBORU">Boruları yeniden çiz</button><button data-c="TESISATPAFTA W">Sıhhi tesisat paftası</button><button data-c="SIHHISIL">Sil</button></div>
${h ? `<div class="kart"><div><b>${h.A.length} armatür</b><span>${f(h.ybTop || 0, 2)} YB · ${f(h.sbTop || 0, 0)} SB</span></div><div><b>${f(h.QTop || 0, 2)} l/s · ${h.cG ? h.cG.inc : '—'}</b><span>Temiz su debisi ve giriş çapı</span></div><div><b>${h.hacim} L</b><span>Elektrikli termosifon</span></div><div><b>Ø${h.dC || '—'}</b><span>Bina pis su çıkışı</span></div><div><b>${h.kritik ? f(h.kritik.top, 1) + ' mSS' : '—'}</b><span>Gerekli şebeke basıncı</span></div></div>${h.uyari.map(u => `<p class="bad">${esc(u)}</p>`).join('')}<p class="mut">Armatürleri plan üzerinde taşıyıp "Boruları yeniden çiz" ile güzergâhı yenileyebilirsiniz. Ayrıntılı hesap raporun 15. bölümündedir.</p>` : '<p class="mut">Önce ıslak hacimler mahal olarak tanımlı olmalı (WC, banyo / duş, soyunma, mutfak, laboratuvar). "Sıhhi tesisatı oluştur" armatürleri yerleştirir, su girişini ve rögarı en yakın dış duvara koyar, soğuk su – sıcak su – pis su borularını çizer.</p>'}
<table style="margin-top:8px"><tr><th>Armatür</th>${Object.values(ARM).filter(a => !a.cihaz).map(a => `<th class="n">${esc(a.ad.split(' (')[0])}</th>`).join('')}</tr><tr><td>Yük birimi (YB)</td>${Object.values(ARM).filter(a => !a.cihaz).map(a => `<td class="n">${a.yb ? f(a.yb, 2) : '—'}</td>`).join('')}</tr><tr><td>Sarf birimi (SB)</td>${Object.values(ARM).filter(a => !a.cihaz).map(a => `<td class="n">${a.sb || '—'}</td>`).join('')}</tr></table>`;
    el.querySelectorAll('[data-q]').forEach(i => i.onchange = () => { const q = i.dataset.q; k[q] = i.dataset.s != null ? i.value : (U.num(i.value) ?? k[q]); U.dirty(); MT.sihhiPanel(el, m, U); });
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => kom(b.dataset.c)); };

  /* ====================================================================
     KOMUTLAR
     ==================================================================== */
  const enYakinDuvar = p => { let best = null; for (const e of MT.mahaller()) { const ccw = M.polyArea(e.pts) > 0, ic = MT.inPoly(p, e.pts); for (const y of e.yuz || []) { if (y.L < 0.3) continue; const u = [(y.b[0] - y.a[0]) / y.L, (y.b[1] - y.a[1]) / y.L], n = ccw ? [-u[1], u[0]] : [u[1], -u[0]], s = Math.max(0, Math.min(y.L, (p[0] - y.a[0]) * u[0] + (p[1] - y.a[1]) * u[1])), w = [y.a[0] + u[0] * s, y.a[1] + u[1] * s], d = Math.hypot(p[0] - w[0], p[1] - w[1]) + (ic ? 0 : 0.5); if (!best || d < best.d) best = { d, e, y, u, n, s, w }; } } return best; };
  C.addCommand(['ARMATURYERLESTIR', 'ARMATURLER'], 'Islak hacimlere (WC, banyo / duş, soyunma, mutfak, laboratuvar) armatürleri yerleştirir: klozet, lavabo, duş, evye, yer süzgeci, termosifon (eski armatür ve borular silinir).', async () => { const r = MT.armYerlestir(); if (!r.n) { C.warn('Islak hacim bulunamadı: mahal listesinde WC, banyo / duş, soyunma, mutfak ya da laboratuvar tipinde mahal olmalı (Tesisat paneli ▸ 3 · Mahaller).'); return; } C.log(`${r.n} armatür ${r.oda} ıslak hacme yerleştirildi. Yerlerini taşıyabilir, ARMATUR ile ekleme yapabilirsiniz; borular için SIHHIBORU.`); });
  C.addCommand(['ARMATUR', 'ARMATUREKLE'], 'Kütüphaneden armatür ekler: tipi seçin, duvara yakın bir noktaya tıklayın (duvara yaslanır). Tipler: L lavabo, K klozet, H alaturka hela, P pisuvar, D duş, E evye, LE laboratuvar evyesi, CM çamaşır mak., BM bulaşık mak., YS yer süzgeci, ET termosifon.', async (I) => {
    const KW = [['L', 'Lavabo'], ['K', 'Klozet'], ['H', 'Alaturka hela'], ['P', 'Pisuvar'], ['D', 'Duş'], ['E', 'Evye'], ['LE', 'Laboratuvar evyesi'], ['CM', 'Çamaşır makinesi bağlantısı'], ['BM', 'Bulaşık makinesi bağlantısı'], ['YS', 'Yer süzgeci'], ['ET', 'Elektrikli termosifon']], MAP = { L: 'lavabo', K: 'klozet', H: 'alaturka', P: 'pisuvar', D: 'dus', E: 'evye', LE: 'labevye', CM: 'camasir', BM: 'bulasik', YS: 'suzgec', ET: 'termosifon' };
    const t = await I.kw('Armatür', KW, 'L'); if (!t) return; const tip = MAP[t]; let n = 0;
    for (; ;) { const p = await I.pt(`${ARM[tip].ad}: ${ARM[tip].yer ? 'yeri' : 'duvara yakın nokta'} (Enter bitir)`); if (!p || typeof p === 'string') break; const b = enYakinDuvar(p); if (!b) { C.warn('Önce MAHALBUL ile mahalleri oluşturun.'); break; }
      const say = arms().filter(a => a.tip === tip).length + 1, KIS = { lavabo: 'L', klozet: 'K', alaturka: 'H', pisuvar: 'P', dus: 'D', evye: 'E', labevye: 'E', camasir: 'ÇM', bulasik: 'BM', suzgec: 'YS', termosifon: 'ET' };
      const o = ARM[tip].yer ? { p: [r3(p[0]), r3(p[1])], cp: [r3(p[0]), r3(p[1])], ang: 0 } : { p: [r3(b.w[0] + b.n[0] * 0.01), r3(b.w[1] + b.n[1] * 0.01)], cp: [r3(b.w[0] + b.n[0] * 0.35), r3(b.w[1] + b.n[1] * 0.35)], ang: Math.atan2(b.u[1], b.u[0]) };
      const x = C.add(C.newEnt('mtarm', Object.assign({ layer: lay('MT_SIHHI_ARMATUR', 4, 25), dis: 'Mekanik', tip, mid: b.e.id, z0: +b.e.z0 || 0, no: KIS[tip] + say }, o))); delete x.sp; n++; if (E_().scriptMode && !E_().queue.length) break; }
    if (n) C.log(`${n} ${ARM[tip].ad.toLocaleLowerCase('tr')} eklendi. Boruları yenilemek için SIHHIBORU.`);
  });
  const E_ = () => C.cmd;
  C.addCommand(['SUGIRISI', 'TEMIZSUGIRISI'], 'Temiz su (şebeke) girişinin yeri: bina içinde, dış duvara yakın bir noktaya tıklayın; boru buradan yükselip dağılır.', async (I) => { const p = await I.pt('Su girişi (bina içinde dış duvara yakın nokta)'); if (!p || typeof p === 'string') return; const b = enYakinDuvar(p); C.undoStack.push(C.snapshot()); C.doc.ents = C.doc.ents.filter(e => !(e.type === 'mtsnokta' && e.kind === 'giris')); const x = C.add(C.newEnt('mtsnokta', { layer: lay('MT_SIHHI_TEMIZ', 5, 30), dis: 'Mekanik', kind: 'giris', p: [r3(p[0]), r3(p[1])] })); if (b) x.disP = [r3(b.w[0] - b.n[0] * ((b.y.t || 0.2) + 1.2)), r3(b.w[1] - b.n[1] * ((b.y.t || 0.2) + 1.2))]; delete x.sp; if (borular().length) MT.sihhiBoruCiz(); C.changed(); });
  C.addCommand(['ROGARYERI', 'ROGAR'], 'Pis su rögarının yeri: bina dışında bir noktaya tıklayın; bina çıkışı rögara en yakın dış duvardan yapılır.', async (I) => { const p = await I.pt('Rögar yeri (bina dışında)'); if (!p || typeof p === 'string') return; C.undoStack.push(C.snapshot()); C.doc.ents = C.doc.ents.filter(e => !(e.type === 'mtsnokta' && e.kind === 'rogar')); const zs = MT.mahaller().map(e => +e.z0 || 0), x = C.add(C.newEnt('mtsnokta', { layer: lay('MT_SIHHI_PIS', 6, 30), dis: 'Mekanik', kind: 'rogar', p: [r3(p[0]), r3(p[1])], no: 'R1', zt: (zs.length ? Math.min(...zs) : 0) - 0.15 })); delete x.sp; if (borular().length) MT.sihhiBoruCiz(); C.changed(); });
  C.addCommand(['SIHHIBORU', 'SIHHIBORULAR'], 'Sıhhi tesisat borularını çizer ve çaplarını hesaplar: soğuk su, sıcak su (termosifondan), pis su (rögara), havalık.', async () => { const h = MT.sihhiBoruCiz(); if (!h) { C.warn('Önce armatürleri yerleştirin (ARMATURYERLESTIR).'); return; } h.uyari.forEach(u => C.warn(u)); C.log(`Sıhhi tesisat: ${h.nBoru} boru parçası · ${f(h.ybTop || 0, 2)} YB → ${f(h.QTop || 0, 2)} l/s, giriş ${h.cG ? h.cG.inc : '—'} · termosifon ${h.hacim} L · pis su çıkışı Ø${h.dC || '—'} (${f(h.sbTop || 0, 0)} SB)${h.kritik ? ' · gerekli basınç ' + f(h.kritik.top, 1) + ' mSS' : ''}.`); });
  C.addCommand(['SIHHITESISAT', 'SIHHI'], 'Sıhhi tesisat (tek adım): armatürler yoksa ıslak hacimlere yerleştirir, su girişini ve rögarı en yakın dış duvara koyar, soğuk su – sıcak su – pis su borularını çizip çaplarını hesaplar.', async () => { if (!arms().length) { const r = MT.armYerlestir(); if (!r.n) { C.warn('Islak hacim bulunamadı: mahal listesinde WC, banyo / duş, soyunma, mutfak ya da laboratuvar tipinde mahal olmalı. Tuvaleti çizdikten sonra MAHALBUL ile mahalleri yenileyin ve tipini WC yapın.'); return; } C.log(`${r.n} armatür yerleştirildi.`); } const h = MT.sihhiBoruCiz(); if (!h) return; h.uyari.forEach(u => C.warn(u)); C.log(`Sıhhi tesisat hazır: ${h.A.length} armatür, ${h.nBoru} boru parçası · ${f(h.ybTop || 0, 2)} YB → ${f(h.QTop || 0, 2)} l/s, giriş ${h.cG ? h.cG.inc : '—'} · termosifon ${h.hacim} L · pis su çıkışı Ø${h.dC || '—'}. Geçiş delikleri için CAKISMA, pafta için TESISATPAFTA W.`); });
  C.addCommand(['SIHHISEMA', 'SIHHIKOLONSEMASI'], 'Sıhhi tesisat kolon şemasını (açılım) çizer; yerleştirme noktasını tıklayın.', async (I) => { const g = MT.sihhiSema(); if (!g) { C.warn('Önce armatürleri yerleştirin.'); return; } const p = await I.pt('Kolon şemasının yeri (sol alt)'); if (!p || typeof p === 'string') return; C.undoStack.push(C.snapshot()); C.doc.ents = C.doc.ents.filter(e => !(e.type === 'mtsema' && e.tur === 'shkolon')); const x = C.add(C.newEnt('mtsema', { layer: lay('MT_SEMA', 7, 25), dis: 'Mekanik', p: M.p3(p), g, tur: 'shkolon' })); delete x.sp; });
  C.addCommand(['ARMATURMODEL', 'ARMATURKUTUPHANE', 'ARMATURGOVDE'], 'Çizimdeki bir 3B nesneyi (kütüphane bloğu, ekipman, katı) bir armatür tipinin gövdesi yapar: tipi seçin, nesneyi seçin, modelin duvara dayanan arka tarafına tıklayın. O tipteki bütün armatürler bu modelle çizilir; model bu bilgisayardaki kütüphaneye de kaydedilir (yeni çizimlerde de kullanılır). K = özel modeli kaldır.', async (I) => {
    const KW = [['L', 'Lavabo'], ['K', 'Klozet'], ['H', 'Alaturka hela'], ['P', 'Pisuvar'], ['D', 'Duş'], ['E', 'Evye'], ['LE', 'Laboratuvar evyesi'], ['CM', 'Çamaşır makinesi'], ['BM', 'Bulaşık makinesi'], ['YS', 'Yer süzgeci'], ['ET', 'Elektrikli termosifon']], MAP = { L: 'lavabo', K: 'klozet', H: 'alaturka', P: 'pisuvar', D: 'dus', E: 'evye', LE: 'labevye', CM: 'camasir', BM: 'bulasik', YS: 'suzgec', ET: 'termosifon' };
    const t = await I.kw('Hangi armatürün modeli?', KW, 'L'); if (!t) return; const tip = MAP[t];
    const is = await I.kw('İşlem', [['S', 'Çizimden model seç'], ['K', 'Özel modeli kaldır (programın kendi gövdesine dön)']], 'S'); if (!is) return;
    const yenile = () => { for (const a of arms()) delete a._c; C.changed(); };
    if (is === 'K') { const m = MT.sh(); if (m.model) delete m.model[tip]; const k = kutup(); delete k[tip]; try { localStorage.setItem(LSK, JSON.stringify(k)); } catch (er) { } yenile(); C.log(`${ARM[tip].ad}: özel model kaldırıldı.`); return; }
    const sl = await I.sel(`${ARM[tip].ad} modeli olacak 3B nesneyi (nesneleri) seçin`); if (!sl || !sl.length) return;
    /* üçgenleri topla (dünya koordinatı), renkleri koru */
    const tris = [], pal = [], palI = c => { const key = c.map(x => (+x).toFixed(2)).join(','); let i = pal.findIndex(q => q.k === key); if (i < 0) { pal.push({ k: key, c: c.map(x => +(+x).toFixed(3)) }); i = pal.length - 1; } return i; };
    for (const e of sl) { let ms = null; try { ms = C.meshes(e); } catch (er) { } if (!ms) continue; for (const d of ms) { if (d && d.t === 'tri' && d.v && d.f) { d.f.forEach((q, i) => tris.push([d.v[q[0]], d.v[q[1]], d.v[q[2]], palI((d.fc && d.fc[i]) || [0.96, 0.96, 0.95])])); } else { let o2 = null; try { o2 = C.meshTris(d); } catch (er) { } if (!o2 || !o2.pos) continue; const ci = palI(Array.isArray(d.col) ? d.col : [0.96, 0.96, 0.95]); for (let i = 0; i + 8 < o2.pos.length; i += 9) tris.push([[o2.pos[i], o2.pos[i + 1], o2.pos[i + 2]], [o2.pos[i + 3], o2.pos[i + 4], o2.pos[i + 5]], [o2.pos[i + 6], o2.pos[i + 7], o2.pos[i + 8]], ci]); } } }
    if (!tris.length) { C.warn('Seçilen nesnenin 3B gövdesi yok (yalnız 2B çizim). Kütüphaneden 3B model yerleştirip onu seçin.'); return; }
    let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (const tr of tris) for (let q = 0; q < 3; q++) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], tr[q][c]); mx[c] = Math.max(mx[c], tr[q][c]); }
    const cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2, bp = await I.pt('Modelin ARKA tarafına (duvara dayanacak yüzün olduğu yöne) tıklayın'); if (!bp || typeof bp === 'string') return;
    const dx = bp[0] - cx, dy = bp[1] - cy, b = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dy) || 1], uo = [-b[0], -b[1]], us = [-uo[1], uo[0]], arka = b[0] ? (b[0] > 0 ? mx[0] : mn[0]) : (b[1] > 0 ? mx[1] : mn[1]), anc = b[0] ? [arka, cy] : [cx, arka];
    /* ölçü denetimi: metre değilse (mm / cm çizilmiş model) ölçekle */
    let boyut = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]), olc = 1; if (boyut > 30) olc = 0.001; else if (boyut > 4) olc = 0.01; if (olc !== 1) C.log(`Model ${olc === 0.001 ? 'mm' : 'cm'} biriminde görünüyor (${f(boyut, 0)} birim): metreye çevrildi.`);
    const vm = new Map(), v = [], fidx = [], fi = [], R = x => +(+x).toFixed(4); for (const tr of tris) { for (let q = 0; q < 3; q++) { const p = tr[q], rx = p[0] - anc[0], ry = p[1] - anc[1], s2 = R((rx * us[0] + ry * us[1]) * olc), o2 = R((rx * uo[0] + ry * uo[1]) * olc), z2 = R((p[2] - mn[2]) * olc), key = s2 + ',' + o2 + ',' + z2; let i = vm.get(key); if (i == null) { i = v.length / 3; vm.set(key, i); v.push(s2, o2, z2); } fidx.push(i); } fi.push(tr[3]); }
    const md = { v, f: fidx, pal: pal.map(q => q.c), fi, w: R((b[0] ? (mx[1] - mn[1]) : (mx[0] - mn[0])) * olc), d: R((b[0] ? (mx[0] - mn[0]) : (mx[1] - mn[1])) * olc), h: R((mx[2] - mn[2]) * olc) };
    const m = MT.sh(); m.model = m.model || {}; m.model[tip] = md; let kayit = true; try { const k = kutup(); k[tip] = md; const js = JSON.stringify(k); if (js.length > LS_SINIR) throw new Error('büyük'); localStorage.setItem(LSK, js); } catch (er) { kayit = false; }
    yenile(); C.log(`${ARM[tip].ad} modeli kaydedildi: ${fi.length} üçgen, ${f(md.w, 2)} × ${f(md.d, 2)} × ${f(md.h, 2)} m (genişlik × derinlik × yükseklik). Çizimdeki ${arms().filter(a => a.tip === tip).length} ${ARM[tip].ad.toLocaleLowerCase('tr')} bu modelle çizilir${kayit ? '; model bu bilgisayardaki armatür kütüphanesine de eklendi' : ' (model çok büyük olduğu için yalnız bu çizime kaydedildi)'}. Seçtiğiniz özgün nesneyi artık silebilirsiniz.`);
    if (fi.length > 40000) C.warn('Model çok ayrıntılı (40 000 üçgenden fazla): çok sayıda armatürde 3B görünüm yavaşlayabilir.');
  });
  C.addCommand(['SIHHISIL'], 'Armatürleri, sıhhi tesisat borularını, giriş / rögar işaretlerini ve şemalarını siler.', async () => { const l = C.doc.ents.filter(e => e.type === 'mtarm' || e.type === 'mtsboru' || e.type === 'mtsnokta' || (e.type === 'mtsema' && (e.tur === 'shkolon' || e.tur === 'shlist'))); if (!l.length) return; C.undoStack.push(C.snapshot()); C.remove(l); C.log(`${l.length} sıhhi tesisat nesnesi silindi.`); });
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : (globalThis.C = globalThis.C || {}));

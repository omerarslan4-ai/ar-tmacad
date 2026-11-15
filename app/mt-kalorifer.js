/* ArıtmaCAD — MEKANİK TESİSAT · KALORİFER TESİSATI
   Isı kaybı sonuçlarından: radyatör seçimi ve yerleşimi (pencere altı), çift borulu dağıtım şebekesi (kolondan radyatörlere dik açılı dallanma),
   boru çapı (R ≤ Rmax Pa/m, v ≤ vmax), kritik devre basınç kaybı, pompa, kazan, kapalı genleşme deposu, kolon şeması.
   Nesneler: mtrad  { p:[x,y], ang, L (m), tip '11'|'21'|'22'|'33', H (mm), Q (gereken W), Qn (verdiği W), mid (mahal id), no, z0 }
             mtboru { pts:[[x,y]…], z0, dn (etiket), Q (W), deb (l/h), v, R, kat }   — gidiş (düz) + dönüş (kesikli) çift çizgi
             mtkolon{ p:[x,y], no }                                                 — kolon yeri (bütün katlarda aynı)
             mtsema { p, g:{ L:[[x1,y1,x2,y2,stil]], T:[[x,y,h,yazı,hiza]] } }      — kolon şeması (kağıt mm, ölçekle büyür)
   Komutlar: KALORIFER (hepsi), RADYATORYERLESTIR, KOLONYERI, KALORIFERBORU, KOLONSEMASI, KALORIFERSIL */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, V = C.MTV, MT = C.MT, { L, P, TX, CI } = C.prim || {};
  const f = (v, d = 2) => (isFinite(v) ? (+v).toFixed(d) : '—').replace('.', ',');
  const fi = v => isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—';
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  /* ---------- veriler ---------- */
  /* panel radyatör ısıl gücü [W/m], yükseklik 600 mm, 75/65/20 °C (ΔT = 50 K, TS EN 442) — tipik katalog değerleri */
  const RAD = { '11': ['Tip 11 (PK)', 1000], '21': ['Tip 21 (PKP)', 1350], '22': ['Tip 22 (PKKP)', 1750], '33': ['Tip 33 (PKKPKP)', 2500] };
  const RADH = { 300: 0.57, 400: 0.72, 500: 0.86, 600: 1.0, 900: 1.38 };
  /* borular: [etiket, iç çap mm] ; pürüzlülük mm */
  const BORU = {
    celik: { ad: 'Siyah çelik boru (TS EN 10255)', k: 0.045, l: [['DN15 (1/2")', 16.0], ['DN20 (3/4")', 21.6], ['DN25 (1")', 27.2], ['DN32 (1 1/4")', 35.9], ['DN40 (1 1/2")', 41.8], ['DN50 (2")', 53.0], ['DN65 (2 1/2")', 68.8], ['DN80 (3")', 80.8], ['DN100 (4")', 105.3]] },
    ppr: { ad: 'PPR-C kompozit boru (PN 20)', k: 0.007, l: [['Ø20', 13.2], ['Ø25', 16.6], ['Ø32', 21.2], ['Ø40', 26.6], ['Ø50', 33.4], ['Ø63', 42.0], ['Ø75', 50.0], ['Ø90', 60.0], ['Ø110', 73.4]] },
    pex: { ad: 'PEX / çok katmanlı boru', k: 0.007, l: [['Ø16×2', 12.0], ['Ø20×2', 16.0], ['Ø26×3', 20.0], ['Ø32×3', 26.0], ['Ø40×3,5', 33.0], ['Ø50×4', 42.0], ['Ø63×4,5', 54.0]] },
  };
  /* elektrikli ısıtıcılar: [W, boy m, yükseklik mm] */
  const ELK = { konvektor: { ad: 'Duvar tipi elektrikli konvektör (termostatlı)', l: [[500, 0.45, 450], [750, 0.55, 450], [1000, 0.65, 450], [1250, 0.75, 450], [1500, 0.85, 450], [2000, 1.0, 450], [2500, 1.2, 450]] },
    fanli: { ad: 'Elektrikli fanlı ısıtıcı (sıcak hava apareyi)', l: [[2000, 0.35, 350], [3000, 0.4, 400], [5000, 0.45, 450], [9000, 0.5, 500], [12000, 0.55, 550], [15000, 0.6, 600]] },
    panel: { ad: 'Infrared / ışınımlı panel ısıtıcı', l: [[400, 0.6, 600], [600, 0.9, 600], [800, 1.2, 600], [1000, 1.2, 600], [1500, 1.5, 300], [2000, 1.8, 300]] } };
  MT.RAD = RAD; MT.BORU = BORU; MT.ELK = ELK;
  MT.kal = () => { const m = MT.set(); if (!m.kal) m.kal = {}; const k = m.kal; const d = { tg: 75, td: 60, radTip: '22', radH: 600, boru: 'celik', Rmax: 100, vmax: 1.0, yerel: 40, radKayip: 2.5, kazanL: 6, emniyet: 10, Lmax: 2.4, sistem: 'su', elTip: 'konvektor' }; for (const q in d) if (k[q] == null) k[q] = d[q]; return k; };
  const tumRad = () => C.doc.ents.filter(e => e.type === 'mtrad'), rads = () => C.doc.ents.filter(e => e.type === 'mtrad' && e.tip !== 'E'), borular = () => C.doc.ents.filter(e => e.type === 'mtboru' && !e.sys), kolon = () => C.doc.ents.find(e => e.type === 'mtkolon' && !e.sys);
  /* radyatör gücü: W/m × boy × yükseklik katsayısı × (ΔT/50)^1,3 */
  MT.radGuc = (tip, H, Lr, ti, k) => { k = k || MT.kal(); const dT = (k.tg + k.td) / 2 - ti; return dT <= 0 ? 0 : (RAD[tip] || RAD['22'])[1] * (RADH[H] || 1) * Lr * Math.pow(dT / 50, 1.3); };

  /* ---------- nesneler ---------- */
  if (T) {
    const lay = (n, c, lw) => { C.ensureLayer(n, c, 'CONTINUOUS', lw); return n; };
    MT._lay = lay;
    T.mtrad = {
      label: 'Radyatör',
      prims: e => { const a = e.ang || 0, u = [Math.cos(a), Math.sin(a)], n = [-u[1], u[0]], z = +e.z0 || 0, hl = e.L / 2, d = 0.05, c = e.p, pt = (s, o) => [c[0] + u[0] * s + n[0] * o, c[1] + u[1] * s + n[1] * o, z], out = [P([pt(-hl, -d), pt(hl, -d), pt(hl, d), pt(-hl, d)], true, { lw: 30, color: 1 })];
        const nf = Math.max(2, Math.round(e.L / 0.1)); for (let i = 1; i < nf; i++) out.push(L(pt(-hl + e.L * i / nf, -d), pt(-hl + e.L * i / nf, d), { lw: 9, color: 1 }));
        const h = C.annoH(2), s = e.ic ? 1 : 1, tp = pt(0, s * (d + h * 1.3)), rot = (a > Math.PI / 2 + 1e-6 || a < -Math.PI / 2 - 1e-6) ? a + Math.PI : a;
        if (e.tip === 'E') { out.push(L(pt(-hl, -d), pt(hl, d), { lw: 13, color: 2 }), L(pt(-hl, d), pt(hl, -d), { lw: 13, color: 2 })); }
        out.push(TX(tp, h, e.tip === 'E' ? `Eİ ${fi(e.Qn)} W` : `${e.tip}/${e.H}/${Math.round(e.L * 1000)}`, rot, 'MC', { color: e.tip === 'E' ? 2 : 1 }), TX(pt(0, s * (d + h * 2.9)), h, e.tip === 'E' ? (e.no || '') : `${fi(e.Qn)} W`, rot, 'MC', { color: 7 })); return out; },
      snaps: e => [{ p: [e.p[0], e.p[1], +e.z0 || 0], k: 'ins' }],
      xf: (e, X) => { const q = X.p([e.p[0], e.p[1], 0]), q2 = X.p([e.p[0] + Math.cos(e.ang || 0), e.p[1] + Math.sin(e.ang || 0), 0]); e.p = [q[0], q[1]]; e.ang = Math.atan2(q2[1] - q[1], q2[0] - q[0]); if (e.cp) { const c = X.p([e.cp[0], e.cp[1], 0]); e.cp = [c[0], c[1]]; } },
      info: e => e.tip === 'E' ? `${(ELK[e.elTip] || ELK.konvektor).ad} · ${fi(e.Qn)} W (gereken ${fi(e.Q)} W) · ${e.Qn > 3600 ? '400 V 3~' : '230 V 1~'}` : `Panel radyatör ${RAD[e.tip] ? RAD[e.tip][0] : e.tip} · ${e.H}×${Math.round(e.L * 1000)} mm · ${fi(e.Qn)} W (gereken ${fi(e.Q)} W)`,
    };
    T.mtboru = {
      label: 'Kalorifer borusu',
      prims: e => { const z = +e.z0 || 0, o = Math.max(0.03, C.annoH(0.7)), out = [], off = s => { const r = []; for (let i = 0; i < e.pts.length; i++) { const a = e.pts[Math.max(0, i - 1)], b = e.pts[Math.min(e.pts.length - 1, i + 1)], l = M.dist2(a, b) || 1, n = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]; const p = e.pts[i], k = (i > 0 && i < e.pts.length - 1) ? Math.SQRT2 : 1; r.push([p[0] + n[0] * s * k, p[1] + n[1] * s * k, z]); } return r; };
        out.push(P(off(o), false, { lw: 35, color: e.sys === 'sog' ? 4 : 1 }), P(off(-o), false, { lw: 35, color: e.sys === 'sog' ? 6 : 5, lt: 'HIDDEN' }));
        let bi = -1, bl = 0.9; for (let i = 1; i < e.pts.length; i++) { const l = M.dist2(e.pts[i - 1], e.pts[i]); if (l > bl) { bl = l; bi = i; } }
        if (bi > 0) { const a = e.pts[bi - 1], b = e.pts[bi], h = C.annoH(1.8); let ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > Math.PI / 2 + 1e-6 || ang <= -Math.PI / 2 + 1e-6) ang += Math.PI; const nx = -Math.sin(ang), ny = Math.cos(ang); out.push(TX([(a[0] + b[0]) / 2 + nx * (o + h * 0.9), (a[1] + b[1]) / 2 + ny * (o + h * 0.9), z], h, e.dn || '', ang, 'MC', { color: 7 })); }
        return out; },
      snaps: e => e.pts.map(p => ({ p: [p[0], p[1], +e.z0 || 0], k: 'end' })),
      xf: (e, X) => { e.pts = e.pts.map(p => X.p([p[0], p[1], 0]).slice(0, 2)); },
      info: e => `${e.sys === 'sog' ? 'Soğutma suyu' : 'Kalorifer'} gidiş-dönüş ${e.dn} · ${fi(e.Q)} W · ${fi(e.deb)} l/h · v=${f(e.v, 2)} m/s · R=${fi(e.R)} Pa/m · boy ${f(e.pts.reduce((s, p, i) => i ? s + M.dist2(e.pts[i - 1], p) : 0, 0), 2)} m`,
    };
    T.mtkolon = {
      label: 'Kalorifer kolonu',
      prims: e => { const r = C.annoH(1.6), z = +e.z0 || 0, p = [e.p[0], e.p[1], z]; return [CI([p[0] - r * 1.1, p[1], z], r, { lw: 35, color: e.sys === 'sog' ? 4 : 1 }), CI([p[0] + r * 1.1, p[1], z], r, { lw: 35, color: e.sys === 'sog' ? 6 : 5 }), TX([p[0], p[1] + r * 2.6, z], C.annoH(2.2), e.no || 'K1', 0, 'MC', { color: 2 })]; },
      snaps: e => [{ p: [e.p[0], e.p[1], 0], k: 'cen' }],
      xf: (e, X) => { const q = X.p([e.p[0], e.p[1], 0]); e.p = [q[0], q[1]]; },
      info: e => `Kalorifer kolonu ${e.no || 'K1'} (gidiş + dönüş)`,
    };
    T.mtsema = {
      label: 'Kolon şeması',
      prims: e => { const k = C.doc.set.anno / 1000, o = M.p3(e.p), out = [], g = e.g || { L: [], T: [] }, ST = { g: { lw: 40, color: 1 }, d: { lw: 40, color: 5, lt: 'HIDDEN' }, r: { lw: 25, color: 1 }, i: { lw: 13, color: 8 }, k: { lw: 50, color: 7 }, s: { lw: 40, color: 4 }, x: { lw: 40, color: 6, lt: 'HIDDEN' }, f: { lw: 25, color: 4 }, y: { lw: 13, color: 6 }, h: { lw: 9, color: 8 }, m: { lw: 30, color: 3 }, v: { lw: 18, color: 7 } };
        for (const l of g.L) out.push(L([o[0] + l[0] * k, o[1] + l[1] * k, 0], [o[0] + l[2] * k, o[1] + l[3] * k, 0], ST[l[4]] || ST.i));
        for (const t of g.T) out.push(TX([o[0] + t[0] * k, o[1] + t[1] * k, 0], t[2] * k, t[3], t[5] || 0, t[4] || 'L', { color: t[6] || 7 })); return out; },
      snaps: e => [{ p: M.p3(e.p), k: 'ins' }],
      xf: (e, X) => { e.p = X.p(e.p); },
      info: e => `Kalorifer kolon şeması (${(e.g && e.g.T.length) || 0} yazı)`,
    };
    if (C.ANNO_TYPES && C.ANNO_TYPES.add) { C.ANNO_TYPES.add('mtsema'); }
  }

  /* ====================================================================
     RADYATÖR YERLEŞİMİ
     ==================================================================== */
  MT.radYerlestir = () => {
    const k = MT.kal(), hes = MT.hesapla(), ins = C._ins, yeni = [], uyari = [];
    for (const { e, r } of hes.res) {
      if (r.ti == null || r.Q < 50) continue;
      const ccw = M.polyArea(e.pts) > 0, spots = [];
      const yer = (y, s, w) => { const u = [(y.b[0] - y.a[0]) / y.L, (y.b[1] - y.a[1]) / y.L], n = ccw ? [-u[1], u[0]] : [u[1], -u[0]]; return { p: [y.a[0] + u[0] * s + n[0] * 0.1, y.a[1] + u[1] * s + n[1] * 0.1], cp: [y.a[0] + u[0] * s + n[0] * 0.3, y.a[1] + u[1] * s + n[1] * 0.3], ang: Math.atan2(u[1], u[0]), w, span: y.L, s }; };
      for (const y of e.yuz || []) { if (y.k !== 'dis') continue; for (const a of y.ac || []) { if (a.kind === 'kapi') continue; const o = C.byId(a.id), hf = o && ins ? ins.hostFrame(o) : null; if (!hf) continue; const c = [hf.sf.a[0] + hf.sf.u[0] * (+o.s || 0), hf.sf.a[1] + hf.sf.u[1] * (+o.s || 0)], s = ((c[0] - y.a[0]) * (y.b[0] - y.a[0]) + (c[1] - y.a[1]) * (y.b[1] - y.a[1])) / y.L; spots.push(yer(y, Math.max(0.3, Math.min(y.L - 0.3, s)), a.w)); } }
      /* elle eklenen pencereler: ilgili cephe boyunca eşit aralıklı */
      for (const x of e.ek || []) { if (x.tur === 'kapi') continue; const ys = (e.yuz || []).filter(y => y.k === 'dis' && (!x.yon || y.yon === x.yon)).sort((a, b) => b.L - a.L); if (!ys.length) continue; const n = Math.max(1, +x.adet || 1); for (let i = 0; i < n; i++) spots.push(yer(ys[0], ys[0].L * (i + 0.5) / n, +x.w || 1.2)); }
      if (!spots.length) { const ys = (e.yuz || []).slice().sort((a, b) => (b.k === 'dis') - (a.k === 'dis') || b.L - a.L); if (!ys.length) continue; spots.push(yer(ys[0], ys[0].L / 2, 1)); }
      spots.sort((a, b) => b.w - a.w);
      if (k.sistem === 'elektrik') {
        const E = ELK[k.elTip] || ELK.konvektor, Qg = r.Q * (1 + k.emniyet / 100), mx = E.l[E.l.length - 1][0]; let ne = Math.max(1, Math.ceil(Qg / mx - 1e-9));
        if (k.elTip !== 'fanli' && spots.length > ne && Qg / ne > 1500) ne = Math.min(spots.length, Math.ceil(Qg / 1500));
        /* yer yetmezse en uzun duvarlara eşit aralıklı ek yer */
        if (spots.length < ne) { const ys = (e.yuz || []).slice().sort((a, b) => b.L - a.L); let j = 0; while (spots.length < ne && ys.length) { const y = ys[j % ys.length], t = Math.floor(j / ys.length) + 1; spots.push(yer(y, y.L * (t % 2 ? 0.25 : 0.75), 0)); j++; if (j > 40) break; } }
        const Qr = Qg / ne, sec = E.l.find(x => x[0] >= Qr - 1) || E.l[E.l.length - 1];
        for (let i = 0; i < ne && i < spots.length; i++) { const s = spots[i]; yeni.push({ layer: MT._lay('MT_ISITICI', 2, 30), dis: 'Mekanik', p: s.p.map(v => +v.toFixed(3)), cp: s.cp.map(v => +v.toFixed(3)), ang: s.ang, L: sec[1], tip: 'E', elTip: k.elTip, H: sec[2], Q: Math.round(r.Q / ne), Qn: sec[0], mid: e.id, z0: +e.z0 || 0, ti: r.ti, sv2: e.sv != null ? e.sv : undefined }); }
        continue;
      }
      let n = Math.min(spots.length, Math.max(1, Math.floor(r.Q / 350))); const tipler = Object.keys(RAD), i0 = Math.max(0, tipler.indexOf(String(k.radTip)));
      for (; ;) {
        const Qr = r.Q / n; let sec = null;
        for (let i = i0; i < tipler.length && !sec; i++) { const g1 = MT.radGuc(tipler[i], k.radH, 1, r.ti, k); if (g1 <= 0) break; const Lr = Math.max(0.4, Math.ceil(Qr / g1 / 0.1 - 1e-6) * 0.1); if (Lr <= k.Lmax + 1e-9 || i === tipler.length - 1) sec = { tip: tipler[i], Lr: Math.min(Lr, 3.0), g1 }; }
        if (!sec) { uyari.push(`${e.no}: gidiş/dönüş sıcaklığı bu mahal için yetersiz`); break; }
        if (sec.Lr > k.Lmax + 1e-9 && n < spots.length) { n++; continue; }
        if (sec.Lr * sec.g1 < Qr - 1) uyari.push(`${e.no} ${e.ad}: ${n} radyatör yetmiyor (gereken ${fi(r.Q)} W) — ek radyatör ya da daha yüksek sıcaklık gerekir`);
        for (let i = 0; i < n; i++) { const s = spots[i]; yeni.push({ layer: MT._lay('MT_RADYATOR', 1, 30), dis: 'Mekanik', p: s.p.map(v => +v.toFixed(3)), cp: s.cp.map(v => +v.toFixed(3)), ang: s.ang, L: +sec.Lr.toFixed(2), tip: sec.tip, H: k.radH, Q: Math.round(Qr), Qn: Math.round(sec.Lr * sec.g1), mid: e.id, z0: +e.z0 || 0, ti: r.ti, sv2: e.sv != null ? e.sv : undefined }); }
        break;
      }
    }
    if (!yeni.length) return { n: 0, uyari };
    C.undoStack.push(C.snapshot());
    const sil = new Set(tumRad().concat(borular()).concat(k.sistem === 'elektrik' ? C.doc.ents.filter(e => (e.type === 'mtkolon' && !e.sys) || (e.type === 'mtsema' && (!e.tur || e.tur === 'kolon'))) : C.doc.ents.filter(e => e.type === 'mtsema' && e.tur === 'ellist')).map(e => e.id)); C.doc.ents = C.doc.ents.filter(e => !sil.has(e.id));
    const chg = C.changed; C.changed = () => { }; try { yeni.forEach((o, i) => { o.no = (o.tip === 'E' ? 'Eİ' : 'R') + (i + 1); if (o.sv2 == null) delete o.sv2; const x = C.newEnt('mtrad', o); if (o.sv2 == null) delete x.sv2; else x.sv2 = o.sv2; C.add(x); }); } finally { C.changed = chg; } C.changed(); C.emit && C.emit('layers');
    return { n: yeni.length, uyari, Q: yeni.reduce((s, o) => s + o.Qn, 0), el: k.sistem === 'elektrik' };
  };

  /* ====================================================================
     BORU HESABI
     ==================================================================== */
  /* su özellikleri (ortalama sıcaklıkta) */
  const su = t => ({ rho: 1000.6 - 0.0128 * Math.pow(t, 1.76), nu: 1e-6 * 1.78 / (1 + 0.0337 * t + 0.000221 * t * t), c: 4186 });
  MT.boruSec = (Q, k, minI = 0) => {
    k = k || MT.kal(); const B = BORU[k.boru] || BORU.celik, w = su((k.tg + k.td) / 2), Vs = Q / (w.rho * w.c * (k.tg - k.td)); let son = null;
    for (let i = minI; i < B.l.length; i++) { const D = B.l[i][1] / 1000, v = Vs / (Math.PI * D * D / 4), Re = v * D / w.nu, fr = Re < 2300 ? 64 / Math.max(Re, 1) : 0.25 / Math.pow(Math.log10(B.k / 1000 / (3.7 * D) + 5.74 / Math.pow(Re, 0.9)), 2), R = fr / D * w.rho * v * v / 2; son = { i, dn: B.l[i][0], D, v, R, deb: Vs * 3.6e6, Q }; if (R <= k.Rmax && v <= k.vmax) break; }
    return son;
  };
  /* dik açılı ağaç: kökten başlayarak her seferinde ağaca en yakın radyatör bağlanır */
  const agac = (root, list) => {
    const N = [{ p: root, par: -1, ch: [] }], kalan = list.slice();
    const yakın = c => { let best = { d: Math.abs(c[0] - root[0]) + Math.abs(c[1] - root[1]), q: root, i: 0, yon: null }; for (let i = 1; i < N.length; i++) { const a = N[i].p, b = N[N[i].par].p, dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; if (l2 < 1e-8) continue; let t = ((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / l2; t = Math.max(0, Math.min(1, t)); const q = [a[0] + dx * t, a[1] + dy * t], d = Math.abs(c[0] - q[0]) + Math.abs(c[1] - q[1]); if (d < best.d - 1e-9) best = { d, q, i, t, yon: Math.abs(dx) > Math.abs(dy) ? 'x' : 'y' }; } return best; };
    while (kalan.length) {
      let bi = 0, bb = null; kalan.forEach((r, i) => { const b = yakın(r.cp); if (!bb || b.d < bb.d) { bb = b; bi = i; } });
      const r = kalan.splice(bi, 1)[0]; let at;
      if (bb.yon == null) at = 0; else { const a = N[bb.i], pa = a.par; if (M.dist2(bb.q, a.p) < 0.05) at = bb.i; else if (M.dist2(bb.q, N[pa].p) < 0.05) at = pa; else { at = N.length; N.push({ p: bb.q, par: pa, ch: [] }); a.par = at; } }
      const q = N[at].p, c = r.cp, yon = bb.yon || (Math.abs(c[0] - q[0]) > Math.abs(c[1] - q[1]) ? 'y' : 'x'), kose = yon === 'x' ? [q[0], c[1]] : [c[0], q[1]]; let son = at;
      if (M.dist2(kose, q) > 0.05 && M.dist2(kose, c) > 0.05) { N.push({ p: kose, par: son, ch: [] }); son = N.length - 1; }
      if (M.dist2(c, N[son].p) > 0.02) { N.push({ p: c, par: son, ch: [] }); son = N.length - 1; }
      N.push({ p: r.p, par: son, ch: [], rad: r });
    }
    N.forEach(n => { n.ch = []; n.Q = 0; }); N.forEach((n, i) => { if (n.par >= 0) N[n.par].ch.push(i); });
    const top = i => { const n = N[i]; n.Q = (n.rad ? n.rad.Qn : 0) + n.ch.reduce((s, c) => s + top(c), 0); return n.Q; }; top(0);
    return N;
  };
  MT._agac = agac; MT._su = su;
  /* tüm şebeke: katlar, zincirler (boru parçaları), kolon parçaları, kritik devre */
  MT.kaloriferHesap = () => {
    const k = MT.kal(), R = rads(), ko = kolon(); if (!R.length) return null;
    const zs = [...new Set(R.map(r => +r.z0 || 0))].sort((a, b) => a - b), root = ko ? ko.p : (() => { let x = 0, y = 0; R.forEach(r => { x += r.cp[0]; y += r.cp[1]; }); return [x / R.length, y / R.length]; })();
    const katlar = [], w = su((k.tg + k.td) / 2), ek = 1 + k.yerel / 100;
    for (const z of zs) {
      const lst = R.filter(r => (+r.z0 || 0) === z), N = agac(root, lst), zincir = [];
      const yuru = (j, c) => { const pts = [N[j].p, N[c].p]; let u = c; while (N[u].ch.length === 1 && !N[u].rad) { u = N[u].ch[0]; pts.push(N[u].p); } const Lz = pts.reduce((s, p, i) => i ? s + M.dist2(pts[i - 1], p) : 0, 0), b = MT.boruSec(N[c].Q, k), dp = b.R * Lz * 2 * ek; zincir.push({ pts, Q: N[c].Q, L: Lz, b, dp, bas: j, son: u }); N[u].zin = zincir.length - 1; N[u].ch.forEach(x => yuru(u, x)); };
      N[0].ch.forEach(c => yuru(0, c));
      /* her radyatör için kökten basınç kaybı */
      const up = new Map(); zincir.forEach((zc, i) => up.set(zc.son, i));
      const yol = n => { let dp = 0, Lt = 0, u = n; const ids = []; while (u !== 0) { const i = up.get(u); if (i == null) { u = N[u].par; continue; } dp += zincir[i].dp; Lt += zincir[i].L; ids.push(i); u = zincir[i].bas; } return { dp, Lt, ids }; };
      const rr = N.map((n, i) => n.rad ? Object.assign({ rad: n.rad }, yol(i)) : null).filter(Boolean);
      katlar.push({ z, N, zincir, rr, Q: N[0].Q });
    }
    /* kolon: alt kattan yukarı; i. parça i ve üstündeki katların yükünü taşır */
    const kol = []; let dpK = 0; const Qtop = katlar.reduce((s, x) => s + x.Q, 0);
    const kaz = MT.boruSec(Qtop, k), dpKaz = kaz.R * k.kazanL * 2 * ek;
    katlar.forEach((kt, i) => { if (i === 0) { kt.dpKolon = 0; return; } const Qs = katlar.slice(i).reduce((s, x) => s + x.Q, 0), Lk = kt.z - katlar[i - 1].z, b = MT.boruSec(Qs, k), dp = b.R * Lk * 2 * ek; dpK += dp; kol.push({ z0: katlar[i - 1].z, z1: kt.z, L: Lk, Q: Qs, b, dp }); kt.dpKolon = dpK; });
    let krit = null; katlar.forEach(kt => kt.rr.forEach(x => { x.dpTop = x.dp + kt.dpKolon + dpKaz + k.radKayip * 1000; if (!krit || x.dpTop > krit.dpTop) krit = Object.assign({ kat: kt }, x); }));
    const Hp = krit.dpTop * 1.1, debi = kaz.deb, Qk = Qtop * (1 + k.emniyet / 100), Vsu = Qtop / 1000 * 12, nG = 0.0000035 * Math.pow(k.tg, 2) + 0.00007 * k.tg + 0.0005, hSt = (zs[zs.length - 1] - zs[0]) + 3, P0 = hSt / 10 + 0.3, Pe = 3.0 - 0.5, Vg = Vsu * nG * (Pe + 1) / Math.max(0.2, Pe - P0);
    return { k, katlar, kol, kaz, dpKaz, krit, Hp, debi, Qtop, Qk, Vsu, nG, P0, Pe, Vg, root, n: R.length };
  };
  MT.boruCiz = () => {
    const h = MT.kaloriferHesap(); if (!h) return null;
    C.undoStack.push(C.snapshot()); const sil = new Set(borular().map(e => e.id)); C.doc.ents = C.doc.ents.filter(e => !sil.has(e.id));
    const chg = C.changed; C.changed = () => { }; let n = 0;
    try { for (const kt of h.katlar) { const rr0 = rads().find(q => (+q.z0 || 0) === kt.z), svk = rr0 ? rr0.sv2 : null; for (const z of kt.zincir) { const x = C.newEnt('mtboru', { layer: MT._lay('MT_KALORIFER', 1, 35), dis: 'Mekanik', pts: z.pts.map(p => [+p[0].toFixed(3), +p[1].toFixed(3)]), z0: kt.z, dn: z.b.dn, Q: Math.round(z.Q), deb: Math.round(z.b.deb), v: +z.b.v.toFixed(2), R: Math.round(z.b.R) }); if (svk != null) x.sv2 = svk; else delete x.sv2; C.add(x); n++; } }
      if (!kolon()) C.add(C.newEnt('mtkolon', { layer: MT._lay('MT_KALORIFER', 1, 35), dis: 'Mekanik', p: h.root.map(v => +v.toFixed(3)), no: 'K1' })); } finally { C.changed = chg; }
    C.changed(); C.emit && C.emit('layers'); return Object.assign(h, { nBoru: n });
  };

  /* ====================================================================
     KOLON ŞEMASI (kağıt mm)
     ==================================================================== */
  MT.kolonSemasi = (h) => {
    h = h || MT.kaloriferHesap(); if (!h) return null;
    const g = { L: [], T: [] }, Ln = (a, b, c, d, s) => g.L.push([a, b, c, d, s]), Tx = (x, y, hh, s, al, rot, col) => g.T.push([x, y, hh, s, al || 'L', rot || 0, col || 7]);
    const m = MT.set(), all = MT.mahaller(), katH = 46, x0 = 0, rw = 22, gap = 12, nk = h.katlar.length; let W = 0;
    const VIT = MT.VIT, Lv = (a, b, c, d) => Ln(Math.round(a * 100) / 100, Math.round(b * 100) / 100, Math.round(c * 100) / 100, Math.round(d * 100) / 100, 'v');
    const cihazCiz = (t, x, y, w, hh) => { if (!(VIT && VIT.cihaz(Lv, t, x, y, w, hh))) { Ln(x - w / 2, y, x + w / 2, y, 'r'); Ln(x + w / 2, y, x + w / 2, y + hh, 'r'); Ln(x + w / 2, y + hh, x - w / 2, y + hh, 'r'); Ln(x - w / 2, y + hh, x - w / 2, y, 'r'); } };
    const vanaCiz = (x, y, dikey, termo) => { if (VIT) VIT.vana(Lv, x, y, 1.1, dikey, termo); };
    /* kazan */
    Ln(-52, -30, -24, -30, 'k'); Ln(-52, -8, -24, -8, 'k'); Ln(-52, -30, -52, -8, 'k'); Ln(-24, -30, -24, -8, 'k'); Tx(-38, -17, 3, 'KAZAN', 'MC'); Tx(-38, -22, 2.2, `${f(h.Qk / 1000, 1)} kW`, 'MC'); Tx(-38, -35, 2.2, `Pompa: ${f(h.debi / 1000, 2)} m³/h · ${f(h.Hp / 9810, 1)} mSS`, 'MC'); Tx(-38, -39.5, 2.2, `Kapalı genleşme deposu ≥ ${Math.ceil(h.Vg / 5) * 5} l`, 'MC');
    Ln(-24, -12, x0, -12, 'g'); Ln(-24, -26, x0 + 4, -26, 'd'); Ln(x0, -12, x0, 0, 'g'); Ln(x0 + 4, -26, x0 + 4, 0, 'd'); Tx(-12, -10, 2.2, h.kaz.dn, 'MC');
    h.katlar.forEach((kt, i) => {
      const y = i * katH, kt2 = Object.values(m.katlar || {}).find(q => Math.abs((q.z || 0) - kt.z) < 1e-6), sira = kt.rr.slice().sort((a, b) => a.Lt - b.Lt), n = sira.length, wid = 14 + n * (rw + gap);
      W = Math.max(W, wid);
      if (i < nk - 1) { Ln(x0, y, x0, y + katH, 'g'); Ln(x0 + 4, y, x0 + 4, y + katH, 'd'); const ks = h.kol[i]; Tx(x0 - 2, y + katH * 0.55, 2.2, ks.b.dn, 'MC', Math.PI / 2); }
      Ln(x0, y + 8, x0 + wid - gap, y + 8, 'g'); Ln(x0 + 4, y + 4, x0 + wid - gap + 4, y + 4, 'd');
      Ln(x0 - 60, y - 2, x0 + wid + 6, y - 2, 'i'); Tx(x0 - 60, y, 2.5, `${kt2 ? kt2.ad : 'Kat'}  ${kt.z >= 0 ? '+' : ''}${f(kt.z, 2)}`, 'L', 0, 2); Tx(x0 - 60, y + 4.5, 2.2, `ΣQ = ${fi(kt.Q)} W`, 'L');
      const ilk = kt.zincir.filter(z => z.bas === 0).sort((a, b) => b.Q - a.Q)[0]; if (ilk) Tx(x0 + 9, y + 9.5, 2.2, ilk.b.dn, 'MC');
      sira.forEach((x, j) => { const r = x.rad, cx = x0 + 14 + j * (rw + gap) + rw / 2, mh = all.find(q => q.id === r.mid);
        cihazCiz('radyator', cx, y + 14.2, rw, 14.6); /* panel radyatör önden görünüşü */
        Ln(cx - rw / 2 + 2, y + 8, cx - rw / 2 + 2, y + 16, 'g'); Ln(cx + rw / 2 - 2, y + 4, cx + rw / 2 - 2, y + 16, 'd'); vanaCiz(cx - rw / 2 + 2, y + 11.5, true, true); vanaCiz(cx + rw / 2 - 2, y + 10, true, false); /* termostatik vana + dönüş vanası */
        Tx(cx, y + 34, 2.2, `${r.no} · ${mh ? mh.no : ''}`, 'MC', 0, 2); Tx(cx, y + 30.5, 2, `${r.tip}/${r.H}/${Math.round(r.L * 1000)}`, 'MC'); Tx(cx, y + 37.5, 2.2, `${fi(r.Qn)} W`, 'MC'); const b = MT.boruSec(r.Qn, h.k); Tx(cx, y + 11.5, 1.8, b.dn, 'MC'); });
    });
    Tx(-60, nk * katH + 8, 4, 'KALORİFER TESİSATI KOLON ŞEMASI', 'L', 0, 2); Tx(-60, nk * katH + 2.5, 2.2, `Sistem ${h.k.tg}/${h.k.td} °C · ${BORU[h.k.boru].ad} · toplam ${fi(h.Qtop)} W · kritik devre ${krAd(h)} ΔP = ${f(h.krit.dpTop / 1000, 1)} kPa`, 'L');
    Ln(-60, -46, -48, -46, 'g'); Tx(-46, -47, 2.2, 'gidiş', 'L'); Ln(-30, -46, -18, -46, 'd'); Tx(-16, -47, 2.2, 'dönüş', 'L'); vanaCiz(-2, -46, false, true); Tx(1, -47, 2.2, 'termostatik vana', 'L'); vanaCiz(30, -46, false, false); Tx(33, -47, 2.2, 'dönüş vanası', 'L');
    return g;
  };
  const krAd = h => { const mh = MT.mahaller().find(q => q.id === h.krit.rad.mid); return `${h.krit.rad.no}${mh ? ' (' + mh.no + ' ' + mh.ad + ')' : ''}`; };

  /* ====================================================================
     ELEKTRİKLİ ISITMA: güç, akım, hat ve sigorta önerisi, cihaz listesi
     ==================================================================== */
  const hat = W => { const uc = W > 3600, I = uc ? W / (Math.sqrt(3) * 400) : W / 230, sg = [6, 10, 16, 20, 25, 32, 40, 50, 63].find(x => x >= I * 1.25) || 63, kb = sg <= 16 ? 2.5 : sg <= 25 ? 4 : sg <= 32 ? 6 : sg <= 40 ? 10 : 16; return { uc, I, sg, kablo: `${uc ? 5 : 3}×${String(kb).replace('.', ',')} mm² NYM/NHXMH`, ger: uc ? '400 V 3~' : '230 V 1~' }; };
  MT.elektrikHesap = () => {
    const R = tumRad().filter(r => r.tip === 'E'); if (!R.length) return null; const all = MT.mahaller(), P = R.reduce((s, r) => s + r.Qn, 0), Qg = R.reduce((s, r) => s + r.Q, 0);
    let Qyil = 0; try { Qyil = MT.ts825(MT.hesapla()).Qyil; } catch (e) { }
    const I3 = P / (Math.sqrt(3) * 400), ana = [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250].find(x => x >= I3 * 1.25) || 250;
    return { R, P, Qg, I3, ana, Qyil, list: R.map(r => { const mh = all.find(q => q.id === r.mid) || {}; return Object.assign({ r, mahal: `${mh.no || ''} ${mh.ad || ''}`.trim() }, hat(r.Qn)); }) };
  };
  /* elektrikli ısıtma kolon şeması: katlar (zemin / tavan), cihazların önden görünüşü (1 m = 20 mm), her cihaza ayrı linye */
  MT.elKolonSemasi = (h) => {
    h = h || MT.elektrikHesap(); if (!h) return null; const g = { L: [], T: [] }, Ln = (a, b, c, d, s) => g.L.push([a, b, c, d, s || 'i']), Tx = (x, y, hh, s, al, rot, col) => g.T.push([x, y, hh, s, al || 'L', rot || 0, col || 7]);
    const VIT = MT.VIT, Lv = (a, b, c, d) => Ln(Math.round(a * 100) / 100, Math.round(b * 100) / 100, Math.round(c * 100) / 100, Math.round(d * 100) / 100, 'v');
    const cihazCiz = (t, x, y, w, hh) => { if (!(VIT && VIT.cihaz(Lv, t, x, y, w, hh))) { Ln(x - w / 2, y, x + w / 2, y, 'r'); Ln(x + w / 2, y, x + w / 2, y + hh, 'r'); Ln(x + w / 2, y + hh, x - w / 2, y + hh, 'r'); Ln(x - w / 2, y + hh, x - w / 2, y, 'r'); } };
    const vanaCiz = (x, y, dikey, termo) => { if (VIT) VIT.vana(Lv, x, y, 1.1, dikey, termo); };
    const S = 20, katH = 92, sw = 46, zs = [...new Set(h.list.map(x => +x.r.z0 || 0))].sort((a, b) => a - b), m = MT.set();
    let W = 0; zs.forEach(z => { W = Math.max(W, 20 + h.list.filter(x => (+x.r.z0 || 0) === z).length * sw); });
    /* pano */
    Ln(-40, 8, -22, 8, 'k'); Ln(-22, 8, -22, 40, 'k'); Ln(-22, 40, -40, 40, 'k'); Ln(-40, 40, -40, 8, 'k'); Ln(-37, 12, -25, 12, 'i'); Ln(-37, 36, -25, 36, 'i'); Tx(-31, 28, 2.2, 'ELEKTRİK', 'MC'); Tx(-31, 24.5, 2.2, 'PANOSU', 'MC'); Tx(-31, 19, 1.8, `ana ${h.ana} A`, 'MC', 0, 2); Tx(-31, 15.5, 1.8, '3 faz + N', 'MC');
    zs.forEach((z, i) => { const y = i * katH, kt2 = Object.values(m.katlar || {}).find(q => Math.abs((q.z || 0) - z) < 1e-6), yZ = y + 8, yB = yZ + 2.6 * S, list = h.list.filter(x => (+x.r.z0 || 0) === z);
      Ln(-72, yZ, W, yZ, 'k'); Tx(-72, yZ + 1.5, 2.2, `${kt2 ? kt2.ad + '  ' : ''}ZEMİN ${z >= 0 ? '+' : ''}${f(z, 2)}`, 'L', 0, 8); Ln(-72, yZ + 3 * S, W, yZ + 3 * S, 'k'); Tx(-72, yZ + 3 * S + 1.5, 2.2, 'TAVAN', 'L', 0, 8);
      if (i) Ln(-22, 32, -22, yB, 'm'); else Ln(-22, 32, -22, yB, 'm'); Ln(-22, yB, 20 + (list.length - 0.5) * sw + 8, yB, 'm');
      list.forEach((x, j) => { const r = x.r, E = (ELK[r.elTip] || ELK.konvektor), sat = E.l.find(q => q[0] >= r.Qn) || E.l[E.l.length - 1], w = Math.max(10, (r.L || sat[1]) * S), hh = Math.max(7, sat[2] / 1000 * S), xc = 20 + j * sw + sw / 2, yc = yZ + 0.15 * S;
        cihazCiz('konvektor', xc, yc, w, hh); const xt = xc + w / 2 - w * 0.12; Ln(xt, yB, xt, yc + hh, 'm'); Ln(xt - 1, yB - 3, xt + 1, yB - 2, 'm'); Ln(xt - 1, yB - 4.5, xt + 1, yB - 3.5, 'm'); Ln(xt - 1, yB - 6, xt + 1, yB - 5, 'm');
        const mAd = x.mahal || (MT._mhAd ? MT._mhAd(r.mid) : ''); Tx(xc - 2, yc + hh + 9.5, 2.2, (mAd ? `${r.no} · ${mAd}` : r.no || '').slice(0, 26), 'MC', 0, 2); Tx(xc - 2, yc + hh + 6, 2, `${fi(r.Qn)} W · ${x.ger}`, 'MC'); Tx(xc - 2, yc + hh + 2.6, 1.7, E.ad.split(' (')[0].slice(0, 30), 'MC', 0, 8);
        Tx(xt + 1.6, yB - 13, 1.6, `${x.sg} A · ${x.kablo.split(' ')[0]}`, 'MC', Math.PI / 2, 3); });
      Tx(W + 6, yB + 1.5, 1.8, 'her cihaz ayrı sigortalı linye, oda termostatlı', 'R', 0, 3);
    });
    const nk = zs.length; Tx(-72, nk * katH + 8, 4, 'ISITMA TESİSATI KOLON ŞEMASI (ELEKTRİKLİ ISITMA)', 'L', 0, 2); Tx(-72, nk * katH + 2.5, 2.2, `${h.list.length} cihaz · kurulu güç ${f(h.P / 1000, 1)} kW · ısı kaybı ${f(h.Qg / 1000, 1)} kW · ana sigorta ${h.ana} A (3 faz)`, 'L');
    Ln(-72, -10, -60, -10, 'm'); Tx(-58, -11, 2.2, 'besleme linyesi (230 V / 400 V)', 'L');
    return g;
  };
  MT.elektrikListe = () => {
    const h = MT.elektrikHesap(); if (!h) return null; const g = { L: [], T: [] }, Ln = (a, b, c, d, s) => g.L.push([a, b, c, d, s || 'i']), Tx = (x, y, hh, s, al, rot, col) => g.T.push([x, y, hh, s, al || 'L', rot || 0, col || 7]);
    const col = [0, 14, 62, 110, 132, 154, 178, 196, 250], bas = ['No', 'Mahal', 'Cihaz', 'Gereken (W)', 'Seçilen (W)', 'Gerilim', 'Akım (A)', 'Sigorta / kablo'], rh = 6, n = h.list.length, y0 = 0, top = (n + 1) * rh;
    for (let i = 0; i <= n + 2; i++) Ln(0, top - i * rh, col[8], top - i * rh, i < 2 || i > n ? 'k' : 'i'); col.forEach((x, i) => Ln(x, top, x, top - (n + 2) * rh, i === 0 || i === 8 ? 'k' : 'i'));
    bas.forEach((b, i) => Tx(col[i] + 1.5, top - rh + 1.8, 2.2, b, 'L', 0, 2));
    h.list.forEach((x, i) => { const y = top - (i + 2) * rh + 1.8, v = [x.r.no, x.mahal, (ELK[x.r.elTip] || ELK.konvektor).ad.split(' (')[0], fi(x.r.Q), fi(x.r.Qn), x.ger, f(x.I, 1), `${x.sg} A · ${x.kablo}`]; v.forEach((t, j) => Tx(col[j] + 1.5, y, 2, String(t).slice(0, j === 2 ? 34 : 30), 'L')); });
    const yt = top - (n + 2) * rh + 1.8; Tx(col[0] + 1.5, yt, 2.2, `TOPLAM — ${n} cihaz`, 'L', 0, 2); Tx(col[4] + 1.5, yt, 2.2, fi(h.P), 'L', 0, 2); Tx(col[6] + 1.5, yt, 2.2, f(h.I3, 1), 'L', 0, 2); Tx(col[7] + 1.5, yt, 2.2, `ana ${h.ana} A (3 faz)`, 'L', 0, 2);
    Tx(0, top + 8, 4, 'ELEKTRİKLİ ISITMA — CİHAZ LİSTESİ', 'L', 0, 2); Tx(0, top + 2.5, 2.2, `Kurulu güç ${f(h.P / 1000, 1)} kW · ısı kaybı ${f(h.Qg / 1000, 1)} kW · her cihaz ayrı sigortalı linye, oda termostatlı`, 'L');
    return g;
  };

  /* ====================================================================
     RAPOR BÖLÜMÜ
     ==================================================================== */
  MT.raporEk = MT.raporEk || [];
  MT.raporEk.push(() => {
    const eh = MT.elektrikHesap();
    if (eh) { const kk = MT.kal(); return `<h2>7. Elektrikli ısıtma</h2><div class="kart"><div><b>${f(eh.P / 1000, 1)} kW</b><span>Kurulu ısıtıcı gücü (${eh.R.length} cihaz)</span></div><div><b>${f(eh.Qg / 1000, 1)} kW</b><span>Hesaplanan ısı kaybı</span></div><div><b>${f(eh.I3, 1)} A</b><span>Toplam akım (400 V, 3 faz, dengeli)</span></div><div><b>${fi(eh.Qyil)} kWh/yıl</b><span>Yıllık ısıtma elektrik tüketimi (ön hesap)</span></div></div>
<p class="mut">Sulu kalorifer yerine ${esc((ELK[kk.elTip] || ELK.konvektor).ad.toLowerCase())} seçilmiştir; kazan, boru, pompa ve baca yoktur. Cihaz gücü = mahal ısı kaybı × (1 + %${kk.emniyet}) değerini karşılayan ilk standart güçtür. Elektrikli ısıtmada verim 1 alınır; yıllık tüketim TS 825 yıllık ısıtma enerjisi ihtiyacına eşittir.</p>
<h3>Cihaz listesi ve elektrik yükü</h3><table><tr><th>No</th><th>Mahal</th><th>Cihaz</th><th class="n">t<sub>i</sub></th><th class="n">Gereken (W)</th><th class="n">Seçilen (W)</th><th>Gerilim</th><th class="n">Akım (A)</th><th>Sigorta</th><th>Kablo</th></tr>${eh.list.map(x => `<tr><td>${x.r.no}</td><td>${esc(x.mahal)}</td><td>${esc((ELK[x.r.elTip] || ELK.konvektor).ad)}</td><td class="n">${f(x.r.ti, 0)}</td><td class="n">${fi(x.r.Q)}</td><td class="n">${fi(x.r.Qn)}</td><td>${x.ger}</td><td class="n">${f(x.I, 1)}</td><td>${x.sg} A</td><td>${x.kablo}</td></tr>`).join('')}<tr class="top"><td colspan="4">Toplam</td><td class="n">${fi(eh.Qg)}</td><td class="n">${fi(eh.P)}</td><td>400 V 3~</td><td class="n">${f(eh.I3, 1)}</td><td>ana ${eh.ana} A</td><td></td></tr></table>
<div class="not">Akım ve sigorta değerleri ön boyutlandırmadır (I × 1,25); kablo kesiti hat boyu, gerilim düşümü ve döşeme şekline göre elektrik projesinde kesinleştirilmelidir. Islak ve patlayıcı ortamlı hacimlerde (ıslak hazne, klor odası) uygun koruma sınıflı (IP / Ex) cihaz seçilmelidir. Cihaz güçleri tipik katalog kademeleridir.</div>`; }
    const h = MT.kaloriferHesap(); if (!h) return ''; const k = h.k, all = MT.mahaller(), R = rads(), dT = (k.tg + k.td) / 2;
    const mh = id => all.find(q => q.id === id) || {};
    let s = `<h2>7. Kalorifer tesisatı</h2><div class="kart"><div><b>${f(h.Qk / 1000, 1)} kW</b><span>Kazan gücü (ΣQ ${f(h.Qtop / 1000, 1)} kW + %${k.emniyet})</span></div><div><b>${f(h.debi / 1000, 2)} m³/h</b><span>Sirkülasyon pompası debisi</span></div><div><b>${f(h.Hp / 9810, 1)} mSS</b><span>Pompa basma yüksekliği (${f(h.Hp / 1000, 1)} kPa)</span></div><div><b>${Math.ceil(h.Vg / 5) * 5} l</b><span>Kapalı genleşme deposu (en az)</span></div></div>
<p class="mut">Sistem ${k.tg}/${k.td} °C, çift borulu, ${esc(BORU[k.boru].ad)}. Radyatör gücü: katalog değeri (75/65/20 °C) × (ΔT/50)<sup>1,3</sup>, ΔT = ${f(dT, 1)} − t<sub>i</sub>. Boru çapı: R ≤ ${k.Rmax} Pa/m ve v ≤ ${f(k.vmax, 1)} m/s; yerel kayıplar sürtünme kaybının %${k.yerel}'ı, radyatör + vana kaybı ${f(k.radKayip, 1)} kPa, kazan dairesi bağlantı boyu ${f(k.kazanL, 1)} m alınmıştır.</p>
<h3>Radyatör listesi</h3><table><tr><th>No</th><th>Mahal</th><th class="n">t<sub>i</sub></th><th>Radyatör</th><th class="n">Boyut (mm)</th><th class="n">Gereken (W)</th><th class="n">Seçilen (W)</th><th class="n">Bağlantı</th></tr>${R.map(r => `<tr><td>${r.no}</td><td>${esc((mh(r.mid).no || '') + ' ' + (mh(r.mid).ad || ''))}</td><td class="n">${f(r.ti, 0)}</td><td>Panel ${esc((RAD[r.tip] || [''])[0])}</td><td class="n">${r.H} × ${Math.round(r.L * 1000)}</td><td class="n">${fi(r.Q)}</td><td class="n">${fi(r.Qn)}</td><td class="n">${MT.boruSec(r.Qn, k).dn}</td></tr>`).join('')}<tr class="top"><td colspan="5">Toplam — ${R.length} radyatör, ${f(R.reduce((a, r) => a + r.L, 0), 1)} m</td><td class="n">${fi(R.reduce((a, r) => a + r.Q, 0))}</td><td class="n">${fi(h.Qtop)}</td><td></td></tr></table>
<h3>Boru hesabı</h3><table><tr><th>Kat</th><th>Parça</th><th class="n">Q (W)</th><th class="n">Debi (l/h)</th><th>Çap</th><th class="n">v (m/s)</th><th class="n">R (Pa/m)</th><th class="n">Boy (m)</th><th class="n">ΔP gidiş+dönüş (Pa)</th></tr><tr><td>Kazan dairesi</td><td>Kazan – kolon</td><td class="n">${fi(h.Qtop)}</td><td class="n">${fi(h.kaz.deb)}</td><td>${h.kaz.dn}</td><td class="n">${f(h.kaz.v, 2)}</td><td class="n">${fi(h.kaz.R)}</td><td class="n">${f(k.kazanL, 1)}</td><td class="n">${fi(h.dpKaz)}</td></tr>${h.kol.map(c => `<tr><td>Kolon</td><td>${f(c.z0, 2)} → ${f(c.z1, 2)}</td><td class="n">${fi(c.Q)}</td><td class="n">${fi(c.b.deb)}</td><td>${c.b.dn}</td><td class="n">${f(c.b.v, 2)}</td><td class="n">${fi(c.b.R)}</td><td class="n">${f(c.L, 2)}</td><td class="n">${fi(c.dp)}</td></tr>`).join('')}${h.katlar.map(kt => kt.zincir.map((z, i) => `<tr><td>kot ${f(kt.z, 2)}</td><td>${i + 1}</td><td class="n">${fi(z.Q)}</td><td class="n">${fi(z.b.deb)}</td><td>${z.b.dn}</td><td class="n">${f(z.b.v, 2)}</td><td class="n">${fi(z.b.R)}</td><td class="n">${f(z.L, 2)}</td><td class="n">${fi(z.dp)}</td></tr>`).join('')).join('')}</table>
<p>Kritik devre: <b>${esc(krAd(h))}</b> — kat içi dağıtım ${fi(h.krit.dp)} Pa + kolon ${fi(h.krit.kat.dpKolon)} Pa + kazan bağlantısı ${fi(h.dpKaz)} Pa + radyatör ve vana ${fi(k.radKayip * 1000)} Pa = <b>${fi(h.krit.dpTop)} Pa</b>; pompa basma yüksekliği %10 payla ${f(h.Hp / 1000, 1)} kPa. Tesisat su hacmi yaklaşık ${fi(h.Vsu)} l (12 l/kW), genleşme katsayısı ${f(h.nG * 100, 2)} %, ön basınç ${f(h.P0, 1)} bar, emniyet ventili 3 bar.</p>
<div class="not">Radyatör güçleri tipik katalog değerleridir; seçilen markanın kataloğuyla, boru boyları da kazan dairesi yerleşimi kesinleşince denetlenmelidir. Vana, kollektör ve cihaz kayıpları ayrıntılı hesaplanmamış, yüzde ile alınmıştır.</div>`;
    return s;
  });

  /* ====================================================================
     KOMUTLAR
     ==================================================================== */
  if (C.addCommand) {
    C.addCommand(['RADYATORYERLESTIR', 'RADYATOR'], 'Isı kaybına göre her mahale panel radyatör seçer ve pencere altlarına yerleştirir (eski radyatör ve borular silinir).', async () => { const r = MT.radYerlestir(); if (!r.n) { C.warn('Isıtıcı yerleştirilemedi: önce MAHALBUL ile mahalleri oluşturun.'); return; } C.log(`${r.n} ${r.el ? 'elektrikli ısıtıcı' : 'radyatör'} yerleştirildi (${f(r.Q / 1000, 1)} kW).`); r.uyari.forEach(u => C.warn(u)); });
    C.addCommand(['KOLONYERI', 'KALORIFERKOLON'], 'Kalorifer kolonunun (gidiş + dönüş) plandaki yerini seçin; bütün katlarda aynı noktadan dağıtım yapılır.', async (I) => { const p = await I.pt('Kolon yeri (şaft / kazan dairesi üstü)'); if (!p || typeof p === 'string') return; C.undoStack.push(C.snapshot()); const o = kolon(); if (o) { o.p = [p[0], p[1]]; delete o._c; C.changed(); } else C.add(C.newEnt('mtkolon', { layer: MT._lay('MT_KALORIFER', 1, 35), dis: 'Mekanik', p: [p[0], p[1]], no: 'K1' })); if (borular().length) MT.boruCiz(); });
    C.addCommand(['KALORIFERBORU', 'KALBORU'], 'Kolondan radyatörlere çift borulu dağıtım şebekesini çizer, çapları hesaplar (kolon seçilmemişse radyatörlerin ortasına konur).', async () => { const h = MT.boruCiz(); if (!h) { C.warn('Önce radyatörleri yerleştirin (RADYATORYERLESTIR).'); return; } C.log(`Kalorifer boruları çizildi: ${h.nBoru} parça · kazan ${f(h.Qk / 1000, 1)} kW · pompa ${f(h.debi / 1000, 2)} m³/h, ${f(h.Hp / 9810, 1)} mSS.`); });
    C.addCommand(['KOLONSEMASI', 'KALORIFERSEMA'], 'Kalorifer kolon şeması: katlar, radyatörler, boru çapları, kazan, pompa ve genleşme deposu bilgisiyle; yerleştirme noktasını tıklayın.', async (I) => { const g = MT.kolonSemasi(); if (!g) { C.warn('Önce radyatörleri yerleştirin.'); return; } const p = await I.pt('Kolon şemasının yeri (sol alt)'); if (!p || typeof p === 'string') return; C.undoStack.push(C.snapshot()); C.doc.ents = C.doc.ents.filter(e => !(e.type === 'mtsema' && (!e.tur || e.tur === 'kolon'))); C.add(C.newEnt('mtsema', { layer: MT._lay('MT_KOLON_SEMASI', 7, 25), dis: 'Mekanik', p: M.p3(p), g, tur: 'kolon' })); });
    C.addCommand(['KALORIFER', 'KALORIFERTESISATI'], 'Kalorifer tesisatı (tek adım): ısı kaybı → radyatör seçimi ve yerleşimi → kolon yeri → boru şebekesi ve çapları.', async (I) => { const r = MT.radYerlestir(); if (!r.n) { C.warn('Önce MAHALBUL ile mahalleri oluşturun.'); return; } r.uyari.forEach(u => C.warn(u)); if (r.el) { C.log(`Elektrikli ısıtma: ${r.n} cihaz, kurulu güç ${f(r.Q / 1000, 1)} kW. Boru ve kazan yok; cihaz listesi için ISITICILISTE.`); return; } if (!kolon()) { const p = await I.pt('Kolon yeri (Enter = radyatörlerin ortası)'); if (p && typeof p !== 'string') C.add(C.newEnt('mtkolon', { layer: MT._lay('MT_KALORIFER', 1, 35), dis: 'Mekanik', p: [p[0], p[1]], no: 'K1' })); } const h = MT.boruCiz(); C.log(`Kalorifer: ${r.n} radyatör, ${h.nBoru} boru parçası · kazan ${f(h.Qk / 1000, 1)} kW · pompa ${f(h.debi / 1000, 2)} m³/h, ${f(h.Hp / 9810, 1)} mSS. Kolon şeması için KOLONSEMASI.`); });
    C.addCommand(['ISITICILISTE', 'ELEKTRIKLIISITICILISTE'], 'Elektrikli ısıtıcı cihaz listesi tablosu (güç, akım, sigorta, kablo); yerleştirme noktasını tıklayın.', async (I) => { const g = MT.elektrikListe(); if (!g) { C.warn('Elektrikli ısıtıcı yok: Kalorifer sekmesinde ısıtma şeklini "Elektrikli ısıtıcı" seçip tesisatı oluşturun.'); return; } const p = await I.pt('Cihaz listesinin yeri (sol alt)'); if (!p || typeof p === 'string') return; C.undoStack.push(C.snapshot()); C.doc.ents = C.doc.ents.filter(e => !(e.type === 'mtsema' && (e.tur === 'ellist' || e.tur === 'elkolon'))); C.add(C.newEnt('mtsema', { layer: MT._lay('MT_KOLON_SEMASI', 7, 25), dis: 'Mekanik', p: M.p3(p), g, tur: 'ellist' })); });
    C.addCommand(['KALORIFERSIL'], 'Radyatör, kalorifer borusu, kolon ve kolon şemasını siler.', async () => { const l = C.doc.ents.filter(e => e.type === 'mtrad' || ((e.type === 'mtboru' || e.type === 'mtkolon') && !e.sys) || (e.type === 'mtsema' && (!e.tur || e.tur === 'kolon' || e.tur === 'ellist'))); if (!l.length) return; C.undoStack.push(C.snapshot()); C.remove(l); C.log(`${l.length} kalorifer nesnesi silindi.`); });
  }
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : (globalThis.C = globalThis.C || {}));

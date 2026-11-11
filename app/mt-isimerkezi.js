/* ArıtmaCAD — MEKANİK TESİSAT · ISI MERKEZİ (kazan dairesi) ve KOMBİ / KAT KALORİFERİ
   Merkezi sistem: kazan gücü ve adedi (standart kapasite kademesi), brülör gücü ve yakıt debisi, yıllık yakıt tüketimi, baca kesiti (F = n·Q/√h),
     sirkülasyon pompası sınıfı, kapalı genleşme deposu (standart hacim), emniyet ventili, kollektör ve denge kabı çapı, kazan dairesi
     havalandırma menfezleri, kazan dairesi en küçük ölçüleri.
   Bireysel sistem: bağımsız bölüm (mahal.daire) bazında ısı yükü → kombi / kat kaloriferi kapasitesi, gaz tüketimi.
   Çizim: ISIMERKEZISEMA (akış / prensip şeması), KAZANDAIRESI (tip yerleşim planı, ölçekli). Rapor: 8. bölüm. */
(function (C) {
  'use strict';
  const M = C.M, V = C.MTV, MT = C.MT;
  const f = (v, d = 2) => (isFinite(v) ? (+v).toFixed(d) : '—').replace('.', ',');
  const fi = v => isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—';
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  /* yakıtlar: [ad, alt ısıl değer kWh/birim, birim, baca katsayısı n (F cm² = n·Q[kcal/h]/√h), varsayılan kazan verimi] */
  const YAKIT = { dogalgaz: ['Doğalgaz', 9.59, 'Nm³', 0.012, 0.95], lpg: ['LPG', 12.79, 'kg', 0.012, 0.93], motorin: ['Motorin', 11.86, 'kg', 0.020, 0.90], komur: ['Kömür (ithal linyit)', 6.98, 'kg', 0.030, 0.75], pelet: ['Pelet', 4.80, 'kg', 0.030, 0.85] };
  const KAZAN_KW = [12, 18, 24, 28, 35, 45, 50, 65, 80, 100, 115, 125, 150, 175, 200, 250, 300, 350, 400, 500, 600, 750, 900, 1000, 1250, 1500, 2000, 2500, 3000];
  const KOMBI_KW = [24, 28, 30, 35, 42, 50, 65];
  const DEPO_L = [8, 12, 18, 24, 35, 50, 80, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000];
  const BACA_MM = [130, 150, 180, 200, 250, 300, 350, 400, 450, 500, 550, 600, 700, 800, 900, 1000];
  /* ıslak rotorlu / inline sirkülasyon pompası sınıfları: [ad, Qmax m³/h, Hmax m] — tipik eğri H = Hmax·(1 − (Q/Qmax)²) */
  const POMPA = [['25-40', 3.5, 4], ['25-60', 4.5, 6], ['25-80', 8, 8], ['32-80', 11, 8], ['32-120', 12, 12], ['40-80', 18, 8], ['40-120', 22, 12], ['50-120', 32, 12], ['65-120', 50, 12], ['80-120', 70, 12], ['100-120', 110, 12]];
  const EV = [[50, 'DN15 (1/2")'], [100, 'DN20 (3/4")'], [200, 'DN25 (1")'], [350, 'DN32 (1 1/4")'], [600, 'DN40 (1 1/2")'], [900, 'DN50 (2")'], [1e9, 'DN65 (2 1/2")']];
  const yukari = (l, v) => l.find(x => x >= v - 1e-9) || l[l.length - 1];
  MT.YAKIT = YAKIT;
  MT.im = () => { const m = MT.set(); if (!m.im) m.im = {}; const k = m.im, d = { sistem: 'merkezi', yakit: 'dogalgaz', kazanTip: 'yogusmali', kazanAdet: 0, verim: 0, bacaH: 0, pompaYedek: 1, saat: 14 }; for (const q in d) if (k[q] == null) k[q] = d[q]; return k; };
  MT.pompaSec = (Q, H) => { const p = POMPA.find(x => Q <= x[1] * 0.85 && x[2] * (1 - Math.pow(Q / x[1], 2)) >= H) || POMPA[POMPA.length - 1]; return { ad: p[0], Qmax: p[1], Hmax: p[2], P: 1000 * 9.81 * (Q / 3600) * H / (Q < 3 ? 0.25 : Q < 15 ? 0.4 : 0.55) }; };

  MT.isiMerkeziHesap = () => {
    const m = MT.set(), k = MT.im(), kk = MT.kal(), hes = MT.hesapla(); if (!hes.res.length) return null;
    const kal = MT.kaloriferHesap ? MT.kaloriferHesap() : null, Qh = hes.Q, Qkur = kal ? kal.Qtop : Qh, Y = YAKIT[k.yakit] || YAKIT.dogalgaz;
    const eta = k.verim > 0 ? k.verim / 100 : (k.kazanTip === 'yogusmali' && (k.yakit === 'dogalgaz' || k.yakit === 'lpg') ? Math.max(Y[4], 0.97) : Y[4] - (k.kazanTip === 'yogusmali' ? 0 : 0.03));
    const QK = Math.max(Qh, Qkur) * (1 + kk.emniyet / 100) / 1000; // kW
    /* kazan adedi: ≤ 150 kW tek; üstü iki eş kazan (her biri yükün %60'ı) */
    const adet = k.kazanAdet > 0 ? k.kazanAdet : (QK <= 150 ? 1 : 2), herBiri = adet === 1 ? QK : QK * (adet === 2 ? 0.6 : 1.1 / adet), kW = yukari(KAZAN_KW, herBiri), Qtop = kW * adet;
    const QB = kW / eta, yakitSaat = QB / Y[1], brul = Y === YAKIT.komur || Y === YAKIT.pelet ? 'Stokerli / otomatik yüklemeli' : kW <= 70 ? 'Tek kademeli (ön karışımlı)' : kW <= 350 ? 'İki kademeli' : 'Oransal (modülasyonlu)';
    /* yıllık tüketim: TS 825 yıllık net ısıtma enerjisi / (kazan × dağıtım verimi) */
    let Qyil = 0; try { Qyil = MT.ts825(hes).Qyil; } catch (e) { }
    const yakitYil = Qyil / (eta * 0.93) / Y[1];
    /* baca */
    const katlar = Object.values(m.katlar || {}), binaH = katlar.reduce((s, q) => s + (q.h || 3), 0) || 3, bacaH = k.bacaH > 0 ? k.bacaH : Math.max(4, Math.round((binaH + 1.5) * 2) / 2), F = Y[3] * (kW * 860) / Math.sqrt(bacaH), Dh = Math.sqrt(4 * F / Math.PI) * 10, bacaD = yukari(BACA_MM, Dh), Fsec = Math.PI * bacaD * bacaD / 400;
    /* pompa */
    const debi = kal ? kal.debi / 1000 : Qkur / (4186 * 977 * (kk.tg - kk.td)) * 3600, Hm = kal ? kal.Hp / 9810 : 2.5, pompa = MT.pompaSec(debi, Hm);
    /* genleşme deposu, emniyet ventili */
    const Vsu = QK * 12, nG = 0.0000035 * kk.tg * kk.tg + 0.00007 * kk.tg + 0.0005, P0 = (binaH + 2) / 10 + 0.3, Pe = 2.5, Vg = Vsu * nG * (Pe + 1) / Math.max(0.2, Pe - P0), depo = yukari(DEPO_L, Vg * 1.1), ev = EV.find(x => kW <= x[0])[1];
    /* kollektör (v ≈ 0,4 m/s) ve denge kabı (v ≈ 0,2 m/s) */
    const Vs = debi / 3600, kolD = Math.sqrt(4 * Vs / (Math.PI * 0.4)) * 1000, dengeD = Math.sqrt(4 * Vs / (Math.PI * 0.2)) * 1000, ana = MT.boruSec ? MT.boruSec(Qkur, kk) : null;
    /* kazan dairesi: havalandırma (baca kesitinin %50'si giriş, %25'i çıkış; en az 300 / 150 cm²) ve tip ölçüler */
    const menA = Math.max(300, Fsec * adet * 0.5), menU = Math.max(150, Fsec * adet * 0.25), duvarTip = k.kazanTip === 'yogusmali' && kW <= 150, kz = duvarTip ? [0.6, 0.55] : [0.9 + kW / 450, 0.7 + kW / 900], odaB = duvarTip ? adet * 0.9 + 1.6 : adet * (kz[1] + 0.6) + 1.4, odaL = duvarTip ? 2.6 : kz[0] + 2.4, odaH = duvarTip ? 2.4 : Math.max(2.5, 2.2 + kW / 800);
    /* bireysel sistem: bağımsız bölümler */
    const grup = new Map(); hes.res.forEach(({ e, r }) => { if (r.ti == null) return; const d = (e.daire || '').trim() || 'Bina'; let g = grup.get(d); if (!g) grup.set(d, g = { ad: d, Q: 0, A: 0, banyo: 0, n: 0 }); g.Q += r.Q; g.A += r.A; g.n++; if (/banyo|duş/i.test((V.MAHAL[e.tip || 0] || [''])[0])) g.banyo++; });
    const etaK = 0.97, kombi = [...grup.values()].map(g => { const need = Math.max(g.Q * 1.15 / 1000, g.banyo >= 2 ? 28 : 24), kw = yukari(KOMBI_KW, need), asim = need > KOMBI_KW[KOMBI_KW.length - 1]; return Object.assign(g, { need, kw, asim, tip: kw <= 42 ? 'Yoğuşmalı hermetik kombi' : 'Duvar tipi yoğuşmalı kazan (kat kaloriferi) + boyler', gaz: kw / etaK / YAKIT.dogalgaz[1], sicakSu: kw * 860 / 30 / 60 }); });
    return { m, k, kk, Y, eta, Qh, Qkur, QK, adet, kW, Qtop, QB, yakitSaat, brul, Qyil, yakitYil, binaH, bacaH, F, Dh, bacaD, Fsec, debi, Hm, pompa, Vsu, nG, P0, Pe, Vg, depo, ev, kolD, dengeD, ana, menA, menU, duvarTip, kz, odaB, odaL, odaH, kombi, kal };
  };

  /* ---------- çizim yardımcıları (şema: kağıt mm; yerleşim: metre) ---------- */
  const cizer = () => { const g = { L: [], T: [] }; const o = { g,
    L: (a, b, c, d, s) => g.L.push([a, b, c, d, s || 'i']), T: (x, y, h, s, al, rot, col) => g.T.push([x, y, h, s, al || 'L', rot || 0, col || 7]),
    B: (x, y, w, h, s) => { o.L(x, y, x + w, y, s); o.L(x + w, y, x + w, y + h, s); o.L(x + w, y + h, x, y + h, s); o.L(x, y + h, x, y, s); },
    O: (x, y, r, s, n = 20) => { for (let i = 0; i < n; i++) { const a = 2 * Math.PI * i / n, b = 2 * Math.PI * (i + 1) / n; o.L(x + r * Math.cos(a), y + r * Math.sin(a), x + r * Math.cos(b), y + r * Math.sin(b), s); } } }; return o; };

  MT.isiMerkeziSema = (h) => {
    h = h || MT.isiMerkeziHesap(); if (!h) return null; const c = cizer(), n = h.adet, kw = 30, kh = 36, ar = 46, xK = n * ar, yG = 78, yD = 62, xS = xK + 96;
    for (let i = 0; i < n; i++) {
      const x = i * ar; c.B(x, 0, kw, kh, 'k'); c.T(x + kw / 2, kh / 2 + 4, 3, `KAZAN ${n > 1 ? i + 1 : ''}`.trim(), 'MC'); c.T(x + kw / 2, kh / 2 - 1, 2.4, `${fi(h.kW)} kW`, 'MC'); c.T(x + kw / 2, kh / 2 - 6, 2, h.k.kazanTip === 'yogusmali' ? 'yoğuşmalı' : 'konvansiyonel', 'MC');
      c.B(x - 9, 6, 9, 9, 'r'); c.T(x - 4.5, 10.5, 2.2, 'B', 'MC', 0, 1); c.L(x - 16, 10.5, x - 9, 10.5, 'r'); c.T(x - 16, 12.5, 1.8, h.Y[0].toLocaleLowerCase('tr'), 'L');
      c.L(x + 6, kh, x + 6, 104, 'k'); c.L(x + 9, kh, x + 9, 104, 'k'); if (i === 0) c.T(x + 4, 92, 2, `Baca Ø${h.bacaD} mm · h = ${f(h.bacaH, 1)} m`, 'L', Math.PI / 2);
      c.L(x + 20, kh, x + 20, yG, 'g'); c.L(x + 20, kh + 8, x + 26, kh + 8, 'g'); c.L(x + 26, kh + 8, x + 26, kh + 12, 'r'); c.L(x + 24, kh + 12, x + 28, kh + 12, 'r'); c.L(x + 24, kh + 12, x + 26, kh + 15, 'r'); c.L(x + 28, kh + 12, x + 26, kh + 15, 'r'); if (i === 0) c.T(x + 29, kh + 11, 1.8, `EV ${h.ev} · 3 bar`, 'L');
      c.L(x + kw, 8, x + kw + 8, 8, 'd'); c.L(x + kw + 8, 8, x + kw + 8, yD, 'd');
    }
    c.B(-4, yG, xS + 24, 5, 'g'); c.T(-6, yG + 1.5, 2.2, 'Gidiş kollektörü', 'R'); c.B(-4, yD, xS + 24, 5, 'd'); c.T(-6, yD + 1.5, 2.2, `Dönüş kollektörü  Ø${Math.ceil(h.kolD / 5) * 5} mm`, 'R');
    /* genleşme deposu ve doldurma */
    const xg = xK + 18; c.O(xg, 22, 9, 'k'); c.L(xg - 9, 22, xg + 9, 22, 'i'); c.T(xg, 26, 2.2, 'KGD', 'MC'); c.T(xg, 17, 2, `${h.depo} l`, 'MC'); c.L(xg, 31, xg, yD, 'd'); c.T(xg + 11, 24, 1.8, `ön basınç ${f(h.P0, 1)} bar`, 'L'); c.L(xg + 26, 44, xg, 44, 'i'); c.T(xg + 27, 43, 1.8, 'şebekeden doldurma (filtre, çek valf, manometre)', 'L');
    /* radyatör devresi: asıl + yedek pompa */
    const xz = xK + 56, yp = 96; c.L(xz, yG + 5, xz, 128, 'g'); c.L(xz + 26, yD + 5, xz + 26, yG, 'd'); c.L(xz + 26, yG + 5, xz + 26, 128, 'd');
    const pomp = x => { c.O(x, yp, 4.5, 'k'); c.L(x - 3, yp - 3, x, yp + 4.5, 'k'); c.L(x + 3, yp - 3, x, yp + 4.5, 'k'); };
    pomp(xz); if (h.k.pompaYedek) { c.L(xz, yp - 9, xz + 11, yp - 9, 'g'); c.L(xz + 11, yp - 9, xz + 11, yp + 9, 'g'); c.L(xz + 11, yp + 9, xz, yp + 9, 'g'); pomp(xz + 11); }
    c.T(xz + 32, yp + 3, 2.2, `Sirkülasyon pompası ${h.pompa.ad}${h.k.pompaYedek ? ' (1 asıl + 1 yedek)' : ''}`, 'L'); c.T(xz + 32, yp - 1.5, 2.2, `${f(h.debi, 2)} m³/h · ${f(h.Hm, 1)} mSS`, 'L');
    c.T(xz + 13, 131, 2.6, 'RADYATÖR DEVRESİ', 'MC', 0, 2); c.T(xz + 13, 135.5, 2.2, `${f(h.Qkur / 1000, 1)} kW · ${h.kk.tg}/${h.kk.td} °C${h.ana ? ' · ' + h.ana.dn : ''}`, 'MC');
    c.T(-20, 150, 4, 'ISI MERKEZİ AKIŞ ŞEMASI', 'L', 0, 2); c.T(-20, 144.5, 2.2, `${n} × ${fi(h.kW)} kW ${h.Y[0].toLocaleLowerCase('tr')} kazanı · brülör ${f(h.QB, 0)} kW (${f(h.yakitSaat, 1)} ${h.Y[2]}/h) · ${h.brul.toLocaleLowerCase('tr')}`, 'L');
    c.L(-20, -12, -8, -12, 'g'); c.T(-6, -13, 2.2, 'gidiş', 'L'); c.L(10, -12, 22, -12, 'd'); c.T(24, -13, 2.2, 'dönüş', 'L'); c.T(44, -13, 2.2, 'B: brülör · EV: emniyet ventili · KGD: kapalı genleşme deposu', 'L');
    return c.g;
  };
  /* tip yerleşim planı — metre, ölçekli; sol alt köşe = kazan dairesi iç köşesi */
  MT.kazanDairesiPlan = (h) => {
    h = h || MT.isiMerkeziHesap(); if (!h) return null; const c = cizer(), n = h.adet, [kl, kb] = h.kz, B = h.odaB, Lo = h.odaL, th = 0.14;
    c.B(0, 0, B, Lo, 'k'); c.B(-0.2, -0.2, B + 0.4, Lo + 0.4, 'k');
    for (let i = 0; i < n; i++) {
      const x = h.duvarTip ? 0.5 + i * 0.9 : 0.6 + i * (kb + 0.6), y = h.duvarTip ? Lo - kb : Lo - 0.5 - kl; c.B(x, y, h.duvarTip ? kl : kb, h.duvarTip ? kb : kl, 'r'); const cx = x + (h.duvarTip ? kl : kb) / 2;
      c.T(cx, y + (h.duvarTip ? kb : kl) / 2, th, `K${i + 1}`, 'MC', 0, 2); c.T(cx, y + (h.duvarTip ? kb : kl) / 2 - th * 1.6, th * 0.8, `${fi(h.kW)} kW`, 'MC');
      if (!h.duvarTip) { c.B(cx - 0.2, y - 0.35, 0.4, 0.35, 'r'); c.T(cx, y - 0.2, th * 0.8, 'B', 'MC', 0, 1); }
      c.O(cx, Lo - (h.duvarTip ? 0.12 : 0.25), h.bacaD / 2000, 'k', 16);
    }
    const xr = B - 0.55; c.O(xr, 0.55, Math.max(0.16, Math.sqrt(h.depo / 1000 / 3.5)), 'r'); c.T(xr, 0.55, th * 0.8, 'KGD', 'MC'); c.T(xr, 0.55 - th * 1.5, th * 0.7, `${h.depo} l`, 'MC');
    c.B(B - 0.25, 1.3, 0.2, Math.min(1.6, Lo - 2.0), 'g'); c.T(B - 0.4, 1.3 + Math.min(1.6, Lo - 2.0) / 2, th * 0.8, 'Kollektör + pompa grubu', 'MC', Math.PI / 2);
    c.L(0.35, -0.2, 1.25, -0.2, 'd'); c.L(0.35, 0, 1.25, 0, 'd'); c.T(1.4, -0.36, th * 0.8, 'Kapı (dışa açılır, yangına dayanıklı)', 'L');
    c.L(-0.2, 0.3, 0, 0.3, 'g'); c.L(-0.2, 0.3 + Math.sqrt(h.menA) / 100, 0, 0.3 + Math.sqrt(h.menA) / 100, 'g'); c.T(-0.3, 0.3, th * 0.8, `Alt menfez ≥ ${fi(h.menA)} cm²`, 'R');
    c.L(-0.2, Lo - 0.5, 0, Lo - 0.5, 'g'); c.L(-0.2, Lo - 0.5 + Math.sqrt(h.menU) / 100, 0, Lo - 0.5 + Math.sqrt(h.menU) / 100, 'g'); c.T(-0.3, Lo - 0.5, th * 0.8, `Üst menfez ≥ ${fi(h.menU)} cm²`, 'R');
    c.L(0, -0.55, B, -0.55, 'i'); c.L(0, -0.45, 0, -0.65, 'i'); c.L(B, -0.45, B, -0.65, 'i'); c.T(B / 2, -0.5, th, `${f(B, 2)} m`, 'MC');
    c.L(B + 0.55, 0, B + 0.55, Lo, 'i'); c.L(B + 0.45, 0, B + 0.65, 0, 'i'); c.L(B + 0.45, Lo, B + 0.65, Lo, 'i'); c.T(B + 0.5, Lo / 2, th, `${f(Lo, 2)} m`, 'MC', Math.PI / 2);
    c.T(0, Lo + 0.75, th * 1.6, 'KAZAN DAİRESİ TİP YERLEŞİMİ', 'L', 0, 2); c.T(0, Lo + 0.42, th * 0.85, `En küçük iç ölçüler ${f(B, 2)} × ${f(Lo, 2)} m, net yükseklik ≥ ${f(h.odaH, 2)} m · baca Ø${h.bacaD} mm · kazan önü ≥ 1,0 m, yanlar ≥ 0,5 m boşluk`, 'L');
    return c.g;
  };
  /* mtsema: metre birimli çizim desteği */
  if (C.T && C.T.mtsema) { const p0 = C.T.mtsema.prims, { L, TX } = C.prim; C.T.mtsema.prims = e => { if (e.birim !== 'm') return p0(e); const o = M.p3(e.p), out = [], ST = { g: { lw: 30, color: 1 }, d: { lw: 30, color: 5, lt: 'HIDDEN' }, r: { lw: 30, color: 1 }, i: { lw: 13, color: 8 }, k: { lw: 50, color: 7 } }; for (const l of e.g.L) out.push(L([o[0] + l[0], o[1] + l[1], 0], [o[0] + l[2], o[1] + l[3], 0], ST[l[4]] || ST.i)); for (const t of e.g.T) out.push(TX([o[0] + t[0], o[1] + t[1], 0], t[2], t[3], t[5] || 0, t[4] || 'L', { color: t[6] || 7 })); return out; }; }

  /* ---------- rapor ---------- */
  MT.raporEk = MT.raporEk || [];
  MT.raporEk.push(() => {
    if (MT.kal().sistem === 'elektrik') return '';
    const h = MT.isiMerkeziHesap(); if (!h) return ''; const k = h.k, kcal = h.kW * 860;
    const R = (a, b, c) => `<tr><td>${a}</td><td>${b}</td><td class="n"><b>${c}</b></td></tr>`;
    let s = `<h2>8. Isı merkezi ve cihaz seçimleri</h2>`;
    if (k.sistem === 'merkezi') s += `<div class="kart"><div><b>${h.adet} × ${fi(h.kW)} kW</b><span>${k.kazanTip === 'yogusmali' ? 'Yoğuşmalı' : 'Konvansiyonel'} ${h.Y[0].toLocaleLowerCase('tr')} kazanı</span></div><div><b>${f(h.yakitSaat * h.adet, 1)} ${h.Y[2]}/h</b><span>Tam yükte yakıt tüketimi</span></div><div><b>Ø${h.bacaD} mm</b><span>Baca (her kazan), h = ${f(h.bacaH, 1)} m</span></div><div><b>${h.pompa.ad}</b><span>Pompa ${f(h.debi, 2)} m³/h · ${f(h.Hm, 1)} mSS</span></div></div>
<table><tr><th>Hesap</th><th>Bağıntı ve kabuller</th><th class="n">Sonuç</th></tr>
${R('Kazan ısıl gücü', `Q<sub>K</sub> = Q<sub>h</sub>·(1 + Z<sub>R</sub>) = ${f(Math.max(h.Qh, h.Qkur) / 1000, 1)} × ${f(1 + h.kk.emniyet / 100, 2)} = ${f(h.QK, 1)} kW${h.adet > 1 ? ` ; ${h.adet} eş kazan, her biri yükün %${h.adet === 2 ? 60 : Math.round(110 / h.adet)}'ı` : ''}`, `${h.adet} × ${fi(h.kW)} kW (${fi(kcal)} kcal/h)`)}
${R('Brülör', `Q<sub>B</sub> = Q<sub>K</sub> / η = ${fi(h.kW)} / ${f(h.eta, 2)} ; yakıt debisi B = Q<sub>B</sub> / H<sub>u</sub>, H<sub>u</sub> = ${f(h.Y[1], 2)} kWh/${h.Y[2]}`, `${f(h.QB, 0)} kW · ${f(h.yakitSaat, 1)} ${h.Y[2]}/h · ${esc(h.brul)}`)}
${R('Yıllık yakıt tüketimi', `B<sub>yıl</sub> = Q<sub>yıl</sub> / (η<sub>kazan</sub>·η<sub>dağıtım</sub>·H<sub>u</sub>) ; Q<sub>yıl</sub> = ${fi(h.Qyil)} kWh (TS 825 ön hesabı), η<sub>dağıtım</sub> = 0,93`, `${fi(h.yakitYil)} ${h.Y[2]}/yıl`)}
${R('Baca kesiti', `F = n·Q<sub>K</sub> / √h = ${f(h.Y[3], 3)} × ${fi(kcal)} / √${f(h.bacaH, 1)} = ${f(h.F, 0)} cm² → D = ${f(h.Dh, 0)} mm (Q<sub>K</sub> kcal/h, h baca yüksekliği m)`, `Ø${h.bacaD} mm (${f(h.Fsec, 0)} cm²)`)}
${R('Sirkülasyon pompası', `V̇ = Q / (ρ·c·Δt) ; H<sub>m</sub> = 1,1 × kritik devre basınç kaybı${h.kal ? '' : ' (boru şebekesi çizilmediği için 2,5 mSS kabul edildi)'}`, `${f(h.debi, 2)} m³/h · ${f(h.Hm, 1)} mSS → ${h.pompa.ad}${k.pompaYedek ? ', 1 asıl + 1 yedek' : ''} (≈ ${fi(Math.max(25, h.pompa.P))} W)`)}
${R('Kapalı genleşme deposu', `V<sub>g</sub> = V<sub>su</sub>·n·(P<sub>e</sub>+1) / (P<sub>e</sub> − P<sub>0</sub>) ; V<sub>su</sub> = ${fi(h.Vsu)} l (12 l/kW), n = %${f(h.nG * 100, 2)}, P<sub>0</sub> = ${f(h.P0, 1)} bar, P<sub>e</sub> = ${f(h.Pe, 1)} bar → ${f(h.Vg, 1)} l`, `${h.depo} l`)}
${R('Emniyet ventili', 'Kazan gücüne göre anma çapı (TS EN 12828), açma basıncı 3 bar; her kazana ayrı', h.ev)}
${R('Kollektör / denge kabı', `Kollektörde v ≈ 0,4 m/s, denge kabında v ≈ 0,2 m/s (${f(h.debi, 2)} m³/h)`, `Ø${Math.ceil(h.kolD / 5) * 5} mm / Ø${Math.ceil(h.dengeD / 5) * 5} mm`)}
${R('Kazan dairesi havalandırması', 'Taze hava girişi baca kesitinin %50\'si (en az 300 cm²), kirli hava çıkışı %25\'i (en az 150 cm²)', `alt ${fi(h.menA)} cm² · üst ${fi(h.menU)} cm²`)}
${R('Kazan dairesi ölçüleri', `Kazan önünde ≥ 1,0 m, yanlarda ve arkada ≥ 0,5 m boşluk; ${h.duvarTip ? 'duvar tipi' : 'yer tipi'} kazan`, `≥ ${f(h.odaB, 2)} × ${f(h.odaL, 2)} m, h ≥ ${f(h.odaH, 2)} m`)}</table>`;
    s += `<h3>${k.sistem === 'merkezi' ? 'Seçenek: bireysel sistem (kombi / kat kaloriferi)' : 'Bireysel sistem: kombi / kat kaloriferi seçimi'}</h3><table><tr><th>Bağımsız bölüm</th><th class="n">Mahal</th><th class="n">Alan (m²)</th><th class="n">Isı kaybı (W)</th><th class="n">Gereken (kW)</th><th>Cihaz</th><th class="n">Kapasite</th><th class="n">Sıcak su (ΔT 30 K)</th><th class="n">Gaz (Nm³/h)</th></tr>${h.kombi.map(g => `<tr><td>${esc(g.ad)}</td><td class="n">${g.n}</td><td class="n">${f(g.A, 1)}</td><td class="n">${fi(g.Q)}</td><td class="n">${f(g.need, 1)}</td><td>${g.asim ? 'Kapasite aşılıyor — kaskad ya da merkezi sistem' : esc(g.tip)}</td><td class="n">${g.kw} kW</td><td class="n">${f(g.sicakSu, 1)} l/dk</td><td class="n">${f(g.gaz, 2)}</td></tr>`).join('')}</table>
<p class="mut">Kombi kapasitesi: ısı kaybının 1,15 katı ile kullanım sıcak suyu ihtiyacından büyük olanı (tek banyo en az 24 kW, iki banyo 28 kW). Hermetik (C tipi) cihazlarda baca hesabı yapılmaz, üreticinin atık gaz seti kullanılır. Mahalleri bağımsız bölümlere ayırmak için Mahaller sekmesindeki "Bölüm" sütununu doldurun; boş bırakılanlar tek bölüm sayılır.</p>
<div class="not">Kazan, brülör ve pompa seçimleri tipik kapasite kademelerine göredir; seçilen markanın kataloğu ve eğrileriyle doğrulanmalıdır. Baca kesiti yaklaşık bağıntıyla bulunmuştur: yoğuşmalı ve üflemeli brülörlü cihazlarda üretici baca tablosu ya da TS EN 13384-1 hesabı esas alınır. Doğalgazlı kazan dairelerinde havalandırma ve yerleşim için gaz dağıtım şirketinin teknik şartnamesi geçerlidir.</div>`;
    return s;
  });

  /* ---------- komutlar ---------- */
  if (C.addCommand) {
    const koy = async (I, g, soru, ek) => { const p = await I.pt(soru); if (!p || typeof p === 'string') return; C.undoStack.push(C.snapshot()); C.doc.ents = C.doc.ents.filter(e => !(e.type === 'mtsema' && e.tur === ek.tur)); C.add(C.newEnt('mtsema', Object.assign({ layer: MT._lay ? MT._lay('MT_ISI_MERKEZI', 7, 25) : '0', dis: 'Mekanik', p: M.p3(p), g }, ek))); };
    C.addCommand(['ISIMERKEZISEMA', 'KAZANSEMASI', 'AKISSEMASI'], 'Isı merkezi akış (prensip) şeması: kazan(lar), brülör, baca, emniyet ventili, kollektörler, genleşme deposu, sirkülasyon pompası ve radyatör devresi — seçilen kapasitelerle.', async (I) => { const g = MT.isiMerkeziSema(); if (!g) { C.warn('Önce mahalleri ve ısı kaybını oluşturun (MAHALBUL).'); return; } await koy(I, g, 'Akış şemasının yeri (sol alt)', { tur: 'akis' }); });
    C.addCommand(['KAZANDAIRESI', 'KAZANDAIRESIPLAN'], 'Kazan dairesi tip yerleşim planı (ölçekli): kazanlar, brülör, baca, genleşme deposu, kollektör, menfezler ve en küçük oda ölçüleri.', async (I) => { const g = MT.kazanDairesiPlan(); if (!g) { C.warn('Önce mahalleri ve ısı kaybını oluşturun (MAHALBUL).'); return; } await koy(I, g, 'Kazan dairesinin iç sol alt köşesi', { tur: 'kdaire', birim: 'm' }); });
    C.addCommand(['ISIMERKEZI', 'KAZANHESABI'], 'Isı merkezi hesabı: kazan, brülör, baca, pompa, genleşme deposu, emniyet ventili sonuçlarını komut satırına yazar.', async () => { const h = MT.isiMerkeziHesap(); if (!h) { C.warn('Önce mahalleri oluşturun (MAHALBUL).'); return; } C.log(`Isı merkezi: ${h.adet} × ${h.kW} kW ${h.Y[0]} kazanı · brülör ${f(h.QB, 0)} kW (${f(h.yakitSaat, 1)} ${h.Y[2]}/h) · baca Ø${h.bacaD} mm, h=${f(h.bacaH, 1)} m · pompa ${h.pompa.ad} (${f(h.debi, 2)} m³/h, ${f(h.Hm, 1)} mSS) · genleşme deposu ${h.depo} l · emniyet ventili ${h.ev}.`); });
  }
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : (globalThis.C = globalThis.C || {}));

/* ArıtmaCAD — MEKANİK TESİSAT · ISI KAZANCI (soğutma yükü) ve SOĞUTMA TESİSATI
   Isı kazancı: tasarım günü (21 Temmuz) saat saat hesap — ASHRAE açık gökyüzü güneş modeli, güneş-hava sıcaklığı, duvar / çatı için
     zaman gecikmesi ve sönüm, camda güneş kazancı + iletim, insan, aydınlatma, cihaz, taze hava (duyulur + gizli). Mahal tepe yükü ve
     bina eş zamanlı (blok) yükü ayrı bulunur.
   Soğutma: fancoil (soğutulmuş su 7/12 °C, chiller) ya da split klima. Fancoil / iç ünite seçimi ve yerleşimi, soğutma suyu boruları,
     chiller, pompa, tampon tank; soğutma kolon şeması.
   Nesne: mtfc { p, no, model, Qn (W toplam), tip 'kaset'|'split', mid, z0, dp (split: dış ünite noktası) }
   Komutlar: ISIKAZANCI, SOGUTMA (tek adım), FANCOILYERLESTIR, SOGUTMAKOLON, SOGUTMABORU, SOGUTMASEMASI, SOGUTMASIL */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, V = C.MTV, MT = C.MT, { L, P, TX, CI } = C.prim || {};
  const f = (v, d = 2) => (isFinite(v) ? (+v).toFixed(d) : '—').replace('.', ',');
  const fi = v => isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—';
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const RAD = Math.PI / 180;

  /* ---------- veriler ---------- */
  /* yaz tasarım koşulları: [kuru termometre °C, yaş termometre °C, günlük sıcaklık farkı K, enlem °] — başlıca iller; diğerleri bölgeye göre */
  const YAZ = { Adana: [38, 26, 11, 37.0], Ankara: [34, 20, 15, 39.9], Antalya: [39, 28, 11, 36.9], Aydın: [39, 26, 14, 37.8], Bursa: [36, 25, 13, 40.2], Denizli: [38, 24, 14, 37.8], Diyarbakır: [42, 23, 16, 37.9], Edirne: [36, 25, 13, 41.7], Elazığ: [38, 21, 16, 38.7], Erzurum: [30, 18, 16, 39.9], Eskişehir: [34, 22, 15, 39.8], Gaziantep: [39, 23, 15, 37.1], Hatay: [37, 28, 9, 36.2], İstanbul: [33, 24, 9, 41.0], İzmir: [37, 24, 12, 38.4], Kayseri: [36, 22, 17, 38.7], Kocaeli: [36, 25, 11, 40.8], Konya: [34, 21, 15, 37.9], Malatya: [38, 21, 15, 38.4], Manisa: [40, 25, 14, 38.6], Mersin: [35, 29, 8, 36.8], Muğla: [37, 22, 14, 37.2], Samsun: [32, 25, 7, 41.3], Sivas: [33, 20, 16, 39.7], Şanlıurfa: [43, 24, 14, 37.2], Trabzon: [31, 25, 6, 41.0], Van: [33, 20, 14, 38.5] };
  const YAZB = { 1: [38, 27, 11, 37], 2: [38, 24, 13, 37.5], 3: [33, 24, 9, 40.5], 4: [35, 21, 15, 39.5], 5: [33, 20, 15, 39.5], 6: [30, 18, 15, 40] };
  /* mahal tipine göre (V.MAHAL sırası): [soğutulur mu, m²/kişi (0 = yok), aydınlatma W/m², cihaz W/m²] */
  const KUL = [[1, 10, 10, 15], [1, 2.5, 10, 5], [1, 15, 8, 5], [1, 15, 6, 3], [1, 1.5, 10, 5], [0, 10, 10, 30], [0, 0, 8, 0], [0, 0, 6, 0], [0, 5, 8, 0], [0, 20, 6, 0], [0, 0, 5, 0], [1, 8, 12, 30], [1, 8, 10, 40], [0, 15, 10, 20], [0, 50, 5, 0], [0, 0, 6, 50], [0, 0, 0, 0], [0, 0, 6, 0], [0, 0, 0, 0], [0, 0, 6, 0], [0, 0, 6, 0], [0, 0, 6, 0], [0, 0, 6, 0], [0, 0, 8, 0], [0, 0, 8, 0]];
  const SAAT = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const TFRAC = [87, 92, 96, 99, 100, 98, 93, 84, 71, 56, 39, 23, 11, 3, 0, 3, 10, 21, 34, 47, 58, 68, 76, 82]; // saat 1…24, günlük farkın %'si
  const YONAZ = { G: 0, GB: 45, B: 90, KB: 135, K: 180, KD: -135, D: -90, GD: -45 };
  /* fancoil (4 yöne üflemeli kaset, 7/12 °C su, 27/19 °C hava, orta devir): [model, toplam W, duyulur W, hava m³/h] */
  const FC = [['FC-200', 1500, 1150, 300], ['FC-300', 2200, 1650, 420], ['FC-400', 2900, 2150, 550], ['FC-500', 3600, 2700, 680], ['FC-600', 4400, 3250, 850], ['FC-800', 5300, 3900, 1020], ['FC-1000', 6200, 4600, 1200], ['FC-1200', 7500, 5600, 1450], ['FC-1400', 9000, 6700, 1700]];
  const SPLIT = [['9.000 BTU/h', 2600], ['12.000 BTU/h', 3500], ['18.000 BTU/h', 5300], ['24.000 BTU/h', 7000], ['30.000 BTU/h', 8800], ['36.000 BTU/h', 10500], ['48.000 BTU/h', 14100]];
  const CHILLER = [15, 20, 25, 30, 40, 50, 60, 75, 90, 110, 130, 150, 180, 220, 260, 300, 350, 400, 500, 600, 750, 900, 1000];
  MT.sog = () => { const m = MT.set(); if (!m.sog) m.sog = {}; const k = m.sog, y = YAZ[m.il] || YAZB[m.bolge] || YAZB[4]; if (k.il !== m.il) { k.il = m.il; k.tdb = y[0]; k.twb = y[1]; k.dr = y[2]; k.enlem = y[3]; } const d = { ti: 24, rh: 50, golge: 0.7, emniyet: 10, tazeKisi: 36, tazeAch: 0.5, sistem: 'fancoil', boru: 'celik', Rmax: 150, vmax: 1.2, tg: 7, td: 12, alfa: 0.035, chL: 15 }; for (const q in d) if (k[q] == null) k[q] = d[q]; return k; };
  const fcs = () => C.doc.ents.filter(e => e.type === 'mtfc'), sborular = () => C.doc.ents.filter(e => e.type === 'mtboru' && e.sys === 'sog'), skolon = () => C.doc.ents.find(e => e.type === 'mtkolon' && e.sys === 'sog');
  MT.kulOf = e => { const d = KUL[e.tip || 0] || KUL[16], A = MT.alan(e); return { sog: e.sog != null ? !!e.sog : !!d[0], kisi: e.kisi != null && e.kisi !== '' ? +e.kisi : (d[1] > 0 ? Math.max(1, Math.round(A / d[1])) : 0), ayd: e.aydW != null && e.aydW !== '' ? +e.aydW : d[2], cih: e.cihW != null && e.cihW !== '' ? +e.cihW : d[3] }; };

  /* ---------- güneş ve psikrometri ---------- */
  /* ışınım [W/m²]: psi = yüzey azimutu (güneyden, batı +), yatay = çatı ; t güneş saati */
  MT.gunes = (lat, t, psi, yatay) => {
    const Lr = lat * RAD, d = 20.6 * RAD, H = 15 * (t - 12) * RAD, sb = Math.cos(Lr) * Math.cos(d) * Math.cos(H) + Math.sin(Lr) * Math.sin(d); if (sb <= 0.02) return { I: 0, ID: 0, Id: 0, th: 90 };
    const cb = Math.sqrt(1 - sb * sb), A = 1085, B = 0.207, Cc = 0.136, IDN = A / Math.exp(B / sb); let cf = (sb * Math.sin(Lr) - Math.sin(d)) / (cb * Math.cos(Lr)); cf = Math.max(-1, Math.min(1, cf)); const az = Math.acos(cf) * (H >= 0 ? 1 : -1);
    if (yatay) return { I: IDN * sb + Cc * IDN, ID: IDN * sb, Id: Cc * IDN, th: Math.acos(sb) / RAD };
    const ct = cb * Math.cos(az - psi * RAD), ID = ct > 0 ? IDN * ct : 0, Y = ct > -0.2 ? 0.55 + 0.437 * ct + 0.313 * ct * ct : 0.45, Id = Cc * IDN * Y + IDN * (Cc + sb) * 0.2 * 0.5;
    return { I: ID + Id, ID, Id, th: ct > 0 ? Math.acos(ct) / RAD : 90 };
  };
  const pws = T2 => 610.94 * Math.exp(17.625 * T2 / (T2 + 243.04));
  const wOf = (T2, rh) => { const p = rh * pws(T2); return 622 * p / (101325 - p); }; // g/kg
  const wWb = (tdb, twb) => { const ws = wOf(twb, 1) / 1000; return 1000 * ((2501 - 2.326 * twb) * ws - 1.006 * (tdb - twb)) / (2501 + 1.86 * tdb - 4.186 * twb); };
  const tDis = (k, t) => k.tdb - k.dr * TFRAC[((Math.round(t) - 1) % 24 + 24) % 24] / 100;
  const AG = [0.45, 0.25, 0.18, 0.12]; // ısıl depolama: son dört saatin ağırlıklı ortalaması

  /* ---------- mahal ısı kazancı ---------- */
  MT.mahalKazanc = (e, all, m, k) => {
    all = all || MT.mahaller(); m = m || MT.set(); k = k || MT.sog(); const u = MT.kulOf(e), A = MT.alan(e), h = +e.h || m.hKat; if (!u.sog) return { sog: false, A, V: A * h };
    const items = MT.mahalYuzeyleri(e, all, m), byId = id => all.find(o => o.id === id), sogKomsu = id => { const o = byId(id); return !!(o && MT.kulOf(o).sog); };
    const sa = (t, yon, yatay) => tDis(k, t) + k.alfa * MT.gunes(k.enlem, t, YONAZ[yon] || 0, yatay).I - (yatay ? 4 : 0);
    const saOrt = (yon, yatay) => { let s = 0; for (let t = 1; t <= 24; t++) s += sa(t, yon, yatay); return s / 24; };
    const cache = new Map(), so = (yon, yatay) => { const key = yon + (yatay ? 'Y' : ''); if (!cache.has(key)) cache.set(key, saOrt(yon, yatay)); return cache.get(key); };
    const wo = wWb(k.tdb, k.twb), wi = wOf(k.ti, k.rh / 100), taze = Math.max(u.kisi * k.tazeKisi, k.tazeAch * A * h);
    const saatlik = SAAT.map(t => {
      const o = { t, duvar: 0, cati: 0, camI: 0, camG: 0, ic: 0, insan: 0, ayd: 0, cih: 0, tazeD: 0 }, To = tDis(k, t);
      for (const it of items) {
        if (it.tur === 'DD') o.duvar += it.U * it.A * ((so(it.yon) - k.ti) + 0.35 * (sa(t - 7, it.yon) - so(it.yon)));
        else if (it.tur === 'TV') o.cati += it.U * it.A * ((so('G', 1) - k.ti) + 0.45 * (sa(t - 5, 'G', 1) - so('G', 1)));
        else if ((it.tur === 'PN' || it.tur === 'KP') && it.dis) {
          o.camI += it.U * it.A * (To - k.ti);
          const g = it.tur === 'PN' ? ((m.yapi[it.key] && +m.yapi[it.key].g) || 0.5) : ((m.yapi[it.key] && +m.yapi[it.key].g) || 0);
          if (g > 0) { let q = 0; AG.forEach((w, j) => { const G = MT.gunes(k.enlem, t - j, YONAZ[it.yon] || 0); q += w * (G.ID * (1 - Math.pow(G.th / 90, 5)) + G.Id); }); o.camG += it.A * 0.8 * 0.9 * g * k.golge * q; }
        } else if ((it.tur === 'ID' || it.tur === 'KP' || it.tur === 'AD') && !it.dis && it.k !== 'yok' && !sogKomsu(it.k)) o.ic += it.U * it.A * Math.max(0, To - 3 - k.ti);
        else if (it.tur === 'AD' && it.dis) o.ic += it.U * it.A * (To - k.ti);
      }
      const calis = t >= 8 && t <= 18 ? 1 : 0.1; o.insan = u.kisi * 75 * calis; o.ayd = u.ayd * A * calis; o.cih = u.cih * A * (calis ? Math.max(calis, 0.3) : 0.3); o.tazeD = 0.335 * taze * (To - k.ti) * (calis > 0.5 ? 1 : 0.3);
      o.gizli = u.kisi * 55 * calis + Math.max(0, 0.834 * taze * (wo - wi)) * (calis > 0.5 ? 1 : 0.3);
      o.duy = Math.max(0, o.duvar) + Math.max(0, o.cati) + o.camI + o.camG + o.ic + o.insan + o.ayd + o.cih + o.tazeD; o.top = (o.duy + o.gizli) * (1 + k.emniyet / 100); return o;
    });
    const tepe = saatlik.reduce((a, b) => b.top > a.top ? b : a, saatlik[0]);
    return { sog: true, A, V: A * h, u, taze, saatlik, tepe, Q: tepe.top, Qd: tepe.duy * (1 + k.emniyet / 100), Qg: tepe.gizli * (1 + k.emniyet / 100), qA: A ? tepe.top / A : 0, wo, wi };
  };
  MT.kazancHesapla = () => {
    const m = MT.set(), k = MT.sog(), all = MT.mahaller(), res = all.map(e => ({ e, r: MT.mahalKazanc(e, all, m, k) })), sg = res.filter(x => x.r.sog);
    const blok = SAAT.map((t, i) => { const o = { t, top: 0 }; for (const key of ['duvar', 'cati', 'camI', 'camG', 'ic', 'insan', 'ayd', 'cih', 'tazeD', 'gizli']) o[key] = sg.reduce((s, x) => s + Math.max(key === 'duvar' || key === 'cati' ? 0 : -1e9, x.r.saatlik[i][key]), 0); o.top = sg.reduce((s, x) => s + x.r.saatlik[i].top, 0); return o; });
    const tepe = blok.reduce((a, b) => b.top > a.top ? b : a, blok[0] || { top: 0, t: 15 });
    return { m, k, res, sg, blok, tepe, Qblok: tepe.top, Qtoplam: sg.reduce((s, x) => s + x.r.Q, 0), A: sg.reduce((s, x) => s + x.r.A, 0) };
  };

  /* ---------- nesne: fancoil / split iç ünite ---------- */
  if (T) {
    T.mtfc = {
      label: 'Fancoil / klima iç ünitesi',
      prims: e => { const z = +e.z0 || 0, c = e.p, out = [], h = C.annoH(2);
        if (e.tip === 'split') { const a = e.ang || 0, u = [Math.cos(a), Math.sin(a)], n = [-u[1], u[0]], pt = (s, o) => [c[0] + u[0] * s + n[0] * o, c[1] + u[1] * s + n[1] * o, z]; out.push(P([pt(-0.45, -0.1), pt(0.45, -0.1), pt(0.45, 0.1), pt(-0.45, 0.1)], true, { lw: 30, color: 4 }));
          if (e.dp) { const d = e.dp; out.push(P([[d[0] - 0.4, d[1] - 0.17, z], [d[0] + 0.4, d[1] - 0.17, z], [d[0] + 0.4, d[1] + 0.17, z], [d[0] - 0.4, d[1] + 0.17, z]], true, { lw: 30, color: 4 }), CI([d[0], d[1], z], 0.13, { lw: 13, color: 4 }), L([c[0], c[1], z], [d[0], d[1], z], { lw: 18, color: 6, lt: 'HIDDEN' })); }
          out.push(TX(pt(0, 0.1 + h * 1.2), h, `${e.no} ${e.model}`, 0, 'MC', { color: 4 }), TX(pt(0, 0.1 + h * 2.7), h, `${f(e.Qn / 1000, 1)} kW`, 0, 'MC', { color: 7 })); return out; }
        const s = 0.3; out.push(P([[c[0] - s, c[1] - s, z], [c[0] + s, c[1] - s, z], [c[0] + s, c[1] + s, z], [c[0] - s, c[1] + s, z]], true, { lw: 30, color: 4 }), P([[c[0] - s * 0.5, c[1] - s * 0.5, z], [c[0] + s * 0.5, c[1] - s * 0.5, z], [c[0] + s * 0.5, c[1] + s * 0.5, z], [c[0] - s * 0.5, c[1] + s * 0.5, z]], true, { lw: 13, color: 4 }));
        for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) out.push(L([c[0] + a * s, c[1] + b * s, z], [c[0] + a * s * 0.5, c[1] + b * s * 0.5, z], { lw: 13, color: 4 }));
        out.push(TX([c[0], c[1] + s + h * 1.2, z], h, `${e.no} ${e.model}`, 0, 'MC', { color: 4 }), TX([c[0], c[1] - s - h * 1.2, z], h, `${f(e.Qn / 1000, 1)} kW`, 0, 'MC', { color: 7 })); return out; },
      snaps: e => [{ p: [e.p[0], e.p[1], +e.z0 || 0], k: 'ins' }],
      xf: (e, X) => { const q = X.p([e.p[0], e.p[1], 0]); e.p = [q[0], q[1]]; if (e.cp) { const c = X.p([e.cp[0], e.cp[1], 0]); e.cp = [c[0], c[1]]; } if (e.dp) { const d = X.p([e.dp[0], e.dp[1], 0]); e.dp = [d[0], d[1]]; } },
      info: e => `${e.tip === 'split' ? 'Split klima iç ünitesi' : 'Kaset tipi fancoil'} ${e.model} · ${f(e.Qn / 1000, 1)} kW (gereken ${f(e.Q / 1000, 1)} kW)`,
    };
  }

  /* ---------- cihaz yerleşimi ---------- */
  MT.fcYerlestir = () => {
    const kz = MT.kazancHesapla(), k = kz.k, yeni = [];
    if (k.sistem === 'rooftop') return { n: 0, rooftop: true };
    for (const { e, r } of kz.sg) {
      if (r.Q < 100) continue; const ccw = M.polyArea(e.pts) > 0;
      if (k.sistem === 'split') {
        const n = Math.max(1, Math.ceil(r.Q / SPLIT[SPLIT.length - 1][1])), Qr = r.Q / n, sec = SPLIT.find(s => s[1] >= Qr) || SPLIT[SPLIT.length - 1], hOda = +e.h || 3, zb = +e.z0 || 0, ins = C._ins, yer = [];
        /* önce dış duvardaki pencerelerin üstü (geniş pencere önce); yetmezse en uzun dış duvar boyunca */
        for (const y of e.yuz || []) { if (y.k !== 'dis') continue; for (const a of y.ac || []) { if (a.kind === 'kapi') continue; const o = C.byId(a.id), hf = o && ins ? ins.hostFrame(o) : null; if (!hf) continue; const c = [hf.sf.a[0] + hf.sf.u[0] * (+o.s || 0), hf.sf.a[1] + hf.sf.u[1] * (+o.s || 0)], sw = ((c[0] - y.a[0]) * (y.b[0] - y.a[0]) + (c[1] - y.a[1]) * (y.b[1] - y.a[1])) / y.L, ust = (+hf.h.z0 || 0) - zb + (+o.par || 0.9) + (+o.hh || a.h || 1.4); /* her zaman pencerenin tam üstü: lento üstü ile tavan altı arasına; yer darsa tavana dayanır */ const tv = (MT.tavanAlt ? MT.tavanAlt(c, zb, hOda) : zb + hOda) - zb, sp = Math.max(0.5, Math.min(y.L - 0.5, sw)); yer.push({ y, s: sp, w: a.w, zm: Math.max(1.7, Math.min(ust + 0.06, tv - 0.33)), pen: true}); } }
        yer.sort((a, b) => b.w - a.w);
        if (yer.length < n) { const ys = (e.yuz || []).filter(y => y.k === 'dis').sort((a, b) => b.L - a.L), y = ys[0] || (e.yuz || []).slice().sort((a, b) => b.L - a.L)[0]; if (!y) continue; const m = n - yer.length; for (let i = 0; i < m; i++) yer.push({ y, s: y.L * (m === 1 ? 0.22 : (i + 0.5) / m), zm: Math.max(1.9, (MT.tavanAlt ? MT.tavanAlt([y.a[0], y.a[1]], zb, hOda) - zb : hOda) - 0.6) }); }
        /* dış ünite: tretuvar varsa üstüne (yalıtım + 25 cm boşluk bırakılarak), yoksa duvar konsoluna */
        const tr = C.doc.ents.find(x => x.type === 'tretuvar'), yalT = (C.doc.ents.find(x => x.type === 'yalitim' && x.kind === 'cephe') || { t: 0 }).t / 100, dOff = tr ? Math.min(Math.max(0.45, (+tr.w || 1) / 2), 0.25 + yalT + 0.2) + 0.0 : 0.35 + yalT;
        for (let i = 0; i < n; i++) { const { y, s, zm, pen } = yer[i], u = [(y.b[0] - y.a[0]) / y.L, (y.b[1] - y.a[1]) / y.L], nn = ccw ? [-u[1], u[0]] : [u[1], -u[0]], w = [y.a[0] + u[0] * s, y.a[1] + u[1] * s], t = (y.t || 0.2); yeni.push({ tip: 'split', model: sec[0], p: [w[0] + nn[0] * 0.12, w[1] + nn[1] * 0.12], ang: Math.atan2(u[1], u[0]), dp: y.k === 'dis' ? [w[0] - nn[0] * (t + dOff), w[1] - nn[1] * (t + dOff)] : null, zm: +zm.toFixed(2), pen: pen ? 1 : 0, Q: Math.round(Qr), Qn: sec[1], mid: e.id, z0: zb, sv2: e.sv != null ? e.sv : null }); }
        continue;
      }
      /* fancoil: adet = yük ve alan (≈ 35 m²/cihaz) */
      const n = Math.max(1, Math.ceil(r.Q / FC[FC.length - 1][1]), Math.ceil(r.A / 35)), Qr = r.Q / n, sec = FC.find(s => s[1] >= Qr) || FC[FC.length - 1];
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; e.pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
      const uzunX = (x1 - x0) >= (y1 - y0), c0 = MT.icNokta(e.pts);
      for (let i = 0; i < n; i++) { let p = uzunX ? [x0 + (x1 - x0) * (i + 0.5) / n, (y0 + y1) / 2] : [(x0 + x1) / 2, y0 + (y1 - y0) * (i + 0.5) / n]; if (!MT.inPoly(p, e.pts)) p = n === 1 ? c0 : [(p[0] + c0[0]) / 2, (p[1] + c0[1]) / 2]; if (!MT.inPoly(p, e.pts)) p = c0; yeni.push({ tip: 'kaset', model: sec[0], p: p.map(v => +v.toFixed(3)), cp: p.map(v => +v.toFixed(3)), Q: Math.round(Qr), Qn: sec[1], Qd: sec[2], hava: sec[3], mid: e.id, z0: +e.z0 || 0, sv2: e.sv != null ? e.sv : null }); }
    }
    if (!yeni.length) return { n: 0 };
    C.undoStack.push(C.snapshot()); const sil = new Set(fcs().concat(sborular()).map(e => e.id)); C.doc.ents = C.doc.ents.filter(e => !sil.has(e.id));
    const chg = C.changed; C.changed = () => { }; try { yeni.forEach((o, i) => { o.no = (o.tip === 'split' ? 'SK' : 'FC') + (i + 1); o.layer = MT._lay('MT_SOGUTMA', 4, 30); o.dis = 'Mekanik'; const sv = o.sv2; delete o.sv2; const x = C.newEnt('mtfc', o); if (sv != null) x.sv2 = sv; else delete x.sv2; C.add(x); }); } finally { C.changed = chg; } C.changed(); C.emit && C.emit('layers');
    return { n: yeni.length, Q: yeni.reduce((s, o) => s + o.Qn, 0), kz };
  };

  /* ---------- soğutma suyu şebekesi, chiller ---------- */
  MT.sogutmaHesap = () => {
    const kz = MT.kazancHesapla(), k = kz.k, U = fcs(); if (!U.length) return { kz, k, yok: true };
    const split = U[0].tip === 'split', Qkur = U.reduce((s, o) => s + o.Qn, 0);
    if (split) return { kz, k, split, U, Qkur, elek: Qkur / 3.4 };
    const kb = { tg: k.td, td: k.tg, boru: k.boru, Rmax: k.Rmax, vmax: k.vmax }, ko = skolon(), root = ko ? ko.p : (() => { let x = 0, y = 0; U.forEach(r => { x += r.p[0]; y += r.p[1]; }); return [x / U.length, y / U.length]; })();
    const zs = [...new Set(U.map(r => +r.z0 || 0))].sort((a, b) => a - b), katlar = [], ek = 1.4;
    for (const z of zs) {
      const lst = U.filter(r => (+r.z0 || 0) === z).map(r => ({ p: r.p, cp: r.cp || r.p, Qn: r.Qn, fc: r })), N = MT._agac(root, lst), zincir = [];
      const yuru = (j, c) => { const pts = [N[j].p, N[c].p]; let u = c; while (N[u].ch.length === 1 && !N[u].rad) { u = N[u].ch[0]; pts.push(N[u].p); } const Lz = pts.reduce((s, p, i) => i ? s + M.dist2(pts[i - 1], p) : 0, 0); if (Lz > 0.02) { const b = MT.boruSec(N[c].Q, kb); zincir.push({ pts, Q: N[c].Q, L: Lz, b, dp: b.R * Lz * 2 * ek, bas: j, son: u }); } else zincir.push({ pts, Q: N[c].Q, L: 0, b: MT.boruSec(N[c].Q, kb), dp: 0, bas: j, son: u, bos: true }); N[u].ch.forEach(x => yuru(u, x)); };
      N[0].ch.forEach(c => yuru(0, c));
      const up = new Map(); zincir.forEach((zc, i) => up.set(zc.son, i));
      const yol = n => { let dp = 0, Lt = 0, u = n; while (u !== 0) { const i = up.get(u); if (i == null) { u = N[u].par; continue; } dp += zincir[i].dp; Lt += zincir[i].L; u = zincir[i].bas; } return { dp, Lt }; };
      katlar.push({ z, N, zincir: zincir.filter(q => !q.bos), rr: N.map((n, i) => n.rad ? Object.assign({ fc: n.rad.fc }, yol(i)) : null).filter(Boolean), Q: N[0].Q });
    }
    const Qch0 = Math.max(kz.Qblok, Qkur * 0.85) / 1000, chKW = CHILLER.find(x => x >= Qch0) || CHILLER[CHILLER.length - 1], ana = MT.boruSec(Qkur, kb), dpAna = ana.R * k.chL * 2 * ek; let dpK = 0; const kol = [];
    katlar.forEach((kt, i) => { if (i === 0) { kt.dpKolon = 0; return; } const Qs = katlar.slice(i).reduce((s, x) => s + x.Q, 0), Lk = kt.z - katlar[i - 1].z, b = MT.boruSec(Qs, kb), dp = b.R * Lk * 2 * ek; dpK += dp; kol.push({ z0: katlar[i - 1].z, z1: kt.z, L: Lk, Q: Qs, b, dp }); kt.dpKolon = dpK; });
    let krit = null; katlar.forEach(kt => kt.rr.forEach(x => { x.dpTop = x.dp + kt.dpKolon + dpAna + 25000 + 40000; if (!krit || x.dpTop > krit.dpTop) krit = Object.assign({ kat: kt }, x); }));
    const debi = ana.deb / 1000, Hm = krit.dpTop * 1.1 / 9810, pompa = MT.pompaSec ? MT.pompaSec(debi, Hm) : { ad: '—' }, Vsis = chKW * 3, tampon = Math.max(0, Math.ceil((chKW * 6 - Vsis) / 50) * 50);
    return { kz, k, kb, U, Qkur, katlar, kol, ana, dpAna, krit, chKW, Qch0, debi, Hm, pompa, tampon, elek: chKW / 3.0, root };
  };
  MT.sogBoruCiz = () => {
    const h = MT.sogutmaHesap(); if (h.yok || h.split) return h;
    C.undoStack.push(C.snapshot()); const sil = new Set(sborular().map(e => e.id)); C.doc.ents = C.doc.ents.filter(e => !sil.has(e.id)); const chg = C.changed; C.changed = () => { }; let n = 0;
    try { for (const kt of h.katlar) { const f0 = h.U.find(q => (+q.z0 || 0) === kt.z), sv = f0 ? f0.sv2 : null; for (const z of kt.zincir) { const x = C.newEnt('mtboru', { layer: MT._lay('MT_SOGUTMA', 4, 30), dis: 'Mekanik', sys: 'sog', pts: z.pts.map(p => [+p[0].toFixed(3), +p[1].toFixed(3)]), z0: kt.z, dn: z.b.dn, Q: Math.round(z.Q), deb: Math.round(z.b.deb), v: +z.b.v.toFixed(2), R: Math.round(z.b.R) }); if (sv != null) x.sv2 = sv; else delete x.sv2; C.add(x); n++; } }
      if (!skolon()) C.add(C.newEnt('mtkolon', { layer: MT._lay('MT_SOGUTMA', 4, 30), dis: 'Mekanik', sys: 'sog', p: h.root.map(v => +v.toFixed(3)), no: 'SK1' })); } finally { C.changed = chg; }
    C.changed(); return Object.assign(h, { nBoru: n });
  };
  /* split klima kolon şeması: iç ünite (duvar, +2,20) önden görünüşü, dış duvar, dış ünite, gaz / sıvı bakır boruları, yoğuşma drenajı; 1 m = 20 mm */
  const bakir = W => W <= 3000 ? ['1/4"', '3/8"'] : W <= 5500 ? ['1/4"', '1/2"'] : W <= 7500 ? ['3/8"', '5/8"'] : ['3/8"', '3/4"'];
  const splitSema = h => { const g = { L: [], T: [] }, Ln = (a, b, c, d, s) => g.L.push([a, b, c, d, s || 'i']), Tx = (x, y, hh, s, al, rot, col) => g.T.push([x, y, hh, s, al || 'L', rot || 0, col || 7]);
    const VIT = MT.VIT, Lv = (a, b, c, d) => Ln(Math.round(a * 100) / 100, Math.round(b * 100) / 100, Math.round(c * 100) / 100, Math.round(d * 100) / 100, 'v');
    const cihazCiz = (t, x, y, w, hh) => { if (!(VIT && VIT.cihaz(Lv, t, x, y, w, hh))) { Ln(x - w / 2, y, x + w / 2, y, 'r'); Ln(x + w / 2, y, x + w / 2, y + hh, 'r'); Ln(x + w / 2, y + hh, x - w / 2, y + hh, 'r'); Ln(x - w / 2, y + hh, x - w / 2, y, 'r'); } };
    const vanaCiz = (x, y, dikey, termo) => { if (VIT) VIT.vana(Lv, x, y, 1.1, dikey, termo); };
    const S = 20, katH = 92, sw = 70, m = MT.set(), all = MT.mahaller(), zs = [...new Set(h.U.map(u => +u.z0 || 0))].sort((a, b) => a - b); let W = 0; zs.forEach(z => { W = Math.max(W, h.U.filter(u => (+u.z0 || 0) === z).length * sw + 6); });
    zs.forEach((z, i) => { const y = i * katH, yZ = y + 8, yT = yZ + 3 * S, kt2 = Object.values(m.katlar || {}).find(q => Math.abs((q.z || 0) - z) < 1e-6), U = h.U.filter(u => (+u.z0 || 0) === z);
      Ln(-30, yZ, W, yZ, 'k'); Tx(-30, yZ + 1.5, 2.2, `${kt2 ? kt2.ad + '  ' : ''}ZEMİN ${z >= 0 ? '+' : ''}${f(z, 2)}`, 'L', 0, 8); Ln(-30, yT, W, yT, 'k'); Tx(-30, yT + 1.5, 2.2, 'TAVAN', 'L', 0, 8);
      U.forEach((u, j) => { const x0 = j * sw, xi = x0 + 16, wi = 0.9 * S, hi = 0.3 * S, yi = yZ + 2.2 * S, xd = x0 + 40, xo = x0 + 56, wo = 0.8 * S, ho = 0.6 * S, yo = yZ + 0.1 * S, mh = all.find(q => q.id === u.mid), mAd = mh ? `${mh.no || ''} ${mh.ad || ''}`.trim() : (MT._mhAd ? MT._mhAd(u.mid) : ''), cap = bakir(u.Qn || 0);
        cihazCiz('split', xi, yi, wi, hi); Ln(xd, yZ - 4, xd, yT + 4, 'k'); Ln(xd + 1.2, yZ - 4, xd + 1.2, yT + 4, 'k'); Tx(xd + 0.6, yT + 6, 1.6, 'DIŞ DUVAR', 'MC', 0, 8); cihazCiz('dis', xo, yo, wo, ho);
        const yg = yi + hi * 0.7, ys = yi + hi * 0.45, xa = xi + wi / 2, xb = xo - wo / 2 + wo * 0.12; /* gaz (kalın) + sıvı (ince) hattı: iç üniteden duvardan geçip dış ünitenin servis vanalarına */
        Ln(xa, yg, xd + 4.5, yg, 's'); Ln(xd + 4.5, yg, xd + 4.5, yo + ho * 0.75, 's'); Ln(xd + 4.5, yo + ho * 0.75, xb, yo + ho * 0.75, 's'); Ln(xa, ys, xd + 3, ys, 'f'); Ln(xd + 3, ys, xd + 3, yo + ho * 0.55, 'f'); Ln(xd + 3, yo + ho * 0.55, xb, yo + ho * 0.55, 'f'); vanaCiz(xd + 7, yo + ho * 0.75, false, false); vanaCiz(xd + 7, yo + ho * 0.55, false, false);
        Ln(xi - wi / 2 + 2, yi, xi - wi / 2 + 2, yZ + 0.6 * S, 'x'); Ln(xi - wi / 2 + 2, yZ + 0.6 * S, xi - wi / 2 - 2, yZ + 0.6 * S, 'x'); Tx(xi - wi / 2 + 3.4, yZ + 1.4 * S, 1.6, 'yoğuşma Ø20 → süzgeç', 'MC', Math.PI / 2, 6);
        Tx(xi, yi + hi + 9.5, 2.2, (mAd ? `${u.no || ''} · ${mAd}` : u.no || '').slice(0, 28), 'MC', 0, 2); Tx(xi, yi + hi + 6, 2, `${u.model || ''} · ${f((u.Qn || 0) / 1000, 1)} kW`, 'MC'); Tx(xi, yi + hi + 2.6, 1.7, 'duvar tipi iç ünite +2,20', 'MC', 0, 8);
        Tx((xa + xd) / 2, yg + 1.6, 1.6, `Ø${cap[1]} gaz`, 'MC', 0, 4); Tx((xa + xd) / 2, ys - 1.8, 1.6, `Ø${cap[0]} sıvı`, 'MC', 0, 4); Tx(xo - wo / 2 + 1, yo + ho + 2.6, 1.8, `DIŞ ÜNİTE · ${f((u.Qn || 0) / 3400, 2)} kW elk.`, 'L', 0, 2); Tx(xo - wo / 2 + 1, yo + ho + 6, 1.6, 'bakır boru, kauçuk izoleli', 'L', 0, 8); });
    });
    const nk = zs.length; Tx(-30, nk * katH + 8, 4, 'SOĞUTMA TESİSATI KOLON ŞEMASI (SPLİT KLİMA)', 'L', 0, 2); Tx(-30, nk * katH + 2.5, 2.2, `${h.U.length} iç ünite · kurulu soğutma gücü ${f(h.Qkur / 1000, 1)} kW · yaklaşık elektrik gücü ${f(h.elek / 1000, 1)} kW (EER ≈ 3,4)`, 'L');
    Ln(-30, -10, -18, -10, 's'); Tx(-16, -11, 2.2, 'gaz hattı', 'L'); Ln(6, -10, 18, -10, 'f'); Tx(20, -11, 2.2, 'sıvı hattı', 'L'); Ln(40, -10, 52, -10, 'x'); Tx(54, -11, 2.2, 'yoğuşma drenajı', 'L');
    return g; };
  MT.sogutmaSemasi = (h) => {
    h = h || MT.sogutmaHesap(); if (h.yok) return null; if (h.split) return splitSema(h); const g = { L: [], T: [] }, Ln = (a, b, c, d, s) => g.L.push([a, b, c, d, s]), Tx = (x, y, hh, s, al, rot, col) => g.T.push([x, y, hh, s, al || 'L', rot || 0, col || 7]);
    const VIT = MT.VIT, Lv = (a, b, c, d) => Ln(Math.round(a * 100) / 100, Math.round(b * 100) / 100, Math.round(c * 100) / 100, Math.round(d * 100) / 100, 'v');
    const cihazCiz = (t, x, y, w, hh) => { if (!(VIT && VIT.cihaz(Lv, t, x, y, w, hh))) { Ln(x - w / 2, y, x + w / 2, y, 'r'); Ln(x + w / 2, y, x + w / 2, y + hh, 'r'); Ln(x + w / 2, y + hh, x - w / 2, y + hh, 'r'); Ln(x - w / 2, y + hh, x - w / 2, y, 'r'); } };
    const vanaCiz = (x, y, dikey, termo) => { if (VIT) VIT.vana(Lv, x, y, 1.1, dikey, termo); };
    const m = MT.set(), all = MT.mahaller(), katH = 44, rw = 20, gap = 12, nk = h.katlar.length;
    Ln(-58, -32, -24, -32, 'k'); Ln(-58, -8, -24, -8, 'k'); Ln(-58, -32, -58, -8, 'k'); Ln(-24, -32, -24, -8, 'k'); Tx(-41, -16, 3, 'CHILLER', 'MC'); Tx(-41, -21, 2.2, `${fi(h.chKW)} kW · ${h.k.tg}/${h.k.td} °C`, 'MC'); Tx(-41, -26, 2, 'hava soğutmalı', 'MC'); Tx(-41, -37, 2.2, `Pompa ${h.pompa.ad}: ${f(h.debi, 2)} m³/h · ${f(h.Hm, 1)} mSS`, 'MC'); Tx(-41, -41.5, 2.2, h.tampon ? `Tampon tank ${h.tampon} l` : 'Tampon tank gerekmez', 'MC');
    Ln(-24, -12, 0, -12, 's'); Ln(-24, -28, 4, -28, 'x'); Ln(0, -12, 0, 0, 's'); Ln(4, -28, 4, 0, 'x'); Tx(-12, -10, 2.2, h.ana.dn, 'MC');
    h.katlar.forEach((kt, i) => {
      const y = i * katH, kt2 = Object.values(m.katlar || {}).find(q => Math.abs((q.z || 0) - kt.z) < 1e-6), sira = kt.rr.slice().sort((a, b) => a.Lt - b.Lt), wid = 14 + sira.length * (rw + gap);
      if (i < nk - 1) { Ln(0, y, 0, y + katH, 's'); Ln(4, y, 4, y + katH, 'x'); Tx(-2, y + katH * 0.55, 2.2, h.kol[i].b.dn, 'MC', Math.PI / 2); }
      Ln(0, y + 8, wid - gap, y + 8, 's'); Ln(4, y + 4, wid - gap + 4, y + 4, 'x'); Ln(-60, y - 2, wid + 6, y - 2, 'i'); Tx(-60, y, 2.5, `${kt2 ? kt2.ad : 'Kat'}  ${kt.z >= 0 ? '+' : ''}${f(kt.z, 2)}`, 'L', 0, 2); Tx(-60, y + 4.5, 2.2, `ΣQ = ${f(kt.Q / 1000, 1)} kW`, 'L');
      sira.forEach((x, j) => { const r = x.fc, cx = 14 + j * (rw + gap) + rw / 2, mh = all.find(q => q.id === r.mid); cihazCiz('kaset', cx, y + 15.5, rw, 13); Ln(cx - rw / 2 + 2, y + 8, cx - rw / 2 + 2, y + 15.5, 's'); Ln(cx + rw / 2 - 2, y + 4, cx + rw / 2 - 2, y + 15.5, 'x'); vanaCiz(cx - rw / 2 + 2, y + 12, true, false); vanaCiz(cx + rw / 2 - 2, y + 10.5, true, false); /* kaset fancoil önden görünüşü + vanalar */ Tx(cx, y + 34, 2.2, `${r.no} · ${mh ? mh.no : ''}`, 'MC', 0, 2); Tx(cx, y + 30.5, 2, r.model, 'MC'); Tx(cx, y + 37.5, 2.2, `${f(r.Qn / 1000, 1)} kW`, 'MC'); Tx(cx, y + 11.5, 1.8, MT.boruSec(r.Qn, h.kb).dn, 'MC'); });
    });
    Tx(-60, nk * katH + 8, 4, 'SOĞUTMA TESİSATI KOLON ŞEMASI', 'L', 0, 2); Tx(-60, nk * katH + 2.5, 2.2, `Soğutulmuş su ${h.k.tg}/${h.k.td} °C · ${h.U.length} fancoil · kurulu ${f(h.Qkur / 1000, 1)} kW · eş zamanlı yük ${f(h.kz.Qblok / 1000, 1)} kW · kritik devre ΔP = ${f(h.krit.dpTop / 1000, 1)} kPa`, 'L');
    Ln(-60, -48, -48, -48, 's'); Tx(-46, -49, 2.2, 'gidiş', 'L'); Ln(-30, -48, -18, -48, 'x'); Tx(-16, -49, 2.2, 'dönüş', 'L');
    return g;
  };

  /* ---------- rapor ---------- */
  const K6 = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'], MUT = '#898781', GRID = '#e1e0d9', AX = '#c3c2b7', INK = '#0b0b0b', INK2 = '#52514e';
  const sv = (w, h, b) => `<svg class="ch" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Arial, sans-serif" font-size="11">${b}</svg>`;
  const nice = v => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return ([1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find(q => n <= q + 1e-9) || 10) * p; };
  const eksen = (x0, x1, y0, y1, mx, birim, xs, xf) => { let s = ''; for (let i = 0; i <= 4; i++) { const y = y0 - (y0 - y1) * i / 4; s += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${i ? GRID : AX}"/><text x="${x0 - 6}" y="${y + 4}" text-anchor="end" fill="${MUT}">${fi(mx * i / 4)}</text>`; } xs.forEach((v, i) => { s += `<text x="${xf(i)}" y="${y0 + 14}" text-anchor="middle" fill="${MUT}">${v}</text>`; }); return s + `<text x="${x0 - 6}" y="${y1 - 10}" text-anchor="end" fill="${MUT}">${birim}</text>`; };
  const isinimGrafik = k => {
    const W = 700, H = 250, x0 = 60, x1 = 600, y0 = 190, y1 = 26, ser = [['Güney', 'G', 0], ['Doğu', 'D', 0], ['Batı', 'B', 0], ['Kuzey', 'K', 0], ['Yatay (çatı)', 'G', 1]], dat = ser.map(s => SAAT.map(t => MT.gunes(k.enlem, t, YONAZ[s[1]], s[2]).I)), mx = nice(Math.max(...dat.flat()) * 1.05), X = i => x0 + (x1 - x0) * i / (SAAT.length - 1), Y = v => y0 - (y0 - y1) * v / mx;
    let b = eksen(x0, x1, y0, y1, mx, 'W/m²', SAAT, X); dat.forEach((d, j) => { b += `<polyline points="${d.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}" fill="none" stroke="${K6[j]}" stroke-width="2"/>`; const im = d.indexOf(Math.max(...d)); b += `<circle cx="${X(im)}" cy="${Y(d[im])}" r="4" fill="${K6[j]}" stroke="#fcfcfb" stroke-width="2"><title>${ser[j][0]}: en çok ${fi(d[im])} W/m², saat ${SAAT[im]}</title></circle><text x="${X(im)}" y="${Y(d[im]) - 8}" text-anchor="middle" fill="${INK}">${ser[j][0]}</text>`; });
    b += ser.map((s, j) => `<rect x="${x0 + j * 110}" y="${H - 16}" width="10" height="10" rx="2" fill="${K6[j]}"/><text x="${x0 + j * 110 + 15}" y="${H - 7}" fill="${INK2}">${s[0]}</text>`).join('') + `<text x="${x1 + 22}" y="${y0 + 14}" fill="${MUT}">güneş saati</text>`;
    return `<figure><figcaption>Tasarım günü (21 Temmuz, ${f(k.enlem, 1)}° K enlemi) — yüzeylere gelen toplam güneş ışınımı</figcaption>${sv(W, H, b)}</figure>`;
  };
  const blokGrafik = kz => {
    const W = 700, H = 250, x0 = 60, x1 = 660, y0 = 190, y1 = 26, mx = nice(Math.max(...kz.blok.map(o => o.top)) * 1.05 / 1000), bw = (x1 - x0) / SAAT.length; let b = eksen(x0, x1, y0, y1, mx, 'kW', SAAT, i => x0 + bw * (i + 0.5));
    kz.blok.forEach((o, i) => { const hh = (y0 - y1) * o.top / 1000 / mx, x = x0 + bw * i + bw * 0.2, w = bw * 0.6, tp = o === kz.tepe; b += `<path d="M${x} ${y0}v-${Math.max(0, hh - 4)}a4 4 0 0 1 4 -4h${w - 8}a4 4 0 0 1 4 4v${Math.max(0, hh - 4)}z" fill="${tp ? '#184f95' : K6[0]}"><title>Saat ${o.t}: ${f(o.top / 1000, 1)} kW</title></path>`; if (tp) b += `<text x="${x + w / 2}" y="${y0 - hh - 6}" text-anchor="middle" fill="${INK}" font-weight="600">${f(o.top / 1000, 1)} kW</text>`; });
    return `<figure><figcaption>Bina eş zamanlı soğutma yükünün gün içindeki değişimi — tepe saat ${kz.tepe.t}:00</figcaption>${sv(W, H, b + `<text x="${x1}" y="${H - 8}" text-anchor="end" fill="${MUT}">güneş saati · koyu çubuk: tepe yük</text>`)}</figure>`;
  };
  const yatay = (rows, birim, baslik) => { rows = rows.filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]); const W = 700, rh = 26, x0 = 230, x1 = 560, H = rows.length * rh + 12, mx = Math.max(...rows.map(r => r[1])) || 1, top = rows.reduce((s, r) => s + r[1], 0) || 1; let b = `<line x1="${x0}" y1="2" x2="${x0}" y2="${H - 4}" stroke="${AX}"/>`; rows.forEach((r, i) => { const y = 6 + i * rh, w = Math.max(5, (x1 - x0) * r[1] / mx); b += `<text x="${x0 - 8}" y="${y + 14}" text-anchor="end" fill="${INK}">${esc(r[0])}</text><path d="M${x0} ${y + 3}h${w - 4}a4 4 0 0 1 4 4v6a4 4 0 0 1 -4 4h-${w - 4}z" fill="${K6[0]}"><title>${esc(r[0])}: ${fi(r[1])} ${birim}</title></path><text x="${x0 + w + 8}" y="${y + 14}" fill="${INK}">${fi(r[1])} ${birim} · %${f(100 * r[1] / top, 0)}</text>`; }); return `<figure><figcaption>${esc(baslik)}</figcaption>${sv(W, H, b)}</figure>`; };
  MT.raporEk = MT.raporEk || [];
  MT.raporEk.push(() => {
    const kz = MT.kazancHesapla(); if (!kz.sg.length) return ''; const k = kz.k, m = kz.m, t = kz.tepe, wo = kz.sg[0].r.wo, wi = kz.sg[0].r.wi, h = MT.sogutmaHesap();
    let s = `<h2>9. Isı kazancı (soğutma yükü) hesabı</h2><div class="kart"><div><b>${f(kz.Qblok / 1000, 1)} kW</b><span>Bina eş zamanlı yükü (saat ${t.t}:00)</span></div><div><b>${f(kz.Qtoplam / 1000, 1)} kW</b><span>Mahal tepe yükleri toplamı</span></div><div><b>${f(kz.A ? kz.Qblok / kz.A : 0, 0)} W/m²</b><span>${f(kz.A, 0)} m² soğutulan alan</span></div><div><b>${f(kz.Qblok / 3517, 1)} RT</b><span>Soğutma tonu (${fi(kz.Qblok * 3.412)} BTU/h)</span></div></div>
<table><tr><th>Dış tasarım</th><td>${f(k.tdb, 0)} °C KT / ${f(k.twb, 0)} °C YT · günlük fark ${f(k.dr, 0)} K · ${f(wo, 1)} g/kg</td><th>İç tasarım</th><td>${f(k.ti, 0)} °C · %${k.rh} bağıl nem · ${f(wi, 1)} g/kg</td></tr><tr><th>Enlem / tasarım günü</th><td>${f(k.enlem, 1)}° K · 21 Temmuz</td><th>Taze hava</th><td>${k.tazeKisi} m³/h·kişi (en az ${f(k.tazeAch, 1)} hacim/h)</td></tr><tr><th>İç gölgeleme katsayısı</th><td>${f(k.golge, 2)} (perde / jaluzi)</td><th>Emniyet payı</th><td>%${k.emniyet}</td></tr></table>
<p class="mut">Yöntem: saatlik hesap (6:00–20:00). Opak yüzeyler güneş-hava sıcaklığı ile, duvarda 7 saat gecikme ve 0,35 sönüm, çatıda 5 saat ve 0,45; cam güneş kazancı Q = A·0,8·0,9·g·f<sub>gölge</sub>·I (son dört saatin ağırlıklı ortalaması ile ısıl depolama); insan 75 W duyulur + 55 W gizli; taze hava duyulur 0,335·V̇·Δt, gizli 0,834·V̇·Δw. Kullanım 8:00–18:00.</p>
${isinimGrafik(k)}${blokGrafik(kz)}${yatay([['Cam — güneş', t.camG], ['Cam — iletim', t.camI], ['Dış duvarlar', t.duvar], ['Çatı', t.cati], ['İç bölmeler', t.ic], ['İnsanlar (duyulur)', t.insan], ['Aydınlatma', t.ayd], ['Cihazlar', t.cih], ['Taze hava (duyulur)', t.tazeD], ['Gizli ısı (insan + taze hava)', t.gizli]], 'W', `Tepe saatte (${t.t}:00) bina yükünün bileşenleri — emniyet payı hariç`)}
<table><tr><th>No</th><th>Mahal</th><th class="n">Alan</th><th class="n">Kişi</th><th class="n">Duvar+çatı</th><th class="n">Cam</th><th class="n">İç yükler</th><th class="n">Taze hava</th><th class="n">Gizli</th><th class="n">Toplam (W)</th><th class="n">W/m²</th><th class="n">Tepe</th></tr>${kz.res.map(({ e, r }) => r.sog ? `<tr><td>${esc(e.no)}</td><td>${esc(e.ad)}</td><td class="n">${f(r.A, 1)}</td><td class="n">${r.u.kisi}</td><td class="n">${fi(Math.max(0, r.tepe.duvar) + Math.max(0, r.tepe.cati) + r.tepe.ic)}</td><td class="n">${fi(r.tepe.camG + r.tepe.camI)}</td><td class="n">${fi(r.tepe.insan + r.tepe.ayd + r.tepe.cih)}</td><td class="n">${fi(r.tepe.tazeD)}</td><td class="n">${fi(r.tepe.gizli)}</td><td class="n"><b>${fi(r.Q)}</b></td><td class="n">${f(r.qA, 0)}</td><td class="n">${r.tepe.t}:00</td></tr>` : `<tr><td>${esc(e.no)}</td><td>${esc(e.ad)}</td><td class="n">${f(r.A, 1)}</td><td colspan="9" class="mut">soğutulmuyor</td></tr>`).join('')}<tr class="top"><td colspan="9">Mahal tepe yükleri toplamı / bina eş zamanlı yükü</td><td class="n">${fi(kz.Qtoplam)}</td><td colspan="2" class="n">${fi(kz.Qblok)} W</td></tr></table>`;
    const katlar = [...new Set(kz.res.map(x => +x.e.z0 || 0))].sort((a, b) => a - b), qG = nice(Math.max(1, ...kz.sg.map(x => x.r.qA)));
    if (MT._grafik && MT._grafik.planGrafik) for (const z of katlar) { const rs = kz.res.filter(x => (+x.e.z0 || 0) === z).map(x => ({ e: x.e, r: { ti: x.r.sog ? k.ti : null, Q: x.r.Q || 0, qA: x.r.qA || 0, A: x.r.A, items: [] } })); if (rs.some(x => x.r.ti != null)) s += MT._grafik.planGrafik(rs, `Kot ${f(z, 2)} — soğutma yükü yoğunluğu (W/m²)`, m, qG); }
    if (!h.yok) {
      s += `<h2>10. Soğutma tesisatı</h2>`;
      if (h.split) s += `<p>Sistem: split klima. ${h.U.length} iç ünite, kurulu soğutma gücü ${f(h.Qkur / 1000, 1)} kW, yaklaşık elektrik gücü ${f(h.elek / 1000, 1)} kW (EER ≈ 3,4).</p>`;
      else s += `<div class="kart"><div><b>${fi(h.chKW)} kW</b><span>Hava soğutmalı chiller (${f(h.chKW / 3.517, 0)} RT)</span></div><div><b>${f(h.debi, 2)} m³/h</b><span>Soğutulmuş su debisi ${k.tg}/${k.td} °C</span></div><div><b>${h.pompa.ad} · ${f(h.Hm, 1)} mSS</b><span>Sirkülasyon pompası</span></div><div><b>${h.tampon ? h.tampon + ' l' : '—'}</b><span>Tampon tank${h.tampon ? '' : ' gerekmez'}</span></div></div><p class="mut">Chiller: eş zamanlı yük ile kurulu fancoil gücünün %85'inden büyük olanı, standart kademeye yuvarlanır (elektrik ≈ ${f(h.elek, 0)} kW, EER ≈ 3,0). Kritik devre: boru kayıpları (yerel kayıplar %40) + fancoil 25 kPa + chiller evaporatörü 40 kPa = ${f(h.krit.dpTop / 1000, 1)} kPa. Tampon tank: sistemde en az 6 l/kW su hacmi.</p>`;
      s += `<table><tr><th>No</th><th>Mahal</th><th>Cihaz</th><th class="n">Gereken (W)</th><th class="n">Seçilen (W)</th>${h.split ? '' : '<th class="n">Duyulur (W)</th><th class="n">Hava (m³/h)</th><th class="n">Su (l/h)</th><th class="n">Bağlantı</th>'}</tr>${h.U.map(u => { const mh = MT.mahaller().find(q => q.id === u.mid) || {}; return `<tr><td>${u.no}</td><td>${esc((mh.no || '') + ' ' + (mh.ad || ''))}</td><td>${u.tip === 'split' ? 'Split klima ' : 'Kaset fancoil '}${esc(u.model)}</td><td class="n">${fi(u.Q)}</td><td class="n">${fi(u.Qn)}</td>${h.split ? '' : `<td class="n">${fi(u.Qd)}</td><td class="n">${fi(u.hava)}</td><td class="n">${fi(MT.boruSec(u.Qn, h.kb).deb)}</td><td class="n">${MT.boruSec(u.Qn, h.kb).dn}</td>`}</tr>`; }).join('')}</table>`;
      if (!h.split) s += `<table><tr><th>Kat</th><th>Parça</th><th class="n">Q (kW)</th><th class="n">Debi (l/h)</th><th>Çap</th><th class="n">v (m/s)</th><th class="n">R (Pa/m)</th><th class="n">Boy (m)</th><th class="n">ΔP (Pa)</th></tr><tr><td>Chiller</td><td>Chiller – kolon</td><td class="n">${f(h.Qkur / 1000, 1)}</td><td class="n">${fi(h.ana.deb)}</td><td>${h.ana.dn}</td><td class="n">${f(h.ana.v, 2)}</td><td class="n">${fi(h.ana.R)}</td><td class="n">${f(k.chL, 1)}</td><td class="n">${fi(h.dpAna)}</td></tr>${h.kol.map(c => `<tr><td>Kolon</td><td>${f(c.z0, 2)} → ${f(c.z1, 2)}</td><td class="n">${f(c.Q / 1000, 1)}</td><td class="n">${fi(c.b.deb)}</td><td>${c.b.dn}</td><td class="n">${f(c.b.v, 2)}</td><td class="n">${fi(c.b.R)}</td><td class="n">${f(c.L, 2)}</td><td class="n">${fi(c.dp)}</td></tr>`).join('')}${h.katlar.map(kt => kt.zincir.map((z, i) => `<tr><td>kot ${f(kt.z, 2)}</td><td>${i + 1}</td><td class="n">${f(z.Q / 1000, 1)}</td><td class="n">${fi(z.b.deb)}</td><td>${z.b.dn}</td><td class="n">${f(z.b.v, 2)}</td><td class="n">${fi(z.b.R)}</td><td class="n">${f(z.L, 2)}</td><td class="n">${fi(z.dp)}</td></tr>`).join('')).join('')}</table>`;
    }
    s += `<div class="not">Isı kazancı basitleştirilmiş saatlik yöntemle hesaplanmıştır; HAP gibi ısıl kütleyi ayrıntılı modelleyen programlarla birkaç yüzde fark edebilir. Yaz tasarım sıcaklıkları, kişi sayısı, aydınlatma ve cihaz yükleri başlangıç kabulleridir, proje verisiyle güncellenmelidir. Fancoil ve chiller kapasiteleri tipik katalog kademeleridir. Yoğuşma suyu (drenaj) hattı ve taze hava santrali bu aşamada çizilmemektedir.</div>`;
    return s;
  });

  /* ---------- komutlar ---------- */
  if (C.addCommand) {
    C.addCommand(['ISIKAZANCI', 'SOGUTMAYUKU'], 'Isı kazancı (soğutma yükü) hesabı: mahal tepe yükleri ve bina eş zamanlı yükü.', async () => { const kz = MT.kazancHesapla(); if (!kz.sg.length) { C.warn('Soğutulan mahal yok: önce MAHALBUL; soğutulacak mahalleri Tesisat paneli › Soğutma sekmesinde işaretleyin.'); return; } C.log(`Isı kazancı: ${kz.sg.length} mahal · eş zamanlı yük ${f(kz.Qblok / 1000, 1)} kW (saat ${kz.tepe.t}:00) · mahal tepe toplamı ${f(kz.Qtoplam / 1000, 1)} kW · ${f(kz.A ? kz.Qblok / kz.A : 0, 0)} W/m².`); });
    C.addCommand(['FANCOILYERLESTIR', 'KLIMAYERLESTIR'], 'Isı kazancına göre fancoil (ya da split klima iç ünitesi) seçer ve mahallere yerleştirir.', async () => { const r = MT.fcYerlestir(); if (r.rooftop) { C.log('Seçili sistem rooftop: ROOFTOP komutunu kullanın.'); return; } if (!r.n) { C.warn('Cihaz yerleştirilemedi: soğutulan mahal yok.'); return; } C.log(`${r.n} cihaz yerleştirildi (${f(r.Q / 1000, 1)} kW).`); });
    C.addCommand(['SOGUTMAKOLON'], 'Soğutma suyu kolonunun plandaki yerini seçin.', async (I) => { const p = await I.pt('Soğutma kolonu yeri'); if (!p || typeof p === 'string') return; C.undoStack.push(C.snapshot()); const o = skolon(); if (o) { o.p = [p[0], p[1]]; delete o._c; C.changed(); } else C.add(C.newEnt('mtkolon', { layer: MT._lay('MT_SOGUTMA', 4, 30), dis: 'Mekanik', sys: 'sog', p: [p[0], p[1]], no: 'SK1' })); if (sborular().length) MT.sogBoruCiz(); });
    C.addCommand(['SOGUTMABORU'], 'Soğutulmuş su gidiş-dönüş borularını çizer ve çaplandırır (fancoil sistemi).', async () => { const h = MT.sogBoruCiz(); if (h.yok) { C.warn('Önce cihazları yerleştirin (FANCOILYERLESTIR).'); return; } if (h.split) { C.log('Split sistemde su borusu yoktur; soğutucu akışkan hatları iç–dış ünite arasında gösterilir.'); return; } C.log(`Soğutma boruları: ${h.nBoru} parça · chiller ${h.chKW} kW · pompa ${f(h.debi, 2)} m³/h, ${f(h.Hm, 1)} mSS.`); });
    C.addCommand(['SOGUTMASEMASI'], 'Soğutma tesisatı kolon şeması (fancoil: chiller, pompa, katlar, çaplar · split klima: iç / dış ünite, bakır borular, yoğuşma drenajı).', async (I) => { const g = MT.sogutmaSemasi(); if (!g) { C.warn('Önce cihazları yerleştirin (FANCOILYERLESTIR).'); return; } const p = await I.pt('Şemanın yeri (sol alt)'); if (!p || typeof p === 'string') return; C.undoStack.push(C.snapshot()); C.doc.ents = C.doc.ents.filter(e => !(e.type === 'mtsema' && e.tur === 'sog')); C.add(C.newEnt('mtsema', { layer: MT._lay('MT_KOLON_SEMASI', 7, 25), dis: 'Mekanik', p: M.p3(p), g, tur: 'sog' })); });
    C.addCommand(['SOGUTMA', 'SOGUTMATESISATI'], 'Soğutma tesisatı (tek adım): ısı kazancı → cihaz seçimi ve yerleşimi → kolon yeri → soğutma suyu boruları.', async (I) => { const r = MT.fcYerlestir(); if (r.rooftop) { await C.cmd.run('ROOFTOP'); return; } if (!r.n) { C.warn('Soğutulan mahal yok: önce MAHALBUL.'); return; } if (MT.sog().sistem !== 'split' && !skolon()) { const p = await I.pt('Soğutma kolonu yeri (Enter = cihazların ortası)'); if (p && typeof p !== 'string') C.add(C.newEnt('mtkolon', { layer: MT._lay('MT_SOGUTMA', 4, 30), dis: 'Mekanik', sys: 'sog', p: [p[0], p[1]], no: 'SK1' })); } const h = MT.sogBoruCiz(); C.log(h.split ? `Soğutma: ${r.n} split klima, ${f(r.Q / 1000, 1)} kW.` : `Soğutma: ${r.n} fancoil, ${h.nBoru} boru parçası · chiller ${h.chKW} kW · pompa ${f(h.debi, 2)} m³/h, ${f(h.Hm, 1)} mSS. Şema için SOGUTMASEMASI.`); });
    C.addCommand(['SOGUTMASIL'], 'Fancoil / klima üniteleri, soğutma boruları, soğutma kolonu ve şemasını siler.', async () => { const l = C.doc.ents.filter(e => e.type === 'mtfc' || ((e.type === 'mtboru' || e.type === 'mtkolon') && e.sys === 'sog') || (e.type === 'mtsema' && e.tur === 'sog')); if (!l.length) return; C.undoStack.push(C.snapshot()); C.remove(l); C.log(`${l.length} soğutma nesnesi silindi.`); });
  }
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : (globalThis.C = globalThis.C || {}));

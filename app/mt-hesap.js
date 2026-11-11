/* ArıtmaCAD — MEKANİK TESİSAT · HESAP ÇEKİRDEĞİ
   1) Yapı elemanı U değeri (TS EN ISO 6946): U = 1 / (Rsi + Σ d/λ + Rse)
   2) Yoğuşma denetimi (Glaser / TS EN ISO 13788 aylık yöntem, tek yoğuşma düzlemi): ara yüzey sıcaklıkları, doyma basıncı, buhar basıncı,
      aylık yoğuşan / buharlaşan su miktarı; koşul: birikim ≤ 1,0 kg/m² ve yaz aylarında tamamen kurur.
   3) TS 825 bina hesabı: özgül ısı kaybı H = Hilet + Hhav, aylık denge ile yıllık net ısıtma enerjisi, TS 825:2024 tavsiye U değerleri ile karşılaştırma.
   4) Mahal ısı kaybı (TS 2164 / MMO Kalorifer Tesisatı): Q = Q0·(1 + ZD + ZH) + Qs ;  Q0 = Σ U·A·Δt ;  Qs = Σ(a·l)·R·H·Δt·Ze
   Mahal sonuç özeti e.sonuc içinde saklanır (plandaki etikette Q yazılır). */
(function (C) {
  'use strict';
  const M = C.M, V = C.MTV, MT = C.MT;
  const CORE = { beton: 'beton', tugla: 'tugla', gazbeton: 'gazbeton', briket: 'briket' };
  const TURAD = { dduvar: 'Dış duvar', iduvar: 'İç duvar', taban: 'Taban', tavan: 'Tavan / çatı', aradoseme: 'Ara döşeme', pencere: 'Pencere', kapi: 'Kapı' };
  MT.TURAD = TURAD;

  /* ---------- 1) U değeri ---------- */
  MT.katmanlar = (y, tCore) => (y.kat || []).map(k => { const mz = V.MALZ[k.m] || [k.m, k.lam || 1, k.mu || 10]; let d = +k.d || 0; if (tCore && CORE[y._malz] === k.m) d = tCore; const lam = k.lam != null ? +k.lam : mz[1], mu = k.mu != null ? +k.mu : mz[2]; return { m: k.m, ad: mz[0], d, lam, mu, R: d / lam, sd: mu * d }; });
  MT.U = (y, tCore) => {
    if (!y) return { U: 0, R: 0, kat: [] };
    if (y.tur === 'pencere' || y.tur === 'kapi') return { U: +y.U || 2, R: 1 / (+y.U || 2), kat: [], Rsi: 0.13, Rse: 0.04 };
    const rs = V.RS[{ dduvar: 'duvar', iduvar: 'icduvar', taban: 'toprak', tavan: 'tavan', aradoseme: 'aradoseme' }[y.tur] || 'duvar'], kat = MT.katmanlar(y, tCore), Rk = kat.reduce((s, k) => s + k.R, 0), R = rs[0] + Rk + rs[1];
    return { U: 1 / R, R, Rk, kat, Rsi: rs[0], Rse: rs[1] };
  };
  /* yüzeyin yapı elemanı: { key, y (tip), tCore } */
  MT.yapiSec = (m, tur, malz, t, ac) => {
    const Y = m.yapi; let key;
    if (tur === 'dis') key = (m.esle && m.esle['dis:' + malz]) || (Y['DD_' + malz] ? 'DD_' + malz : 'DD_tugla');
    else if (tur === 'ic') key = (m.esle && m.esle['ic:' + malz]) || (Y['ID_' + malz] ? 'ID_' + malz : 'ID_tugla');
    else if (tur === 'pencere') key = m.pencere && Y[m.pencere] ? m.pencere : 'PN_pvc';
    else if (tur === 'kapiDis') key = ac && ac.kTip === 'S' && Y.KP_seksiyonel ? 'KP_seksiyonel' : (m.kapiDis && Y[m.kapiDis] ? m.kapiDis : 'KP_dis');
    else if (tur === 'kapiIc') key = 'KP_ic';
    else if (tur === 'toprak') key = 'TB_toprak';
    else if (tur === 'cati') key = Y[m.catiTip] ? m.catiTip : 'TV_teras';
    else if (tur === 'ara') key = 'AD_normal';
    else if (tur === 'araYal') key = 'AD_yalitimli';
    const y = Y[key] || V.yapiVarsayilan(m.bolge)[key]; if (!y) return null;
    const yy = Object.assign({}, y, { _malz: malz }), tCore = (tur === 'dis' || tur === 'ic') && malz && t > 0.04 && (y.kat || []).some(k => k.m === CORE[malz]) ? t : null;
    return { key, y: yy, tCore, U: MT.U(yy, tCore).U };
  };

  /* ---------- 2) yoğuşma ---------- */
  const psat = T => T >= 0 ? 610.5 * Math.exp(17.269 * T / (237.3 + T)) : 610.5 * Math.exp(21.875 * T / (265.5 + T));
  MT.psat = psat;
  /* sıcaklık / basınç profili: ti, te, bağıl nemler (0–1) */
  MT.profil = (y, tCore, ti, te, rhi, rhe) => {
    const u = MT.U(y, tCore), q = (ti - te) / u.R, x = [0], T = [ti - q * u.Rsi], sd = [0]; let X = 0, Rc = u.Rsi, S = 0;
    for (const k of u.kat) { X += k.d; Rc += k.R; S += k.sd; x.push(X); T.push(ti - q * Rc); sd.push(S); }
    const ps = T.map(psat), pi = rhi * psat(ti), pe = rhe * psat(te), sdT = S || 1e-6, p = sd.map(s => pi - (pi - pe) * s / sdT);
    let c = -1, mx = 0; for (let i = 1; i < p.length - 1; i++) if (p[i] - ps[i] > mx) { mx = p[i] - ps[i]; c = i; }
    return { u, q, x, T, sd, ps, p, pi, pe, c, sdT, ti, te, Tyi: T[0], Tyd: T[T.length - 1] };
  };
  MT.yogusma = (y, tCore, m, tiIc) => {
    if (!y || !y.kat || !y.kat.length) return null;
    const TA = V.TAY[V.TAY_ESLE[m.bolge] || 'C'], ti = tiIc != null ? tiIc : 20, rhi = (m.rhIc || 65) / 100, rhe = (m.rhDis || 80) / 100, D0 = 2e-10, ay = [];
    /* yoğuşma düzlemi: en soğuk ayda buhar basıncının doyma basıncını en çok aştığı ara yüzey */
    let kis = 0; TA.forEach((t, i) => { if (t < TA[kis]) kis = i; });
    const pk = MT.profil(y, tCore, ti, TA[kis], rhi, rhe), c = pk.c;
    let Ma = 0, MaMax = 0, kurur = true; const seq = [9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8], out = new Array(12);
    if (c > 0) {
      for (let tur = 0; tur < 2; tur++) for (const i of seq) {
        const pr = MT.profil(y, tCore, ti, TA[i], rhi, rhe), sA = Math.max(pr.sd[c], 0.01), sB = Math.max(pr.sdT - pr.sd[c], 0.01), g = D0 * ((pr.pi - pr.ps[c]) / sA - (pr.ps[c] - pr.pe) / sB), dm = g * V.GUN[i] * 86400;
        const yeni = Math.max(0, Ma + dm); out[i] = { ay: i, te: TA[i], g: dm, Ma: yeni, yog: dm > 0, Tc: pr.T[c] }; Ma = yeni; if (tur === 1) MaMax = Math.max(MaMax, Ma);
      }
      kurur = out.some(o => o.Ma <= 1e-9);
    } else for (const i of seq) out[i] = { ay: i, te: TA[i], g: 0, Ma: 0, yog: false };
    return { var: c > 0, c, MaMax, kurur, uygun: c <= 0 || (MaMax <= 1.0 && kurur), ay: out, kis: pk, ti };
  };

  /* ---------- mahal yüzey listesi ---------- */
  const ornekNokta = (pts, n = 9) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } const o = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const p = [x0 + (x1 - x0) * (i + 0.5) / n, y0 + (y1 - y0) * (j + 0.5) / n]; if (MT.inPoly(p, pts)) o.push(p); } return o.length ? o : [MT.icNokta(pts)]; };
  const toprakKot = () => { const s = C.doc.set.seviye; return s && s.toprak != null ? +s.toprak : 0; };
  /* alt / üst komşuluk: [{ k:'toprak'|'dis'|'cati'|mahal, oran }] */
  const dusey = (e, all, yon) => {
    const z = +e.z0 || 0, lv = [...new Set(all.map(o => +o.z0 || 0))].sort((a, b) => a - b), i = lv.findIndex(v => Math.abs(v - z) < 1e-6), zn = yon < 0 ? lv[i - 1] : lv[i + 1];
    const cand = zn == null ? [] : all.filter(o => Math.abs((+o.z0 || 0) - zn) < 1e-6), S = ornekNokta(e.pts), cnt = new Map();
    for (const p of S) { const o = cand.find(q => MT.inPoly(p, q.pts)); const key = o ? o.id : (yon > 0 ? 'cati' : (z <= toprakKot() + 1.5 || zn != null ? 'toprak' : 'dis')); cnt.set(key, (cnt.get(key) || 0) + 1); }
    return [...cnt].map(([k, n]) => ({ k, oran: n / S.length })).filter(x => x.oran > 0.04);
  };
  MT.mahalYuzeyleri = (e, all, m) => {
    all = all || MT.mahaller(); m = m || MT.set();
    const ti = MT.tiOf(e), h = +e.h || m.hKat, A = MT.alan(e), items = [], byId = id => all.find(o => o.id === id);
    const tOf = k => { if (k === 'dis' || k === 'cati') return m.td; if (k === 'toprak') return m.tToprak; if (k === 'yok') return ti; const o = typeof k === 'object' ? k : byId(k); if (!o) return ti; const t = MT.tiOf(o); return t == null ? m.tIsitilmayan : t; };
    const adOf = k => k === 'dis' ? 'Dış hava' : k === 'cati' ? 'Dış hava (çatı)' : k === 'toprak' ? 'Toprak' : k === 'yok' ? '—' : (byId(k) ? `${byId(k).no || ''} ${byId(k).ad || ''}`.trim() : '—');
    const push = (o) => { o.tk = o.tk != null ? o.tk : tOf(o.k); o.dt = ti == null ? 0 : ti - o.tk; o.komsu = adOf(o.k); o.Q = ti == null ? 0 : Math.max(0, o.U * o.A * o.dt); items.push(o); };
    /* duvarlar + boşluklar */
    for (const y of e.yuz || []) {
      if (y.k === 'yok') continue; const dis = y.k === 'dis', ko = dis ? null : byId(y.k), isitilmayan = ko && MT.tiOf(ko) == null;
      const w = MT.yapiSec(m, dis ? 'dis' : 'ic', y.malz || 'tugla', y.t); let Ab = y.L * h, Aac = 0;
      for (const a of y.ac || []) { const isP = a.kind !== 'kapi', s = MT.yapiSec(m, isP ? 'pencere' : (dis ? 'kapiDis' : 'kapiIc'), null, 0, a), Aa = Math.min(a.w * a.h, Ab - Aac); if (Aa <= 0) continue; Aac += Aa; push({ tur: isP ? 'PN' : 'KP', ad: s.y.ad, key: s.key, yon: y.yon, adet: 1, w: a.w, hh: a.h, A: Aa, U: s.U, k: y.k, dis, a: +s.y.a || 0, cevre: 2 * (a.w + a.h) }); }
      push({ tur: dis ? 'DD' : 'ID', ad: w.y.ad, key: w.key, tCore: w.tCore, yon: y.yon, L: y.L, hh: h, Ab, A: Math.max(0, Ab - Aac), U: w.U, k: y.k, dis, isitilmayan, t: y.t, _y: y });
    }
    /* elle eklenen pencere / kapılar: aynı yöndeki (yoksa en büyük) dış duvardan düşülür */
    for (const x of e.ek || []) {
      const adet = Math.max(1, +x.adet || 1), w = +x.w || 1, hh = +x.h || 1.2, isP = x.tur !== 'kapi', dd = items.filter(o => o.tur === 'DD'); if (!dd.length) continue;
      const host = dd.filter(o => !x.yon || o.yon === x.yon).sort((a, b) => b.A - a.A)[0] || dd.sort((a, b) => b.A - a.A)[0], s = MT.yapiSec(m, isP ? 'pencere' : 'kapiDis', null, 0, x), Aa = Math.min(w * hh * adet, host.A); if (Aa <= 0) continue;
      host.A -= Aa; host.Q = ti == null ? 0 : Math.max(0, host.U * host.A * host.dt);
      push({ tur: isP ? 'PN' : 'KP', ad: s.y.ad, key: s.key, yon: host.yon, adet, w, hh, A: Aa, U: s.U, k: 'dis', dis: true, a: +s.y.a || 0, cevre: 2 * (w + hh) * adet, ek: true });
    }
    /* taban ve tavan */
    for (const d of dusey(e, all, -1)) { const top = d.k === 'toprak', ko = top || d.k === 'dis' ? null : byId(d.k), uh = ko && MT.tiOf(ko) == null, s = MT.yapiSec(m, top ? 'toprak' : (d.k === 'dis' || uh ? 'araYal' : 'ara')); push({ tur: top ? 'TB' : 'AD', ad: s.y.ad + (top ? '' : ' (taban)'), key: s.key, yon: '—', A: A * d.oran, U: s.U, k: d.k, dis: top || d.k === 'dis', taban: true, isitilmayan: uh }); }
    for (const d of dusey(e, all, +1)) { const cat = d.k === 'cati', ko = cat ? null : byId(d.k), uh = ko && MT.tiOf(ko) == null, s = MT.yapiSec(m, cat ? 'cati' : (uh ? 'araYal' : 'ara')); const U = cat ? s.U : MT.U(Object.assign({}, s.y, { tur: 'aradoseme' })).U; push({ tur: cat ? 'TV' : 'AD', ad: s.y.ad + (cat ? '' : ' (tavan)'), key: s.key, yon: '—', A: A * d.oran, U, k: d.k, dis: cat, tavan: true, isitilmayan: uh }); }
    return items;
  };

  /* ---------- 4) mahal ısı kaybı ---------- */
  const komsuYon = (a, b) => { const i = V.YON8.indexOf(a), j = V.YON8.indexOf(b), d = Math.abs(i - j); return Math.min(d, 8 - d); };
  MT.mahalIsiKaybi = (e, all, m) => {
    all = all || MT.mahaller(); m = m || MT.set();
    const ti = MT.tiOf(e), A = MT.alan(e), h = +e.h || m.hKat, items = MT.mahalYuzeyleri(e, all, m);
    if (ti == null) return { ti: null, A, V: A * h, items, Q0: 0, Qi: 0, Qs: 0, Q: 0, ZD: 0, ZH: 0, D: 0 };
    const Q0 = items.reduce((s, o) => s + o.Q, 0), cevre = (e.yuz || []).reduce((s, y) => s + y.L, 0) || e.pts.reduce((s, p, i) => s + M.dist2(p, e.pts[(i + 1) % e.pts.length]), 0), Atop = cevre * h + 2 * A, dT = ti - m.td;
    const D = dT > 0 ? Q0 / (Atop * dT) : 0, zr = V.ZD[m.isletme] || V.ZD[2], ZD = zr[D < V.ZD.sinir[0] ? 0 : D < V.ZD.sinir[1] ? 1 : D < V.ZD.sinir[2] ? 2 : 3];
    /* yön artırımı: tek dış duvar → o yön; köşe → ara yön; karşılıklı ya da üç dış duvar → en büyük değer */
    const dy = [...new Set(items.filter(o => o.tur === 'DD' && o.A + 0 >= 0 && o.Ab > 0.3).map(o => o.yon))]; let ZH = 0, zhYon = '';
    if (dy.length === 1) { zhYon = dy[0]; ZH = V.ZH[zhYon]; }
    else if (dy.length === 2 && komsuYon(dy[0], dy[1]) <= 2) { const i = V.YON8.indexOf(dy[0]), j = V.YON8.indexOf(dy[1]); let mid = Math.abs(i - j) > 4 ? ((i + j + 8) / 2) % 8 : (i + j) / 2; mid = Math.round(mid) % 8; zhYon = V.YON8[mid]; ZH = V.ZH[zhYon]; }
    else if (dy.length) { ZH = Math.max(...dy.map(y => V.ZH[y])); zhYon = dy.join('+'); }
    const Qi = Q0 * (1 + (ZD + ZH) / 100);
    /* sızıntı: rüzgâr alan cephe(ler) — tek yön ya da komşu iki yön içinden en büyük Σ(a·l) */
    const ac = items.filter(o => (o.tur === 'PN' || o.tur === 'KP') && o.dis && o.a > 0), by = {}; ac.forEach(o => { by[o.yon] = (by[o.yon] || 0) + o.a * o.cevre; });
    const ys = Object.keys(by); let al = 0, kose = false; for (const y of ys) { if (by[y] > al) { al = by[y]; kose = false; } for (const y2 of ys) if (y2 !== y && komsuYon(y, y2) <= 2 && by[y] + by[y2] > al) { al = by[y] + by[y2]; kose = true; } }
    const Hk = ((V.HKAT[m.ruzgar] || V.HKAT.normal)[m.konum] || V.HKAT.normal.serbest)[m.nizam === 'bitisik' ? 0 : 1], Rk = 0.9, Ze = kose ? 1.2 : 1.0, Qs = al * Rk * Hk * dT * Ze;
    const Q = Qi + Qs;
    return { ti, A, V: A * h, items, Q0, Atop, D, ZD, ZH, zhYon, Qi, al, Rk, Hk, Ze, Qs, Q, qA: A ? Q / A : 0, qV: A ? Q / (A * h) : 0 };
  };
  /* tüm bina: mahal sonuçlarını hesaplar ve etiketlere yazar */
  MT.hesapla = () => {
    const m = MT.set(), all = MT.mahaller(), res = all.map(e => { const r = MT.mahalIsiKaybi(e, all, m); e.sonuc = r.ti == null ? null : { Q0: Math.round(r.Q0), ZD: r.ZD, ZH: r.ZH, Qi: Math.round(r.Qi), Qs: Math.round(r.Qs), Q: Math.round(r.Q) }; delete e._c; return { e, r }; });
    return { m, res, Q: res.reduce((s, x) => s + x.r.Q, 0), A: res.filter(x => x.r.ti != null).reduce((s, x) => s + x.r.A, 0), Vol: res.filter(x => x.r.ti != null).reduce((s, x) => s + x.r.V, 0) };
  };

  /* ---------- 3) TS 825 bina hesabı ---------- */
  const gunesYon = (y, i) => { const G = V.GUNES; if (y === 'G') return G.G[i]; if (y === 'K') return G.K[i]; if (y === 'D' || y === 'B') return G.DB[i]; if (y === 'KD' || y === 'KB') return (G.K[i] + G.DB[i]) / 2; return (G.G[i] + G.DB[i]) / 2; };
  MT.ts825 = (hes) => {
    hes = hes || MT.hesapla(); const m = hes.m, isit = hes.res.filter(x => x.r.ti != null), grp = new Map();
    const add = (o, kat, carp) => { const k = `${kat}|${o.key}|${o.tCore || ''}|${kat === 'PN' ? o.yon : ''}`; let g = grp.get(k); if (!g) grp.set(k, g = { kat, key: o.key, tCore: o.tCore, ad: o.ad, U: o.U, A: 0, carp, yon: kat === 'PN' ? o.yon : '' }); g.A += o.A; };
    let Adis = 0, Anet = 0, Adusey = 0, Apen = 0;
    for (const { r } of isit) {
      Anet += r.A;
      for (const o of r.items) {
        if (o.tur === 'DD') { add(o, 'DD', 1); Adis += o.Ab; Adusey += o.Ab; }
        else if (o.tur === 'PN' && o.dis) { add(o, 'PN', 1); Apen += o.A; }
        else if (o.tur === 'KP' && o.dis) add(o, 'KP', 1);
        else if (o.tur === 'TB') add(o, 'TB', 0.5);
        else if (o.tur === 'TV') add(o, 'TV', o.key === 'TV_cati' ? 0.8 : 1);
        else if (o.tur === 'AD' && o.dis) add(o, 'DT', 1);
        else if ((o.tur === 'AD' || o.tur === 'ID') && o.isitilmayan) add(o, o.tur === 'AD' ? 'DS' : 'DI', 0.5);
      }
    }
    /* dış ölçülere geçiş: kat brüt alan / çevre değerleri varsa duvar ve döşeme alanları ölçeklenir */
    const katlar = Object.values(m.katlar || {}), brutA = katlar.reduce((s, k) => s + (k.alan || 0), 0), brutW = katlar.reduce((s, k) => s + (k.cevre || 0) * (k.h || m.hKat), 0);
    const fA = brutA > 0 && Anet > 0 ? Math.min(1.35, Math.max(1, brutA / hes.res.reduce((s, x) => s + x.r.A, 0))) : 1.12, AdisT = hes.res.reduce((q, x) => q + x.r.items.filter(o => o.tur === 'DD').reduce((z, o) => z + o.Ab, 0), 0), fW = brutW > 0 && AdisT > 0 ? Math.min(1.25, Math.max(1, brutW / AdisT)) : 1.06;
    const el = [...grp.values()].map(g => { let A = g.A; if (g.kat === 'DD') A = g.A * fW + (fW - 1) * 0; if (g.kat === 'TB' || g.kat === 'TV' || g.kat === 'DT' || g.kat === 'DS') A = g.A * fA; return Object.assign(g, { A, UA: g.U * A * g.carp }); });
    /* duvar brüt alanı büyüdüyse fark opak duvara eklenir (pencere alanı sabit) */
    const ddNet = el.filter(g => g.kat === 'DD').reduce((s, g) => s + g.A, 0), ddAc = el.filter(g => g.kat === 'PN' || g.kat === 'KP').reduce((s, g) => s + g.A, 0), ekA = Math.max(0, (Adis * fW) - (ddNet + ddAc));
    if (ekA > 0 && ddNet > 0) el.filter(g => g.kat === 'DD').forEach(g => { g.A += ekA * g.A / ddNet; g.UA = g.U * g.A * g.carp; });
    const Atop = el.reduce((s, g) => s + g.A, 0), Vbrut = katlar.length && brutA > 0 ? katlar.reduce((s, k) => s + (k.alan || 0) * (k.h || m.hKat), 0) : hes.Vol * fA;
    const An = 0.32 * Vbrut, Vh = 0.8 * Vbrut, Hkop = (m.kopru || 0) * Atop, Hil = el.reduce((s, g) => s + g.UA, 0) + Hkop, Hv = 0.33 * m.nh * Vh, H = Hil + Hv;
    const B = V.BINA[m.bina] || V.BINA[2], ti = B[2], qi = B[3], TA = V.TAY[V.TAY_ESLE[m.bolge] || 'C'], rg = m.nizam === 'bitisik' ? 0.6 : 0.8, fi = qi * An, ay = [];
    let Qyil = 0;
    for (let i = 0; i < 12; i++) {
      let fs = 0; el.filter(g => g.kat === 'PN').forEach(g => { const gy = (m.yapi[g.key] && +m.yapi[g.key].g) || 0.6; fs += rg * 0.8 * gy * gunesYon(g.yon, i) * g.A; });
      const kayip = H * (ti - TA[i]), kko = kayip > 0 ? (fi + fs) / kayip : 99, eta = kko > 0 ? 1 - Math.exp(-1 / kko) : 1, net = kayip - eta * (fi + fs), kWh = net > 0 && kko < 2.5 ? net * V.GUN[i] * 24 / 1000 : 0;
      ay.push({ te: TA[i], kayip: Math.max(0, kayip) * V.GUN[i] * 24 / 1000, ic: fi * V.GUN[i] * 24 / 1000, gunes: fs * V.GUN[i] * 24 / 1000, kko, eta, Q: kWh }); Qyil += kWh;
    }
    const camOran = Adusey > 0 ? Apen / Adusey : 0, lim = (camOran >= 0.6 ? V.U825CAM : V.U825)[m.bolge] || V.U825[4], limOf = k => ({ DD: lim[0], TV: lim[1], TB: lim[2], DT: lim[2], DS: lim[2], PN: lim[3], KP: null, DI: null })[k];
    el.forEach(g => { g.lim = limOf(g.kat); g.uygun = g.lim == null || g.U <= g.lim + 0.005; });
    /* yoğuşma: opak dış elemanlar */
    const yog = el.filter(g => ['DD', 'TV', 'DT'].includes(g.kat)).map(g => { const y = Object.assign({}, m.yapi[g.key], g.tCore ? { _malz: Object.keys(CORE).find(k => (m.yapi[g.key].kat || []).some(q => q.m === CORE[k])) } : {}); return { g, y, r: MT.yogusma(y, g.tCore, m, 20) }; }).filter(x => x.r);
    const qYil = An > 0 ? Qyil / An : 0, sinir = B[1][(m.bolge || 4) - 1];
    return { m, el, Atop, Vbrut, An, Vh, AV: Vbrut ? Atop / Vbrut : 0, Hil, Hkop, Hv, H, ti, qi, fi, ay, Qyil, qYil, sinir, camOran, yog, fA, fW, bina: B[0], uUygun: el.every(g => g.uygun), yogUygun: yog.every(x => x.r.uygun) };
  };
  MT.KATAD = { DD: 'Dış duvar', PN: 'Pencere', KP: 'Dış kapı', TB: 'Toprak temaslı taban', TV: 'Tavan / çatı', DT: 'Dış hava temaslı döşeme', DS: 'Isıtılmayan hacim üstü döşeme', DI: 'Isıtılmayan hacme bitişik duvar' };
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : (globalThis.C = globalThis.C || {}));

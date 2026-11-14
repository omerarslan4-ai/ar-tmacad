/* ArıtmaCAD — STATİK: TEMEL HESABI (yapı türü "yalnız üst yapı": bekçi binası, idari bina — kabuk modeli yok)
   Firma kuralı: docs/tasarim-standartlari.md › "Yapı türüne göre statik çözüm yolu", 3: çerçeve modeli + temel hesabı (tekil / sürekli /
   radye, zemin emniyet gerilmesi).
   Girdi: S.temel (STATIKMODEL › d.temel: radye, tekil, sürekli temel ve temelin üstüne oturan, çerçevede olmayan elemanlar — beton / tuğla
   perde, dolgu, zemine oturan döşeme), üst yapı çerçeve sonucu RC (kolon ayağı tepkileri, statik-iki-asama.js › P.kolonTepki).
   Yöntem (rijit temel kabulü, elle izlenebilir):
     • her temel için yükler temel tabanının ağırlık merkezine indirgenir: N, Mx, My (kolon tepkisi kuvvet + moment, kaçıklık momenti dahil);
       σ = N/A + My·(x − xc)/Iy − Mx·(y − yc)/Ix temel köşelerinde; G + Q ve G + Q ± E (X, Y) ≤ zemin emniyet gerilmesi; çekirdek dışında kısmi temas (P.temasGerilme); G + Q altında kalkma ve devrilme yetersiz sayılır.
     • zımbalama (TS 500 8.3.1): kolon yüzünden d/2 uzaktaki çevre, Vpd = Nd − q_net·(b1·b2) ≤ Vpr = γ·fctd·up·d,
       γ = 1 / (1 + 1,5·(ex + ey)/√(b1·b2)); kenar kolonda temel dışında kalan çevre kenarı sayılmaz.
     • tekil temel eğilmesi: kolon yüzünde konsol M = q_net·l²/2 (1 m şerit), As ≥ 0,002·h; 15 cm aralıkta yeten en küçük çap.
   Radye eğilme donatısı bu hesapta yoktur (rapor notu). Birim ağırlıklar: beton S.mal.gc, dolgu S.zemin.g, tuğla duvar 12 kN/m³ (kabul). */
(function (G) {
  'use strict';
  const P = G.STATIK = G.STATIK || {};
  const f2 = (v, d = 2) => (v == null || !isFinite(v) ? '—' : (+v).toFixed(d).replace('.', ','));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  P.TEMEL_GAMMA_TUGLA = 12;                                            // kN/m³, sıvalı tuğla duvar (kabul — firma değeri sorulacak)
  const pip = (q, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  /* çokgen kesit özellikleri: alan, ağırlık merkezi, ağırlık merkezinden geçen eksenlere göre Ix, Iy */
  P.cokgenKesit = poly => {
    let A = 0, cx = 0, cy = 0, Ixx = 0, Iyy = 0; const n = poly.length;
    for (let i = 0; i < n; i++) { const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % n], c = x0 * y1 - x1 * y0; A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c; Ixx += (y0 * y0 + y0 * y1 + y1 * y1) * c; Iyy += (x0 * x0 + x0 * x1 + x1 * x1) * c; }
    A /= 2; cx /= 6 * A; cy /= 6 * A; Ixx /= 12; Iyy /= 12; const s = A < 0 ? -1 : 1; A = Math.abs(A); Ixx = s * Ixx - A * cy * cy; Iyy = s * Iyy - A * cx * cx;
    return { A, xc: cx, yc: cy, Ix: Ixx, Iy: Iyy };
  };
  /* çekme almayan zeminde temel gerilmesi (kısmi temas): σ = a + b·(x − xc) + c·(y − yc) yalnız temas bölgesinde (σ > 0); temel tabanı ızgara
     hücrelerine bölünür, temas bölgesi yinelenerek bulunur (N, Mx, My dengesi). Bileşke çekirdek içindeyse doğrusal formülle aynıdır;
     dışındaysa σmaks büyür (dikdörtgen, tek yönde e > L/6: σmaks = 2N / (3·B·(L/2 − e))). Bileşke tabanın dışındaysa (devrilme) ok = false.
     Dönen { smax, smin (doğrusal formülle, kalkma göstergesi), temas (temas alanı / A), ok } */
  P.temasGerilme = (poly, N, Mx, My, K, nb) => {
    K = K || P.cokgenKesit(poly); nb = nb || 60; const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), dx = (Math.max(...xs) - x0) / nb, dy = (Math.max(...ys) - y0) / nb, H = [];
    for (let i = 0; i < nb; i++) for (let j = 0; j < nb; j++) { const x = x0 + (i + 0.5) * dx, y = y0 + (j + 0.5) * dy; if (pip([x, y], poly)) H.push([x - K.xc, y - K.yc]); }
    const dA = K.A / H.length, lin = q => N / K.A + My * q[0] / K.Iy - Mx * q[1] / K.Ix, smin = Math.min(...poly.map(p => lin([p[0] - K.xc, p[1] - K.yc])));
    if (!(N > 0)) return { smax: Infinity, smin, temas: 0, ok: false };
    if (smin >= -1e-9) return { smax: Math.max(...poly.map(p => lin([p[0] - K.xc, p[1] - K.yc]))), smin, temas: 1, ok: true };
    let akt = H.map(q => lin(q) > 0), abc = null;
    for (let it = 0; it < 60; it++) { const M3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], r = [N, My, -Mx];
      H.forEach((q, k) => { if (!akt[k]) return; const v = [1, q[0], q[1]]; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) M3[a][b] += dA * v[a] * v[b]; });
      const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]), D = det(M3); if (!(Math.abs(D) > 1e-12)) return { smax: Infinity, smin, temas: 0, ok: false };
      abc = [0, 1, 2].map(c => det(M3.map((row, i) => row.map((v, j) => (j === c ? r[i] : v)))) / D);
      const yeni = H.map(q => abc[0] + abc[1] * q[0] + abc[2] * q[1] > 0); if (yeni.every((v, k) => v === akt[k])) break; akt = yeni; if (!akt.some(Boolean)) return { smax: Infinity, smin, temas: 0, ok: false }; }
    const kose = poly.map(p => abc[0] + abc[1] * (p[0] - K.xc) + abc[2] * (p[1] - K.yc)), hc = H.map(q => abc[0] + abc[1] * q[0] + abc[2] * q[1]);
    return { smax: Math.max(...kose, ...hc), smin, temas: akt.filter(Boolean).length / H.length, ok: true };
  };
  const dikdortgen = (x, y, bx, by, rot) => { const c = Math.cos((rot || 0) * Math.PI / 180), s = Math.sin((rot || 0) * Math.PI / 180); return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [x + u * bx / 2 * c - v * by / 2 * s, y + u * bx / 2 * s + v * by / 2 * c]); };
  const KOMB = { emn: [['G + Q', { G: 1, Q: 1 }]], dep: [['G + Q + Ex', { G: 1, Q: 1, EX: 1 }], ['G + Q − Ex', { G: 1, Q: 1, EX: -1 }], ['G + Q + Ey', { G: 1, Q: 1, EY: 1 }], ['G + Q − Ey', { G: 1, Q: 1, EY: -1 }]],
    tsm: [['1,4G + 1,6Q', { G: 1.4, Q: 1.6 }], ['G + Q + Ex', { G: 1, Q: 1, EX: 1 }], ['G + Q − Ex', { G: 1, Q: 1, EX: -1 }], ['G + Q + Ey', { G: 1, Q: 1, EY: 1 }], ['G + Q − Ey', { G: 1, Q: 1, EY: -1 }]] };
  P.TEMEL_KOMB = KOMB;
  const DUR = { G: 'G', Q: 'Q', EX: 'EX+', EY: 'EY+' };
  const cubukSec = (As, h) => { const Amin = 0.002 * h, A = Math.max(As, Amin); for (const F of [12, 14, 16, 18, 20, 22, 25]) { const a = Math.PI * F * F / 4e6 / 0.15; if (a >= A) return { F, s: 0.15, As: a, req: A, ok: true }; }
    for (const F of [20, 22, 25]) { const a = Math.PI * F * F / 4e6 / 0.10; if (a >= A) return { F, s: 0.10, As: a, req: A, ok: true }; } return { ok: false, req: A }; };

  /* S: pencere girdisi (S.temel, S.mal, S.zemin, S.cer.ayar), RC: üst yapı çerçeve sonucu (yoksa yalnız temel üstü yükler) */
  P.temelHesap = (S, RC) => {
    const TM = S.temel, uyar = [], out = { temeller: [], uyar, ok: true, tur: null };
    if (!TM || !((TM.radye || []).length || (TM.tekil || []).length || (TM.surekli || []).length)) { uyar.push('Modelde temel (radye / tekil / sürekli temel) yok: temel hesabı yapılmadı.'); out.ok = false; return out; }
    const gc = (S.mal && S.mal.gc) || 25, MAL = P.malzeme(S.mal), fctd = MAL.fctd * 1000, fyd = MAL.fyd * 1000, sig = +S.zemin.sig, cR = +S.mal.cR || 0.05;
    const dv = Object.assign(P.cerceveVars ? P.cerceveVars() : {}, (S.cer && S.cer.ayar) || {}), gD = +dv.gD || 1.5, qD = +dv.qD || 3.5, gD0 = (S.zemin && +S.zemin.g) || 18;
    const T = RC && P.kolonTepki ? P.kolonTepki(RC) : [];
    // temelin üstündeki diğer yükler (G, Q): beton perde, tuğla duvar, dolgu, zemine oturan döşeme (öz + kaplama, hareketli)
    const ekY = (TM.ek || []).map(e => { const gam = e.tur === 'duvar' ? P.TEMEL_GAMMA_TUGLA : e.tur === 'dolgu' ? gD0 : gc; const Gk = e.V * gam + (e.tur === 'doseme' ? (e.g != null ? e.g : gD) * (e.A || 0) : 0), Qk = e.tur === 'doseme' ? (e.q != null ? e.q : qD) * (e.A || 0) : 0; return Object.assign({}, e, { gam, Gk, Qk }); });
    const kul = new Set(), kulE = new Set();
    const temelEkle = (tur, ad, poly, t, zt, kolonSec, ekSec) => {
      const K = P.cokgenKesit(poly), zb = zt - t, kol = T.filter(q => !kul.has(q) && kolonSec(q)), ek = ekY.filter(e => !kulE.has(e) && ekSec(e)); kol.forEach(q => kul.add(q)); ek.forEach(e => kulE.add(e));
      const Gs = gc * K.A * t, Gek = ek.reduce((s, e) => s + e.Gk, 0), Qek = ek.reduce((s, e) => s + e.Qk, 0);
      // durum başına bileşke (taban ağırlık merkezinde): [N (basınç +), Mx, My]
      const bil = c => { let N = 0, Mx = 0, My = 0;
        for (const q of kol) { const F = q.F[DUR[c]]; if (!F) continue; const r = [q.x - K.xc, q.y - K.yc, q.z - zb]; N += -F[2]; Mx += F[3] + (r[1] * F[2] - r[2] * F[1]); My += F[4] + (r[2] * F[0] - r[0] * F[2]); }
        if (c === 'G') { N += Gs + Gek; for (const e of ek) { Mx += -(e.y - K.yc) * e.Gk; My += (e.x - K.xc) * e.Gk; } }
        if (c === 'Q') { N += Qek; for (const e of ek) { Mx += -(e.y - K.yc) * e.Qk; My += (e.x - K.xc) * e.Qk; } }
        return [N, Mx, My]; };
      const B = { G: bil('G'), Q: bil('Q'), EX: bil('EX'), EY: bil('EY') };
      const komb = f => [0, 1, 2].map(k => Object.entries(f).reduce((s, [c, v]) => s + v * B[c][k], 0));
      const sigma = (f, q) => { const [N, Mx, My] = komb(f); return N / K.A + My * (q[0] - K.xc) / K.Iy - Mx * (q[1] - K.yc) / K.Ix; };
      /* zemin gerilmesi: çekirdek dışında kısmi temasla σmaks (P.temasGerilme). Kabul: G + Q altında kalkma olmaz (tam temas), depremli
         kombinasyonda kısmi temas kabul edilir ama σmaks ≤ σem ve bileşke taban içinde kalmalı (devrilme yok) */
      const zem = []; for (const tip of ['emn', 'dep']) for (const [ad2, f] of KOMB[tip]) { const [N, Mx, My] = komb(f), tg = P.temasGerilme(poly, N, Mx, My, K);
        zem.push({ ad: ad2, tip, N, smax: tg.smax, smin: tg.smin, temas: tg.temas, devrilme: !tg.ok, ort: N / K.A, ok: tg.ok && tg.smax <= sig + 1e-6 && (tip === 'dep' || tg.smin >= -1e-6) }); }
      const zOk = zem.every(z => z.ok), kalkma = zem.some(z => z.smin < -1e-6);
      // zımbalama (temel üstündeki kolonlar)
      const d = Math.max(0.05, t - cR - 0.01), zimb = [];
      for (const q of kol) { const b1 = (+q.bx || 0.4) + d, b2 = (+q.by || 0.4) + d, kenar = [[[q.x - b1 / 2, q.y - b2 / 2], [q.x + b1 / 2, q.y - b2 / 2]], [[q.x + b1 / 2, q.y - b2 / 2], [q.x + b1 / 2, q.y + b2 / 2]], [[q.x + b1 / 2, q.y + b2 / 2], [q.x - b1 / 2, q.y + b2 / 2]], [[q.x - b1 / 2, q.y + b2 / 2], [q.x - b1 / 2, q.y - b2 / 2]]];
        const up = kenar.filter(([a, b]) => pip([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], poly)).reduce((s, [a, b]) => s + Math.hypot(b[0] - a[0], b[1] - a[1]), 0); let en = null;
        for (const [ad2, f] of KOMB.tsm) { const Fq = [0, 1, 2, 3, 4, 5].map(k => Object.entries(f).reduce((s, [c, v]) => s + v * ((q.F[DUR[c]] || [])[k] || 0), 0)), Nd = -Fq[2]; if (!(Nd > 0)) continue;
          const yay = (f.G || 0) * (Gs + Gek) / K.A + (f.Q || 0) * Qek / K.A, qn = Math.max(0, sigma(f, [q.x, q.y]) - yay), Vpd = Math.max(0, Nd - qn * b1 * b2);
          const ex = Vpd > 0 ? Math.abs(Fq[4]) / Vpd : 0, ey = Vpd > 0 ? Math.abs(Fq[3]) / Vpd : 0, /* TS 500 8.3.1: e = M_pd / V_pd */ gam = 1 / (1 + 1.5 * (ex + ey) / Math.sqrt(b1 * b2)), Vpr = gam * fctd * up * d;
          if (!en || Vpd / Vpr > en.Vpd / en.Vpr) en = { kolon: q.no || ('S' + q.id), komb: ad2, Nd, qn, Vpd, Vpr, gam, up, d, b1, b2, ok: Vpd <= Vpr + 1e-6 }; }
        if (en) zimb.push(en); }
      // tekil temel eğilmesi (kolon yüzünde konsol, 1 m şerit, en elverişsiz taşıma gücü kombinasyonu)
      let egil = null;
      if (tur === 'tekil' && kol.length === 1) { const q = kol[0]; egil = [];
        for (const [yon, Lb, c] of [['X', TMq(poly, 0), +q.bx || 0.4], ['Y', TMq(poly, 1), +q.by || 0.4]]) { let Mmax = 0, kb = '';
          for (const [ad2, f] of KOMB.tsm) { const yay = (f.G || 0) * Gs / K.A, qn = Math.max(...poly.map(p => sigma(f, p))) - yay, l = Math.max(0, (Lb - c) / 2), M = Math.max(0, qn) * l * l / 2; if (M > Mmax) { Mmax = M; kb = ad2; } }
          const sec = cubukSec(Mmax / (0.9 * d * fyd), t); egil.push({ yon, M: Mmax, komb: kb, sec }); } }
      const ok = zOk && zimb.every(z => z.ok) && (!egil || egil.every(e => e.sec.ok));
      const o = { tur, ad, poly, A: K.A, t, zt, zb, K, kol: kol.map(q => q.no || ('S' + q.id)), ek: ek.map(e => ({ ad: e.ad, tur: e.tur, Gk: e.Gk, Qk: e.Qk })), Gs, Gek, Qek, B, zem, zOk, kalkma, zimb, egil, ok, sig };
      for (const z of zem.filter(q => !q.ok)) uyar.push(z.devrilme ? `${ad}: ${z.ad} — bileşke temel tabanının dışında (devrilme / tam kalkma): temeli büyütün.` : z.smax > sig + 1e-6 ? `${ad}: ${z.ad} — zemin gerilmesi ${f2(z.smax, 1)} > ${f2(sig, 0)} kN/m² (zemin emniyet gerilmesi${z.temas < 1 ? `; kısmi temas, temas alanı %${f2(z.temas * 100, 0)}` : ''}).` : `${ad}: ${z.ad} — düşey yüklerde temel kenarında kalkma (σmin = ${f2(z.smin, 1)} kN/m²): temeli büyütün.`);
      if (kalkma && zOk) uyar.push(`${ad}: depremli kombinasyonda temel kenarı kalkıyor (kısmi temas, temas alanı en az %${f2(Math.min(...zem.map(z => z.temas)) * 100, 0)}); σmaks kısmi temasla hesaplandı.`);
      zimb.filter(z => !z.ok).forEach(z => uyar.push(`${ad}: ${z.kolon} kolonu altında zımbalama Vpd = ${f2(z.Vpd, 0)} > Vpr = ${f2(z.Vpr, 0)} kN (${z.komb}) — temel kalınlığını artırın.`));
      (egil || []).filter(e => !e.sec.ok).forEach(e => uyar.push(`${ad}: ${e.yon} doğrultusunda eğilme donatısı sığmıyor (M = ${f2(e.M, 0)} kNm/m).`));
      out.temeller.push(o); return o; };
    function TMq(poly, k) { const v = poly.map(p => p[k]); return Math.max(...v) - Math.min(...v); }
    for (const r of (TM.radye || [])) temelEkle('radye', r.no ? `Radye ${r.no}` : `Radye (${f2(r.t * 100, 0)} cm)`, r.pts, r.t, r.zt, q => pip([q.x, q.y], r.pts), e => pip([e.x, e.y], r.pts));
    for (const k of (TM.tekil || [])) { const poly = dikdortgen(k.x, k.y, k.bx, k.by, k.rot); temelEkle('tekil', k.no ? `Tekil temel ${k.no}` : `Tekil temel ${f2(k.bx)} × ${f2(k.by)}`, poly, k.t, k.zt, q => pip([q.x, q.y], poly), e => pip([e.x, e.y], poly)); }
    for (const s of (TM.surekli || [])) { const L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]); if (L < 1e-6) continue; const n = [-(s.b[1] - s.a[1]) / L * s.B / 2, (s.b[0] - s.a[0]) / L * s.B / 2], poly = [[s.a[0] + n[0], s.a[1] + n[1]], [s.a[0] - n[0], s.a[1] - n[1]], [s.b[0] - n[0], s.b[1] - n[1]], [s.b[0] + n[0], s.b[1] + n[1]]];
      const yak = (x, y) => { const u = ((x - s.a[0]) * (s.b[0] - s.a[0]) + (y - s.a[1]) * (s.b[1] - s.a[1])) / (L * L); if (u < -0.02 || u > 1.02) return false; return Math.hypot(s.a[0] + (s.b[0] - s.a[0]) * u - x, s.a[1] + (s.b[1] - s.a[1]) * u - y) <= s.B / 2 + 0.05; };
      temelEkle('surekli', s.no ? `Sürekli temel ${s.no}` : `Sürekli temel (B = ${f2(s.B)})`, poly, s.h, s.zt, q => yak(q.x, q.y), e => yak(e.x, e.y)); }
    const kalan = T.filter(q => !kul.has(q)); if (kalan.length) uyar.push(`${kalan.map(q => q.no || 'S' + q.id).join(', ')}: altında temel bulunamadı (kolon ayağı temelin dışında).`);
    out.tur = [...new Set(out.temeller.map(o => o.tur))].join(' + ');
    out.ok = out.temeller.every(o => o.ok) && !kalan.length; out.T = T; out.gc = gc; out.gDolgu = gD0; return out;
  };

  const TUR_AD = { radye: 'radye', tekil: 'tekil temel', surekli: 'sürekli temel' };
  P.temelOzet = TH => {
    const d = ok => `<span class="pill ${ok ? 'ok' : 'bad'}">${ok ? 'UYGUN' : 'YETERSİZ'}</span>`;
    let h = `<h3 style="margin-top:14px">Temel ${TH.temeller.length ? d(TH.ok) : ''}</h3>`; TH.uyar.forEach(u => h += `<div class="msg">${esc(u)}</div>`);
    if (!TH.temeller.length) return h;
    h += `<table class="t"><tr><th class="l">Temel</th><th>A (m²)</th><th>σ<sub>maks</sub> G+Q / depremli (kN/m²)</th><th>σ<sub>em</sub></th><th>Zımbalama Vpd/Vpr (en büyük)</th><th></th></tr>`;
    for (const o of TH.temeller) { const e = o.zem.filter(z => z.tip === 'emn'), q = o.zem.filter(z => z.tip === 'dep'), zm = o.zimb.reduce((m, z) => Math.max(m, z.Vpd / z.Vpr), 0);
      h += `<tr><td class="l">${esc(o.ad)}</td><td>${f2(o.A)}</td><td>${f2(Math.max(...e.map(z => z.smax)), 1)} / ${q.length ? f2(Math.max(...q.map(z => z.smax)), 1) : '—'}</td><td>${f2(o.sig, 0)}</td><td>${o.zimb.length ? f2(zm, 2) : '—'}</td><td>${o.ok ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'}</td></tr>`; }
    return h + '</table>';
  };
  P.temelRapor = (TH, f) => {
    f = f || f2; let h = `<h2 class="sayfa">TEMEL HESABI</h2><p>Yapı yalnız üst yapıdır (kabuk modeli yoktur): üst yapı çerçeve modeliyle çözülmüş, kolon ayağı tepkileri (3B çerçeve analizi) temele aktarılmıştır. Temel rijit kabul edilmiş; yükler temel tabanının ağırlık merkezine indirgenmiş, köşe gerilmeleri σ = N/A ± M<sub>y</sub>·x/I<sub>y</sub> ± M<sub>x</sub>·y/I<sub>x</sub> ile bulunmuştur. Temelin üstüne oturan ve çerçevede olmayan elemanların (perde, tuğla duvar, dolgu, zemine oturan döşeme) ağırlıkları metrajla aynı net hacimlerden alınmıştır (beton ${f(TH.gc, 0)}, dolgu ${f(TH.gDolgu, 0)}, tuğla duvar ${f(P.TEMEL_GAMMA_TUGLA, 0)} kN/m³ — tuğla birim ağırlığı kabuldür). Zımbalama TS 500 8.3.1'e göre kolon yüzünden d/2 uzaktaki çevrede.</p>`;
    TH.uyar.forEach(u => h += `<p><b>Uyarı:</b> ${esc(u)}</p>`);
    for (const o of TH.temeller) {
      h += `<h3>${esc(o.ad)} — ${TUR_AD[o.tur] || o.tur}</h3><p>Taban alanı A = ${f(o.A)} m², I<sub>x</sub> = ${f(o.K.Ix)} m⁴, I<sub>y</sub> = ${f(o.K.Iy)} m⁴, kalınlık ${f(o.t * 100, 0)} cm, taban kotu ${f(o.zb)}. Üstündeki kolonlar: ${o.kol.length ? esc(o.kol.join(', ')) : '—'}.</p>`;
      h += `<table><tr><th class="l">Yük</th><th>G (kN)</th><th>Q (kN)</th></tr><tr><td class="l">Temel öz ağırlığı</td><td>${f(o.Gs, 1)}</td><td>—</td></tr>${o.ek.map(e => `<tr><td class="l">${esc(e.ad)} (${esc(e.tur)})</td><td>${f(e.Gk, 1)}</td><td>${e.Qk ? f(e.Qk, 1) : '—'}</td></tr>`).join('')}<tr><td class="l">Kolon ayağı tepkileri (${o.kol.length} kolon)</td><td>${f(o.B.G[0] - o.Gs - o.Gek, 1)}</td><td>${f(o.B.Q[0] - o.Qek, 1)}</td></tr><tr><th class="l">Toplam N</th><th>${f(o.B.G[0], 1)}</th><th>${f(o.B.Q[0], 1)}</th></tr></table>`;
      h += `<table><tr><th class="l">Kombinasyon</th><th>N (kN)</th><th>σ<sub>ort</sub></th><th>σ<sub>maks</sub></th><th>σ<sub>min</sub> (kN/m²)</th><th>σ<sub>em</sub></th><th></th></tr>${o.zem.map(z => `<tr><td class="l">${z.ad}</td><td>${f(z.N, 1)}</td><td>${f(z.ort, 1)}</td><td>${f(z.smax, 1)}</td><td>${f(z.smin, 1)}</td><td>${f(o.sig, 0)}</td><td>${z.ok ? (z.temas < 1 ? 'UYGUN (kısmi temas %' + f(z.temas * 100, 0) + ')' : 'UYGUN') : z.devrilme ? 'DEVRİLME' : z.smax > o.sig ? 'YETERSİZ' : 'KALKMA'}</td></tr>`).join('')}</table>`;
      if (o.zimb.length) h += `<p>Zımbalama (her kolon için en elverişsiz taşıma gücü kombinasyonu), faydalı yükseklik d = ${f(o.zimb[0].d * 100, 0)} cm:</p><table><tr><th class="l">Kolon</th><th>Komb.</th><th>N<sub>d</sub> (kN)</th><th>q<sub>net</sub> (kN/m²)</th><th>u<sub>p</sub> (m)</th><th>γ</th><th>V<sub>pd</sub> (kN)</th><th>V<sub>pr</sub> (kN)</th><th></th></tr>${o.zimb.map(z => `<tr><td class="l">${esc(z.kolon)}</td><td>${z.komb}</td><td>${f(z.Nd, 1)}</td><td>${f(z.qn, 1)}</td><td>${f(z.up)}</td><td>${f(z.gam, 3)}</td><td>${f(z.Vpd, 1)}</td><td>${f(z.Vpr, 1)}</td><td>${z.ok ? 'UYGUN' : 'YETERSİZ'}</td></tr>`).join('')}</table>`;
      if (o.egil) h += `<table><tr><th class="l">Eğilme (kolon yüzü)</th><th>M<sub>d</sub> (kNm/m)</th><th>A<sub>s</sub> ger. (cm²/m)</th><th>Seçilen</th></tr>${o.egil.map(e => `<tr><td class="l">${e.yon} doğrultusu (${e.komb})</td><td>${f(e.M, 1)}</td><td>${f(e.sec.req * 1e4)}</td><td>${e.sec.ok ? `Ø${e.sec.F}/${f(e.sec.s * 100, 0)} alt` : 'sığmıyor'}</td></tr>`).join('')}</table>`;
      if (o.tur === 'radye') h += `<p class="f">Not: radye eğilme donatısı bu hesapta yapılmamıştır (rijit temel kabulüyle yalnız zemin gerilmesi ve zımbalama). Radye donatısı için elastik zemine oturan plak çözümü gerekir.</p>`;
    }
    return h;
  };
})(typeof window !== 'undefined' ? window : globalThis);

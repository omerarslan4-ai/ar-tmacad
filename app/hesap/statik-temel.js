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
  /* çokgen kesit özellikleri: alan, ağırlık merkezi, ağırlık merkezinden geçen X / Y eksenlerine göre Ix = ∫y², Iy = ∫x², Ixy = ∫xy
     (çarpım atalet momenti: döndürülmüş / simetrik olmayan tabanda sıfır değildir) */
  P.cokgenKesit = poly => {
    let A = 0, cx = 0, cy = 0, Ixx = 0, Iyy = 0, Ixy = 0; const n = poly.length;
    for (let i = 0; i < n; i++) { const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % n], c = x0 * y1 - x1 * y0; A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c; Ixx += (y0 * y0 + y0 * y1 + y1 * y1) * c; Iyy += (x0 * x0 + x0 * x1 + x1 * x1) * c; Ixy += (x0 * y1 + 2 * x0 * y0 + 2 * x1 * y1 + x1 * y0) * c; }
    A /= 2; cx /= 6 * A; cy /= 6 * A; Ixx /= 12; Iyy /= 12; Ixy /= 24; const s = A < 0 ? -1 : 1; A = Math.abs(A); Ixx = s * Ixx - A * cy * cy; Iyy = s * Iyy - A * cx * cx; Ixy = s * Ixy - A * cx * cy;
    return { A, xc: cx, yc: cy, Ix: Ixx, Iy: Iyy, Ixy };
  };
  /* tam temasta doğrusal gerilme (genel formül, çarpım atalet momentiyle): yük bileşkesi N, Mx, My (My: +x yanındaki yük +, Mx: +y yanındaki yük −)
     σ(x, y) = N/A + b·x + c·y,  [Iy Ixy; Ixy Ix]·[b; c] = [My; −Mx]  →  σ = N/A + [(My·Ix + Mx·Ixy)·x − (Mx·Iy + My·Ixy)·y] / (Ix·Iy − Ixy²) */
  P.dogrusalGerilme = (K, N, Mx, My) => { const D = K.Ix * K.Iy - K.Ixy * K.Ixy, b = (My * K.Ix + Mx * K.Ixy) / D, c = -(Mx * K.Iy + My * K.Ixy) / D; return (x, y) => N / K.A + b * (x - K.xc) + c * (y - K.yc); };
  /* çekme almayan zeminde temel gerilmesi (kısmi temas): σ = a + b·(x − xc) + c·(y − yc) yalnız temas bölgesinde (σ > 0). Taban, asal eksenlere
     paralel ızgara hücrelerine bölünür (ince uzun / döndürülmüş tabanda da her doğrultuda nb hücre), temas bölgesi yinelenerek bulunur
     (N, Mx, My dengesi; çarpım atalet momenti hücre toplamlarında kendiliğinden vardır). Bileşke çekirdek içindeyse sonuç doğrusal formüldür;
     dışındaysa σmaks büyür (dikdörtgen, tek yönde e > L/6: σmaks = 2N / (3·B·(L/2 − e))). Bileşke tabanın dışındaysa (devrilme) ok = false.
     Dönen { smax, smin (tam temas doğrusal formülüyle, kalkma göstergesi), temas (temas alanı / A), ok, at(x, y) → o noktadaki zemin gerilmesi } */
  P.temasGerilme = (poly, N, Mx, My, K, nb) => {
    K = K || P.cokgenKesit(poly); nb = nb || 80; const lin = P.dogrusalGerilme(K, N, Mx, My), smin = Math.min(...poly.map(p => lin(p[0], p[1])));
    if (!(N > 0)) return { smax: Infinity, smin, temas: 0, ok: false, at: () => 0 };
    if (smin >= -1e-9) return { smax: Math.max(...poly.map(p => lin(p[0], p[1]))), smin, temas: 1, ok: true, at: lin };
    const th = 0.5 * Math.atan2(-2 * K.Ixy, K.Ix - K.Iy), cs = Math.cos(th), sn = Math.sin(th);   // asal eksen açısı
    const uv = poly.map(p => { const x = p[0] - K.xc, y = p[1] - K.yc; return [x * cs + y * sn, -x * sn + y * cs]; }), u0 = Math.min(...uv.map(q => q[0])), v0 = Math.min(...uv.map(q => q[1])), du = (Math.max(...uv.map(q => q[0])) - u0) / nb, dv = (Math.max(...uv.map(q => q[1])) - v0) / nb, H = [];
    for (let i = 0; i < nb; i++) for (let j = 0; j < nb; j++) { const u = u0 + (i + 0.5) * du, v = v0 + (j + 0.5) * dv, x = u * cs - v * sn, y = u * sn + v * cs; if (pip([x + K.xc, y + K.yc], poly)) H.push([x, y]); }
    const dA = K.A / H.length;
    let akt = H.map(q => lin(q[0] + K.xc, q[1] + K.yc) > 0), abc = null;
    const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    for (let it = 0; it < 80; it++) { const M3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], r = [N, My, -Mx];
      H.forEach((q, k) => { if (!akt[k]) return; const v = [1, q[0], q[1]]; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) M3[a][b] += dA * v[a] * v[b]; });
      const D = det(M3); if (!(Math.abs(D) > 1e-12)) return { smax: Infinity, smin, temas: 0, ok: false, at: () => 0 };
      abc = [0, 1, 2].map(c => det(M3.map((row, i) => row.map((v, j) => (j === c ? r[i] : v)))) / D);
      const yeni = H.map(q => abc[0] + abc[1] * q[0] + abc[2] * q[1] > 0); if (yeni.every((v, k) => v === akt[k])) break; akt = yeni; if (!akt.some(Boolean)) return { smax: Infinity, smin, temas: 0, ok: false, at: () => 0 }; }
    const at = (x, y) => Math.max(0, abc[0] + abc[1] * (x - K.xc) + abc[2] * (y - K.yc));
    return { smax: Math.max(...poly.map(p => at(p[0], p[1]))), smin, temas: akt.filter(Boolean).length / H.length, ok: true, at };
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
    const temelEkle = (tur, ad, poly, t, zt, kolonSec, ekSec, boy) => { // boy: tekil temelin kendi eksenlerindeki ölçüleri { bx, by } (döndürülmüşte de)
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
      const TG = new Map(), tgOf = f => { const k = JSON.stringify(f); if (!TG.has(k)) { const [N, Mx, My] = komb(f); TG.set(k, P.temasGerilme(poly, N, Mx, My, K)); } return TG.get(k); };
      const sigma = (f, q) => tgOf(f).at(q[0], q[1]); // gerçek temas dağılımı (kısmi temasta temas dışı 0)
      /* zemin gerilmesi: çekirdek dışında kısmi temasla σmaks (P.temasGerilme). Kabul: G + Q altında kalkma olmaz (tam temas), depremli
         kombinasyonda kısmi temas kabul edilir ama σmaks ≤ σem ve bileşke taban içinde kalmalı (devrilme yok) */
      const zem = []; for (const tip of ['emn', 'dep']) for (const [ad2, f] of KOMB[tip]) { const N = komb(f)[0], tg = tgOf(f);
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
        for (const [yon, Lb, c] of [['X', boy ? boy.bx : TMq(poly, 0), +q.bx || 0.4], ['Y', boy ? boy.by : TMq(poly, 1), +q.by || 0.4]]) { let Mmax = 0, kb = '';
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
    for (const k of (TM.tekil || [])) { const poly = dikdortgen(k.x, k.y, k.bx, k.by, k.rot); temelEkle('tekil', k.no ? `Tekil temel ${k.no}` : `Tekil temel ${f2(k.bx)} × ${f2(k.by)}`, poly, k.t, k.zt, q => pip([q.x, q.y], poly), e => pip([e.x, e.y], poly), { bx: k.bx, by: k.by }); }
    for (const s of (TM.surekli || [])) { const L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]); if (L < 1e-6) continue; const n = [-(s.b[1] - s.a[1]) / L * s.B / 2, (s.b[0] - s.a[0]) / L * s.B / 2], poly = [[s.a[0] + n[0], s.a[1] + n[1]], [s.a[0] - n[0], s.a[1] - n[1]], [s.b[0] - n[0], s.b[1] - n[1]], [s.b[0] + n[0], s.b[1] + n[1]]];
      const yak = (x, y) => { const u = ((x - s.a[0]) * (s.b[0] - s.a[0]) + (y - s.a[1]) * (s.b[1] - s.a[1])) / (L * L); if (u < -0.02 || u > 1.02) return false; return Math.hypot(s.a[0] + (s.b[0] - s.a[0]) * u - x, s.a[1] + (s.b[1] - s.a[1]) * u - y) <= s.B / 2 + 0.05; };
      temelEkle('surekli', s.no ? `Sürekli temel ${s.no}` : `Sürekli temel (B = ${f2(s.B)})`, poly, s.h, s.zt, q => yak(q.x, q.y), e => yak(e.x, e.y)); }
    const kalan = T.filter(q => !kul.has(q)); if (kalan.length) uyar.push(`${kalan.map(q => q.no || 'S' + q.id).join(', ')}: altında temel bulunamadı (kolon ayağı temelin dışında).`);
    out.tur = [...new Set(out.temeller.map(o => o.tur))].join(' + ');
    out.ok = out.temeller.every(o => o.ok) && !kalan.length; out.T = T; out.gc = gc; out.gDolgu = gD0; return out;
  };

  /* ŞERİT PERDE (1 m genişlik, elle izlenebilir kontrol): yükseklik H, taban radyeye ankastre, üst 'serbest' (konsol) ya da 'mafsal' (döşeme
     ile tutulu). p(z): perdeye dik yayılı yük (kN/m², z tabandan yukarı). 60 elemanlı Euler-Bernoulli kiriş (tutarlı yük).
     Dönen { z[], M[] (kNm/m, + : yükün ittiği yüzün KARŞI yüzünde çekme), V[], Mt (taban), Mac (açıklıkta en büyük ters işaretli), Vt } */
  P.seritPerde = (H, p, ust) => {
    const n = 60, h = H / n, N = 2 * (n + 1), K = Array.from({ length: N }, () => new Float64Array(N)), F = new Float64Array(N), EI = 1;
    const ke = [[12, 6 * h, -12, 6 * h], [6 * h, 4 * h * h, -6 * h, 2 * h * h], [-12, -6 * h, 12, -6 * h], [6 * h, 2 * h * h, -6 * h, 4 * h * h]].map(r => r.map(v => v * EI / h ** 3));
    for (let e = 0; e < n; e++) { const d = [2 * e, 2 * e + 1, 2 * e + 2, 2 * e + 3]; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) K[d[a]][d[b]] += ke[a][b];
      const p0 = p(e * h), p1 = p((e + 1) * h); F[d[0]] += h * (7 * p0 + 3 * p1) / 20; F[d[1]] += h * h * (3 * p0 + 2 * p1) / 60; F[d[2]] += h * (3 * p0 + 7 * p1) / 20; F[d[3]] -= h * h * (2 * p0 + 3 * p1) / 60; }
    const K0 = Array.from(K[0]), F0 = F[0]; // taban kesme tepkisi için
    const sabit = [0, 1].concat(ust === 'mafsal' ? [2 * n] : []); for (const q of sabit) { for (let j = 0; j < N; j++) { K[q][j] = 0; K[j][q] = 0; } K[q][q] = 1; F[q] = 0; }
    const A = K.map(r => Array.from(r)), B = Array.from(F); for (let c = 0; c < N; c++) { let pv = c; for (let r = c + 1; r < N; r++) if (Math.abs(A[r][c]) > Math.abs(A[pv][c])) pv = r; [A[c], A[pv]] = [A[pv], A[c]]; [B[c], B[pv]] = [B[pv], B[c]]; for (let r = c + 1; r < N; r++) { const f = A[r][c] / A[c][c]; if (!f) continue; for (let k = c; k < N; k++) A[r][k] -= f * A[c][k]; B[r] -= f * B[c]; } }
    const u = new Array(N).fill(0); for (let r = N - 1; r >= 0; r--) { let t = B[r]; for (let k = r + 1; k < N; k++) t -= A[r][k] * u[k]; u[r] = t / A[r][r]; }
    // iç kuvvetler: düğümlerde M = EI·w'' (eleman uçlarından); kesme statik dengeden (üstten aşağı)
    const z = [], M = [], V = []; for (let i = 0; i <= n; i++) { const e = Math.min(i, n - 1), x = i - e, w = [u[2 * e], u[2 * e + 1], u[2 * e + 2], u[2 * e + 3]], xi = x;
      const B2 = [(-6 + 12 * xi) / h ** 2, (-4 + 6 * xi) / h, (6 - 12 * xi) / h ** 2, (-2 + 6 * xi) / h]; z.push(i * h); M.push(-EI * (B2[0] * w[0] + B2[1] * w[1] + B2[2] * w[2] + B2[3] * w[3])); }
    // kesme: taban tepkisinden (K·u − F, 0. serbestlik) ve yükün integralinden: V(z) = R0 + ∫0^z p
    const R0 = K0.reduce((t, k, j) => t + k * u[j], 0) - F0; let acc = 0; for (let i = 0; i <= n; i++) { if (i) acc += h * (p((i - 1) * h) + p(i * h)) / 2; V.push(R0 + acc); }
    const Mt = M[0]; let Mac = 0; for (let i = 1; i < n; i++) if (Math.sign(M[i]) !== Math.sign(Mt) && Math.abs(M[i]) > Math.abs(Mac)) Mac = M[i];
    return { z, M, V, Mt, Mac, Vt: Math.abs(V[0]) };
  };
  /* SUBASMAN / TEMEL PERDESİ (yalnız üst yapı yolu): radye üstündeki perdeler (S.kabuk.walls) şerit perde olarak.
     Dışta toprak itkisi Ks·γ·z + sürşarj Ks·q (zemin kotunun altında), içte dolgu itkisi K0·(γ·z + döşeme yükü) (dolgu üstünün altında),
     deprem: dış dinamik toprak itkisi artışı ½·ΔK·γ·Hs (yükseklik boyunca düzgün) + perde ataleti kh·γb·t. İki yüz ayrı ayrı yüklenir (yapım
     aşamasında biri boşken). Üst kenar: perde üstünde zemine oturan döşeme varsa mafsal, yoksa konsol. İç ve dış yüz aynı çap (firma kuralı). */
  P.subasmanHesap = (S, rap) => {
    const K = S.kabuk; if (!K || !Array.isArray(K.walls) || !K.walls.length || !K.radye) return [];
    const IT = P.itki(S), MAL = P.malzeme(S.mal), gc = S.mal.gc || 25, z0 = K.radye.kAlt + K.radye.t, zG = +S.geo.kZemin, gS = S.zemin.g, q = +S.zemin.q || 0, K0 = IT.K0, Ks = IT.Ks;
    const dv = Object.assign(P.cerceveVars ? P.cerceveVars() : {}, (S.cer && S.cer.ayar) || {}), ek = (S.temel && S.temel.ek) || [];
    const dol = ek.filter(e => e.tur === 'dolgu' && e.zt != null), dos = ek.filter(e => e.tur === 'doseme' && e.zt != null);
    const dTop = dol.length ? Math.max(...dol.map(e => e.zt)) : null, dsUst = dos.length ? Math.max(...dos.map(e => e.zt)) : null;
    const qDos = dos.length ? Math.max(...dos.map(e => gc * Math.max(0, e.zt - e.za) + (e.g != null ? e.g : +dv.gD || 1.5) + (e.q != null ? e.q : +dv.qD || 3.5))) : 0;
    const out = [];
    for (const w of K.walls) { const H = Math.max(0.1, +w.zt - z0), t = +w.t, d = t - (S.mal.cP || 0.05) - 0.01, ust = dsUst != null && Math.abs(dsUst - w.zt) <= 0.15 ? 'mafsal' : 'serbest';
      const Hs = Math.max(0, Math.min(zG, w.zt) - z0);
      const pDis = z => { const za = z0 + z; return za < zG ? Ks * (gS * (zG - za) + q) : 0; };
      const pIc = z => { const za = z0 + z; return dTop != null && za < dTop ? K0 * (gS * (dTop - za) + qDos) : 0; };
      const pE = z => (z0 + z < zG ? 0.5 * IT.dK * gS * Hs : 0) + IT.kh * gc * t;
      const r = (f, u) => P.seritPerde(H, f, u);
      // tasarım: modeldeki üst kenar koşulu (mafsal: zemine oturan döşeme perde üstünde) ile konsolun zarfı — döşeme dolguya oturduğu için
      // perdeyi tutması güvenilir sayılmaz; taban momenti konsoldan, açıklık momenti mafsallıdan gelir
      const Z = ['serbest', ust].filter((v, i, a) => a.indexOf(v) === i).map(u => ({ d: r(z => 1.6 * pDis(z), u), i: r(z => 1.6 * pIc(z), u), e: r(z => pDis(z) + pE(z), u) }));
      const Rk = Z[0].d, mx = f => Math.max(...Z.map(f));
      const Mdis = mx(q => Math.max(Math.abs(q.d.Mt), Math.abs(q.e.Mt), Math.abs(q.i.Mac))), Mic = mx(q => Math.max(Math.abs(q.i.Mt), Math.abs(q.d.Mac), Math.abs(q.e.Mac))), Md = Math.max(Mdis, Mic);
      const Rd = { Vt: mx(q => q.d.Vt) }, Ri = { Vt: mx(q => q.i.Vt) }, Re = { Vt: mx(q => q.e.Vt) };
      const sec = P.donatiSec({ M: Md, Ms: Md / 1.5, h: t, c: S.mal.cP || 0.05, kat: 2, su: false }, S, MAL), Vd = Math.max(Rd.Vt, Ri.Vt, Re.Vt), ks = P.kesme(Vd, d, MAL);
      out.push({ ad: w.ad || 'Perde', H, t, ust, Hs, dTop, qDos, Ks, K0, dK: IT.dK, kh: IT.kh, Mdis, Mic, Md, Vd, sec, kesme: ks, konsolMt: Math.abs(Rk.Mt), ok: !!(sec && sec.ok) && ks.ok,
        not: H <= 2 ? 'H ≤ 2 m: düşey donatı filizsiz tek parça, iki ucu gönyeli (firma kuralı)' : H < 6 ? 'H > 2 m: temel filizi + bindirme' : 'H ≥ 6 m: üç parça, yarı yükseklikte inşaat derzi' }); }
    return out;
  };
  /* TEMEL KABUĞU (yalnız üst yapı, radye + radye üstündeki subasman perdeleri): 3B kabuk motoru (statik-kabuk.js) ile Winkler zemininde plak;
     üst yapı kolon ayağı tepkileri (G, Q, deprem ±%5) düğüm yükü, radye üstündeki dolgu / zemin döşemesi / duvar yayılı yük, perdelerde toprak
     itkisi ve deprem. Radye eğilme donatısı (Wood–Armer, alt / üst) ve perde donatısı bu çözümden; zemin gerilmesinin yerel tepesi de. */
  P.temelKabuk = (S, RC) => {
    const K0 = S.kabuk; if (!K0 || !K0.radye || !Array.isArray(K0.walls) || !K0.walls.length || !P.kabukHesap) return null;
    const T = RC && P.kolonTepki ? P.kolonTepki(RC) : [];
    /* subasman perdesinin üstüne oturan tuğla duvar (ekseni bir perde ekseninden ≤ yarı kalınlık + 15 cm): ağırlığı duvar boyunca perde üstüne
       (≈ 1 m aralıklı düğüm yükleri); iç bölgedeki duvarlar P.radyeUstYuk ile radyeye yayılır */
    const dseg = (q, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2)); return Math.hypot(a[0] + dx * u - q[0], a[1] + dy * u - q[1]); };
    const perdeUstu = q => K0.walls.some(w => { const n = w.kapali ? w.pts.length : w.pts.length - 1; for (let i = 0; i < n; i++) if (dseg(q, w.pts[i], w.pts[(i + 1) % w.pts.length]) <= w.t / 2 + 0.15) return true; return false; });
    const duvarYuk = [], z0 = [0, 0, 0, 0, 0, 0];
    for (const e of ((S.temel && S.temel.ek) || []).filter(x => x.tur === 'duvar' && Array.isArray(x.eksen) && x.eksen.length >= 2)) { const E = e.eksen, n = e.kapali ? E.length : E.length - 1; let L = 0; for (let i = 0; i < n; i++) L += Math.hypot(E[(i + 1) % E.length][0] - E[i][0], E[(i + 1) % E.length][1] - E[i][1]);
      const orta = E.map((a, i) => [(a[0] + E[(i + 1) % E.length][0]) / 2, (a[1] + E[(i + 1) % E.length][1]) / 2]).slice(0, n); if (!(L > 0) || !orta.every(perdeUstu)) continue; const W = e.V * (P.TEMEL_GAMMA_TUGLA || 12);
      for (let i = 0; i < n; i++) { const a = E[i], b = E[(i + 1) % E.length], Li = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.round(Li)); for (let k = 0; k < m; k++) { const u = (k + 0.5) / m; duvarYuk.push({ id: null, no: `${e.ad || 'Duvar'} (perde üstü)`, x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, z: null, F: { G: [0, 0, -W * Li / L / m, 0, 0, 0], Q: z0, 'EX+': z0, 'EX-': z0, 'EY+': z0, 'EY-': z0 } }); } } }
    const K = Object.assign({}, K0, { kirisler: [], dosemeler: [], kolonYuk: P.kabukKolonYuku ? P.kabukKolonYuku(T.concat(duvarYuk)) : [] }); // zemine (dolguya) oturan döşeme kabuğa plak olarak girmez: yükü dolgu üstünden radyeye (P.radyeUstYuk), perde üstü serbest (konsol — güvenli taraf)
    const tas = Object.assign({}, S.tas, { wmax: Math.max(+S.tas.wmax || 0, P.TEMEL_WMAX) }); // su tutmayan temel: çatlak sınırı (kabul)
    return P.kabukHesap(Object.assign({}, S, { kabuk: K, tas }));
  };
  P.TEMEL_WMAX = 0.3;   // mm — su tutmayan temel ve subasman perdesinde çatlak genişliği sınırı (kabul; firma değeri sorulacak)
  /* temel kabuğu + şerit perde birleşik tasarım: her subasman perdesinde iki yöntemin büyüğü, iç ve dış yüz AYNI çap (firma kuralı);
     radyede alt ve üst AYNI çap (firma kuralı), 15 cm aralık önce */
  P.temelKabukHesap = (S, RC) => {
    const r = P.temelKabuk(S, RC); if (!r) return null; const sb = P.subasmanHesap(S), MAL = P.malzeme(S.mal);
    const tasG = Object.assign({}, S, { tas: Object.assign({}, S.tas, { wmax: Math.max(+S.tas.wmax || 0, P.TEMEL_WMAX) }) });
    const ortak = (M, h, c) => P.donatiSec({ M, Ms: M / 1.5, h, c, kat: 2, su: true }, tasG, MAL);
    const perde = r.tasarim.filter(T => T.grup.tur === 'dis' || T.grup.tur === 'ic').map(T => { const s0 = sb.find(q => q.ad === T.eleman) || null, k = T.katman;
      const Mk = Math.max(...k.filter(x => /düşey/.test(x.yon)).map(x => x.Meq || x.M)), Md = Math.max(Mk, s0 ? s0.Md : 0), Mh = Math.max(...k.filter(x => /yatay/.test(x.yon)).map(x => x.Meq || x.M));
      return { ad: T.eleman, t: T.grup.t, Mk, Ms: s0 ? s0.Md : null, serit: s0, Md, Mh, dusey: ortak(Md, T.grup.t, T.grup.c), yatay: ortak(Mh, T.grup.t, T.grup.c), kesme: T.kesme, H: s0 ? s0.H : null, not: s0 ? s0.not : '' }; });
    const R = r.tasarim.find(T => T.grup.tur === 'radye'), radye = R ? ['M11', 'M22'].map(y => { const k = R.katman.filter(x => x.yon.startsWith(y)), Mu = Math.max(...k.filter(x => x.yuz === 'üst').map(x => x.Meq || x.M)), Ma = Math.max(...k.filter(x => x.yuz === 'alt').map(x => x.Meq || x.M)), M = Math.max(Mu, Ma);
      return { yon: y === 'M11' ? 'X' : 'Y', Mu, Ma, sec: ortak(M, R.grup.t, R.grup.c) }; }) : [];
    const ok = perde.every(q => q.dusey && q.dusey.ok && q.yatay && q.yatay.ok && q.kesme.ok) && radye.every(q => q.sec && q.sec.ok) && (!R || R.kesme.ok) && r.qmax <= S.zemin.sig;
    return { r, sb, perde, radye, radyeT: R ? R.grup.t : null, radyeKesme: R ? R.kesme : null, qmax: r.qmax, sig: S.zemin.sig, ok };
  };
  const cmS = v => String(Math.round(v * 1000) / 10).replace('.', ',');
  P.temelKabukOzet = TK => { if (!TK) return ''; const d = ok => `<span class="pill ${ok ? 'ok' : 'bad'}">${ok ? 'UYGUN' : 'YETERSİZ'}</span>`, sc = q => (q && q.ok ? `Ø${q.F}/${cmS(q.s)}` : '—');
    return `<h3 style="margin-top:14px">Temel ve subasman perdesi (3B kabuk: radye + perde) ${d(TK.ok)}</h3><table class="t"><tr><th class="l">Eleman</th><th>M düşey / yatay (kNm/m)</th><th>Düşey donatı (iki yüz)</th><th>Yatay donatı (iki yüz)</th><th>Kesme Vd / Vcr</th></tr>${TK.perde.map(q => `<tr><td class="l">${esc(q.ad)} (${cmS(q.t)} cm)</td><td>${f2(q.Md, 1)} / ${f2(q.Mh, 1)}</td><td>${sc(q.dusey)}</td><td>${sc(q.yatay)}</td><td>${f2(q.kesme.Vd, 1)} / ${f2(q.kesme.Vcr, 1)}</td></tr>`).join('')}${TK.radye.map(q => `<tr><td class="l">Radye ${q.yon} (${cmS(TK.radyeT)} cm)</td><td>alt ${f2(q.Ma, 1)} · üst ${f2(q.Mu, 1)}</td><td colspan="2">${sc(q.sec)} alt + üst</td><td>${TK.radyeKesme ? f2(TK.radyeKesme.Vd, 1) + ' / ' + f2(TK.radyeKesme.Vcr, 1) : '—'}</td></tr>`).join('')}<tr><td class="l">Zemin gerilmesi (yerel tepe, plak)</td><td colspan="4">${f2(TK.qmax, 1)} ≤ ${f2(TK.sig, 0)} kN/m²</td></tr></table>`; };
  P.temelKabukRapor = (TK, f) => { if (!TK) return ''; f = f || f2; const sc = q => (q && q.ok ? `Ø${q.F}/${f(q.s * 100, 0)}` : 'yok');
    let h = `<h2 class="sayfa">TEMEL VE SUBASMAN PERDESİ — 3B KABUK (RADYE + PERDE)</h2><p>Radye ve radye üstündeki subasman (temel) perdeleri, Winkler zeminine oturan 3B kabuk modeliyle (perde ve radye kabuk elemanları) çözülmüştür. Yükler: üst yapı kolon ayağı tepkileri (G, Q, deprem ±%5 dışmerkezlik; kolon izi ve radye kalınlığı içindeki düğümlere rijit levha gibi dağıtılarak), radye üstündeki dolgu, zemine oturan döşeme ve duvarlar (yayılı), perdelerde dış toprak itkisi ve sürşarj, deprem (dinamik toprak itkisi ve atalet). Zemine (dolguya) oturan döşeme perde üstünü tutan plak sayılmamıştır (perde konsol, güvenli taraf).</p>`
      + `<p>Subasman perdesi ayrıca şerit perde olarak elle izlenebilir yöntemle hesaplanmıştır (taban ankastre; dışta toprak itkisi Ks·γ·z + sürşarj, içte dolgu itkisi K0·(γ·z + döşeme yükü), deprem; iki yüz ayrı yüklenir) ve iki yöntemin büyüğü alınmıştır. İç ve dış yüz donatısı aynı çaptır; radye alt ve üst donatısı aynı çaptır (firma kuralı). Çatlak genişliği sınırı ${f(P.TEMEL_WMAX, 1)} mm (su tutmayan temel — kabul).</p>`;
    h += `<table><tr><th class="l">Perde</th><th>H (m)</th><th>M düşey, kabuk (kNm/m)</th><th>M, şerit (kNm/m)</th><th>M yatay (kNm/m)</th><th>Düşey donatı</th><th>Yatay donatı</th><th>Vd / Vcr (kN/m)</th></tr>${TK.perde.map(q => `<tr><td class="l">${esc(q.ad)} (${f(q.t * 100, 0)} cm)</td><td>${q.H != null ? f(q.H) : '—'}</td><td>${f(q.Mk, 1)}</td><td>${q.Ms != null ? f(q.Ms, 1) : '—'}</td><td>${f(q.Mh, 1)}</td><td>${sc(q.dusey)} iç + dış</td><td>${sc(q.yatay)} iç + dış</td><td>${f(q.kesme.Vd, 1)} / ${f(q.kesme.Vcr, 1)}</td></tr>`).join('')}</table>`;
    for (const q of TK.perde) if (q.serit) h += `<p>${esc(q.ad)}: şerit perde Ks = ${f(q.serit.Ks, 3)}, K0 = ${f(q.serit.K0, 3)}, ΔK = ${f(q.serit.dK, 3)}, kh = ${f(q.serit.kh, 3)}; dolgu üstü ${q.serit.dTop != null ? f(q.serit.dTop) : '—'}, döşeme yükü ${f(q.serit.qDos, 1)} kN/m²; konsol taban momenti (1,6 × toprak) ${f(q.serit.konsolMt, 2)} kNm/m. ${esc(q.not)}.</p>`;
    h += `<table><tr><th class="l">Radye</th><th>M alt (kNm/m)</th><th>M üst (kNm/m)</th><th>Donatı (alt + üst)</th></tr>${TK.radye.map(q => `<tr><td class="l">${q.yon} doğrultusu (${f(TK.radyeT * 100, 0)} cm)</td><td>${f(q.Ma, 1)}</td><td>${f(q.Mu, 1)}</td><td>${sc(q.sec)}</td></tr>`).join('')}</table>`;
    h += `<p>Plak çözümünde zemin gerilmesinin yerel en büyük değeri ${f(TK.qmax, 1)} kN/m² (σem = ${f(TK.sig, 0)} kN/m²)${TK.radyeKesme ? `; radye kesmesi Vd = ${f(TK.radyeKesme.Vd, 1)} ≤ Vcr = ${f(TK.radyeKesme.Vcr, 1)} kN/m` : ''}.</p>`;
    return h; };
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
    f = f || f2; let h = `<h2 class="sayfa">TEMEL HESABI</h2><p>Yapı yalnız üst yapıdır (kabuk modeli yoktur): üst yapı çerçeve modeliyle çözülmüş, kolon ayağı tepkileri (3B çerçeve analizi) temele aktarılmıştır.</p>`
      + `<p>Temel rijit kabul edilmiştir. Yükler temel tabanının ağırlık merkezine indirgenir (N, Mx, My). Tam temasta gerilme σ = N/A + [(My·Ix + Mx·Ixy)·x − (Mx·Iy + My·Ixy)·y] / (Ix·Iy − Ixy²) ile bulunur (Ixy: çarpım atalet momenti; döndürülmüş ve simetrik olmayan tabanda sıfır değildir).</p>`
      + `<p>Bileşke çekirdek dışına çıkınca zemin çekme almadığından kısmi temas hesaplanır: taban asal eksenlere paralel küçük hücrelere bölünür, gerilmenin sıfırdan büyük olduğu temas bölgesi N, Mx, My dengesi sağlanana kadar yinelenerek bulunur (dikdörtgende tek yönlü dışmerkezlikte σmaks = 2N / (3·B·(L/2 − e)) ile aynıdır). Düşey yüklerde (G + Q) kalkmaya izin verilmez; depremli kombinasyonda kısmi temas kabul edilir, bileşke taban dışına çıkarsa devrilme sayılır.</p>`
      + `<p>Temelin üstüne oturan ve çerçevede olmayan elemanların (perde, tuğla duvar, dolgu, zemine oturan döşeme) ağırlıkları metrajla aynı net hacimlerden alınmıştır. Birim ağırlıklar: beton ${f(TH.gc, 0)} kN/m³, dolgu ${f(TH.gDolgu, 0)} kN/m³, tuğla duvar ${f(P.TEMEL_GAMMA_TUGLA, 0)} kN/m³ (tuğla birim ağırlığı kabuldür).</p>`
      + `<p>Zımbalama TS 500 8.3.1'e göre kolon yüzünden d/2 uzaktaki çevrede hesaplanmıştır: Vpd = Nd − q_net·b1·b2 ≤ Vpr = γ·fctd·up·d, γ = 1 / (1 + 1,5·(ex + ey) / √(b1·b2)), e = M / Vpd. q_net, kolon noktasındaki gerçek temas gerilmesinden temelin ve üstündeki yayılı yüklerin payı çıkarılarak bulunur (kolon temas dışındaysa 0).</p>`;
    TH.uyar.forEach(u => h += `<p><b>Uyarı:</b> ${esc(u)}</p>`);
    for (const o of TH.temeller) {
      h += `<h3>${esc(o.ad)} — ${TUR_AD[o.tur] || o.tur}</h3><p>Taban alanı A = ${f(o.A)} m², Ix = ${f(o.K.Ix)} m⁴, Iy = ${f(o.K.Iy)} m⁴, Ixy = ${f(o.K.Ixy)} m⁴, kalınlık ${f(o.t * 100, 0)} cm, taban kotu ${f(o.zb)}.</p><p>Üstündeki kolonlar: ${o.kol.length ? esc(o.kol.join(', ')) : '—'}</p>`;
      h += `<table><tr><th class="l">Yük</th><th>G (kN)</th><th>Q (kN)</th></tr><tr><td class="l">Temel öz ağırlığı</td><td>${f(o.Gs, 1)}</td><td>—</td></tr>${o.ek.map(e => `<tr><td class="l">${esc(e.ad)} (${esc(e.tur)})</td><td>${f(e.Gk, 1)}</td><td>${e.Qk ? f(e.Qk, 1) : '—'}</td></tr>`).join('')}<tr><td class="l">Kolon ayağı tepkileri (${o.kol.length} kolon)</td><td>${f(o.B.G[0] - o.Gs - o.Gek, 1)}</td><td>${f(o.B.Q[0] - o.Qek, 1)}</td></tr><tr><th class="l">Toplam N</th><th>${f(o.B.G[0], 1)}</th><th>${f(o.B.Q[0], 1)}</th></tr></table>`;
      h += `<table><tr><th class="l">Kombinasyon</th><th>N (kN)</th><th>σ<sub>ort</sub></th><th>σ<sub>maks</sub></th><th>σ<sub>min</sub> (kN/m²)</th><th>σ<sub>em</sub></th><th></th></tr>${o.zem.map(z => `<tr><td class="l">${z.ad}</td><td>${f(z.N, 1)}</td><td>${f(z.ort, 1)}</td><td>${f(z.smax, 1)}</td><td>${f(z.smin, 1)}</td><td>${f(o.sig, 0)}</td><td>${z.ok ? (z.temas < 1 ? 'UYGUN (kısmi temas %' + f(z.temas * 100, 0) + ')' : 'UYGUN') : z.devrilme ? 'DEVRİLME' : z.smax > o.sig ? 'YETERSİZ' : 'KALKMA'}</td></tr>`).join('')}</table>`;
      if (o.zimb.length) h += `<p>Zımbalama (her kolon için en elverişsiz taşıma gücü kombinasyonu), faydalı yükseklik d = ${f(o.zimb[0].d * 100, 0)} cm</p><table><tr><th class="l">Kolon</th><th>Komb.</th><th>N<sub>d</sub> (kN)</th><th>q<sub>net</sub> (kN/m²)</th><th>u<sub>p</sub> (m)</th><th>γ</th><th>V<sub>pd</sub> (kN)</th><th>V<sub>pr</sub> (kN)</th><th></th></tr>${o.zimb.map(z => `<tr><td class="l">${esc(z.kolon)}</td><td>${z.komb}</td><td>${f(z.Nd, 1)}</td><td>${f(z.qn, 1)}</td><td>${f(z.up)}</td><td>${f(z.gam, 3)}</td><td>${f(z.Vpd, 1)}</td><td>${f(z.Vpr, 1)}</td><td>${z.ok ? 'UYGUN' : 'YETERSİZ'}</td></tr>`).join('')}</table>`;
      if (o.egil) h += `<table><tr><th class="l">Eğilme (kolon yüzü)</th><th>M<sub>d</sub> (kNm/m)</th><th>A<sub>s</sub> ger. (cm²/m)</th><th>Seçilen</th></tr>${o.egil.map(e => `<tr><td class="l">${e.yon} doğrultusu (${e.komb})</td><td>${f(e.M, 1)}</td><td>${f(e.sec.req * 1e4)}</td><td>${e.sec.ok ? `Ø${e.sec.F}/${f(e.sec.s * 100, 0)} alt` : 'sığmıyor'}</td></tr>`).join('')}</table>`;
      if (o.tur === 'radye' && !TH.kabukVar) h += `<p class="f">Not: radye eğilme donatısı bu hesapta yapılmamıştır (rijit temel kabulüyle yalnız zemin gerilmesi ve zımbalama). Radye donatısı için elastik zemine oturan plak çözümü gerekir.</p>`;
    }
    return h;
  };
})(typeof window !== 'undefined' ? window : globalThis);

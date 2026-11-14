/* ArıtmaCAD — STATİK: YAPI TÜRÜNE GÖRE ÇÖZÜM YOLU (statik.html eklentisi)
   Firma kuralı: docs/tasarim-standartlari.md › "Statik ve donatı" › "Yapı türüne göre statik çözüm yolu" (14.11.2026, kullanıcı onayladı).
   Program yapının türünü modelden önerir, kullanıcı statik penceresinde değiştirebilir:
     su     : su yapısı (havuz, hazne, tank)         → yalnız 3B kabuk (perde, radye, döşeme)
     altUst : gömülü alt yapı + üst yapı (terfi merkezi) → iki aşama: üst yapı çerçeve (kolon ayakları alt yapı üst kotunda ankastre),
              alt yapı 3B kabuk (toprak + su + üst yapının kolon ayağı tepkileri)
     ust    : yalnız üst yapı (bekçi, idari bina)    → çerçeve + temel hesabı; üst yapı için kabuk modeli kurulmaz, radye ile subasman
              perdeleri birlikte Winkler zeminli küçük kabukla (şerit perde hesabıyla birlikte, büyüğü) çözülür
   Öneri ölçütleri (P.yapiTuru, saf): zeminin altında betonarme perde var mı (perde üstü ≤ en yüksek toprak / tretuvar kotu), haznede su
   var mı, alt yapının üstünde kolonlu / kirişli kat var mı. Alt yapı üst kotu = zeminin altında kalan perdelerin en yüksek üst kotu.
   Seçim projeye yazılır: C.doc.set.statikAyar.yapiTuru / altUstKot (eski projelerde alan yoksa öneri kullanılır). */
(function (G) {
  'use strict';
  const P = G.STATIK = G.STATIK || {};
  const r3 = v => Math.round(v * 1000) / 1000, f2 = (v, d = 2) => (v == null || !isFinite(v) ? '—' : (+v).toFixed(d).replace('.', ','));
  P.YAPI_TURU = { su: 'Su yapısı — 3B kabuk (perde, radye, döşeme)', altUst: 'Gömülü alt yapı + üst yapı — iki aşama (üst yapı çerçeve, alt yapı 3B kabuk)', ust: 'Yalnız üst yapı — çerçeve + temel (radye ve subasman perdesi küçük kabukla)' };
  P.YAPI_TURU_KISA = { su: 'Su yapısı', altUst: 'Alt yapı + üst yapı', ust: 'Yalnız üst yapı' };

  /* hazır proje yeri değerleri (zemin + deprem): kaynak raporlardan, elle seçilir ve projeye yazılır
     Çokal AAT (Saray / Tekirdağ): CKL_AAT_GB_R0 (güvenlik binası, 2026) — TBDY 2018 DD-2 ZC, Ss 1,353 S1 0,366 → SDS 1,624 SD1 0,549 (DD-3: 0,668 / 0,196),
     R 8 D 3 I 1 (BKS 3), qt = 20 / 1,4 = 14,29 t/m², düşey yatak katsayısı 2400 t/m³; geri dolgu (ÇOKAL_AAT_SR_R2): φ 30°, γ 18 / 20 kN/m³, Ka Coulomb,
     sürşarj 5 kN/m²; perde dinamik toprak itkisinde r = 1,5. */
  P.HAZIR_YER = {
    cokal: { ad: 'Çokal AAT — Saray / Tekirdağ (CKL_AAT_GB_R0, ÇOKAL_AAT_SR_R2)', ayar: { SDS: 1.624, SD1: 0.549, SDS3: 0.668, SD13: 0.196, R: 8, D: 3, I: 1, n: 0.3 },
      zemin: { g: 18, gs: 20, phi: 30, dR: 0.667, K: 'KA', kw: 23544, sig: 140.2, q: 5 }, dep: { yon: 'TBDY2018', SDS: 1.624, r: 1.5, I: 1, yontem: 'MO', eYAS: true }, mal: { fck: 30, fyk: 420 } },   // C30 / S420 (B420C)
  };
  P.hazirYerAyar = k => { const H = P.HAZIR_YER[k]; return H ? Object.assign({}, H.ayar, { zemin: Object.assign({}, H.zemin), dep: Object.assign({}, H.dep), ...(H.mal ? { mal: Object.assign({}, H.mal) } : {}), yer: k }) : null; };
  /* d: STATIKMODEL verisi { kabuk?, geo?, cerceve?, zeminKot?, su?, statikAyar? } → { tur, altUstKot, zeminKot, su, ustVar, gomulu, neden[] } */
  P.yapiTuru = d => {
    d = d || {}; const K = d.kabuk || null, CF = d.cerceve || {}, neden = [];
    const rad = K && K.radye ? K.radye : d.geo && d.geo.kAlt != null ? { kAlt: +d.geo.kAlt, t: +d.geo.hr || 0 } : null, rUst = rad ? rad.kAlt + rad.t : null;
    // betonarme perdeler (z0, zt): çerçeve listesinden (tüm beton perdeler) ya da kabuk perdelerinden (radye üstünden)
    let perde = (CF.perdeler || []).map(w => ({ z0: +w.z0, zt: +w.zt }));
    if (!perde.length && K) perde = (K.walls || []).map(w => ({ z0: rUst != null ? rUst : +w.zt - 3, zt: +w.zt }));
    if (!perde.length && d.geo && d.geo.kUst != null && rUst != null) perde = [{ z0: rUst, zt: +d.geo.kUst }];
    perde = perde.filter(w => isFinite(w.z0) && isFinite(w.zt) && w.zt - w.z0 >= 0.3);              // kicker / su tutucu bant kaidesi sayılmaz
    const zG = d.zeminKot != null && isFinite(+d.zeminKot) ? +d.zeminKot : null;
    const su = d.su === true || !!(K && Array.isArray(K.senaryolar) && K.senaryolar.length);
    // zeminin altında kalan perde: üstü zemin kotunun altında (5 cm tolerans), en az 1 m gömülü
    const gomulu = zG != null ? perde.filter(w => w.zt <= zG + 0.05 && zG - w.z0 >= 1.0) : [];
    const altUstKot = gomulu.length ? r3(Math.max(...gomulu.map(w => w.zt))) : null;
    // üst yapı: alt yapının (yoksa perde / radye üstünün) en az 50 cm üstüne çıkan kolon ya da kiriş
    const perdeUst = perde.length ? Math.max(...perde.map(w => w.zt)) : null;
    const zRef = altUstKot != null ? altUstKot : su && perdeUst != null ? perdeUst : rUst != null ? rUst : -Infinity;
    const kol = (CF.kolonlar || []).filter(c => +c.zt > zRef + 0.5), kir = (CF.kirisler || []).filter(k => +k.zt > zRef + 0.5), ustVar = !!(kol.length || kir.length);
    const kabukVar = !!(K && (K.walls || []).length && K.radye) || !!(d.geo && rUst != null && perde.length);
    let tur = null;
    if (zG == null) neden.push('Modelde zemin (toprak / tretuvar) kotu yok: perdelerin zeminin altında kalıp kalmadığı bilinmiyor.');
    else neden.push(`Zemin kotu ${f2(zG)} (en yüksek toprak / tretuvar).`);
    if (gomulu.length) neden.push(`${gomulu.length} betonarme perde zeminin altında (üst kot ${f2(altUstKot)}).`);
    else if (perde.length) neden.push(zG != null ? `Betonarme perdelerin üstü zeminin üstünde (en yüksek ${f2(perdeUst)}) — gömülü alt yapı yok.` : `${perde.length} betonarme perde var.`);
    if (su) neden.push('Haznede su var.');
    if (ustVar) neden.push(`Üstünde kolonlu / kirişli kat var (${kol.length} kolon, ${kir.length} kiriş ${f2(zRef)} kotunun üstünde).`);
    if (gomulu.length && ustVar) tur = 'altUst';
    else if (su && ustVar && perde.length) tur = 'altUst';                                             // susuz kat altında hazne: hazne alt yapı
    else if (kabukVar && !ustVar) tur = 'su';
    else if (ustVar || (CF.kolonlar || []).length || (CF.kirisler || []).length) tur = 'ust';
    else if (kabukVar) tur = 'su';
    const kot = tur === 'altUst' ? (altUstKot != null ? altUstKot : perdeUst != null ? r3(perdeUst) : null) : null;
    return { tur, altUstKot: kot, zeminKot: zG, su, ustVar, gomulu: gomulu.length, neden };
  };
  /* model + proje ayarı → geçerli seçim { tur, altUstKot, oneri, elle } (eski projede alan yoksa öneri) */
  P.yapiSecim = (d, A) => {
    const o = P.yapiTuru(d); A = A || (d && (d.statikAyar || (d.cerceve && d.cerceve.ayar))) || {};
    const elle = !!P.YAPI_TURU[A.yapiTuru], tur = elle ? A.yapiTuru : o.tur;
    const k = A.altUstKot != null && A.altUstKot !== '' && isFinite(+A.altUstKot) ? +A.altUstKot : o.altUstKot;
    return { tur, altUstKot: k != null ? k : o.altUstKot, oneri: { tur: o.tur, altUstKot: o.altUstKot, neden: o.neden }, elle, elleKot: A.altUstKot != null && A.altUstKot !== '' };
  };

  /* ---------- projeye kayıtlı zemin / deprem / kot değerleri (C.doc.set.statikAyar → d.statikAyar) pencere girdisine ----------
     A.zemin {g, gs, phi, dR, K, kw, sig, q}, A.dep {yon, SDS, r, I, yontem, eYAS}, A.kot {kZemin, kYAS (null = yok), kSu (null = kuru hazne)}.
     Eskiden yalnız deprem (SDS) okunuyordu; zemin pencerenin varsayılanıyla (φ 25, K0, q 15) kalıyor, sonuç projeden projeye değişiyordu. */
  P.statikAyarUygula = (S, d) => {
    const A = (d && (d.statikAyar || (d.cerceve && d.cerceve.ayar))) || {}, out = [], V = P.ornekSaray ? P.ornekSaray() : null, eksik = [];
    /* projede kayıt yoksa ÖNCEKİ projenin pencere değerleri devralınmaz: örnek varsayılanlara dönülür ve görünür uyarı verilir (S.ayarUyari) */
    if (A.zemin && typeof A.zemin === 'object') { S.zemin = Object.assign({}, V ? V.zemin : {}, A.zemin); out.push('zemin'); } else { if (V) S.zemin = Object.assign({}, V.zemin); eksik.push('zemin'); }
    if (A.dep && typeof A.dep === 'object') { S.dep = Object.assign({}, V ? V.dep : {}, A.dep); out.push('deprem'); } else { if (V) S.dep = Object.assign({}, V.dep); if (+A.SDS > 0) S.dep.SDS = +A.SDS; else eksik.push('deprem'); }
    if (A.mal && typeof A.mal === 'object') { S.mal = Object.assign({}, S.mal || {}, A.mal); out.push('malzeme'); }
    S.yer = A.yer || null;
    S.ayarUyari = eksik.length ? `${eksik.join(' ve ')} değerleri projede kayıtlı değil — varsayılanlar kullanılıyor (zemin emniyet gerilmesi ${f2(S.zemin.sig, 0)} kN/m², φ ${f2(S.zemin.phi, 0)}°, S<sub>DS</sub> ${f2(S.dep.SDS, 3)}); lütfen statik penceresinde girin (ArıtmaCAD penceresi açıksa projeye kaydedilir).` : null;
    if (A.kot && typeof A.kot === 'object' && S.geo) { const g = S.geo, K = S.kabuk && S.kabuk.radye, zTop = K ? K.kAlt + K.t : (+g.kAlt || 0) + (+g.hr || 0);
      if (A.kot.kZemin != null && isFinite(+A.kot.kZemin)) g.kZemin = +A.kot.kZemin;
      if ('kYAS' in A.kot) g.kYAS = A.kot.kYAS == null || A.kot.kYAS === '' ? null : +A.kot.kYAS;
      if ('kSu' in A.kot) g.kSu = A.kot.kSu == null || A.kot.kSu === '' ? r3(zTop) : +A.kot.kSu;
      out.push('kotlar'); }
    return out;
  };

  /* radye (kabuk) üstüne oturan, kabukta ve çerçevede eleman olmayan yükler: sıkıştırılmış dolgu, zemine oturan döşeme (taban betonu, kaide).
     Net hacim × birim ağırlık (beton S.mal.gc, dolgu S.zemin.g) + döşeme kaplama g / hareketli q; plan çokgenine yayılı (kN/m²) */
  P.radyeUstYuk = S => {
    const T = S && S.temel; if (!T || !Array.isArray(T.ek) || !S.kabuk) return [];
    const gc = (S.mal && S.mal.gc) || 25, gD0 = (S.zemin && +S.zemin.g) || 18, dv = Object.assign(P.cerceveVars ? P.cerceveVars() : {}, (S.cer && S.cer.ayar) || {}), gD = +dv.gD || 1.5, qD = +dv.qD || 3.5;
    const haric = new Set([...(S.kabuk.dosemeler || []), ...((S.cer && S.cer.dosemeler) || [])].map(x => x.id).filter(x => x != null));
    const alan = q => { let a = 0; for (let i = 0; i < q.length; i++) { const u = q[i], v = q[(i + 1) % q.length]; a += u[0] * v[1] - v[0] * u[1]; } return Math.abs(a) / 2; };
    /* yalnız hazne içi (dış perdelerin arası): perdelerin dışında radye çıkıntısı üstündeki dolgu kabukta zaten toprak yükü (Ht) olarak var */
    const pipq = (q, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    const hull = pts => { const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
    const kap = (S.kabuk.walls || []).filter(w => w.tip === 'dis' && w.kapali).sort((a, b) => alan(b.pts) - alan(a.pts)), IC = kap.length ? kap[0].pts : hull((S.kabuk.walls || []).filter(w => w.tip === 'dis').flatMap(w => w.pts));
    const merkez = q => { let A = 0, x = 0, y = 0; for (let i = 0; i < q.length; i++) { const [x0, y0] = q[i], [x1, y1] = q[(i + 1) % q.length], c = x0 * y1 - x1 * y0; A += c; x += (x0 + x1) * c; y += (y0 + y1) * c; } return Math.abs(A) > 1e-12 ? [x / (3 * A), y / (3 * A)] : q[0]; };
    // tuğla duvar (zemin döşemesi / dolgu üstünde, hazne içinde): ağırlığı iç bölgeye yayılı (kabul — duvar altı şerit yükü ayrıca alınmaz)
    // perdenin üstündeki duvar (ekseninin her parçası bir kabuk perdesi ekseninden ≤ yarı kalınlık + 15 cm) radye yükü değildir: perde üstüne
    // ayrıca yüklenir (P.temelKabuk) — sınırdaki pip belirsizliğine bırakılmaz
    const ekL = T.ek.filter(e => e.tur === 'duvar' && IC.length >= 3 && !P.duvarPerdeUstu(e, S.kabuk.walls) && pipq([e.x, e.y], IC) && !(Array.isArray(e.eksen) && e.eksen.some(q => !pipq(q, IC)))).map(e => Object.assign({}, e, { pts: IC, tur: 'duvar' }));
    return T.ek.filter(e => (e.tur === 'dolgu' || e.tur === 'doseme') && Array.isArray(e.pts) && e.pts.length >= 3 && !haric.has(e.id) && (IC.length < 3 || pipq(merkez(e.pts), IC))).concat(ekL).map(e => { const A = alan(e.pts), gam = e.tur === 'dolgu' ? gD0 : e.tur === 'duvar' ? (P.TEMEL_GAMMA_TUGLA || 12) : gc, G = e.V * gam + (e.tur === 'doseme' ? (e.g != null ? e.g : gD) * A : 0), Q = e.tur === 'doseme' ? (e.q != null ? e.q : qD) * A : 0;
      return { id: e.id, ad: e.ad, tur: e.tur, pts: e.pts, A, V: e.V, gam, G, Q, pG: A > 0 ? G / A : 0, pQ: A > 0 ? Q / A : 0 }; }).filter(y => y.A > 0);
  };
  /* tuğla duvar bir kabuk perdesinin üstünde mi: ekseninin her parçasının ortası bir perde ekseninden ≤ yarı kalınlık + 15 cm (saf) */
  P.duvarPerdeUstu = (e, walls) => {
    const E = e && e.eksen; if (!Array.isArray(E) || E.length < 2 || !Array.isArray(walls) || !walls.length) return false;
    const dsg = (q, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2)); return Math.hypot(a[0] + dx * u - q[0], a[1] + dy * u - q[1]); };
    const ustu = q => walls.some(w => { const n = w.kapali ? w.pts.length : w.pts.length - 1; for (let i = 0; i < n; i++) if (dsg(q, w.pts[i], w.pts[(i + 1) % w.pts.length]) <= w.t / 2 + 0.15) return true; return false; });
    const n = e.kapali ? E.length : E.length - 1; for (let i = 0; i < n; i++) { const a = E[i], b = E[(i + 1) % E.length]; if (!ustu([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])) return false; } return true;
  };
  /* perde üstündeki tuğla duvarların ağırlığı (radye yükünden çıkarılanlar): duvar boyunca ≈ 1 m aralıklı düğüm yükleri (G), perde üst
     düğümüne (kimliksiz yük → en yakın perde üst düğümü). Bütün kabuk yollarında (su yapısı, alt + üst yapı, temel kabuğu) P.kabukHesap ekler. */
  P.perdeUstuDuvarYuk = S => {
    const ek = (S && S.temel && S.temel.ek) || [], walls = (S && S.kabuk && S.kabuk.walls) || [], out = [], z0 = [0, 0, 0, 0, 0, 0];
    for (const e of ek.filter(x => x.tur === 'duvar' && P.duvarPerdeUstu(x, walls))) { const E = e.eksen, n = e.kapali ? E.length : E.length - 1; let L = 0; for (let i = 0; i < n; i++) L += Math.hypot(E[(i + 1) % E.length][0] - E[i][0], E[(i + 1) % E.length][1] - E[i][1]);
      if (!(L > 0)) continue; const W = e.V * (P.TEMEL_GAMMA_TUGLA || 12);
      for (let i = 0; i < n; i++) { const a = E[i], b = E[(i + 1) % E.length], Li = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.round(Li)); for (let k = 0; k < m; k++) { const u = (k + 0.5) / m;
        out.push({ id: null, no: `${e.ad || 'Duvar'} (perde üstü)`, x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, z: null, F: { G: [0, 0, -W * Li / L / m, 0, 0, 0], Q: z0, ESX: z0, ESY: z0 } }); } } }
    return out;
  };
  P.ayarUyariHtml = (S, rapor) => (S && S.ayarUyari ? (rapor ? `<p><b>UYARI:</b> ${S.ayarUyari}</p>` : `<div class="msg">${S.ayarUyari}</div>`) : '');
  /* ---------- statik eleman listesi: metrajla aynı NET hacimler (STATIKMODEL › d.hacim, app/yapi-cakisma.js) ----------
     Hesap ağı eksen modelidir (perdeler eksenden eksene, köşelerde ve kolon izlerinde üst üste biner); yapı ağırlığı, yüzme tahkiki ve
     eleman listesi bu net hacimlerle verilir. netHacimBol: alt yapı üst kotunda (kot) ikiye böler — kolon kotun altındaki kısmıyla alt yapıya. */
  P.netHacimBol = (H, kot) => {
    const alt = {}, ust = {}; let a = 0, u = 0;
    for (const e of (H && H.liste) || []) { let va = 0, vu = 0;
      for (const [za, zb, A] of (e.dz || [])) { va += A * Math.max(0, Math.min(zb, kot) - za); vu += A * Math.max(0, zb - Math.max(za, kot)); }
      if (!(e.dz && e.dz.length)) va = e.net;
      if (va > 1e-6) alt[e.ad] = r3((alt[e.ad] || 0) + va); if (vu > 1e-6) ust[e.ad] = r3((ust[e.ad] || 0) + vu); a += va; u += vu; }
    return { alt, ust, altTop: r3(a), ustTop: r3(u) };
  };
  P.netAgirlik = S => {
    const H = S && S.hacim; if (!H || !Array.isArray(H.liste) || !H.liste.length) return null;
    const gc = (S.mal && S.mal.gc) || 25, kot = S.yapi && S.yapi.tur === 'altUst' && S.yapi.altUstKot != null ? +S.yapi.altUstKot : null;
    const top = kot != null ? P.netHacimBol(H, kot).alt : H.top, rows = Object.entries(top).filter(([, v]) => v > 1e-6).map(([ad, V]) => ({ ad, V }));
    const V = rows.reduce((s, q) => s + q.V, 0); return { rows, V: r3(V), G: V * gc, gc, kot };
  };
  // rapor bölümü: tür tür brüt / net hacim (ve alt + üst yapıda kotla ayrımı)
  P.elemanListesiHtml = (S, f) => {
    const H = S && S.hacim; if (!H || !Array.isArray(H.liste) || !H.liste.length) return '';
    f = f || f2; const gc = (S.mal && S.mal.gc) || 25, kot = S.yapi && S.yapi.tur === 'altUst' && S.yapi.altUstKot != null ? +S.yapi.altUstKot : null, B = kot != null ? P.netHacimBol(H, kot) : null;
    const tur = {}; for (const e of H.liste) { const o = tur[e.ad] = tur[e.ad] || { n: 0, brut: 0, net: 0 }; o.n++; o.brut += e.brut; o.net += e.net; }
    let h = `<h3>Statik eleman listesi (net hacim)</h3><p>Hacimler metrajla aynı net parçalardan alınmıştır (birleşim önceliği: temel / radye &gt; kolon &gt; perde &gt; kiriş &gt; döşeme; aynı hacim iki kez sayılmaz). Tuğla duvar, dolgu ve zemine oturan döşemeler (taban betonu, kaide) statik eleman değildir. Sonlu eleman ağı eleman eksenlerinden kurulduğu için ağdaki öz ağırlık bu listeden biraz farklı olabilir; yapı ağırlığı ve yüzme tahkikinde bu liste kullanılır.</p>`;
    h += `<table><tr><th class="l">Eleman</th><th>Adet</th><th>Brüt (m³)</th><th>Net (m³)</th>${B ? `<th>Alt yapı (m³)</th><th>Üst yapı (m³)</th>` : ''}<th>Ağırlık (kN)</th></tr>`;
    let tb = 0, tn = 0; for (const [ad, o] of Object.entries(tur)) { tb += o.brut; tn += o.net; h += `<tr><td class="l">${ad}</td><td>${o.n}</td><td>${f(o.brut)}</td><td>${f(o.net)}</td>${B ? `<td>${f(B.alt[ad] || 0)}</td><td>${f(B.ust[ad] || 0)}</td>` : ''}<td>${f(o.net * gc, 0)}</td></tr>`; }
    h += `<tr><th class="l">Toplam</th><th></th><th>${f(tb)}</th><th>${f(tn)}</th>${B ? `<th>${f(B.altTop)}</th><th>${f(B.ustTop)}</th>` : ''}<th>${f(tn * gc, 0)}</th></tr></table>`;
    if (B) h += `<p>Alt yapı üst kotu ${f(kot)}: kolonların bu kotun altındaki kısmı alt yapıya (perde içinde), üstündeki kısmı üst yapıya sayılmıştır.</p>`;
    return h;
  };

  /* ================= PENCERE (yalnız tarayıcıda) ================= */
  if (typeof document === 'undefined' || typeof G.buildForm !== 'function' || typeof G.modelUygula !== 'function') return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = s => document.querySelector(s);
  const Sx = () => (typeof S !== 'undefined' ? S : null);   // statik.html'in S değişkeni
  // projeye yaz (ArıtmaCAD penceresi açıksa): C.doc.set.statikAyar
  const projeyeYaz = o => { let OC = null; try { OC = G.opener && G.opener.C && G.opener.C._statikAyarYaz ? G.opener.C : null; } catch (er) { OC = null; } if (!OC) return false; try { OC._statikAyarYaz(o); return true; } catch (er) { console.error(er); return false; } };
  const kutu = () => {
    const s = Sx(); if (!s || !s.yapi || !s.yapi.tur) return null;
    const y = s.yapi, o = y.oneri || {}, w = document.createElement('details'); w.className = 'sec'; w.open = true; w.id = 'yapiTuruKutu';
    w.innerHTML = `<summary>Yapı türü (statik çözüm yolu)</summary><div class="body">
      <label class="f full">Yapı türü<select id="selYapiTuru">${Object.entries(P.YAPI_TURU).map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('')}</select></label>
      ${y.tur === 'altUst' ? `<label class="f">Alt yapı üst kotu (m)<input id="inAltUst" value="${y.altUstKot != null ? y.altUstKot : ''}"></label><div class="hint" style="align-self:end">Bu kotun altındaki perde, radye, döşeme ve kirişler alt yapı (kabuk); üstündekiler üst yapı (çerçeve).</div>` : ''}
      <label class="f full">Hazır zemin ve deprem değerleri (proje yeri)<select id="selYer"><option value="">— seçin (projeye yazılır) —</option>${Object.entries(P.HAZIR_YER).map(([k, h]) => `<option value="${k}">${esc(h.ad)}</option>`).join('')}</select></label>
      <p class="hint full">Program önerisi: <b>${esc(P.YAPI_TURU_KISA[o.tur] || '—')}</b>${o.tur === 'altUst' && o.altUstKot != null ? ` (alt yapı üst kotu ${f2(o.altUstKot)})` : ''}. ${esc((o.neden || []).join(' '))}${y.elle || y.elleKot ? ' <b>Seçim elle değiştirildi.</b> <a href="#" id="yapiOneri">Öneriye dön</a>' : ''}</p></div>`;
    const sel = w.querySelector('#selYapiTuru'); sel.value = y.tur;
    sel.onchange = () => { y.tur = sel.value; y.elle = y.tur !== o.tur; if (y.tur === 'altUst' && y.altUstKot == null) y.altUstKot = o.altUstKot; const ok = projeyeYaz({ yapiTuru: y.elle ? y.tur : null }); bildir(ok); G.buildForm(); changed(); };
    const inp = w.querySelector('#inAltUst'); if (inp) inp.onchange = () => { const v = parseFloat(String(inp.value).replace(',', '.')); if (isFinite(v)) { y.altUstKot = r3(v); y.elleKot = Math.abs(v - (o.altUstKot != null ? o.altUstKot : NaN)) > 1e-4; } else { y.altUstKot = o.altUstKot; y.elleKot = false; } const ok = projeyeYaz({ altUstKot: y.elleKot ? y.altUstKot : null }); bildir(ok); G.buildForm(); changed(); };
    const yer = w.querySelector('#selYer'); if (yer) { const s0 = Sx(); yer.value = (s0 && s0.yer) || ''; yer.onchange = () => { const A = P.hazirYerAyar(yer.value); if (!A) return; const s1 = Sx();
      s1.zemin = Object.assign({}, s1.zemin, A.zemin); s1.dep = Object.assign({}, s1.dep, A.dep); if (A.mal) s1.mal = Object.assign({}, s1.mal, A.mal); if (s1.cer) s1.cer.ayar = Object.assign({}, s1.cer.ayar || {}, P.HAZIR_YER[yer.value].ayar); s1.yer = yer.value; s1.ayarUyari = null; s1._ayarImza = JSON.stringify([s1.zemin, s1.dep, s1.mal]);
      const ok = projeyeYaz(A); bildir(ok); const m = $('#pMsg'); if (m) m.insertAdjacentHTML('afterbegin', `<div class="msg info">${esc(P.HAZIR_YER[yer.value].ad)} zemin ve deprem değerleri uygulandı${ok ? ' ve projeye yazıldı' : ''}.</div>`); G.buildForm(); changed(); }; }
    const geri = w.querySelector('#yapiOneri'); if (geri) geri.onclick = ev => { ev.preventDefault(); y.tur = o.tur; y.altUstKot = o.altUstKot; y.elle = false; y.elleKot = false; bildir(projeyeYaz({ yapiTuru: null, altUstKot: null })); G.buildForm(); changed(); };
    return w;
  };
  const bildir = ok => { const m = $('#pMsg'); if (m && !ok) m.insertAdjacentHTML('afterbegin', '<div class="msg">Yapı türü yalnız bu pencerede değişti: ArıtmaCAD penceresine erişilemedi, projeye yazılmadı (statik penceresini ArıtmaCAD içinden açın).</div>'); };
  const build0 = G.buildForm;
  G.buildForm = function () { const r = build0.apply(this, arguments); try { const k = kutu(), root = $('#form'); if (k && root) root.insertBefore(k, root.firstChild); } catch (er) { console.error('yapı türü', er); } return r; };
  const model0 = G.modelUygula;
  G.modelUygula = function (d) {
    const r = model0.apply(this, arguments);
    try { const s = Sx(); if (s && d && !d.hata) { s.yapi = P.yapiSecim(d); s.hacim = d.hacim || null; s.temel = d.temel || null; const ay = P.statikAyarUygula(s, d);
      if (s.ayarUyari) { const m1 = $('#pMsg'); if (m1) m1.insertAdjacentHTML('afterbegin', P.ayarUyariHtml(s)); } s._ayarImza = JSON.stringify([s.zemin, s.dep, s.mal]);
      if (ay.length) { const m0 = $('#pMsg'); if (m0) m0.insertAdjacentHTML('afterbegin', `<div class="msg info">Projeye kayıtlı ${ay.join(', ')} değerleri alındı (zemin φ ${f2(s.zemin.phi, 0)}°, ${esc(s.zemin.K)}, sürşarj ${f2(s.zemin.q, 1)} kN/m², emniyet ${f2(s.zemin.sig, 0)} kN/m²${s.geo ? ` · zemin kotu ${f2(s.geo.kZemin)}, YAS ${s.geo.kYAS != null ? f2(s.geo.kYAS) : 'yok'}` : ''}).</div>`); } if (typeof save === 'function') save(); G.buildForm();
      const m = $('#pMsg'); if (m) m.insertAdjacentHTML('afterbegin', `<div class="msg info">Yapı türü: <b>${esc(P.YAPI_TURU_KISA[s.yapi.tur] || '—')}</b>${s.yapi.elle ? ' (projede elle seçilmiş)' : ' (program önerisi)'}${s.yapi.tur === 'altUst' ? ` · alt yapı üst kotu ${f2(s.yapi.altUstKot)}` : ''}. Formun başındaki <b>Yapı türü</b> bölümünden değiştirebilirsiniz.</div>`); } } catch (er) { console.error('yapı türü', er); }
    return r;
  };
  /* ---------- yalnız üst yapı: çerçeve + temel (kabuk modeli çalıştırılmaz; kabuk rapor / paftaları çıkmaz) ---------- */
  const ustYapiHesap = () => {
    const s = Sx(); R = null; G._KR = null; let rc = null;
    try { if (s.cer && ((s.cer.kolonlar || []).length || (s.cer.kirisler || []).length) && P.cerceveHesap) rc = P.cerceveHesap(Object.assign({}, s, { suYapisi: false })); } catch (er) { console.error('çerçeve', er); }
    RC = rc; let TK = null; try { TK = P.temelKabukHesap ? P.temelKabukHesap(s, rc) : null; } catch (er) { console.error('temel kabuğu', er); } P.temelKabukSon = TK; G._KR = TK ? TK.r : null; // radye + subasman kabuğu: kabuk paftaları (kalıp, perde ve radye donatısı) bundan çıkar
    let TH = null; try { TH = P.temelHesap ? P.temelHesap(s, rc) : null; if (TH) TH.kabukVar = !!TK; } catch (er) { console.error('temel', er); TH = { temeller: [], uyar: ['Temel hesabı yapılamadı: ' + er.message], ok: false }; } P.temelSon = TH;
    $('#sonuc').innerHTML = `<h3>Sonuçlar — yalnız üst yapı (çerçeve + temel)</h3><div class="msg info">Yapı türü <b>yalnız üst yapı</b>: kolon, kiriş ve döşemeler çerçeve modeliyle, temel zemin gerilmesi ve zımbalama ile hesaplandı. Radye ve subasman perdesi ayrıca 3B kabukla (Winkler zemininde plak + perde) çözüldü.</div>`;
    if (rc && typeof cerGoster === 'function') { try { cerGoster(); } catch (er) { console.error(er); } } else if (!rc) $('#sonuc').insertAdjacentHTML('beforeend', '<div class="msg">Modelde kolon / kiriş yok: çerçeve hesabı yapılmadı.</div>');
    if (TH && P.temelOzet) $('#sonuc').insertAdjacentHTML('beforeend', P.temelOzet(TH)); if (TK && P.temelKabukOzet) $('#sonuc').insertAdjacentHTML('beforeend', P.temelKabukOzet(TK)); if (s.ayarUyari) $('#sonuc').insertAdjacentHTML('afterbegin', P.ayarUyariHtml(s));
    const pr = s.proj || {}; let h = `<h1>${esc(pr.ad || 'Yapı')} — Statik Hesap Raporu</h1><p style="text-align:center">${esc(pr.tesis || '')}${pr.idare ? ' · ' + esc(pr.idare) : ''}${pr.tarih ? ' · ' + esc(pr.tarih) : ''}</p>
      <h2>YAPI TÜRÜ VE ÇÖZÜM YOLU</h2><p>Yapı türü: <b>yalnız üst yapı</b> (${esc(P.YAPI_TURU.ust)}). Firma kuralı gereği kolon, kiriş ve döşemeler çerçeve modeliyle; temeller zemin emniyet gerilmesi (σ<sub>em</sub> = ${f2(s.zemin.sig, 0)} kN/m²) ve zımbalama ile hesaplanmıştır. Radye ve subasman perdeleri ayrıca Winkler zemininde 3B kabuk (plak + perde) modeliyle çözülmüştür.</p>`;
    h += P.ayarUyariHtml(s, true); if (TH && P.temelRapor) h += P.temelRapor(TH, f2); if (TK && P.temelKabukRapor) h += P.temelKabukRapor(TK, f2);
    if (P.elemanListesiHtml) h += P.elemanListesiHtml(s, f2);
    $('#rapor').innerHTML = h; if (rc && P.cerceveRapor) $('#rapor').insertAdjacentHTML('beforeend', '<h2 class="sayfa">ÜST YAPI — ÇERÇEVE HESABI</h2>' + P.cerceveRapor(rc, f2));
    $('#raporKutu').style.display = 'block';
    ['#bCiz', '#bDxf', '#bYaz', '#bDon3'].forEach(q => { const b = $(q); if (b) b.disabled = !rc && !TK && q !== '#bYaz'; });
    try { if (G.DIL && G.DIL.kod && G.DIL.kod() !== 'tr' && G.DIL.cevirDom) G.DIL.cevirDom($('#rapor')); } catch (er) { console.warn(er); }
  };
  /* kullanıcı pencerede zemin / deprem değerini değiştirince projeye yazılır (sonraki model tazelemesinde varsayılana dönmesin) */
  const changed0 = G.changed;
  if (typeof changed0 === 'function') G.changed = function () { const r = changed0.apply(this, arguments); try { const s = Sx(); if (s && s.yapi && s._ayarImza) { const im = JSON.stringify([s.zemin, s.dep, s.mal]);
    if (im !== s._ayarImza) { s._ayarImza = im; if (projeyeYaz({ zemin: Object.assign({}, s.zemin), dep: Object.assign({}, s.dep), mal: { fck: s.mal.fck, fyk: s.mal.fyk } })) { s.ayarUyari = null; const m = $('#pMsg'); if (m) m.insertAdjacentHTML('afterbegin', '<div class="msg info">Zemin / deprem / malzeme değerleri projeye kaydedildi.</div>'); } } } } catch (er) { console.warn(er); } return r; };
  const hepsiK = G.hepsi;
  G.hepsi = function (o) {
    let s = Sx(); if (!s || !s.yapi || s.yapi.tur !== 'ust') return hepsiK.apply(this, arguments);
    if (s.mod === 'kabuk' && P.kabukModelTazele && !o) { const ok = P.kabukModelTazele(); if (ok === 'eski') return; s = Sx(); if (!s || !s.yapi || s.yapi.tur !== 'ust') return hepsiK.apply(this, arguments); }
    return ustYapiHesap();
  };
  // Kalınlık öner: yalnız üst yapıda kabuk elemanı yok — hesap yapılır, kesitlerin modelde büyütülmesi söylenir
  setTimeout(() => { const b = $('#bOner'); if (!b) return; const f0 = b.onclick; b.onclick = function () { const s = Sx(); if (!s || !s.yapi || s.yapi.tur !== 'ust') return f0 && f0.apply(this, arguments);
    G.hepsi(null); const m = $('#pMsg'); if (m) m.insertAdjacentHTML('afterbegin', '<div class="msg info">Yalnız üst yapı: kalınlık önerisi kabuk (perde / radye) elemanları içindir. Yetersiz kolon / kiriş / temel varsa kesitini modelde büyütüp <b>Modelden al</b> → <b>Hesapla</b> yapın.</div>'); }; }, 50);
  try { G.buildForm(); } catch (er) { console.warn(er); }
})(typeof window !== 'undefined' ? window : globalThis);

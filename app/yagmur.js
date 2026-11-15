/* ArıtmaCAD — YAĞMUR OLUĞU ve YAĞMUR İNİŞ BORUSU (çizim ve model)
   Kaynak: Çokal AAT R2, 10-İdari Bina_R2 çatı paftası ÇKL-AAT-İB-03 (ÇATI PLANI, A'-A', B'-B', DETAY-A) ve görünüşleri — yarım daire oluk
   (dış dudakta kıvrık kenar), iniş borusu, "Yağmur Borusu Süzgeci"; katman `Oluk`. Malzeme PVC (firma kuralı 15.11.2026; Çokal'da çinko).
   İniş borusunun dirsekleri Çokal görünüşlerinden ölçüldü (docs/tasarim-standartlari.md): oluk çıkışından 30 cm düşey, iki 60° dirsekli kaz boynu
   (dirsek eksen yarıçapı 1,5·D, aradaki düz parça yatayla 30°) ile duvara dik, duvar boyunca düşey (manşonlar ~1 m arayla), altta 90° dirsekle dışa 15 cm çıkış.
   Çap ve adet: C.yagmurHesap (mt-sihhi.js, TS EN 12056-3; mekanik tesisat). Hesap yoksa oluk Ø150, boru Ø110, borular dış köşelerde.
   1) Çatı nesnesinin oluğu ve boruları: C.yagmurCati(e) → { olukDN, borDN, oluk (saçak 7 cm dışı çevre), borular: [{ no, p, yol }], zSacak, zAlt }
      cati.js bunlardan 3B ağ (yarım daire oluk, boru, kelepçe), plan sembolü ve metraj üretir.
   2) Elle çizilen: yagmur nesnesi { kind: 'oluk', pts, z, dn } | { kind: 'boru', p, z0, z1, dn } — YAGMUROLUGU, INISBORUSU komutları (Mimari şeridi).
   Saf kısım (yol, kesit) Node ile denenir: node test/yagmur-cizim.test.js */
(function (C) {
  'use strict';

  /* ======================= SAF KISIM ======================= */
  /* iniş borusunun ekseni (Çokal görünüşleri gibi): g oluk çıkışı (z = zUst, oluk altı), w duvar boyunca inen borunun ekseni (duvar yüzünden 4 cm + r dışarıda).
     o: { D: boru dış çapı (m, 0,11), n: [x, y] duvarın dış normali (saçaksız boruda dirseğin yönü) }.
     1) oluk çıkışından 30 cm düşey; 2) kaz boynu: iki 60° dirsek (eksen yarıçapı R = 1,5·D), arada yatayla 30° düz parça — öteleme R'den kısaysa
     dirsek açısı küçülür, düz parça olmaz; 3) duvar boyunca düşey; 4) altta 90° dirsek duvardan dışa, 15 cm düz çıkış (alt yüzü zeminde).
     Döner: [[x, y, z] …] (dirsekler 10°'lik parçalarla); dizi üstünde .manson = [{ p, t }] (manşon / kelepçe yeri ve eksen doğrultusu), .dirsek = açıların listesi */
  const inisYolu = (g, w0, zUst, zAlt, o) => {
    o = o || {}; const D = +o.D || 0.11, R = 1.5 * D, d = Math.hypot(w0[0] - g[0], w0[1] - g[1]), kaz = d > 0.03, w = kaz ? w0 : g;
    const u = kaz ? [(w0[0] - g[0]) / d, (w0[1] - g[1]) / d] : (o.n ? (() => { const l = Math.hypot(o.n[0], o.n[1]) || 1; return [-o.n[0] / l, -o.n[1] / l]; })() : null); // u: oluktan duvara (yatay)
    const Y = [], MS = [], DR = [], H = (b, s2, z) => [b[0] + u[0] * s2, b[1] + u[1] * s2, z], ekle = p => { const q = Y[Y.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 1e-6) Y.push(p); };
    const man = (p, t) => MS.push({ p: p.map(v => +v.toFixed(4)), t: t.map(v => +v.toFixed(4)) }), asagi = [0, 0, -1];
    ekle([g[0], g[1], zUst]); man([g[0], g[1], zUst - 0.035], asagi);
    let z = Math.max(zAlt + 0.1, zUst - 0.30);
    if (kaz) {
      const al = d >= R ? Math.PI / 3 : Math.acos(1 - d / (2 * R)), Ls = d >= R ? (d - R) / Math.sin(al) : 0, nA = Math.max(2, Math.ceil(al / (Math.PI / 18)));
      man([g[0], g[1], z + 0.035], asagi);
      for (let k = 0; k <= nA; k++) { const th = al * k / nA; ekle(H(g, R - R * Math.cos(th), z - R * Math.sin(th))); }
      const s1 = R * (1 - Math.cos(al)), z1 = z - R * Math.sin(al), t = [u[0] * Math.sin(al), u[1] * Math.sin(al), -Math.cos(al)];
      const s2 = s1 + Ls * Math.sin(al), z2 = z1 - Ls * Math.cos(al);
      if (Ls > 0.12) { man(H(g, s1 + 0.035 * Math.sin(al), z1 - 0.035 * Math.cos(al)), t); man(H(g, s2 - 0.035 * Math.sin(al), z2 + 0.035 * Math.cos(al)), t); }
      const zw = z2 - R * Math.sin(al); // ikinci dirseğin sonu (düşey)
      for (let k = nA; k >= 0; k--) { const ph = al * k / nA; ekle(H(w, -R + R * Math.cos(ph), zw + R * Math.sin(ph))); }
      Y[Y.length - 1] = [w[0], w[1], zw]; z = zw; man([w[0], w[1], z - 0.035], asagi); DR.push(al * 180 / Math.PI, al * 180 / Math.PI);
    } else ekle([g[0], g[1], z]);
    /* alt dirsek: 90°, duvardan dışa (−u), eksen zAlt + D/2; yükseklik yetmezse dirseksiz zemine */
    const zc = zAlt + D / 2, zB = zc + R;
    if (u && z - zB > 0.05) {
      const nV = Math.max(0, Math.floor((z - zB - 0.15) / 1.0)); for (let k = 1; k <= nV; k++) man([w[0], w[1], z - (z - zB) * k / (nV + 1)], asagi); // manşon / kelepçe ~1 m arayla
      man([w[0], w[1], zB + 0.035], asagi); ekle([w[0], w[1], zB]);
      const nB = 9; for (let k = 1; k <= nB; k++) { const th = Math.PI / 2 * k / nB; ekle(H(w, -(R - R * Math.cos(th)), zB - R * Math.sin(th))); }
      ekle(H(w, -(R + 0.15), zc)); DR.push(90);
    } else ekle([w[0], w[1], zAlt]);
    const out = Y.map(p => p.map(v => +v.toFixed(4))); out.manson = MS; out.dirsek = DR; return out;
  };
  /* yarım daire oluk kesiti (yerel: n dışa, z yukarı; merkez oluk ağzının ortası): r = DN / 2, dış dudakta kıvrık kenar (Çokal DETAY-A) */
  const olukKesit = (dn, n = 8) => { const r = dn / 2000, o = []; for (let i = 0; i <= n; i++) { const t = Math.PI * i / n; o.push([-r * Math.cos(t), -r * Math.sin(t)]); } return o; };
  /* çatı önbellek imzası: oluk / boru hesabını değiştiren dış girdiler (sıhhi tesisat yağmur ayarları: yağış, C, oluk DN, iniş DN, oluk eğimi,
     en büyük aralık; kolon yerleri; düşey elemanların dış zarfı; tretuvar üstü kotu). Biri değişince çatının oluk / boru / metrajı yeniden kurulur. */
  const imza = (ayar, zarf, zemin) => { const a = ayar || {}, r = v => v == null || !isFinite(+v) ? null : Math.round(+v * 1000) / 1000;
    return JSON.stringify([r(a.yagis), r(a.C), r(a.olukDN), r(a.borDN), r(a.egim), r(a.maksAralik), (a.kolonlar || []).map(p => [r(p[0]), r(p[1])]), zarf ? zarf.map(r) : null, r(zemin)]); };
  const api = { inisYolu, olukKesit, imza };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!C) return;
  C.yagmurApi = api;

  /* ======================= MODEL ======================= */
  const M = C.M;
  const offsetPoly = (q, d) => { const n = q.length, out = []; for (let i = 0; i < n; i++) { const a = q[(i - 1 + n) % n], b = q[i], c = q[(i + 1) % n], u1 = M.norm([b[0] - a[0], b[1] - a[1], 0]), u2 = M.norm([c[0] - b[0], c[1] - b[1], 0]), n1 = [u1[1], -u1[0]], n2 = [u2[1], -u2[0]], k = 1 + n1[0] * n2[0] + n1[1] * n2[1]; if (k < 1e-6) { out.push([b[0] + n1[0] * d, b[1] + n1[1] * d]); continue; } out.push([b[0] + (n1[0] + n2[0]) * d / k, b[1] + (n1[1] + n2[1]) * d / k]); } return out; };
  const alan = q => { let s = 0; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  const yakin = (q, P) => { let en = null; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); const p = [a[0] + dx * t, a[1] + dy * t], d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (!en || d < en.d) en = { p, d, i }; } return en; };
  /* zemin: binayı çeviren tretuvarın üstü (bina tarafı), yoksa çatı döşemesinin altındaki en düşük döşeme üstü, yoksa 0 */
  const zemin = () => { const t = C.doc.ents.filter(e => e.type === 'tretuvar' && !e.gv); if (t.length) return Math.max(...t.map(e => (+e.zg || 0) + (+e.h || 0.15))); return 0; };
  const hesapAyar = e => Object.assign({}, (C.MT && C.MT.yagmurAyar ? (() => { try { return C.MT.yagmurAyar() || {}; } catch (er) { return {}; } })() : {}), e.yagmur || {});
  const zarf = () => { const D = C.doc.ents.filter(x => !x.gv && /^(perde|kolon|duvar|wall)$/.test(x.type) && C.layer(x.layer).on); const b = D.length ? C.extents(D) : null; return b && isFinite(b[0]) ? [b[0], b[1], b[2], b[3]] : null; };
  /* cati.js önbellek anahtarına girer; değişince çatıların çizimi silinir (cati.js 'change') */
  C.yagmurImza = () => { if (!C.doc) return ''; let a = {}; try { a = C.MT && C.MT.yagmurAyar ? C.MT.yagmurAyar() || {} : {}; } catch (er) { a = {}; } return imza(a, zarf(), zemin()); };
  /* çatının oluk ve boruları (çizim, 3B ve metraj için tek kaynak) */
  C.yagmurCati = e => {
    const G = C.catiGeom(e), foot = G.foot.map(p => [p[0], p[1]]), ccw = alan(foot) < 0 ? foot.slice().reverse() : foot;
    let H = null; try { if (C.yagmurHesap) H = C.yagmurHesap(e, hesapAyar(e)); } catch (er) { H = null; }
    const olukDN = (H && H.olukDN) || +e.olukDn || 150, borDN = (H && H.borDN) || +e.boruDn || 110, ro = olukDN / 2000, rb = borDN / 2000;
    const oluk = offsetPoly(ccw, ro), zE = G.lines.eave.length ? Math.min(...G.lines.eave.flat().map(p => p[2])) : G.Z0, zAlt = zemin();
    /* boru duvar boyunca iner: çatının oturduğu döşeme saçaklıysa (Konya: döşeme 50 cm konsol) duvar yüzü döşeme kenarı değil, düşey elemanların dış yüzüdür */
    let wall = alan(G.wall) < 0 ? G.wall.slice().reverse() : G.wall.slice();
    { const b = zarf();
      if (b) { const R = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]]; if (R.every(q => C.pointInPoly ? C.pointInPoly(q, ccw) || yakin(q, ccw).d < 0.02 : true)) wall = R; } }
    let P = H && H.borular && H.borular.length ? H.borular.map(b => ({ no: b.no, p: b.p, kenar: b.kenarIndex })) : null;
    if (!P) { P = []; for (let i = 0; i < ccw.length; i++) { const a = ccw[(i - 1 + ccw.length) % ccw.length], b = ccw[i], c = ccw[(i + 1) % ccw.length]; if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) > 1e-9) P.push({ no: 'YB' + (P.length + 1), p: b, kenar: i }); } }
    /* boru duvara dik iner (Çokal): borunun bulunduğu saçak kenarına paralel duvar kenarı seçilir (köşede uzun duvar), boru köşeden 15 cm + r içeride,
       duvar yüzünden 4 cm + r dışarıda; oluk çıkışı (g) borunun tam karşısında, duvar normali doğrultusunda oluk ekseni üstünde */
    const kenarlar = q => q.map((a, i) => { const b = q[(i + 1) % q.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-9, u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; return { a, b, L, u, n: [u[1], -u[0]] }; });
    const WK = kenarlar(wall), OK = kenarlar(oluk), segUz = (p, k) => { const t = Math.max(0, Math.min(k.L, (p[0] - k.a[0]) * k.u[0] + (p[1] - k.a[1]) * k.u[1])); return Math.hypot(p[0] - k.a[0] - k.u[0] * t, p[1] - k.a[1] - k.u[1] * t); };
    const isin = (P0, n) => { let en = null; for (const k of OK) { const den = n[0] * k.u[1] - n[1] * k.u[0]; if (Math.abs(den) < 1e-9) continue; const dx = k.a[0] - P0[0], dy = k.a[1] - P0[1], s2 = (dx * k.u[1] - dy * k.u[0]) / den, t = (dx * n[1] - dy * n[0]) / den; if (s2 > 1e-6 && t > -1e-6 && t < k.L + 1e-6 && (en == null || s2 < en)) en = s2; } return en; };
    const borular = P.map(b => { const g0 = yakin(b.p, oluk).p;
      /* köşe borusu (oluk köşesine 30 cm'den yakın): köşenin iki saçak kenarı aday; ara boru: üstünde bulunduğu saçak kenarı */
      let vi = -1, vd = 0.3; oluk.forEach((q, i) => { const d0 = Math.hypot(q[0] - g0[0], q[1] - g0[1]); if (d0 < vd) { vd = d0; vi = i; } });
      const E0 = vi >= 0 ? [OK[(vi - 1 + OK.length) % OK.length], OK[vi]] : OK.filter(k => segUz(g0, k) < 0.03);
      let best = null;
      for (const ok1 of (E0.length ? E0 : OK)) { let en = null; for (const k of WK) { if (Math.abs(k.u[0] * ok1.u[0] + k.u[1] * ok1.u[1]) < 0.98) continue; const dd = segUz(g0, k); if (!en || dd < en.dd) en = { k, dd }; } /* kenara paralel en yakın duvar */
        if (en && (!best || en.k.L > best.k.L + 0.01 || (Math.abs(en.k.L - best.k.L) <= 0.01 && Math.abs(en.k.u[0]) > Math.abs(best.k.u[0]) + 1e-6))) best = en; } /* köşede uzun duvar; eşit boyda (kare plan) plandaki yatay duvar: borular simetrik */
      if (!best) { const wq = yakin(g0, wall), dw = Math.hypot(g0[0] - wq.p[0], g0[1] - wq.p[1]) || 1, w = [wq.p[0] + (g0[0] - wq.p[0]) / dw * (0.04 + rb), wq.p[1] + (g0[1] - wq.p[1]) / dw * (0.04 + rb)]; return { no: b.no, p: g0, kenar: b.kenar, yol: inisYolu(g0, w, zE - ro, zAlt, { D: 2 * rb }) }; }
      const k = best.k, c = Math.min(k.L / 2, 0.15 + rb), t = Math.max(c, Math.min(k.L - c, (g0[0] - k.a[0]) * k.u[0] + (g0[1] - k.a[1]) * k.u[1]));
      const w = [k.a[0] + k.u[0] * t + k.n[0] * (0.04 + rb), k.a[1] + k.u[1] * t + k.n[1] * (0.04 + rb)], sg = isin(w, k.n), g = sg != null ? [w[0] + k.n[0] * sg, w[1] + k.n[1] * sg] : g0;
      return { no: b.no, p: g, kenar: b.kenar, duvarN: k.n, yol: inisYolu(g, w, zE - ro, zAlt, { D: 2 * rb, n: k.n }) }; });
    return { olukDN, borDN, ro, rb, oluk, borular, zSacak: zE, zAlt, hesap: H };
  };
  /* 3B: yarım daire oluk (saçak çevresi boyunca) ve borular (12 yüzlü boru, manşon / kelepçe ~1 m arayla, dirsekler) — cati.js buildAll içine eklenir */
  const PVC = [0.58, 0.59, 0.61], PVC2 = [0.48, 0.49, 0.51]; // PVC gri (RAL 7037 yakını); manşon / kelepçe biraz koyu
  const tup = (out, A, B, r, col, n = 12) => { const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L = Math.hypot(...d); if (L < 1e-6) return; const u = d.map(v => v / L), a = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], p = M.norm(M.cross(u, a)), q = M.cross(u, p), v0 = out.v.length;
    for (const C0 of [A, B]) for (let i = 0; i < n; i++) { const t = 2 * Math.PI * i / n, c = Math.cos(t) * r, s = Math.sin(t) * r; out.v.push([C0[0] + p[0] * c + q[0] * s, C0[1] + p[1] * c + q[1] * s, C0[2] + p[2] * c + q[2] * s]); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; out.f.push([v0 + i, v0 + j, v0 + n + j], [v0 + i, v0 + n + j, v0 + n + i]); out.fc.push(col, col); } };
  /* iniş borusu gövdesi: eksen boyunca boru (dirsekler 10°'lik parçalar), manşon / kelepçe yerlerinde 4,7 cm boyunda 1 cm kalın bilezik (Çokal görünüşleri) */
  const borAg = (out, Yo, r) => { for (let i = 1; i < Yo.length; i++) tup(out, Yo[i - 1], Yo[i], r, PVC);
    for (const m of Yo.manson || []) { const h = 0.047 / 2, A = m.p.map((v, k) => v - m.t[k] * h), B = m.p.map((v, k) => v + m.t[k] * h); tup(out, A, B, r + 0.01, PVC2); } };
  C.yagmurBorAg = borAg;
  /* yolun duvar dibindeki noktası: kaz boynunun bittiği, duvar boyunca düşey parçanın başladığı yer (kaz boynu yoksa oluk çıkışı) */
  C.yagmurDuvarNoktasi = Yo => { for (let i = 1; i < Yo.length; i++) { const a = Yo[i - 1], c = Yo[i]; if (Math.hypot(c[0] - a[0], c[1] - a[1]) < 1e-6 && a[2] - c[2] > 0.3 && i > 1) return a; } return Yo[0]; };
  C.yagmurAg = (out, Y) => {
    const K = olukKesit(Y.olukDN), n = Y.oluk.length, z0 = Y.zSacak, O = Y.oluk, nk = K.length;
    // oluk: köşelerde açıortay doğrultusunda (ofsetin kendisi) — kesit noktası = oluk ekseni + n·x + z
    const nrm = i => { const a = O[(i - 1 + n) % n], b = O[i], c = O[(i + 1) % n], u1 = M.norm([b[0] - a[0], b[1] - a[1], 0]), u2 = M.norm([c[0] - b[0], c[1] - b[1], 0]), m = M.norm([u1[1] + u2[1], -(u1[0] + u2[0]), 0]), k = Math.max(0.3, m[0] * u1[1] - m[1] * u1[0]); return [m[0] / k, m[1] / k]; };
    const N = O.map((p, i) => nrm(i)), v0 = out.v.length;
    for (let i = 0; i < n; i++) for (const [x, z] of K) out.v.push([O[i][0] + N[i][0] * x, O[i][1] + N[i][1] * x, z0 + z]);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; for (let k = 0; k + 1 < nk; k++) { const a = v0 + i * nk + k, b = v0 + j * nk + k; out.f.push([a, b, b + 1], [a, b + 1, a + 1]); out.fc.push(PVC, PVC); } }
    for (const k of [0, nk - 1, Math.floor(nk / 2)]) for (let i = 0; i < n; i++) { const j = (i + 1) % n; out.edges3.push([out.v[v0 + i * nk + k], out.v[v0 + j * nk + k]]); }
    for (const b of Y.borular) borAg(out, b.yol, Y.rb);
  };
  /* metraj: oluk boyu (m), boru boyu (m) ve adedi */
  C.yagmurMetraj = Y => { let Lo = 0; for (let i = 0; i < Y.oluk.length; i++) { const a = Y.oluk[i], b = Y.oluk[(i + 1) % Y.oluk.length]; Lo += Math.hypot(b[0] - a[0], b[1] - a[1]); }
    let Lb = 0; for (const b of Y.borular) for (let i = 1; i < b.yol.length; i++) Lb += Math.hypot(...[0, 1, 2].map(k => b.yol[i][k] - b.yol[i - 1][k]));
    const nD = Y.borular.reduce((t, b) => t + ((b.yol && b.yol.dirsek) || []).length, 0), nM = Y.borular.reduce((t, b) => t + ((b.yol && b.yol.manson) || []).length, 0);
    return [[`PVC yağmur oluğu Ø${Y.olukDN} (yarım daire)`, 'm', Lo], [`PVC yağmur iniş borusu Ø${Y.borDN}`, 'm', Lb], [`PVC yağmur iniş borusu Ø${Y.borDN} dirseği (60° / 90°)`, 'adet', nD], [`PVC yağmur iniş borusu Ø${Y.borDN} manşon / kelepçe`, 'adet', nM], [`Yağmur iniş borusu Ø${Y.borDN} (süzgeç ile)`, 'adet', Y.borular.length]]; };

  /* ======================= ELLE ÇİZİLEN (yagmur nesnesi) ======================= */
  const { L, P, CI } = C.prim;
  C.T.yagmur = {
    label: 'Yağmur oluğu / iniş borusu', ifc: 'IfcPipeSegment',
    prims: e => e.kind === 'boru' ? [CI([e.p[0], e.p[1], 0], (+e.dn || 110) / 2000, { lw: 18 })] : [P(e.pts.map(p => [p[0], p[1], 0]), false, { lw: 13, lt: 'DASHED' })],
    mesh: e => { const out = C._ins.newMesh(), dn = +e.dn || (e.kind === 'boru' ? 110 : 150);
      if (e.kind === 'boru') { tup(out, [e.p[0], e.p[1], +e.z0 || 0], [e.p[0], e.p[1], +e.z1 || 3], dn / 2000, PVC); }
      else { const K = olukKesit(dn), z = +e.z || 3, Q = e.pts; for (let i = 1; i < Q.length; i++) { const a = Q[i - 1], b = Q[i], u = M.norm([b[0] - a[0], b[1] - a[1], 0]), nn = [u[1], -u[0]], v0 = out.v.length;
          for (const p of [a, b]) for (const [x, zz] of K) out.v.push([p[0] + nn[0] * x, p[1] + nn[1] * x, z + zz]);
          for (let k = 0; k + 1 < K.length; k++) { out.f.push([v0 + k, v0 + K.length + k, v0 + K.length + k + 1], [v0 + k, v0 + K.length + k + 1, v0 + k + 1]); out.fc.push(PVC, PVC); }
          out.edges3.push([out.v[v0], out.v[v0 + K.length]], [out.v[v0 + K.length - 1], out.v[v0 + 2 * K.length - 1]]); } }
      return [out]; },
    snaps: e => e.kind === 'boru' ? [{ p: [e.p[0], e.p[1], 0], k: 'cen' }] : e.pts.map(p => ({ p: [p[0], p[1], 0], k: 'end' })),
    xf: (e, X) => { if (e.kind === 'boru') e.p = X.p([e.p[0], e.p[1], 0]).slice(0, 2); else e.pts = e.pts.map(p => X.p([p[0], p[1], 0]).slice(0, 2)); delete e._c; },
    info: e => e.kind === 'boru' ? `Yağmur iniş borusu Ø${+e.dn || 110} (PVC), ${M.fmt((+e.z1 || 0) - (+e.z0 || 0), 2)} m` : `Yağmur oluğu Ø${+e.dn || 150} (PVC, yarım daire), ${M.fmt(e.pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - e.pts[i][0], p[1] - e.pts[i][1]), 0), 2)} m`,
  };
  (C.PROPFIELDS = C.PROPFIELDS || {}).yagmur = /* ui.js özellik tablosunu kurarken bu kaydı korur */ [['dn', 'Çap Ø (mm)', 'n'], ['z', 'Oluk kotu (m)', 'n'], ['z0', 'Boru alt kotu (m)', 'n'], ['z1', 'Boru üst kotu (m)', 'n']];
  /* metraj: çatı metrajına elle çizilenler de katılır */
  { const m0 = C.catiMetraj; C.catiMetraj = () => { const R = m0 ? m0() : [], m = new Map();
      for (const e of C.doc.ents) { if (e.type !== 'yagmur' || e.gv || !C.lyLive(e.layer)) continue; const dn = +e.dn || (e.kind === 'boru' ? 110 : 150);
        if (e.kind === 'boru') { const k = `PVC yağmur iniş borusu Ø${dn}|m`; m.set(k, (m.get(k) || 0) + Math.abs((+e.z1 || 0) - (+e.z0 || 0))); const k2 = `Yağmur iniş borusu Ø${dn} (süzgeç ile)|adet`; m.set(k2, (m.get(k2) || 0) + 1); }
        else { const k = `PVC yağmur oluğu Ø${dn} (yarım daire)|m`; m.set(k, (m.get(k) || 0) + e.pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - e.pts[i][0], p[1] - e.pts[i][1]), 0)); } }
      return R.concat([...m.entries()].map(([k, v]) => { const [ad, br] = k.split('|'); return [ad, br, v]; })); }; }
  const katman = () => { if (C.ensureLayer) C.ensureLayer('INS_OLUK', 251, 'CONTINUOUS', 25); return 'INS_OLUK'; };
  C.addCommand(['YAGMUROLUGU', 'OLUK', 'GUTTER'], 'Yağmur oluğu (PVC, yarım daire): saçak kenarı boyunca noktaları tıklayın (Enter ile bitir). Çap ve kot sorulur; plan, kesit, görünüş ve metraja girer.', async (I) => {
    const dn = await I.num('Oluk çapı Ø (mm; 100, 125, 150, 200)', 150); const z = await I.num('Oluk kotu (m, oluk ağzı)', 3); const pts = [];
    for (;;) { const p = await I.pt(pts.length ? 'Sonraki nokta (Enter: bitir)' : 'Oluğun ilk noktası'); if (!p || typeof p === 'string') break; pts.push([p[0], p[1]]); C.cmd.base = p; }
    C.cmd.base = null; if (pts.length < 2) return; C.add(C.newEnt('yagmur', { kind: 'oluk', pts, z: +z, dn: +dn, layer: katman() })); C.changed(); C.log(`Yağmur oluğu Ø${dn} PVC: ${pts.length - 1} parça.`); });
  C.addCommand(['INISBORUSU', 'YAGMURBORUSU', 'DOWNPIPE'], 'Yağmur iniş borusu (PVC): noktaya tıklayın; çap, alt ve üst kot sorulur; plan, kesit, görünüş ve metraja girer.', async (I) => {
    const dn = await I.num('Boru çapı Ø (mm; 75, 90, 110, 125)', 110); const z1 = await I.num('Üst kot (oluk altı, m)', 3); const z0 = await I.num('Alt kot (zemin, m)', 0); let n = 0;
    for (;;) { const p = await I.pt(n ? 'Sonraki boru (Enter: bitir)' : 'Boru yeri'); if (!p || typeof p === 'string') break; C.add(C.newEnt('yagmur', { kind: 'boru', p: [p[0], p[1]], z0: +z0, z1: +z1, dn: +dn, layer: katman() })); n++; }
    if (n) { C.changed(); C.log(`${n} yağmur iniş borusu Ø${dn} PVC.`); } });
  if (window.DIL) window.DIL.ekle('en', 'English', [['Yağmur oluğu / iniş borusu', 'Rain gutter / downpipe'], ['Yağmur oluğu', 'Rain gutter'], ['İniş borusu', 'Downpipe'], ['Oluk çapı Ø (mm; 100, 125, 150, 200)', 'Gutter diameter Ø (mm; 100, 125, 150, 200)'], ['Oluk kotu (m, oluk ağzı)', 'Gutter level (m, rim)'], ['Oluğun ilk noktası', 'First point of the gutter'], ['Sonraki nokta (Enter: bitir)', 'Next point (Enter: finish)'], ['Boru çapı Ø (mm; 75, 90, 110, 125)', 'Pipe diameter Ø (mm; 75, 90, 110, 125)'], ['Üst kot (oluk altı, m)', 'Top level (below gutter, m)'], ['Alt kot (zemin, m)', 'Bottom level (ground, m)'], ['Boru yeri', 'Pipe position'], ['Çap Ø (mm)', 'Diameter Ø (mm)'], ['Oluk kotu (m)', 'Gutter level (m)'], ['Boru alt kotu (m)', 'Pipe bottom level (m)'], ['Boru üst kotu (m)', 'Pipe top level (m)'], ['Sonraki boru (Enter: bitir)', 'Next pipe (Enter: finish)']]);
})(typeof window !== 'undefined' ? window.C : null);

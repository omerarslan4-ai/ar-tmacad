/* ArıtmaCAD — SAHA SUNUMU (Google 3B sekmesi üzerine): şeffaf çevre binaları + denize giden hatların akış animasyonu
   - Çevre binalar: C.doc.set.cevre.binalar = [{ p: [[x,y]…], h }] (çizim koordinatı). "Çevre binaları indir" OpenStreetMap'ten
     (Overpass) tesis ve hat çevresindeki bina izlerini alır; projeyle birlikte saklanır. Haritada şeffaf kutu olarak görünür.
   - Deniz hattı: DENIZ_HATTI ile başlayan katmandaki her çoklu çizgi bir güzergâh eksenidir (planda/haritada tutamaçlarla düzeltilir).
     C.doc.set.denizHat.borular = [{ ad, dn (mm), ofs (m, eksenden yana) }] kadar boru bu eksene paralel çizilir.
     Çizginin kendi "dn" özelliği varsa o çizgi tek boru olarak çizilir (saha içi basma hattı).
     Borular toprak altındadır (örtü set.denizHat.ortu, varsayılan 1,2 m): karada harita hat boyunca açık hendek olarak kesilir,
     denizde boru deniz tabanında görünür. Google 3B arazisi varsa hendek ve boru arazi kotunu izler.
     "Akışı oynat": su, istasyondan denize doğru ilerler; "Hat boyunca uç": kamera su cephesini izler.
   - Gerçekçi görünüm: SAHA_ZEMIN / SAHA_YOL / SAHA_YESIL / SAHA_KAPLAMA plakları dokulu çizilir (asfalt, bordür, kilit parke, çim),
     bina katmanları boyalı cephe rengini alır, C.doc.set.peyzaj.agac = [[x, y, boy]…] ağaçları ve güneş gölgesi eklenir.
     - Sunum: giriş kapısı açılır, kamera C.doc.set.sunum.yuruyus yolu boyunca tesise girip yükleme bacasına yürür (tesis içi boru akışla
     görünür), yükselip tesis çevresinde döner (ilk turda C.doc.set.sunum.binalar bilgi kutuları sırayla, teker teker), sonra hat boyunca
     yavaşça denize iner (C.doc.set.sunum.hat bilgileri). "Video kaydet" aynı sunumu KARE KARE çizip MP4'e yazar (app/mp4yaz.js): akıcıdır.
   - Render kipi: model fiziksel tabanlı malzemelerle (app/render-malzeme.js) glTF'e çevrilip çizilir; güneşin ayı / saati, gölge,
     köşe kararması ve parlama ayarlanır; "Malzemeler…" katmanlara / seçili nesnelere malzeme atar; "Görüntü al" PNG indirir.
   Geometri saf fonksiyonlardır (C.saha3b.*), Node ile test/saha3b.test.js içinde denenir. */
(function (C) {
  'use strict';
  const S = C.saha3b = {};
  const VARSAYILAN = { borular: [{ ad: 'DN1400-1', dn: 1400, ofs: -2.2 }, { ad: 'DN1400-2', dn: 1400, ofs: 0 }, { ad: 'DN900', dn: 900, ofs: 2.0 }], hiz: 2.0, kot: 1.0, ortu: 1.2, zemin: 0.3 }; // ortu: boru üstü toprak örtüsü (m); zemin: hat boyunca zemin kotu (arazi okunamazsa)

  /* ---------- saf geometri ---------- */
  const hyp = Math.hypot;
  /* ardışık aynı noktaları atar */
  S.temiz = pts => { const o = []; for (const p of pts) { const q = o[o.length - 1]; if (!q || hyp(p[0] - q[0], p[1] - q[1]) > 1e-6) o.push([p[0], p[1]]); } return o; };
  /* çoklu çizgiyi d kadar sola (+) / sağa (−) öteler; köşeler gönye birleşir (en çok 3·d) */
  S.otele = (pts, d) => {
    const p = S.temiz(pts), n = p.length; if (n < 2 || !d) return p;
    const nor = i => { const a = p[i], b = p[i + 1], l = hyp(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]; };
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = i > 0 ? nor(i - 1) : nor(0), b = i < n - 1 ? nor(i) : nor(n - 2);
      let m = [a[0] + b[0], a[1] + b[1]]; const ml = hyp(m[0], m[1]);
      if (ml < 1e-6) { out.push([p[i][0] + a[0] * d, p[i][1] + a[1] * d]); continue; }
      m = [m[0] / ml, m[1] / ml]; const k = Math.min(3, 1 / Math.max(0.05, m[0] * a[0] + m[1] * a[1]));
      out.push([p[i][0] + m[0] * d * k, p[i][1] + m[1] * d * k]);
    }
    return out;
  };
  S.boy = pts => pts.reduce((s, p, i) => i ? s + hyp(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
  /* eksen üzerinde s uzaklığındaki nokta ve yön */
  S.noktaAt = (pts, s) => {
    let acc = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = hyp(b[0] - a[0], b[1] - a[1]); if (s <= acc + l || i === pts.length - 1) { const t = l ? Math.max(0, Math.min(1, (s - acc) / l)) : 0; return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], u: l ? [(b[0] - a[0]) / l, (b[1] - a[1]) / l] : [1, 0] }; } acc += l; }
    return { p: pts[0], u: [1, 0] };
  };
  /* yatay boru (tüp) ağı: pts [[x,y]…], z eksen kotu, r yarıçap, k dilim → { pos, nrm, st (s: eksen boyu metre, t: çevre), idx } */
  S.tup = (pts, z, r, k, s0) => {
    const p = S.temiz(pts), n = p.length, zAt = i => Array.isArray(z) ? (z[i] != null ? z[i] : z[z.length - 1]) : z; k = k || 12; if (n < 2) return null;
    const pos = [], nrm = [], st = [], idx = []; let acc = +s0 || 0; const ilk = acc;
    for (let i = 0; i < n; i++) {
      const u0 = i > 0 ? [p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]] : null, u1 = i < n - 1 ? [p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]] : null;
      const nu = v => { const l = hyp(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
      const a = nu(u0 || u1), b = nu(u1 || u0); let t = [a[0] + b[0], a[1] + b[1]]; const tl = hyp(t[0], t[1]); t = tl < 1e-6 ? a : [t[0] / tl, t[1] / tl];
      const side = [-t[1], t[0]], kk = Math.min(3, 1 / Math.max(0.05, t[0] * a[0] + t[1] * a[1]));
      if (i > 0) acc += hyp(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      for (let j = 0; j <= k; j++) {
        const th = j / k * 2 * Math.PI, c = Math.cos(th), s = Math.sin(th);
        pos.push(p[i][0] + side[0] * c * r * kk, p[i][1] + side[1] * c * r * kk, zAt(i) + s * r); nrm.push(side[0] * c, side[1] * c, s); st.push(acc, j / k);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < k; j++) { const a = i * (k + 1) + j, b = a + k + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    return { pos, nrm, st, idx, boy: acc, uzunluk: acc - ilk };
  };
  /* ekseni en çok "adim" metrede bir noktayla sıklaştırır (arazi kotu okumak ve zemini izlemek için) */
  S.sik = (pts, adim) => { const p = S.temiz(pts), o = [p[0]]; for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i], l = hyp(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(l / adim)); for (let j = 1; j <= n; j++) o.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); } return o; };
  /* açık hendek: eksen, genişlik w, üst kot zU (sayı / dizi), taban kotu zT (sayı / dizi) → { yan: duvarlar, taban } üçgen çorbaları + kesme halkası */
  S.hendek = (pts, w, zU, zT) => {
    const p = S.temiz(pts), n = p.length; if (n < 2) return null;
    const Lp = S.otele(p, w / 2), Rp = S.otele(p, -w / 2), at = (z, i) => Array.isArray(z) ? (z[i] != null ? z[i] : z[z.length - 1]) : z;
    const yan = { pos: [], nrm: [] }, taban = { pos: [], nrm: [] };
    const dort = (o, a, b, c, d, nn) => { o.pos.push(...a, ...b, ...c, ...a, ...c, ...d); for (let i = 0; i < 6; i++) o.nrm.push(...nn); };
    const P = (q, z) => [q[0], q[1], z];
    for (let i = 0; i < n - 1; i++) {
      const u = [p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]], l = hyp(u[0], u[1]) || 1, sol = [-u[1] / l, u[0] / l];
      const t0 = at(zT, i), t1 = at(zT, i + 1), u0 = at(zU, i), u1 = at(zU, i + 1);
      dort(taban, P(Lp[i], t0), P(Rp[i], t0), P(Rp[i + 1], t1), P(Lp[i + 1], t1), [0, 0, 1]);
      dort(yan, P(Lp[i], t0), P(Lp[i + 1], t1), P(Lp[i + 1], u1), P(Lp[i], u0), [-sol[0], -sol[1], 0]);   // sol duvar: içe (sağa) bakar
      dort(yan, P(Rp[i + 1], t1), P(Rp[i], t0), P(Rp[i], u0), P(Rp[i + 1], u1), [sol[0], sol[1], 0]);     // sağ duvar: içe (sola) bakar
    }
    const ua = [p[1][0] - p[0][0], p[1][1] - p[0][1]], la = hyp(ua[0], ua[1]) || 1, ub = [p[n - 1][0] - p[n - 2][0], p[n - 1][1] - p[n - 2][1]], lb = hyp(ub[0], ub[1]) || 1;
    dort(yan, P(Rp[0], at(zT, 0)), P(Lp[0], at(zT, 0)), P(Lp[0], at(zU, 0)), P(Rp[0], at(zU, 0)), [ua[0] / la, ua[1] / la, 0]);
    dort(yan, P(Lp[n - 1], at(zT, n - 1)), P(Rp[n - 1], at(zT, n - 1)), P(Rp[n - 1], at(zU, n - 1)), P(Lp[n - 1], at(zU, n - 1)), [-ub[0] / lb, -ub[1] / lb, 0]);
    return { yan, taban, halka: Lp.concat(Rp.slice().reverse()) };
  };
  /* kapalı çokgeni d kadar öteler (+ dışa, − içe; çokgen yönünden bağımsız) */
  S.oteleKapali = (poly, d) => {
    let p = S.temiz(poly); if (p.length > 2 && hyp(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < 1e-6) p.pop(); const n = p.length; if (n < 3) return p;
    let A = 0; for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1]; } const sg = A > 0 ? 1 : -1; // saat yönünün tersinde dış normal = sağ
    const nor = i => { const a = p[i], b = p[(i + 1) % n], l = hyp(b[0] - a[0], b[1] - a[1]) || 1; return [(b[1] - a[1]) / l * sg, -(b[0] - a[0]) / l * sg]; };
    return p.map((q, i) => { const a = nor((i + n - 1) % n), b = nor(i); let m = [a[0] + b[0], a[1] + b[1]]; const ml = hyp(m[0], m[1]); if (ml < 1e-6) return [q[0] + a[0] * d, q[1] + a[1] * d]; m = [m[0] / ml, m[1] / ml]; const k = Math.min(3, 1 / Math.max(0.05, m[0] * a[0] + m[1] * a[1])); return [q[0] + m[0] * d * k, q[1] + m[1] * d * k]; });
  };
  /* bordür: kapalı çokgen sınırı boyunca w genişliğinde, z0..z1 arası şerit (icte: şerit çokgenin içinde) → { pos, nrm } */
  S.bordur = (poly, w, z0, z1, icte) => {
    const a = S.oteleKapali(poly, 0), b = S.oteleKapali(poly, icte ? -w : w), n = a.length; if (n < 3 || b.length !== n) return null;
    const pos = [], nrm = [], dort = (p, q, r, s, nn) => { pos.push(...p, ...q, ...r, ...p, ...r, ...s); for (let i = 0; i < 6; i++) nrm.push(...nn); };
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, u = [a[j][0] - a[i][0], a[j][1] - a[i][1]], l = hyp(u[0], u[1]) || 1, nn = [u[1] / l, -u[0] / l, 0];
      dort([a[i][0], a[i][1], z1], [a[j][0], a[j][1], z1], [b[j][0], b[j][1], z1], [b[i][0], b[i][1], z1], [0, 0, 1]);       // üst
      dort([a[i][0], a[i][1], z0], [a[j][0], a[j][1], z0], [a[j][0], a[j][1], z1], [a[i][0], a[i][1], z1], nn);               // bir yan
      dort([b[j][0], b[j][1], z0], [b[i][0], b[i][1], z0], [b[i][0], b[i][1], z1], [b[j][0], b[j][1], z1], [-nn[0], -nn[1], 0]); } // öbür yan
    return { pos, nrm };
  };
  /* gömme düzeni: borular = [{ dn, ofs }] → hendek genişliği, derinliği ve her borunun eksen derinliği (zeminden aşağı, m) */
  S.gomme = (borular, ortu) => {
    const rs = borular.map(b => Math.max(0.25, (+b.dn || 1000) / 2000)), of = borular.map(b => +b.ofs || 0), rMax = Math.max(...rs);
    const derin = ortu + 2 * rMax + 0.3, sol = Math.max(...of.map((o, i) => o + rs[i])), sag = Math.min(...of.map((o, i) => o - rs[i]));
    return { w: +(sol - sag + 1.2).toFixed(3), kay: +((sol + sag) / 2).toFixed(3), derin: +derin.toFixed(3), eksen: rs.map(r => +(derin - 0.3 - r).toFixed(3)) }; // borular hendek tabanındaki 30 cm yatağa oturur
  };
  /* dik prizma (bina kutusu): taban çokgeni, z0..z1 → üçgen çorbası { pos, nrm } + kenar çizgileri */
  S.prizma = (poly, z0, z1) => {
    let p = S.temiz(poly); if (p.length > 2 && hyp(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < 1e-6) p.pop(); if (p.length < 3) return null;
    let A = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; A += a[0] * b[1] - b[0] * a[1]; } if (A < 0) p = p.slice().reverse();
    const pos = [], nrm = [], kenar = [], n = p.length, tri = (a, b, c, nn) => { pos.push(...a, ...b, ...c); nrm.push(...nn, ...nn, ...nn); };
    for (let i = 0; i < n; i++) {
      const a = p[i], b = p[(i + 1) % n], l = hyp(b[0] - a[0], b[1] - a[1]) || 1, nn = [(b[1] - a[1]) / l, -(b[0] - a[0]) / l, 0];
      const a0 = [a[0], a[1], z0], b0 = [b[0], b[1], z0], a1 = [a[0], a[1], z1], b1 = [b[0], b[1], z1];
      tri(a0, b0, b1, nn); tri(a0, b1, a1, nn); kenar.push([a1, b1], [a0, a1]);
    }
    // çatı: kulak kesme (içbükey izler için)
    const tepe = S.ucgenle(p); for (const t of tepe) tri([p[t[0]][0], p[t[0]][1], z1], [p[t[1]][0], p[t[1]][1], z1], [p[t[2]][0], p[t[2]][1], z1], [0, 0, 1]);
    return { pos, nrm, kenar };
  };
  /* basit kulak kesme (saat yönünün tersine çokgen) → köşe indis üçlüleri */
  S.ucgenle = p => {
    const n = p.length, V = []; for (let i = 0; i < n; i++) V.push(i); const out = [];
    const cr = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const icinde = (q, a, b, c) => cr(a, b, q) >= -1e-12 && cr(b, c, q) >= -1e-12 && cr(c, a, q) >= -1e-12; // kenar üstü de içeride sayılır (içbükey köşe kulağı bozmasın)
    let guard = 0;
    while (V.length > 3 && guard++ < 10000) {
      let kesildi = false;
      for (let i = 0; i < V.length; i++) {
        const ia = V[(i + V.length - 1) % V.length], ib = V[i], ic = V[(i + 1) % V.length], a = p[ia], b = p[ib], c = p[ic];
        if (cr(a, b, c) <= 1e-12) continue;
        let bos = true; for (const j of V) { if (j === ia || j === ib || j === ic) continue; if (icinde(p[j], a, b, c)) { bos = false; break; } }
        if (!bos) continue; out.push([ia, ib, ic]); V.splice(i, 1); kesildi = true; break;
      }
      if (!kesildi) { V.splice(0, 1); } // bozuk çokgen: bir köşe at, devam et
    }
    if (V.length === 3) out.push([V[0], V[1], V[2]]);
    return out;
  };
  /* belgeden hat tanımı: eksenler + borular */
  S.hatlar = doc => {
    const set = Object.assign({}, VARSAYILAN, doc.set.denizHat || {});
    const cizgi = doc.ents.filter(e => (e.type === 'pline' || e.type === 'line') && /^DENIZ_HATTI/i.test(e.layer || '') && !e.gv).map(e => ({ dn: +e.dn || 0, kot: e.kot != null && isFinite(+e.kot) ? +e.kot : null, pts: S.temiz(e.type === 'line' ? [e.a, e.b] : e.pts) })).filter(c => c.pts.length > 1);
    const eks = cizgi.filter(c => !c.dn).map(c => c.pts), out = [];
    const gruplar = [];
    for (const ek of eks) { const g = { eksen: ek, borular: (set.borular || []).map(b => ({ ad: b.ad, dn: +b.dn || 1000, ofs: +b.ofs || 0 })), ana: true }; gruplar.push(g); for (const b of g.borular) out.push({ ad: b.ad, dn: b.dn, eksen: ek, pts: S.otele(ek, b.ofs) }); }
    for (const c of cizgi) if (c.dn) { gruplar.push({ eksen: c.pts, kot: c.kot, borular: [{ ad: 'DN' + c.dn, dn: c.dn, ofs: 0 }] }); out.push({ ad: 'DN' + c.dn, dn: c.dn, eksen: c.pts, pts: c.pts, tek: true }); } // dn özelliği olan çizgi: tek boru (ör. saha içi basma hattı)
    return { set, eksenler: eks, borular: out, gruplar };
  };

  /* sunum zaman çizelgesi: aşamaların bitiş anları (sn, normal hızda)
     kapı açılır → saha içinde yürüyüş → yükselme → 1. tur (bilgi kutuları sırayla) → kalan turlar → hatta geçiş → hat boyunca → genel görünüş */
  S.sunumSure = V => {
    const yur = V.yuruyus && V.yuruyus.length > 1, Tk = yur ? 4 : 0, Ty = yur ? (+V.yuruSure || 30) : 0, Tg = yur ? 5 : 0, tur = Math.max(0, +V.tur || 0), T1 = tur > 0 ? (+V.turSure || 0) : 0, T2 = Math.max(0, tur - 1) * (+V.turSure || 0);
    const o = { kapi: Tk }; o.yuru = o.kapi + Ty; o.yuksel = o.yuru + Tg; o.tur1 = o.yuksel + T1; o.tur2 = o.tur1 + T2; o.gecis = o.tur2 + 5; o.hat = o.gecis + (+V.hatSure || 0); o.toplam = o.hat + 7; return o;
  };
  /* köşeleri yuvarlatır (Chaikin, n tur): kamera yolu keskin dönmesin */
  S.yumusat = (pts, n) => { let p = S.temiz(pts); for (let k = 0; k < (n || 2); k++) { if (p.length < 3) break; const o = [p[0]]; for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(p[p.length - 1]); p = o; } return p; };
  /* sürgülü bahçe kapısı (endüstriyel tip): a→b açıklığı, yükseklik h, taban kotu z0, ic = saha içine bakan birim vektör
     → { hareketli: kanat (çerçeve, dikmeler, etek sacı, tekerlekler), sabit: iki kapı babası, zemin rayı, kılavuz dikmesi, motor kutusu, L: açıklık, u: kayma yönü } */
  S.kapiAg = (a, b, h, z0, ic) => {
    const L = hyp(b[0] - a[0], b[1] - a[1]); if (!(L > 0.5)) return null; const u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = ic || [-u[1], u[0]];
    const ag = () => ({ pos: [], nrm: [] }), H = ag(), F = ag();
    // yerel kutu: s (kapı boyunca), o (içe doğru), z
    const kutu = (o, s0, s1, o0, o1, za, zb) => {
      const P = (s, q, z) => [a[0] + u[0] * s + n[0] * q, a[1] + u[1] * s + n[1] * q, z], c = [P(s0, o0, za), P(s1, o0, za), P(s1, o1, za), P(s0, o1, za), P(s0, o0, zb), P(s1, o0, zb), P(s1, o1, zb), P(s0, o1, zb)];
      const yuz = (i, j, k, l, nn) => { o.pos.push(...c[i], ...c[j], ...c[k], ...c[i], ...c[k], ...c[l]); for (let q = 0; q < 6; q++) o.nrm.push(...nn); };
      yuz(4, 5, 6, 7, [0, 0, 1]); yuz(3, 2, 1, 0, [0, 0, -1]); yuz(0, 1, 5, 4, [-n[0], -n[1], 0]); yuz(2, 3, 7, 6, [n[0], n[1], 0]); yuz(1, 2, 6, 5, [u[0], u[1], 0]); yuz(3, 0, 4, 7, [-u[0], -u[1], 0]);
    };
    const e = 0.22, zA = z0 + 0.10, zU = z0 + h;                       // kanat duvarın 22 cm içinde kayar
    kutu(H, 0, L, e - 0.04, e + 0.04, zA, zA + 0.10); kutu(H, 0, L, e - 0.04, e + 0.04, zU - 0.08, zU);                         // alt / üst kuşak
    kutu(H, 0, 0.08, e - 0.04, e + 0.04, zA, zU); kutu(H, L - 0.08, L, e - 0.04, e + 0.04, zA, zU);                             // yan dikmeler
    kutu(H, 0.08, L - 0.08, e - 0.025, e + 0.025, zA + 0.62, zA + 0.67);                                                         // ara kuşak
    kutu(H, 0.08, L - 0.08, e - 0.006, e + 0.006, zA + 0.10, zA + 0.62);                                                         // etek sacı
    for (let s = 0.20; s < L - 0.12; s += 0.14) kutu(H, s - 0.015, s + 0.015, e - 0.015, e + 0.015, zA + 0.67, zU - 0.08);       // dikme çubuklar
    for (const s of [0.6, L - 0.6]) kutu(H, s - 0.07, s + 0.07, e - 0.03, e + 0.03, z0 + 0.01, zA);                              // tekerlekler
    for (const s of [-0.30, L + 0.05]) kutu(F, s, s + 0.25, -0.125, 0.125, z0, zU + 0.30);                                       // kapı babaları
    kutu(F, -0.2, 2 * L + 0.4, e - 0.03, e + 0.03, z0, z0 + 0.03);                                                               // zemin rayı (açılınca kanadın gideceği yere kadar)
    kutu(F, L + 0.6, L + 0.68, e + 0.07, e + 0.15, z0, zU + 0.10); kutu(F, L + 0.6, L + 0.68, e - 0.15, e - 0.07, z0, zU + 0.10); // kılavuz dikmeleri
    kutu(F, L + 0.9, L + 1.3, e + 0.10, e + 0.40, z0, z0 + 0.55);                                                                // motor kutusu
    return { hareketli: H, sabit: F, L, u };
  };

  if (typeof document === 'undefined') return; // Node testleri buraya kadar

  /* ---------- Cesium tarafı ---------- */
  const g3 = C.g3d, G = C.geo, $ = s => document.querySelector(s); if (!g3) return;
  const durum = S.durum = { cevre: true, hat: true, oynuyor: false, izle: false, t0: 0, on: 0, mats: [], boy: 0, eksen: null, raf: 0 };
  try { Object.assign(durum, JSON.parse(localStorage.getItem('aritmacad.saha3b') || '{}')); } catch (e) { }
  durum.oynuyor = false; durum.izle = false; durum.mats = []; g3.golge = durum.gercek !== false;
  const sakla = () => { try { localStorage.setItem('aritmacad.saha3b', JSON.stringify({ cevre: durum.cevre, hat: durum.hat, hendek: durum.hendek, gercek: durum.gercek, render: durum.render, sunumHiz: durum.sunumHiz, kalite: durum.kalite, fps: durum.fps })); } catch (e) { } };
  const msg = (t, uyari) => { const el = $('#g3Msg'); if (el) { el.textContent = t || ''; el.style.color = uyari ? '#ffb347' : ''; } };

  const AKIS = 'AritmaAkis';
  const malzemeKaydet = Cs => {
    if (Cs.Material._materialCache.getMaterial(AKIS)) return;
    Cs.Material._materialCache.addMaterial(AKIS, {
      fabric: {
        type: AKIS, uniforms: { color: new Cs.Color(0.1, 0.45, 0.95, 1), time: 0, on: 1e9, len: 14, speed: 2, opak: 0 },
        source: `czm_material czm_getMaterial(czm_materialInput materialInput){
          czm_material m = czm_getDefaultMaterial(materialInput);
          float s = materialInput.st.s;
          float dolu = 1.0 - smoothstep(on - 4.0, on, s);
          float f = fract((s - time * speed) / len);
          float p = smoothstep(0.0, 0.18, f) * (1.0 - smoothstep(0.5, 0.68, f));
          vec3 su = mix(color.rgb * 0.75, vec3(0.80, 0.96, 1.0), p * 0.85);
          vec3 bos = mix(vec3(0.55, 0.57, 0.60), vec3(0.13, 0.13, 0.14), opak); // gömülü: boş boru siyah HDPE
          m.diffuse = mix(bos, su, dolu);
          m.emission = mix(vec3(0.0), su * 0.45, dolu);
          m.alpha = mix(mix(0.45, 0.92, dolu), 1.0, opak);
          return m; }`,
      },
      translucent: () => true,
    });
  };

  const geomUcgen = (Cs, pos, nrm, st, idx) => {
    const n = pos.length / 3, at = { position: new Cs.GeometryAttribute({ componentDatatype: Cs.ComponentDatatype.DOUBLE, componentsPerAttribute: 3, values: new Float64Array(pos) }), normal: new Cs.GeometryAttribute({ componentDatatype: Cs.ComponentDatatype.FLOAT, componentsPerAttribute: 3, values: new Float32Array(nrm) }) };
    if (st) at.st = new Cs.GeometryAttribute({ componentDatatype: Cs.ComponentDatatype.FLOAT, componentsPerAttribute: 2, values: new Float32Array(st) });
    let ind; if (idx) ind = n > 65535 ? new Uint32Array(idx) : new Uint16Array(idx); else { ind = n > 65535 ? new Uint32Array(n) : new Uint16Array(n); for (let i = 0; i < n; i++) ind[i] = i; }
    return new Cs.Geometry({ attributes: at, indices: ind, primitiveType: Cs.PrimitiveType.TRIANGLES, boundingSphere: Cs.BoundingSphere.fromVertices(pos) });
  };
  const enuDizi = (a) => { const o = new Array(a.length); for (let i = 0; i < a.length; i += 3) { const q = g3.toENU(a[i], a[i + 1], a[i + 2]); o[i] = q[0]; o[i + 1] = q[1]; o[i + 2] = q[2]; } return o; };
  const enuYon = (a) => { const o = new Array(a.length), z = g3.toENU(g3.origin[0], g3.origin[1], 0); for (let i = 0; i < a.length; i += 3) { const q = g3.toENU(g3.origin[0] + a[i], g3.origin[1] + a[i + 1], a[i + 2]); const v = [q[0] - z[0], q[1] - z[1], a[i + 2]], l = hyp(v[0], v[1], v[2]) || 1; o[i] = v[0] / l; o[i + 1] = v[1] / l; o[i + 2] = v[2] / l; } return o; };

  /* hat boyunca zemin kotu (kot 0'a göre): Google arazisinden okunan profil varsa o, yoksa sabit; kıyıdan sonra deniz tabanı 1:40 alçalır (en çok −6 m) */
  const eksenAnahtar = (ek, gi) => gi + ':' + ek.length + ':' + ek[0].map(v => v.toFixed(1)).join(',') + ':' + ek[ek.length - 1].map(v => v.toFixed(1)).join(',') + ':' + ((g3.h0 || 0) + (g3.dh || 0)).toFixed(2);
  const zeminDizi = (ek, gi, set, ik) => {
    const z0 = set.zemin != null ? +set.zemin : 0.3, pr = durum.profil && durum.profil[eksenAnahtar(ek, gi)], out = ek.map((p, i) => pr && pr[i] != null ? pr[i] : z0);
    let acc = 0; const zk = out[Math.min(ik, out.length - 1)]; for (let i = ik + 1; i < ek.length; i++) { acc += hyp(ek[i][0] - ek[i - 1][0], ek[i][1] - ek[i - 1][1]); out[i] = Math.min(zk, 0) - Math.min(6, 0.6 + acc / 40); }
    return out;
  };
  /* Google 3B arazisi varsa hat boyunca zemin yüksekliğini okur (boru ve hendek araziyi izlesin); bir kez, sonra model yeniden kurulur */
  const profilOku = async (H) => {
    const Cs = window.Cesium, v = g3.viewer; if (!Cs || !v || !g3.tileset || !v.scene.sampleHeightSupported || g3.h0 == null || durum.profilBekliyor) return;
    const is = []; H.gruplar.forEach((g, gi) => { const ek = S.sik(g.eksen, 15), k = eksenAnahtar(ek, gi); if (!(durum.profil && durum.profil[k]) && !(durum.profilDenendi && durum.profilDenendi[k])) is.push({ ek, k }); });
    if (!is.length) return; durum.profilBekliyor = true; durum.profilDenendi = durum.profilDenendi || {};
    g3.ornekBasla && g3.ornekBasla();
    try {
      for (const { ek, k } of is) {
        durum.profilDenendi[k] = true;
        const r = await v.scene.sampleHeightMostDetailed(ek.map(p => { const ll = G.toLL(p); return Cs.Cartographic.fromDegrees(ll[1], ll[0]); }), g3.model ? [g3.model] : []);
        const taban = (g3.h0 || 0) + (g3.dh || 0), ham = r.map(c => c && isFinite(c.height) ? c.height - taban : null); if (ham.filter(x => x != null).length < ham.length * 0.8) continue;
        const ilkDolu = ham.find(y => y != null), dolu = []; ham.forEach((x, i) => dolu.push(x != null ? x : (i ? dolu[i - 1] : ilkDolu)));
        const orta = dolu.map((_, i) => { const w = dolu.slice(Math.max(0, i - 2), i + 3).sort((a, b) => a - b); return w[Math.floor((w.length - 1) / 2)]; }); // araç / ağaç / bina sıçramaları: 5'li alt ortanca
        (durum.profil = durum.profil || {})[k] = orta.map(x => +x.toFixed(2));
      }
    } catch (err) { console.warn(err); }
    try { g3.ornekBitir && g3.ornekBitir(); } catch (err) { console.warn(err); }
    durum.profilBekliyor = false;
    if (durum.profil && is.some(x => durum.profil[x.k])) { const b = $('#g3Re'); if (b) b.click(); }
  };


  /* ---------- gerçekçi görünüm: bitmiş hâl (asfalt yol + bordür, kilit parke kaldırım, çim ada, boyalı cepheler, ağaç, güneş gölgesi) ---------- */
  const ZEMIN = 'AritmaZemin', DOKULU = ['SAHA_ZEMIN', 'SAHA_YOL', 'SAHA_YESIL', 'SAHA_KAPLAMA'];
  const RENK = { // katman → boyalı / kaplamalı bitmiş yüzey rengi (0–1)
    // SW2_MIM_MEK_R3 görünüşleri: taşıyıcı çerçeve (kolon, kiriş, parapet) #105689 mavi, dolgu duvar açık gri (ACI 9), cam #ACDFDD
    INS_PERDE: [0.74, 0.74, 0.72], INS_TEMEL_RADYE: [0.70, 0.70, 0.68], INS_DOSEME: [0.76, 0.76, 0.74], INS_KOLON: [0.063, 0.337, 0.537], INS_KIRIS: [0.063, 0.337, 0.537],
    INS_DUVAR: [0.753, 0.753, 0.753], INS_DUVAR_TUGLA: [0.753, 0.753, 0.753], INS_PARAPET: [0.063, 0.337, 0.537], INS_CATI_DOSEMESI: [0.60, 0.61, 0.63],
    INS_KAPI: [0.063, 0.337, 0.537], INS_PENCERE: [0.675, 0.875, 0.867], SAHA_DUVAR: [0.89, 0.87, 0.81], SAHA_KAPI: [0.16, 0.20, 0.27], SAHA_KORKULUK: [0.93, 0.76, 0.10],
  };
  const surgulu = e => e.type === 'perde' && e.layer === 'SAHA_KAPI' && /sürgülü/i.test(e.ad || '');
  g3.atla = e => surgulu(e) || (durum.gercek !== false && e.type === 'plak' && DOKULU.includes(e.layer)); // sürgülü kapı ayrı parça olarak çizilir (sunumda açılır)
  g3.renk = e => durum.gercek !== false ? RENK[e.layer] || (/^INS_DUVAR/.test(e.layer || '') ? RENK.INS_DUVAR : null) : null; // duvar katmanı malzemeye göre ad alır (INS_DUVAR_BRIKET…)
  g3.golge = durum.gercek !== false;
  const zeminMalzemeKaydet = Cs => {
    if (Cs.Material._materialCache.getMaterial(ZEMIN)) return;
    Cs.Material._materialCache.addMaterial(ZEMIN, { fabric: { type: ZEMIN, uniforms: { tur: 0 }, source: `
          float shH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float shN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(shH(i), shH(i + vec2(1.0, 0.0)), f.x), mix(shH(i + vec2(0.0, 1.0)), shH(i + vec2(1.0, 1.0)), f.x), f.y); }
          czm_material czm_getMaterial(czm_materialInput materialInput){
            czm_material m = czm_getDefaultMaterial(materialInput);
            vec2 p = materialInput.st; float px = max(fwidth(p.x), fwidth(p.y)), uzak = clamp(px / 0.05, 0.0, 1.0); vec3 col;
            if (tur < 0.5) { // kilit parke (20×10 cm, şaşırtmalı)
              vec2 g = p / vec2(0.2, 0.1); g.x += 0.5 * mod(floor(g.y), 2.0); vec2 c = floor(g), f = fract(g);
              float derz = smoothstep(0.0, 0.10, min(min(f.x, 1.0 - f.x) * 2.0, min(f.y, 1.0 - f.y)));
              col = mix(vec3(0.63, 0.61, 0.58), vec3(0.71, 0.63, 0.57), shH(c)) * mix(0.90, 1.0, shH(c + 7.0));
              col = mix(col * mix(0.70, 1.0, derz), vec3(0.635, 0.595, 0.555), uzak) * (0.93 + 0.14 * shN(p * 0.35));
            } else if (tur < 1.5) { // asfalt
              col = vec3(0.215, 0.215, 0.225) + (shN(p * 9.0) - 0.5) * 0.06 * (1.0 - uzak) + (shN(p * 0.4) - 0.5) * 0.04;
            } else if (tur < 2.5) { // çim
              // çim: iri renk lekeleri + biçme şeritleri + yakından yaprak dokusu (iki yönde uzamış ince gürültü) + seyrek kuru / koyu tutamlar
              float iri = shN(p * 0.55), orta = shN(p * 2.7 + 13.0), serit = 0.5 + 0.5 * sin(dot(p, vec2(0.62, 0.78)) * 5.2);
              float yap = 0.5 * shN(vec2(p.x * 38.0, p.y * 9.0)) + 0.5 * shN(vec2(p.x * 9.0 + 5.0, p.y * 41.0)), ince = shN(p * 85.0);
              float yakin = 1.0 - clamp(px / 0.03, 0.0, 1.0), ortaM = 1.0 - clamp(px / 0.25, 0.0, 1.0);
              col = mix(vec3(0.13, 0.33, 0.09), vec3(0.30, 0.52, 0.16), 0.55 * iri + 0.45 * orta);
              col *= 0.93 + 0.10 * serit * ortaM;                                                         // biçme şeritleri
              col *= 0.74 + 0.52 * mix(0.5, yap, ortaM) ;                                                 // yaprak yönlü doku
              col = mix(col, col * vec3(1.25, 1.18, 0.75), smoothstep(0.80, 0.97, ince) * 0.55 * yakin);  // açık sarımsı uçlar
              col = mix(col, col * 0.55, smoothstep(0.82, 0.98, shN(p * 61.0 + 7.0)) * 0.6 * yakin);      // gölgede kalan dipler
            } else { // beton bordür
              col = vec3(0.80, 0.79, 0.76) * (0.95 + 0.05 * shN(p * 3.0));
            }
            m.diffuse = col * 0.62; m.emission = col * 0.42; m.specular = 0.02; m.shininess = 2.0; m.alpha = 1.0; return m; }` }, translucent: () => false });
  };
  /* küre benzeri taç + gövde: düşük çokgenli ağaç → { pos, nrm } üçgen çorbası (yerel, taban z=0) */
  S.agac = (h, r) => {
    const pos = [], nrm = [], ekle = (a, b, c) => { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = hyp(n[0], n[1], n[2]) || 1; pos.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) nrm.push(n[0] / l, n[1] / l, n[2] / l); };
    const govde = { pos: [], nrm: [] }, tac = { pos, nrm }, K = 8, gz = h * 0.42, gr = Math.max(0.10, r * 0.09);
    for (let j = 0; j < K; j++) { const a0 = j / K * 2 * Math.PI, a1 = (j + 1) / K * 2 * Math.PI, A = [Math.cos(a0) * gr, Math.sin(a0) * gr], B = [Math.cos(a1) * gr, Math.sin(a1) * gr], nn = [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0]; govde.pos.push(A[0], A[1], 0, B[0], B[1], 0, B[0], B[1], gz, A[0], A[1], 0, B[0], B[1], gz, A[0], A[1], gz); for (let i = 0; i < 6; i++) govde.nrm.push(...nn); }
    const M = 6, cz = h - r * 0.8, P = (i, j) => { const th = i / M * Math.PI, ph = j / K * 2 * Math.PI, k = 1 + 0.12 * Math.sin(3 * ph + i); return [Math.sin(th) * Math.cos(ph) * r * k, Math.sin(th) * Math.sin(ph) * r * k, cz + Math.cos(th) * r * 0.8]; };
    for (let i = 0; i < M; i++) for (let j = 0; j < K; j++) { const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1); if (i > 0) ekle(a, b, d); if (i < M - 1) ekle(b, c, d); }
    return { govde, tac };
  };
  /* ağaç görseli: tuvale çizilir (gövde, dallar, binlerce yaprak lekesi; arka plan saydam). tohum: çeşit */
  const agacResim = (tohum) => {
    const W = 512, H = 640, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    let s = (tohum * 9301 + 49297) % 233280; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const gx = W / 2, taban = H - 2, tepe = H * 0.44;
    // gövde ve dallar
    const dal = (x, y, a, boy, kal, d) => { const x2 = x + Math.sin(a) * boy, y2 = y - Math.cos(a) * boy; const gr = g.createLinearGradient(x - kal, 0, x + kal, 0); gr.addColorStop(0, '#3b2a1c'); gr.addColorStop(0.45, '#6b4e33'); gr.addColorStop(1, '#2f2217'); g.strokeStyle = gr; g.lineWidth = kal; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.sin(a) * boy * 0.5 + (rnd() - 0.5) * 10, y - Math.cos(a) * boy * 0.5, x2, y2); g.stroke(); if (d > 0) { const n = 2 + (rnd() < 0.4 ? 1 : 0); for (let i = 0; i < n; i++) dal(x2, y2, a + (rnd() - 0.5) * 1.5, boy * (0.58 + rnd() * 0.2), Math.max(2, kal * 0.62), d - 1); } };
    dal(gx, taban, (rnd() - 0.5) * 0.08, H - tepe - 40, 30, 4);
    // taç: yaprak kümeleri (alttan üste; alt ve iç kısımlar koyu, üst sol açık)
    const kume = []; for (let i = 0; i < 26; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.36; kume.push([gx + Math.cos(a) * r * W * 1.05, H * 0.33 + Math.sin(a) * r * H * 0.62, 46 + rnd() * 46]); }
    kume.sort((p, q) => q[1] - p[1]);
    for (const [cx, cy, rr] of kume) for (let i = 0; i < 520; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * rr, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.9;
      const isik = Math.max(0, Math.min(1, 0.55 - (y - cy) / (rr * 2.2) - (x - cx) / (rr * 4) + (H * 0.33 - cy) / (H * 0.9) + (rnd() - 0.5) * 0.35));
      const R = Math.round(28 + 70 * isik), G = Math.round(70 + 105 * isik), B = Math.round(18 + 38 * isik);
      g.fillStyle = 'rgb(' + R + ',' + G + ',' + B + ')'; g.beginPath(); g.ellipse(x, y, 3 + rnd() * 5, 2 + rnd() * 3.5, rnd() * Math.PI, 0, Math.PI * 2); g.fill();
    }
    return cv;
  };
  const AGAC = 'AritmaAgac';
  const agacMalzemeKaydet = Cs => { if (Cs.Material._materialCache.getMaterial(AGAC)) return; Cs.Material._materialCache.addMaterial(AGAC, { fabric: { type: AGAC, uniforms: { image: Cs.Material.DefaultImageId }, source: 'czm_material czm_getMaterial(czm_materialInput materialInput){ czm_material m = czm_getDefaultMaterial(materialInput); vec4 c = texture(image, materialInput.st); if (c.a < 0.5) discard; m.diffuse = c.rgb * 0.55; m.emission = c.rgb * 0.45; m.specular = 0.0; m.alpha = 1.0; return m; }' }, translucent: () => false }); };
  /* ağaç levhaları: h yükseklikte, w genişlikte, düşey eksen etrafında n levha → { pos, nrm, st, idx } (yerel, taban z = 0) */
  S.agacLevha = (h, w, n) => { const pos = [], nrm = [], st = [], idx = []; for (let i = 0; i < (n || 3); i++) { const a = i / (n || 3) * Math.PI, c = Math.cos(a), s = Math.sin(a), b = pos.length / 3; pos.push(-c * w / 2, -s * w / 2, 0, c * w / 2, s * w / 2, 0, c * w / 2, s * w / 2, h, -c * w / 2, -s * w / 2, h); for (let k = 0; k < 4; k++) nrm.push(-s, c, 0); st.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); } return { pos, nrm, st, idx }; };
  const gunes = () => { // sabit gün ışığı (yaz, sabah 10 suları) + yumuşak gölge
    const Cs = window.Cesium, v = g3.viewer; if (!Cs || !v) return; const ac = durum.gercek !== false;
    try {
      v.clock.shouldAnimate = false; if (!durum.render) v.clock.currentTime = Cs.JulianDate.fromIso8601('2026-06-21T07:45:00Z');
      v.shadows = ac && !durum.golgeYok; if (v.shadowMap) { v.shadowMap.softShadows = true; v.shadowMap.size = 4096; v.shadowMap.maximumDistance = 450; v.shadowMap.darkness = 0.62; }
      if (g3.tileset) g3.tileset.shadows = Cs.ShadowMode.DISABLED;   // Google 3B arazisi gölge hesabına girmez (fotoğrafın kendi gölgesi var; kesimle birlikte sorun çıkarabiliyor)
      if (v.scene.globe) v.terrainShadows = ac ? Cs.ShadowMode.RECEIVE_ONLY : Cs.ShadowMode.DISABLED;      // düz küre varsa (Google anahtarı yokken)
    } catch (err) { console.warn(err); }
  };
  /* çizim hatasında çökmek yerine: sorunlu olabilecek özelliği sırayla kapat (1: gölge, 2: hendek kesimi), çizimi yeniden başlat, ne yapıldığını yaz */
  const koru = () => {
    const v = g3.viewer; if (!v || v.__shKoru) return; v.__shKoru = true;
    try { v.cesiumWidget._showRenderLoopErrors = false; } catch (e) { }
    v.scene.renderError.addEventListener((sc, err) => {
      const ad = String(err && err.message || err), iz = String(err && err.stack || '').split(String.fromCharCode(10)).slice(0, 6).join(' | '); durum.cizimHata = (durum.cizimHata || 0) + 1; console.error(err);
      let ne = '';
      if (!durum.golgeYok && v.shadows) { durum.golgeYok = true; v.shadows = false; ne = 'gölge kapatıldı'; }
      else if (!durum.kesimYok && (g3.ekKesim || []).length) { durum.kesimYok = true; g3.ekKesim = []; try { g3.kesimYenile && g3.kesimYenile(); } catch (e) { } ne = 'hendek kesimi kapatıldı (borular röntgen görünümünde)'; }
      else if (durum.cizimHata > 6) { msg('3B çizim hatası sürüyor: ' + ad, true); C.warn && C.warn('Google 3B çizim hatası: ' + ad + ' — ' + iz); return; }
      C.warn && C.warn('Google 3B çizim hatası yakalandı (' + (ne || 'yeniden deneniyor') + '): ' + ad + ' — ' + iz);
      setTimeout(() => { try { v.useDefaultRenderLoop = true; if (durum.kesimYok) { const b = $('#g3Re'); if (b) b.click(); } v.scene.requestRender(); msg('Çizim hatası yakalandı: ' + (ne || 'yeniden denendi') + '. Ayrıntı komut satırı günlüğünde.', true); } catch (e) { } }, 150);
    });
  };
  const kurGercek = (Cs, coll) => {
    koru(); gunes(); durum.renderParca = []; if (durum.gercek === false && !durum.render) return;
    zeminMalzemeKaydet(Cs); const TUR = ['parke', 'asfalt', 'cim', 'bordur'], rkip = !!durum.render && !!RM;
    const pl = C.doc.ents.filter(e => e.type === 'plak' && DOKULU.includes(e.layer) && C.layer(e.layer).on && e.pts && e.pts.length > 2);
    const yuzey = (pos, nrm, tur, katman) => {
      if (!pos.length) return; const P = enuDizi(pos), st = new Array(P.length / 3 * 2); for (let i = 0, j = 0; i < P.length; i += 3, j += 2) { st[j] = P[i]; st[j + 1] = P[i + 1]; }
      if (rkip) { durum.renderParca.push({ pos: P, nrm: enuYon(nrm), st, mat: (katman && RM.sec(C.doc, { layer: katman })) || TUR[tur] }); return; } // render kipi: zemin de PBR modelin parçası
      coll.add(new Cs.Primitive({ geometryInstances: new Cs.GeometryInstance({ geometry: geomUcgen(Cs, P, enuYon(nrm), st) }), appearance: new Cs.MaterialAppearance({ material: new Cs.Material({ fabric: { type: ZEMIN, uniforms: { tur } } }), translucent: false, closed: false, faceForward: false }), asynchronous: false, shadows: Cs.ShadowMode.ENABLED }));
    };
    const ciz = (katman, tur) => { const pos = [], nrm = []; for (const e of pl.filter(x => x.layer === katman)) { const zt = +e.zt || 0, m = S.prizma(e.pts, zt - (+e.t || 0.2), zt); if (m) { pos.push(...m.pos); nrm.push(...m.nrm); } } yuzey(pos, nrm, tur, katman); };
    ciz('SAHA_ZEMIN', 0); ciz('SAHA_KAPLAMA', 0); ciz('SAHA_YOL', 1); ciz('SAHA_YESIL', 2);   // parke kaldırım · asfalt yol · çim ada
    // bordür: yol ve ada sınırları boyunca 15 × 15 cm beton şerit (yol kotundan 15 cm yüksek)
    { const pos = [], nrm = [];
      for (const e of pl.filter(x => x.layer === 'SAHA_YOL' || x.layer === 'SAHA_YESIL')) { const b = S.bordur(e.pts, 0.15, (+e.zt || 0) - 0.05, (e.layer === 'SAHA_YESIL' ? (+e.zt || 0) + 0.03 : (+e.zt || 0) + 0.15), e.layer === 'SAHA_YESIL'); if (b) { pos.push(...b.pos); nrm.push(...b.nrm); } }
      yuzey(pos, nrm, 3); }
    // ağaçlar
    const ag = (C.doc.set.peyzaj && C.doc.set.peyzaj.agac) || []; if (ag.length) {
      agacMalzemeKaydet(Cs); durum.agacResim = durum.agacResim || [agacResim(1), agacResim(2), agacResim(3)];
      const golge = [];
      ag.forEach((a, i) => { const h = +a[2] || 5, z0 = a[3] != null ? +a[3] : 0.4;
        // görünen ağaç: ağaç resmi dokulu 3 çapraz levha (saydam kısımlar atılır)
        const L = S.agacLevha(h, h * 0.86, 3), P = []; for (let k = 0; k < L.pos.length; k += 3) P.push(L.pos[k] + a[0], L.pos[k + 1] + a[1], L.pos[k + 2] + z0);
        coll.add(new Cs.Primitive({ geometryInstances: new Cs.GeometryInstance({ geometry: geomUcgen(Cs, enuDizi(P), enuYon(L.nrm), L.st, L.idx) }), appearance: new Cs.MaterialAppearance({ material: new Cs.Material({ fabric: { type: AGAC, uniforms: { image: durum.agacResim[i % 3] } } }), translucent: false, closed: false, faceForward: true, renderState: { depthTest: { enabled: true }, depthMask: true, cull: { enabled: false } } }), asynchronous: false, shadows: Cs.ShadowMode.DISABLED }));
        // gölge ve hacim: yaprak levhalarının içinde kalan küçük, koyu taç + gövde (gölgeyi bunlar düşürür; dışarıdan yapraklar görünür)
        const m = S.agac(h * 0.80, h * 0.21), tasi = o => { const q = []; for (let k = 0; k < o.pos.length; k += 3) q.push(o.pos[k] + a[0], o.pos[k + 1] + a[1], o.pos[k + 2] + z0); return q; };
        for (const o of [m.govde, m.tac]) golge.push(new Cs.GeometryInstance({ geometry: geomUcgen(Cs, enuDizi(tasi(o)), enuYon(o.nrm)), attributes: { color: Cs.ColorGeometryInstanceAttribute.fromColor(o === m.govde ? new Cs.Color(0.30, 0.22, 0.14, 1) : new Cs.Color(0.10, 0.24, 0.07, 1)) } })); });
      coll.add(new Cs.Primitive({ geometryInstances: golge, appearance: new Cs.PerInstanceColorAppearance({ flat: false, translucent: false, closed: false }), asynchronous: false, shadows: Cs.ShadowMode.ENABLED }));
    }
  };

  /* ---------- RENDER KİPİ: fiziksel tabanlı malzeme (PBR) + güneş / gökyüzü ışığı + gölge + köşe kararması ----------
     Tesis modeli (nesneler + dokulu zemin) bellekte glTF'e çevrilir (app/render-malzeme.js) ve Cesium Model olarak çizilir.
     Ayarlar projede: C.doc.set.render = { katman: { KATMAN: malzemeId }, ay, saat, ao, parlama } · nesnede e.rmat */
  const RM = C.renderMalz;
  g3.disCiz = () => !!durum.render && !!RM;
  const rset = () => { const s = C.doc.set; if (!s.render) s.render = {}; return s.render; };
  /* dokular: gri / hafif renkli desenler tuvale çizilir, PNG'ye çevrilir (bir kez) */
  const dokuCiz = () => {
    const N = 512, yap = f => { const cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d'); f(g); return cv; };
    let s = 7; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const benek = (g, n, kucuk, buyuk, koyu, acik) => { for (let i = 0; i < n; i++) { const v = Math.round(koyu + rnd() * (acik - koyu)), r = kucuk + rnd() * (buyuk - kucuk), x = rnd() * N, y = rnd() * N; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.5)'; for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, 6.3); g.fill(); } } }; // kenarlarda sarılır → döşenince ek yeri görünmez
    return {
      beton: yap(g => { g.fillStyle = '#d9d9d9'; g.fillRect(0, 0, N, N); benek(g, 2600, 1, 5, 195, 240); benek(g, 60, 14, 40, 205, 228); }),
      siva: yap(g => { g.fillStyle = '#e9e9e9'; g.fillRect(0, 0, N, N); benek(g, 5200, 0.6, 2.2, 214, 250); benek(g, 40, 20, 60, 224, 240); }),
      asfalt: yap(g => { g.fillStyle = '#bdbdbd'; g.fillRect(0, 0, N, N); benek(g, 9000, 0.6, 2.4, 120, 235); benek(g, 50, 16, 50, 170, 205); }),
      cim: yap(g => { g.fillStyle = '#c4d8ac'; g.fillRect(0, 0, N, N); benek(g, 60, 20, 70, 175, 215); for (let i = 0; i < 16000; i++) { const x = rnd() * N, y = rnd() * N, l = 3 + rnd() * 6, a = -1.57 + (rnd() - 0.5) * 1.2, v = rnd(); g.strokeStyle = 'rgb(' + Math.round(120 + 110 * v) + ',' + Math.round(165 + 85 * v) + ',' + Math.round(80 + 80 * v) + ')'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } }),
      parke: yap(g => { g.fillStyle = '#8f8a84'; g.fillRect(0, 0, N, N); const bw = N / 10, bh = N / 20; for (let j = 0; j < 20; j++) for (let i = -1; i < 10; i++) { const x = i * bw + (j % 2 ? bw / 2 : 0), y = j * bh, t = rnd(), c = t < 0.5 ? [205, 200, 192] : t < 0.8 ? [214, 196, 184] : [190, 188, 184], k = 0.9 + rnd() * 0.12; g.fillStyle = 'rgb(' + Math.round(c[0] * k) + ',' + Math.round(c[1] * k) + ',' + Math.round(c[2] * k) + ')'; for (const dx of [0, N]) g.fillRect(x + dx + 1.5, y + 1.5, bw - 3, bh - 3); } benek(g, 1500, 0.5, 1.6, 150, 235); }),
    };
  };
  const dokuPng = () => durum.dokuSoz || (durum.dokuSoz = (async () => { const c = dokuCiz(), o = {}; for (const k in c) { const b = await new Promise(r => c[k].toBlob(r, 'image/png')); o[k] = new Uint8Array(await b.arrayBuffer()); } return o; })());
  /* render kipinde zemin parçaları burada toplanır (kurGercek doldurur), nesne ağları google.js'ten gelir */
  const kurRender = async (Cs, coll) => {
    if (!durum.render || !RM) return; const say = durum.renderSay = (durum.renderSay || 0) + 1;
    const par = (durum.renderParca || []).slice(), renkId = e => { const c = C.aciRgb(C.entColor(e) === 7 ? 9 : C.entColor(e)); return 'renk:' + (c[0] / 255).toFixed(3) + ',' + (c[1] / 255).toFixed(3) + ',' + (c[2] / 255).toFixed(3); };
    for (const m of g3.disMesh || []) par.push({ pos: m.pos, nrm: m.nrm, st: m.st, mat: RM.sec(C.doc, m.e) || renkId(m.e) });
    if (!par.length) return;
    let dok = {}; try { dok = await dokuPng(); } catch (err) { console.warn(err); }
    if (say !== durum.renderSay || g3.model !== coll) return; // bu arada model yeniden kuruldu
    const glb = RM.glb({ parcalar: par, dokular: dok }); if (!glb) return;
    const url = URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' }));
    try {
      const model = await Cs.Model.fromGltfAsync({ url, modelMatrix: enuMat(), upAxis: Cs.Axis.Z, forwardAxis: Cs.Axis.X, shadows: Cs.ShadowMode.ENABLED, backFaceCulling: false, incrementallyLoadTextures: false });
      if (say !== durum.renderSay || g3.model !== coll) { model.destroy && model.destroy(); return; }
      coll.add(model); durum.renderModel = model; model.readyEvent.addEventListener(() => { URL.revokeObjectURL(url); g3.viewer.scene.requestRender(); });
      g3.viewer.scene.requestRender(); durum.renderOzet = { ucgen: par.reduce((s, p) => s + p.pos.length / 9, 0), bayt: glb.length };
    } catch (err) { console.warn(err); msg('Render modeli kurulamadı: ' + (err.message || err), true); URL.revokeObjectURL(url); }
  };
  /* sahne ayarları: güneşin ayı / saati, gölge, köşe kararması (ekran uzayı AO), parlama, kenar yumuşatma */
  const sahneAyar = () => {
    const Cs = window.Cesium, v = g3.viewer; if (!Cs || !v) return; const r = !!durum.render, set = C.doc ? rset() : {}, sc = v.scene;
    try {
      const ay = +set.ay || 6, saat = set.saat != null ? +set.saat : 10; v.clock.shouldAnimate = false;
      if (r && RM && g3.ll) v.clock.currentTime = Cs.JulianDate.fromIso8601(RM.gunesAni(ay, saat, g3.ll[1]));
      const ao = sc.postProcessStages && sc.postProcessStages.ambientOcclusion; if (ao) { ao.enabled = r && set.ao !== false; if (ao.enabled) { const u = ao.uniforms; u.intensity = 2.6; u.bias = 0.12; u.lengthCap = 0.28; u.stepSize = 1.6; u.blurStepSize = 0.9; } }
      const bl = sc.postProcessStages && sc.postProcessStages.bloom; if (bl) { bl.enabled = r && !!set.parlama; if (bl.enabled) { const u = bl.uniforms; u.contrast = 110; u.brightness = -0.25; u.delta = 1.2; u.sigma = 2.4; u.stepSize = 1.2; } }
      if (!durum.sunum || !durum.sunum.eski) { try { sc.msaaSamples = r ? 4 : 1; } catch (e) { } }
      try { sc.light = new Cs.SunLight({ intensity: r ? 3.2 : 2.0 }); } catch (e) { } // PBR yüzeyler uydu görüntüsünün yanında sönük kalmasın: render kipinde güneş daha güçlü
    } catch (err) { console.warn(err); }
    sc.requestRender();
  };
  /* malzeme atama penceresi: katmana göre ve seçili nesnelere */
  S.malzemePencere = () => {
    if (!RM || !C.doc) return; const set = rset(); set.katman = set.katman || {};
    const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const kat = {}; for (const e of C.doc.ents) { if (!C.layer(e.layer).on) continue; let t = null; try { t = C.entTris(e); } catch (er) { } if (t && t.pos && t.pos.length) kat[e.layer] = (kat[e.layer] || 0) + 1; }
    const secenek = (secili) => '<option value="">(çizim rengi)</option>' + Object.entries(RM.LISTE).map(([id, m]) => '<option value="' + id + '"' + (id === secili ? ' selected' : '') + '>' + esc(m.ad) + '</option>').join('');
    const sat = Object.keys(kat).sort().map(k => '<tr><td style="padding:3px 8px 3px 0;font-family:monospace;font-size:12px">' + esc(k) + ' <span class="hint">(' + kat[k] + ')</span></td><td><select data-kat="' + esc(k) + '" style="min-width:220px">' + secenek(set.katman[k] || RM.varsayilan(k) || '') + '</select></td></tr>').join('');
    const nSec = (C.sel || []).length;
    const b = C.modal('Render malzemeleri', '<p class="hint">Her katmana bir malzeme seçin; Render kipinde model bu malzemelerle çizilir. Atamalar projeyle birlikte kaydedilir.</p><div style="max-height:46vh;overflow:auto"><table>' + sat + '</table></div>' +
      '<div class="fld" style="margin-top:10px"><label>Seçili nesnelere ata (' + nSec + ' nesne seçili) — katman atamasını ezer</label><select id="rmSec" ' + (nSec ? '' : 'disabled') + ' style="min-width:220px"><option value="__">—</option><option value="">(katmandaki malzeme)</option>' + Object.entries(RM.LISTE).map(([id, m]) => '<option value="' + id + '">' + esc(m.ad) + '</option>').join('') + '</select></div>' +
      '<div class="bar" style="justify-content:flex-end"><button id="rmSifir">Önerilenlere dön</button><button id="rmTamam" class="pri">Tamam</button></div>');
    const uygula = () => { C.changed && C.changed(); const y = $('#g3Re'); if (y && C.currentView === 'g3d') y.click(); };
    b.querySelectorAll('select[data-kat]').forEach(s => { s.onchange = () => { const k = s.dataset.kat; if (s.value) set.katman[k] = s.value; else set.katman[k] = ''; uygula(); }; });
    b.querySelector('#rmSec').onchange = e => { const v2 = e.target.value; if (v2 === '__') return; for (const x of C.sel || []) { const en = typeof x === 'object' ? x : C.byId(x); if (!en) continue; if (v2) en.rmat = v2; else delete en.rmat; } uygula(); };
    b.querySelector('#rmSifir').onclick = () => { set.katman = {}; for (const e of C.doc.ents) delete e.rmat; uygula(); C.closeModal(); S.malzemePencere(); };
    b.querySelector('#rmTamam').onclick = () => C.closeModal();
  };
  /* yüksek çözünürlüklü tek kare (PNG): 16:9, seçili kalitede (1920 / 3840 px) */
  S.goruntuAl = async () => {
    const Cs = window.Cesium, v = g3.viewer; if (!Cs || !v || durum.sunum) { msg('Sunum / kayıt sürerken görüntü alınamaz.', true); return; }
    const tuval = v.scene.canvas, hedef = +durum.kalite >= 2160 ? 3840 : 1920, dpr = window.devicePixelRatio || 1, kutu = $('#g3Canvas'), ana = $('#cvG3d'), eski = { ubr: v.useBrowserRecommendedResolution, rs: v.resolutionScale, stil: kutu ? kutu.style.cssText : null, dongu: v.useDefaultRenderLoop, istek: v.scene.requestRenderMode };
    const bekle = ms => new Promise(r => setTimeout(r, ms));
    try {
      msg('Görüntü hazırlanıyor…'); let cw = tuval.clientWidth || 1280;
      if (kutu && ana) { const W = ana.clientWidth || cw, Hh = ana.clientHeight || cw * 9 / 16, bw = Math.floor(Math.min(W, Hh * 16 / 9)), bh = Math.floor(bw * 9 / 16); kutu.style.cssText = 'position:absolute;left:' + Math.floor((W - bw) / 2) + 'px;top:' + Math.floor((Hh - bh) / 2) + 'px;width:' + bw + 'px;height:' + bh + 'px'; cw = bw; }
      v.useBrowserRecommendedResolution = false; v.resolutionScale = Math.max(1 / dpr, Math.min(4, hedef / (cw * dpr))); v.useDefaultRenderLoop = false; v.scene.requestRenderMode = false; v.resize();
      const hazir = () => (g3.tileset ? g3.tileset.tilesLoaded : true) && (v.scene.globe ? v.scene.globe.tilesLoaded : true);
      for (let i = 0; i < 80; i++) { v.render(); if (i > 8 && hazir()) break; await bekle(40); }
      v.render(); const blob = await new Promise(r => { v.render(); tuval.toBlob(r, 'image/png'); });
      if (!blob) throw new Error('görüntü üretilemedi');
      const ad = ((C.doc.set.name || 'gorunum') + '-render.png').replace(/[\\/:*?"<>|]+/g, '_'), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ad; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 6000);
      msg('Görüntü indirildi: ' + ad + ' · ' + tuval.width + '×' + tuval.height + ' · ' + (blob.size / 1048576).toFixed(1) + ' MB'); C.log && C.log('🖼 Render görüntüsü indirildi: ' + ad);
    } catch (err) { console.warn(err); msg('Görüntü alınamadı: ' + (err.message || err), true); }
    finally { try { v.useBrowserRecommendedResolution = eski.ubr; v.resolutionScale = eski.rs; if (kutu && eski.stil != null) kutu.style.cssText = eski.stil; v.scene.requestRenderMode = eski.istek; v.useDefaultRenderLoop = eski.dongu; v.resize(); v.scene.requestRender(); } catch (e) { } }
  };

  /* model her kurulduğunda: çevre binalar ve hatlar aynı koleksiyona eklenir (yerleşim / yükseklik modelle birlikte) */
  const kur = () => {
    const Cs = window.Cesium, coll = g3.model; durum.mats = []; durum.sahaBoru = []; durum.eksen = null; durum.boy = 0; g3.ekKesim = [];
    if (!Cs || !coll || !g3.toENU || !C.doc) return;
    let nb = 0, nh = 0;
    { const zem = C.doc.ents.filter(e => e.type === 'plak' && e.layer === 'SAHA_ZEMIN' && e.pts && e.pts.length > 2 && C.layer(e.layer).on);
      g3.sahaHalka = zem.map(e => S.oteleKapali(e.pts, 0.25));
      if (zem.length) { const pos = [], nrm = []; for (const e of zem) { const b = S.bordur(e.pts, 0.25, -4, (+e.zt || 0) - 0.02, false); if (b) { pos.push(...b.pos); nrm.push(...b.nrm); } }
        if (pos.length) coll.add(new Cs.Primitive({ geometryInstances: new Cs.GeometryInstance({ geometry: geomUcgen(Cs, enuDizi(pos), enuYon(nrm)), attributes: { color: Cs.ColorGeometryInstanceAttribute.fromColor(new Cs.Color(0.47, 0.41, 0.33, 1)) } }), appearance: new Cs.PerInstanceColorAppearance({ flat: true, translucent: false, closed: false }), asynchronous: false })); } }
    try { kurGercek(Cs, coll); } catch (err) { console.warn(err); }
    try { sahneAyar(); kurRender(Cs, coll); } catch (err) { console.warn(err); }
    // --- çevre binalar ---
    const cv = C.doc.set.cevre;
    if (durum.cevre && cv && cv.binalar && cv.binalar.length) {
      const insts = [], cizgi = [];
      for (const b of cv.binalar) {
        const m = S.prizma(b.p, -2, +b.h || 7); if (!m) continue; nb++;
        insts.push(new Cs.GeometryInstance({ geometry: geomUcgen(Cs, enuDizi(m.pos), enuYon(m.nrm)), attributes: { color: Cs.ColorGeometryInstanceAttribute.fromColor(new Cs.Color(0.62, 0.80, 1.0, 0.34)) } }));
        for (const [a, c] of m.kenar) { const p = g3.toENU(a[0], a[1], a[2]), q = g3.toENU(c[0], c[1], c[2]); cizgi.push(p[0], p[1], p[2], q[0], q[1], q[2]); }
      }
      if (insts.length) coll.add(new Cs.Primitive({ geometryInstances: insts, appearance: new Cs.PerInstanceColorAppearance({ flat: false, translucent: true, closed: true }), asynchronous: false }));
      if (cizgi.length) {
        const lp = new Float64Array(cizgi), li = lp.length / 3 > 65535 ? new Uint32Array(lp.length / 3) : new Uint16Array(lp.length / 3); for (let i = 0; i < li.length; i++) li[i] = i;
        const lg = new Cs.Geometry({ attributes: { position: new Cs.GeometryAttribute({ componentDatatype: Cs.ComponentDatatype.DOUBLE, componentsPerAttribute: 3, values: lp }) }, indices: li, primitiveType: Cs.PrimitiveType.LINES, boundingSphere: Cs.BoundingSphere.fromVertices(lp) });
        coll.add(new Cs.Primitive({ geometryInstances: new Cs.GeometryInstance({ geometry: lg, attributes: { color: Cs.ColorGeometryInstanceAttribute.fromColor(new Cs.Color(0.20, 0.33, 0.50, 0.55)) } }), appearance: new Cs.PerInstanceColorAppearance({ flat: true, translucent: true }), asynchronous: false }));
      }
    }
    // --- deniz hatları ---
    const H = S.hatlar(C.doc);
    if (durum.hat && H.borular.length) {
      malzemeKaydet(Cs);
      const renk = dn => dn >= 1200 ? new Cs.Color(0.05, 0.42, 0.95, 1) : new Cs.Color(0.0, 0.70, 0.78, 1);
      // gömülü borular: zemin kotundan "örtü" kadar aşağıda; karada açık hendek kesiti (harita hendek boyunca kesilir), denizde deniz tabanında
      const hendekli = durum.hendek !== false && !durum.kesimYok, ortu = +H.set.ortu || 1.2, yan = [], tab = []; g3.ekKesim = [];
      const boruEkle = (pts, zs, r, s0, dn, gomulu, saha) => {
        const t = S.tup(pts, zs, r, 14, s0); if (!t) return 0;
        const mat = new Cs.Material({ fabric: { type: AKIS, uniforms: { color: renk(dn), time: 0, on: durum.oynuyor ? durum.on : 1e9, len: 14, speed: +H.set.hiz || 2, opak: gomulu ? 1 : 0 } } });
        mat._saha = !!saha; durum.mats.push(mat);
        const pr = coll.add(new Cs.Primitive({
          geometryInstances: new Cs.GeometryInstance({ geometry: geomUcgen(Cs, enuDizi(t.pos), enuYon(t.nrm), t.st, t.idx) }),
          appearance: new Cs.MaterialAppearance({ material: mat, translucent: !gomulu, closed: true, faceForward: false, renderState: gomulu ? { depthTest: { enabled: true }, depthMask: true, cull: { enabled: true } } : { depthTest: { enabled: false }, depthMask: false, cull: { enabled: true }, blending: Cs.BlendingState.ALPHA_BLEND } }),
          asynchronous: false,
        }));
        if (saha) { durum.sahaBoru.push(pr); pr.show = false; } // tesis içi boru yalnız sunum yürüyüşünde açılır (röntgen çizim her şeyin üstüne biner)
        return t.boy;
      };
      H.gruplar.forEach((g, gi) => {
        const ek = S.sik(g.eksen, 15), gm = S.gomme(g.borular, ortu);
        // kıyı noktası (yalnız ana hatta): sonrası deniz
        let ik = ek.length - 1; if (g.ana && H.set.kiyiIndex != null && g.eksen[H.set.kiyiIndex]) { const kp = g.eksen[H.set.kiyiIndex]; let en = 1e9; ek.forEach((p, i) => { const d = hyp(p[0] - kp[0], p[1] - kp[1]); if (d < en) { en = d; ik = i; } }); }
        const zU = zeminDizi(ek, gi, H.set, ik);
        if (hendekli && ik > 0 && g.ana) { const h = S.hendek(S.otele(ek, gm.kay).slice(0, ik + 1), gm.w, zU.slice(0, ik + 1), zU.slice(0, ik + 1).map(z => z - gm.derin)); if (h) { yan.push(h.yan); tab.push(h.taban); g3.ekKesim.push(h.halka); } }
        g.borular.forEach((b, bi) => {
          const r = Math.max(0.25, b.dn / 2000), pts = S.otele(ek, b.ofs), zs = g.kot != null ? zU.map(() => g.kot) : zU.map(z => z - gm.eksen[bi]); nh++; // çizgide "kot" varsa boru ekseni o kottadır (projedeki giriş kotu)
          if (!g.ana) { boruEkle(pts, zs, r, 0, b.dn, false, true); return; }   // tesis içi boru: kaplamanın altında, röntgen gibi görünür (akış yönü seçilsin)
          if (!hendekli) { boruEkle(pts, zs, r, 0, b.dn, false); return; }
          const kara = ik > 0 ? boruEkle(pts.slice(0, ik + 1), zs.slice(0, ik + 1), r, 0, b.dn, true) : 0;
          if (ik < ek.length - 1) boruEkle(pts.slice(ik), zs.slice(ik), r, kara, b.dn, false);                 // deniz: su altında, yüzeyden seçilir
        });
      });
      if (yan.length) {
        const birles = a => ({ pos: [].concat(...a.map(x => x.pos)), nrm: [].concat(...a.map(x => x.nrm)) }), Y = birles(yan), T = birles(tab);
        coll.add(new Cs.Primitive({ geometryInstances: [
          new Cs.GeometryInstance({ geometry: geomUcgen(Cs, enuDizi(Y.pos), enuYon(Y.nrm)), attributes: { color: Cs.ColorGeometryInstanceAttribute.fromColor(new Cs.Color(0.50, 0.38, 0.26, 1)) } }),
          new Cs.GeometryInstance({ geometry: geomUcgen(Cs, enuDizi(T.pos), enuYon(T.nrm)), attributes: { color: Cs.ColorGeometryInstanceAttribute.fromColor(new Cs.Color(0.66, 0.58, 0.44, 1)) } }),
        ], appearance: new Cs.PerInstanceColorAppearance({ flat: false, translucent: false, closed: false }), asynchronous: false }));
      }
      if (!hendekli) { // röntgen görünümü: uzaktan da seçilsin diye eksenler ekran kalınlığında çizgi
        try {
          const pc = new Cs.PolylineCollection(), z = (+H.set.zemin || 0.3) + 0.6;
          for (const b of H.borular) pc.add({ positions: b.pts.map(p => { const q = g3.toENU(p[0], p[1], z); return new Cs.Cartesian3(q[0], q[1], q[2]); }), width: b.dn >= 1200 ? 3 : 2, material: Cs.Material.fromType('Color', { color: renk(b.dn).withAlpha(0.85) }) });
          coll.add(pc);
        } catch (err) { console.warn(err); }
      }
      setTimeout(() => profilOku(H), 3500);
      durum.eksen = H.eksenler[0]; durum.boy = S.boy(durum.eksen);
      // etiketler
      try {
        const lc = new Cs.LabelCollection(), et = (p, z, text) => { const q = g3.toENU(p[0], p[1], z); lc.add({ position: new Cs.Cartesian3(q[0], q[1], q[2]), text, font: 'bold 14px Arial', fillColor: Cs.Color.WHITE, outlineColor: Cs.Color.BLACK, outlineWidth: 3, style: Cs.LabelStyle.FILL_AND_OUTLINE, verticalOrigin: Cs.VerticalOrigin.BOTTOM, disableDepthTestDistance: Number.POSITIVE_INFINITY, scaleByDistance: new Cs.NearFarScalar(200, 1, 4000, 0.55) }); };
        const e = durum.eksen, ozet = (H.set.borular || []).reduce((m, b) => { m[b.dn] = (m[b.dn] || 0) + 1; return m; }, {}), yazi = Object.entries(ozet).sort((a, b) => b[0] - a[0]).map(([dn, k]) => `${k}×DN${dn}`).join(' + ');
        et(e[0], 9, 'SW2 yükleme bacası'); et(S.noktaAt(e, durum.boy * 0.5).p, 5, yazi + ' · ' + Math.round(durum.boy) + ' m');
        const ki = H.set.kiyiIndex != null && e[H.set.kiyiIndex] ? e[H.set.kiyiIndex] : null; if (ki) et(ki, 4, 'Kıyı'); et(e[e.length - 1], 4, 'Deniz deşarjı');
        coll.add(lc); durum.etiket = lc;
      } catch (err) { console.warn(err); }
    }
    try { sunumEtiketKur(Cs, coll); } catch (err) { console.warn(err); }
    // sürgülü kapı: sabit parçalar + kayan kanat (kanat ayrı çizilir; sunumda modelMatrix ile kaydırılır)
    durum.kapi = null;
    try {
      const ke = C.doc.ents.find(e => surgulu(e) && C.layer(e.layer).on && e.pts && e.pts.length > 1);
      if (ke) {
        const a = ke.pts[0], b = ke.pts[ke.pts.length - 1], u = [b[0] - a[0], b[1] - a[1]], o = g3.origin, yan = [-u[1], u[0]], l = hyp(yan[0], yan[1]) || 1, sg = ((o[0] - a[0]) * yan[0] + (o[1] - a[1]) * yan[1]) >= 0 ? 1 : -1;
        const K = S.kapiAg(a, b, +ke.h || 2.1, +ke.z0 || 0, [yan[0] / l * sg, yan[1] / l * sg]);
        if (K) {
          const par = (m, c) => new Cs.Primitive({ geometryInstances: new Cs.GeometryInstance({ geometry: geomUcgen(Cs, enuDizi(m.pos), enuYon(m.nrm)), attributes: { color: Cs.ColorGeometryInstanceAttribute.fromColor(c) } }), appearance: new Cs.PerInstanceColorAppearance({ flat: false, translucent: false, closed: false }), asynchronous: false, shadows: Cs.ShadowMode.ENABLED });
          coll.add(par(K.sabit, new Cs.Color(0.42, 0.44, 0.47, 1))); const kanat = coll.add(par(K.hareketli, new Cs.Color(0.10, 0.20, 0.33, 1)));
          const e0 = g3.toENU(a[0], a[1], 0), e1 = g3.toENU(a[0] + K.u[0], a[1] + K.u[1], 0);
          durum.kapi = { kanat, yon: [e1[0] - e0[0], e1[1] - e0[1], 0], L: K.L, acik: 0 };
        }
      }
    } catch (err) { console.warn(err); }
    const bt = $('#shOyna'); if (bt) bt.disabled = !durum.mats.length; const bu = $('#shUc'); if (bu) bu.disabled = !durum.mats.length;
    S.son = { bina: nb, boru: nh };
  };
  C.on('g3dmodel', kur);
  C.on('g3dzemin', () => { const b = $('#g3Re'); if (b) setTimeout(() => b.click(), 50); }); // kot 0 değişti: hendek ve borular yeni zemine göre yeniden kurulur

  /* ---------- animasyon ---------- */
  const dunya = (p, z) => { const Cs = window.Cesium, q = g3.toENU(p[0], p[1], z || 0), h = (g3.h0 == null ? 0 : g3.h0) + (g3.dh || 0); return Cs.Matrix4.multiplyByPoint(Cs.Transforms.eastNorthUpToFixedFrame(Cs.Cartesian3.fromDegrees(g3.ll[1], g3.ll[0], h)), new Cs.Cartesian3(q[0], q[1], q[2]), new Cs.Cartesian3()); };
  const kare = () => {
    const Cs = window.Cesium, v = g3.viewer; if (!durum.oynuyor || !Cs || !v) return;
    const t = (performance.now() - durum.t0) / 1000, sure = Math.max(12, Math.min(40, durum.boy / 45)); // su cephesi: tüm hat 12–40 sn
    durum.on = Math.min(durum.boy + 10, t / sure * durum.boy);
    for (const m of durum.mats) { m.uniforms.time = t; m.uniforms.on = durum.on; }
    if (durum.izle && durum.eksen && g3.ll) {
      const k = S.noktaAt(durum.eksen, Math.min(durum.on, durum.boy)), ilk = dunya(k.p, 2);
      const e = g3.toENU(g3.origin[0] + k.u[0], g3.origin[1] + k.u[1], 0), z = g3.toENU(g3.origin[0], g3.origin[1], 0), bas = Math.atan2(e[0] - z[0], e[1] - z[1]);
      durum.bas = durum.bas == null ? bas : durum.bas + Math.atan2(Math.sin(bas - durum.bas), Math.cos(bas - durum.bas)) * 0.04; // yumuşak dönüş
      v.camera.lookAt(ilk, new Cs.HeadingPitchRange(durum.bas - 0.5, Cs.Math.toRadians(-28), 330));
      if (durum.on >= durum.boy + 9) { durum.izle = false; v.camera.lookAtTransform(Cs.Matrix4.IDENTITY); tumHat(); dugme(); }
    }
    v.scene.requestRender(); durum.raf = requestAnimationFrame(kare);
  };
  const dugme = () => { const b = $('#shOyna'); if (b) b.textContent = durum.oynuyor ? '⏸ Akışı durdur' : '▶ Akışı oynat'; const u = $('#shUc'); if (u) u.textContent = durum.izle ? '■ Uçuşu bırak' : '✈ Hat boyunca uç'; };
  S.oynat = (bastan) => { if (!durum.mats.length) { msg('Deniz hattı yok: DENIZ_HATTI katmanına güzergâh ekseni çizin (çoklu çizgi).', true); return; } if (bastan || !durum.oynuyor) durum.t0 = performance.now(); durum.oynuyor = true; cancelAnimationFrame(durum.raf); kare(); dugme(); };
  S.durdur = () => { durum.oynuyor = false; durum.izle = false; cancelAnimationFrame(durum.raf); for (const m of durum.mats) m.uniforms.on = 1e9; const Cs = window.Cesium; if (Cs && g3.viewer) { g3.viewer.camera.lookAtTransform(Cs.Matrix4.IDENTITY); g3.viewer.scene.requestRender(); } dugme(); };
  S.uc = () => { if (durum.izle) { durum.izle = false; const Cs = window.Cesium; g3.viewer.camera.lookAtTransform(Cs.Matrix4.IDENTITY); dugme(); return; } durum.izle = true; durum.bas = null; S.oynat(true); };
  /* tüm hattı (istasyondan denize) kuşbakışı gösterir */
  const tumHat = () => {
    const Cs = window.Cesium, v = g3.viewer; if (!Cs || !v || !durum.eksen || !g3.ll) return;
    const pts = durum.eksen.map(p => dunya(p, 0)), bs = Cs.BoundingSphere.fromPoints(pts);
    v.camera.flyToBoundingSphere(bs, { offset: new Cs.HeadingPitchRange(Cs.Math.toRadians(-20), Cs.Math.toRadians(-38), bs.radius * 2.6), duration: 1.8 });
  };
  S.tumHat = tumHat;

  /* ---------- SUNUM: tesis çevresinde tur (bina bilgileri) → hat boyunca yavaş ilerleyiş (hat bilgileri) → genel görünüş; istenirse video kaydı ----------
     Veri: C.doc.set.sunum = { tur, turSure (sn/tur), hatSure (sn), binalar: [{ p: [x, y], z, satirlar: [..] }], hat: [{ s (m, eksen boyunca), z, satirlar: [..] }] } */
  S.sunumVeri = doc => {
    const s = Object.assign({ tur: 2, turSure: 26, hatSure: 0, yuruSure: 30, binalar: [], hat: [], yuruyus: null }, doc.set.sunum || {}), H = S.hatlar(doc), ek = H.eksenler[0];
    if (ek && !(s.hat && s.hat.length)) { // veri yoksa hat özetinden üret
      const L = S.boy(ek), oz = (H.set.borular || []).reduce((m, b) => { m[b.dn] = (m[b.dn] || 0) + 1; return m; }, {}), yazi = Object.entries(oz).sort((a, b) => b[0] - a[0]).map(([dn, k]) => k + ' × DN' + dn).join(' + ');
      s.hat = [{ s: Math.min(25, L * 0.05), satirlar: ['DENİZ DEŞARJ HATTI', yazi] }, { s: L * 0.5, satirlar: ['Hat boyu ≈ ' + Math.round(L) + ' m'] }, { s: L, satirlar: ['DENİZ DEŞARJI'] }];
    }
    if (!(s.hatSure > 0)) s.hatSure = ek ? Math.max(45, Math.min(150, S.boy(ek) / 13)) : 45; // "yavaş yavaş": ≈ 13 m/sn
    return s;
  };
  /* yumuşak geçiş (0..1) */
  S.yumusak = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const sunumEtiketKur = (Cs, coll) => {
    durum.sunumEt = null; if (!C.doc) return; const V = S.sunumVeri(C.doc), ek = durum.eksen;
    const lc = new Cs.BillboardCollection(), pc = new Cs.PolylineCollection(), bina = [], hat = [];
    // bilgi kutusu: başlık kalın, alt satırlar ince; yuvarlak köşeli koyu kutu (2× çözünürlükte çizilir, yarı ölçekte gösterilir → keskin yazı)
    const kutu = (satirlar, renk) => {
      const cv = document.createElement('canvas'), x = cv.getContext('2d'), K = 2, f1 = 'bold ' + 17 * K + 'px Arial', f2 = 14 * K + 'px Arial', pad = 11 * K, sy = 21 * K;
      let w = 0; satirlar.forEach((s, i) => { x.font = i ? f2 : f1; w = Math.max(w, x.measureText(s).width); });
      cv.width = Math.ceil(w + pad * 2); cv.height = Math.ceil(pad * 2 + sy * satirlar.length - 4 * K);
      const g = cv.getContext('2d'), r = 7 * K; g.beginPath(); g.moveTo(r, 0); g.arcTo(cv.width, 0, cv.width, cv.height, r); g.arcTo(cv.width, cv.height, 0, cv.height, r); g.arcTo(0, cv.height, 0, 0, r); g.arcTo(0, 0, cv.width, 0, r); g.closePath();
      g.fillStyle = renk; g.fill(); g.lineWidth = 1.5 * K; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.stroke();
      g.textBaseline = 'top'; g.textAlign = 'center'; satirlar.forEach((s, i) => { g.font = i ? f2 : f1; g.fillStyle = i ? '#e3eef5' : '#ffffff'; g.fillText(s, cv.width / 2, pad + sy * i - 1 * K); });
      return cv;
    };
    const ekle = (p, zAlt, zUst, satirlar, renk) => {
      const q = g3.toENU(p[0], p[1], zUst), q0 = g3.toENU(p[0], p[1], zAlt);
      const l = lc.add({ position: new Cs.Cartesian3(q[0], q[1], q[2]), image: kutu(satirlar, renk), scale: 0.5, verticalOrigin: Cs.VerticalOrigin.BOTTOM, horizontalOrigin: Cs.HorizontalOrigin.CENTER, disableDepthTestDistance: Number.POSITIVE_INFINITY, show: false });
      const c = pc.add({ positions: [new Cs.Cartesian3(q0[0], q0[1], q0[2]), new Cs.Cartesian3(q[0], q[1], q[2])], width: 2, material: Cs.Material.fromType('Color', { color: Cs.Color.WHITE.withAlpha(0.9) }), show: false });
      return { l, c };
    };
    for (const b of V.binalar || []) if (b.p && b.satirlar) bina.push(ekle(b.p, +b.z || 5, (+b.z || 5) + 3, b.satirlar, 'rgba(10,56,97,0.88)')); // ardışık etiketler farklı yükseklikte: üst üste binmesin
    if (ek) for (const h of V.hat || []) { const k = S.noktaAt(ek, Math.max(0, Math.min(durum.boy, +h.s || 0))); hat.push(Object.assign(ekle(k.p, 0.5, (h.z != null ? +h.z : 9), h.satirlar, 'rgba(5,76,107,0.88)'), { s: +h.s || 0 })); }
    coll.add(lc); coll.add(pc); durum.sunumEt = { bina, hat, veri: V }; if (durum.sunum && durum.sunum.olcek) etiketOlcek(durum.sunum.olcek);
  };
  const sunumGoster = (liste, ac) => { for (const x of liste || []) { x.l.show = ac; x.c.show = false /* bilgi kutusunun altında kılavuz çizgi gösterilmez (kullanıcı isteği) */; } };
  /* kamera yardımcıları: tüm pozlar tesisin yerel doğu-kuzey-yukarı (ENU) çerçevesinde göz + hedef olarak verilir */
  const enuMat = () => { const Cs = window.Cesium, h = (g3.h0 == null ? 0 : g3.h0) + (g3.dh || 0); return Cs.Transforms.eastNorthUpToFixedFrame(Cs.Cartesian3.fromDegrees(g3.ll[1], g3.ll[0], h)); };
  const bak = (mm, goz, hedef) => {
    const Cs = window.Cesium, v = g3.viewer, E = Cs.Matrix4.multiplyByPoint(mm, new Cs.Cartesian3(goz[0], goz[1], goz[2]), new Cs.Cartesian3()), T = Cs.Matrix4.multiplyByPoint(mm, new Cs.Cartesian3(hedef[0], hedef[1], hedef[2]), new Cs.Cartesian3());
    const d = Cs.Cartesian3.normalize(Cs.Cartesian3.subtract(T, E, new Cs.Cartesian3()), new Cs.Cartesian3()), up = Cs.Cartesian3.normalize(Cs.Matrix4.multiplyByPointAsVector(mm, new Cs.Cartesian3(0, 0, 1), new Cs.Cartesian3()), new Cs.Cartesian3());
    v.camera.setView({ destination: E, orientation: { direction: d, up } });
  };
  const yorunge = (h, bas, egim, R) => { const c = Math.cos(egim); return [h[0] - Math.sin(bas) * c * R, h[1] - Math.cos(bas) * c * R, h[2] - Math.sin(egim) * R]; }; // hedefe "bas" yönünde, "egim" (−) açısıyla R uzaktan bakan göz
  const kar = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const kapiAyar = (mm, acik) => { const Cs = window.Cesium, K = durum.kapi; if (!K) return; K.acik = acik; const d = acik * (K.L + 0.15); K.kanat.modelMatrix = acik > 0 ? Cs.Matrix4.multiply(mm, Cs.Matrix4.fromTranslation(new Cs.Cartesian3(K.yon[0] * d, K.yon[1] * d, 0)), new Cs.Matrix4()) : mm; };
  /* sunumun t anındaki (sn, normal hız) durumu: kamera, kapı, bilgi kutuları, akış. dt: önceki kareden bu yana geçen sunum süresi. Bittiyse false döner. */
  const sunumAdim = (su, t, dt) => {
    const Cs = window.Cesium, E = durum.sunumEt, V = E.veri, Z = S.sunumSure(V), mm = enuMat(), ek = durum.eksen, enu = (p, z) => g3.toENU(p[0], p[1], z);
    const b = g3.bb, mer = enu([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], 9), R = Math.max(85, hyp(b[2] - b[0], b[3] - b[1]) * 1.3), egim = Cs.Math.toRadians(-27); // hedef yapıların üstünde, yörünge geniş: bilgi kutuları çerçeveden taşmaz
    const yonu = u => { const e = g3.toENU(g3.origin[0] + u[0], g3.origin[1] + u[1], 0), z = g3.toENU(g3.origin[0], g3.origin[1], 0); return Math.atan2(e[0] - z[0], e[1] - z[1]); };
    if (!su.yol) { // yürüyüş yolu bir kez hazırlanır
      su.yol = V.yuruyus && V.yuruyus.length > 1 ? S.yumusat(V.yuruyus, 3) : null; su.yolBoy = su.yol ? S.boy(su.yol) : 0;
      const sonHedef = (V.binalar || []).length ? V.binalar[V.binalar.length - 1] : null; su.yolSon = sonHedef ? enu(sonHedef.p, (+sonHedef.z || 6) * 0.95) : mer; // son yapının üst kenarına bakılır (yakından düz duvar ekranı kaplamasın)
    }
    const yurPoz = s => { // yol üzerinde s metredeki göz ve hedef (göz 3,2 m yüksekte, 10 m ileriye bakar; sona yaklaşırken son yapıya döner)
      const k = S.noktaAt(su.yol, s), ileri = S.noktaAt(su.yol, Math.min(su.yolBoy, s + 10)), goz = enu(k.p, (V.gozKot != null ? +V.gozKot : 0.4) + 3.2);
      let hedef = enu([ileri.p[0] + ileri.u[0] * Math.max(0, s + 10 - su.yolBoy), ileri.p[1] + ileri.u[1] * Math.max(0, s + 10 - su.yolBoy)], (V.gozKot != null ? +V.gozKot : 0.4) + 2.2);
      const son = S.yumusak((s - (su.yolBoy - 14)) / 14); if (son > 0) hedef = kar(hedef, su.yolSon, son);
      return { goz, hedef };
    };
    const turBas0 = () => { if (su.bas0 == null) { if (su.yol) { const p = yurPoz(su.yolBoy); su.bas0 = Math.atan2(p.hedef[0] - p.goz[0], p.hedef[1] - p.goz[1]); } else su.bas0 = Cs.Math.toRadians(200); } return su.bas0; };
    const turPoz = tt => ({ goz: yorunge(mer, turBas0() + tt / (+V.turSure || 24) * 2 * Math.PI, egim, R), hedef: mer });
    const sahaAkis = on => { for (const m of durum.mats) { m.uniforms.time = t; m.uniforms.on = m._saha ? 1e9 : on; } };
    const sahaBoru = ac => { for (const p of durum.sahaBoru || []) p.show = ac; };
    let asama, poz;
    if (t < Z.kapi) { // 0) kapının önünde: kapı kayarak açılır
      asama = 'Giriş kapısı açılıyor'; sahaBoru(false); poz = yurPoz(0); kapiAyar(mm, S.yumusak((t - 0.8) / Math.max(0.5, Z.kapi - 1.2))); sahaAkis(0); sunumGoster(E.bina, false); sunumGoster(E.hat, false);
    } else if (t < Z.yuru) { // 1) kapıdan girilir; terfinin yanından, kolektörün önünden yükleme bacasına
      asama = 'Tesis içinde'; const k = (t - Z.kapi) / (Z.yuru - Z.kapi), s = su.yolBoy * (k < 0.12 ? k * k / 0.24 : k > 0.88 ? 1 - (1 - k) * (1 - k) / 0.24 : (k - 0.06) / 0.88); // yumuşak kalkış / duruş, arada sabit hız
      poz = yurPoz(Math.max(0, Math.min(su.yolBoy, s))); kapiAyar(mm, 1); sahaAkis(0); sahaBoru(s > su.yolBoy * 0.42); // kolektörün önüne dönünce tesis içi boru görünür
    } else if (t < Z.yuksel) { // 2) yükselip tur yörüngesine geçiş; kapı kapanır
      asama = 'Yükseliş'; const k = S.yumusak((t - Z.yuru) / (Z.yuksel - Z.yuru)), a = yurPoz(su.yolBoy), z = turPoz(0); poz = { goz: kar(a.goz, z.goz, k), hedef: kar(a.hedef, z.hedef, k) }; kapiAyar(mm, 1 - k); sahaAkis(0); sahaBoru(k < 0.55);
    } else if (t < Z.tur2) { // 3) turlar: ilk turda bilgi kutuları sırayla, her seferinde yalnız biri
      const tt = t - Z.yuksel; poz = turPoz(tt); kapiAyar(mm, 0); sahaAkis(0); sunumGoster(E.hat, false); sahaBoru(false); // turda tesis içi boru gizli (röntgen çizim yapıların ve bilgi kutularının üstüne biner)
      if (t < Z.tur1) { asama = 'Tesis çevresinde tur — bilgiler'; const n = E.bina.length, f = tt / (Z.tur1 - Z.yuksel) * n; E.bina.forEach((x, i) => { const ac = f >= i + 0.06 && f <= i + 0.94; x.l.show = ac; x.c.show = false /* bilgi kutusunun altında kılavuz çizgi gösterilmez (kullanıcı isteği) */; });
        // kutusu açık olan yapıya odaklan: hedef o yapıya kayar, kamera biraz yaklaşır (kutu çerçeveden taşmasın); dilim başında / sonunda etki sıfır → sıçrama olmaz
        const i = Math.min(n - 1, Math.floor(f)), bb2 = (V.binalar || [])[i]; if (bb2 && bb2.p) { const w = Math.sin(Math.PI * Math.max(0, Math.min(1, f - i))) ** 2, hd = kar(mer, enu(bb2.p, (+bb2.z || 5) + 5), 0.8 * w); poz = { goz: yorunge(hd, turBas0() + tt / (+V.turSure || 24) * 2 * Math.PI, egim, R * (1 - 0.22 * w)), hedef: hd }; } }
      else { asama = 'Tesis çevresinde tur'; sunumGoster(E.bina, false); }
    } else if (!ek || !durum.mats.length) { return false;
    } else if (t < Z.gecis) { // 4) hatta geçiş
      asama = 'Hatta geçiş'; const k = S.yumusak((t - Z.tur2) / (Z.gecis - Z.tur2)), a = turPoz(Z.tur2 - Z.yuksel), h0 = enu(ek[0], 2), bs = yonu(S.noktaAt(ek, 0).u) - 0.45; su.bas = bs;
      const z = { goz: yorunge(h0, bs, Cs.Math.toRadians(-32), 240), hedef: h0 }; poz = { goz: kar(a.goz, z.goz, k), hedef: kar(a.hedef, z.hedef, k) }; kapiAyar(mm, 0); sahaAkis(0); sunumGoster(E.bina, false);
    } else if (t < Z.hat) { // 5) hat boyunca: su cephesi ilerler, geçtikçe hat bilgileri açılır
      asama = 'Hat boyunca'; const tt = t - Z.gecis; durum.on = Math.min(durum.boy + 10, tt / (Z.hat - Z.gecis) * (durum.boy + 10));
      for (const m of durum.mats) { m.uniforms.time = t; m.uniforms.on = m._saha ? 1e9 : durum.on; }
      const k = S.noktaAt(ek, Math.min(durum.on, durum.boy)), bs = yonu(k.u) - 0.45, yum = 1 - Math.exp(-Math.max(0, dt) / 1.1); su.bas = su.bas == null ? bs : su.bas + Math.atan2(Math.sin(bs - su.bas), Math.cos(bs - su.bas)) * yum; // kare hızından bağımsız yumuşak dönüş
      const h = enu(k.p, 2); poz = { goz: yorunge(h, su.bas, Cs.Math.toRadians(-32), 240), hedef: h }; sunumGoster(E.bina, false);
      for (const x of E.hat) { const ac = durum.on >= x.s - 15; x.l.show = ac; x.c.show = false /* bilgi kutusunun altında kılavuz çizgi gösterilmez (kullanıcı isteği) */; }
    } else if (t < Z.toplam) { // 6) kapanış: hattın tamamı kuşbakışı
      asama = 'Genel görünüş'; for (const m of durum.mats) { m.uniforms.time = t; m.uniforms.on = 1e9; }
      const k = S.yumusak((t - Z.hat) / 3), a = (() => { const q = S.noktaAt(ek, durum.boy), h = enu(q.p, 2); return { goz: yorunge(h, su.bas == null ? 0 : su.bas, Cs.Math.toRadians(-32), 240), hedef: h }; })();
      const orta = enu(S.noktaAt(ek, durum.boy * 0.5).p, 0), z = { goz: yorunge(orta, yonu(S.noktaAt(ek, durum.boy * 0.5).u) - 0.5, Cs.Math.toRadians(-38), Math.max(300, durum.boy * 1.25)), hedef: orta };
      poz = { goz: kar(a.goz, z.goz, k), hedef: kar(a.hedef, z.hedef, k) }; sunumGoster(E.hat, true); su.son = true;
    } else return false;
    bak(mm, poz.goz, poz.hedef);
    if (asama !== su.asama) { su.asama = asama; if (!su.kareKayit) msg('Sunum: ' + asama); }
    return true;
  };
  const sunumKare = () => { // canlı oynatma: gerçek zamana göre
    const v = g3.viewer, su = durum.sunum; if (!su || su.kareKayit || !v || !g3.ll || !durum.sunumEt) return;
    const t = (performance.now() - su.t0) / 1000 * (su.hiz || 1), dt = su.tOnce == null ? 0 : t - su.tOnce; su.tOnce = t;
    let surer = false; try { surer = sunumAdim(su, t, dt); } catch (err) { console.warn(err); }
    v.scene.requestRender(); if (!surer) { S.sunumDur(true); return; }
    su.raf = requestAnimationFrame(sunumKare);
  };
  /* video: KARE KARE kayıt — her kare için sunum durumu kurulur, harita karoları yüklenene kadar beklenir, kare çizilir ve kodlanır.
     Video bilgisayarın hızından bağımsız olarak saniyede "fps" kareyle akıcı olur; kayıt gerçek süreden uzun sürebilir. */
  const kareKaydet = async (su) => {
    const Cs = window.Cesium, v = g3.viewer, tuval = v.scene.canvas, fps = +durum.fps === 60 ? 60 : 30, V = durum.sunumEt.veri, Z = S.sunumSure(V), hiz = su.hiz || 1, N = Math.ceil(Z.toplam / hiz * fps);
    const w = (su.hedefW || tuval.width) & ~1, h = (su.hedefH || tuval.height) & ~1, buyuk = w > 1920 || h > 1088, ara = document.createElement('canvas'); ara.width = w; ara.height = h; const actx = ara.getContext('2d', { alpha: false });
    const cizAra = () => { const tw = tuval.width, th = tuval.height, o = Math.max(w / tw, h / th), dw = tw * o, dh = th * o; actx.drawImage(tuval, (w - dw) / 2, (h - dh) / 2, dw, dh); }; // tuval boyutu / oranı değişirse ortalayarak doldurur
    const bit = (buyuk ? 45e6 : 18e6) * (fps / 30) ** 0.5;
    const ayar = { codec: buyuk ? 'avc1.640033' : 'avc1.640028', width: w, height: h, bitrate: bit, framerate: fps, avc: { format: 'avc' } };
    if (!window.VideoEncoder || !C.mp4yaz || !(await VideoEncoder.isConfigSupported(ayar)).supported) throw new Error('bu tarayıcı kare kare (H.264) kaydı desteklemiyor');
    const yazici = C.mp4yaz({ w, h, fps }); let hata = null;
    const kod = new VideoEncoder({ output: (parca, meta) => { if (meta && meta.decoderConfig && meta.decoderConfig.description) yazici.avcCVer(meta.decoderConfig.description); const d = new Uint8Array(parca.byteLength); parca.copyTo(d); yazici.ekle(d, parca.type === 'key'); }, error: e => { hata = e; } });
    kod.configure(ayar); su.kareKayit = true; su.kod = kod;
    const dorunlu = v.useDefaultRenderLoop, istek = v.scene.requestRenderMode; v.useDefaultRenderLoop = false; v.scene.requestRenderMode = false; // her render() gerçekten çizsin: istek kipinde değişiklik yokken çizim atlanır, kare siyah çıkar
    const bekle = ms => new Promise(r => setTimeout(r, ms));
    const hazir = () => (g3.tileset ? g3.tileset.tilesLoaded : true) && (v.scene.globe ? v.scene.globe.tilesLoaded : true);
    try {
      for (let i = 0; i < N && durum.sunum === su && !hata; i++) {
        const t = i / fps * hiz; if (!sunumAdim(su, t, hiz / fps)) break;
        v.render(); let dene = 0; while (!hazir() && dene++ < 60) { await bekle(25); v.render(); }   // karolar gelene kadar (en çok ≈ 1,5 sn) bekle, sonra son hâli çiz
        cizAra(); const kare = new VideoFrame(ara, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
        kod.encode(kare, { keyFrame: i % (fps * 2) === 0 }); kare.close();
        while (kod.encodeQueueSize > 6) await bekle(5);
        if (i % 15 === 0) { msg('Video kaydediliyor: kare ' + (i + 1) + ' / ' + N + ' (%' + Math.round((i + 1) / N * 100) + ') · ' + su.asama + ' — pencereyi açık tutun'); await bekle(0); }
      }
      await kod.flush(); if (hata) throw hata;
    } finally { try { kod.close(); } catch (e) { } v.scene.requestRenderMode = istek; v.useDefaultRenderLoop = dorunlu; su.kareKayit = false; }
    if (!yazici.kare) throw new Error('kare üretilemedi');
    const ad = ((C.doc.set.name || 'sunum') + '-sunum.mp4').replace(/[\\/:*?"<>|]+/g, '_'), blob = new Blob(yazici.bitir(), { type: 'video/mp4' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = ad; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 8000);
    const ozet = ad + ' · ' + yazici.kare + ' kare · ' + (yazici.kare / fps).toFixed(0) + ' sn · ' + w + '×' + h + ' · ' + (blob.size / 1048576).toFixed(1) + ' MB';
    C.log && C.log('🎬 Sunum videosu indirildi: ' + ozet); su.ozet = 'Sunum videosu indirildi: ' + ozet;
  };
  /* sunumu başlatır; kayit = true ise video kare kare kaydedilir ve bitince indirilir */
  S.sunumBaslat = (kayit) => {
    const Cs = window.Cesium, v = g3.viewer; if (!Cs || !v || !g3.ll || !durum.sunumEt) { msg('Sunum için önce Google 3B sekmesinde model kurulmalı.', true); return; }
    S.durdur(); if (durum.sunum) S.sunumDur(false);
    const su = durum.sunum = { t0: performance.now(), kayit: !!kayit, hiz: +durum.sunumHiz > 0 ? +durum.sunumHiz : 1 };
    if (durum.etiket) durum.etiket.show = false;
    if (!kayit) { sunumDugme(); sunumKare(); return; }
    // kayıt kalitesi: tuval hedef genişliğe (1920 / 3840 px) büyütülür, kenar yumuşatma ve daha ayrıntılı harita karoları açılır; kayıt bitince eski hâline döner
    try {
      const tuval = v.scene.canvas, hedef = +durum.kalite >= 2160 ? 3840 : 1920, dpr = window.devicePixelRatio || 1, kutu = $('#g3Canvas'), ana = $('#cvG3d');
      // video her zaman 16:9: 3B alanı kayıt süresince pencereye sığan en büyük 16:9 kutuya alınır (kenarlarda boşluk kalabilir), bitince eski hâline döner
      let cw = tuval.clientWidth || 1280;
      if (kutu && ana) { const W = ana.clientWidth || cw, Hh = ana.clientHeight || cw * 9 / 16, bw = Math.floor(Math.min(W, Hh * 16 / 9)), bh = Math.floor(bw * 9 / 16); su.eskiStil = kutu.style.cssText; kutu.style.cssText = 'position:absolute;left:' + Math.floor((W - bw) / 2) + 'px;top:' + Math.floor((Hh - bh) / 2) + 'px;width:' + bw + 'px;height:' + bh + 'px'; cw = bw; }
      su.hedefW = hedef; su.hedefH = hedef * 9 / 16;
      su.eski = { ubr: v.useBrowserRecommendedResolution, rs: v.resolutionScale, msaa: v.scene.msaaSamples, sse: g3.tileset ? g3.tileset.maximumScreenSpaceError : null, gsse: v.scene.globe ? v.scene.globe.maximumScreenSpaceError : null };
      v.useBrowserRecommendedResolution = false; v.resolutionScale = Math.max(1 / dpr, Math.min(4, hedef / (cw * dpr)));
      try { v.scene.msaaSamples = 4; } catch (e) { } if (g3.tileset) g3.tileset.maximumScreenSpaceError = 6; if (v.scene.globe) v.scene.globe.maximumScreenSpaceError = 1.3;
      v.resize(); v.render(); su.olcek = (tuval.width || 1920) / 1920 * 1.3; etiketOlcek(su.olcek); // bilgi kutuları video karesine göre sabit boyda (1920 px genişlikte tasarım boyu): pencere dar da olsa kutu kareden taşmaz
    } catch (err) { console.warn(err); }
    sunumDugme();
    kareKaydet(su).then(() => { if (durum.sunum === su) S.sunumDur(true); }).catch(err => { console.warn(err); su.ozet = 'Video kaydedilemedi: ' + (err && err.message || err); if (durum.sunum === su) S.sunumDur(false); msg(su.ozet, true); });
  };
  S.sunumDur = (bitti) => {
    const Cs = window.Cesium, v = g3.viewer, su = durum.sunum; if (!su) return; cancelAnimationFrame(su.raf); durum.sunum = null; // kare kare kayıt döngüsü durum.sunum değişince kendiliğinden biter
    kaliteGeri(su);
    if (Cs && v) { for (const p of durum.sahaBoru || []) p.show = false; try { kapiAyar(enuMat(), 0); } catch (e) { } for (const m of durum.mats) m.uniforms.on = 1e9; if (durum.sunumEt) { sunumGoster(durum.sunumEt.bina, false); sunumGoster(durum.sunumEt.hat, false); } if (durum.etiket) durum.etiket.show = true; v.scene.requestRender(); }
    msg(su.ozet || (su.kayit ? (bitti ? 'Video kaydı bitti.' : 'Video kaydı durduruldu; o ana kadarki bölüm indirilir.') : (bitti ? 'Sunum bitti.' : 'Sunum durduruldu.')), /kaydedilemedi/.test(su.ozet || ''));
    sunumDugme();
  };
  /* bilgi kutuları ekran pikseliyle çizilir: tuval büyütülünce aynı oranda büyütülür */
  const etiketOlcek = k => { const E = durum.sunumEt; if (!E) return; for (const x of E.bina.concat(E.hat)) { x.l.scale = 0.5 * k; x.c.width = 2 * k; } };
  const kaliteGeri = su => { const v = g3.viewer, e = su && su.eski; if (su && su.eskiStil != null) { const k = $('#g3Canvas'); if (k) k.style.cssText = su.eskiStil; su.eskiStil = null; } if (!v || !e) return; su.eski = null; try { v.useBrowserRecommendedResolution = e.ubr; v.resolutionScale = e.rs; v.scene.msaaSamples = e.msaa; if (g3.tileset && e.sse != null) g3.tileset.maximumScreenSpaceError = e.sse; if (v.scene.globe && e.gsse != null) v.scene.globe.maximumScreenSpaceError = e.gsse; etiketOlcek(1); v.resize(); v.scene.requestRender(); } catch (err) { console.warn(err); } };
  const sunumDugme = () => { const a = $('#shSunum'), k = $('#shVideo'), on = !!durum.sunum; if (a) a.textContent = on && !durum.sunum.kayit ? '■ Sunumu durdur' : '▶ Sunumu oynat'; if (k) k.textContent = on && durum.sunum.kayit ? '■ Kaydı bitir' : '🎬 Video kaydet'; };

  /* ---------- çevre binaları OpenStreetMap'ten indir ---------- */
  S.cevreIndir = async () => {
    if (!G.isSet()) { msg('Önce koordinat sistemini tanımlayın (Harita sekmesi).', true); return; }
    const H = S.hatlar(C.doc); let bb = g3.bb ? g3.bb.slice() : null;
    for (const e of H.eksenler) for (const p of e) { if (!bb) bb = [p[0], p[1], p[0], p[1]]; bb[0] = Math.min(bb[0], p[0]); bb[1] = Math.min(bb[1], p[1]); bb[2] = Math.max(bb[2], p[0]); bb[3] = Math.max(bb[3], p[1]); }
    if (!bb) { msg('Çizimde model yok.', true); return; }
    const m = 200, k = [[bb[0] - m, bb[1] - m], [bb[2] + m, bb[1] - m], [bb[2] + m, bb[3] + m], [bb[0] - m, bb[3] + m]].map(p => G.toLL(p));
    const s = Math.min(...k.map(q => q[0])), n = Math.max(...k.map(q => q[0])), w = Math.min(...k.map(q => q[1])), e2 = Math.max(...k.map(q => q[1]));
    msg('Çevre binalar OpenStreetMap\'ten indiriliyor…');
    const q = `[out:json][timeout:60];way["building"](${s.toFixed(6)},${w.toFixed(6)},${n.toFixed(6)},${e2.toFixed(6)});out body geom;`;
    let j = null; for (const u of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) { try { const r = await fetch(u, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); if (r.ok) { j = await r.json(); break; } } catch (err) { } }
    if (!j) { msg('Çevre binalar indirilemedi (internet / Overpass sunucusu). Daha sonra yeniden deneyin.', true); return; }
    const dSeg = (p, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy || 1))); return hyp(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy); };
    const g = g3.bb, icte = c => g && c[0] > g[0] && c[0] < g[2] && c[1] > g[1] && c[1] < g[3];
    const yakin = c => (g && c[0] > g[0] - m && c[0] < g[2] + m && c[1] > g[1] - m && c[1] < g[3] + m) || H.eksenler.some(ek => ek.some((p, i) => i && dSeg(c, ek[i - 1], p) < 130));
    const out = [];
    for (const el of j.elements || []) {
      if (!el.geometry || el.geometry.length < 4) continue; const p = el.geometry.map(v => { const xy = G.toXY(v.lat, v.lon); return [+xy[0].toFixed(2), +xy[1].toFixed(2)]; }); p.pop();
      const c = p.reduce((a, b) => [a[0] + b[0] / p.length, a[1] + b[1] / p.length], [0, 0]); if (icte(c) || !yakin(c)) continue;
      let A = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; A += a[0] * b[1] - b[0] * a[1]; } A = Math.abs(A / 2);
      const kat = +(el.tags && el.tags['building:levels']) || 0, hh = parseFloat(el.tags && el.tags.height) || 0;
      out.push({ p, h: +(hh || (kat ? kat * 3.2 : A > 1500 ? 10 : A > 400 ? 9 : 7)).toFixed(1) });
    }
    C.doc.set.cevre = { kaynak: 'OpenStreetMap (© OpenStreetMap katkıcıları), ' + new Date().toLocaleDateString('tr-TR'), not: 'Yükseklik verisi olmayan binalarda taban alanına göre 7–10 m kabul edildi.', binalar: out };
    C.changed && C.changed(); if ($('#g3Re')) $('#g3Re').click();
    msg(`${out.length} çevre bina indirildi (© OpenStreetMap katkıcıları). Yükseklikler yaklaşık.`);
  };

  /* ---------- arayüz ---------- */
  const kurArayuz = () => {
    const ctl = $('#g3Ctl'); if (!ctl || $('#shOyna')) return;
    const d = document.createElement('div'); d.innerHTML = `
      <div class="row" style="border-top:1px solid #ffffff22;padding-top:5px"><label><input type="checkbox" id="shCevre"> Çevre binalar (şeffaf kutu)</label><button id="shIndir" title="Tesis ve hat çevresindeki bina izlerini OpenStreetMap'ten indirir">Çevre binaları indir</button></div>
      <div class="row"><label title="Bitmiş hâl: asfalt yol ve bordür, kilit parke kaldırım, çim ada, boyalı cepheler, ağaçlar ve güneş gölgesi"><input type="checkbox" id="shGercek"> Gerçekçi görünüm (malzeme + gölge)</label></div>
      <div class="row"><label title="Fiziksel tabanlı malzemeler (beton, boya, metal, cam…), güneş ve gökyüzü ışığı, gölge ve köşe kararmasıyla çizim"><input type="checkbox" id="shRender"> <b>Render kipi</b></label><button id="shMalz" title="Katmanlara / seçili nesnelere malzeme ata">Malzemeler…</button><button id="shPng" title="Bu görünümü yüksek çözünürlüklü PNG olarak indir (Kalite seçimine göre 1920 ya da 3840 px)">🖼 Görüntü al</button></div>
      <div class="row" id="shIsik"><label title="Güneşin yerel saati">Saat <input type="range" id="shSaat" min="6" max="19" step="0.25" style="width:92px"><span id="shSaatY" style="min-width:36px;display:inline-block"></span></label><label>Ay <select id="shAy"><option value="1">Oca</option><option value="2">Şub</option><option value="3">Mar</option><option value="4">Nis</option><option value="5">May</option><option value="6">Haz</option><option value="7">Tem</option><option value="8">Ağu</option><option value="9">Eyl</option><option value="10">Eki</option><option value="11">Kas</option><option value="12">Ara</option></select></label><label title="Köşe ve diplerde doğal kararma"><input type="checkbox" id="shAo"> Köşe kararması</label><label title="Parlak yüzeylerde hafif ışıma"><input type="checkbox" id="shParla"> Parlama</label></div>
      <div class="row"><label><input type="checkbox" id="shHat"> Deniz hattı</label><label title="Boru toprak altında; harita hat boyunca açık hendek olarak kesilir. Kapalıyken boru zemin altında röntgen gibi görünür."><input type="checkbox" id="shHendek"> Hendek kesiti</label><button id="shOyna">▶ Akışı oynat</button><button id="shUc">✈ Hat boyunca uç</button><button id="shTum" title="Hattın tamamını göster">Tüm hat</button></div>
      <div class="row"><button id="shSunum" title="Tesis çevresinde tur ve bina bilgileri, sonra hat boyunca yavaş ilerleyiş ve hat bilgileri">▶ Sunumu oynat</button><button id="shVideo" title="Aynı sunumu oynatır ve 3B görüntüyü video dosyası olarak kaydeder (bitince İndirilenler klasörüne iner)">🎬 Video kaydet</button><label title="Sunumun (ve kaydedilen videonun) hızı; yavaş seçilirse süre uzar">Hız <select id="shHiz"><option value="0.35">Çok yavaş</option><option value="0.6">Yavaş</option><option value="1">Normal</option><option value="1.6">Hızlı</option></select></label><label title="Kaydedilen videonun çözünürlüğü (pencere boyutundan bağımsız)">Kalite <select id="shKalite"><option value="1080">Full HD (1920)</option><option value="2160">4K (3840)</option></select></label><label title="Videonun saniyedeki kare sayısı; 60 daha akıcıdır, kayıt iki kat uzun sürer">Kare <select id="shFps"><option value="30">30</option><option value="60">60</option></select></label></div>`;
    const m = $('#g3Msg'); while (d.firstElementChild) ctl.insertBefore(d.firstElementChild, m);
    const yenile = () => { const b = $('#g3Re'); if (b) b.click(); };
    $('#shCevre').checked = !!durum.cevre; $('#shHat').checked = !!durum.hat;
    $('#shCevre').onchange = e => { durum.cevre = e.target.checked; sakla(); yenile(); };
    $('#shHat').onchange = e => { durum.hat = e.target.checked; sakla(); if (!durum.hat) S.durdur(); yenile(); };
    $('#shHendek').checked = durum.hendek !== false; $('#shHendek').onchange = e => { durum.hendek = e.target.checked; sakla(); yenile(); };
    $('#shGercek').checked = durum.gercek !== false; $('#shGercek').onchange = e => { durum.gercek = e.target.checked; g3.golge = durum.gercek; sakla(); yenile(); };
    $('#shIndir').onclick = () => S.cevreIndir();
    { const saatYaz = v2 => { const h = Math.floor(v2), d = Math.round((v2 - h) * 60); $('#shSaatY').textContent = String(h).padStart(2, '0') + ':' + String(d).padStart(2, '0'); };
      const isikDoldur = () => { const r = C.doc ? rset() : {}; $('#shSaat').value = r.saat != null ? r.saat : 10; saatYaz(+$('#shSaat').value); $('#shAy').value = String(+r.ay || 6); $('#shAo').checked = r.ao !== false; $('#shParla').checked = !!r.parlama; $('#shIsik').style.display = durum.render ? '' : 'none'; };
      const projedenAl = () => { const r = C.doc && C.doc.set.render; if (r && r.acik != null) { durum.render = !!r.acik; if (durum.render) { durum.gercek = true; g3.golge = true; const gk = $('#shGercek'); if (gk) gk.checked = true; } } $('#shRender').checked = !!durum.render; isikDoldur(); }; // proje "render.acik" taşıyorsa açılışta o geçerli
      projedenAl(); C.on('doc', () => setTimeout(projedenAl, 0));
      $('#shRender').onchange = e => { durum.render = e.target.checked; if (C.doc) { rset().acik = durum.render; C.changed && C.changed(); } if (durum.render) { durum.gercek = true; g3.golge = true; const gk = $('#shGercek'); if (gk) gk.checked = true; } sakla(); isikDoldur(); yenile(); };
      $('#shSaat').oninput = e => { rset().saat = +e.target.value; saatYaz(+e.target.value); sahneAyar(); };
      $('#shSaat').onchange = () => { C.changed && C.changed(); };
      $('#shAy').onchange = e => { rset().ay = +e.target.value; sahneAyar(); C.changed && C.changed(); };
      $('#shAo').onchange = e => { rset().ao = e.target.checked; sahneAyar(); };
      $('#shParla').onchange = e => { rset().parlama = e.target.checked; sahneAyar(); };
      $('#shMalz').onclick = () => S.malzemePencere(); $('#shPng').onclick = () => S.goruntuAl(); }
    $('#shOyna').onclick = () => durum.oynuyor ? S.durdur() : S.oynat(true);
    $('#shUc').onclick = () => S.uc();
    $('#shTum').onclick = () => tumHat();
    $('#shHiz').value = String(durum.sunumHiz || 1); if (!$('#shHiz').value) $('#shHiz').value = '1';
    $('#shHiz').onchange = e => { durum.sunumHiz = +e.target.value || 1; sakla(); if (durum.sunum) durum.sunum.hiz = durum.sunumHiz; const V = durum.sunumEt && durum.sunumEt.veri; if (V) msg('Sunum süresi ≈ ' + Math.round(S.sunumSure(V).toplam / durum.sunumHiz) + ' sn'); };
    $('#shKalite').value = String(+durum.kalite >= 2160 ? 2160 : 1080); $('#shKalite').onchange = e => { durum.kalite = +e.target.value; sakla(); };
    $('#shFps').value = String(+durum.fps === 60 ? 60 : 30); $('#shFps').onchange = e => { durum.fps = +e.target.value; sakla(); };
    $('#shSunum').onclick = () => durum.sunum ? S.sunumDur(false) : S.sunumBaslat(false);
    $('#shVideo').onclick = () => durum.sunum ? S.sunumDur(false) : S.sunumBaslat(true);
    dugme();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(kurArayuz, 0)); else setTimeout(kurArayuz, 0);
  C.addCommand && C.addCommand(['DENIZHATTI', 'AKISANIM'], 'Google 3B sekmesinde deniz hattı akış animasyonunu oynatır (DENIZ_HATTI katmanındaki güzergâh ekseni boyunca)', () => { C.setView('g3d'); setTimeout(() => S.oynat(true), 1500); }, { noUndo: true });
  C.addCommand && C.addCommand(['CEVREBINA', 'CEVREBINALAR'], 'Tesis ve hat çevresindeki binaları OpenStreetMap\'ten indirir; Google 3B sekmesinde şeffaf kutu olarak gösterir', () => S.cevreIndir(), { noUndo: true });
  if (window.DIL && window.DIL.ekle) { try { window.DIL.ekle('en', 'English', [['Çevre binalar (şeffaf kutu)', 'Surrounding buildings (transparent boxes)'], ['Çevre binaları indir', 'Download surrounding buildings'], ['Deniz hattı', 'Sea outfall line'], ['Hendek kesiti', 'Trench section'], ['Gerçekçi görünüm (malzeme + gölge)', 'Realistic view (materials + shadows)'], ['▶ Akışı oynat', '▶ Play flow'], ['⏸ Akışı durdur', '⏸ Stop flow'], ['✈ Hat boyunca uç', '✈ Fly along the line'], ['■ Uçuşu bırak', '■ Stop flight'], ['Tüm hat', 'Whole line'], ['▶ Sunumu oynat', '▶ Play presentation'], ['■ Sunumu durdur', '■ Stop presentation'], ['🎬 Video kaydet', '🎬 Record video'], ['Hız', 'Speed'], ['Kalite', 'Quality'], ['Render kipi', 'Render mode'], ['Malzemeler…', 'Materials…'], ['🖼 Görüntü al', '🖼 Save image'], ['Saat', 'Hour'], ['Ay', 'Month'], ['Köşe kararması', 'Ambient occlusion'], ['Parlama', 'Bloom'], ['Render malzemeleri', 'Render materials'], ['Kare', 'Frames'], ['Çok yavaş', 'Very slow'], ['Yavaş', 'Slow'], ['Normal', 'Normal'], ['Hızlı', 'Fast'], ['■ Kaydı bitir', '■ Finish recording'], ['SW2 yükleme bacası', 'SW2 loading tower'], ['Deniz deşarjı', 'Sea outfall'], ['Kıyı', 'Shore']]); } catch (e) { } }
})(typeof window !== 'undefined' ? window.C : globalThis.C);

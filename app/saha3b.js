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
     - Sunum: "Sunumu oynat" tesis çevresinde tur atar (C.doc.set.sunum.binalar etiketleri), sonra hat boyunca yavaşça denize iner
     (C.doc.set.sunum.hat bilgileri); "Video kaydet" aynı sunumu 3B tuvalden video dosyasına kaydeder.
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
    const cizgi = doc.ents.filter(e => (e.type === 'pline' || e.type === 'line') && /^DENIZ_HATTI/i.test(e.layer || '') && !e.gv).map(e => ({ dn: +e.dn || 0, pts: S.temiz(e.type === 'line' ? [e.a, e.b] : e.pts) })).filter(c => c.pts.length > 1);
    const eks = cizgi.filter(c => !c.dn).map(c => c.pts), out = [];
    const gruplar = [];
    for (const ek of eks) { const g = { eksen: ek, borular: (set.borular || []).map(b => ({ ad: b.ad, dn: +b.dn || 1000, ofs: +b.ofs || 0 })), ana: true }; gruplar.push(g); for (const b of g.borular) out.push({ ad: b.ad, dn: b.dn, eksen: ek, pts: S.otele(ek, b.ofs) }); }
    for (const c of cizgi) if (c.dn) { gruplar.push({ eksen: c.pts, borular: [{ ad: 'DN' + c.dn, dn: c.dn, ofs: 0 }] }); out.push({ ad: 'DN' + c.dn, dn: c.dn, eksen: c.pts, pts: c.pts, tek: true }); } // dn özelliği olan çizgi: tek boru (ör. saha içi basma hattı)
    return { set, eksenler: eks, borular: out, gruplar };
  };

  /* sunum zaman çizelgesi: aşama sınırları (sn) */
  S.sunumSure = V => { const T1 = (+V.tur || 0) * (+V.turSure || 0), TG = 5, T2 = +V.hatSure || 0, TS = 7; return { tur: T1, gecis: T1 + TG, hat: T1 + TG + T2, toplam: T1 + TG + T2 + TS }; };

  if (typeof document === 'undefined') return; // Node testleri buraya kadar

  /* ---------- Cesium tarafı ---------- */
  const g3 = C.g3d, G = C.geo, $ = s => document.querySelector(s); if (!g3) return;
  const durum = S.durum = { cevre: true, hat: true, oynuyor: false, izle: false, t0: 0, on: 0, mats: [], boy: 0, eksen: null, raf: 0 };
  try { Object.assign(durum, JSON.parse(localStorage.getItem('aritmacad.saha3b') || '{}')); } catch (e) { }
  durum.oynuyor = false; durum.izle = false; durum.mats = []; g3.golge = durum.gercek !== false;
  const sakla = () => { try { localStorage.setItem('aritmacad.saha3b', JSON.stringify({ cevre: durum.cevre, hat: durum.hat, hendek: durum.hendek, gercek: durum.gercek })); } catch (e) { } };
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
    try {
      g3.tileset.clippingPolygons = undefined; // kesilen hendeğin içini değil zemini oku (geri kurma: aşağıda kesimYenile — çıkarılan koleksiyon yok edildiği için eskisi geri takılmaz)
      for (const { ek, k } of is) {
        durum.profilDenendi[k] = true;
        const r = await v.scene.sampleHeightMostDetailed(ek.map(p => { const ll = G.toLL(p); return Cs.Cartographic.fromDegrees(ll[1], ll[0]); }), g3.model ? [g3.model] : []);
        const taban = (g3.h0 || 0) + (g3.dh || 0), ham = r.map(c => c && isFinite(c.height) ? c.height - taban : null); if (ham.filter(x => x != null).length < ham.length * 0.8) continue;
        const ilkDolu = ham.find(y => y != null), dolu = []; ham.forEach((x, i) => dolu.push(x != null ? x : (i ? dolu[i - 1] : ilkDolu)));
        const orta = dolu.map((_, i) => { const w = dolu.slice(Math.max(0, i - 2), i + 3).sort((a, b) => a - b); return w[Math.floor((w.length - 1) / 2)]; }); // araç / ağaç / bina sıçramaları: 5'li alt ortanca
        (durum.profil = durum.profil || {})[k] = orta.map(x => +x.toFixed(2));
      }
    } catch (err) { console.warn(err); }
    try { if (g3.kesimYenile) g3.kesimYenile(); } catch (err) { console.warn(err); }
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
  g3.atla = e => durum.gercek !== false && e.type === 'plak' && DOKULU.includes(e.layer);
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
              col = mix(vec3(0.17, 0.38, 0.12), vec3(0.33, 0.55, 0.19), shN(p * 1.3)) * (0.82 + 0.36 * shN(p * 11.0) * (1.0 - uzak) + 0.18 * uzak);
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
  const gunes = () => { // sabit gün ışığı (yaz, sabah 10 suları) + yumuşak gölge
    const Cs = window.Cesium, v = g3.viewer; if (!Cs || !v) return; const ac = durum.gercek !== false;
    try {
      v.clock.shouldAnimate = false; v.clock.currentTime = Cs.JulianDate.fromIso8601('2026-06-21T07:45:00Z');
      v.shadows = ac; if (v.shadowMap) { v.shadowMap.softShadows = true; v.shadowMap.size = 4096; v.shadowMap.maximumDistance = 450; v.shadowMap.darkness = 0.62; }
      if (g3.tileset) g3.tileset.shadows = ac ? Cs.ShadowMode.RECEIVE_ONLY : Cs.ShadowMode.DISABLED;   // Google 3B arazisi gölge alır
      if (v.scene.globe) v.terrainShadows = ac ? Cs.ShadowMode.RECEIVE_ONLY : Cs.ShadowMode.DISABLED;      // düz küre varsa (Google anahtarı yokken)
    } catch (err) { console.warn(err); }
  };
  const kurGercek = (Cs, coll) => {
    gunes(); if (durum.gercek === false) return;
    zeminMalzemeKaydet(Cs);
    const pl = C.doc.ents.filter(e => e.type === 'plak' && DOKULU.includes(e.layer) && C.layer(e.layer).on && e.pts && e.pts.length > 2);
    const yuzey = (pos, nrm, tur) => {
      if (!pos.length) return; const P = enuDizi(pos), st = new Array(P.length / 3 * 2); for (let i = 0, j = 0; i < P.length; i += 3, j += 2) { st[j] = P[i]; st[j + 1] = P[i + 1]; }
      coll.add(new Cs.Primitive({ geometryInstances: new Cs.GeometryInstance({ geometry: geomUcgen(Cs, P, enuYon(nrm), st) }), appearance: new Cs.MaterialAppearance({ material: new Cs.Material({ fabric: { type: ZEMIN, uniforms: { tur } } }), translucent: false, closed: false, faceForward: false }), asynchronous: false, shadows: Cs.ShadowMode.ENABLED }));
    };
    const ciz = (katman, tur) => { const pos = [], nrm = []; for (const e of pl.filter(x => x.layer === katman)) { const zt = +e.zt || 0, m = S.prizma(e.pts, zt - (+e.t || 0.2), zt); if (m) { pos.push(...m.pos); nrm.push(...m.nrm); } } yuzey(pos, nrm, tur); };
    ciz('SAHA_ZEMIN', 0); ciz('SAHA_KAPLAMA', 0); ciz('SAHA_YOL', 1); ciz('SAHA_YESIL', 2);   // parke kaldırım · asfalt yol · çim ada
    // bordür: yol ve ada sınırları boyunca 15 × 15 cm beton şerit (yol kotundan 15 cm yüksek)
    { const pos = [], nrm = [];
      for (const e of pl.filter(x => x.layer === 'SAHA_YOL' || x.layer === 'SAHA_YESIL')) { const b = S.bordur(e.pts, 0.15, (+e.zt || 0) - 0.05, (e.layer === 'SAHA_YESIL' ? (+e.zt || 0) + 0.03 : (+e.zt || 0) + 0.15), e.layer === 'SAHA_YESIL'); if (b) { pos.push(...b.pos); nrm.push(...b.nrm); } }
      yuzey(pos, nrm, 3); }
    // ağaçlar
    const ag = (C.doc.set.peyzaj && C.doc.set.peyzaj.agac) || []; if (ag.length) {
      const gv = [], tc = [];
      ag.forEach((a, i) => { const h = +a[2] || 5, m = S.agac(h, h * 0.36), z0 = a[3] != null ? +a[3] : 0.4, tasi = o => { const q = []; for (let k = 0; k < o.pos.length; k += 3) q.push(o.pos[k] + a[0], o.pos[k + 1] + a[1], o.pos[k + 2] + z0); return q; };
        gv.push(new Cs.GeometryInstance({ geometry: geomUcgen(Cs, enuDizi(tasi(m.govde)), enuYon(m.govde.nrm)), attributes: { color: Cs.ColorGeometryInstanceAttribute.fromColor(new Cs.Color(0.36, 0.26, 0.17, 1)) } }));
        tc.push(new Cs.GeometryInstance({ geometry: geomUcgen(Cs, enuDizi(tasi(m.tac)), enuYon(m.tac.nrm)), attributes: { color: Cs.ColorGeometryInstanceAttribute.fromColor(new Cs.Color(0.16 + 0.05 * (i % 3), 0.40 + 0.05 * (i % 2), 0.13, 1)) } })); });
      coll.add(new Cs.Primitive({ geometryInstances: gv.concat(tc), appearance: new Cs.PerInstanceColorAppearance({ flat: false, translucent: false, closed: false }), asynchronous: false, shadows: Cs.ShadowMode.ENABLED }));
    }
  };

  /* model her kurulduğunda: çevre binalar ve hatlar aynı koleksiyona eklenir (yerleşim / yükseklik modelle birlikte) */
  const kur = () => {
    const Cs = window.Cesium, coll = g3.model; durum.mats = []; durum.eksen = null; durum.boy = 0; g3.ekKesim = [];
    if (!Cs || !coll || !g3.toENU || !C.doc) return;
    let nb = 0, nh = 0;
    try { kurGercek(Cs, coll); } catch (err) { console.warn(err); }
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
        coll.add(new Cs.Primitive({ geometryInstances: new Cs.GeometryInstance({ geometry: lg, attributes: { color: Cs.ColorGeometryInstanceAttribute.fromColor(new Cs.Color(1, 1, 1, 0.75)) } }), appearance: new Cs.PerInstanceColorAppearance({ flat: true, translucent: true }), asynchronous: false }));
      }
    }
    // --- deniz hatları ---
    const H = S.hatlar(C.doc);
    if (durum.hat && H.borular.length) {
      malzemeKaydet(Cs);
      const renk = dn => dn >= 1200 ? new Cs.Color(0.05, 0.42, 0.95, 1) : new Cs.Color(0.0, 0.70, 0.78, 1);
      // gömülü borular: zemin kotundan "örtü" kadar aşağıda; karada açık hendek kesiti (harita hendek boyunca kesilir), denizde deniz tabanında
      const hendekli = durum.hendek !== false, ortu = +H.set.ortu || 1.2, yan = [], tab = []; g3.ekKesim = [];
      const boruEkle = (pts, zs, r, s0, dn, gomulu) => {
        const t = S.tup(pts, zs, r, 14, s0); if (!t) return 0;
        const mat = new Cs.Material({ fabric: { type: AKIS, uniforms: { color: renk(dn), time: 0, on: durum.oynuyor ? durum.on : 1e9, len: 14, speed: +H.set.hiz || 2, opak: gomulu ? 1 : 0 } } });
        durum.mats.push(mat);
        coll.add(new Cs.Primitive({
          geometryInstances: new Cs.GeometryInstance({ geometry: geomUcgen(Cs, enuDizi(t.pos), enuYon(t.nrm), t.st, t.idx) }),
          appearance: new Cs.MaterialAppearance({ material: mat, translucent: !gomulu, closed: true, faceForward: false, renderState: gomulu ? { depthTest: { enabled: true }, depthMask: true, cull: { enabled: true } } : { depthTest: { enabled: false }, depthMask: false, cull: { enabled: true }, blending: Cs.BlendingState.ALPHA_BLEND } }),
          asynchronous: false,
        }));
        return t.boy;
      };
      H.gruplar.forEach((g, gi) => {
        const ek = S.sik(g.eksen, 15), gm = S.gomme(g.borular, ortu);
        // kıyı noktası (yalnız ana hatta): sonrası deniz
        let ik = ek.length - 1; if (g.ana && H.set.kiyiIndex != null && g.eksen[H.set.kiyiIndex]) { const kp = g.eksen[H.set.kiyiIndex]; let en = 1e9; ek.forEach((p, i) => { const d = hyp(p[0] - kp[0], p[1] - kp[1]); if (d < en) { en = d; ik = i; } }); }
        const zU = zeminDizi(ek, gi, H.set, ik);
        if (hendekli && ik > 0) { const h = S.hendek(S.otele(ek, gm.kay).slice(0, ik + 1), gm.w, zU.slice(0, ik + 1), zU.slice(0, ik + 1).map(z => z - gm.derin)); if (h) { yan.push(h.yan); tab.push(h.taban); g3.ekKesim.push(h.halka); } }
        g.borular.forEach((b, bi) => {
          const r = Math.max(0.25, b.dn / 2000), pts = S.otele(ek, b.ofs), zs = zU.map(z => z - gm.eksen[bi]); nh++;
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
    const bt = $('#shOyna'); if (bt) bt.disabled = !durum.mats.length; const bu = $('#shUc'); if (bu) bu.disabled = !durum.mats.length;
    S.son = { bina: nb, boru: nh };
  };
  C.on('g3dmodel', kur);

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
    const s = Object.assign({ tur: 2, turSure: 24, hatSure: 0, binalar: [], hat: [] }, doc.set.sunum || {}), H = S.hatlar(doc), ek = H.eksenler[0];
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
    for (const b of V.binalar || []) if (b.p && b.satirlar) bina.push(ekle(b.p, +b.z || 5, (+b.z || 5) + (bina.length % 2 ? 9 : 4), b.satirlar, 'rgba(10,56,97,0.88)')); // ardışık etiketler farklı yükseklikte: üst üste binmesin
    if (ek) for (const h of V.hat || []) { const k = S.noktaAt(ek, Math.max(0, Math.min(durum.boy, +h.s || 0))); hat.push(Object.assign(ekle(k.p, 0.5, (h.z != null ? +h.z : 14), h.satirlar, 'rgba(5,76,107,0.88)'), { s: +h.s || 0 })); }
    coll.add(lc); coll.add(pc); durum.sunumEt = { bina, hat, veri: V };
  };
  const sunumGoster = (liste, ac) => { for (const x of liste || []) { x.l.show = ac; x.c.show = ac; } };
  const kamera = (hedef, bas, egim, uzak) => { const Cs = window.Cesium, v = g3.viewer; v.camera.lookAt(hedef, new Cs.HeadingPitchRange(bas, egim, uzak)); };
  const sunumKare = () => {
    const Cs = window.Cesium, v = g3.viewer, su = durum.sunum; if (!su || !Cs || !v || !g3.ll || !durum.sunumEt) return;
    const t = (performance.now() - su.t0) / 1000, V = durum.sunumEt.veri, T1 = V.tur * V.turSure, TG = 5, T2 = V.hatSure, TS = 7, E = durum.sunumEt;
    const b = g3.bb, mer = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], R = Math.max(70, hyp(b[2] - b[0], b[3] - b[1]) * 1.05), ek = durum.eksen, yonu = u => { const e = g3.toENU(g3.origin[0] + u[0], g3.origin[1] + u[1], 0), z = g3.toENU(g3.origin[0], g3.origin[1], 0); return Math.atan2(e[0] - z[0], e[1] - z[1]); };
    const bas0 = Cs.Math.toRadians(200), egim1 = Cs.Math.toRadians(-27);
    let asama;
    if (t < T1) { // 1) tesis çevresinde tur; bina etiketleri sırayla açılır
      asama = 'Tesis çevresinde tur'; const bas = bas0 + (t / V.turSure) * 2 * Math.PI; kamera(dunya(mer, 3), bas, egim1, R);
      E.bina.forEach((x, i) => { const ac = t > 2 + i * 3; x.l.show = ac; x.c.show = ac; }); sunumGoster(E.hat, false);
      for (const m of durum.mats) m.uniforms.on = 0;
    } else if (!ek || !durum.mats.length) { su.bitti = true;
    } else if (t < T1 + TG) { // 2) geçiş: hat başlangıcına süzül
      asama = 'Hatta geçiş'; const k = S.yumusak((t - T1) / TG), a = dunya(mer, 3), z = dunya(ek[0], 2), hedef = Cs.Cartesian3.lerp(a, z, k, new Cs.Cartesian3());
      const basA = bas0 + (T1 / V.turSure) * 2 * Math.PI, basB = yonu(S.noktaAt(ek, 0).u) - 0.45, fark = Math.atan2(Math.sin(basB - basA), Math.cos(basB - basA)); su.bas = basA + fark * k;
      kamera(hedef, su.bas, Cs.Math.toRadians(-27 - 5 * k), R + (240 - R) * k); sunumGoster(E.bina, k < 0.6);
      for (const m of durum.mats) m.uniforms.on = 0;
    } else if (t < T1 + TG + T2) { // 3) hat boyunca yavaş ilerleyiş; su cephesi geçtikçe hat bilgileri açılır
      asama = 'Hat boyunca'; const tt = t - T1 - TG; durum.on = Math.min(durum.boy + 10, tt / T2 * (durum.boy + 10));
      for (const m of durum.mats) { m.uniforms.time = tt; m.uniforms.on = durum.on; }
      const k = S.noktaAt(ek, Math.min(durum.on, durum.boy)), bas = yonu(k.u) - 0.45; su.bas = su.bas == null ? bas : su.bas + Math.atan2(Math.sin(bas - su.bas), Math.cos(bas - su.bas)) * 0.02;
      kamera(dunya(k.p, 2), su.bas, Cs.Math.toRadians(-32), 240); sunumGoster(E.bina, false);
      for (const x of E.hat) { const ac = durum.on >= x.s - 15; x.l.show = ac; x.c.show = ac; }
    } else if (t < T1 + TG + T2 + TS) { // 4) kapanış: hattın tamamı kuşbakışı
      asama = 'Genel görünüş'; const tt = t - T1 - TG; for (const m of durum.mats) { m.uniforms.time = tt; m.uniforms.on = 1e9; }
      if (!su.son) { su.son = true; v.camera.lookAtTransform(Cs.Matrix4.IDENTITY); tumHat(); sunumGoster(E.hat, true); }
    } else su.bitti = true;
    if (asama && asama !== su.asama) { su.asama = asama; msg('Sunum: ' + asama + (su.kayit ? ' · ● kayıt' : '')); }
    v.scene.requestRender();
    if (su.bitti) { S.sunumDur(true); return; }
    su.raf = requestAnimationFrame(sunumKare);
  };
  /* sunumu başlatır; kayit = true ise ekran (3B tuval) videoya kaydedilir ve bitince indirilir */
  S.sunumBaslat = (kayit) => {
    const Cs = window.Cesium, v = g3.viewer; if (!Cs || !v || !g3.ll || !durum.sunumEt) { msg('Sunum için önce Google 3B sekmesinde model kurulmalı.', true); return; }
    S.durdur(); if (durum.sunum) S.sunumDur(false);
    const su = durum.sunum = { t0: performance.now(), kayit: !!kayit };
    if (durum.etiket) durum.etiket.show = false;
    if (kayit) {
      try {
        const tuval = v.scene.canvas, akis = tuval.captureStream(30), tur = ['video/mp4;codecs=avc1.640028', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(x => window.MediaRecorder && MediaRecorder.isTypeSupported(x));
        if (!tur) throw new Error('bu tarayıcı video kaydını desteklemiyor');
        const parca = []; su.kaydedici = new MediaRecorder(akis, { mimeType: tur, videoBitsPerSecond: 14e6 });
        su.kaydedici.ondataavailable = e => { if (e.data && e.data.size) parca.push(e.data); };
        su.kaydedici.onstop = () => { const uz = /mp4/.test(tur) ? 'mp4' : 'webm', ad = ((C.doc.set.name || 'sunum') + '-sunum.' + uz).replace(/[\\/:*?"<>|]+/g, '_'), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(parca, { type: tur.split(';')[0] })); a.download = ad; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); C.log && C.log('🎬 Sunum videosu indirildi: ' + ad + ' (' + (parca.reduce((s, p) => s + p.size, 0) / 1048576).toFixed(1) + ' MB)'); msg('Sunum videosu indirildi: ' + ad); };
        su.kaydedici.start(1000);
      } catch (err) { su.kayit = false; su.kaydedici = null; msg('Video kaydı başlatılamadı: ' + (err.message || err) + ' — sunum kayıtsız oynatılıyor.', true); }
    }
    sunumDugme(); sunumKare();
  };
  S.sunumDur = (bitti) => {
    const Cs = window.Cesium, v = g3.viewer, su = durum.sunum; if (!su) return; cancelAnimationFrame(su.raf); durum.sunum = null;
    if (su.kaydedici && su.kaydedici.state !== 'inactive') { try { su.kaydedici.stop(); } catch (e) { } }
    if (Cs && v) { if (!su.son) v.camera.lookAtTransform(Cs.Matrix4.IDENTITY); for (const m of durum.mats) m.uniforms.on = 1e9; if (durum.sunumEt) { sunumGoster(durum.sunumEt.bina, false); sunumGoster(durum.sunumEt.hat, false); } if (durum.etiket) durum.etiket.show = true; v.scene.requestRender(); }
    if (!su.kayit) msg(bitti ? 'Sunum bitti.' : 'Sunum durduruldu.');
    sunumDugme();
  };
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
      <div class="row"><label><input type="checkbox" id="shHat"> Deniz hattı</label><label title="Boru toprak altında; harita hat boyunca açık hendek olarak kesilir. Kapalıyken boru zemin altında röntgen gibi görünür."><input type="checkbox" id="shHendek"> Hendek kesiti</label><button id="shOyna">▶ Akışı oynat</button><button id="shUc">✈ Hat boyunca uç</button><button id="shTum" title="Hattın tamamını göster">Tüm hat</button></div>
      <div class="row"><button id="shSunum" title="Tesis çevresinde tur ve bina bilgileri, sonra hat boyunca yavaş ilerleyiş ve hat bilgileri">▶ Sunumu oynat</button><button id="shVideo" title="Aynı sunumu oynatır ve 3B görüntüyü video dosyası olarak kaydeder (bitince İndirilenler klasörüne iner)">🎬 Video kaydet</button></div>`;
    const m = $('#g3Msg'); while (d.firstElementChild) ctl.insertBefore(d.firstElementChild, m);
    const yenile = () => { const b = $('#g3Re'); if (b) b.click(); };
    $('#shCevre').checked = !!durum.cevre; $('#shHat').checked = !!durum.hat;
    $('#shCevre').onchange = e => { durum.cevre = e.target.checked; sakla(); yenile(); };
    $('#shHat').onchange = e => { durum.hat = e.target.checked; sakla(); if (!durum.hat) S.durdur(); yenile(); };
    $('#shHendek').checked = durum.hendek !== false; $('#shHendek').onchange = e => { durum.hendek = e.target.checked; sakla(); yenile(); };
    $('#shGercek').checked = durum.gercek !== false; $('#shGercek').onchange = e => { durum.gercek = e.target.checked; g3.golge = durum.gercek; sakla(); yenile(); };
    $('#shIndir').onclick = () => S.cevreIndir();
    $('#shOyna').onclick = () => durum.oynuyor ? S.durdur() : S.oynat(true);
    $('#shUc').onclick = () => S.uc();
    $('#shTum').onclick = () => tumHat();
    $('#shSunum').onclick = () => durum.sunum ? S.sunumDur(false) : S.sunumBaslat(false);
    $('#shVideo').onclick = () => durum.sunum ? S.sunumDur(false) : S.sunumBaslat(true);
    dugme();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(kurArayuz, 0)); else setTimeout(kurArayuz, 0);
  C.addCommand && C.addCommand(['DENIZHATTI', 'AKISANIM'], 'Google 3B sekmesinde deniz hattı akış animasyonunu oynatır (DENIZ_HATTI katmanındaki güzergâh ekseni boyunca)', () => { C.setView('g3d'); setTimeout(() => S.oynat(true), 1500); }, { noUndo: true });
  C.addCommand && C.addCommand(['CEVREBINA', 'CEVREBINALAR'], 'Tesis ve hat çevresindeki binaları OpenStreetMap\'ten indirir; Google 3B sekmesinde şeffaf kutu olarak gösterir', () => S.cevreIndir(), { noUndo: true });
  if (window.DIL && window.DIL.ekle) { try { window.DIL.ekle('en', 'English', [['Çevre binalar (şeffaf kutu)', 'Surrounding buildings (transparent boxes)'], ['Çevre binaları indir', 'Download surrounding buildings'], ['Deniz hattı', 'Sea outfall line'], ['Hendek kesiti', 'Trench section'], ['Gerçekçi görünüm (malzeme + gölge)', 'Realistic view (materials + shadows)'], ['▶ Akışı oynat', '▶ Play flow'], ['⏸ Akışı durdur', '⏸ Stop flow'], ['✈ Hat boyunca uç', '✈ Fly along the line'], ['■ Uçuşu bırak', '■ Stop flight'], ['Tüm hat', 'Whole line'], ['▶ Sunumu oynat', '▶ Play presentation'], ['■ Sunumu durdur', '■ Stop presentation'], ['🎬 Video kaydet', '🎬 Record video'], ['■ Kaydı bitir', '■ Finish recording'], ['SW2 yükleme bacası', 'SW2 loading tower'], ['Deniz deşarjı', 'Sea outfall'], ['Kıyı', 'Shore']]); } catch (e) { } }
})(typeof window !== 'undefined' ? window.C : globalThis.C);

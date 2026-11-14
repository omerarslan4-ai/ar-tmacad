/* ArıtmaCAD — MİMARİ PAFTALAR (MIMARIPAFTA) — statikteki STATIKCIZ'in mimari karşılığı
   Seçili yapının (seçim yoksa bütün 3B modelin) mimari paftalarını "Mimari" pafta grubuna kendiliğinden üretir:
     MİMARİ-01  KAT PLANLARI            — her kat seviyesi için kot planı (KOTPLANI motoru) + mahal listesi (odalar varsa)
     MİMARİ-02  ÇATI PLANI VE KESİTLER  — çatı planı (üst görünüş), A-A / B-B kesitleri (disiplin kesiti: KESITPAFTA motoru),
                                          kodlu malzeme açılımı (DÖŞEMELER / DUVARLAR; ACILIMTABLO)
     MİMARİ-03  GÖRÜNÜŞLER              — ön + arka üst sırada, sağ + sol yan alt sırada (GORUNUS motoru)
   Var olan kesitler (KESITPAFTA ile alınmış, yapıyı kesen) yeniden alınmaz, aynen kullanılır; yoksa yerleri mahallere göre seçilir
   (mimari-oto.js: A-A uzun kesit bütün mahallerden, B-B büyük hacimden, C-C odalardan, gerekirse ek kesit; MIMARIPAFTA'nın kendi kesitleri her çalışmada yeniden seçilir)
   ve disiplin görünümü olarak kaydedilir (GORUNUMGUNCELLE ile güncellenir, Mekanik / Statik / Elektrik paftalarına da konur).
   Antet: kullanıcının ANTET YUKLE ile verdiği antet (yoksa programın varsayılan anteti); sağdaki antet sütununa oturur.

   Pafta düzeni Çokal AAT R2 mimari paftalarından ölçüldü (13.11.2026; 6-Blower Binası_R2 "MİMARİ" düzeni, 1-Kaba-İnce-Giriş_R3,
   5-Çamursuzlaştırma_R3, 10-İdari Bina_R2; DWG → DXF ODA, kağıt ölçüleri mm):
     kağıt yüksekliği 594 (A1 yüksekliği), genişlik içeriğe göre uzar, en az 841 (örneklerde 841, 901, 946, 981, 1051, 1121, 1261, 1454 …)
     çerçeve: dış ince ("Antet Ince") kağıt kenarında; iç kalın ("Antet Kalın") solda 30, üst / alt / sağda 10 mm içeride
     antet sütunu: sağda 200 mm, iç çerçeve yüksekliği boyunca düşey kalın çizgiyle ayrılır; antet sütunun altında
     ölçek: plan, kesit ve görünüşler 1/50; doğrama detayları 1/20
     sıra (Blower): 01 kat planları · 02 çatı planı + çatı kesitleri + A-A / B-B kesitleri + açılım · 03 görünüşler (ön + arka üstte,
     sağ + sol yan altta) · 04 doğrama (kapı / pencere / panjur) detayları ve nokta detayları 1/20
   Saf kısım (pafta boyu ve yerleşim, kat kotları, kesit hatları) Node ile denenir: node test/mimari-pafta.test.js */
(function (C) {
  'use strict';

  /* ======================= SAF KISIM ======================= */
  const PAFTA_R2 = { ph: 594, wMin: 841, kenar: { l: 30, r: 10, t: 10, b: 10 }, antetSutun: 200, olcek: 50, pay: 5 };

  /* bloklar: [{ id, w, h }] kâğıt mm (başlık dahil, pay hariç). o.duzen: 'sutun' (üstten aşağı, sonra sağa; dar blok
     önceki bloğun yanına sığarsa oraya) ya da 'satir' (o.satirlar: [[id, id], [id, id]] — her sıra ortalanır).
     Döner: { pw, ph, yer: { id: [x, y] sol alt köşe (pay dahil) }, tasan: [id] (iç yüksekliğe sığmayan) } */
  const paftaPlanla = (bloklar, o = {}) => {
    const R = Object.assign({}, PAFTA_R2, o.R || {}), K = R.kenar, H = R.ph - K.t - K.b, pay = R.pay;
    const A = Math.max(R.antetSutun, o.antetW || 0), yer = {}, tasan = [];
    const B = bloklar.map(b => ({ id: b.id, w: b.w + 2 * pay, h: b.h + 2 * pay }));
    B.forEach(b => { if (b.h > H + 1e-6) tasan.push(b.id); });
    if (o.duzen === 'satir') {
      const byId = new Map(B.map(b => [b.id, b])), sat = (o.satirlar || [B.map(b => b.id)]).map(r => r.map(id => byId.get(id)).filter(Boolean)).filter(r => r.length);
      const rw = sat.map(r => r.reduce((s, b) => s + b.w, 0)), rh = sat.map(r => Math.max(...r.map(b => b.h)));
      if (rh.reduce((s, v) => s + v, 0) > H + 1e-6) return paftaPlanla(bloklar, Object.assign({}, o, { duzen: 'sutun' })); // sıralar üst üste sığmıyor: sütun düzeni
      const Wc = Math.max(0, ...rw), pw = Math.max(R.wMin, Math.ceil(K.l + Wc + A + K.r)), icW = pw - K.l - A - K.r;
      let y = R.ph - K.t - Math.max(0, (H - rh.reduce((s, v) => s + v, 0)) / 2);
      sat.forEach((r, i) => { let x = K.l + (icW - rw[i]) / 2; for (const b of r) { yer[b.id] = [x + pay, y - rh[i] + (rh[i] - b.h) / 2 + pay]; x += b.w; } y -= rh[i]; });
      return { pw, ph: R.ph, yer, tasan, antet: A };
    }
    const cols = [];
    for (const b of B) {
      const c = cols[cols.length - 1];
      if (c && c.h + b.h <= H + 1e-6) { c.items.push({ b, x: 0, y: c.h }); c.h += b.h; c.w = Math.max(c.w, b.w); continue; }
      if (c) { // son bloğun yanına sığıyor mu (Çokal BB-02: açılım B-B kesitinin yanında)
        const son = c.items[c.items.length - 1], yr = son.yanR || 0; // yandaki bloklar sütunun sağına (antet sütununa doğru) yaslanır
        if (c.w - son.b.w - yr >= b.w - 1e-6 && b.h <= H - son.y + 1e-6) { c.items.push({ b, x: c.w - yr - b.w, y: son.y }); son.yanR = yr + b.w; c.h = Math.max(c.h, son.y + b.h); continue; }
      }
      cols.push({ w: b.w, h: b.h, items: [{ b, x: 0, y: 0 }] });
    }
    const Wc = cols.reduce((s, c) => s + c.w, 0), pw = Math.max(R.wMin, Math.ceil(K.l + Wc + A + K.r));
    let x = K.l + (pw - K.l - A - K.r - Wc) / 2;
    for (const c of cols) { const yTop = R.ph - K.t - Math.max(0, (H - c.h) / 2); for (const it of c.items) yer[it.b.id] = [x + it.x + pay, yTop - it.y - it.b.h + pay]; x += c.w; }
    return { pw, ph: R.ph, yer, tasan, antet: A };
  };

  /* kot yazısı: +0.25 / -1.20 / ±0.00; mutlak kot varsa parantezde (Çokal İdari: "±0.00 (95.50) KOTU PLANI") */
  const kotYaz = (z, abs) => (Math.abs(z) < 0.005 ? '±0.00' : (z > 0 ? '+' : '-') + Math.abs(z).toFixed(2)) + (abs != null && isFinite(abs) ? ` (${(+abs).toFixed(2)})` : '');
  /* kat planı kotları. o: { seviyeler: [{ad, z, kh}], dosemeUst: [z], zmin, zmax, dikeyUst, kh (varsayılan 1,20), abs0, enFazla }
     Seviye tanımlıysa yapının kot aralığındaki seviyeler (temel altı / toprak hariç), yoksa döşeme üst kotları + en alt kot.
     Üstünde duvar / perde / kolon kalmayan seviye (dikeyUst − 0,50 m'den yukarısı) çatıdır: kat planı olmaz, çatı planında görünür.
     Kesit yüksekliği: kot + kh, bir üst katın altında kalır. */
  const katKotlari = (o = {}) => {
    const zmin = +o.zmin || 0, zmax = o.zmax == null ? zmin + 3 : +o.zmax, zUst = Math.min(zmax, o.dikeyUst == null || !isFinite(o.dikeyUst) ? Infinity : +o.dikeyUst), kh0 = o.kh || 1.2, n = o.enFazla || 6, r2 = v => Math.round(v * 100) / 100;
    let L = [];
    if (Array.isArray(o.seviyeler) && o.seviyeler.length) L = o.seviyeler.filter(s => isFinite(+s.z) && !/temel alt|toprak/i.test(String(s.ad || '')) && +s.z >= zmin - 0.05 && +s.z <= zUst - 0.5).map(s => ({ z: r2(+s.z), kh: +s.kh || kh0, ad: s.ad }));
    if (!L.length) { const zs = [...new Set([zmin, ...(o.dosemeUst || [])].map(r2))].filter(z => z <= zUst - 0.5 + 1e-9); L = zs.map(z => ({ z, kh: kh0 })); }
    L.sort((a, b) => a.z - b.z); L = L.filter((s, i) => !i || s.z - L[i - 1].z > 0.005).slice(0, n);
    return L.map((s, i) => { const ust = L[i + 1] ? L[i + 1].z - 0.05 : zmax - 0.05, h = r2(Math.max(s.z + 0.05, Math.min(s.z + s.kh, ust)));
      return { z: s.z, h, ad: s.ad || null, baslik: `${kotYaz(s.z, o.abs0 != null ? +o.abs0 + s.z : null)} KOTU PLANI` }; });
  };
  /* kesit hatları: A-A uzun yönde, B-B kısa yönde, ikisi de yapının ortasından; bakış +y / +x, derinlik yapının öbür kenarına kadar */
  const kesitHatlari = (bb, pay = 1.5) => {
    const [x0, y0, x1, y1] = bb, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2, r2 = v => Math.round(v * 1000) / 1000;
    const boyuna = { a: [x0 - pay, ym], b: [x1 + pay, ym], sp: [xm, ym + 1], depth: r2(y1 - ym + 0.5) }, enine = { a: [xm, y0 - pay], b: [xm, y1 + pay], sp: [xm + 1, ym], depth: r2(x1 - xm + 0.5) };
    return x1 - x0 >= y1 - y0 ? [Object.assign({ nm: 'A' }, boyuna), Object.assign({ nm: 'B' }, enine)] : [Object.assign({ nm: 'A' }, enine), Object.assign({ nm: 'B' }, boyuna)];
  };
  /* Mimari grubunda her görünüm bir kez: MİMARİ paftalarındaki (L.mimPafta) görünüm kimlikleri öbür Mimari paftalarından çıkarılır;
     boşalan kesit paftası (KESITPAFTA / ACILIMTABLO'nun açtığı "MİMARİ — KESİTLER n") silinir. Döner: yeni düzen listesi. */
  const tekKopyaYap = (layouts, mimariMi) => {
    const ids = new Set(); for (const L of layouts) if (L.mimPafta) for (const v of L.vps || []) if (v.gorunum) ids.add(v.gorunum);
    for (const L of layouts) if (!L.mimPafta && mimariMi(L.grp)) L.vps = (L.vps || []).filter(v => !(v.gorunum && ids.has(v.gorunum)));
    return layouts.filter(L => !(L.kesitPaftasi && !L.mimPafta && mimariMi(L.grp) && !L.vps.length));
  };
  const api = { PAFTA_R2, paftaPlanla, katKotlari, kesitHatlari, kotYaz, tekKopyaYap };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!C) return;
  C.mimariPaftaApi = api;

  /* ======================= MODEL → GÖRÜNÜŞLER ======================= */
  const M = C.M, up = s => String(s || '').toLocaleUpperCase('tr');
  const durum = () => (C.doc.set.mimPafta = C.doc.set.mimPafta || { gvs: [] });
  const modelEnts = () => C.doc.ents.filter(e => C.layer(e.layer).on && !e.gv && C.in3D && C.in3D(e) && !['arazi', 'kazi', 'sheet'].includes(e.type) && (() => { try { const t = C.entTris(e); return t && t.pos && t.pos.length; } catch (er) { return false; } })());
  /* kapsam: seçili 3B nesneler (ünite seçiliyse ona bağlı elemanlar da) ya da bütün model */
  const kapsam = () => {
    const tum = modelEnts(), sel = C.sel || []; if (!sel.length) return { ents: tum, secim: false };
    const ids = new Set(sel.map(e => e.id)); for (const e of C.doc.ents) if (e.bag && ids.has(e.bag)) ids.add(e.id);
    const s = tum.filter(e => ids.has(e.id)); return s.length ? { ents: s, secim: true, u: sel.find(e => e.type === 'unite' || e.name || e.ad) } : { ents: tum, secim: false };
  };
  const zAralik = ents => { let a = Infinity, b = -Infinity; for (const e of ents) { let t; try { t = C.entTris(e); } catch (er) { continue; } const P = t && t.pos; if (!P) continue; for (let i = 2; i < P.length; i += 3) { a = Math.min(a, P[i]); b = Math.max(b, P[i]); } } return [a, b]; };
  const ustKot = e => zAralik([e])[1];
  const kesiyorMu = (v, bb) => { // kesit hattı yapının plan kutusundan geçiyor mu
    const [x0, y0, x1, y1] = bb, a = v.a, b = v.b; let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
    for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) { if (Math.abs(p) < 1e-12) { if (q < 0) return false; continue; } const t = q / p; if (p < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t); if (t0 > t1) return false; }
    return true;
  };
  /* görünüşün kağıttaki boyu: başlık (baslik nesnesi) dahil; başlığın yeri sabitlenir (istasyon paftasındaki gibi) */
  const blokOlc = (gv, sc) => {
    const kk = sc / 1000, ents = C.doc.ents.filter(e => e.gv === gv && e.type !== 'kesitisaret'); if (!ents.length) return null;
    for (const e of ents) { if (e.type === 'baslik' && e.ay != null && e.dmm != null) { e.p = [e.p[0], e.ay - e.dmm * kk, 0]; delete e.ay; delete e.dmm; } delete e._c; }
    const bb = C.withAnno ? C.withAnno(sc, () => C.extents(ents)) : C.extents(ents); for (const e of ents) delete e._c; if (!bb || !isFinite(bb[0])) return null;
    for (const e of ents) if (e.type === 'baslik') { const hp = e.hp || 5, yb = e.p[1] - hp * 1.9 * kk, hw = String(e.s || '').length * hp * 0.4 * kk + 2 * kk; bb[1] = Math.min(bb[1], yb); bb[0] = Math.min(bb[0], e.p[0] - hw); bb[2] = Math.max(bb[2], e.p[0] + hw); }
    const k = 1000 / sc; return { gv, bb, w: (bb[2] - bb[0]) * k, h: (bb[3] - bb[1]) * k };
  };

  /* görünüm başlığı en alttaki çizimin (balon, ölçü) altına: blokOlc başlığı ay − dmm'ye koyar */
  const baslikAlta = gv => { const g = C.doc.ents.filter(e => e.gv === gv); g.forEach(e => { delete e._c; }); const b = C.extents(g.filter(e => e.type !== 'baslik')); if (!b) return;
    for (const e of g) if (e.type === 'baslik') { e.ay = b[1]; e.dmm = 11; e.p = [e.p[0], b[1] - 11 * C.annoH(1), 0]; delete e._c; } };
  /* ölçü çakışma denetimi (firma kuralı 14.11.2026: sıralar üst üste binmez): görünümdeki ölçüler, kot ve yazılar kâğıt mm'de */
  const olcuDenetle = gvs => { const A = C.mimariOtoApi; if (!A) return []; const k = C.annoH(1), out = [];
    for (const gv of gvs.filter(Boolean)) { const og = [];
      for (const e of C.doc.ents) { if (e.gv !== gv) continue;
        if (e.type === 'dim' && e.a && e.b && e.p && (e.k === 'h' || e.k === 'v')) { const h = e.k === 'h'; og.push({ ad: 'ölçü#' + e.id, k: 'olcu', a: h ? [e.a[0] / k, e.p[1] / k] : [e.p[0] / k, e.a[1] / k], b: h ? [e.b[0] / k, e.p[1] / k] : [e.p[0] / k, e.b[1] / k], p: [e.p[0] / k, e.p[1] / k], yazi: 2, metin: String(Math.round(Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]) * 100)) }); }
        else if (e.type === 'kot' || e.type === 'text') { let b; try { delete e._c; b = C.bbox(e); } catch (er) { continue; } if (b && isFinite(b[0])) og.push({ ad: e.type + '#' + e.id, k: 'kutu', bb: b.map(v => v / k) }); } }
      for (const [x, y] of A.olcuCakisma(og)) if (/^ölçü/.test(x) || /^ölçü/.test(y)) out.push({ gv, x, y }); }
    return out; };
  const uret = async () => {
    const G = C.gorunumApi; if (!G || !C.makeView) { C.warn('Görünüş / disiplin modülleri yüklenmemiş.'); return null; }
    const { ents, secim, u } = kapsam(); if (!ents.length) { C.warn('3B model yok: mimari pafta için önce yapıyı (perde, döşeme, duvar …) 3B modelleyin.'); return null; }
    const R = PAFTA_R2, SC = R.olcek, st = durum(), ids = secim ? ents.map(e => e.id) : null;
    // önceki MIMARIPAFTA çıktısı: görünüşleri ve paftaları kaldır (kesitler disiplin görünümü olarak kalır, aşağıda güncellenir)
    { const gs = new Set(st.gvs || []); C.doc.ents = C.doc.ents.filter(e => !(e.gv && gs.has(e.gv))); st.gvs = []; }
    C.doc.layouts = (C.doc.layouts || []).filter(L => !L.mimPafta);
    const bb = C.extents(ents), [zmin, zmax] = zAralik(ents);
    const mb = C.extents(C.doc.ents.filter(e => !e.gv && e.type !== 'sheet')) || bb; let X0 = mb[2] + Math.max(20, (mb[2] - mb[0]) * 0.3), Yc = mb[3];
    const asagi = gv => { const b = C.extents(C.doc.ents.filter(e => e.gv === gv)); if (b) Yc = b[1] - 8; };
    let sonW = null; // son görünüşün model → çizim dönüşümü (planda x, y aynen kayar)
    const gorunus = def => { const place = [X0, Yc - (bb[3] - bb[1]) - 2], ref = [bb[0], bb[1]]; const res = C.makeView(Object.assign({ place, ref }, ids ? { ids } : {}, def)); if (!res) return null; sonW = q => [place[0] + q[0] - ref[0], place[1] + q[1] - ref[1], 0]; st.gvs.push(res.gv); asagi(res.gv); return res.gv; };
    // --- akslar: modelde yoksa kolon / perde eksenlerinden (plan, kesit ve görünüşe kendiliğinden geçer)
    try { if (C.mimariAksHazirla) C.mimariAksHazirla(ents); } catch (er) { console.error('mimari aks', er); }
    // yapının dış yüz kutusu: düşey elemanlar (perde, duvar, kolon)
    const bbDis = (() => { const b = C.extents(ents.filter(e => /^(perde|kolon|wall|duvar)$/.test(e.type))); return b && isFinite(b[0]) ? b : bb; })();
    // --- kat planları
    const svl = C.seviyeler ? C.seviyeler() : [], sv = C.doc.set.seviye || {};
    const dUst = ents.filter(e => e.type === 'plak' || e.type === 'slab' || e.type === 'temel').map(ustKot).filter(isFinite);
    const dikeyUst = Math.max(...ents.filter(e => /^(perde|kolon|duvar|wall|dolgu)$/.test(e.type)).map(ustKot).filter(isFinite));
    const katlar = katKotlari({ seviyeler: svl, dosemeUst: dUst, zmin, zmax, dikeyUst, abs0: sv.abs0 });
    const planlar = katlar.map(k => { const gv = gorunus({ kind: 'plan', h: k.h, depth: Math.max(1, k.h - zmin + 0.5), hatch: 'ANSI31', title: k.baslik, mek: false, poz: false }); if (!gv) return null;
      /* kapı / pencere tip numaraları, akslar üzerinden ölçü sıraları (Çokal İdari planı), başlık balonların altına */
      const W = sonW; try { if (C.dogramaEtiketPlan) C.dogramaEtiketPlan(gv, W, k.h, ents, bbDis); if (C.mimariPlanOlcu) C.mimariPlanOlcu(gv, W, bbDis, k.h, ents); baslikAlta(gv); asagi(gv); } catch (er) { console.error('plan ölçü / doğrama no', er); }
      return { ad: k.baslik, gv }; }).filter(Boolean);
    // --- çatı planı (üstten görünüş)
    const cati = gorunus({ kind: 'view', dir: 'UST', hatch: 'YOK', title: 'ÇATI PLANI' });
    // --- kesitler: yapıyı kesen disiplin kesitleri; yoksa A-A ve B-B alınır
    const VL = G.liste(); let kes = VL.filter(v => v.tip === 'kesit' && v.a && v.b && kesiyorMu(v, bb));
    /* önceki MIMARIPAFTA kesitleri: yerleri modelden yeniden seçilir (kullanıcının KESITPAFTA ile aldıkları aynen kalır) */
    if (kes.length && kes.every(v => v.kaynak === 'MIMARIPAFTA')) { for (const v of kes) { G.sil(v); const i = VL.indexOf(v); if (i >= 0) VL.splice(i, 1); for (const L of C.doc.layouts || []) if (L.vps) L.vps = L.vps.filter(q => q.gorunum !== v.id); } kes = [];
      C.doc.layouts = (C.doc.layouts || []).filter(L => !(L.kesitPaftasi && !L.mimPafta && !(L.vps || []).length)); } // boşalan disiplin kesit paftaları
    let kesitBilgi = null;
    if (!kes.length) {
      const kul = new Set(C.doc.ents.filter(e => e.type === 'kesitisaret').map(e => e.name).concat(VL.map(v => v.nm)));
      const sGr = (C.doc.set.grups || ['Mimari', 'Mekanik', 'Statik', 'Elektrik', 'Genel']).filter(g => !/GENEL/i.test(g));
      /* kesit yerleri (firma kuralı 14.11.2026): uzun kesit bütün mahallerden, kısa kesitler büyük hacimden ve odalardan; doğramadan geçer, kolon / kiriş üstünde değil */
      let hatlar = null; try { if (C.mimariKesitYerleri) { kesitBilgi = C.mimariKesitYerleri(ents, bbDis, katlar.map(k => k.z)); hatlar = kesitBilgi.hatlar; } } catch (er) { console.error('kesit yerleri', er); }
      if (!hatlar || !hatlar.length) hatlar = kesitHatlari(bb);
      for (const h of hatlar) {
        let nm = h.nm; for (let c = 65; kul.has(nm) && c < 91; c++) nm = String.fromCharCode(c); kul.add(nm);
        const v = { id: 'G' + Date.now().toString(36) + nm, tip: 'kesit', kaynak: 'MIMARIPAFTA', ad: `${nm}-${nm} KESİTİ`, nm, a: h.a, b: h.b, sp: h.sp, depth: h.depth, yer: [X0, Yc], olcek: SC, gruplar: sGr };
        let n = 0; try { n = await G.kesitUret(v); } catch (er) { console.error('mimari kesit', er); }
        if (!n) continue; if (h.mahaller) v.mahaller = h.mahaller; VL.push(v); kes.push(v); asagi(v.gv);
        for (const g of sGr) if (!/MIMAR/i.test(g)) G.paftayaKoy(v, g); // standart: bir kez alınan kesit bütün disiplin paftalarında
      }
    } else for (const v of kes) if (v.kaynak === 'MIMARIPAFTA') { const gv = v.gv; G.sil(v); v.gv = gv; try { await G.kesitUret(v); } catch (er) { console.error(er); } } // modelden yenile
    // --- açılım tablosu (kodlu: DÖŞEMELER / DUVARLAR)
    let acGv = null, acV = null; try { if (C.acilimTablo && C.doc.ents.some(e => e.type === 'acilim')) { C.doc.set.sonKesitOlcek = SC; C.acilimTablo(true, { yerlestir: false }); const t = VL.find(v => v.tip === 'tablo' && v.unite === 'ACILIM'); acGv = t ? t.gv : null; acV = t || null; } } catch (er) { console.error('açılım tablosu', er); }
    // --- görünüşler
    const gor = {}; for (const d of ['ON', 'ARKA', 'SAG', 'SOL']) gor[d] = gorunus({ kind: 'view', dir: d, hatch: 'YOK' });
    for (const d in gor) if (gor[d]) baslikAlta(gor[d]);
    // --- mahal listesi (zemin kaplaması verilmiş odalar varsa; modelden canlı)
    let mahGv = null; try { if (C.mahalVerisi && C.T.mahaltablo && C.mahalVerisi().rooms.length) { mahGv = 'MIM_MAHAL_' + Date.now().toString(36); const e = C.add(C.newEnt('mahaltablo', { p: [X0, Yc, 0], dis: 'Mimari', layer: 'MAHAL_LISTESI', gv: mahGv, title: yapiAdi(u) })); delete e.sp; st.gvs.push(mahGv); asagi(mahGv); } } catch (er) { console.error('mahal listesi', er); }
    return { planlar, cati, kes, acGv, acV, gor, mahGv, yapi: yapiAdi(u), kesitBilgi, cakisma: olcuDenetle([...planlar.map(p => p.gv), ...kes.map(v => v.gv)]) };
  };
  const yapiAdi = u => up((u && (u.name || u.ad || u.code)) || (C.doc.set.name && !/^ads[ıi]z/i.test(C.doc.set.name) ? C.doc.set.name : '') || 'YAPI');

  /* ======================= PAFTALAR ======================= */
  const antetGen = () => { const tb = C.doc.set.titleBlock || C.defaultTitleBlock; return tb && tb.ents && tb.ents.length && !tb.full ? tb.bb[2] - tb.bb[0] : 0; };
  const paftaKur = (key, no, ad, yapi, bloklar, duzen, satirlar) => {
    const bl = bloklar.filter(Boolean); if (!bl.length) return null;
    const P = paftaPlanla(bl.map(b => ({ id: b.gv, w: b.w, h: b.h })), { duzen, satirlar, antetW: antetGen() });
    const gp = C.grpCur; C.grpCur = 'Mimari'; const L = C.newLayout(`MİMARİ-${no} ${ad}`, 'A1', 'L'); C.grpCur = gp;
    Object.assign(L, { grp: 'Mimari', mimPafta: key, size: 'OZEL', pw: P.pw, ph: P.ph, orient: 'L', noTitle: false, margin: Object.assign({}, PAFTA_R2.kenar), antetSutun: P.antet });
    L.f = Object.assign(L.f || {}, { proje: L.f.proje || C.doc.set.name || '', baslik: `${yapi} — ${ad}`, no: `MİM-${no}` });
    L.vps = bl.map(b => { const q = P.yer[b.gv]; return Object.assign({ x: q[0], y: q[1], w: b.w, h: b.h, cx: (b.bb[0] + b.bb[2]) / 2, cy: (b.bb[1] + b.bb[3]) / 2, scale: PAFTA_R2.olcek, gvOnly: b.gv, frame: { on: false }, lock: true, disiplin: 'Mimari' }, b.v ? { gorunum: b.v.id } : {}); });
    if (P.tasan.length) C.warn(`${L.name}: ${P.tasan.length} çizim 1/${PAFTA_R2.olcek} ölçekte pafta yüksekliğine (594 mm) sığmıyor; paftada kırpılır.`);
    return L;
  };
  /* antet sütununu ayıran düşey kalın çizgi (Çokal R2: iç çerçevenin sağından 200 mm) */
  /* antet sütunu: düşey ayırma çizgisi (Çokal R2: iç çerçevenin sağından 200 mm), kalınlığı kural tablosundaki "Antet Kalın" katmanından.
     Kullanıcı antet yüklemediyse programın varsayılan anteti (180 mm) sütun genişliğine (200 mm) orantılı büyütülür, sağ alt köşesi sabit:
     sütunda boşluk kalmaz. Yüklenen antete dokunulmaz (sütun en az onun genişliğinde). */
  const antetKalin = () => { const k = C.cizimKural && C.cizimKural.MIMARI && C.cizimKural.MIMARI.katmanlar['Antet Kalın']; return k ? Math.round(k.kal * 100) : 40; };
  const VARSAYILAN_ANTET = 180; // app/entities.js T.sheet (bw)
  if (C.titlePrims && !C._mimPaftaTP) { const tp0 = C.titlePrims; C._mimPaftaTP = true;
    C.titlePrims = L => { const out = tp0(L); if (!L || !L.mimPafta) return out; const fr = C.layoutFrame(L), A = L.antetSutun || PAFTA_R2.antetSutun, x = fr.x1 - A;
      const tb = C.doc.set.titleBlock || C.defaultTitleBlock;
      if (!(tb && tb.ents && tb.ents.length)) { const sk = A / VARSAYILAN_ANTET, X = q => [fr.x1 - (fr.x1 - q[0]) * sk, fr.y0 + (q[1] - fr.y0) * sk, q[2] || 0];
        out.forEach((pr, i) => { if (i < 2) return; if (pr.a) { pr.a = X(pr.a); pr.b = X(pr.b); } if (pr.pts) pr.pts = pr.pts.map(X); if (pr.p) pr.p = X(pr.p); if (pr.c) pr.c = X(pr.c); if (pr.h) pr.h *= sk; if (pr.r) pr.r *= sk; }); }
      out.push(C.prim.L([x, fr.y0, 0], [x, fr.y1, 0], { lw: antetKalin() })); return out; }; }

  const MIMARIPAFTA = async () => {
    const anno0 = C.doc.set.anno; C.doc.set.anno = PAFTA_R2.olcek; let r;
    try { r = await uret(); } finally { C.doc.set.anno = anno0; }
    if (!r) return null; const SC = PAFTA_R2.olcek, olc = gv => (gv ? blokOlc(gv, SC) : null);
    const pl = r.planlar.map(p => olc(p.gv)), kes = r.kes.map(v => { const b = olc(v.gv); if (b) b.v = v; return b; }), mah = olc(r.mahGv);
    const g = r.gor, gb = { ON: olc(g.ON), ARKA: olc(g.ARKA), SAG: olc(g.SAG), SOL: olc(g.SOL) };
    const paf = [];
    const p1 = paftaKur('M1', '01', 'KAT PLANLARI', r.yapi, [...pl, mah]); if (p1) paf.push(p1);
    const p2 = paftaKur('M2', String(paf.length + 1).padStart(2, '0'), 'ÇATI PLANI VE KESİTLER', r.yapi, [olc(r.cati), ...kes, (() => { const b = olc(r.acGv); if (b && r.acV) b.v = r.acV; return b; })()]); if (p2) paf.push(p2);
    const sat = [[gb.ON, gb.ARKA], [gb.SAG, gb.SOL]].map(s => s.filter(Boolean).map(b => b.gv)).filter(s => s.length);
    const p3 = paftaKur('M3', String(paf.length + 1).padStart(2, '0'), 'GÖRÜNÜŞLER', r.yapi, [gb.ON, gb.ARKA, gb.SAG, gb.SOL], 'satir', sat); if (p3) paf.push(p3);
    tekKopya();
    { const s = C.doc.set; s.grups = s.grups || ['Mimari', 'Mekanik', 'Statik', 'Elektrik', 'Genel']; if (!s.grups.includes('Mimari')) s.grups.unshift('Mimari'); }
    durum().t = Date.now(); C.changed(); C.emit('layouts');
    return { paf, r };
  };
  /* Mimari grubunda her kesit / tablo bir kez: MİMARİ paftalarındaki görünümler (gorunum kimliği) öbür Mimari paftalarından
     (KESITPAFTA / ACILIMTABLO'nun açtığı "MİMARİ — KESİTLER n") kaldırılır, boşalan kesit paftası silinir. Sonradan çalışan
     KESITPAFTA / ACILIMTABLO aynı kimliği MİMARİ-02'de bulur ve yalnız günceller (gorunumler.js → paftayaKoy). */
  const tekKopya = () => { C.doc.layouts = tekKopyaYap(C.doc.layouts || [], g => /MIMAR/.test(C.ascii(up(g)))); };
  C.mimariTekKopya = tekKopya;
  C.mimariPaftalari = MIMARIPAFTA;

  C.addCommand(['MIMARIPAFTA', 'MIMARICIZ', 'MIMPAFTA'], 'Seçili yapının (seçim yoksa bütün modelin) mimari paftalarını "Mimari" grubuna hazırlar (Çokal R2 düzeni): kat planları ve mahal listesi; çatı planı, A-A / B-B kesitleri ve malzeme açılımı; görünüşler. Antet: yüklediğiniz antet. Model değişince yeniden çalıştırın.', async () => {
    const res = await MIMARIPAFTA(); if (!res) return;
    if (!res.paf.length) { C.warn('Mimari pafta üretilemedi (görünüş çıkmadı).'); return; }
    const L0 = res.paf[0]; C.layoutIdx = C.doc.layouts.indexOf(L0); C.grpCur = 'Mimari'; C.setView('layout'); C.emit('layouts'); setTimeout(() => { try { C.views.lay.zoomExtents(); } catch (er) { } }, 60);
    const yeniKes = res.r.kes.filter(v => v.kaynak === 'MIMARIPAFTA').length;
    C.log(`Mimari paftalar hazır (${res.paf.length}): ${res.paf.map(L => `${L.name} (${Math.round(L.pw)}×${L.ph} mm)`).join(' · ')} — ${res.r.planlar.length} kat planı, ${res.r.kes.length} kesit${yeniKes ? ` (${yeniKes} yeni; öbür disiplin paftalarına da kondu)` : ''}${res.r.acGv ? ', malzeme açılımı' : ''}${res.r.mahGv ? ', mahal listesi' : ''}${res.r.kesitBilgi ? ` · kesit yerleri: ${res.r.kes.map(v => `${v.nm}-${v.nm}${v.mahaller && v.mahaller.length ? ' (' + v.mahaller.join(', ') + ')' : ''}`).join(', ')}` : ''}${res.r.cakisma && res.r.cakisma.length ? ` · UYARI: ${res.r.cakisma.length} ölçü başka bir ölçü ya da yazıyla çakışıyor` : ''}. Antet: ${antetGen() || (C.doc.set.titleBlock || C.defaultTitleBlock) ? 'yüklediğiniz antet' : 'varsayılan (kendi antetiniz için Pafta › Antet yükle)'}.`);
  });

  /* ======================= ŞERİT: "Mimari" sekmesi ======================= */
  const B = (cmd, t, i) => ({ cmd, t, i, big: true }), s = (cmd, t, i) => ({ cmd, t, i });
  const serit = () => {
    const Rb = C.ribbon; if (!Rb || !Array.isArray(Rb.tabs)) return false;
    if (Rb.tabs.some(t => t[0] === 'Mimari')) return true;
    const var_ = b => !!(C.cmds && C.cmds[b.cmd.split(' ')[0]]);
    const paneller = [
      ['Pafta', [B('MIMARIPAFTA', 'Mimari paftalar', 'print'), s('KESITPAFTA', 'Kesit → disiplinler', 'cut'), s('GORUNUMGUNCELLE', 'Kesitleri güncelle', 'undo'), s('ACILIMTABLO', 'Açılım tablosu', 'table'), s('PERSPEKTIFPAFTA', '3B görünüş', 'iso')]],
      ['Görünüş', [B('KOTPLANI', 'Kot planı', 'area'), s('GORUNUS', 'Görünüş', 'box'), s('GORUNUSGUNCELLE', 'Güncelle', 'undo')]],
      ['Mahal', [B('MAHALLISTESI', 'Mahal listesi', 'table'), s('MAHALADI', 'Mahal adı', 'text')]],
      ['Açılım', [s('MALZEMEACILIM', 'Malzeme açılımı', 'text'), s('ACILIMSTIL', 'Açılım stili', 'prop')]],
      ['Antet ve stil', [B('ANTET YUKLE', 'Antet yükle', 'sheet'), s('PAFTASTIL', 'Pafta stili', 'prop'), s('CIZIMKURAL', 'Çizim kuralları', 'layer')]],
    ].map(([ad, bs]) => [ad, bs.filter(var_)]).filter(p => p[1].length);
    const i = Rb.tabs.findIndex(t => t[0] === 'Statik' || t[0] === 'Hesap');
    Rb.tabs.splice(i >= 0 ? i : Rb.tabs.length, 0, ['Mimari', paneller]); Rb.render(); return true;
  };
  { let n = 0; const t = setInterval(() => { try { if (serit() || ++n > 40) clearInterval(t); } catch (er) { console.error('mimari şerit', er); clearInterval(t); } }, 300); }

  if (typeof window !== 'undefined' && window.DIL) window.DIL.ekle('en', 'English', [
    ['Mimari', 'Architecture'], ['Mimari paftalar', 'Architectural sheets'], ['KAT PLANLARI', 'FLOOR PLANS'], ['ÇATI PLANI VE KESİTLER', 'ROOF PLAN AND SECTIONS'], ['GÖRÜNÜŞLER', 'ELEVATIONS'],
    ['ÇATI PLANI', 'ROOF PLAN'], ['KOTU PLANI', 'LEVEL PLAN'], ['Kesitleri güncelle', 'Update sections'], ['Açılım tablosu', 'Material legend'], ['Mahal listesi', 'Room schedule'], ['Mahal adı', 'Room name'],
    ['Malzeme açılımı', 'Material callout'], ['Açılım stili', 'Callout style'], ['Antet ve stil', 'Title block and style'], ['Pafta', 'Sheet'], ['Mahal', 'Room'], ['Açılım', 'Callout'], ['Güncelle', 'Update'], ['Kesit → disiplinler', 'Section → disciplines'], ['3B görünüş', '3D view'], ['Antet yükle', 'Load title block'], ['Pafta stili', 'Sheet style'], ['Çizim kuralları', 'Drawing rules'], ['Kot planı', 'Level plan'], ['Görünüş', 'Elevation'],
  ]);
})(typeof window !== 'undefined' ? window.C : null);

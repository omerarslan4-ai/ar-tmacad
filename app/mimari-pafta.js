/* ArıtmaCAD — MİMARİ PAFTALAR (MIMARIPAFTA) — statikteki STATIKCIZ'in mimari karşılığı
   Seçili yapının (seçim yoksa bütün 3B modelin) mimari paftalarını "Mimari" pafta grubuna kendiliğinden üretir:
     ölçek bina ebatına göre (olcekSec: 1/50; çok küçükse 1/25, A0'a sığmazsa 1/100), görünümler en az kâğıtla paftalara (enAzKagit):
       kat planları + mahal listesi, kesitler (A-A, B-B, C-C …) + kodlu malzeme açılımı, görünüşler (toprak altı çizilmez), kapı / pencere detayları
       (1/20, mimari-detay.js), korkuluk detayı, sac kapak detayları (istasyon-pafta.js kapak detayı); çatı planı, A'-A' / B'-B' çatı kesitleri ve
       DETAY-A / DETAY-B (1/10, cati.js) ayrı paftada. Tasarım alanında görünümler "MİMARİ" bölgesinde ızgarada (bolgeDuzenle).
   Var olan kesitler (KESITPAFTA ile alınmış, yapıyı kesen) yeniden alınmaz, aynen kullanılır; yoksa yerleri mahallere göre seçilir
   (mimari-oto.js: A-A uzun kesit bütün mahallerden, B-B büyük hacimden, C-C odalardan, gerekirse ek kesit; MIMARIPAFTA'nın kendi kesitleri her çalışmada yeniden seçilir)
   ve disiplin görünümü olarak kaydedilir (GORUNUMGUNCELLE ile güncellenir; kullanıcı kararı 14.11.2026: yalnız mimari kesit, öbür disiplin paftalarına konmaz).
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
      return { pw, ph: R.ph, yer, tasan, antet: A, duzen: 'satir' };
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
  /* gerçek kat süzgeci (kullanıcı 14.11.2026, Bekçi binası: "gereksiz plan, hiçbir şey ifade etmiyor"): kat planı yalnız yürünebilir kat seviyesine.
     Plan OLMAZ: (1) seviyede döşeme yüzü yok (temel altı: radye alt yüzü), (2) seviye dolguyla dolu (radye üstü, dolgu ve zemin döşemesi altı),
     (3) bir üst seviyeye / yapının tepesine kadar kat yüksekliği 1,80 m'den az (tesisat boşluğu, sürünme boşluğu), (4) kesme kotunda duvar / perde / kolon /
     kapı / pencere kesilmiyor ve mahal yok, (5) kesilen elemanlar başka bir planınkiyle aynı (aynı içerik iki kez çizilmez; alttaki kalır).
     katlar: katKotlari çıktısı [{ z, h }]; ogeler: [{ id, tip: 'doseme' | 'dikey' | 'acik' | 'dolgu' | 'mahal', z0, z1 }]; o: { zTop, minYuk (1,80), dosTol (0,35) }.
     Döner: süzülmüş katlar (sıra korunur), her birinde neden atıldığı ayrıca o.atilan dizisine yazılır */
  const gercekKatlar = (katlar, ogeler, o = {}) => {
    const K = (katlar || []).slice().sort((a, b) => a.z - b.z), G = ogeler || [], minYuk = o.minYuk || 1.8, tol = o.dosTol == null ? 0.35 : o.dosTol, out = [], imzalar = new Set();
    const zTop = o.zTop != null && isFinite(o.zTop) ? +o.zTop : Math.max(-Infinity, ...G.filter(q => q.tip === 'dikey').map(q => q.z1));
    K.forEach((k, i) => {
      const at = neden => { if (o.atilan) o.atilan.push({ z: k.z, neden }); };
      const ust = K[i + 1] ? K[i + 1].z : zTop;
      if (!G.some(q => q.tip === 'doseme' && Math.abs(q.z1 - k.z) <= tol)) return at('döşeme yüzü yok');
      if (G.some(q => q.tip === 'dolgu' && q.z0 <= k.z + 0.05 && q.z1 >= k.z + 0.5)) return at('dolgu');
      if (isFinite(ust) && ust - k.z < minYuk - 1e-9) return at('kat yüksekliği az');
      const kes = G.filter(q => (q.tip === 'dikey' || q.tip === 'acik') && q.z0 < k.h && q.z1 > k.h).map(q => q.id), mah = G.some(q => q.tip === 'mahal' && Math.abs(q.z0 - k.z) <= tol);
      if (!kes.length && !mah) return at('kesilen eleman yok');
      const imza = kes.slice().sort().join(','); if (kes.length && imzalar.has(imza)) return at('başka planla aynı');
      imzalar.add(imza); out.push(k);
    });
    return out;
  };
  /* plan kesme kotu merdivenli katta (kullanıcı isteği 14.11.2026): katta başlayan merdivenin ilk ara sahanlığının üstünden kesilir — sahanlık ve ilk kol
     tam görünür, ikinci kol kesilir. kesme = ilk sahanlık + kh (1,20), ikinci sahanlığın 5 cm altını ve üst katın altını aşmaz. Merdiven yoksa katın kesme kotu.
     kat: { z, h }, merdivenler: [{ z0, sahanliklar: [z …] }]. Döner: { h, sahanlik (ilk sahanlık kotu ya da null) } */
  const planKesmeKotu = (kat, merdivenler, o = {}) => {
    const kh = o.kh || 1.2, r2 = v => Math.round(v * 100) / 100, M2 = (merdivenler || []).filter(m => Math.abs((+m.z0 || 0) - kat.z) < 0.1 && (m.sahanliklar || []).some(z => z > kat.z + 0.05));
    if (!M2.length) return { h: kat.h, sahanlik: null };
    const S = M2.flatMap(m => m.sahanliklar.filter(z => z > kat.z + 0.05)).sort((a, b) => a - b), s1 = S[0], s2 = S.find(z => z > s1 + 0.05);
    let h = s1 + kh; if (s2 != null) h = Math.min(h, s2 - 0.05); if (o.ust != null) h = Math.min(h, o.ust - 0.05);
    return { h: r2(Math.max(h, s1 + 0.05)), sahanlik: r2(s1) };
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
  /* ---------- ÖLÇEK SEÇİMİ ve PAFTALARA BÖLME (firma kuralı 14.11.2026) ----------
     Plan ve kesitler önce 1/50 ile A1 ya da A0 paftaya yerleştirilir; sığıyorsa 1/50. A0'a sığmıyorsa 1/100.
     "Çok küçük" eşiği: en büyük plan / kesit 1/50'de A1 kullanılabilir alanının (çerçeve ve antet sütunu dışı: 601 × 574 mm)
     eninin ve boyunun %40'ından küçükse 1/25 — 1/25'te aynı çizim A1'in en çok %80'ini doldurur (A1'e yine sığar).
     Pafta boyu standart (A1 841 × 594, A0 1189 × 841); Çokal R2'deki gibi yükseklik sabit, genişlik içeriğe göre uzar
     (R2'de 841 … 1454 = 1,73 × A1) — en çok 1,8 × standart genişlik; daha genişse ikinci pafta açılır. */
  const KAGIT = { A1: { w: 841, h: 594 }, A0: { w: 1189, h: 841 } }, UZAMA = 1.8, OLCEK_ESIK = 0.40;
  const icOlcu = (ad, R, antet) => ({ W: KAGIT[ad].w - R.kenar.l - R.kenar.r - Math.max(R.antetSutun, antet || 0), H: KAGIT[ad].h - R.kenar.t - R.kenar.b });
  /* bloklar: [{ id, w, h (model m, çizimin kendisi), kenarMm (açıklama payı: ölçü sıraları, aks balonu, başlık; kâğıt mm, her yanda), altMm (başlık) }].
     Döner: { olcek, kagit, oranA1 (1/50'de en büyük bloğun A1'deki oranı), esik, neden } */
  const olcekSec = (bloklar, o = {}) => {
    const R = Object.assign({}, PAFTA_R2, o.R || {}), esik = o.esik == null ? OLCEK_ESIK : o.esik, a1 = icOlcu('A1', R, o.antetW), a0 = icOlcu('A0', R, o.antetW), pay = 2 * R.pay;
    const mm = (b, S) => ({ w: b.w * 1000 / S + 2 * (b.kenarMm || 0) + pay, h: b.h * 1000 / S + 2 * (b.kenarMm || 0) + (b.altMm || 0) + pay });
    const L = (bloklar || []).filter(b => b && b.w > 0 && b.h > 0), r3 = v => Math.round(v * 1000) / 1000;
    if (!L.length) return { olcek: 50, kagit: 'A1', oranA1: 0, esik, neden: 'çizim yok: 1/50' };
    const oranA1 = Math.max(...L.map(b => { const q = mm(b, 50); return Math.max(q.w / a1.W, q.h / a1.H); }));
    const buyuk = L.find(b => { const q = mm(b, 50); return q.w > a0.W + 1e-6 || q.h > a0.H + 1e-6; });
    let olcek = 50, neden;
    if (buyuk) { olcek = 100; neden = `1/50'de ${buyuk.id || 'bir çizim'} A0'a sığmıyor (${Math.round(mm(buyuk, 50).w)} × ${Math.round(mm(buyuk, 50).h)} mm > ${a0.W} × ${a0.H})`; }
    else if (oranA1 < esik) { olcek = 25; neden = `1/50'de en büyük çizim A1 kullanılabilir alanını en çok %${Math.round(oranA1 * 100)} dolduruyor (eşik %${Math.round(esik * 100)}): çok küçük`; }
    else neden = `1/50'de en büyük çizim A1 kullanılabilir alanını %${Math.round(oranA1 * 100)} dolduruyor: 1/50 uygun`;
    const kagit = L.every(b => mm(b, olcek).h <= a1.H + 1e-6) ? 'A1' : 'A0';
    return { olcek, kagit, oranA1: r3(oranA1), esik, neden };
  };
  /* blokları paftalara böl: [{ id, w, h (kâğıt mm) }] → [{ kagit, pw, ph, yer, tasan, antet, ids }]. o: paftaPlanla seçenekleri + kagit ('A1' | 'A0'; verilmezse
     bloklar A1 yüksekliğine sığıyorsa A1). Satır düzeni tek paftaya sığmazsa sütun düzenine döner. */
  const paftalarPlanla = (bloklar, o = {}) => {
    const R0 = Object.assign({}, PAFTA_R2, o.R || {}), L = (bloklar || []).filter(Boolean); if (!L.length) return [];
    const kagit = o.kagit || (L.every(b => b.h + 2 * R0.pay <= KAGIT.A1.h - R0.kenar.t - R0.kenar.b + 1e-6) ? 'A1' : 'A0'), K = KAGIT[kagit];
    const R = Object.assign({}, R0, { ph: K.h, wMin: K.w }), wMax = Math.round(K.w * UZAMA), o2 = Object.assign({}, o, { R });
    const bitir = (P, ids) => Object.assign(P, { kagit, ids });
    if (o.duzen === 'satir') { const P = paftaPlanla(L, o2); if (P.duzen === 'satir' && P.pw <= wMax) return [bitir(P, L.map(b => b.id))];
      /* sıralar bir paftaya sığmıyor: sıraları paftalara dağıt (Çokal: ön + arka bir sırada, sağ + sol öbür sırada) */
      const byId = new Map(L.map(b => [b.id, b])), rows = (o.satirlar || [L.map(b => b.id)]).map(r => r.filter(id => byId.has(id))).filter(r => r.length), out = []; let grp = [];
      const dene = g => paftaPlanla(g.flat().map(id => byId.get(id)), Object.assign({}, o2, { satirlar: g }));
      for (const r of rows) { const g = grp.concat([r]), Q = dene(g); if (grp.length && !(Q.duzen === 'satir' && Q.pw <= wMax)) { out.push(bitir(dene(grp), grp.flat())); grp = [r]; } else grp = g; }
      if (grp.length) out.push(bitir(dene(grp), grp.flat()));
      if (out.every(q => q.duzen === 'satir' && q.pw <= wMax)) return out; }
    const out = []; let cur = [];
    for (const b of L) { const den = cur.concat([b]), P = paftaPlanla(den, Object.assign({}, o2, { duzen: 'sutun' }));
      if (P.pw > wMax && cur.length) { out.push(bitir(paftaPlanla(cur, Object.assign({}, o2, { duzen: 'sutun' })), cur.map(q => q.id))); cur = [b]; } else cur = den; }
    if (cur.length) out.push(bitir(paftaPlanla(cur, Object.assign({}, o2, { duzen: 'sutun' })), cur.map(q => q.id)));
    return out;
  };
  /* EN AZ KÂĞIT YERLEŞİMİ (firma kuralı 14.11.2026: "kâğıdı fazla harcamamak için en uygun şekilde, maksimum"):
     bloklar sırayla (Çokal sırası: planlar, mahal listesi, kesitler, açılım, görünüşler, detaylar) yerleştirilir; her blok açık paftalardaki
     boşluğa (önce ilk paftaya) sol üstten, paftayı en az uzatan yere konur (en sol, sonra en üst aday nokta: kenar ve blok köşeleri);
     hiçbir paftaya sığmazsa yeni pafta açılır. Pafta yüksekliği sabit (A1 594 / A0 841), genişlik içeriğe göre uzar (en çok 1,8 × standart).
     A1 ve A0 ayrı ayrı denenir; toplam kâğıt alanı küçük olan (eşitse pafta sayısı az olan) seçilir.
     bloklar: [{ id, w, h (kâğıt mm, pay hariç), grup }]. Döner: { kagit, alan (m²), paftalar: [{ kagit, pw, ph, yer: { id: [x, y] sol alt (pay dahil) }, ids, gruplar, tasan }] } */
  const enAzKagit = (bloklar, o = {}) => {
    const R0 = Object.assign({}, PAFTA_R2, o.R || {}), K0 = R0.kenar, pay = R0.pay, A = Math.max(R0.antetSutun, o.antetW || 0), L = (bloklar || []).filter(Boolean), KS = o.kagitlar || ['A1', 'A0'];
    const sh = [], olc = ad => ({ H: KAGIT[ad].h - K0.t - K0.b, Wmax: Math.round(KAGIT[ad].w * UZAMA) - K0.l - K0.r - A });
    const yerBul = (S, w, h) => { if (h > S.H + 1e-6 || w > S.Wmax + 1e-6) return null; const xs = [0, ...S.r.map(q => q.x + q.w)], ys = [0, ...S.r.map(q => q.y + q.h)]; let best = null;
      for (const x of xs) for (const y of ys) { if (x + w > S.Wmax + 1e-6 || y + h > S.H + 1e-6) continue; if (S.r.some(q => x < q.x + q.w - 1e-6 && x + w > q.x + 1e-6 && y < q.y + q.h - 1e-6 && y + h > q.y + 1e-6)) continue;
        const sag = Math.max(S.wc, x + w); if (!best || sag < best.sag - 1e-6 || (Math.abs(sag - best.sag) < 1e-6 && (x < best.x - 1e-6 || (Math.abs(x - best.x) < 1e-6 && y < best.y)))) best = { x, y, sag }; }
      return best; };
    const BW = b => b.w + 2 * pay, BH = q => q.h + 2 * pay;
    /* grubun tamamı S'ye sığıyor mu (S değişmez): yerler ya da null */
    const sigar1 = (S, G) => { const T = Object.assign({}, S, { r: S.r.slice() }), P = []; for (const b of G) { const q = yerBul(T, BW(b), BH(b)); if (!q) return null; T.r.push({ x: q.x, y: q.y, w: BW(b), h: BH(b) }); T.wc = Math.max(T.wc, q.x + BW(b)); P.push({ b, q }); } return { P, wc: T.wc }; };
    /* boşluklar dolsun, pafta gereksiz uzamasın (kullanıcı 14.11.2026: "paftayı gereksiz uzatmışsın; DETAY-B'yi DETAY-A'nın altına alabilirsin"):
       grubun blokları birkaç sırayla denenir (verilen sıra, yüksekten alçağa, genişten dara, büyükten küçüğe) — sütunlar dikey istiflenir; en dar sonuç seçilir */
    const SIRALAR = [null, (p, q) => BH(q) - BH(p) || BW(q) - BW(p), (p, q) => BW(q) - BW(p) || BH(q) - BH(p), (p, q) => BW(q) * BH(q) - BW(p) * BH(p)];
    const sigar = (S, G) => { let en = null; for (const f of SIRALAR) { const r = sigar1(S, f ? G.slice().sort(f) : G); if (r && (!en || r.wc < en.wc - 1e-6)) en = r; } return en; };
    const koy = (S, b, q) => { S.r.push({ id: b.id, x: q.x, y: q.y, w: BW(b), h: BH(b), grup: b.grup }); S.wc = Math.max(S.wc, q.x + BW(b)); };
    const yeni = ad => { const S = Object.assign({ kagit: ad, r: [], wc: 0, tasan: [] }, olc(ad)); sh.push(S); return S; };
    /* grup grup (aynı tür görünümler bir arada): önce açık paftaların boşluğu; sığmazsa yeni pafta — grubun tamamını alan en küçük kâğıt (A1, sonra A0);
       hiçbiri tamamını almıyorsa A1'den başlanır, taşan bloklar sonraki paftaya */
    const gruplar = []; for (const b of L) { const g = gruplar.find(q => q.ad === (b.grup || '')); if (g) g.b.push(b); else gruplar.push({ ad: b.grup || '', b: [b] }); }
    const pwOf = (ad, wc) => Math.max(KAGIT[ad].w, Math.ceil(K0.l + wc + A + K0.r));
    /* ayrı paftalı türler (kullanıcı 14.11.2026: "görünüş paftası ile kesit paftaları ayrı olmalı"): o.ayri'daki grup başka türle aynı paftaya girmez
       (kendi paftasının boşluğu yine kendi görünümleriyle dolar) */
    const AYRI = new Set(o.ayri || []), uyar = (S, ad) => { const G = new Set(S.r.map(q => q.grup || '')); if (!G.size) return true; if (AYRI.has(ad)) return G.size === 1 && G.has(ad); return ![...G].some(x => AYRI.has(x)); };
    for (const g of gruplar) {
      /* maliyet = eklenen kâğıt alanı: açık paftayı uzatmak ya da yeni pafta; eşitse açık pafta (aynı paftada daha çok görünüm) */
      const aday = KS.map(ad => { const S = Object.assign({ r: [], wc: 0 }, olc(ad)); const r = sigar(S, g.b); return r ? { ad, alan: pwOf(ad, r.wc) * KAGIT[ad].h, P: r.P } : null; }).filter(Boolean).sort((p, q) => p.alan - q.alan);
      let yer = null; for (const S of sh) { if (!uyar(S, g.ad)) continue; const r = sigar(S, g.b); if (!r) continue; const ek = (pwOf(S.kagit, r.wc) - pwOf(S.kagit, S.wc)) * KAGIT[S.kagit].h; if (!yer || ek < yer.ek) yer = { S, P: r.P, ek }; }
      if (yer && (!aday.length || yer.ek <= aday[0].alan)) { yer.P.forEach(({ b, q }) => koy(yer.S, b, q)); continue; }
      if (aday.length) { const a = aday[0], S = yeni(a.ad); a.P.forEach(({ b, q }) => koy(S, b, q)); continue; }
      let S = yeni(KS[0]);
      for (const b of g.b) { let q = yerBul(S, BW(b), BH(b)); if (!q && S.r.length) { S = yeni(KS.find(ad => BH(b) <= olc(ad).H + 1e-6) || KS[KS.length - 1]); q = yerBul(S, BW(b), BH(b)); }
        if (!q) { q = { x: S.wc, y: 0 }; S.tasan.push(b.id); } koy(S, b, q); }
    }
    const paftalar = sh.map(S => { const Kg = KAGIT[S.kagit], pw = Math.max(Kg.w, Math.ceil(K0.l + S.wc + A + K0.r)), hc = Math.max(...S.r.map(q => q.y + q.h)), ox = K0.l + (pw - K0.l - A - K0.r - S.wc) / 2, oy = Kg.h - K0.t - Math.max(0, (S.H - hc) / 2), yer = {};
      for (const q of S.r) yer[q.id] = [ox + q.x + pay, oy - q.y - q.h + pay];
      return { kagit: S.kagit, pw, ph: Kg.h, yer, ids: S.r.map(q => q.id), gruplar: [...new Set(S.r.map(q => q.grup).filter(Boolean))], tasan: S.tasan, antet: A }; });
    return { paftalar, alan: Math.round(paftalar.reduce((s, P) => s + P.pw * P.ph, 0) / 1e4) / 100, adet: paftalar.length };
  };
  /* TASARIM ALANINDA DİSİPLİN BÖLGELERİ (firma kuralı 14.11.2026): her disiplinin görünümleri modelin dışında kendi bölgesinde, bölgeler ayrık,
     başında disiplin adı; bölgede görünümler ızgara (her tür bir sıra: planlar, kesitler, görünüşler, çatı, detaylar) ve çakışmasız.
     izgaraDiz: satirlar [[{ id, w, h }]] (model m) → { yer: { id: [x0, yUst] } (bölge sol üstüne göre, y aşağı eksi), w, h } */
  const izgaraDiz = (satirlar, o = {}) => {
    const bx = o.yatay == null ? 4 : o.yatay, by = o.dusey == null ? 6 : o.dusey, yer = {}; let y = 0, W = 0;
    for (const r of satirlar || []) { const L = r.filter(q => q && q.w > 0 && q.h > 0); if (!L.length) continue; let x = 0; const h = Math.max(...L.map(q => q.h));
      for (const q of L) { yer[q.id] = [x, y]; x += q.w + bx; } W = Math.max(W, x - bx); y -= h + by; }
    return { yer, w: W, h: Math.max(0, -y - by) };
  };
  /* bölgenin yeri: modelin (görünüm olmayan çizim) ve öbür bölgelerin sağında, aralarında bosluk; bölge önceden varsa ve öbürleriyle çakışmıyorsa yerinde kalır.
     model: [x0, y0, x1, y1], bolgeler: { dis: { x0, yUst, w, h } }. Döner: { x0, yUst } */
  const BOLGE_SIRA = ['Mimari', 'Mekanik', 'Elektrik', 'Statik', 'Ünite'];
  const bolgeYeri = (model, bolgeler, dis, w, h, bosluk = 20) => {
    const B = bolgeler || {}, eski = B[dis], digerleri = Object.entries(B).filter(([k]) => k !== dis).map(([, q]) => q);
    const cakisir = (x0, yU) => digerleri.some(q => x0 < q.x0 + q.w + bosluk && x0 + w + bosluk > q.x0 && yU - h - bosluk < q.yUst && yU + bosluk > q.yUst - q.h);
    if (eski && !cakisir(eski.x0, eski.yUst) && !(model && eski.x0 < model[2] + bosluk)) return { x0: eski.x0, yUst: eski.yUst };
    const sag = Math.max(model ? model[2] : 0, ...digerleri.map(q => q.x0 + q.w)), yU = model ? model[3] : 0;
    return { x0: sag + bosluk, yUst: yU };
  };
  /* DXF çizgi tipi ölçeği (Çokal R2: cm çizim, 1/50 pafta, $LTSCALE 20, $PSLTSCALE 0): desenler kâğıt mm'si olarak yazılır, model metre →
     $LTSCALE = ölçek / 1000 (1/50: 0,05), $PSLTSCALE 0 — model sekmesinde ve pafta penceresinde aynı görünür. Başka ölçekli pencerede
     (1/20 detay, 1/10 çatı detayı) görünen nesnelere nesne çizgi tipi ölçeği (kod 48) = pencere ölçeği / ana ölçek. */
  /* yan yana çizilmiş ayrı çizimleri (ör. cati.js DETAY-A ve DETAY-B tek görünümde) ayrı görünümlere bölmek için: nesne kutuları x aralığına göre kümelenir;
     aralarında en az `bosluk` (m) olan kümeler ayrı. kutular: [{ id, bb: [x0, y0, x1, y1] }] → [[id …] …] (soldan sağa) */
  const yanYanaBol = (kutular, bosluk = 0.05) => { const L = (kutular || []).filter(q => q && q.bb && isFinite(q.bb[0])).sort((p, q) => p.bb[0] - q.bb[0]), out = []; let cur = null, sag = -Infinity;
    for (const q of L) { if (cur && q.bb[0] <= sag + bosluk) { cur.push(q.id); sag = Math.max(sag, q.bb[2]); } else { cur = [q.id]; out.push(cur); sag = q.bb[2]; } } return out; };
  /* BÖLGE DÜZENİ (Bekçi binası 14.11.2026: "statik, mekanik, mimari paftalar üst üste biniyor"): Tasarım alanındaki bütün disiplin çizimleri
     (görünüm grupları ve paftaya ait gevşek çizimler) disiplin sırasıyla modelin sağına, ayrık bölgelere. Bir disiplinin çizimleri kendi aralarında
     çakışmıyor ve aralarında büyük boşluk yoksa (kapladıkları alan / birleşik kutu ≥ 1/4) düzenleri korunur, blok olarak taşınır; yoksa ızgaraya dizilir
     (x sırasıyla, satır eni ≈ 1,6 × √alan). Zaten düzenliyse hiçbir şey kıpırdamaz (ikinci çalıştırma boş).
     birimler: [{ id, dis, bb: [x0, y0, x1, y1] }], model: [x0, y0, x1, y1] (yerinde kalan çizim) → { tasi: { id: [dx, dy] }, bolgeler: { dis: { x0, yUst, w, h } }, basliklar: [{ dis, p }] } */
  const bolgeDuzeniPlanla = (birimler, model, o = {}) => {
    const sira = o.sira || BOLGE_SIRA.concat(['Genel']), bosluk = o.bosluk == null ? 20 : o.bosluk, bH = o.baslikH == null ? 1.5 : o.baslikH, tol = 1e-6;
    const U = (birimler || []).filter(q => q && q.bb && q.bb.every(isFinite) && q.bb[2] >= q.bb[0] && q.bb[3] >= q.bb[1]);
    const disler = [...new Set(U.map(q => q.dis))].sort((a, b) => { const i = sira.indexOf(a), j = sira.indexOf(b); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j) || String(a).localeCompare(String(b)); });
    const M = model && model.every(isFinite) ? model : [0, 0, 0, 0], tasi = {}, bolgeler = {}, basliklar = [];
    const ust = (a, b) => a[0] < b[2] - tol && a[2] > b[0] + tol && a[1] < b[3] - tol && a[3] > b[1] + tol;
    let x = M[2] + bosluk; const yUst = M[3];
    for (const dis of disler) {
      const L = U.filter(q => q.dis === dis), ub = [Math.min(...L.map(q => q.bb[0])), Math.min(...L.map(q => q.bb[1])), Math.max(...L.map(q => q.bb[2])), Math.max(...L.map(q => q.bb[3]))];
      const alan = L.reduce((s, q) => s + Math.max(1e-6, (q.bb[2] - q.bb[0]) * (q.bb[3] - q.bb[1])), 0), ubA = Math.max(1e-6, (ub[2] - ub[0]) * (ub[3] - ub[1]));
      const cak = L.some((p, i) => L.some((q, j) => j > i && ust(p.bb, q.bb)));
      const rel = {}; let W, H;
      if (!cak && alan / ubA >= 0.25) { for (const q of L) rel[q.id] = [q.bb[0] - ub[0], q.bb[3] - ub[3]]; W = ub[2] - ub[0]; H = ub[3] - ub[1]; }
      else { const S = L.slice().sort((p, q) => p.bb[0] - q.bb[0] || q.bb[3] - p.bb[3]), en = Math.max(...S.map(q => q.bb[2] - q.bb[0]), Math.sqrt(alan) * 1.6), satir = [[]]; let sx = 0;
        for (const q of S) { const w = q.bb[2] - q.bb[0]; if (satir[satir.length - 1].length && sx + w > en) { satir.push([]); sx = 0; } satir[satir.length - 1].push({ id: q.id, w, h: q.bb[3] - q.bb[1] }); sx += w + 4; }
        const Z = izgaraDiz(satir); Object.assign(rel, Z.yer); W = Z.w; H = Z.h; }
      const ust0 = yUst - bH * 3;
      for (const q of L) { const r = rel[q.id], d = [x + r[0] - q.bb[0], ust0 + r[1] - q.bb[3]]; if (Math.abs(d[0]) > 1e-6 || Math.abs(d[1]) > 1e-6) tasi[q.id] = d; }
      bolgeler[dis] = { x0: x, yUst, w: W, h: H + bH * 3 }; basliklar.push({ dis, p: [x, yUst - bH] }); x += W + bosluk;
    }
    return { tasi, bolgeler, basliklar };
  };
  /* KULLANILMAYAN ESKİ KESİTLER (kullanıcı kararı 14.11.2026, Bekçi: "Genel" bölgesine konmuş, hiçbir paftada olmayan 13 eski canlı kesit silinsin):
     kayitlar: [{ id, kind ('kesit' | 'plan' …), gvs: [gv …], bb: [x0, y0, x1, y1] (model), elle }], o: { vpGv: [gv] (pencerenin gösterdiği görünüm),
     pencereler: [[x0, y0, x1, y1]] (görünüm bağsız pencerelerin model alanı) }. Döner: silinecek kayıt kimlikleri — kesit ya da canlı kot planı (KOTPLANI)
     türünde, elle düzeltilmemiş, görünümü olan ve hiçbir pencerede görünmeyen kayıtlar (statik / mekanik modüllerin çizimleri bu listeye girmez:
     canlı kayıtları yoktur — ör. mekanik Y-Y yalıtım kesiti MTY…) */
  const kullanilmayanKesitler = (kayitlar, o = {}) => { const G = new Set(o.vpGv || []), P = o.pencereler || [], kes = (a, b) => a && b && a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    return (kayitlar || []).filter(q => q && (q.kind === 'kesit' || q.kind === 'plan') && !q.elle && (q.gvs || []).length && !q.gvs.some(g => G.has(g)) && !P.some(w => kes(q.bb, w))).map(q => q.id); };
  const dxfCizgiOlcegi = olcek =>({ ltscale: (+olcek || 50) / 1000, psltscale: 0, celtOlcek: +olcek || 50 });
  const api = { PAFTA_R2, paftaPlanla, katKotlari, gercekKatlar, planKesmeKotu, kesitHatlari, kotYaz, tekKopyaYap, KAGIT, UZAMA, OLCEK_ESIK, icOlcu, olcekSec, paftalarPlanla, enAzKagit, izgaraDiz, bolgeYeri, BOLGE_SIRA, bolgeDuzeniPlanla, dxfCizgiOlcegi, yanYanaBol, kullanilmayanKesitler };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!C) return;
  C.mimariPaftaApi = api;

  /* ======================= MODEL → GÖRÜNÜŞLER ======================= */
  /* büyük harf: proje dili İngilizce iken Türkçe kuralı (i → İ) kullanılmaz ("GT6-İNSAAT" değil "GT6-INSAAT"); sözlükle çevrilecek Türkçe yazılar upTR */
  const M = C.M, upTR = s => String(s || '').toLocaleUpperCase('tr'), up = s => ((C.lang && C.lang() === 'en') ? String(s || '').toUpperCase() : upTR(s));
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
    const kk = sc / 1000, ents = C.doc.ents.filter(e => e.gv === gv && (e.type !== 'kesitisaret' || e.planIsaret)); if (!ents.length) return null;
    for (const e of ents) { if (e.type === 'baslik' && e.ay != null && e.dmm != null) { e.p = [e.p[0], e.ay - e.dmm * kk, 0]; delete e.ay; delete e.dmm; } delete e._c; }
    const bb = C.withAnno ? C.withAnno(sc, () => C.extents(ents)) : C.extents(ents); for (const e of ents) delete e._c; if (!bb || !isFinite(bb[0])) return null;
    /* seviye yazısı ("ÇATI +5.24 (210.91)") pencere kenarına yapışmasın: yazının ölçülen genişliği + 2 mm (denetim 14.11.2026, Konya A'-A', B'-B') */
    const yaziSag = () => { for (const e of ents) { if (e.type !== 'seviyecizgi' || !C.T.seviyecizgi) continue; let P = []; try { P = C.withAnno ? C.withAnno(sc, () => C.T.seviyecizgi.prims(e)) : C.T.seviyecizgi.prims(e); } catch (er) { continue; }
      for (const q of P) if (q.k === 'T' && q.p) { const w = C.measureText ? C.measureText(String(q.s || ''), q.h, C.textStyle ? C.textStyle(q.st) : undefined) * ((C.textStyle && C.textStyle(q.st) && C.textStyle(q.st).wf) || 1) : String(q.s || '').length * q.h * 0.8; bb[2] = Math.max(bb[2], q.p[0] + w + 2 * kk); } } };
    try { yaziSag(); } catch (er) { console.error('seviye yazısı', er); }
    for (const e of ents) if (e.type === 'baslik') { const hp = e.hp || 5, yb = e.p[1] - hp * 1.9 * kk, hw = String(e.s || '').length * hp * 0.4 * kk + 2 * kk; bb[1] = Math.min(bb[1], yb); bb[0] = Math.min(bb[0], e.p[0] - hw); bb[2] = Math.max(bb[2], e.p[0] + hw); }
    const k = 1000 / sc; return { gv, bb, w: (bb[2] - bb[0]) * k, h: (bb[3] - bb[1]) * k };
  };

  /* görünüm başlığı en alttaki çizimin (balon, ölçü) altına: blokOlc başlığı ay − dmm'ye koyar */
  const baslikAlta = gv => { const g = C.doc.ents.filter(e => e.gv === gv); g.forEach(e => { delete e._c; }); const b = C.extents(g.filter(e => e.type !== 'baslik')); if (!b) return;
    for (const e of g) if (e.type === 'baslik') { e.ay = b[1]; e.dmm = 11; e.p = [e.p[0], b[1] - 11 * C.annoH(1), 0]; delete e._c; } };
  /* ölçü çakışma denetimi (firma kuralı 14.11.2026: sıralar üst üste binmez): görünümdeki ölçüler, kot, yazılar, açılım kodları ve doğrama numarası
     daireleri kâğıt mm'de. tasinir: çakışma gidermede kayabilecek öğeler gruplanır (ölçü sırası çizgisine dik, kot yatayda, doğrama numarası düşeyde) */
  /* kayma sınırları kural tablosundan (cizim-kural.js MIMARI.cakismaKayma) */
  const KAYMA = () => Object.assign({ olcu: 16, kot: 12, acilim: 10, dogramaNo: 8, enCok: 16 }, (C.cizimKural && C.cizimKural.MIMARI && C.cizimKural.MIMARI.cakismaKayma) || {});
  const ogeTopla = (gv, tasinir) => { const k = C.annoH(1), og = [], ref = new Map(), r3 = v => (+v).toFixed(3), KY = KAYMA();
    for (const e of C.doc.ents) { if (e.gv !== gv) continue;
      if (e.type === 'dim' && e.a && e.b && e.p && (e.k === 'h' || e.k === 'v')) { const h = e.k === 'h', ad = 'ölçü#' + e.id, g = tasinir ? (h ? 'h:' + r3(e.p[1]) : 'v:' + r3(e.p[0])) : null;
        og.push(Object.assign({ ad, k: 'olcu', a: h ? [e.a[0] / k, e.p[1] / k] : [e.p[0] / k, e.a[1] / k], b: h ? [e.b[0] / k, e.p[1] / k] : [e.p[0] / k, e.b[1] / k], p: [e.p[0] / k, e.p[1] / k], yazi: 2, metin: String(Math.round(Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]) * 100)) }, g ? { grup: g, eksen: h ? 'y' : 'x', sinir: KY.olcu } : {})); ref.set(ad, e); }
      else if (e.type === 'acilim' && C.acilimYaziKutulari) { const ad = 'acilim#' + e.id; for (const b of C.acilimYaziKutulari(e)) og.push(Object.assign({ ad, k: 'kutu', bb: b.map(v => v / k) }, tasinir && e.p ? { grup: ad, eksen: (e.tur || '') === 'duvar' ? 'y' : 'x', sinir: KY.acilim } : {})); ref.set(ad, e); } // açılım kodu yazısı (acilimKaydir gibi: duvar kodu düşeyde, döşeme kodu yatayda)
      else if (e.type === 'kot' || e.type === 'text' || (e.type === 'circle' && /DOGRAMA_NO$/.test(e.layer || ''))) { let b; try { delete e._c; b = C.bbox(e); } catch (er) { continue; } if (!(b && isFinite(b[0]))) continue;
        const ad = e.type + '#' + e.id, no = /DOGRAMA_NO$/.test(e.layer || ''), c = no ? (e.type === 'circle' ? e.c : e.p) : null, g = !tasinir ? null : e.type === 'kot' ? ad : no && c ? 'no:' + r3(c[0]) + ',' + r3(c[1]) : null;
        og.push(Object.assign({ ad, k: 'kutu', bb: b.map(v => v / k) }, no && c ? { ayni: 'no:' + r3(c[0]) + ',' + r3(c[1]) } : {}, g ? { grup: g, eksen: e.type === 'kot' ? 'x' : 'y', sinir: e.type === 'kot' ? KY.kot : KY.dogramaNo } : {})); ref.set(ad, e); } }
    return { og, ref, k }; };
  const olcuDenetle = gvs => { const A = C.mimariOtoApi; if (!A) return []; const out = [];
    for (const gv of gvs.filter(Boolean)) for (const [x, y] of A.olcuCakisma(ogeTopla(gv).og, { sira: 250 / (+C.doc.set.anno || 50) - 0.01 })) /* sıralar arası modelde 25 cm */ out.push({ gv, x, y }); // ölçü, yazı, kot, açılım kodu, oklu açıklama yazısı ve doğrama numarası (denetim 14.11.2026)
    return out; };
  /* çakışma giderme (mimari-oto.js cakismaCoz): ölçü sırası, kot ve doğrama numarası birkaç mm kaydırılır; ölçülen noktalar yerinde kalır */
  const cakismaGider = gv => { const A = C.mimariOtoApi; if (!A || !A.cakismaCoz || !gv) return 0; const T = ogeTopla(gv, true), R = A.cakismaCoz(T.og, { sira: 250 / (+C.doc.set.anno || 50) - 0.01, enCok: KAYMA().enCok }), k = T.k; let n = 0;
    for (const [g, d] of Object.entries(R.tasi)) { const dx = d[0] * k, dy = d[1] * k; if (!dx && !dy) continue; n++;
      for (const q of T.og) { if (q.grup !== g) continue; const e = T.ref.get(q.ad); if (!e || e._kayd === g) continue; e._kayd = g;
        if (e.type === 'dim') e.p = [e.p[0] + dx, e.p[1] + dy, e.p[2] || 0]; else if (e.type === 'circle') e.c = [e.c[0] + dx, e.c[1] + dy, e.c[2] || 0]; else e.p = [e.p[0] + dx, e.p[1] + dy, e.p[2] || 0]; delete e._c; } }
    for (const e of T.ref.values()) delete e._kayd; return n; };
  /* kesit işareti planlarda (Çokal R2 planları): modeldeki kesit hattı plan görünümüne taşınır, uçları planın (ölçü ve balonlar dahil) 4 mm dışında */
  const kesitIsaretiPlana = (gv, W, v, nm) => {
    const m = C.byId(v.isaret), a0 = m ? m.a : v.a, b0 = m ? m.b : v.b; if (!a0 || !b0 || !C.makeSectionMark) return null;
    const n = m && m.n ? m.n : (() => { const u = [b0[0] - a0[0], b0[1] - a0[1]], l = Math.hypot(u[0], u[1]) || 1, q = [-u[1] / l, u[0] / l], s = v.sp ? Math.sign((v.sp[0] - a0[0]) * q[0] + (v.sp[1] - a0[1]) * q[1]) || 1 : 1; return [q[0] * s, q[1] * s]; })();
    const g = C.doc.ents.filter(e => e.gv === gv && e.type !== 'baslik' && e.type !== 'kesitisaret'); g.forEach(e => { delete e._c; }); const ext = C.extents(g); if (!ext) return null;
    const A = W(a0), B = W(b0), u = [B[0] - A[0], B[1] - A[1]], l = Math.hypot(u[0], u[1]) || 1, d = [u[0] / l, u[1] / l], k = C.annoH(1);
    let t0 = -Infinity, t1 = Infinity; // hattın planın kutusu içindeki aralığı
    for (const [p, q0, q1] of [[d[0], ext[0] - A[0], ext[2] - A[0]], [d[1], ext[1] - A[1], ext[3] - A[1]]]) { if (Math.abs(p) < 1e-9) continue; const x = q0 / p, y = q1 / p; t0 = Math.max(t0, Math.min(x, y)); t1 = Math.min(t1, Math.max(x, y)); }
    if (!(t1 > t0)) { t0 = 0; t1 = l; }
    /* balonlar öbür kesit işaretlerinin balonlarına binmesin (denetim 14.11.2026, Konya çatı planı: A ile A' balonları merkezler arası 6 mm, r 5):
       binerse bu işaretin uçları hat boyunca 13 mm'lik adımlarla dışarı uzatılır */
    const r = 5 * k, bal = q => { const qa = q.a, qb = q.b, w = [qb[0] - qa[0], qb[1] - qa[1]], lw = Math.hypot(w[0], w[1]) || 1, uu = [w[0] / lw, w[1] / lw]; return [[qa[0] - uu[0] * r, qa[1] - uu[1] * r], [qb[0] + uu[0] * r, qb[1] + uu[1] * r]]; };
    const diger = C.doc.ents.filter(q => q.gv === gv && q.type === 'kesitisaret' && q.planIsaret && q.name !== (nm || v.nm)).flatMap(bal).map(c => ({ c, r }));
    for (const ax of C.doc.ents.filter(q => q.gv === gv && q.type === 'aks')) { let P = []; try { P = C.prims(ax); } catch (er) { } for (const pr of P) if (pr.k === 'C' && pr.c) diger.push({ c: pr.c, r: pr.r }); } // aks balonları da (Konya çatı planı: B' ile aks balonu 6 mm)
    let ek = 4 * k, e = null;
    for (let i = 0; i < 4; i++) { const pa = [A[0] + d[0] * (t0 - ek), A[1] + d[1] * (t0 - ek), 0], pb = [A[0] + d[0] * (t1 + ek), A[1] + d[1] * (t1 + ek), 0], B2 = bal({ a: pa, b: pb });
      const carp = diger.some(D => B2.some(q => Math.hypot(D.c[0] - q[0], D.c[1] - q[1]) < D.r + r + 2 * k));
      if (!carp || i === 3) { e = C.makeSectionMark(pa, pb, n, nm || v.nm, gv); break; } ek += 13 * k; }
    if (e) { e.planIsaret = true; delete e.sp; } return e;
  };
  /* 2B parça (C.prims biçimi) → görünüm nesnesi (W: model → çizim) */
  const primEnt = (pr, W, gv, layer) => { const X = q => { const w = W(q); return [w[0], w[1], 0]; }, b = { gv, layer: pr.k === 'T' ? 'YAZI' : layer, lt: pr.lt || 'BYLAYER' };
    let e = null;
    if (pr.k === 'L') e = C.newEnt('line', Object.assign(b, { a: X(pr.a), b: X(pr.b) }));
    else if (pr.k === 'P') e = C.newEnt('pline', Object.assign(b, { pts: pr.pts.map(X), closed: !!pr.c }));
    else if (pr.k === 'C') e = C.newEnt('circle', Object.assign(b, { c: X(pr.c), r: pr.r }));
    else if (pr.k === 'T') e = C.newEnt('text', Object.assign(b, { p: X(pr.p), h: pr.h, s: pr.s, rot: (pr.rot || 0) * 180 / Math.PI, al: pr.al, ann: false }));
    if (e) { const x = C.add(e); if (x) delete x.sp; } return e; };

  /* yetim kesit işaretleri (önceki sürümlerin canlı yenilemesinde geçici gv'de kalan ya da görünümüne bağlanmamış kopyalar): her disiplin kesitinin
     Tasarım'da tek işareti kalır (v.isaret; yoksa aynı adlı ve aynı hattaki işaret bağlanır); öbür kopyalar silinir. Plan işaretlerine (planIsaret) dokunulmaz */
  const kesitIsaretTemizle = () => { const G = C.gorunumApi; if (!G) return 0; const VL = G.liste().filter(v => v.tip === 'kesit'), tut = new Set(), n0 = C.doc.ents.length;
    for (const v of VL) { let m = C.byId(v.isaret); if (!m || m.type !== 'kesitisaret') m = C.doc.ents.find(e => e.type === 'kesitisaret' && !e.planIsaret && e.name === v.nm && v.a && Math.hypot(e.a[0] - v.a[0], e.a[1] - v.a[1]) < 0.05);
      if (m) { delete m.gv; m.gorunum = v.id; v.isaret = m.id; tut.add(m.id); } }
    /* yalnız Mimari kesitlerinin (MIMARIPAFTA'nın ürettiği / Mimari grubuna gönderilmiş) yetim kopyaları silinir; tek başına alınmış KESITAL işareti
       (canlı, görünümsüz) ancak aynı adlı Mimari kesitin hattı üstündeyse kopyadır (denetim 14.11.2026) */
    const mimMi = v => v.kaynak === 'MIMARIPAFTA' || (v.gruplar || []).some(g => /M[İI]MAR/i.test(String(g)));
    const MV = VL.filter(mimMi), adlar = new Set(MV.map(v => v.nm)), ayniHat = e => MV.some(v => v.nm === e.name && v.a && e.a && Math.hypot(e.a[0] - v.a[0], e.a[1] - v.a[1]) < 0.05);
    C.doc.ents = C.doc.ents.filter(e => !(e.type === 'kesitisaret' && !e.planIsaret && !tut.has(e.id) && adlar.has(e.name) && (/^K/.test(e.gv || '') || (e.gorunum && !VL.some(v => v.id === e.gorunum)) || (e.canli && !e.gv && !e.gorunum && ayniHat(e))))); // yetim: geçici gv'de, bağlı görünümü silinmiş ya da canlı yenilemeden kalmış bağsız kopya
    return n0 - C.doc.ents.length; };
  C.kesitIsaretTemizle = kesitIsaretTemizle;
  const uret = async (SC) => {
    const G = C.gorunumApi; if (!G || !C.makeView) { C.warn('Görünüş / disiplin modülleri yüklenmemiş.'); return null; }
    const { ents, secim, u } = kapsam(); if (!ents.length) { C.warn('3B model yok: mimari pafta için önce yapıyı (perde, döşeme, duvar …) 3B modelleyin.'); return null; }
    const st = durum(), ids = secim ? ents.map(e => e.id) : null;
    const grup0 = new Map(G.liste().map(v => [v.id, (v.gruplar || []).slice()])); /* kesitlerin özgün disiplin grupları (aşağıdaki temizlik hepsini Mimari'ye çevirir) */
    /* eski projelerin otomatik Statik / Mekanik / Elektrik kesit pencereleri ve görünümleri temizlenir (yalnız Mimari kesit; elle düzeltilmiş olanlar kalır) */
    try { if (G.tekDisiplinTemizle) { const T = G.tekDisiplinTemizle(); if (T.pencere || T.gorunum || T.pafta.length) C.log(`Yalnız mimari kesit (kullanıcı kararı): ${T.pencere} disiplin kesit penceresi, ${T.gorunum} Statik / Mekanik / Elektrik kesit görünümü kaldırıldı${T.pafta.length ? `; boşalan otomatik kesit paftaları silindi: ${T.pafta.join(', ')}` : ''}.`); } } catch (er) { console.error('disiplin kesit temizliği', er); }
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
    const katlar0 = katKotlari({ seviyeler: svl, dosemeUst: dUst, zmin, zmax, dikeyUst, abs0: sv.abs0 });
    /* yalnız gerçek kat seviyeleri (gercekKatlar): temel altı, dolgulu, alçak, boş ya da başka planla aynı seviye plan üretmez */
    const katAtilan = [], katOge = ents.map(e => { const t = e.type, tip = /^(plak|slab|temel|kaplama)$/.test(t) ? 'doseme' : /^(perde|kolon|duvar|wall)$/.test(t) ? (/TEMEL/i.test(e.layer || '') ? null : 'dikey') : t === 'acik' ? 'acik' : t === 'dolgu' ? 'dolgu' : /^(room|mahal|mtmahal)$/.test(t) ? 'mahal' : null;
      if (!tip) return null; const [z0, z1] = zAralik([e]); if (isFinite(z0)) return { id: e.id, tip, z0, z1 }; return tip === 'mahal' && isFinite(+e.z) ? { id: e.id, tip, z0: +e.z, z1: +e.z } : null; }).filter(Boolean);
    let katlar = gercekKatlar(katlar0, katOge, { zTop: dikeyUst, atilan: katAtilan }); if (!katlar.length) katlar = katlar0;
    if (katAtilan.length) C.log(`Kat planı çıkarılmayan seviyeler: ${katAtilan.map(q => `${kotYaz(q.z)} (${q.neden})`).join(', ')}.`);
    /* merdivenli katta plan ilk ara sahanlığın üstünden kesilir (planKesmeKotu); başlık yine kat kotu */
    const merd = ents.filter(e => e.type === 'merdiven' && C.merdivenGeom).map(e => { try { const Gm = C.merdivenGeom(e); return { z0: +Gm.z0, sahanliklar: (Gm.pieces || []).filter(p => p.kind === 'sah').map(p => +p.z) }; } catch (er) { return null; } }).filter(Boolean);
    katlar.forEach((k, i) => { const r = planKesmeKotu(k, merd, { ust: katlar[i + 1] ? katlar[i + 1].z : null }); if (r.sahanlik != null) { k.h = r.h; k.sahanlik = r.sahanlik; } });
    const planlar = katlar.map(k => { const gv = gorunus({ kind: 'plan', h: k.h, depth: Math.max(1, k.h - zmin + 0.5), hatch: 'ANSI31', title: k.baslik, mek: false, poz: false, dograma: true }); if (!gv) return null;
      /* kapı / pencere tip numaraları, akslar üzerinden ölçü sıraları (Çokal İdari planı), başlık balonların altına */
      const W = sonW; try { if (C.dogramaEtiketPlan) C.dogramaEtiketPlan(gv, W, k.h, ents, bbDis); if (C.mimariPlanOlcu) C.mimariPlanOlcu(gv, W, bbDis, k.h, ents); if (C.korkulukOkPlan) C.korkulukOkPlan(gv, W, k.h, ents, Math.max(1, k.h - zmin + 0.5)); if (C.yagmurOkPlan) C.yagmurOkPlan(gv, W, k.h, ents); if (C.lentoOkPlan) C.lentoOkPlan(gv, W, k.h, ents); baslikAlta(gv); asagi(gv); } catch (er) { console.error('plan ölçü / doğrama no', er); }
      return { ad: k.baslik, gv, W }; }).filter(Boolean);
    // --- kesitler: yapıyı kesen Mimari kesitleri; yoksa kesit yerleri kuralıyla (ya da A-A ve B-B) alınır
    /* yalnız Mimari kesitleri: MIMARIPAFTA'nın kendi kesitleri ve kullanıcının Mimari grubuna gönderdiği kesitler (özgün grubu; G.turler artık her kesite
       MIMARI der). Başka disipline ait (Statik / Mekanik / Elektrik) kesitler ele alınmaz; elle düzeltilmiş (v.elle) Mimari kesitler paftaya konur ama
       yeniden üretilmez ve silinmez (denetim 14.11.2026) */
    const mimMi = v => v.kaynak === 'MIMARIPAFTA' || (grup0.get(v.id) || v.gruplar || []).some(g => /M[İI]MAR/i.test(String(g)));
    const VL = G.liste(); let kes = VL.filter(v => v.tip === 'kesit' && v.a && v.b && kesiyorMu(v, bb) && mimMi(v));
    /* önceki MIMARIPAFTA kesitleri: yerleri modelden yeniden seçilir (kullanıcının KESITPAFTA ile aldıkları aynen kalır) */
    if (kes.length && kes.every(v => v.kaynak === 'MIMARIPAFTA' && !v.elle)) { for (const v of kes) { G.sil(v); const i = VL.indexOf(v); if (i >= 0) VL.splice(i, 1); for (const L of C.doc.layouts || []) if (L.vps) L.vps = L.vps.filter(q => q.gorunum !== v.id); } kes = [];
      C.doc.layouts = (C.doc.layouts || []).filter(L => !(L.kesitPaftasi && !L.mimPafta && !(L.vps || []).length)); } // boşalan disiplin kesit paftaları
    let kesitBilgi = null;
    if (kes.length) for (const v of kes) { if (v.elle) continue; const kendi = v.kaynak === 'MIMARIPAFTA', yal = kendi || !G.silTur ? undefined : 'MIMARI'; if (kendi) v.olcek = SC; if (yal) G.silTur(v, yal); else { const gv = v.gv; G.sil(v); v.gv = gv; } try { await G.kesitUret(v, yal); if (yal && G.eksikTurUret) await G.eksikTurUret(v); } catch (er) { console.error(er); } } /* Mimari kesitleri (kullanıcının KESITPAFTA ile aldıkları dahil, yerleri korunur) güncel üreticiyle yenilenir: aks, aks ölçüsü, etiketler; elle düzeltilmişler olduğu gibi kalır */
    {
      const kul = new Set(C.doc.ents.filter(e => e.type === 'kesitisaret').map(e => e.name).concat(VL.map(v => v.nm)));
      const sGr = ['Mimari']; /* yalnız Mimari kesit (kullanıcı kararı 14.11.2026: "statik, mekanik ve elektrik kesit istemiyorum") */
      /* kesit yerleri (firma kuralı 14.11.2026): uzun kesit bütün mahallerden, kısa kesitler büyük hacimden ve odalardan; doğramadan geçer, kolon / kiriş üstünde değil.
         Var olan (kullanıcının aldığı) kesitler korunur; kuralı sağlamayan eksik varsa (ör. bir oda hiçbir kısa kesitte yok) yalnız eksik hatlar eklenir */
      let hatlar = null; try { if (C.mimariKesitYerleri) { kesitBilgi = C.mimariKesitYerleri(ents, bbDis, katlar.map(k => k.z)); hatlar = kesitBilgi.hatlar; } } catch (er) { console.error('kesit yerleri', er); }
      if (!kes.length && (!hatlar || !hatlar.length)) hatlar = kesitHatlari(bb);
      if (kes.length && hatlar && C.mimariOtoApi && C.mimariOtoApi.eksikKesitler) hatlar = C.mimariOtoApi.eksikKesitler(hatlar, kes.map(v => ({ a: v.a, b: v.b })), kesitBilgi ? kesitBilgi.mahaller : [], bbDis);
      for (const h of hatlar || []) {
        let nm = h.nm; for (let c = 65; kul.has(nm) && c < 91; c++) nm = String.fromCharCode(c); kul.add(nm);
        const v = { id: 'G' + Date.now().toString(36) + nm, tip: 'kesit', kaynak: 'MIMARIPAFTA', ad: `${nm}-${nm} KESİTİ`, nm, a: h.a, b: h.b, sp: h.sp, depth: h.depth, yer: [X0, Yc], olcek: SC, gruplar: sGr };
        let n = 0; try { n = await G.kesitUret(v); } catch (er) { console.error('mimari kesit', er); }
        if (!n) continue; if (h.mahaller) v.mahaller = h.mahaller; VL.push(v); kes.push(v); asagi(v.gv);
      }
    }
    try { kesitIsaretTemizle(); } catch (er) { console.error('kesit işareti', er); }
    /* kesit işaretleri planlarda (her planda bütün kesitler; Çokal R2) */
    for (const p of planlar) { try { for (const v of kes) kesitIsaretiPlana(p.gv, p.W, v); baslikAlta(p.gv); } catch (er) { console.error('plan kesit işareti', er); } }
    // --- açılım tablosu (kodlu: DÖŞEMELER / DUVARLAR)
    let acGv = null, acV = null; try { if (C.acilimTablo && C.doc.ents.some(e => e.type === 'acilim')) { C.doc.set.sonKesitOlcek = SC; C.acilimTablo(true, { yerlestir: false }); const t = VL.find(v => v.tip === 'tablo' && v.unite === 'ACILIM'); acGv = t ? t.gv : null; acV = t || null; } } catch (er) { console.error('açılım tablosu', er); }
    // --- görünüşler
    const gor = {}; for (const d of ['ON', 'ARKA', 'SAG', 'SOL']) gor[d] = gorunus({ kind: 'view', dir: d, hatch: 'YOK', dograma: true });
    for (const d in gor) if (gor[d]) baslikAlta(gor[d]);
    // --- mahal listesi (zemin kaplaması verilmiş odalar varsa; modelden canlı)
    let mahGv = null; try { if (C.mahalVerisi && C.T.mahaltablo && C.mahalVerisi().rooms.length) { mahGv = 'MIM_MAHAL_' + Date.now().toString(36); const e = C.add(C.newEnt('mahaltablo', { p: [X0, Yc, 0], dis: 'Mimari', layer: 'MAHAL_LISTESI', gv: mahGv, title: yapiAdi(u) })); delete e.sp; st.gvs.push(mahGv); asagi(mahGv); } } catch (er) { console.error('mahal listesi', er); }

    // --- ÇATI: plan (üstten görünüş + oluk, iniş borusu, eğim okları, akslar ve ölçüler), çatı kesiti (yalnız çatı ve çatı döşemesi), DETAY-A / DETAY-B (1/10)
    const catiR = { plan: null, kesit: null, detay: null };
    const cati = ents.find(e => e.type === 'cati');
    { const gv = gorunus({ kind: 'view', dir: 'UST', hatch: 'YOK', title: 'ÇATI PLANI' }); catiR.plan = gv;
      if (gv) { const W = sonW; try {
        if (cati) { let prs = []; try { prs = C.catiPlanCizim ? C.catiPlanCizim(cati) : C.T.cati && C.T.cati.prims ? C.T.cati.prims(cati) : (C.catiPlanSembol ? C.catiPlanSembol(cati) : []); } catch (er) { prs = C.catiPlanSembol ? C.catiPlanSembol(cati) : []; } for (const pr of prs) primEnt(pr, W, gv, 'GORUNEN_CATI'); } // Çokal İdari ÇATI PLANI: iskelet (aşık, mertek, dikme, kuşaklama) etiketli, eğim okları, oluk, iniş borusu
        if (C.mimariPlanOlcu) C.mimariPlanOlcu(gv, W, bbDis, zmax + 1, ents);
        for (const v of kes) kesitIsaretiPlana(gv, W, v);
        catiR.W = W; baslikAlta(gv); asagi(gv); } catch (er) { console.error('çatı planı', er); } } }
    if (cati && C.catiGeom) {
      /* çatı kesitleri (Çokal 10-İdari Bina_R2 çatı paftası ÇKL-AAT-İB-03: A'-A' mahya boyunca — uzun, aks 1 … 7; B'-B' mahyaya dik — kısa, aks A … D; 1/50):
         yalnız çatı, çatı döşemesi ve çatı kirişleri kesilir */
      try {
        const Gc = C.catiGeom(cati), host = C.byId(cati.host), zt = +cati.zt || (host ? +host.zt : 0), f = Gc.foot;
        const bx = [Math.min(...f.map(p => p[0])), Math.min(...f.map(p => p[1])), Math.max(...f.map(p => p[0])), Math.max(...f.map(p => p[1]))];
        const rid = (Gc.lines.ridge || []).slice().sort((p, q) => Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) - Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]))[0];
        const c0 = rid ? [(rid[0][0] + rid[1][0]) / 2, (rid[0][1] + rid[1][1]) / 2] : [(bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2];
        let ud = rid ? [rid[1][0] - rid[0][0], rid[1][1] - rid[0][1]] : (bx[2] - bx[0] >= bx[3] - bx[1] ? [1, 0] : [0, 1]); { const l = Math.hypot(ud[0], ud[1]) || 1; ud = [ud[0] / l, ud[1] / l]; }
        const un = [-ud[1], ud[0]], R = Math.max(bx[2] - bx[0], bx[3] - bx[1]) / 2 + 1.5;
        const sec = new Set([cati.id, cati.host].concat(ents.filter(e => e.type === 'kiris' && Math.abs((+e.zt || 0) - zt) < 0.05).map(e => e.id)));
        const kul = new Set(VL.map(v => v.nm)), harf = h => { let nm = h + "'"; for (let c = 65; kul.has(nm) && c < 91; c++) nm = String.fromCharCode(c) + "'"; kul.add(nm); return nm; };
        const cB = [c0[0] + ud[0] * 0.3, c0[1] + ud[1] * 0.3], cA = [c0[0] - un[0] * 0.35, c0[1] - un[1] * 0.35]; // kesit hattı dikme / mahya aşığı üstüne gelmesin
        const hatlar = [
          { nm: harf('A'), a: [cA[0] - ud[0] * R, cA[1] - ud[1] * R], b: [cA[0] + ud[0] * R, cA[1] + ud[1] * R], sp: [cA[0] + un[0] * 2, cA[1] + un[1] * 2], depth: 2 },
          { nm: harf('B'), a: [cB[0] - un[0] * R, cB[1] - un[1] * R], b: [cB[0] + un[0] * R, cB[1] + un[1] * R], sp: rid ? [cB[0] + ud[0] * 2, cB[1] + ud[1] * 2] : [cB[0] - ud[0] * 2, cB[1] - ud[1] * 2], depth: 3 }, /* mahyasız (kare planlı kırma) çatıda bakış tepe noktasına doğru: tepe kesit derinliğinde, mahya kotu B'-B'de de yazılır (denetim 14.11.2026, Bekçi) */
        ];
        catiR.kesitler = [];
        for (const h of hatlar) {
          const nm = h.nm, v = { id: 'G' + Date.now().toString(36) + 'CATI' + catiR.kesitler.length, tip: 'kesit', kaynak: 'MIMARIPAFTA', ad: `${nm}-${nm} ÇATI KESİTİ`, nm, a: h.a, b: h.b, sp: h.sp, depth: h.depth, yer: [X0, Yc], olcek: SC, acilim: false };
          /* öbür elemanların 3B ağı kesit süresince gizlenir (C.doc.ents değiştirilmez: canlı görünüm imzası — proje.js — bozulmasın), doğrama numarası yazılmaz;
             işaret planda (aşağıda), modelde değil; canlı görünüm kaydı silinir (MIMARIPAFTA her çalışmada yeniden üretir) */
          const once = new Set(C.doc.ents.map(e => e.id)), ms0 = C.meshes, de0 = C.dogramaEtiketKesit, dc0 = C.dogramaCizKesit, ko0 = C.korkulukOkKesit, lo0 = C.lentoOkKesit;
          C.meshes = function (e) { return e && (sec.has(e.id) || e.gv) ? ms0.apply(this, arguments) : null; }; C.dogramaEtiketKesit = () => 0; C.dogramaCizKesit = () => []; C.korkulukOkKesit = () => 0; C.lentoOkKesit = () => 0; // çatı kesitinde doğrama, lento ve korkuluk yok
          try { await G.kesitUret(v); } finally { C.meshes = ms0; C.dogramaEtiketKesit = de0; C.dogramaCizKesit = dc0; C.korkulukOkKesit = ko0; C.lentoOkKesit = lo0; }
          const yeni = C.doc.ents.filter(e => !once.has(e.id));
          const canli = C.doc.set.canli || {}; for (const e of yeni) if (e.canli) { delete canli[e.canli]; delete e.canli; }
          /* yalnız çatı seviyesi çizgisi kalır; çatı döşemesinin 1 m altından aşağıda kalan (su tutucu bant vb.) atılır */
          const svz = new Map((C.seviyeler ? C.seviyeler() : []).map(q => [q.id, +q.z])), dos = yeni.filter(e => e.layer === 'KESIT_CATI_DOSEMESI' && e.type === 'pline'), db = dos.length ? C.extents(dos) : null, yAlt = db ? db[1] - 1 : -Infinity;
          const at = new Set(yeni.filter(e => e.type === 'kesitisaret' || (e.type === 'seviyecizgi' && !(svz.has(e.sid) && svz.get(e.sid) >= zt - 0.5)) || (e.type !== 'seviyecizgi' && e.type !== 'dim' && e.type !== 'baslik' && (() => { let b; try { delete e._c; b = C.bbox(e); } catch (er) { return false; } return b && b[3] < yAlt; })())).map(e => e.id));
          C.doc.ents = C.doc.ents.filter(e => !at.has(e.id));
          if (v.gv && yeni.length) { st.gvs.push(v.gv); catiR.kesitler.push(v); asagi(v.gv); if (catiR.plan && catiR.W) kesitIsaretiPlana(catiR.plan, catiR.W, v, nm); }
        }
        if (catiR.plan && catiR.W) { try { if (C.catiKotPlan) C.catiKotPlan(catiR.plan, catiR.W, cati); if (C.catiOkPlan) C.catiOkPlan(catiR.plan, catiR.W, cati); } catch (er) { console.error('çatı planı okları', er); } } // kesit işaretlerinden sonra: oklar onlara binmez
        if (catiR.plan) baslikAlta(catiR.plan); catiR.kesit = catiR.kesitler.length ? catiR.kesitler[0].gv : null;
      } catch (er) { console.error('çatı kesiti', er); }
      // DETAY-A (saçak) ve DETAY-B (mahya), 1/10 — cati.js; katmanlar kural tablosundaki adlara (kesilen → Beton, ince → Ongor)
      try { if (C.catiDetaylari) { const gv = 'MIM_CATIDET_' + Date.now().toString(36), g0 = C._gvCur; C._gvCur = gv;
        try { C.catiDetaylari(cati, [X0 + 1, Yc - 3]); } finally { C._gvCur = g0; }
        for (const e of C.doc.ents) if (e.gv === gv) { if (e.layer === 'DETAY') e.layer = 'DETAY_KESIT'; else if (e.layer === 'DETAY_INCE') e.layer = 'DETAY_GORUNEN'; if (e.type === 'text') { e.ann = false; delete e.acs; delete e.ascales; } if (e.type === 'hatch' && e.pat === 'DOTS') e.pat = 'ZIGZAG'; if (e.type === 'text' && e.h >= 0.035) { C.ensureLayer('Yazi30', 72, 'CONTINUOUS', 30); e.layer = 'Yazi30'; } delete e._c; } /* DETAY-A / DETAY-B başlıkları (1/10'da 4 mm, kural tablosu baslik.detayMm) başlık katmanında */ // yazılar gerçek boyda (1/10'da 2 mm); yalıtım taraması kuraldaki gibi ZIGZAG (mimari.md bölüm 5)
        /* DETAY-A ve DETAY-B ayrı görünüm: paftada boşluğa ayrı ayrı yerleşir (DETAY-B, DETAY-A'nın altına sığabilir) */
        const ge = C.doc.ents.filter(e => e.gv === gv), kut = ge.map(e => { let b = null; try { delete e._c; b = C.bbox(e); } catch (er) { } return { id: e.id, bb: b }; }), parca = yanYanaBol(kut, 0.05);
        catiR.detaylar = parca.map((ids, i) => { const g2 = i ? gv + '_' + i : gv; if (i) { const S = new Set(ids); for (const e of ge) if (S.has(e.id)) e.gv = g2; } st.gvs.push(g2); return g2; });
        if (!catiR.detaylar.length) { st.gvs.push(gv); catiR.detaylar = [gv]; } catiR.detay = catiR.detaylar[0]; catiR.detaylar.forEach(asagi); } } catch (er) { console.error('çatı detayları', er); }
    }

    // --- DETAYLAR (1/20): kapı / pencere tipleri, korkuluk tipleri; sac kapaklar (plan 1/20, kenar 1/5)
    const DA = C.mimariDetayApi, detay = { dograma: [], korkuluk: [], kapak: [] };
    const detayCiz = (out, items, bbx, sc) => { const gv = 'MIM_DET_' + Date.now().toString(36) + '_' + st.gvs.length, base = [X0 - bbx[0], Yc - bbx[3]];
      C.mimariDetayCiz(items, base, gv, sc); if (C.mimariDetayCerceve) C.mimariDetayCerceve(gv, sc, 5); st.gvs.push(gv); out.push({ gv, sc }); asagi(gv); return gv; };
    if (DA && C.mimariDetayCiz) {
      try { for (const t of (C.kapiPencereTipleri ? C.kapiPencereTipleri(ents) : [])) { const r = DA.dogramaDetay(t, { sc: 20 }); detayCiz(detay.dograma, r.items, r.bb, 20); } } catch (er) { console.error('doğrama detayı', er); }
      try { for (const t of (C.mimariKorkuluklar ? C.mimariKorkuluklar(ents) : [])) { const r = DA.korkulukDetay(t, { sc: 20 }); detayCiz(detay.korkuluk, r.items, r.bb, 20); } } catch (er) { console.error('korkuluk detayı', er); }
    }
    try { const KD = C.kapakDetay, bos = C.mimariKapakBosluklari ? C.mimariKapakBosluklari(ents) : [], tipler = DA ? DA.kapakTipleri(bos) : [];
      if (KD && tipler.length) { KD.katmanlar();
        for (const t of tipler) { const gv = 'MIM_KAPAK_' + t.ad + '_' + Date.now().toString(36); KD.plani(t, [X0 + 0.5, Yc - t.l - 0.8], gv, 20); for (const e of C.doc.ents) if (e.gv === gv && e.type === 'text' && e.h >= 0.09) { e.h = 2.5 * 20 / 1000; delete e._c; } /* kapak adı (SK1) başlık değil etiket: Mim_Yazi25, etiket boyu 2,5 mm (ana oturum kararı 14.11.2026) */ st.gvs.push(gv); detay.kapak.push({ gv, sc: 20 }); asagi(gv); }
        const ts = (bos[0] && bos[0].ts) || 0.15, gvK = 'MIM_KENAR_' + Date.now().toString(36); KD.kenar([X0 + 0.6, Yc - 0.3], gvK, 5, ts);
        /* malzeme yazıları düz açıklama olarak (açılım nesnesi Çokal stilinde DU / DÖ koduna döner; kapak parçaları açılım tablosunda yok) */
        for (const e of C.doc.ents.filter(q => q.gv === gvK && q.type === 'acilim')) { const p = e.p, a = e.a, sg = p[0] >= a[0] ? 1 : -1, hh = 0.01;
          C.add(C.newEnt('line', { a: [a[0], a[1], 0], b: [p[0], p[1], 0], layer: 'YAZI_KAPAK', gv: gvK })); C.add(C.newEnt('line', { a: [p[0], p[1], 0], b: [p[0] + sg * 0.02, p[1], 0], layer: 'YAZI_KAPAK', gv: gvK }));
          (e.lines || []).forEach((t, i) => C.add(C.newEnt('text', { p: [p[0] + sg * 0.025, p[1] + 0.003 - i * hh * 1.6, 0], h: hh, s: String(t), al: sg > 0 ? 'L' : 'R', layer: 'YAZI_KAPAK', gv: gvK, ann: false }))); }
        C.doc.ents = C.doc.ents.filter(q => !(q.gv === gvK && q.type === 'acilim')); C.doc.ents.forEach(q => { if (q.gv === gvK) delete q.sp; }); st.gvs.push(gvK); detay.kapak.push({ gv: gvK, sc: 5 }); asagi(gvK);
        detay.kapakTip = tipler; } } catch (er) { console.error('kapak detayı', er); }

    /* Tasarım alanında Mimari bölgesi: görünümler ızgarada (her tür bir sıra), modelin ve öbür disiplin bölgelerinin dışında, başında "MİMARİ" */
    try { bolgeDuzenle([[...planlar.map(p => p.gv), mahGv], [...kes.map(v => v.gv), acGv], ['ON', 'ARKA', 'SAG', 'SOL'].map(d => gor[d]), [catiR.plan, ...(catiR.kesitler || []).map(v => v.gv), ...(catiR.detaylar || [catiR.detay])],
      detay.dograma.map(d => d.gv), [...detay.korkuluk, ...detay.kapak].map(d => d.gv)], kes.concat(catiR.kesitler || []), st); } catch (er) { console.error('mimari bölge', er); }
    const denGv = [...planlar.map(p => p.gv), ...kes.map(v => v.gv), catiR.plan, ...(catiR.kesitler || []).map(v => v.gv)].filter(Boolean);
    for (const gv of denGv) { try { cakismaGider(gv); baslikAlta(gv); } catch (er) { console.error('çakışma giderme', er); } } // başlık en son: balonların, kesit işaretlerinin ve kayan ölçülerin altında (denetim 14.11.2026, Konya ±0.00 / −5.90 planı)
    return { planlar, cati: catiR, kes, acGv, acV, gor, mahGv, detay, yapi: yapiAdi(u), kesitBilgi, cakisma: olcuDenetle(denGv), kapsamBB: secim ? bb : null };
  };
  /* görünüm gruplarını Mimari bölgesine taşı. satirlar: [[gv]]; kesitler: canlı kesitlerin yeri (v.yer ve canlı görünüm kaydı) de taşınır */
  const bolgeDuzenle = (satirlar, kesitler, st) => {
    const set = C.doc.set, B = set.bolgeler = set.bolgeler || {}, ext = gv => { const g = C.doc.ents.filter(e => e.gv === gv); g.forEach(e => { delete e._c; }); return C.extents(g); };
    const S = satirlar.map(r => r.filter(Boolean).map(gv => { const b = ext(gv); return b ? { id: gv, w: b[2] - b[0], h: b[3] - b[1], b } : null; }).filter(Boolean)).filter(r => r.length);
    const Z = izgaraDiz(S), baslikH = 1.5, model = C.extents(C.doc.ents.filter(e => !e.gv && e.type !== 'sheet' && C.in3D && C.in3D(e))) || C.extents(C.doc.ents.filter(e => !e.gv && e.type !== 'sheet'));
    const Y = bolgeYeri(model, B, 'Mimari', Z.w, Z.h + baslikH * 3);
    const vByGv = new Map((kesitler || []).filter(v => v && v.gv).map(v => [v.gv, v]));
    for (const r of S) for (const q of r) { const [x, y] = Z.yer[q.id], d = [Y.x0 + x - q.b[0], Y.yUst - baslikH * 3 + y - q.b[3], 0]; if (Math.abs(d[0]) < 1e-9 && Math.abs(d[1]) < 1e-9) continue; const X = C.xMove(d);
      for (const e of C.doc.ents) if (e.gv === q.id) C.xform(e, X);
      const v = vByGv.get(q.id); if (v) { if (v.gvD && v.yer) { v.yerD = v.yerD || {}; for (const k of Object.keys(v.gvD)) if (!v.yerD[k]) v.yerD[k] = v.yer.slice(); } /* öbür disiplin türleri eski yerinde kalır (BOLGEDUZENLE kendi bölgesine taşır) */ if (v.yer) v.yer = [v.yer[0] + d[0], v.yer[1] + d[1]];
        const cid = (C.doc.ents.find(e => e.gv === q.id && e.canli) || {}).canli, V = cid && set.canli && set.canli[cid];
        if (V && Array.isArray(V.tokens)) V.tokens = V.tokens.map(t => { const a = String(t).split(',').map(Number); return a.length === 3 && a.every(isFinite) && v.yer && Math.abs(a[0] + d[0] - v.yer[0]) < 1e-3 && Math.abs(a[1] + d[1] - v.yer[1]) < 1e-3 ? [v.yer[0], v.yer[1], a[2]].map(x => (+x).toFixed(6)).join(',') : t; }); } }
    const gvB = 'MIM_BOLGE_' + Date.now().toString(36); st.gvs.push(gvB); C.std && C.std('YAZI');
    const t = C.add(C.newEnt('text', { p: [Y.x0, Y.yUst - baslikH, 0], h: baslikH, s: 'MİMARİ', al: 'L', layer: 'YAZI', gv: gvB, ann: false })); if (t) delete t.sp;
    B.Mimari = { x0: Y.x0, yUst: Y.yUst, w: Z.w, h: Z.h + baslikH * 3 };
  };
  /* ölçek seçimi için tahmini çizim boyları (model m) ve açıklama payları (kâğıt mm): plan (ölçü sıraları + aks balonu ≈ 41 mm her yanda, başlık 15 mm),
     kesit (ölçüler ve kotlar ≈ 30 mm, başlık 15 mm) — ölçek çizimden önce seçilir (yazı, ölçü ve kotlar o ölçekte çizilir) */
  const olcekTahmin = () => {
    const { ents } = kapsam(); if (!ents.length) return null; const bb = C.extents(ents), [zmin, zmax] = zAralik(ents); if (!bb || !isFinite(zmin)) return null;
    const lx = bb[2] - bb[0], ly = bb[3] - bb[1], uz = Math.max(lx, ly);
    return olcekSec([{ id: 'plan', w: lx, h: ly, kenarMm: 41, altMm: 15 }, { id: 'kesit', w: uz, h: zmax - zmin, kenarMm: 30, altMm: 15 }], { antetW: antetGen() });
  };
  const yapiAdi = u => up((u && (u.name || u.ad || u.code)) || (C.doc.set.name && !/^ads[ıi]z/i.test(C.doc.set.name) ? C.doc.set.name : '') || 'YAPI');

  /* ======================= PAFTALAR ======================= */
  const antetGen = () => { const tb = C.doc.set.titleBlock || C.defaultTitleBlock; return tb && tb.ents && tb.ents.length && !tb.full ? tb.bb[2] - tb.bb[0] : 0; };
  C.antetGen = antetGen; // öbür disiplinlerin otomatik paftalaması için (mt-pafta.js)
  /* bloklar: [{ gv, w, h (kâğıt mm), bb, sc, v }] → bir ya da birkaç pafta (genişlik en çok 1,8 × standart; sonra yeni pafta) */
  let paftaNo = 0;
  const AYRI_PAFTA = ['KESİTLER', 'GÖRÜNÜŞLER']; // kesit ve görünüş paftaları ayrı (kullanıcı 14.11.2026); detaylar plan ya da detay paftasında
  /* bloklar: [{ gv, w, h (kâğıt mm), bb, sc, v, grup }] → en az kâğıt yerleşimi (enAzKagit) → paftalar; pafta adı içindeki grupların adı */
  const paftaKur = (key, yapi, bloklar, ozelAd) => {
    const bl = bloklar.filter(Boolean); if (!bl.length) return [];
    const byId = new Map(bl.map(b => [b.gv, b])), Y = enAzKagit(bl.map(b => ({ id: b.gv, w: b.w, h: b.h, grup: b.grup })), { antetW: antetGen(), ayri: AYRI_PAFTA });
    return Y.paftalar.map((P, i) => {
      const no = String(++paftaNo).padStart(2, '0'), adN = (ozelAd || P.gruplar.join(', ')) + (ozelAd && Y.paftalar.length > 1 ? ` (${i + 1}/${Y.paftalar.length})` : '');
      const gp = C.grpCur; C.grpCur = 'Mimari'; const L = C.newLayout(`MİMARİ-${no} ${adN}`, P.kagit, 'L'); C.grpCur = gp;
      Object.assign(L, { grp: 'Mimari', mimPafta: key + (i + 1), size: 'OZEL', pw: P.pw, ph: P.ph, orient: 'L', noTitle: false, margin: Object.assign({}, PAFTA_R2.kenar), antetSutun: P.antet, kagit: P.kagit });
      L.f = Object.assign(L.f || {}, { proje: L.f.proje || C.doc.set.name || '', baslik: `${yapi} — ${adN}`, no: `MİM-${no}` });
      L.vps = P.ids.map(id => { const b = byId.get(id), q = P.yer[id]; return Object.assign({ x: q[0], y: q[1], w: b.w, h: b.h, cx: (b.bb[0] + b.bb[2]) / 2, cy: (b.bb[1] + b.bb[3]) / 2, scale: b.sc, gvOnly: b.gv, frame: { on: false }, lock: true, disiplin: 'Mimari' }, b.v ? { gorunum: b.v.id } : {}, b.ana ? { ana: true } : {}); }); // ana: plan / kesit / görünüş penceresi — antette ana ölçek (pafta-liste.js)
      L.f.olcek = C.paftaOlcekYazisi ? C.paftaOlcekYazisi(L) : [...new Set(P.ids.map(id => byId.get(id).sc))].map(s => '1/' + s).join(', '); // antet canlı (layout.js); burada kayıt için
      if (P.tasan.length) C.warn(`${L.name}: ${P.tasan.length} çizim pafta yüksekliğine (${P.ph} mm) sığmıyor; paftada kırpılır.`);
      return L;
    });
  };
  /* antet sütunu: düşey ayırma çizgisi (Çokal R2: iç çerçevenin sağından 200 mm), kalınlığı kural tablosundaki "Antet Kalın" katmanından.
     Kullanıcı antet yüklemediyse programın varsayılan anteti (180 mm) sütun genişliğine (200 mm) orantılı büyütülür, sağ alt köşesi sabit:
     sütunda boşluk kalmaz. Yüklenen antete dokunulmaz (sütun en az onun genişliğinde). */
  const antetKalin = () => { const k = C.cizimKural && C.cizimKural.MIMARI && C.cizimKural.MIMARI.katmanlar['Antet Kalın']; return k ? Math.round(k.kal * 100) : 40; };
  const VARSAYILAN_ANTET = 180; // app/entities.js T.sheet (bw)
  if (C.titlePrims && !C._mimPaftaTP) { const tp0 = C.titlePrims; C._mimPaftaTP = true;
    C.titlePrims = L => { const out = tp0(L); if (!L || !(L.mimPafta || L.disPafta)) return out; const fr = C.layoutFrame(L), A = L.antetSutun || PAFTA_R2.antetSutun, x = fr.x1 - A; // disPafta: öbür disiplinlerin otomatik paftaları (Mekanik: mt-pafta.js) aynı antet sütunuyla
      const tb = C.doc.set.titleBlock || C.defaultTitleBlock;
      if (!(tb && tb.ents && tb.ents.length)) { const sk = A / VARSAYILAN_ANTET, X = q => [fr.x1 - (fr.x1 - q[0]) * sk, fr.y0 + (q[1] - fr.y0) * sk, q[2] || 0];
        out.forEach((pr, i) => { if (i < 2) return; if (pr.a) { pr.a = X(pr.a); pr.b = X(pr.b); } if (pr.pts) pr.pts = pr.pts.map(X); if (pr.p) pr.p = X(pr.p); if (pr.c) pr.c = X(pr.c); if (pr.h) pr.h *= sk; if (pr.r) pr.r *= sk; }); }
      out.push(C.prim.L([x, fr.y0, 0], [x, fr.y1, 0], { lw: antetKalin() })); return out; }; }

  /* MIMARIPAFTA: ölçek seçimi → görünüşler → paftalar (Çokal R2 sırası):
       01 KAT PLANLARI (+ mahal listesi) · 02 KESİTLER (+ malzeme açılımı) · 03 GÖRÜNÜŞLER (ön + arka üstte, sağ + sol altta)
       04 ÇATI PLANI, KESİTİ VE DETAYLARI · 05 KAPI VE PENCERE DETAYLARI (1/20) · 06 KORKULUK VE KAPAK DETAYLARI (1/20, kenar 1/5) */
  const MIMARIPAFTA = async () => {
    const os = olcekTahmin() || { olcek: PAFTA_R2.olcek, kagit: 'A1', oranA1: 0, esik: OLCEK_ESIK, neden: '' }, SC = os.olcek;
    try { if (C.cizimKuralUygula) C.cizimKuralUygula(); } catch (er) { console.error('çizim kuralı', er); } // eski projelerin mimari kural katmanları (çizgi tipi _M desenleri dahil)
    const anno0 = C.doc.set.anno, lt0 = C.doc.set.ltscale; C.doc.set.anno = SC; let r;
    try { r = await uret(SC); } finally { C.doc.set.anno = anno0; C.doc.set.ltscale = lt0; }
    if (!r) return null; const olc = (gv, sc) => (gv ? blokOlc(gv, sc || SC) : null), ileV = (b, v) => { if (b && v) b.v = v; return b; };
    const pl = r.planlar.map(p => olc(p.gv)), kes = r.kes.map(v => ileV(olc(v.gv), v)), mah = olc(r.mahGv);
    const g = r.gor, gb = { ON: olc(g.ON), ARKA: olc(g.ARKA), SAG: olc(g.SAG), SOL: olc(g.SOL) };
    const sb = b => { if (b) b.sc = b.sc || SC; return b; }; [...pl, ...kes, mah, gb.ON, gb.ARKA, gb.SAG, gb.SOL].forEach(sb);
    [...pl, ...kes, gb.ON, gb.ARKA, gb.SAG, gb.SOL].forEach(b => { if (b) b.ana = true; }); /* ana çizimler: antette ölçek sırası önce bunların ölçeği */
    const det = (L) => (L || []).map(d => { const b = olc(d.gv, d.sc); if (b) b.sc = d.sc; return b; });
    const paf = []; paftaNo = 0; const kgt = os.kagit;
    const G = (b, grup) => { if (b) b.grup = grup; return b; };
    /* en az kâğıt (firma kuralı 14.11.2026): aynı tür görünümler bir arada, boşluklara öbür türler; çatı ayrı paftada (kullanıcı isteği), çatı detayları onun boşluğunda */
    const ana = [...pl.map(b => G(b, 'KAT PLANLARI')), G(mah, 'KAT PLANLARI'), ...kes.map(b => G(b, 'KESİTLER')), G(sb(ileV(olc(r.acGv), r.acV)), 'KESİTLER'),
      ...[gb.ON, gb.ARKA, gb.SAG, gb.SOL].map(b => G(b, 'GÖRÜNÜŞLER')), ...det(r.detay.dograma).map(b => G(b, 'KAPI VE PENCERE DETAYLARI')),
      ...det(r.detay.korkuluk).map(b => G(b, 'KORKULUK DETAYI')), ...det(r.detay.kapak).map(b => G(b, 'SAC KAPAK DETAYLARI'))];
    paf.push(...paftaKur('M', r.yapi, ana));
    const cd = (r.cati.detaylar || [r.cati.detay]).map(gv => { const b = olc(gv, 10); if (b) b.sc = 10; return b; });
    const anaB = b => { if (b) b.ana = true; return b; };
    paf.push(...paftaKur('C', r.yapi, [anaB(sb(olc(r.cati.plan))), ...(r.cati.kesitler || []).map(v => anaB(sb(olc(v.gv)))), ...cd].map(b => G(b, 'ÇATI')), 'ÇATI PLANI, KESİTLERİ VE DETAYLARI'));
    const alan = Math.round(paf.reduce((s, L) => s + L.pw * L.ph, 0) / 1e4) / 100;
    tekKopya();
    try { eskiKesitTemizle(r.kapsamBB); } catch (er) { console.error('kullanılmayan kesit temizliği', er); }
    try { C.bolgeDuzenle({ sessiz: true }); } catch (er) { console.error('bölge düzeni', er); } // bütün disiplinlerin bölgeleri ayrık (statik / mekanik çizimleri dahil)
    { const s = C.doc.set; s.grups = s.grups || ['Mimari', 'Mekanik', 'Statik', 'Elektrik', 'Genel']; if (!s.grups.includes('Mimari')) s.grups.unshift('Mimari'); }
    Object.assign(durum(), { t: Date.now(), olcek: SC, kagit: kgt, oranA1: os.oranA1, alan }); C.changed(); C.emit('layouts');
    return { paf, r, olcek: os, alan };
  };
  /* hiçbir pafta penceresinde görünmeyen eski kesitleri sil (kullanilmayanKesitler): canlı KESITAL kayıtları ve disiplin kesit görünümleri — görünüm nesneleri,
     canlı kaydı ve plandaki kesit işareti birlikte. MIMARIPAFTA komutunun içinde: geri al (U) hepsini geri getirir. Silinenler komut satırına yazılır. */
  const eskiKesitTemizle = kbb => { /* kbb: MIMARIPAFTA seçimle (tek yapı) çalıştıysa o yapının plan kutusu — temizlik yalnız onu kesen kesitlerde */
    const set = C.doc.set, can = set.canli || {}, GA = C.gorunumApi, VLs = GA ? GA.liste() : [], vpGv = [], pencereler = [];
    for (const L of C.doc.layouts || []) for (const vp of L.vps || []) { if (vp.gvOnly) vpGv.push(vp.gvOnly); else if (vp.scale > 0 && !(vp.g3 || vp.mtG3 || vp.mtPlan)) { const k = vp.scale / 1000; pencereler.push([vp.cx - vp.w / 2 * k, vp.cy - vp.h / 2 * k, vp.cx + vp.w / 2 * k, vp.cy + vp.h / 2 * k]); } }
    const gvsOf = pred => [...new Set(C.doc.ents.filter(pred).map(e => e.gv).filter(g => typeof g === 'string'))];
    const bbOf = gvs => { const S = new Set(gvs), L = C.doc.ents.filter(e => S.has(e.gv) && e.type !== 'kesitisaret'); L.forEach(e => { delete e._c; }); return L.length ? C.extents(L) : null; };
    const VK = VLs.filter(v => v.tip === 'kesit'), vGv = new Set(VK.flatMap(v => GA.tumGv(v)));
    const kayit = [];
    const kapsamda = v => !kbb || !!(v && v.a && v.b && kesiyorMu(v, kbb)); /* hattı bilinmeyen kayıt seçimle çalışırken silinmez */
    for (const v of VK) { if (!kapsamda(v)) continue; const g = GA.tumGv(v); kayit.push({ id: 'G:' + v.id, kind: 'kesit', gvs: g, bb: bbOf(g), elle: !!v.elle, ad: v.ad || v.nm }); }
    for (const [cid, r] of Object.entries(can)) { if (!r || !(r.kind === 'kesit' || (r.kind === 'plan' && r.cmd === 'KOTPLANI'))) continue; const g = gvsOf(e => e.canli === cid); if (g.some(x => vGv.has(x))) continue; if (kbb && !(r.a && r.b && kesiyorMu(r, kbb))) continue; /* seçimle: yalnız bu yapıyı kesen canlı kesit */ /* disiplin görünümünün canlı kaydı: görünümle birlikte */ kayit.push({ id: 'C:' + cid, kind: r.kind, gvs: g, bb: bbOf(g), elle: !!r.elle, ad: r.ad || cid }); }
    const sil = new Set(kullanilmayanKesitler(kayit, { vpGv, pencereler })); if (!sil.size) return 0;
    const adlar = [], gs = new Set(), cids = new Set();
    for (const q of kayit) { if (!sil.has(q.id)) continue; adlar.push(q.ad); q.gvs.forEach(g => gs.add(g));
      if (q.id.startsWith('C:')) cids.add(q.id.slice(2)); else { const v = VK.find(x => 'G:' + x.id === q.id); if (v) { GA.sil(v); const i = VLs.indexOf(v); if (i >= 0) VLs.splice(i, 1); for (const e of C.doc.ents) if (e.canli && gs.has(e.gv)) cids.add(e.canli); } } }
    const n0 = C.doc.ents.length; C.doc.ents = C.doc.ents.filter(e => !(e.gv && gs.has(e.gv)) && !(e.canli && cids.has(e.canli))); for (const c of cids) delete can[c];
    C.log(`Hiçbir paftada kullanılmayan ${adlar.length} eski kesit / kot planı silindi (${n0 - C.doc.ents.length} nesne, plandaki işaretleri dahil; geri almak için U): ${adlar.join(', ')}.`);
    return adlar.length; };
  /* Mimari grubunda her kesit / tablo bir kez: MİMARİ paftalarındaki görünümler (gorunum kimliği) öbür Mimari paftalarından
     (KESITPAFTA / ACILIMTABLO'nun açtığı "MİMARİ — KESİTLER n") kaldırılır, boşalan kesit paftası silinir. Sonradan çalışan
     KESITPAFTA / ACILIMTABLO aynı kimliği MİMARİ-02'de bulur ve yalnız günceller (gorunumler.js → paftayaKoy). */
  const tekKopya = () => { C.doc.layouts = tekKopyaYap(C.doc.layouts || [], g => /MIMAR/.test(C.ascii(up(g)))); };
  C.mimariTekKopya = tekKopya;
  /* öbür disiplinlerin üreticileri için genel bölge yeri (Tasarım alanı): C.disiplinBolgesi('Mekanik', w, h) → { x0, yUst } ve kaydı (doc.set.bolgeler) */
  C.disiplinBolgesi = (dis, w, h) => { const set = C.doc.set, B = set.bolgeler = set.bolgeler || {}, model = C.extents(C.doc.ents.filter(e => !e.gv && e.type !== 'sheet')); const Y = bolgeYeri(model, B, dis, +w || 0, +h || 0); B[dis] = { x0: Y.x0, yUst: Y.yUst, w: +w || 0, h: +h || 0 }; return Y; };
  /* BÖLGE DÜZENİ uygulaması (BOLGEDUZENLE; MIMARIPAFTA sonunda ve statik / mekanik pafta üreticilerinden sonra kendiliğinden):
     birimler = görünüm grupları (gv) + paftaya ait gevşek çizimler (mekanik şemaları, pencere başına bir birim). Disiplin: Mimari çıktısı → Mimari;
     disiplin kesitinin türü (MIMARI → Mimari, GIZLI → Mekanik, DUZ → Statik); paftasının grubu; STATIK_ / MT öneki; yoksa Genel.
     Modelin üstüne çizilen katmanlar (tesisat planı sembolleri, plan kesit işaretleri) yerinde kalır. Taşınan birimin pafta pencereleri (gvOnly ya da
     pencere ortası birimin içinde), disiplin kesitinin yeri (v.yer / v.yerD — yeniden üretimde aynı yere) ve canlı görünüm kaydı birlikte kayar. */
  const TUR_DIS = { MIMARI: 'Mimari', GIZLI: 'Mekanik', DUZ: 'Statik' }, GEVSEK = /^(mtsema)$/;
  C.bolgeDuzenle = (o = {}) => {
    const set = C.doc.set, ents = C.doc.ents, lays = C.doc.layouts || [], GA = C.gorunumApi, VLs = GA ? GA.liste() : (set.gorunumler || []);
    const is3d = e => !e.gv && C.T[e.type] && (C.T[e.type].mesh || C.T[e.type].meshes);
    const bbOf = L => { L.forEach(e => { delete e._c; }); const b = L.length ? C.extents(L) : null; return b && b.every(isFinite) ? b : null; };
    const yapi = bbOf(ents.filter(is3d)); const icinde = (b, a, p = 0.5) => a && b && b[0] < a[2] + p && b[2] > a[0] - p && b[1] < a[3] + p && b[3] > a[1] - p;
    const pen = (vp) => { if (!vp || vp.gvOnly || vp.g3 || vp.mtG3 || vp.mtPlan || !(vp.scale > 0)) return null; const k = 1000 / vp.scale; return [vp.cx - vp.w / 2 / k, vp.cy - vp.h / 2 / k, vp.cx + vp.w / 2 / k, vp.cy + vp.h / 2 / k]; };
    // disiplin kaynakları
    const disOf = new Map(), mim = new Set((set.mimPafta && set.mimPafta.gvs) || []);
    for (const v of VLs) { const T = GA && GA.turler ? GA.turler(v) : ['DUZ']; if (v.gv) disOf.set(v.gv, v.tip === 'kesit' ? (TUR_DIS[T[0]] || 'Statik') : ((v.gruplar || [])[0] || 'Genel')); for (const [k, g] of Object.entries(v.gvD || {})) disOf.set(g, TUR_DIS[k] || 'Statik'); }
    for (const L of lays) for (const vp of L.vps || []) if (vp.gvOnly && !disOf.has(vp.gvOnly) && L.grp && L.grp !== 'Genel') disOf.set(vp.gvOnly, L.grp);
    // birimler
    const G = new Map(), baslik = []; for (const e of ents) { if (!e.gv || typeof e.gv !== 'string') continue; if (/^(MIM_)?BOLGE_/.test(e.gv)) { baslik.push(e); continue; } if (!G.has(e.gv)) G.set(e.gv, []); G.get(e.gv).push(e); }
    const birim = [], sabit = [], uyeler = new Map();
    for (const [gv, L] of G) { const ciz = L.filter(e => e.type !== 'kesitisaret'), b = bbOf(ciz); if (!b) continue;
      if (icinde(b, yapi)) { sabit.push(b); continue; } // modelin üstüne çizilmiş (tesisat planı sembolleri vb.)
      let dis = mim.has(gv) ? 'Mimari' : disOf.get(gv) || (/^STATIK_/.test(gv) ? 'Statik' : /^MT/.test(gv) ? 'Mekanik' : null);
      if (!dis) { const c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; for (const Ly of lays) for (const vp of Ly.vps || []) { const w = pen(vp); if (!dis && w && Ly.grp && Ly.grp !== 'Genel' && c[0] > w[0] && c[0] < w[2] && c[1] > w[1] && c[1] < w[3]) dis = Ly.grp; } }
      birim.push({ id: gv, dis: dis || 'Genel', bb: b }); uyeler.set(gv, L); } // planın kesit işaretleri (planIsaret) kutuya girmez ama planla birlikte kayar (denetim 14.11.2026: Bekçi planında işaretler planın dışında kalıyordu, Konya'da başlık balona biniyordu)
    // gevşek pafta çizimleri: aynı pencerede görünenler bir birim
    const gev = ents.filter(e => !e.gv && GEVSEK.test(e.type)), kul = new Set();
    lays.forEach((Ly, li) => (Ly.vps || []).forEach((vp, vi) => { const w = pen(vp); if (!w) return; const L = gev.filter(e => !kul.has(e) && (() => { const b = bbOf([e]); return b && b[0] < w[2] && b[2] > w[0] && b[1] < w[3] && b[3] > w[1]; })()); if (!L.length) return;
      L.forEach(e => kul.add(e)); const id = `W${li}_${vi}`; birim.push({ id, dis: Ly.grp && Ly.grp !== 'Genel' ? Ly.grp : (L[0].dis || 'Mekanik'), bb: bbOf(L) }); uyeler.set(id, L); }));
    for (const e of gev) if (!kul.has(e)) { const id = 'E' + e.id; birim.push({ id, dis: e.dis || 'Mekanik', bb: bbOf([e]) }); uyeler.set(id, [e]); }
    // yerinde kalan: görünüm olmayan çizim (gevşek pafta çizimleri hariç) + modelin üstündeki katmanlar
    const kalan = bbOf(ents.filter(e => !e.gv && e.type !== 'sheet' && !GEVSEK.test(e.type))), Mb = [kalan, yapi, ...sabit].filter(Boolean);
    const model = Mb.length ? [Math.min(...Mb.map(b => b[0])), Math.min(...Mb.map(b => b[1])), Math.max(...Mb.map(b => b[2])), Math.max(...Mb.map(b => b[3]))] : [0, 0, 0, 0];
    const P = bolgeDuzeniPlanla(birim, model, o);
    // kesitlerin tür yerleri: ana görünüm taşınmadan önce öbür türlerin yeri sabitlenir
    for (const v of VLs) if (v.gvD && v.yer) { v.yerD = v.yerD || {}; for (const k of Object.keys(v.gvD)) if (!v.yerD[k]) v.yerD[k] = v.yer.slice(); }
    let n = 0;
    for (const q of birim) { const d = P.tasi[q.id]; if (!d) continue; n++; const X = C.xMove([d[0], d[1], 0]), L = uyeler.get(q.id), ob = q.bb;
      for (const e of L) { C.xform(e, X); delete e._c; }
      for (const Ly of lays) for (const vp of Ly.vps || []) { const w = pen(vp); if (vp.gvOnly === q.id || (!vp.gvOnly && w && vp.cx > ob[0] - 1e-6 && vp.cx < ob[2] + 1e-6 && vp.cy > ob[1] - 1e-6 && vp.cy < ob[3] + 1e-6)) { vp.cx += d[0]; vp.cy += d[1]; } }
      for (const v of VLs) { if (v.gv === q.id && v.yer) v.yer = [v.yer[0] + d[0], v.yer[1] + d[1], v.yer[2] || 0]; for (const [k, g] of Object.entries(v.gvD || {})) if (g === q.id && v.yerD && v.yerD[k]) v.yerD[k] = [v.yerD[k][0] + d[0], v.yerD[k][1] + d[1], v.yerD[k][2] || 0]; }
      const cids = new Set(L.map(e => e.canli).filter(Boolean)); for (const cid of cids) { const V = set.canli && set.canli[cid]; if (!V || !Array.isArray(V.tokens)) continue;
        V.tokens = V.tokens.map(t => { const a = String(t).split(',').map(Number); return a.length === 3 && a.every(isFinite) && a[0] > ob[0] - 2 && a[0] < ob[2] + 2 && a[1] > ob[1] - 2 && a[1] < ob[3] + 2 && !icinde([a[0], a[1], a[0], a[1]], yapi, 0) ? [a[0] + d[0], a[1] + d[1], a[2]].map(x => (+x).toFixed(6)).join(',') : t; }); } }
    // bölge başlıkları (disiplin adı) yeniden
    const bs = new Set(baslik); C.doc.ents = C.doc.ents.filter(e => !bs.has(e)); C.std && C.std('YAZI');
    for (const b of P.basliklar) { const t = C.add(C.newEnt('text', { p: [b.p[0], b.p[1], 0], h: o.baslikH || 1.5, s: upTR(b.dis) /* Türkçe saklanır (sözlük anahtarı MİMARİ); proje dili İngilizce ise çizimde C.txL çevirir (DIL.t + tr büyük harf "ARCHİTECTURE" yazıyordu) */, al: 'L', layer: 'YAZI', gv: 'BOLGE_' + C.ascii(upTR(b.dis)), ann: false })); if (t) delete t.sp; }
    set.bolgeler = P.bolgeler; C.changed(); if (!o.sessiz) C.emit('layouts');
    return { tasinan: n, birim: birim.length, bolgeler: P.bolgeler };
  };
  /* disiplin bölgeleri çakışıyor mu (denetim): her bölgenin birimleri ve bölge kutuları */
  C.bolgeCakisma = () => { const B = Object.entries(C.doc.set.bolgeler || {}), out = []; for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const [a, p] = B[i], [b, q] = B[j]; if (p.x0 < q.x0 + q.w && p.x0 + p.w > q.x0 && p.yUst - p.h < q.yUst && p.yUst > q.yUst - q.h) out.push([a, b]); } return out; };
  C.addCommand(['BOLGEDUZENLE', 'DUZENLE', 'DISIPLINBOLGE'], 'Tasarım alanını düzenler: Mimari, Mekanik, Elektrik, Statik çizimleri (plan, kesit, görünüş, detay, şema) modelin sağında kendi bölgelerine taşınır, başlarına disiplin adı yazılır; paftalardaki pencereler aynı çizimi göstermeye devam eder.', () => {
    const r = C.bolgeDuzenle(); C.log(`Bölge düzeni: ${r.tasinan} / ${r.birim} çizim taşındı · bölgeler: ${Object.entries(r.bolgeler).map(([d, b]) => `${d} (${Math.round(b.w)}×${Math.round(b.h)} m)`).join(', ') || '—'}.`); setTimeout(() => C.emit('zoomExtents'), 50); });
  /* pafta üreten öbür komutlardan sonra bölge düzeni kendiliğinden (statik DSİ paftaları, tesisat paftaları, ısı yalıtım detayı, disiplin kesiti):
     yeni çizimler kendi disiplin bölgesine geçer, öbür bölgelere binmez */
  const bolgeSar = () => { for (const ad of ['STATIKCIZ', 'TESISATPAFTA', 'ISIYALITIMDETAY', 'KESITPAFTA', 'GORUNUMPAFTA', 'MEKTABLO', 'ACILIMTABLO', 'ISTASYONPAFTA']) { const d = C.cmds && C.cmds[ad]; if (!d || d._bolge) continue; const f0 = d.fn; d._bolge = true;
    d.fn = async function () { const r = await f0.apply(this, arguments); try { C.bolgeDuzenle({ sessiz: true }); C.emit('layouts'); } catch (er) { console.error('bölge düzeni', er); } return r; }; } };
  setTimeout(bolgeSar, 0); if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('load', bolgeSar); // sonra yüklenen modüllerin komutları (mt-ek.js TESISATPAFTA): betikler ayrı ayrı yüklenirken setTimeout onlardan önce çalışabiliyor
  C.mimariPaftalari = MIMARIPAFTA;
  /* AutoCAD çıktısı (Mimari grubu, 2B): çizgi tipi ölçeği seçilen pafta ölçeğine göre (dxfCizgiOlcegi); öbür disiplinlerin çıktısına dokunulmaz */
  if (C.dxfWrite && !C._mimLtSarili) { C._mimLtSarili = true; const w0 = C.dxfWrite;
    C.dxfWrite = function (opts = {}) { const st = C.doc && C.doc.set && C.doc.set.mimPafta;
      if (!opts || opts.plain !== '2b' || !opts.grp || !/M[İI]MAR[İI]/i.test(opts.grp) || !st || !st.olcek || opts.ltscale != null) return w0.apply(this, arguments);
      /* Mimari desenleri (kâğıt mm; cizim-kural-uygula.js → '<AD>_M') bu çıktıda asıl adlarıyla (HIDDEN, CENTER2 …) yazılır; çıktıdan sonra genel desenler geri gelir */
      const D = C.mimariLtDesen ? C.mimariLtDesen() : {}, eski = {};
      for (const [n, p] of Object.entries(D)) { eski[n] = C.LT[n]; C.LT[n] = Object.assign({}, C.LT[n] || { d: n }, { p: p.slice() }); }
      try { return w0.call(this, Object.assign({}, opts, dxfCizgiOlcegi(st.olcek))); } finally { for (const n of Object.keys(eski)) { if (eski[n]) C.LT[n] = eski[n]; else delete C.LT[n]; } } }; }

  C.addCommand(['MIMARIPAFTA', 'MIMARICIZ', 'MIMPAFTA'], 'Seçili yapının (seçim yoksa bütün modelin) mimari paftalarını "Mimari" grubuna hazırlar (Çokal R2 düzeni): ölçek bina ebatına göre (1/50; çok küçükse 1/25, A0\'a sığmazsa 1/100); kat planları ve mahal listesi; A-A / B-B / C-C kesitleri ve malzeme açılımı; görünüşler; çatı planı, çatı kesiti ve çatı detayları; kapı / pencere detayları (1/20); korkuluk ve sac kapak detayları. Antet: yüklediğiniz antet. Model değişince yeniden çalıştırın.', async () => {
    const res = await MIMARIPAFTA(); if (!res) return;
    if (!res.paf.length) { C.warn('Mimari pafta üretilemedi (görünüş çıkmadı).'); return; }
    const L0 = res.paf[0]; C.layoutIdx = C.doc.layouts.indexOf(L0); C.grpCur = 'Mimari'; C.setView('layout'); C.emit('layouts'); setTimeout(() => { try { C.views.lay.zoomExtents(); } catch (er) { } }, 60);
    const yeniKes = res.r.kes.filter(v => v.kaynak === 'MIMARIPAFTA').length, d = res.r.detay;
    C.log(`Mimari paftalar hazır (${res.paf.length} pafta, ${String(res.alan).replace('.', ',')} m² kâğıt), ölçek 1/${res.olcek.olcek} (${res.olcek.neden}): ${res.paf.map(L => `${L.name} (${L.kagit || ''} ${Math.round(L.pw)}×${L.ph} mm)`).join(' · ')} — ${res.r.planlar.length} kat planı, ${res.r.kes.length} kesit${yeniKes ? ` (${yeniKes} yeni)` : ''}${res.r.acGv ? ', malzeme açılımı' : ''}${res.r.mahGv ? ', mahal listesi' : ''}${res.r.cati.kesitler && res.r.cati.kesitler.length ? `, ${res.r.cati.kesitler.length} çatı kesiti` : ''}${res.r.cati.detay ? ', çatı detayları' : ''}, ${d.dograma.length} kapı / pencere detayı, ${d.korkuluk.length} korkuluk detayı${d.kapakTip ? `, ${d.kapakTip.length} sac kapak tipi` : ''}${res.r.kesitBilgi ? ` · kesit yerleri: ${res.r.kes.map(v => `${v.nm}-${v.nm}${v.mahaller && v.mahaller.length ? ' (' + v.mahaller.join(', ') + ')' : ''}`).join(', ')}` : ''}${res.r.cakisma && res.r.cakisma.length ? ` · UYARI: ${res.r.cakisma.length} ölçü başka bir ölçü ya da yazıyla çakışıyor` : ''}. Antet: ${antetGen() || (C.doc.set.titleBlock || C.defaultTitleBlock) ? 'yüklediğiniz antet' : 'varsayılan (kendi antetiniz için Pafta › Antet yükle)'}.`);
  });

  /* KESİT SEMBOLÜ (kullanıcı isteği 14.11.2026): Mimari şeridinden seçilir, projeye kaydedilir (doc.set.kesitSembol; eski projede seçilmemişse bugünkü sembol),
     MIMARIPAFTA ve elle alınan kesitlerin işaretleri bunu kullanır; seçim değişince mevcut işaretler güncellenir. Seçenekler: app/kesitstil.js → C.KESIT_SEMBOLLER */
  C.addCommand(['KESITSEMBOL', 'KESITSEMBOLU'], 'Kesit sembolü: plandaki kesit işaretinin sembolünü önizlemeli listeden seçer (Çokal R2 dahil); projeye kaydedilir, mevcut kesit işaretleri güncellenir.', async () => {
    const L = C.KESIT_SEMBOLLER || [], cur = C.doc.set.kesitSembol || (C.pstil && C.pstil() ? 'okdaire' : (C.kesitStil ? C.kesitStil().sym : 'ucgendaire'));
    const b = C.modal('Kesit sembolü', `<p class="hint" style="margin:0 0 8px">Seçilen sembol projeye kaydedilir; plandaki bütün kesit işaretleri ve yeni alınacak kesitler bu sembolle çizilir.</p>
      <div id="ksbGal" style="display:grid;grid-template-columns:repeat(2,minmax(160px,1fr));gap:8px"></div>
      <div class="bar" style="justify-content:flex-end"><button id="ksbIptal">İptal</button><button id="ksbOk" class="pri">Uygula</button></div>`);
    let sec = cur; const gal = b.querySelector('#ksbGal');
    const ciz = () => { gal.innerHTML = L.map(([v, t]) => `<button type="button" data-s="${v}" title="${t}" style="display:flex;flex-direction:column;gap:4px;padding:6px;border-radius:6px;border:1px solid ${sec === v ? '#5fd3e6' : '#33404f'};background:${sec === v ? '#24364d' : '#1b2430'};color:inherit;text-align:left">${C.kesitOnizle ? C.kesitOnizle(v, 'tam') : ''}<span style="font-size:11.5px">${t}</span></button>`).join('');
      gal.querySelectorAll('button[data-s]').forEach(x => { x.onclick = () => { sec = x.dataset.s; ciz(); }; }); };
    ciz();
    await new Promise(res => { let bitti = false; const son = () => { if (bitti) return; bitti = true; clearInterval(tm); C.closeModal(); res(); };
      b.querySelector('#ksbIptal').onclick = son;
      b.querySelector('#ksbOk').onclick = () => { if (C.begin) C.begin(); C.doc.set.kesitSembol = sec; if (C.kesitStil) C.kesitStil().sym = sec; let n = 0;
        for (const e of C.doc.ents) if (e.type === 'kesitisaret') { e.sym = sec; delete e._c; n++; }
        C.changed(); C.emit('layouts'); C.log(`✓ Kesit sembolü: ${(L.find(q => q[0] === sec) || [0, sec])[1]} · ${n} kesit işareti güncellendi.`); son(); };
      const tm = setInterval(() => { const m = document.querySelector('#modal'); if (m && m.classList.contains('hidden')) son(); }, 300); });
  });

  /* ======================= ŞERİT: "Mimari" sekmesi ======================= */
  const B = (cmd, t, i) => ({ cmd, t, i, big: true }), s = (cmd, t, i) => ({ cmd, t, i });
  const serit = () => {
    const Rb = C.ribbon; if (!Rb || !Array.isArray(Rb.tabs)) return false;
    if (Rb.tabs.some(t => t[0] === 'Mimari')) return true;
    const var_ = b => !!(C.cmds && C.cmds[b.cmd.split(' ')[0]]);
    const paneller = [
      ['Pafta', [B('MIMARIPAFTA', 'Mimari paftalar', 'print'), B('MIMARIDXF', 'Paftaları DXF kaydet', 'sheet'), B('DISIPLINDXF', 'Disiplin DXF dosyaları (her biri ayrı)', 'sheet'), s('BOLGEDUZENLE', 'Bölgeleri düzenle', 'array'), s('YAGMUROLUGU', 'Yağmur oluğu', 'pipe'), s('INISBORUSU', 'İniş borusu', 'pipe'), s('KESITPAFTA', 'Kesit → disiplinler', 'cut'), s('KESITSEMBOL', 'Kesit sembolü', 'cut'), s('GORUNUMGUNCELLE', 'Kesitleri güncelle', 'undo'), s('ACILIMTABLO', 'Açılım tablosu', 'table'), s('PAFTALISTESI', 'Pafta listesi', 'table'), s('PERSPEKTIFPAFTA', '3B görünüş', 'iso')]],
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
    ['Malzeme açılımı', 'Material callout'], ['Açılım stili', 'Callout style'], ['Antet ve stil', 'Title block and style'], ['Pafta', 'Sheet'], ['Mahal', 'Room'], ['Açılım', 'Callout'], ['Güncelle', 'Update'], ['Kesit → disiplinler', 'Section → disciplines'], ['3B görünüş', '3D view'], ['Antet yükle', 'Load title block'], ['Disiplin DXF dosyaları (her biri ayrı)', 'Discipline DXFs (one file each)'], ['Bölgeleri düzenle', 'Arrange discipline zones'], ['MEKANİK', 'MECHANICAL'], ['STATİK', 'STRUCTURAL'], ['ELEKTRİK', 'ELECTRICAL'], ['GENEL', 'GENERAL'], ['Pafta stili', 'Sheet style'], ['Çizim kuralları', 'Drawing rules'], ['Kot planı', 'Level plan'], ['Görünüş', 'Elevation'],
  ]);
})(typeof window !== 'undefined' ? window.C : null);

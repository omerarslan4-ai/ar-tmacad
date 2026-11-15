/* ArıtmaCAD — TEK KİRİŞLİ GEZER KÖPRÜ VİNCİ (KREYN) AİLESİ, 1 … 10 t
   Kapasite seçilince teker çapı, baş kiriş (uç araba), halatlı ceraskal modeli, hızlar ve teker yükleri ona göre değişir.

   ÜRETİCİ VERİSİ (GH Cranes & Components, İspanya):
   [1] "Crane Components — End Carriages" kataloğu, 2022 (GH-10-End-carriages-2022-en.pdf, ghcranes.com/pdfs/catalogos):
       · teker seçim çizelgesi (tek kiriş): kapasite + açıklık → teker çapı ve teker aralığı.  ÇİZELGEDEN OKUNDU, YAKLAŞIK
         (katalog notu: "bilgi yaklaşıktır; kesin teker çapı hıza, işletme sınıfına ve ray genişliğine bağlıdır").
       · tek kiriş uç araba ölçü tablosu (Ø125 / 160 / 250 / 315): A1 teker aralığı, A2 toplam boy, A6 gövde eni, A7 ray üstü – gövde altı,
         A8 tampon, A9 gövde yüksekliği, A10 toplam yükseklik, A12 ray ekseninden motor ucuna, ağırlık (tek araba, kg).
       · şemadaki duvar boşluğu: ray ekseninden duvara 200 mm.
       · izin verilen en büyük teker yükü tablosu (daN; GGG70 teker, FEM M4, Rmin/Rmax = 0,35; ray en az S355): teker çapı × hız × ray genişliği K.
       · yürüme hızı seçenekleri 10 … 60 m/dk.
   [2] GHB11 föyü (1 – 6,3 t) ve [3] GHD13 föyü (2,5 – 12,5 t), son düzeltme 03.2021: ceraskal modeli, halat donanımı, kaldırma hızı,
       FEM sınıfı ve standart kanca yolları (H1, H2 …). Sürücülü kaldırmada yük ≤ %25 iken hız 1,6 katıdır.
   SW2 POMPA İSTASYONU (SW2_MIM_MEK_R3.dwg, kesit D-D; SW2/CR/001 "10 TONS"): ray açıklığı 5,65 m, ray 40×40 kare, ray üstü +6,04,
       guse üstü +5,60, zemin +0,70, kolon yüzleri arası 6,00 m, çatı kirişi altı +7,375, ıslak hacim tabanı −8,00.
       Köprü kirişi yüksekliği 320 mm ve kiriş altının ray üstünden 210 mm yukarıda olması bu kesitten ölçüldü.

   KABUL (katalogda bulunamadı — üretici teklifi gelince AİLE penceresinden düzeltin; 0 = otomatik):
       köprü kirişi kesiti ve birim ağırlığı, araba + ceraskal ağırlığı, kancanın kiriş altından en küçük mesafesi, kancanın raya en yakın
       yaklaşma mesafesi, elektrik donanımı ağırlığı, araba yürüme hızı. Teker yükleri bu kabullerle STATİK DENGEDEN hesaplanır
       (dinamik katsayı ve yatay kuvvet yoktur); katalog değeri değildir, yalnız izin verilen yük katalogdandır.

   Yerel eksenler: x = köprü açıklığı yönü (orijin iki rayın ortası), y = yürüme yolu yönü (0 … Ly), z = yerleşim kotundan yukarı.
   Yerleşim kotu (nesnenin z'si) = zemin döşemesi; ray üstü kotu = z + Hr.
   C.kreyn = { KAP, UC, IZIN, CER, ucAraba, ceraskal, hesap, sigma, statikYuk }  — saf fonksiyonlar, Node ile denenir (test/kreyn.test.js). */
(function (C) {
  'use strict';
  const G = 9.81, r1 = v => Math.round(v * 10) / 10, yuv = (v, a) => Math.round(v / a) * a;

  /* ---------- [1] teker seçim çizelgesi: kapasite → [açıklık üst sınırı (m), teker çapı] ---------- */
  const KAP = [1, 1.6, 2, 2.5, 3.2, 4, 5, 6.3, 8, 10];
  const TEKER = {
    1: [[24, 125], [30, 160]], 1.6: [[23, 125], [30, 160]], 2: [[22, 125], [30, 160]], 2.5: [[21, 125], [26, 160], [30, 250]],
    3.2: [[17.5, 125], [25, 160], [30, 250]], 4: [[17.5, 125], [22, 160], [30, 250]], 5: [[12.5, 125], [22, 160], [30, 250]],
    6.3: [[4, 125], [17.5, 160], [30, 250]], 8: [[12.5, 160], [28, 250], [30, 315]], 10: [[10.5, 160], [25, 250], [30, 315]],
  };
  const ARALIK = [[12.5, 2100], [17.5, 2600], [22, 3100], [25, 3600], [30, 4200]]; // açıklık üst sınırı (m) → teker aralığı (mm)
  /* ---------- [1] tek kiriş uç araba tablosu (mm, kg) ---------- */
  const UC = {
    125: { A6: 171, A7: 20, A8: 80, A9: 200, A10: 235, A12: 475, boy: { 1600: [1960, 135], 2100: [2460, 160], 2600: [2960, 185], 3100: [3460, 210], 3600: [3960, 235] } },
    160: { A6: 175, A7: 37.5, A8: 97, A9: 250, A10: 302.5, A12: 536, boy: { 1600: [2035, 175], 2100: [2535, 205], 2600: [3035, 235], 3100: [3535, 265], 3600: [4035, 295], 4200: [4635, 330] } },
    250: { A6: 258, A7: 30, A8: 117, A9: 300, A10: 345, A12: 621, boy: { 2100: [2665, 335], 2600: [3165, 380], 3100: [3665, 425], 3600: [4165, 470], 4200: [4765, 525] } },
    315: { A6: 268, A7: 62.5, A8: 117, A9: 400, A10: 477.5, A12: 626, boy: { 2100: [2725, 505], 2600: [3225, 565], 3100: [3725, 625], 3600: [4225, 685], 4200: [4825, 760] } },
  };
  const DUVAR = 200; // [1] şema: ray ekseni – duvar en az (mm)
  /* ---------- [1] izin verilen teker yükü (daN): çap → hız (m/dk) → ray genişliği K (mm) ---------- */
  const IZIN = {
    125: { 20: { 40: 4500, 50: 5000 }, 40: { 40: 3600, 50: 4000 }, 63: { 40: 3200, 50: 3400 } },
    160: { 20: { 40: 5900, 50: 7000, 60: 8300 }, 40: { 40: 5000, 50: 6200, 60: 7400 }, 63: { 40: 4400, 50: 5400, 60: 6400 } },
    250: { 20: { 40: 9800, 50: 12200, 60: 14400 }, 40: { 40: 8900, 50: 11100, 60: 13400 }, 63: { 40: 8000, 50: 10000, 60: 12000 } },
    315: { 20: { 40: 12700, 50: 15800, 60: 18600, 70: 18600 }, 40: { 40: 11600, 50: 14500, 60: 17400, 70: 18600 }, 63: { 40: 10900, 50: 13500, 60: 16200, 70: 17600 } },
  };
  /* ray: [ad, mantar genişliği L, yararlı genişlik K, yükseklik] — kare ray K = L; A rayları DIN 536 */
  const RAY = { 40: ['Kare 40×40', 40, 40, 40], 50: ['Kare 50×50', 50, 50, 50], 60: ['Kare 60×60', 60, 60, 60], A55: ['A55 (DIN 536)', 55, 45, 65], A65: ['A65 (DIN 536)', 65, 53, 75], A75: ['A75 (DIN 536)', 75, 59, 85] };
  /* ---------- [2] [3] ceraskal: kapasite → model, halat donanımı, hız (m/dk, tam yükte), FEM, standart kanca yolları (m) ---------- */
  const CER = {
    1: ['GHB11-011116-M6', '1/1', 16, 'M6', [14.5, 27.1, 37.2, 47.3]], 1.6: ['GHB11-011116-M5', '1/1', 16, 'M5', [14.5, 27.1, 37.2, 47.3]],
    2: ['GHB11-022108-M6', '2/1', 8, 'M6', [7.26, 13.5, 18.6, 23.6]], 2.5: ['GHB11-022108-M6', '2/1', 8, 'M6', [7.26, 13.5, 18.6, 23.6]],
    3.2: ['GHB11-032108-M5', '2/1', 8, 'M5', [7.26, 13.5, 18.6, 23.6]], 4: ['GHB11-044104-M6', '4/1', 4, 'M6', [3.6, 6.8, 10]],
    5: ['GHB11-054104-M6', '4/1', 4, 'M6', [3.6, 6.8, 10]], 6.3: ['GHB11-064104-M5', '4/1', 4, 'M5', [3.6, 6.8, 10]],
    8: ['GHD13-4104-M6', '4/1', 4, 'M6', [3.8, 7.2, 10, 12.8, 15.6]], 10: ['GHD13-4104-M6', '4/1', 4, 'M6', [3.8, 7.2, 10, 12.8, 15.6]],
  };
  /* ---------- KABUL: kapasiteye göre araba + ceraskal ağırlığı (kg), kanca mesafesi ve yaklaşma (mm) ---------- */
  const KABUL = { 1: [250, 550, 600], 1.6: [280, 550, 600], 2: [350, 650, 650], 2.5: [380, 650, 650], 3.2: [420, 650, 650], 4: [520, 750, 700], 5: [560, 750, 700], 6.3: [620, 750, 700], 8: [850, 850, 750], 10: [900, 850, 750] };

  const kapBul = Q => { const v = +String(Q == null ? '' : Q).replace(',', '.') || 10; /* '6,3' yazımı da geçerli */ return KAP.reduce((b, k) => (Math.abs(k - v) < Math.abs(b - v) ? k : b), KAP[0]); };
  const sinir = (tab, S) => (tab.find(r => S <= r[0] + 1e-9) || tab[tab.length - 1])[1];
  /* uç araba seçimi: Q (t), S (açıklık, mm) → { D, A1, A2, kg, A6 … } */
  const ucAraba = (Q, S) => {
    const k = kapBul(Q), Sm = (+S || 0) / 1000, D = sinir(TEKER[k], Sm), u = UC[D];
    let A1 = sinir(ARALIK, Sm); const var1 = Object.keys(u.boy).map(Number); if (!u.boy[A1]) A1 = var1.filter(a => a <= A1).pop() || var1[0];
    return Object.assign({ D, A1, A2: u.boy[A1][0], kg: u.boy[A1][1] }, u);
  };
  /* ceraskal: Q, gerekli kaldırma yüksekliği (mm) → model ve seçilen standart kanca yolu */
  const ceraskal = (Q, Hk) => {
    const c = CER[kapBul(Q)], ist = (+Hk || 0) / 1000, yol = c[4].find(h => h >= ist - 1e-9);
    return { model: c[0], halat: c[1], hiz: c[2], hizBos: r1(c[2] * 1.6), fem: c[3], yollar: c[4], yol: yol != null ? yol : c[4][c[4].length - 1], yeter: yol != null };
  };
  /* izin verilen teker yükü (kN): teker çapı, yürüme hızı, ray */
  const izinYuk = (D, vk, ray) => {
    const t = IZIN[D]; if (!t) return null; const hz = [20, 40, 63].find(h => (+vk || 20) <= h) || 63, K = (RAY[ray] || RAY[40])[2];
    const kol = Object.keys(t[hz]).map(Number).filter(x => x <= K).pop(); // tabloda o genişlik yoksa bir dar sütun (güvenli tarafta)
    return kol ? t[hz][kol] / 100 : null;
  };
  /* bütün türetilen değerler: q = aile parametreleri (mm, kg, t) */
  const hesap = q => {
    const Q = kapBul(q.Q), S = +q.S || 5650, u = ucAraba(Q, S), kb = KABUL[Q], cr = ceraskal(Q, q.Hk), ray = RAY[q.ray] ? q.ray : 40;
    const hg = +q.hg > 0 ? +q.hg : Math.max(200, yuv(S * (0.030 + 0.0027 * Q), 10));           // kabul (SW2: 320)
    const bg = +q.bg > 0 ? +q.bg : Math.max(200, Math.min(450, yuv(0.5 * hg + 140, 10)));       // kabul
    const gk = +q.gk > 0 ? +q.gk : yuv(40 + 0.25 * hg, 5);                                       // kabul, kg/m
    const Ga = +q.Ga > 0 ? +q.Ga : kb[0], c = +q.c > 0 ? +q.c : kb[1], e = +q.e > 0 ? +q.e : kb[2], Ge = 150; // kabul
    const za = Math.round(u.A7 + u.A9 - 80);                                                     // KABUL: kiriş altı – ray üstü (yalnız Ø160 için SW2 kesitindeki 210 mm ile denendi)
    const Gk = gk * S / 1000 + 2 * u.kg + Ge, ee = Math.min(e, S / 2);                          // köprü ağırlığı (kg)
    const Rmax = ((Q * 1000 + Ga) * G * (S - ee) / S / 2 + Gk * G / 4) / 1000;                  // yüklü, araba bu rayın yanında (kN / teker)
    const Rkar = ((Q * 1000 + Ga) * G * ee / S / 2 + Gk * G / 4) / 1000;                        // aynı anda karşı ray
    const Rmin = (Ga * G * ee / S / 2 + Gk * G / 4) / 1000;                                     // yüksüz, araba karşı rayın yanında
    const Rizin = izinYuk(u.D, q.vk, ray), Hr = +q.Hr || 0;
    return { Q, S, u, cr, ray, rayAd: RAY[ray][0], rayL: RAY[ray][1], rayH: RAY[ray][3], hg, bg, gk, Ga, c, e: ee, za, Gk: Math.round(Gk), Gtop: Math.round(Gk + Ga),
      Rmax: r1(Rmax), Rkar: r1(Rkar), Rmin: r1(Rmin), Rizin, tekerOk: Rizin == null ? null : Rmax <= Rizin + 1e-9,
      kirisAlt: Hr + za, ust: Hr + Math.max(za + hg, u.A10) + 60 /* KABUL: üstte 60 mm donanım payı */, kancaUst: Hr + za - c, kancaAlt: Hr + za - c - cr.yol * 1000 };
  };
  /* yapıya sığma denetimi: y = { z: yerleşim kotu (m), kolonAcik: kolon / duvar yüzleri arası (m), kirisAlt: çatı kirişi altı kotu (m), taban: kancanın inmesi gereken en alt kot (m) } */
  const sigma = (q, y) => {
    const h = hesap(q), z = +y.z || 0, out = [];
    const ekle = (ad, deger, sart, ok) => out.push({ ad, deger: Math.round(deger * 100) / 100, sart, ok });
    if (y.kolonAcik != null) { const d = (y.kolonAcik * 1000 - h.S) / 2; ekle('Ray ekseni – kolon / duvar yüzü (mm)', d, '≥ ' + DUVAR + ' (GH şeması)', d >= DUVAR - 1e-6); }
    if (y.kirisAlt != null) { const d = y.kirisAlt * 1000 - (z * 1000 + h.ust); ekle('Kreyn üstü – çatı kirişi altı (mm)', d, '≥ 100 (kabul)', d >= 100 - 1e-6); }
    if (y.taban != null) { const d = (z * 1000 + h.kancaAlt) / 1000; ekle('Kancanın indiği en alt kot (m)', Math.round(d * 100) / 100, '≤ ' + y.taban, d <= y.taban + 1e-6); }
    if (h.Rizin != null) ekle('Teker yükü (kN)', h.Rmax, '≤ ' + h.Rizin + ' (GH tablosu)', h.tekerOk);
    return { ok: out.every(s => s.ok), satir: out, h };
  };
  /* statik için: nesnenin dünya koordinatında ray hatları ve teker yükleri (kN; dinamik katsayısız) */
  const statikYuk = (e, q) => {
    const h = hesap(q), r = (+e.rot || 0) * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r), p = e.p || [0, 0], z = (+e.z || 0) + (+q.Hr || 0) / 1000;
    const W = (x, y) => [p[0] + y * cs - x * sn, p[1] + y * sn + x * cs, z], s2 = h.S / 2000, L = (+q.Ly || 0) / 1000;
    return { kapasite: h.Q, aciklik: h.S / 1000, rayUstKot: z, tekerAraligi: h.u.A1 / 1000, tekerSayisi: 4, Rmax: h.Rmax, Rkarsi: h.Rkar, Rmin: h.Rmin, Rizin: h.Rizin,
      kopruAgirlik: h.Gk, arabaAgirlik: h.Ga, raylar: [[W(s2, 0), W(s2, L)], [W(-s2, 0), W(-s2, L)]], not: 'Statik dengeden; dinamik katsayı ve yatay kuvvet uygulanmamıştır. Ağırlıklar kabuldür.' };
  };
  C.kreyn = { KAP, TEKER, ARALIK, UC, IZIN, RAY, CER, KABUL, DUVAR, kapBul, ucAraba, ceraskal, izinYuk, hesap, sigma, statikYuk };

  /* ================= AİLE TANIMI (tarayıcıda) ================= */
  if (!C.aileKaydet) return;
  const m = v => (+v || 0) / 1000, FAM = 'kreyn_tek_kiris';
  const COL = { kopru: [0.95, 0.76, 0.10], teker: [0.20, 0.21, 0.23], ray: [0.42, 0.44, 0.48], cer: [0.16, 0.36, 0.60], motor: [0.14, 0.50, 0.72], kanca: [0.78, 0.14, 0.10], halat: [0.30, 0.30, 0.32], tampon: [0.10, 0.10, 0.11], yol: [0.62, 0.64, 0.67] };
  const H = k => q => hesap(q)[k], fk = (v, n) => (C.M && C.M.fmt ? C.M.fmt(v, n) : (+v).toFixed(n));
  /* çizim ölçüleri (m) */
  const olc = q => {
    const h = hesap(q), u = h.u, S = m(h.S), Ly = m(q.Ly), A2 = m(u.A2), Hr = m(q.Hr);
    const yk = Math.max(A2 / 2, Math.min(Ly - A2 / 2, m(q.yk))), xa = Math.max(-S / 2 + m(h.e), Math.min(S / 2 - m(h.e), m(q.xa) - S / 2));
    return { h, u, S, Ly, A2, Hr, yk, xa, A1: m(u.A1), D: m(u.D), A6: m(u.A6), zg: Hr + m(h.za), hg: m(h.hg), bg: m(h.bg), zk: m(h.kancaUst) - Math.max(0, Math.min(h.cr.yol, m(q.kz))) };
  };
  C.aileKaydet({
    id: FAM, ad: 'Gezer köprü vinci — tek kirişli (1 … 10 t)', kisaAd: 'KREYN', kat: 'Vinç / kaldırma', agac: ['Diğer ekipman', 'Vinç / kaldırma'], katman: 'MEK_VINC', renk: 2, ifc: 'IfcTransportElement',
    aciklama: 'Ray üstünde yürüyen tek kirişli köprü vinci ve halatlı ceraskal. Kapasite seçilince teker, baş kiriş ve ceraskal GH kataloğundan gelir; köprü kirişi kesiti, ağırlıklar ve kanca mesafeleri kabuldür (0 = otomatik), üretici teklifine göre düzeltin. Yerleşim kotu zemin döşemesidir.',
    params: [
      { k: 'Q', ad: 'Kapasite', birim: 't', d: '10', opts: KAP.map(k => [String(k), String(k).replace('.', ',') + ' t']), grup: 'Vinç' },
      { k: 'S', ad: 'Açıklık (ray ekseni – ray ekseni)', d: 5650, min: 2000, max: 30000, grup: 'Vinç' },
      { k: 'Hk', ad: 'Gerekli kaldırma yüksekliği', d: 14000, min: 1000, max: 47000, grup: 'Vinç' },
      { k: 'vk', ad: 'Köprü yürüme hızı', birim: 'm/dk', d: '20', opts: [10, 15, 20, 25, 30, 40, 60].map(v => [String(v), v + ' m/dk']), grup: 'Vinç' },
      { k: 'Hr', ad: 'Ray üstü — yerleşim kotundan', d: 5340, min: 500, max: 40000, grup: 'Vinç yolu' },
      { k: 'Ly', ad: 'Yürüme yolu boyu', d: 20000, min: 3000, max: 200000, grup: 'Vinç yolu' },
      { k: 'ray', ad: 'Ray', d: '40', opts: Object.keys(RAY).map(k => [k, RAY[k][0]]), grup: 'Vinç yolu' },
      { k: 'hy', ad: 'Vinç yolu kirişi yüksekliği (0 = çizme)', d: 400, min: 0, max: 2000, grup: 'Vinç yolu' },
      { k: 'yk', ad: 'Köprünün yeri (yol başından)', d: 10000, min: 0, grup: 'Konum' },
      { k: 'xa', ad: 'Arabanın yeri (sol raydan)', d: 2825, min: 0, grup: 'Konum' },
      { k: 'kz', ad: 'Kanca — üst konumdan aşağı', d: 1500, min: 0, grup: 'Konum' },
      { k: 'hg', ad: 'Köprü kirişi yüksekliği (0 = otomatik)', d: 0, min: 0, grup: 'Kabuller — katalogda yok' },
      { k: 'bg', ad: 'Köprü kirişi genişliği (0 = otomatik)', d: 0, min: 0, grup: 'Kabuller — katalogda yok' },
      { k: 'gk', ad: 'Köprü kirişi ağırlığı (0 = otomatik)', birim: 'kg/m', d: 0, min: 0, grup: 'Kabuller — katalogda yok' },
      { k: 'Ga', ad: 'Araba + ceraskal ağırlığı (0 = otomatik)', birim: 'kg', d: 0, min: 0, grup: 'Kabuller — katalogda yok' },
      { k: 'c', ad: 'Kanca — kiriş altından en az (0 = otomatik)', d: 0, min: 0, grup: 'Kabuller — katalogda yok' },
      { k: 'e', ad: 'Kancanın raya en yakın mesafesi (0 = otomatik)', d: 0, min: 0, grup: 'Kabuller — katalogda yok' },
      { k: 'D', ad: 'Teker çapı', f: q => hesap(q).u.D, fAcik: 'GH çizelgesi', grup: 'Hesaplanan' },
      { k: 'A1', ad: 'Teker aralığı', f: q => hesap(q).u.A1, fAcik: 'GH çizelgesi', grup: 'Hesaplanan' },
      { k: 'A2', ad: 'Baş kiriş boyu', f: q => hesap(q).u.A2, fAcik: 'GH tablosu', grup: 'Hesaplanan' },
      { k: 'HkS', ad: 'Seçilen kanca yolu', birim: 'm', f: q => hesap(q).cr.yol, fAcik: 'GH föyü', grup: 'Hesaplanan' },
      { k: 'vh', ad: 'Kaldırma hızı (tam yükte)', birim: 'm/dk', f: q => hesap(q).cr.hiz, fAcik: 'GH föyü', grup: 'Hesaplanan' },
      { k: 'Rmax', ad: 'En büyük teker yükü', birim: 'kN', f: H('Rmax'), fAcik: 'statik denge', grup: 'Hesaplanan' },
      { k: 'Rmin', ad: 'En küçük teker yükü (yüksüz)', birim: 'kN', f: H('Rmin'), fAcik: 'statik denge', grup: 'Hesaplanan' },
      { k: 'Riz', ad: 'İzin verilen teker yükü', birim: 'kN', f: q => { const v = hesap(q).Rizin; return v == null ? 0 : v; }, fAcik: 'GH tablosu', grup: 'Hesaplanan' },
    ],
    tipler: [
      { ad: 'KRN-10t-5650 (SW2/CR/001)', p: { Q: '10', S: 5650, Hk: 14000, vk: '20', Hr: 5340, Ly: 20000, ray: '40', hy: 400, yk: 10000, xa: 2825, kz: 1500, hg: 320, bg: 0, gk: 0, Ga: 0, c: 0, e: 0 } },
      ...[[1, 6000, 6000], [2, 8000, 6000], [3.2, 10000, 6000], [5, 10000, 6000], [6.3, 12000, 6000], [8, 12000, 7000], [10, 10000, 7000], [10, 15000, 7000], [10, 20000, 7000]].map(([Q, S, Hk]) =>
        ({ ad: `KRN-${String(Q).replace('.', ',')}t-${S}`, p: { Q: String(Q), S, Hk, vk: '20', Hr: 6000, Ly: 24000, ray: Q >= 8 && S > 10500 ? '50' : '40', hy: 0, yk: 12000, xa: S / 2, kz: 1500, hg: 0, bg: 0, gk: 0, Ga: 0, c: 0, e: 0 } })),
    ],
    /* uydurma: tıklanan iki yüz kolon / duvar yüzüdür → raylar her yüzden 200 mm (GH şeması) içeri alınır */
    uydur: { gen: 'S', ek: np => { np.S = Math.max(2000, np.S - 2 * DUVAR); np.xa = Math.round(np.S / 2); }, std: p => { const h = hesap(p); return `Raylar tıklanan yüzlerden ${DUVAR} mm içeri alındı; yerleşim kotunu (zemin döşemesi) denetleyin. Kreyn açıklığı ${h.S} mm → teker Ø${h.u.D}, teker aralığı ${h.u.A1} mm, en büyük teker yükü ${fk(h.Rmax, 1)} kN.`; } },
    etiket: q => { const h = hesap(q); return `${String(h.Q).replace('.', ',')} t · açıklık ${fk(h.S / 1000, 2)} m`; },
    etiketYer: q => { const o = olc(q); return [0, o.yk - o.A2 / 2 - 0.45, 0]; },
    liste: q => { const h = hesap(q); return `Tek kirişli gezer köprü vinci ${String(h.Q).replace('.', ',')} t · açıklık ${fk(h.S / 1000, 2)} m · kanca yolu ${fk(h.cr.yol, 1)} m · ceraskal ${h.cr.model} (${h.cr.halat}, ${h.cr.hiz} m/dk, FEM ${h.cr.fem}) · yürüme ${q.vk} m/dk · teker Ø${h.u.D}, aralık ${h.u.A1} mm · ray ${h.rayAd} · yol ${fk(m(q.Ly), 1)} m · teker yükü en çok ${fk(h.Rmax, 1)} kN`; },
    bilgi: q => {
      const h = hesap(q);
      return `${String(h.Q).replace('.', ',')} t, ray açıklığı ${h.S} mm; teker Ø${h.u.D}, teker aralığı ${h.u.A1}, baş kiriş boyu ${h.u.A2} mm (GH); ceraskal ${h.cr.model}, ${h.cr.halat} halat, ${h.cr.hiz} m/dk (boşta ${fk(h.cr.hizBos, 1)}), FEM ${h.cr.fem}, kanca yolu ${fk(h.cr.yol, 1)} m${h.cr.yeter ? '' : ' — İSTENEN YÜKSEKLİĞE YETMİYOR'}; ` +
        `köprü kirişi ${h.bg}×${h.hg} mm (kabul); teker yükü en çok ${fk(h.Rmax, 1)} / en az ${fk(h.Rmin, 1)} kN (statik, kabul ağırlıklarla)` +
        (h.Rizin == null ? '; bu ray için izin verilen yük tabloda yok' : `, izin verilen ${fk(h.Rizin, 1)} kN${h.tekerOk ? '' : ' — AŞILIYOR, rayı genişletin ya da hızı düşürün'}`) +
        `; kanca en üstte ray üstünden ${Math.round(q.Hr - h.kancaUst)} mm aşağıda; kreyn üstü ray üstünden ${Math.round(h.ust - q.Hr)} mm yukarıda; ray ekseni – duvar en az ${DUVAR} mm`;
    },
    tutamac: [
      { k: 'S', yer: q => { const o = olc(q); return [o.S / 2, o.yk, o.Hr]; }, eksen: [1, 0, 0], kat: 2, adim: 50 },
      { k: 'Ly', yer: q => { const o = olc(q); return [0, o.Ly, o.Hr]; }, eksen: [0, 1, 0], adim: 100 },
      { k: 'yk', yer: q => { const o = olc(q); return [0, o.yk, o.zg + o.hg]; }, eksen: [0, 1, 0], adim: 50 },
      { k: 'xa', yer: q => { const o = olc(q); return [o.xa, o.yk + o.bg / 2 + 0.35, o.zg]; }, eksen: [1, 0, 0], adim: 50 },
    ],
    baglanti: q => { const o = olc(q); return [{ p: [o.S / 2, 0, o.Hr] }, { p: [-o.S / 2, 0, o.Hr] }, { p: [o.S / 2, o.Ly, o.Hr] }, { p: [-o.S / 2, o.Ly, o.Hr] }, { p: [o.xa, o.yk, o.zk] }]; },
    /* PLAN: raylar (eksen çizgisi), köprü, baş kirişler, araba, kanca ve kancanın tarayabildiği alan */
    plan: (q, g) => {
      const o = olc(q), s2 = o.S / 2, e = m(o.h.e);
      for (const s of [-1, 1]) {
        g.cizgi([s * s2, 0], [s * s2, o.Ly], { lw: 25, lt: 'CENTER' });
        g.dik(s * s2 - o.A6 / 2, o.yk - o.A2 / 2, s * s2 + o.A6 / 2, o.yk + o.A2 / 2, { lw: 35 });
        for (const t of [-1, 1]) g.dik(s * s2 - 0.04, o.yk + t * o.A1 / 2 - o.D / 2, s * s2 + 0.04, o.yk + t * o.A1 / 2 + o.D / 2, { lw: 18 });
        g.cizgi([s * s2 - 0.12, 0], [s * s2 + 0.12, 0], { lw: 35 }); g.cizgi([s * s2 - 0.12, o.Ly], [s * s2 + 0.12, o.Ly], { lw: 35 }); // yol sonu durdurucuları
      }
      g.dik(-s2 + o.A6 / 2, o.yk - o.bg / 2, s2 - o.A6 / 2, o.yk + o.bg / 2, { lw: 50 });                 // köprü kirişi
      g.dik(o.xa - 0.45, o.yk - o.bg / 2 - 0.30, o.xa + 0.45, o.yk + o.bg / 2 + 0.30, { lw: 25 });       // araba + ceraskal
      g.daire([o.xa, o.yk], 0.10, { lw: 35 }); g.cizgi([o.xa - 0.16, o.yk], [o.xa + 0.16, o.yk], { lw: 18 }); g.cizgi([o.xa, o.yk - 0.16], [o.xa, o.yk + 0.16], { lw: 18 });
      g.dik(-s2 + e, o.A2 / 2, s2 - e, o.Ly - o.A2 / 2, { lw: 13, lt: 'DASHED' });                       // kancanın eriştiği alan
    },
    /* ÖN GÖRÜNÜŞ (yürüme yolu yönünde bakış = enine kesit): u = açıklık yönü, v = kot */
    on: (q, g) => {
      const o = olc(q), h = o.h, s2 = o.S / 2, rl = m(h.rayL) / 2, rh = m(h.rayH), zc = o.Hr + m(o.u.A7);
      g.cizgi([-s2 - 0.6, 0], [s2 + 0.6, 0], { lw: 25 });                                                  // zemin
      for (const s of [-1, 1]) {
        g.dik(s * s2 - rl, o.Hr - rh, s * s2 + rl, o.Hr, { lw: 35 });
        if (q.hy > 0) g.dik(s * s2 - 0.15, o.Hr - rh - m(q.hy), s * s2 + 0.15, o.Hr - rh, { lw: 25 });
        g.dik(s * s2 - o.A6 / 2, zc, s * s2 + o.A6 / 2, zc + m(o.u.A9), { lw: 35 });
        g.daire([s * s2, o.Hr + o.D / 2], o.D / 2, { lw: 25 });
        g.dik(s * s2 - s * o.A6 / 2, zc + 0.03, s * s2 - s * m(o.u.A12), zc + m(o.u.A9) - 0.03, { lw: 18 }); // yürüme motoru (içe doğru)
        g.cizgi([s * s2, -0.1], [s * s2, o.Hr + 0.5], { lw: 13, lt: 'CENTER' });
      }
      g.dik(-s2 + o.A6 / 2, o.zg, s2 - o.A6 / 2, o.zg + o.hg, { lw: 50 });
      g.dik(o.xa - 0.45, o.zg - 0.38, o.xa + 0.45, o.zg + 0.10, { lw: 25 });
      g.cizgi([o.xa, o.zg - 0.38], [o.xa, o.zk + 0.12], { lw: 13 }); g.daire([o.xa, o.zk + 0.06], 0.07, { lw: 35 });
      g.olcu([-s2, o.Hr + m(o.u.A10) + 0.25], [s2, o.Hr + m(o.u.A10) + 0.25], 'h', 0.35, `S = ${h.S}`);
      g.olcu([s2 + 0.45, 0], [s2 + 0.45, o.Hr], 'v', 0.3, `ray üstü ${q.Hr}`);
      g.olcu([-s2 - 0.45, m(h.kancaUst)], [-s2 - 0.45, o.Hr], 'v', -0.3, `${Math.round(q.Hr - h.kancaUst)}`);
      g.yazi([o.xa + 0.15, m(h.kancaUst) - 0.02], `${String(h.Q).replace('.', ',')} t`, 0.12);
    },
    /* YAN GÖRÜNÜŞ (köprü kirişi yönünde bakış): u = yürüme yolu yönü (köprü ortası 0), v = kot */
    yan: (q, g) => {
      const o = olc(q), zc = o.Hr + m(o.u.A7), a2 = o.A2 / 2;
      g.cizgi([-a2 - 0.4, o.Hr], [a2 + 0.4, o.Hr], { lw: 35 });
      g.dik(-a2 + m(o.u.A8), zc, a2 - m(o.u.A8), zc + m(o.u.A9), { lw: 35 });
      for (const t of [-1, 1]) { g.daire([t * o.A1 / 2, o.Hr + o.D / 2], o.D / 2, { lw: 25 }); g.dik(t * a2, zc + 0.05, t * (a2 - m(o.u.A8)), zc + m(o.u.A9) - 0.05, { lw: 25 }); }
      g.dik(-o.bg / 2, o.zg, o.bg / 2, o.zg + o.hg, { lw: 50 });
      g.dik(-o.bg / 2 - 0.30, o.zg - 0.38, o.bg / 2 + 0.30, o.zg + 0.10, { lw: 25 });
      g.cizgi([0, o.zg - 0.38], [0, o.zk + 0.12], { lw: 13 }); g.daire([0, o.zk + 0.06], 0.07, { lw: 35 });
      g.olcu([-o.A1 / 2, o.Hr], [o.A1 / 2, o.Hr], 'h', -0.3, `${o.u.A1}`);
    },
    /* 3B: raylar (+ istenirse vinç yolu kirişi), baş kirişler ve tekerler, köprü kirişi, araba + halatlı ceraskal, kanca */
    mesh: (q, g) => {
      const o = olc(q), h = o.h, u = o.u, s2 = o.S / 2, rl = m(h.rayL) / 2, rh = m(h.rayH), zc = o.Hr + m(u.A7), a2 = o.A2 / 2, A8 = m(u.A8), A9 = m(u.A9);
      for (const s of [-1, 1]) {
        g.kutu(s * s2 - rl, s * s2 + rl, 0, o.Ly, o.Hr - rh, o.Hr, COL.ray);
        if (q.hy > 0) g.kutu(s * s2 - 0.15, s * s2 + 0.15, 0, o.Ly, o.Hr - rh - m(q.hy), o.Hr - rh, COL.yol);
        for (const y of [0.05, o.Ly - 0.05]) g.kutu(s * s2 - 0.10, s * s2 + 0.10, y - 0.05, y + 0.05, o.Hr, o.Hr + o.D * 0.8, COL.kanca);   // yol sonu durdurucuları
        g.kutu(s * s2 - o.A6 / 2, s * s2 + o.A6 / 2, o.yk - a2 + A8, o.yk + a2 - A8, zc, zc + A9, COL.kopru);                               // baş kiriş gövdesi
        for (const t of [-1, 1]) {
          const yt = o.yk + t * o.A1 / 2;
          g.silindir([s * s2 - 0.035, yt, o.Hr + o.D / 2], [s * s2 + 0.035, yt, o.Hr + o.D / 2], o.D / 2, COL.teker, 20);                    // teker
          g.silindir([s * s2, o.yk + t * (a2 - A8), zc + A9 / 2], [s * s2, o.yk + t * a2, zc + A9 / 2], Math.min(0.06, A9 / 4), COL.tampon, 12); // tampon
        }
        const ym = o.yk + o.A1 / 2;                                                                                                          // yürüme motoru: bir tekerde, içe doğru
        g.kutu(s * s2 - s * o.A6 / 2, s * s2 - s * (o.A6 / 2 + 0.16), ym - 0.09, ym + 0.09, zc + 0.02, zc + A9 - 0.02, COL.motor);
        g.silindir([s * s2 - s * (o.A6 / 2 + 0.16), ym, zc + A9 / 2], [s * s2 - s * m(u.A12), ym, zc + A9 / 2], Math.min(0.085, A9 / 3), COL.motor, 14);
      }
      const x0 = -s2 + o.A6 / 2, x1 = s2 - o.A6 / 2, zg = o.zg, b2 = o.bg / 2;
      g.kutu(x0, x1, o.yk - b2 + 0.02, o.yk + b2 - 0.02, zg + 0.015, zg + o.hg, COL.kopru);                                                  // köprü kirişi
      g.kutu(x0, x1, o.yk - b2, o.yk + b2, zg, zg + 0.015, COL.kopru);                                                                       // alt başlık (araba bunun üstünde yürür)
      const xa = o.xa, yv = o.yk;                                                                                                             // araba + ceraskal
      for (const t of [-1, 1]) {
        g.kutu(xa - 0.42, xa + 0.42, yv + t * (b2 + 0.01), yv + t * (b2 + 0.03), zg - 0.12, zg + 0.14, COL.cer);                             // araba yan sacları
        for (const sx of [-0.28, 0.28]) g.silindir([xa + sx, yv + t * (b2 - 0.07), zg + 0.06], [xa + sx, yv + t * (b2 + 0.01), zg + 0.06], 0.045, COL.teker, 12);
      }
      g.kutu(xa - 0.42, xa + 0.42, yv - b2 - 0.03, yv + b2 + 0.03, zg - 0.16, zg - 0.12, COL.cer);                                           // alt bağlantı
      const rt = 0.11 + 0.008 * h.Q, zt = zg - 0.16 - rt;
      g.silindir([xa - 0.36, yv, zt], [xa + 0.36, yv, zt], rt, COL.cer, 18);                                                                 // halat tamburu
      g.silindir([xa + 0.36, yv, zt], [xa + 0.62, yv, zt], rt * 0.8, COL.motor, 14);                                                         // kaldırma motoru
      g.kutu(xa - 0.58, xa - 0.36, yv - rt, yv + rt, zt - rt, zt + rt, COL.cer);                                                             // redüktör
      const zk = o.zk;                                                                                                                        // kanca bloğu ve halatlar
      for (const sx of [-0.10, 0.10]) g.silindir([xa + sx, yv, zt - rt * 0.6], [xa + sx, yv, zk + 0.28], 0.008, COL.halat, 6);
      g.kutu(xa - 0.14, xa + 0.14, yv - 0.05, yv + 0.05, zk + 0.14, zk + 0.30, COL.kanca);
      g.silindir([xa, yv, zk + 0.14], [xa, yv, zk + 0.04], 0.03, COL.halat, 8);
      g.silindir([xa, yv - 0.02, zk + 0.02], [xa, yv + 0.02, zk + 0.02], 0.075, COL.kanca, 14);
    },
  });

  /* KREYNYUK: seçili kreynin statik için teker yüklerini ve ray hatlarını komut satırına yazar */
  if (C.addCommand) C.addCommand(['KREYNYUK', 'VINCYUK', 'CRANELOAD'], 'Seçili gezer köprü vincinin teker yüklerini, teker aralığını ve ray üstü kotunu yazar (statik hesap için).', async () => {
    const e = (C.sel || []).find(x => x.type === 'aile' && x.fam === FAM); if (!e) { C.warn('Önce bir gezer köprü vinci (kreyn) seçin.'); return; }
    const y = statikYuk(e, C.aileDegerE(e));
    C.log(`Kreyn ${String(y.kapasite).replace('.', ',')} t, açıklık ${fk(y.aciklik, 2)} m, ray üstü kotu ${fk(y.rayUstKot, 2)}: her rayda 2 teker, teker aralığı ${fk(y.tekerAraligi, 2)} m; teker yükü en çok ${fk(y.Rmax, 1)} kN (aynı anda karşı rayda ${fk(y.Rkarsi, 1)} kN), yüksüz en az ${fk(y.Rmin, 1)} kN${y.Rizin != null ? `; izin verilen ${fk(y.Rizin, 1)} kN` : ''}. ${y.not}`);
  }, { noUndo: true });
})(typeof window !== 'undefined' ? window.C : (globalThis.C = globalThis.C || {}));

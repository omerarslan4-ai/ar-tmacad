/* ArıtmaCAD — ÇELİK PROFİL KATALOĞU ve KESİT DEĞERLERİ (saf veri + saf fonksiyonlar; Node'da da yüklenir)
   Aileler: HEA, HEB, HEM, IPE (EN 10365), IPN (DIN 1025-1), UPN (DIN 1026-1), UPE (DIN 1026-2), eşit / eşit olmayan köşebent (EN 10056-1),
   kutu profil SHS / RHS (EN 10219, soğuk şekillendirilmiş), boru CHS (EN 10219), T (EN 10055), lama (EN 10058).
   Tabloda yalnız ölçüler durur (h, b, tw, tf, r …, mm). Kesit değerleri (A, kg/m, Ix, Iy, Wx, Wy, ix, iy) kesitin GERÇEK dış hattından
   (köşe yarıçapları, IPN / UPN'de eğimli başlık iç yüzü) Green teoremiyle hesaplanır: çizilen şekil ile verilen sayı aynı kaynaktan gelir.
   Eksenler (Türkiye tablolarındaki gibi): x = güçlü eksen (gövdeye dik, yatay), y = zayıf eksen. Köşebentte x // kısa kenar, y // uzun kenar.
   Birimler: ölçüler mm; A cm², I cm⁴, W cm³, i cm, ağırlık kg/m (çelik 7850 kg/m³).
   C.celik = { AILE, profil(ad), aile(ad), adlar(aile), adCoz(metin), kesit(ad) → {dis, ic}, ozellik(halkalar), metraj(liste), tabanOneri, alinOneri, cubuk }
   Deneme: node test/celik-profil.test.js (yayımlanmış tablo değerleriyle karşılaştırma). */
(function (C) {
  'use strict';
  const RO = 7850; // kg/m³

  /* ---------------- KATALOG (ölçüler mm) ---------------- */
  // I profiller: [ad-son-eki, h, b, tw, tf, r]
  const HEA = [[100, 96, 100, 5, 8, 12], [120, 114, 120, 5, 8, 12], [140, 133, 140, 5.5, 8.5, 12], [160, 152, 160, 6, 9, 15], [180, 171, 180, 6, 9.5, 15], [200, 190, 200, 6.5, 10, 18], [220, 210, 220, 7, 11, 18], [240, 230, 240, 7.5, 12, 21], [260, 250, 260, 7.5, 12.5, 24], [280, 270, 280, 8, 13, 24], [300, 290, 300, 8.5, 14, 27], [320, 310, 300, 9, 15.5, 27], [340, 330, 300, 9.5, 16.5, 27], [360, 350, 300, 10, 17.5, 27], [400, 390, 300, 11, 19, 27], [450, 440, 300, 11.5, 21, 27], [500, 490, 300, 12, 23, 27], [550, 540, 300, 12.5, 24, 27], [600, 590, 300, 13, 25, 27], [650, 640, 300, 13.5, 26, 27], [700, 690, 300, 14.5, 27, 27], [800, 790, 300, 15, 28, 30], [900, 890, 300, 16, 30, 30], [1000, 990, 300, 16.5, 31, 30]];
  const HEB = [[100, 100, 100, 6, 10, 12], [120, 120, 120, 6.5, 11, 12], [140, 140, 140, 7, 12, 12], [160, 160, 160, 8, 13, 15], [180, 180, 180, 8.5, 14, 15], [200, 200, 200, 9, 15, 18], [220, 220, 220, 9.5, 16, 18], [240, 240, 240, 10, 17, 21], [260, 260, 260, 10, 17.5, 24], [280, 280, 280, 10.5, 18, 24], [300, 300, 300, 11, 19, 27], [320, 320, 300, 11.5, 20.5, 27], [340, 340, 300, 12, 21.5, 27], [360, 360, 300, 12.5, 22.5, 27], [400, 400, 300, 13.5, 24, 27], [450, 450, 300, 14, 26, 27], [500, 500, 300, 14.5, 28, 27], [550, 550, 300, 15, 29, 27], [600, 600, 300, 15.5, 30, 27], [650, 650, 300, 16, 31, 27], [700, 700, 300, 17, 32, 27], [800, 800, 300, 17.5, 33, 30], [900, 900, 300, 18.5, 35, 30], [1000, 1000, 300, 19, 36, 30]];
  const HEM = [[100, 120, 106, 12, 20, 12], [120, 140, 126, 12.5, 21, 12], [140, 160, 146, 13, 22, 12], [160, 180, 166, 14, 23, 15], [180, 200, 186, 14.5, 24, 15], [200, 220, 206, 15, 25, 18], [220, 240, 226, 15.5, 26, 18], [240, 270, 248, 18, 32, 21], [260, 290, 268, 18, 32.5, 24], [280, 310, 288, 18.5, 33, 24], [300, 340, 310, 21, 39, 27], [320, 359, 309, 21, 40, 27], [340, 377, 309, 21, 40, 27], [360, 395, 308, 21, 40, 27], [400, 432, 307, 21, 40, 27], [450, 478, 307, 21, 40, 27], [500, 524, 306, 21, 40, 27], [550, 572, 306, 21, 40, 27], [600, 620, 305, 21, 40, 27], [650, 668, 305, 21, 40, 27], [700, 716, 304, 21, 40, 27], [800, 814, 303, 21, 40, 30], [900, 910, 302, 21, 40, 30], [1000, 1008, 302, 21, 40, 30]];
  const IPE = [[80, 80, 46, 3.8, 5.2, 5], [100, 100, 55, 4.1, 5.7, 7], [120, 120, 64, 4.4, 6.3, 7], [140, 140, 73, 4.7, 6.9, 7], [160, 160, 82, 5, 7.4, 9], [180, 180, 91, 5.3, 8, 9], [200, 200, 100, 5.6, 8.5, 12], [220, 220, 110, 5.9, 9.2, 12], [240, 240, 120, 6.2, 9.8, 15], [270, 270, 135, 6.6, 10.2, 15], [300, 300, 150, 7.1, 10.7, 15], [330, 330, 160, 7.5, 11.5, 18], [360, 360, 170, 8, 12.7, 18], [400, 400, 180, 8.6, 13.5, 21], [450, 450, 190, 9.4, 14.6, 21], [500, 500, 200, 10.2, 16, 21], [550, 550, 210, 11.1, 17.2, 24], [600, 600, 220, 12, 19, 24]];
  // IPN (eğimli başlık %14; tf başlık ucundan b/4 içeride; r1 = tw, r2 = 0,6·tw): [ek, h, b, tw, tf]
  const IPN = [[80, 80, 42, 3.9, 5.9], [100, 100, 50, 4.5, 6.8], [120, 120, 58, 5.1, 7.7], [140, 140, 66, 5.7, 8.6], [160, 160, 74, 6.3, 9.5], [180, 180, 82, 6.9, 10.4], [200, 200, 90, 7.5, 11.3], [220, 220, 98, 8.1, 12.2], [240, 240, 106, 8.7, 13.1], [260, 260, 113, 9.4, 14.1], [280, 280, 119, 10.1, 15.2], [300, 300, 125, 10.8, 16.2], [320, 320, 131, 11.5, 17.3], [340, 340, 137, 12.2, 18.3], [360, 360, 143, 13, 19.5], [380, 380, 149, 13.7, 20.5], [400, 400, 155, 14.4, 21.6], [450, 450, 170, 16.2, 24.3], [500, 500, 185, 18, 27], [550, 550, 200, 19, 30], [600, 600, 215, 21.6, 32.4]];
  // UPN (eğimli başlık %8, h > 300'de %5; tf sırttan b/2'de; r1 = tf, r2 = tf/2): [ek, h, b, tw, tf]
  const UPN = [[50, 50, 38, 5, 7], [65, 65, 42, 5.5, 7.5], [80, 80, 45, 6, 8], [100, 100, 50, 6, 8.5], [120, 120, 55, 7, 9], [140, 140, 60, 7, 10], [160, 160, 65, 7.5, 10.5], [180, 180, 70, 8, 11], [200, 200, 75, 8.5, 11.5], [220, 220, 80, 9, 12.5], [240, 240, 85, 9.5, 13], [260, 260, 90, 10, 14], [280, 280, 95, 10, 15], [300, 300, 100, 10, 16], [320, 320, 100, 14, 17.5], [350, 350, 100, 14, 16], [380, 380, 102, 13.5, 16], [400, 400, 110, 14, 18]];
  // UPE (paralel başlık): [ek, h, b, tw, tf, r]
  const UPE = [[80, 80, 50, 4, 7, 10], [100, 100, 55, 4.5, 7.5, 10], [120, 120, 60, 5, 8, 12], [140, 140, 65, 5, 9, 12], [160, 160, 70, 5.5, 9.5, 12], [180, 180, 75, 5.5, 10.5, 12], [200, 200, 80, 6, 11, 13], [220, 220, 85, 6.5, 12, 13], [240, 240, 90, 7, 12.5, 15], [270, 270, 95, 7.5, 13.5, 15], [300, 300, 100, 9.5, 15, 15], [330, 330, 105, 11, 16, 18], [360, 360, 110, 12, 17, 18], [400, 400, 115, 13.5, 18, 18]];
  // Köşebent (r1 kök, r2 = r1/2 uç): [a, b, t, r1]; eşit kenarlıda a = b
  const LE = [[20, 20, 3, 3.5], [25, 25, 3, 3.5], [25, 25, 4, 3.5], [30, 30, 3, 5], [30, 30, 4, 5], [35, 35, 4, 5], [40, 40, 4, 6], [40, 40, 5, 6], [45, 45, 4.5, 7], [50, 50, 5, 7], [50, 50, 6, 7], [60, 60, 6, 8], [60, 60, 8, 8], [65, 65, 7, 9], [70, 70, 7, 9], [75, 75, 8, 10], [80, 80, 8, 10], [80, 80, 10, 10], [90, 90, 9, 11], [100, 100, 8, 12], [100, 100, 10, 12], [100, 100, 12, 12], [120, 120, 10, 13], [120, 120, 12, 13], [130, 130, 12, 14], [150, 150, 10, 16], [150, 150, 12, 16], [150, 150, 15, 16], [160, 160, 15, 17], [180, 180, 16, 18], [180, 180, 18, 18], [200, 200, 16, 18], [200, 200, 20, 18], [200, 200, 24, 18]];
  const LU = [[30, 20, 3, 4], [40, 20, 4, 4], [45, 30, 4, 4.5], [50, 30, 5, 5], [60, 40, 5, 6], [60, 40, 6, 6], [65, 50, 5, 6], [75, 50, 6, 7], [75, 50, 8, 7], [80, 40, 6, 7], [80, 60, 7, 8], [100, 50, 6, 8], [100, 50, 8, 8], [100, 65, 7, 10], [100, 75, 8, 10], [120, 80, 8, 11], [120, 80, 10, 11], [125, 75, 8, 11], [150, 90, 10, 12], [150, 100, 10, 12], [200, 100, 10, 15]];
  // Kutu profil (EN 10219): [h, b, t]; dış köşe yarıçapı t ≤ 6: 2t, ≤ 10: 2,5t, > 10: 3t; iç = dış − t
  const SHS = [[20, 20, 2], [25, 25, 2], [30, 30, 2], [30, 30, 3], [40, 40, 2], [40, 40, 3], [40, 40, 4], [50, 50, 2], [50, 50, 3], [50, 50, 4], [50, 50, 5], [60, 60, 3], [60, 60, 4], [60, 60, 5], [70, 70, 3], [70, 70, 4], [80, 80, 3], [80, 80, 4], [80, 80, 5], [80, 80, 6], [90, 90, 4], [90, 90, 5], [100, 100, 4], [100, 100, 5], [100, 100, 6], [100, 100, 8], [120, 120, 5], [120, 120, 6], [120, 120, 8], [140, 140, 5], [140, 140, 6], [140, 140, 8], [150, 150, 6], [150, 150, 8], [150, 150, 10], [160, 160, 6], [160, 160, 8], [180, 180, 8], [200, 200, 6], [200, 200, 8], [200, 200, 10], [250, 250, 8], [250, 250, 10], [300, 300, 10]];
  const RHS = [[40, 20, 2], [50, 30, 3], [60, 40, 3], [60, 40, 4], [80, 40, 3], [80, 40, 4], [100, 50, 4], [100, 50, 5], [100, 60, 4], [120, 60, 4], [120, 60, 5], [120, 80, 5], [140, 80, 5], [150, 100, 5], [150, 100, 6], [160, 80, 5], [160, 80, 6], [200, 100, 6], [200, 100, 8], [250, 150, 8], [300, 200, 10]];
  // Boru (EN 10219): [D, t]
  const CHS = [[21.3, 2.6], [26.9, 2.6], [33.7, 3.2], [42.4, 3.2], [48.3, 3.2], [48.3, 4], [60.3, 3.2], [60.3, 4], [76.1, 3.2], [76.1, 4], [88.9, 3.2], [88.9, 4], [88.9, 5], [114.3, 4], [114.3, 5], [114.3, 6.3], [139.7, 5], [139.7, 6.3], [168.3, 5], [168.3, 6.3], [168.3, 8], [193.7, 6.3], [219.1, 6.3], [219.1, 8], [244.5, 8], [273, 8], [273, 10], [323.9, 8], [323.9, 10]];
  // T (EN 10055, h = b; tw = tf = t; r1 = t, r2 = t/2): [h, t]
  const TT = [[30, 4], [35, 4.5], [40, 5], [45, 5.5], [50, 6], [60, 7], [70, 8], [80, 9], [100, 11], [120, 13], [140, 15]];
  // Lama (EN 10058): genişlik × kalınlık
  const LAMA = []; for (const b of [20, 25, 30, 40, 50, 60, 70, 80, 100, 120, 150, 200, 250, 300]) for (const t of [4, 5, 6, 8, 10, 12, 15, 20, 25, 30]) if (t <= b / 2.5 && (b >= 100 || t <= 20)) LAMA.push([b, t]);

  const fx = v => String(+(+v).toFixed(1)).replace(/\.0$/, '');
  /* aile tanımları: tur (şekil), std, ad üretimi, ölçü nesnesi */
  const AILE = {
    HEA: { ad: 'HEA', uzun: 'Geniş başlıklı I (HEA)', tur: 'I', std: 'EN 10365', liste: HEA.map(r => ({ ad: 'HEA' + r[0], h: r[1], b: r[2], tw: r[3], tf: r[4], r: r[5] })) },
    HEB: { ad: 'HEB', uzun: 'Geniş başlıklı I (HEB)', tur: 'I', std: 'EN 10365', liste: HEB.map(r => ({ ad: 'HEB' + r[0], h: r[1], b: r[2], tw: r[3], tf: r[4], r: r[5] })) },
    HEM: { ad: 'HEM', uzun: 'Geniş başlıklı I (HEM)', tur: 'I', std: 'EN 10365', liste: HEM.map(r => ({ ad: 'HEM' + r[0], h: r[1], b: r[2], tw: r[3], tf: r[4], r: r[5] })) },
    IPE: { ad: 'IPE', uzun: 'I profil (IPE)', tur: 'I', std: 'EN 10365', liste: IPE.map(r => ({ ad: 'IPE' + r[0], h: r[1], b: r[2], tw: r[3], tf: r[4], r: r[5] })) },
    IPN: { ad: 'IPN', uzun: 'I profil (IPN / NPI, eğimli başlık)', tur: 'IN', std: 'DIN 1025-1', liste: IPN.map(r => ({ ad: 'IPN' + r[0], h: r[1], b: r[2], tw: r[3], tf: r[4], r: r[3], r2: +(0.6 * r[3]).toFixed(2), egim: 0.14 })) },
    UPN: { ad: 'UPN', uzun: 'U profil (UPN / NPU, eğimli başlık)', tur: 'UN', std: 'DIN 1026-1', liste: UPN.map(r => ({ ad: 'UPN' + r[0], h: r[1], b: r[2], tw: r[3], tf: r[4], r: r[4], r2: r[4] / 2, egim: r[1] > 300 ? 0.05 : 0.08 })) },
    UPE: { ad: 'UPE', uzun: 'U profil (UPE, paralel başlık)', tur: 'U', std: 'DIN 1026-2', liste: UPE.map(r => ({ ad: 'UPE' + r[0], h: r[1], b: r[2], tw: r[3], tf: r[4], r: r[5] })) },
    L: { ad: 'L', uzun: 'Eşit kenarlı köşebent', tur: 'L', std: 'EN 10056-1', liste: LE.map(r => ({ ad: `L${fx(r[0])}x${fx(r[1])}x${fx(r[2])}`, h: r[0], b: r[1], t: r[2], r: r[3], r2: r[3] / 2 })) },
    LU: { ad: 'L', uzun: 'Eşit olmayan kenarlı köşebent', tur: 'L', std: 'EN 10056-1', liste: LU.map(r => ({ ad: `L${fx(r[0])}x${fx(r[1])}x${fx(r[2])}`, h: r[0], b: r[1], t: r[2], r: r[3], r2: r[3] / 2 })) },
    SHS: { ad: 'Kutu', uzun: 'Kare kutu profil (SHS)', tur: 'RHS', std: 'EN 10219', liste: SHS.map(r => ({ ad: `KUTU${fx(r[0])}x${fx(r[1])}x${fx(r[2])}`, h: r[0], b: r[1], t: r[2] })) },
    RHS: { ad: 'Kutu', uzun: 'Dikdörtgen kutu profil (RHS)', tur: 'RHS', std: 'EN 10219', liste: RHS.map(r => ({ ad: `KUTU${fx(r[0])}x${fx(r[1])}x${fx(r[2])}`, h: r[0], b: r[1], t: r[2] })) },
    CHS: { ad: 'Boru', uzun: 'Boru profil (CHS)', tur: 'CHS', std: 'EN 10219', liste: CHS.map(r => ({ ad: `BORU${fx(r[0])}x${fx(r[1])}`, h: r[0], b: r[0], D: r[0], t: r[1] })) },
    T: { ad: 'T', uzun: 'T profil', tur: 'T', std: 'EN 10055', liste: TT.map(r => ({ ad: 'T' + r[0], h: r[0], b: r[0], tw: r[1], tf: r[1], r: r[1], r2: r[1] / 2 })) },
    LAMA: { ad: 'Lama', uzun: 'Lama (yassı çelik)', tur: 'FL', std: 'EN 10058', liste: LAMA.map(r => ({ ad: `LAMA${r[0]}x${r[1]}`, h: r[1], b: r[0], t: r[1] })) },
  };
  const IDX = {}; for (const [k, a] of Object.entries(AILE)) for (const p of a.liste) { p.aile = k; p.tur = a.tur; p.std = a.std; IDX[p.ad] = p; }

  /* ad çözme: "HEA 200", "HE200A", "NPI200", "U100", "L 50x50x5", "L50.5", "Kutu 100×100×5", "Ø114,3×6,3", "-50x5" */
  const adCoz = s => {
    let t = String(s == null ? '' : s).toUpperCase().replace(/İ/g, 'I').replace(/[×*]/g, 'X').replace(/,/g, '.').replace(/\s+/g, '');
    if (IDX[t]) return t;
    let m;
    if ((m = /^HE(\d+)([ABM])$/.exec(t))) t = 'HE' + m[2] + m[1];
    else if ((m = /^(NPI|I)(\d+)$/.exec(t))) t = 'IPN' + m[2];
    else if ((m = /^(NPU|U)(\d+)$/.exec(t))) t = 'UPN' + m[2];
    else if ((m = /^L(\d+(?:\.\d+)?)[X.](\d+(?:\.\d+)?)$/.exec(t))) t = `L${m[1]}X${m[1]}X${m[2]}`;
    else if ((m = /^(?:Ø|O|CHS|BORU)(\d+(?:\.\d+)?)X(\d+(?:\.\d+)?)$/.exec(t))) t = `BORU${m[1]}X${m[2]}`;
    else if ((m = /^(?:SHS|RHS|KUTU|KUTUPROFIL)(\d+)X(\d+)(?:X(\d+(?:\.\d+)?))?$/.exec(t))) t = m[3] ? `KUTU${m[1]}X${m[2]}X${m[3]}` : `KUTU${m[1]}X${m[1]}X${m[2]}`;
    else if ((m = /^(?:-|LAMA|FL|FLT)(\d+)X(\d+)$/.exec(t))) t = `LAMA${m[1]}X${m[2]}`;
    t = t.replace(/X/g, 'x').replace(/^(KUTU|BORU|LAMA|L)/, x => x);
    return IDX[t] ? t : (IDX[t.replace(/^l/, 'L')] ? t.replace(/^l/, 'L') : null);
  };

  /* ---------------- GEOMETRİ ---------------- */
  /* köşeleri yuvarlatılmış çokgen: v = [[x, y, r?] …] (kapalı). r > 0 köşede teğet yay (iç / dış köşe fark etmez). */
  const yuvarla = (v, seg) => {
    const out = [], n = v.length, adim = seg || Math.PI / 24;
    for (let i = 0; i < n; i++) {
      const P = v[(i - 1 + n) % n], V = v[i], N = v[(i + 1) % n], r = +V[2] || 0;
      if (r <= 0) { out.push([V[0], V[1]]); continue; }
      const l1 = Math.hypot(P[0] - V[0], P[1] - V[1]), l2 = Math.hypot(N[0] - V[0], N[1] - V[1]);
      const u1 = [(P[0] - V[0]) / l1, (P[1] - V[1]) / l1], u2 = [(N[0] - V[0]) / l2, (N[1] - V[1]) / l2];
      const th = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]))); if (th < 1e-6 || th > Math.PI - 1e-6) { out.push([V[0], V[1]]); continue; }
      const d = r / Math.tan(th / 2), bl = Math.hypot(u1[0] + u2[0], u1[1] + u2[1]), bis = [(u1[0] + u2[0]) / bl, (u1[1] + u2[1]) / bl], cd = r / Math.sin(th / 2);
      const c = [V[0] + bis[0] * cd, V[1] + bis[1] * cd], T1 = [V[0] + u1[0] * d, V[1] + u1[1] * d], T2 = [V[0] + u2[0] * d, V[1] + u2[1] * d];
      const a1 = Math.atan2(T1[1] - c[1], T1[0] - c[0]); let da = Math.atan2(T2[1] - c[1], T2[0] - c[0]) - a1; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const k = Math.max(2, Math.ceil(Math.abs(da) / adim)); for (let j = 0; j <= k; j++) { const a = a1 + da * j / k; out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); }
    }
    return out;
  };
  const alanIsaret = q => { let s = 0; for (let i = 0, n = q.length; i < n; i++) { const a = q[i], b = q[(i + 1) % n]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  const yon = (q, ccw) => (alanIsaret(q) > 0) === ccw ? q : q.slice().reverse();
  const daire = (r, n) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o.push([r * Math.cos(a), r * Math.sin(a)]); } return o; };
  const kayd = (q, dx, dy) => q.map(p => [p[0] + dx, p[1] + dy]);

  /* kesit dış hattı (mm), sınır kutusunun merkezi orijinde. Döner { dis: [[x,y]] (saat tersi), ic: [[x,y]] | null (saat yönü), p } */
  const KES = {};
  const kesit = ad => {
    const p = typeof ad === 'object' ? ad : IDX[adCoz(ad)]; if (!p) return null; if (KES[p.ad]) return KES[p.ad];
    const h = p.h, b = p.b; let dis, ic = null;
    if (p.tur === 'I') { const { tw, tf, r } = p, H = h / 2, B = b / 2, w = tw / 2;
      dis = yuvarla([[-B, -H], [B, -H], [B, -H + tf], [w, -H + tf, r], [w, H - tf, r], [B, H - tf], [B, H], [-B, H], [-B, H - tf], [-w, H - tf, r], [-w, -H + tf, r], [-B, -H + tf]]); }
    else if (p.tur === 'IN') { const { tw, tf, r, r2, egim } = p, H = h / 2, B = b / 2, w = tw / 2, xm = B / 2; // tf, başlık ucundan b/4 içeride
      const yi = x => H - (tf + egim * (xm - x)); // üst başlık iç yüzü
      dis = yuvarla([[-B, -H], [B, -H], [B, -yi(B), r2], [w, -yi(w), r], [w, yi(w), r], [B, yi(B), r2], [B, H], [-B, H], [-B, yi(B), r2], [-w, yi(w), r], [-w, -yi(w), r], [-B, -yi(B), r2]]); }
    else if (p.tur === 'UN' || p.tur === 'U') { const { tw, tf, r } = p, H = h / 2, eg = p.tur === 'UN' ? p.egim : 0, r2 = p.tur === 'UN' ? p.r2 : 0, xm = b / 2;
      const yi = x => H - (tf + eg * (xm - x)); // sırt x = 0
      dis = kayd(yuvarla([[0, -H], [b, -H], [b, -yi(b), r2], [tw, -yi(tw), r], [tw, yi(tw), r], [b, yi(b), r2], [b, H], [0, H]]), -b / 2, 0); }
    else if (p.tur === 'L') { const { t, r, r2 } = p; // dikey kol h (sol), yatay kol b (alt)
      dis = kayd(yuvarla([[0, 0], [b, 0], [b, t, r2], [t, t, r], [t, h, r2], [0, h]]), -b / 2, -h / 2); }
    else if (p.tur === 'T') { const { tw, tf, r, r2 } = p, H = h / 2, B = b / 2, w = tw / 2, r3 = tw / 4;
      dis = yuvarla([[-w, -H, r3], [w, -H, r3], [w, H - tf, r], [B, H - tf, r2], [B, H], [-B, H], [-B, H - tf, r2], [-w, H - tf, r]]); }
    else if (p.tur === 'RHS') { const t = p.t, ro = t <= 6 ? 2 * t : t <= 10 ? 2.5 * t : 3 * t, ri = ro - t, H = h / 2, B = b / 2;
      dis = yuvarla([[-B, -H, ro], [B, -H, ro], [B, H, ro], [-B, H, ro]]); ic = yuvarla([[-B + t, -H + t, ri], [B - t, -H + t, ri], [B - t, H - t, ri], [-B + t, H - t, ri]]); }
    else if (p.tur === 'CHS') { dis = daire(p.D / 2, 64); ic = daire(p.D / 2 - p.t, 64); }
    else if (p.tur === 'FL') { const H = h / 2, B = b / 2; dis = [[-B, -H], [B, -H], [B, H], [-B, H]]; }
    else return null;
    const o = { dis: yon(dis, true), ic: ic ? yon(ic, false) : null, p };
    return (KES[p.ad] = o);
  };

  /* halkalardan kesit değerleri (mm biriminde): dış saat tersi, delik saat yönü — işaretli toplam delikleri düşer */
  const ozellik = halkalar => {
    let A = 0, Sx = 0, Sy = 0, Ixx = 0, Iyy = 0, Ixy = 0, xmn = Infinity, xmx = -Infinity, ymn = Infinity, ymx = -Infinity;
    for (const q of halkalar) { if (!q) continue; for (let i = 0, n = q.length; i < n; i++) { const [x0, y0] = q[i], [x1, y1] = q[(i + 1) % n], a = x0 * y1 - x1 * y0;
      A += a / 2; Sx += (x0 + x1) * a / 6; Sy += (y0 + y1) * a / 6; Ixx += (y0 * y0 + y0 * y1 + y1 * y1) * a / 12; Iyy += (x0 * x0 + x0 * x1 + x1 * x1) * a / 12; Ixy += (x0 * y1 + 2 * x0 * y0 + 2 * x1 * y1 + x1 * y0) * a / 24;
      xmn = Math.min(xmn, x0); xmx = Math.max(xmx, x0); ymn = Math.min(ymn, y0); ymx = Math.max(ymx, y0); } }
    const cx = Sx / A, cy = Sy / A, Ix = Ixx - A * cy * cy, Iy = Iyy - A * cx * cx, Ixyc = Ixy - A * cx * cy;
    return { A, cx, cy, Ix, Iy, Ixy: Ixyc, ex: Math.max(ymx - cy, cy - ymn), ey: Math.max(xmx - cx, cx - xmn) };
  };

  /* profil: ölçüler + kesit değerleri (önbellekli) */
  const OZ = {};
  const profil = ad => {
    const k = adCoz(ad); if (!k) return null; if (OZ[k]) return OZ[k];
    const p = IDX[k], ks = kesit(p); let g = ozellik([ks.dis, ks.ic]);
    if (p.tur === 'CHS') { const D = p.D, d = D - 2 * p.t, I = Math.PI / 64 * (D ** 4 - d ** 4); g = { A: Math.PI / 4 * (D * D - d * d), cx: 0, cy: 0, Ix: I, Iy: I, Ixy: 0, ex: D / 2, ey: D / 2 }; } // daire: tam formül
    let I1 = g.Ix, I2 = g.Iy;
    if (p.tur === 'L') { const m = (g.Ix + g.Iy) / 2, R = Math.hypot((g.Ix - g.Iy) / 2, g.Ixy); I1 = m + R; I2 = m - R; } // köşebent asal eksenleri (u, v)
    const o = Object.assign({}, p, {
      A: g.A / 100, G: g.A * 1e-6 * RO, Ix: g.Ix / 1e4, Iy: g.Iy / 1e4, Wx: g.Ix / g.ex / 1e3, Wy: g.Iy / g.ey / 1e3,
      ix: Math.sqrt(g.Ix / g.A) / 10, iy: Math.sqrt(g.Iy / g.A) / 10, ex: g.cx, ey: g.cy, // ex, ey: ağırlık merkezinin sınır kutusu merkezine göre kayması (mm)
      Iu: I1 / 1e4, Iv: I2 / 1e4, iv: Math.sqrt(I2 / g.A) / 10,
      U: cevre(ks) / 1000, // boya alanı m²/m
    });
    return (OZ[k] = o);
  };
  const cevre = ks => { let s = 0; for (const q of [ks.dis, ks.ic]) if (q) for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; s += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s; };
  const aile = k => AILE[k] || null;
  const adlar = k => (AILE[k] ? AILE[k].liste.map(p => p.ad) : []);
  const aileOf = ad => { const k = adCoz(ad); return k ? IDX[k].aile : null; };
  /* kısa gösterim: "HEA 200", "L 50×50×5", "□ 100×100×5", "Ø 114,3×6,3", "Lama 50×5" */
  const goster = ad => { const k = adCoz(ad); if (!k) return String(ad || ''); const p = IDX[k], tr = v => String(v).replace('.', ',');
    if (/^(HE[ABM]|IP[EN]|UP[NE])/.test(k)) return k.replace(/(\D+)(\d+)/, '$1 $2'); if (p.tur === 'T') return 'T ' + p.h;
    if (p.tur === 'L') return `L ${tr(fx(p.h))}×${tr(fx(p.b))}×${tr(fx(p.t))}`; if (p.tur === 'RHS') return `□ ${fx(p.h)}×${fx(p.b)}×${tr(fx(p.t))}`;
    if (p.tur === 'CHS') return `Ø ${tr(fx(p.D))}×${tr(fx(p.t))}`; if (p.tur === 'FL') return `Lama ${p.b}×${p.t}`; return k; };

  /* ---------------- METRAJ ----------------
     liste: [{ prof, L (m), adet? }] ; levhalar: [{ ad, a (m), b (m), t (m), adet? }] ; bulonlar: [{ ad, adet, kg? }]
     → { satirlar: [{ prof, goster, adet, boy (m), G (kg/m), kg, boya (m²) }], levha: [...], toplam (kg), boya (m²) } */
  const metraj = (liste, levhalar, bulonlar) => {
    const by = {};
    for (const it of liste || []) { const k = adCoz(it.prof); if (!k) continue; const p = profil(k), n = +it.adet || 1, L = Math.max(0, +it.L || 0);
      const o = by[k] || (by[k] = { prof: k, goster: goster(k), adet: 0, boy: 0, G: p.G, kg: 0, boya: 0, aile: p.aile }); o.adet += n; o.boy += L * n; o.kg += L * n * p.G; o.boya += L * n * p.U; }
    const sira = Object.keys(AILE), satirlar = Object.values(by).sort((a, b) => sira.indexOf(a.aile) - sira.indexOf(b.aile) || IDX[a.prof].h - IDX[b.prof].h || a.prof.localeCompare(b.prof));
    const lv = {}; for (const l of levhalar || []) { const n = +l.adet || 1, kg1 = (+l.a) * (+l.b) * (+l.t) * RO, key = `${l.ad || 'Levha'}|${(+l.a * 1000).toFixed(0)}x${(+l.b * 1000).toFixed(0)}x${(+l.t * 1000).toFixed(0)}`;
      const o = lv[key] || (lv[key] = { ad: l.ad || 'Levha', olcu: `${(+l.a * 1000).toFixed(0)}×${(+l.b * 1000).toFixed(0)}×${(+l.t * 1000).toFixed(0)}`, adet: 0, kg: 0 }); o.adet += n; o.kg += kg1 * n; }
    const bl = {}; for (const x of bulonlar || []) { const o = bl[x.ad] || (bl[x.ad] = { ad: x.ad, adet: 0, kg: 0 }); o.adet += +x.adet || 1; o.kg += (+x.kg || 0) * (+x.adet || 1); }
    const levha = Object.values(lv), bulon = Object.values(bl);
    const toplam = satirlar.reduce((s, r) => s + r.kg, 0) + levha.reduce((s, r) => s + r.kg, 0) + bulon.reduce((s, r) => s + r.kg, 0);
    return { satirlar, levha, bulon, toplam, boya: satirlar.reduce((s, r) => s + r.boya, 0) + levha.reduce((s, r) => s + 0, 0) };
  };

  /* ---------------- BİRLEŞİM ÖNERİLERİ (ön boyut; statik hesap yerine geçmez) ----------------
     taban levhası: kolon kesitinin her yanından ≥ 50 mm taşma + ankraj kenar mesafesi; 4 ankraj (h ≥ 400 mm'de 6), çap ve kalınlık kesit boyuna göre */
  const yuk = (v, s) => Math.ceil(v / s - 1e-9) * s;
  const tabanOneri = ad => { const p = profil(ad); if (!p) return null; const h = p.h, b = p.b, d = h <= 200 ? 20 : h <= 400 ? 24 : 30, kenar = Math.max(40, 2 * d);
    const a = yuk(h + 2 * (kenar + d), 50), bb = yuk(b + 2 * (kenar + 10), 50), t = h <= 160 ? 15 : h <= 300 ? 20 : h <= 500 ? 25 : 30, n = h >= 400 ? 6 : 4;
    return { a, b: bb, t, d, n, kenar, L: yuk(25 * d, 50), harc: 30 }; }; // mm; L: ankraj gömme boyu (≈ 25 d), harc: altına grout kalınlığı
  /* alın levhası (kiriş ucu, kolona bulonlu): taşmalı tip; bulon çapı ve sırası kiriş yüksekliğine göre */
  const alinOneri = ad => { const p = profil(ad); if (!p) return null; const h = p.h, d = h <= 240 ? 16 : h <= 400 ? 20 : 24, tas = yuk(2.5 * d + 15, 5);
    return { a: h + 2 * tas, b: Math.max(p.b, yuk(p.b + 20, 10)), t: h <= 240 ? 15 : h <= 400 ? 20 : 25, d, n: h <= 300 ? 6 : 8, tas, g: Math.max(60, yuk(p.b - 2 * 1.5 * d, 10)) }; }; // g: bulon yatay aralığı
  /* statik çözücü için çubuk özellikleri (SI): A m², Ix / Iy m⁴, E N/m², G kg/m */
  const cubuk = ad => { const p = profil(ad); if (!p) return null; return { ad: p.ad, A: p.A * 1e-4, Ix: p.Ix * 1e-8, Iy: p.Iy * 1e-8, Wx: p.Wx * 1e-6, Wy: p.Wy * 1e-6, E: 210e9, G: p.G }; };

  C.celik = { AILE, IDX, profil, aile, adlar, aileOf, adCoz, kesit, ozellik, yuvarla, metraj, goster, tabanOneri, alinOneri, cubuk, RO,
    MALZEME: [['S235', 'S235 (St 37)'], ['S275', 'S275 (St 44)'], ['S355', 'S355 (St 52)']] };
})(typeof window !== 'undefined' ? window.C : (globalThis.C = globalThis.C || {}));

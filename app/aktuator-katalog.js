/* ArıtmaCAD — ELEKTRİKLİ AKTÜATÖR KATALOĞU (çok turlu, aç-kapa görevi, 3 fazlı 400 V / 50 Hz, S2-15 dk)
   Kapak (penstok), vana vb. yükselen milli ekipmanın aktüatör boyunu ve motor gücünü programın kendisi seçsin diye sabit tablo
   (kullanıcı 21.11.2026: "katalog tablosundaki güç değerleri programda sabit olsun ki diğer işlerde de program otomatik bulabilsin").
   Kaynak: üretici teknik föyü "Multi-turn actuators for open-close duty with 3-phase AC motor" (Y004.785, baskı 1.23) ve
   "Electrical data … Short-time duty S2 - 15 min, 400 V/50 Hz" (Y004.858, baskı 1.11). Projede marka / model yazılmaz:
   boylar genel adla (AKT-1 … AKT-6), bağlantı flanşı ISO 5210 adıyla anılır.
   P: motor mil gücü kW (çalışma torkunda ≈ maks. torkun %35'i — föy notu), çıkış devrine göre.
   Seçim: gerekli mil torku × emniyet ≤ boyun maks. torku (tork, ailedeki mil çapıyla — güvenli yanda — hesaplanır; mil çapı sınırı yalnız o.milSart ile).
   Saf kısım Node ile denenir (test/aktuator-katalog.test.js). */
(function (C) {
  'use strict';
  const DEVIR = [4, 5.6, 8, 11, 16, 22, 32, 45, 63, 90, 125, 180]; // çıkış devri d/dk (50 Hz)
  const KATALOG = [
    { boy: 'AKT-1', Tmin: 10, Tmax: 30, flans: 'F07', milMax: 26, kg: 19, P: [0.02, 0.02, 0.04, 0.04, 0.06, 0.06, 0.10, 0.10, 0.20, 0.20, 0.30, 0.30] },
    { boy: 'AKT-2', Tmin: 20, Tmax: 60, flans: 'F07', milMax: 26, kg: 20, P: [0.03, 0.03, 0.06, 0.06, 0.12, 0.12, 0.20, 0.20, 0.40, 0.40, 0.50, 0.50] },
    { boy: 'AKT-3', Tmin: 40, Tmax: 120, flans: 'F10', milMax: 40, kg: 22, P: [0.06, 0.06, 0.12, 0.12, 0.25, 0.25, 0.40, 0.40, 0.70, 0.70, null, null] }, // 125 / 180 d/dk satırı föyden okunamadı
    { boy: 'AKT-4', Tmin: 100, Tmax: 250, flans: 'F14', milMax: 58, kg: 44, P: [0.12, 0.12, 0.25, 0.25, 0.45, 0.45, 0.75, 0.75, 1.40, 1.40, 1.80, 1.80] },
    { boy: 'AKT-5', Tmin: 200, Tmax: 500, flans: 'F14', milMax: 58, kg: 46, P: [0.20, 0.20, 0.40, 0.40, 0.80, 0.80, 1.60, 1.60, 3.00, 3.00, 3.30, 3.30] },
    { boy: 'AKT-6', Tmin: 400, Tmax: 1000, flans: 'F16', milMax: 77, kg: 67, P: [0.40, 0.40, 0.80, 0.80, 1.50, 1.50, 3.00, 3.00, 5.00, 5.00, 6.00, 6.00] },
  ];
  /* KABULLER (kullanıcıya soruldu, onaylanana kadar bu değerler): */
  const KABUL = {
    devir: 32,        // çıkış devri d/dk — TR48×8 milde ≈ 256 mm/dk kaldırma hızı
    emniyet: 1.25,    // gerekli torka emniyet katsayısı
    muSizdirmaz: 0.30, // kapak sızdırmazlık / kızak sürtünmesi (su kuvvetine)
    muDis: 0.15,      // trapez vida dişi sürtünmesi
  };
  /* trapez vida adımı (ISO 2904, mil çapına göre) */
  const adim = d => d <= 24 ? 5 : d <= 32 ? 6 : d <= 40 ? 7 : d <= 50 ? 8 : d <= 60 ? 9 : 10;

  /* penstok / yükselen milli kapak: gerekli mil itme kuvveti ve torku.
     o: { B, H (mm), hw (kapak eşiğinden su derinliği, mm), G (kapak + mil ağırlığı, kg), mil (mm) } → { Fw kN, F kN, T Nm } */
  function penstokTork(o) {
    const b = (+o.B || 0) / 1000, h = (+o.H || 0) / 1000, w = Math.max(0, (+o.hw || 0) / 1000), g = 9.81;
    const Fw = w >= h ? g * b * h * (w - h / 2) : g * b * w * w / 2; // kN — tek taraflı hidrostatik (kanal bir yanda boş)
    const F = (+o.G || 0) * g / 1000 + KABUL.muSizdirmaz * Fw;       // kN
    const d = +o.mil || 48, p = adim(d), dm = d - p / 2, alfa = Math.atan(p / (Math.PI * dm)), rho = Math.atan(KABUL.muDis / Math.cos(15 * Math.PI / 180));
    const T = F * 1000 * (dm / 2000) * Math.tan(alfa + rho);          // Nm
    return { Fw, F, T, adim: p };
  }
  /* katalogdan boy seç: T (Nm) gerekli tork, o: { devir, mil } → { boy, Tmin, Tmax, flans, devir, P, Tgerekli } | null (katalog yetmez) */
  function sec(T, o) {
    o = o || {}; const n = +o.devir || KABUL.devir, i = DEVIR.indexOf(n) >= 0 ? DEVIR.indexOf(n) : DEVIR.findIndex(v => v >= n), mil = +o.mil || 0, Tg = T * KABUL.emniyet;
    for (const k of KATALOG) { if (k.Tmax < Tg || (o.milSart && mil && k.milMax < mil)) continue; /* mil çapı sınırı yalnız istenirse (kapakta mil, seçilen aktüatöre göre boyutlanır) */ const P = k.P[i]; if (P == null) continue; return { boy: k.boy, Tmin: k.Tmin, Tmax: k.Tmax, flans: k.flans, devir: DEVIR[i], P, kg: k.kg, Tgerekli: T }; }
    return null;
  }
  /* penstok için tek adım: kapak verisinden aktüatör */
  const penstokAktuator = o => { const r = penstokTork(o), s = sec(r.T, { devir: o.devir, mil: o.mil }); return s ? Object.assign(s, { F: r.F, Fw: r.Fw }) : null; };

  const API = { DEVIR, KATALOG, KABUL, adim, penstokTork, sec, penstokAktuator };
  if (C) C.aktuator = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window.C : null);

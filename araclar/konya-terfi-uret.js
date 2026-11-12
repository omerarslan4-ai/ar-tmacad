/* ArıtmaCAD — KONYA İSALE TERFİ MERKEZİ: İNŞAAT 3B MODELİ ÜRETİCİSİ (Node)
   Kullanım:  node araclar/konya-terfi-uret.js [cikti.aritma]
   Kaynak çizim: test-proje/konya/Konyaİsale_Terfi_mim+mek.dwg (Pompa holü planı, Montaj holü planı, A-A ve B-B kesitleri, 1/50).
   Yalnız inşaat kısımları: grobeton, radye, betonarme perdeler, kolonlar, kirişler, döşemeler, pompa kaideleri, kanallar (döşemede boşluk),
   tuğla duvarlar, pencere / kapı boşlukları, U merdiven, korkuluklar, kırma çatı, tretuvar ve rampa. Pompa, boru, vana, vinç gibi mekanik kısımlar YOK.
   Yerel çerçeve: x = uzun kenar (1 aksının dış yüzü = 0, 5 aksı dış yüzü = 19,70), y = kısa kenar (B aksı dış yüzü = 0, A aksı dış yüzü = 8,00).
   Kotlar: ±0.00 = +205,67 (montaj holü bitmiş zemin); z = mutlak kot − 205,67. Saf fonksiyonlar test/konya-terfi.test.js ile denenir. */
'use strict';
const fs = require('fs'), path = require('path');

const ABS0 = 205.67;                                  // ±0.00 mutlak kotu
const z = kot => +(kot - ABS0).toFixed(3);            // mutlak kot → model kotu
const cm = v => v / 100;

/* ---------- çizimden okunan ölçüler (cm, yerel çerçeve) ---------- */
const OLCU = {
  boy: 1970, en: 800,                                 // dış ölçüler
  kolonX: [0, 450, 900, 1350, 1920],                  // 50×50 kolonların sol kenarları (aks 1…5)
  kot: {
    grobetonAlt: 198.41, radyeAlt: 198.51, radyeUst: 198.91, dolguUst: 199.36, pompaHolu: 199.77,
    galeriUst: 205.41, mimariZemin: 205.67, toprak: 205.47, tretuvar: 205.57, sah1: 201.56, sah2: 203.35,
    kirisAltEnine: 210.11, kirisAltBoyuna: 210.41, catiDoseme: 210.91, guseUst: 208.81,
  },
};

/* ---------- belge kurucu ---------- */
function yeniBelge() {
  const K = OLCU.kot;
  const doc = {
    ents: [], layers: {}, cur: { layer: '0', color: 256, lt: 'BYLAYER', lw: -1 }, nextId: 1, layouts: [], blocks: {},
    set: {
      anno: 50, ltscale: 0.1, textH: 2.5, dimTextH: 2.5, dimArrow: 2.5, dimDec: 2, dimTick: false, lwdisp: true, name: 'Konya İsale Terfi Merkezi',
      // koordinat yok (çizim yerel koordinatlı); Konya için TM3 DOM 33° hazır, yalnız mode değiştirilir
      geo: { mode: 'none', lat0: 37.87, lon0: 32.48, rot: 0, cm: 33, k0: 1, fe: 500000, fn: 0, zone: 36 },
      seviye: {
        abs0: ABS0, toprak: z(K.toprak), aktif: 'Lkonyazemin',
        list: [
          { id: 'Lkonyacati', ad: 'Çatı', z: z(K.catiDoseme), kh: 1.2 },
          { id: 'Lkonyazemin', ad: 'Montaj holü (zemin kat)', z: 0, kh: 1.2 },
          { id: 'Lkonyapompa', ad: 'Pompa holü', z: z(K.pompaHolu), kh: 1.2 },
          { id: 'Lkonyatemel', ad: 'Temel altı', z: z(K.radyeAlt), kh: 1.2 },
        ],
      },
    },
  };
  // katman adları ve renkleri programın inşaat katmanlarıyla aynı (app/katman.js); rampa kullanıcı katmanında
  const RENK = { '0': [7, 25], INS_TEMEL_RADYE: [252, 50], INS_PERDE: [8, 50], INS_KOLON: [1, 50], INS_KIRIS: [3, 35], INS_DOSEME: [4, 35], INS_CATI_DOSEMESI: [140, 35],
    INS_DOLGU: [33, 18], INS_SU_TUTUCU_BANT: [5, 25], INS_DUVAR_TUGLA: [31, 35], INS_PENCERE: [5, 25], INS_KAPI: [30, 25],
    INS_MERDIVEN: [30, 25], INS_CATI: [30, 25], INS_TRETUVAR: [42, 25], RAMPA: [8, 25] };
  const kat = name => { if (!doc.layers[name]) { const r = RENK[name] || [7, 25]; doc.layers[name] = { name, color: r[0], lt: 'CONTINUOUS', lw: r[1], on: true, lock: false }; } return name; };
  kat('0');
  const ekle = (type, layer, props) => { kat(layer); const e = Object.assign({ id: doc.nextId++, type, layer, color: 256, lt: 'BYLAYER', lw: -1 }, props); doc.ents.push(e); return e; };
  return { doc, ekle };
}

/* ---------- yardımcılar (m) ---------- */
/* vinç yolu gusesi (B-B kesiti): kolonun kendi guse seçeneğiyle — çıkma 40 cm, kolon yüzünde 50 cm, uçta 30 cm, en = kolon eni */
const GUSE = { c: 0.40, hOn: 0.30, hKok: 0.50 };
const guse = (yon, zu) => ({ guse: 'E', gYon: yon, gRef: 'KOT', gZ: +zu.toFixed(3), gL: GUSE.c, gHf: GUSE.hKok, gHu: GUSE.hOn, gW: 0 });
const dik = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(p => p.map(v => +cm(v).toFixed(3)));     // cm dikdörtgen → m köşeler (CCW)
const kutu3 = (pts, za, zb) => ({ pts: pts.map(p => [p[0], p[1], za]), d: [0, 0, +(zb - za).toFixed(3)] });               // düşey boşluk prizması

/* pompa ve motor kaideleri (Pompa holü planı, D_BETON): 2,00 × 1,00 m, 30° döndürülmüş */
const KAIDE = [
  [[423, 373], [596, 473], [646, 387], [473, 287]],
  [[803, 373], [976, 473], [1026, 387], [853, 287]],
  [[1183, 373], [1356, 473], [1406, 387], [1233, 287]],
].map(k => k.map(p => [cm(p[0]), cm(p[1])]));

/* pompa holü tabanındaki kanallar (Beton_Kesik): 60 cm boru kanalı, pompalara 40 cm kollar, B duvarı boyunca 20/50 drenaj kanalı */
const KANAL = [
  { ad: 'Boru kanalı 60×60', r: dik(40, 525, 1155, 585), d: 0.60 },
  { ad: 'Kol kanalı 40', r: dik(355, 390, 395, 525), d: 0.60 },
  { ad: 'Kol kanalı 40', r: dik(735, 390, 775, 525), d: 0.60 },
  { ad: 'Kol kanalı 40', r: dik(1115, 390, 1155, 525), d: 0.60 },
  { ad: 'Drenaj kanalı 20/50', r: dik(95, 65, 1930, 85), d: 0.50 },
];

/* montaj holü galeri döşemesi (+205,41): kumanda odası + B duvarı boyunca yürüme şeridi + merdiven çevresi; ortası vinç boşluğu */
const GALERI = [[40, 30], [1930, 30], [1930, 645], [1481, 645], [1481, 770], [1300, 770], [1300, 520], [1730, 520], [1730, 200], [390, 200], [390, 770], [40, 770]].map(p => [cm(p[0]), cm(p[1])]);

/* yürüme yolu kirişleri [x0, y0, x1, y1, en] cm (eksen), 40/50 ve 50/50, üst +205,41 (A-A ve B-B kesitleri):
   boşluk kenarı hizasında boyuna kirişler y 520…560 (aks 4 → 5 aksı perdesi) ve y 200…240 (merdiven tarafı tam döşeme, x 1730 → 1930);
   B şeridinde aks 2, 3, 4 kolonlarından perdeye enine kirişler, A şeridinde aks 4 kolonuna enine kiriş. B şeridi kenarında kiriş yok (B-B kesiti) */
const GALERI_KIRIS = [
  [1730, 220, 1930, 220, 40], [1350, 540, 1930, 540, 40],
  [475, 30, 475, 200, 50], [925, 30, 925, 200, 50], [1375, 30, 1375, 200, 50], [1375, 560, 1375, 750, 50],
];

/* cephe pencereleri: alt sıra 70/150 (denizlik +206,41), üst sıra 300/60 (denizlik +209,81) — aks 2…5 açıklıklarında üçer + birer */
const ALT_PENCERE = [580, 700, 820, 1030, 1150, 1270, 1540, 1660, 1780];
const UST_PENCERE = [700, 1150, 1660];

function uret() {
  const B = yeniBelge(), K = OLCU.kot, ekle = B.ekle;
  // tSabit: programın 'ara döşemeleri en kalına eşitle' düzeltmesi bu modelin bilerek farklı kalınlıktaki döşemelerine dokunmasın
  const plak = (layer, pts, ust, t, o) => ekle('plak', layer, Object.assign({ kind: 'doseme', cati: false, sacak: 0, pts, t: +t.toFixed(3), zt: z(ust), beton: 'C30/37', tSabit: true }, o));
  const perde = (layer, pts, o) => ekle('perde', layer, Object.assign({ pts: pts.map(p => [cm(p[0]), cm(p[1])]), closed: false, egim: 'R', hiza: 'O', ofs: 0, malz: 'beton', beton: 'C30/37' }, o));
  const acik = (host, s, o) => ekle('acik', o.kind === 'kapi' ? 'INS_KAPI' : 'INS_PENCERE', Object.assign({ host: host.id, seg: 0, s: +cm(s).toFixed(3), kind: 'pencere', kanat: 1, yon: 'L', el: 'L', lento: true, lb: 0.1, lh: 0 }, o));
  const P1 = { w: 0.7, hh: 1.5, par: +(206.41 - K.galeriUst).toFixed(2) };            // 70/150 pencere, denizlik +206,41

  // 1) grobeton ve radye (radye dış yüzden 50 cm taşar, grobeton 60 cm)
  // 10 cm grobeton (+198,41 → +198,51) ayrı nesne değildir: programın kesitleri radye altına otomatik çizer, statik paftası notunda yazar
  plak('INS_TEMEL_RADYE', dik(-50, -50, 2020, 850), K.radyeUst, K.radyeUst - K.radyeAlt, { kind: 'radye' });

  // 2) pompa holü betonarme perdeleri: uzun kenarlar 30 cm, kısa kenarlar 40 cm, radye üstünden +205,41'e
  const hP = +(K.galeriUst - K.radyeUst).toFixed(3), zP = z(K.radyeUst);
  const perdeler = [
    perde('INS_PERDE', [[0, 15], [1970, 15]], { tb: 0.3, tt: 0.3, z0: zP, h: hP, ad: 'Perde B aksı' }),
    perde('INS_PERDE', [[0, 785], [1970, 785]], { tb: 0.3, tt: 0.3, z0: zP, h: hP, ad: 'Perde A aksı' }),
    perde('INS_PERDE', [[20, 30], [20, 770]], { tb: 0.4, tt: 0.4, z0: zP, h: hP, ad: 'Perde 1 aksı' }),
    perde('INS_PERDE', [[1950, 30], [1950, 770]], { tb: 0.4, tt: 0.4, z0: zP, h: hP, ad: 'Perde 5 aksı' }),
  ];
  // radye–perde birleşiminde PVC su tutucu bant (perde eksenlerinde)
  ekle('yalitim', 'INS_SU_TUTUCU_BANT', { kind: 'bant', dz: 0, pts: [[0.2, 0.15], [19.5, 0.15], [19.5, 7.85], [0.2, 7.85]], closed: true, z: zP, tip: 'pvc_i25', w: 20, t: 5 });

  // 3) kolonlar 50×50: radye üstünden enine kiriş altına (+210,11); aks 2…5 kolonlarında vinç yolu gusesi (B-B kesiti):
  //    kolon yüzünden 40 cm çıkma, üst +208,81 (vinç rayı altı), ön yüz 30 cm, alt yüz eğimli — kolon yüzünde 50 cm yükseklik
  const hK = +(K.kirisAltEnine - K.radyeUst).toFixed(3);
  // guse yönü içeri: B aksı kolonlarında +y (F), A aksı kolonlarında −y (A); 1 aksı kolonlarında guse yok
  for (const x of OLCU.kolonX) for (const y of [0, 750]) ekle('kolon', 'INS_KOLON', Object.assign({ sek: 'R', b: 0.5, d: 0.5, D: 0.5, h: hK, z0: zP, rot: 0, beton: 'C30/37', p: [cm(x + 25), cm(y + 25), 0] },
    x > 0 ? guse(y === 0 ? 'F' : 'A', z(K.guseUst)) : {}));

  // 4) pompa holü tabanı: sıkıştırılmış dolgu + taban betonu (kanallar ve kaideler boşluk), pompa-motor kaideleri
  ekle('dolgu', 'INS_DOLGU', { pts: dik(40, 30, 1930, 770), za: zP, zb: z(K.dolguUst), malz: 'kum' });
  const tabanBos = KANAL.map(k => kutu3(k.r, z(K.pompaHolu) - k.d, z(K.pompaHolu) + 0.01)).concat(KAIDE.map(k => kutu3(k, z(K.dolguUst) - 0.01, z(K.pompaHolu) + 0.01)));
  plak('INS_DOSEME', dik(40, 30, 1930, 770), K.pompaHolu, K.pompaHolu - K.dolguUst, { ad: 'Pompa holü taban betonu', bosluk3: tabanBos });
  KAIDE.forEach((k, i) => plak('INS_DOSEME', k, K.pompaHolu + 0.05, K.pompaHolu + 0.05 - K.dolguUst, { ad: `Pompa ve motor kaidesi ${i + 1}` }));

  // 5) montaj holü galeri döşemesi (15 cm, üst +205,41), saç kapak boşluğu 100×100; kumanda odası bölme duvarı altında 40×60 kiriş; 26 cm tesviye/şap
  plak('INS_DOSEME', GALERI, K.galeriUst, 0.15, { beton: 'C25/30', ad: 'Galeri döşemesi', bosluk3: [kutu3(dik(1770, 100, 1870, 200), z(K.galeriUst) - 0.16, z(K.galeriUst) + 0.01)] });
  ekle('kiris', 'INS_KIRIS', { a: [3.7, 0.3, 0], b: [3.7, 7.7, 0], bw: 0.4, hb: 0.6, zt: z(K.galeriUst), hiza: 'O', beton: 'C25/30' });
  // yürüme yolu kirişleri 40×50 (A-A ve B-B kesitleri, alt +204,91): vinç boşluğu kenarlarında boyuna kenar kirişi, aks 2…4'te kolona bağlanan enine kirişler
  for (const k of GALERI_KIRIS) ekle('kiris', 'INS_KIRIS', { a: [cm(k[0]), cm(k[1]), 0], b: [cm(k[2]), cm(k[3]), 0], bw: cm(k[4]), hb: 0.5, zt: z(K.galeriUst), hiza: 'O', beton: 'C25/30', ad: 'Yürüme yolu kirişi' });
  // şap tuğla duvarların iç yüzüne kadar (betonarme perde yüzünden 10 cm dışarı) — program da açılışta kenarları bu yüzlere bağlıyor
  const SAP = GALERI.map(([x, y]) => [x === 0.4 ? 0.2 : x === 19.3 ? 19.5 : x, y === 0.3 ? 0.2 : y === 7.7 ? 7.8 : y]);
  // taşıyıcı olmayan döşeme katmanları zemin kaplaması nesnesidir (statik hesaba döşeme olarak girmez): 20 cm tesviye betonu + 3,5 cm harç + 2,5 cm karo mozaik (mimari: KARO MOZAİK)
  ekle('kaplama', 'INS_KAPLAMA', { kind: 'zemin', pts: SAP, z0: z(K.galeriUst), zbt: 20, xps: 0, sap: 3.5, kap: 'karo', kt: 2.5, sup: 10 });

  // 6) çatı: enine kirişler 50×80 (her aksta), boyuna kirişler 30×50 (A ve B aksında), 15 cm çatı döşemesi (dış yüzden 50 cm saçak)
  for (const x of OLCU.kolonX) ekle('kiris', 'INS_KIRIS', { a: [cm(x + 25), 0, 0], b: [cm(x + 25), 8, 0], bw: 0.5, hb: +(K.catiDoseme - K.kirisAltEnine).toFixed(2), zt: z(K.catiDoseme), hiza: 'O', beton: 'C25/30' });
  for (const y of [15, 785]) ekle('kiris', 'INS_KIRIS', { a: [0, cm(y), 0], b: [19.7, cm(y), 0], bw: 0.3, hb: +(K.catiDoseme - K.kirisAltBoyuna).toFixed(2), zt: z(K.catiDoseme), hiza: 'O', beton: 'C25/30' });
  const catiPts = dik(-50, -50, 2020, 850);
  const catiD = plak('INS_CATI_DOSEMESI', catiPts, K.catiDoseme, 0.15, { cati: true, beton: 'C25/30', ad: 'Çatı döşemesi' });
  ekle('cati', 'INS_CATI', { kind: 'kirma', host: catiD.id, pts: catiPts, zt: z(K.catiDoseme), sacak: 0, ov: 0, deg: +(Math.atan(0.25) * 180 / Math.PI).toFixed(2), yal: 'doseme', cy: 8, knee: 0, kneeM: 'beton', deg1: 70, m1: 1, yon: 'on', alt: 'tahta18', xps: 5, su: 'bitum', ortu: 'marsilya', isk: 'E', msp: 0.45, mh: 0.12, mb: 0.05, asp: 2.1, ab: 0.1, ah: 0.12, dsp: 2.5, db: 0.1 });

  // 7) tuğla duvarlar (20 cm, dış yüz kolon yüzüyle aynı hizada) ve boşluklar
  const zD = z(K.galeriUst);
  const dB = perde('INS_DUVAR_TUGLA', [[0, 10], [1970, 10]], { tb: 0.2, tt: 0.2, z0: zD, h: +(K.kirisAltBoyuna - K.galeriUst).toFixed(2), malz: 'tugla', ad: 'Cephe duvarı B' });
  const dA = perde('INS_DUVAR_TUGLA', [[0, 790], [1970, 790]], { tb: 0.2, tt: 0.2, z0: zD, h: +(K.kirisAltBoyuna - K.galeriUst).toFixed(2), malz: 'tugla', ad: 'Cephe duvarı A' });
  const d1 = perde('INS_DUVAR_TUGLA', [[10, 20], [10, 780]], { tb: 0.2, tt: 0.2, z0: zD, h: +(K.kirisAltEnine - K.galeriUst).toFixed(2), malz: 'tugla', ad: 'Cephe duvarı 1' });
  const d5 = perde('INS_DUVAR_TUGLA', [[1960, 0], [1960, 800]], { tb: 0.2, tt: 0.2, z0: zD, h: +(K.kirisAltEnine - K.galeriUst).toFixed(2), malz: 'tugla', ad: 'Cephe duvarı 5 (giriş)' });
  const dK = perde('INS_DUVAR_TUGLA', [[380, 20], [380, 780]], { tb: 0.2, tt: 0.2, z0: zD, h: +(K.catiDoseme - 0.15 - K.galeriUst).toFixed(2), malz: 'tugla', ad: 'Kumanda odası bölme duvarı' });
  for (const x of ALT_PENCERE) { acik(dB, x, Object.assign({}, P1)); acik(dA, x, Object.assign({ yon: 'R' }, P1)); }
  for (const x of [190, 325]) acik(dB, x, Object.assign({}, P1));                         // kumanda odası pencereleri
  for (const x of UST_PENCERE) { const o = { w: 3.0, hh: 0.6, par: +(209.81 - K.galeriUst).toFixed(2), lento: false }; acik(dB, x, Object.assign({}, o)); acik(dA, x, Object.assign({ yon: 'R' }, o)); }
  const kapiH = +(K.mimariZemin + 2.5 - K.galeriUst).toFixed(2);                          // 250 cm kapı, bitmiş zeminden
  acik(d5, 120, { kind: 'kapi', w: 1.0, hh: kapiH, par: 0, kTip: 'C', kasa: 0.05, yon: 'L' });                         // K1 100/250 çelik kapı
  acik(d5, 405, { kind: 'kapi', w: 3.0, hh: +(K.kirisAltEnine - K.galeriUst).toFixed(2), par: 0, kTip: 'S', pnl: 0.5, ray: true, yon: 'L', lento: false }); // SEK1 300/470 seksiyonel kapı
  acik(d5, 626, Object.assign({ yon: 'L' }, P1));
  acik(dK, 105, { kind: 'kapi', w: 1.3, hh: kapiH, par: 0, kTip: 'C', kasa: 0.05, kanat: 2, yon: 'R' });             // K2 130/250
  acik(dK, 440, { w: 2.1, hh: 1.5, par: +(206.41 - K.galeriUst).toFixed(2), yon: 'R' });                       // P3 210/150 kumanda odası gözetleme penceresi

  // 8) U merdiven: 33 rıht × 17,88 cm, basamak 27 cm, 125 cm genişlik; sahanlıklar +201,56 ve +203,35
  //    Kol rıht sayıları 10 / 10 / 13 — program rıhtları yürüme çizgisi parça boylarına göre paylaştırdığı için son parça çizimdekinden uzun verildi
  //    (kolların ve sahanlıkların yeri parça boyundan değil, başlangıç noktası ve basamak ölçüsünden hesaplanır).
  ekle('merdiven', 'INS_MERDIVEN', { pts: [[15.62, 3.395], [18.675, 3.395], [18.675, 6.45], [14.545, 6.45]], z0: z(K.pompaHolu), z1: 0, w: 1.25, hmax: 17.88, b: 27, nos: 0, t: 15, sah: 0,
    tip: 'beton', hiza: 'O', kork: 'iki', km: 'galvaniz', kh: 110, dik: 150, tk: 'E', uz: 0, ad: 'M1 merdiveni (M1a + M1b + M1c)' });

  // 9) korkuluklar: vinç boşluğu ve merdiven boşluğu kenarı (galvaniz, 110 cm)
  const kork = pts => ekle('korkuluk', 'INS_MERDIVEN', { pts: pts.map(p => [cm(p[0]), cm(p[1]), 0]), km: 'galvaniz', kh: 110, dik: 150, tk: 'E', kapali: false });
  kork([[390, 200], [1730, 200], [1730, 520], [1300, 520], [1300, 770]]);
  kork([[1481, 645], [1930, 645]]);

  // 10) tretuvar (80 cm, +205,57) ve seksiyonel kapı önünde rampa (+205,47 → +205,67)
  ekle('tretuvar', 'INS_TRETUVAR', { pts: dik(0, 0, 1970, 800), w: 0.8, egim: 2, zg: z(K.toprak), h: +(K.tretuvar - K.toprak).toFixed(2), kap: 'karo', tk: 0, th: 3, tb: 10, ts: 15, bw: 10, bh: 30, bc: 0, by: 10, derz: 2 });
  const rT = z(K.toprak) - 0.2;
  ekle('kati', 'RAMPA', { o: [19.7, 5.75, rT], ux: [1, 0, 0], uz: [0, -1, 0], prof: [[0, 0], [2.35, 0], [2.35, +(z(K.toprak) - rT).toFixed(3)], [0, +(-rT).toFixed(3)]], h: 3.4, ad: 'Kapı önü rampası' });

  // render: malzemeler katman önerilerinden
  B.doc.set.render = { acik: false, ay: 6, saat: 10, ao: true, parlama: false, katman: {} };
  const say = {}; for (const e of B.doc.ents) say[e.type] = (say[e.type] || 0) + 1;
  return { doc: B.doc, ozet: { nesne: B.doc.ents.length, say } };
}

module.exports = { OLCU, ABS0, z, KAIDE, KANAL, GALERI, GALERI_KIRIS, GUSE, guse, uret };

if (require.main === module) {
  const cikti = process.argv[2] || path.join(__dirname, '..', 'test-proje', 'konya', 'Konya-terfi-insaat.aritma');
  const { doc, ozet } = uret();
  fs.writeFileSync(cikti, JSON.stringify({ format: 'aritmacad-proje', v: 1, app: 'konya-terfi-uret', kaydedildi: new Date().toISOString(), doc }));
  console.log(`Yazıldı: ${cikti}\n${ozet.nesne} nesne · ${JSON.stringify(ozet.say)}`);
}

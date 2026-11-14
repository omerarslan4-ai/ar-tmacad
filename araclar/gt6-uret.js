/* ArıtmaCAD — GT-6: İNŞAAT 3B MODELİ ÜRETİCİSİ (Node)
   Kullanım:  node araclar/gt6-uret.js [cikti.aritma]
   Kaynak çizim: test-proje/GT6/GT-6.dwg (alt kot planı, +10,00 üst plan, A-A / B-B / C-C kesitleri, görünüşler; 1/50, birim cm).
   Yalnız inşaat kısımları: radye, betonarme perdeler, ara (filtre) döşemesi ve kirişleri, üst döşemeler ve nervürleri, döşeme boşlukları
   (çelik kapak yerleri), dış kanal (B-B), kanal merdiveni, üstteki binanın kolonları, tuğla duvarları, pencere / kapıları ve çatı döşemesi.
   Boru, vana, kapak, pompa gibi mekanik kısımlar YOK.
   Yerel çerçeve: x = 1 aksından 3 aksına (1 aksı = 0, 2 aksı = 6,55, 3 aksı = 17,95), y = D aksından A aksına (D = 0, C = 8,425, B = 11,55, A = 14,40).
   Kotlar çizimdeki gibi (z = çizim kotu): taban −0,75, filtre döşemesi +5,45, üst döşeme ve bina zemini +10,00, çatı döşemesi +14,84.
   Plan / kesit birleşim kuralları (14.11.2026): kiriş–döşeme monolitik (program birleşik çizer), pencere / kapı duvarı bölmez, boşluklar duvarın içinde.
   Saf fonksiyonlar test/gt6.test.js ile denenir. */
'use strict';
const fs = require('fs'), path = require('path');

const cm = v => +(v / 100).toFixed(4);

/* ---------- çizimden okunan ölçüler (cm, yerel çerçeve) ---------- */
const OLCU = {
  aks: { x: { 1: 0, 2: 655, 3: 1795 }, y: { D: 0, C: 842.5, B: 1155, A: 1440 } },
  // ana hazne dış yüzleri: x −45 … 1835, y −55 … 1200 (D tarafı perde +5,55'e kadar 100 cm, üstü 90 cm)
  hazne: { x0: -45, x1: 1835, y0: -55, y1: 1200, ic: { x0: 45, x1: 1745, y0: 45 } },
  kanal: { x0: 615, x1: 1835, y0: 1200, y1: 1480, t: 80 },              // A tarafındaki açık kanal (B-B kesiti)
  bina: { x0: -30, x1: 1820, y0: -30, y1: 857.5, t: 30, sacak: 75 },    // üstteki bina dış yüzleri, 30 cm duvar, 75 cm saçak
  kot: {
    radyeAlt: -1.75, taban: -0.75, ustDoseme: 10.00, ustDosemeAlt: 9.70, nervurAlt: 9.00,
    filtre: 5.45, filtreAlt: 5.15, filtreKirisAlt: 4.95, perdeKademe: 5.55,
    kucukHazneUst: 9.85, ayakUst: 9.55, kanalTaban: 2.15, kanalAlt: 1.35, kanalUst: 9.85,
    toprak: 9.80, binaZemin: 10.00, denizlik: 10.90, pencereUst: 13.30, catiAlt: 14.64, cati: 14.84,
  },
};

/* üst döşeme nervürleri 40 cm (+10,00 planı, kesik çizgiler): eksen x, y 45 → 805; alt +9,00 */
const NERVUR_X = [180, 370, 480, 670, 780, 970, 1080, 1270, 1380, 1570];
/* filtre döşemesi kirişleri 30 / 50 (A-A kesiti): eksen x, y 45 → 805 */
const FILTRE_KIRIS_X = [425, 725, 1025, 1325, 1625];
/* üst döşeme boşlukları (çelik kapak yerleri): 150×150 (6) ve 110×110 (4) [x0, y0, x1, y1] cm */
const KAPAK_150 = [[200, 115, 350, 265], [200, 465, 350, 615], [500, 465, 650, 615], [800, 465, 950, 615], [1100, 465, 1250, 615], [1400, 465, 1550, 615]];
const KAPAK_110 = [[420, 895, 530, 1005], [885, 1000, 995, 1110], [1270, 895, 1380, 1005], [1635, 1000, 1745, 1110]];
/* y 805–880 arasındaki 75 cm perdede 50 cm geçiş boşlukları (alt plan) — sol kenarları x */
const GECIS_X = [280, 580, 880, 1180, 1480];
const GECIS = { w: 50, h: 50 };                                         // yükseklik çizimde yok: kabul
/* bina kolonları 30×30 (her iki uzun duvarda, 300 cm arayla) — sol kenarları x */
const BINA_KOLON_X = [130, 430, 730, 1030, 1330, 1630];
/* pencereler 240 cm, denizlik +10,90: C cephesi 75 cm, D cephesi 50 cm — sol kenarları x (duvar başı x = −30) */
const PENCERE_C = [55, 160, 355, 460, 655, 760, 955, 1060, 1255, 1360, 1555, 1660];
const PENCERE_D = [80, 160, 380, 460, 680, 760, 980, 1060, 1280, 1360, 1580, 1660];

/* ---------- belge kurucu ---------- */
function yeniBelge() {
  const doc = {
    ents: [], layers: {}, cur: { layer: '0', color: 256, lt: 'BYLAYER', lw: -1 }, nextId: 1, layouts: [], blocks: {},
    set: {
      anno: 50, ltscale: 0.1, textH: 2.5, dimTextH: 2.5, dimArrow: 2.5, dimDec: 2, dimTick: false, lwdisp: true, name: 'GT-6',
      geo: { mode: 'none', lat0: 39, lon0: 35, rot: 0, cm: 33, k0: 1, fe: 500000, fn: 0, zone: 36 },   // çizim yerel koordinatlı
      seviye: {
        abs0: 0, toprak: OLCU.kot.toprak, aktif: 'Lgt6bina',               // mutlak kot verilmedi: kotlar çizimdeki gibi
        list: [
          { id: 'Lgt6cati', ad: 'Çatı', z: OLCU.kot.cati, kh: 1.2 },
          { id: 'Lgt6bina', ad: 'Bina zemini / üst döşeme', z: OLCU.kot.binaZemin, kh: 1.2 },
          { id: 'Lgt6filtre', ad: 'Filtre döşemesi', z: OLCU.kot.filtre, kh: 1.2 },
          { id: 'Lgt6kanal', ad: 'Kanal tabanı', z: OLCU.kot.kanalTaban, kh: 1.2 },
          { id: 'Lgt6taban', ad: 'Hazne tabanı', z: OLCU.kot.taban, kh: 1.2 },
        ],
      },
    },
  };
  const RENK = { '0': [7, 25], INS_TEMEL_RADYE: [252, 50], INS_PERDE: [8, 50], INS_KOLON: [1, 50], INS_KIRIS: [3, 35], INS_DOSEME: [4, 35], INS_CATI_DOSEMESI: [140, 35],
    INS_DUVAR_TUGLA: [31, 35], INS_PENCERE: [5, 25], INS_KAPI: [30, 25], INS_MERDIVEN: [30, 25], INS_SU_TUTUCU_BANT: [5, 25] };
  const kat = name => { if (!doc.layers[name]) { const r = RENK[name] || [7, 25]; doc.layers[name] = { name, color: r[0], lt: 'CONTINUOUS', lw: r[1], on: true, lock: false }; } return name; };
  kat('0');
  const ekle = (type, layer, props) => { kat(layer); const e = Object.assign({ id: doc.nextId++, type, layer, color: 256, lt: 'BYLAYER', lw: -1 }, props); doc.ents.push(e); return e; };
  return { doc, ekle };
}

/* ---------- yardımcılar ---------- */
const dik = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(p => p.map(cm));          // cm dikdörtgen → m köşeler (CCW)
const kutu3 = (pts, za, zb) => ({ pts: pts.map(p => [p[0], p[1], za]), d: [0, 0, +(zb - za).toFixed(3)] });  // düşey boşluk prizması

function uret() {
  const B = yeniBelge(), K = OLCU.kot, H = OLCU.hazne, ekle = B.ekle;
  const plak = (layer, pts, ust, t, o) => ekle('plak', layer, Object.assign({ kind: 'doseme', cati: false, sacak: 0, pts, t: +t.toFixed(3), zt: ust, beton: 'C30/37', tSabit: true }, o));
  const perde = (pts, tb, z0, z1, o) => ekle('perde', o && o.malz === 'tugla' ? 'INS_DUVAR_TUGLA' : 'INS_PERDE',
    Object.assign({ pts: pts.map(p => [cm(p[0]), cm(p[1])]), closed: false, egim: 'R', hiza: 'O', ofs: 0, malz: 'beton', beton: 'C30/37', tb: cm(tb), tt: cm(tb), z0, h: +(z1 - z0).toFixed(3) }, o));
  const kiris = (a, b, bw, hb, zt, o) => ekle('kiris', 'INS_KIRIS', Object.assign({ a: [cm(a[0]), cm(a[1]), 0], b: [cm(b[0]), cm(b[1]), 0], bw: cm(bw), hb: +hb.toFixed(3), zt, hiza: 'O', beton: 'C30/37' }, o));
  const acik = (host, s, o) => ekle('acik', o.kind === 'kapi' ? 'INS_KAPI' : 'INS_PENCERE', Object.assign({ host: host.id, seg: 0, s: cm(s), kind: 'pencere', kanat: 1, yon: 'L', el: 'L', lento: true, lb: 0.1, lh: 0.3 }, o));

  // 1) radye 100 cm (−1,75 → −0,75), ana haznenin dış yüzleri; 10 cm grobeton programın kesitinde otomatik
  plak('INS_TEMEL_RADYE', dik(H.x0, H.y0, H.x1, H.y1), K.taban, K.taban - K.radyeAlt, { kind: 'radye' });

  // 2) ana hazne perdeleri (radye üstünden)
  //    D tarafı: +5,55'e kadar 100 cm, üstü 90 cm (iç yüz y = 45 sabit, dış yüz −55 → −45; C-C kesiti)
  const pDalt = perde([[H.x0, -5], [H.x1, -5]], 100, K.taban, K.perdeKademe, { ad: 'Perde D aksı (alt, 100 cm)' });
  const pDust = perde([[H.x0, 0], [H.x1, 0]], 90, K.perdeKademe, K.ustDoseme, { ad: 'Perde D aksı (üst, 90 cm)' });
  const pSol = perde([[0, 45], [0, 1110]], 90, K.taban, K.ustDoseme, { ad: 'Perde 1 aksı' });
  const pSag = perde([[1790, 45], [1790, 1110]], 90, K.taban, K.ustDoseme, { ad: 'Perde 3 aksı' });
  const pUst = perde([[H.x0, 1155], [H.x1, 1155]], 90, K.taban, K.kucukHazneUst, { ad: 'Perde B aksı' });
  //    büyük hazne ile küçük hazne arasındaki 75 cm perde (y 805 → 880), üst döşemenin altına; tabanında 5 geçiş boşluğu
  const pAra = perde([[45, 842.5], [1745, 842.5]], 75, K.taban, K.ustDosemeAlt, { ad: 'Ara perde (C aksı altı)' });
  pAra.bosluk3 = GECIS_X.map(x => ({ pts: [[cm(x), cm(800), K.taban], [cm(x + GECIS.w), cm(800), K.taban], [cm(x + GECIS.w), cm(800), K.taban + GECIS.h / 100], [cm(x), cm(800), K.taban + GECIS.h / 100]], d: [0, 0.85, 0] }));
  //    küçük haznedeki ayak (x 1025 → 1075, y 980 → 1110)
  perde([[1050, 980], [1050, 1110]], 50, K.taban, K.ayakUst, { ad: 'Küçük hazne ayağı' });
  // radye–perde birleşiminde PVC su tutucu bant (dış perde eksenlerinde)
  ekle('yalitim', 'INS_SU_TUTUCU_BANT', { kind: 'bant', dz: 0, pts: [[0, -0.05], [17.9, -0.05], [17.9, 11.55], [0, 11.55]].map(p => p.map(v => +v.toFixed(3))), closed: true, z: K.taban, tip: 'pvc_i25', w: 20, t: 5 });

  // 3) filtre döşemesi (+5,45, 30 cm) ve altındaki 30/50 kirişler (A-A kesiti)
  plak('INS_DOSEME', dik(H.ic.x0, H.ic.y0, H.ic.x1, 805), K.filtre, K.filtre - K.filtreAlt, { ad: 'Filtre döşemesi' });
  for (const x of FILTRE_KIRIS_X) kiris([x, 45], [x, 805], 30, K.filtre - K.filtreKirisAlt, K.filtre, { ad: 'Filtre döşemesi kirişi' });

  // 4) büyük hazne üst döşemesi (+10,00, 30 cm; y 45 → 880, ara perdenin üstünü de örter), 150×150 kapak boşlukları; 40 cm nervürler (alt +9,00)
  plak('INS_DOSEME', dik(H.ic.x0, H.ic.y0, H.ic.x1, 880), K.ustDoseme, K.ustDoseme - K.ustDosemeAlt,
    { ad: 'Üst döşeme', kenarSabit: true, /* kenarı alttaki ara perdeye oturur; program üstteki tuğla duvar yüzüne çekmesin */ bosluk3: KAPAK_150.map(k => kutu3(dik(...k), K.ustDosemeAlt - 0.01, K.ustDoseme + 0.01)) });
  for (const x of NERVUR_X) kiris([x, 45], [x, 805], 40, K.ustDoseme - K.nervurAlt, K.ustDoseme, { ad: 'Üst döşeme nervürü' });

  // 5) küçük hazne üst döşemesi (+9,85, 30 cm; y 880 → 1110), 110×110 kapak boşlukları
  plak('INS_DOSEME', dik(H.ic.x0, 880, H.ic.x1, 1110), K.kucukHazneUst, 0.30,
    { ad: 'Küçük hazne üst döşemesi', bosluk3: KAPAK_110.map(k => kutu3(dik(...k), K.kucukHazneUst - 0.31, K.kucukHazneUst + 0.01)) });

  // 6) A tarafındaki açık kanal (B-B kesiti): 80 cm taban (+1,35 → +2,15), 80 cm perdeler +9,85'e; üstü açık
  const KN = OLCU.kanal;
  plak('INS_TEMEL_RADYE', dik(KN.x0, KN.y0, KN.x1, KN.y1), K.kanalTaban, K.kanalTaban - K.kanalAlt, { kind: 'radye', ad: 'Kanal tabanı' });
  perde([[KN.x0, 1440], [KN.x1, 1440]], 80, K.kanalTaban, K.kanalUst, { ad: 'Kanal perdesi A aksı' });
  perde([[655, KN.y0], [655, 1400]], 80, K.kanalTaban, K.kanalUst, { ad: 'Kanal perdesi 2 aksı' });
  perde([[1795, KN.y0], [1795, 1400]], 80, K.kanalTaban, K.kanalUst, { ad: 'Kanal perdesi 3 aksı' });
  //    kanal merdiveni: 28 rıht × 27,5 cm, basamak 20 cm, 100 cm genişlik, çelik ızgara (çizimde basamak numaraları 1 … 28)
  ekle('merdiven', 'INS_MERDIVEN', { pts: [[cm(695), cm(1350)], [cm(1275), cm(1350)]], z0: K.kanalTaban, z1: K.kanalUst, w: 1.0, hmax: 27.5, b: 20, nos: 0, t: 0, sah: 0,
    tip: 'izgara', hiza: 'O', kork: 'iki', km: 'galvaniz', kh: 110, dik: 150, tk: 'E', uz: 0, ad: 'Kanal merdiveni' });

  // 7) bina: 30×30 kolonlar (+10,00 → çatı döşemesi altı), 30 cm tuğla duvarlar, pencere / kapılar
  const zB = K.binaZemin, hB = +(K.catiAlt - zB).toFixed(3), BN = OLCU.bina;
  for (const x of BINA_KOLON_X) for (const y of [BN.y0, BN.y1 - BN.t])
    ekle('kolon', 'INS_KOLON', { sek: 'R', b: 0.3, d: 0.3, D: 0.3, h: hB, z0: zB, rot: 0, beton: 'C25/30', p: [cm(x + 15), cm(y + 15), 0] });
  const tug = { malz: 'tugla', beton: undefined };
  const dD = perde([[BN.x0, -15], [BN.x1, -15]], 30, zB, K.catiAlt, Object.assign({ ad: 'Cephe duvarı D' }, tug));
  const dC = perde([[BN.x0, 842.5], [BN.x1, 842.5]], 30, zB, K.catiAlt, Object.assign({ ad: 'Cephe duvarı C' }, tug));
  const d1 = perde([[-15, 0], [-15, 827.5]], 30, zB, K.catiAlt, Object.assign({ ad: 'Cephe duvarı 1' }, tug));
  const d3 = perde([[1805, 0], [1805, 827.5]], 30, zB, K.catiAlt, Object.assign({ ad: 'Cephe duvarı 3' }, tug));
  const par = +(K.denizlik - zB).toFixed(2), hh = +(K.pencereUst - K.denizlik).toFixed(2);
  for (const x of PENCERE_C) acik(dC, x - BN.x0 + 37.5, { w: 0.75, hh, par, yon: 'L' });
  for (const x of PENCERE_D) acik(dD, x - BN.x0 + 25, { w: 0.5, hh, par, yon: 'R' });
  acik(d1, 68, { kind: 'kapi', w: 0.9, hh: 2.0, par: 0, kTip: 'C', kasa: 0.05, yon: 'L', lh: 0 });                       // K2 90/200
  acik(d1, 425, { kind: 'kapi', w: 3.5, hh: 3.5, par: 0, kTip: 'S', pnl: 0.5, ray: true, yon: 'L', lento: false });        // SK1 350/350 seksiyonel kapı
  acik(d3, 752.5, { kind: 'kapi', w: 0.9, hh: 2.0, par: 0, kTip: 'C', kasa: 0.05, yon: 'R', lh: 0 });                    // K2 90/200

  // 8) çatı döşemesi 20 cm (+14,64 → +14,84), dış yüzden 75 cm saçak
  plak('INS_CATI_DOSEMESI', dik(BN.x0 - BN.sacak, BN.y0 - BN.sacak, BN.x1 + BN.sacak, BN.y1 + BN.sacak), K.cati, K.cati - K.catiAlt,
    { cati: true, beton: 'C25/30', ad: 'Çatı döşemesi' });

  // tuğla duvarlarda beton sınıfı alanı yok
  for (const e of B.doc.ents) if (e.malz === 'tugla') delete e.beton;
  B.doc.set.render = { acik: false, ay: 6, saat: 10, ao: true, parlama: false, katman: {} };
  const say = {}; for (const e of B.doc.ents) say[e.type] = (say[e.type] || 0) + 1;
  return { doc: B.doc, ozet: { nesne: B.doc.ents.length, say }, ref: { pDalt, pDust, pSol, pSag, pUst, pAra } };
}

module.exports = { OLCU, NERVUR_X, FILTRE_KIRIS_X, KAPAK_150, KAPAK_110, GECIS_X, GECIS, BINA_KOLON_X, PENCERE_C, PENCERE_D, uret };

if (require.main === module) {
  const cikti = process.argv[2] || path.join(__dirname, '..', 'test-proje', 'GT6', 'GT6-insaat.aritma');
  const { doc, ozet } = uret();
  fs.writeFileSync(cikti, JSON.stringify({ format: 'aritmacad-proje', v: 1, app: 'gt6-uret', kaydedildi: new Date().toISOString(), doc }));
  console.log(`Yazıldı: ${cikti}\n${ozet.nesne} nesne · ${JSON.stringify(ozet.say)}`);
}

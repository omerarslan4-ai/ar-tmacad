/* ArıtmaCAD — SW2 YAĞMUR SUYU POMPA İSTASYONU SAHA MODELİ ÜRETİCİSİ (Node)
   Kullanım:  node araclar/sw2-saha-uret.js [terfi.aritma] [cikti.aritma]
   Kaynak çizimler (test-proje/SW2): SW-2_GY_R1.DWG (genel yerleşim, gerçek koordinat), SW2_TOWER.dwg (yükleme bacası),
   GÜVENLİK BİNASI.dwg (bekçi), terfi için Belgeler/sw2.aritma içindeki 3B model.
   Koordinat: LGD2006 / Libya TM 11. dilim (DOM 21°, k0 0,99995, FE 200000) — genel yerleşim çizimindeki X/Y ile aynı.
   Ürettikleri: terfi merkezi, yükleme bacası (T-102), güvenlik binası, çevre duvarı, kapılar, yollar, saha zemini,
   denize giden taslak hat ekseni (DENIZ_HATTI katmanı) ve çevre binalar (set.cevre). Saf fonksiyonlar test/sw2-saha.test.js ile denenir. */
'use strict';
const fs = require('fs'), path = require('path');

const X0 = 112900, Y0 = 3556600;                      // çizimden okunan değerler bu ötelemeyle yazıldı
const W = (x, y) => [+(X0 + x).toFixed(3), +(Y0 + y).toFixed(3)];
const RAD = Math.PI / 180;

/* yerel çerçeve: o (dünya), ux (birim) ve sola dik uy -> (x,y) yerel noktayı dünyaya taşır */
const cerceve = (o, ux) => { const uy = [-ux[1], ux[0]]; const f = (x, y) => [+(o[0] + ux[0] * x + uy[0] * y).toFixed(3), +(o[1] + ux[1] * x + uy[1] * y).toFixed(3)]; f.aci = Math.atan2(ux[1], ux[0]) / RAD; return f; };
const birim = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
/* eksen çizgisini w genişliğinde dikdörtgene çevirir */
const serit = (a, b, w) => { const u = birim(a, b), n = [-u[1] * w / 2, u[0] * w / 2]; return [[a[0] + n[0], a[1] + n[1]], [b[0] + n[0], b[1] + n[1]], [b[0] - n[0], b[1] - n[1]], [a[0] - n[0], a[1] - n[1]]].map(p => [+p[0].toFixed(3), +p[1].toFixed(3)]); };
const uzunluk = pts => pts.reduce((s, p, i) => i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);

/* ---------- saha verisi (SW-2_GY_R1.DWG) ---------- */
const SAHA = {
  geo: { mode: 'tm', lat0: 32.1318, lon0: 20.0779, rot: 0, cm: 21, k0: 0.99995, fe: 200000, fn: 0, zone: 34 },
  duvar: [                                             // GEN_Telcit: çevre duvarı parçaları
    [W(62.01, 67.00), W(62.94, 61.48), W(94.66, 37.22), W(102.73, 48.34)],
    [W(107.45, 54.85), W(125.22, 79.32), W(105.41, 94.41)],
    [W(102.74, 96.47), W(91.44, 105.17), W(65.29, 71.26)],
    [W(63.22, 68.57), W(62.01, 67.00)],
  ],
  kapi: [                                              // duvar boşlukları
    { ad: 'Sürgülü kapı 790/210', a: W(102.73, 48.34), b: W(107.45, 54.85), h: 2.1 },
    { ad: 'Mevcut kapı (KD)', a: W(105.41, 94.41), b: W(102.74, 96.47), h: 2.1 },
    { ad: 'Mevcut kapı (B)', a: W(65.29, 71.26), b: W(63.22, 68.57), h: 2.1 },
  ],
  // yol alanı: genel yerleşimdeki yol taramasının (M-GORUNUS-6 / DASH) sınırı — adanın çevresini dolanır; ikinci parça sürgülü kapı önü
  yol: [
    [[97.64, 52.22], [102.27, 58.61], [101.79, 58.96], [92.40, 65.77], [109.14, 88.83], [103.23, 93.12], [89.49, 74.22], [88.81, 73.44], [87.98, 72.83], [87.05, 72.38], [86.05, 72.14], [85.02, 72.09], [84.00, 72.26], [83.04, 72.62], [82.16, 73.17], [81.26, 73.87], [80.53, 74.57], [79.95, 75.39], [79.54, 76.31], [79.32, 77.30], [79.29, 78.31], [79.47, 79.30], [79.83, 80.24], [80.37, 81.10], [91.93, 95.92], [88.02, 98.79], [63.08, 66.82], [67.76, 63.17], [72.86, 70.22], [88.36, 58.96], [81.57, 49.59], [84.46, 47.49], [91.26, 56.88]].map(p => W(p[0], p[1])),
    [[102.68, 58.31], [98.05, 51.93], [102.93, 48.36], [107.56, 54.75]].map(p => W(p[0], p[1])),
  ],
  // orta ada: çim taraması (M-GOST-GENEL / GRASS) sınırı — GB ucu yuvarlak
  ada: [[100.51, 89.63], [92.05, 95.83], [80.49, 81.01], [79.96, 80.18], [79.61, 79.26], [79.44, 78.30], [79.47, 77.32], [79.68, 76.36], [80.08, 75.46], [80.64, 74.66], [81.35, 73.99], [82.25, 73.29], [83.00, 72.81], [83.82, 72.47], [84.69, 72.28], [85.58, 72.24], [86.46, 72.37], [87.30, 72.64], [88.09, 73.07], [88.78, 73.63], [89.37, 74.30]].map(p => W(p[0], p[1])),
  kotZemin: 0.38, kotYol: 0.40,
  terfi: { o: W(101.79, 58.96), ux: birim([93.21, 65.18], [108.36, 86.06]) },   // 25,8 × 10,6 m; yerel y = KB (vana odası) tarafı
  baca: { k: [W(90.67, 96.86), W(96.50, 92.63), W(99.55, 96.84), W(93.73, 101.07)] }, // dış 7,20 × 5,20 m
  bekci: { p: W(96.86, 52.33), k2: W(91.19, 56.44) },                              // kaplama köşesi ve komşu köşe
};

/* ---------- belge kurucu ---------- */
function yeniBelge() {
  const doc = { ents: [], layers: {}, cur: { layer: '0', color: 256, lt: 'BYLAYER', lw: -1 }, set: { anno: 100, ltscale: 0.1, textH: 2.5, dimTextH: 2.5, dimArrow: 2.5, dimDec: 2, dimTick: false, lwdisp: true, geo: SAHA.geo, name: 'SW2-saha', seviye: { abs0: null, toprak: SAHA.kotZemin, list: [{ id: 'Lsw2cati', ad: 'Çatı', z: 7.9, kh: 1.2 }, { id: 'Lsw2zemin', ad: 'Zemin kat', z: 0.7, kh: 1.2 }, { id: 'Lsw2hazne', ad: 'Islak hacim tabanı', z: -8, kh: 1.2 }, { id: 'Lsw2temel', ad: 'Temel altı', z: -8.9, kh: 1.2 }] } }, nextId: 1, layouts: [], blocks: {} };
  const kat = (name, color, lw) => { if (!doc.layers[name]) doc.layers[name] = { name, color, lt: 'CONTINUOUS', lw: lw || 25, on: true, lock: false }; return name; };
  kat('0', 7);
  const ekle = (type, layer, props) => { const e = Object.assign({ id: doc.nextId++, type, layer, color: 256, lt: 'BYLAYER', lw: -1 }, props); doc.ents.push(e); return e; };
  return { doc, kat, ekle };
}
const perde = (B, layer, pts, o) => B.ekle('perde', layer, Object.assign({ pts, closed: false, tb: 0.2, tt: 0.2, egim: 'R', hiza: 'O', ofs: 0, h: 3, z0: 0, malz: 'beton', beton: 'C30/37' }, o, o && o.tb != null && o.tt == null ? { tt: o.tb } : {}));
const plak = (B, layer, pts, zt, t, o) => B.ekle('plak', layer, Object.assign({ kind: 'doseme', cati: false, sacak: 0, pts, t, zt, beton: 'C30/37' }, o));
const acik = (B, host, seg, s, o) => B.ekle('acik', o.kind === 'kapi' ? 'INS_KAPI' : 'INS_PENCERE', Object.assign({ host: host.id, seg, s, kind: 'pencere', w: 1, hh: 1.2, par: 0, kanat: 1, yon: 'R', el: 'L', lento: true, lb: 0.1, lh: 0 }, o));

/* ---------- 1) terfi merkezi: hazır 3B model yerine taşınır ---------- */
function terfi(B, dosya) {
  const f = cerceve(SAHA.terfi.o, SAHA.terfi.ux), aci = f.aci;
  let kaynak = []; try { kaynak = JSON.parse(fs.readFileSync(dosya, 'utf8')).doc.ents; } catch (e) { console.warn('Terfi modeli okunamadı (' + dosya + '): ' + e.message + ' — kaba kütle üretiliyor.'); }
  const al = kaynak.filter(e => ['perde', 'plak', 'kolon', 'kiris'].includes(e.type) && !e.gv);
  const esle = {}; let n = 0;
  for (const e of al) {
    const k = JSON.parse(JSON.stringify(e)); delete k.sv; delete k.svU; delete k._c; esle[e.id] = k.id = B.doc.nextId++;
    B.kat(k.layer, k.layer === 'INS_DUVAR_TUGLA' ? 31 : k.layer === 'INS_TEMEL_RADYE' ? 252 : 8, 35);
    if (k.pts) k.pts = k.pts.map(p => f(p[0], p[1]));
    if (k.type === 'kolon') { k.p = f(k.p[0], k.p[1]).concat(0); k.rot = (+k.rot || 0) + aci; }
    if (k.type === 'kiris') { k.a = f(k.a[0], k.a[1]).concat(0); k.b = f(k.b[0], k.b[1]).concat(0); }
    B.doc.ents.push(k); n++;
  }
  for (const k of B.doc.ents) { if (k.host && esle[k.host]) k.host = esle[k.host]; if (k.kOf && esle[k.kOf]) k.kOf = esle[k.kOf]; }
  // çatı döşemesi kiriş üstüne otursun: kaynak modelde döşeme altı ile kiriş üstü arasında boşluk kalmışsa döşeme kalınlaştırılır (üst kot sabit)
  { const kirisUst = Math.max(-1e9, ...B.doc.ents.filter(k => k.type === 'kiris' && esle && Object.values(esle).includes(k.id)).map(k => +k.zt || 0));
    for (const k of B.doc.ents) if (k.type === 'plak' && k.cati && Object.values(esle).includes(k.id) && kirisUst > -1e8) { const alt = (+k.zt || 0) - (+k.t || 0.2); if (alt > kirisUst + 0.005 && alt - kirisUst < 0.6) k.t = +((+k.zt || 0) - kirisUst).toFixed(3); } }
  if (!n) { // kaynak yoksa: gövde + üst yapı kaba kütlesi
    B.kat('INS_PERDE', 8, 50); B.kat('INS_DOSEME', 8, 35);
    perde(B, 'INS_PERDE', [f(0, 0), f(25.8, 0), f(25.8, 10.6), f(0, 10.6)], { closed: true, hiza: 'DIS', tb: 0.65, z0: -7.9, h: 8.3 });
    plak(B, 'INS_DOSEME', [f(0, 0), f(25.8, 0), f(25.8, 10.6), f(0, 10.6)], 0.7, 0.3);
    plak(B, 'INS_DOSEME', [f(2.75, -1.05), f(26.7, -1.05), f(26.7, 8.7), f(2.75, 8.7)], 8.1, 0.2, { cati: true });
  }
  // üst yapı dolgu duvarları (kaynak modelde yok): kolon aksları üzerinde, zemin kat döşemesinden kiriş üstüne
  B.kat('INS_DUVAR', 31, 35); B.kat('INS_KAPI', 30, 25);
  const d = perde(B, 'INS_DUVAR', [f(4.075, 0.275), f(25.375, 0.275), f(25.375, 7.375), f(4.075, 7.375)], { closed: true, hiza: 'O', tb: 0.25, z0: 0.7, h: 6.95, malz: 'briket', ad: 'Terfi üst yapı duvarı' });
  acik(B, d, 3, 3.55, { kind: 'kapi', w: 3.5, hh: 3.5, kTip: 'S', pnl: 0.5, ray: true });   // SK1 350/350 seksiyonel kapı (GB cephe — yeri kabul)
  B.kat('INS_PENCERE', 4, 25);
  for (const seg of [0, 2]) for (let i = 0; i < 5; i++) acik(B, d, seg, 2.13 + i * 4.26, { w: 1.6, hh: 1.0, par: 3.6 });   // uzun cephelerde üst bant pencereleri (her aks arası; yeri kabul)
  acik(B, d, 1, 3.55, { w: 1.6, hh: 1.0, par: 3.6 });
  return n;
}

/* ---------- 2) yükleme bacası T-102 (SW2_TOWER.dwg) ---------- */
function baca(B) {
  const k = SAHA.baca.k, f = cerceve(k[0], birim(k[0], k[1]));      // yerel x: 7,20 (x=0 KB uç: 2×DN1400 çıkışı, x=7,2 GD uç: giriş), y: 5,20
  B.kat('INS_TEMEL_RADYE', 252, 50); B.kat('INS_PERDE', 8, 50); B.kat('INS_DOSEME', 8, 35);
  const r = (x0, y0, x1, y1) => [f(x0, y0), f(x1, y0), f(x1, y1), f(x0, y1)];
  plak(B, 'INS_TEMEL_RADYE', r(-0.8, -0.8, 8.0, 6.0), -2.40, 0.80, { kind: 'radye', ad: 'T-102 radye' });
  perde(B, 'INS_PERDE', r(0, 0, 7.2, 5.2), { closed: true, hiza: 'DIS', tb: 0.60, z0: -2.40, h: 8.85, ad: 'T-102 yükleme bacası perdesi' });
  perde(B, 'INS_PERDE', [f(3.85, 0.6), f(3.85, 4.6)], { tb: 0.50, z0: -2.40, h: 3.40, ad: 'T-102 savak duvarı (+1.00)' });
  plak(B, 'INS_DOSEME', r(0, 0, 7.2, 5.2), 6.70, 0.25, { ad: 'T-102 üst döşeme (+6.70)' });
  // üst döşeme korkuluğu (SW2_TOWER: Hand Rail): 1,10 m, iki sıra boru + dikmeler
  B.kat('SAHA_KORKULUK', 2, 25);
  const kose = [[0.08, 0.08], [7.12, 0.08], [7.12, 5.12], [0.08, 5.12]];
  for (let i = 0; i < 4; i++) { const a = kose[i], b = kose[(i + 1) % 4], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.round(L / 1.2);
    for (const zt of [7.80, 7.28]) B.ekle('kiris', 'SAHA_KORKULUK', { a: f(a[0], a[1]).concat(0), b: f(b[0], b[1]).concat(0), bw: 0.05, hb: 0.05, zt, hiza: 'O', beton: 'C30/37', ad: 'Korkuluk' });
    for (let k = 0; k < n; k++) B.ekle('kolon', 'SAHA_KORKULUK', { sek: 'R', b: 0.05, d: 0.05, D: 0.05, h: 1.10, z0: 6.70, rot: f.aci, beton: 'C30/37', p: f(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n).concat(0), ad: 'Korkuluk dikmesi' }); }
  return { f, cikis: f(0, 2.6) };
}

/* ---------- 3) güvenlik (bekçi) binası (GÜVENLİK BİNASI.dwg: 4,70 × 4,70 m, döşeme +0.75, çatı +3.10, parapet +4.10) ---------- */
function bekci(B) {
  const f = cerceve(SAHA.bekci.p, birim(SAHA.bekci.p, SAHA.bekci.k2));
  B.kat('INS_DUVAR', 31, 35); B.kat('INS_DOSEME', 8, 35); B.kat('INS_CATI_DOSEMESI', 8, 35); B.kat('INS_PARAPET', 8, 35); B.kat('INS_KAPI', 30, 25); B.kat('INS_PENCERE', 4, 25); B.kat('SAHA_KAPLAMA', 253, 25);
  const r = (x0, y0, x1, y1) => [f(x0, y0), f(x1, y0), f(x1, y1), f(x0, y1)];
  plak(B, 'SAHA_KAPLAMA', r(0, 0, 7, 7), 0.55, 0.15, { ad: 'Güvenlik binası çevre kaplaması' });
  plak(B, 'INS_DOSEME', r(1.15, 1.15, 5.85, 5.85), 0.75, 0.20, { ad: 'Güvenlik binası döşemesi' });
  const d = perde(B, 'INS_DUVAR', r(1.15, 1.15, 5.85, 5.85), { closed: true, hiza: 'DIS', tb: 0.20, z0: 0.75, h: 2.20, malz: 'gazbeton', ad: 'Güvenlik binası duvarı' });
  const c = plak(B, 'INS_CATI_DOSEMESI', r(1.0, 1.0, 6.0, 6.0), 3.10, 0.15, { cati: true, sacak: 0.15 });
  perde(B, 'INS_PARAPET', r(1.0, 1.0, 6.0, 6.0), { closed: true, hiza: 'DIS', tb: 0.15, z0: 3.10, h: 1.0, parapet: true, host: c.id });
  acik(B, d, 2, 2.35, { kind: 'kapi', w: 1.0, hh: 2.1 });
  for (const s of [0, 1, 3]) acik(B, d, s, 2.35, { w: 1.25, hh: 1.25, par: 1.0 });
}

/* ---------- 4) çevre duvarı, kapılar, yollar, zemin ---------- */
function saha(B) {
  B.kat('SAHA_ZEMIN', 254, 25); B.kat('SAHA_YOL', 8, 25); B.kat('SAHA_DUVAR', 9, 35); B.kat('SAHA_KAPI', 5, 25); B.kat('SAHA_YESIL', 94, 25);
  const halka = [].concat(SAHA.duvar[0], SAHA.duvar[1], SAHA.duvar[2], [SAHA.duvar[3][0]]);
  plak(B, 'SAHA_ZEMIN', halka, SAHA.kotZemin - 0.05, 0.20, { ad: 'Saha zemini (kilitli parke)' });
  SAHA.yol.forEach((y, i) => plak(B, 'SAHA_YOL', y, +(SAHA.kotYol + i * 0.004).toFixed(3), 0.12, { ad: 'Saha içi yol (asfalt)' }));
  plak(B, 'SAHA_YESIL', SAHA.ada, SAHA.kotZemin + 0.12, 0.15, { ad: 'Orta ada (çim)' });
  { // ada üzerinde 3 ağaç (peyzaj kabulü): adanın uzun ekseni boyunca
    const a = SAHA.ada, uc = [(a[0][0] + a[1][0]) / 2, (a[0][1] + a[1][1]) / 2], yuv = a[12], u = birim(yuv, uc), L = uzunluk([yuv, uc]), n = [-u[1], u[0]];
    B.doc.set.peyzaj = { agac: [0.22, 0.5, 0.78].map((k, i) => [+(yuv[0] + u[0] * L * k + n[0] * (i % 2 ? 1.2 : -1.2)).toFixed(2), +(yuv[1] + u[1] * L * k + n[1] * (i % 2 ? 1.2 : -1.2)).toFixed(2), 5 + (i % 2) * 0.8, SAHA.kotZemin + 0.12]) };
  }
  for (const d of SAHA.duvar) perde(B, 'SAHA_DUVAR', d, { tb: 0.20, z0: SAHA.kotZemin - 0.1, h: 2.6, malz: 'briket', ad: 'Çevre duvarı' });
  for (const k of SAHA.kapi) perde(B, 'SAHA_KAPI', [k.a, k.b], { tb: 0.06, z0: SAHA.kotZemin + 0.05, h: k.h, malz: 'briket', ad: k.ad });
}

/* ---------- 5) deniz hattı taslağı + çevre binalar ---------- */
function hat(B, cevre, cikis) {
  B.kat('DENIZ_HATTI', 5, 50); B.kat('DENIZ_HATTI_SAHA', 4, 50);
  const g = (cevre.guzergah || []).map(p => [p[0], p[1], 0]); if (g.length) g[0] = [cikis[0], cikis[1], 0];
  if (g.length > 1) B.ekle('pline', 'DENIZ_HATTI', { pts: g, closed: false });
  // saha içi basma hattı: terfi vana odası kolektörü → yükleme bacası girişi (SW-2_GY_R1.DWG, Boru_Eksen)
  B.ekle('pline', 'DENIZ_HATTI_SAHA', { pts: [W(94.86, 69.69), W(106.19, 85.29), W(106.60, 86.04), W(106.76, 87.53), W(106.14, 88.90), W(105.52, 89.48), W(97.56, 95.26)].map(p => [p[0], p[1], 0]), closed: false, dn: 2000 });
  B.doc.set.denizHat = { ad: 'SW2 deniz deşarj hattı (güzergâh 12.11.2026 onaylı)', borular: [{ ad: 'DN1400-1', dn: 1400, ofs: -2.2 }, { ad: 'DN1400-2', dn: 1400, ofs: 0 }, { ad: 'DN900', dn: 900, ofs: 2.0 }], kiyiIndex: cevre.kiyiIndex, hiz: 2.0, kot: 1.0 };
  B.doc.set.cevre = { kaynak: cevre.kaynak, not: cevre.not, binalar: cevre.binalar || [] };
  return uzunluk(g);
}

function uret(terfiDosya, cevre) {
  const B = yeniBelge();
  saha(B); const nT = terfi(B, terfiDosya); const bc = baca(B); bekci(B); const L = hat(B, cevre, bc.cikis);
  return { doc: B.doc, ozet: { nesne: B.doc.ents.length, terfiNesne: nT, hatBoyu: L, bina: (cevre.binalar || []).length } };
}

module.exports = { SAHA, cerceve, birim, serit, uzunluk, uret, W };

if (require.main === module) {
  const terfiDosya = process.argv[2] || path.join(process.env.USERPROFILE || '', 'Documents', 'sw2.aritma');
  const cikti = process.argv[3] || path.join(__dirname, '..', 'test-proje', 'SW2', 'SW2-saha.aritma');
  const cevre = JSON.parse(fs.readFileSync(path.join(__dirname, 'sw2-cevre.json'), 'utf8'));
  const { doc, ozet } = uret(terfiDosya, cevre);
  fs.writeFileSync(cikti, JSON.stringify({ format: 'aritmacad-proje', v: 1, app: 'sw2-saha-uret', kaydedildi: new Date().toISOString(), doc }));
  console.log(`Yazıldı: ${cikti}\n${ozet.nesne} nesne (terfi ${ozet.terfiNesne}) · hat ${ozet.hatBoyu.toFixed(0)} m · ${ozet.bina} çevre bina`);
}

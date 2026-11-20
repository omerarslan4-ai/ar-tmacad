/* ArıtmaCAD — KSB AmaProp üretici modelini (3Dfindit / CADENAS COLLADA .dae) programa gömülecek veriye çevirir.
   Çıktı: app/mikser-ksb-veri.js (C.MIKSER_KSB_VERI) — parçalar mm tamsayı (Int16) köşe + Uint16 üçgen, base64; parça başına plan izdüşüm zarfı.
   Yerel eksenler dalgıç mikser ailesiyle aynı: x enine, y itki (akış) yönü, z yukarı (tabandan). Orijin: modelin kendi orijini
   (y = 0 motor gövdesinin arka kısmı, z = 0 ayak altı = havuz tabanı). Model dosyası Y yukarı yazılmış (up_axis yok); dae-oku.js Y_UP sayıp
   (x, −z, y) yapar, bu çıktıda düşey eksen ikinci bileşen, itki birinci bileşen → yerel (x, y, z) = (Z, X, Y) (dönme, ayna değil).
   Çalıştır: node araclar/mikser-ksb-uret.js "<.dae yolu>" [tip adı, ör. 2603] */
'use strict';
const fs = require('fs'), path = require('path');
globalThis.C = { on() { } }; require('../app/dae-oku.js');
const dosya = process.argv[2], tip = process.argv[3] || '2603';
if (!dosya) { console.error('kullanım: node araclar/mikser-ksb-uret.js <dosya.dae> [tip]'); process.exit(1); }
const m = C.daeOku.oku(fs.readFileSync(dosya, 'utf8'));

/* malzeme → parça (3Dfindit her alt parçayı ayrı malzemeyle yazıyor; sıra BOM sırası: 1.1 … 1.8) */
const PARCA = ['ayak', 'ray', 'ustTutucu', 'kizak', 'motor', 'disli', 'pervane', 'askiKolu'];
const matlar = [...new Set(m.fm)].sort();
if (matlar.length !== PARCA.length) throw new Error(`beklenen ${PARCA.length} parça, bulunan ${matlar.length}`);
const yer = p => [Math.round(p[2] * 1000), Math.round(p[0] * 1000), Math.round(p[1] * 1000)]; // (Z, X, Y) → mm

/* düzlemde dışbükey zarf (Andrew) */
const zarf = P => {
  const p = [...new Map(P.map(q => [q[0] + ',' + q[1], q])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), alt = [], ust = [];
  for (const q of p) { while (alt.length >= 2 && cr(alt[alt.length - 2], alt[alt.length - 1], q) <= 0) alt.pop(); alt.push(q); }
  for (const q of p.slice().reverse()) { while (ust.length >= 2 && cr(ust[ust.length - 2], ust[ust.length - 1], q) <= 0) ust.pop(); ust.push(q); }
  return alt.slice(0, -1).concat(ust.slice(0, -1));
};
const b64 = ta => Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength).toString('base64');

const parca = [], ozet = {};
matlar.forEach((mat, k) => {
  const ad = PARCA[k], idx = new Map(), V = [], F = [];
  m.f.forEach((f, i) => {
    if (m.fm[i] !== mat) return;
    const t = f.map(vi => { const q = yer(m.v[vi]), key = q.join(','); if (!idx.has(key)) { idx.set(key, V.length / 3); V.push(...q); } return idx.get(key); });
    if (t[0] !== t[1] && t[1] !== t[2] && t[0] !== t[2]) F.push(...t); // mm'ye yuvarlamada çöken üçgen atılır
  });
  if (V.length / 3 > 65535) throw new Error(ad + ': köşe sayısı Uint16 sınırını aşıyor');
  const P = []; for (let i = 0; i < V.length; i += 3) P.push([V[i], V[i + 1]]);
  const bb = [0, 1, 2].map(a => { let lo = Infinity, hi = -Infinity; for (let i = a; i < V.length; i += 3) { lo = Math.min(lo, V[i]); hi = Math.max(hi, V[i]); } return [lo, hi]; });
  parca.push({ ad, renk: (m.mats[mat] && m.mats[mat].renk) || [0.8, 0.8, 0.8], v: b64(Int16Array.from(V)), f: b64(Uint16Array.from(F)), plan: zarf(P), bb });
  ozet[ad] = { ucgen: F.length / 3, kose: V.length / 3, bb };
});

/* pervane göbeği (dönme ekseni): pervane köşelerinin x–z ortası değil — kanatlar simetrik değil; göbek = pervanenin itki yönünde en arkadaki
   (motora bakan) köşelerin ortası */
const pv = parca.find(p => p.ad === 'pervane'), pB = Buffer.from(pv.v, 'base64'), pV = new Int16Array(pB.buffer.slice(pB.byteOffset, pB.byteOffset + pB.byteLength)), yMin = pv.bb[1][0];
let sx = 0, sz = 0, n = 0; for (let i = 0; i < pV.length; i += 3) if (pV[i + 1] < yMin + 40) { sx += pV[i]; sz += pV[i + 2]; n++; }
const gobek = [Math.round(sx / n), Math.round(sz / n)];
const md = parca.find(p => p.ad === 'motor').bb, eksenZ = Math.round((md[2][0] + md[2][1]) / 2);

const veri = { tip, kaynak: path.basename(dosya), birim: 'mm', eksenZ, gobek, parca };
const hedef = path.join(__dirname, '..', 'app', 'mikser-ksb-veri.js');
fs.writeFileSync(hedef, `/* ArıtmaCAD — KSB AmaProp ${tip} üretici modeli (3Dfindit / CADENAS, KSB SE & Co. KGaA; ${veri.kaynak}). Kullanım şartları: https://www.cadenas.de/terms-of-use-3d-cad-models
   Üretici: node araclar/mikser-ksb-uret.js "<.dae>" ${tip} — elle düzenlemeyin. Okuyan: app/mikser-ksb.js */
(function (C) { 'use strict'; (C.MIKSER_KSB_VERI = C.MIKSER_KSB_VERI || {})['${tip}'] = ${JSON.stringify(veri)}; })(typeof window !== 'undefined' ? window.C : globalThis.C);
`);
console.log(JSON.stringify({ eksenZ, gobek, ozet }, null, 1));
console.log('yazıldı:', hedef, Math.round(fs.statSync(hedef).size / 1024) + ' kB');

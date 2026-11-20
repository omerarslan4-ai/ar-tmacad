/* ArıtmaCAD — pergel vinç (jib crane) 3B modelini (COLLADA .dae; SketchUp 3D Warehouse) programa gömülecek veriye çevirir.
   Çıktı: app/pergel-vinc-veri.js (C.PERGEL_VINC_VERI) — malzeme grupları mm tamsayı (Int16) köşe + Uint16 üçgen, base64; grup başına plan izdüşüm zarfı.
   Yerel eksenler pergel vinç ailesiyle aynı: orijin direğin ayak izinin ortası (tabliye üstü), y = kolun uzandığı yön, z yukarı.
   Model kolu −Y yönünde çizilmiş → yerel (x, y, z) = (−(X − cx), −(Y − cy), Z) (z çevresinde 180°; ayna değil).
   Çalıştır: node araclar/pergel-vinc-uret.js "<.dae yolu>" [ad] */
'use strict';
const fs = require('fs'), path = require('path');
globalThis.C = { on() { } }; require('../app/dae-oku.js');
const dosya = process.argv[2], ad = process.argv[3] || 'jib';
if (!dosya) { console.error('kullanım: node araclar/pergel-vinc-uret.js <dosya.dae> [ad]'); process.exit(1); }
const m = C.daeOku.oku(fs.readFileSync(dosya, 'utf8'));

/* ayak izinin ortası: tabana (z < 5 cm) değen köşelerin ortası */
const Z0 = Math.min(...m.v.map(p => p[2])), alt = m.v.filter(p => p[2] < Z0 + 0.05);
const cx = (Math.min(...alt.map(p => p[0])) + Math.max(...alt.map(p => p[0]))) / 2, cy = (Math.min(...alt.map(p => p[1])) + Math.max(...alt.map(p => p[1]))) / 2;
const yer = p => [Math.round(-(p[0] - cx) * 1000), Math.round(-(p[1] - cy) * 1000), Math.round((p[2] - Z0) * 1000)];

const zarf = P => {
  const p = [...new Map(P.map(q => [q[0] + ',' + q[1], q])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), A = [], U = [];
  for (const q of p) { while (A.length >= 2 && cr(A[A.length - 2], A[A.length - 1], q) <= 0) A.pop(); A.push(q); }
  for (const q of p.slice().reverse()) { while (U.length >= 2 && cr(U[U.length - 2], U[U.length - 1], q) <= 0) U.pop(); U.push(q); }
  return A.slice(0, -1).concat(U.slice(0, -1));
};
const b64 = ta => Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength).toString('base64');

/* malzemeye göre grupla; çok küçük gruplar (≤ 4 üçgen: çizgi / halat parçaları) rengi aynı olan komşu gruba değil, tek "ince" grubuna */
const gruplar = new Map();
m.f.forEach((f, i) => { const k = m.fm[i] || ''; if (!gruplar.has(k)) gruplar.set(k, []); gruplar.get(k).push(i); });
const parca = []; let ince = [];
for (const [k, I] of gruplar) { if (I.length <= 4) ince = ince.concat(I); else parca.push({ k, I }); }
if (ince.length) parca.push({ k: 'ince', I: ince });
const out = [];
for (const { k, I } of parca) {
  const idx = new Map(), V = [], F = [];
  for (const i of I) {
    const t = m.f[i].map(vi => { const q = yer(m.v[vi]), key = q.join(','); if (!idx.has(key)) { idx.set(key, V.length / 3); V.push(...q); } return idx.get(key); });
    if (t[0] !== t[1] && t[1] !== t[2] && t[0] !== t[2]) F.push(...t);
  }
  if (!F.length) continue;
  const P = []; for (let i = 0; i < V.length; i += 3) P.push([V[i], V[i + 1]]);
  const r = (m.mats[k] && m.mats[k].renk) || null;
  out.push({ k, renk: r, v: b64(Int16Array.from(V)), f: b64(Uint16Array.from(F)), plan: F.length / 3 >= 20 ? zarf(P) : null, n: F.length / 3 });
}
/* ölçüler: yükseklik, kolun ucu (en uzak y), direk ayak izi */
const Y = m.v.map(yer), H = Math.max(...Y.map(q => q[2])), uc = Math.max(...Y.map(q => q[1]));
const ayak = Y.filter(q => q[2] < 50), ayakB = [Math.max(...ayak.map(q => Math.abs(q[0]))), Math.max(...ayak.map(q => Math.abs(q[1])))];
/* kanca: kolun ucundaki (y > 500 mm) en alçak nokta — halat ve kanca ekseni (y), kanca altı (z) */
const uz = Y.filter(q => q[1] > 500), kz = Math.min(...uz.map(q => q[2])), ka = uz.filter(q => q[2] < kz + 80), kanca = { y: Math.round((Math.min(...ka.map(q => q[1])) + Math.max(...ka.map(q => q[1]))) / 2), z: kz };
const veri = { ad, kaynak: path.basename(dosya), birim: 'mm', H, uc, ayak: ayakB, kanca, parca: out };
const hedef = path.join(__dirname, '..', 'app', 'pergel-vinc-veri.js');
fs.writeFileSync(hedef, `/* ArıtmaCAD — pergel vinç (jib crane) 3B modeli (${veri.kaynak}; SketchUp 3D Warehouse, yazar: hyojung K.). Kullanıcının seçtiği model (20.11.2026).
   Üretici: node araclar/pergel-vinc-uret.js "<.dae>" ${ad} — elle düzenlemeyin. Okuyan: app/aile-mekanik.js (pergel_vinc, model '${ad}') */
(function (C) { 'use strict'; (C.PERGEL_VINC_VERI = C.PERGEL_VINC_VERI || {})['${ad}'] = ${JSON.stringify(veri)}; })(typeof window !== 'undefined' ? window.C : globalThis.C);
`);
console.log(JSON.stringify({ H, uc, kanca, ayak: ayakB, parca: out.length, ucgen: out.reduce((a, p) => a + p.n, 0) }));
console.log('yazıldı:', hedef, Math.round(fs.statSync(hedef).size / 1024) + ' kB');

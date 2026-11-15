/* Tek kirişli gezer köprü vinci ailesi (app/aile-kreyn.js) — saf seçim ve hesap fonksiyonları.
   Karşılaştırma değerleri: GH Cranes "End Carriages" kataloğu 2022 (uç araba tablosu, teker seçim çizelgesi, izin verilen teker yükü),
   GHB11 / GHD13 föyleri 03.2021 (ceraskal modeli, hız, kanca yolu) ve SW2_MIM_MEK_R3.dwg kesit D-D (SW2/CR/001, 10 t).
   Çalıştır: node test/kreyn.test.js */
'use strict';
const path = require('path'), assert = require('assert');
globalThis.C = {};
require(path.join(__dirname, '..', 'app', 'aile-kreyn.js'));
const K = C.kreyn;
let n = 0; const ok = (k, m) => { assert.ok(k, m); n++; };
const es = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };
const yak = (a, b, m, t) => ok(Math.abs(a - b) <= (t || 1e-6), `${m}: ${a} ≠ ${b}`);

/* ---- GH uç araba tablosu (tek kiriş): Ø, teker aralığı A1 → toplam boy A2, ağırlık ---- */
es(K.UC[160].boy[2100], [2535, 205], 'Ø160 / 2100');
es(K.UC[160].boy[4200], [4635, 330], 'Ø160 / 4200');
es(K.UC[125].boy[2600], [2960, 185], 'Ø125 / 2600');
es(K.UC[250].boy[3100], [3665, 425], 'Ø250 / 3100');
es(K.UC[315].boy[4200], [4825, 760], 'Ø315 / 4200');
es([K.UC[160].A6, K.UC[160].A7, K.UC[160].A9, K.UC[160].A10, K.UC[160].A12], [175, 37.5, 250, 302.5, 536], 'Ø160 gövde ölçüleri');
es([K.UC[250].A6, K.UC[250].A7, K.UC[250].A9, K.UC[250].A10, K.UC[250].A12], [258, 30, 300, 345, 621], 'Ø250 gövde ölçüleri');

/* ---- teker seçim çizelgesi: kapasite + açıklık → teker çapı, teker aralığı ---- */
const uc = (Q, S) => { const u = K.ucAraba(Q, S); return [u.D, u.A1, u.A2, u.kg]; };
es(uc(10, 5650), [160, 2100, 2535, 205], '10 t / 5,65 m (SW2)');
es(uc(10, 10500), [160, 2100, 2535, 205], '10 t / 10,5 m');
es(uc(10, 12000), [250, 2100, 2665, 335], '10 t / 12 m');
es(uc(10, 20000), [250, 3100, 3665, 425], '10 t / 20 m');
es(uc(10, 28000), [315, 4200, 4825, 760], '10 t / 28 m');
es(uc(1, 6000), [125, 2100, 2460, 160], '1 t / 6 m');
es(uc(1, 26000), [160, 4200, 4635, 330], '1 t / 26 m');
es(uc(5, 12500), [125, 2100, 2460, 160], '5 t / 12,5 m');
es(uc(5, 15000), [160, 2600, 3035, 235], '5 t / 15 m');
es(uc(6.3, 6000), [160, 2100, 2535, 205], '6,3 t / 6 m');
es(uc(3.2, 24000), [160, 3600, 4035, 295], '3,2 t / 24 m');
es(K.ucAraba(1, 23000).A1, 3600, 'Ø125 arabada 3600 var');
for (const Q of K.KAP) for (let S = 3000; S <= 30000; S += 500) { const u = K.ucAraba(Q, S); ok(u.A2 > u.A1 && u.kg > 0 && K.UC[u.D], `seçim ${Q} t / ${S}`); }
/* kapasite büyüdükçe teker küçülmez */
for (let S = 4000; S <= 30000; S += 1000) { let d = 0; for (const Q of K.KAP) { const D = K.ucAraba(Q, S).D; ok(D >= d, `teker çapı kapasiteyle azalmaz (${Q} t, ${S})`); d = D; } }
es(K.kapBul(9.7), 10, 'kapasite en yakın standart değere'); es(K.kapBul('6,3'), 6.3, 'virgüllü kapasite'); es(K.kapBul('1.6'), 1.6, 'yazıdan kapasite');

/* ---- ceraskal föyleri ---- */
{ const c = K.ceraskal(10, 14000); es([c.model, c.halat, c.hiz, c.fem, c.yol, c.yeter], ['GHD13-4104-M6', '4/1', 4, 'M6', 15.6, true], '10 t ceraskal (SW2: 14 m gerekir → 15,6 m)'); yak(c.hizBos, 6.4, 'yük ≤ %25 hızı'); }
{ const c = K.ceraskal(10, 20000); es([c.yol, c.yeter], [15.6, false], '10 t: 20 m standart yollarda yok'); }
{ const c = K.ceraskal(5, 6000); es([c.model, c.halat, c.hiz, c.fem, c.yol], ['GHB11-054104-M6', '4/1', 4, 'M6', 6.8], '5 t ceraskal'); }
{ const c = K.ceraskal(2, 7000); es([c.model, c.halat, c.hiz, c.yol], ['GHB11-022108-M6', '2/1', 8, 7.26], '2 t ceraskal'); }
{ const c = K.ceraskal(1, 6000); es([c.model, c.halat, c.hiz, c.yol], ['GHB11-011116-M6', '1/1', 16, 14.5], '1 t ceraskal'); }

/* ---- izin verilen teker yükü (kN) ---- */
es(K.izinYuk(160, 20, '40'), 59, 'Ø160, 20 m/dk, K 40');
es(K.izinYuk(160, 40, '50'), 62, 'Ø160, 40 m/dk, K 50');
es(K.izinYuk(160, 30, '60'), 74, 'Ø160, 30 m/dk → 40 satırı, K 60');
es(K.izinYuk(250, 60, '40'), 80, 'Ø250, 60 m/dk → 63 satırı');
es(K.izinYuk(160, 20, 'A55'), 59, 'A55 rayı K 45 → 40 sütunu');
es(K.izinYuk(125, 20, '60'), 50, 'Ø125: 60 sütunu yok → 50');

/* ---- SW2/CR/001: 10 t, açıklık 5,65 m, ray üstü +6,04 (yerleşim +0,70) ---- */
const SW2 = { Q: '10', S: 5650, Hk: 14000, vk: '20', Hr: 5340, Ly: 20000, ray: '40', hy: 400, yk: 10000, xa: 2825, kz: 1500, hg: 320, bg: 0, gk: 0, Ga: 0, c: 0, e: 0 };
const h = K.hesap(SW2);
es([h.u.D, h.u.A1, h.u.A2, h.hg, h.bg, h.za], [160, 2100, 2535, 320, 300, 208], 'SW2 ölçüleri');
{ // elle: (10000 + 900) kg × 9,81 × (5650 − 750)/5650 / 2 + (120 × 5,65 + 2 × 205 + 150) kg × 9,81 / 4
  const Gk = 120 * 5.65 + 410 + 150, Rmax = (10900 * 9.81 * 4900 / 5650 / 2 + Gk * 9.81 / 4) / 1000, Rmin = (900 * 9.81 * 750 / 5650 / 2 + Gk * 9.81 / 4) / 1000;
  yak(h.Rmax, Rmax, 'SW2 en büyük teker yükü', 0.051); yak(h.Rmin, Rmin, 'SW2 en küçük teker yükü', 0.051); yak(h.Gk, Gk, 'köprü ağırlığı', 0.51);
  ok(h.Rmax > 45 && h.Rmax < 55, 'SW2 teker yükü 45–55 kN aralığında: ' + h.Rmax); es(h.Rizin, 59, 'izin verilen'); ok(h.tekerOk, 'teker yükü izin verilenin altında');
  /* dört tekerin toplamı = yük + kendi ağırlığı */
  yak(2 * h.Rmax + 2 * h.Rkar, (10000 + 900 + Gk) * 9.81 / 1000, 'düşey denge', 0.21);
}
yak((700 + h.kancaUst) / 1000, 0.70 + 5.34 + 0.208 - 0.85, 'kanca üst kotu (+5,398)');
{ const s = K.sigma(SW2, { z: 0.70, kolonAcik: 6.00, kirisAlt: 7.375, taban: -8.00 }), by = a => s.satir.find(x => x.ad.startsWith(a));
  yak(by('Ray ekseni').deger, 175, 'ray – kolon yüzü 175 mm'); ok(!by('Ray ekseni').ok, 'SW2: ray – kolon yüzü GH şemasındaki 200 mm\'den az → uyarı');
  ok(by('Kreyn üstü').ok && by('Kreyn üstü').deger > 500, 'çatı kirişi altına sığar'); ok(by('Kancanın').ok, 'kanca −8,00 tabanına iner'); ok(by('Teker').ok, 'teker yükü uygun');
  ok(!s.ok, 'SW2 denetimi yalnız duvar boşluğundan uyarı verir'); es(s.satir.filter(x => !x.ok).length, 1, 'tek uyarı'); }
{ const s = K.sigma(Object.assign({}, SW2, { Hk: 12000 }), { z: 0.70, taban: -8.00 }); ok(!s.satir[0].ok, '12,8 m kanca yolu −8,00 tabanına yetmez'); }

/* ---- kapasite değişince ölçü ve özellikler değişir ---- */
{ let r = 0, g = 0; for (const Q of K.KAP) { const x = K.hesap(Object.assign({}, SW2, { Q: String(Q), S: 12000, hg: 0 })); ok(x.Rmax > r && x.hg >= g, `${Q} t: teker yükü ve kiriş yüksekliği kapasiteyle artar`); r = x.Rmax; g = x.hg; ok(x.tekerOk !== null, 'izin verilen yük bulunur'); } }
{ const a = K.hesap(Object.assign({}, SW2, { Q: '1', hg: 0 })), b = K.hesap(Object.assign({}, SW2, { hg: 0 })); ok(a.u.D === 125 && b.u.D === 160 && a.cr.model !== b.cr.model && a.hg < b.hg && a.Ga < b.Ga, '1 t ile 10 t farklı teker, ceraskal, kiriş'); }
/* elle girilen kabuller otomatiğin yerine geçer */
{ const x = K.hesap(Object.assign({}, SW2, { Ga: 1200, gk: 150, c: 900, e: 800, bg: 350 })); es([x.Ga, x.gk, x.c, x.e, x.bg], [1200, 150, 900, 800, 350], 'elle kabuller'); }

/* ---- statik için ray hatları (dünya koordinatı) ---- */
{ const y = K.statikYuk({ p: [100, 50], rot: 90, z: 0.70 }, SW2); // rot 90: yürüme yolu +Y yönünde, yerel x = −X
  yak(y.rayUstKot, 6.04, 'ray üstü kotu'); es(y.tekerAraligi, 2.1, 'teker aralığı'); yak(y.Rmax, h.Rmax, 'Rmax');
  yak(y.raylar[0][0][0], 100 - 2.825, 'ray 1 x'); yak(y.raylar[1][0][0], 100 + 2.825, 'ray 2 x'); yak(y.raylar[0][1][1], 70, 'yol sonu y'); yak(y.raylar[0][0][2], 6.04, 'ray z'); }

console.log(`kreyn: ${n} denetim geçti`);

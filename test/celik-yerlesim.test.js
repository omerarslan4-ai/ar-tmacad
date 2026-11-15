/* Çelik yerleşim hesapları (app/celik-yerlesim.js): çatı kirişi uç kotları, çerçeve bulma, aşık aralıkları ve dönmesi,
   vinç gusesi parçaları, vinç yolu kotları ve hatları. Örnek: 20 m açıklıklı, 6 m aralıklı, saçak +6,00 bir sanayi yapısı.
   Çalıştır: node test/celik-yerlesim.test.js */
'use strict';
const path = require('path'), assert = require('assert');
globalThis.C = {};
require(path.join(__dirname, '..', 'app', 'celik-profil.js'));
require(path.join(__dirname, '..', 'app', 'celik-yerlesim.js'));
const Y = C.celikYer, K = C.celik;
let n = 0; const ok = (k, m) => { assert.ok(k, m); n++; };
const yak = (a, b, m, t) => ok(Math.abs(a - b) <= (t || 1e-6), `${m}: ${a} ≠ ${b}`);
const nokta = (p, q, m) => { for (let i = 0; i < q.length; i++) yak(p[i], q[i], m + '[' + i + ']'); };

/* beşik çatı: 20 m açıklık, %10 eğim, saçak taşması 0,5 m → mahya 6 + 10 × 0,10 = 7,00; saçak ucu 6 − 0,05 = 5,95 */
{ const r = Y.catiKirisi([0, 0], [20, 0], 6, { tip: 'besik', egim: 10, tasma: 0.5 });
  ok(r.parcalar.length === 2, 'beşik iki parça'); yak(r.mahya, 7, 'mahya'); yak(r.zu, 5.95, 'saçak ucu kotu'); yak(r.acikl, 20, 'açıklık');
  nokta(r.parcalar[0].a, [-0.5, 0, 5.95], 'sol uç'); nokta(r.parcalar[0].b, [10, 0, 7], 'mahya noktası'); nokta(r.parcalar[1].b, [20.5, 0, 5.95], 'sağ uç');
  yak(r.aci, Math.atan(0.1) * 180 / Math.PI, 'açı'); }
/* mahya kotu verilince eğim ondan: 7,50 → (7,5 − 6) / 10 = %15 */
{ const r = Y.catiKirisi([0, 0], [0, 20], 6, { tip: 'besik', egim: 10, mahya: 7.5 }); yak(r.egim, 15, 'mahyadan eğim'); nokta(r.parcalar[0].b, [0, 10, 7.5], 'Y yönünde mahya'); }
/* tek eğimli: 12 m, %5 → yüksek uç 6,60; taşma 0,3 m → alt uç 5,985, üst uç 6,615 */
{ const r = Y.catiKirisi([0, 0], [12, 0], 6, { tip: 'tek', egim: 5, tasma: 0.3 }); ok(r.parcalar.length === 1, 'tek eğim tek parça');
  yak(r.mahya, 6.6, 'tek eğim yüksek aks'); nokta(r.parcalar[0].a, [-0.3, 0, 5.985], 'alt uç'); nokta(r.parcalar[0].b, [12.3, 0, 6.615], 'üst uç'); }

/* kolonlardan çerçeve: 20 × 30 m, kolonlar 6 m arayla (x = 0 / 20, y = 0 … 30) → 6 çerçeve, kirişler X yönünde */
{ const kol = []; for (let y = 0; y <= 30; y += 6) kol.push({ p: [0, y], z: 6 }, { p: [20, y], z: 6 }); kol.push({ p: [10, 0], z: 4 }); // ara (rüzgâr) kolonu yok sayılır
  const c = Y.cerceveleriBul(kol, 'oto'); ok(c.length === 6, 'altı çerçeve: ' + c.length); nokta(c[0].A, [0, 0], 'ilk çerçeve A'); nokta(c[0].B, [20, 0], 'ilk çerçeve B'); nokta(c[5].A, [0, 30], 'son çerçeve');
  const cy = Y.cerceveleriBul(kol, 'Y'); ok(cy.length === 2 || cy.length === 3, 'Y yönünde boyuna hatlar');
  // kareye yakın plan (20 × 18 m, 4 çerçeve): otomatik yön kısa kenara değil, daha çok çerçeve veren yöne (X) gider
  const kare = []; for (let y = 0; y <= 18; y += 6) kare.push({ p: [0, y], z: 7 }, { p: [20, y], z: 7 }); const ck = Y.cerceveleriBul(kare, 'oto'); ok(ck.length === 4, 'kare planda dört çerçeve'); nokta(ck[1].B, [20, 6], 'kare plan ikinci çerçeve');
  const t = Y.cerceveleriBul([{ p: [0, 0], z: 7 }, { p: [12, 0], z: 6 }], 'X'); nokta(t[0].A, [12, 0], 'tek eğimde alçak uç A'); yak(t[0].zB, 7, 'yüksek kolon kotu'); }

/* iki aksla tekrar: ilk çerçeve (0,0)–(20,0), son hiza y = 30, en çok 6,5 m → 5 açıklık × 6 m */
{ const r = Y.cerceveTekrar([0, 0], [20, 0], [5, 30], 6.5); ok(r.n === 5, 'beş açıklık'); yak(r.adim, 6, 'aralık 6 m'); ok(r.cerceveler.length === 6, 'altı çerçeve'); nokta(r.cerceveler[5].B, [20, 30], 'son çerçeve B'); }

/* aşık aralıkları: eğim boyu 10,55 m, en çok 1,5 m, uçlardan 0,15 m → (10,25 / 1,5) = 6,83 → 7 aralık, 8 aşık, 1,464 m */
{ const k = Y.asikKonumlari(10.55, 1.5, 0.15, 0.15); ok(k.length === 8, 'sekiz aşık'); yak(k[0], 0.15, 'ilk aşık'); yak(k[7], 10.4, 'son aşık'); yak(k[1] - k[0], 10.25 / 7, 'eşit aralık', 1e-5);
  ok(Y.asikKonumlari(10.55, 1.2).length === 10, '1,2 m aralıkta on aşık'); }

/* aşık yerleşimi: üç çerçeve beşik çatı (6 m aralık), UPN160, %10, taşma 0,3 → her yüzde 8 konum × 2 açıklık = 16, iki yüz 32 aşık */
{ const kir = []; for (const y of [0, 6, 12]) kir.push(...Y.catiKirisi([0, y], [20, y], 6, { tip: 'besik', egim: 10, tasma: 0.5 }).parcalar);
  const as = Y.asikYerlesim(kir, { aralik: 1.5, bas: 0.15, son: 0.15, tasma: 0.3, h: 160 }); ok(as.length === 32, 'otuz iki aşık: ' + as.length);
  const al = Math.atan(0.1), Ls = Math.hypot(10.5, 1.05);
  // sol yüzün ilk aşığı: saçak ucundan 0,15 m (eğim boyunca) yukarıda, kesit ortası çatı normali yönünde 80 mm dışarıda
  const s = as.filter(q => q.a[0] < 10).sort((p, q) => p.a[2] - q.a[2] || p.a[1] - q.a[1])[0];
  const x = -0.5 + 0.15 * Math.cos(al) - Math.sin(al) * 0.08, z = 5.95 + 0.15 * Math.sin(al) + Math.cos(al) * 0.08;
  nokta(s.a, [x, -0.3, z], 'ilk aşık başı (taşmalı)', 1e-5); nokta(s.b, [x, 6, z], 'ilk aşık sonu'); yak(Math.abs(s.rot), al * 180 / Math.PI, 'aşık dönmesi = eğim açısı', 1e-5);
  ok(as.filter(q => q.a[0] > 10).length === 16 && Ls > 10, 'sağ yüzde 16 aşık');
  ok(Y.asikYerlesim(kir, { aralik: 1.5, h: 160, surekli: true }).length === 16, 'sürekli aşık: yüz başına 8'); }

/* aşık dönmesi gerçekten çatıya dik: celik.js frame() ile aynı formül (vy = −sin r · vx0 + cos r · z) */
{ const kir = Y.catiKirisi([0, 0], [0, 20], 6, { tip: 'besik', egim: 20 }).parcalar.concat(Y.catiKirisi([6, 0], [6, 20], 6, { tip: 'besik', egim: 20 }).parcalar);
  for (const q of Y.asikYerlesim(kir, { aralik: 2, h: 120 })) { const u = [q.b[0] - q.a[0], q.b[1] - q.a[1]], L = Math.hypot(...u), e = [u[0] / L, u[1] / L], vx0 = [-e[1], e[0]], r = q.rot * Math.PI / 180;
    const vy = [-Math.sin(r) * vx0[0], -Math.sin(r) * vx0[1], Math.cos(r)], yuk = q.a[1] < 10 ? 1 : -1; // sol yüz +y yönünde yükselir
    const nrm = [0, -yuk * Math.sin(Math.atan(0.2)), Math.cos(Math.atan(0.2))]; yak(vy[0] * nrm[0] + vy[1] * nrm[1] + vy[2] * nrm[2], 1, 'gövde çatı normalinde', 1e-6); } }

/* vinç gusesi: HEB300 kolon (h = 300, b = 300), rot 0, F yönünde (profil derinliği +y), guse üst +5,20, ray ekseni 0,60 m */
{ const kol = { a: [0, 0, 0], b: [0, 0, 7], rot: 0, hc: 300, bc: 300 };
  const g = Y.guseParcalari(kol, { yon: 'F', zt: 5.2, e: 0.6, tip: 'K' }); ok(g.parcalar.length === 1, 'konsol tek parça');
  nokta(g.parcalar[0].a, [0, 0.15, 5.2], 'konsol kolon yüzünde'); nokta(g.parcalar[0].b, [0, 0.75, 5.2], 'konsol ucu ray ekseni + 0,15'); nokta(g.yuk[0].p, [0, 0.6, 5.2], 'yük noktası');
  const d = Y.guseParcalari(kol, { yon: 'FA', zt: 5.2, e: 0.6, tip: 'D' }); ok(d.parcalar.length === 4 && d.yuk.length === 2, 'kademeli iki yön');
  nokta(d.parcalar[0].a, [0, 0.6, 0], 'vinç ayağı altı'); nokta(d.parcalar[0].b, [0, 0.6, 5.2], 'vinç ayağı üstü'); nokta(d.yuk[1].p, [0, -0.6, 5.2], 'arka yük noktası');
  const r = Y.guseParcalari({ a: [10, 0, 0], b: [10, 0, 7], rot: 90, hc: 300, bc: 300 }, { yon: 'F', zt: 5.2, e: 0.6 }); nokta(r.yuk[0].p, [9.4, 0, 5.2], 'dönmüş kolonda F = −x', 1e-9); }

/* içe doğru yön: rot 90'da derinlik −x yönünde (F); x = 0 sırası ortaya (+x) bakmak için A, x = 20 sırası F */
{ ok(Y.iceYon({ a: [0, 6], rot: 90 }, [10, 9], 'FA') === 'A', 'sol sıra içe A'); ok(Y.iceYon({ a: [20, 6], rot: 90 }, [10, 9], 'FA') === 'F', 'sağ sıra içe F'); ok(Y.iceYon({ a: [0, 0], rot: 0 }, [0, 5], 'FA') === 'F', 'rot 0 +y F'); }
/* vinç yolu kotları: guse +5,20, HEB300 kiriş, A45 ray (55 mm) → kiriş üstü 5,50, ray üstü 5,555 */
{ const k = Y.vincYoluKot(5.2, K.profil('HEB300').h, K.profil('A45').h); yak(k.kirisUst, 5.5, 'kiriş üstü'); yak(k.rayUst, 5.555, 'ray üstü'); yak(k.rayOrta, 5.5275, 'ray ortası'); }
/* vinç yolu hatları: iki sıra kolon (x = 0 ve 20, karşılıklı guseler), dört çerçeve → iki hat × 4 nokta */
{ const yuk = []; for (const y of [18, 0, 12, 6]) { yuk.push(...Y.guseParcalari({ a: [0, y, 0], rot: 90, hc: 300, bc: 300 }, { yon: 'A', zt: 5.2, e: 0.6 }).yuk, ...Y.guseParcalari({ a: [20, y, 0], rot: 90, hc: 300, bc: 300 }, { yon: 'F', zt: 5.2, e: 0.6 }).yuk); }
  const h = Y.vincYoluHatlari(yuk); ok(h.length === 2, 'iki vinç yolu hattı'); ok(h.every(q => q.noktalar.length === 4), 'her hatta dört nokta');
  const sol = h.find(q => q.noktalar[0][0] < 10); yak(sol.noktalar[0][0], 0.6, 'sol hat ray ekseni'); ok(Math.abs(sol.noktalar[0][1] - sol.noktalar[3][1]) === 18, 'hat boyunca sıralı'); }

/* ray kataloğu: DIN 536 A45–A120 ağırlıkları (kg/m) */
for (const [ad, G] of [['A45', 22.1], ['A55', 31.8], ['A65', 43.1], ['A75', 56.2], ['A100', 74.3], ['A120', 100]]) { const p = K.profil(ad); ok(p && p.tur === 'RAY', ad + ' katalogda'); yak(p.G, G, ad + ' kg/m', G * 0.01); ok(K.kesit(ad).dis.length >= 8, ad + ' kesit'); }
ok(K.adCoz('Ray A55') === 'A55' && K.goster('A55') === 'Ray A55', 'ray adı');

console.log(`celik-yerlesim: ${n} denetim geçti.`);

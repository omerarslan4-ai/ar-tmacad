/* Anaerobik havuzun mimari pafta tarifi testi — çalıştır: node test/anaerobik-pafta.test.js
   GERÇEK PROJELER:
   - Kullanıcının 50.000 m³/gün havuzu (test-proje/Anaerobik-50bin-statik.aritma): 3 halka, Ro 4,10, düz boy 29,40, orta perde 35, dış / ortak duvar 70,
     kanal duvarı 65, radye 80 cm, su 4,50 m, duvar üstü 97,25, hava payı 0,61, ikinci yürüyüş yolu var.
     Elle: xc1 = 0,65 + 2,20 + 0,70 + 4,10 = 7,65; xc2 = 37,05; xR = 41,85; boy 44,90; halka eksenleri 4,80 / 13,70 / 22,60; en 27,40;
           taban 97,25 − 0,61 − 4,50 = 92,14; yürüme yolu 97,45; köprü 34,9375 – 36,4375; pencere 31,7375 – 34,7375; kapak sahanlığı 31,3375'ten.
   - Çokal AAT T-105 (anaerobik.js varsayılanları; 3-Çokal_AAT_Anaerobik_R3.dwg planındaki kesit işaretleri, yerel m):
     A-A y = 5,30 (aks D; kesitte orta perde kesilmemiş), B-B x = 9,125, C-C x = 0,886, D-D x = 16,40; plan başlığı "93.50 ve 97.45 KOTLARI PLANI". */
'use strict';
const assert = require('assert');
const A = require('../app/anaerobik.js'), P = require('../app/anaerobik-pafta.js'), K = require('../app/acilim-kod.js');
let n = 0; const t = (ad, fn) => { fn(); n++; console.log('✓ ' + ad); };
const yakin = (a, b, m, tol) => assert.ok(Math.abs(a - b) < (tol || 0.0015), m + ': ' + a + ' ≠ ' + b);
const E50 = { n: 3, Ls: 29.4, Ro: 4.1, tw: 0.35, two: 0.7, rg: 1.95, tg: 0.3, bG: 2.2, bC: 2.4, tK: 0.65, ag: 2, ah: 2.05, dAg: 1.94, ow: 3, oh: 2.25, dPe: 2.14, bO: 1.4, h: 4.5, tb: 0.8, zt: 97.25, fb: 0.61, k2: 1 };
const G = A.geo(E50), Gc = A.geo({}), kes = (g, nm, o) => P.kesitler(g, o).find(k => k.nm === nm);
/* kesit hattının geçtiği açılım kutularının kodları (acilim-kod.js uniteAcilim ile aynı kural: hat kutunun içinden geçiyorsa) */
const kodlar = (g, k) => { const L = P.acilimlar(g), kayit = {}, out = []; for (const it of L) K.kodVer(kayit, it.tur, it.lines);
  for (const it of L) { let var_ = false; for (let s = 0; s <= 1 && !var_; s += 0.0005) { const q = [k.a[0] + (k.b[0] - k.a[0]) * s, k.a[1] + (k.b[1] - k.a[1]) * s]; var_ = it.kutular.some(b => q[0] >= b[0] && q[0] <= b[2] && q[1] >= b[1] && q[1] <= b[3]); } if (var_) out.push(K.kodVer(kayit, it.tur, it.lines)); }
  return [...new Set(out)].sort(); };

t('planlar: başlık havuzun kendi kotlarıyla, kesme kotu yürüme yolunun 1,20 m üstünde; planda su yok', () => {
  const L = P.planlar(G, { ekipUst: 99.25 });
  assert.strictEqual(L.length, 2); assert.strictEqual(L[0].baslik, '92.14 ve 97.45 KOTLARI PLANI'); yakin(L[0].h, 98.65, 'plan kesme kotu');
  assert.strictEqual(L[0].su, false); assert.strictEqual(L[1].su, false);
  assert.strictEqual(P.planlar(Gc, {})[0].baslik, '93.50 ve 97.45 KOTLARI PLANI'); // Çokal başlığı
});
t('üst plan: kesme kotu en yüksek ekipmanın (pergel vinç) gerçek üst kotu + pay; ekipman yoksa ya da alçaksa üst plan yok', () => {
  const L = P.planlar(G, { ekipUst: 99.25 }); assert.strictEqual(L[1].baslik, 'ÜST PLAN'); yakin(L[1].h, 99.45, 'üst plan kesme kotu (99,25 + 0,20)');
  yakin(P.planlar(G, { ekipUst: 100.1, pay: 0.3 })[1].h, 100.4, 'ekipman yükselince kesme kotu da yükselir');
  assert.strictEqual(P.planlar(G, {}).length, 1); assert.strictEqual(P.planlar(G, { ekipUst: 98.0 }).length, 1);
  assert.ok(L[1].depth > L[1].h - G.zB, 'derinlik tabana kadar');
});
t('50 bin: kesit yerleri havuz geometrisinden (A-A orta perdenin yanından, B-B sahanlığın solundan, C-C / D-D kanallardan)', () => {
  const a = kes(G, 'A'), b = kes(G, 'B'), c = kes(G, 'C'), d = kes(G, 'D');
  yakin(a.a[1], 13.7 + (0.175 + 1.0) / 2, 'A-A y'); assert.strictEqual(a.a[1], a.b[1]); assert.ok(a.sp[1] > a.a[1], 'A-A bakış +y'); yakin(a.depth, 27.4 - a.a[1], 'A-A derinlik');
  assert.ok(a.a[1] > 13.7 + 0.175 && a.a[1] < 13.7 + 1.0, 'A-A orta perdeyi kesmez, ağızdan geçer');
  yakin(b.a[0], 31.3375 - 0.375, 'B-B x'); assert.ok(b.sp[0] > b.a[0], 'B-B bakış +x (köprüye)'); assert.ok(b.a[0] > G.kopru2.x1 && b.a[0] < G.sahanlik[0].x0, 'B-B iki yürüyüş yolunun arasında, sahanlığın solunda');
  yakin(c.a[0], 0.65 + 0.73 * 2.2, 'C-C x'); assert.ok(c.sp[0] > c.a[0], 'C-C bakış +x'); assert.ok(c.a[0] > 0.65 && c.a[0] < 2.85, 'C-C giriş kanalının içinde');
  yakin(d.a[0], 41.85 + 1.2, 'D-D x'); assert.ok(d.sp[0] < d.a[0], 'D-D bakış −x'); yakin(d.depth, 43.05 - 37.05, 'D-D derinlik');
  for (const k of [a, b, c, d]) assert.ok(Math.hypot(k.b[0] - k.a[0], k.b[1] - k.a[1]) > 27.4, k.nm + ' hattı yapıyı boydan boya geçer');
  assert.ok(b.a[1] < -1 && b.b[1] > 27.4 + 1 + 1, 'enine hat tretuvarın ve merdiven sahanlığının dışına taşar');
});
t('Çokal T-105: hesaplanan kesit yerleri paftadan ölçülenlerle uyuşur', () => {
  const a = kes(Gc, 'A'), b = kes(Gc, 'B'), c = kes(Gc, 'C'), d = kes(Gc, 'D');
  assert.ok(Math.abs(a.a[1] - 5.30) <= 0.30, 'A-A Çokal aks D (5,30) ile aynı ağızdan geçer: ' + a.a[1]); yakin(a.a[1], 5.525, 'A-A orta perde yüzü ile ağız kenarının ortası');
  yakin(c.a[0], 0.886, 'C-C (Çokal 0,886)', 0.005); yakin(d.a[0], 16.40, 'D-D (Çokal 16,40)', 0.005);
  yakin(b.a[0], 8.9 - 0.375, 'B-B kapak sahanlığının 0,375 m solu'); assert.ok(Math.abs(b.a[0] - 9.125) < 0.65 && b.a[0] < Gc.kopru.x0, 'B-B Çokal 9,125 ile aynı bölgede (düz kısım, köprünün solu)');
  yakin(a.kademe.x, 15.9 + 0.73, 'Çokal A-A kademesi x (16,63)'); // bilgi: kademeli kesit uygulanmıyor
});
t('mahal adları halka adları: RAS, <kod>/1, <kod>/2; planda üst koridorda, A-A ve B-B kesitlerinde', () => {
  assert.strictEqual(P.kodYaz('T101'), 'T-101'); assert.strictEqual(P.kodYaz('T-105'), 'T-105');
  const R = P.tarif(G, { kod: 'T101', ekipUst: 99.25 });
  assert.deepStrictEqual(R.mahaller.map(m => m.ad), ['RAS', 'T-101/1', 'T-101/2']);
  R.mahaller.forEach((m, i) => { assert.ok(m.p[1] > G.yc[i] + 0.175 && m.p[1] < G.yc[i] + 4.1, 'mahal adı üst koridorda'); assert.ok(m.p[0] > G.xc1 && m.p[0] < G.kopru.x0); });
  assert.deepStrictEqual(kes(G, 'A', { kod: 'T101' }).mahal.map(m => m.ad), ['T-101/1']);
  assert.deepStrictEqual(kes(G, 'B', { kod: 'T101' }).mahal.map(m => m.ad), ['RAS', 'T-101/1', 'T-101/2']);
  assert.strictEqual(kes(G, 'C').mahal.length, 0); assert.strictEqual(kes(G, 'D').mahal.length, 0);
  yakin(kes(G, 'B').mahal[0].z, (92.14 + 96.64) / 2, 'kesitte mahal adı su derinliğinin ortasında');
  assert.deepStrictEqual(P.tarif(A.geo({ n: 1 }), { kod: 'T105' }).mahaller.map(m => m.ad), ['T-105/1']);
  assert.strictEqual(R.gorunus, false); assert.strictEqual(R.ustGorunus, false);
});
t('açılımlar: kalınlıklar havuz parametrelerinden; kod sırası DU01 … DU06, DÖ01 … DÖ03', () => {
  const L = P.acilimlar(G), kayit = {}, kod = L.map(it => K.kodVer(kayit, it.tur, it.lines)), ilk = L.map(it => K.satirBicim(it.lines[0]));
  assert.deepStrictEqual(kod, ['DU01', 'DU02', 'DU03', 'DU04', 'DU05', 'DU06', 'DÖ01', 'DÖ02', 'DÖ03']);
  assert.deepStrictEqual(ilk, ['70 cm C30/37 HAZIR BETON', '70 cm C30/37 HAZIR BETON', '65 cm C30/37 HAZIR BETON', '65 cm C30/37 HAZIR BETON', '35 cm C30/37 HAZIR BETON', '30 cm C30/37 HAZIR BETON', '80 cm C30/37 HAZIR BETON', '20 cm C30/37 HAZIR BETON', '15 cm TRETUVAR']);
  assert.deepStrictEqual(L.map(it => it.t), [0.7, 0.7, 0.65, 0.65, 0.35, 0.3, 0.8, 0.2, 0.15]);
  assert.strictEqual(L[0].lines.length, 3); assert.strictEqual(L[1].lines.length, 1); assert.strictEqual(L[6].lines[1], 'C16/20 grobeton (10 cm)');
  for (const it of L) { assert.ok(it.kutular.length && it.etiket.length, it.ad + ': kutu ve plan etiketi var'); assert.ok(it.z1 > it.z0); for (const b of it.kutular) assert.ok(b[2] > b[0] && b[3] > b[1], it.ad + ': kutu düzgün'); }
  yakin(L[6].z0, 91.34, 'radye altı'); yakin(L[6].z1, 92.14, 'radye üstü'); yakin(L[7].z1, 97.45, 'köprü üstü'); yakin(L[8].z1, 95.0, 'tretuvar üstü (duvar üstü − 2,25)');
  // kalınlık değişince satır da değişir (sabit sayı yok)
  assert.strictEqual(K.satirBicim(P.acilimlar(A.geo(Object.assign({}, E50, { two: 0.6, tb: 0.9 })))[0].lines[0]), '60 cm C30/37 HAZIR BETON');
  // Çokal ölçülerinde kanal ara duvarı, orta perde ve yönlendirme perdesi aynı katmanlaşma (30 cm beton) → aynı kod
  const Lc = P.acilimlar(Gc), kc = {}; assert.deepStrictEqual(Lc.map(it => K.kodVer(kc, it.tur, it.lines)), ['DU01', 'DU02', 'DU03', 'DU04', 'DU04', 'DU04', 'DÖ01', 'DÖ02', 'DÖ03']);
});
t('kesitlerin geçtiği elemanlar: her kesitte doğru kodlar', () => {
  assert.deepStrictEqual(kodlar(G, kes(G, 'A')), ['DU02', 'DU03', 'DU06', 'DÖ01', 'DÖ02', 'DÖ03']); // orta perde (DU05) kesilmez
  assert.deepStrictEqual(kodlar(G, kes(G, 'B')), ['DU01', 'DU02', 'DU05', 'DÖ01', 'DÖ03']);
  assert.deepStrictEqual(kodlar(G, kes(G, 'C')), ['DU03', 'DÖ01', 'DÖ03']);
  assert.deepStrictEqual(kodlar(G, kes(G, 'D')), ['DU03', 'DU04', 'DÖ01', 'DÖ03']); // çıkış kanalı ara duvarı
});
t('planda kod etiketleri: bütün döşeme / temel ve duvar kodları elemanın üstünde', () => {
  const R = P.tarif(G, { kod: 'T101' }), dos = R.kodlar.filter(k => k.tur === 'doseme'), duv = R.kodlar.filter(k => k.tur === 'duvar');
  const ic = (p, b) => p[0] >= b[0] - 1e-6 && p[0] <= b[2] + 1e-6 && p[1] >= b[1] - 1e-6 && p[1] <= b[3] + 1e-6;
  assert.ok(dos.filter(k => /Radye/.test(k.ad)).length >= 3 + 2, 'radye kodu her halkada ve iki kanalda');
  const kop = dos.filter(k => /köprü/.test(k.ad)).map(k => k.a);
  assert.ok(kop.some(p => ic(p, [G.kopru.x0, 0, G.kopru.x1, 27.4])), 'servis köprüsü'); assert.ok(kop.some(p => ic(p, [G.kopru2.x0, 0, G.kopru2.x1, 27.4])), 'yürüyüş yolu');
  assert.ok(kop.some(p => ic(p, [G.kopru.x0, 27.4, G.kopru.x1, G.kopru.y1])), 'merdiven sahanlığı (köprünün dışarıdaki ucu)');
  for (const s of G.sahanlik) assert.ok(kop.some(p => ic(p, [s.x0, s.y0, G.kopru.x0, s.y1])), 'kapak işletme sahanlığı');
  assert.ok(dos.some(k => /Tretuvar/.test(k.ad) && k.a[1] < 0), 'tretuvar');
  assert.strictEqual(new Set(duv.map(k => k.ad)).size, 6, 'altı duvar / perde türünün hepsi planda');
  for (const it of P.acilimlar(G).filter(q => q.tur === 'duvar' && !/Yönlendirme|uç duvarı/.test(q.ad))) for (const p of it.etiket) assert.ok(it.kutular.some(b => ic(p, b)), it.ad + ': etiket duvarın üstünde');
});
t('planda gövde çizgilerinin sınıfı: duvar / köprü kalın (Beton), tretuvar ayrı, radyenin toprak altındaki kenarı çizilmez', () => {
  const S = P.planSinif(G);
  assert.strictEqual(S([22, 0]), 'govde'); assert.strictEqual(S([0, 13.7]), 'govde'); assert.strictEqual(S([20, 13.7]), 'govde');
  assert.strictEqual(S([0, 0.5]), 'radye'); assert.strictEqual(S([3, 0]), 'radye'); assert.strictEqual(S([44.9, 27.0]), 'radye');
  assert.strictEqual(S([20, -1]), 'tretuvar'); assert.strictEqual(S([-1, 13.7]), 'tretuvar');
});
console.log(String.fromCharCode(10) + n + ' test geçti.');

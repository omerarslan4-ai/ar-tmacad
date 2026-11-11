/* Ön arıtma derin yapısı — Çokal AAT çizim 1 (83,20 / 85,75 / 86,95 kotları planı) ile karşılaştırma.
   Çizim (cm, terfi dış sol-alt köşesi 110268,7 / 58783,9): dış boy 16,40; terfi 3,30 × 4,70 (iç 2,50 × 3,90); kanal dış eni 2,60 (y 1,05–3,65),
   iç 1,80; iki kanal 0,60, ayırıcı 0,60; ayırıcı ince bölgede 4,90 → 9,00 (+R0,30), kaba bölgede 10,20 (−R0,30) → 14,00; ortak geçiş 9,30–9,90;
   kapak yuvaları A 13,85–13,95, C 10,34–10,44, E 8,76–8,86, G 5,00–5,10. Çalıştır: node test/onaritma.test.js */
'use strict';
const assert = require('assert');
const { geo, ekipmanYer, su, islakHazne } = require('../app/onaritma.js');
const { ucgenle } = require('../app/anaerobik.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yakin = (a, b, msg, tol) => assert.ok(Math.abs(a - b) < (tol || 0.006), `${msg}: ${a} ≠ ${b}`);
const COKAL = { zTab: 86.75, zTr: 84.80, zTon: 85.89, zToff: 85.15, Li: 4.10, Lk: 3.80 }; // Çokal kotları (programın varsayılanı 4,00 m yapı yüksekliği)
const G = geo(COKAL);

t('Çokal çizim 1: dış ölçüler, terfi, kanal', () => {
  yakin(G.Lo, 16.40, 'boy'); yakin(G.tO, 3.30, 'terfi dış eni'); yakin(G.tYo, 4.70, 'terfi dış boyu');
  yakin(G.yc0, 1.05, 'kanal alt dış'); yakin(G.Wc, 2.60, 'kanal dış eni'); yakin(G.W, 1.80, 'kanal iç eni');
  assert.deepStrictEqual(G.kanal.map(c => [+c.y0.toFixed(2), +c.y1.toFixed(2)]), [[1.45, 2.05], [2.65, 3.25]]);
});

t('Çokal çizim 1: ayırıcı perde, ortak geçiş, kapak yuvaları', () => {
  yakin(G.x1, 4.90, 'ince bölge başı'); yakin(G.x2, 9.00, 'ince bölge sonu (yuvarlak uç merkezi)'); yakin(G.x3, 10.20, 'kaba bölge başı'); yakin(G.x4, 14.00, 'kaba bölge sonu'); yakin(G.x5, 16.00, 'giriş odası');
  yakin(G.x3 - G.x2 - G.q.ts, 0.60, 'ortak geçiş');
  const kx = k => G.kapak.find(x => x.k === k).x; yakin(kx('A'), 13.90, 'A'); yakin(kx('C'), 10.39, 'C'); yakin(kx('E'), 8.81, 'E'); yakin(kx('G'), 5.05, 'G');
  assert.strictEqual(G.kapak.length, 8, 'iki kanalda dörder kapak'); assert.strictEqual(G.kes.filter(k => k.k === 'yuva').length, 16, 'her kapakta iki yuva');
});

t('beton tek plan şekli geçerli; ayırıcılar kanalın içinde', () => {
  const B = G.bolge, ar = h => { let s = 0; for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  const A = ar(B.dis) + B.delik.reduce((s, h) => s + ar(h), 0), At = ucgenle([B.dis, ...B.delik]).reduce((s, [a, b, c]) => s + ((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2, 0);
  yakin(At, A, 'üçgen alanı', 1e-6); yakin(A, 3.30 * 4.70 - 2.50 * 3.90 + 13.10 * 2.60 - 12.70 * 1.80, 'duvar alanı', 1e-6);
  for (const a of G.ayirici) for (const p of a) assert.ok(p[0] >= G.tO - 1e-9 && p[0] <= G.x5 + 1e-9 && p[1] >= G.yi0 - 1e-9 && p[1] <= G.yi1 + 1e-9, 'ayırıcı kanal içinde');
});

t('ekipman: 8 penstok kanal eninde, 4 ızgara, 3 pompa, merdiven ve korkuluk', () => {
  const E = ekipmanYer(G, 94.80), tur = k => E.filter(x => x.tur === k);
  assert.strictEqual(tur('penstok').length, 8); assert.ok(tur('penstok').every(x => x.B === 0.60 && x.z === 86.75), 'kapak = kanal eni, tabanda');
  assert.strictEqual(tur('izgara').length, 4); assert.strictEqual(tur('izgara').filter(x => x.ince).length, 2);
  for (const x of tur('izgara')) { const iz = G.izgara.find(i => `izg-${i.k}-${i.kanal}` === x.anahtar); assert.strictEqual(x.p[0], iz.xa, 'ızgara ayağı'); assert.ok(iz.x1 < iz.xa && iz.x0 > iz.xa - 3.5, 'döşeme açıklığı ızgaranın geçtiği yerde'); }
  assert.strictEqual(tur('pompa').length, 3); assert.ok(tur('pompa').every(p => p.p[0] > 0.4 && p.p[0] < 2.9 && p.p[1] > 0.4 && p.p[1] < 4.3), 'pompalar ıslak haznede');
  const m = tur('merdiven')[0]; yakin(m.z1 - m.z0, 0.65, 'platform zeminden 0,65'); assert.ok(m.nr >= 4);
  assert.strictEqual(tur('korkuluk').length, 3, 'konveyör geçişlerinde korkuluk açık');
  const S = su(G); yakin(S[0].maks, 87.35, 'kanal maks. su'); yakin(S[1].maks, 85.89, 'terfi devreye girme');
});

t("orta perde 1,00 m (Çokal) ve A kapaklarına kadar; kısaltılırsa A'da kısa parça; pompa basma borusu duvar dibinde", () => {
  assert.strictEqual(G.q.hA, 1.00); assert.strictEqual(G.ayirici.length, 2);
  yakin(Math.max(...G.ayirici[1].map(p => p[0])), 14.00, 'kaba ayırıcı A kapaklarına kadar');
  const Gk = geo(Object.assign({ Lka: 2.55 }, COKAL)); assert.strictEqual(Gk.ayirici.length, 3); yakin(Math.max(...Gk.ayirici[1].map(p => p[0])), 12.75, 'Çokal boyu'); const st = Gk.ayirici[2].map(p => p[0]); yakin(Math.min(...st), 13.75, 'kısa parça');
  for (const k of G.kapak) assert.ok(G.ayirici.some(a => Math.min(...a.map(p => p[0])) <= k.x - 0.05 && Math.max(...a.map(p => p[0])) >= k.x + 0.05), 'her kapak orta perdeye oturur: ' + k.k);
  const E = ekipmanYer(G, 94.80); for (const p of E.filter(x => x.tur === 'pompa')) { assert.strictEqual(p.aci, 180, 'pompa kanala doğru'); yakin(p.p[0], 0.85, 'basma borusu iç yüzden 0,45'); }
});

t('ızgara boşaltma kot zinciri: konteyner zeminde, konveyör altı konteynerin 0,30 üstünde, ağız bandın 0,15 üstünde, platformdan en az 1,0', () => {
  const E = ekipmanYer(G, 94.80), K = G.kotZincir; yakin(K.zKont, 96.17, 'konteyner üstü'); yakin(K.zAlt, 96.47, 'konveyör altı konteynerin 0,30 üstünde'); yakin(K.zBant, 96.75, 'bant'); yakin(K.hdU, 1.45, 'boşaltma ağzı platformdan');
  const E2 = ekipmanYer(geo({}), 93.20); yakin(E2.find(x => x.tur === 'izgara').hdU, 1.00, 'zemin düşükse standart 1,0 m');
  const kv = E.filter(x => x.tur === 'konveyor'), ko = E.filter(x => x.tur === 'konteyner'); assert.strictEqual(kv.length, 2); assert.strictEqual(ko.length, 2);
  const kx = G.kapak.map(k => k.x); for (const c of kv) assert.ok(kx.every(x => Math.abs(c.p[0] - x) >= 0.68), 'konveyör kapak tahriklerinin üstünde değil');
  for (const c of kv) { const k = ko.find(o => o.etiket === c.etiket); yakin(k.p[0], c.p[0], 'konteyner bandın ucunda'); assert.ok(c.p[1] - c.L < k.p[1] + 0.54 && c.p[1] - c.L > k.p[1] - 0.54, 'bant ucu konteynerin üstünde'); assert.ok(k.p[1] + 0.535 < G.yc0, 'konteyner yapının dışında'); }
});

t('varsayılan: ızgara yapısı 4,00 m (platform − kanal tabanı), terfi ve pompa kotları birlikte kayar; konveyör kapaklardan uzak', () => {
  const G4 = geo(); yakin(G4.q.zPl - G4.q.zTab, 4.00, 'yapı yüksekliği'); yakin(G4.q.zTr, 89.49, 'terfi tabanı hesaptan'); yakin(G4.q.zTon, 90.59, 'en üst seviye');
  const E = ekipmanYer(G4, 94.80); assert.ok(E.filter(x => x.tur === 'penstok').every(x => Math.abs(x.D - 4.00) < 1e-6), 'kapak derinliği 4 m (tam şasi)');
  const kx = G4.kapak.map(k => k.x); for (const c of E.filter(x => x.tur === 'konveyor')) assert.ok(kx.every(x => Math.abs(c.p[0] - x) >= 0.68 - 1e-6), 'konveyör kapaktan uzak');
});

t('bölge uzunlukları ızgaradan: yapı derinleşince yapı uzar, konveyör hep kapaklardan uzak, döşeme açıklığı ızgaranın geçtiği yer', () => {
  const G4 = geo(), G8 = geo(Object.assign({}, COKAL, { Li: null, Lk: null }));
  yakin(G4.Li, 4.25, 'ince 4 m'); yakin(G4.Lk, 4.20, 'kaba 4 m'); yakin(G4.Lo, 16.95, 'boy 4 m'); assert.ok(G8.Lo > G4.Lo + 2, 'derin yapı daha uzun');
  for (const g of [G4, G8]) {
    const E = ekipmanYer(g, 94.80), kx = g.kapak.map(k => k.x);
    for (const c of E.filter(x => x.tur === 'konveyor')) assert.ok(kx.every(x => Math.abs(c.p[0] - x) >= 0.68 - 1e-6), 'konveyör kapaktan uzak');
    // ızgara arka yüzü (oluk kotunda) ile konveyör kenarı arası ≥ 0,60
    const D = g.q.zPl - g.q.zTab, hd = D + g.kotZincir.hdU, a = 75 * Math.PI / 180, yb1 = (hd + 0.25) / Math.tan(a) + 0.354 / Math.sin(a);
    for (const iz of g.izgara) { const c = g.konveyor.find(k => k.k === iz.k); assert.ok((iz.xa - yb1) - (c.x + (g.q.Bk + 0.16) / 2) >= 0.60 - 1e-6, 'ızgara – konveyör ≥ 0,60'); }
    for (const iz of g.izgara) { const D = g.q.zPl - g.q.zTab, t0 = D / Math.tan(75 * Math.PI / 180); assert.ok(iz.x1 > iz.xa - t0 && iz.x0 < iz.xa - t0 - 0.36, 'ızgara açıklıktan geçer'); yakin(iz.x1 - iz.x0, 0.40 + 0.354 / Math.sin(75 * Math.PI / 180), 'açıklık boyu'); }
  }
});

t('ıslak hazne hesabı (ATV-A 134): Çokal T-102 kotları — h1 85,89, h2 85,50, hrev 85,35, hölü 85,15, taban 84,80; hazne 3,90 × 2,50', () => {
  const G0 = geo({ zTab: 86.75 }), I = G0.IH, tol = 0.015;
  yakin(I.V, 0.9 * 18 / 10, 'faydalı hacim'); yakin(I.L, 3.90, 'uzun kenar (3 pompa)'); yakin(I.B, 2.50, 'kısa kenar');
  yakin(I.ust, 85.89, 'en üst (yedek + alarm)', tol); yakin(I.pom[1], 85.50, '2. asıl pompa', tol); yakin(I.pom[0], 85.35, '1. asıl pompa', tol);
  yakin(I.durma, 85.15, 'durma', tol); yakin(I.taban, 84.80, 'taban', tol); assert.ok(I.Zger <= 10 + 1e-9, 'kalkış ≤ Z');
  yakin(G0.q.zTr, I.taban, 'çizim tabanı hesaptan'); assert.deepStrictEqual(G0.pompa.map(p => +p.y.toFixed(2)), [1.35, 2.35, 3.35], 'aks aralığı 1,00, duvara 0,95');
  // büyük pompa: faydalı yükseklik büyür, 1 m'yi aşarsa hazne genişler; derinlik artar
  const I2 = islakHazne(Object.assign({}, G0.q, { Qp: 150, tY: null, tX: 2.5, zTon: null, zToff: null, zTr: null }));
  assert.ok(I2.hu <= 1.0 + 1e-9 && I2.B >= 2.5 && I2.taban < I.taban, 'büyük debide hazne genişler / derinleşir');
  const I4 = islakHazne(Object.assign({}, G0.q, { np: 5, tY: null })); yakin(I4.L, 5.90, '5 pompa'); assert.ok(I4.taban < I.taban, '3 asıl pompada bir kademe daha');
});

t('parametrik: 3 kanal, geniş kanal', () => {
  const G3 = geo({ n: 3, b: 1.0 }); yakin(G3.W, 3 * 1.0 + 2 * 0.6, 'iç en'); assert.strictEqual(G3.ayirici.length, 4); assert.strictEqual(G3.kapak.length, 12);
  assert.ok(G3.Wc > G3.tYo, 'kanal terfiden geniş'); const ys = G3.bolge.dis.map(p => p[1]); assert.ok(Math.min(...ys) < 0, 'dış sınır terfiyi aşar');
});

t('su tutucu bant: perde eksenlerinde, betonun içinde, taban üstünden 0,10 m', () => {
  const ic = (p, h) => { let c = false; for (let i = 0, j = h.length - 1; i < h.length; j = i++) { const a = h[i], b = h[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const beton = p => (ic(p, G.bolge.dis) && !G.bolge.delik.some(h => ic(p, h))) || G.ayirici.some(a => ic(p, a));
  assert.ok(G.bantlar.length >= 4);
  for (const b of G.bantlar) { const P = b.closed ? [...b.pts, b.pts[0]] : b.pts; for (let i = 1; i < P.length; i++) { const m = [(P[i - 1][0] + P[i][0]) / 2, (P[i - 1][1] + P[i][1]) / 2]; assert.ok(beton(m), b.anahtar + ' betonun içinde'); } }
  assert.ok(Math.abs(G.bantlar.find(b => b.anahtar === 'terfi').z - 84.90) < 1e-9); assert.ok(Math.abs(G.bantlar.find(b => b.anahtar === 'kanal').z - 86.85) < 1e-9);
});

console.log(`\n${n} test geçti.`);

/* Statik model tutarlılığı (statik-model-denetci bulguları, 14.11.2026) — yapı türüne göre çözüm yolunun ön koşulları.
   1) Kabuk ağında perdeler kendi eksenlerinde kalır (app/hesap/statik-kabuk.js › kabukAg): uç düğüm komşu perdenin ekseniyle kendi
      ekseninin kesişimine taşınır. Konya: B aksı y 0,05, A aksı 8,00 (eskiden iç yüzlere, 0,30 / 7,70'e kayıyordu); kısa perde açıklığı 7,95.
   2) Statik eleman listesi ve ağırlık metrajla aynı NET hacimlerle (app/yapi-cakisma.js): Konya toplam 371,65 m³ (perde 167,51; brüt 179,34);
      çerçeve deprem ağırlığında perde içindeki kolon izi iki kez sayılmaz.
   3) Projenin zemin / deprem / kot değerleri (C.doc.set.statikAyar) statik penceresine geçer (Konya: φ 30, Ka, q 5, YAS −5,20, kuru hazne).
   4) Döşeme boşluğu (Konya galeri 100 × 100 sac kapak) kabuk ağından çıkar; "Kalınlık öner" kaba ağdan sonra asıl ağla doğrular
      (galeri döşemesi kesmesi 0,8 m ağda yetiyor görünüp 0,35 m ağda yetmiyordu).
   Çalıştır: node test/statik-model-tutarlilik.test.js */
'use strict';
const assert = require('assert');
const O = require('./statik-ortam.js'), P = O.pencere(), U = require('../araclar/konya-terfi-uret.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yak = (a, b, e, m) => assert.ok(Math.abs(a - b) <= e, `${m || ''} ${a} ≉ ${b} (±${e})`);

const { d } = O.modelCevir(O.konyaDoc()), S = O.uygula(P.ornekSaray(), JSON.parse(JSON.stringify(d)));

t('Konya: perdeler kendi eksenlerinde (B y 0,05 · A y 8,00 · kısa perdeler x 0,20 / 19,50); kısa perde açıklığı 7,95', () => {
  const AG = P.kabukAg(S.kabuk, { h: 0.5, kotlar: [] }), W = AG.W;
  const B = W.find(w => w.ad === 'P1'), A = W.find(w => w.ad === 'P2'), k1 = W.find(w => w.ad === 'P3'), k5 = W.find(w => w.ad === 'P4');
  assert.ok(B.P.every(q => Math.abs(q[1] - 0.05) < 1e-9), 'B aksı: ' + JSON.stringify(B.P)); assert.ok(A.P.every(q => Math.abs(q[1] - 8.0) < 1e-9), 'A aksı: ' + JSON.stringify(A.P));
  for (const k of [k1, k5]) { const ys = k.P.map(q => q[1]).sort((a, b) => a - b); yak(ys[0], 0.05, 1e-9); yak(ys[1], 8.0, 1e-9); yak(k.boy, 7.95, 1e-6, 'kısa perde açıklığı'); }
  yak(k1.P[0][0], 0.2, 1e-9); yak(k5.P[0][0], 19.5, 1e-9);
  yak(B.boy, 19.3, 1e-6, 'uzun perde eksen boyu (köşe eksenleri arası)');
  // radye konsolu: B perdesi ekseninden radye kenarına 0,75 m (dış yüzden 0,50)
  const ry = Math.min(...S.kabuk.radye.pts.map(q => q[1])); yak(0.05 - ry, 0.75, 1e-9);
  // A aksı kolonları perde içinde (kaburga), düşmez: 10 kolonun hepsi gömülü
  assert.strictEqual(new Set(AG.bars.filter(b => b.tur === 'kolon').map(b => b.id)).size, 10);
  assert.ok(AG.uyarC.some(u => /10 kolon \(10 perde içinde/.test(u)), AG.uyarC.join(' | '));
});
t('perde birleşimleri: L köşede iki eksen kesişir, T birleşimde kısa perde uzun perde eksenine uzar; perdeler kaymaz', () => {
  const M = { walls: [{ ad: 'U', pts: [[0, 0], [10, 0]], t: 0.5, zt: 3, tip: 'dis' }, { ad: 'K', pts: [[0.25, 0.25], [0.25, 6]], t: 0.4, zt: 3, tip: 'dis' }, { ad: 'T', pts: [[5, 0.25], [5, 6]], t: 0.3, zt: 3, tip: 'ic' }],
    radye: { pts: [[-1, -1], [11, -1], [11, 7], [-1, 7]], t: 0.4, kAlt: -0.4 }, dosemeler: [] };
  const W = P.kabukAg(M, { h: 0.5, kotlar: [] }).W;
  assert.deepStrictEqual(W[0].P.map(q => q.map(v => +v.toFixed(6))), [[0.25, 0], [10, 0]], 'U ucu L köşede K ekseninde, kendi ekseninde');
  assert.deepStrictEqual(W[1].P[0].map(v => +v.toFixed(6)), [0.25, 0], 'K ucu U eksenine uzar');
  assert.deepStrictEqual(W[2].P[0].map(v => +v.toFixed(6)), [5, 0], 'T ucu U eksenine uzar');
});

t('Konya: statik eleman listesi net hacimle — toplam 371,65 m³ (brüt 390,59), perde 167,51 (brüt 179,34), metrajla aynı', () => {
  const H = d.hacim; yak(H.net, 371.652, 0.01); yak(H.brut, 390.589, 0.01, 'brüt');
  yak(H.top.Perde, 167.505, 0.01); yak(H.top.Temel, 117.99, 0.01); yak(H.top.Kolon, 28, 0.01); yak(H.top['Kiriş'], 26.071, 0.01); yak(H.top['Döşeme'], 8.689 + 23.397, 0.01);
  const pB = H.liste.filter(e => e.tur === 'perde').reduce((s, e) => s + e.brut, 0); yak(pB, 179.335, 0.01, 'perde brüt');
  assert.ok(!H.liste.some(e => /taban betonu|kaide/i.test(e.no || '')), 'zemine oturan döşeme statik eleman değildir');
  // metrajla aynı kaynak: yapi-cakisma.js net
  const N = O.modelCevir(O.konyaDoc()).C.yapiCakisma.net(U.uret().doc.ents); let p = 0; for (const [, m] of N) if (m.tur === 'perde') p += m.net; yak(p, H.top.Perde, 1e-3);
});
t('alt yapı üst kotunda (−0,26) kotla bölme: kolonların alt kısmı alt yapıda, alt + üst = net', () => {
  const B = P.netHacimBol(d.hacim, -0.26);
  yak(B.altTop + B.ustTop, d.hacim.net, 0.01); yak(B.alt.Kolon, 10 * 0.25 * 6.5, 0.01); yak(B.ust.Kolon, 10 * 0.25 * 4.7, 0.01);
  yak(B.alt.Perde, 167.505, 0.01); assert.ok(!B.ust.Perde && !B.ust.Temel); yak(B.alt['Döşeme'], 8.689, 0.01, 'galeri döşemesi alt yapıda'); yak(B.ust['Döşeme'], 23.397, 0.01, 'çatı üst yapıda');
  const S2 = Object.assign({}, S, { yapi: { tur: 'altUst', altUstKot: -0.26 } }), NA = P.netAgirlik(S2); yak(NA.V, B.altTop, 1e-6); yak(NA.G, B.altTop * S.mal.gc, 1e-6);
});
t('çerçeve deprem ağırlığı: perde içindeki kolon izi iki kez sayılmaz', () => {
  yak(P._perdeKolonIz({ a: [0, 0], b: [5, 0], t: 0.3 }, { x: 0, y: 0, bx: 0.4, by: 0.4 }), 0.2 * 0.3, 1e-12, 'perde ucundaki kolon');
  yak(P._perdeKolonIz({ a: [0, 0], b: [5, 0], t: 0.3 }, { x: 2.5, y: 0.1, bx: 0.5, by: 0.5 }), 0.5 * 0.3, 1e-12, 'perdeden taşan kolon');
  yak(P._perdeKolonIz({ a: [0, 0], b: [5, 0], t: 0.3 }, { x: 2.5, y: 1, bx: 0.5, by: 0.5 }), 0, 1e-12);
  const S0 = P.ornekSaray(); S0.dep.SDS = 0.4; S0.suYapisi = false;
  S0.cer = { kolonlar: [[0, 0], [5, 0]].map(([x, y], i) => ({ id: i + 1, no: 'S' + (i + 1), x, y, bx: 0.4, by: 0.4, z0: 0, zt: 3 })), kirisler: [], dosemeler: [], perdeler: [{ a: [0, 0], b: [5, 0], t: 0.3, z0: 0, zt: 3 }], ayar: Object.assign(P.cerceveVars(), { analiz3B: false }) };
  const RC = P.cerceveHesap(S0), gc = S0.mal.gc, bek = 2 * gc * 0.16 * 3 / 2 + gc * 0.3 * 5 * 3 / 2 - 2 * gc * 0.06 * 3 / 2;
  yak(RC.deprem.katlar[0].w, bek, 1e-6, 'kat ağırlığı');
});

t('Konya: projeye kayıtlı zemin / deprem / kot değerleri pencereye geçer; kayıt yoksa pencere değerleri kalır (eski projeler)', () => {
  const Z = U.KONYA_DEPREM.zemin; assert.deepStrictEqual(d.statikAyar.zemin, Z);
  for (const k of Object.keys(Z)) assert.strictEqual(S.zemin[k], Z[k], k);
  assert.strictEqual(S.dep.r, 1.5); assert.strictEqual(S.dep.SDS, 0.553);
  assert.strictEqual(S.geo.kZemin, -0.2); assert.strictEqual(S.geo.kYAS, -5.2); yak(S.geo.kSu, S.kabuk.radye.kAlt + S.kabuk.radye.t, 1e-9, 'pompa holü kuru: su radye üstünde');
  const S0 = P.ornekSaray(), z0 = JSON.stringify(S0.zemin), d0 = JSON.parse(JSON.stringify(d)); delete d0.statikAyar; delete d0.cerceve.ayar;
  const S1 = O.uygula(S0, d0); assert.strictEqual(JSON.stringify(S1.zemin), z0);
});

t('Konya galeri döşemesi: 100 × 100 sac kapak boşluğu kabuk ağından çıkar (eleman alanı = döşeme − 1,00 m²)', () => {
  const D = S.kabuk.dosemeler[0]; assert.ok(D.delik && D.delik.length === 1, JSON.stringify(D.delik));
  const AG = P.kabukAg(S.kabuk, { h: 0.35, kotlar: [] }), els = AG.els.filter(e => e.grp === 'D0'), A = els.reduce((s, e) => s + Math.abs((AG.nodes[e.n[2]][0] - AG.nodes[e.n[0]][0]) * (AG.nodes[e.n[2]][1] - AG.nodes[e.n[0]][1])), 0);
  let Ap = 0; const q = D.pts; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; Ap += a[0] * b[1] - b[0] * a[1]; } Ap = Math.abs(Ap) / 2;
  yak(A, Ap - 1.0, 0.05, 'döşeme ağ alanı');
  const ic = e => { const c = [0, 2].map(k => AG.nodes[e.n[k]]), x = (c[0][0] + c[1][0]) / 2, y = (c[0][1] + c[1][1]) / 2; return x > 17.7 && x < 18.7 && y > 1 && y < 2; };
  assert.ok(!els.some(ic), 'boşlukta eleman kalmamalı');
  // döşeme altındaki kirişin perdeye saplanan ucu perde düğümüdür (döşemeye bağ değil): K3 ucu (19,50; 5,40)
  const uc = AG.nodes.findIndex(p => Math.abs(p[0] - 19.5) < 0.01 && Math.abs(p[1] - 5.4) < 0.01 && Math.abs(p[2] - (D.zt - D.t / 2)) < 0.01);
  assert.ok(uc >= 0 && AG.els.some(e => e.tur === 'perde' && e.n.includes(uc)) && AG.bars.some(b => b.tur === 'kiris' && b.n.includes(uc)), 'kiriş ucu perde düğümünde');
});
t('Kalınlık öner kaba ağdan sonra asıl ağla doğrular: Konya galeri döşemesi kesmesi 15 → 20 cm', () => {
  const S1 = JSON.parse(JSON.stringify(S)); S1.tas.kmesh = 0.35; S1.yapi = { tur: 'su' }; // kabuk tek başına (kolon tepkisiz) — mekanizma sınaması
  const o = P.kabukOnerHesap(S1, { maxTur: 1 });
  assert.ok(o.log.some(s => /^D5 20 cm$/.test(s)), o.log.join(' | ')); assert.strictEqual(o.kabuk.dosemeler[0].t, 0.2);
  assert.strictEqual(o.r.h, 0.35, 'son hesap asıl ağla');
});

console.log(`\n${n} test geçti.`);

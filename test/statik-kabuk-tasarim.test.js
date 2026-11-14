/* 3B kabuk hesabında kesit tasarımı kuralları (app/hesap/statik-kabuk-arayuz.js › P.kabukHesap, P.kabukBolge).
   1) Eksenel çekme + eğilme: eşdeğer moment Meq = M + 0,5·N·0,9·d AYNI noktada ve AYNI kombinasyonda oluşan M ve N ile hesaplanır
      (eskiden grubun bir yerindeki en büyük N, başka yerindeki en büyük M ile toplanıyordu — Konya galeri döşemesi bu yüzden tutmuyordu).
   2) Kesme tahkiki mesnet yüzünden d içeride (TS 500 8.1). Elle çözüm: üstü serbest konsol perde, üçgen toprak itkisi
      V(z) = 1,6·K0·γ·(H − z)² / 2 ; tabanda 74,8, d = 24 cm içeride 63,3 kN/m (H = 3 m, φ = 25°, γ = 18).
   3) Tekil noktalar (döşeme boşluğunun köşesi, döşeme kenarının perdede bittiği nokta, kirişin perdeye saplandığı düğüm) kalınlık
      gerekçesi olmaz; yerel ilave donatı notu olarak bildirilir. Perde köşeleri tekil nokta değildir.
   Şerit ortalaması varsayılanı değişmedi (yalnız model / proje ayarı verirse açılır).
   Çalıştır: node test/statik-kabuk-tasarim.test.js */
'use strict';
const assert = require('assert');
const O = require('./statik-ortam.js'), P = O.pencere();
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

const kutu = (H, tw, o) => {
  const S = P.ornekSaray(), kAlt = 100, hr = 0.40, zt = kAlt + hr + H;
  S.kabuk = { walls: [['P1', [[0, 0], [12, 0]]], ['P2', [[12, 0], [12, 5]]], ['P3', [[12, 5], [0, 5]]], ['P4', [[0, 5], [0, 0]]]].map(([ad, pts], i) => ({ id: i + 1, ad, pts, kapali: false, t: tw, zt, tip: 'dis' })),
    radye: { id: 9, pts: [[-0.5, -0.5], [12.5, -0.5], [12.5, 5.5], [-0.5, 5.5]], t: hr, kAlt }, dosemeler: [] };
  S.geo = Object.assign(S.geo, { Lx: 12, Ly: 5, tw, ti: tw, hr, toe: 0.5, bolX: [], bolY: [], doseme: [], kAlt, kUst: zt, kZemin: zt, kSu: kAlt + hr, kYAS: null, ust: 'S' });
  S.mod = 'kabuk'; S.suYapisi = false; S.dep.SDS = 0; S.zemin.q = 0; S.tas.kmesh = 0.25; Object.assign(S, o || {});
  return S;
};
const grupTepe = (r, g, arr) => { let m = -1e9; for (const i of g.ids) for (let k = 0; k < 4; k++) m = Math.max(m, arr[i * 4 + k]); return m; };

const S1 = kutu(3.0, 0.30), r1 = P.kabukHesap(S1);
t('kesme mesnet yüzünden d içeride: konsol perde (elle çözüm 63,3 kN/m; tabandaki tepe değer kullanılmaz)', () => {
  const T = r1.tasarim[0], d = 0.30 - 0.05 - 0.01, K0 = 1 - Math.sin(25 * Math.PI / 180), V = z => 1.6 * K0 * 18 * (3 - z) ** 2 / 2;
  const tepe = grupTepe(r1, T.grup, r1.Z.tsm.v);
  assert.ok(Math.abs(V(0) - 74.8) < 0.1 && Math.abs(V(d) - 63.3) < 0.1);
  assert.ok(T.kesme.Vd < tepe - 5, `Vd ${T.kesme.Vd} tabandaki tepe ${tepe} değerinden küçük olmalı`);
  assert.ok(Math.abs(T.kesme.Vd - V(d)) < 0.15 * V(d), `Vd ${T.kesme.Vd} ≈ ${V(d)} (±%15: iki doğrultuda çalışma ve ağ)`);
  assert.ok(Math.abs(T.kesme.yeri[2] - (100.40 + d)) < 0.02, 'kritik kesit radye üstünden d yukarıda: ' + T.kesme.yeri);
  // düşey moment de elle çözümle tutar: M = 1,6·K0·γ·H³/6 = 74,8 kNm/m
  const k = T.katman.find(q => /düşey/.test(q.yon) && q.yuz === 'dış'); assert.ok(Math.abs(k.M - 74.8) < 0.08 * 74.8, 'M22 dış ' + k.M);
});

t('mesnet bölgesi: perde tabanı, perde köşesi ve radyede perde hattı; perde ortası bölge dışında', () => {
  const AG = r1.AG, G = P.kabukBolge(S1, AG, r1.h), ep = AG.els.find(e => e.tur === 'perde' && e.wi === 0), er = AG.els.find(e => e.tur === 'radye'), d = 0.24;
  assert.strictEqual(G.mes([6, 0, 100.45], ep, d), true); assert.strictEqual(G.mes([6, 0, 100.70], ep, d), false);
  assert.strictEqual(G.mes([0.3, 0, 102], ep, d), true, 'köşe (P4 perdesinin yüzünden d içeride)'); assert.strictEqual(G.mes([0.5, 0, 102], ep, d), false);
  assert.strictEqual(G.mes([6, 0.3, 100.2], er, 0.34), true); assert.strictEqual(G.mes([6, 2.5, 100.2], er, 0.34), false);
  assert.strictEqual(G.tekil.length, 0, 'döşemesiz, kirişsiz kutuda tekil nokta yok');
});

t('eşdeğer moment aynı noktadaki N ve M ile: grubun ayrı yerlerindeki tepe N + tepe M toplamından büyük olamaz', () => {
  const S = kutu(3.0, 0.30); S.geo.kSu = 103.0; S.geo.kZemin = 100.5;                 // içi dolu, dışı boş: yatayda çekme + eğilme
  const r = P.kabukHesap(S); let kucuk = 0;
  for (const T of r.tasarim) { const g = T.grup, k45 = 0.45 * (g.t - g.c - 0.01);
    for (const k of T.katman) { const E = r.Z.tsm[k.key + 'E'], yon = k.key.slice(1, 3), s = k.key[3] === 'p' ? 1 : -1;
      const tepeE = Math.max(0, grupTepe(r, g, E)), tepeN = Math.max(0, grupTepe(r, g, r.Z.tsm['n' + yon]));
      let tepeM = 0; for (const i of g.ids) for (let c = 0; c < 4; c++) tepeM = Math.max(tepeM, s * r.Z.tsm[k.key][i * 4 + c]);
      assert.ok(Math.abs(k.Meq - tepeE) < 1e-3 * (1 + tepeE), `${T.eleman} ${k.yon} ${k.yuz}: Meq ${k.Meq} = nokta zarfının en büyüğü ${tepeE}`);
      assert.ok(Math.abs(k.M + k45 * k.N - k.Meq) < 1e-2 * (1 + k.Meq), 'M + 0,45·d·N = Meq (aynı nokta)');
      assert.ok(k.Meq <= tepeM + k45 * tepeN + 1e-3 * (1 + tepeE), 'eski toplamdan büyük olamaz'); if (k.Meq < 0.97 * (tepeM + k45 * tepeN)) kucuk++; } }
  assert.ok(kucuk > 0, 'en az bir katmanda tepe N ile tepe M farklı noktalarda (eski toplam fazlaydı)');
});

/* Konya terfi: galeri döşemesi A aksı perdesinde x = 3,90'da bitiyor, 40/60 kiriş x = 3,70'te perdeye saplanıyor */
const { d } = O.modelCevir(O.konyaDoc()), SK = O.uygula(P.ornekSaray(), JSON.parse(JSON.stringify(d)));
delete SK.kabuk.seritOrt;                                                             // varsayılan davranış: şerit ortalaması yok
/* tekil nokta kuralını sınamak için eski (ağır) yükleme kabulü: pencere varsayılan zemini (φ 25, K0, q 15) ve iç suyu (−1,84) — Konya'nın
   projeye kayıtlı değerleriyle (φ 30, Ka, q 5, kuru hazne, YAS −5,20) tekil noktada aşan eleman kalmayabilir; kural yükten bağımsızdır */
Object.assign(SK.zemin, P.ornekSaray().zemin); Object.assign(SK.geo, { kZemin: -0.56, kSu: -1.84, kYAS: -3.56 }); SK.dep.r = 1;
const rK = P.kabukHesap(SK);
t('Konya: tekil noktalar bulunur (boşluk köşesi, döşeme kenarının perdede bittiği nokta, kirişin saplandığı düğüm); perde köşeleri tekil değil', () => {
  const G = P.kabukBolge(SK, rK.AG, rK.h), var_ = (x, y, re) => G.tekil.some(q => Math.abs(q.p[0] - x) < 0.02 && Math.abs(q.p[1] - y) < 0.02 && re.test(q.neden));
  assert.ok(var_(3.9, 7.7, /perdede bittiği/)); assert.ok(var_(13.0, 7.7, /perdede bittiği/)); assert.ok(var_(19.3, 6.45, /perdede bittiği/));
  assert.ok(var_(3.9, 2.0, /boşluğunun köşesi/)); assert.ok(var_(17.3, 2.0, /boşluğunun köşesi/));
  assert.ok(var_(3.7, 7.7, /kirişin perdeye saplandığı/)); assert.ok(var_(3.7, 0.3, /kirişin perdeye saplandığı/));
  for (const [x, y] of [[0.4, 0.3], [19.3, 0.3], [0.4, 7.7]]) assert.ok(!G.tekil.some(q => Math.abs(q.p[0] - x) < 0.02 && Math.abs(q.p[1] - y) < 0.02), `perde köşesi (${x}; ${y}) tekil sayılmamalı`);
});
t('Konya: yalnız tekil noktada aşılan eleman yetersiz sayılmaz, yerel ilave donatı notu verilir', () => {
  assert.ok(rK.yerel.length > 0, 'yerel not bekleniyor'); assert.ok(rK.yerel.every(s => /tekil noktada \(/.test(s) && /kalınlık gerekçesi sayılmadı/.test(s)));
  let say = 0; for (const T of rK.tasarim) { for (const k of T.katman) if (k.yerel) { say++; assert.ok(k.sec.ok, 'yerel notlu katmanın genel donatısı seçilmiş olmalı'); assert.ok(k.yerel.M + 0.3 * k.yerel.N > k.M, 'tekil tepe genel değerden büyük'); }
    for (const y of (T.yerel || [])) if (y.tur === 'kesme') { say++; assert.ok(T.kesme.ok && y.V > T.kesme.Vd); } }
  assert.ok(say > 0);
  assert.ok(rK.bilgi.some(s => /yerel ilave donatı|yerel kesme donatısı/.test(s)), 'notlar sonuç iletilerinde görünmeli');
  assert.ok(!rK.uyar.some(s => /tekil noktada/.test(s)), 'yerel not uyarı (yetersizlik) listesine girmez');
});
t('Konya: perde üst kenarı bilgisi — B aksı ve kısa perdeler galeriyle tutulu, A aksı perdesi vinç boşluğu boyunca serbest', () => {
  const W = rK.AG.W, a = W.find(w => /A aks|P2/.test(w.ad) || Math.abs(w.pts[0][1] - Math.max(...W.map(q => q.pts[0][1]))) < 1e-6);
  const A = W.slice().sort((p, q) => q.ustSerbest - p.ustSerbest)[0];
  assert.ok(A.pts.every(q => q[1] > 7.5), 'en çok serbest kenarı olan perde A aksı perdesi'); void a;
  assert.ok(A.ustSerbest > 8.5 && A.ustSerbest < 15.5, `A aksı perdesinde serbest üst kenar ≈ 9,1 m boşluk + merdiven boşluğu: ${A.ustSerbest}`);
  const B = W.find(w => w.pts.every(q => q[1] < 0.5)); assert.ok(B.ustOran > 0.85, 'B aksı perdesi yürüme şeridiyle tutulu: ' + B.ustOran);
});

console.log(`\n${n} test geçti.`);

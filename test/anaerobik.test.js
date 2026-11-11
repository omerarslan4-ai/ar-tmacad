/* Anaerobik havuz çizim geometrisi — Çokal AAT T-105 (3-Çokal_AAT_Anaerobik_R3.dwg) ile karşılaştırma.
   Çizim ölçüleri (sol alt dış köşeye göre, m): dış 17,20 × 10,60; halka merkezleri x 3,00 / 14,00, y 1,90 / 5,30 / 8,70;
   kanal uçları y 0,90 – 9,70; ağız 95,75 – 96,75; pencere 9,50 – 11,00; köprü 11,00 – 12,50;
   sağ kanal ara duvarı y 3,60, kapaklı geçiş x 16,10 – 16,70; giriş borusu x 0,70; RAS borusu x 16,40; taban 93,50.
   Çalıştır: node test/anaerobik.test.js */
'use strict';
const assert = require('assert');
const { geo } = require('../app/anaerobik.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yakin = (a, b, msg, tol) => assert.ok(Math.abs(a - b) < (tol || 0.006), `${msg}: ${a} ≠ ${b}`);

const G = geo({ zt: 97.25, fb: 0.61, h: 3.14 }); // Çokal varsayılanları

t('Çokal T-105: dış ölçü, halka merkezleri, kanal uçları', () => {
  yakin(G.Lo, 17.20, 'boy'); yakin(G.Wo, 10.60, 'en');
  yakin(G.xc1, 3.00, 'sol merkez'); yakin(G.xc2, 14.00, 'sağ merkez');
  G.yc.forEach((y, i) => yakin(y, [1.9, 5.3, 8.7][i], 'halka ' + i));
  yakin(G.kanal.yb, 0.90, 'kanal alt ucu'); yakin(G.kanal.yt, 9.70, 'kanal üst ucu');
});

t('Çokal T-105: kotlar (taban, su, ağız)', () => {
  yakin(G.zB, 93.50, 'taban'); yakin(G.zW, 96.64, 'su'); yakin(G.zS, 95.75, 'ağız alt'); yakin(G.zH, 96.75, 'ağız üst'); yakin(G.zF, 93.00, 'temel');
  yakin(G.kopru.z1, 97.45, 'köprü üstü');
});

t('Çokal T-105: pencere, köprü, ara duvar ve borular', () => {
  // pencere köprüden 0,20 geri (kapak çerçevesi ve döşeme yarığı köprüye girmesin — Çokal'da bitişik: 9,50 – 11,00). Ortak duvarda orifis yok (Ömer Bey)
  yakin(G.pen.xw0, 9.30, 'pencere başı'); yakin(G.pen.xw1, 10.80, 'pencere sonu');
  yakin(G.kopru.x0, 11.00, 'köprü (çizim 16401,3)'); yakin(G.kopru.x1, 12.50, 'köprü sonu (çizim 16551,3)');
  yakin(G.ara.y, 3.60, 'ara duvar'); yakin(G.ara.g0, 16.10, 'ara duvar orifisi'); yakin(G.ara.g1, 16.70, 'orifis sonu');
  const or = G.acik.filter(a => a.k === 'orifis'); assert.strictEqual(or.length, 1, 'yalnız ara duvarda'); yakin(or[0].z0, 93.50, 'tabanda'); yakin(or[0].z1, 94.10, 'üstü perde');
  assert.strictEqual(G.boru.length, 0, 'boru delikleri varsayılanda yok (saha borulamasından gelir)');
  const b = k => G.boruYer[k];
  yakin(b('giris').p[0], 0.70, 'giriş borusu'); yakin(b('ras').p[0], 16.40, 'RAS borusu'); yakin(b('cikis').p[1], 6.80, 'çıkış borusu (çizim 6,80)', 0.21);
  assert.strictEqual(G.acik.filter(a => a.k === 'agiz').length, 6, 'her halkada iki ağız');
  assert.strictEqual(G.acik.filter(a => a.k === 'pencere').length, 2);
});

t('yuvarlak perdeler: her halkada iki, R0,70–R1,00, çıkış ucunda kulvar/2 baston; komşu halkalar ters döner', () => {
  const pr = G.parca.filter(p => p.k === 'perde'); assert.strictEqual(pr.length, 6);
  assert.deepStrictEqual(G.halka.map(h => h.yon), [1, -1, 1]);
  // RAS sol perde: üst uçta baston = kulvar / 2 = 0,675 (Çokal çiziminde 0,60), alt uçta baston yok
  const p0 = pr[0].pts, xs = p0.map(p => p[0]), ys = p0.map(p => p[1]);
  yakin(Math.max(...xs.filter((x, i) => ys[i] > 1.9 + 0.69)), 3.00 + 0.675 + 0.15, 'baston + yuvarlak uç'); yakin(G.baston, 1.35 / 2, 'baston = kulvar / 2');
  yakin(Math.min(...xs), 3.00 - 1.00, 'dış yarıçap'); yakin(Math.max(...ys), 1.90 + 1.00, 'üst');
  // halka 1 sol perde: uzantı altta
  const p1 = pr[2].pts; yakin(Math.max(...p1.filter(p => p[1] < 5.3 - 0.69).map(p => p[0])), 3.825, 'halka 1 alt baston');
  // yürüyüş yolu bastonun ucundan kulvar / 2 sonra (Çokal 12,50)
  yakin(G.kopru.x1, 14.00 - 0.675 - 0.15 - 0.675, 'köprü bastona göre');
});

t('hacim karusel formülüyle aynı; duvar parçaları kapalı ve geçerli', () => {
  const A = 11 * 3 - 11 * 0.3 + Math.PI * 2.25 - Math.PI * (1 - 0.49);
  yakin(G.V, A * 3.14 * 3, 'hacim', 0.01);
  for (const p of G.parca) { assert.ok(p.pts.length >= 3 && p.z1 > p.z0, 'parça'); assert.ok(p.pts.every(q => isFinite(q[0]) && isFinite(q[1]))); }
  const g1 = geo({ n: 1, Ls: 6 }); assert.ok(!g1.ara && g1.acik.every(a => a.k !== 'orifis'), 'tek halkada orifis ve ara duvar yok');
  yakin(g1.Wo, 3.8, 'tek halka eni');
});

t('beton duvarlar tek plan şekli: alan, nokta testleri ve üçgenleme', () => {
  const { ucgenle, bolgeKati } = require('../app/anaerobik.js');
  const B = G.bolge, ar = h => { let s = 0; for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  assert.ok(ar(B.dis) > 0 && B.delik.every(h => ar(h) < 0), 'yönler'); assert.strictEqual(B.delik.length, 3 + 1 + 2, '3 halka + giriş kanalı + çıkış kanalı iki bölüm (ara duvar boydan boya)');
  const A = ar(B.dis) + B.delik.reduce((s, h) => s + ar(h), 0), tr = ucgenle([B.dis, ...B.delik]);
  const At = tr.reduce((s, [a, b, c]) => s + ((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2, 0);
  yakin(At, A, 'üçgenler alanı = duvar alanı', 1e-6); assert.ok(A > 33 && A < 42, 'duvar alanı (elle ≈ 37–39) ' + A);
  const icinde = p => { const k = h => { let c = false; for (let i = 0, j = h.length - 1; i < h.length; j = i++) { const a = h[i], b = h[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }; return k(B.dis) && !B.delik.some(k); };
  for (const [p, v, ad] of [[[8, 3.6], true, 'ortak duvar'], [[8, 2.5], false, 'koridor'], [[0.7, 5], false, 'giriş kanalı suyu'], [[0.15, 5], true, 'kanal dış duvarı'], [[2.0, 3.6], true, 'kama dolgusu (Çokal)'], [[1.7, 3.6], false, 'kanal suyu'], [[15.6, 3.6], true, 'ara duvar (gövde tarafı)'], [[16.8, 3.6], true, 'ara duvar (dış duvar tarafı)'], [[16.4, 3.6], true, 'ara duvar (orifisin üstü perde)'], [[16.4, 2.0], false, 'RAS bölümü'], [[16.4, 6.0], false, 'çıkış bölümü'], [[8, 10.4], true, 'üst dış duvar'], [[1.5, 0.5], false, 'köşe dışı']]) assert.strictEqual(icinde(p), v, ad);
  const K = bolgeKati(B, 93.5, 97.25); assert.ok(K.f.length > 100 && K.e.length > 50);
});

t('orta duvar ve yuvarlak perdeler halkanın içinde kalır (dışarı taşmaz)', () => {
  const ic = (p, h) => { let c = false; for (let i = 0, j = h.length - 1; i < h.length; j = i++) { const a = h[i], b = h[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  for (const p of G.parca) for (const q of p.pts) assert.ok(G.bolge.delik.slice(0, G.n).some(h => ic(q, h)), p.k + ' noktası halka dışında: ' + q);
});

t('ekipman yerleri: Çokal penstok, merdiven ve köprü korkuluğu', () => {
  const { ekipmanYer } = require('../app/anaerobik.js');
  const E = ekipmanYer(G, { n: 2, D: 0.37, P: 2.5, rpm: 1400, name: 'Kompakt' }, 95.00), tur = k => E.filter(x => x.tur === k);
  assert.strictEqual(tur('penstok').length, 9, '6 ağız + 2 pencere + 1 ara duvar orifisi');
  const p0 = E.find(x => x.anahtar === 'pen-sol-0'); yakin(p0.p[0], 1.10 - 0.06, 'giriş kanalında, düz yüze dayalı'); yakin(p0.z, 95.75, 'eşik'); yakin(p0.D, 1.50, 'eşik → duvar üstü'); yakin(p0.B, 0.60, 'B');
  assert.strictEqual(E.find(x => x.anahtar === 'pen-sag-0').aci, 180, 'RAS halkasına giriş'); assert.strictEqual(E.find(x => x.anahtar === 'pen-sag-1').aci, 0, 'çıkış');
  const pp = E.find(x => x.anahtar === 'pen-pen-0'); yakin(pp.B, 1.50, 'pencere kapağı'); assert.strictEqual(pp.aci, 90);
  const m = tur('merdiven')[0]; yakin(m.pts[1][0], 11.00, 'köprüye çıkar'); yakin(m.pts[0][1], 11.10, 'merdiven ekseni (çizim 11,10)'); yakin(m.z1, 97.45, 'köprü üstü');
  assert.ok(Math.abs(m.pts[0][0] - 7.75) < 0.3, 'merdiven başı (çizim 7,75): ' + m.pts[0][0]); assert.ok(m.z1 - m.z0 <= m.nr * 0.19 + 1e-9);
  const k = tur('korkuluk')[0].pts; yakin(Math.max(...k.map(p => p[0])), 12.45, 'sağ kenar (çizim 12,45)');
  // sahanlık: perde yüzündeki pencere kapağını içine alır (kapak tarafı 0,45, öbür yan 0,30)
  const s0 = G.sahanlik[0]; yakin(s0.x0, 9.30 - 0.40, 'sahanlık başı'); yakin(s0.y0, 3.40 - 0.45, 'alt'); yakin(s0.y1, 3.80 + 0.30, 'üst');
  assert.ok(k.some(p => Math.abs(p[0] - 8.95) < 0.006 && Math.abs(p[1] - 3.00) < 0.006), 'korkuluk sahanlık çevresinden');
  // kapaklar perdenin içinde değil, yüzünde
  const pp0 = E.find(x => x.anahtar === 'pen-pen-0'); yakin(pp0.p[1], 3.40 - 0.06, 'pencere kapağı perde yüzüne dayalı'); const pb = E.find(x => x.anahtar === 'pen-bolme'); yakin(pb.p[1], 3.45 - 0.06, 'ara duvar kapağı perde yüzüne dayalı'); yakin(pb.H, 0.60, 'orifis kapağı');
  // kapak çerçevesi (B + 2·85 mm) ve el çarkı (r 0,25) korkuluğa değmez
  for (const x of tur('penstok').filter(x => /pen-pen/.test(x.anahtar))) { const s = G.sahanlik[+x.anahtar.slice(-1)], w = x.B / 2 + 0.085; assert.ok(x.p[0] - w > s.x0 + 0.05 && x.p[0] + w < G.kopru.x0 && x.p[1] - 0.25 > s.y0 + 0.05 && x.p[1] + 0.25 < s.y1 - 0.05, 'kapak sahanlıkta: ' + x.anahtar); }
  // tahrik kuralı: alan > 1 m² ya da kuvvet > 10 kN → aktüatör
  const th = k2 => E.find(x => x.anahtar === k2).tahrik; assert.strictEqual(th('pen-sol-0'), 'EL'); assert.strictEqual(th('pen-pen-0'), 'AKT', 'pencere 1,5 m²');  assert.strictEqual(th('pen-bolme'), 'AKT', 'ara duvar orifisi 0,36 m² ama ≈ 10,03 kN > 10');
  assert.ok(ekipmanYer(geo({ zt: 97.25, fb: 0.61, h: 3.14, tahrik: 'EL' })).filter(x => x.tur === 'penstok').every(x => x.tahrik === 'EL'), 'elle zorlama');
  assert.strictEqual(tur('mikser').length, 6, 'halka başına 2 mikser');
  for (const x of tur('mikser')) { assert.ok(Math.abs(x.direk[0] - 10.94) < 1e-6, 'tek yürüyüş yolunda: köprü tabliyesinin uzun kısma bakan ön yüzü ' + x.direk[0]); assert.strictEqual(x.aci, 180, 'uzun kısma iter'); }
  assert.strictEqual(ekipmanYer(G, { n: 4, D: 0.37, P: 2.5, rpm: 1400, name: 'K' }, 95).filter(x => x.tur === 'mikser').length, 12, 'sayı hesaptan');
});

t('boru delikleri taşınabilir: yer, çap, alt kotu (sınırlar içinde)', () => {
  const g2 = geo({ zt: 97.25, fb: 0.61, h: 3.14, gx: 0.5, dG: 0.4, hG: 0.3, yC: 9.5, rx: 99 });
  const b = k => g2.boru.find(x => x.k === k);
  yakin(b('giris').p[0], 0.50, 'giriş yeri'); yakin(b('giris').z0, 93.80, 'giriş alt kotu'); yakin(b('giris').d, 0.40, 'çap');
  yakin(b('cikis').p[1], 9.40 - 0.15, 'çıkış kanal ucunda sınırlandı'); yakin(b('ras').p[0], 16.90 - 0.15, 'RAS kanal içinde sınırlandı');
  assert.ok(g2.kes.filter(k => k.k === 'boru').length === 3, 'yer verilen üç boru delikli');
});

t('halka başına 2 mikser: ikinci yürüyüş yolu, mikserler iki yolda da uzun kısma bakar', () => {
  const { ekipmanYer } = require('../app/anaerobik.js');
  const G2 = geo({ zt: 97.25, fb: 0.61, h: 3.14, k2: 1 }); yakin(G2.kopru2.x0, 4.50, 'ikinci yol (aynası)'); yakin(G2.kopru2.x1, 6.00, 'ikinci yol sonu');
  const E = ekipmanYer(G2, { n: 2, D: 0.37, P: 2.5, rpm: 1400, name: 'K' }, 95.00), mk = E.filter(x => x.tur === 'mikser');
  assert.strictEqual(mk.length, 6);
  for (const H of G2.halka) {
    const m = mk.filter(x => Math.abs(x.p[1] - H.yc) < 1.5); assert.strictEqual(m.length, 2, 'halkada 2');
    const a = m.find(x => x.aci === 180), b = m.find(x => x.aci === 0);
    yakin(a.direk[0], 10.94, 'servis köprüsü tabliye ön yüzü'); yakin(b.direk[0], 6.06, 'ikinci yol tabliye ön yüzü');
    yakin(a.vinc[0], 11.30, 'pergel vinç köprü tabliyesinde'); yakin(b.vinc[0], 5.70, 'pergel vinç ikinci yolda'); yakin(a.vinc[1], a.p[1], 'mikser ekseninde');
    // her mikser akışla aynı yönde: üst koridor akışı = yon
    assert.strictEqual(a.p[1] > H.yc ? H.yon : -H.yon, -1); assert.strictEqual(b.p[1] > H.yc ? H.yon : -H.yon, 1);
    assert.ok(a.p[0] < 10.94 && b.p[0] > 6.06, 'gövde uzun kısımda');
    for (const x of [a, b]) for (const s of G2.sahanlik) assert.ok(!(x.direk[0] > s.x0 - 0.1 && x.direk[0] < s.x1 + 0.1 && x.direk[1] > s.y0 - 0.1 && x.direk[1] < s.y1 + 0.1), 'direk sahanlığa değmez');
  }
  assert.strictEqual(E.filter(x => x.tur === 'merdiven').length, 2); assert.strictEqual(E.filter(x => x.tur === 'korkuluk').length, 2);
  const m2 = E.find(x => x.anahtar === 'merdiven-2'); assert.ok(m2.pts[0][0] > 0, 'ikinci merdiven havuz boyunda');
  // varsayılan: iki merdiven birbirine bakar (ikisi de aradaki uzun kısımdan kendi yoluna çıkar)
  const { boyutla } = require('../app/anaerobik.js'); const G5 = geo(Object.assign({ zt: 97.25, fb: 0.61, k2: 1 }, boyutla({ Qd: 50000 }).par)), E5 = ekipmanYer(G5, { n: 2, D: 0.6, P: 3, rpm: 700, name: 'K' }, 95);
  const a5 = E5.find(x => x.anahtar === 'merdiven').pts, b5 = E5.find(x => x.anahtar === 'merdiven-2').pts;
  assert.ok(a5[1][0] > a5[0][0] && b5[1][0] < b5[0][0], 'karşılıklı'); yakin(a5[1][0], G5.kopru.x0, 'servis köprüsünün sol kenarına'); yakin(b5[1][0], G5.kopru2.x1, 'ikinci yolun sağ kenarına');
  assert.ok(b5[0][0] + 1.0 <= a5[0][0] + 1e-9, 'başlangıçlar arasında boşluk');
  // seçimli yan (üst / alt), yön hep içe: servis köprüsü alt yanda soldan, ikinci yol üst yanda sağdan
  const G7 = geo(Object.assign({ zt: 97.25, fb: 0.61, k2: 1, m1: 'alt', m2: 'ust' }, boyutla({ Qd: 50000 }).par)), E7 = ekipmanYer(G7, null, 95);
  const n1 = E7.find(x => x.anahtar === 'merdiven'), n2 = E7.find(x => x.anahtar === 'merdiven-2');
  assert.ok(n1.pts[0][1] < 0 && n1.pts[1][0] === G7.kopru.x0 && n1.pts[0][0] < G7.kopru.x0, 'alt yanda, içe bakar (soldan)'); yakin(G7.kopru.y0, -G7.q.mw, 'yolun ucu altta');
  assert.ok(n2.pts[0][1] > G7.Wo && n2.pts[1][0] === G7.kopru2.x1, 'üst yanda, içe bakar (sağdan)');
  assert.strictEqual(n1.kork, 'sag', 'alt yanda sağa çıkan merdivenin dış korkuluğu'); assert.strictEqual(n2.kork, 'sag');
  const k7 = E7.find(x => x.anahtar === 'korkuluk-kopru').pts; yakin(k7[0][0], G7.kopru.x0 + 0.05, 'açıklık sol kenarda'); yakin(k7[0][1], -G7.q.mw + 0.05, 'açıklık merdiven sahanlığında (başı)'); yakin(k7[k7.length - 1][1], 0, 'açıklık merdiven sahanlığında (sonu)');
});

t('sahanlıkta kapak yarığı: kapak çerçevesi geçer, yarık sahanlık içinde', () => {
  const { ekipmanYer, bolgeKati } = require('../app/anaerobik.js');
  const E = ekipmanYer(G, null, 95);
  G.sahanlik.forEach((s, i) => {
    assert.strictEqual(s.yarik.length, 1);
    for (const [y, k] of [[s.yarik[0], 'pen-pen-' + i]]) {
      const p = E.find(x => x.anahtar === k), w = p.B / 2 + 0.085, xs = y.map(q => q[0]), ys = y.map(q => q[1]);
      assert.ok(Math.min(...xs) < p.p[0] - w && Math.max(...xs) > p.p[0] + w, 'çerçeve eni yarıkta: ' + k);
      assert.ok(Math.min(...ys) < p.p[1] - 0.11 && Math.max(...ys) > p.p[1] + 0.11, 'boyunduruk derinliği yarıkta: ' + k);
      assert.ok(Math.min(...xs) > s.x0 && Math.max(...xs) < G.kopru.x0, 'sahanlık içinde');
    }
    const K = bolgeKati({ dis: [[s.x0, s.y0], [G.kopru.x0, s.y0], [G.kopru.x0, s.y1], [s.x0, s.y1]], delik: s.yarik.map(y => y.slice().reverse()) }, s.z0, s.z1); assert.ok(K.f.length > 10);
  });
});

t('hidrolik: Çokal debileriyle maks. ve min. su kotları', () => {
  const { hidrolik } = require('../app/anaerobik.js');
  // Çokal 1. kademe: Q maks. 275,83, Q min. ≈ 0,5 × Q ort. (145,83), RAS %75 × Q maks. = 206,87 m³/h
  const H = hidrolik(G, { Qmax: 275.83, Qmin: 72.9, QRS: 206.87 });
  yakin(H.maks.halka[2], 96.64, 'son halka maks. = tasarım su yüzü');
  const Q = (275.83 + 206.87) / 3600, dag = Math.pow(Q / (0.61 * 0.6 * (96.63 - 95.75)), 2) / 19.62; yakin(H.maks.cikis, 96.64 - dag, 'çıkış kanalı = son halka − ağız kaybı (ıslak alan)');
  assert.ok(H.maks.halka[0] > H.maks.halka[1] && H.maks.halka[1] > H.maks.halka[2], 'akış yönünde kot düşer');
  assert.ok(H.maks.giris > H.maks.halka[1] && H.maks.ras > H.maks.halka[0], 'giriş ve RAS kanalı halkadan yüksek');
  for (const k of ['cikis', 'giris', 'ras']) assert.ok(H.min[k] < H.maks[k], 'min < maks: ' + k);
  const hS = q => Math.pow(q / 3600 / (1.84 * 2), 2 / 3); yakin(H.maks.cikis - H.min.cikis, hS(275.83 + 206.87) - hS(72.9 + 206.87), 'mansap savağı yük farkı');
  assert.ok(H.maks.giris - H.min.giris < 0.2 && H.maks.giris - 96.64 < 0.05, 'kayıplar küçük (ağızlar geniş)');
  assert.deepStrictEqual(H.uyari, []);
});

t('debiden boyutlandırma: Çokal debileriyle Çokal açıklıkları, 20.000 m³/gün hız ve temas süresi sınırları', () => {
  const { boyutla } = require('../app/anaerobik.js');
  const c = boyutla({ Qd: 145.83 * 24, Qmax: 275.83, QRS: 206.87, h: 3.14 }).par;
  yakin(c.Ro, 1.50, 'halka'); yakin(c.ag, 0.60, 'ağız eni'); yakin(c.ah, 1.00, 'ağız yüksekliği'); yakin(c.dAg, 0.89, 'ağız eşiği'); yakin(c.ow, 1.50, 'pencere eni'); yakin(c.oh, 1.00, 'pencere yüksekliği'); yakin(c.rg, 0.70, 'kılavuz perde'); yakin(c.bG, 0.80, 'giriş kanalı (Çokal)'); yakin(c.bC, 1.00, 'çıkış kanalı (Çokal)');
  const B = boyutla({ Qd: 20000 }), p = B.par, Q = (B.debi.Qmax + B.debi.QRS) / 3600;
  assert.ok(B.t >= 0.5 && B.t <= 1.5, 'temas süresi ' + B.t); assert.ok(B.hiz.agiz <= 0.501 && B.hiz.pencere <= 0.301, 'açıklık hızları (ağız 0,50, pencere 0,30)');
  assert.ok(Math.abs(p.Ls / (2 * p.Ro) - 11 / 3) < 0.3, 'Çokal oranı');
  for (const [d, q] of [[p.dG, B.debi.Qmax], [p.dR, B.debi.QRS], [p.dC, B.debi.Qmax + B.debi.QRS]]) assert.ok(q / 3600 / (Math.PI * (d * (1 - 2 / 17)) ** 2 / 4) <= 1.0001, 'boru hızı ≤ 1 m/s');
  assert.ok(p.ah <= p.h - 0.5 && p.ag <= p.Ro, 'açıklık sınırları');
  const G2 = geo(Object.assign({ zt: 97.25, fb: 0.61 }, p)); assert.ok(G2.zS > G2.zB + 0.3, 'ağız eşiği tabandan yukarıda');
  assert.ok(G2.ara.g1 < G2.xR + p.bC - 0.1, 'ara duvar kapağı çıkış kanalının içinde'); assert.ok(p.bG >= p.ag + 0.2 - 1e-9, 'giriş kanalı ağızla büyür');
  const B5 = boyutla({ Qd: 50000 }); assert.ok(B5.par.bC > p.bC - 1e-9 && B5.t >= 0.5 && B5.hiz.agiz <= 0.501, '50.000');
});

t('akış yolu: halkanın içinde kalır, yön halkanın dönüşüne uyar', () => {
  const { akisNokta } = require('../app/anaerobik.js');
  const ic = (p, h) => { let c = false; for (let i = 0, j = h.length - 1; i < h.length; j = i++) { const a = h[i], b = h[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  for (let i = 0; i < G.n; i++) for (const r of [0.3, 0.8, 1.35]) for (let s = 0; s < 40; s += 0.7) assert.ok(ic(akisNokta(G, i, r, s), G.bolge.delik[i]), 'halka içinde');
  for (const H of G.halka) { const a = akisNokta(G, H.i, 0.8, 1), b = akisNokta(G, H.i, 0.8, 1.5), ust = a[1] > H.yc; assert.ok(Math.sign(b[0] - a[0]) === (ust ? H.yon : -H.yon), 'koridorda akış yönü = halka dönüşü'); }
});

t('kapaklar: ağız önünde düz yüz, her kapak açıldığı açıklığın ölçüsünde', () => {
  const { ekipmanYer, boyutla } = require('../app/anaerobik.js');
  for (const G0 of [G, geo(Object.assign({ zt: 97.25, fb: 0.61, k2: 1 }, boyutla({ Qd: 50000 }).par))]) {
    const q = G0.q, R2 = q.Ro + q.two, E = ekipmanYer(G0, null, 95);
    // düz yüz: her halka ucunda dış sınırda x = xc ∓ R2 olan, en az çerçeve eni (B + 2·85 mm) kadar düz kenar
    for (const [xc, sg] of [[G0.xc1, -1], [G0.xc2, 1]]) for (const yc of G0.yc) {
      const xF = xc + sg * R2, ys = [G0.bolge.dis, ...G0.bolge.delik].flat().filter(p => Math.abs(p[0] - xF) < 1e-6 && Math.abs(p[1] - yc) < R2).map(p => p[1]);
      assert.ok(ys.length >= 2 && Math.max(...ys) - Math.min(...ys) >= q.ag + 0.17 - 1e-9, 'düz yüz çerçeveden geniş');
    }
    // ölçüler açıklıkla aynı
    const ac = G0.acik, eb = a => [+(a.pts[2][0] - a.pts[0][0]).toFixed(3), +(a.pts[2][1] - a.pts[0][1]).toFixed(3), +(a.z1 - a.z0).toFixed(3)];
    for (const x of E.filter(y => y.tur === 'penstok')) {
      const H = +x.H.toFixed(3), B = +x.B.toFixed(3);
      if (/pen-(sol|sag)/.test(x.anahtar)) { const a = ac.find(a => a.k === 'agiz' && a.halka === +x.anahtar.slice(-1)); assert.strictEqual(B, eb(a)[1]); assert.strictEqual(H, eb(a)[2]); yakin(x.z, a.z0, 'eşik'); }
      if (/pen-pen/.test(x.anahtar)) { const a = ac.filter(a => a.k === 'pencere')[+x.anahtar.slice(-1)]; assert.strictEqual(B, eb(a)[0]); assert.strictEqual(H, eb(a)[2]); yakin(x.z, a.z0, 'pencere eşiği'); }
      if (x.anahtar === 'pen-bolme') { const a = ac.find(a => a.k === 'orifis'); assert.strictEqual(B, eb(a)[0]); assert.strictEqual(H, eb(a)[2]); yakin(x.z, a.z0, 'orifis tabanı'); }
    }
  }
});

t('yürüyüş yolu açıklığa göre: dar kulvarda Çokal gibi, genişte bastonun üstünde; direk bastona çarpmaz', () => {
  const { boyutla, ekipmanYer } = require('../app/anaerobik.js');
  assert.strictEqual(G.kopruBaston, false, 'Çokal (kulvar 1,35)'); yakin(G.kopru.x1, 12.50, 'Çokal köprüsü');
  const G6 = geo(Object.assign({ zt: 97.25, fb: 0.61, k2: 1 }, boyutla({ Qd: 60000 }).par)), q = G6.q;
  assert.strictEqual(G6.kopruBaston, true, '60.000 (kulvar 4,30)'); assert.ok(G6.baston >= q.kb - 1e-9, 'baston en az köprü eni');
  const uc = G6.xc2 - G6.baston - q.tg / 2; yakin(G6.kopru.x0, uc, 'köprü baston ucundan başlar'); assert.ok(G6.kopru.x1 <= G6.xc2 + 1e-9, 'köprü baston üzerinde');
  yakin(G6.kopru2.x1 - G6.xc1, G6.xc2 - G6.kopru.x0, 'ikinci yol aynası (bastonun üstünde)');
  for (const x of ekipmanYer(G6, { n: 2, D: 2.5, P: 0.55, rpm: 40, name: 'K' }, 95).filter(y => y.tur === 'mikser')) assert.ok(x.direk[0] + 0.05 <= G6.kopru.x0 + 1e-9 || x.direk[0] - 0.05 >= G6.kopru2.x1 - 1e-9, 'direk baston ucunun önünde');
});

console.log(`\n${n} test geçti.`);

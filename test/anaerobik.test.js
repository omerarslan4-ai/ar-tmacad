/* Anaerobik havuz çizim geometrisi — Çokal AAT T-105 (3-Çokal_AAT_Anaerobik_R3.dwg) ile karşılaştırma.
   Çizim ölçüleri (sol alt dış köşeye göre, m): dış 17,20 × 10,60; halka merkezleri x 3,00 / 14,00, y 1,90 / 5,30 / 8,70;
   kanal uçları y 0,90 – 9,70; ağız 95,75 – 96,75; orifis 8,95 – 9,45; pencere 9,50 – 11,00; köprü 11,00 – 12,50;
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

t('Çokal T-105: orifis, pencere, köprü, ara duvar ve borular', () => {
  yakin(G.pen.xo, 8.95, 'orifis'); yakin(G.pen.xw0, 9.50, 'pencere başı'); yakin(G.pen.xw1, 11.00, 'pencere sonu');
  yakin(G.kopru.x0, 11.00, 'köprü (çizim 16401,3)'); yakin(G.kopru.x1, 12.50, 'köprü sonu (çizim 16551,3)');
  yakin(G.ara.y, 3.60, 'ara duvar'); yakin(G.ara.g0, 16.10, 'kapaklı geçiş'); yakin(G.ara.g1, 16.70, 'kapaklı geçiş sonu');
  const b = k => G.boru.find(x => x.k === k);
  yakin(b('giris').p[0], 0.70, 'giriş borusu'); yakin(b('ras').p[0], 16.40, 'RAS borusu'); yakin(b('cikis').p[1], 6.80, 'çıkış borusu (çizim 6,80)', 0.21);
  assert.strictEqual(G.acik.filter(a => a.k === 'agiz').length, 6, 'her halkada iki ağız');
  assert.strictEqual(G.acik.filter(a => a.k === 'orifis').length, 2); assert.strictEqual(G.acik.filter(a => a.k === 'pencere').length, 2);
});

t('yuvarlak perdeler: her halkada iki, R0,70–R1,00, çıkış ucunda 0,60 uzantı; komşu halkalar ters döner', () => {
  const pr = G.parca.filter(p => p.k === 'perde'); assert.strictEqual(pr.length, 6);
  assert.deepStrictEqual(G.halka.map(h => h.yon), [1, -1, 1]);
  // RAS sol perde: üst uçta x 3,00 → 3,60 uzantı (çizim 15601,3 → 15661,3), alt uçta uzantı yok
  const p0 = pr[0].pts, xs = p0.map(p => p[0]), ys = p0.map(p => p[1]);
  yakin(Math.max(...xs.filter((x, i) => ys[i] > 1.9 + 0.69)), 3.60 + 0.15, 'uzantı + yuvarlak uç');
  yakin(Math.min(...xs), 3.00 - 1.00, 'dış yarıçap'); yakin(Math.max(...ys), 1.90 + 1.00, 'üst');
  // halka 1 sol perde: uzantı altta
  const p1 = pr[2].pts; yakin(Math.max(...p1.filter(p => p[1] < 5.3 - 0.69).map(p => p[0])), 3.75, 'halka 1 alt uzantı');
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
  assert.ok(ar(B.dis) > 0 && B.delik.every(h => ar(h) < 0), 'yönler'); assert.strictEqual(B.delik.length, 3 + 1 + 1, '3 halka + giriş kanalı + çıkış kanalı');
  const A = ar(B.dis) + B.delik.reduce((s, h) => s + ar(h), 0), tr = ucgenle([B.dis, ...B.delik]);
  const At = tr.reduce((s, [a, b, c]) => s + ((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2, 0);
  yakin(At, A, 'üçgenler alanı = duvar alanı', 1e-6); assert.ok(A > 33 && A < 42, 'duvar alanı (elle ≈ 37–39) ' + A);
  const icinde = p => { const k = h => { let c = false; for (let i = 0, j = h.length - 1; i < h.length; j = i++) { const a = h[i], b = h[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }; return k(B.dis) && !B.delik.some(k); };
  for (const [p, v, ad] of [[[8, 3.6], true, 'ortak duvar'], [[8, 2.5], false, 'koridor'], [[0.7, 5], false, 'giriş kanalı suyu'], [[0.15, 5], true, 'kanal dış duvarı'], [[2.0, 3.6], true, 'kama dolgusu (Çokal)'], [[1.7, 3.6], false, 'kanal suyu'], [[15.6, 3.6], true, 'ara duvar (gövde tarafı)'], [[16.8, 3.6], true, 'ara duvar (dış duvar tarafı)'], [[16.4, 3.6], false, 'kapaklı geçiş'], [[16.4, 2.0], false, 'RAS bölümü'], [[16.4, 6.0], false, 'çıkış bölümü'], [[8, 10.4], true, 'üst dış duvar'], [[1.5, 0.5], false, 'köşe dışı']]) assert.strictEqual(icinde(p), v, ad);
  const K = bolgeKati(B, 93.5, 97.25); assert.ok(K.f.length > 100 && K.e.length > 50);
});

t('orta duvar ve yuvarlak perdeler halkanın içinde kalır (dışarı taşmaz)', () => {
  const ic = (p, h) => { let c = false; for (let i = 0, j = h.length - 1; i < h.length; j = i++) { const a = h[i], b = h[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  for (const p of G.parca) for (const q of p.pts) assert.ok(G.bolge.delik.slice(0, G.n).some(h => ic(q, h)), p.k + ' noktası halka dışında: ' + q);
});

t('ekipman yerleri: Çokal penstok, merdiven ve köprü korkuluğu', () => {
  const { ekipmanYer } = require('../app/anaerobik.js');
  const E = ekipmanYer(G, { n: 2, D: 0.37, P: 2.5, rpm: 1400, name: 'Kompakt' }, 95.00), tur = k => E.filter(x => x.tur === k);
  assert.strictEqual(tur('penstok').length, 9, '6 ağız + 2 pencere + 1 bölme');
  const p0 = E.find(x => x.anahtar === 'pen-sol-0'); yakin(p0.p[0], 1.00, 'giriş kanalında'); yakin(p0.z, 95.75, 'eşik'); yakin(p0.D, 1.50, 'eşik → duvar üstü'); yakin(p0.B, 0.60, 'B');
  assert.strictEqual(E.find(x => x.anahtar === 'pen-sag-0').aci, 180, 'RAS halkasına giriş'); assert.strictEqual(E.find(x => x.anahtar === 'pen-sag-1').aci, 0, 'çıkış');
  const pp = E.find(x => x.anahtar === 'pen-pen-0'); yakin(pp.B, 1.50, 'pencere kapağı'); assert.strictEqual(pp.aci, 90);
  const m = tur('merdiven')[0]; yakin(m.pts[1][0], 11.00, 'köprüye çıkar'); yakin(m.pts[0][1], 11.10, 'merdiven ekseni (çizim 11,10)'); yakin(m.z1, 97.45, 'köprü üstü');
  assert.ok(Math.abs(m.pts[0][0] - 7.75) < 0.3, 'merdiven başı (çizim 7,75): ' + m.pts[0][0]); assert.ok(m.z1 - m.z0 <= m.nr * 0.19 + 1e-9);
  const k = tur('korkuluk')[0].pts; yakin(Math.max(...k.map(p => p[0])), 12.45, 'sağ kenar (çizim 12,45)');
  assert.ok(k.some(p => Math.abs(p[0] - 9.55) < 0.006 && Math.abs(p[1] - 3.45) < 0.006), 'sahanlık çevresi (çizim 9,55 / 3,45)');
  yakin(G.sahanlik[1].y1, 7.50, 'sahanlık ucu (çizim −2924,5 → 7,50)');
  assert.strictEqual(tur('mikser').length, 6, 'halka başına 2 mikser');
});

console.log(`\n${n} test geçti.`);

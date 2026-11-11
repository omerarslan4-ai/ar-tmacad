/* Anaerobik havuz çizim geometrisi — Çokal AAT T-105 (3-Çokal_AAT_Anaerobik_R3.dwg) ile karşılaştırma.
   Çizim ölçüleri (sol alt dış köşeye göre, m): dış 17,20 × 10,60; halka merkezleri x 3,00 / 14,00, y 1,90 / 5,30 / 8,70;
   kanal uçları y 0,90 – 9,70; ağız 95,75 – 96,75; orifis 8,95 – 9,45; pencere 9,50 – 11,00; köprü 11,10 – 12,60;
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
  yakin(G.kopru.x0, 11.10, 'köprü'); yakin(G.kopru.x1, 12.60, 'köprü sonu');
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

console.log(`\n${n} test geçti.`);

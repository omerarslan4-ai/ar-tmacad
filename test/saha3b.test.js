/* Saha sunumu geometrisi (app/saha3b.js) ve SW2 saha üreticisi (araclar/sw2-saha-uret.js).
   Karşılaştırma değerleri: SW-2_GY_R1.DWG (köşe koordinatları), SW2_TOWER.dwg (720×520, −2.40 / +6.70), GÜVENLİK BİNASI.dwg (470×470).
   Çalıştır: node test/saha3b.test.js */
'use strict';
const assert = require('assert'), path = require('path'), fs = require('fs');
globalThis.C = { on() { } }; require('../app/geo.js'); require('../app/saha3b.js');
const S = globalThis.C.saha3b, G = globalThis.C.geo;
const U = require('../araclar/sw2-saha-uret.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yak = (a, b, e) => assert.ok(Math.abs(a - b) <= e, `${a} ≉ ${b} (±${e})`);

t('öteleme: sola +, köşede gönye', () => {
  assert.deepStrictEqual(S.otele([[0, 0], [10, 0], [10, 10]], 1), [[0, 1], [9, 1], [9, 10]]);
  assert.deepStrictEqual(S.otele([[0, 0], [10, 0]], -2), [[0, -2], [10, -2]]);
});
t('tüp: halka sayısı, eksen boyu ve yarıçap', () => {
  const m = S.tup([[0, 0], [10, 0], [10, 10]], 1, 0.7, 8);
  assert.strictEqual(m.pos.length / 3, 3 * 9); assert.strictEqual(m.idx.length / 3, 2 * 8 * 2); yak(m.boy, 20, 1e-9);
  yak(Math.hypot(m.pos[1] - 0, m.pos[2] - 1), 0.7, 1e-9);            // ilk halka: eksene uzaklık = r
  yak(m.st[m.st.length - 2], 20, 1e-9);                               // son halkada s = hat boyu
});
t('prizma: içbükey taban doğru üçgenlenir (alan korunur)', () => {
  const p = [[0, 0], [4, 0], [4, 4], [2, 2], [0, 4]], tr = S.ucgenle(p);
  const A = tr.reduce((s, [a, b, c]) => s + Math.abs((p[b][0] - p[a][0]) * (p[c][1] - p[a][1]) - (p[b][1] - p[a][1]) * (p[c][0] - p[a][0])) / 2, 0);
  yak(A, 12, 1e-9); assert.strictEqual(S.prizma(p, 0, 7).pos.length / 9, 5 * 2 + 3);
});
t('hat boyunca nokta', () => { const k = S.noktaAt([[0, 0], [10, 0], [10, 10]], 15); assert.deepStrictEqual(k.p, [10, 5]); assert.deepStrictEqual(k.u, [0, 1]); });

const cevre = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'araclar', 'sw2-cevre.json'), 'utf8'));
const { doc, ozet } = U.uret(path.join(__dirname, 'yok.aritma'), cevre);   // terfi kaynağı yokken kaba kütleyle de çalışmalı
const kenar = (e, i) => { const p = e.pts, a = p[i], b = p[(i + 1) % p.length]; return Math.hypot(b[0] - a[0], b[1] - a[1]); };
t('yükleme bacası: dış 7,20 × 5,20 m, taban −2,40, üst +6,70', () => {
  const pr = doc.ents.find(e => e.type === 'perde' && /yükleme bacası/.test(e.ad || ''));
  yak(kenar(pr, 0), 7.2, 0.02); yak(kenar(pr, 1), 5.2, 0.02); yak(pr.z0, -2.4, 1e-9); yak(pr.z0 + pr.h + 0.25, 6.70, 1e-9);
});
t('güvenlik binası 4,70 × 4,70 m; çatı +3,10; parapet +4,10', () => {
  const d = doc.ents.find(e => e.type === 'perde' && /Güvenlik binası duvarı/.test(e.ad || '')); yak(kenar(d, 0), 4.7, 0.01); yak(kenar(d, 1), 4.7, 0.01);
  const pp = doc.ents.find(e => e.parapet); yak(pp.z0 + pp.h, 4.10, 1e-9);
});
t('çevre duvarı köşeleri paftadaki koordinatlara oturur (X:112991 Y:3556705 ve X:112962 Y:3556667)', () => {
  const k = doc.ents.filter(e => e.layer === 'SAHA_DUVAR').flatMap(e => e.pts), en = (x, y) => Math.min(...k.map(p => Math.hypot(p[0] - x, p[1] - y)));
  assert.ok(en(112991, 3556705) < 1.0); assert.ok(en(112962, 3556667) < 1.0);
});
t('sürgülü kapı boşluğu ≈ 7,90 m', () => { const kp = doc.ents.find(e => /Sürgülü/.test(e.ad || '')); yak(kenar(kp, 0), 7.9, 0.2); });
t('koordinat sistemi: saha Bingazi\'de (32,13 K · 20,08 D)', () => {
  globalThis.C.doc = doc; const ll = G.toLL([112992, 3556670]); yak(ll[0], 32.1319, 0.001); yak(ll[1], 20.0779, 0.001);
});
t('deniz hattı: bacadan başlar, 3 boru (2×DN1400 + DN900), kıyıdan sonra denize uzanır', () => {
  const H = S.hatlar(doc); assert.strictEqual(H.eksenler.length, 1); assert.strictEqual(H.borular.length, 3);
  assert.deepStrictEqual(H.borular.map(b => b.dn).sort(), [1400, 1400, 900].sort());
  const b0 = doc.ents.find(e => e.type === 'perde' && /yükleme bacası/.test(e.ad || '')).pts, e = H.eksenler[0];
  assert.ok(Math.min(...b0.map(p => Math.hypot(p[0] - e[0][0], p[1] - e[0][1]))) < 4);
  assert.ok(ozet.hatBoyu > 900 && ozet.hatBoyu < 2000); assert.ok(doc.set.denizHat.kiyiIndex === e.length - 2);
});
console.log(`\n${n} test geçti.`);

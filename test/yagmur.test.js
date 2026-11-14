/* Yağmur suyu hesabı (C.yagmurHesap, app/mt-sihhi.js) — TS EN 12056-3: çatı oluğu ve yağmur iniş borusu çapı, adedi, yerleri.
   Gerçek projelerle karşılaştırma:
   - Konya terfi merkezi: kırma çatı, çatı döşemesi dış ölçüsü 20,70 × 9,00 m (bina 19,70 × 8,00 + 50 cm saçak; araclar/konya-terfi-uret.js).
   - Çokal AAT İdari Bina (10-Çokal_AAT_İdari Bina_R2.dwg): kırma (ahşap oturtma) çatı, çatı planında köşelerde 4 iniş borusu,
     boru eksenleri arası 23,97 × 10,49 m; "DN155 Çinko Yağmur Oluğu", "DN120 Çinko Yağmur İniş Borusu".
   Çalıştır: node test/yagmur.test.js */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
globalThis.C = {};
require(path.join(__dirname, '..', 'app', 'mt-sihhi.js'));
const Y = C.yagmurHesap;
let n = 0; const ok = (k, m) => { assert.ok(k, m); n++; }, yak = (a, b, t, m) => ok(Math.abs(a - b) <= t, `${m}: ${a} ≠ ${b} (±${t})`);
const dik = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/* 1) kapasite formülleri */
const o155 = Y.olukKap(155, 0);
yak(o155.AE, Math.PI * 155 * 155 / 8, 1e-6, 'DN155 oluk kesit alanı');
yak(o155.QN, 2.585, 0.005, 'DN155 oluk Q_N = 2,78e-5·A_E^1,25');
yak(Y.FL(50), 1, 1e-9, 'F_L(50)'); yak(Y.FL(112.5), 0.915, 1e-9, 'F_L ara değer'); yak(Y.FL(600), 0.40, 1e-9, 'F_L tablo sonu');
const b100 = Y.borKap(100), b120 = Y.borKap(120);
yak(b100.Q, 10.5, 0.4, 'DN100 iniş borusu kapasitesi (f = 0,33)');
ok(b120.Q > b100.Q * 1.5, 'DN120 kapasitesi DN100\'den belirgin büyük');

/* 2) Konya terfi merkezi */
let kp = dik(-0.5, -0.5, 20.2, 8.5);
try { const src = fs.readFileSync(path.join(__dirname, '..', 'araclar', 'konya-terfi-uret.js'), 'utf8'), m = src.match(/catiPts\s*=\s*dik\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/); if (m) kp = dik(...m.slice(1).map(v => +v / 100)); } catch (er) { /* betik yoksa sabit ölçü */ }
const K = Y({ kind: 'kirma', pts: kp, ov: 0 }, { yagis: 300 });
yak(K.A, 20.7 * 9.0, 0.01, 'Konya yatay izdüşüm alanı');
yak(K.Q, 186.3 * 0.03, 0.01, 'Konya yağmur debisi');
ok(K.nBoru === 4, 'Konya: 4 iniş borusu (köşelerde) — bulunan ' + K.nBoru);
ok(K.olukDN === 155 && K.borDN === 120, 'Konya: DN155 oluk, DN120 iniş yeterli');
ok(K.borular.every(b => b.kose), 'Konya: bütün borular köşede');
const uzun = K.kenarlar.filter(k => k.L > 15), kisa = K.kenarlar.filter(k => k.L < 15);
uzun.forEach(k => yak(k.alan, (2 * 20.7 - 9) * 9 / 4, 0.01, 'Konya uzun saçak (yamuk) drenaj alanı'));
kisa.forEach(k => yak(k.alan, 9 * 9 / 4, 0.01, 'Konya kısa saçak (üçgen) drenaj alanı'));
K.kenarlar.forEach(k => ok(k.nBoru === 2 && k.konumlar[0] === 0 && Math.abs(k.konumlar[1] - k.L) < 0.01, 'Konya: her kenarın iki ucunda boru'));
K.borular.forEach(b => yak(b.alan, 186.3 / 4, 0.05, 'Konya: her boruya eşit drenaj alanı'));
ok(K.kollar.every(c => c.Q <= c.kap), 'Konya: oluk kolları yeterli');
yak(K.enBuyukAralik, 20.7, 0.01, 'Konya en büyük boru aralığı');
yak(K.dusus, 10.35 * 10 * 0.3, 0.01, 'Konya en uzun kolda oluk düşüşü (mm)');

/* 3) Çokal İdari Bina: çizimdeki adet tutmalı */
const Ck = Y({ kind: 'kirma', foot: dik(0, 0, 23.97, 10.49) }, { yagis: 300, olukDN: 155, borDN: 120 });
ok(Ck.nBoru === 4, 'Çokal İdari: çizimdeki gibi 4 iniş borusu — bulunan ' + Ck.nBoru);
ok(Ck.olukDN === 155 && Ck.borDN === 120 && !Ck.uyarilar.length, 'Çokal İdari: DN155 / DN120 yeterli');

/* 4) genel davranış */
const cw = Y({ kind: 'kirma', foot: [[0, 0], [0, 9], [20, 9], [20, 0]] });
yak(cw.kenarlar[0].alan, 81 / 4, 0.01, 'saat yönünde çokgen: kenar sırası korunur'); ok(cw.kenarlar[0].L === 9, 'saat yönünde: ilk kenar 9 m');
const bs = Y({ kind: 'besik', foot: dik(0, 0, 20, 9) });
ok(bs.kenarlar.filter(k => !k.oluk).every(k => k.L === 9 && k.alan === 0), 'beşik: alınlıkta oluk yok');
yak(bs.kenarlar[0].alan, 90, 0.01, 'beşik: alan iki saçağa yarı yarıya');
const tk = Y({ kind: 'tek', foot: dik(0, 0, 12, 6), yon: 'on' });
ok(tk.kenarlar[0].alan === 72 && tk.nBoru === 2, 'tek eğim: bütün alan ön saçağa, iki uçta boru');
const by = Y({ kind: 'kirma', foot: dik(0, 0, 60, 20) });
ok(by.nBoru > 4 && by.kollar.every(c => c.Q <= c.kap), 'büyük çatı: ara iniş boruları eklenir, oluk kolları yeterli');
yak(by.kenarlar.reduce((t, k) => t + k.alan, 0), 1200, 0.01, 'drenaj alanları toplamı = çatı alanı');
const ma = Y({ kind: 'kirma', foot: dik(0, 0, 40, 12) }, { maksAralik: 15 });
ok(ma.enBuyukAralik <= 15 + 1e-6, 'en büyük aralık sınırı uygulanır: ' + ma.enBuyukAralik);
const L = Y({ kind: 'kirma', foot: [[0, 0], [20, 0], [20, 8], [8, 8], [8, 16], [0, 16]] });
yak(L.A, 20 * 8 + 8 * 8, 0.01, 'L plan: alan'); yak(L.kenarlar.reduce((t, k) => t + k.alan, 0), 224, 1.0, 'L plan: ızgarayla drenaj alanları toplamı');
const sy = Y({ kenarlar: [{ L: 20, alan: 80 }, { L: 10, alan: 30 }] });
yak(sy.Q, 110 * 0.03, 1e-9, 'geometrisiz girdi: debi'); ok(sy.borular.length === 4, 'geometrisiz girdi: her kolun iki ucunda boru');
const tr = Y({ kind: 'teras', foot: dik(0, 0, 10, 10) });
ok(tr.nBoru === 0 && tr.uyarilar.length === 1, 'teras: oluk yok, uyarı');
const kl = Y({ kind: 'kirma', foot: dik(0, 0, 40, 12) }, { yagis: 600, kolonlar: [[20, 0]] });
ok(kl.kenarlar[0].konumlar.includes(20), 'ara boru kolona yakınsa kolona kayar: ' + kl.kenarlar[0].konumlar.join(', '));

console.log(`yagmur: ${n} denetim geçti · Konya ${K.nBoru} × DN${K.borDN} iniş, DN${K.olukDN} oluk, Q = ${K.Q.toFixed(2)} l/s · Çokal İdari ${Ck.nBoru} boru`);

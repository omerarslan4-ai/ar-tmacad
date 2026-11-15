/* Vitrifiye ve cihaz önden görünüşleri (MT.VIT, app/mt-vitrifiye.js) — kolon şemalarında kullanılır.
   Gerçek projeyle karşılaştırma: Yayladağ AAT-B101-TP-01_ST "KOLON ŞEMASI" (cm; döşeme y = 66736,3):
   - lavabo: tezgah / hazne üstü +0,85, batarya üstü ≈ +1,06, sifon altı +0,39
   - klozet: döşemeye oturur (0), rezervuar kapağı +0,815
   - duş: duş başlığı ≈ +1,97, batarya +0,55 … +0,75
   - yer süzgeci döşemenin altında (−0,13 … 0)
   Çalıştır: node test/mt-vitrifiye.test.js */
'use strict';
const path = require('path'), assert = require('assert');
globalThis.C = {};
require(path.join(__dirname, '..', 'app', 'mt-vitrifiye.js'));
const V = C.MT.VIT;
let n = 0; const ok = (k, m) => { assert.ok(k, m); n++; }, yak = (a, b, t, m) => ok(Math.abs(a - b) <= t, `${m}: ${a} ≠ ${b} (±${t})`);

/* 1) sıhhi tesisat armatür tiplerinin hepsinin çizimi var */
for (const t of ['lavabo', 'klozet', 'alaturka', 'pisuvar', 'dus', 'evye', 'labevye', 'camasir', 'bulasik', 'suzgec']) ok(V.var(t), `${t} çizimi yok`);
ok(!V.var('termosifon'), 'termosifon şemada kutu olarak çizilir');

/* 2) ölçüler örnek paftayla aynı */
const kb = t => V.kutu(t);
yak(kb('lavabo')[3], 1.057, 0.01, 'lavabo batarya üstü');
yak(kb('lavabo')[1], 0.391, 0.01, 'lavabo sifon altı');
yak(kb('klozet')[1], 0, 0.001, 'klozet döşemeye oturur');
yak(kb('klozet')[3], 0.815, 0.01, 'klozet rezervuar üstü');
yak(kb('dus')[3], 1.973, 0.02, 'duş başlığı');
ok(kb('suzgec')[1] < 0 && kb('suzgec')[3] <= 0.01, 'yer süzgeci döşeme altında');
ok(V.V.lavabo.L.some((q, i) => i % 4 === 0 && Math.abs(V.V.lavabo.L[i + 1] - 850) < 5 && Math.abs(V.V.lavabo.L[i + 3] - 850) < 5), 'lavabo tezgah çizgisi +0,85');

/* 3) çizim: bütün çizgiler kutunun içinde, ölçekle büyür */
for (const t of ['lavabo', 'klozet', 'pisuvar', 'dus', 'evye', 'alaturka', 'camasir']) {
  const L = []; ok(V.ciz((a, b, c, d) => L.push([a, b, c, d]), t, 100, 8, 20), `${t} çizilmedi`); ok(L.length > 8, `${t} çizgi sayısı ${L.length}`);
  const b = kb(t), e = 0.4; for (const l of L) for (const [x, y] of [[l[0], l[1]], [l[2], l[3]]]) ok(x >= 100 + b[0] * 20 - e && x <= 100 + b[2] * 20 + e && y >= 8 + b[1] * 20 - e && y <= 8 + b[3] * 20 + e, `${t} kutu dışı ${x},${y}`);
}
ok(!V.ciz(() => { }, 'yok', 0, 0, 20), 'bilinmeyen tip çizilmez');

/* 4) ısıtma / soğutma cihazları ve vanalar */
for (const t of ['radyator', 'konvektor', 'split', 'kaset', 'dis']) { const L = []; ok(V.cihaz((a, b, c, d) => L.push([a, b, c, d]), t, 0, 0, 20, 12), t); ok(L.length >= 10, `${t} çizgi ${L.length}`); for (const l of L) ok(Math.min(l[0], l[2]) >= -10.01 && Math.max(l[0], l[2]) <= 10.01 && Math.min(l[1], l[3]) >= -0.01 && Math.max(l[1], l[3]) <= 12.01, `${t} kutu dışı`); }
{ const L = []; V.vana((a, b, c, d) => L.push([a, b, c, d]), 0, 0, 1, true, true); ok(L.length >= 4 + 1 + 6, 'termostatik vana'); ok(L.every(l => Math.max(l[0], l[2]) <= 0.61), 'dikey termostatik başlık sola'); }
console.log(`mt-vitrifiye: ${n} kontrol geçti`);

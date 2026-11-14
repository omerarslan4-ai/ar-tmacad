/* app/kaplama.js — söve dönüşü metrajı (C.kaplamaSove, C.kaplamaSoveAlan).
   Tarayıcısız: sove ve soveAlan kaynaktan aynen kesilip çalıştırılır.
   Örnek: Bekçi binası iç duvarı — 120×140 pencere, parapet 90 cm (za 0,90, zb 2,30), duvar 25 cm, alt kaplama (fayans) kh = 1,50 m, duvar 3,00 m.
   node test/kaplama-sove.test.js */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'app/kaplama.js'), 'utf8').split('\n');
const a = src.findIndex(l => /^\s*const sove = \(o, side\)/.test(l)), b = src.findIndex((l, i) => i > a && /^\s*return r;\s*$/.test(l));
assert(a > 0 && b > a, 'app/kaplama.js içinde sove / soveAlan bulunamadı (testi güncelleyin)');
const { sove, soveAlan } = new Function(src.slice(a, b + 2).join('\n') + '\nreturn { sove, soveAlan };')();
let hata = 0, sayi = 0;
const dene = (ad, fn) => { sayi++; try { fn(); } catch (e) { hata++; console.log('  ✗ ' + ad + '\n    ' + (e.message || e)); } };
const yak = (x, y, ad) => assert(Math.abs(x - y) < 1e-9, `${ad}: ${x} ≠ ${y}`);
const pen = { s0: 1.0, s1: 2.2, za: 0.9, zb: 2.3, kind: 'pencere', td: 0.25 };

dene('söve derinliği: iç yüz duvar − 10 cm, dış yüz 3 cm, kapıda 0', () => {
  yak(sove(pen, 'IC'), 0.15, 'iç'); yak(sove(pen, 'DIS'), 0.03, 'dış'); yak(sove({ kind: 'kapi', td: 0.25 }, 'IC'), 0, 'kapı');
});
dene('kh = 1,50 m: kh üstündeki söve üst boyaya (yanak 0,24 + lento altı 0,18), altındaki alt kaplamaya (yanak 0,18 + denizlik 0,18)', () => {
  const r = soveAlan(pen, 'IC', 0, 3.0, 1.5); yak(r.alt, 0.36, 'alt'); yak(r.ust, 0.42, 'üst');
  yak(r.alt + r.ust, 0.15 * (2 * 1.4 + 2 * 1.2), 'toplam (eski metrajla aynı)');
});
dene('kh yok (tam boy kaplama): bütün söve alt kaplamada', () => { const r = soveAlan(pen, 'IC', 0, 3.0, 3.0); yak(r.alt, 0.78, 'alt'); yak(r.ust, 0, 'üst'); });
dene('kh pencerenin altında (0,80 m): bütün söve üst boyada', () => { const r = soveAlan(pen, 'IC', 0, 3.0, 0.8); yak(r.alt, 0, 'alt'); yak(r.ust, 0.78, 'üst'); });
dene('kapıda söve yok', () => { const r = soveAlan({ s0: 0, s1: 1, za: 0, zb: 2.1, kind: 'kapi', td: 0.25 }, 'IC', 0, 3, 1.5); yak(r.alt + r.ust, 0, 'kapı'); });

console.log(`${sayi - hata}/${sayi} geçti`);
if (hata) process.exit(1);

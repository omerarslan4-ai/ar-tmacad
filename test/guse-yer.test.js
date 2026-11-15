/* Guse yerleşimi (app/guse-yer.js): kiriş alt kotu − mesafe → guse üst kotu. SW2 pompa istasyonunun gerçek kotlarıyla:
   sw2.aritma            kolon 50/50, −8,00 → +7,65; kiriş 25/50 üst +7,65 (alt +7,15); guse kolon üstünden 1,00 aşağıda (+6,65) → mesafe 0,50
   SW2 POMPA BİNASI      kolon 50/50, +0,65 → +6,30; kiriş 40/60 üst +6,30 (alt +5,70); guse kolon üstünden 1,425 aşağıda (+4,875) → mesafe 0,825
   Çalıştır: node test/guse-yer.test.js */
'use strict';
const path = require('path'), fs = require('fs'), assert = require('assert');
globalThis.C = {};
require(path.join(__dirname, '..', 'app', 'guse-yer.js'));
const G = C.guseYer;
let n = 0; const ok = (k, m) => { assert.ok(k, m); n++; };
const yak = (a, b, m, t) => ok(Math.abs(a - b) <= (t || 1e-6), `${m}: ${a} ≠ ${b}`);

const guse = o => Object.assign({ type: 'kolon', sek: 'R', b: 0.5, d: 0.5, D: 0.5, rot: 0, guse: 'E', gYon: 'R', gRef: 'UST', gZ: 1, gL: 0.4, gHf: 0.6, gHu: 0.3, gW: 0 }, o);
const kiris = (a, b, o) => Object.assign({ type: 'kiris', a: a.concat(0), b: b.concat(0), bw: 0.25, hb: 0.5, zt: 7.65, hiza: 'O' }, o);

/* 1) sw2.aritma: kolon [25.25, 0.4], üstünde iki yönde kiriş; ara kat kirişi (+0,70) hesaba katılmaz */
{ const k = guse({ p: [25.25, 0.4, 0], h: 15.65, z0: -7.999999999999999, rot: 90 });
  const E = [k, kiris([25.25, 7.25], [25.25, 0.4]), kiris([19.2, 0.4], [25.25, 0.4]), kiris([19.2, 0.4], [25.25, 0.4], { zt: 0.7, hb: 0.6 }), kiris([4.075, 7.25], [4.075, 0.4])];
  yak(G.kolonUst(k), 7.65, 'kolon üstü'); yak(G.ustKot(k), 6.65, 'guse üst kotu');
  const ka = G.kirisAlt(k, E); yak(ka.z, 7.15, 'kiriş altı'); ok(ka.n === 2 && ka.kaynak === 'kiris', 'kolona oturan iki çatı kirişi');
  yak(G.mesafe(k, E), 0.5, 'mesafe');
  // mesafe 30 cm istenirse guse 20 cm yukarı çıkar: üst +6,85, kolon üstünden 0,80
  const y = G.yeni(k, E, 0.30); ok(y.ok, 'geçerli'); yak(y.ust, 6.85, 'yeni üst kot'); yak(y.gZ, 0.80, 'yeni gZ (UST)');
  // aynı kolon mutlak kotla tanımlıysa gZ doğrudan kot olur
  const y2 = G.yeni(Object.assign({}, k, { gRef: 'KOT', gZ: 6.65 }), E, 0.30); yak(y2.gZ, 6.85, 'yeni gZ (KOT)');
  // mesafe 0: guse üstü kiriş altına dayanır
  yak(G.yeni(k, E, 0).ust, 7.15, 'mesafe 0');
  // sınırlar: kolon üstünü aşamaz, kolon altına taşamaz
  ok(!G.yeni(k, E, -0.6).ok, 'kolon üstünü aşan guse reddedilir'); ok(!G.yeni(k, E, -0.1).ok, 'eksi mesafe (guse kirişin içinde) reddedilir'); ok(!G.yeni(k, E, 15).ok, 'kolon altına taşan guse reddedilir');
  // ok ile çekme: +0,10 yukarı → gZ 0,90; aşırı çekişte kolon boyunda kalır
  yak(G.kaydir(k, 0.10), 0.90, 'kaydır +10 cm'); yak(G.kaydir(k, -0.25), 1.25, 'kaydır −25 cm'); yak(G.kaydir(k, 5), 0, 'yukarı sınır'); yak(G.kaydir(k, -50), 15.65 - 0.6, 'aşağı sınır');
}
/* 2) SW2 POMPA BİNASI: kiriş ekseni kolon merkezinden 5 cm kaçık */
{ const k = guse({ p: [102.886101, -14.629634, 0], h: 5.65, z0: 0.6499999999999986, gZ: 1.425 });
  const E = [k, kiris([102.886101, -14.679634], [109.786101, -14.679634], { bw: 0.4, hb: 0.6, zt: 6.3 })];
  yak(G.kirisAlt(k, E).z, 5.70, 'kiriş altı'); yak(G.ustKot(k), 4.875, 'guse üstü'); yak(G.mesafe(k, E), 0.825, 'mesafe');
  const y = G.yeni(k, E, 0.50); yak(y.ust, 5.20, 'yeni üst'); yak(y.gZ, 1.10, 'yeni gZ');
}
/* 3) kiriş oturmayan kolon: kolon üstünden ölçülür */
{ const k = guse({ p: [0, 0, 0], h: 6, z0: 0 }); const ka = G.kirisAlt(k, [k, kiris([3, 3], [9, 3])]);
  ok(ka.kaynak === 'kolon' && ka.n === 0, 'kiriş yok'); yak(ka.z, 6, 'kolon üstü'); yak(G.mesafe(k, [k]), 1, 'mesafe = kolon üstünden'); }
/* 4) ortak değer: aynı / farklı */
{ const a = guse({ gZ: 1 }), b = guse({ gZ: 1 }), c = guse({ gZ: 1.2 });
  ok(G.ortak([a, b], e => e.gZ).deger === 1, 'ortak değer'); ok(G.ortak([a, b, c], e => e.gZ).farkli, 'farklı değer'); ok(G.ortak([a, c], e => e.gYon).deger === 'R', 'metin ortak');
  ok(G.guseli(a) && !G.guseli({ type: 'kolon' }) && !G.guseli({ type: 'kiris', guse: 'E' }), 'guseli kolon ayrımı'); }
/* 5) gerçek saha dosyası (varsa): 12 guseli kolonun hepsi kiriş altından 50 cm aşağıda; mesafe 40 cm yapılınca hepsi +6,75 */
{ const f = path.join(__dirname, '..', 'test-proje', 'SW2', 'SW2-saha.aritma');
  if (fs.existsSync(f)) { const E = JSON.parse(fs.readFileSync(f, 'utf8')).doc.ents, K = E.filter(G.guseli);
    ok(K.length === 12, 'SW2 sahada 12 guseli kolon');
    for (const k of K) { yak(G.kirisAlt(k, E).z, 7.15, 'saha kiriş altı'); yak(G.mesafe(k, E), 0.5, 'saha mesafe'); const y = G.yeni(k, E, 0.40); ok(y.ok, 'saha geçerli'); yak(y.ust, 6.75, 'saha yeni üst'); yak(y.gZ, 0.90, 'saha yeni gZ'); }
    ok(!G.ortak(K, k => G.mesafe(k, E)).farkli, 'saha: mesafe ortak'); } }

console.log(`guse-yer: ${n} kontrol geçti.`);

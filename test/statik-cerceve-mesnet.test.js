/* Çerçeve hesabı (app/hesap/statik-cerceve.js) — mesnet tanıma:
   1) Kiriş altında biten kolon (model kolon boyunu kiriş altına kadar verirse) kirişin mesnedidir; düğüm kiriş üst kotuna alınır.
      (Konya terfi: kolon +210,11'de, 50/80 çatı kirişi üstü +210,91 — önceden kiriş "mesnet bulunamadı" diye hesaplanmıyordu.)
   2) Tek mesnedi perde olan, perdeye dik giren konsol kiriş (yürüme yolu kirişi) dengesiz sayılmaz: perdeyle monolitik,
      dönme yayı 3·E·I/H (perde şeridi bw + 2t) — konsol momenti q·L²/2'ye yakın çıkar.
   Çalıştır: node test/statik-cerceve-mesnet.test.js */
'use strict';
const assert = require('assert');
globalThis.STATIK = {};
require('../app/hesap/statik-plak.js'); require('../app/hesap/statik-motor.js'); require('../app/hesap/statik-cerceve.js');
const P = globalThis.STATIK;
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

const temel = cer => { const S = P.ornekSaray(); S.dep.SDS = 0; S.suYapisi = false; S.cer = Object.assign({ kolonlar: [], kirisler: [], dosemeler: [], perdeler: [], ayar: P.cerceveVars() }, cer); return S; };

t('kiriş altında biten kolon kirişin mesnedidir (kolon üstü kiriş üst kotuna alınır)', () => {
  const S = temel({
    kolonlar: [{ id: 1, no: 'S1', x: 0.25, y: 0.25, bx: 0.5, by: 0.5, z0: 0, zt: 3.2 }, { id: 2, no: 'S2', x: 0.25, y: 7.75, bx: 0.5, by: 0.5, z0: 0, zt: 3.2 }],
    kirisler: [{ id: 3, no: 'K1', a: [0.25, 0], b: [0.25, 8], bw: 0.5, hb: 0.8, zt: 4.0, gd: 10 }],
  });
  const RC = P.cerceveHesap(S), ch = RC.zincirler[0];
  assert.ok(!ch.hata, 'kiriş hesaplanmalı: ' + ch.hata);
  assert.strictEqual(ch.supN.filter(q => q.tip === 'kolon').length, 2);
  assert.ok(RC.kolonlar.every(c => Math.abs(c.zt - 4.0) < 1e-9));
  assert.ok(RC.uyar.some(u => /kiriş altında/.test(u)));
  // kolon kiriş altında değil de çok aşağıda bitiyorsa bağlanmaz
  const S2 = temel({ kolonlar: [{ id: 1, no: 'S1', x: 0.25, y: 0.25, bx: 0.5, by: 0.5, z0: 0, zt: 2.0 }], kirisler: S.cer.kirisler.map(k => Object.assign({}, k)) });
  const R2 = P.cerceveHesap(S2); assert.ok(R2.kolonlar[0].zt === 2.0);
});

t('perdeye dik giren konsol kiriş: yarı ankastre, konsol momenti ≈ q·L²/2', () => {
  const L = 2.0, gd = 20;
  const S = temel({ perdeler: [{ a: [0, -3], b: [0, 3], t: 0.4, z0: -6, zt: 0, no: 'P1' }], kirisler: [{ id: 1, no: 'K1', a: [0, 0], b: [L, 0], bw: 0.4, hb: 0.5, zt: 0, gd }] });
  const RC = P.cerceveHesap(S), ch = RC.zincirler[0];
  assert.ok(!ch.hata, 'konsol hesaplanmalı: ' + ch.hata); assert.ok(RC.uyar.some(u => /monolitik konsol/.test(u)));
  const w = 1.4 * (gd + 25 * 0.4 * 0.5); const M = ch.mes[0].ust.M;
  assert.ok(M > 0.9 * w * L * L / 2 && M < 1.1 * w * L * L / 2, `konsol momenti ${M} ≈ ${w * L * L / 2}`);
});

console.log(`\n${n} test geçti.`);

/* Mekanik paftalama (app/mt-pafta.js; Mimari altyapısı app/mimari-pafta.js, pafta listesi app/pafta-liste.js) —
   Bekçi binası (test-proje/_gecici/bekci.aritma, 14.11.2026, tarayıcıda TESISATPAFTA T):
     bina (mahaller) 4,62 × 4,62 m, z 1,05 … 3,55 → 1/50'de A1'in %35'i < %40 → 1/25;
     ISITMA: kesit planı 319 × 319 mm (1/25), 3B dış görünüş 180 × 120, cihaz listesi 258 × 41 → tek A1 (841 × 594), MEK-02;
     SIHHİ: iki kesit planı 319 × 319, 3B dış 180 × 120, iç 150 × 110, kolon şeması 146 × 133, armatür listesi 222 × 66 → A1 uzamış 898 × 594, MEK-04.
   Çalıştır: node test/mt-pafta.test.js */
'use strict';
const assert = require('assert');
const A = require('../app/mimari-pafta.js');
const P = require('../app/mt-pafta.js');
const PL = require('../app/pafta-liste.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

const BEKCI = [3.39, 1.79, 8.01, 6.41];
t('ölçek bina ebatına göre: Bekçi 1/25 (1/50\'de A1\'in %35\'i, eşik %40)', () => {
  const o = P.olcekBul(A, BEKCI, [1.05, 3.55], 0);
  assert.strictEqual(o.olcek, 25); assert.strictEqual(o.kagit, 'A1'); assert.ok(Math.abs(o.oranA1 - 0.347) < 0.005, o.oranA1);
});
t('ölçek: orta bina 1/50, A0\'a sığmayan bina 1/100 (Mimari ile aynı kural)', () => {
  assert.strictEqual(P.olcekBul(A, [0, 0, 20, 12], [0, 4], 0).olcek, 50);
  assert.strictEqual(P.olcekBul(A, [0, 0, 60, 30], [0, 8], 0).olcek, 100);
  assert.strictEqual(P.olcekBul(A, null, null, 0).olcek, 50, 'bina yoksa 1/50');
});
t('aynı bina Mimari ile aynı ölçeği alır (aynı bloklar ve paylar)', () => {
  const lx = 12, ly = 9, z = [0, 4.5];
  const mim = A.olcekSec([{ id: 'plan', w: lx, h: ly, kenarMm: 41, altMm: 15 }, { id: 'kesit', w: lx, h: 4.5, kenarMm: 30, altMm: 15 }], {});
  assert.strictEqual(P.olcekBul(A, [0, 0, lx, ly], z, 0).olcek, mim.olcek);
});
const isitma = [{ w: 319, h: 319, etiket: true, etiketW: 90, grup: 'KAT PLANLARI' }, { w: 180, h: 120, etiket: true, etiketW: 95, grup: '3B GÖRÜNÜŞLER' }, { w: 258, h: 41, grup: 'ŞEMA VE LİSTELER' }];
t('en az kâğıt: Bekçi ısıtma paftası tek A1 841 × 594, pencereler kâğıt içinde ve çakışmasız', () => {
  const Y = P.yerlestir(A, isitma, {});
  assert.strictEqual(Y.adet, 1); const S = Y.paftalar[0]; assert.strictEqual(S.kagit, 'A1'); assert.strictEqual(S.pw, 841); assert.strictEqual(S.ph, 594);
  const K = A.PAFTA_R2.kenar;
  for (const v of S.vps) { assert.ok(v.x >= K.l - 1e-6 && v.x + v.w <= S.pw - K.r - S.antet + 1e-6, 'x içeride'); assert.ok(v.y - (isitma[v.i].etiket ? P.ETIKET_MM : 0) >= K.b - 1e-6 && v.y + v.h <= S.ph - K.t + 1e-6, 'y içeride (etiket dahil)'); }
  for (const a of S.vps) for (const b of S.vps) if (a !== b) { const ea = isitma[a.i].etiket ? P.ETIKET_MM : 0, eb = isitma[b.i].etiket ? P.ETIKET_MM : 0;
    assert.ok(!(a.x < b.x + b.w && a.x + a.w > b.x && a.y - ea < b.y + b.h && a.y + a.h > b.y - eb), 'pencereler (etiketleriyle) çakışmaz'); }
});
t('en az kâğıt: Bekçi sıhhi tesisat paftası tek A1, gerekli kadar uzar (898 mm)', () => {
  const sihhi = [{ w: 319, h: 319, etiket: true, etiketW: 150, grup: 'KAT PLANLARI' }, { w: 319, h: 319, etiket: true, etiketW: 130, grup: 'KAT PLANLARI' }, { w: 180, h: 120, etiket: true, etiketW: 120, grup: '3B GÖRÜNÜŞLER' },
    { w: 150, h: 110, etiket: true, etiketW: 150, grup: '3B GÖRÜNÜŞLER' }, { w: 146, h: 133, grup: 'ŞEMA VE LİSTELER' }, { w: 222, h: 66, grup: 'ŞEMA VE LİSTELER' }];
  const Y = P.yerlestir(A, sihhi, {}); assert.strictEqual(Y.adet, 1); assert.strictEqual(Y.paftalar[0].kagit, 'A1');
  assert.ok(Y.paftalar[0].pw > 841 && Y.paftalar[0].pw <= 841 * A.UZAMA, Y.paftalar[0].pw);
});
t('sığmayan sistem ikinci paftaya bölünür; adlar korunur ve (1/2) eklenir', () => {
  const cok = Array.from({ length: 8 }, () => ({ w: 600, h: 500, etiket: true, etiketW: 100, grup: 'KAT PLANLARI' }));
  const Y = P.yerlestir(A, cok, {}); assert.ok(Y.adet > 1);
  assert.strictEqual(P.paftaAdi('ISITMA TESİSATI', 0, 1), 'MEKANİK — ISITMA TESİSATI');
  assert.strictEqual(P.paftaAdi('ISITMA TESİSATI', 1, 2), 'MEKANİK — ISITMA TESİSATI (2/2)');
});
t('numaralama: tesisat paftaları sistem sırasıyla MEK-01 …, öbür paftalar yerinde', () => {
  const L = [{ name: 'MİMARİ-01', grp: 'Mimari' }, { name: 'MEKANİK — SIHHİ TESİSAT', grp: 'Mekanik', mtPafta: 'sihhi' }, { name: 'X MEKANİK TABLOLAR', grp: 'Mekanik' },
    { name: 'MEKANİK — ISITMA TESİSATI (2/2)', grp: 'Mekanik', mtPafta: 'isitma', mtParca: 1 }, { name: 'MEKANİK — ISI YALITIMI', grp: 'Mekanik', mtPafta: 'yalitim' }, { name: 'MEKANİK — ISITMA TESİSATI (1/2)', grp: 'Mekanik', mtPafta: 'isitma', mtParca: 0 }];
  const S = P.sirala(L, q => q.grp === 'Mekanik');
  assert.deepStrictEqual(S.map(q => q.name), ['MİMARİ-01', 'MEKANİK — ISI YALITIMI', 'X MEKANİK TABLOLAR', 'MEKANİK — ISITMA TESİSATI (1/2)', 'MEKANİK — ISITMA TESİSATI (2/2)', 'MEKANİK — SIHHİ TESİSAT']);
  assert.deepStrictEqual(S.filter(q => q.mtPafta).map(q => q.f.no), ['MEK-01', 'MEK-02', 'MEK-03', 'MEK-04']);
});
t('pafta listesi Mekanik grubu: no antetten, ad antet başlığından, ölçek tablolar ve 3B hariç', () => {
  const L = [{ name: 'MİMARİ-01 KAT PLANLARI', grp: 'Mimari', f: { no: 'MİM-01' }, vps: [{ scale: 50, w: 300, h: 200 }] },
    { name: 'MEKANİK — ISITMA TESİSATI', grp: 'Mekanik', f: { no: 'MEK-02', baslik: 'ISITMA TESİSATI PROJESİ' }, vps: [{ scale: 25, w: 319, h: 319 }, { scale: 100, w: 180, h: 120, olceksiz: true }, { scale: 50, w: 258, h: 41, olceksiz: true }] }];
  const R = PL.satirlar(L, 'Mekanik');
  assert.deepStrictEqual(R, [{ sira: 1, no: 'MEK-02', ad: 'ISITMA TESİSATI PROJESİ', olcek: '1/25' }]);
});
console.log(`\n${n} test geçti.`);

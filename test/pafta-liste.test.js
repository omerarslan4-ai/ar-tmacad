/* Pafta listesi ve antetteki ölçek (app/pafta-liste.js) — Konya MIMARIPAFTA çıktısının paftalarıyla (14.11.2026, tarayıcıda):
   MİMARİ-01 KAT PLANLARI, KORKULUK DETAYI, SAC KAPAK DETAYLARI (1/50 iki plan + mahal, 1/20 korkuluk, 1/5 kapak kenarı), MİMARİ-02 KESİTLER (1/50),
   MİMARİ-05 ÇATI PLANI, KESİTLERİ VE DETAYLARI (1/50 + 1/10 DETAY-A / DETAY-B).
   Çalıştır: node test/pafta-liste.test.js */
'use strict';
const assert = require('assert');
const P = require('../app/pafta-liste.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

const L1 = { name: 'MİMARİ-01 KAT PLANLARI, KORKULUK DETAYI, SAC KAPAK DETAYLARI', grp: 'Mimari', f: { no: 'MİM-01' },
  vps: [{ scale: 50, w: 514, h: 311 }, { scale: 50, w: 563, h: 325 }, { scale: 50, w: 153, h: 105 }, { scale: 20, w: 330, h: 141 }, { scale: 20, w: 98, h: 112 }, { scale: 5, w: 256, h: 81 }] };
const L2 = { name: 'MİMARİ-02 KESİTLER', grp: 'Mimari', vps: [{ scale: 50, w: 626, h: 356 }, { scale: 50, w: 365, h: 356 }] };
const L5 = { name: 'MİMARİ-05 ÇATI PLANI, KESİTLERİ VE DETAYLARI', grp: 'Mimari', vps: [{ scale: 50, w: 558, h: 314 }, { scale: 10, w: 310, h: 226 }, { scale: 10, w: 310, h: 169 }] };
const S1 = { name: 'STATİK-01 KALIP PLANI', grp: 'Statik', vps: [{ scale: 50, w: 600, h: 400 }] };

t('antette ölçek: bütün pencerelerin ölçekleri tekrarsız, ana ölçek önce, sonra paydası büyükten küçüğe', () => {
  assert.strictEqual(P.olcekYazisi(L1.vps), '1/50, 1/20, 1/5');
  assert.strictEqual(P.olcekYazisi(L5.vps), '1/50, 1/10');
  assert.strictEqual(P.olcekYazisi([{ scale: 5, w: 100, h: 100 }, { scale: 20, w: 300, h: 300 }, { scale: 10, w: 50, h: 50 }, { scale: 50, w: 20, h: 20 }]), '1/20, 1/50, 1/10, 1/5', 'ana ölçek en çok alan kaplayan (detay paftası 1/20)');
  assert.strictEqual(P.olcekYazisi([]), '-');
});
t('elle verilmiş ölçek (f.olcekElle) korunur; boşsa pencerelerden', () => {
  assert.strictEqual(P.paftaOlcegi(Object.assign({}, L2, { f: { olcekElle: '1/50 - 1/20' } })), '1/50 - 1/20');
  assert.strictEqual(P.paftaOlcegi(Object.assign({}, L2, { f: { olcekElle: '  ' } })), '1/50');
});
t('pafta listesi satırları: SIRA NO, PAFTA NO (antetteki MİM-01; antette yoksa düzen adındaki MİMARİ-02), PAFTA ADI, ÖLÇEK; yalnız istenen grup', () => {
  const R = P.satirlar([L1, S1, L2, L5], 'Mimari');
  assert.deepStrictEqual(R.map(r => [r.sira, r.no, r.ad, r.olcek]), [[1, 'MİM-01', 'KAT PLANLARI, KORKULUK DETAYI, SAC KAPAK DETAYLARI', '1/50, 1/20, 1/5'], [2, 'MİMARİ-02', 'KESİTLER', '1/50'], [3, 'MİMARİ-05', 'ÇATI PLANI, KESİTLERİ VE DETAYLARI', '1/50, 1/10']]);
  assert.strictEqual(P.satirlar([L1, S1, L2], null).length, 3);
  assert.deepStrictEqual(P.noAd({ name: 'Düzen 3', f: { no: 'P-3', baslik: 'GENEL VAZİYET' } }), { no: 'P-3', ad: 'GENEL VAZİYET' });
});
t('Excel (CSV): noktalı virgül, UTF-8 BOM, virgüllü ölçek tırnaksız, noktalı virgül içeren ad tırnaklı', () => {
  const s = P.csv([{ sira: 1, no: 'MİMARİ-01', ad: 'A; B', olcek: '1/50, 1/20' }], 'PAFTA LİSTESİ');
  assert.ok(s.startsWith('﻿PAFTA LİSTESİ\r\nSIRA NO;PAFTA NO;PAFTA ADI;ÖLÇEK\r\n'));
  assert.ok(s.includes('1;MİMARİ-01;"A; B";1/50, 1/20\r\n'));
});
t('tablo penceresi (pafta listesi, mahal listesi, açılım tablosu) çizim ölçeği sayılmaz (MİM-04: detaylar 1/20 + pafta listesi penceresi 1/50 → "1/20")', () => {
  const L4 = { name: 'MİMARİ-04 DETAYLAR', f: { no: 'MİM-04' }, vps: [{ scale: 20, w: 400, h: 250 }, { scale: 20, w: 200, h: 150 }, { scale: 50, w: 180, h: 90, paftaListesi: true }, { scale: 50, w: 120, h: 300, olceksiz: true }] };
  assert.strictEqual(P.paftaOlcegi(L4), '1/20'); assert.deepStrictEqual(P.noAd(L4), { no: 'MİM-04', ad: 'DETAYLAR' });
  assert.strictEqual(P.olcekYazisi([{ scale: 50, w: 10, h: 10, paftaListesi: true }]), '-');
});

console.log(`\n${n} test geçti.`);

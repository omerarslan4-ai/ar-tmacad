/* Ünite mekanik paftası — saf kısım (app/unite-mekanik.js): ekipman kalemi, poz gruplama, güç toplamı, tablo satırları.
   Gerçek proje: 50.000 m³/gün anaerobik havuz (kullanıcının "50 bin" çizimi; ünite kartı varsayılanları, halka başına 2 mikser 5,5 kW yavaş devirli).
   Ekipman nesneleri anaerobik.js ekipmanYer + nesne() ile aynı parametrelerle kurulur.
   Çalıştır: node test/unite-mekanik.test.js */
'use strict';
const assert = require('assert');
const U = require('../app/unite-mekanik.js');
const { geo, ekipmanYer, boyutla } = require('../app/anaerobik.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

/* 50 bin: zt 97,25 / fb 0,61 (Çokal), ikinci yürüyüş yolu (halka başına 2 mikser), mikser 5,5 kW Ø2603 45 d/dk; merdiven başı zemin 95,00 */
const G = geo(Object.assign({ zt: 97.25, fb: 0.61, k2: 1 }, boyutla({ Qd: 50000 }).par));
const Y = ekipmanYer(G, { n: 2, D: 2.603, P: 5.5, rpm: 45, model: 'ksb_amaprop_2603', name: 'K' }, 95.00);
const mm = v => Math.round(v * 1000), un = '108';
/* anaerobik.js nesne() ile aynı: kapak, mikser, pergel vinç (jib), merdiven, korkuluk, tretuvar */
const ents = Y.map((y, i) => {
  if (y.tur === 'penstok') return { id: 'k' + i, type: 'aile', fam: 'penstock_kanal', ad: `SK-${un}${y.etiket}`, par: { B: mm(y.B), H: mm(y.H), D: mm(y.D), hw: mm(y.hw), tahrik: y.tahrik, acilis: y.acilis, sasi: 'OTO' } };
  if (y.tur === 'mikser') return { id: 'm' + i, type: 'aile', fam: 'dalgic_mikser', ad: `Z-${un}/${y.etiket}`, par: { model: 'ksb_amaprop_2603', D: 2603, P: 5.5, rpm: 45, Hd: mm(y.Hd), hm: 1610 } };
  if (y.tur === 'vinc') return { id: 'v' + i, type: 'aile', fam: 'pergel_vinc', ad: `PV-${un}/${y.etiket}`, par: { model: 'jib', vh: 3129, L: mm(y.L), hh: 300 } };
  if (y.tur === 'merdiven') return { id: 'r' + i, type: 'merdiven', pts: y.pts, z0: y.z0, z1: y.z1, w: y.w, hmax: y.hmax * 100, tip: 'beton', km: 'galvaniz' };
  if (y.tur === 'korkuluk') return { id: 'c' + i, type: 'korkuluk', pts: y.pts.map(p => [p[0], p[1], y.z]), km: 'galvaniz', kh: 110, dik: 150 };
  if (y.tur === 'tretuvar') return { id: 't' + i, type: 'tretuvar', pts: y.pts, w: y.w };
  return null;
}).filter(Boolean);
const AK = require('../app/aktuator-katalog.js'); // aktüatör gücü katalogdan (kullanıcı 21.11.2026)
const ctx = {
  deger: e => e.par, mikserModel: k => (k === 'ksb_amaprop_2603' ? { ad: 'Yavaş devirli dalgıç mikser Ø2603', motor: '4 kutuplu motor, IE3', disli: 'dişli kutulu' } : null),
  vincModel: q => (q.model === 'jib' ? { H: 3129, uc: 2674 } : null), korkulukAd: km => ({ galvaniz: 'Sıcak daldırma galvaniz çelik' }[km] || km), aile: () => null,
  aktuator: q => AK.penstokAktuator({ B: q.B, H: q.H, hw: q.hw, G: q.G, mil: q.mil }),
};
const K = ents.map(e => U.kalem(e, ctx)).filter(Boolean), S = U.pozla(K), T = U.kuruluGuc(S), TB = U.tabloSatirlari(S);

t('50 bin anaerobik: ekipman sayıları (9 kapak, 6 mikser, 6 pergel vinç, 2 merdiven, 2 korkuluk); tretuvar listeye girmez', () => {
  const say = g => K.filter(k => k.grup === g).length;
  assert.strictEqual(say('kapak'), 9, '6 ağız + 2 pencere + 1 ara duvar orifisi');
  assert.strictEqual(say('mikser'), 6, 'halka başına 2'); assert.strictEqual(say('vinc'), 6, 'her mikserin vinci');
  assert.strictEqual(say('merdiven'), 2, 'servis köprüsü + ikinci yol'); assert.strictEqual(say('korkuluk'), 2);
  assert.ok(!K.some(k => /tretuvar/i.test(k.anahtar)), 'tretuvar mekanik değil');
});

t('aynı tip / ölçü / güç aynı poz: 6 mikser tek poz (adet 6, 5,5 kW → 33 kW); poz 1\'den, kapaklar başta', () => {
  assert.deepStrictEqual(S.map(r => r.poz), S.map((r, i) => i + 1));
  assert.strictEqual(S[0].grup, 'kapak');
  const mk = S.filter(r => r.grup === 'mikser'); assert.strictEqual(mk.length, 1); assert.strictEqual(mk[0].adet, 6); assert.strictEqual(mk[0].P, 5.5); assert.strictEqual(mk[0].toplamP, 33);
  assert.deepStrictEqual(mk[0].kodlar, ['Z-108/A', 'Z-108/B', 'Z-108/C', 'Z-108/D', 'Z-108/E', 'Z-108/F']);
  const vn = S.filter(r => r.grup === 'vinc'); assert.strictEqual(vn.length, 1, 'aynı jib vinç'); assert.strictEqual(vn[0].adet, 6); assert.strictEqual(vn[0].P, null); assert.ok(vn[0].veriYok, 'güç verisi yok');
  const kp = S.filter(r => r.grup === 'kapak'); assert.strictEqual(kp.reduce((s, r) => s + r.adet, 0), 9, 'kapak pozlarının adet toplamı');
  for (const r of kp) assert.strictEqual(r.kodlar.length, r.adet, 'pozdaki her kapağın kodu yazılır');
  assert.ok(kp.every(r => /^SK-108[GCPB]/.test(r.kodlar[0])), 'kapak kodları anaerobik.js biçiminde');
});

t('kurulu toplam güç 34,3 kW (6 mikser 33 kW + 9 aktüatörlü kapak katalogdan 1,3 kW); verisi olmayan: pergel vinç', () => {
  assert.strictEqual(T.kW, 34.3);
  const vy = S.filter(r => r.veriYok).map(r => r.poz); assert.deepStrictEqual(T.eksik, vy);
  assert.ok(S.filter(r => r.grup === 'kapak' && /aktüatör/.test(r.oz)).every(r => !r.veriYok && r.P > 0), 'aktüatör gücü katalogdan'); /* test nesnelerinde kapak ağırlığı yok: güç programdakinden düşük çıkabilir */
  assert.ok(S.filter(r => r.grup === 'kapak' && /el çarkı/.test(r.oz)).every(r => r.gucYok && !r.veriYok), 'el çarklı kapakta güç yok');
});

t('tablo satırları: 7 sütun, güç yoksa "–", son satır KURULU TOPLAM GÜÇ; marka / model yazılmaz', () => {
  assert.deepStrictEqual(TB.cols.map(c => c.t), ['POZ NO', 'EKİPMAN KODU', 'TANIM', 'ÖZELLİKLER', 'BİRİM GÜÇ (kW)', 'ADET', 'TOPLAM GÜÇ (kW)']);
  assert.strictEqual(TB.rows.length, S.length + 1); for (const r of TB.rows) assert.strictEqual(r.length, 7);
  const son = TB.rows[TB.rows.length - 1]; assert.strictEqual(son[2], 'KURULU TOPLAM GÜÇ'); assert.strictEqual(son[6], '34,3');
  const mk = TB.rows.find(r => /^Z-108\/A/.test(r[1])); assert.strictEqual(mk[4], '5,5'); assert.strictEqual(mk[5], '6'); assert.strictEqual(mk[6], '33');
  const vn = TB.rows.find(r => /^PV-108\/A/.test(r[1])); assert.strictEqual(vn[4], '-'); assert.strictEqual(vn[6], '-');
  const kr = TB.rows.find(r => r[2] === 'Korkuluk'); assert.ok(/ m$/.test(kr[5]), 'korkuluk metre ile');
  const yazi = TB.rows.flat().join(' '); assert.ok(!/KSB|AmaProp|AUMA|Wilo|Grundfos|Flygt/i.test(yazi), 'marka yok');
  assert.strictEqual(U.temiz('Elektrikli aktüatör (AUMA)'), 'Elektrikli aktüatör');
});

t('borular bölümü şimdilik boş (saha borulaması bağlanınca dolacak)', () => { assert.deepStrictEqual(U.boruSatirlari(), []); });

console.log('\n50 bin anaerobik — MEKANİK EKİPMAN LİSTESİ:');
for (const r of TB.rows) console.log('  ' + r.map(s => String(s)).join(' | '));
console.log(`\n${n} test geçti.`);

/* Ünite mekanik bağlantı detayları — saf kısım (app/unite-mekanik-detay.js): detay tipleri, kapak / mikser / korkuluk detay çizim listeleri, açılım kodları.
   Gerçek proje: 50.000 m³/gün anaerobik havuz (test/unite-mekanik.test.js ile aynı kurulum: ünite kartı varsayılanları, halka başına 2 mikser 5,5 kW Ø2603).
   Beklenen: 2 kapak tipi (savak kapağı aşağı açılır: 4 poz; ara duvar orifisi yukarı açılır: 1 poz), 1 mikser + pergel vinç, 1 korkuluk;
   ölçüler ekipmandan (e 85 mm, yuva 125 / 200 mm, kapak 6,4 cm, H, D, Hf, mil TR48x8, Hd 5310 mm, kol erişimi 1070 mm, h 110 cm).
   Çalıştır: node test/unite-mekanik-detay.test.js */
'use strict';
const assert = require('assert');
const U = require('../app/unite-mekanik.js'), MD = require('../app/unite-mekanik-detay.js'), AK = require('../app/aktuator-katalog.js'), KSB = require('../app/mikser-ksb.js');
require('../app/cizim-kural.js'); const R = globalThis.C.cizimKural.MIMARI;
const { geo, ekipmanYer, boyutla } = require('../app/anaerobik.js');
global.window = { C: {} }; require('../app/mikser-ksb-veri.js'); require('../app/pergel-vinc-veri.js'); const VERI = window.C.MIKSER_KSB_VERI['2603'], JIB = window.C.PERGEL_VINC_VERI.jib;
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

const G = geo(Object.assign({ zt: 97.25, fb: 0.61, k2: 1 }, boyutla({ Qd: 50000 }).par));
const Y = ekipmanYer(G, { n: 2, D: 2.603, P: 5.5, rpm: 45, model: 'ksb_amaprop_2603', name: 'K' }, 95.00);
const mm = v => Math.round(v * 1000), un = '108';
const ents = Y.map((y, i) => {
  if (y.tur === 'penstok') return { id: 'k' + i, type: 'aile', fam: 'penstock_kanal', ad: `SK-${un}${y.etiket}`, par: { B: mm(y.B), H: mm(y.H), D: mm(y.D), hw: mm(y.hw), tahrik: y.tahrik, acilis: y.acilis, nervur: y.nervur, sasi: 'OTO' } };
  if (y.tur === 'mikser') return { id: 'm' + i, type: 'aile', fam: 'dalgic_mikser', ad: `Z-${un}/${y.etiket}`, par: { model: 'ksb_amaprop_2603', D: 2603, P: 5.5, rpm: 45, Hd: mm(y.Hd), hm: 1610 } };
  if (y.tur === 'vinc') return { id: 'v' + i, type: 'aile', fam: 'pergel_vinc', ad: `PV-${un}/${y.etiket}`, par: { model: 'jib', vh: 3129, L: mm(y.L), hh: 300, tahrik: 'MANUEL', yuk: y.yuk, kap: AK.vincKapasite(y.yuk) } };
  if (y.tur === 'korkuluk') return { id: 'c' + i, type: 'korkuluk', pts: y.pts.map(p => [p[0], p[1], y.z]), km: 'galvaniz', kh: 110, dik: 150 };
  return null;
}).filter(Boolean);
const ctx = { deger: e => e.par, mikserModel: k => (k === 'ksb_amaprop_2603' ? { ad: 'Yavaş devirli dalgıç mikser Ø2603', motor: '', disli: '' } : null), vincModel: q => (q.model === 'jib' ? { H: 3129, uc: 2674 } : null),
  korkulukAd: km => km, aile: () => null, aktuator: q => AK.penstokAktuator({ B: q.B, H: q.H, hw: q.hw, G: q.G, mil: q.mil }) };
const K = ents.map(e => { const k = U.kalem(e, ctx); if (k) { k.e = e; k.q = e.type === 'aile' ? e.par : {}; } return k; }).filter(Boolean), S = U.pozla(K);
const aktuator = q => AK.penstokAktuator({ B: q.B, H: q.H, hw: q.hw, G: q.G, mil: +q.mil || 48 });
const md = KSB.MODEL.ksb_amaprop_2603, parca = VERI.parca.map(p => ({ ad: p.ad, bb: p.bb }));
const r = MD.detaylar(K, S, { R, tw: G.q.tw, kbT: G.q.kbT, tb: G.q.tb, aktuator, mikserGeo: q => MD.mikserGeo(q, md, parca), vincGeo: v => MD.vincGeo(v, JIB), mal: () => 'Sıcak daldırma galvaniz çelik' });
const yazilar = it => it.filter(q => q.k === 'T' || q.k === 'B').map(q => q.s), olculer = it => it.filter(q => q.k === 'D').map(q => q.txt);
const det = tur => r.detaylar.filter(d => d.tur === tur);

t('50 bin: 2 kapak tipi (savak 4 poz, orifis 1 poz), 1 mikser + vinç, 1 korkuluk → 10 detay', () => {
  assert.strictEqual(r.tipler.kapak.length, 2);
  const sav = r.tipler.kapak.find(g => g.acilis === 'ASAGI'), ori = r.tipler.kapak.find(g => g.acilis === 'YUKARI');
  assert.strictEqual(sav.pozlar.length, 4, 'savak kapakları 2000x1050, 1550x1000, 2600x1350, 3000x1200'); assert.strictEqual(ori.pozlar.length, 1, 'ara duvar orifisi 1550x900');
  assert.deepStrictEqual([+sav.q.B, +sav.q.H], [3000, 1200], 'temsilci en büyük açıklık');
  assert.strictEqual(r.tipler.mikser.length, 1); assert.ok(r.tipler.mikser[0].vinc, 'mikserin pergel vinci'); assert.strictEqual(r.tipler.korkuluk.length, 1);
  assert.strictEqual(r.detaylar.length, 2 * 2 + 4 + 2, 'kapak 2x2, mikser görünüş + A + B + C, korkuluk üst + yan');
  /* poz numaraları MEK-01 listesiyle aynı */
  const pozK = S.filter(s => s.grup === 'kapak').map(s => s.poz), pozM = S.find(s => s.grup === 'mikser').poz, pozV = S.find(s => s.grup === 'vinc').poz, pozR = S.find(s => s.grup === 'korkuluk').poz;
  assert.deepStrictEqual([...sav.pozlar, ...ori.pozlar].sort((a, b) => a - b), pozK);
  assert.ok(yazilar(det('mikser')[0].items).some(s => s.startsWith(`POZ ${pozM}, ${pozV} - MİKSER VE PERGEL VİNÇ BAĞLANTI DETAYI`)));
  assert.ok(yazilar(det('korkulukYan')[0].items).some(s => s.startsWith(`POZ ${pozR} - KORKULUK BAĞLANTI DETAYI, YANDAN`)));
  assert.ok(yazilar(det('kapakPlan')[0].items).some(s => s === `POZ ${sav.pozlar.join(', ')} - SAVAK KAPAĞI BAĞLANTI DETAYI 1-1 (YATAY KESİT)`));
});

t('kapak 1-1: ölçüler aileden (e 8,5 cm, yuva 12,5 / 20 cm, kızak 10, kapak 6,4, perde 30 cm); nervür yüzü parametreden', () => {
  const d = det('kapakPlan')[0], O = olculer(d.items);
  for (const v of ['8,5', '12,5', '20', '10', '6,4', '30']) assert.ok(O.includes(v), 'ölçü ' + v + ' — ' + O.join(' '));
  assert.ok(yazilar(d.items).includes('NERVÜRLÜ YÜZ (SU TARAFI)') && yazilar(d.items).includes('DÜZ YÜZ'));
  assert.strictEqual(d.olcu.e, 85); assert.strictEqual(d.olcu.tw, 300);
});

t('kapak 2-2: H, savak yuvası, platform ve çerçeve ölçüleri temsilci kapaktan (3000x1200, D 1700, Hf 2578); aktüatör flanşı ISO 5210', () => {
  const d = det('kapakDusey')[0], O = olculer(d.items), Gp = MD.penG(r.tipler.kapak.find(g => g.acilis === 'ASAGI').q);
  assert.strictEqual(Gp.Hf, 1700 + 878); assert.ok(!Gp.ks, 'D < 5 m: tam şasi');
  for (const v of ['120', '50', String((Gp.Hf - Gp.D) / 10).replace('.', ','), String((Gp.Hf + Gp.H) / 10).replace('.', ',')]) assert.ok(O.includes(v), 'ölçü ' + v + ' — ' + O.join(' '));
  const ak = aktuator(Gp.q); assert.ok(ak && MD.ISO5210[ak.flans], 'aktüatör boyu ve flanşı katalogdan');
  assert.strictEqual(d.olcu.flans, ak.flans);
  const ac = r.acilim.map(a => a.lines.join(' ')); assert.ok(ac.some(s => s.includes(`ISO 5210 ${ak.flans} BAĞLANTI FLANŞI`)), 'flanş açılımda');
  assert.ok(ac.some(s => s.includes('TR48x8 TRAPEZ')), 'mil TR48x8 (aile mil çapı, ISO 2904 adımı)');
});

t('kapak ölçü tablosu: 5 poz, her poz kendi ölçüleriyle; YZ dışı karakter yok', () => {
  const T = r.kapakTablo; assert.strictEqual(T.rows.length, 5);
  assert.ok(T.rows.some(x => x[2] === '2000 x 1050') && T.rows.some(x => x[2] === '1550 x 900' && x[1] === 'Yukarı açılır'));
  assert.ok(T.rows.every(x => x.every(c => !/[·×–≈]/.test(c))));
});

t('mikser görünüşü: Hd 531 cm, pervane ekseni 161 cm, ray 10x10, tabliye 20 cm; ray kırık; vinç kol erişimi 107 cm, direk 313 cm; halat ekseni = kaldırma noktası', () => {
  const d = det('mikser')[0], O = olculer(d.items);
  for (const v of ['531', '161', '20', '107', '312,9', '27']) assert.ok(O.includes(v), 'ölçü ' + v + ' — ' + O.join(' '));
  assert.ok(d.olcu.kir, 'kılavuz ray uzun: kırık gösterim'); assert.strictEqual(d.olcu.rayB, 100);
  const ac = r.acilim.map(a => a.lines.join(' '));
  assert.ok(ac.some(s => s.includes('HALAT EKSENİ = ASKI KOLU KALDIRMA NOKTASI EKSENİ')));
  assert.ok(ac.some(s => s.includes('KALDIRMA KAPASİTESİ 500 kg')), 'kapasite listedeki gibi (309 kg x 1,25 → 500 kg)');
  assert.ok(ac.some(s => s.includes('4 ADET M20 GEÇME BULON')), 'KABUL bulon tablosu 500 kg → 4 x M20');
  assert.ok(ac.some(s => s.includes('PERGEL VİNÇ TABAN PLAKASI 400x400x25 mm')), 'taban plakası vinç modelinden (ayak 200 → 400 mm)');
});

t('korkuluk: h 110 cm, dikme @150 cm (korkuluk nesnesinden); üstten ve yandan bağlantı', () => {
  const u = det('korkulukUst')[0], y = det('korkulukYan')[0];
  assert.ok(olculer(y.items).includes('110')); assert.ok(yazilar(u.items).some(s => /POZ \d+ - KORKULUK BAĞLANTI DETAYI, ÜSTTEN \(h = 110 cm\)/.test(s)));
  assert.ok(yazilar(u.items).some(s => s.includes('DİKME @150 cm')));
});

t('açılım kodları MA01 …: aynı malzeme aynı kod, her K yeri koda döndü; yazılarda YZ dışı karakter yok; marka adı yok', () => {
  assert.ok(r.acilim.length >= 10); assert.strictEqual(new Set(r.acilim.map(a => a.kod)).size, r.acilim.length);
  for (const d of r.detaylar) { assert.ok(!d.items.some(q => q.k === 'K')); for (const s of yazilar(d.items)) assert.ok(!/[·×–≈]/.test(s), s); }
  const hepsi = JSON.stringify([r.acilim, r.kapakTablo, r.detaylar.map(d => yazilar(d.items))]); assert.ok(!/KSB|AmaProp|AUMA/i.test(hepsi), 'çizilen yazılarda marka yok');
  const kodlar = r.detaylar.flatMap(d => d.items.filter(q => q.k === 'T' && /^MA\d\d$/.test(q.s)));
  assert.ok(kodlar.every(q => q.mm === R.acilim.kutu.kodMm && q.renk === R.acilim.kutu.kodRenk), 'kod boyu ve rengi açılım kutusu kuralından');
  const ab = MD.acilimBlok(r.acilim, R); assert.ok(ab.w > 0 && ab.h > 0 && ab.spec.some(e => e.s === 'MALZEME AÇILIMI'));
});

t('detay başlıkları kural tablosunun detay başlığı boyunda; detaylar boş değil', () => {
  for (const d of r.detaylar) { const B = d.items.filter(q => q.k === 'B'); assert.strictEqual(B.length, 1, d.tur); assert.strictEqual(B[0].hp, R.baslik.detayMm); assert.ok(isFinite(d.bb[0]) && d.bb[2] > d.bb[0]); }
});

t('malzeme açılımı aile parametrelerinden (varsayılan: AISI 316L çerçeve / kapak, AISI 316 mil, EPDM, A4 dübel; vinç galvaniz S235JR, galvaniz bulon); farklı malzeme ayrı tip', () => {
  const ac = r.acilim.map(a => a.lines.join(' '));
  assert.ok(ac.some(s => s.includes('ÇERÇEVE (YAN KIZAK): AISI 316L')), 'çerçeve'); assert.ok(ac.some(s => s.includes('TRAPEZ, AISI 316')), 'mil');
  assert.ok(ac.some(s => s.includes('M12 A4 PASLANMAZ KİMYASAL DÜBEL')), 'ankraj'); assert.ok(ac.some(s => s.includes('SIZDIRMAZLIK CONTASI: EPDM')), 'conta');
  assert.ok(ac.some(s => s.includes('SICAK DALDIRMA GALVANİZ S235JR ÇELİK')) && ac.some(s => s.includes('GEÇME BULON (SICAK DALDIRMA GALVANİZ)')), 'vinç');
  assert.ok(r.kapakTablo.rows.every(x => x[9] === 'AISI 316L / AISI 316 / EPDM'));
  /* bir savak kapağı 304L olursa ayrı tip (ayrı detay), açılımda AISI 304L */
  const K2 = ents.map(e => { const e2 = e.id === 'k0' ? Object.assign({}, e, { par: Object.assign({}, e.par, { mlz: '304L' }) }) : e; const k = U.kalem(e2, ctx); if (k) { k.e = e2; k.q = e2.type === 'aile' ? e2.par : {}; } return k; }).filter(Boolean), S2 = U.pozla(K2);
  const r2 = MD.detaylar(K2, S2, { R, aktuator, mikserGeo: q => MD.mikserGeo(q, md, parca), vincGeo: v => MD.vincGeo(v, JIB) });
  assert.strictEqual(r2.tipler.kapak.length, 3); assert.ok(r2.acilim.some(a => a.lines.join(' ').includes('AISI 304L')));
  const v2 = MD.vincGeo({ q: { mlz: '304', bulon: 'A4' } }, JIB); assert.strictEqual(v2.mlz, 'AISI 304 PASLANMAZ ÇELİK'); assert.strictEqual(v2.bulon, 'A4 PASLANMAZ');
});

t('ekipman yoksa detay yok', () => { const e = MD.detaylar([], [], { R }); assert.strictEqual(e.detaylar.length, 0); assert.strictEqual(e.kapakTablo, null); });

console.log(`\n${n} test geçti.`);

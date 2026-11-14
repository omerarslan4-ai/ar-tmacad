/* Program katmanı → çizim katmanı eşlemesi ve AutoCAD çıktı dönüşümü (app/cizim-kural.js: esle, ciktiUygula).
   Beklenen değerler Çokal AAT örnek paftalarından (docs/cizim-kurallari/mimari.md): kesilen beton Beton 6 / 0,50; görünüş Ongor 9 / 0,15;
   gizli kenar Arkagor 8 / HIDDEN; ölçü ÖL 8 / 0,15; kot Kot 32 / 0,20; aks Aks 17 / ACAD_ISO04W100 / 0,13; tarama Tarama 136 / 0,09.
   Çalıştır: node test/cizim-esle.test.js */
'use strict';
const assert = require('assert'); require('../app/cizim-kural.js');
const { denetle } = require('../araclar/cizim-karsilastir.js');
const K = globalThis.C.cizimKural, M = K.MIMARI; let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const es = ad => K.esle(M, ad);

t('kesit, görünüş ve plan katmanları örnek katmanlara eşlenir', () => {
  assert.strictEqual(es('KESIT_PERDE'), 'Beton'); assert.strictEqual(es('KESIT'), 'Beton'); assert.strictEqual(es('KESIT_TEMEL_RADYE'), 'Beton'); assert.strictEqual(es('PLAN_0_00_KESIT_PERDE'), 'Beton');
  assert.strictEqual(es('GORUNEN_DOSEME'), 'Ongor'); assert.strictEqual(es('PLAN_0_00_GORUNEN_DOSEME'), 'Ongor'); assert.strictEqual(es('GORUNUS_ON_KESIT_PERDE'), 'Ongor'); // cephede kesilen yok
  assert.strictEqual(es('KESIT_PERDE_TARAMA'), 'Tarama'); assert.strictEqual(es('PLAN_0_00_TARAMA_PERDE'), 'Tarama'); assert.strictEqual(es('KESIT_GROBETON_TARAMA'), 'Grobeton'); assert.strictEqual(es('KESIT_GROBETON'), 'Grobeton');
  assert.strictEqual(es('KESIT_MERDIVEN'), 'Merdiven'); assert.strictEqual(es('GORUNEN_KORKULUK'), 'Korkuluk'); assert.strictEqual(es('KESIT_TRETUVAR'), 'Tretuvar'); assert.strictEqual(es('KESIT_SU'), 'Su'); assert.strictEqual(es('KESIT_SU_TUTUCU_BANT'), 'Sututucu');
});
t('ölçü, kot, aks, zemin, yazı ve kesit işareti', () => {
  for (const a of ['OLCU', 'KESIT_OLCU', 'DETAY_OLCU']) assert.strictEqual(es(a), 'ÖL');
  for (const a of ['KOT', 'PLAN_0_00_KOT']) assert.strictEqual(es(a), 'Kot');
  for (const a of ['AKS', 'AKS_BLOK', 'PLAN_0_00_AKS']) assert.strictEqual(es(a), 'Aks');
  assert.strictEqual(es('ZEMIN'), 'ZMN'); assert.strictEqual(es('YAZI'), 'Mim_Yazi25'); assert.strictEqual(es('MALZEME_ACILIM'), 'Mim_Yazi25'); assert.strictEqual(es('MALZEME_ACILIM_YAZI'), 'Yazi25'); assert.strictEqual(es('KESIT_ISARET'), 'Kesit_Cizgisi'); assert.strictEqual(es('MAHAL_ADI'), 'MAHAL İSİM');
});
t('mekanik nesneler mekanik katmanlara gider; statik ve kazı katmanlarına dokunulmaz; çizim katmanı kendisine eşlenir', () => {
  assert.strictEqual(es('KESIT_MEK_BORU_PE'), 'Mekanik'); assert.strictEqual(es('GORUNEN_POMPA'), 'Mekanik'); assert.strictEqual(es('KESIT_POZ'), 'Mek_Yazi'); assert.strictEqual(es('EKSEN'), 'Boru_Eksen');
  for (const a of ['STA_OLCU', 'STA_AKS', 'STA_POZ', 'STA_SU', 'STA_DONATI_KESIT', 'STA_TARAMA', 'STA_KALIP', 'MT_MAHAL', 'PENCERE', 'DETAY', 'PAFTA_INDEKS', 'KAZI_KESIT', 'KESIT_DUZLEMI', 'INS_SU_YALITIMI', 'BILINMEYEN']) assert.strictEqual(es(a), null, a); // gerçek statik (STA_), tesisat (MT_) ve pafta penceresi katmanları
  assert.strictEqual(es('Beton'), 'Beton'); assert.strictEqual(es('ÖL'), 'ÖL');
  for (const [, h] of M.esleme) if (h) assert.ok(K.tanim(M, h), 'eşleme hedefi tabloda yok: ' + h);
});
t('çıktı dönüşümü: ad çevrilir, özellik katmandan alınır, kesikli çizgi gizli kenar katmanına gider, eski katmanlar düşer', () => {
  const st = (layer, ek) => ({ st: Object.assign({ layer, color: 256, lt: 'BYLAYER', lw: -1 }, ek) });
  const kay = [st('KESIT_PERDE', { color: 8, lw: 50 }), st('GORUNEN_DOSEME', { lt: 'HIDDEN' }), st('KESIT_PERDE', { lt: 'DASHED' }), st('KESIT_OLCU', { color: 3 }), st('KOT'), st('AKS', { lt: 'DASHDOT', lw: 13 }), st('KESIT_PERDE_TARAMA'),
    st('PAFTA_ANTET', { color: 2 }), st('KESIT_MEK_BORU_PE', { color: 4 }), st('STA_DONATI', { color: 1 }), st('0')];
  const kat = { '0': { name: '0', color: 7, lt: 'CONTINUOUS', lw: 25 }, KESIT_PERDE: { name: 'KESIT_PERDE', color: 8, lt: 'CONTINUOUS', lw: 50 }, ESKI: { name: 'ESKI', color: 1, lt: 'CONTINUOUS', lw: 25 }, STA_DONATI: { name: 'STA_DONATI', color: 1, lt: 'CONTINUOUS', lw: 35 } };
  const r = K.ciktiUygula(M, kay, kat);
  assert.deepStrictEqual(kay.map(k => k.st.layer), ['Beton', 'Arkagor', 'Beton_Kesik', 'ÖL', 'Kot', 'Aks', 'Tarama', 'ANTET', 'Mekanik', 'STA_DONATI', '0']);
  assert.deepStrictEqual(kay[0].st, { layer: 'Beton', color: 256, lt: 'BYLAYER', lw: -1 });
  assert.deepStrictEqual(kay[5].st, { layer: 'Aks', color: 256, lt: 'BYLAYER', lw: -1 });
  assert.strictEqual(kay[7].st.color, 2);   // antet serbest: elle verilen renk kalır
  assert.strictEqual(kay[8].st.color, 4);   // mekanik: kuralı henüz yok, nesne özelliği kalır
  assert.deepStrictEqual(r, { eslenen: 9, eslenmeyen: ['STA_DONATI'] });
  assert.deepStrictEqual(Object.keys(kat).sort(), ['0', 'ANTET', 'Aks', 'Arkagor', 'Beton', 'Beton_Kesik', 'Kot', 'Mekanik', 'STA_DONATI', 'Tarama', 'ÖL'].sort());
  assert.deepStrictEqual([kat.Beton.color, kat.Beton.lt, kat.Beton.lw], [6, 'CONTINUOUS', 50]);
  assert.deepStrictEqual([kat.Arkagor.color, kat.Arkagor.lt, kat.Arkagor.lw], [8, 'HIDDEN', 15]);
  assert.deepStrictEqual([kat.Aks.color, kat.Aks.lt, kat.Aks.lw], [17, 'ACAD_ISO04W100', 13]);
  assert.deepStrictEqual([kat['ÖL'].color, kat['ÖL'].lw, kat.Kot.color, kat.Kot.lw, kat.Tarama.color, kat.Tarama.lw], [8, 15, 32, 20, 136, 9]);
});
t('kesit taraması: malzeme kodu → örnekteki desen; dolgu taraması Toprak, grobeton Grobeton katmanına gider; mahal listesi başlığı Yazi30', () => {
  const s = m => K.kesitTaramaSec(M, m);
  assert.deepStrictEqual(s('B'), { pat: 'ANSI36', ang: 0, sc: 0.3937, ann: true, katman: 'Tarama' });
  assert.deepStrictEqual(s('D'), s('B'));                                   // döşeme de perde gibi (örnekte ayrı yön yok)
  assert.deepStrictEqual(s('T:tugla'), { pat: 'AR-B816', ang: 0, sc: 0.394, ann: false, katman: 'Tarama' });
  assert.deepStrictEqual([s('TR:kap').pat, s('TR:harc').pat, s('TR:stab').pat, s('TR:stab').ang, s('TR:bord').pat, s('TR:bord').ang], ['DASH', 'AR-SAND', 'AR-SAND', 45, 'ANSI31', 90]);
  assert.strictEqual(s('F').katman, 'Toprak'); assert.strictEqual(s('G').pat, 'AR-CONC');
  assert.strictEqual(s('T:gazbeton'), null); assert.strictEqual(s('TR:yatak'), null); assert.strictEqual(s('Y'), null);   // örnekte yok: program deseni
  assert.strictEqual(s('K'), undefined); assert.strictEqual(s(undefined), undefined);
  const h = (layer, smat, pat) => ({ kind: 'hatch', e: { smat, pat }, st: { layer, color: 256, lt: 'BYLAYER', lw: -1 } });
  const kay = [h('KESIT_DOLGU_TARAMA', 'F', 'AR-SAND'), h('KESIT_TARAMA', 'B', 'ANSI36'), h('KESIT_TARAMA', 'G', 'AR-CONC'), h('KESIT_TRETUVAR_TARAMA', 'TR:yatak', 'AR-CONC'), h('KESIT_TARAMA', 'T:tugla', 'AR-B816')];
  const y = (hh, rol) => ({ tip: 'mahaltablo', pr: Object.assign({ k: 'T', h: hh, st: 'YZ' }, rol ? { rol } : {}), st: { layer: 'MAHAL_LISTESI', color: 4, lt: 'BYLAYER', lw: -1 } });
  kay.push(y(4, 'baslik'), y(2));
  K.ciktiUygula(M, kay, {}, { mm: r => r.pr.h });
  assert.deepStrictEqual(kay.map(k => k.st.layer), ['Toprak', 'Tarama', 'Grobeton', 'Grobeton', 'Tarama', 'Yazi30', 'Mim_Yazi25']);
});
t('dönüştürülen çıktı denetim aracından hatasız geçer', () => {
  const kul = (tur) => ({ tur, renk: { katmandan: 1 }, cizgiTipi: { katmandan: 1 }, kalinlik: { katmandan: 1 }, toplam: 1 });
  const kay = ['KESIT_PERDE', 'GORUNEN_DOSEME', 'KESIT_OLCU', 'KOT', 'AKS', 'ZEMIN', 'KESIT_PERDE_TARAMA', 'KESIT_MERDIVEN', 'GORUNEN_KORKULUK'].map(layer => ({ st: { layer, color: 3, lt: 'CONTINUOUS', lw: 18 } })), kat = { '0': { name: '0', color: 7, lt: 'CONTINUOUS', lw: 25 } };
  K.ciktiUygula(M, kay, kat);
  const P = { katmanlar: {}, yaziStilleri: {}, olcuStilleri: {}, kullanim: {}, yazilar: {}, olculer: {}, taramalar: { Tarama: { DASH: 1 } }, bloklar: {}, uzay: { model: kay.length, kagit: 0, blokIci: 0 } };
  for (const L of Object.values(kat)) P.katmanlar[L.name] = { renk: L.color, cizgiTipi: L.lt, kalinlik: L.lw };
  for (const k of kay) P.kullanim[k.st.layer] = kul({ LINE: 1 });
  const D = denetle(P, M); assert.deepStrictEqual(D.bulgular.filter(b => b.duzey === 'HATA').map(b => b.konu + ':' + b.yer), []);
});
t('kesitte yalnız mimari elemanlar ölçülür: duvar yüzleri (yatay), döşeme / temel yüzleri ve sol duvardaki boşluk (düşey)', () => {
  const kutu = (lk, x0, z0, x1, z1) => ({ lk, pts: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] });
  const r = K.kesitOlcuNoktalari([kutu('TEMEL_RADYE', -0.5, -0.5, 6.5, 0), kutu('PERDE', 0, 0, 0.3, 1), kutu('PERDE', 0, 2.2, 0.3, 3), kutu('PERDE', 5.7, 0, 6, 3), kutu('DOSEME', 0, 3, 6, 3.2),
    kutu('MERDIVEN', 2, 0, 2.3, 0.17), kutu('KIRIS', 3, 2.6, 3.25, 3), kutu('KORKULUK', 4, 3.2, 4.05, 4.3)]);
  const u = v => [...new Set(v)].sort((a, b) => a - b);
  assert.deepStrictEqual(u(r.xs), [0, 0.3, 5.7, 6]);                    // perde 30 · boşluk 540 · perde 30; merdiven ve kiriş yok
  assert.deepStrictEqual(u(r.zs), [-0.5, 0, 1, 2.2, 3, 3.2]);           // radye 50 · parapet 100 · pencere 120 · 80 · döşeme 20
});
t('yapının içinde: her hacmin net genişliği ve net yüksekliği (R2: 480 / 500 / 600 gibi tek ölçüler)', () => {
  const kutu = (lk, x0, z0, x1, z1) => ({ lk, pts: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] });
  // radye 50, iki dış perde 30, ortada 20'lik duvar, üstte 20'lik döşeme: iki hacim (net 300 ve 220 genişlik, net 300 yükseklik)
  const r = K.kesitIcOlculer([kutu('TEMEL_RADYE', -0.5, -0.5, 6.5, 0), kutu('PERDE', 0, 0, 0.3, 3), kutu('DUVAR_TUGLA', 3.3, 0, 3.5, 3), kutu('PERDE', 5.7, 0, 6, 1), kutu('PERDE', 5.7, 2.2, 6, 3), kutu('DOSEME', 0, 3, 6, 3.2), kutu('MERDIVEN', 4, 0, 4.3, 0.17)], 0.05);
  const h = r.filter(d => d.k === 'h'), v = r.filter(d => d.k === 'v'), yv = x => Math.round(x * 100) / 100;
  assert.deepStrictEqual(h.map(d => yv(d.b[0] - d.a[0])), [0.3, 3, 0.2, 2.2, 0.3]);                  // yatay zincir: duvar · net açıklık · duvar · net açıklık · duvar (pencereli duvar da sınır)
  assert.deepStrictEqual(h.map(d => yv(d.p[1])), [1.25, 1.25, 1.25, 1.25, 1.25]);                    // döşemeden 25 mm yukarıda (1/50: 1,25 m)
  assert.deepStrictEqual(v.filter(d => yv(d.p[0]) === 1.3).map(d => yv(d.b[1] - d.a[1])), [0.5, 3, 0.2]);  // sol hacim: temel · net yükseklik · döşeme; sol duvardan 20 mm içeride (1,00 m)
  assert.deepStrictEqual(v.filter(d => yv(d.p[0]) === 4.7).map(d => yv(d.b[1] - d.a[1])), [0.5, 1, 1.2, 0.8, 0.2]); // sağ hacim: pencere sağ duvarda → zincir sağ duvarın yanında, parapet · pencere · lento
  assert.strictEqual(v.length, 8);
  assert.deepStrictEqual(K.kesitIcOlculer([kutu('TEMEL_RADYE', 0, -0.5, 6, 0), kutu('PERDE', 0, 0, 0.3, 3)], 0.05), []); // üstü açık tek duvar: iç ölçü yok
  assert.deepStrictEqual(K.kesitIcOlculer([kutu('TEMEL_RADYE', -0.5, -0.5, 6.5, 0), kutu('PERDE', 0, 0, 0.3, 3), kutu('PERDE', 5.7, 0, 6, 3), kutu('DOSEME', 0, 3, 6, 3.2)], 0.05, { icYatay: 10, icDusey: 30 }).map(d => d.k + yv(d.k === 'h' ? d.p[1] : d.p[0])).filter((x, i, a) => a.indexOf(x) === i), ['h0.5', 'v1.8']); // yerler kural tablosundan
});
console.log(`\n${n} test geçti.`);

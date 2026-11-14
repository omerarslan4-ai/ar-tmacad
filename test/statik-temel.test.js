/* Yalnız üst yapı yolu — temel hesabı (app/hesap/statik-temel.js › P.temelHesap; temel verisi app/statik-oval.js › d.temel).
   Kural: docs/tasarim-standartlari.md › "Yapı türüne göre statik çözüm yolu", 3: çerçeve + temel (tekil / sürekli / radye, zemin emniyet gerilmesi).
   1) Elle çözülen tekil temel: 2,0 × 2,0 × 0,5 m, ortada 40/40 kolon, G = 1000 kN (+ kolon momenti):
        σ = (1000 + 2·2·0,5·25) / 4 = 262,5 kN/m²; My = 100 kNm → σmaks = 262,5 + 100 / (2·2²/6) = 337,5
        zımbalama (1,4G): d = 0,44, b = 0,84, up = 3,36; q_net = 1,4·1050/4 − 1,4·50/4 = 350; Vpd = 1400 − 350·0,84² = 1153,0 kN
        eğilme: l = 0,80 m, M = 350·0,8²/2 = 112 kNm/m
   2) Bekçi binası (test-proje/_gecici/bekci.aritma): 5,8 × 5,8 × 0,6 m radye, 4 kolon 30/30, 20 cm temel perdesi, dolgu, zemin kat döşemesi:
        N_G = radye öz + üstündekiler (net hacim) + kolon tepkileri; σ ≤ σem; zımbalama yeterli.
   Çalıştır: node test/statik-temel.test.js */
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const O = require('./statik-ortam.js'), P = O.pencere();
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yak = (a, b, e, m) => assert.ok(Math.abs(a - b) <= e, `${m || ''} ${a} ≉ ${b} (±${e})`);

const tekilS = (My) => { const S = P.ornekSaray(); S.mal.gc = 25; S.mal.cR = 0.05; S.zemin.sig = 300; S.temel = { radye: [], surekli: [], tekil: [{ id: 1, x: 0, y: 0, bx: 2, by: 2, t: 0.5, zt: 0 }], ek: [] }; return S; };
const RCf = (My) => ({ kolonlar: [{ id: 7, no: 'S1', x: 0, y: 0, z0: 0, bx: 0.4, by: 0.4, tabanZ: 0, tabanYuk: { G: [0, 0, -1000, 0, My, 0], Q: [0, 0, 0, 0, 0, 0], 'EX+': [0, 0, 0, 0, 0, 0], 'EX-': [0, 0, 0, 0, 0, 0], 'EY+': [0, 0, 0, 0, 0, 0], 'EY-': [0, 0, 0, 0, 0, 0] } }] });
t('çokgen kesit özellikleri: dikdörtgen ve L', () => {
  const K = P.cokgenKesit([[0, 0], [4, 0], [4, 2], [0, 2]]); yak(K.A, 8, 1e-12); yak(K.xc, 2, 1e-12); yak(K.yc, 1, 1e-12); yak(K.Ix, 4 * 8 / 12, 1e-12); yak(K.Iy, 2 * 64 / 12, 1e-12);
  const L = P.cokgenKesit([[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]]); yak(L.A, 3, 1e-12); yak(L.xc, 5 / 6, 1e-12);
});
t('tekil temel (elle): σ = 262,5 kN/m²; My = 100 kNm ile σmaks = 337,5; zımbalama Vpd = 1153 kN; eğilme 112 kNm/m', () => {
  const T0 = P.temelHesap(tekilS(), RCf(0)), o = T0.temeller[0];
  assert.strictEqual(T0.tur, 'tekil'); yak(o.B.G[0], 1050, 1e-9); const z = o.zem.find(q => q.ad === 'G + Q'); yak(z.smax, 262.5, 1e-9); yak(z.smin, 262.5, 1e-9);
  const zb = o.zimb[0], MAL = P.malzeme(tekilS().mal); yak(zb.d, 0.44, 1e-9); yak(zb.up, 3.36, 1e-9); yak(zb.qn, 350, 1e-9); yak(zb.Vpd, 1400 - 350 * 0.84 * 0.84, 1e-6); yak(zb.gam, 1, 1e-12); yak(zb.Vpr, MAL.fctd * 1000 * 3.36 * 0.44, 1e-6);
  yak(o.egil[0].M, 112, 1e-6); yak(o.egil[0].sec.req, Math.max(112 / (0.9 * 0.44 * MAL.fyd * 1000), 0.001), 1e-9); assert.ok(o.egil[0].sec.ok && o.egil[0].sec.s === 0.15);
  const T1 = P.temelHesap(tekilS(), RCf(100)), z1 = T1.temeller[0].zem.find(q => q.ad === 'G + Q'); yak(z1.smax, 337.5, 1e-9); yak(z1.smin, 187.5, 1e-9);
  assert.ok(T1.temeller[0].zimb[0].gam < 1, 'kolon momenti zımbalama γ katsayısını düşürür');
  const S2 = tekilS(); S2.zemin.sig = 300; const T2 = P.temelHesap(S2, RCf(250)); assert.ok(!T2.ok && T2.uyar.some(u => /zemin gerilmesi/.test(u)), 'σmaks 450 > 300');
});
t('temel yoksa hesap yapılmaz, uyarı verilir; kolon temelin dışındaysa söylenir', () => {
  const S = tekilS(); S.temel = null; const T = P.temelHesap(S, RCf(0)); assert.ok(!T.ok && /temel/.test(T.uyar[0]));
  const S2 = tekilS(), RC = RCf(0); RC.kolonlar[0].x = 5; const T2 = P.temelHesap(S2, RC); assert.ok(T2.uyar.some(u => /altında temel bulunamadı/.test(u)));
});

const bekciYol = path.join(O.KOK, 'test-proje/_gecici/bekci.aritma');
if (fs.existsSync(bekciYol)) {
  const { d } = O.modelCevir(JSON.parse(fs.readFileSync(bekciYol, 'utf8')).doc), S = O.uygula(P.ornekSaray(), d);
  t('Bekçi binası: yalnız üst yapı; çerçeve (4 kolon, 4 kiriş) + radye temel; kabuk / iki aşama yok', () => {
    assert.strictEqual(S.yapi.tur, 'ust'); assert.strictEqual(P.ikiAsamaHazirla(S), null);
    assert.strictEqual(d.temel.radye.length, 1); yak(d.temel.radye[0].t, 0.6, 1e-9); assert.deepStrictEqual(d.temel.tekil, []);
    assert.ok(d.temel.ek.some(e => e.tur === 'dolgu') && d.temel.ek.some(e => e.tur === 'doseme') && d.temel.ek.filter(e => e.tur === 'duvar').length === 5);
  });
  t('Bekçi radye: N_G = radye öz + üstündekiler + kolon tepkileri; σ ≤ σem; zımbalama yeterli', () => {
    const RC = P.cerceveHesap(Object.assign({}, S, { suYapisi: false })), TH = P.temelHesap(S, RC), o = TH.temeller[0];
    assert.ok(RC.ok, 'çerçeve yeterli'); assert.strictEqual(TH.tur, 'radye'); assert.strictEqual(o.kol.length, 4);
    yak(o.A, 5.8 * 5.8, 1e-6); yak(o.Gs, 5.8 * 5.8 * 0.6 * S.mal.gc, 1e-6);
    const kolG = -P.tepkiToplam(TH.T, 'G')[2]; yak(kolG, -RC.deprem.cer3B.yukTop.G, 1e-3 * kolG, 'kolon G tepkileri = üst yapıya uygulanan G');
    yak(o.B.G[0], o.Gs + o.Gek + kolG, 1e-6);
    const dol = d.temel.ek.find(e => e.tur === 'dolgu'); yak(dol.x, 5.7, 0.02); yak(dol.y, 4.1, 0.02); // dolgu ağırlık merkezi (çokgen merkezi)
    assert.ok(o.zOk && TH.ok, TH.uyar.join(' | ')); assert.ok(o.zimb.length === 4 && o.zimb.every(z => z.ok));
    const h = P.temelRapor(TH); assert.ok(/TEMEL HESABI/.test(h) && /Zımbalama/.test(h) && /radye eğilme donatısı bu hesapta yapılmamıştır/.test(h));
  });
} else console.log('- Bekçi dosyası yok, atlandı: ' + bekciYol);

console.log(`\n${n} test geçti.`);

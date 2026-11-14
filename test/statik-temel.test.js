/* Yalnız üst yapı yolu — temel hesabı (app/hesap/statik-temel.js › P.temelHesap; temel verisi app/statik-oval.js › d.temel).
   Kural: docs/tasarim-standartlari.md › "Yapı türüne göre statik çözüm yolu", 3: çerçeve + temel (tekil / sürekli / radye, zemin emniyet gerilmesi).
   1) Elle çözülen tekil temel: 2,0 × 2,0 × 0,5 m, ortada 40/40 kolon, G = 1000 kN (+ kolon momenti):
        σ = (1000 + 2·2·0,5·25) / 4 = 262,5 kN/m²; My = 100 kNm → σmaks = 262,5 + 100 / (2·2²/6) = 337,5
        zımbalama (1,4G): d = 0,44, b = 0,84, up = 3,36; q_net = 1,4·1050/4 − 1,4·50/4 = 350; Vpd = 1400 − 350·0,84² = 1153,0 kN
        eğilme: l = 0,80 m, M = 350·0,8²/2 = 112 kNm/m
   2) Bekçi binası (test/veri/bekci-statik.json — test-proje/_gecici/bekci.aritma'nın taşıyıcı / duvar / temel geometrisi ve statikAyar'ı): 5,8 × 5,8 × 0,6 m radye, 4 kolon 30/30, 20 cm temel perdesi, dolgu, zemin kat döşemesi:
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
t('çekirdek dışında kısmi temas: tek yönde e > L/6 → σmaks = 2N / (3·B·(L/2 − e)); G + Q altında kalkma ve devrilme yetersiz', () => {
  const poly = [[0, 0], [4, 0], [4, 2], [0, 2]];
  for (const e of [0.5, 1.0, 1.5]) { const r = P.temasGerilme(poly, 1000, 0, 1000 * e), el = e <= 4 / 6 ? 1000 / 8 * (1 + 6 * e / 4) : 2 * 1000 / (3 * 2 * (2 - e)); yak(r.smax, el, 0.005 * el, 'e = ' + e); }
  yak(P.temasGerilme(poly, 1000, 0, 1000).temas, 0.75, 0.01, 'temas boyu 3·(L/2 − e) = 3 m / 4 m');
  assert.strictEqual(P.temasGerilme(poly, 1000, 0, 2100).ok, false, 'e > L/2: devrilme');
  // tekil temel: N = 1050, My = 700 (e = 0,667 > 2/6) → σmaks = 2·1050 / (3·2·(1 − 0,667)) = 1050 kN/m² (doğrusal formül 787,5 verirdi)
  const T = P.temelHesap(tekilS(), RCf(700)), z = T.temeller[0].zem.find(q => q.ad === 'G + Q');
  yak(z.smax, 1050, 6, 'kısmi temas σmaks'); assert.ok(!z.ok && !T.ok && T.uyar.some(u => /kalkma|zemin gerilmesi/.test(u)));
  // σem yeterli olsa da G + Q altında kalkma yetersizdir
  const S2 = tekilS(); S2.zemin.sig = 5000; const T2 = P.temelHesap(S2, RCf(700)); assert.ok(!T2.ok && T2.uyar.some(u => /düşey yüklerde temel kenarında kalkma/.test(u)));
});
t('zımbalama dışmerkezliği e = M_pd / V_pd (TS 500 8.3.1): My = 100 kNm (1,4G → 140) ile γ = 1 / (1 + 1,5·(140 / 1153,0) / 0,84)', () => {
  const zb = P.temelHesap(tekilS(), RCf(100)).temeller[0].zimb[0], Vpd = 1400 - 350 * 0.84 * 0.84;
  yak(zb.Vpd, Vpd, 1e-6); yak(zb.gam, 1 / (1 + 1.5 * (140 / Vpd) / 0.84), 1e-9);
});

t('genel taban (çarpım atalet momenti): 45° dönük 0,6 × 10 m şerit, N 500, e 0,05 → 125 kN/m²; e 0,20 (kısmi temas) → 333,3; L radye 10 × 10 kol 2, N 1000, My 1000 → 56,27', () => {
  const c = Math.SQRT1_2, u = [c, c], nn = [-c, c], serit = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [a * 5 * u[0] + b * 0.3 * nn[0], a * 5 * u[1] + b * 0.3 * nn[1]]);
  const K = P.cokgenKesit(serit); yak(K.A, 6, 1e-9); assert.ok(Math.abs(K.Ixy) > 10, 'dönük şeritte Ixy ≠ 0');
  // σ = N/A·(1 + 6e/B) = 500/6·1,5 = 125 ; kısmi: 2N / (3·L·(B/2 − e)) = 1000 / (3·10·0,1) = 333,3
  yak(P.temasGerilme(serit, 500, -500 * 0.05 * nn[1], 500 * 0.05 * nn[0]).smax, 125, 0.01);
  const r2 = P.temasGerilme(serit, 500, -500 * 0.2 * nn[1], 500 * 0.2 * nn[0]); yak(r2.smax, 1000 / 3, 0.005 * 1000 / 3); yak(r2.temas, 0.5, 0.01);
  // L radye: A 36, merkez (3,222; 3,222), Ix = Iy = 314,22, Ixy = −177,78 → σmaks köşe (10; 2) = 1000/36 + [1000·314,22·6,778 − 1000·(−177,78)·(−1,222)] / (314,22² − 177,78²)
  const Lp = [[0, 0], [10, 0], [10, 2], [2, 2], [2, 10], [0, 10]], KL = P.cokgenKesit(Lp); yak(KL.Ixy, -1600 / 9, 1e-9); yak(KL.Ix, 2828 / 9, 1e-9);
  const D = KL.Ix * KL.Iy - KL.Ixy ** 2, el = 1000 / 36 + (1000 * KL.Ix * (10 - KL.xc) - (1000 * KL.Ixy) * (2 - KL.yc)) / D; yak(el, 56.27, 0.01);
  yak(P.temasGerilme(Lp, 1000, 0, 1000).smax, el, 1e-9);
  // döndürülmüş tekil temel (eksenlere göre 30°): yön bağımsızlık — kendi ekseninde e = 0,2 ile aynı σ
  const S = tekilS(); S.temel.tekil[0].rot = 30; const a = 30 * Math.PI / 180, RC = RCf(0); RC.kolonlar[0].tabanYuk.G = [0, 0, -1000, -0.2 * 1050 * Math.sin(a), 0.2 * 1050 * Math.cos(a), 0];
  yak(P.temelHesap(S, RC).temeller[0].zem[0].smax, 1050 / 4 * (1 + 6 * 0.2 / 2), 0.5);
});
t('kısmi temasta zımbalama q_net gerçek temas dağılımından: kolon temas dışında kalınca q_net = 0, Vpd = Nd', () => {
  const zb = P.temelHesap(tekilS(), RCf(800)).temeller[0].zimb[0]; yak(zb.qn, 0, 1e-9); yak(zb.Vpd, zb.Nd, 1e-9);
});

t('perde üstündeki tuğla duvar bütün kabuk yollarında perdeye yüklenir (su yapısı: ara perde üstünde duvarlı sığ hazne — duvar ağırlığı radye tepkisinde)', () => {
  const ents = [{ type: 'plak', kind: 'radye', pts: [[-0.5, -0.5], [8.5, -0.5], [8.5, 5.5], [-0.5, 5.5]], t: 0.4, zt: 0.4 },
    ...[[[0, 0], [8, 0]], [[8, 0], [8, 5]], [[8, 5], [0, 5]], [[0, 5], [0, 0]], [[4, 0], [4, 5]]].map(pts => ({ type: 'perde', pts, closed: false, tb: 0.3, tt: 0.3, egim: 'R', hiza: 'O', ofs: 0, malz: 'beton', z0: 0.4, h: 1.0 })),
    { type: 'perde', pts: [[4, 0.15], [4, 4.85]], closed: false, tb: 0.2, tt: 0.2, egim: 'R', hiza: 'O', ofs: 0, malz: 'tugla', z0: 1.4, h: 2.5 }]
    .map((e, i) => Object.assign({ id: i + 1, layer: '0' }, e));
  const { d: dh } = O.modelCevir({ ents, layers: {}, set: {} }), Sh = O.uygula(P.ornekSaray(), JSON.parse(JSON.stringify(dh)));
  assert.strictEqual(Sh.yapi.tur, 'su'); const du = dh.temel.ek.find(e => e.tur === 'duvar'); assert.ok(du && P.duvarPerdeUstu(du, Sh.kabuk.walls), 'duvar ara perdenin üstünde');
  const Wd = du.V * P.TEMEL_GAMMA_TUGLA, PU = P.perdeUstuDuvarYuk(Sh); yak(-PU.reduce((s, q) => s + q.F.G[2], 0), Wd, 1e-9); assert.ok(!P.radyeUstYuk(Sh).some(y => y.tur === 'duvar'), 'radye yükünde değil');
  Sh.tas.kmesh = 0.5; Sh.dep.SDS = 0; const r = P.kabukHesap(Sh), AG = r.AG, kz = Sh.zemin.kw, trib = new Float64Array(AG.nodes.length); for (const e of AG.els) if (e.tur === 'radye') for (const k of e.n) trib[k] += e.A / 4;
  let yay = 0; for (let i = 0; i < AG.nodes.length; i++) if (trib[i] > 0) yay += -kz * trib[i] * r.U.G[i * 6 + 2]; let W = 0; for (const e of AG.els) W += Sh.mal.gc * e.t * e.A;
  yak(yay, W + Wd, 1e-3 * (W + Wd), 'radye tepkisi = kabuk öz ağırlığı + duvar');
});
t('kolon tepkisinin radyeye dağıtımı düzensiz düğüm kümesinde (Sxy ≠ 0) de bileşkeyi korur', () => {
  // 45° kesik köşeli radye; kolon kesik kenarın yanında → kolon izi düğüm kümesi simetrik değil
  const M = { walls: [{ ad: 'P', pts: [[0, 0], [6, 0]], t: 0.3, zt: 2, tip: 'dis' }], radye: { pts: [[-0.5, -0.5], [6.5, -0.5], [6.5, 3], [3, 6.5], [-0.5, 6.5]], t: 0.5, kAlt: -0.5 }, dosemeler: [],
    kolonYuk: [{ id: 99, no: 'S', x: 4.6, y: 4.6, z: 0, bx: 0.6, by: 0.6, F: { G: [3, -2, -500, 40, -70, 5] } }] };
  const AG = P.kabukAg(M, { h: 0.25, kotlar: [] }), L = AG.dugumYuk.G.filter(x => x.ad === 'S'), q = M.kolonYuk[0];
  const cx = L.reduce((s, x) => s + AG.nodes[x.n][0], 0) / L.length, cy = L.reduce((s, x) => s + AG.nodes[x.n][1], 0) / L.length, Sxy = L.reduce((s, x) => s + (AG.nodes[x.n][0] - cx) * (AG.nodes[x.n][1] - cy), 0);
  assert.ok(Math.abs(Sxy) > 0.05, 'düzensiz küme: Sxy ' + Sxy);
  const R = [0, 0, 0, 0, 0, 0]; for (const x of L) { const p = AG.nodes[x.n], rr = [p[0] - q.x, p[1] - q.y, p[2] - q.z], f = x.f; for (let k = 0; k < 3; k++) R[k] += f[k]; R[3] += f[3] + rr[1] * f[2] - rr[2] * f[1]; R[4] += f[4] + rr[2] * f[0] - rr[0] * f[2]; R[5] += f[5] + rr[0] * f[1] - rr[1] * f[0]; }
  q.F.G.forEach((v, k) => yak(R[k], v, 1e-6 * (1 + Math.abs(v)), 'bileşen ' + k));
  assert.ok(L.every(x => x.f[3] === 0 && x.f[4] === 0), 'Mx, My düşey kuvvet çiftiyle');
});

t('temel yoksa hesap yapılmaz, uyarı verilir; kolon temelin dışındaysa söylenir', () => {
  const S = tekilS(); S.temel = null; const T = P.temelHesap(S, RCf(0)); assert.ok(!T.ok && /temel/.test(T.uyar[0]));
  const S2 = tekilS(), RC = RCf(0); RC.kolonlar[0].x = 5; const T2 = P.temelHesap(S2, RC); assert.ok(T2.uyar.some(u => /altında temel bulunamadı/.test(u)));
});

const bekciYol = path.join(O.KOK, 'test/veri/bekci-statik.json');
{
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
}

t('şerit perde (elle): üçgen yük K·γ·(H − z), H 1,05 — konsol M = Kγ H³/6, V = Kγ H²/2; alt ankastre üst mafsal M = Kγ H³/15, V = 0,4·Kγ H²', () => {
  const H = 1.05, Kg = 0.333 * 18, p = z => Kg * (H - z), a = P.seritPerde(H, p, 'serbest'), b = P.seritPerde(H, p, 'mafsal');
  yak(Math.abs(a.Mt), Kg * H ** 3 / 6, 1e-3); yak(a.Vt, Kg * H * H / 2, 1e-6); yak(Math.abs(b.Mt), Kg * H ** 3 / 15, 1e-3); yak(b.Vt, 0.4 * Kg * H * H, 1e-6);
  yak(Math.abs(b.V[b.V.length - 1]), 0.1 * Kg * H * H, 1e-6, 'mafsal tepkisi');
});
{
  const { d: dB } = O.modelCevir(JSON.parse(fs.readFileSync(bekciYol, 'utf8')).doc), SB = O.uygula(P.ornekSaray(), dB);
  t('Bekçi: Çokal AAT değerleri projede (CKL_AAT_GB_R0: SDS 1,624, SD1 0,549, R 8, D 3, qt 14,29 t/m², k 2400 t/m³) — uyarı yok', () => {
    assert.strictEqual(SB.ayarUyari, null); assert.strictEqual(SB.dep.SDS, 1.624); yak(SB.zemin.sig, 140.2, 1e-9); yak(SB.zemin.kw, 23544, 1e-9); assert.strictEqual(SB.yer, 'cokal');
    assert.strictEqual(SB.cer.ayar.SD1, 0.549); assert.strictEqual(SB.cer.ayar.R, 8); assert.strictEqual(SB.geo.kZemin, 0.75);
    assert.strictEqual(SB.mal.fck, 30); assert.strictEqual(SB.mal.fyk, 420); // C30 / S420 (hazır değerlerle malzeme de)
  });
  t('Bekçi subasman perdesi (20 cm, H 1,05; dış toprak +0,75 kotuna kadar): şerit konsol taban momenti = 1,6·Ks·(γ·Hs³/6 + q·Hs²/2)', () => {
    const sb = P.subasmanHesap(SB)[0], IT = P.itki(SB), Hs = 0.75; assert.strictEqual(sb.ust, 'mafsal', 'zemin döşemesi perde üstünde');
    yak(sb.H, 1.05, 1e-9); yak(sb.konsolMt, 1.6 * IT.Ks * (18 * Hs ** 3 / 6 + 5 * Hs * Hs / 2), 0.015 * sb.konsolMt); // %1,5: yük kırığı (+0,75) eleman sınırında değil
    assert.ok(sb.sec && sb.sec.ok && sb.kesme.ok);
    assert.ok(/H ≤ 2 m: düşey donatı filizsiz tek parça/.test(sb.not));
  });
  t('subasman deprem itkisi: Wood seçilince ΔP = kh·γ·H² (S.dep.yontem), M-O tanımsızsa 0 + uyarı (NaN yok)', () => {
    const mo = P.subasmanHesap(SB)[0], SW = JSON.parse(JSON.stringify(SB)); SW.dep.yontem = 'WOOD'; const wd = P.subasmanHesap(SW)[0];
    assert.strictEqual(wd.yontem, 'Wood');
    // elle (konsol, Wood, depremli kombinasyon G+Q+E: toprak + sürşarj + Wood artışı + atalet), Hs = 0,75, H = 1,05, γ 18, q 5:
    //   toprak  Ks·(γ·Hs³/6 + q·Hs²/2) ; Wood toprak kh·γ·Hs·Hs²/2 ; Wood sürşarj (ters üçgen, dPq = kh·q·Hs) 2·dPq·Hs/3 ; atalet kh·γb·t·H²/2
    const kh = 0.4 * SW.dep.SDS / SW.dep.r, Ks = P.itki(SW).Ks, Hs = 0.75, el = Ks * (18 * Hs ** 3 / 6 + 5 * Hs * Hs / 2) + kh * 18 * Hs * Hs * Hs / 2 + 2 * (kh * 5 * Hs) * Hs / 3 + kh * SW.mal.gc * 0.2 * 1.05 ** 2 / 2;
    yak(wd.konsolMe, el, 0.015 * el, 'Wood elle'); assert.ok(isFinite(wd.Md) && Math.abs(wd.Md - mo.Md) > 1e-3, 'yöntem seçimi sonucu değiştirir');
    const SN = JSON.parse(JSON.stringify(SB)); SN.zemin.phi = 5; SN.dep.SDS = 2.5; SN.dep.r = 1; const nn = P.subasmanHesap(SN)[0];
    assert.ok(isFinite(nn.Md) && isFinite(nn.Vd) && nn.uyar.some(u => /Mononobe-Okabe dinamik toprak itkisi tanımsız/.test(u)));
  });
  t('Bekçi temel kabuğu (radye + subasman): yeterli; perde iç / dış ve radye alt / üst aynı çap, 15 cm; düşey denge; kabuk paftaları çıkar', () => {
    const RC = P.cerceveHesap(Object.assign({}, SB, { suYapisi: false })), TK = P.temelKabukHesap(SB, RC); assert.ok(TK && TK.ok, 'temel kabuğu yeterli');
    for (const q of TK.perde) { assert.ok(q.dusey.ok && q.dusey.s === 0.15 && q.yatay.ok); assert.ok(q.Md >= q.Ms - 1e-9 && q.Md >= q.Mk - 1e-9, 'iki yöntemin büyüğü'); }
    for (const q of TK.radye) assert.ok(q.sec.ok && q.sec.s === 0.15);
    const r = TK.r, AG = r.AG, kz = SB.zemin.kw, trib = new Float64Array(AG.nodes.length); for (const e of AG.els) if (e.tur === 'radye') for (const k of e.n) trib[k] += e.A / 4;
    let yay = 0; for (let i = 0; i < AG.nodes.length; i++) if (trib[i] > 0) yay += -kz * trib[i] * r.U.G[i * 6 + 2];
    let W = 0; for (const e of AG.els) W += SB.mal.gc * e.t * e.A; for (const b of AG.bars) W += SB.mal.gc * b.s.A * b.L; for (const q of (AG.dugumYuk.G || [])) W += -q.f[2];
    let ry = 0; for (const e of AG.els) if (e.tur === 'radye') { const X = e.n.map(i => AG.nodes[i]), c = [(X[0][0] + X[2][0]) / 2, (X[0][1] + X[2][1]) / 2]; for (const y of P.radyeUstYuk(Object.assign({}, SB, { kabuk: Object.assign({}, SB.kabuk, { dosemeler: [] }) }))) { let ic = false; const q = y.pts; for (let i = 0, j = q.length - 1; i < q.length; j = i++) if ((q[i][1] > c[1]) !== (q[j][1] > c[1]) && c[0] < (q[j][0] - q[i][0]) * (c[1] - q[i][1]) / (q[j][1] - q[i][1]) + q[i][0]) ic = !ic; if (ic) ry += y.pG * e.A; } }
    yak(yay, W + ry, 1e-3 * (W + ry), 'zemin tepkisi = öz ağırlık + kolon / duvar yükleri + radye üstü yük');
    assert.ok(r.bilgi.some(s => /4 kolon ayağı tepkisi ve \d+ ek yük/.test(s)), 'perde üstündeki tuğla duvarlar perde üstüne');
    // perde üstündeki 4 tuğla duvar yalnız perde yükü; radye yükünde yalnız iç bölme duvarı (iki kez sayılmaz)
    const ekD = dB.temel.ek.filter(e => e.tur === 'duvar'); assert.strictEqual(ekD.filter(e => P.duvarPerdeUstu(e, SB.kabuk.walls)).length, 4);
    const RYd = P.radyeUstYuk(Object.assign({}, SB, { kabuk: Object.assign({}, SB.kabuk, { dosemeler: [] }) })).filter(y => y.tur === 'duvar'); assert.strictEqual(RYd.length, 1);
    assert.ok(!RYd.some(y => ekD.filter(e => P.duvarPerdeUstu(e, SB.kabuk.walls)).some(e => e.id === y.id)));
    // kolon tepkisinin radye düğümlerine dağıtımı: her kolon ve durum için dağıtılan kuvvetlerin bileşkesi (kuvvet ve kolon noktasına göre
    // moment) girilen tepkiye eşit — Mx = Σ dy·fz, My = −Σ dx·fz (eski hatada moment çifti ters işaretliydi)
    const Tk = P.kabukKolonYuku(P.kolonTepki(RC)); let sayM = 0;
    for (const q of Tk) for (const c of ['G', 'Q', 'ESX', 'ESY']) { const F = q.F[c], L = (AG.dugumYuk[c] || []).filter(x => x.ad === q.no); if (!F || !L.length) continue;
      const R = [0, 0, 0, 0, 0, 0]; for (const x of L) { const p = AG.nodes[x.n], rr = [p[0] - q.x, p[1] - q.y, p[2] - q.z], f = x.f; for (let k = 0; k < 3; k++) R[k] += f[k];
        R[3] += f[3] + rr[1] * f[2] - rr[2] * f[1]; R[4] += f[4] + rr[2] * f[0] - rr[0] * f[2]; R[5] += f[5] + rr[0] * f[1] - rr[1] * f[0]; }
      for (let k = 0; k < 6; k++) yak(R[k], F[k], 1e-6 * (1 + Math.abs(F[k])), `${q.no} ${c} bileşen ${k}`); if (Math.abs(F[3]) + Math.abs(F[4]) > 1) sayM++; }
    assert.ok(sayM >= 8, 'momentli tepkiler denetlendi: ' + sayM);
    const paf = P.kabukPaftalar(r, SB, 50, {}, SB.proj); assert.ok(paf.length >= 4 && paf.some(p => /TEMEL DONATI/.test(p.ad)) && paf.some(p => /PERDE DONATI/.test(p.ad)), paf.map(p => p.ad).join(' | '));
    assert.ok(/TEMEL VE SUBASMAN PERDESİ/.test(P.temelKabukRapor(TK)) && /Temel ve subasman/.test(P.temelKabukOzet(TK)));
  });
}

console.log(`\n${n} test geçti.`);

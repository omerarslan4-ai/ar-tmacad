/* Elektrik tesisatı hesap çekirdeği (app/el-hesap.js) — gerçek proje: Çorlu AAT B-105 Bekçi Binası, E-BB 002 (ERGE Proje, 2012):
     BBAT yükleme cetveli: 01 ışık 200 W · 02 ışık 200 W · 03 priz (2) 600 W · 04 priz (3) 900 W · 05 motorlu kapı 3x40A 5000 W · 06–07 yedek
     kurulu 6900 W, diversite %70, işletme 4830 W; ana şalter 3x50A, KCAK 3x50A 30 mA; besleme İBAT-1'den 4x6 NYY.
   Çalıştır: node test/elektrik.test.js */
'use strict';
const assert = require('assert');
const EL = require('../app/el-hesap.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yak = (a, b, tol, m) => assert(Math.abs(a - b) <= tol, `${m || ''} ${a} ≠ ${b} (±${tol})`);

const corlu = () => {
  const g = [{ tur: 'isik', n: 3, W: 200, mahal: ['Z01'] }, { tur: 'isik', n: 4, W: 200, mahal: ['Z02'] }, { tur: 'priz', n: 2, W: 600, mahal: [] }, { tur: 'priz', n: 3, W: 900, mahal: [] }];
  return EL.linyeler(g, [{ ad: 'Motorlu otm kapı (gelecekte)', W: 5000, faz: 3, In: 40, kablo: '5x6 NYY' }], 2);
};
t('Çorlu BBAT: 7 linye, numaralar 01…07, ışık 10 A, priz 16 A', () => {
  const L = corlu(); assert.strictEqual(L.length, 7); assert.deepStrictEqual(L.map(x => x.no), ['01', '02', '03', '04', '05', '06', '07']);
  assert.deepStrictEqual(L.map(x => x.In), [10, 10, 16, 16, 40, 10, 10]); assert.strictEqual(L[2].kablo, '3x2.5 NYA');
});
t('Çorlu BBAT: kurulu 6900 W, diversite %70 → işletme 4830 W', () => {
  const Y = EL.yuk(corlu(), { div: 70, L: 100 }); assert.strictEqual(Y.kurulu, 6900); assert.strictEqual(Math.round(Y.isletme), 4830);
});
t('Çorlu BBAT: ana şalter ve kaçak akım 3x50A (en büyük çıkış 40 A, bir kademe büyük), 30 mA', () => {
  const Y = EL.yuk(corlu(), { div: 70, L: 100 }); assert.strictEqual(Y.In, 50); assert.strictEqual(Y.kak.mA, 30);
});
t('Çorlu BBAT: besleme 100 m → 4x6 NYY (4 mm²\'de gerilim düşümü %1,9 > %1,5)', () => {
  const Y = EL.yuk(corlu(), { div: 70, L: 100 }); assert.strictEqual(Y.bes.S, 6); assert.strictEqual(Y.bes.ad, '4x6 NYY'); assert(Y.bes.e <= 1.5);
  yak(100 * 100 * 6900 / (56 * 4 * 160000), 1.925, 0.01, 'e(4mm²)');
});
t('faz dağılımı: toplam korunur, 3 fazlı yük eşit bölünür, dengesizlik %25\'in altında', () => {
  const L = corlu(), F = EL.fazDagit(L); yak(F.R + F.S + F.T, 6900, 1e-6); yak(L[4].dag.R, 5000 / 3, 1e-6); const mx = Math.max(F.R, F.S, F.T), mn = Math.min(F.R, F.S, F.T); assert((mx - mn) / mx < 0.25);
});
t('aydınlatma (lümen yöntemi): 5,0 × 3,5 m danışma, h 2,8 m, 300 lx, P-2x40W (eski floresan kodu da çalışır) → 3 armatür (η 0,45), E ≥ 300 lx', () => {
  const r = EL.aydinlatma({ a: 5.0, b: 3.5, h: 2.8, E: 300, arm: 'P-2x40W' });
  yak(r.k, 5 * 3.5 / (1.95 * 8.5), 1e-9, 'k'); assert(r.N >= 1 && r.Eg >= 300, `N=${r.N} Eg=${r.Eg}`); assert.strictEqual(r.N, 3);
});
t('armatür ızgarası: N tane, oda içinde, eşit aralıklı', () => {
  const p = EL.izgara(4, 6, 4); assert.strictEqual(p.length, 4); p.forEach(q => assert(q[0] > 0 && q[0] < 6 && q[1] > 0 && q[1] < 4));
  assert.strictEqual(EL.izgara(3, 3, 3).length, 3);
});
t('linye gruplama: ışık en çok 9 sorti, priz en çok 7 sorti', () => {
  const c = []; for (let i = 0; i < 12; i++) c.push({ tur: 'isik', W: 50, mahal: 'Z01' }); for (let i = 0; i < 8; i++) c.push({ tur: 'priz', W: 300, mahal: 'Z01' });
  const g = EL.linyeGrupla(c); assert.deepStrictEqual(g.map(x => [x.tur, x.n]), [['isik', 9], ['isik', 3], ['priz', 7], ['priz', 1]]);
});
t('mahal tipi: WC etanş, mutfak ısı dedektörü, danışma telefon prizi', () => {
  assert(EL.mahalTip('WC').etans); assert.strictEqual(EL.mahalTip('MUTFAK').ded, 'isi'); assert.strictEqual(EL.mahalTip('DANIŞMA').tlf, 1); assert.strictEqual(EL.armaturSec(3, true), 'U-LED18W'); assert.strictEqual(EL.armaturSec(20, false), 'P-LED36W'); assert(EL.ARMATUR['P-LED36W'].led);
});
t('topraklama: 5×5 m bina, ρ 100 Ωm → halka + 2 çubuk ≤ 10 Ω, dokunma gerilimi ≤ 50 V', () => {
  const r = EL.topraklama({ cevre: 20, alan: 25, rho: 100 }); assert(r.R <= 10, 'R=' + r.R); assert(r.uygun); assert(r.serit >= 20); assert(r.cubuk >= 2);
  yak(r.Rh, 2 * 100 / (3 * 1.13 * 5), 1e-9, 'halka');
});
t('dedektör sayısı: duman 60 m², ısı 30 m²', () => { assert.strictEqual(EL.dedektorSay(70, 'duman'), 2); assert.strictEqual(EL.dedektorSay(20, 'isi'), 1); assert.strictEqual(EL.dedektorSay(20, null), 0); });
t('tek hat şeması ve yükleme cetveli çizilir (her linye için satır / çıkış)', () => {
  const L = corlu(), Y = EL.yuk(L, { div: 70, L: 100 }), th = EL.tekHat(L, Y, { pano: 'BBAT', besleyen: 'İBAT-1' }), ct = EL.cetvel(L, Y, { pano: 'BBAT' });
  assert(th.T.some(q => /BBAT \(Pi=6900W\) TABLO TEK HAT ŞEMASI/.test(q[3]))); assert(th.T.some(q => q[3] === '4x6mm2 NYY')); assert(th.T.some(q => q[3] === 'KCAK-3x50A'));
  assert(ct.T.some(q => q[3] === '4830')); assert(ct.T.some(q => q[3] === 'İŞLETME GÜCÜ(W)')); assert.strictEqual(ct.T.filter(q => q[3] === 'OTOM.').length, 7);
});
t('armatür yeri: L biçimli odada (kullanıcı 15.11.2026 "lamba duvarın içine girmiş") gövde duvara ve öbür odaya taşmaz, duvardan ≥ 0,5 m', () => {
  /* ara bölmeli bekçi binası: sol odada üstte 2,45 m, altta 4,5 m genişlik — L oda; ara duvar x = 2,45 */
  const Lp = [[0, 0], [4.5, 0], [4.5, 2.4], [2.45, 2.4], [2.45, 4.6], [0, 4.6]], p = EL.armaturYeri(Lp, EL.izgara(3, 4.5, 4.6), 0, 1.04);
  assert.strictEqual(p.length, 3);
  for (const q of p) { assert(EL.icinde(q, Lp), 'oda dışında ' + q); assert(EL.kenarUzak(q, Lp) >= 0.5 - 1e-9, 'merkez duvara yakın ' + q); for (const s of [-1, 1]) { const u = [q[0] + s * 0.57, q[1]]; assert(EL.icinde(u, Lp) && EL.kenarUzak(u, Lp) >= 0.25 - 1e-9, 'uç duvara yakın ' + u); } }
  for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) assert(Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]) >= 0.9);
});
t('armatür yeri: dikdörtgen odada ızgara noktası uygunsa yerinde kalır', () => {
  const R = [[0, 0], [5, 0], [5, 3.5], [0, 3.5]], id = EL.izgara(2, 5, 3.5), p = EL.armaturYeri(R, id, 0, 1.04); assert.deepStrictEqual(p, id);
});
t('detaylar (firma kuralı 15.11.2026, perspektif): bara, temel, şerit eki, LED armatür, dedektör, montaj yükseklikleri ve tablolar sayısal hatasız çizilir', () => {
  const D = require('../app/el-detay.js'), R = EL.topraklama({ cevre: 20, alan: 25, rho: 100 });
  const gs = [D.detayBara(), D.detayTemel(), D.detayEk(), D.detayArmatur('P-LED36W'), D.detayDedektor(), D.detayYukseklik(2.5), D.tabloTopraklama(R), D.tabloArmatur({ 'P-LED36W': 3 })];
  for (const g of gs) { assert(g.L.length > 5 && g.T.length > 3); assert(!g.L.some(l => l.slice(0, 4).some(v => !isFinite(v)))); assert(!g.T.some(q => !isFinite(q[0]) || !isFinite(q[1]))); }
  assert(gs[6].T.some(q => /Ω/.test(q[3])));
  /* paftadaki topraklama tablosu hesapla aynı sayıları taşır */
  const fz = (v, d) => (+v).toFixed(d).replace('.', ','); for (const s of [fz(R.Rh, 2) + ' Ω', fz(R.Rc1, 2) + ' Ω', R.cubuk + ' ad', fz(R.dokunma, 2) + ' V ✓']) assert(gs[6].T.some(q => q[3] === s), 'tabloda yok: ' + s); assert(gs[6].T.some(q => q[3].startsWith(fz(R.R, 2) + ' Ω'))); assert(gs[7].T.some(q => /LED/.test(q[3]))); assert(EL.ARMATUR['P-LED36W'].led && EL.ARMATUR['U-LED36W'].ip === 65);
});
t('mekanik ekipman (firma kuralı 15.11.2026): ısıtıcı, split klima ve fan elektrik gücü ve kendi linyesi; radyatör (sulu) ve panjur elektriksiz', () => {
  const h = EL.mekGuc({ type: 'mtrad', tip: 'E', Qn: 1500, no: 'Eİ1' }), k = EL.mekGuc({ type: 'mtfc', tip: 'split', Qn: 3500, no: 'SK1' }), f = EL.mekGuc({ type: 'mthv', kind: 'duvarfan', W: 45 }), b = EL.mekGuc({ type: 'mtrad', tip: 'E', Qn: 5000 });
  assert.strictEqual(h.W, 1500); assert.strictEqual(h.faz, 1); assert.strictEqual(k.W, Math.round(3500 / 3.2) + 30); assert.strictEqual(f.W, 45); assert.strictEqual(b.faz, 3);
  assert.strictEqual(EL.mekGuc({ type: 'mtrad', tip: '22', Qn: 1500 }), null); assert.strictEqual(EL.mekGuc({ type: 'mthv', kind: 'panjur' }), null);
  const L = EL.linyeler([], [Object.assign({ mek: true }, h), Object.assign({ mek: true }, b)], 0); assert.deepStrictEqual(L.map(x => [x.tur, x.In, x.faz, x.kablo]), [['mek', 16, 1, '3x2.5 NYA'], ['mek', 16, 3, '5x2.5 NYA']]);
  assert.strictEqual(EL.kabloSec(25, false), '3x4 NYA');
  assert.strictEqual(EL.mekGuc({ type: 'mthv', kind: 'duvarfan', W: 40, no: 'AF1' }).ad, 'DUVAR TİPİ ASPİRATÖR AF1'); assert.strictEqual(EL.mekGuc({ type: 'mtarm', tip: 'termosifon', hacim: 80 }).W, 2000); assert.strictEqual(EL.mekGuc({ type: 'mtarm', tip: 'termosifon', hacim: 200 }).W, 3000);
  assert.strictEqual(EL.mekGuc({ type: 'mtarm', tip: 'camasir' }).W, 2200); assert.strictEqual(EL.mekGuc({ type: 'mtarm', tip: 'lavabo' }), null);
  const mz = EL.mekMerkez({ kazan: { sistem: 'merkezi', adet: 1, QB: 40, pompaP: 120 }, chiller: { elek: 5, pompaP: 300 } }); assert.deepStrictEqual(mz.map(x => x.W), [100 + 120 + 50, 5300]); assert.strictEqual(EL.mekMerkez({ kazan: { sistem: 'merkezi', adet: 2, QB: 206 } })[0].W, 2 * 309 + 50);
  assert.strictEqual(EL.mekGuc({ type: 'mthv', kind: 'hucrefan', kW: 1.5, V: 5000 }).W, 1500); assert.strictEqual(EL.mekGuc({ type: 'mthv', kind: 'hucrefan', kW: 4, V: 9000 }).faz, 3); assert.strictEqual(EL.mekGuc({ type: 'mtrad', tip: 'E', Qn: 3650 }).faz, 3); assert.strictEqual(EL.mekGuc(mz[1]).faz, 3);
  assert.strictEqual(EL.mekMerkez({ kazan: { sistem: 'kombi', kombiAdet: 2 } })[0].W, 300);
  const r = EL.mekGuc({ type: 'mthv', kind: 'rooftop', Qs: 20, V: 4000 }); assert.strictEqual(r.W, Math.round(20000 / 3.2 + 160)); assert.strictEqual(r.faz, 3);
});
t('pano şalt dizilimi (kullanıcı 15.11.2026, Çorlu BBAT): ana şalter 3x50A + kaçak akım 30 mA + parafudr + sinyal ilk rayda, 7 linye sigortası ikinci rayda; pano 310x370x95; perspektif detay', () => {
  const L = corlu(), Y = EL.yuk(L, { div: 70, L: 100 }), P = EL.panoDuzen(L, Y);
  assert.deepStrictEqual(P.raylar.map(r => r.map(m => m.kod)), [['Q0', 'F0', 'P0', 'H1'], ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7']]); assert.strictEqual(P.mod[0].oz, '3x50A, C eğrisi, 10 kA'); assert(/30 mA/.test(P.mod[1].oz)); assert.strictEqual(P.mod.find(m => m.kod === 'F5').modul, 3);
  assert.deepStrictEqual([P.W, P.H, P.D], [310, 370, 95]); assert(P.raylar.every(r => r.reduce((s, m) => s + m.modul, 0) <= 12));
  const D = require('../app/el-detay.js'), g = D.detayPano(P, {}); assert(g.L.length > 100 && !g.L.some(l => l.slice(0, 4).some(v => !isFinite(v)))); assert(g.T.some(q => /KAÇAK AKIM/.test(q[3]))); assert(D.tabloSalt(P).T.some(q => q[3] === 'TARAK BARA'));
});
console.log(`\n${n} test geçti.`);

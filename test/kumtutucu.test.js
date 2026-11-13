/* Kum ve yağ tutucu — Çokal AAT T-103 (1-Çokal_AAT_Kaba-İnce-Giriş-Kum Yağ Tutucu_R3.dwg) plan ve G-G enine kesitiyle karşılaştırma.
   Çizimden okunan (cm): plan dış 1600 × 430; çıkış kanalı 150, göz 1140, dağıtma kanalı 150, duvarlar 40; gözler arası duvar 30.
   G-G (göz iç 160): yağ bölmesi 40 · ayırma kirişi 20 (97,20 – 97,75) · kum bölmesi 100; dolgu: yağ duvarında 96,79 → 96,19 (60 cm'de),
   kum oluğu üstü 70 / tabanı 50 cm, 95,69 – 96,19; kum duvarında 96,49; taban plağı üstü 95,05, altı 94,55; su 97,45; duvar üstü 99,15;
   orta duvar üstü 98,10 + 20 cm yürüme döşemesi (en 100) = 98,30; üst kum oluğu dış eni 60, tabanı 98,60, altı 98,40.
   Çalıştır: node test/kumtutucu.test.js */
'use strict';
const assert = require('assert');
const { geo, ekipmanYer, su, DEF } = require('../app/kumtutucu.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yakin = (a, b, msg, tol) => assert.ok(Math.abs(a - b) < (tol || 0.006), `${msg}: ${a} ≠ ${b}`);
const G = geo({});

t('Çokal T-103 planı: dış ölçü ve boyuna dizilim', () => {
  yakin(G.boy, 16.00, 'boy'); yakin(G.en, 4.30, 'en'); yakin(G.xD1 - G.xD0, 1.50, 'dağıtma kanalı'); yakin(G.xg1 - G.xg0, 11.40, 'göz boyu'); yakin(G.xC1 - G.xC0, 1.50, 'çıkış kanalı');
  assert.strictEqual(G.goz.length, 2); yakin(G.gz, 1.60, 'göz iç eni'); yakin(G.goz[1].y0 - G.goz[0].y1, 0.30, 'gözler arası duvar');
});

t('Çokal G-G: bölmeler aynalı, yağ bölmesi dış duvar tarafında', () => {
  const [a, b] = G.goz; assert.deepStrictEqual(a.yag.map(v => +v.toFixed(2)), [0.40, 0.80]); assert.deepStrictEqual(a.ayir.map(v => +v.toFixed(2)), [0.80, 1.00]); assert.deepStrictEqual(a.kum.map(v => +v.toFixed(2)), [1.00, 2.00]);
  assert.deepStrictEqual(b.yag.map(v => +v.toFixed(2)), [3.50, 3.90]); assert.deepStrictEqual(b.kum.map(v => +v.toFixed(2)), [2.30, 3.30]);
});

t('Çokal G-G: dolgu kesiti (kum oluğu ve 45° eğimler) ve kotlar', () => {
  const p = G.goz[0].prof.map(q => [+q[0].toFixed(2), +q[1].toFixed(2)]);
  assert.deepStrictEqual(p, [[0.40, 95.05], [2.00, 95.05], [2.00, 96.49], [1.70, 96.19], [1.60, 95.69], [1.10, 95.69], [1.00, 96.19], [0.40, 96.79]]);
  yakin(G.zt, 96.19, 'kum oluğu üstü'); yakin(G.zo, 95.69, 'kum oluğu dibi'); yakin(G.zr1, 95.05, 'taban plağı üstü'); yakin(G.zr0, 94.55, 'taban plağı altı');
  yakin(G.goz[0].yo, 1.35, 'kum oluğu ekseni'); yakin(G.goz[1].yo, 4.30 - 1.35, 'aynalı oluk ekseni');
});

t('Çokal G-G: orta yürüme yolu, ayırma kirişi, üst kum oluğu', () => {
  yakin(G.zmw, 98.10, 'orta duvar üstü'); yakin(G.zy, 98.30, 'yürüme yolu üstü'); const y = G.yol[0]; yakin(y.pts[2][1] - y.pts[0][1], 1.00, 'yürüme yolu eni'); yakin(y.ym, 2.15, 'yol ekseni');
  const k = G.kutu.find(x => x.k === 'kiris'); yakin(k.z0, 97.20, 'kiriş altı'); yakin(k.z1, 97.75, 'kiriş üstü');
  yakin(G.ustOluk.w, 0.60, 'üst oluk dış eni'); yakin(G.ustOluk.zf, 98.60, 'üst oluk tabanı'); yakin(G.ustOluk.zb, 98.40, 'üst oluk altı');
});

t('kapak, savak ve ekipman: göz başına bir kapak ve savak; köprü dış duvar eksenleri arasında', () => {
  assert.strictEqual(G.kapak.length, 2); assert.strictEqual(G.savak.length, 2); yakin(G.kapak[0].y, 1.50, 'kapak kum bölmesi ekseninde'); yakin(G.kapak[0].z0, 97.15, 'kapak eşiği');
  const E = ekipmanYer(G), kp = E.find(x => x.tur === 'kopru'); yakin(kp.Ls, 3.90, 'ray açıklığı'); yakin(kp.Hp, 99.15 - 95.69, 'emme derinliği'); yakin(kp.ap, 1.60, 'pompa aralığı = oluk eksenleri arası');
  assert.strictEqual(E.filter(x => x.tur === 'penstok').length, 2); assert.strictEqual(E.filter(x => x.tur === 'konteyner').length, 3); assert.strictEqual(E.filter(x => x.tur === 'korkuluk').length, 4); assert.strictEqual(E.filter(x => x.tur === 'merdiven').length, 1); yakin(kp.hk, 0.35, 'köprü yükseltmesi (korkuluk üstünden 10 cm)');
  assert.strictEqual(su(G).length, 4);
});

t('üç gözlü: en ve yürüme yolları; eski kayıtlarda eksik parametre varsayılandan', () => {
  const H = geo({ N: 3 }); yakin(H.en, 3 * 1.60 + 2 * 0.30 + 0.80, 'en'); assert.strictEqual(H.yol.length, 2); assert.strictEqual(H.goz[2].alt, true);
  const J = geo({ N: 2, b: 1.2 }); yakin(J.q.ho, DEF.ho, 'varsayılan oluk derinliği'); yakin(J.ek, 0.50, 'kum tarafı eğim yükselmesi');
});
console.log(n + ' test geçti');

t('Çokal H-H: çıkış kanalı derin, savak kum bölmesi ekseninde, sahanlık ve raylar', () => {
  yakin(G.zcs, 93.45, 'çıkış kanalı taban plağı üstü'); yakin(G.zcf, 93.65, 'dolgu üstü'); yakin(G.tabanC.z0, 92.95, 'çıkış kanalı temel altı');
  yakin(G.savak[0].B, 0.90, 'savak eni'); yakin(G.savak[0].z, 97.35, 'savak kreti'); yakin(G.savak[0].y, 1.50, 'savak kum bölmesi ekseninde');
  yakin(G.sahanlik.z1, 98.30, 'sahanlık üstü'); assert.strictEqual(G.ray.length, 2); yakin(G.ray[0].y, 0.20, 'ray dış duvar ekseninde'); yakin(G.ray[1].y, 4.10, 'ray');
  const c = G.boru.find(b => b.k === 'cikis'); yakin(c.z0, 93.65, 'çıkış borusu alt kotu'); assert.deepStrictEqual(c.yon, [0, -1]);
  assert.strictEqual(G.boru.filter(b => b.k.startsWith('yag')).length, 2); yakin(G.boru.find(b => b.k === 'yag-0').z0, 97.00, 'yağ borusu alt kotu'); assert.strictEqual(G.rampa.length, 2);
});
console.log(n + ' test geçti (toplam)');

t('Çokal planı: kiriş altı kolonlar, paslanmaz lamel panelleri, merdiven, su tutucu bant', () => {
  assert.strictEqual(G.kolon.length, 4, 'göz başına 2 kolon'); const k = G.kolon[0]; yakin(k.pts[1][0] - k.pts[0][0], 0.40, 'kolon boyu'); yakin(k.pts[2][1] - k.pts[0][1], 0.20, 'kolon eni = ayırma kirişi'); yakin(k.z0, 96.19, 'kolon altı'); yakin(k.z1, 97.20, 'kolon üstü = kiriş altı');
  const lm = G.lamel.filter(l => l.i === 0); assert.strictEqual(lm.length, 3, 'göz başına 3 lamel paneli'); yakin(lm[0].z1, 97.20, 'lamel üstü'); yakin(lm[0].z0, 96.57, 'lamel altı'); yakin(lm[0].y0, 1.00, 'lamel kum bölmesi yüzünde');
  const E = ekipmanYer(G); yakin(E.find(x => x.tur === 'penstok').p[0], G.xD1 - 0.07, 'penstok duvar yüzünde');
  const m = E.find(x => x.tur === 'merdiven'); yakin(m.pts[1][0], G.xg1, 'merdiven sahanlık başında biter'); yakin(m.usL, G.boy - G.xg1, 'üst sahanlık boyu'); yakin(m.pts[0][1], G.en + 0.50, 'merdiven duvara paralel');
  const b = G.bantlar.find(x => x.anahtar === 'cikis'); yakin(b.z, 93.55, 'derin çıkış kanalında su tutucu bant');
});

/* Çokal I-I kesiti ve planı (cm): yağ kanalı iç 40 × 60 (çıkış duvarından), tabanı 97,00, taban 20 (96,80), iç yan duvar 20 (ayırma kirişinin devamı, 96,80 → 97,75),
   uç duvar 20 (üstü 97,60), önünde 40 cm paslanmaz sıyırma rampası (97,00 → 97,60); SA DN150 SS304L BTK 97,00 dış duvardan, 0,40 dışarıda dirsekle konteynere; duvarda 0,52 konsol (96,73) */
t('Çokal I-I: yağ toplama kanalı, sıyırma rampası, yağ borusu ve konsol mesnedi', () => {
  const k = G.yagKanal[0]; yakin(k.x1 - k.x0, 0.60, 'kanal iç boyu'); yakin(G.xg1 - k.x0, 0.60, 'çıkış duvarından'); yakin(k.y1 - k.y0, 0.40, 'kanal iç eni = yağ bölmesi'); yakin(k.zt, 97.00, 'kanal tabanı'); yakin(k.zb, 96.80, 'taban altı'); yakin(k.zu, 97.60, 'uç duvar üstü'); yakin(k.x0 - k.xu, 0.20, 'uç duvar kalınlığı');
  const yan = G.kutu.find(x => x.k === 'yag-yan'); yakin(yan.z0, 97.00, 'iç yan duvar altı (taban üstü)'); yakin(yan.z1, 97.20, 'iç yan duvar kiriş altına'); yakin(yan.pts[2][1] - yan.pts[0][1], 0.20, 'iç yan duvar = kiriş eni');
  const tb = G.kutu.find(x => x.k === 'yag-taban'); yakin(tb.pts[2][1] - tb.pts[0][1], 0.60, 'taban eni (yağ + kiriş)'); yakin(tb.pts[2][0] - tb.pts[0][0], 0.80, 'taban boyu (kanal + uç duvar)');
  const r = G.rampa[0]; yakin(r.b[0] - r.a[0], 0.40, 'rampa boyu'); yakin(r.a[1], 97.00, 'rampa alt ucu'); yakin(r.b[1], 97.60, 'rampa üstü = uç duvar üstü'); yakin(r.b[0], k.xu, 'rampa uç duvara dayanır');
  assert.ok(!G.cukur, 'eski 40 × 40 paslanmaz çukur kalktı');
  const yb = G.boru.find(b => b.k === 'yag-0'); yakin(yb.p[0], (k.x0 + k.x1) / 2, 'yağ borusu kanal ortasında'); yakin(yb.z0, 97.00, 'yağ borusu BTK'); assert.strictEqual(yb.dn, 150); yakin(yb.od, 0.1683, 'DN150 dış çapı');
  const E = ekipmanYer(G), bp = E.find(x => x.anahtar === 'boru-yag-1'); assert.strictEqual(bp.etiket, 'SA DN150 SS304L'); yakin(bp.pts[1][1] - G.en, 0.40, 'dirsek dış yüzden 0,40'); yakin(bp.pts[0][2], bp.pts[1][2], 'yatay çıkış'); assert.ok(bp.pts[2][2] < bp.pts[1][2], 'konteynere iner');
  const ks = E.find(x => x.anahtar === 'mesk-yag-1'); assert.strictEqual(ks.tip, 'KONSOL'); yakin(ks.Lk, 0.52, 'konsol boyu'); yakin(ks.z, 96.73, 'konsol kotu');
});

t('duvar geçiş parçaları: giriş, çıkış ve yağ boruları yuvarlak delikte DGP ile kapanır', () => {
  const E = ekipmanYer(G), D = E.filter(x => x.tur === 'dgp'); assert.strictEqual(D.length, 4, '2 yağ + giriş + çıkış');
  for (const b of G.boru) { const d = D.find(x => x.anahtar === 'dgp-' + b.k); yakin(d.z, b.z, 'DGP boru ekseninde'); yakin(d.Lw, 0.40, 'duvar kalınlığı'); yakin(d.D, b.od, 'DGP çapı = boru dış çapı');
    assert.ok(E.find(x => x.anahtar === 'boru-' + b.k), 'duvardan geçen boru parçası: ' + b.k); }
  const dl = G.kes.filter(k => k.k === 'boru'); assert.strictEqual(dl.length, 3, 'göz gövdesinde 3 boru deliği'); assert.ok(dl.every(k => k.poly.length === 20 && Math.abs(k.d[1]) > 0.4), 'yuvarlak, duvarı boydan geçen delik');
  assert.strictEqual(G.boru.find(b => b.k === 'giris').cins, 'pe'); assert.strictEqual(G.boru.find(b => b.k === 'cikis').dn, 315, 'çıkış Ø315 HDPE (Çokal: WW DN315 HDPE PN10)');
});

/* Çokal F-F (cm): başlık CA DN50 SS304L (plan ve E-E etiketi; F-F'de yalnız "CA DN50 SS304" yazıyor — çizimde tutarsız, kullanıcıya soruldu) yürüme yolu üstünde mesnette, ekseni duvar yüzünden 20, 98,517 (BTK 98,49); yatay kol 26,6, iniş yürüme yolu kenarından 11,6 dışarıda,
   97,925'te 45° kırılır (43), duvar yüzünden 3,6'da düşey, difüzör ekseni 96,50. Alt plan: göz başına 4 difüzör takımı, 2,75 aralık, uçlarda 1,375; takım 2,05 m. */
t('Çokal F-F: hava başlığı yürüme yolunda, düşümler, vanalar ve difüzör takımları', () => {
  const C2 = geo({ L: 11.0 }); // Çokal göz boyu (plan: 40 + 150 + 40 + 1100 + 40 + 150 + 40 = 1560)
  const d0 = C2.dusum.filter(d => d.i === 0); assert.strictEqual(d0.length, 4, 'göz başına 4 düşüm'); yakin(d0[0].p[0] - C2.xg0, 1.375, 'ilk düşüm göz başından'); yakin(d0[1].p[0] - d0[0].p[0], 2.75, 'düşüm aralığı'); yakin(C2.xg1 - d0[3].p[0], 1.375, 'son düşüm göz sonundan');
  const d = d0[0]; yakin(d.zh, 98.517, 'başlık ekseni'); yakin(d.zd, 96.50, 'difüzör ekseni'); yakin(d.a, 0.266, 'yatay kol'); yakin(d.h1, 0.592, '45° kırılmaya düz iniş'); yakin(d.j, 0.43, '45° kayma'); yakin(d.xw, -0.20, 'duvar yüzü başlıktan');
  yakin(Math.abs(d.p[1] - C2.goz[0].y1), 0.20, 'başlık duvar yüzünden 0,20'); assert.strictEqual(d.s, -1, 'göz 1 düşümü −y yönünde'); assert.strictEqual(C2.dusum.find(x => x.i === 1).s, 1);
  yakin(d.zh - d.h1 - d.j, 97.495, 'duvar yüzündeki düşey parçanın başı');
  const h = C2.hat.find(x => x.k === 'hava-0'); assert.strictEqual(h.dn, 50); yakin(h.pts[0][1], -0.875, 'besleme oluk dışında yükselir'); yakin(h.pts[1][2], 99.33, 'duvar üstünde BTK 99,30'); yakin(h.pts[h.pts.length - 1][2], 98.517, 'başlık kotu');
  yakin(h.pts[0][0], C2.xg0 - 0.15, 'besleme 1 dağıtma–göz duvarında'); yakin(C2.hat.find(x => x.k === 'hava-1').pts[0][0], C2.xg0 - 0.25, 'besleme 2 yanında (0,10 ara)');
  const ms = C2.mesnet.filter(m => m.anahtar.startsWith('mes-0-')); assert.ok(ms.length >= 5 && ms.every(m => Math.abs(m.z - 98.30) < 1e-6 && Math.abs(m.H - 0.187) < 1e-6), 'başlık mesnetleri yürüme yolunda, 0,187');
  assert.ok(C2.mesnet.filter(m => m.anahtar.startsWith('mesb-0-')).every(m => Math.abs(m.z - 99.15) < 1e-6), 'besleme mesnetleri duvar üstünde');
  const E = ekipmanYer(C2), du = E.filter(x => x.tur === 'dusum'); assert.strictEqual(du.length, 8); assert.strictEqual(du[0].aci, 180); assert.strictEqual(E.find(x => x.anahtar === 'boru-hava-0').etiket, 'CA DN50 SS304L');
  const G1 = geo({ N: 1 }), d1 = G1.dusum[0]; yakin(d1.zh, 99.15 + 0.15 + 0.03015, 'tek gözde başlık dış duvar üstünde'); yakin(d1.j, 0, 'kırılmasız iniş'); yakin(d1.xw, 0.20, 'duvar yüzü başlığın göz tarafında');
});

t('Çokal plan / F-F: kum seperatörü yapıya paralel, hazne dağıtma tarafında, vida çıkışa doğru', () => {
  const C2 = geo({ L: 11.0 }), E = ekipmanYer(C2), s = E.find(x => x.tur === 'seperator'); assert.strictEqual(s.aci, -90, 'aile x (vida) yerel +x');
  yakin(s.p[0] - s.L / 2, C2.xg0 + 0.62, 'hazne başı (Çokal 2,92)'); yakin(s.p[0] + s.L / 2, 7.37, 'vida ucu (Çokal 7,37)'); yakin(s.p[1], -0.875, 'eksen oluk dışında');
  const kk = E.find(x => x.anahtar === 'kont-kum'); yakin(kk.p[0], 7.68, 'kum konteyneri vida ucunda (Çokal 7,42–7,95)');
  const ki = C2.hat.find(x => x.k === 'kum-inis'); yakin(ki.pts[0][2], C2.ustOluk.zf, 'oluk tabanından'); yakin(ki.pts[1][2], 97.53, 'BTK 97,45 (DN150)'); assert.strictEqual(ki.kod, 'DR');
});

/* eski düzende kaydedilmiş çizim (ekSurum yok): açılışta bir kez yenilenir; yenilendikten sonra yalnız değişince */
t('eski kayıt: ekipman düzeni sürümü tutmayınca bir kez yenilenir', () => {
  const { ekKarar, EK_SURUM } = require('../app/kumtutucu.js');
  const eski = { type: 'kumtutucu', ekipman: true, da: 1.5, rL: 0.6, yc: 0.8, yB: 0.4, xs: 0.37, ekAnahtar: ['pen-0', 'dusum-0-6'] }; // f82b848 / 38ba0f4 öncesi kayıt biçimi
  assert.strictEqual(ekKarar(eski, 'k'), 'surum', 'eski kayıt yenilenir (_ekK boş olsa da)');
  const yeni = Object.assign({}, eski, { ekSurum: EK_SURUM }); assert.strictEqual(ekKarar(yeni, 'k'), 'ilk'); yeni._ekK = 'k'; assert.strictEqual(ekKarar(yeni, 'k'), null); assert.strictEqual(ekKarar(yeni, 'k2'), 'degisti');
  assert.strictEqual(ekKarar({ type: 'kumtutucu', ekipman: false }, 'k'), null, 'ekipmansız çizim kendiliğinden ekipman almaz');
  const Ge = geo(eski); assert.strictEqual(Ge.dusum.length, 8, 'eski da = 1,50 okunmaz: göz başına L / 2,75'); assert.ok(Ge.yagKanal.length === 2 && !Ge.cukur);
});

t('ray ayrı ekipman; grobeton dolgular işaretli; merdiven üst sahanlığı korkuluklu', () => {
  const E = ekipmanYer(G), R = E.filter(x => x.tur === 'ray'); assert.strictEqual(R.length, 2); yakin(R[0].L, G.xg1 - 0.15, 'ray boyu'); yakin(R[0].z, 99.15, 'duvar üstünde');
  assert.deepStrictEqual(G.kutu.filter(k => k.gro).map(k => k.k), ['dagitma-dolgu', 'cikis-dolgu']);
  const k2 = E.find(x => x.anahtar === 'korkuluk-sah-2'), son = k2.pts[k2.pts.length - 1]; yakin(son[1], G.en + 1.00 - 0.05, 'üst sahanlığın dış kenarı'); yakin(son[0], G.xg1, 'merdiven korkuluğuna bağlanır'); yakin(k2.pts[2][0], G.boy - 0.05, 'sahanlık ucu');
});
console.log(n + ' test geçti (son)');

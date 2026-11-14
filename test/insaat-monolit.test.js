/* Monolitik görünüm (app/insaat-monolit.js) — Konya İsale Terfi Merkezi modelinin sayılarıyla (araclar/konya-terfi-uret.js).
   1) Pencereli tuğla cephe duvarı tek kütle: parçalar arasındaki iç yüzler üretilmez, yalnız söveler (pencere yanları) açıkta kalır.
   2) Çatı döşemesi (+5,24, 15 cm) altındaki 50×80 enine ve 30×50 boyuna kirişler, galeri döşemesi (DÖ04) altındaki 40×50 yürüme yolu kirişleri ve 30×50 merdiven boşluğu kenar kirişi
      döşemeyle tek parça sayılır; kirişin görünen üstü döşeme altında biter, boşluk kenarıyla aynı hizadaki kiriş yüzü bulunur.
   3) Veri ayrı kalır: statik modele çevirme kirişleri ve döşemeleri ayrı eleman olarak okur.
   Çalıştır: node test/insaat-monolit.test.js */
'use strict';
const assert = require('assert'), path = require('path');
globalThis.C = globalThis.C || {};
require(path.join(__dirname, '../app/insaat-monolit.js'));
const MN = globalThis.C.insMono, U = require('../araclar/konya-terfi-uret.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yak = (a, b, e) => assert.ok(Math.abs(a - b) <= (e || 1e-6), `${a} ≉ ${b}`);
const { doc } = U.uret(), E = doc.ents, byAd = ad => E.find(e => e.ad === ad);

t('aralık yardımcıları', () => {
  assert.deepStrictEqual(MN.cikar(0, 10, [[2, 3], [2.5, 4], [9, 12]]), [[0, 2], [4, 9]]);
  assert.deepStrictEqual(MN.kesisim([[0, 5]], [[1, 2], [4, 8]]), [[1, 2], [4, 5]]);
  assert.deepStrictEqual(MN.parcaCikar([0, 0], [10, 0], [[[2, 0], [3, 0]], [[5, 1], [6, 1]]]).map(s => [s[0][0], s[1][0]]), [[0, 2], [3, 10]]);
});

/* insaat.js perdeMesh ile aynı boşluk listesi: pencere [s ± w/2] × [z0 + par, + hh], kolon tam boy, lento (kâgir duvar) 10 cm taşar, yükseklik = duvar kalınlığı */
const bosluklar = (duvar, L) => {
  const z0 = duvar.z0, h = duvar.h, my = [];
  for (const o of E.filter(o => o.type === 'acik' && o.host === duvar.id)) {
    const w = o.w, za = z0 + (o.kind === 'kapi' ? 0 : o.par), zb = Math.min(z0 + h - 0.01, za + o.hh);
    my.push({ s0: o.s - w / 2, s1: o.s + w / 2, za, zb, o });
    if (o.lento !== false) { const lza = z0 + (o.kind === 'kapi' ? 0 : o.par) + o.hh; my.push({ s0: Math.max(0, o.s - w / 2 - o.lb), s1: Math.min(L, o.s + w / 2 + o.lb), za: lza, zb: Math.min(z0 + h, lza + 0.2), o: { kind: 'lento' } }); }
  }
  for (const x of U.OLCU.kolonX) my.push({ s0: x / 100, s1: x / 100 + 0.5, za: z0, zb: z0 + h, o: { kind: 'kolon' } });
  return my.sort((a, b) => a.s0 - b.s0);
};

t('cephe duvarı B (20 cm tuğla, 14 pencere, 5 kolon): duvar tek kütle — iç yüz yok, yalnız söveler açık', () => {
  const d = byAd('Cephe duvarı B'), L = 19.7, my = bosluklar(d, L), R = MN.duvarParca(L, d.z0, d.h, my);
  const pencereler = my.filter(q => q.o.kind === 'pencere');
  assert.strictEqual(pencereler.length, 14);                                                     // 9 alt sıra + 2 kumanda odası + 3 üst sıra
  // her pencerenin iki yanında açık kalan uç yüzü tam pencere yüksekliğinde (söve), başka açık uç yüzü yok (kolon yüzleri hariç)
  const acik = [];
  for (const pc of R.pieces) for (const [x, iv] of [[pc.sa, pc.bas], [pc.sb, pc.son]]) if (x != null && iv && iv.length) for (const z of iv) acik.push({ x: +x.toFixed(3), z });
  const kolonYuz = new Set(my.filter(q => q.o.kind === 'kolon').flatMap(q => [+q.s0.toFixed(3), +q.s1.toFixed(3)]));
  const sove = acik.filter(a => !kolonYuz.has(a.x));
  assert.strictEqual(sove.length, 2 * pencereler.length);
  for (const p of pencereler) for (const x of [p.s0, p.s1]) { const s = sove.filter(a => Math.abs(a.x - x) < 1e-3); assert.strictEqual(s.length, 1, 'söve ' + x); yak(s[0].z[0], p.za, 1e-6); yak(s[0].z[1], p.zb, 1e-6); }
  // eskiden her şerit sınırında tam yükseklik uç yüzü vardı (kesitte duvar parça parça): artık hiçbir iç uç yüzü duvar boyunca uzanmıyor
  assert.ok(!sove.some(a => a.z[1] - a.z[0] > 1.6));
  // lento: önü / arkası duvar yüzü, altı yalnız pencerenin üstünde (70 cm), üstü ve uçları duvarın içinde
  const lt = R.lentolar.filter(l => l.alt.length); assert.strictEqual(lt.length, 11);
  for (const l of lt) { yak(l.alt[0][1] - l.alt[0][0], 0.70, 1e-6); assert.ok(!l.ust && !l.bas && !l.son); }
  // lentoya oturan / lentoyu taşıyan parçaların o yüzü çizilmez
  assert.ok(R.pieces.some(pc => !pc.ust) && R.pieces.some(pc => !pc.alt));
});

const kirisB = k => { const a = k.a, b = k.b, Lb = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / Lb, (b[1] - a[1]) / Lb]; return { a, u, nn: [-u[1], u[0]], w: k.bw / 2, Lb, zt: k.zt, zb: k.zt - k.hb }; };
const dosD = p => { let poly = p.pts.map(q => [q[0], q[1]]); const ar = poly.reduce((s, q, i) => { const r = poly[(i + 1) % poly.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0); if (ar < 0) poly = poly.reverse(); return { poly, zt: p.zt, za: p.zt - p.t }; };

t('çatı döşemesi (DÖ03, 15 cm) + 50×80 enine / 30×50 boyuna kirişler: tek parça, kiriş üstü döşeme altında (+5,09), kenarlar döşemenin içinde', () => {
  const D = dosD(byAd('Çatı döşemesi')); yak(D.zt, U.z(210.91)); yak(D.za, U.z(210.91) - 0.15);
  const kir = E.filter(k => k.type === 'kiris' && Math.abs(k.zt - D.zt) < 1e-6); assert.strictEqual(kir.length, 7);
  for (const k of kir) {
    const r = MN.kirisDoseme(kirisB(k), D); assert.ok(r, 'kiriş döşemeyle tek parça');
    assert.ok(r.ust); yak(r.zc, D.za); assert.strictEqual(r.ivs.length, 1); yak(r.ivs[0][0], 0); yak(r.ivs[0][1], kirisB(k).Lb);
    assert.strictEqual(r.kenar.length, 0); assert.strictEqual(r.uc.length, 0);                    // döşeme dış yüzden 50 cm taşar: kiriş yüzleri hep döşeme altında
  }
  const enine = kir.filter(k => k.bw === 0.5); assert.strictEqual(enine.length, 5); yak(enine[0].hb, 0.80, 1e-9);
  const boy = kir.filter(k => k.bw === 0.3); assert.strictEqual(boy.length, 2); yak(boy[0].hb, 0.50, 1e-9);
});

t('galeri döşemesi (DÖ04) + yürüme yolu kirişleri: tek parça; vinç boşluğu kenarındaki kiriş yüzü boşluk kenarıyla aynı hizada', () => {
  const G = byAd('Galeri döşemesi'), D = dosD(G);
  const kir = E.filter(k => k.type === 'kiris' && Math.abs(k.zt - G.zt) < 1e-6); assert.strictEqual(kir.length, 8);                  // 6 yürüme yolu + bölme duvarı altı + merdiven boşluğu kenar kirişi
  for (const k of kir) assert.ok(MN.kirisDoseme(kirisB(k), D), 'yürüme yolu kirişi döşemeyle tek parça');
  // y = 5,40 ekseninde 40 cm kiriş: alt yüzü (y 5,20) x 13,75 … 17,30 arasında boşluk kenarıyla aynı hizada, 17,30'dan sonra döşeme iki yanda
  const k = kir.find(q => Math.abs(q.a[1] - 5.4) < 1e-6 && Math.abs(q.b[1] - 5.4) < 1e-6), B = kirisB(k), r = MN.kirisDoseme(B, D);
  const ky = r.kenar.map(q => ({ x0: B.a[0] + B.u[0] * q.s0, x1: B.a[0] + B.u[0] * q.s1, y: B.a[1] + B.nn[1] * q.yan * B.w }));
  assert.strictEqual(ky.length, 1); yak(ky[0].y, 5.20, 1e-9); yak(Math.min(ky[0].x0, ky[0].x1), 13.75, 1e-3); yak(Math.max(ky[0].x0, ky[0].x1), 17.30, 1e-3);
  // merdiven boşluğu kenar kirişi 30/50 (x 14,66 ekseni, y 5,40 → 8,00): dış yüzü (x 14,81) boşluk kenarıyla aynı hizada y 6,45 … 7,70 arasında, A perdesi iç yüzünde
  // (y 7,70) döşeme biter, kirişin geri kalanı perdenin içinde; kiriş döşemeyle tek parça (ayrı çizgi yok)
  const m = kir.find(q => q.ad === 'Merdiven boşluğu kenar kirişi'), Bm = kirisB(m), rm = MN.kirisDoseme(Bm, D);
  assert.ok(rm && rm.ust); yak(rm.zc, D.za); assert.strictEqual(rm.kenar.length, 1); yak(Bm.a[0] + Bm.nn[0] * rm.kenar[0].yan * Bm.w, 14.81, 1e-9);
  yak(Bm.a[1] + rm.kenar[0].s0, 6.45, 1e-9); yak(Bm.a[1] + rm.kenar[0].s1, 7.70, 1e-9); yak(m.zt - m.hb, U.z(204.91), 1e-9);
});

t('döşemenin dışındaki / başka kottaki kiriş tek parça sayılmaz', () => {
  const D = dosD(byAd('Çatı döşemesi'));
  assert.strictEqual(MN.kirisDoseme({ a: [30, 0], u: [1, 0], nn: [0, 1], w: 0.15, Lb: 5, zt: D.zt, zb: D.zt - 0.5 }, D), null);
  assert.strictEqual(MN.kirisDoseme({ a: [2, 2], u: [1, 0], nn: [0, 1], w: 0.15, Lb: 5, zt: D.zt - 1, zb: D.zt - 1.5 }, D), null);
});

t('veri ayrı: statik modele çevirme 15 kirişi ve döşemeleri ayrı eleman olarak okur', () => {
  let O; try { O = require('./statik-ortam.js'); } catch (er) { console.log('  (statik ortamı yüklenemedi: ' + er.message + ')'); return; }
  const d = O.modelCevir(doc).d; assert.ok(d && d.cerceve);
  assert.strictEqual(d.cerceve.kirisler.length, E.filter(e => e.type === 'kiris').length);
  assert.ok(d.cerceve.dosemeler.length >= 2);
  assert.strictEqual(E.filter(e => e.type === 'kiris').length, 15); assert.ok(E.some(e => e.type === 'plak' && e.ad === 'Çatı döşemesi'));
});

console.log(`insaat-monolit: ${n} test geçti`);

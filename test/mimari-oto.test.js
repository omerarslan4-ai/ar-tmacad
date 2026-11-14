/* Mimari otomatik içerik (app/mimari-oto.js) — Konya terfi merkezi sayılarıyla (kaynak: test-proje/konya/Konyaİsale_Terfi_mim+mek.dwg
   ve araclar/konya-terfi-uret.js) ve Çokal R2 ölçüleriyle (10-İdari Bina_R2 kat planı).
   Çalıştır: node test/mimari-oto.test.js */
'use strict';
const assert = require('assert');
const A = require('../app/mimari-oto.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

/* Konya: cephe pencereleri 70/150 (parapet 100), üst sıra 300/60, kumanda odasının cephesinde 70/150; giriş cephesinde K1 100/250 çelik,
   SEK1 300/470 seksiyonel; kumanda odası bölme duvarında K2 130/250 çift kanat ve 210/150 pencere. */
const KONYA_ACIK = [];
let id = 1;
for (const x of [5.8, 7, 8.2, 10.3, 11.5, 12.7, 15.4, 16.6, 17.8]) for (const yz of ['B', 'A']) KONYA_ACIK.push({ id: id++, kind: 'pencere', w: 0.7, h: 1.5, par: 1, duvar: yz, x });
for (const x of [1.9, 3.25]) KONYA_ACIK.push({ id: id++, kind: 'pencere', w: 0.7, h: 1.5, par: 1, duvar: 'B', x });
for (const yz of ['B', 'A']) KONYA_ACIK.push({ id: id++, kind: 'pencere', w: 3, h: 0.6, par: 4.4, duvar: yz, x: 7 });
KONYA_ACIK.push({ id: 75, kind: 'pencere', w: 2.1, h: 1.5, par: 1, bolme: true }, { id: 73, kind: 'pencere', w: 0.7, h: 1.5, par: 1, giris: true }); // kumanda odası bölme duvarında 210/150 (DWG'de P5), giriş cephesinde 70/150
KONYA_ACIK.push({ id: 71, kind: 'kapi', kTip: 'C', w: 1, h: 2.5, par: 0, kanat: 1 }, { id: 72, kind: 'kapi', kTip: 'S', w: 3, h: 4.7, par: 0 }, { id: 74, kind: 'kapi', kTip: 'C', w: 1.3, h: 2.5, par: 0, kanat: 2 });

t('tip numarası: Konya — P1 70/150, P2 210/150, P3 300/60, K1 100/250, K2 130/250, SEK1 300/470; aynı ebat aynı numara', () => {
  const { tipler, kodOf } = A.tipNumaralari(KONYA_ACIK);
  assert.deepStrictEqual(tipler.map(q => q.etiket), ['P1 70/150', 'P2 210/150', 'P3 300/60', 'K1 100/250', 'K2 130/250', 'SEK1 300/470']);
  const P1 = tipler[0]; assert.strictEqual(P1.adet, 21); assert.strictEqual(P1.parapet, 100); assert.strictEqual(P1.tur, 'PENCERE'); assert.strictEqual(P1.malzeme, 'ALÜMİNYUM');
  assert.strictEqual(tipler[2].adet, 2); assert.strictEqual(tipler[2].parapet, 440);
  assert.strictEqual(kodOf[71], 'K1'); assert.strictEqual(kodOf[74], 'K2'); assert.strictEqual(kodOf[72], 'SEK1');
  assert.strictEqual(tipler.find(q => q.kod === 'K2').kanat, 2); assert.strictEqual(tipler.find(q => q.kod === 'K1').malzeme, 'ÇELİK');
  assert.strictEqual(tipler.find(q => q.kod === 'SEK1').baslik, 'SEK1 300/470 SEKSİYONEL KAPI');
  assert.strictEqual(P1.baslik, 'P1 70/150 ALÜMİNYUM PENCERE'); // Çokal detay başlığı biçimi: "P1 150/130 ALÜMİNYUM PENCERE"
});

t('tip numarası: Çokal İdari — 150/130, 200/130, 80/130, 50/50 pencere dört ayrı tip; ebat sırası genişliğe göre', () => {
  const L = [[1.5, 1.3], [2, 1.3], [0.8, 1.3], [0.5, 0.5], [1.5, 1.3]].map((q, i) => ({ id: i, kind: 'pencere', w: q[0], h: q[1] }));
  const { tipler, kodOf } = A.tipNumaralari(L);
  assert.deepStrictEqual(tipler.map(q => q.etiket), ['P1 50/50', 'P2 80/130', 'P3 150/130', 'P4 200/130']);
  assert.strictEqual(kodOf[0], kodOf[4]);
});

t('aks: Konya kolon merkezlerinden 1…5 (450 / 450 / 450 / 570) ve A / B (750); A üstte', () => {
  const kol = []; for (const x of [0.25, 4.75, 9.25, 13.75, 19.45]) for (const y of [0.25, 7.75]) kol.push([x, y]);
  const r = A.aksTuret({ kolonlar: kol, perdeler: [{ a: [0, 0.05], b: [19.7, 0.05] }, { a: [0.2, 0.3], b: [0.2, 7.7] }] });
  assert.deepStrictEqual(r.xs, [0.25, 4.75, 9.25, 13.75, 19.45]); assert.deepStrictEqual(r.ys, [0.25, 7.75]);
  const e = A.aksEtiketleri(r.xs, r.ys); assert.deepStrictEqual(e.x, ['1', '2', '3', '4', '5']); assert.deepStrictEqual(e.y, ['B', 'A']);
  // kolonsuz yapı: perde eksenleri
  const p = A.aksTuret({ perdeler: [{ a: [0, 0], b: [10, 0] }, { a: [0, 6], b: [10, 6] }, { a: [0, 0], b: [0, 6] }, { a: [10, 0], b: [10, 6] }, { a: [5, 0], b: [5, 1] }] });
  assert.deepStrictEqual(p.xs, [0, 10]); assert.deepStrictEqual(p.ys, [0, 6]);
});

t('plan ölçü sıraları: Çokal İdari düzeni — doğrama, aks, toplam; 5 mm arayla; balon en dış sıranın 11 mm dışında', () => {
  // İdari bina planı alt kenarı: aks zinciri 110 480 425 425 220 425 480 110 (toplam 2675 cm)
  const xs = [1.1, 5.9, 10.15, 14.4, 16.6, 20.85, 25.65], bb = [0, 0, 26.75, 10];
  const r = A.planOlcuSiralari({ bb, xs, ys: [], bosluk: { ALT: [[1.0, 2.5], [4.3, 5.8]] }, ilk: 14, sira: 5, balon: 11 });
  const alt = r.siralar.filter(s => s.kenar === 'ALT');
  assert.deepStrictEqual(alt.map(s => s.tur), ['dograma', 'aks', 'toplam']); assert.deepStrictEqual(alt.map(s => s.mm), [14, 19, 24]);
  const aks = alt[1].noktalar, ara = aks.slice(1).map((v, i) => Math.round((v - aks[i]) * 100));
  assert.deepStrictEqual(ara, [110, 480, 425, 425, 220, 425, 480, 110]);
  assert.strictEqual(r.balonMm.ALT, 35);
  const ust = r.siralar.filter(s => s.kenar === 'UST'); assert.deepStrictEqual(ust.map(s => s.tur), ['aks', 'toplam']); // doğrama yoksa o sıra yok
  assert.strictEqual(r.balonMm.UST, 30);
  const sol = r.siralar.filter(s => s.kenar === 'SOL'); assert.deepStrictEqual(sol.map(s => s.tur), ['toplam']);
});

/* Konya plan izleri (m): dış perdeler, giriş cephesi, kumanda odası bölme duvarı (x 3,7…3,9) */
const R = (a, b, c, d) => [[a, b], [c, b], [c, d], [a, d]];
const KONYA_ENGEL = [R(0, 0, 19.7, 0.3), R(0, 7.7, 19.7, 8), R(0, 0, 0.4, 8), R(19.3, 0, 19.7, 8), R(3.7, 0.3, 3.9, 7.7)];
for (const x of [0.25, 4.75, 9.25, 13.75, 19.45]) for (const y of [0.25, 7.75]) KONYA_ENGEL.push(R(x - 0.25, y - 0.25, x + 0.25, y + 0.25));

t('mahaller: Konya — montaj holü (≈114 m²) ve kumanda odası (≈24 m²); dışarısı mahal değil', () => {
  const M = A.mahalBul(KONYA_ENGEL, [0, 0, 19.7, 8], { h: 0.1 });
  assert.strictEqual(M.length, 2);
  assert.ok(Math.abs(M[0].alan - 15.4 * 7.4) < 2.5, 'hol alanı ' + M[0].alan); assert.ok(Math.abs(M[1].alan - 3.3 * 7.4) < 1.5, 'kumanda alanı ' + M[1].alan);
  assert.ok(M[1].bb[2] <= 3.75 && M[1].bb[0] >= 0.35, 'kumanda odası x 0,4…3,7');
});

t('kesit yerleri: Konya — A-A uzun (iki mahalden, kapıdan), B-B montaj holünden pencereden, C-C kumanda odasından; kolon / kiriş üstünde değil', () => {
  const M = A.mahalBul(KONYA_ENGEL, [0, 0, 19.7, 8], { h: 0.1 }).map((m, i) => Object.assign(m, { ad: i ? 'KUMANDA ODASI' : 'MONTAJ HOLÜ' }));
  const ac = []; for (const a of KONYA_ACIK) if (a.kind === 'pencere') ac.push(a.bolme ? { c: [3.8, 4.6], w: a.w, d: 'y' } : a.giris ? { c: [19.6, 6.26], w: a.w, d: 'y' } : { c: [a.x, a.duvar === 'B' ? 0.1 : 7.9], w: a.w, d: 'x' });
  ac.push({ c: [19.5, 1.2], w: 1, d: 'y' }, { c: [19.5, 4.05], w: 3, d: 'y' }, { c: [3.8, 1.25], w: 1.3, d: 'y' });
  const kolonlar = []; for (const x of [0.25, 4.75, 9.25, 13.75, 19.45]) for (const y of [0.25, 7.75]) kolonlar.push([x - 0.25, y - 0.25, x + 0.25, y + 0.25]);
  const kirisler = [0.25, 4.75, 9.25, 13.75, 19.45].map(x => ({ bb: [x - 0.25, 0, x + 0.25, 8], d: 'y' })).concat([{ bb: [3.5, 0.3, 3.9, 7.7], d: 'y' }, { bb: [0, 0, 19.7, 0.3], d: 'x' }, { bb: [0, 7.7, 19.7, 8], d: 'x' }, { bb: [17.3, 2, 19.5, 2.4], d: 'x' }, { bb: [13.75, 5.2, 19.5, 5.6], d: 'x' }]);
  const K = A.kesitYerleri({ bb: [0, 0, 19.7, 8], mahaller: M, aciklar: ac, kolonlar, kirisler });
  assert.deepStrictEqual(K.map(h => h.nm + ':' + h.tur), ['A:uzun', 'B:buyuk', 'C:oda']);
  const [AA, BB, CC] = K;
  assert.strictEqual(AA.d, 'x'); assert.deepStrictEqual(AA.mahaller.sort(), ['KUMANDA ODASI', 'MONTAJ HOLÜ']); assert.ok(AA.aciklar >= 1, 'A-A kapıdan geçer');
  assert.strictEqual(BB.d, 'y'); assert.deepStrictEqual(BB.mahaller, ['MONTAJ HOLÜ']); assert.ok(BB.aciklar >= 2, 'B-B iki cephedeki pencereden geçer');
  assert.strictEqual(CC.d, 'y'); assert.deepStrictEqual(CC.mahaller, ['KUMANDA ODASI']); assert.ok(CC.aciklar >= 1, 'C-C pencereden geçer');
  for (const h of K) { for (const k of kolonlar) { const lo = h.d === 'x' ? k[1] : k[0], hi = h.d === 'x' ? k[3] : k[2]; assert.ok(!(h.v > lo - 0.1 && h.v < hi + 0.1), `${h.nm} kolon üstünde`); }
    for (const k of kirisler) if (k.d === h.d) { const lo = h.d === 'x' ? k.bb[1] : k.bb[0], hi = h.d === 'x' ? k.bb[3] : k.bb[2]; assert.ok(!(h.v > lo - 0.1 && h.v < hi + 0.1), `${h.nm} kiriş üstünde`); } }
  assert.ok(AA.a[0] < 0 && AA.b[0] > 19.7, 'A-A yapıyı boydan boya keser');
});

t('kesit yerleri: dört oda dama düzeninde — hiçbir kesitte görünmeyen oda için ek kesit', () => {
  const M = [{ ad: 'HOL', bb: [0, 0, 10, 6], alan: 60 }, { ad: 'ODA1', bb: [10, 0, 12, 3], alan: 6 }, { ad: 'ODA2', bb: [12, 3, 14, 6], alan: 6 }, { ad: 'ODA3', bb: [14, 0, 16, 3], alan: 6 }, { ad: 'ODA4', bb: [14, 3, 16, 6], alan: 6 }];
  const K = A.kesitYerleri({ bb: [0, 0, 16, 6], mahaller: M });
  const gor = new Set(K.flatMap(h => h.mahaller)); for (const m of M) assert.ok(gor.has(m.ad), m.ad + ' görünmüyor');
  assert.ok(K.length >= 4 && K.some(h => h.tur === 'ek'), 'ek kesit');
});

t('görünüş: iç merdiven, bölme duvarı, ara döşeme çizilmez; dış perde, temeldeki kalın perdenin üstündeki ince cephe duvarı, pencere, kolon, çatı çizilir', () => {
  const g = [
    { id: 1, type: 'perde', bb: [0, 0, -6.8, 19.7, 0.3, -0.3] }, { id: 2, type: 'perde', bb: [0, 7.7, -6.8, 19.7, 8, -0.3] },
    { id: 3, type: 'perde', bb: [0, 0, -0.3, 19.7, 0.2, 4.7] }, { id: 4, type: 'kolon', bb: [0, 0, -6.8, 0.5, 0.5, 5.2] }, { id: 10, type: 'perde', bb: [0, 7.8, -0.3, 19.7, 8, 4.7] }, { id: 11, type: 'acik', bb: [5.45, 0, 0.7, 6.15, 0.2, 2.2] },
    { id: 5, type: 'merdiven', bb: [17, 2.4, -0.3, 19.2, 5, 3] }, { id: 6, type: 'perde', bb: [3.7, 0.3, -0.3, 3.9, 7.7, 5.1] },
    { id: 7, type: 'plak', bb: [13.8, 2.2, 3, 19.3, 7.5, 3.2] }, { id: 8, type: 'cati', bb: [-0.5, -0.5, 5.2, 20.2, 8.5, 7.3] }, { id: 9, type: 'plak', bb: [-0.5, -0.5, 5.1, 20.2, 8.5, 5.4] },
  ];
  const ic = A.icElemanlar(g);
  assert.deepStrictEqual([...ic].sort(), [5, 6, 7]);
});

t('ölçü çakışması: 5 mm arayla iki sıra çakışmaz, 2 mm arayla çakışır; zincirin komşu parçaları çakışmaz; kot yazısının üstü çakışır', () => {
  const o = (ad, a, b, p) => ({ ad, k: 'olcu', a, b, p, yazi: 2 });
  const L = [o('z1', [0, 0], [0, 20], [10, 0]), o('z2', [0, 20], [0, 50], [10, 0]), o('t', [0, 0], [0, 50], [15, 0])];
  assert.deepStrictEqual(A.olcuCakisma(L), []);
  assert.deepStrictEqual(A.olcuCakisma(L.concat([o('kotu', [0, 10], [0, 30], [12, 0])])).map(q => q.sort().join('-')).sort(), ['kotu-t', 'kotu-z1', 'kotu-z2']);
  assert.deepStrictEqual(A.olcuCakisma([o('z1', [0, 0], [0, 20], [10, 0]), o('z1b', [0, 10], [0, 30], [10, 0])]).length, 1, 'aynı hatta üst üste');
  assert.deepStrictEqual(A.olcuCakisma([L[0], { ad: 'kot', k: 'kutu', bb: [8, 5, 20, 8] }]), [['z1', 'kot']]);
  // dik ölçüler: çizgiler kesişebilir, yazı öbür ölçünün çizgisine binerse çakışma
  const yat = (ad, x0, x1, y) => ({ ad, k: 'olcu', a: [x0, y], b: [x1, y], p: [x0, y], yazi: 2, metin: '350' });
  assert.deepStrictEqual(A.olcuCakisma([o('d', [0, 0], [0, 40], [20, 0]), yat('y1', 0, 100, 10)]), []);          // yazılar uzakta
  assert.deepStrictEqual(A.olcuCakisma([o('d', [0, 0], [0, 40], [50, 0]), yat('y1', 0, 100, 10)]).length, 1);   // yatay ölçünün yazısı (x 50) düşey çizginin üstünde
});

/* kullanıcı bildirimi 14.11.2026: "2 ayrı oda olduğundan 1 kesit daha alması gerekiyordu". Konya'da kumanda odası bölme duvarında K2 130/250 kapısı var
   (araclar/konya-terfi-uret.js: dK x = 3,80, s = 1,05 → y 0,60 … 1,90); plan kesit kotunda (kat + 1 m) kapı boşluğu odaları birleştiriyordu.
   Zemin kaplaması ve mahal adı yok: mahaller yalnız duvarlardan bulunur. */
const KONYA_KAPILI = [R(0, 0, 19.7, 0.3), R(0, 7.7, 19.7, 8), R(0, 0, 0.4, 8), R(19.3, 0, 19.7, 8), R(3.7, 0.3, 3.9, 0.6), R(3.7, 1.9, 3.9, 7.7)];
for (const x of [0.25, 4.75, 9.25, 13.75, 19.45]) for (const y of [0.25, 7.75]) KONYA_KAPILI.push(R(x - 0.25, y - 0.25, x + 0.25, y + 0.25));
const K2 = { c: [3.8, 1.25], u: [0, 1], w: 1.3, t: 0.2 };
t('kapı boşluğu kapalı sayılır: kapılı bölme duvarıyla Konya yine 2 mahal (boşluk açık kalsaydı 1)', () => {
  assert.strictEqual(A.mahalBul(KONYA_KAPILI, [0, 0, 19.7, 8], { h: 0.1 }).length, 1);
  const M = A.mahalBul(KONYA_KAPILI.concat(A.acikIzleri([K2])), [0, 0, 19.7, 8], { h: 0.1 });
  assert.strictEqual(M.length, 2); assert.ok(M[1].bb[2] <= 3.75, 'kumanda odası x ≤ 3,7');
});
t('kaplamasız Konya: 1 uzun + büyük hacim (montaj holü) + kumanda odası = 3 kesit', () => {
  const M = A.mahalBul(KONYA_KAPILI.concat(A.acikIzleri([K2])), [0, 0, 19.7, 8], { h: 0.1 });
  const K = A.kesitYerleri({ bb: [0, 0, 19.7, 8], mahaller: M, aciklar: [{ c: [3.8, 1.25], w: 1.3, d: 'y' }] });
  assert.deepStrictEqual(K.map(h => h.tur), ['uzun', 'buyuk', 'oda']);
  assert.ok(K[2].v > 0.4 && K[2].v < 3.7, 'oda kesiti kumanda odasından: x = ' + K[2].v);
});
t('eski çalıştırmadan kalan 2 kesit (uzun + montaj holü) korunur, eksik oda kesiti eklenir; kesit zaten varsa eklenmez', () => {
  const M = A.mahalBul(KONYA_KAPILI.concat(A.acikIzleri([K2])), [0, 0, 19.7, 8], { h: 0.1 });
  const K = A.kesitYerleri({ bb: [0, 0, 19.7, 8], mahaller: M });
  const eski = [{ a: [-1.5, 4], b: [21.2, 4] }, { a: [11.5, -1.5], b: [11.5, 9.5] }];
  const ek = A.eksikKesitler(K, eski, M, [0, 0, 19.7, 8]); assert.deepStrictEqual(ek.map(h => h.tur), ['oda']);
  assert.deepStrictEqual(A.eksikKesitler(K, eski.concat([{ a: [2, -1.5], b: [2, 9.5] }]), M, [0, 0, 19.7, 8]), []);
  assert.strictEqual(A.eksikKesitler(K, [], M, [0, 0, 19.7, 8]).length, 3);
});

t('doğramanın yerel çerçevesi: Konya B cephesi (y = 0,10, dış güney) — dışa normal, dıştan bakınca sağ, menteşe ve açılış', () => {
  const F = A.dogramaCercevesi({ c: [7, 0.1], u: [1, 0], nn: [0, 1], duvar: 0.2, w: 0.7 }, [9.85, 4]);
  const z = v => v.map(q => q + 0); assert.deepStrictEqual(z(F.o), [0, -1]); assert.deepStrictEqual(z(F.x), [1, 0]);
  assert.ok(Math.abs(F.P0[0] - 6.65) < 1e-9 && Math.abs(F.P0[1] - 0) < 1e-9, 'dış yüz sol ucu (6,65; 0)');
  // K1 giriş cephesinde (x = 19,60, dış doğu), yon L: kanat +nn yönüne
  const K = A.dogramaCercevesi({ c: [19.6, 1.2], u: [0, 1], nn: [-1, 0], duvar: 0.2, w: 1, el: 'L', yon: 'L' }, [9.85, 4]);
  assert.deepStrictEqual(z(K.o), [1, 0]); assert.strictEqual(K.ters, false, 'kanat içe (−x) açılır'); assert.strictEqual(K.mentese, 'L', 'doğudan batıya bakınca s0 (güney) solda');
});
t('korkuluk oklu açıklaması (Çokal İdari): yazı "KR1 Korkuluk h=110 cm" / "(Sıcak Daldırma Galvaniz)"; kesilen betona ve ölçüye binmez', () => {
  assert.deepStrictEqual(A.korkulukYazisi({ kod: 'KR1', kh: 110 }, 'Sıcak daldırma galvaniz çelik'), ['KR1 Korkuluk h=110 cm', '(Sıcak Daldırma Galvaniz)']);
  assert.deepStrictEqual(A.korkulukYazisi({ kh: 90 }, 'Paslanmaz çelik (AISI 304, saten)')[1], '(Paslanmaz Çelik (AISI 304, Saten))');
  // korkuluk y = 0, üstte (y 2 … 10) kesilen beton döşeme, sağ altta ölçü: ok sol alta gider
  const beton = { pts: [[-30, 2], [30, 2], [30, 10], [-30, 10]], a: 1e6 }, olcu = { bb: [0, -12, 30, -2], a: 1e3 };
  const r = A.okluAciklamaYeri({ adaylar: [[0, 0]], w: 20, h: 2, L: 11.7, aci: 59, alanlar: [beton], kutular: [olcu] });
  assert.ok(r.maliyet < 1, 'maliyet ' + r.maliyet); assert.ok(r.kirik[1] < 0 && r.kirik[0] < 0, 'sol alt: ' + r.kirik);
  assert.ok(Math.abs(Math.hypot(r.kirik[0], r.kirik[1]) - 11.7) < 1e-9 && Math.abs(r.son[1] - r.kirik[1]) < 1e-9 && Math.abs(Math.abs(r.son[0] - r.kirik[0]) - 20) < 1e-9, 'eğik kol 11,7, yatay kırılma yazı genişliğinde');
});

/* Konya ±0.00 planı: zemin kaplaması üç katman (kaba şap / şap / kaplama) üst üste; galeri yürüme yolunun üstünden geçen eğik çizgiler
   katman ara yüzlerindeki üçgenleme köşegenleriydi (sırt sırta iki yüz siluet sayılıyordu). */
const kutuUcgen = (x0, y0, z0, x1, y1, z1) => { const v = (i) => [i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0], P = [];
  const yuz = (a, b, c, d) => { for (const q of [[a, b, c], [a, c, d]]) for (const i of q) P.push(...v(i)); };
  yuz(0, 2, 3, 1); yuz(4, 5, 7, 6); yuz(0, 1, 5, 4); yuz(2, 6, 7, 3); yuz(0, 4, 6, 2); yuz(1, 3, 7, 5); return P; };
t('siluet: üst üste iki katman (plan, yukarıdan) — ara yüzün köşegeni çizilmez; dış hat kalır', () => {
  const P = kutuUcgen(0, 0, -0.26, 4, 2, -0.06).concat(kutuUcgen(0, 0, -0.06, 4, 2, -0.02));
  const S = A.siluetKenar(P, [0, 0, -1]);
  const kosegen = S.filter(([p, q]) => Math.abs(p[0] - q[0]) > 1e-9 && Math.abs(p[1] - q[1]) > 1e-9);
  assert.strictEqual(kosegen.length, 0, 'köşegen: ' + JSON.stringify(kosegen));
  assert.ok(S.some(([p, q]) => Math.abs(p[2] + 0.06) < 1e-9 && Math.abs(q[2] + 0.06) < 1e-9 && Math.abs(p[1] - q[1]) < 1e-9), 'ara yüzde dış hat kenarı kalır');
});
t('siluet: tek kutu eğik bakışta dış hattı verir (eski davranış)', () => {
  const S = A.siluetKenar(kutuUcgen(0, 0, 0, 1, 1, 1), [1, 1, -1]);
  assert.strictEqual(S.length, 6); // izometrik kübün altıgen dış hattı
});

/* Çokal 10-İdari Bina_R2 çatı paftası ÇKL-AAT-İB-03 (ÇATI PLANI, A'-A', B'-B'; 6-Blower çatı kesiti) oklu açıklama yazıları */
t('çatı oklu açıklama yazısı: Çokal biçimi (ebat küçükten büyüğe, iki satırlılar)', () => {
  assert.deepStrictEqual(A.catiUyeYazisi('Mertek', 0.05, 0.10, 'kesit'), ['Mertek 5x10']);
  assert.deepStrictEqual(A.catiUyeYazisi('Aşık', 0.10, 0.10, 'kesit'), ['Aşık 10x10']);
  assert.deepStrictEqual(A.catiUyeYazisi('Duvar aşığı', 0.10, 0.10, 'plan'), ['D. Aşığı 10x10']);
  assert.deepStrictEqual(A.catiUyeYazisi('Dikme', 0.10, 0.10, 'kesit'), ['Dikme 10x10']);
  assert.deepStrictEqual(A.catiUyeYazisi('Dikme', 0.10, 0.10, 'plan'), ['Dikme', '10x10']);
  assert.deepStrictEqual(A.catiUyeYazisi('Kuşaklama', 0.05, 0.10, 'plan'), ['Kuşaklama', '2x5x10']);
  assert.deepStrictEqual(A.catiUyeYazisi('Göğüsleme', 0.05, 0.10, 'kesit'), ['Göğüsleme', '2x5x10']); // çift tahta (Çokal; kullanıcı 14.11.2026)
  assert.deepStrictEqual(A.catiUyeYazisi('Yastık', 0.10, 0.025, 'kesit'), ['Yastık 2.5x10']);
  assert.deepStrictEqual(A.catiUyeYazisi('Mahya aşığı', 0.10, 0.12, 'kesit'), ['Mahya Aşığı 10x12']);
  assert.deepStrictEqual(A.catiKatmanYazisi({ tur: 'alt', key: 'tahta18', t: 0.018 }), ['Kaplama Tahtası', '1.8x10']);
  assert.deepStrictEqual(A.catiKatmanYazisi({ tur: 'su', key: 'bitum', t: 0.006 }), ['Bitümlü Örtü İle Su Yalıtımı']);
  assert.deepStrictEqual(A.ikiSatir('EPS Dolgulu Renkli Sac Galvaniz Panel (5 cm)'), ['EPS Dolgulu Renkli Sac', 'Galvaniz Panel (5 cm)']);
  assert.deepStrictEqual(A.olukYazisi(155), ['DN155 Çinko Yağmur Oluğu']);
  assert.deepStrictEqual(A.inisBorusuYazisi(120), ['DN120 Çinko Yağmur', 'İniş Borusu']);
});
t('oklu açıklama yeri: delikli bölge (çatı kaplama bandı dış + iç çevre, aynı katman) içi boş sayılır', () => {
  const dis = [[0, 0], [20, 0], [20, 10], [0, 10]], ic = [[1, 1], [19, 1], [19, 9], [1, 9]];
  const r = A.okluAciklamaYeri({ adaylar: [[10, 2]], w: 3, h: 0.5, L: 1.5, aci: 60, alanlar: [{ pts: dis, a: 1e6, g: 'KESIT_CATI' }, { pts: ic, a: 1e6, g: 'KESIT_CATI' }] });
  assert.ok(r.maliyet < 1, 'bandın içindeki boşluğa yazılabilir: ' + r.maliyet);
  const r2 = A.okluAciklamaYeri({ adaylar: [[10, 2]], w: 3, h: 0.5, L: 1.5, aci: 60, alanlar: [{ pts: dis, a: 1e6 }, { pts: ic, a: 1e6 }] });
  assert.ok(r2.maliyet >= 1e6, 'g yoksa eski davranış');
});

/* Konya ±0.00 planı (kesme +1,20, pencere parapeti 1,00): duvar halkası pencerede açılır; doğrama boşluğu duvar sayılınca oda bulunur ve kot konur
   (gorunus.js → planKots; tarayıcıda Konya ±0.00: −0,26 / ±0,00 çift kot montaj holü ve kumanda odasında, galeriden −5,90 / −5,85 / −6,31, sahanlık −2,32,
   tretuvar −0,11, rampa −0,03 / −0,18) */
t('oda bulma: pencereden kesilen planda doğrama boşluğu duvar sayılır (Konya ±0.00)', () => {
  const R = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const duvar = [R(0, 0, 5.45, 0.2), R(6.15, 0, 19.7, 0.2), R(0, 7.8, 19.7, 8), R(0, 0, 0.2, 8), R(19.5, 0, 19.7, 8)]; // B cephesinde 70 cm pencere boşluğu (5,45 – 6,15)
  assert.strictEqual(A.mahalBul(duvar, [0, 0, 19.7, 8], { h: 0.1, enAz: 1 }).length, 0, 'boşluktan dışarı taşar');
  const r = A.mahalBul(duvar.concat([R(5.45, 0, 6.15, 0.2)]), [0, 0, 19.7, 8], { h: 0.1, enAz: 1 });
  assert.strictEqual(r.length, 1); assert.ok(Math.abs(r[0].alan - 19.3 * 7.6) < 1.5, 'alan ' + r[0].alan);
});

/* denetim 14.11.2026: Konya B-B'de iki doğramalı duvarın iç zincirleri (x 84,32 / 84,57 / 84,82 / 85,07) — 41 · 564 · 1064 iki kez */
t('kesit iç düşey zincirleri: kaba zincir atılır, aynı ölçü bir kez (Konya B-B)', () => {
  const v = (x, z0, z1) => ({ k: 'v', a: [x, z0], b: [x, z1], p: [x - 0.05, z0] });
  const L = [v(4.32, -6.31, -5.9), v(4.32, -5.9, -0.26), v(4.32, -0.26, 4.74), v(4.57, -5.9, 4.74),
    v(4.82, -6.31, -5.9), v(4.82, -5.9, -0.26), v(4.82, -0.26, 0.74), v(4.82, 0.74, 2.24), v(4.82, 2.24, 4.14), v(4.82, 4.14, 4.74), v(4.82, 4.74, 5.24), v(5.07, -5.9, 4.74), { k: 'h', a: [0, 0], b: [1, 0], p: [0, -1] }];
  const R = A.icZincirSadele(L), V = R.filter(q => q.k === 'v');
  assert.strictEqual(R.filter(q => q.k === 'h').length, 1);
  assert.deepStrictEqual([...new Set(V.map(q => q.a[0]))].sort(), [4.57, 4.82], 'iki sıra');
  const say = (z0, z1) => V.filter(q => Math.abs(q.a[1] - z0) < 1e-6 && Math.abs(q.b[1] - z1) < 1e-6).length;
  assert.strictEqual(say(-6.31, -5.9), 1); assert.strictEqual(say(-5.9, -0.26), 1); assert.strictEqual(say(-5.9, 4.74), 1);
});

t('lento yazısı: Çokal 6-Blower biçimi "Lento" / "(20x20)" — en (duvar kalınlığı) x yükseklik', () => {
  assert.deepStrictEqual(A.lentoYazisi(0.2, 0.2), ['Lento', '(20x20)']); assert.deepStrictEqual(A.lentoYazisi(0.25, 0.3), ['Lento', '(25x30)']);
});
t('mahal adları tekil: adsız mahal o kottaki seviyenin adını alır (tek ise), öbürleri MAHAL 1, MAHAL 2 …; verilmiş ad korunur (Konya: Pompa holü −5,90, Montaj holü ±0,00)', () => {
  const sv = [{ ad: 'Çatı', z: 5.24 }, { ad: 'Montaj holü (zemin kat)', z: 0 }, { ad: 'Pompa holü', z: -5.9 }];
  assert.deepStrictEqual(A.mahalAdlari([{ ad: 'Mahal 1', z: -5.9 }, { ad: 'Mahal 1', z: 0 }], sv), ['POMPA HOLÜ', 'MONTAJ HOLÜ']);
  assert.deepStrictEqual(A.mahalAdlari([{ ad: 'Mahal 1', z: 0 }, { ad: 'Kumanda Odası', z: 0 }, { ad: '', z: 0 }], sv), ['MAHAL 1', 'Kumanda Odası', 'MAHAL 2'], 'aynı kotta iki adsız: numaralı');
  assert.deepStrictEqual(A.mahalAdlari([{ ad: 'Mahal 2', z: 0 }, { ad: 'Mahal 2', z: 3 }], []), ['MAHAL 1', 'MAHAL 2']);
  assert.deepStrictEqual(A.mahalAdlari([{ ad: 'Depo', z: 0 }, { ad: 'Depo', z: 3 }], []), ['Depo', 'Depo 2'], 'iki kez geçen verilmiş ad');
  assert.deepStrictEqual(A.mahalAdlari([{ ad: 'MAHAL 1', z: 0 }, { ad: 'Pompa Holü', z: -5.9 }, { ad: '', z: -5.9 }], sv), ['MONTAJ HOLÜ', 'Pompa Holü', 'MAHAL 1'], 'seviye adı başka mahalde kullanılmışsa numara');
});
t('planda lento oku: aynı ebat + aynı cephe tek ok, başka cephe ya da başka ebat ayrı (Konya: 8,4 × 6,9 m, 20 cm duvar)', () => {
  // güney duvarı (y = 0, doğu yönlü) iki pencere, kuzey (y = 6,9, batı yönlü) bir pencere, doğu (x = 8,4) bir kapı (lento 20x30)
  const L = [
    { A: [0, 0], u: [1, 0], s: 2, w: 1.2, td: 0.2, lh: 0.2, k: '20x20' }, { A: [0, 0], u: [1, 0], s: 6, w: 1.2, td: 0.2, lh: 0.2, k: '20x20' },
    { A: [8.4, 6.9], u: [-1, 0], s: 4, w: 1.2, td: 0.2, lh: 0.2, k: '20x20' }, { A: [8.4, 0], u: [0, 1], s: 3, w: 1.0, td: 0.2, lh: 0.3, k: '20x30' }];
  const G = A.lentoGrupPlan(L, [4.2, 3.45]);
  assert.strictEqual(G.length, 3, 'güney (2 pencere tek ok), kuzey, doğu kapı');
  const g = G.find(q => q.k === '20x20' && q.adaylar.some(p => p[1] === 0)); assert.strictEqual(g.adaylar.length, 6, 'iki lentonun adayları birleşir (her lentoda 3)');
  assert.deepStrictEqual(g.satir, ['Lento', '(20x20)']); assert.deepStrictEqual(G.find(q => q.k === '20x30').satir, ['Lento', '(20x30)']);
  assert.ok(g.adaylar.some(p => Math.abs(p[0] - 2) < 1e-9) && g.adaylar.some(p => Math.abs(p[0] - 6) < 1e-9), 'ok ucu adayı lentonun ortası');
  // aynı duvar ters çizilmiş (u ters): cephe yine güney → aynı grup
  assert.strictEqual(A.lentoGrupPlan([L[0], { A: [8.4, 0], u: [-1, 0], s: 2.4, w: 1.2, td: 0.2, lh: 0.2, k: '20x20' }], [4.2, 3.45]).length, 1);
});

console.log(`\n${n} test geçti.`);

/* Mimari detaylar (app/mimari-detay.js) ve görünüşte toprak altı (app/mimari-oto.js → zeminAltiKirp) —
   Konya terfi merkezi doğrama tipleriyle (P1 70/150 21 adet, P2 210/150, P3 300/60, K1 100/276, K2 130/276 çift kanat, SEK1 300/470)
   ve Çokal 10-İdari Bina_R2 doğrama detaylarından ölçülenlerle (P1 150/130 iki kanat, P2 200/130 üç, P3 80/130 tek, P4 50/50 tek; başlık
   "P1 150/130 ALÜMİNYUM PENCERE", "(8 ADET)", ÖLÇEK 1/20).
   Çalıştır: node test/mimari-detay.test.js */
'use strict';
const assert = require('assert');
const D = require('../app/mimari-detay.js'), O = require('../app/mimari-oto.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const tip = (kod, onek, w, h, o) => Object.assign({ kod, onek, w, h, adet: 1, duvar: 20, baslik: `${kod} ${w}/${h} ${onek === 'SEK' ? 'SEKSİYONEL KAPI' : onek === 'K' ? 'ÇELİK KAPI' : 'ALÜMİNYUM PENCERE'}` }, o || {});
const of = (r, k) => r.items.filter(q => q.k === k);

t('kanat sayısı Çokal İdari ile aynı: 50 ve 80 cm tek, 150 cm iki, 200 cm üç; modelde kanat verilmişse o', () => {
  assert.deepStrictEqual([50, 80, 150, 200].map(w => D.kanatSayisi({ w })), [1, 1, 2, 3]);
  assert.strictEqual(D.kanatSayisi({ w: 70, kanat: 2 }), 2);
  assert.deepStrictEqual(D.acilanlar(2), [1]); assert.deepStrictEqual(D.acilanlar(3), [0, 2]);
});

t('P1 70/150 (Konya): başlık "P1 70/150 ALÜMİNYUM PENCERE" 4 mm ölçek 1/20, "(21 ADET)", genişlik 70 ve yükseklik 150 ölçüsü, 1-1 / 2-2 kesitleri', () => {
  const r = D.dogramaDetay(tip('P1', 'P', 70, 150, { adet: 21, parapet: 100 }), { sc: 20 });
  const B = of(r, 'B'); assert.strictEqual(B.length, 1); assert.strictEqual(B[0].s, 'P1 70/150 ALÜMİNYUM PENCERE'); assert.strictEqual(B[0].hp, 4); assert.strictEqual(B[0].ol, '1/20');
  assert.ok(of(r, 'T').some(q => q.s === '(21 ADET)' && q.mm === 3));
  const olc = of(r, 'D').map(q => q.txt); assert.ok(olc.includes('70') && olc.includes('150'), olc.join(','));
  const yz = of(r, 'T').map(q => q.s); for (const s of ['GÖRÜNÜŞ', '1-1 KESİTİ', '2-2 KESİTİ']) assert.ok(yz.includes(s), s);
  assert.ok(of(r, 'H').some(q => q.mat === 'tugla') && of(r, 'H').some(q => q.mat === 'beton'), 'duvar tuğla, lento beton taranır');
  // detay 1/20'de Çokal hücresi kadar: P1 150/130 hücresi 215 × 220 mm; 70/150 daha dar
  const w = (r.bb[2] - r.bb[0]) * 1000 / 20, h = (r.bb[3] - r.bb[1]) * 1000 / 20; assert.ok(w > 80 && w < 215 && h > 120 && h < 260, `${w} × ${h} mm`);
});

t('P3 300/60: üç kanat, ölçü zinciri 101 / 98 / 101 = 300 (kayıt eksenleri), yüksekliği 80 cm\'den az: vasistas', () => {
  const r = D.dogramaDetay(tip('P3', 'P', 300, 60), { sc: 20 });
  assert.strictEqual(r.parca.paneller.length, 4);
  const z = of(r, 'D').filter(q => q.yon === 'h' && q.off === -10).map(q => +q.txt); assert.deepStrictEqual(z, [101, 98, 101]);
  assert.ok(of(r, 'D').some(q => q.yon === 'h' && q.off === -22.5 && q.txt === '300'), 'toplam en dışta, zincirden modelde 25 cm (1/20 kâğıtta 12,5 mm) aşağıda');
});

t('K2 130/276 çift kanat: 1-1 kesitinde iki açılım yayı, kanatlar görünüşün altında (çakışmaz)', () => {
  const r = D.dogramaDetay(tip('K2', 'K', 130, 276, { kanat: 2 }), { sc: 20 });
  const yay = of(r, 'P').filter(q => !q.cl && q.pts.length === 17); assert.strictEqual(yay.length, 2);
  const gor = r.parca.gorunus, k11 = r.parca.kesit11; assert.ok(k11[3] < gor[1] - 0.3, `1-1 kesiti (üst ${k11[3]}) görünüşün altında`);
});

t('SEK1 300/470: panel çizgileri (50 cm), tavan rayı görünüşün üstüne binmez', () => {
  const r = D.dogramaDetay(tip('SEK1', 'SEK', 300, 470, { panel: 0.5 }), { sc: 20 });
  const pan = of(r, 'L').filter(q => q.a[0] > 0 && q.b[0] < 3 && Math.abs(q.a[1] - q.b[1]) < 1e-9 && !q.lt); assert.ok(pan.length >= 8, 'panel derzleri');
  const ray = of(r, 'P').find(q => q.lt === 'HIDDEN' && q.pts.length > 5); assert.ok(ray && Math.min(...ray.pts.map(p => p[0])) > 3.0, 'tavan rayı görünüşün (0 … 3 m) sağında');
});

t('korkuluk tipleri: Konya — merdiven ve galeri korkulukları aynı tip (110 cm, 150 cm, galvaniz, tekmelikli), boyları toplanır', () => {
  const T = D.korkulukTipleri([{ kh: 110, dik: 150, km: 'galvaniz', tk: 'E', boy: 38.5, yer: 'Döşeme / galeri kenarı' }, { kh: 110, dik: 150, km: 'galvaniz', tk: 'E', boy: 4.49, yer: 'Döşeme / galeri kenarı' }, { kh: 110, dik: 150, km: 'galvaniz', tk: 'E', boy: 9.03, yer: 'Merdiven' }, { kh: 90, dik: 120, km: 'paslanmaz', boy: 3 }]);
  assert.strictEqual(T.length, 2); assert.strictEqual(T[0].kod, 'KR1'); assert.strictEqual(T[0].boy, 52.02); assert.deepStrictEqual(T[0].yerler, ['Döşeme / galeri kenarı', 'Merdiven']);
  const r = D.korkulukDetay(T[0], { sc: 20 });
  assert.deepStrictEqual(r.xs, [0.25, 1.75, 3.25]);
  const olc = of(r, 'D').map(q => q.txt); for (const s of ['150', '300', '110', '15']) assert.ok(olc.includes(s), s);
  assert.ok(of(r, 'B')[0].s.includes('h=110 cm'));
  // ara birleştirme (Çokal İdari rampa korkuluğu): her dikmede ara küpeşte iki yanda dışbükey yayla biter (r = 0,61 × çap, ±55°), küpeşte altında bir yay
  const yay = of(r, 'A'); assert.strictEqual(yay.length, 3 * r.xs.length); assert.ok(yay.every(q => Math.abs(q.r - 0.61 * (Math.abs(q.a0 - 215) < 1e-9 ? D.KORK.kup : D.KORK.ara)) < 1e-9));
  assert.strictEqual(of(r, 'L').filter(q => q.ly === 'DETAY_KORKULUK' && Math.abs(q.a[1] - q.b[1]) < 1e-9 && Math.abs(q.a[1] - (1.1 / 2 - D.KORK.ara / 2)) < 1e-9).length, 4, 'ara küpeşte dikmeler arasında 4 parça');
  assert.strictEqual(D.KORK.kup, 0.0424); assert.strictEqual(D.KORK.ara, 0.0337); // app/merdiven.js railRun ile aynı çaplar
});

t('sac kapak tipleri: aynı ölçü bir tip, 3 m\'den uzun (kanal) ve 20 cm\'den dar boşluk kapak sayılmaz; Konya galeri boşluğu 100 × 100 → SK1', () => {
  const T = D.kapakTipleri([{ w: 1, l: 1, yer: 'Galeri döşemesi' }, { w: 11.15, l: 0.6 }, { w: 0.15, l: 0.4 }, { w: 1, l: 1, yer: 'Galeri döşemesi' }, { w: 0.6, l: 1.2 }]);
  assert.deepStrictEqual(T.map(q => [q.ad, q.w, q.l, q.adet]), [['SK1', 0.6, 1.2, 1], ['SK2', 1, 1, 2]]);
});

t('görünüşte toprak altı kırpılır (firma kuralı): çevre, açık çizgi ve görünen kenar zemin kotunda biter', () => {
  const R = { loops: [[[0, -2], [4, -2], [4, 3], [0, 3]]], equip: [], open: [[[0, -1], [0, 1], [2, 1]]], vis: [[[1, -3], [1, -1]], [[2, -1], [2, 2]], [[0, 0.5], [3, 0.5]]] };
  const K = O.zeminAltiKirp(R, 0);
  assert.ok(K.loops[0].every(q => q[1] >= 0) && K.loops[0].length === 4);
  assert.deepStrictEqual(K.open[0][0], [0, 0]); assert.strictEqual(K.vis.length, 2); assert.deepStrictEqual(K.vis[0][0], [2, 0]);
  assert.strictEqual(K.kesilen, 3);
  // Konya: zemin kotu tretuvarın oturduğu toprak (−0,20); yoksa "toprak" seviyesi
  assert.strictEqual(O.zeminKotu([{ type: 'tretuvar', zg: -0.2 }, { type: 'perde' }], []), -0.2);
  assert.strictEqual(O.zeminKotu([], [{ id: 'toprak', ad: 'Toprak kotu', z: -0.2 }]), -0.2);
  assert.strictEqual(O.zeminKotu([], []), null);
});

t('kesitte aks ölçüleri: Konya A-A — dış yüz 0 · akslar 0,25 / 4,75 / 9,25 / 13,75 / 19,45 · dış yüz 19,7; toplam sıra zincirden modelde 25 cm üstte, balon onun 11 mm üstünde', () => {
  const S = O.kesitAksSiralari({ akslar: [0.25, 4.75, 9.25, 13.75, 19.45], dis: [0, 19.7], ust: 6.65, mm: 0.05 });
  assert.deepStrictEqual(S.noktalar, [0, 0.25, 4.75, 9.25, 13.75, 19.45, 19.7]);
  assert.strictEqual(S.y1, 7.35); assert.strictEqual(S.y2, 7.6); assert.strictEqual(S.extp, (7.6 + 0.55 - 6.65) / 0.05 - 6);
  assert.deepStrictEqual(O.kesitAksSiralari({ akslar: [-1, 3, 30], dis: [0, 10], ust: 0, mm: 0.05 }).noktalar, [0, 3, 10], 'dışarıdaki akslar zincire girmez');
});

t('kapı / pencere numara dairesi bütün tiplerde 3 mm (kullanıcı kararı): SEK1 daireyi büyütmez, yazı 2 mm kalır, genişlik çarpanı 0,56', () => {
  for (const k of ['P1', 'K2', 'SEK1', 'PA12']) { const y = O.kodYazi(k, { balonR: 3, kodMm: 2 }); assert.strictEqual(y.r, 3); assert.strictEqual(y.h, 2);
    assert.ok(k.length * 0.75 * y.h * (y.wf / 0.7) <= 2 * (3 - 0.6) + 1e-9, k + ' daireye sığar'); }
  assert.strictEqual(O.kodYazi('P1', { balonR: 3, kodMm: 2 }).wf, 0.7); assert.strictEqual(O.kodYazi('SEK1', { balonR: 3, kodMm: 2 }).wf, 0.56);
});

/* doğrama tek kaynaktan (firma kuralı 14.11.2026): görünüş, 2-2 ve 1-1 ayrı saf fonksiyonlar; plan / kesit / görünüş bunlarla çizilir */
const kutuOf = it => D.kutu(it);
t('doğrama parçaları: dogramaGorunus / dograma22 / dograma11 yerel koordinatta; detay paftası bunları kullanır (aynı çizgiler)', () => {
  const T = tip('P2', 'P', 210, 150, { parapet: 100 });
  const G = D.dogramaGorunus(T, { yazi: false }), b = kutuOf(G.items);
  assert.ok(Math.abs(b[0] + 0.03) < 1e-9 && Math.abs(b[2] - 2.13) < 1e-9 && Math.abs(b[3] - 1.5) < 1e-9, 'görünüş 0 … W (denizlik ±3 cm), 0 … H: ' + b);
  assert.ok(!G.items.some(q => q.k === 'T'), 'modelde yazı yok'); assert.ok(D.dogramaGorunus(T).items.some(q => q.s === '4+12+4 ISICAM'), 'detayda ısıcam yazısı');
  const K22 = D.dograma22(T, { duvar: false, yazi: false }), b22 = kutuOf(K22.items);
  assert.ok(b22[0] >= -0.041 && b22[2] <= 0.2 + 0.051 && !K22.items.some(q => q.k === 'H'), 'kesitte yalnız doğrama (kasa, cam, denizlikler); duvar ve tarama yok');
  const K11 = D.dograma11(T, { duvar: false }), b11 = kutuOf(K11.items);
  assert.ok(b11[0] >= -0.031 && b11[2] <= 2.131 && b11[1] >= -0.031 && b11[3] <= 0.2, 'planda doğrama duvar kalınlığı içinde (dış denizlik 3 cm dışarı)');
});
t('kapı 1-1: menteşe ve açılış yönü modelden (sağ menteşe, dışa açılan); çift kanatta iki yay', () => {
  const T = tip('K1', 'K', 100, 250, {});
  const ic = D.dograma11(T, { duvar: false, mentese: 'L' }), dis = D.dograma11(T, { duvar: false, mentese: 'R', ters: true });
  const yay = r => r.items.find(q => q.k === 'P' && !q.cl && q.pts.length === 17);
  assert.ok(yay(ic).pts.every(p => p[1] >= 0.2 - 1e-9), 'içe açılan yay iç yüzden (y ≥ td)'); assert.ok(Math.abs(yay(ic).pts[16][0] - 0.05) < 1e-9, 'sol menteşe');
  assert.ok(yay(dis).pts.every(p => p[1] <= 1e-9), 'dışa açılan yay dış yüzden'); assert.ok(Math.abs(yay(dis).pts[16][0] - 0.95) < 1e-9, 'sağ menteşe');
  assert.strictEqual(D.dograma11(tip('K2', 'K', 130, 250, { kanat: 2 }), { duvar: false }).items.filter(q => q.k === 'P' && !q.cl && q.pts.length === 17).length, 2);
  assert.ok(D.dograma22(T, { duvar: false, yazi: false }).items.length === 2, 'kesilen kapı: üst kasa + kanat');
});

t('detay paftasında doğrama çizgileri DETAY_DOGRAMA (→ Kapi_Pencere), duvar parçası (parapet, lento, iki yandaki duvar) DETAY_KESIT kalır', () => {
  const r = D.dogramaDetay(tip('P1', 'P', 70, 150, { adet: 21, parapet: 100 }), { sc: 20 }), cz = r.items.filter(it => /^[LPCA]$/.test(it.k));
  assert.ok(cz.filter(it => it.ly === 'DETAY_DOGRAMA').length > 10, 'doğrama çizgileri');
  assert.ok(cz.filter(it => it.duvar).length > 0 && cz.filter(it => it.duvar).every(it => it.ly !== 'DETAY_DOGRAMA'), 'duvar parçası doğrama katmanına geçmez');
  assert.ok(r.items.filter(it => it.k === 'H').length > 0, 'taramalar duruyor');
});

t('söve dönüşü: pencerede iç / dış sıva yanakta ve lento altında doğrama kasasına kadar döner (L); kapıda yüzde biter', () => {
  const P = tip('P2', 'P', 220, 125), K = tip('K1', 'K', 110, 210), y = (q, v) => Math.abs(q - v) < 1e-9;
  const L11 = of(D.dograma11(P, { duvar: true }), 'L'), td = 0.2, py = 0, pi = td;
  assert.ok(L11.some(q => y(q.a[0], 0.02) && y(q.b[0], 0.02) && y(q.a[1], pi + 0.02) && y(q.b[1], 0.10)), '1-1 iç yanak sıvası x = 2 cm, iç yüzden kasaya (py + 10 cm)');
  assert.ok(L11.some(q => y(q.a[0], 0.02) && y(q.a[1], py - 0.02) && y(q.b[1], 0.03)), '1-1 dış yanak sıvası kasaya (py + 3 cm)');
  assert.ok(L11.some(q => y(q.a[1], pi + 0.02) && y(q.b[1], pi + 0.02) && y(q.b[0], 0.02)), 'iç yüz sıvası yanağa döner');
  const Lk = of(D.dograma11(K, { duvar: true }), 'L'); assert.ok(!Lk.some(q => y(q.a[0], 0.02) && y(q.b[0], 0.02)), 'kapıda yanak dönüşü yok');
  const L22 = of(D.dograma22(P, { duvar: true, yazi: false }), 'L'), H = 1.25;
  assert.ok(L22.filter(q => y(q.a[1], H - 0.02) && y(q.b[1], H - 0.02)).length === 2, '2-2 lento altında iç ve dış sıva dönüşü');
});

console.log(`\n${n} test geçti.`);

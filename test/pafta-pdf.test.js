/* Pafta PDF kaydı (app/pafta-pdf.js): kâğıt boyutu algılama, ünite → pafta gruplama, SVG → PDF.
   Çalıştır: node test/pafta-pdf.test.js */
'use strict';
const assert = require('assert'), zlib = require('zlib');
const P = require('../app/pafta-pdf.js');
let n = 0; const t = async (ad, f) => { await f(); n++; console.log('✓ ' + ad); };
const PT = 72 / 25.4, yakin = (a, b, e = 0.01) => Math.abs(a - b) < e;

(async () => {
  await t('kâğıt adı: ISO, uzun pafta, özel ölçü', () => {
    assert.strictEqual(P.kagitAdi(841, 594).etiket, 'A1');
    assert.strictEqual(P.kagitAdi(594, 841).yon, 'dikey');
    assert.strictEqual(P.kagitAdi(1189, 841).ad, 'A0');
    assert.strictEqual(P.kagitAdi(420, 297).ad, 'A3');
    const u = P.kagitAdi(898, 594); assert.strictEqual(u.ad, 'A1'); assert.ok(u.uzun); assert.strictEqual(u.etiket, 'A1 uzun 898×594');
    assert.strictEqual(P.kagitAdi(1500, 594).etiket, 'A1 uzun 1500×594');
    assert.strictEqual(P.kagitAdi(700, 500).ad, 'Özel');
  });

  await t('paftanın kâğıdı: sayfa düzeninden (A boyutu, dikey, OZEL pw × ph)', () => {
    assert.deepStrictEqual([P.paftaKagidi({ size: 'A1', orient: 'L' }).w, P.paftaKagidi({ size: 'A1', orient: 'L' }).h], [841, 594]);
    const d = P.paftaKagidi({ size: 'A3', orient: 'P' }); assert.deepStrictEqual([d.w, d.h, d.yon], [297, 420, 'dikey']);
    const o = P.paftaKagidi({ size: 'OZEL', pw: 898, ph: 594, orient: 'L' }); assert.deepStrictEqual([o.w, o.h, o.etiket], [898, 594, 'A1 uzun 898×594']);
    assert.strictEqual(P.paftaKagidi({ size: 'XX' }).ad, 'A1');
  });

  // gerçek projelerdeki pafta adlandırmaları (mimari-pafta.js, istasyon-pafta.js, statik-pafta-dsi.js, el-pafta.js)
  const L = [
    { name: 'MİMARİ-01 PLANLAR', grp: 'Mimari', size: 'OZEL', pw: 898, ph: 594, f: { baslik: 'BEKÇİ BİNASI — PLANLAR', no: 'MİM-01' } },
    { name: 'MİMARİ-02 KESİTLER', grp: 'Mimari', size: 'A1', f: { baslik: 'BEKÇİ BİNASI — KESİTLER', no: 'MİM-02' } },
    { name: 'MİMARİ-03 PLANLAR', grp: 'Mimari', size: 'A1', f: { baslik: 'ANAEROBİK HAVUZ — PLANLAR', no: 'MİM-03' } },
    { name: 'STATİK — ANAEROBİK HAVUZ — KALIP', grp: 'Statik', statikDsi: 'ANAEROBİK HAVUZ', size: 'OZEL', pw: 1250, ph: 594, f: {} },
    { name: 'STATİK — ANAEROBİK HAVUZ — DONATI', grp: 'Statik', statikDsi: 'ANAEROBİK HAVUZ', size: 'A0', f: {} },
    { name: 'ELEKTRİK — AYDINLATMA', grp: 'Elektrik', size: 'A1', f: { baslik: 'AYDINLATMA TESİSATI', no: 'ELE-01' } },
    { name: 'ELEKTRİK — ŞEMA', grp: 'Elektrik', size: 'A3', orient: 'P', f: { baslik: 'TEK HAT ŞEMASI', no: 'ELE-02' } },
  ];
  await t('ünite adı: statik yapı adı, "YAPI — PAFTA" başlığı, yoksa bölüm', () => {
    assert.strictEqual(P.uniteAdi(L[0]), 'BEKÇİ BİNASI');
    assert.strictEqual(P.uniteAdi(L[3]), 'ANAEROBİK HAVUZ');
    assert.strictEqual(P.uniteAdi(L[5]), 'Elektrik');
    assert.strictEqual(P.uniteAdi({ unite: 'KUM TUTUCU', f: { baslik: 'X — Y' } }), 'KUM TUTUCU');
  });

  await t('üniteler bölüme göre gruplanır, pafta sırası korunur', () => {
    const m = P.uniteler(L, 'Mimari'); assert.deepStrictEqual(m.map(u => [u.ad, u.paftalar.length]), [['BEKÇİ BİNASI', 2], ['ANAEROBİK HAVUZ', 1]]);
    const tum = P.uniteler(L, 'TUMU'); // tüm bölümlerde aynı ünitenin mimari + statik paftaları tek ünitede
    assert.deepStrictEqual(tum.map(u => [u.ad, u.paftalar.length]), [['BEKÇİ BİNASI', 2], ['ANAEROBİK HAVUZ', 3], ['Elektrik', 2]]);
    assert.strictEqual(P.uniteler(L, 'Mekanik').length, 0);
  });

  await t('dosya planı: her ünite ayrı / her pafta ayrı / tek dosya; seçili üniteler', () => {
    const u = P.dosyaPlani(L, { proje: 'BEKÇİ', bolum: 'Mimari', kip: 'unite' });
    assert.deepStrictEqual(u.map(d => [d.ad, d.paftalar.length]), [['BEKÇİ - BEKÇİ BİNASI', 2], ['BEKÇİ - ANAEROBİK HAVUZ', 1]]);
    const p = P.dosyaPlani(L, { proje: 'BEKÇİ', bolum: 'Elektrik', kip: 'pafta' });
    assert.deepStrictEqual(p.map(d => d.ad), ['BEKÇİ - ELE-01 ELEKTRİK — AYDINLATMA', 'BEKÇİ - ELE-02 ELEKTRİK — ŞEMA']);
    const e = P.dosyaPlani(L, { proje: 'BEKÇİ', bolum: 'Elektrik', kip: 'unite' }); assert.deepStrictEqual(e.map(d => d.ad), ['BEKÇİ - Elektrik']);
    const tek = P.dosyaPlani(L, { proje: 'BEKÇİ', bolum: 'TUMU', kip: 'tek' }); assert.strictEqual(tek.length, 1); assert.strictEqual(tek[0].paftalar.length, 7); assert.strictEqual(tek[0].ad, 'BEKÇİ - paftalar');
    const s = P.dosyaPlani(L, { proje: 'B', bolum: 'TUMU', kip: 'tek', secili: ['ANAEROBİK HAVUZ'] }); assert.strictEqual(s[0].paftalar.length, 3);
    assert.strictEqual(P.dosyaAdi('A/B: "C"?'), 'A_B_ _C_');
  });

  await t('SVG ayrıştırma ve dönüşüm matrisi', () => {
    const a = P.svgAgac('<svg viewBox="0 0 10 10"><g transform="translate(5,6) rotate(90)" fill="#f00"><text transform="translate(1,2)">A &amp; B</text></g></svg>');
    const g = a.ch[0].ch[0]; assert.strictEqual(g.tag, 'g'); assert.strictEqual(g.ch[0].ch[0].s, 'A & B');
    const m = P.donusum('translate(5,6) rotate(90)'); assert.ok(yakin(m[0], 0) && yakin(m[1], 1) && yakin(m[2], -1) && yakin(m[4], 5) && yakin(m[5], 6));
    assert.deepStrictEqual(P.renk('rgb(255,0,0)'), [1, 0, 0]); assert.deepStrictEqual(P.renk('#fff'), [1, 1, 1]); assert.strictEqual(P.renk('none'), null);
  });

  await t('Türkçe harfler ana fontta, Yunan harfleri ve işaretler Symbol, ✓ ZapfDingbats fontta', () => {
    const p = P.yaziParca('ĞİŞğış Ø12 Φ12 ≥');
    assert.deepStrictEqual(p[0].b.slice(0, 6), [0xD0, 0xDD, 0xDE, 0xF0, 0xFD, 0xFE]);
    assert.ok(!p[0].sym); assert.strictEqual(p[0].b[7], 0xD8); // Ø (WinAnsi)
    assert.ok(p.some(x => x.sym && x.b[0] === 0x46)); // Φ
    assert.ok(p.some(x => x.sym && x.b.includes(0xB3))); // ≥
    const z = P.yaziParca('Uygun ✓'); assert.strictEqual(z[1].sym, 'FZ'); assert.deepStrictEqual(z[1].b, [0x33]);
    assert.strictEqual(P.fontSec('"Arial Narrow", Arial, sans-serif', false, false).dar, true);
    assert.strictEqual(P.fontSec('"Arial", Arial, sans-serif', true, false).ad, 'F2');
    assert.strictEqual(P.fontSec('"Times New Roman", serif', false, true).ad, 'F7');
  });

  await t('yay → Bézier: çeyrek daire uç noktaları ve orta nokta', () => {
    const b = P.yayBezier(10, 0, 10, 10, 0, 0, 1, 0, 10); assert.strictEqual(b.length, 1);
    const [x1, y1, x2, y2, x, y] = b[0]; assert.ok(yakin(x, 0) && yakin(y, 10));
    const tt = 0.5, bx = (1 - tt) ** 3 * 10 + 3 * (1 - tt) ** 2 * tt * x1 + 3 * (1 - tt) * tt * tt * x2, by = 3 * (1 - tt) ** 2 * tt * y1 + 3 * (1 - tt) * tt * tt * y2 + tt ** 3 * 10;
    assert.ok(yakin(Math.hypot(bx, by), 10, 0.01));
    assert.strictEqual(P.yayBezier(10, 0, 10, 10, 0, 1, 1, 0, 10).length, 3); // büyük yay 270°
    assert.ok(P.yolOps('M0 0 L10 0 A5 5 0 0 0 20 0 Z').includes(' c'));
  });

  // layoutSvg biçiminde küçük bir pafta
  const svg = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
<rect x="0" y="0" width="${w}" height="${h}" fill="#fff"/>
<g fill="none" stroke-linecap="round" stroke-linejoin="round">
<defs><clipPath id="vp0"><polygon points="10,10 200,10 200,150 10,150"/></clipPath></defs><g clip-path="url(#vp0)">
<line x1="20" y1="20" x2="180" y2="20" stroke="#000" stroke-width="0.5" stroke-dasharray="6.000 3.000"/>
<polyline points="20,30 40,40 60,30" stroke="rgb(255,0,0)" stroke-width="0.25"/>
<polygon points="20,50 40,50 40,60" fill="#000" stroke="none"/>
<circle cx="100" cy="100" r="10" stroke="#000" stroke-width="0.35"/>
<path d="M120 100 A10 10 0 0 0 140 100" stroke="#000" stroke-width="0.35"/>
<g transform="translate(50,120) rotate(-0.000)" font-family='"Arial", Arial, sans-serif' font-size="4.861" fill="#000" stroke="none"><text transform="translate(0.000,-0.000) matrix(1,0,0.0000,1,0,0)">KUM TUTUCU (Ş-Ğ-İ) Ø200</text></g>
<g transform="translate(50,130) rotate(-90.000)"><path d="M0 0L2 -3L4 0" fill="none" stroke="#000" stroke-width="0.250" stroke-linecap="round" stroke-linejoin="round"/></g>
</g></g></svg>`;

  await t('SVG → PDF sayfa içeriği: çizgi, kesik çizgi, dolgu, kırpma, yazı', () => {
    const r = P.svgPdfSayfa(svg(898, 594), 898, 594);
    const c = r.icerik;
    assert.ok(c.startsWith(`${(Math.round(PT * 1000) / 1000)} 0 0 ${-(Math.round(PT * 1000) / 1000)} 0 ${Math.round(594 * PT * 1000) / 1000} cm`));
    assert.ok(c.includes('20 20 m 180 20 l S'));
    assert.ok(c.includes('[6 3] 0 d'));
    assert.ok(c.includes('1 0 0 RG'));
    assert.ok(c.includes('20 50 m 40 50 l 40 60 l h f'));
    assert.ok(c.includes('10 10 m 200 10 l 200 150 l 10 150 l h W n'));
    assert.ok(c.includes('/F1 4.861 Tf (KUM TUTUCU \\(\\336-\\320-\\335\\) \\330200) Tj'));
    assert.ok(/0 0 m 2 -3 l 4 0 l S/.test(c));
    assert.ok(r.fontlar.has('F1'));
  });

  await t('PDF dosyası: sayfa boyutu paftanın kâğıdı (mm → pt), çok sayfa + yer imi, geçerli xref', async () => {
    const sayfalar = [{ svg: svg(898, 594), w: 898, h: 594, ad: 'MİMARİ-01' }, { svg: svg(297, 420), w: 297, h: 420, ad: 'ŞEMA' }, { svg: svg(1189, 841), w: 1189, h: 841, ad: 'A0' }];
    const b = await P.pdfOlustur(sayfalar, { baslik: 'BEKÇİ - paftalar' });
    const s = Buffer.from(b).toString('latin1');
    assert.ok(s.startsWith('%PDF-1.4')); assert.ok(s.trimEnd().endsWith('%%EOF'));
    const mb = [...s.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)].map(m => [+m[1] / PT, +m[2] / PT]);
    assert.strictEqual(mb.length, 3);
    [[898, 594], [297, 420], [1189, 841]].forEach((e, i) => { assert.ok(yakin(mb[i][0], e[0], 0.01) && yakin(mb[i][1], e[1], 0.01), `sayfa ${i + 1}: ${mb[i]}`); });
    assert.ok(/\/Count 3/.test(s)); assert.ok(s.includes('/Outlines'));
    // xref uzaklıkları doğru nesneyi gösteriyor
    const xr = +s.match(/startxref\n(\d+)/)[1]; assert.ok(s.slice(xr).startsWith('xref'));
    const satir = s.slice(xr).split('\n'), adet = +satir[1].split(' ')[1];
    for (let i = 1; i < adet; i++) { const o = +satir[2 + i].slice(0, 10); assert.ok(s.slice(o).startsWith(`${i} 0 obj`), `nesne ${i}`); }
    // sıkıştırılmış içerik açılınca çizgi komutları var
    const m = s.match(/\/Length (\d+) \/Filter \/FlateDecode >>\nstream\n/);
    if (m) { const i0 = s.indexOf(m[0]) + m[0].length, ham = zlib.inflateSync(Buffer.from(s.slice(i0, i0 + +m[1]), 'latin1')).toString('latin1'); assert.ok(ham.includes('20 20 m 180 20 l S')); }
    // Türkçe başlık UTF-16
    assert.ok(s.includes('/Title <FEFF'));
  });

  await t('JPEG resim: boyut okunur, sayfaya XObject olarak girer', async () => {
    // 1×1 gri JPEG (en küçük geçerli başlık)
    const jpg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
    const bb = P.jpegBoyut(new Uint8Array(jpg)); assert.deepStrictEqual([bb.w, bb.h, bb.n], [1, 1, 1]);
    const s2 = `<svg viewBox="0 0 100 100"><image href="data:image/jpeg;base64,${jpg.toString('base64')}" x="10" y="10" width="50" height="30" preserveAspectRatio="none"/></svg>`;
    const r = P.svgPdfSayfa(s2, 100, 100); assert.strictEqual(r.resimler.length, 1); assert.ok(r.icerik.includes('50 0 0 -30 10 40 cm /Im1 Do'));
    const b = Buffer.from(await P.pdfOlustur([{ svg: s2, w: 100, h: 100 }])).toString('latin1'); assert.ok(b.includes('/Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceGray'));
  });

  console.log(`\n${n} test geçti.`);
})().catch(e => { console.error(e); process.exit(1); });

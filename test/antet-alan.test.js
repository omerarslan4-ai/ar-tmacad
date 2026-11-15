/* Antet alanları (app/antet-alan.js) — kullanıcının örnek anteti test-proje/anted.dxf (Bingazi, İngilizce; GT-14 Trafo ve jeneratör binası, A-A ve B-B kesiti):
   yazılar: "1/50" (SCALE yanında), "SEP-2026" (DATE yanında), "GT-14 ", "TRANSFORMER and GENERATOR BUİLDİNG", "A-A and B-B SECTION", "AR" (h 10,5), "Architectural",
   "BRP-CVH-PS-GT14-PS-R-AR-0002" (DRAWING NO.), "Layout Name: PP-01", "0" (REV. NO.).
   Çalıştır: node test/antet-alan.test.js */
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const A = require('../app/antet-alan.js');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

/* basit DXF yazı okuyucu: ENTITIES içindeki TEXT / MTEXT → programın yazı biçimi (io_dxf.js ile aynı hizalama kuralı) */
const dxfYazilar = dosya => {
  const S = fs.readFileSync(dosya, 'utf8').split(/\r?\n/), out = []; let bolum = '', cur = null;
  const bitir = () => {
    if (!cur) return; const g = c => { const p = cur.g.find(q => q[0] === c); return p ? p[1] : undefined; }, gn = (c, d = 0) => { const v = g(c); return v == null ? d : +v; };
    if (cur.t === 'TEXT') {
      const ha = gn(72), va = gn(73); let p = [gn(10), gn(20), 0], al = 'L';
      if (ha || va) { p = [gn(11), gn(21), 0]; const hc = ha === 1 ? 'C' : ha === 2 ? 'R' : 'L'; al = ha === 4 ? 'M' : va === 3 ? 'T' + hc : va === 2 ? 'M' + hc : va === 1 ? 'B' + hc : hc; }
      out.push({ type: 'text', p, h: gn(40, 1), s: g(1) || '', al, wf: gn(41, 1) || 1 });
    } else {
      const raw = cur.g.filter(q => q[0] === 3).map(q => q[1]).join('') + (g(1) || '');
      const s = raw.replace(/\\P/g, '\n').replace(/\\[ACFHQTWfhqtwp][^;]*;/g, '').replace(/\\[LlOoKkNX]/g, '').replace(/[{}]/g, '');
      out.push({ type: 'text', p: [gn(10), gn(20), 0], h: gn(40, 1), s, al: ['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR'][Math.max(0, Math.min(8, gn(71, 1) - 1))], mt: true });
    }
    cur = null;
  };
  for (let i = 0; i + 1 < S.length; i += 2) {
    const k = +S[i].trim(), v = S[i + 1];
    if (k === 0) { bitir(); if (v === 'ENDSEC') bolum = ''; else if (bolum === 'ENTITIES' && (v === 'TEXT' || v === 'MTEXT')) cur = { t: v, g: [] }; continue; }
    if (k === 2 && !bolum && !cur) { bolum = v.trim(); continue; }
    if (cur) cur.g.push([k, v]);
  }
  bitir(); return out;
};

const yazilar = dxfYazilar(path.join(__dirname, '..', 'test-proje', 'anted.dxf'));
const oner = A.alanOner(yazilar), alanOf = s => { const o = oner.find(q => q.s.trim() === s); return o ? o.alan : 'YOK'; };

t('örnek antet okundu: 28 TEXT + 4 MTEXT', () => { assert.strictEqual(yazilar.length, 32); });
t('öneri: 1/50 → ölçek, SEP-2026 → tarih, BRP-… → çizim no, 0 → revizyon', () => {
  assert.strictEqual(alanOf('1/50'), 'OLCEK');
  assert.strictEqual(alanOf('SEP-2026'), 'TARIH');
  assert.strictEqual(alanOf('BRP-CVH-PS-GT14-PS-R-AR-0002'), 'CIZIMNO');
  assert.strictEqual(alanOf('0'), 'REV');
});
t('öneri: AR → disiplin kodu, Architectural → disiplin adı, GT-14 → ünite, pafta adı ve yapı adı', () => {
  assert.strictEqual(alanOf('AR'), 'DISIPLIN_KOD');
  assert.strictEqual(alanOf('Architectural'), 'DISIPLIN');
  assert.strictEqual(alanOf('GT-14'), 'UNITE');
  assert.strictEqual(alanOf('A-A and B-B SECTION'), 'PAFTAADI');
  assert.strictEqual(alanOf('TRANSFORMER and GENERATOR BUİLDİNG'), 'YAPI');
});
t('öneri: "Layout Name: PP-01" → başlık korunur, değer pafta no', () => {
  const o = oner.find(q => q.s.startsWith('Layout Name'));
  assert.strictEqual(o.alan, 'PAFTANO'); assert.strictEqual(o.sablon, 'Layout Name: {PAFTANO}');
});
t('öneri yazı genişliği tahmininden bağımsız (programda gerçek yazı genişliği: SCALE 12 mm, CONTRACT NO. 27,8 mm — 1/50 sözleşme no olmamalı)', () => {
  for (const k of [0.6, 0.9, 1.05]) { const o = A.alanOner(yazilar, { genislik: (s, h) => s.length * h * k }), f = s => (o.find(q => q.s.trim() === s) || {}).alan;
    assert.deepStrictEqual([f('1/50'), f('SEP-2026'), f('0'), f('BRP-CVH-PS-GT14-PS-R-AR-0002')], ['OLCEK', 'TARIH', 'REV', 'CIZIMNO'], 'harf genişliği ' + k); }
});
t('başlıklar ve proje adı sabit kalır (SCALE, DATE, DRAWING NO., REV. NO., BENGHAZI WASTE WATER, CONTRACT NO.)', () => {
  for (const s of ['SCALE', 'DRAWING NO.', 'REV. NO.', 'BENGHAZI WASTE WATER', 'CONTRACT NO.', 'ISSUED FOR', 'DRAWN']) assert.strictEqual(alanOf(s), null, s);
  assert.ok(oner.filter(q => q.s.trim() === 'DATE').every(q => q.alan === null));
});

/* Mimari grubunda ikinci pafta: GT-14 TRAFO VE JENERATÖR BİNASI — A-A VE B-B KESİTİ */
const set = { name: 'Bingazi', antet: { cizimNoSablon: 'BRP-CVH-PS-{UNITE_KISA}-PS-R-{DISIPLIN_KOD}-{SIRA}', tarih: 'SEP-2026' } };
const M1 = { name: 'MİMARİ-01', grp: 'Mimari', size: 'A1', f: { baslik: 'GT-14 TRAFO VE JENERATÖR BİNASI — KAT PLANLARI', no: 'MİM-01' }, vps: [] };
const M2 = { name: 'MİMARİ-02', grp: 'Mimari', size: 'A1', f: { baslik: 'GT-14 TRAFO VE JENERATÖR BİNASI — A-A VE B-B KESİTİ', no: 'MİM-02' }, vps: [] };
const S1 = { name: 'STATİK-01', grp: 'Statik', size: 'A1', f: { baslik: 'GT-14 TRAFO VE JENERATÖR BİNASI — KALIP PLANI', no: 'ST-01' }, vps: [] };
const lays = [M1, S1, M2];
t('Mimari GT-14 paftası (sıra 2): çizim no BRP-CVH-PS-GT14-PS-R-AR-0002', () => {
  const v = A.antetDegerleri(M2, { set, layouts: lays, lang: 'tr', olcek: '1/50' });
  assert.strictEqual(v.CIZIMNO, 'BRP-CVH-PS-GT14-PS-R-AR-0002');
  assert.strictEqual(v.DISIPLIN_KOD, 'AR'); assert.strictEqual(v.DISIPLIN, 'Mimari'); assert.strictEqual(v.DISIPLIN_EN, 'Architectural');
  assert.strictEqual(v.UNITE, 'GT-14'); assert.strictEqual(v.UNITE_KISA, 'GT14'); assert.strictEqual(v.YAPI, 'TRAFO VE JENERATÖR BİNASI');
  assert.strictEqual(v.PAFTAADI, 'A-A VE B-B KESİTİ'); assert.strictEqual(v.SIRA, '0002'); assert.strictEqual(v.OLCEK, '1/50'); assert.strictEqual(v.TARIH, 'SEP-2026');
  assert.strictEqual(v.PAFTANO, 'MİM-02'); assert.strictEqual(v.BASLIK, M2.f.baslik);
});
t('İngilizce proje dilinde disiplin adı Architectural', () => { assert.strictEqual(A.antetDegerleri(M2, { set, layouts: lays, lang: 'en' }).DISIPLIN, 'Architectural'); });
t('Statik paftada disiplin kodu ST, sıra 0001', () => {
  const v = A.antetDegerleri(S1, { set, layouts: lays, lang: 'tr' });
  assert.strictEqual(v.DISIPLIN_KOD, 'ST'); assert.strictEqual(v.CIZIMNO, 'BRP-CVH-PS-GT14-PS-R-ST-0001');
});
t('disiplin kodu proje ayarından değiştirilir; pafta sıra no ve elle çizim no öncelikli', () => {
  const s2 = { antet: Object.assign({}, set.antet, { disiplin: { Mimari: { kod: 'A' } } }) };
  assert.strictEqual(A.antetDegerleri(M2, { set: s2, layouts: lays }).CIZIMNO, 'BRP-CVH-PS-GT14-PS-R-A-0002');
  const M3 = Object.assign({}, M2, { f: Object.assign({}, M2.f, { sira: 7 }) });
  assert.strictEqual(A.antetDegerleri(M3, { set, layouts: lays }).SIRA, '0007');
  const M4 = Object.assign({}, M2, { f: Object.assign({}, M2.f, { cizimNo: 'ELLE-001' }) });
  assert.strictEqual(A.antetDegerleri(M4, { set, layouts: lays }).CIZIMNO, 'ELLE-001');
});
t('eski projeler (antet bilgisi yok): eski yer tutucular aynı, boş parçalar çizim nodan düşer', () => {
  const L = { name: 'Düzen1', grp: 'Genel', size: 'A1', f: { proje: 'X', baslik: 'GENEL VAZİYET', cizen: 'Ö', no: '01', rev: 'A' }, vps: [] };
  const v = A.antetDegerleri(L, { set: { name: 'X' }, layouts: [L], olcek: '1/100', bugun: '15.11.2026', dosya: 'X' });
  assert.deepStrictEqual([v.PROJE, v.BASLIK, v.CIZEN, v.TARIH, v.OLCEK, v.NO, v.PAFTANO, v.REV, v.KAGIT, v.DUZEN], ['X', 'GENEL VAZİYET', 'Ö', '15.11.2026', '1/100', '01', '01', 'A', 'A1', 'Düzen1']);
  assert.strictEqual(v.PAFTAADI, 'GENEL VAZİYET'); assert.strictEqual(v.UNITE, '');
  assert.strictEqual(v.CIZIMNO, 'GN-0001'); // varsayılan şablon, proje / firma kodu ve ünite boş
});
t('alan uygulama: s0 saklanır, "Sabit" ile geri alınır', () => {
  const E = [{ type: 'text', p: [0, 0, 0], h: 2.6, s: 'Layout Name: PP-01' }, { type: 'text', p: [0, 0, 0], h: 2.6, s: '1/50' }];
  assert.strictEqual(A.alanUygula(E, { 0: 'PAFTANO', 1: 'OLCEK' }), 2);
  assert.strictEqual(E[0].s, 'Layout Name: {PAFTANO}'); assert.strictEqual(E[0].s0, 'Layout Name: PP-01'); assert.strictEqual(E[1].s, '{OLCEK}');
  A.alanUygula(E, { 1: '' }); assert.strictEqual(E[1].s, '1/50'); assert.strictEqual(E[1].s0, undefined);
});
console.log(`\n${n} test geçti.`);

/* Yapı türüne göre statik çözüm yolu — tür önerisi (app/hesap/statik-yapi-turu.js › P.yapiTuru, P.yapiSecim).
   Kural: docs/tasarim-standartlari.md › "Yapı türüne göre statik çözüm yolu" (14.11.2026): su yapısı / gömülü alt yapı + üst yapı / yalnız üst yapı.
   Gerçek modeller: Konya isale terfi merkezi (araclar/konya-terfi-uret.js → alt + üst, alt yapı üst kotu −0,26 = perde üstü),
   bekçi binası (test/veri/bekci-statik.json → yalnız üst yapı: 20 cm temel perdesinin üstü +1,05 tretuvar üstünün +0,90 üstünde),
   kolonsuz dikdörtgen hazne (→ su yapısı), yalnız kolon / kirişli model (kabuk kurulamaz → yalnız üst yapı).
   Çalıştır: node test/statik-yapi-turu.test.js */
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const O = require('./statik-ortam.js'), P = O.pencere();
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };

const konya = O.modelCevir(O.konyaDoc()).d;
t('Konya terfi: gömülü alt yapı + üst yapı; alt yapı üst kotu = zeminin altındaki perde üstü (−0,26)', () => {
  const y = P.yapiTuru(konya);
  assert.strictEqual(y.tur, 'altUst'); assert.strictEqual(y.altUstKot, -0.26); assert.strictEqual(y.gomulu, 4);
  assert.strictEqual(konya.zeminKot, -0.1, 'en yüksek toprak / tretuvar: tretuvar üstü −0,20 + 0,10');
  assert.ok(y.neden.some(s => /zeminin altında/.test(s)) && y.neden.some(s => /kolonlu/.test(s)));
});

const bekciYol = path.join(O.KOK, 'test/veri/bekci-statik.json');
{
  t('Bekçi binası: yalnız üst yapı (temel perdesi zeminin üstüne çıkıyor, 4 kolon + 4 kiriş)', () => {
    const d = O.modelCevir(JSON.parse(fs.readFileSync(bekciYol, 'utf8')).doc).d, y = P.yapiTuru(d);
    assert.strictEqual(y.tur, 'ust', JSON.stringify(y)); assert.strictEqual(y.altUstKot, null); assert.strictEqual(d.zeminKot, 0.9);
    assert.strictEqual(d.cerceve.kolonlar.length, 4); assert.strictEqual(d.cerceve.kirisler.length, 4);
  });
}

/* basit model belgeleri (ArıtmaCAD nesneleri) */
const belge = ents => ({ ents: ents.map((e, i) => Object.assign({ id: i + 1, layer: '0' }, e)), layers: {}, set: {} });
const perde = (pts, o) => Object.assign({ type: 'perde', pts, closed: false, tb: 0.3, tt: 0.3, egim: 'R', hiza: 'O', ofs: 0, malz: 'beton', z0: 0.4, h: 4 }, o);
const hazne = (ek) => belge([
  { type: 'plak', kind: 'radye', pts: [[-0.5, -0.5], [8.5, -0.5], [8.5, 5.5], [-0.5, 5.5]], t: 0.4, zt: 0.4 },
  perde([[0, 0], [8, 0]]), perde([[8, 0], [8, 5]]), perde([[8, 5], [0, 5]]), perde([[0, 5], [0, 0]]),
  ...(ek || []),
]);
t('kolonsuz dikdörtgen hazne: su yapısı (yalnız 3B kabuk)', () => {
  const d = O.modelCevir(hazne()).d; assert.ok(!d.hata, d.hata); const y = P.yapiTuru(d);
  assert.strictEqual(y.tur, 'su'); assert.strictEqual(y.altUstKot, null);
  // zemine gömülü (toprak perde üstünde) ama üstünde kat yok: yine su yapısı
  const b = hazne([{ type: 'tretuvar', pts: [[0, 0], [8, 0], [8, 5], [0, 5]], w: 1, zg: 4.6, h: 0.1 }]), d2 = O.modelCevir(b).d;
  assert.strictEqual(P.yapiTuru(d2).tur, 'su'); assert.strictEqual(P.yapiTuru(d2).gomulu, 4);
});
t('hazne üstünde kolonlu kat: gömülüyse alt + üst; su varsa gömülü olmasa da alt + üst; ikisi de yoksa yalnız üst yapı', () => {
  const kol = [[0, 0], [8, 0], [8, 5], [0, 5]].map(p => ({ type: 'kolon', sek: 'R', b: 0.4, d: 0.4, h: 7.5, z0: 0.4, p: [p[0], p[1], 0] }));
  const kir = [{ type: 'kiris', a: [0, 0, 0], b: [8, 0, 0], bw: 0.3, hb: 0.5, zt: 7.9 }];
  const gom = O.modelCevir(hazne(kol.concat(kir, [{ type: 'tretuvar', pts: [[0, 0], [8, 0], [8, 5], [0, 5]], w: 1, zg: 4.5, h: 0.2 }]))).d, y1 = P.yapiTuru(gom);
  assert.strictEqual(y1.tur, 'altUst'); assert.strictEqual(y1.altUstKot, 4.4);
  const ac = O.modelCevir(hazne(kol.concat(kir))).d;                         // zemin kotu yok, su bilinmiyor
  assert.strictEqual(P.yapiTuru(ac).tur, 'ust');
  assert.strictEqual(P.yapiTuru(Object.assign({}, ac, { su: true })).tur, 'altUst', 'susuz kat altında dolu hazne');
  assert.strictEqual(P.yapiTuru(Object.assign({}, ac, { su: true })).altUstKot, 4.4);
});
t('yalnız kolon / kiriş / döşeme (perde, radye yok): kabuk kurulamaz, çerçeve yine gönderilir → yalnız üst yapı', () => {
  const kol = [[0, 0], [5, 0], [5, 4], [0, 4]].map(p => ({ type: 'kolon', sek: 'R', b: 0.3, d: 0.3, h: 3, z0: 0, p: [p[0], p[1], 0] }));
  const d = O.modelCevir(belge(kol.concat([{ type: 'kiris', a: [0, 0, 0], b: [5, 0, 0], bw: 0.25, hb: 0.5, zt: 3 }, { type: 'plak', kind: 'doseme', pts: [[0, 0], [5, 0], [5, 4], [0, 4]], t: 0.15, zt: 3 }]))).d;
  assert.ok(!d.hata && d.cerceve && !d.kabuk, JSON.stringify(d).slice(0, 200));
  assert.strictEqual(P.yapiTuru(d).tur, 'ust');
});
t('projeye kayıtlı seçim (statikAyar.yapiTuru / altUstKot) öneriden önce gelir; alan yoksa öneri (eski projeler)', () => {
  const s0 = P.yapiSecim(konya, {}); assert.deepStrictEqual([s0.tur, s0.altUstKot, s0.elle], ['altUst', -0.26, false]);
  const s1 = P.yapiSecim(konya, { yapiTuru: 'su' }); assert.deepStrictEqual([s1.tur, s1.elle, s1.oneri.tur], ['su', true, 'altUst']);
  const s2 = P.yapiSecim(konya, { altUstKot: -1.5 }); assert.deepStrictEqual([s2.tur, s2.altUstKot, s2.elleKot], ['altUst', -1.5, true]);
  const s3 = P.yapiSecim(konya, { yapiTuru: 'bilinmeyen' }); assert.strictEqual(s3.tur, 'altUst');
  const s4 = P.yapiSecim(Object.assign({}, konya, { statikAyar: { yapiTuru: 'ust' } })); assert.strictEqual(s4.tur, 'ust', 'model verisindeki proje ayarı okunur');
});

console.log(`\n${n} test geçti.`);

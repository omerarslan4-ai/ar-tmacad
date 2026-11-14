/* Gömülü alt yapı + üst yapı iki aşamalı çözüm (app/hesap/statik-iki-asama.js; kabuk düğüm yükleri app/hesap/statik-kabuk.js;
   kolon ayağı tepkileri app/hesap/statik-cerceve3b.js). Kural: docs/tasarim-standartlari.md › "Yapı türüne göre statik çözüm yolu", 2.
   Konya isale terfi merkezi: alt yapı üst kotu −0,26 (pompa holü perdeleri), üst yapı 10 kolon 50/50 (−0,26 → +5,24), 5 + 2 çatı kirişi,
   15 cm çatı döşemesi, 8 vinç gusesi. Denetimler:
     • üst yapı çerçevesinde yalnız kotun üstündekiler; kolon ayakları kotta;
     • kolon ayağı tepkileri toplamı = üst yapıya uygulanan düşey yük (G, Q) ve deprem tepkileri toplamı = taban kesme kuvveti;
       elle kaba ağırlık (çatı döşemesi + kirişler + kolonlar + guse) ile %6 içinde;
     • alt yapı kabuğunda düşey denge: radye yay tepkileri toplamı = kabuk öz ağırlığı + aktarılan G tepkileri.
   Çalıştır: node test/statik-iki-asama.test.js */
'use strict';
const assert = require('assert');
const O = require('./statik-ortam.js'), P = O.pencere();
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
const yak = (a, b, e, m) => assert.ok(Math.abs(a - b) <= e, `${m || ''} ${a} ≉ ${b} (±${e})`);

const { d } = O.modelCevir(O.konyaDoc()), S = O.uygula(P.ornekSaray(), JSON.parse(JSON.stringify(d)));
const IA = P.ikiAsamaHazirla(S);

t('yalnız alt + üst yapıda çalışır (su yapısı / yalnız üst yapıda null)', () => {
  assert.ok(IA && IA.kot === -0.26);
  for (const tur of ['su', 'ust']) assert.strictEqual(P.ikiAsamaHazirla(Object.assign({}, S, { yapi: { tur, altUstKot: -0.26 } })), null);
});
t('Konya üst yapı çerçevesi: 10 kolon −0,26 kotunda başlar, yalnız çatı kirişleri ve çatı döşemesi; galeri elemanları alt yapıda', () => {
  assert.strictEqual(IA.cer.kolonlar.length, 10); assert.ok(IA.cer.kolonlar.every(c => c.z0 === -0.26 && c.altKes));
  assert.strictEqual(IA.cer.kirisler.length, 7); assert.ok(IA.cer.kirisler.every(k => k.zt === 5.24));
  assert.deepStrictEqual(IA.cer.dosemeler.map(x => x.zt), [5.24]); assert.strictEqual(IA.cer.perdeler.length, 0);
  assert.ok(IA.S.kabuk.kirisler.every(k => k.zt <= -0.26 + 0.15) && IA.S.kabuk.kirisler.length === 7, 'kabukta yalnız galeri kirişleri');
  assert.ok(IA.RC && IA.RC.deprem.cer3B, '3B çerçeve analizi yapılmış olmalı');
});
const RC = IA.RC, D3 = RC.deprem.cer3B, T = IA.T;
t('kolon ayağı tepkileri: ΣG / ΣQ = üst yapıya uygulanan yük; deprem ΣF = taban kesme kuvveti; 3B sonuçtan', () => {
  assert.strictEqual(T.length, 10); assert.ok(T.every(q => q.k3B && q.z === -0.26));
  const g = P.tepkiToplam(T, 'G'), q = P.tepkiToplam(T, 'Q');
  yak(g[2], D3.yukTop.G, 1e-3 * Math.abs(D3.yukTop.G), 'ΣG'); yak(q[2], D3.yukTop.Q, 1e-3 * Math.abs(D3.yukTop.Q), 'ΣQ');
  yak(g[0], 0, 0.5); yak(g[1], 0, 0.5);
  for (const [c, k, dd] of [['EX+', 0, 'X'], ['EY+', 1, 'Y']]) { const e = P.tepkiToplam(T, c); yak(e[k], D3.yon[dd].Vt, 1e-3 * D3.yon[dd].Vt, 'taban kesmesi ' + dd); yak(e[2], 0, 0.5, 'deprem düşey toplamı'); }
  // elle kaba üst yapı ağırlığı: çatı döşemesi (25·0,15 + 1,5 kaplama) · 20,7 · 9,0 + enine kirişler 5 · 0,5 · 0,65 · 8 · 25 + boyuna 2 · 0,3 · 0,35 · 19,7 · 25
  //                               + kolonlar 10 · 0,25 · 5,5 · 25 + guse 8 · 5 kN  ≈ 1790 kN
  const el = (25 * 0.15 + 1.5) * 20.7 * 9.0 + 5 * 0.5 * 0.65 * 8 * 25 + 2 * 0.3 * 0.35 * 19.7 * 25 + 10 * 0.25 * 5.5 * 25 + 8 * 5;
  assert.ok(Math.abs(-g[2] - el) < 0.06 * el, `ΣG ${-g[2]} ≈ elle ${el}`);
  // vinç tekerlek yükü Q: 8 guse · 55 kN = 440 kN Q'nun içinde
  assert.ok(-q[2] > 8 * 55, 'ΣQ guse yüklerini içermeli: ' + (-q[2]));
});
t('kabuk yüklerine eşleme: G, Q aynen; ESX / ESY = −(EX+ / EY+) — kabuktaki atalet yönü', () => {
  const Y = IA.S.kabuk.kolonYuk; assert.strictEqual(Y.length, 10);
  for (let i = 0; i < Y.length; i++) { assert.deepStrictEqual(Y[i].F.G, T[i].F.G); assert.deepStrictEqual(Y[i].F.ESX, T[i].F['EX+'].map(v => -v)); assert.deepStrictEqual(Y[i].F.ESY, T[i].F['EY+'].map(v => -v));
    Y[i].F.ESX.forEach((v, k) => yak(v + Y[i].F.TX[k], -T[i].F['EX-'][k], 1e-9, '−%5: ESX + TX = −(EX−)')); Y[i].F.ESY.forEach((v, k) => yak(v + Y[i].F.TY[k], -T[i].F['EY-'][k], 1e-9)); }
});

const r = P.kabukHesap(IA.S), AG = r.AG;
t('alt yapı kabuğu: tepkiler kolonun oturduğu perde üst düğümüne; düşey denge (radye yayları = kabuk öz ağırlığı + aktarılan G)', () => {
  assert.ok(r.bilgi.some(s => /10 kolon ayağı tepkisi/.test(s)));
  assert.ok(r.U.TX && r.U.TY && r.KV.some(k => /\(−%5\)/.test(k.ad) && k.f.TX), '−%5 dışmerkezlik kombinasyonları (zarf)');
  const KY = AG.dugumYuk.G.filter(q => /^S\d+$/.test(q.ad || '')), DY = AG.dugumYuk.G.filter(q => / üstü\)$/.test(q.ad || ''));
  assert.strictEqual(KY.length, 10); assert.strictEqual(KY.length + DY.length, AG.dugumYuk.G.length, 'kolon + duvar yükleri'); for (const q of KY) { const p = AG.nodes[q.n]; assert.ok(AG.els.some(e => e.tur === 'perde' && e.n.includes(q.n)), 'perde düğümü'); yak(p[2], -0.26 - 0.075, 1e-6, 'perde üstü = galeri döşemesi orta düzlemi'); }
  const kz = S.zemin.kw, trib = new Float64Array(AG.nodes.length); for (const e of AG.els) if (e.tur === 'radye') for (const k of e.n) trib[k] += e.A / 4;
  const yay = c => { let s = 0; for (let i = 0; i < AG.nodes.length; i++) if (trib[i] > 0) s += -kz * trib[i] * r.U[c][i * 6 + 2]; return s; };
  const gc = S.mal.gc; let Wk = 0; for (const e of AG.els) Wk += gc * e.t * e.A + (e.tur === 'doseme' ? (IA.S.kabuk.dosemeler[+e.grp.slice(1)].g || 0) * e.A : 0); for (const b of AG.bars) Wk += gc * b.s.A * b.L;
  // radye üstüne oturan ölü / hareketli yükler (taban betonu 49,71 m³, kaideler, dolgu 62,63 m³): P.radyeUstYuk — radye eleman merkezine göre dağıtılır
  const RY = P.radyeUstYuk(IA.S); assert.ok(RY.some(y => /taban betonu/.test(y.ad)) && RY.some(y => y.tur === 'dolgu') && RY.length === 5);
  let rG = 0, rQ = 0; for (const e of AG.els) if (e.tur === 'radye') { const X = e.n.map(i => AG.nodes[i]), c = [(X[0][0] + X[2][0]) / 2, (X[0][1] + X[2][1]) / 2]; for (const y of RY) { let ic = false; const q = y.pts; for (let i = 0, j = q.length - 1; i < q.length; j = i++) if ((q[i][1] > c[1]) !== (q[j][1] > c[1]) && c[0] < (q[j][0] - q[i][0]) * (c[1] - q[i][1]) / (q[j][1] - q[i][1]) + q[i][0]) ic = !ic; if (ic) { rG += y.pG * e.A; rQ += y.pQ * e.A; } } }
  yak(rG, RY.reduce((s, y) => s + y.G, 0), 0.03 * rG, 'radye üstü yük ağda (ızgara yaklaşığı)');
  // cephe ve bölme tuğla duvarları (galeri kotunda, perde / galeri döşemesi üstünde): 44,388 m³ × 12 kN/m³ = 532,7 kN — kabuğa yük
  /* duvar hacimleri elle (araclar/konya-terfi-uret.js ölçüleri): cephe B 19,70 × 5,00 (galeri +205,41 → boyuna kiriş altı +210,41) × 0,20 = 19,70 m³
     − 11 alt pencere 0,70 × 1,50 (9 cephe + 2 kumanda odası) − 3 üst pencere 3,00 × 0,60 − 5 kolon izi 0,50 × 0,20 × 5,00 = 19,70 − 2,31 − 1,08 − 2,50 = 13,81 m³;
     cephe A aynı, kumanda odası pencereleri yok: 19,70 − 1,89 − 1,08 − 2,50 = 14,23 m³ */
  const DV = IA.S.temel.duvar, vB = DV.find(e => /Cephe duvarı B/.test(e.ad)).V, vA = DV.find(e => /Cephe duvarı A/.test(e.ad)).V;
  yak(vB, 19.7 - 11 * 0.7 * 1.5 * 0.2 - 3 * 3.0 * 0.6 * 0.2 - 5 * 0.5 * 0.2 * 5.0, 1e-3, 'cephe B net hacim'); yak(vA, 19.7 - 9 * 0.7 * 1.5 * 0.2 - 3 * 3.0 * 0.6 * 0.2 - 5 * 0.5 * 0.2 * 5.0, 1e-3, 'cephe A net hacim');
  const tW = DY.reduce((s, q) => s - q.f[2], 0); yak(tW, DV.reduce((s, e) => s + e.V, 0) * P.TEMEL_GAMMA_TUGLA, 1e-6, 'duvar ağırlığı'); yak(tW, 44.388 * P.TEMEL_GAMMA_TUGLA, 0.01);
  // deprem: duvar ataleti kh·W (kabuğun kh'si), ESX / ESY'de −X / −Y yönünde; kaçıklık momenti düğümde
  const kh = P.itki(IA.S).kh, ex = (AG.dugumYuk.ESX || []).filter(q => / üstü\)$/.test(q.ad || '')), ey = (AG.dugumYuk.ESY || []).filter(q => / üstü\)$/.test(q.ad || ''));
  yak(ex.reduce((s, q) => s + q.f[0], 0), -kh * tW, 1e-6, 'ESX duvar ataleti'); yak(ey.reduce((s, q) => s + q.f[1], 0), -kh * tW, 1e-6, 'ESY duvar ataleti'); assert.ok(ex.some(q => Math.abs(q.f[4]) > 1e-6), 'ağırlık merkezi yüksekliğinden moment');
  assert.ok(r.bilgi.some(s => /perde ya da döşeme üstündeki duvar/.test(s)) && !(r.duvarUyar || []).length, 'Konya: yeri bulunamayan duvar yok'); assert.ok(DY.some(q => /bölme duvarı \(döşeme üstü\)/.test(q.ad)) && DY.filter(q => /perde üstü/.test(q.ad)).length > 30);
  const tG = -P.tepkiToplam(T, 'G')[2]; yak(yay('G'), Wk + rG + tG + tW, 1e-3 * (Wk + rG + tG + tW), 'G dengesi');
  let Wq = 0; for (const e of AG.els) if (e.tur === 'doseme') Wq += (IA.S.kabuk.dosemeler[+e.grp.slice(1)].q || 0) * e.A; const tQ = -P.tepkiToplam(T, 'Q')[2]; yak(yay('Q'), Wq + rQ + tQ, 1e-3 * (Wq + rQ + tQ), 'Q dengesi');
  // tepkisiz çözümle fark = yalnız aktarılan yük (doğrusal)
  const S0 = Object.assign({}, IA.S, { kabuk: Object.assign({}, IA.S.kabuk, { kolonYuk: [] }), temel: Object.assign({}, IA.S.temel, { duvar: [] }) }), r0 = P.kabukHesap(S0);
  let fark = 0; for (let i = 0; i < AG.nodes.length; i++) if (trib[i] > 0) fark += -kz * trib[i] * (r.U.G[i * 6 + 2] - r0.U.G[i * 6 + 2]); yak(fark, tG + tW, 1e-3 * (tG + tW), 'aktarılan G (kolon + duvar)');
});
t('üst yapısında perde olan yapı: kotun üstüne çıkan perde kabukta kotta kesilir; perdeye mesnetli kiriş uçlarının tepkileri ve perdenin üst kısmının ağırlığı alt yapıya aktarılır (denge)', () => {
  // 8 × 5 m gömülü hazne (perde üstü +4,40), B perdesi (y = 0) +7,40'a çıkar; arkada iki kolon (+7,40), kirişler ve döşeme +7,40'ta
  const S1 = P.ornekSaray(), kAlt = 0, hr = 0.4, gc = S1.mal.gc;
  const duvar = (ad, a, b, zt) => ({ id: ad, ad, pts: [a, b], kapali: false, t: 0.3, zt, tip: 'dis' });
  S1.kabuk = { walls: [duvar('P1', [0, 0], [8, 0], 7.4), duvar('P2', [8, 0], [8, 5], 4.4), duvar('P3', [8, 5], [0, 5], 4.4), duvar('P4', [0, 5], [0, 0], 4.4)], radye: { id: 9, pts: [[-0.5, -0.5], [8.5, -0.5], [8.5, 5.5], [-0.5, 5.5]], t: hr, kAlt }, dosemeler: [],
    kolonlar: [{ id: 21, no: 'S1', x: 0, y: 5, bx: 0.4, by: 0.4, z0: 0.4, zt: 7.4 }, { id: 22, no: 'S2', x: 8, y: 5, bx: 0.4, by: 0.4, z0: 0.4, zt: 7.4 }], kirisler: [] };
  S1.cer = { kolonlar: S1.kabuk.kolonlar.map(c => Object.assign({}, c)), kirisler: [{ id: 31, no: 'K1', a: [0, 0], b: [0, 5], bw: 0.3, hb: 0.5, zt: 7.4 }, { id: 32, no: 'K2', a: [8, 0], b: [8, 5], bw: 0.3, hb: 0.5, zt: 7.4 }, { id: 33, no: 'K3', a: [0, 5], b: [8, 5], bw: 0.3, hb: 0.5, zt: 7.4 }],
    dosemeler: [{ id: 41, no: 'D1', pts: [[0, 0], [8, 0], [8, 5], [0, 5]], t: 0.15, zt: 7.4 }], perdeler: [{ a: [0, 0], b: [8, 0], t: 0.3, z0: 0.4, zt: 7.4 }, { a: [8, 0], b: [8, 5], t: 0.3, z0: 0.4, zt: 4.4 }, { a: [8, 5], b: [0, 5], t: 0.3, z0: 0.4, zt: 4.4 }, { a: [0, 5], b: [0, 0], t: 0.3, z0: 0.4, zt: 4.4 }], ayar: P.cerceveVars() };
  S1.geo = Object.assign(S1.geo, { kAlt, kUst: 4.4, kZemin: 4.5, kSu: 0.4, kYAS: null, hr }); S1.mod = 'kabuk'; S1.suYapisi = false; S1.dep.SDS = 0.4; S1.tas.kmesh = 0.5; S1.yapi = { tur: 'altUst', altUstKot: 4.4 };
  const I = P.ikiAsamaHazirla(S1), D3 = I.RC.deprem.cer3B;
  assert.ok(I.S.kabuk.walls.every(w => w.zt === 4.4) && I.S.kabuk.walls[0].ztUst === 7.4, 'perde kabukta kotta kesilir');
  assert.ok(I.cer.perdeler.length === 1 && I.cer.perdeler[0].z0 === 4.4, 'çerçevede yalnız perdenin üst kısmı');
  const pm = I.T.filter(q => q.perde); assert.ok(pm.length >= 2, 'perdeye mesnetli kiriş uçları: ' + pm.length);
  const tG = -P.tepkiToplam(I.T, 'G')[2]; yak(tG, -D3.yukTop.G, 1e-3 * tG, 'kolon + perde mesnet tepkileri = üst yapı G');
  const tX = P.tepkiToplam(I.T, 'EX+'); yak(tX[0], D3.yon.X.Vt, 1e-3 * D3.yon.X.Vt, 'deprem tepkileri toplamı = taban kesmesi');
  const Wust = gc * 0.3 * 8 * 3; yak(-I.UP.reduce((s, q) => s + q.F.G[2], 0), Wust, 1e-6, 'perde üst kısmı ağırlığı');
  const kh = P.itki(S1).kh; assert.ok(kh > 0); yak(I.UP.reduce((s, q) => s + q.F['EX+'][0], 0), kh * Wust / 2, 1e-6, 'perde üst kısmının çerçeveye girmeyen ataleti (kh·W/2)');
  assert.ok(/üst kısmı bu hesapta tasarlanmadı/.test(P.ikiAsamaRapor(I)), 'raporda açık not');
  const r = P.kabukHesap(I.S), AG = r.AG, kz = S1.zemin.kw, trib = new Float64Array(AG.nodes.length); for (const e of AG.els) if (e.tur === 'radye') for (const k of e.n) trib[k] += e.A / 4;
  let yay = 0; for (let i = 0; i < AG.nodes.length; i++) if (trib[i] > 0) yay += -kz * trib[i] * r.U.G[i * 6 + 2];
  let Wk = 0; for (const e of AG.els) Wk += gc * e.t * e.A; for (const b of AG.bars) Wk += gc * b.s.A * b.L;
  yak(yay, Wk + tG + Wust, 1e-3 * (Wk + tG + Wust), 'alt yapı G dengesi');
});

t('rapor bölümü: çözüm yolu, aktarılan tepkiler tablosu (10 kolon + toplam) ve denge satırı', () => {
  const h = P.ikiAsamaRapor(IA); assert.ok(/İKİ AŞAMALI ÇÖZÜM/.test(h) && /Üst yapıdan alt yapıya aktarılan kolon ayağı tepkileri/.test(h) && /Denge:/.test(h));
  assert.strictEqual((h.match(/<tr><td class="l">/g) || []).length, 10);
  const o = P.ikiAsamaOzet(IA); assert.ok(/iki aşama/.test(o) && /10 kolon ayağı tepkisi/.test(o));
  const l = P.elemanListesiHtml(S); assert.ok(/Statik eleman listesi/.test(l) && /Alt yapı \(m³\)/.test(l));
});

t('Konya sonucu (14.11.2026): üst yapı UYGUN; alt yapıda perde ve radye mevcut kalınlıklarla yeterli, yalnız galeri döşemesi kesmesi; öneri firma aralığında', () => {
  assert.ok(RC.ok, 'üst yapı çerçevesi'); assert.ok(RC.kolonlar.every(c => c.ok));
  const yet = r.tasarim.filter(T => T.katman.some(k => !k.sec.ok) || !T.kesme.ok).map(T => T.eleman); assert.deepStrictEqual(yet, ['D5 döşeme'], 'yetmeyen: ' + yet.join(', '));
  assert.ok(r.qmax <= S.zemin.sig, 'zemin gerilmesi ' + r.qmax);
  const o = P.kabukOnerHesap(S); assert.ok(o.yeterli, o.sinir.join(' | ')); assert.deepStrictEqual(o.log, ['D5 25 cm']);
  const L = P.kabukSinir(o.kabuk); o.kabuk.walls.forEach((w, i) => assert.ok(w.t <= Math.min(0.70, L.perde[i].max) + 1e-9, w.ad));
  assert.deepStrictEqual(o.kabuk.walls.map(w => w.t), [0.5, 0.6, 0.4, 0.4], 'perdeler değişmez'); assert.strictEqual(o.kabuk.radye.t, 0.6);
});

console.log(`\n${n} test geçti.`);

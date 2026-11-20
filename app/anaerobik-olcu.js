/* ArıtmaCAD — ANAEROBİK HAVUZ PLAN AKSLARI VE ÖLÇÜLERİ (kullanıcı kararı 20.11.2026; docs/tasarim-standartlari.md → Anaerobik havuz)
   Havuz çizilince (ANAEROBIK, ünite kartında "Çiz") planına mimari plan düzeninde aks ve ölçü koyar:
   - Akslar duvar eksenlerinde. Boyuna (1, 2, 3 …): kanal dış duvarları, halka uç duvarları, yarım daire merkezleri.
     Enine (A üstte): dış duvarlar, orta perdeler, halkalar arası duvarlar.
   - Dışta, altta ve solda içten dışa: "dış yüz – akslar – dış yüz" zinciri, toplam. İlk sıra çizimin en dış çizgisinden
     (tretuvar ve alt açıklama yazısı) ilkSira mm, sıralar arası modelde siraModel (kural tablosu: MIMARI.olcuYeri.genel — 14 mm, 0,25 m).
   - Ünite içinde: koridor net enleri ve perdeler (enine zincir), düz boy ve yarım daire yarıçapı, kanal enleri ve duvarları,
     kanal boyları ile ağızların yeri, pencerelerin ve orifisin eni ve yeri, köprü / yürüyüş yolu eni ve yeri, yarıçaplar.
   Ölçüler gerçek ölçü nesnesidir (PLAN_OLCU katmanı → çıktıda ÖL), havuza bağlıdır (bag, oto: 'ANAOLCU') ve havuz değişince yenilenir.
   Saf kısım (olcuPlan: yerel koordinatta aks ve ölçü listesi) Node ile denenir: node test/anaerobik-olcu.test.js */
(function (C) {
  'use strict';
  const r3 = v => Math.round(v * 1000) / 1000;
  const tek = v => { const s = v.slice().sort((a, b) => a - b), q = []; for (const x of s) if (!q.length || x - q[q.length - 1] > 0.005) q.push(r3(x)); return q; };

  /* G: anaerobikGeo sonucu. o: { mm: 1 kâğıt mm'nin modeldeki boyu (m), ilk (mm), sira (m), balonR, balonOte (mm) }
     Döner: { aks: { xs, ys }, zincir: [{ grup, yon: 'x' | 'y', nok: [..], t: ölçülen noktaların öbür eksendeki yeri, p: ölçü çizgisinin yeri }],
              yaricap: [{ grup, c: [x, y], r, ang }], balon: { ALT, SOL } (aks ucundan balon kenarına kâğıt mm) } — hepsi havuzun yerel koordinatında */
  function olcuPlan(G, o) {
    o = o || {}; const q = G.q, n = G.n, mm = o.mm || 0.05, ilk = o.ilk == null ? 14 : o.ilk, sira = o.sira == null ? 0.25 : o.sira, bR = o.balonR == null ? 6 : o.balonR, bO = o.balonOte == null ? 11 : o.balonOte;
    const R2 = q.Ro + q.two, xo1 = G.xR + q.bC, yb = G.kanal.yb, yt = G.kanal.yt, Z = [], Y = [];
    // ---- akslar (duvar eksenleri) ----
    const xs = tek([q.tK / 2, G.xc1 - q.Ro - q.two / 2, G.xc1, G.xc2, G.xc2 + q.Ro + q.two / 2, G.Lo - q.tK / 2]);
    const ys = [q.two / 2]; for (let i = 0; i < n; i++) ys.push(G.yc[i], G.yc[i] + q.Ro + q.two / 2);
    const aks = { xs, ys: tek(ys) };
    // ---- dış sıralar: altta ve solda (çizimin en dış çizgisi: tretuvar; altta açıklama yazısı −1,4 m'de) ----
    const altDis = Math.min(yb, 0) - Math.max(q.tre, 1.4 + 3 * mm), solDis = -q.tre;
    const yA1 = altDis - ilk * mm, yA2 = yA1 - sira, xS1 = solDis - ilk * mm, xS2 = xS1 - sira;
    Z.push({ grup: 'aks', yon: 'x', nok: tek([0, ...aks.xs, G.Lo]), t: 0, p: r3(yA1) }, { grup: 'toplam', yon: 'x', nok: [0, r3(G.Lo)], t: 0, p: r3(yA2) });
    Z.push({ grup: 'aks', yon: 'y', nok: tek([0, ...aks.ys, G.Wo]), t: 0, p: r3(xS1) }, { grup: 'toplam', yon: 'y', nok: [0, r3(G.Wo)], t: 0, p: r3(xS2) });
    const balon = { ALT: r3((aks.ys[0] - (yA2 - bO * mm)) / mm - bR), SOL: r3((aks.xs[0] - (xS2 - bO * mm)) / mm - bR) };
    // ---- halka ve koridor enleri: enine zincir (duvar – koridor – orta perde – koridor – duvar …) ----
    { const nok = [0]; for (let i = 0; i < n; i++) { const y = G.yc[i]; nok.push(y - q.Ro, y - q.tw / 2, y + q.tw / 2, y + q.Ro); } nok.push(G.Wo);
      const x = r3(G.xc1 + 0.18 * q.Ls); Z.push({ grup: 'koridor', yon: 'y', nok: tek(nok), t: x, p: x }); }
    // ---- düz boy ve yarım daireler: son halkanın üst koridorunda, orta perdenin üstünde ----
    { const y = G.yc[n - 1] + q.tw / 2; Z.push({ grup: 'duzboy', yon: 'x', nok: tek([G.xc1 - q.Ro, G.xc1, G.xc2, G.xc2 + q.Ro]), t: r3(y), p: r3(y + Math.min(0.6, G.b * 0.25)) }); }
    // ---- kanal enleri ve duvarları: son halkanın ağzı hizasında (ağzın altından) ----
    { const y = G.yc[n - 1], p = r3(y - Math.max(G.agizO[n - 1].sol.w, G.agizO[n - 1].sag.w) / 2 - 0.45); // açıklık başına ölçü (anaerobik.js G.agizO)
      Z.push({ grup: 'kanal', yon: 'x', nok: tek([0, q.tK, q.tK + q.bG, G.xc1 - q.Ro]), t: r3(y), p });
      Z.push({ grup: 'kanal', yon: 'x', nok: tek([G.xc2 + q.Ro, G.xR, xo1, G.Lo]), t: r3(y), p }); }
    // ---- kanal boyları ve ağızların yeri (kanal boyunca zincir); sağ kanalda ara duvar da ----
    { const ag = yan => { const o = []; for (let i = 0; i < n; i++) { const w = G.agizO[i][yan].w; o.push(G.yc[i] - w / 2, G.yc[i] + w / 2); } return o; }; // sol: giriş ağızları, sağ: RAS / çıkış ağızları
      Z.push({ grup: 'agiz', yon: 'y', nok: tek([yb, yb + q.tK, ...ag('sol'), yt - q.tK, yt]), t: r3(q.tK + q.bG), p: r3(q.tK + q.bG * 0.35) });
      const ara = G.ara ? [G.ara.y - q.tK / 2, G.ara.y + q.tK / 2] : [];
      Z.push({ grup: 'agiz', yon: 'y', nok: tek([yb, yb + q.tK, ...ag('sag'), ...ara, yt - q.tK, yt]), t: r3(G.xR), p: r3(G.xR + q.bC * 0.65) }); }
    // ---- pencereler (halkalar arası duvar): eni ve yarım daire merkezinden yeri ----
    for (let i = 0; i + 1 < n; i++) { const y0 = G.yc[i] + q.Ro; const P = (G.penO || [])[i] || { x0: G.pen.xw0, x1: G.pen.xw1 }; Z.push({ grup: 'pencere', yon: 'x', nok: tek([G.xc1, P.x0, P.x1]), t: r3(y0), p: r3(y0 - q.sahG - 0.35) }); }
    // ---- orifis (çıkış kanalı ara duvarı) ----
    if (G.ara) { const y = G.ara.y - q.tK / 2; Z.push({ grup: 'orifis', yon: 'x', nok: tek([G.xR, G.ara.g0, G.ara.g1, xo1]), t: r3(y), p: r3(y - 0.9) }); }
    // ---- servis köprüsü ve yürüyüş yolu: eni ve yarım daire merkezlerinden yeri (üst dış duvarın iç yüzünden) ----
    { const nok = [G.xc1, G.kopru.x0, G.kopru.x1, G.xc2]; if (G.kopru2) nok.push(G.kopru2.x0, G.kopru2.x1);
      const y = G.Wo - q.two; Z.push({ grup: 'kopru', yon: 'x', nok: tek(nok), t: r3(y), p: r3(y - Math.min(0.7, G.b * 0.3)) }); }
    // ---- yarıçaplar: halka iç yüzü, yönlendirme perdesi iç yüzü (1. halkanın sağ ucu), halka dış yüzü (son halkanın sol ucu) ----
    Y.push({ grup: 'yaricap', c: [r3(G.xc2), r3(G.yc[0])], r: r3(q.Ro), ang: -35 });
    Y.push({ grup: 'yaricap', c: [r3(G.xc2), r3(G.yc[0])], r: r3(q.rg), ang: 35 });
    Y.push({ grup: 'yaricap', c: [r3(G.xc1), r3(G.yc[n - 1])], r: r3(R2), ang: 145 });
    return { aks, zincir: Z, yaricap: Y, balon };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { olcuPlan };
  if (!C || typeof document === 'undefined' || !C.addCommand) return;

  /* ================= ÇİZİM (yalnız tarayıcı) ================= */
  const OTO = 'ANAOLCU', KATMAN = 'PLAN_OLCU';
  const kural = () => { const K = (C.cizimKural && C.cizimKural.MIMARI) || {}; return { Y: Object.assign({ ilkSira: 14, siraModel: 0.25 }, (K.olcuYeri || {}).genel || {}), A: Object.assign({ balonR: 6, yaziMm: 5, balonOte: 11 }, K.aks || {}) }; };
  const anahtar = e => JSON.stringify([C.anaerobikGeo(e).q, e.o, e.rot, C.doc.set.anno]);
  const sil = e => { const eski = C.doc.ents.filter(x => x.oto === OTO && x.bag === e.id); if (eski.length) { if (C.remove) C.remove(eski); else C.doc.ents = C.doc.ents.filter(x => !eski.includes(x)); } return eski.length; };

  /* havuzun aks ve ölçülerini koyar / yeniler. Döner: ölçü sayısı */
  C.anaerobikOlcu = (e, sessiz) => {
    if (!e || e.type !== 'anaerobik' || !C.anaerobikGeo) return 0;
    const G = C.anaerobikGeo(e), { Y, A } = kural(), mm = C.annoH(1), P = olcuPlan(G, { mm, ilk: Y.ilkSira, sira: Y.siraModel || 0.25, balonR: A.balonR, balonOte: A.balonOte });
    const f = C.frame(e.o, e.rot), rot = e.rot || 0, z = G.zTop, W = (x, y) => f.at(x, y, z), ek = { oto: OTO, bag: e.id };
    sil(e);
    C.ensureLayer(KATMAN, 3, 'CONTINUOUS', 18); C.ensureLayer('AKS', 1, 'CENTER', 13);
    // akslar: balonlar altta ve solda, en dış ölçü sırasının dışında; aksın kendi ölçüsü kapalı (ölçüler ayrı nesne)
    const o0 = f.at(P.aks.xs[0], P.aks.ys[0], 0);
    const a = C.add(C.newEnt('aks', Object.assign({ o: [o0[0], o0[1]], xs: P.aks.xs.map(v => r3(v - P.aks.xs[0])), ys: P.aks.ys.map(v => r3(v - P.aks.ys[0])), rot, bp: A.balonR, thp: A.yaziMm,
      extp: 6, extK: { ALT: P.balon.ALT, SOL: P.balon.SOL, UST: 6, SAG: 6 }, dims: false, both: false, xl: 'num', yTers: true, layer: 'AKS' }, ek)));
    if (C.aksSync) C.aksSync(a);
    let nO = 0;
    for (const s of P.zincir) for (let i = 1; i < s.nok.length; i++) {
      const p0 = s.nok[i - 1], p1 = s.nok[i]; if (p1 - p0 < 0.005) continue;
      const pt = s.yon === 'x' ? [W(p0, s.t), W(p1, s.t), W(p0, s.p)] : [W(s.t, p0), W(s.t, p1), W(s.p, p0)];
      C.add(C.newEnt('dim', Object.assign({ k: 'rot', ang: rot + (s.yon === 'x' ? 0 : 90), a: pt[0], b: pt[1], p: pt[2], layer: KATMAN, grup: s.grup }, ek))); nO++;
    }
    for (const y of P.yaricap) { C.add(C.newEnt('dim', Object.assign({ k: 'r', c: W(y.c[0], y.c[1]), r: y.r, ang: y.ang + rot, layer: KATMAN, grup: y.grup }, ek))); nO++; }
    e.olcu = true; e._olK = anahtar(e);
    C.changed && C.changed();
    if (!sessiz) C.log(`✓ ${e.code || ''} akslar (${P.aks.xs.length} × ${P.aks.ys.length}) ve ${nO} ölçü kondu. Havuz değişince kendiliğinden yenilenir; kaldırmak için ANAOLCU KALDIR.`);
    return nO;
  };
  // havuz (ölçü, yer, dönüş) ya da açıklama ölçeği değişince ölçüler yenilenir; havuz silinirse ölçüleri de silinir
  C.on && C.on('changeIdle', () => {
    if (!C.doc) return; const ids = new Set();
    for (const e of C.doc.ents) if (e.type === 'anaerobik') { ids.add(e.id); if (e.olcu) { const k = anahtar(e); if (e._olK == null) e._olK = k; else if (e._olK !== k) C.anaerobikOlcu(e, true); } }
    const yetim = C.doc.ents.filter(x => x.oto === OTO && !ids.has(x.bag)); if (yetim.length) { if (C.remove) C.remove(yetim); else C.doc.ents = C.doc.ents.filter(x => !yetim.includes(x)); C.changed && C.changed(); }
  });

  C.addCommand(['ANAOLCU', 'ANAEROBIKOLCU', 'ANAAKS'], 'Anaerobik havuzun plan akslarını ve ölçülerini koyar / yeniler (duvar eksenlerinde akslar, dış yüz – akslar – dış yüz ve toplam sıraları, ünite içi ölçüler). ANAOLCU [KALDIR]', async (I) => {
    let s = (C.sel || []).filter(x => x.type === 'anaerobik'); if (!s.length) s = C.doc.ents.filter(x => x.type === 'anaerobik');
    if (!s.length) return C.warn('Çizimde anaerobik havuz yok (önce ANAEROBIK ya da ünite kartında "Çiz").');
    const kaldir = C.cmd.queue.some(t => C.up(t) === 'KALDIR'); C.cmd.queue = C.cmd.queue.filter(t => C.up(t) !== 'KALDIR');
    for (const e of s) { if (kaldir) { const n = sil(e); e.olcu = false; delete e._olK; C.changed && C.changed(); C.log(`${e.code || ''}: ${n} aks / ölçü kaldırıldı.`); } else C.anaerobikOlcu(e); }
  });

  /* şerit: Arıtma → anaerobik düğmelerinin yanına */
  try {
    for (const tab of (C.ribbon && C.ribbon.tabs) || []) for (const pn of tab[1]) {
      const i = pn[1].findIndex(b => b.cmd === 'ANAEKIPMAN');
      if (i >= 0 && !pn[1].some(b => b.cmd === 'ANAOLCU')) { pn[1].splice(i + 1, 0, { cmd: 'ANAOLCU', t: 'Aks ve ölçüler', i: 'table' }); C.ribbon.render(); }
    }
  } catch (er) { console.error('anaerobik ölçü şerit', er); }
  try { if (window.DIL) window.DIL.ekle('en', 'English', [['Aks ve ölçüler', 'Axes and dimensions']], {}); } catch (er) { }
})(typeof window !== 'undefined' ? window.C : null);

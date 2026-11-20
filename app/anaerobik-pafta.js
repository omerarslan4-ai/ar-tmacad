/* ArıtmaCAD — ANAEROBİK HAVUZUN MİMARİ PAFTA TARİFİ (kullanıcı kararı 20.11.2026; docs/tasarim-standartlari.md → Anaerobik havuz → Mimari paftalar)
   MIMARIPAFTA (app/mimari-pafta.js) seçili ünitenin T[tip].paftaTarifi(e) işlevi varsa plan kotlarını, kesit hatlarını ve mahal adlarını
   üniteden alır (binalarda ve kum tutucuda eskisi gibi mahallerden / kat kotlarından seçer). Bu dosya anaerobik havuzun tarifini verir:
   - İki plan (kullanıcı 20.11.2026: "biri kesit plan, diğeri üstten plan"): (a) KESİT PLAN "<taban> ve <yürüme yolu> KOTLARI PLANI"
     (Çokal: "93.50 ve 97.45 KOTLARI PLANI") — duvarları ağızların / pencerelerin ortasından keser (kesilen perde kalın, Çokal gibi taramasız; açıklıklar boşluk);
     (b) ÜST PLAN — en yüksek ekipmanın (pergel vinç) gerçek üst kotunun pay kadar üstünden (ekipman yoksa yürüme yolunun 1,20 m üstünden). Planlarda su çizilmez.
   - Kesitler (3-Çokal_AAT_Anaerobik_R3.dwg planındaki kesit işaretlerinden ölçüldü; T-105 yerel koordinatı, m):
       A-A  y = 5,30 (aks D, 1. ham su halkasının orta perdesi; işaret perde ekseninde ama kesitte perde kesilmemiş, koridor ve su çizilmiş), bakış +y;
            çıkış kanalında (x = 16,63) çıkış borusu eksenine (y = 6,80) kademe yapıyor — programda kademeli kesit yok, düz alınır.
       B-B  x = 9,125 (düz kısım; pencere / kapak bölgesinin 0,375 m solu, servis köprüsünün 1,875 m solu), bakış +x (köprüye)
       C-C  x = 0,886 (giriş kanalının içi: kanal eninin 0,73'ü), bakış +x (halkalara)
       D-D  x = 16,40 (çıkış kanalının ortası), bakış −x (halkalara)
     Yerler havuz geometrisine bağlanır (mutlak koordinat taşınmaz): G.yc, G.sahanlik, G.kopru, q.tK / q.bG, G.xR / q.bC.
   - Mahal adları halka adlarıdır (RAS, <kod>/1, <kod>/2 …): planda üst koridorun ortasında, A-A ve B-B kesitlerinde su derinliğinin ortasında.
   - Kodlu malzeme açılımı (T.anaerobik.acilimlar; sözleşme app/acilim-kod.js): kalınlıklar havuz parametrelerinden; planda kod etiketlerinin yeri de buradan.
   Saf kısım (tarif, acilimlar) Node ile denenir: node test/anaerobik-pafta.test.js */
(function (C) {
  'use strict';
  const r3 = v => Math.round(v * 1000) / 1000, f2 = v => (+v).toFixed(2);
  const cm = v => { const c = Math.round(v * 1000) / 10; return Number.isInteger(c) ? String(c) : String(c).replace('.', ','); };
  /* Çokal'dan ölçülen oranlar ve paylar (kesit yerleri) */
  const OLCU = { ccOran: 0.73, ddOran: 0.50, bbSol: 0.375, uc: 1.5 }; // uc: kesit hattının tretuvar dışına taşması (m)
  const BETON = 'C30/37 hazır beton', GRO = 'C16/20 grobeton (10 cm)', KATRAN = 'Katran badana (3 kat)', DOLGU = 'Dolgular, kazıdan elde edilen uygun nitelikli malzeme ile yapılacaktır';

  /* ünite kodu Çokal yazımıyla: T101 → T-101 */
  const kodYaz = kod => String(kod || '').trim().replace(/^([A-Za-zÇĞİÖŞÜ]+)\s*(\d)/, '$1-$2');
  const halkaAdi = (G, i, kod) => (i === 0 && G.n > 1 ? 'RAS' : `${kodYaz(kod)}${kod ? '/' : ''}${G.n > 1 ? i : 1}`);

  /* PLAN KOTLARI. o: { ekipUst: en yüksek ekipmanın üst kotu, kh: ekipman yokken üst planın yürüme yolu üstü yüksekliği (1,20), pay: ekipman üstü pay (0,20) }
     → [{ ad, baslik, h: kesme kotu, depth: bakış derinliği, su: false, kesit: kesit plan mı }]
     Kesit plan duvarları keser: kesme kotu giriş ağızlarıyla pencerelerin ortak yükseklik aralığının ortası (ortak aralık yoksa ağızların; Çokal 95,75–96,75 → 96,25),
     duvar üstünün en az 5 cm altında. Üst plan her zaman çıkar; bütün yapının üstünden bakar. */
  function planlar(G, o) {
    o = o || {}; const kh = o.kh == null ? 1.2 : +o.kh, pay = o.pay == null ? 0.2 : +o.pay, zYol = G.kopru.z1, alt = G.zF - 0.1, out = [];
    const lo = G.acikAralik ? G.acikAralik[0] : Math.max(G.zS, G.zSp), hi = G.acikAralik ? G.acikAralik[1] : Math.min(G.zH, G.zHp), h1 = r3(Math.min(hi > lo + 0.05 ? (lo + hi) / 2 : (G.zS + G.zH) / 2, G.zTop - 0.05));
    /* ağız ve pencerenin ortak aralığı (yoksa ağız) */ out.push({ ad: 'PLAN', baslik: `${f2(G.zB)} ve ${f2(zYol)} KOTLARI PLANI`, h: h1, depth: r3(h1 - alt), su: false, kesit: true });
    const e = o.ekipUst != null && isFinite(+o.ekipUst) ? +o.ekipUst + pay : -Infinity, h2 = r3(Math.max(zYol + kh, e));
    out.push({ ad: 'UST', baslik: 'ÜST PLAN', h: h2, depth: r3(h2 - alt), su: false });
    return out;
  }

  /* KESİT HATLARI (yerel). → [{ nm, a, b, sp (bakış yönünde bir nokta), depth, tarif, mahal: [{ ad, p: [x, y], z }], kademe? }] */
  function kesitler(G, o) {
    o = o || {}; const q = G.q, n = G.n, uc = OLCU.uc + q.tre, kod = o.kod, zM = r3((G.zB + G.zW) / 2), out = [];
    const xA = -uc, xB = G.Lo + uc, yA = Math.min(0, G.kanal.yb, G.kopru.y0) - uc, yB = Math.max(G.Wo, G.kanal.yt, G.kopru.y1) + uc;
    const mah = (i, x, y) => ({ ad: halkaAdi(G, i, kod), p: [r3(x), r3(y)], z: zM }), ustKor = i => G.yc[i] + q.tw / 2 + G.b / 2;
    // A-A: 1. ham su halkasında (tek halkada o halkada) orta perde yüzü ile ağız kenarının ortasından; bakış +y, derinlik üst dış duvarın dış yüzüne kadar
    // wA: iki uçtaki ağızdan da geçsin diye dar olanın eni
    { const i = Math.min(1, n - 1), wA = G.agizO ? Math.min(G.agizO[i].sol.w, G.agizO[i].sag.w) : q.ag, d = (q.tw / 2 + Math.max(q.tw / 2, wA / 2)) / 2, y = r3(G.yc[i] + (d > q.tw / 2 + 1e-6 ? d : q.tw / 2 + 0.05));
      const k = { nm: 'A', a: [r3(xA), y], b: [r3(xB), y], sp: [r3((xA + xB) / 2), r3(y + 1)], depth: r3(G.Wo - y), tarif: `boyuna; ${halkaAdi(G, i, kod)} halkasında orta perdenin yanından (ağızlardan geçer), bakış üst halkaya`, mahal: [mah(i, G.xc1 + q.Ls / 2, y)] };
      const c = G.boruYer && G.boruYer.cikis; if (c) k.kademe = { x: r3(G.xR + OLCU.ccOran * q.bC), y: r3(c.p[1]) }; // Çokal'daki kademe (çıkış borusu ekseni): bilgi, uygulanmıyor
      out.push(k); }
    // B-B: düz kısımda kapak sahanlığının (yoksa pencerenin) bbSol kadar solundan; bakış +x (köprüye), derinlik halka uç duvarının eksenine kadar
    { const s = (G.sahanlik || [])[0], ref = s ? s.x0 : G.pen.xw0 - q.sahX, alt = G.kopru2 ? G.kopru2.x1 + 0.1 : G.xc1 + 0.1, x = r3(Math.max(alt, Math.min(ref - OLCU.bbSol, G.kopru.x0 - 0.1)));
      out.push({ nm: 'B', a: [x, r3(yA)], b: [x, r3(yB)], sp: [r3(x + 1), r3((yA + yB) / 2)], depth: r3(G.xc2 + q.Ro + q.two / 2 - x), tarif: 'enine; düz kısımda kapak sahanlığının solundan, bakış servis köprüsüne', mahal: G.halka.map(H => mah(H.i, x, ustKor(H.i))) }); }
    // C-C: giriş kanalının içinden (kanal eninin ccOran'ı), bakış +x (halkalara), derinlik yarım daire merkezine kadar
    { const x = r3(q.tK + OLCU.ccOran * q.bG);
      out.push({ nm: 'C', a: [x, r3(yA)], b: [x, r3(yB)], sp: [r3(x + 1), r3((yA + yB) / 2)], depth: r3(G.xc1 - x), tarif: 'enine; giriş kanalının içinden, bakış halkalara', mahal: [] }); }
    // D-D: çıkış kanalının ortasından, bakış −x (halkalara), derinlik yarım daire merkezine kadar
    { const x = r3(G.xR + OLCU.ddOran * q.bC);
      out.push({ nm: 'D', a: [x, r3(yA)], b: [x, r3(yB)], sp: [r3(x - 1), r3((yA + yB) / 2)], depth: r3(x - G.xc2), tarif: 'enine; çıkış kanalının ortasından, bakış halkalara', mahal: [] }); }
    return out;
  }

  /* KODLU MALZEME AÇILIMLARI. o: { zg: tretuvar üst kotu (zemin; yoksa duvar üstü − 2,25) }
     → [{ ad, tur, lines, kutular: [[x0, y0, x1, y1]] (yerel; kesit bu kutulardan geçerse kod konur), z0, z1, etiket: [[x, y]] (planda kodun gösterdiği noktalar), t }]
     Sıra kod sırasıdır (DU01 …, DÖ01 …). Kalınlıklar havuz parametrelerinden; aynı katmanlaşma aynı kodu alır. */
  function acilimlar(G, o) {
    o = o || {}; const q = G.q, n = G.n, R2 = q.Ro + q.two, xo1 = G.xR + q.bC, yb = G.kanal.yb, yt = G.kanal.yt, k = G.kopru, wD = G.duzYuz || q.ag, eB = G.baston || 0;
    const zg = o.zg != null && isFinite(+o.zg) ? +o.zg : G.zTop - 2.25, xm = G.xc1 + 0.55 * q.Ls, c45 = Math.SQRT1_2, L = [];
    const beton = t => `${BETON}, ${cm(t)} cm`, kutu = (a, b, c, d) => [r3(Math.min(a, c)), r3(Math.min(b, d)), r3(Math.max(a, c)), r3(Math.max(b, d))], P = (x, y) => [r3(x), r3(y)];
    const duvar = (ad, t, lines, kutular, etiket) => L.push({ ad, tur: 'duvar', t, lines, kutular, etiket, z0: G.zB, z1: G.zTop });
    // ---- DUVARLAR ----
    duvar('Dış duvar', q.two, [beton(q.two), KATRAN, DOLGU], [kutu(G.xc1, 0, G.xc2, q.two), kutu(G.xc1, G.Wo - q.two, G.xc2, G.Wo)], [P(xm, q.two / 2), P(xm, G.Wo - q.two / 2)]);
    { const K = [], E = []; // halkalar arası duvar ve halka uç duvarları (iki yanı su)
      for (let i = 0; i + 1 < n; i++) { const y0 = G.yc[i] + q.Ro; K.push(kutu(G.xc1, y0, G.xc2, y0 + q.two)); E.push(P(xm, y0 + q.two / 2)); }
      for (let i = 0; i < n; i++) K.push(kutu(G.xc1 - R2, G.yc[i] - wD / 2, G.xc1 - q.Ro, G.yc[i] + wD / 2), kutu(G.xc2 + q.Ro, G.yc[i] - wD / 2, G.xc2 + R2, G.yc[i] + wD / 2));
      E.push(P(G.xc2 + (q.Ro + q.two / 2) * c45, G.yc[n - 1] + (q.Ro + q.two / 2) * c45));
      duvar(n > 1 ? 'Halkalar arası duvar ve halka uç duvarı' : 'Halka uç duvarı', q.two, [beton(q.two)], K, E); }
    duvar('Kanal dış duvarı', q.tK, [beton(q.tK), KATRAN, DOLGU],
      [kutu(0, yb, q.tK, yt), kutu(G.Lo - q.tK, yb, G.Lo, yt), kutu(0, yb, q.tK + q.bG, yb + q.tK), kutu(0, yt - q.tK, q.tK + q.bG, yt), kutu(G.xR, yb, G.Lo, yb + q.tK), kutu(G.xR, yt - q.tK, G.Lo, yt)],
      [P(q.tK / 2, (yb + yt) / 2), P(G.Lo - q.tK / 2, (yb + yt) / 2)]);
    if (G.ara) duvar('Çıkış kanalı ara duvarı', q.tK, [beton(q.tK)], [kutu(G.xR, G.ara.y - q.tK / 2, xo1, G.ara.y + q.tK / 2)], [P(G.ara.g1 < xo1 - 0.3 ? (G.ara.g1 + xo1) / 2 : G.xR + 0.1, G.ara.y)]);
    duvar('Orta perde', q.tw, [beton(q.tw)], G.yc.map(y => kutu(G.xc1, y - q.tw / 2, G.xc2, y + q.tw / 2)), G.yc.map(y => P(xm, y)));
    { const K = [], E = []; // yönlendirme perdesi: yay (halka ekseninde) ve baston (çıkış ucundaki düz kısım)
      for (const H of G.halka) { const y = H.yc, s = H.yon, r1 = q.rg, r2 = q.rg + q.tg;
        K.push(kutu(G.xc1 - r2, y - r1 / 2, G.xc1 - r1, y + r1 / 2), kutu(G.xc2 + r1, y - r1 / 2, G.xc2 + r2, y + r1 / 2));
        if (eB > 0) K.push(kutu(G.xc1, y + s * r1, G.xc1 + eB, y + s * r2), kutu(G.xc2 - eB, y - s * r1, G.xc2, y - s * r2));
        E.push(P(G.xc1 - (r1 + r2) / 2, y)); }
      duvar('Yönlendirme perdesi', q.tg, [beton(q.tg)], K, E); }
    // ---- DÖŞEMELER ----
    { const K = [], E = []; // radye / temel: koridor ve kanal tabanları (kod koridorda görünür)
      for (const y of G.yc) { K.push(kutu(G.xc1, y - q.Ro, G.xc2, y - q.tw / 2), kutu(G.xc1, y + q.tw / 2, G.xc2, y + q.Ro)); E.push(P(G.xc1 + 0.45 * q.Ls, y - q.tw / 2 - G.b / 2)); }
      K.push(kutu(q.tK, yb + q.tK, q.tK + q.bG, yt - q.tK), kutu(G.xR, yb + q.tK, xo1, yt - q.tK)); E.push(P(q.tK + q.bG / 2, G.yc[0] + q.Ro + q.two / 2), P(G.xR + q.bC / 2, G.yc[n - 1] - q.Ro * 0.5));
      L.push({ ad: 'Radye / temel', tur: 'doseme', t: q.tb, lines: [beton(q.tb), GRO], kutular: K, etiket: E, z0: G.zF, z1: G.zB }); }
    { const K = [kutu(k.x0, k.y0, k.x1, k.y1)], E = [P((k.x0 + k.x1) / 2, G.yc[0] - q.tw / 2 - G.b / 2)]; // servis köprüsü, yürüyüş yolu, kapak işletme sahanlıkları, merdiven sahanlığı
      const sah = kp => P((kp.x0 + kp.x1) / 2, kp.y1 > G.Wo + 1e-6 ? (G.Wo + kp.y1) / 2 : kp.y0 < -1e-6 ? kp.y0 / 2 : G.Wo - q.two / 2); // köprünün dışarı uzanan ucu: merdivenin üst sahanlığı
      E.push(sah(k));
      if (G.kopru2) { const k2 = G.kopru2; K.push(kutu(k2.x0, k2.y0, k2.x1, k2.y1)); E.push(P((k2.x0 + k2.x1) / 2, G.yc[0] - q.tw / 2 - G.b / 2), sah(k2)); }
      for (const s of G.sahanlik || []) { K.push(kutu(s.x0, s.y0, k.x0, s.y1)); E.push(P(s.x0 + Math.min(0.25, (k.x0 - s.x0) / 4), s.y1 - Math.min(0.15, (s.y1 - s.y0) / 4))); }
      L.push({ ad: 'Servis köprüsü, yürüyüş yolu, kapak işletme sahanlığı ve merdiven sahanlığı döşemesi', tur: 'doseme', t: q.kbT, lines: [beton(q.kbT)], kutular: K, etiket: E, z0: k.z0, z1: k.z1 }); }
    { const t = q.tre; // tretuvar (zemin kotunda, havuz çevresi): kaplama seçildiyse katmanları (tretSatir), yoksa modeldeki kalınlık
      L.push({ ad: 'Tretuvar', tur: 'doseme', t: q.treT, lines: tretSatir(q, o.tretKat), kutular: [kutu(-t, yb - t, 0, yt + t), kutu(G.Lo, yb - t, G.Lo + t, yt + t), kutu(G.xc1, -t, G.xc2, 0), kutu(G.xc1, G.Wo, G.xc2, G.Wo + t),
          kutu(-t, yb - t, G.xc1 - R2, yb), kutu(-t, yt, G.xc1 - R2, yt + t), kutu(G.xR, yb - t, G.Lo + t, yb), kutu(G.xR, yt, G.Lo + t, yt + t)], // yanlar, uzun kenarlar, kanal uçları
        etiket: [P(G.xc1 + 0.5 * q.Ls, -t / 2)], z0: r3(zg - q.treT), z1: r3(zg) }); }
    return L;
  }

  /* tretuvar açılımı: kaplama seçildiyse (q.tretKap; katalog o.tretKat = tretuvar.js C.TRETUVAR_KAP) katmanlarıyla, yoksa eskisi gibi tek satır.
     Katmanlar tretuvar.js ile aynı: kaplama (katalog kalınlığı) › harç / kum yatak 3 cm › C16/20 beton 10 cm › stabilize 15 cm; perdahlı betonda beton q.treT */
  function tretSatir(q, kat) {
    const kp = kat && kat[q.tretKap || 'beton']; if (!kp) return [`Tretuvar, ${cm(q.treT)} cm`]; // kaplama seçilmezse perdahlı beton (anaerobik.js tretuvar nesnesiyle aynı)
    if (q.tretKap === 'beton' || !kp.t) return [`${kp.ad}, ${cm(q.treT)} cm`, 'Stabilize dolgu, 15 cm'];
    return [`${kp.ad}, ${kp.t} cm`, `${kp.yatak || 'Çimento harcı'}, 3 cm`, 'C16/20 beton, 10 cm', 'Stabilize dolgu, 15 cm'];
  }
  /* PLANDA GÖVDE ÇİZGİLERİNİN SINIFI (Çokal planı ölçüldü: havuz duvarları ve köprü Beton katmanında — kalın, taramasız; tretuvar Tretuvar katmanında;
     radyenin duvar dışına taşan, toprak altında kalan kenarı çizilmemiş). → p (yerel [x, y]) → 'tretuvar' | 'radye' | 'govde' */
  function planSinif(G) {
    const tol = 0.003, kenar = P => P.map((a, i) => [a, P[(i + 1) % P.length]]);
    const uz = (p, k) => { const a = k[0], b = k[1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t); };
    const Tr = kenar(G.tretuvar.dis), B = kenar(G.bolge.dis), R = kenar(G.taban.pts), on = (p, K) => K.some(k => uz(p, k) < tol);
    return p => (on(p, Tr) ? 'tretuvar' : on(p, R) && !on(p, B) ? 'radye' : 'govde');
  }

  /* BÜTÜN TARİF (yerel koordinat). o: { kod, ekipUst, kh, pay, zg }
     → { planlar, kesitler, mahaller: [{ ad, p }] (plan), kodlar: [{ tur, lines, a: [x, y], t, z0 }] (plan kod etiketleri), gorunus: false, ustGorunus: false } */
  function tarif(G, o) {
    o = o || {}; const q = G.q;
    const mahaller = G.halka.map(H => ({ ad: halkaAdi(G, H.i, o.kod), p: [r3(G.xc1 + 0.30 * q.Ls), r3(H.yc + q.tw / 2 + G.b / 2)] }));
    const kodlar = []; for (const it of acilimlar(G, o)) for (const a of it.etiket || []) kodlar.push({ tur: it.tur, lines: it.lines.slice(), a, t: it.t, ad: it.ad, z0: it.z0 }); // z0: kesit planda kesme kotunun üstündeki elemanın (yürüme yolu) kodu yazılmaz
    /* Çokal anaerobik paftasında görünüş ve çatı (üst görünüş) planı yok: yalnız plan ve kesitler */
    return { planlar: planlar(G, o), kesitler: kesitler(G, o), mahaller, kodlar, gorunus: false, ustGorunus: false, paftaAdi: { plan: 'PLANLAR', kesit: 'KESİTLER' } };
  }

  const api = { planlar, kesitler, acilimlar, tarif, planSinif, halkaAdi, kodYaz, OLCU, tretSatir };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!C || !C.T || !C.T.anaerobik || !C.anaerobikGeo) return;
  C.anaerobikPaftaApi = api;

  const T = C.T, geo = C.anaerobikGeo;
  /* tretuvar üst kotu: havuzun 3B ağındaki tretuvarın kotu (anaerobik.js zemin: arazi → e.zg → duvar üstü − 2,25) */
  const zemin = (e, G) => { for (const a of C.doc.ents.filter(x => x.type === 'arazi')) { const f = C.frame(e.o, e.rot), z = C.araziKot && C.araziKot(a, f.at(G.kopru.x0 - 2, G.Wo + G.q.mw / 2, 0)); if (z != null) return z - (a.ref || 0); } return e.zg != null && isFinite(+e.zg) ? +e.zg : G.zTop - 2.25; };
  /* havuza bağlı ekipmanın (aile nesneleri: kapak, mikser + pergel vinç) gerçek üst kotu — 3B ağdan */
  const ekipUst = e => { let z = -Infinity; for (const x of C.doc.ents) { if (x.bag !== e.id || x.type !== 'aile' || x.gv) continue; let t = null; try { t = C.entTris(x); } catch (er) { continue; } const P = t && t.pos; if (!P) continue; for (let i = 2; i < P.length; i += 3) if (P[i] > z) z = P[i]; } return isFinite(z) ? z : null; };
  C.anaerobikEkipUst = ekipUst;
  /* planda ekipman numaraları (kullanıcı 20.11.2026: "mikserlerin ve pergel vinçlerin numaraları da gözüksün"): havuza bağlı mikser (Z-…) ve pergel vinç (PV-…);
     yazı ekipmanın enine yanında (mikserde pervane yarıçapının dışında, vinçte direğin yanında), alt kotu kesme kotunun üstündeyse (kesit planda vinç) yazılmaz.
     → [{ ad, p: [x, y] (dünya), z0 }] */
  const ekipmanNo = e => {
    const out = [];
    for (const x of C.doc.ents) {
      if (x.bag !== e.id || x.type !== 'aile' || !x.ad || (x.fam !== 'dalgic_mikser' && x.fam !== 'pergel_vinc' && x.fam !== 'penstock_kanal')) continue;
      const r = (+x.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), p = x.p || [0, 0, 0], q = x.par || {}, kap = x.fam === 'penstock_kanal';
      /* kapak (kullanıcı 20.11.2026: "plan ve kesitlerde kapak isimlerini, ebatlarını, numaralarını yaz"): ad + en × yükseklik, ailenin etiket yerinde (kapağın arkasında) */
      const ox = x.fam === 'dalgic_mikser' ? (+q.D || 600) / 2000 + 0.25 : kap ? 0 : 0.25, oy = x.fam === 'dalgic_mikser' ? 0.9 : kap ? -((+q.yd || 0) / 2000 + 0.45) : 0; // yerel: x enine, y itki / kapakta akış
      /* o: ekipmanın kendi yeri (kesitte bakış derinliği ve kesit boyunca yer bundan), zEt: kesitte yazının alt kotu (kapak üstü / pervane üstü / vinç tepesi) */
      const z0 = +x.z || 0, zEt = kap ? z0 + ((+q.D || 0) + (+q.ust || 878)) / 1000 + (q.tahrik === 'EL' ? 1.15 : 0.85) + 0.20 : /* kapak: tahrikin (aktüatör / el çarkı) üstünde — çerçeve ve nervür çizgileri yazının içinden geçmesin (kullanıcı 20.11.2026: "yazılar kapağın üzerine okunacak şekilde") */ x.fam === 'dalgic_mikser' ? z0 + (+q.hm || 600) / 1000 + (+q.D || 600) / 2000 + 0.2 : z0 + 3.3;
      out.push({ ad: kap ? `${x.ad} ${Math.round(+q.B)}×${Math.round(+q.H)}` : x.ad, p: [r3(p[0] + oy * c - ox * s), r3(p[1] + oy * s + ox * c)], o: [r3(p[0]), r3(p[1])], z0, zEt: r3(zEt), fam: x.fam });
    }
    return out;
  };

  /* havuzun plan ölçüleri (anaerobik-olcu.js, oto: 'ANAOLCU'): geçerli açıklama ölçeğine göre yenilenir (MIMARIPAFTA pafta ölçeğiyle çağırır; ölçek eski hâline dönünce
     anaerobik-olcu.js kendiliğinden yeniler). Kullanıcı ölçüleri kaldırdıysa (ANAOLCU KALDIR) boş döner. */
  const olculer = e => { if (e.olcu === false || !C.anaerobikOlcu) return []; try { C.anaerobikOlcu(e, true); } catch (er) { console.error('anaerobik ölçü', er); } return C.doc.ents.filter(x => x.oto === 'ANAOLCU' && x.bag === e.id && x.type === 'dim'); };
  /* kodlu açılım (acilim-kod.js uniteAcilim): kesitte kod etiketleri */
  T.anaerobik.acilimlar = e => { const G = geo(e); return acilimlar(G, { zg: zemin(e, G), tretKat: C.TRETUVAR_KAP }); };
  /* MIMARIPAFTA tarifi — dünya koordinatında. o: { kh } */
  T.anaerobik.paftaTarifi = (e, o) => {
    const G = geo(e), f = C.frame(e.o, e.rot), W = p => { const w = f.at(p[0], p[1], 0); return [r3(w[0]), r3(w[1])]; };
    const R = tarif(G, Object.assign({ kod: e.code, ekipUst: ekipUst(e), zg: zemin(e, G), tretKat: C.TRETUVAR_KAP }, o || {}));
    const rr = -(e.rot || 0) * Math.PI / 180, cs = Math.cos(rr), sn = Math.sin(rr), yerel = p => { const dx = p[0] - e.o[0], dy = p[1] - e.o[1]; return [dx * cs - dy * sn, dx * sn + dy * cs]; }, sinif = planSinif(G);
    return {
      unite: e.id, ad: `${kodYaz(e.code)} ${e.name || 'Anaerobik havuz'}`.trim(), gorunus: R.gorunus, ustGorunus: R.ustGorunus, paftaAdi: R.paftaAdi,
      planlar: R.planlar.map(p => Object.assign({}, p, { gizle: x => x.type === 'su' })), // planlarda su çizilmez
      kesitler: R.kesitler.map(k => Object.assign({}, k, { a: W(k.a), b: W(k.b), sp: W(k.sp), mahal: k.mahal.map(m => ({ ad: m.ad, p: W(m.p), z: m.z })) })),
      mahaller: R.mahaller.map(m => ({ ad: m.ad, p: W(m.p) })),
      kodlar: R.kodlar.map(k => Object.assign({}, k, { a: W(k.a) })),
      planSinif: p => sinif(yerel(p)), // planda gövde çizgisinin sınıfı (dünya koordinatı): govde → Beton, tretuvar → Tretuvar, radye (toprak altı) → çizilmez
      planOlcu: olculer(e), // havuzun kendi plan ölçüleri (ANAOLCU): plana aynen taşınır
      ekipman: ekipmanNo(e), // mikser ve pergel vinç numaraları (Z-…, PV-…): planda ekipmanın yanında
    };
  };
  if (typeof window !== 'undefined' && window.DIL) window.DIL.ekle('en', 'English', [
    ['# VE # KOTLARI PLANI', 'PLAN AT LEVELS # AND #'], ['# ve # KOTLARI PLANI', 'PLAN AT LEVELS # AND #'], ['ÜST PLAN', 'TOP PLAN'], ['PLANLAR', 'PLANS'],
    ['Tretuvar, # cm', 'Pavement, # cm'], ['# cm TRETUVAR', '# cm PAVEMENT'],
  ]);
})(typeof window !== 'undefined' ? window.C : null);

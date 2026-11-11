/* ArıtmaCAD — ÖN ARITMA DERİN YAPISI: IZGARA KANALLARI + GİRİŞ TERFİSİ (Çokal AAT T-101 / T-102, çizim 1)
   Ölçüler metre; yerel x: terfi dış sol kenarından akışın tersine (giriş sağda), y: terfi dış alt kenarından.
   Akış (sağdan sola): giriş odası → [penstok A] → kaba ızgara → [penstok C] → ortak geçiş (ayırıcı perdede boşluk;
   kaba ve ince ızgaralar çapraz çalışır) → [penstok E] → ince ızgara → [penstok G] → toplama haznesi → terfi ıslak haznesi.
   Kanallar arasında ayırıcı perde (uçları yuvarlak); kapaklar duvar yuvalarında; üst döşeme platform kotunda,
   ızgara / kapak / pompa açıklıklı. Beton tek katı (anaerobik havuzdaki yöntem: C.bolgeKati + C.boslukAg).
   Geometri saf fonksiyondur: node test/onaritma.test.js */
(function (C) {
  'use strict';
  const NODE = typeof module !== 'undefined' && module.exports && typeof require !== 'undefined';
  const ANA = NODE ? require('./anaerobik.js') : null;
  const bolgeKati = (...a) => (ANA ? ANA.bolgeKati : C.bolgeKati)(...a);

  /* Çokal T-101 / T-102 varsayılanları */
  const DEF = {
    n: 2, b: 0.60, tw: 0.40, ts: 0.60,               // kanal sayısı (1 asıl + 1 yedek), kanal eni, dış duvar, ayırıcı perde
    Lc: 1.60, Li: null, Lg: 0.60, Lk: null, Lgi: 2.00, // toplama haznesi, ince bölge (boşsa ızgaradan), ortak geçiş, kaba bölge (boşsa ızgaradan; Çokal 4,10 / 3,80), giriş odası
    tX: 2.50, tY: null, tTw: 0.40,                     // terfi ıslak haznesi: kısa kenar, uzun kenar (boşsa pompa dizisinden), duvar
    gG: 0.15, gE: 0.19, gC: 0.19, gA: 0.10, yw: 0.10, yd: 0.05, // kapak yerleri (bölge uçlarından) ve duvar yuvası
    zTab: 91.45, zPl: 95.45, dT: 0.25, zTr: null, tb: 0.60, // kanal tabanı (yapı yüksekliği platform − taban = 4,00 m, firma kararı; Çokal 86,75 / 8,70 m), platform, döşeme, terfi tabanı (kanal tabanının 1,95 altı), taban plağı
    kpH: 1.00, pH: 1.00,                                // kapak yüksekliği, terfiye geçiş boşluğu yüksekliği
    hs: 0.60, hsMin: 0.25, zTon: null, zToff: null,     // kanal su derinliği (maks / min); terfi en üst seviye / durma (boşsa ıslak hazne hesabından)
    np: 3, Qp: 18, Hp: 14,                              // pompa sayısı (2 asıl + 1 yedek), pompa başına debi l/s, basma m
    Zk: 10, hOl: 0.35, dP1: 0.20, dP: 0.15, dUst: 0.40, pg: 0.86, ap: 1.00, ak: 0.95, // ıslak hazne: saatlik kalkış, ölü yükseklik, durma→1. pompa (en az), pompalar arası, son asıl→en üst, giriş tabanı→en üst, pompa aks aralığı, son aks→duvar
    bgK: 30, bgI: 6, zg: 94.80, mw: 1.00, mb: 0.25, mh: 0.19,
    hA: 1.00, Lka: null, Lsa: 0.25,                     // orta perde: yükseklik (kanal tabanından, Çokal C-C 1,00), kaba bölgedeki boyu (A kapaklarına kadar), kısa parça
    hBos: 1.00, pd: 0.15, Hk: 1.37, pk: 0.30, ka: 0.28, Bk: 0.50, gIK: 0.60, // gIK: ızgara ile konveyör arası en az boşluk // ızgara boşaltma ağzı (platformdan), ağız → bant düşüsü, 1100 L konteyner, konveyör altı → konteyner payı, bant → konveyör altı, bant eni
  };
  const PAR = Object.keys(DEF);
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const alan = p => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  const ccw = p => (alan(p) < 0 ? p.slice().reverse() : p);
  const yay = (cx, cy, r, a0, a1, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; };

  /* ızgara (kaba_izgara ailesi, 75°, çerçeve derinliği 0,354): ayaktan boşaltma ağzı ortasına yatay mesafe (akış yönünde) */
  const IA = 75 * Math.PI / 180, ID = 0.354;
  /* deşarj oluğu: konveyör ızgaradan en az gIK uzakta kalacak boyda (en az 0,95); boşaltma ağzı oluğun son 0,55 m'si, ortası uçtan 0,325 */
  const olukBoy = q => Math.max(0.95, Math.ceil(((q.gIK != null ? q.gIK : 0.60) + (q.Bk + 0.16) / 2 + 0.325) * 20 - 1e-6) / 20);
  const dusus = (hd, ol) => (hd + 0.25) / Math.tan(IA) + ID / Math.sin(IA) + ol - 0.325;
  const CU = 0.35; // ızgara ayağı → membadaki kapak ekseni
  /* boşaltma kot zinciri: konteyner zeminde → konveyör altı + pay → bant → ağız; ağız platformdan en az hBos */
  const kotZincir = (q, zg) => { const zZem = zg != null ? zg : q.zg, zBant = Math.max(q.zPl + q.hBos - q.pd, zZem + q.Hk + q.pk + q.ka), hdU = zBant + q.pd - q.zPl; return { zZem, zBant, hdU, zKont: zZem + q.Hk, zAlt: zBant - q.ka }; };

  /* ISLAK HAZNE HESABI (ATV-DVWK-A 134; Çokal T-102 kotlarıyla doğrulandı)
     faydalı hacim V = 0,9·Qp/Z (Qp L/s, tek pompa); seviyeler yukarıdan: en üst (yedek pompa + alarm) = giriş kanalı tabanı − pg;
     son asıl pompa devreye = en üst − dUst; her alttaki asıl pompa dP aşağıda; durma = 1. pompa − max(dP1, V/A); taban = durma − ölü yükseklik.
     Uzun kenar pompa dizisinden ((n−1)·ap + 2·ak); faydalı yükseklik 1,00 m'yi aşarsa kısa kenar genişler. */
  const y20 = v => Math.ceil(v * 20 - 1e-6) / 20;
  function islakHazne(q) {
    const np = Math.max(1, Math.round(q.np)), nd = Math.max(1, np - 1);
    const L = q.tY != null ? q.tY : (np - 1) * q.ap + 2 * q.ak;
    const V = 0.9 * q.Qp / q.Zk;
    let B = q.tX, hu = Math.max(q.dP1, y20(V / (B * L)));
    if (hu > 1.0 + 1e-9) { B = Math.max(B, y20(V / (1.0 * L))); hu = Math.max(q.dP1, y20(V / (B * L))); }
    const ust = q.zTab - q.pg, pom = []; for (let k = nd; k >= 1; k--) pom[k - 1] = ust - q.dUst - (nd - k) * q.dP;
    const durma = pom[0] - hu, taban = durma - q.hOl;
    return { np, nd, L, B, V, hu, Zger: 0.9 * q.Qp / (hu * B * L), ust, pom, durma, taban };
  }

  function geo(e) {
    const q = {}; e = e || {}; for (const k of PAR) q[k] = e[k] != null ? e[k] : DEF[k];
    const IH = islakHazne(q); // terfi haznesi: boş bırakılan ölçü ve kotlar hesaptan (eski çizimler kendi değerlerini korur)
    q.tY = IH.L; q.tX = IH.B; if (q.zTon == null) q.zTon = IH.ust; if (q.zToff == null) q.zToff = IH.durma; if (q.zTr == null) q.zTr = IH.taban;
    const n = Math.max(1, Math.round(q.n)), W = n * q.b + (n - 1) * q.ts, Wc = W + 2 * q.tw;
    const tO = q.tX + 2 * q.tTw, tYo = q.tY + 2 * q.tTw, yc0 = (tYo - Wc) / 2;
    // bölge uzunlukları ızgaradan: kapak – ızgara ayağı – (eğik ızgara izi) – boşaltma ağzı altındaki konveyör – kapak tahrikinden pay
    const D = q.zPl - q.zTab, KZ = kotZincir(q), OL = olukBoy(q), dX = dusus(D + KZ.hdU, OL), yarim = (q.Bk + 0.16) / 2 + 0.05, cK = 0.30 + yarim;
    const yuk = v => Math.ceil(v * 20 - 1e-6) / 20;
    const Li = q.Li != null ? q.Li : yuk(q.gG + cK + dX + CU + q.gE), Lk = q.Lk != null ? q.Lk : yuk(q.gC + cK + dX + CU + q.gA);
    const x1 = tO + q.Lc, x2 = x1 + Li, x3 = x2 + q.Lg + q.ts, x4 = x3 + Lk, x5 = x4 + q.Lgi, Lo = x5 + q.tw;
    const yi0 = yc0 + q.tw, yi1 = yi0 + W; // kanal içi
    const zW = q.zPl - q.dT; // duvar üstü (döşeme altı)
    const G = { q, IH, n, W, Wc, tO, tYo, yc0, x1, x2, x3, x4, x5, Lo, yi0, yi1, zW, Li, Lk, dX, OL, kotZincir: KZ, cK, kanal: [], ayirici: [], kapak: [], kes: [], dosemeBos: [], izgara: [] };
    for (let i = 0; i < n; i++) { const y0 = yi0 + i * (q.b + q.ts); G.kanal.push({ i, y0, y1: y0 + q.b, ym: y0 + q.b / 2 }); }
    // beton: dış sınır (terfi + kanal), delikler (terfi iç, kanal iç)
    const ya1 = 0, yb1 = tYo, ya2 = yc0, yb2 = yc0 + Wc;
    G.bolge = { dis: ccw([[0, ya1], [tO, ya1], [tO, ya2], [Lo, ya2], [Lo, yb2], [tO, yb2], [tO, yb1], [0, yb1]]), delik: [ccw(rect(q.tTw, q.tTw, tO - q.tTw, tYo - q.tTw)).reverse(), ccw(rect(tO, yi0, x5, yi1)).reverse()] };
    // ayırıcı perdeler: ince bölgede (sağ ucu yuvarlak) ve kaba bölgede (sol ucu yuvarlak); aradaki boşluk ortak geçiş
    for (let j = 0; j + 1 < n; j++) {
      const ya = yi0 + (j + 1) * q.b + j * q.ts, yb = ya + q.ts, ym = (ya + yb) / 2, r = q.ts / 2;
      const xk = q.Lka != null ? Math.min(x4, x3 + q.Lka) : x4; // orta perde A kapaklarına kadar uzanır (Lka kısaltılırsa A kapaklarında kısa bir parça kalır)
      G.ayirici.push(ccw([[x1, ya], [x2, ya], ...yay(x2, ym, r, -90, 90).slice(1, -1), [x2, yb], [x1, yb]]), ccw([[x3, yb], ...yay(x3, ym, r, 90, 270).slice(1, -1), [x3, ya], [xk, ya], [xk, yb]]));
      if (x4 - q.Lsa > xk + 0.05) G.ayirici.push(ccw(rect(x4 - q.Lsa, ya, x4, yb)));
    }
    // kapaklar (akış −x): A girişte, C kaba ızgaradan sonra, E ince ızgaradan önce, G terfi önünde
    const kx = { A: x4 - q.gA, C: x3 + q.gC, E: x2 - q.gE, G: x1 + q.gG };
    for (const [k, x] of Object.entries(kx)) for (const c of G.kanal) {
      G.kapak.push({ k, kanal: c.i, x, y: c.ym, B: q.b, H: q.kpH, z0: q.zTab });
      for (const [ya, yb] of [[c.y0 - q.yd, c.y0], [c.y1, c.y1 + q.yd]]) G.kes.push({ k: 'yuva', pts: rect(x - q.yw / 2, ya, x + q.yw / 2, yb), z0: q.zTab - 0.01, z1: zW + 0.01 });
      G.dosemeBos.push({ k: 'kapak', pts: rect(x - 0.15, c.y0 - q.yd - 0.05, x + 0.15, c.y1 + q.yd + 0.05) }); // kapak çerçevesi döşemeden geçer
    }
    // ızgaralar: kaba (A–C arası), ince (E–G arası); döşemede ızgara boşluğu
    // ızgara ayağı: membadaki kapaktan CU geride; boşaltma ağzının altındaki konveyör hiçbir kapak tahrikinin üstüne gelmesin
    const kxs = Object.values(kx), serbest = xd => kxs.every(x => Math.abs(xd - x) >= cK - 1e-6);
    const ayak = (a0, a1) => { for (let s = 0; a1 - s >= a0; s += 0.05) if (serbest(a1 - s - dX)) return a1 - s; return a1; };
    const xaK = ayak(kx.C + 0.35, kx.A - CU), xaI = ayak(kx.G + 0.35, kx.E - CU);
    const t0 = D / Math.tan(IA), t1 = t0 + ID / Math.sin(IA); // ızgaranın platformu kestiği yer: ayaktan ön yüz / arka yüz
    for (const c of G.kanal) for (const [k, xa] of [['kaba', xaK], ['ince', xaI]]) {
      const iz = { k, kanal: c.i, xa, xd: xa - dX, y: c.ym, x0: xa - t1 - 0.20, x1: xa - t0 + 0.20 }; G.izgara.push(iz);
      G.dosemeBos.push({ k: 'izgara', pts: rect(iz.x0, c.y0, iz.x1, c.y1) }); // döşeme açıklığı: ızgaranın geçtiği yer + her yanda 0,20
    }
    // terfiye geçiş: terfi sağ duvarında kanal genişliğinde boşluk
    G.kes.push({ k: 'gecis', pts: rect(tO - q.tTw - 0.05, yi0, tO + 0.05, yi1), z0: q.zTab - 0.01, z1: q.zTab + q.pH });
    // pompalar ve döşemede pompa kapakları
    G.pompa = [];
    for (let k = 0; k < q.np; k++) { const y = q.tTw + (q.tY - (q.np - 1) * q.ap) / 2 + k * q.ap, x = q.tTw + Math.min(0.45, q.tX / 4); G.pompa.push({ k, x, y }); G.dosemeBos.push({ k: 'pompa', pts: rect(x - 0.20, y - 0.45, Math.min(x + 1.00, G.tO - q.tTw - 0.05), y + 0.45) }); } // Çokal: basma borusu dış duvar dibinde, pompa kanala doğru
    G.doseme = { dis: G.bolge.dis, z0: zW, z1: q.zPl };
    G.tabanK = { pts: rect(tO, yc0, Lo, yc0 + Wc), z0: q.zTab - q.tb, z1: q.zTab };
    G.tabanT = { pts: rect(0, 0, tO, tYo), z0: q.zTr - q.tb, z1: q.zTr };
    // su tutucu bant: temel–perde birleşiminde perde eksenleri boyunca (taban plağı üstünden 0,10 m yukarıda)
    { const m = q.tw / 2, mt = q.tTw / 2, zk = q.zTab + 0.10, zt = q.zTr + 0.10, B = [];
      B.push({ anahtar: 'terfi', pts: rect(mt, mt, tO - mt, tYo - mt), closed: true, z: zt });
      B.push({ anahtar: 'kanal', pts: [[tO - mt, yc0 + m], [Lo - m, yc0 + m], [Lo - m, yc0 + Wc - m], [tO - mt, yc0 + Wc - m]], closed: false, z: zk });
      for (let j = 0; j + 1 < n; j++) { const ym = yi0 + (j + 1) * q.b + j * q.ts + q.ts / 2; B.push({ anahtar: 'ayirici-ince-' + j, pts: [[x1, ym], [x2, ym]], closed: false, z: zk }, { anahtar: 'ayirici-kaba-' + j, pts: [[x3, ym], [Math.min(x4, x3 + q.Lka), ym]], closed: false, z: zk }); }
      G.bantlar = B; }
    G.terfiAlt = { dis: ccw(rect(0, 0, tO, tYo)), delik: [ccw(rect(q.tTw, q.tTw, tO - q.tTw, tYo - q.tTw)).reverse()], z0: q.zTr, z1: q.zTab };
    return G;
  }

  /* ekipman yerleri (yerel): penstok (her kanalda A, C, E, G), kaba ve ince ızgara, dalgıç pompalar, merdiven, korkuluk */
  function ekipmanYer(G, zg) {
    const q = G.q, out = [], D = q.zPl - q.zTab;
    for (const k of G.kapak) out.push({ anahtar: `pen-${k.k}-${k.kanal}`, tur: 'penstok', etiket: `${k.k}${k.kanal + 1}`, p: [k.x, k.y], aci: 180, z: k.z0, B: k.B, H: k.H, D, hw: q.hs });
    // ızgara boşaltma kot zinciri (firma standardı): konteyner zeminde → bant konteyner üstü + pay → boşaltma ağzı = bant + düşü;
    // boşaltma ağzı platformdan en az hBos (halatlı tip, Çokal ≈1,0 m)
    const KZ = G.kotZincir = kotZincir(q, zg), { zZem, zBant, hdU } = KZ, dX = dusus(D + hdU, G.OL);
    const grup = {};
    for (const iz of G.izgara) { // ızgara ayağı geo'da (bölge uzunluğuyla birlikte) seçildi
      out.push({ anahtar: `izg-${iz.k}-${iz.kanal}`, tur: 'izgara', ince: iz.k === 'ince', etiket: `${iz.k === 'kaba' ? 'ME1' : 'ME2'}/${iz.kanal + 1}`, p: [iz.xa, iz.y], aci: 180, z: q.zTab, B: q.b, D, bg: iz.k === 'kaba' ? q.bgK : q.bgI, hdU, ol: G.OL });
      grup[iz.k] = iz.xa - dX; // akış −x: boşaltma ağzı ayaktan mansaba doğru
    }
    // bant konveyör: her ızgara grubunun boşaltma ağızlarının altından enine geçer, alt dış duvarın dışındaki konteynere boşaltır
    const kD = 1.07, yK = G.yc0 - 0.35 - kD / 2, y0 = G.yi1 + 0.15, yE = yK + 0.15;
    G.konveyor = [];
    for (const [k, xd] of Object.entries(grup)) {
      G.konveyor.push({ k, x: xd });
      out.push({ anahtar: `konv-${k}`, tur: 'konveyor', etiket: k === 'kaba' ? 'ME1' : 'ME2', p: [xd, y0], aci: -90, z: q.zPl, L: y0 - yE, Bk: q.Bk, Hy: zBant - q.zPl, Ld: y0 - G.yc0 });
      out.push({ anahtar: `kont-${k}`, tur: 'konteyner', etiket: k === 'kaba' ? 'ME1' : 'ME2', p: [xd, yK], aci: 0, z: zZem });
    }
    for (const p of G.pompa) out.push({ anahtar: `pom-${p.k}`, tur: 'pompa', etiket: `${p.k + 1}`, p: [p.x, p.y], aci: 180, z: q.zTr, Q: q.Qp, H: q.Hp, D: q.zPl - q.zTr, yedek: p.k === G.pompa.length - 1 });
    // merdiven: zeminden platforma, kanalın alt dış duvarına dik, giriş ucuna yakın
    const z0 = zg != null ? zg : q.zg, Hm = q.zPl - z0;
    if (Hm > 0.15) {
      const nr = Math.max(2, Math.ceil(Hm / q.mh - 1e-9)), Lm = (nr - 1) * q.mb, xm = G.Lo - 0.4 - q.mw / 2;
      out.push({ anahtar: 'merdiven', tur: 'merdiven', pts: [[xm, G.yc0 - Lm], [xm, G.yc0]], z0, z1: q.zPl, w: q.mw, b: q.mb, hmax: q.mh, nr, xm });
      // korkuluk: platform çevresi (merdivenin çıktığı yer açık)
      const a = 0.05, d = G.bolge.dis, xa = xm - q.mw / 2, xb = xm + q.mw / 2, yA = G.yc0 + a;
      const kes = G.konveyor.map(c => [c.x - 0.45, c.x + 0.45]).sort((u, v) => v[0] - u[0]); let xs = xa, ki = 0;
      for (const [g0, g1] of kes) { if (g1 < xs && g0 > G.tO + a + 0.2) { out.push({ anahtar: 'korkuluk-' + (++ki), tur: 'korkuluk', z: q.zPl, pts: [[xs, yA], [g1, yA]] }); xs = g0; } }
      out.push({ anahtar: 'korkuluk', tur: 'korkuluk', z: q.zPl, pts: [[xs, yA], [G.tO + a, yA], [G.tO + a, a], [a, a], [a, G.tYo - a], [G.tO + a, G.tYo - a], [G.tO + a, G.yc0 + G.Wc - a], [G.Lo - a, G.yc0 + G.Wc - a], [G.Lo - a, yA], [xb, yA]] });
      void d;
    }
    return out;
  }

  /* su: kanalda (maks / min su derinliği) ve terfi ıslak haznesinde (pompa devreye girme / çıkma kotları) */
  function su(G) { const q = G.q; return [
    { anahtar: 'su-kanal', ad: 'Izgara kanalları', pts: rect(G.tO, G.yi0, G.x5, G.yi1), zb: q.zTab, maks: q.zTab + q.hs, min: q.zTab + q.hsMin },
    { anahtar: 'su-terfi', ad: 'Terfi ıslak haznesi', pts: rect(q.tTw, q.tTw, G.tO - q.tTw, G.tYo - q.tTw), zb: q.zTr, maks: q.zTon, min: q.zToff },
  ]; }

  if (NODE) module.exports = { geo, DEF, ekipmanYer, su, islakHazne };
  if (!C || !C.T || !C.prim || typeof document === 'undefined') return;

  /* ================= ÇİZİM ================= */
  const M = C.M, T = C.T, { L, P, TX } = C.prim, { ext } = C.meshDef;
  const tH = mm => C.annoH(mm == null ? C.doc.set.textH : mm);
  const f2 = v => M.fmt(v, 2).replace('.', ',');
  const kot = z => (C.fmtKot ? C.fmtKot(z) : f2(z));
  const unum = e => (String(e.code || '').match(/\d+/) || ['1xx'])[0];
  const W3 = f => p => f.at(p[0], p[1], p[2]);
  const triAg = (f, K, renk) => { const uy = M.cross([0, 0, 1], f.ux), Wn = n => [f.ux[0] * n[0] + uy[0] * n[1], f.ux[1] * n[0] + uy[1] * n[1], n[2]]; return { t: 'tri', v: K.v.map(W3(f)), vn: K.vn.map(Wn), f: K.f, edges3: K.e.map(ab => ab.map(W3(f))), fc: renk ? K.f.map(() => renk) : undefined }; };

  T.onaritma = {
    label: 'Ön arıtma: ızgara kanalları + giriş terfisi', ifc: 'IfcTank',
    prims: e => {
      const G = geo(e), q = G.q, f = C.frame(e.o, e.rot), z = q.zPl, out = [], h = tH();
      const rd = (() => { let r = ((e.rot || 0) % 360 + 360) % 360; if (r > 90 && r <= 270) r -= 180; return r * Math.PI / 180; })();
      const PL = (pts, c, o) => P(pts.map(p => f.at(p[0], p[1], z)), c, o), T1 = (x, y, s, o, al) => TX(f.at(x, y, z), (o && o.h) || h, s, rd, al || 'M', o);
      for (const r of [G.bolge.dis, ...G.bolge.delik]) out.push(PL(r, true, { lw: 50 }));
      for (const a of G.ayirici) out.push(PL(a, true, { lw: 50 }));
      for (const b of G.dosemeBos) out.push(PL(b.pts, true, { lt: 'DASHED', color: 8, lw: 18 }));
      const un = unum(e);
      if (!e.ekipman) for (const k of G.kapak) out.push(L(f.at(k.x, k.y - k.B / 2 - 0.05, z), f.at(k.x, k.y + k.B / 2 + 0.05, z), { color: 6, lw: 70 }));
      for (const k of G.kapak.filter(k => k.kanal === 0)) out.push(T1(k.x, G.yc0 - 0.45, `SK-${un}/${k.k}`, { color: 6 }));
      out.push(T1((G.x3 + G.x4) / 2, G.yc0 + G.Wc + 0.5, 'Kaba ızgaralar', { color: 4 }), T1((G.x1 + G.x2) / 2, G.yc0 + G.Wc + 0.5, 'İnce ızgaralar', { color: 4 }), T1(G.tO / 2, G.tYo + 0.5, 'Giriş terfisi', { color: 4 }), T1((G.x4 + G.x5) / 2, G.yc0 + G.Wc + 0.5, 'Giriş odası', { color: 4 }));
      out.push(T1(G.Lo / 2, -1.2, `Kanal tabanı ${kot(q.zTab)} · platform ${kot(q.zPl)} · terfi tabanı ${kot(q.zTr)} · kanal ${q.n} × ${f2(q.b)} m`, { color: 3 }));
      { const I = G.IH; out.push(T1(G.tO / 2, -1.9, `Terfi: en üst (yedek + alarm) ${kot(q.zTon)} · ${I.pom.map((z, i) => `${i + 1}. pompa ${kot(z)}`).join(' · ')} · durma ${kot(q.zToff)} · V = ${f2(I.V)} m³ (Z ${M.fmt(I.Zger, 1)}/sa)`, { color: 3 })); }
      out.push(TX(f.at(G.Lo / 2, G.tYo + h * 7, z), tH(5), `${e.code || ''} ${e.name || 'Izgara yapısı ve giriş terfisi'}`.trim(), rd, 'C', { color: 2 }));
      return out;
    },
    mesh: e => {
      const G = geo(e), q = G.q, f = C.frame(e.o, e.rot), out = [];
      const key = JSON.stringify([G.q, e.o, e.rot]);
      if (!e._ag || e._agK !== key) {
        const ag = triAg(f, bolgeKati(G.bolge, q.zTab, G.zW)); // duvarlar taban plağının üstünden
        let son = ag; if (C.boslukAg) { try { son = C.boslukAg([ag], G.kes.map(k => ({ pts: k.pts.map(p => f.at(p[0], p[1], k.z0)), d: [0, 0, k.z1 - k.z0] })), [0.74, 0.74, 0.71]); } catch (er) { console.error('ön arıtma boşluk', er); } }
        e._ag = son; e._agK = key;
      }
      out.push(e._ag);
      out.push(triAg(f, bolgeKati({ dis: G.terfiAlt.dis, delik: G.terfiAlt.delik }, G.terfiAlt.z0, G.terfiAlt.z1))); // terfi duvarlarının kanal tabanı altındaki kısmı
      for (const a of G.ayirici) out.push(ext(f.at(0, 0, q.zTab), f.ux, [0, 0, 1], a, Math.min(q.hA, G.zW - q.zTab))); // orta perde alçak (Çokal C-C: 1,00 m)
      for (const t of [G.tabanK, G.tabanT]) out.push(ext(f.at(0, 0, t.z0), f.ux, [0, 0, 1], t.pts, t.z1 - t.z0));
      out.push(triAg(f, bolgeKati({ dis: G.doseme.dis, delik: G.dosemeBos.map(b => ccw(b.pts).reverse()) }, G.doseme.z0, G.doseme.z1)));
      return out;
    },
    snaps: e => { const G = geo(e), f = C.frame(e.o, e.rot); return G.bolge.dis.map(p => ({ p: f.at(p[0], p[1], G.q.zPl), k: 'end' })); },
    xf: (e, X) => { const f = C.frame(e.o, e.rot), o2 = X.p(e.o); const v = X.v([Math.cos((e.rot || 0) * Math.PI / 180), Math.sin((e.rot || 0) * Math.PI / 180), 0]); e.rot = Math.atan2(v[1], v[0]) * 180 / Math.PI; e.o = [o2[0], o2[1], 0]; void f; },
    info: e => { const G = geo(e); return `${e.code || ''} ızgara yapısı + giriş terfisi: ${G.q.n} kanal × ${f2(G.q.b)} m, ${f2(G.Lo)} × ${f2(Math.max(G.tYo, G.Wc))} m, kanal tabanı ${kot(G.q.zTab)}, platform ${kot(G.q.zPl)}`; },
  };

  /* ================= EKİPMAN ================= */
  const mm = v => Math.round(v * 1000);
  const imza = x => JSON.stringify(x.type === 'aile' ? [x.p, x.rot, x.z, x.par] : [x.pts, x.z0, x.z1]);
  function nesne(e, y) {
    const f = C.frame(e.o, e.rot), un = unum(e), W2 = p => { const w = f.at(p[0], p[1], 0); return [w[0], w[1]]; };
    const aile = (fam, par, ad) => { const d = C.AILELER && C.AILELER[fam]; if (!d) return null; const t0 = d.tipler && d.tipler[0]; return { type: 'aile', props: { fam, tip: t0 ? t0.ad : null, tipU: t0 ? t0.ad : null, par: Object.assign({}, t0 ? t0.p : {}, par), p: [...W2(y.p), 0], rot: (e.rot || 0) + y.aci, z: y.z, ad, layer: d.katman || C.doc.cur.layer } }; };
    if (y.tur === 'penstok') return aile('penstock_kanal', { B: mm(y.B), H: mm(y.H), D: mm(y.D), hw: mm(y.hw), tahrik: y.B * y.H > 1.0 ? 'AKT' : 'EL', konum: 'K' }, `SK-${un}/${y.etiket}`);
    if (y.tur === 'izgara') return aile('kaba_izgara', { B: mm(y.B), D: mm(y.D), bg: y.bg, hdU: mm(y.hdU), ol: mm(y.ol) }, `${y.ince ? 'İNCE' : 'KABA'} IZGARA T${un}.01 ${y.etiket}`);
    if (y.tur === 'pompa') { const fam = C.AILELER && C.AILELER.dalgic_pompa_ksb_amarexn ? 'dalgic_pompa_ksb_amarexn' : 'dalgic_pompa_wilo_supra'; return aile(fam, { Q: y.Q, H: y.H, D: mm(y.D) }, `TERFİ POMPASI P-${un}/${y.etiket}${y.yedek ? ' (yedek)' : ''}`); }
    if (y.tur === 'konveyor') return aile('bant_konveyor', { L: mm(y.L), B: mm(y.Bk), Hy: mm(y.Hy), Ld: mm(y.Ld), ms: 'R' }, /* motor ızgaranın öbür yanında */ `BANT KONVEYÖR T${un}.02 ${y.etiket}`);
    if (y.tur === 'konteyner') return aile('cop_konteyner', {}, `ATIK KONTEYNERİ T${un}.03 ${y.etiket}`);
    if (y.tur === 'merdiven') return { type: 'merdiven', props: { pts: y.pts.map(W2), z0: y.z0, z1: y.z1, w: y.w, hmax: y.hmax * 100, b: y.b * 100, tip: 'beton', kork: 'iki', km: 'galvaniz', kh: 110, dik: 150, tk: 'E', hiza: 'O', uz: 30, us: 'H', as: 'H', sah: 0, nos: 0, t: 0, rk: 'H' } };
    if (y.tur === 'korkuluk') return { type: 'korkuluk', props: { pts: y.pts.map(p => [...W2(p), y.z]), km: 'galvaniz', kh: 110, dik: 150, tk: 'E', kapali: false } };
    return null;
  }
  C.onaritmaEkipman = (e, sessiz) => {
    if (!e.code && C.uniteNumarala) C.uniteNumarala(true);
    const G = geo(e), yer = ekipmanYer(G, e.zg != null ? +e.zg : null), once = new Set(e.ekAnahtar || []), yeniK = new Set(yer.map(y => y.anahtar));
    const mevcut = new Map(C.doc.ents.filter(x => x.bag === e.id && x.anahtar).map(x => [x.anahtar, x]));
    let n = 0, g = 0, el = 0;
    for (const y of yer) {
      const x = mevcut.get(y.anahtar), o = nesne(e, y); if (!o) continue;
      if (!x) { if (once.has(y.anahtar)) continue; const z = C.add(C.newEnt(o.type, Object.assign({}, o.props, { bag: e.id, anahtar: y.anahtar }))); delete z.sp; z.oto = imza(z); n++; continue; }
      if (x.oto !== imza(x)) { el++; continue; }
      const eski = x.oto; Object.assign(x, o.props); delete x._c; delete x._g; delete x._q; x.oto = imza(x); if (x.oto !== eski) { g++; if (C.touch) C.touch(x); }
    }
    const sil = [...mevcut.values()].filter(x => !yeniK.has(x.anahtar) && x.oto === imza(x)); if (sil.length && C.remove) C.remove(sil);
    if (C.suYapiBant) C.suYapiBant(e, G.bantlar);
    // su (maks. düzeyde)
    const f = C.frame(e.o, e.rot), W2 = p => { const w = f.at(p[0], p[1], 0); return [w[0], w[1]]; }, suM = new Map(C.doc.ents.filter(x => x.type === 'su' && x.bag === e.id).map(x => [x.anahtar, x]));
    if (C.ensureLayer) C.ensureLayer('INS_SU', 150, 'CONTINUOUS', 13);
    for (const s of su(G)) { const props = { pts: s.pts.map(W2), zb: s.zb, zs: e.suDurum === 'min' ? s.min : s.maks, zsMaks: s.maks, zsMin: s.min, tur: 'atiksu', ad: s.ad, layer: 'INS_SU' }; const x = suM.get(s.anahtar); if (x) { Object.assign(x, props); delete x._c; } else { const z = C.add(C.newEnt('su', Object.assign(props, { bag: e.id, anahtar: s.anahtar }))); delete z.sp; } }
    e.ekipman = true; e.ekAnahtar = [...yeniK]; e._ekK = JSON.stringify([G.q, e.o, e.rot, e.code]); delete e._c;
    if (n || g) C.changed && C.changed();
    if (!sessiz) C.log(`✓ ${e.code || ''} ön arıtma ekipmanı: ${n} yeni, ${g} güncellendi${el ? `, ${el} elle taşınmış (korundu)` : ''}.`);
  };
  C.on && C.on('changeIdle', () => { if (!C.doc) return; for (const e of C.doc.ents) if (e.type === 'onaritma' && e.ekipman) { const k = JSON.stringify([geo(e).q, e.o, e.rot, e.code]); if (e._ekK !== k) { if (e._ekK == null) { e._ekK = k; continue; } C.onaritmaEkipman(e, true); } } });

  /* ================= KOMUT ================= */
  const takeKV = () => { const kv = {}; C.cmd.queue = C.cmd.queue.filter(t => { const m = t.match(/^([A-Za-zÇĞİÖŞÜçğıöşü_0-9]+)=(.*)$/); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; }); return kv; };
  C.addCommand(['ONARITMA', 'IZGARAYAPISI', 'IZGARATERFI'], 'Ön arıtma derin yapısı: ızgara kanalları (kaba + ince, kapaklı, ortak geçişli) ve giriş terfisi — Çokal T-101/T-102 düzeni. ONARITMA [N=2 B=0.6 TABAN=86.75 PLATFORM=95.45]', async (I) => {
    const kv = takeKV(), e = C.newEnt('onaritma', Object.assign(JSON.parse(JSON.stringify(DEF)), { layer: C.std('BETON'), u: 'cs', name: 'Izgara yapısı ve giriş terfisi', o: [0, 0, 0], rot: 0, sira: Date.now() }));
    for (const [k, p] of Object.entries({ N: 'n', B: 'b', TABAN: 'zTab', PLATFORM: 'zPl', ZEMIN: 'zg' })) if (kv[k] != null && isFinite(C.num(kv[k]))) e[p] = C.num(kv[k]);
    C.cmd.base = null; C.cmd.preview = c => T.onaritma.prims(Object.assign({}, e, { o: c, _c: null }));
    const p = await I.pt('Yapının sol alt köşesi (terfi tarafı)'); C.cmd.preview = null; if (!p || typeof p === 'string') return; e.o = [p[0], p[1], 0];
    C.cmd.base = p; C.cmd.preview = c => T.onaritma.prims(Object.assign({}, e, { rot: M.deg(M.ang(p, c)), _c: null }));
    const a = await I.angle('Dönüş açısı', p, 0); C.cmd.preview = null; e.rot = typeof a === 'number' ? a : 0;
    C.add(e); if (C.uniteNumarala) C.uniteNumarala(true); C.onaritmaEkipman(e);
    C.log(`✓ ${T.onaritma.info(e)}`);
  });
  if (C.ribbon && C.ribbon.tabs) {
    const tab = C.ribbon.tabs.find(t => t[0] === 'Arıtma'), pr = tab && tab[1].find(p => p[0] === 'Proses');
    if (pr && !pr[1].some(b => b.cmd === 'ONARITMA')) { pr[1].push({ cmd: 'ONARITMA', t: 'Izgara + terfi', i: 'ctank' }); try { C.ribbon.render(); } catch (err) { } }
  }
  if (window.DIL) window.DIL.ekle('en', 'English', [['Izgara + terfi', 'Screens + lift station'], ['Kaba ızgaralar', 'Coarse screens'], ['İnce ızgaralar', 'Fine screens'], ['Giriş terfisi', 'Inlet pumping station'], ['Giriş odası', 'Inlet chamber']]);
})(typeof window !== 'undefined' ? window.C : (globalThis.C || null));

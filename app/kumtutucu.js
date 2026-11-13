/* ArıtmaCAD — KUM VE YAĞ TUTUCU (havalandırmalı, gezer köprülü; Çokal AAT T-103 biçimi) çizim varlığı
   Ölçüler metre; ayak izinin sol alt köşesi yerel (0,0); akış +x (dağıtma kanalı x = 0 ucunda, çıkış kanalı öbür uçta).
   Ünite kartı: app/unite-kart.js → K.kumKart (göz sayısı, bölme genişlikleri, su derinliği, boy, kotlar).
   Düzen (Çokal 1-Çokal_AAT_Kaba-İnce-Giriş-Kum Yağ Tutucu_R3.dwg, plan ve E-E, F-F, G-G, H-H, I-I kesitleri):
   - Boyuna: dış duvar · dağıtma kanalı (bD) · duvar · gözler (L) · duvar · çıkış kanalı (bC) · dış duvar.
   - Enine: her göz = yağ bölmesi (bF) + ayırma kirişi (ta) + kum bölmesi (b). Yağ bölmesi dış duvar tarafında: komşu gözler aynalı.
   - Göz tabanı grobeton dolgu: kum oluğu (taban eni bo, derinlik ho, yanları ko açılır) kum bölmesinde ayırma kirişinin dibinde;
     oluğun üstünden duvar diplerine 45° yükselir (kum tarafında b − bo − 2·ko, yağ tarafında bF + ta kadar).
     Dolgunun altı düz taban plağı (oluk dibinden td aşağıda), kalınlığı tr. Grobeton 3B'de betondan ayrı renkte.
   - Ayırma kirişi (betonarme, su yüzünün lu üstünden lh aşağı) ve altında sac yağ lameli (ls).
   - Gözler arası duvar alçak (zy − yt); üstünde yürüme yolu döşemesi (en yy, üst kotu zy = duvar üstü − 0,85). Dış duvarlar zu kotunda:
     gezer köprü rayları bunların üstünde (ray ayrı ekipman nesnesi: kopru_rayi ailesi).
   - Alt (y = 0) dış duvarın üstünde dışa konsol kum oluğu (iç en ok): kum pompaları buraya basar, oluk kum seperatörüne akar.
   - Dağıtma kanalından her göze kum bölmesi ekseninde kapaklı açıklık (gB × gH, eşik su yüzünden gE aşağıda);
     çıkış duvarında göz başına kum bölmesi ekseninde savak (en sB, kret su yüzünden sv aşağıda).
   - Çıkış kanalı gözlerden derin (H-H: tabanı göz taban plağı üstünden hC aşağıda, 20 cm dolgu); çıkış borusu tabanda, kum oluğu
     tarafındaki yan duvardan çıkar. Kanalın öbür yan duvarı ve üstü yürüme yolu kotunda sahanlık: merdiven zeminden buraya çıkar,
     orta yürüme yolu sahanlığa bağlanır.
   - Yağ toplama kanalı (I-I, plan): yağ bölmesinin çıkış ucunda betonarme oluk — iç boy yk (0,60) × yağ bölmesi eni, tabanı su yüzünden
     yE aşağıda (97,00), taban ve duvarlar ykt (0,20); iç yanı ayırma kirişinin devamı, uç duvarı su yüzünün yU üstünde (97,60).
     Uç duvarın önünde paslanmaz sıyırma rampası (rB = 0,40) kanal tabanı kotundan uç duvar üstüne yükselir. Yağ borusu (SA DN150)
     kanal tabanından dış duvarı geçip dirsekle yağ konteynerine iner; duvarda konsol mesnet.
   - Havalandırma (E-E, F-F, alt plan): blower hattı oluk tarafında yerden yükselir (CA DN50, oluk dışından sepY), dağıtma–göz duvarının üstünden
     (mesnetli, BTK duvar üstü + 0,15) her gözün başlığına; başlık yürüme yolu üstünde mesnet ayaklarında (duvar yüzünden hb, BTK yürüme yolu + hm).
     Göz başına L / dp (Çokal 11,00 / 2,75 = 4) düşüm, eşit aralıkla (ilk ve son yarım aralık); her düşümde izolasyon vanası ve 2,05 m difüzör takımı.
   - Kum seperatörü oluğun dışında, ekseni yapıya paralel: hazne dağıtma tarafında (göz başından sepX), vida çıkış kanalına doğru yükselir,
     ucunda kum konteyneri; oluğun tabanından DR DN150 iniş borusu hazneye (BTK 97,45).
   - Duvardan geçen bütün borular (giriş, çıkış, yağ) duvar geçiş parçasıyla (DGP) kapanır; delikler yuvarlak.
   - Giriş borusu (dG) dağıtma kanalına yandan, su yüzünün üstünden girer.
   Saf geometri (geo, ekipmanYer, su) Node ile denenir: node test/kumtutucu.test.js */
(function (C) {
  'use strict';
  const NODE = typeof module !== 'undefined' && module.exports && typeof require !== 'undefined';
  const ANA = NODE ? require('./anaerobik.js') : null;
  const bolgeKati = (...a) => (ANA ? ANA.bolgeKati : C.bolgeKati)(...a);
  const DEF = {
    N: 2, b: 1.00, ta: 0.20, bF: 0.40, L: 11.40, h: 1.26, // göz: kum bölmesi, ayırma kirişi, yağ bölmesi, boy, su derinliği (su yüzü → kum oluğu üstü)
    zs: 97.45, zu: 99.15, zg: 95.50, // su yüzü, duvar üstü, zemin (tretuvar) kotu
    tw: 0.40, ti: 0.30, bD: 1.50, bC: 1.50, // dış duvar, gözler arası duvar, dağıtma ve çıkış kanalı iç genişlikleri
    ho: 0.50, bo: 0.50, ko: 0.10, td: 0.64, tr: 0.50, // kum oluğu: derinlik, taban eni, yan açılma; oluk altı dolgu; taban plağı
    yy: 1.00, yt: 0.20, yh: 0.85, // orta yürüme yolu: en, döşeme kalınlığı, duvar üstünden aşağıda
    ok: 0.40, okd: 0.20, okh: 0.55, okt: 0.20, okb: 0.40, // üst kum oluğu: iç en, duvar, iç derinlik, taban kalınlığı, göz başından boşluk
    lu: 0.30, lh: 0.55, ls: 0.63, // ayırma kirişi: su üstü, yükseklik; sac lamel boyu (kiriş altından)
    gB: 0.60, gH: 0.40, gE: 0.30, // giriş kapağı açıklığı: en, yükseklik, eşik su yüzünden aşağıda
    sv: 0.10, sH: 0.40, sB: 0.90, dT: 0.50, // savak: kret su yüzünden aşağıda, açıklık yüksekliği, en; dağıtma kanalı tabanı su yüzünden aşağıda
    hC: 1.60, cD: 0.20, dC: 0.30, // çıkış kanalı: taban plağı üstü göz taban plağı üstünden aşağıda, dolgu, çıkış borusu çapı
    dG: 0.40, gU: 0.30, dY: 0.15, yE: 0.45, // giriş borusu çapı ve ekseni su yüzünden yukarıda; yağ borusu anma çapı; yağ kanalı tabanı (= yağ borusu altı) su yüzünden aşağıda
    yk: 0.60, ykt: 0.20, yU: 0.15, rB: 0.40, // yağ toplama kanalı: iç boy, taban / duvar kalınlığı, uç duvar üstü su yüzünden yukarı; sıyırma rampası boyu (Çokal I-I, plan)
    kc: 0.40, kp: 3.80, // ayırma kirişi altındaki kolonlar: boy (akış yönünde), eksen aralığı (Çokal: 3,40 m lamel paneli + 0,40 kolon)
    dp: 2.75, hb: 0.20, hm: 0.187, dE: 0.116, dJ: 0.375, // havalandırma (Çokal F-F, alt plan): düşüm aralığı; başlık duvar yüzünden; başlık mesneti (yürüme yolu → boru altı);
    //                                                     iniş yürüme yolu kenarından dışarı; 45° kırılma yürüme yolu üstünden aşağıda
    sepX: 0.62, sepY: 0.275, sepL: 4.45, // kum seperatörü (Çokal plan): hazne başı göz başından; ekseni oluk dışından; boy (hazne + vida)
    mw: 1.00, mb: 0.25, mh: 0.19, // merdiven: en, basamak genişliği, en büyük rıht
  };
  const PAR = Object.keys(DEF);
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const r3 = v => Math.round(v * 1000) / 1000;
  /* boru dış çapları: PE100 (EN 12201, dış çap anma), paslanmaz (ASME B36.19) — giriş / çıkış / yağ boruları ve delikleri */
  const PEOD = [110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000];
  const SSOD = { 32: 42.2, 50: 60.3, 65: 73.0, 80: 88.9, 100: 114.3, 125: 141.3, 150: 168.3, 200: 219.1, 250: 273.1, 300: 323.9 };
  const yakin = (L, v) => L.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
  const peBoru = d => { const od = yakin(PEOD, d * 1000); return { cins: 'pe', sinif: 'SDR17', dn: od, od: od / 1000, kalite: 'HDPE', ek: ' (PN10)' }; };
  const ssBoru = d => { const dn = yakin(Object.keys(SSOD).map(Number), d * 1000); return { cins: 'paslanmaz', sinif: '10S', dn, od: SSOD[dn] / 1000, kalite: 'SS304L', ek: '' }; };
  /* duvardaki yuvarlak boru deliği: (xc, zc) merkezli r yarıçaplı 20-gen, y = ya düzleminden yb'ye */
  const daireDelik = (xc, zc, r, ya, yb) => ({ k: 'boru', poly: Array.from({ length: 20 }, (_, i) => { const t = 2 * Math.PI * i / 20; return [xc + r * Math.cos(t), ya, zc + r * Math.sin(t)]; }), d: [0, yb - ya, 0] });

  function geo(e) {
    const q = {}; e = e || {}; for (const k of PAR) q[k] = e[k] != null && e[k] !== '' ? +e[k] : DEF[k];
    const N = Math.max(1, Math.round(q.N)), gz = q.b + q.ta + q.bF, en = N * gz + (N - 1) * q.ti + 2 * q.tw;
    const xD0 = q.tw, xD1 = xD0 + q.bD, xg0 = xD1 + q.tw, xg1 = xg0 + q.L, xC0 = xg1 + q.tw, xC1 = xC0 + q.bC, boy = xC1 + q.tw;
    const zs = q.zs, zt = zs - q.h, zo = zt - q.ho, zr1 = zo - q.td, zr0 = zr1 - q.tr, zu = q.zu, zy = zu - q.yh, zmw = zy - q.yt;
    const ek = Math.max(0, q.b - q.bo - 2 * q.ko), ey = q.bF + q.ta; // 45° eğimlerin yükselmesi: kum tarafı, yağ tarafı
    const zcs = zr1 - q.hC, zcf = zcs + q.cD; // çıkış kanalı: taban plağı üstü, dolgu üstü
    const zkA = zs + q.lu - q.lh; // ayırma kirişi altı
    const G = { q, N, gz, en, boy, xD0, xD1, xg0, xg1, xC0, xC1, zs, zt, zo, zr1, zr0, zu, zy, zmw, zcs, zcf, zkA, ek, ey, goz: [], kes: [], kutu: [], kapak: [], savak: [], boru: [], rampa: [], kolon: [], lamel: [], yagKanal: [], dusum: [], hat: [], mesnet: [] };
    const delik = [rect(xD0, q.tw, xD1, en - q.tw)];
    const yb = ssBoru(q.dY); // yağ borusu (SA DN150 SS304L)
    for (let i = 0; i < N; i++) {
      const y0 = q.tw + i * (gz + q.ti), y1 = y0 + gz, alt = i % 2 === 0; // alt: yağ bölmesi küçük y tarafında
      const yag = alt ? [y0, y0 + q.bF] : [y1 - q.bF, y1], ayir = alt ? [y0 + q.bF, y0 + q.bF + q.ta] : [y1 - q.bF - q.ta, y1 - q.bF], kum = alt ? [y0 + q.bF + q.ta, y1] : [y0, y1 - q.bF - q.ta];
      // dolgu kesiti (s: yağ dış duvarından kum duvarına 0 … gz; z) → yerel (y, z)
      const S = [[0, zr1], [gz, zr1], [gz, zt + ek], [gz - ek, zt], [gz - ek - q.ko, zo], [gz - ek - q.ko - q.bo, zo], [ey, zt], [0, zt + ey]];
      const prof = S.map(([s, z]) => [alt ? y0 + s : y1 - s, z]);
      const yo = alt ? y0 + gz - ek - q.ko - q.bo / 2 : y1 - (gz - ek - q.ko - q.bo / 2); // kum oluğu ekseni
      G.goz.push({ i, y0, y1, alt, yag, ayir, kum, prof, yo, ym: (kum[0] + kum[1]) / 2 });
      delik.push(rect(xg0, y0, xg1, y1));
      // giriş kapağı (dağıtma kanalı → kum bölmesi) ve savak (göz → çıkış kanalı)
      const yk = (kum[0] + kum[1]) / 2, zE = zs - q.gE;
      G.kapak.push({ i, x: xD1, y: yk, B: q.gB, H: q.gH, z0: zE });
      G.kes.push({ k: 'giris', pts: rect(xD1 - 0.05, yk - q.gB / 2, xg0 + 0.05, yk + q.gB / 2), z0: zE, z1: zE + q.gH });
      const sB = Math.min(q.sB, q.b), ysv = (kum[0] + kum[1]) / 2, zK = zs - q.sv;
      G.savak.push({ i, x: xg1, y: ysv, B: sB, z: zK });
      G.kes.push({ k: 'savak', pts: rect(xg1 - 0.05, ysv - sB / 2, xC0 + 0.05, ysv + sB / 2), z0: zK, z1: zK + q.sH });
      // ayırma kirişi ve sac lamel
      G.kutu.push({ k: 'kiris', pts: rect(xg0, ayir[0], xg1, ayir[1]), z0: zkA, z1: zs + q.lu });
      // kirişin altında kolonlar (dolgudan kiriş altına) ve kolonlara monte paslanmaz yağ lamelleri (kolonlar arası paneller, kum bölmesi yüzünde)
      { const nP = Math.max(1, Math.round((q.L + q.kc) / q.kp)), Lp = (q.L - (nP - 1) * q.kc) / nP, yl = alt ? ayir[1] : ayir[0] - 0.01;
        for (let k = 0; k < nP; k++) { const xb = xg1 - k * (Lp + q.kc), xa = xb - Lp; // çıkış ucundan başlayarak
          G.lamel.push({ i, k, x0: xa - (k + 1 < nP ? 0.05 : 0), x1: xb + (k > 0 ? 0.05 : 0), y0: yl, y1: yl + 0.01, z0: zkA - q.ls, z1: zkA });
          if (k + 1 < nP) G.kolon.push({ i, k, pts: rect(xa - q.kc, ayir[0], xa, ayir[1]), z0: zt, z1: zkA }); } }
      // yağ toplama kanalı (Çokal I-I): yağ bölmesinin çıkış ucunda betonarme oluk; iç yanı ayırma kirişinin aşağı devamı, uç duvarı su üstünde
      { const zkt = zs - q.yE, zkb = zkt - q.ykt, xk0 = xg1 - q.yk, xu0 = xk0 - q.ykt, zuc = zs + q.yU, yy0 = Math.min(yag[0], ayir[0]), yy1 = Math.max(yag[1], ayir[1]);
        G.yagKanal.push({ i, x0: xk0, x1: xg1, xu: xu0, y0: yag[0], y1: yag[1], zt: zkt, zb: zkb, zu: zuc });
        G.kutu.push({ k: 'yag-taban', pts: rect(xu0, yy0, xg1, yy1), z0: zkb, z1: zkt }, { k: 'yag-uc', pts: rect(xu0, yag[0], xk0, yag[1]), z0: zkt, z1: zuc },
          { k: 'yag-yan', pts: rect(xu0, ayir[0], xg1, ayir[1]), z0: zkt, z1: zkA });
        // paslanmaz sıyırma rampası: kanal tabanı kotundan uç duvarın üstüne yükselen eğik sac
        G.rampa.push({ i, y0: yag[0], y1: yag[1], a: [xu0 - q.rB, zkt], b: [xu0, zuc] });
        // yağ borusu: kanal tabanından (BTK = taban) dış duvarı geçer; duvarda DGP, yuvarlak delik
        const disY = alt ? 0 : en, sg = alt ? -1 : 1, xp = (xk0 + xg1) / 2, zc = zkt + yb.od / 2;
        G.boru.push(Object.assign({ k: 'yag-' + i, kod: 'SA', p: [xp, disY], yon: [0, sg], d: yb.od, z0: zkt, z: zc, yw: alt ? q.tw / 2 : en - q.tw / 2 }, yb));
        G.kes.push(daireDelik(xp, zc, yb.od / 2 + 0.005, alt ? -0.05 : en + 0.05, alt ? q.tw + 0.05 : en - q.tw - 0.05)); }
    }
    delik.push(rect(xC0, q.tw, xC1, en - q.tw));
    G.bolge = { dis: rect(0, 0, boy, en), delik: delik.map(d => d.slice().reverse()) };
    // gözler arası duvarlar alçak; üstlerinde yürüme yolu
    G.yol = [];
    for (let i = 0; i + 1 < N; i++) { const ya = G.goz[i].y1, yb2 = ya + q.ti, ym = (ya + yb2) / 2;
      G.kes.push({ k: 'alcak', pts: rect(xg0, ya - 0.001, xg1, yb2 + 0.001), z0: zmw, z1: zu + 0.05 });
      G.yol.push({ i, pts: rect(xg0, ym - q.yy / 2, xg1, ym + q.yy / 2), z0: zmw, z1: zy, ym }); }
    // çıkış kanalı sahanlığı (yürüme yolu kotunda): üst (y = en) yan duvar ve göz – kanal duvarı bu bölgede alçak; orta yürüme yolu buraya bağlanır
    { const ys = N > 1 ? G.yol[G.yol.length - 1].ym - q.yy / 2 : en - Math.max(1.5, q.tw + 1.1);
      G.kes.push({ k: 'alcak', pts: rect(xg1 - 0.001, ys, boy + 0.05, en + 0.05), z0: zmw, z1: zu + 0.05 });
      G.sahanlik = { pts: rect(xg1, ys, boy, en), z0: zmw, z1: zy, ys }; }
    // giriş (dağıtma kanalına üst yan duvardan, su üstünden) ve çıkış (çıkış kanalı tabanında, kum oluğu tarafındaki yan duvardan) boruları: PE, DGP'li yuvarlak delik
    { const gb = peBoru(q.dG), xg = (xD0 + xD1) / 2, zgz = zs + q.gU;
      G.boru.push(Object.assign({ k: 'giris', kod: 'WW', p: [xg, en], yon: [0, 1], d: gb.od, z0: zgz - gb.od / 2, z: zgz, yw: en - q.tw / 2 }, gb));
      G.kes.push(daireDelik(xg, zgz, gb.od / 2 + 0.005, en - q.tw - 0.05, en + 0.05));
      const cb = peBoru(q.dC), xc = (xC0 + xC1) / 2;
      G.boru.push(Object.assign({ k: 'cikis', kod: 'WW', p: [xc, 0], yon: [0, -1], d: cb.od, z0: zcf, z: zcf + cb.od / 2, yw: q.tw / 2 }, cb));
      G.kesAlt = [daireDelik(xc, zcf + cb.od / 2, cb.od / 2 + 0.005, -0.05, q.tw + 0.05)]; }
    // dağıtma kanalı taban dolgusu (grobeton), taban plağı
    G.kutu.push({ k: 'dagitma-dolgu', gro: true, pts: rect(xD0, q.tw, xD1, en - q.tw), z0: zr1, z1: zs - q.dT });
    G.taban = { pts: rect(0, 0, xg1, en), z0: zr0, z1: zr1 };
    // çıkış kanalı gözlerden derin: taban plağı üstünün altında kalan duvarlar, kendi taban plağı ve dolgusu
    G.cikisAlt = { dis: rect(xg1, 0, boy, en), delik: [rect(xC0, q.tw, xC1, en - q.tw).slice().reverse()], z0: zcs, z1: zr1 };
    G.tabanC = { pts: rect(xg1, 0, boy, en), z0: zcs - q.tr, z1: zcs };
    G.kutu.push({ k: 'cikis-dolgu', gro: true, pts: rect(xC0, q.tw, xC1, en - q.tw), z0: zcs, z1: zcf });
    // gezer köprü rayları: iki dış duvar ekseninde, yapı boyunca (ayrı ekipman nesnesi)
    G.ray = [q.tw / 2, en - q.tw / 2].map(y => ({ y, x0: 0.10, x1: xg1 - 0.05 })); // göz sonunda biter: ötesinde duvar sahanlık kotuna alçalıyor
    // üst kum oluğu (alt dış duvarın dışında konsol): taban + dış duvar + uç duvarları
    { const xa = xg0, xb = xg1 - q.okb, w = q.ok + q.okd, zb = zu - q.okh - q.okt, zf = zu - q.okh;
      G.ustOluk = { xa, xb, w, zb, zf, ic: rect(xa + q.okd, -q.ok, xb - q.okd, 0) };
      G.kutu.push({ k: 'oluk-taban', pts: rect(xa, -w, xb, 0), z0: zb, z1: zf }, { k: 'oluk-dis', pts: rect(xa, -w, xb, -q.ok), z0: zf, z1: zu },
        { k: 'oluk-uc', pts: rect(xa, -q.ok, xa + q.okd, 0), z0: zf, z1: zu }, { k: 'oluk-uc', pts: rect(xb - q.okd, -q.ok, xb, 0), z0: zf, z1: zu }); }
    // su tutucu bant: temel–perde birleşiminde perde eksenleri boyunca
    //   gözler ve dağıtma kanalı taban plağı üstünden 0,10 m yukarıda; derin çıkış kanalının duvarları kendi taban plağı üstünden 0,10 m yukarıda
    { const m = q.tw / 2, zb = zr1 + 0.10, B = [{ anahtar: 'dis', pts: [[xg1, m], [m, m], [m, en - m], [xg1, en - m]], closed: false, z: zb }];
      B.push({ anahtar: 'dagitma', pts: [[xD1 + m, m], [xD1 + m, en - m]], closed: false, z: zb }, { anahtar: 'cikis', pts: rect(xg1 + m, m, boy - m, en - m), closed: true, z: zcs + 0.10 });
      for (let i = 0; i + 1 < N; i++) B.push({ anahtar: 'ara-' + i, pts: [[xD1 + m, G.goz[i].y1 + q.ti / 2], [xg1 + m, G.goz[i].y1 + q.ti / 2]], closed: false, z: zb });
      G.bantlar = B; }
    // havalandırma (Çokal E-E, F-F, alt plan): oluk tarafında yerden yükselen besleme, dağıtma–göz duvarı üstünden başlıklara;
    // başlık yürüme yolu üstünde mesnet ayaklarında, göz başına L / dp düşüm (eşit aralık, uçlarda yarım aralık)
    { const nD = Math.max(1, Math.round(q.L / q.dp)), pD = q.L / nD, xsD = Array.from({ length: nD }, (_, k) => xg0 + (k + 0.5) * pD);
      const rH = SSOD[50] / 2000, zF = zu + 0.15 + rH, yR = -(G.ustOluk.w + q.sepY), zd = zt + ek + 0.01, xe = xsD[nD - 1] + 0.185;
      const nH = G.goz.length;
      G.goz.forEach((g, hI) => { const yw = g.alt ? g.y1 : g.y0, s = g.alt ? -1 : 1, yolVar = N > 1 && (g.alt ? g.i + 1 < N : g.i > 0);
        let yh, zh, a, h1, j, xw, zm, hM;
        if (yolVar) { yh = yw + s * q.hb; zm = zy; hM = q.hm; zh = zy + q.hm + rH; a = q.yy / 2 - q.ti / 2 + q.dE - q.hb; h1 = zh - (zy - q.dJ); j = Math.max(0, a + q.hb - 0.036); xw = -q.hb; }
        else { yh = yw - s * q.tw / 2; zm = zu; hM = 0.15; zh = zu + 0.15 + rH; a = q.tw / 2 + 0.036; h1 = 0; j = 0; xw = q.tw / 2; } // yürüme yolu yoksa başlık dış duvar üstünde
        for (let k = 0; k < nD; k++) G.dusum.push({ i: g.i, k, p: [xsD[k], yh], s, zh, zd, H: zh - zd, a, h1, j, xw });
        const xf = xg0 - q.tw / 2 - (hI - (nH - 1) / 2) * 0.10, pts = [[xf, yR, q.zg], [xf, yR, zF], [xf, yh, zF]];
        if (Math.abs(zh - zF) > 1e-6) pts.push([xf, yh, zh]); pts.push([xe, yh, zh]);
        G.hat.push({ k: 'hava-' + g.i, kod: 'CA', cins: 'paslanmaz', sinif: '10S', dn: 50, kalite: 'SS304L', r: rH, renk: 'hava', pts });
        // başlık mesnetleri: başta, her düşümün 0,30 m ötesinde ve iki düşüm arasının ortasında (yürüme yolunda / duvar üstünde)
        const xm = [xg0 + 0.30]; for (const x of xsD) { xm.push(x + 0.30); if (x + pD / 2 < xe - 0.10) xm.push(x + pD / 2); }
        xm.forEach((x, k) => G.mesnet.push({ anahtar: `mes-${g.i}-${k}`, tip: 'AYAK', p: [x, yh], aci: 0, z: zm, H: hM, D: 2 * rH }));
        // besleme hattı mesnetleri: dağıtma–göz duvarının üstünde (0,15 m ayak), en çok 1,50 m arayla
        const ya = q.tw / 2, yz = yh - s * 0.30, n = Math.max(1, Math.ceil(Math.abs(yz - ya) / 1.5));
        for (let k = 0; k <= n; k++) G.mesnet.push({ anahtar: `mesb-${g.i}-${k}`, tip: 'AYAK', p: [xf, ya + (yz - ya) * k / n], aci: -90, z: zu, H: 0.15, D: 2 * rH }); });
      G.hava = { nD, pD, xsD, zd, yR }; }
    // kum seperatörü (Çokal plan): oluğun dışında, ekseni yapıya paralel; hazne dağıtma tarafında, vida çıkışa doğru; oluk tabanından iniş borusu hazneye
    { const x0 = xg0 + q.sepX, ys = -(G.ustOluk.w + q.sepY), zk = q.zg + 0.10, zhz = zk + 1.80, xo = x0 + 0.35, zin = zhz + 0.13, sb = ssBoru(0.15);
      G.sep = { p: [x0 + q.sepL / 2, ys], zk, L: q.sepL, x0 };
      G.hat.push({ k: 'kum-inis', kod: 'DR', cins: 'paslanmaz', sinif: '10S', dn: sb.dn, kalite: 'SS304', r: sb.od / 2, renk: 'boru', pts: [[xo, -q.ok / 2, G.ustOluk.zf], [xo, -q.ok / 2, zin], [xo, ys + 0.30, zin], [xo, ys + 0.30, zhz]] }); }
    G.V = N * q.L * (q.b + q.bF) * q.h; // yaklaşık su hacmi
    G.giris = { p: G.boru.find(b => b.k === 'giris').p, z: G.boru.find(b => b.k === 'giris').z }; G.cikis = { p: G.boru.find(b => b.k === 'cikis').p, z: G.boru.find(b => b.k === 'cikis').z };
    return G;
  }

  /* ekipman yerleri (yerel): giriş kapakları, gezer köprü ve rayları, kum seperatörü ve konteyneri, yağ konteynerleri, difüzör düşümleri,
     borular (hava başlıkları, kum iniş, yağ, giriş / çıkış ağızları), boru mesnetleri, duvar geçiş parçaları, merdiven ve korkuluklar */
  function ekipmanYer(G) {
    const q = G.q, out = [];
    for (const k of G.kapak) out.push({ anahtar: 'pen-' + k.i, tur: 'penstok', etiket: String(k.i + 1), p: [k.x - 0.07, k.y], /* duvarın dağıtma kanalı yüzüne monte (duvarın içinde değil) */ aci: 0, z: k.z0, B: k.B, H: k.H, D: G.zu - k.z0, hw: G.zs - k.z0 });
    out.push({ anahtar: 'kopru', tur: 'kopru', p: [G.xg0 + q.L * 0.6, G.en / 2], aci: 0, /* aile x ekseni (açıklık) havuz enine */  z: G.zu, Ls: G.en - q.tw, N: G.N, ap: G.N > 1 ? Math.abs(G.goz[1].yo - G.goz[0].yo) : 1.9, Hp: G.zu - G.zo, hk: Math.max(0.35, G.zy + 1.10 + 0.10 - G.zu - 0.16), xo: q.tw / 2 + q.ok / 2, zo: q.okh - 0.15, yo: G.goz.map(g => g.yo) }); // hk: köprü kirişleri orta yürüme yolu korkuluğunun 10 cm üstünde
    G.ray.forEach((r, k) => out.push({ anahtar: 'ray-' + k, tur: 'ray', etiket: String(k + 1), p: [r.x0, r.y], aci: 0, /* aile y = ray boyu = yerel +x */ z: G.zu, L: r.x1 - r.x0 }));
    // kum seperatörü: aile x (vida ekseni, boşaltma +x) yerel +x'e (çıkış kanalına doğru) döner → −90°; hazne dağıtma tarafında
    out.push({ anahtar: 'seperator', tur: 'seperator', p: G.sep.p, aci: -90, z: G.sep.zk, L: G.sep.L });
    out.push({ anahtar: 'kont-kum', tur: 'konteyner', etiket: 'KUM', p: [G.sep.x0 + G.sep.L + 0.31, G.sep.p[1]], aci: 0, z: q.zg });
    for (const d of G.dusum) out.push({ anahtar: `dusum-${d.i}-${d.k}`, tur: 'dusum', etiket: `${d.i + 1}.${d.k + 1}`, p: d.p, aci: d.s > 0 ? 0 : 180, /* aile x = göze doğru */ z: d.zh, H: d.H, a: d.a, h1: d.h1, j: d.j, xw: d.xw });
    for (const h of G.hat) out.push({ anahtar: 'boru-' + h.k, tur: 'boru', pts: h.pts, cins: h.cins, sinif: h.sinif, dn: h.dn, kalite: h.kalite, etiket: `${h.kod} DN${h.dn} ${h.kalite}` });
    for (const m of G.mesnet) out.push(Object.assign({ tur: 'mesnet' }, m));
    // duvardan geçen borular: DGP (duvar ortasında, eksen duvara dik) + boru parçası; yağ borusu dirsekle konteynere iner, duvarda konsol mesnet
    for (const b of G.boru) {
      const sg = b.yon[1], etk = `${b.kod} ${b.cins === 'pe' ? 'Ø' : 'DN'}${b.dn} ${b.kalite}${b.ek || ''}`;
      out.push({ anahtar: 'dgp-' + b.k, tur: 'dgp', p: [b.p[0], b.yw], aci: 0, /* aile x = boru ekseni = yerel y */ z: b.z, D: b.od, Lw: q.tw, DN: b.dn });
      if (b.k.startsWith('yag')) {
        const i = +b.k.slice(4), dOut = (sg < 0 ? G.ustOluk.w : 0) + 0.40, yOut = b.p[1] + sg * dOut, zK = q.zg + 1.37 + 0.05, yIn = b.p[1] - sg * (q.tw + 0.10);
        out.push({ anahtar: 'boru-' + b.k, tur: 'boru', pts: [[b.p[0], yIn, b.z], [b.p[0], yOut, b.z], [b.p[0], yOut, zK]], cins: b.cins, sinif: b.sinif, dn: b.dn, kalite: b.kalite, etiket: etk });
        out.push({ anahtar: 'mesk-' + b.k, tur: 'mesnet', tip: 'KONSOL', p: [b.p[0], b.p[1]], aci: sg > 0 ? 0 : 180, z: b.z0 - 0.27, H: 0.27, Lk: dOut + 0.12, D: b.od });
        out.push({ anahtar: 'kont-' + b.k, tur: 'konteyner', etiket: 'YAĞ ' + (i + 1), p: [b.p[0], b.p[1] + sg * Math.max(dOut, 0.59)], aci: 90, z: q.zg });
      } else out.push({ anahtar: 'boru-' + b.k, tur: 'boru', pts: [[b.p[0], b.p[1] - b.yon[1] * (q.tw + 0.10), b.z], [b.p[0], b.p[1] + b.yon[1] * 0.60, b.z]], cins: b.cins, sinif: b.sinif, dn: b.dn, kalite: b.kalite, etiket: etk });
    }
    for (const y of G.yol) for (const s of [-1, 1]) out.push({ anahtar: `korkuluk-${y.i}-${s > 0 ? 'ust' : 'alt'}`, tur: 'korkuluk', pts: [[G.xg0 + 0.05, y.ym + s * (q.yy / 2 - 0.05)], [G.xg1 + 0.05, y.ym + s * (q.yy / 2 - 0.05)]], z: G.zy });
    // merdiven (anaerobik havuzdaki gibi): üst yan duvara paralel, plaklı betonarme; üst sahanlığı merdivenin parçası ve çıkış kanalı sahanlığına
    // boydan boya bitişik. Sahanlık korkuluğu merdiven üst sahanlığının dış kenarını ve ucunu da dolaşır (merdiven korkuluğuyla birleşir);
    // orta yürüme yolu ağzı açık kalır.
    const Hm = G.zy - q.zg, S = G.sahanlik, e5 = 0.05, mer = Hm > 0.15;
    if (mer) { const nr = Math.max(2, Math.ceil(Hm / q.mh - 1e-9)), Lm = (nr - 1) * q.mb, ym = G.en + q.mw / 2;
      out.push({ anahtar: 'merdiven', tur: 'merdiven', pts: [[G.xg1 - Lm, ym], [G.xg1, ym]], z0: q.zg, z1: G.zy, w: q.mw, b: q.mb, hmax: q.mh, nr, usL: G.boy - G.xg1, t: q.yt, kork: 'sol' }); }
    const yU = G.yol.length ? G.yol[G.yol.length - 1].ym + q.yy / 2 - e5 : S.ys + e5; // göz tarafı kenarı: yürüme yolu ağzı açık
    if (G.en - e5 - yU > 0.3) out.push({ anahtar: 'korkuluk-sah-1', tur: 'korkuluk', pts: [[G.xg1 + e5, G.en - e5], [G.xg1 + e5, yU]], z: G.zy });
    out.push({ anahtar: 'korkuluk-sah-2', tur: 'korkuluk', pts: mer ? [[G.xg1 + e5, S.ys + e5], [G.boy - e5, S.ys + e5], [G.boy - e5, G.en + q.mw - e5], [G.xg1, G.en + q.mw - e5]] : [[G.xg1 + e5, S.ys + e5], [G.boy - e5, S.ys + e5], [G.boy - e5, G.en - e5]], z: G.zy });
    return out;
  }
  function su(G) {
    const q = G.q, out = [{ anahtar: 'su-dagitma', ad: 'Dağıtma kanalı', pts: rect(G.xD0, q.tw, G.xD1, G.en - q.tw), zb: G.zs - q.dT, maks: G.zs + 0.05, min: G.zs }];
    for (const g of G.goz) out.push({ anahtar: 'su-goz-' + g.i, ad: `Kum ve yağ tutucu ${g.i + 1}. göz`, pts: rect(G.xg0, g.y0, G.xg1, g.y1), zb: G.zt, maks: G.zs, min: G.zs - 0.05 });
    out.push({ anahtar: 'su-cikis', ad: 'Çıkış kanalı', pts: rect(G.xC0, q.tw, G.xC1, G.en - q.tw), zb: G.zcf, maks: G.zs - q.sv - 0.20, min: G.zs - q.sv - 0.40 });
    return out;
  }
  /* ekipman düzeninin sürümü: kayıtta (e.ekSurum) tutulur. Ekipmanı yerleşmiş eski bir çizim açılınca sürüm tutmadığı için ekipman bir kez
     kendiliğinden yeni düzene geçer (elle taşınanlar korunur). 2: Çokal T-103 düzeltmeleri (yağ kanalı, DGP, hava başlığı, mesnet, ray, seperatör yönü). */
  const EK_SURUM = 2;
  /* changeIdle kararı (saf): 'surum' = eski düzen, yenile; 'degisti' = parametre / konum değişti, yenile; 'ilk' = bu oturumda ilk görülüş, anahtarı kaydet; null = bir şey yapma */
  const ekKarar = (e, k) => { if (!e || e.type !== 'kumtutucu' || !e.ekipman) return null; if (e.ekSurum !== EK_SURUM) return 'surum'; if (e._ekK == null) return 'ilk'; return e._ekK !== k ? 'degisti' : null; };
  if (NODE) module.exports = { geo, DEF, ekipmanYer, su, ekKarar, EK_SURUM };
  if (!C || !C.T) return;

  /* ================= ÇİZİM ================= */
  const M = C.M, T = C.T, { L, P, TX } = C.prim, { ext } = C.meshDef;
  const tH = mm => C.annoH(mm == null ? C.doc.set.textH : mm);
  const f2 = v => M.fmt(v, 2).replace('.', ',');
  const kot = z => (C.fmtKot ? C.fmtKot(z) : f2(z));
  const unum = e => (String(e.code || '').match(/\d+/) || ['1xx'])[0];
  const W3 = f => p => f.at(p[0], p[1], p[2]);
  const triAg = (f, K) => { const uy = M.cross([0, 0, 1], f.ux), Wn = n => [f.ux[0] * n[0] + uy[0] * n[1], f.ux[1] * n[0] + uy[1] * n[1], n[2]]; return { t: 'tri', v: K.v.map(W3(f)), vn: K.vn.map(Wn), f: K.f, edges3: K.e.map(ab => ab.map(W3(f))) }; };

  T.kumtutucu = {
    label: 'Kum ve yağ tutucu', ifc: 'IfcTank',
    prims: e => {
      const G = geo(e), q = G.q, f = C.frame(e.o, e.rot), z = G.zu, out = [], h = tH(), ek = !!e.ekipman; // ekipman yerleştiyse raylar, borular ve kapaklar kendi nesneleriyle çizilir
      const rd = (() => { let r = ((e.rot || 0) % 360 + 360) % 360; if (r > 90 && r <= 270) r -= 180; return r * Math.PI / 180; })();
      const PL = (pts, c, o) => P(pts.map(p => f.at(p[0], p[1], z)), c, o), T1 = (x, y, s, o, al) => TX(f.at(x, y, z), (o && o.h) || h, s, rd, al || 'M', o);
      for (const r of [G.bolge.dis, ...G.bolge.delik]) out.push(PL(r, true, { lw: 50 }));
      for (const g of G.goz) {
        out.push(PL(rect(G.xg0, g.ayir[0], G.xg1, g.ayir[1]), true, { lw: 25 })); // ayırma kirişi
        const o2 = q.bo / 2 + q.ko; out.push(PL(rect(G.xg0, g.yo - o2, G.xg1, g.yo + o2), true, { lt: 'DASHED', color: 8, lw: 18 })); // kum oluğu (tabanda)
        out.push(T1((G.xg0 + G.xg1) / 2, (g.kum[0] + g.kum[1]) / 2, 'KUM KANALI', { color: 4 }), T1(G.xg0 + q.L * 0.25, (g.yag[0] + g.yag[1]) / 2, 'YAĞ KANALI', { color: 4, h: h * 0.8 }));
      }
      for (const y of G.yol) out.push(PL(y.pts, true, { lw: 25, color: 8 }));
      out.push(PL(G.sahanlik.pts, true, { lw: 25, color: 8 }));
      if (!ek) for (const r of G.ray) out.push(L(f.at(r.x0, r.y, z), f.at(r.x1, r.y, z), { lt: 'CENTER', color: 1, lw: 18 }));
      if (!ek) for (const b of G.boru) out.push(L(f.at(b.p[0], b.p[1], z), f.at(b.p[0] + b.yon[0] * 0.8, b.p[1] + b.yon[1] * 0.8, z), { color: 5, lw: 35 }), T1(b.p[0] + b.yon[0] * 1.0 + 0.25, b.p[1] + b.yon[1] * 1.0, `Ø${Math.round(b.d * 1000)}`, { color: 5, h: h * 0.8 }));
      for (const r of G.rampa) out.push(PL(rect(r.a[0], r.y0, r.b[0], r.y1), true, { lw: 18, color: 8 }), L(f.at(r.a[0], r.y0, z), f.at(r.b[0], r.y1, z), { lw: 13, color: 8 }));
      for (const k of G.yagKanal) out.push(PL(rect(k.x0, k.y0, k.x1, k.y1), true, { lw: 35 }), PL(rect(k.xu, k.y0, k.x0, k.y1), true, { lw: 25 })); // yağ toplama kanalı ve uç duvarı
      for (const k of G.kolon) out.push(PL(k.pts, true, { lw: 50 }));
      for (const l of G.lamel) out.push(L(f.at(l.x0, l.y0, z), f.at(l.x1, l.y0, z), { lw: 35, color: 4 }));
      if (!ek) for (const hh of G.hat) out.push(P(hh.pts.map(p => f.at(p[0], p[1], z)), false, { lw: 35, color: hh.renk === 'hava' ? 5 : 6 }));
      { const u = G.ustOluk; out.push(PL(rect(u.xa, -u.w, u.xb, 0), true, { lw: 35 }), PL(u.ic, true, { lw: 18 }), T1((u.xa + u.xb) / 2, -q.ok / 2, 'KUM OLUĞU', { color: 4, h: h * 0.8 })); }
      if (!ek) for (const k of G.kapak) out.push(L(f.at(k.x, k.y - k.B / 2 - 0.05, z), f.at(k.x, k.y + k.B / 2 + 0.05, z), { color: 6, lw: 70 }));
      out.push(TX(f.at((G.xD0 + G.xD1) / 2, G.en / 2, z), h, 'DAĞITMA KANALI', rd + Math.PI / 2, 'M', { color: 4 }), TX(f.at((G.xC0 + G.xC1) / 2, G.en / 2, z), h, 'ÇIKIŞ KANALI', rd + Math.PI / 2, 'M', { color: 4 }));
      out.push(T1(G.boy / 2, G.en + 1.2, `${G.N} göz × (kum ${f2(q.b)} + yağ ${f2(q.bF)}) × ${f2(q.L)} m · su ${kot(G.zs)} · duvar üstü ${kot(G.zu)} · kum oluğu dibi ${kot(G.zo)} · V = ${M.fmt(G.V, 0)} m³`, { color: 3 }));
      out.push(TX(f.at(G.boy / 2, G.en + 1.2 + h * 5, z), tH(5), `${e.code || ''} ${e.name || 'Kum ve yağ tutucu'}`.trim(), rd, 'C', { color: 2 }));
      return out;
    },
    mesh: e => {
      const G = geo(e), f = C.frame(e.o, e.rot), out = [], uy = M.cross([0, 0, 1], f.ux);
      const Wv = d => [f.ux[0] * d[0] + uy[0] * d[1], f.ux[1] * d[0] + uy[1] * d[1], d[2]]; // yerel yön → dünya
      const delikB = k => (k.poly ? { pts: k.poly.map(p => f.at(p[0], p[1], p[2])), d: Wv(k.d) } : { pts: k.pts.map(p => f.at(p[0], p[1], k.z0)), d: [0, 0, k.z1 - k.z0] });
      const key = JSON.stringify([G.q, e.o, e.rot]);
      if (!e._ag || e._agK !== key) {
        const ag = triAg(f, bolgeKati(G.bolge, G.zr1, G.zu)); // duvarlar taban plağının üstünden
        let son = ag; if (C.boslukAg) { try { son = C.boslukAg([ag], G.kes.map(delikB), [0.74, 0.74, 0.71]); } catch (er) { console.error('kum tutucu boşluk', er); } }
        e._ag = son; e._agK = key;
      }
      out.push(e._ag);
      out.push(ext(f.at(0, 0, G.taban.z0), f.ux, [0, 0, 1], G.taban.pts, G.taban.z1 - G.taban.z0));
      for (const k of G.kutu.concat(G.kolon)) if (!k.gro || !(C._ins && C._ins.newMesh)) out.push(ext(f.at(0, 0, k.z0), f.ux, [0, 0, 1], k.pts, k.z1 - k.z0));
      if (C._ins && C._ins.newMesh) { // kendi renkleriyle: grobeton dolgular (betondan ayrı malzeme), paslanmaz yağ lamelleri ve sıyırma rampası
        const cm = C._ins.newMesh(), Wp = p => f.at(p[0], p[1], p[2]), R = { pas: [0.78, 0.80, 0.82], gro: [0.80, 0.75, 0.64], celik: [0.45, 0.48, 0.52], hava: [0.20, 0.45, 0.85], boru: [0.80, 0.81, 0.83] };
        const kutu = (x0, x1, y0, y1, z0, z1, col) => { const c8 = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map(Wp); C._ins.hexa(cm, c8, col); for (let k = 0; k < 4; k++) cm.edges3.push([c8[k], c8[(k + 1) % 4]], [c8[k + 4], c8[(k + 1) % 4 + 4]], [c8[k], c8[k + 4]]); };
        /* profil (y, z) yerel x boyunca x0 → x1 uzatılır; kapaklar earcut ile, yüzler dışa döndürülür */
        const prizma = (prof, x0, x1, col) => {
          let A = 0; for (let i = 0; i < prof.length; i++) { const a = prof[i], b = prof[(i + 1) % prof.length]; A += a[0] * b[1] - b[0] * a[1]; } const P2 = A > 0 ? prof : prof.slice().reverse(); // (y, z) düzleminde CCW
          const yuz = (a, b, c, n) => { const v0 = cm.v.length, nn = M.cross(M.sub(b, a), M.sub(c, a)); cm.v.push(a, b, c); cm.f.push(M.dot(nn, n) >= 0 ? [v0, v0 + 1, v0 + 2] : [v0, v0 + 2, v0 + 1]); cm.fc.push(col); };
          const E = C.earcutHalkalar ? C.earcutHalkalar([P2]) : null, tris = E ? E.tris.map(t => t.map(i => E.pts[i])) : P2.slice(1, -1).map((p, i) => [P2[0], p, P2[i + 2]]);
          for (const [x, sx] of [[x0, -1], [x1, 1]]) { const n = Wv([sx, 0, 0]); for (const t of tris) yuz(Wp([x, t[0][0], t[0][1]]), Wp([x, t[1][0], t[1][1]]), Wp([x, t[2][0], t[2][1]]), n); for (let i = 0; i < P2.length; i++) { const a = P2[i], b = P2[(i + 1) % P2.length]; cm.edges3.push([Wp([x, a[0], a[1]]), Wp([x, b[0], b[1]])]); } }
          for (let i = 0; i < P2.length; i++) { const a = P2[i], b = P2[(i + 1) % P2.length], n = Wv([0, b[1] - a[1], -(b[0] - a[0])]); // CCW çokgende dış normal (dz, −dy)
            const A1 = Wp([x0, a[0], a[1]]), B1 = Wp([x0, b[0], b[1]]), A2 = Wp([x1, a[0], a[1]]), B2 = Wp([x1, b[0], b[1]]); yuz(A1, B1, B2, n); yuz(A1, B2, A2, n); cm.edges3.push([A1, A2]); } };
        for (const g of G.goz) prizma(g.prof, G.xg0, G.xg1, R.gro); // göz tabanı grobeton dolgusu (kum oluğu ve 45° eğimler)
        for (const k of G.kutu) if (k.gro) { const [a, , c] = k.pts; kutu(a[0], c[0], a[1], c[1], k.z0, k.z1, R.gro); } // dağıtma ve çıkış kanalı dolguları
        for (const l of G.lamel) kutu(l.x0, l.x1, l.y0, l.y1, l.z0, l.z1, R.pas);
        for (const r of G.rampa) { const t = 0.005, c8 = [[r.a[0], r.y0, r.a[1]], [r.b[0], r.y0, r.b[1]], [r.b[0], r.y1, r.b[1]], [r.a[0], r.y1, r.a[1]], [r.a[0], r.y0, r.a[1] + t], [r.b[0], r.y0, r.b[1] + t], [r.b[0], r.y1, r.b[1] + t], [r.a[0], r.y1, r.a[1] + t]].map(Wp); C._ins.hexa(cm, c8, R.pas); for (let k = 0; k < 4; k++) cm.edges3.push([c8[k + 4], c8[(k + 1) % 4 + 4]]); } // eğik paslanmaz sac
        if (!e.ekipman) { // ekipman yerleştirilmediyse (EKIPMAN=H) raylar, hava başlıkları ve kum iniş borusu gövdenin parçası olarak gösterilir
          const sil = (a, b, r, col, n) => { n = n || 14; const A = Wp(a), B = Wp(b), ax = M.sub(B, A); if (M.len(ax) < 1e-9) return; const u = M.norm(ax), p = M.perp(u), w = M.cross(u, p), v0 = cm.v.length;
            for (const o of [A, B]) for (let i = 0; i < n; i++) { const t = 2 * Math.PI * i / n; cm.v.push(M.add(o, M.add(M.mul(p, r * Math.cos(t)), M.mul(w, r * Math.sin(t))))); }
            for (let i = 0; i < n; i++) { const j = (i + 1) % n; cm.f.push([v0 + i, v0 + j, v0 + n + j], [v0 + i, v0 + n + j, v0 + n + i]); cm.fc.push(col, col); } };
          for (const r of G.ray) { kutu(r.x0, r.x1, r.y - 0.075, r.y + 0.075, G.zu, G.zu + 0.01, R.celik); kutu(r.x0, r.x1, r.y - 0.03, r.y + 0.03, G.zu + 0.01, G.zu + 0.08, R.celik); }
          for (const hh of G.hat) for (let i = 1; i < hh.pts.length; i++) sil(hh.pts[i - 1], hh.pts[i], hh.r, R[hh.renk] || R.boru); }
        out.push(cm);
      } else for (const g of G.goz) out.push(ext(f.at(G.xg0, 0, 0), uy, f.ux, g.prof, G.q.L));
      for (const y of G.yol.concat([G.sahanlik])) out.push(ext(f.at(0, 0, y.z0), f.ux, [0, 0, 1], y.pts, y.z1 - y.z0));
      { const A = triAg(f, bolgeKati({ dis: G.cikisAlt.dis, delik: G.cikisAlt.delik }, G.cikisAlt.z0, G.cikisAlt.z1)); let son = A; // çıkış kanalının derin kısmı (çıkış borusu deliğiyle)
        if (C.boslukAg) { try { son = C.boslukAg([A], G.kesAlt.map(delikB), [0.74, 0.74, 0.71]); } catch (er) { console.error('kum tutucu çıkış', er); } } out.push(son); }
      out.push(ext(f.at(0, 0, G.tabanC.z0), f.ux, [0, 0, 1], G.tabanC.pts, G.tabanC.z1 - G.tabanC.z0));
      return out;
    },
    /* kodlu malzeme açılımları (Çokal T-103 paftası: DUVARLAR DU01 dış duvar, DU02 iç duvar; DÖŞEMELER DÖ01 yürüme döşemesi, DÖ02 göz tabanı, DÖ03 kanal tabanı) */
    acilimlar: e => { const G = geo(e), q = G.q, t = q.tw, B = 'C30/37 hazır beton';
      return [
        { tur: 'duvar', lines: [B, 'Katran badana (3 kat)', 'Dolgular, kazıdan elde edilen uygun nitelikli malzeme ile yapılacaktır'], kutular: [[0, 0, G.boy, t], [0, G.en - t, G.boy, G.en], [0, 0, t, G.en], [G.boy - t, 0, G.boy, G.en]], z0: G.zr1, z1: G.zu },
        { tur: 'duvar', lines: [B], kutular: [[G.xD1, t, G.xg0, G.en - t], [G.xg1, t, G.xC0, G.en - t], ...G.goz.slice(0, -1).map(g => [G.xg0, g.y1, G.xg1, g.y1 + q.ti])], z0: G.zr1, z1: G.zmw },
        { tur: 'doseme', lines: [B], kutular: G.yol.map(y => [y.pts[0][0], y.pts[0][1], y.pts[2][0], y.pts[2][1]]).concat([[G.xg1, G.sahanlik.ys, G.boy, G.en]]), z0: G.zmw, z1: G.zy },
        { tur: 'doseme', lines: ['C16/20 grobeton', B, 'C16/20 grobeton (10 cm)'], kutular: G.goz.map(g => [G.xg0, g.kum[0], G.xg1, g.kum[1]]), z0: G.zr0, z1: G.zo },
        { tur: 'doseme', lines: [B, 'C16/20 grobeton (10 cm)', "30 cm ince tane oranı %5'ten az, 0-30 mm çap aralığında sıkıştırılmış malzeme"], kutular: [[G.xD0, t, G.xD1, G.en - t], [G.xC0, t, G.xC1, G.en - t]], z0: G.zr0, z1: G.zr1 },
      ]; },
    snaps: e => { const G = geo(e), f = C.frame(e.o, e.rot); return G.bolge.dis.map(p => ({ p: f.at(p[0], p[1], G.zu), k: 'end' })); },
    xf: (e, X) => { const o2 = X.p(e.o); const v = X.v([Math.cos((e.rot || 0) * Math.PI / 180), Math.sin((e.rot || 0) * Math.PI / 180), 0]); e.rot = Math.atan2(v[1], v[0]) * 180 / Math.PI; e.o = [o2[0], o2[1], 0]; },
    info: e => { const G = geo(e); return `${e.code || ''} kum ve yağ tutucu: ${G.N} göz × ${f2(G.gz)} m, boy ${f2(G.q.L)} m, dış ölçü ${f2(G.boy)} × ${f2(G.en)} m, su ${kot(G.zs)}, duvar üstü ${kot(G.zu)}`; },
  };

  /* ================= EKİPMAN ================= */
  const mm = v => Math.round(v * 1000);
  const imza = x => JSON.stringify(x.type === 'aile' ? [x.p, x.rot, x.z, x.par] : [x.pts, x.z0, x.z1]);
  function nesne(e, y) {
    const f = C.frame(e.o, e.rot), un = unum(e), W2 = p => { const w = f.at(p[0], p[1], 0); return [w[0], w[1]]; };
    const aile = (fam, par, ad) => { const d = C.AILELER && C.AILELER[fam]; if (!d) return null; const t0 = d.tipler && d.tipler[0]; if (d.katman && C.ensureLayer) C.ensureLayer(d.katman, d.renk || 4, 'CONTINUOUS', 25); return { type: 'aile', props: { fam, tip: t0 ? t0.ad : null, tipU: t0 ? t0.ad : null, par: Object.assign({}, t0 ? t0.p : {}, par), p: [...W2(y.p), 0], rot: (e.rot || 0) + y.aci, z: y.z, ad, layer: d.katman || C.doc.cur.layer } }; };
    if (y.tur === 'penstok') return aile('penstock_kanal', { B: mm(y.B), H: mm(y.H), D: mm(y.D), hw: mm(y.hw), tahrik: 'EL', konum: 'K' }, `SK-${un}/${y.etiket}`);
    if (y.tur === 'kopru') return aile('gezer_kopru', { Ls: mm(y.Ls), N: y.N, ap: mm(y.ap), Hp: mm(y.Hp), hk: mm(y.hk), xo: mm(y.xo), zo: mm(y.zo) }, `GEZER KÖPRÜ T${un}.01`);
    if (y.tur === 'dusum') return aile('difuzor_dusumu', { H: mm(y.H), a: mm(y.a), h1: mm(y.h1), j: mm(y.j), xw: mm(y.xw) }, `DİFÜZÖR DÜŞÜMÜ T${un}.05 ${y.etiket}`);
    if (y.tur === 'ray') return aile('kopru_rayi', { L: mm(y.L) }, `GEZER KÖPRÜ RAYI T${un}.01 ${y.etiket}`);
    if (y.tur === 'mesnet' || y.tur === 'dgp') { const o = y.tur === 'mesnet' ? aile('boru_mesnet', { tip: y.tip, H: mm(y.H), Lk: mm(y.Lk || 0.52), D: mm(y.D) }, `BORU MESNEDİ T${un}.06`) : aile('duvar_gecis', { D: mm(y.D), Lw: mm(y.Lw), DN: y.DN }, `DUVAR GEÇİŞ PARÇASI DN${y.DN}`);
      if (o) o.props.etk = false; return o; } // planda etiket yazılmaz (çok sayıda; listede ve özelliklerde adıyla görünür)
    if (y.tur === 'boru') { // hava başlığı, kum iniş, yağ, giriş / çıkış ağızları: gerçek boru nesnesi (katalog dış çapı ve et kalınlığıyla)
      const b = C.boruOlcu ? C.boruOlcu(y.cins, y.sinif, y.dn) : { cins: y.cins, sinif: y.sinif, dn: y.dn, od: y.dn, t: 3, c: { mat: y.cins } }, lay = 'MEK_BORU_' + C.up(y.cins);
      if (C.ensureLayer) C.ensureLayer(lay, y.cins === 'pe' ? 4 : 9, 'CONTINUOUS', 25);
      return { type: 'pipe', props: { pts: y.pts.map(p => [...W2(p), p[2]]), dn: b.dn, od: b.od, t: b.t, cins: b.cins, sinif: b.sinif, mat: b.c.mat, kalite: y.kalite, label: y.etiket, layer: lay } }; }
    if (y.tur === 'merdiven') return { type: 'merdiven', props: { pts: y.pts.map(W2), z0: y.z0, z1: y.z1, w: y.w, hmax: y.hmax * 100, b: y.b * 100, tip: 'beton', kork: y.kork || 'sol', km: 'galvaniz', kh: 110, dik: 150, tk: 'E', hiza: 'O', uz: 30, us: 'E', usL: Math.round(y.usL * 100), usW: Math.round(y.w * 100), usKork: 'H', as: 'H', sah: 0, nos: 0, t: Math.round(y.t * 100), rk: 'H' } }; // anaerobik havuzdaki gibi: plaklı betonarme, üst sahanlık merdivenin parçası
    if (y.tur === 'seperator') return aile('kum_seperatoru', { L: mm(y.L) }, `KUM SEPERATÖRÜ T${un}.03`);
    if (y.tur === 'konteyner') return aile('cop_konteyner', {}, `${y.etiket.startsWith('YAĞ') ? 'YAĞ' : 'KUM'} KONTEYNERİ T${un}.04 ${y.etiket}`);
    if (y.tur === 'korkuluk') return { type: 'korkuluk', props: { pts: y.pts.map(p => [...W2(p), y.z]), km: 'galvaniz', kh: 110, dik: 150, tk: 'E', kapali: false } };
    return null;
  }
  C.kumtutucuEkipman = (e, sessiz) => {
    if (!e.code && C.uniteNumarala) C.uniteNumarala(true);
    const G = geo(e), yer = ekipmanYer(G), once = new Set(e.ekAnahtar || []), yeniK = new Set(yer.map(y => y.anahtar));
    const mevcut = new Map(C.doc.ents.filter(x => x.bag === e.id && x.anahtar).map(x => [x.anahtar, x]));
    let n = 0, g = 0, el = 0;
    for (const y of yer) {
      const x = mevcut.get(y.anahtar), o = nesne(e, y); if (!o) continue;
      if (!x) { if (once.has(y.anahtar)) continue; const z = C.add(C.newEnt(o.type, Object.assign({}, o.props, { bag: e.id, anahtar: y.anahtar }))); delete z.sp; z.oto = imza(z); n++; continue; }
      if (x.oto !== imza(x)) { el++; continue; }
      const eski = x.oto; Object.assign(x, o.props); delete x._c; delete x._g; delete x._q; x.oto = imza(x); if (x.oto !== eski) { g++; if (C.touch) C.touch(x); }
    }
    const sil = [...mevcut.values()].filter(x => x.type !== 'su' && !yeniK.has(x.anahtar) && x.oto === imza(x)); if (sil.length && C.remove) C.remove(sil);
    if (C.suYapiBant) C.suYapiBant(e, G.bantlar);
    const f = C.frame(e.o, e.rot), W2 = p => { const w = f.at(p[0], p[1], 0); return [w[0], w[1]]; }, suM = new Map(C.doc.ents.filter(x => x.type === 'su' && x.bag === e.id).map(x => [x.anahtar, x]));
    if (C.ensureLayer) C.ensureLayer('INS_SU', 150, 'CONTINUOUS', 13);
    for (const s of su(G)) { const props = { pts: s.pts.map(W2), zb: s.zb, zs: s.maks, zsMaks: s.maks, zsMin: s.min, tur: 'atiksu', ad: s.ad, layer: 'INS_SU' }; const x = suM.get(s.anahtar); if (x) { Object.assign(x, props); delete x._c; } else { const z = C.add(C.newEnt('su', Object.assign(props, { bag: e.id, anahtar: s.anahtar }))); delete z.sp; } }
    e.ekipman = true; e.ekSurum = EK_SURUM; e.ekAnahtar = [...yeniK]; e._ekK = JSON.stringify([G.q, e.o, e.rot, e.code]); delete e._c;
    if (n || g) C.changed && C.changed();
    if (!sessiz) C.log(`✓ ${e.code || ''} kum ve yağ tutucu ekipmanı: ${n} yeni, ${g} güncellendi${el ? `, ${el} elle taşınmış (korundu)` : ''}.`);
  };
  C.on && C.on('changeIdle', () => { if (!C.doc) return; for (const e of C.doc.ents) if (e.type === 'kumtutucu' && e.ekipman) { const k = JSON.stringify([geo(e).q, e.o, e.rot, e.code]), d = ekKarar(e, k);
    if (d === 'ilk') e._ekK = k; else if (d === 'surum') { C.kumtutucuEkipman(e, true); C.log(`✓ ${e.code || ''} kum ve yağ tutucu ekipmanı yeni düzene geçirildi (yağ kanalı borusu, hava başlığı, mesnetler, duvar geçiş parçaları, raylar; elle taşınanlar korundu).`); } else if (d === 'degisti') C.kumtutucuEkipman(e, true); } });

  /* ================= KOMUT ================= */
  /* ünite kartından (K.kumKart): göz sayısı, bölmeler, boy, su derinliği, kotlar ve standart kalınlıklar */
  const karttan = () => {
    try {
      const Z = C.kart && C.kart.hesapla && C.kart.hesapla(), x = Z && Z.su.find(y => y.id === 'gr'), k = x && x.kart; if (!k || !k.params) return null;
      const v = id => (k.params.find(p => p.k === id) || {}).v, o = {};
      for (const [a, b] of [['N', 'N'], ['b', 'b'], ['bF', 'bF'], ['ta', 'ta'], ['h', 'h'], ['L', 'L'], ['tw', 'tw'], ['ti', 'ti'], ['bD', 'bD'], ['bC', 'bC'], ['ho', 'ho'], ['tb', 'td'], ['tr', 'tr'], ['zu', 'zu'], ['zz', 'zg']]) { const d = v(a); if (d != null && isFinite(+d) && (+d > 0 || a === 'zz')) o[b] = +d; }
      if (v('zs')) o.zs = +v('zs'); else { delete o.zu; delete o.zg; } // su kotu girilmemişse kotlar varsayılanda kalır
      return o.b && o.L && o.h ? o : null;
    } catch (err) { return null; }
  };
  const takeKV = () => { const kv = {}; C.cmd.queue = C.cmd.queue.filter(t => { const m = t.match(/^([A-Za-zÇĞİÖŞÜçğıöşü_0-9]+)=(.*)$/); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; }); return kv; };
  C.addCommand(['KUMTUTUCU', 'KUMYAGTUTUCU'], 'Kum ve yağ tutucu (havalandırmalı, gezer köprülü — Çokal T-103 düzeni): gözler, dağıtma ve çıkış kanalı, kum oluğu, gezer köprü, kum seperatörü. KUMTUTUCU [N=2 B=1.0 BF=0.4 L=11.4 H=1.26 SU=97.45 UST=99.15 ZEMIN=95.5]; değerler ünite kartından da alınır', async (I) => {
    const kv = takeKV(), kt = karttan();
    const e = C.newEnt('kumtutucu', Object.assign(JSON.parse(JSON.stringify(DEF)), kt || {}, { layer: C.std('BETON'), u: 'gr', name: 'Kum ve yağ tutucu', o: [0, 0, 0], rot: 0, sira: Date.now() }));
    for (const [k, p] of Object.entries({ N: 'N', B: 'b', BF: 'bF', L: 'L', H: 'h', SU: 'zs', UST: 'zu', ZEMIN: 'zg' })) if (kv[k] != null && isFinite(C.num(kv[k]))) e[p] = C.num(kv[k]);
    if (kt) C.log('Değerler ünite kartından alındı.');
    C.cmd.base = null; C.cmd.preview = c => T.kumtutucu.prims(Object.assign({}, e, { o: c, _c: null }));
    const p = await I.pt('Yapının sol alt köşesi (dağıtma kanalı tarafı)'); C.cmd.preview = null; if (!p || typeof p === 'string') return; e.o = [p[0], p[1], 0];
    C.cmd.base = p; C.cmd.preview = c => T.kumtutucu.prims(Object.assign({}, e, { rot: M.deg(M.ang(p, c)), _c: null }));
    const a = await I.angle('Dönüş açısı', p, 0); C.cmd.preview = null; e.rot = typeof a === 'number' ? a : 0;
    C.add(e); if (C.uniteNumarala) C.uniteNumarala(true); if (kv.EKIPMAN !== 'H') C.kumtutucuEkipman(e);
    C.log(`✓ ${T.kumtutucu.info(e)}`);
  });
  C.addCommand(['KUMEKIPMAN', 'KUMTUTUCUEKIPMAN'], 'Kum ve yağ tutucunun kapak, gezer köprü, kum seperatörü, konteyner ve korkuluklarını yerleştirir / günceller (elle taşınanlar korunur)', async () => {
    const e = (C.sel || []).find(x => x.type === 'kumtutucu') || C.doc.ents.find(x => x.type === 'kumtutucu'); if (!e) return C.warn('Çizimde kum ve yağ tutucu yok.');
    C.kumtutucuEkipman(e);
  });
  if (C.ribbon && C.ribbon.tabs) {
    const tab = C.ribbon.tabs.find(t => t[0] === 'Arıtma'), pr = tab && tab[1].find(p => p[0] === 'Proses');
    if (pr && !pr[1].some(b => b.cmd === 'KUMTUTUCU')) { pr[1].push({ cmd: 'KUMTUTUCU', t: 'Kum-yağ tutucu', i: 'ctank' }); try { C.ribbon.render(); } catch (err) { } }
  }
  if (window.DIL) window.DIL.ekle('en', 'English', [['Kum-yağ tutucu', 'Grit and grease chamber'], ['KUM KANALI', 'GRIT CHANNEL'], ['YAĞ KANALI', 'GREASE CHANNEL'], ['KUM OLUĞU', 'GRIT TROUGH'], ['DAĞITMA KANALI', 'DISTRIBUTION CHANNEL'], ['ÇIKIŞ KANALI', 'OUTLET CHANNEL'], ['GEZER KÖPRÜ', 'TRAVELLING BRIDGE'], ['KUM SEPERATÖRÜ', 'GRIT CLASSIFIER'], ['GEZER KÖPRÜ RAYI', 'BRIDGE RAIL'], ['KÖPRÜ RAYI', 'BRIDGE RAIL'], ['BORU MESNEDİ', 'PIPE SUPPORT'], ['DUVAR GEÇİŞ PARÇASI', 'WALL PENETRATION SLEEVE'], ['DİFÜZÖR DÜŞÜMÜ', 'DIFFUSER DROP'], ['YAĞ KONTEYNERİ', 'GREASE CONTAINER'], ['KUM KONTEYNERİ', 'GRIT CONTAINER'], ['Gezer köprü rayı (duvar üstü)', 'Travelling bridge rail (on wall)'], ['Boru mesnedi — zemin ayağı / duvar konsolu', 'Pipe support — floor stand / wall bracket'], ['Duvar geçiş parçası — su tutucu flanşlı', 'Wall penetration sleeve — with puddle flange'], ['Zemin ayağı', 'Floor stand'], ['Duvar konsolu', 'Wall bracket'], ['Boru donanımı', 'Pipe accessories'], ['Boru mesnedi', 'Pipe support'], ['Duvar geçiş parçası', 'Wall penetration sleeve'], ['Kum ekipmanı', 'Grit equipment'], ['Konveyör', 'Conveyor'], ['Konteyner', 'Container']]);
})(typeof window !== 'undefined' ? window.C : (globalThis.C || null));

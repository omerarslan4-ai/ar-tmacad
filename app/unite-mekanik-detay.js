/* ArıtmaCAD — ÜNİTE MEKANİK BAĞLANTI DETAYLARI (MEKANIKPAFTA'nın ikinci paftası: MEK-02 "MEKANİK BAĞLANTI DETAYLARI"; kullanıcı 21.11.2026:
   "kapak bağlantı detayı, mikser bağlantı detayları ve korkuluk bağlantı detaylarını da verebiliriz — ayrı bir detay sayfasında")
   Detaylar ünitede gerçekten bulunan ekipmanın ölçülerinden üretilir; aynı tipte tek detay (ölçüler o tipin değerleriyle):
     1. KAPAK BAĞLANTI DETAYI — açılış tipi başına (savak kapağı aşağı açılır / orifis kapağı yukarı açılır): 1-1 YATAY KESİT (1/10: perde yuvası, çerçevenin
        perdeye gömülmesi e, yan kızak, kapak sacı, nervürlü yüz / düz yüz, EPDM conta, ankraj, ikinci kademe harç) ve 2-2 DÜŞEY KESİT (1/20: eşik, kapak ve
        açık konumu, nervürler, traverseler, boyunduruk, mil, aktüatör ve ISO 5210 bağlantı flanşı ya da kısa şasi zemin ayağı). Pozların ölçüleri KAPAK ÖLÇÜLERİ tablosunda.
     2. MİKSER VE PERGEL VİNÇ BAĞLANTI DETAYI — görünüş (1/25, kılavuz ray kırık): ayak ve taban ankrajı, kılavuz ray, üst tutucunun tabliye ön yüzüne bağlantısı,
        askı kolu kaldırma noktası = palanga halatı ekseni, pergel vinç taban plakası ve tabliye bulonları; A ayak planı (1/20), B üst tutucu planı (1/10),
        C pergel vinç taban plakası planı (1/10).
     3. KORKULUK BAĞLANTI DETAYI — mimari korkuluk detayı (mimari-detay.js: görünüş + üstten ankraj plakalı bağlantı, 1/20) ve yandan (perde / tabliye yan yüzüne) bağlantı (1/20).
   Malzeme açılımı kodludur (mimari açılım üslubu: elemanda kod MA01 …, paftada "MALZEME AÇILIMI" kutusunda tireli satırlar); aynı malzeme aynı kod.
   Çizim değerleri (katman, renk, yazı stili / boyu, ölçü, tarama) kural tablosundan (app/cizim-kural.js); yazılar YZ karakterleriyle (·, ×, –, ≈ yok); marka / model yok.
   Malzeme ve ankraj değerleri KABUL'dür (docs/tasarim-standartlari.md, onay bekliyor): KABUL tablosu aşağıda.
   Saf kısım (tipler, detay çizim listeleri, açılım kodları) Node ile denenir: node test/unite-mekanik-detay.test.js
   Çizim listesi biçimi mimari-detay.js ile aynı ({ k: 'L' | 'P' | 'C' | 'A' | 'T' | 'D' | 'H' | 'B', … }, model metre; yazı ve ölçü uzaklığı kâğıt mm);
   ek olarak 'K' (açılım kodu yeri; kodla() ile yazıya döner) ve çizgi / yazıda isteğe bağlı renk. */
(function (C) {
  'use strict';
  const NODE = typeof module !== 'undefined' && module.exports && typeof require === 'function';
  const DA = NODE ? require('./mimari-detay.js') : (C && C.mimariDetayApi);
  /* ekipman malzemeleri aile parametrelerinden (unite-mekanik.js MLZ; kullanıcı 21.11.2026) — açılımda KABUL değil, parametre */
  const UM = NODE ? require('./unite-mekanik.js') : (C && C.uniteMekanikApi);
  const mlz = (tur, v) => (UM && UM.mlzAd ? UM.mlzAd(tur, v) : v);

  /* ======================= SAF KISIM ======================= */
  /* YZ yazı stilinde olmayan karakterler (unite-mekanik.js sade ile aynı; kullanıcı 21.11.2026) */
  const sade = v => String(v == null ? '' : v).replace(/\s*·\s*/g, ', ').replace(/×/g, 'x').replace(/[–—]/g, '-').replace(/≈\s*/g, 'yakl. ');
  const cm1 = v => String(Math.round(v * 1000) / 10).replace('.', ','); // m → cm, 0,1 cm (8,5 · 12,5 · 20)
  const up = s => String(s || '').toLocaleUpperCase('tr');
  /* ISO 5210 çok turlu aktüatör bağlantı flanşları (standart): bölüm dairesi çapı, flanş dış çapı (mm), bulon sayısı ve çapı */
  const ISO5210 = { F07: { pcd: 70, d: 90, n: 4, M: 8 }, F10: { pcd: 102, d: 125, n: 4, M: 10 }, F14: { pcd: 140, d: 175, n: 4, M: 16 }, F16: { pcd: 165, d: 210, n: 4, M: 20 }, F25: { pcd: 254, d: 300, n: 8, M: 16 }, F30: { pcd: 298, d: 350, n: 8, M: 20 } };
  /* KABUL (onay bekliyor; docs/tasarim-standartlari.md → "Mekanik bağlantı detayları"): malzeme, conta, ankraj ve plaka değerleri */
  const KABUL = {
    kapak: { sac: 8, ankrajM: 12, ankrajAralik: 500 }, // malzeme, conta ve ankraj türü aile parametresinden (mlz, milM, conta, ankraj)
    mikser: { ayakAnkraj: { n: 4, M: 16, L: 125 }, tutucuPlaka: [300, 250, 15], tutucuAnkraj: { n: 4, M: 16 } },
    /* pergel vinç taban plakası bulonları kaldırma kapasitesine göre (tabliyeden geçme bulon + alt karşı plaka) */
    vinc: [{ kap: 500, n: 4, M: 20, t: 25 }, { kap: 1000, n: 4, M: 24, t: 25 }, { kap: 2000, n: 8, M: 24, t: 30 }, { kap: 3200, n: 8, M: 27, t: 35 }],
    korkuluk: { yanPlaka: [120, 200, 10], dubel: { n: 2, M: 12, L: 100 } },
  };
  const vincBulon = kap => KABUL.vinc.find(v => (+kap || 0) <= v.kap) || KABUL.vinc[KABUL.vinc.length - 1];
  /* penstok (penstock_kanal) aile varsayılanları (aile-mekanik.js) — tarayıcıda aileDegerE tam değeri verir; testte eksik parametre buradan */
  const PEN_VARS = { e: 85, ust: 878, sasi: 'OTO', ustK: 350, pw: 100, tr: 1550, kt: 64, mil: 48, tahrik: 'AKT', konum: 'K', acilis: 'YUKARI', nervur: 'ON', yk: 125, yd: 200 };
  /* penstok geometrisi (mm) — aile-mekanik.js pen() ve Hf / nTr formülleriyle aynı */
  const penG = q0 => {
    const q = Object.assign({}, PEN_VARS, q0 || {}), n = k => +q[k] || 0, B = n('B'), H = n('H'), D = n('D');
    const ks = q.sasi === 'KISA' || (q.sasi !== 'TAM' && D > 5000), Hf = ks ? H + n('ustK') : D + n('ust'), asagi = q.acilis === 'ASAGI';
    const nTr = ks ? 0 : Math.max(0, Math.floor((D + n('ust') - 150 - (2 * H + 200)) / Math.max(1, n('tr')))), trz = ks ? [] : [Hf - 100]; for (let i = 1; i <= nTr; i++) trz.push(Hf - 100 - i * n('tr'));
    return { q, B, H, D, e: n('e'), pw: n('pw'), kt: n('kt'), mil: n('mil'), yk: n('yk'), yd: n('yd'), ust: n('ust'), Hf, ks, asagi, zAlt: asagi ? -H : 0, akt: q.tahrik !== 'EL', actH: q.tahrik !== 'EL' ? 550 : 850, zA: ks ? D : Hf,
      Wf: B + 2 * n('e'), Wd: B + 2 * n('e') - 15, nTr, trz, nervur: q.nervur === 'ARKA' ? 'ARKA' : 'ON',
      mK: up(mlz('kapak', q.mlz)), mM: up(mlz('mil', q.milM)), mC: up(mlz('conta', q.conta)), mA: up(mlz('ankraj', q.ankraj)), mAn: UM && UM.mlzK ? [UM.mlzK('kapak', q.mlz), UM.mlzK('mil', q.milM), UM.mlzK('conta', q.conta), UM.mlzK('ankraj', q.ankraj)].join('|') : '' };
  };
  /* trapez mil adımı (ISO 2904; aktuator-katalog.js adim ile aynı) */
  const milAdim = d => d <= 24 ? 5 : d <= 32 ? 6 : d <= 40 ? 7 : d <= 50 ? 8 : d <= 60 ? 9 : 10;
  /* yazı boyları ve renkler kural tablosundan (MIMARI): yazı Mim_Yazi25, kod / satır / başlık açılım kutusu ve detay başlığı */
  const olc = R => { const Y = (R && R.yazi) || {}, A = (R && R.acilim) || {}, K = A.kutu || {}, E = A.etiket || {}, B = (R && R.baslik) || {}, my = (Y['Mim_Yazi25'] || {}).mm || [];
    return { y: my[1] || my[0], alt: my[my.length - 1], kod: K.kodMm, kodRenk: K.kodRenk, satir: K.satirMm, satirAralik: K.satirAralik, kodAralik: K.kodAralik, girinti: K.girinti, sutun: K.sutun, kenar: K.kenar,
      kutuBas: K.baslikMm, kutuBasRenk: K.baslikRenk, bas: B.detayMm, okRenk: E.cizgiRenk, sira: (R && R.olcuYeri && R.olcuYeri.detay && R.olcuYeri.detay.siraModel) || 0.25 }; };

  /* detay tipleri: kalemler (unite-mekanik.js kalem + { e, q, ak }) ve pozla satırları →
     { kapak: [{ acilis, pozlar, poz, q, ak, tum: [{ poz, q, ak }] }], mikser: [{ poz, q, vinc: { poz, q } | null }], korkuluk: [{ poz, kh, dik, km, tk }] } */
  function detayTipleri(kalemler, satirlar) {
    const pozOf = new Map((satirlar || []).map(r => [r.anahtar, r.poz])), kap = new Map(), mik = new Map(), kor = new Map(); let vinc = null;
    for (const k of kalemler || []) {
      const poz = pozOf.get(k.anahtar); if (poz == null) continue; const q = k.q || {};
      if (k.grup === 'kapak') { const ac = q.acilis === 'ASAGI' ? 'ASAGI' : 'YUKARI', anh = ac + '|' + penG(q).mAn; let g = kap.get(anh); if (!g) kap.set(anh, g = { acilis: ac, pozlar: [], tum: [], q: null }); // tip: açılış + malzeme
        if (!g.pozlar.includes(poz)) { g.pozlar.push(poz); g.tum.push({ poz, q, ak: k.ak || null }); }
        if (!g.q || (+q.B || 0) * (+q.H || 0) > (+g.q.B || 0) * (+g.q.H || 0)) { g.q = q; g.poz = poz; g.ak = k.ak || null; } } // temsilci: en büyük açıklık
      else if (k.grup === 'mikser') { if (!mik.has(poz)) mik.set(poz, { poz, q, vinc: null }); }
      else if (k.grup === 'vinc') { if (!vinc) vinc = { poz, q }; }
      else if (k.grup === 'korkuluk') { const e = k.e || {}; if (!kor.has(poz)) kor.set(poz, { poz, kh: +e.kh || 110, dik: +e.dik || 150, km: e.km || 'galvaniz', tk: e.tk === 'H' ? 'H' : 'E' }); }
    }
    const kapak = [...kap.values()].map(g => Object.assign(g, { pozlar: g.pozlar.sort((a, b) => a - b), tum: g.tum.sort((a, b) => a.poz - b.poz) })).sort((a, b) => a.pozlar[0] - b.pozlar[0]);
    const mikser = [...mik.values()].sort((a, b) => a.poz - b.poz); for (const m of mikser) m.vinc = vinc;
    return { kapak, mikser, korkuluk: [...kor.values()].sort((a, b) => a.poz - b.poz) };
  }
  const pozYaz = L => 'POZ ' + (L || []).join(', ');

  /* liste (mimari-detay.js) + açılım kodu (K) ve oklu kod çizgisi; yazı boyu kuraldan */
  const yeni = (sc, R) => { const D = DA.liste(sc), S = olc(R);
    /* malzeme kodu: elemandaki nokta p → kod yeri q (çizgi YZ katmanında renk 243, ucu küçük daire; kod Yazi25 renk 94) */
    D.KOD = (p, q, lines) => { const sag = q[0] >= p[0], u = 2 * D.k; D.o.push({ k: 'L', a: p, b: q, ly: 'ACIKLAMA_OKU', renk: S.okRenk }, { k: 'L', a: q, b: [q[0] + (sag ? u : -u), q[1]], ly: 'ACIKLAMA_OKU', renk: S.okRenk }, { k: 'C', c: p, r: 0.5 * D.k, ly: 'ACIKLAMA_OKU', renk: S.okRenk });
      D.o.push({ k: 'K', p: [q[0] + (sag ? u * 1.3 : -u * 1.3), q[1] - (S.kod || 3.5) * 0.45 * D.k], al: sag ? 'L' : 'R', lines: lines.map(s => sade(s)) }); };
    D.YZ = (p, s, al, mm) => D.T(p, sade(s), mm || S.y, al || 'L', 'YAZI');
    D.OK = (a, b) => { const d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]) || 1, u = [d[0] / l, d[1] / l], n = [-u[1], u[0]], h = 2.5 * D.k; D.L(a, b, 'YAZI'); D.P([b, [b[0] - u[0] * h + n[0] * h * 0.35, b[1] - u[1] * h + n[1] * h * 0.35], [b[0] - u[0] * h - n[0] * h * 0.35, b[1] - u[1] * h - n[1] * h * 0.35]], true, 'YAZI'); };
    D.SOLID = pts => { D.H(pts, 'solid'); };
    D.BAS = s => { const b = kutuO(D.o, D.k); D.B([(b[0] + b[2]) / 2, b[3] + 12 * D.k], sade(s), S.bas, '1/' + sc); };
    D.S = S; D.sc = sc; D.SR = S.sira; return D; };
  /* kapsam: mimari-detay kutu + ölçü çizgilerinin uzaklığı (ölçü yazısı ölçü çizgisinin dışında ~4 mm) — başlık ölçülere binmesin */
  const kutuO = (items, k) => { const b = DA.kutu(items); for (const it of items) { if (it.k !== 'D') continue; const o = (it.off || 0) * k, d = (Math.sign(it.off || 1)) * 4 * k;
    if (it.yon === 'h') { const y = it.a[1] + o + d; b[1] = Math.min(b[1], y); b[3] = Math.max(b[3], y); } else { const x = it.a[0] + o + d; b[0] = Math.min(b[0], x); b[2] = Math.max(b[2], x); } } return b; };
  const R4 = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

  /* ---------- 1) KAPAK: 1-1 YATAY KESİT (perde yuvası ve bir yan kızak; x açıklığın yan yüzünden perdeye, y akış yönü) ---------- */
  function kapakPlan(t, o = {}) {
    const D = yeni(o.sc || 10, o.R), k = D.k, G = penG(t.q), m = v => v / 1000, S = D.S;
    const e = m(G.e), yk = m(G.yk), yd = m(G.yd), pw = Math.min(m(G.pw), yd - 0.02), kt = m(G.kt), tw = Math.max(+t.tw || 0.30, yd + 0.06), sg = G.nervur === 'ON' ? 1 : -1;
    const Lw = Math.max(yk + 0.30, 0.45), Lk = 0.32, xe = e - 0.0075, g = Math.min(kt / 2 + 0.010, pw / 2 - 0.006), sac = KABUL.kapak.sac / 1000;
    // perde (kesilen beton) ve yuva; yuvada ikinci kademe harç
    D.H([[0, -tw / 2], [Lw, -tw / 2], [Lw, tw / 2], [0, tw / 2], [0, yd / 2], [yk, yd / 2], [yk, -yd / 2], [0, -yd / 2]], 'beton');
    D.H(R4(0, -yd / 2, yk, yd / 2), 'harc');
    D.P([[Lw, tw / 2], [0, tw / 2], [0, yd / 2], [yk, yd / 2], [yk, -yd / 2], [0, -yd / 2], [0, -tw / 2], [Lw, -tw / 2]], false, 'DETAY_KESIT'); D.KIRIK([Lw, -tw / 2], [Lw, tw / 2], 'DETAY_GORUNEN');
    // yan kızak (çerçeve): U profil, oluğu kapağa bakar; perdeye e kadar gömülü
    const U = [[-0.015, -pw / 2], [e, -pw / 2], [e, pw / 2], [-0.015, pw / 2], [-0.015, g], [xe + 0.0055, g], [xe + 0.0055, -g], [-0.015, -g]];
    D.SOLID(U); D.P(U, true, 'DETAY_MEK_KAPAK');
    // ankraj: kızak sırtından yuva dibine ve perdeye
    for (const yy of [-pw / 4, pw / 4]) { D.L([e, yy], [yk + 0.09, yy], 'DETAY_MEK_KAPAK'); D.P(R4(e - 0.004, yy - 0.009, e, yy + 0.009), true, 'DETAY_MEK_KAPAK'); }
    // kapak: sac (düz yüz) + kenar profili + nervür (görünen, nervürlü yüzde)
    D.P(R4(-Lk, -kt / 2, xe, kt / 2), true, 'DETAY_MEK_KAPAK'); D.SOLID(R4(-Lk, -sg * kt / 2, xe, -sg * (kt / 2 - sac)).map(p => [p[0], p[1]]));
    D.L([xe - 0.008, -kt / 2], [xe - 0.008, kt / 2], 'DETAY_MEK_KAPAK'); D.KIRIK([-Lk, -kt / 2 - 0.06], [-Lk, kt / 2 + 0.06], 'DETAY_GORUNEN');
    D.P(R4(-Lk, sg > 0 ? kt / 2 : -kt / 2 - 0.05, xe - 0.02, sg > 0 ? kt / 2 + 0.05 : -kt / 2), true, 'DETAY_GORUNEN');
    // EPDM conta (J profil): düz yüzde, kızak oluğunun yüzüne basar
    const cy0 = -sg * kt / 2, cy1 = -sg * g; D.SOLID(R4(xe - 0.040, Math.min(cy0, cy1), xe - 0.012, Math.max(cy0, cy1))); D.C([xe - 0.012, (cy0 + cy1) / 2], Math.abs(cy1 - cy0) / 2, 'DETAY_MEK_KAPAK');
    // akış oku ve yüz yazıları
    D.OK([-Lk - 0.07, -0.14], [-Lk - 0.07, 0.14]); D.YZ([-Lk - 0.09, 0.0], 'AKIŞ', 'R');
    D.YZ([-Lk / 2, sg * (kt / 2 + 0.05) + sg * 3.5 * k - (sg < 0 ? S.y * k : 0)], 'NERVÜRLÜ YÜZ (SU TARAFI)', 'C');
    D.YZ([-Lk / 2, -sg * (kt / 2) - sg * 3.5 * k - (sg > 0 ? S.y * k : 0)], 'DÜZ YÜZ', 'C');
    // ölçüler (cm): gömülme e, yuva, kızak, kapak, perde
    const SR = D.SR * 1000 / D.sc;
    D.D([0, tw / 2], [e, tw / 2], 'h', 8, cm1(e)); D.D([0, tw / 2], [yk, tw / 2], 'h', 8 + SR, cm1(yk));
    D.D([Lw, -yd / 2], [Lw, yd / 2], 'v', 8, cm1(yd)); D.D([Lw, -tw / 2], [Lw, tw / 2], 'v', 8 + SR, cm1(tw));
    D.D([-0.015, -pw / 2], [-0.015, pw / 2], 'v', -6 - 15, cm1(pw)); D.D([-Lk, -kt / 2], [-Lk, kt / 2], 'v', -8 - 15 - SR * 0.4, cm1(kt));
    // malzeme kodları: sağda perde / harç / ankraj / kızak, solda kapak / conta / nervür
    const xr = Lw + (8 + SR + 14) * k, xl = -Lk - (30 + SR * 0.4) * k, dy = 9 * k;
    D.KOD([Lw * 0.7, -tw / 2 + 0.03], [xr, -tw / 2 - dy], [`BETONARME PERDE, ${Math.round(tw * 100)} cm`]);
    D.KOD([yk * 0.75, yd / 2 - 0.02], [xr, tw / 2 + dy * 1.5], ['İKİNCİ KADEME DOLGU: RÖTRESİZ HARÇ', '(ÇERÇEVE AYARLANDIKTAN SONRA)']);
    D.KOD([(e + yk) / 2 + 0.02, pw / 4], [xr, tw / 2 + dy * 3.5], [`ANKRAJ: M${KABUL.kapak.ankrajM} ${G.mA}, @ ${KABUL.kapak.ankrajAralik} mm`]);
    D.KOD([e * 0.6, -pw / 2 + 0.003], [xr, -tw / 2 - dy * 3], [`ÇERÇEVE (YAN KIZAK): ${G.mK} BÜKÜM U PROFİL`, `PERDEYE GÖMÜLME e = ${G.e} mm (HER YAN)`]);
    D.KOD([-Lk * 0.55, 0], [xl, kt / 2 + dy * 2.5], [`KAPAK: ${G.mK}, ${KABUL.kapak.sac} mm SAC + YATAY NERVÜRLER`, `KAPAK ENİ ${G.Wd} mm (B + 2e - 15)`]);
    D.KOD([xe - 0.026, (cy0 + cy1) / 2], [xl, -kt / 2 - dy * 2], [`SIZDIRMAZLIK CONTASI: ${G.mC} J PROFİL (YAN VE ALT)`]);
    D.KOD([-Lk * 0.25, sg * (kt / 2 + 0.025)], [xl, sg > 0 ? kt / 2 + dy * 5 : -kt / 2 - dy * 4.5], [`NERVÜR: ${G.mK} LAMA, NERVÜRLÜ YÜZ SU TARAFINDA, DUVAR TARAFI DÜZ`]);
    D.BAS(`${pozYaz(t.pozlar)} - ${t.asagi ? 'SAVAK KAPAĞI' : 'KAPAK'} BAĞLANTI DETAYI 1-1 (YATAY KESİT)`);
    return { items: D.o, bb: DA.kutu(D.o), olcu: { e: G.e, yk: G.yk, yd: G.yd, pw: G.pw, kt: G.kt, tw: Math.round(tw * 1000) } };
  }

  /* ---------- 1) KAPAK: 2-2 DÜŞEY KESİT (kapak ekseninde; y akış yönü, z eşikten yukarı) ---------- */
  function kapakDusey(t, o = {}) {
    const D = yeni(o.sc || 20, o.R), k = D.k, G = penG(t.q), m = v => v / 1000, S = D.S, SR = D.SR * 1000 / D.sc;
    const H = m(G.H), Dp = m(G.D), Hf = m(G.Hf), zAlt = m(G.zAlt), yd = m(G.yd), pw = Math.min(m(G.pw), yd - 0.02), kt = m(G.kt), r = m(G.mil) / 2, tw = Math.max(+t.tw || 0.30, yd + 0.06), sg = G.nervur === 'ON' ? 1 : -1;
    const zp = G.asagi ? zAlt - 0.05 : 0, zb = G.asagi ? zp - 0.30 : -0.45, zA = m(G.zA), actH = m(G.actH), sac = KABUL.kapak.sac / 1000;
    // eşik altındaki perde (kesilen); savak kapağında kapağın indiği yuva
    const alt = G.asagi ? [[-tw / 2, zb], [-tw / 2, 0], [-yd / 2, 0], [-yd / 2, zp], [yd / 2, zp], [yd / 2, 0], [tw / 2, 0], [tw / 2, zb]] : [[-tw / 2, zb], [-tw / 2, 0], [tw / 2, 0], [tw / 2, zb]];
    D.H(alt, 'beton'); D.P(alt, false, 'DETAY_KESIT'); D.KIRIK([-tw / 2, zb], [tw / 2, zb], 'DETAY_GORUNEN');
    // açıklığın yan yüzleri ve perde üstü (kesit düzleminin arkasında, görünen); yan yuvalar gizli
    D.P([[-tw / 2, 0], [-tw / 2, Dp], [tw / 2, Dp], [tw / 2, 0]], false, 'DETAY_GORUNEN'); for (const s of [-1, 1]) D.L([s * yd / 2, 0], [s * yd / 2, Dp], 'DETAY_GIZLI', 'HIDDEN');
    D.YZ([-tw / 2 - 2 * k, Dp + 1.5 * k], 'PERDE ÜSTÜ / PLATFORM', 'R'); D.YZ([-tw / 2 - 2 * k, 1.5 * k], G.asagi ? 'AÇIKLIK EŞİĞİ (SAVAK KRETİ)' : 'AÇIKLIK EŞİĞİ', 'R');
    // çerçeve yan kızağı (görünen), eşik (alt bağ), traverseler, boyunduruk
    D.P(R4(-pw / 2, zAlt, pw / 2, Hf), true, 'DETAY_MEK_KAPAK'); D.SOLID(R4(-pw / 2, zAlt, pw / 2, zAlt + 0.03)); D.P(R4(-pw / 2, zAlt, pw / 2, zAlt + 0.03), true, 'DETAY_MEK_KAPAK');
    for (const z of G.trz) D.P(R4(-0.06, m(z), 0.06, m(z) + 0.10), true, 'DETAY_MEK_KAPAK');
    D.P(R4(-0.11, Hf, 0.11, Hf + 0.15), true, 'DETAY_MEK_KAPAK');
    // kapak (kesilen): kapalı konum; düz yüzde sac, nervürlü yüzde yatay nervürler (kesilen) ve orta düşey nervür
    D.P(R4(-kt / 2, 0, kt / 2, H), true, 'DETAY_MEK_KAPAK'); D.SOLID(R4(-sg * kt / 2, 0, -sg * (kt / 2 - sac), H).map(p => [p[0], p[1]]));
    const nR = Math.max(2, Math.round(G.H / 350)), y0 = sg > 0 ? kt / 2 : -kt / 2 - 0.05;
    D.P(R4(y0, 0, y0 + 0.05, H), true, 'DETAY_GORUNEN'); for (let i = 1; i < nR; i++) { const z = H * i / nR; D.SOLID(R4(y0, z - 0.025, y0 + 0.05, z + 0.025)); }
    D.SOLID(R4(-sg * kt / 2 - sg * 0.006, 0, -sg * kt / 2, 0.03)); // alt conta
    // açık konum (gizli)
    D.P(G.asagi ? R4(-kt / 2, -H, kt / 2, 0) : R4(-kt / 2, H, kt / 2, 2 * H), true, 'DETAY_GIZLI', 'HIDDEN');
    D.YZ([tw / 2 + 3 * k, G.asagi ? -H / 2 : 1.5 * H], 'KAPAK AÇIK KONUMU', 'L');
    // mil ve eksen
    const zTop = zA + 0.15 + actH + 0.15; D.L([-r, H], [-r, zTop], 'DETAY_MEK_KAPAK'); D.L([r, H], [r, zTop], 'DETAY_MEK_KAPAK'); D.L([0, H - 0.1], [0, zTop + 0.1], 'DETAY_EKSEN');
    // tahrik: tam şasi → boyunduruk üstünde ISO 5210 flanşı; kısa şasi → platformda zemin ayağı (ankrajlı)
    const AK = t.ak || null, F = AK && ISO5210[AK.flans];
    if (G.ks) { D.P(R4(-0.20, Dp, 0.20, Dp + 0.03), true, 'DETAY_MEK_KAPAK'); D.P(R4(-0.10, Dp + 0.03, 0.10, Dp + 0.15), true, 'DETAY_MEK_KAPAK'); for (const s of [-1, 1]) D.L([s * 0.15, Dp + 0.03], [s * 0.15, Dp - 0.12], 'DETAY_GIZLI', 'HIDDEN'); }
    const zf = zA + 0.15;
    if (G.akt) { const fr = F ? F.d / 2000 : 0.09, pc = F ? F.pcd / 2000 : 0.06; D.SOLID(R4(-fr, zf, fr, zf + 0.02)); for (const s of [-1, 1]) D.L([s * pc, zf - 0.05], [s * pc, zf + 0.035], 'DETAY_MEK_KAPAK');
      D.P(R4(-0.15, zf + 0.02, 0.15, zf + actH), true, 'DETAY_MEK_KAPAK'); D.P(R4(-0.20, zf + 0.14, -0.15, zf + 0.46), true, 'DETAY_MEK_KAPAK'); }
    else { D.P(R4(-0.12, zf, 0.12, zf + actH), true, 'DETAY_MEK_KAPAK'); D.P(R4(-0.25, zf + actH, 0.25, zf + actH + 0.04), true, 'DETAY_MEK_KAPAK'); }
    // akış oku
    D.OK([-tw / 2 - 0.55, H * 0.45], [-tw / 2 - 0.15, H * 0.45]); D.YZ([-tw / 2 - 0.55, H * 0.45 + 2 * k], 'AKIŞ', 'L');
    // ölçüler (cm, sağda): H, kapak yuvası, platform, çerçevenin platform üstü taşması
    const yr = Math.max(tw / 2, 0.20) + 0.05;
    D.D([yr, 0], [yr, H], 'v', 8, cm1(H)); if (G.asagi) D.D([yr, zAlt], [yr, 0], 'v', 8, cm1(-zAlt)); D.D([yr, H], [yr, Dp], 'v', 8, cm1(Dp - H)); D.D([yr, Dp], [yr, Hf], 'v', 8, cm1(Hf - Dp));
    D.D([yr, G.asagi ? zAlt : 0], [yr, Hf], 'v', 8 + SR, cm1(Hf - (G.asagi ? zAlt : 0))); D.D([-tw / 2, zb], [tw / 2, zb], 'h', -8, cm1(tw));
    // malzeme kodları
    const xr = yr + (8 + SR + 14) * k, xl = -tw / 2 - 0.65;
    if (G.akt) D.KOD([0.15, zf + actH * 0.6], [xr, zf + actH * 0.6], [`ELEKTRİKLİ AKTÜATÖR${AK ? ' ' + AK.boy : ''} (ÇOK TURLU, 400 V)`, AK ? `ISO 5210 ${AK.flans} BAĞLANTI FLANŞI${F ? ` (Ø${F.d} mm, ${F.n} ADET M${F.M} BULON)` : ''}` : 'ISO 5210 BAĞLANTI FLANŞI']);
    else D.KOD([0.12, zf + actH * 0.5], [xr, zf + actH * 0.5], ['EL ÇARKLI TAHRİK KUTUSU']);
    D.KOD(G.ks ? [0.18, Dp + 0.015] : [0.09, Hf + 0.075], [xr, (G.ks ? Dp : Hf) + 0.0], G.ks ? ['ZEMİN AYAĞI (KISA ŞASİ)', `4 ADET M${KABUL.kapak.ankrajM} ${G.mA} İLE PLATFORMA`] : [`ÜST BOYUNDURUK: ${G.mK}, AKTÜATÖR MONTAJ PLAKASI`, `ÇERÇEVE PLATFORMDAN ${G.Hf - G.D} mm YUKARIDA`]);
    D.KOD([r, (H + zA) / 2], [xr, (H + zA) / 2 - 0.25], [`YÜKSELEN MİL: TR${G.mil}x${milAdim(G.mil)} TRAPEZ, ${G.mM}`]);
    D.KOD([-pw / 2 + 0.005, (H + Dp) / 2], [xl, (H + Dp) / 2], [`ÇERÇEVE: ${G.mK} (YAN KIZAK, EŞİK, ARA TRAVERSE)`]);
    D.KOD([y0 + 0.025, H * 0.5 / nR + 0.0], [xl, H * 0.15], [`KAPAK: ${G.mK}, ${KABUL.kapak.sac} mm SAC + YATAY NERVÜRLER`]);
    D.KOD([-sg * kt / 2 - sg * 0.003, 0.015], [xl, -0.12], [`SIZDIRMAZLIK CONTASI: ${G.mC} (ALT)`]);
    if (G.asagi) D.KOD([0, zAlt + 0.015], [xl, zAlt + 0.15], ['KAPAK YUVASI (PERDE İÇİNDE, KAPAK AŞAĞI İNER)', 'EŞİK (ALT BAĞ)']);
    D.BAS(`${pozYaz(t.pozlar)} - ${t.asagi ? 'SAVAK KAPAĞI' : 'KAPAK'} BAĞLANTI DETAYI 2-2 (DÜŞEY KESİT)`);
    return { items: D.o, bb: DA.kutu(D.o), olcu: { H: G.H, D: G.D, Hf: G.Hf, mil: G.mil, ks: G.ks, flans: AK ? AK.flans : null } };
  }
  /* kapak ölçü tablosu (pozlar): POZ, AÇILIŞ, B x H, D, ÇERÇEVE, e, YUVA, MİL, TAHRİK */
  const KAPAK_SUTUN = [{ t: 'POZ NO', w: 13 }, { t: 'AÇILIŞ', w: 22 }, { t: 'AÇIKLIK B x H (mm)', w: 26 }, { t: 'KANAL DERİNLİĞİ D (mm)', w: 24 }, { t: 'ÇERÇEVE Wf x Hf (mm)', w: 26 }, { t: 'GÖMME e (mm)', w: 16 }, { t: 'PERDE YUVASI (mm)', w: 24 }, { t: 'MİL', w: 18 }, { t: 'TAHRİK / FLANŞ', w: 34, al: 'L' }, { t: 'MALZEME (ÇERÇEVE, KAPAK / MİL / CONTA)', w: 40, al: 'L' }];
  function kapakTablo(tipler) {
    const rows = [];
    for (const g of tipler || []) for (const r of g.tum) { const G = penG(r.q), ak = r.ak;
      rows.push([String(r.poz), G.asagi ? 'Aşağı açılır (savak)' : 'Yukarı açılır', `${G.B} x ${G.H}`, String(G.D), `${G.Wf} x ${G.Hf}`, String(G.e), `${G.B + 2 * G.yk} x ${G.yd}`, `TR${G.mil}x${milAdim(G.mil)}`, G.akt ? (ak ? `Aktüatör ${ak.boy}, ISO 5210 ${ak.flans}` : 'Elektrikli aktüatör') : 'El çarkı', `${mlz('kapak', G.q.mlz)} / ${mlz('mil', G.q.milM)} / ${mlz('conta', G.q.conta)}`].map(sade)); }
    return { cols: KAPAK_SUTUN.map(c => Object.assign({}, c)), rows };
  }

  /* ---------- 2) MİKSER: model geometrisi (mm) ---------- */
  /* üretici modelinin parça kutularından (mikser-ksb-veri.js parca[].bb, mikser-ksb.js MODEL: rayY, tutucuY, kancaY) → ayak, ray, tutucu, gövde, askı kolu.
     Model yoksa (GENEL) kılavuz direk 100 x 100 ve aile gövdesi. Hd: taban → tabliye üstü (mm); tutucunun yeri mikser-ksb.js yerlesim ile aynı (tabliye üstünün 50 mm altı). */
  function mikserGeo(q, md, parca) {
    const P = ad => (parca || []).find(p => p.ad === ad), bb = ad => (P(ad) || {}).bb, Hd = +q.Hd || 0;
    if (md && parca && P('ray') && P('ustTutucu') && P('askiKolu')) {
      const ray = bb('ray'), tut = bb('ustTutucu'), ask = bb('askiKolu'), ay = bb('ayak'), hedef = Math.max(Hd, ask[2][1] + 600) - 50, dz = hedef - tut[2][1];
      return { model: true, Hd, rayY: (ray[1][0] + ray[1][1]) / 2, rayB: ray[1][1] - ray[1][0], rayX: ray[0][1] - ray[0][0], rayZ0: ray[2][0], rayUst: ray[2][1] + dz,
        tutY0: tut[1][0], tutY1: tut[1][1], tutX: (tut[0][1] - tut[0][0]) / 2, tutZ0: tut[2][0] + dz, tutZ1: hedef,
        ayak: { x: (ay[0][1] - ay[0][0]) / 2, y0: ay[1][0], y1: ay[1][1] }, kancaY: +md.kancaY || 240, kancaZ: ask[2][1], ask: { y0: ask[1][0], y1: ask[1][1], z0: ask[2][0] },
        parca: ['kizak', 'motor', 'disli', 'pervane'].filter(P).map(ad => ({ ad, y0: bb(ad)[1][0], y1: bb(ad)[1][1], z0: bb(ad)[2][0], z1: bb(ad)[2][1] })), hm: +q.hm || 0, D: +q.D || 0 };
    }
    const L = +q.lm || 700, ym = -L / 2 - 120, hm = +q.hm || 600, rb = Math.max(120, (+q.D || 370) * 0.32);
    return { model: false, Hd, rayY: ym, rayB: 100, rayX: 100, rayZ0: 0, rayUst: Hd, tutY0: ym - 50, tutY1: ym + 50, tutX: 80, tutZ0: Hd - 450 - 60, tutZ1: Hd - 150 + 60,
      ayak: { x: 150, y0: ym - 150, y1: ym + 150 }, kancaY: ym + 50, kancaZ: Hd - 150, ask: null,
      parca: [{ ad: 'motor', y0: -L / 2, y1: L / 2, z0: hm - rb, z1: hm + rb }, { ad: 'pervane', y0: L / 2 + 80, y1: L / 2 + 140, z0: hm - (+q.D || 370) / 2, z1: hm + (+q.D || 370) / 2 }], hm, D: +q.D || 370 };
  }
  /* pergel vinç (mm): jib modeli → direk yüksekliği H, kanca yüksekliği, taban yarı ölçüsü (pergel-vinc-veri.js ayak); genel → aile parametreleri */
  const vincGeo = (v, V) => { const q = (v && v.q) || {}, mt = { mlz: up(mlz('vinc', q.mlz)), bulon: up(mlz('bulon', q.bulon)) }; return Object.assign(mt, V ? { model: true, H: +V.H || +q.vh || 1800, L: +q.L || +V.uc || 600, hh: (V.kanca && +V.kanca.z) || +q.hh || 300, taban: 2 * ((V.ayak && +V.ayak[0]) || 200), direk: 200, kap: +q.kap || 0 }
    : { model: false, H: +q.vh || 1800, L: +q.L || 600, hh: +q.hh || 300, taban: 140, direk: 90, kap: +q.kap || 0 }); };

  /* MİKSER VE PERGEL VİNÇ GÖRÜNÜŞÜ (y itki yönü, z havuz tabanından; kılavuz ray ortada kırık). t: { poz, vpoz, geo, vinc (vincGeo), kbT (tabliye kalınlığı m), tb (radye m) } */
  function mikserGorunus(t, o = {}) {
    const D = yeni(o.sc || 25, o.R), k = D.k, g = t.geo, m = v => v / 1000, S = D.S, SR = D.SR * 1000 / D.sc, V = t.vinc;
    const Hd = m(g.Hd), kbT = +t.kbT || 0.20, tb = Math.min(+t.tb || 0.40, 0.40), rayY = m(g.rayY), rb = m(g.rayB) / 2, tutY0 = m(g.tutY0), tutY1 = m(g.tutY1);
    const ustZ = Math.max(...g.parca.map(p => m(p.z1)), g.ask ? m(g.kancaZ) : 0), z0k = ustZ + 0.35, z1k = m(g.tutZ0) - 0.45, kir = z1k - z0k > 0.8, ara = 0.30, kay = kir ? (z1k - z0k) - ara : 0;
    const Z = z => (!kir || z <= z0k ? z : z >= z1k ? z - kay : z0k + (z - z0k) * ara / (z1k - z0k)), P2 = (y, z) => [y, Z(z)];
    const R4z = (y0, z0, y1, z1) => R4(y0, Z(z0), y1, Z(z1));
    // havuz tabanı (radye, kesilen)
    const ry0 = Math.min(m(g.ayak.y0), tutY0) - 0.6, ry1 = Math.max(...g.parca.map(p => m(p.y1))) + 0.4;
    D.H(R4(ry0, -tb, ry1, 0), 'beton'); D.L([ry0, 0], [ry1, 0], 'DETAY_KESIT'); D.L([ry0, -tb], [ry1, -tb], 'DETAY_KESIT'); D.KIRIK([ry0, 0], [ry0, -tb], 'DETAY_GORUNEN'); D.KIRIK([ry1, 0], [ry1, -tb], 'DETAY_GORUNEN');
    // ayak (taban plakası + gövde) ve ankrajlar
    const ay0 = m(g.ayak.y0), ay1 = m(g.ayak.y1), zr0 = m(g.rayZ0);
    D.SOLID(R4(ay0, 0, ay1, 0.025)); D.P([[ay0 + 0.08, 0.025], [ay1 - 0.08, 0.025], [rayY + rb + 0.10, Math.max(zr0, 0.08)], [rayY - rb - 0.05, Math.max(zr0, 0.08)]], true, 'DETAY_MIKSER');
    const KA = KABUL.mikser.ayakAnkraj; for (const y of [ay0 + 0.06, ay1 - 0.06]) { D.L([y, 0.06], [y, 0], 'DETAY_MIKSER'); D.L([y, 0], [y, -m(KA.L)], 'DETAY_GIZLI', 'HIDDEN'); D.P(R4(y - 0.015, 0.025, y + 0.015, 0.045), true, 'DETAY_MIKSER'); }
    // kılavuz ray (kırık)
    if (kir) { D.P([P2(rayY - rb, z0k - 0.02), P2(rayY - rb, zr0), P2(rayY + rb, zr0), P2(rayY + rb, z0k - 0.02)], false, 'DETAY_MIKSER'); D.P([[rayY - rb, Z(z1k) + 0.02], [rayY - rb, Z(m(g.rayUst))], [rayY + rb, Z(m(g.rayUst))], [rayY + rb, Z(z1k) + 0.02]], false, 'DETAY_MIKSER');
      D.KIRIK([rayY - rb - 0.08, Z(z0k)], [rayY + rb + 0.08, Z(z0k)], 'DETAY_GORUNEN'); D.KIRIK([rayY - rb - 0.08, Z(z1k)], [rayY + rb + 0.08, Z(z1k)], 'DETAY_GORUNEN'); }
    else D.P(R4z(rayY - rb, zr0, rayY + rb, m(g.rayUst)), true, 'DETAY_MIKSER');
    // mikser gövdesi (kızak, motor, dişli, pervane) ve pervane ekseni
    for (const p of g.parca) if (p.ad !== 'pervane') D.P(R4z(m(p.y0), m(p.z0), m(p.y1), m(p.z1)), true, 'DETAY_MIKSER');
    const pv = g.parca.find(p => p.ad === 'pervane'); if (pv) { const zc = m(g.hm || (pv.z0 + pv.z1) / 2), rp = m(g.D) / 2, yc = (m(pv.y0) + m(pv.y1)) / 2; D.P(R4z(yc - 0.03, zc - rp, yc + 0.03, zc + rp), true, 'DETAY_MIKSER'); D.L([m(g.parca[0].y0) - 0.3, Z(zc)], [m(pv.y1) + 0.3, Z(zc)], 'DETAY_EKSEN'); }
    // askı kolu ve kaldırma noktası
    const ky = m(g.kancaY), kz = m(g.kancaZ);
    if (g.ask) D.P([P2(m(g.ask.y0), m(g.ask.z0)), P2(ky, kz), P2(m(g.ask.y1), m(g.ask.z0))], false, 'DETAY_MIKSER');
    D.C(P2(ky, kz), 0.035, 'DETAY_MIKSER');
    // tabliye (kesilen) ve üst tutucu + ankraj plakası
    const ty1 = tutY0, ty0 = ty1 - Math.max(1.2, m(V ? V.L : 600) + 0.6);
    D.H(R4z(ty0, Hd - kbT, ty1, Hd), 'beton'); D.P([P2(ty0, Hd), P2(ty1, Hd), P2(ty1, Hd - kbT), P2(ty0, Hd - kbT)], false, 'DETAY_KESIT'); D.KIRIK(P2(ty0, Hd), P2(ty0, Hd - kbT), 'DETAY_GORUNEN');
    const tp = KABUL.mikser.tutucuPlaka, tpt = m(tp[2]), pz0 = Math.max(Hd - kbT + 0.01, Hd - 0.02 - m(tp[1])), pz1 = Hd - 0.02;
    D.SOLID(R4z(ty1, pz0, ty1 + tpt, pz1)); D.P(R4z(ty1 + tpt, m(g.tutZ0), tutY1, m(g.tutZ1)), true, 'DETAY_MIKSER');
    for (const z of [pz0 + 0.04, pz1 - 0.04]) { D.L(P2(ty1 + tpt + 0.02, z), P2(ty1, z), 'DETAY_MIKSER'); D.L(P2(ty1, z), P2(ty1 - 0.125, z), 'DETAY_GIZLI', 'HIDDEN'); }
    // pergel vinç: taban plakası, direk, kol, palanga, halat (kaldırma noktası ekseninde)
    let yv = null;
    if (V) { yv = ky - m(V.L); const Hv = m(V.H), tbn = m(V.taban) / 2, dr = m(V.direk) / 2, VB = vincBulon(V.kap), tpl = m(VB.t);
      D.SOLID(R4z(yv - tbn, Hd, yv + tbn, Hd + tpl)); D.P(R4z(yv - dr, Hd + tpl, yv + dr, Hd + Hv - 0.12), true, 'DETAY_MEK_PERGEL');
      D.P(R4z(yv - dr, Hd + Hv - 0.12, ky + 0.10, Hd + Hv), true, 'DETAY_MEK_PERGEL'); D.L(P2(yv + dr, Hd + Hv - 0.12 - 0.45), P2(yv + dr + Math.min(0.6, m(V.L) * 0.45), Hd + Hv - 0.12), 'DETAY_MEK_PERGEL');
      D.P(R4z(ky - 0.08, Hd + Hv - 0.12 - 0.32, ky + 0.08, Hd + Hv - 0.12), true, 'DETAY_MEK_PERGEL'); D.SOLID(R4z(yv - tbn, Hd - kbT - 0.015, yv + tbn, Hd - kbT));
      for (const s of [-1, 1]) { const y = yv + s * (tbn - 0.05); D.L(P2(y, Hd + tpl + 0.03), P2(y, Hd), 'DETAY_MEK_PERGEL'); D.L(P2(y, Hd), P2(y, Hd - kbT), 'DETAY_GIZLI', 'HIDDEN'); D.L(P2(y, Hd - kbT), P2(y, Hd - kbT - 0.05), 'DETAY_MEK_PERGEL'); }
      // halat: palangadan askı kolunun kaldırma noktasına (aynı eksen)
      const zh0 = Hd + Hv - 0.12 - 0.32; if (kir) { D.L(P2(ky, zh0), P2(ky, z1k), 'DETAY_EKSEN'); D.L(P2(ky, z0k), P2(ky, kz + 0.035), 'DETAY_EKSEN'); } else D.L(P2(ky, zh0), P2(ky, kz + 0.035), 'DETAY_EKSEN'); }
    // ölçüler (cm; kırık bölgeden geçenlerde gerçek değer)
    const yD = ry1 + 0.05, sv = (a, b, off, txt) => D.D([yD, Z(a)], [yD, Z(b)], 'v', off, txt);
    sv(0, m(g.hm || 0) || 0.001, 8, cm1(m(g.hm || 0))); sv(0, Hd, 8 + SR, cm1(Hd)); D.D([tutY0, Z(m(g.tutZ1))], [rayY, Z(m(g.tutZ1))], 'h', 8, cm1(Math.abs(rayY - tutY0)));
    D.D([ty1, Z(Hd - kbT)], [ty1, Z(Hd)], 'v', -8 - SR, cm1(kbT));
    if (V) { const Hv = m(V.H); D.D([yv, Z(Hd + Hv)], [ky, Z(Hd + Hv)], 'h', 8, cm1(m(V.L))); D.D([yv - m(V.taban) / 2, Z(Hd)], [yv - m(V.taban) / 2, Z(Hd + Hv)], 'v', -8, cm1(Hv)); }
    // malzeme kodları (solda tabliye / vinç, sağda mikser)
    const xl = ty0 - 0.15, xr = yD + (8 + 2 * SR + 14) * k, VB = V ? vincBulon(V.kap) : null, tpS = KABUL.mikser.tutucuPlaka, TA = KABUL.mikser.tutucuAnkraj;
    D.KOD([ty0 + 0.3, Z(Hd - kbT / 2)], [xl, Z(Hd - kbT / 2) - 0.25], [`BETONARME TABLİYE, ${Math.round(kbT * 100)} cm`]);
    D.KOD([ty1 + tpt / 2, Z((pz0 + pz1) / 2)], [xl, Z(Hd) - 0.75], ['ÜST TUTUCU: SS304, TABLİYE ÖN YÜZÜNE', `ANKRAJ PLAKASI ${tpS[0]}x${tpS[1]}x${tpS[2]} mm, ${TA.n} ADET M${TA.M} KİMYASAL DÜBEL (SS A4)`]);
    if (V) { const Hv = m(V.H); D.KOD([yv, Z(Hd + 0.01)], [xl, Z(Hd) + 0.35], [`PERGEL VİNÇ TABAN PLAKASI ${V.taban}x${V.taban}x${VB.t} mm, ${V.mlz}`, `${VB.n} ADET M${VB.M} GEÇME BULON (${V.bulon}) + TABLİYE ALTINDA KARŞI PLAKA`]);
      D.KOD([yv, Z(Hd + Hv * 0.6)], [xl, Z(Hd + Hv * 0.6)], [`PERGEL VİNÇ${V.kap ? `, KALDIRMA KAPASİTESİ ${V.kap} kg` : ''}`, `${t.elk ? 'ELEKTRİKLİ' : 'MANUEL'} ZİNCİRLİ PALANGA, DÖNER KOL`, `DİREK VE KOL: ${V.mlz}`]);
      D.KOD([ky, Z(Hd + Hv * 0.35)], [xr, Z(Hd + Hv * 0.35)], ['HALAT EKSENİ = ASKI KOLU KALDIRMA NOKTASI EKSENİ', `(KOL ERİŞİMİ ${V.L} mm)`]); }
    D.KOD([ky + 0.02, Z(kz)], [xr, Z(kz) + 0.15], ['ASKI KOLU KALDIRMA NOKTASI']);
    D.KOD([rayY + rb, Z((zr0 + z0k) / 2)], [xr, Z(kz) - 0.35], [`KILAVUZ RAY ${g.rayB}x${g.rayX} mm KARE PROFİL, SS304`, 'AYAKTAN ÜST TUTUCUYA']);
    D.KOD([(ay0 + ay1) / 2 + 0.2, 0.012], [xr, 0.35], ['MİKSER AYAĞI (TABAN PLAKALI)', `${KA.n} ADET M${KA.M} KİMYASAL DÜBEL (SS A4), L = ${KA.L} mm`]);
    D.KOD([(ry0 + ry1) / 2, -tb / 2], [xr, -tb / 2 - 0.1], ['BETONARME RADYE (HAVUZ TABANI)']);
    D.BAS(`POZ ${[t.poz, t.vpoz].filter(v => v != null).join(', ')} - MİKSER VE PERGEL VİNÇ BAĞLANTI DETAYI (GÖRÜNÜŞ)`);
    return { items: D.o, bb: DA.kutu(D.o), olcu: { Hd: g.Hd, hm: g.hm, rayB: g.rayB, L: V ? V.L : null, vH: V ? V.H : null, kir } };
  }
  /* A: ayak taban plakası planı */
  function mikserAyakPlan(t, o = {}) {
    const D = yeni(o.sc || 20, o.R), k = D.k, g = t.geo, m = v => v / 1000, x = m(g.ayak.x), y0 = m(g.ayak.y0), y1 = m(g.ayak.y1), KA = KABUL.mikser.ayakAnkraj, rb = m(g.rayB) / 2, rx = m(g.rayX) / 2, ry = m(g.rayY), SR = D.SR * 1000 / D.sc;
    D.P(R4(-x, y0, x, y1), true, 'DETAY_MIKSER'); D.P(R4(-rx, ry - rb, rx, ry + rb), true, 'DETAY_MIKSER'); D.L([0, y0 - 0.15], [0, y1 + 0.15], 'DETAY_EKSEN');
    const bx = x - 0.06, by = [y0 + 0.06, y1 - 0.06]; for (const sx of [-1, 1]) for (const yy of by) { D.C([sx * bx, yy], m(KA.M) / 2, 'DETAY_MIKSER'); D.C([sx * bx, yy], m(KA.M) * 1.1, 'DETAY_MIKSER'); }
    D.D([-x, y1], [x, y1], 'h', 8, cm1(2 * x)); D.D([-bx, y1], [bx, y1], 'h', 8 + SR, cm1(2 * bx)); D.D([x, y0], [x, y1], 'v', 8, cm1(y1 - y0)); D.D([x, by[0]], [x, by[1]], 'v', 8 + SR, cm1(by[1] - by[0]));
    D.KOD([bx, by[0]], [x + (8 + 2 * SR + 12) * k, y0 - 0.1], [`${KA.n} ADET M${KA.M} KİMYASAL DÜBEL (SS A4), L = ${KA.L} mm`]);
    D.YZ([0, y1 + 0.05], 'İTKİ YÖNÜ', 'C'); D.OK([0.12, y1 - 0.25], [0.12, y1 - 0.05]);
    D.BAS(`POZ ${t.poz} - A: MİKSER AYAĞI TABAN ANKRAJI (PLAN)`);
    return { items: D.o, bb: DA.kutu(D.o) };
  }
  /* B: üst tutucu planı (tabliye ön yüzü) */
  function tutucuPlan(t, o = {}) {
    const D = yeni(o.sc || 10, o.R), k = D.k, g = t.geo, m = v => v / 1000, ty = m(g.tutY0), ty1 = m(g.tutY1), tx = m(g.tutX), rb = m(g.rayB) / 2, rx = m(g.rayX) / 2, ry = m(g.rayY), tp = KABUL.mikser.tutucuPlaka, pt = m(tp[2]), px = m(tp[0]) / 2, SR = D.SR * 1000 / D.sc;
    D.H(R4(-px - 0.15, ty - 0.35, px + 0.15, ty), 'beton'); D.L([-px - 0.15, ty], [px + 0.15, ty], 'DETAY_KESIT'); D.KIRIK([-px - 0.15, ty - 0.35], [px + 0.15, ty - 0.35], 'DETAY_GORUNEN');
    D.SOLID(R4(-px, ty, px, ty + pt)); D.P(R4(-tx, ty + pt, tx, ty1), true, 'DETAY_MIKSER'); D.P(R4(-rx, ry - rb, rx, ry + rb), true, 'DETAY_MIKSER');
    for (const sx of [-1, 1]) { const x = sx * (px - 0.04); D.L([x, ty + pt + 0.02], [x, ty], 'DETAY_MIKSER'); D.L([x, ty], [x, ty - 0.125], 'DETAY_GIZLI', 'HIDDEN'); }
    D.D([-px, ty + pt], [px, ty + pt], 'h', -8 - 30, cm1(2 * px)); D.D([0.0, ty], [0.0, ry], 'v', -10, cm1(ry - ty)); D.L([0, ty - 0.05], [0, ry + rb + 0.08], 'DETAY_EKSEN');
    D.KOD([px - 0.04, ty + pt / 2], [px + (14 + SR) * k, ty + pt + 0.10], [`ANKRAJ PLAKASI ${tp[0]}x${tp[1]}x${tp[2]} mm, SS304`, `${KABUL.mikser.tutucuAnkraj.n} ADET M${KABUL.mikser.tutucuAnkraj.M} KİMYASAL DÜBEL (SS A4)`]);
    D.KOD([tx, (ty + ty1) / 2], [px + (14 + SR) * k, ty1 + 0.08], ['ÜST TUTUCU (DÖNER), SS304']);
    D.YZ([-px - 0.1, ty - 0.12], 'TABLİYE', 'R');
    D.BAS(`POZ ${t.poz} - B: ÜST TUTUCU BAĞLANTISI (PLAN)`);
    return { items: D.o, bb: DA.kutu(D.o) };
  }
  /* C: pergel vinç taban plakası planı */
  function vincTabanPlan(t, o = {}) {
    const D = yeni(o.sc || 10, o.R), k = D.k, V = t.vinc, m = v => v / 1000, b = m(V.taban) / 2, dr = m(V.direk) / 2, VB = vincBulon(V.kap), SR = D.SR * 1000 / D.sc, bo = b - 0.05;
    D.P(R4(-b, -b, b, b), true, 'DETAY_MEK_PERGEL'); D.C([0, 0], dr, 'DETAY_MEK_PERGEL');
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) D.L([dx * dr, dy * dr], [dx * (b - 0.015), dy * (b - 0.015)], 'DETAY_MEK_PERGEL'); // berkitme lamaları
    const nb = VB.n, bolts = nb <= 4 ? [[1, 1], [-1, 1], [-1, -1], [1, -1]] : [[1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]];
    for (const [sx, sy] of bolts) { D.C([sx * bo, sy * bo], m(VB.M) / 2, 'DETAY_MEK_PERGEL'); D.C([sx * bo, sy * bo], m(VB.M), 'DETAY_MEK_PERGEL'); }
    D.L([0, -b - 0.1], [0, b + 0.25], 'DETAY_EKSEN'); D.OK([0.08, b + 0.05], [0.08, b + 0.22]); D.YZ([0.11, b + 0.12], 'KOL / MİKSER YÖNÜ', 'L');
    D.D([-b, -b], [b, -b], 'h', -8, cm1(2 * b)); D.D([-bo, -b], [bo, -b], 'h', -8 - SR, cm1(2 * bo)); D.D([b, -b], [b, b], 'v', 8, cm1(2 * b));
    D.KOD([bo, -bo], [b + (8 + SR + 12) * k, -b - 0.06], [`${nb} ADET M${VB.M} GEÇME BULON (${V.bulon})`, 'TABLİYE ALTINDA KARŞI PLAKA']);
    D.KOD([dr * 0.7, dr * 0.7], [b + (8 + SR + 12) * k, b + 0.05], [`DİREK Ø${V.direk} mm, TABAN PLAKASI ${V.taban}x${V.taban}x${VB.t} mm, BERKİTMELİ`]);
    D.BAS(`POZ ${t.vpoz} - C: PERGEL VİNÇ TABAN PLAKASI (PLAN)`);
    return { items: D.o, bb: DA.kutu(D.o) };
  }

  /* ---------- 3) KORKULUK ---------- */
  /* üstten bağlantı: mimari korkuluk detayı (görünüş + kesit; boru çapları modeldeki korkulukla aynı) — başlık poz numarasıyla, yazılar YZ karakterleriyle */
  function korkulukUst(t, o = {}) {
    const sc = o.sc || 20, r = DA.korkulukDetay({ kod: `POZ ${t.poz}`, kh: t.kh, dik: t.dik, mal: t.mal, tk: t.tk }, { sc }), S = olc(o.R);
    for (const it of r.items) { if (it.k === 'T') it.s = sade(it.s); if (it.k === 'D' && it.txt) it.txt = sade(it.txt);
      if (it.k === 'B') { it.s = sade(`POZ ${t.poz} - KORKULUK BAĞLANTI DETAYI, ÜSTTEN (h = ${Math.round(t.kh)} cm)`); if (S.bas) it.hp = S.bas; } }
    return { items: r.items, bb: DA.kutu(r.items) };
  }
  /* yandan bağlantı: dikme perde / tabliye yan yüzüne yan plaka ve dübellerle; y yüzden dışarı, z üst yüzden yukarı */
  function korkulukYan(t, o = {}) {
    const D = yeni(o.sc || 20, o.R), k = D.k, K = DA.KORK, kh = (t.kh || 110) / 100, rD = K.dikme / 2, YP = KABUL.korkuluk.yanPlaka, pt = YP[2] / 1000, ph = YP[1] / 1000, KD = KABUL.korkuluk.dubel, SR = D.SR * 1000 / D.sc;
    const ds = -0.45, yd = pt + rD; // dikme ekseni yüzden pt + yarıçap dışarıda; dikme alt ucu üst yüzün ph altında
    D.H([[-0.5, ds], [0, ds], [0, 0], [-0.5, 0]], 'beton'); D.P([[-0.5, 0], [0, 0], [0, ds]], false, 'DETAY_KESIT'); D.KIRIK([-0.5, 0], [-0.5, ds], 'DETAY_GORUNEN'); D.KIRIK([-0.5, ds], [0, ds], 'DETAY_GORUNEN');
    D.SOLID(R4(0, -0.02 - ph, pt, -0.02)); D.P(R4(yd - rD, -0.02 - ph + 0.01, yd + rD, kh - K.kup / 2), true, 'DETAY_KORKULUK');
    D.C([yd, kh], K.kup / 2, 'DETAY_KORKULUK'); D.C([yd, kh / 2], K.ara / 2, 'DETAY_KORKULUK');
    if (t.tk !== 'H') D.P(R4(yd + rD, 0, yd + rD + K.tekT, K.tekH), true, 'DETAY_KORKULUK');
    for (const z of [-0.02 - 0.04, -0.02 - ph + 0.04]) { D.L([pt + 0.015, z], [0, z], 'DETAY_KORKULUK'); D.L([0, z], [-KD.L / 1000, z], 'DETAY_GIZLI', 'HIDDEN'); }
    D.D([yd + 0.1, 0], [yd + 0.1, kh], 'v', 8, cm1(kh)); D.D([0, -0.02 - ph], [0, -0.02], 'v', -8 - 12, cm1(ph));
    if (t.tk !== 'H') D.D([yd + rD, 0], [yd + rD, K.tekH], 'v', 8 + SR, cm1(K.tekH));
    const xr = yd + 0.1 + (8 + 2 * SR + 10) * k;
    D.KOD([pt / 2, -0.02 - ph / 2], [xr, -0.30], [`YAN PLAKA ${YP[0]}x${YP[1]}x${YP[2]} mm`, `${KD.n} ADET M${KD.M} KİMYASAL DÜBEL (L = ${KD.L} mm)`]);
    D.KOD([yd + rD, kh * 0.3], [xr, kh * 0.3], [`Ø${String(K.dikme * 1000).replace('.', ',')} DİKME @ ${Math.round(t.dik || 150)} cm`]);
    D.KOD([yd, kh], [xr, kh + 0.05], [`Ø${String(K.kup * 1000).replace('.', ',')} KÜPEŞTE`]); D.KOD([yd, kh / 2], [xr, kh / 2 + 0.05], [`Ø${String(K.ara * 1000).replace('.', ',')} ARA KÜPEŞTE`]);
    if (t.tk !== 'H') D.KOD([yd + rD + K.tekT, K.tekH * 0.6], [xr, 0.12], [`TEKMELİK LAMASI ${Math.round(K.tekH * 1000)}x${Math.round(K.tekT * 1000)} mm`]);
    D.KOD([-0.25, ds / 2], [-0.5 - 0.25, ds / 2], ['BETONARME PERDE / TABLİYE KENARI']);
    D.YZ([0.0, kh + 0.2], `${up(t.mal || 'SICAK DALDIRMA GALVANİZ ÇELİK')} - h = ${Math.round(kh * 100)} cm`, 'L');
    D.BAS(`POZ ${t.poz} - KORKULUK BAĞLANTI DETAYI, YANDAN (PERDE / TABLİYE YAN YÜZÜNE)`);
    return { items: D.o, bb: DA.kutu(D.o) };
  }

  /* ---------- açılım kodları: K yerlerini kodlara çevir (aynı satırlar → aynı kod MA01 …); kod yazısı açılım kutusu kod boyunda ---------- */
  function kodla(listeler, R) {
    const S = olc(R), kod = new Map(), out = [];
    for (const L of listeler) for (const it of L) { if (it.k !== 'K') continue; const imza = it.lines.join('|'); let c = kod.get(imza); if (!c) { c = 'MA' + String(kod.size + 1).padStart(2, '0'); kod.set(imza, c); out.push({ kod: c, lines: it.lines.slice() }); }
      Object.assign(it, { k: 'T', s: c, mm: S.kod, ly: 'MALZEME_ACILIM_YAZI', renk: S.kodRenk, rot: 0 }); delete it.lines; }
    return out;
  }
  /* MALZEME AÇILIMI kutusu (kâğıt mm, sol alt 0,0): başlık, sütunlarda kod (altı çizili) + tireli satırlar — açılım kutusu (acilim.kutu) ölçüleriyle */
  function acilimBlok(liste, R, o = {}) {
    const S = olc(R), sp = [], hMax = o.hMax || 150, satirH = S.satirAralik, kodH = S.kodAralik, kenar = S.kenar, sw = S.sutun;
    const kayit = (liste || []).map(a => ({ kod: a.kod, lines: a.lines.map(s => sade(s)), h: kodH + a.lines.length * satirH + 2 }));
    const sut = [[]]; let hh = 0; for (const a of kayit) { if (hh + a.h > hMax && sut[sut.length - 1].length) { sut.push([]); hh = 0; } sut[sut.length - 1].push(a); hh += a.h; }
    const icH = Math.max(...sut.map(s => s.reduce((t, a) => t + a.h, 0))), W = sut.length * sw + 2 * kenar, Hb = S.kutuBas + 8, H = icH + Hb + 2 * kenar;
    sp.push({ k: 'P', pts: R4(0, 0, W, H), cl: true, ly: 'MALZEME_ACILIM' });
    sp.push({ k: 'T', p: [kenar, H - kenar - S.kutuBas], s: 'MALZEME AÇILIMI', h: S.kutuBas, al: 'L', ly: 'MALZEME_ACILIM_YAZI', renk: S.kutuBasRenk });
    sp.push({ k: 'L', a: [kenar, H - kenar - S.kutuBas - 1.2], b: [kenar + 'MALZEME AÇILIMI'.length * S.kutuBas * 0.72, H - kenar - S.kutuBas - 1.2], ly: 'MALZEME_ACILIM_YAZI', renk: S.kutuBasRenk });
    sut.forEach((s, i) => { let y = H - kenar - Hb; const x = kenar + i * sw;
      for (const a of s) { y -= kodH; sp.push({ k: 'T', p: [x, y], s: a.kod, h: S.kod, al: 'L', ly: 'MALZEME_ACILIM_YAZI', renk: S.kodRenk }); sp.push({ k: 'L', a: [x, y - 1], b: [x + a.kod.length * S.kod * 0.75, y - 1], ly: 'MALZEME_ACILIM_YAZI', renk: S.kodRenk });
        for (const l of a.lines) { y -= satirH; sp.push({ k: 'T', p: [x + S.girinti, y], s: '-  ' + l, h: S.satir, al: 'L', ly: 'MALZEME_ACILIM_YAZI' }); } y -= 2; } });
    return { spec: sp, w: W, h: H };
  }

  /* hepsi: tipler → detay listeleri (kodlanmış) + açılım + kapak tablosu. o: { R, tw, kbT, tb, aktuator(q), mikserGeo(q) → geo, vincGeo(v) → vincGeo, mal(km) } */
  function detaylar(kalemler, satirlar, o = {}) {
    const T = detayTipleri(kalemler, satirlar), R = o.R, out = [];
    for (const g of T.kapak) { const ak = g.ak || (o.aktuator ? o.aktuator(g.q) : null), t = { pozlar: g.pozlar, q: g.q, ak, tw: o.tw, asagi: g.acilis === 'ASAGI' };
      for (const tum of g.tum) if (!tum.ak && o.aktuator) tum.ak = o.aktuator(tum.q);
      out.push(Object.assign({ tur: 'kapakPlan', sc: 10 }, kapakPlan(t, { sc: 10, R }))); out.push(Object.assign({ tur: 'kapakDusey', sc: 20 }, kapakDusey(t, { sc: 20, R }))); }
    for (const mk of T.mikser) { const geo = o.mikserGeo ? o.mikserGeo(mk.q) : mikserGeo(mk.q), V = mk.vinc ? (o.vincGeo ? o.vincGeo(mk.vinc) : vincGeo(mk.vinc, null)) : null;
      const t = { poz: mk.poz, vpoz: mk.vinc ? mk.vinc.poz : null, geo, vinc: V, kbT: o.kbT, tb: o.tb, elk: !!(mk.vinc && mk.vinc.q && mk.vinc.q.tahrik === 'ELEKTRIKLI') };
      out.push(Object.assign({ tur: 'mikser', sc: 25 }, mikserGorunus(t, { sc: 25, R }))); out.push(Object.assign({ tur: 'mikserA', sc: 20 }, mikserAyakPlan(t, { sc: 20, R }))); out.push(Object.assign({ tur: 'mikserB', sc: 10 }, tutucuPlan(t, { sc: 10, R })));
      if (V) out.push(Object.assign({ tur: 'vincC', sc: 10 }, vincTabanPlan(t, { sc: 10, R }))); }
    for (const kr of T.korkuluk) { const t = Object.assign({}, kr, { mal: o.mal ? o.mal(kr.km) : kr.km });
      out.push(Object.assign({ tur: 'korkulukUst', sc: 20 }, korkulukUst(t, { sc: 20, R }))); out.push(Object.assign({ tur: 'korkulukYan', sc: 20 }, korkulukYan(t, { sc: 20, R }))); }
    const acilim = kodla(out.map(d => d.items), R);
    for (const d of out) d.bb = DA.kutu(d.items);
    return { tipler: T, detaylar: out, acilim, kapakTablo: T.kapak.length ? kapakTablo(T.kapak) : null };
  }

  const api = { sade, cm1, ISO5210, KABUL, PEN_VARS, penG, milAdim, detayTipleri, kapakPlan, kapakDusey, kapakTablo, mikserGeo, vincGeo, mikserGorunus, mikserAyakPlan, tutucuPlan, vincTabanPlan, korkulukUst, korkulukYan, kodla, acilimBlok, detaylar, vincBulon };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!C || !C.addCommand) return;
  C.uniteMekDetayApi = api;

  /* ======================= MODELE ÇİZİM ======================= */
  const RK = () => C.cizimKural && C.cizimKural.MIMARI;
  /* program katmanı → kural tablosundaki çizim katmanının rengi / çizgi tipi / kalınlığı (unite-mekanik.js kat ile aynı) */
  const kat = ad => { const K = C.cizimKural, R = RK(), h = R && K.esle(R, ad), t = h && K.tanim(R, h), o = t ? K.ozellik(t) : { color: 7, lt: 'CONTINUOUS', lw: 18 }; C.ensureLayer(ad, o.color, C.LT && C.LT[o.lt] ? o.lt : 'CONTINUOUS', o.lw); return ad; };
  const stil = ad => { const K = C.cizimKural, R = RK(), h = R && K.esle(R, ad), y = h && R.yazi && R.yazi[h]; return y && y.stil ? y.stil[0] : undefined; };
  /* tarama: kural kesitTarama.malzeme (beton ANSI36; harç → grobeton deseni AR-CONC, KABUL), çelik kesit dolu (kesitTarama.diger) */
  const tarama = mat => { const R = RK(), KT = R && R.kesitTarama, M = (KT && KT.malzeme) || {};
    if (mat === 'solid') return { pat: (KT && KT.diger) || 'SOLID', sc: 1, ly: 'Solid' };
    const q = M[mat === 'harc' ? 'grobeton' : mat]; if (q && (C.HATCH_PATTERNS || {})[q.desen] !== undefined) return { pat: q.desen, sc: q.sc, ang: q.aci || 0, ly: q.katman, ann: q.gercek ? false : undefined };
    return { pat: 'ANSI36', sc: 0.3937, ly: 'Tarama' }; };
  const ciz = (items, base, gv, sc) => {
    const k = sc / 1000, X = q => [base[0] + q[0], base[1] + q[1], 0];
    /* dis: Mekanik — açılım katmanları (MALZEME_ACILIM…) mimari.js disOf'ta Mimari sayılır, Mekanik paftasında gizlenirdi */
    const mk = (type, p) => { const e = C.add(C.newEnt(type, Object.assign({ gv, dis: 'Mekanik' }, p))); if (e) { delete e.sp; delete e.sv2; } return e; };
    for (const it of items) {
      const ly = kat(it.ly || 'DETAY_GORUNEN'), ek = Object.assign({}, it.lt ? { lt: it.lt } : {}, it.renk != null ? { color: it.renk } : {});
      if (it.k === 'L') mk('line', Object.assign({ a: X(it.a), b: X(it.b), layer: ly }, ek));
      else if (it.k === 'P') mk('pline', Object.assign({ pts: it.pts.map(X), closed: !!it.cl, layer: ly }, ek));
      else if (it.k === 'C') mk('circle', Object.assign({ c: X(it.c), r: it.r, layer: ly }, ek));
      else if (it.k === 'A') mk('arc', Object.assign({ c: X(it.c), r: it.r, a0: it.a0, a1: it.a1, layer: ly }, ek));
      else if (it.k === 'T') mk('text', Object.assign({ p: X(it.p), h: it.mm * k, s: it.s, rot: it.rot || 0, al: it.al, layer: ly, ann: false }, stil(ly) ? { st: stil(ly) } : {}, it.renk != null ? { color: it.renk } : {}));
      else if (it.k === 'D') { const a = X(it.a), b = X(it.b), off = it.off * k, p = it.yon === 'h' ? [a[0], a[1] + off, 0] : [a[0] + off, a[1], 0]; mk('dim', { k: it.yon === 'v' ? 'v' : 'h', a, b, p, txt: it.txt, layer: kat('DETAY_OLCU') }); }
      else if (it.k === 'H') { const s = tarama(it.mat); mk('hatch', Object.assign({ loops: [it.pts.map(q => { const w = X(q); return [w[0], w[1]]; })], pat: s.pat, sc: s.sc, ang: s.ang || 0, orig: [base[0], base[1]], layer: kat(s.ly) }, s.ann === false ? { ann: false } : {})); }
      else if (it.k === 'B') mk(C.T.baslik ? 'baslik' : 'text', C.T.baslik ? { p: X(it.p), s: it.s, hp: it.hp, layer: kat('YAZI'), ol: it.ol } : { p: X(it.p), h: it.hp * k, s: it.s, al: 'C', layer: kat('YAZI') });
    }
  };
  /* kâğıt mm çizimini (tablo / açılım kutusu) modele: O sol alt, kf = sc / 1000 */
  const kagitCiz = (spec, O, sc, gv, st) => { const kf = sc / 1000, P = q => [O[0] + q[0] * kf, O[1] + q[1] * kf, 0];
    for (const e of spec) { const ly = kat(e.ly || 'PAFTA_LISTESI'), base = Object.assign({ gv, layer: ly, dis: 'Mekanik' }, e.renk != null ? { color: e.renk } : {}); let n = null;
      if (e.k === 'L') n = C.newEnt('line', Object.assign(base, { a: P(e.a), b: P(e.b) })); else if (e.k === 'P') n = C.newEnt('pline', Object.assign(base, { pts: e.pts.map(P), closed: !!e.cl }));
      else if (e.k === 'T') n = C.newEnt('text', Object.assign(base, { p: P(e.p), h: e.h * kf, s: sade(e.s), rot: 0, al: e.al || 'L', ann: false }, st ? { st } : {}));
      if (n) { const x = C.add(n); if (x) delete x.sp; } } };
  /* üretim: unite-mekanik.js uret içinden (pafta ölçeği ve poz satırları hazırken). a: { u, K (kalemler + e, q), satir, X0, Yc }
     → { bloklar: [{ gv, sc, tablo? }], Yc, acilim, n } — bloklar MEK-02 paftasına girer */
  C.uniteMekDetay = a => {
    if (!DA) return null; const R = RK(), u = a.u || {}, uq = Object.assign({}, u.par || {}, u), A = C.mekPaftaArac;
    const mdl = q => (q.model && q.model !== 'GENEL' && C.mikserModel && C.mikserModel[q.model]) || null;
    const ksbVeri = md => { const V = md && md.veri && C.MIKSER_KSB_VERI && C.MIKSER_KSB_VERI[md.veri]; return V ? V.parca.map(p => ({ ad: p.ad, bb: p.bb })) : null; };
    const r = detaylar(a.K || [], a.satir || [], { R, tw: +uq.tw || undefined, kbT: +uq.kbT || undefined, tb: +uq.tb || undefined,
      aktuator: q => (C.aktuator ? C.aktuator.penstokAktuator({ B: q.B, H: q.H, hw: q.hw, G: q.G, mil: q.mil }) : null),
      mikserGeo: q => { const md = mdl(q); return mikserGeo(q, md, ksbVeri(md)); },
      vincGeo: v => vincGeo(v, v && v.q && v.q.model && C.PERGEL_VINC_VERI ? C.PERGEL_VINC_VERI[v.q.model] : null),
      mal: km => (C.KORKULUK_KM && C.KORKULUK_KM[km] ? C.KORKULUK_KM[km][0] : km) });
    if (!r.detaylar.length) return { bloklar: [], Yc: a.Yc, n: 0 };
    let Yc = a.Yc; const X0 = a.X0, bloklar = [], t0 = Date.now().toString(36);
    r.detaylar.forEach((d, i) => { const gv = `UMEK_DETAY_${t0}_${i}`, base = [X0 - d.bb[0], Yc - d.bb[3]]; ciz(d.items, base, gv, d.sc); bloklar.push({ gv, sc: d.sc }); Yc = Yc - (d.bb[3] - d.bb[1]) - 1.5; });
    /* kapak ölçü tablosu ve malzeme açılımı kutusu (kâğıt mm, 1/20 penceresinde; ölçeksiz) */
    const yT = R && R.yazi && R.yazi['Yazi25'], yB = R && R.yazi && R.yazi['Yazi30'], stT = yT && yT.stil ? yT.stil[0] : undefined, SCt = 20, kf = SCt / 1000;
    if (r.kapakTablo && A) { const tb = A.tabloBlok('KAPAK ÖLÇÜLERİ', r.kapakTablo.cols, r.kapakTablo.rows, { h: yT ? yT.mm[0] : undefined, hb: yT ? yT.mm[1] : undefined, hBas: yB ? yB.mm[0] : undefined, lyT: 'PAFTA_LISTESI', lyB: 'PAFTA_LISTESI', lyY: 'PAFTA_LISTESI' });
      const gv = `UMEK_DETAY_${t0}_KT`; kagitCiz(tb.spec, [X0, Yc - tb.h * kf], SCt, gv, stT); bloklar.push({ gv, sc: SCt, tablo: true }); Yc -= tb.h * kf + 1.5; }
    if (r.acilim.length) { const ab = acilimBlok(r.acilim, R), gv = `UMEK_DETAY_${t0}_AC`; kagitCiz(ab.spec, [X0, Yc - ab.h * kf], SCt, gv, stT); bloklar.push({ gv, sc: SCt, tablo: true }); Yc -= ab.h * kf + 1.5; }
    return { bloklar, Yc, acilim: r.acilim, n: r.detaylar.length, tipler: r.tipler };
  };
})(typeof window !== 'undefined' ? window.C : null);

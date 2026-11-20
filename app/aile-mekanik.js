/* ArıtmaCAD — MEKANİK AİLELER
   1) Kanal tipi penstock (kapak) — üretici çizimi PEN-A-KNL-1200-1400 (Coarse Screen Inlet & Outlet Penstock, CEVAHİR GT1 PS):
      kanal 1200, kapak 1400, kanal derinliği 5400; çerçeve iki yanda perde yuvasına 85 mm gömülü (çerçeve 1370, kapak 1355),
      perde yuvası 1450 × 200, çerçeve platformdan 878 mm yukarı (6278), traversler 1550 aralıkla, Ø48 mil (TR30×6), AUMA aktüatör, AISI 316L.
   2) Mekanik kaba ızgara — mevcut parametrik ızgaranın (izgara.js) aile hâli: kanal genişliğine ve derinliğine uyar.
   3) Kum tutucu ekipmanı (Çokal T-103): gezer köprü, köprü rayı, difüzör düşümü (F-F), kum seperatörü, boru mesnedi (ayak / konsol), duvar geçiş parçası. */
(function (C) {
  'use strict';
  const COL = { frame: [0.52, 0.58, 0.64], door: [0.70, 0.73, 0.76], rib: [0.60, 0.64, 0.68], beam: [0.45, 0.51, 0.57], shaft: [0.82, 0.83, 0.85], act: [0.18, 0.36, 0.62], gear: [0.30, 0.32, 0.36], wheel: [0.80, 0.15, 0.12] };
  const m = v => v / 1000, M = C.M;

  /* ================= KANAL TİPİ PENSTOCK ================= */
  /* şasi: TAM = çerçeve platforma kadar; KISA = çerçeve açıklık + üst pay kadar, tahrik platformda zemin ayağında, arada uzatma mili.
     OTO: derinlik 5,0 m'ye kadar tam şasi, daha derinde kısa şasi (firma kuralı, Çokal ızgara kanalları). */
  const kisaSasi = q => q.sasi === 'KISA' || (q.sasi !== 'TAM' && q.D > 5000);
  const pen = q => { // türetilmiş geometri (m)
    const b2 = m(q.B) / 2, e = m(q.e), wf2 = b2 + e, wd2 = m(q.Wd) / 2, Hf = m(q.Hf), H = m(q.H), pw = m(q.pw), kt = m(q.kt), dz = q.konum === 'A' ? H : 0;
    const ks = kisaSasi(q), trz = ks ? [] : [Hf - 0.10]; for (let k = 1; k <= q.nTr; k++) trz.push(Hf - 0.10 - k * m(q.tr));
    const actH = q.tahrik === 'AKT' ? 0.55 : 0.85;
    const D = m(q.D), zA = ks ? D : Hf; // tahrik tabanı: tam şaside çerçeve üstü, kısa şaside platform (zemin ayağı)
    return { b2, e, wf2, wd2, Hf, H, pw, kt, dz, trz, yk: m(q.yk), yd: m(q.yd), D, r: m(q.mil) / 2, actH, ks, zA };
  };
  C.aileKaydet({
    id: 'penstock_kanal', ad: 'Penstock — kanal tipi (duvar yuvalı)', kisaAd: 'PENSTOCK', kat: 'Kapak / vana', katman: 'MEK_KAPAK', renk: 5, ifc: 'IfcValve', // renk: paftadaki Mek_Kapak (20.11.2026)
    aciklama: 'Kanal içine, iki yan perdedeki yuvaya oturan yükselen milli kapak. Kanal genişliği B ve derinliği D kanala uydurulur; 5 metreye kadar tam şasi, daha derinde kısa şasi + uzatma mili (tahrik platformda); çerçeve, kapak, yuva ve mil ölçüleri formüllerle hesaplanır. Kaynak: PEN-A-KNL-1200-1400.',
    params: [
      { k: 'B', ad: 'Kanal (açıklık) genişliği', d: 1200, min: 300, max: 4000, grup: 'Açıklık' },
      { k: 'H', ad: 'Kapak yüksekliği (açıklık)', d: 1400, min: 300, max: 4000, grup: 'Açıklık' },
      { k: 'D', ad: 'Kanal derinliği (taban → platform)', d: 5400, min: 500, max: 15000, grup: 'Açıklık' },
      { k: 'hw', ad: 'Tasarım su derinliği (kapak önünde)', d: 5400, min: 0, max: 15000, grup: 'Açıklık' },
      { k: 'e', ad: 'Çerçevenin perdeye gömülmesi (her yan)', d: 85, grup: 'Çerçeve' },
      { k: 'ust', ad: 'Çerçeve üst taşması (platform üstü)', d: 878, grup: 'Çerçeve' },
      { k: 'sasi', ad: 'Şasi', d: 'OTO', opts: [['OTO', 'Otomatik (5 metreye kadar tam)'], ['TAM', 'Tam şasi (platforma kadar)'], ['KISA', 'Kısa şasi + uzatma mili']], grup: 'Çerçeve' },
      { k: 'ustK', ad: 'Kısa şasi üst payı (açıklık üstü)', d: 350, grup: 'Çerçeve' },
      { k: 'pw', ad: 'Çerçeve profil eni (akış yönü)', d: 100, grup: 'Çerçeve' },
      { k: 'tr', ad: 'Ara traverse aralığı', d: 1550, min: 500, grup: 'Çerçeve' },
      { k: 'kt', ad: 'Kapak kalınlığı', d: 64, grup: 'Kapak ve tahrik' },
      { k: 'mil', ad: 'Mil çapı', d: 48, grup: 'Kapak ve tahrik' },
      { k: 'tahrik', ad: 'Tahrik', d: 'AKT', opts: [['AKT', 'Elektrikli aktüatör (AUMA)'], ['EL', 'El çarkı']], grup: 'Kapak ve tahrik' },
      { k: 'konum', ad: 'Gösterim konumu', d: 'K', opts: [['K', 'Kapalı'], ['A', 'Tam açık']], grup: 'Kapak ve tahrik' },
      { k: 'nervur', ad: 'Nervür (ara destek) yüzü', d: 'ON', opts: [['ON', 'Akış yönündeki yüz (+y)'], ['ARKA', 'Akışa karşı yüz (−y)']], grup: 'Kapak ve tahrik' }, // duvara monte kapakta nervürler suya bakan yüzde, duvar yüzü düz (kullanıcı 20.11.2026)
      { k: 'yk', ad: 'Perde yuvası ek genişliği (her yan)', d: 125, grup: 'İnşaat (yuva)' },
      { k: 'yd', ad: 'Perde yuvası derinliği (akış yönü)', d: 200, grup: 'İnşaat (yuva)' },
      { k: 'Wf', ad: 'Çerçeve genişliği', f: 'B+2*e', grup: 'Hesaplanan' },
      { k: 'Wd', ad: 'Kapak genişliği', f: 'B+2*e-15', grup: 'Hesaplanan' },
      { k: 'Hf', ad: 'Çerçeve yüksekliği', f: q => kisaSasi(q) ? q.H + q.ustK : q.D + q.ust, grup: 'Hesaplanan' },
      { k: 'yuva', ad: 'Perde yuvası genişliği (toplam)', f: 'B+2*yk', grup: 'Hesaplanan' },
      { k: 'strok', ad: 'Strok', f: 'H', grup: 'Hesaplanan' },
      { k: 'nTr', ad: 'Ara traverse (ara yatak) sayısı', birim: 'adet', f: q => kisaSasi(q) ? 0 : Math.max(0, Math.floor((q.D + q.ust - 150 - (2 * q.H + 200)) / q.tr)), grup: 'Hesaplanan' },
      { k: 'F', ad: 'Kapağa su kuvveti (tek taraflı)', birim: 'kN', f: q => { const b = q.B / 1000, h = q.H / 1000, w = q.hw / 1000; return w >= h ? 9.81 * b * h * (w - h / 2) : 9.81 * b * w * w / 2; }, fAcik: 'γw·B·H·(hw − H/2)', grup: 'Hesaplanan' },
      { k: 'G', ad: 'Yaklaşık ağırlık', birim: 'kg', f: q => { const Hf = (q.D + q.ust) / 1000, nT = Math.max(0, Math.floor((q.D + q.ust - 150 - (2 * q.H + 200)) / q.tr)); return Math.round(2 * Hf * 14 + (q.B + 2 * q.e - 15) / 1000 * q.H / 1000 * 75 + (nT + 1) * (q.B + 2 * q.e) / 1000 * 15 + 25 + (q.tahrik === 'AKT' ? 45 : 20) + (Hf - q.H / 1000 + 0.45) * 14); }, fAcik: 'çerçeve + kapak + traverse + mil + tahrik (yaklaşık)', grup: 'Hesaplanan' },
    ],
    tipler: [{ ad: 'PEN-A-KNL-1200-1400', p: { B: 1200, H: 1400, D: 5400, hw: 5400, e: 85, ust: 878, pw: 100, tr: 1550, kt: 64, mil: 48, tahrik: 'AKT', konum: 'K', yk: 125, yd: 200 } }],
    uydur: { gen: 'B', der: 'D', ek: (p, u) => { if (u.k) p.hw = Math.min(p.hw, p.D); } },
    etiket: q => `${q.B}×${q.H}${q.tahrik === 'AKT' ? ' (aktüatörlü)' : ' (el çarklı)'}`,
    etiketYer: q => [0, -(q.yd / 2000 + 0.45), 0],
    liste: q => `B×H ${q.B}×${q.H} mm · çerçeve ${q.Wf}×${q.Hf} · yuva ${q.yuva}×${q.yd} · ${q.tahrik === 'AKT' ? 'elektrikli aktüatör' : 'el çarkı'} · ≈${q.G} kg`,
    bilgi: q => `Çerçeve ${q.Wf} × ${q.Hf} mm, kapak ${q.Wd} × ${q.H} mm, strok ${q.strok} mm, ${q.nTr} ara traverse; perde yuvası ${q.yuva} × ${q.yd} mm (her yan ${q.yk} mm); su kuvveti ≈ ${q.F} kN; ağırlık ≈ ${q.G} kg`,
    baglanti: q => { const b2 = q.B / 2000; return [{ p: [b2, 0, 0] }, { p: [-b2, 0, 0] }, { p: [0, 0, q.D / 1000] }]; },
    tutamac: [
      { k: 'B', yer: q => [q.B / 2000, 0, Math.min(q.H, q.D) / 2000], eksen: [1, 0, 0], merkez: [0.5, 0, 0], adim: 5 },
      { k: 'B', yer: q => [-q.B / 2000, 0, Math.min(q.H, q.D) / 2000], eksen: [-1, 0, 0], merkez: [-0.5, 0, 0], adim: 5 },
      { k: 'H', yer: q => [0, 0, q.H / 1000], eksen: [0, 0, 1], adim: 5 },
      { k: 'D', yer: q => [0, 0, q.D / 1000], eksen: [0, 0, 1], adim: 10 },
    ],
    plan: (q, g) => {
      const G = pen(q);
      for (const s of [-1, 1]) {
        g.dik(s * (G.b2 - 0.015), -G.pw / 2, s * G.wf2, G.pw / 2, { lw: 35 });
        g.dik(s * G.b2, -G.yd / 2, s * (G.b2 + G.yk), G.yd / 2, { lt: 'DASHED', lw: 13 }); // perde yuvası
      }
      g.dik(-G.wd2, -G.kt / 2, G.wd2, G.kt / 2, { lw: 25 });
      g.dik(-(G.wf2 + 0.05), -0.11, G.wf2 + 0.05, 0.11, { lw: 18, lt: 'DASHED' }); // üst boyunduruk
      if (q.tahrik === 'AKT') { g.dik(-0.15, -0.15, 0.15, 0.15, { lw: 25 }); g.dik(0.15, -0.09, 0.45, 0.09, { lw: 18 }); }
      else g.daire([0, 0], 0.25, { lw: 25 });
      g.daire([0, 0], G.r, { lw: 18 });
      g.cizgi([0, -0.75], [0, -0.25], { lw: 25 }); g.cizgi([0, -0.25], [0.08, -0.40], { lw: 25 }); g.cizgi([0, -0.25], [-0.08, -0.40], { lw: 25 }); // akış oku
    },
    mesh: (q, g) => {
      const G = pen(q);
      for (const s of [-1, 1]) g.kutu(s * (G.b2 - 0.015), s * G.wf2, -G.pw / 2, G.pw / 2, 0, G.Hf, COL.frame); // yan kılavuzlar
      g.kutu(-G.wf2, G.wf2, -G.pw / 2, G.pw / 2, 0, 0.03, COL.frame); // eşik
      g.kutu(-G.wd2, G.wd2, -G.kt / 2, G.kt / 2, G.dz, G.dz + G.H, COL.door); // kapak
      const ny0 = q.nervur === 'ARKA' ? -G.kt / 2 - 0.05 : G.kt / 2, ny1 = ny0 + 0.05; // nervür yüzü: ON +y, ARKA −y (duvara bakan yüz düz kalır)
      const nR = Math.max(2, Math.round(G.H / 0.35)); for (let k = 1; k < nR; k++) { const z = G.dz + G.H * k / nR; g.kutu(-G.wd2 + 0.02, G.wd2 - 0.02, ny0, ny1, z - 0.025, z + 0.025, COL.rib); }
      g.kutu(-0.03, 0.03, ny0, ny1, G.dz, G.dz + G.H, COL.rib);
      for (const z of G.trz) { g.kutu(-G.wf2, G.wf2, -0.06, 0.06, z, z + 0.10, COL.beam); g.kutu(-0.06, 0.06, -0.08, 0.08, z - 0.04, z + 0.14, COL.gear); }
      g.kutu(-(G.wf2 + 0.05), G.wf2 + 0.05, -0.11, 0.11, G.Hf, G.Hf + 0.15, COL.beam); // boyunduruk
      if (G.ks) { g.kutu(-0.20, 0.20, -0.20, 0.20, G.D, G.D + 0.03, COL.beam); g.kutu(-0.10, 0.10, -0.10, 0.10, G.D + 0.03, G.D + 0.15, COL.beam); } // zemin ayağı
      g.silindir([0, 0, G.dz + G.H], [0, 0, G.zA + 0.15 + G.actH + 0.15], G.r, COL.shaft, 14); // mil
      if (q.tahrik === 'AKT') { g.kutu(-0.15, 0.15, -0.15, 0.15, G.zA + 0.15, G.zA + 0.15 + G.actH, COL.act); g.silindir([0.15, 0, G.zA + 0.35], [0.45, 0, G.zA + 0.35], 0.09, COL.act); g.silindir([-0.15, 0, G.zA + 0.45], [-0.20, 0, G.zA + 0.45], 0.16, COL.wheel, 20); }
      else { g.kutu(-0.12, 0.12, -0.12, 0.12, G.zA + 0.15, G.zA + 0.15 + G.actH, COL.gear); g.silindir([0, 0, G.zA + 0.15 + G.actH], [0, 0, G.zA + 0.15 + G.actH + 0.04], 0.25, COL.wheel, 24); }
    },
    on: (q, g) => { // akış yönünden bakış (u = x, v = z)
      const G = pen(q), top = G.zA + 0.15 + G.actH;
      for (const s of [-1, 1]) { g.dik(s * (G.b2 - 0.015), 0, s * G.wf2, G.Hf, { lw: 35 }); g.cok([[s * G.b2, -0.3], [s * G.b2, G.D]], false, { lt: 'DASHED', lw: 13 }); g.cok([[s * (G.b2 + G.yk), -0.1], [s * (G.b2 + G.yk), G.D]], false, { lt: 'HIDDEN', lw: 13 }); g.cizgi([s * G.b2, G.D], [s * (G.b2 + 0.9), G.D], { lw: 25 }); }
      g.cizgi([-(G.b2 + 0.9), 0], [G.b2 + 0.9, 0], { lw: 25 }); g.yazi([G.b2 + 0.9, G.D + 0.05], 'platform', 0.09, 'R'); g.yazi([G.b2 + 0.9, 0.05], 'kanal tabanı', 0.09, 'R');
      g.dik(-G.wf2, 0, G.wf2, 0.03);
      g.dik(-G.wd2, G.dz, G.wd2, G.dz + G.H, { lw: 35 }); const nR = Math.max(2, Math.round(G.H / 0.35)); for (let k = 1; k < nR; k++) { const z = G.dz + G.H * k / nR; g.cizgi([-G.wd2, z], [G.wd2, z], { lw: 13 }); } g.cizgi([0, G.dz], [0, G.dz + G.H], { lw: 13 });
      for (const z of G.trz) g.dik(-G.wf2, z, G.wf2, z + 0.10);
      g.dik(-(G.wf2 + 0.05), G.Hf, G.wf2 + 0.05, G.Hf + 0.15, { lw: 35 }); if (G.ks) { g.dik(-0.20, G.D, 0.20, G.D + 0.03, { lw: 25 }); g.dik(-0.10, G.D + 0.03, 0.10, G.D + 0.15, { lw: 25 }); }
      g.cizgi([-G.r, G.dz + G.H], [-G.r, top + 0.15]); g.cizgi([G.r, G.dz + G.H], [G.r, top + 0.15]);
      if (q.tahrik === 'AKT') { g.dik(-0.15, G.zA + 0.15, 0.15, top, { lw: 25 }); g.dik(0.15, G.zA + 0.26, 0.45, G.zA + 0.44); g.dik(-0.20, G.zA + 0.29, -0.15, G.zA + 0.61); }
      else { g.dik(-0.12, G.zA + 0.15, 0.12, top); g.dik(-0.25, top, 0.25, top + 0.04, { lw: 25 }); }
      const yz = -0.45, oz = G.wf2 + 0.35;
      g.olcu([-G.b2, 0], [G.b2, 0], 'h', -0.35, `B = ${q.B}`); g.olcu([-G.wf2, 0], [G.wf2, 0], 'h', yz - 0.25, `çerçeve ${q.Wf}`); g.olcu([-(G.b2 + G.yk), 0], [G.b2 + G.yk, 0], 'h', yz - 0.55, `yuva ${q.yuva}`);
      g.olcu([G.wf2, G.dz], [G.wf2, G.dz + G.H], 'v', 0.35, `H = ${q.H}`); g.olcu([G.wf2, 0], [G.wf2, G.D], 'v', 0.75, `D = ${q.D}`); g.olcu([G.wf2, 0], [G.wf2, G.Hf], 'v', 1.10, `${q.Hf}`);
      g.yazi([-(G.wf2 + 0.1), G.zA + 0.25], `PENSTOCK ${q.B}×${q.H} — kanal tipi`, 0.12, 'R');
    },
    yan: (q, g) => { // yandan (u = y akış, v = z)
      const G = pen(q), top = G.zA + 0.15 + G.actH;
      g.dik(-G.pw / 2, 0, G.pw / 2, G.Hf, { lw: 35 }); g.dik(-G.kt / 2, G.dz, G.kt / 2, G.dz + G.H, { lw: 35 }); { const ny0 = q.nervur === 'ARKA' ? -G.kt / 2 - 0.05 : G.kt / 2; g.dik(ny0, G.dz, ny0 + 0.05, G.dz + G.H, { lw: 13 }); } // nervürler
      g.dik(-G.yd / 2, -0.1, G.yd / 2, G.D, { lt: 'HIDDEN', lw: 13 });
      for (const z of G.trz) g.dik(-0.06, z, 0.06, z + 0.10);
      g.dik(-0.11, G.Hf, 0.11, G.Hf + 0.15, { lw: 35 }); if (G.ks) { g.dik(-0.20, G.D, 0.20, G.D + 0.03, { lw: 25 }); g.dik(-0.10, G.D + 0.03, 0.10, G.D + 0.15, { lw: 25 }); } g.cizgi([-G.r, G.dz + G.H], [-G.r, top + 0.15]); g.cizgi([G.r, G.dz + G.H], [G.r, top + 0.15]);
      if (q.tahrik === 'AKT') g.dik(-0.15, G.zA + 0.15, 0.15, top, { lw: 25 }); else { g.dik(-0.12, G.zA + 0.15, 0.12, top); g.dik(-0.25, top, 0.25, top + 0.04, { lw: 25 }); }
      g.cizgi([-1.2, 0], [1.2, 0], { lw: 25 }); g.cizgi([-1.2, G.D], [-G.yd / 2, G.D], { lw: 25 }); g.cizgi([G.yd / 2, G.D], [1.2, G.D], { lw: 25 });
      g.cizgi([-1.0, G.D * 0.5], [-0.45, G.D * 0.5], { lw: 25 }); g.cizgi([-0.45, G.D * 0.5], [-0.55, G.D * 0.5 + 0.06], { lw: 25 }); g.cizgi([-0.45, G.D * 0.5], [-0.55, G.D * 0.5 - 0.06], { lw: 25 }); g.yazi([-1.0, G.D * 0.5 + 0.08], 'akış', 0.09);
      g.olcu([-G.yd / 2, G.D], [G.yd / 2, G.D], 'h', 0.3, `yuva ${q.yd}`); g.olcu([G.pw / 2, G.dz + G.H], [G.pw / 2, G.Hf], 'v', 0.45, `${Math.round(q.Hf - (G.dz * 1000) - q.H)}`);
    },
  });

  /* ================= BANT KONVEYÖR (ızgara atığı) ve ÇÖP KONTEYNERİ ================= */
  /* Konveyör: orijin = kuyruk ucu ortası, destek döşemesi kotunda; y = taşıma yönü. Ld boyunca ayaklı (yapı üstü), ötesi konsol (konteyner üstü). */
  const KCOL = { frame: [0.55, 0.60, 0.66], belt: [0.15, 0.15, 0.17], drum: [0.80, 0.81, 0.83], motor: [0.18, 0.36, 0.62], bin: [0.20, 0.45, 0.25], lid: [0.15, 0.35, 0.20], wheel: [0.12, 0.12, 0.12] };
  C.aileKaydet({
    id: 'bant_konveyor', ad: 'Bant konveyör — ızgara atığı', kisaAd: 'BANT KONVEYÖR', kat: 'Konveyör', katman: 'MEK_KONVEYOR', renk: 3, ifc: 'IfcTransportElement',
    aciklama: 'Izgaraların boşaltma ağızlarının altından geçer, atığı çöp konteynerine boşaltır. Bant kotu ızgara boşaltma ağzından 0,15 m aşağıda ve konteyner üstünden en az 0,30 m yukarıda (firma standardı).',
    params: [
      { k: 'L', ad: 'Konveyör boyu (tambur eksenleri arası)', d: 4000, min: 500, max: 30000, grup: 'Konveyör' },
      { k: 'B', ad: 'Bant eni', d: 500, min: 300, max: 1400, grup: 'Konveyör' },
      { k: 'Hy', ad: 'Bant üstü — destek döşemesinden', d: 850, min: 200, max: 4000, grup: 'Konveyör' },
      { k: 'Ld', ad: 'Ayaklı boy (kuyruktan)', d: 4000, min: 0, max: 30000, grup: 'Konveyör' },
      { k: 'Dt', ad: 'Tambur çapı', d: 220, grup: 'Konveyör' },
      { k: 'Hs', ad: 'Yan sac (etek) yüksekliği', d: 150, grup: 'Konveyör' },
      { k: 'ms', ad: 'Motor tarafı (taşıma yönüne bakarken)', d: 'L', opts: [['L', 'Sol'], ['R', 'Sağ']], grup: 'Konveyör' },
      { k: 'W', ad: 'Şase dış eni', f: 'B+160', grup: 'Hesaplanan' },
    ],
    tipler: [{ ad: 'BANT KONVEYÖR 500', p: { L: 4000, B: 500, Hy: 850, Ld: 4000, Dt: 220, Hs: 150 } }],
    liste: q => `bant ${q.B} mm · boy ${(q.L / 1000).toFixed(2)} m · bant üstü +${(q.Hy / 1000).toFixed(2)} m`,
    bilgi: q => `Bant eni ${q.B} mm, boy ${q.L} mm, bant üstü destek döşemesinden ${q.Hy} mm; ${q.Ld} mm ayaklı, kalan ${Math.max(0, q.L - q.Ld)} mm konsol`,
    plan: (q, g) => {
      const L = m(q.L), w2 = m(q.W) / 2, b2 = m(q.B) / 2, r = m(q.Dt) / 2;
      g.dik(-w2, -r, w2, L + r, { lw: 35 }); g.dik(-b2, -r, b2, L + r, { lw: 13 });
      g.cizgi([-w2, 0], [w2, 0], { lw: 13 }); g.cizgi([-w2, L], [w2, L], { lw: 13 });
      const sm = q.ms === 'R' ? -1 : 1; g.dik(sm * w2, L - 0.20, sm * (w2 + 0.35), L + 0.10, { lw: 25 }); // motor
      g.cizgi([0, L * 0.25], [0, L * 0.6], { lw: 25 }); g.cizgi([0, L * 0.6], [0.08, L * 0.6 - 0.15], { lw: 25 }); g.cizgi([0, L * 0.6], [-0.08, L * 0.6 - 0.15], { lw: 25 });
      g.yazi([w2 + 0.1, L * 0.3], 'BANT KONVEYÖR', 0.10, 'L', 90);
    },
    mesh: (q, g) => {
      const L = m(q.L), w2 = m(q.W) / 2, b2 = m(q.B) / 2, r = m(q.Dt) / 2, H = m(q.Hy), hs = m(q.Hs), Ld = Math.min(m(q.Ld), L);
      for (const s of [-1, 1]) { g.kutu(s * b2, s * w2, -r, L + r, H - 2 * r - 0.06, H - 0.02, KCOL.frame); g.kutu(s * (b2 - 0.01), s * (b2 + 0.01), 0, L, H, H + hs, KCOL.frame); } // şase + etek
      g.kutu(-b2, b2, 0, L, H - 0.02, H, KCOL.belt); g.kutu(-b2, b2, 0, L, H - 2 * r + 0.02, H - 2 * r + 0.04, KCOL.belt);
      for (const y of [0, L]) g.silindir([-b2, y, H - r], [b2, y, H - r], r, KCOL.drum, 16);
      const sm = q.ms === 'R' ? -1 : 1; g.kutu(sm * w2, sm * (w2 + 0.35), L - 0.20, L + 0.10, H - 2 * r - 0.05, H + 0.15, KCOL.motor);
      const ys = []; if (Ld > 0.3) { const n = Math.max(1, Math.ceil((Ld - 0.4) / 2.5)); for (let k = 0; k <= n; k++) ys.push(0.2 + (Ld - 0.4) * k / n); }
      for (const y of ys) for (const s of [-1, 1]) g.kutu(s * w2 - (s > 0 ? 0.06 : 0), s * w2 + (s < 0 ? 0.06 : 0), y - 0.03, y + 0.03, 0, H - 2 * r - 0.06, KCOL.frame);
    },
    on: (q, g) => { const w2 = m(q.W) / 2, H = m(q.Hy), r = m(q.Dt) / 2; g.dik(-w2, H - 2 * r - 0.06, w2, H + m(q.Hs), { lw: 35 }); g.dik(-w2, 0, -w2 + 0.06, H - 2 * r - 0.06); g.dik(w2 - 0.06, 0, w2, H - 2 * r - 0.06); g.cizgi([-w2 - 0.5, 0], [w2 + 0.5, 0], { lw: 25 }); g.olcu([w2, 0], [w2, H], 'v', 0.3, `${q.Hy}`); },
    yan: (q, g) => { const L = m(q.L), H = m(q.Hy), r = m(q.Dt) / 2; g.dik(-r, H - 2 * r - 0.06, L + r, H + m(q.Hs), { lw: 35 }); g.daire([0, H - r], r); g.daire([L, H - r], r); g.cizgi([-0.5, 0], [Math.min(m(q.Ld), L) + 0.5, 0], { lw: 25 }); g.olcu([0, H + 0.3], [L, H + 0.3], 'h', 0.2, `${q.L}`); },
  });
  /* Çöp konteyneri: 1100 L belediye tipi (EN 840). Orijin = taban ortası; x = uzun kenar. */
  C.aileKaydet({
    id: 'cop_konteyner', ad: 'Çöp konteyneri — 1100 L (EN 840)', kisaAd: 'KONTEYNER', kat: 'Konteyner', katman: 'MEK_KONVEYOR', renk: 3, ifc: 'IfcFurnishingElement',
    aciklama: 'Izgara atığı için tekerlekli belediye tipi konteyner. Yüksekliği bant konveyörün kotunu belirler.',
    params: [
      { k: 'W', ad: 'Genişlik', d: 1370, grup: 'Konteyner' },
      { k: 'Dk', ad: 'Derinlik', d: 1070, grup: 'Konteyner' },
      { k: 'H', ad: 'Yükseklik (kapak üstü)', d: 1370, grup: 'Konteyner' },
      { k: 'V', ad: 'Hacim', birim: 'L', d: 1100, grup: 'Konteyner' },
    ],
    tipler: [{ ad: 'KONTEYNER 1100 L', p: { W: 1370, Dk: 1070, H: 1370, V: 1100 } }],
    liste: q => `${q.V} L · ${q.W}×${q.Dk}×${q.H} mm`,
    plan: (q, g) => { const w = m(q.W) / 2, d = m(q.Dk) / 2; g.dik(-w, -d, w, d, { lw: 35 }); g.cizgi([-w, -d], [w, d], { lw: 13, lt: 'DASHED' }); g.cizgi([-w, d], [w, -d], { lw: 13, lt: 'DASHED' }); g.yazi([-w, -d - 0.18], `ATIK KONTEYNERİ ${q.V} L`, 0.10); },
    mesh: (q, g) => {
      const w = m(q.W) / 2, d = m(q.Dk) / 2, H = m(q.H);
      g.kutu(-w + 0.04, w - 0.04, -d + 0.05, d - 0.05, 0.16, H - 0.08, KCOL.bin);
      g.kutu(-w, w, -d, d, H - 0.08, H, KCOL.lid);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) g.silindir([sx * (w - 0.15) - 0.03, sy * (d - 0.15), 0.08], [sx * (w - 0.15) + 0.03, sy * (d - 0.15), 0.08], 0.08, KCOL.wheel, 12);
    },
    on: (q, g) => { const w = m(q.W) / 2, H = m(q.H); g.dik(-w, 0.16, w, H, { lw: 35 }); g.olcu([w, 0], [w, H], 'v', 0.3, `${q.H}`); },
  });

  /* ================= KUM TUTUCU EKİPMANI: GEZER KÖPRÜ ve KUM SEPERATÖRÜ (Çokal AAT T-103) ================= */
  /* Gezer köprü: orijin = köprü ortası, ray (dış duvar üstü) kotunda; x = köprü açıklığı (havuz eni), y = yürüme yönü (havuz boyu).
     Üstünde göz başına bir kum pompası (emme borusu kum oluğuna iner), pergel vinç ve yürüme platformu. */
  const GCOL = { celik: [0.55, 0.60, 0.66], platform: [0.72, 0.74, 0.76], pompa: [0.18, 0.36, 0.62], boru: [0.80, 0.81, 0.83], vinc: [0.90, 0.72, 0.10], tank: [0.62, 0.66, 0.70], vana: [0.16, 0.30, 0.55], volan: [0.75, 0.12, 0.10], membran: [0.14, 0.14, 0.16], ray: [0.36, 0.38, 0.42] };
  C.aileKaydet({
    id: 'gezer_kopru', ad: 'Gezer köprü — kum tutucu (kum pompalı, yağ sıyırıcılı)', kisaAd: 'GEZER KÖPRÜ', kat: 'Köprü / sıyırıcı', katman: 'MEK_KOPRU', renk: 4, ifc: 'IfcTransportElement',
    aciklama: 'Havalandırmalı kum ve yağ tutucunun dış duvarları üstündeki raylarda yürür. Her gözde bir kum pompası kum oluğundan emer ve duvar üstündeki kum oluğuna basar; dönüşte yağ sıyırıcı yüzeydeki yağı sıyırma rampasına iter.',
    params: [
      { k: 'Ls', ad: 'Ray açıklığı (dış duvar eksenleri arası)', d: 3900, min: 1500, max: 20000, grup: 'Köprü' },
      { k: 'Bk', ad: 'Köprü eni (yürüme yönünde)', d: 1500, min: 800, max: 3000, grup: 'Köprü' },
      { k: 'N', ad: 'Kum pompası (göz) sayısı', d: 2, min: 1, max: 8, grup: 'Pompa' },
      { k: 'ap', ad: 'Pompa aralığı (göz eksen aralığı)', d: 1900, min: 500, grup: 'Pompa' },
      { k: 'Hp', ad: 'Emme derinliği (raydan kum oluğu dibine)', d: 3460, min: 500, max: 12000, grup: 'Pompa' },
      { k: 'kh', ad: 'Korkuluk yüksekliği', d: 1100, grup: 'Köprü' },
      { k: 'hk', ad: 'Köprü yükseltmesi (ray üstü → kiriş altı payı)', d: 350, min: 0, max: 3000, grup: 'Köprü' },
      { k: 'xo', ad: 'Kum oluğu ekseni (raydan dışarı, −x ucunda)', d: 400, min: 0, max: 3000, grup: 'Pompa' },
      { k: 'zo', ad: 'Basma borusu ağzı (ray kotundan aşağı)', d: 400, min: 0, max: 3000, grup: 'Pompa' },
    ],
    tipler: [{ ad: 'GEZER KÖPRÜ — 2 gözlü', p: { Ls: 3900, Bk: 1500, N: 2, ap: 1900, Hp: 3460, kh: 1100, hk: 350, xo: 400, zo: 400 } }],
    liste: q => `açıklık ${(q.Ls / 1000).toFixed(2)} m · ${q.N} kum pompası · emme ${(q.Hp / 1000).toFixed(2)} m`,
    bilgi: q => `Ray açıklığı ${q.Ls} mm, köprü eni ${q.Bk} mm, ${q.N} kum pompası (aralık ${q.ap} mm), emme derinliği ${q.Hp} mm`,
    plan: (q, g) => {
      const l2 = m(q.Ls) / 2 + 0.20, b2 = m(q.Bk) / 2, N = Math.max(1, Math.round(q.N)), ap = m(q.ap);
      g.dik(-l2, -b2, l2, b2, { lw: 35 }); g.cizgi([-l2, -b2], [l2, b2], { lw: 13, lt: 'DASHED' }); g.cizgi([-l2, b2], [l2, -b2], { lw: 13, lt: 'DASHED' });
      for (let i = 0; i < N; i++) g.daire([(i - (N - 1) / 2) * ap, 0], 0.16);
      g.yazi([-l2, b2 + 0.12], 'GEZER KÖPRÜ', 0.12);
    },
    mesh: (q, g) => {
      const l2 = m(q.Ls) / 2, b2 = m(q.Bk) / 2, N = Math.max(1, Math.round(q.N)), ap = m(q.ap), Hp = m(q.Hp), kh = m(q.kh), hk = m(q.hk || 0), zd = 0.40 + hk; // hk: kirişler alttaki yürüme yolu korkuluğunun üstünden geçsin
      for (const sx of [-1, 1]) { g.kutu(sx * l2 - 0.15, sx * l2 + 0.15, -b2 - 0.15, b2 + 0.15, 0.10, 0.36, GCOL.celik); // uç arabaları
        if (hk > 0.01) for (const sy of [-1, 1]) g.kutu(sx * l2 - 0.06, sx * l2 + 0.06, sy * b2 - 0.06, sy * b2 + 0.06, 0.36, 0.16 + hk, GCOL.celik); // ayaklar
        for (const sy of [-1, 1]) g.silindir([sx * l2 - 0.05, sy * b2, 0.10], [sx * l2 + 0.05, sy * b2, 0.10], 0.10, GCOL.boru, 14); // tekerler
        g.kutu(sx * l2 - 0.12, sx * l2 + 0.12, -0.20, 0.20, 0.36, 0.62, GCOL.pompa); } // yürüyüş motorları
      for (const sy of [-1, 1]) g.kutu(-l2, l2, sy * b2 - 0.06, sy * b2 + 0.06, 0.16 + hk, zd, GCOL.celik); // ana kirişler
      g.kutu(-l2, l2, -b2, b2, zd, zd + 0.04, GCOL.platform); // yürüme platformu
      for (const sy of [-1, 1]) { g.kutu(-l2, l2, sy * b2 - 0.02, sy * b2 + 0.02, zd + kh - 0.04, zd + kh, GCOL.celik); g.kutu(-l2, l2, sy * b2 - 0.015, sy * b2 + 0.015, zd + kh / 2 - 0.015, zd + kh / 2 + 0.015, GCOL.celik);
        const n = Math.max(2, Math.ceil(2 * l2 / 1.5)); for (let k = 0; k <= n; k++) { const x = -l2 + 2 * l2 * k / n; g.kutu(x - 0.02, x + 0.02, sy * b2 - 0.02, sy * b2 + 0.02, zd + 0.04, zd + kh, GCOL.celik); } }
      for (let i = 0; i < N; i++) { const x = (i - (N - 1) / 2) * ap; // kum pompaları: motor platformda, emme borusu oluğa iner
        g.silindir([x, 0, zd + 0.04], [x, 0, zd + 0.60], 0.16, GCOL.pompa, 16); g.silindir([x, 0, zd + 0.04], [x, 0, -Hp + 0.45], 0.05, GCOL.boru, 12);
        g.silindir([x, 0, -Hp + 0.45], [x, 0, -Hp + 0.10], 0.14, GCOL.pompa, 16);
        const yb = 0.22 + i * 0.14, xk = -l2 - m(q.xo == null ? 400 : q.xo), zb = zd + 0.30; // basma borusu: pompadan köprü boyunca kum oluğu tarafındaki uca (−x), dirsekle aşağı oluğa
        g.silindir([x, 0, zb], [x, yb, zb], 0.04, GCOL.boru, 10); g.silindir([x, yb, zb], [xk, yb, zb], 0.04, GCOL.boru, 10); g.silindir([xk, yb, zb + 0.04], [xk, yb, -m(q.zo == null ? 400 : q.zo)], 0.04, GCOL.boru, 10); }
      const vx = l2 - 0.45, vy = b2 - 0.25; g.silindir([vx, vy, zd + 0.04], [vx, vy, zd + 2.20], 0.07, GCOL.vinc, 12); g.kutu(vx - 1.20, vx + 0.07, vy - 0.05, vy + 0.05, zd + 2.10, zd + 2.22, GCOL.vinc); // pergel vinç
    },
    on: (q, g) => { const l2 = m(q.Ls) / 2, kh = m(q.kh), hk = m(q.hk || 0); g.dik(-l2 - 0.15, 0.10, l2 + 0.15, 0.36, { lw: 35 }); g.dik(-l2, 0.16 + hk, l2, 0.44 + hk, { lw: 35 }); g.dik(-l2, 0.44 + hk, l2, 0.44 + hk + kh, { lw: 13 }); const N = Math.max(1, Math.round(q.N)); for (let i = 0; i < N; i++) { const x = (i - (N - 1) / 2) * m(q.ap); g.cizgi([x, 0.44], [x, -m(q.Hp) + 0.10], { lw: 25 }); } g.olcu([-l2, 0.44 + kh + 0.3], [l2, 0.44 + kh + 0.3], 'h', 0.2, `${q.Ls}`); },
  });
  /* boru yolu (aile içi): köşelerde R yarıçaplı dirsek (yaklaşık yay), parçalar silindirle; pts yerel, r boru yarıçapı */
  const boruYol = (g, pts, r, col, R) => {
    const P = [pts[0]];
    for (let i = 1; i + 1 < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1], u = M.norm(M.sub(a, b)), v = M.norm(M.sub(c, b)), th = Math.acos(Math.max(-1, Math.min(1, M.dot(u, v)))); // iki kol arası açı
      const t = Math.min(R / Math.tan(th / 2), M.len(M.sub(a, b)) * 0.45, M.len(M.sub(c, b)) * 0.45);
      if (!(th > 0.05 && th < Math.PI - 0.02) || !(t > 1e-4)) { P.push(b); continue; }
      const A = M.add(b, M.mul(u, t)), B = M.add(b, M.mul(v, t)), n = 6;
      for (let k = 0; k <= n; k++) { const s = k / n; P.push(M.add(M.mul(A, (1 - s) * (1 - s)), M.add(M.mul(b, 2 * s * (1 - s)), M.mul(B, s * s)))); } // ikinci derece Bezier ≈ dirsek
    }
    P.push(pts[pts.length - 1]);
    for (let i = 1; i < P.length; i++) g.silindir(P[i - 1], P[i], r, col, 12);
  };
  const DNOD = { 15: 21.3, 20: 26.7, 25: 33.4, 32: 42.2, 40: 48.3, 50: 60.3, 65: 73.0, 80: 88.9, 100: 114.3, 125: 141.3, 150: 168.3, 200: 219.1 }; // paslanmaz (ASME B36.19) dış çaplar
  /* Difüzör düşümü (kum tutucu havalandırması; Çokal T-103 F-F kesiti): orijin = hava başlığı (ana boru) ekseni üzerinde T'nin merkezi;
     x = başlıktan göze doğru (yatay, duvardan uzaklaşan), y = başlık / difüzör yönü, z yukarı.
     Başlıktan yatay kol (izolasyon vanası bu kolda, volan yukarı), dirsek, düşey iniş; yürüme yolu çıkmasının altında 45° ile duvara yaklaşır,
     duvar yüzünde iki kelepçeyle tutulan düşey parça ve ucunda T'li boru difüzör takımı (kum tarafı dolgusunun duvar dibindeki köşesinin hemen üstünde).
     Çokal: başlık DN50 duvardan 0,20; kol 0,266; iniş yürüme yolu üstünden 0,375 aşağıda 45° kırılır (0,43); difüzör duvardan 0,036, 96,50; takım 2,05 m. */
  const dusumYol = q => { const a = m(q.a), H = m(q.H), h1 = Math.min(m(q.h1), H), j = Math.min(m(q.j), Math.max(0, H - h1)), P = [[0, 0, 0], [a, 0, 0]]; if (h1 > 1e-3 && j > 1e-3) P.push([a, 0, -h1], [a - j, 0, -h1 - j]); P.push([a - j, 0, -H]); return P; };
  C.dusumYol = dusumYol;
  C.aileKaydet({
    id: 'difuzor_dusumu', ad: 'Difüzör düşümü — izolasyon vanalı (kum tutucu havalandırması)', kisaAd: 'DİFÜZÖR DÜŞÜMÜ', kat: 'Havalandırma', katman: 'MEK_HAVA', renk: 5, ifc: 'IfcFlowTerminal',
    aciklama: "Yürüme yolu üstündeki hava başlığından ayrılan düşüm: izolasyon vanası yürüme yolu kotunda yatay kolda, düşüm borusu yürüme yolu çıkmasının dışından iner, 45° ile duvara yaklaşıp duvar yüzünde kelepçelerle tutulur; ucundaki T'li boru difüzör takımı kum tarafı dolgusunun duvar dibindeki köşesinde hava verir (Çokal T-103 F-F).",
    params: [
      { k: 'H', ad: 'Düşüm boyu (başlık ekseni → difüzör ekseni)', d: 2017, min: 300, max: 12000, grup: 'Düşüm' },
      { k: 'a', ad: 'Yatay kol (başlık ekseni → iniş ekseni)', d: 266, min: 0, max: 2000, grup: 'Düşüm' },
      { k: 'h1', ad: 'Düz iniş (başlık ekseni → 45° kırılma)', d: 592, min: 0, max: 12000, grup: 'Düşüm' },
      { k: 'j', ad: '45° kırılmanın yatay kayması (duvara doğru)', d: 430, min: 0, max: 2000, grup: 'Düşüm' },
      { k: 'xw', ad: 'Duvar yüzü (başlık ekseninden, + göze doğru)', d: -200, min: -2000, max: 2000, grup: 'Düşüm' },
      { k: 'DN', ad: 'Düşüm borusu anma çapı', d: 32, grup: 'Düşüm' },
      { k: 'av', ad: 'Vana ekseni (başlıktan yatay)', d: 130, grup: 'Düşüm' },
      { k: 'Ld', ad: 'Difüzör takımı boyu', d: 2050, min: 200, max: 6000, grup: 'Difüzör' },
    ],
    tipler: [{ ad: 'DİFÜZÖR DÜŞÜMÜ DN32', p: { H: 2017, a: 266, h1: 592, j: 430, xw: -200, DN: 32, av: 130, Ld: 2050 } }],
    liste: q => `DN${q.DN} · izolasyon vanalı · düşüm ${(q.H / 1000).toFixed(2)} m · difüzör takımı ${q.Ld} mm`,
    plan: (q, g) => { const P = dusumYol(q), l2 = m(q.Ld) / 2, xd = P[P.length - 1][0], av = m(q.av);
      g.cizgi([0, 0], [m(q.a), 0], { lw: 35 }); if (Math.abs(xd - m(q.a)) > 1e-3) g.cizgi([m(q.a), 0], [xd, 0], { lw: 25, lt: 'DASHED' });
      g.cok([[av - 0.05, -0.04], [av + 0.05, 0.04], [av + 0.05, -0.04], [av - 0.05, 0.04]], true, { lw: 25 }); // vana (papyon)
      g.cizgi([xd, -l2], [xd, l2], { lw: 50, lt: 'DASHED' }); g.dik(xd - 0.03, -0.09, xd + 0.03, 0.09, { lw: 25 }); }, // difüzör takımı (T ortada)
    mesh: (q, g) => {
      const P = dusumYol(q), r = (DNOD[q.DN] || q.DN + 10) / 2000, H = m(q.H), l2 = m(q.Ld) / 2, av = m(q.av), xd = P[P.length - 1][0], xw = m(q.xw);
      boruYol(g, P, r, GCOL.boru, 0.05);
      // izolasyon (sürgülü) vanası: flanşlı gövde kolda, kapak ve mil yukarı, volan
      g.silindir([av - 0.06, 0, 0], [av - 0.05, 0, 0], r + 0.035, GCOL.boru, 14); g.silindir([av + 0.05, 0, 0], [av + 0.06, 0, 0], r + 0.035, GCOL.boru, 14);
      g.silindir([av - 0.05, 0, 0], [av + 0.05, 0, 0], r + 0.02, GCOL.vana, 14); g.kutu(av - 0.035, av + 0.035, -0.03, 0.03, 0, 0.12, GCOL.vana);
      g.silindir([av, 0, 0.12], [av, 0, 0.21], 0.006, GCOL.boru, 6); g.silindir([av, 0, 0.21], [av, 0, 0.225], 0.07, GCOL.volan, 16);
      // duvar kelepçeleri: düşey son parçada, difüzörün 0,12 üstünde ve 45° kırılmanın hemen altında (duvar yüzüne kadar lama)
      const zs = [-H + 0.12]; if (P.length > 3) zs.push(P[3][2] - 0.07);
      for (const z of zs) { g.kutu(Math.min(xd, xw), Math.max(xd, xw), -0.02, 0.02, z - 0.004, z + 0.004, GCOL.celik); g.silindir([xd, 0, z - 0.012], [xd, 0, z + 0.012], r + 0.005, GCOL.celik, 12); }
      // boru difüzör takımı: ortada T, iki yanda membran borular, uç tapaları
      g.silindir([xd, -0.087, -H], [xd, 0.087, -H], 0.03, GCOL.boru, 14);
      for (const s of [-1, 1]) { g.silindir([xd, s * 0.087, -H], [xd, s * (l2 - 0.02), -H], 0.032, GCOL.membran, 14); g.silindir([xd, s * (l2 - 0.02), -H], [xd, s * l2, -H], 0.036, GCOL.boru, 14); }
    },
    on: (q, g) => { const P = dusumYol(q), H = m(q.H); for (let i = 1; i < P.length; i++) g.cizgi([P[i - 1][0], P[i - 1][2]], [P[i][0], P[i][2]], { lw: 35 }); const xd = P[P.length - 1][0]; g.daire([xd, -H], 0.032); g.olcu([m(q.a) + 0.2, 0], [m(q.a) + 0.2, -H], 'v', 0.2, `${q.H}`); },
    yan: (q, g) => { const H = m(q.H), l2 = m(q.Ld) / 2; g.cizgi([0, 0], [0, -H], { lw: 35 }); g.dik(-l2, -H - 0.032, l2, -H + 0.032, { lw: 25 }); },
  });
  /* Gezer köprü rayı: orijin = rayın başı, ray ekseni üstünde, duvar üstü kotunda; y = ray boyunca (köprünün yürüme yönü).
     Ayrı malzeme / ayrı kalem (betonun parçası değil): 60 × 70 mm ray, altında sürekli taban lamı. */
  C.aileKaydet({
    id: 'kopru_rayi', ad: 'Gezer köprü rayı (duvar üstü)', kisaAd: 'KÖPRÜ RAYI', kat: 'Köprü / sıyırıcı', katman: 'MEK_KOPRU', renk: 4, ifc: 'IfcRail',
    aciklama: 'Kum tutucunun dış duvarları üstünde gezer köprünün yürüdüğü çelik ray. Boy duvar üstündeki göz uzunluğundan gelir; ray betondan ayrı kalemdir.',
    params: [
      { k: 'L', ad: 'Ray boyu', d: 13250, min: 500, max: 200000, grup: 'Ray' },
      { k: 'B', ad: 'Ray eni', d: 60, grup: 'Ray' },
      { k: 'H', ad: 'Ray yüksekliği', d: 70, grup: 'Ray' },
      { k: 'Bt', ad: 'Taban lamı eni', d: 150, grup: 'Ray' },
      { k: 'tt', ad: 'Taban lamı kalınlığı', d: 10, grup: 'Ray' },
    ],
    tipler: [{ ad: 'KÖPRÜ RAYI 60×70', p: { L: 13250, B: 60, H: 70, Bt: 150, tt: 10 } }],
    liste: q => `${(q.L / 1000).toFixed(2)} m · ${q.B}×${q.H} mm`,
    bilgi: q => `Ray boyu ${q.L} mm, kesit ${q.B} × ${q.H} mm, taban lamı ${q.Bt} × ${q.tt} mm`,
    etiketYer: q => [0.25, m(q.L) / 2, 0],
    plan: (q, g) => { const L = m(q.L), b = m(q.B) / 2; g.dik(-b, 0, b, L, { lw: 25 }); g.cizgi([0, 0], [0, L], { lw: 13, lt: 'CENTER' }); },
    mesh: (q, g) => { const L = m(q.L), b = m(q.B) / 2, bt = m(q.Bt) / 2, tt = m(q.tt); g.kutu(-bt, bt, 0, L, 0, tt, GCOL.celik); g.kutu(-b, b, 0, L, tt, tt + m(q.H), GCOL.ray); },
    on: (q, g) => { const b = m(q.B) / 2, bt = m(q.Bt) / 2, tt = m(q.tt); g.dik(-bt, 0, bt, tt, { lw: 25 }); g.dik(-b, tt, b, tt + m(q.H), { lw: 35 }); },
  });
  /* Boru mesnedi: orijin = mesnedin oturduğu yüzey (zemin ayağında döşeme üstü, konsolda duvar yüzü), boru ekseni y boyunca.
     AYAK  : döşeme / duvar üstüne dübelli taban levhası, iki dikme, üstte başlık ve U civata (Çokal F-F: hava başlığı, yürüme yolu üstünde 0,187 m).
     KONSOL: duvar yüzüne levhayla bağlı yatay köşebent (x = duvardan dışarı), ucunda U civata (Çokal I-I: yağ borusu, 0,52 m). */
  C.aileKaydet({
    id: 'boru_mesnet', ad: 'Boru mesnedi — zemin ayağı / duvar konsolu', kisaAd: 'BORU MESNEDİ', kat: 'Boru', katman: 'MEK_MESNET', renk: 8, ifc: 'IfcPipeFitting',
    aciklama: 'Hava ve proses borularını taşıyan galvaniz çelik mesnet. AYAK: döşeme ya da duvar üstünde, boru altı yüksekliği H. KONSOL: duvar yüzünden çıkan köşebent, boyu Lk, boru konsolun üstünde.',
    params: [
      { k: 'tip', ad: 'Mesnet tipi', d: 'AYAK', birim: '', opts: [['AYAK', 'Zemin ayağı'], ['KONSOL', 'Duvar konsolu']], grup: 'Mesnet' },
      { k: 'H', ad: 'Boru altı yüksekliği (ayakta tabandan, konsolda kol üstünden)', d: 187, min: 0, max: 3000, grup: 'Mesnet' },
      { k: 'Lk', ad: 'Konsol boyu (duvardan)', d: 520, min: 100, max: 3000, grup: 'Mesnet' },
      { k: 'D', ad: 'Boru dış çapı', d: 60, min: 10, max: 1200, grup: 'Mesnet' },
      { k: 'B', ad: 'Başlık eni (boruya dik)', d: 210, grup: 'Mesnet' },
    ],
    tipler: [{ ad: 'MESNET AYAK', p: { tip: 'AYAK', H: 187, Lk: 520, D: 60, B: 210 } }],
    liste: q => q.tip === 'KONSOL' ? `duvar konsolu ${q.Lk} mm · Ø${q.D}` : `zemin ayağı h=${q.H} mm · Ø${q.D}`,
    etiketYer: () => [0, -0.3, 0],
    plan: (q, g) => { if (q.tip === 'KONSOL') g.dik(0, -0.025, m(q.Lk), 0.025, { lw: 25 }); else { const b = m(q.B) / 2; g.dik(-b, -0.05, b, 0.05, { lw: 25 }); } },
    mesh: (q, g) => {
      const r = m(q.D) / 2, c = GCOL.celik;
      if (q.tip === 'KONSOL') { const L = m(q.Lk), H = m(q.H), xc = L - Math.max(0.06, r + 0.02); // duvar levhası, köşebent (yatay kol + düşey kanat), boru konsol ucunda
        g.kutu(0, 0.01, -0.08, 0.08, -0.12, 0.04, c); g.kutu(0, L, -0.025, 0.025, -0.005, 0, c); g.kutu(0, L, -0.025, -0.02, -0.05, 0, c);
        g.silindir([xc, -0.006, H + r], [xc, 0.006, H + r], r + 0.006, c, 14); return; }
      const H = m(q.H), b = m(q.B) / 2, hb = Math.min(0.095, H * 0.5); // AYAK
      g.kutu(-0.082, 0.082, -0.05, 0.05, 0, 0.01, c); for (const s of [-1, 1]) g.kutu(s * 0.046 - 0.004, s * 0.046 + 0.004, -0.03, 0.03, 0.01, H - hb, c);
      g.kutu(-b, b, -0.04, 0.04, H - hb, H, c); g.silindir([0, -0.006, H + r], [0, 0.006, H + r], r + 0.006, c, 14);
    },
    on: (q, g) => { if (q.tip === 'KONSOL') g.dik(0, -0.05, m(q.Lk), 0, { lw: 25 }); else { const b = m(q.B) / 2, H = m(q.H); g.dik(-b, H - 0.095, b, H, { lw: 25 }); g.dik(-0.05, 0, 0.05, H - 0.095, { lw: 18 }); } },
  });
  /* Duvar geçiş parçası (DGP): orijin = duvarın ortasında boru ekseni; x = boru ekseni (duvara dik). Kılıf boru + ortada su tutucu flanş (beton içinde),
     iki yüzde bağlantı flanşı. Boru deliği DGP ile kapanır (açık delik kalmaz). */
  C.aileKaydet({
    id: 'duvar_gecis', ad: 'Duvar geçiş parçası — su tutucu flanşlı', kisaAd: 'DUVAR GEÇİŞ PARÇASI', kat: 'Boru', katman: 'MEK_BORU', renk: 8, ifc: 'IfcPipeFitting',
    aciklama: 'Betonarme duvardan geçen borunun duvarla birlikte dökülen geçiş parçası: kılıf boru, ortada su tutucu (puddle) flanş, iki yüzde bağlantı flanşı. Duvar kalınlığı Lw.',
    params: [
      { k: 'D', ad: 'Boru dış çapı', d: 168, min: 20, max: 2000, grup: 'DGP' },
      { k: 'Lw', ad: 'Duvar kalınlığı', d: 400, min: 100, max: 2000, grup: 'DGP' },
      { k: 'DN', ad: 'Anma çapı', d: 150, grup: 'DGP' },
    ],
    tipler: [{ ad: 'DGP DN150', p: { D: 168, Lw: 400, DN: 150 } }],
    liste: q => `DN${q.DN} · duvar ${q.Lw} mm`,
    etiketYer: q => [0, -m(q.D) / 2 - 0.25, 0],
    plan: (q, g) => { const r = m(q.D) / 2 + 0.005, l = m(q.Lw) / 2 + 0.02, rf = r + 0.05; g.dik(-l, -r, l, r, { lw: 25 }); for (const s of [-1, 1]) g.dik(s * l - 0.01, -rf, s * l + 0.01, rf, { lw: 25 }); },
    mesh: (q, g) => { const r = m(q.D) / 2 + 0.005, l = m(q.Lw) / 2, rf = r + 0.05, c = GCOL.boru;
      g.silindir([-l - 0.02, 0, 0], [l + 0.02, 0, 0], r, c, 20); g.silindir([-0.005, 0, 0], [0.005, 0, 0], r + 0.08, c, 20);
      for (const s of [-1, 1]) g.silindir([s * (l + 0.02) - 0.01, 0, 0], [s * (l + 0.02) + 0.01, 0, 0], rf, c, 20); },
    on: (q, g) => { const r = m(q.D) / 2 + 0.005, l = m(q.Lw) / 2; g.dik(-l - 0.02, -r, l + 0.02, r, { lw: 25 }); g.dik(-0.005, -r - 0.08, 0.005, r + 0.08, { lw: 18 }); },
  });
  /* Kum seperatörü (kum yıkama / sınıflandırıcı): orijin = taban ortası; x = vida ekseni yönü (boşaltma +x ucunda). */
  C.aileKaydet({
    id: 'kum_seperatoru', ad: 'Kum seperatörü — vidalı sınıflandırıcı', kisaAd: 'KUM SEPERATÖRÜ', kat: 'Kum ekipmanı', katman: 'MEK_KOPRU', renk: 4, ifc: 'IfcFlowTreatmentDevice',
    aciklama: 'Kum pompalarının bastığı kum – su karışımı duvar üstündeki oluktan seperatöre akar; kum eğik vidayla yukarı taşınıp konteynere boşalır, su süzüntü hattına döner.',
    params: [
      { k: 'L', ad: 'Boy (vida ekseni izdüşümü)', d: 3200, min: 1500, max: 8000, grup: 'Seperatör' },
      { k: 'W', ad: 'Hazne eni', d: 1300, min: 600, max: 3000, grup: 'Seperatör' },
      { k: 'H', ad: 'Yükseklik (boşaltma ağzı)', d: 2300, min: 1000, max: 5000, grup: 'Seperatör' },
    ],
    tipler: [{ ad: 'KUM SEPERATÖRÜ', p: { L: 3200, W: 1300, H: 2300 } }],
    liste: q => `${q.L}×${q.W} mm · boşaltma +${(q.H / 1000).toFixed(2)} m`,
    plan: (q, g) => { const L = m(q.L), w2 = m(q.W) / 2; g.dik(-L / 2, -w2, -L / 2 + 1.5, w2, { lw: 35 }); g.dik(-L / 2 + 1.5, -0.22, L / 2, 0.22, { lw: 25 }); g.yazi([-L / 2, -w2 - 0.18], 'KUM SEPERATÖRÜ', 0.10); },
    mesh: (q, g) => {
      const L = m(q.L), w2 = m(q.W) / 2, H = m(q.H), x0 = -L / 2, xh = x0 + 1.5, zh = Math.min(H - 0.5, 1.9);
      for (const sx of [x0 + 0.08, xh - 0.08]) for (const sy of [-1, 1]) g.kutu(sx - 0.04, sx + 0.04, sy * w2 - (sy > 0 ? 0.08 : 0), sy * w2 + (sy < 0 ? 0.08 : 0), 0, zh - 0.9, GCOL.celik); // ayaklar
      g.kutu(x0, xh, -w2, w2, zh - 0.9, zh, GCOL.tank); // üst hazne
      g.kutu(x0 + 0.35, xh - 0.35, -w2 + 0.35, w2 - 0.35, zh - 1.45, zh - 0.9, GCOL.tank); // konik alt (basitleştirilmiş)
      g.silindir([x0 + 0.75, 0, zh - 1.35], [L / 2 - 0.15, 0, H], 0.18, GCOL.boru, 16); // eğik vida gövdesi
      g.kutu(L / 2 - 0.35, L / 2 + 0.05, -0.20, 0.20, H - 0.10, H + 0.35, GCOL.pompa); // tahrik
      g.kutu(L / 2 - 0.45, L / 2 - 0.15, -0.15, 0.15, H - 0.75, H - 0.20, GCOL.celik); // boşaltma ağzı
    },
    on: (q, g) => { const w2 = m(q.W) / 2, H = m(q.H); g.dik(-w2, 0.5, w2, Math.min(H - 0.5, 1.9), { lw: 35 }); g.olcu([w2, 0], [w2, H], 'v', 0.3, `${q.H}`); },
  });

  /* ================= MEKANİK KABA IZGARA (izgara.js geometrisi) ================= */
  C.aileKaydet({
    id: 'kaba_izgara', ad: 'Mekanik kaba ızgara — eğimli, zincirli tırmıklı', kisaAd: 'MEKANİK KABA IZGARA', kat: 'Izgara', katman: 'ARI_IZGARA', renk: 4, ifc: 'IfcFlowTreatmentDevice',
    vekilTip: 'izgara',
    aciklama: 'Kanal genişliği B ve derinliği D kanala uydurulur; çerçeve genişliği, toplam yükseklik, deşarj ağzı ve çubuk sayısı formüllerle hesaplanır. Varsayılanlar üretici çiziminden (02-FF-010102010301): 500 mm kanal, 75°, 10/20 mm.',
    params: [
      { k: 'B', ad: 'Kanal / ızgara net genişliği', d: 500, min: 200, max: 3000, grup: 'Kanal' },
      { k: 'D', ad: 'Kanal derinliği (taban → platform)', d: 5400, min: 500, max: 15000, grup: 'Kanal' },
      { k: 'a', ad: 'Eğim açısı (yataydan)', birim: '°', d: 75, min: 45, max: 90, grup: 'Izgara' },
      { k: 'bt', ad: 'Çubuk kalınlığı', d: 10, grup: 'Izgara' },
      { k: 'bg', ad: 'Çubuk açıklığı', d: 20, grup: 'Izgara' },
      { k: 'Lr', ad: 'Izgara boyu (eğim boyunca)', d: 1000, grup: 'Izgara' },
      { k: 'cer', ad: 'Çerçeve payı (her yan)', d: 65, grup: 'Çerçeve ve kafa' },
      { k: 'dd', ad: 'Çerçeve derinliği', d: 354, grup: 'Çerçeve ve kafa' },
      { k: 'ust', ad: 'Kafa üstü — platformdan', d: 1545, grup: 'Çerçeve ve kafa' },
      { k: 'hdU', ad: 'Deşarj ağzı — platformdan', d: 215, grup: 'Çerçeve ve kafa' },
      { k: 'Lh', ad: 'Tahrik kafası boyu', d: 3450, grup: 'Çerçeve ve kafa' },
      { k: 'ol', ad: 'Deşarj oluğu boyu (arka yüzden)', d: 950, min: 650, max: 3000, grup: 'Çerçeve ve kafa' },
      { k: 'ms', ad: 'Motor tarafı (akışa bakarken)', d: 'L', opts: [['L', 'Sol'], ['R', 'Sağ']], grup: 'Çerçeve ve kafa' },
      { k: 'W', ad: 'Çerçeve dış genişliği', f: 'B+2*cer', grup: 'Hesaplanan' },
      { k: 'Ht', ad: 'Toplam yükseklik (tabandan)', f: 'D+max(ust, hdU+1290)', fAcik: 'kafa, deşarj kaputunu taşıyacak kadar yükselir (deşarj ağzı + 1,29 m)', grup: 'Hesaplanan' },
      { k: 'hd', ad: 'Deşarj ağzı yüksekliği (tabandan)', f: 'D+hdU', grup: 'Hesaplanan' },
      { k: 'nB', ad: 'Çubuk sayısı', birim: 'adet', f: 'floor((B+bg)/(bt+bg))', grup: 'Hesaplanan' },
      { k: 'Le', ad: 'Eğim boyu', f: q => Math.round((q.D + Math.max(q.ust, q.hdU + 1290)) / Math.sin(q.a * Math.PI / 180)), fAcik: 'Ht / sin(a)', grup: 'Hesaplanan' },
    ],
    tipler: [{ ad: 'KABA IZGARA 500 / 10-20 / 75°', p: { B: 500, D: 5400, a: 75, bt: 10, bg: 20, Lr: 1000, cer: 65, dd: 354, ust: 1545, hdU: 215, Lh: 3450, ms: 'L' } }],
    uydur: { gen: 'B', der: 'D' },
    vekil: q => ({ a: q.a, H: q.Ht / 1000, b: q.B / 1000, W: q.W / 1000, d: q.dd / 1000, bt: q.bt, bg: q.bg, Lr: q.Lr / 1000, Lh: q.Lh / 1000, hd: q.hd / 1000, ms: q.ms, ol: (q.ol || 950) / 1000 }),
    liste: q => `B ${q.B} mm · ${q.bt}/${q.bg} mm (${q.nB} çubuk) · ${q.a}° · Ht ${q.Ht} · deşarj +${(q.hd / 1000).toFixed(2)}`,
    bilgi: q => `Çerçeve ${q.W} mm, toplam yükseklik ${q.Ht} mm (eğim boyu ${Math.round(q.Le)} mm), deşarj ağzı tabandan ${q.hd} mm, ${q.nB} çubuk (${q.bt}/${q.bg} mm)`,
    tutamac: [
      { k: 'B', yer: q => [q.B / 2000, 0.3, 0.5], eksen: [1, 0, 0], merkez: [0.5, 0, 0], adim: 10 },
      { k: 'B', yer: q => [-q.B / 2000, 0.3, 0.5], eksen: [-1, 0, 0], merkez: [-0.5, 0, 0], adim: 10 },
      { k: 'D', yer: q => [0, q.D / 1000 / Math.tan(q.a * Math.PI / 180), q.D / 1000], eksen: [0, 0, 1], adim: 10 },
    ],
    plan: () => { },
    on: (q, g) => {
      const b2 = q.B / 2000, w2 = q.W / 2000, D = q.D / 1000, Ht = q.Ht / 1000, Lh = q.Lh / 1000 * Math.sin(q.a * Math.PI / 180), hd = q.hd / 1000;
      for (const s of [-1, 1]) { g.cok([[s * b2, -0.3], [s * b2, D], [s * (b2 + 0.9), D]], false, { lw: 25 }); }
      g.cizgi([-(b2 + 0.9), 0], [b2 + 0.9, 0], { lw: 25 });
      g.dik(-w2, 0, w2, Ht - Lh, { lw: 35 }); g.dik(-w2 - 0.06, Ht - Lh, w2 + 0.06, Ht, { lw: 35 });
      const pitch = (q.bt + q.bg) / 1000, x0 = -((q.nB - 1) * pitch) / 2, zr = q.Lr / 1000 * Math.sin(q.a * Math.PI / 180), st = Math.max(1, Math.floor(q.nB / 25));
      for (let i = 0; i < q.nB; i += st) g.cizgi([x0 + i * pitch, 0.02], [x0 + i * pitch, zr], { lw: 9 });
      g.dik(-b2, hd, b2, hd + 0.35, { lt: 'DASHED', lw: 13 }); g.yazi([w2 + 0.1, hd + 0.1], 'deşarj', 0.09);
      const sg = q.ms === 'R' ? -1 : 1; g.dik(sg * (w2 + 0.06), Ht - 0.95, sg * (w2 + 0.32), Ht - 0.35);
      g.olcu([-b2, 0], [b2, 0], 'h', -0.35, `B = ${q.B}`); g.olcu([-w2, 0], [w2, 0], 'h', -0.65, `${q.W}`);
      g.olcu([w2 + 0.4, 0], [w2 + 0.4, D], 'v', 0.3, `D = ${q.D}`); g.olcu([w2 + 0.4, 0], [w2 + 0.4, Ht], 'v', 0.7, `${q.Ht}`);
      g.yazi([-(w2 + 0.1), Ht + 0.15], `MEKANİK KABA IZGARA B=${q.B}`, 0.12, 'R');
    },
    yan: (q, g) => {
      const a = q.a * Math.PI / 180, D = q.D / 1000, Ht = q.Ht / 1000, d = q.dd / 1000, Le = Ht / Math.sin(a), ca = Math.cos(a), sa = Math.sin(a), Lh = q.Lh / 1000;
      const P2 = (s, o) => [s * ca + o * sa, s * sa - o * ca];
      g.cok([P2(0, 0), P2(Le, 0), P2(Le, d), P2(0, d)], true, { lw: 35 });
      g.cok([P2(Le - Lh, -0.03), P2(Le, -0.03), P2(Le, d + 0.03), P2(Le - Lh, d + 0.03)], true, { lw: 25 });
      g.cizgi(P2(0.02, -0.01), P2(q.Lr / 1000, -0.01), { lw: 25 });
      const hd = q.hd / 1000, yb = hd / Math.tan(a) + d / sa; const ol = (q.ol || 950) / 1000; g.cok([[yb, hd + 0.25], [yb + ol, hd + 0.25], [yb + ol, hd], [yb + ol - 0.60, hd]], false, { lw: 25 }); g.yazi([yb + ol + 0.05, hd + 0.05], 'deşarj', 0.09);
      g.cizgi([-1.0, 0], [Ht / Math.tan(a) + 1.5, 0], { lw: 25 }); g.cizgi([-1.0, D], [D / Math.tan(a) - 0.05, D], { lw: 25 }); g.cizgi([D / Math.tan(a) + d / sa + 0.05, D], [Ht / Math.tan(a) + 1.5, D], { lw: 25 });
      g.yazi([0.1, 0.25], q.a + '°', 0.1);
      g.olcu([Ht / Math.tan(a) + 1.5, 0], [Ht / Math.tan(a) + 1.5, D], 'v', 0.3, `D = ${q.D}`);
    },
  });

  /* ================= DALGIÇ MİKSER (kılavuz direkli) =================
     Karusel ve anaerobik halkalarda: mikser programının (C.mikserSec) ya da mikser hesabının seçtiği pervane çapı, güç ve devirle.
     Yerel: y = itki (akış) yönü, x = enine, z = tabandan yukarı. Gövde direğin önünde, pervane gövdenin önünde.
     Kılavuz direk yürüme yolu tabliyesinin ön yüzüne bağlanır (tabandan tabliye üstüne); pergel vinç mikser ekseninde,
     yürüme yolu tabliyesinin üstünde (direğin arkasında), kolu direğin üstüne uzanır. */
  const MCOL = { body: [0.20, 0.38, 0.62], prop: [0.85, 0.62, 0.15], mast: [0.70, 0.72, 0.74], davit: [0.95, 0.75, 0.10] };
  /* üretici modeli (app/mikser-ksb.js: KSB AmaProp 2603): par.model seçiliyse gövde, ray ve pervane modelden; pergel vinç parametrik kalır */
  const MDL = q => { const k = q && q.model, d = k && k !== 'GENEL' && C.mikserModel && C.mikserModel[k]; return d && d.var() ? d : null; };
  const mik = q => { const L = m(q.lm), ym = -L / 2 - 0.12; return { L, rb: m(q.rb), r: m(q.D) / 2, z: m(q.hm), ym, H: m(q.Hd), yv: ym - 0.06 - m(q.vg) }; }; // yv: pergel vinç direği (tabliyede)
  C.aileKaydet({
    id: 'dalgic_mikser', ad: 'Dalgıç mikser — kılavuz direkli', kisaAd: 'MİKSER', kat: 'Mikser', katman: 'MEK_MIKSER', renk: 30, ifc: 'IfcFlowMovingDevice', // renk: paftadaki Mek_Mikser (20.11.2026)
    aciklama: 'Kılavuz direğe takılı dalgıç mikser. Pervane çapı, güç ve devir mikser hesabından gelir; direk yürüme yolu tabliyesinin ön yüzüne bağlanır, pergel vinç mikser ekseninde tabliyenin üstündedir.',
    params: [
      { k: 'model', ad: 'Üretici modeli', d: 'GENEL', opts: [['GENEL', 'Genel (parametrik gövde)'], ['ksb_amaprop_2603', 'Üretici modeli — yavaş devirli Ø2603, 5,5 kW, 45 d/dk']], grup: 'Mikser' },
      { k: 'D', ad: 'Pervane çapı', d: 370, min: 150, max: 3000, grup: 'Mikser' },
      { k: 'P', ad: 'Motor gücü', birim: 'kW', d: 2.5, grup: 'Mikser' },
      { k: 'rpm', ad: 'Devir', birim: 'd/dk', d: 1400, grup: 'Mikser' },
      { k: 'lm', ad: 'Gövde boyu', d: 700, grup: 'Mikser' },
      { k: 'hm', ad: 'Eksen yüksekliği (tabandan)', d: 600, grup: 'Yerleşim' },
      { k: 'Hd', ad: 'Taban → yürüme yolu tabliyesi üstü', d: 3950, min: 500, max: 15000, grup: 'Yerleşim' },
      { k: 'vg', ad: 'Pergel vinç — tabliye ön yüzünden geride', d: 300, grup: 'Pergel vinç' },
      { k: 'vh', ad: 'Pergel vinç yüksekliği (tabliyeden)', d: 1800, grup: 'Pergel vinç' },
      { k: 'vinc', ad: 'Pergel vinç', d: 'VAR', opts: [['VAR', 'Mikserle birlikte çiz'], ['YOK', 'Ayrı nesne (Pergel vinç ailesi, kendi numarasıyla)']], grup: 'Pergel vinç' },
      { k: 'rb', ad: 'Gövde yarıçapı', f: 'max(120, D*0.32)', grup: 'Hesaplanan' },
    ],
    tipler: [{ ad: 'MIK-K-370', p: { D: 370, P: 2.5, rpm: 1400, lm: 700, hm: 600, Hd: 3950, vg: 300, vh: 1800 } },
      { ad: 'MIK-Y-2603', p: { model: 'ksb_amaprop_2603', D: 2603, P: 5.5, rpm: 45, lm: 700, hm: 1610, Hd: 5310, vg: 300, vh: 1800 } }],
    etiket: q => `Ø${q.D} · ${q.P} kW${MDL(q) ? ' · ' + q.rpm + ' d/dk' : ''}`, // marka / model yazılmaz
    etiketYer: q => [0, (MDL(q) ? MDL(q).pervaneY() : m(q.lm) / 2) + 0.55, 0],
    liste: q => `${MDL(q) ? MDL(q).ad + ' (' + MDL(q).motor + ', ' + MDL(q).disli + ') · ' : ''}Pervane Ø${q.D} mm · ${q.P} kW · ${q.rpm} d/dk · ${MDL(q) ? 'kılavuz ray + üst tutucu (tabliyeye bağlı)' : `kılavuz direk ${q.Hd} mm (tabliyeye bağlı)`}${q.vinc === 'YOK' ? '' : ' + pergel vinç'}`, // vinç ayrı nesneyse kendi satırında
    bilgi: q => `${MDL(q) ? MDL(q).ad + '; ' : ''}Pervane Ø${q.D} mm, ${q.P} kW, ${q.rpm} d/dk; eksen tabandan ${MDL(q) ? MDL(q).hm() : q.hm} mm; ${MDL(q) ? 'kılavuz ray ayaktan tabliyeye, üst tutucu' : `kılavuz direk ${q.Hd} mm,`} tabliye ön yüzüne bağlı; pergel vinç tabliyede, mikser ekseninde`,
    plan: (q, g) => {
      const G = mik(q), Md = MDL(q);
      if (Md && Md.plan(q, g)) { // üretici modeli: gövde, ray, tutucu, pervane modelin izdüşümünden; pergel vinç kolu raya uzanır; akış oku pervanenin önünde
        const yr = Md.rayY / 1000, yp = Md.pervaneY();
        if (q.vinc !== 'YOK') { g.daire([0, G.yv], 0.08, { lw: 25 }); g.cizgi([0, G.yv], [0, yr], { lw: 18, lt: 'DASHED' }); }
        g.cizgi([0, yp + 0.3], [0, yp + 0.9], { lw: 25 }); g.cizgi([0, yp + 0.9], [0.08, yp + 0.75], { lw: 25 }); g.cizgi([0, yp + 0.9], [-0.08, yp + 0.75], { lw: 25 });
        return;
      }
      g.dik(-G.rb, -G.L / 2, G.rb, G.L / 2, { lw: 35 });
      g.dik(-G.r, G.L / 2 + 0.08, G.r, G.L / 2 + 0.14, { lw: 50 }); // pervane
      g.dik(-0.05, G.ym - 0.05, 0.05, G.ym + 0.05, { lw: 25 }); // kılavuz direk
      if (q.vinc !== 'YOK') { g.daire([0, G.yv], 0.08, { lw: 25 }); g.cizgi([0, G.yv], [0, G.ym + 0.05], { lw: 18, lt: 'DASHED' }); } // pergel vinç ve kolu (ayrı nesneyse çizilmez)
      g.cizgi([0, G.L / 2 + 0.3], [0, G.L / 2 + 0.9], { lw: 25 }); g.cizgi([0, G.L / 2 + 0.9], [0.08, G.L / 2 + 0.75], { lw: 25 }); g.cizgi([0, G.L / 2 + 0.9], [-0.08, G.L / 2 + 0.75], { lw: 25 });
    },
    mesh: (q, g, e) => {
      const G = mik(q), vt = G.H + m(q.vh), Md = MDL(q);
      if (Md && Md.mesh(q, g, e)) { // üretici modeli + parametrik pergel vinç (kol raya uzanır)
        const yr = Md.rayY / 1000; if (q.vinc === 'YOK') return;
        g.silindir([0, G.yv, G.H], [0, G.yv, vt], 0.045, MCOL.davit, 12); g.kutu(-0.07, 0.07, G.yv - 0.07, G.yv + 0.07, G.H, G.H + 0.02, MCOL.davit);
        g.kutu(-0.03, 0.03, G.yv, yr + 0.03, vt - 0.06, vt, MCOL.davit); g.silindir([0, yr, vt - 0.06], [0, yr, G.H + 0.3], 0.008, MCOL.mast, 6);
        return;
      }
      g.silindir([0, -G.L / 2, G.z], [0, G.L / 2, G.z], G.rb, MCOL.body, 16);
      g.silindir([0, G.L / 2, G.z], [0, G.L / 2 + 0.06, G.z], 0.05, MCOL.body, 10);
      g.silindir([0, G.L / 2 + 0.08, G.z], [0, G.L / 2 + 0.14, G.z], G.r, MCOL.prop, 24);
      g.kutu(-0.05, 0.05, G.ym - 0.05, G.ym + 0.05, 0, G.H, MCOL.mast); // kılavuz direk: tabandan tabliye üstüne
      g.kutu(-0.04, 0.04, G.ym + 0.05, -G.L / 2, G.z - 0.04, G.z + 0.04, MCOL.mast); // gövde bağlantısı
      for (const zb of [G.H - 0.15, G.H - 0.45]) g.kutu(-0.08, 0.08, G.ym - 0.06, G.ym - 0.05, zb - 0.06, zb + 0.06, MCOL.mast); // tabliye ön yüzüne bağlantı plakaları
      if (q.vinc === 'YOK') return; // pergel vinç ayrı nesne (pergel_vinc)
      g.silindir([0, G.yv, G.H], [0, G.yv, vt], 0.045, MCOL.davit, 12); // pergel vinç direği (tabliyede)
      g.kutu(-0.07, 0.07, G.yv - 0.07, G.yv + 0.07, G.H, G.H + 0.02, MCOL.davit); // taban plakası
      g.kutu(-0.03, 0.03, G.yv, G.ym + 0.08, vt - 0.06, vt, MCOL.davit); // kol: mikser ekseninde direğin üstüne
      g.silindir([0, G.ym + 0.05, vt - 0.06], [0, G.ym + 0.05, G.H + 0.3], 0.008, MCOL.mast, 6); // halat
    },
  });

  /* ================= PERGEL VİNÇ (mikser bakım vinci; ayrı nesne, kendi numarası PV-…) =================
     Kullanıcı kararı 20.11.2026: "kapaklar ayrı, mikser ayrı, pergel vinç ayrı" — kendi katmanı (MEK_PERGEL) ve numarası (PV-108/A: mikserle aynı harf).
     Yerel: orijin direğin tabliye üstündeki ayağı, y = kolun uzandığı yön (mikserin kılavuz rayına), z = tabliye üstünden yukarı.
     model 'jib': kullanıcının seçtiği jib vinç modeli (app/pergel-vinc-veri.js; SketchUp 3D Warehouse, araclar/pergel-vinc-uret.js) — gerçek ölçüsünde
     (yükseklik 3,13 m, kol 2,67 m; halat arabası kol boyunca gider), kol mikser yönüne döner. Veri yoksa parametrik çizim. */
  const VDEC = {};
  const vb64 = s => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  const vModel = q => { const k = q && q.model, V = k && k !== 'GENEL' && C.PERGEL_VINC_VERI && C.PERGEL_VINC_VERI[k]; if (!V) return null;
    return VDEC[k] || (VDEC[k] = Object.assign({}, V, { parca: V.parca.map(p => Object.assign({}, p, { A: new Int16Array(vb64(p.v)), F: new Uint16Array(vb64(p.f)) })) })); };
  /* kol boyu: kanca ekseni L'ye gelsin diye direğin dışındaki kısım (y > 200 mm) y yönünde ölçeklenir — kol kısalır / uzar, eğimi değişir
     (kullanıcı 20.11.2026: "halatla kancasının ekseni mikserin kaldırma kancasının ekseniyle aynı olacak şekilde uzunluğunu veya açısını ayarla") */
  const vKol = (V, q) => { const y0 = 200, ky = V.kanca ? V.kanca.y : V.uc, L = +q.L > 0 ? +q.L : ky, k = Math.max(0.2, (L - y0) / Math.max(1, ky - y0)); return y => (y > y0 ? y0 + (y - y0) * k : y); };
  const vCerceve = e => { e = e || {}; const r = (+e.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), p = e.p || [0, 0, 0], z0 = +e.z || 0; return ([x, y, z]) => [p[0] + y * c - x * s, p[1] + y * s + x * c, z0 + (z || 0)]; };
  C.aileKaydet({
    id: 'pergel_vinc', ad: 'Pergel vinç — mikser bakım vinci (tabliye üstü)', kisaAd: 'PERGEL VİNÇ', kat: 'Mikser', katman: 'MEK_PERGEL', renk: 1, ifc: 'IfcTransportElement',
    aciklama: 'Yürüme yolu tabliyesinin üstünde, mikser ekseninde döner kollu bakım vinci. Kol mikserin kılavuz rayının (direğinin) üstüne uzanır; mikser halatla raydan çekilir.',
    params: [
      { k: 'model', ad: 'Model', d: 'GENEL', opts: [['GENEL', 'Genel (parametrik direk ve kol)'], ['jib', 'Jib vinç modeli (3,13 m; kol kanca L\'ye göre ayarlanır)']], grup: 'Pergel vinç' },
      { k: 'vh', ad: 'Direk yüksekliği (tabliyeden)', d: 1800, min: 800, max: 4000, grup: 'Pergel vinç' },
      { k: 'L', ad: 'Kol erişimi (direkten halata / kancaya)', d: 600, min: 200, max: 3000, grup: 'Pergel vinç' },
      { k: 'hh', ad: 'Halat ucu (tabliyeden)', d: 300, min: 0, max: 2000, grup: 'Pergel vinç' },
    ],
    tipler: [{ ad: 'PV-1800', p: { model: 'GENEL', vh: 1800, L: 600, hh: 300 } }, { ad: 'PV-JIB', p: { model: 'jib', vh: 3129, L: 2674, hh: 300 } }],
    etiket: q => `Pergel vinç h=${vModel(q) ? vModel(q).H : q.vh}`,
    etiketYer: q => [0.35, 0, 0],
    liste: q => { const V = vModel(q); return `Pergel vinç (mikser bakımı${V ? ', jib vinç' : ''}) · direk ${V ? V.H : q.vh} mm · kol ${V ? V.uc : q.L} mm · tabliyeye ankrajlı`; },
    bilgi: q => { const V = vModel(q); return `Direk ${V ? V.H : q.vh} mm, kol erişimi ${V ? V.uc : q.L} mm; tabliye üstünde, mikser ekseninde`; },
    plan: (q, g) => {
      const V = vModel(q);
      if (V) { const ty = vKol(V, q); for (const p of V.parca) if (p.plan && p.plan.length >= 3) g.cok(p.plan.map(([x, y]) => [x / 1000, ty(y) / 1000]), true, { lw: 25 }); g.daire([0, m(q.L)], 0.03, { lw: 18 }); return; } // halat mikserin rayında
      const L = m(q.L);
      g.daire([0, 0], 0.08, { lw: 25 }); g.dik(-0.07, -0.07, 0.07, 0.07, { lw: 18 }); // direk ve taban plakası
      g.dik(-0.03, 0, 0.03, L + 0.03, { lw: 25 }); g.daire([0, L], 0.03, { lw: 18 }); // kol ve halat
    },
    mesh: (q, g, e) => {
      const vt = m(q.vh), L = m(q.L), V = vModel(q);
      if (V) { // jib vinç modeli (gerçek ölçüsünde); halat kolun altından mikserin rayına
        const out = g.out, W = vCerceve(e), ty = vKol(V, q);
        for (const p of V.parca) { const v0 = out.v.length, A = p.A, F = p.F, col = p.renk || MCOL.davit; for (let i = 0; i < A.length; i += 3) out.v.push(W([A[i] / 1000, ty(A[i + 1]) / 1000, A[i + 2] / 1000])); for (let i = 0; i < F.length; i += 3) { out.f.push([v0 + F[i], v0 + F[i + 1], v0 + F[i + 2]]); out.fc.push(col); } }
        return;
      }
      g.silindir([0, 0, 0], [0, 0, vt], 0.045, MCOL.davit, 12); // direk
      g.kutu(-0.07, 0.07, -0.07, 0.07, 0, 0.02, MCOL.davit); // taban plakası
      g.kutu(-0.03, 0.03, 0, L + 0.03, vt - 0.06, vt, MCOL.davit); // kol
      g.silindir([0, L, vt - 0.06], [0, L, m(q.hh)], 0.008, MCOL.mast, 6); // halat
    },
  });
})(window.C);

/* ArıtmaCAD — MEKANİK AİLELER
   1) Kanal tipi penstock (kapak) — üretici çizimi PEN-A-KNL-1200-1400 (Coarse Screen Inlet & Outlet Penstock, CEVAHİR GT1 PS):
      kanal 1200, kapak 1400, kanal derinliği 5400; çerçeve iki yanda perde yuvasına 85 mm gömülü (çerçeve 1370, kapak 1355),
      perde yuvası 1450 × 200, çerçeve platformdan 878 mm yukarı (6278), traversler 1550 aralıkla, Ø48 mil (TR30×6), AUMA aktüatör, AISI 316L.
   2) Mekanik kaba ızgara — mevcut parametrik ızgaranın (izgara.js) aile hâli: kanal genişliğine ve derinliğine uyar. */
(function (C) {
  'use strict';
  const COL = { frame: [0.52, 0.58, 0.64], door: [0.70, 0.73, 0.76], rib: [0.60, 0.64, 0.68], beam: [0.45, 0.51, 0.57], shaft: [0.82, 0.83, 0.85], act: [0.18, 0.36, 0.62], gear: [0.30, 0.32, 0.36], wheel: [0.80, 0.15, 0.12] };
  const m = v => v / 1000;

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
    id: 'penstock_kanal', ad: 'Penstock — kanal tipi (duvar yuvalı)', kisaAd: 'PENSTOCK', kat: 'Kapak / vana', katman: 'MEK_KAPAK', renk: 4, ifc: 'IfcValve',
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
      const nR = Math.max(2, Math.round(G.H / 0.35)); for (let k = 1; k < nR; k++) { const z = G.dz + G.H * k / nR; g.kutu(-G.wd2 + 0.02, G.wd2 - 0.02, G.kt / 2, G.kt / 2 + 0.05, z - 0.025, z + 0.025, COL.rib); }
      g.kutu(-0.03, 0.03, G.kt / 2, G.kt / 2 + 0.05, G.dz, G.dz + G.H, COL.rib);
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
      g.dik(-G.pw / 2, 0, G.pw / 2, G.Hf, { lw: 35 }); g.dik(-G.kt / 2, G.dz, G.kt / 2, G.dz + G.H, { lw: 35 }); g.dik(G.kt / 2, G.dz, G.kt / 2 + 0.05, G.dz + G.H, { lw: 13 });
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
  const mik = q => { const L = m(q.lm), ym = -L / 2 - 0.12; return { L, rb: m(q.rb), r: m(q.D) / 2, z: m(q.hm), ym, H: m(q.Hd), yv: ym - 0.06 - m(q.vg) }; }; // yv: pergel vinç direği (tabliyede)
  C.aileKaydet({
    id: 'dalgic_mikser', ad: 'Dalgıç mikser — kılavuz direkli', kisaAd: 'MİKSER', kat: 'Mikser', katman: 'MEK_MIKSER', renk: 1, ifc: 'IfcFlowMovingDevice',
    aciklama: 'Kılavuz direğe takılı dalgıç mikser. Pervane çapı, güç ve devir mikser hesabından gelir; direk yürüme yolu tabliyesinin ön yüzüne bağlanır, pergel vinç mikser ekseninde tabliyenin üstündedir.',
    params: [
      { k: 'D', ad: 'Pervane çapı', d: 370, min: 150, max: 3000, grup: 'Mikser' },
      { k: 'P', ad: 'Motor gücü', birim: 'kW', d: 2.5, grup: 'Mikser' },
      { k: 'rpm', ad: 'Devir', birim: 'd/dk', d: 1400, grup: 'Mikser' },
      { k: 'lm', ad: 'Gövde boyu', d: 700, grup: 'Mikser' },
      { k: 'hm', ad: 'Eksen yüksekliği (tabandan)', d: 600, grup: 'Yerleşim' },
      { k: 'Hd', ad: 'Taban → yürüme yolu tabliyesi üstü', d: 3950, min: 500, max: 15000, grup: 'Yerleşim' },
      { k: 'vg', ad: 'Pergel vinç — tabliye ön yüzünden geride', d: 300, grup: 'Pergel vinç' },
      { k: 'vh', ad: 'Pergel vinç yüksekliği (tabliyeden)', d: 1800, grup: 'Pergel vinç' },
      { k: 'rb', ad: 'Gövde yarıçapı', f: 'max(120, D*0.32)', grup: 'Hesaplanan' },
    ],
    tipler: [{ ad: 'MIK-K-370', p: { D: 370, P: 2.5, rpm: 1400, lm: 700, hm: 600, Hd: 3950, vg: 300, vh: 1800 } }],
    etiket: q => `Ø${q.D} · ${q.P} kW`,
    etiketYer: q => [0, m(q.lm) / 2 + 0.55, 0],
    liste: q => `Pervane Ø${q.D} mm · ${q.P} kW · ${q.rpm} d/dk · kılavuz direk ${q.Hd} mm (tabliyeye bağlı) + pergel vinç`,
    bilgi: q => `Pervane Ø${q.D} mm, ${q.P} kW, ${q.rpm} d/dk; eksen tabandan ${q.hm} mm; kılavuz direk ${q.Hd} mm, tabliye ön yüzüne bağlı; pergel vinç tabliyede, mikser ekseninde`,
    plan: (q, g) => {
      const G = mik(q);
      g.dik(-G.rb, -G.L / 2, G.rb, G.L / 2, { lw: 35 });
      g.dik(-G.r, G.L / 2 + 0.08, G.r, G.L / 2 + 0.14, { lw: 50 }); // pervane
      g.dik(-0.05, G.ym - 0.05, 0.05, G.ym + 0.05, { lw: 25 }); // kılavuz direk
      g.daire([0, G.yv], 0.08, { lw: 25 }); g.cizgi([0, G.yv], [0, G.ym + 0.05], { lw: 18, lt: 'DASHED' }); // pergel vinç ve kolu
      g.cizgi([0, G.L / 2 + 0.3], [0, G.L / 2 + 0.9], { lw: 25 }); g.cizgi([0, G.L / 2 + 0.9], [0.08, G.L / 2 + 0.75], { lw: 25 }); g.cizgi([0, G.L / 2 + 0.9], [-0.08, G.L / 2 + 0.75], { lw: 25 });
    },
    mesh: (q, g) => {
      const G = mik(q), vt = G.H + m(q.vh);
      g.silindir([0, -G.L / 2, G.z], [0, G.L / 2, G.z], G.rb, MCOL.body, 16);
      g.silindir([0, G.L / 2, G.z], [0, G.L / 2 + 0.06, G.z], 0.05, MCOL.body, 10);
      g.silindir([0, G.L / 2 + 0.08, G.z], [0, G.L / 2 + 0.14, G.z], G.r, MCOL.prop, 24);
      g.kutu(-0.05, 0.05, G.ym - 0.05, G.ym + 0.05, 0, G.H, MCOL.mast); // kılavuz direk: tabandan tabliye üstüne
      g.kutu(-0.04, 0.04, G.ym + 0.05, -G.L / 2, G.z - 0.04, G.z + 0.04, MCOL.mast); // gövde bağlantısı
      for (const zb of [G.H - 0.15, G.H - 0.45]) g.kutu(-0.08, 0.08, G.ym - 0.06, G.ym - 0.05, zb - 0.06, zb + 0.06, MCOL.mast); // tabliye ön yüzüne bağlantı plakaları
      g.silindir([0, G.yv, G.H], [0, G.yv, vt], 0.045, MCOL.davit, 12); // pergel vinç direği (tabliyede)
      g.kutu(-0.07, 0.07, G.yv - 0.07, G.yv + 0.07, G.H, G.H + 0.02, MCOL.davit); // taban plakası
      g.kutu(-0.03, 0.03, G.yv, G.ym + 0.08, vt - 0.06, vt, MCOL.davit); // kol: mikser ekseninde direğin üstüne
      g.silindir([0, G.ym + 0.05, vt - 0.06], [0, G.ym + 0.05, G.H + 0.3], 0.008, MCOL.mast, 6); // halat
    },
  });
})(window.C);

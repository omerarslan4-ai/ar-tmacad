/* ArıtmaCAD — ELEKTRİK TESİSATI · DETAYLAR VE PAFTA TABLOLARI (saf; Node ile denenir: node test/elektrik.test.js)
   Firma kuralı 15.11.2026: elektrik paftaları bolca detaylı; topraklama hesabı paftada; topraklama barası, temel topraklama şeridi, şerit eki,
   çubuk bağlantısı ve montaj detayları perspektif (izometrik) çizimlerle, standart çizim kurallarına göre (ölçeksiz şematik, oklu açıklama, ölçü).
   Çıktı biçimi el-hesap.js ile aynı: kâğıt mm { L:[[x1,y1,x2,y2,stil]], T:[[x,y,h,yazı,hiza,açı,renk]], S:[[[x,y]…]] }; stil k kalın, i ince, t gizli (HIDDEN), h çok ince.
   İzometrik izdüşüm: ekran x = (x − y)·cos30°·k, ekran y = (x + y)·sin30°·k + z·k (bakış −x, −y, +z yönünden; görünen yüzler x = x0, y = y0, z = z1).
   Detaylar:  EL.detayBara · EL.detayTemel · EL.detayEk · EL.detayArmatur · EL.detayDedektor · EL.detayYukseklik
   Tablolar:  EL.tabloTopraklama · EL.tabloAydinlatma · EL.tabloArmatur */
(function (C) {
  'use strict';
  const EL = (C && C.EL) || (typeof require !== 'undefined' ? require('./el-hesap.js') : {});
  const cizer = () => EL._cizer();
  const f = (v, d = 2) => (isFinite(v) ? (+v).toFixed(d) : '—').replace('.', ',');
  const fi = v => isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—';
  const CS = Math.cos(Math.PI / 6), SN = 0.5;
  /* yazı yükseklikleri (kâğıt mm) kural tablosundan: cizim-kural.js → ELEKTRIK.yaziMm */
  if (typeof window === 'undefined' && typeof require !== 'undefined') { try { require('./cizim-kural.js'); } catch (er) { } }
  const mm = k => { const G = (typeof window !== 'undefined' ? window.C : globalThis.C) || {}, t = G.cizimKural && G.cizimKural.ELEKTRIK && G.cizimKural.ELEKTRIK.yaziMm; return t && t[k] != null ? t[k] : 2; };

  /* ---------- izometrik çizici ---------- */
  const iso = (c, ox, oy, k) => {
    const P = (x, y, z) => [ox + (x - y) * CS * k, oy + (x + y) * SN * k + z * k];
    const cizgi = (a, b, st = 'i') => { const p = P(...a), q = P(...b); c.L(p[0], p[1], q[0], q[1], st); };
    const yol = (pts, st = 'i', kapali) => { for (let i = 1; i < pts.length; i++) cizgi(pts[i - 1], pts[i], st); if (kapali) cizgi(pts[pts.length - 1], pts[0], st); };
    /* kutu: görünen kenarlar (üst yüz, x0 ve y0 yüzleri); tara: üst yüze ince tarama (malzeme belirtisi) */
    const kutu = (x0, y0, z0, dx, dy, dz, st = 'k', tara) => { const x1 = x0 + dx, y1 = y0 + dy, z1 = z0 + dz;
      yol([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], st, true); cizgi([x0, y0, z0], [x0, y0, z1], st); cizgi([x1, y0, z0], [x1, y0, z1], st); cizgi([x0, y1, z0], [x0, y1, z1], st);
      cizgi([x0, y0, z0], [x1, y0, z0], st); cizgi([x0, y0, z0], [x0, y1, z0], st);
      if (tara) { const n = Math.max(2, Math.round(Math.max(dx, dy) / tara)); for (let i = 1; i < n; i++) { const t = i / n; cizgi([x0 + dx * t, y0, z0], [x0 + dx * t, y0, z1], 'h'); } } };
    /* gizli kutu (beton içindeki şerit gibi): bütün kenarlar kesikli */
    const gizliKutu = (x0, y0, z0, dx, dy, dz) => { const X = [x0, x0 + dx], Y = [y0, y0 + dy], Z = [z0, z0 + dz]; for (const z of Z) yol([[X[0], Y[0], z], [X[1], Y[0], z], [X[1], Y[1], z], [X[0], Y[1], z]], 't', true); for (const x of X) for (const y of Y) cizgi([x, y, Z[0]], [x, y, Z[1]], 't'); };
    /* düşey silindir */
    const silindir = (cx, cy, z0, r, h, st = 'k') => { const n = 24, ust = [], alt = []; for (let i = 0; i <= n; i++) { const t = 2 * Math.PI * i / n; ust.push([cx + r * Math.cos(t), cy + r * Math.sin(t), z0 + h]); } yol(ust, st);
      for (let i = 0; i <= n / 2; i++) { const t = (135 + 180 * i / (n / 2)) * Math.PI / 180; alt.push([cx + r * Math.cos(t), cy + r * Math.sin(t), z0]); } yol(alt, st);
      for (const a of [135, 315]) { const t = a * Math.PI / 180; cizgi([cx + r * Math.cos(t), cy + r * Math.sin(t), z0], [cx + r * Math.cos(t), cy + r * Math.sin(t), z0 + h], st); } };
    /* düşey düzlemde (x–z) daire: civata başı, delik */
    const daireXZ = (cx, y, cz, r, st = 'i') => { const n = 16, pts = []; for (let i = 0; i <= n; i++) { const t = 2 * Math.PI * i / n; pts.push([cx + r * Math.cos(t), y, cz + r * Math.sin(t)]); } yol(pts, st); };
    /* oklu açıklama: noktadan dışarı eğik çizgi + yatay çizgi + yazı (sağa ya da sola) */
    const not = (pt, dxmm, dymm, yazi, h = mm('detay'), sag = true) => { const p = P(...pt), q = [p[0] + dxmm, p[1] + dymm], r = [q[0] + (sag ? 4 : -4), q[1]]; c.L(p[0], p[1], q[0], q[1], 'h'); c.L(q[0], q[1], r[0], r[1], 'h');
      (c.g.S = c.g.S || []).push([[p[0], p[1]], [p[0] + 0.9 * Math.cos(Math.atan2(dymm, dxmm) + 0.35), p[1] + 0.9 * Math.sin(Math.atan2(dymm, dxmm) + 0.35)], [p[0] + 0.9 * Math.cos(Math.atan2(dymm, dxmm) - 0.35), p[1] + 0.9 * Math.sin(Math.atan2(dymm, dxmm) - 0.35)]]);
      String(yazi).split('\n').forEach((s, i) => c.T(r[0] + (sag ? 1 : -1), r[1] + 0.6 - i * h * 1.35, h, s, sag ? 'L' : 'R', 0)); };
    /* ölçü (izometrik doğrultuda): a, b noktaları, kâğıtta dik kaydırma (mm), yazı */
    const olcu = (a, b, kay, yazi, h = mm('olcu')) => { const p = P(...a), q = P(...b), d = [q[0] - p[0], q[1] - p[1]], L = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / L * kay, d[0] / L * kay], p2 = [p[0] + n[0], p[1] + n[1]], q2 = [q[0] + n[0], q[1] + n[1]];
      c.L(p[0], p[1], p2[0] + n[0] * 0.15, p2[1] + n[1] * 0.15, 'h'); c.L(q[0], q[1], q2[0] + n[0] * 0.15, q2[1] + n[1] * 0.15, 'h'); c.L(p2[0], p2[1], q2[0], q2[1], 'h');
      for (const m of [p2, q2]) c.L(m[0] - 0.9, m[1] - 0.9, m[0] + 0.9, m[1] + 0.9, 'i');
      const ang = Math.atan2(d[1], d[0]), okn = ang > Math.PI / 2 || ang < -Math.PI / 2 ? ang + Math.PI : ang; c.T((p2[0] + q2[0]) / 2 + n[0] * 0.25, (p2[1] + q2[1]) / 2 + n[1] * 0.25, h, yazi, 'BC', okn); };
    return { P, cizgi, yol, kutu, gizliKutu, silindir, daireXZ, not, olcu };
  };
  const baslik = (c, x, y, s, alt) => { c.T(x, y, mm('baslik'), s, 'L', 0); const w = s.length * mm('baslik') * 0.62; c.L(x, y - 1.2, x + w, y - 1.2, 'k'); if (alt) c.T(x, y - 5.5, mm('detay'), alt, 'L', 0); };
  EL._iso = iso;

  /* ======================= TOPRAKLAMA BARASI (TB-1) ======================= */
  EL.detayBara = (o = {}) => {
    const c = cizer(), I = iso(c, 30, 70, 0.17);
    /* duvar yüzü (barayı taşıyan), arkada */
    I.yol([[-80, 60, -150], [480, 60, -150], [480, 60, 140], [-80, 60, 140]], 'i', true); for (let x = -40; x < 480; x += 60) I.cizgi([x, 60, 140], [x + 40, 60, 100], 'h');
    /* mesnet izolatörleri */
    for (const x of [30, 370]) { I.kutu(x - 15, 5, 5, 30, 55, 30, 'k'); I.daireXZ(x, 5, 20, 7, 'i'); }
    /* bara 400 x 40 x 5 Cu, delikler / civatalar */
    I.kutu(0, 0, 0, 400, 5, 40, 'k', 25);
    const del = []; for (let x = 70; x <= 330; x += 52) { del.push(x); I.daireXZ(x, 0, 20, 6.5, 'k'); I.daireXZ(x, 0, 20, 3, 'i'); }
    /* bağlanan iletkenler: civatadan aşağı */
    const bag = ['PANO PE İLETKENİ — 16 mm² NYAF (sarı-yeşil)', 'KABLO TAVASI / METAL AKSAM — 16 mm² NYAF', 'SU VE BORU TESİSATI EŞ POTANSİYEL — 6 mm² NYAF', 'TELEFON / YANGIN SANTRALİ — 6 mm² NYAF', 'YEDEK'];
    del.slice(0, 4).forEach((x, i) => { I.cizgi([x, -3, 14], [x, -3, -130 + i * 18], 'k'); I.cizgi([x - 4, -3, 14], [x + 4, -3, 14], 'k'); });
    /* temel topraklama filizi: şerit alttan gelir, son deliğe iki civatayla */
    const xs = del[del.length - 1]; I.kutu(xs - 15, -9, -170, 30, 3.5, 190, 'k'); I.daireXZ(xs, -9, 8, 4, 'k'); I.daireXZ(xs, -9, 30, 4, 'k');
    /* açıklamalar */
    I.not([200, 0, 40], 30, 30, 'TOPRAKLAMA BARASI TB-1\n40x5 mm ELEKTROLİTİK BAKIR, 400 mm, KALAYLI');
    I.not([30, 30, 35], -14, 26, 'MESNET İZOLATÖRÜ\n(EPOKSİ, M8, 40 mm)', mm('detay'), false);
    I.not([del[1], 0, 20], 22, 14, 'M10 PASLANMAZ CİVATA, PUL, YAYLI PUL, SOMUN');
    del.slice(0, 4).forEach((x, i) => I.not([x, -3, -130 + i * 18], -20 - i * 4, -6 - i * 1.5, bag[i], mm('olcu'), false));
    I.not([xs, -9, -120], 20, -12, 'TEMEL TOPRAKLAMA FİLİZİ\n30x3,5 GALVANİZLİ ŞERİT (TEMELDEN)\n2 x M10 CİVATA İLE');
    I.not([440, 60, 60], 22, 2, 'DUVAR (BARA PANONUN ALTINDA,\nBİTMİŞ DÖŞEMEDEN +0,30 m)');
    I.olcu([0, 0, 40], [400, 0, 40], 7, '400');
    I.olcu([0, 0, 0], [0, 0, 40], -6, '40');
    baslik(c, -40, 142, 'TOPRAKLAMA BARASI (TB-1) PERSPEKTİF DETAYI', 'ÖLÇEKSİZ · ölçüler mm');
    return c.g;
  };

  /* ======================= TEMEL TOPRAKLAMASI ======================= */
  EL.detayTemel = (o = {}) => {
    const c = cizer(), I = iso(c, 80, 60, 0.045);
    /* radye köşesi (kesik): beton blok 1800 x 1400 x 400, üstte duvar başlangıcı */
    I.kutu(0, 0, 0, 1800, 1400, 400, 'k');
    I.kutu(0, 0, 400, 1800, 190, 260, 'i'); I.kutu(0, 190, 400, 190, 1210, 260, 'i');
    /* halka şerit: kenarından 100 mm içeride, kenarı üzerinde (dik), beton içinde (gizli) */
    const e = 100, zs = 120; I.gizliKutu(e, e, zs, 1800 - e, 3.5, 30); I.gizliKutu(e, e, zs, 3.5, 1400 - e, 30);
    for (let x = e + 400; x < 1800; x += 500) I.cizgi([x, e, 0], [x, e, zs], 't'); for (let y = e + 400; y < 1400; y += 500) I.cizgi([e, y, 0], [e, y, zs], 't');
    /* filiz: şeritten yukarı, döşemeden 1,5 m (kısaltılmış) */
    const xf = 1100; I.kutu(xf, e, zs, 30, 3.5, 900, 'k'); I.cizgi([xf - 20, e, 760], [xf + 50, e, 700], 'i'); I.cizgi([xf - 20, e, 790], [xf + 50, e, 730], 'i');
    /* çubuk ve muayene kutusu: binanın dışında, köşeden 1 m */
    const xc = -700, yc = -700; I.kutu(xc - 150, yc - 150, -250, 300, 300, 250, 'k'); I.silindir(xc, yc, -1400, 10, 1300, 'k'); I.cizgi([xc - 20, yc, -1450], [xc + 20, yc, -1400], 'i');
    I.kutu(xc, yc - 2, -180, 700 + e, 3.5, 30, 'k'); I.cizgi([xc + 700 + e, yc, -150], [e, e, zs], 't');
    /* açıklamalar */
    I.not([900, e, zs + 30], 20, -24, 'TEMEL TOPRAKLAMA İLETKENİ\n30x3,5 GALVANİZLİ ŞERİT, KENARI ÜZERİNDE\nBETON İÇİNDE KAPALI HALKA, ≥ 5 cm BETON ÖRTÜSÜ');
    I.not([e + 400, e, zs * 0.5], -10, -26, 'MESAFE TUTUCU (her 2 m)', mm('detay'), false);
    I.not([xf + 15, e, 1000], 18, 6, 'TOPRAKLAMA FİLİZİ (TB-1 BARASINA)\nDÖŞEMEDEN 1,5 m ÇIKAR');
    I.not([xc, yc, -1200], -10, -8, 'BAKIR KILIFLI ÇELİK ÇUBUK\nØ20 mm, L = 3 m', mm('detay'), false);
    I.not([xc, yc, 0], -16, 14, 'TOPRAKLAMA MUAYENE (ÖLÇÜ) KUTUSU\n300x300 mm, DÖKÜM KAPAKLI', mm('detay'), false);
    I.not([xc + 350, yc, -150], 12, -20, 'BAĞLANTI: 30x3,5 GALV. ŞERİT,\nÇUBUK KLEMENSİ İLE');
    I.not([1700, 1400, 200], 16, 10, 'RADYE / TEMEL BETONU');
    I.olcu([0, 0, 0], [e, 0, 0], 6, '10 cm');
    baslik(c, -40, 112, 'TEMEL TOPRAKLAMASI PERSPEKTİF DETAYI', 'ÖLÇEKSİZ · halka, filiz, çubuk ve muayene kutusu');
    return c.g;
  };

  /* ======================= ŞERİT EKİ ======================= */
  EL.detayEk = () => {
    const c = cizer(), I = iso(c, 20, 30, 0.14);
    I.kutu(0, 0, 0, 260, 30, 3.5, 'k', 20); I.kutu(160, -2, 3.5, 260, 30, 3.5, 'k', 20);
    I.kutu(175, -20, 7, 70, 70, 10, 'k'); for (const [x, y] of [[188, -7], [232, -7], [188, 37], [232, 37]]) I.silindir(x, y, 17, 5, 8, 'k');
    I.not([60, 0, 3.5], -8, 14, '30x3,5 GALVANİZLİ ŞERİT', mm('detay'), false); I.not([210, 15, 17], 14, 18, 'ÇAPRAZ BAĞLANTI KLEMENSİ 60x60 mm\n4 x M10 GALVANİZ CİVATA');
    I.olcu([160, 30, 7], [260, 30, 7], 6, '≥ 100');
    baslik(c, -10, 62, 'ŞERİT EK DETAYI (PERSPEKTİF)', 'ÖLÇEKSİZ · bindirme en az 10 cm, ek yeri bitüm esaslı boya ile korunur');
    return c.g;
  };

  /* ======================= LED ARMATÜR MONTAJI ======================= */
  EL.detayArmatur = (kod) => {
    const a = EL.ARMATUR[kod] || EL.ARMATUR['P-LED36W'] || {}, Lm = Math.round((a.boy || 1.2) * 1000), wm = a.etans ? 90 : 70, hm = a.etans ? 80 : 50, c = cizer(), I = iso(c, 30, 40, 0.06);
    I.kutu(-150, -200, 300, Lm + 300, 600, 150, 'i'); /* tavan döşemesi */
    I.kutu(0, 100, 300 - hm, Lm, wm, hm, 'k', 60); I.kutu(20, 100, 300 - hm - 4, Lm - 40, wm, 4, 'i');
    I.silindir(Lm / 2, 300, 300, 40, 30, 'i'); I.cizgi([Lm / 2, 300, 300], [Lm / 2, 100 + wm / 2, 300 - hm / 2], 't');
    for (const x of [80, Lm - 80]) I.cizgi([x, 100 + wm / 2, 300], [x, 100 + wm / 2, 300 - 12], 'k');
    I.not([Lm * 0.6, 100, 300 - hm], 16, -12, `${kod} ${a.ad || ''}\n${a.W || ''} W · ${a.lm || ''} lm · ${a.K || 4000} K · Ra≥${a.Ra || 80} · IP${a.ip || ''}\n${a.govde || ''}`);
    I.not([80, 100 + wm / 2, 294], -10, 14, 'DÜBEL + 2 x Ø6 VİDA', mm('detay'), false); I.not([Lm / 2, 300, 330], 10, 16, 'BUAT (SIVA ALTI) — 3x2,5 NYA, Ø18 PVC BORU');
    I.olcu([0, 100, 300 - hm], [Lm, 100, 300 - hm], -7, String(Lm));
    baslik(c, -10, 70, 'LED ARMATÜR MONTAJ DETAYI (PERSPEKTİF)', 'ÖLÇEKSİZ · tavana doğrudan montaj, armatür gövdesi topraklanır');
    return c.g;
  };

  /* ======================= DEDEKTÖR MONTAJI ======================= */
  EL.detayDedektor = () => {
    const c = cizer(), I = iso(c, 40, 40, 0.05);
    I.kutu(0, 0, 800, 1600, 1200, 120, 'i'); I.yol([[0, 0, 800], [0, 0, 0], [1600, 0, 0]], 'i'); I.yol([[0, 0, 0], [0, 1200, 0]], 'i');
    I.silindir(700, 600, 750, 55, 50, 'k'); I.silindir(700, 600, 735, 45, 15, 'k');
    I.olcu([0, 600, 800], [700 - 55, 600, 800], 8, '≥ 500');
    I.not([700, 600, 735], 16, -14, 'OPTİK DUMAN DEDEKTÖRÜ (TS EN 54-7)\nSOKETLİ TABAN, TAVANA MONTAJ\nDUVAR VE ARMATÜRDEN ≥ 0,5 m\nKAPSAMA 60 m² (ISI DEDEKTÖRÜ 30 m²)');
    I.not([700, 600, 800], -12, 16, '2x1,5 JY(St)Y, Ø18 PVC BORU (SIVA ÜSTÜ)', mm('detay'), false);
    baslik(c, -10, 72, 'DEDEKTÖR MONTAJ DETAYI (PERSPEKTİF)', 'ÖLÇEKSİZ');
    return c.g;
  };

  /* ======================= MONTAJ YÜKSEKLİKLERİ (duvar görünüşü, 1/25) ======================= */
  EL.detayYukseklik = (h = 2.8) => {
    const c = cizer(), k = 40, H = h * k, W = 4.2 * k;
    c.L(0, 0, W, 0, 'k'); c.L(0, H, W, H, 'k'); for (let x = 0; x < W; x += 6) c.L(x, 0, x - 3, -3, 'h'); for (let x = 0; x < W; x += 6) c.L(x, H, x + 3, H + 3, 'h');
    c.T(W + 2, -1, mm('detay'), '±0,00 BİTMİŞ DÖŞEME', 'L', 0); c.T(W + 2, H - 1, mm('detay'), `+${f(h, 2)} TAVAN`, 'L', 0);
    const el = [[0.4, 18, 'PRİZ (TOPRAKLI) +0,40 · MUTFAKTA TEZGAH ÜSTÜ +1,10', 'r'], [1.1, 48, 'ANAHTAR +1,10 (KAPI KENARINDAN 15 cm)', 's'], [1.5, 78, 'AYDINLATMA TABLOSU (ALT KENAR) +1,50', 'p'], [1.4, 110, 'YANGIN BUTONU +1,40', 'b'], [1.8, 136, 'TELEFON DAĞITIM KUTUSU +1,80', 't'], [2.25, 158, 'ACİL ÇIKIŞ ARMATÜRÜ (KAPI ÜSTÜ) +2,25', 'a']];
    for (const [z, x, ad, t] of el) { const y = z * k;
      if (t === 'p') c.B(x - 9, y, 18, 20, 'k'); else if (t === 'a') c.B(x - 7, y, 14, 5, 'k'); else c.B(x - 3, y - 3, 6, 6, 'k');
      c.L(x - 12, 0, x - 12, y, 'h'); c.L(x - 13, y, x - 11, y, 'i'); c.T(x - 13, y / 2, mm('olcu'), '+' + f(z, 2), 'MC', Math.PI / 2); c.T(x + 4, y + 7, mm('olcu'), ad, 'L', 0); c.L(x, y + 3, x + 3, y + 6, 'h'); }
    c.B(W - 32, 0, 24, 2.1 * k, 'i'); c.T(W - 20, 2.1 * k / 2, mm('olcu'), 'KAPI', 'MC', Math.PI / 2);
    for (let i = 0; i < 2; i++) { const x = 40 + i * 70; c.L(x - 12, H - 3, x + 12, H - 3, 'k'); c.L(x - 12, H - 1, x + 12, H - 1, 'k'); }
    c.T(40, H - 7, mm('olcu'), 'LED ARMATÜR (TAVANA)', 'L', 0);
    baslik(c, 0, H + 14, 'MONTAJ YÜKSEKLİKLERİ (DUVAR GÖRÜNÜŞÜ)', 'Ö: 1/25 · yükseklikler bitmiş döşemeden, eleman ortasına (pano alt kenarına)');
    return c.g;
  };

  /* ======================= TABLOLAR ======================= */
  const tablo = (baslikYazi, bas, satirlar, gen, alt) => {
    const c = cizer(), rh = 6, n = satirlar.length, col = [0]; gen.forEach(w => col.push(col[col.length - 1] + w)); const W = col[col.length - 1], top = 0;
    c.L(0, top, W, top, 'k'); c.L(0, top - rh, W, top - rh, 'k'); for (let i = 1; i <= n; i++) c.L(0, top - rh - i * rh, W, top - rh - i * rh, i === n ? 'k' : 'i');
    col.forEach((x, i) => c.L(x, top, x, top - rh - n * rh, i === 0 || i === col.length - 1 ? 'k' : 'i'));
    bas.forEach((b, i) => c.T((col[i] + col[i + 1]) / 2, top - rh + 2, mm('sutun'), b, 'MC', 0));
    satirlar.forEach((r, j) => r.forEach((v, i) => c.T(i ? (col[i] + col[i + 1]) / 2 : col[i] + 1.5, top - rh - (j + 1) * rh + 2, mm('cetvel'), String(v), i ? 'MC' : 'L', 0)));
    c.T(0, top + 5, mm('baslik'), baslikYazi, 'L', 0); (alt || []).forEach((s, i) => c.T(0, top - rh - n * rh - 5 - i * 4.4, mm('detay'), s, 'L', 0));
    return c.g;
  };
  EL.tabloTopraklama = (R) => { if (!R) return null; return tablo('TOPRAKLAMA HESABI', ['HESAP', 'BAĞINTI', 'SONUÇ'], [
    ['Toprak özgül direnci', 'ρ (kabul)', fi(R.rho) + ' Ωm'], ['Eşdeğer çap', 'D = 1,13 · √A', f(R.D, 2) + ' m'], ['Temel topraklayıcısı (halka)', 'Rh = 2ρ / (3D)', f(R.Rh, 2) + ' Ω'],
    ['Tek çubuk (Ø20, L = ' + f(R.Lc, 0) + ' m)', 'Rç = ρ / (2πL) · ln(4L / d)', f(R.Rc1, 2) + ' Ω'], ['Çubuk sayısı', 'R ≤ ' + R.hedef + ' Ω olana kadar', R.cubuk + ' ad'],
    ['Toplam yayılma direnci', '1/R = 1/Rh + n / (1,15 · Rç)', f(R.R, 2) + ' Ω ' + (R.R <= R.hedef ? '≤ ' + R.hedef + ' ✓' : '> ' + R.hedef + ' ✗')],
    ['Dokunma gerilimi', 'UT = R · IΔn = R · 0,03 A ≤ 50 V', f(R.dokunma, 2) + ' V ✓'], ['Şerit boyu', 'çevre + bağlantılar', fi(R.serit) + ' m']],
    [62, 70, 40], ['Topraklamalar Yönetmeliği (Ek-P) bağıntıları; çubuklar arası etkileşim %15. Ölçülen direnç hesaptan büyükse çubuk eklenir.']); };
  EL.tabloAydinlatma = (H, MF) => { if (!H || !H.length) return null; return tablo('AYDINLATMA HESABI (LÜMEN YÖNTEMİ)', ['MAHAL', 'A m²', 'hm m', 'k', 'η', 'E lx', 'ARMATÜR', 'Φ lm', 'N', 'Eg lx', 'W/m²'],
    H.map(x => [`${x.e.no || ''} ${x.e.ad || ''}`.trim(), f(x.A, 1), f(x.r.hm, 2), f(x.r.k, 2), f(x.r.eta, 2), fi(x.lx), x.arm, fi(x.r.lm), x.r.N, fi(x.r.Eg), f(x.r.Wm2, 1)]),
    [40, 14, 14, 12, 12, 13, 24, 15, 10, 15, 14], [`N = E · A / (Φ · η · MF), MF = ${f(MF || 0.8, 2)}; k = a·b / (hm·(a+b)), hm = tavan − 0,85 m; yansıtma 0,7 / 0,5 / 0,2; aydınlatma düzeyi TS EN 12464-1.`]); };
  EL.tabloArmatur = (sayilar) => { const ks = Object.keys(sayilar || {}).filter(k => sayilar[k] > 0); if (!ks.length) return null; return tablo('ARMATÜR LİSTESİ (LED)', ['KOD', 'TANIM', 'GÜÇ', 'IŞIK AKISI', 'RENK', 'IP', 'ADET'],
    ks.map(k => { const a = EL.ARMATUR[k] || {}; return [k, (a.ad || '') + (a.govde ? ' — ' + a.govde.split(',')[0] : ''), (a.W || '') + ' W', (a.lm || '') + ' lm', a.K ? a.K + ' K' : '', 'IP' + (a.ip || ''), sayilar[k]]; }),
    [22, 96, 14, 20, 14, 12, 12], ['Bütün armatürler LED, sürücü dahil; Ra ≥ 80, ömür 50.000 saat (L70), güç faktörü ≥ 0,9. Acil armatür 3 saat aküllü.']); };

  if (typeof module !== 'undefined' && module.exports) module.exports = EL;

  /* çeviri: detay, tablo ve LED açıklamaları (satırın tamamı ya da metin içi ifade; '#' sayı) */
  if (typeof window !== 'undefined' && window.DIL) window.DIL.ekle('en', 'English', [
    ['TOPRAKLAMA BARASI TB-1', 'EARTHING BAR TB-1'], ['40x5 mm ELEKTROLİTİK BAKIR, 400 mm, KALAYLI', '40x5 mm ELECTROLYTIC COPPER, 400 mm, TINNED'], ['MESNET İZOLATÖRÜ', 'STANDOFF INSULATOR'], ['(EPOKSİ, M8, 40 mm)', '(EPOXY, M8, 40 mm)'],
    ['M10 PASLANMAZ CİVATA, PUL, YAYLI PUL, SOMUN', 'M10 STAINLESS BOLT, WASHER, SPRING WASHER, NUT'], ['PANO PE İLETKENİ — 16 mm² NYAF (sarı-yeşil)', 'PANEL PE CONDUCTOR — 16 mm² NYAF (green-yellow)'],
    ['KABLO TAVASI / METAL AKSAM — 16 mm² NYAF', 'CABLE TRAY / METAL PARTS — 16 mm² NYAF'], ['SU VE BORU TESİSATI EŞ POTANSİYEL — 6 mm² NYAF', 'WATER AND PIPING EQUIPOTENTIAL BONDING — 6 mm² NYAF'], ['TELEFON / YANGIN SANTRALİ — 6 mm² NYAF', 'TELEPHONE / FIRE ALARM PANEL — 6 mm² NYAF'], ['YEDEK', 'SPARE'],
    ['TEMEL TOPRAKLAMA FİLİZİ', 'FOUNDATION EARTHING LEAD-OUT'], ['30x3,5 GALVANİZLİ ŞERİT (TEMELDEN)', '30x3,5 GALVANIZED STRIP (FROM FOUNDATION)'], ['2 x M10 CİVATA İLE', 'WITH 2 x M10 BOLTS'], ['DUVAR (BARA PANONUN ALTINDA,', 'WALL (BAR BELOW THE PANEL,'], ['BİTMİŞ DÖŞEMEDEN +0,30 m)', '+0,30 m ABOVE FINISHED FLOOR)'],
    ['TOPRAKLAMA BARASI (TB-1) PERSPEKTİF DETAYI', 'EARTHING BAR (TB-1) PERSPECTIVE DETAIL'], ['ÖLÇEKSİZ · ölçüler mm', 'NOT TO SCALE · dimensions in mm'], ['ÖLÇEKSİZ', 'NOT TO SCALE'],
    ['TEMEL TOPRAKLAMA İLETKENİ', 'FOUNDATION EARTH CONDUCTOR'], ['30x3,5 GALVANİZLİ ŞERİT, KENARI ÜZERİNDE', '30x3,5 GALVANIZED STRIP, ON EDGE'], ['BETON İÇİNDE KAPALI HALKA, ≥ 5 cm BETON ÖRTÜSÜ', 'CLOSED RING IN CONCRETE, ≥ 5 cm CONCRETE COVER'], ['MESAFE TUTUCU (her 2 m)', 'SPACER (every 2 m)'],
    ['TOPRAKLAMA FİLİZİ (TB-1 BARASINA)', 'EARTHING LEAD-OUT (TO BAR TB-1)'], ['DÖŞEMEDEN 1,5 m ÇIKAR', 'PROJECTS 1,5 m ABOVE FLOOR'], ['BAKIR KILIFLI ÇELİK ÇUBUK', 'COPPER-BONDED STEEL ROD'], ['TOPRAKLAMA MUAYENE (ÖLÇÜ) KUTUSU', 'EARTHING INSPECTION (TEST) PIT'], ['300x300 mm, DÖKÜM KAPAKLI', '300x300 mm, CAST-IRON COVER'],
    ['BAĞLANTI: 30x3,5 GALV. ŞERİT,', 'CONNECTION: 30x3,5 GALV. STRIP,'], ['ÇUBUK KLEMENSİ İLE', 'WITH ROD CLAMP'], ['RADYE / TEMEL BETONU', 'RAFT / FOUNDATION CONCRETE'], ['TEMEL TOPRAKLAMASI PERSPEKTİF DETAYI', 'FOUNDATION EARTHING PERSPECTIVE DETAIL'], ['ÖLÇEKSİZ · halka, filiz, çubuk ve muayene kutusu', 'NOT TO SCALE · ring, lead-out, rod and inspection pit'],
    ['30x3,5 GALVANİZLİ ŞERİT', '30x3,5 GALVANIZED STRIP'], ['ÇAPRAZ BAĞLANTI KLEMENSİ 60x60 mm', 'CROSS CONNECTOR 60x60 mm'], ['4 x M10 GALVANİZ CİVATA', '4 x M10 GALVANIZED BOLTS'], ['ŞERİT EK DETAYI (PERSPEKTİF)', 'STRIP JOINT DETAIL (PERSPECTIVE)'], ['ÖLÇEKSİZ · bindirme en az 10 cm, ek yeri bitüm esaslı boya ile korunur', 'NOT TO SCALE · overlap at least 10 cm, joint protected with bitumen paint'],
    ['DÜBEL + 2 x Ø6 VİDA', 'WALL PLUG + 2 x Ø6 SCREWS'], ['BUAT (SIVA ALTI) — 3x2,5 NYA, Ø18 PVC BORU', 'JUNCTION BOX (FLUSH) — 3x2,5 NYA, Ø18 PVC CONDUIT'], ['LED ARMATÜR MONTAJ DETAYI (PERSPEKTİF)', 'LED LUMINAIRE MOUNTING DETAIL (PERSPECTIVE)'], ['ÖLÇEKSİZ · tavana doğrudan montaj, armatür gövdesi topraklanır', 'NOT TO SCALE · surface-mounted on ceiling, luminaire body earthed'],
    ['OPTİK DUMAN DEDEKTÖRÜ (TS EN 54-7)', 'OPTICAL SMOKE DETECTOR (TS EN 54-7)'], ['SOKETLİ TABAN, TAVANA MONTAJ', 'SOCKET BASE, CEILING MOUNTED'], ['DUVAR VE ARMATÜRDEN ≥ 0,5 m', '≥ 0,5 m FROM WALLS AND LUMINAIRES'], ['KAPSAMA 60 m² (ISI DEDEKTÖRÜ 30 m²)', 'COVERAGE 60 m² (HEAT DETECTOR 30 m²)'], ['2x1,5 JY(St)Y, Ø18 PVC BORU (SIVA ÜSTÜ)', '2x1,5 JY(St)Y, Ø18 PVC CONDUIT (SURFACE)'], ['DEDEKTÖR MONTAJ DETAYI (PERSPEKTİF)', 'DETECTOR MOUNTING DETAIL (PERSPECTIVE)'],
    ['±0,00 BİTMİŞ DÖŞEME', '±0,00 FINISHED FLOOR'], ['# TAVAN', '# CEILING'], ['PRİZ (TOPRAKLI) +0,40 · MUTFAKTA TEZGAH ÜSTÜ +1,10', 'SOCKET (EARTHED) +0,40 · KITCHEN ABOVE WORKTOP +1,10'], ['ANAHTAR +1,10 (KAPI KENARINDAN 15 cm)', 'SWITCH +1,10 (15 cm FROM DOOR EDGE)'], ['AYDINLATMA TABLOSU (ALT KENAR) +1,50', 'LIGHTING PANEL (BOTTOM EDGE) +1,50'],
    ['YANGIN BUTONU +1,40', 'MANUAL CALL POINT +1,40'], ['TELEFON DAĞITIM KUTUSU +1,80', 'TELEPHONE DISTRIBUTION BOX +1,80'], ['ACİL ÇIKIŞ ARMATÜRÜ (KAPI ÜSTÜ) +2,25', 'EMERGENCY EXIT LUMINAIRE (ABOVE DOOR) +2,25'], ['KAPI', 'DOOR'], ['LED ARMATÜR (TAVANA)', 'LED LUMINAIRE (ON CEILING)'], ['MONTAJ YÜKSEKLİKLERİ (DUVAR GÖRÜNÜŞÜ)', 'MOUNTING HEIGHTS (WALL ELEVATION)'],
    ['Ö: 1/25 · yükseklikler bitmiş döşemeden, eleman ortasına (pano alt kenarına)', 'S: 1/25 · heights from finished floor to centre of item (panel: bottom edge)'],
    ['HESAP', 'CALCULATION'], ['BAĞINTI', 'FORMULA'], ['SONUÇ', 'RESULT'], ['Toprak özgül direnci', 'Soil resistivity'], ['ρ (kabul)', 'ρ (assumed)'], ['Eşdeğer çap', 'Equivalent diameter'], ['Temel topraklayıcısı (halka)', 'Foundation earth electrode (ring)'], ['Tek çubuk (Ø20, L = # m)', 'Single rod (Ø20, L = # m)'],
    ['Çubuk sayısı', 'Number of rods'], ['R ≤ # Ω olana kadar', 'until R ≤ # Ω'], ['Toplam yayılma direnci', 'Total earth resistance'], ['Dokunma gerilimi', 'Touch voltage'], ['Şerit boyu', 'Strip length'], ['çevre + bağlantılar', 'perimeter + connections'], ['TOPRAKLAMA HESABI', 'EARTHING CALCULATION'],
    ['Topraklamalar Yönetmeliği (Ek-P) bağıntıları; çubuklar arası etkileşim %15. Ölçülen direnç hesaptan büyükse çubuk eklenir.', 'Formulas of the Turkish Earthing Regulation (Annex P); rod interaction 15%. If the measured resistance exceeds the calculation, rods are added.'],
    ['KOD', 'CODE'], ['TANIM', 'DESCRIPTION'], ['GÜÇ', 'POWER'], ['IŞIK AKISI', 'LUMINOUS FLUX'], ['RENK', 'COLOUR'], ['ADET', 'QTY'], ['MAHAL', 'ROOM'], ['ARMATÜR', 'LUMINAIRE'], ['ARMATÜR LİSTESİ (LED)', 'LUMINAIRE SCHEDULE (LED)'], ['AYDINLATMA HESABI (LÜMEN YÖNTEMİ)', 'LIGHTING CALCULATION (LUMEN METHOD)'],
    ['Bütün armatürler LED, sürücü dahil; Ra ≥ 80, ömür 50.000 saat (L70), güç faktörü ≥ 0,9. Acil armatür 3 saat aküllü.', 'All luminaires LED, driver included; Ra ≥ 80, life 50.000 h (L70), power factor ≥ 0,9. Emergency luminaire 3 h battery.'],
    ['N = E · A / (Φ · η · MF), MF = #; k = a·b / (hm·(a+b)), hm = tavan − # m; yansıtma # / # / #; aydınlatma düzeyi TS EN #-#.', 'N = E · A / (Φ · η · MF), MF = #; k = a·b / (hm·(a+b)), hm = ceiling − # m; reflectances # / # / #; illuminance per TS EN #-#.'],
    ['LED LİNEER ARMATÜR', 'LED LINEAR LUMINAIRE'], ['LED ETANŞ ARMATÜR', 'LED WATERPROOF LUMINAIRE'], ['LED ACİL ÇIKIŞ ARMATÜRÜ (3 SAAT)', 'LED EMERGENCY EXIT LUMINAIRE (3 HOURS)'], ['LED ETANŞ DUVAR APLİĞİ', 'LED WATERPROOF WALL LIGHT'], ['ömür # saat (L70)', 'life # h (L70)'],
    ['sıva üstü', 'surface-mounted'], ['polikarbonat gövde ve difüzör', 'polycarbonate body and diffuser'], ['kendinden akülü (Ni-Cd 3', 'self-contained battery (Ni-Cd 3'], ['alüminyum döküm gövde', 'die-cast aluminium body'],
    ['sıva üstü, opal difüzörlü alüminyum gövde 1200x70x50 mm', 'surface-mounted, aluminium body with opal diffuser 1200x70x50 mm'], ['sıva üstü, opal difüzörlü alüminyum gövde 600x70x50 mm', 'surface-mounted, aluminium body with opal diffuser 600x70x50 mm'],
    ['polikarbonat gövde ve difüzör, paslanmaz klips 1270x90x80 mm', 'polycarbonate body and diffuser, stainless clips 1270x90x80 mm'], ['polikarbonat gövde ve difüzör, paslanmaz klips 670x90x80 mm', 'polycarbonate body and diffuser, stainless clips 670x90x80 mm'],
    ['FLORESANT ARMATÜR (IP42)', 'FLUORESCENT LUMINAIRE (IP42)'], ['ETANŞ FLORESANT ARMATÜR (IP54)', 'WATERPROOF FLUORESCENT LUMINAIRE (IP54)'],
    ['BÜTÜN AYDINLATMA ARMATÜRLERİ LED OLACAKTIR (4000 K, Ra ≥ 80, ÖMÜR 50.000 SAAT L70,', 'ALL LUMINAIRES SHALL BE LED (4000 K, Ra ≥ 80, LIFE 50.000 h L70,'], ['GÜÇ FAKTÖRÜ ≥ 0,9, SÜRÜCÜ DAHİL). ISLAK HACİMLERDE IP65 ETANŞ ARMATÜR KULLANILACAKTIR.', 'POWER FACTOR ≥ 0,9, DRIVER INCLUDED). IP65 WATERPROOF LUMINAIRES IN WET ROOMS.'],
    ['ACİL ÇIKIŞ ARMATÜRÜ 3 SAAT AKÜLÜ, KESİNTİDE KENDİLİĞİNDEN YANAR.', 'EMERGENCY EXIT LUMINAIRE WITH 3 h BATTERY, LIGHTS AUTOMATICALLY ON POWER FAILURE.'],
  ]);
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : null);

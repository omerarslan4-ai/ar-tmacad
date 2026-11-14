/* ArıtmaCAD — MİMARİ DETAYLAR (MIMARIPAFTA'nın detay paftaları: kapı / pencere, korkuluk, sac kapak, çatı)
   Biçim Çokal AAT R2'den ölçüldü (14.11.2026; DWG → DXF ODA, çizim cm):
     10-İdari Bina_R2 doğrama detayları (1/20): her tip bir hücrede — başlık "P1 150/130 ALÜMİNYUM PENCERE" (8 birim = 4 mm, altı çizili),
       altında "ÖLÇEK: 1/20", sağda "(8 ADET)" (6 birim = 3 mm); hücrede GÖRÜNÜŞ (dıştan; kasa, kanat bölümleri, açılım çizgileri,
       sabit camda "4+12+4 ısıcam", denizlik, altta genişlik zinciri + toplam, solda yükseklik), sağında 2-2 KESİTİ (düşey: duvar, kasa,
       cam, iç / dış denizlik, sıva), altında 1-1 KESİTİ (yatay: duvar kenarları, kasa ve kayıtlar). Kapılarda 1-1 KESİTİ kanat açılım yayıyla.
       Hücre boyu P1 430 × 439 birim (1/20'de 215 × 220 mm), başlık şeridi 40 birim.
     10-İdari Bina_R2 rampa korkuluğu (1/20): görünüşte dikmeler ve aralık zinciri (87,5), küpeşte 1 1/2", ara küpeşte 1", h = 110 cm,
       "Korkuluk h=110 cm (Sıcak Daldırma Galvaniz)". Programda boru çapları modeldeki korkulukla aynı (Ø42,4 küpeşte ve dikme, Ø33,7 ara küpeşte,
       150 × 4 mm tekmelik; app/merdiven.js railRun).
     10-İdari Bina_R2 çatı paftası (ÇKL-AAT-İB-03, 1/10-50): ÇATI PLANI (iskelet, eğim okları "Eğim %33", yağmur oluğu ve iniş borusu),
       A'-A' / B'-B' çatı kesitleri 1/50, DETAY-A (saçak, oluk, iniş borusu) / DETAY-B (mahya) / DETAY-C 1/10, SAC KAPAK 1/10.
   Saf kısım (çizim listeleri) Node ile denenir: node test/mimari-detay.test.js
   Çizim listesi: { k: 'L' | 'P' | 'C' | 'T' | 'D' (ölçü) | 'H' (tarama) | 'B' (başlık), … } — model metre, yazı ve ölçü uzaklığı kâğıt mm. */
(function (C) {
  'use strict';

  /* ======================= SAF KISIM ======================= */
  const cmS = v => String(Math.round(v * 100));
  const liste = sc => {
    const o = [], k = sc / 1000;
    const f = {
      o, k,
      L: (a, b, ly, lt) => o.push({ k: 'L', a, b, ly: ly || 'DETAY_GORUNEN', lt }),
      P: (pts, cl, ly, lt) => o.push({ k: 'P', pts, cl: !!cl, ly: ly || 'DETAY_GORUNEN', lt }),
      R: (x0, y0, x1, y1, ly, lt) => f.P([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true, ly, lt),
      C: (c, r, ly) => o.push({ k: 'C', c, r, ly: ly || 'DETAY_GORUNEN' }),
      A: (c, r, a0, a1, ly) => o.push({ k: 'A', c, r, a0, a1, ly: ly || 'DETAY_GORUNEN' }), // yay (açılar derece, saat yönü tersine a0 → a1)
      T: (p, s, mm, al, ly, rot) => o.push({ k: 'T', p, s: String(s), mm: mm || 2, al: al || 'L', ly: ly || 'YAZI', rot: rot || 0 }),
      /* ölçü: a → b, yon 'h' | 'v', off kâğıt mm (+ yukarı / sağa), metin cm */
      D: (a, b, yon, off, txt) => o.push({ k: 'D', a, b, yon, off, txt: txt != null ? String(txt) : cmS(yon === 'h' ? Math.abs(b[0] - a[0]) : Math.abs(b[1] - a[1])) }),
      /* zincir ölçü: noktalar (x ya da y), sabit diğer koordinat, uzaklık */
      Z: (vals, sabit, yon, off) => { for (let i = 1; i < vals.length; i++) { const a = yon === 'h' ? [vals[i - 1], sabit] : [sabit, vals[i - 1]], b = yon === 'h' ? [vals[i], sabit] : [sabit, vals[i]]; f.D(a, b, yon, off); } },
      H: (pts, mat) => o.push({ k: 'H', pts, mat }),
      B: (p, s, hp, ol) => o.push({ k: 'B', p, s, hp: hp || 4, ol }),
      /* açıklama: elemandaki nokta → yazı (yazı kâğıtta mm) */
      AC: (p, q, s, mm) => { const sag = q[0] >= p[0], u = 2 * k; f.L(p, q, 'YAZI'); f.L(q, [q[0] + (sag ? u : -u), q[1]], 'YAZI'); f.T([q[0] + (sag ? u * 1.4 : -u * 1.4), q[1] + 0.5 * k], s, mm || 2, sag ? 'L' : 'R'); },
      /* kırık çizgi (kesilen duvar / döşeme ucu) */
      KIRIK: (a, b, ly) => { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]) || 1, u = [d[0] / l, d[1] / l], n = [-u[1], u[0]], z = 1.5 * k;
        f.P([a, [m[0] - u[0] * z, m[1] - u[1] * z], [m[0] - u[0] * z * 0.3 + n[0] * z * 1.6, m[1] - u[1] * z * 0.3 + n[1] * z * 1.6], [m[0] + u[0] * z * 0.3 - n[0] * z * 1.6, m[1] + u[1] * z * 0.3 - n[1] * z * 1.6], [m[0] + u[0] * z, m[1] + u[1] * z], b], false, ly || 'DETAY_GORUNEN'); },
      /* kesit işareti (detay içinde 1-1 / 2-2): kısa kalın çizgi + numara */
      KI: (p, yon, ad) => { const L = 6 * k, d = yon === 'h' ? [1, 0] : [0, 1]; f.L(p, [p[0] + d[0] * L, p[1] + d[1] * L], 'KESIT_ISARET'); f.T([p[0] + d[0] * L * 0.5 + (yon === 'h' ? 0 : 1.2 * k), p[1] + d[1] * L * 0.5 + (yon === 'h' ? 1.2 * k : 0)], ad, 3, 'L', 'YAZI'); },
      ALT: (p, s) => f.T(p, s, 3, 'C', 'YAZI'),
    };
    return f;
  };
  const kutu = items => { const b = [Infinity, Infinity, -Infinity, -Infinity], e = q => { if (!q) return; b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); };
    for (const it of items) { if (it.k === 'L' || it.k === 'D') { e(it.a); e(it.b); } else if (it.k === 'P' || it.k === 'H') it.pts.forEach(e); else if (it.k === 'C' || it.k === 'A') { e([it.c[0] - it.r, it.c[1] - it.r]); e([it.c[0] + it.r, it.c[1] + it.r]); } else if (it.p) e(it.p); }
    return b; };

  /* ---------- 1) KAPI / PENCERE ---------- */
  /* pencere kanat sayısı (Çokal İdari: 50 ve 80 cm tek, 150 cm iki, 200 cm üç kanat); model kanat sayısı verdiyse o */
  const kanatSayisi = t => (t.kanat > 1 ? t.kanat : t.w <= 90 ? 1 : t.w <= 180 ? 2 : 3);
  /* açılan kanatlar: tek kanat açılır; iki kanatta sağdaki, üç ve fazlasında baştaki ve sondaki (Çokal P1 / P2) */
  const acilanlar = n => n === 1 ? [0] : n === 2 ? [1] : [0, n - 1];
  /* t: { kod, onek, tur, w, h (cm), parapet, adet, kanat, malzeme, baslik, duvar (cm), yon, panel (m) }. o: { sc (1/20) }.
     Döner: { items, bb, parca: { gorunus, kesit22, kesit11 } } — başlangıç: doğramanın dış sol alt köşesi (0, 0) */
  const dogramaDetay = (t, o = {}) => {
    const sc = o.sc || 20, D = liste(sc), k = D.k, W = t.w / 100, H = t.h / 100, td = Math.max(0.1, (t.duvar || 20) / 100);
    const kapi = t.onek === 'K', sek = t.onek === 'SEK', f = kapi ? 0.05 : sek ? 0.08 : 0.06;
    const parca = {};
    // ---- GÖRÜNÜŞ ----
    if (sek) {
      D.R(0, 0, W, H); D.R(f, 0, W - f, H - f); // kılavuz raylar ve üst kasa
      const np = Math.max(3, Math.round(H / (t.panel || 0.5))), ph = (H - f) / np;
      for (let i = 1; i < np; i++) D.L([f, i * ph], [W - f, i * ph]);
      for (let i = 0; i < np; i++) D.L([f + 0.05, i * ph + ph * 0.5], [W - f - 0.05, i * ph + ph * 0.5], 'DETAY_GORUNEN', 'HIDDEN'); // panel nervürü
      D.R(W / 2 - 0.08, 0.95, W / 2 + 0.08, 1.0); // kulp
      D.T([W / 2, H * 0.62], 'YALITIMLI SEKSİYONEL PANEL', 2, 'C');
    } else if (kapi) {
      const n = Math.max(1, t.kanat || 1), lw = (W - 2 * f) / n, ust = H - f;
      D.P([[0, 0], [0, H], [W, H], [W, 0]], false); D.P([[f, 0], [f, ust], [W - f, ust], [W - f, 0]], false);
      for (let i = 0; i < n; i++) { const x0 = f + i * lw, x1 = x0 + lw; D.R(x0 + 0.005, 0.01, x1 - 0.005, ust - 0.005);
        D.R(x0 + 0.08, 0.15, x1 - 0.08, 0.95); D.R(x0 + 0.08, 1.15, x1 - 0.08, ust - 0.12); // panel
        const mentese = n === 2 ? (i === 0 ? 'L' : 'R') : (t.yon === 'R' ? 'R' : 'L'), hx = mentese === 'L' ? x0 : x1, kx = mentese === 'L' ? x1 : x0;
        D.L([kx, ust - 0.005], [hx, ust / 2], 'DETAY_GORUNEN', 'HIDDEN'); D.L([hx, ust / 2], [kx, 0.01], 'DETAY_GORUNEN', 'HIDDEN'); // açılış: kilit tarafından menteşe tarafına
        const kk = mentese === 'L' ? x1 - 0.07 : x0 + 0.07; D.R(kk - 0.012, 0.98, kk + 0.012, 1.08); D.L([kk, 1.04], [kk + (mentese === 'L' ? -0.12 : 0.12), 1.04]); }
      D.L([-0.1, 0], [W + 0.1, 0]); // bitmiş döşeme
    } else {
      const n = kanatSayisi(t), mw = 0.06, pw = (W - 2 * f - (n - 1) * mw) / n, ac = acilanlar(n);
      D.R(0, 0, W, H);
      for (let i = 0; i < n; i++) { const x0 = f + i * (pw + mw), x1 = x0 + pw, y0 = f, y1 = H - f; D.R(x0, y0, x1, y1);
        if (ac.includes(i)) { D.R(x0 + 0.015, y0 + 0.015, x1 - 0.015, y1 - 0.015); const g = [x0 + 0.06, y0 + 0.06, x1 - 0.06, y1 - 0.06]; D.R(...g);
          if (H < 0.8) { D.L([g[0], g[3]], [(g[0] + g[2]) / 2, g[1]]); D.L([(g[0] + g[2]) / 2, g[1]], [g[2], g[3]]); } // vasistas (alttan menteşe)
          else { const sol = n === 1 || i === 0, hx = sol ? g[0] : g[2], kx = sol ? g[2] : g[0]; D.L([kx, g[3]], [hx, (g[1] + g[3]) / 2]); D.L([hx, (g[1] + g[3]) / 2], [kx, g[1]]); // yandan menteşe
            const kk = sol ? x1 - 0.035 : x0 + 0.035; D.R(kk - 0.01, (y0 + y1) / 2 - 0.06, kk + 0.01, (y0 + y1) / 2 + 0.06); }
        } else { const g = [x0 + 0.02, y0 + 0.02, x1 - 0.02, y1 - 0.02]; D.R(...g); const cx = (g[0] + g[2]) / 2, cy = (g[1] + g[3]) / 2;
          for (let j = 0; j < 3; j++) D.L([cx - 0.06 + j * 0.03, cy - 0.12], [cx + j * 0.03, cy - 0.06]);
          if (pw > 0.35) D.T([cx, cy + 0.04], '4+12+4 ISICAM', 1.8, 'C'); }
      }
      D.R(-0.03, -0.035, W + 0.03, 0); // dış denizlik
      parca.paneller = [0, ...Array.from({ length: n - 1 }, (_, i) => f + (i + 1) * pw + i * mw + mw / 2), W].map(v => +v.toFixed(4));
    }
    // ölçüler: altta zincir + toplam, solda yükseklik
    const zincir = parca.paneller && parca.paneller.length > 2;
    const SR = 250 / sc; // ölçü sıraları arası modelde 0,25 m (firma kuralı 14.11.2026): 1/20'de 12,5 mm
    if (zincir) D.Z(parca.paneller, 0, 'h', -10);
    D.D([0, 0], [W, 0], 'h', zincir ? -10 - SR : -10); const dA = zincir ? 10 + SR : 10; // görünüşün altındaki ölçülerin kâğıtta derinliği
    D.D([0, 0], [0, H], 'v', -10);
    // kesit işaretleri
    D.KI([W / 2, H + 4 * k], 'v', '2'); D.KI([W / 2, -(dA + 5) * k - 6 * k], 'v', '2');
    D.KI([-(16 * k) - 6 * k, H / 2], 'h', '1'); D.KI([W + 4 * k, H / 2], 'h', '1');
    D.ALT([W / 2, -(dA + 17) * k], 'GÖRÜNÜŞ');
    parca.gorunus = [0, 0, W, H];
    // ---- 2-2 KESİTİ (düşey) ----
    const gx = W + Math.max(0.55, 30 * k) + (sek ? 1.3 : 0), ic = gx, dis = gx + td, fx0 = dis - 0.03 - (kapi ? td - 0.03 : 0.07), fx1 = dis - 0.03;
    if (!kapi) {
      const alt = sek ? 0 : -Math.min(0.45, Math.max(0.25, (t.parapet || 100) / 100 * 0.4)), lus = H + 0.25;
      if (!sek) { D.P([[ic, alt], [ic, 0], [dis, 0], [dis, alt]], false, 'DETAY_KESIT'); D.KIRIK([ic, alt], [dis, alt], 'DETAY_KESIT'); D.H([[ic, alt], [dis, alt], [dis, 0], [ic, 0]], 'tugla');
        D.L([ic - 0.02, alt], [ic - 0.02, -0.03]); D.L([dis + 0.02, alt], [dis + 0.02, -0.03]); }
      else D.L([ic - 0.6, 0], [dis + 0.3, 0], 'DETAY_KESIT');
      D.P([[ic, lus], [ic, H], [dis, H], [dis, lus]], false, 'DETAY_KESIT'); D.KIRIK([ic, lus], [dis, lus], 'DETAY_KESIT'); D.H([[ic, H], [dis, H], [dis, lus], [ic, lus]], 'beton');
      D.L([ic - 0.02, H], [ic - 0.02, lus]); D.L([dis + 0.02, H], [dis + 0.02, lus]);
      if (sek) { // panel perdesi, kılavuz ray ve tavan rayı (açık konum kesikli)
        D.R(fx0, 0.005, fx0 + 0.04, H - 0.02, 'DETAY_KESIT'); const r = 0.3, yR = H + 0.02, xR = fx0 - r, ark = [];
        for (let i = 0; i <= 8; i++) { const a = Math.PI / 2 * i / 8; ark.push([xR + r * Math.cos(a), yR - r + r * Math.sin(a) + r]); }
        D.P([[fx0, H - 0.3], ...ark.reverse().map(q => [q[0], q[1] - r]), [fx0 - 1.0, yR]], false, 'DETAY_GORUNEN', 'HIDDEN'); D.AC([fx0 - 0.8, yR], [fx0 - 0.95, yR - 0.45], 'TAVAN RAYI (AÇIK KONUM)', 2);
        D.R(fx0 - 0.9, yR + 0.02, fx0 - 0.5, yR + 0.22); D.AC([fx0 - 0.7, yR + 0.12], [fx0 - 0.95, yR + 0.55], 'MOTOR', 2);
      } else {
        D.R(fx0, 0, fx1, f, 'DETAY_KESIT'); D.R(fx0, H - f, fx1, H, 'DETAY_KESIT'); const cm2 = (fx0 + fx1) / 2;
        D.L([cm2 - 0.012, f + 0.01], [cm2 - 0.012, H - f - 0.01]); D.L([cm2 + 0.012, f + 0.01], [cm2 + 0.012, H - f - 0.01]);
        D.P([[fx1, 0], [dis + 0.05, -0.022], [dis + 0.05, -0.04], [fx1, -0.018]], true, 'DETAY_KESIT'); // dış denizlik (eğimli)
        D.R(ic - 0.04, -0.03, fx0, 0, 'DETAY_KESIT'); // iç denizlik
        D.AC([cm2, H * 0.6], [dis + 0.32, H * 0.75], 'ALÜMİNYUM DOĞRAMA (ISI YALITIMLI)', 2);
        D.AC([cm2, H * 0.45], [dis + 0.32, H * 0.55], '4+12+4 ISICAM', 2);
        D.AC([dis + 0.03, -0.03], [dis + 0.32, 0.12], 'ALÜMİNYUM DIŞ DENİZLİK', 2);
        D.AC([ic + 0.02, -0.015], [ic - 0.3, 0.2], 'MERMER İÇ DENİZLİK (3 cm)', 2);
        D.AC([dis + 0.02, alt + 0.06], [dis + 0.32, alt + 0.02], 'DIŞ SIVA', 2);
        D.AC([ic - 0.02, alt + 0.1], [ic - 0.3, alt + 0.02], 'İÇ SIVA', 2);
      }
      D.D([dis + 0.08, 0], [dis + 0.08, H], 'v', 6);
      if (!sek) D.D([ic, alt], [dis, alt], 'h', -6);
      D.ALT([(ic + dis) / 2, (sek ? -0.02 : alt) - 16 * k], '2-2 KESİTİ');
      parca.kesit22 = [ic, alt, dis, lus];
    }
    // ---- 1-1 KESİTİ (yatay; dış altta, iç üstte) ----
    const lwMax = kapi ? (W - 2 * f) / Math.max(1, t.kanat || 1) : 0, y0 = -(dA + 25) * k - td - (kapi ? lwMax + 0.05 : 0), py = y0, pi = py + td, uz = 0.3; // kapıda açık kanat ve yay görünüşün altında kalır
    for (const [a, b] of [[-uz, 0], [W, W + uz]]) { D.P([[a, py], [b, py], [b, pi], [a, pi]], true, 'DETAY_KESIT'); D.H([[a, py], [b, py], [b, pi], [a, pi]], 'tugla'); }
    D.KIRIK([-uz, py], [-uz, pi], 'DETAY_KESIT'); D.KIRIK([W + uz, py], [W + uz, pi], 'DETAY_KESIT');
    if (kapi) {
      const n = Math.max(1, t.kanat || 1), lw = (W - 2 * f) / n;
      D.R(0, py, f, pi, 'DETAY_KESIT'); D.R(W - f, py, W, pi, 'DETAY_KESIT');
      for (let i = 0; i < n; i++) { const mentese = n === 2 ? (i === 0 ? 'L' : 'R') : (t.yon === 'R' ? 'R' : 'L'), hx = mentese === 'L' ? f + i * lw : f + (i + 1) * lw, sg = mentese === 'L' ? 1 : -1;
        D.R(Math.min(hx, hx + sg * 0.05), pi, Math.max(hx, hx + sg * 0.05), pi + lw, 'DETAY_KESIT'); // açık kanat (90°)
        const ark = []; for (let j = 0; j <= 16; j++) { const a = Math.PI / 2 * j / 16; ark.push([hx + sg * lw * Math.cos(a), pi + lw * Math.sin(a)]); } D.P(ark, false); }
    } else if (sek) { D.R(0, py + 0.02, f, pi - 0.02, 'DETAY_KESIT'); D.R(W - f, py + 0.02, W, pi - 0.02, 'DETAY_KESIT'); D.R(f, pi - 0.06, W - f, pi - 0.02, 'DETAY_KESIT'); }
    else {
      const n = kanatSayisi(t), mw = 0.06, pw = (W - 2 * f - (n - 1) * mw) / n, ya = py + 0.03, yb = py + 0.10;
      D.R(0, ya, f, yb, 'DETAY_KESIT'); D.R(W - f, ya, W, yb, 'DETAY_KESIT');
      for (let i = 1; i < n; i++) { const x = f + i * pw + (i - 1) * mw; D.R(x, ya, x + mw, yb, 'DETAY_KESIT'); }
      D.L([f, (ya + yb) / 2 - 0.012], [W - f, (ya + yb) / 2 - 0.012]); D.L([f, (ya + yb) / 2 + 0.012], [W - f, (ya + yb) / 2 + 0.012]);
      D.R(-0.03, py - 0.03, W + 0.03, py + 0.03, 'DETAY_GORUNEN', 'HIDDEN'); // denizlik (altta, kesikli)
    }
    D.D([0, py], [W, py], 'h', -8); D.T([W + uz + 0.05, py + td / 2], 'DIŞ', 2, 'L'); D.T([W + uz + 0.05, pi + 0.03], 'İÇ', 2, 'L');
    D.ALT([W / 2, py - 18 * k], '1-1 KESİTİ');
    parca.kesit11 = [-uz, py, W + uz, kapi ? pi + lwMax : pi];
    // ---- başlık ve adet ----
    const bb = kutu(D.o), tx = (bb[0] + bb[2]) / 2, ty = bb[3] + 12 * k;
    D.B([tx, ty], t.baslik, 4, '1/' + sc); D.T([tx + (String(t.baslik).length * 4 * 0.42 + 8) * k, ty + 0.5 * k], `(${t.adet} ADET)`, 3, 'L');
    return { items: D.o, bb: kutu(D.o), parca };
  };

  /* ---------- 2) KORKULUK ---------- */
  /* korkuluk tipleri: aynı yükseklik, dikme aralığı, malzeme ve tekmelik bir tip; boy toplanır.
     kayitlar: [{ kh (cm), dik (cm), km, tk, boy (m), yer }] → [{ kod, kh, dik, km, tk, boy, n, yerler }] */
  const korkulukTipleri = kayitlar => {
    const G = new Map();
    for (const r of kayitlar || []) { const kh = Math.round(+r.kh || 110), dik = Math.round(+r.dik || 150), km = r.km || 'galvaniz', tk = r.tk === 'H' ? 'H' : 'E', key = [kh, dik, km, tk].join('|');
      if (!G.has(key)) G.set(key, { kh, dik, km, tk, boy: 0, n: 0, yerler: [] }); const g = G.get(key); g.boy += +r.boy || 0; g.n++; if (r.yer && !g.yerler.includes(r.yer)) g.yerler.push(r.yer); }
    return [...G.values()].sort((a, b) => b.boy - a.boy).map((g, i) => Object.assign(g, { kod: 'KR' + (i + 1), boy: Math.round(g.boy * 100) / 100 }));
  };
  /* t: { kod, kh, dik (cm), km (malzeme adı), tk, boy (m) }. Görünüş (iki aralık) + yan kesit (ankraj).
     Boru çapları modeldeki korkulukla aynı (app/merdiven.js railRun): Ø42,4 küpeşte ve dikme, Ø33,7 ara küpeşte, 150 × 4 mm tekmelik. */
  const KORK = { kup: 0.0424, ara: 0.0337, dikme: 0.0424, tekH: 0.15, tekT: 0.004, plaka: 0.12, plakaT: 0.01, dubel: 0.10, dos: 0.15 };
  const korkulukDetay = (t, o = {}) => {
    const sc = o.sc || 20, D = liste(sc), k = D.k, kh = (t.kh || 110) / 100, sp = Math.max(0.5, Math.min(2.0, (t.dik || 150) / 100)), K = KORK, x0 = 0.25, Ls = 2 * sp + 2 * x0, rD = K.dikme / 2;
    // görünüş: döşeme şeridi (iki ucu kırık), dikmeler, küpeşte, ara küpeşte, tekmelik, taban plakaları
    D.L([0, 0], [Ls, 0], 'DETAY_KESIT'); D.L([0, -K.dos], [Ls, -K.dos], 'DETAY_KESIT'); D.KIRIK([0, 0], [0, -K.dos], 'DETAY_KESIT'); D.KIRIK([Ls, 0], [Ls, -K.dos], 'DETAY_KESIT');
    D.H([[0, -K.dos], [Ls, -K.dos], [Ls, 0], [0, 0]], 'beton');
    const xs = [x0, x0 + sp, x0 + 2 * sp];
    for (const x of xs) { D.R(x - rD, K.plakaT, x + rD, kh - K.kup / 2, 'DETAY_KORKULUK'); D.R(x - K.plaka / 2, 0, x + K.plaka / 2, K.plakaT, 'DETAY_KORKULUK'); }
    /* ara birleştirme (Çokal 10-İdari Bina_R2 rampa korkuluğu, A-A kesiti 1/20, Korkuluk katmanı): ara küpeşte dikmeler arasında parça parça, dikme yüzünde
       dışbükey yayla biter (yay yarıçapı 0,61 × boru çapı, merkezi yüzden 0,34 × çap dışarıda, ±55°: örnekte 4,4 cm boruda r 2,69 cm, 1,5 cm); küpeşte dikmelerin
       üstünden kesintisiz geçer, her dikmenin üstünde birleşim yayı (merkez dikme ekseninde) */
    D.R(0, kh - K.kup / 2, Ls, kh + K.kup / 2, 'DETAY_KORKULUK');
    { const Dr = K.ara, yc = kh / 2, ys = [yc - Dr / 2, yc + Dr / 2], uc = [0, ...xs.flatMap(x => [x - rD, x + rD]), Ls];
      for (let i = 0; i + 1 < uc.length; i += 2) for (const y of ys) D.L([uc[i], y], [uc[i + 1], y], 'DETAY_KORKULUK');
      for (const x of xs) { D.A([x - rD - 0.34 * Dr, yc], 0.61 * Dr, -55, 55, 'DETAY_KORKULUK'); D.A([x + rD + 0.34 * Dr, yc], 0.61 * Dr, 125, 235, 'DETAY_KORKULUK');
        D.A([x, kh + K.kup / 2 - 0.32 * K.kup], 0.61 * K.kup, 215, 325, 'DETAY_KORKULUK'); } }
    if (t.tk !== 'H') D.R(0, K.plakaT, Ls, K.tekH, 'DETAY_KORKULUK');
    D.KIRIK([0, kh + 0.06], [0, kh - 0.06], 'DETAY_KORKULUK'); D.KIRIK([Ls, kh + 0.06], [Ls, kh - 0.06], 'DETAY_KORKULUK');
    const SR = 250 / sc; D.Z(xs, kh + K.kup / 2, 'h', 8); D.D([xs[0], kh + K.kup / 2], [xs[2], kh + K.kup / 2], 'h', 8 + SR); // sıralar arası modelde 0,25 m
    const dz = [0, ...(t.tk !== 'H' ? [K.tekH] : []), kh / 2, kh]; D.Z(dz, 0, 'v', -8); D.D([0, 0], [0, kh], 'v', -8 - SR);
    D.AC([Ls * 0.62, kh], [Ls * 0.7, kh + 0.3], 'Ø42,4 KÜPEŞTE BORUSU', 2);
    D.AC([Ls * 0.78, kh / 2], [Ls * 0.86, kh / 2 + 0.25], 'Ø33,7 ARA KÜPEŞTE', 2);
    D.AC([xs[0] + rD + 0.01, kh / 2 + K.ara / 2], [xs[0] + 0.35, kh / 2 + 0.2], 'ARA BİRLEŞTİRME', 2);
    D.AC([xs[1], kh * 0.3], [xs[1] + 0.35, kh * 0.33], `Ø42,4 DİKME @${Math.round(sp * 100)} cm`, 2);
    if (t.tk !== 'H') D.AC([Ls * 0.4, K.tekH * 0.6], [Ls * 0.45, -0.32], '150×4 mm TEKMELİK LAMASI', 2);
    D.ALT([Ls / 2, -K.dos - 22 * k], 'GÖRÜNÜŞ');
    // yan kesit: döşeme kenarı, dikme, küpeşteler (daire), tekmelik, taban plakası ve dübeller
    const gx = Ls + Math.max(0.9, 45 * k);
    const dos = [[gx - 0.5, -K.dos], [gx + 0.1, -K.dos], [gx + 0.1, 0], [gx - 0.5, 0]]; D.P(dos, false, 'DETAY_KESIT'); D.KIRIK([gx - 0.5, 0], [gx - 0.5, -K.dos], 'DETAY_KESIT'); D.H(dos, 'beton');
    D.R(gx - rD, K.plakaT, gx + rD, kh - K.kup / 2, 'DETAY_KORKULUK'); D.R(gx - K.plaka / 2, 0, gx + K.plaka / 2, K.plakaT, 'DETAY_KESIT');
    D.C([gx, kh], K.kup / 2, 'DETAY_KESIT'); D.C([gx, kh / 2], K.ara / 2, 'DETAY_KESIT');
    if (t.tk !== 'H') D.R(gx + rD, K.plakaT, gx + rD + K.tekT, K.tekH, 'DETAY_KESIT');
    for (const dx of [-0.04, 0.04]) D.L([gx + dx, 0], [gx + dx, -K.dubel], 'DETAY_KESIT', 'HIDDEN');
    D.D([gx + 0.1, 0], [gx + 0.1, kh], 'v', 8);
    D.AC([gx + 0.05, K.plakaT / 2], [gx + 0.35, 0.22], `${Math.round(K.plaka * 1000)}×${Math.round(K.plaka * 1000)}×${Math.round(K.plakaT * 1000)} mm TABAN PLAKASI`, 2);
    D.AC([gx + 0.04, -K.dubel * 0.6], [gx + 0.35, -0.2], '2 ADET M12 KİMYASAL DÜBEL (L = 10 cm)', 2);
    D.AC([gx - 0.3, -K.dos / 2], [gx - 0.55, -0.32], 'BETONARME DÖŞEME', 2);
    D.ALT([gx, -K.dos - 22 * k], 'KESİT');
    D.T([0, kh + K.kup / 2 + (8 + 250 / sc + 7) * k], `${String(t.mal || 'SICAK DALDIRMA GALVANİZ').toLocaleUpperCase('tr')} — h = ${Math.round(kh * 100)} cm${t.boy ? ` — TOPLAM ${String((+t.boy).toFixed(2)).replace('.', ',')} m` : ''}`, 2.5, 'L');
    const bb = kutu(D.o), tx = (bb[0] + bb[2]) / 2, ty = bb[3] + 12 * k;
    D.B([tx, ty], `${t.kod || 'KR1'} KORKULUK DETAYI (h=${Math.round(kh * 100)} cm)`, 4, '1/' + sc);
    return { items: D.o, bb: kutu(D.o), xs };
  };

  /* ---------- 3) SAC KAPAK TİPLERİ (döşeme boşluklarından) ---------- */
  /* bosluklar: [{ w, l (m, plan ölçüleri), yer }] → [{ ad: 'SK1', w (kısa), l (uzun), adet, yer: [] }] (aynı ölçü aynı tip, küçükten büyüğe) */
  const kapakTipleri = bosluklar => {
    const G = new Map();
    for (const b of bosluklar || []) { const w = Math.round(Math.min(b.w, b.l) * 100) / 100, l = Math.round(Math.max(b.w, b.l) * 100) / 100; if (!(w > 0.2) || l > 3.0) continue; const key = w + '|' + l;
      if (!G.has(key)) G.set(key, { w, l, adet: 0, yer: [] }); const g = G.get(key); g.adet++; if (b.yer && !g.yer.includes(b.yer)) g.yer.push(b.yer); }
    return [...G.values()].sort((a, b) => a.w * a.l - b.w * b.l).map((g, i) => Object.assign({ ad: 'SK' + (i + 1) }, g));
  };

  /* ---------- 4) ÇATI EĞİM OKU (plan): parça normali ve eğim yüzdesi ---------- */
  const egimYuzde = deg => Math.round(Math.tan((+deg || 0) * Math.PI / 180) * 100);

  const api = { liste, kutu, dogramaDetay, kanatSayisi, acilanlar, korkulukTipleri, korkulukDetay, KORK, kapakTipleri, egimYuzde };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!C) return;
  C.mimariDetayApi = api;

  /* ======================= MODEL BAĞLANTISI ======================= */
  const mt = () => (C.cizimKural && C.cizimKural.MIMARI && C.cizimKural.MIMARI.kesitTarama && C.cizimKural.MIMARI.kesitTarama.malzeme) || {};
  const taramaOf = mat => { if (mat === 'solid') return { pat: 'SOLID', sc: 1 }; const q = mt()[mat]; if (q && (C.HATCH_PATTERNS || {})[q.desen] !== undefined) return { pat: q.desen, sc: q.sc, ang: q.aci || 0, ann: q.gercek ? false : undefined };
    return mat === 'tugla' ? { pat: 'AR-B816', sc: 0.394, ann: false } : { pat: 'ANSI36', sc: 0.3937 }; };
  const KATMAN = { DETAY_GORUNEN: [8, 'CONTINUOUS', 15], DETAY_KESIT: [7, 'CONTINUOUS', 50], DETAY_KORKULUK: [151, 'CONTINUOUS', 25], DETAY_TARAMA: [8, 'CONTINUOUS', 9], DETAY_OLCU: [3, 'CONTINUOUS', 18], KESIT_ISARET: [133, 'CONTINUOUS', 15], YAZI: [7, 'CONTINUOUS', 25] };
  /* çizim listesini görünüm grubuna (gv) çiz: base = modelde sol alt (liste koordinatı 0, 0'ın yeri), sc = pafta penceresi ölçeği */
  C.mimariDetayCiz = (items, base, gv, sc) => {
    const k = sc / 1000, X = q => [base[0] + q[0], base[1] + q[1], 0];
    for (const [ad, v] of Object.entries(KATMAN)) if (C.ensureLayer) C.ensureLayer(ad, v[0], v[1], v[2]);
    const mk = (type, p) => { const e = C.add(C.newEnt(type, Object.assign({ gv }, p))); if (e) { delete e.sp; delete e.sv2; } return e; };
    for (const it of items) {
      const ly = it.ly || 'DETAY_GORUNEN', lt = it.lt ? { lt: it.lt } : {};
      if (it.k === 'L') mk('line', Object.assign({ a: X(it.a), b: X(it.b), layer: ly }, lt));
      else if (it.k === 'P') mk('pline', Object.assign({ pts: it.pts.map(X), closed: it.cl, layer: ly }, lt));
      else if (it.k === 'C') mk('circle', { c: X(it.c), r: it.r, layer: ly });
      else if (it.k === 'A') mk('arc', { c: X(it.c), r: it.r, a0: it.a0, a1: it.a1, layer: ly });
      else if (it.k === 'T') mk('text', { p: X(it.p), h: it.mm * k, s: it.s, rot: it.rot || 0, al: it.al, layer: ly, ann: false });
      else if (it.k === 'D') { const a = X(it.a), b = X(it.b), off = it.off * k, p = it.yon === 'h' ? [a[0], a[1] + off, 0] : [a[0] + off, a[1], 0]; mk('dim', { k: it.yon === 'v' ? 'v' : 'h', a, b, p, txt: it.txt, layer: 'DETAY_OLCU' }); }
      else if (it.k === 'H') { const s = taramaOf(it.mat); mk('hatch', Object.assign({ loops: [it.pts.map(q => { const w = X(q); return [w[0], w[1]]; })], pat: s.pat, sc: s.sc, ang: s.ang || 0, orig: [base[0], base[1]], layer: 'DETAY_TARAMA' }, s.ann === false ? { ann: false } : {})); }
      else if (it.k === 'B') mk(C.T.baslik ? 'baslik' : 'text', C.T.baslik ? { p: X(it.p), s: it.s, hp: it.hp, layer: 'YAZI', ol: it.ol } : { p: X(it.p), h: it.hp * k, s: it.s, al: 'C', layer: 'YAZI' });
    }
  };
  /* hücre çerçevesi (Çokal İdari doğrama tablosu gibi): görünümün kapsamı + pay (kâğıt mm) */
  C.mimariDetayCerceve = (gv, sc, payMm) => {
    const ents = C.doc.ents.filter(e => e.gv === gv); ents.forEach(e => { delete e._c; });
    const bb = C.withAnno ? C.withAnno(sc, () => C.extents(ents)) : C.extents(ents); ents.forEach(e => { delete e._c; }); if (!bb) return null;
    const k = sc / 1000, p = (payMm == null ? 6 : payMm) * k, b = [bb[0] - p, bb[1] - p, bb[2] + p, bb[3] + p];
    const e = C.add(C.newEnt('pline', { pts: [[b[0], b[1], 0], [b[2], b[1], 0], [b[2], b[3], 0], [b[0], b[3], 0]], closed: true, layer: 'YAZI', gv })); if (e) delete e.sp; return b;
  };

  /* model korkulukları (korkuluk nesnesi + merdiven korkulukları) */
  C.mimariKorkuluklar = ents => {
    const K = C._mrd && C._mrd.KM, out = [], len = pts => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; };
    for (const e of ents || C.doc.ents) {
      if (e.gv) continue;
      if (e.type === 'korkuluk' && Array.isArray(e.pts)) { const q = e.kapali ? e.pts.concat([e.pts[0]]) : e.pts; out.push({ kh: e.kh, dik: e.dik, km: e.km, tk: e.tk, boy: e._len || len(q), yer: 'Döşeme / galeri kenarı', mal: K && K[e.km] ? K[e.km][0] : null }); }
      else if (e.type === 'merdiven' && e.kork && e.kork !== 'yok') { let L = 0; try { if (!e._q) C.meshes(e); L = (e._q && e._q.kork) || 0; } catch (er) { } out.push({ kh: e.kh, dik: e.dik, km: e.km, tk: e.tk, boy: L, yer: 'Merdiven', mal: K && K[e.km] ? K[e.km][0] : null }); }
    }
    const T = korkulukTipleri(out); for (const t of T) { const r = out.find(q => Math.round(+q.kh || 110) === t.kh && Math.round(+q.dik || 150) === t.dik); t.mal = r && r.mal; } return T;
  };
  /* kesitte korkuluk ara birleştirmeleri (kesit.js çağırır): korkuluk nesnesinin kesit düzlemine paralel parçaları; K: { a, u, n, depth, W, inU } (kesit koordinatı: u boyunca s, düşey z) */
  C.korkulukBirlesimKesit = K => {
    const L = 'GORUNEN_KORKULUK'; if (C.ensureLayer) C.ensureLayer(L, 151, 'CONTINUOUS', 25); let n = 0;
    for (const e of C.doc.ents) { if (e.gv || e.type !== 'korkuluk' || !Array.isArray(e.pts) || e.pts.length < 2 || !C.layer(e.layer).on) continue;
      const kh = (+e.kh || 110) / 100, sp = Math.max(0.5, Math.min(2.0, (+e.dik || 150) / 100)), rD = KORK.dikme / 2, Dr = KORK.ara, q = e.kapali ? e.pts.concat([e.pts[0]]) : e.pts;
      for (let i = 1; i < q.length; i++) { const A = q[i - 1], B = q[i], d = [B[0] - A[0], B[1] - A[1]], l = Math.hypot(d[0], d[1]); if (l < 0.05) continue;
        if (Math.abs((d[0] * K.u[0] + d[1] * K.u[1]) / l) < 0.9) continue; // kesit düzlemine paralel parça
        const np = Math.max(1, Math.ceil(l / sp));
        for (let j = 0; j <= np; j++) { const t = j / np, P = [A[0] + d[0] * t, A[1] + d[1] * t], z = (+A[2] || 0) + ((+B[2] || 0) - (+A[2] || 0)) * t;
          const dist = (P[0] - K.a[0]) * K.n[0] + (P[1] - K.a[1]) * K.n[1], sk = (P[0] - K.a[0]) * K.u[0] + (P[1] - K.a[1]) * K.u[1]; if (dist < -0.05 || dist > K.depth || !K.inU([sk, z])) continue;
          const yc = z + kh / 2, add = (c, r, a0, a1) => { const w = K.W(c); C.add(C.newEnt('arc', { c: [w[0], w[1], 0], r, a0, a1, layer: L })); n++; };
          const sg = Math.sign(d[0] * K.u[0] + d[1] * K.u[1]) || 1, sol = j === 0 ? sg < 0 : j === np ? sg > 0 : true, sag = j === 0 ? sg > 0 : j === np ? sg < 0 : true; // ara küpeşte dikmenin hangi yanında
          if (sol) add([sk - rD - 0.34 * Dr, yc], 0.61 * Dr, -55, 55); if (sag) add([sk + rD + 0.34 * Dr, yc], 0.61 * Dr, 125, 235); add([sk, z + kh + KORK.kup / 2 - 0.32 * KORK.kup], 0.61 * KORK.kup, 215, 325); } } }
    return n;
  };
  /* döşeme boşlukları (asılı döşemelerde tam kalınlığı geçen, 3 m'den küçük): sac kapak yerleri */
  const pip = (q, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  C.mimariKapakBosluklari = ents => {
    const L = ents || C.doc.ents, zMin = Math.min(...L.filter(e => e.type === 'plak' || e.type === 'temel').map(e => (+e.zt || 0) - (+e.t || 0)).filter(isFinite)), out = [];
    for (const e of L) { if (e.gv || e.type !== 'plak' || e.cati || !Array.isArray(e.bosluk3)) continue; const zt = +e.zt || 0, t = +e.t || 0.15; if (zt - t < zMin + 0.5) continue; // zemine oturan döşemedeki kanal / kaide boşlukları kapak değildir
      for (const b of e.bosluk3) { const P = b.pts || []; if (!P.length) continue; const xs = P.map(q => q[0]), ys = P.map(q => q[1]), z0 = Math.min(...P.map(q => q[2] || 0)), z1 = z0 + ((b.d && b.d[2]) || 0);
        if (z0 > zt - t + 0.01 || z1 < zt - 0.01) continue;
        const c = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2], alt = zt - t;
        if (L.some(q => q !== e && !q.gv && Array.isArray(q.pts) && q.pts.length > 2 && ((q.type === 'dolgu' && Math.abs(Math.max(+q.za || 0, +q.zb || 0) - alt) < 0.05) || ((q.type === 'plak' || q.type === 'temel') && Math.abs((+q.zt || 0) - alt) < 0.05)) && pip(c, q.pts))) continue; // altı dolu: kanal / kaide boşluğu, kapak değil
        out.push({ w: Math.max(...xs) - Math.min(...xs), l: Math.max(...ys) - Math.min(...ys), yer: e.ad || 'Döşeme', ts: t }); } }
    return out;
  };
})(typeof window !== 'undefined' ? window.C : null);

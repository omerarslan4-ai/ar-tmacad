/* ArıtmaCAD — ELEKTRİK TESİSATI · HESAP ÇEKİRDEĞİ (saf; Node ile denenir: node test/elektrik.test.js)
   Bina iç tesisatı (ilk iş: bekçi binası; örnek Çorlu AAT B-105 E-BB 001/002/003):
     katalog        : armatür, priz, anahtar, kablo (NYA / NYY akım taşıma), sigorta serisi, mahal tipine göre aydınlatma düzeyi ve donanım
     aydınlatma     : lümen yöntemi  N = E·A / (Φ·η·MF)  (oda indeksi k = a·b / (hm·(a+b)), bakım katsayısı 0,80 — Çorlu hesabındaki değer)
     yerleşim       : armatür ızgarası, linye gruplama (ışık en çok 9, priz en çok 7 sorti), faz dağılımı (R, S, T dengeli)
     yük            : yükleme cetveli (kurulu güç, diversite, işletme gücü), ana şalter, kaçak akım, besleme kablosu (akım + gerilim düşümü)
     topraklama     : temel topraklaması şerit boyu, halka + çubuk yayılma direnci, dokunma gerilimi koşulu
     zayıf akım     : telefon prizi, dedektör sayısı (duman 60 m², ısı 30 m²), buton, klakson
     şema / cetvel  : tek hat şeması ve yükleme cetveli çizimi (kâğıt mm; { L:[[x1,y1,x2,y2,stil]], T:[[x,y,h,yazı,hiza,açı,renk]] })
   Birimler: uzunluk m, güç W, akım A, gerilim V. Çizim ölçüleri kural tablosundan (cizim-kural.js → ELEKTRIK). */
(function (C) {
  'use strict';
  const EL = {};

  /* ======================= KATALOG ======================= */
  /* armatür: W = sürücü dahil güç, lm = armatür ışık akısı; boy (m) gövde boyu (planda gerçek boyda çizilir).
     Firma kuralı 15.11.2026: aydınlatma armatürleri LED. Kod Çorlu biçiminde: P = normal (IP40), U = etanş (IP65). Floresan kodları eski dosyalar için kalır. */
  EL.ARMATUR = {
    'P-LED36W': { ad: 'LED LİNEER ARMATÜR', W: 36, lm: 4300, ip: 40, etans: false, boy: 1.20, led: true, K: 4000, Ra: 80, omur: 50000, govde: 'sıva üstü, opal difüzörlü alüminyum gövde 1200x70x50 mm' },
    'P-LED18W': { ad: 'LED LİNEER ARMATÜR', W: 18, lm: 2150, ip: 40, etans: false, boy: 0.60, led: true, K: 4000, Ra: 80, omur: 50000, govde: 'sıva üstü, opal difüzörlü alüminyum gövde 600x70x50 mm' },
    'U-LED36W': { ad: 'LED ETANŞ ARMATÜR', W: 36, lm: 4000, ip: 65, etans: true, boy: 1.27, led: true, K: 4000, Ra: 80, omur: 50000, govde: 'polikarbonat gövde ve difüzör, paslanmaz klips 1270x90x80 mm' },
    'U-LED18W': { ad: 'LED ETANŞ ARMATÜR', W: 18, lm: 2000, ip: 65, etans: true, boy: 0.67, led: true, K: 4000, Ra: 80, omur: 50000, govde: 'polikarbonat gövde ve difüzör, paslanmaz klips 670x90x80 mm' },
    'ACİL': { ad: 'LED ACİL ÇIKIŞ ARMATÜRÜ (3 SAAT)', W: 3, lm: 150, ip: 42, etans: false, boy: 0.30, acil: true, led: true, K: 6500, govde: 'kendinden akülü (Ni-Cd 3,6 V), "ÇIKIŞ" yönlendirme etiketli, sürekli / kesintide yanar' },
    'APLİK': { ad: 'LED ETANŞ DUVAR APLİĞİ', W: 15, lm: 1500, ip: 65, etans: true, boy: 0.30, dis: true, led: true, K: 4000, Ra: 80, govde: 'alüminyum döküm gövde, fotoselli' },
    'P-2x20W': { ad: 'FLORESANT ARMATÜR (IP42)', W: 50, lm: 2500, ip: 42, etans: false, boy: 0.52, eski: true },
    'P-2x40W': { ad: 'FLORESANT ARMATÜR (IP42)', W: 95, lm: 5800, ip: 42, etans: false, boy: 1.04, eski: true },
    'U-2x20W': { ad: 'ETANŞ FLORESANT ARMATÜR (IP54)', W: 50, lm: 2400, ip: 54, etans: true, boy: 0.52, eski: true },
    'U-2x40W': { ad: 'ETANŞ FLORESANT ARMATÜR (IP54)', W: 95, lm: 5500, ip: 54, etans: true, boy: 1.04, eski: true },
  };
  EL.PRIZ_W = 300;          // priz sortisi başına güç (Çorlu cetveli: 2 priz 600 W, 3 priz 900 W)
  EL.SIGORTA = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250];
  /* NYY 0,6/1 kV, Cu, toprakta, çok damarlı: kesit mm² → akım taşıma (A) */
  EL.NYY = [[1.5, 27], [2.5, 36], [4, 47], [6, 59], [10, 79], [16, 102], [25, 133], [35, 159], [50, 188], [70, 232], [95, 280], [120, 318]];
  /* NYA boru içinde (3 yüklü iletken) */
  EL.NYA = [[1.5, 15.5], [2.5, 21], [4, 28], [6, 36], [10, 50]];
  EL.k = 56;                // bakır iletkenlik (m / Ω·mm²)
  /* mahal tipi (ada göre): aydınlatma düzeyi lx (TS EN 12464-1), etanş, priz sortisi, telefon prizi, dedektör */
  EL.MAHAL = [
    { re: /WC|TUVALET|BANYO|DUŞ|DUS|LAVABO|HELA/i, ad: 'Islak hacim', lx: 200, etans: true, priz: 0, tlf: 0, ded: null },
    { re: /MUTFAK|ÇAY|CAY|OFİS ?MUTFAK/i, ad: 'Mutfak', lx: 300, etans: false, priz: 3, tlf: 0, ded: 'isi' },
    { re: /SOYUNMA|GİYİNME|GIYINME|DOLAP/i, ad: 'Soyunma', lx: 200, etans: false, priz: 1, tlf: 0, ded: 'duman' },
    { re: /DEPO|ARŞİV|ARSIV/i, ad: 'Depo', lx: 100, etans: false, priz: 1, tlf: 0, ded: 'duman' },
    { re: /PANO|ELEKTRİK|ELEKTRIK|TRAFO|JENERATÖR|JENERATOR|POMPA|BLOWER|KAZAN|TEKNİK|TEKNIK|MAKİNE|MAKINE/i, ad: 'Teknik hacim', lx: 200, etans: true, priz: 2, tlf: 0, ded: 'duman' },
    { re: /KORİDOR|KORIDOR|HOL|ANTRE|GİRİŞ|GIRIS|MERDİVEN|MERDIVEN/i, ad: 'Dolaşım', lx: 100, etans: false, priz: 1, tlf: 0, ded: 'duman' },
    { re: /DANIŞMA|DANISMA|BEKÇİ|BEKCI|KONTROL|OFİS|OFIS|ODA|MÜDÜR|MUDUR|TOPLANTI|LABORATUVAR/i, ad: 'Çalışma odası', lx: 300, etans: false, priz: 3, tlf: 1, ded: 'duman' },
  ];
  EL.MAHAL_GENEL = { ad: 'Genel', lx: 300, etans: false, priz: 3, tlf: 1, ded: 'duman' };
  EL.mahalTip = ad => EL.MAHAL.find(t => t.re.test(String(ad || ''))) || EL.MAHAL_GENEL;

  /* ======================= YARDIMCILAR ======================= */
  const ust = (seri, v) => seri.find(x => x >= v - 1e-9) || seri[seri.length - 1];
  EL.sigortaSec = I => ust(EL.SIGORTA, I);
  const ara = (xs, ys, x) => { if (x <= xs[0]) return ys[0]; for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]); return ys[ys.length - 1]; };

  /* ======================= AYDINLATMA ======================= */
  /* oda indeksi → kullanma (yararlanma) faktörü η — açık renkli tavan / duvar (0,7 / 0,5 / 0,2), tavana monte floresan */
  const K_ = [0.6, 0.8, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0], ETA = [0.31, 0.38, 0.44, 0.49, 0.53, 0.58, 0.62, 0.65, 0.69, 0.72];
  EL.eta = k => ara(K_, ETA, k);
  /* o: { a, b (oda kenarları m), A (alan, verilmezse a·b), h (tavan yüksekliği), hc (çalışma düzlemi, 0,85), E (lx), arm (kod), MF (0,8) } */
  EL.aydinlatma = o => {
    const a = Math.max(0.5, +o.a || 1), b = Math.max(0.5, +o.b || 1), A = +o.A || a * b, hm = Math.max(0.5, (+o.h || 2.8) - (o.hc == null ? 0.85 : +o.hc));
    const ar = EL.ARMATUR[o.arm] || EL.ARMATUR['P-LED36W'], MF = +o.MF || 0.8, E = +o.E || 300, k = a * b / (hm * (a + b)), eta = EL.eta(k);
    const N = Math.max(1, Math.ceil(E * A / (ar.lm * eta * MF) - 1e-9)), Eg = N * ar.lm * eta * MF / A;
    return { a, b, A, hm, k, eta, MF, E, N, Eg, W: N * ar.W, Wm2: N * ar.W / A, arm: o.arm || 'P-LED36W', lm: ar.lm };
  };
  /* armatür tipi: etanş mahalde U, alan büyükse 2x40W */
  EL.armaturSec = (A, etans) => (etans ? 'U-' : 'P-') + (A > 12 ? 'LED36W' : 'LED18W'); // LED (firma kuralı 15.11.2026)
  EL.armaturAciklama = k => { const a = EL.ARMATUR[k]; if (!a) return k; return `${k} ${a.ad}${a.led ? '' : ''} · ${a.W} W · ${a.lm} lm${a.K ? ' · ' + a.K + ' K' : ''}${a.Ra ? ' · Ra≥' + a.Ra : ''} · IP${a.ip}${a.omur ? ' · ömür ' + (a.omur / 1000) + '.000 saat (L70)' : ''}`; };
  /* N armatürün a × b odadaki ızgarası: yerel koordinat (0..a, 0..b) */
  EL.izgara = (N, a, b) => {
    let nx = Math.max(1, Math.round(Math.sqrt(N * a / b))); nx = Math.min(nx, N); const ny = Math.ceil(N / nx), out = [];
    for (let j = 0; j < ny; j++) { const n = j < ny - 1 ? nx : N - nx * (ny - 1); for (let i = 0; i < n; i++) out.push([a * (i + 0.5) / n, b * (j + 0.5) / ny]); }
    return out;
  };
  /* armatür yerleri: ızgara noktaları oda kutusundan gelir; L biçimli / girintili odada nokta duvara ya da öbür odaya düşebilir
     (kullanıcı 15.11.2026: "lamba duvarın içine girmiş"). Her armatür gövdesiyle birlikte odanın içinde, merkezi duvarlardan en az
     0,5 m, uçları en az 0,25 m içeride olmalı; olmayan nokta en yakın uygun noktaya kaydırılır, armatürler birbirine 0,9 m'den yaklaşmaz.
     pts: oda iç yüz çokgeni, ideal: [[x,y]…], ang: gövde doğrultusu (rad), boy: gövde boyu (m) */
  const icinde = (p, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const kenarUzak = (p, pts) => { let d = Infinity; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1e-12, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l2)); d = Math.min(d, Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vy * t)); } return d; };
  EL.kenarUzak = kenarUzak; EL.icinde = icinde;
  EL.armaturYeri = (pts, ideal, ang, boy, o = {}) => {
    const u = [Math.cos(ang || 0), Math.sin(ang || 0)], h = (+boy || 1.2) / 2 + 0.05, dm = o.duvar == null ? 0.5 : o.duvar, du = o.uc == null ? 0.25 : o.uc, ara = o.ara == null ? 0.9 : o.ara;
    const uygun = (p, dm2 = dm, du2 = du) => { if (!icinde(p, pts) || kenarUzak(p, pts) < dm2) return false; for (const s of [-1, 1]) { const q = [p[0] + u[0] * h * s, p[1] + u[1] * h * s]; if (!icinde(q, pts) || kenarUzak(q, pts) < du2) return false; } return true; };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    const g = Math.max(0.05, Math.min(0.1, (x1 - x0) / 60, (y1 - y0) / 60)), aday = [];
    for (let x = x0 + g / 2; x < x1; x += g) for (let y = y0 + g / 2; y < y1; y += g) if (uygun([x, y])) aday.push([x, y]);
    if (!aday.length) { /* çok küçük oda: gövde sığmıyorsa en ortadaki iç nokta */ let best = null, bd = -1; for (let x = x0 + g / 2; x < x1; x += g) for (let y = y0 + g / 2; y < y1; y += g) { const p = [x, y]; if (!icinde(p, pts)) continue; const d = kenarUzak(p, pts); if (d > bd) { bd = d; best = p; } } return best ? [best] : []; }
    const out = [], uzak = p => out.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) >= ara);
    for (const p of ideal) {
      if (uygun(p) && uzak(p)) { out.push([p[0], p[1]]); continue; }
      let best = null, bd = Infinity; for (const q of aday) { if (!uzak(q)) continue; const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = q; } }
      if (!best) for (const q of aday) { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = q; } }
      if (best) out.push([+best[0].toFixed(3), +best[1].toFixed(3)]);
    }
    return out;
  };

  /* ======================= LİNYELER, FAZ, YÜK ======================= */
  /* cihazlar: [{ tur:'isik'|'priz', W, mahal }] (sırasıyla, mahal mahal) → linyeler */
  EL.linyeGrupla = (cihazlar, o = {}) => {
    const iMax = o.isikMax || 9, pMax = o.prizMax || 7, iW = o.isikWmax || 1500, out = [];
    for (const tur of ['isik', 'priz']) {
      let cur = null;
      for (const c of cihazlar.filter(x => x.tur === tur)) {
        const lim = tur === 'isik' ? iMax : pMax;
        if (!cur || cur.n >= lim || (tur === 'isik' && cur.W + c.W > iW)) { cur = { tur, n: 0, W: 0, cihaz: [], mahal: [] }; out.push(cur); }
        cur.n++; cur.W += c.W; cur.cihaz.push(c); if (c.mahal != null && !cur.mahal.includes(c.mahal)) cur.mahal.push(c.mahal);
      }
    }
    return out;
  };
  /* linye özellikleri: sigorta, kablo, açıklama; ek yükler (motor, yedek) eklenir; numara 01, 02 … */
  EL.linyeler = (gruplar, ek = [], yedek = 2) => {
    const L = [];
    for (const g of gruplar) L.push({ tur: g.tur, W: g.W, isik: g.tur === 'isik' ? g.n : 0, priz: g.tur === 'priz' ? g.n : 0, In: g.tur === 'isik' ? 10 : 16, faz: 1, kablo: '3x2.5 NYA', aciklama: g.tur === 'isik' ? 'IŞIK LİNYESİ' : '1Ø PRİZ LİNYESİ', mahal: g.mahal, cihaz: g.cihaz });
    for (const e of ek) { const f3 = (+e.faz || 1) === 3, I = (+e.W || 0) / ((f3 ? Math.sqrt(3) * 400 : 230) * 0.85); L.push({ tur: 'ek', W: +e.W || 0, isik: 0, priz: 0, In: +e.In || Math.max(16, EL.sigortaSec(I * 1.25)), faz: f3 ? 3 : 1, kablo: e.kablo || (f3 ? '5x4 NYA' : '3x2.5 NYA'), aciklama: String(e.ad || 'EK YÜK').toLocaleUpperCase('tr'), mahal: [] }); }
    for (let i = 0; i < yedek; i++) L.push({ tur: 'yedek', W: 0, isik: 0, priz: 0, In: 10, faz: 1, kablo: '', aciklama: 'YEDEK', mahal: [] });
    L.forEach((x, i) => { x.no = String(i + 1).padStart(2, '0'); });
    return L;
  };
  /* faz dağılımı: 3 fazlılar her faza eşit, tek fazlılar en az yüklü faza (büyükten küçüğe) */
  EL.fazDagit = L => {
    const F = { R: 0, S: 0, T: 0 };
    for (const x of L) if (x.faz === 3) { x.dag = { R: x.W / 3, S: x.W / 3, T: x.W / 3 }; F.R += x.W / 3; F.S += x.W / 3; F.T += x.W / 3; x.fazAd = 'RST'; }
    for (const x of L.filter(q => q.faz !== 3 && q.W > 0).sort((a, b) => b.W - a.W)) { const f = ['R', 'S', 'T'].sort((a, b) => F[a] - F[b])[0]; x.fazAd = f; x.dag = { R: 0, S: 0, T: 0 }; x.dag[f] = x.W; F[f] += x.W; }
    for (const x of L) if (!x.dag) { x.dag = { R: 0, S: 0, T: 0 }; x.fazAd = ''; }
    return F;
  };
  /* yükleme cetveli + ana koruma + besleme. o: { div (%), L (besleme boyu m), cos, ePct (izin verilen gerilim düşümü %) } */
  EL.yuk = (L, o = {}) => {
    const F = EL.fazDagit(L), kurulu = L.reduce((s, x) => s + x.W, 0), div = o.div == null ? 70 : +o.div, isletme = kurulu * div / 100, cos = +o.cos || 0.9;
    const Ib = isletme / (Math.sqrt(3) * 400 * cos), Ik = kurulu / (Math.sqrt(3) * 400 * cos), enB = Math.max(0, ...L.map(x => x.In || 0));
    /* ana şalter: kurulu akımın 1,25 katı, en az 25 A, en büyük çıkıştan bir kademe büyük (seçicilik) */
    const In = Math.max(25, EL.sigortaSec(Ik * 1.25), EL.SIGORTA[Math.min(EL.SIGORTA.length - 1, EL.SIGORTA.indexOf(EL.sigortaSec(enB)) + 1)] || 25);
    const bes = EL.besleme({ P: kurulu, In, L: o.L == null ? 100 : +o.L, ePct: o.ePct || 1.5 });
    const dengesiz = Math.max(F.R, F.S, F.T) ? (Math.max(F.R, F.S, F.T) - Math.min(F.R, F.S, F.T)) / Math.max(F.R, F.S, F.T) * 100 : 0;
    return { F, kurulu, div, isletme, cos, Ib, Ik, In, kak: { In, mA: 30 }, bes, dengesiz };
  };
  /* besleme kablosu (NYY, 3 faz + nötr): Iz ≥ In ve %e = 100·L·P / (k·S·U²) ≤ ePct */
  EL.besleme = ({ P, In, L, ePct = 1.5 }) => {
    const e = S => 100 * L * P / (EL.k * S * 400 * 400);
    let r = EL.NYY.find(([S, Iz]) => Iz >= In && e(S) <= ePct) || EL.NYY[EL.NYY.length - 1];
    if (r[0] < 4) r = EL.NYY.find(q => q[0] === 4); // bina beslemesinde en az 4 mm² (Çorlu: 4x6 NYY)
    return { S: r[0], Iz: r[1], e: e(r[0]), ePct, L, P, ad: `4x${String(r[0]).replace('.', ',')} NYY`, adNokta: `4x${r[0]}mm2 NYY` };
  };
  /* linye gerilim düşümü (tek faz): %e = 200·L·P / (k·S·U²) */
  EL.linyeDusum = (P, Lm, S = 2.5) => 200 * Lm * P / (EL.k * S * 230 * 230);

  /* ======================= TOPRAKLAMA ======================= */
  /* o: { cevre (bina dış çevresi m), alan (m²), rho (Ωm), cubuk (adet), Lc (çubuk boyu m), d (çubuk çapı m), IdN (A) } */
  EL.topraklama = o => {
    const rho = +o.rho || 100, alan = Math.max(1, +o.alan || 25), cevre = Math.max(4, +o.cevre || 20), Lc = +o.Lc || 3, d = +o.d || 0.02, IdN = o.IdN || 0.03;
    const D = 1.13 * Math.sqrt(alan), Rh = 2 * rho / (3 * D);                                   // temel topraklayıcısı (halka) — Topraklamalar Yönetmeliği Ek-P
    const Rc1 = rho / (2 * Math.PI * Lc) * Math.log(4 * Lc / d);                              // tek çubuk
    let n = Math.max(0, o.cubuk == null ? 2 : +o.cubuk), R;
    const hes = n2 => { const Rc = n2 ? Rc1 / n2 * 1.15 : Infinity; return 1 / (1 / Rh + (n2 ? 1 / Rc : 0)); }; // çubuklar arası etkileşim %15
    R = hes(n); const hedef = +o.hedef || 10; while (R > hedef && n < 12) { n++; R = hes(n); }
    const serit = cevre + 2 * 1.0 + n * 1.0;                                                // bina çevresi + pano ve çubuk bağlantıları
    return { rho, D, Rh, Rc1, cubuk: n, R, hedef, serit, Lc, dokunma: R * IdN, uygun: R <= hedef && R * IdN <= 50 };
  };

  /* ======================= ZAYIF AKIM ======================= */
  EL.dedektorSay = (A, tur) => !tur ? 0 : Math.max(1, Math.ceil(A / (tur === 'isi' ? 30 : 60)));

  /* ======================= ŞEMA / CETVEL (kâğıt mm) ======================= */
  const cizer = () => { const g = { L: [], T: [] }; return { g, L: (a, b, c, d, s) => g.L.push([a, b, c, d, s || 'i']), T: (x, y, h, s, al, rot, col) => g.T.push([x, y, h, String(s), al || 'L', rot || 0, col == null ? 2 : col]), B(x, y, w, h, s) { this.L(x, y, x + w, y, s); this.L(x + w, y, x + w, y + h, s); this.L(x + w, y + h, x, y + h, s); this.L(x, y + h, x, y, s); } }; };
  EL._cizer = cizer;
  const yz = (n, d = 0) => (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString('tr-TR');
  /* tek hat şeması: besleme solda üstten, bara yatay, çıkışlar aşağı (yazılar düşey) — BB-002 düzeni */
  EL.tekHat = (L, Y, o = {}) => {
    const c = cizer(), mm = o.mm || { tekHat: 2.16, baslik: 4 }, h = mm.tekHat, adim = 13, x0 = 30, yb = 0, n = L.length, xb1 = x0 + adim * (n - 1);
    c.T(-6, 62, mm.baslik, `${o.pano || 'BBAT'} (Pi=${Math.round(Y.kurulu)}W) TABLO TEK HAT ŞEMASI`, 'L', 0, 2);
    /* besleme: soldan gelen düşey hat, ana şalter, kaçak akım */
    c.L(0, -40, 0, 46, 'k'); c.L(0, 46, 14, 46, 'k'); c.L(14, 46, 14, yb, 'k'); c.L(14, yb, xb1 + 6, yb, 'b');
    c.B(10, 30, 8, 7, 'k'); c.L(10, 30, 18, 37, 'i'); c.T(20, 33.5, h, `3x${Y.In}A.`, 'L', 0, 2); c.T(20, 30, h * 0.8, '3 FAZ', 'L', 0, 2);
    c.B(10, 14, 8, 7, 'k'); c.L(14, 14, 14, 21, 'i'); c.T(20, 18, h, `KCAK-3x${Y.kak.In}A`, 'L', 0, 2); c.T(20, 14.5, h, `(${Y.kak.mA}mA)`, 'L', 0, 2);
    c.T(-3, -38, h, `${Y.bes.adNokta}`, 'L', Math.PI / 2, 2); c.T(-7, -38, h, `${o.besleyen || 'İBAT-1'} PANOSUNDAN`, 'L', Math.PI / 2, 2);
    ['R', 'S', 'T'].forEach((f, i) => c.T(x0 - 8 + i * 4, yb + 2, h * 0.9, f, 'MC', 0, 2));
    L.forEach((x, i) => {
      const xx = x0 + adim * i, yk = yb - 22;
      c.L(xx, yb, xx, yb - 6, 'k'); c.B(xx - 2.5, yb - 13, 5, 7, 'k'); c.L(xx - 2.5, yb - 13, xx + 2.5, yb - 6, 'i'); c.L(xx, yb - 13, xx, yk, 'k');
      c.T(xx + 5.5, yb - 6.5, h, x.faz === 3 ? `3x${x.In}A.` : `${x.In}A.`, 'R', Math.PI / 2, 2);
      if (x.kablo) c.T(xx - 1, yk - 1, h, x.kablo, 'R', Math.PI / 2, 2);
      c.T(xx, yk - 24, h, x.no, 'MC', 0, 2);
      c.T(xx - 1, yk - 28, h, x.aciklama + '  ', 'R', Math.PI / 2, 2);
      if (x.W) c.T(xx + 3, yk - 28, h, ` (${Math.round(x.W)}W)`, 'R', Math.PI / 2, 2);
    });
    return c.g;
  };
  /* yükleme cetveli (BB-002 sütunları) */
  EL.cetvel = (L, Y, o = {}) => {
    const c = cizer(), mm = o.mm || { cetvel: 2.06, baslik: 4 }, h = mm.cetvel, rh = 5, col = [0, 14, 28, 42, 58, 74, 94, 110, 126, 142, 210];
    const n = L.length, top = 0, by = top - rh * 2 - rh * n;
    c.T(col[3], top + 6, mm.baslik, `${o.pano || 'BBAT'}  TABLO YÜKLEME CETVELİ`, 'L', 0, 2);
    c.L(col[0], top, col[10], top, 'k'); c.L(col[0], top - rh, col[10], top - rh, 'i'); c.L(col[0], top - 2 * rh, col[10], top - 2 * rh, 'k');
    for (let i = 1; i <= n; i++) c.L(col[0], top - 2 * rh - i * rh, col[10], top - 2 * rh - i * rh, i === n ? 'k' : 'i');
    col.forEach((x, i) => c.L(x, top, x, by, i === 0 || i === col.length - 1 ? 'k' : 'i'));
    const H1 = [['LİNYE', 'NO'], ['IŞIK', 'SORTİ'], ['PRİZ', 'SORTİ'], ['SİGORTA', 'AKIM(A)'], ['', 'CİNSİ'], ['TOPLAM', 'GÜÇ(W)'], ['GÜÇ DAĞITIM (W)', 'R'], ['', 'S'], ['', 'T'], ['AÇIKLAMALAR / ODA NO', '']];
    H1.forEach(([a, b], i) => { const xm = (col[i] + col[i + 1]) / 2; if (a) c.T(i === 6 ? (col[6] + col[9]) / 2 : xm, top - rh + 1.5, h, a, 'MC', 0, 2); if (b) c.T(xm, top - 2 * rh + 1.5, h, b, 'MC', 0, 2); });
    L.forEach((x, i) => { const y = top - 2 * rh - (i + 1) * rh + 1.5, v = [x.no, x.isik || '-', x.priz || '-', x.faz === 3 ? `3x${x.In}` : x.In, 'OTOM.', x.W ? Math.round(x.W) : '', x.dag.R ? Math.round(x.dag.R) : '', x.dag.S ? Math.round(x.dag.S) : '', x.dag.T ? Math.round(x.dag.T) : ''];
      v.forEach((t, j) => c.T((col[j] + col[j + 1]) / 2, y, h, t, 'MC', 0, 2)); c.T(col[9] + 2, y, h, x.aciklama + (x.mahal && x.mahal.length ? ' — ' + x.mahal.join(', ') : ''), 'L', 0, 2); });
    const ay = by - rh + 1.5; c.T(col[5] - 2, ay, h, 'TOPLAM(W)', 'R', 0, 2); c.T((col[5] + col[6]) / 2, ay, h, Math.round(Y.kurulu), 'MC', 0, 2);
    ['R', 'S', 'T'].forEach((f, i) => c.T((col[6 + i] + col[7 + i]) / 2, ay, h, Math.round(Y.F[f]), 'MC', 0, 2));
    c.T(col[5] - 2, ay - rh, h, 'KURULU GÜÇ(W)', 'R', 0, 2); c.T((col[5] + col[6]) / 2, ay - rh, h, Math.round(Y.kurulu), 'MC', 0, 2);
    c.T(col[5] - 2, ay - 2 * rh, h, 'DİVERSİTE%', 'R', 0, 2); c.T((col[5] + col[6]) / 2, ay - 2 * rh, h, yz(Y.div), 'MC', 0, 2);
    c.T(col[5] - 2, ay - 3 * rh, h, 'İŞLETME GÜCÜ(W)', 'R', 0, 2); c.T((col[5] + col[6]) / 2, ay - 3 * rh, h, Math.round(Y.isletme), 'MC', 0, 2);
    c.B(col[5], by - 4 * rh, col[6] - col[5], 4 * rh, 'i');
    return c.g;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = EL;
  if (C) C.EL = Object.assign(C.EL || {}, EL);
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : null);

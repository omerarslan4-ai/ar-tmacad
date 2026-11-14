/* ArıtmaCAD — MİMARİ OTOMATİK İÇERİK (MIMARIPAFTA'nın plan / kesit / görünüş içeriği)
   1) Kapı / pencere TİP NUMARASI: ebat (genişlik / yükseklik) ve türe göre; aynı ebat aynı numara.
        Biçim kullanıcının kendi projesinden (Konyaİsale_Terfi_mim+mek.dwg): P1, P2 … pencere, K1, K2 … kapı, SEK1 … seksiyonel kapı
        (Çokal R2'de: P pencere, PA panjur, AK alüminyum kapı, SK seksiyonel kapı). Plan etiketi (iki örnekte de aynı): daire içinde kod,
        daireden doğramaya çizgi, çizginin üstünde genişlik, altında yükseklik (cm). Çokal 10-İdari Bina_R2 planı: daire yarıçapı 3 mm,
        kod 2 mm (YZ), çizgi renk 243, ebat yazısı 2 mm. Detay başlığı: "P1 150/130 ALÜMİNYUM PENCERE".
        C.kapiPencereTipleri() → [{ kod, tur, w, h, parapet, adet, kanat, malzeme, ids, duvar (cm), yon, panel (m) }] (doğrama detay paftası bunu kullanır).
   2) AKS: modelde aks nesnesi yoksa kolon merkezlerinden (yoksa perde eksenlerinden) türetilir. Numaralar soldan sağa (1, 2 …),
        harfler yukarıdan aşağıya (A üstte) — Çokal İdari / Blower ve Konya planlarında böyle.
      PLAN ÖLÇÜ SIRALARI (Çokal 10-İdari Bina_R2 kat planı, dört kenarda aynı): içten dışa 1) doğrama zinciri (dış yüz · boşluk kenarları ·
        dış yüz), 2) aks zinciri (dış yüz · akslar · dış yüz), 3) toplam; sıralar 5 mm arayla (25 cm @ 1/50); aks balonu en dış sıranın
        11 mm dışında (balon yarıçapı 6 mm, harf 5 mm).
   3) KESİT YERLERİ (firma kuralı 14.11.2026): uzun kesit bütün mahallerden geçer; iki kısa kesit: biri büyük hacimden, öbürü
        odalardan; hiçbir kesitte görünmeyen oda için ek kesit. Hat pencere / kapıdan geçmeyi tercih eder, kolon ve kesite paralel kirişin
        üstüne denk gelmez. Mahaller duvarlarla çevrili bölgelerden (ızgara üzerinde taşma doldurma) çıkarılır.
   4) GÖRÜNÜŞ: bina içindeki elemanlar (merdiven, iç duvar, ara döşeme, iç kiriş …) çizilmez — planda dış zarfın içinde kalan ve çatıya
        ulaşmayan her eleman. Pencere camı opak sayılır (Çokal görünüşlerinde pencereden içerisi çizilmemiş).
   5) ÖLÇÜ ÇAKIŞMA DENETİMİ (firma kuralı 14.11.2026: ölçü sıraları üst üste binmez, aralar 25 cm): ölçüleri ve yazıları kâğıt üstü
        dikdörtgen olarak alır, üst üste binenleri döndürür.
   Saf kısım Node ile denenir: node test/mimari-oto.test.js */
(function (C) {
  'use strict';

  /* ======================= SAF KISIM ======================= */
  const r2 = v => Math.round(v * 100) / 100, cm = v => Math.round(v * 100);

  /* ---------- 1) KAPI / PENCERE TİPLERİ ---------- */
  const ONEK = { pencere: 'P', panjur: 'PA', kapi: 'K', seksiyonel: 'SEK' }, ONEK_SIRA = ['P', 'PA', 'K', 'SEK'];
  const TUR = { P: 'PENCERE', PA: 'PANJUR', K: 'KAPI', SEK: 'SEKSİYONEL KAPI' };
  const tipTuru = a => a.kind === 'kapi' ? (a.kTip === 'S' ? 'seksiyonel' : 'kapi') : a.kind === 'panjur' ? 'panjur' : 'pencere';
  const varsayilanMalzeme = a => a.malzeme || (a.kind === 'kapi' ? (a.kTip === 'S' ? 'SEKSİYONEL' : a.kTip === 'C' ? 'ÇELİK' : 'ALÜMİNYUM') : 'ALÜMİNYUM');
  /* aciklar: [{ id, kind: 'pencere' | 'kapi' | 'panjur', kTip ('C' çelik, 'S' seksiyonel), w, h (m), par (parapet m), kanat, malzeme }]
     Aynı türde aynı ebat (cm) aynı numarayı alır; numara genişliğe, sonra yüksekliğe göre küçükten büyüğe.
     Döner: { tipler: [{ kod, onek, tur, w, h (cm), parapet (cm, en sık), adet, kanat, malzeme, ids, etiket, baslik }], kodOf: { id: kod } } */
  const tipNumaralari = aciklar => {
    const G = new Map();
    for (const a of aciklar || []) { const on = ONEK[tipTuru(a)], w = cm(+a.w || 0), h = cm(+a.h || 0); if (!w || !h) continue; const k = on + '|' + w + '|' + h;
      if (!G.has(k)) G.set(k, { onek: on, w, h, ids: [], par: new Map(), kanat: new Map(), mal: new Map(), duvar: new Map(), yon: new Map(), panel: new Map() });
      const g = G.get(k), say = (m, v) => m.set(v, (m.get(v) || 0) + 1); g.ids.push(a.id); say(g.par, cm(+a.par || 0)); say(g.kanat, +a.kanat || 1); say(g.mal, varsayilanMalzeme(a));
      say(g.duvar, cm(+a.duvar || 0.2)); say(g.yon, a.yon === 'R' ? 'R' : 'L'); say(g.panel, +a.pnl || 0.5); }
    const enSik = m => [...m.entries()].sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1))[0][0];
    const tipler = [], kodOf = {};
    for (const on of ONEK_SIRA) {
      const L = [...G.values()].filter(g => g.onek === on).sort((p, q) => p.w - q.w || p.h - q.h);
      L.forEach((g, i) => { const kod = on + (i + 1), mal = enSik(g.mal), tur = TUR[on];
        const t = { kod, onek: on, tur, w: g.w, h: g.h, parapet: enSik(g.par), adet: g.ids.length, kanat: enSik(g.kanat), malzeme: mal, ids: g.ids.slice(), duvar: enSik(g.duvar), yon: enSik(g.yon), panel: enSik(g.panel),
          etiket: `${kod} ${g.w}/${g.h}`, baslik: `${kod} ${g.w}/${g.h} ${on === 'SEK' ? tur : `${mal} ${tur}`}` };
        tipler.push(t); for (const id of g.ids) kodOf[id] = kod; });
    }
    return { tipler, kodOf };
  };

  /* numara dairesi bütün tiplerde aynı (kullanıcı kararı 14.11.2026: r = 3 mm, Çokal İdari); uzun kod (SEK1) daireyi büyütmez: yazı boyu 2 mm kalır
     (kuralın en küçük yazısı), genişlik çarpanı daraltılarak daireye sığdırılır. Yazı genişliği ≈ harf × 0,75 × h (YZ, genişlik 0,70), daire içinde
     iki yanda 0,6 mm pay. Döner: { r, h (kâğıt mm), wf (yazının genişlik çarpanı; 0,70 = YZ) } */
  const kodYazi = (kod, o = {}) => { const r = o.balonR || 3, h = o.kodMm || 2, n = String(kod || '').length || 1, f = Math.min(1, 2 * (r - 0.6) / (0.75 * n * h)), yz = o.yzGen || 0.7;
    return { r, h, wf: Math.round(yz * f * 1000) / 1000 }; };

  /* ---------- 2) AKS TÜRETME ve PLAN ÖLÇÜ SIRALARI ---------- */
  const kume = (v, tol) => { const s = v.slice().sort((a, b) => a - b), g = []; for (const x of s) { const l = g[g.length - 1]; if (l && x - l[l.length - 1] <= tol) l.push(x); else g.push([x]); } return g.map(q => r2(q.reduce((a, b) => a + b, 0) / q.length)); };
  /* o: { kolonlar: [[x, y]] merkezler, perdeler: [{ a: [x, y], b: [x, y] }] eksen çizgileri (m) }. Kolon varsa akslar kolon merkezleridir;
     kolonsuz yönde boyu ≥ 2 m olan eksene paralel perde eksenleri. Döner: { xs, ys } (dünya, küçükten büyüğe) */
  const aksTuret = (o = {}) => {
    const K = o.kolonlar || [], P = (o.perdeler || []).filter(p => Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]) >= 2), tol = o.tol || 0.3;
    let xs = kume(K.map(q => q[0]), tol), ys = kume(K.map(q => q[1]), tol);
    const dus = P.filter(p => Math.abs(p.b[0] - p.a[0]) < 1e-3).map(p => p.a[0]), yat = P.filter(p => Math.abs(p.b[1] - p.a[1]) < 1e-3).map(p => p.a[1]);
    const ekle = (L, v) => { const out = L.slice(); for (const x of kume(v, tol)) if (!out.some(q => Math.abs(q - x) <= 0.6)) out.push(x); return out.sort((a, b) => a - b); };
    if (xs.length < 2) xs = ekle(xs, dus); if (ys.length < 2) ys = ekle(ys, yat);
    return { xs, ys };
  };
  /* aks etiketi: numaralar soldan sağa, harfler yukarıdan aşağıya (A en üstte) */
  const harf = i => { let s = '', n = i; do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0); return s; };
  const aksEtiketleri = (xs, ys) => ({ x: xs.map((_, i) => String(i + 1)), y: ys.map((_, i) => harf(ys.length - 1 - i)) });
  /* plan ölçü sıraları. o: { bb: [x0, y0, x1, y1] dış yüz, xs, ys (akslar), bosluk: { ALT: [[s0, s1]], UST, SOL, SAG } dış duvardaki doğrama
     boşlukları (ALT / UST: x aralığı, SOL / SAG: y aralığı), ilk (mm), sira (mm), balon (balon merkezi en dış sıradan mm) }.
     Döner: { siralar: [{ kenar, i, mm (dış yüzden kâğıtta), noktalar: [s …], tur: 'dograma' | 'aks' | 'toplam' }], balonMm: { kenar: mm } } */
  const planOlcuSiralari = (o = {}) => {
    const [x0, y0, x1, y1] = o.bb, ilk = o.ilk == null ? 14 : o.ilk, sira = o.sira == null ? 5 : o.sira, bal = o.balon == null ? 11 : o.balon, out = [], balonMm = {};
    const tek = v => { const s = v.slice().sort((a, b) => a - b), q = []; for (const x of s) if (!q.length || x - q[q.length - 1] > 0.005) q.push(r2(x)); return q; };
    for (const kenar of ['ALT', 'UST', 'SOL', 'SAG']) {
      const yatay = kenar === 'ALT' || kenar === 'UST', a = yatay ? x0 : y0, b = yatay ? x1 : y1, A = (yatay ? o.xs : o.ys) || [];
      const bos = ((o.bosluk || {})[kenar] || []).filter(q => q[1] > a + 0.005 && q[0] < b - 0.005);
      const L = [];
      if (bos.length) L.push({ tur: 'dograma', noktalar: tek([a, b, ...bos.flat().map(v => Math.max(a, Math.min(b, v)))]) });
      if (A.length) L.push({ tur: 'aks', noktalar: tek([a, b, ...A.filter(v => v > a - 1e-6 && v < b + 1e-6)]) });
      L.push({ tur: 'toplam', noktalar: [r2(a), r2(b)] });
      L.forEach((s, i) => out.push(Object.assign({ kenar, i, mm: ilk + i * sira }, s)));
      balonMm[kenar] = ilk + (L.length - 1) * sira + bal;
    }
    return { siralar: out, balonMm };
  };

  /* kesitte aks ölçüleri (plan sıralarıyla aynı düzen): o: { akslar: [s] (kesit boyunca), dis: [x0, x1] dış yüzler, ust: çizimin üstü, mm: 1 kâğıt mm'nin modeldeki boyu,
     ilk (mm, 14), sira (model m, 0,25), balonR (6), balonOte (11) }. Döner: { noktalar: [dış yüz, akslar …, dış yüz], y1 (zincir), y2 (toplam), extp (aks çizgisi ucundan balona mm) } */
  const kesitAksSiralari = (o = {}) => { const mm = o.mm || 0.05, x0 = o.dis[0], x1 = o.dis[1], A = (o.akslar || []).filter(v => v > x0 + 0.005 && v < x1 - 0.005).sort((p, q) => p - q);
    const y1 = o.ust + (o.ilk == null ? 14 : o.ilk) * mm, y2 = y1 + (o.sira == null ? 0.25 : o.sira), R = o.balonR == null ? 6 : o.balonR, B = o.balonOte == null ? 11 : o.balonOte;
    return { noktalar: [x0, ...A, x1].map(r2), y1: +y1.toFixed(4), y2: +y2.toFixed(4), extp: +((y2 + B * mm - o.ust) / mm - R).toFixed(2) }; };

  /* ---------- 3) MAHALLER ve KESİT YERLERİ ---------- */
  /* engeller: düşey elemanların (duvar, perde, kolon) plan izleri — üçgen ya da çokgen listesi [[x, y] …]. bb: yapının plan kutusu.
     Izgarada (h m) boş hücreler taşma doldurmayla gruplanır; kutunun kenarına değen grup dışarısıdır. Döner: [{ bb, alan, cx, cy, n }] (büyükten küçüğe) */
  const pointIn = (q, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const mahalBul = (engeller, bb, o = {}) => {
    const h = o.h || 0.1, pay = 2 * h, X0 = bb[0] - pay, Y0 = bb[1] - pay, nx = Math.ceil((bb[2] - bb[0] + 2 * pay) / h), ny = Math.ceil((bb[3] - bb[1] + 2 * pay) / h), dolu = new Uint8Array(nx * ny);
    for (const P of engeller || []) { if (!P || P.length < 3) continue; let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const q of P) { a = Math.min(a, q[0]); b = Math.min(b, q[1]); c = Math.max(c, q[0]); d = Math.max(d, q[1]); }
      /* ince izler (ör. 20 cm duvarın üçgenleri) ızgaradan kaçmasın: hücre merkezi ya da hücreye yarım hücre yakın */
      const i0 = Math.max(0, Math.floor((a - X0) / h) - 1), i1 = Math.min(nx - 1, Math.ceil((c - X0) / h)), j0 = Math.max(0, Math.floor((b - Y0) / h) - 1), j1 = Math.min(ny - 1, Math.ceil((d - Y0) / h));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * nx + i; if (dolu[k]) continue; const x = X0 + (i + 0.5) * h, y = Y0 + (j + 0.5) * h;
        if (pointIn([x, y], P) || ((c - a < h * 1.5 || d - b < h * 1.5) && x >= a - h / 2 && x <= c + h / 2 && y >= b - h / 2 && y <= d + h / 2)) dolu[k] = 1; } }
    const etik = new Int32Array(nx * ny).fill(-1), gr = [];
    for (let s = 0; s < nx * ny; s++) { if (dolu[s] || etik[s] >= 0) continue; const id = gr.length, Q = [s]; etik[s] = id; let kenar = false, n = 0, sx = 0, sy = 0, a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
      while (Q.length) { const k = Q.pop(), i = k % nx, j = (k - i) / nx; n++; const x = X0 + (i + 0.5) * h, y = Y0 + (j + 0.5) * h; sx += x; sy += y; a = Math.min(a, x - h / 2); b = Math.min(b, y - h / 2); c = Math.max(c, x + h / 2); d = Math.max(d, y + h / 2);
        if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) kenar = true;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; const kk = jj * nx + ii; if (!dolu[kk] && etik[kk] < 0) { etik[kk] = id; Q.push(kk); } } }
      gr.push({ kenar, n, bb: [r2(a), r2(b), r2(c), r2(d)], alan: r2(n * h * h), cx: r2(sx / n), cy: r2(sy / n) }); }
    return gr.filter(g => !g.kenar && g.alan >= (o.enAz || 2)).map(g => ({ bb: g.bb, alan: g.alan, cx: g.cx, cy: g.cy, n: g.n })).sort((p, q) => q.alan - p.alan);
  };
  /* o: { bb (dış yüz), mahaller: [{ ad, bb, alan }], aciklar: [{ c: [x, y], w, d: 'x' | 'y' (duvarın doğrultusu) }],
          kolonlar: [[x0, y0, x1, y1]], kirisler: [{ bb, d: 'x' | 'y' }], pay (hat yapının dışına taşar, m), adim }
     Uzun kesit uzun doğrultuda (yapının uzun kenarına paralel), kısa kesitler ona dik. Döner: [{ nm, a, b, sp, depth, tur, mahaller: [ad], aciklar: n }] */
  const kesitYerleri = (o = {}) => {
    const [x0, y0, x1, y1] = o.bb, pay = o.pay == null ? 1.5 : o.pay, adim = o.adim || 0.05, M = (o.mahaller || []).map((m, i) => Object.assign({ ad: m.ad || `MAHAL ${i + 1}` }, m));
    const uzunX = x1 - x0 >= y1 - y0, AC = o.aciklar || [], KO = o.kolonlar || [], KI = o.kirisler || [];
    /* d: kesit hattının doğrultusu ('x' → hat y = v'de, x boyunca) */
    const kesen = (d, v) => M.filter(m => d === 'x' ? v >= m.bb[1] + 0.1 && v <= m.bb[3] - 0.1 : v >= m.bb[0] + 0.1 && v <= m.bb[2] - 0.1);
    const puan = (d, v, hedef) => {
      let p = 0; const ks = kesen(d, v);
      if (hedef) { if (!ks.some(m => hedef.includes(m))) return -Infinity; }
      p += 10 * ks.length;
      /* hat kestiği (hedef) odaların ortasına yakın olsun */
      const H = hedef ? ks.filter(m => hedef.includes(m)) : ks; for (const m of H) { const lo = d === 'x' ? m.bb[1] : m.bb[0], hi = d === 'x' ? m.bb[3] : m.bb[2]; p += (1 - Math.abs(v - (lo + hi) / 2) / ((hi - lo) / 2)) / H.length; }
      /* hatta dik duvardaki doğramalar (kesitte doğrama görünür): hat doğramanın içinden geçer */
      for (const a of AC) if (a.d !== d) { const c = d === 'x' ? a.c[1] : a.c[0], yw = a.w / 2 - 0.1; if (yw > 0 && Math.abs(v - c) <= yw) p += 3 + (1 - Math.abs(v - c) / (a.w / 2)); }
      for (const k of KO) { const lo = d === 'x' ? k[1] : k[0], hi = d === 'x' ? k[3] : k[2]; if (v > lo - 0.1 && v < hi + 0.1) p -= 100; }
      for (const k of KI) if (k.d === d) { const lo = d === 'x' ? k.bb[1] : k.bb[0], hi = d === 'x' ? k.bb[3] : k.bb[2]; if (v > lo - 0.1 && v < hi + 0.1) p -= 50; }
      return p;
    };
    const sec = (d, lo, hi, hedef) => { let best = null, bp = -Infinity; const orta = (lo + hi) / 2, yari = Math.max(1e-6, (hi - lo) / 2);
      const nA = Math.floor((hi - lo) / adim + 1e-6); for (let i = 0; i <= nA; i++) { const v = r2(lo + i * adim), p = puan(d, v, hedef) + 0.5 * (1 - Math.abs(v - orta) / yari); if (p > bp + 1e-9) { bp = p; best = r2(v); } } return bp > -Infinity ? best : null; };
    const hat = (nm, d, v, tur) => { // bakış: hattın iki yanından derin olana
      if (d === 'x') { const ust = y1 - v >= v - y0, xm = (x0 + x1) / 2; return { nm, tur, d, v, a: [x0 - pay, v], b: [x1 + pay, v], sp: [xm, ust ? v + 1 : v - 1], depth: r2((ust ? y1 - v : v - y0) + 0.5) }; }
      const sag = x1 - v >= v - x0, ym = (y0 + y1) / 2; return { nm, tur, d, v, a: [v, y0 - pay], b: [v, y1 + pay], sp: [sag ? v + 1 : v - 1, ym], depth: r2((sag ? x1 - v : v - x0) + 0.5) };
    };
    const uz = uzunX ? 'x' : 'y', ks = uzunX ? 'y' : 'x', out = [], ad = () => String.fromCharCode(65 + out.length);
    const ic = (d) => d === 'x' ? [y0 + 0.3, y1 - 0.3] : [x0 + 0.3, x1 - 0.3];
    { const [lo, hi] = ic(uz), v = sec(uz, lo, hi); if (v != null) out.push(hat(ad(), uz, v, 'uzun')); }
    const buyuk = M.slice().sort((p, q) => q.alan - p.alan)[0], odalar = M.filter(m => m !== buyuk);
    const kAralik = m => ks === 'x' ? [m.bb[1] + 0.3, m.bb[3] - 0.3] : [m.bb[0] + 0.3, m.bb[2] - 0.3]; // hat x boyuncaysa (d 'x') yeri y'dir
    if (buyuk) { const [lo, hi] = kAralik(buyuk), v = sec(ks, lo, hi, [buyuk]); if (v != null) out.push(hat(ad(), ks, v, 'buyuk')); }
    else { const [lo, hi] = ic(ks), v = sec(ks, lo, hi); if (v != null) out.push(hat(ad(), ks, v, 'kisa')); }
    const gorunen = () => new Set(out.flatMap(h => kesen(h.d, h.v)));
    if (odalar.length) { // odalardan: en çok odayı kesen kısa kesit
      const kisa0 = out.filter(h => h.d === ks).flatMap(h => kesen(ks, h.v)), yeni = odalar.filter(m => !kisa0.includes(m));
      const [lo, hi] = ic(ks), v = sec(ks, lo, hi, yeni.length ? yeni : odalar);
      if (v != null) out.push(hat(ad(), ks, v, 'oda')); }
    for (let g = 0; g < 6; g++) { const S = gorunen(), eks = M.filter(m => !S.has(m)); if (!eks.length) break; const m = eks[0], [lo, hi] = kAralik(m), v = sec(ks, lo, hi, [m]); if (v == null) break; out.push(hat(ad(), ks, v, 'ek')); }
    for (const h of out) { h.mahaller = kesen(h.d, h.v).map(m => m.ad); h.aciklar = AC.filter(a => a.d !== h.d && Math.abs(h.v - (h.d === 'x' ? a.c[1] : a.c[0])) <= a.w / 2).length; }
    return out;
  };
  /* mahal bulmada kapı / pencere boşlukları kapalı sayılır (kullanıcı 14.11.2026: Konya kumanda odası montaj holüne kapıyla açılıyor, ayrı oda sayılmalı).
     aciklar: [{ c: [x, y] duvar ekseninde orta, u: duvar doğrultusu, w: genişlik, t: duvar kalınlığı (m) }] → engel dörtgenleri (her yanda 2 cm taşar) */
  const acikIzleri = aciklar => (aciklar || []).map(a => { const u = a.u, n = [-u[1], u[0]], hw = a.w / 2 + 0.02, ht = (a.t || 0.2) / 2 + 0.02, P = (s, t) => [a.c[0] + u[0] * s + n[0] * t, a.c[1] + u[1] * s + n[1] * t];
    return [P(-hw, -ht), P(hw, -ht), P(hw, ht), P(-hw, ht)]; });
  /* DOĞRAMANIN YEREL ÇERÇEVESİ (detay çizimini modele oturtmak için; mimari-detay.js dogramaGorunus / dograma11 / dograma22 yerel koordinatı):
     d: { c (duvar ekseninde orta), u (duvar doğrultusu, s artar), nn (duvar normali), duvar (kalınlık m), w, el ('S': menteşe s1'de), yon ('R': kanat −nn yönüne açılır) },
     merkez: yapının plan merkezi (dış = merkezden uzak yan). Döner: { o: dışa birim, x: dıştan bakınca sağa birim, P0: dış yüzde sol uç (plan),
     dis: dış yüz ortası, mentese: 'L' | 'R' (yerel x'te), ters: kanat dışa açılır }. Plan noktası (x, y) = P0 + x·x − y·o; görünüşte (x, z − eşik) */
  const dogramaCercevesi = (d, merkez) => {
    let o = [d.nn[0], d.nn[1]]; if ((d.c[0] - merkez[0]) * o[0] + (d.c[1] - merkez[1]) * o[1] < 0) o = [-o[0], -o[1]];
    const x = [-o[1], o[0]], td = d.duvar || 0.2, dis = [d.c[0] + o[0] * td / 2, d.c[1] + o[1] * td / 2], P0 = [dis[0] - x[0] * d.w / 2, dis[1] - x[1] * d.w / 2];
    const sArtar = x[0] * d.u[0] + x[1] * d.u[1] > 0, s0da = d.el !== 'S', ac = d.yon === 'R' ? -1 : 1; // insaat.js T.acik.prims: menteşe el 'S' ise s1, kanat nn·(yon R ? −1 : 1) yönüne
    return { o, x, P0, dis, td, mentese: s0da === sArtar ? 'L' : 'R', ters: ac * (d.nn[0] * o[0] + d.nn[1] * o[1]) > 0 };
  };
  /* kesit hattı (a, b) mahalden geçiyor mu (mahal kutusu her yandan 10 cm içeride) */
  const kesitKeser = (h, m) => { const [x0, y0, x1, y1] = [m.bb[0] + 0.1, m.bb[1] + 0.1, m.bb[2] - 0.1, m.bb[3] - 0.1]; if (x1 <= x0 || y1 <= y0) return false;
    let t0 = 0, t1 = 1; const p = h.a, dx = h.b[0] - p[0], dy = h.b[1] - p[1];
    for (const [pp, qq] of [[-dx, p[0] - x0], [dx, x1 - p[0]], [-dy, p[1] - y0], [dy, y1 - p[1]]]) { if (Math.abs(pp) < 1e-12) { if (qq < 0) return false; continue; } const t = qq / pp; if (pp < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t); if (t0 > t1) return false; } return true; };
  /* var olan kesitler (kullanıcının aldıkları) korunur; firma kuralını sağlamak için eksik olan hatlar eklenir (14.11.2026):
     uzun doğrultuda kesit yoksa uzun kesit; her mahal kısa doğrultudaki bir kesitte görünmeli (büyük hacim ve odalar).
     hatlar: kesitYerleri çıktısı (uzun, buyuk, oda, ek), mevcut: [{ a, b }], mahaller: [{ bb }], bb: yapı. Döner: eklenecek hatlar */
  const eksikKesitler = (hatlar, mevcut, mahaller, bb) => {
    const L = hatlar || [], V = mevcut || [], M = mahaller || []; if (!V.length) return L.slice();
    const uzunX = bb ? bb[2] - bb[0] >= bb[3] - bb[1] : true, yon = h => Math.abs(h.b[0] - h.a[0]) >= Math.abs(h.b[1] - h.a[1]) ? 'x' : 'y', uz = uzunX ? 'x' : 'y';
    const out = [], kisaGoren = new Set(); let uzunVar = V.some(h => yon(h) === uz);
    for (const h of V) if (yon(h) !== uz) M.forEach((m, i) => { if (kesitKeser(h, m)) kisaGoren.add(i); });
    for (const h of L) { const d = h.d || yon(h);
      if (d === uz) { if (!uzunVar) { out.push(h); uzunVar = true; } continue; }
      const yeni = M.map((m, i) => i).filter(i => !kisaGoren.has(i) && kesitKeser(h, M[i])); if (!yeni.length) continue;
      out.push(h); yeni.forEach(i => kisaGoren.add(i)); }
    return out; };

  /* ---------- 4) GÖRÜNÜŞTE İÇ ELEMANLAR ---------- */
  /* ogeler: [{ id, type, bb: [x0, y0, z0, x1, y1, z1] }]. Dış zarf: düşey elemanların (perde, duvar, kolon) plan kutusu.
     Zarfın içinde (her kenardan pay kadar içeride) kalan ve çatı / en üst kota ulaşmayan eleman içtedir. Döner: Set(id) (görünüşte çizilmeyecek) */
  const DIS_ZARF = /^(perde|kolon|wall|duvar)$/; // zarf düşey elemanlardan (saçaklı çatı / döşeme zarfı büyütmesin)
  const icElemanlar = (ogeler, o = {}) => {
    const pay = o.pay == null ? 0.05 : o.pay, Z = (ogeler || []).filter(g => DIS_ZARF.test(g.type)), out = new Set(); if (!Z.length) return out;
    /* zarf her elemanın kendi kot aralığında (en az 10 cm örtüşen düşey elemanlardan, kendisi hariç) alınır: temeldeki kalın perde,
       üstteki ince cephe duvarını "içeride" saydırmasın */
    for (const g of ogeler) { if (g.type === 'cati' || g.type === 'tretuvar' || g.type === 'arazi') continue; const q = g.bb;
      let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity, zT = -Infinity;
      for (const h of Z) { if (h === g || Math.min(h.bb[5], q[5]) - Math.max(h.bb[2], q[2]) < 0.1) continue; a = Math.min(a, h.bb[0]); b = Math.min(b, h.bb[1]); c = Math.max(c, h.bb[3]); d = Math.max(d, h.bb[4]); zT = Math.max(zT, h.bb[5]); }
      if (!isFinite(a)) continue;
      if (q[0] > a + pay && q[1] > b + pay && q[3] < c - pay && q[4] < d - pay && q[5] < zT - pay) out.add(g.id); }
    return out;
  };

  /* ---------- 5) ÖLÇÜ ÇAKIŞMA DENETİMİ ---------- */
  /* ogeler: [{ ad, k: 'olcu', a: [x, y], b: [x, y], p: ölçü çizgisinin geçtiği nokta, yazi: mm, metin } | { ad, k: 'kutu', bb: [x0, y0, x1, y1] }] (kâğıt mm).
     Dik iki ölçünün çizgileri kesişebilir; birinin yazısı öbürünün çizgisine binerse çakışır.
     Ölçü: ölçü çizgisi boyunca, yazı tarafında yazı yüksekliği + 0,5 mm kalınlığında şerit. Paralel iki ölçü aynı hatta değil ve aralarında
     en az `sira` − 0,01 mm yoksa (zincirdeki komşu parçalar hariç) çakışır. Döner: [[adA, adB] …] */
  const olcuKutusu = q => { const yat = Math.abs(q.b[1] - q.a[1]) < Math.abs(q.b[0] - q.a[0]), h = (q.yazi || 2) + 0.5;
    if (yat) { const y = q.p[1]; return { yat, hat: y, bb: [Math.min(q.a[0], q.b[0]), y - 0.25, Math.max(q.a[0], q.b[0]), y + h] }; }
    const x = q.p[0]; return { yat, hat: x, bb: [x - h, Math.min(q.a[1], q.b[1]), x + 0.25, Math.max(q.a[1], q.b[1])] }; };
  const olcuCakisma = (ogeler, o = {}) => {
    const sira = o.sira == null ? 5 : o.sira, K = (ogeler || []).map(q => q.k === 'olcu' ? Object.assign({ q }, olcuKutusu(q)) : { q, bb: q.bb }), out = [];
    const ust = (A, B, m = 0) => Math.min(A[2], B[2]) - Math.max(A[0], B[0]) > m && Math.min(A[3], B[3]) - Math.max(A[1], B[1]) > m;
    for (let i = 0; i < K.length; i++) for (let j = i + 1; j < K.length; j++) { const A = K[i], B = K[j];
      if (A.hat != null && B.hat != null && A.yat !== B.yat) { /* dik iki ölçü: çizgiler kesişebilir (örneklerde de öyle); yazısı öbürünün çizgisine binmesin */
        const yaziKutu = Z => { const q = Z.q, h = q.yazi || 2, tw = Math.max(3, String(q.metin || '000').length) * 0.75 * h, m = Z.yat ? (Z.bb[0] + Z.bb[2]) / 2 : (Z.bb[1] + Z.bb[3]) / 2;
          return Z.yat ? [m - tw / 2, Z.hat + 0.2, m + tw / 2, Z.hat + 0.2 + h] : [Z.hat - 0.2 - h, m - tw / 2, Z.hat - 0.2, m + tw / 2]; };
        const cizgi = Z => Z.yat ? [Z.bb[0], Z.hat, Z.bb[2], Z.hat] : [Z.hat, Z.bb[1], Z.hat, Z.bb[3]];
        const kes = (t, c) => c[0] <= t[2] && c[2] >= t[0] && c[1] <= t[3] && c[3] >= t[1];
        if (kes(yaziKutu(A), cizgi(B)) || kes(yaziKutu(B), cizgi(A))) out.push([A.q.ad, B.q.ad]); continue; }
      if (A.hat != null && B.hat != null && A.yat === B.yat) {
        if (Math.abs(A.hat - B.hat) < 1e-6) { const s0 = A.yat ? [A.bb[0], A.bb[2]] : [A.bb[1], A.bb[3]], s1 = A.yat ? [B.bb[0], B.bb[2]] : [B.bb[1], B.bb[3]]; if (Math.min(s0[1], s1[1]) - Math.max(s0[0], s1[0]) > 0.01) out.push([A.q.ad, B.q.ad]); continue; } // aynı hatta üst üste
        const s0 = A.yat ? [A.bb[0], A.bb[2]] : [A.bb[1], A.bb[3]], s1 = A.yat ? [B.bb[0], B.bb[2]] : [B.bb[1], B.bb[3]];
        if (Math.min(s0[1], s1[1]) - Math.max(s0[0], s1[0]) > 0.01 && Math.abs(A.hat - B.hat) < sira - 0.01) out.push([A.q.ad, B.q.ad]); continue; }
      if (ust(A.bb, B.bb, 0.05)) out.push([A.q.ad, B.q.ad]); }
    return out;
  };

  /* ---------- 5b) OKLU AÇIKLAMA YERİ (korkuluk; firma kuralı 14.11.2026: plan ve kesitte korkuluk oklu açıklamayla) ----------
     Çokal 10-İdari Bina_R2 (1/50; MULTILEADER YZ katmanında, yazısı Mim_Yazi25'te 2 mm): ok ucu korkulukta (_ClosedBlank, 6 birim = 1,2 mm), eğik kol ≈ 58 birim
     (11,7 mm) yatayla ≈ 59°, yatay kırılma yazı genişliğinde (100 birim = 20 mm), "Korkuluk h=110 cm" kırılmanın üstünde, "(Sıcak Daldırma Galvaniz)" altında.
     Yer seçimi kesitteki kot yazısı gibi ağırlıklı: kesilen betonun içine düşmek 1e6, ölçü / kot / etiket kutusuna binmek 1e3, öbür çizgileri kesmek 1.
     o: { adaylar: [[x, y, ek maliyet?]] (ok ucu adayları), w (yazı genişliği), h (yazı boyu), L (eğik kol), aci (derece), bosluk (yazı ile kırılma arası),
          alanlar: [{ pts, a, g }] (içine düşülmeyecek kapalı alanlar; aynı g'li iç içe çevreler tek-çift kuralıyla: delikli bölge), kutular: [{ bb, a }], cizgiler: [[p, q]] } (hepsi aynı birimde).
     Döner: { uc, kirik, son, yazi: [x, y] (yazının ortası, kırılma hizası), maliyet } ya da null */
  const okluAciklamaYeri = (o = {}) => {
    const A = o.adaylar || []; if (!A.length) return null; const h = o.h || 1, w = o.w || 10 * h, L = o.L || 5.85 * h, ac = (o.aci == null ? 59 : o.aci) * Math.PI / 180, bs = o.bosluk == null ? 0.4 * h : o.bosluk;
    const icinde = (q, P) => pointIn(q, P), ust = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    const kes = (sg, b) => { let t0 = 0, t1 = 1; const p = sg[0], dx = sg[1][0] - p[0], dy = sg[1][1] - p[1];
      for (const [pp, qq] of [[-dx, p[0] - b[0]], [dx, b[2] - p[0]], [-dy, p[1] - b[1]], [dy, b[3] - p[1]]]) { if (Math.abs(pp) < 1e-12) { if (qq < 0) return false; continue; } const t = qq / pp; if (pp < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t); if (t0 > t1) return false; } return true; };
    const gruplar = []; { const M2 = new Map(); for (const Z of o.alanlar || []) { if (Z.g == null) { gruplar.push([Z]); continue; } if (!M2.has(Z.g)) { M2.set(Z.g, []); gruplar.push(M2.get(Z.g)); } M2.get(Z.g).push(Z); } }
    let en = null; const orta = (A.length - 1) / 2;
    A.forEach((u, i) => { for (const sx of [1, -1]) for (const sy of [1, -1]) {
      const k = [u[0] + sx * L * Math.cos(ac), u[1] + sy * L * Math.sin(ac)], s = [k[0] + sx * w, k[1]], bb = [Math.min(k[0], s[0]), k[1] - h - bs - 0.2 * h, Math.max(k[0], s[0]), k[1] + h + bs + 0.2 * h];
      let c = u[2] || 0; // adayın kendi maliyeti (kesitte uzaktaki korkuluk)
      for (const Gr of gruplar) { const ic = q => Gr.reduce((t, Z) => t + (icinde(q, Z.pts) ? 1 : 0), 0) % 2 === 1, a0 = Gr[0].a == null ? 1e6 : Gr[0].a; // aynı katmandaki iç içe çevreler tek-çift kuralıyla (delikli bölge: çatı kaplama bandı)
        for (let a = 0; a <= 6; a++) for (let b = 0; b <= 2; b++) if (ic([bb[0] + (bb[2] - bb[0]) * a / 6, bb[1] + (bb[3] - bb[1]) * b / 2])) c += a0;
        if (ic([(u[0] + k[0]) / 2, (u[1] + k[1]) / 2])) c += a0 / 10; } // eğik kol da betonun içinden geçmesin
      for (const K of o.kutular || []) if (ust(bb, K.bb)) c += K.a == null ? 1e3 : K.a;
      for (const sg of o.cizgiler || []) if (kes(sg, bb)) c++;
      c += Math.abs(i - orta) * 1e-3 + (sy < 0 ? 0.5e-3 : 0) + (sx < 0 ? 0.25e-3 : 0); // eşitlikte korkuluğun ortası, yukarı, sağa
      if (!en || c < en.maliyet) en = { uc: [u[0], u[1]], kirik: k, son: s, yazi: [(k[0] + s[0]) / 2, k[1]], maliyet: c }; } });
    return en;
  };
  /* korkuluk açıklamasının yazısı: "KR1 Korkuluk h=110 cm" / "(Sıcak Daldırma Galvaniz)" (Çokal İdari: malzeme parantez içinde, sözcük başları büyük) */
  const korkulukYazisi = (t, mal) => { const bas = s => String(s || '').replace(/(^|[\s(])(\S)/g, (m, a, b) => a + b.toLocaleUpperCase('tr'));
    const m = /galvaniz/i.test(mal || '') ? 'Sıcak Daldırma Galvaniz' : bas(mal || 'Sıcak Daldırma Galvaniz');
    return [`${t.kod ? t.kod + ' ' : ''}Korkuluk h=${Math.round(+t.kh || 110)} cm`, `(${m})`]; };

  /* çatı elemanlarının oklu açıklama yazısı (Çokal 10-İdari Bina_R2 çatı paftası ÇKL-AAT-İB-03: ÇATI PLANI, A'-A', B'-B'; 6-Blower çatı kesiti):
     "Mertek 5x10", "Aşık 10x10", "D. Aşığı 10x10", "Dikme 10x10" (planda iki satır: "Dikme" / "10x10"), "Kuşaklama" / "2x5x10", "Göğüsleme" / "2x5x10",
     "Yastık 2.5x10", "Kaplama Tahtası" / "1.8x10", "EPS Dolgulu Renkli" / "Sac Galvaniz Panel (5 cm)", "Bitümlü Örtü İle Su Yalıtımı",
     "DN155 Çinko Yağmur Oluğu", "DN120 Çinko Yağmur" / "İniş Borusu". Ebat küçükten büyüğe, cm, ondalık noktalı; sözcük başları büyük.
     t: eleman türü (cati.js mem.t), b / h (m), yer: 'plan' | 'kesit'. Göğüsleme modelde tek çapraz (örnekte çift): "2x" yazılmaz. */
  const ebatYaz = (b, h) => [b, h].map(v => +(v * 100).toFixed(1)).sort((x, y) => x - y).join('x');
  const basBuyuk = s => String(s || '').toLocaleLowerCase('tr').replace(/(^|[\s(/-])(\S)/g, (m, a, c) => a + c.toLocaleUpperCase('tr'));
  const CATI_AD = { 'Duvar aşığı': 'D. Aşığı' };
  const catiUyeYazisi = (t, b, h, yer) => { const ad = CATI_AD[t] || basBuyuk(t), e = ebatYaz(b, h);
    if (t === 'Kuşaklama') return [ad, '2x' + e]; if (t === 'Göğüsleme' || (t === 'Dikme' && yer === 'plan')) return [ad, e]; return [ad + ' ' + e]; };
  /* uzun yazıyı ortaya en yakın sözcük arasından iki satıra böler (Çokal: "EPS Dolgulu Renkli" / "Sac Galvaniz Panel (5 cm)") */
  const ikiSatir = (s, en = 20) => { s = String(s); if (s.length <= en) return [s]; const w = s.split(' '); let best = null;
    for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(' '), b = w.slice(i).join(' '), d = Math.abs(a.length - b.length); if (!best || d < best.d) best = { d, r: [a, b] }; } return best ? best.r : [s]; };
  /* kaplama katmanı: k = { tur: 'alt' | 'xps' | 'su' | 'ortu', key, ad, t (m) } */
  const catiKatmanYazisi = k => {
    if (k.tur === 'alt' && k.key === 'tahta18') return ['Kaplama Tahtası', '1.8x10'];
    if (k.tur === 'su' && k.key === 'bitum') return ['Bitümlü Örtü İle Su Yalıtımı'];
    if (k.tur === 'xps') return [`XPS Isı Yalıtımı (${+(k.t * 100).toFixed(1)} cm)`];
    const ad = basBuyuk(String(k.ad || '').replace(/\s*\([^)]*\)\s*$/, '')), par = /\(([^)]*)\)\s*$/.exec(k.ad || '');
    const s = k.tur === 'ortu' && /panel/i.test(k.ad || '') ? `${ad} (${+(k.t * 100).toFixed(1)} cm)` : ad + (par && k.tur !== 'ortu' ? ` (${par[1]})` : '');
    return ikiSatir(s); };
  const olukYazisi = dn => [`DN${dn} Çinko Yağmur Oluğu`];
  /* lento (Çokal 6-Blower_R2 kesit detayı: MTEXT Yazi25 "Lento" / "(20x20)", ok _ClosedBlank): en (duvar kalınlığı) x yükseklik, cm */
  const lentoYazisi = (en, h) => ['Lento', `(${Math.round(en * 100)}x${Math.round(h * 100)})`];
  const inisBorusuYazisi = dn => [`DN${dn} Çinko Yağmur`, 'İniş Borusu'];

  /* ---------- 6) GÖRÜNÜŞTE TOPRAK ALTI (firma kuralı 14.11.2026: toprak altında kalan yapı kısımları görünmez) ----------
     Görünüşün izdüşümü (u yatay, v = kot): kapalı çevreler, açık çizgiler ve görünen kenarlar zemin kotunun (zg) altında kırpılır.
     R: { loops: [[u, v] …], equip, open: [[u, v] …], vis: [[[u, v], [u, v]] …] } (katman bilgisi lk korunur). Döner: yeni R + { kesilen: n } */
  const zeminAltiKirp = (R, zg) => {
    const ust = q => q[1] >= zg - 1e-9, kes = (p, q) => { const t = (zg - p[1]) / (q[1] - p[1]); return [p[0] + (q[0] - p[0]) * t, zg]; };
    let n = 0; const kopya = (src, dst) => { if (src.lk !== undefined) dst.lk = src.lk; if (src.terr !== undefined) dst.terr = src.terr; return dst; };
    const cevre = lp => { const out = []; for (let i = 0; i < lp.length; i++) { const p = lp[i], q = lp[(i + 1) % lp.length], ip = ust(p), iq = ust(q); if (ip) out.push(p); if (ip !== iq) out.push(kes(p, q)); } if (out.length !== lp.length || out.some((q, i) => q !== lp[i])) n++; return kopya(lp, out); };
    const alan = lp => { let a = 0; for (let i = 0; i < lp.length; i++) { const p = lp[i], q = lp[(i + 1) % lp.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };
    const parca = pl => { const out = []; let cur = []; for (let i = 0; i < pl.length; i++) { const p = pl[i]; if (ust(p)) { if (i && !ust(pl[i - 1])) cur.push(kes(pl[i - 1], p)); cur.push(p); } else { if (i && ust(pl[i - 1])) { cur.push(kes(pl[i - 1], p)); } if (cur.length > 1) out.push(kopya(pl, cur)); if (cur.length) n++; cur = []; } } if (cur.length > 1) out.push(kopya(pl, cur)); return out; };
    const seg = sg => { const [p, q] = sg, ip = ust(p), iq = ust(q); if (ip && iq) return sg; n++; if (!ip && !iq) return null; return kopya(sg, ip ? [p, kes(p, q)] : [kes(p, q), q]); };
    const L = lps => (lps || []).map(cevre).filter(lp => lp.length >= 3 && alan(lp) > 1e-8);
    const out = Object.assign({}, R, { loops: L(R.loops), equip: L(R.equip), open: (R.open || []).flatMap(parca), vis: (R.vis || []).map(seg).filter(Boolean) });
    if (R.byMat) out.byMat = R.byMat.map(g => Object.assign({}, g, { loops: L(g.loops) })).filter(g => g.loops.length);
    out.kesilen = n; return out;
  };
  /* görünüşün zemin kotu: tretuvarın oturduğu zemin (zg) en düşüğü; yoksa "toprak / zemin" adlı seviye; yoksa null (kırpılmaz) */
  const zeminKotu = (ogeler, seviyeler) => { const t = (ogeler || []).filter(e => e.type === 'tretuvar' && isFinite(+e.zg)).map(e => +e.zg);
    if (t.length) return Math.min(...t); const s = (seviyeler || []).find(q => /toprak|tabii zemin|zemin kotu/i.test(String(q.ad || q.id || ''))); return s && isFinite(+s.z) ? +s.z : null; };
  /* ---------- 7) SİLUET KENARI (plan / kesit / görünüş gizli çizgi motoru için) ----------
     C.silEdges (mesh.js) bir yüzü bakana dönük, komşusu arkaya dönük her kenarı siluet sayar. Üst üste katmanlı nesnelerde (zemin kaplaması:
     kaba şap + şap + kaplama) bir katmanın üst yüzü ile bir sonrakinin alt yüzü aynı düzlemde sırt sırtadır; üçgenleme köşegenleri de siluet
     çıkıyordu (Konya ±0.00 planında galeri yürüme yolu üstünden geçen eğik çizgiler). Burada sırt sırta (normalleri zıt, aynı düzlemde)
     iki yüz arasındaki kenar siluet sayılmaz; gerçek siluet (bakana dönük yüz ile arkaya dönük, zıt olmayan yüz) kalır.
     P: üçgen köşeleri düz dizi [x,y,z × 3 …], d: bakış yönü, inner: [[başlangıç, bitiş) üçgen aralıkları] (iç yüzler atlanır). Döner: [[p, q] …] */
  const siluetKenar = (P, d, inner) => {
    if (!P || !P.length || P.length > 2.7e6) return [];
    const inn = inner || [], K = i => Math.round(P[i] * 1e4) + ',' + Math.round(P[i + 1] * 1e4) + ',' + Math.round(P[i + 2] * 1e4), Mp = new Map();
    for (let o = 0; o < P.length; o += 9) {
      if (inn.length && inn.some(([a, b]) => o / 9 >= a && o / 9 < b)) continue;
      const ux = P[o + 3] - P[o], uy = P[o + 4] - P[o + 1], uz = P[o + 5] - P[o + 2], vx = P[o + 6] - P[o], vy = P[o + 7] - P[o + 1], vz = P[o + 8] - P[o + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz); if (l < 1e-12) continue; nx /= l; ny /= l; nz /= l;
      const dd = nx * d[0] + ny * d[1] + nz * d[2], sg = dd > 1e-4 ? 1 : dd < -1e-4 ? -1 : 2;
      for (let m = 0; m < 3; m++) { const ia = o + m * 3, ib = o + ((m + 1) % 3) * 3, ka = K(ia), kb = K(ib); if (ka === kb) continue; const k = ka < kb ? ka + '|' + kb : kb + '|' + ka; let q = Mp.get(k); if (!q) Mp.set(k, q = { a: ia, b: ib, f: [] }); if (q.f.length < 8) q.f.push([sg, nx, ny, nz]); }
    }
    const out = [];
    for (const q of Mp.values()) { const f = q.f; let sil = false;
      for (let i = 0; i < f.length && !sil; i++) for (let j = i + 1; j < f.length; j++) { const a = f[i], b = f[j]; if (a[0] === b[0] || (a[0] === 2 && b[0] === 2)) continue; if (a[1] * b[1] + a[2] * b[2] + a[3] * b[3] < -0.9999) continue; sil = true; break; }
      if (sil) out.push([[P[q.a], P[q.a + 1], P[q.a + 2]], [P[q.b], P[q.b + 1], P[q.b + 2]]]); }
    return out;
  };
  /* KESİT İÇ DÜŞEY ZİNCİRLERİ (denetim 14.11.2026: Konya B-B'de 41 · 564 · 1064 iki kez, aynı hacimde dört düşey sıra): iki doğramalı duvarın zincirleri
     aynı kot aralığını kaplıyorsa kaba olan (kırılma noktaları ötekinin içinde) atılır, aynı tek ölçü ikinci kez yazılmaz.
     L: [{ k: 'v' | 'h' …, a: [s, z], b: [s, z], p: [s, z] }] (kesit koordinatı). Yatay ölçüler aynen kalır. */
  const icZincirSadele = L => {
    const yuv = v => Math.round(v * 200) / 200, D = [], O = [];
    for (const q of L || []) { if (q.k !== 'v') { O.push(q); continue; } const x = yuv(q.a[0]); let g = D.find(r => Math.abs(r.x - x) < 0.01); if (!g) D.push(g = { x, q: [] }); g.q.push(q); }
    const nok = g => new Set(g.q.flatMap(q => [yuv(q.a[1]), yuv(q.b[1])])), ara = g => { const z = g.q.flatMap(q => [q.a[1], q.b[1]]); return [yuv(Math.min(...z)), yuv(Math.max(...z))]; };
    const at = new Set();
    for (const A of D) for (const B of D) { if (A === B || at.has(A) || at.has(B)) continue; const a = ara(A), b = ara(B); if (a[0] < b[0] - 0.01 || a[1] > b[1] + 0.01) continue; // A, B'nin aralığında
      const nA = nok(A), nB = nok(B); if (A.q.length > 1 && [...nA].every(z => nB.has(z)) && nB.size > nA.size) at.add(A); } // A kaba: noktaları B'de var
    const gor = new Set(), out = [];
    for (const g of D) { if (at.has(g)) continue; for (const q of g.q) { const k = yuv(Math.min(q.a[1], q.b[1])) + '|' + yuv(Math.max(q.a[1], q.b[1])); if (gor.has(k)) continue; gor.add(k); out.push(q); } }
    return O.concat(out);
  };
  const api = { siluetKenar, icZincirSadele, tipNumaralari, kodYazi, kesitAksSiralari, aksTuret, aksEtiketleri, planOlcuSiralari, mahalBul, kesitYerleri, acikIzleri, dogramaCercevesi, okluAciklamaYeri, korkulukYazisi, lentoYazisi, catiUyeYazisi, catiKatmanYazisi, olukYazisi, inisBorusuYazisi, ikiSatir, kesitKeser, eksikKesitler, icElemanlar, olcuCakisma, olcuKutusu, zeminAltiKirp, zeminKotu };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!C) return;
  C.mimariOtoApi = api;
  C.siluetKenar = (t, d) => (t && t.pos ? siluetKenar(t.pos, d, t.inner) : []); // gorunus.js / kesit.js gizli çizgi motoru (sırt sırta katman yüzleri siluet değil)

  /* ======================= MODEL BAĞLANTISI ======================= */
  const kural = () => (C.cizimKural && C.cizimKural.MIMARI) || {};
  const DK = () => Object.assign({ balonR: 3, kodMm: 2, yaziMm: 2, cizgiRenk: 243, mesafe: 15.7, katman: 'DOGRAMA_NO' }, kural().dogramaNo || {});
  const AK = () => Object.assign({ balonR: 6, yaziMm: 5, balonOte: 11 }, kural().aks || {});
  const OY = () => Object.assign({ ilkSira: 14, siraAraligi: 5 }, (kural().olcuYeri || {}).genel || {});
  const siraMm = Y => Y.siraModel ? Y.siraModel * 1000 / ((C.doc && C.doc.set && +C.doc.set.anno) || 50) : Y.siraAraligi;
  const katmanAc = ad => { if (C.ensureLayer) C.ensureLayer(ad, 7, 'CONTINUOUS', 20); return ad; };
  const bbox3 = e => { let t; try { t = C.entTris(e); } catch (er) { return null; } const P = t && t.pos; if (!P || !P.length) return null; const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let i = 0; i < P.length; i += 3) { b[0] = Math.min(b[0], P[i]); b[1] = Math.min(b[1], P[i + 1]); b[2] = Math.min(b[2], P[i + 2]); b[3] = Math.max(b[3], P[i]); b[4] = Math.max(b[4], P[i + 1]); b[5] = Math.max(b[5], P[i + 2]); } return b; };

  /* model doğramaları: { e, id, kind, kTip, w, h, par, kanat, c (duvar ekseninde orta, plan), u (duvar doğrultusu), nn (duvar normali), z0 (eşik kotu), host } */
  const dogramalar = ents => {
    const I = C._ins, out = []; if (!I || !I.hostFrame) return out;
    for (const e of ents || C.doc.ents) { if (e.type !== 'acik' || e.gv || !C.layer(e.layer).on) continue; const H = I.hostFrame(e); if (!H) continue; const { h, sf, F } = H, s = +e.s || 0, mid = (F.lB + F.rB) / 2;
      const kapi = e.kind === 'kapi', par = kapi ? 0 : (+e.par || 0.9); // 3B ağıyla aynı (insaat.js T.acik.mesh): kapı eşiği duvar altında, pencere parapeti verilmemişse 0,90
      out.push({ e, id: e.id, kind: kapi ? 'kapi' : (e.kind === 'panjur' ? 'panjur' : 'pencere'), kTip: e.kTip, w: +e.w || 1, h: +e.hh || (kapi ? 2.1 : 1.4), par, kanat: +e.kanat || 1, malzeme: e.malzeme || e.mal, el: e.el,
        duvar: Math.abs(F.rB - F.lB) || 0.2, yon: e.yon, pnl: e.pnl,
        c: [sf.a[0] + sf.u[0] * s + sf.nn[0] * mid, sf.a[1] + sf.u[1] * s + sf.nn[1] * mid], u: [sf.u[0], sf.u[1]], nn: [sf.nn[0], sf.nn[1]], mid, z0: (+h.z0 || 0) + par, host: h }); }
    return out;
  };
  /* doğrama detay paftası için tip listesi: [{ kod, tur, w, h, parapet, adet, kanat, malzeme, ids, etiket, baslik }] (cm) */
  C.kapiPencereTipleri = ents => tipNumaralari(dogramalar(ents)).tipler;
  C.kapiPencereKodlari = ents => tipNumaralari(dogramalar(ents)).kodOf;
  const kesenDuvar = (d, hKes) => { const z0 = +d.host.z0 || 0, z1 = z0 + (+d.host.h || 3); return hKes >= z0 - 0.01 && hKes <= z1 + 0.01; };

  /* PLANDA TİP ETİKETİ (Çokal İdari planı): duvar ekseninden dışarı çizgi, ucunda daire içinde kod; çizginin üstünde genişlik, altında yükseklik.
     gv: plan görünümü, W: model → çizim, hKes: plan kesit kotu, bb: yapının plan kutusu. Döner: eklenen etiket sayısı */
  C.dogramaEtiketPlan = (gv, W, hKes, ents, bb) => {
    const D = DK(), k = C.annoH(1), L = katmanAc(D.katman), kodOf = C.kapiPencereKodlari(ents), cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2, yer = []; let n = 0;
    const mk = (type, p) => C.add(C.newEnt(type, Object.assign({ gv, layer: L }, p)));
    for (const d of dogramalar(ents)) {
      const kod = kodOf[d.id]; if (!kod || !kesenDuvar(d, hKes) || hKes < d.z0 - 0.01 || hKes > d.z0 + d.h + 0.01) continue; // plan kesit düzleminin kestiği doğrama (yüksek pencere kesitte ve görünüşte numaralanır)
      let o = d.nn.slice(); if ((d.c[0] - cx) * o[0] + (d.c[1] - cy) * o[1] < 0) o = [-o[0], -o[1]]; // yapının dışına doğru (iç duvarda merkezden uzağa)
      const KY = kodYazi(kod, D), r = KY.r * k, P = s => W([d.c[0] + o[0] * s, d.c[1] + o[1] * s]); // uzun kod (SEK1) daireye sığar
      /* etiketler üst üste binmesin: aynı yerde başka etiket varsa (yan yana doğrama, aynı noktada iki doğrama) 9 mm dışarı */
      let Lc = D.mesafe * k; for (let g = 0; g < 4 && yer.some(q => Math.hypot(q[0] - P(Lc)[0], q[1] - P(Lc)[1]) < 2 * r + 7 * k); g++) Lc += 9 * k; yer.push(P(Lc));
      const dt = (o[0] > 0.5 || o[1] > 0.5) ? o : [-o[0], -o[1]], rot = Math.atan2(dt[1], dt[0]) * 180 / Math.PI, pr = [-dt[1], dt[0]]; // yazı doğrultusu (okunur), "üst" yönü
      const c = P(Lc), tm = P(Lc - r - 3.4 * k), yz = D.yaziMm * k, off = 0.5 * k;
      mk('line', { a: P(0), b: P(Lc - r), color: D.cizgiRenk });
      mk('circle', { c, r });
      mk('text', Object.assign({ p: c, h: KY.h * k, s: kod, rot, al: 'M' }, KY.wf < 0.7 - 1e-9 ? { st: 'YZ', wf: KY.wf } : {}));
      mk('text', { p: [tm[0] + pr[0] * off, tm[1] + pr[1] * off, 0], h: yz, s: String(Math.round(d.w * 100)), rot, al: 'C' });
      mk('text', { p: [tm[0] - pr[0] * (off + yz), tm[1] - pr[1] * (off + yz), 0], h: yz, s: String(Math.round(d.h * 100)), rot, al: 'C' });
      n++;
    }
    return n;
  };

  /* KESİTTE TİP ETİKETİ: hattın içinden geçtiği (dik duvar) ve kesitin baktığı (paralel duvar, derinlik içinde) doğramaların üstünde daire içinde kod.
     K: { a, u, n, depth, W, inU } (kesit.js) */
  C.dogramaEtiketKesit = K => {
    const D = DK(), k = C.annoH(1), kodOf = C.kapiPencereKodlari(), L = katmanAc('KESIT_' + D.katman), used = [], DG = dogramalar(), ortulu = ortuYap(K, DG); let n = 0;
    for (const d of DG) { const kod = kodOf[d.id]; if (!kod) continue;
      const dist = (d.c[0] - K.a[0]) * K.n[0] + (d.c[1] - K.a[1]) * K.n[1], s = (d.c[0] - K.a[0]) * K.u[0] + (d.c[1] - K.a[1]) * K.u[1];
      if (Math.abs(d.u[0] * K.u[0] + d.u[1] * K.u[1]) > 0.9) { if (dist < -0.05 || dist > K.depth) continue; if (K.zAt) { const zz = K.zAt(s, d.z0 + d.h / 2); if (isFinite(zz) && zz < K.a[0] * K.n[0] + K.a[1] * K.n[1] + dist - d.duvar / 2 - 0.03) continue; } else if (ortulu(d, dist)) continue; } // paralel duvar: bakılan tarafta, yalnız görünen (önü kapalı değil) doğramaya
      else if (Math.abs(dist) > d.w / 2) continue; // dik duvar: hat doğramanın içinden geçer
      if (!K.inU([s, 0])) continue;
      const KY = kodYazi(kod, D), r = KY.r * k, q = [s, d.z0 + d.h + r + 2 * k];
      if (used.some(p => Math.hypot(p[0] - q[0], p[1] - q[1]) < 2 * r + 0.5 * k)) continue; used.push(q);
      C.add(C.newEnt('circle', { c: K.W(q), r, layer: L })); C.add(C.newEnt('text', Object.assign({ p: K.W(q), h: KY.h * k, s: kod, rot: 0, al: 'M', layer: L }, KY.wf < 0.7 - 1e-9 ? { st: 'YZ', wf: KY.wf } : {}))); n++;
    }
    return n;
  };

  /* ===== DOĞRAMA ÇİZİMİ plan, kesit ve görünüşte (firma kuralı 14.11.2026: detay paftasındaki tip detayına uygun; tek kaynak mimari-detay.js) =====
     Çokal 10-İdari Bina_R2: plan, kesit ve görünüşteki doğrama çizgileri `Kapi_Pencere` katmanında (renk 23, 0,25; görünüşte kasa, kanat bölümleri
     ve açılım çizgileri; planda kasa profili, kanat ve kapı açılım yayı). Program katmanı …_DOGRAMA → Kapi_Pencere (cizim-kural.js). Yazılar çizilmez. */
  const DOG_KATMAN = ad => { if (C.ensureLayer) C.ensureLayer(ad, 23, 'CONTINUOUS', 25); return ad; };
  const yapiMerkezi = ents => { const b = C.extents((ents || C.doc.ents).filter(e => !e.gv && /^(perde|kolon|wall|duvar)$/.test(e.type) && C.layer(e.layer).on)); return b && isFinite(b[0]) ? [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] : [0, 0]; };
  /* doğramanın çizim tipi: detay paftasındaki tipi (kanat, yön, panel), ölçüleri ve duvar kalınlığı bu doğramanınki */
  const cizimTipi = (d, tipler) => { const T = tipler.find(q => q.ids.includes(d.id)); if (!T) return null; return Object.assign({}, T, { w: Math.round(d.w * 100), h: Math.round(d.h * 100), duvar: Math.round(d.duvar * 100), kanat: d.kanat || T.kanat }); };
  /* çizim listesi → nesne (X: yerel [x, y] → çizim [X, Y, 0]); yay, ayna dönüşümde de doğru kalsın diye çoklu çizgi olur; yazı, ölçü, tarama çizilmez.
     Döner: kesit koordinatında parçalar (seg verilirse) */
  const listeCiz = (items, X, ek, seg) => {
    const mk = (type, p) => { const e = C.add(C.newEnt(type, Object.assign({}, ek, p))); if (e) delete e.sp; return e; };
    for (const it of items) {
      if (it.k === 'L') { mk('line', { a: X(it.a), b: X(it.b) }); if (seg) seg.push([it.a, it.b]); }
      else if (it.k === 'P') { mk('pline', { pts: it.pts.map(X), closed: !!it.cl }); if (seg) for (let i = 1; i < it.pts.length + (it.cl ? 1 : 0); i++) seg.push([it.pts[i - 1], it.pts[i % it.pts.length]]); }
      else if (it.k === 'C') { const c = X(it.c), q = X([it.c[0] + it.r, it.c[1]]); mk('circle', { c, r: Math.hypot(q[0] - c[0], q[1] - c[1]) }); }
      else if (it.k === 'A') { const n = 12, P = []; let a1 = it.a1; while (a1 < it.a0) a1 += 360; for (let i = 0; i <= n; i++) { const a = (it.a0 + (a1 - it.a0) * i / n) * Math.PI / 180; P.push([it.c[0] + it.r * Math.cos(a), it.c[1] + it.r * Math.sin(a)]); } mk('pline', { pts: P.map(X), closed: false }); }
    }
  };
  /* PLAN: plan kesit düzleminin kestiği doğramaya 1-1 kesiti (kasa, kayıtlar, cam, denizlik; kapıda kanat ve açılım yayı modeldeki menteşe ve açılış yönüyle).
     gv: plan görünümü, W: model → çizim, hKes: plan kesit kotu. Döner: çizilen doğrama sayısı */
  C.dogramaCizPlan = (gv, W, hKes, ents) => {
    const A = C.mimariDetayApi; if (!A) return 0; const L = DOG_KATMAN('PLAN_DOGRAMA'), DG = dogramalar(ents), tipler = tipNumaralari(DG).tipler, mz = yapiMerkezi(ents); let n = 0;
    for (const d of DG) { if (!kesenDuvar(d, hKes) || hKes < d.z0 - 0.01 || hKes > d.z0 + d.h + 0.01) continue; const t = cizimTipi(d, tipler); if (!t) continue;
      const F = dogramaCercevesi(d, mz), r = A.dograma11(t, { duvar: false, mentese: F.mentese, ters: F.ters });
      listeCiz(r.items, q => W([F.P0[0] + F.x[0] * q[0] - F.o[0] * q[1], F.P0[1] + F.x[1] * q[0] - F.o[1] * q[1]]), { gv, layer: L }); n++; }
    return n;
  };
  /* GÖRÜNÜŞ (cephe): bakana dönük dış yüzdeki, önü kapalı olmayan doğramaya görünüş çizimi. o: { ents, D (bakış), R (görünüşün yatay ekseni), zAt (u, v) → z-tampon derinliği,
     W, gv, layer, zg (zemin kotu) }. Doğramanın önünde başka eleman varsa (z-tampon doğrama yüzünden yakın) çizilmez. Döner: sayı */
  C.dogramaCizGorunus = o => {
    const A = C.mimariDetayApi; if (!A) return 0; const L = DOG_KATMAN(o.layer || 'GORUNUS_DOGRAMA'), DG = dogramalar(o.ents), tipler = tipNumaralari(DG).tipler, mz = yapiMerkezi(o.ents), Dn = o.D, Rr = o.R; let n = 0;
    const dot = (p, v) => p[0] * v[0] + p[1] * v[1] + (p[2] || 0) * (v[2] || 0);
    for (const d of DG) { const F = dogramaCercevesi(d, mz); if (F.o[0] * Dn[0] + F.o[1] * Dn[1] > -0.7) continue; // dış yüzü bakana dönük
      if (o.zg != null && d.z0 + d.h < o.zg) continue; const t = cizimTipi(d, tipler); if (!t) continue;
      const m = [F.dis[0], F.dis[1], d.z0 + d.h / 2], wf = dot(m, Dn); if (o.zAt) { const z = o.zAt(dot(m, Rr), m[2]); if (isFinite(z) && z < wf - 0.12) continue; } // önü kapalı
      const r = A.dogramaGorunus(t, { yazi: false, doseme: false, mentese: F.mentese });
      listeCiz(r.items, q => { const p = [F.P0[0] + F.x[0] * q[0], F.P0[1] + F.x[1] * q[0], d.z0 + q[1]]; return o.W([dot(p, Rr), p[2]]); }, { gv: o.gv, layer: L }); n++; }
    return n;
  };
  /* KESİT: hattın içinden geçtiği doğramaya 2-2 kesiti (duvarı kesit kendisi çizer), kesitin baktığı (derinlik içindeki, hatta paralel duvardaki) doğramaya görünüş.
     K: { a, u, n, depth, W, inU } (kesit.js). Döner: kesit koordinatında (s, z) çizgi parçaları (kot yazısı ve ölçüler bunlara binmesin) */
  /* kesitte örtü: kesit düzlemiyle doğrama arasında, kesite paralel, doğramanın ortasını (s, z) kapatan ve orada boşluğu olmayan duvar (kesit gizli çizgi ayıklamaz) */
  const ortuYap = (K, DG) => { const S = p => (p[0] - K.a[0]) * K.u[0] + (p[1] - K.a[1]) * K.u[1], Nd = p => (p[0] - K.a[0]) * K.n[0] + (p[1] - K.a[1]) * K.n[1];
    const PER = C.doc.ents.filter(e => !e.gv && e.type === 'perde' && Array.isArray(e.pts) && e.pts.length === 2 && C.layer(e.layer).on);
    return (d, dist) => { const s = S(d.c), z = d.z0 + d.h / 2;
      return PER.some(w => { if (w.id === d.host.id) return false; const a = w.pts[0], b = w.pts[1], u = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(u[0], u[1]); if (l < 0.1 || Math.abs((u[0] * K.u[0] + u[1] * K.u[1]) / l) < 0.9) return false;
        const dw = Nd(a); if (dw < 0.05 || dw > dist - 0.1) return false; const s0 = Math.min(S(a), S(b)), s1 = Math.max(S(a), S(b)), z0 = +w.z0 || 0, z1 = z0 + (+w.h || 3); if (s < s0 || s > s1 || z < z0 || z > z1) return false;
        return !DG.some(o => o.host.id === w.id && Math.abs(S(o.c) - s) <= o.w / 2 && z >= o.z0 && z <= o.z0 + o.h); }); }; };
  /* çizim listesi → yerel çizgi parçaları (yay ve daire çokgenleştirilir) */
  const parcala = items => { const o = []; for (const it of items) { if (it.k === 'L') o.push([it.a, it.b]); else if (it.k === 'P') for (let i = 1; i < it.pts.length + (it.cl ? 1 : 0); i++) o.push([it.pts[i - 1], it.pts[i % it.pts.length]]);
      else if (it.k === 'A' || it.k === 'C') { const a0 = it.k === 'C' ? 0 : it.a0; let a1 = it.k === 'C' ? 360 : it.a1; while (a1 < a0) a1 += 360; const n = 12, Q = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; Q.push([it.c[0] + it.r * Math.cos(a), it.c[1] + it.r * Math.sin(a)]); } for (let i = 1; i < Q.length; i++) o.push([Q[i - 1], Q[i]]); } } return o; };
  C.dogramaCizKesit = K => {
    const A = C.mimariDetayApi, seg = []; if (!A) return seg; const L = DOG_KATMAN('KESIT_DOGRAMA'), DG = dogramalar(), tipler = tipNumaralari(DG).tipler, mz = yapiMerkezi();
    const S = p => (p[0] - K.a[0]) * K.u[0] + (p[1] - K.a[1]) * K.u[1], ortulu = ortuYap(K, DG), kutular = []; seg.kutular = kutular;
    for (const d of DG) { const t = cizimTipi(d, tipler); if (!t) continue; const F = dogramaCercevesi(d, mz), dist = (d.c[0] - K.a[0]) * K.n[0] + (d.c[1] - K.a[1]) * K.n[1];
      if (!K.inU([S(d.c), 0])) continue;
      if (Math.abs(d.u[0] * K.u[0] + d.u[1] * K.u[1]) > 0.9) { // paralel duvar: görünüş
        if (dist < Math.max(0.05, F.td / 2 + 0.01) || dist > K.depth) continue;
        const r = A.dogramaGorunus(t, { yazi: false, doseme: false, mentese: F.mentese }), P = q => [S([F.P0[0] + F.x[0] * q[0], F.P0[1] + F.x[1] * q[0]]), d.z0 + q[1]];
        if (K.zAt) { /* gizli çizgi (kullanıcı 14.11.2026: "en yakın olan gözüksün"): doğramanın bakana yakın yüzünden önde bir yüzey (duvar, kolon, başka doğrama — cam opak) varsa o kısım çizilmez */
          const wD = dist - F.td / 2 - 0.03, gor = q => { const z = K.zAt(q[0], q[1]); return !isFinite(z) || z >= wD + (K.a[0] * K.n[0] + K.a[1] * K.n[1]); };
          const par = parcala(r.items), acik = []; for (const [p, q] of par) { const A2 = P(p), B2 = P(q), n2 = Math.max(2, Math.ceil(Math.hypot(B2[0] - A2[0], B2[1] - A2[1]) / 0.02)); let run = null;
            for (let i = 0; i <= n2; i++) { const s = i / n2, X = [A2[0] + (B2[0] - A2[0]) * s, A2[1] + (B2[1] - A2[1]) * s], ok = gor(X); if (ok && run == null) run = X; if ((!ok || i === n2) && run) { const Y = ok ? X : [A2[0] + (B2[0] - A2[0]) * (i - 1) / n2, A2[1] + (B2[1] - A2[1]) * (i - 1) / n2]; if (Math.hypot(Y[0] - run[0], Y[1] - run[1]) > 1e-4) acik.push([run, Y]); run = null; } } }
          if (!acik.length) continue; for (const [p, q] of acik) { const e = C.add(C.newEnt('line', { a: K.W(p), b: K.W(q), layer: L })); if (e) delete e.sp; seg.push([p, q]); }
          if (acik.length > 0.3 * par.length) kutular.push((b => [Math.min(b[0], b[2]), b[1], Math.max(b[0], b[2]), b[3]])([P([0, 0])[0], d.z0, P([d.w, 0])[0], d.z0 + d.h])); // büyük kısmı görünen doğrama: ölçü zinciri üstünden geçmesin
          continue; }
        if (ortulu(d, dist)) continue; // z-tampon yoksa: arada kesite paralel bir duvar doğramayı örtüyor
        const sg = []; listeCiz(r.items, q => K.W(P(q)), { layer: L }, sg); for (const [p, q] of sg) seg.push([P(p), P(q)]);
        kutular.push((b => [Math.min(b[0], b[2]), b[1], Math.max(b[0], b[2]), b[3]])([P([0, 0])[0], d.z0, P([d.w, 0])[0], d.z0 + d.h]));
      } else if (Math.abs(dist) <= d.w / 2) { // dik duvar: hat doğramayı keser — 2-2 kesiti (x 0 iç yüz … td dış yüz)
        const r = A.dograma22(t, { duvar: false, yazi: false }), sg = [], P = q => [S([F.dis[0] - F.o[0] * (F.td - q[0]), F.dis[1] - F.o[1] * (F.td - q[0])]), d.z0 + q[1]];
        listeCiz(r.items, q => K.W(P(q)), { layer: L }, sg); for (const [p, q] of sg) seg.push([P(p), P(q)]); }
    }
    return seg;
  };

  /* ===== KORKULUK OKLARI (firma kuralı 14.11.2026: plan ve kesitte her korkuluğa oklu açıklama, yazıda detay kodu) =====
     Çokal 10-İdari Bina_R2: ok MULTILEADER `YZ` katmanında (ucu _ClosedBlank 1,2 mm), yazı `Mim_Yazi25` 2 mm. Program: leader (app/leader.js, okt 'bos')
     katmanı ACIKLAMA_OKU → YZ, yazı YAZI → Mim_Yazi25 (cizim-kural.js). Bir korkuluk nesnesine ve korkuluklu her merdivene bir ok. */
  const OKK = { aci: 59, kolMm: 11.7, okMm: 1.2, yaziMm: 2, bosluk: 0.8 };
  const korkulukTipi = ents => { const T = C.mimariKorkuluklar ? C.mimariKorkuluklar(ents) : [];
    return e => T.find(t => t.kh === Math.round(+e.kh || 110) && t.dik === Math.round(+e.dik || 150) && t.km === (e.km || 'galvaniz') && t.tk === (e.tk === 'H' ? 'H' : 'E')) || { kh: Math.round(+e.kh || 110) }; };
  const malAdi = e => { const K = C._mrd && C._mrd.KM; return K && K[e.km || 'galvaniz'] ? K[e.km || 'galvaniz'][0] : 'Sıcak daldırma galvaniz çelik'; };
  /* görünümdeki engeller (çizim koordinatı): kesilen kapalı alanlar, ölçü / kot / yazı / etiket kutuları, çizgiler */
  /* açılım kodunun yazı kutuları (kodun çizgisi değil): prims içindeki yazılar */
  const acilimYaziKutulari = e => { const out = []; let P = []; try { P = C.prims ? C.prims(e) : []; } catch (er) { } for (const pr of P || []) { if (pr.k !== 'T') continue; let b = null; try { b = C.bbox({ type: 'text', p: pr.p, h: pr.h, s: pr.s, al: pr.al, rot: (pr.rot || 0) * 180 / Math.PI, st: pr.st }); } catch (er) { } if (b && isFinite(b[0])) out.push(b); } return out; };
  C.acilimYaziKutulari = acilimYaziKutulari;
  const engelTopla = list => { const alanlar = [], kutular = [], cizgiler = [];
    for (const e of list) {
      if (/^(dim|kot|text|baslik|leader|circle)$/.test(e.type)) { let b = null; try { delete e._c; b = C.bbox(e); } catch (er) { } if (b && isFinite(b[0])) kutular.push({ bb: b, a: 1e3 }); continue; }
      if (e.type === 'acilim') { for (const b of acilimYaziKutulari(e)) kutular.push({ bb: b, a: 1e3 }); continue; } // malzeme açılım kodu: yalnız yazısı (çizgisi engel değil)
      if (e.type === 'pline' && Array.isArray(e.pts) && e.pts.length > 1) { const P = e.pts.map(q => [q[0], q[1]]); if (e.closed && P.length > 2 && /(^|_)KESIT(_|$)/.test(e.layer || '') && !/KORKULUK|DOGRAMA|MERDIVEN/.test(e.layer || '')) alanlar.push({ pts: P, a: 1e6, g: e.layer });
        for (let i = 1; i < P.length + (e.closed ? 1 : 0); i++) cizgiler.push([P[i - 1], P[i % P.length]]); }
      else if (e.type === 'line' && e.a && e.b) cizgiler.push([[e.a[0], e.a[1]], [e.b[0], e.b[1]]]);
    }
    return { alanlar, kutular, cizgiler }; };
  const okKoy = (gruplar, list, ek, O0) => { // gruplar: [{ adaylar (çizim), satir: [s1, s2 …] }] — ilk satır kırılmanın üstünde, öbürleri altında
    const O = Object.assign({}, OKK, O0 || {}), k = C.annoH(1), E = engelTopla(list), h = O.yaziMm * k, mw = s => (C.measureText ? C.measureText(String(s), h) : String(s).length * 0.75 * h * 0.7); let n = 0;
    if (C.ensureLayer) C.ensureLayer('ACIKLAMA_OKU', 7, 'CONTINUOUS', 20);
    const mk = (type, p) => { const e = C.add(C.newEnt(type, Object.assign({}, ek, p))); if (e) delete e.sp; return e; };
    for (const g of gruplar) { if (!g.adaylar.length || !g.satir || !g.satir.length) continue; const w = Math.max(...g.satir.map(mw)) + 1 * k;
      const r = okluAciklamaYeri({ adaylar: g.adaylar, w, h, L: O.kolMm * k, aci: O.aci, bosluk: O.bosluk * k, alanlar: E.alanlar, kutular: E.kutular, cizgiler: E.cizgiler }); if (!r) continue;
      mk('leader', { pts: [[r.uc[0], r.uc[1], 0], [r.kirik[0], r.kirik[1], 0], [r.son[0], r.son[1], 0]], asz: O.okMm * k, okt: 'bos', layer: 'ACIKLAMA_OKU' });
      mk('text', { p: [r.yazi[0], r.kirik[1] + O.bosluk * k, 0], h, s: g.satir[0], rot: 0, al: 'C', layer: O.yaziKatman || 'YAZI' });
      for (let i = 1; i < g.satir.length; i++) mk('text', { p: [r.yazi[0], r.kirik[1] - O.bosluk * k - h * i - (i - 1) * 0.4 * h, 0], h, s: g.satir[i], rot: 0, al: 'C', layer: O.yaziKatman || 'YAZI' });
      const alt = g.satir.length > 1 ? (g.satir.length - 1) * 1.4 * h : 0, bb = [Math.min(r.kirik[0], r.son[0]), r.kirik[1] - alt - O.bosluk * k, Math.max(r.kirik[0], r.son[0]), r.kirik[1] + h + O.bosluk * k];
      E.kutular.push({ bb, a: 1e3 }); E.cizgiler.push([r.uc, r.kirik], [r.kirik, r.son]); n++; }
    return n; };
  /* korkuluk nesnesinin noktaları boyunca örnekler (uçlardan 0,3 m içeride, 0,4 m arayla): [[x, y, z] …] */
  const korkulukOrnek = e => { const q = e.kapali ? e.pts.concat([e.pts[0]]) : e.pts, out = [];
    for (let i = 1; i < q.length; i++) { const A = q[i - 1], B = q[i], l = Math.hypot(B[0] - A[0], B[1] - A[1]); if (l < 0.05) continue; const n = Math.max(1, Math.floor(l / 0.4));
      for (let j = 0; j <= n; j++) { const t = j / n, x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t; if ((i === 1 && t * l < 0.3) || (i === q.length - 1 && (1 - t) * l < 0.3)) continue; out.push([x, y, (+A[2] || 0) + ((+B[2] || 0) - (+A[2] || 0)) * t]); } }
    return out; };
  const merdivenler = ents => (ents || C.doc.ents).filter(e => !e.gv && e.type === 'merdiven' && e.kork && e.kork !== 'yok' && C.layer(e.layer).on && C.merdivenRailEnds);
  /* PLAN: plan kesit kotunun altında görünen korkuluklar. gv, W (model → çizim), hKes, ents, depth (aşağı görüş). Döner: ok sayısı */
  C.korkulukOkPlan = (gv, W, hKes, ents, depth) => {
    const tip = korkulukTipi(ents), dp = depth == null ? 30 : depth, gor = z => z <= hKes + 0.01 && z >= hKes - dp, G = [];
    for (const e of (ents || C.doc.ents)) { if (e.gv || e.type !== 'korkuluk' || !Array.isArray(e.pts) || e.pts.length < 2 || !C.layer(e.layer).on) continue;
      const P = korkulukOrnek(e).filter(q => gor(q[2])); if (P.length) G.push({ adaylar: P.map(q => { const w = W([q[0], q[1]]); return [w[0], w[1]]; }), satir: korkulukYazisi(tip(e), malAdi(e)) }); }
    for (const e of merdivenler(ents)) { let R = []; try { R = C.merdivenRailEnds(e); } catch (er) { } const P = R.filter(r => gor(+r.p[2] || 0)); if (P.length) G.push({ adaylar: P.map(r => { const w = W([r.p[0], r.p[1]]); return [w[0], w[1]]; }), satir: korkulukYazisi(tip(e), malAdi(e)) }); }
    return G.length ? okKoy(G, C.doc.ents.filter(e => e.gv === gv), { gv }) : 0;
  };
  /* KESİT: kesit derinliğindeki korkuluklar; ok ucu küpeştenin altında (kh × 0,75), hatta yakın olan yeğlenir. K: { a, u, n, depth, W, inU, i0 } */
  C.korkulukOkKesit = K => {
    const tip = korkulukTipi(), S = p => (p[0] - K.a[0]) * K.u[0] + (p[1] - K.a[1]) * K.u[1], N = p => (p[0] - K.a[0]) * K.n[0] + (p[1] - K.a[1]) * K.n[1], G = [];
    const aday = (p, z) => { const d = N(p), s = S(p); if (d < -0.05 || d > K.depth || !K.inU([s, z])) return null; if (K.zAt) { const zz = K.zAt(s, z); if (isFinite(zz) && zz < K.a[0] * K.n[0] + K.a[1] * K.n[1] + d - 0.1) return null; } /* önü kapalı korkuluğa ok gitmez */ const w = K.W([s, z]); return [w[0], w[1], Math.max(0, d) * 0.5]; };
    for (const e of C.doc.ents) { if (e.gv || e.type !== 'korkuluk' || !Array.isArray(e.pts) || e.pts.length < 2 || !C.layer(e.layer).on) continue; const kh = (+e.kh || 110) / 100;
      const P = korkulukOrnek(e).map(q => aday(q, q[2] + kh * 0.75)).filter(Boolean); if (P.length) G.push({ adaylar: P, satir: korkulukYazisi(tip(e), malAdi(e)) }); }
    for (const e of merdivenler()) { let R = []; try { R = C.merdivenRailEnds(e); } catch (er) { } const kh = (+e.kh || 110) / 100;
      const P = R.map(r => aday(r.p, (+r.p[2] || 0) + kh * 0.75)).filter(Boolean); if (P.length) G.push({ adaylar: P, satir: korkulukYazisi(tip(e), malAdi(e)) }); }
    return G.length ? okKoy(G, C.doc.ents.slice(K.i0 || 0), {}) : 0;
  };

  /* ===== ÇATI ELEMANLARI OKLU AÇIKLAMA (firma kuralı 14.11.2026; biçim Çokal 10-İdari Bina_R2 çatı paftası ÇKL-AAT-İB-03 ve 6-Blower çatı kesitinden ölçüldü) =====
     MULTILEADER YZ katmanında, ok ucu _ClosedBlank 6 birim (1,2 mm), eğik kol ≈ 32 birim (6,4 mm) yatayla ≈ 60°, yatay kırılma yazı genişliğinde;
     yazı YZ katmanında 10 birim (2 mm), kırılmanın 4 birim (0,8 mm) üstünde, ikinci satır (ebat) altında. Her eleman türüne bir ok (örnekte simetrik
     yarılarda tekrar var), yer korkuluk okundaki gibi ağırlıklı seçilir (kesilen beton 1e6, ölçü / kot / yazı / başka ok 1e3, çizgi 1). */
  const OKC = { aci: 60, kolMm: 6.4, okMm: 1.2, yaziMm: 2, bosluk: 0.8, yaziKatman: 'ACIKLAMA_OKU' };
  const catiDn = c => ({ oluk: +c.olukDn || 155, boru: +c.boruDn || 120 }); // modelde çap yoksa Çokal İdari çatısındaki DN155 / DN120
  const uyeOrnek = (A, B, n) => { const o = []; for (let i = 1; i <= n; i++) { const t = i / (n + 1); o.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, (A[2] || 0) + ((B[2] || 0) - (A[2] || 0)) * t]); } return o; };
  /* PLAN (ÇATI PLANI): iskelet elemanları, oluk, iniş boruları. W: model → çizim */
  C.catiOkPlan = (gv, W, cati) => {
    if (!cati || !C.catiOkVerisi) return 0; const V = C.catiOkVerisi(cati), G = [], tur = new Map(), w2 = q => { const w = W([q[0], q[1]]); return [w[0], w[1]]; };
    for (const m of V.mem) { if (!m.t || m.t === 'Alın tahtası' || m.t === 'Yastık' || m.t === 'Göğüsleme') continue; (tur.get(m.t) || tur.set(m.t, []).get(m.t)).push(m); } // yastık ve göğüsleme planda çizilmiyor
    for (const [t, L] of tur) { const ad = []; for (const m of L) { if (m.P) ad.push(w2(m.P)); else ad.push(...uyeOrnek(m.A, m.B, 3).map(w2)); } const m0 = L[0];
      G.push({ adaylar: ad.slice(0, 60), satir: catiUyeYazisi(t, m0.b, m0.P ? m0.b : m0.h, 'plan') }); }
    const dn = catiDn(cati); if (V.olukDN) dn.oluk = V.olukDN; if (V.borDN) dn.boru = V.borDN;
    if (V.oluk && V.oluk.length > 2) { const ad = []; for (let i = 0; i < V.oluk.length; i++) ad.push(...uyeOrnek(V.oluk[i], V.oluk[(i + 1) % V.oluk.length], 4).map(w2)); G.push({ adaylar: ad, satir: olukYazisi(dn.oluk) }); }
    if (V.boru.length) G.push({ adaylar: V.boru.map(w2), satir: inisBorusuYazisi(dn.boru) });
    return G.length ? okKoy(G, C.doc.ents.filter(e => e.gv === gv), { gv }, OKC) : 0;
  };
  /* PLAN kotları (Kot katmanında kot nesnesi): mahya (taşıyıcı üstü en yüksek) ve çatı döşemesi üstü — eski düz yazılar Mim_Yazi25'e düşüyordu */
  C.catiKotPlan = (gv, W, cati) => {
    if (!cati || !C.catiGeom) return 0; const G = C.catiGeom(cati); let n = 0; if (C.ensureLayer) C.ensureLayer('CATI_KOT', 7, 'CONTINUOUS', 20);
    const put = (q, v) => { const e = C.add(C.newEnt('kot', { gv, pk: true, p: W([q[0], q[1]]), v: +v.toFixed(3), txt: '', layer: 'CATI_KOT' })); if (e) { delete e.sp; n++; } };
    const zr = Math.max(...G.pieces.flatMap(p => p.z));
    if (G.lines.ridge.length) { const [A, B] = G.lines.ridge.reduce((m, l) => (Math.hypot(l[1][0] - l[0][0], l[1][1] - l[0][1]) > Math.hypot(m[1][0] - m[0][0], m[1][1] - m[0][1]) ? l : m)); const u = [B[0] - A[0], B[1] - A[1]], l = Math.hypot(u[0], u[1]) || 1; put([(A[0] + B[0]) / 2 + u[0] / l * 0.6, (A[1] + B[1]) / 2 + u[1] / l * 0.6], zr); }
    { const w = G.wall, c = [w[0][0] + (w[1][0] - w[0][0]) * 0.25, w[0][1] + (w[1][1] - w[0][1]) * 0.25], nn = [-(w[1][1] - w[0][1]), w[1][0] - w[0][0]], ln = Math.hypot(nn[0], nn[1]) || 1; put([c[0] + nn[0] / ln * 0.9, c[1] + nn[1] / ln * 0.9], +cati.zt || 0); } // döşeme üstü: duvarın içinde (çatı arası)
    return n;
  };
  /* KESİT: kesilen ya da kesit derinliğinde görünen ahşap elemanlar ve kaplama katmanları (taşıyıcı üstünden: kaplama tahtası, XPS, su yalıtımı, örtü).
     K: { a, u, n, depth, W, inU, i0, zAt } (kesit.js; korkuluk okuyla aynı) */
  C.catiOkKesit = K => {
    const S = p => (p[0] - K.a[0]) * K.u[0] + (p[1] - K.a[1]) * K.u[1], N = p => (p[0] - K.a[0]) * K.n[0] + (p[1] - K.a[1]) * K.n[1], d0 = K.a[0] * K.n[0] + K.a[1] * K.n[1], G = [];
    const aday = (p, z, ek) => { const d = N(p), s = S(p); if (d < -0.05 || d > K.depth || !K.inU([s, z])) return null; if (K.zAt && d > 0.05) { const zz = K.zAt(s, z); if (isFinite(zz) && zz < d0 + d - 0.1) return null; } const w = K.W([s, z]); return [w[0], w[1], Math.max(0, d) * 0.5 + (ek || 0)]; };
    for (const cati of C.doc.ents) { if (cati.gv || cati.type !== 'cati' || !C.layer(cati.layer).on || !C.catiOkVerisi) continue; let V; try { V = C.catiOkVerisi(cati); } catch (er) { continue; }
      const tur = new Map();
      for (const m of V.mem) { if (!m.t || m.t === 'Alın tahtası') continue; const L = tur.get(m.t) || tur.set(m.t, { m, ad: [] }).get(m.t);
        if (m.P) { for (const f of [0.35, 0.5, 0.65]) { const q = aday(m.P, m.z1 + (m.z2 - m.z1) * f); if (q) L.ad.push(q); } continue; }
        const dA = N(m.A), dB = N(m.B);
        if ((dA < 0) !== (dB < 0) && Math.abs(dA - dB) > 1e-9) { const t = dA / (dA - dB), P = [m.A[0] + (m.B[0] - m.A[0]) * t, m.A[1] + (m.B[1] - m.A[1]) * t], z = (m.A[2] + (m.B[2] - m.A[2]) * t) - m.h / 2, q = aday(P, z); if (q) L.ad.push(q); } // kesilen eleman: kesit yüzünün ortası
        else for (const P of uyeOrnek(m.A, m.B, 3)) { const q = aday(P, P[2] - m.h / 2, 0.2); if (q) L.ad.push(q); } }
      for (const [t, L] of tur) if (L.ad.length) G.push({ adaylar: L.ad.slice(0, 60), satir: catiUyeYazisi(t, L.m.b, L.m.P ? L.m.b : L.m.h, 'kesit') });
      /* kaplama katmanları: kesit hattı üzerinde çatı yüzeyi boyunca (saçak ve mahyadan uzak) */
      const ust = []; { const f = V.G.foot, s0 = Math.min(...f.map(S)), s1 = Math.max(...f.map(S)); for (let i = 1; i < 24; i++) { const s = s0 + (s1 - s0) * i / 24, p = [K.a[0] + K.u[0] * s, K.a[1] + K.u[1] * s], z = V.G.zAt(p); if (isFinite(z)) ust.push([p, z]); } }
      for (const k of V.kat) { const ad = []; for (const [p, z] of ust) { const q = aday(p, z + k.o + k.t / 2); if (q) ad.push(q); } if (ad.length) G.push({ adaylar: ad, satir: catiKatmanYazisi(k) }); }
      /* yağmur oluğu (kesit hattının oluğu kestiği yer) ve iniş boruları (kesit derinliğinde görünen, duvar boyunca düşey parçası) */
      const dn = catiDn(cati); if (V.olukDN) dn.oluk = V.olukDN; if (V.borDN) dn.boru = V.borDN;
      { const O = V.oluk || [], ad = []; for (let i = 0; i < O.length; i++) { const A = O[i], B = O[(i + 1) % O.length], dA = N(A), dB = N(B); if ((dA < 0) === (dB < 0) || Math.abs(dA - dB) < 1e-9) continue; const t = dA / (dA - dB), P = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t], q = aday(P, V.zSacak - (V.ro || 0.0775) * 0.6); if (q) ad.push(q); } if (ad.length) G.push({ adaylar: ad, satir: olukYazisi(dn.oluk) }); }
      if (V.borular) { const ad = []; for (const b of V.borular) { const Y = b.yol; for (let i = 1; i < Y.length; i++) { const a = Y[i - 1], c = Y[i]; if (Math.hypot(c[0] - a[0], c[1] - a[1]) > 1e-6 || a[2] - c[2] < 0.5) continue; for (const f of [0.3, 0.5, 0.7]) { const q = aday(a, a[2] + (c[2] - a[2]) * f); if (q) ad.push(q); } } } if (ad.length) G.push({ adaylar: ad, satir: inisBorusuYazisi(dn.boru) }); }
    }
    return G.length ? okKoy(G, C.doc.ents.slice(K.i0 || 0), {}, OKC) : 0;
  };

  /* KAT PLANI: yağmur iniş boruları (firma kuralı 14.11.2026: plan ve kesitlerde oklu açıklama; her boruya ya da aynı cephedeki boru grubuna tek ok).
     Plan kesme kotunu geçen düşey boru parçası. gv, W (model → çizim), hKes */
  C.yagmurOkPlan = (gv, W, hKes, ents) => {
    const G = []; for (const cati of (ents || C.doc.ents)) { if (cati.gv || cati.type !== 'cati' || !C.catiOkVerisi) continue; let V; try { V = C.catiOkVerisi(cati); } catch (er) { continue; } if (!V.borular) continue;
      const dn = catiDn(cati); if (V.borDN) dn.boru = V.borDN; const kenar = new Map();
      for (const b of V.borular) { const Y = b.yol; let p = null; for (let i = 1; i < Y.length; i++) { const a = Y[i - 1], c = Y[i]; if (Math.min(a[2], c[2]) <= hKes && Math.max(a[2], c[2]) >= hKes) { const t = Math.abs(c[2] - a[2]) < 1e-9 ? 0 : (hKes - a[2]) / (c[2] - a[2]); p = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]; break; } } if (!p) continue;
        const k = b.kenar == null ? b.no : b.kenar; if (!kenar.has(k)) kenar.set(k, []); const w = W([p[0], p[1]]); kenar.get(k).push([w[0], w[1]]); }
      for (const ad of kenar.values()) G.push({ adaylar: ad, satir: inisBorusuYazisi(dn.boru) }); }
    return G.length ? okKoy(G, C.doc.ents.filter(e => e.gv === gv), { gv }, OKC) : 0;
  };
  /* kesitin oklu açıklamaları: korkuluk, sonra çatı elemanları (kesit.js; disiplin görünümünde açılımdan sonra — gorunumler.js) */
  /* KESİT: kesilen doğramanın lentosu (firma kuralı 14.11.2026: "lentoları da okla, ebatı ile birlikte yaz"); aynı ebattaki lentolara tek ok (tip başına).
     Lento: doğrama boşluğunun üstünde, yükseklik lh (yoksa duvar kalınlığı), en duvar kalınlığı; Çokal planlarında lento yazısı yok — yalnız kesitte */
  C.lentoOkKesit = K => {
    const S = p => (p[0] - K.a[0]) * K.u[0] + (p[1] - K.a[1]) * K.u[1], N = p => (p[0] - K.a[0]) * K.n[0] + (p[1] - K.a[1]) * K.n[1], G = new Map();
    for (const e of C.doc.ents) { if (e.gv || e.type !== 'acik' || e.lento === false || !C.layer(e.layer).on) continue; const h = C.byId(e.host); if (!h || !Array.isArray(h.pts) || h.pts.length < 2) continue;
      const i = Math.max(0, Math.min(h.pts.length - 2, +e.seg || 0)), A = h.pts[i], B = h.pts[i + 1], L = Math.hypot(B[0] - A[0], B[1] - A[1]); if (L < 1e-6) continue;
      const u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], w = +e.w || 1, lb = +e.lb || 0, td = +h.tb || +h.t || 0.2, lh = +e.lh > 0 ? +e.lh : td;
      const P0 = [A[0] + u[0] * (+e.s - w / 2 - lb), A[1] + u[1] * (+e.s - w / 2 - lb)], P1 = [A[0] + u[0] * (+e.s + w / 2 + lb), A[1] + u[1] * (+e.s + w / 2 + lb)], d0 = N(P0), d1 = N(P1);
      let P; if ((d0 < 0) !== (d1 < 0) && Math.abs(d0 - d1) > 1e-9) { const t = d0 / (d0 - d1); P = [P0[0] + (P1[0] - P0[0]) * t, P0[1] + (P1[1] - P0[1]) * t]; } else continue; // yalnız kesilen lento
      const z = (+h.z0 || 0) + (+e.par || 0) + (+e.hh || +e.h || 2) + lh / 2, s = S(P); if (!K.inU([s, z])) continue; const w2 = K.W([s, z]), k = Math.round(td * 100) + 'x' + Math.round(lh * 100);
      if (!G.has(k)) G.set(k, { adaylar: [], satir: lentoYazisi(td, lh) }); G.get(k).adaylar.push([w2[0], w2[1]]); }
    return G.size ? okKoy([...G.values()], C.doc.ents.slice(K.i0 || 0), {}) : 0;
  };
  C.kesitOklari = K => { let n = 0; for (const [f, ad] of [[C.korkulukOkKesit, 'korkuluk oku'], [C.lentoOkKesit, 'lento oku'], [C.catiOkKesit, 'çatı oku']]) if (f) try { n += f(K) || 0; } catch (er) { console.error(ad, er); } return n; };
  /* AKS: modelde aks yoksa kolon merkezlerinden (yoksa betonarme perde eksenlerinden) türetilir; MIMARIPAFTA her çalıştığında yeniler (oto: 'MIMARIPAFTA') */
  C.mimariAksHazirla = ents => {
    C.doc.ents = C.doc.ents.filter(e => !(e.type === 'aks' && e.oto === 'MIMARIPAFTA'));
    if (!C.aksAll || !C.T.aks) return null; const var_ = C.aksAll(); if (var_.length) return var_[0];
    const kol = [], per = [];
    for (const e of ents) { if (e.type === 'kolon' && e.p) kol.push([+e.p[0], +e.p[1]]); else if (e.type === 'perde' && Array.isArray(e.pts) && e.pts.length === 2 && !/tugla|gazbeton|briket/i.test(e.malz || '')) per.push({ a: e.pts[0], b: e.pts[1] }); }
    const r = aksTuret({ kolonlar: kol, perdeler: per }); if (r.xs.length < 1 || r.ys.length < 1) return null;
    const A = AK(); C.ensureLayer('AKS', 1, 'CENTER', 13);
    const e = C.add(C.newEnt('aks', { o: [r.xs[0], r.ys[0]], xs: r.xs.map(v => +(v - r.xs[0]).toFixed(4)), ys: r.ys.map(v => +(v - r.ys[0]).toFixed(4)), rot: 0, bp: A.balonR, thp: A.yaziMm, extp: 22, dims: false, both: true, xl: 'num', yTers: true, layer: 'AKS', oto: 'MIMARIPAFTA' }));
    if (C.aksSync) C.aksSync(e); return e;
  };

  /* PLAN ÖLÇÜLERİ (Çokal İdari düzeni) ve aks balonları. gv: plan görünümü, W: model → çizim, bb: yapının dış yüz kutusu (model), hKes: kesit kotu */
  C.mimariPlanOlcu = (gv, W, bb, hKes, ents) => {
    const k = C.annoH(1), Y = OY(), A = AK(), g = C.doc.ents.filter(e => e.gv === gv), aks = g.filter(e => e.type === 'aks' && !e.sec);
    g.forEach(e => { delete e._c; });
    const ext = C.extents(g.filter(e => e.type !== 'aks' && e.type !== 'baslik')); if (!ext) return 0;
    const w0 = W([bb[0], bb[1]]), w1 = W([bb[2], bb[3]]), dx = w0[0] - bb[0], dy = w0[1] - bb[1];
    /* dış duvardaki doğrama boşlukları (kenara 0,8 m'den yakın, kenara paralel duvar) */
    const bos = { ALT: [], UST: [], SOL: [], SAG: [] };
    for (const d of dogramalar(ents)) { if (!kesenDuvar(d, hKes) || hKes < d.z0 - 0.01 || hKes > d.z0 + d.h + 0.01) continue; const yat = Math.abs(d.u[0]) > 0.9, s = yat ? d.c[0] : d.c[1], iv = [s - d.w / 2, s + d.w / 2];
      if (yat) { if (Math.abs(d.c[1] - bb[1]) < 0.8) bos.ALT.push(iv); else if (Math.abs(d.c[1] - bb[3]) < 0.8) bos.UST.push(iv); }
      else if (Math.abs(d.u[1]) > 0.9) { if (Math.abs(d.c[0] - bb[0]) < 0.8) bos.SOL.push(iv); else if (Math.abs(d.c[0] - bb[2]) < 0.8) bos.SAG.push(iv); } }
    const xs = [], ys = []; for (const e of aks) for (const l of C.aksLines(e)) { if (Math.abs(l.d[0]) < 1e-6) xs.push(l.p[0] - dx); else if (Math.abs(l.d[1]) < 1e-6) ys.push(l.p[1] - dy); }
    const S = planOlcuSiralari({ bb, xs, ys, bosluk: bos, ilk: 0, sira: siraMm(Y), balon: A.balonOte }); // sıra aralığı modelde 0,25 m → kâğıtta 250 / ölçek mm
    /* ilk sıra çizimin (tretuvar ve doğrama etiketleri dahil) en dış çizgisinden ilkSira mm dışarıda */
    const taban = { ALT: ext[1] - Y.ilkSira * k, UST: ext[3] + Y.ilkSira * k, SOL: ext[0] - Y.ilkSira * k, SAG: ext[2] + Y.ilkSira * k }, sg = { ALT: -1, UST: 1, SOL: -1, SAG: 1 };
    C.ensureLayer('PLAN_OLCU', 3, 'CONTINUOUS', 18); let n = 0;
    for (const s of S.siralar) { const yat = s.kenar === 'ALT' || s.kenar === 'UST', pos = taban[s.kenar] + sg[s.kenar] * s.mm * k;
      for (let i = 1; i < s.noktalar.length; i++) { const p0 = s.noktalar[i - 1], p1 = s.noktalar[i];
        const a = yat ? [p0 + dx, s.kenar === 'ALT' ? w0[1] : w1[1], 0] : [s.kenar === 'SOL' ? w0[0] : w1[0], p0 + dy, 0], b = yat ? [p1 + dx, a[1], 0] : [a[0], p1 + dy, 0], p = yat ? [a[0], pos, 0] : [pos, a[1], 0];
        C.add(C.newEnt('dim', { gv, k: yat ? 'h' : 'v', a, b, p, layer: 'PLAN_OLCU' })); n++; } }
    /* aks balonları en dış sıranın balonOte mm dışında (balon merkezi) */
    for (const e of aks) { if (Math.abs(Math.sin((e.rot || 0) * Math.PI / 180)) > 1e-6) continue;
      const ax0 = e.o[0] + e.xs[0], ax1 = e.o[0] + e.xs[e.xs.length - 1], ay0 = e.o[1] + e.ys[0], ay1 = e.o[1] + e.ys[e.ys.length - 1];
      const ist = [ay0 - (taban.ALT - S.balonMm.ALT * k), (taban.UST + S.balonMm.UST * k) - ay1, ax0 - (taban.SOL - S.balonMm.SOL * k), (taban.SAG + S.balonMm.SAG * k) - ax1].map(v => v / k - A.balonR);
      Object.assign(e, { dims: false, bp: A.balonR, thp: A.yaziMm, extp: +Math.max(...ist).toFixed(2), extK: { ALT: +ist[0].toFixed(2), UST: +ist[1].toFixed(2), SOL: +ist[2].toFixed(2), SAG: +ist[3].toFixed(2) }, both: true }); delete e._c; }
    return n;
  };

  /* KESİT YERLERİ modelden: mahaller (kat kotlarında düşey elemanlarla çevrili bölgeler), doğramalar, kolonlar, kirişler.
     Döner: { hatlar (kesitYerleri), mahaller } */
  C.mimariKesitYerleri = (ents, bb, katZ) => {
    const V = ents.filter(e => /^(perde|kolon|wall|duvar)$/.test(e.type)), B3 = new Map(V.map(e => [e, bbox3(e)])), odalar = [], DG = dogramalar(ents);
    for (const z of (katZ && katZ.length ? katZ : [0])) { const zc = z + 1.0, eng = [], ustteki = new Set();
      for (const e of V) { const b = B3.get(e); if (!b || b[2] > zc || b[5] < zc) continue; ustteki.add(e.id); let t; try { t = C.entTris(e); } catch (er) { continue; } const P = t.pos; for (let i = 0; i < P.length; i += 9) eng.push([[P[i], P[i + 1]], [P[i + 3], P[i + 4]], [P[i + 6], P[i + 7]]]); }
      /* kapı / pencere boşlukları kapalı sayılır: kapıyla birbirine açılan odalar (Konya: kumanda odası – montaj holü) ayrı mahaldir */
      eng.push(...acikIzleri(DG.filter(d => ustteki.has(d.host.id)).map(d => ({ c: d.c, u: d.u, w: d.w, t: d.duvar }))));
      for (const m of mahalBul(eng, bb, { h: 0.1 })) { if (odalar.some(o => ['0', '1', '2', '3'].every(i => Math.abs(o.bb[i] - m.bb[i]) < 0.3))) continue; m.z = z; odalar.push(m); } }
    /* üst kattaki odaları kapsayan alt kat hacmi (ör. pompa haznesi) ayrı mahal sayılmaz: kesitler üst kattaki odalara göre seçilir */
    const kes = (p, o) => Math.max(0, Math.min(p.bb[2], o.bb[2]) - Math.max(p.bb[0], o.bb[0])) * Math.max(0, Math.min(p.bb[3], o.bb[3]) - Math.max(p.bb[1], o.bb[1]));
    const M2 = odalar.filter(o => !odalar.some(p => p !== o && p.z > o.z && kes(p, o) >= 0.8 * (p.bb[2] - p.bb[0]) * (p.bb[3] - p.bb[1])));
    let adlar = []; try { adlar = C.mahalVerisi ? C.mahalVerisi().rooms : []; } catch (er) { adlar = []; }
    const merkez = q => { let sx = 0, sy = 0; for (const p of q.e.pts) { sx += p[0]; sy += p[1]; } return [sx / q.e.pts.length, sy / q.e.pts.length]; };
    M2.forEach((m, i) => { const r = adlar.find(q => q.e && Array.isArray(q.e.pts) && q.e.pts.length && (c => c[0] > m.bb[0] && c[0] < m.bb[2] && c[1] > m.bb[1] && c[1] < m.bb[3])(merkez(q))); m.ad = r ? r.ad : `MAHAL ${i + 1}`; });
    const aciklar = dogramalar(ents).map(d => ({ c: d.c, w: d.w, d: Math.abs(d.u[0]) >= Math.abs(d.u[1]) ? 'x' : 'y' }));
    const kolonlar = ents.filter(e => e.type === 'kolon').map(e => { const b = B3.get(e) || bbox3(e); return b ? [b[0], b[1], b[3], b[4]] : null; }).filter(Boolean);
    const kirisler = ents.filter(e => e.type === 'kiris' && e.a && e.b).map(e => { const b = bbox3(e); return b ? { bb: [b[0], b[1], b[3], b[4]], d: Math.abs(e.b[0] - e.a[0]) >= Math.abs(e.b[1] - e.a[1]) ? 'x' : 'y' } : null; }).filter(Boolean);
    return { hatlar: kesitYerleri({ bb, mahaller: M2, aciklar, kolonlar, kirisler }), mahaller: M2 };
  };

  /* GÖRÜNÜŞTE ÇİZİLMEYECEK iç elemanlar (Set id) */
  C.gorunusIcElemanlar = ents => { const S = icElemanlar(ents.map(e => ({ id: e.id, type: e.type, bb: bbox3(e) })).filter(g => g.bb));
    for (const e of ents) if (e.type === 'acik' && S.has(e.id) && !S.has(e.host)) S.delete(e.id); // doğrama duvarıyla birlikte: dış duvardaki kapı (seksiyonel kapının tavan rayı içeri uzansa da) görünüşte kalır
    return S; };
})(typeof window !== 'undefined' ? window.C : null);

/* ArıtmaCAD — ÇELİK YERLEŞİM HESAPLARI (saf fonksiyonlar; arayüzden bağımsız, Node'da da yüklenir)
   Çatı kirişi (makas / eğimli kiriş) uç kotları, kolonlardan çerçeve bulma, aşık aralıkları ve yerleşimi,
   çelik kolona vinç gusesi (konsol ya da kademeli kolon) parçaları, vinç yolu kotları ve hatları.
   Birimler: koordinat ve kot m, profil ölçüleri mm. Noktalar [x, y] ya da [x, y, z].
   C.celikYer = { catiKirisi, cerceveleriBul, cerceveTekrar, asikKonumlari, asikYerlesim, guseParcalari, iceYon, vincYoluKot, vincYoluHatlari }
   Arayüz (komutlar, 3B, metraj): app/celik.js. Deneme: node test/celik-yerlesim.test.js */
(function (C) {
  'use strict';
  const RAD = Math.PI / 180;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], (a[2] || 0) - (b[2] || 0)];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], (a[2] || 0) + (b[2] || 0)];
  const mul = (a, k) => [a[0] * k, a[1] * k, (a[2] || 0) * k];
  const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
  const len3 = a => Math.hypot(a[0], a[1], a[2] || 0);
  const r6 = v => Math.round(v * 1e6) / 1e6;
  const yuvar = p => p.map(r6);

  /* ---------------- ÇATI KİRİŞİ ----------------
     A, B: iki saçak aksı (kolon ekseni) plan noktaları. zs: A aksında çatı kirişi üst yüz kotu.
     o = { tip: 'besik' | 'tek', egim (%), mahya (m; > 0 verilirse eğim yerine kullanılır: beşikte mahya kotu, tek eğimde B aksı kotu), tasma (m; saçak taşması, yatay) }
     → { parcalar: [{ a, b }] (kiriş üst yüz ekseni, uçlar), egim (%), aci (°), mahya (m), acikl (m), saçak uç kotu zu } */
  const catiKirisi = (A, B, zs, o) => {
    o = o || {}; const d = sub(B, A); d[2] = 0; const L = Math.hypot(d[0], d[1]); if (L < 1e-6) return null;
    const u = [d[0] / L, d[1] / L, 0], tas = Math.max(0, +o.tasma || 0), tek = o.tip === 'tek', z0 = +zs || 0;
    const run = tek ? L : L / 2; let s = (+o.egim || 0) / 100;
    if (+o.mahya > 0) s = (+o.mahya - z0) / run;
    const P = (t, z) => yuvar([A[0] + u[0] * t, A[1] + u[1] * t, z]);
    const zm = z0 + s * run, parcalar = tek
      ? [{ a: P(-tas, z0 - s * tas), b: P(L + tas, zm + s * tas) }]
      : [{ a: P(-tas, z0 - s * tas), b: P(L / 2, zm) }, { a: P(L / 2, zm), b: P(L + tas, z0 - s * tas) }];
    return { parcalar, egim: r6(s * 100), aci: r6(Math.atan(s) / RAD), mahya: r6(zm), acikl: r6(L), zu: r6(z0 - s * tas) };
  };

  /* ---------------- KOLONLARDAN ÇERÇEVE ----------------
     kolonlar: [{ p: [x, y], z: üst kot }]. yon: 'X' (çatı kirişleri X yönünde) | 'Y' | 'oto' (binanın kısa kenarı yönünde).
     Aynı çerçeve çizgisindeki (kiriş yönüne dik koordinatı tol içinde aynı) kolonlardan en uçtaki iki kolon saçak aksıdır.
     → [{ A, B, zA, zB }] (A kotu düşük olan uç; eşitse küçük koordinatlı), çerçeve sırasıyla */
  const cerceveleriBul = (kolonlar, yon, tol) => {
    const k = (kolonlar || []).filter(c => c && c.p); if (k.length < 2) return [];
    tol = tol || 0.3;
    if (yon !== 'X' && yon !== 'Y') { // otomatik: daha çok çerçeve veren yön (portal çerçeveler binanın boyu boyunca dizilir); eşitse kısa kenar
      const fx = cerceveleriBul(k, 'X', tol), fy = cerceveleriBul(k, 'Y', tol); if (fx.length !== fy.length) return fx.length > fy.length ? fx : fy;
      const xs = k.map(c => c.p[0]), ys = k.map(c => c.p[1]); return Math.max(...xs) - Math.min(...xs) <= Math.max(...ys) - Math.min(...ys) ? fx : fy; }
    const ai = yon === 'X' ? 0 : 1, bi = 1 - ai; // ai: kiriş yönü, bi: çerçeve sırası yönü
    const sira = k.slice().sort((a, b) => a.p[bi] - b.p[bi]), gr = [];
    for (const c of sira) { const g = gr[gr.length - 1]; if (g && Math.abs(c.p[bi] - g.ort) <= tol) { g.l.push(c); g.ort = g.l.reduce((s, q) => s + q.p[bi], 0) / g.l.length; } else gr.push({ l: [c], ort: c.p[bi] }); }
    const out = [];
    for (const g of gr) { if (g.l.length < 2) continue; const s = g.l.slice().sort((a, b) => a.p[ai] - b.p[ai]); let a = s[0], b = s[s.length - 1]; if (b.p[ai] - a.p[ai] < 0.5) continue;
      if ((+b.z || 0) < (+a.z || 0) - 1e-6) { const t = a; a = b; b = t; }
      out.push({ A: [a.p[0], a.p[1]], B: [b.p[0], b.p[1]], zA: +a.z || 0, zB: +b.z || 0 }); }
    return out;
  };

  /* ---------------- İKİ AKSTAN ÇERÇEVE TEKRARI ----------------
     İlk çerçeve A–B; C noktası son çerçevenin hizası (A–B'ye dik uzaklık). Aralık en çok "aralik" olacak şekilde eşit bölünür.
     → { cerceveler: [{ A, B }], n (açıklık sayısı), adim (m) } */
  const cerceveTekrar = (A, B, C3, aralik) => {
    const d = sub(B, A), L = Math.hypot(d[0], d[1]); if (L < 1e-6) return { cerceveler: [], n: 0, adim: 0 };
    const nrm = [-d[1] / L, d[0] / L], m = dot2(sub(C3, A), nrm), ar = Math.max(0.5, +aralik || 6);
    const n = Math.abs(m) < 1e-6 ? 0 : Math.max(1, Math.ceil(Math.abs(m) / ar - 1e-9)), adim = n ? m / n : 0, cerceveler = [];
    for (let i = 0; i <= n; i++) { const o = [nrm[0] * adim * i, nrm[1] * adim * i]; cerceveler.push({ A: yuvar([A[0] + o[0], A[1] + o[1]]), B: yuvar([B[0] + o[0], B[1] + o[1]]) }); }
    return { cerceveler, n, adim: r6(Math.abs(adim)) };
  };

  /* ---------------- AŞIK ARALIKLARI ----------------
     Ls: kiriş boyu (eğim boyunca, m); ilk aşık alt uçtan "bas", son aşık üst uçtan "son" içeride; arası en çok "aralik" ile eşit.
     → eğim boyunca uzaklıklar (m) */
  const asikKonumlari = (Ls, aralik, bas, son) => {
    const a = Math.max(0, bas == null ? 0.15 : +bas), b = Math.max(0, son == null ? 0.15 : +son), ar = Math.max(0.2, +aralik || 1.5), s0 = a, s1 = Ls - b;
    if (s1 < s0 - 1e-9) return Ls > 0 ? [r6(Ls / 2)] : [];
    const n = Math.max(1, Math.ceil((s1 - s0) / ar - 1e-9)); if (s1 - s0 < 1e-9) return [r6(s0)];
    const o = []; for (let i = 0; i <= n; i++) o.push(r6(s0 + (s1 - s0) * i / n)); return o;
  };

  /* ---------------- AŞIK YERLEŞİMİ ----------------
     kirisler: [{ a, b }] çatı kirişlerinin üst yüz eksen uçları (3B). Aynı çatı yüzündeki (plan yönü, eğim ve saçak hizası aynı) kirişler
     yan yana dizilir; her aşık konumu komşu kirişler arasında bir parça (sürekli seçilirse baştan sona tek parça) olur.
     o = { aralik, bas, son, tasma (uçlarda taşma, m), h (aşık yüksekliği, mm), surekli }
     → [{ a, b, rot (°), egim (%), yuz }] aşık eksen uçları (kesit ortası) ve eğime dik dönme */
  const asikYerlesim = (kirisler, o) => {
    o = o || {}; const hp = (+o.h || 0) / 1000, tas = Math.max(0, +o.tasma || 0), yuzler = {};
    for (const k of kirisler || []) {
      let lo = k.a.slice(), hi = k.b.slice(); if ((hi[2] || 0) < (lo[2] || 0)) { const t = lo; lo = hi; hi = t; }
      const dp = [hi[0] - lo[0], hi[1] - lo[1]], Lp = Math.hypot(dp[0], dp[1]); if (Lp < 1e-6) continue; // düşey eleman değil
      const dz = (hi[2] || 0) - (lo[2] || 0), d = [dp[0] / Lp, dp[1] / Lp], s = dz / Lp, Ls = Math.hypot(Lp, dz);
      const key = [d[0].toFixed(2), d[1].toFixed(2), s.toFixed(3), (dot2(lo, d)).toFixed(1), Lp.toFixed(1), (lo[2] || 0).toFixed(2)].join('|');
      (yuzler[key] = yuzler[key] || { d, s, Ls, l: [] }).l.push({ lo, hi });
    }
    const out = []; let yi = 0;
    for (const Y of Object.values(yuzler)) {
      yi++; if (Y.l.length < 2) continue;
      const per = [-Y.d[1], Y.d[0]]; Y.l.sort((p, q) => dot2(p.lo, per) - dot2(q.lo, per));
      const al = Math.atan(Y.s), n = [-Math.sin(al) * Y.d[0], -Math.sin(al) * Y.d[1], Math.cos(al)], kon = asikKonumlari(Y.Ls, o.aralik, o.bas, o.son);
      const nok = (k, sv) => { const u = mul(sub(k.hi, k.lo), 1 / len3(sub(k.hi, k.lo))); return add(add(k.lo, mul(u, sv)), mul(n, hp / 2)); };
      for (const sv of kon) {
        const P = Y.l.map(k => nok(k, sv)), parca = o.surekli ? [[0, P.length - 1]] : P.slice(1).map((_, i) => [i, i + 1]);
        for (const [i, j] of parca) { let a = P[i], b = P[j]; const u = sub(b, a), Lu = len3(u); if (Lu < 1e-6) continue; const e = mul(u, 1 / Lu);
          if (i === 0 && tas) a = add(a, mul(e, -tas)); if (j === P.length - 1 && tas) b = add(b, mul(e, tas));
          const vx0 = [-e[1], e[0]], sg = dot2(vx0, Y.d) >= 0 ? 1 : -1; // frame(): rot = eğim açısı × (vx0 · eğim yönü) → gövde çatıya dik
          out.push({ a: yuvar(a), b: yuvar(b), rot: r6(sg * al / RAD), egim: r6(Y.s * 100), yuz: yi }); }
      }
    }
    return out;
  };

  /* ---------------- VİNÇ GUSESİ (çelik kolon) ----------------
     kolon: { a, b (eksen uçları; a alt), rot (°), hc, bc (kesit yüksekliği h ve başlık genişliği b, mm) }
     g: { yon: F|A|R|L|FA|RL (F/A: profil derinliği yönü, başlık yüzüne; R/L: başlık yönü, gövde yanına), zt (guse üst kotu, m),
          e (ray ekseni – kolon ekseni uzaklığı, m), tip: 'K' konsol (kısa kiriş parçası) | 'D' kademeli kolon (vinç ayağı), hk (konsol / ayak profil yüksekliği, mm), uc (konsol ucunun ray ekseninden ötesi, m) }
     → { parcalar: [{ kind, a, b, ref, rol }], yuk: [{ p: [x, y, zt], n: [nx, ny] }] (vinç kirişinin oturduğu noktalar) */
  const GYON = { F: ['F'], A: ['A'], R: ['R'], L: ['L'], FA: ['F', 'A'], RL: ['R', 'L'] };
  const guseParcalari = (kolon, g) => {
    const a = kolon.a, r = (+kolon.rot || 0) * RAD, vx = [Math.cos(r), Math.sin(r)], vy = [-Math.sin(r), Math.cos(r)], hc = (+kolon.hc || 200) / 1000, bc = (+kolon.bc || 200) / 1000;
    const zt = +g.zt, e = Math.max(0, +g.e || 0), uc = g.uc == null ? 0.15 : +g.uc, parcalar = [], yuk = [];
    for (const sd of GYON[g.yon] || GYON.F) {
      const n = sd === 'F' ? vy : sd === 'A' ? [-vy[0], -vy[1]] : sd === 'R' ? vx : [-vx[0], -vx[1]], f = sd === 'F' || sd === 'A' ? hc / 2 : bc / 2;
      const Q = (t, z) => yuvar([a[0] + n[0] * t, a[1] + n[1] * t, z]), ee = Math.max(e, f + 0.05);
      if (g.tip === 'D') { // kademeli kolon: ray ekseni altında ayrı vinç ayağı + üstte bağ parçası
        parcalar.push({ kind: 'kolon', a: Q(ee, a[2] || 0), b: Q(ee, zt), ref: 'M', rol: 'vincayak' });
        parcalar.push({ kind: 'kiris', a: Q(f, zt), b: Q(ee, zt), ref: 'U', rol: 'guse' });
      } else parcalar.push({ kind: 'kiris', a: Q(f, zt), b: Q(Math.max(ee + uc, f + 0.1), zt), ref: 'U', rol: 'guse' });
      yuk.push({ p: Q(ee, zt), n: yuvar(n) });
    }
    return { parcalar, yuk };
  };

  /* ---------------- VİNÇ YOLU ----------------
     Vinç kirişi guse üstüne oturur: alt yüz = guse üst kotu. hb: kiriş yüksekliği, hr: ray yüksekliği (mm). */
  const vincYoluKot = (zt, hb, hr) => { const z = +zt || 0, kU = z + (+hb || 0) / 1000; return { kirisAlt: r6(z), kirisUst: r6(kU), rayUst: r6(kU + (+hr || 0) / 1000), rayOrta: r6(kU + (+hr || 0) / 2000) }; };
  /* yük noktalarını hatlara ayırır: aynı guse yönü (n) ve aynı ray ekseni hizası (tol içinde) → bir hat; hat boyunca sıralı
     → [{ t (hat yönü), n, noktalar: [[x, y, z]] }] (en az iki nokta) */
  const vincYoluHatlari = (yuk, tol) => {
    tol = tol || 0.1; const gr = [];
    for (const y of yuk || []) { const n = y.n, c = dot2(y.p, n);
      let g = gr.find(q => dot2(q.n, n) > 0.999 && Math.abs(q.c - c) <= tol); if (!g) gr.push(g = { n, c, l: [] }); g.l.push(y.p); }
    return gr.filter(g => g.l.length >= 2).map(g => { const t = [-g.n[1], g.n[0]]; g.l.sort((p, q) => dot2(p, t) - dot2(q, t)); return { t: yuvar(t), n: g.n, noktalar: g.l }; });
  };

  /* "içe doğru" guse yönü: kolonun derinlik (F/A) ya da başlık (R/L) yüzlerinden seçilen kolonların ortasına bakanı.
     kolon: { a, rot }, orta: [x, y], eksen: 'FA' | 'RL' → 'F' | 'A' | 'R' | 'L' */
  const iceYon = (kolon, orta, eksen) => { const r = (+kolon.rot || 0) * RAD, v = eksen === 'RL' ? [Math.cos(r), Math.sin(r)] : [-Math.sin(r), Math.cos(r)], d = [orta[0] - kolon.a[0], orta[1] - kolon.a[1]];
    const art = dot2(v, d) >= 0; return eksen === 'RL' ? (art ? 'R' : 'L') : (art ? 'F' : 'A'); };

  C.celikYer = { catiKirisi, cerceveleriBul, cerceveTekrar, asikKonumlari, asikYerlesim, guseParcalari, iceYon, vincYoluKot, vincYoluHatlari };
})(typeof window !== 'undefined' ? window.C : (globalThis.C = globalThis.C || {}));

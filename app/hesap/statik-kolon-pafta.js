/* ArıtmaCAD Statik — KOLON APLİKASYON ve DÜŞEY DONATI DETAYLARI paftası (DSİ / ProBina düzeni)
   • Kolon aplikasyon planı (Ö:1/50): akslar, kolon kesitleri, boyuna donatı ve etriye, "S1 (40/60) 14Ø16" etiketleri.
   • Kolon tiplerine göre düşey donatı detayı (Ö:1/20): temel (radye) ve grobeton, temelden filiz (alt kanca), bindirme (filiz boyu),
     üst uçta kanca, etriye bölgeleri (sarılma / orta / kiriş düğümü) "17Ø10/9" yazıları ve ölçüleri, kotlar, poz balonları.
   • Kolon kesitleri (Ö:1/20): boyuna çubuklar, etriye ve çirozlar, poz numaraları.
   • Etriye ve çiroz açılımları, KOLON DONATI METRAJI tablosu (poz, çap, adet, açılım, boy, toplam boy / çap, birim ağırlık, ağırlık).
   P.kolonPafta(RC, olcek) → [{ ad, spec, pw, ph, olcek, serbest }] (statik-pafta-dsi.js çizime aktarırken ekler). */
(function () {
  'use strict';
  const P = window.STATIK; if (!P) return;
  const cm = v => Math.round(v * 100), r2 = v => Math.round(v * 100) / 100, r5 = v => Math.ceil(v * 20 - 1e-6) / 20; // 5 cm'ye yukarı
  const harf = i => String.fromCharCode(65 + i);

  /* bloklar → paftalar: satır satır dizer; satır kağıt yüksekliğini aşınca yeni pafta (A0 yatay çizim alanı varsayılan 1120 × 715 mm) */
  P.blokSayfala = (bloklar, K, ad, olcek, sonNot, op) => {
    op = op || {}; const mm = v => v * K, Wmax = mm(op.W || 1120), Hmax = mm(op.H || 715), ara = mm(op.ara || 15), sayfa = [];
    const kt = bloklar.map(b => ({ b, k: P.specKutu(b) })).filter(q => q.k);
    let cur = null; const yeni = () => { cur = { spec: [], x: 0, y: 0, sh: 0 }; sayfa.push(cur); };
    yeni();
    for (const q of kt) {
      const w = q.k[2] - q.k[0], h = q.k[3] - q.k[1];
      if (cur.x > 0 && cur.x + w > Wmax) { cur.x = 0; cur.y -= cur.sh + ara; cur.sh = 0; }
      if (cur.spec.length && -cur.y + h > Hmax) yeni();
      cur.spec.push(...P.specKaydir(q.b, cur.x - q.k[0], cur.y - q.k[3])); cur.x += w + ara; cur.sh = Math.max(cur.sh, h);
    }
    if (sonNot && sonNot.length) { const c = sayfa[sayfa.length - 1], y = c.y - c.sh - mm(8); if (-y > Hmax && c.spec.length) { yeni(); cur.spec.push(...P.specKaydir(sonNot, 0, -mm(4))); } else c.spec.push(...P.specKaydir(sonNot, 0, y)); }
    const dolu = sayfa.filter(c => c.spec.length), n = dolu.length;
    return dolu.map((c, i) => ({ ad: n > 1 ? `${ad} (${i + 1}/${n})` : ad, spec: c.spec, pw: 0, ph: 0, olcek, serbest: true }));
  };
  P.kolonPafta = (RC, olcek) => {
    const D0 = P._dsi; if (!D0 || !RC || !RC.kolonlar || !RC.kolonlar.length) return [];
    const o = olcek || 50, K = o / 1000, dv = RC.ayar || {}, cC = +dv.cC || 0.03, cR = 0.05, hT = +dv.temelH || 0.5, f20 = o / 20; // 1/20 detay büyütmesi
    const kol = RC.kolonlar.filter(c => c.don && c.etr).slice().sort((a, b) => String(a.no).localeCompare(String(b.no), 'tr', { numeric: true }));
    if (!kol.length) return [];
    const D = D0.yeniCizim(K), { mm, L, PL, TX, REC, CI, POZ, BALON, BASLIK, KOT } = D, bloklar = [];
    const blok = fn => { const n0 = D.out.length; fn(); const sp = D.out.splice(n0); if (sp.length) bloklar.push(sp); };
    /* ---- poz listesi (metraj) ---- */
    const pozlar = [], poz = (F, adet, segs, tanim, grup) => { const boy = segs.reduce((t, s) => t + s.L, 0), key = `${F}|${segs.map(s => cm(s.L) + '@' + Math.round(s.a)).join(',')}`; let p = pozlar.find(q => q.key === key); if (!p) { p = { key, no: 0, F, adet: 0, boy: r2(boy), segs, tanim, top: 0, grup: [] }; pozlar.push(p); } p.adet += adet; p.top = r2(p.adet * p.boy); if (grup && !p.grup.includes(grup)) p.grup.push(grup); return p; };
    /* ---- düğüm kotları: kirişin bağlandığı kotlar ve kiriş yükseklikleri ---- */
    const dugumler = c => RC.zincirler.filter(ch => ch.supN && ch.supN.some(q => q.tip === 'kolon' && q.c === c)).map(ch => ({ z: Math.min(ch.z, c.zt), hb: Math.max(...ch.segs.map(q => q.hb)) })).reduce((a, d) => { const e = a.find(x => Math.abs(x.z - d.z) < 0.05); if (e) e.hb = Math.max(e.hb, d.hb); else a.push(d); return a; }, []).sort((a, b) => a.z - b.z);
    /* ---- kolon tipleri (aynı kesit, kot, donatı, etriye, düğüm) ---- */
    const tipler = [];
    for (const c of kol) {
      // tipleştirme (ProBina / DSİ uygulaması): aynı kesit, kot ve kiriş düğümleri → tek tip; tipin donatısı en elverişsiz kolondan
      const dg = dugumler(c), k = [cm(c.bx), cm(c.by), r2(c.z0), r2(c.zt), dg.map(d => r2(d.z) + '/' + cm(d.hb)).join(','), (c.guse || []).map(g => r2(g.zt) + '/' + cm(g.gL) + '/' + cm(g.hf)).join(',')].join('|');
      let t = tipler.find(q => q.k === k); if (!t) { t = { k, c, dg, ad: [], uyeler: [] }; tipler.push(t); } t.ad.push(c.no || '?'); t.uyeler.push(c);
      for (const g of (c.guseD || [])) if (g.ana && (!t.g || g.ana.As > t.g.ana.As || (g.yat && t.g.yat && g.yat.Ah > t.g.yat.Ah && g.ana.As >= t.g.ana.As))) t.g = g;
      const As = q => q.don.n * Math.PI * q.don.F ** 2 / 4, ag = (a, b) => (As(b) > As(a) + 1e-9 || (Math.abs(As(b) - As(a)) < 1e-9 && b.etr.sS < a.etr.sS) ? b : a);
      if (ag(t.c, c) === c) { t.c = Object.assign({}, t.c, { don: c.don, etr: c.etr }); }
      if (c.etr.sS < t.c.etr.sS || c.etr.nx > t.c.etr.nx || c.etr.ny > t.c.etr.ny) t.c = Object.assign({}, t.c, { etr: Object.assign({}, t.c.etr, { sS: Math.min(c.etr.sS, t.c.etr.sS), sO: Math.min(c.etr.sO, t.c.etr.sO), nx: Math.max(c.etr.nx, t.c.etr.nx), ny: Math.max(c.etr.ny, t.c.etr.ny), F: Math.max(c.etr.F, t.c.etr.F) }) });
    }
    /* ---- çubuk hesapları (her tip) ---- */
    for (const t of tipler) {
      const c = t.c, F = c.don.F / 1000, lb = P.bindirme(c.don.F), hk = Math.max(0.30, r5(12 * F)), zTb = c.z0 - hT + cR, zTop = c.zt - cC - 0.01;
      const H = c.zt - c.z0, lsar = Math.max(c.etr.lsar || 0, Math.max(c.bx, c.by), 0.5);
      // bindirme bölgesi: alt sarılma bölgesinin üstünde, orta bölgede (TBDY 7.3.2.3)
      const zL = c.z0 + Math.max(lsar + 0.05, Math.min(H / 3, 1.5));
      const tek = zTop - zTb + 2 * hk <= 12 && dv.kolonBindirme === false;
      t.cub = tek ? [{ za: zTb, zb: zTop, kA: hk, kB: hk }] : [{ za: zTb, zb: r2(zL + lb), kA: hk, kB: 0 }, { za: zL, zb: zTop, kA: 0, kB: hk }];
      t.lb = lb; t.zL = zL; t.zTb = zTb; t.hk = hk; t.lsar = lsar;
      t.pB = t.cub.map((b, i) => poz(c.don.F, c.don.n * t.ad.length, [...(b.kA ? [{ L: b.kA, a: 90 }] : []), { L: r2(b.zb - b.za), a: 0 }, ...(b.kB ? [{ L: b.kB, a: 90 }] : [])], i ? 'boyuna (üst)' : 'boyuna (filiz)', t.ad.join('-')));
      // etriye bölgeleri: taban sarılma, orta, düğüm altı sarılma, düğüm (kiriş yüksekliği) — her düğüm için
      const zon = []; let z = c.z0 + 0.05; const dg = t.dg.length ? t.dg : [{ z: c.zt, hb: 0.5 }];
      dg.forEach((d, i) => { const zb0 = i ? dg[i - 1].z : c.z0, zDug = d.z - d.hb, alt = i === 0 ? lsar : Math.max(lsar, 0.5); const s1 = Math.min(zb0 + alt, zDug), s2 = Math.max(s1, zDug - lsar);
        zon.push({ a: z, b: s1, s: c.etr.sS, tip: 'sarılma' }); if (s2 > s1 + 0.05) zon.push({ a: s1, b: s2, s: c.etr.sO, tip: 'orta' }); zon.push({ a: Math.max(s1, s2), b: zDug, s: c.etr.sS, tip: 'sarılma' }); zon.push({ a: zDug, b: d.z - cC, s: c.etr.sS, tip: 'düğüm' }); z = d.z + 0.05; });
      t.zon = zon.filter(q => q.b - q.a > 0.02).map(q => Object.assign(q, { n: Math.floor((q.b - q.a) / q.s + 1e-6) + 1 }));
      // temel içinde 3 adet etriye (sabitleme)
      t.zon.unshift({ a: zTb + 0.1, b: c.z0 - 0.05, s: Math.max(0.1, (c.z0 - 0.05 - zTb - 0.1) / 2), tip: 'temel', n: 3 });
      const nEtr = t.zon.reduce((s, q) => s + q.n, 0), Fe = c.etr.F, fe = Fe / 1000, ek = Math.max(0.10, r5(10 * fe)), bx = c.bx - 2 * cC, by = c.by - 2 * cC;
      t.nEtr = nEtr; t.ek = ek;
      t.pE = poz(Fe, nEtr * t.ad.length, [{ L: ek, a: 135 }, { L: r2(2 * (bx + by)), a: 0 }, { L: ek, a: 45 }], 'etriye', t.ad.join('-')); t.pE.etr = [r2(bx), r2(by)];
      const nCx = Math.max(0, c.etr.nx - 2), nCy = Math.max(0, c.etr.ny - 2); t.nCx = nCx; t.nCy = nCy;
      t.pCx = nCx ? poz(Fe, nCx * nEtr * t.ad.length, [{ L: ek, a: 135 }, { L: r2(by + 2 * fe), a: 0 }, { L: ek, a: 45 }], 'çiroz', t.ad.join('-')) : null;
      t.pCy = nCy ? poz(Fe, nCy * nEtr * t.ad.length, [{ L: ek, a: 135 }, { L: r2(bx + 2 * fe), a: 0 }, { L: ek, a: 45 }], 'çiroz', t.ad.join('-')) : null;
    }
    /* ---- guse (kısa konsol) çubukları: ana U donatı + kapalı yatay etriyeler ---- */
    for (const t of tipler) {
      const g = t.g; if (!g) continue; const c = t.c, nG = t.uyeler.reduce((s, q) => s + ((q.guseD || []).length), 0);
      const yx = Math.abs(g.yon[0]) >= Math.abs(g.yon[1]), bk = yx ? c.bx : c.by; // kolonun guse doğrultusundaki boyutu
      const Fa = g.ana.F, fa = Fa / 1000, lA = Math.max(r5(P.bindirme(Fa)), r5(g.hf + 0.5)), top = r2(bk - cC + g.gL - cC - fa), uc = r2(g.hu - 2 * cC), yat = r2(Math.hypot(g.gL - cC, g.hf - g.hu)), son = Math.max(0.25, r5(12 * fa));
      // kolon içinde aşağı kenet, üst yatay, uçta aşağı, eğik alt yüz boyunca geri, kolon içine düz uzantı
      t.gA = poz(Fa, g.ana.n * nG, [{ L: lA, a: 90 }, { L: top, a: 0 }, { L: uc, a: 90 }, { L: yat, a: Math.round(Math.atan2(g.hf - g.hu, g.gL) * 180 / Math.PI) }, { L: son, a: 0 }], 'guse ana', t.ad.join('-'));
      t.gN = nG; t.gBk = bk; t.gLA = lA; t.gUc = uc; t.gSon = son;
      // yatay etriyeler: üst 2d/3 içinde, aralık eşit; konsol derinliği aşağı indikçe azalır (eğik alt yüz)
      const Fe = g.yat ? g.yat.F : 12, fe = Fe / 1000, n = g.yat ? g.yat.n : 2, ek = Math.max(0.10, r5(10 * fe)), dz = Math.min(0.10, (2 / 3 * g.d) / Math.max(1, n));
      t.gE = []; for (let i = 0; i < n; i++) { const z = cC + 0.02 + (i + 1) * dz, pr = z <= g.hu ? g.gL : g.gL * Math.max(0, (g.hf - z) / (g.hf - g.hu)), a = r2(bk + pr - 2 * cC), b = r2(g.w - 2 * cC); const p = poz(Fe, nG, [{ L: ek, a: 135 }, { L: r2(2 * (a + b)), a: 0 }, { L: ek, a: 45 }], 'guse etriye', t.ad.join('-')); p.etr = [a, b]; t.gE.push({ z, p, a, b }); }
      t.gEk = ek;
    }
    pozlar.sort((a, b) => (b.F - a.F) || (b.boy - a.boy)).forEach((p, i) => { p.no = i + 1; });

    /* ===== 1) KOLON APLİKASYON PLANI ===== */
    blok(() => {
      const xs = [...new Set(kol.map(c => r2(c.x)))].sort((a, b) => a - b), ys = [...new Set(kol.map(c => r2(c.y)))].sort((a, b) => b - a);
      const ax = xs.filter((x, i) => !i || x - xs[i - 1] > 0.3), ay = ys.filter((y, i) => !i || ys[i - 1] - y > 0.3);
      const x0 = Math.min(...kol.map(c => c.x - c.bx / 2)) - 1.5, x1 = Math.max(...kol.map(c => c.x + c.bx / 2)) + 1.5, y0 = Math.min(...kol.map(c => c.y - c.by / 2)) - 1.5, y1 = Math.max(...kol.map(c => c.y + c.by / 2)) + 1.5;
      ax.forEach((x, i) => { L([x, y0], [x, y1], 'STA_AKS'); BALON([x, y1 + mm(6)], String(i + 1)); BALON([x, y0 - mm(6)], String(i + 1)); });
      ay.forEach((y, i) => { L([x0, y], [x1, y], 'STA_AKS'); BALON([x0 - mm(6), y], harf(i)); BALON([x1 + mm(6), y], harf(i)); });
      for (const c of kol) {
        const X = c.x, Y = c.y; REC(X - c.bx / 2, Y - c.by / 2, X + c.bx / 2, Y + c.by / 2, 'STA_KALIP');
        const e = cC + 0.005; REC(X - c.bx / 2 + e, Y - c.by / 2 + e, X + c.bx / 2 - e, Y + c.by / 2 - e, 'STA_DONATI');
        ((tipler.find(q => q.uyeler.includes(c)) || { c }).c.don.bars).forEach(q => CI([X + q[0], Y + q[1]], Math.max(mm(0.35), c.don.F / 2000), 'STA_DONATI_KESIT'));
        TX([X + c.bx / 2 + mm(1.5), Y + c.by / 2 - mm(1)], `${c.no || ''} (${cm(c.bx)}/${cm(c.by)})`, 2.2, 'L', 'STA_POZ'); const tp = tipler.find(q => q.uyeler.includes(c)), dn = tp ? tp.c.don : c.don; TX([X + c.bx / 2 + mm(1.5), Y + c.by / 2 - mm(4.2)], `${dn.n}Ø${dn.F}`, 2.2, 'L', 'STA_POZ');
      }
      BASLIK([(x0 + x1) / 2, y0 - mm(16)], 'KOLON APLİKASYON PLANI', 'Ö:1/' + o);
    });
    /* ===== 2) KOLON DÜŞEY DONATI DETAYLARI (1/20) ===== */
    for (const t of tipler) blok(() => {
      // detay ölçeği: 1/20; uzun kolonlarda A0 yüksekliğine (≈680 mm) sığacak en büyük ölçek (1/25, 1/30, 1/40, 1/50)
      const hD = t.c.zt - (t.c.z0 - hT - 0.10) + t.c.by, dO = [20, 25, 30, 40, 50].find(q => hD * 1000 / q + 45 <= 680) || 50;
      const c = t.c, s = o / dO, Z = z => (z - c.z0) * s, W = c.bx * s, x0 = 0, x1 = W, zMin = c.z0 - hT - 0.10, zMax = c.zt;
      // temel + grobeton
      const tg = 0.6 * s; REC(x0 - tg, Z(c.z0 - hT), x1 + tg, Z(c.z0), 'STA_KALIP'); REC(x0 - tg - 0.1 * s, Z(zMin), x1 + tg + 0.1 * s, Z(c.z0 - hT), 'STA_GORUNUS');
      TX([x1 + tg + mm(2), Z(c.z0 - hT / 2)], 'Temel', 2.0, 'L'); TX([x1 + tg + mm(2), Z(zMin) + mm(0.5)], 'Grobeton', 2.0, 'L');
      // kolon gövdesi ve kirişler (düğümlerde)
      L([x0, Z(c.z0)], [x0, Z(c.zt)], 'STA_KALIP'); L([x1, Z(c.z0)], [x1, Z(c.zt)], 'STA_KALIP');
      for (const d of t.dg) { const kb = 0.5 * s; REC(x0 - kb, Z(d.z - d.hb), x0, Z(d.z), 'STA_KALIP'); TX([x0 - kb + mm(1), Z(d.z - d.hb / 2)], 'KİRİŞ', 1.8, 'L'); L([x0 - kb - mm(3), Z(d.z)], [x0 - kb, Z(d.z)], 'STA_KALIP'); }
      L([x0, Z(c.zt)], [x1, Z(c.zt)], 'STA_KALIP');
      // boyuna çubuklar (tüm sıra) + bindirme
      const nb = Math.max(2, c.don.nb), xb = i => x0 + (cC + 0.01 + c.don.F / 2000) * s + (W - 2 * (cC + 0.01 + c.don.F / 2000) * s) * i / (nb - 1);
      t.cub.forEach((b, k) => { for (let i = 0; i < nb; i++) { const x = xb(i) + (k ? mm(0.7) : 0), sg = i < nb / 2 ? 1 : -1; PL([...(b.kA ? [[x + sg * b.kA * s, Z(b.za)]] : []), [x, Z(b.za)], [x, Z(b.zb)], ...(b.kB ? [[x + sg * b.kB * s, Z(b.zb)]] : [])], false, 'STA_DONATI'); } });
      // etriye çizgileri ve bölge yazıları
      const gD = t.g, gP = gD ? gD.gL * s : 0;
      if (gD) { for (const q of (c.guse || [])) { const zt = q.zt; PL([[x1, Z(zt)], [x1 + q.gL * s, Z(zt)], [x1 + q.gL * s, Z(zt - q.hu)], [x1, Z(zt - q.hf)]], false, 'STA_KALIP'); } TX([x1 + gP / 2, Z(gD.zt) + mm(1)], 'GUSE', 1.8, 'C'); }
      const xr = x1 + gP + mm(10);
      for (const q of t.zon) { for (let i = 0; i < q.n; i++) { const z = q.a + (q.n > 1 ? (q.b - q.a) * i / (q.n - 1) : 0); L([x0 + mm(0.4), Z(z)], [x1 - mm(0.4), Z(z)], 'STA_DONATI_KESIT'); }
        if (q.tip !== 'temel') { L([xr, Z(q.a)], [xr, Z(q.b)], 'STA_OLCU'); L([xr - mm(1), Z(q.a)], [xr + mm(1), Z(q.a)], 'STA_OLCU'); TX([xr + mm(1.5), Z((q.a + q.b) / 2) - mm(1)], `${q.n}Ø${c.etr.F}/${cm(q.s)}`, 2.2, 'L', 'STA_POZ'); } }
      L([xr - mm(1), Z(t.zon[t.zon.length - 1].b)], [xr + mm(1), Z(t.zon[t.zon.length - 1].b)], 'STA_OLCU');
      // bindirme ölçüsü (filiz boyu)
      if (t.cub.length > 1) { const xf = x0 - mm(14); L([xf, Z(t.zL)], [xf, Z(t.zL + t.lb)], 'STA_OLCU'); L([xf - mm(1), Z(t.zL)], [xf + mm(1), Z(t.zL)], 'STA_OLCU'); L([xf - mm(1), Z(t.zL + t.lb)], [xf + mm(1), Z(t.zL + t.lb)], 'STA_OLCU'); TX([xf - mm(1), Z(t.zL + t.lb / 2)], `Filiz boyu ${cm(t.lb)}`, 2.0, 'C', 'STA_YAZI', 90); }
      // kotlar
      const xk = x0 - mm(26); [c.zt, ...(gD ? [gD.zt, gD.zt - gD.hu, gD.zt - gD.hf] : []), ...t.dg.map(d => d.z).filter(z => z < c.zt - 0.05), ...t.dg.map(d => d.z - d.hb), c.z0, c.z0 - hT, zMin].forEach(z => { L([xk, Z(z)], [xk + mm(6), Z(z)], 'STA_OLCU'); TX([xk, Z(z) + mm(0.8)], (z >= 0 ? '+' : '') + z.toFixed(2), 2.0, 'L', 'STA_YAZI'); });
      // çubuk açılımları ve poz balonları (sağda)
      const xa = xr + mm(34);
      t.cub.forEach((b, k) => { const p = t.pB[k], x = xa + k * mm(14); PL([...(b.kA ? [[x - b.kA * s, Z(b.za)]] : []), [x, Z(b.za)], [x, Z(b.zb)], ...(b.kB ? [[x - b.kB * s, Z(b.zb)]] : [])], false, 'STA_DONATI');
        const zm = (b.za + b.zb) / 2; POZ([x + mm(4), Z(zm) + mm(6)], p.no); TX([x + mm(2.5), Z(zm)], `(${t.ad.length}*${c.don.n}) ${p.adet}Ø${p.F}`, 2.2, 'L', 'STA_POZ', 90); TX([x + mm(6.5), Z(zm)], `L=${cm(p.boy)}`, 2.2, 'L', 'STA_POZ', 90);
        TX([x + mm(1), Z(b.zb - (b.zb - b.za) * 0.1)], cm(b.zb - b.za), 1.8, 'L', 'STA_YAZI', 90); if (b.kA) TX([x - b.kA * s / 2, Z(b.za) - mm(3)], cm(b.kA), 1.8, 'C'); if (b.kB) TX([x - b.kB * s / 2, Z(b.zb) + mm(1)], cm(b.kB), 1.8, 'C'); });
      // başlık
      TX([W / 2, Z(c.zt) + mm(16)], t.ad.join('-'), 2.8, 'C', 'STA_BASLIK'); TX([W / 2, Z(c.zt) + mm(11)], `(${cm(c.bx)}/${cm(c.by)}) ${c.don.n}Ø${c.don.F} · Ö:1/${dO}`, 2.2, 'C', 'STA_YAZI');
      // kesit (1/20) altta
      const kx = 0, ky = Z(zMin) - mm(14) - c.by * s, e = (cC + 0.005) * s;
      REC(kx, ky, kx + c.bx * s, ky + c.by * s, 'STA_KALIP'); REC(kx + e, ky + e, kx + c.bx * s - e, ky + c.by * s - e, 'STA_DONATI');
      c.don.bars.forEach(q => CI([kx + (q[0] + c.bx / 2) * s, ky + (q[1] + c.by / 2) * s], Math.max(mm(0.5), c.don.F / 2000 * s), 'STA_DONATI_KESIT'));
      for (let i = 1; i <= t.nCx; i++) { const x = kx + e + (c.bx * s - 2 * e) * i / (t.nCx + 1); L([x, ky + e], [x, ky + c.by * s - e], 'STA_DONATI'); }
      for (let i = 1; i <= t.nCy; i++) { const y = ky + e + (c.by * s - 2 * e) * i / (t.nCy + 1); L([kx + e, y], [kx + c.bx * s - e, y], 'STA_DONATI'); }
      TX([kx + c.bx * s / 2, ky - mm(4)], `${cm(c.bx)}/${cm(c.by)} · ${c.don.n}Ø${c.don.F} · etr. Ø${c.etr.F}/${cm(c.etr.sS)}-${cm(c.etr.sO)}`, 2.0, 'C');
      POZ([kx + c.bx * s + mm(6), ky + c.by * s - mm(2)], t.pB[0].no); POZ([kx + c.bx * s + mm(6), ky + c.by * s / 2], t.pE.no); if (t.pCx || t.pCy) POZ([kx + c.bx * s + mm(6), ky + mm(2)], (t.pCx || t.pCy).no);
    });
    /* ===== 3) ETRİYE VE ÇİROZ AÇILIMLARI ===== */
    blok(() => {
      let x = 0; TX([0, mm(10)], 'ETRİYE VE ÇİROZ AÇILIMLARI', 3.0, 'L', 'STA_BASLIK');
      for (const t of tipler) { const c = t.c, s = f20, bx = (c.bx - 2 * cC) * s, by = (c.by - 2 * cC) * s, ek = t.ek * s;
        PL([[x + ek * 0.7, -ek * 0.7], [x, 0], [x, -by], [x + bx, -by], [x + bx, 0], [x + mm(1), 0], [x + mm(1) + ek * 0.7, -ek * 0.7]], false, 'STA_DONATI');
        TX([x + bx / 2, mm(1)], cm(c.bx - 2 * cC), 1.8, 'C'); TX([x - mm(1), -by / 2], cm(c.by - 2 * cC), 1.8, 'R'); POZ([x + bx / 2, -by - mm(5)], t.pE.no); TX([x, -by - mm(10)], `${t.pE.adet}Ø${t.pE.F} L=${cm(t.pE.boy)}`, 2.0, 'L', 'STA_POZ');
        let xx = x + bx + mm(10); for (const pc of [t.pCx, t.pCy]) { if (!pc) continue; const l = pc.segs[1].L * s; /* çiroz */ PL([[xx + mm(2), mm(2)], [xx, 0], [xx, -l], [xx + mm(2), -l - mm(2)]], false, 'STA_DONATI'); POZ([xx + mm(4), -l / 2], pc.no); TX([xx - mm(1.5), -l / 2], `${pc.adet}Ø${pc.F} L=${cm(pc.boy)}`, 1.8, 'C', 'STA_POZ', 90); xx += mm(14); }
        x = xx + mm(10); }
    });
    /* ===== 3b) GUSE DONATI DETAYI (1/20) ===== */
    for (const t of tipler) if (t.g) blok(() => {
      const g = t.g, c = t.c, s = f20, bk = t.gBk, Fa = g.ana.F, za = g.zt - t.gLA - 0.30, zb = g.zt + 0.30, Z = z => (z - g.zt) * s, x0 = 0, x1 = bk * s, xg = x1 + g.gL * s, e = cC * s;
      // kalıp: kolon parçası (kırık çizgili) + guse
      L([x0, Z(za)], [x0, Z(zb)], 'STA_KALIP'); L([x1, Z(za)], [x1, Z(g.zt - g.hf)], 'STA_KALIP'); L([x1, Z(g.zt)], [x1, Z(zb)], 'STA_KALIP');
      PL([[x1, Z(g.zt)], [xg, Z(g.zt)], [xg, Z(g.zt - g.hu)], [x1, Z(g.zt - g.hf)]], false, 'STA_KALIP');
      for (const z of [za, zb]) PL([[x0 - mm(2), Z(z)], [x1 * 0.45, Z(z)], [x1 * 0.5, Z(z) + mm(1.5)], [x1 * 0.55, Z(z) - mm(1.5)], [x1 * 0.6, Z(z)], [x1 + mm(2), Z(z)]], false, 'STA_GORUNUS');
      // ana U donatı
      const xa = x0 + e + Fa / 2000 * s, yt = Z(g.zt) - e, xt = xg - e, yu = Z(g.zt - g.hu) + e, ys = Z(g.zt - g.hf) + e;
      PL([[xa, yt - t.gLA * s], [xa, yt], [xt, yt], [xt, yu], [x1, ys], [x1 - t.gSon * s, ys]], false, 'STA_DONATI');
      // yatay etriyeler (kesit görünüşü: yatay çizgiler)
      for (const q of t.gE) L([x0 + e, Z(g.zt - q.z)], [x1 + (q.a + 2 * cC - bk) * s - e, Z(g.zt - q.z)], 'STA_DONATI_KESIT');
      // kolon boyuna (kesikli görünüş) ve kolon etriyeleri bu bölgede devam eder
      L([x1 - e, Z(za)], [x1 - e, Z(zb)], 'STA_GORUNUS');
      // kotlar
      const xk = x0 - mm(22); [g.zt, g.zt - g.hu, g.zt - g.hf].forEach(z => { L([xk, Z(z)], [xk + mm(6), Z(z)], 'STA_OLCU'); TX([xk, Z(z) + mm(0.8)], (z >= 0 ? '+' : '') + z.toFixed(2), 2.0, 'L', 'STA_YAZI'); });
      // ölçüler
      const yo = Z(g.zt) + mm(6); L([x1, yo], [xg, yo], 'STA_OLCU'); TX([(x1 + xg) / 2, yo + mm(1)], cm(g.gL), 1.8, 'C'); L([x0, yo], [x1, yo], 'STA_OLCU'); TX([x1 / 2, yo + mm(1)], cm(bk), 1.8, 'C');
      const xo = xg + mm(5); L([xo, Z(g.zt)], [xo, Z(g.zt - g.hu)], 'STA_OLCU'); TX([xo + mm(1), Z(g.zt - g.hu / 2)], cm(g.hu), 1.8, 'L');
      TX([x1 + mm(1), Z(g.zt - g.hf) - mm(3)], `h=${cm(g.hf)}`, 1.8, 'L');
      // kesit çizgisi 1-1
      const yk = Z(g.zt - g.hu / 2); L([x1 + g.gL * s * 0.5, yk + mm(4) + (g.hu / 2) * s], [x1 + g.gL * s * 0.5, yk - mm(4) - (g.hu / 2) * s], 'STA_AKS'); TX([x1 + g.gL * s * 0.5 + mm(1), Z(g.zt) + mm(2)], '1', 2.0, 'L', 'STA_BASLIK'); TX([x1 + g.gL * s * 0.5 + mm(1), Z(g.zt - g.hu) - mm(4)], '1', 2.0, 'L', 'STA_BASLIK');
      // poz balonları
      POZ([xg + mm(14), Z(g.zt) - mm(2)], t.gA.no); TX([xg + mm(18), Z(g.zt) - mm(2.6)], `(${t.gN}*${g.ana.n}) ${t.gN * g.ana.n}Ø${Fa} L=${cm(t.gA.boy)}`, 2.0, 'L', 'STA_POZ');
      [...new Map(t.gE.map(q => [q.p.no, q])).values()].forEach((q, i) => { const nq = t.gE.filter(r => r.p === q.p).length; POZ([xg + mm(14), Z(g.zt) - mm(9 + 6 * i)], q.p.no); TX([xg + mm(18), Z(g.zt) - mm(9.6 + 6 * i)], `(${t.gN}*${nq}) ${t.gN * nq}Ø${q.p.F} L=${cm(q.p.boy)} (${cm(q.a)}×${cm(q.b)})`, 2.0, 'L', 'STA_POZ'); });
      // 1-1 kesiti (konsol enine kesiti)
      const kx = xg + mm(80), ky = Z(g.zt) - g.hf * s, b = g.w * s, h = g.hf * s;
      REC(kx, ky, kx + b, ky + h, 'STA_KALIP'); REC(kx + e, ky + e, kx + b - e, ky + h - e, 'STA_DONATI');
      for (let i = 0; i < g.ana.n; i++) { const x = kx + e + Fa / 2000 * s + (b - 2 * e - Fa / 1000 * s) * (g.ana.n > 1 ? i / (g.ana.n - 1) : 0.5); CI([x, ky + h - e - Fa / 2000 * s], Math.max(mm(0.5), Fa / 2000 * s), 'STA_DONATI_KESIT'); }
      t.gE.forEach(q => L([kx + e, ky + h - q.z * s], [kx + b - e, ky + h - q.z * s], 'STA_DONATI'));
      TX([kx + b / 2, ky - mm(4)], '1-1 KESİTİ', 2.2, 'C', 'STA_BASLIK'); TX([kx + b / 2, ky + h + mm(1)], cm(g.w), 1.8, 'C');
      // açılımlar
      const ox = kx + b + mm(20), oy = Z(g.zt), ss = t.gA.segs; let px = ox, py = oy - t.gLA * s; const pts = [[px, py]]; py += t.gLA * s; pts.push([px, py]); px += ss[1].L * s; pts.push([px, py]); py -= ss[2].L * s; pts.push([px, py]); px -= (g.gL - cC) * s; py -= (g.hf - g.hu) * s; pts.push([px, py]); px -= ss[4].L * s; pts.push([px, py]);
      PL(pts, false, 'STA_DONATI'); TX([ox + ss[1].L * s / 2, oy + mm(1)], cm(ss[1].L), 1.8, 'C'); TX([ox - mm(1), oy - t.gLA * s / 2], cm(t.gLA), 1.8, 'R'); TX([ox + ss[1].L * s + mm(1), oy - ss[2].L * s / 2], cm(ss[2].L), 1.8, 'L'); TX([px + ss[4].L * s / 2, py - mm(3)], cm(ss[4].L), 1.8, 'C'); TX([ox + ss[1].L * s - (g.gL * s) / 2 + mm(2), oy - ss[2].L * s - (g.hf - g.hu) * s / 2 - mm(2)], cm(ss[3].L), 1.8, 'L');
      POZ([ox + ss[1].L * s + mm(8), oy - mm(2)], t.gA.no);
      let ex = ox; const ey = Math.min(py, oy - t.gLA * s) - mm(12); [...new Map(t.gE.map(q => [q.p.no, q])).values()].forEach(q => { const a = q.a * s, bb = q.b * s, ek = t.gEk * s * 0.7; PL([[ex + ek, ey - ek], [ex, ey], [ex, ey - bb], [ex + a, ey - bb], [ex + a, ey], [ex + mm(1), ey], [ex + mm(1) + ek, ey - ek]], false, 'STA_DONATI'); TX([ex + a / 2, ey + mm(1)], cm(q.a), 1.8, 'C'); TX([ex - mm(1), ey - bb / 2], cm(q.b), 1.8, 'R'); POZ([ex + a / 2, ey - bb - mm(5)], q.p.no); ex += a + mm(12); });
      TX([x1 / 2 + mm(20), Z(zb) + mm(14)], `${t.ad.join('-')} GUSE DONATI DETAYI`, 2.8, 'L', 'STA_BASLIK'); TX([x1 / 2 + mm(20), Z(zb) + mm(9)], `Ö:1/20 · konsol ${cm(g.w)}×${cm(g.gL)}, h=${cm(g.hf)}/${cm(g.hu)} · V_d=${Math.round(g.Vd)} kN · ${g.ana.n}Ø${Fa} + ${g.yat ? g.yat.n + 'Ø' + g.yat.F : ''} yatay etriye`, 2.0, 'L', 'STA_YAZI');
    });
    /* ===== 4) METRAJ ===== */
    blok(() => { const T = D0.tablo(D, 0, 0, 'KOLON DONATI METRAJI', pozlar.map(p => ({ no: p.no, F: p.F, adet: p.adet, boy: p.boy, top: p.top, segs: p.segs }))); RC.kolonMetraj = { kg: T.top, pozlar }; });
    /* ---- blokları diz: A0 yatay çizim alanına (≈1120 × 715 mm) sığacak şekilde, gerekirse birden çok paftaya ---- */
    const not = tipler.some(t => t.uyeler.length > 1) ? [{ k: 'T', p: [0, 0], s: 'Kolonlar tipleştirilmiştir: aynı kesit, kot ve kiriş düğümüne sahip kolonlarda tipin en elverişsiz kolonunun donatısı kullanılmıştır.', h: mm(2.2), al: 'L', ly: 'STA_YAZI', rot: 0 }] : [];
    return P.blokSayfala(bloklar, K, 'KOLON APLİKASYON VE DÜŞEY DONATI DETAYLARI', o, not);
  };
})();

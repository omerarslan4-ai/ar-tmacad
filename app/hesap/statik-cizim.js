/* ArıtmaCAD — STATİK: kalıp + donatı paftası çizim üreticisi ve DXF (R12) yazıcı
   Çıktı: ilkel listesi (model metre, 1/50 çizim için yazı boyları). ArıtmaCAD'e STATIKCIZ komutu ile,
   diğer programlara DXF ile aktarılır. */
(function (G) {
  'use strict';
  const P = G.STATIK;
  const r2 = v => Math.round(v * 100) / 100, cm = v => String(Math.round(v * 1000) / 10).replace('.', ',');
  const fmtK = v => (v >= 0 ? '+' : '') + v.toFixed(2);

  P.KATMANLAR = {
    STA_KALIP: { c: 7, lt: 'CONTINUOUS', lw: 50 }, STA_GORUNUS: { c: 8, lt: 'CONTINUOUS', lw: 25 }, STA_AKS: { c: 1, lt: 'CENTER', lw: 18 },
    STA_OLCU: { c: 3, lt: 'CONTINUOUS', lw: 18 }, STA_YAZI: { c: 7, lt: 'CONTINUOUS', lw: 25 }, STA_BASLIK: { c: 2, lt: 'CONTINUOUS', lw: 50 },
    STA_DONATI: { c: 1, lt: 'CONTINUOUS', lw: 40 }, STA_DONATI_KESIT: { c: 1, lt: 'CONTINUOUS', lw: 25 }, STA_POZ: { c: 6, lt: 'CONTINUOUS', lw: 25 },
    STA_SU: { c: 5, lt: 'DASHED', lw: 25 }, STA_ZEMIN: { c: 34, lt: 'CONTINUOUS', lw: 25 }, STA_TABLO: { c: 7, lt: 'CONTINUOUS', lw: 25 },
  };

  P.cizim = function (R, olcek) {
    const S = R.S, g = S.geo, GM = R.GM, mal = S.mal, MT = R.metraj, out = [];
    const K = (olcek || (R.S.tas && R.S.tas.olcek) || 50) / 50; // pafta ölçeği katsayısı (1/50 = 1)
    const T1 = 0.125 * K, T2 = 0.175 * K, T3 = 0.30 * K; // kağıtta 2.5 / 3.5 / 6 mm
    const L = (a, b, ly, lt) => out.push({ k: 'L', a, b, ly, lt }), PL = (pts, cl, ly) => out.push({ k: 'P', pts, cl: !!cl, ly });
    const CI = (c, r, ly) => out.push({ k: 'C', c, r, ly }), TX = (p, s, h, al, ly, rot) => out.push({ k: 'T', p, s: String(s), h: h || T1, al: al || 'L', ly: ly || 'STA_YAZI', rot: rot || 0 });
    const DM = (a, b, dir, off, txt) => { const p = dir === 'h' ? [a[0], a[1] + off] : [a[0] + off, a[1]]; out.push({ k: 'D', a, b, p, dir, txt, ly: 'STA_OLCU' }); };
    const KOT = (p, v, txt, ters) => out.push({ k: 'K', p, v, txt: txt || '', ters: !!ters, ly: 'STA_OLCU' });
    const REC = (x0, y0, x1, y1, ly) => PL([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true, ly);
    const BASLIK = (p, s, olcek) => { TX(p, s, T3, 'C', 'STA_BASLIK'); const w = s.length * T3 * 0.72; L([p[0] - w / 2, p[1] - 0.08 * K], [p[0] + w / 2, p[1] - 0.08 * K], 'STA_BASLIK'); if (olcek) TX([p[0], p[1] - 0.42 * K], olcek.replace('1/50', '1/' + Math.round(50 * K)).replace('1/25', '1/' + Math.round(25 * K)), T1, 'C'); };
    const pozNo = (eleman, re) => { const p = MT.poz.find(q => q.eleman.startsWith(eleman) && re.test(q.tanim)); return p; };
    const POZ = (p, poz, yaz, sol) => { if (!poz) return; CI(p, 0.14 * K, 'STA_POZ'); TX([p[0], p[1] - 0.06 * K], poz.no, T1, 'C', 'STA_POZ'); TX([p[0] + (sol ? -0.22 : 0.22) * K, p[1] - 0.06 * K], yaz || `Ø${poz.F}/${cm(poz.s)}  L=${cm(poz.boy)}`, T1, sol ? 'R' : 'L', 'STA_POZ'); };
    const harf = i => String.fromCharCode(65 + i);
    const W = GM.R.x1 - GM.R.x0, Hh = GM.R.y1 - GM.R.y0;

    /* ---------- 1) TEMEL KALIP PLANI ---------- */
    const ox = 0, oy = 0;
    REC(GM.R.x0, GM.R.y0, GM.R.x1, GM.R.y1, 'STA_KALIP');
    REC(0, 0, g.Lx, g.Ly, 'STA_KALIP');
    GM.comps.forEach(c => REC(c.x0, c.y0, c.x1, c.y1, 'STA_KALIP'));
    const ext = 1.2 * K;
    GM.xC.forEach((x, i) => { L([x, GM.R.y0 - ext], [x, GM.R.y1 + ext * 0.4], 'STA_AKS'); CI([x, GM.R.y0 - ext - 0.3 * K], 0.3 * K, 'STA_AKS'); TX([x, GM.R.y0 - ext - 0.38 * K], i + 1, T2, 'C', 'STA_AKS'); });
    GM.yC.forEach((y, j) => { L([GM.R.x0 - ext, y], [GM.R.x1 + ext * 0.4, y], 'STA_AKS'); CI([GM.R.x0 - ext - 0.3 * K, y], 0.3 * K, 'STA_AKS'); TX([GM.R.x0 - ext - 0.3 * K, y - 0.08 * K], harf(j), T2, 'C', 'STA_AKS'); });
    // ölçüler
    const yD = GM.R.y1 + 0.6;
    const xsD = [GM.R.x0, 0, ...GM.xC, g.Lx, GM.R.x1].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
    for (let i = 0; i < xsD.length - 1; i++) DM([xsD[i], GM.R.y1], [xsD[i + 1], GM.R.y1], 'h', 0.6, cm(xsD[i + 1] - xsD[i]));
    DM([GM.R.x0, GM.R.y1], [GM.R.x1, GM.R.y1], 'h', 1.1, cm(W));
    const ysD = [GM.R.y0, 0, ...GM.yC, g.Ly, GM.R.y1].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
    for (let j = 0; j < ysD.length - 1; j++) DM([GM.R.x1, ysD[j]], [GM.R.x1, ysD[j + 1]], 'v', 0.6, cm(ysD[j + 1] - ysD[j]));
    DM([GM.R.x1, GM.R.y0], [GM.R.x1, GM.R.y1], 'v', 1.1, cm(Hh));
    // kesit hatları
    const ySec = (GM.comps[0].y0 + GM.comps[0].y1) / 2, xSec = (GM.comps[0].x0 + GM.comps[0].x1) / 2;
    L([GM.R.x0 - 0.5, ySec], [GM.R.x0 - 0.1, ySec], 'STA_KALIP'); L([GM.R.x1 + 0.1, ySec], [GM.R.x1 + 0.5, ySec], 'STA_KALIP');
    TX([GM.R.x0 - 0.3, ySec + 0.1], 'A', T2, 'C'); TX([GM.R.x1 + 0.3, ySec + 0.1], 'A', T2, 'C');
    L([xSec, GM.R.y0 - 0.5], [xSec, GM.R.y0 - 0.1], 'STA_KALIP'); L([xSec, GM.R.y1 + 0.1], [xSec, GM.R.y1 + 0.35], 'STA_KALIP');
    TX([xSec + 0.12, GM.R.y0 - 0.45], 'B', T2, 'L'); TX([xSec + 0.12, GM.R.y1 + 0.15], 'B', T2, 'L');
    (g.doseme || []).forEach(d => { L([d.x0, d.y0], [d.x1, d.y1], 'STA_GORUNUS'); L([d.x0, d.y1], [d.x1, d.y0], 'STA_GORUNUS'); TX([(d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2 + 0.15], `${d.ad || 'D'} (h=${cm(d.t)})  ${fmtK(g.kUst)}`, T1, 'C'); });
    TX([g.Lx / 2, g.Ly / 2 - 0.3], 'Radye üst ' + fmtK(g.kAlt + g.hr), T1, 'C');
    BASLIK([W / 2 + GM.R.x0, GM.R.y0 - ext - 1.2], 'TEMEL KALIP PLANI', 'ÖLÇEK 1/50');

    /* ---------- 2) A-A KESİTİ (X boyunca) ---------- */
    const kesit = (oy0, ad, uz, uzC, kapat, sec, ortho) => {
      // uz: kesit doğrultusundaki dış ölçü, uzC: eksenler, ortho: bu doğrultuya dik perdeler [{c,t}]
      const zz = v => oy0 + (v - g.kAlt);
      const r0 = -g.toe, r1 = uz + g.toe;
      REC(r0, zz(g.kAlt), r1, zz(g.kAlt + g.hr), 'STA_KALIP');
      for (const w of ortho) REC(w.c - w.t / 2, zz(g.kAlt + g.hr), w.c + w.t / 2, zz(g.kUst), 'STA_KALIP');
      L([ortho[0].c + ortho[0].t / 2, zz(g.kUst)], [ortho[ortho.length - 1].c - ortho[ortho.length - 1].t / 2, zz(g.kUst)], 'STA_GORUNUS');
      for (const d of (g.doseme || [])) { const a = sec.dir === 'x' ? [d.x0, d.x1] : [d.y0, d.y1], b = sec.dir === 'x' ? [d.y0, d.y1] : [d.x0, d.x1]; if (sec.at < b[0] || sec.at > b[1]) continue; REC(Math.max(a[0], 0), zz(g.kUst - d.t), Math.min(a[1], uz), zz(g.kUst), 'STA_KALIP'); }
      // zemin, su, YAS
      L([r0 - 1.5, zz(g.kZemin)], [0, zz(g.kZemin)], 'STA_ZEMIN'); L([uz, zz(g.kZemin)], [r1 + 1.5, zz(g.kZemin)], 'STA_ZEMIN');
      for (let x = r0 - 1.4; x < 0; x += 0.3) L([x, zz(g.kZemin)], [x - 0.15, zz(g.kZemin) - 0.15], 'STA_ZEMIN');
      for (let x = uz + 0.1; x < r1 + 1.5; x += 0.3) L([x, zz(g.kZemin)], [x - 0.15, zz(g.kZemin) - 0.15], 'STA_ZEMIN');
      for (let k = 0; k < ortho.length - 1; k++) { const a = ortho[k].c + ortho[k].t / 2, b = ortho[k + 1].c - ortho[k + 1].t / 2; L([a, zz(g.kSu)], [b, zz(g.kSu)], 'STA_SU'); }
      TX([(ortho[0].c + ortho[1].c) / 2, zz(g.kSu) + 0.08], 'MSS ' + fmtK(g.kSu), T1, 'C', 'STA_SU');
      if (R.YK.yas) { L([r0 - 1.5, zz(R.YK.yas)], [r0, zz(R.YK.yas)], 'STA_SU'); TX([r0 - 1.5, zz(R.YK.yas) + 0.08], 'YAS ' + fmtK(R.YK.yas), T1, 'L', 'STA_SU'); }
      // kotlar
      KOT([r1 + 0.6, zz(g.kAlt)], g.kAlt, 'Radye alt'); KOT([r1 + 0.6, zz(g.kAlt + g.hr)], g.kAlt + g.hr, 'Radye üst');
      KOT([uz + 0.3, zz(g.kUst)], g.kUst, 'Perde üst'); KOT([r0 - 0.9, zz(g.kZemin)], g.kZemin, 'Zemin', true);
      // ölçüler
      DM([r1, zz(g.kAlt)], [r1, zz(g.kAlt + g.hr)], 'v', 2.6, cm(g.hr)); DM([r1, zz(g.kAlt + g.hr)], [r1, zz(g.kUst)], 'v', 2.6, cm(g.kUst - g.kAlt - g.hr));
      DM([r1, zz(g.kAlt)], [r1, zz(g.kUst)], 'v', 3.1, cm(g.kUst - g.kAlt));
      const pts = [r0, ...ortho.flatMap(w => [w.c - w.t / 2, w.c + w.t / 2]), r1];
      for (let i = 0; i < pts.length - 1; i++) DM([pts[i], zz(g.kAlt)], [pts[i + 1], zz(g.kAlt)], 'h', -0.6, cm(pts[i + 1] - pts[i]));
      BASLIK([uz / 2, zz(g.kAlt) - 1.4], ad, 'ÖLÇEK 1/50');
      return zz(g.kUst);
    };
    const oyA = GM.R.y0 - ext - 3.4 - (g.kUst - g.kAlt);
    const orthoX = GM.xC.map((c, i) => ({ c, t: i === 0 || i === GM.xC.length - 1 ? g.tw : g.ti }));
    kesit(oyA, 'A-A KESİTİ', g.Lx, GM.xC, true, { dir: 'x', at: ySec }, orthoX);
    // B-B kesiti: sağa
    const oxB = W + 5.5;
    const n0 = out.length;
    const orthoY = GM.yC.map((c, j) => ({ c, t: j === 0 || j === GM.yC.length - 1 ? g.tw : g.ti }));
    kesit(oyA, 'B-B KESİTİ', g.Ly, GM.yC, true, { dir: 'y', at: xSec }, orthoY);
    const shift = (a, dx, dy) => a && [a[0] + dx, a[1] + dy];
    for (let i = n0; i < out.length; i++) { const o = out[i]; ['a', 'b', 'c', 'p'].forEach(k => { if (o[k]) o[k] = shift(o[k], oxB, 0); }); if (o.pts) o.pts = o.pts.map(q => shift(q, oxB, 0)); }

    /* ---------- 3) PERDE + RADYE DONATI DETAYI (1/25: ölçek ×2) ---------- */
    {
      const k = 2, ox3 = oxB + g.Ly + 7, oy3 = oyA - 1;
      const X = x => ox3 + x * k, Y = z => oy3 + (z - g.kAlt) * k;
      const t = g.tw, hr = g.hr, c = mal.cP, cr = mal.cR, Hc = g.kUst, toe = g.toe, ins = Math.min(1.6, GM.comps[0].x1 - GM.comps[0].x0);
      // beton dış hat: pabuç ucu (x=-toe) → perde dış yüz x=0 → perde iç yüz x=t → radye içe ins
      PL([[X(-toe), Y(g.kAlt)], [X(t + ins), Y(g.kAlt)]], false, 'STA_KALIP');
      PL([[X(-toe), Y(g.kAlt)], [X(-toe), Y(g.kAlt + hr)], [X(0), Y(g.kAlt + hr)], [X(0), Y(Hc)], [X(t), Y(Hc)], [X(t), Y(g.kAlt + hr)], [X(t + ins), Y(g.kAlt + hr)]], false, 'STA_KALIP');
      L([X(t + ins), Y(g.kAlt - 0.1)], [X(t + ins), Y(g.kAlt + hr + 0.1)], 'STA_GORUNUS');
      const dDis = pozNo('Dış perde', /^Düşey dış/), dIc = pozNo('Dış perde', /^Düşey iç/), yDis = pozNo('Dış perde', /^Yatay dış/), yIc = pozNo('Dış perde', /^Yatay iç/);
      const rAX = pozNo('Radye', /^Alt X/), rUX = pozNo('Radye', /^Üst X/), rAY = pozNo('Radye', /^Alt Y/), rUY = pozNo('Radye', /^Üst Y/);
      const zAlt = g.kAlt + cr, zUst = g.kAlt + hr - cr;
      // radye alt / üst donatı (kesit doğrultusunda: X) — uçta kıvrık
      PL([[X(-toe + cr), Y(zUst)], [X(-toe + cr), Y(zAlt)], [X(t + ins), Y(zAlt)]], false, 'STA_DONATI');
      PL([[X(-toe + cr), Y(zAlt)], [X(-toe + cr), Y(zUst)], [X(t + ins), Y(zUst)]], false, 'STA_DONATI');
      // dik doğrultudaki radye donatıları (noktalar)
      const fy = (a, b, s, z, ly) => { if (!s) return; for (let x = a; x <= b + 1e-9; x += s) CI([X(x), Y(z) + (z < g.kAlt + hr / 2 ? 0.05 : -0.05)], 0.035, ly || 'STA_DONATI_KESIT'); };
      fy(-toe + cr + 0.05, t + ins - 0.05, rAY && rAY.s, zAlt);
      fy(-toe + cr + 0.05, t + ins - 0.05, rUY && rUY.s, zUst);
      // perde düşey donatıları (L filizli)
      const leg = Math.max(0.30, 20 * ((dDis && dDis.F) || 14) / 1000);
      PL([[X(c), Y(Hc - c)], [X(c), Y(zAlt + 0.03)], [X(c + leg), Y(zAlt + 0.03)]], false, 'STA_DONATI');
      PL([[X(t - c), Y(Hc - c)], [X(t - c), Y(zAlt + 0.03)], [X(t - c + leg), Y(zAlt + 0.03)]], false, 'STA_DONATI');
      L([X(c), Y(Hc - c)], [X(t - c), Y(Hc - c)], 'STA_DONATI');
      // yatay donatılar (noktalar)
      const fz = (x, s) => { if (!s) return; for (let z = g.kAlt + hr + 0.05; z <= Hc - c + 1e-9; z += s) CI([X(x), Y(z)], 0.035, 'STA_DONATI_KESIT'); };
      fz(c + 0.03, yDis && yDis.s); fz(t - c - 0.03, yIc && yIc.s);
      // poz etiketleri
      const zM = (g.kAlt + hr + Hc) / 2;
      L([X(c), Y(zM + 0.4)], [X(-toe) - 1.0, Y(zM + 0.4)], 'STA_POZ'); POZ([X(-toe) - 1.15, Y(zM + 0.4)], dDis, null, true);
      L([X(c + 0.03), Y(zM)], [X(-toe) - 1.0, Y(zM)], 'STA_POZ'); POZ([X(-toe) - 1.15, Y(zM)], yDis, yDis && `Ø${yDis.F}/${cm(yDis.s)} (yatay dış)`, true);
      L([X(t - c), Y(zM + 0.6)], [X(t + ins) + 0.6, Y(zM + 0.6)], 'STA_POZ'); POZ([X(t + ins) + 0.75, Y(zM + 0.6)], dIc);
      L([X(t - c - 0.03), Y(zM + 0.2)], [X(t + ins) + 0.6, Y(zM + 0.2)], 'STA_POZ'); POZ([X(t + ins) + 0.75, Y(zM + 0.2)], yIc, yIc && `Ø${yIc.F}/${cm(yIc.s)} (yatay iç)`);
      L([X(t + ins * 0.6), Y(zAlt)], [X(t + ins * 0.6), Y(g.kAlt) - 0.7], 'STA_POZ'); POZ([X(t + ins * 0.6), Y(g.kAlt) - 0.85], rAX, rAX && `Ø${rAX.F}/${cm(rAX.s)} ALT X`);
      L([X(t + ins * 0.35), Y(zUst)], [X(t + ins * 0.35), Y(g.kAlt + hr) + 0.9], 'STA_POZ'); POZ([X(t + ins * 0.35), Y(g.kAlt + hr) + 1.05], rUX, rUX && `Ø${rUX.F}/${cm(rUX.s)} ÜST X`);
      TX([X(t + ins * 0.6), Y(g.kAlt) - 1.25], (rAY ? `${rAY.no}) Ø${rAY.F}/${cm(rAY.s)} ALT Y` : '') + (rUY ? `   ${rUY.no}) Ø${rUY.F}/${cm(rUY.s)} ÜST Y` : ''), T1, 'C', 'STA_POZ');
      // ölçüler (gerçek değer)
      DM([X(0), Y(Hc)], [X(t), Y(Hc)], 'h', 0.5, cm(t)); DM([X(-toe), Y(g.kAlt)], [X(0), Y(g.kAlt)], 'h', -0.5, cm(toe));
      DM([X(-toe), Y(g.kAlt)], [X(-toe), Y(g.kAlt + hr)], 'v', -0.6, cm(hr)); DM([X(-toe), Y(g.kAlt + hr)], [X(-toe), Y(Hc)], 'v', -0.6, cm(Hc - g.kAlt - hr));
      TX([X(t + ins), Y(Hc) + 0.1], `pas payı: perde ${cm(c)} cm, radye ${cm(cr)} cm`, T1, 'R');
      BASLIK([X(t / 2 + ins / 2), Y(g.kAlt) - 2.0], 'DIŞ PERDE - RADYE DONATI DETAYI', 'ÖLÇEK 1/25');
    }

    /* ---------- 4) RADYE DONATI PLANI (temsili) ---------- */
    const oy4 = oyA - 2.6 - GM.R.y1;
    {
      const o = [0, oy4], S2 = (p) => [p[0] + o[0], p[1] + o[1]];
      PL([[GM.R.x0, GM.R.y0], [GM.R.x1, GM.R.y0], [GM.R.x1, GM.R.y1], [GM.R.x0, GM.R.y1]].map(S2), true, 'STA_KALIP');
      GM.comps.forEach(c => PL([[c.x0, c.y0], [c.x1, c.y0], [c.x1, c.y1], [c.x0, c.y1]].map(S2), true, 'STA_GORUNUS'));
      const rAX = pozNo('Radye', /^Alt X/), rUX = pozNo('Radye', /^Üst X/), rAY = pozNo('Radye', /^Alt Y/), rUY = pozNo('Radye', /^Üst Y/);
      const cr = mal.cR, yA = GM.R.y0 + Hh * 0.30, yU = GM.R.y0 + Hh * 0.70, xA = GM.R.x0 + W * 0.30, xU = GM.R.x0 + W * 0.62;
      if (rAX) { L(S2([GM.R.x0 + cr, yA]), S2([GM.R.x1 - cr, yA]), 'STA_DONATI'); TX(S2([GM.R.x0 + W * 0.12, yA + 0.08]), `${rAX.no}) ${rAX.adet}Ø${rAX.F}/${cm(rAX.s)} ALT  L=${cm(rAX.boy)}`, T1, 'L', 'STA_POZ'); }
      if (rUX) { out.push({ k: 'L', a: S2([GM.R.x0 + cr, yU]), b: S2([GM.R.x1 - cr, yU]), ly: 'STA_DONATI', lt: 'DASHED' }); TX(S2([GM.R.x0 + W * 0.12, yU + 0.08]), `${rUX.no}) ${rUX.adet}Ø${rUX.F}/${cm(rUX.s)} ÜST  L=${cm(rUX.boy)}`, T1, 'L', 'STA_POZ'); }
      if (rAY) { L(S2([xA, GM.R.y0 + cr]), S2([xA, GM.R.y1 - cr]), 'STA_DONATI'); TX(S2([xA - 0.08, GM.R.y0 + 0.3]), `${rAY.no}) ${rAY.adet}Ø${rAY.F}/${cm(rAY.s)} ALT L=${cm(rAY.boy)}`, T1, 'L', 'STA_POZ', 90); }
      if (rUY) { out.push({ k: 'L', a: S2([xU, GM.R.y0 + cr]), b: S2([xU, GM.R.y1 - cr]), ly: 'STA_DONATI', lt: 'DASHED' }); TX(S2([xU - 0.08, GM.R.y0 + 0.3]), `${rUY.no}) ${rUY.adet}Ø${rUY.F}/${cm(rUY.s)} ÜST L=${cm(rUY.boy)}`, T1, 'L', 'STA_POZ', 90); }
      TX(S2([GM.R.x0, GM.R.y0 - 0.45]), 'Sürekli çizgi: alt donatı — kesikli çizgi: üst donatı. Donatı uçları radye kenarında kıvrılarak birbirine bindirilecektir.', T1, 'L');
      BASLIK(S2([W / 2 + GM.R.x0, GM.R.y0 - 1.2]), 'RADYE DONATI PLANI', 'ÖLÇEK 1/50');
    }

    /* ---------- 5) DONATI METRAJ TABLOSU ---------- */
    {
      const caps = MT.ozet.map(o => o.F), cw = [0.7, 0.7, 0.9, 0.8, 4.2].map(v => v * K), wF = 1.1 * K, rh = 0.32 * K;
      const x0 = W + 5.5, y0 = oyA - 4.2;
      const cols = [...cw, ...caps.map(() => wF)], X = [x0]; cols.forEach(w => X.push(X[X.length - 1] + w));
      const hdr = ['POZ', 'Ø', 'BOY (m)', 'ADET', 'ELEMAN / TANIM', ...caps.map(F => 'Ø' + F)];
      const nrow = MT.poz.length + 1 + 4; let y = y0;
      const row = (cells, bold) => { cells.forEach((s, i) => TX([(X[i] + X[i + 1]) / 2, y - rh + 0.1], s, bold ? T1 * 1.05 : T1 * 0.9, i === 4 ? 'C' : 'C', 'STA_TABLO')); L([X[0], y - rh], [X[X.length - 1], y - rh], 'STA_TABLO'); y -= rh; };
      L([X[0], y0], [X[X.length - 1], y0], 'STA_TABLO');
      row(hdr, true);
      for (const p of MT.poz) row([p.no, 'Ø' + p.F, p.boy.toFixed(2), p.adet, (p.eleman + ' — ' + p.tanim).slice(0, 52), ...caps.map(F => (F === p.F ? p.top.toFixed(2) : ''))]);
      row(['', '', '', '', 'TOPLAM BOY (m)', ...MT.ozet.map(o => o.L.toFixed(2))], true);
      row(['', '', '', '', 'BİRİM AĞIRLIK (kg/m)', ...MT.ozet.map(o => o.birim.toFixed(3))]);
      row(['', '', '', '', 'TOPLAM AĞIRLIK (kg)', ...MT.ozet.map(o => o.kg.toFixed(1))], true);
      row(['', '', '', '', 'GENEL TOPLAM (kg)', ...caps.map((_, i) => (i === 0 ? MT.top.toFixed(1) : ''))], true);
      X.forEach(x => L([x, y0], [x, y], 'STA_TABLO'));
      TX([x0, y0 + 0.25], 'DONATI METRAJI (S420 — tüm yapı)', T2, 'L', 'STA_BASLIK');
      TX([x0, y - 0.35], `Beton (C${S.mal.fck}): radye ${r2(MT.beton.radye)} m³ + perde ${r2(MT.beton.perde)} m³ + döşeme ${r2(MT.beton.doseme)} m³ = ${r2(MT.beton.top)} m³`, T1, 'L', 'STA_TABLO');

      /* ---------- 6) NOTLAR + DONATI ÖZETİ ---------- */
      let yn = y - 1.0;
      const N = s => { TX([x0, yn], s, T1, 'L', 'STA_YAZI'); yn -= 0.24 * K; };
      TX([x0, yn], 'NOTLAR', T2, 'L', 'STA_BASLIK'); yn -= 0.35;
      N(`1. Beton sınıfı C${S.mal.fck} (su geçirimsiz, W10), betonarme çeliği B${S.mal.fyk}C (S${S.mal.fyk}).`);
      N(`2. Net pas payları: perde ${cm(mal.cP)} cm, radye ${cm(mal.cR)} cm, döşeme ${cm(mal.cD)} cm.`);
      N(`3. Kenetlenme / bindirme boyu ${MT.lb}Ø (TS 500). Bindirmeler aynı kesitte %50'den fazla yapılmayacaktır.`);
      N(`4. Su ile temas eden yüzlerde izin verilen çatlak genişliği ${S.tas.wmax} mm (DSİ su tutucu yapılar şartnamesi, tesir sınıfı A).`);
      N('5. Radye-perde ve perde-perde birleşimlerinde PVC su tutucu bant (≥ 24 cm) kullanılacaktır.');
      N(`6. Zemin emniyet gerilmesi ${S.zemin.sig} kN/m² (zemin etüdüne göre). Radye altına 10 cm grobeton dökülecektir.`);
      N('7. Ölçüler cm, kotlar m cinsindendir. Statik hesap raporu ile birlikte değerlendirilecektir.');
      yn -= 0.2; TX([x0, yn], 'KESİT DONATILARI (hesaptan)', T2, 'L', 'STA_BASLIK'); yn -= 0.35;
      for (const t of R.tasarim) { N(t.eleman + ':'); for (const k of t.katman) N(`     ${k.yon} — ${k.yuz}: ${k.sec.ok ? `Ø${k.sec.F}/${cm(k.sec.s)}  (As=${(k.sec.As * 1e4).toFixed(2)} cm²/m)` : 'YETERSİZ — ' + (k.sec.msg || '')}`); }
    }
    return out;
  };

  /* ================= DXF R12 ================= */
  const CP1254 = { 'ç': 0xE7, 'Ç': 0xC7, 'ğ': 0xF0, 'Ğ': 0xD0, 'ı': 0xFD, 'İ': 0xDD, 'ö': 0xF6, 'Ö': 0xD6, 'ş': 0xFE, 'Ş': 0xDE, 'ü': 0xFC, 'Ü': 0xDC, '²': 0xB2, '³': 0xB3, '°': 0xB0, '±': 0xB1, '—': 0x97, '–': 0x96 };
  P.dxf = function (spec, katmanlar) {
    const o = [], n = v => (Math.round(v * 1e6) / 1e6).toString();
    const w = (c, v) => { o.push(String(c), String(v)); };
    w(0, 'SECTION'); w(2, 'HEADER'); w(9, '$ACADVER'); w(1, 'AC1009'); w(9, '$DWGCODEPAGE'); w(3, 'ANSI_1254'); w(9, '$INSUNITS'); w(70, 6); w(9, '$LTSCALE'); w(40, 0.05); w(0, 'ENDSEC');
    w(0, 'SECTION'); w(2, 'TABLES');
    w(0, 'TABLE'); w(2, 'LTYPE'); w(70, 3);
    const lt = (name, desc, pat) => { w(0, 'LTYPE'); w(2, name); w(70, 0); w(3, desc); w(72, 65); w(73, pat.length); w(40, pat.reduce((s, x) => s + Math.abs(x), 0)); pat.forEach(x => w(49, x)); };
    lt('CONTINUOUS', 'Solid line', []); lt('CENTER', 'Center ____ _ ____', [31.75, -6.35, 6.35, -6.35]); lt('DASHED', 'Dashed __ __', [12.7, -6.35]);
    w(0, 'ENDTAB');
    const ks = Object.keys(katmanlar);
    w(0, 'TABLE'); w(2, 'LAYER'); w(70, ks.length + 1);
    w(0, 'LAYER'); w(2, '0'); w(70, 0); w(62, 7); w(6, 'CONTINUOUS');
    ks.forEach(k => { w(0, 'LAYER'); w(2, k); w(70, 0); w(62, katmanlar[k].c); w(6, katmanlar[k].lt); });
    w(0, 'ENDTAB');
    w(0, 'TABLE'); w(2, 'STYLE'); w(70, 1); w(0, 'STYLE'); w(2, 'STANDARD'); w(70, 0); w(40, 0); w(41, 0.8); w(50, 0); w(71, 0); w(42, 2.5); w(3, 'arial.ttf'); w(4, ''); w(0, 'ENDTAB');
    w(0, 'ENDSEC');
    w(0, 'SECTION'); w(2, 'ENTITIES');
    const line = (a, b, ly, lt2) => { w(0, 'LINE'); w(8, ly); if (lt2) w(6, lt2); w(10, n(a[0])); w(20, n(a[1])); w(30, 0); w(11, n(b[0])); w(21, n(b[1])); w(31, 0); };
    const txt = (p, h, s, al, ly, rot) => { s = String(s).replace(/Ø/g, '%%c'); w(0, 'TEXT'); w(8, ly); w(10, n(p[0])); w(20, n(p[1])); w(30, 0); w(40, n(h)); w(1, s); if (rot) w(50, rot); w(41, 0.8); const a = al === 'C' ? 1 : al === 'R' ? 2 : 0; if (a) { w(72, a); w(11, n(p[0])); w(21, n(p[1])); w(31, 0); } };
    const solid = (pts, ly) => { const q = pts.length === 3 ? [pts[0], pts[1], pts[2], pts[2]] : [pts[0], pts[1], pts[3], pts[2]]; w(0, 'SOLID'); w(8, ly); q.forEach((p, i) => { w(10 + i, n(p[0])); w(20 + i, n(p[1])); w(30 + i, 0); }); };
    for (const e of spec) {
      if (e.k === 'L') line(e.a, e.b, e.ly, e.lt);
      else if (e.k === 'P') { w(0, 'POLYLINE'); w(8, e.ly); w(66, 1); w(10, 0); w(20, 0); w(30, 0); w(70, e.cl ? 1 : 0); e.pts.forEach(p => { w(0, 'VERTEX'); w(8, e.ly); w(10, n(p[0])); w(20, n(p[1])); w(30, 0); }); w(0, 'SEQEND'); w(8, e.ly); }
      else if (e.k === 'C') { w(0, 'CIRCLE'); w(8, e.ly); w(10, n(e.c[0])); w(20, n(e.c[1])); w(30, 0); w(40, n(e.r)); }
      else if (e.k === 'T') txt(e.p, e.h, e.s, e.al, e.ly, e.rot);
      else if (e.k === 'D') { // patlatılmış ölçü
        const h = e.dir === 'h', a2 = h ? [e.a[0], e.p[1]] : [e.p[0], e.a[1]], b2 = h ? [e.b[0], e.p[1]] : [e.p[0], e.b[1]], tk = 0.06;
        line(e.a, a2, e.ly); line(e.b, b2, e.ly); line(a2, b2, e.ly);
        [a2, b2].forEach(q => line([q[0] - tk, q[1] - tk], [q[0] + tk, q[1] + tk], e.ly));
        const m = [(a2[0] + b2[0]) / 2, (a2[1] + b2[1]) / 2];
        txt(h ? [m[0], m[1] + 0.05] : [m[0] - 0.05, m[1]], 0.1, e.txt, 'C', e.ly, h ? 0 : 90);
      } else if (e.k === 'LD') { // kılavuz ok: çizgi + uca doğru dolu ok (R12'de LEADER yok)
        for (let i = 1; i < e.pts.length; i++) line(e.pts[i - 1], e.pts[i], e.ly);
        const a = e.pts[0], b = e.pts[1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, u = [dx / l, dy / l], nn = [-u[1], u[0]], s = e.asz || 0.1, ww = s / 3.2;
        solid([a, [a[0] + u[0] * s + nn[0] * ww, a[1] + u[1] * s + nn[1] * ww], [a[0] + u[0] * s - nn[0] * ww, a[1] + u[1] * s - nn[1] * ww]], e.ly);
      } else if (e.k === 'K') {
        const s = 0.12, p = e.p, f = e.ters ? -1 : 1;
        solid([p, [p[0] - s * 0.6, p[1] + s], [p[0] + s * 0.6, p[1] + s]], e.ly);
        line([p[0] - f * s * 0.6, p[1] + s], [p[0] + f * 1.0, p[1] + s], e.ly);
        txt([p[0] + f * s, p[1] + s * 1.4], 0.1, (e.txt ? e.txt + ' ' : '') + fmtK(e.v), e.ters ? 'R' : 'L', e.ly);
      }
    }
    w(0, 'ENDSEC'); w(0, 'EOF');
    const str = o.join('\r\n') + '\r\n', bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) { const ch = str[i], c = ch.charCodeAt(0); bytes[i] = c < 128 ? c : (CP1254[ch] || 63); }
    return bytes;
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ================= 3B DONATI (modeldeki beton içine yerleştirilecek çubuklar) =================
   Çıktı: [{ poz, F, s, eleman, tanim, bars: [[[x,y,z], …], …] }] — x, y yapının dış köşesinden (m), z mutlak kot. */
(function (G) {
  'use strict';
  const P = G.STATIK;
  P.donati3B = function (R) {
    const S = R.S, g = S.geo, GM = R.GM, c = S.mal, MT = R.metraj, out = [];
    const sec = (el, yon, yuz) => { const t = R.tasarim.find(x => x.eleman.startsWith(el)); if (!t) return null; const k = t.katman.find(q => q.yon === yon && q.yuz === yuz); return k && k.sec && k.sec.ok ? k.sec : null; };
    const poz = (el, re) => MT.poz.find(q => q.eleman.startsWith(el) && re.test(q.tanim));
    const grup = (s, pz, eleman, tanim) => { const o = { poz: pz ? pz.no : null, F: s.F, s: s.s, eleman, tanim, bars: [] }; out.push(o); return o; };
    const zA = g.kAlt, hr = g.hr, zT = g.kAlt + hr, zU = g.kUst, cP = c.cP, cR = c.cR;
    const adim = (a, b, s) => { const n = Math.max(1, Math.round((b - a) / s)), r = []; for (let i = 0; i <= n; i++) r.push(a + (b - a) * i / n); return r; };
    /* ---- radye ---- */
    {
      const x0 = GM.R.x0 + cR, x1 = GM.R.x1 - cR, y0 = GM.R.y0 + cR, y1 = GM.R.y1 - cR;
      const aX = sec('Radye', 'X yönü', 'Alt'), aY = sec('Radye', 'Y yönü', 'Alt'), uX = sec('Radye', 'X yönü', 'Üst'), uY = sec('Radye', 'Y yönü', 'Üst');
      const fx = s => (s ? s.F / 1000 : 0.012);
      if (aX) { const o = grup(aX, poz('Radye', /^Alt X/), 'Radye', 'Alt X'), z = zA + cR + fx(aX) / 2; for (const y of adim(y0, y1, aX.s)) o.bars.push([[x0, y, zT - cR], [x0, y, z], [x1, y, z], [x1, y, zT - cR]]); }
      if (aY) { const o = grup(aY, poz('Radye', /^Alt Y/), 'Radye', 'Alt Y'), z = zA + cR + fx(aX) + fx(aY) / 2; for (const x of adim(x0 + 0.03, x1 - 0.03, aY.s)) o.bars.push([[x, y0, zT - cR], [x, y0, z], [x, y1, z], [x, y1, zT - cR]]); }
      if (uX) { const o = grup(uX, poz('Radye', /^Üst X/), 'Radye', 'Üst X'), z = zT - cR - fx(uX) / 2; for (const y of adim(y0 + 0.02, y1 - 0.02, uX.s)) o.bars.push([[x0 + 0.02, y, zA + cR + 0.02], [x0 + 0.02, y, z], [x1 - 0.02, y, z], [x1 - 0.02, y, zA + cR + 0.02]]); }
      if (uY) { const o = grup(uY, poz('Radye', /^Üst Y/), 'Radye', 'Üst Y'), z = zT - cR - fx(uX) - fx(uY) / 2; for (const x of adim(x0 + 0.05, x1 - 0.05, uY.s)) o.bars.push([[x, y0 + 0.04, zA + cR + 0.04], [x, y0 + 0.04, z], [x, y1 - 0.04, z], [x, y1 - 0.04, zA + cR + 0.04]]); }
    }
    /* ---- perdeler ---- */
    for (const w of GM.walls) {
      const dis = w.tip === 'dis', el = dis ? 'Dış perde' : 'Ara perde', t = w.t, L = w.L;
      const yz = dis ? ['Dış yüz', 'İç yüz'] : ['Yüz 1', 'Yüz 2'];
      const Pt = (s, o, z) => [w.p0[0] + w.e[0] * s + w.n[0] * o, w.p0[1] + w.e[1] * s + w.n[1] * o, z];
      const sA = dis ? -t / 2 + cP : -g.tw / 2 + cP + 0.02, sB = dis ? L + t / 2 - cP : L + g.tw / 2 - cP - 0.02;
      [1, -1].forEach((sg, i) => {
        const dv = sec(el, 'Düşey', yz[i]), yh = sec(el, 'Yatay', yz[i]);
        const Fv = dv ? dv.F / 1000 : 0.012, Fh = yh ? yh.F / 1000 : 0.012;
        if (dv) {
          const o = grup(dv, poz(el, i === 0 ? (dis ? /^Düşey dış/ : /^Düşey yüz 1/) : (dis ? /^Düşey iç/ : /^Düşey yüz 2/)), w.ad, 'Düşey ' + yz[i].toLocaleLowerCase('tr'));
          const off = sg * (t / 2 - cP - Fv / 2), leg = Math.max(0.30, 20 * Fv), zb = zA + cR + 0.035 + (i ? 0.02 : 0), ld = dis ? -1 : -sg;
          for (const s of adim(sA + 0.03, sB - 0.03, dv.s)) o.bars.push([Pt(s, off, zU - cP), Pt(s, off, zb), Pt(s, off + ld * leg, zb)]);
        }
        if (yh) {
          const o = grup(yh, poz(el, i === 0 ? (dis ? /^Yatay dış/ : /^Yatay yüz 1/) : (dis ? /^Yatay iç/ : /^Yatay yüz 2/)), w.ad, 'Yatay ' + yz[i].toLocaleLowerCase('tr'));
          const off = sg * (t / 2 - cP - Fv - Fh / 2);
          for (const z of adim(zT + 0.05, zU - cP - 0.02, yh.s)) o.bars.push([Pt(sA, off, z), Pt(sB, off, z)]);
        }
      });
    }
    /* ---- üst döşemeler ---- */
    (g.doseme || []).forEach(d => {
      const el = 'Üst döşeme ' + (d.ad || ''), cD = c.cD, x0 = d.x0 + cD, x1 = d.x1 - cD, y0 = d.y0 + cD, y1 = d.y1 - cD, zb = zU - d.t + cD, zt = zU - cD;
      const aX = sec(el, 'X yönü', 'Alt (açıklık)'), aY = sec(el, 'Y yönü', 'Alt (açıklık)'), uX = sec(el, 'X yönü', 'Üst (mesnet)'), uY = sec(el, 'Y yönü', 'Üst (mesnet)');
      if (aX) { const o = grup(aX, poz(el, /^Alt X/), el, 'Alt X'); for (const y of adim(y0, y1, aX.s)) o.bars.push([[x0, y, zb + aX.F / 2000], [x1, y, zb + aX.F / 2000]]); }
      if (aY) { const o = grup(aY, poz(el, /^Alt Y/), el, 'Alt Y'); for (const x of adim(x0, x1, aY.s)) o.bars.push([[x, y0, zb + 0.012 + aY.F / 2000], [x, y1, zb + 0.012 + aY.F / 2000]]); }
      if (uX) { const o = grup(uX, poz(el, /^Üst X/), el, 'Üst X (mesnet)'), l = (x1 - x0) / 4 + 0.4; for (const y of adim(y0, y1, uX.s)) { o.bars.push([[x0, y, zt - uX.F / 2000], [x0 + l, y, zt - uX.F / 2000]]); o.bars.push([[x1 - l, y, zt - uX.F / 2000], [x1, y, zt - uX.F / 2000]]); } }
      if (uY) { const o = grup(uY, poz(el, /^Üst Y/), el, 'Üst Y (mesnet)'), l = (y1 - y0) / 4 + 0.4; for (const x of adim(x0, x1, uY.s)) { o.bars.push([[x, y0, zt - 0.012 - uY.F / 2000], [x, y0 + l, zt - 0.012 - uY.F / 2000]]); o.bars.push([[x, y1 - l, zt - 0.012 - uY.F / 2000], [x, y1, zt - 0.012 - uY.F / 2000]]); } }
    });
    for (const o of out) o.bars = o.bars.map(b => b.map(q => q.map(v => Math.round(v * 1000) / 1000)));
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);

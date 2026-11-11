/* ArıtmaCAD Statik — ara döşemeler tek kalınlık (ayrı modül)
   Modelden gelen ara döşemeler (S.cer.dosemeler; hazne üst döşemesi hariç) en kalın olanın kalınlığıyla hesaplanır.
   Modelde de aynı eşitleme yapılır (ArıtmaCAD: proje açılışı / kalınlık yansıtma). */
(function () {
  'use strict';
  const P = window.STATIK; if (!P || !P.hesapla) return;
  const esitle = S => {
    const cer = S && S.cer, D = cer && cer.dosemeler; if (!D || D.length < 2) return false;
    const ust = new Set([...((S.geo && S.geo.doseme) || []), ...(S.mod === 'kabuk' && S.kabuk ? S.kabuk.dosemeler || [] : [])].map(d => d.id).filter(x => x != null));
    const g = S.geo || {}, zU = g.kUst != null ? +g.kUst : Infinity, zA = g.kAlt != null ? +g.kAlt : -Infinity;
    const ara = D.filter(d => !ust.has(d.id) && d.zt < zU - 0.3 && d.zt > zA + 0.3); if (ara.length < 2) return false; // yalnız hazne içindeki ara döşemeler (çatı / zemin döşemesi hariç)
    const tMax = Math.max(...ara.map(d => +d.t || 0.15)); let ch = false;
    ara.forEach(d => { if (tMax - (+d.t || 0.15) > 0.004) { d.t0 = d.t0 || d.t; d.t = tMax; ch = true; } });
    return ch;
  };
  P.araDosemeEsitle = esitle;
  const h0 = P.hesapla; P.hesapla = function (S, ...a) { try { esitle(S); } catch (e) { console.error(e); } return h0.call(this, S, ...a); };
})();

/* Ara döşeme üstündeki (askı) perde → perde-kiriş: uçlarındaki perdelere ve altındaki kolonlara oturur.
   Perde ağırlığı ve döşeme kenar yükü kolonlara / perdelere aktarılır; kolonlar adsızsa S1, S2… adlandırılır.
   Su itkisi (yatay) askı perdenin kısa perde hesabındadır. */
(function () {
  'use strict';
  const P = window.STATIK; if (!P || !P.cerceveHesap) return;
  const r3 = v => Math.round(v * 1000) / 1000;
  const c0 = P.cerceveHesap;
  P.cerceveHesap = function (S, ...a) {
    const cer = S && S.cer; if (!cer) return c0.call(this, S, ...a);
    // kolon adları
    const K = cer.kolonlar || []; if (K.some(c => !c.no)) { let n = Math.max(0, ...K.map(c => +(String(c.no || '').match(/^S(\d+)$/) || [0, 0])[1])); K.slice().sort((p, q) => (q.y - p.y) || (p.x - q.x)).forEach(c => { if (!c.no) c.no = 'S' + (++n); }); }
    const D = cer.dosemeler || [], W = cer.perdeler || [], ek = [];
    const gg = S.geo || {}, zUh = gg.kUst != null ? +gg.kUst : Infinity; // yalnız hazne içindeki ara döşemeler (çatı parapeti askı perde değildir)
    W.forEach((w, i) => {
      const d = D.find(d => { if (Math.abs(w.z0 - d.zt) > 0.2 || !(d.zt < zUh - 0.3) || w.zt - w.z0 < 1.5) return false; const xs = d.pts.map(p => p[0]), ys = d.pts.map(p => p[1]); return [w.a, w.b].every(q => q[0] > Math.min(...xs) - 0.6 && q[0] < Math.max(...xs) + 0.6 && q[1] > Math.min(...ys) - 0.6 && q[1] < Math.max(...ys) + 0.6); });
      if (!d || !(w.zt > w.z0 + 0.3)) return;
      const ko = S.koken || [0, 0], X = Math.abs(w.a[1] - w.b[1]) < 0.02, kp = ((S.geo && S.geo.kisaPerde) || []).find(k => k.aski && k.yon === (X ? 'X' : 'Y') && Math.abs(k.v + (X ? ko[1] : ko[0]) - (X ? w.a[1] : w.a[0])) < Math.max(0.3, w.t / 2 + 0.05));
      const ad = w.no || (kp && kp.ad) || 'Askı perde';
      ek.push({ id: 'AP' + i, no: ad + ' (perde-kiriş)', a: w.a.slice(), b: w.b.slice(), bw: w.t, hb: r3(w.zt - d.zt + d.t), zt: d.zt, gd: 0, askiPerde: true });
    });
    const k0 = cer.kirisler, d0 = cer.dosemeler, KR = (k0 || []).concat(ek);
    // döşemeyi aynı kottaki kiriş akslarından gözlere böl (her göz ayrı plak; saçak şeridi kenar kirişine bağlı konsol göz)
    const hz = new Set([...((S.geo && S.geo.doseme) || []), ...(S.mod === 'kabuk' && S.kabuk ? S.kabuk.dosemeler || [] : [])].map(d => d.id).filter(x => x != null)), bol = [];
    let nBol = 0;
    for (const d of D) {
      const xs = d.pts.map(p => p[0]), ys = d.pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      let A = 0; for (let i = 0; i < d.pts.length; i++) { const p = d.pts[i], q = d.pts[(i + 1) % d.pts.length]; A += p[0] * q[1] - q[0] * p[1]; } A = Math.abs(A / 2);
      if (hz.has(d.id)) { bol.push(d); continue; } // hazne üst döşemesi: hazne hesabında
      const dik = A >= 0.95 * (x1 - x0) * (y1 - y0), icinde = (px, py) => { let c = false; for (let i = 0, j = d.pts.length - 1; i < d.pts.length; j = i++) { const a = d.pts[i], b = d.pts[j]; if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
      const cx = [], cy = [], hatX = new Map(), hatY = new Map(), anah = v => Math.round(v * 20) / 20; // aynı akstaki kiriş parçaları toplanır
      for (const k of KR) { if (k.zt > d.zt + 0.15 || k.zt < d.zt - (+d.t || 0.15) - 0.15) continue; /* kiriş üstü döşeme üstünde ya da döşeme kirişin üstüne oturuyor */ const X = Math.abs(k.a[1] - k.b[1]) < 0.02, Y = Math.abs(k.a[0] - k.b[0]) < 0.02;
        if (X) { const y = k.a[1], l = Math.max(0, Math.min(x1, Math.max(k.a[0], k.b[0])) - Math.max(x0, Math.min(k.a[0], k.b[0]))); if (y > y0 + 0.4 && y < y1 - 0.4) hatY.set(anah(y), (hatY.get(anah(y)) || 0) + l); }
        else if (Y) { const x = k.a[0], l = Math.max(0, Math.min(y1, Math.max(k.a[1], k.b[1])) - Math.max(y0, Math.min(k.a[1], k.b[1]))); if (x > x0 + 0.4 && x < x1 - 0.4) hatX.set(anah(x), (hatX.get(anah(x)) || 0) + l); } }
      hatY.forEach((l, y) => { if (l > 0.5 * (x1 - x0) - 0.6) cy.push(y); }); hatX.forEach((l, x) => { if (l > 0.5 * (y1 - y0) - 0.6) cx.push(x); });
      const tek = v => [...new Set(v.map(q => Math.round(q * 1000) / 1000))].sort((p, q) => p - q).filter((q, i, a) => !i || q - a[i - 1] > 0.3);
      const X = [x0, ...tek(cx), x1], Y = [y0, ...tek(cy), y1];
      if (X.length === 2 && Y.length === 2) { bol.push(d); continue; }
      // kenardaki dar şeritler (≤ 2 m, kenarında kiriş yok) saçak: boydan boya tek göz, köşeler bu şeride katılır
      const sY = j => (j === 0 || j === Y.length - 2) && Y.length > 2 && Y[j + 1] - Y[j] <= 2, sX = i => (i === 0 || i === X.length - 2) && X.length > 2 && X[i + 1] - X[i] <= 2;
      let k = 0; const gz = (a0, b0, a1, b1) => { if (!dik && !icinde((a0 + a1) / 2, (b0 + b1) / 2)) return; k++; /* dikdörtgen olmayan döşeme: dışta kalan göz atılır */ bol.push(Object.assign({}, d, { no: (d.no || 'D') + '-' + k, pts: [[a0, b0], [a1, b0], [a1, b1], [a0, b1]], ana: d.no })); };
      for (let j = 0; j + 1 < Y.length; j++) { if (sY(j)) { gz(X[0], Y[j], X[X.length - 1], Y[j + 1]); continue; } for (let i = 0; i + 1 < X.length; i++) gz(X[i], Y[j], X[i + 1], Y[j + 1]); }
      void sX;
      nBol++;
    }
    if (!ek.length && !nBol) return c0.call(this, S, ...a);
    cer.kirisler = KR; cer.dosemeler = bol;
    let RC; try { RC = c0.call(this, S, ...a); } finally { cer.kirisler = k0; cer.dosemeler = d0; }
    if (RC && RC.uyar && nBol) RC.uyar.push(`${nBol} döşeme kiriş akslarından gözlere bölünerek hesaplandı (göz adları: D4-1, D4-2 …; kiriş dışına taşan saçak şeritleri kenar kirişine bağlı konsol göz).`);
    if (!ek.length) return RC;
    if (RC && RC.uyar) {
      RC.uyar = RC.uyar.filter(u => !/AKTARILMIYOR/.test(u));
      RC.uyar.push(`Ara döşeme üstündeki ${ek.length} askı perde perde-kiriş olarak hesaba katıldı (${ek.map(k => k.no.replace(' (perde-kiriş)', '') + ' ' + Math.round(k.bw * 100) + '/' + Math.round(k.hb * 100)).join(', ')}): perde ağırlığı ve döşeme kenar yükü uçlarındaki perdelere ve altındaki kolonlara aktarıldı. Derin kiriş (h/L büyük) — boyuna donatı yaklaşık; perdeye gelen su itkisi kısa perde hesabındadır.`);
    }
    return RC;
  };
})();

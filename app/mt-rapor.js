/* ArıtmaCAD — MEKANİK TESİSAT · RAPOR (ısı yalıtımı + ısı kaybı)
   MT.rapor('hepsi' | 'yalitim' | 'kayip') → yazdırılabilir HTML (PDF / Word). Grafikler SVG olarak rapora gömülür:
   U değeri – sınır karşılaştırması, kesitte sıcaklık dağılımı, Glaser yoğuşma diyagramı, aylık su birikimi, aylık enerji dengesi,
   kat planı ısı haritası (W/m²) ve dış yüzeylerden ısı akışı okları, mahal ısı kayıpları, kaybın bileşenlere dağılımı. */
(function (C) {
  'use strict';
  const M = C.M, V = C.MTV, MT = C.MT;
  const f = (v, d = 2) => (isFinite(v) ? (+v).toFixed(d) : '—').replace('.', ',');
  const fi = v => isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—';
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  /* renkler: kategorik sıra sabit; sıralı (tek ton mavi); durum renkleri yalnız uygun / uygun değil için */
  const K = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'], SEQ = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];
  const INK = '#0b0b0b', INK2 = '#52514e', MUT = '#898781', GRID = '#e1e0d9', AX = '#c3c2b7', OK = '#0ca30c', BAD = '#d03b3b';
  const seq = t => SEQ[Math.max(0, Math.min(SEQ.length - 1, Math.floor(t * SEQ.length - 1e-9)))];
  /* sıcaklık rengi: soğuk (mavi) – nötr gri – sıcak (turuncu) */
  const lerpC = (a, b, t) => { const h = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)), A = h(a), B = h(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const tRenk = (T, t0, t1) => { const u = Math.max(0, Math.min(1, (T - t0) / ((t1 - t0) || 1))); return u < 0.5 ? lerpC('#256abf', '#f0efec', u * 2) : lerpC('#f0efec', '#eb6834', (u - 0.5) * 2); };
  const svg = (w, h, body, cls = '') => `<svg class="ch ${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Arial, sans-serif" font-size="11">${body}</svg>`;
  const nice = v => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return ([1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find(q => n <= q + 1e-9) || 10) * p; };
  const yAxis = (x0, x1, y0, y1, max, unit, n = 4) => { let s = ''; for (let i = 0; i <= n; i++) { const v = max * i / n, y = y0 - (y0 - y1) * i / n; s += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${i ? GRID : AX}" stroke-width="1"/><text x="${x0 - 6}" y="${y + 4}" text-anchor="end" fill="${MUT}">${fi(v)}</text>`; } return s + `<text x="${x0 - 6}" y="${y1 - 10}" text-anchor="end" fill="${MUT}">${unit}</text>`; };
  const lejant = (x, y, items) => items.map((it, i) => `<rect x="${x + i * 150}" y="${y - 9}" width="10" height="10" rx="2" fill="${it[1]}"/><text x="${x + i * 150 + 15}" y="${y}" fill="${INK2}">${esc(it[0])}</text>`).join('');

  /* ---------- U değeri – sınır (yatay çubuk + sınır çizgisi) ---------- */
  const uGrafik = el => {
    const rows = el.filter(g => g.lim != null), W = 700, rh = 30, x0 = 250, x1 = 600, H = rows.length * rh + 34, mx = Math.max(...rows.map(g => Math.max(g.U, g.lim))) * 1.15 || 1; let s = '';
    rows.forEach((g, i) => { const y = 14 + i * rh, w = (x1 - x0) * g.U / mx, xl = x0 + (x1 - x0) * g.lim / mx; s += `<text x="${x0 - 8}" y="${y + 14}" text-anchor="end" fill="${INK}">${esc(MT.KATAD[g.kat])}${g.yon ? ' (' + g.yon + ')' : ''}</text><path d="M${x0} ${y + 3}h${Math.max(2, w - 4)}a4 4 0 0 1 4 4v6a4 4 0 0 1 -4 4h-${Math.max(2, w - 4)}z" fill="${K[0]}"><title>${esc(g.ad)}: U = ${f(g.U, 3)} W/m²K, sınır ${f(g.lim, 2)}</title></path><line x1="${xl}" y1="${y - 1}" x2="${xl}" y2="${y + 21}" stroke="${INK}" stroke-width="2"/><text x="${Math.max(x0 + w, xl) + 8}" y="${y + 14}" fill="${INK}">U = ${f(g.U, 3)} · sınır ${f(g.lim, 2)} ${g.uygun ? '✓ uygun' : '✗ aşıyor'}</text>`; });
    s += `<line x1="${x0}" y1="8" x2="${x0}" y2="${H - 22}" stroke="${AX}"/><text x="${x0}" y="${H - 6}" fill="${MUT}">0</text><text x="${x1}" y="${H - 6}" text-anchor="end" fill="${MUT}">${f(mx, 2)} W/m²K</text><line x1="${x0 + 40}" y1="${H - 13}" x2="${x0 + 40}" y2="${H - 3}" stroke="${INK}" stroke-width="2"/><text x="${x0 + 46}" y="${H - 5}" fill="${INK2}">TS 825:2024 tavsiye edilen en büyük U</text>`;
    return svg(W + 160, H, s);
  };
  /* ---------- kesitte sıcaklık dağılımı ---------- */
  const kesitGrafik = (pr, baslik) => {
    const u = pr.u, tot = u.kat.reduce((s, k) => s + k.d, 0) || 0.01, W = 700, H = 250, x0 = 90, x1 = 610, yT = 34, yB = 170, sc = (x1 - x0) / tot, t0 = Math.min(pr.te, pr.ti), t1 = Math.max(pr.te, pr.ti), ty = T => yB - 8 - (yB - yT - 16) * (T - t0) / ((t1 - t0) || 1);
    let s = `<defs>`, body = '', x = x0; const pts = [[x0 - 40, ty(pr.ti)], [x0 - 6, ty(pr.ti)]];
    u.kat.forEach((k, i) => { const w = Math.max(1.5, k.d * sc), id = 'g' + Math.random().toString(36).slice(2, 8); s += `<linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${tRenk(pr.T[i], t0, t1)}"/><stop offset="1" stop-color="${tRenk(pr.T[i + 1], t0, t1)}"/></linearGradient>`; body += `<rect x="${x}" y="${yT}" width="${w}" height="${yB - yT}" fill="url(#${id})" stroke="#fcfcfb" stroke-width="1"><title>${esc(k.ad)} — ${f(k.d * 100, 1)} cm, λ=${f(k.lam, 3)}, R=${f(k.R, 3)}</title></rect>`; if (w > 26) body += `<text x="${x + w / 2}" y="${yB + 14}" text-anchor="middle" fill="${INK2}">${i + 1}</text>`; pts.push([x, ty(pr.T[i])]); x += w; });
    pts.push([x, ty(pr.T[pr.T.length - 1])], [x + 6, ty(pr.te)], [x + 40, ty(pr.te)]);
    body += `<polyline points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${INK}" stroke-width="2"/>` + pr.T.map((T, i) => { const px = pts[i + 2][0], py = pts[i + 2][1], son = i === pr.T.length - 1, xs = pts[pr.T.length + 1][0]; return (i === 0 || son || (Math.abs(T - pr.T[i - 1]) > 1.5 && xs - px > 46 && px - pts[2][0] > 46)) ? `<circle cx="${px}" cy="${py}" r="4" fill="${INK}" stroke="#fcfcfb" stroke-width="2"/><text x="${px + (i === 0 ? -6 : 8)}" y="${py + (son ? -10 : -8)}" text-anchor="${i === 0 ? 'end' : 'start'}" fill="${INK}">${f(T, 1)}°</text>` : ''; }).join('');
    body += `<text x="${x0 - 44}" y="${yT - 10}" fill="${INK}" font-weight="600">İÇ ${f(pr.ti, 0)} °C</text><text x="${x + 44}" y="${yT - 10}" text-anchor="end" fill="${INK}" font-weight="600">DIŞ ${f(pr.te, 0)} °C</text>`;
    const lx = x0, ly = 216; for (let i = 0; i < 40; i++) body += `<rect x="${lx + i * 5}" y="${ly}" width="5.2" height="9" fill="${tRenk(t0 + (t1 - t0) * (39 - i) / 39, t0, t1)}"/>`;
    body += `<text x="${lx - 6}" y="${ly + 9}" text-anchor="end" fill="${MUT}">sıcak</text><text x="${lx + 206}" y="${ly + 9}" fill="${MUT}">soğuk</text><text x="${lx + 270}" y="${ly + 9}" fill="${INK2}">İç yüzey ${f(pr.Tyi, 1)} °C · dış yüzey ${f(pr.Tyd, 1)} °C · ısı akısı q = ${f(pr.q, 1)} W/m²</text><text x="${x0}" y="${yB + 30}" fill="${MUT}">katman numaraları tablodaki sıradadır (içten dışa)</text>`;
    return `<figure><figcaption>${esc(baslik)}</figcaption>${svg(W, H, s + '</defs>' + body)}</figure>`;
  };
  /* ---------- Glaser diyagramı ---------- */
  const glaserGrafik = (pr, baslik) => {
    const W = 700, H = 240, x0 = 70, x1 = 660, y0 = 190, y1 = 26, sdT = pr.sdT || 1, pm = nice(Math.max(...pr.ps, pr.pi) * 1.05), X = s => x0 + (x1 - x0) * s / sdT, Y = p => y0 - (y0 - y1) * p / pm;
    const ps = []; pr.u.kat.forEach((k, i) => { for (let j = 0; j <= 8; j++) { const t = j / 8; ps.push([X(pr.sd[i] + (pr.sd[i + 1] - pr.sd[i]) * t), Y(MT.psat(pr.T[i] + (pr.T[i + 1] - pr.T[i]) * t))]); } });
    let b = yAxis(x0, x1, y0, y1, pm, 'Pa');
    pr.sd.forEach((s, i) => { if (i && i < pr.sd.length - 1) b += `<line x1="${X(s)}" y1="${y1}" x2="${X(s)}" y2="${y0}" stroke="${GRID}" stroke-dasharray="3 3"/>`; });
    b += `<polyline points="${ps.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${K[0]}" stroke-width="2"/><line x1="${X(0)}" y1="${Y(pr.pi)}" x2="${X(sdT)}" y2="${Y(pr.pe)}" stroke="${K[1]}" stroke-width="2"/>`;
    if (pr.c > 0) b += `<circle cx="${X(pr.sd[pr.c])}" cy="${Y(pr.ps[pr.c])}" r="5" fill="${BAD}" stroke="#fcfcfb" stroke-width="2"/><text x="${X(pr.sd[pr.c]) + 8}" y="${Y(pr.ps[pr.c]) - 8}" fill="${INK}">yoğuşma düzlemi (${pr.c}. ve ${pr.c + 1}. katman arası)</text>`;
    b += `<text x="${x0}" y="${H - 22}" fill="${MUT}">iç</text><text x="${x1}" y="${H - 22}" text-anchor="end" fill="${MUT}">dış — difüzyon eşdeğer hava tabakası kalınlığı Σsd = ${f(sdT, 2)} m</text>` + lejant(x0, H - 4, [['Doyma basıncı psat', K[0]], ['Buhar basıncı p', K[1]]]);
    return `<figure><figcaption>${esc(baslik)}</figcaption>${svg(W, H, b)}</figure>`;
  };
  const birikimGrafik = r => {
    const W = 700, H = 170, x0 = 70, x1 = 660, y0 = 130, y1 = 22, mx = nice(Math.max(0.02, ...r.ay.map(a => a.Ma)) * 1.15), bw = (x1 - x0) / 12; let b = yAxis(x0, x1, y0, y1, mx * 1000, 'g/m²');
    r.ay.forEach((a, i) => { const h = (y0 - y1) * a.Ma / mx, x = x0 + i * bw + bw * 0.25; if (h > 0.5) b += `<path d="M${x} ${y0}v-${Math.max(0, h - 3)}a3 3 0 0 1 3 -3h${bw * 0.5 - 6}a3 3 0 0 1 3 3v${Math.max(0, h - 3)}z" fill="${K[0]}"><title>${V.AYLAR[i]}: ${f(a.Ma * 1000, 0)} g/m²</title></path>`; b += `<text x="${x + bw * 0.25}" y="${y0 + 14}" text-anchor="middle" fill="${MUT}">${V.AYLAR[i]}</text>`; });
    if (mx >= 1) { const yl = y0 - (y0 - y1) * 1.0 / mx; b += `<line x1="${x0}" y1="${yl}" x2="${x1}" y2="${yl}" stroke="${INK}" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${x1}" y="${yl - 5}" text-anchor="end" fill="${INK2}">sınır 1000 g/m²</text>`; } else b += `<text x="${x1}" y="${y1 - 8}" text-anchor="end" fill="${INK2}">izin verilen sınır 1000 g/m² (ölçeğin üstünde)</text>`;
    return `<figure><figcaption>Yapı elemanı içinde biriken su — ay sonu değerleri (en çok ${f(r.MaMax * 1000, 0)} g/m²; ${r.kurur ? 'yaz aylarında tamamen kuruyor' : 'yıl içinde kurumuyor'})</figcaption>${svg(W, H, b)}</figure>`;
  };
  /* ---------- aylık enerji dengesi ---------- */
  const aylikGrafik = t => {
    const W = 700, H = 250, x0 = 70, x1 = 670, y0 = 190, y1 = 26, mx = nice(Math.max(...t.ay.map(a => Math.max(a.kayip, a.ic + a.gunes))) * 1.05), bw = (x1 - x0) / 12, w = bw * 0.24; let b = yAxis(x0, x1, y0, y1, mx, 'kWh');
    const bar = (x, v, c, tt) => { const h = (y0 - y1) * v / mx; return h > 0.6 ? `<path d="M${x} ${y0}v-${Math.max(0, h - 3)}a3 3 0 0 1 3 -3h${w - 6}a3 3 0 0 1 3 3v${Math.max(0, h - 3)}z" fill="${c}"><title>${tt}: ${fi(v)} kWh</title></path>` : ''; };
    t.ay.forEach((a, i) => { const x = x0 + i * bw + bw * 0.1; b += bar(x, a.kayip, K[0], V.AYLAR[i] + ' ısı kaybı') + bar(x + w + 2, a.ic + a.gunes, K[1], V.AYLAR[i] + ' iç + güneş kazancı') + bar(x + 2 * w + 4, a.Q, K[2], V.AYLAR[i] + ' net ısıtma ihtiyacı') + `<text x="${x + bw * 0.4}" y="${y0 + 14}" text-anchor="middle" fill="${MUT}">${V.AYLAR[i]}</text><text x="${x + bw * 0.4}" y="${y0 + 28}" text-anchor="middle" fill="${MUT}">${f(a.te, 1)}°</text>`; });
    b += lejant(x0, H - 6, [['Isı kaybı H·(θi−θe)·t', K[0]], ['İç + güneş kazancı', K[1]], ['Net ısıtma ihtiyacı', K[2]]]);
    return `<figure><figcaption>Aylık enerji dengesi (kWh) — ay adlarının altında aylık ortalama dış sıcaklık</figcaption>${svg(W, H, b)}</figure>`;
  };
  /* ---------- yatay sıralı çubuklar (özgül ısı kaybı payları, kayıp bileşenleri) ---------- */
  const yatayGrafik = (rows, birim, baslik) => {
    rows = rows.filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]); const W = 700, rh = 26, x0 = 230, x1 = 560, H = rows.length * rh + 12, mx = Math.max(...rows.map(r => r[1])) || 1, top = rows.reduce((s, r) => s + r[1], 0) || 1; let b = '';
    rows.forEach((r, i) => { const y = 6 + i * rh, w = Math.max(5, (x1 - x0) * r[1] / mx); b += `<text x="${x0 - 8}" y="${y + 14}" text-anchor="end" fill="${INK}">${esc(r[0])}</text><path d="M${x0} ${y + 3}h${w - 4}a4 4 0 0 1 4 4v6a4 4 0 0 1 -4 4h-${w - 4}z" fill="${K[0]}"><title>${esc(r[0])}: ${fi(r[1])} ${birim}</title></path><text x="${x0 + w + 8}" y="${y + 14}" fill="${INK}">${fi(r[1])} ${birim} · %${f(100 * r[1] / top, 0)}</text>`; });
    return `<figure><figcaption>${esc(baslik)}</figcaption>${svg(W, H, `<line x1="${x0}" y1="2" x2="${x0}" y2="${H - 4}" stroke="${AX}"/>` + b)}</figure>`;
  };
  /* ---------- mahal ısı kayıpları (dikey çubuk) ---------- */
  const mahalGrafik = res => {
    const rs = res.filter(x => x.r.ti != null && x.r.Q > 0); if (!rs.length) return '';
    const W = Math.max(700, 60 + rs.length * 34), H = 240, x0 = 64, x1 = W - 14, y0 = 176, y1 = 24, mx = nice(Math.max(...rs.map(x => x.r.Q)) * 1.05), bw = (x1 - x0) / rs.length, w = Math.min(24, bw * 0.6); let b = yAxis(x0, x1, y0, y1, mx, 'W');
    rs.forEach((x, i) => { const h = (y0 - y1) * x.r.Q / mx, cx = x0 + i * bw + bw / 2; b += `<path d="M${cx - w / 2} ${y0}v-${Math.max(0, h - 4)}a4 4 0 0 1 4 -4h${w - 8}a4 4 0 0 1 4 4v${Math.max(0, h - 4)}z" fill="${K[0]}"><title>${esc(x.e.no + ' ' + x.e.ad)}: ${fi(x.r.Q)} W (${f(x.r.qA, 0)} W/m²)</title></path><text transform="translate(${cx + 4},${y0 + 10}) rotate(-55)" text-anchor="end" fill="${MUT}">${esc(x.e.no || x.e.ad)}</text>`; if (rs.length <= 14) b += `<text x="${cx}" y="${y0 - h - 5}" text-anchor="middle" fill="${INK}">${fi(x.r.Q)}</text>`; });
    return `<figure><figcaption>Mahallerin ısı kaybı Q (W)</figcaption>${svg(W, H, b)}</figure>`;
  };
  /* ---------- kat planı: ısı haritası + dış yüzeylerden ısı akışı ---------- */
  const planGrafik = (rs, baslik, m, qGlobal) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; rs.forEach(x => x.e.pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }));
    const pad = 2.3, bw = x1 - x0 + 2 * pad, bh = y1 - y0 + 2 * pad, W = 700, sc = Math.min(W / bw, 520 / bh), H = bh * sc + 56, X = x => (x - x0 + pad) * sc + (W - bw * sc) / 2, Y = y => (y1 - y + pad) * sc;
    const qs = rs.filter(x => x.r.ti != null).map(x => x.r.qA), qmx = qGlobal || nice(Math.max(1, ...qs)), wmx = Math.max(1, ...rs.flatMap(x => x.r.items.filter(o => o.dis && o._y).map(o => (o.Q + x.r.items.filter(p => (p.tur === 'PN' || p.tur === 'KP') && p.dis && p.yon === o.yon).reduce((s, p) => s + p.Q, 0) * (o.L / (x.r.items.filter(q => q.tur === 'DD' && q.yon === o.yon).reduce((s, q) => s + q.L, 0) || 1))) / (o.L || 1))));
    let b = `<defs><pattern id="tarama" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${AX}" stroke-width="1.5"/></pattern><marker id="okUc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${K[1]}"/></marker></defs>`;
    for (const { e, r } of rs) {
      const pts = e.pts.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' '), c = e.lp || MT.icNokta(e.pts), isit = r.ti != null;
      b += `<polygon points="${pts}" fill="${isit ? seq(r.qA / qmx) : 'url(#tarama)'}" stroke="#fcfcfb" stroke-width="2"><title>${esc(e.no + ' ' + e.ad)} — ${isit ? fi(r.Q) + ' W, ' + f(r.qA, 0) + ' W/m²' : 'ısıtılmıyor'}</title></polygon>`;
      const koyu = isit && r.qA / qmx > 0.5, tc = koyu ? '#ffffff' : INK, wr = Math.sqrt(r.A) * sc;
      if (wr > 44) b += `<text x="${X(c[0])}" y="${Y(c[1]) - 5}" text-anchor="middle" fill="${tc}" font-weight="600">${esc(e.no || '')}${wr > 110 ? ' ' + esc((e.ad || '').slice(0, 18)) : ''}</text><text x="${X(c[0])}" y="${Y(c[1]) + 9}" text-anchor="middle" fill="${tc}">${isit ? fi(r.Q) + ' W' : 'ısıtılmıyor'}</text>${isit && wr > 70 ? `<text x="${X(c[0])}" y="${Y(c[1]) + 22}" text-anchor="middle" fill="${tc}">${f(r.qA, 0)} W/m²</text>` : ''}`;
      /* pencere / kapı işaretleri ve ısı akışı okları */
      for (const o of r.items) {
        if (!o._y || !o.dis || !isit) continue; const y = o._y, ux = (y.b[0] - y.a[0]) / y.L, uy = (y.b[1] - y.a[1]) / y.L, ccw = M.polyArea(e.pts) > 0, nx = ccw ? uy : -uy, ny = ccw ? -ux : ux, off = (y.t || 0.2) / 2;
        const ac = r.items.filter(p => (p.tur === 'PN' || p.tur === 'KP') && p.dis && p.yon === o.yon), Ly = r.items.filter(q => q.tur === 'DD' && q.yon === o.yon).reduce((s, q) => s + q.L, 0) || 1, Qw = o.Q + ac.reduce((s, p) => s + p.Q, 0) * (y.L / Ly), wl = Qw / (y.L || 1), n = Math.max(1, Math.round(y.L / 2.2));
        for (let i = 0; i < n; i++) { const s = y.L * (i + 0.5) / n, px = y.a[0] + ux * s + nx * (off * 2 + 0.15), py = y.a[1] + uy * s + ny * (off * 2 + 0.15), len = 0.5 + 0.8 * wl / wmx; b += `<line x1="${X(px)}" y1="${Y(py)}" x2="${X(px + nx * len)}" y2="${Y(py + ny * len)}" stroke="${K[1]}" stroke-width="${(1.2 + 3 * wl / wmx).toFixed(1)}" marker-end="url(#okUc)"><title>${esc(e.no)} ${V.YON_AD[y.yon] || ''} cephe: ${fi(Qw)} W (${f(wl, 0)} W/m)</title></line>`; }
      }
    }
    /* pencereler: duvar üstünde kalın çizgi */
    const ins = C._ins, acId = new Set(rs.flatMap(x => (x.e.yuz || []).flatMap(y => (y.ac || []).map(a => a.id)))); if (ins) for (const o of C.doc.ents) { if (o.type !== 'acik' || o.kind === 'kapi' || !acId.has(o.id)) continue; const hf = ins.hostFrame(o); if (!hf) continue; const { sf } = hf, w = +o.w || 1, s0 = (+o.s || 0) - w / 2, s1 = (+o.s || 0) + w / 2, pa = [sf.a[0] + sf.u[0] * s0, sf.a[1] + sf.u[1] * s0], pb = [sf.a[0] + sf.u[0] * s1, sf.a[1] + sf.u[1] * s1]; if (pa[0] < x0 - 1 || pa[0] > x1 + 1 || pa[1] < y0 - 1 || pa[1] > y1 + 1) continue; b += `<line x1="${X(pa[0])}" y1="${Y(pa[1])}" x2="${X(pb[0])}" y2="${Y(pb[1])}" stroke="${K[2]}" stroke-width="4" stroke-linecap="round"><title>Pencere ${f(w, 2)} × ${f(+o.hh || 0, 2)} m</title></line>`; }
    /* kuzey oku ve lejant */
    const ka = m.kuzey * Math.PI / 180, kx = W - 34, ky = 34; b += `<g><line x1="${kx - 16 * Math.cos(ka)}" y1="${ky + 16 * Math.sin(ka)}" x2="${kx + 16 * Math.cos(ka)}" y2="${ky - 16 * Math.sin(ka)}" stroke="${INK}" stroke-width="2"/><circle cx="${kx + 16 * Math.cos(ka)}" cy="${ky - 16 * Math.sin(ka)}" r="3.5" fill="${INK}"/><text x="${kx + 26 * Math.cos(ka)}" y="${ky - 26 * Math.sin(ka) + 4}" text-anchor="middle" fill="${INK}" font-weight="600">K</text></g>`;
    const ly = H - 26; SEQ.forEach((c, i) => { b += `<rect x="${20 + i * 34}" y="${ly}" width="32" height="10" fill="${c}"/>`; }); b += `<text x="20" y="${ly + 23}" fill="${MUT}">0</text><text x="${20 + SEQ.length * 34}" y="${ly + 23}" text-anchor="end" fill="${MUT}">${fi(qmx)} W/m²</text><rect x="290" y="${ly}" width="14" height="10" fill="url(#tarama)" stroke="${AX}"/><text x="309" y="${ly + 9}" fill="${INK2}">ısıtılmayan</text><line x1="400" y1="${ly + 5}" x2="424" y2="${ly + 5}" stroke="${K[1]}" stroke-width="3" marker-end="url(#okUc)"/><text x="432" y="${ly + 9}" fill="${INK2}">dış cepheden ısı akışı (kalınlık ∝ W/m)</text><line x1="400" y1="${ly + 20}" x2="424" y2="${ly + 20}" stroke="${K[2]}" stroke-width="4" stroke-linecap="round"/><text x="432" y="${ly + 24}" fill="${INK2}">pencere</text>`;
    return `<figure><figcaption>${esc(baslik)}</figcaption>${svg(W, H, b)}</figure>`;
  };
  MT._grafik = { uGrafik, kesitGrafik, glaserGrafik, aylikGrafik, planGrafik, mahalGrafik };

  /* ====================================================================
     RAPOR
     ==================================================================== */
  const CSS = `*{box-sizing:border-box}body{font:13px/1.5 "Segoe UI",Arial,sans-serif;color:#0b0b0b;background:#f9f9f7;margin:0}main{max-width:900px;margin:0 auto;background:#fcfcfb;padding:28px 36px}
h1{font-size:22px;margin:0 0 2px}h2{font-size:17px;margin:30px 0 8px;padding-bottom:4px;border-bottom:2px solid #0b0b0b}h3{font-size:14px;margin:20px 0 6px}p{margin:6px 0}.mut{color:#52514e}
table{border-collapse:collapse;width:100%;margin:8px 0 12px;font-size:12px}th,td{border:1px solid #c3c2b7;padding:3px 7px;text-align:left;vertical-align:top}th{background:#f0efec;font-weight:600}td.n,th.n{text-align:right;white-space:nowrap}tr.top td{font-weight:600;background:#f0efec}
figure{margin:12px 0 16px;break-inside:avoid}figcaption{font-weight:600;font-size:12.5px;margin-bottom:4px}svg.ch{max-width:100%;height:auto;display:block}
.kart{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0}.kart div{border:1px solid #c3c2b7;border-radius:8px;padding:9px 12px}.kart b{display:block;font-size:19px}.kart span{color:#52514e;font-size:11.5px}
.ok{color:#006300;font-weight:600}.bad{color:#b02a2a;font-weight:600}.not{border-left:3px solid #eda100;background:#fdf6e3;padding:7px 12px;margin:10px 0;font-size:12px}.mahal{break-inside:avoid}
.np{position:sticky;top:0;background:#0b0b0b;color:#fff;padding:8px 16px;display:flex;gap:8px;align-items:center;z-index:5}.np button{font:inherit;padding:5px 14px;border-radius:6px;border:0;cursor:pointer}.np span{flex:1}
@media print{.np{display:none}body{background:#fff}main{padding:0;max-width:none}h2{break-after:avoid}}`;
  const durum = ok => ok ? '<span class="ok">✓ uygun</span>' : '<span class="bad">✗ uygun değil</span>';

  const bolumProje = (m, hes) => `<h2>1. Proje bilgileri ve kabuller</h2><table>
<tr><th>Proje</th><td>${esc(C.doc.set.name || 'Adsız')}</td><th>Bina türü</th><td>${esc((V.BINA[m.bina] || V.BINA[2])[0])}</td></tr>
<tr><th>İl</th><td>${esc(m.il)}</td><th>TS 825:2024 derece gün bölgesi</th><td>${m.bolge}. bölge — ${V.BOLGE_AD[m.bolge]}</td></tr>
<tr><th>Kış dış hesap sıcaklığı</th><td>${f(m.td, 0)} °C</td><th>İşletme durumu</th><td>${esc(V.ISLETME[m.isletme])}</td></tr>
<tr><th>Toprak sıcaklığı</th><td>${f(m.tToprak, 0)} °C</td><th>Isıtılmayan hacim sıcaklığı</th><td>${f(m.tIsitilmayan, 0)} °C</td></tr>
<tr><th>Bina konumu</th><td>${esc(V.KONUM[m.konum])}, ${m.nizam === 'bitisik' ? 'bitişik nizam' : 'ayrık nizam'}, ${m.ruzgar === 'ruzgarli' ? 'rüzgârlı bölge' : 'normal bölge'}</td><th>Isıtılan mahal / toplam alan</th><td>${hes.res.filter(x => x.r.ti != null).length} mahal · ${f(hes.A, 1)} m² · ${f(hes.Vol, 1)} m³</td></tr></table>`;

  const bolumYapi = (m, t, hes) => {
    let s = `<h2>2. Yapı elemanları ve ısıl geçirgenlik katsayıları (U)</h2><p class="mut">U = 1 / (R<sub>si</sub> + Σ d/λ + R<sub>se</sub>) — TS EN ISO 6946. Katmanlar içten dışa sıralıdır. Sınır değerler TS 825:2024 ${m.bolge}. bölge${t.camOran >= 0.6 ? ' (cam oranı ≥ %60: sıkılaştırılmış değerler)' : ''} tavsiye değerleridir.</p>${uGrafik(t.el)}`;
    const gor = new Set();
    for (const g of t.el) {
      const kk = g.key + '|' + (g.tCore || ''); if (gor.has(kk)) continue; gor.add(kk); const y0 = m.yapi[g.key]; if (!y0) continue;
      s += `<h3>${esc(g.ad)}${g.tCore ? ` — taşıyıcı / dolgu kalınlığı ${f(g.tCore * 100, 0)} cm (modelden)` : ''}</h3>`;
      if (y0.tur === 'pencere' || y0.tur === 'kapi') { s += `<table><tr><th>U (W/m²K)</th><th>Güneş geçirgenliği g</th><th>Sızdırganlık a (m³/h·m)</th><th>Sınır U</th><th>Durum</th></tr><tr><td>${f(y0.U, 2)}</td><td>${y0.g != null ? f(y0.g, 2) : '—'}</td><td>${f(y0.a || 0, 1)}</td><td>${g.lim != null ? f(g.lim, 2) : '—'}</td><td>${g.lim != null ? durum(g.uygun) : '—'}</td></tr></table>`; continue; }
      const malz = Object.keys({ beton: 1, tugla: 1, gazbeton: 1, briket: 1 }).find(k => (y0.kat || []).some(q => q.m === k)), y = Object.assign({}, y0, { _malz: malz }), u = MT.U(y, g.tCore);
      s += `<table><tr><th>#</th><th>Katman</th><th class="n">d (cm)</th><th class="n">λ (W/mK)</th><th class="n">R (m²K/W)</th><th class="n">μ</th><th class="n">s<sub>d</sub> (m)</th></tr><tr><td></td><td>İç yüzey direnci R<sub>si</sub></td><td></td><td></td><td class="n">${f(u.Rsi, 2)}</td><td></td><td></td></tr>${u.kat.map((k, i) => `<tr><td>${i + 1}</td><td>${esc(k.ad)}</td><td class="n">${f(k.d * 100, k.d < 0.001 ? 2 : 1)}</td><td class="n">${f(k.lam, 3)}</td><td class="n">${f(k.R, 3)}</td><td class="n">${fi(k.mu)}</td><td class="n">${f(k.sd, 2)}</td></tr>`).join('')}<tr><td></td><td>Dış yüzey direnci R<sub>se</sub></td><td></td><td></td><td class="n">${f(u.Rse, 2)}</td><td></td><td></td></tr><tr class="top"><td></td><td>Toplam — U = ${f(u.U, 3)} W/m²K${g.lim != null ? ` · sınır ${f(g.lim, 2)} · ${durum(g.uygun)}` : ''}</td><td class="n">${f(u.kat.reduce((a, k) => a + k.d, 0) * 100, 1)}</td><td></td><td class="n">${f(u.R, 3)}</td><td></td><td class="n">${f(u.kat.reduce((a, k) => a + k.sd, 0), 2)}</td></tr></table>`;
      if (['DD', 'TV', 'DT'].includes(g.kat)) {
        s += kesitGrafik(MT.profil(y, g.tCore, 20, m.td, m.rhIc / 100, m.rhDis / 100), `Kesitte sıcaklık dağılımı — kış hesap koşulu (iç 20 °C, dış ${f(m.td, 0)} °C)`);
        const yg = t.yog.find(x => x.g === g || (x.g.key === g.key && x.g.tCore === g.tCore));
        if (yg) { const r = yg.r; s += glaserGrafik(r.kis, `Yoğuşma denetimi (Glaser) — en soğuk ay ortalaması ${f(r.kis.te, 1)} °C, iç ${f(r.ti, 0)} °C / %${m.rhIc} bağıl nem, dış %${m.rhDis}`); s += `<p>${r.var ? `Kış aylarında ${r.c}. ve ${r.c + 1}. katman arasında yoğuşma oluşuyor; en büyük birikim <b>${f(r.MaMax * 1000, 0)} g/m²</b> (sınır 1000 g/m²), ${r.kurur ? 'yaz aylarında tamamen buharlaşıyor' : '<b>yıl içinde kurumuyor</b>'} — ${durum(r.uygun)}.` : `Hiçbir ayda buhar basıncı doyma basıncını aşmıyor; yapı elemanında yoğuşma olmuyor — ${durum(true)}.`}</p>`; if (r.var) s += birikimGrafik(r); }
      }
    }
    return s;
  };
  const bolum825 = (m, t) => {
    const rows = t.el.slice().sort((a, b) => b.UA - a.UA);
    return `<h2>3. Bina özgül ısı kaybı ve yıllık ısıtma enerjisi (TS 825)</h2>
<div class="kart"><div><b>${f(t.Atop, 0)} m²</b><span>Isı kaybeden kabuk alanı A<sub>top</sub></span></div><div><b>${f(t.Vbrut, 0)} m³</b><span>Brüt hacim V<sub>brüt</sub> · A/V = ${f(t.AV, 2)}</span></div><div><b>${f(t.H, 0)} W/K</b><span>Özgül ısı kaybı H = H<sub>ilet</sub> + H<sub>hav</sub></span></div><div><b>${f(t.qYil, 0)} kWh/m²·yıl</b><span>Yıllık net ısıtma enerjisi (A<sub>n</sub> = ${f(t.An, 0)} m²)</span></div></div>
<table><tr><th>Yapı elemanı</th><th>Yön</th><th class="n">A (m²)</th><th class="n">U (W/m²K)</th><th class="n">Katsayı</th><th class="n">U·A (W/K)</th><th class="n">Sınır U</th><th>Durum</th></tr>${rows.map(g => `<tr><td>${esc(g.ad)}</td><td>${g.yon || '—'}</td><td class="n">${f(g.A, 1)}</td><td class="n">${f(g.U, 3)}</td><td class="n">${f(g.carp, 1)}</td><td class="n">${f(g.UA, 1)}</td><td class="n">${g.lim != null ? f(g.lim, 2) : '—'}</td><td>${g.lim != null ? durum(g.uygun) : '—'}</td></tr>`).join('')}
<tr><td>Isı köprüleri (ΔU = ${f(m.kopru, 2)} W/m²K × A<sub>top</sub>)</td><td></td><td class="n">${f(t.Atop, 1)}</td><td class="n">${f(m.kopru, 2)}</td><td></td><td class="n">${f(t.Hkop, 1)}</td><td></td><td></td></tr>
<tr class="top"><td colspan="5">İletim yoluyla özgül ısı kaybı H<sub>ilet</sub></td><td class="n">${f(t.Hil, 1)}</td><td colspan="2"></td></tr><tr><td colspan="5">Havalandırma H<sub>hav</sub> = 0,33 · n<sub>h</sub> · V<sub>h</sub> (n<sub>h</sub> = ${f(m.nh, 1)} h⁻¹, V<sub>h</sub> = 0,8·V<sub>brüt</sub> = ${f(t.Vh, 0)} m³)</td><td class="n">${f(t.Hv, 1)}</td><td colspan="2"></td></tr><tr class="top"><td colspan="5">Toplam özgül ısı kaybı H</td><td class="n">${f(t.H, 1)}</td><td colspan="2"></td></tr></table>
${yatayGrafik(rows.map(g => [MT.KATAD[g.kat] + (g.yon ? ' (' + g.yon + ')' : ''), g.UA]).reduce((a, r) => { const x = a.find(q => q[0] === r[0]); if (x) x[1] += r[1]; else a.push(r.slice()); return a; }, []).concat([['Isı köprüleri', t.Hkop], ['Havalandırma', t.Hv]]), 'W/K', 'Özgül ısı kaybının dağılımı (W/K)')}
<p class="mut">Aylık yöntem: Q<sub>ay</sub> = [H·(θ<sub>i</sub> − θ<sub>e</sub>) − η·(φ<sub>i</sub> + φ<sub>s</sub>)]·t ; η = 1 − e<sup>−1/KKO</sup> ; KKO = (φ<sub>i</sub> + φ<sub>s</sub>) / [H·(θ<sub>i</sub> − θ<sub>e</sub>)]. İç sıcaklık θ<sub>i</sub> = ${t.ti} °C, iç kazanç ${t.qi} W/m² (φ<sub>i</sub> = ${fi(t.fi)} W), A<sub>n</sub> = 0,32·V<sub>brüt</sub>.</p>
${aylikGrafik(t)}
<table><tr><th>Ay</th>${V.AYLAR.map(a => `<th class="n">${a}</th>`).join('')}<th class="n">Yıl</th></tr><tr><td>θ<sub>e</sub> (°C)</td>${t.ay.map(a => `<td class="n">${f(a.te, 1)}</td>`).join('')}<td></td></tr><tr><td>Isı kaybı (kWh)</td>${t.ay.map(a => `<td class="n">${fi(a.kayip)}</td>`).join('')}<td class="n">${fi(t.ay.reduce((s, a) => s + a.kayip, 0))}</td></tr><tr><td>Kazançlar (kWh)</td>${t.ay.map(a => `<td class="n">${fi(a.ic + a.gunes)}</td>`).join('')}<td class="n">${fi(t.ay.reduce((s, a) => s + a.ic + a.gunes, 0))}</td></tr><tr><td>η</td>${t.ay.map(a => `<td class="n">${f(a.eta, 2)}</td>`).join('')}<td></td></tr><tr class="top"><td>Net ısıtma (kWh)</td>${t.ay.map(a => `<td class="n">${fi(a.Q)}</td>`).join('')}<td class="n">${fi(t.Qyil)}</td></tr></table>
<p>Yıllık net ısıtma enerjisi ihtiyacı <b>${fi(t.Qyil)} kWh/yıl</b> → <b>${f(t.qYil, 1)} kWh/m²·yıl</b>. TS 825:2024'ün "${esc(t.bina)}" için ${m.bolge}. bölgede izin verdiği yıllık net <u>ısıtma + soğutma</u> enerjisi toplamı ${t.sinir} kWh/m²·yıl.</p>
<div class="not"><b>Ön değerlendirme:</b> U değeri ve yoğuşma denetimleri TS 825:2024 değerleriyle yapılmıştır. Yıllık enerji hesabında aylık dış sıcaklık ve güneş ışınımı için standardın bölgesel tabloları kullanılmıştır; TS 825:2024'ün il bazlı iklim verileri ve soğutma enerjisi hesabı bu aşamada dahil değildir. Resmî ısı yalıtım raporunda enerji sınırı karşılaştırması, soğutma (ısı kazancı) hesabı eklendikten sonra kesinleşir.</div>`;
  };
  const bolumMahal = (m, hes) => {
    const katlar = [...new Set(hes.res.map(x => +x.e.z0 || 0))].sort((a, b) => a - b); let s = `<h2>4. Mahal listesi ve kat planları</h2>`;
    const qG = nice(Math.max(1, ...hes.res.filter(x => x.r.ti != null).map(x => x.r.qA)));
    for (const z of katlar) { const rs = hes.res.filter(x => (+x.e.z0 || 0) === z), kt = Object.values(m.katlar || {}).find(k => Math.abs((k.z || 0) - z) < 1e-6); s += planGrafik(rs, `${kt ? kt.ad : 'Kat'} (kot ${f(z, 2)}) — ısı kaybı yoğunluğu (W/m²) ve dış cephelerden ısı akışı`, m, qG); }
    s += `<table><tr><th>No</th><th>Mahal</th><th>Tip</th><th class="n">Alan (m²)</th><th class="n">h (m)</th><th class="n">Hacim (m³)</th><th class="n">t<sub>i</sub> (°C)</th><th class="n">Q (W)</th><th class="n">W/m²</th><th class="n">W/m³</th></tr>${hes.res.map(({ e, r }) => `<tr><td>${esc(e.no)}</td><td>${esc(e.ad)}</td><td>${esc((V.MAHAL[e.tip || 0] || [''])[0])}</td><td class="n">${f(r.A, 2)}</td><td class="n">${f(+e.h, 2)}</td><td class="n">${f(r.V, 1)}</td><td class="n">${r.ti == null ? '—' : f(r.ti, 0)}</td><td class="n">${r.ti == null ? '—' : fi(r.Q)}</td><td class="n">${r.ti == null ? '—' : f(r.qA, 0)}</td><td class="n">${r.ti == null ? '—' : f(r.qV, 1)}</td></tr>`).join('')}<tr class="top"><td colspan="3">Toplam (ısıtılan)</td><td class="n">${f(hes.A, 2)}</td><td></td><td class="n">${f(hes.Vol, 1)}</td><td></td><td class="n">${fi(hes.Q)}</td><td class="n">${f(hes.A ? hes.Q / hes.A : 0, 0)}</td><td class="n">${f(hes.Vol ? hes.Q / hes.Vol : 0, 1)}</td></tr></table>`;
    return s;
  };
  const TUR = { DD: 'Dış duvar', ID: 'İç duvar', PN: 'Pencere', KP: 'Kapı', TB: 'Taban', TV: 'Tavan', AD: 'Döşeme' };
  const bolumKayip = (m, hes) => {
    const Hk = ((V.HKAT[m.ruzgar] || V.HKAT.normal)[m.konum] || V.HKAT.normal.serbest)[m.nizam === 'bitisik' ? 0 : 1];
    let s = `<h2>5. Isı kaybı hesabı (TS 2164 / MMO Kalorifer Tesisatı)</h2><p class="mut">Q<sub>h</sub> = Q<sub>0</sub>·(1 + Z<sub>D</sub> + Z<sub>H</sub>) + Q<sub>s</sub> ; Q<sub>0</sub> = Σ U·A·(t<sub>i</sub> − t<sub>komşu</sub>) ; Q<sub>s</sub> = Σ(a·l)·R·H·(t<sub>i</sub> − t<sub>d</sub>)·Z<sub>e</sub>. Birleştirilmiş artırım Z<sub>D</sub>, D = Q<sub>0</sub> / [A<sub>top</sub>·(t<sub>i</sub> − t<sub>d</sub>)] değerine ve işletme durumuna göre; yön artırımı Z<sub>H</sub> dış duvar yönüne göre alınmıştır. Sızıntıda oda durum katsayısı R = 0,9, bina durum katsayısı H = ${f(Hk, 2)}, köşe pencerelerde Z<sub>e</sub> = 1,2. Alanlar iç ölçülerle, duvar yüksekliği kat yüksekliği ile alınmıştır.</p>`;
    const bil = { 'Dış duvarlar': 0, 'Pencereler': 0, 'Dış kapılar': 0, 'Tavan / çatı': 0, 'Taban': 0, 'İç duvar ve döşemeler': 0, 'Artırımlar (ZD + ZH)': 0, 'Hava sızıntısı': 0 };
    for (const { e, r } of hes.res) {
      if (r.ti == null) continue;
      r.items.forEach(o => { const k = o.tur === 'DD' ? 'Dış duvarlar' : o.tur === 'PN' ? 'Pencereler' : o.tur === 'KP' && o.dis ? 'Dış kapılar' : o.tur === 'TV' ? 'Tavan / çatı' : o.tur === 'TB' ? 'Taban' : 'İç duvar ve döşemeler'; bil[k] += o.Q; }); bil['Artırımlar (ZD + ZH)'] += r.Qi - r.Q0; bil['Hava sızıntısı'] += r.Qs;
      s += `<div class="mahal"><h3>${esc(e.no)} ${esc(e.ad)} — t<sub>i</sub> = ${f(r.ti, 0)} °C · ${f(r.A, 2)} m² · ${f(r.V, 1)} m³</h3><table><tr><th>Yapı elemanı</th><th>Yön</th><th>Komşu</th><th class="n">Boyut (m)</th><th class="n">A (m²)</th><th class="n">U</th><th class="n">Δt (K)</th><th class="n">Q<sub>0</sub> (W)</th></tr>${r.items.filter(o => o.A > 0.005).map(o => `<tr><td>${esc(o.ad)}${o.ek ? ' (elle)' : ''}</td><td>${o.yon}</td><td>${esc(o.komsu)}</td><td class="n">${o.L ? f(o.L, 2) + ' × ' + f(o.hh, 2) : o.w ? (o.adet > 1 ? o.adet + ' × ' : '') + f(o.w, 2) + ' × ' + f(o.hh, 2) : '—'}</td><td class="n">${f(o.A, 2)}</td><td class="n">${f(o.U, 3)}</td><td class="n">${f(o.dt, 0)}</td><td class="n">${fi(o.Q)}</td></tr>`).join('')}
<tr class="top"><td colspan="7">Q<sub>0</sub> — iletim ısı kaybı</td><td class="n">${fi(r.Q0)}</td></tr><tr><td colspan="7">Artırımlar: D = ${f(r.D, 2)} W/m²K → Z<sub>D</sub> = %${r.ZD} ; yön ${r.zhYon || '—'} → Z<sub>H</sub> = %${r.ZH} ; Q<sub>0</sub>·(Z<sub>D</sub> + Z<sub>H</sub>)</td><td class="n">${fi(r.Qi - r.Q0)}</td></tr><tr><td colspan="7">Sızıntı: Σ(a·l) = ${f(r.al, 1)} m³/h · R = ${f(r.Rk, 1)} · H = ${f(r.Hk, 2)} · Δt = ${f(r.ti - m.td, 0)} K · Z<sub>e</sub> = ${f(r.Ze, 1)}</td><td class="n">${fi(r.Qs)}</td></tr><tr class="top"><td colspan="7">Q<sub>h</sub> — mahal ısı kaybı (${f(r.qA, 0)} W/m² · ${f(r.qV, 1)} W/m³)</td><td class="n">${fi(r.Q)}</td></tr></table></div>`;
    }
    s += `<h2>6. Sonuç</h2><div class="kart"><div><b>${fi(hes.Q)} W</b><span>Toplam ısı kaybı</span></div><div><b>${f(hes.Q / 1000, 1)} kW</b><span>Isıtma yükü (${fi(hes.Q * 0.86)} kcal/h)</span></div><div><b>${f(hes.A ? hes.Q / hes.A : 0, 0)} W/m²</b><span>Birim alan ısı kaybı</span></div><div><b>${f(hes.Vol ? hes.Q / hes.Vol : 0, 1)} W/m³</b><span>Birim hacim ısı kaybı</span></div></div>${mahalGrafik(hes.res)}${yatayGrafik(Object.entries(bil), 'W', 'Toplam ısı kaybının bileşenlere dağılımı')}`;
    return s;
  };

  MT.rapor = (tur = 'hepsi') => {
    const hes = MT.hesapla(), m = hes.m; if (!hes.res.length) return null;
    const t = MT.ts825(hes), tarih = new Date().toLocaleDateString('tr-TR'), ad = tur === 'yalitim' ? 'ISI YALITIM RAPORU' : tur === 'kayip' ? 'ISI KAYBI HESAP RAPORU' : 'ISI YALITIMI VE ISI KAYBI HESAP RAPORU';
    let b = `<h1>${ad}</h1><p class="mut">${esc(C.doc.set.name || 'Adsız proje')} · ${esc(m.il)} · ${tarih} · ArıtmaCAD Mekanik Tesisat</p><div class="kart"><div><b>${t.uUygun ? '✓' : '✗'} U değerleri</b><span>${t.uUygun ? 'Tüm elemanlar TS 825:2024 sınırında' : t.el.filter(g => !g.uygun).length + ' eleman sınırı aşıyor'}</span></div><div><b>${t.yogUygun ? '✓' : '✗'} Yoğuşma</b><span>${t.yogUygun ? 'Zararlı yoğuşma yok' : 'Yoğuşma sınırı aşılıyor'}</span></div><div><b>${f(t.qYil, 0)} kWh/m²</b><span>Yıllık net ısıtma enerjisi (ön hesap)</span></div><div><b>${f(hes.Q / 1000, 1)} kW</b><span>Toplam ısı kaybı · ${f(hes.A ? hes.Q / hes.A : 0, 0)} W/m²</span></div></div>` + bolumProje(m, hes);
    if (tur !== 'kayip') b += bolumYapi(m, t, hes) + bolum825(m, t);
    if (tur !== 'yalitim') b += bolumMahal(m, hes) + bolumKayip(m, hes);
    if (tur !== 'yalitim') b += (MT.raporEk || []).map(fn => { try { return fn(hes) || ''; } catch (er) { console.error(er); return ''; } }).join('');
    b += `<p class="mut" style="margin-top:26px">Kaynaklar: TS 825:2024 Binalarda Isı Yalıtım Kuralları (tavsiye U değerleri, derece gün bölgeleri, enerji sınırları) · TS EN ISO 6946 · TS EN ISO 13788 · TS 2164 Kalorifer Tesisatı Projelendirme Kuralları · MMO Kalorifer Tesisatı Proje Hazırlama Teknik Esasları. Başlangıç değerleri (dış hesap sıcaklığı, malzeme λ ve μ değerleri, artırım katsayıları) proje sorumlusu mühendis tarafından denetlenmelidir.</p>`;
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${ad} — ${esc(C.doc.set.name || '')}</title><style>${CSS}</style></head><body><div class="np"><span>${ad}</span><button onclick="window.print()">Yazdır / PDF</button><button id="doc">Word</button></div><main>${b}</main><script>document.getElementById('doc').onclick=function(){var h='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">'+document.head.innerHTML+'</head><body>'+document.querySelector('main').outerHTML+'</body></html>';var a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\\ufeff',h],{type:'application/msword'}));a.download=${JSON.stringify((C.doc.set.name || 'Proje') + '_isi_raporu.doc')};a.click();};<\/script></body></html>`;
  };
  MT.raporAc = tur => {
    const html = MT.rapor(tur); if (!html) { C.warn('Rapor için önce mahalleri oluşturun (MAHALBUL).'); return null; }
    const w = typeof window !== 'undefined' ? window.open('', 'mt_rapor') : null;
    if (!w) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = (C.doc.set.name || 'Proje') + '_isi_raporu.html'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000); C.warn('Açılır pencere engellendi — rapor HTML olarak indirildi.'); return html; }
    w.document.open(); w.document.write(html); w.document.close(); C.changed(); return html;
  };
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : (globalThis.C = globalThis.C || {}));

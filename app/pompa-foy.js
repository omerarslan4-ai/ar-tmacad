/* ArıtmaCAD — POMPA FÖYÜ: üretici veri sayfasını (PDF) okur → pompa eğrisi + güç + DN + ölçüler
   POMPAFOY komutu: PDF seçilir → metin ve grafikler okunur (pdf.js, programla birlikte gelir, internet gerekmez) →
     alanlar doldurulur (marka/model, P2, P1, devir, DN, tasarım noktası, verim), grafikteki H-Q / η-Q eğrileri sayısallaştırılır →
     kullanıcı denetler / düzeltir → (1) pompa ailesine TİP olarak kaydedilir (ölçüler çizime uygulanır),
     (2) eğri pompa hidrolik hesabına (POMPAHESAP) aktarılır, (3) çizimdeki seçili pompaya uygulanır.
   Grafik okuma (sayfa görüntüsü üzerinden): eksen sayıları (eşit aralıklı sayı dizileri) bulunur, eksen adları (H, η, P, NPSH; Q birimi
     m³/h ya da l/s) yakınındaki yazılardan anlaşılır, eğri renkli piksellerden (renk grubu en kalabalık olan) sütun sütun okunur.
   Föy kaydı: { no, ad, uretici, model, P2, P1, n, DN, etaM, Qd, Hd, pts:[[Q l/s, H m, η %, NPSH m]], olc:{Ht,f1,g,k,Lf,Dm}, kaynak } —
     tarayıcıda (localStorage) ve çizimde (doc.set.pompaFoy) saklanır.
   C.pompaFoyCalisma(no, Q, H): föy eğrisinde Q'daki H ve η, H'deki Q (aile bilgi satırı ve hesaplar için). */
(function (C) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEY = 'aritmacad.pompaFoy', FAM = 'dalgic_pompa_wilo_supra';
  const num = s => { if (s == null) return NaN; let t = String(s).trim().replace(/\s/g, ''); if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(',', '.'); return parseFloat(t); };
  const r2 = (v, n = 2) => Math.round(v * Math.pow(10, n)) / Math.pow(10, n);

  /* ================= KAYIT ================= */
  const yerel = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  C.pompaFoyleri = () => Object.assign({}, yerel(), (C.doc && C.doc.set && C.doc.set.pompaFoy) || {});
  C.pompaFoyBul = no => C.pompaFoyleri()[no] || null;
  C.pompaFoyKaydet = f => {
    f.no = f.no || (Math.floor(Date.now() / 1000) % 1e8);
    const o = yerel(); o[f.no] = f; try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { }
    if (C.doc && C.doc.set) { C.doc.set.pompaFoy = C.doc.set.pompaFoy || {}; C.doc.set.pompaFoy[f.no] = f; }
    return f.no;
  };

  /* ================= EĞRİ HESABI ================= */
  const polyFit2 = (xs, ys) => { // en küçük kareler, 2. derece
    let S = [0, 0, 0, 0, 0], T = [0, 0, 0];
    for (let i = 0; i < xs.length; i++) { const x = xs[i], y = ys[i]; let p = 1; for (let k = 0; k < 5; k++) { S[k] += p; if (k < 3) T[k] += p * y; p *= x; } }
    const A = [[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]], b = T.slice();
    for (let i = 0; i < 3; i++) { let m = i; for (let j = i + 1; j < 3; j++) if (Math.abs(A[j][i]) > Math.abs(A[m][i])) m = j; [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]]; for (let j = i + 1; j < 3; j++) { const f = A[j][i] / A[i][i]; for (let k = i; k < 3; k++) A[j][k] -= f * A[i][k]; b[j] -= f * b[i]; } }
    const c = [0, 0, 0]; for (let i = 2; i >= 0; i--) { let s = b[i]; for (let k = i + 1; k < 3; k++) s -= A[i][k] * c[k]; c[i] = s / A[i][i]; } return c;
  };
  const lin = (xs, ys, x) => { if (!xs.length) return NaN; if (x <= xs[0]) return ys[0]; for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1] || 1); return ys[ys.length - 1]; };
  const egri = f => {
    const p = (f.pts || []).filter(r => isFinite(r[0]) && isFinite(r[1])).sort((a, b) => a[0] - b[0]); if (p.length < 3) return null;
    const c = polyFit2(p.map(r => r[0]), p.map(r => r[1])), H = Q => c[0] + c[1] * Q + c[2] * Q * Q;
    const pe = p.filter(r => r[2] > 0), eta = Q => pe.length >= 2 ? lin(pe.map(r => r[0]), pe.map(r => r[2]), Q) : null;
    return { p, c, H, eta, Qmax: p[p.length - 1][0] };
  };
  C.pompaFoyCalisma = (no, Q, Hreq) => {
    const f = typeof no === 'object' ? no : C.pompaFoyBul(no); if (!f) return null; const E = egri(f); if (!E) return null;
    let Qh = null; if (Hreq != null && E.H(0) >= Hreq) { let a = 0, b = E.Qmax * 1.3; if (E.H(b) < Hreq) { for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (E.H(m) >= Hreq) a = m; else b = m; } Qh = (a + b) / 2; } }
    return { Hq: E.H(Q), eta: E.eta(Q), Qh, egri: E };
  };

  /* ================= PDF ================= */
  const scriptYukle = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src + ' yüklenemedi')); document.head.appendChild(s); });
  let pdfHazir = null;
  const pdfLib = () => pdfHazir || (pdfHazir = (async () => {
    if (!window.pdfjsLib) await scriptYukle('app/pdf-kutuphane.js');
    if (!window.PDFJS_ISCI_KOD) await scriptYukle('app/pdf-isci.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([window.PDFJS_ISCI_KOD], { type: 'text/javascript' }));
    return window.pdfjsLib;
  })());

  /* sayfa → metin öğeleri (piksel konumu) + görüntü */
  const sayfaOku = async (pdf, i, olcek) => {
    const pg = await pdf.getPage(i), vp = pg.getViewport({ scale: olcek });
    const cv = document.createElement('canvas'); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
    const g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    await pg.render({ canvasContext: g, viewport: vp, canvas: cv }).promise;
    const tc = await pg.getTextContent(), its = [];
    for (const t of tc.items) { if (!t.str || !t.str.trim()) continue; const [x, y] = vp.convertToViewportPoint(t.transform[4], t.transform[5]); const h = Math.hypot(t.transform[2], t.transform[3]) * olcek, w = (t.width || 0) * olcek, dik = Math.abs(t.transform[1]) > Math.abs(t.transform[0]); its.push(dik ? { s: t.str, x: x - h, y, w: h, h: w, x2: x, yc: y - w / 2, dik } : { s: t.str, x, y, w, h, x2: x + w, yc: y - h / 2 }); }
    return { cv, g, W: cv.width, H: cv.height, its };
  };
  const satirlar = its => { // aynı satırdaki öğeler soldan sağa
    const S = []; for (const t of its.slice().sort((a, b) => a.y - b.y || a.x - b.x)) { const s = S.find(r => Math.abs(r.y - t.y) < Math.max(2, t.h * 0.4)); if (s) s.o.push(t); else S.push({ y: t.y, o: [t] }); }
    return S.map(r => r.o.sort((a, b) => a.x - b.x).map(o => o.s).join(' ').replace(/\s+/g, ' ').trim());
  };

  /* ---- eksenler: eşit aralıklı sayı dizileri ---- */
  const dogru = (a, b) => { const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } const k = sab / (saa || 1e-12); return { k, c: mb - k * ma, r2: saa && sbb ? sab * sab / (saa * sbb) : 0 }; };
  const eksenler = its => {
    const N = its.filter(t => /^-?\d+([.,]\d+)?$/.test(t.s.trim())).map(t => Object.assign({ v: num(t.s) }, t));
    const out = [];
    const grupla = (key, tol) => { const G = []; for (const t of N) { const k = key(t), g = G.find(x => Math.abs(x.k - k) < tol); if (g) g.o.push(t); else G.push({ k, o: [t] }); } return G.filter(g => g.o.length >= 3); };
    /* hizalı grubu, adımı sabit ardışık dizilere böl (aynı sütunda üst üste iki grafik olabilir) */
    const kos = (o, pos) => { const R = []; let cur = [o[0]];
      for (let i = 1; i < o.length; i++) { const a = cur[cur.length - 1], b = o[i], dp = pos(b) - pos(a), dv = b.v - a.v;
        if (cur.length >= 2) { const a0 = cur[cur.length - 2], dp0 = pos(a) - pos(a0), dv0 = a.v - a0.v; if (Math.abs(dp - dp0) > 0.25 * Math.abs(dp0) || Math.abs(dv - dv0) > 1e-6 * Math.max(1, Math.abs(dv0)) || Math.sign(dv) !== Math.sign(dv0)) { R.push(cur); cur = [b]; continue; } }
        else if (dv === 0) { R.push(cur); cur = [b]; continue; }
        cur.push(b); }
      R.push(cur); return R.filter(r => r.length >= 3); };
    for (const g of grupla(t => t.x2, 5)) for (const o of kos(g.o.sort((a, b) => a.yc - b.yc), t => t.yc)) { // düşey eksen
      const L = dogru(o.map(t => t.yc), o.map(t => t.v));
      if (L.r2 > 0.999 && L.k < 0) out.push({ yon: 'y', o, x: g.k, y0: o[0].yc, y1: o[o.length - 1].yc, v: y => L.k * y + L.c, p: v => (v - L.c) / L.k });
    }
    for (const g of grupla(t => t.yc, 4)) for (const o of kos(g.o.sort((a, b) => a.x - b.x), t => t.x + t.w / 2)) { // yatay eksen
      const xc = o.map(t => t.x + t.w / 2), L = dogru(xc, o.map(t => t.v));
      if (L.r2 > 0.999 && L.k > 0) out.push({ yon: 'x', o, y: g.k, x0: xc[0], x1: xc[xc.length - 1], v: x => L.k * x + L.c, p: v => (v - L.c) / L.k });
    }
    return out;
  };
  const turBul = (its, ax) => { // eksen adını yakın yazılardan bul
    const yak = its.filter(t => ax.yon === 'y' ? (t.x2 <= ax.x + 4 && t.x2 > ax.x - 140 && t.yc > ax.y0 - 60 && t.yc < ax.y1 + 30 && !/^-?[\d.,]+$/.test(t.s.trim())) : (Math.abs(t.yc - ax.y) < 45 && t.x > ax.x0 - 60 && t.x < ax.x1 + 120 && !/^-?[\d.,]+$/.test(t.s.trim()))).map(t => t.s).join(' ');
    if (ax.yon === 'x') return /l\s*\/\s*s/i.test(yak) ? 'ls' : /m\s*[³3]\s*\/\s*h/i.test(yak) ? 'm3h' : /US\s*gpm|gpm/i.test(yak) ? 'gpm' : '?';
    if (/NPSH/i.test(yak)) return 'NPSH'; if (/η|eta|wirkungs|effic|verim|%/i.test(yak)) return 'eta'; if (/\bP\s*[12]?\b|kW|leistung|power|güç/i.test(yak)) return 'P'; if (/\bH\b|förderh|head|basma|\[m\]|\bm\b/i.test(yak)) return 'H';
    return '?';
  };
  /* ---- eğri pikselleri ---- */
  const egriOku = (S, xa, ya) => {
    const x0 = Math.ceil(Math.min(xa.x0, xa.x1) - 2), x1 = Math.floor(Math.max(xa.x0, xa.x1) + 2), yTop = Math.ceil(ya.y0 - 2), yBot = Math.floor(Math.min(ya.y1 + 2, xa.y - 6));
    if (x1 - x0 < 30 || yBot - yTop < 20) return null;
    const d = S.g.getImageData(x0, yTop, x1 - x0, yBot - yTop).data, W = x1 - x0, H = yBot - yTop;
    const metin = S.its.filter(t => t.x2 > x0 && t.x < x1 && t.y > yTop && t.y - t.h < yBot);
    const yazida = (x, y) => metin.some(t => x >= t.x - 2 && x <= t.x2 + 2 && y >= t.y - t.h - 2 && y <= t.y + 2);
    const kova = new Map();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx - mn < 60 || mx < 70) continue; if (yazida(x + x0, y + yTop)) continue;
      let h; if (mx === r) h = ((g - b) / (mx - mn) + 6) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4;
      const k = Math.round(h * 2) % 12; let a = kova.get(k); if (!a) kova.set(k, a = []); a.push(x, y);
    }
    let best = null; for (const [k, a] of kova) if (!best || a.length > best.a.length) best = { k, a };
    let ser = [];
    if (best && best.a.length > 40) {
      const col = new Map(); for (let i = 0; i < best.a.length; i += 2) { const x = best.a[i]; (col.get(x) || col.set(x, []).get(x)).push(best.a[i + 1]); }
      for (const [x, ys] of col) { ys.sort((a, b) => a - b); ser.push([x + x0, ys[Math.floor(ys.length / 2)] + yTop]); }
    }
    if (ser.length < 10) return null;
    ser.sort((a, b) => a[0] - b[0]);
    const N = 12, xs0 = ser[0][0], xs1 = ser[ser.length - 1][0], out = [];
    for (let k = 0; k < N; k++) { const px = xs0 + (xs1 - xs0) * k / (N - 1); let bb = null; for (const p of ser) if (!bb || Math.abs(p[0] - px) < Math.abs(bb[0] - px)) bb = p; out.push([xa.v(bb[0]), ya.v(bb[1])]); }
    return { pts: out, ham: ser };
  };
  const grafikOku = S => {
    const A = eksenler(S.its), xs = A.filter(a => a.yon === 'x'), ys = A.filter(a => a.yon === 'y'), cikti = [];
    for (const ya of ys) {
      const xa = xs.filter(x => x.y > ya.y1 - 5 && x.x0 > ya.x - 40).sort((a, b) => a.y - b.y)[0]; if (!xa) continue;
      const tur = turBul(S.its, ya), birim = turBul(S.its, xa), e = egriOku(S, xa, ya); if (!e) continue;
      cikti.push({ tur, birim, xa, ya, pts: e.pts, ham: e.ham });
    }
    return cikti;
  };

  /* ---- metinden alanlar ---- */
  const MARKA = /(wilo|grundfos|ksb|flygt|xylem|sulzer|abs|zenit|tsurumi|ebara|pentair|homa|caprari|lowara|pedrollo|vansan|sumak|etna|standart pompa)/i;
  const ilk = (t, re, g = 1) => { const m = t.match(re); return m ? m[g] : null; };
  const alanlar = (metin, satir) => {
    const t = metin.replace(/ /g, ' ');
    const f = {};
    const ad = satir.find(s => MARKA.test(s) && /\d/.test(s) && s.length < 90) || satir.find(s => MARKA.test(s));
    if (ad) { f.ad = ad.trim(); f.uretici = (ad.match(MARKA) || [])[1]; }
    const kw = re => { const v = num(ilk(t, re, 2)); return isFinite(v) ? v : null; };
    f.P2 = kw(/(P\s*2|Nennleistung|Motornennleistung|Rated power|Nominal power|Motor gücü|Nominal güç|Anma gücü)[^0-9\n]{0,40}?([\d]+[.,]?\d*)\s*kW/i);
    f.P1 = kw(/(P\s*1|Leistungsaufnahme|Power input|Giriş gücü|Çekilen güç)[^0-9\n]{0,40}?([\d]+[.,]?\d*)\s*kW/i);
    f.n = kw(/(Drehzahl|Speed|Devir|n)\s*[=:]?\s*[^0-9\n]{0,12}?([\d.,]{3,6})\s*(1\/min|rpm|d\/d|min-1|min⁻¹)/i);
    const dn = [...t.matchAll(/DN\s*(\d{2,4})/gi)].map(m => +m[1]); if (dn.length) { const say = {}; dn.forEach(d => say[d] = (say[d] || 0) + 1); f.DN = +Object.entries(say).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0]; }
    const qm = t.match(/(Förderstrom|Volumenstrom|Flow|Debi|Q)\s*[=:]?\s*([\d]+[.,]?\d*)\s*(m³\/h|m3\/h|l\/s)/i); if (qm) { const v = num(qm[2]); f.Qd = r2(qm[3].toLowerCase() === 'l/s' ? v : v / 3.6, 2); }
    const hm = t.match(/(Förderhöhe|Head|Basma yüksekliği|Basma|H)\s*[=:]?\s*([\d]+[.,]?\d*)\s*m(?![³3\/a-z])/i); if (hm) f.Hd = num(hm[2]);
    const em = t.match(/(Motorwirkungsgrad|Motor efficiency|Motor verimi)[^0-9\n]{0,30}?([\d]+[.,]?\d*)\s*%/i); if (em) f.etaM = num(em[2]) / 100;
    for (const k of Object.keys(f)) if (f[k] == null || (typeof f[k] === 'number' && !isFinite(f[k]))) delete f[k];
    return f;
  };

  C.pompaFoyPdfOku = async (file, ilerle) => {
    const L = await pdfLib(); const buf = await file.arrayBuffer();
    const pdf = await L.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
    const sayfa = [], metin = [], satir = [], graf = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 8); i++) {
      ilerle && ilerle(`Sayfa ${i}/${pdf.numPages} okunuyor…`);
      const S = await sayfaOku(pdf, i, 2); sayfa.push(S);
      const sat = satirlar(S.its); satir.push(...sat); metin.push(sat.join('\n'));
      for (const g of grafikOku(S)) graf.push(Object.assign({ sayfa: i - 1 }, g));
    }
    const f = alanlar(metin.join('\n'), satir);
    /* eğriler → nokta tablosu (Q l/s) */
    const Hg = graf.find(g => g.tur === 'H') || graf.find(g => g.tur === '?');
    const qCev = g => g.birim === 'm3h' ? 1 / 3.6 : g.birim === 'gpm' ? 0.0630902 : 1;
    if (Hg) {
      const k = qCev(Hg), eg = graf.find(g => g.tur === 'eta'), ng = graf.find(g => g.tur === 'NPSH');
      const iy = (g, Q) => { if (!g) return 0; const kk = qCev(g), P = g.pts.map(p => [p[0] * kk, p[1]]); return Q < P[0][0] - 1e-9 || Q > P[P.length - 1][0] + 1e-9 ? 0 : lin(P.map(p => p[0]), P.map(p => p[1]), Q); };
      f.pts = Hg.pts.map(p => { const Q = p[0] * k; return [r2(Q, 2), r2(p[1], 2), r2(iy(eg, Q), 1), r2(iy(ng, Q), 2)]; }).filter(p => p[0] >= 0 && p[1] > 0);
      f.qBirim = Hg.birim;
    }
    f.kaynak = file.name;
    return { f, sayfa, graf, metin: metin.join('\n\n') };
  };

  /* ================= PENCERE ================= */
  const ALAN = [['ad', 'Pompa tanımı', 's'], ['uretici', 'Üretici', 's'], ['P2', 'Motor gücü P2 (kW)'], ['P1', 'Çekilen güç P1 (kW)'], ['etaM', 'Motor verimi (0–1)'], ['n', 'Devir (d/d)'], ['DN', 'Basma DN'], ['Qd', 'Tasarım debisi (l/s)'], ['Hd', 'Tasarım yüksekliği (m)']];
  const OLC = [['Ht', 'Toplam yükseklik — tabandan'], ['f1', 'Basma flanşı merkezi — tabandan'], ['g', 'Ördek ayağı çıkış flanşı — tabandan'], ['k', 'Çıkış ekseni → pompa ekseni'], ['Lf', 'Pompa ekseni → basma flanşı yüzü'], ['Dm', 'Motor çapı']];
  const ciz = (cv, f) => { // Q-H önizleme
    const g = cv.getContext('2d'), W = cv.width, H = cv.height; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    const E = egri(f); if (!E) { g.fillStyle = '#888'; g.font = '12px sans-serif'; g.fillText('Eğri için en az 3 nokta gerekir', 10, 20); return; }
    const Qm = Math.max(E.Qmax, f.Qd || 0) * 1.1, Hm = Math.max(...E.p.map(p => p[1]), f.Hd || 0) * 1.15, X = q => 34 + q / Qm * (W - 44), Y = h => H - 22 - h / Hm * (H - 32);
    g.strokeStyle = '#ccc'; g.lineWidth = 1; g.strokeRect(34, 10, W - 44, H - 32); g.fillStyle = '#333'; g.font = '11px sans-serif'; g.fillText('Q (l/s)', W - 52, H - 6); g.fillText('H (m)', 2, 12);
    for (let k = 0; k <= 4; k++) { g.fillText(r2(Qm * k / 4, 0), X(Qm * k / 4) - 6, H - 8); g.fillText(r2(Hm * k / 4, 0), 4, Y(Hm * k / 4) + 4); }
    g.strokeStyle = '#1565c0'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 60; i++) { const q = E.Qmax * i / 60; i ? g.lineTo(X(q), Y(E.H(q))) : g.moveTo(X(q), Y(E.H(q))); } g.stroke();
    g.fillStyle = '#1565c0'; for (const p of E.p) { g.beginPath(); g.arc(X(p[0]), Y(p[1]), 3, 0, 7); g.fill(); }
    if (f.Qd && f.Hd) { g.fillStyle = '#c62828'; g.beginPath(); g.moveTo(X(f.Qd), Y(f.Hd) - 6); g.lineTo(X(f.Qd) - 5, Y(f.Hd) + 3); g.lineTo(X(f.Qd) + 5, Y(f.Hd) + 3); g.fill(); }
  };
  const katman = (S, graf) => { // sayfa görüntüsü + okunan eğri işaretleri
    const cv = document.createElement('canvas'), k = Math.min(1, 520 / S.W); cv.width = S.W * k; cv.height = S.H * k; const g = cv.getContext('2d'); g.drawImage(S.cv, 0, 0, cv.width, cv.height);
    for (const gr of graf) { g.strokeStyle = gr.tur === 'H' ? '#d50000' : '#ff6d00'; g.lineWidth = 2; g.setLineDash([4, 3]); g.strokeRect(Math.min(gr.xa.x0, gr.xa.x1) * k, gr.ya.y0 * k, Math.abs(gr.xa.x1 - gr.xa.x0) * k, (gr.xa.y - gr.ya.y0) * k); g.setLineDash([]); g.fillStyle = g.strokeStyle; for (const p of gr.pts) { const px = gr.xa.p(p[0]) * k, py = gr.ya.p(p[1]) * k; g.beginPath(); g.arc(px, py, 3.5, 0, 7); g.fill(); } g.font = 'bold 12px sans-serif'; g.fillText(gr.tur + (gr.birim !== '?' ? ' / Q ' + gr.birim : ''), Math.min(gr.xa.x0, gr.xa.x1) * k + 4, gr.ya.y0 * k + 14); }
    cv.style.cssText = 'border:1px solid #cfd6da;border-radius:4px;max-width:100%'; return cv;
  };

  C.pompaFoyPencere = (on) => new Promise(res => {
    let f = Object.assign({ pts: [], olc: {} }, on || {}), okunan = null;
    const b = C.modal('Pompa föyü — üretici veri sayfası', `<div style="display:grid;grid-template-columns:minmax(360px,1fr) minmax(380px,1.1fr);gap:14px;max-height:78vh">
      <div style="overflow:auto;padding-right:6px"><div class="bar" style="gap:8px;margin-bottom:8px"><button id="pfPdf" class="pri">PDF föy aç…</button><select id="pfKayit"><option value="">— kayıtlı föyler —</option>${Object.values(C.pompaFoyleri()).map(x => `<option value="${x.no}">${esc(x.ad || x.no)}</option>`).join('')}</select></div>
        <div id="pfDurum" class="hint" style="min-height:18px"></div><div id="pfAlan"></div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.7;margin:10px 0 4px">Pompa eğrisi (Q l/s · H m · η % · NPSHr m) — Excel'den / PDF'ten yapıştırabilirsiniz</div>
        <textarea id="pfPts" rows="9" style="width:100%;font-family:monospace;font-size:12px"></textarea>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.7;margin:10px 0 4px">Montaj ölçüleri (mm) — föyün ölçü resminden</div><div id="pfOlc"></div></div>
      <div style="overflow:auto;display:flex;flex-direction:column;gap:8px"><canvas id="pfCv" width="440" height="240" style="border:1px solid #cfd6da;border-radius:4px"></canvas><div id="pfSonuc" class="hint"></div><div id="pfSayfa"></div></div></div>
      <div class="bar" style="justify-content:space-between;margin-top:10px"><div style="display:flex;gap:8px"><button id="pfHesap">Hidrolik hesaba gönder</button><button id="pfUygula">Seçili pompaya uygula</button></div>
      <div style="display:flex;gap:8px"><button id="pfIptal">Kapat</button><button id="pfKaydet" class="pri">Tip olarak kaydet</button></div></div>`);
    const box = document.querySelector('#modal .box'); if (box) box.style.width = 'min(1180px,97vw)';
    const $ = s => b.querySelector(s), durum = s => { $('#pfDurum').textContent = s || ''; };
    const formYaz = () => {
      $('#pfAlan').innerHTML = '<table style="width:100%;font-size:13px">' + ALAN.map(([k, a, t]) => `<tr><td style="padding:2px 6px 2px 0;white-space:nowrap">${esc(a)}</td><td><input data-k="${k}" ${t === 's' ? '' : 'type="number" step="any"'} value="${f[k] == null ? '' : esc(f[k])}" style="width:${t === 's' ? '100%' : '110px'}"></td></tr>`).join('') + '</table>';
      $('#pfOlc').innerHTML = '<table style="width:100%;font-size:13px">' + OLC.map(([k, a]) => `<tr><td style="padding:2px 6px 2px 0">${esc(a)}</td><td><input data-o="${k}" type="number" step="1" value="${f.olc[k] == null ? '' : f.olc[k]}" style="width:90px"></td></tr>`).join('') + '</table>';
      $('#pfPts').value = (f.pts || []).map(p => p.map(v => String(v).replace('.', ',')).join('\t')).join('\n');
      b.querySelectorAll('[data-k]').forEach(i => i.onchange = () => { const k = i.dataset.k, s = ALAN.find(a => a[0] === k)[2]; f[k] = s === 's' ? i.value : (i.value === '' ? null : num(i.value)); goster(); });
      b.querySelectorAll('[data-o]').forEach(i => i.onchange = () => { f.olc[i.dataset.o] = i.value === '' ? null : num(i.value); });
      goster();
    };
    const tabloOku = () => { f.pts = $('#pfPts').value.split(/\n/).map(l => l.trim()).filter(Boolean).map(l => l.split(/[\t;]+|\s{1,}/).map(num)).filter(r => r.length >= 2 && isFinite(r[0]) && isFinite(r[1])).map(r => [r[0], r[1], isFinite(r[2]) ? r[2] : 0, isFinite(r[3]) ? r[3] : 0]); };
    const goster = () => {
      ciz($('#pfCv'), f); const r = (f.Qd && f.Hd) ? C.pompaFoyCalisma(f, f.Qd, f.Hd) : null;
      $('#pfSonuc').innerHTML = r ? `Tasarım Q ${f.Qd} l/s'de pompa H = <b>${r2(r.Hq)} m</b>${r.eta ? `, η ≈ %${r2(r.eta, 0)}` : ''} (gerekli ${f.Hd} m → ${r.Hq >= f.Hd ? '<b style="color:#2e7d32">yeterli</b>' : '<b style="color:#c62828">yetersiz</b>'}); ${f.Hd} m'de pompa Q = ${r.Qh != null ? r2(r.Qh, 1) + ' l/s' : '—'}.` : (egri(f) ? 'Tasarım debisi ve yüksekliğini girerseniz çalışma noktası kontrol edilir.' : '');
    };
    $('#pfPts').onchange = () => { tabloOku(); goster(); };
    $('#pfKayit').onchange = ev => { const x = C.pompaFoyBul(ev.target.value); if (x) { f = JSON.parse(JSON.stringify(x)); f.olc = f.olc || {}; formYaz(); durum('Kayıtlı föy açıldı: ' + (f.ad || f.no)); } };
    $('#pfPdf').onclick = () => { const fi = document.createElement('input'); fi.type = 'file'; fi.accept = '.pdf,application/pdf'; fi.onchange = async () => { const file = fi.files[0]; if (!file) return; try { durum('PDF okunuyor…'); okunan = await C.pompaFoyPdfOku(file, durum); const yeni = okunan.f; f = Object.assign({ olc: {} }, f, yeni, { olc: Object.assign({}, f.olc, yeni.olc || {}) }); if (!yeni.pts || !yeni.pts.length) f.pts = f.pts || []; formYaz(); const ng = okunan.graf.length; durum(`${file.name}: ${Object.keys(yeni).filter(k => !['kaynak', 'pts', 'qBirim'].includes(k)).length} alan bulundu; ${ng ? ng + ' grafik okundu' + (yeni.pts && yeni.pts.length ? `, H-Q eğrisinden ${yeni.pts.length} nokta (Q ${yeni.qBirim === 'm3h' ? 'm³/h → l/s çevrildi' : yeni.qBirim || '?'})` : '') : 'grafik okunamadı — eğri noktalarını tabloya girin'}. Lütfen değerleri föyle karşılaştırın.`); const sp = $('#pfSayfa'); sp.innerHTML = ''; okunan.sayfa.forEach((S, i) => { const gg = okunan.graf.filter(g => g.sayfa === i); if (i === 0 || gg.length) sp.appendChild(katman(S, gg)); }); } catch (er) { console.error(er); durum('PDF okunamadı: ' + er.message); } }; fi.click(); };
    const topla = () => { tabloOku(); b.querySelectorAll('[data-k]').forEach(i => { const k = i.dataset.k, s = ALAN.find(a => a[0] === k)[2]; f[k] = s === 's' ? i.value : (i.value === '' ? null : num(i.value)); }); b.querySelectorAll('[data-o]').forEach(i => { f.olc[i.dataset.o] = i.value === '' ? null : num(i.value); }); return f; };
    const tipPar = (no) => { // föy → aile parametreleri (boş ölçüler şablon tipinden)
      const d = C.AILELER && C.AILELER[FAM]; if (!d) return {};
      const q = C.aileDeger(FAM, d.tipler[0] && d.tipler[0].ad, {}), p = {}; for (const x of d.params) if (!x.fn) p[x.k] = q[x.k];
      if (f.P2) p.P2 = f.P2; if (f.DN) p.DN = f.DN; if (f.Qd) p.Q = r2(f.Qd, 2); if (f.Hd) p.H = f.Hd; p.foyNo = +no;
      for (const k of Object.keys(f.olc || {})) if (f.olc[k] > 0 && k in p) p[k] = f.olc[k];
      return p;
    };
    $('#pfKaydet').onclick = () => { topla(); if (!f.ad) f.ad = prompt('Föy / tip adı:', f.ad || '') || ''; if (!f.ad) return; const no = C.pompaFoyKaydet(JSON.parse(JSON.stringify(f))); f.no = no; if (C.AILELER && C.AILELER[FAM]) C.aileTipKaydet(FAM, f.ad, tipPar(no)); C.changed && C.changed(); C.log(`Pompa föyü kaydedildi: ${f.ad} (föy no ${no}) — AILE → "Islak tip dalgıç pompa — Wilo Rexa SUPRA" → Tip listesinden seçin.`); durum('Kaydedildi: ' + f.ad); };
    $('#pfUygula').onclick = () => { topla(); const s = (C.sel || []).filter(e => e.type === 'aile' && e.fam === FAM); if (!s.length) { durum('Önce çizimde bir Wilo dalgıç pompa (aile) seçin.'); return; } if (!f.no) { durum('Önce "Tip olarak kaydet" deyin.'); return; } for (const e of s) { e.tip = f.ad; e.tipU = ''; delete e._c; delete e._g; delete e._q; } C.changed(); durum(`${s.length} pompaya uygulandı.`); };
    $('#pfHesap').onclick = () => { topla(); if (!egri(f)) { durum('Hidrolik hesap için en az 3 eğri noktası gerekir.'); return; } C.pompaFoyHesabaGonder(f); };
    $('#pfIptal').onclick = () => { C.closeModal(); if (box) box.style.width = ''; res(f); };
    formYaz();
  });

  /* pompa hidrolik hesabına aktar (app/hesap/pompa-hidrolik.html açılışta "aritmacad.pompaFoyAktar" anahtarını okur) */
  C.pompaFoyHesabaGonder = f => {
    const A = { pName: f.ad || 'Pompa', Pm: f.P2 || null, etaM: f.etaM || (f.P1 && f.P2 ? r2(f.P2 / f.P1, 3) : null), pts: (f.pts || []).map(p => [r2(p[0] * 3.6, 2), p[1], p[2] || 0, p[3] || 0]) };
    try { localStorage.setItem('aritmacad.pompaFoyAktar', JSON.stringify(A)); } catch (e) { C.warn('Aktarılamadı: ' + e.message); return; }
    const w = window.open('app/hesap/pompa-hidrolik.html', 'hesap_POMPAHESAP', 'width=1280,height=900'); if (!w) C.warn('Açılır pencere engellendi.'); else C.log(`Föy eğrisi (${A.pts.length} nokta, P2 ${A.Pm} kW) pompa hidrolik hesabına aktarıldı.`);
  };

  /* ================= KOMUT / ŞERİT ================= */
  C.addCommand(['POMPAFOY', 'POMPAFOYU', 'FOY', 'DATASHEET'], 'Pompa föyü (üretici veri sayfası, PDF) okur: eğri, güç, DN, ölçüler → pompa ailesine tip, hidrolik hesaba eğri, seçili pompaya uygula.', async () => { await C.pompaFoyPencere(); }, { noUndo: true });
  /* şerit: Mekanik sekmesine "Pompa" paneli. ekipman.js Mekanik sekmesini her yenilemede baştan kurduğu için
     panel C.ribbon.render çağrısından hemen önce (yeniden) eklenir; Arıtma sekmesindeki Aileler paneline de föy düğmesi. */
  const PANEL = 'Pompa (parametrik)';
  const seritEkle = () => {
    const R = C.ribbon; if (!R || !Array.isArray(R.tabs)) return;
    const mek = R.tabs.find(t => t[0] === 'Mekanik');
    if (mek && !mek[1].some(p => p[0] === PANEL)) mek[1].splice(1, 0, [PANEL, [{ cmd: 'AILE', t: 'Pompa aileleri', i: 'pump', big: true }, { cmd: 'POMPAFOY', t: 'Pompa föyü', i: 'table', big: true }, { cmd: 'AILEGORUNUS', t: 'Görünüş çiz', i: 'sheet' }, { cmd: 'AILELISTE', t: 'Pompa listesi', i: 'table' }, { cmd: 'POMPAHESAP', t: 'Hidrolik hesap', i: 'calc' }]]);
    const ari = R.tabs.find(t => t[0] === 'Arıtma'), pn = ari && ari[1].find(p => p[0] === 'Aileler');
    if (pn && !pn[1].some(x => x.cmd === 'POMPAFOY')) pn[1].push({ cmd: 'POMPAFOY', t: 'Pompa föyü', i: 'table' });
  };
  try {
    const R = C.ribbon;
    if (R && !R._pompaFoy) { const r0 = R.render; R.render = function () { try { seritEkle(); } catch (er) { console.error('pompa şerit', er); } return r0.apply(this, arguments); }; R._pompaFoy = true; }
    R && R.render && R.render();
  } catch (er) { console.error('pompa föy şerit', er); }
})(window.C);

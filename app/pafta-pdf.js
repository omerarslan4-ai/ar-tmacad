/* ArıtmaCAD — PAFTA PDF KAYDI (her bölümden, doğrudan PDF dosyası)
   PDFKAYDET [bölüm]: seçilen bölümün (Mimari, Mekanik, Statik, Elektrik … ya da tümü) paftalarını PDF dosyası olarak kaydeder.
     • Her ünite ayrı PDF  • her pafta ayrı PDF  • hepsi tek PDF (her pafta bir sayfa, ünite adlarıyla yer imi)
     • Kâğıt boyutu her paftanın kendi sayfa düzeninden otomatik alınır (A0–A4, uzun paftalar ör. 898×594, özel ölçü); sayfa o boyutta ve yönde çıkar.
     • Dosyalar seçilen klasöre doğrudan yazılır (tarayıcının indirmeler klasörü değil); klasör bir kez seçilir ve hatırlanır.
     • Bölümde pafta yoksa önce o bölümün otomatik paftalama komutu çalışır (MIMARIPAFTA, TESISATPAFTA, ELEKTRIKPAFTA, STATIKCIZ).
   PDF tarayıcının yazdırma penceresi olmadan, burada yazılır: paftanın SVG çizimi (C.layoutSvg) vektör PDF'e çevrilir
   (çizgi, çokgen, yay, daire, dolgu, kırpma, kesik çizgi; çizgi fontlu yazılar çizgi olarak, TrueType yazılar PDF'in standart
   Helvetica / Times / Courier fontlarıyla — Türkçe harfler dahil; Yunan harfleri ve ≤ ≥ ∅ gibi işaretler Symbol, ✓ ● ■ ZapfDingbats fontuyla; resimler JPEG).
   Saf kısım (kâğıt algılama, ünite → pafta gruplama, SVG → PDF) Node'da denenir: test/pafta-pdf.test.js */
(function (C) {
  'use strict';
  const PT = 72 / 25.4; // mm → pt

  /* ======================= KÂĞIT ======================= */
  const ISO = { A0: [1189, 841], A1: [841, 594], A2: [594, 420], A3: [420, 297], A4: [297, 210] };
  /* paftanın kâğıdı (layout.js C.paperSize ile aynı kural): OZEL → pw × ph, yoksa ISO; dikey ise yer değiştirir */
  const paftaKagidi = L => {
    let [w, h] = L.size === 'OZEL' && L.pw > 0 && L.ph > 0 ? [L.pw, L.ph] : (ISO[L.size] || ISO.A1);
    if (L.orient === 'P') [w, h] = [h, w];
    return Object.assign({ w, h }, kagitAdi(w, h));
  };
  /* ölçüden kâğıt adı: tam ISO → "A1"; kısa kenarı ISO, uzun kenarı daha uzun → "A1 uzun"; değilse "Özel" */
  const kagitAdi = (w, h) => {
    const a = Math.max(w, h), b = Math.min(w, h), yon = w >= h ? 'yatay' : 'dikey', r = Math.round;
    for (const [k, [A, B]] of Object.entries(ISO)) if (Math.abs(a - A) < 2 && Math.abs(b - B) < 2) return { ad: k, uzun: false, yon, etiket: k };
    for (const [k, [A, B]] of Object.entries(ISO)) if (Math.abs(b - B) < 2 && a > A) return { ad: k, uzun: true, yon, etiket: `${k} uzun ${r(w)}×${r(h)}` };
    return { ad: 'Özel', uzun: false, yon, etiket: `Özel ${r(w)}×${r(h)}` };
  };

  /* ======================= ÜNİTE → PAFTA ======================= */
  /* paftanın ünitesi: statik paftalarında yapı adı; başlık "YAPI — PAFTA ADI" ise tireden önceki kısım; yoksa bölüm adı */
  const uniteAdi = L => {
    if (L.unite) return String(L.unite);
    if (L.statikDsi) return String(L.statikDsi);
    if (L.statik) return String(L.statik);
    const b = String((L.f && L.f.baslik) || ''), i = b.indexOf(' — ');
    if (i > 0) return b.slice(0, i).trim();
    return L.grp || 'Genel';
  };
  const dosyaAdi = s => String(s).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 150) || 'pafta';
  const bolumPaftalari = (lays, bolum) => (lays || []).filter(L => !bolum || bolum === 'TUMU' || L.grp === bolum);
  /* üniteler: [{ ad, paftalar }] (paftaların sırasıyla) */
  const uniteler = (lays, bolum) => {
    const m = new Map();
    for (const L of bolumPaftalari(lays, bolum)) { const u = uniteAdi(L); if (!m.has(u)) m.set(u, []); m.get(u).push(L); }
    return [...m].map(([ad, paftalar]) => ({ ad, paftalar }));
  };
  /* kayıt dosyaları: kip 'unite' | 'pafta' | 'tek'; secili: ünite adları (boş = hepsi) → [{ ad (dosya adı, .pdf yok), paftalar }] */
  const dosyaPlani = (lays, o = {}) => {
    const proje = o.proje || 'proje', bolum = o.bolum || 'TUMU', sec = o.secili && o.secili.length ? new Set(o.secili) : null;
    const us = uniteler(lays, bolum).filter(u => !sec || sec.has(u.ad)), bAd = bolum === 'TUMU' ? 'paftalar' : bolum;
    if (!us.length) return [];
    if (o.kip === 'tek') return [{ ad: dosyaAdi(`${proje} - ${bAd}`), paftalar: [].concat(...us.map(u => u.paftalar)) }];
    if (o.kip === 'pafta') {
      const out = [], adlar = new Set();
      for (const u of us) for (const L of u.paftalar) {
        const no = L.f && L.f.no && !String(L.name).includes(L.f.no) ? L.f.no + ' ' : '';
        let ad = dosyaAdi(`${proje} - ${no}${L.name}`), k = 2; while (adlar.has(ad)) ad = dosyaAdi(`${proje} - ${no}${L.name} (${k++})`);
        adlar.add(ad); out.push({ ad, paftalar: [L] });
      }
      return out;
    }
    return us.map(u => ({ ad: dosyaAdi(`${proje} - ${u.ad === bolum ? bAd : u.ad}`), paftalar: u.paftalar }));
  };

  /* ======================= SVG AYRIŞTIRMA ======================= */
  const ent = s => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, k) => { const l = k.toLowerCase(); if (l === 'amp') return '&'; if (l === 'lt') return '<'; if (l === 'gt') return '>'; if (l === 'quot') return '"'; if (l === 'apos') return "'"; return String.fromCodePoint(l[1] === 'x' ? parseInt(l.slice(2), 16) : parseInt(l.slice(1), 10)); });
  const svgAgac = svg => {
    const kok = { tag: '#', a: {}, ch: [] }, yig = [kok];
    const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
    let m;
    while ((m = re.exec(svg))) {
      const ust = yig[yig.length - 1];
      if (m[1] != null) { ust.ch.push({ tag: '#t', s: m[1] }); continue; }
      if (m[6] != null) { if (m[6].trim() || ust.tag === 'text' || ust.tag === 'tspan') ust.ch.push({ tag: '#t', s: ent(m[6]) }); continue; }
      if (!m[3]) continue;
      if (m[2]) { for (let i = yig.length - 1; i > 0; i--) if (yig[i].tag === m[3]) { yig.length = i; break; } continue; }
      const a = {}; m[4].replace(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g, (q, k, v1, v2) => { a[k] = ent(v1 != null ? v1 : v2); return q; });
      const n = { tag: m[3], a, ch: [] }; ust.ch.push(n); if (!m[5]) yig.push(n);
    }
    return kok;
  };

  /* ======================= MATRİS / RENK ======================= */
  const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  const sayilar = s => (String(s || '').match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || []).map(Number);
  const donusum = s => {
    let M = [1, 0, 0, 1, 0, 0]; const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g; let m;
    while ((m = re.exec(s || ''))) {
      const v = sayilar(m[2]); let T = null;
      if (m[1] === 'matrix' && v.length >= 6) T = v.slice(0, 6);
      else if (m[1] === 'translate') T = [1, 0, 0, 1, v[0] || 0, v[1] || 0];
      else if (m[1] === 'scale') T = [v[0] == null ? 1 : v[0], 0, 0, v[1] == null ? (v[0] == null ? 1 : v[0]) : v[1], 0, 0];
      else if (m[1] === 'rotate') { const r = (v[0] || 0) * Math.PI / 180, c = Math.cos(r), s2 = Math.sin(r); T = [c, s2, -s2, c, 0, 0]; if (v.length >= 3) T = mul(mul([1, 0, 0, 1, v[1], v[2]], T), [1, 0, 0, 1, -v[1], -v[2]]); }
      else if (m[1] === 'skewX') T = [1, 0, Math.tan((v[0] || 0) * Math.PI / 180), 1, 0, 0];
      else if (m[1] === 'skewY') T = [1, Math.tan((v[0] || 0) * Math.PI / 180), 0, 1, 0, 0];
      if (T) M = mul(M, T);
    }
    return M;
  };
  const ADLI = { black: [0, 0, 0], white: [1, 1, 1], red: [1, 0, 0], green: [0, 0.5, 0], blue: [0, 0, 1], gray: [0.5, 0.5, 0.5], grey: [0.5, 0.5, 0.5], yellow: [1, 1, 0] };
  const renk = s => {
    s = String(s || '').trim().toLowerCase(); if (!s || s === 'none' || s === 'transparent') return null;
    let m = s.match(/^#([0-9a-f]{3})$/); if (m) return [...m[1]].map(c => parseInt(c + c, 16) / 255);
    m = s.match(/^#([0-9a-f]{6})$/); if (m) return [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16) / 255);
    m = s.match(/^rgba?\(([^)]*)\)/); if (m) { const v = m[1].split(',').map(x => x.trim()); return v.slice(0, 3).map(x => x.endsWith('%') ? parseFloat(x) / 100 : parseFloat(x) / 255).map(x => Math.max(0, Math.min(1, x || 0))); }
    return ADLI[s] || [0, 0, 0];
  };
  const f = n => { const r = Math.round(n * 1000) / 1000; return Object.is(r, -0) ? '0' : String(r); };
  const fr = c => c.map(x => f(x)).join(' ');

  /* ======================= YAZI KODLAMA ======================= */
  /* ana fontlar: WinAnsi + Türkçe (Windows-1254 düzeni: Ğ D0, İ DD, Ş DE, ğ F0, ı FD, ş FE) */
  const WIN = { '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8A, '‹': 0x8B, 'Œ': 0x8C, 'Ž': 0x8E, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B, 'œ': 0x9C, 'ž': 0x9E, 'Ÿ': 0x9F, 'Ğ': 0xD0, 'İ': 0xDD, 'Ş': 0xDE, 'ğ': 0xF0, 'ı': 0xFD, 'ş': 0xFE };
  const TR_YER = new Set([0xD0, 0xDD, 0xDE, 0xF0, 0xFD, 0xFE]);
  const winKod = ch => { if (WIN[ch] != null) return WIN[ch]; const c = ch.codePointAt(0); if (c >= 0x20 && c <= 0x7E) return c; if (c >= 0xA0 && c <= 0xFF && !TR_YER.has(c)) return c; return null; };
  const SYM = {}; { const g = 'ΑΒΧΔΕΦΓΗΙϑΚΛΜΝΟΠΘΡΣΤΥςΩΞΨΖ', k = 'αβχδεφγηιϕκλμνοπθρστυϖωξψζ'; for (let i = 0; i < 26; i++) { SYM[g[i]] = 0x41 + i; SYM[k[i]] = 0x61 + i; } }
  Object.assign(SYM, { 'ϖ': 0x76, '≤': 0xA3, '≥': 0xB3, '∞': 0xA5, '≠': 0xB9, '≈': 0xBB, '√': 0xD6, '∑': 0xE5, '∅': 0xC6, '⌀': 0xC6, '∆': 0x44, 'Ω': 0x57, 'µ': 0x6D, '→': 0xAE, '←': 0xAC, '↑': 0xAD, '↓': 0xAF, '↔': 0xAB, '∂': 0xB6, '∫': 0xF2, '′': 0xA2, '″': 0xB2, '∠': 0xD0, '⋅': 0xD7, '∙': 0xD7, '∼': 0x7E, '∈': 0xCE, '∩': 0xC7, '∪': 0xC8, '⊥': 0x5E, '∴': 0x5C, '≡': 0xBA, '∝': 0xB5, '∇': 0xD1, '∏': 0xD5, '¬': 0xD8 });
  delete SYM['µ']; delete SYM['¬']; // WinAnsi'de var
  const ZAPF = { '✓': 0x33, '✔': 0x34, '✗': 0x37, '✘': 0x38, '●': 0x6C, '■': 0x6E, '▲': 0x73, '▼': 0x74, '◆': 0x75, '★': 0x48, '☎': 0x25, '✎': 0x2F, '➔': 0xD5, '❶': 0xAC };
  /* metni font parçalarına böler: [{ sym: '' (ana font) | 'FS' (Symbol) | 'FZ' (ZapfDingbats), b: [bayt] }] */
  const yaziParca = s => {
    const out = []; let cur = null;
    for (const ch of String(s)) {
      let sym = '', b = winKod(ch);
      if (b == null && SYM[ch] != null) { sym = 'FS'; b = SYM[ch]; }
      else if (b == null && ZAPF[ch] != null) { sym = 'FZ'; b = ZAPF[ch]; }
      if (b == null) b = 0x3F; // ?
      if (!cur || cur.sym !== sym) { cur = { sym, b: [] }; out.push(cur); }
      cur.b.push(b);
    }
    return out;
  };
  const pdfDizgi = b => '(' + b.map(x => x === 0x28 || x === 0x29 || x === 0x5C ? '\\' + String.fromCharCode(x) : x < 32 || x > 126 ? '\\' + x.toString(8).padStart(3, '0') : String.fromCharCode(x)).join('') + ')';
  const FONTLAR = ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique', 'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic', 'Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique'];
  const fontSec = (aile, kalin, egik) => {
    const a = String(aile || '').toLowerCase(), k = (kalin ? 1 : 0) + (egik ? 2 : 0);
    const t = /courier|mono|consol/.test(a) ? 8 : (/times|georgia|garamond|(^|[\s,"'])serif/.test(a) && !/sans/.test(a.split(',')[0]) ? 4 : 0);
    return { ad: 'F' + (t + k + 1), dar: /narrow|condensed|dar\b/.test(a.split(',')[0]) };
  };

  /* ======================= YOL (path) ======================= */
  /* SVG yay → kübik Bézier parçaları (uç nokta biçimi, SVG 1.1 F.6) */
  const yayBezier = (x1, y1, rx, ry, phi, fa, fs, x2, y2) => {
    if (x1 === x2 && y1 === y2) return [];
    rx = Math.abs(rx); ry = Math.abs(ry); if (!rx || !ry) return [[x1, y1, x2, y2, x2, y2]];
    const c = Math.cos(phi), s = Math.sin(phi), dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, xp = c * dx + s * dy, yp = -s * dx + c * dy;
    let L = xp * xp / (rx * rx) + yp * yp / (ry * ry); if (L > 1) { L = Math.sqrt(L); rx *= L; ry *= L; }
    const sg = fa === fs ? -1 : 1, num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp, co = sg * Math.sqrt(Math.max(0, num / (rx * rx * yp * yp + ry * ry * xp * xp)));
    const cxp = co * rx * yp / ry, cyp = -co * ry * xp / rx, cx = c * cxp - s * cyp + (x1 + x2) / 2, cy = s * cxp + c * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
    const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry); let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
    const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9)), d = dt / n, k = 4 / 3 * Math.tan(d / 4), out = [];
    const P = t => [cx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, cy + rx * Math.cos(t) * s + ry * Math.sin(t) * c];
    const D = t => [-rx * Math.sin(t) * c - ry * Math.cos(t) * s, -rx * Math.sin(t) * s + ry * Math.cos(t) * c];
    for (let i = 0; i < n; i++) {
      const a = t1 + i * d, b = a + d, p0 = P(a), p3 = P(b), d0 = D(a), d3 = D(b);
      out.push([p0[0] + k * d0[0], p0[1] + k * d0[1], p3[0] - k * d3[0], p3[1] - k * d3[1], i === n - 1 ? x2 : p3[0], i === n - 1 ? y2 : p3[1]]);
    }
    return out;
  };
  const yolOps = d => {
    const t = String(d || '').match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || [];
    const o = []; let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, lc = null;
    const n = () => +t[i++], num = () => i < t.length && !/^[a-z]$/i.test(t[i]);
    while (i < t.length) {
      if (/^[a-z]$/i.test(t[i])) cmd = t[i++]; else if (!cmd) { i++; continue; }
      const r = cmd === cmd.toLowerCase(), C0 = cmd.toUpperCase();
      if (C0 === 'Z') { o.push('h'); x = sx; y = sy; lc = null; continue; }
      if (!num()) continue;
      if (C0 === 'M') { x = (r ? x : 0) + n(); y = (r ? y : 0) + n(); sx = x; sy = y; o.push(f(x) + ' ' + f(y) + ' m'); cmd = r ? 'l' : 'L'; lc = null; }
      else if (C0 === 'L') { x = (r ? x : 0) + n(); y = (r ? y : 0) + n(); o.push(f(x) + ' ' + f(y) + ' l'); lc = null; }
      else if (C0 === 'H') { x = (r ? x : 0) + n(); o.push(f(x) + ' ' + f(y) + ' l'); lc = null; }
      else if (C0 === 'V') { y = (r ? y : 0) + n(); o.push(f(x) + ' ' + f(y) + ' l'); lc = null; }
      else if (C0 === 'C' || C0 === 'S') {
        let a, b; if (C0 === 'C') { a = [(r ? x : 0) + n(), (r ? y : 0) + n()]; } else a = lc ? [2 * x - lc[0], 2 * y - lc[1]] : [x, y];
        b = [(r ? x : 0) + n(), (r ? y : 0) + n()]; const e = [(r ? x : 0) + n(), (r ? y : 0) + n()];
        o.push([a[0], a[1], b[0], b[1], e[0], e[1]].map(f).join(' ') + ' c'); lc = b; x = e[0]; y = e[1];
      } else if (C0 === 'Q' || C0 === 'T') {
        const q = C0 === 'Q' ? [(r ? x : 0) + n(), (r ? y : 0) + n()] : (lc ? [2 * x - lc[0], 2 * y - lc[1]] : [x, y]), e = [(r ? x : 0) + n(), (r ? y : 0) + n()];
        o.push([x + 2 / 3 * (q[0] - x), y + 2 / 3 * (q[1] - y), e[0] + 2 / 3 * (q[0] - e[0]), e[1] + 2 / 3 * (q[1] - e[1]), e[0], e[1]].map(f).join(' ') + ' c'); lc = q; x = e[0]; y = e[1];
      } else if (C0 === 'A') {
        const rx = n(), ry = n(), ph = n(), fa = n(), fs = n(), ex = (r ? x : 0) + n(), ey = (r ? y : 0) + n();
        for (const b of yayBezier(x, y, rx, ry, ph * Math.PI / 180, fa ? 1 : 0, fs ? 1 : 0, ex, ey)) o.push(b.map(f).join(' ') + ' c');
        x = ex; y = ey; lc = null;
      } else i++;
    }
    return o.join(' ');
  };
  const daireOps = (cx, cy, rx, ry) => { const k = 0.5522847498, a = rx * k, b = ry * k;
    return `${f(cx + rx)} ${f(cy)} m ${f(cx + rx)} ${f(cy + b)} ${f(cx + a)} ${f(cy + ry)} ${f(cx)} ${f(cy + ry)} c ${f(cx - a)} ${f(cy + ry)} ${f(cx - rx)} ${f(cy + b)} ${f(cx - rx)} ${f(cy)} c ${f(cx - rx)} ${f(cy - b)} ${f(cx - a)} ${f(cy - ry)} ${f(cx)} ${f(cy - ry)} c ${f(cx + a)} ${f(cy - ry)} ${f(cx + rx)} ${f(cy - b)} ${f(cx + rx)} ${f(cy)} c h`; };
  const noktaOps = (pts, kapali) => { const v = sayilar(pts); if (v.length < 4) return ''; let s = f(v[0]) + ' ' + f(v[1]) + ' m'; for (let i = 2; i + 1 < v.length; i += 2) s += ' ' + f(v[i]) + ' ' + f(v[i + 1]) + ' l'; return kapali ? s + ' h' : s; };

  /* ======================= SVG → PDF SAYFA İÇERİĞİ ======================= */
  /* svg: C.layoutSvg çıktısı (viewBox mm, y aşağı); w, h mm. resim(href) → { bayt (JPEG), w, h } | null.
     Dönüş: { icerik (PDF içerik akışı metni), resimler: [{ ad, bayt, w, h, gri }], fontlar: Set } */
  const svgPdfSayfa = (svg, w, h, opt = {}) => {
    const agac = svgAgac(svg), o = [], kirp = {}, resimler = [], fontlar = new Set(), rIdx = new Map();
    // y'yi çevir: kullanıcı birimi mm, y aşağı
    o.push(`${f(PT)} 0 0 ${f(-PT)} 0 ${f(h * PT)} cm`, '1 J 1 j');
    const gs = [{ sc: null, fc: null, lw: null, d: null, J: 1, j: 1 }];
    const G = () => gs[gs.length - 1];
    const q = () => { o.push('q'); gs.push(Object.assign({}, G())); }, Q = () => { o.push('Q'); gs.pop(); };
    const stroke = (st) => {
      const g = G(), c = renk(st.stroke); if (!c) return false;
      const cs = fr(c); if (g.sc !== cs) { o.push(cs + ' RG'); g.sc = cs; }
      const lw = f(st.sw); if (g.lw !== lw) { o.push(lw + ' w'); g.lw = lw; }
      const da = st.dash && st.dash !== 'none' ? sayilar(st.dash).filter(x => x >= 0) : []; const ds = da.length && da.some(x => x > 0) ? '[' + da.map(f).join(' ') + '] 0 d' : '[] 0 d';
      if (g.d !== ds) { o.push(ds); g.d = ds; }
      const J = st.cap === 'butt' ? 0 : st.cap === 'square' ? 2 : 1, j = st.join === 'miter' ? 0 : st.join === 'bevel' ? 2 : 1;
      if (g.J !== J) { o.push(J + ' J'); g.J = J; } if (g.j !== j) { o.push(j + ' j'); g.j = j; }
      return true;
    };
    const fill = st => { const g = G(), c = renk(st.fill); if (!c) return false; const cs = fr(c); if (g.fc !== cs) { o.push(cs + ' rg'); g.fc = cs; } return true; };
    const boya = (yol, st, dolguOlur) => { if (!yol) return; const F = dolguOlur && fill(st), S = stroke(st); if (!F && !S) return; o.push(yol + (F && S ? ' B' : F ? ' f' : ' S')); };
    const stil = (a, ust) => {
      const st = Object.assign({}, ust), sv = (k, p) => { if (a[k] != null) st[p] = a[k]; };
      if (a.style) for (const d of a.style.split(';')) { const i = d.indexOf(':'); if (i > 0) a[d.slice(0, i).trim()] = a[d.slice(0, i).trim()] != null ? a[d.slice(0, i).trim()] : d.slice(i + 1).trim(); }
      sv('fill', 'fill'); sv('stroke', 'stroke'); sv('stroke-dasharray', 'dash'); sv('stroke-linecap', 'cap'); sv('stroke-linejoin', 'join');
      sv('font-family', 'ff'); sv('font-weight', 'fw'); sv('font-style', 'fst');
      if (a['stroke-width'] != null) st.sw = parseFloat(a['stroke-width']) || 0;
      if (a['font-size'] != null) st.fs = parseFloat(a['font-size']) || st.fs;
      return st;
    };
    const yaziCiz = (n, st) => {
      const metin = n.ch.map(c => c.tag === '#t' ? c.s : c.ch.filter(x => x.tag === '#t').map(x => x.s).join('')).join('');
      if (!metin || !metin.trim()) return; const renkF = renk(st.fill); if (!renkF) return;
      const fsec = fontSec(st.ff, /bold|[6-9]00/.test(String(st.fw || '')), /italic|oblique/.test(String(st.fst || '')));
      const fs = st.fs || 3.5, x = parseFloat(n.a.x) || 0, y = parseFloat(n.a.y) || 0, anc = n.a['text-anchor'] || st.anc;
      q(); if (n.a.transform) o.push(donusum(n.a.transform).map(f).join(' ') + ' cm');
      fill(st);
      const parcalar = yaziParca(metin); fontlar.add(fsec.ad); for (const p of parcalar) if (p.sym) fontlar.add(p.sym);
      // text-anchor middle / end için yaklaşık genişlik (Helvetica ortalama 0,55 em) — ArıtmaCAD yazıları başlangıçtan yerleşir
      const gen = anc === 'middle' || anc === 'end' ? [...metin].length * fs * 0.55 * (fsec.dar ? 0.82 : 1) : 0, dx = anc === 'middle' ? -gen / 2 : anc === 'end' ? -gen : 0;
      let s = `BT ${fsec.dar ? '82 Tz ' : ''}1 0 0 -1 ${f(x + dx)} ${f(y)} Tm`;
      for (const p of parcalar) s += ` /${p.sym || fsec.ad} ${f(fs)} Tf ${pdfDizgi(p.b)} Tj`;
      o.push(s + ' ET'); Q();
    };
    const resimCiz = (n) => {
      const href = n.a.href || n.a['xlink:href']; if (!href) return;
      let r = rIdx.get(href);
      if (r === undefined) { r = null; try { r = opt.resim ? opt.resim(href) : jpegDataUrl(href); } catch (e) { r = null; } if (r) { r.ad = 'Im' + (resimler.length + 1); resimler.push(r); } rIdx.set(href, r); }
      if (!r) return;
      const x = parseFloat(n.a.x) || 0, y = parseFloat(n.a.y) || 0, wi = parseFloat(n.a.width) || 0, he = parseFloat(n.a.height) || 0; if (!(wi > 0 && he > 0)) return;
      q(); if (n.a.transform) o.push(donusum(n.a.transform).map(f).join(' ') + ' cm'); o.push(`${f(wi)} 0 0 ${f(-he)} ${f(x)} ${f(y + he)} cm /${r.ad} Do`); Q();
    };
    const kirpYol = id => { const c = kirp[id]; if (!c) return ''; return c.map(n => n.tag === 'rect' ? `${f(+n.a.x || 0)} ${f(+n.a.y || 0)} ${f(+n.a.width || 0)} ${f(+n.a.height || 0)} re` : n.tag === 'path' ? yolOps(n.a.d) : n.tag === 'circle' ? daireOps(+n.a.cx || 0, +n.a.cy || 0, +n.a.r || 0, +n.a.r || 0) : noktaOps(n.a.points, true)).join(' '); };
    const gez = (n, ust) => {
      const t = n.tag;
      if (t === '#t' || t === 'title' || t === 'desc' || t === 'metadata' || t === 'style' || t === 'script') return;
      if (t === 'defs') { for (const c of n.ch) if (c.tag === 'clipPath' && c.a.id) kirp[c.a.id] = c.ch.filter(x => x.tag !== '#t'); return; }
      if (t === 'clipPath') { if (n.a.id) kirp[n.a.id] = n.ch.filter(x => x.tag !== '#t'); return; }
      if (n.a.display === 'none' || n.a.visibility === 'hidden') return;
      const st = stil(n.a, ust);
      if (n.a['text-anchor']) st.anc = n.a['text-anchor'];
      if (t === 'text') { yaziCiz(n, st); return; }
      const tr = t !== 'svg' && n.a.transform ? donusum(n.a.transform) : null, cp = (n.a['clip-path'] || '').match(/url\(#([^)]+)\)/), yk = cp ? kirpYol(cp[1]) : '';
      const sar = !!(tr || yk); if (sar) { q(); if (tr) o.push(tr.map(f).join(' ') + ' cm'); if (yk) o.push(yk + ' W n'); }
      switch (t) {
        case 'line': boya(`${f(+n.a.x1 || 0)} ${f(+n.a.y1 || 0)} m ${f(+n.a.x2 || 0)} ${f(+n.a.y2 || 0)} l`, st, false); break;
        case 'polyline': boya(noktaOps(n.a.points, false), st, true); break;
        case 'polygon': boya(noktaOps(n.a.points, true), st, true); break;
        case 'rect': { const wi = +n.a.width || 0, he = +n.a.height || 0; if (wi > 0 && he > 0) boya(`${f(+n.a.x || 0)} ${f(+n.a.y || 0)} ${f(wi)} ${f(he)} re`, st, true); break; }
        case 'circle': { const r = +n.a.r || 0; if (r > 0) boya(daireOps(+n.a.cx || 0, +n.a.cy || 0, r, r), st, true); break; }
        case 'ellipse': { const rx = +n.a.rx || 0, ry = +n.a.ry || 0; if (rx > 0 && ry > 0) boya(daireOps(+n.a.cx || 0, +n.a.cy || 0, rx, ry), st, true); break; }
        case 'path': boya(yolOps(n.a.d), st, true); break;
        case 'image': resimCiz(n); break;
        default: for (const c of n.ch) gez(c, st);
      }
      if (sar) Q();
    };
    gez(agac, { fill: '#000', stroke: 'none', sw: 1, dash: null, cap: 'butt', join: 'miter', ff: 'Arial', fw: '', fst: '', fs: 3.5 });
    return { icerik: o.join('\n'), resimler, fontlar };
  };

  /* ======================= JPEG / BASE64 ======================= */
  const b64 = s => { if (typeof atob === 'function') { const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; } return new Uint8Array(Buffer.from(s, 'base64')); };
  const jpegBoyut = u => { let i = 2; while (i + 9 < u.length) { if (u[i] !== 0xFF) { i++; continue; } const m = u[i + 1], L = u[i + 2] << 8 | u[i + 3]; if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: u[i + 5] << 8 | u[i + 6], w: u[i + 7] << 8 | u[i + 8], n: u[i + 9] }; i += 2 + L; } return null; };
  const jpegDataUrl = href => { const m = String(href).match(/^data:image\/jpe?g;base64,(.*)$/i); if (!m) return null; const bayt = b64(m[1]), b = jpegBoyut(bayt); return b ? { bayt, w: b.w, h: b.h, gri: b.n === 1 } : null; };

  /* ======================= PDF DOSYASI ======================= */
  const utf16 = s => { let h = 'FEFF'; for (const ch of String(s)) { const c = ch.codePointAt(0); if (c > 0xFFFF) { const v = c - 0x10000; h += (0xD800 + (v >> 10)).toString(16).padStart(4, '0') + (0xDC00 + (v & 0x3FF)).toString(16).padStart(4, '0'); } else h += c.toString(16).padStart(4, '0'); } return '<' + h.toUpperCase() + '>'; };
  const ascii = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xFF; return u; };
  const sikistir = async u => {
    if (typeof CompressionStream === 'undefined') return null;
    try { const cs = new CompressionStream('deflate'), w = cs.writable.getWriter(); w.write(u); w.close(); const buf = await new Response(cs.readable).arrayBuffer(); return new Uint8Array(buf); } catch (e) { return null; }
  };
  /* sayfalar: [{ svg, w, h (mm), ad (yer imi) }] → Uint8Array (PDF 1.4). o: { baslik, resim, sikistir (vars. true), ilerleme(i, n) } */
  const pdfOlustur = async (sayfalar, o = {}) => {
    const nesne = []; // her biri: { s: başlık metni, akis: Uint8Array | null }
    const yeni = () => { nesne.push(null); return nesne.length; };
    const koy = (id, s, akis) => { nesne[id - 1] = { s, akis }; };
    const kat = yeni(), sayfalarId = yeni(), bilgi = yeni();
    const enc = yeni(); koy(enc, '<< /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences [208 /Gbreve 221 /Idotaccent 222 /Scedilla 240 /gbreve 253 /dotlessi 254 /scedilla] >>');
    const fontId = {}; FONTLAR.forEach((ad, i) => { const id = yeni(); fontId['F' + (i + 1)] = id; koy(id, `<< /Type /Font /Subtype /Type1 /BaseFont /${ad} /Encoding ${enc} 0 R >>`); });
    { const id = yeni(); fontId.FS = id; koy(id, '<< /Type /Font /Subtype /Type1 /BaseFont /Symbol >>'); }
    { const id = yeni(); fontId.FZ = id; koy(id, '<< /Type /Font /Subtype /Type1 /BaseFont /ZapfDingbats >>'); }
    const fontDict = yeni(); koy(fontDict, '<< ' + Object.entries(fontId).map(([k, v]) => `/${k} ${v} 0 R`).join(' ') + ' >>');
    const kids = [], imler = [];
    for (let i = 0; i < sayfalar.length; i++) {
      const P = sayfalar[i]; if (o.ilerleme) await o.ilerleme(i, sayfalar.length, P);
      const r = svgPdfSayfa(P.svg, P.w, P.h, { resim: o.resim });
      const xo = r.resimler.map(im => { const id = yeni(); koy(id, `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /${im.gri ? 'DeviceGray' : 'DeviceRGB'} /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bayt.length} >>`, im.bayt); return `/${im.ad} ${id} 0 R`; });
      const ham = ascii(r.icerik), z = o.sikistir === false ? null : await sikistir(ham), ic = yeni();
      koy(ic, `<< /Length ${(z || ham).length}${z ? ' /Filter /FlateDecode' : ''} >>`, z || ham);
      const sid = yeni();
      koy(sid, `<< /Type /Page /Parent ${sayfalarId} 0 R /MediaBox [0 0 ${f(P.w * PT)} ${f(P.h * PT)}] /Resources << /ProcSet [/PDF /Text /ImageC /ImageB] /Font ${fontDict} 0 R${xo.length ? ' /XObject << ' + xo.join(' ') + ' >>' : ''} >> /Contents ${ic} 0 R >>`);
      kids.push(sid); imler.push(P.ad || ('Sayfa ' + (i + 1)));
    }
    koy(sayfalarId, `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`);
    // yer imleri: her sayfa (pafta adı)
    let ana = '';
    if (kids.length > 1) {
      const ol = yeni(), ids = kids.map(() => yeni());
      ids.forEach((id, i) => koy(id, `<< /Title ${utf16(imler[i])} /Parent ${ol} 0 R${i ? ` /Prev ${ids[i - 1]} 0 R` : ''}${i < ids.length - 1 ? ` /Next ${ids[i + 1]} 0 R` : ''} /Dest [${kids[i]} 0 R /Fit] >>`));
      koy(ol, `<< /Type /Outlines /First ${ids[0]} 0 R /Last ${ids[ids.length - 1]} 0 R /Count ${ids.length} >>`);
      ana = ` /Outlines ${ol} 0 R /PageMode /UseOutlines`;
    }
    koy(kat, `<< /Type /Catalog /Pages ${sayfalarId} 0 R${ana} >>`);
    koy(bilgi, `<< /Title ${utf16(o.baslik || 'Paftalar')} /Producer ${utf16('ArıtmaCAD')} /Creator ${utf16('ArıtmaCAD')} >>`);
    // yaz
    const parca = [], ofs = []; let boy = 0; const ekle = u => { parca.push(u); boy += u.length; };
    ekle(ascii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
    nesne.forEach((n, i) => { ofs[i] = boy; ekle(ascii(`${i + 1} 0 obj\n${n.s}\n`)); if (n.akis) { ekle(ascii('stream\n')); ekle(n.akis); ekle(ascii('\nendstream\n')); } ekle(ascii('endobj\n')); });
    const xref = boy; let x = `xref\n0 ${nesne.length + 1}\n0000000000 65535 f \n`; for (const v of ofs) x += String(v).padStart(10, '0') + ' 00000 n \n';
    ekle(ascii(x + `trailer\n<< /Size ${nesne.length + 1} /Root ${kat} 0 R /Info ${bilgi} 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
    const out = new Uint8Array(boy); let p = 0; for (const u of parca) { out.set(u, p); p += u.length; }
    return out;
  };

  const SAF = { ISO, paftaKagidi, kagitAdi, uniteAdi, uniteler, dosyaPlani, dosyaAdi, bolumPaftalari, svgAgac, donusum, renk, yaziParca, winKod, fontSec, yolOps, yayBezier, svgPdfSayfa, pdfOlustur, jpegBoyut };
  if (typeof module !== 'undefined' && module.exports) module.exports = SAF;
  if (!C || typeof document === 'undefined') return;
  C.paftaPdf = SAF;

  /* ======================= PROGRAM İÇİ: PDFKAYDET ======================= */
  const OTO = { Mimari: 'MIMARIPAFTA', Mekanik: 'TESISATPAFTA', Elektrik: 'ELEKTRIKPAFTA', Statik: 'STATIKCIZ' }; // bölümün otomatik paftalama komutu
  const tr = s => (window.DIL && DIL.t ? DIL.t(s) : s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lays = () => (C.doc && C.doc.layouts) || [];
  const gruplar = () => { const g = Array.isArray(C.doc.set.grups) ? C.doc.set.grups.slice() : []; for (const L of lays()) if (L.grp && !g.includes(L.grp)) g.push(L.grp); return g; };
  const ayar = (k, d) => { try { const v = localStorage.getItem('aritmacad.pdf.' + k); return v == null ? d : v; } catch (e) { return d; } };
  const ayarYaz = (k, v) => { try { localStorage.setItem('aritmacad.pdf.' + k, v); } catch (e) { } };
  const bekle = () => new Promise(r => setTimeout(r, 0));

  /* bölümde pafta yoksa otomatik paftalama (sorulara varsayılan cevap) */
  const otoPaftala = async (bolum, I) => {
    const ad = OTO[bolum], def = ad && C.cmds[ad]; if (!def) return false;
    C.log(`${bolum} ${tr('bölümünde pafta yok — önce otomatik paftalama çalışıyor:')} ${ad}`);
    const v = (p, d) => Promise.resolve(d), I2 = Object.assign({}, I, { kw: async (p, o, d) => d != null ? d : (o && o[0] && o[0][0]), num: v, str: v, int: v });
    try { await def.fn(I2, C); } catch (er) { if (!(er && er.cancel)) { console.error(er); C.warn(tr('Otomatik paftalama yapılamadı') + ': ' + (er && er.message || er)); } }
    return bolumPaftalari(lays(), bolum).length > 0;
  };

  /* resimler: PNG vb. → JPEG (beyaz zemin) */
  const resimHazirla = async svgler => {
    const map = new Map(), hrefs = new Set();
    for (const s of svgler) s.replace(/<image\b[^>]*?\s(?:xlink:)?href="([^"]+)"/g, (m, h) => { hrefs.add(h); return m; });
    for (const h of hrefs) {
      if (/^data:image\/jpe?g;/i.test(h)) { map.set(h, jpegDataUrl(h)); continue; }
      try {
        const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = h; });
        const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0);
        map.set(h, jpegDataUrl(cv.toDataURL('image/jpeg', 0.92)));
      } catch (e) { map.set(h, null); }
    }
    return h => map.get(h) || null;
  };

  /* kayıt klasörü: kullanıcı bir kez seçer, tarayıcı hafızasında (IndexedDB) tutulur; sonraki kayıtlar sormadan oraya yazılır */
  const idb = (ne, deger) => new Promise(res => {
    try {
      const rq = indexedDB.open('aritmacad-pdf', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('t');
      rq.onerror = () => res(null);
      rq.onsuccess = () => { try { const tx = rq.result.transaction('t', ne === 'yaz' ? 'readwrite' : 'readonly'), st = tx.objectStore('t'), r = ne === 'yaz' ? st.put(deger, 'klasor') : st.get('klasor'); r.onsuccess = () => res(ne === 'yaz' ? true : r.result || null); r.onerror = () => res(null); } catch (e) { res(null); } };
    } catch (e) { res(null); }
  });
  const klasorSec = async () => { try { const d = await window.showDirectoryPicker({ id: 'aritmacad-pdf', mode: 'readwrite' }); await idb('yaz', d); return d; } catch (e) { return null; } };
  /* izin: düğme tıklamasının içinde sorulur (tarayıcı kuralı) */
  const klasorIzin = async d => { try { if ((await d.queryPermission({ mode: 'readwrite' })) === 'granted') return true; return (await d.requestPermission({ mode: 'readwrite' })) === 'granted'; } catch (e) { return false; } };

  /* dosyaları kaydet: seçilen klasöre doğrudan; klasör yoksa tek dosya → kaydet penceresi, çok dosya → klasör seç; bu tarayıcıda hiçbiri yoksa indir */
  const kaydet = async (dosyalar, klasor) => {
    if (klasor) { for (const d of dosyalar) { const fh = await klasor.getFileHandle(d.ad + '.pdf', { create: true }), w = await fh.createWritable(); await w.write(d.bayt); await w.close(); } return tr('klasör') + ': ' + klasor.name; }
    if (dosyalar.length > 1 && window.showDirectoryPicker) {
      let dir = null; try { dir = await window.showDirectoryPicker({ id: 'aritmacad-pdf', mode: 'readwrite' }); } catch (e) { if (e && e.name === 'AbortError') return 'iptal'; dir = null; }
      if (dir) { for (const d of dosyalar) { const fh = await dir.getFileHandle(d.ad + '.pdf', { create: true }), w = await fh.createWritable(); await w.write(d.bayt); await w.close(); } return tr('klasör') + ': ' + dir.name; }
    }
    if (dosyalar.length === 1 && window.showSaveFilePicker) {
      try { const h = await window.showSaveFilePicker({ suggestedName: dosyalar[0].ad + '.pdf', types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }] }); const w = await h.createWritable(); await w.write(dosyalar[0].bayt); await w.close(); return h.name; }
      catch (e) { if (e && e.name === 'AbortError') return 'iptal'; }
    }
    for (const d of dosyalar) { C.download(new Blob([d.bayt], { type: 'application/pdf' }), d.ad + '.pdf'); await new Promise(r => setTimeout(r, 350)); }
    return tr('İndirilenler');
  };

  /* PDF üret ve kaydet. o: { bolum, kip, secili, mono } */
  C.paftaPdfKaydet = async (o) => {
    const proje = dosyaAdi(C.doc.set.name || 'proje'), plan = dosyaPlani(lays(), Object.assign({ proje }, o));
    if (!plan.length) { C.warn(tr('Kaydedilecek pafta yok.')); return null; }
    try { C.g3Guncelle && C.g3Guncelle(false); } catch (er) { }
    const dosyalar = [], ozet = [];
    let say = 0; const top = plan.reduce((s, d) => s + d.paftalar.length, 0);
    C.log(`${tr('PDF hazırlanıyor:')} ${plan.length} ${tr('dosya')}, ${top} ${tr('pafta')}…`);
    for (const d of plan) {
      const sayfalar = [];
      for (const L of d.paftalar) {
        try { const r = C.layoutSvg(L, { mono: o.mono }), k = kagitAdi(r.w, r.h); sayfalar.push({ svg: r.svg, w: r.w, h: r.h, ad: L.name }); ozet.push(k.etiket); }
        catch (er) { console.error(er); C.warn(`${L.name}: ${tr('çizilemedi')} (${er && er.message || er})`); }
      }
      if (!sayfalar.length) continue;
      const resim = await resimHazirla(sayfalar.map(p => p.svg));
      const bayt = await pdfOlustur(sayfalar, { baslik: d.ad, resim, ilerleme: async (i, n, P) => { say++; await bekle(); } });
      dosyalar.push({ ad: d.ad, bayt, n: sayfalar.length });
    }
    if (!dosyalar.length) return null;
    const yer = await kaydet(dosyalar, o.klasor);
    if (yer === 'iptal') { C.log(tr('PDF kaydı iptal edildi.')); return null; }
    const say2 = {}; for (const k of ozet) say2[k] = (say2[k] || 0) + 1;
    C.log(`${tr('PDF kaydedildi')}: ${dosyalar.length} ${tr('dosya')}, ${ozet.length} ${tr('pafta')} (${Object.entries(say2).map(([k, n]) => n > 1 ? `${n} × ${k}` : k).join(', ')}) — ${yer}. ${tr('Her sayfa paftanın kendi kâğıt boyutunda.')}`);
    return dosyalar;
  };

  /* seçim penceresi */
  const pencere = (bolum0) => new Promise(res => {
    const gs = gruplar(), say = g => bolumPaftalari(lays(), g).length;
    const b = C.modal(tr('PDF kaydet'), `
      <div class="fld"><label>${tr('Bölüm')}</label><select id="pdBol"><option value="TUMU">${tr('Tüm bölümler')} (${lays().length})</option>${gs.map(g => `<option value="${esc(g)}" ${g === bolum0 ? 'selected' : ''}>${esc(tr(g))} (${say(g) || tr('pafta yok') + (OTO[g] ? ' — ' + tr('otomatik paftalanır') : '')})</option>`).join('')}</select></div>
      <div class="fld" style="align-items:flex-start"><label>${tr('Üniteler')}</label><div id="pdUn" style="max-height:230px;overflow:auto;flex:1;border:1px solid var(--line);border-radius:4px;padding:4px 6px"></div></div>
      <div class="fld"><label>${tr('Kayıt şekli')}</label><select id="pdKip">
        <option value="unite">${tr('Her ünite ayrı PDF')}</option><option value="pafta">${tr('Her pafta ayrı PDF')}</option><option value="tek">${tr('Hepsi tek PDF (her pafta bir sayfa)')}</option></select></div>
      <div class="fld"><label>${tr('Renk')}</label><select id="pdRenk"><option value="S">${tr('Siyah-beyaz')}</option><option value="R">${tr('Renkli')}</option></select></div>
      <div class="fld"><label>${tr('Kayıt yeri')}</label><span style="display:flex;gap:6px;align-items:center;flex:1"><b id="pdYer" style="flex:1;overflow:hidden;text-overflow:ellipsis">…</b><button id="pdYerSec">${tr('Klasör seç…')}</button></span></div>
      <p class="hint">${tr('Kâğıt boyutu ve yönü her paftadan otomatik alınır (A0–A4, uzun ve özel ölçüler); sayfalar o boyutta kaydedilir.')} ${tr('PDF dosyaları seçtiğiniz klasöre doğrudan yazılır; klasör hatırlanır, değiştirmek için "Klasör seç".')}</p>
      <div class="bar" style="justify-content:flex-end"><button id="pdIptal">${tr('İptal')}</button><button id="pdTamam" class="pri">${tr('PDF kaydet')}</button></div>`);
    const $ = s => b.querySelector(s);
    $('#pdKip').value = ayar('kip', 'unite'); $('#pdRenk').value = ayar('renk', 'S');
    const doldur = () => {
      const bol = $('#pdBol').value, us = uniteler(lays(), bol);
      $('#pdUn').innerHTML = us.length ? `<label style="display:block;font-weight:600"><input type="checkbox" id="pdHep" checked> ${tr('Hepsi')}</label>` + us.map((u, i) => {
        const k = {}; for (const L of u.paftalar) { const e = paftaKagidi(L).etiket; k[e] = (k[e] || 0) + 1; }
        return `<label style="display:block"><input type="checkbox" data-u="${i}" checked> ${esc(u.ad)} <small style="opacity:.75">— ${u.paftalar.length} ${tr('pafta')}: ${Object.entries(k).map(([e, n]) => n > 1 ? n + ' × ' + e : e).join(', ')}</small></label>`;
      }).join('') : `<small>${OTO[bol] ? tr('Bu bölümde pafta yok; kaydederken otomatik paftalanır.') : tr('Bu bölümde pafta yok.')}</small>`;
      const hep = $('#pdHep'); if (hep) hep.onchange = () => b.querySelectorAll('[data-u]').forEach(c => { c.checked = hep.checked; });
      b._us = us;
    };
    $('#pdBol').onchange = doldur; doldur();
    let klasor = null; const yerYaz = () => { $('#pdYer').textContent = klasor ? '📁 ' + klasor.name : (window.showDirectoryPicker ? tr('seçilmedi — kaydederken sorulur') : tr('İndirilenler')); };
    if (!window.showDirectoryPicker) $('#pdYerSec').style.display = 'none';
    idb('oku').then(d => { klasor = d; yerYaz(); }); yerYaz();
    $('#pdYerSec').onclick = async () => { const d = await klasorSec(); if (d) { klasor = d; yerYaz(); } };
    let bitti = false; const son = r => { if (bitti) return; bitti = true; clearInterval(tm); C.closeModal(); res(r); };
    $('#pdIptal').onclick = () => son(null);
    $('#pdTamam').onclick = async () => {
      const us = b._us || [], sec = [...b.querySelectorAll('[data-u]')].filter(c => c.checked).map(c => us[+c.dataset.u].ad);
      if (us.length && !sec.length) { C.warn(tr('En az bir ünite seçin.')); return; }
      if (window.showDirectoryPicker) { // klasör: hatırlanan (izinle) ya da şimdi seçilen — tıklamanın içinde
        if (klasor && !(await klasorIzin(klasor))) klasor = null;
        if (!klasor) klasor = await klasorSec();
        if (!klasor) { yerYaz(); return; }
      }
      ayarYaz('kip', $('#pdKip').value); ayarYaz('renk', $('#pdRenk').value);
      son({ klasor, bolum: $('#pdBol').value, kip: $('#pdKip').value, mono: $('#pdRenk').value === 'S', secili: sec.length === us.length ? [] : sec });
    };
    const tm = setInterval(() => { const m = document.querySelector('#modal'); if (m && m.classList.contains('hidden')) son(null); }, 300);
  });

  C.addCommand(['PDFKAYDET', 'PAFTAPDFKAYDET', 'BOLUMPDF', 'PDFSAVE'], 'Bölümün paftalarını PDF kaydeder: her ünite ayrı, her pafta ayrı ya da hepsi tek PDF. Kâğıt boyutu her paftadan otomatik alınır (A0–A4, uzun paftalar). Bölümde pafta yoksa önce otomatik paftalar. PDFKAYDET [Mimari | Mekanik | Statik | Elektrik | TUMU]', async (I) => {
    const kuy = C.cmd && C.cmd.queue && C.cmd.queue.length ? String(await I.str(tr('Bölüm'), 'TUMU')) : '';
    const gs = gruplar(), bul = s => gs.find(g => g.toLocaleUpperCase('tr') === String(s).toLocaleUpperCase('tr')) || (OTO[s] ? s : null);
    let bolum = kuy ? (/^(TUMU|TÜMÜ|HEPSI|ALL)$/i.test(kuy) ? 'TUMU' : bul(kuy) || 'TUMU') : (C.grpCur && gs.includes(C.grpCur) ? C.grpCur : 'TUMU');
    if (bolum !== 'TUMU' && !bolumPaftalari(lays(), bolum).length && OTO[bolum]) { await otoPaftala(bolum, I); C.emit('layouts'); }
    if (!lays().length) { C.warn(tr('Pafta yok. Önce bölümün paftalama komutunu çalıştırın (ör. MIMARIPAFTA, TESISATPAFTA, ELEKTRIKPAFTA).')); return; }
    const sec = await pencere(bolum); if (!sec) return;
    if (sec.bolum !== 'TUMU' && !bolumPaftalari(lays(), sec.bolum).length) { if (!(await otoPaftala(sec.bolum, I))) { C.warn(tr('Bu bölümde pafta yok.')); return; } C.emit('layouts'); }
    await C.paftaPdfKaydet(sec);
  }, { noUndo: true });

  /* şerit: her sekmeye "PDF" paneli (bölüm sekmesinde o bölüm seçili gelir) */
  const PANEL = 'PDF';
  const serit = () => {
    const R = C.ribbon; if (!R || !Array.isArray(R.tabs)) return false; let deg = false;
    for (const tab of R.tabs) {
      if (!Array.isArray(tab[1]) || tab[1].some(p => p[0] === PANEL)) continue;
      const g = OTO[tab[0]] || gruplar().includes(tab[0]) ? tab[0] : '', cmd = g ? 'PDFKAYDET ' + g : 'PDFKAYDET';
      tab[1].push([PANEL, [{ cmd, t: tr('PDF kaydet'), i: 'print', big: true, opts: [[cmd, tr('PDF kaydet…')], ['PDFKAYDET TUMU', tr('Tüm bölümler')]] }]]); deg = true;
    }
    return deg;
  };
  try {
    if (serit()) C.ribbon.render();
    const r0 = C.ribbon && C.ribbon.render; if (r0 && !r0._pdf) { C.ribbon.render = function () { serit(); return r0.apply(this, arguments); }; C.ribbon.render._pdf = true; }
    setTimeout(() => { try { if (serit()) C.ribbon.render(); } catch (e) { } }, 0);
  } catch (er) { console.error('PDF şerit', er); }
})(typeof window !== 'undefined' ? window.C : null);

/* ArıtmaCAD — yazı motoru: yazı stilleri, TEXT / MTEXT hizalama (AutoCAD'deki 13 nokta), satır kaydırma,
   genişlik çarpanı, eğiklik, eğri boyunca yazı; ekran / SVG çizimi */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, RAD = Math.PI / 180;

  /* ---------- stiller ---------- */
  const FONTS = ['Arial', 'Arial Narrow', 'Calibri', 'Segoe UI', 'Tahoma', 'Verdana', 'Century Gothic', 'Times New Roman', 'Georgia', 'Courier New', 'Consolas', 'ISOCPEUR', 'Romans (CAD)'];
  const FONT_FILE = { 'Arial': 'arial.ttf', 'Arial Narrow': 'arialn.ttf', 'Calibri': 'calibri.ttf', 'Segoe UI': 'segoeui.ttf', 'Tahoma': 'tahoma.ttf', 'Verdana': 'verdana.ttf', 'Century Gothic': 'gothic.ttf', 'Times New Roman': 'times.ttf', 'Georgia': 'georgia.ttf', 'Courier New': 'cour.ttf', 'Consolas': 'consola.ttf', 'ISOCPEUR': 'isocpeur.ttf', 'Romans (CAD)': 'romans.shx' };
  const FONT_CSS = { 'Romans (CAD)': '"Romans", "ISOCPEUR", "Arial Narrow", Arial, sans-serif', 'ISOCPEUR': '"ISOCPEUR", "Arial Narrow", Arial, sans-serif', 'Arial Narrow': '"Arial Narrow", "Liberation Sans Narrow", Arial, sans-serif' };
  C.FONTS = FONTS;
  C.fontFile = n => FONT_FILE[n] || (/\.(ttf|shx|otf)$/i.test(n) ? n : n.toLowerCase().replace(/\s+/g, '') + '.ttf');
  C.fontFromFile = f => {
    const l = String(f || '').toLowerCase().replace(/^.*[\\/]/, '');
    for (const [k, v] of Object.entries(FONT_FILE)) if (l === v || l.replace(/\.\w+$/, '') === v.replace(/\.\w+$/, '')) return k;
    if (/isocp/.test(l)) return 'ISOCPEUR'; if (/romans|simplex|^txt|monotxt|romand|romanc|isoct/.test(l)) return 'Romans (CAD)';
    if (/times/.test(l)) return 'Times New Roman'; if (/cour/.test(l)) return 'Courier New'; if (/arialn/.test(l)) return 'Arial Narrow'; if (/calibri/.test(l)) return 'Calibri';
    return 'Arial';
  };
  const DEF = { name: 'Standard', font: 'Arial', h: 0, wf: 1, obl: 0, bold: false, italic: false };
  C.styles = () => { const d = C.doc; if (!d.styles) d.styles = {}; if (!d.styles.Standard) d.styles.Standard = Object.assign({}, DEF); return d.styles; };
  C.textStyle = n => { const S = C.styles(); return S[n] || S.Standard; };
  C.curStyle = () => (C.doc.cur.style && C.styles()[C.doc.cur.style]) ? C.doc.cur.style : 'Standard';
  const fam = st => FONT_CSS[st.font] || `"${st.font}", Arial, sans-serif`;
  C.fontCss = (st, px) => `${st.italic ? 'italic ' : ''}${st.bold ? 'bold ' : ''}${px}px ${fam(st)}`;
  C.fontFamily = fam;

  /* ---------- ölçüm ---------- */
  let mctx = null; const mcache = new Map();
  C.measureText = (s, h, st) => { // birim cinsinden genişlik (genişlik çarpanı hariç); h = büyük harf yüksekliği
    if (!s) return 0; st = st || C.textStyle();
    if (typeof document === 'undefined') return s.length * h * 0.78;
    if (!mctx) mctx = document.createElement('canvas').getContext('2d');
    const key = st.font + '|' + (st.bold ? 1 : 0) + (st.italic ? 1 : 0) + '|' + s; let w = mcache.get(key);
    if (w == null) { mctx.font = C.fontCss(st, 100); w = mctx.measureText(s).width / 100; if (mcache.size > 8000) mcache.clear(); mcache.set(key, w); }
    return w * h / 0.72;
  };

  /* ---------- hizalama ---------- */
  C.JUST = { L: [0, 'base'], C: [0.5, 'base'], R: [1, 'base'], M: [0.5, 'mid'], TL: [0, 'top'], TC: [0.5, 'top'], TR: [1, 'top'], ML: [0, 'mid'], MC: [0.5, 'mid'], MR: [1, 'mid'], BL: [0, 'bot'], BC: [0.5, 'bot'], BR: [1, 'bot'] };
  C.JUST_TR = { L: 'Sol (taban çizgisi)', C: 'Orta (taban çizgisi)', R: 'Sağ (taban çizgisi)', M: 'Merkez', TL: 'Üst sol', TC: 'Üst orta', TR: 'Üst sağ', ML: 'Orta sol', MC: 'Orta merkez', MR: 'Orta sağ', BL: 'Alt sol', BC: 'Alt orta', BR: 'Alt sağ' };
  /* yazının yerel yerleşimi: satırlar {s, x, y(taban), w}, kutu [x0,y0,x1,y1] (çapa noktası = 0,0; x yazı yönünde, y yukarı) */
  C.textLayout = pr => {
    const st = C.textStyle(pr.st), h = pr.h || 1, wf = pr.wf || st.wf || 1, obl = pr.obl != null && pr.obl !== '' ? +pr.obl : (st.obl || 0), lsp = (pr.ls || 1) * h * 5 / 3;
    let lines = String(pr.s == null ? '' : pr.s).split('\n');
    if (pr.mw > 0) { // MTEXT: kutu genişliğine göre satır kaydır
      const out = [];
      for (const para of lines) { let cur = ''; for (const w of para.split(' ')) { const t = cur ? cur + ' ' + w : w; if (cur && C.measureText(t, h, st) * wf > pr.mw) { out.push(cur); cur = w; } else cur = t; } out.push(cur); }
      lines = out;
    }
    const ws = lines.map(l => C.measureText(l, h, st) * wf), n = lines.length;
    const [hx, va] = C.JUST[pr.al] || C.JUST.L;
    const top = h, bot = -(n - 1) * lsp - 0.25 * h;
    const ay = va === 'top' ? top : va === 'mid' ? (n > 1 ? (top + bot) / 2 : h / 2) : va === 'bot' ? bot : 0;
    const L = lines.map((s, i) => ({ s, x: -hx * ws[i], y: -i * lsp - ay, w: ws[i] }));
    let x0 = Math.min(0, ...L.map(l => l.x)), x1 = Math.max(0, ...L.map(l => l.x + l.w));
    if (pr.mw > 0) { x0 = Math.min(x0, -hx * pr.mw); x1 = Math.max(x1, -hx * pr.mw + pr.mw); }
    const sk = Math.tan(obl * RAD) * h; if (sk > 0) x1 += sk; else x0 += sk;
    return { lines: L, box: [x0, bot - ay, x1, top - ay], st, wf, obl, h, lsp };
  };
  const toWorld = (pr, x, y) => { const c = Math.cos(pr.rot || 0), s = Math.sin(pr.rot || 0); return [pr.p[0] + x * c - y * s, pr.p[1] + x * s + y * c, pr.p[2] || 0]; };
  C.textCorners = pr => { const b = C.textLayout(pr).box; return [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]].map(([x, y]) => toWorld(pr, x, y)); };
  C.textW = pr => { const b = C.textLayout(pr).box; return b[2] - b[0]; };
  C.textToWorld = toWorld;

  /* ---------- çizim (tuval) ---------- */
  C.drawTextCanvas = (ctx, pr, view) => {
    const px = pr.h * view.s / 0.72;
    if (px < 2.5) { if (px > 0.6) { const q = C.textCorners(pr).map(p => view.w2s(p)); ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]); ctx.stroke(); ctx.globalAlpha = 1; } return; }
    const Ly = C.textLayout(pr), q = view.w2s(pr.p), k = view.s, tn = Math.tan((Ly.obl || 0) * RAD);
    ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(-((pr.rot || 0) + (view.rot || 0)));
    ctx.font = C.fontCss(Ly.st, px); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    for (const ln of Ly.lines) { if (!ln.s) continue; ctx.save(); ctx.translate(ln.x * k, -ln.y * k); ctx.transform(Ly.wf, 0, -tn, 1, 0, 0); ctx.fillText(ln.s, 0, 0); ctx.restore(); }
    ctx.restore();
  };
  /* ---------- SVG ---------- */
  const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  C.textSvg = (pr, P, k, col) => { // P: model -> kağıt (y aşağı), k: kağıt birimi / model birimi
    const Ly = C.textLayout(pr), c = P(pr.p), fs = (pr.h * k / 0.72).toFixed(3), tn = -Math.tan((Ly.obl || 0) * RAD), st = Ly.st;
    const body = Ly.lines.filter(l => l.s).map(l => `<text transform="translate(${(l.x * k).toFixed(3)},${(-l.y * k).toFixed(3)}) matrix(${Ly.wf},0,${tn.toFixed(4)},1,0,0)">${xml(l.s)}</text>`).join('');
    return `<g transform="translate(${c[0].toFixed(3)},${c[1].toFixed(3)}) rotate(${(-M.deg(pr.rot || 0)).toFixed(3)})" font-family='${fam(st).replace(/'/g, '')}' font-size="${fs}"${st.bold ? ' font-weight="bold"' : ''}${st.italic ? ' font-style="italic"' : ''} fill="${col}" stroke="none">${body}</g>`;
  };

  /* ---------- TEXT varlığı ---------- */
  const ext = e => ({ st: e.st, wf: e.wf, obl: e.obl, mt: e.mt, mw: e.mw && e.ann && e.hp ? e.mw * C.annoH(e.hp) / e.h : e.mw, ls: e.ls });
  /* ölçekli (annotative) yazı: yükseklik kağıt mm (hp) olarak saklanır, model yüksekliği o anki / pencere ölçeğine göre hesaplanır */
  C.textH = e => (e.ann && e.hp ? C.annoH(e.hp) : e.h);
  C.textSetH = (e, h) => { e.h = h; if (e.ann) e.hp = h * 1000 / C.doc.set.anno; };
  { const ne0 = C.newEnt; C.newEnt = function (type, props) { const e = ne0.apply(this, arguments); if ((type === 'text' || type === 'ctext') && e.ann == null && e.h > 0) { e.ann = true; e.hp = e.h * 1000 / C.doc.set.anno; } return e; }; }
  Object.assign(T.text, {
    label: 'Yazı',
    prims: e => [C.prim.TX(e.p, C.textH(e), e.s, (e.rot || 0) * RAD, e.al || 'L', ext(e))],
    xf: (e, X) => { e.p = X.p(e.p); e.h *= X.s; if (e.hp) e.hp *= X.s; if (e.mw) e.mw *= X.s; const v = X.v([Math.cos((e.rot || 0) * RAD), Math.sin((e.rot || 0) * RAD), 0]); let r = Math.atan2(v[1], v[0]) / RAD; if (X.mir) { r = ((r % 360) + 360) % 360; if (r > 90 && r <= 270) r -= 180; } e.rot = r; },
    info: e => `${e.mt ? 'MTEXT' : 'TEXT'} "${String(e.s).slice(0, 40)}${String(e.s).length > 40 ? '…' : ''}" h=${M.fmt(C.textH(e), 3)}${e.ann ? ' (ölçekli, kağıtta ' + M.fmt(e.hp, 2) + ' mm)' : ''} stil=${e.st || 'Standard'} hizalama=${e.al || 'L'}${e.mw ? ' genişlik=' + M.fmt(e.mw, 2) : ''}`,
  });

  /* ---------- EĞRİ BOYUNCA YAZI ---------- */
  const pathLen = pts => { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + M.dist(pts[i - 1], pts[i])); return c; };
  const pathAt = (pts, cum, s) => {
    const n = pts.length; let i = 1; if (s <= 0) i = 1; else if (s >= cum[n - 1]) i = n - 1; else while (i < n - 1 && cum[i] < s) i++;
    const a = pts[i - 1], b = pts[i], l = cum[i] - cum[i - 1] || 1e-12, t = (s - cum[i - 1]) / l;
    return { p: M.lerp(a, b, t), d: M.norm(M.sub(b, a)) };
  };
  T.ctext = {
    label: 'Eğri yazı',
    prims: e => {
      const st = C.textStyle(e.st), h = C.textH(e), wf = e.wf || st.wf || 1, chars = [...String(e.s || '')]; if (!chars.length || !e.pts || e.pts.length < 2) return [];
      const pts = e.pts.map(M.p3), cum = pathLen(pts), Lt = cum[cum.length - 1];
      const w = chars.map(ch => C.measureText(ch, h, st) * wf), sum = w.reduce((a, b) => a + b, 0);
      let gap = e.cs || 0; if (e.al === 'F' && chars.length > 1) gap = (Lt - sum) / (chars.length - 1);
      const tot = sum + gap * (chars.length - 1);
      let s = e.al === 'C' ? (Lt - tot) / 2 : e.al === 'R' ? Lt - tot : 0;
      const off = e.off != null ? e.off * (h / (e.h || h)) : h * 0.2, out = [];
      chars.forEach((ch, i) => {
        const at = pathAt(pts, cum, s + w[i] / 2), nr = [-at.d[1], at.d[0], 0], base = M.add(at.p, M.mul(nr, off));
        if (ch.trim()) out.push(C.prim.TX(base, h, ch, Math.atan2(at.d[1], at.d[0]), 'C', { st: e.st, wf: e.wf, obl: e.obl }));
        s += w[i] + gap;
      });
      return out;
    },
    snaps: e => (e.pts && e.pts.length) ? [{ p: M.p3(e.pts[0]), k: 'ins' }, { p: M.p3(e.pts[e.pts.length - 1]), k: 'end' }] : [],
    xf: (e, X) => { e.pts = e.pts.map(X.p); e.h *= X.s; if (e.hp) e.hp *= X.s; if (e.off) e.off *= X.s; if (e.cs) e.cs *= X.s; if (X.mir) e.pts.reverse(); },
    info: e => `"${String(e.s).slice(0, 40)}" h=${M.fmt(e.h, 3)} konum=${e.al || 'C'} eğriden=${M.fmt(e.off != null ? e.off : e.h * 0.2, 3)}`,
  };
  /* bir nesneden yazı yolu (okunur yönde) */
  C.pathFromEnt = (e, flip) => {
    let pts = null;
    if (e.type === 'circle') { pts = []; for (let i = 0; i <= 96; i++) { const a = (270 - 360 * i / 96) * RAD; pts.push([e.c[0] + Math.cos(a) * e.r, e.c[1] + Math.sin(a) * e.r, e.c[2] || 0]); } }
    else if (e.type === 'arc') {
      const a0 = e.a0 * RAD, sw = M.normAng((e.a1 - e.a0) * RAD) || Math.PI * 2, mid = a0 + sw / 2, n = Math.max(8, Math.ceil(sw / (Math.PI / 48)));
      pts = []; for (let i = 0; i <= n; i++) { const a = a0 + sw * i / n; pts.push([e.c[0] + Math.cos(a) * e.r, e.c[1] + Math.sin(a) * e.r, e.c[2] || 0]); }
      if (Math.sin(mid) > 0) pts.reverse(); // üst yaylarda soldan sağa okunur
    } else if (e.type === 'line') pts = [M.p3(e.a), M.p3(e.b)];
    else if (e.type === 'ctext') pts = e.pts.map(M.p3);
    else { const pr = C.prims(e).find(q => q.k === 'P' || q.k === 'L'); if (pr) pts = pr.k === 'L' ? [pr.a, pr.b] : (pr.c ? pr.pts.concat([pr.pts[0]]) : pr.pts.slice()); }
    if (!pts || pts.length < 2) return null;
    if (e.type !== 'circle' && e.type !== 'arc' && pts[0][0] > pts[pts.length - 1][0] + 1e-9) pts.reverse();
    if (flip) pts.reverse();
    return pts.map(M.p3);
  };
})(typeof window !== 'undefined' ? window.C : globalThis.C);

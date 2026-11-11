/* ArıtmaCAD — KOT İŞARETİ STİLLERİ + CAD çizgi yazı tipi (Romans).
   Ayarlardan seçilen kot işareti (C.doc.set.kotStil) çizimdeki TÜM kotlara (kesit, görünüş, elle konan) aynı anda uygulanır.
   Kot yazıları "KOT" yazı stilindedir: Romans (CAD) — AutoCAD'de romans.shx; ekranda ve paftada Hershey Roman Simplex çizgi fontuyla çizilir
   (AutoCAD'in romans/simplex fontu bu fonttan türetilmiştir), böylece ArıtmaCAD'de ve AutoCAD'de aynı görünür.
   Font verisi: The Hershey Fonts were originally created by Dr. A. V. Hershey while working at the U. S. National Bureau of Standards.
   The format of the Font data in this distribution was originally created by James Hurt, Cognition, Inc., 900 Technology Park Drive, Billerica, MA 01821. */
(function (C) {
  'use strict';
  const M = C.M, T = C.T;
  /* ---------- Hershey Roman Simplex (ASCII 32–126) ---------- */
  const G = ["JZ", "MWRFRT RRYQZR[SZRY", "JZNFNM RVFVM", "H]SBLb RYBRb RLOZO RKUYU", "H\\PBP_ RTBT_ RYIWGTFPFMGKIKKLMMNOOUQWRXSYUYXWZT[P[MZKX", "F^[FI[ RNFPHPJOLMMKMIKIIJGLFNFPGSHVHYG[F RWTUUTWTYV[X[ZZ[X[VYTWT", "E_\\O\\N[MZMYNXPVUTXRZP[L[JZIYHWHUISJRQNRMSKSIRGPFNGMIMKNNPQUXWZY[[[\\Z\\Y", "MWRHQGRFSGSIRKQL", "KYVBTDRGPKOPOTPYR]T`Vb", "KYNBPDRGTKUPUTTYR]P`Nb", "JZRFRR RMIWO RWIMO", "E_RIR[ RIR[R", "MWSZR[QZRYSZS\\R^Q_", "E_IR[R", "MWRYQZR[SZRY", "G][BIb", "H\\QFNGLJKOKRLWNZQ[S[VZXWYRYOXJVGSFQF", "H\\NJPISFS[", "H\\LKLJMHNGPFTFVGWHXJXLWNUQK[Y[", "H\\MFXFRNUNWOXPYSYUXXVZS[P[MZLYKW", "H\\UFKTZT RUFU[", "H\\WFMFLOMNPMSMVNXPYSYUXXVZS[P[MZLYKW", "H\\XIWGTFRFOGMJLOLTMXOZR[S[VZXXYUYTXQVOSNRNOOMQLT", "H\\YFO[ RKFYF", "H\\PFMGLILKMMONSOVPXRYTYWXYWZT[P[MZLYKWKTLRNPQOUNWMXKXIWGTFPF", "H\\XMWPURRSQSNRLPKMKLLINGQFRFUGWIXMXRWWUZR[P[MZLX", "MWRMQNROSNRM RRYQZR[SZRY", "MWRMQNROSNRM RSZR[QZRYSZS\\R^Q_", "F^ZIJRZ[", "E_IO[O RIU[U", "F^JIZRJ[", "I[LKLJMHNGPFTFVGWHXJXLWNVORQRT RRYQZR[SZRY", "E`WNVLTKQKOLNMMPMSNUPVSVUUVS RQKOMNPNSOUPV RWKVSVUXVZV\\T]Q]O\\L[JYHWGTFQFNGLHJJILHOHRIUJWLYNZQ[T[WZYYZX RXKWSWUXV", "I[RFJ[ RRFZ[ RMTWT", "G\\KFK[ RKFTFWGXHYJYLXNWOTP RKPTPWQXRYTYWXYWZT[K[", "H]ZKYIWGUFQFOGMILKKNKSLVMXOZQ[U[WZYXZV", "G\\KFK[ RKFRFUGWIXKYNYSXVWXUZR[K[", "H[LFL[ RLFYF RLPTP RL[Y[", "HZLFL[ RLFYF RLPTP", "H]ZKYIWGUFQFOGMILKKNKSLVMXOZQ[U[WZYXZVZS RUSZS", "G]KFK[ RYFY[ RKPYP", "NVRFR[", "JZVFVVUYTZR[P[NZMYLVLT", "G\\KFK[ RYFKT RPOY[", "HYLFL[ RL[X[", "F^JFJ[ RJFR[ RZFR[ RZFZ[", "G]KFK[ RKFY[ RYFY[", "G]PFNGLIKKJNJSKVLXNZP[T[VZXXYVZSZNYKXIVGTFPF", "G\\KFK[ RKFTFWGXHYJYMXOWPTQKQ", "G]PFNGLIKKJNJSKVLXNZP[T[VZXXYVZSZNYKXIVGTFPF RSWY]", "G\\KFK[ RKFTFWGXHYJYLXNWOTPKP RRPY[", "H\\YIWGTFPFMGKIKKLMMNOOUQWRXSYUYXWZT[P[MZKX", "JZRFR[ RKFYF", "G]KFKULXNZQ[S[VZXXYUYF", "I[JFR[ RZFR[", "F^HFM[ RRFM[ RRFW[ R\\FW[", "H\\KFY[ RYFK[", "I[JFRPR[ RZFRP", "H\\YFK[ RKFYF RK[Y[", "KYOBOb RPBPb ROBVB RObVb", "KYKFY^", "KYTBTb RUBUb RNBUB RNbUb", "JZPLRITL RMORJWO RRJR[", "JZJ]Z]", "MWSFRGQIQKRLSKRJ", "I\\XMX[ RXPVNTMQMONMPLSLUMXOZQ[T[VZXX", "H[LFL[ RLPNNPMSMUNWPXSXUWXUZS[P[NZLX", "I[XPVNTMQMONMPLSLUMXOZQ[T[VZXX", "I\\XFX[ RXPVNTMQMONMPLSLUMXOZQ[T[VZXX", "I[LSXSXQWOVNTMQMONMPLSLUMXOZQ[T[VZXX", "MYWFUFSGRJR[ ROMVM", "I\\XMX]W`VaTbQbOa RXPVNTMQMONMPLSLUMXOZQ[T[VZXX", "I\\MFM[ RMQPNRMUMWNXQX[", "NVQFRGSFREQF RRMR[", "MWRFSGTFSERF RSMS^RaPbNb", "IZMFM[ RWMMW RQSX[", "NVRFR[", "CaGMG[ RGQJNLMOMQNRQR[ RRQUNWMZM\\N]Q][", "I\\MMM[ RMQPNRMUMWNXQX[", "I\\QMONMPLSLUMXOZQ[T[VZXXYUYSXPVNTMQM", "H[LMLb RLPNNPMSMUNWPXSXUWXUZS[P[NZLX", "I\\XMXb RXPVNTMQMONMPLSLUMXOZQ[T[VZXX", "KXOMO[ ROSPPRNTMWM", "J[XPWNTMQMNNMPNRPSUTWUXWXXWZT[Q[NZMX", "MYRFRWSZU[W[ ROMVM", "I\\MMMWNZP[S[UZXW RXMX[", "JZLMR[ RXMR[", "G]JMN[ RRMN[ RRMV[ RZMV[", "J[MMX[ RXMM[", "JZLMR[ RXMR[P_NaLbKb", "J[XMM[ RMMXM RM[X[", "KYTBRCQDPFPHQJRKSMSOQQ RRCQEQGRISJTLTNSPORSTTVTXSZR[Q]Q_Ra RQSSUSWRYQZP\\P^Q`RaTb", "NVRBRb", "KYPBRCSDTFTHSJRKQMQOSQ RRCSESGRIQJPLPNQPURQTPVPXQZR[S]S_Ra RSSQUQWRYSZT\\T^S`RaPb", "F^IUISJPLONOPPTSVTXTZS[Q RISJQLPNPPQTTVUXUZT[Q[O", "KYQFOGNINKOMQNSNUMVKVIUGSFQF"];
  const dec = s => { const L = s.charCodeAt(0) - 82, R = s.charCodeAt(1) - 82, st = []; let cur = []; for (let i = 2; i < s.length; i += 2) { if (s[i] === ' ' && s[i + 1] === 'R') { if (cur.length) st.push(cur); cur = []; continue; } cur.push([s.charCodeAt(i) - 82, s.charCodeAt(i + 1) - 82]); } if (cur.length) st.push(cur); return { L, R, st }; };
  const GL = new Map(); G.forEach((s, i) => GL.set(String.fromCharCode(32 + i), dec(s)));
  const dots = y => [[[-3.5, y - 1], [-4.5, y], [-3.5, y + 1], [-2.5, y], [-3.5, y - 1]], [[3.5, y - 1], [2.5, y], [3.5, y + 1], [4.5, y], [3.5, y - 1]]];
  const dot = y => [[[0, y - 1], [-1, y], [0, y + 1], [1, y], [0, y - 1]]];
  const breve = y => [[[-4, y - 2], [-3, y], [-1, y + 1], [1, y + 1], [3, y], [4, y - 2]]];
  const ced = [[[0, 9], [0.5, 10.5], [2, 11.5], [2, 13], [0, 14], [-2, 13.5]]];
  const comp = (base, add) => { const b = GL.get(base); return { L: b.L, R: b.R, st: b.st.concat(add) }; };
  GL.set('ç', comp('c', ced)); GL.set('Ç', comp('C', ced)); GL.set('ş', comp('s', ced)); GL.set('Ş', comp('S', ced));
  GL.set('ğ', comp('g', breve(-9))); GL.set('Ğ', comp('G', breve(-15)));
  GL.set('ö', comp('o', dots(-9))); GL.set('Ö', comp('O', dots(-15))); GL.set('ü', comp('u', dots(-9))); GL.set('Ü', comp('U', dots(-15)));
  { const i = GL.get('i'); GL.set('ı', { L: i.L, R: i.R, st: [[[0, -5], [0, 9]]] }); }
  GL.set('İ', comp('I', dot(-15)));
  GL.set('±', { L: -13, R: 13, st: [[[0, -9], [0, 3]], [[-8, -3], [8, -3]], [[-8, 8], [8, 8]]] });
  GL.set('°', { L: -7, R: 7, st: [[[-1, -12], [-3, -11], [-4, -9], [-3, -7], [-1, -6], [1, -6], [3, -7], [4, -9], [3, -11], [1, -12], [-1, -12]]] });
  GL.set('Ø', comp('O', [[[-9, 11], [9, -14]]])); GL.set('ø', comp('o', [[[-7, 10], [7, -7]]]));
  GL.set('²', { L: -6, R: 6, st: [[[-3, -10], [-3, -11], [-2, -12], [-1, -12.5], [1, -12.5], [2, -12], [3, -11], [3, -10], [2, -9], [-4, -4], [4, -4]]] });
  GL.set('³', { L: -6, R: 6, st: [[[-3, -12.5], [3, -12.5], [0, -9], [1.5, -9], [3, -8], [3, -6], [2, -5], [0, -4], [-2, -4], [-3, -5]]] });
  GL.set('×', { L: -11, R: 11, st: [[[-6, -6], [6, 6]], [[6, -6], [-6, 6]]] });
  const CAP = 21, BASE = 9;
  const ok = s => { for (const ch of String(s)) if (!GL.has(ch)) return false; return true; };
  const adv = s => { let w = 0; for (const ch of String(s)) { const g = GL.get(ch); w += g.R - g.L; } return w / CAP; };
  /* yerel çizgiler (büyük harf yüksekliği = 1, taban y = 0, y yukarı) */
  const strokes = s => { const out = []; let x = 0; for (const ch of String(s)) { const g = GL.get(ch); for (const pl of g.st) out.push(pl.map(([px, py]) => [x + (px - g.L) / CAP, (BASE - py) / CAP])); x += (g.R - g.L) / CAP; } return out; };
  C.strokeFont = { ok, adv, strokes };
  const isR = st => !!st && (st.font === 'Romans (CAD)' || st.font === 'Türkçe (CAD)'); // turkce.shx de aynı çizgi fontla (Türkçe harfler tanımlı)
  /* ölçüm / ekran / SVG — Romans stiliyle yazılan tüm yazılar çizgi fontla */
  { const m0 = C.measureText; C.measureText = function (s, h, st) { const y = st || C.textStyle(); if (s && isR(y) && ok(s)) return adv(s) * h; return m0.apply(this, arguments); }; }
  const lineOK = Ly => isR(Ly.st) && Ly.lines.every(l => !l.s || ok(l.s));
  { const d0 = C.drawTextCanvas; C.drawTextCanvas = function (ctx, pr, view) {
      if (pr.h * view.s / 0.72 < 2.5) return d0.apply(this, arguments);
      const Ly = C.textLayout(pr); if (!lineOK(Ly)) return d0.apply(this, arguments);
      const q = view.w2s(pr.p), k = view.s, tn = Math.tan((Ly.obl || 0) * Math.PI / 180), h = Ly.h, wf = Ly.wf || 1;
      ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(-((pr.rot || 0) + (view.rot || 0)));
      ctx.setLineDash([]); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = Math.max(1, Math.min(ctx.lineWidth || 1, h * k * 0.12)); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      for (const ln of Ly.lines) { if (!ln.s) continue; for (const pl of strokes(ln.s)) pl.forEach(([x, y], i) => { const X = (ln.x + (x * wf + y * tn) * h) * k, Y = -(ln.y + y * h) * k; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); }
      ctx.stroke(); ctx.restore();
    }; }
  { const s0 = C.textSvg; C.textSvg = function (pr, P, k, col) {
      const Ly = C.textLayout(pr); if (!lineOK(Ly)) return s0.apply(this, arguments);
      const c = P(pr.p), tn = Math.tan((Ly.obl || 0) * Math.PI / 180), h = Ly.h, wf = Ly.wf || 1; let d = '';
      for (const ln of Ly.lines) { if (!ln.s) continue; for (const pl of strokes(ln.s)) d += pl.map(([x, y], i) => (i ? 'L' : 'M') + ((ln.x + (x * wf + y * tn) * h) * k).toFixed(3) + ' ' + (-(ln.y + y * h) * k).toFixed(3)).join(''); }
      const sw = Math.max(0.1, Math.min(0.35, h * k * 0.07));
      return `<g transform="translate(${c[0].toFixed(3)},${c[1].toFixed(3)}) rotate(${(-M.deg(pr.rot || 0)).toFixed(3)})"><path d="${d}" fill="none" stroke="${col}" stroke-width="${sw.toFixed(3)}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    }; }

  /* ---------- KOT stili ---------- */
  const kotStyle = () => { const S = C.styles(); if (!S.KOT) S.KOT = { name: 'KOT', font: 'Romans (CAD)', h: 0, wf: 1, obl: 0, bold: false, italic: false }; return 'KOT'; };
  const { L, P, S, TX } = C.prim;
  const STY = [
    ['ornek', 'Standart — boş üçgen, dikme, üst çizgi, zemin çizgisi'],
    ['ornek_z', 'Standart, zemin çizgisi olmadan'],
    ['dolu', 'Dolu üçgen, dikme, üst çizgi'],
    ['yarim', 'Yarım dolu üçgen, dikme, üst çizgi'],
    ['basit', 'Boş üçgen + yatay çizgi (dikmesiz)'],
    ['klasik', 'Eski ArıtmaCAD (yarım dolu, yanda çizgi)'],
  ];
  C.KOT_STILLER = STY;
  C.kotStil = () => { const v = C.doc.set.kotStil; return STY.some(s => s[0] === v) ? v : 'ornek'; };
  const p0 = T.kot.prims;
  T.kot.prims = e => {
    const ps = C.pstil ? C.pstil() : null, pk = ps && ps.kot; // pafta çizim stili (pafta-stil.js): örnek projedeki kot işareti ve yazı stili
    const st = pk ? (kotStyle(), ps.yazi) : kotStyle(), tag = arr => arr.map(pr => pr.k === 'T' ? Object.assign(pr, { st }) : pr);
    const sty = pk ? pk.stil : C.kotStil();
    if (e.pk || sty === 'klasik') return tag(p0(e));
    const th = C.annoH(pk ? pk.th : C.doc.set.textH), s = Math.max(C.annoH(2.5), th * 1.25), p = M.p3(e.p), z = p[2], f = e.ters ? -1 : 1;
    const txt = (e.txt ? e.txt + ' ' : '') + C.fmtKot(e.v), tw = C.measureText(C.txL ? C.txL(txt) : txt, th, C.textStyle(st));
    const hw = s * 0.5, yt = p[1] + s, A = [p[0] - hw, yt, z], B = [p[0] + hw, yt, z], out = [];
    const tri = [p, A, B];
    if (sty === 'basit') {
      out.push(P(tri, true));
      const x1 = p[0] + f * (hw + tw + s * 0.5);
      out.push(L([p[0] - f * hw, yt, z], [x1, yt, z]));
      out.push(TX([p[0] + f * (hw + s * 0.2), yt + th * 0.3, z], th, txt, 0, f > 0 ? 'L' : 'R'));
      return tag(out);
    }
    if (sty === 'dolu') out.push(S(tri));
    if (sty === 'yarim' || sty === 'cokal') out.push(S([p, f > 0 ? A : B, [p[0], yt, z]]));
    out.push(P(tri, true));
    const lh = s * 0.75, yl = yt + lh;
    out.push(L([p[0], yt, z], [p[0], yl, z]));
    out.push(L([p[0], yl, z], [p[0] + f * (tw + s * 1.1), yl, z]));
    out.push(TX([p[0] + f * s * 0.15, yl + th * 0.3, z], th, txt, 0, f > 0 ? 'L' : 'R'));
    if (sty === 'ornek' || sty === 'cokal') out.push(L([p[0] - s * (sty === 'cokal' ? 0.85 : 1.2), p[1], z], [p[0] + s * (sty === 'cokal' ? 0.85 : 1.2), p[1], z]));
    return tag(out);
  };
  /* kot stilini değiştir → tüm kotlar */
  C.setKotStil = v => {
    if (!STY.some(s => s[0] === v)) return false; if (C.kotStil() === v && C.doc.set.kotStil === v) return true;
    C.undoStack && C.undoStack.push(C.snapshot()); C.redoStack = [];
    C.doc.set.kotStil = v; kotStyle(); let n = 0;
    for (const e of C.doc.ents) { if (e._c) { delete e._c.p; delete e._c.b; } if (e.type === 'kot') n++; }
    C.changed(); C.emit('layouts'); if (C.views) for (const w of Object.values(C.views)) if (w && 'dirty' in w) w.dirty = true;
    C.log(`Kot işareti: ${STY.find(s => s[0] === v)[1]} — ${n} kota uygulandı.`); return true;
  };
  /* önizleme (SVG) */
  C.kotPreview = (v, dark) => {
    const set = C.doc.set, sv = set.kotStil, an = set.anno; set.kotStil = v; set.anno = 100;
    let pr; try { pr = T.kot.prims({ type: 'kot', p: [0, 0, 0], v: 0.4, txt: '' }); } finally { set.kotStil = sv; set.anno = an; }
    const k = 40, P2 = q => [q[0] * k, -q[1] * k], col = dark ? '#e0a040' : '#b06a00', ln = dark ? '#c8b060' : '#555';
    let b = [1e9, 1e9, -1e9, -1e9]; const grow = q => { const a = P2(q); b = [Math.min(b[0], a[0]), Math.min(b[1], a[1]), Math.max(b[2], a[0]), Math.max(b[3], a[1])]; };
    let body = '';
    for (const q of pr) {
      if (q.k === 'L') { grow(q.a); grow(q.b); const a = P2(q.a), c = P2(q.b); body += `<line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" stroke="${ln}" stroke-width="1.2"/>`; }
      else if (q.k === 'P' || q.k === 'S') { q.pts.forEach(grow); body += `<polygon points="${q.pts.map(P2).map(a => a.join(',')).join(' ')}" fill="${q.k === 'S' ? ln : 'none'}" stroke="${ln}" stroke-width="1.2"/>`; }
      else if (q.k === 'C') { grow([q.c[0] - q.r, q.c[1] - q.r]); grow([q.c[0] + q.r, q.c[1] + q.r]); const a = P2(q.c); body += `<circle cx="${a[0]}" cy="${a[1]}" r="${q.r * k}" fill="none" stroke="${ln}" stroke-width="1.2"/>`; }
      else if (q.k === 'T') { const cs = C.textCorners(q); cs.forEach(grow); body += C.textSvg(q, P2, k, col).replace('stroke-width="', 'stroke-width="1.3" data-w="'); }
    }
    const pad = 8; return `<svg viewBox="${b[0] - pad} ${b[1] - pad} ${b[2] - b[0] + 2 * pad} ${b[3] - b[1] + 2 * pad}" width="190" height="96" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
  };
  C.kotStilSec = () => {
    if (!C.modal) return;
    const dark = true, cur = C.kotStil();
    const html = `<p class="hint">Seçtiğiniz işaret çizimdeki <b>tüm kotlara</b> (kesit, görünüş, elle konanlar ve yenileri) uygulanır. Yazı tipi: Romans (AutoCAD'de romans.shx). Yazının sağda / solda olması için kotu seçip özelliklerde "Yazı üçgenin solunda" alanını kullanın.</p>
      <div class="kotstil-grid">${STY.map(([id, t]) => `<button class="kotstil ${id === cur ? 'on' : ''}" data-kst="${id}" title="${t}"><div class="kotstil-svg">${C.kotPreview(id, dark)}</div><span>${t}</span></button>`).join('')}</div>`;
    const b = C.modal('Kot işareti', html);
    b.querySelectorAll('[data-kst]').forEach(x => x.onclick = () => { C.setKotStil(x.dataset.kst); b.querySelectorAll('[data-kst]').forEach(y => y.classList.toggle('on', y === x)); C.emit('selection'); });
  };
  C.addCommand(['KOTSTIL', 'KOTISARETI', 'KOTAYAR'], 'Kot işaretinin şeklini seçer; çizimdeki tüm kotlara uygulanır. KOTSTIL [ORNEK|ORNEK_Z|DOLU|YARIM|BASIT|KLASIK]', async (I) => {
    const E = C.cmd; if ((E.queue || []).length || E.scriptMode) { const v = String(await I.str('Kot işareti', C.kotStil())).toLowerCase(); if (!C.setKotStil(v)) C.warn('Bilinmeyen kot işareti: ' + v); return; }
    C.kotStilSec();
  }, { noUndo: true });
  { const st = document.createElement('style'); st.textContent = `.kotstil-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-top:8px}
    .kotstil{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px;border:1px solid #3a4250;border-radius:6px;background:#222a33;color:#ddd;cursor:pointer;font-size:12px;text-align:center}
    .kotstil:hover{border-color:#6a8cc0}.kotstil.on{border:2px solid #4a90e2;background:#26324a}.kotstil-svg{background:#222a33;border-radius:4px;width:190px;height:96px}`; document.head.appendChild(st); }
  C.on && C.on('doc', () => kotStyle());
})(window.C);

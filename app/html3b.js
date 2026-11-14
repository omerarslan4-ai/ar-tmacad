/* ArıtmaCAD — 3B modeli tek HTML dosyası olarak dışa aktarım (HTML3B).
   Açık projenin 3B görünümü, programdaki 3B görüntüleyicinin (view3d.js) ürettiği tamponların aynısıyla
   (renk, ışık, malzeme dokusu, su, saydam yüzeyler, kenar çizgileri, kesit düzlemi) tek bir .html dosyasına yazılır.
   Dosya internetsiz açılır: görüntüleyici (küçük WebGL kodu + programın gölgelendiricileri) ve geometri dosyanın içindedir.
   Geometri sıkıştırılır: konum mm tamsayı, normal 8 bit, renk 8 bit, sonra gzip (CompressionStream) + base64.
   Açılan sayfada: sol tuş döndür, sağ / orta tuş (ya da Shift + sol) kaydır, tekerlek yakınlaştır,
   WASD / ok tuşları yürü, Q / E aşağı / yukarı, "Başa dön" düğmesi (Home tuşu).
   Saf kısım (paketle, coz, b64, sayfa) test/html3b.test.js ile Node'da denenir. */
(function (C) {
  'use strict';
  const H = C.html3b = {};
  const T = s => (typeof window !== 'undefined' && window.DIL && window.DIL.t) ? window.DIL.t(s) : s;

  /* ---------- paketleme ----------
     Tampon düzenleri (view3d.js build ile aynı):
       'lit' : 9 sayı / köşe → konum(3) normal(3) renk(3)
       'cizgi': 9 sayı / köşe, normal sabit (0,0,1) → konum(3) renk(3) saklanır
       'doku' : 11 sayı / köşe → konum(3) normal(3) uv(2) teğet(3)
     Alan türleri: i32 (konum, mm), i8 (normal / teğet ×127), u8 (renk ×255), f32 (uv). */
  const DUZEN = {
    lit: { adim: 9, alan: [['p', 0, 3, 'i32'], ['n', 3, 3, 'i8'], ['c', 6, 3, 'u8']] },
    cizgi: { adim: 9, alan: [['p', 0, 3, 'i32'], ['c', 6, 3, 'u8']] },
    doku: { adim: 11, alan: [['p', 0, 3, 'i32'], ['n', 3, 3, 'i8'], ['uv', 6, 2, 'f32'], ['tg', 8, 3, 'i8']] },
  };
  H.DUZEN = DUZEN;
  const BOY = { i32: 4, f32: 4, i8: 1, u8: 1 };
  const kis = (v, a, b) => v < a ? a : v > b ? b : v;
  /* gruplar: [{ tur, duzen: 'lit'|'cizgi'|'doku', veri: düz dizi, ...ek alanlar (al, foam, wa, k, bump) }]
     Dönen: { gruplar: [{ ...ek alanlar, tur, duzen, n (köşe sayısı), alan: [{ ad, tip, boy, off }] }], bayt: Uint8Array } */
  H.paketle = function (gruplar) {
    const man = []; let top = 0;
    for (const g of gruplar) {
      const D = DUZEN[g.duzen], n = Math.floor((g.veri ? g.veri.length : 0) / D.adim); if (!n) continue;
      const m = {}; for (const k in g) if (k !== 'veri') m[k] = g[k]; m.n = n; m.alan = [];
      for (const [ad, , boy, tip] of D.alan) { top = (top + 3) & ~3; m.alan.push({ ad, tip, boy, off: top }); top += n * boy * BOY[tip]; }
      m._v = g.veri; man.push(m);
    }
    top = (top + 3) & ~3;
    const buf = new ArrayBuffer(top);
    for (const m of man) {
      const D = DUZEN[m.duzen], v = m._v, n = m.n; delete m._v;
      m.alan.forEach((a, ai) => {
        const bas = D.alan[ai][1], b = a.boy;
        if (a.tip === 'i32') { const o = new Int32Array(buf, a.off, n * b); for (let i = 0; i < n; i++) for (let k = 0; k < b; k++) o[i * b + k] = Math.round(v[i * D.adim + bas + k] * 1000); }
        else if (a.tip === 'f32') { const o = new Float32Array(buf, a.off, n * b); for (let i = 0; i < n; i++) for (let k = 0; k < b; k++) o[i * b + k] = v[i * D.adim + bas + k]; }
        else if (a.tip === 'u8') { const o = new Uint8Array(buf, a.off, n * b); for (let i = 0; i < n; i++) for (let k = 0; k < b; k++) o[i * b + k] = kis(Math.round(v[i * D.adim + bas + k] * 255), 0, 255); }
        else { // i8: birim vektör (uzunluk 0 ise 0 kalır)
          const o = new Int8Array(buf, a.off, n * b);
          for (let i = 0; i < n; i++) { const j = i * D.adim + bas; const x = v[j], y = v[j + 1], z = v[j + 2], L = Math.hypot(x, y, z) || 1; o[i * 3] = kis(Math.round(x / L * 127), -127, 127); o[i * 3 + 1] = kis(Math.round(y / L * 127), -127, 127); o[i * 3 + 2] = kis(Math.round(z / L * 127), -127, 127); }
        }
      });
    }
    return { gruplar: man, bayt: new Uint8Array(buf) };
  };
  /* çözücü: paketten görüntüleyicinin istediği iç içe Float32 tamponlara. Dış değişken kullanmaz (HTML'e metin olarak gömülür). */
  H.coz = function coz(gruplar, bayt) {
    const AD = { lit: 9, cizgi: 9, doku: 11 }, YER = { lit: { p: 0, n: 3, c: 6 }, cizgi: { p: 0, c: 6 }, doku: { p: 0, n: 3, uv: 6, tg: 8 } };
    const buf = bayt.buffer.slice(bayt.byteOffset, bayt.byteOffset + bayt.byteLength), out = [];
    for (const g of gruplar) {
      const adim = AD[g.duzen], n = g.n, f = new Float32Array(n * adim);
      if (g.duzen === 'cizgi') for (let i = 0; i < n; i++) f[i * adim + 5] = 1;
      for (const a of g.alan) {
        const bas = YER[g.duzen][a.ad], b = a.boy, Tp = { i32: Int32Array, f32: Float32Array, i8: Int8Array, u8: Uint8Array }[a.tip], s = new Tp(buf, a.off, n * b);
        const k = a.tip === 'i32' ? 0.001 : a.tip === 'i8' ? 1 / 127 : a.tip === 'u8' ? 1 / 255 : 1;
        for (let i = 0; i < n; i++) for (let j = 0; j < b; j++) f[i * adim + bas + j] = s[i * b + j] * k;
      }
      const r = {}; for (const q in g) if (q !== 'alan') r[q] = g[q]; r.veri = f; r.adim = adim; out.push(r);
    }
    return out;
  };
  /* base64 (tarayıcı ve Node; büyük dizide parça parça) */
  H.b64 = function (u8) {
    if (typeof Buffer !== 'undefined' && typeof window === 'undefined') return Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString('base64');
    let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s);
  };
  H.b64coz = function (s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  /* gzip (CompressionStream; yoksa sıkıştırmadan) */
  H.sikistir = async function (u8) {
    if (typeof CompressionStream === 'undefined') return { bayt: u8, sik: '' };
    const ab = await new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    return { bayt: new Uint8Array(ab), sik: 'gzip' };
  };
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const jsonGom = o => JSON.stringify(o).replace(/</g, '\\u003c'); // </script> kapanmasın

  /* ---------- görüntüleyici (HTML'in içinde çalışır; dış değişken kullanmaz) ---------- */
  function GORUNTULEYICI(S, SH, B64, coz) {
    const $ = id => document.getElementById(id), cv = $('cv'), bilgi = $('bilgi');
    const gl = cv.getContext('webgl', { antialias: true });
    if (!gl) { bilgi.textContent = S.yazi.webglYok; bilgi.style.display = 'block'; return; }
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const norm = a => { const L = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / L, a[1] / L, a[2] / L]; };
    const m4 = {
      persp: (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2), r = 1 / (n - f); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (n + f) * r, -1, 0, 0, 2 * n * f * r, 0]; },
      ortho: (l, r, b, t, n, f) => [2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1],
      look: (e, c, u) => { const z = norm(sub(e, c)), x = norm(cross(u, z)), y = cross(z, x); return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]; },
      mul: (a, b) => { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; },
      inv: m => { // Gauss-Jordan
        const a = [], o = []; for (let i = 0; i < 4; i++) { a.push([m[i], m[4 + i], m[8 + i], m[12 + i]]); o.push([0, 0, 0, 0]); o[i][i] = 1; }
        for (let c = 0; c < 4; c++) { let p = c; for (let r = c + 1; r < 4; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; if (Math.abs(a[p][c]) < 1e-14) return null; [a[c], a[p]] = [a[p], a[c]]; [o[c], o[p]] = [o[p], o[c]];
          const d = a[c][c]; for (let k = 0; k < 4; k++) { a[c][k] /= d; o[c][k] /= d; } for (let r = 0; r < 4; r++) if (r !== c) { const f = a[r][c]; if (f) for (let k = 0; k < 4; k++) { a[r][k] -= f * a[c][k]; o[r][k] -= f * o[c][k]; } } }
        const q = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) q[j * 4 + i] = o[i][j]; return q;
      },
      xf: (m, v) => [0, 1, 2, 3].map(i => m[i] * v[0] + m[4 + i] * v[1] + m[8 + i] * v[2] + m[12 + i] * v[3]),
    };
    const prog = (vs, fs, at, un) => {
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o; };
      const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
      const L = { pr: p }; for (const a of at) L[a] = gl.getAttribLocation(p, a); for (const u of un) L[u] = gl.getUniformLocation(p, u); return L;
    };
    const P1 = prog(SH.VS, SH.FS, ['p', 'n', 'c'], ['mvp', 'ld', 'lit', 'al', 'cp', 'cpOn', 'tex', 'ov', 'inv']);
    const PT = prog(SH.TVS, SH.TFS, ['p', 'n', 'uv', 'tg'], ['mvp', 'ld', 'al', 'cp', 'cpOn', 'bump', 'tc', 'tn']);
    const PW = prog(SH.WVS, SH.WFS, ['p', 'n', 'c'], ['mvp', 'ld', 'eye', 'tm', 'al', 'foam', 'wa', 'cp', 'cpOn']);
    const PB = prog(SH.BVS, SH.BFS, ['q'], ['imvp', 'eye', 'mode']);
    const bq = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bq); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const anis = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    let G = { tri: [], line: [], don: [], trans: [], water: [], mat: [], cap: [], cpl: [], grid: [] }, hazir = false;
    const tex = {};
    const dokuYukle = k => {
      if (tex[k] !== undefined || !S.dokular[k]) return; tex[k] = null; const r = {}; let say = 0;
      const mk = (src, ad) => { const im = new Image(); im.onload = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
        const pot = v => (v & (v - 1)) === 0, ok = pot(im.width) && pot(im.height);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, ok ? gl.REPEAT : gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, ok ? gl.REPEAT : gl.CLAMP_TO_EDGE);
        if (ok) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); } else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); if (anis && ok) gl.texParameterf(gl.TEXTURE_2D, anis.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(anis.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        r[ad] = t; if (++say === 2) { tex[k] = r; kirli = true; } }; im.src = src; };
      mk(S.dokular[k].col, 'tc'); mk(S.dokular[k].slope, 'tn');
    };
    /* kamera */
    const D = Math.PI / 180;
    const K = { yaw: -55 * D, pitch: 32 * D, dist: 50, t: [0, 0, 0], persp: true };
    const sigdir = () => { K.t = [S.gc[0], S.gc[1], (S.zr[0] + S.zr[1]) / 2]; K.dist = S.size * 1.5 * Math.max(1, Hh / Math.max(1, W)); kirli = true; }; // dikey ekranda (telefon) model sığsın
    const ilk = () => { if (S.kam) { K.yaw = S.kam.yaw; K.pitch = S.kam.pitch; K.dist = S.kam.dist; K.t = S.kam.t.slice(); K.persp = S.kam.persp; } else { K.yaw = -55 * D; K.pitch = 32 * D; K.persp = true; sigdir(); } yuru(false); kirli = true; };
    const goz = () => { const c = Math.cos(K.pitch); return [K.t[0] + K.dist * c * Math.cos(K.yaw), K.t[1] + K.dist * c * Math.sin(K.yaw), K.t[2] + K.dist * Math.sin(K.pitch)]; };
    let W = 1, Hh = 1, kirli = true, mvp = null, imvp = null, yurume = false, bg = S.bg, izgara = S.izgara;
    const boyut = () => { const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; W = r.width; Hh = r.height; cv.width = Math.max(1, r.width * d); cv.height = Math.max(1, r.height * d); kirli = true; };
    window.addEventListener('resize', boyut);
    const dondur = (dx, dy) => {
      const k = 0.0045, e0 = goz(); K.yaw -= dx * k; K.pitch = Math.max(-1.55, Math.min(1.5707, K.pitch + (yurume ? -dy : dy) * k));
      if (yurume) { const c = Math.cos(K.pitch); K.t = sub(e0, [K.dist * c * Math.cos(K.yaw), K.dist * c * Math.sin(K.yaw), K.dist * Math.sin(K.pitch)]); } // yürürken baş çevrilir: göz yerinde kalır
      kirli = true;
    };
    const kaydir = (dx, dy) => { const wpp = 2 * K.dist * Math.tan(22.5 * D) / Math.max(1, Hh); const r = [-Math.sin(K.yaw), Math.cos(K.yaw), 0], u = cross(norm(sub(K.t, goz())), r); K.t = sub(K.t, add(mul(r, dx * wpp), mul(u, dy * wpp))); kirli = true; };
    const isin = (sx, sy) => { if (!imvp) return null; const x = sx / W * 2 - 1, y = 1 - sy / Hh * 2, a = m4.xf(imvp, [x, y, -1, 1]), b = m4.xf(imvp, [x, y, 1, 1]); return [[a[0] / a[3], a[1] / a[3], a[2] / a[3]], [b[0] / b[3], b[1] / b[3], b[2] / b[3]]]; };
    const yakinlas = (f, sx, sy) => {
      const minD = Math.max(0.05, S.size * 0.002); let nd = K.dist * f;
      if (f < 1 && nd < minD) { const fw = norm(sub(K.t, goz())); K.t = add(K.t, mul(fw, Math.max(minD * 0.5, K.dist * (1 - f)))); K.dist = Math.max(minD, nd); kirli = true; return; }
      nd = Math.min(nd, S.size * 200); const k = nd / K.dist;
      let P = null; const r = sx != null ? isin(sx, sy) : null;
      if (r) { const e = goz(), n = norm(sub(K.t, e)), d = norm(sub(r[1], r[0])), dn = dot(d, n); if (Math.abs(dn) > 1e-6) { const s = dot(sub(K.t, r[0]), n) / dn; if (s > 0) P = add(r[0], mul(d, s)); } }
      if (P) K.t = add(P, mul(sub(K.t, P), k)); K.dist = nd; kirli = true;
    };
    const yuru = on => {
      yurume = on; $('bYuru').classList.toggle('on', on);
      /* yürürken göz ±0,00 kotundan 1,70 m yukarıda, bulunduğu yerden yapıya doğru bakar */
      if (on) { const e = goz(); e[2] = 1.7; K.persp = true; K.pitch = 0; K.dist = 1.5; const c = Math.cos(K.pitch); K.t = sub(e, [K.dist * c * Math.cos(K.yaw), K.dist * c * Math.sin(K.yaw), K.dist * Math.sin(K.pitch)]); $('bPersp').classList.add('on'); }
      kirli = true;
    };
    /* çizim */
    const ciz = (L, b, mode, lit, al) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b.b);
      gl.enableVertexAttribArray(L.p); gl.vertexAttribPointer(L.p, 3, gl.FLOAT, false, 36, 0);
      gl.enableVertexAttribArray(L.n); gl.vertexAttribPointer(L.n, 3, gl.FLOAT, false, 36, 12);
      gl.enableVertexAttribArray(L.c); gl.vertexAttribPointer(L.c, 3, gl.FLOAT, false, 36, 24);
      if (L.lit) gl.uniform1f(L.lit, lit ? 1 : 0); gl.uniform1f(L.al, al != null ? al : 1); gl.drawArrays(mode, 0, b.n);
    };
    const t0 = performance.now();
    const cizim = () => {
      gl.viewport(0, 0, cv.width, cv.height);
      const light = bg < 2; if (light) gl.clearColor(1, 1, 1, 1); else gl.clearColor(0.11, 0.12, 0.14, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      const asp = W / Math.max(1, Hh), far = K.dist * 20 + S.size * 10, near = Math.max(0.01, Math.min(K.dist / 1000, yurume ? 0.05 : 1e9));
      const P = K.persp ? m4.persp(45 * D, asp, near, far) : (() => { const h = K.dist * Math.tan(22.5 * D); return m4.ortho(-h * asp, h * asp, -h, h, -far, far); })();
      const up = Math.abs(K.pitch) > 1.55 ? [Math.cos(K.yaw + Math.PI), Math.sin(K.yaw + Math.PI), 0] : [0, 0, 1];
      const ey = goz(); mvp = m4.mul(P, m4.look(ey, K.t, up)); imvp = m4.inv(mvp);
      if (bg === 0 && imvp) { gl.useProgram(PB.pr); gl.disable(gl.DEPTH_TEST); gl.uniformMatrix4fv(PB.imvp, false, new Float32Array(imvp)); gl.uniform1f(PB.mode, 0); gl.bindBuffer(gl.ARRAY_BUFFER, bq); gl.enableVertexAttribArray(PB.q); gl.vertexAttribPointer(PB.q, 2, gl.FLOAT, false, 8, 0); gl.drawArrays(gl.TRIANGLES, 0, 6); gl.disableVertexAttribArray(PB.q); gl.enable(gl.DEPTH_TEST); }
      if (!hazir) return;
      const L = P1, M32 = new Float32Array(mvp), ld = norm([0.35, -0.5, 0.8]), clip = S.clip;
      gl.useProgram(L.pr); gl.uniformMatrix4fv(L.mvp, false, M32); gl.uniform1f(L.tex, S.tex ? 1 : 0); gl.uniform4f(L.ov, 0, 0, 0, 0); gl.uniform1f(L.inv, light ? 1 : 0); gl.uniform3f(L.ld, ld[0], ld[1], ld[2]);
      const setClip = on => { gl.uniform1f(L.cpOn, on && clip ? 1 : 0); if (clip) gl.uniform4f(L.cp, clip[0], clip[1], clip[2], clip[3]); };
      setClip(false); gl.depthMask(false); if (light) gl.uniform4f(L.ov, 0.70, 0.72, 0.74, 1); if (izgara) for (const b of G.grid) ciz(L, b, gl.LINES, false); gl.uniform4f(L.ov, 0, 0, 0, 0); gl.depthMask(true);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1, 1); setClip(true);
      for (const b of G.tri) ciz(L, b, gl.TRIANGLES, true);
      if (G.mat.length) { // malzeme dokulu yüzeyler
        const T = PT; gl.useProgram(T.pr); gl.uniformMatrix4fv(T.mvp, false, M32); gl.uniform3f(T.ld, ld[0], ld[1], ld[2]); gl.uniform1f(T.cpOn, clip ? 1 : 0); if (clip) gl.uniform4f(T.cp, clip[0], clip[1], clip[2], clip[3]);
        gl.uniform1i(T.tc, 0); gl.uniform1i(T.tn, 1); gl.uniform1f(T.al, 1);
        for (const mb of G.mat) { const tx = tex[mb.k]; if (!tx) { dokuYukle(mb.k); continue; }
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx.tc); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tx.tn); gl.activeTexture(gl.TEXTURE0); gl.uniform1f(T.bump, mb.bump || 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, mb.b); gl.enableVertexAttribArray(T.p); gl.vertexAttribPointer(T.p, 3, gl.FLOAT, false, 44, 0); gl.enableVertexAttribArray(T.n); gl.vertexAttribPointer(T.n, 3, gl.FLOAT, false, 44, 12);
          gl.enableVertexAttribArray(T.uv); gl.vertexAttribPointer(T.uv, 2, gl.FLOAT, false, 44, 24); gl.enableVertexAttribArray(T.tg); gl.vertexAttribPointer(T.tg, 3, gl.FLOAT, false, 44, 32); gl.drawArrays(gl.TRIANGLES, 0, mb.n); }
        gl.disableVertexAttribArray(T.uv); gl.disableVertexAttribArray(T.tg); gl.useProgram(L.pr);
      }
      gl.disable(gl.POLYGON_OFFSET_FILL);
      for (const b of G.line) ciz(L, b, gl.LINES, false); for (const b of G.don) ciz(L, b, gl.LINES, false);
      setClip(false); if (G.cap.length) { gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -1); for (const b of G.cap) ciz(L, b, gl.TRIANGLES, true); gl.disable(gl.POLYGON_OFFSET_FILL); } for (const b of G.cpl) ciz(L, b, gl.LINES, false); setClip(true);
      if (G.trans.length) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); for (const b of G.trans) ciz(L, b, gl.TRIANGLES, true, b.al); gl.depthMask(true); gl.disable(gl.BLEND); }
      if (G.water.length) {
        const Q = PW; gl.useProgram(Q.pr); gl.uniformMatrix4fv(Q.mvp, false, M32); gl.uniform3f(Q.ld, ld[0], ld[1], ld[2]); gl.uniform3f(Q.eye, ey[0], ey[1], ey[2]); gl.uniform1f(Q.tm, S.dalga ? (performance.now() - t0) / 1000 : 0);
        gl.uniform1f(Q.cpOn, clip ? 1 : 0); if (clip) gl.uniform4f(Q.cp, clip[0], clip[1], clip[2], clip[3]);
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
        for (const w of G.water) { gl.uniform1f(Q.foam, w.foam || 0); gl.uniform1f(Q.wa, w.wa || 0); ciz(Q, w, gl.TRIANGLES, true, w.al); }
        gl.depthMask(true); gl.disable(gl.BLEND); gl.useProgram(L.pr);
      }
    };
    /* fare / dokunma */
    const tus = new Set(); let suruk = null; const parmak = new Map();
    cv.addEventListener('contextmenu', e => e.preventDefault());
    const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); parmak.set(e.pointerId, [x, y]);
      if (parmak.size === 2) { const [a, b] = [...parmak.values()]; suruk = { iki: true, d: Math.hypot(a[0] - b[0], a[1] - b[1]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; return; }
      suruk = { x, y, mod: (e.button === 0 && !e.shiftKey) ? 'don' : 'kay' }; if (e.button === 1) e.preventDefault();
    });
    cv.addEventListener('pointermove', e => {
      if (!suruk) return; const [x, y] = pos(e);
      if (parmak.has(e.pointerId)) parmak.set(e.pointerId, [x, y]);
      if (suruk.iki) { if (parmak.size < 2) return; const [a, b] = [...parmak.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        if (d > 1 && suruk.d > 1) yakinlas(suruk.d / d, m[0], m[1]); kaydir(m[0] - suruk.m[0], m[1] - suruk.m[1]); suruk.d = d; suruk.m = m; return; }
      const dx = x - suruk.x, dy = y - suruk.y; suruk.x = x; suruk.y = y; if (suruk.mod === 'don') dondur(dx, dy); else kaydir(dx, dy);
    });
    const birak = e => { parmak.delete(e.pointerId); if (!parmak.size) suruk = null; else if (suruk && suruk.iki) suruk = null; };
    cv.addEventListener('pointerup', birak); cv.addEventListener('pointercancel', birak);
    cv.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = pos(e); yakinlas(e.deltaY > 0 ? 1.15 : 1 / 1.15, x, y); }, { passive: false });
    cv.addEventListener('dblclick', () => sigdir());
    const YON = { KeyW: [1, 0, 0], ArrowUp: [1, 0, 0], KeyS: [-1, 0, 0], ArrowDown: [-1, 0, 0], KeyA: [0, -1, 0], ArrowLeft: [0, -1, 0], KeyD: [0, 1, 0], ArrowRight: [0, 1, 0], KeyE: [0, 0, 1], PageUp: [0, 0, 1], KeyQ: [0, 0, -1], PageDown: [0, 0, -1] };
    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.code === 'Home') { e.preventDefault(); ilk(); return; }
      if (e.key === '+' || e.code === 'NumpadAdd') { yakinlas(0.8, W / 2, Hh / 2); return; } if (e.key === '-' || e.code === 'NumpadSubtract') { yakinlas(1.25, W / 2, Hh / 2); return; }
      if (YON[e.code]) { e.preventDefault(); tus.add(e.code); }
    });
    document.addEventListener('keyup', e => tus.delete(e.code)); window.addEventListener('blur', () => tus.clear());
    let son = performance.now(), hiz = 1;
    document.addEventListener('keydown', e => { hiz = e.shiftKey ? 4 : 1; }); document.addEventListener('keyup', e => { hiz = e.shiftKey ? 4 : 1; });
    const hareket = dt => {
      if (!tus.size) return; let f = 0, r = 0, u = 0; for (const c of tus) { const v = YON[c]; if (v) { f += v[0]; r += v[1]; u += v[2]; } }
      const st = (yurume ? 3 : Math.max(1, K.dist * 0.3)) * hiz * dt, fw = [-Math.cos(K.yaw), -Math.sin(K.yaw), 0], rt = [-Math.sin(K.yaw), Math.cos(K.yaw), 0];
      K.t = add(K.t, add(add(mul(fw, f * st), mul(rt, r * st)), [0, 0, u * st])); kirli = true;
    };
    /* düğmeler */
    $('bBas').onclick = ilk; $('bTum').onclick = () => sigdir();
    $('bUst').onclick = () => { yuru(false); K.yaw = -90 * D; K.pitch = 89.9 * D; sigdir(); };
    $('bPersp').onclick = () => { K.persp = !K.persp; if (!K.persp && yurume) yuru(false); $('bPersp').classList.toggle('on', K.persp); kirli = true; };
    $('bYuru').onclick = () => yuru(!yurume);
    $('bArka').onclick = () => { bg = (bg + 1) % 3; kirli = true; };
    $('bIzg').onclick = () => { izgara = !izgara; $('bIzg').classList.toggle('on', izgara); kirli = true; };
    $('bYrd').onclick = () => $('yardim').classList.toggle('acik');
    $('bPersp').classList.toggle('on', !S.kam || S.kam.persp); $('bIzg').classList.toggle('on', izgara);
    boyut(); ilk();
    const dongu = () => { const n = performance.now(), dt = Math.min(0.1, (n - son) / 1000); son = n; hareket(dt); if (G.water.length && S.dalga) kirli = true; if (kirli) { kirli = false; cizim(); } requestAnimationFrame(dongu); };
    requestAnimationFrame(dongu);
    /* veriyi aç */
    (async () => {
      try {
        let u8 = (() => { const b = atob(B64), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; })();
        if (S.sik === 'gzip') u8 = new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
        for (const g of coz(S.gruplar, u8)) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, g.veri, gl.STATIC_DRAW); (G[g.tur] || (G[g.tur] = [])).push({ b, n: g.n, al: g.al, foam: g.foam, wa: g.wa, k: g.k, bump: g.bump }); }
        for (const mb of G.mat) dokuYukle(mb.k);
        G.trans.sort((a, b) => b.al - a.al);
        hazir = true; kirli = true; bilgi.style.display = 'none';
      } catch (er) { console.error(er); bilgi.textContent = S.yazi.acilamadi + ' (' + er.message + ')'; bilgi.style.display = 'block'; }
    })();
  }
  H.GORUNTULEYICI = GORUNTULEYICI;

  /* ---------- sayfa ----------
     S: sahne bilgisi (gruplar, kamera, dokular ...), SH: gölgelendiriciler, B64: geometri. Dönen: HTML metni */
  H.sayfa = function (S, SH, B64) {
    const Y = S.yazi, baslik = esc(S.ad || 'ArıtmaCAD');
    const dg = (id, txt, ipucu) => `<button id="${id}" title="${esc(ipucu)}">${esc(txt)}</button>`;
    return `<!doctype html>
<html lang="${esc(S.dil || 'tr')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${baslik} — 3B</title>
<meta name="generator" content="ArıtmaCAD HTML3B">
<style>
html,body{margin:0;height:100%;overflow:hidden;background:#dfe4ea;font:13px/1.35 system-ui,'Segoe UI',Arial,sans-serif;color:#1d232b}
#cv{position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}#cv:active{cursor:grabbing}
#ust{position:fixed;left:10px;top:10px;right:10px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;pointer-events:none}
#ust>*{pointer-events:auto}
#ad{background:rgba(255,255,255,.88);border-radius:6px;padding:6px 10px;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.18)}
button{font:inherit;background:rgba(255,255,255,.92);border:1px solid #b9c2cc;border-radius:6px;padding:6px 10px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.12)}
button:hover{background:#fff;border-color:#4a8fd6}button.on{background:#d8e9fb;border-color:#4a8fd6}
#bBas{font-weight:600}
#yardim{position:fixed;left:10px;bottom:10px;max-width:min(420px,calc(100% - 20px));background:rgba(255,255,255,.92);border-radius:6px;padding:8px 12px;box-shadow:0 1px 4px rgba(0,0,0,.18);display:none}
#yardim.acik{display:block}#yardim b{display:inline-block;min-width:118px}
#bilgi{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(255,255,255,.95);padding:12px 18px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.2);text-align:center}
</style></head><body>
<canvas id="cv"></canvas>
<div id="ust"><span id="ad">${baslik}</span>${dg('bBas', Y.basa, Y.basaI)}${dg('bTum', Y.tum, Y.tumI)}${dg('bUst', Y.ust, Y.ustI)}${dg('bPersp', Y.persp, Y.perspI)}${dg('bYuru', Y.yuru, Y.yuruI)}${dg('bArka', Y.arka, Y.arkaI)}${dg('bIzg', Y.izg, Y.izgI)}${dg('bYrd', '?', Y.yardim)}</div>
<div id="yardim" class="acik">${Y.yardimMetni}</div>
<div id="bilgi">${esc(Y.yukleniyor)}</div>
<script type="application/octet-stream" id="veri">${B64}</script>
<script>
(function(){'use strict';
var S=${jsonGom(S)};
var SH=${jsonGom(SH)};
var coz=${H.coz.toString()};
var GORUNTULEYICI=${GORUNTULEYICI.toString()};
GORUNTULEYICI(S,SH,document.getElementById('veri').textContent.trim(),coz);
setTimeout(function(){var y=document.getElementById('yardim');if(y)y.classList.remove('acik');},9000);
})();
</script>
</body></html>
`;
  };

  /* ---------- arayüz metinleri (seçili dile çevrilerek dosyaya yazılır) ---------- */
  H.yazilar = function () {
    const sat = (a, b) => `<b>${esc(T(a))}</b> ${esc(T(b))}<br>`;
    return {
      basa: T('Başa dön'), basaI: T('İlk görünüşe dön (Home)'), tum: T('Tümünü göster'), tumI: T('Bütün modeli ekrana sığdır (çift tıklama)'),
      ust: T('Üstten'), ustI: T('Üstten bakış'), persp: T('Perspektif'), perspI: T('Perspektif / paralel izdüşüm'),
      yuru: T('Yürü'), yuruI: T('Yürüyerek gezme: fareyle etrafa bak, WASD ile yürü'), arka: T('Arka plan'), arkaI: T('Gökyüzü / beyaz / koyu'),
      izg: T('Izgara'), izgI: T('Zemin ızgarasını aç / kapat'), yardim: T('Yardım'),
      yukleniyor: T('Model yükleniyor…'), webglYok: T('Bu tarayıcıda WebGL (3B çizim) kapalı; model gösterilemiyor.'), acilamadi: T('Model açılamadı'),
      yardimMetni: sat('Sol tuş + sürükle', 'döndür') + sat('Sağ / orta tuş', 'kaydır (Shift + sol tuş da olur)') + sat('Tekerlek', 'yakınlaş / uzaklaş') +
        sat('W A S D / oklar', 'ileri, sola, geri, sağa (Shift: hızlı)') + sat('Q / E', 'aşağı / yukarı') + sat('Home', 'başa dön') + sat('Dokunmatik', 'bir parmak döndür, iki parmak yakınlaş / kaydır'),
    };
  };

  /* ---------- canlı 3B görünümden sahneyi al (tarayıcıda) ----------
     view3d.js build() ne çiziyorsa onu alır: makeBuf geçici olarak sarılır, ham diziler saklanır. */
  H.sahneAl = function (v3) {
    const kayit = new Map(), eski = v3.makeBuf, selEski = C.sel, hoverEski = [v3.hoverEnt, v3.hoverFace, v3.hoverId];
    v3.makeBuf = function (arrs, stride) { const r = eski.call(this, arrs, stride); kayit.set(r, arrs); return r; };
    try { C.sel = []; v3.build(); }
    finally { v3.makeBuf = eski; C.sel = selEski; }
    const veri = b => b ? kayit.get(b) : null, gr = [];
    const ekle = (tur, duzen, b, ek) => { const v = veri(b); if (v && v.length) gr.push(Object.assign({ tur, duzen, veri: v }, ek || {})); };
    ekle('tri', 'lit', v3.buf.tri); ekle('line', 'cizgi', v3.buf.line); ekle('don', 'cizgi', v3.buf.don);
    ekle('cap', 'lit', v3.buf.cap); ekle('cpl', 'cizgi', v3.buf.cpl); ekle('grid', 'cizgi', v3.buf.grid);
    for (const t of v3.trans || []) ekle('trans', 'lit', t.b, { al: t.al });
    for (const w of v3.waterBufs || []) ekle('water', 'lit', w.b, { al: w.al, foam: w.foam, wa: w.wa });
    for (const m of v3.matBufs || []) ekle('mat', 'doku', m.b, { k: m.k, bump: m.bump });
    const dokular = {};
    for (const m of v3.matBufs || []) {
      if (dokular[m.k]) continue; const im = C.dokuImages && C.dokuImages(m.k); if (!im) continue;
      try { dokular[m.k] = { col: im.col.toDataURL('image/jpeg', 0.85), slope: im.slope.toDataURL('image/png') }; } catch (er) { /* dokusuz yazılır */ }
    }
    const kam = v3.mvp ? { yaw: v3.yaw, pitch: v3.pitch, dist: v3.dist, t: v3.t.slice(), persp: !!v3.persp } : null; // görünüm hiç açılmadıysa sayfa modeli sığdırır
    [v3.hoverEnt, v3.hoverFace, v3.hoverId] = hoverEski; v3.invalidate(); // seçim vurgusu yeniden kurulsun
    return { gruplar: gr, dokular, kam, gc: v3.gc || [0, 0], size: v3.size || 20, zr: v3.zr || [0, 0], clip: v3.clip || null };
  };

  /* sahne → HTML (tarayıcıda; sıkıştırma eşzamansız) */
  H.yaz = async function (v3, ops = {}) {
    const sh = C.View3D && C.View3D.SHADERS; if (!sh) throw new Error(T('3B görüntüleyici yüklenmedi'));
    const s = H.sahneAl(v3);
    const ucgen = s.gruplar.filter(g => g.duzen !== 'cizgi' && g.tur !== 'grid').reduce((q, g) => q + g.veri.length / (g.duzen === 'doku' ? 33 : 27), 0);
    const pk = H.paketle(s.gruplar), sk = await H.sikistir(pk.bayt), st = C.state || {};
    const S = {
      ad: ops.ad || (C.doc && C.doc.set && C.doc.set.name) || 'ArıtmaCAD', dil: (window.DIL && window.DIL.kod && window.DIL.kod()) || 'tr', tarih: new Date().toISOString().slice(0, 10),
      gruplar: pk.gruplar, sik: sk.sik, dokular: s.dokular, kam: s.kam, gc: s.gc, size: s.size, zr: s.zr, clip: s.clip,
      bg: { ufuk: 0, beyaz: 1, siyah: 2 }[st.v3bg || 'ufuk'] ?? 0, izgara: st.v3grid !== false, tex: st.v3tex !== false, dalga: st.v3wave !== false,
      yazi: H.yazilar(),
    };
    return { html: H.sayfa(S, sh, H.b64(sk.bayt)), ucgen: Math.round(ucgen), ham: pk.bayt.length, sikisik: sk.bayt.length };
  };

  /* ---------- komut ---------- */
  if (C.addCommand) C.addCommand(['HTML3B', 'HTMLOUT', '3BHTML'], '3B modeli tek HTML dosyası olarak kaydeder (her tarayıcıda açılır, internet gerekmez; fareyle döndür, kaydır, yakınlaş, WASD ile yürü)', async () => {
    const v3 = C.views && C.views.v3; if (!v3 || v3.failed) { C.warn(T('3B görünüm kullanılamıyor (WebGL kapalı); HTML üretilemedi.')); return; }
    const r = await H.yaz(v3);
    if (!r.ucgen) { C.warn(T('3B nesne yok; HTML dosyasında gösterilecek model bulunamadı.')); return; }
    const ad = C.ascii((C.doc.set && C.doc.set.name) || 'cizim').replace(/[^\w\-]+/g, '_') + '_3B.html';
    C.download(r.html, ad, 'text/html');
    C.log(T('3B HTML kaydedildi:') + ' ' + ad + ' — ' + r.ucgen + ' ' + T('üçgen') + ', ' + (r.html.length / 1048576).toFixed(1) + ' MB. ' + T('Çift tıklayıp tarayıcıda açın.'));
  }, { noUndo: true });
})(typeof window !== 'undefined' ? window.C : globalThis.C);

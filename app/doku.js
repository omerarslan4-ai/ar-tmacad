/* ArıtmaCAD — 3B MALZEME DOKULARI (görsel kaplama + kabartma / bump, 3ds Max gibi)
   Elemanlara (perde, duvar, döşeme, kolon, kiriş, katı …) resim dokusu atanır: gerçek ölçüde (karo eni × boyu, m), açı, kabartma şiddeti.
   Hazır kütüphane (yazılımla üretilir, internet gerekmez): tuğla, klinker, gazbeton, briket, brüt beton, sıva, taş, parke taşı, ahşap, seramik.
   Kendi resimlerinizi (jpg / png) kütüphaneye ekleyebilirsiniz; bu bilgisayarda saklanır (IndexedDB).
   e.mat = { k: doku kodu, w: karo eni (m), h: karo boyu (m), rot: açı (°), bump: 0…1, yuz: 'tum' | 'dikey' } */
(function (C) {
  'use strict';
  const M = C.M, RAD = Math.PI / 180, SZ = 512;
  /* ---------- tohumlu rastgele ---------- */
  const rng = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = SZ; return c; };
  /* ince gürültü (yüzey dokusu) */
  const noise = (ctx, r, a, n, sz) => { for (let i = 0; i < n; i++) { const g = Math.floor(r() * 255); ctx.fillStyle = `rgba(${g},${g},${g},${a * r()})`; const s = 1 + r() * sz; ctx.fillRect(r() * SZ, r() * SZ, s, s); } };
  /* örgülü blok deseni (tuğla, gazbeton, briket, karo): renkli + yükseklik haritası */
  const bond = (o) => {
    const col = mk(), hg = mk(), c = col.getContext('2d'), h = hg.getContext('2d'), r = rng(o.seed || 7);
    c.fillStyle = o.joint; c.fillRect(0, 0, SZ, SZ); h.fillStyle = '#3a3a3a'; h.fillRect(0, 0, SZ, SZ);
    noise(c, r, 0.25, 4000, 2);
    const rows = o.rows, cols = o.cols, bh = SZ / rows, bw = SZ / cols, j = o.jw * SZ;
    for (let y = 0; y < rows; y++) {
      const off = (o.half !== false && y % 2) ? bw / 2 : 0;
      for (let x = -1; x <= cols; x++) {
        const x0 = x * bw + off + j / 2, y0 = y * bh + j / 2, w = bw - j, hh = bh - j;
        const base = o.cols3[Math.floor(r() * o.cols3.length)], v = (r() - 0.5) * (o.vary || 0.12);
        const rgb = base.map(q => Math.max(0, Math.min(255, Math.round(q * (1 + v)))));
        c.fillStyle = `rgb(${rgb})`; c.fillRect(x0, y0, w, hh);
        // yüz dokusu ve kenar yıpranması
        c.save(); c.beginPath(); c.rect(x0, y0, w, hh); c.clip(); noise(c, r, o.grain || 0.18, Math.floor(w * hh / 18), 2.2); if (o.speck) for (let i = 0; i < w * hh / 400; i++) { c.fillStyle = `rgba(0,0,0,${0.15 * r()})`; c.beginPath(); c.arc(x0 + r() * w, y0 + r() * hh, 0.6 + r() * 1.6, 0, 7); c.fill(); } c.restore();
        h.fillStyle = '#d8d8d8'; h.fillRect(x0, y0, w, hh); h.fillStyle = '#ffffff'; h.fillRect(x0 + 2, y0 + 2, w - 4, hh - 4);
      }
    }
    return { col, hg };
  };
  /* gürültülü düz yüzey (beton, sıva) */
  const plain = (o) => {
    const col = mk(), hg = mk(), c = col.getContext('2d'), h = hg.getContext('2d'), r = rng(o.seed || 3);
    c.fillStyle = `rgb(${o.base})`; c.fillRect(0, 0, SZ, SZ); h.fillStyle = '#808080'; h.fillRect(0, 0, SZ, SZ);
    for (let i = 0; i < 60; i++) { const g = (r() - 0.5) * 30; c.fillStyle = `rgba(${g > 0 ? 255 : 0},${g > 0 ? 255 : 0},${g > 0 ? 255 : 0},${Math.abs(g) / 400})`; c.beginPath(); c.arc(r() * SZ, r() * SZ, 20 + r() * 90, 0, 7); c.fill(); }
    noise(c, r, o.grain || 0.22, 26000, 1.6); noise(h, r, 0.5, 30000, 1.8);
    if (o.pores) for (let i = 0; i < o.pores; i++) { const x = r() * SZ, y = r() * SZ, s = 0.8 + r() * 2.2; c.fillStyle = 'rgba(40,40,40,0.55)'; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); h.fillStyle = '#202020'; h.beginPath(); h.arc(x, y, s, 0, 7); h.fill(); }
    if (o.form) { // kalıp izi: panel derzleri + tij delikleri
      c.strokeStyle = 'rgba(60,60,60,0.45)'; c.lineWidth = 2; h.strokeStyle = '#303030'; h.lineWidth = 3;
      for (const t of [0, SZ / 2]) { c.beginPath(); c.moveTo(0, t + 1); c.lineTo(SZ, t + 1); c.stroke(); h.beginPath(); h.moveTo(0, t + 1); h.lineTo(SZ, t + 1); h.stroke(); }
      c.beginPath(); c.moveTo(1, 0); c.lineTo(1, SZ); c.stroke(); h.beginPath(); h.moveTo(1, 0); h.lineTo(1, SZ); h.stroke();
      for (const [x, y] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) { c.fillStyle = 'rgba(70,70,70,0.8)'; c.beginPath(); c.arc(x * SZ, y * SZ, 6, 0, 7); c.fill(); h.fillStyle = '#101010'; h.beginPath(); h.arc(x * SZ, y * SZ, 6, 0, 7); h.fill(); }
    }
    return { col, hg };
  };
  /* doğal taş (düzensiz örgü) */
  const stone = (o) => {
    const col = mk(), hg = mk(), c = col.getContext('2d'), h = hg.getContext('2d'), r = rng(o.seed || 11);
    c.fillStyle = o.joint; c.fillRect(0, 0, SZ, SZ); h.fillStyle = '#303030'; h.fillRect(0, 0, SZ, SZ);
    const pts = []; for (let i = 0; i < o.n; i++) pts.push([r() * SZ, r() * SZ]);
    const all = []; for (const p of pts) for (const dx of [-SZ, 0, SZ]) for (const dy of [-SZ, 0, SZ]) all.push([p[0] + dx, p[1] + dy, pts.indexOf(p)]);
    const cc = pts.map(() => { const f = 0.85 + r() * 0.3; return o.cols3[Math.floor(r() * o.cols3.length)].map(q => Math.round(q * f)); });
    const ic = c.getImageData(0, 0, SZ, SZ), ih = h.getImageData(0, 0, SZ, SZ);
    for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) {
      let d1 = 1e9, d2 = 1e9, k = 0; for (const q of all) { const d = (q[0] - x) ** 2 + (q[1] - y) ** 2; if (d < d1) { d2 = d1; d1 = d; k = q[2]; } else if (d < d2) d2 = d; }
      const edge = Math.sqrt(d2) - Math.sqrt(d1), i = (y * SZ + x) * 4;
      if (edge > o.jw) { const g = (r() - 0.5) * 22; ic.data[i] = cc[k][0] + g; ic.data[i + 1] = cc[k][1] + g; ic.data[i + 2] = cc[k][2] + g; const hv = 200 + Math.min(55, (edge - o.jw) * 6); ih.data[i] = ih.data[i + 1] = ih.data[i + 2] = hv; }
    }
    c.putImageData(ic, 0, 0); h.putImageData(ih, 0, 0); return { col, hg };
  };
  /* ahşap tahta */
  const wood = (o) => {
    const col = mk(), hg = mk(), c = col.getContext('2d'), h = hg.getContext('2d'), r = rng(o.seed || 5), n = o.n || 4, pw = SZ / n;
    h.fillStyle = '#e0e0e0'; h.fillRect(0, 0, SZ, SZ);
    for (let i = 0; i < n; i++) { const b = o.cols3[i % o.cols3.length].map(q => q * (0.9 + r() * 0.2)); c.fillStyle = `rgb(${b.map(Math.round)})`; c.fillRect(0, i * pw, SZ, pw);
      for (let k = 0; k < 40; k++) { c.strokeStyle = `rgba(60,35,15,${0.05 + r() * 0.12})`; c.lineWidth = 0.6 + r() * 1.6; c.beginPath(); const y = i * pw + r() * pw; c.moveTo(0, y); for (let x = 0; x <= SZ; x += 32) c.lineTo(x, y + Math.sin(x / 50 + k) * 2 * r()); c.stroke(); }
      c.fillStyle = 'rgba(40,25,10,0.6)'; c.fillRect(0, i * pw, SZ, 2); h.fillStyle = '#404040'; h.fillRect(0, i * pw, SZ, 3); }
    return { col, hg };
  };
  /* kütüphane: kod → ad, varsayılan karo ölçüsü (m), üretici */
  const LIB = {
    tugla: { ad: 'Tuğla (kırmızı, 24×7.1 cm, yarım şaşırtmalı)', w: 0.50, h: 0.162, bump: 0.7, gen: () => bond({ rows: 2, cols: 2, jw: 0.024, joint: '#bdb6aa', cols3: [[150, 62, 42], [165, 75, 50], [135, 55, 40], [172, 88, 60], [128, 50, 36]], seed: 21, vary: 0.16 }) },
    klinker: { ad: 'Klinker tuğla (koyu)', w: 0.50, h: 0.162, bump: 0.7, gen: () => bond({ rows: 2, cols: 2, jw: 0.022, joint: '#8e8b86', cols3: [[96, 52, 38], [110, 60, 44], [82, 46, 36], [120, 72, 52]], seed: 33, vary: 0.2 }) },
    harman: { ad: 'Harman tuğlası (19×13.5 cm, sıvasız)', w: 0.40, h: 0.29, bump: 0.6, gen: () => bond({ rows: 2, cols: 2, jw: 0.04, joint: '#b8b2a6', cols3: [[176, 92, 62], [186, 104, 70], [168, 86, 58]], seed: 9, speck: true }) },
    gazbeton: { ad: 'Gazbeton blok (60×25 cm)', w: 1.20, h: 0.50, bump: 0.35, gen: () => bond({ rows: 2, cols: 2, jw: 0.006, joint: '#c9c9c4', cols3: [[226, 226, 220], [232, 231, 226], [220, 220, 214]], seed: 4, vary: 0.04, speck: true }) },
    briket: { ad: 'Briket (40×20 cm)', w: 0.80, h: 0.40, bump: 0.55, gen: () => bond({ rows: 2, cols: 2, jw: 0.02, joint: '#9a9893', cols3: [[150, 149, 144], [160, 158, 152], [140, 139, 134]], seed: 15, vary: 0.08, speck: true, grain: 0.3 }) },
    brut: { ad: 'Brüt beton (kalıp izi + tij delikleri)', w: 2.40, h: 2.40, bump: 0.5, gen: () => plain({ base: [168, 168, 164], form: true, pores: 220, seed: 8 }) },
    beton: { ad: 'Beton (düz)', w: 2.0, h: 2.0, bump: 0.3, gen: () => plain({ base: [176, 176, 172], pores: 140, seed: 12 }) },
    siva: { ad: 'Sıva / boya (açık)', w: 1.5, h: 1.5, bump: 0.25, gen: () => plain({ base: [230, 226, 214], grain: 0.12, seed: 6 }) },
    tas: { ad: 'Doğal taş duvar', w: 1.2, h: 1.2, bump: 0.8, gen: () => stone({ n: 26, jw: 4, joint: '#7c7a74', cols3: [[150, 138, 118], [128, 120, 106], [168, 156, 132], [110, 104, 96]], seed: 41 }) },
    parke: { ad: 'Kilitli parke taşı (20×10 cm)', w: 0.40, h: 0.40, bump: 0.6, gen: () => bond({ rows: 4, cols: 2, jw: 0.02, joint: '#8a8780', cols3: [[150, 148, 142], [140, 120, 110], [160, 158, 150]], seed: 27 }) },
    seramik: { ad: 'Seramik karo (30×30 cm)', w: 0.60, h: 0.60, bump: 0.35, gen: () => bond({ rows: 2, cols: 2, jw: 0.012, joint: '#d0d0d0', half: false, cols3: [[236, 236, 232], [230, 232, 230]], seed: 2, vary: 0.03, grain: 0.06 }) },
    ahsap: { ad: 'Ahşap tahta (kaplama)', w: 1.0, h: 0.60, bump: 0.4, gen: () => wood({ n: 4, cols3: [[170, 120, 72], [160, 110, 66], [178, 128, 80]] }) },
  };
  C.DOKU_LIB = LIB;
  /* ---------- kullanıcı resimleri (IndexedDB) ---------- */
  const DB = 'aritmacad-doku';
  const idb = (mode, fn) => new Promise((res, rej) => { const q = indexedDB.open(DB, 1); q.onupgradeneeded = () => q.result.createObjectStore('img'); q.onerror = () => rej(q.error); q.onsuccess = () => { const tx = q.result.transaction('img', mode), st = tx.objectStore('img'), r = fn(st); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); }; });
  const user = {}; // id → { ad, w, h, bump, url, img? }
  C.dokuUser = user;
  const loadUser = async () => { try { const all = await new Promise((res, rej) => { const q = indexedDB.open(DB, 1); q.onupgradeneeded = () => q.result.createObjectStore('img'); q.onerror = () => rej(q.error); q.onsuccess = () => { const out = {}, cur = q.result.transaction('img', 'readonly').objectStore('img').openCursor(); cur.onsuccess = () => { const c = cur.result; if (c) { out[c.key] = c.value; c.continue(); } else res(out); }; cur.onerror = () => rej(cur.error); }; }); Object.assign(user, all || {}); if (C.views && C.views.v3) { C.views.v3.needBuild = true; } } catch (e) { } };
  if (typeof indexedDB !== 'undefined') setTimeout(loadUser, 0);
  const saveUser = (id, rec) => idb('readwrite', st => st.put(rec, id)).catch(() => { });
  const delUser = id => idb('readwrite', st => st.delete(id)).catch(() => { });
  /* resmi 2'nin kuvveti boyuta (tekrarlı doku için) indir: en çok 1024 */
  const toPOT = img => { const s = Math.min(1024, Math.max(256, 1 << Math.round(Math.log2(Math.max(img.width, img.height))))); const c = document.createElement('canvas'); c.width = c.height = s; c.getContext('2d').drawImage(img, 0, 0, s, s); return c; };
  /* yükseklik haritası → eğim haritası (R = d/du, G = d/dv; 0.5 merkez) */
  const slopeMap = (hg) => {
    const W = hg.width, H = hg.height, src = hg.getContext('2d').getImageData(0, 0, W, H).data, out = document.createElement('canvas'); out.width = W; out.height = H;
    const o = out.getContext('2d'), id = o.createImageData(W, H), L = (x, y) => { x = (x + W) % W; y = (y + H) % H; const i = (y * W + x) * 4; return (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114) / 255; };
    const k = W / 64; // piksel → karo ölçeğine göre normalleştirme
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = (L(x + 1, y) - L(x - 1, y)) * k, dy = (L(x, y - 1) - L(x, y + 1)) * k, i = (y * W + x) * 4; id.data[i] = Math.max(0, Math.min(255, 128 + dx * 127)); id.data[i + 1] = Math.max(0, Math.min(255, 128 + dy * 127)); id.data[i + 2] = 128; id.data[i + 3] = 255; }
    o.putImageData(id, 0, 0); return out;
  };
  /* doku görüntüleri: kod → { col, slope } (önbellekli; kullanıcı resmi yüklenmemişse null) */
  const imgCache = {};
  C.dokuImages = k => {
    if (imgCache[k]) return imgCache[k];
    if (LIB[k]) { const g = LIB[k].gen(); return (imgCache[k] = { col: g.col, slope: slopeMap(g.hg) }); }
    const u = user[k]; if (!u || !u.url) return null;
    if (u._loading) return null; u._loading = true;
    const im = new Image(); im.onload = () => { const c = toPOT(im); imgCache[k] = { col: c, slope: slopeMap(c) }; if (C.views && C.views.v3) { C.views.v3.needBuild = true; C.views.v3.dirty = true; } }; im.src = u.url;
    return null;
  };
  C.dokuInfo = k => LIB[k] || user[k] || null;
  /* ---------- UV (gerçek ölçüde): üçgen başına teğet, perdede yol boyu (kıvrımlı duvarda tuğla sürekli) ---------- */
  const pathU = e => { // perde: segment çerçeveleri ve kümülatif boy
    if (!C._ins || !C._ins.segFrames) return null; const F = C._ins.segFrames(e); if (!F.length) return null; let s = 0; const cum = F.map(f => { const c = s; s += f.L; return c; }); return { F, cum };
  };
  /* tek yüz dokusu: yüz düzlemi (normal + uzaklık) ve sınırı; üçgen aynı düzlemde ve ağırlık merkezi sınırın içindeyse o yüze aittir */
  const drop = n => { const a = [Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2])]; return a[2] >= a[0] && a[2] >= a[1] ? [0, 1] : a[0] >= a[1] ? [1, 2] : [0, 2]; };
  const inFace = (f, n, c) => { if (M.dot(n, f.n) < 0.9999) return false; if (Math.abs(M.dot(f.n, c) - f.d) > 2e-4) return false; const [i, j] = drop(f.n); const poly = f.pts.map(p => [p[i], p[j]]); if (!C.pointInPoly([c[i], c[j]], poly)) return false; for (const h of f.holes || []) if (C.pointInPoly([c[i], c[j]], h.map(p => [p[i], p[j]]))) return false; return true; };
  C.dokuHas = e => !!((e.mat && e.mat.k) || (e.matF && e.matF.length) || (e.matS && Object.keys(e.matS).length));
  C.dokuUV = (e, pos, nrm) => { // pos/nrm: düz dizi (9 / üçgen) → { uv (6 / üçgen), tg (9 / üçgen), use, mk (üçgen başına doku) }
    const PU = e.type === 'perde' ? pathU(e) : null, nT = pos.length / 9, uv = new Float32Array(nT * 6), tg = new Float32Array(nT * 9), use = new Uint8Array(nT), mk = new Array(nT).fill(null);
    for (let t = 0; t < nT; t++) {
      const j = t * 9, A = [pos[j], pos[j + 1], pos[j + 2]], B = [pos[j + 3], pos[j + 4], pos[j + 5]], Cc = [pos[j + 6], pos[j + 7], pos[j + 8]];
      let n = M.cross(M.sub(B, A), M.sub(Cc, A)); const ln = M.len(n); if (ln < 1e-14) continue; n = M.mul(n, 1 / ln);
      const vn = [nrm[j] + nrm[j + 3] + nrm[j + 6], nrm[j + 1] + nrm[j + 4] + nrm[j + 7], nrm[j + 2] + nrm[j + 5] + nrm[j + 8]]; if (M.dot(vn, n) < 0) n = M.mul(n, -1);
      let m = null; const cen = [(A[0] + B[0] + Cc[0]) / 3, (A[1] + B[1] + Cc[1]) / 3, (A[2] + B[2] + Cc[2]) / 3];
      if (e.matF) for (const f of e.matF) if (inFace(f, n, cen)) { m = f.mat; break; }
      if (!m && e.matS) { const sd = perdeSide(e, n, cen); if (sd && e.matS[sd]) m = e.matS[sd]; }
      if (!m && e.mat && e.mat.k && !(e.mat.yuz === 'dikey' && Math.abs(n[2]) > 0.7)) m = e.mat;
      if (!m || !m.k || !C.dokuImages(m.k)) continue;
      use[t] = 1; mk[t] = m;
      const w = Math.max(0.01, +m.w || 1), hh = Math.max(0.01, +m.h || 1), ra = (+m.rot || 0) * RAD, cr = Math.cos(ra), sr = Math.sin(ra);
      let T; if (Math.abs(n[2]) > 0.7) T = [1, 0, 0]; else T = M.norm([-n[1], n[0], 0]); // düşey yüz: yatay teğet, v = yukarı
      T = M.norm(M.sub(T, M.mul(n, M.dot(T, n)))); const Bv = M.cross(n, T);
      let uOf = p => M.dot(p, T);
      if (PU && Math.abs(n[2]) <= 0.7) { // perde düşey yüzü: yol boyunca uzunluk
        const cx = (A[0] + B[0] + Cc[0]) / 3, cy = (A[1] + B[1] + Cc[1]) / 3; let bi = 0, bd = Infinity;
        PU.F.forEach((f, i) => { const s = Math.max(0, Math.min(f.L, (cx - f.a[0]) * f.u[0] + (cy - f.a[1]) * f.u[1])), qx = f.a[0] + f.u[0] * s, qy = f.a[1] + f.u[1] * s, d = (qx - cx) ** 2 + (qy - cy) ** 2; if (d < bd) { bd = d; bi = i; } });
        const f = PU.F[bi], sg = Math.sign(T[0] * f.u[0] + T[1] * f.u[1]) || 1, c0 = PU.cum[bi];
        uOf = p => sg * (c0 + (p[0] - f.a[0]) * f.u[0] + (p[1] - f.a[1]) * f.u[1]);
      }
      const Tr = [T[0] * cr + Bv[0] * sr, T[1] * cr + Bv[1] * sr, T[2] * cr + Bv[2] * sr];
      [A, B, Cc].forEach((p, k) => { const u0 = uOf(p), v0 = M.dot(p, Bv), u = u0 * cr + v0 * sr, v = -u0 * sr + v0 * cr; uv[t * 6 + k * 2] = u / w; uv[t * 6 + k * 2 + 1] = v / hh; tg[j + k * 3] = Tr[0]; tg[j + k * 3 + 1] = Tr[1]; tg[j + k * 3 + 2] = Tr[2]; });
    }
    return { uv, tg, use, mk };
  };
  /* ---------- MALZEME / DOKU komutu ---------- */
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const thumb = k => { const im = C.dokuImages(k); if (im) return im.col.toDataURL('image/jpeg', 0.7); const u = user[k]; return u && u.url ? u.url : ''; };
  const dialog = (sel, faceMode) => new Promise(res => {
    const cur = !faceMode && sel.find(e => e.mat) ? sel.find(e => e.mat).mat : null; let pick = cur ? cur.k : 'tugla';
    const render = () => {
      const items = [...Object.keys(LIB).map(k => [k, LIB[k].ad, false]), ...Object.keys(user).map(k => [k, user[k].ad, true])];
      const inf = C.dokuInfo(pick) || LIB.tugla, mw = cur && cur.k === pick ? cur.w : inf.w, mh = cur && cur.k === pick ? cur.h : inf.h, mb = cur && cur.k === pick ? cur.bump : inf.bump;
      const b = C.modal('Malzeme dokusu (3B)', `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px;max-height:46vh;overflow:auto;padding:2px">
        ${items.map(([k, ad, us]) => `<div data-k="${k}" style="cursor:pointer;border:2px solid ${k === pick ? '#3b82f6' : 'transparent'};border-radius:8px;padding:4px;text-align:center;font-size:11.5px;background:rgba(127,127,127,.08)"><img src="${thumb(k)}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:5px;display:block;background:#888"><div style="margin-top:3px;line-height:1.2">${esc(ad)}</div>${us ? `<button data-del="${k}" style="margin-top:3px;font-size:10.5px;padding:1px 6px">Sil</button>` : ''}</div>`).join('')}
        </div>
        <div class="bar" style="margin-top:8px"><button id="dkYukle">+ Resim ekle (jpg / png)…</button><span class="hint" style="margin-left:8px">Kendi doku fotoğrafınız kütüphaneye eklenir (bu bilgisayarda saklanır).</span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px 16px;margin-top:10px">
          ${[['dkW', 'Karo eni — gerçek ölçü (m)', mw], ['dkH', 'Karo boyu — gerçek ölçü (m)', mh], ['dkR', 'Açı (°)', cur && cur.k === pick ? cur.rot || 0 : 0], ['dkB', 'Kabartma / bump (%)', Math.round((mb != null ? mb : 0.5) * 100)]].map(([id, t, v]) => `<label style="display:flex;flex-direction:column;gap:3px;font-size:12px">${t}<input id="${id}" type="number" step="any" value="${v}" style="width:100%;box-sizing:border-box"></label>`).join('')}
          ${faceMode ? '' : `<label style="display:flex;flex-direction:column;gap:3px;font-size:12px">Uygulanacak yüzler<select id="dkY" style="width:100%"><option value="tum">Tüm yüzler</option><option value="dikey" ${cur && cur.yuz === 'dikey' ? 'selected' : ''}>Yalnız düşey (duvar yüzleri)</option></select></label>`}
        </div>
        <p class="hint">Karo = resmin bir tekrarının gerçek ölçüsü. Örnek tuğla: 2 tuğla eni × 2 sıra (0.50 × 0.162 m). Kendi resminizde resmin kapladığı gerçek eni ve boyu girin — en / boy oranı buna göre ayarlanır.</p>
        <div class="bar" style="justify-content:flex-end"><button id="dkKaldir">Dokuyu kaldır</button><button id="dkIptal">İptal</button><button id="dkOk" class="pri">${faceMode ? 'Uygula (yalnız seçilen yüz)' : `Uygula (${sel.length} eleman)`}</button></div>`);
      b.querySelectorAll('[data-k]').forEach(el => el.onclick = ev => { if (ev.target.dataset.del) return; pick = el.dataset.k; render(); });
      b.querySelectorAll('[data-del]').forEach(el => el.onclick = async ev => { ev.stopPropagation(); const k = el.dataset.del; if (!confirm(`"${user[k].ad}" kütüphaneden silinsin mi?`)) return; delete user[k]; delete imgCache[k]; await delUser(k); if (pick === k) pick = 'tugla'; render(); });
      b.querySelector('#dkYukle').onclick = () => {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = async () => {
          const c = toPOT(im), url = c.toDataURL('image/jpeg', 0.88), ad = (prompt('Doku adı', f.name.replace(/\.[^.]+$/, '')) || f.name).slice(0, 60);
          const wm = parseFloat(String(prompt('Resmin gerçek eni (m) — ör. tuğla duvar fotoğrafında görünen genişlik', '1.0') || '1').replace(',', '.')) || 1;
          const hm = parseFloat(String(prompt('Resmin gerçek boyu (m)', (wm * im.height / im.width).toFixed(3)) || String(wm * im.height / im.width)).replace(',', '.')) || wm;
          const id = 'u' + Date.now().toString(36); user[id] = { ad, w: wm, h: hm, bump: 0.5, url }; await saveUser(id, user[id]); pick = id; render(); }; im.src = fr.result; }; fr.readAsDataURL(f); };
        inp.click();
      };
      const fin = v => { C.closeModal(); res(v); };
      b.querySelector('#dkIptal').onclick = () => fin(null);
      b.querySelector('#dkKaldir').onclick = () => fin({ remove: true });
      if (faceMode) b.querySelector('#dkKaldir').textContent = 'Bu yüzün dokusunu kaldır';
      b.querySelector('#dkOk').onclick = () => fin({ k: pick, w: +b.querySelector('#dkW').value || 1, h: +b.querySelector('#dkH').value || 1, rot: +b.querySelector('#dkR').value || 0, bump: Math.max(0, Math.min(1, (+b.querySelector('#dkB').value || 0) / 100)), yuz: b.querySelector('#dkY') ? b.querySelector('#dkY').value : 'tum' });
    };
    render();
  });
  const applyMat = (sel, m) => { C.undoStack.push(C.snapshot()); C.redoStack = []; for (const e of sel) { if (m.remove) { delete e.mat; delete e.matF; delete e.matS; } else e.mat = { k: m.k, w: m.w, h: m.h, rot: m.rot, bump: m.bump, yuz: m.yuz }; delete e._c; } C.changed(); if (C.views && C.views.v3) C.views.v3.needBuild = true; };
  /* tek yüze doku: f = { e, n, pts, holes } (3B'de tıklanan yüz) */
  /* perdenin hangi yüzü: yol çizgisinin solu (L) / sağı (R); düşey olmayan yüzler null */
  const perdeSide = (e, n, c) => { if (e.type !== 'perde' || Math.abs(n[2]) > 0.7) return null; const PU = pathU(e); if (!PU) return null; let bi = 0, bd = Infinity; PU.F.forEach((f, i) => { const s2 = Math.max(0, Math.min(f.L, (c[0] - f.a[0]) * f.u[0] + (c[1] - f.a[1]) * f.u[1])), qx = f.a[0] + f.u[0] * s2, qy = f.a[1] + f.u[1] * s2, dd = (qx - c[0]) ** 2 + (qy - c[1]) ** 2; if (dd < bd) { bd = dd; bi = i; } }); const f = PU.F[bi], o = (c[0] - f.a[0]) * f.nn[0] + (c[1] - f.a[1]) * f.nn[1], s2 = (c[0] - f.a[0]) * f.u[0] + (c[1] - f.a[1]) * f.u[1]; if (s2 < -1e-3 || s2 > f.L + 1e-3) return null; if (Math.abs(n[0] * f.u[0] + n[1] * f.u[1]) > 0.5) return null; return o >= 0 ? 'L' : 'R'; }; // uç (alın) yüzleri yan sayılmaz
  C.dokuPerdeSide = perdeSide;
  const applyFace = (f, m) => {
    { const cen = f.pts.reduce((q, p) => [q[0] + p[0] / f.pts.length, q[1] + p[1] / f.pts.length, q[2] + (p[2] || 0) / f.pts.length], [0, 0, 0]), sd = perdeSide(f.e, M.norm(f.n), cen);
      if (sd) { C.undoStack.push(C.snapshot()); C.redoStack = []; const e = f.e; e.matS = Object.assign({}, e.matS || {}); if (m.remove) delete e.matS[sd]; else e.matS[sd] = { k: m.k, w: m.w, h: m.h, rot: m.rot, bump: m.bump }; if (!Object.keys(e.matS).length) delete e.matS; delete e._c; C.changed(); if (C.views && C.views.v3) C.views.v3.needBuild = true; return sd; } }
    C.undoStack.push(C.snapshot()); C.redoStack = []; const e = f.e, n = M.norm(f.n), d = M.dot(n, f.pts[0]);
    const same = x => M.dot(x.n, n) > 0.9999 && Math.abs(x.d - d) < 2e-4 && x.pts.length === f.pts.length && M.dist(x.pts[0], f.pts[0]) < 1e-4;
    e.matF = (e.matF || []).filter(x => !same(x));
    if (!m.remove) e.matF.push({ n, d, pts: f.pts.map(p => [p[0], p[1], p[2] || 0]), holes: (f.holes || []).map(h => h.map(p => [p[0], p[1], p[2] || 0])), mat: { k: m.k, w: m.w, h: m.h, rot: m.rot, bump: m.bump } });
    if (!e.matF.length) delete e.matF; delete e._c; C.changed(); if (C.views && C.views.v3) C.views.v3.needBuild = true; return 'F';
  };
  const pickFace = async (I) => { // 3B'de bir yüze tıklat
    const E = C.cmd; if (!(C.views && C.views.v3 && C.views.v3.visible())) { C.warn('Yüz seçmek için 3B görünüme geçin.'); return null; }
    E.hover = 'face'; E.noSnap = true; const p = await I.pt('Doku verilecek YÜZE tıklayın'); E.hover = null; E.noSnap = false; if (C.views.v3) C.views.v3.hoverPoly = null;
    if (!p || typeof p === 'string') return null; const f = C.faceTarget && C.faceTarget(p); if (!f || !f.e || f.kind !== 'mesh') { C.warn('Burada bir elemanın yüzü yok.'); return null; }
    return { e: f.e, n: f.n, pts: f.pts, holes: f.holes };
  };
  C.addCommand(['MALZEME', 'DOKU', 'MATERYAL', 'KAPLAMAGORSEL'], 'Elemanlara ya da tek bir yüze 3B malzeme dokusu (tuğla, gazbeton, brüt beton, taş, ahşap … ya da kendi resminiz): gerçek ölçüde karo eni × boyu, açı ve kabartma (bump). Elemanları seçin ya da Y = tek yüz seçin (3B\'de önce yüze tıklayıp komutu vermek de olur).', async (I) => {
    const kv = {}; E_kv(kv);
    let face = null, ok = null;
    if (!C.sel.length && C.selFace && C.byId(C.selFace.e.id)) { const sf = C.selFace; face = { e: sf.e, n: sf.n, pts: sf.pts, holes: sf.holes }; C.selFace = null; C.emit('selection'); }
    else if (C.up(kv.SEC || '') === 'YUZ' || C.up(kv.SEC || '') === 'Y') face = await pickFace(I);
    else {
      const sel = await I.sel('Doku verilecek elemanları seçin, Enter  —  hiçbir şey seçmeden Enter = tek YÜZ seç (perdenin iç / dış yüzü gibi)', { pre: true });
      if (Array.isArray(sel) && !sel.length && !C.cmd.scriptMode) face = await pickFace(I);
      else { if (!sel || !sel.length) return; ok = sel.filter(e => C.entTris(e)); if (!ok.length) { C.warn('Seçimde 3B gövdesi olan eleman yok.'); return; } }
    }
    if (!face && !ok) return;
    let m;
    if (kv.K || C.cmd.scriptMode) { const k = (kv.K || 'tugla').toLowerCase(), inf = C.dokuInfo(k) || LIB.tugla; m = C.up(kv.K || '') === 'YOK' ? { remove: true } : { k, w: +kv.W || inf.w, h: +kv.H || inf.h, rot: +kv.ROT || 0, bump: kv.BUMP != null ? +kv.BUMP / 100 : inf.bump, yuz: (kv.YUZ || 'tum').toLowerCase() }; }
    else m = await dialog(face ? [face.e] : ok, !!face); if (!m) return;
    if (face) { const sd = applyFace(face, m); const yer = sd === 'L' || sd === 'R' ? `perdenin ${sd === 'L' ? 'sol (çizim yönüne göre)' : 'sağ (çizim yönüne göre)'} yüzünün tamamına` : 'yalnız seçilen yüze'; C.log(m.remove ? 'Yüzün dokusu kaldırıldı.' : `Doku ${yer} verildi: ${(C.dokuInfo(m.k) || {}).ad || m.k} · karo ${m.w} × ${m.h} m · kabartma %${Math.round(m.bump * 100)}.`); return; }
    applyMat(ok, m);
    C.log(m.remove ? `${ok.length} elemandan doku kaldırıldı (yüz dokuları dahil).` : `${ok.length} elemana doku verildi: ${(C.dokuInfo(m.k) || {}).ad || m.k} · karo ${m.w} × ${m.h} m · kabartma %${Math.round(m.bump * 100)}${m.yuz === 'dikey' ? ' · yalnız düşey yüzler' : ''}. 3B görünümde görünür.`);
  }, {});
  function E_kv(kv) { const E = C.cmd; E.queue = E.queue.filter(t => { const mm = /^([A-Za-z]+)=(.*)$/.exec(t); if (mm) { kv[mm[1].toUpperCase()] = mm[2]; return false; } return true; }); }
  C.dokuApply = applyMat; C.dokuApplyFace = applyFace;
})(window.C);

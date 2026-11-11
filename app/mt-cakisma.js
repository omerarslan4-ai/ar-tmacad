/* ArıtmaCAD — MEKANİK TESİSAT · ÇAKIŞMA DENETİMİ ve GEÇİŞ DELİKLERİ
   CAKISMA     : bütün tesisat hatlarını (kalorifer / soğutma boruları, kolonlar, hava kanalları, klima boru hattı, duvar fanı / panjur, ileride sıhhi tesisat)
                 yapı elemanlarına (kolon, kiriş, perde / duvar, döşeme) ve birbirine karşı dener.
                   · kolon / kiriş içinden geçen hat                → ÇAKIŞMA (taşıyıcı delinmez)
                   · duvarı / döşemeyi dik kesen hat               → GEÇİŞ (delik / kovan gerekir) → modele delik açılır, planda işaretlenir
                   · betonarme perde / döşeme içinde boyuna giden hat → ÇAKIŞMA;  tuğla duvar içinde boyuna giden hat → bilgi (kanal açılır)
                   · iki ayrı tesisatın hatları üst üste           → ÇAKIŞMA
   DELIKAC     : bulunan geçişleri modele işler (perde / duvar ve döşemede boşluk — 3B, kesit ve planda görünür), planda D1, D2 … işaretleri koyar.
   CAKISMASIL  : çakışma işaretlerini, geçiş işaretlerini ve bu modülün açtığı delikleri kaldırır.
   Başka modüller hat eklemek için MT.cakismaHat dizisine fonksiyon koyar: () => [{ a:[x,y,z], b:[x,y,z], r, hw, hh, sys, ad, id }] */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, MT = C.MT, { L, P, TX, CI } = C.prim || {}; if (!T || !MT || !C.addCommand) return;
  const f = (v, d = 2) => (isFinite(v) ? (+v).toFixed(d) : '—').replace('.', ',');
  const RAD = Math.PI / 180, ins = () => C._ins;
  const hOf = e => { const o = C.doc.ents.find(q => q.id === e.mid && q.type === 'mtmahal'); return o ? (+o.h || 3) : (MT.set().hKat || 3); };
  MT.cakismaHat = MT.cakismaHat || [];

  /* ---------- tesisat hatları ---------- */
  const hatlar = () => {
    const out = [], E = C.doc.ents, ekle = (e, a, b, o) => { if (Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) > 0.02) out.push(Object.assign({ a, b, id: e.id }, o)); };
    for (const e of E) {
      if (e.gv) continue;
      if (e.type === 'mtboru') { const sg = e.sys === 'sog', z = (+e.z0 || 0) + (sg ? hOf(e) - 0.45 : 0.06) + 0.018; for (let i = 1; i < e.pts.length; i++) ekle(e, [e.pts[i - 1][0], e.pts[i - 1][1], z], [e.pts[i][0], e.pts[i][1], z], { r: 0.06, hw: 0.06, hh: 0.02, sys: sg ? 'Soğutma' : 'Isıtma', ad: `${sg ? 'Soğutma' : 'Kalorifer'} borusu ${e.dn || ''}`, cap: 0.05 }); }
      else if (e.type === 'mtkolon') { const sg = e.sys === 'sog', zs = E.filter(x => x.type === (sg ? 'mtfc' : 'mtrad')).map(x => +x.z0 || 0); if (!zs.length) continue; ekle(e, [e.p[0], e.p[1], Math.min(...zs) - 0.1], [e.p[0], e.p[1], Math.max(...zs) + (sg ? 3 : 0.3)], { r: 0.08, hw: 0.08, hh: 0.08, sys: sg ? 'Soğutma' : 'Isıtma', ad: `${sg ? 'Soğutma' : 'Kalorifer'} kolonu ${e.no || ''}`, cap: 0.07, dusey: true, w: 0.2, h: 0.12 }); }
      else if (e.type === 'mtkanal') { const zt = (+e.z0 || 0) + hOf(e) - 0.15, z = zt - e.b / 2000; for (let i = 1; i < e.pts.length; i++) ekle(e, [e.pts[i - 1][0], e.pts[i - 1][1], z], [e.pts[i][0], e.pts[i][1], z], { r: Math.max(e.a, e.b) / 2000, hw: e.a / 2000, hh: e.b / 2000, sys: 'Havalandırma', ad: `${e.sys === 'besleme' ? 'Besleme' : 'Egzoz'} kanalı ${e.a}×${e.b}`, w: e.a / 1000, h: e.b / 1000 }); }
      else if (e.type === 'mtfc' && e.tip === 'split' && e.dp) { const z = (+e.z0 || 0) + (e.zm != null ? +e.zm : Math.max(2.1, hOf(e) - 0.42)) + 0.1; ekle(e, [e.p[0], e.p[1], z], [e.dp[0], e.dp[1], z], { r: 0.035, hw: 0.035, hh: 0.035, sys: 'Soğutma', ad: `${e.no || 'Klima'} soğutucu boru hattı`, cap: 0.065 }); }
      else if (e.type === 'mthv' && ['duvarfan', 'kanalfan', 'panjur'].includes(e.kind)) { const a = e.ang || 0, n = [-Math.sin(a), Math.cos(a)], t = (e.t || 0.2) + 0.15, h = hOf(e), z0 = +e.z0 || 0, r = Math.max(0.15, (parseInt(String(e.model || '').replace(/\D/g, ''), 10) || 300) / 2000), bw = e.kind === 'panjur' ? (e.w || 0.6) : e.kind === 'kanalfan' ? 0.25 : 2 * r, z = e.kind === 'panjur' ? z0 + 0.3 + bw / 2 : e.kind === 'kanalfan' ? z0 + h - 0.625 : z0 + h - 0.5 - r;
        ekle(e, [e.p[0] - n[0] * t, e.p[1] - n[1] * t, z], [e.p[0] + n[0] * t, e.p[1] + n[1] * t, z], { r: bw / 2, hw: bw / 2, hh: bw / 2, sys: 'Havalandırma', ad: `${e.kind === 'panjur' ? 'Taze hava panjuru' : 'Duvar fanı'} ${e.model || ''}`, w: bw, h: bw, cihaz: true }); }
    }
    for (const fn of MT.cakismaHat) { try { for (const s of fn() || []) if (s && s.a && s.b) out.push(Object.assign({ r: 0.03, hw: 0.03, hh: 0.03, sys: 'Tesisat', ad: 'Boru' }, s)); } catch (er) { console.error(er); } }
    return out;
  };

  /* ---------- yapı elemanları: nokta içeride mi ---------- */
  const yapilar = () => {
    const out = [], I = ins();
    for (const e of C.doc.ents) {
      if (e.gv || !C.layer(e.layer).on) continue;
      if (e.type === 'kolon') { const c = e.p, z0 = +e.z0 || 0, z1 = z0 + (+e.h || 3), cs = Math.cos((e.rot || 0) * RAD), sn = Math.sin((e.rot || 0) * RAD), b = (+e.b || 0.4) / 2, d = (+e.d || 0.4) / 2, R = (+e.D || 0.5) / 2;
        out.push({ e, tur: 'kolon', ad: 'Kolon', tasiyici: true, t: Math.min(2 * b, 2 * d), ic: p => { if (p[2] < z0 + 0.005 || p[2] > z1 - 0.005) return false; const dx = p[0] - c[0], dy = p[1] - c[1]; if (e.sek === 'D') return Math.hypot(dx, dy) < R; const x = dx * cs + dy * sn, y = -dx * sn + dy * cs; return Math.abs(x) < b && Math.abs(y) < d; } }); }
      else if (e.type === 'kiris' && e.a && e.b) { const a = e.a, b = e.b, Ls = Math.hypot(b[0] - a[0], b[1] - a[1]); if (Ls < 0.05) continue; const u = [(b[0] - a[0]) / Ls, (b[1] - a[1]) / Ls], w = (+e.bw || 0.3) / 2, zt = +e.zt || 0, zb = zt - (+e.hb || 0.5);
        out.push({ e, tur: 'kiris', ad: 'Kiriş', tasiyici: true, t: 2 * w, ic: p => { if (p[2] < zb + 0.005 || p[2] > zt - 0.005) return false; const dx = p[0] - a[0], dy = p[1] - a[1], s = dx * u[0] + dy * u[1], o = -dx * u[1] + dy * u[0]; return s > 0 && s < Ls && Math.abs(o) < w; } }); }
      else if (e.type === 'perde' && I) { let sf, F; try { sf = I.segFrames(e); F = I.faceOffs(e); } catch (er) { continue; } const z0 = +e.z0 || 0, z1 = z0 + (+e.h || 3), o0 = Math.min(F.lB, F.rB), o1 = Math.max(F.lB, F.rB), ops = C.doc.ents.filter(o => o.type === 'acik' && o.host === e.id), beton = (e.malz || 'beton') === 'beton';
        for (const s of sf) { if (s.L < 0.02) continue; const mine = ops.filter(o => (o.seg || 0) === s.i);
          out.push({ e, tur: 'perde', ad: beton ? 'Betonarme perde' : 'Duvar', beton, t: o1 - o0, nn: s.nn, u: s.u, o0, o1, sa: s.a, ic: p => { if (p[2] < z0 + 0.005 || p[2] > z1 - 0.005) return false; const dx = p[0] - s.a[0], dy = p[1] - s.a[1], q = dx * s.u[0] + dy * s.u[1], o = dx * s.nn[0] + dy * s.nn[1]; if (q < -0.02 || q > s.L + 0.02 || o < o0 + 0.003 || o > o1 - 0.003) return false; for (const k of mine) { const w = (+k.w || 1) / 2, zb = z0 + (k.kind === 'kapi' ? 0 : (+k.par || 0.9)), zt = zb + (+k.hh || (k.kind === 'kapi' ? 2.1 : 1.4)); if (Math.abs(q - (+k.s || 0)) < w && p[2] > zb && p[2] < zt) return false; } return true; } }); } }
      else if (e.type === 'plak' && e.pts && e.pts.length >= 3) { const zt = +e.zt || 0, zb = zt - (+e.t || 0.3), pts = e.pts.map(q => [q[0], q[1]]);
        out.push({ e, tur: 'plak', ad: e.kind === 'radye' ? 'Radye' : 'Döşeme', beton: true, t: zt - zb, zt, zb, ic: p => p[2] > zb + 0.005 && p[2] < zt - 0.005 && MT.inPoly(p, pts) }); }
    }
    return out;
  };
  const segMesafe = (p1, q1, p2, q2) => { // iki doğru parçası arası en kısa uzaklık + nokta
    const d1 = M.sub(q1, p1), d2 = M.sub(q2, p2), r = M.sub(p1, p2), a = M.dot(d1, d1), e = M.dot(d2, d2), ff = M.dot(d2, r); let s, t;
    if (a < 1e-12 && e < 1e-12) { s = t = 0; } else if (a < 1e-12) { s = 0; t = Math.max(0, Math.min(1, ff / e)); } else { const c = M.dot(d1, r); if (e < 1e-12) { t = 0; s = Math.max(0, Math.min(1, -c / a)); } else { const b = M.dot(d1, d2), den = a * e - b * b; s = den > 1e-12 ? Math.max(0, Math.min(1, (b * ff - c * e) / den)) : 0; t = (b * s + ff) / e; if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -c / a)); } else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - c) / a)); } } }
    const c1 = M.add(p1, M.mul(d1, s)), c2 = M.add(p2, M.mul(d2, t)); return { d: M.len(M.sub(c1, c2)), p: M.lerp(c1, c2, 0.5) };
  };

  /* ---------- denetim ---------- */
  MT.cakismaBul = () => {
    const H = hatlar(), Y = yapilar(), cak = [], gec = [], bilgi = [], adim = 0.04;
    for (const h of H) { const Ls = Math.hypot(h.b[0] - h.a[0], h.b[1] - h.a[1], h.b[2] - h.a[2]), n = Math.max(2, Math.ceil(Ls / adim)), d = [(h.b[0] - h.a[0]) / Ls, (h.b[1] - h.a[1]) / Ls, (h.b[2] - h.a[2]) / Ls];
      /* hattın kutusuna değebilecek elemanlar */
      for (const y of Y) { let run = null; const bitir = () => { if (!run) return; const len = (run.t1 - run.t0) * Ls, pm = M.lerp(h.a, h.b, (run.t0 + run.t1) / 2), yatayDuvar = y.tur === 'perde' && !h.dusey, dik = y.tur === 'plak' ? Math.abs(d[2]) > 0.7 : y.tur === 'perde' ? Math.abs(d[0] * y.nn[0] + d[1] * y.nn[1]) > 0.5 : false;
          if (len < 0.03) { run = null; return; }
          if (y.tur === 'plak' && dik && len < y.t * 0.55) { run = null; return; } /* döşemeye yalnız gömülen uç: geçiş değil */
          if (y.tasiyici) cak.push({ tip: 'yapi', h, y, p: pm, L: len, ad: `${h.ad} — ${y.ad} içinden geçiyor (${f(len, 2)} m)`, sys: h.sys });
          else if (dik && len <= y.t * 2.2 + 0.1) gec.push({ h, y, p: pm, L: len });
          else if (y.beton) cak.push({ tip: 'yapi', h, y, p: pm, L: len, ad: `${h.ad} — ${y.ad} içinde boyuna gidiyor (${f(len, 2)} m)`, sys: h.sys });
          else if (h.cihaz) gec.push({ h, y, p: pm, L: len });
          else bilgi.push({ h, y, p: pm, L: len, ad: `${h.ad} — ${y.ad} içinde ${f(len, 2)} m gidiyor (duvarda kanal açılır)` });
          run = null; };
        for (let i = 0; i <= n; i++) { const t = i / n, p = [h.a[0] + (h.b[0] - h.a[0]) * t, h.a[1] + (h.b[1] - h.a[1]) * t, h.a[2] + (h.b[2] - h.a[2]) * t]; if (y.ic(p)) { if (!run) run = { t0: t, t1: t }; else run.t1 = t; } else bitir(); } bitir(); } }
    /* aynı elemandan aynı duvara / döşemeye birden çok parça değerse tek geçiş; aynı noktadaki tekrarlar atılır */
    const tek = []; for (const g of gec) { if (!tek.some(q => q.y.e === g.y.e && Math.hypot(q.p[0] - g.p[0], q.p[1] - g.p[1], q.p[2] - g.p[2]) < 0.12)) tek.push(g); }
    /* tesisat – tesisat */
    const gor = new Set(); for (let i = 0; i < H.length; i++) for (let j = i + 1; j < H.length; j++) { const a = H[i], b = H[j]; if (a.id === b.id || a.sys === b.sys || a.cihaz || b.cihaz) continue; const k = Math.min(a.id, b.id) + ':' + Math.max(a.id, b.id); if (gor.has(k)) continue; const m = segMesafe(a.a, a.b, b.a, b.b); if (m.d < Math.min(a.hh, a.hw) + Math.min(b.hh, b.hw) - 0.005) { gor.add(k); cak.push({ tip: 'tesisat', h: a, h2: b, p: m.p, ad: `${a.ad} — ${b.ad} ile çakışıyor`, sys: a.sys + ' / ' + b.sys }); } }
    const tekC = []; for (const c of cak) if (!tekC.some(q => q.ad === c.ad && Math.hypot(q.p[0] - c.p[0], q.p[1] - c.p[1], q.p[2] - c.p[2]) < 0.3)) tekC.push(c);
    return { cak: tekC, gec: tek, bilgi, nHat: H.length, nYapi: Y.length };
  };

  /* ---------- nesneler: çakışma işareti, geçiş (delik) işareti ---------- */
  const lay = (n, c, lw) => { C.ensureLayer(n, c, 'CONTINUOUS', lw); return n; };
  T.mtcakis = {
    label: 'Çakışma işareti',
    prims: e => { const r = Math.max(0.12, C.annoH(2.2)), p = [e.p[0], e.p[1], 0], k = r * 0.7; return [CI(p, r, { lw: 50, color: 1 }), L([p[0] - k, p[1] - k, 0], [p[0] + k, p[1] + k, 0], { lw: 35, color: 1 }), L([p[0] - k, p[1] + k, 0], [p[0] + k, p[1] - k, 0], { lw: 35, color: 1 }), TX([p[0] + r * 1.3, p[1] + r * 0.3, 0], C.annoH(2.2), e.no || 'Ç', 0, 'L', { color: 1 })]; },
    mesh: e => { const I = ins(); if (!I) return []; const o = I.newMesh(), s = 0.09, p = e.p, z = p[2] || 0; I.hexa(o, [[p[0] - s, p[1] - s, z - s], [p[0] + s, p[1] - s, z - s], [p[0] + s, p[1] + s, z - s], [p[0] - s, p[1] + s, z - s], [p[0] - s, p[1] - s, z + s], [p[0] + s, p[1] - s, z + s], [p[0] + s, p[1] + s, z + s], [p[0] - s, p[1] + s, z + s]], [0.95, 0.10, 0.10]); return [o]; },
    snaps: e => [{ p: [e.p[0], e.p[1], 0], k: 'cen' }], xf: (e, X) => { const q = X.p([e.p[0], e.p[1], 0]); e.p = [q[0], q[1], e.p[2] || 0]; },
    info: e => `Çakışma ${e.no || ''}: ${e.ad || ''} · kot ${f(e.p[2] || 0, 2)}`,
  };
  T.mtdelik = {
    label: 'Geçiş deliği',
    prims: e => { const p = [e.p[0], e.p[1], 0], h = C.annoH(1.8), out = [], a = e.ang || 0, u = [Math.cos(a), Math.sin(a)], n = [-u[1], u[0]];
      if (e.dusey) { const r = Math.max(e.w, e.h) / 2; if (e.yuv) out.push(CI(p, r, { lw: 30, color: 3 })); else out.push(P([[-e.w / 2, -e.h / 2], [e.w / 2, -e.h / 2], [e.w / 2, e.h / 2], [-e.w / 2, e.h / 2]].map(q => [p[0] + q[0], p[1] + q[1], 0]), true, { lw: 30, color: 3 })); out.push(L([p[0] - r, p[1] - r, 0], [p[0] + r, p[1] + r, 0], { lw: 13, color: 3 }), L([p[0] - r, p[1] + r, 0], [p[0] + r, p[1] - r, 0], { lw: 13, color: 3 })); }
      else { const w = e.w / 2, t = (e.t || 0.2) / 2 + 0.03, pt = (s, o) => [p[0] + u[0] * s + n[0] * o, p[1] + u[1] * s + n[1] * o, 0]; out.push(P([pt(-w, -t), pt(w, -t), pt(w, t), pt(-w, t)], true, { lw: 30, color: 3 }), L(pt(-w, -t), pt(w, t), { lw: 13, color: 3 }), L(pt(-w, t), pt(w, -t), { lw: 13, color: 3 })); }
      const yz = `${e.no || 'D'} ${e.yuv ? 'Ø' + Math.round(e.w * 1000) : Math.round(e.w * 1000) + '×' + Math.round(e.h * 1000)}`; out.push(TX([p[0] + n[0] * (0.25 + h), p[1] + n[1] * (0.25 + h), 0], h, yz, 0, 'MC', { color: 3 }), TX([p[0] + n[0] * (0.25 + h) , p[1] + n[1] * (0.25 + h) - h * 1.4, 0], h * 0.8, `eks. ${e.p[2] >= 0 ? '+' : ''}${f(e.p[2] || 0, 2)}`, 0, 'MC', { color: 8 })); return out; },
    snaps: e => [{ p: [e.p[0], e.p[1], 0], k: 'cen' }], xf: (e, X) => { const q = X.p([e.p[0], e.p[1], 0]); e.p = [q[0], q[1], e.p[2] || 0]; },
    info: e => `Geçiş deliği ${e.no || ''}: ${e.yuv ? 'Ø' + Math.round(e.w * 1000) + ' mm kovan' : Math.round(e.w * 1000) + '×' + Math.round(e.h * 1000) + ' mm'} · ${e.yer || ''} · eksen kotu ${f(e.p[2] || 0, 2)} · ${e.ad || ''}`,
  };

  /* ---------- delikleri modele işle ---------- */
  const delikTemizle = () => { let n = 0; for (const e of C.doc.ents) if (Array.isArray(e.bosluk3) && e.bosluk3.some(b => b && b.mt)) { e.bosluk3 = e.bosluk3.filter(b => !(b && b.mt)); if (!e.bosluk3.length) delete e.bosluk3; delete e._c; n++; } C.doc.ents = C.doc.ents.filter(e => e.type !== 'mtdelik'); return n; };
  const r3 = v => +v.toFixed(4);
  MT.delikAc = (gec) => {
    delikTemizle(); let n = 0; const list = [];
    for (const g of gec) { const h = g.h, y = g.y, e = y.e, yuv = !h.w, pay = yuv ? 0.02 : 0.03, w = yuv ? Math.max(0.05, 2 * (h.cap || h.r) + 2 * pay) : h.w + 2 * pay, hh = yuv ? w : h.h + 2 * pay; let pts, d, ang = 0, cz = g.p[2], cp = [g.p[0], g.p[1]];
      if (y.tur === 'plak') { const z = y.zb - 0.02; d = [0, 0, y.t + 0.04]; pts = yuv ? Array.from({ length: 20 }, (_, i) => [cp[0] + w / 2 * Math.cos(i * Math.PI / 10), cp[1] + w / 2 * Math.sin(i * Math.PI / 10), z]) : [[-w / 2, -hh / 2], [w / 2, -hh / 2], [w / 2, hh / 2], [-w / 2, hh / 2]].map(q => [cp[0] + q[0], cp[1] + q[1], z]); cz = y.zt; }
      else { /* duvar: delik ekseni duvara dik; merkez duvar ekseni üzerine izdüşürülür */
        const dx = cp[0] - y.sa[0], dy = cp[1] - y.sa[1], o = dx * y.nn[0] + dy * y.nn[1], om = (y.o0 + y.o1) / 2; cp = [cp[0] + y.nn[0] * (om - o), cp[1] + y.nn[1] * (om - o)]; ang = Math.atan2(y.u[1], y.u[0]);
        const b0 = [cp[0] + y.nn[0] * (y.o0 - om - 0.02), cp[1] + y.nn[1] * (y.o0 - om - 0.02)]; d = [y.nn[0] * (y.t + 0.04), y.nn[1] * (y.t + 0.04), 0];
        pts = yuv ? Array.from({ length: 20 }, (_, i) => { const c = Math.cos(i * Math.PI / 10) * w / 2, s = Math.sin(i * Math.PI / 10) * w / 2; return [b0[0] + y.u[0] * c, b0[1] + y.u[1] * c, cz + s]; }) : [[-w / 2, -hh / 2], [w / 2, -hh / 2], [w / 2, hh / 2], [-w / 2, hh / 2]].map(q => [b0[0] + y.u[0] * q[0], b0[1] + y.u[1] * q[0], cz + q[1]]); }
      (e.bosluk3 = e.bosluk3 || []).push({ pts: pts.map(q => q.map(r3)), d: d.map(r3), mt: 1 }); delete e._c; n++;
      const x = C.add(C.newEnt('mtdelik', { layer: lay('MT_DELIK', 3, 25), dis: 'Mekanik', p: [r3(cp[0]), r3(cp[1]), r3(cz)], ang, w: r3(w), h: r3(hh), t: r3(y.t), yuv, dusey: y.tur === 'plak', no: 'D' + n, yer: y.ad, ad: h.ad, sys: h.sys, z0: undefined })); delete x.sp; delete x.z0;
      list.push(x); }
    return { n, list };
  };

  /* ---------- tablo (kağıt mm) ---------- */
  const tablo = (baslik, bas, col, rows, alt) => { const g = { L: [], T: [] }, rh = 6, n = rows.length, top = (n + 1) * rh, W = col[col.length - 1]; for (let i = 0; i <= n + 1; i++) g.L.push([0, top - i * rh, W, top - i * rh, i < 2 || i === n + 1 ? 'k' : 'i']); col.forEach((x, i) => g.L.push([x, top, x, top - (n + 1) * rh, i === 0 || i === col.length - 1 ? 'k' : 'i']));
    bas.forEach((b, i) => g.T.push([col[i] + 1.5, top - rh + 1.8, 2.2, b, 'L', 0, 2])); rows.forEach((r, i) => r.forEach((t, j) => g.T.push([col[j] + 1.5, top - (i + 2) * rh + 1.8, 2, String(t).slice(0, Math.floor((col[j + 1] - col[j]) / 1.25)), 'L', 0, 7]))); g.T.push([0, top + 4, 4, baslik, 'L', 0, 2]); if (alt) g.T.push([0, -5, 2.2, alt, 'L', 0, 7]); return g; };
  MT.cakismaTablo = r => r.cak.length ? tablo('ÇAKIŞMA LİSTESİ', ['No', 'Tesisat', 'Çakışma', 'Kot', 'Konum (x ; y)'], [0, 14, 44, 190, 208, 250], r.cak.map((c, i) => ['Ç' + (i + 1), c.sys, c.ad, f(c.p[2], 2), `${f(c.p[0], 2)} ; ${f(c.p[1], 2)}`]), 'Kolon ve kiriş delinmez: hattın güzergâhı değiştirilmelidir.') : null;
  MT.delikTablo = list => list.length ? tablo('GEÇİŞ DELİKLERİ LİSTESİ', ['No', 'Eleman', 'Boyut (mm)', 'Eksen / üst kot', 'Geçen tesisat'], [0, 14, 50, 84, 112, 230], list.map(e => [e.no, e.yer, e.yuv ? 'Ø' + Math.round(e.w * 1000) + ' kovan' : Math.round(e.w * 1000) + ' × ' + Math.round(e.h * 1000), f(e.p[2], 2), e.ad]), 'Yuvarlak geçişlerde kovan borusu, dikdörtgen geçişlerde çerçeveli boşluk bırakılır; boşluk tesisat dış ölçüsünden 2–3 cm büyüktür.') : null;

  /* ---------- komutlar ---------- */
  const isaretSil = () => { C.doc.ents = C.doc.ents.filter(e => e.type !== 'mtcakis'); };
  const tabloKoy = (tur, g) => { C.doc.ents = C.doc.ents.filter(e => !(e.type === 'mtsema' && e.tur === tur)); if (!g) return; if (MT._semaKoy) MT._semaKoy(tur, g); else { const bb = C.extents(C.doc.ents.filter(e => e.type !== 'sheet')) || [0, 0, 10, 10], e = C.add(C.newEnt('mtsema', { layer: lay('MT_SEMA', 7, 25), dis: 'Mekanik', p: [bb[2] + 12, bb[1], 0], g, tur })); delete e.sp; } };
  MT.cakismaCalistir = (delik) => {
    const r = MT.cakismaBul(); isaretSil(); delikTemizle();
    r.cak.forEach((c, i) => { const x = C.add(C.newEnt('mtcakis', { layer: lay('MT_CAKISMA', 1, 35), dis: 'Mekanik', p: [r3(c.p[0]), r3(c.p[1]), r3(c.p[2])], no: 'Ç' + (i + 1), ad: c.ad, sys: c.sys })); delete x.sp; });
    let d = { n: 0, list: [] }; if (delik) d = MT.delikAc(r.gec);
    C.doc.ents = C.doc.ents.filter(e => !(e.type === 'mtsema' && (e.tur === 'caklist' || e.tur === 'deliklist')));
    tabloKoy('caklist', MT.cakismaTablo(r)); tabloKoy('deliklist', MT.delikTablo(d.list));
    MT._cakSon = { r, d, zaman: Date.now() }; C.changed(); C.emit && C.emit('layers'); return { r, d };
  };
  C.addCommand(['CAKISMA', 'CAKISMADENETIMI', 'CLASH'], 'Çakışma denetimi: bütün tesisat hatlarını yapı elemanlarına (kolon, kiriş, perde, döşeme) ve birbirine karşı dener; çakışmaları planda ve 3B\'de kırmızı işaretler, duvar / döşeme geçişlerinde delikleri modele açar (E) ve listeler.', async (I) => {
    if (!hatlar().length) { C.warn('Denetlenecek tesisat hattı yok: önce kalorifer / soğutma / havalandırma (ya da sıhhi) tesisatını oluşturun.'); return; }
    const k = await I.kw('Duvar ve döşeme geçişlerinde delikler modele açılsın mı?', [['E', 'Evet — delikleri aç ve planda işaretle'], ['H', 'Hayır — yalnız denetle']], 'E'); if (!k) return;
    C.undoStack.push(C.snapshot()); const { r, d } = MT.cakismaCalistir(k === 'E');
    C.log(`Çakışma denetimi: ${r.nHat} tesisat hattı, ${r.nYapi} yapı elemanı denendi — ${r.cak.length} çakışma, ${r.gec.length} geçiş${k === 'E' ? ` (${d.n} delik modele açıldı)` : ''}${r.bilgi.length ? `, ${r.bilgi.length} duvar içi hat` : ''}.`);
    r.cak.slice(0, 12).forEach((c, i) => C.warn(`Ç${i + 1}: ${c.ad} — kot ${f(c.p[2], 2)}, konum ${f(c.p[0], 2)} ; ${f(c.p[1], 2)}`)); if (r.cak.length > 12) C.warn(`… ve ${r.cak.length - 12} çakışma daha (listenin tamamı modelin sağındaki tabloda ve raporda).`);
    if (!r.cak.length) C.log('Tesisat ile taşıyıcı elemanlar arasında ve tesisatlar arasında çakışma bulunmadı.');
  });
  C.addCommand(['DELIKAC', 'GECISDELIK', 'TESISATDELIK'], 'Tesisatın duvar ve döşeme geçişlerinde delikleri modele açar (perde / duvar / döşemede boşluk: 3B, kesit ve planda görünür), planda D1, D2 … olarak işaretler ve listeler. Önceki delikler yenilenir.', async () => {
    if (!hatlar().length) { C.warn('Tesisat hattı yok.'); return; } C.undoStack.push(C.snapshot()); const r = MT.cakismaBul(), d = MT.delikAc(r.gec); tabloKoy('deliklist', MT.delikTablo(d.list)); MT._cakSon = { r, d, zaman: Date.now() }; C.changed(); C.emit && C.emit('layers');
    C.log(d.n ? `${d.n} geçiş deliği modele açıldı ve planda işaretlendi (${d.list.filter(e => e.dusey).length} döşeme, ${d.list.filter(e => !e.dusey).length} duvar). Tesisat değişince DELIKAC ile yenileyin.` : 'Duvar ya da döşeme kesen tesisat hattı bulunmadı; delik gerekmiyor.');
  });
  C.addCommand(['CAKISMASIL', 'DELIKSILMT'], 'Çakışma işaretlerini, geçiş deliği işaretlerini, listelerini ve bu modülün modele açtığı delikleri kaldırır.', async () => { C.undoStack.push(C.snapshot()); isaretSil(); const n = delikTemizle(); C.doc.ents = C.doc.ents.filter(e => !(e.type === 'mtsema' && (e.tur === 'caklist' || e.tur === 'deliklist'))); MT._cakSon = null; C.changed(); C.log(`Çakışma ve geçiş işaretleri kaldırıldı; ${n} elemandaki tesisat delikleri kapatıldı.`); });

  /* ---------- rapor ---------- */
  MT.raporEk = MT.raporEk || [];
  MT.raporEk.push(() => { if (!hatlar().length) return ''; let r; try { r = MT.cakismaBul(); } catch (er) { console.error(er); return ''; } const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'), dl = C.doc.ents.filter(e => e.type === 'mtdelik');
    return `<h2>14. Çakışma denetimi ve geçiş delikleri</h2><div class="kart"><div><b>${r.cak.length}</b><span>Çakışma</span></div><div><b>${r.gec.length}</b><span>Duvar / döşeme geçişi</span></div><div><b>${dl.length}</b><span>Modele açılmış delik</span></div><div><b>${r.nHat}</b><span>Denetlenen tesisat hattı</span></div></div>
<p class="mut">Tesisat hatları (kalorifer ve soğutma boruları, kolonlar, hava kanalları, klima boru hattı, duvar fanı ve panjurlar) kolon, kiriş, perde / duvar ve döşemelere karşı 4 cm adımla denenmiştir. Kolon ve kiriş içinden geçen hat çakışma sayılır; duvarı ya da döşemeyi dik kesen hat için geçiş deliği gerekir.</p>
${r.cak.length ? `<h3>Çakışmalar</h3><table><tr><th>No</th><th>Tesisat</th><th>Çakışma</th><th class="n">Kot</th><th class="n">x ; y</th></tr>${r.cak.map((c, i) => `<tr><td>Ç${i + 1}</td><td>${esc(c.sys)}</td><td>${esc(c.ad)}</td><td class="n">${f(c.p[2], 2)}</td><td class="n">${f(c.p[0], 2)} ; ${f(c.p[1], 2)}</td></tr>`).join('')}</table>` : '<p><b>Çakışma bulunmadı.</b></p>'}
${dl.length ? `<h3>Geçiş delikleri</h3><table><tr><th>No</th><th>Eleman</th><th>Boyut</th><th class="n">Eksen / üst kot</th><th>Geçen tesisat</th></tr>${dl.map(e => `<tr><td>${esc(e.no)}</td><td>${esc(e.yer)}</td><td>${e.yuv ? 'Ø' + Math.round(e.w * 1000) + ' mm kovan' : Math.round(e.w * 1000) + ' × ' + Math.round(e.h * 1000) + ' mm'}</td><td class="n">${f(e.p[2], 2)}</td><td>${esc(e.ad)}</td></tr>`).join('')}</table>` : (r.gec.length ? '<p class="mut">Geçiş delikleri henüz modele işlenmemiş: DELIKAC komutunu çalıştırın.</p>' : '')}
<div class="not">Denetim eksen çizgisi üzerinden yapılır; cihaz gövdeleri (radyatör, fancoil, fan) ve boru bağlantı parçaları denetlenmez. Betonarme elemanlardaki delikler statik projeyle birlikte değerlendirilmelidir; program delik çevresi donatısını hesaplamaz.</div>`; });
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : (globalThis.C = globalThis.C || {}));

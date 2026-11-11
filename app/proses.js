/* ArıtmaCAD — PROSES modülü: ATV-A 131 hesabından gelen ünite ebatlarıyla akıllı ünite blokları
   Akış: ATV hesap penceresi "ArıtmaCAD'e aktar" → proses verisi (C.doc.set.proses) → PROSES komutu ile üniteler çizime yerleşir.
   Hesap yeniden aktarılınca çizimdeki üniteler yerini/dönüşünü/kotunu koruyarak yeni ebatlara güncellenir.
   Varlık: { type:'unite', u, kind, code, name, d (ATV ebatları), o (dış sol-alt köşe), rot, zt (duvar üst kotu), tw, ti, tb }
   Duvar/taban kalınlıkları şimdilik varsayılan; TS 500 ön statik modülü eklenince otomatik gelecek. */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, RAD = Math.PI / 180;
  const { L, P, CI, TX } = C.prim;
  const { boxM, cylZ } = C.meshDef;
  const tH = mm => C.annoH(mm == null ? C.doc.set.textH : mm);
  const f1 = v => M.fmt(v, 1).replace('.', ','), f2 = v => M.fmt(v, 2).replace('.', ','), f0 = v => Math.round(v).toLocaleString('tr-TR');

  /* ---------- ünite sınıfları ---------- */
  const UNIT = {
    cs: { n: 'Kaba ızgara', c: 'T-101', kind: 'screen' }, ps: { n: 'Giriş pompa istasyonu', c: 'T-102', kind: 'pump' },
    fs: { n: 'İnce ızgara', c: 'T-103', kind: 'screen' }, gr: { n: 'Havalandırmalı kum ve yağ tutucu', c: 'T-104', kind: 'grit' },
    pc: { n: 'Ön çöktürme', c: 'T-105', kind: 'auto' }, cp: { n: 'Kimyasal fosfor giderimi', c: 'T-106', kind: 'vtank' },
    an: { n: 'Anaerobik havuz', c: 'T-107', kind: 'rect' }, bio: { n: 'Biyolojik havuz', c: 'T-108', kind: 'rect' },
    sc: { n: 'Son çöktürme', c: 'T-109', kind: 'circ' }, pt: { n: 'Çamur yoğunlaştırma', c: 'T-110', kind: 'circ' },
    et: { n: 'Çamur depolama', c: 'T-111', kind: 'rect' }, dw: { n: 'Çamur susuzlaştırma', c: 'T-112', kind: 'vtank' },
    uv: { n: 'UV dezenfeksiyon', c: 'T-113', kind: 'uv' },
  };
  const ORDER = ['cs', 'ps', 'fs', 'gr', 'pc', 'cp', 'an', 'bio', 'sc', 'pt', 'et', 'dw', 'uv'];
  C.PROSES_ORDER = ORDER;
  const ZONE = { AN: { n: 'Anaerobik', c: 30 }, AX: { n: 'Anoksik', c: 150 }, OX: { n: 'Aerobik', c: 3 }, SIM: { n: 'Sim. DN', c: 4 }, INT: { n: 'Kesikli DN', c: 4 }, ST: { n: '', c: 7 } };
  const kindOf = (u, d) => { const k = (UNIT[u] || {}).kind || 'rect'; return k === 'auto' ? (d.circ ? 'circ' : 'rect') : k; };
  const DEF_T = { rect: [0.4, 0.3, 0.5], circ: [0.4, 0, 0.5], screen: [0.3, 0, 0.4], grit: [0.3, 0.2, 0.4], pump: [0.4, 0.3, 0.6], vtank: [0.3, 0, 0.4], uv: [0.3, 0, 0.4] };

  /* ---------- yerel yerleşim (x = akış yönü, y = enine; köken = dış sol-alt köşe) ---------- */
  function layout(e) {
    const d = e.d || {}, tw = e.tw, ti = e.ti, k = e.kind;
    const out = { cells: [], walls: [], parts: [], circles: [], Lo: 0, Wo: 0, Htot: 0, hw: 0, open: false, pumps: [] };
    const frame4 = (Lo, Wo) => { out.walls.push([0, 0, Lo, tw], [0, Wo - tw, Lo, tw], [0, tw, tw, Wo - 2 * tw], [Lo - tw, tw, tw, Wo - 2 * tw]); };
    if (k === 'rect') {
      const N = Math.max(1, Math.round(d.N || 1)), Lb = +d.L, W = +d.W;
      out.Lo = Lb + 2 * tw; out.Wo = N * W + (N + 1) * tw; out.hw = +d.h; out.Htot = +d.h + (d.fb != null ? +d.fb : 0.5);
      frame4(out.Lo, out.Wo);
      const zones = (d.zones && d.zones.length ? d.zones : [{ t: 'ST', n: '', f: 1 }]);
      for (let i = 0; i < N; i++) {
        const y = tw + i * (W + tw);
        if (i > 0) out.walls.push([tw, y - tw, Lb, tw]);
        let x = tw; const zs = [];
        zones.forEach((z, j) => { const zl = Lb * (z.f != null ? z.f : 1 / zones.length); zs.push({ x, l: zl, t: z.t, n: z.n || (ZONE[z.t] || {}).n || '', V: z.V != null ? z.V / N : zl * W * d.h }); if (j > 0) out.parts.push([x - ti / 2, y, ti, W]); x += zl; });
        out.cells.push({ x: tw, y, L: Lb, W, zones: zs });
      }
    } else if (k === 'pump') {
      const N = Math.max(1, Math.round(d.nc || 1)), Lb = +d.L, W = +d.W;
      out.Lo = Lb + 2 * tw; out.Wo = N * W + (N + 1) * tw; out.hw = +d.hd + +d.hu; out.Htot = out.hw + (+d.hf || 1);
      frame4(out.Lo, out.Wo);
      for (let i = 0; i < N; i++) {
        const y = tw + i * (W + tw); if (i > 0) out.walls.push([tw, y - tw, Lb, tw]);
        out.cells.push({ x: tw, y, L: Lb, W, lab: 'Bölme ' + (i + 1) });
        const n = Math.max(1, Math.round(d.n || 1)), pd = Math.min(0.9, W * 0.35, Lb / (n * 1.6));
        for (let j = 0; j < n; j++) out.pumps.push({ x: tw + Lb * (j + 0.5) / n, y: y + W * 0.5, D: pd });
      }
    } else if (k === 'screen' || k === 'uv') {
      const n = Math.max(1, Math.round((+d.N || 1) + (k === 'screen' ? (+d.Nsb || 0) : 0))), b = +d.b, Lb = +d.L || 6;
      out.open = true; out.Lo = Lb; out.Wo = n * b + (n + 1) * tw; out.hw = +d.h; out.Htot = k === 'screen' && d.H ? +d.H : +d.h + 0.5;
      for (let i = 0; i <= n; i++) out.walls.push([0, i * (b + tw), Lb, tw]);
      for (let i = 0; i < n; i++) out.cells.push({ x: 0, y: tw + i * (b + tw), L: Lb, W: b, lab: k === 'uv' ? 'Kanal ' + (i + 1) : (i < (+d.N || 1) ? 'Kanal ' + (i + 1) : 'Yedek'), spare: k === 'screen' && i >= (+d.N || 1) });
    } else if (k === 'grit') {
      const n = Math.max(1, Math.round(+d.N || 1)), b = +d.b, bF = +d.bF || 0, Lb = +d.L, wl = b + (bF ? ti + bF : 0);
      out.open = true; out.Lo = Lb; out.Wo = n * wl + (n + 1) * tw; out.hw = +d.h; out.Htot = +d.h + 0.5;
      for (let i = 0; i <= n; i++) out.walls.push([0, i * (wl + tw), Lb, tw]);
      for (let i = 0; i < n; i++) {
        const y = tw + i * (wl + tw);
        out.cells.push({ x: 0, y, L: Lb, W: b, lab: 'Kum ' + (i + 1) });
        if (bF) { out.parts.push([0, y + b, Lb, ti]); out.cells.push({ x: 0, y: y + b + ti, L: Lb, W: bF, lab: 'Yağ' }); }
      }
    } else if (k === 'circ' || k === 'vtank') {
      const N = Math.max(1, Math.round(+d.N || 1)), D = +d.D, R = D / 2, gap = k === 'vtank' ? 2 : 6, Ro = R + tw;
      for (let i = 0; i < N; i++) out.circles.push({ x: Ro + i * (2 * Ro + gap), y: Ro, D, Din: +d.Din || 0 });
      out.Lo = N * 2 * Ro + (N - 1) * gap; out.Wo = 2 * Ro;
      out.hw = +d.h; out.Htot = k === 'vtank' ? (+d.H || +d.h + 0.5) : +d.h + 0.5;
    }
    return out;
  }
  C.uniteLayout = layout;

  /* ---------- ölçü çizgisi (yerel çerçevede) ---------- */
  const dimP = (f, a, b, off, z, txt, h) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); if (l < 1e-6) return [];
    const ux = dx / l, uy = dy / l, nx = -uy * off, ny = ux * off, tk = h * 0.5;
    const A = [a[0] + nx, a[1] + ny], B = [b[0] + nx, b[1] + ny], s = Math.sign(off) || 1;
    const ang = Math.atan2(dy, dx) / RAD + (e_rot || 0); let rd = ((ang % 360) + 360) % 360; if (rd > 90 && rd <= 270) rd -= 180;
    return [
      L(f.at(a[0] + nx * 0.15, a[1] + ny * 0.15, z), f.at(a[0] + nx * 1.12, a[1] + ny * 1.12, z), { color: 3, lw: 13 }),
      L(f.at(b[0] + nx * 0.15, b[1] + ny * 0.15, z), f.at(b[0] + nx * 1.12, b[1] + ny * 1.12, z), { color: 3, lw: 13 }),
      L(f.at(A[0], A[1], z), f.at(B[0], B[1], z), { color: 3, lw: 13 }),
      L(f.at(A[0] - (ux + uy) * tk, A[1] - (uy - ux) * tk, z), f.at(A[0] + (ux + uy) * tk, A[1] + (uy - ux) * tk, z), { color: 3, lw: 25 }),
      L(f.at(B[0] - (ux + uy) * tk, B[1] - (uy - ux) * tk, z), f.at(B[0] + (ux + uy) * tk, B[1] + (uy - ux) * tk, z), { color: 3, lw: 25 }),
      TX(f.at((A[0] + B[0]) / 2 - uy * h * 0.35 * s, (A[1] + B[1]) / 2 + ux * h * 0.35 * s, z), h, txt, rd * RAD, 'C', { color: 3 }),
    ];
  };
  let e_rot = 0;
  const rectP = (f, x, y, w, h, z, o) => P([f.at(x, y, z), f.at(x + w, y, z), f.at(x + w, y + h, z), f.at(x, y + h, z)], true, o);
  const circP = (f, x, y, r, z, o) => CI(f.at(x, y, z), r, o);

  /* ---------- AKILLI ÜNİTE varlığı ---------- */
  T.unite = {
    label: 'Proses ünitesi', ifc: 'IfcTank',
    prims: e => {
      const f = C.frame(e.o, e.rot), z = e.zt, lay = layout(e), out = [], h = tH(), hB = tH(3.5), rot = (e.rot || 0) * RAD;
      e_rot = e.rot || 0;
      const rd = (() => { let r = ((e.rot || 0) % 360 + 360) % 360; if (r > 90 && r <= 270) r -= 180; return r * RAD; })();
      if (lay.circles.length) {
        for (const c of lay.circles) {
          const R = c.D / 2;
          out.push(circP(f, c.x, c.y, R, z, { lw: 50 }), circP(f, c.x, c.y, R + e.tw, z, { lw: 50 }));
          if (e.kind === 'circ') {
            if (c.Din) out.push(circP(f, c.x, c.y, c.Din / 2, z, { lt: 'DASHED', lw: 18 }));
            out.push(circP(f, c.x, c.y, R - 0.5, z, { lt: 'HIDDEN', lw: 13, color: 8 })); // savak oluğu
            out.push(rectP(f, c.x, c.y - 0.6, R, 1.2, z, { color: 8, lw: 18 })); // köprü
          }
          out.push(L(f.at(c.x - R - e.tw * 2, c.y, z), f.at(c.x + R + e.tw * 2, c.y, z), { lt: 'CENTER', lw: 13, color: 1 }), L(f.at(c.x, c.y - R - e.tw * 2, z), f.at(c.x, c.y + R + e.tw * 2, z), { lt: 'CENTER', lw: 13, color: 1 }));
          out.push(TX(f.at(c.x, c.y - R * 0.45, z), h, 'Ø' + f2(c.D), rd, 'M'));
        }
      } else {
        if (!lay.open) out.push(rectP(f, 0, 0, lay.Lo, lay.Wo, z, { lw: 50 }));
        for (const w of lay.walls) if (lay.open) out.push(L(f.at(w[0], w[1], z), f.at(w[0] + w[2], w[1], z), { lw: 50 }), L(f.at(w[0], w[1] + w[3], z), f.at(w[0] + w[2], w[1] + w[3], z), { lw: 50 }), L(f.at(w[0], w[1], z), f.at(w[0], w[1] + w[3], z), { lw: 35 }), L(f.at(w[0] + w[2], w[1], z), f.at(w[0] + w[2], w[1] + w[3], z), { lw: 35 }));
        for (const c of lay.cells) if (!lay.open) out.push(rectP(f, c.x, c.y, c.L, c.W, z, { lw: 50 }));
        for (const p of lay.parts) out.push(rectP(f, p[0], p[1], p[2], p[3], z, { lw: 35 }));
        for (const c of lay.cells) {
          if (c.zones) {
            for (const zn of c.zones) {
              const zc = (ZONE[zn.t] || ZONE.ST).c, cx = zn.x + zn.l / 2;
              if (zn.n) out.push(TX(f.at(cx, c.y + c.W * 0.62, z), zn.l > 12 ? hB : h, zn.n, rd, 'M', { color: zc }));
              out.push(TX(f.at(cx, c.y + c.W * 0.62 - (zn.l > 12 ? hB : h) * 1.7, z), h, f0(zn.V) + ' m³', rd, 'M', { color: zc }));
              if (zn.t === 'AN' || zn.t === 'AX' || zn.t === 'SIM') { // karıştırıcı simgesi
                const mx = cx, my = c.y + c.W * 0.25, r = Math.min(1.0, zn.l * 0.12, c.W * 0.08);
                out.push(circP(f, mx, my, r, z, { color: 1, lw: 25 }), L(f.at(mx - r * 1.6, my, z), f.at(mx + r * 1.6, my, z), { color: 1, lw: 25 }));
              }
              if (zn.t === 'OX' || zn.t === 'SIM' || zn.t === 'INT') { // difüzör ızgarası (temsili)
                const A = zn.l * c.W, s = Math.max(1.5, Math.sqrt(A / 110)), nx = Math.max(1, Math.floor((zn.l - 1) / s)), ny = Math.max(1, Math.floor((c.W - 1) / s));
                for (let a = 0; a < nx; a++) for (let b = 0; b < ny; b++) { const px = zn.x + (a + 0.5) * zn.l / nx, py = c.y + (b + 0.5) * c.W / ny; if (Math.abs(py - (c.y + c.W * 0.62)) < hB * 1.6 && Math.abs(px - cx) < zn.l * 0.3) continue; out.push(circP(f, px, py, Math.min(0.45, s * 0.1), z, { color: 4, lw: 9 })); }
              }
              if (zn.l * 1 > h * 6) out.push(...dimP(f, [zn.x, c.y], [zn.x + zn.l, c.y], -(e.tw + h * 2.2), z, f2(zn.l), h));
            }
          } else if (c.lab) out.push(TX(f.at(c.x + c.L / 2, c.y + c.W / 2, z), Math.min(h, c.W * 0.4), c.lab, rd, 'M', { color: c.spare ? 8 : 7 }));
          if (e.kind === 'screen' && !c.spare) out.push(L(f.at(c.L * 0.45, c.y, z), f.at(c.L * 0.45, c.y + c.W, z), { color: 6, lw: 35 }), L(f.at(c.L * 0.45 + 0.15, c.y, z), f.at(c.L * 0.45 + 0.15, c.y + c.W, z), { color: 6, lw: 13, lt: 'DASHED' }));
          if (e.kind === 'screen' && c.spare) out.push(L(f.at(c.L * 0.45, c.y, z), f.at(c.L * 0.45, c.y + c.W, z), { color: 8, lw: 25, lt: 'DASHED' }));
        }
        for (const p of lay.pumps) out.push(circP(f, p.x, p.y, p.D / 2, z, { color: 1, lw: 35 }), circP(f, p.x, p.y, p.D * 0.2, z, { color: 1, lw: 18 }));
        // akış okları (giriş solda, çıkış sağda)
        const ar = (x0, x1, y) => { const s = Math.sign(x1 - x0) || 1, a = Math.min(1.5, Math.abs(x1 - x0) * 0.25); return [L(f.at(x0, y, z), f.at(x1, y, z), { color: 5, lw: 35 }), L(f.at(x1, y, z), f.at(x1 - s * a, y + a * 0.4, z), { color: 5, lw: 35 }), L(f.at(x1, y, z), f.at(x1 - s * a, y - a * 0.4, z), { color: 5, lw: 35 })]; };
        for (const c of lay.cells) { if (c.spare || (c.lab === 'Yağ')) continue; const yc = c.y + c.W / 2, ln = Math.max(2, Math.min(6, lay.Lo * 0.06)); out.push(...ar(-ln - 0.3, -0.3, yc), ...ar(lay.Lo + 0.3, lay.Lo + ln + 0.3, yc)); }
        // genel ölçüler
        out.push(...dimP(f, [0, lay.Wo], [lay.Lo, lay.Wo], h * 3.2, z, f2(lay.Lo), h));
        out.push(...dimP(f, [lay.Lo, 0], [lay.Lo, lay.Wo], -(h * 3.2 + Math.max(2, Math.min(6, lay.Lo * 0.06)) + 0.6), z, f2(lay.Wo), h));
      }
      // başlık
      const n = (e.d && (e.d.N || e.d.nc)) || 1, ty = lay.Wo + h * 7.5;
      out.push(TX(f.at(lay.Lo / 2, ty, z), hB, `${e.code || ''} ${e.name || ''}`.trim(), rd, 'C', { color: 2 }));
      out.push(TX(f.at(lay.Lo / 2, ty - hB * 1.5, z), h, sumText(e, lay), rd, 'C'));
      return out;
    },
    mesh: e => {
      const f = C.frame(e.o, e.rot), lay = layout(e), zIn = e.zt - lay.Htot, zb = zIn - e.tb, H = e.zt - zIn, out = [];
      if (lay.circles.length) {
        for (const c of lay.circles) {
          const cc = f.at(c.x, c.y, 0), R = c.D / 2;
          out.push(Object.assign(cylZ(cc, R + e.tw, zIn, H), { prof: { r: R + e.tw, ri: R } }), cylZ(cc, R + e.tw, zb, e.tb));
        }
        return out;
      }
      for (const w of lay.walls) out.push(boxM(f, w[0], w[1], zIn, w[2], w[3], H));
      for (const p of lay.parts) out.push(boxM(f, p[0], p[1], zIn, p[2], p[3], H));
      out.push(boxM(f, 0, 0, zb, lay.Lo, lay.Wo, e.tb));
      return out;
    },
    snaps: e => { const f = C.frame(e.o, e.rot), lay = layout(e); return [[0, 0], [lay.Lo, 0], [lay.Lo, lay.Wo], [0, lay.Wo]].map(q => ({ p: f.at(q[0], q[1], e.zt), k: 'end' })).concat(lay.circles.map(c => ({ p: f.at(c.x, c.y, e.zt), k: 'cen' }))); },
    xf: (e, X) => {
      const lay = layout(e), f = C.frame(e.o, e.rot);
      const o2 = X.mir ? X.p(f.at(0, lay.Wo)) : X.p(e.o);
      const v = X.v([Math.cos((e.rot || 0) * RAD), Math.sin((e.rot || 0) * RAD), 0]);
      e.rot = Math.atan2(v[1], v[0]) / RAD; e.o = [o2[0], o2[1], e.o[2] || 0];
      if (X.s && Math.abs(X.s - 1) > 1e-9) C.warn('Proses ünitesi ölçeklenmez; ebatlar hesaptan gelir.');
    },
    info: e => `${e.code || ''} ${e.name || ''} — ${sumText(e, layout(e))}; üst kot ${C.fmtKot(e.zt)}, duvar ${M.fmt(e.tw)} m, taban ${M.fmt(e.tb)} m`,
  };
  function sumText(e, lay) {
    const d = e.d || {};
    if (e.kind === 'rect') return `${d.N || 1} × ${f1(d.L)} × ${f1(d.W)} m, su derinliği ${f2(d.h)} m, V = ${f0((d.N || 1) * d.L * d.W * d.h)} m³`;
    if (e.kind === 'circ') return `${d.N || 1} × Ø${f1(d.D)} m, kenar su derinliği ${f2(d.h)} m`;
    if (e.kind === 'vtank') return `${d.N || 1} × Ø${f2(d.D)} m, H = ${f2(d.H || d.h)} m`;
    if (e.kind === 'pump') return `${d.nc || 1} bölme × ${f2(d.L)} × ${f2(d.W)} m, ${d.nd || ''} pompa, derinlik ${f2(lay.Htot)} m`;
    if (e.kind === 'screen') return `${d.N || 1}+${d.Nsb || 0} kanal, b = ${f2(d.b)} m, L = ${f1(d.L)} m, e = ${d.e || '-'} mm`;
    if (e.kind === 'grit') return `${d.N || 1} hat, b = ${f2(d.b)} + ${f2(d.bF || 0)} m, L = ${f1(d.L)} m, h = ${f2(d.h)} m`;
    if (e.kind === 'uv') return `${d.N || 1} kanal, b = ${f2(d.b)} m, L = ${f1(d.L)} m`;
    return '';
  }

  /* ---------- proses verisi ---------- */
  const store = { get: () => { try { return JSON.parse(localStorage.getItem('aritmacad.proses') || 'null'); } catch (e) { return null; } }, set: v => { try { localStorage.setItem('aritmacad.proses', JSON.stringify(v)); } catch (e) { } } };
  C.proses = () => (C.doc && C.doc.set && C.doc.set.proses) || store.get();

  /* eski (rapor tabanlı, sürüm 1) dosyayı ATV biçimine çevir */
  function fromV1(j) {
    const units = {}; const tz = { anaerobik: 'AN', anoksik: 'AX', aerobik: 'OX', 're-aerasyon': 'OX', reaerasyon: 'OX' };
    for (const x of j.uniteler || []) {
      if (x.tip === 'kademeli_havuz') {
        const Lb = x.kademeler.reduce((s, k) => s + k.uzunluk_m, 0);
        units.bio = { kod: 'T-108', ad: x.ad, dim: { L: Lb, W: x.genislik_m, h: x.su_derinligi_m, fb: x.hava_payi_m != null ? x.hava_payi_m : 0.5, N: x.adet || 1, zones: x.kademeler.map(k => ({ t: tz[C.ascii(k.ad).toLowerCase().replace(/-?\d+$/, '')] || 'ST', n: k.ad, V: k.hacim_m3 * (x.adet || 1), f: k.uzunluk_m / Lb })) } };
      } else if (x.tip === 'izgara_kanali') units.cs = { kod: 'T-101', ad: x.ad, dim: { N: x.asil || x.adet, Nsb: x.yedek || 0, b: x.kanal_genislik_m, h: x.su_derinligi_pik_m, H: x.su_derinligi_pik_m + 0.5, L: x.uzunluk_m || 8, th: x.egim_derece, e: x.cubuk_araligi_mm } };
      else if (x.tip === 'pompa_istasyonu') units.ps = { kod: 'T-102', ad: x.ad, dim: { L: x.islak_hazne.uzunluk_m, W: x.islak_hazne.genislik_m, hd: 1.0, hu: x.islak_hazne.derinlik_m - 1.0, hf: 1.5, n: Math.ceil((x.pompa.asil + x.pompa.yedek) / (x.bolme_adet || 1)), nd: x.pompa.asil, nc: x.bolme_adet || 1 } };
      else if (x.tip === 'dikdortgen_havuz') { const A = x.taban_alani_m2, Lb = Math.sqrt(A * 2); units.gr = units.gr || { kod: 'T-100', ad: x.ad, dim: { N: x.adet || 1, b: A / Lb, bF: 0, h: x.su_derinligi_m, L: Lb } }; }
    }
    return { format: 'AritmaCAD-proses', surum: 2, kaynak: j.proje && j.proje.kaynak, proje: { name: j.proje && j.proje.ad }, sistemAd: j.proje && j.proje.proses, units, debi: j.debiler };
  }
  function normalize(j) {
    if (!j || j.format !== 'AritmaCAD-proses') throw new Error('Bu bir ArıtmaCAD proses dosyası değil.');
    if (j.surum === 1 || j.uniteler) j = fromV1(j);
    if (!j.units || !Object.keys(j.units).length) throw new Error('Dosyada ünite yok.');
    return j;
  }
  /* yeni veri gelince çizimdeki üniteleri güncelle (yer, dönüş, kot, kalınlıklar korunur) */
  function apply(j, quiet) {
    j = normalize(j);
    const ents = C.doc.ents.filter(e => e.type === 'unite' && j.units[e.u]);
    if (ents.length) C.begin();
    C.doc.set.proses = j; store.set(j);
    let n = 0;
    for (const e of ents) { const u = j.units[e.u]; const ch = JSON.stringify(e.d) !== JSON.stringify(u.dim); e.d = JSON.parse(JSON.stringify(u.dim)); e.kind = kindOf(e.u, e.d); C.touch(e); if (ch) n++; }
    const list = ORDER.filter(u => j.units[u]);
    if (!quiet) {
      C.log(`Proses verisi alındı: ${j.proje && j.proje.name || ''} — ${j.sistemAd || ''}${j.kademe ? ' (' + j.kademe + ')' : ''}, ${list.length} ünite.`);
      if (ents.length) C.log(n ? `✓ Çizimdeki ${n} ünite yeni ebatlara güncellendi (yerleri korundu).` : 'Çizimdeki ünitelerin ebatları değişmedi.');
      else C.log('Üniteleri çizime yerleştirmek için PROSES komutunu kullanın.');
    }
    C.changed(); C.emit('proses', j);
    return j;
  }
  C.prosesApply = apply;

  if (typeof window !== 'undefined') window.addEventListener('message', ev => {
    const j = ev.data; if (!j || j.format !== 'AritmaCAD-proses') return;
    try { apply(j); } catch (err) { C.warn('Proses verisi okunamadı: ' + err.message); }
  });

  /* ---------- yerleştirme ---------- */
  const takeKV = () => { const kv = {}; C.cmd.queue = C.cmd.queue.filter(t => { const m = t.match(/^([A-Za-zÇĞİÖŞÜçğıöşü_]+)=(.*)$/); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; }); return kv; };
  const kvN = (kv, k, d) => kv[k] != null && !isNaN(C.num(kv[k])) ? C.num(kv[k]) : d;
  function makeUnit(u, j, o, rot, zt, kv) {
    const x = j.units[u], d = JSON.parse(JSON.stringify(x.dim)), kind = kindOf(u, d), t = DEF_T[kind] || [0.4, 0.3, 0.5];
    return C.newEnt('unite', { layer: C.std('BETON'), color: 256, u, kind, sira: Date.now(), code: x.kod || (UNIT[u] || {}).c || u, name: x.ad || (UNIT[u] || {}).n || u, d, o: [o[0], o[1], 0], rot: rot || 0, zt: zt || 0, tw: kvN(kv, 'K', t[0]), ti: kvN(kv, 'KI', t[1] || 0.3), tb: kvN(kv, 'KT', t[2]) });
  }
  const listText = j => ORDER.filter(u => j.units[u]).map(u => `${u.toUpperCase()} = ${(j.units[u].kod || '')} ${j.units[u].ad || UNIT[u].n}${C.doc.ents.some(e => e.type === 'unite' && e.u === u) ? ' (çizimde var)' : ''}`);

  C.addCommand(['PROSES', 'PROSESYERLESTIR', 'UNITE'], 'Proses hesabındaki üniteleri çizime yerleştirir. PROSES [Z=üstkot R=açı K=duvar KT=taban KI=bölme duvarı]', async (I) => {
    const kv = takeKV(); let j = C.proses();
    if (!j) {
      const a = await I.kw('Proses verisi yok. ATV penceresinde "ArıtmaCAD\'e aktar" deyin ya da dosya açın', [['AC', 'Dosya aç'], ['ATV', 'ATV hesabını aç'], ['IPTAL', 'İptal']], 'AC');
      if (a === 'ATV') { C.cmd.script && C.cmd.script('ATV131'); return; }
      if (a !== 'AC') return;
      j = await openFile(); if (!j) return;
    }
    const units = ORDER.filter(u => j.units[u]);
    listText(j).forEach(s => C.log('  ' + s));
    const pick = await I.kw('Ünite seçin', [...units.map(u => [u.toUpperCase(), (j.units[u].ad || UNIT[u].n)]), ['HEPSI', 'Hepsi (sıralı yerleşim)']], 'HEPSI');
    if (!pick) return;
    const zt = kvN(kv, 'Z', 0), rot = kvN(kv, 'R', 0);
    if (pick === 'HEPSI') {
      const tmp = units.map(u => makeUnit(u, j, [0, 0], 0, zt, kv)), gap = kvN(kv, 'ARA', 15);
      let x = 0; const pos = tmp.map(e => { const p = x; x += layout(e).Lo + gap; return p; });
      C.cmd.base = null; C.cmd.preview = c => { const out = []; tmp.forEach((e, i) => { const q = Object.assign({}, e, { o: M.polar(c, rot * RAD, pos[i]), rot, _c: null }); out.push(...T.unite.prims(q).filter((p, k) => k < 400)); }); return out; };
      const p = await I.pt('Yerleşimin başlangıç noktası (ilk ünitenin sol alt köşesi)'); C.cmd.preview = null;
      if (!p || typeof p === 'string') return;
      tmp.forEach((e, i) => { e.o = M.polar(p, rot * RAD, pos[i]); e.o[2] = 0; e.rot = rot; C.add(e); });
      C.log(`✓ ${tmp.length} ünite akış sırasıyla yerleştirildi. Taşıma / döndürme ile genel yerleşimi düzenleyin; hesap yeniden aktarılınca ebatlar güncellenir.`);
      return;
    }
    const u = pick.toLowerCase(); if (!j.units[u]) { C.warn('Bu ünite proses verisinde yok.'); return; }
    const e = makeUnit(u, j, [0, 0], rot, zt, kv);
    C.cmd.base = null; C.cmd.preview = c => T.unite.prims(Object.assign({}, e, { o: c, _c: null }));
    const p = await I.pt(`${e.code} ${e.name} — yerleştirme noktası (sol alt köşe)`); C.cmd.preview = null;
    if (!p || typeof p === 'string') return;
    e.o = [p[0], p[1], 0];
    C.cmd.base = p; C.cmd.preview = c => T.unite.prims(Object.assign({}, e, { rot: M.deg(M.ang(p, c)), _c: null }));
    const a = await I.angle('Dönüş açısı (Enter = ' + rot + '°)', p, rot); C.cmd.preview = null;
    e.rot = typeof a === 'number' ? a : rot;
    C.add(e); C.log(`✓ ${e.code} ${e.name}: ${sumText(e, layout(e))}`);
  });

  async function openFile() {
    if (!C.pickFile) { C.warn('Dosya seçici yok.'); return null; }
    const f = await C.pickFile('.json'); if (!f) return null;
    try { return apply(JSON.parse(await f.text())); } catch (err) { C.warn('Dosya okunamadı: ' + err.message); return null; }
  }
  C.addCommand(['PROSESAC', 'PROSESYUKLE'], 'Proses verisi dosyasını (.json) yükler; çizimdeki üniteleri günceller', async () => { await openFile(); }, { noUndo: true });
  C.addCommand(['PROSESKAYDET'], 'Geçerli proses verisini .json olarak kaydeder', async () => { const j = C.proses(); if (!j) return C.warn('Proses verisi yok.'); C.download(JSON.stringify(j, null, 2), C.ascii((j.proje && j.proje.name) || 'proses').replace(/\W+/g, '_') + '_proses.json', 'application/json'); }, { noUndo: true });
  C.addCommand(['PROSESGUNCELLE'], 'Çizimdeki üniteleri son proses verisine göre günceller', async () => { const j = C.proses(); if (!j) return C.warn('Proses verisi yok.'); apply(j); });
  C.addCommand(['PROSESOZET'], 'Proses verisindeki üniteleri ve ana ebatları listeler', async () => {
    const j = C.proses(); if (!j) return C.warn('Proses verisi yok. ATV hesabından aktarın ya da PROSESAC.');
    C.log(`${(j.proje && j.proje.name) || ''} — ${j.sistemAd || ''}`);
    ORDER.filter(u => j.units[u]).forEach(u => { const x = j.units[u], e = { kind: kindOf(u, x.dim), d: x.dim, tw: 0.4, ti: 0.3 }; C.log(`  ${x.kod || ''} ${x.ad || UNIT[u].n}: ${sumText(e, layout(e))}`); });
  }, { noUndo: true });
  C.addCommand(['UNITEDUZENLE', 'UNITEAYAR'], 'Seçilen ünitelerin kotunu ve kalınlıklarını değiştirir: UNITEDUZENLE [Z= K= KT= KI=]', async (I) => {
    const kv = takeKV(); const s = (await I.sel('Proses ünitelerini seçin')).filter(e => e.type === 'unite'); if (!s.length) return C.warn('Ünite seçilmedi.');
    let zt = kv.Z != null ? kvN(kv, 'Z', s[0].zt) : await I.num('Duvar üst kotu (m)', s[0].zt);
    for (const e of s) { e.zt = zt != null ? zt : e.zt; e.tw = kvN(kv, 'K', e.tw); e.tb = kvN(kv, 'KT', e.tb); e.ti = kvN(kv, 'KI', e.ti); C.touch(e); }
    C.log(`✓ ${s.length} ünite güncellendi.`);
  });

  /* ---------- KESİT ---------- */
  C.addCommand(['KESITUNITE', 'UNITEKESIT'], 'Seçilen proses ünitesinin kesitini (beton taramalı, kotlu, ölçülü) çizer', async (I) => {
    const s = (await I.sel('Kesiti alınacak üniteyi seçin')).filter(e => e.type === 'unite' || e.type === 'karusel'); if (!s.length) return C.warn('Proses ünitesi seçilmedi.');
    const e = s[0], lay = layout(e), circ = !!lay.circles.length;
    const dir = circ ? 'B' : await I.kw('Kesit yönü', [['B', 'Boyuna (akış yönünde)'], ['E', 'Enine']], 'B'); if (!dir) return;
    const p = await I.pt('Kesitin yerleşeceği nokta (sol alt)'); if (!p || typeof p === 'string') return;
    drawSection(e, lay, dir, p);
  });
  function drawSection(e, lay, dir, P0) {
    const zIn = e.zt - lay.Htot, zb = zIn - e.tb, zw = zIn + lay.hw, h = tH();
    const X = s => P0[0] + s, Y = z => P0[1] + (z - zb);
    const add = (t, pr) => C.add(C.newEnt(t, pr));
    const lK = C.std('KESIT'), lS = C.std('SU'), lO = C.std('OLCU'), lY = C.std('YAZI'), lKot = C.std('KOT'); C.ensureLayer('KESIT_TARAMA', 8, 'CONTINUOUS', 13);
    const loops = []; const rect = (s0, s1, z0, z1) => { const pts = [[X(s0), Y(z0)], [X(s1), Y(z0)], [X(s1), Y(z1)], [X(s0), Y(z1)]]; add('pline', { layer: lK, pts: pts.map(q => [q[0], q[1], 0]), closed: true, lw: 50 }); loops.push(pts); };
    let span = 0, gaps = [], title = '', zLow = zb;
    if (lay.circles.length) {
      const c = lay.circles[0], R = c.D / 2, tw = e.tw; span = 2 * (R + tw);
      const slope = e.kind === 'circ' ? (+e.d.slope || 0) : 0, hS = lay.hw, rh0 = 1.0, hop = e.kind === 'circ' ? Math.max(0.8, 0.012 * c.D + 0.8) : 0;
      const zSide = zw - hS, zCen = zSide - slope * (R - rh0);
      const prof = e.kind === 'circ' ? [[-R, zSide], [-rh0, zCen], [-0.5, zCen - hop], [0.5, zCen - hop], [rh0, zCen], [R, zSide]] : [[-R, zSide], [R, zSide]];
      const zBot = Math.min(...prof.map(q => q[1])) - e.tb, s0 = R + tw; zLow = zBot;
      rect(0, tw, zSide - e.tb, e.zt); rect(span - tw, span, zSide - e.tb, e.zt);
      const sl = [...prof.map(q => [X(s0 + q[0]), Y(q[1])]), ...prof.slice().reverse().map(q => [X(s0 + q[0]), Y(Math.min(q[1] - e.tb, zSide - e.tb))])];
      add('pline', { layer: lK, pts: sl.map(q => [q[0], q[1], 0]), closed: true, lw: 50 }); loops.push(sl);
      gaps = [[tw, span - tw]]; title = `KESİT — ${e.code} ${e.name} (Ø${f2(c.D)} m)`;
      add('kot', { layer: lKot, p: [X(span) + h * 2, Y(zSide), 0], v: zSide, txt: 'kenar' });
      if (e.kind === 'circ') add('kot', { layer: lKot, p: [X(s0), Y(zCen - hop), 0], v: zCen - hop, txt: 'huni' });
      add('dim', { layer: lO, k: 'h', a: [X(tw), Y(e.zt), 0], b: [X(span - tw), Y(e.zt), 0], p: [X(span / 2), Y(e.zt) + h * 4, 0] });
    } else {
      const along = dir !== 'E';
      const c0 = lay.cells[0], sc = along ? c0.y + c0.W / 2 : (c0.x + c0.L * 0.5);
      span = along ? lay.Lo : lay.Wo;
      const hits = [];
      for (const w of [...lay.walls, ...lay.parts]) { const [a0, a1, b0, b1] = along ? [w[1], w[1] + w[3], w[0], w[0] + w[2]] : [w[0], w[0] + w[2], w[1], w[1] + w[3]]; if (sc >= a0 - 1e-6 && sc <= a1 + 1e-6 && b1 - b0 < span - 1e-6) hits.push([b0, b1]); }
      if (lay.open && along) { /* açık kanal: uç duvar yok */ }
      hits.sort((a, b) => a[0] - b[0]);
      hits.forEach(hh => rect(hh[0], hh[1], zIn, e.zt));
      rect(0, span, zb, zIn);
      let cur = 0; for (const hh of hits) { if (hh[0] - cur > 0.05) gaps.push([cur, hh[0]]); cur = Math.max(cur, hh[1]); } if (span - cur > 0.05) gaps.push([cur, span]);
      title = `${along ? 'BOYUNA' : 'ENİNE'} KESİT — ${e.code} ${e.name}`;
      // bölge adları ve ölçüler
      const zones = along && c0.zones ? c0.zones : null;
      gaps.forEach(g => {
        add('dim', { layer: lO, k: 'h', a: [X(g[0]), Y(e.zt), 0], b: [X(g[1]), Y(e.zt), 0], p: [X((g[0] + g[1]) / 2), Y(e.zt) + h * 4, 0] });
        const m = (g[0] + g[1]) / 2, zn = zones && zones.find(z => m >= z.x && m <= z.x + z.l);
        const lab = zn ? zn.n : (along ? '' : ((lay.cells.find(c => m >= c.y && m <= c.y + c.W) || {}).lab || ''));
        if (lab) add('text', { layer: lY, p: [X(m), Y(zIn + lay.hw * 0.5), 0], h, s: lab, rot: 0, al: 'M' });
      });
      add('kot', { layer: lKot, p: [X(span) + h * 2, Y(zIn), 0], v: zIn, txt: 'taban' });
    }
    // su çizgisi, kotlar, genel ölçü, başlık, tarama
    for (const g of gaps) add('line', { layer: lS, a: [X(g[0]), Y(zw), 0], b: [X(g[1]), Y(zw), 0] });
    add('kot', { layer: lKot, p: [X(span) + h * 2, Y(zw), 0], v: zw, txt: 'su' });
    add('kot', { layer: lKot, p: [X(span) + h * 2, Y(e.zt), 0], v: e.zt, txt: 'üst' });
    add('dim', { layer: lO, k: 'h', a: [X(0), Y(zb), 0], b: [X(span), Y(zb), 0], p: [X(span / 2), Y(zLow) - h * 4, 0] });
    add('dim', { layer: lO, k: 'v', a: [X(span), Y(zw), 0], b: [X(span), Y(zw - lay.hw), 0], p: [X(span) + h * 15, Y(zw - lay.hw / 2), 0] });
    add('text', { layer: lY, p: [X(span / 2), Y(zLow) - h * 9, 0], h: tH(3.5), s: title, rot: 0, al: 'C' });
    add('hatch', { layer: 'KESIT_TARAMA', loops, pat: 'ANSI31', sc: 1, ang: 0, ann: true, orig: [0, 0] });
    C.log(`✓ Kesit çizildi: su kotu ${C.fmtKot(zw)}, taban ${C.fmtKot(zIn)}, duvar ${M.fmt(e.tw)} m, taban plağı ${M.fmt(e.tb)} m (ön boyut — TS 500 ön statik modülüyle güncellenecek).`);
  }
  C.uniteSection = drawSection;

  /* ---------- şerit menü ---------- */
  if (typeof document !== 'undefined' && C.ribbon && C.ribbon.tabs) {
    const tab = C.ribbon.tabs.find(t => t[0] === 'Arıtma');
    if (tab && !tab[1].some(p => p[0] === 'Proses')) {
      tab[1].unshift(['Proses', [
        { cmd: 'ATV131', t: 'ATV hesabı', i: 'table', big: true },
        { cmd: 'PROSES', t: 'Üniteleri yerleştir', i: 'tank', big: true, opts: [['PROSES', 'Ünite seç…'], ['PROSES HEPSI', 'Hepsi (sıralı)']] },
        { cmd: 'KESITUNITE', t: 'Ünite kesiti', i: 'cut' },
        { cmd: 'PROSESAC', t: 'Proses dosyası aç', i: 'table' },
        { cmd: 'PROSESOZET', t: 'Proses özeti', i: 'table' },
        { cmd: 'UNITEDUZENLE', t: 'Kot / kalınlık', i: 'kot' },
      ]]);
      try { C.ribbon.render(); } catch (err) { }
    }
  }
})(typeof window !== 'undefined' ? window.C : globalThis.C);

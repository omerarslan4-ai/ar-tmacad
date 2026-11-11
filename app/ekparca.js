/* ArıtmaCAD — MEKANİK › EK PARÇALAR (gerçek ölçülü, içi boş, 3B yönlü) ve 3B BORU HATTI komutu
   fit3 nesnesi: { kind, p (giriş ağzı), u (akış yönü), w (dirsek / te kolu / eksantrik düz taraf yönü), cins, sinif, dn, od, t, dn2, od2, t2, ang, ecc, fl (flanşlı uçlar) }
   kind: dirsek · te (eşit / inegal) · red (konsantrik / eksantrik) · flans (kaynak boyunlu) · flanscift (flanşlı bağlantı) · adaptor (PE / PVC flanş adaptörü + gevşek flanş) · kor (kör flanş) · manson · kapak
   Ölçüler: çelik / paslanmaz / galvaniz ASME B16.9 (uzun yarıçaplı dirsek R = 1.5·NPS, TE C, redüksiyon H), flanş EN 1092 PN16;
   duktil EN 545 flanşlı parçalar (FFK dirsek L, T, FFR); PE alın kaynaklı (R = 1.5·Ø); PVC / PP-R muflu; CTP / beton yaklaşık.
   Komutlar: BORUHAT (3B boru hattı: bitti diyene kadar; yön harfleri / imleç + uzunluk; köşelerde otomatik gerçek dirsek; F, FA, R, T, M, KF ek parçaları),
             EKPARCA (tek ek parça yerleştir: boru ucuna tıklayınca yön otomatik), BORULISTE (boru + ek parça listesi tablosu). */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, RAD = Math.PI / 180, { L, P, CI } = C.prim;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const near = (tbl, v) => { const ks = Object.keys(tbl).map(Number); const k = ks.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a); return tbl[k]; };
  const NPS = { 15: 0.5, 20: 0.75, 25: 1, 32: 1.25, 40: 1.5, 50: 2, 65: 2.5, 80: 3, 100: 4, 125: 5, 150: 6, 200: 8, 250: 10, 300: 12, 350: 14, 400: 16, 450: 18, 500: 20, 600: 24, 700: 28, 800: 32, 900: 36, 1000: 40, 1200: 48 };
  const B169C = { 15: 25, 20: 29, 25: 38, 32: 48, 40: 57, 50: 64, 65: 76, 80: 86, 100: 105, 125: 124, 150: 143, 200: 178, 250: 216, 300: 254, 350: 279, 400: 305, 450: 343, 500: 381, 600: 432, 700: 521, 800: 597, 900: 673, 1000: 749, 1200: 889 };
  const B169H = { 15: 38, 20: 38, 25: 51, 32: 51, 40: 64, 50: 76, 65: 89, 80: 89, 100: 102, 125: 127, 150: 140, 200: 152, 250: 178, 300: 203, 350: 330, 400: 356, 450: 381, 500: 508, 600: 508, 700: 610, 800: 610, 900: 610, 1000: 610, 1200: 711 };
  const DFFK = { 80: 165, 100: 180, 125: 200, 150: 220, 200: 260, 250: 350, 300: 400, 350: 450, 400: 500, 450: 550, 500: 600, 600: 700, 700: 800, 800: 900, 900: 1000, 1000: 1100, 1200: 1300 };
  const DTEE = { 80: 165, 100: 180, 125: 195, 150: 220, 200: 260, 250: 350, 300: 400, 350: 425, 400: 450, 450: 475, 500: 500, 600: 550, 700: 650, 800: 725, 900: 800, 1000: 875, 1200: 1025 };
  const PE2DN = { 63: 50, 75: 65, 90: 80, 110: 100, 125: 100, 140: 125, 160: 150, 180: 150, 200: 200, 225: 200, 250: 250, 280: 250, 315: 300, 355: 350, 400: 400, 450: 450, 500: 500, 560: 500, 630: 600, 710: 700, 800: 800, 900: 900, 1000: 1000, 1200: 1200 };
  const KAYNAK = new Set(['celik', 'asme', 'paslanmaz', 'galvaniz']), PLAST = new Set(['pe', 'pvc', 'pvck', 'ppr']);
  const cat = () => C.BORU_KATALOG || {};
  const flDN = e => PLAST.has(e.cins) ? (PE2DN[e.dn] || (near(PE2DN, e.dn))) : e.dn;
  const flange = dn => { const D = (C.flangeOD ? C.flangeOD(dn) : dn * 1.6 + 100) / 1000, tf = (dn <= 150 ? 20 : dn <= 400 ? 26 : 34) / 1000; return { D, tf, hub: tf * 2.2 }; };
  /* ölçüler (m) */
  const dims = (cins, dn, od) => {
    const o = od / 1000;
    if (KAYNAK.has(cins)) return { R: (dn < 25 ? 38 : 1.5 * (NPS[dn] || dn / 25) * 25.4) / 1000, C: (B169C[dn] || near(B169C, dn)) / 1000, H: (B169H[dn] || near(B169H, dn)) / 1000 };
    if (cins === 'duktil') return { R: (DFFK[dn] || near(DFFK, dn)) / 1000, C: (DTEE[dn] || near(DTEE, dn)) / 1000, H: (dn <= 150 ? 200 : dn <= 400 ? 300 : 600) / 1000, fl: true };
    if (cins === 'pe') return { R: 1.5 * o, C: Math.max(0.09, 1.1 * o), H: Math.max(0.12, 1.6 * o) };
    if (cins === 'pvc' || cins === 'pvck' || cins === 'ppr') return { R: Math.max(0.6 * o, 0.02), C: Math.max(0.03, 0.75 * o), H: Math.max(0.04, 1.0 * o), sok: true };
    if (cins === 'ctp') return { R: 1.5 * o, C: 0.75 * o + 0.15, H: 0.3 + o * 0.5 };
    return { R: 1.5 * o, C: 1.0 * o, H: 1.2 * o };
  };
  C.ekParcaOlcu = dims;
  /* ---------- geometri ---------- */
  const norm = M.norm, add = M.add, mul = M.mul, sub = M.sub, dot = M.dot, cross = M.cross;
  const perpTo = (w, u) => { const q = sub(w, mul(u, dot(w, u))); return M.len(q) > 1e-6 ? norm(q) : norm(Math.abs(u[2]) < 0.9 ? cross(u, [0, 0, 1]) : cross(u, [1, 0, 0])); };
  const geo = e => {
    const c = e._c || (e._c = {}); if (c.g) return c.g;
    const u = norm(M.p3(e.u || [1, 0, 0])), w = perpTo(M.p3(e.w || [0, 0, 1]), u), p = M.p3(e.p), r = e.od / 2000, ri = Math.max(0.0005, (e.od - 2 * (e.t || 0)) / 2000), D = dims(e.cins, e.dn, e.od);
    const parts = [], ports = [], line = [];
    const tube = (pts, rr, rri, extra) => parts.push(Object.assign({ t: 'tube', pts, r: rr, ri: rri, seg: e.od > 400 ? 40 : 28 }, extra || {}));
    const disk = (a, dir, R1, th, rin) => tube([a, add(a, mul(dir, th))], R1, rin, { seg: 32 });
    const flEnd = (a, dir) => { const F = flange(flDN(e)); disk(a, dir, F.D / 2, F.tf, ri); }; // flanş: uç düzlemine yaslı, gövdeye doğru
    const sock = (a, dir) => { const Ls = Math.max(0.02, e.od / 1000 * 0.45); tube([a, add(a, mul(dir, Ls))], r * 1.13, r * 1.0); }; // muf
    if (e.kind === 'dirsek') {
      const th = (e.ang || 90) * RAD, R = e.R || D.R, cc = add(p, mul(w, R)), n = Math.max(4, Math.ceil(th / (Math.PI / 24))), pts = [];
      const tans = []; for (let k = 0; k <= n; k++) { const f = th * k / n; pts.push(add(cc, add(mul(w, -R * Math.cos(f)), mul(u, R * Math.sin(f))))); tans.push(add(mul(u, Math.cos(f)), mul(w, Math.sin(f)))); }
      tube(pts, r, ri, { tans }); const u2 = norm(add(mul(u, Math.cos(th)), mul(w, Math.sin(th)))), pe = pts[pts.length - 1];
      ports.push({ p, dir: mul(u, -1), od: e.od, dn: e.dn }, { p: pe, dir: u2, od: e.od, dn: e.dn }); line.push(...pts);
      if (D.fl || e.fl) { flEnd(add(p, mul(u, 0)), u); flEnd(pe, mul(u2, -1)); }
      if (D.sok) { sock(p, u); sock(pe, mul(u2, -1)); }
    } else if (e.kind === 'te') {
      const Cm = D.C, od2 = e.od2 || e.od, r2 = od2 / 2000, ri2 = Math.max(0.0005, (od2 - 2 * (e.t2 || e.t || 0)) / 2000), Cb = e.dn2 && e.dn2 !== e.dn ? Math.max(r + 0.02, Cm * (0.85 + 0.15 * od2 / e.od)) : Cm;
      const m = add(p, mul(u, Cm)), p2 = add(p, mul(u, 2 * Cm)), pb = add(m, mul(w, Cb));
      tube([p, p2], r, ri); tube([add(m, mul(w, r * 0.92)), pb], r2, ri2);
      ports.push({ p, dir: mul(u, -1), od: e.od, dn: e.dn }, { p: p2, dir: u, od: e.od, dn: e.dn }, { p: pb, dir: w, od: od2, dn: e.dn2 || e.dn }); line.push(p, p2); c.branch = [m, pb];
      if (D.fl || e.fl) { flEnd(p, u); flEnd(p2, mul(u, -1)); const F = flange(flDN({ cins: e.cins, dn: e.dn2 || e.dn })); disk(sub(pb, mul(w, F.tf)), w, F.D / 2, F.tf, ri2); }
      if (D.sok) { sock(p, u); sock(p2, mul(u, -1)); const Ls = Math.max(0.02, od2 / 1000 * 0.45); tube([pb, sub(pb, mul(w, Ls))], r2 * 1.13, r2); }
    } else if (e.kind === 'red') {
      const od2 = e.od2 || e.od, r2 = od2 / 2000, ri2 = Math.max(0.0005, (od2 - 2 * (e.t2 || e.t || 0)) / 2000), H = e.H || D.H;
      const p2 = add(add(p, mul(u, H)), e.ecc ? mul(w, r - r2) : [0, 0, 0]);
      const pts = [p, add(add(p, mul(u, H * 0.5)), e.ecc ? mul(w, (r - r2) * 0.5) : [0, 0, 0]), p2]; parts.push({ t: 'tube', pts, r, rs: [r, (r + r2) / 2, r2], ris: [ri, (ri + ri2) / 2, ri2], ri: Math.min(ri, ri2), seg: 28 });
      ports.push({ p, dir: mul(u, -1), od: e.od, dn: e.dn }, { p: p2, dir: u, od: od2, dn: e.dn2 }); line.push(p, p2);
      if (D.fl || e.fl) { flEnd(p, u); const F = flange(flDN({ cins: e.cins, dn: e.dn2 })); disk(sub(p2, mul(u, F.tf)), u, F.D / 2, F.tf, ri2); }
    } else if (e.kind === 'flans' || e.kind === 'flanscift') {
      const F = flange(flDN(e)), one = (a, dir) => { tube([a, add(a, mul(dir, F.hub))], r * 1.18, ri); disk(add(a, mul(dir, F.hub)), dir, F.D / 2, F.tf, ri); return add(a, mul(dir, F.hub + F.tf)); };
      let q = one(p, u); if (e.kind === 'flanscift') { const g = add(q, mul(u, 0.003)); const p2 = add(g, mul(u, F.hub + F.tf)); one(p2, mul(u, -1)); q = p2; }
      ports.push({ p, dir: mul(u, -1), od: e.od, dn: e.dn }, { p: q, dir: u, od: e.od, dn: e.dn }); line.push(p, q);
    } else if (e.kind === 'adaptor') {
      const F = flange(flDN(e)), La = Math.max(0.15, e.od / 1000 * 1.25);
      tube([p, add(p, mul(u, La - F.tf * 1.6))], r * 1.04, ri); tube([add(p, mul(u, La - F.tf * 1.6)), add(p, mul(u, La))], r * 1.35, ri); disk(add(p, mul(u, La - F.tf * 1.6 - F.tf)), u, F.D / 2, F.tf, r * 1.06);
      const q = add(p, mul(u, La)); ports.push({ p, dir: mul(u, -1), od: e.od, dn: e.dn }, { p: q, dir: u, od: e.od, dn: e.dn, flans: flDN(e) }); line.push(p, q);
    } else if (e.kind === 'kor') { const F = flange(flDN(e)); disk(p, u, F.D / 2, F.tf, 0); ports.push({ p, dir: mul(u, -1), od: e.od, dn: e.dn }); line.push(p, add(p, mul(u, F.tf))); }
    else if (e.kind === 'manson') { const Lm = Math.max(0.05, e.od / 1000 * 0.9); tube([p, add(p, mul(u, Lm))], r * 1.12, r * 1.0); ports.push({ p, dir: mul(u, -1), od: e.od, dn: e.dn }, { p: add(p, mul(u, Lm)), dir: u, od: e.od, dn: e.dn }); line.push(p, add(p, mul(u, Lm))); }
    else if (e.kind === 'kapak') { const Lk = Math.max(0.03, e.od / 1000 * 0.4); tube([p, add(p, mul(u, Lk))], r * (D.sok ? 1.12 : 1.0), D.sok ? r : ri); disk(add(p, mul(u, Lk)), u, r * (D.sok ? 1.12 : 1.0), Math.max(0.004, (e.t || 5) / 1000), 0); ports.push({ p, dir: mul(u, -1), od: e.od, dn: e.dn }); line.push(p, add(p, mul(u, Lk))); }
    return (c.g = { parts, ports, line, u, w });
  };
  const NAME = { dirsek: 'Dirsek', te: 'TE', red: 'Redüksiyon', flans: 'Kaynak boyunlu flanş', flanscift: 'Flanşlı bağlantı (2 flanş + conta)', adaptor: 'Flanş adaptörü + gevşek flanş', kor: 'Kör flanş', manson: 'Manşon (muf)', kapak: 'Kapak (tapa)' };
  const szL = (cins, dn) => (PLAST.has(cins) ? 'Ø' : 'DN') + dn;
  C.fit3Name = e => {
    const c = cat()[e.cins] || {}, mat = c.mat || e.cins || '', two = e.dn2 && e.dn2 !== e.dn;
    if (e.kind === 'dirsek') return `Dirsek ${String(+(e.ang || 90).toFixed(2)).replace('.', ',')}° ${szL(e.cins, e.dn)} ${mat}${dims(e.cins, e.dn, e.od).fl ? ' (FFK, flanşlı)' : KAYNAK.has(e.cins) ? ' (B16.9 uzun yarıçap)' : ''}`;
    if (e.kind === 'te') return `${two ? 'İnegal TE' : 'Eşit TE'} ${szL(e.cins, e.dn)}${two ? '/' + szL(e.cins, e.dn2).replace(/^DN|^Ø/, '') : ''} ${mat}${dims(e.cins, e.dn, e.od).fl ? ' (flanşlı)' : ''}`;
    if (e.kind === 'red') return `${e.ecc ? 'Eksantrik' : 'Konsantrik'} redüksiyon ${szL(e.cins, e.dn)}/${String(e.dn2).replace(/^/, '')} ${mat}${dims(e.cins, e.dn, e.od).fl ? ' (FFR)' : ''}`;
    if (e.kind === 'adaptor') return `Flanş adaptörü ${szL(e.cins, e.dn)} ${mat} + gevşek flanş DN${flDN(e)} PN16`;
    if (e.kind === 'flans' || e.kind === 'flanscift' || e.kind === 'kor') return `${NAME[e.kind]} DN${flDN(e)} PN16 (${mat})`;
    return `${NAME[e.kind] || e.kind} ${szL(e.cins, e.dn)} ${mat}`;
  };
  T.fit3 = {
    label: 'Ek parça', ifc: 'IfcPipeFitting',
    prims: e => {
      const g = geo(e), out = []; const flat = q => [q[0], q[1], 0];
      for (const pt of g.parts) {
        const P0 = pt.pts, rr = pt.rs ? Math.max(...pt.rs) : pt.r;
        for (let i = 1; i < P0.length; i++) {
          const a = P0[i - 1], b = P0[i], d = [b[0] - a[0], b[1] - a[1]], hl = Math.hypot(d[0], d[1]), r1 = pt.rs ? pt.rs[i - 1] : pt.r, r2 = pt.rs ? pt.rs[i] : pt.r;
          if (hl < 1e-6 || hl < Math.abs(b[2] - a[2]) * 0.05) { out.push(CI(flat(a), rr)); continue; } // düşey parça: daire
          const n = [-d[1] / hl, d[0] / hl], dz = Math.abs(b[2] - a[2]) / M.dist(a, b), k = Math.sqrt(Math.max(0, 1 - dz * dz)) > 0.2 ? 1 : 1;
          out.push(P([[a[0] + n[0] * r1 * k, a[1] + n[1] * r1 * k, 0], [b[0] + n[0] * r2 * k, b[1] + n[1] * r2 * k, 0], [b[0] - n[0] * r2 * k, b[1] - n[1] * r2 * k, 0], [a[0] - n[0] * r1 * k, a[1] - n[1] * r1 * k, 0]], true, { lw: 35 }));
        }
      }
      const ln = g.line; for (let i = 1; i < ln.length; i++) out.push(L(flat(ln[i - 1]), flat(ln[i]), { lt: 'CENTER', lw: 13 }));
      if (g.parts.length && e.kind === 'te' && e._c && e._c.g && e._c.g.branch) out.push(L(flat(e._c.g.branch[0]), flat(e._c.g.branch[1]), { lt: 'CENTER', lw: 13 }));
      return out;
    },
    mesh: e => geo(e).parts.map(pt => Object.assign({}, pt)),
    snaps: e => geo(e).ports.map(q => ({ p: q.p, k: 'end' })).concat([{ p: M.p3(e.p), k: 'ins' }]),
    xf: (e, X) => { e.p = X.p(e.p); const s = X.s || 1; e.u = M.norm(X.v(M.p3(e.u))); e.w = M.norm(X.v(M.p3(e.w || [0, 0, 1]))); void s; delete e._c; },
    info: e => `${C.fit3Name(e)} · Ø${M.fmt(e.od, 1)}×${M.fmt(e.t || 0, 1)}${e.od2 && e.od2 !== e.od ? ' → Ø' + M.fmt(e.od2, 1) : ''}`,
  };
  C.fit3Ports = e => geo(e).ports;
  C.fit3Line = e => { const g = geo(e), out = []; for (let i = 1; i < g.line.length; i++) out.push([g.line[i - 1], g.line[i]]); if (e._c && e._c.g && e._c.g.branch) out.push(e._c.g.branch); return out; }; // eksen çizgileri (dirsek yayı dahil)

  /* ---------- açık uçlar (boru / ek parça) ---------- */
  const openEnds = () => {
    const out = [];
    for (const e of C.doc.ents) {
      if (!C.layer(e.layer).on) continue;
      if (e.type === 'pipe' && e.pts && e.pts.length > 1) { const a = M.p3(e.pts[0]), a2 = M.p3(e.pts[1]), b = M.p3(e.pts[e.pts.length - 1]), b2 = M.p3(e.pts[e.pts.length - 2]); out.push({ p: a, dir: norm(sub(a, a2)), e }, { p: b, dir: norm(sub(b, b2)), e }); }
      else if (e.type === 'fit3') for (const q of geo(e).ports) out.push({ p: q.p, dir: q.dir, e, od: q.od, dn: q.dn });
    }
    return out;
  };
  const endAt = (p, tol = 0.06) => { let best = null, bd = tol; for (const q of openEnds()) { const d = M.dist(q.p, M.p3(p)); if (d < bd) { bd = d; best = q; } } return best; };
  C.boruUcu = endAt;

  /* ---------- yön harfleri ---------- */
  const DIRS = { D: [1, 0, 0], B: [-1, 0, 0], K: [0, 1, 0], G: [0, -1, 0], Y: [0, 0, 1], A: [0, 0, -1] };
  const DIRKW = [['D', 'Doğu +X'], ['B', 'Batı −X'], ['K', 'Kuzey +Y'], ['G', 'Güney −Y'], ['Y', 'Yukarı +Z'], ['A', 'Aşağı −Z']];
  const dirName = v => { const k = Object.keys(DIRS).find(k2 => M.dist(DIRS[k2], v) < 1e-6); return k ? DIRKW.find(x => x[0] === k)[1] : `(${v.map(x => M.fmt(x, 2)).join(', ')})`; };
  const askDir = async (I, label, def, notPar) => { for (; ;) { const r = await I.kw(label, DIRKW, def); if (!r) return null; const d = DIRS[r]; if (notPar && Math.abs(dot(d, notPar)) > 0.99) { C.warn('Bu yön ana yöne paralel; dik bir yön seçin.'); continue; } return d; } };

  /* ---------- ek parça oluştur ---------- */
  const mkFit = (kind, S, p, u, w, extra) => { const lay = layOf(S.cins); const e = C.add(C.newEnt('fit3', Object.assign({ kind, p: M.p3(p), u, w: w || perpTo([0, 0, 1], u), cins: S.cins, sinif: S.sinif, dn: S.dn, od: S.od, t: S.t, layer: lay }, extra || {}))); delete e.sp; return e; };
  const layOf = cins => { const n = 'MEK_BORU_' + C.up(cins); if (C.doc.cur.layer !== '0') return C.doc.cur.layer; C.ensureLayer(n, { pe: 4, pvc: 30, pvck: 30, ppr: 6, celik: 8, asme: 8, paslanmaz: 9, galvaniz: 252, duktil: 5, ctp: 2, beton: 8 }[cins] || 4, 'CONTINUOUS', 25); return n; };
  const spec = (cins, sinif, dn) => { const b = C.boruOlcu(cins, sinif, dn); b.kalite = C.boruKalite ? C.boruKalite(b.cins) : ''; const o = { cins: b.cins, sinif: b.sinif, dn: b.dn, od: b.od, t: b.t, label: C.boruLabel ? C.boruLabel(b) : '' }; if (b.kalite) o.kalite = b.kalite; return o; };
  const mkPipe = (S, a, b) => { if (M.dist(a, b) < 1e-4) return null; const e = C.add(C.newEnt('pipe', { pts: [M.p3(a), M.p3(b)], dn: S.dn, od: S.od, t: S.t, cins: S.cins, sinif: S.sinif, mat: (cat()[S.cins] || {}).mat || S.cins, label: S.label, noElbow: true, layer: layOf(S.cins) })); if (S.kalite) e.kalite = S.kalite; delete e.sp; return e; };
  const portOf = (f, i) => geo(f).ports[i];

  /* düz hat + köşe dirsekleri: pts → borular ve dirsekler; dönüş: son uç ve yön */
  const buildRun = (S, pts, opt = {}) => {
    const out = { ents: [], end: pts[pts.length - 1], dir: null, warn: [] }; if (pts.length < 2) return out;
    const n = pts.length, trimS = new Array(n).fill(0), trimE = new Array(n).fill(0), D = dims(S.cins, S.dn, S.od);
    const elb = [];
    for (let i = 1; i < n - 1; i++) {
      const u1 = norm(sub(pts[i], pts[i - 1])), u2 = norm(sub(pts[i + 1], pts[i])), cs = Math.max(-1, Math.min(1, dot(u1, u2))), th = Math.acos(cs);
      if (th < 0.5 * RAD) continue; const tn = D.R * Math.tan(th / 2);
      const l1 = M.dist(pts[i], pts[i - 1]) - trimS[i - 1], l2 = M.dist(pts[i + 1], pts[i]);
      if (tn > l1 + 1e-6 || tn > l2 / (i + 1 < n - 1 ? 2 : 1) + 1e-6) out.warn.push(`${i}. köşede parça boyu dirsek için kısa (gerekli ${M.fmt(tn * 1000, 0)} mm)`);
      trimE[i] = tn; trimS[i] = tn; elb.push({ i, u1, u2, th, tn });
    }
    for (let i = 1; i < n; i++) { const a = pts[i - 1], b = pts[i], u = norm(sub(b, a)), A = add(a, mul(u, trimS[i - 1] || 0)), B = sub(b, mul(u, trimE[i] || 0)); if (dot(sub(B, A), u) > 1e-4) { const pe = mkPipe(S, A, B); if (pe) out.ents.push(pe); } }
    for (const q of elb) { const deg = q.th / RAD, f = mkFit('dirsek', S, sub(pts[q.i], mul(q.u1, q.tn)), q.u1, perpTo(q.u2, q.u1), { ang: +deg.toFixed(3) }); out.ents.push(f); }
    out.dir = norm(sub(pts[n - 1], pts[n - 2])); return out;
  };

  /* ---------- 3B BORU HATTI ---------- */
  const pipeProps = S => ({ type: 'pipe', dn: S.dn, od: S.od, t: S.t, cins: S.cins, mat: (cat()[S.cins] || {}).mat });
  C.addCommand(['BORUHAT', 'BORU3B', 'HAT3B', 'PIPE3D', 'BH'], '3B boru hattı (bitti diyene kadar): başlangıç (bir boru / ek parça ucuna tıklarsanız çap, cins ve yön oradan alınır), sonra her adımda nokta tıklayın, imleç yönünde uzunluk yazın ya da yön harfi (D +X, B −X, K +Y, G −Y, Y yukarı, A aşağı) + uzunluk. Köşelere gerçek ölçülü dirsek konur. Ek parça: F flanş çifti, FA flanş adaptörü, R redüksiyon, T te (eşit / inegal), M manşon, KF kör flanş, C çap / cins değiştir, U geri al, Enter / BİTTİ bitir.', async (I) => {
    let S0 = C.boruSt ? C.boruSt() : { cins: 'pe', sinif: 'SDR11', dn: 110, z: 0 };
    let a = await I.pt(`3B boru hattı başlangıcı — ${szL(S0.cins, S0.dn)} ${(cat()[S0.cins] || {}).mat || ''} ${S0.sinif} (S = boru seçimi; bir boru / ek parça ucuna tıklayabilirsiniz)`, { kw: [['S', 'Seçim', 'AYAR']] });
    if (a === 'S') { const o = await C.boruAyar(); if (!o) return; S0 = o; a = await I.pt('3B boru hattı başlangıcı'); }
    if (!a || typeof a === 'string') return;
    let S = spec(S0.cins, S0.sinif, S0.dn), dir = null, p0 = M.p3(a); if (!(Math.abs(a[2] || 0) > 1e-9)) p0[2] = +S0.z || 0;
    const hit = endAt(a); if (hit) { p0 = hit.p; dir = hit.dir; const src = hit.e; if (src.cins && cat()[src.cins]) { const dn = hit.dn || src.dn; S = spec(src.cins, src.sinif, dn); if (src.kalite) S.kalite = src.kalite; } C.log(`Uca bağlandı: ${S.label} · yön ${dirName(dir.map(x => Math.round(x * 1e6) / 1e6))}`); }
    let run = [p0], made = [], nP = 0, nF = 0;
    const flush = () => { if (run.length < 2) return; const r = buildRun(S, run); made.push(...r.ents); nP += r.ents.filter(x => x.type === 'pipe').length; nF += r.ents.filter(x => x.type === 'fit3').length; r.warn.forEach(w => C.warn(w)); dir = r.dir; run = [r.end]; };
    const curDir = () => run.length >= 2 ? norm(sub(run[run.length - 1], run[run.length - 2])) : dir;
    /* bir ağızdan (gelen yön dir) farklı yöne çıkılıyorsa: dirsek ağızda başlasın — köşe = ağız + dir·tn */
    const pushTo = (q, viaDir) => {
      const last = run[run.length - 1];
      if (run.length === 1 && dir) { const v = viaDir || norm(sub(q, last)), th = Math.acos(Math.max(-1, Math.min(1, dot(dir, v))));
        if (th > 0.5 * RAD && th < Math.PI - 1e-3) { const tn = dims(S.cins, S.dn, S.od).R * Math.tan(th / 2), V = add(last, mul(dir, tn)); run.push(V); if (viaDir) { run.push(add(V, mul(viaDir, M.dist(q, last)))); return; } } }
      run.push(q);
    };
    const inline = (f, outPort) => { made.push(f); nF++; const q = portOf(f, outPort); run = [q.p]; dir = q.dir; };
    try {
      for (; ;) {
        const last = run[run.length - 1]; E.base = last;
        E.preview = c => { const q = M.p3(c); if (!(Math.abs(c[2] || 0) > 1e-9) && (!C.viewName || C.viewName() !== '3d')) q[2] = last[2]; return C.prims(Object.assign(pipeProps(S), { pts: [...run, q] })); };
        const r = await I.pt(`Sonraki nokta / uzunluk (imleç yönünde) · yön D B K G Y A · ek parça F FA R T M KF · C çap · U geri · Enter = BİTTİ  [${S.label}]`, { kw: [['D', 'Doğu'], ['B', 'Batı'], ['K', 'Kuzey'], ['G', 'Güney'], ['Y', 'Yukarı'], ['A', 'Aşağı'], ['F', 'Flanş'], ['FA', 'Flanş adaptörü'], ['R', 'Redüksiyon'], ['T', 'TE'], ['M', 'Manşon'], ['KF', 'Kör flanş'], ['C', 'Çap / cins'], ['U', 'Geri'], ['BITTI', 'Bitti', 'BİTTİ', 'X']] });
        if (r == null || r === 'BITTI') break;
        if (Array.isArray(r)) { let q = M.p3(r); if (!(Math.abs(r[2] || 0) > 1e-9) && (!C.viewName || C.viewName() !== '3d')) q[2] = last[2]; if (M.dist(q, last) > 1e-4) pushTo(q); continue; }
        if (DIRS[r]) { E.preview = null; const Ln = await I.num(`${dirName(DIRS[r])} yönünde uzunluk (m)`, 1); if (Ln == null) continue; pushTo(add(last, mul(DIRS[r], Ln)), DIRS[r]); continue; }
        if (r === 'U') { if (run.length > 1) run.pop(); else if (made.length) { const x = made.pop(); C.remove([x]); C.log('Son parça geri alındı.'); const pr = made[made.length - 1]; if (pr) { const ends = pr.type === 'fit3' ? geo(pr).ports : [{ p: M.p3(pr.pts[pr.pts.length - 1]), dir: norm(sub(M.p3(pr.pts[pr.pts.length - 1]), M.p3(pr.pts[0]))) }]; const q = ends[ends.length - 1]; run = [q.p]; dir = q.dir; } else run = [p0]; } continue; }
        // ek parçalar ve değişiklikler: önce hattı oluştur
        let u = curDir(); flush(); u = dir || u;
        if (!u) { u = await askDir(I, 'Ek parçanın yönü', 'D'); if (!u) continue; }
        const P0 = run[0];
        if (r === 'C') { const o = await C.boruAyar({ cins: S.cins, sinif: S.sinif, dn: S.dn }); if (!o) continue; const S2 = spec(o.cins, o.sinif, o.dn); if (S2.cins === S.cins && S2.dn !== S.dn && (made.length || run.length)) { const f = mkFit('red', S, P0, u, perpTo([0, 0, -1], u), { dn2: S2.dn, od2: S2.od, t2: S2.t }); inline(f, 1); C.log(`Çap değişti: ${C.fit3Name(f)} eklendi.`); } S = S2; continue; }
        if (r === 'F') { inline(mkFit('flanscift', S, P0, u), 1); continue; }
        if (r === 'FA') { inline(mkFit('adaptor', S, P0, u), 1); continue; }
        if (r === 'M') { inline(mkFit('manson', S, P0, u), 1); continue; }
        if (r === 'KF') { made.push(mkFit('kor', S, P0, u)); nF++; break; }
        if (r === 'R') {
          const c = cat()[S.cins]; const sizes = c.sizes.map(x => x.dn).filter(d => d !== S.dn);
          const d2 = await I.num(`Redüksiyon yeni çap (${PLAST.has(S.cins) ? 'Ø' : 'DN'}; mevcut: ${sizes.join(', ')})`, sizes.filter(d => d < S.dn).pop() || sizes[0]); if (d2 == null) continue;
          const ty = await I.kw('Redüksiyon tipi', [['K', 'Konsantrik'], ['E', 'Eksantrik (alt düz)']], 'K'); const S2 = spec(S.cins, S.sinif, d2);
          const f = mkFit('red', S, P0, u, perpTo([0, 0, -1], u), { dn2: S2.dn, od2: S2.od, t2: S2.t, ecc: ty === 'E' }); inline(f, 1); S = S2; C.log(C.fit3Name(f) + ' eklendi.'); continue;
        }
        if (r === 'T') {
          const bw = await askDir(I, 'TE kolu (branş) yönü', Math.abs(u[2]) > 0.9 ? 'D' : 'Y', u); if (!bw) continue;
          const c = cat()[S.cins]; const d2 = await I.num(`Branş çapı (${PLAST.has(S.cins) ? 'Ø' : 'DN'}; Enter = eşit TE)`, S.dn); const S2 = spec(S.cins, S.sinif, d2 || S.dn); void c;
          const f = mkFit('te', S, P0, u, bw, S2.dn !== S.dn ? { dn2: S2.dn, od2: S2.od, t2: S2.t } : {});
          const k = await I.kw('Hangi yoldan devam?', [['A', 'Ana hat (düz)'], ['B', 'Branş']], 'A');
          if (k === 'B') { inline(f, 2); S = S2; } else inline(f, 1);
          C.log(C.fit3Name(f) + ' eklendi; diğer ağız açık kaldı — oradan devam etmek için BORUHAT ile o uca tıklayın.'); continue;
        }
      }
      E.preview = null;
    } finally { E.preview = null; E.base = null; try { flush(); } catch (er) { } }
    if (made.length) { C.changed(); C.log(`Boru hattı: ${nP} boru parçası, ${nF} ek parça (${S.label}). Liste: BORULISTE.`); }
  });

  /* ---------- tek ek parça yerleştir ---------- */
  const KINDS = [['dirsek90', 'Dirsek 90°'], ['dirsek45', 'Dirsek 45°'], ['dirsek30', 'Dirsek 30°'], ['dirsek22', 'Dirsek 22,5°'], ['dirsek11', 'Dirsek 11,25°'], ['te', 'Eşit TE'], ['tei', 'İnegal TE'], ['redk', 'Konsantrik redüksiyon'], ['rede', 'Eksantrik redüksiyon'], ['flans', 'Kaynak boyunlu flanş'], ['flanscift', 'Flanşlı bağlantı (çift)'], ['adaptor', 'Flanş adaptörü (PE / PVC)'], ['kor', 'Kör flanş'], ['manson', 'Manşon (muf)'], ['kapak', 'Kapak (tapa)']];
  const fitDialog = () => new Promise(res => {
    const s0 = Object.assign(C.boruSt ? C.boruSt() : {}, (() => { try { return JSON.parse(localStorage.getItem('aritmacad.ekparca') || '{}'); } catch (e) { return {}; } })());
    const b = C.modal('Ek parça — gerçek ölçülü', `<div style="display:grid;grid-template-columns:170px 1fr;gap:8px;align-items:center">
      <label>Ek parça</label><select id="fpK">${KINDS.map(([k, n]) => `<option value="${k}" ${k === s0.kind ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <label>Boru cinsi</label><select id="fpC">${Object.entries(cat()).map(([k, c]) => `<option value="${k}" ${k === s0.cins ? 'selected' : ''}>${esc(c.ad)}</option>`).join('')}</select>
      <label>Sınıf</label><select id="fpS"></select><label>Çap</label><select id="fpD"></select><label id="fpL2">2. çap (branş / küçük uç)</label><select id="fpD2"></select></div>
      <p class="hint" id="fpInfo"></p><div class="bar" style="justify-content:flex-end"><button id="fpNo">Vazgeç</button><button id="fpOk" class="pri">Yerleştir</button></div>`);
    const $ = q => b.querySelector(q);
    const fill = () => { const c = cat()[$('#fpC').value]; $('#fpS').innerHTML = c.sinif.map(x => `<option value="${x.k}" ${x.k === s0.sinif ? 'selected' : ''}>${esc(x.ad)}</option>`).join(''); const op = sel => c.sizes.map(r => `<option value="${r.dn}" ${r.dn === sel ? 'selected' : ''}>${szL($('#fpC').value, r.dn)} — Ø${M.fmt(r.od, 1)}</option>`).join(''); const d = c.sizes.some(r => r.dn === +s0.dn) ? +s0.dn : c.sizes[Math.floor(c.sizes.length / 3)].dn; $('#fpD').innerHTML = op(d); $('#fpD2').innerHTML = op(c.sizes.filter(r => r.dn < d).map(r => r.dn).pop() || d); show(); };
    const show = () => { const k = $('#fpK').value, two = k === 'tei' || k === 'redk' || k === 'rede'; $('#fpD2').style.display = $('#fpL2').style.display = two ? '' : 'none'; const S = spec($('#fpC').value, $('#fpS').value, +$('#fpD').value), D = dims(S.cins, S.dn, S.od), F = flange(flDN(S));
      $('#fpInfo').textContent = `${S.label} · dirsek R=${M.fmt(D.R * 1000, 0)} mm · TE merkez-uç C=${M.fmt(D.C * 1000, 0)} mm · redüksiyon boyu ${M.fmt(D.H * 1000, 0)} mm · flanş Ø${M.fmt(F.D * 1000, 0)} × ${M.fmt(F.tf * 1000, 0)} mm (PN16)${D.fl ? ' · duktil parçalar flanşlı (EN 545)' : ''}`; };
    $('#fpC').onchange = fill; $('#fpK').onchange = show; $('#fpD').onchange = show; $('#fpS').onchange = show; fill();
    $('#fpNo').onclick = () => { C.closeModal(); res(null); };
    $('#fpOk').onclick = () => { const o = { kind: $('#fpK').value, cins: $('#fpC').value, sinif: $('#fpS').value, dn: +$('#fpD').value, dn2: +$('#fpD2').value }; try { localStorage.setItem('aritmacad.ekparca', JSON.stringify(o)); } catch (e) { } C.closeModal(); res(o); };
  });
  C.addCommand(['EKPARCA', 'FITTING3B', 'FIT3', 'EKPARCAEKLE'], 'Gerçek ölçülü, içi boş ek parça: dirsek (90 / 45 / 30 / 22,5 / 11,25°), eşit / inegal TE, konsantrik / eksantrik redüksiyon, flanş, flanş çifti, flanş adaptörü, kör flanş, manşon, kapak — çelik, paslanmaz, galvaniz, duktil (flanşlı), PE, PVC, PP-R, CTP. Bir boru / ek parça ucuna tıklayınca çap ve yön otomatik; boşlukta yön harfi sorulur.', async (I) => {
    const o = await fitDialog(); if (!o) return; let n = 0;
    for (; ;) {
      const p = await I.pt(`${KINDS.find(k => k[0] === o.kind)[1]} — yer (boru ucuna tıklayın; Enter bitir)`); if (!p || typeof p === 'string') break;
      let S = spec(o.cins, o.sinif, o.dn), u, P0 = M.p3(p); const hit = endAt(p);
      if (hit) { P0 = hit.p; u = hit.dir; if (hit.e.cins && cat()[hit.e.cins]) S = spec(hit.e.cins, hit.e.sinif, hit.dn || hit.e.dn); }
      else { u = await askDir(I, 'Ek parçanın yönü (akış)', 'D'); if (!u) break; }
      let w = null, ext = {};
      if (/^dirsek|^te/.test(o.kind)) { w = await askDir(I, o.kind.startsWith('te') ? 'TE kolu yönü' : 'Dirseğin döneceği yön', Math.abs(u[2]) > 0.9 ? 'D' : 'Y', u); if (!w) break; }
      const ang = { dirsek90: 90, dirsek45: 45, dirsek30: 30, dirsek22: 22.5, dirsek11: 11.25 }[o.kind];
      const S2 = spec(S.cins, S.sinif, o.dn2);
      let kind = o.kind; if (ang) { kind = 'dirsek'; ext.ang = ang; } if (o.kind === 'tei') { kind = 'te'; ext = { dn2: S2.dn, od2: S2.od, t2: S2.t }; } if (o.kind === 'redk' || o.kind === 'rede') { kind = 'red'; ext = { dn2: S2.dn, od2: S2.od, t2: S2.t, ecc: o.kind === 'rede' }; w = perpTo([0, 0, -1], u); }
      const f = mkFit(kind, S, P0, u, w, ext); n++; C.log(T.fit3.info(f));
    }
    if (n) C.changed();
  });

  /* ---------- malzeme listesi: borular (cins / sınıf / çap) ve ek parçalar ---------- */
  const bom0 = C.bom;
  if (bom0) C.bom = ents => {
    const rest = ents.filter(e => !(e.type === 'fit3' || (e.type === 'pipe' && e.cins && cat()[e.cins])));
    const rows0 = bom0(rest), mp = new Map(), add2 = (key, mal, q, unit) => { const r = mp.get(key) || { mal, dn: null, q: 0, unit }; r.q += q; mp.set(key, r); };
    for (const e of ents) {
      if (e.type === 'pipe' && e.cins && cat()[e.cins]) { let l = 0; for (let i = 1; i < e.pts.length; i++) l += M.dist(e.pts[i - 1], e.pts[i]); const c = cat()[e.cins]; add2(`p|${e.cins}|${e.sinif}|${e.dn}`, `Boru ${c.mat} ${szL(e.cins, e.dn)} ${e.sinif || ''} (Ø${M.fmt(+e.od, 1)}×${M.fmt(+e.t, 1)})`, l, 'm'); if (C.pipeElbows && !e.noElbow) for (const el of C.pipeElbows(e)) add2(`e|${e.cins}|${e.dn}|${el.std}`, `Dirsek ${String(el.std).replace('.', ',')}° ${szL(e.cins, e.dn)} ${c.mat}`, 1, 'adet'); }
      else if (e.type === 'fit3') { const nm = C.fit3Name(e); add2('f|' + nm, nm, 1, 'adet'); if (e.kind === 'flanscift' || e.kind === 'adaptor') { const dn = flDN(e), nb = dn <= 80 ? 4 : dn <= 200 ? 8 : dn <= 300 ? 12 : dn <= 500 ? 16 : 20; add2('c|' + dn, `Conta DN${dn} PN16 (EPDM)`, 1, 'adet'); add2('s|' + dn, `Cıvata-somun takımı DN${dn} PN16`, nb, 'adet'); } }
    }
    const rows = rows0.concat([...mp.values()].sort((a, b) => a.mal.localeCompare(b.mal, 'tr'))); rows.forEach((r, i) => { r.poz = i + 1; if (r.q != null && r.unit === 'm') r.q = Math.round(r.q * 100) / 100; }); return rows;
  };
  C.addCommand(['BORULISTE', 'BORUMETRAJ', 'MEKANIKLISTE'], 'Borulama malzeme listesi: tüm borular (cins, sınıf, çap, metre), dirsek, TE, redüksiyon, flanş, adaptör, conta ve cıvata adetleri; pencerede gösterir, çizime tablo olarak ekler (Mekanik paftasında).', async (I) => {
    const rows = C.bom(C.doc.ents).filter(r => /Boru|Dirsek|TE|redüksiyon|flanş|Flanş|adaptör|Conta|Cıvata|Manşon|Kapak|vana|Vana|pompa|Pompa/i.test(r.mal)); rows.forEach((r, i) => r.poz = i + 1);
    if (!rows.length) { C.warn('Çizimde boru / ek parça yok.'); return; }
    C._bomRows = rows; rows.forEach(r => C.log(`${String(r.poz).padStart(2)}  ${r.mal}  ${r.unit === 'm' ? M.fmt(r.q, 2) : r.q} ${r.unit}`));
    if (C.showBom && !E.scriptMode) { C.showBom(rows); return; }
    const p = await I.pt('Tablonun sol üst köşesi (Enter = yalnız liste)'); if (p && typeof p !== 'string') C.bomTable(rows, p);
  });

  /* ---------- şerit ---------- */
  const p0 = C.borulamaPanel;
  C.borulamaPanel = () => { const pn = p0 ? p0() : ['Borulama', []]; const it = (cmd, tt, i, big) => ({ cmd, t: tt, i, big: !!big }); pn[1] = [it('BORUHAT', '3B boru hattı', 'pipe', true), it('EKPARCA', 'Ek parça', 'valve', true), it('BORULISTE', 'Boru listesi', 'table', true)].concat(pn[1].map(x => x.cmd === 'BORU' ? Object.assign({}, x, { big: false, t: 'Boru (tek)' }) : x)); return pn; };
  setTimeout(() => { if (C.ekipmanRefresh) C.ekipmanRefresh(); }, 0);
})(window.C);

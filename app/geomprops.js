/* ArıtmaCAD — ÖZELLİKLER › GEOMETRİ (AutoCAD gibi): çizgi, çoklu çizgi, dikdörtgen, daire, yay, elips, nokta
   çizildikten sonra koordinat, uzunluk, açı, yarıçap, genişlik / yükseklik, alan … özellikler penceresinden değiştirilir.
   C.GEOM(e) → [{ k, t, g(e), s(e, v)?, ro? , str? }]   (s yoksa salt okunur) */
(function (C) {
  'use strict';
  const M = C.M, RAD = Math.PI / 180, TAU = Math.PI * 2;
  const p3 = p => [p[0], p[1], p[2] || 0];
  const r6 = v => Math.round(v * 1e6) / 1e6;
  const deg = a => { let d = a / RAD; d = ((d % 360) + 360) % 360; return r6(d); };
  /* çoklu çizgi yardımcıları */
  const plLen = e => { let l = 0; const n = e.pts.length; for (let i = 1; i < n; i++) l += M.dist(e.pts[i - 1], e.pts[i]); if (e.closed && n > 2) l += M.dist(e.pts[n - 1], e.pts[0]); return l; };
  const plArea = e => { let a = 0; const q = e.pts, n = q.length; for (let i = 0; i < n; i++) { const p = q[i], r = q[(i + 1) % n]; a += p[0] * r[1] - r[0] * p[1]; } return Math.abs(a) / 2; };
  /* dikdörtgen mi? (4 köşe, kapalı, dik açılar, yaysız) */
  const POLYT = { plak: 1, tretuvar: 1, dolgu: 1 }; // kapalı çokgen tabanlı yapı elemanları (pts 2B)
  const isRect = e => {
    if (!((e.type === 'pline' && e.closed) || POLYT[e.type]) || !e.pts || e.pts.length !== 4 || (e.bul && e.bul.some(b => b))) return false;
    const q = e.pts; for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4], u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]], lu = Math.hypot(...u), lv = Math.hypot(...v); if (lu < 1e-9 || lv < 1e-9 || Math.abs(u[0] * v[0] + u[1] * v[1]) / (lu * lv) > 1e-6) return false; }
    return true;
  };
  const rectOf = e => { const q = e.pts, u = [q[1][0] - q[0][0], q[1][1] - q[0][1]], v = [q[3][0] - q[0][0], q[3][1] - q[0][1]], w = Math.hypot(...u), h = Math.hypot(...v), cr = u[0] * v[1] - u[1] * v[0]; return { o: q[0], w, h, a: Math.atan2(u[1], u[0]), s: cr >= 0 ? 1 : -1 }; };
  const setRect = (e, R) => { const c = Math.cos(R.a), s = Math.sin(R.a), z = R.o[2] || 0, ux = [c * R.w, s * R.w], vy = [-s * R.h * R.s, c * R.h * R.s], o = R.o; e.pts = [[o[0], o[1], z], [o[0] + ux[0], o[1] + ux[1], z], [o[0] + ux[0] + vy[0], o[1] + ux[1] + vy[1], z], [o[0] + vy[0], o[1] + vy[1], z]]; if (POLYT[e.type]) e.pts = e.pts.map(p => [p[0], p[1]]); };
  let vSel = 1; // seçili köşe (1 tabanlı)
  C.geomVertex = (v) => { if (v != null) vSel = v; return vSel; };
  const pos = v => v > 1e-9;
  /* döşeme / radye / tretuvar / dolgu: kapalı çokgen — dikdörtgense en × boy × açı, değilse X / Y boyu (ölçekle) + köşe düzenleme */
  const bbox = q => [Math.min(...q.map(p => p[0])), Math.min(...q.map(p => p[1])), Math.max(...q.map(p => p[0])), Math.max(...q.map(p => p[1]))];
  const polyEl = e => {
    const out = [], cl = Object.assign({}, e, { closed: true });
    if (isRect(e)) out.push(
      { k: 'rw', t: 'En (1. kenar boyu, m)', g: e => rectOf(e).w, s: (e, v) => { if (!pos(v)) return; const R = rectOf(e); R.w = v; setRect(e, R); } },
      { k: 'rh', t: 'Boy (2. kenar boyu, m)', g: e => rectOf(e).h, s: (e, v) => { if (!pos(v)) return; const R = rectOf(e); R.h = v; setRect(e, R); } },
      { k: 'ra', t: 'Açı (°, 1. köşe etrafında)', g: e => deg(rectOf(e).a), s: (e, v) => { const R = rectOf(e); R.a = v * RAD; setRect(e, R); } });
    else out.push(
      { k: 'bx', t: 'X boyu (m)', g: e => { const b = bbox(e.pts); return b[2] - b[0]; }, s: (e, v) => { if (!pos(v)) return; const b = bbox(e.pts), k = v / Math.max(1e-9, b[2] - b[0]); e.pts = e.pts.map(p => [b[0] + (p[0] - b[0]) * k, p[1]]); } },
      { k: 'by', t: 'Y boyu (m)', g: e => { const b = bbox(e.pts); return b[3] - b[1]; }, s: (e, v) => { if (!pos(v)) return; const b = bbox(e.pts), k = v / Math.max(1e-9, b[3] - b[1]); e.pts = e.pts.map(p => [p[0], b[1] + (p[1] - b[1]) * k]); } });
    out.push(
      { k: 'mx', t: 'Sol alt X (taşır)', g: e => bbox(e.pts)[0], s: (e, v) => { const d = v - bbox(e.pts)[0]; e.pts = e.pts.map(p => [p[0] + d, p[1]]); } },
      { k: 'my', t: 'Sol alt Y (taşır)', g: e => bbox(e.pts)[1], s: (e, v) => { const d = v - bbox(e.pts)[1]; e.pts = e.pts.map(p => [p[0], p[1] + d]); } });
    const n = e.pts.length; if (vSel > n) vSel = n; if (vSel < 1) vSel = 1;
    out.push(
      { k: 'vi', t: `Köşe no (1 – ${n})`, g: () => vSel, s: (e, v) => { vSel = Math.max(1, Math.min(e.pts.length, Math.round(v))); }, nochg: 1 },
      { k: 'vx', t: 'Köşe X', g: e => e.pts[vSel - 1][0], s: (e, v) => { e.pts[vSel - 1] = [v, e.pts[vSel - 1][1]]; } },
      { k: 'vy', t: 'Köşe Y', g: e => e.pts[vSel - 1][1], s: (e, v) => { e.pts[vSel - 1] = [e.pts[vSel - 1][0], v]; } },
      { k: 'area', t: 'Alan (m²)', g: () => plArea(cl), ro: 1 }, { k: 'len', t: 'Çevre (m)', g: () => plLen(cl), ro: 1 });
    // kenar boyları (salt okunur) — hızlı kontrol
    for (let i = 0; i < Math.min(n, 12); i++) { const a = e.pts[i], b = e.pts[(i + 1) % n]; out.push({ k: 'k' + i, t: `Kenar ${i + 1}–${(i + 1) % n + 1} (m)`, g: () => Math.hypot(b[0] - a[0], b[1] - a[1]), ro: 1 }); }
    return out;
  };
  const D = {
    line: e => [
      { k: 'ax', t: 'Başlangıç X', g: e => e.a[0], s: (e, v) => { e.a[0] = v; } },
      { k: 'ay', t: 'Başlangıç Y', g: e => e.a[1], s: (e, v) => { e.a[1] = v; } },
      { k: 'az', t: 'Başlangıç Z', g: e => e.a[2] || 0, s: (e, v) => { e.a = p3(e.a); e.a[2] = v; } },
      { k: 'bx', t: 'Bitiş X', g: e => e.b[0], s: (e, v) => { e.b[0] = v; } },
      { k: 'by', t: 'Bitiş Y', g: e => e.b[1], s: (e, v) => { e.b[1] = v; } },
      { k: 'bz', t: 'Bitiş Z', g: e => e.b[2] || 0, s: (e, v) => { e.b = p3(e.b); e.b[2] = v; } },
      { k: 'dx', t: 'Delta X', g: e => e.b[0] - e.a[0], ro: 1 }, { k: 'dy', t: 'Delta Y', g: e => e.b[1] - e.a[1], ro: 1 },
      { k: 'len', t: 'Uzunluk (başlangıç sabit)', g: e => M.dist(e.a, e.b), s: (e, v) => { if (!pos(v)) return; const L0 = M.dist(e.a, e.b); if (L0 < 1e-12) { e.b = [e.a[0] + v, e.a[1], e.a[2] || 0]; return; } const k = v / L0, a = p3(e.a), b = p3(e.b); e.b = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; } },
      { k: 'ang', t: 'Açı (°, başlangıç etrafında)', g: e => deg(Math.atan2(e.b[1] - e.a[1], e.b[0] - e.a[0])), s: (e, v) => { const l = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]); e.b = [e.a[0] + l * Math.cos(v * RAD), e.a[1] + l * Math.sin(v * RAD), e.b[2] || 0]; } },
    ],
    pline: e => {
      const out = [];
      if (isRect(e)) out.push(
        { k: 'rx', t: 'Köşe (başlangıç) X', g: e => e.pts[0][0], s: (e, v) => { const d = v - e.pts[0][0]; e.pts = e.pts.map(p => [p[0] + d, p[1], p[2] || 0]); } },
        { k: 'ry', t: 'Köşe (başlangıç) Y', g: e => e.pts[0][1], s: (e, v) => { const d = v - e.pts[0][1]; e.pts = e.pts.map(p => [p[0], p[1] + d, p[2] || 0]); } },
        { k: 'rw', t: 'Genişlik', g: e => rectOf(e).w, s: (e, v) => { if (!pos(v)) return; const R = rectOf(e); R.w = v; setRect(e, R); } },
        { k: 'rh', t: 'Yükseklik', g: e => rectOf(e).h, s: (e, v) => { if (!pos(v)) return; const R = rectOf(e); R.h = v; setRect(e, R); } },
        { k: 'ra', t: 'Açı (°, başlangıç köşesi etrafında)', g: e => deg(rectOf(e).a), s: (e, v) => { const R = rectOf(e); R.a = v * RAD; setRect(e, R); } },
      );
      const n = e.pts.length; if (vSel > n) vSel = n; if (vSel < 1) vSel = 1;
      out.push(
        { k: 'vi', t: `Köşe no (1 – ${n})`, g: () => vSel, s: (e, v) => { vSel = Math.max(1, Math.min(e.pts.length, Math.round(v))); }, nochg: 1 },
        { k: 'vx', t: 'Köşe X', g: e => e.pts[vSel - 1][0], s: (e, v) => { const p = p3(e.pts[vSel - 1]); p[0] = v; e.pts[vSel - 1] = p; } },
        { k: 'vy', t: 'Köşe Y', g: e => e.pts[vSel - 1][1], s: (e, v) => { const p = p3(e.pts[vSel - 1]); p[1] = v; e.pts[vSel - 1] = p; } },
        { k: 'elev', t: 'Kot (Z, tüm köşeler)', g: e => e.pts[0][2] || 0, s: (e, v) => { e.pts = e.pts.map(p => [p[0], p[1], v]); } },
        { k: 'closed', t: 'Kapalı (E / H)', str: 1, g: e => e.closed ? 'E' : 'H', s: (e, v) => { e.closed = /^(e|evet|1|true|k|kapali)$/i.test(String(v).trim()); } },
        { k: 'len', t: 'Uzunluk', g: plLen, ro: 1 },
      );
      if (e.closed) out.push({ k: 'area', t: 'Alan', g: plArea, ro: 1 });
      return out;
    },
    plak: e => polyEl(e), tretuvar: e => polyEl(e), dolgu: e => polyEl(e),
    circle: e => [
      { k: 'cx', t: 'Merkez X', g: e => e.c[0], s: (e, v) => { e.c = p3(e.c); e.c[0] = v; } },
      { k: 'cy', t: 'Merkez Y', g: e => e.c[1], s: (e, v) => { e.c = p3(e.c); e.c[1] = v; } },
      { k: 'cz', t: 'Merkez Z', g: e => e.c[2] || 0, s: (e, v) => { e.c = p3(e.c); e.c[2] = v; } },
      { k: 'r', t: 'Yarıçap', g: e => e.r, s: (e, v) => { if (pos(v)) e.r = v; } },
      { k: 'dia', t: 'Çap', g: e => 2 * e.r, s: (e, v) => { if (pos(v)) e.r = v / 2; } },
      { k: 'cir', t: 'Çevre', g: e => TAU * e.r, s: (e, v) => { if (pos(v)) e.r = v / TAU; } },
      { k: 'area', t: 'Alan', g: e => Math.PI * e.r * e.r, s: (e, v) => { if (pos(v)) e.r = Math.sqrt(v / Math.PI); } },
    ],
    arc: e => [
      { k: 'cx', t: 'Merkez X', g: e => e.c[0], s: (e, v) => { e.c = p3(e.c); e.c[0] = v; } },
      { k: 'cy', t: 'Merkez Y', g: e => e.c[1], s: (e, v) => { e.c = p3(e.c); e.c[1] = v; } },
      { k: 'r', t: 'Yarıçap', g: e => e.r, s: (e, v) => { if (pos(v)) e.r = v; } },
      { k: 'a0', t: 'Başlangıç açısı (°)', g: e => deg(e.a0 * RAD), s: (e, v) => { e.a0 = v; } },
      { k: 'a1', t: 'Bitiş açısı (°)', g: e => deg(e.a1 * RAD), s: (e, v) => { e.a1 = v; } },
      { k: 'sw', t: 'Toplam açı (°)', g: e => { const s = ((e.a1 - e.a0) % 360 + 360) % 360; return s || 360; }, s: (e, v) => { if (pos(v)) e.a1 = e.a0 + v; } },
      { k: 'al', t: 'Yay uzunluğu', g: e => { const s = ((e.a1 - e.a0) % 360 + 360) % 360 || 360; return e.r * s * RAD; }, ro: 1 },
    ],
    ellipse: e => [
      { k: 'cx', t: 'Merkez X', g: e => e.c[0], s: (e, v) => { e.c = p3(e.c); e.c[0] = v; } },
      { k: 'cy', t: 'Merkez Y', g: e => e.c[1], s: (e, v) => { e.c = p3(e.c); e.c[1] = v; } },
      { k: 'ma', t: 'Büyük yarı eksen', g: e => Math.hypot(...e.mj), s: (e, v) => { if (!pos(v)) return; const l = Math.hypot(...e.mj) || 1; e.mj = [e.mj[0] * v / l, e.mj[1] * v / l]; } },
      { k: 'mi', t: 'Küçük yarı eksen', g: e => Math.hypot(...e.mj) * e.ra, s: (e, v) => { if (!pos(v)) return; const l = Math.hypot(...e.mj); if (v <= l) e.ra = v / l; else { const a = Math.atan2(e.mj[1], e.mj[0]) + Math.PI / 2; e.mj = [v * Math.cos(a), v * Math.sin(a)]; e.ra = l / v; if (e.t1 != null && C.ellNorm) { e.t0 -= Math.PI / 2; e.t1 -= Math.PI / 2; } } if (C.ellNorm) C.ellNorm(e); } },
      { k: 'ea', t: 'Büyük eksen açısı (°)', g: e => deg(Math.atan2(e.mj[1], e.mj[0])), s: (e, v) => { const l = Math.hypot(...e.mj); e.mj = [l * Math.cos(v * RAD), l * Math.sin(v * RAD)]; } },
    ],
    point: e => [
      { k: 'px', t: 'X', g: e => e.p[0], s: (e, v) => { e.p = p3(e.p); e.p[0] = v; } },
      { k: 'py', t: 'Y', g: e => e.p[1], s: (e, v) => { e.p = p3(e.p); e.p[1] = v; } },
      { k: 'pz', t: 'Z', g: e => e.p[2] || 0, s: (e, v) => { e.p = p3(e.p); e.p[2] = v; } },
    ],
  };
  C.GEOM = e => (D[e.type] ? D[e.type](e) : null);
  C.geomIsRect = isRect;
  const fmt = v => (typeof v === 'number' ? String(r6(v)) : String(v));
  C.geomFmt = fmt;
  /* özellikler penceresine "Geometri" bölümü ekle (seçimdeki nesneler aynı türdeyse) */
  C.geomPropsHTML = (s, esc) => {
    if (!s.length || !s.every(e => e.type === s[0].type) || !D[s[0].type]) return '';
    if ((s[0].type === 'pline' || POLYT[s[0].type]) && s.length > 1) return '';
    const fl = C.GEOM(s[0]);
    let h = `<h4>Geometri${(s[0].type === 'pline' || POLYT[s[0].type]) && isRect(s[0]) ? ' — dikdörtgen' : POLYT[s[0].type] ? ' — ebatlar' : ''}</h4>`;
    for (const f of fl) {
      const vals = s.map(e => f.g(e)), same = vals.every(v => (typeof v === 'number' ? Math.abs(v - vals[0]) < 1e-9 : v === vals[0])), v = same ? fmt(vals[0]) : '';
      h += `<div class="fld"><label>${f.t}</label><input data-g="${f.k}" ${f.str ? '' : 'type="number" step="any"'} ${f.ro ? 'readonly tabindex="-1" style="opacity:.65"' : ''} value="${esc(v)}" ${same ? '' : 'placeholder="*farklı*"'}></div>`;
    }
    return h;
  };
  C.geomPropsBind = (b, s, apply, rerender) => {
    b.querySelectorAll('[data-g]').forEach(inp => {
      if (inp.readOnly) return;
      inp.onchange = () => {
        const k = inp.dataset.g, f = C.GEOM(s[0]).find(x => x.k === k); if (!f || !f.s) return;
        let v = f.str ? inp.value : parseFloat(String(inp.value).replace(',', '.')); if (!f.str && !isFinite(v)) return;
        if (f.nochg) { f.s(s[0], v); rerender(); return; }
        apply(e => { const g = C.GEOM(e).find(x => x.k === k); if (g && g.s) g.s(e, v); });
        rerender();
      };
      inp.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); } };
    });
  };
})(window.C);

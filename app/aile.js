/* ArıtmaCAD — AİLELER (Revit "family" + AutoCAD dinamik blok mantığı)
   AİLE  : parametreli eleman tanımı → parametreler (giriş / formül), tipler (katalog ölçüleri), plan + 3B + ön/yan görünüş geometrisi,
           uydurma kuralı (kanal genişliği / derinliği hangi parametreye gider), tutamaçlar (sürükleyerek ölçü değiştir).
   TİP   : ailenin adlandırılmış ölçü takımı (ör. PEN-A-KNL-1200-1400). Kullanıcı "Tip olarak kaydet" ile yenisini ekler.
   ÖRNEK : çizimdeki nesne { type:'aile', fam, tip, par:{...mm}, p (yerel orijin), rot (akış yönü °), z (taban kotu), ad }
   Yerel eksenler: x = kanal enine (akışa bakarken sol +), y = akış yönü, z = yukarı. Parametreler mm, geometri m.
   Komutlar: AILE (aile tarayıcısı + yerleştir), UYDUR (aileyi kanala / açıklığa uydur), AILEGORUNUS (2B ön / yan görünüş çiz),
             AILELISTE (çizimdeki aile örnekleri listesi), AILETIP (seçili örneğin ölçülerini tip olarak kaydet).
   Aile tanımı: C.aileKaydet({ id, ad, kat, katman, renk, ifc, params:[{k, ad, d, birim, grup, opts, min, max, f}], tipler:[{ad, p}],
                 uydur:{ gen:'B', der:'D' }, plan(q,g), mesh(q,g), on(q,g), yan(q,g), tutamac:[...], bilgi(q) }  (f: formül — fonksiyon ya da "B+2*e") */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, RAD = Math.PI / 180, { L, P, CI, TX, S } = C.prim;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const FAM = C.AILELER = C.AILELER || {};
  const TKEY = 'aritmacad.aile.tipler';

  /* ================= TANIM / KAYIT ================= */
  const derle = f => {
    if (typeof f === 'function' || f == null) return f;
    const src = String(f);
    return q => { try { return Function('q', 'with (q) { return (' + src + '); }')(Object.assign(Object.create(Math), q)); } catch (er) { return NaN; } };
  };
  C.aileKaydet = def => {
    def.params = (def.params || []).map(p => Object.assign({ birim: 'mm', grup: 'Ölçüler' }, p, { fn: derle(p.f) }));
    def.tipler = def.tipler || [];
    FAM[def.id] = def; C.emit && C.emit('aileler');
    return def;
  };
  const kulTipler = () => { try { return JSON.parse(localStorage.getItem(TKEY) || '{}') || {}; } catch (e) { return {}; } };
  C.aileTipleri = id => {
    const d = FAM[id]; if (!d) return [];
    const doc = ((C.doc && C.doc.set.aileTipleri) || {})[id] || [], kul = kulTipler()[id] || [];
    const all = [...d.tipler.map(t => Object.assign({ kaynak: 'aile' }, t)), ...kul.map(t => Object.assign({ kaynak: 'kullanıcı' }, t)), ...doc.map(t => Object.assign({ kaynak: 'çizim' }, t))];
    const seen = new Set(); return all.reverse().filter(t => (seen.has(t.ad) ? false : (seen.add(t.ad), true))).reverse();
  };
  const tipBul = (id, ad) => C.aileTipleri(id).find(t => t.ad === ad);
  C.aileTipKaydet = (id, ad, par) => {
    const o = kulTipler(); o[id] = (o[id] || []).filter(t => t.ad !== ad); o[id].push({ ad, p: Object.assign({}, par) });
    try { localStorage.setItem(TKEY, JSON.stringify(o)); } catch (e) { }
    const s = C.doc.set; s.aileTipleri = s.aileTipleri || {}; s.aileTipleri[id] = (s.aileTipleri[id] || []).filter(t => t.ad !== ad); s.aileTipleri[id].push({ ad, p: Object.assign({}, par) });
  };

  /* parametre değerleri: varsayılan ← tip ← örnek (par) ← formüller */
  C.aileDeger = (fam, tipAd, par) => {
    const d = FAM[fam]; if (!d) return {};
    const t = tipAd ? tipBul(fam, tipAd) : null, q = {};
    for (const p of d.params) if (!p.fn) q[p.k] = p.d;
    if (t) Object.assign(q, t.p);
    for (const [k, v] of Object.entries(par || {})) if (v !== '' && v != null) { const p = d.params.find(x => x.k === k); if (p && !p.fn) q[k] = p.opts ? v : +v; }
    for (const p of d.params) if (!p.opts && !p.fn && typeof q[p.k] !== 'number') q[p.k] = +q[p.k];
    for (const p of d.params) if (p.min != null && q[p.k] < p.min) q[p.k] = p.min;
    for (const p of d.params) if (p.max != null && q[p.k] > p.max) q[p.k] = p.max;
    for (const p of d.params) if (p.fn) { const v = p.fn(q); q[p.k] = typeof v === 'number' ? Math.round(v * 1000) / 1000 : v; }
    return q;
  };
  const degerE = e => {
    const d = FAM[e.fam]; if (!d) return {};
    if (e.tip && e.tip !== e.tipU) { const t = tipBul(e.fam, e.tip); if (t) { e.par = Object.assign({}, e.par || {}, t.p); } e.tipU = e.tip; }
    return C.aileDeger(e.fam, null, e.par);
  };
  C.aileDegerE = degerE;

  /* ================= GEOMETRİ OLUŞTURUCULARI ================= */
  const frameOf = e => { const r = (+e.rot || 0) * RAD, c = Math.cos(r), s = Math.sin(r), p = M.p3(e.p || [0, 0, 0]), z0 = +e.z || 0; // yerel (x enine-sol, y akış, z) → dünya
    return { W: ([x, y, z]) => [p[0] + y * c - x * s, p[1] + y * s + x * c, z0 + (z || 0)], V: ([x, y, z]) => [y * c - x * s, y * s + x * c, z || 0], rot: e.rot || 0 }; };
  /* 2B çizici (plan: x,y → dünya; görünüş: u,v → düz) */
  const cizici = (T2, rotDeg) => {
    const out = [], tw = q => { const w = T2(q); return [w[0], w[1], w[2] || 0]; };
    const g = {
      out,
      cizgi: (a, b, o) => out.push(L(tw(a), tw(b), o)),
      cok: (pts, kapali, o) => out.push(P(pts.map(tw), kapali, o)),
      dik: (x0, y0, x1, y1, o) => out.push(P([[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(tw), true, o)),
      daire: (c, r, o) => out.push(CI(tw(c), r, o)),
      dolgu: pts => out.push(S(pts.map(tw))),
      yazi: (p, s, h, al, rot) => out.push(TX(tw(p), h || C.annoH(2), s, ((rot || 0) + (rotDeg || 0)) * RAD, al || 'L')),
      /* ölçü çizgisi: a, b (yerel), yön 'h' | 'v', kaçıklık (m), metin */
      olcu: (a, b, yon, off, txt, h) => {
        const th = h || 0.09, tk = th * 0.45, o = { lw: 13, col: '#2e7d32' };
        if (yon === 'h') { const y = a[1] + off; out.push(L(tw([a[0], a[1]]), tw([a[0], y + Math.sign(off) * tk]), o), L(tw([b[0], b[1]]), tw([b[0], y + Math.sign(off) * tk]), o), L(tw([a[0], y]), tw([b[0], y]), o)); for (const x of [a[0], b[0]]) out.push(L(tw([x - tk, y - tk]), tw([x + tk, y + tk]), o)); out.push(TX(tw([(a[0] + b[0]) / 2, y + th * 0.35]), th, txt, 0, 'C')); }
        else { const x = a[0] + off; out.push(L(tw([a[0], a[1]]), tw([x + Math.sign(off) * tk, a[1]]), o), L(tw([b[0], b[1]]), tw([x + Math.sign(off) * tk, b[1]]), o), L(tw([x, a[1]]), tw([x, b[1]]), o)); for (const y of [a[1], b[1]]) out.push(L(tw([x - tk, y - tk]), tw([x + tk, y + tk]), o)); out.push(TX(tw([x - th * 0.35, (a[1] + b[1]) / 2]), th, txt, Math.PI / 2, 'C')); }
      },
    };
    return g;
  };
  /* 3B: kutu, silindir (eksen iki nokta arası), halka */
  const ins = () => C._ins;
  const insaci = W => {
    const out = ins().newMesh();
    const kenar = pts => { for (let i = 0; i < pts.length; i++) out.edges3.push([pts[i], pts[(i + 1) % pts.length]]); };
    const g = {
      out,
      kutu: (x0, x1, y0, y1, z0, z1, col) => {
        if (x1 < x0) [x0, x1] = [x1, x0]; if (y1 < y0) [y0, y1] = [y1, y0]; if (z1 < z0) [z0, z1] = [z1, z0];
        const c8 = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map(W);
        ins().hexa(out, c8, col); kenar(c8.slice(0, 4)); kenar(c8.slice(4)); for (let k = 0; k < 4; k++) out.edges3.push([c8[k], c8[k + 4]]);
      },
      silindir: (a, b, r, col, n) => {
        n = n || 16; const A = W(a), B = W(b), ax = M.sub(B, A), Lx = M.len(ax); if (Lx < 1e-9) return; const u = M.norm(ax), p = M.perp(u), q = M.cross(u, p);
        const v0 = out.v.length, ring = (o) => { for (let i = 0; i < n; i++) { const t = 2 * Math.PI * i / n; out.v.push(M.add(o, M.add(M.mul(p, r * Math.cos(t)), M.mul(q, r * Math.sin(t))))); } };
        ring(A); ring(B); const cA = out.v.length; out.v.push(A, B);
        for (let i = 0; i < n; i++) { const j = (i + 1) % n; out.f.push([v0 + i, v0 + j, v0 + n + j], [v0 + i, v0 + n + j, v0 + n + i], [cA, v0 + j, v0 + i], [cA + 1, v0 + n + i, v0 + n + j]); out.fc.push(col, col, col, col); }
        const rA = [], rB = []; for (let i = 0; i < n; i++) { rA.push(out.v[v0 + i]); rB.push(out.v[v0 + n + i]); } kenar(rA); kenar(rB);
      },
    };
    return g;
  };

  /* ================= VARLIK TİPİ ================= */
  const etiket = (e, d, q) => (e.ad || d.ad) + (d.etiket ? ' — ' + d.etiket(q) : '');
  C.T.aile = {
    label: 'Aile (parametrik eleman)', ifc: 'IfcBuildingElementProxy',
    prims: e => {
      const d = FAM[e.fam]; if (!d) return [TX(M.p3(e.p), C.annoH(2.5), '?' + e.fam, 0, 'L')];
      const q = degerE(e);
      if (d.vekil) { try { return C.T[d.vekilTip].prims(Object.assign({ type: d.vekilTip, p: e.p, rot: e.rot, z: e.z, ad: e.ad }, d.vekil(q))); } catch (er) { console.error(er); return []; } }
      const F = frameOf(e), g = cizici(F.W, F.rot);
      try { d.plan(q, g, e); } catch (er) { console.error(er); }
      if (e.etk !== false && !d.vekil) { const th = C.annoH(2), pY = d.etiketYer ? d.etiketYer(q) : [0, -0.6, 0], w = F.W(pY); g.out.push(TX([w[0], w[1], 0], th, etiket(e, d, q), 0, 'C')); } // okunur: hep yatay
      return g.out;
    },
    mesh: e => { const d = FAM[e.fam]; if (d && d.vekil) { try { return C.T[d.vekilTip].mesh(Object.assign({ type: d.vekilTip, p: e.p, rot: e.rot, z: e.z }, d.vekil(degerE(e)))); } catch (er) { console.error(er); return []; } } if (!d || !d.mesh) return []; const q = degerE(e), F = frameOf(e), g = insaci(F.W); try { d.mesh(q, g, e); } catch (er) { console.error(er); } return [g.out]; },
    xf: (e, X) => { e.p = X.p(M.p3(e.p)); const v = X.v([Math.cos((e.rot || 0) * RAD), Math.sin((e.rot || 0) * RAD), 0]); e.rot = Math.atan2(v[1], v[0]) / RAD; let dz = 0; try { dz = X.p([0, 0, 0])[2] || 0; } catch (er) { } e.z = (+e.z || 0) + dz; e.p = [e.p[0], e.p[1], 0]; },
    snaps: e => { const d = FAM[e.fam]; const out = [{ p: [e.p[0], e.p[1], +e.z || 0], k: 'ins' }]; if (d && d.baglanti) { const F = frameOf(e), q = degerE(e); for (const b of d.baglanti(q)) out.push({ p: F.W(b.p), k: 'end' }); } return out; },
    info: e => { const d = FAM[e.fam]; if (!d) return 'Tanımsız aile: ' + e.fam; const q = degerE(e); return `${etiket(e, d, q)} · tip: ${e.tip || 'özel'} · ${d.bilgi ? d.bilgi(q) : ''} · taban ${M.fmt(+e.z || 0, 2)}`; },
  };
  if (C.COMPOSITE) C.COMPOSITE.add('aile'); // DXF'e parametrik olarak yazılır, geri okunur

  /* özellik paneli: seçili örneğin ailesine göre alanlar */
  try {
    Object.defineProperty(C.PROPFIELDS, 'aile', {
      configurable: true, enumerable: true,
      get() {
        const e = (C.sel || [])[0]; const d = e && FAM[e.fam]; if (!d) return [['ad', 'Ad', 's']];
        const tip = C.aileTipleri(e.fam).map(t => t.ad).join(' | ');
        const f = [['ad', 'Ad', 's'], ['tip', 'Tip' + (tip ? ` (${tip})` : ''), 's'], ['z', 'Taban kotu (m)'], ['rot', 'Akış yönü (°)']];
        for (const p of d.params) if (!p.fn) f.push(['par.' + p.k, `${p.k} — ${p.ad}${p.opts ? ' (' + p.opts.map(o => o[0]).join(' / ') + ')' : ' (' + p.birim + ')'}`, p.opts ? 's' : undefined]);
        return f;
      },
    });
  } catch (er) { console.warn('aile özellik alanları', er); }
  /* panelden parametre değişince tamamı (par) doldurulsun: tip ↔ özel ayrımı */

  /* tutamaçlar: aile tanımındaki { k, yer(q) yerel m, eksen yerel, kat (mm/m), merkez (orijin kayması, yerel) } */
  {
    const h0 = C.handlesOf;
    C.handlesOf = e => {
      if (!e || e.type !== 'aile') return h0 ? h0(e) : [];
      const d = FAM[e.fam]; if (!d || !d.tutamac) return [];
      const q = degerE(e), F = frameOf(e);
      return d.tutamac.map(h => {
        const ax = F.V(h.eksen), p = F.W(h.yer(q)), pr = d.params.find(x => x.k === h.k) || { ad: h.k };
        return {
          p, ax, lab: `${h.k} — ${pr.ad}`, mname: pr.ad, meas: x => { const v = degerE(x)[h.k]; return v / 1000; },
          apply: (x, t) => {
            const q0 = degerE(x); let v = q0[h.k] + t * 1000 * (h.kat || 1);
            if (h.adim) v = Math.round(v / h.adim) * h.adim; if (pr.min != null) v = Math.max(pr.min, v); if (pr.max != null) v = Math.min(pr.max, v);
            const dv = (v - q0[h.k]) / 1000 / (h.kat || 1);
            x.par = Object.assign({}, x.par || {}, { [h.k]: Math.round(v) }); x.tip = ''; x.tipU = '';
            if (h.merkez) { const m = F.V(h.merkez.map(c => c * dv)); x.p = [x.p[0] + m[0], x.p[1] + m[1], 0]; }
            if (h.zKay) x.z = (+x.z || 0) + h.zKay * dv;
          },
        };
      });
    };
  }

  /* ================= YARDIMCILAR ================= */
  const svgOf = (prims, W, H) => {
    let bb = null;
    { const pts = []; prims.forEach(p => { if (p.a) pts.push(p.a, p.b); if (p.pts) pts.push(...p.pts); if (p.k === 'C') pts.push([p.c[0] - p.r, p.c[1] - p.r], [p.c[0] + p.r, p.c[1] + p.r]); }); if (!pts.length) return ''; bb = [Math.min(...pts.map(q => q[0])), Math.min(...pts.map(q => q[1])), Math.max(...pts.map(q => q[0])), Math.max(...pts.map(q => q[1]))]; }
    const w = Math.max(bb[2] - bb[0], 1e-6), h = Math.max(bb[3] - bb[1], 1e-6), k = Math.min((W - 16) / w, (H - 16) / h), X = x => W / 2 + (x - (bb[0] + bb[2]) / 2) * k, Y = y => H / 2 - (y - (bb[1] + bb[3]) / 2) * k;
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background:#fff;border-radius:4px;border:1px solid #cfd6da"><g fill="none" stroke="#1d2b31" stroke-width="0.9">`;
    for (const p of prims) {
      const da = p.lt === 'DASHED' || p.lt === 'HIDDEN' ? ' stroke-dasharray="4 3"' : p.lt === 'CENTER' ? ' stroke-dasharray="10 3 2 3"' : '', col = p.col ? ` stroke="${p.col}"` : '';
      if (p.k === 'L') s += `<line x1="${X(p.a[0])}" y1="${Y(p.a[1])}" x2="${X(p.b[0])}" y2="${Y(p.b[1])}"${da}${col}/>`;
      else if (p.k === 'P') s += `<polyline points="${p.pts.map(q => X(q[0]) + ',' + Y(q[1])).join(' ')}${p.c ? ' ' + X(p.pts[0][0]) + ',' + Y(p.pts[0][1]) : ''}"${da}${col}/>`;
      else if (p.k === 'C') s += `<circle cx="${X(p.c[0])}" cy="${Y(p.c[1])}" r="${p.r * k}"${col}/>`;
      else if (p.k === 'S') s += `<polygon points="${p.pts.map(q => X(q[0]) + ',' + Y(q[1])).join(' ')}" fill="#1d2b31" stroke="none"/>`;
    }
    return s + '</g></svg>';
  };
  const gorunusPrims = (d, q, hangi) => { const g = cizici(([u, v]) => [u, v, 0], 0); try { (hangi === 'yan' ? d.yan : d.on)(q, g); } catch (er) { console.error(er); } return g.out; };
  C.aileOnizleme = (fam, q, W, H) => { const d = FAM[fam]; if (!d) return ''; const out = []; if (d.on) out.push(svgOf(gorunusPrims(d, q, 'on'), W, H)); if (d.yan) out.push(svgOf(gorunusPrims(d, q, 'yan'), Math.round(W * 0.45), H)); { let pr; if (d.vekil) pr = C.T[d.vekilTip].prims(Object.assign({ type: d.vekilTip, p: [0, 0, 0], rot: 90, z: 0 }, d.vekil(q))).filter(x => x.k !== 'T'); else { const g = cizici(([x, y]) => [x, y, 0], 0); d.plan(q, g, {}); pr = g.out; } out.push(svgOf(pr, W, Math.round(H * 0.45))); } return out; };

  /* ================= AİLE PENCERESİ ================= */
  const fmt = (v, p) => (typeof v === 'number' ? (p && p.birim === 'm' ? M.fmt(v, 3) : (Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : M.fmt(v, 2))) : esc(v));
  C.aileSec = (pre) => new Promise(res => {
    const fams = Object.values(FAM); if (!fams.length) { C.warn('Kayıtlı aile yok.'); res(null); return; }
    let fam = (pre && pre.fam) || C.doc.set.sonAile || fams[0].id, tip = (pre && pre.tip != null) ? pre.tip : null, par = Object.assign({}, (pre && pre.par) || {});
    const b = C.modal('Aileler — parametrik elemanlar ve kütüphane', `<div style="display:grid;grid-template-columns:${C.aileAgac ? 300 : 220}px minmax(320px,1fr) minmax(300px,1.1fr);gap:14px;min-height:520px;max-height:76vh">
      <div id="afL" style="overflow:auto;border-right:1px solid var(--line,#3a4250);padding-right:8px"></div>
      <div id="afP" style="overflow:auto"></div><div id="afV" style="overflow:auto;display:flex;flex-direction:column;gap:8px;align-items:flex-start"></div></div>
      <div class="bar" style="justify-content:space-between;margin-top:10px"><div><button id="afTip">Tip olarak kaydet…</button></div>
      <div style="display:flex;gap:8px"><button id="afIptal">İptal</button><button id="afNokta">Noktaya yerleştir</button><button id="afUydur" class="pri">Kanala / açıklığa uydur</button></div></div>`);
    const box = document.querySelector('#modal .box'); if (box) box.style.width = 'min(1340px,97vw)';
    const L1 = b.querySelector('#afL'), P1 = b.querySelector('#afP'), V1 = b.querySelector('#afV');
    let secOg = null; // ağaçta seçili aile dışı öğe (ekipman / blok / şematik vana) — aile-agac.js
    const butonlar = () => { for (const s of ['#afTip', '#afNokta', '#afUydur']) { const x = b.querySelector(s); if (x) x.style.display = secOg ? 'none' : ''; } };
    const liste = () => {
      if (C.aileAgac) { C.aileAgac.ciz(L1, { fams, fam, sec: secOg, onAile: id => { secOg = null; fam = id; tip = null; par = {}; liste(); form(); }, onOge: og => { secOg = og; liste(); butonlar(); C.aileAgac.goster(og, P1, V1, { kapat: () => fin(null), yenile: () => liste() }); } }); return; }
      const kats = [...new Set(fams.map(f => f.kat || 'Diğer'))];
      L1.innerHTML = kats.map(k => `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.7;margin:8px 0 4px">${esc(k)}</div>` + fams.filter(f => (f.kat || 'Diğer') === k).map(f => `<button data-f="${f.id}" style="display:block;width:100%;text-align:left;margin:2px 0;${f.id === fam ? 'border-color:var(--acc,#4c9be8);background:rgba(76,155,232,.15)' : ''}">${esc(f.ad)}</button>`).join('')).join('');
      L1.querySelectorAll('[data-f]').forEach(x => x.onclick = () => { fam = x.dataset.f; tip = null; par = {}; liste(); form(); });
    };
    const form = () => {
      const d = FAM[fam], tips = C.aileTipleri(fam); if (tip == null) tip = tips[0] ? tips[0].ad : '';
      const q = C.aileDeger(fam, tip, par), grups = [...new Set(d.params.map(p => p.grup))];
      let h = `<div style="font-weight:600;font-size:15px;margin-bottom:2px">${esc(d.ad)}</div><div class="hint" style="margin-bottom:8px">${esc(d.aciklama || '')}</div>
        <div class="fld"><label>Tip</label><select id="afTipSel"><option value="">— özel ölçü —</option>${tips.map(t => `<option ${t.ad === tip ? 'selected' : ''} value="${esc(t.ad)}">${esc(t.ad)}${t.kaynak !== 'aile' ? ' (' + t.kaynak + ')' : ''}</option>`).join('')}</select></div>`;
      for (const gp of grups) {
        h += `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.7;margin:10px 0 4px">${esc(gp)}</div><table style="width:100%;border-collapse:collapse;font-size:13px">`;
        for (const p of d.params.filter(x => x.grup === gp)) {
          const v = q[p.k];
          h += `<tr><td style="padding:2px 6px 2px 0;white-space:nowrap"><b>${esc(p.k)}</b></td><td style="padding:2px 6px;width:100%">${esc(p.ad)}${p.fn ? ' <span class="hint">= ' + esc(typeof p.f === 'string' ? p.f : (p.fAcik || 'formül')) + '</span>' : ''}</td><td style="padding:2px 0">` +
            (p.fn ? `<span style="font-family:monospace">${fmt(v, p)}</span>` : p.opts ? `<select data-p="${p.k}">${p.opts.map(o => `<option value="${esc(o[0])}" ${o[0] === v ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>` : `<input data-p="${p.k}" type="number" step="any" value="${v}" style="width:90px">`) +
            `</td><td style="padding:2px 0 2px 4px;opacity:.7">${p.opts ? '' : esc(p.birim)}</td></tr>`;
        }
        h += '</table>';
      }
      P1.innerHTML = h;
      P1.querySelector('#afTipSel').onchange = ev => { tip = ev.target.value; par = {}; form(); };
      P1.querySelectorAll('[data-p]').forEach(inp => inp.onchange = () => { const p = d.params.find(x => x.k === inp.dataset.p); par[p.k] = p.opts ? inp.value : parseFloat(inp.value); const q0 = C.aileDeger(fam, tip, {}); if (tip && q0[p.k] !== par[p.k]) { par = Object.assign({}, Object.fromEntries(d.params.filter(x => !x.fn).map(x => [x.k, q0[x.k]])), par); tip = ''; } form(); });
      const sv = C.aileOnizleme(fam, q, 300, 300);
      butonlar();
      V1.innerHTML = `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.7">Ön görünüş · yan görünüş · plan</div><div style="display:flex;gap:8px;align-items:flex-start">${sv[0] || ''}${sv[1] || ''}</div>${sv[2] || ''}${d.bilgi ? `<div class="hint" style="max-width:460px">${esc(d.bilgi(q))}</div>` : ''}`;
    };
    liste(); form();
    let done = false; const fin = v => { if (done) return; done = true; clearInterval(tm); if (box) box.style.width = ''; C.closeModal(); res(v); };
    const sonuc = mod => { const d = FAM[fam], q = C.aileDeger(fam, tip, par), giris = {}; for (const p of d.params) if (!p.fn) giris[p.k] = q[p.k]; C.doc.set.sonAile = fam; return { fam, tip, par: giris, mod }; };
    b.querySelector('#afIptal').onclick = () => fin(null);
    b.querySelector('#afNokta').onclick = () => fin(sonuc('nokta'));
    b.querySelector('#afUydur').onclick = () => fin(sonuc('uydur'));
    b.querySelector('#afTip').onclick = () => { const r = sonuc(); const ad = prompt('Tip adı (ör. PEN-1000-1200):', tip || ''); if (!ad) return; C.aileTipKaydet(fam, ad.trim(), r.par); tip = ad.trim(); par = {}; form(); C.log(`Tip kaydedildi: ${FAM[fam].ad} → ${ad}`); };
    const tm = setInterval(() => { const m = document.querySelector('#modal'); if (m && m.classList.contains('hidden')) fin(null); }, 300);
  });

  /* ================= UYDURMA ================= */
  /* iki nokta (kanalın iki yan yüzü) → genişlik, eksen ortası; yakındaki perdeden taban ve üst kot */
  const perdeKot = p => {
    let best = null, bd = 0.6;
    for (const e of C.doc.ents) { if (e.type !== 'perde' || !C.layer(e.layer).on) continue; let d; try { d = C.entDist(e, p); } catch (er) { continue; } if (d < bd) { bd = d; best = e; } }
    return best ? { z0: +best.z0 || 0, z1: (+best.z0 || 0) + (+best.h || 0), t: +(best.tb || best.t || 0.3) } : null;
  };
  const uydurNoktalar = async (I, d, onizle) => {
    const a = await I.pt('Kanalın 1. yan yüzü (perde iç yüzüne tıklayın)'); if (!a || typeof a === 'string') return null;
    E.base = a; E.preview = c => { const w = M.dist2(a, c); return w > 0.05 ? onizle(a, c) : [L(a, c)]; };
    const b = await I.pt('Kanalın karşı yan yüzü'); E.preview = null; E.base = null; if (!b || typeof b === 'string') return null;
    const w = M.dist2(a, b); if (w < 0.05) { C.warn('İki yüz arası çok küçük.'); return null; }
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0], u = [(b[0] - a[0]) / w, (b[1] - a[1]) / w], n1 = [-u[1], u[0]];
    E.base = m; E.preview = c => { const s = (c[0] - m[0]) * n1[0] + (c[1] - m[1]) * n1[1] >= 0 ? 1 : -1; return [L(m, [m[0] + n1[0] * s, m[1] + n1[1] * s, 0], { lw: 35 })]; };
    const yon = await I.pt('Akış yönü (Enter: 1→2 çizgisinin solu)', { def: 'ENTER' }); E.preview = null; E.base = null;
    let s = 1; if (Array.isArray(yon)) s = (yon[0] - m[0]) * n1[0] + (yon[1] - m[1]) * n1[1] >= 0 ? 1 : -1;
    const fl = [n1[0] * s, n1[1] * s], rot = Math.atan2(fl[1], fl[0]) / RAD;
    const ka = perdeKot(a), kb = perdeKot(b), k = ka || kb;
    return { m, w, rot, k, a, b };
  };
  C.aileUydurDegerleri = (fam, par, u) => {
    const d = FAM[fam], ur = d.uydur || {}, np = Object.assign({}, par);
    if (ur.gen) np[ur.gen] = Math.round(u.w * 1000);
    let z = u.z;
    if (u.k) { z = u.k.z0; if (ur.der) np[ur.der] = Math.round((u.k.z1 - u.k.z0) * 1000); }
    if (ur.ek) ur.ek(np, u);
    return { par: np, z };
  };
  const yerlestirUydur = async (I, r) => {
    const d = FAM[r.fam];
    const onz = (a, c) => { const w = M.dist2(a, c), mm = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, 0], u = [(c[0] - a[0]) / w, (c[1] - a[1]) / w]; const x = { type: 'aile', fam: r.fam, par: Object.assign({}, r.par, d.uydur && d.uydur.gen ? { [d.uydur.gen]: Math.round(w * 1000) } : {}), p: mm, rot: Math.atan2(u[0], -u[1]) / RAD, z: 0 }; return C.T.aile.prims(x); };
    const u = await uydurNoktalar(I, d, onz); if (!u) return null;
    let z = u.k ? u.k.z0 : null;
    if (z == null) { const zz = await I.num('Kanal taban kotu (m) — yakında perde bulunamadı', +(C.doc.set.sonAileZ || 0)); z = +zz || 0; }
    const v = C.aileUydurDegerleri(r.fam, r.par, { w: u.w, k: u.k, z });
    C.doc.set.sonAileZ = v.z;
    const tipU = (() => { const t = tipBul(r.fam, r.tip); if (!t) return ''; const q1 = C.aileDeger(r.fam, null, v.par), q2 = C.aileDeger(r.fam, r.tip, {}); return d.params.filter(p => !p.fn).every(p => q1[p.k] === q2[p.k]) ? r.tip : ''; })();
    const sonuc = { p: u.m, rot: u.rot, z: v.z, par: v.par, tip: tipU, uyd: { a: u.a, b: u.b } };
    if (d.uydur && d.uydur.std) { const st = d.uydur.std(v.par); if (st) C.log(st); }
    C.log(`Uydurma: kanal genişliği ${Math.round(u.w * 1000)} mm${u.k ? `, perdeden taban ${M.fmt(u.k.z0, 2)} / üst ${M.fmt(u.k.z1, 2)} (derinlik ${Math.round((u.k.z1 - u.k.z0) * 1000)} mm)` : ''}.`);
    return sonuc;
  };
  const olustur = (r, o) => {
    const d = FAM[r.fam]; if (d.katman) C.ensureLayer(d.katman, d.renk || 4, 'CONTINUOUS', 25);
    const e = C.add(C.newEnt('aile', { fam: r.fam, tip: o.tip != null ? o.tip : r.tip, tipU: o.tip != null ? o.tip : r.tip, par: o.par || r.par, p: [o.p[0], o.p[1], 0], rot: o.rot || 0, z: o.z || 0, ad: d.kisaAd || d.ad, layer: d.katman || C.doc.cur.layer, uyd: o.uyd })); delete e.sp;
    C.changed(); C.log(C.T.aile.info(e)); return e;
  };

  /* ================= KOMUTLAR ================= */
  C.addCommand(['AILE', 'AILELER', 'FAMILY', 'PARAMETRIK'], 'Aile (parametrik eleman) tarayıcısı: penstock, kaba ızgara … tip seç, ölçüleri gir, noktaya yerleştir ya da kanala uydur (iki yan yüze tıkla → genişlik ve perdeden kotlar otomatik).', async (I) => {
    const r = await C.aileSec(); if (!r) return;
    const d = FAM[r.fam];
    if (r.mod === 'uydur') { const o = await yerlestirUydur(I, r); if (o) olustur(r, o); return; }
    E.preview = c => C.T.aile.prims({ type: 'aile', fam: r.fam, par: r.par, p: c, rot: 90, z: 0 });
    const p = await I.pt('Yerleşim noktası (kanal tabanı, eksen ortası)'); E.preview = null; if (!p || typeof p === 'string') return;
    E.base = p; E.preview = c => C.T.aile.prims({ type: 'aile', fam: r.fam, par: r.par, p, rot: Math.atan2(c[1] - p[1], c[0] - p[0]) / RAD, z: 0 });
    const q = await I.pt('Akış yönü <90°>', { def: 'ENTER' }); E.preview = null; E.base = null;
    const rot = Array.isArray(q) ? Math.atan2(q[1] - p[1], q[0] - p[0]) / RAD : 90;
    const k = perdeKot(p);
    olustur(r, { p, rot, z: Math.abs(p[2] || 0) > 1e-6 ? p[2] : k ? k.z0 : +(C.doc.set.sonAileZ || 0) });
  });

  C.addCommand(['UYDUR', 'AILEUYDUR', 'FIT'], 'Seçili aile örneğini (penstock, ızgara …) kanala uydurur: iki yan yüze tıklayın → genişlik, eksen, akış yönü; yakındaki perdeden taban / üst kot ve derinlik.', async (I) => {
    let e = (C.sel || []).find(x => x.type === 'aile');
    if (!e) { const s = await I.sel('Uydurulacak aile örneğini seçin'); e = (s || []).find(x => x.type === 'aile'); }
    if (!e) { C.warn('Önce bir aile örneği seçin (AILE ile yerleştirilmiş).'); return; }
    const d = FAM[e.fam]; const q = degerE(e), giris = {}; for (const p of d.params) if (!p.fn) giris[p.k] = q[p.k];
    const o = await yerlestirUydur(I, { fam: e.fam, tip: e.tip, par: giris }); if (!o) return;
    Object.assign(e, { p: [o.p[0], o.p[1], 0], rot: o.rot, z: o.z, par: o.par, tip: o.tip, tipU: o.tip, uyd: o.uyd }); delete e._c; delete e._g; delete e._q;
    C.changed(); C.log(C.T.aile.info(e));
  });

  C.addCommand(['AILEGORUNUS', 'AILEONGORUNUS', 'AILEKESIT'], 'Seçili aile örneğinin 2B ön ya da yan görünüşünü (ölçülü çizgiler) istenen noktaya çizer: AILEGORUNUS [ON|YAN]', async (I) => {
    const e = (C.sel || []).find(x => x.type === 'aile'); if (!e) { C.warn('Bir aile örneği seçin.'); return; }
    const d = FAM[e.fam]; const hangi = await I.kw('Görünüş', [['ON', 'Ön'], ['YAN', 'Yan']], 'ON');
    if ((hangi === 'YAN' && !d.yan) || (hangi !== 'YAN' && !d.on)) { C.warn('Bu ailenin bu görünüşü tanımlı değil.'); return; }
    const q = degerE(e), pr = gorunusPrims(d, q, hangi === 'YAN' ? 'yan' : 'on'), z0 = +e.z || 0;
    const kay = (x, c) => { const t = v => [v[0] + c[0], v[1] + c[1], 0]; const y = Object.assign({}, x); if (y.a) { y.a = t(y.a); y.b = t(y.b); } if (y.pts) y.pts = y.pts.map(t); if (y.c && y.k === 'C') y.c = t(y.c); if (y.p) y.p = t(y.p); return y; };
    E.preview = c => pr.map(x => kay(x, c));
    const p = await I.pt('Görünüş taban orta noktası (taban kotu ' + M.fmt(z0, 2) + ' bu noktaya gelir)'); E.preview = null; if (!p || typeof p === 'string') return;
    const lay = (d.katman || 'AILE') + '_GORUNUS'; C.ensureLayer(lay, d.renk || 4, 'CONTINUOUS', 25);
    const sh = q2 => [q2[0] + p[0], q2[1] + p[1], 0];
    let n = 0; const gv = 'AILEG_' + Date.now().toString(36), n0 = C.doc.ents.length;
    for (const x of pr) {
      if (x.k === 'L') C.add(C.newEnt('line', { a: sh(x.a), b: sh(x.b), layer: lay, lt: x.lt || 'BYLAYER' }));
      else if (x.k === 'P') C.add(C.newEnt('pline', { pts: x.pts.map(sh), closed: !!x.c, layer: lay, lt: x.lt || 'BYLAYER' }));
      else if (x.k === 'C') C.add(C.newEnt('circle', { c: sh(x.c), r: x.r, layer: lay }));
      else if (x.k === 'S') C.add(C.newEnt('solid', { pts: x.pts.map(sh), layer: lay }));
      else if (x.k === 'T') C.add(C.newEnt('text', { p: sh(x.p), h: x.h, s: x.s, rot: (x.rot || 0) / RAD, al: x.al || 'L', layer: lay }));
      else continue; n++;
    }
    C.add(C.newEnt('kot', { p: [p[0] + (q.B || 1000) / 2000 + 0.6, p[1], 0], v: z0, txt: 'taban', layer: lay }));
    for (const x of C.doc.ents.slice(n0)) { delete x.sp; x.gv = gv; } // 3B sekmesinde çizilse de 2B görünüş olarak kalsın
    C.changed(); C.log(`${d.ad} ${hangi === 'YAN' ? 'yan' : 'ön'} görünüşü çizildi (${n} nesne, katman ${lay}).`);
  });

  C.addCommand(['AILETIP', 'AILETIPKAYDET'], 'Seçili aile örneğinin ölçülerini yeni tip olarak kaydeder: AILETIP ad', async (I) => {
    const e = (C.sel || []).find(x => x.type === 'aile'); if (!e) { C.warn('Bir aile örneği seçin.'); return; }
    const ad = await I.str('Tip adı', e.tip || ''); if (!ad) return;
    const d = FAM[e.fam], q = degerE(e), giris = {}; for (const p of d.params) if (!p.fn) giris[p.k] = q[p.k];
    C.aileTipKaydet(e.fam, ad, giris); e.tip = ad; e.tipU = ad; C.changed(); C.log(`Tip kaydedildi: ${d.ad} → ${ad}`);
  });

  C.addCommand(['AILELISTE', 'AILETABLO', 'EKIPMANLISTE'], 'Çizimdeki aile örnekleri listesi (aile, tip, ana ölçüler, kot, adet)', async () => {
    const xs = C.doc.ents.filter(e => e.type === 'aile' && FAM[e.fam]); if (!xs.length) { C.warn('Çizimde aile örneği yok.'); return; }
    const gr = new Map();
    for (const e of xs) { const d = FAM[e.fam], q = degerE(e), key = e.fam + '|' + (d.liste ? d.liste(q) : '') + '|' + (e.tip || ''); const g = gr.get(key) || { d, q, tip: e.tip, n: 0, kot: new Set() }; g.n++; g.kot.add(M.fmt(+e.z || 0, 2)); gr.set(key, g); }
    const rows = [...gr.values()];
    C.modal('Aile örnekleri listesi', `<table class="bom"><thead><tr><th>Poz</th><th>Eleman</th><th>Tip</th><th>Ölçüler</th><th>Taban kotu</th><th>Adet</th></tr></thead><tbody>${rows.map((g, i) => `<tr><td>${i + 1}</td><td>${esc(g.d.ad)}</td><td>${esc(g.tip || 'özel')}</td><td>${esc(g.d.liste ? g.d.liste(g.q) : '')}</td><td>${[...g.kot].join(', ')}</td><td style="text-align:right">${g.n}</td></tr>`).join('')}</tbody></table><div class="bar" style="justify-content:flex-end;margin-top:8px"><button class="pri" onclick="C.closeModal()">Kapat</button></div>`);
  }, { noUndo: true });

  /* şerit: Mekanik ve Arıtma sekmelerine Aileler paneli */
  try {
    if (C.ribbon && Array.isArray(C.ribbon.tabs)) {
      for (const ad of ['Mekanik', 'Arıtma']) {
        const tab = C.ribbon.tabs.find(t => t[0] === ad);
        if (tab && !tab[1].some(p => p[0] === 'Aileler')) tab[1].push(['Aileler', [{ cmd: 'AILE', t: 'Aileler', i: 'calc', big: true }, { cmd: 'UYDUR', t: 'Kanala uydur', i: 'align' }, { cmd: 'AILEGORUNUS', t: 'Görünüş çiz', i: 'sheet' }, { cmd: 'AILELISTE', t: 'Liste', i: 'table' }]]);
      }
      C.ribbon.render();
    }
  } catch (er) { console.error('aile şerit', er); }
})(window.C);

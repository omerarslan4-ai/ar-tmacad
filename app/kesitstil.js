/* ArıtmaCAD — kesit işareti (plandaki kesit çizgisi + sembolleri) ve kesit stilleri
   - kesitisaret nesnesi: çizgi tipi/kalınlığı/rengi, sembol (bayrak, ok, daire, üçgen), tam boy ya da yalnız uçlar, yazı boyu (kağıtta mm)
   - KESIT_ISARET katmanında; varsayılan olarak planda gizli (katmanı açılarak gösterilir)
   - KESITAYAR: işaret ve kesit çizimi stillerini değiştirir, mevcutlara uygular */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, { L, P, S, TX, CI, A } = C.prim;
  const LAY = 'KESIT_ISARET';
  const DEF = { sym: 'ucgendaire', mode: 'tam', lt: 'PHANTOM', lw: 35, color: 1, th: 4, show: true, cutLw: 50, visLw: 18, pat: 'ANSI31' };
  const stil = C.kesitStil = () => { const s = C.doc.set; if (!s.kesitStil) { let d = {}; try { d = JSON.parse(localStorage.getItem('aritmacad.kesitStil') || '{}'); } catch (e) { } s.kesitStil = Object.assign({}, DEF, d); } return s.kesitStil; };
  const ensureLay = () => { if (!C.doc.layers[LAY]) { const st = stil(); C.ensureLayer(LAY, st.color, 'CONTINUOUS', st.lw); C.doc.layers[LAY].on = !!st.show; C.emit('layers'); } return LAY; };

  C.KESIT_SEMBOLLER = [['ucgendaire', 'Üçgen + daire içinde harf'], ['yarimok', 'Yarısı dolu üçgen + harf altta'], ['okdaire', 'Daire içinde harf + dolu ok'], ['bayrak', 'Bayrak ┘ + harf'], ['ok', 'Ok ▼ + harf'], ['daire', 'Daire içinde harf + yön'], ['ucgen', 'Dolu üçgen + harf']];
  /* sembol önizlemesi (SVG) — gerçek çizim fonksiyonundan */
  C.kesitOnizle = (sym, mode, col) => {
    const k = C.doc.set.anno / 1000, e = { a: [0, 0, 0], b: [4 * k * 9, 0, 0], n: [0, 1], name: 'A', sym, mode: mode || 'tam', th: 4, lw: 35, lt: 'PHANTOM' }, pr = C.T.kesitisaret.prims(e);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const ext = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    for (const q of pr) { if (q.k === 'L') { ext(q.a[0], q.a[1]); ext(q.b[0], q.b[1]); } else if (q.k === 'S') q.pts.forEach(t => ext(t[0], t[1])); else if (q.k === 'C' || q.k === 'A') { ext(q.c[0] - q.r, q.c[1] - q.r); ext(q.c[0] + q.r, q.c[1] + q.r); } else if (q.k === 'T') { ext(q.p[0] - q.h, q.p[1] - q.h); ext(q.p[0] + q.h, q.p[1] + q.h * 1.2); } }
    const c = col || '#5fd3e6', Y = y => -y, sw = (x1 - x0) / 220;
    const body = pr.map(q => q.k === 'L' ? `<line x1="${q.a[0]}" y1="${Y(q.a[1])}" x2="${q.b[0]}" y2="${Y(q.b[1])}" stroke="${c}" stroke-width="${sw * 1.6}" ${q.lt && q.lt !== 'BYLAYER' ? `stroke-dasharray="${sw * 14} ${sw * 4} ${sw * 2} ${sw * 4}"` : ''}/>`
      : q.k === 'S' ? `<polygon points="${q.pts.map(t => t[0] + ',' + Y(t[1])).join(' ')}" fill="${c}"/>`
      : q.k === 'C' ? `<circle cx="${q.c[0]}" cy="${Y(q.c[1])}" r="${q.r}" fill="none" stroke="${c}" stroke-width="${sw * 1.6}"/>`
      : q.k === 'A' ? `<path d="M${q.c[0] + q.r * Math.cos(q.a0)},${Y(q.c[1] + q.r * Math.sin(q.a0))} A${q.r},${q.r} 0 0 0 ${q.c[0] + q.r * Math.cos(q.a1)},${Y(q.c[1] + q.r * Math.sin(q.a1))}" fill="none" stroke="${c}" stroke-width="${sw * 1.6}"/>`
      : q.k === 'T' ? `<text x="${q.p[0]}" y="${Y(q.p[1])}" font-size="${q.h}" fill="${c}" text-anchor="middle" dominant-baseline="${q.al === 'MC' ? 'central' : 'alphabetic'}" font-family="system-ui,sans-serif">${q.s}</text>` : '').join('');
    const pad = (x1 - x0) * 0.04; return `<svg viewBox="${x0 - pad} ${Y(y1) - pad} ${x1 - x0 + 2 * pad} ${y1 - y0 + 2 * pad}" width="100%" height="64" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
  };
  C.T.kesitisaret = {
    label: 'Kesit işareti',
    prims: e => {
      const k = C.doc.set.anno / 1000, th = (e.th || 4) * k, a = M.p3(e.a), b = M.p3(e.b), n = [e.n[0], e.n[1], 0];
      const u = M.norm(M.sub(b, a)), out = [], nm = e.name || 'A', o = { lt: e.lt || 'BYLAYER', lw: e.lw };
      if (e.mode === 'uc') { const l = Math.min(th * 3, M.dist2(a, b) / 3); out.push(L(a, M.add(a, M.mul(u, l)), o), L(b, M.sub(b, M.mul(u, l)), o)); }
      else out.push(L(a, b, o));
      for (const [p, sg] of [[a, -1], [b, 1]]) {
        const ext = M.add(p, M.mul(u, sg * th * 0.6)); // uçtan biraz dışarı
        if (e.sym === 'ok') {
          const t = M.add(p, M.mul(n, th * 1.6)); out.push(L(p, t, { lw: e.lw }));
          const w = th * 0.45, tip = M.add(t, M.mul(n, th * 0.9)); out.push(S([M.add(t, M.mul(u, w)), tip, M.sub(t, M.mul(u, w))]));
          out.push(TX(M.add(ext, M.mul(n, th * 0.4)), th, nm, 0, 'MC'));
        } else if (e.sym === 'daire') {
          const r = th * 0.95, c = M.add(p, M.mul(u, sg * r)); out.push(CI(c, r, { lw: e.lw }));
          const ca = Math.cos(0.9), sa = Math.sin(0.9); out.push(S([M.add(c, M.add(M.mul(n, r * ca), M.mul(u, r * sa))), M.add(c, M.mul(n, r * 1.75)), M.add(c, M.sub(M.mul(n, r * ca), M.mul(u, r * sa)))]));
          out.push(TX(M.sub(c, M.mul(n, r * 0.12)), th * 0.8, nm, 0, 'MC'));
        } else if (e.sym === 'ucgen') {
          const w = th * 0.8, b0 = p, b1 = M.add(p, M.mul(u, sg * w * 1.6)), ap = M.add(M.add(p, M.mul(u, sg * w * 0.8)), M.mul(n, th * 1.4));
          out.push(S([b0, b1, ap]));
          out.push(TX(M.add(M.add(p, M.mul(u, sg * th * 2.4)), M.mul(n, th * 0.7)), th, nm, 0, 'MC'));
        } else if (e.sym === 'ucgendaire') { // dolu üçgen, ortasında daire içinde harf; dairenin arka yarısı kesik
          const r = th * 0.95, c = M.add(p, M.mul(u, sg * r)), w = r * 1.55, h = r * 1.75, an = Math.atan2(n[1], n[0]), au = Math.atan2(u[1], u[0]);
          const pt = th2 => M.add(c, [r * Math.cos(th2), r * Math.sin(th2), 0]), poly = [M.sub(c, M.mul(u, w))];
          for (let i = 0; i <= 24; i++) { const t = au + Math.PI - i / 24 * Math.PI * (M.dot(M.cross([u[0], u[1], 0], n), [0, 0, 1]) > 0 ? 1 : -1); poly.push(pt(t)); }
          poly.push(M.add(c, M.mul(u, w)), M.add(c, M.mul(n, h)));
          const tris = [], AP = 27, th_ = i => 180 - 7.5 * i; let ka = -1, kb = -1; // DXF için üçgenler (B0 / tepe / B1 yelpazeleri)
          for (let i = 0; i < 24; i++) { const gr = th_(i + 1) >= 134 ? 0 : th_(i) <= 46 ? 26 : AP; if (gr === AP && ka < 0) ka = 1 + i; if (gr === 26 && kb < 0) kb = 1 + i; tris.push([gr, 1 + i, 2 + i]); }
          tris.push([0, AP, ka], [AP, 26, kb]);
          out.push(S(poly, { tris }));
          const a0 = an + Math.PI / 2; for (let i = 0; i < 7; i++) { const t0 = a0 + i / 7 * Math.PI, t1 = t0 + Math.PI / 7 * 0.62; out.push(A(c, r, t0, t1)); }
          out.push(TX(c, th * 0.95, nm, 0, 'MC'));
        } else if (e.sym === 'yarimok') { // yarısı dolu üçgen ok (uçta), harf çizginin öbür yanında
          const w = th * 0.9, h = th * 0.85, mid = M.sub(p, M.mul(u, sg * w)), in0 = M.sub(p, M.mul(u, sg * w * 2)), ap = M.add(mid, M.mul(n, h));
          out.push(S([mid, p, ap]), L(in0, ap, { lw: e.lw }), L(ap, p, { lw: e.lw }), L(in0, p, { lw: e.lw }), L(mid, ap, { lw: e.lw }));
          if (e.mode === 'uc') out.push(L(in0, p, o));
          out.push(TX(M.sub(mid, M.mul(n, th * 1.25)), th, nm, 0, 'MC'));
        } else if (e.sym === 'okdaire') { // daire içinde harf, daireden dışa dolu ok (yön)
          const r = th * 0.85, c = M.add(p, M.mul(u, sg * r)); out.push(CI(c, r, { lw: e.lw }));
          const tip = M.add(c, M.mul(n, r * 2.1)), w = r * 0.55, bs = M.add(c, M.mul(n, r)); out.push(S([M.add(bs, M.mul(u, w)), tip, M.sub(bs, M.mul(u, w))]));
          out.push(TX(c, th * 0.8, nm, 0, 'MC'));
        } else { // bayrak (L şekli)
          const m = M.add(p, M.mul(n, th * 1.5)); out.push(L(p, m, { lw: e.lw }));
          out.push(TX(M.add(m, M.mul(n, th * 0.4)), th, nm, 0, 'BC'));
        }
      }
      return out;
    },
    xf: (e, X) => { e.a = X.p(e.a); e.b = X.p(e.b); const v = X.v([e.n[0], e.n[1], 0]), l = Math.hypot(v[0], v[1]) || 1; e.n = [v[0] / l, v[1] / l]; },
    snaps: e => [{ p: M.p3(e.a), k: 'end' }, { p: M.p3(e.b), k: 'end' }],
    info: e => `${e.name}-${e.name} · sembol ${e.sym} · ${e.mode === 'uc' ? 'yalnız uçlar' : 'tam boy'} · ${e.lt || 'Katmandan'}`,
  };
  if (C.ANNO_TYPES) C.ANNO_TYPES.add('kesitisaret');
  C.makeSectionMark = (a, b, n, name, gv) => {
    const st = stil(); ensureLay();
    return C.add(C.newEnt('kesitisaret', { a: M.p3(a), b: M.p3(b), n: [n[0], n[1]], name, sym: st.sym, mode: st.mode, lt: st.lt, lw: st.lw, th: st.th, layer: LAY, gv }));
  };
  /* eski biçimdeki kesit işaretlerini (EKSEN'de kalın çizgiler + harf yazıları) KESIT_ISARET katmanına taşı */
  const migrate = () => {
    const marks = C.doc.ents.filter(e => e.layer === 'EKSEN' && e.type === 'line' && e.lw === 35); if (!marks.length) return 0;
    ensureLay(); let n = 0;
    for (const e of marks) { e.layer = LAY; n++; }
    for (const t of C.doc.ents.filter(e => e.type === 'text' && /^[A-ZÇĞİÖŞÜ]{1,3}$/.test(e.s || '') && e.layer === 'YAZI')) {
      if (marks.some(m => Math.min(M.dist2(t.p, m.a), M.dist2(t.p, m.b)) < t.h * 4)) { t.layer = LAY; n++; }
    }
    return n;
  };
  C.on('doc', () => setTimeout(() => { const n = migrate(); if (n) { C.changed(); C.emit('layers'); C.log(`${n} eski kesit işareti parçası KESIT_ISARET katmanına alındı (planda göstermek için Katmanlar'dan açın ya da KESITAYAR).`); } }, 50));

  /* ---------- KESITAYAR penceresi ---------- */
  C.addCommand(['KESITAYAR', 'KESITSTIL', 'SECTIONSTYLE'], 'Kesit stilleri: plandaki kesit işaretinin görünürlüğü, çizgi tipi, kalınlık, renk, sembol (bayrak, ok, daire, üçgen), yazı boyu; kesit çizimindeki kesilen/görünen çizgi kalınlıkları ve tarama deseni', async () => {
    const st = stil(); ensureLay(); const lay = C.doc.layers[LAY];
    const pats = C.HATCH_PATTERNS ? Object.keys(C.HATCH_PATTERNS) : ['ANSI31'];
    const lws = C.LW_VALUES || [13, 18, 25, 35, 50, 70];
    const b = C.modal('Kesit stilleri', `
      <div style="display:flex;gap:26px;flex-wrap:wrap">
      <div style="flex:1 1 260px"><h4>Plandaki kesit işareti</h4>
        <label><input type="checkbox" id="ksShow" ${lay.on ? 'checked' : ''}> Planda göster (KESIT_ISARET katmanı)</label>
        <div class="fld"><label>Sembol</label><select id="ksSym">${C.KESIT_SEMBOLLER.map(([v, t]) => `<option value="${v}" ${st.sym === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div id="ksCards" style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin:4px 0 10px"></div>
        <div class="fld"><label>Çizgi</label><select id="ksMode"><option value="tam" ${st.mode !== 'uc' ? 'selected' : ''}>Tam boy</option><option value="uc" ${st.mode === 'uc' ? 'selected' : ''}>Yalnız uçlarda</option></select></div>
        <div class="fld"><label>Çizgi tipi</label><select id="ksLt">${['BYLAYER'].concat(Object.keys(C.LT)).map(v => `<option ${st.lt === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="fld"><label>Kalınlık</label><select id="ksLw">${lws.map(v => `<option value="${v}" ${st.lw === v ? 'selected' : ''}>${(v / 100).toFixed(2)} mm</option>`).join('')}</select></div>
        <div class="fld"><label>Renk (ACI 1-255)</label><input id="ksCol" type="text" inputmode="numeric" value="${lay.color}"></div>
        <div class="fld"><label>Yazı yüksekliği (kağıtta mm)</label><input id="ksTh" type="text" inputmode="decimal" value="${st.th}"></div>
      </div>
      <div style="flex:1 1 240px"><h4>Kesit çizimi</h4>
        <div class="fld"><label>Kesilen çizgi kalınlığı</label><select id="ksCut">${lws.map(v => `<option value="${v}" ${st.cutLw === v ? 'selected' : ''}>${(v / 100).toFixed(2)} mm</option>`).join('')}</select></div>
        <div class="fld"><label>Görünen çizgi kalınlığı</label><select id="ksVis">${lws.map(v => `<option value="${v}" ${st.visLw === v ? 'selected' : ''}>${(v / 100).toFixed(2)} mm</option>`).join('')}</select></div>
        <div class="fld"><label>Tarama deseni</label><select id="ksPat">${pats.concat(['YOK']).map(v => `<option ${st.pat === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <label><input type="checkbox" id="ksAll" checked> Mevcut kesitlere ve işaretlere de uygula</label>
      </div></div>
      <div class="bar" style="justify-content:flex-end"><button id="ksCancel">İptal</button><button id="ksOk" class="pri">Uygula</button></div>`);
    { const sel = b.querySelector('#ksSym'), box = b.querySelector('#ksCards'), mo = b.querySelector('#ksMode');
      const draw = () => { box.innerHTML = C.KESIT_SEMBOLLER.map(([v, t]) => `<button type="button" data-s="${v}" title="${t}" style="display:flex;flex-direction:column;align-items:stretch;gap:2px;padding:4px 6px;background:${sel.value === v ? '#24364d' : '#1b2027'};border:1px solid ${sel.value === v ? '#4a90e2' : '#2c323b'};border-radius:6px;cursor:pointer;color:#aab3bd;font-size:11px">${C.kesitOnizle(v, mo.value)}<span>${t}</span></button>`).join(''); box.querySelectorAll('[data-s]').forEach(x => x.onclick = () => { sel.value = x.dataset.s; draw(); }); };
      sel.onchange = draw; mo.onchange = draw; draw(); }
    return new Promise(res => {
      let done = false; const end = () => { if (done) return; done = true; clearInterval(tm); C.closeModal(); res(); };
      b.querySelector('#ksOk').onclick = () => {
        C.undoStack.push(C.snapshot());
        const v = id => b.querySelector(id).value;
        Object.assign(st, { show: b.querySelector('#ksShow').checked, sym: v('#ksSym'), mode: v('#ksMode'), lt: v('#ksLt'), lw: +v('#ksLw'), th: Math.max(1, parseFloat(String(v('#ksTh')).replace(',', '.')) || 4), cutLw: +v('#ksCut'), visLw: +v('#ksVis'), pat: v('#ksPat') });
        const col = parseInt(v('#ksCol')); if (col >= 1 && col <= 255) { lay.color = col; st.color = col; }
        lay.on = st.show; lay.lw = st.lw;
        C.secHatch = st.pat; try { localStorage.setItem('aritmacad.kesitTarama', st.pat); localStorage.setItem('aritmacad.kesitStil', JSON.stringify(st)); } catch (e) { }
        if (b.querySelector('#ksAll').checked) {
          for (const e of C.doc.ents) if (e.type === 'kesitisaret') { Object.assign(e, { sym: st.sym, mode: st.mode, lt: st.lt, lw: st.lw, th: st.th }); delete e._c; }
          for (const [n, l] of Object.entries(C.doc.layers)) { if (n === 'KESIT' || /_KESIT(_|$)/.test(n) || (/^KESIT_/.test(n) && !/_TARAMA$/.test(n) && n !== 'KESIT_ISARET')) l.lw = st.cutLw; if (n === 'GORUNEN' || /_GORUNEN(_|$)/.test(n) || /^GORUNEN_/.test(n)) l.lw = st.visLw; }
          for (const e of C.doc.ents) if (e.type === 'hatch' && (e.layer === 'KESIT_TARAMA' || /_TARAMA(_|$)/.test(e.layer)) && st.pat !== 'YOK') { e.pat = st.pat; delete e.def; delete e._c; }
        }
        C.changed(); C.emit('layers'); C.log(`Kesit stili uygulandı · işaretler planda ${st.show ? 'görünür' : 'gizli'}.`); end();
      };
      b.querySelector('#ksCancel').onclick = end;
      const tm = setInterval(() => { if (document.querySelector('#modal').classList.contains('hidden')) end(); }, 300);
    });
  }, { noUndo: true });
})(window.C);

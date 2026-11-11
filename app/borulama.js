/* ArıtmaCAD — MEKANİK › BORULAMA: boru cinsi + sınıf + çap kataloğu, içi boş (gerçek dış çap, et kalınlığı, iç çap) 3B boru
   Cinsler: çelik (EN 10220 / DIN 2448, ASME B36.10 Sch40-STD / Sch80-XS), paslanmaz (ASME B36.19 / EN ISO 1127: 5S, 10S, 40S),
   galvaniz (EN 10255 orta seri), duktil (EN 545 K9 / K10), PE100 (EN 12201: SDR 7.4 … 33), PVC-U basınçlı (EN 1452), PVC-U kanalizasyon (EN 1401: SN2 / SN4 / SN8),
   PP-R (DIN 8077: PN10 / PN20), CTP / GRP (EN 1796, yaklaşık), beton boru (TS EN 1916, yaklaşık).
   Komut: BORU (ayar penceresi) — betikte eski biçim de çalışır: BORU DN=200 Z=-1.5 MAL=HDPE nokta …
   Boru nesnesi: pipe { pts, dn, od (mm), t (mm et), cins, sinif, mat, label } — 3B'de içi boş, uçlarda halka kesit; kesitte halka taranır. */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const up1 = x => Math.ceil(x * 10 - 1e-9) / 10;
  /* ---- tablolar ---- */
  const ASME = { 15: 21.3, 20: 26.7, 25: 33.4, 32: 42.2, 40: 48.3, 50: 60.3, 65: 73.0, 80: 88.9, 100: 114.3, 125: 141.3, 150: 168.3, 200: 219.1, 250: 273.1, 300: 323.9, 350: 355.6, 400: 406.4, 450: 457, 500: 508, 600: 610 };
  const STD = { 15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68, 50: 3.91, 65: 5.16, 80: 5.49, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53, 350: 9.53, 400: 9.53, 450: 9.53, 500: 9.53, 600: 9.53 };
  const XS = { 15: 3.73, 20: 3.91, 25: 4.55, 32: 4.85, 40: 5.08, 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.7, 250: 12.7, 300: 12.7, 350: 12.7, 400: 12.7, 450: 12.7, 500: 12.7, 600: 12.7 };
  const S5 = { 15: 1.65, 20: 1.65, 25: 1.65, 32: 1.65, 40: 1.65, 50: 1.65, 65: 2.11, 80: 2.11, 100: 2.11, 125: 2.77, 150: 2.77, 200: 2.77, 250: 3.40, 300: 3.96, 350: 3.96, 400: 4.19, 450: 4.19, 500: 4.78, 600: 5.54 };
  const S10 = { 15: 2.11, 20: 2.11, 25: 2.77, 32: 2.77, 40: 2.77, 50: 2.77, 65: 3.05, 80: 3.05, 100: 3.05, 125: 3.40, 150: 3.40, 200: 3.76, 250: 4.19, 300: 4.57, 350: 4.78, 400: 4.78, 450: 4.78, 500: 5.54, 600: 6.35 };
  const EN = { 50: [60.3, 2.9], 65: [76.1, 2.9], 80: [88.9, 3.2], 100: [114.3, 3.6], 125: [139.7, 4.0], 150: [168.3, 4.5], 200: [219.1, 5.9], 250: [273, 6.3], 300: [323.9, 7.1], 350: [355.6, 8.0], 400: [406.4, 8.8], 450: [457, 10.0], 500: [508, 11.0], 600: [610, 12.5], 700: [711, 12.5], 800: [813, 12.5], 900: [914, 12.5], 1000: [1016, 12.5], 1200: [1219, 14.2] };
  const GALV = { 15: [21.3, 2.6], 20: [26.9, 2.6], 25: [33.7, 3.2], 32: [42.4, 3.2], 40: [48.3, 3.2], 50: [60.3, 3.6], 65: [76.1, 3.6], 80: [88.9, 4.0], 100: [114.3, 4.5], 125: [139.7, 5.0], 150: [165.1, 5.0] };
  const DUK = { 80: 98, 100: 118, 125: 144, 150: 170, 200: 222, 250: 274, 300: 326, 350: 378, 400: 429, 450: 480, 500: 532, 600: 635, 700: 738, 800: 842, 900: 945, 1000: 1048, 1200: 1255 };
  const PE = [20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000, 1200];
  const PVCP = [20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 140, 160, 200, 225, 250, 280, 315, 355, 400, 450, 500, 630];
  const PVCK = { 110: [3.2, 3.2, 3.2], 125: [3.2, 3.2, 3.7], 160: [3.2, 4.0, 4.7], 200: [3.9, 4.9, 5.9], 250: [4.9, 6.2, 7.3], 315: [6.2, 7.7, 9.2], 400: [7.9, 9.8, 11.7], 500: [9.8, 12.3, 14.6], 630: [12.3, 15.4, 18.4] }; // SN2, SN4, SN8
  const PPR20 = { 20: 3.4, 25: 4.2, 32: 5.4, 40: 6.7, 50: 8.3, 63: 10.5, 75: 12.5, 90: 15.0, 110: 18.3 }, PPR10 = { 20: 1.9, 25: 2.3, 32: 2.9, 40: 3.7, 50: 4.6, 63: 5.8, 75: 6.8, 90: 8.2, 110: 10.0 };
  const GRP = { 300: 324, 350: 376, 400: 427, 450: 478, 500: 530, 600: 616, 700: 718, 800: 820, 900: 924, 1000: 1026, 1200: 1229, 1400: 1434, 1600: 1638, 1800: 1842, 2000: 2046 };
  const BET = { 300: 50, 400: 60, 500: 70, 600: 75, 800: 95, 1000: 115, 1200: 135, 1400: 150, 1600: 165, 1800: 180, 2000: 200 };
  const sdr = (s, pn) => ({ k: 'SDR' + s, ad: `SDR ${s}${pn ? ' (' + pn + ')' : ''}`, t: r => Math.max(2.0, up1(r.od / s)) });
  /* cins: { ad, std, mat (fitting / dirsek hesabı için), boy: 'DN' | 'OD' | 'ID', sizes: [{ dn, od }], sinif: [{ k, ad, t(row) }] } */
  const CAT = {
    celik: { ad: 'Çelik boru (EN 10220 / DIN 2448)', std: 'EN 10220 seri 1, DIN 2448 normal et', mat: 'Çelik', boy: 'DN', sizes: Object.entries(EN).map(([d, v]) => ({ dn: +d, od: v[0] })), sinif: [{ k: 'N', ad: 'Normal et (DIN 2448)', t: r => EN[r.dn][1] }] },
    asme: { ad: 'Çelik boru (ASME B36.10)', std: 'ASME B36.10M', mat: 'Çelik', boy: 'DN', sizes: Object.entries(ASME).map(([d, o]) => ({ dn: +d, od: o })), sinif: [{ k: 'STD', ad: 'Sch 40 / STD', t: r => STD[r.dn] }, { k: 'XS', ad: 'Sch 80 / XS', t: r => XS[r.dn] }] },
    paslanmaz: { ad: 'Paslanmaz çelik boru (AISI 304 / 316)', std: 'ASME B36.19M / EN ISO 1127', mat: 'Paslanmaz', boy: 'DN', sizes: Object.entries(ASME).map(([d, o]) => ({ dn: +d, od: o })), sinif: [{ k: '5S', ad: 'Sch 5S', t: r => S5[r.dn] }, { k: '10S', ad: 'Sch 10S', t: r => S10[r.dn] }, { k: '40S', ad: 'Sch 40S', t: r => STD[r.dn] }] },
    galvaniz: { ad: 'Galvaniz çelik boru', std: 'EN 10255 orta seri (M)', mat: 'Galvaniz çelik', boy: 'DN', sizes: Object.entries(GALV).map(([d, v]) => ({ dn: +d, od: v[0] })), sinif: [{ k: 'M', ad: 'Orta seri (M)', t: r => GALV[r.dn][1] }] },
    duktil: { ad: 'Duktil (sfero) döküm boru', std: 'EN 545 (çimento harcı iç kaplamasız et)', mat: 'Duktil', boy: 'DN', sizes: Object.entries(DUK).map(([d, o]) => ({ dn: +d, od: o })), sinif: [{ k: 'K9', ad: 'K9', t: r => Math.max(6.0, up1(9 * (0.5 + 0.001 * r.dn))) }, { k: 'K10', ad: 'K10', t: r => Math.max(6.0, up1(10 * (0.5 + 0.001 * r.dn))) }] },
    pe: { ad: 'PE100 (HDPE) basınçlı boru', std: 'EN 12201 / ISO 4427', mat: 'PE100', boy: 'OD', sizes: PE.map(o => ({ dn: o, od: o })), sinif: [sdr(7.4, 'PN25'), sdr(9, 'PN20'), sdr(11, 'PN16'), sdr(13.6, 'PN12.5'), sdr(17, 'PN10'), sdr(21, 'PN8'), sdr(26, 'PN6'), sdr(33, 'PN5')] },
    pvc: { ad: 'PVC-U basınçlı boru', std: 'EN 1452', mat: 'PVC', boy: 'OD', sizes: PVCP.map(o => ({ dn: o, od: o })), sinif: [sdr(41, 'PN6'), sdr(33, 'PN8'), sdr(26, 'PN10'), sdr(21, 'PN12.5'), sdr(17, 'PN16'), sdr(13.6, 'PN20')] },
    pvck: { ad: 'PVC-U kanalizasyon boru', std: 'EN 1401', mat: 'PVC', boy: 'OD', sizes: Object.keys(PVCK).map(o => ({ dn: +o, od: +o })), sinif: [{ k: 'SN2', ad: 'SN2 (SDR 51)', t: r => PVCK[r.dn][0] }, { k: 'SN4', ad: 'SN4 (SDR 41)', t: r => PVCK[r.dn][1] }, { k: 'SN8', ad: 'SN8 (SDR 34)', t: r => PVCK[r.dn][2] }] },
    ppr: { ad: 'PP-R boru', std: 'DIN 8077 / EN ISO 15874', mat: 'PPR', boy: 'OD', sizes: Object.keys(PPR20).map(o => ({ dn: +o, od: +o })), sinif: [{ k: 'PN10', ad: 'PN10 (SDR 11)', t: r => PPR10[r.dn] }, { k: 'PN20', ad: 'PN20 (SDR 6)', t: r => PPR20[r.dn] }] },
    ctp: { ad: 'CTP / GRP boru (yaklaşık)', std: 'EN 1796 / ISO 10639 — et kalınlığı üreticiye göre değişir', mat: 'CTP', boy: 'DN', sizes: Object.entries(GRP).map(([d, o]) => ({ dn: +d, od: o })), sinif: [{ k: 'SN5000', ad: 'SN5000 (≈)', t: r => up1(r.od * 0.0153) }, { k: 'SN10000', ad: 'SN10000 (≈)', t: r => up1(r.od * 0.0187) }] },
    beton: { ad: 'Beton boru (yaklaşık)', std: 'TS EN 1916 — DN = iç çap, et üreticiye göre değişir', mat: 'Beton', boy: 'ID', sizes: Object.entries(BET).map(([d, t]) => ({ dn: +d, od: +d + 2 * t })), sinif: [{ k: 'STD', ad: 'Donatılı / donatısız (≈)', t: r => BET[r.dn] }] },
  };
  C.BORU_KATALOG = CAT;
  const rowOf = (c, dn) => c.sizes.find(r => r.dn === +dn) || c.sizes.reduce((a, b) => Math.abs(b.dn - dn) < Math.abs(a.dn - dn) ? b : a);
  C.boruOlcu = (ck, sk, dn) => { const c = CAT[ck] || CAT.celik, r = rowOf(c, dn), s = c.sinif.find(x => x.k === sk) || c.sinif[0]; const t = +s.t(r) || 0; return { cins: ck, sinif: s.k, dn: r.dn, od: r.od, t, id: +(r.od - 2 * t).toFixed(2), c, s }; };
  const sizeLab = (c, r) => c.boy === 'OD' ? 'Ø' + r.dn : 'DN' + r.dn;
  /* malzeme kalitesi: boru etiketinde cins adı yerine yazılır. Liste öneridir, pencerede başka değer de yazılabilir.
     İlk değer varsayılan; seçilen son değer cins başına hatırlanır (aritmacad.boru → kaliteC). */
  const KAL = {
    celik: ['ST37', 'P235TR1', 'P235GH', 'S235JR', 'L245'], asme: ['A106 Gr.B', 'A53 Gr.B', 'API 5L Gr.B'],
    paslanmaz: ['SS304', 'SS304L', 'SS316', 'SS316L'], galvaniz: ['GALVANİZ', 'S195T GALV.', 'ST33 GALV.'],
    duktil: ['DUKTİL', 'GGG50', 'GGG40', 'EN-GJS-500-7'], pe: ['HDPE', 'PE100', 'PE100-RC', 'PE80'],
    pvc: ['PVC', 'PVC-U', 'PVC-O'], pvck: ['PVC', 'PVC-U', 'PP-KORUGE'], ppr: ['PP-R', 'PP-RCT', 'PP-R/AL'],
    ctp: ['CTP', 'GRP'], beton: ['BETON', 'BETONARME'],
  };
  C.boruKaliteleri = KAL;
  C.boruKalite = ck => { const s = st(), L = KAL[ck] || []; return (s.kaliteC && s.kaliteC[ck]) || L[0] || ''; };
  const labelOf = o => `${sizeLab(o.c, o)} ${o.kalite || o.c.mat}${o.s.ad && o.c.sinif.length > 1 ? ' ' + o.s.k : ''} (Ø${M.fmt(o.od, 1)}×${M.fmt(o.t, 1)})`;

  /* ---- içi boş boru ağı ---- */
  const mesh0 = T.pipe.mesh;
  T.pipe.mesh = e => { const ms = mesh0(e) || []; if (+e.t > 0 && +e.od > 0) { const ri = Math.max(0.0005, (+e.od - 2 * +e.t) / 2000); for (const m of ms) if (m && m.t === 'tube' && ri < m.r - 1e-5) { m.ri = ri; m.seg = Math.max(m.seg || 18, +e.od > 400 ? 48 : 32); } } return ms; };
  const info0 = T.pipe.info;
  T.pipe.info = e => { if (!(+e.t > 0)) return info0(e); let l = 0; for (let i = 1; i < e.pts.length; i++) l += M.dist(e.pts[i - 1], e.pts[i]); const c = CAT[e.cins]; return `${c ? c.ad : (e.mat || 'Boru')} · ${e.label || ''} · dış Ø${M.fmt(+e.od, 1)} mm · et ${M.fmt(+e.t, 2)} mm · iç Ø${M.fmt(+e.od - 2 * +e.t, 1)} mm · uzunluk ${M.fmt(l, 2)} m · iç hacim ${M.fmt(Math.PI * Math.pow((+e.od - 2 * +e.t) / 2000, 2) * l * 1000, 0)} L`; };
  if (C.PROPFIELDS) C.PROPFIELDS.pipe = (C.PROPFIELDS.pipe || []).concat([['od', 'Dış çap (mm)'], ['t', 'Et kalınlığı (mm)'], ['kalite', 'Malzeme kalitesi (etikette yazar: SS316L, PE100, ST37 …)', 's'], ['label', 'Etiket', 's']]);

  /* ---- ayar penceresi ---- */
  const st = () => { try { return Object.assign({ cins: 'pe', sinif: 'SDR11', dn: 110, z: 0 }, JSON.parse(localStorage.getItem('aritmacad.boru') || '{}')); } catch (e) { return { cins: 'pe', sinif: 'SDR11', dn: 110, z: 0 }; } };
  const save = o => { try { localStorage.setItem('aritmacad.boru', JSON.stringify(o)); } catch (e) { } };
  const dialog = (pre) => new Promise(res => {
    const s0 = Object.assign(st(), pre || {});
    const b = C.modal('Boru — cins, sınıf, çap', `<div style="display:grid;grid-template-columns:170px 1fr;gap:8px;align-items:center">
      <label>Boru cinsi</label><select id="bcC">${Object.entries(CAT).map(([k, c]) => `<option value="${k}" ${k === s0.cins ? 'selected' : ''}>${esc(c.ad)}</option>`).join('')}</select>
      <label>Sınıf / et serisi</label><select id="bcS"></select>
      <label>Malzeme kalitesi</label><div style="display:flex;gap:6px"><select id="bcKs" style="flex:1" title="Boru etiketinde cins adı yerine bu yazar"></select><input id="bcK" style="flex:1;display:none" placeholder="kaliteyi yazın"></div>
      <label>Çap</label><select id="bcD"></select>
      <label>Eksen kotu (m)</label><input id="bcZ" value="${+s0.z || 0}">
      </div>
      <div id="bcInfo" style="margin-top:10px;display:flex;gap:14px;align-items:center"></div>
      <p class="hint" id="bcStd"></p>
      <div class="bar" style="justify-content:flex-end"><button id="bcNo">Vazgeç</button><button id="bcOk" class="pri">Çiz</button></div>`);
    const $ = q => b.querySelector(q);
    const fill = () => {
      const c = CAT[$('#bcC').value]; const sk = c.sinif.some(x => x.k === s0.sinif) ? s0.sinif : (c.sinif.find(x => /SDR11|STD|K9|SN8|N\b/.test(x.k)) || c.sinif[0]).k;
      $('#bcS').innerHTML = c.sinif.map(x => `<option value="${x.k}" ${x.k === sk ? 'selected' : ''}>${esc(x.ad)}</option>`).join('');
      const dn = c.sizes.some(r => r.dn === +s0.dn) ? +s0.dn : rowOf(c, +s0.dn || 100).dn;
      const fd = () => { const s = c.sinif.find(x => x.k === $('#bcS').value) || c.sinif[0]; $('#bcD').innerHTML = c.sizes.map(r => { const t = s.t(r); return `<option value="${r.dn}" ${r.dn === dn ? 'selected' : ''}>${sizeLab(c, r)} — Ø${M.fmt(r.od, 1)} × ${t ? M.fmt(t, 2) : '?'} mm  (iç Ø${t ? M.fmt(r.od - 2 * t, 1) : '?'})</option>`; }).join(''); };
      { const ck = $('#bcC').value, L = KAL[ck] || [], v = (ck === s0.cins && s0.kalite) ? s0.kalite : C.boruKalite(ck), ozel = v && !L.includes(v);
        $('#bcKs').innerHTML = L.map(k => `<option ${k === v ? 'selected' : ''}>${esc(k)}</option>`).join('') + `<option value="__" ${ozel ? 'selected' : ''}>Diğer (yazın)…</option>`;
        $('#bcK').value = v; $('#bcK').style.display = ozel ? '' : 'none'; }
      fd(); $('#bcS').onchange = () => { fd(); info(); }; $('#bcStd').textContent = 'Standart: ' + c.std + (c.boy === 'OD' ? ' · boyut = dış çap (Ø)' : c.boy === 'ID' ? ' · DN = iç çap' : ' · DN = anma çapı');
    };
    const info = () => { const o = Object.assign(C.boruOlcu($('#bcC').value, $('#bcS').value, +$('#bcD').value), { kalite: $('#bcK').value }), R = 46, k = R / (o.od / 2), ri = Math.max(1, (o.od / 2 - o.t) * k);
      $('#bcInfo').innerHTML = `<svg width="100" height="100" viewBox="-50 -50 100 100"><circle r="${R}" fill="#8b95a3"/><circle r="${ri}" fill="#15181c"/><line x1="-${R}" y1="0" x2="${R}" y2="0" stroke="#3d8bfd" stroke-dasharray="3 2"/></svg>
        <div><b>${esc(labelOf(o))}</b><br>Dış çap: ${M.fmt(o.od, 1)} mm · Et: ${M.fmt(o.t, 2)} mm · <b>İç çap: ${M.fmt(o.id, 1)} mm</b><br>İç kesit: ${M.fmt(Math.PI * Math.pow(o.id / 2000, 2) * 1e4, 1)} cm² · 1 m boruda su: ${M.fmt(Math.PI * Math.pow(o.id / 2000, 2) * 1000, 1)} L</div>`; };
    $('#bcC').onchange = () => { fill(); info(); }; $('#bcD').onchange = info; $('#bcK').oninput = info; $('#bcKs').onchange = () => { const o = $('#bcKs').value === '__'; $('#bcK').style.display = o ? '' : 'none'; if (!o) $('#bcK').value = $('#bcKs').value; else $('#bcK').focus(); info(); }; fill(); info();
    $('#bcNo').onclick = () => { C.closeModal(); res(null); };
    $('#bcOk').onclick = () => { const o = { cins: $('#bcC').value, sinif: $('#bcS').value, dn: +$('#bcD').value, z: parseFloat($('#bcZ').value) || 0, kalite: C.up($('#bcK').value.trim()) }; const s1 = st(); o.kaliteC = Object.assign({}, s1.kaliteC || {}, { [o.cins]: o.kalite }); save(o); C.closeModal(); res(o); };
  });

  C.boruAyar = dialog; C.boruLabel = labelOf; C.boruSt = st; C.boruSave = save;
  /* ---- çizim ---- */
  const drawPipe = async (I, o) => {
    const b = C.boruOlcu(o.cins, o.sinif, o.dn), z = +o.z || 0; b.kalite = (o.kalite && String(o.kalite).trim()) || C.boruKalite(b.cins); const lab = labelOf(b);
    const props = { dn: b.dn, od: b.od, t: b.t, cins: b.cins, sinif: b.sinif, mat: b.c.mat, label: lab }; if (b.kalite) props.kalite = b.kalite;
    let a = await I.pt(`Başlangıç — ${lab}, eksen kotu ${M.fmt(z, 2)} (A = ayarlar)`, { kw: [['A', 'Ayarlar']] }); if (a == null) return;
    if (a === 'A') { const n = await dialog(o); if (!n) return; return drawPipe(I, n); }
    if (typeof a === 'string') return;
    const pts = [[a[0], a[1], Math.abs(a[2] || 0) > 1e-9 ? a[2] : z]];
    for (; ;) {
      const last = pts[pts.length - 1]; E.base = last; E.preview = c => C.prims(Object.assign({ type: 'pipe', pts: [...pts, [c[0], c[1], Math.abs(c[2] || 0) > 1e-9 ? c[2] : last[2]]] }, props));
      const p = await I.pt('Sonraki nokta (Z = düşey parça / kot, U = geri al, Enter = bitir)', { kw: [['Z', 'Kot'], ['U', 'Geri']] }); if (p == null) break;
      if (p === 'U') { if (pts.length > 1) pts.pop(); continue; }
      if (p === 'Z') { const zz = await I.num('Yeni eksen kotu (düşey parça)', last[2]); if (zz == null) continue; pts.push([last[0], last[1], zz]); continue; }
      if (typeof p === 'string') break;
      pts.push([p[0], p[1], Math.abs(p[2] || 0) > 1e-9 ? p[2] : last[2]]);
    }
    E.preview = null; E.base = null;
    if (pts.length < 2) return;
    const lay = C.doc.cur.layer === '0' ? (C.ensureLayer('MEK_BORU_' + C.up(b.cins), { pe: 4, pvc: 30, pvck: 30, ppr: 6, celik: 8, asme: 8, paslanmaz: 9, galvaniz: 252, duktil: 5, ctp: 2, beton: 8 }[b.cins] || 4, 'CONTINUOUS', 25), 'MEK_BORU_' + C.up(b.cins)) : C.doc.cur.layer;
    const e = C.add(C.newEnt('pipe', Object.assign({ pts, layer: lay }, props))); delete e.sp;
    C.log(T.pipe.info(e));
  };
  const c0 = C.cmds.BORU || C.cmds.PIPE;
  const kvOf = () => { const kv = {}; E.queue = E.queue.filter(t => { const m = /^([A-Za-zÇĞİÖŞÜçğıöşü_]+)=(.*)$/.exec(t); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; }); return kv; };
  C.addCommand(['PIPE', 'BORU', 'BORUCIZ'], 'Boru (3B, içi boş): pencerede cins (çelik, paslanmaz, galvaniz, duktil, PE100, PVC, PP-R, CTP, beton), sınıf (SDR / PN / Sch / SN / K) ve çap seçin; gerçek dış çap, et kalınlığı ve iç çapla çizilir. Betikte: BORU CINS=pe SINIF=SDR11 CAP=110 Z=-1.5 nokta nokta … KALITE=SS316L / PE100 / ST37 … (eski biçim DN= MAL= de çalışır)', async (I) => {
    if (E.queue.length && E.queue.some(t => /^(DN|MAL)=/i.test(t)) && !E.queue.some(t => /^CINS=/i.test(t)) && c0) return c0.fn(I); // eski betik biçimi
    const kv = kvOf();
    let o;
    if (kv.CINS || E.scriptMode) { const s0 = st(); o = { cins: CAT[(kv.CINS || s0.cins).toLowerCase()] ? (kv.CINS || s0.cins).toLowerCase() : 'pe', sinif: (kv.SINIF || s0.sinif).toUpperCase(), dn: +(kv.CAP || kv.DN || s0.dn), z: kv.Z != null ? parseFloat(kv.Z) : +s0.z || 0, kalite: kv.KALITE ? C.up(kv.KALITE) : undefined }; const c = CAT[o.cins]; if (!c.sinif.some(x => x.k === o.sinif)) o.sinif = c.sinif[0].k; }
    else { o = await dialog(); if (!o) return; }
    await drawPipe(I, o);
  });

  /* ---- şerit: Mekanik › Borulama ---- */
  C.borulamaPanel = () => { const it = (cmd, tt, i, big) => ({ cmd, t: tt, i, big: !!big }); return ['Borulama', [it('BORU', 'Boru çiz', 'pipe', true), it('BORU CINS=pe', 'PE100', 'pipe'), it('BORU CINS=pvc', 'PVC-U', 'pipe'), it('BORU CINS=pvck', 'PVC kanal', 'pipe'), it('BORU CINS=celik', 'Çelik', 'pipe'), it('BORU CINS=paslanmaz', 'Paslanmaz', 'pipe'), it('BORU CINS=duktil', 'Duktil', 'pipe'), it('BORU CINS=galvaniz', 'Galvaniz', 'pipe'), it('BORU CINS=ppr', 'PP-R', 'pipe'), it('BORU CINS=ctp', 'CTP / GRP', 'pipe'), it('BORU CINS=beton', 'Beton', 'pipe')]]; };
  setTimeout(() => { if (C.ekipmanRefresh) C.ekipmanRefresh(); }, 0);
  /* şerit düğmesi BORU CINS=x: pencereyi o cinsle açsın */
  const cB = C.cmds.BORU, fB = cB.fn;
  C.addCommand(cB.names, cB.help, async (I) => { const ci = E.queue.findIndex(t => /^CINS=/i.test(t)); if (ci >= 0 && E.queue.length === 1 && !E.scriptMode) { const k = E.queue[0].split('=')[1].toLowerCase(); E.queue = []; const s0 = st(); const c = CAT[k]; const o = await dialog({ cins: k, sinif: c && c.sinif.some(x => x.k === s0.sinif) ? s0.sinif : undefined }); if (!o) return; return drawPipe(I, o); } return fB(I); }, cB.opts);
})(window.C);

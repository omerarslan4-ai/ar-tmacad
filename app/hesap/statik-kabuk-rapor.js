/* ArıtmaCAD — STATİK: yay / oval hazne (3B kabuk) için DSİ statik rapor bölümü
   statik-rapor-dsi.js'in 1–7. bölümleri (genel, kriterler, malzeme, çatlak, kombinasyonlar, yükler, yanal yükler) aynen kullanılır;
   8. bölümde (Statik hesaplar) dikdörtgen plak çıktısı yerine SAP2000 raporundaki düzen üretilir:
     analiz modeli 3B görünüşü · her yükleme durumu için "Area Surface Pressure / Area Uniform" 3B yük görünüşleri ·
     perde grupları için M11 - M22 ve V13 - V23 (Max - Min) diyagramları (4'lü pano, uç değer okları) + k2–k3 tablolu betonarme hesabı ·
     temel M11 / M22 diyagramları + betonarme · döşemeler · zemin gerilme kontrolü (depremsiz / depremli) · yüzme tahkiki. Birimler: ton, t·m. */
'use strict';
(function () {
  const P = window.STATIK, G0 = 9.80665, tf = v => v / G0;
  const n2 = (v, d = 2) => (v == null || !isFinite(v) ? '—' : (+v).toFixed(d));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const area = poly => { let a = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]); return Math.abs(a) / 2; };
  const LAD = { G: ['Area Uniform (G) (GLOBAL - Gravity)', 'Zati yükler'], Q: ['Area Uniform (Q) (GLOBAL - Gravity)', 'Hareketli yükler'], Hs: ['Area Surface Pressure - Face Top (SU)', 'Hazne içi hidrostatik su basıncı'], Hd: ['Area Surface Pressure - Face Top (SU1)', 'İç perdelerde tek taraf su / seviye farkı'], Ht: ['Area Surface Pressure - Face Top (TPR)', 'Statik toprak itkisi'], Qs: ['Area Surface Pressure - Face Top (SRJ)', 'Sürşarj yanal itkisi'], YAS: ['Area Surface Pressure - Face Top (YAS)', 'Yeraltı suyu yanal itki ve kaldırma'], EWX: ['Area Surface Pressure - Face Top (SU_EQ-X)', 'Hidrodinamik su basıncı X (Westergaard)'], EWY: ['Area Surface Pressure - Face Top (SU_EQ-Y)', 'Hidrodinamik su basıncı Y (Westergaard)'], ESX: ['Area Surface Pressure - Face Top (TPR_EQ-X)', 'Dinamik toprak itkisi + atalet X'], ESY: ['Area Surface Pressure - Face Top (TPR_EQ-Y)', 'Dinamik toprak itkisi + atalet Y'] };
  const img = (o) => o ? `<img src="${o.canvas.toDataURL('image/png')}" style="width:100%;border:1px solid #999">` : '';

  /* ---------- R adaptörü (statik-rapor-dsi.js 1–7. bölüm alanları) ---------- */
  P.kabukAdaptor = (K, S) => {
    const IT = K.YT.IT, YK = K.YT.YK, M = S.kabuk, xs = M.radye.pts.map(p => p[0]), ys = M.radye.pts.map(p => p[1]);
    return { kabuk: K, S, MAL: K.MAL, IT, YK, GM: { comps: [1], R: { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }, walls: [] }, dosemeler: M.dosemeler || [], tasarim: K.tasarim, ok: K.ok, perdeler: [], radye: { xs: [], ys: [], Z: {} } };
  };

  /* ---------- perde grupları (dış / iç × kalınlık) ve tasarım birleştirme ---------- */
  const grupla = K => {
    const out = new Map();
    for (const t of K.tasarim) { const g = t.grup; const key = g.tur + '|' + Math.round(g.t * 1000); if (!out.has(key)) out.set(key, { tur: g.tur, t: g.t, c: g.c, adlar: [], ids: [], tas: [] }); const o = out.get(key); o.adlar.push(t.eleman); o.ids.push(...g.ids); o.tas.push(t); }
    return [...out.values()];
  };
  const birlestir = (G) => { // aynı (yön, yüz) için en büyük gerekli donatıyı seçen katman
    const m = new Map(); for (const t of G.tas) for (const k of t.katman) { const key = k.yon + '|' + k.yuz, o = m.get(key), r = k.sec.ok ? k.sec.As : 1e9; if (!o || r > (o.sec.ok ? o.sec.As : 1e9) || (r === (o.sec.ok ? o.sec.As : 1e9) && k.M > o.M)) m.set(key, k); }
    const ks = G.tas.map(t => t.kesme).sort((a, b) => b.Vd - a.Vd)[0];
    const yonAd = y => /^M11/.test(y) ? 'M11(x-x)' : 'M22(y-y)';
    return { h: G.t, c: G.c, katman: [...m.values()].map(k => Object.assign({}, k, { yon: yonAd(k.yon), yuz: k.yuz + ' yüz', suYuz: true })), kesme: ks };
  };

  /* ---------- 4'lü pano (Min / Max) ---------- */
  const pano = (K, set, d1, d2, bas1, bas2, birim) => {
    const W = 470, H = 330, filt = (e, i) => set.has(i), out = [];
    for (const [anah, bas] of [[d1, bas1], [d2, bas2]]) for (const [tip, et] of [['n', 'min'], ['p', 'max']]) {
      const key = anah + tip, a = K.Z.tsm[key] || null; if (!a) continue;
      const o = P.kabukCiz(K, { deger: (i, k) => tf(a[i * 4 + k]), filt, W, H, az: -55, el: 32, etiket: et, ust: `Resultant ${bas} Diagram (ENV - ${et === 'min' ? 'Min' : 'Max'})`, baslik: '', birim });
      out.push(`<div class="pn">${img(o)}</div>`); }
    return `<div class="pano">${out.join('')}</div>`;
  };
  const panoV = (K, set) => { // V13 / V23 için zarf yok → tasarım kombinasyonlarından anlık max/min
    const W = 470, H = 330, filt = (e, i) => set.has(i), ne = K.AG.els.length, out = [];
    for (const [q, ad] of [[6, 'V13'], [7, 'V23']]) { const mx = new Float32Array(ne * 4).fill(-1e9), mn = new Float32Array(ne * 4).fill(1e9);
      for (const k of K.KV.filter(k => k.tip === 'tsm')) { const ent = Object.entries(k.f).filter(([c, f]) => f && K.Q[c]); for (const i of set) for (let n = 0; n < 4; n++) { const j = i * 4 + n; let v = 0; for (const [c, f] of ent) v += f * K.Q[c][j * 8 + q]; if (v > mx[j]) mx[j] = v; if (v < mn[j]) mn[j] = v; } }
      for (const [a, et] of [[mn, 'min'], [mx, 'max']]) { const o = P.kabukCiz(K, { deger: (i, k) => tf(a[i * 4 + k]), filt, W, H, az: -55, el: 32, etiket: et, ust: `Resultant ${ad} Diagram (ENV - ${et === 'min' ? 'Min' : 'Max'})`, birim: 'ton/m' }); out.push(`<div class="pn">${img(o)}</div>`); } }
    return `<div class="pano">${out.join('')}</div>`;
  };

  /* ---------- 8. bölüm ---------- */
  P.kabukRapor8 = (r) => {
    const K = r.kabuk, S = r.S, M = S.kabuk, D = P._dsiRap, MAL = K.MAL, g = S.geo, AG = K.AG, ko = tf(S.zemin.kw), sg = tf(S.zemin.sig);
    let h = `<style>.dsi .pano{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0}.dsi .pn img{display:block}.dsi .bas3b{font-weight:700;text-align:center;margin:4px 0 14px}</style>`;
    // analiz modeli
    const RENK = { perde: '#e00000', radye: '#1e5adc', doseme: '#20d0d0' };
    const m3 = P.kabukCiz(K, { deger: () => 0, renkFn: e => RENK[e.tur] || '#888', W: 900, H: 560, az: -55, el: 30, olceksiz: true, ust: 'ArıtmaCAD — 3-D View', baslik: '3-D View' });
    const nW = M.walls.length, nY = M.walls.reduce((s, w) => s + (w.pts.length > 3 && !w.kapali ? 1 : 0), 0); void nY;
    h += `<h3>Analiz Modeli</h3><p>Yapı, perdeler (düz ve yay perdeler), radye temel ve döşemelerden oluşan üç boyutlu kabuk (shell) sonlu eleman modeli ile çözülmüştür. Yay perdeler düz kabuk elemanlara bölünmüştür. Eleman: 4 düğümlü kalın kabuk (zar + MITC4 bükülme), ağ aralığı ≈ ${n2(K.h)} m; ${AG.nodes.length} düğüm, ${AG.els.length} eleman, ${K.dof} serbestlik. Radye, Winkler zemini (k<sub>o</sub> = ${n2(ko, 0)} ton/m³) üzerindedir; perde tabanları radyeye, döşemeler perde üst uçlarına rijit bağlıdır. Perde sayısı: ${nW} (${M.walls.filter(w => w.tip === 'dis').length} dış, ${M.walls.filter(w => w.tip !== 'dis').length} iç).</p>${img(m3)}<div class="bas3b">3-D View</div>`;
    // yükleme durumları
    h += `<h3 class="sayfa">Yükleme Durumları</h3>`;
    const cases = Object.keys(K.Q);
    for (const c of cases) {
      const fn = K.YT.L[c]; if (!fn) continue; const tr = new Map(); let var_ = false;
      AG.els.forEach((e, i) => { const t = fn(e); if (t) { tr.set(i, t); var_ = true; } }); if (!var_) continue;
      const grav = c === 'G' || c === 'Q';
      const deger = (i, k) => { const t = tr.get(i); if (!t) return 0; const e = AG.els[i], p = AG.nodes[e.n[k]], v = t(p); if (!v) return 0; return tf(grav ? -v[2] : (v[0] * e.F.e3[0] + v[1] * e.F.e3[1] + v[2] * e.F.e3[2])); };
      const o = P.kabukCiz(K, { deger, filt: (e, i) => tr.has(i), W: 900, H: 520, az: -55, el: 30, ust: 'ArıtmaCAD — 3B kabuk modeli', baslik: (LAD[c] || [c])[0], birim: 'Ton, m, C' });
      h += `<div style="page-break-inside:avoid">${img(o)}<div class="bas3b">${esc((LAD[c] || [c, c])[1])}</div></div>`;
    }
    // perde grupları
    const GR = grupla(K);
    for (const G of GR.filter(x => x.tur === 'dis' || x.tur === 'ic')) {
      const ad = G.adlar.join(', '), set = new Set(G.ids), t = birlestir(G);
      h += `<h3 class="sayfa">${esc(ad)} Perdeleri Betonarme Hesabı</h3>` + pano(K, set, 'm11', 'm22', 'M11', 'M22', 'Ton-m/m') + `<div class="bas3b">${esc(ad)} Perdeleri M11 - M22 (Max - Min) Diyagramı</div>`;
      h += panoV(K, set) + `<div class="bas3b">${esc(ad)} Perde V13 - V23 (Max - Min) Diyagramı</div>`;
      h += D.betonarme(t, MAL, S.tas.wmax, `${esc(ad)} Perdeleri (t = ${n2(G.t * 100, 0)} cm)`);
    }
    // radye
    const RG = GR.find(x => x.tur === 'radye');
    if (RG) { const set = new Set(RG.ids), t = birlestir(RG); t.katman.forEach(k => { k.yon = /^M11/.test(k.yon) ? 'M11(x-x)' : 'M22(y-y)'; });
      const one = (key, et, bas) => P.kabukCiz(K, { deger: (i, k) => tf(K.Z.tsm[key][i * 4 + k]), filt: (e, i) => set.has(i), W: 900, H: 470, az: 0, el: 90, etiket: et, ust: `Resultant ${bas} Diagram (ENV - ${et === 'min' ? 'Min' : 'Max'})`, birim: 'Ton-m/m' });
      h += `<h3 class="sayfa">${n2(M.radye.kAlt)} Kotu Temel M11 (Max - Min) Diyagramı</h3>${img(one('m11n', 'min', 'M11'))}${img(one('m11p', 'max', 'M11'))}<div class="bas3b">${n2(M.radye.kAlt)} Kotu Temel M11 (Max - Min) Diyagramı</div>`;
      h += `<h3 class="sayfa">${n2(M.radye.kAlt)} Kotu Temel M22 (Max - Min) Diyagramı</h3>${img(one('m22n', 'min', 'M22'))}${img(one('m22p', 'max', 'M22'))}<div class="bas3b">${n2(M.radye.kAlt)} Kotu Temel M22 (Max - Min) Diyagramı</div>`;
      h += D.betonarme(t, MAL, S.tas.wmax, `${n2(M.radye.kAlt)} Kotu Temel`); }
    // döşemeler
    for (const G of GR.filter(x => x.tur === 'doseme')) { const set = new Set(G.ids), t = birlestir(G), d = M.dosemeler[+AG.els[G.ids[0]].grp.slice(1)];
      const one = (key, et, bas) => P.kabukCiz(K, { deger: (i, k) => tf(K.Z.tsm[key][i * 4 + k]), filt: (e, i) => set.has(i), W: 900, H: 420, az: 0, el: 90, etiket: et, ust: `Resultant ${bas} Diagram (ENV - ${et === 'min' ? 'Min' : 'Max'})`, birim: 'Ton-m/m' });
      h += `<h3 class="sayfa">${n2(d.zt)} Kotu ${esc(d.ad)} Döşeme M11 - M22 (Max - Min) Diyagramı</h3><div class="pano"><div class="pn">${img(one('m11n', 'min', 'M11'))}</div><div class="pn">${img(one('m11p', 'max', 'M11'))}</div><div class="pn">${img(one('m22n', 'min', 'M22'))}</div><div class="pn">${img(one('m22p', 'max', 'M22'))}</div></div>`;
      h += D.betonarme(t, MAL, S.tas.wmax, `${n2(d.zt)} Kotu ${esc(d.ad)} Döşeme`); }
    // zemin gerilme kontrolü (depremsiz / depremli)
    const radN = [...new Set(AG.els.filter(e => e.tur === 'radye').flatMap(e => e.n))], depMi = k => Object.keys(k.f).some(c => /^E[WS]/.test(c) && k.f[c]);
    const qZarf = dep => { const q = new Float32Array(AG.nodes.length); let mx = 0, wmx = 0; for (const k of K.KV.filter(k => k.tip === 'emn' && depMi(k) === dep)) for (const n of radN) { let w = 0; for (const [c, f] of Object.entries(k.f)) if (f && K.U[c]) w += f * K.U[c][n * 6 + 2]; const v = -S.zemin.kw * w; if (v > q[n]) q[n] = v; if (v > mx) { mx = v; wmx = -w; } } return { q, mx, wmx }; };
    const qD = qZarf(false), qE = qZarf(true), rset = new Set(AG.els.map((e, i) => (e.tur === 'radye' ? i : -1)).filter(i => i >= 0));
    const qimg = (Z, bas) => P.kabukCiz(K, { deger: (i, k) => tf(Z.q[AG.els[i].n[k]]), filt: (e, i) => rset.has(i), W: 900, H: 430, az: 0, el: 90, ust: 'Soil Pressure Diagram', baslik: bas, birim: 'Ton/m²' });
    const Arad = area(M.radye.pts), Wtop = tf(AG.els.reduce((s, e) => s + e.A * e.t * (S.mal.gc || 25), 0));
    h += `<h3 class="sayfa">Zemin Gerilme Kontrolü</h3>${img(qimg(qD, 'Depremsiz Durum İçin Zemin Gerilme Diyagramı'))}<div class="bas3b">Depremsiz Durum İçin Zemin Gerilme Diyagramı</div>`;
    if (qE.mx > 0) h += `${img(qimg(qE, 'Depremli Durum İçin Zemin Gerilme Diyagramı'))}<div class="bas3b">Depremli Durum İçin Zemin Gerilme Diyagramı</div>`;
    h += `<p>Sonlu elemanlar analiz programından elde edilen her bir yük kombinasyonuna ait en büyük düşey deplasman zemin yatak katsayısı ile çarpılarak temel altında oluşan zemin gerilmesi bulunmuştur.</p>` +
      D.tab([D.tr(D.th(''), D.th('Global FZ'), D.th('Deplasman'), D.th('Temel Alanı'), D.th('Zemin Yatak Katsayısı'), D.th('Zemin Emniyet Gerilmesi')), D.tr(D.th(''), D.th('Ton'), D.th('m'), D.th('m²'), D.th('t/m³'), D.th('t/m²')),
        D.tr(D.td('TML', 'class="l b"'), D.td(n2(Wtop, 0), 'rowspan="2"'), D.td(n2(qD.wmx, 4)), D.td(n2(Arad), 'rowspan="2"'), D.td(n2(ko, 0), 'rowspan="2"'), D.td(n2(sg), 'rowspan="2"')), D.tr(D.td('TML_EQ', 'class="l b"'), D.td(n2(qE.wmx, 4)))]) +
      `<p class="f">Gerilme σ = ${n2(qD.wmx, 4)} × ${n2(ko, 0)} = <b>${n2(tf(qD.mx))}</b> ${tf(qD.mx) <= sg ? '&lt;' : '&gt;'} ${n2(sg)} t/m² &nbsp; Zemin Emniyet Gerilmesi ${D.durum(tf(qD.mx) <= sg)}</p>` +
      (qE.mx > 0 ? `<p class="f">Gerilme σ<sub>eq</sub> = ${n2(qE.wmx, 4)} × ${n2(ko, 0)} = <b>${n2(tf(qE.mx))}</b> ${tf(qE.mx) <= sg ? '&lt;' : '&gt;'} ${n2(sg)} t/m² &nbsp; Zemin Emniyet Gerilmesi ${D.durum(tf(qE.mx) <= sg)}</p>` : '');
    // yüzme tahkiki
    if (g.kYAS != null && g.kYAS > M.radye.kAlt) {
      const Hy = g.kYAS - M.radye.kAlt, U = Hy * Arad, FSg = S.tas.FSk || 1.1, gc = tf(S.mal.gc || 25), rows = []; let top = 0;
      const ekle = (a, n, A, y) => { const w = n * A * y * gc; top += w; rows.push(D.tr(D.td(esc(a), 'class="l"'), D.td(n), D.td(n2(A)), D.td(n2(y)), D.td(n2(gc, 2)), D.td(n2(w)))); };
      ekle('Temel (radye)', 1, Arad, M.radye.t);
      for (const w of M.walls) { let L = 0; const n = w.kapali ? w.pts.length : w.pts.length - 1; for (let i = 0; i < n; i++) { const a = w.pts[i], b = w.pts[(i + 1) % w.pts.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); } ekle(`${w.ad} Perde (L = ${n2(L)} m)`, 1, L * w.t, w.zt - M.radye.kAlt - M.radye.t); }
      for (const d of M.dosemeler || []) ekle(`${d.ad} Döşeme`, 1, area(d.pts), d.t);
      h += `<h3 class="sayfa">Yüzme Tahkiki</h3><table class="sem">${D.tr(D.td('Zemin Kotu :'), D.td(n2(g.kZemin)))}${D.tr(D.td('Yeraltı Su Seviyesi :'), D.td(n2(g.kYAS)))}${D.tr(D.td('Temel Alt Kotu :'), D.td(n2(M.radye.kAlt)))}</table>` +
        D.tab([D.tr(D.td('YASS Altında Kalan Derinlik', 'class="l"'), D.td('H<sub>yass</sub>'), D.td(`= ${n2(Hy)} m`, 'class="l"')), D.tr(D.td('Temel Alanı', 'class="l"'), D.td('A'), D.td(`= ${n2(Arad)} m²`, 'class="l"')), D.tr(D.td('Yüzdürme Kuvveti', 'class="l"'), D.td('U'), D.td(`= ${n2(U)} ton`, 'class="l"')), D.tr(D.td('Güvenlik Katsayısı', 'class="l"'), D.td('GS'), D.td(`= ${n2(FSg)}`, 'class="l"'))]) +
        D.tab([D.tr(D.th(''), D.th('Adet'), D.th('Alan'), D.th('Yükseklik'), D.th('B.H.Ağ.'), D.th('Ağırlık')), D.tr(D.th(''), D.th(''), D.th('m²'), D.th('m'), D.th('ton/m³'), D.th('ton')), ...rows]) +
        `<p class="f" style="text-align:right">Toplam Ağırlık = <b>${n2(top)}</b> ton<br><b>${n2(U * FSg)} ton</b> ${U * FSg <= top ? '&lt;' : '&gt;'} <b>${n2(top)} ton</b> &nbsp; Yapı Ağırlığı ${D.durum(U * FSg <= top)}</p>`;
    } else h += `<h3>Yüzme Tahkiki</h3><p>Yeraltı suyu temel alt kotunun altında olduğundan yüzme tahkikine gerek yoktur.</p>`;
    return h;
  };
})();

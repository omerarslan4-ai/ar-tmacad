/* ArıtmaCAD — GUSE SEKMESİ ve GUSEYİ OKLA ÇEKME (arayüz; hesap app/guse-yer.js içindedir)
   Guseli kolon(lar) seçilince şeritte "Guse" sekmesi açılır (seçim kalkınca kapanır, önceki sekmeye dönülür):
     · Kiriş altına mesafe (cm): guse üst yüzü ile kolona oturan kirişin altı arasındaki açıklık — yazılan değer seçili bütün guselere uygulanır
     · ▲ / ▼: seçili guseleri 5 cm yukarı / aşağı kaydırır (aralarındaki fark korunur)
     · Çıkma, kolon yüzünde / uçta yükseklik, genişlik, yön: gusenin öteki ölçüleri
     Seçimde değerler birbirinden farklıysa kutu boş kalır ve "farklı" yazar.
   3B'de: seçili guseli kolonların guse ucunda yukarı bakan ok çıkar; oku tutup çekince (ya da mesafeyi yazıp Enter) seçili bütün guseler birlikte kayar.
   Komut: GUSESEC — çizimdeki bütün guseli kolonları seçer. Geri al (Ctrl+Z) her değişikliği tek adımda geri alır. */
(function (C) {
  'use strict';
  if (typeof document === 'undefined' || !C || !C.guseYer) return;
  const Y = C.guseYer, M = C.M, RAD = Math.PI / 180, AD = 'Guse';
  const YON = [['R', 'Sağ (+b)'], ['L', 'Sol (−b)'], ['F', 'Ön (+d)'], ['A', 'Arka (−d)'], ['RL', 'Sağ + sol'], ['FA', 'Ön + arka'], ['ALL', 'Dört yön']];
  const acik = e => { const l = C.layer ? C.layer(e.layer) : null; return !(l && l.lock); };
  const secili = () => (C.cmd && C.cmd.running ? [] : (C.sel || []).filter(e => Y.guseli(e) && acik(e) && C.doc.ents.includes(e)));
  const tumu = () => C.doc.ents.filter(e => Y.guseli(e) && !(typeof e.gv === 'string') && (!C.layer || C.layer(e.layer).on !== false));
  const temizle = e => { delete e._c; delete e._g; delete e._q; };
  const sayi = (v, hane) => String(+(+v).toFixed(hane == null ? 1 : hane)).replace('.', ',');
  const kot = z => (z >= 0 ? '+' : '−') + Math.abs(z).toFixed(2).replace('.', ',');
  const oku = s => { const v = parseFloat(String(s).trim().replace(',', '.')); return isFinite(v) ? v : null; };

  /* ---------- değişiklik: seçili guselerin hepsine birden, tek geri al adımıyla ---------- */
  const uygula = (K, fn, ileti) => { C.begin(); for (const e of K) { fn(e); temizle(e); } C.changed(); const v = C.views && C.views.v3; if (v && v.invalidate) v.invalidate(); if (ileti) C.log(ileti); };
  const mesafeYaz = cm => {
    const K = secili(); if (!K.length) return;
    const Yn = K.map(e => Y.yeni(e, C.doc.ents, cm / 100)), kotu = Yn.filter(y => !y.ok);
    if (kotu.length) { C.warn(`Guse bu mesafeyle yerleşmiyor (${kotu.length} kolon): ${kotu[0].neden}. Değer uygulanmadı.`); return; }
    uygula(K, e => { e.gZ = Yn[K.indexOf(e)].gZ; }, `${K.length} guse: kiriş altına mesafe ${sayi(cm)} cm · guse üst kotu ${kot(Yn[0].ust)}${Y.ortak(Yn, y => y.ust).farkli ? ' (kolonlara göre değişiyor)' : ''}.`);
  };
  const kaydirHepsi = t => { const K = secili(); if (!K.length) return; uygula(K, e => { e.gZ = Y.kaydir(e, t); }, `${K.length} guse ${Math.abs(t * 100)} cm ${t > 0 ? 'yukarı' : 'aşağı'} kaydırıldı.`); };
  const olcuYaz = (k, cm, ad) => {
    const K = secili(); if (!K.length) return;
    if (k === 'gW' ? cm < 0 : cm <= 0) { C.warn(`${ad}: geçersiz değer.`); return; }
    { const kotu = K.find(e => (k === 'gHu' ? cm / 100 > (+e.gHf || 0.6) + 1e-9 : k === 'gHf' ? cm / 100 < (+e.gHu || 0.3) - 1e-9 : false)); if (kotu) { C.warn(`${ad}: uçtaki yükseklik kolon yüzündeki yükseklikten büyük olamaz. Değer uygulanmadı.`); return; } }
    if (k === 'gHf') { const s = K.map(e => Y.sinir(Object.assign({}, e, { gHf: cm / 100 }), Y.ustKot(e))).find(r => !r.ok); if (s) { C.warn(`${ad}: ${s.neden}. Değer uygulanmadı.`); return; } }
    uygula(K, e => { e[k] = +(cm / 100).toFixed(4); }, `${K.length} guse: ${ad} ${sayi(cm)} cm.`);
  };

  /* ---------- sekme gövdesi ---------- */
  const st = document.createElement('style');
  st.textContent = `
#ribbon .gsp{display:flex;flex-direction:column;border-right:1px solid var(--line);padding:0 10px;flex:none}
#ribbon .gsp .gsb{display:grid;grid-template-rows:repeat(3,24px);grid-auto-flow:column;gap:1px 12px;align-items:center;flex:1}
#ribbon .gsp label{display:flex;align-items:center;gap:6px;font-size:12px;white-space:nowrap;justify-content:space-between}
#ribbon .gsp input,#ribbon .gsp select{width:74px;height:21px;padding:1px 5px;font-size:12px;background:var(--panel);color:inherit;border:1px solid var(--line);border-radius:4px}
#ribbon .gsp select{width:112px}
#ribbon .gsp input.ana{width:74px;border-color:var(--acc,#1f6fff);font-weight:600}
#ribbon .gsp button{height:22px;padding:0 9px;font-size:12px;white-space:nowrap}
#ribbon .gsp .gsn{font-size:11.5px;color:var(--mut);white-space:nowrap}
#ribbon .gsp .rt{font-size:10.5px;color:var(--mut);text-align:center;padding:2px 0 0;white-space:nowrap}
#ribbon .rtabs button.baglam{color:#ffb454}
`;
  document.head.appendChild(st);
  const ALAN = [['gL', 'Çıkma (cm)'], ['gHf', 'Kolon yüzünde yükseklik (cm)'], ['gHu', 'Uçta yükseklik (cm)'], ['gW', 'Genişlik (cm, 0 = kolon yüzü)']];
  const VARS = { gL: 0.4, gHf: 0.6, gHu: 0.3, gW: 0 };
  const govde = el => {
    el.innerHTML = `<div class="gsp"><div class="gsb">
<label title="Guse üst yüzü ile kolona oturan kirişin altı arasındaki düşey açıklık. Yazıp Enter: seçili bütün guselere uygulanır.">Kiriş altına mesafe (cm) <input class="ana" data-g="ms" inputmode="decimal"></label>
<span><button data-g="yukari" title="Seçili guseleri 5 cm yukarı kaydır">▲ 5 cm yukarı</button> <button data-g="asagi" title="Seçili guseleri 5 cm aşağı kaydır">▼ 5 cm aşağı</button></span>
<span class="gsn" data-g="bilgi"></span></div><div class="rt">Guse yeri</div></div>
<div class="gsp"><div class="gsb">${ALAN.map(([k, t]) => `<label>${t} <input data-g="${k}" inputmode="decimal"></label>`).join('')}
<label>Yön (kolon yüzü) <select data-g="gYon"><option value="" hidden>farklı</option>${YON.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label></div><div class="rt">Guse ölçüleri</div></div>
<div class="gsp"><div class="gsb"><span class="gsn" data-g="adet"></span><button data-g="hepsi" title="Çizimdeki bütün guseli kolonları seç (GUSESEC)">Tüm guseli kolonları seç</button>
<span class="gsn">3B'de: guse ucundaki oku çekin</span></div><div class="rt">Seçim</div></div>`;
    const q = k => el.querySelector(`[data-g="${k}"]`);
    const gir = (k, fn) => { const i = q(k); i.onchange = () => { const v = oku(i.value); if (v == null) { doldur(el); return; } fn(v); doldur(el); }; i.onkeydown = ev => { ev.stopPropagation(); if (ev.key === 'Enter') i.blur(); else if (ev.key === 'Escape') { doldur(el); i.blur(); } }; };
    gir('ms', mesafeYaz);
    for (const [k, t] of ALAN) gir(k, v => olcuYaz(k, v, t.replace(/ \(cm.*$/, '')));
    q('gYon').onchange = () => { const v = q('gYon').value, K = secili(); if (v && K.length) uygula(K, e => { e.gYon = v; }, `${K.length} guse: yön ${(YON.find(y => y[0] === v) || [])[1] || v}.`); doldur(el); };
    q('yukari').onclick = () => kaydirHepsi(0.05); q('asagi').onclick = () => kaydirHepsi(-0.05);
    q('hepsi').onclick = () => C.runTool ? C.runTool('GUSESEC') : hepsiniSec();
    doldur(el);
  };
  const doldur = el => {
    el = el || document.querySelector('#ribbon .rbody'); if (!el || !el.querySelector('[data-g="ms"]')) return;
    const K = secili(), E = C.doc.ents, q = k => el.querySelector(`[data-g="${k}"]`);
    const yaz = (k, o, f) => { const i = q(k); if (document.activeElement === i) return; i.value = o.farkli || o.deger == null ? '' : f(o.deger); i.placeholder = o.farkli ? 'farklı' : ''; };
    if (!K.length) { for (const k of ['ms', 'gL', 'gHf', 'gHu', 'gW']) yaz(k, { deger: null }, String); q('bilgi').textContent = ''; q('adet').textContent = 'Guseli kolon seçili değil'; return; }
    yaz('ms', Y.ortak(K, e => Y.mesafe(e, E)), v => sayi(v * 100));
    for (const [k] of ALAN) yaz(k, Y.ortak(K, e => (e[k] == null || e[k] === '' ? VARS[k] : +e[k])), v => sayi(v * 100));
    const yo = Y.ortak(K, e => String(e.gYon || 'R')); q('gYon').value = yo.farkli ? '' : yo.deger;
    const ka = Y.ortak(K, e => Y.kirisAlt(e, E).z), us = Y.ortak(K, e => Y.ustKot(e)), yok = K.filter(e => Y.kirisAlt(e, E).kaynak === 'kolon').length;
    q('bilgi').textContent = `Kiriş altı ${ka.farkli ? 'farklı' : kot(ka.deger)} · guse üstü ${us.farkli ? 'farklı' : kot(us.deger)}` + (yok ? ` · ${yok} kolonda kiriş yok (kolon üstünden)` : '');
    q('adet').textContent = `${K.length} guseli kolon seçili`;
  };

  /* ---------- sekmeyi seçime göre aç / kapat ---------- */
  const TAB = [AD, [], govde]; let onceki = null;
  const esle = () => {
    const R = C.ribbon; if (!R || !Array.isArray(R.tabs)) return; const K = secili(), i = R.tabs.indexOf(TAB);
    if (K.length && i < 0) { onceki = R.current ? R.current() : null; R.tabs.push(TAB); R.select(AD); isaretle(); }
    else if (!K.length && i >= 0) { const cur = R.current ? R.current() : null; R.tabs.splice(i, 1); R.select(cur === AD ? (R.tabs.some(t => t[0] === onceki) ? onceki : R.tabs[0][0]) : cur); }
    else if (K.length) { doldur(); isaretle(); }
  };
  const isaretle = () => { document.querySelectorAll('#ribbon .rtabs [data-t]').forEach(b => { if (b.textContent === AD) b.classList.add('baglam'); }); };
  C.on('selection', esle); C.on('change', esle); C.on('cmdend', () => setTimeout(esle, 0)); C.on('cmdstart', () => setTimeout(esle, 0));

  /* ---------- GUSESEC: bütün guseli kolonları seç ---------- */
  const hepsiniSec = () => { const K = tumu(); C.sel = K; C.selFace = null; C.emit('selection'); C.log(K.length ? `${K.length} guseli kolon seçildi — şeritteki Guse sekmesinden kiriş altı mesafesini yazın ya da 3B'de guse ucundaki oku çekin.` : 'Çizimde guseli kolon yok.'); };
  if (C.addCommand) C.addCommand(['GUSESEC', 'GUSESEÇ'], 'Çizimdeki bütün guseli kolonları seçer; şeritte Guse sekmesi açılır (kiriş altına mesafe, guse ölçüleri).', async () => { setTimeout(hepsiniSec, 0); });
  { const R = C.ribbon, tab = R && Array.isArray(R.tabs) && R.tabs.find(t => t[0] === 'İnşaat'), pn = tab && tab[1].find(p => p[1].some(b => b && b.cmd === 'KOLON'));
    if (pn && !pn[1].some(b => b.cmd === 'GUSESEC')) { pn[1].push({ cmd: 'GUSESEC', t: 'Guseli kolonları seç', i: 'sel' }); R.render(); } }

  /* ---------- 3B'de ok: guse ucunda yukarı / aşağı çekme (çoklu seçimde hepsi birlikte) ---------- */
  const tutamak = (e, es) => {
    const G = C.kolonGuse ? C.kolonGuse(e) : []; if (!G.length) return null;
    const g = G[0], l = g.loc(g.f0 + g.gL, 0), c = M.p3(e.p), cs = Math.cos((+e.rot || 0) * RAD), sn = Math.sin((+e.rot || 0) * RAD);
    const kopya = (es || []).filter(x => x !== e).map(x => ({ e: x, o: { z0: x.z0, h: x.h, gRef: x.gRef, gZ: x.gZ, gHf: x.gHf } }));
    return { p: [c[0] + l[0] * cs - l[1] * sn, c[1] + l[0] * sn + l[1] * cs, g.zt], ax: [0, 0, 1], lab: kopya.length ? `Guse (yukarı / aşağı) — ${kopya.length + 1} guse birlikte` : 'Guse (yukarı / aşağı)', mname: 'guse üst kotu', meas: x => Y.ustKot(x),
      apply: (x, t) => { x.gZ = Y.kaydir(x, t); for (const k of kopya) { k.e.gZ = Y.kaydir(k.o, t); temizle(k.e); } } };
  };
  if (C.handlesOf) { const h0 = C.handlesOf; C.handlesOf = e => { const H = h0(e); if (Y.guseli(e)) { const h = tutamak(e); if (h) H.push(h); } return H; }; }
  C.handlesGrup = sel => { const K = sel.filter(e => Y.guseli(e) && acik(e) && C.doc.ents.includes(e)); if (!K.length) return null; const L = []; K.forEach(e => { const h = tutamak(e, K); if (h) L.push({ e, h, i: L.length }); }); return L; };

  if (window.DIL && window.DIL.ekle) window.DIL.ekle('en', 'English', [['Guse yeri', 'Haunch position'], ['Guse ölçüleri', 'Haunch dimensions'],
    ['Kiriş altına mesafe (cm)', 'Distance below beam soffit (cm)'], ['▲ 5 cm yukarı', '▲ 5 cm up'], ['▼ 5 cm aşağı', '▼ 5 cm down'], ['Çıkma (cm)', 'Projection (cm)'],
    ['Kolon yüzünde yükseklik (cm)', 'Depth at column face (cm)'], ['Uçta yükseklik (cm)', 'Depth at tip (cm)'], ['Genişlik (cm, 0 = kolon yüzü)', 'Width (cm, 0 = column face)'], ['Yön (kolon yüzü)', 'Side (column face)'],
    ['Tüm guseli kolonları seç', 'Select all haunched columns'], ['Guseli kolonları seç', 'Select haunched columns'], ["3B'de: guse ucundaki oku çekin", 'In 3D: drag the arrow at the haunch tip'],
    ['Guseli kolon seçili değil', 'No haunched column selected'], ['# guseli kolon seçili', '# haunched columns selected'], ['Guse (yukarı / aşağı)', 'Haunch (up / down)']]);
})(window.C);

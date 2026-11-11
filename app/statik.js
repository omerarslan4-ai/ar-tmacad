/* ArıtmaCAD — STATİK modülü bağlantısı
   STATIK    : su tutucu yapı statik hesap penceresini açar (app/hesap/statik.html)
   STATIKCIZ : hesap penceresinden gönderilen kalıp + donatı paftasını çizime ekler
   Şerit: Hesap sekmesine "Yapı" paneli eklenir. Diğer modüllere dokunmaz. */
(function (C) {
  'use strict';
  const KEY = 'aritmacad.statik.cizim';
  let win = null;

  C.addCommand(['STATIK', 'STATIKHESAP', 'BETONARME'], 'Su tutucu betonarme yapı statik hesabı (perde, radye, döşeme; TS 500 / TBDY 2018) — ayrı pencerede açılır', async () => {
    win = window.open('app/hesap/statik.html', 'hesap_STATIK', 'width=1440,height=940');
    if (!win) C.warn('Açılır pencere engellendi.'); else C.log('Statik hesap açıldı. Hesaptan sonra "Çizime aktar" ile pafta buraya eklenir.');
  }, { noUndo: true });

  /* Statik paftası: çizimler model alanında "STATIK_…" görünüş grubu olarak durur (Tasarım planında gizli),
     alt sekmelerdeki "Statik" grubunda kendi paftasında (yalnız bu grubu gösteren ölçekli pencere) görünür.
     Aynı yapı yeniden aktarılırsa eski çizim silinip pafta güncellenir. */
  const isSta = e => typeof e.gv === 'string' && e.gv.indexOf('STATIK_') === 0;
  C.addCommand(['STATIKCIZ', 'STATIKPAFTA'], 'Statik hesaptan gelen kalıp ve donatı çizimlerini "Statik" pafta grubuna yerleştirir (Tasarım planında görünmez)', async () => {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { }
    if (!d || !Array.isArray(d.spec) || !d.spec.length) { C.warn('Aktarılacak statik pafta yok. Önce STATIK penceresinde Hesapla → Çizime aktar.'); return; }
    const ad = (d.ad || 'YAPI').trim(), sc = +d.olcek || 50, k = 1000 / sc;
    const lays = C.doc.layouts = C.doc.layouts || [];
    let L = lays.find(x => x.statik === ad);
    // önceki aktarım varsa sil
    if (L && L.statikGv) C.doc.ents = C.doc.ents.filter(e => e.gv !== L.statikGv);
    // model alanında yer: modelin ve diğer statik çizimlerin sağına (gizli olsa da çakışmasın)
    let bx = 0, by = 0;
    { const bb = C.extents(C.doc.ents.filter(e => e.type !== 'sheet')); if (bb && isFinite(bb[2])) { bx = bb[2] + 20; by = bb[1]; } }
    let sx0 = Infinity, sy0 = Infinity, sx1 = -Infinity, sy1 = -Infinity;
    const acc = q => { if (q[0] < sx0) sx0 = q[0]; if (q[1] < sy0) sy0 = q[1]; if (q[0] > sx1) sx1 = q[0]; if (q[1] > sy1) sy1 = q[1]; };
    for (const e of d.spec) [e.a, e.b, e.c, e.p, ...(e.pts || [])].forEach(q => q && acc(q));
    const o = [bx - sx0, by - sy0], P = q => [q[0] + o[0], q[1] + o[1], 0];
    const KAT = d.katman || {};
    for (const [n, kk] of Object.entries(KAT)) { const Ly = C.ensureLayer(n, kk.c, kk.lt, kk.lw); Object.assign(Ly, { color: kk.c, lt: kk.lt, lw: kk.lw, on: true, lock: false }); delete Ly.fade; delete Ly.frz; }
    const gv = 'STATIK_' + Date.now().toString(36);
    let n = 0;
    // renk / çizgi tipi / kalınlık açıkça yazılır; gv: 2B görünüş grubu (3B modele, seviye süzgecine ve Tasarım planına girmez)
    const add = (type, props) => { const kk = KAT[props.layer] || {}; const e = C.add(C.newEnt(type, Object.assign({ color: kk.c != null ? kk.c : 7, lt: kk.lt || 'CONTINUOUS', lw: kk.lw != null ? kk.lw : 25, gv }, props))); if (e) { delete e.sp; delete e.sv2; e.gv = gv; } n++; };
    for (const e of d.spec) {
      try {
        if (e.k === 'L') add('line', { a: P(e.a), b: P(e.b), layer: e.ly, ...(e.lt ? { lt: e.lt } : {}) });
        else if (e.k === 'P') add('pline', { pts: e.pts.map(P), closed: !!e.cl, layer: e.ly });
        else if (e.k === 'C') add('circle', { c: P(e.c), r: e.r, layer: e.ly });
        else if (e.k === 'T') add('text', { p: P(e.p), h: e.h, s: e.s, rot: e.rot || 0, al: e.al || 'L', layer: e.ly, ann: false });
        else if (e.k === 'D') add('dim', { k: e.dir === 'v' ? 'v' : 'h', a: P(e.a), b: P(e.b), p: P(e.p), txt: e.txt, layer: e.ly });
        else if (e.k === 'K') add('kot', { p: P(e.p), v: e.v, txt: e.txt || '', ters: !!e.ters, layer: e.ly });
        else if (e.k === 'LD') add('leader', { pts: e.pts.map(P), asz: e.asz || 0.1, layer: e.ly });
      } catch (err) { console.error('STATIKCIZ', e, err); }
    }
    // pafta: Statik grubunda, çizimin sığdığı en küçük A boyutu
    const W = (sx1 - sx0) * k + 16, H = (sy1 - sy0) * k + 16;
    const sizes = ['A3', 'A2', 'A1', 'A0'];
    const fits = s => { const t = { size: s, orient: 'L' }, fr = C.layoutFrame(t); return W <= fr.x1 - fr.x0 - 10 && H <= fr.y1 - fr.tbTop - 10; };
    const size = sizes.find(fits) || 'A0';
    const gPrev = C.grpCur;
    if (!L) { C.grpCur = 'Statik'; L = C.newLayout('STATİK — ' + ad, size, 'L'); L.grp = 'Statik'; L.statik = ad; }
    C.grpCur = gPrev;
    L.size = size; L.orient = 'L'; L.statikGv = gv;
    L.f = Object.assign(L.f || {}, { proje: d.tesis || (L.f && L.f.proje) || '', baslik: ad + ' — KALIP VE DONATI PLANI', cizen: d.hazirlayan || (L.f && L.f.cizen) || '' });
    if (d.no) L.f.no = d.no;
    { const s = C.doc.set; s.grups = s.grups || []; if (!s.grups.includes('Statik')) s.grups.push('Statik'); }
    const fr = C.layoutFrame(L), aw = fr.x1 - fr.x0 - 10, ah = fr.y1 - fr.tbTop - 10;
    const vw = Math.min(W, aw), vh = Math.min(H, ah);
    L.vps = [{ x: fr.x0 + 5 + (aw - vw) / 2, y: fr.tbTop + 5 + (ah - vh) / 2, w: vw, h: vh, cx: (sx0 + sx1) / 2 + o[0], cy: (sy0 + sy1) / 2 + o[1], scale: sc, gvOnly: gv, frame: { on: false }, lock: true }];
    C.changed();
    // paftayı aç
    const i = lays.indexOf(L);
    C.layoutIdx = i; C.grpCur = 'Statik'; C.setView('layout'); C.emit('layouts');
    setTimeout(() => { try { C.views.lay.zoomExtents(); } catch (er) { } }, 50);
    C.log(`Statik pafta hazır: "${L.name}" (${size}, 1/${sc}) — ${n} nesne. Çizimler Tasarım planında gizli; görmek için STATIKGOSTER.`);
  }, { noUndo: false });

  /* Tasarım (model) planında statik çizimleri gizle — paftada ve pencere içinden düzenlerken görünür */
  if (C.state.statikModel == null) C.state.statikModel = false;
  { const P2 = C.View2D && C.View2D.prototype; if (P2) {
      const wf = (self, fn) => { if (self.isLayout || C.vpEdit || C.state.statikModel) return fn(); const all = C.doc.ents; if (!all.some(isSta)) return fn(); C.doc.ents = all.filter(e => !isSta(e)); try { return fn(); } finally { C.doc.ents = all; } };
      for (const k of ['draw', 'pick', 'windowSel', 'snap', 'zoomExtents']) { const f0 = P2[k]; if (f0) P2[k] = function () { return wf(this, () => f0.apply(this, arguments)); }; }
    } }
  C.addCommand(['STATIKGOSTER', 'STATIKGIZLE'], 'Statik pafta çizimlerini Tasarım (model) planında göster / gizle', async () => {
    C.state.statikModel = !C.state.statikModel; C.changed(); C.log('Statik çizimler Tasarım planında ' + (C.state.statikModel ? 'gösteriliyor.' : 'gizlendi (yalnız Statik paftasında).'));
  }, { noUndo: true });

  /* önceki sürümde 3B sekmesindeyken aktarılan paftalar "3B model" sayılıp planda gizleniyordu — onarır */
  const onar = () => { let n = 0; const gv = 'ESKI_STATIK'; for (const e of C.doc.ents) if (/^STA_/.test(e.layer || '') && (e.sp === '3d' || !e.gv)) { delete e.sp; if (!e.gv) e.gv = gv; delete e._c; n++; } if (n) C.changed(); return n; };
  C.addCommand(['STATIKONAR', 'STATIKDUZELT'], 'Planda / paftada görünmeyen statik pafta çizgilerini (STA_ katmanları) görünür yapar', async () => {
    const n = onar(); C.log(n ? `${n} statik pafta nesnesi planda görünür yapıldı.` : 'Onarılacak statik pafta nesnesi yok.');
  });
  C.on && C.on('doc', () => { try { if (C.doc && C.doc.ents.some(e => e.sp === '3d' && /^STA_/.test(e.layer || ''))) { const n = onar(); if (n) C.log(`Statik pafta: ${n} nesne planda görünür yapıldı.`); } } catch (er) { } });

  /* hesap penceresi "Çizime aktar" deyince (opener erişimi yoksa) depolama olayı ile tetiklenir */
  window.addEventListener('storage', ev => {
    if (ev.key !== KEY || !ev.newValue) return;
    if (C.cmd.running) { C.warn('Statik pafta hazır: komut bitince STATIKCIZ yazın.'); return; }
    try { window.focus(); } catch (e) { }
    C.cmd.run('STATIKCIZ');
  });

  /* şerit: Hesap sekmesine Yapı paneli */
  try {
    if (C.ribbon && Array.isArray(C.ribbon.tabs)) {
      const tab = C.ribbon.tabs.find(t => t[0] === 'Hesap');
      if (tab && !tab[1].some(p => p[0] === 'Yapı')) {
        tab[1].push(['Yapı', [{ cmd: 'STATIK', t: 'Statik', i: 'found', big: true }, { cmd: 'STATIKCIZ', t: 'Paftayı ekle', i: 'sheet' }]]);
        C.ribbon.render();
      }
    }
  } catch (e) { console.error('statik şerit', e); }
})(window.C);

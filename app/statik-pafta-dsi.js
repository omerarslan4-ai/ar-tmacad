/* ArıtmaCAD — STATIKCIZ eki: DSİ stilinde çok paftalı statik çizim
   Statik hesap penceresi "Çizime aktar" ile paftalar listesi gönderirse (payload.paftalar), her pafta Statik grubunda
   kendi paftası olur: kağıt 594 mm yüksek, genişlik içeriğe göre (ÖZEL), çerçeve + not sütunu + DSİ anteti çizimin içinde,
   tek ölçekli pencere. Aynı yapı yeniden aktarılırsa eski paftalar güncellenir. Eski tek paftalı aktarım aynen çalışır. */
(function (C) {
  'use strict';
  const KEY = 'aritmacad.statik.cizim', def = C.cmds.STATIKCIZ; if (!def || def._dsi) return;
  const f0 = def.fn; def._dsi = true;
  def.fn = async function (I, Cx) {
    let d = null; try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { }
    if (!d || !Array.isArray(d.paftalar) || !d.paftalar.length) return f0.call(this, I, Cx);
    const ad = (d.ad || 'YAPI').trim(), KAT = d.katman || {}, lays = C.doc.layouts = C.doc.layouts || [];
    for (const [n, kk] of Object.entries(KAT)) { const Ly = C.ensureLayer(n, kk.c, kk.lt, kk.lw); Object.assign(Ly, { color: kk.c, lt: kk.lt, lw: kk.lw, on: true, lock: false }); delete Ly.fade; delete Ly.frz; }
    // önceki DSİ paftaları: çizimleri sil, paftaları sırayla yeniden kullan
    const eski = lays.filter(L => L.statikDsi === ad).sort((a, b) => a.statikIdx - b.statikIdx);
    for (const L of eski) if (L.statikGv) C.doc.ents = C.doc.ents.filter(e => e.gv !== L.statikGv);
    { const s = C.doc.set; s.grups = s.grups || []; if (!s.grups.includes('Statik')) s.grups.push('Statik'); }
    let bx = 0, by = 0; { const bb = C.extents(C.doc.ents.filter(e => e.type !== 'sheet')); if (bb && isFinite(bb[2])) { bx = bb[2] + 30; by = bb[1]; } }
    let n = 0, ilk = null; const yeni = [];
    d.paftalar.forEach((pf, i) => {
      const sc = +pf.olcek || +d.olcek || 50, k = 1000 / sc, gv = 'STATIK_' + Date.now().toString(36) + '_' + i;
      let sx0 = Infinity, sy0 = Infinity, sx1 = -Infinity, sy1 = -Infinity; const acc = q => { if (!q) return; sx0 = Math.min(sx0, q[0]); sy0 = Math.min(sy0, q[1]); sx1 = Math.max(sx1, q[0]); sy1 = Math.max(sy1, q[1]); };
      for (const e of pf.spec) [e.a, e.b, e.c, e.p, ...(e.pts || [])].forEach(acc);
      if (!isFinite(sx0)) return;
      const o = pf.serbest ? [bx - sx0, by - sy0] : [bx, by], Pp = q => [q[0] + o[0], q[1] + o[1], 0];
      const add = (type, props) => { const kk = KAT[props.layer] || {}; const e = C.add(C.newEnt(type, Object.assign({ color: kk.c != null ? kk.c : 7, lt: kk.lt || 'CONTINUOUS', lw: kk.lw != null ? kk.lw : 25, gv }, props))); if (e) { delete e.sp; delete e.sv2; n++; } return e; };
      const chg0 = C.changed; C.changed = () => { }; // toplu ekleme: her öğede C.changed (tüm varlıkları dolaşır) çağrılmasın — büyük paftalarda dakikalar sürüyordu
      try { for (const e of pf.spec) {
        try {
          if (e.k === 'L') add('line', { a: Pp(e.a), b: Pp(e.b), layer: e.ly, ...(e.lt ? { lt: e.lt } : {}) });
          else if (e.k === 'P') add('pline', { pts: e.pts.map(Pp), closed: !!e.cl, layer: e.ly });
          else if (e.k === 'C') add('circle', { c: Pp(e.c), r: e.r, layer: e.ly });
          else if (e.k === 'T') add('text', { p: Pp(e.p), h: e.h, s: e.s, rot: e.rot || 0, al: e.al || 'L', layer: e.ly, ann: false });
          else if (e.k === 'D') add('dim', { k: e.dir === 'v' ? 'v' : 'h', a: Pp(e.a), b: Pp(e.b), p: Pp(e.p), txt: e.txt, layer: e.ly });
          else if (e.k === 'K') add('kot', { p: Pp(e.p), v: e.v, txt: e.txt || '', ters: !!e.ters, layer: e.ly });
        else if (e.k === 'LD') add('leader', { pts: e.pts.map(Pp), asz: e.asz || 0.1, layer: e.ly });
        } catch (err) { console.error('STATIKCIZ (DSİ)', e, err); }
      } } finally { C.changed = chg0; }
      const gPrev = C.grpCur; let L = eski[i];
      if (!L) { C.grpCur = 'Statik'; L = C.newLayout('STATİK — ' + ad + ' — ' + (i + 1), 'A1', 'P'); C.grpCur = gPrev; }
      L.grp = 'Statik'; L.statikDsi = ad; L.statikIdx = i; L.statikGv = gv; L.name = `STATİK — ${ad} — ${pf.ad}`; if (window.DIL) L.name = DIL.t(L.name);
      if (pf.serbest) { // kiriş-kolon çizimleri: eski düzen (antetli A boyutu)
        const W = (sx1 - sx0) * k + 16, H = (sy1 - sy0) * k + 16, size = ['A3', 'A2', 'A1', 'A0'].find(s => { const fr = C.layoutFrame({ size: s, orient: 'L' }); return W <= fr.x1 - fr.x0 - 10 && H <= fr.y1 - fr.tbTop - 10; }) || 'A0';
        Object.assign(L, { size, orient: 'L', noTitle: false }); delete L.margin; L.f = Object.assign(L.f || {}, { proje: d.tesis || '', baslik: ad + ' — ' + pf.ad, cizen: d.hazirlayan || '' });
        const fr = C.layoutFrame(L), aw = fr.x1 - fr.x0 - 10, ah = fr.y1 - fr.tbTop - 10, vw = Math.min(W, aw), vh = Math.min(H, ah);
        L.vps = [{ x: fr.x0 + 5 + (aw - vw) / 2, y: fr.tbTop + 5 + (ah - vh) / 2, w: vw, h: vh, cx: (sx0 + sx1) / 2 + o[0], cy: (sy0 + sy1) / 2 + o[1], scale: sc, gvOnly: gv, frame: { on: false }, lock: true }];
        by += (sy1 - sy0) + 20;
      } else { // DSİ paftası: kağıdın tamamı model içinde (çerçeve, not sütunu, antet dahil)
        Object.assign(L, { size: 'OZEL', pw: pf.pw, ph: pf.ph, orient: 'L', noTitle: true, margin: { l: 0, r: 0, t: 0, b: 0 } });
        L.f = Object.assign(L.f || {}, { proje: d.tesis || '', baslik: ad + ' — ' + pf.ad, no: pf.resimNo || '' });
        const w = pf.pw / k, h = pf.ph / k;
        L.vps = [{ x: 0, y: 0, w: pf.pw, h: pf.ph, cx: o[0] + w / 2, cy: o[1] + h / 2, scale: sc, gvOnly: gv, frame: { on: false }, lock: true }];
        bx += w + 20;
      }
      yeni.push(L); if (!ilk) ilk = L;
    });
    for (const L of eski.slice(d.paftalar.length)) { const j = lays.indexOf(L); if (j >= 0) lays.splice(j, 1); }
    C.changed();
    if (ilk) { C.layoutIdx = lays.indexOf(ilk); C.grpCur = 'Statik'; C.setView('layout'); C.emit('layouts'); setTimeout(() => { try { C.views.lay.zoomExtents(); } catch (er) { } }, 50); }
    C.log(`Statik paftalar hazır (${yeni.length}): ${yeni.map(L => L.name.split(' — ').pop()).join(' · ')} — ${n} nesne. Çizimler Tasarım planında gizli; görmek için STATIKGOSTER.`);
  };
})(window.C);

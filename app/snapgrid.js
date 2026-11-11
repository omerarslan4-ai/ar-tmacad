/* ArıtmaCAD — SNAP ve GRID (AutoCAD gibi): yakalama aralığı X/Y, kutupsal yakalama, döndürülmüş ızgara, taban noktası,
   ızgara aralığı / ana çizgi sıklığı / yakalamayı izle; Çizim ayarları penceresi (DSETTINGS). F9 = yakalama, F7 = ızgara */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, RAD = Math.PI / 180;
  const DEF = { x: 0, y: 0, type: 'G', pd: 0, ang: 0, base: [0, 0], gx: 0, gy: 0, gmaj: 5, gfollow: true };
  const S = () => { const s = C.doc.set; if (!s.snapS) { let d = {}; try { d = JSON.parse(localStorage.getItem('aritmacad.snapS') || '{}'); } catch (e) { } s.snapS = Object.assign({}, DEF, d); } return s.snapS; };
  const persist = () => { try { localStorage.setItem('aritmacad.snapS', JSON.stringify(S())); } catch (e) { } C.emit('state'); if (C.views && C.views.plan) C.views.plan.dirty = true; };
  const fmt = v => String(+(+v).toFixed(4)).replace('.', ',');
  C.snapSettings = S;

  /* ızgara koordinatları (taban + açı) */
  const toG = (p, s) => { const a = -(s.ang || 0) * RAD, dx = p[0] - s.base[0], dy = p[1] - s.base[1]; return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)]; };
  const fromG = (q, s) => { const a = (s.ang || 0) * RAD; return [s.base[0] + q[0] * Math.cos(a) - q[1] * Math.sin(a), s.base[1] + q[0] * Math.sin(a) + q[1] * Math.cos(a), 0]; };
  /* yakalama noktası: null = ayarlı aralık yok (dinamik ızgara kullan) */
  C.snapPoint = (raw, view) => {
    const s = S();
    if (s.type === 'P' && E.base && s.pd > 0) { // kutupsal yakalama: tabandan uzaklık pd katları
      const b = E.base, d = M.dist2(b, raw); if (d < 1e-12) return null; const n = Math.max(1, Math.round(d / s.pd)) * s.pd;
      let a = Math.atan2(raw[1] - b[1], raw[0] - b[0]); if (C.state.ortho) { const st = Math.PI / 2, a0 = (s.ang || 0) * RAD; a = a0 + Math.round((a - a0) / st) * st; }
      return [b[0] + Math.cos(a) * n, b[1] + Math.sin(a) * n, 0];
    }
    const x = s.x > 0 ? s.x : (view ? view.gridStep() : 1), y = s.y > 0 ? s.y : x;
    const q = toG(raw, s); return fromG([Math.round(q[0] / x) * x, Math.round(q[1] / y) * y], s);
  };
  /* yakalamada ızgara adımı */
  { const P = C.View2D.prototype, sn0 = P.snap;
    P.snap = function (sx, sy) {
      const r = sn0.call(this, sx, sy);
      if (r && r.k === 'grid' && !this.isMap) { const p = C.snapPoint(this.s2w(sx, sy), this); if (p) r.p = p; }
      return r;
    };
    /* ızgara çizimi: ayarlı aralık / döndürme / ana çizgiler */
    const dg0 = P.drawGrid;
    P.drawGrid = function () {
      const s = S(); let gx = s.gfollow ? (s.x || 0) : (s.gx || 0), gy = s.gfollow ? (s.y || s.x || 0) : (s.gy || s.gx || 0);
      if (!(gx > 0) && !(s.ang)) return dg0.call(this);
      if (!(gx > 0)) { gx = gy = this.gridStep(); } if (!(gy > 0)) gy = gx;
      const ctx = this.ctx, vb = this.viewBox(), cs = [[vb[0], vb[1]], [vb[2], vb[1]], [vb[2], vb[3]], [vb[0], vb[3]]].map(p => toG(p, s));
      const gb = [Math.min(...cs.map(q => q[0])), Math.min(...cs.map(q => q[1])), Math.max(...cs.map(q => q[0])), Math.max(...cs.map(q => q[1]))];
      let fx = 1, fy = 1; while ((gb[2] - gb[0]) / (gx * fx) > 300) fx *= 2; while ((gb[3] - gb[1]) / (gy * fy) > 300) fy *= 2; // çok sık: seyrelt
      const maj = Math.max(1, s.gmaj || 5);
      ctx.lineWidth = 1;
      const line = (a, b) => { const p = this.w2s(fromG(a, s)), q = this.w2s(fromG(b, s)); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
      for (const major of [false, true]) {
        ctx.strokeStyle = this.dark ? (major ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.045)') : (major ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)'); ctx.beginPath();
        const sx = gx * fx * (major ? maj : 1), sy = gy * fy * (major ? maj : 1);
        if ((gb[2] - gb[0]) / sx < 600) for (let i = Math.ceil(gb[0] / sx); i * sx <= gb[2]; i++) line([i * sx, gb[1]], [i * sx, gb[3]]);
        if ((gb[3] - gb[1]) / sy < 600) for (let j = Math.ceil(gb[1] / sy); j * sy <= gb[3]; j++) line([gb[0], j * sy], [gb[2], j * sy]);
        ctx.stroke();
      }
      const o = this.w2s([0, 0]); ctx.strokeStyle = 'rgba(255,80,80,0.5)'; ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(o[0] + 30, o[1]); ctx.stroke();
      ctx.strokeStyle = 'rgba(80,255,120,0.5)'; ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(o[0], o[1] - 30); ctx.stroke();
    };
  }

  /* ---------- komutlar ---------- */
  const desc = () => { const s = S(); return s.type === 'P' ? `kutupsal ${fmt(s.pd)}` : s.x > 0 ? `${fmt(s.x)}${s.y > 0 && s.y !== s.x ? ' × ' + fmt(s.y) : ''}${s.ang ? `, açı ${s.ang}°` : ''}` : 'otomatik (yakınlaştırmaya göre)'; };
  C.addCommand(['SNAP', 'SN', 'IZGARAYAKALA', 'YAKALAMAARALIGI'], 'Izgara yakalama (AutoCAD SNAP): SNAP 0.5 = aralık 0,5 ve aç · AC / KAPAT · A en-boy (X ve Y ayrı) · T tür (Izgara / Kutupsal) · D döndür (açı ve taban noktası) · O otomatik aralık. F9 aç/kapa.', async (I) => {
    const s = S();
    const r = await E.ask('pt', `Yakalama aralığı ya da [AÇ/KAPAT/En-boy(A)/Tür(T)/Döndür(D)/Otomatik(O)] <${desc()}>`, { num: true, kw: [['AC', 'Aç', 'ON'], ['KAPAT', 'Kapat', 'OFF'], ['A', 'En-boy'], ['T', 'Tür'], ['D', 'Döndür'], ['O', 'Otomatik']] });
    if (r == null || r === '') { C.state.gridSnap = !C.state.gridSnap; }
    else if (typeof r === 'number') { if (!(r > 0)) { C.warn('Aralık sıfırdan büyük olmalı'); return; } s.x = s.y = r; if (s.type === 'P') s.pd = r; C.state.gridSnap = true; }
    else if (r === 'AC') C.state.gridSnap = true;
    else if (r === 'KAPAT') C.state.gridSnap = false;
    else if (r === 'O') { s.x = s.y = 0; C.state.gridSnap = true; }
    else if (r === 'A') { const x = await I.num('Yatay (X) aralık', s.x || 1); if (!(x > 0)) return; const y = await I.num('Düşey (Y) aralık', s.y || x); if (!(y > 0)) return; s.x = x; s.y = y; C.state.gridSnap = true; }
    else if (r === 'T') { const t = await I.kw('Yakalama türü', [['G', 'Izgara (dikdörtgen)'], ['P', 'Kutupsal (son noktadan uzaklık)']], s.type); if (!t) return; s.type = t; if (t === 'P') { const d = await I.num('Kutupsal mesafe', s.pd || s.x || 1); if (d > 0) s.pd = d; } C.state.gridSnap = true; }
    else if (r === 'D') { const b = await I.pt('Taban noktası', { def: null }); if (b && typeof b !== 'string') s.base = [b[0], b[1]]; const a = await I.num('Döndürme açısı (°)', s.ang || 0); if (a != null) s.ang = a; C.state.gridSnap = true; }
    else if (Array.isArray(r)) { const d = M.dist2(E.base || [0, 0], r); C.warn('Aralık için sayı yazın (ör. SNAP 0.5)'); return; }
    persist(); C.log(`Izgara yakalama ${C.state.gridSnap ? 'AÇIK' : 'KAPALI'} — ${desc()}`);
  }, { noUndo: true });
  C.addCommand(['GRID', 'IZGARA'], 'Izgara (AutoCAD GRID): GRID 1 = aralık 1 ve göster · AC / KAPAT · S yakalamayı izle · A en-boy · M ana çizgi sıklığı · O otomatik. F7 aç/kapa.', async (I) => {
    const s = S(), v = C.views && C.views.plan;
    const r = await E.ask('pt', `Izgara aralığı ya da [AÇ/KAPAT/Yakalamayı izle(S)/En-boy(A)/Ana çizgi(M)/Otomatik(O)] <${s.gfollow ? 'yakalamayı izliyor' : s.gx > 0 ? fmt(s.gx) : 'otomatik'}>`, { num: true, kw: [['AC', 'Aç', 'ON'], ['KAPAT', 'Kapat', 'OFF'], ['S', 'Yakalamayı izle'], ['A', 'En-boy'], ['M', 'Ana çizgi'], ['O', 'Otomatik']] });
    if (r == null || r === '') { if (v) v.grid = !v.grid; }
    else if (typeof r === 'number') { if (r > 0) { s.gx = s.gy = r; s.gfollow = false; } if (v) v.grid = true; }
    else if (r === 'AC') { if (v) v.grid = true; } else if (r === 'KAPAT') { if (v) v.grid = false; }
    else if (r === 'S') { s.gfollow = true; if (v) v.grid = true; }
    else if (r === 'O') { s.gx = s.gy = 0; s.gfollow = false; }
    else if (r === 'A') { const x = await I.num('Yatay ızgara aralığı', s.gx || 1); const y = await I.num('Düşey ızgara aralığı', s.gy || x); if (x > 0 && y > 0) { s.gx = x; s.gy = y; s.gfollow = false; } }
    else if (r === 'M') { const m = await I.num('Kaç ızgara çizgisinde bir ana çizgi', s.gmaj || 5); if (m >= 1) s.gmaj = Math.round(m); }
    persist(); C.log(`Izgara ${v && v.grid ? 'AÇIK' : 'KAPALI'}`);
  }, { noUndo: true });

  /* ---------- Çizim ayarları penceresi ---------- */
  C.addCommand(['SNAPSET', 'IZGARAAYAR', 'CIZIMAYARLARI', 'SNAPAYAR'], 'Çizim ayarları: yakalama ve ızgara (AutoCAD DSETTINGS)', async () => {
    const s = S(), v = C.views && C.views.plan;
    const b = C.modal('Çizim ayarları — Yakalama ve ızgara', `
      <div style="display:flex;gap:24px;flex-wrap:wrap">
      <div style="flex:1 1 240px"><h4>Yakalama (SNAP)</h4>
        <label><input type="checkbox" id="dsOn" ${C.state.gridSnap ? 'checked' : ''}> Yakalama açık (F9)</label>
        <div class="fld"><label>Tür</label><select id="dsType"><option value="G" ${s.type !== 'P' ? 'selected' : ''}>Izgara yakalama</option><option value="P" ${s.type === 'P' ? 'selected' : ''}>Kutupsal yakalama</option></select></div>
        <div class="fld"><label>X aralığı</label><input id="dsX" type="text" inputmode="decimal" value="${s.x || ''}" placeholder="otomatik"></div>
        <div class="fld"><label>Y aralığı</label><input id="dsY" type="text" inputmode="decimal" value="${s.y || ''}" placeholder="= X"></div>
        <label><input type="checkbox" id="dsEq" ${!s.y || s.y === s.x ? 'checked' : ''}> X ve Y eşit</label>
        <div class="fld"><label>Kutupsal mesafe</label><input id="dsPd" type="text" inputmode="decimal" value="${s.pd || ''}"></div>
        <div class="fld"><label>Açı (°)</label><input id="dsAng" type="text" inputmode="decimal" value="${s.ang || 0}"></div>
        <div class="fld"><label>Taban X , Y</label><span style="display:flex;gap:4px"><input id="dsBx" type="text" inputmode="decimal" style="width:70px" value="${s.base[0]}"><input id="dsBy" type="text" inputmode="decimal" style="width:70px" value="${s.base[1]}"></span></div>
      </div>
      <div style="flex:1 1 240px"><h4>Izgara (GRID)</h4>
        <label><input type="checkbox" id="dsGOn" ${v && v.grid ? 'checked' : ''}> Izgarayı göster (F7)</label>
        <label><input type="checkbox" id="dsGF" ${s.gfollow ? 'checked' : ''}> Yakalama aralığını izle</label>
        <div class="fld"><label>X aralığı</label><input id="dsGx" type="text" inputmode="decimal" value="${s.gx || ''}" placeholder="otomatik"></div>
        <div class="fld"><label>Y aralığı</label><input id="dsGy" type="text" inputmode="decimal" value="${s.gy || ''}" placeholder="= X"></div>
        <div class="fld"><label>Ana çizgi her</label><input id="dsGm" type="text" inputmode="decimal" value="${s.gmaj || 5}"></div>
        <p class="hint">Aralık boş = yakınlaştırmaya göre otomatik. Nesne yakalama (YAKALA) her zaman ızgara yakalamadan önceliklidir; ORTO açıkken kutupsal yakalama yatay/düşey kalır.</p>
      </div></div>
      <div class="bar" style="justify-content:flex-end"><button id="dsCancel">İptal</button><button id="dsOk" class="pri">Tamam</button></div>`);
    const n = (id, d) => { const t = String(b.querySelector(id).value).replace(',', '.').trim(); if (t === '') return d; const x = parseFloat(t); return isFinite(x) ? x : d; };
    return new Promise(res => {
      let done = false; const end = () => { if (done) return; done = true; clearInterval(tm); C.closeModal(); res(); };
      b.querySelector('#dsOk').onclick = () => {
        C.state.gridSnap = b.querySelector('#dsOn').checked; s.type = b.querySelector('#dsType').value;
        s.x = Math.max(0, n('#dsX', 0)); s.y = b.querySelector('#dsEq').checked ? s.x : Math.max(0, n('#dsY', s.x)); s.pd = Math.max(0, n('#dsPd', s.x || 0)); s.ang = n('#dsAng', 0); s.base = [n('#dsBx', 0), n('#dsBy', 0)];
        if (v) v.grid = b.querySelector('#dsGOn').checked; s.gfollow = b.querySelector('#dsGF').checked; s.gx = Math.max(0, n('#dsGx', 0)); s.gy = Math.max(0, n('#dsGy', s.gx)); s.gmaj = Math.max(1, Math.round(n('#dsGm', 5)));
        persist(); C.log(`Yakalama ${C.state.gridSnap ? 'AÇIK' : 'KAPALI'} — ${desc()}`); end();
      };
      b.querySelector('#dsCancel').onclick = end;
      const tm = setInterval(() => { if (document.querySelector('#modal').classList.contains('hidden')) end(); }, 300);
    });
  }, { noUndo: true });

  /* durum çubuğu: IZG.YAK sağ tık = ayarlar, kısa açıklama */
  if (typeof document !== 'undefined') setTimeout(() => {
    const bt = document.querySelector('#status [data-tg=gridSnap]'); if (!bt) return;
    bt.title = 'Izgara yakalama (F9) — sağ tık: aralık ayarları';
    bt.addEventListener('contextmenu', e => { e.preventDefault(); C.runTool('IZGARAAYAR'); });
    const sync = () => { bt.textContent = C.state.gridSnap && (S().x > 0 || S().type === 'P') ? 'IZG.YAK ' + (S().type === 'P' ? '⟳' + fmt(S().pd) : fmt(S().x)) : 'IZG.YAK'; };
    C.on('state', sync); C.on('doc', sync); sync();
    const gb = document.querySelector('#status [data-tg=grid]'); if (gb) { gb.title = 'Izgara (F7) — sağ tık: ayarlar'; gb.addEventListener('contextmenu', e => { e.preventDefault(); C.runTool('IZGARAAYAR'); }); }
  }, 0);
})(window.C);

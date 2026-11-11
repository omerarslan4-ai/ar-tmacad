/* ArıtmaCAD — PAFTADA MODEL ALANI (AutoCAD MSPACE): paftadaki görünüm penceresine çift tıklayınca çizim aynı ekranda, pencerenin içinde düzenlenir.
   Pencerenin üstüne plan çizim alanı tam ölçeğinde ve konumunda yerleşir: seçim, tutamaçlar, yakalama ve tüm çizim/düzenleme komutları çalışır.
   Orta tuş sürükle: kaydır · tekerlek: standart ölçekler arasında ölçek · pencere dışına çift tık ya da Esc (seçim yokken): kağıda dön.
   Açıklama nesneleri (yazı, ölçü, poz balonu…) pencerenin ölçeğinde gösterilir ve düzenlenir. Kilitli pencerede kaydırma/ölçek kapalıdır, düzenleme açıktır. */
(function (C) {
  'use strict';
  const M = C.M;
  let S = null; // { vp, save:{cx,cy,s,dark,grid,anno,lt}, pc:[paper center], k }
  const views = () => C.views || {};
  const clearPrims = () => { for (const e of C.doc.ents) if (e._c) { delete e._c.p; delete e._c.b; } };
  const setAnno = sc => { const s = C.doc.set; if (s.anno === sc) return; s.ltscale = s.ltscale * sc / s.anno; s.anno = sc; clearPrims(); };
  const want = () => { const lay = views().lay; if (C.currentView !== 'layout' || !C.activeVp || !lay) return null; const L = lay.cur(); return L && L.vps.includes(C.activeVp) ? C.activeVp : null; };
  /* plan çizim alanını pencerenin ekrandaki yerine oturt */
  let lastKey = '';
  const place = (force) => {
    const { lay, plan } = views(), vp = S.vp, cv = plan.cv;
    const key = [lay.cx, lay.cy, lay.s, lay.W, lay.H, vp.x, vp.y, vp.w, vp.h, vp.cx, vp.cy, vp.scale, JSON.stringify(vp.clip || 0)].join('|');
    if (!force && key === lastKey) return; lastKey = key;
    const a = lay.w2s([vp.x, vp.y + vp.h]), b = lay.w2s([vp.x + vp.w, vp.y]), ins = 2;
    const x0 = Math.max(0, a[0] + ins), y0 = Math.max(0, a[1] + ins), x1 = Math.min(lay.W, b[0] - ins), y1 = Math.min(lay.H, b[1] - ins);
    if (x1 - x0 < 4 || y1 - y0 < 4) { cv.style.visibility = 'hidden'; return; }
    cv.style.visibility = '';
    cv.style.inset = 'auto'; Object.assign(cv.style, { left: x0 + 'px', top: y0 + 'px', width: (x1 - x0) + 'px', height: (y1 - y0) + 'px', zIndex: 3 });
    if (vp.clip && C.vpClipPoly) cv.style.clipPath = 'polygon(' + C.vpClipPoly(vp).map(q => { const s = lay.w2s(q); return `${(s[0] - x0).toFixed(1)}px ${(s[1] - y0).toFixed(1)}px`; }).join(',') + ')'; else cv.style.clipPath = '';
    plan.resize();
    const k = 1000 / vp.scale, pc = lay.s2w((x0 + x1) / 2, (y0 + y1) / 2);
    S.k = k; S.pc = pc; S.busy = true;
    plan.rot = 0; plan.s = lay.s * k; plan.cx = vp.cx + (pc[0] - (vp.x + vp.w / 2)) / k; plan.cy = vp.cy + (pc[1] - (vp.y + vp.h / 2)) / k;
    S.busy = false; S.set = { cx: plan.cx, cy: plan.cy, s: plan.s }; setAnno(vp.scale); plan.dirty = true;
  };
  let chT = 0; const changedSoon = () => { clearTimeout(chT); chT = setTimeout(() => { C.changed(); C.emit('layouts'); }, 400); };
  /* plan içinden kaydırma/yakınlaştırma → pencereye yansıt */
  const onPlanView = () => {
    if (!S || S.busy) return; const { lay, plan } = views(), vp = S.vp;
    if (vp.lock) { S.busy = true; Object.assign(plan, S.set); S.busy = false; if (!S.warned) { C.log('🔒 Pencere kilitli: kaydırma ve ölçek kapalı (çizimi düzenleyebilirsiniz).'); S.warned = true; } return; }
    if (Math.abs(plan.s - S.set.s) > 1e-9 * plan.s) { // ölçek değişti → en yakın standart ölçek
      const want = 1000 * lay.s / plan.s, list = C.STD_SCALES; let ns = list.reduce((b, v) => Math.abs(Math.log(v / want)) < Math.abs(Math.log(b / want)) ? v : b, list[0]);
      const mx = plan.cx, my = plan.cy; vp.scale = ns; const k = 1000 / ns; vp.cx = mx - (S.pc[0] - (vp.x + vp.w / 2)) / k; vp.cy = my - (S.pc[1] - (vp.y + vp.h / 2)) / k;
    } else { vp.cx += plan.cx - S.set.cx; vp.cy += plan.cy - S.set.cy; }
    place(true); lay.dirty = true; changedSoon();
  };
  const enter = vp => {
    const { plan } = views(); if (!plan) return;
    const s = C.doc.set;
    S = { vp, save: { cx: plan.cx, cy: plan.cy, s: plan.s, rot: plan.rot, dark: plan.dark, grid: plan.grid, anno: s.anno, lt: s.ltscale, ov: plan.onViewChange } };
    C.vpEdit = vp; C.sel = []; C.emit('selection');
    { const L = (C.doc.layouts || []).find(q => q.vps.includes(vp)); S.save.du = C._dimU; C._dimU = C.dimUnitFor ? C.dimUnitFor((L && L.grp) || 'Genel') : undefined; clearPrims(); } // ölçüler paftanın biriminde
    plan.dark = false; plan.grid = false; plan.cv.classList.add('on', 'vpedit');
    plan.onViewChange = onPlanView; lastKey = ''; place(true);
    C.log(`✏️ Pencerenin içinde model alanındasınız (1/${vp.scale}): çizimi burada seçip düzenleyebilir, tutamaçlardan çekebilir, komut verebilirsiniz. Orta tuş: kaydır · tekerlek: ölçek · pencere dışına çift tık ya da Esc: kağıda dön.`);
  };
  const exit = () => {
    if (!S) return; const { plan, lay } = views(), sv = S.save, cv = plan.cv; S = null; C.vpEdit = null;
    for (const p of ['left', 'top', 'width', 'height', 'inset', 'zIndex', 'clipPath', 'visibility']) cv.style[p] = '';
    cv.classList.remove('vpedit'); cv.classList.toggle('on', C.currentView === 'plan');
    plan.onViewChange = sv.ov; plan.dark = sv.dark; plan.grid = sv.grid; C._dimU = sv.du; clearPrims();
    const s = C.doc.set; if (s.anno !== sv.anno) { s.anno = sv.anno; s.ltscale = sv.lt; clearPrims(); }
    plan.resize(); Object.assign(plan, { cx: sv.cx, cy: sv.cy, s: sv.s, rot: sv.rot || 0 }); plan.dirty = true;
    if (C.currentView === 'layout') { C.sel = []; C.emit('selection'); } if (lay) lay.dirty = true;
  };
  C.vpEditExit = exit;
  /* tekerlek: pencere ölçeğini standart ölçekler arasında değiştir (imleç altındaki nokta sabit) */
  let wAcc = 0;
  const wheel = e => {
    if (!S) return; e.preventDefault(); e.stopImmediatePropagation(); const vp = S.vp; if (vp.lock) return;
    wAcc += e.deltaY; if (Math.abs(wAcc) < 60) return; const dir = Math.sign(wAcc); wAcc = 0;
    const list = C.STD_SCALES, cur0 = vp.scale, ns = dir < 0 ? [...list].reverse().find(v => v < cur0 - 1e-9) : list.find(v => v > cur0 + 1e-9); if (!ns) return;
    const { plan, lay } = views(), r = plan.cv.getBoundingClientRect(), m = plan.s2w(e.clientX - r.left, e.clientY - r.top);
    const lr = lay.cv.getBoundingClientRect(), pp = lay.s2w(e.clientX - lr.left, e.clientY - lr.top), k1 = 1000 / ns;
    vp.cx = m[0] - (pp[0] - (vp.x + vp.w / 2)) / k1; vp.cy = m[1] - (pp[1] - (vp.y + vp.h / 2)) / k1; vp.scale = ns;
    place(true); lay.dirty = true; changedSoon(); C.log(`Pencere ölçeği 1/${ns}`);
  };
  const init = () => {
    const { plan, lay } = views(); if (!plan || !lay) { setTimeout(init, 50); return; }
    plan.cv.addEventListener('wheel', wheel, { capture: true, passive: false });
    const tick = () => { try { const w = want(); if (S && S.vp !== w) exit(); if (!S && w) enter(w); if (S) { place(false); if (C.doc.set.anno !== S.vp.scale) setAnno(S.vp.scale); } } catch (err) { console.error(err); } requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    C.on('doc', () => { if (S) { S.save.anno = C.doc.set.anno; S.save.lt = C.doc.set.ltscale; exit(); } C.activeVp = null; });
  };
  init();
  /* kaydederken pencere ölçeği değil, çizimin kendi ölçeği yazılsın */
  { const ss = C.snapshot; if (ss) C.snapshot = function () { if (!S) return ss.apply(this, arguments); const s = C.doc.set, a = s.anno, l = s.ltscale; s.anno = S.save.anno; s.ltscale = S.save.lt; try { return ss.apply(this, arguments); } finally { s.anno = a; s.ltscale = l; } }; }
})(window.C);

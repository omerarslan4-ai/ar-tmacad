/* ArıtmaCAD — AutoCAD katman araçları: LAYISO, LAYUNISO, LAYON, LAYOFF, LAYFRZ, LAYTHW, LAYLCK, LAYULK, LAYMCUR, LAYMCH, LAYCUR */
(function (C) {
  'use strict';
  const E = C.cmd;
  const st = C.layIsoSet = (() => { try { return Object.assign({ mode: 'K', fade: 50 }, JSON.parse(localStorage.getItem('aritmacad.layiso') || '{}')); } catch (e) { return { mode: 'K', fade: 50 }; } })();
  const save = () => { try { localStorage.setItem('aritmacad.layiso', JSON.stringify(st)); } catch (e) { } };
  const L = () => C.doc.layers, done = msg => { C.changed(); C.emit('layers'); if (msg) C.log(msg); };
  const tol = () => { try { return 7 / C.viewScale(); } catch (e) { return 0.1; } };
  const pickAny = p => { let best = null, bd = tol(); for (const e of C.doc.ents) { const l = C.layer(e.layer); if (!l || !l.on) continue; const d = C.entDist(e, p); if (d < bd) { bd = d; best = e; } } return best; };
  const pick = p => (C.pickTrimmable ? C.pickTrimmable(p, tol(), true) : C.pickAt(p)) || (C.hatchAt ? C.hatchAt(p) : null);
  const layersOf = ents => [...new Set(ents.map(e => e.layer || '0'))];
  const curLayer = () => C.doc.cur.layer;
  const setCur = n => { C.doc.cur.layer = n; C.emit('layers'); };

  /* LAYISO — seçilen nesnelerin katmanları dışındakileri kapat (ya da kilitle ve soldur) */
  C.addCommand(['LAYISO', 'KATMANYALIT', 'YALIT'], 'Katman yalıt: seçilen nesnelerin katmanları dışındaki tüm katmanları kapatır (Ayarlar: K = kapat, L = kilitle ve soldur). LAYUNISO ile geri alınır.', async (I) => {
    const s = await I.sel(`Yalıtılacak katmanlardaki nesneleri seçin (hiç seçmeden Enter = Ayarlar; şimdiki: ${st.mode === 'K' ? 'diğerlerini KAPAT' : 'diğerlerini KİLİTLE ve %' + st.fade + ' soldur'})`, { pre: true });
    if (!s || !s.length) {
      const m = await I.kw('Ayarlar', [['K', 'Diğer katmanları kapat'], ['L', 'Kilitle ve soldur']], st.mode); if (!m) return;
      st.mode = m; if (m === 'L') { const f = await I.num('Soldurma yüzdesi (0-90)', st.fade); if (f != null) st.fade = Math.max(0, Math.min(90, f)); } save(); C.log('LAYISO ayarı kaydedildi; şimdi nesneleri seçerek tekrar çalıştırın.'); return;
    }
    const keep = new Set(layersOf(s)), prev = {};
    for (const [n, l] of Object.entries(L())) prev[n] = { on: l.on, lock: !!l.lock, fade: l.fade };
    (C.doc.layIso = C.doc.layIso || []).push({ prev, cur: curLayer() });
    for (const [n, l] of Object.entries(L())) {
      if (keep.has(n)) { l.on = true; l.lock = false; delete l.fade; continue; }
      if (st.mode === 'K') l.on = false; else { l.lock = true; l.fade = st.fade; }
    }
    if (!keep.has(curLayer())) setCur([...keep][0]);
    done(`${[...keep].join(', ')} katmanı yalıtıldı (${st.mode === 'K' ? 'diğerleri kapatıldı' : 'diğerleri kilitlendi ve soldurudu'}). Geri almak için LAYUNISO.`);
  });

  /* LAYUNISO — son LAYISO öncesine dön */
  C.addCommand(['LAYUNISO', 'KATMANYALITKALDIR', 'YALITKALDIR'], 'Son LAYISO ile değişen katmanları eski hâline getirir', async () => {
    const st0 = (C.doc.layIso || []).pop(); if (!st0) { C.warn('LAYISO ile yalıtılmış katman yok.'); return; }
    for (const [n, v] of Object.entries(st0.prev)) { const l = L()[n]; if (!l) continue; l.on = v.on; l.lock = v.lock; if (v.fade == null) delete l.fade; else l.fade = v.fade; }
    if (st0.cur && L()[st0.cur]) setCur(st0.cur);
    done('Katmanlar LAYISO öncesine döndü.');
  });

  /* LAYON — tüm katmanları aç */
  C.addCommand(['LAYON', 'KATMANLARIAC', 'TUMKATMANAC'], 'Tüm katmanları açar (dondurulmuşları da çözer)', async () => {
    let n = 0; for (const l of Object.values(L())) { if (!l.on || l.frz) n++; l.on = true; delete l.frz; } done(`${n} katman açıldı; tüm katmanlar açık.`);
  });

  /* tek tek nesne seçerek katman işlemi (LAYOFF, LAYFRZ, LAYLCK, LAYULK) */
  const pickLoop = async (I, prompt, fn, verb, anyPick) => {
    const pre = C.sel.slice(); const undo = [];
    if (pre.length) { C.sel = []; C.emit('selection'); for (const n of layersOf(pre)) { undo.push(JSON.stringify(L()[n])); fn(n); } done(`${layersOf(pre).join(', ')} katmanı ${verb}.`); return; }
    for (; ;) {
      const r = await I.pt(prompt + ' (Enter = bitir)', { kw: [['U', 'Geri al']] });
      if (r == null || r === '') return;
      if (r === 'U') { const u = undo.pop(); if (u) { const o = JSON.parse(u); C.doc.layers[o.name] = o; done(`${o.name} geri alındı.`); } continue; }
      if (typeof r === 'string') continue;
      const e = (anyPick ? pickAny(r) : pick(r)); if (!e) { C.warn('Nesne bulunamadı'); continue; }
      const n = e.layer || '0'; undo.push(JSON.stringify(L()[n])); fn(n); done(`"${n}" katmanı ${verb}.`);
    }
  };
  C.addCommand(['LAYOFF', 'KATMANKAPAT'], 'Tıkladığınız nesnenin katmanını kapatır (U = geri al, Enter = bitir)', async (I) => {
    E.noSnap = true;
    await pickLoop(I, 'Katmanı kapatılacak nesneyi seçin', n => { if (n === curLayer()) C.log(`Not: "${n}" geçerli katman; kapatıldı ama çizdikleriniz görünmeyecek.`); L()[n].on = false; }, 'kapatıldı');
  });
  C.addCommand(['LAYFRZ', 'KATMANDONDUR'], 'Tıkladığınız nesnenin katmanını dondurur (görünmez, seçilmez; geçerli katman dondurulamaz)', async (I) => {
    E.noSnap = true;
    await pickLoop(I, 'Katmanı dondurulacak nesneyi seçin', n => { if (n === curLayer()) { C.warn(`"${n}" geçerli katman, dondurulamaz.`); return; } L()[n].on = false; L()[n].frz = true; }, 'donduruldu');
  });
  C.addCommand(['LAYTHW', 'KATMANCOZ'], 'Dondurulmuş tüm katmanları çözer', async () => { let n = 0; for (const l of Object.values(L())) if (l.frz) { l.frz = false; l.on = true; n++; } done(`${n} katman çözüldü.`); });
  C.addCommand(['LAYLCK', 'KATMANKILITLE'], 'Tıkladığınız nesnenin katmanını kilitler (görünür ama seçilemez/değiştirilemez)', async (I) => {
    E.noSnap = true;
    await pickLoop(I, 'Katmanı kilitlenecek nesneyi seçin', n => { L()[n].lock = true; }, 'kilitlendi');
  });
  C.addCommand(['LAYULK', 'KATMANKILITAC'], 'Tıkladığınız nesnenin katmanının kilidini açar', async (I) => {
    E.noSnap = true;
    await pickLoop(I, 'Kilidi açılacak katmandaki nesneyi seçin', n => { L()[n].lock = false; delete L()[n].fade; }, 'kilidi açıldı', true);
  });
  C.addCommand(['LAYMCUR', 'KATMANGECERLI'], 'Tıkladığınız nesnenin katmanını geçerli katman yapar', async (I) => {
    E.noSnap = true; const pre = C.sel[0];
    const e = pre || await (async () => { const r = await I.pt('Katmanı geçerli yapılacak nesneyi seçin'); return r && typeof r !== 'string' ? pick(r) : null; })();
    if (!e) return; setCur(e.layer || '0'); C.log(`Geçerli katman: ${e.layer}`);
  }, { noUndo: true });
  C.addCommand(['LAYMCH', 'KATMANESLE'], 'Seçili nesneleri, hedef nesnenin katmanına taşır', async (I) => {
    const s = await I.sel('Katmanı değişecek nesneleri seçin'); if (!s.length) return;
    E.noSnap = true; const r = await I.pt('Hedef katmandaki nesneyi seçin [Ad(N)]', { kw: [['N', 'Ad']] }); let n = null;
    if (r === 'N') n = await I.str('Katman adı', curLayer()); else if (r && typeof r !== 'string') { const e = pick(r); n = e && e.layer; }
    if (!n) return; C.ensureLayer(n); for (const e of s) { e.layer = n; delete e._c; } done(`${s.length} nesne "${n}" katmanına taşındı.`);
  });
  C.addCommand(['LAYCUR', 'KATMANAGECIR'], 'Seçili nesneleri geçerli katmana taşır', async (I) => {
    const s = await I.sel('Geçerli katmana taşınacak nesneleri seçin'); if (!s.length) return; const n = curLayer(); for (const e of s) { e.layer = n; delete e._c; } done(`${s.length} nesne "${n}" katmanına taşındı.`);
  });
})(window.C);

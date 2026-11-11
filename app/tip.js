/* ArıtmaCAD — ELEMAN TİPLERİ (Revit duvar / döşeme tipleri gibi)
   C.doc.set.tipler = { list: [{ id, kat: 'perde' | 'doseme' | 'radye', ad, t (taşıyıcı kalınlık cm), beton, malz, dis/ic (perde: dıştan perdeye / perdeden odaya), ust/alt (döşeme: üstten taşıyıcıya / taşıyıcıdan alta) }], cur: { perde, doseme, radye } }
   Katman: { ad, t (cm) }. Elemanın e.tip'i: kalınlık tipten gelir; malzeme açılımı ve mahal listesi tip katmanlarından dolar.
   Odalar: zemin kaplaması verilmemişse perdelerin çevrelediği alanlardan (her seviyede) bulunur. */
(function (C) {
  'use strict';
  const M = C.M;
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const nid = () => 'T' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  const Lr = (ad, t) => ({ ad, t: t || 0 });
  const PRESET = () => [
    { kat: 'perde', ad: 'P-01 Betonarme perde 30 — sıvalı, boyalı', t: 30, beton: 'C30/37', dis: [Lr('Silikonlu dış cephe boyası'), Lr('Dış cephe sıvası (çimento esaslı)', 2.5)], ic: [Lr('Kaba + ince sıva (kireç-çimento)', 2.5), Lr('Plastik (su bazlı) iç cephe boyası')] },
    { kat: 'perde', ad: 'P-02 Islak hacim / havuz perdesi 40', t: 40, beton: 'C35/45', dis: [Lr('Drenaj levhası'), Lr('XPS ısı yalıtım levhası', 5), Lr('Bitümlü su yalıtım örtüsü (2 kat, polyester keçe)')], ic: [Lr('Kristalize su yalıtımı')] },
    { kat: 'perde', ad: 'P-03 Toprak altı perde 30', t: 30, beton: 'C30/37', dis: [Lr('Drenaj levhası'), Lr('XPS ısı yalıtım levhası', 5), Lr('Bitümlü su yalıtım örtüsü (2 kat, polyester keçe)')], ic: [Lr('Kaba + ince sıva (kireç-çimento)', 2.5), Lr('Plastik (su bazlı) iç cephe boyası')] },
    { kat: 'perde', ad: 'P-04 Tuğla duvar 19', t: 19, malz: 'tugla', dis: [Lr('Kaba + ince sıva (kireç-çimento)', 2.5), Lr('Plastik (su bazlı) iç cephe boyası')], ic: [Lr('Kaba + ince sıva (kireç-çimento)', 2.5), Lr('Plastik (su bazlı) iç cephe boyası')] },
    { kat: 'doseme', ad: 'D-01 Zemin kat döşemesi — seramik', t: 20, beton: 'C30/37', ust: [Lr('Seramik yer karosu', 1), Lr('Seramik yapıştırıcısı (çimento esaslı)'), Lr('Şap (çimento esaslı)', 5)], alt: [] },
    { kat: 'doseme', ad: 'D-02 Ara kat döşemesi — seramik, sıvalı tavan', t: 15, beton: 'C30/37', ust: [Lr('Seramik yer karosu', 1), Lr('Seramik yapıştırıcısı (çimento esaslı)'), Lr('Şap (çimento esaslı)', 5)], alt: [Lr('Alçı sıva', 1), Lr('Tavan boyası (plastik)')] },
    { kat: 'doseme', ad: 'D-03 Teras çatı döşemesi', t: 15, beton: 'C30/37', ust: [Lr('Çakıl koruma tabakası (geotekstil üstü)', 5), Lr('Bitümlü su yalıtım örtüsü (2 kat, polyester keçe)'), Lr('XPS ısı yalıtım levhası', 8), Lr('Eğim betonu', 5), Lr('Buhar dengeleyici / kesici')], alt: [Lr('Alçı sıva', 1), Lr('Tavan boyası (plastik)')] },
    { kat: 'doseme', ad: 'D-04 Pompa odası — endüstriyel zemin', t: 20, beton: 'C30/37', ust: [Lr('Endüstriyel zemin (yüzey sertleştirici + perdah)', 0.5)], alt: [] },
    { kat: 'radye', ad: 'R-01 Radye temel 60', t: 60, beton: 'C30/37', ust: [], alt: [Lr('Koruma betonu', 5), Lr('Bitümlü su yalıtım örtüsü (2 kat, polyester keçe)'), Lr('Grobeton (C16/20)', 10)] },
    { kat: 'radye', ad: 'R-02 Islak hacim radyesi 60', t: 60, beton: 'C35/45', ust: [Lr('Kristalize su yalıtımı')], alt: [Lr('Koruma betonu', 5), Lr('Bitümlü su yalıtım örtüsü (2 kat, polyester keçe)'), Lr('Grobeton (C16/20)', 10)] },
  ];
  const TS = () => { const s = C.doc.set; if (!s.tipler || !Array.isArray(s.tipler.list)) s.tipler = { list: PRESET().map(t => Object.assign({ id: nid() }, t)), cur: {} }; if (!s.tipler.cur) s.tipler.cur = {}; return s.tipler; };
  C.tipListe = kat => TS().list.filter(t => !kat || t.kat === kat);
  C.tipGet = id => id ? TS().list.find(t => t.id === id) || null : null;
  const katOf = e => e.type === 'perde' ? 'perde' : e.type === 'plak' ? (e.kind === 'radye' ? 'radye' : 'doseme') : e.type === 'temel' ? 'radye' : null;
  const coreName = t => { const m = t.kat === 'perde' ? (t.malz && t.malz !== 'beton' ? (((C._ins || {}).MALZ || {})[t.malz] || {}).ad + ' duvar' : 'Betonarme perde') : t.kat === 'radye' ? 'Betonarme radye temel' : 'Betonarme döşeme'; return `${m}${t.beton && (!t.malz || t.malz === 'beton') ? ` (${t.beton})` : ''}, ${t.t} cm`; };
  C.tipKatman = e => { const t = C.tipGet(e && e.tip); if (!t) return null; return t.kat === 'perde' ? { core: coreName(t), dis: t.dis || [], ic: t.ic || [] } : { core: coreName(t), ust: t.ust || [], alt: t.alt || [] }; };
  /* tipi elemana uygula: kalınlık, beton, malzeme */
  const applyTip = (e, t) => {
    if (!t) { delete e.tip; return; } e.tip = t.id; const th = (+t.t || 0) / 100;
    if (e.type === 'perde' && th > 0) { e.tb = th; e.tt = th; if (t.beton) e.beton = t.beton; e.malz = t.malz || 'beton'; }
    else if (e.type === 'plak' && th > 0) { e.t = th; if (t.beton) e.beton = t.beton; }
    else if (e.type === 'temel' && th > 0) { e.t = th; if (t.beton) e.beton = t.beton; }
    delete e._c;
  };
  C.tipUygula = applyTip;
  /* geçerli tip: yeni çizilen elemana */
  { const a0 = C.add; C.add = function (e) { if (e && !e.tip && !e.gv && !C._tipNoCur) { const k = katOf(e), cur = k && TS().cur[k]; if (cur && C.tipGet(cur)) applyTip(e, C.tipGet(cur)); } return a0.apply(this, arguments); }; }

  /* ---------- özellikler paneli ---------- */
  C.tipPropsHTML = s => {
    if (!s.length) return ''; const k = katOf(s[0]); if (!k || !s.every(e => katOf(e) === k)) return '';
    const same = s.every(e => e.tip === s[0].tip), cur = same ? (s[0].tip || '') : '*';
    return `<h4>Tip</h4><div class="fld"><label>Eleman tipi</label><select data-tipsel>${cur === '*' ? '<option value="*">*farklı*</option>' : ''}<option value="" ${cur === '' ? 'selected' : ''}>— tipsiz —</option>${C.tipListe(k).map(t => `<option value="${t.id}" ${cur === t.id ? 'selected' : ''}>${esc(t.ad)}</option>`).join('')}</select></div><div class="bar"><button data-tipedit>Tipleri düzenle…</button></div>`;
  };
  C.tipPropsWire = (b, s, apply) => { const sl = b.querySelector('[data-tipsel]'); if (sl) sl.onchange = () => { if (sl.value === '*') return; const t = C.tipGet(sl.value); apply(e => applyTip(e, t)); C.emit('selection'); }; const ed = b.querySelector('[data-tipedit]'); if (ed) ed.onclick = () => C.tipEditor(katOf(s[0])); };

  /* ---------- tip düzenleyici ---------- */
  const KATS = [['perde', 'Perde / duvar'], ['doseme', 'Döşeme'], ['radye', 'Radye / temel']];
  const toTxt = a => (a || []).map(l => `${l.ad}${+l.t ? ' ; ' + String(l.t).replace('.', ',') : ''}`).join('\n');
  const fromTxt = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean).map(x => { const m = /^(.*?)\s*;\s*([\d.,]+)\s*(cm)?$/.exec(x); return m ? { ad: m[1].trim(), t: parseFloat(m[2].replace(',', '.')) || 0 } : { ad: x, t: 0 }; });
  C.tipEditor = (kat0) => {
    let kat = kat0 || 'perde', sel = null;
    const b = C.modal('Eleman tipleri', '<div data-tp></div>'); const host = b.querySelector('[data-tp]');
    const draw = () => {
      const T = TS(), L = C.tipListe(kat); if (!sel || !L.find(t => t.id === sel)) sel = (L[0] || {}).id; const t = C.tipGet(sel);
      const sides = kat === 'perde' ? [['dis', 'Dış katmanlar (en dıştan perdeye doğru)'], ['ic', 'İç katmanlar (perdeden odaya doğru)']] : [['ust', 'Üst katmanlar (en üstten taşıyıcıya)'], ['alt', 'Alt katmanlar (taşıyıcıdan aşağı)']];
      host.innerHTML = `<div style="display:flex;gap:4px;border-bottom:1px solid var(--line,#3a4250);margin-bottom:8px">${KATS.map(([k, l]) => `<button type="button" data-kat="${k}" class="${k === kat ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div style="display:grid;grid-template-columns:240px minmax(0,1fr);gap:14px">
          <div style="display:flex;flex-direction:column;gap:4px">${L.map(x => `<button type="button" data-t="${x.id}" class="${x.id === sel ? 'on' : ''}" style="text-align:left">${T.cur[kat] === x.id ? '● ' : ''}${esc(x.ad)}</button>`).join('')}
            <div class="bar" style="margin-top:6px;flex-wrap:wrap"><button data-new>+ Yeni</button><button data-copy ${t ? '' : 'disabled'}>Kopyala</button><button data-del ${t ? '' : 'disabled'}>Sil</button></div></div>
          <div>${t ? `<div class="fld"><label>Tip adı</label><input data-f="ad" value="${esc(t.ad)}"></div>
            <div class="fld"><label>Taşıyıcı kalınlık (cm)</label><input data-f="t" type="number" step="1" value="${t.t}"></div>
            ${kat === 'perde' ? `<div class="fld"><label>Malzeme</label><select data-f="malz">${[['beton', 'Betonarme'], ['tugla', 'Tuğla'], ['gazbeton', 'Gazbeton'], ['briket', 'Briket']].map(([v, l]) => `<option value="${v}" ${(t.malz || 'beton') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>` : ''}
            <div class="fld"><label>Beton sınıfı</label><input data-f="beton" value="${esc(t.beton || '')}" placeholder="C30/37"></div>
            ${sides.map(([k, l]) => `<label class="hint" style="display:block;margin-top:6px">${l} — her satır: <i>malzeme ; kalınlık cm</i></label><textarea data-f="${k}" rows="4" style="width:100%">${esc(toTxt(t[k]))}</textarea>`).join('')}
            <div class="bar" style="margin-top:8px;flex-wrap:wrap"><button class="pri" data-save>Kaydet</button><button data-cur>${T.cur[kat] === t.id ? 'Geçerli tip (yeni çizimlerde) ✓' : 'Yeni çizimlerde bu tipi kullan'}</button><button data-nocur ${T.cur[kat] ? '' : 'disabled'}>Geçerli tipi kaldır</button><button data-sel>Seçili elemanlara uygula</button></div>
            <p class="hint">Kaydedince bu tipteki tüm elemanların kalınlığı güncellenir; malzeme açılımı ve mahal listesi tip katmanlarından okunur. <b>●</b> = yeni çizimlerde kullanılan tip.</p>` : '<p class="hint">Bu türde tip yok.</p>'}</div></div>`;
      host.querySelectorAll('[data-kat]').forEach(x => x.onclick = () => { kat = x.dataset.kat; sel = null; draw(); });
      host.querySelectorAll('[data-t]').forEach(x => x.onclick = () => { sel = x.dataset.t; draw(); });
      const Q = q => host.querySelector(q);
      Q('[data-new]').onclick = () => { C.undoStack.push(C.snapshot()); const n = { id: nid(), kat, ad: kat === 'perde' ? 'Yeni perde tipi' : 'Yeni döşeme tipi', t: kat === 'radye' ? 60 : kat === 'perde' ? 30 : 20, beton: 'C30/37' }; if (kat === 'perde') { n.dis = []; n.ic = []; } else { n.ust = []; n.alt = []; } TS().list.push(n); sel = n.id; C.changed(); draw(); };
      if (t) {
        Q('[data-copy]').onclick = () => { C.undoStack.push(C.snapshot()); const n = JSON.parse(JSON.stringify(t)); n.id = nid(); n.ad = t.ad + ' (kopya)'; TS().list.push(n); sel = n.id; C.changed(); draw(); };
        Q('[data-del]').onclick = () => { C.undoStack.push(C.snapshot()); TS().list = TS().list.filter(x => x.id !== t.id); for (const e of C.doc.ents) if (e.tip === t.id) delete e.tip; if (TS().cur[kat] === t.id) delete TS().cur[kat]; sel = null; C.changed(); draw(); };
        Q('[data-save]').onclick = () => { C.undoStack.push(C.snapshot()); t.ad = Q('[data-f=ad]').value.trim() || t.ad; t.t = parseFloat(Q('[data-f=t]').value) || t.t; t.beton = Q('[data-f=beton]').value.trim(); const mz = Q('[data-f=malz]'); if (mz) t.malz = mz.value; for (const [k] of sides) t[k] = fromTxt(Q(`[data-f=${k}]`).value); let n = 0; for (const e of C.doc.ents) if (e.tip === t.id) { applyTip(e, t); n++; } C.changed(); C.emit('selection'); C.log(`Tip kaydedildi: ${t.ad}${n ? ` — ${n} eleman güncellendi` : ''}.`); draw(); };
        Q('[data-cur]').onclick = () => { TS().cur[kat] = t.id; C.changed(); C.log(`Yeni ${kat === 'perde' ? 'perdeler' : kat === 'radye' ? 'radye / temeller' : 'döşemeler'} bu tiple çizilecek: ${t.ad} (kalınlık tipten).`); draw(); };
        Q('[data-nocur]').onclick = () => { delete TS().cur[kat]; C.changed(); draw(); };
        Q('[data-sel]').onclick = () => { const ss = C.sel.filter(e => katOf(e) === kat); if (!ss.length) return C.warn('Seçimde bu türde eleman yok.'); C.undoStack.push(C.snapshot()); ss.forEach(e => applyTip(e, t)); C.changed(); C.log(`${ss.length} elemana "${t.ad}" uygulandı.`); };
      }
    };
    draw();
  };
  C.addCommand(['TIPLER', 'ELEMANTIPLERI', 'DUVARTIPI', 'DOSEMETIPI', 'TYPES'], 'Eleman tipleri: katmanlı perde / duvar, döşeme ve radye tipleri (Revit tipleri gibi). Geçerli tip yeni çizimlerde kullanılır; açılım ve mahal listesi tiplerden dolar.', () => C.tipEditor(), { noUndo: true });
  C.addCommand(['TIPATA', 'TIPUYGULA'], 'Seçili perde / döşeme / radyelere tip ata: TIPATA tipadı (başı yeter, ör. P-02)', async (I) => {
    const ss = C.sel.slice(); if (!ss.length) return C.warn('Önce elemanları seçin.'); const q = String(await I.str('Tip adı (ya da başı)', '', { whole: true }) || '').trim(); if (!q) return;
    let n = 0; for (const e of ss) { const k = katOf(e); if (!k) continue; const t = C.tipListe(k).find(x => C.up(x.ad).startsWith(C.up(q))) || C.tipListe(k).find(x => C.up(x.ad).includes(C.up(q))); if (t) { applyTip(e, t); n++; } } C.changed(); C.log(`${n} elemana tip atandı.`);
  });

  /* ---------- mahal listesi: perdelerin çevrelediği odalar ---------- */
  const textIn = (poly, z) => { let best = null; for (const t of C.doc.ents) if ((t.type === 'text' || t.type === 'ctext') && !t.gv && !t.canli && t.p && C.pointInPoly(t.p, poly) && (!t.sv2 || !C.svGet || !C.svGet(t.sv2) || Math.abs(C.svGet(t.sv2).z - z) < 0.6)) { best = best || t; if (t.layer === 'MAHAL_ADI') { best = t; break; } } return best ? String(best.s).split('\n')[0] : null; };
  const inPt = poly => (C._kap && C._kap.inPt) ? C._kap.inPt(poly) : poly[0];
  C.tipOdalar = (existing) => {
    const P = C._probe; if (!P || !C._ins || !C._ins.dolguCells) return [];
    const levels = C.seviyeler && C.seviyeler().length ? C.seviyeler().slice(0, -1).map(l => l.z) : [0];
    const gb = (Object.values(C.doc.set.kesitMeta || {})[0] || {}).gb ?? 0.1, out = []; let n = 0;
    for (const z of levels) {
      let cells; try { cells = C._ins.dolguCells(z + 0.5).cells || []; } catch (er) { continue; }
      for (const c of cells) {
        if (!c.f || c.f.length < 3 || Math.abs(c.A) < 2) continue;
        const ip = inPt(c.f); if (existing.some(r => r.e && r.e.pts && C.pointInPoly(ip, r.e.pts) && Math.abs(r.z - z) < 0.8)) continue;
        const st = P.vStack(ip[0], ip[1], gb), G = [[], [], [], [], [], []];
        const below = st.filter(it => it.zt <= z + 0.35 && !P.isWall(it)); if (!below.length || below[0].zt < z - 0.35) continue; // odanın tabanı yok
        const fch = P.chainV(below, below[0].zt - 0.001); let i = 0;
        for (; i < fch.length && fch[i].k !== 'yapi'; i++) G[1].push(fch[i].ad);
        if (fch[i] && P.isFnd(fch[i].e)) for (let j = i; j < fch.length; j++) G[0].push(fch[j].ad);
        const above = st.filter(it => it.zb >= z + 0.5 && !P.isWall(it)).sort((a, b) => a.zb - b.zb);
        if (above.length) { const ch = P.chainV(above.slice().sort((a, b) => b.zt - a.zt || b.zb - a.zb), above[0].zb + 0.001); G[3] = P.dedupe(ch.map(q => q.ad)); }
        // duvarlar: odayı çevreleyen tipli perdelerin iç katmanları
        for (const e of C.doc.ents) { if (e.type !== 'perde' || !e.tip || e.gv) continue; const tk = C.tipKatman(e); if (!tk || !(tk.ic || []).length) continue; const zr = C.zRange ? C.zRange(e) : null; if (zr && (zr[1] < z + 0.2 || zr[0] > z + 1.5)) continue;
          const pts = e.pts || []; let near = false; for (let k = 0; k < pts.length && !near; k++) { const a = pts[k], b = pts[(k + 1) % pts.length]; if (!b || (!e.closed && k === pts.length - 1)) continue; for (let u = 0.1; u < 0.95 && !near; u += 0.2) { const q = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; const dmin = c.f.reduce((m, v, vi) => { const w = c.f[(vi + 1) % c.f.length]; const dx = w[0] - v[0], dy = w[1] - v[1], L2 = dx * dx + dy * dy || 1, tt = Math.max(0, Math.min(1, ((q[0] - v[0]) * dx + (q[1] - v[1]) * dy) / L2)); return Math.min(m, Math.hypot(q[0] - v[0] - tt * dx, q[1] - v[1] - tt * dy)); }, Infinity); if (dmin < (+e.tb || 0.3) * 0.75 + 0.05) near = true; } }
          if (near) for (const l of tk.ic) G[2].push(P.nm(l.ad, +l.t || 0)); }
        for (const o of C.doc.ents) if (o.type === 'acik' && (o.kind === 'kapi' || o.kind === 'pencere')) { let bb; try { bb = C.bbox(o); } catch (er) { continue; } const mc = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2], r = Math.max(bb[2] - bb[0], bb[3] - bb[1]) / 2 + 0.35; if (![[r, 0], [-r, 0], [0, r], [0, -r]].some(([dx, dy]) => C.pointInPoly([mc[0] + dx, mc[1] + dy], c.f))) continue; const w = Math.round((+o.w || 1) * 100), h = Math.round((+o.hh || (o.kind === 'kapi' ? 2.1 : 1.4)) * 100); G[o.kind === 'kapi' ? 4 : 5].push((o.ad || o.tip || (o.kind === 'kapi' ? 'Kapı' : 'Pencere')) + ` ${w}×${h}`); }
        n++; out.push({ e: null, poly: c.f, ad: textIn(c.f, z) || `Mahal ${n}`, z, G: G.map(a => [...new Set(a)]) });
      }
    }
    return out;
  };
  /* oda adı: tıklanan yere MAHAL_ADI yazısı */
  { const d0 = C.cmds.MAHALADI; if (d0) { const f0 = d0.fn; d0.fn = async function (I, Cx) {
      const kap = C.doc.ents.some(x => x.type === 'kaplama' && x.kind === 'zemin'); if (kap) return f0.call(this, I, Cx);
      const q = await I.pt('Odanın içine tıklayın (adın yazılacağı yer)'); if (!q || typeof q === 'string') return; const v = await I.str('Mahal adı', 'Z01 - '); if (!v) return;
      C.ensureLayer('MAHAL_ADI', 7, 'CONTINUOUS', 18); C.add(C.newEnt('text', { p: [q[0], q[1], 0], h: C.annoH(2.5), s: String(v), al: 'MC', layer: 'MAHAL_ADI' })); C.changed(); C.log(`Mahal adı: ${v}`); }; } }
  C.on('doc', () => { if (C.doc && C.doc.set && C.doc.set.tipler) TS(); });
})(window.C);

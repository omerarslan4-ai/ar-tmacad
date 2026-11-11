/* ArıtmaCAD — blok kütüphanesi ve malzeme listesi pencereleri */
(function (C) {
  'use strict';
  const M = C.M, esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const thumb = def => {
    if (def.thumb) return `<img src="${esc(def.thumb)}" width="150" height="96" style="background:#fff;border-radius:4px;object-fit:contain" alt="">`;
    const bb = def.bb || C.defBox(def); const w = Math.max(bb[2] - bb[0], 1e-6), h = Math.max(bb[3] - bb[1], 1e-6);
    const W = 150, H = 96, k = Math.min((W - 12) / w, (H - 12) / h);
    const P = p => [W / 2 + (p[0] - (bb[0] + bb[2]) / 2) * k, H / 2 - (p[1] - (bb[1] + bb[3]) / 2) * k];
    const out = [`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background:#fff;border-radius:4px"><g fill="none">`];
    const stub = { layer: '0', color: 7, lt: 'CONTINUOUS', lw: 18 };
    for (const d of def.ents) { const t = C.T[d.type]; if (!t) continue; try { const pr = t.prims(d).map(q => Object.assign({}, q, { lw: 18 })); C.primsSvg(out, pr, stub, P, k, true, k * 6); } catch (e) { } }
    out.push('</g></svg>'); return out.join('');
  };
  const state = { tur: '', dn: '', view: '', q: '', mat: 'PE', fdn: 200 };
  C.openBlockLib = function () {
    const user = C.blib.all();
    const turs = [...new Set([...C.SCHEMA_TURLER, ...user.map(d => d.tur)])].sort((a, b) => a.localeCompare(b, 'tr'));
    const dns = [...new Set([...C.SCHEMA_DNS, ...user.map(d => d.dn).filter(Boolean)])].sort((a, b) => a - b);
    const body = C.modal('Blok / vana kütüphanesi', `
      <div class="bar">
        <select id="blTur"><option value="">Tüm cinsler</option>${turs.map(t => `<option ${t === state.tur ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
        <select id="blDn"><option value="">Tüm çaplar</option>${dns.map(d => `<option value="${d}" ${String(d) === String(state.dn) ? 'selected' : ''}>DN${d}</option>`).join('')}</select>
        <select id="blView"><option value="">Plan + kesit</option><option value="plan" ${state.view === 'plan' ? 'selected' : ''}>Plan</option><option value="kesit" ${state.view === 'kesit' ? 'selected' : ''}>Kesit / görünüş</option></select>
        <input id="blQ" placeholder="Ara…" value="${esc(state.q)}" style="flex:1;min-width:100px">
      </div>
      <div class="bar"><button id="blLoad" class="pri">DWG/DXF'den blok yükle…</button><button id="blMake">Seçimden blok yap</button><button id="bl3d">3B model (STL/OBJ) ekle</button><button id="blOnline" class="pri">🌐 Ücretsiz 3B modeller</button><button id="blExp">Kütüphaneyi dışa aktar</button><button id="blImp">İçe aktar (.json)</button><button id="blBom">Malzeme listesi (BOM)</button></div>
      <h3>Sizin bloklarınız <span class="hint">(${user.length})</span></h3><div id="blUser" class="blgrid"></div>
      <h3>Hazır şematik vanalar <span class="hint">EN 558 boy / PN16 flanş, yaklaşık</span></h3><div id="blSch" class="blgrid"></div>
      <h3>Standart boru fittingsleri <span class="hint">malzemeye göre, 3B gövdeli</span></h3>
      <div class="bar"><select id="ftMat">${Object.entries(C.CATALOG).map(([k, c]) => `<option value="${k}" ${k === state.mat ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select><select id="ftDn"></select><select id="ftDn2"></select></div>
      <div id="blFit" class="blgrid"></div>
      <p class="hint">Karta tıklayın → yerleştirme noktası, ölçek çarpanı (1 = gerçek boyut) ve boru yönünü verin. Blok adındaki "DN150", "surgulu", "kesit" gibi ifadeler cins/çap/görünüş olarak otomatik tanınır.</p>`);
    const card = (def, user) => `<div class="blcard" data-id="${esc(def.id)}" data-u="${user ? 1 : 0}" title="${esc(def.name)}">${thumb(def)}<div class="bln">${esc(def.name)}</div><div class="hint">${esc(def.tur)}${def.license ? ' · ' + esc(def.license) : ''}${def.author ? ' · ' + esc(def.author) : ''}${def.dn ? ' · DN' + def.dn : ''} · ${def.view === 'kesit' ? 'kesit' : 'plan'}${def.mesh3d ? ' · <b style="color:#7fd17f">3B</b>' : ''}</div>${user ? '<div class="blact"><button class="ic" data-a="ed" title="Düzenle">✎</button><button class="ic" data-a="del" title="Sil">✕</button></div>' : ''}</div>`;
    const draw = () => {
      const f = d => (!state.tur || d.tur === state.tur) && (!state.dn || String(d.dn) === String(state.dn)) && (!state.view || d.view === state.view) && (!state.q || C.ascii(d.name + ' ' + d.tur).toLowerCase().includes(C.ascii(state.q).toLowerCase()));
      const us = user.filter(f);
      body.querySelector('#blUser').innerHTML = us.length ? us.slice(0, 120).map(d => card(d, true)).join('') : '<p class="hint">Henüz yok — "DWG/DXF\'den blok yükle" ile vana çizimlerinizi ekleyin.</p>';
      const sch = []; const ts = state.tur ? (C.SCHEMA_TURLER.includes(state.tur) ? [state.tur] : []) : C.SCHEMA_TURLER;
      const dnl = state.dn ? [+state.dn] : [150]; const vs = state.view ? [state.view] : ['plan', 'kesit'];
      for (const t of ts) for (const d of dnl) for (const v of vs) { const def = C.schematicDef(t, d, v); if (f(def)) sch.push(def); }
      body.querySelector('#blSch').innerHTML = sch.map(d => card(d, false)).join('') || '<p class="hint">Bu filtrede şematik blok yok.</p>';
      body.querySelectorAll('#blUser .blcard, #blSch .blcard').forEach(el => el.onclick = ev => {
        const id = el.dataset.id, u = el.dataset.u === '1';
        const a = ev.target.closest('[data-a]');
        if (a && a.dataset.a === 'del') { if (confirm('Silinsin mi?')) { C.blib.remove(id); C.openBlockLib(); } return; }
        if (a && a.dataset.a === 'ed') { editDef(C.blib.load()[id]); return; }
        C.closeModal();
        if (u) C.runTool(`VANAEKLE ID=${id}`);
        else { const d = sch.find(x => x.id === id); C.runTool(`VANAEKLE "TUR=${d.tur}" DN=${d.dn} GORUNUS=${d.view}`); }
      });
    };
    const sync = () => { state.tur = body.querySelector('#blTur').value; state.dn = body.querySelector('#blDn').value; state.view = body.querySelector('#blView').value; state.q = body.querySelector('#blQ').value; draw(); };
    ['#blTur', '#blDn', '#blView'].forEach(q => body.querySelector(q).onchange = sync); body.querySelector('#blQ').oninput = sync;
    body.querySelector('#blLoad').onclick = async () => { const f = await C.pickFile('.dwg,.dxf'); if (!f) return; try { const n = await C.importBlockFile(f); C.log(`${n} blok kütüphaneye eklendi (${f.name}).`); C.openBlockLib(); } catch (e) { if (!e.cancel) C.warn(e.message); } };
    body.querySelector('#bl3d').onclick = () => { C.closeModal(); C.runTool('MODELYUKLE'); };
    body.querySelector('#blOnline').onclick = () => { C.closeModal(); C.openModelLib(); };
    body.querySelector('#blMake').onclick = () => { C.closeModal(); C.runTool('BLOKYAP'); };
    body.querySelector('#blExp').onclick = () => C.download(JSON.stringify(C.blib.load()), 'AritmaCAD_blok_kutuphanesi.json', 'application/json');
    body.querySelector('#blImp').onclick = async () => { const f = await C.pickFile('.json'); if (!f) return; try { const o = JSON.parse(await f.text()); const lib = C.blib.load(); Object.assign(lib, o); C.blib.save(lib); C.openBlockLib(); } catch (e) { C.warn('Geçersiz kütüphane dosyası'); } };
    body.querySelector('#blBom').onclick = () => { C.closeModal(); C.runTool('BOM HEPSI'); };
    const fitDraw = () => {
      const mat = body.querySelector('#ftMat').value; state.mat = mat; const cat = C.CATALOG[mat];
      const dsel = body.querySelector('#ftDn'), d2sel = body.querySelector('#ftDn2');
      if (dsel.dataset.mat !== mat) { dsel.dataset.mat = mat; const def = cat.sizes.includes(state.fdn) ? state.fdn : cat.sizes[Math.floor(cat.sizes.length / 2)]; dsel.innerHTML = cat.sizes.map(d => `<option value="${d}" ${d === def ? 'selected' : ''}>${cat.label(d)}</option>`).join(''); }
      const dn = +dsel.value; state.fdn = dn; const smaller = cat.sizes.filter(d => d < dn);
      if (d2sel.dataset.dn !== String(dn)) { d2sel.dataset.dn = String(dn); d2sel.innerHTML = smaller.length ? smaller.map((d, i) => `<option value="${d}" ${i === smaller.length - 1 ? 'selected' : ''}>${cat.label(d)} (inegal/redüksiyon)</option>`).join('') : '<option value="">—</option>'; }
      const dn2 = +d2sel.value || null;
      const defs = C.FIT_TYPES.filter(([k]) => (k !== 'tei' && k !== 'red') || dn2).map(([k]) => C.fittingDef(mat, k, dn, dn2));
      body.querySelector('#blFit').innerHTML = defs.map(d => card(d, false)).join('');
      body.querySelectorAll('#blFit .blcard').forEach((el, i) => el.onclick = () => { const k = C.FIT_TYPES.filter(([k]) => (k !== 'tei' && k !== 'red') || dn2)[i][0]; C.closeModal(); C.runTool(`FITEKLE MAL=${mat} TIP=${k} DN=${dn}${dn2 ? ' DN2=' + dn2 : ''}`); });
    };
    ['#ftMat', '#ftDn', '#ftDn2'].forEach(q => body.querySelector(q).onchange = fitDraw);
    fitDraw();
    draw();
  };
  function editDef(def) {
    if (!def) return;
    const body = C.modal('Bloğu düzenle', `<div style="display:flex;gap:16px;flex-wrap:wrap">${thumb(def)}<div style="flex:1;min-width:260px">
      <div class="fld"><label>Ad</label><input id="edN" value="${esc(def.name)}"></div>
      <div class="fld"><label>Cinsi</label><input id="edT" list="edTL" value="${esc(def.tur)}"><datalist id="edTL">${C.TURLER.map(t => `<option>${esc(t[0])}</option>`).join('')}</datalist></div>
      <div class="fld"><label>DN</label><input id="edD" type="number" value="${def.dn || ''}"></div>
      <div class="fld"><label>Görünüş</label><select id="edV"><option value="plan" ${def.view !== 'kesit' ? 'selected' : ''}>Plan</option><option value="kesit" ${def.view === 'kesit' ? 'selected' : ''}>Kesit / görünüş</option></select></div>
      <div class="fld"><label>Çizim birimi</label><select id="edU">${['mm', 'cm', 'm'].map(u => `<option ${u === def.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
      <p class="hint">Boyut: ${M.fmt(def.bb[2] - def.bb[0], 1)} × ${M.fmt(def.bb[3] - def.bb[1], 1)} ${def.unit} · kaynak: ${esc(def.src || '')}</p>
      <div class="bar"><button class="pri" id="edOk">Kaydet</button><button id="edBack">Geri</button></div></div></div>`);
    body.querySelector('#edOk').onclick = () => { def.name = body.querySelector('#edN').value; def.tur = body.querySelector('#edT').value; def.dn = +body.querySelector('#edD').value || null; def.view = body.querySelector('#edV').value; def.unit = body.querySelector('#edU').value; C.blib.put(def); C.openBlockLib(); };
    body.querySelector('#edBack').onclick = () => C.openBlockLib();
  }
  C.showBom = function (rows) {
    C._bomRows = rows;
    const body = C.modal('Malzeme listesi (BOM)', `<table class="bom"><thead><tr><th>Poz</th><th>Malzeme</th><th>DN</th><th>Miktar</th><th>Birim</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.poz}</td><td>${esc(r.mal)}</td><td>${r.dn ? 'DN' + r.dn : '-'}</td><td style="text-align:right">${r.unit === 'm' ? M.fmt(r.q, 1) : r.q}</td><td>${r.unit}</td></tr>`).join('')}</tbody></table>
      <p class="hint">Plan ve kesitte aynı vana iki kez çizildiyse kesit görünüşleri sayılmaz. Boru miktarı çizimdeki 3B boru uzunluğudur.</p>
      <div class="bar"><button class="pri" id="bmDraw">Çizime tablo ekle</button><button id="bmCsv">CSV (Excel) indir</button></div>`);
    body.querySelector('#bmCsv').onclick = () => { const csv = '﻿Poz;Malzeme;DN;Miktar;Birim\n' + rows.map(r => [r.poz, r.mal, r.dn ? 'DN' + r.dn : '', (r.unit === 'm' ? r.q.toFixed(1) : r.q).toString().replace('.', ','), r.unit].join(';')).join('\n'); C.download(csv, C.ascii(C.doc.set.name) + '_malzeme_listesi.csv', 'text/csv'); };
    body.querySelector('#bmDraw').onclick = () => { C.closeModal(); C.runTool('BOMTABLO'); };
  };
  C.addCommand(['BOMTABLO'], 'Son malzeme listesini çizime tablo olarak ekler', async (I) => {
    const rows = C._bomRows || C.bom(C.doc.ents); const p = await I.pt('Tablonun sol üst köşesi'); if (p && typeof p !== 'string') C.bomTable(rows, p);
  });
})(window.C);

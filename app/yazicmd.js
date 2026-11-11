/* ArıtmaCAD — yazı komutları: TEXT (DTEXT), MTEXT, STYLE, YAZIHIZALA (JUSTIFYTEXT), YAZIDUZENLE (DDEDIT), EGRIYAZI (ARCTEXT) */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd, RAD = Math.PI / 180;
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const KW_J = [['L', 'Sol'], ['C', 'Orta'], ['R', 'Sağ'], ['M', 'Merkez'], ['TL', 'ÜstSol'], ['TC', 'ÜstOrta'], ['TR', 'ÜstSağ'], ['ML', 'OrtaSol'], ['MC', 'OrtaMerkez'], ['MR', 'OrtaSağ'], ['BL', 'AltSol'], ['BC', 'AltOrta'], ['BR', 'AltSağ'], ['A', 'Hizalı'], ['F', 'Sığdır']];
  const defH = () => { const st = C.textStyle(C.curStyle()); return st.h > 0 ? st.h : C.annoH(C.doc.set.textH); };
  const ne = (type, props) => C.add(C.newEnt(type, props));
  const kvTake = () => { const kv = {}; E.queue = E.queue.filter(t => { const m = /^([A-Za-zÇĞİÖŞÜçğıöşü_]+)=(.*)$/.exec(t); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; }); return kv; };
  const askStyle = async I => { const names = Object.keys(C.styles()); const n = await I.str(`Stil adı (${names.join(', ')})`, C.curStyle(), { whole: false }); if (n && C.styles()[n]) C.doc.cur.style = n; else if (n) C.warn('Böyle bir stil yok: ' + n); };

  /* ---------- TEXT (tek satırlı, AutoCAD DTEXT gibi; Enter ile alt satıra geçer) ---------- */
  C.addCommand(['TEXT', 'DT', 'DTEXT', 'T', 'YAZI'], 'Tek satırlı yazı (AutoCAD TEXT/DTEXT). TEXT [J=hizalama S=stil] nokta yükseklik açı metin. Hizalama: L C R M TL TC TR ML MC MR BL BC BR, A=Hizalı (iki nokta arası), F=Sığdır', async (I) => {
    const kv = kvTake(); let al = kv.J ? C.up(kv.J) : 'L'; if (kv.S && C.styles()[kv.S]) C.doc.cur.style = kv.S;
    let p;
    for (; ;) {
      p = await I.pt(`Başlangıç noktası (hizalama: ${C.JUST_TR[al] || al}, stil: ${C.curStyle()})`, { kw: [['J', 'Hizala'], ['S', 'Stil']] }); if (p == null) return;
      if (p === 'J') { al = await I.kw('Hizalama', KW_J, al); continue; }
      if (p === 'S') { await askStyle(I); continue; }
      break;
    }
    if (typeof p === 'string') return;
    const st = C.textStyle(C.curStyle());
    if (al === 'A' || al === 'F') { // iki nokta arasına
      E.base = p; const p2 = await I.pt('Taban çizgisinin bitiş noktası'); if (!p2 || typeof p2 === 'string') return;
      const d = M.dist2(p, p2), rot = M.deg(M.ang(p, p2)); let h = st.h > 0 ? st.h : null;
      if (al === 'F' && !h) h = await I.dist('Yükseklik', p, defH());
      const s = await I.str('Metin'); if (!s) return;
      const w1 = C.measureText(s, 1, st) * (st.wf || 1);
      if (al === 'A') ne('text', { p, h: d / w1, rot, s, al: 'L', st: C.curStyle() });
      else ne('text', { p, h, rot, s, al: 'L', st: C.curStyle(), wf: d / (C.measureText(s, h, st)) });
      return;
    }
    const h = st.h > 0 ? st.h : await I.dist('Yükseklik', p, defH());
    const rot = await I.angle('Dönme açısı', p, 0);
    let pp = M.p3(p), n = 0;
    for (; ;) {
      const s = await I.str(n ? 'Sonraki satır (bitirmek için boş Enter)' : 'Metin'); if (!s) break;
      ne('text', { p: pp, h, rot: rot || 0, s, al, st: C.curStyle() }); n++;
      const ls = h * 5 / 3, a = ((rot || 0) - 90) * RAD; pp = [pp[0] + Math.cos(a) * ls, pp[1] + Math.sin(a) * ls, pp[2]];
      if (E.scriptMode) break;
    }
  });

  /* ---------- yazı düzenleyici (MTEXT ve düzenleme için) ---------- */
  C.textEditor = (init, title) => new Promise(res => {
    const S = Object.keys(C.styles()), o = Object.assign({ s: '', h: defH(), st: C.curStyle(), al: 'TL', mw: 0, ls: 1, rot: 0, wf: '', obl: '', mt: true }, init);
    const grid = ['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR'];
    const body = C.modal(title || 'Yazı', `
      <div class="bar"><label>Stil <select id="teSt">${S.map(n => `<option ${n === o.st ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
        <label>Yükseklik <input id="teH" type="number" step="any" value="${o.h}" style="width:80px"></label>
        <label>Dönme (°) <input id="teR" type="number" step="any" value="${o.rot || 0}" style="width:70px"></label>
        <label title="Boş = stildeki değer">Genişlik çarpanı <input id="teW" type="number" step="0.05" value="${o.wf || ''}" placeholder="stil" style="width:64px"></label>
        <label title="Boş = stildeki değer">Eğiklik (°) <input id="teO" type="number" step="1" value="${o.obl != null ? o.obl : ''}" placeholder="stil" style="width:56px"></label></div>
      <div class="bar"><div class="jgrid" title="Taşıma (ekleme) noktası">${grid.map(j => `<button data-j="${j}" class="${j === o.al ? 'on' : ''}" title="${C.JUST_TR[j]}">${{ T: '▔', M: '—', B: '▁' }[j[0]]}</button>`).join('')}</div>
        <div class="jbase">${['L', 'C', 'R', 'M'].map(j => `<button data-j="${j}" class="${j === o.al ? 'on' : ''}">${C.JUST_TR[j]}</button>`).join('')}</div>
        <div style="display:flex;flex-direction:column;gap:4px"><label><input type="checkbox" id="teMt" ${o.mt ? 'checked' : ''}> Çok satırlı (MTEXT)</label>
        <label>Kutu genişliği <input id="teMw" type="number" step="any" min="0" value="${o.mw || 0}" style="width:80px"> <span class="hint">0 = kaydırma yok</span></label>
        <label>Satır aralığı <input id="teLs" type="number" step="0.1" min="0.25" value="${o.ls || 1}" style="width:60px"> ×</label></div></div>
      <textarea id="teS" rows="6" style="width:100%;font-size:15px" placeholder="Metni yazın (Enter = yeni satır). Özel: %%c = Ø, %%d = °, %%p = ±">${esc(o.s)}</textarea>
      <canvas id="tePv" width="680" height="120" style="width:100%;background:#fff;border-radius:6px;margin-top:6px"></canvas>
      <div class="bar" style="justify-content:flex-end"><button id="teNo">İptal</button><button id="teOk" class="pri">Tamam</button></div>`);
    const $ = s => body.querySelector(s); let al = o.al, done = false;
    const val = () => { const wf = parseFloat($('#teW').value), ob = $('#teO').value; return { s: $('#teS').value.replace(/%%c/gi, 'Ø').replace(/%%d/gi, '°').replace(/%%p/gi, '±'), h: parseFloat($('#teH').value) || o.h, st: $('#teSt').value, rot: parseFloat($('#teR').value) || 0, al, mt: $('#teMt').checked, mw: $('#teMt').checked ? Math.max(0, parseFloat($('#teMw').value) || 0) : 0, ls: parseFloat($('#teLs').value) || 1, wf: wf > 0 ? wf : undefined, obl: ob === '' ? undefined : parseFloat(ob) }; };
    const pv = () => { // önizleme
      const cv = $('#tePv'), g = cv.getContext('2d'), v = val(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      const pr = { k: 'T', p: [0, 0, 0], h: 1, s: v.s || ' ', rot: v.rot * RAD, al: v.al, st: v.st, wf: v.wf, obl: v.obl, mt: v.mt, mw: v.mw ? v.mw / v.h : 0, ls: v.ls };
      const b = C.textLayout(pr).box, cs = C.textCorners(pr), bx = [Math.min(...cs.map(q => q[0])), Math.min(...cs.map(q => q[1])), Math.max(...cs.map(q => q[0])), Math.max(...cs.map(q => q[1]))];
      const k = Math.min((cv.width - 40) / Math.max(bx[2] - bx[0], 1e-6), (cv.height - 30) / Math.max(bx[3] - bx[1], 1e-6), 60);
      const cx = (bx[0] + bx[2]) / 2, cy = (bx[1] + bx[3]) / 2, w2s = q => [cv.width / 2 + (q[0] - cx) * k, cv.height / 2 - (q[1] - cy) * k];
      g.fillStyle = '#111'; C.drawTextCanvas(g, pr, { w2s, s: k, rot: 0 });
      g.strokeStyle = 'rgba(30,120,255,.5)'; g.setLineDash([4, 3]); g.beginPath(); cs.map(w2s).forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.stroke(); g.setLineDash([]);
      const a = w2s([0, 0]); g.strokeStyle = '#e33'; g.lineWidth = 2; g.beginPath(); g.moveTo(a[0] - 7, a[1]); g.lineTo(a[0] + 7, a[1]); g.moveTo(a[0], a[1] - 7); g.lineTo(a[0], a[1] + 7); g.stroke(); g.lineWidth = 1;
      void b;
    };
    body.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { al = b.dataset.j; body.querySelectorAll('[data-j]').forEach(x => x.classList.toggle('on', x.dataset.j === al)); pv(); });
    body.querySelectorAll('input,select,textarea').forEach(x => x.oninput = x.onchange = pv);
    const end = r => { if (done) return; done = true; clearInterval(tm); C.closeModal(); res(r); };
    $('#teOk').onclick = () => end(val()); $('#teNo').onclick = () => end(null);
    $('#teS').onkeydown = e => { if (e.key === 'Enter' && e.ctrlKey) end(val()); };
    const tm = setInterval(() => { if (document.querySelector('#modal').classList.contains('hidden')) end(null); }, 300);
    pv(); setTimeout(() => $('#teS').focus(), 30);
  });

  /* ---------- MTEXT ---------- */
  C.addCommand(['MTEXT', 'MT', 'COKSATIRYAZI', 'PARAGRAF'], 'Çok satırlı paragraf yazı (AutoCAD MTEXT): ilk köşe, karşı köşe (kutu genişliği), sonra metin. Seçenekler: Y=yükseklik J=hizalama S=stil R=dönme L=satır aralığı W=genişlik. Komut satırında: MTEXT nokta1 nokta2 "metin\\Psatır2"', async (I) => {
    const kv = kvTake(); let h = kv.Y ? C.num(kv.Y) : defH(), al = kv.J ? C.up(kv.J) : 'TL', rot = kv.R ? C.num(kv.R) : 0, ls = kv.L ? C.num(kv.L) : 1; if (kv.S && C.styles()[kv.S]) C.doc.cur.style = kv.S;
    const a = await I.pt('Kutunun ilk köşesi'); if (!a || typeof a === 'string') return;
    let b, mw = null;
    for (; ;) {
      E.base = a; E.rubber = false; E.preview = c => [C.prim.P([a, [c[0], a[1], a[2] || 0], c, [a[0], c[1], a[2] || 0]], true, { lt: 'DASHED' })];
      b = await I.pt('Karşı köşe', { kw: [['Y', 'Yükseklik'], ['J', 'Hizala'], ['S', 'Stil'], ['R', 'Dönme'], ['L', 'SatırAralığı'], ['W', 'Genişlik']] }); E.preview = null;
      if (b === 'Y') { h = await I.dist('Yükseklik', a, h); continue; }
      if (b === 'J') { al = await I.kw('Hizalama', KW_J.slice(4, 13), al); continue; }
      if (b === 'S') { await askStyle(I); continue; }
      if (b === 'R') { rot = await I.angle('Dönme açısı', a, rot); continue; }
      if (b === 'L') { ls = await I.num('Satır aralığı çarpanı', ls); continue; }
      if (b === 'W') { mw = await I.dist('Kutu genişliği', a, 10 * h); b = null; break; }
      break;
    }
    if (b && typeof b === 'string') return;
    let p = M.p3(a);
    if (b) { // kutu -> genişlik ve hizalama noktası
      const c = Math.cos(rot * RAD), s = Math.sin(rot * RAD), dx = (b[0] - a[0]) * c + (b[1] - a[1]) * s, dy = -(b[0] - a[0]) * s + (b[1] - a[1]) * c;
      mw = Math.abs(dx); const x0 = Math.min(0, dx), y1 = Math.max(0, dy), y0 = Math.min(0, dy), [hx, va] = C.JUST[al] || C.JUST.TL;
      const lx = x0 + hx * mw, ly = va === 'top' ? y1 : va === 'mid' ? (y0 + y1) / 2 : y0;
      p = [a[0] + lx * c - ly * s, a[1] + lx * s + ly * c, a[2] || 0];
    }
    let o;
    if (E.scriptMode || E.queue.length) { const s = await I.str('Metin'); if (!s) return; o = { s: s.replace(/\\P/g, '\n').replace(/\\n/g, '\n'), h, st: C.curStyle(), al, mw: mw || 0, ls, rot, mt: true }; }
    else { o = await C.textEditor({ h, st: C.curStyle(), al, mw: mw || 0, ls, rot, mt: true }, 'Çok satırlı yazı (MTEXT)'); if (!o || !o.s) return; }
    C.lastEnt = ne('text', { p, h: o.h, s: o.s, rot: o.rot, al: o.al, st: o.st, mt: o.mt, mw: o.mw, ls: o.ls, wf: o.wf, obl: o.obl });
  });

  /* ---------- yazıyı düzenle (çift tık) ---------- */
  C.editText = async e => {
    if (e.type === 'ctext') { const s = prompt('Eğri yazı metni:', e.s); if (s == null) return; C.undoStack.push(C.snapshot()); C.redoStack = []; e.s = s; C.touch(e); return; }
    const o = await C.textEditor({ s: e.s, h: C.textH(e), st: e.st || 'Standard', al: e.al || 'L', mw: e.mw || 0, ls: e.ls || 1, rot: e.rot || 0, wf: e.wf, obl: e.obl, mt: !!e.mt }, e.mt ? 'MTEXT düzenle' : 'Yazı düzenle');
    if (!o) return;
    C.undoStack.push(C.snapshot()); C.redoStack = [];
    if (o.al !== (e.al || 'L')) { const np = keepPlace(e, o.al); e.p = np; }
    Object.assign(e, { s: o.s, h: o.h, st: o.st, al: o.al, rot: o.rot, mt: o.mt, mw: o.mw, ls: o.ls }); C.textSetH(e, o.h); if (o.wf) e.wf = o.wf; else delete e.wf; if (o.obl != null && !isNaN(o.obl)) e.obl = o.obl; else delete e.obl;
    C.touch(e);
  };
  C.addCommand(['DDEDIT', 'ED', 'TEXTEDIT', 'YAZIDUZENLE'], 'Yazıyı düzenle (metin, stil, yükseklik, hizalama, MTEXT genişliği). Planda yazıya çift tıklamak da açar.', async (I) => {
    const s = await I.sel('Düzenlenecek yazıyı seçin', { pre: true }); const e = s.find(q => q.type === 'text' || q.type === 'ctext'); if (!e) { C.warn('Yazı seçilmedi'); return; }
    await C.editText(e);
  }, { noUndo: true });

  /* ---------- YAZIHIZALA (JUSTIFYTEXT): yazı yerinde kalır, taşıma noktası değişir ---------- */
  const keepPlace = (e, al) => {
    const pr0 = Object.assign({}, e, { rot: (e.rot || 0) * RAD }), pr1 = Object.assign({}, pr0, { al });
    const b0 = C.textLayout(pr0).box, b1 = C.textLayout(pr1).box, dx = b0[0] - b1[0], dy = b0[1] - b1[1], c = Math.cos(pr0.rot), s = Math.sin(pr0.rot);
    return [e.p[0] + dx * c - dy * s, e.p[1] + dx * s + dy * c, e.p[2] || 0];
  };
  C.addCommand(['JUSTIFYTEXT', 'YAZIHIZALA', 'HIZALA'], 'Yazının taşıma (ekleme) noktasını değiştirir; yazı yerinden oynamaz. YAZIHIZALA seçim TL|TC|TR|ML|MC|MR|BL|BC|BR|L|C|R|M', async (I) => {
    const s = (await I.sel('Yazıları seçin')).filter(e => e.type === 'text'); if (!s.length) { C.warn('Yazı seçilmedi'); return; }
    const al = await I.kw('Yeni taşıma noktası', KW_J.slice(0, 13), 'MC');
    for (const e of s) { e.p = keepPlace(e, al); e.al = al; C.touch(e); }
    C.log(`${s.length} yazının taşıma noktası: ${C.JUST_TR[al]}`);
  });

  /* ---------- STYLE (yazı stilleri) ---------- */
  const applyStyles = () => { for (const e of C.doc.ents) if (e.type === 'text' || e.type === 'ctext' || e.type === 'dim' || e.type === 'blk') delete e._c; C.changed(); };
  C.openStyleMgr = function () {
    let cur = C.curStyle();
    const draw = () => {
      const S = C.styles(), y = S[cur] || S.Standard; cur = y.name;
      const body = C.modal('Yazı stilleri', `
        <div class="stylemgr"><div class="stlist">${Object.keys(S).map(n => `<button data-n="${esc(n)}" class="${n === cur ? 'on' : ''}">${n === C.curStyle() ? '▶ ' : ''}${esc(n)}</button>`).join('')}
          <div class="bar"><button id="stNew">Yeni…</button><button id="stDel" ${cur === 'Standard' ? 'disabled' : ''}>Sil</button></div></div>
        <div class="stform">
          <label>Yazı tipi <select id="stF">${C.FONTS.concat(C.FONTS.includes(y.font) ? [] : [y.font]).map(f => `<option ${f === y.font ? 'selected' : ''} style="font-family:${esc(C.fontFamily({ font: f }))}">${esc(f)}</option>`).join('')}</select></label>
          <label>Başka yazı tipi <input id="stF2" placeholder="Bilgisayarda kurulu ad, ör. Bahnschrift"></label>
          <label><input type="checkbox" id="stB" ${y.bold ? 'checked' : ''}> Kalın</label> <label><input type="checkbox" id="stI" ${y.italic ? 'checked' : ''}> İtalik</label>
          <label title="0 = yazarken sorulur">Sabit yükseklik <input id="stH" type="number" step="any" min="0" value="${y.h || 0}" style="width:80px"> <span class="hint">0 = her yazıda sorulur</span></label>
          <label>Genişlik çarpanı <input id="stW" type="number" step="0.05" min="0.1" value="${y.wf || 1}" style="width:70px"></label>
          <label>Eğiklik açısı (°) <input id="stO" type="number" step="1" min="-85" max="85" value="${y.obl || 0}" style="width:70px"></label>
          <canvas id="stPv" width="520" height="90" style="width:100%;background:#fff;border-radius:6px"></canvas>
          <div class="bar"><button id="stCur" class="pri">Geçerli stil yap</button><button id="stClose">Kapat</button></div>
          <p class="hint">Stil değişince bu stili kullanan tüm yazılar güncellenir. DXF/DWG'ye STYLE tablosu olarak yazılır (yazı tipi dosyası: ${esc(C.fontFile(y.font))}).</p>
        </div></div>`);
      const $ = s => body.querySelector(s);
      const pv = () => { const cv = $('#stPv'), g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); g.fillStyle = '#111'; const pr = { k: 'T', p: [0, 0, 0], h: 1, s: 'ArıtmaCAD Ø200 ±0.00 ĞÜŞİÖÇ 1:100', rot: 0, al: 'ML', st: cur }; const b = C.textLayout(pr).box, k = Math.min((cv.width - 20) / (b[2] - b[0]), 40); C.drawTextCanvas(g, pr, { w2s: q => [10 + q[0] * k, cv.height / 2 - q[1] * k], s: k, rot: 0 }); };
      const set = (k2, v) => { y[k2] = v; applyStyles(); pv(); };
      $('#stF').onchange = e => set('font', e.target.value); $('#stF2').onchange = e => { if (e.target.value.trim()) { set('font', e.target.value.trim()); draw(); } };
      $('#stB').onchange = e => set('bold', e.target.checked); $('#stI').onchange = e => set('italic', e.target.checked);
      $('#stH').onchange = e => set('h', Math.max(0, parseFloat(e.target.value) || 0)); $('#stW').onchange = e => set('wf', parseFloat(e.target.value) || 1); $('#stO').onchange = e => set('obl', parseFloat(e.target.value) || 0);
      body.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { cur = b.dataset.n; draw(); });
      $('#stNew').onclick = () => { const n = (prompt('Yeni stil adı:', 'Baslik') || '').trim(); if (!n) return; if (S[n]) { alert('Bu ad var'); return; } S[n] = Object.assign({}, y, { name: n }); cur = n; draw(); };
      $('#stDel').onclick = () => { if (cur === 'Standard') return; if (!confirm(`"${cur}" silinsin mi? Bu stili kullanan yazılar Standard olur.`)) return; for (const e of C.doc.ents) if (e.st === cur) e.st = 'Standard'; delete S[cur]; if (C.doc.cur.style === cur) C.doc.cur.style = 'Standard'; cur = 'Standard'; applyStyles(); draw(); };
      $('#stCur').onclick = () => { C.doc.cur.style = cur; C.log('Geçerli yazı stili: ' + cur); draw(); };
      $('#stClose').onclick = () => C.closeModal();
      pv();
    };
    draw();
  };
  C.addCommand(['STYLE', 'ST', 'YAZISTILI', 'STIL'], 'Yazı stilleri penceresi. Komut satırında: STYLE AD=Baslik FONT=Arial Y=0 G=1 E=0 KALIN=E ITALIK=H [GECERLI=E]', async () => {
    const kv = kvTake();
    if (kv.AD) {
      const S = C.styles(), y = S[kv.AD] || (S[kv.AD] = Object.assign({}, C.textStyle('Standard'), { name: kv.AD }));
      if (kv.FONT) y.font = kv.FONT.replace(/_/g, ' '); if (kv.Y != null) y.h = C.num(kv.Y) || 0; if (kv.G != null) y.wf = C.num(kv.G) || 1; if (kv.E != null) y.obl = C.num(kv.E) || 0;
      if (kv.KALIN != null) y.bold = /^[EY1T]/i.test(kv.KALIN); if (kv.ITALIK != null) y.italic = /^[EY1T]/i.test(kv.ITALIK);
      if (!kv.GECERLI || /^[EY1T]/i.test(kv.GECERLI)) C.doc.cur.style = y.name;
      applyStyles(); C.log(`Stil "${y.name}": ${y.font}${y.bold ? ' kalın' : ''}${y.italic ? ' italik' : ''}, yükseklik ${y.h || 'serbest'}, genişlik ${y.wf}, eğiklik ${y.obl}°`); return;
    }
    C.openStyleMgr();
  });

  /* ---------- EĞRİ BOYUNCA YAZI ---------- */
  C.addCommand(['ARCTEXT', 'EGRIYAZI', 'YAYYAZI', 'CURVETEXT'], 'Yay, daire, çoklu çizgi ya da çizgi boyunca yazı. EGRIYAZI nesne "metin" yükseklik [konum C/L/R/F] [taraf U=üst A=alt T=ters] [mesafe]', async (I) => {
    const s0 = await I.sel('Yazının izleyeceği yay / daire / çoklu çizgi / çizgiyi seçin', { pre: true }); const e = s0.find(q => ['arc', 'circle', 'pline', 'line', 'ctext'].includes(q.type)); if (!e) { C.warn('Yay, daire, çoklu çizgi ya da çizgi seçin'); return; }
    const s = await I.str('Metin (boşluk içeriyorsa komut satırında "tırnak" içinde)', null, { whole: !E.queue.length }); if (!s) return;
    const st = C.textStyle(C.curStyle()), h = st.h > 0 ? st.h : await I.num('Yükseklik', defH());
    const al = await I.kw('Eğri üzerindeki konum', [['C', 'Orta'], ['L', 'Baş'], ['R', 'Son'], ['F', 'Sığdır']], 'C');
    const side = await I.kw('Taraf', [['U', 'Üst/dış'], ['A', 'Alt/iç'], ['T', 'Ters yön']], 'U');
    const off = await I.num('Eğriden mesafe', h * 0.2);
    const pts = C.pathFromEnt(e, side === 'T'); if (!pts) { C.warn('Bu nesneden yol çıkarılamadı'); return; }
    C.lastEnt = ne('ctext', { pts, s, h, al, st: C.curStyle(), off: side === 'A' ? -(off + h) : off, layer: e.layer === '0' ? C.doc.cur.layer : e.layer });
  });
})(window.C);

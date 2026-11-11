/* ArıtmaCAD — DÖŞEME / RADYE YÜZ DÜZENLEYİCİ (delik / boşluk)
   Döşeme ya da radyeye çift tıklayınca (planda ya da 3B'de) ayrı pencerede döşemenin üstten görünüşü ölçülü açılır;
   delik / boşluk (dikdörtgen ya da daire) sayıyla ya da tıklayarak eklenir, taşınır, silinir.
   Veri: e.bosluk3 = [{pts, d:[0,0,-(t+0.02)], yuzEd:{plak:true, sekil, x, y, w, h}}] — düşey, boydan boya boşluk
   (statik modelde döşeme deliği olarak okunur). Komut: DOSEMEYUZ / PLAKYUZ */
(function (C) {
  'use strict'; if (!C) return;
  const r4 = v => Math.round(v * 10000) / 10000, cm = v => String(Math.round(v * 100)), f2 = v => (+v).toFixed(2);

  // plak yerel çerçevesi: u = en uzun kenar doğrultusu (dik açılı döşemede dünya X'e yakın olanı tercih), köken = çevreleyen kutunun sol-alt köşesi
  const cerceve = e => {
    const P = e.pts.map(q => [+q[0], +q[1]]); let best = null;
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue; let u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
      if (Math.abs(u[1]) > Math.abs(u[0])) u = u[1] > 0 ? [u[1], -u[0]] : [-u[1], u[0]]; if (u[0] < 0) u = [-u[0], -u[1]];
      if (!best || L > best.L + 1e-6) best = { L, u }; }
    let u = best ? best.u : [1, 0]; if (Math.abs(u[1]) < 1e-6) u = [1, 0]; const v = [-u[1], u[0]];
    const loc = P.map(q => [q[0] * u[0] + q[1] * u[1], q[0] * v[0] + q[1] * v[1]]), xs = loc.map(q => q[0]), ys = loc.map(q => q[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), Lx = Math.max(...xs) - x0, Ly = Math.max(...ys) - y0;
    const ic = q => [q[0] * u[0] + q[1] * u[1] - x0, q[0] * v[0] + q[1] * v[1] - y0], dis = (x, y) => [r4(u[0] * (x + x0) + v[0] * (y + y0)), r4(u[1] * (x + x0) + v[1] * (y + y0))];
    return { u, v, Lx, Ly, poly: P.map(ic), ic, dis, t: +e.t || 0.3, zt: +e.zt || 0 };
  };
  const bosOlustur = (e, Y, o) => {
    let loc; if (o.sekil === 'D') { const r = o.w / 2; loc = Array.from({ length: 24 }, (_, i) => { const a = 2 * Math.PI * i / 24; return [o.x + r * Math.cos(a), o.y + r * Math.sin(a)]; }); }
    else loc = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]];
    const z = Y.zt + 0.01; // üst yüzün biraz üstünden aşağı, alt yüzün biraz altına (boydan boya)
    return { pts: loc.map(q => { const p = Y.dis(q[0], q[1]); return [p[0], p[1], r4(z)]; }), d: [0, 0, r4(-(Y.t + 0.02))], yuzEd: { plak: true, sekil: o.sekil, x: r4(o.x), y: r4(o.y), w: r4(o.w), h: r4(o.h) } };
  };
  const bosOku = (e, Y) => (Array.isArray(e.bosluk3) ? e.bosluk3 : []).map((b, i) => {
    if (!b || !Array.isArray(b.pts) || b.pts.length < 3) return null;
    if (b.yuzEd && b.yuzEd.plak) return Object.assign({}, b.yuzEd, { i, kendi: true });
    const L = b.pts.map(q => Y.ic(q)), xs = L.map(q => q[0]), ys = L.map(q => q[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
    const dus = Array.isArray(b.d) && Math.abs(b.d[2] || 0) > 0.7 * Math.hypot(b.d[0] || 0, b.d[1] || 0, b.d[2] || 0);
    return { i, sekil: 'R', x: x0, y: y0, w, h, kendi: false, cep: dus && Math.abs(b.d[2]) < Y.t - 0.02, yatay: !dus };
  }).map((o, i) => o || { i, gizli: true, sil: false });

  let acik = null;
  const ac = (e) => {
    if (acik) acik.kapat();
    const Y = cerceve(e), radye = e.kind === 'radye' || /RADYE/i.test(e.layer || ''), ad = e.no || (radye ? 'Radye' : 'Döşeme');
    const st = { liste: bosOku(e, Y), sec: -1, yeni: { sekil: 'R', w: 0.6, h: 0.6 } };
    const div = document.createElement('div'); div.id = 'dyDlg';
    div.style.cssText = 'position:fixed;inset:0;background:rgba(10,18,24,.55);z-index:9999;display:flex;align-items:center;justify-content:center;font:13px Segoe UI,Arial,sans-serif';
    div.innerHTML = `<style>#dyDlg button,#dyDlg input,#dyDlg select{background:#fff;color:#13242b;border:1px solid #9fb0b5;border-radius:4px;padding:4px 8px;font:13px Segoe UI,Arial}#dyDlg input:disabled{background:#eef1f2;color:#6a7a80}#dyDlg #dyUygula{background:#0b6e8a;color:#fff;border-color:#0b6e8a}</style><div style="background:#fff;color:#13242b;border-radius:8px;width:min(1280px,96vw);height:min(820px,94vh);display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.4)">
      <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #d5dde0"><b id="dyBas" style="flex:1"></b>
        <button id="dyTum">Tümü</button><button id="dyYak">Seçiliye yakınlaş</button><button id="dyKapat">Kapat</button><button id="dyUygula">Uygula</button></div>
      <div style="flex:1;display:flex;min-height:0"><canvas id="dyC" style="flex:1;min-width:0;cursor:crosshair"></canvas>
        <div style="width:300px;border-left:1px solid #d5dde0;padding:10px;overflow:auto">
          <div style="font-weight:700;margin-bottom:6px">Boşluk / delik</div>
          <label>Şekil <select id="dySekil"><option value="R">Dikdörtgen</option><option value="D">Daire (boru geçişi)</option></select></label>
          <div id="dyAlan" style="display:grid;grid-template-columns:1fr 90px;gap:4px 6px;align-items:center;margin:8px 0"></div>
          <div style="display:flex;gap:6px"><button id="dyEkle">+ Yeni boşluk</button><button id="dySil">Seçiliyi sil</button></div>
          <p style="color:#5a6b71;font-size:12px">Üstten görünüş (plan). Fare tekerleği: yakınlaştır · sağ tuş / orta tuş / Shift + sürükle: kaydır. Görünüşe tıklayınca seçili boşluk oraya taşınır (5 cm kenetleme); mevcut boşluğa tıklayınca seçilir. Gri bantlar: döşemeye oturan / altındaki perdeler. Boşluklar döşemeyi boydan boya keser ve statik hesapta döşeme deliği olarak alınır.</p>
          <div style="font-weight:700;margin:8px 0 4px">Boşluklar</div><div id="dyListe"></div>
        </div></div></div>`;
    document.body.appendChild(div);
    const $ = s => div.querySelector(s), cv = $('#dyC');
    // döşemeyle ilişkili perdeler (referans): perde ekseni yerel çerçevede
    const perdeler = []; try { for (const x of C.doc.ents) { if (x.type !== 'perde' || !C.layer(x.layer).on || !Array.isArray(x.pts)) continue; const z0 = +x.z0 || 0, z1 = z0 + (+x.h || 3); if (z1 < Y.zt - Y.t - 0.05 || z0 > Y.zt + 0.05) continue; const p = x.pts.map(q => Y.ic(q)); if (x.closed) p.push(p[0]); perdeler.push({ p, t: +x.tb || 0.3 }); } } catch (er) { }
    const alanlar = () => { const o = st.sec >= 0 ? st.liste[st.sec] : null, g = $('#dyAlan');
      if (!o) { g.innerHTML = '<span style="grid-column:1/3;color:#5a6b71">Boşluk seçili değil — "+ Yeni boşluk".</span>'; return; }
      $('#dySekil').value = o.sekil; const D = o.sekil === 'D', F = D ? [['cx', 'Sol kenardan merkeze (m)'], ['cy', 'Alt kenardan merkeze (m)'], ['w', 'Çap (m)']] : [['x', 'Sol kenardan (m)'], ['y', 'Alt kenardan (m)'], ['w', 'Genişlik (m)'], ['h', 'Derinlik (m)']];
      const val = k => k === 'cx' ? o.x + o.w / 2 : k === 'cy' ? o.y + o.w / 2 : o[k];
      g.innerHTML = F.map(([k, t]) => `<span>${t}</span><input data-k="${k}" type="number" step="0.05" value="${f2(val(k))}" ${o.kendi === false ? 'disabled' : ''}>`).join('') + `<span>Sağ kenara (m)</span><b>${f2(Y.Lx - o.x - o.w)}</b><span>Üst kenara (m)</span><b>${f2(Y.Ly - o.y - (D ? o.w : o.h))}</b>${o.kendi === false ? `<span style="grid-column:1/3;color:#a15c00">${o.yatay ? 'Yatay boşluk' : o.cep ? 'Cep (boydan boya değil)' : 'İT/ÇEK ile açılmış boşluk'} — burada yalnız silinebilir.</span>` : ''}`;
      g.querySelectorAll('input').forEach(inp => inp.oninput = () => { const v = +inp.value; if (!isFinite(v)) return; const k = inp.dataset.k; if (k === 'cx') o.x = v - o.w / 2; else if (k === 'cy') o.y = v - o.w / 2; else if (k === 'w' && o.sekil === 'D') { const cx = o.x + o.w / 2, cy = o.y + o.w / 2; o.w = o.h = v; o.x = cx - v / 2; o.y = cy - v / 2; } else o[k] = v; o.degisti = true; ciz(); listele(); }); };
    const listele = () => { $('#dyListe').innerHTML = st.liste.map((o, i) => o.sil || o.gizli ? '' : `<div data-i="${i}" style="padding:4px 6px;margin:2px 0;border-radius:4px;cursor:pointer;background:${i === st.sec ? '#d8eef5' : '#f1f4f5'}">${i + 1}. ${o.sekil === 'D' ? `Ø${cm(o.w)}` : `${cm(o.w)}×${cm(o.h)}`} — sol ${cm(o.x)}, alt ${cm(o.y)}${o.kendi === false ? ' (dış)' : ''}${o.yeni ? ' • yeni' : o.degisti ? ' • değişti' : ''}</div>`).join('') || '<span style="color:#5a6b71">Boşluk yok.</span>';
      $('#dyListe').querySelectorAll('[data-i]').forEach(d => d.onclick = () => { st.sec = +d.dataset.i; alanlar(); listele(); ciz(); }); };
    let T = null, AR = null; const V = { k: 1, dx: 0, dy: 0 };
    const ciz = () => {
      if (!div.isConnected || cv.clientWidth < 100 || cv.clientHeight < 100) return;
      const W = cv.clientWidth, H = cv.clientHeight; cv.width = W * devicePixelRatio; cv.height = H * devicePixelRatio; const x = cv.getContext('2d'); x.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
      const pad = 80, sc0 = Math.min((W - 2 * pad) / Y.Lx, (H - 2 * pad) / Y.Ly), sc = sc0 * V.k, ox = (W - Y.Lx * sc) / 2 + V.dx, oy = (H + Y.Ly * sc) / 2 + V.dy;
      const X = s => ox + s * sc, Z = z => oy - z * sc; T = { X, Z, sc, ox, oy };
      x.strokeStyle = '#eef2f3'; x.lineWidth = 1; for (let s = 0; s <= Y.Lx + 1e-6; s += 1) { x.beginPath(); x.moveTo(X(s), Z(0)); x.lineTo(X(s), Z(Y.Ly)); x.stroke(); } for (let z = 0; z <= Y.Ly + 1e-6; z += 1) { x.beginPath(); x.moveTo(X(0), Z(z)); x.lineTo(X(Y.Lx), Z(z)); x.stroke(); }
      x.fillStyle = '#e7ecee'; x.strokeStyle = '#13242b'; x.lineWidth = 2; x.beginPath(); Y.poly.forEach((q, i) => i ? x.lineTo(X(q[0]), Z(q[1])) : x.moveTo(X(q[0]), Z(q[1]))); x.closePath(); x.fill(); x.stroke();
      x.strokeStyle = '#7d8f95'; perdeler.forEach(p => { x.lineWidth = Math.max(1, p.t * sc); x.globalAlpha = 0.35; x.beginPath(); p.p.forEach((q, i) => i ? x.lineTo(X(q[0]), Z(q[1])) : x.moveTo(X(q[0]), Z(q[1]))); x.stroke(); }); x.globalAlpha = 1; x.lineWidth = 1;
      const olcu = (s0, s1, z, txt, renk) => { x.strokeStyle = renk || '#1b7a3a'; x.fillStyle = renk || '#1b7a3a'; x.lineWidth = 1; const a = X(s0), b = X(s1); x.beginPath(); x.moveTo(a, Z(z)); x.lineTo(b, Z(z)); x.stroke(); [a, b].forEach(q => { x.beginPath(); x.moveTo(q - 4, Z(z) + 4); x.lineTo(q + 4, Z(z) - 4); x.stroke(); }); x.font = '12px Arial'; x.textAlign = 'center'; x.fillText(txt, (a + b) / 2, Z(z) - 4); };
      const olcuD = (z0, z1, s, txt, renk) => { x.strokeStyle = renk || '#1b7a3a'; x.fillStyle = renk || '#1b7a3a'; const q = X(s); x.beginPath(); x.moveTo(q, Z(z0)); x.lineTo(q, Z(z1)); x.stroke(); [z0, z1].forEach(z => { x.beginPath(); x.moveTo(q - 4, Z(z) + 4); x.lineTo(q + 4, Z(z) - 4); x.stroke(); }); x.save(); x.translate(q - 5, (Z(z0) + Z(z1)) / 2); x.rotate(-Math.PI / 2); x.font = '12px Arial'; x.textAlign = 'center'; x.fillText(txt, 0, 0); x.restore(); };
      olcu(0, Y.Lx, -28 / sc, cm(Y.Lx)); olcuD(0, Y.Ly, -30 / sc, cm(Y.Ly));
      st.liste.forEach((o, i) => { if (o.sil || o.gizli) return; const hh = o.sekil === 'D' ? o.w : o.h, x0 = o.x, y0 = o.y, x1 = o.x + o.w, y1 = o.y + hh, sel = i === st.sec;
        x.fillStyle = sel ? 'rgba(11,110,138,.25)' : '#fff'; x.strokeStyle = sel ? '#0b6e8a' : (o.kendi === false ? '#a15c00' : '#13242b'); x.lineWidth = sel ? 2.5 : 1.5;
        if (o.sekil === 'D') { x.beginPath(); x.arc(X(x0 + o.w / 2), Z(y0 + o.w / 2), o.w / 2 * sc, 0, 7); x.fill(); x.stroke(); }
        else { x.fillRect(X(x0), Z(y1), o.w * sc, hh * sc); x.strokeRect(X(x0), Z(y1), o.w * sc, hh * sc); x.beginPath(); x.moveTo(X(x0), Z(y1)); x.lineTo(X(x1), Z(y0)); x.moveTo(X(x0), Z(y0)); x.lineTo(X(x1), Z(y1)); x.stroke(); }
        if (sel) { const ym = (y0 + y1) / 2, xm = (x0 + x1) / 2, r = '#c0392b'; olcu(0, x0, ym, cm(x0), r); olcu(x1, Y.Lx, ym, cm(Y.Lx - x1), r); olcuD(0, y0, xm, cm(y0), r); olcuD(y1, Y.Ly, xm, cm(Y.Ly - y1), r); olcu(x0, x1, y1 + 34 / sc, o.sekil === 'D' ? 'Ø' + cm(o.w) : cm(o.w), '#0b6e8a'); if (o.sekil !== 'D') olcuD(y0, y1, x1 + 14 / sc, cm(hh), '#0b6e8a');
          x.fillStyle = r; x.font = 'bold 12px Arial'; x.textAlign = 'right'; x.fillText(`sol ${cm(x0)}`, X(x0) - 8, Z(ym) - 14); x.textAlign = 'left'; x.fillText(`sağ ${cm(Y.Lx - x1)}`, X(x1) + 8, Z(ym) - 14); x.fillText(`alt ${cm(y0)}`, X(xm) + 6, Z(y0) + 16); x.fillText(`üst ${cm(Y.Ly - y1)}`, X(xm) + 6, Z(y1) - 18); } });
      if (AR) try { AR.ciz(x); } catch (er) { console.error(er); }
    };
    const kenetle = v => Math.round(v * 20) / 20;
    cv.addEventListener('wheel', ev => { ev.preventDefault(); if (!T) return; const r = cv.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top, k2 = Math.max(1, Math.min(200, V.k * (ev.deltaY < 0 ? 1.25 : 0.8))), f = k2 / V.k;
      const W = cv.clientWidth, H = cv.clientHeight, sc0 = T.sc / V.k; V.k = k2; const sc = sc0 * k2; // imleç altı sabit
      const oxN = mx - (mx - T.ox) * f, oyN = my - (my - T.oy) * f; V.dx = oxN - (W - Y.Lx * sc) / 2; V.dy = oyN - (H + Y.Ly * sc) / 2; ciz(); }, { passive: false });
    let surukle = null; cv.addEventListener('mousedown', ev => { if (ev.button === 1 || ev.button === 2 || ev.shiftKey) { surukle = { x: ev.clientX, y: ev.clientY, dx: V.dx, dy: V.dy }; ev.preventDefault(); } });
    const mm = ev => { if (!surukle) return; V.dx = surukle.dx + ev.clientX - surukle.x; V.dy = surukle.dy + ev.clientY - surukle.y; surukle.oynadi = true; ciz(); }, mu = () => { if (surukle) setTimeout(() => { surukle = null; }, 0); };
    window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu); cv.addEventListener('contextmenu', ev => ev.preventDefault());
    const yakinlas = () => { const o = st.sec >= 0 ? st.liste[st.sec] : null; if (!o || !T) return; const W = cv.clientWidth, sc0 = T.sc / V.k; V.k = Math.max(1, Math.min(200, (W * 0.8) / ((Math.max(o.w, 1) + 6) * sc0))); V.dx = 0; V.dy = 0; ciz(); const hh = o.sekil === 'D' ? o.w : o.h; V.dx = W / 2 - T.X(o.x + o.w / 2); V.dy = cv.clientHeight / 2 - T.Z(o.y + hh / 2); ciz(); };
    cv.onclick = ev => { if (!T || (surukle && surukle.oynadi) || ev.shiftKey) return; const r = cv.getBoundingClientRect(), s = (ev.clientX - r.left - T.ox) / T.sc, z = (T.oy - (ev.clientY - r.top)) / T.sc;
      const hit = st.liste.findIndex(o => !o.sil && !o.gizli && (o.sekil === 'D' ? Math.hypot(s - o.x - o.w / 2, z - o.y - o.w / 2) <= o.w / 2 : s >= o.x && s <= o.x + o.w && z >= o.y && z <= o.y + o.h)); if (hit >= 0) { st.sec = hit; alanlar(); listele(); ciz(); return; }
      const o = st.sec >= 0 ? st.liste[st.sec] : null; if (!o || o.kendi === false) return; const hh = o.sekil === 'D' ? o.w : o.h; o.x = kenetle(s - o.w / 2); o.y = kenetle(z - hh / 2); o.degisti = true; alanlar(); listele(); ciz(); };
    $('#dyEkle').onclick = () => { const s = st.yeni.sekil, w = st.yeni.w, h = s === 'D' ? w : st.yeni.h; const o = { sekil: s, w, h, x: kenetle(Y.Lx / 2 - w / 2), y: kenetle(Y.Ly / 2 - h / 2), kendi: true, yeni: true, degisti: true }; st.liste.push(o); st.sec = st.liste.length - 1; alanlar(); listele(); ciz(); };
    $('#dyTum').onclick = () => { V.k = 1; V.dx = 0; V.dy = 0; ciz(); }; $('#dyYak').onclick = yakinlas;
    $('#dySil').onclick = () => { if (st.sec < 0) return; st.liste[st.sec].sil = true; st.sec = -1; alanlar(); listele(); ciz(); };
    $('#dySekil').onchange = () => { const o = st.sec >= 0 ? st.liste[st.sec] : null; st.yeni.sekil = $('#dySekil').value; if (!o || o.kendi === false) return; o.sekil = $('#dySekil').value; if (o.sekil === 'D') o.h = o.w; o.degisti = true; alanlar(); listele(); ciz(); };
    $('#dyBas').textContent = `${ad} — üstten görünüş · ${f2(Y.Lx)} × ${f2(Y.Ly)} m · kalınlık ${cm(Y.t)} cm · üst kot ${f2(Y.zt)}`;
    const kapat = () => { if (AR) AR.kapat(); div.remove(); window.removeEventListener('resize', ciz); window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); window.removeEventListener('keydown', tus, true); acik = null; };
    const tus = ev => { if (ev.key === 'Escape') { if (AR && (AR.S.arac !== 'sec' || AR.S.p1)) return; ev.stopPropagation(); kapat(); } }; window.addEventListener('keydown', tus, true);
    $('#dyKapat').onclick = kapat;
    $('#dyUygula').onclick = () => {
      C.begin && C.begin(); const eski = Array.isArray(e.bosluk3) ? e.bosluk3 : [], yeni = [];
      st.liste.forEach(o => { if (o.sil) return; if (o.yeni || (o.kendi && o.degisti)) yeni.push(bosOlustur(e, Y, o)); else if (eski[o.i]) yeni.push(eski[o.i]); });
      e.bosluk3 = yeni; delete e._c; C.touch && C.touch(e); if ((e.yuzYardim || []).length) yardimModele(e.yuzYardim); C.changed();
      C.log(`${ad}: ${yeni.length} boşluk (${st.liste.filter(o => o.yeni && !o.sil).length} yeni, ${st.liste.filter(o => o.sil && !o.yeni).length} silindi).`); kapat(); };
    const perdelerTum = C.doc.ents.filter(x => x.type === 'perde' && C.layer(x.layer).on);
    // yardımcı çizgiler modelde: döşeme üst kotunda 3B çizgi (KENAR_CIZGI); aynı döşemeden önce çizilenler yenilenir
    const yardimModele = arr => { const lay = 'KENAR_CIZGI'; C.ensureLayer(lay, 3, 'CONTINUOUS', 35); const etk = 'plak:' + e.id;
      const eski = C.doc.ents.filter(x => x.yrdKaynak === etk); C.begin && C.begin(); if (eski.length) C.remove(eski);
      let n = 0; for (const k of arr || []) { const a2 = Y.dis(k[0], k[1]), b2 = Y.dis(k[2], k[3]); const x = C.add(C.newEnt('pline', { pts: [[a2[0], a2[1], Y.zt], [b2[0], b2[1], Y.zt]], closed: false, layer: lay })); x.yrdKaynak = etk; delete x.sp; n++; }
      C.changed(); return n; };
    // ---- çizim araçları + yakalama (yuz-arac.js) ----
    if (C._yuzArac) { const idx = o => st.liste.indexOf(o), hh = o => (o.sekil === 'D' ? o.w : o.h);
      const gOf = o => ({ sekil: o.sekil, cx: o.x + o.w / 2, cy: o.y + hh(o) / 2, w: o.w, h: hh(o) }), merkez = (o, cx, cy) => { o.x = cx - o.w / 2; o.y = cy - hh(o) / 2; o.degisti = true; };
      // perde bantları: eksen + iki yüz; yaylarda 3 ardışık noktadan merkez
      const kenarlar = () => { const k = []; const P = Y.poly; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; k.push([a[0], a[1], b[0], b[1]]); }
        for (const pr of perdeler) for (const o of [0, pr.t / 2, -pr.t / 2]) for (let i = 1; i < pr.p.length; i++) { const a = pr.p[i - 1], b = pr.p[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, n = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L]; k.push([a[0] + n[0] * o, a[1] + n[1] * o, b[0] + n[0] * o, b[1] + n[1] * o]); }
        return k; };
      const merkezler = () => { const out = [{ u: Y.Lx / 2, v: Y.Ly / 2, tip: 'merkez', ad: 'döşeme ortası' }];
        for (const pr of perdeler) { const P = pr.p; for (let i = 1; i + 1 < P.length; i++) { const a = P[i - 1], b = P[i], c = P[i + 1], d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])); if (Math.abs(d) < 1e-9) continue; const ux = ((a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) + (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) + (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])) / d, uy = ((a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) + (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) + (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])) / d, R = Math.hypot(a[0] - ux, a[1] - uy);
            if (R < 50 && R > 0.3 && !out.some(q => Math.hypot(q.u - ux, q.v - uy) < 0.05)) out.push({ u: ux, v: uy, tip: 'merkez', ad: `yay merkezi R=${cm(R)}` }); } }
        return out; };
      AR = C._yuzArac.bagla({ cv, panel: $('#dyAlan').parentElement, T: () => T, sinir: () => [0, 0, Y.Lx, Y.Ly], kenar: kenarlar, noktalar: merkezler, kilavuz: () => [{ u: Y.Lx / 2, ad: 'döşeme ekseni' }, { v: Y.Ly / 2, ad: 'döşeme ekseni' }],
        liste: () => st.liste.map((o, i) => ({ o, i, g: gOf(o), kendi: o.kendi })).filter(L => !L.o.sil && !L.o.gizli),
        merkezAyarla: (o, cx, cy) => { merkez(o, cx, cy); alanlar(); listele(); },
        yeni: (sekil, cx, cy, w, h) => { const o = { sekil, w, h: sekil === 'D' ? w : h, x: 0, y: 0, kendi: true, yeni: true, degisti: true }; merkez(o, cx, cy); st.liste.push(o); return o; },
        kopya: o => { const n = Object.assign({}, o, { kendi: true, yeni: true, degisti: true }); delete n.i; st.liste.push(n); return n; },
        yardimAl: () => (e.yuzYardim || []).map(k => k.slice()), yardimYaz: arr => { e.yuzYardim = arr; },
        modeleCiz: arr => yardimModele(arr),
        perdeYap: (k, t, hiza) => { const A2 = Y.dis(k[0], k[1]), B2 = Y.dis(k[2], k[3]); if (Math.hypot(B2[0] - A2[0], B2[1] - A2[1]) < 0.2) return 'Çizgi çok kısa.';
          const ust = perdelerTum.length ? Math.max(...perdelerTum.map(x => (+x.z0 || 0) + (+x.h || 3))) : Y.zt + 3, z0 = Y.zt, h = Math.max(0.5, ust - z0), ornek = perdelerTum[0];
          C.begin && C.begin(); const p2 = C.add(C.newEnt('perde', { pts: [[A2[0], A2[1], 0], [B2[0], B2[1], 0]], closed: false, hiza: hiza || 'O', tb: t, tt: t, h, z0, malz: 'beton' })); if (ornek && ornek.layer) p2.layer = ornek.layer; delete p2.sp; C.changed();
          C.log(`Yardımcı çizgiden perde: ${(Math.hypot(B2[0] - A2[0], B2[1] - A2[1])).toFixed(2)} m, t=${Math.round(t * 100)} cm, ${z0.toFixed(2)} → ${(z0 + h).toFixed(2)} (komşu perdelerin üstüne kadar). Kalınlık / yükseklik Özellikler'den değiştirilebilir.`); return null; },
        sec: o => { st.sec = idx(o); alanlar(); listele(); }, secili: () => st.sec, sil: o => { o.sil = true; st.sec = -1; alanlar(); listele(); }, yenile: () => ciz() }); }
    window.addEventListener('resize', ciz); alanlar(); listele(); setTimeout(ciz, 30);
    acik = { kapat, st, div, Y };
    return acik;
  };
  C.plakYuzAc = ac;
  const plakMi = e => e && e.type === 'plak' && Array.isArray(e.pts) && e.pts.length >= 3;

  if (typeof document !== 'undefined') setTimeout(() => {
    const plan = document.querySelector('#cvPlan'), v3 = document.querySelector('#cv3d');
    if (plan) plan.addEventListener('dblclick', ev => { if ((C.cmd && C.cmd.running) || !C.views || ev.button !== 0 || ev.ctrlKey) return; const r = plan.getBoundingClientRect(), V = C.views.plan, e = V.pick(ev.clientX - r.left, ev.clientY - r.top); if (!plakMi(e)) return; ev.stopImmediatePropagation(); ev.preventDefault(); ac(e); }, true);
    if (v3) v3.addEventListener('dblclick', ev => { if ((C.cmd && C.cmd.running) || !C.views || ev.button !== 0 || ev.ctrlKey) return; const r = v3.getBoundingClientRect(), f = C.views.v3.pick(ev.clientX - r.left, ev.clientY - r.top); if (!f || !plakMi(f.e)) return; ev.stopImmediatePropagation(); ev.preventDefault(); ac(f.e); }, true);
  }, 0);
  C.addCommand(['DOSEMEYUZ', 'PLAKYUZ', 'RADYEYUZ'], 'Döşeme / radye boşluk düzenleyici (ya da döşemeye çift tıklayın): üstten görünüş ölçülü açılır; delik / boşluk sayıyla ya da tıklayarak eklenir, taşınır, silinir', async (I) => {
    let e = (C.sel || []).find(plakMi);
    if (!e) { const p = await I.pt('Döşemeye / radyeye tıklayın'); if (!p || typeof p === 'string') return;
      try { const v = C.views && C.views.v3; if (C.viewName && C.viewName() === '3d' && v && v.mouse) { const f = v.pick(v.mouse[0], v.mouse[1]); if (f && plakMi(f.e)) e = f.e; } } catch (er) { }
      if (!e) { const ad = C.doc.ents.filter(x => plakMi(x) && C.layer(x.layer).on && C.pointInPoly([p[0], p[1]], x.pts)).sort((a, b) => (+b.zt || 0) - (+a.zt || 0)); e = ad[0]; } }
    if (!e) { C.warn('Döşeme / radye bulunamadı.'); return; }
    ac(e);
  }, { noUndo: true });
  const serit = () => { try {
    const R = C.ribbon, BT = { cmd: 'DOSEMEYUZ', t: 'Döşeme / radye boşluk düzenle', i: 'slab' };
    const ekle = () => { let d = false; for (const t of (R && R.tabs) || []) for (const p of t[1]) if ((t[0] === 'İnşaat' && p[0] === 'Taşıyıcı sistem') || (t[0] === '3B Modelleme' && p[0] === 'Modelle')) if (!p[1].some(x => x.cmd === BT.cmd)) { p[1].push(BT); d = true; } return d; };
    if (R && !R._plakYuz) { R._plakYuz = true; const r0 = R.render; R.render = function () { try { ekle(); } catch (er) { } const x = r0.apply(this, arguments); try { if (ekle()) r0.apply(this, arguments); } catch (er) { } return x; }; R.render(); }
  } catch (er) { console.error('DOSEMEYUZ şerit', er); } };
  if (typeof window !== 'undefined') { if (document.readyState === 'complete') serit(); else window.addEventListener('load', serit); }
})(window.C);

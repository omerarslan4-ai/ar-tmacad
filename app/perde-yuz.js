/* ArıtmaCAD — PERDE YÜZ DÜZENLEYİCİ (ayrı modül)
   PERDEYUZ (YUZDUZENLE, PERDEGORUNUS): bir perdeyi seçin → perdenin seçilen yüzü düz 2B görünüş olarak açılır
   (yay perdeler yay boyunca AÇILIM olarak). Görünüşte perde kenarları, kotlar ve mevcut boşluklar ölçülüdür.
   Delik / boşluk: dikdörtgen ya da daire; "sol kenardan", "alttan", genişlik, yükseklik / çap sayıyla yazılır
   ya da görünüşte tıklanıp yerleştirilir (5 cm kenetleme). Uygula → boşluk 3B perdeye boydan boya işlenir (e.bosluk3,
   İT/ÇEK boşluklarıyla aynı veri: 3B, kesit, görünüş ve paftalarda görünür). Düzenleyiciyle açılan boşluklar sonradan
   yeniden açılıp sayıyla değiştirilebilir / silinebilir. */
(function (C) {
  'use strict';
  const r4 = v => Math.round(v * 10000) / 10000, cm = v => String(Math.round(v * 100)), f2 = v => (+v).toFixed(2);
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], len = a => Math.hypot(a[0], a[1]);

  /* ---------- perde yüzü: istasyon (s) ↔ plan noktası ---------- */
  const yuzHat = (e, taraf) => { // taraf: 'A' (sol, +nn) | 'B' (sağ)
    const I = C._ins, F = I.faceOffs(e), sf = I.segFrames(e), kap = !sf[sf.length - 1].openE && sf.length > 2, off = taraf === 'A' ? F.lB : F.rB, ofE = (F.lB + F.rB) / 2;
    const kes = (A, B) => { const d1 = sub(A[1], A[0]), d2 = sub(B[1], B[0]), den = d1[0] * d2[1] - d1[1] * d2[0]; if (Math.abs(den) < 1e-9) return A[1]; const t = ((B[0][0] - A[0][0]) * d2[1] - (B[0][1] - A[0][1]) * d2[0]) / den; return [A[0][0] + d1[0] * t, A[0][1] + d1[1] * t]; };
    const cizgi = o => { const S = sf.map(s => [[s.a[0] + s.nn[0] * o, s.a[1] + s.nn[1] * o], [s.b[0] + s.nn[0] * o, s.b[1] + s.nn[1] * o]]), out = []; for (let i = 0; i < S.length; i++) { if (i === 0) out.push(kap ? kes(S[S.length - 1], S[0]) : S[0][0]); if (i < S.length - 1) out.push(kes(S[i], S[i + 1])); else if (!kap) out.push(S[i][1]); } if (kap) out.push(out[0]); return out; };
    const pts = cizgi(off); if (taraf === 'A') pts.reverse(); // ekranda istasyon hep soldan sağa artar (yüze dışarıdan bakış)
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + len(sub(pts[i], pts[i - 1])));
    const nrm = -1, z0 = +e.z0 || 0, z1 = z0 + (+e.h || 3), t = F.tb;
    const at = s => { s = Math.max(0, Math.min(cum[cum.length - 1], s)); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const a = pts[i - 1], b = pts[i], L = cum[i] - cum[i - 1] || 1, u = (s - cum[i - 1]) / L, tan = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; return { p: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], tan, n: [-tan[1] * nrm, tan[0] * nrm] }; };
    const proj = q => { let best = null; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], d = sub(b, a), L2 = d[0] * d[0] + d[1] * d[1] || 1, u = Math.max(0, Math.min(1, ((q[0] - a[0]) * d[0] + (q[1] - a[1]) * d[1]) / L2)), dd = Math.hypot(a[0] + d[0] * u - q[0], a[1] + d[1] * u - q[1]); if (!best || dd < best.d) best = { d: dd, s: cum[i - 1] + u * Math.sqrt(L2) }; } return best.s; };
    return { pts, cum, L: cum[cum.length - 1], at, proj, z0, z1, t, kap, ofE, nrm };
  };

  /* ---------- perde PARÇALARI: düz kenarlar ve yaylar ayrı yüz olarak seçilir (P1, P2 …) ---------- */
  const parcalar = Y => { const P = Y.pts, n = P.length - 1, segs = [];
    for (let k = 0; k < n; k++) { const a = P[k], b = P[k + 1], l = len(sub(b, a)); segs.push({ k, l, d: l ? [(b[0] - a[0]) / l, (b[1] - a[1]) / l] : [1, 0], s0: Y.cum[k], s1: Y.cum[k + 1] }); }
    const don = (u, v) => Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]), D = Math.PI / 180, N = segs.length;
    const tr = k => { if (k < 0 || k >= N - 1) { if (!Y.kap) return null; return don(segs[(k + N) % N].d, segs[(k + 1 + N) % N].d); } return don(segs[k].d, segs[k + 1].d); };
    segs.forEach((g, k) => { const t1 = tr(k - 1), t2 = tr(k), yay = q => q != null && Math.abs(q) > 0.3 * D && Math.abs(q) < 25 * D; g.yay = g.l < 2.5 && (yay(t1) || yay(t2)); });
    const out = []; let cur = null;
    segs.forEach((g, k) => { const t = k ? tr(k - 1) : null, kirik = t != null && Math.abs(t) >= 25 * D, tersYon = cur && cur.tip === 'yay' && g.yay && t != null && cur.sg && Math.sign(t) !== cur.sg && Math.abs(t) > 0.3 * D;
      if (!cur || kirik || tersYon || cur.tip !== (g.yay ? 'yay' : 'duz') || (!g.yay && t != null && Math.abs(t) > 0.3 * D)) { cur = { tip: g.yay ? 'yay' : 'duz', s0: g.s0, s1: g.s1, aci: 0, sg: 0 }; out.push(cur); } else { cur.s1 = g.s1; if (t != null) { cur.aci += t; cur.sg = cur.sg || Math.sign(t); } } });
    if (Y.kap && out.length > 1) { const a = out[0], z = out[out.length - 1], t = tr(N - 1); if (a.tip === z.tip && t != null && Math.abs(t) < 25 * D && (a.tip === 'yay' || Math.abs(t) < 0.3 * D)) { a.s0 = z.s0 - Y.L; a.aci += z.aci + t; out.pop(); } }
    return out.map((q, i) => { const L = q.s1 - q.s0, th = Math.abs(q.aci) + (q.tip === 'yay' ? Math.abs(q.aci) / Math.max(1, Math.round(L / 0.5)) : 0); return Object.assign(q, { i, L, R: q.tip === 'yay' && th > 1e-3 ? L / th : null, th, ad: `P${i + 1} — ${q.tip === 'yay' ? 'yay' : 'düz'} ${f2(L)} m${q.tip === 'yay' && th > 1e-3 ? ` (R≈${f2(L / th)}, ${Math.round(th / D)}°)` : ''}` }); }); };
  // görünüm: yalnız seçili parça (s → tam yüz istasyonu: s + s0)
  const parcaGorunum = (Y, pc) => { if (!pc) return Y; const L = Y.L, md = s => (Y.kap ? ((s % L) + L) % L : s), at = s => Y.at(md(s + pc.s0)), cum = [0];
    for (const c of Y.cum) { let v = c - pc.s0; if (Y.kap) v = ((v % L) + L) % L; if (v > 1e-6 && v < pc.L - 1e-6) cum.push(v); } cum.sort((a, b) => a - b); cum.push(pc.L);
    return Object.assign({}, Y, { L: pc.L, at, cum, proj: q => { let v = Y.proj(q) - pc.s0; if (Y.kap) v = ((v % L) + L) % L; return v; }, parca: pc }); };

  /* ---------- boşluk ↔ bosluk3 ---------- */
  const bosOlustur = (e, Y, o) => { // o: {sekil:'R'|'D', s, z, w, h} (s, z: sol-alt köşe; daire: merkez)
    const sc = o.sekil === 'D' ? o.s : o.s + o.w / 2, zc = Y.z0 + (o.sekil === 'D' ? o.z : o.z + o.h / 2), A = Y.at(sc), w = o.sekil === 'D' ? o.w : o.w, R = Math.abs(A.n[0]) + Math.abs(A.n[1]) > 0 ? 1 : 1; void R;
    // eğri perdede kiriş sapması kadar fazladan derinlik
    const sap = Y.kap || Y.pts.length > 2 ? w * w / 8 / Math.max(0.5, egrilik(Y, sc)) : 0, dis = 0.05 + sap, D = Y.t + 0.1 + 2 * sap;
    const base = [A.p[0] + A.n[0] * dis, A.p[1] + A.n[1] * dis], P3 = (u, v) => [base[0] + A.tan[0] * u, base[1] + A.tan[1] * u, zc + v]; // yuvarlama yok: taban tam düzlemsel kalmalı (CSG)
    let pts; if (o.sekil === 'D') { const r = o.w / 2; pts = Array.from({ length: 24 }, (_, i) => { const a = 2 * Math.PI * i / 24; return P3(r * Math.cos(a), r * Math.sin(a)); }); } else pts = [P3(-o.w / 2, -o.h / 2), P3(o.w / 2, -o.h / 2), P3(o.w / 2, o.h / 2), P3(-o.w / 2, o.h / 2)];
    const ana = { pts, d: [r4(-A.n[0] * D), r4(-A.n[1] * D), 0], yuzEd: { sekil: o.sekil, s: r4(o.s), z: r4(o.z), w: r4(o.w), h: r4(o.h), taraf: o.taraf, ...(o.pah > 0 ? { pah: r4(o.pah) } : {}) } };
    if (!(o.pah > 0)) return ana;
    // 45° pah: her iki yüzde boşluk kenarı boyunca kesik koni / piramit (dışta boşluk + 2·pah, pah derinliğinde boşluk ölçüsü)
    const p = o.pah, F = (taban, u0, v0, ek) => { const Q = (u, v) => [taban[0] + A.tan[0] * u, taban[1] + A.tan[1] * u, zc + v]; if (o.sekil === 'D') { const r = o.w / 2 + ek; return Array.from({ length: 24 }, (_, i) => { const a = 2 * Math.PI * i / 24; return Q(r * Math.cos(a), r * Math.sin(a)); }); } return [Q(-o.w / 2 - ek, -o.h / 2 - ek), Q(o.w / 2 + ek, -o.h / 2 - ek), Q(o.w / 2 + ek, o.h / 2 + ek), Q(-o.w / 2 - ek, o.h / 2 + ek)]; };
    const yz = (k) => [A.p[0] + A.n[0] * k, A.p[1] + A.n[1] * k], e2 = 0.003;
    const pahA = { pts: F(yz(e2), 0, 0, p + e2), ptsB: F(yz(-p), 0, 0, 0), d: [r4(-A.n[0] * (p + e2)), r4(-A.n[1] * (p + e2)), 0], pahIcin: true };
    const pahB = { pts: F(yz(-Y.t - e2), 0, 0, p + e2), ptsB: F(yz(-Y.t + p), 0, 0, 0), d: [r4(A.n[0] * (p + e2)), r4(A.n[1] * (p + e2)), 0], pahIcin: true };
    return [ana, pahA, pahB];
  };
  const egrilik = (Y, s) => { const a = Y.at(Math.max(0, s - 0.5)), b = Y.at(Math.min(Y.L, s + 0.5)), ang = Math.abs(Math.atan2(a.tan[0] * b.tan[1] - a.tan[1] * b.tan[0], a.tan[0] * b.tan[0] + a.tan[1] * b.tan[1])); return ang > 1e-4 ? 1 / ang : 1e6; };
  const bosOku = (e, Y) => bosOku0(e, Y).map((o, i, arr) => { if (o.pahIcin) { let j = i - 1; while (j >= 0 && arr[j].pahIcin) j--; o.ana = j; } return o; });
  const bosOku0 = (e, Y) => (Array.isArray(e.bosluk3) ? e.bosluk3 : []).map((b, i) => {
    if (b && b.pahIcin) return { i, gizli: true, pahIcin: true, sekil: 'R', s: -99, z: -99, w: 0, h: 0 };
    if (b.yuzEd) { const o = Object.assign({}, b.yuzEd); if (o.taraf !== Y.taraf) { o.s = o.sekil === 'D' ? Y.L - o.s : Y.L - o.s - o.w; } return Object.assign(o, { i, kendi: true }); } // öbür yüzden bakınca ayna (yaklaşık: yüz boyları farklıysa kayar)
    const ss = b.pts.map(q => Y.proj(q)), zs = b.pts.map(q => q[2] || 0), s0 = Math.min(...ss), s1 = Math.max(...ss), z0 = Math.min(...zs), z1 = Math.max(...zs);
    return { i, sekil: 'R', s: s0, z: z0 - Y.z0, w: s1 - s0, h: z1 - z0, kendi: false, boru: b.boru != null };
  });

  /* ================= PENCERE ================= */
  let acik = null;
  const ac = (e, taraf0, nokta) => {
    if (acik) acik.kapat();
    const st = { taraf: taraf0 === 'B' ? 'B' : 'A', liste: [], sec: -1, yeni: { sekil: 'R', s: 1, z: 0.5, w: 0.6, h: 0.6 } };
    const div = document.createElement('div'); div.style.cssText = 'position:fixed;inset:0;background:rgba(10,18,24,.55);z-index:9999;display:flex;align-items:center;justify-content:center;font:13px Segoe UI,Arial,sans-serif';
    div.id = 'pyDlg';
    div.innerHTML = `<style>#pyDlg button,#pyDlg input,#pyDlg select{background:#fff;color:#13242b;border:1px solid #9fb0b5;border-radius:4px;padding:4px 8px;font:13px Segoe UI,Arial}#pyDlg input:disabled{background:#eef1f2;color:#6a7a80}#pyDlg #pyUygula{background:#0b6e8a;color:#fff;border-color:#0b6e8a}</style><div style="background:#fff;color:#13242b;border-radius:8px;width:min(1280px,96vw);height:min(820px,94vh);display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.4)">
      <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #d5dde0"><b id="pyBas" style="flex:1"></b>
        <select id="pyParca" title="Perdenin yalnız bir parçasını (düz kenar / yay) göster"></select><button id="pyTum">Tümü</button><button id="pyYak">Seçiliye yakınlaş</button><button id="pyTaraf">Öbür yüzden bak</button><button id="pyKapat">Kapat</button><button id="pyUygula" style="background:#0b6e8a;color:#fff;border:0;padding:6px 14px;border-radius:4px">Uygula</button></div>
      <div style="flex:1;display:flex;min-height:0"><canvas id="pyC" style="flex:1;min-width:0;cursor:crosshair"></canvas>
        <div style="width:300px;border-left:1px solid #d5dde0;padding:10px;overflow:auto">
          <div style="font-weight:700;margin-bottom:6px">Boşluk / delik</div>
          <label>Şekil <select id="pySekil"><option value="R">Dikdörtgen</option><option value="D">Daire (boru geçişi)</option></select></label>
          <div id="pyAlan" style="display:grid;grid-template-columns:1fr 90px;gap:4px 6px;align-items:center;margin:8px 0"></div>
          <div style="display:flex;gap:6px"><button id="pyEkle">+ Yeni boşluk</button><button id="pySil">Seçiliyi sil</button></div>
          <p style="color:#5a6b71;font-size:12px">Fare tekerleği: yakınlaştır · sağ tuş / orta tuş / Shift + sürükle: kaydır. Görünüşe tıklayınca seçili boşluk oraya taşınır (5 cm kenetleme). Mevcut boşluğa tıklayınca seçilir. Ölçüler cm olarak çizimde, m olarak kutularda.</p>
          <div style="font-weight:700;margin:8px 0 4px">Boşluklar</div><div id="pyListe"></div>
        </div></div></div>`;
    document.body.appendChild(div);
    const $ = s => div.querySelector(s), cv = $('#pyC');
    let Yf = yuzHat(e, st.taraf), Y = Yf, PR = parcalar(Yf); st.parca = -1;
    if (nokta && PR.length > 1) { try { const sp = Yf.proj(nokta); const k = PR.findIndex(q => { let v = sp - q.s0; if (Yf.kap) v = ((v % Yf.L) + Yf.L) % Yf.L; return v >= -1e-6 && v <= q.L + 1e-6; }); if (k >= 0) st.parca = k; } catch (er) { } }
    const md = v => (Yf.kap ? ((v % Yf.L) + Yf.L) % Yf.L : v);
    const yukle = () => { Yf = yuzHat(e, st.taraf); Yf.taraf = st.taraf; PR = parcalar(Yf); if (st.parca >= PR.length) st.parca = -1; const pc = st.parca >= 0 ? PR[st.parca] : null; Y = parcaGorunum(Yf, pc); Y.taraf = st.taraf;
      st.liste = bosOku(e, Yf).map(o => { const q = Object.assign({}, o, { degisti: false }); if (pc && !q.pahIcin) { const c = q.sekil === 'D' ? q.s : q.s + q.w / 2, v = md(c - pc.s0); q.s = q.sekil === 'D' ? v : v - q.w / 2; if (v < -1e-6 || v > pc.L + 1e-6) q.gizli = true; } return q; }); if (AR) AR.yardimYenile(); };
    yukle();
    const parcaDoldur = () => { const sl = $('#pyParca'); sl.innerHTML = `<option value="-1">Tüm perde${PR.length > 1 ? ' (' + PR.length + ' parça)' : ''}</option>` + PR.map((q, i) => `<option value="${i}">${q.ad}</option>`).join(''); sl.value = String(st.parca); sl.style.display = PR.length > 1 ? '' : 'none'; };
    parcaDoldur();
    const alanlar = () => { const o = st.sec >= 0 ? st.liste[st.sec] : null, g = $('#pyAlan');
      if (!o) { g.innerHTML = '<span style="grid-column:1/3;color:#5a6b71">Boşluk seçili değil — "+ Yeni boşluk".</span>'; return; }
      $('#pySekil').value = o.sekil; const F = o.sekil === 'D' ? [['s', 'Sol kenardan merkeze (m)'], ['z', 'Perde altından merkeze (m)'], ['w', 'Çap (m)']] : [['s', 'Sol kenardan (m)'], ['z', 'Perde altından (m)'], ['w', 'Genişlik (m)'], ['h', 'Yükseklik (m)']];
      g.innerHTML = F.map(([k, t]) => `<span>${t}</span><input data-k="${k}" type="number" step="0.05" value="${f2(o[k])}" ${o.kendi === false ? 'disabled' : ''}>`).join('') + `<span>Sağ kenara (m)</span><b>${f2(Y.L - o.s - (o.sekil === 'D' ? o.w / 2 : o.w))}</b><span>Alt / üst kot</span><b>${f2(Y.z0 + o.z - (o.sekil === 'D' ? o.w / 2 : 0))} / ${f2(Y.z0 + o.z + (o.sekil === 'D' ? o.w / 2 : o.h))}</b>${o.kendi === false ? `<span style="grid-column:1/3;color:#a15c00">${o.boru ? 'Boru geçişi boşluğu (boruyla birlikte değişir)' : 'İT/ÇEK ile açılmış boşluk'} — burada yalnız silinebilir.</span>` : ''}`;
      const pcN = st.parca >= 0 ? PR[st.parca] : null, kon = [];
      if (o.kendi !== false) { if (pcN) { kon.push(['orta', pcN.tip === 'yay' ? 'Yay ortası' : 'Parça ortası']); if (pcN.tip === 'yay' && pcN.th > 0) for (let a = 45; a < pcN.th * 180 / Math.PI - 1; a += 45) kon.push(['a' + a, `Yay başından ${a}°`]); } else kon.push(['orta', 'Perde ortası']);
        g.insertAdjacentHTML('beforeend', `<span>Pah 45° (cm)</span><input data-k="pahcm" type="number" step="1" min="0" value="${Math.round((o.pah || 0) * 100)}"><span>Hazır konum</span><select id="pyKonum"><option value="">—</option>${kon.map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select>`);
        $('#pyKonum').onchange = ev => { const k = ev.target.value; if (!k) return; const Lp = Y.L, th = pcN && pcN.th ? pcN.th : 0, c = k === 'orta' ? Lp / 2 : (th ? Lp * (+k.slice(1) * Math.PI / 180) / th : Lp / 2); o.s = o.sekil === 'D' ? c : c - o.w / 2; o.degisti = true; alanlar(); listele(); ciz(); }; }
      g.querySelectorAll('input').forEach(inp => inp.oninput = () => { const v = +inp.value; if (!isFinite(v)) return; if (inp.dataset.k === 'pahcm') o.pah = Math.max(0, v) / 100; else o[inp.dataset.k] = v; if (o.sekil === 'D') o.h = o.w; o.degisti = true; ciz(); listele(); }); };
    const listele = () => { $('#pyListe').innerHTML = st.liste.map((o, i) => o.sil || o.gizli ? '' : `<div data-i="${i}" style="padding:4px 6px;margin:2px 0;border-radius:4px;cursor:pointer;background:${i === st.sec ? '#d8eef5' : '#f1f4f5'}">${i + 1}. ${o.sekil === 'D' ? `Ø${cm(o.w)}` : `${cm(o.w)}×${cm(o.h)}`} — sol ${cm(o.s)}, alt ${cm(o.z)}${o.kendi === false ? ' (dış)' : ''}${o.yeni ? ' • yeni' : o.degisti ? ' • değişti' : ''}</div>`).join('') || '<span style="color:#5a6b71">Boşluk yok.</span>';
      $('#pyListe').querySelectorAll('[data-i]').forEach(d => d.onclick = () => { st.sec = +d.dataset.i; alanlar(); listele(); ciz(); }); };
    // çizim
    let T = null, AR = null; const V = { k: 1, dx: 0, dy: 0 }; // yakınlaştırma / kaydırma
    const ciz = () => {
      if (!div.isConnected || cv.clientWidth < 100 || cv.clientHeight < 100) return;
      const W = cv.clientWidth, H = cv.clientHeight; cv.width = W * devicePixelRatio; cv.height = H * devicePixelRatio; const x = cv.getContext('2d'); x.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
      const Hh = Y.z1 - Y.z0, pad = 80, sc0 = Math.min((W - 2 * pad) / Y.L, (H - 2 * pad) / Hh), sc = sc0 * V.k, ox = (W - Y.L * sc0) / 2 * 1 + V.dx - (V.k - 1) * Y.L * sc0 / 2, oy = (H + Hh * sc0) / 2 + V.dy + (V.k - 1) * Hh * sc0 / 2;
      const ayna = false;
      const X = s => ox + (ayna ? Y.L - s : s) * sc, Z = z => oy - z * sc; T = { X, Z, sc, ayna, ox, oy };
      // ızgara 1 m
      x.strokeStyle = '#eef2f3'; x.lineWidth = 1; for (let s = 0; s <= Y.L + 1e-6; s += 1) { x.beginPath(); x.moveTo(X(s), Z(0)); x.lineTo(X(s), Z(Hh)); x.stroke(); } for (let z = 0; z <= Hh + 1e-6; z += 1) { x.beginPath(); x.moveTo(X(0), Z(z)); x.lineTo(X(Y.L), Z(z)); x.stroke(); }
      // perde
      x.fillStyle = '#e7ecee'; x.strokeStyle = '#13242b'; x.lineWidth = 2; x.fillRect(Math.min(X(0), X(Y.L)), Z(Hh), Y.L * sc, Hh * sc); x.strokeRect(Math.min(X(0), X(Y.L)), Z(Hh), Y.L * sc, Hh * sc);
      // yay bölümleri (kırık noktaları) kesik çizgi
      x.setLineDash([4, 4]); x.strokeStyle = '#9fb0b5'; x.lineWidth = 1; for (let i = 1; i < Y.cum.length - 1; i++) { const a = Y.at(Y.cum[i] - 0.01), b = Y.at(Y.cum[i] + 0.01); const ang = Math.abs(Math.atan2(a.tan[0] * b.tan[1] - a.tan[1] * b.tan[0], a.tan[0] * b.tan[0] + a.tan[1] * b.tan[1])); const l1 = Y.cum[i] - Y.cum[i - 1], l2 = Y.cum[i + 1] - Y.cum[i]; if (ang > 20 * Math.PI / 180 || (ang > 0.2 * Math.PI / 180 && Math.max(l1, l2) > 3 * Math.min(l1, l2))) { x.beginPath(); x.moveTo(X(Y.cum[i]), Z(0)); x.lineTo(X(Y.cum[i]), Z(Hh)); x.stroke(); } } x.setLineDash([]);
      const olcu = (s0, s1, z, txt, renk) => { x.strokeStyle = renk || '#1b7a3a'; x.fillStyle = renk || '#1b7a3a'; x.lineWidth = 1; const a = X(s0), b = X(s1); x.beginPath(); x.moveTo(a, Z(z)); x.lineTo(b, Z(z)); x.stroke(); [a, b].forEach(q => { x.beginPath(); x.moveTo(q - 4, Z(z) + 4); x.lineTo(q + 4, Z(z) - 4); x.stroke(); }); x.font = '12px Arial'; x.textAlign = 'center'; x.fillText(txt, (a + b) / 2, Z(z) - 4); };
      const olcuD = (z0, z1, s, txt, renk) => { x.strokeStyle = renk || '#1b7a3a'; x.fillStyle = renk || '#1b7a3a'; const q = X(s); x.beginPath(); x.moveTo(q, Z(z0)); x.lineTo(q, Z(z1)); x.stroke(); [z0, z1].forEach(z => { x.beginPath(); x.moveTo(q - 4, Z(z) + 4); x.lineTo(q + 4, Z(z) - 4); x.stroke(); }); x.save(); x.translate(q - 5, (Z(z0) + Z(z1)) / 2); x.rotate(-Math.PI / 2); x.font = '12px Arial'; x.textAlign = 'center'; x.fillText(txt, 0, 0); x.restore(); };
      olcu(0, Y.L, -0.6 * 40 / sc * 0 - 28 / sc, cm(Y.L)); olcuD(0, Hh, ayna ? Y.L + 30 / sc : -30 / sc, cm(Hh));
      x.fillStyle = '#13242b'; x.font = '12px Arial'; x.textAlign = 'left'; x.fillText(`▽ ${f2(Y.z1)}`, Math.max(X(0), X(Y.L)) + 8, Z(Hh) + 4); x.fillText(`▽ ${f2(Y.z0)}`, Math.max(X(0), X(Y.L)) + 8, Z(0) + 4);
      x.textAlign = 'center'; 
      // boşluklar
      st.liste.forEach((o, i) => { if (o.sil || o.gizli) return; const s0 = o.sekil === 'D' ? o.s - o.w / 2 : o.s, s1 = s0 + o.w, z0 = o.sekil === 'D' ? o.z - o.w / 2 : o.z, z1 = z0 + (o.sekil === 'D' ? o.w : o.h), sel = i === st.sec;
        x.fillStyle = sel ? 'rgba(11,110,138,.25)' : 'rgba(255,255,255,1)'; x.strokeStyle = sel ? '#0b6e8a' : (o.kendi === false ? '#a15c00' : '#13242b'); x.lineWidth = sel ? 2.5 : 1.5;
        if (o.sekil === 'D') { x.beginPath(); x.arc(X(o.s), Z(o.z), o.w / 2 * sc, 0, 7); x.fill(); x.stroke(); } else { const a = Math.min(X(s0), X(s1)); x.fillRect(a, Z(z1), o.w * sc, (z1 - z0) * sc); x.strokeRect(a, Z(z1), o.w * sc, (z1 - z0) * sc); x.beginPath(); x.moveTo(a, Z(z1)); x.lineTo(a + o.w * sc, Z(z0)); x.moveTo(a, Z(z0)); x.lineTo(a + o.w * sc, Z(z1)); x.stroke(); }
        if (sel) { const zm = (z0 + z1) / 2, sm = (s0 + s1) / 2, r = '#c0392b'; olcu(0, s0, zm, cm(s0), r); olcu(s1, Y.L, zm, cm(Y.L - s1), r); olcuD(0, z0, sm, cm(z0), r); olcuD(z1, Hh, sm, cm(Hh - z1), r); olcu(s0, s1, z1 + 14 / sc, o.sekil === 'D' ? 'Ø' + cm(o.w) : cm(o.w), '#0b6e8a'); { x.fillStyle = '#c0392b'; x.font = 'bold 12px Arial'; const yL = Z(zm) - 4, sol = X(s0), sag = X(s1); x.textAlign = T.ayna ? 'left' : 'right'; x.fillText(`sol ${cm(s0)}`, sol + (T.ayna ? 8 : -8), yL - 10); x.textAlign = T.ayna ? 'right' : 'left'; x.fillText(`sağ ${cm(Y.L - s1)}`, sag + (T.ayna ? -8 : 8), yL - 10); x.textAlign = 'left'; x.fillText(`alt ${cm(z0)}`, X(sm) + 6, Z(z0) + 16); x.fillText(`üst ${cm(Hh - z1)}`, X(sm) + 6, Z(z1) - 18); } if (o.sekil !== 'D') olcuD(z0, z1, s1 + 14 / sc * (ayna ? -1 : 1), cm(o.h), '#0b6e8a'); } });
      if (AR) try { AR.ciz(x); } catch (er) { console.error(er); }
    };
    const kenetle = v => Math.round(v * 20) / 20;
    cv.addEventListener('wheel', ev => { ev.preventDefault(); if (!T) return; const r = cv.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top, f = ev.deltaY < 0 ? 1.25 : 0.8, k2 = Math.max(1, Math.min(200, V.k * f)), ff = k2 / V.k;
      // imleç altındaki nokta sabit kalsın
      const W = cv.clientWidth, H = cv.clientHeight, Hh = Y.z1 - Y.z0, sc0 = T.sc / V.k; const ox0 = (W - Y.L * sc0) / 2 - (V.k - 1) * Y.L * sc0 / 2, oy0 = (H + Hh * sc0) / 2 + (V.k - 1) * Hh * sc0 / 2; void ox0; void oy0;
      const oxA = T.ox, oyA = T.oy; V.k = k2; const oxB = (W - Y.L * sc0) / 2 - (V.k - 1) * Y.L * sc0 / 2, oyB = (H + Hh * sc0) / 2 + (V.k - 1) * Hh * sc0 / 2;
      V.dx = mx - (mx - oxA) * ff - oxB; V.dy = my - (my - oyA) * ff - oyB; ciz(); }, { passive: false });
    let surukle = null; cv.addEventListener('mousedown', ev => { if (ev.button === 1 || ev.button === 2 || ev.shiftKey) { surukle = { x: ev.clientX, y: ev.clientY, dx: V.dx, dy: V.dy }; ev.preventDefault(); } });
    window.addEventListener('mousemove', ev => { if (!surukle) return; V.dx = surukle.dx + ev.clientX - surukle.x; V.dy = surukle.dy + ev.clientY - surukle.y; surukle.oynadi = true; ciz(); });
    window.addEventListener('mouseup', () => { if (surukle) setTimeout(() => { surukle = null; }, 0); }); cv.addEventListener('contextmenu', ev => ev.preventDefault());
    const yakinlas = () => { const o = st.sec >= 0 ? st.liste[st.sec] : null; if (!o || !T) return; const W = cv.clientWidth, sc0 = T.sc / V.k; V.k = Math.max(1, Math.min(200, (W * 0.8) / ((Math.max(o.w, 1) + 8) * sc0))); V.dx = 0; V.dy = 0; ciz(); const sm = o.sekil === 'D' ? o.s : o.s + o.w / 2; V.dx = W / 2 - T.X(sm); V.dy = cv.clientHeight / 2 - T.Z((o.sekil === 'D' ? o.z : o.z + o.h / 2)); ciz(); };
    cv.onclick = ev => { if (!T || (surukle && surukle.oynadi) || ev.shiftKey) return; const r = cv.getBoundingClientRect(), px = ev.clientX - r.left, py = ev.clientY - r.top; let s = (px - T.ox) / T.sc; if (T.ayna) s = Y.L - s; const z = (T.oy - py) / T.sc;
      const hit = st.liste.findIndex(o => !o.sil && !o.gizli && (o.sekil === 'D' ? Math.hypot(s - o.s, z - o.z) <= o.w / 2 : s >= o.s && s <= o.s + o.w && z >= o.z && z <= o.z + o.h)); if (hit >= 0) { st.sec = hit; alanlar(); listele(); ciz(); return; }
      const o = st.sec >= 0 ? st.liste[st.sec] : null; if (!o || o.kendi === false) return; if (o.sekil === 'D') { o.s = kenetle(s); o.z = kenetle(z); } else { o.s = kenetle(s - o.w / 2); o.z = kenetle(z - o.h / 2); } o.degisti = true; alanlar(); listele(); ciz(); };
    $('#pyEkle').onclick = () => { const o = Object.assign({}, st.yeni, { s: kenetle(Y.L / 2 - 0.3), z: kenetle(Math.min(1, (Y.z1 - Y.z0) / 2)), kendi: true, yeni: true, degisti: true }); st.liste.push(o); st.sec = st.liste.length - 1; alanlar(); listele(); ciz(); yakinlas(); };
    $('#pyTum').onclick = () => { V.k = 1; V.dx = 0; V.dy = 0; ciz(); }; $('#pyYak').onclick = yakinlas;
    $('#pySil').onclick = () => { if (st.sec < 0) return; st.liste[st.sec].sil = true; st.sec = -1; alanlar(); listele(); ciz(); };
    $('#pySekil').onchange = () => { const o = st.sec >= 0 ? st.liste[st.sec] : null; st.yeni.sekil = $('#pySekil').value; if (!o || o.kendi === false) return; o.sekil = $('#pySekil').value; if (o.sekil === 'D') { o.s += o.w / 2; o.z += o.h / 2; o.h = o.w; } else { o.s -= o.w / 2; o.z -= o.w / 2; } o.degisti = true; alanlar(); listele(); ciz(); };
    $('#pyParca').onchange = () => { if (st.liste.some(o => o.degisti || o.sil)) { if (!confirm('Uygulanmamış değişiklikler var — parça değişirse kaybolur. Devam?')) { $('#pyParca').value = String(st.parca); return; } } st.parca = +$('#pyParca').value; st.sec = -1; V.k = 1; V.dx = 0; V.dy = 0; yukle(); bas(); alanlar(); listele(); ciz(); };
    $('#pyTaraf').onclick = () => { if (st.liste.some(o => o.degisti || o.sil)) { if (!confirm('Uygulanmamış değişiklikler var — öbür yüze geçilirse kaybolur. Devam?')) return; } const nok = st.parca >= 0 ? Yf.at(md(PR[st.parca].s0 + PR[st.parca].L / 2)).p : null; st.taraf = st.taraf === 'A' ? 'B' : 'A'; st.sec = -1; st.parca = -1; yukle(); if (nok) { const sp = Yf.proj(nok), k = PR.findIndex(q => { const v = md(sp - q.s0); return v >= -1e-6 && v <= q.L + 1e-6; }); if (k >= 0) { st.parca = k; yukle(); } } parcaDoldur(); bas(); alanlar(); listele(); ciz(); };
    const bas = () => { $('#pyBas').textContent = `${e.no || 'Perde'}${st.parca >= 0 ? ' · ' + PR[st.parca].ad : ''} — ${st.taraf} yüzü görünüşü${Y.pts.length > 2 ? ' (açılım)' : ''} · boy ${f2(Y.L)} m · yükseklik ${f2(Y.z1 - Y.z0)} m · kalınlık ${cm(Y.t)} cm`; };
    const kapat = () => { if (AR) AR.kapat(); div.remove(); window.removeEventListener('resize', ciz); acik = null; };
    $('#pyKapat').onclick = kapat;
    $('#pyUygula').onclick = () => {
      C.begin && C.begin(); const eski = Array.isArray(e.bosluk3) ? e.bosluk3 : [], yeni = [];
      const pc = st.parca >= 0 ? PR[st.parca] : null, yenilenen = new Set(st.liste.filter(o => !o.yeni && (o.sil || (o.kendi && o.degisti))).map(o => o.i));
      st.liste.forEach(o => { if (o.pahIcin) { if (!yenilenen.has(o.ana) && eski[o.i]) yeni.push(eski[o.i]); return; } if (o.sil) return;
        if (o.yeni || (o.kendi && o.degisti)) { const q = Object.assign({}, o, { taraf: st.taraf }); if (pc) { const c = q.sekil === 'D' ? q.s : q.s + q.w / 2, v = md(c + pc.s0); q.s = q.sekil === 'D' ? v : v - q.w / 2; } [].concat(bosOlustur(e, Yf, q)).forEach(b => yeni.push(b)); } else if (eski[o.i]) yeni.push(eski[o.i]); });
      e.bosluk3 = yeni; delete e._c; C.touch && C.touch(e); C.changed();
      C.log(`${e.no || 'Perde'}: ${yeni.filter(b => !b.pahIcin).length} boşluk (${st.liste.filter(o => o.yeni && !o.sil).length} yeni, ${st.liste.filter(o => o.sil).length} silindi).`); kapat(); };
    // ---- çizim araçları + yakalama (yuz-arac.js) ----
    if (C._yuzArac) { const Hh = () => Y.z1 - Y.z0, idx = o => st.liste.indexOf(o);
      const gOf = o => (o.sekil === 'D' ? { sekil: 'D', cx: o.s, cy: o.z, w: o.w, h: o.w } : { sekil: 'R', cx: o.s + o.w / 2, cy: o.z + o.h / 2, w: o.w, h: o.h });
      const merkez = (o, cx, cy) => { if (o.sekil === 'D') { o.s = cx; o.z = cy; } else { o.s = cx - o.w / 2; o.z = cy - o.h / 2; } o.degisti = true; };
      const yayKilavuz = () => { const out = [], pc = st.parca >= 0 ? PR[st.parca] : null, ekle = (q, s0) => { out.push({ u: s0 + q.L / 2, ad: q.tip === 'yay' ? `P${q.i + 1} yay ortası` : `P${q.i + 1} ortası` }); if (q.tip === 'yay' && q.th) for (let a = 45; a < q.th * 180 / Math.PI - 1; a += 45) out.push({ u: s0 + q.L * (a * Math.PI / 180) / q.th, ad: `P${q.i + 1} yay ${a}°` }); };
        if (pc) ekle(pc, 0); else PR.forEach(q => { const s0 = md(q.s0); if (s0 + q.L <= Y.L + 1e-6) ekle(q, s0); }); out.push({ v: Hh() / 2, ad: 'perde yarı yüksekliği' }); return out; };
      AR = C._yuzArac.bagla({ cv, panel: $('#pyAlan').parentElement, T: () => T, sinir: () => [0, 0, Y.L, Hh()],
        kenar: () => { const L = Y.L, H = Hh(), k = [[0, 0, L, 0], [L, 0, L, H], [L, H, 0, H], [0, H, 0, 0]]; if (st.parca < 0) PR.forEach(q => { const s0 = md(q.s0); if (s0 > 1e-3 && s0 < L - 1e-3) k.push([s0, 0, s0, H]); }); return k; },
        noktalar: () => [{ u: Y.L / 2, v: Hh() / 2, tip: 'merkez', ad: 'yüz ortası' }], kilavuz: yayKilavuz,
        liste: () => st.liste.map((o, i) => ({ o, i, g: gOf(o), kendi: o.kendi })).filter(L => !L.o.sil && !L.o.gizli && !L.o.pahIcin),
        merkezAyarla: (o, cx, cy) => { merkez(o, cx, cy); alanlar(); listele(); },
        yeni: (sekil, cx, cy, w, h) => { const o = { sekil, w, h: sekil === 'D' ? w : h, s: 0, z: 0, kendi: true, yeni: true, degisti: true }; merkez(o, cx, cy); st.liste.push(o); return o; },
        kopya: o => { const n = Object.assign({}, o, { kendi: true, yeni: true, degisti: true, i: undefined }); delete n.i; st.liste.push(n); return n; },
        sec: o => { st.sec = idx(o); alanlar(); listele(); }, secili: () => st.sec, sil: o => { o.sil = true; st.sec = -1; alanlar(); listele(); },
        modeleCiz: arr => { const lay = 'KENAR_CIZGI'; C.ensureLayer(lay, 3, 'CONTINUOUS', 35); const pc = st.parca >= 0 ? PR[st.parca] : null, etk = 'perde:' + e.id + ':' + st.taraf + ':' + (pc ? pc.i : 'T');
          C.begin && C.begin(); { const es = C.doc.ents.filter(x => x.yrdKaynak === etk); if (es.length) C.remove(es); } let n = 0;
          for (const k of arr || []) { const L = Math.hypot(k[2] - k[0], k[3] - k[1]), m = Math.max(1, Math.ceil(L / 0.1)), pts = []; for (let i = 0; i <= m; i++) { const t = i / m, su = k[0] + (k[2] - k[0]) * t, z = k[1] + (k[3] - k[1]) * t, A = Y.at(su); pts.push([r4(A.p[0]), r4(A.p[1]), r4(Y.z0 + z)]); }
            const x = C.add(C.newEnt('pline', { pts, closed: false, layer: lay })); x.yrdKaynak = etk; delete x.sp; n++; }
          C.changed(); return n; },
        yardimAl: () => { const pc = st.parca >= 0 ? PR[st.parca] : null, L = ((e.yuzYardim || {})[st.taraf] || []); return L.map(k => { if (!pc) return k.slice(); const a = md(k[0] - pc.s0), b = md(k[2] - pc.s0); if (Math.abs(a - b) > Yf.L / 2) return null; return [a, k[1], b, k[3]]; }).filter(Boolean); },
        yardimYaz: arr => { const pc = st.parca >= 0 ? PR[st.parca] : null, Y2 = e.yuzYardim = e.yuzYardim || {}, eski = Y2[st.taraf] || [];
          const disari = pc ? eski.filter(k => { const a = md(k[0] - pc.s0), b = md(k[2] - pc.s0); return Math.abs(a - b) > Yf.L / 2 || Math.min(a, b) > pc.L + 1e-6 || Math.max(a, b) < -1e-6; }) : [];
          Y2[st.taraf] = disari.concat(arr.map(k => (pc ? [md(k[0] + pc.s0), k[1], md(k[2] + pc.s0), k[3]] : k))); },
        yayBilgi: () => { const pc = st.parca >= 0 ? PR[st.parca] : null; return pc && pc.tip === 'yay' && pc.R ? { R: pc.R } : null; }, yenile: () => ciz() }); }
    window.addEventListener('resize', ciz); bas(); alanlar(); listele(); setTimeout(ciz, 30);
    acik = { kapat, st, div, Y: () => Y };
    return acik;
  };
  C.perdeYuzAc = ac;
  /* PAH komutu perde boşluğu kenarında: boşluğa 45° pah (iki yüzde) — boşluk yeniden üretilir */
  C.perdeBoslukPah = (e, nokta, p) => { const eski = Array.isArray(e.bosluk3) ? e.bosluk3 : []; if (!eski.length) return null;
    let best = null; for (const taraf of ['A', 'B']) { const Y = yuzHat(e, taraf); Y.taraf = taraf; const L = bosOku(e, Y); L.forEach(o => { if (o.pahIcin || o.gizli) return; const sp = Y.proj(nokta), z = (nokta[2] || 0) - Y.z0, s0 = o.sekil === 'D' ? o.s - o.w / 2 : o.s, z0 = o.sekil === 'D' ? o.z - o.w / 2 : o.z, h = o.sekil === 'D' ? o.w : o.h;
        const dx = Math.max(s0 - sp, 0, sp - (s0 + o.w)), dz = Math.max(z0 - z, 0, z - (z0 + h)), d = Math.hypot(dx, dz); if (!best || d < best.d) best = { d, o, Y, L }; }); }
    if (!best || best.d > 0.15) return null;
    const { o, Y, L } = best, yeni = []; L.forEach(q => { if (q.pahIcin) { if (q.ana !== o.i && eski[q.i]) yeni.push(eski[q.i]); return; } if (q.i === o.i) [].concat(bosOlustur(e, Y, Object.assign({}, q, { pah: p, taraf: Y.taraf }))).forEach(b => yeni.push(b)); else if (eski[q.i]) yeni.push(eski[q.i]); });
    C.begin && C.begin(); e.bosluk3 = yeni; delete e._c; C.touch && C.touch(e); C.changed(); return e; };
  const pahSar = () => { if (!C.chamferEdge || C.chamferEdge._perde) return; const ce0 = C.chamferEdge; C.chamferEdge = function (ent, a, b, d1, d2) { if (ent && ent.type === 'perde') { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, ((a[2] || 0) + (b[2] || 0)) / 2], r = C.perdeBoslukPah(ent, m, d1); if (r) return r; throw new Error('Perdede yalnız boşluk (delik) kenarları pahlanır — boşluğun kenarına tıklayın (ya da perdeye çift tıklayıp "Pah 45°" alanını kullanın)'); } return ce0.apply(this, arguments); }; C.chamferEdge._perde = true; };
  if (typeof window !== 'undefined') { setTimeout(pahSar, 0); window.addEventListener('load', pahSar); }
  // tıklanan noktaya / yüz normaline göre yüz tarafı (A: eksenin +nn yanı)
  const tarafBul = (e, p, n) => { try { const I = C._ins, sf = I.segFrames(e); let best = null; for (const f of sf) { const d = sub(f.b, f.a), L2 = d[0] * d[0] + d[1] * d[1] || 1, u = Math.max(0, Math.min(1, ((p[0] - f.a[0]) * d[0] + (p[1] - f.a[1]) * d[1]) / L2)), dd = Math.hypot(f.a[0] + d[0] * u - p[0], f.a[1] + d[1] * u - p[1]); if (!best || dd < best.d) best = { d: dd, f, q: [f.a[0] + d[0] * u, f.a[1] + d[1] * u] }; }
      const nn = best.f.nn; if (n && Math.hypot(n[0], n[1]) > 0.5) return (n[0] * nn[0] + n[1] * nn[1]) > 0 ? 'A' : 'B';
      const F = I.faceOffs(e), c = (F.lB + F.rB) / 2, v = (p[0] - best.q[0]) * nn[0] + (p[1] - best.q[1]) * nn[1]; return v - c >= 0 ? 'A' : 'B'; } catch (er) { return 'A'; } };
  // çift tıklama: planda ya da 3B'de perdeye çift tıklayınca o yüzün görünüşü açılır
  if (typeof document !== 'undefined') setTimeout(() => {
    const plan = document.querySelector('#cvPlan'), v3 = document.querySelector('#cv3d');
    if (plan) plan.addEventListener('dblclick', ev => { if ((C.cmd && C.cmd.running) || !C.views || ev.button !== 0 || ev.ctrlKey) return; const r = plan.getBoundingClientRect(), V = C.views.plan, e = V.pick(ev.clientX - r.left, ev.clientY - r.top); if (!e || e.type !== 'perde') return; ev.stopImmediatePropagation(); ev.preventDefault(); const w = V.s2w(ev.clientX - r.left, ev.clientY - r.top); ac(e, tarafBul(e, w, null), w); }, true);
    if (v3) v3.addEventListener('dblclick', ev => { if ((C.cmd && C.cmd.running) || !C.views || ev.button !== 0 || ev.ctrlKey) return; const r = v3.getBoundingClientRect(), f = C.views.v3.pick(ev.clientX - r.left, ev.clientY - r.top); if (!f || !f.e || f.e.type !== 'perde') return; ev.stopImmediatePropagation(); ev.preventDefault(); ac(f.e, tarafBul(f.e, f.p, f.n), f.p); }, true);
  }, 0);
  C.addCommand(['PERDEYUZ', 'YUZDUZENLE', 'PERDEGORUNUS'], 'Perde yüz düzenleyici (ya da perdeye çift tıklayın): perdenin görünüşü (yay perdede açılım) ölçülü açılır; delik / boşluk sayıyla ya da tıklayarak eklenir, değiştirilir, silinir', async (I) => {
    let e = (C.sel || []).find(x => x.type === 'perde');
    let taraf = 'A';
    let p0 = null;
    if (!e) { const p = await I.pt('Perdenin görmek istediğiniz yüzüne tıklayın'); if (!p || typeof p === 'string') return; p0 = p;
      try { const v = C.views && C.views.v3; if (C.viewName && C.viewName() === '3d' && v && v.mouse) { const f = v.pick(v.mouse[0], v.mouse[1]); if (f && f.e && f.e.type === 'perde') { ac(f.e, tarafBul(f.e, f.p, f.n), f.p); return; } } } catch (er) { } const r = C.kenarBul ? C.kenarBul(p, {}) : null; e = r && r.d < 1.5 ? null : null;
      let best = null; for (const x of C.doc.ents) { if (x.type !== 'perde' || !C.layer(x.layer).on) continue; try { const Y = yuzHat(x, 'A'); for (let i = 1; i < Y.pts.length; i++) { const a = Y.pts[i - 1], b = Y.pts[i], d = sub(b, a), L2 = d[0] * d[0] + d[1] * d[1] || 1, u = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / L2)), dd = Math.hypot(a[0] + d[0] * u - p[0], a[1] + d[1] * u - p[1]); if (!best || dd < best.d) best = { d: dd, x }; } } catch (er) { } }
      if (best && best.d < 1.5) { e = best.x; taraf = tarafBul(e, p, null); } }
    if (!e) { C.warn('Perde bulunamadı.'); return; }
    ac(e, taraf, p0);
  }, { noUndo: true });

  /* şerit + perdede çift tık */
  const serit = () => { try {
    const R = C.ribbon, BT = { cmd: 'PERDEYUZ', t: 'Perde yüz düzenle (delik)', i: 'found' };
    const ekle = () => { let d = false; for (const t of (R && R.tabs) || []) for (const p of t[1]) if ((t[0] === 'İnşaat' && p[0] === 'Taşıyıcı sistem') || (t[0] === '3B Modelleme' && p[0] === 'Modelle')) if (!p[1].some(x => x.cmd === BT.cmd)) { p[1].push(BT); d = true; } return d; };
    if (R && !R._perdeYuz) { R._perdeYuz = true; const r0 = R.render; R.render = function () { try { ekle(); } catch (er) { } const x = r0.apply(this, arguments); try { if (ekle()) r0.apply(this, arguments); } catch (er) { } return x; }; R.render(); }
  } catch (er) { console.error('PERDEYUZ şerit', er); } };
  if (typeof window !== 'undefined') { if (document.readyState === 'complete') serit(); else window.addEventListener('load', serit); }
})(window.C);

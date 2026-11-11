/* ArıtmaCAD — MEKANİK: 3B ekipman kütüphanesi ve şerit sekmesi
   Alt çubukta "Mekanik" grubuna tıklayınca üst şerit "Mekanik" sekmesine geçer: kategoriler (pompa, blower, mikser, difüzör, sıyırıcı …),
   son kullanılan ekipmanlar, ekipman yükleme (GLB / glTF / OBJ / STL), kütüphane penceresi (önizleme resimli kartlar, arama, kategori).
   Ekipman = 3B blok (C.blib, IndexedDB): planda üstten sınır, 3B'de gerçek model; BLOKEKLE ID=… ile yerleştirilir, BOM'da sayılır.
   Hazır paketler: C.ekipmanPaket([{ id, name, tur, mesh3d:{v,f,fc}, dims, thumb, marka, model }]) — app/ekipman/*.js dosyaları bununla kaydeder. */
(function (C) {
  'use strict';
  const M = C.M;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* kategoriler: ad, katman, renk */
  const KAT = [
    ['Pompa', 'MEK_POMPA', 5], ['Dalgıç pompa', 'MEK_POMPA', 5], ['Blower / kompresör', 'MEK_BLOWER', 4], ['Mikser', 'MEK_MIKSER', 3], ['Difüzör', 'MEK_DIFUZOR', 140],
    ['Sıyırıcı / köprü', 'MEK_SIYIRICI', 30], ['Izgara / elek', 'MEK_IZGARA', 4], ['Vana', 'MEK_VANA', 1], ['Dozaj / kimyasal', 'MEK_DOZAJ', 6], ['Dekantör / susuzlaştırma', 'MEK_CAMUR', 42],
    ['Tank / depo', 'MEK_TANK', 8], ['Vinç / kaldırma', 'MEK_VINC', 2], ['Ölçüm / enstrüman', 'MEK_OLCUM', 150], ['Diğer ekipman', 'MEK_DIGER', 8],
  ];
  const KN = KAT.map(k => k[0]);
  if (C.TUR_KATMAN) for (const [n, l, c] of KAT) if (!C.TUR_KATMAN[n]) C.TUR_KATMAN[n] = [l, c];
  const MEKTUR = new Set(KN.concat(['Pompa', 'Ekipman', 'Vana']));
  const isEq = d => d && d.mesh3d && d.mesh3d.v && d.mesh3d.v.length && (d.mek || MEKTUR.has(d.tur));
  const all = () => { const L = (C.blib && (C.blib.cache || (C.blib.load && C.blib.load()))) || {}; return Object.values(L).filter(isEq).sort((a, b) => (a.tur || '').localeCompare(b.tur || '', 'tr') || (a.name || '').localeCompare(b.name || '', 'tr')); };
  const store = { get: (k, d) => { try { const v = localStorage.getItem('aritmacad.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('aritmacad.' + k, JSON.stringify(v)); } catch (e) { } } };

  /* önizleme resmi: izometrik, gölgeli (ressam algoritması) */
  const thumbOf = (m3, W = 160, H = 120) => {
    try {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.fillStyle = '#20252c'; g.fillRect(0, 0, W, H);
      const v = m3.v, f = m3.f; if (!v || !f || !f.length) return '';
      const a = -Math.PI / 4, el = Math.atan(1 / Math.sqrt(2)), ca = Math.cos(a), sa = Math.sin(a), ce = Math.cos(el), se = Math.sin(el);
      const P = v.map(p => { const x = p[0] * ca - p[1] * sa, y = p[0] * sa + p[1] * ca; return [x, p[2] * ce - y * se, p[2] * se + y * ce]; });
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      const s = Math.min((W - 12) / Math.max(1e-9, x1 - x0), (H - 12) / Math.max(1e-9, y1 - y0)), ox = W / 2 - (x0 + x1) / 2 * s, oy = H / 2 + (y0 + y1) / 2 * s;
      const step = Math.max(1, Math.ceil(f.length / 40000)), T = [];
      for (let i = 0; i < f.length; i += step) { const t = f[i], A = P[t[0]], B = P[t[1]], Cc = P[t[2]]; if (!A || !B || !Cc) continue; const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = Cc[0] - A[0], vy = Cc[1] - A[1], vz = Cc[2] - A[2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; T.push([A, B, Cc, (A[2] + B[2] + Cc[2]) / 3, Math.abs(nx * 0.35 + ny * 0.55 - nz * 0.75), (m3.fc && m3.fc[i]) || [0.72, 0.74, 0.78]]); }
      T.sort((p, q) => p[3] - q[3]);
      for (const [A, B, Cc, , sh, c] of T) { const k = 0.35 + 0.65 * sh; g.fillStyle = `rgb(${Math.round(c[0] * 255 * k)},${Math.round(c[1] * 255 * k)},${Math.round(c[2] * 255 * k)})`; g.beginPath(); g.moveTo(ox + A[0] * s, oy - A[1] * s); g.lineTo(ox + B[0] * s, oy - B[1] * s); g.lineTo(ox + Cc[0] * s, oy - Cc[1] * s); g.closePath(); g.fill(); }
      return cv.toDataURL('image/png');
    } catch (e) { return ''; }
  };
  C.ekipmanThumb = thumbOf;

  /* hazır paketler (app/ekipman/*.js) */
  C.ekipmanPaket = list => { if (!C.blib) return; for (const d0 of list || []) { const d = Object.assign({ view: 'plan', unit: 'm', dn: null, mek: true, hazir: true }, d0); const lk = C.TUR_KATMAN[d.tur] || ['MEK_DIGER', 8]; d.layer = d.layer || lk[0]; d.layerColor = d.layerColor || lk[1];
    if (!d.ents) { const v = d.mesh3d.v; d.ents = C.planFromMesh ? C.planFromMesh({ v, f: d.mesh3d.f }) : []; } if (!d.bb && C.defBox) d.bb = C.defBox(d); if (!d.thumb) d.thumb = thumbOf(d.mesh3d); C.blib.cache = C.blib.cache || {}; if (!C.blib.cache[d.id]) C.blib.put(d); } refresh(); };

  /* son kullanılanlar */
  const recent = () => store.get('ekipmanSon', []).filter(id => C.blib && (C.blib.cache || {})[id]);
  const pushRecent = id => { const r = [id].concat(store.get('ekipmanSon', []).filter(x => x !== id)).slice(0, 8); store.set('ekipmanSon', r); refresh(); };

  /* yerleştir: düzende ise modele (Tasarım) geç */
  const insert = async id => {
    const d = C.blib.cache[id]; if (!d) { C.warn('Ekipman bulunamadı.'); return; }
    if ((C.currentView === 'layout' && !C.vpEdit) || C.currentView === 'map') C.setView('plan');
    pushRecent(id); C.runTool ? C.runTool('EKIPMANEKLE ID=' + id) : C.cmd.script('EKIPMANEKLE ID=' + id);
  };
  C.ekipmanEkle = insert;

  /* ---------- yön düzeltme ----------
     Okuyucular: OBJ / glTF / GLB "Y yukarı" kabul edilip Z yukarıya çevrilir, STL olduğu gibi (Z yukarı) alınır.
     CAD'den (SolidWorks, Inventor, üretici siteleri) gelen OBJ'ler çoğu zaman Z yukarıdır → model yan yatar.
     Yüklerken "Modelin yukarı ekseni" seçilir; yüklenmiş ekipman kütüphane kartındaki ⟳ ile 90° çevrilir. */
  const ROT = { X: p => [p[0], -p[2], p[1]], Y: p => [p[2], p[1], -p[0]], Z: p => [-p[1], p[0], p[2]] };
  const UPMAP = { Z: p => p, Y: p => [p[0], -p[2], p[1]], X: p => [p[1], p[2], p[0]] };
  const okuyucuYukari = name => /\.stl$/i.test(name) ? 'Z' : 'Y';
  C.ekipmanEksen = (name, mesh, up) => {
    if (!up || up === 'oto' || up === okuyucuYukari(name)) return mesh;
    const geri = okuyucuYukari(name) === 'Y' ? (p => [p[0], p[2], -p[1]]) : (p => p); // okuyucunun çevirmesini geri al → dosyadaki ham eksenler
    return Object.assign({}, mesh, { v: mesh.v.map(p => UPMAP[up](geri(p))) });
  };
  /* ---------- ekleme (taban) noktası ----------
     taban: model tabanının ortası (zemine oturan ekipman) · merkez: gövde kutusunun ortası ·
     orijin: üretici CAD dosyasının kendi orijini — vana / fitting modellerinde çoğunlukla boru ekseni / flanş merkezi.
     Seçilen nokta tanımın (0,0,0) noktası yapılır: yerleştirirken tıklanan nokta (ör. boru ucunun flanş merkezi, kotuyla) buraya gelir. */
  const kutu = v => { const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; for (const p of v) for (let i = 0; i < 3; i++) { b[i] = Math.min(b[i], p[i]); b[i + 3] = Math.max(b[i + 3], p[i]); } return b; };
  const BAZAD = { taban: 'taban ortası', merkez: 'gövde merkezi', orijin: 'modelin orijini (flanş / boru ekseni)', ozel: 'kendi belirlediğim nokta' };
  C.ekipmanBazAd = BAZAD;
  C.ekipmanBaz = (id, mod, nokta) => {
    const d = C.blib.cache[id]; if (!d || !d.mesh3d) return false; if (mod === 'sec') { C.ekipmanBazSec(id); return false; } if (mod === 'orijin' && !d.orj) { C.warn(`${d.name}: modelin orijin bilgisi yok (eski yükleme). Dosyayı yeniden yükleyin.`); return false; }
    const b = kutu(d.mesh3d.v), t = mod === 'ozel' ? (nokta || [0, 0, 0]) : mod === 'orijin' ? d.orj : mod === 'merkez' ? [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2] : [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, b[2]];
    if (Math.hypot(t[0], t[1], t[2]) > 1e-9) {
      const r = x => Math.round(x * 1e4) / 1e4;
      d.mesh3d = Object.assign({}, d.mesh3d, { v: d.mesh3d.v.map(p => [r(p[0] - t[0]), r(p[1] - t[1]), r(p[2] - t[2])]) });
      const X = C.xMove ? C.xMove([-t[0], -t[1], 0]) : null; if (X) d.ents = d.ents.map(e0 => { const e = JSON.parse(JSON.stringify(e0)); C.xform(e, X); return e; });
      if (d.orj) d.orj = d.orj.map((x, i) => r(x - t[i]));
      d.bb = C.defBox(d);
    }
    d.baz = mod; C.blib.put(d); if (C.doc.blocks && C.doc.blocks[id]) C.doc.blocks[id] = d; C.changed && C.changed(); return true;
  };
  /* ---------- ekleme noktasını model üzerinde seç ----------
     Üç görünüş (plan, ön, yan). Bir görünüşe tıklamak o görünüşün iki koordinatını belirler (plan: X-Y, ön: X-Z, yan: Y-Z).
     "Köşe" kipinde en yakın model noktasına yakalar; "3 noktadan daire merkezi" kipinde flanş / delik çevresine 3 kez tıklayın → merkez.
     X / Y / Z kutularına mm olarak da yazılabilir. Tamam → seçilen nokta tanımın (0,0,0) noktası olur. */
  C.ekipmanBazSec = (id, sonra) => new Promise(res => {
    const d = C.blib.cache[id]; if (!d || !d.mesh3d) { res(false); return; }
    const V = d.mesh3d.v, F = d.mesh3d.f, FC = d.mesh3d.fc, bb = kutu(V), Wc = 330, Hc = 330, pad = 18;
    let P = [0, 0, 0], kip = 'flans', uc = {}, yuz = d.yuz || null;
    const VW = { plan: { ad: 'Plan (üstten)', u: 0, v: 1, dz: p => p[2] }, on: { ad: 'Ön görünüş', u: 0, v: 2, dz: p => -p[1] }, yan: { ad: 'Yan görünüş (sağdan)', u: 1, v: 2, dz: p => p[0] } };
    const ext = Math.max(bb[3] - bb[0], bb[4] - bb[1], bb[5] - bb[2], 1e-6), k = (Wc - 2 * pad) / ext;
    const mid = [(bb[0] + bb[3]) / 2, (bb[1] + bb[4]) / 2, (bb[2] + bb[5]) / 2];
    const ekr = (w, p) => [Wc / 2 + (p[w.u] - mid[w.u]) * k, Hc / 2 - (p[w.v] - mid[w.v]) * k];
    const mod = (w, x, y) => [mid[w.u] + (x - Wc / 2) / k, mid[w.v] - (y - Hc / 2) / k];
    const step = Math.max(1, Math.ceil(F.length / 60000));
    const b = C.modal('Ekleme noktası — ' + d.name, `<div style="display:flex;gap:10px;flex-wrap:wrap">${Object.entries(VW).map(([n, w]) => `<div><div class="hint" style="margin-bottom:3px">${w.ad}</div><canvas data-v="${n}" width="${Wc}" height="${Hc}" style="background:#20252c;border-radius:4px;cursor:crosshair"></canvas></div>`).join('')}</div>
      <div class="bar" style="gap:10px;margin-top:8px;flex-wrap:wrap;align-items:center">
        <label><input type="radio" name="bzK" value="flans" checked> Flanşa tıkla — merkez otomatik</label><label><input type="radio" name="bzK" value="kose"> Tıklanan noktaya en yakın model noktası</label><label><input type="radio" name="bzK" value="serbest"> Serbest</label><label><input type="radio" name="bzK" value="daire"> 3 noktadan daire (flanş) merkezi</label>
      </div>
      <div class="bar" style="gap:8px;margin-top:6px;align-items:center">X <input id="bzX" style="width:80px"> Y <input id="bzY" style="width:80px"> Z <input id="bzZ" style="width:80px"> mm
        <span style="flex:1"></span><button data-h="taban">Taban ortası</button><button data-h="merkez">Gövde merkezi</button><button data-h="orijin" ${d.orj ? '' : 'disabled title="eski yükleme"'}>Modelin orijini</button></div>
      <div class="bar" style="gap:8px;margin-top:6px;align-items:center">Conta payı <input id="bzC" style="width:60px" value="${store.get('contaPayi', 3)}"> mm <span class="hint">(boru flanşı ile ekipman flanşı arasında bırakılır)</span></div>
      <p class="hint" id="bzH" style="min-height:40px">Ön ya da yan görünüşte bağlanacak flanşın yüzüne bir kez tıklayın: flanşın merkezi ve yüz düzlemi otomatik bulunur. Ya da görünüşlere tıklayarak noktayı seçin: plan X-Y'yi, ön görünüş X-Z'yi, yan görünüş Y-Z'yi belirler. Vana için flanş / boru ekseni merkezini seçin (ön ya da yan görünüşte "3 noktadan daire merkezi" ile flanş çevresine 3 kez tıklayın).</p>
      <div class="bar" style="justify-content:flex-end"><button id="bzNo">Vazgeç</button><button id="bzOk" class="pri">Tamam</button></div>`);
    const box = document.querySelector('#modal .box'); if (box) box.style.width = 'min(1100px,97vw)';
    const $ = q => b.querySelector(q);
    const tri = {}; // görünüş başına sıralı üçgenler (bir kez)
    for (const [n, w] of Object.entries(VW)) {
      const T = []; for (let i = 0; i < F.length; i += step) { const t = F[i], A = V[t[0]], B = V[t[1]], Cc = V[t[2]]; if (!A || !B || !Cc) continue;
        const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = Cc[0] - A[0], vy = Cc[1] - A[1], vz = Cc[2] - A[2]; const nn = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx], l = Math.hypot(...nn) || 1;
        const ax = 3 - w.u - w.v, sh = Math.abs(nn[ax]) / l; T.push([ekr(w, A), ekr(w, B), ekr(w, Cc), (w.dz(A) + w.dz(B) + w.dz(Cc)) / 3, 0.3 + 0.7 * sh, (FC && FC[i]) || [0.72, 0.75, 0.8]]); }
      T.sort((p, q) => p[3] - q[3]); tri[n] = T;
    }
    const ekV = {}; for (const [n, w] of Object.entries(VW)) ekV[n] = V.map(p => ekr(w, p));
    const ciz = () => {
      for (const [n, w] of Object.entries(VW)) {
        const cv = b.querySelector(`canvas[data-v="${n}"]`), g = cv.getContext('2d'); g.fillStyle = '#20252c'; g.fillRect(0, 0, Wc, Hc);
        for (const [A, B, Cc, , sh, c] of tri[n]) { g.fillStyle = `rgb(${c.map(x => Math.round(x * 255 * sh)).join(',')})`; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.lineTo(Cc[0], Cc[1]); g.closePath(); g.fill(); }
        const [x, y] = ekr(w, P); g.strokeStyle = '#ff3b30'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.moveTo(x, y - 14); g.lineTo(x, y + 14); g.stroke(); g.beginPath(); g.arc(x, y, 5, 0, 7); g.stroke();
        g.fillStyle = '#ffd54f'; for (const q of uc[n] || []) { const [qx, qy] = ekr(w, (() => { const p = [0, 0, 0]; p[w.u] = q[0]; p[w.v] = q[1]; return p; })()); g.beginPath(); g.arc(qx, qy, 3.5, 0, 7); g.fill(); }
        g.fillStyle = '#9fb3c8'; g.font = '11px sans-serif'; g.fillText(['X', 'Y', 'Z'][w.u] + ' →', Wc - 34, Hc - 6); g.fillText(['X', 'Y', 'Z'][w.v] + ' ↑', 6, 14);
      }
      $('#bzX').value = Math.round(P[0] * 1000); $('#bzY').value = Math.round(P[1] * 1000); $('#bzZ').value = Math.round(P[2] * 1000);
    };
    /* tek tıkla flanş: en öndeki noktanın düzlemindeki (aynı derinlik) noktalara RANSAC ile daire; tıklanan nokta dairenin içinde, en çok noktalı (eşitse büyük) daire */
    const flansBul = (n, w, x, y) => {
      const E2 = ekV[n], ax = 3 - w.u - w.v; let bi = -1, bz = -Infinity;
      for (let i = 0; i < E2.length; i++) if (Math.hypot(E2[i][0] - x, E2[i][1] - y) < 16 && w.dz(V[i]) > bz) { bz = w.dz(V[i]); bi = i; }
      if (bi < 0) return null;
      const d0 = V[bi][ax], tol = Math.max(0.0012, ext * 0.0015), c = mod(w, x, y);
      const S = []; for (const p of V) if (Math.abs(p[ax] - d0) < tol) S.push([p[w.u], p[w.v]]);
      if (S.length < 6) return null;
      const c3 = (a, bq, cc) => { const m = daire(a, bq, cc); return m ? [m[0], m[1], Math.hypot(a[0] - m[0], a[1] - m[1])] : null; };
      let best = null;
      for (let it = 0; it < 2000; it++) {
        const a = S[(Math.random() * S.length) | 0], bq = S[(Math.random() * S.length) | 0], cc = S[(Math.random() * S.length) | 0]; const k3 = c3(a, bq, cc); if (!k3) continue;
        const [cx, cy, R] = k3; if (R < 0.008 || R > 0.6 * ext || Math.hypot(c[0] - cx, c[1] - cy) > R * 1.7) continue;
        const t2 = Math.max(0.0006, R * 0.006); let sc = 0; const sek = new Set(); for (const p of S) { if (Math.abs(Math.hypot(p[0] - cx, p[1] - cy) - R) < t2) { sc++; sek.add(Math.floor((Math.atan2(p[1] - cy, p[0] - cx) + Math.PI) / (Math.PI / 6)) % 12); } }
        if (sc < 8 || sek.size < 8) continue; // dairenin en az 2/3'ü noktalı olmalı (rastgele büyük daireleri ele)
        const puan = sc * sek.size / 12;
        if (!best || puan > best.puan * 1.15 || (puan >= best.puan * 0.85 && R > best.R)) best = { cx, cy, R, sc, puan };
      }
      if (!best) return null;
      // iç noktalarla en küçük kareler (Kasa) inceltmesi
      const t2 = Math.max(0.0008, best.R * 0.015), I = S.filter(p => Math.abs(Math.hypot(p[0] - best.cx, p[1] - best.cy) - best.R) < t2);
      if (I.length >= 5) { let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0; const N = I.length; for (const [u, v] of I) { const z = u * u + v * v; sx += u; sy += v; sxx += u * u; syy += v * v; sxy += u * v; sz += z; sxz += u * z; syz += v * z; }
        const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, N]], B = [sxz, syz, sz]; const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
        const D = det(A); if (Math.abs(D) > 1e-18) { const col = i => A.map((r, j) => r.map((x2, k2) => k2 === i ? B[j] : x2)); const a1 = det(col(0)) / D, b1 = det(col(1)) / D, c1 = det(col(2)) / D; const cx = a1 / 2, cy = b1 / 2, R = Math.sqrt(c1 + cx * cx + cy * cy); if (isFinite(R) && Math.hypot(cx - best.cx, cy - best.cy) < best.R * 0.2) Object.assign(best, { cx, cy, R }); } }
      const Pn = [0, 0, 0]; Pn[w.u] = best.cx; Pn[w.v] = best.cy; Pn[ax] = d0;
      const nv = [0, 0, 0]; nv[ax] = n === 'on' ? -1 : 1; // yüz bakana dönük: plan +Z, ön −Y, yan +X
      return { P: Pn, n: nv, R: best.R, ax, say: best.sc };
    };
    const daire = (a, bq, c) => { const d2 = 2 * (a[0] * (bq[1] - c[1]) + bq[0] * (c[1] - a[1]) + c[0] * (a[1] - bq[1])); if (Math.abs(d2) < 1e-12) return null; const s = q => q[0] * q[0] + q[1] * q[1]; return [(s(a) * (bq[1] - c[1]) + s(bq) * (c[1] - a[1]) + s(c) * (a[1] - bq[1])) / d2, (s(a) * (c[0] - bq[0]) + s(bq) * (a[0] - c[0]) + s(c) * (bq[0] - a[0])) / d2]; };
    b.querySelectorAll('canvas[data-v]').forEach(cv => cv.onclick = ev => {
      const n = cv.dataset.v, w = VW[n], r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) * Wc / r.width, y = (ev.clientY - r.top) * Hc / r.height;
      let q = mod(w, x, y);
      if (kip === 'flans') { const r = flansBul(n, w, x, y); if (!r) { $('#bzH').textContent = 'Flanş bulunamadı — flanşın yüzüne (en öndeki daireye) tıklayın ya da "3 noktadan daire" kipini kullanın.'; return; }
        P = r.P; yuz = r.n; $('#bzH').textContent = `Flanş merkezi bulundu (yüzdeki daire Ø ≈ ${Math.round(r.R * 2000)} mm), yüz ${['X', 'Y', 'Z'][r.ax]} = ${Math.round(r.P[r.ax] * 1000)} mm (${r.say} nokta). Yerleştirirken bu yüz boruya bakar.`; ciz(); return; }
      if (kip !== 'serbest') { let bi = -1, bd = kip === 'daire' ? 4 : 14; const E2 = ekV[n]; for (let i = 0; i < E2.length; i++) { const dd = Math.hypot(E2[i][0] - x, E2[i][1] - y); if (dd < bd) { bd = dd; bi = i; } } if (bi >= 0) q = [V[bi][w.u], V[bi][w.v]]; }
      if (kip === 'daire') { const L = (uc[n] = (uc[n] || []).concat([q])); for (const m of Object.keys(uc)) if (m !== n) delete uc[m]; if (L.length < 3) { $('#bzH').textContent = `Daire merkezi: ${L.length}/3 nokta (${w.ad}). Flanş / delik çevresinde ${3 - L.length} nokta daha tıklayın.`; ciz(); return; } const m = daire(L[0], L[1], L[2]); uc = {}; if (!m) { $('#bzH').textContent = 'Noktalar aynı doğru üzerinde — yeniden deneyin.'; ciz(); return; } q = m; const R = Math.hypot(L[0][0] - m[0], L[0][1] - m[1]); $('#bzH').textContent = `Daire merkezi bulundu (Ø ≈ ${Math.round(2 * R * 1000)} mm).`; }
      P[w.u] = q[0]; P[w.v] = q[1]; ciz();
    });
    b.querySelectorAll('[name=bzK]').forEach(r => r.onchange = () => { kip = r.value; uc = {}; ciz(); });
    for (const [i, idn] of [[0, '#bzX'], [1, '#bzY'], [2, '#bzZ']]) $(idn).onchange = () => { const v = parseFloat(String($(idn).value).replace(',', '.')); if (isFinite(v)) { P[i] = v / 1000; ciz(); } };
    b.querySelectorAll('[data-h]').forEach(x => x.onclick = () => { const h = x.dataset.h; P = h === 'orijin' ? d.orj.slice() : h === 'merkez' ? mid.slice() : [mid[0], mid[1], bb[2]]; yuz = null; kip = 'kose'; const rk = b.querySelector('[name=bzK][value=kose]'); if (rk) rk.checked = true; ciz(); });
    let bitti = false; const fin = ok => { if (bitti) return; bitti = true; if (box) box.style.width = ''; C.closeModal(); if (ok) { { const cp = parseFloat(String($('#bzC').value).replace(',', '.')); if (isFinite(cp) && cp >= 0) store.set('contaPayi', cp); } C.ekipmanBaz(id, 'ozel', P.slice()); if (yuz) d.yuz = yuz; else delete d.yuz; d.thumb = thumbOf(d.mesh3d); C.blib.put(d); refresh(); C.log(`${d.name}: ekleme noktası belirlendi (X ${Math.round(P[0] * 1000)}, Y ${Math.round(P[1] * 1000)}, Z ${Math.round(P[2] * 1000)} mm).`); } res(ok); if (sonra) setTimeout(sonra, 0); };
    $('#bzOk').onclick = () => fin(true); $('#bzNo').onclick = () => fin(false);
    ciz();
  });
  C.ekipmanDondur = (id, ax, kez = 1) => { // kütüphanedeki tanımı 90° × kez çevir; zemine oturt, ortala, plan sembolü ve önizlemeyi yenile
    const d = C.blib.cache[id]; if (!d || !d.mesh3d) return false;
    let v = d.mesh3d.v, o = d.orj, yz = d.yuz; for (let i = 0; i < ((kez % 4) + 4) % 4; i++) { v = v.map(ROT[ax]); if (o) o = ROT[ax](o); if (yz) yz = ROT[ax](yz); } if (yz) d.yuz = yz;
    const b = kutu(v), c = [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, b[2]];
    const t = C.modelToDef({ v, f: d.mesh3d.f, fc: d.mesh3d.fc }, { name: d.name, src: d.src, tur: d.tur, unit: 'm' });
    for (const k of ['ents', 'mesh3d', 'bb', 'dims']) d[k] = t[k]; if (o) d.orj = o.map((x, i) => Math.round((x - c[i]) * 1e4) / 1e4);
    C.blib.remove(t.id); const mod = d.baz || 'taban'; d.baz = 'taban'; if (mod !== 'taban') C.ekipmanBaz(id, mod);
    d.thumb = thumbOf(d.mesh3d); C.blib.put(d); if (C.doc.blocks && C.doc.blocks[id]) C.doc.blocks[id] = d; refresh(); C.changed && C.changed(); return true;
  };

  /* dosyadan ekipman yükle (birden çok dosya) */
  const pickMany = accept => new Promise(res => { const fi = document.createElement('input'); fi.type = 'file'; fi.multiple = true; fi.accept = accept; fi.onchange = () => res([...fi.files]); fi.oncancel = () => res([]); fi.click(); });
  const importFiles = async (files, opt) => {
    let n = 0; for (const f of files) {
      try {
        const mesh = C.ekipmanEksen(f.name, await C.loadModelBuffer(f.name, await f.arrayBuffer()), opt.up);
        const def = C.modelToDef(mesh, { name: f.name.replace(/\.[^.]+$/, ''), src: f.name, tur: opt.tur, targetH: +opt.h || 0, unit: opt.unit || 'm' });
        def.mek = true; if (opt.marka) def.marka = opt.marka;
        { const k = ({ m: 1, cm: 0.01, mm: 0.001, in: 0.0254 })[opt.unit || 'm'] || 1, b = kutu(mesh.v.map(p => p.map(x => x * k))), sc = (+opt.h > 0 && b[5] - b[2] > 1e-9) ? +opt.h / (b[5] - b[2]) : 1;
          def.orj = [-(b[0] + b[3]) / 2 * sc, -(b[1] + b[4]) / 2 * sc, -b[2] * sc].map(x => Math.round(x * 1e4) / 1e4); def.baz = 'taban';
          const ic = def.orj.every((x, i) => { const bb = kutu(def.mesh3d.v), L = bb[i + 3] - bb[i]; return x >= bb[i] - 0.1 * L && x <= bb[i + 3] + 0.1 * L; });
          const boruElemani = /vana|valf|valve|klape|check|gate|butterfly|kelebek|s[uü]rg|fitting|flan[sş]|dirsek|demontaj|debimetre|control|kontrol|(?:^|[^a-z])DN\s*\d{2,4}|(?:^|[^a-z])PN\s*\d{1,2}(?!\d)/i.test(def.tur + ' ' + def.name + ' ' + (f.name || ''));
          const mod = opt.baz && opt.baz !== 'oto' && opt.baz !== 'sec' ? opt.baz : (boruElemani && ic ? 'orijin' : 'taban');
          C.blib.put(def); if (mod !== 'taban') C.ekipmanBaz(def.id, mod); if (opt.baz === 'sec') await C.ekipmanBazSec(def.id); }
        def.thumb = thumbOf(def.mesh3d); C.blib.put(def); n++;
        C.log(`Ekipman eklendi: ${def.name} (${def.tur}) — ${def.dims.join(' × ')} m (G×D×Y), ${def.mesh3d.f.length.toLocaleString('tr-TR')} üçgen · ekleme noktası: ${BAZAD[def.baz] || def.baz}.`);
        if (def.mesh3d.f.length > 150000) C.warn(`${def.name}: model çok ayrıntılı (${def.mesh3d.f.length.toLocaleString('tr-TR')} üçgen); çizim yavaşlayabilir.`);
      } catch (e) { C.warn(`${f.name} okunamadı: ${e.message}. Desteklenen: GLB, glTF (ZIP), OBJ, STL. STEP / IGES / DWG 3B dosyalarını önce GLB ya da STL'e çevirin.`); }
    }
    refresh(); return n;
  };
  const askImport = async files => {
    const st = Object.assign({ tur: 'Pompa', unit: 'mm', h: 0, up: 'oto', baz: 'oto' }, store.get('ekipmanYukle', {}));
    const b = C.modal('Ekipman yükle', `<div style="display:grid;grid-template-columns:190px 1fr;gap:8px;align-items:center">
      <label>Kategori</label><select id="eqT">${KN.map(k => `<option ${k === st.tur ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>
      <label>Model birimi</label><select id="eqU">${['mm', 'cm', 'm', 'in'].map(u => `<option ${u === st.unit ? 'selected' : ''}>${u}</option>`).join('')}</select>
      <label>Modelin yukarı ekseni</label><select id="eqA">${[['oto', 'Otomatik (OBJ / GLB: Y, STL: Z)'], ['Z', 'Z yukarı (CAD / üretici modeli)'], ['Y', 'Y yukarı'], ['X', 'X yukarı']].map(([k, t]) => `<option value="${k}" ${k === st.up ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <label>Ekleme noktası</label><select id="eqB">${[['sec', 'Kendim belirleyeyim (model üzerinde tıklayarak)'], ['oto', 'Otomatik (vana: model orijini, diğerleri: taban)'], ['orijin', 'Modelin orijini (flanş / boru ekseni)'], ['taban', 'Taban ortası (zemine oturur)'], ['merkez', 'Gövde merkezi']].map(([k, t]) => `<option value="${k}" ${k === st.baz ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <label>Gerçek yükseklik (m, 0 = modeldeki)</label><input id="eqH" value="${+st.h || 0}">
      <label>Marka / model (isteğe bağlı)</label><input id="eqM" value="">
      </div><p class="hint">${files ? files.length + ' dosya' : 'Dosya seçeceksiniz'} · GLB, glTF (ZIP), OBJ, STL. Üretici STEP dosyalarını GLB / STL'e çevirip yükleyin. Model zemine oturtulur, planda ortalanır; birimi yanlış seçerseniz ölçüler 10–1000 kat sapar. Model yan yatık gelirse kütüphane kartındaki ⟳ ile çevirin.</p>
      <div class="bar" style="justify-content:flex-end"><button id="eqNo">Vazgeç</button><button id="eqOk" class="pri">${files ? 'Yükle' : 'Dosya seç…'}</button></div>`);
    return new Promise(res => {
      b.querySelector('#eqNo').onclick = () => { C.closeModal(); res(0); };
      b.querySelector('#eqOk').onclick = async () => { const opt = { tur: b.querySelector('#eqT').value, unit: b.querySelector('#eqU').value, h: parseFloat(b.querySelector('#eqH').value) || 0, marka: b.querySelector('#eqM').value.trim(), up: b.querySelector('#eqA').value, baz: b.querySelector('#eqB').value }; store.set('ekipmanYukle', opt); C.closeModal();
        const fs = files || await pickMany('.glb,.gltf,.zip,.obj,.stl'); if (!fs.length) return res(0); res(await importFiles(fs, opt)); };
    });
  };

  /* kütüphane penceresi */
  const openLib = (kat) => {
    const st = store.get('ekipmanPencere', { kat: '', q: '' }); if (kat != null) st.kat = kat;
    const b = C.modal('Mekanik ekipman kütüphanesi', `<div class="bar" style="gap:6px;flex-wrap:wrap"><input id="eqQ" placeholder="Ara (ad, marka)…" value="${esc(st.q)}" style="flex:1;min-width:160px">
      <select id="eqK"><option value="">Tüm kategoriler</option>${KN.map(k => `<option ${k === st.kat ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>
      <button id="eqUp" class="pri">＋ Ekipman yükle</button><button id="eqNet">İnternetten ara</button></div>
      <div id="eqGrid" class="blgrid" style="margin-top:8px;max-height:60vh;overflow:auto"></div>
      <div id="eqDrop" class="drop-zone" style="margin-top:8px">📂 3B ekipman dosyalarını (GLB / glTF / OBJ / STL) buraya sürükleyin</div>
      <p class="hint">Karta tıklayın: çizime yerleştirir (planda nokta, sonra açı). Planda üstten görünüş sınırı, 3B sekmesinde gerçek model görünür; malzeme listesinde (BOM) sayılır.</p>`);
    const $ = s => b.querySelector(s);
    const draw = () => {
      st.q = $('#eqQ').value; st.kat = $('#eqK').value; store.set('ekipmanPencere', st);
      const q = C.up(st.q || ''), L = all().filter(d => (!st.kat || d.tur === st.kat || (st.kat === 'Diğer ekipman' && d.tur === 'Ekipman')) && (!q || C.up(`${d.name} ${d.marka || ''} ${d.tur}`).includes(q)));
      $('#eqGrid').innerHTML = L.length ? L.map(d => `<div class="blcard eqc" data-id="${esc(d.id)}" title="${esc(d.name)} — ${esc(d.tur)}${d.dims ? ' · ' + d.dims.join(' × ') + ' m' : ''}">
        ${d.thumb ? `<img src="${d.thumb}" style="width:100%;height:110px;object-fit:contain;display:block;background:#20252c;border-radius:4px">` : '<div class="noimg" style="height:110px;display:flex;align-items:center;justify-content:center">3B</div>'}
        <div class="bln">${esc(d.name)}</div><div class="hint" style="font-size:11px">${d.mesh3d ? `<span title="Ekleme noktası">⌖ ${esc({ taban: 'taban', merkez: 'merkez', orijin: 'flanş / orijin', ozel: 'seçilen nokta' }[d.baz || 'taban'])}${d.orj ? '' : ' (eski yükleme)'}</span> · ` : ''}${esc(d.tur)}${d.dims ? ' · ' + d.dims.map(x => M.fmt(x, 2)).join('×') + ' m' : ''}${d.marka ? ' · ' + esc(d.marka) : ''}</div>
        <div style="display:flex;gap:4px;margin-top:4px"><button data-a="ins" class="pri" style="flex:1">Ekle</button>${d.hazir ? '' : '<button data-a="rot" title="Yönünü düzelt (90° çevir)">⟳</button><button data-a="baz" title="Ekleme noktası (flanş merkezi / taban / merkez)">⌖</button><button data-a="ren" title="Adını değiştir">✎</button><button data-a="kat" title="Kategorisini değiştir">⇄</button><button data-a="del" title="Kütüphaneden sil">🗑</button>'}</div></div>`).join('')
        : `<p class="hint">${all().length ? 'Bu filtreye uyan ekipman yok.' : 'Henüz ekipman yok. "＋ Ekipman yükle" ile 3B modellerinizi ekleyin ya da dosyaları aşağıya sürükleyin.'}</p>`;
      $('#eqGrid').querySelectorAll('.eqc').forEach(el => {
        const id = el.dataset.id, d = C.blib.cache[id];
        el.onclick = ev => { const a = ev.target.closest('[data-a]'); const act = a ? a.dataset.a : 'ins'; ev.stopPropagation();
          if (act === 'ins') { C.closeModal(); insert(id); }
          else if (act === 'ren') { const bl = el.querySelector('.bln'), inp = document.createElement('input'); inp.value = d.name; bl.replaceWith(inp); inp.focus(); inp.select(); inp.onclick = e2 => e2.stopPropagation(); const end = ok => { if (ok && inp.value.trim()) { d.name = inp.value.trim(); C.blib.put(d); refresh(); } draw(); }; inp.onkeydown = e2 => { e2.stopPropagation(); if (e2.key === 'Enter') end(true); if (e2.key === 'Escape') end(false); }; inp.onblur = () => end(true); }
          else if (act === 'kat') { const sel = document.createElement('select'); sel.innerHTML = KN.map(k => `<option ${k === d.tur ? 'selected' : ''}>${esc(k)}</option>`).join(''); a.replaceWith(sel); sel.onclick = e2 => e2.stopPropagation(); sel.focus(); sel.onchange = () => { d.tur = sel.value; const lk = C.TUR_KATMAN[d.tur] || ['MEK_DIGER', 8]; d.layer = lk[0]; d.layerColor = lk[1]; C.blib.put(d); refresh(); draw(); }; }
          else if (act === 'rot') { const box = document.createElement('div'); box.style.cssText = 'display:flex;gap:3px;flex-wrap:wrap;margin-top:4px'; box.onclick = e2 => e2.stopPropagation();
            box.innerHTML = [['X', 1, 'Öne / arkaya devir (X ekseni)'], ['Y', 1, 'Yana devir (Y ekseni)'], ['Z', 1, 'Planda 90° döndür (Z ekseni)']].map(([ax, k, t]) => `<button data-ax="${ax}" title="${t}" style="flex:1">↻ ${ax}</button>`).join('') + '<button data-ax="" title="Kapat">✓</button>';
            a.parentElement.after(box); a.disabled = true;
            box.querySelectorAll('[data-ax]').forEach(bt => bt.onclick = e2 => { e2.stopPropagation(); const ax = bt.dataset.ax; if (!ax) { draw(); return; } C.ekipmanDondur(id, ax); const im = el.querySelector('img'); if (im) im.src = d.thumb; const h = el.querySelector('.hint'); if (h && d.dims) h.textContent = `${d.tur} · ${d.dims.map(x => M.fmt(x, 2)).join('×')} m`; }); }
          else if (act === 'baz') { const sel = document.createElement('select'); sel.title = 'Ekleme noktası'; sel.innerHTML = Object.entries(BAZAD).filter(([k]) => k !== 'ozel' || d.baz === 'ozel').map(([k, t]) => `<option value="${k}" ${k === (d.baz || 'taban') ? 'selected' : ''} ${k === 'orijin' && !d.orj ? 'disabled' : ''}>${t}${k === 'orijin' && !d.orj ? ' — yeniden yükleyin' : ''}</option>`).join('') + '<option value="sec">Kendim belirle (tıklayarak)…</option>'; a.replaceWith(sel); sel.onclick = e2 => e2.stopPropagation(); sel.focus(); sel.onchange = () => { if (sel.value === 'sec') { C.closeModal(); C.ekipmanBazSec(id, () => openLib()); return; } if (C.ekipmanBaz(id, sel.value)) C.log(`${d.name}: ekleme noktası → ${BAZAD[sel.value]}.`); draw(); }; }
          else if (act === 'del') { if (C.doc.ents.some(e => e.type === 'blk' && e.ref === id)) { C.warn(`${d.name} çizimde kullanılıyor; önce çizimdekileri silin.`); return; } C.blib.remove(id); refresh(); draw(); C.log(`${d.name} kütüphaneden silindi.`); }
        };
      });
    };
    $('#eqQ').oninput = draw; $('#eqK').onchange = draw;
    $('#eqUp').onclick = async () => { C.closeModal(); const n = await askImport(null); if (n) openLib(); };
    $('#eqNet').onclick = () => { C.closeModal(); C.runTool ? C.runTool('MODELKUTUPHANESI') : C.cmd.script('MODELKUTUPHANESI'); };
    const dz = $('#eqDrop'); dz.ondragover = e => { e.preventDefault(); dz.classList.add('on'); }; dz.ondragleave = () => dz.classList.remove('on');
    dz.ondrop = async e => { e.preventDefault(); dz.classList.remove('on'); const fs = [...e.dataTransfer.files]; if (!fs.length) return; C.closeModal(); const n = await askImport(fs); if (n) openLib(); };
    draw();
  };
  C.openEkipmanLib = openLib;

  /* ---------- şerit: Mekanik sekmesi ---------- */
  const it = (cmd, t, i, big) => ({ cmd, t, i, big: !!big });
  const katIc = { 'Pompa': 'pump', 'Dalgıç pompa': 'pump', 'Blower / kompresör': 'box', 'Mikser': 'rot', 'Difüzör': 'dot', 'Sıyırıcı / köprü': 'beam', 'Izgara / elek': 'grid', 'Vana': 'valve', 'Dozaj / kimyasal': 'pump', 'Dekantör / susuzlaştırma': 'box', 'Tank / depo': 'tank', 'Vinç / kaldırma': 'beam', 'Ölçüm / enstrüman': 'dot', 'Diğer ekipman': 'box' };
  const buildTab = () => {
    const L = all(), cnt = k => L.filter(d => d.tur === k).length, rc = recent().map(id => C.blib.cache[id]).filter(Boolean);
    const kats = KN.map(k => it('EKIPMAN KAT=' + k.replace(/ /g, '_'), `${k}${cnt(k) ? ' (' + cnt(k) + ')' : ''}`, katIc[k] || 'box'));
    return ['Mekanik', [
      ['Ekipman', [it('EKIPMAN', 'Kütüphane', 'box', true), it('EKIPMANYUKLE', 'Ekipman yükle', 'pp', true), it('MODELKUTUPHANESI', 'İnternetten ara', 'earth')]],
      ...(C.borulamaPanel ? [C.borulamaPanel()] : []),
      ['Kategoriler', kats.slice(0, 7)], ['Kategoriler (2)', kats.slice(7)],
      ['Son kullanılanlar', rc.length ? rc.slice(0, 6).map(d => it('EKIPMANEKLE ID=' + d.id, d.name.length > 18 ? d.name.slice(0, 17) + '…' : d.name, katIc[d.tur] || 'box')) : [it('EKIPMAN', 'Henüz yok — kütüphane', 'box')]],
      ['Hat ve bağlantı', [it('BORU', 'Boru', 'pipe', true), it('POMPA', 'Pompa (şema)', 'pump'), it('VB', 'Hatta vana', 'valve'), it('FITEKLE', 'Fitting', 'pipe'), it('KUTUPHANE', 'Blok kütüphanesi', 'valve'), it('BOM HEPSI', 'Malzeme listesi', 'table')]],
    ]];
  };
  function refresh() {
    if (!C.ribbon || !C.ribbon.tabs) return; const T = C.ribbon.tabs, i = T.findIndex(t => t[0] === 'Mekanik'), nt = buildTab();
    if (i >= 0) T[i] = nt; else { const j = T.findIndex(t => t[0] === '3B Modelleme'); T.splice(j >= 0 ? j : T.length, 0, nt); }
    C.ribbon.render();
  }
  C.ekipmanRefresh = refresh;
  C.on('blib', () => refresh()); setTimeout(() => { refresh(); setTimeout(refresh, 1500); }, 0);

  /* ---------- komutlar ---------- */
  C.addCommand(['EKIPMAN', 'EKIPMANLAR', 'MEKANIK'], 'Mekanik ekipman kütüphanesi (3B): pompa, blower, mikser, difüzör, sıyırıcı … karta tıklayıp çizime yerleştirin. EKIPMAN KAT=Pompa', async (I) => {
    const kv = {}; C.cmd.queue = C.cmd.queue.filter(t => { const m = /^([A-Za-z]+)=(.*)$/.exec(t); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; });
    const k = kv.KAT ? (KN.find(x => C.up(x.replace(/ /g, '_')) === C.up(kv.KAT)) || KN.find(x => C.up(x).startsWith(C.up(kv.KAT.replace(/_/g, ' ')))) || '') : null;
    openLib(k);
  }, { noUndo: true });
  C.addCommand(['EKIPMANYUKLE', 'EKIPMANEKLEDOSYA', 'MEKYUKLE'], '3B mekanik ekipman dosyalarını (GLB / glTF / OBJ / STL, birden çok) kategori, birim ve yükseklikle kütüphaneye ekler', async () => { await askImport(null); }, { noUndo: true });
  C.addCommand(['EKIPMANEKLE', 'EKIPMANYERLESTIR'], 'Kütüphanedeki ekipmanı yerleştirir: EKIPMANEKLE ID=… (ya da AD=…)', async (I) => {
    const kv = {}; C.cmd.queue = C.cmd.queue.filter(t => { const m = /^([A-Za-z]+)=(.*)$/.exec(t); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; });
    let d = kv.ID ? C.blib.cache[kv.ID] : null; if (!d && kv.AD) d = all().find(x => C.up(x.name) === C.up(kv.AD)); if (!d) { openLib(); return; }
    if ((C.currentView === 'layout' && !C.vpEdit) || C.currentView === 'map') C.setView('plan');
    pushRecent(d.id); await yerlestir(I, d);
  });

  /* ---------- boru ucuna yerleştirme: çap ve yön borudan ----------
     Tıklanan nokta bir borunun / 3B ek parçanın (flanş, dirsek …) ucuysa: o ucun DN'i ve ekseni alınır.
     Kütüphanede aynı ürünün o DN'de modeli varsa o kullanılır; yoksa model DN oranında ölçeklenir (flanş boru çapına oturur, yaklaşık).
     Dönme açısı boru ekseninden gelir (Enter ile kabul; vana modellerinde boru ekseni modelin X ekseni olmalı — değilse ⟳ ↻Z). */
  const OD_DN = [[63, 50], [75, 65], [90, 80], [110, 100], [125, 100], [140, 125], [160, 150], [180, 150], [200, 200], [225, 200], [250, 250], [280, 250], [315, 300], [355, 350], [400, 400], [450, 450], [500, 500], [560, 500], [630, 600], [710, 700], [800, 800]];
  const PLAST = new Set(['pe', 'pvc', 'pvck', 'ppr']);
  const dnOfEnt = e => { const v = +e.dn || 0; if (!v) return null; if (PLAST.has(e.cins)) { let r = OD_DN[0][1]; for (const [od, dn] of OD_DN) if (v >= od - 0.5) r = dn; return r; } return v; };
  const dnOfDef = d => d.dn || (C.parseBlockName ? C.parseBlockName(d.name).dn : null) || null;
  const temel = n => C.up(String(n || '').replace(/[_\-\s]*(DN|Ø|⌀)\s*[-_ ]?\d{2,4}/ig, '').replace(/\s+/g, ' ').trim());
  const grupK = d => temel(d.name) + '|' + (d.marka || '') + '|' + d.tur;
  const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], (a[2] || 0) - (b[2] || 0));
  /* boşta duran bağlantı uçları: boru uçları + 3B ek parça (flanş, dirsek, TE …) uçları; başka bir parçanın ucuyla çakışan uçlar dolu sayılır.
     Flanşlı boru ucunda boşta kalan uç flanşın DIŞ YÜZÜDÜR → ekipman oraya (conta payı bırakarak) oturur. */
  const uclar = () => {
    const L = [];
    for (const e of C.doc.ents) {
      if (C.layer && !C.layer(e.layer).on) continue;
      if (e.type === 'pipe' && e.pts && e.pts.length > 1) for (const [i, j] of [[0, 1], [e.pts.length - 1, e.pts.length - 2]]) { const a = M.p3(e.pts[i]), b = M.p3(e.pts[j]); L.push({ p: a, u: [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dn: dnOfEnt(e), od: +e.od || +e.dn || 100, e }); }
      else if (e.type === 'fit3' && C.T.fit3 && C.T.fit3.snaps) { let sn = []; try { sn = (C.T.fit3.snaps(e) || []).filter(s => s.k === 'end'); } catch (er) { } const c0 = M.p3(e.p);
        for (const s of sn) { const q = M.p3(s.p); const u = d3(q, c0) > 1e-6 ? [q[0] - c0[0], q[1] - c0[1], q[2] - c0[2]] : (e.u ? [-e.u[0], -e.u[1], -(e.u[2] || 0)] : null); L.push({ p: q, u, dn: dnOfEnt(e), od: +e.od || +e.dn || 100, e, fl: /flans|kor|adaptor/.test(e.kind || '') }); } }
    }
    for (const x of L) x.dolu = L.some(y => y.e !== x.e && d3(x.p, y.p) < 0.006);
    return L;
  };
  const boruUcu = p => {
    p = [p[0], p[1], p[2] || 0]; let best = null, bs = Infinity;
    for (const x of uclar()) {
      if (x.dolu) continue;
      const R = Math.max(0.08, x.od / 2000 * 2.2), dd = d3(x.p, p), dxy = Math.hypot(x.p[0] - p[0], x.p[1] - p[1]); // flanşın üzerinde herhangi bir yere tıklamak yeter
      const dist = Math.min(dd, Math.abs(p[2]) < 1e-9 ? dxy : Infinity); if (dist > R) continue;
      const sk = dist / R - (x.fl ? 0.3 : 0); if (sk < bs) { bs = sk; best = { dn: x.dn, u: x.u, p: x.p, fl: x.fl }; }
    }
    return best;
  };
  const yerlestir = async (I, d0) => {
    let d = C.useDef(d0); const k = C.unitK(d);
    const tmp = { type: 'blk', ref: d.id, p: [0, 0, 0], rot: 0, sx: k, sy: k, layer: C.doc.cur.layer };
    C.cmd.preview = c => { tmp.p = c; return C.T.blk.prims(tmp); };
    const p = await I.pt(`Yerleştirme noktası (${d.name}) — boru ucundaki flanşın üzerine tıklayın: çap, yön ve kot borudan alınır, otomatik oturur`); C.cmd.preview = null; if (!p || typeof p === 'string') return null;
    let f = 1, rot0 = 0, dnYeni = dnOfDef(d0);
    const b = boruUcu(p);
    if (b) {
      const dnB = b.dn, dnD = dnOfDef(d0);
      if (dnB && dnD && dnB !== dnD) {
        const kardes = all().find(x => x.id !== d0.id && x.mesh3d && grupK(x) === grupK(d0) && dnOfDef(x) === dnB);
        if (kardes) { d = C.useDef(kardes); dnYeni = dnB; C.log(`Boru DN${dnB}: kütüphanedeki ${kardes.name} kullanıldı.`); }
        else { f = dnB / dnD; dnYeni = dnB; C.warn(`Boru DN${dnB}, model DN${dnD}: model ×${M.fmt(f, 2)} ölçeklendi (flanş boru çapına oturur, gövde ölçüleri yaklaşık). Kesin ölçü için DN${dnB} modelini yükleyin.`); }
      } else if (dnB && !dnD) C.log(`Boru DN${dnB}; modelin çapı bilinmiyor (dosya adında "DN…" yok) — ölçek değişmedi.`);
      const yatay = b.u && Math.hypot(b.u[0], b.u[1]) > 0.7 * Math.hypot(b.u[0], b.u[1], b.u[2]), dg = r => r * 180 / Math.PI;
      const yz = d.yuz && Math.hypot(d.yuz[0], d.yuz[1]) > 0.7 ? d.yuz : null;
      if (yatay) rot0 = yz ? dg(Math.atan2(-b.u[1], -b.u[0]) - Math.atan2(yz[1], yz[0])) : dg(Math.atan2(b.u[1], b.u[0]));
      else if (b.u) C.warn('Düşey boru ucu: model düşey eksene çevrilemiyor; açıyı elle verin.');
      p[0] = b.p[0]; p[1] = b.p[1]; p[2] = b.p[2];
      const cp = +store.get('contaPayi', 3) || 0, ul = b.u ? Math.hypot(b.u[0], b.u[1], b.u[2]) : 0;
      if (yz && ul > 1e-9 && cp > 0) { for (let i = 0; i < 3; i++) p[i] += b.u[i] / ul * cp / 1000; C.log(`Flanş yüzü boruya bakacak şekilde yerleşti; conta payı ${cp} mm.`); }
    }
    tmp.ref = d.id; tmp.sx = tmp.sy = C.unitK(d) * f; tmp.p = p;
    C.cmd.base = p; C.cmd.preview = c => { tmp.rot = M.deg(M.ang(p, c)); return C.T.blk.prims(tmp); };
    const otomatik = !!(b && b.u && (d.yuz || b.fl)); // flanşa tıklandı: açı sorulmaz
    if (otomatik) C.log(`Boru ucuna otomatik yerleşti${b.fl ? ' (flanşın dış yüzü)' : ''} · açı ${M.fmt(rot0, 1)}°${d.yuz ? '' : ' — ekipmanın flanş yüzü tanımlı değil: kütüphanede ⌖ → "Kendim belirle" ile flanşa tıklayın'}.`);
    const rot = C.cmd.scriptMode || otomatik ? rot0 : await I.angle(`Döndürme açısı (boru yönü)${b ? ' <Enter: borudan ' + M.fmt(rot0, 1) + '°>' : ''}`, p, rot0); C.cmd.preview = null; C.cmd.base = null;
    const lay = C.doc.cur.layer === '0' ? (d.layer ? (C.ensureLayer(d.layer, d.layerColor || 8, 'CONTINUOUS', 25), d.layer) : C.std(d.tur === 'Pompa' ? 'POMPA' : 'VANA')) : C.doc.cur.layer;
    const e = C.add(C.newEnt('blk', { ref: d.id, p, rot: rot == null ? rot0 : rot, sx: tmp.sx, sy: tmp.sx, tur: d.tur, dn: dnYeni || d.dn, view: d.view, layer: lay }));
    C.changed && C.changed(); return e;
  };
})(window.C);

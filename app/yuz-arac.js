/* ArıtmaCAD — DELİK PENCERELERİNDE ÇİZİM ARAÇLARI ve YAKALAMA (perde yüz düzenleyici + döşeme / radye düzenleyici)
   Araçlar : Seç / taşı (sürükle) · Dikdörtgen (2 köşe) · Daire (merkez + çap) · Kopyala (çoklu yerleştir) · Dizi (doğru / yay boyunca N adet)
   Yakalama: uç / köşe (□), orta nokta (△), merkez (○), en yakın (✕), yay 45° / orta kılavuzları (┆), 5 cm ızgara
   Ölçü    : ikinci noktada klavyeden yazılır (cm): dikdörtgen "60,40", daire "30"; Enter uygular, Esc iptal.
   Pencere bir "bağlantı" nesnesi verir (çerçeve dönüşümü, delik listesi, yakalama öğeleri), araç kendi katmanını çizer. */
(function (C) {
  'use strict'; if (!C) return;
  const cm = v => String(Math.round(v * 100)), PX = 10;
  const bagla = (A) => {
    // A: { cv, panel (HTMLElement), T() → {X,Z,sc,ox,oy}, kenar() → [[u0,v0,u1,v1]...], noktalar() → [{u,v,tip}], kilavuz() → [{u}|{v}, ad],
    //      sinir() → [u0,v0,u1,v1], liste() → [{o, i, g:{sekil,cx,cy,w,h}, kendi}], merkezAyarla(o,cx,cy), yeni(sekil,cx,cy,w,h) → o, kopya(o) → o, sec(i), secili() → i, yenile() }
    const S = { yrd: [], ySec: -1, ofs: null, orto: true, arac: 'sec', p1: null, fare: null, snap: null, surukle: null, yaz: '', acik: true, kopya: null };
    const panel = document.createElement('div'); panel.style.cssText = 'margin:8px 0;padding:8px;border:1px solid #d5dde0;border-radius:6px;background:#f7f9fa';
    panel.innerHTML = `<div style="font-weight:700;margin-bottom:6px">Çizim araçları</div>
      <div class="ya-btn" style="display:flex;flex-wrap:wrap;gap:4px">
        <button data-a="sec" title="Seç / sürükleyerek taşı (Esc)">Seç / Taşı</button><button data-a="dik" title="İki köşeyle dikdörtgen boşluk (R)">▭ Dikdörtgen</button><button data-a="daire" title="Merkez + çap ile daire boşluk (D)">◯ Daire</button>
        <button data-a="kopya" title="Seçili boşluğu kopyala, tıklayarak yerleştir (C)">Kopyala</button><button data-a="dizi" title="Seçili boşluktan doğru / yay boyunca N adet">Dizi</button></div>
      <div style="font-size:12px;color:#5a6b71;margin:6px 0 2px">Yardımcı çizim (yalnız yer bulmak için; delik açmaz):</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px"><button data-a="cizgi" title="Çizgi / çoklu çizgi (L) — uzunluk yazılabilir: 120 ya da 120,45 (cm, °)">Çizgi</button><button data-a="ofs" title="Ötele (O): çizgiyi seç, mesafe yaz ya da tıkla, tarafı tıkla">Ötele</button><button data-a="buda" title="Buda / trim (T): kesişimler arasındaki parçaya tıkla">Buda</button><button data-a="uzat" title="Uzat / extend (E): çizginin ucuna yakın tıkla">Uzat</button><button data-a="ysil" title="Tüm yardımcı çizgileri sil">Yardımcıları sil</button></div>
      <div class="ya-model" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;align-items:center"><button class="ya-aktar" title="Yardımcı çizgileri modele 3B çizgi olarak çiz (KENAR_CIZGI katmanı) — perdeyi bu çizgilere yakalayarak çizebilirsiniz">Çizgileri modele çiz</button><span class="ya-pgrp" style="display:none;gap:4px;align-items:center"><button class="ya-perde" title="Seçili yardımcı çizgi boyunca perde oluştur">Seçili çizgiden perde</button> t <input class="ya-pt" type="number" value="30" step="5" style="width:52px"> cm <select class="ya-ph" style="width:auto"><option value="O">eksen</option><option value="L">sol yüz</option><option value="R">sağ yüz</option></select></span></div>
      <label style="display:flex;align-items:center;gap:6px;margin-top:6px"><input type="checkbox" class="ya-snap" checked style="width:auto"> Yakalama (uç, orta, merkez, kesişim, en yakın, 5 cm ızgara)</label><label style="display:flex;align-items:center;gap:6px"><input type="checkbox" class="ya-orto" checked style="width:auto"> Orto (çizgi yatay / düşey)</label>
      <div class="ya-dizi" style="display:none;margin-top:6px;display:none;grid-template-columns:1fr 80px;gap:4px 6px;align-items:center"></div>
      <div class="ya-durum" style="margin-top:6px;font-size:12px;color:#0b6e8a;min-height:32px"></div>`;
    A.panel.prepend(panel);
    const q = s => panel.querySelector(s), durum = t => { q('.ya-durum').innerHTML = t || ''; };
    const aracSec = a => { S.arac = a; S.p1 = null; S.yaz = ''; S.kopya = null; panel.querySelectorAll('[data-a]').forEach(b => { b.style.background = b.dataset.a === a ? '#0b6e8a' : ''; b.style.color = b.dataset.a === a ? '#fff' : ''; });
      A.cv.style.cursor = a === 'sec' ? 'default' : 'crosshair';
      if (a === 'dizi') diziFormu(); else q('.ya-dizi').style.display = 'none';
      if (a === 'kopya') { const L = secili(); if (!L) { durum('Önce kopyalanacak boşluğu seçin.'); S.arac = 'sec'; return aracSec('sec'); } S.kopya = L; durum('Kopyayı yerleştirmek için tıklayın (yakalama: kopyanın merkezi / köşesi). Sağ tık ya da Esc: bitir.'); }
      else if (a === 'ysil') { S.yrd = []; kaydet(); S.arac = 'sec'; durum('Yardımcı çizgiler silindi.'); }
      else durum({ sec: 'Boşluğu ya da yardımcı çizgiyi tıklayarak seçin, boşluğu sürükleyerek taşıyın. Del: sil.', dik: 'Birinci köşeyi tıklayın.', daire: 'Merkezi tıklayın.', dizi: '', cizgi: 'Başlangıç noktasını tıklayın.', ofs: 'Ötelenecek yardımcı çizgiyi tıklayın.', buda: 'Silinecek parçaya tıklayın (iki kesişim arası).', uzat: 'Uzatılacak çizginin ucuna yakın tıklayın.' }[a] || '');
      A.yenile(); };
    panel.querySelectorAll('[data-a]').forEach(b => b.onclick = () => aracSec(b.dataset.a));
    q('.ya-snap').onchange = ev => { S.acik = ev.target.checked; }; q('.ya-orto').onchange = ev => { S.orto = ev.target.checked; };
    // ---- yardımcı çizgiler (pencere kaydeder: A.yardimAl / A.yardimYaz) ----
    S.yrd = (A.yardimAl ? A.yardimAl() : []) || []; const kaydet = () => { if (A.yardimYaz) A.yardimYaz(S.yrd.map(k => k.map(v => Math.round(v * 10000) / 10000))); };
    const kes2 = (a, b) => { const r = [a[2] - a[0], a[3] - a[1]], s2 = [b[2] - b[0], b[3] - b[1]], den = r[0] * s2[1] - r[1] * s2[0]; if (Math.abs(den) < 1e-12) return null; const qp = [b[0] - a[0], b[1] - a[1]], t = (qp[0] * s2[1] - qp[1] * s2[0]) / den, w = (qp[0] * r[1] - qp[1] * r[0]) / den; return { t, w, p: [a[0] + r[0] * t, a[1] + r[1] * t] }; };
    const tumKenar = () => S.yrd.concat(A.kenar());
    const segUzak = (k, u, v) => { const du = k[2] - k[0], dv = k[3] - k[1], L2 = du * du + dv * dv || 1, t = Math.max(0, Math.min(1, ((u - k[0]) * du + (v - k[1]) * dv) / L2)); return { d: Math.hypot(k[0] + du * t - u, k[1] + dv * t - v), t }; };
    const yrdBul = (u, v) => { const T = A.T(); let best = -1, bd = 7 / T.sc; S.yrd.forEach((k, i) => { const d = segUzak(k, u, v).d; if (d < bd) { bd = d; best = i; } }); return best; };
    const budaYap = (i, u, v) => { const k = S.yrd[i], t0 = segUzak(k, u, v).t, ts = []; tumKenar().forEach((b, j) => { if (b === k) return; const x = kes2(k, b); if (x && x.t > 1e-6 && x.t < 1 - 1e-6 && x.w >= -1e-6 && x.w <= 1 + 1e-6) ts.push(x.t); }); ts.sort((a, b) => a - b);
      const ta = Math.max(0, ...ts.filter(t => t < t0)), tb = Math.min(1, ...ts.filter(t => t > t0)), P = t => [k[0] + (k[2] - k[0]) * t, k[1] + (k[3] - k[1]) * t], yeni = [];
      if (ta > 1e-6) yeni.push([k[0], k[1], ...P(ta)]); if (tb < 1 - 1e-6) yeni.push([...P(tb), k[2], k[3]]); S.yrd.splice(i, 1, ...yeni); kaydet(); durum(ts.length ? 'Budandı.' : 'Kesişim yoktu — çizgi silindi.'); };
    const uzatYap = (i, u, v) => { const k = S.yrd[i], bas = Math.hypot(u - k[0], v - k[1]) < Math.hypot(u - k[2], v - k[3]); const a = bas ? [k[2], k[3]] : [k[0], k[1]], e = bas ? [k[0], k[1]] : [k[2], k[3]], ray = [a[0], a[1], e[0], e[1]]; let tb = Infinity, pb = null;
      tumKenar().forEach(b => { if (b === k) return; const x = kes2(ray, b); if (x && x.t > 1 + 1e-6 && x.w >= -1e-6 && x.w <= 1 + 1e-6 && x.t < tb) { tb = x.t; pb = x.p; } });
      if (!pb) { durum('Uzatılacak bir sınır bulunamadı.'); return; } if (bas) { k[0] = pb[0]; k[1] = pb[1]; } else { k[2] = pb[0]; k[3] = pb[1]; } kaydet(); durum('Uzatıldı.'); };
    const ofsYap = (i, d, u, v) => { const k = S.yrd[i], du = k[2] - k[0], dv = k[3] - k[1], L = Math.hypot(du, dv) || 1, n = [-dv / L, du / L], sg = Math.sign((u - k[0]) * n[0] + (v - k[1]) * n[1]) || 1; S.yrd.push([k[0] + n[0] * d * sg, k[1] + n[1] * d * sg, k[2] + n[0] * d * sg, k[3] + n[1] * d * sg]); kaydet(); durum(`Ötelendi (${cm(d)} cm). Başka çizgi seçin ya da Esc.`); };
    q('.ya-aktar').onclick = () => { if (!A.modeleCiz) return; const n = A.modeleCiz(S.yrd); durum(n ? `${n} çizgi modele çizildi (KENAR_CIZGI katmanı). Pencereyi kapatıp perdeyi bu çizgilere yakalayarak çizebilirsiniz.` : 'Modele çizilecek yardımcı çizgi yok.'); };
    if (A.perdeYap) { q('.ya-pgrp').style.display = 'inline-flex'; q('.ya-perde').onclick = () => { if (S.ySec < 0) { durum('Önce Seç / Taşı ile bir yardımcı çizgiye tıklayın.'); return; } const t = (+q('.ya-pt').value || 30) / 100; const r = A.perdeYap(S.yrd[S.ySec], t, q('.ya-ph').value); durum(r || `Perde oluşturuldu (t=${cm(t)} cm).`); }; }
    const ortoUygula = (p0, u, v) => { if (!S.orto) return { u, v }; return Math.abs(u - p0.u) >= Math.abs(v - p0.v) ? { u, v: p0.v } : { u: p0.u, v }; };

    const secili = () => { const i = A.secili(); return A.liste().find(L => L.i === i) || null; };
    // ---- yakalama ----
    const yakala = (u, v) => { const T = A.T(); if (!T) return { u, v, tip: null }; const r = PX / T.sc; let best = null; const TIER = { uc: 0, merkez: 0, orta: 1, kilavuz: 2, yakin: 3 }; const aday = (uu, vv, tip, ad, yon) => { const d = Math.hypot(uu - u, vv - v), tr = TIER[tip] != null ? TIER[tip] : 4; if (d <= r && (!best || tr < best.tr || (tr === best.tr && d < best.d))) best = { u: uu, v: vv, tip, ad, d, tr, yon }; }; // önce nokta (uç / merkez), sonra orta, kılavuz, en yakın
      if (!S.acik) return { u, v, tip: null };
      for (const p of A.noktalar()) aday(p.u, p.v, p.tip, p.ad, -1);
      for (const L of A.liste()) { if (S.surukle && S.surukle.L === L) continue; const g = L.g, hw = g.w / 2, hh = (g.sekil === 'D' ? g.w : g.h) / 2; aday(g.cx, g.cy, 'merkez', 'boşluk merkezi', -1); if (g.sekil !== 'D') { for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) aday(g.cx + a * hw, g.cy + b * hh, 'uc', 'boşluk köşesi', -1); for (const [a, b] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) aday(g.cx + a * hw, g.cy + b * hh, 'orta', 'kenar ortası', -0.5); } else for (const [a, b] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) aday(g.cx + a * hw, g.cy + b * hw, 'uc', 'çeyrek', -0.5); }
      { const H = S.yrd, E2 = A.kenar(); for (let i = 0; i < H.length; i++) for (const b of H.slice(i + 1).concat(E2)) { const x = kes2(H[i], b); if (x && x.t >= -1e-6 && x.t <= 1 + 1e-6 && x.w >= -1e-6 && x.w <= 1 + 1e-6) aday(x.p[0], x.p[1], 'uc', 'kesişim'); } }
      for (const k of S.yrd.concat(A.kenar())) { const [u0, v0, u1, v1] = k; aday(u0, v0, 'uc', 'uç', -1); aday(u1, v1, 'uc', 'uç', -1); aday((u0 + u1) / 2, (v0 + v1) / 2, 'orta', 'orta nokta', -0.5); const du = u1 - u0, dv = v1 - v0, L2 = du * du + dv * dv || 1, t = Math.max(0, Math.min(1, ((u - u0) * du + (v - v0) * dv) / L2)); aday(u0 + du * t, v0 + dv * t, 'yakin', 'en yakın', 0.6); }
      for (const g of A.kilavuz()) { if (g.u != null) aday(g.u, v, 'kilavuz', g.ad, 'u'); if (g.v != null) aday(u, g.v, 'kilavuz', g.ad, 'v'); }
      if (best) return best; return { u: Math.round(u * 20) / 20, v: Math.round(v * 20) / 20, tip: 'izgara', ad: '5 cm ızgara' }; };
    const dunya = ev => { const T = A.T(), r = A.cv.getBoundingClientRect(); return [(ev.clientX - r.left - T.ox) / T.sc, (T.oy - (ev.clientY - r.top)) / T.sc]; };
    // ---- kesinleştirme ----
    const r3 = v => Math.round(v * 1000) / 1000;
    const dikTamam = (p1, p2) => { const w = r3(Math.abs(p2.u - p1.u)), h = r3(Math.abs(p2.v - p1.v)); if (w < 0.02 || h < 0.02) { durum('Çok küçük — yeniden deneyin.'); return; } const o = A.yeni('R', (p1.u + p2.u) / 2, (p1.v + p2.v) / 2, w, h); A.sec(o); S.p1 = null; S.yaz = ''; durum(`Dikdörtgen boşluk ${cm(w)}×${cm(h)} eklendi. Birinci köşe için yeniden tıklayın ya da Seç / Taşı.`); A.yenile(); };
    const daireTamam = (c, cap) => { cap = r3(cap); if (cap < 0.02) { durum('Çap çok küçük.'); return; } const o = A.yeni('D', c.u, c.v, cap, cap); A.sec(o); S.p1 = null; S.yaz = ''; durum(`Daire boşluk Ø${cm(cap)} eklendi.`); A.yenile(); };
    // ---- dizi ----
    const diziFormu = () => { const L = secili(), d = q('.ya-dizi'); if (!L) { durum('Önce dizilecek boşluğu seçin.'); S.arac = 'sec'; aracSec('sec'); return; } d.style.display = 'grid';
      const yay = A.yayBilgi ? A.yayBilgi() : null;
      d.innerHTML = `<span>Yön</span><select class="ya-dy">${['<option value="u">Yatay (sağa)</option>', '<option value="-u">Yatay (sola)</option>', '<option value="v">Düşey (yukarı)</option>', '<option value="-v">Düşey (aşağı)</option>', yay ? '<option value="a">Yay boyunca (açı)</option>' : ''].join('')}</select>
        <span>Toplam adet</span><input class="ya-dn" type="number" min="2" step="1" value="4"><span class="ya-dal">Aralık (m)</span><input class="ya-dd" type="number" step="0.05" value="1.00"><span></span><button class="ya-dok">Diziyi oluştur</button>`;
      const dy = q('.ya-dy'); dy.onchange = () => { q('.ya-dal').textContent = dy.value === 'a' ? 'Açı aralığı (°)' : 'Aralık (m)'; q('.ya-dd').value = dy.value === 'a' ? '45' : '1.00'; };
      q('.ya-dok').onclick = () => { const n = Math.max(2, Math.round(+q('.ya-dn').value || 2)), a = +q('.ya-dd').value || 0, y = dy.value, g = L.g; let say = 0, dis = 0;
        for (let k = 1; k < n; k++) { let cx = g.cx, cy = g.cy; if (y === 'u') cx += k * a; else if (y === '-u') cx -= k * a; else if (y === 'v') cy += k * a; else if (y === '-v') cy -= k * a; else if (y === 'a' && yay) cx += k * a * Math.PI / 180 * yay.R;
          const sb = A.sinir(), hw = g.w / 2, hh = (g.sekil === 'D' ? g.w : g.h) / 2; if (sb && (cx - hw < sb[0] - 1e-6 || cx + hw > sb[2] + 1e-6 || cy - hh < sb[1] - 1e-6 || cy + hh > sb[3] + 1e-6)) { dis++; continue; }
          const o = A.kopya(L.o); A.merkezAyarla(o, cx, cy); say++; }
        durum(`${say} kopya eklendi.${dis ? ` ${dis} tanesi perde / döşeme dışına taştığı için konmadı.` : ''}`); aracSec('sec'); };
      durum('Diziyi ayarlayın: ilk eleman seçili boşluktur.'); };
    // ---- fare ----
    const cv = A.cv; cv.onclick = null;
    cv.addEventListener('mousedown', ev => { if (ev.button !== 0 || ev.shiftKey) return; const T = A.T(); if (!T) return; const [u, v] = dunya(ev), sn = yakala(u, v);
      if (S.arac === 'sec') { const hit = A.liste().filter(L => { const g = L.g; return g.sekil === 'D' ? Math.hypot(u - g.cx, v - g.cy) <= g.w / 2 + 4 / T.sc : Math.abs(u - g.cx) <= g.w / 2 + 4 / T.sc && Math.abs(v - g.cy) <= g.h / 2 + 4 / T.sc; }).pop();
        if (!hit) { S.ySec = yrdBul(u, v); if (S.ySec >= 0) durum('Yardımcı çizgi seçili — Del: sil.'); A.yenile(); return; } S.ySec = -1; A.sec(hit.o); A.yenile(); if (hit.kendi === false) { durum('Bu boşluk İT/ÇEK ya da boru geçişiyle açılmış — burada taşınamaz, yalnız silinebilir.'); return; }
        S.surukle = { L: hit, du: u - hit.g.cx, dv: v - hit.g.cy, oynadi: false }; ev.preventDefault(); ev.stopPropagation(); return; }
      if (S.arac === 'cizgi') { if (!S.p1) { S.p1 = sn; S.yaz = ''; durum('Sonraki noktayı tıklayın — ya da uzunluk yazın (cm): <b>120</b> ya da <b>120,45</b> (°) ↵. Sağ tık / Esc: bitir.'); } else { const q2 = sn.tip && sn.tip !== 'izgara' ? sn : ortoUygula(S.p1, sn.u, sn.v); S.yrd.push([S.p1.u, S.p1.v, q2.u, q2.v]); kaydet(); S.p1 = { u: q2.u, v: q2.v }; S.yaz = ''; } A.yenile(); return; }
      if (S.arac === 'ofs') { if (!S.ofs) { const i = yrdBul(u, v); if (i < 0) { durum('Yardımcı çizgi bulunamadı — çizgiye tıklayın.'); return; } S.ofs = { i, d: null }; S.p1 = { u, v }; S.yaz = ''; durum('Mesafeyi yazın (cm) ↵ sonra tarafı tıklayın — ya da doğrudan geçeceği noktaya tıklayın.'); }
        else { const k = S.yrd[S.ofs.i]; let d = S.ofs.d; if (d == null) { const du = k[2] - k[0], dv = k[3] - k[1], L = Math.hypot(du, dv) || 1; d = Math.abs(((sn.u - k[0]) * -dv + (sn.v - k[1]) * du) / L); } ofsYap(S.ofs.i, d, u, v); S.ofs = null; S.p1 = null; } A.yenile(); return; }
      if (S.arac === 'buda' || S.arac === 'uzat') { const i = yrdBul(u, v); if (i < 0) { durum('Yardımcı çizgi bulunamadı — çizginin üstüne tıklayın.'); return; } if (S.arac === 'buda') budaYap(i, u, v); else uzatYap(i, u, v); A.yenile(); return; }
      if (S.arac === 'dik') { if (!S.p1) { S.p1 = sn; S.yaz = ''; durum('Karşı köşeyi tıklayın — ya da ölçüyü yazın (cm): <b>genişlik,yükseklik</b> ör. 60,40 ↵'); } else dikTamam(S.p1, sn); A.yenile(); return; }
      if (S.arac === 'daire') { if (!S.p1) { S.p1 = sn; S.yaz = ''; durum('Çap için tıklayın — ya da çapı yazın (cm) ör. 30 ↵'); } else daireTamam(S.p1, 2 * Math.hypot(sn.u - S.p1.u, sn.v - S.p1.v)); A.yenile(); return; }
      if (S.arac === 'kopya' && S.kopya) { const g = S.kopya.g, p = kopyaYer(u, v); const o = A.kopya(S.kopya.o); A.merkezAyarla(o, p.cx, p.cy); durum(`Kopya yerleştirildi (merkez ${cm(p.cx)} / ${cm(p.cy)}). Devam edin ya da sağ tık / Esc.`); void g; A.yenile(); return; }
    }, true);
    // kopya / taşımada: boşluğun merkezi ya da bir köşesi yakalansın
    const kopyaYer = (u, v, L0) => { const L = L0 || S.kopya, g = L.g, du = L0 && S.surukle ? S.surukle.du : 0, dv = L0 && S.surukle ? S.surukle.dv : 0, cx = u - du, cy = v - dv, hw = g.w / 2, hh = (g.sekil === 'D' ? g.w : g.h) / 2;
      const anah = g.sekil === 'D' ? [[0, 0], [0, -hh], [0, hh], [-hw, 0], [hw, 0]] : [[0, 0], [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh], [0, -hh], [0, hh], [-hw, 0], [hw, 0]];
      let best = null; for (const [a, b] of anah) { const sn = yakala(cx + a, cy + b); if (sn.tip && sn.tip !== 'izgara') { const d = Math.hypot(sn.u - (cx + a), sn.v - (cy + b)); if (!best || d < best.d) best = { d, cx: sn.u - a, cy: sn.v - b, sn }; } }
      if (best) { S.snap = best.sn; return best; } S.snap = { u: Math.round(cx * 20) / 20, v: Math.round(cy * 20) / 20, tip: 'izgara' }; return { cx: S.acik ? S.snap.u : cx, cy: S.acik ? S.snap.v : cy }; };
    const mm = ev => { const T = A.T(); if (!T || !document.body.contains(cv)) return; const r = cv.getBoundingClientRect(); if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) { if (!S.surukle) { S.fare = null; A.yenile(); } if (!S.surukle) return; }
      const [u, v] = dunya(ev);
      if (S.surukle) { const p = kopyaYer(u, v, S.surukle.L); A.merkezAyarla(S.surukle.L.o, p.cx, p.cy); S.surukle.oynadi = true; S.surukle.L = A.liste().find(L => L.o === S.surukle.L.o) || S.surukle.L; S.fare = { u, v }; A.yenile(); return; }
      S.fare = { u, v }; S.snap = S.arac === 'kopya' ? (kopyaYer(u, v), S.snap) : yakala(u, v); A.yenile(); };
    const mu = () => { if (S.surukle) { const L = S.surukle.L; S.surukle = null; if (L) durum(`Taşındı: merkez ${cm(L.g.cx)} / ${cm(L.g.cy)}`); A.yenile(); } };
    window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu);
    cv.addEventListener('contextmenu', ev => { if (S.arac === 'cizgi' && S.p1) { ev.preventDefault(); S.p1 = null; durum('Çizgi bitti. Yeni başlangıç noktası ya da sağ tık: çık.'); A.yenile(); return; } if (S.arac !== 'sec') { ev.preventDefault(); aracSec('sec'); } });
    // ---- klavye ----
    const tus = ev => { if (!document.body.contains(cv)) return; const ae = document.activeElement, yaziAlani = ae && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT' || ae.tagName === 'TEXTAREA') && !panel.contains(ae);
      if (ev.key === 'Escape' && S.arac === 'cizgi' && S.p1) { ev.stopImmediatePropagation(); ev.preventDefault(); S.p1 = null; S.yaz = ''; durum('Çizgi bitti. Yeni başlangıç noktası ya da Esc.'); A.yenile(); return; }
      if (ev.key === 'Escape') { if (S.arac !== 'sec' || S.p1) { ev.stopImmediatePropagation(); ev.preventDefault(); aracSec('sec'); } return; }
      if (yaziAlani) return;
      if (S.p1 && /^[0-9.,]$/.test(ev.key)) { S.yaz += ev.key; ev.preventDefault(); ev.stopImmediatePropagation(); A.yenile(); return; }
      if (S.p1 && ev.key === 'Backspace') { S.yaz = S.yaz.slice(0, -1); ev.preventDefault(); ev.stopImmediatePropagation(); A.yenile(); return; }
      if (S.p1 && ev.key === 'Enter' && S.yaz && S.arac === 'cizgi') { ev.preventDefault(); ev.stopImmediatePropagation(); const pr = S.yaz.split(',').map(Number); const L = pr[0] / 100; if (!(L > 0)) return; let ang; if (pr.length > 1 && isFinite(pr[1])) ang = pr[1] * Math.PI / 180; else { const f = S.fare || { u: S.p1.u + 1, v: S.p1.v }, o2 = ortoUygula(S.p1, f.u, f.v); ang = Math.atan2(o2.v - S.p1.v, o2.u - S.p1.u); }
        const q2 = { u: S.p1.u + L * Math.cos(ang), v: S.p1.v + L * Math.sin(ang) }; S.yrd.push([S.p1.u, S.p1.v, q2.u, q2.v]); kaydet(); S.p1 = q2; S.yaz = ''; A.yenile(); return; }
      if (S.p1 && ev.key === 'Enter' && S.yaz && S.arac === 'ofs' && S.ofs) { ev.preventDefault(); ev.stopImmediatePropagation(); const d = +S.yaz.split(',')[0] / 100; if (d > 0) { S.ofs.d = d; durum(`Mesafe ${cm(d)} cm — tarafı tıklayın.`); } S.yaz = ''; A.yenile(); return; }
      if (S.p1 && ev.key === 'Enter' && S.yaz) { ev.preventDefault(); ev.stopImmediatePropagation(); const pr = S.yaz.split(',').map(x => +x / 100).filter(x => isFinite(x) && x > 0);
        if (S.arac === 'dik' && pr.length) { const w = pr[0], h = pr[1] || pr[0], f = S.fare || { u: S.p1.u + 1, v: S.p1.v + 1 }, su = f.u >= S.p1.u ? 1 : -1, sv = f.v >= S.p1.v ? 1 : -1; dikTamam(S.p1, { u: S.p1.u + su * w, v: S.p1.v + sv * h }); }
        else if (S.arac === 'daire' && pr.length) daireTamam(S.p1, pr[0]); return; }
      if (ev.key === 'Delete' && S.arac === 'sec' && S.ySec >= 0) { ev.preventDefault(); S.yrd.splice(S.ySec, 1); S.ySec = -1; kaydet(); A.yenile(); return; }
      if (ev.key === 'Delete' && S.arac === 'sec' && A.sil) { const L = secili(); if (L) { ev.preventDefault(); A.sil(L.o); A.yenile(); } return; }
      if (!S.p1 && !ev.ctrlKey && !ev.altKey) { const k = ev.key.toLowerCase(); const m = { r: 'dik', d: 'daire', c: 'kopya', l: 'cizgi', o: 'ofs', t: 'buda', e: 'uzat' }[k]; if (m && document.activeElement === document.body) { ev.preventDefault(); aracSec(m); } } };
    window.addEventListener('keydown', tus, true);
    // ---- çizim katmanı (pencerenin ciz()'inin sonunda çağrılır) ----
    const isaret = (x, sn, T) => { if (!sn || !sn.tip) return; const p = [T.X(sn.u), T.Z(sn.v)], r = 6; x.save(); x.strokeStyle = '#e67e22'; x.lineWidth = 2; x.beginPath();
      if (sn.tip === 'uc') x.rect(p[0] - r, p[1] - r, 2 * r, 2 * r); else if (sn.tip === 'orta') { x.moveTo(p[0], p[1] - r); x.lineTo(p[0] + r, p[1] + r); x.lineTo(p[0] - r, p[1] + r); x.closePath(); } else if (sn.tip === 'merkez') x.arc(p[0], p[1], r, 0, 7); else if (sn.tip === 'yakin') { x.moveTo(p[0] - r, p[1] - r); x.lineTo(p[0] + r, p[1] + r); x.moveTo(p[0] + r, p[1] - r); x.lineTo(p[0] - r, p[1] + r); } else if (sn.tip === 'kilavuz') { x.setLineDash([4, 3]); if (sn.yon === 'v') { x.moveTo(0, p[1]); x.lineTo(A.cv.clientWidth, p[1]); } else { x.moveTo(p[0], 0); x.lineTo(p[0], A.cv.clientHeight); } } else { x.moveTo(p[0] - 3, p[1]); x.lineTo(p[0] + 3, p[1]); x.moveTo(p[0], p[1] - 3); x.lineTo(p[0], p[1] + 3); }
      x.stroke(); x.restore(); if (sn.ad && sn.tip !== 'izgara') { x.save(); x.fillStyle = '#e67e22'; x.font = '11px Arial'; x.textAlign = 'left'; x.fillText(sn.ad, p[0] + 9, p[1] - 9); x.restore(); } };
    const ciz = (x) => { const T = A.T(); if (!T) return; const sb = A.sinir(), sn = S.snap;
      x.save(); x.lineWidth = 1.2; S.yrd.forEach((k, i) => { x.strokeStyle = i === S.ySec || (S.ofs && S.ofs.i === i) ? '#e67e22' : '#8e44ad'; x.setLineDash(i === S.ySec ? [] : [7, 4]); x.beginPath(); x.moveTo(T.X(k[0]), T.Z(k[1])); x.lineTo(T.X(k[2]), T.Z(k[3])); x.stroke(); }); x.restore();
      if (S.arac === 'cizgi' && S.p1 && S.fare) { const b = sn && sn.tip && sn.tip !== 'izgara' ? sn : ortoUygula(S.p1, (sn || S.fare).u, (sn || S.fare).v); x.save(); x.strokeStyle = '#8e44ad'; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(T.X(S.p1.u), T.Z(S.p1.v)); x.lineTo(T.X(b.u), T.Z(b.v)); x.stroke(); x.restore();
        const L = Math.hypot(b.u - S.p1.u, b.v - S.p1.v), a = Math.atan2(b.v - S.p1.v, b.u - S.p1.u) * 180 / Math.PI; x.save(); x.font = 'bold 12px Arial'; x.fillStyle = '#8e44ad'; x.fillText(S.yaz ? `yazılan: ${S.yaz} ↵` : `${cm(L)} cm · ${Math.round(a)}°`, T.X(b.u) + 12, T.Z(b.v) + 22); x.restore(); }
      const etiket = (t, p) => { x.save(); x.font = 'bold 12px Arial'; const w = x.measureText(t).width; x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(p[0] + 12, p[1] + 8, w + 8, 18); x.fillStyle = '#0b6e8a'; x.fillText(t, p[0] + 16, p[1] + 21); x.restore(); };
      if ((S.arac === 'dik' || S.arac === 'daire') && S.p1 && S.fare) { const a = S.p1, b = sn && sn.tip ? sn : { u: S.fare.u, v: S.fare.v }; x.save(); x.strokeStyle = '#0b6e8a'; x.setLineDash([6, 4]); x.lineWidth = 1.5; x.beginPath();
        let t; if (S.arac === 'dik') { x.rect(Math.min(T.X(a.u), T.X(b.u)), Math.min(T.Z(a.v), T.Z(b.v)), Math.abs(b.u - a.u) * T.sc, Math.abs(b.v - a.v) * T.sc); t = `${cm(Math.abs(b.u - a.u))} × ${cm(Math.abs(b.v - a.v))}`; } else { const r = Math.hypot(b.u - a.u, b.v - a.v); x.arc(T.X(a.u), T.Z(a.v), r * T.sc, 0, 7); t = `Ø${cm(2 * r)}`; }
        x.stroke(); x.restore(); etiket(S.yaz ? `yazılan: ${S.yaz} cm ↵` : t, [T.X(b.u), T.Z(b.v)]); }
      if (S.fare && !S.surukle && sb) { const f = sn && sn.tip ? sn : S.fare; etiket(`sol ${cm(f.u - sb[0])} · sağ ${cm(sb[2] - f.u)} · alt ${cm(f.v - sb[1])} · üst ${cm(sb[3] - f.v)}`, [8 - 12, A.cv.clientHeight - 34]); }
      if (S.arac === 'kopya' && S.kopya && S.fare) { const p = kopyaYer(S.fare.u, S.fare.v), g = S.kopya.g; x.save(); x.strokeStyle = '#0b6e8a'; x.setLineDash([5, 4]); x.beginPath(); if (g.sekil === 'D') x.arc(T.X(p.cx), T.Z(p.cy), g.w / 2 * T.sc, 0, 7); else x.rect(T.X(p.cx - g.w / 2), T.Z(p.cy + g.h / 2), g.w * T.sc, g.h * T.sc); x.stroke(); x.restore(); }
      isaret(x, S.surukle ? S.snap : sn, T); };
    const kapat = () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); window.removeEventListener('keydown', tus, true); };
    aracSec('sec');
    return { ciz, kapat, S, aracSec, yardimYenile: () => { S.yrd = (A.yardimAl ? A.yardimAl() : []) || []; S.ySec = -1; S.ofs = null; } };
  };
  C._yuzArac = { bagla };
})(window.C);

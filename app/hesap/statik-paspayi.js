/* ArıtmaCAD Statik — PASPAYI TAKOZLARI · TEMEL SEHPASI · PERDE ÇİROZU (ayrı modül)
   3B donatıya eklenir, aralıklar paftadaki sehpa / çiroz pozlarına (adet, metraj) da yansır.
   Varsayılanlar (boş bırakılan alan = standart / otomatik):
     Paspayı           : S.mal.cR / cP / cD — TS 500 Çizelge 9.3, TS EN 1992-1-1 Md. 4.4.1 (suyla temas eden yüzde ≥ 5 cm)
     Takoz, yatay eleman alt yüzü : ≤ 50Ø ve 0,50 … 1,00 m, her iki doğrultu, en alttaki çubuğun altında (TS EN 13670 Md. 6.3; DBV Abstandhalter föyü)
     Takoz, perde yüzleri         : ≤ 1,00 m, her iki yüz, en dış (düşey) çubuğa
     Sehpa (radye üst ağı)        : 1,00 × 1,00 m (≈ 1 adet / m²), Ø12
     Çiroz (perde)                : 0,50 × 0,50 m (4 adet / m², TBDY 2018 Md. 7.6), Ø12, bir ucu 135°, bir ucu 90° kanca, L = 10 + (d − 2c) + 10 (firma detayı)
     Sehpa ayakları                : biri öne, biri arkaya 25 cm bükülü (kendi başına durur) */
(function () {
  'use strict';
  const P = window.STATIK; if (!P || !P.donati3B) return;
  const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000, AG = F => 0.006165 * F * F;
  const adim = (a, b, s) => { if (b <= a) return [(a + b) / 2]; const n = Math.max(1, Math.round((b - a) / s)), r = []; for (let i = 0; i <= n; i++) r.push(a + (b - a) * i / n); return r; };
  const sayi = v => (v === '' || v == null || !isFinite(+v) || +v <= 0 ? null : +v);
  const PAS = S => { const p = (S.tas && S.tas.pas) || {}; return { takozYatay: sayi(p.takozYatay), takozPerde: sayi(p.takozPerde) || 1.0, takozCap: sayi(p.takozCap) || 0.04, sehpaAra: sayi(p.sehpaAra) || 1.0, sehpaF: sayi(p.sehpaF) || 12, cirozAra: sayi(p.cirozAra), cirozF: sayi(p.cirozF) || 12, goster: p.goster !== false }; };
  P.pasAyar = PAS;
  const aralikYatay = (S, F) => PAS(S).takozYatay || Math.min(1.0, Math.max(0.5, 50 * F / 1000));
  const cubukUstu = (a, b, s, hedef) => { const k = Math.max(1, Math.round(hedef / s)), n = Math.max(1, Math.round((b - a) / s)), r = []; for (let i = 0; i <= n; i += k) r.push(a + (b - a) * i / n); if (r.length && b - r[r.length - 1] > s * k * 0.6) r.push(b); return r; };
  const perdede = (GM, tE, x, y, pay) => (GM.walls || []).some(w => { const dx = x - w.p0[0], dy = y - w.p0[1], s = dx * w.e[0] + dy * w.e[1], o = dx * w.n[0] + dy * w.n[1]; return s > -tE / 2 - pay && s < w.L + tE / 2 + pay && Math.abs(o) < w.t / 2 + pay; });

  /* yerleşimler (pafta adedi ile 3B aynı noktalar) */
  const sehpaNoktalari = R => { const S = R.S, GM = R.GM, a = PAS(S).sehpaAra, out = [], ara = (u0, u1) => (u1 - u0 <= a ? [(u0 + u1) / 2] : adim(u0 + a / 2, u1 - a / 2, a));
    for (const c of GM.comps || []) for (const y of ara(c.y0 + 0.1, c.y1 - 0.1)) for (const x of ara(c.x0 + 0.1, c.x1 - 0.1)) out.push([x, y]); return out; }; // her bölmenin içinde (perde altları ve pabuç hariç)
  const cirozAra = (S) => PAS(S).cirozAra || 0.50; // 50 × 50 cm = 4 adet/m² (firma detayı)
  const cirozNoktalari = (R, pd) => { const S = R.S, g = S.geo, a = cirozAra(S), w = pd.w, zT = g.kAlt + g.hr, out = [];
    const ss = adim(g.tw / 2 + 0.15, w.L - g.tw / 2 - 0.15, a), zs = adim(zT + 0.15, zT + pd.Hp - 0.15, a);
    const H = P.perdeDelikleri ? P.perdeDelikleri(R, w) : [], bos = (s2, z) => H.some(h => Math.abs(s2 - h.s) < h.w / 2 + S.mal.cP + 0.03 && Math.abs(z - h.z) < h.h / 2 + S.mal.cP + 0.03);
    zs.forEach(z => ss.forEach(s => { if (!bos(s, z)) out.push([s, z]); })); return { a, out }; }; // boru / perde boşluklarında çiroz yok

  /* paftadaki sehpa / çiroz pozlarını ayarlara göre güncelle */
  const d0 = P.detayDsi;
  if (d0) P.detayDsi = function (R) {
    const DT = d0.apply(this, arguments), S = R.S, g = S.geo, c = S.mal, A = PAS(S), yeni = p => { p.boy = r2(p.boy); p.top = r2(p.boy * p.adet); p.kg = p.top * AG(p.F); };
    try {
      const sh = DT.temel.find(p => p.sehpa);
      if (sh) { const h = Math.max(0.1, g.hr - 2 * c.cR - 0.03); sh.F = A.sehpaF; sh.s = A.sehpaAra; sh.h = h; sh.adet = Math.max(1, sehpaNoktalari(R).length); sh.boy = 0.25 * 2 + h * 2 + 0.5; yeni(sh); }
      for (const pd of DT.perdeler) { const cr = pd.poz.find(p => p.ciroz); if (!cr) continue; const { a, out } = cirozNoktalari(R, pd), Lc = r2(pd.w.t - 2 * c.cP), kc = 0.10; Object.assign(cr, { F: A.cirozF, s: a, adet: out.length, Lc, kanca: kc, boy: kc + Lc + kc, segs: [{ L: kc, a: 45 }, { L: Lc, a: 0 }, { L: kc, a: -90 }] }); yeni(cr); }
    } catch (e) { console.error('sehpa/çiroz ayarı', e); }
    return DT;
  };

  P.paspayiSehpa3B = (R) => {
    const S = R.S, g = S.geo, GM = R.GM, c = S.mal, A = PAS(S), out = [], zA = g.kAlt, zT = g.kAlt + g.hr, zU = g.kUst, tE = g.tw, RT = A.takozCap / 2;
    const DT = P.detayDsi(R), T = DT.temel, aX = T.find(p => p.yon === 'x' && p.yuz === 'alt'), aY = T.find(p => p.yon === 'y' && p.yuz === 'alt'), uX = T.find(p => p.yon === 'x' && p.yuz === 'üst'), uY = T.find(p => p.yon === 'y' && p.yuz === 'üst');
    const Fm = q => (q ? q.F / 1000 : 0.014), cm = v => Math.round(v * 1000) / 10;
    const takoz = (eleman, c0, tanim) => { const o = { poz: '', F: 0, s: 0, eleman, tanim: `Paspayı takozu c=${cm(c0)} cm · ${tanim}`, tip: 'takoz', r: RT, bars: [] }; out.push(o); return o; };

    /* radye: alt ve yan yüz takozları */
    { const cR = c.cR, Rb = GM.R, X0 = Rb.x0 + cR, X1 = Rb.x1 - cR, Y0 = Rb.y0 + cR, Y1 = Rb.y1 - cR, hd = aralikYatay(S, Fm(aX)), o = takoz('Temel', cR, `radye altı ${cm(hd)} × ${cm(hd)} cm`);
      for (const y of cubukUstu(Y0, Y1, aX ? aX.s : 0.2, hd)) for (const x of adim(X0 + 0.1, X1 - 0.1, hd)) o.bars.push([[x, y, zA], [x, y, zA + cR]]);
      const oy = takoz('Temel', cR, 'radye yan yüzü'), zm = zA + g.hr / 2;
      for (const x of adim(X0 + 0.2, X1 - 0.2, A.takozPerde)) { oy.bars.push([[x, Rb.y0, zm], [x, Rb.y0 + cR, zm]], [[x, Rb.y1, zm], [x, Rb.y1 - cR, zm]]); }
      for (const y of adim(Y0 + 0.2, Y1 - 0.2, A.takozPerde)) { oy.bars.push([[Rb.x0, y, zm], [Rb.x0 + cR, y, zm]], [[Rb.x1, y, zm], [Rb.x1 - cR, y, zm]]); }
      /* sehpa: alt ağın üstüne basar, üst ağın alt çubuklarını taşır */
      const sh = T.find(p => p.sehpa), F = A.sehpaF / 1000, zb = zA + cR + Fm(aX) + Fm(aY) + F / 2, zt = zT - cR - Fm(uX) - Fm(uY) - F / 2;
      if (zt - zb > 0.08) { const so = { poz: sh ? sh.no : '', F: A.sehpaF, s: A.sehpaAra, eleman: 'Temel', tanim: '', bars: [] }, rb = P.bukmeR(A.sehpaF); out.push(so);
        for (const [x, y] of sehpaNoktalari(R)) so.bars.push(P.bukumlu([[x - 0.25, y - 0.25, zb], [x - 0.25, y, zb], [x - 0.25, y, zt], [x + 0.25, y, zt], [x + 0.25, y, zb], [x + 0.25, y + 0.25, zb]], rb, 3)); // ayaklardan biri öne, biri arkaya: kendi başına durur
        so.tanim = `Sehpa Ø${A.sehpaF} · ${cm(A.sehpaAra)} × ${cm(A.sehpaAra)} cm · h=${cm(zt - zb + F)} cm · ${so.bars.length} adet`; }
    }

    /* perdeler: iki yüzde takoz + çiroz */
    for (const pd of DT.perdeler) {
      const w = pd.w, t = w.t, cP = c.cP, Pt = (s, o, z) => [w.p0[0] + w.e[0] * s + w.n[0] * o, w.p0[1] + w.e[1] * s + w.n[1] * o, z], ad = pd.no + ' perde';
      const o = takoz(ad, cP, `perde yüzleri ${cm(A.takozPerde)} × ${cm(A.takozPerde)} cm`), ss = adim(tE / 2 + 0.25, w.L - tE / 2 - 0.25, A.takozPerde), zs = adim(zT + 0.3, zT + pd.Hp - 0.3, A.takozPerde);
      const Hd = P.perdeDelikleri ? P.perdeDelikleri(R, w) : [], bosP = (s2, z) => Hd.some(h => Math.abs(s2 - h.s) < h.w / 2 + cP + 0.03 && Math.abs(z - h.z) < h.h / 2 + cP + 0.03);
      for (const sg of [1, -1]) for (const s of ss) for (const z of zs) if (!bosP(s, z)) o.bars.push([Pt(s, sg * t / 2, z), Pt(s, sg * (t / 2 - cP), z)]);
      const cr = pd.poz.find(p => p.ciroz); if (!cr) continue;
      const { a, out: nk } = cirozNoktalari(R, pd), F = A.cirozF / 1000, oc = t / 2 - cP - F / 2, k = 0.08, co = { poz: cr.no, F: A.cirozF, s: a, eleman: ad, tanim: `Çiroz Ø${A.cirozF} · ${cm(a)} × ${cm(a)} cm (${Math.round(10 / (a * a)) / 10} adet/m²) · bir ucu 135°, bir ucu 90° kanca · ${nk.length} adet`, bars: [] }; out.push(co);
      const kc = 0.10; for (const [s, z] of nk) co.bars.push(P.bukumlu([Pt(s, oc - kc * 0.707, z - kc * 0.707), Pt(s, oc, z), Pt(s, -oc, z), Pt(s, -oc, z - kc)], P.bukmeR(A.cirozF), 3)); // 135° kanca dış yüzde, 90° kanca iç yüzde
    }

    /* döşemeler: alt yüz takozları */
    for (const dd of DT.doseme) {
      const d = dd.d, cD = c.cD, z0 = zU - d.t, alt = dd.poz.find(p => p.yuz === 'alt' && p.yon === 'x'), hd = aralikYatay(S, alt ? alt.F / 1000 : 0.012), o = takoz('Döşeme ' + (d.ad || ''), cD, `döşeme altı ${cm(hd)} × ${cm(hd)} cm`);
      for (const y of cubukUstu(d.y0 + cD, d.y1 - cD, alt ? alt.s : 0.2, hd)) for (const x of adim(d.x0 + cD + 0.1, d.x1 - cD - 0.1, hd)) { if (perdede(GM, tE, x, y, 0.02) || (d.delik || []).some(b => { const xs = b.pts.map(q => q[0]), ys = b.pts.map(q => q[1]); return x > Math.min(...xs) - cD && x < Math.max(...xs) + cD && y > Math.min(...ys) - cD && y < Math.max(...ys) + cD; })) continue; o.bars.push([[x, y, z0], [x, y, z0 + cD]]); }
    }
    for (const o of out) o.bars = o.bars.map(b => b.map(q => q.map(r3)));
    return out.filter(o => o.bars.length);
  };

  // 3B listesi: DSİ biçiminde zaten sehpa/çiroz yoktu; takoz + sehpa + çiroz eklenir
  const b0 = P.donati3B;
  P.donati3B = function (R) { const a = b0.apply(this, arguments) || []; if (!R || !R.S || !PAS(R.S).goster || !P.detayDsi) return a; let b = []; try { b = P.paspayiSehpa3B(R); } catch (e) { console.error('paspayı/sehpa/çiroz 3B', e); } return a.concat(b); };

  /* ---------- form: Paspayı · sehpa · çiroz ---------- */
  if (typeof document === 'undefined' || !document.getElementById || !document.getElementById('form')) return;
  const formEk = () => {
    const f = document.querySelector('#form'); if (!f || f.querySelector('#pasAyar')) return;
    S.tas.pas = S.tas.pas || {}; const p = S.tas.pas, v = x => (x == null ? '' : String(x));
    const alan = (k, t, ph) => `<label class="f">${t}<input data-pas="${k}" value="${v(p[k])}" placeholder="${ph}"></label>`, mal = (k, t) => `<label class="f">${t}<input data-mal="${k}" value="${v(S.mal[k])}"></label>`;
    f.insertAdjacentHTML('beforeend', `<details class="sec" id="pasAyar"><summary>Paspayı · takoz · sehpa · çiroz</summary><div class="body">
      <p class="hint full">Boş bırakılan alan standart değeri kullanır. Değerler 3B donatıya ve paftadaki sehpa / çiroz pozlarına (adet, metraj) yansır.</p>
      ${mal('cR', 'Paspayı radye (m)')}${mal('cP', 'Paspayı perde (m)')}${mal('cD', 'Paspayı döşeme (m)')}
      <p class="hint full">TS 500 Çizelge 9.3 · TS EN 1992-1-1 Md. 4.4.1 — su / toprakla temas eden yüzlerde en az 5 cm.</p>
      ${alan('takozYatay', 'Takoz aralığı radye / döşeme altı (m)', 'oto: 50Ø, 0,50–1,00')}${alan('takozPerde', 'Takoz aralığı perde yüzü (m)', '1,00')}${alan('takozCap', 'Takoz çapı (m)', '0,04')}
      ${alan('sehpaAra', 'Sehpa aralığı (m)', '1,00 (≈1 adet/m²)')}${alan('sehpaF', 'Sehpa çapı Ø (mm)', '12')}
      ${alan('cirozAra', 'Çiroz aralığı (m)', '0,50 (4 adet/m²)')}${alan('cirozF', 'Çiroz çapı Ø (mm)', '12')}
      <label class="f">3B'de göster<select data-pasg="goster"><option value="1"${p.goster !== false ? ' selected' : ''}>Takoz, sehpa, çiroz gösterilsin</option><option value="0"${p.goster === false ? ' selected' : ''}>Gösterilmesin</option></select></label>
    </div></details>`);
    const d = f.querySelector('#pasAyar');
    d.querySelectorAll('[data-pas]').forEach(el => el.onchange = () => { const s = el.value.trim().replace(',', '.'); if (s === '') delete p[el.dataset.pas]; else if (isFinite(+s) && +s > 0) p[el.dataset.pas] = +s; else { el.value = v(p[el.dataset.pas]); return; } changed(); });
    d.querySelectorAll('[data-mal]').forEach(el => el.onchange = () => { const s = +el.value.trim().replace(',', '.'); if (isFinite(s) && s > 0 && s < 0.2) { S.mal[el.dataset.mal] = s; changed(); buildForm(); } else el.value = v(S.mal[el.dataset.mal]); });
    d.querySelector('[data-pasg]').onchange = e => { p.goster = e.target.value === '1'; changed(); };
  };
  setTimeout(formEk, 0); { const bf = window.buildForm; window.buildForm = buildForm = function () { const x = bf.apply(this, arguments); setTimeout(formEk, 0); return x; }; }
})();

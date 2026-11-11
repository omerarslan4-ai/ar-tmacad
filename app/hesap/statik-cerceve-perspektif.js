/* ArıtmaCAD Statik — KOLON · KİRİŞ · DÖŞEME (çerçeve) DONATI PERSPEKTİFLERİ (ayrı modül)
   • Su yapısı A0 donatı perspektifine çerçeveyi ekler: kolon / kiriş / döşeme / guse beton hatları ve donatıları, lejant ve donatı özeti.
   • Çerçeve paftalarına ayrı "KOLON KİRİŞ DÖŞEME DONATI PERSPEKTİFLERİ" paftası: tüm çerçeve, her kotun kiriş + döşeme donatısı,
     her kolon tipinin (guse dahil) donatı perspektifi, renk lejantı ve çaplara göre özet.
   Bağımlılık: statik-cerceve.js (P.cerceveDonati3B), statik-pafta-3b.js (P._perspektif), statik-guse.js (kolon.guseD). */
(function () {
  'use strict';
  const P = window.STATIK; if (!P || !P.cerceveHesap) return;
  const r3 = v => Math.round(v * 1000) / 1000, AG = F => 0.006165 * F * F;

  /* son çerçeve hesabı (perspektif paftaları için) */
  const ch0 = P.cerceveHesap;
  P.cerceveHesap = function () { const RC = ch0.apply(this, arguments); P._sonRC = RC || null; return RC; };

  /* ---- beton dış hatları ---- */
  const kutuCiz = (x0, y0, z0, x1, y1, z1) => { const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]; return [c.map(q => [q[0], q[1], z0]), c.map(q => [q[0], q[1], z1]), ...[[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(q => [[q[0], q[1], z0], [q[0], q[1], z1]])]; };
  const prizma = (alt, z0, z1) => { const a = alt.concat([alt[0]]); return [a.map(q => [q[0], q[1], z0]), a.map(q => [q[0], q[1], z1]), ...alt.map(q => [[q[0], q[1], z0], [q[0], q[1], z1]])]; };
  const guseBeton = (c, g) => { // yan yüz yamuk prizma
    const e = g.yon, p = [-e[1], e[0]], Q = (s, o, z) => [c.x + e[0] * s + p[0] * o, c.y + e[1] * s + p[1] * o, z], f = g.f0, w = g.w / 2, out = [];
    const yan = o => [Q(f, o, g.zt), Q(f + g.gL, o, g.zt), Q(f + g.gL, o, g.zt - g.hu), Q(f, o, g.zt - g.hf), Q(f, o, g.zt)];
    out.push(yan(-w), yan(w)); [[f + g.gL, g.zt], [f + g.gL, g.zt - g.hu], [f, g.zt - g.hf]].forEach(([s, z]) => out.push([Q(s, -w, z), Q(s, w, z)])); return out;
  };
  const betonKolon = c => { const bt = kutuCiz(c.x - c.bx / 2, c.y - c.by / 2, c.z0, c.x + c.bx / 2, c.y + c.by / 2, c.zt); (c.guseD || c.guse || []).forEach(g => bt.push(...guseBeton(c, g))); return bt; };
  const betonKiris = ch => ch.segs.flatMap(q => { const u = ch.u, n = [-u[1], u[0]], Q = (s, o) => [ch.a[0] + u[0] * s + n[0] * o, ch.a[1] + u[1] * s + n[1] * o]; return prizma([Q(q.s0, -q.bw / 2), Q(q.s1, -q.bw / 2), Q(q.s1, q.bw / 2), Q(q.s0, q.bw / 2)], ch.z - q.hb, ch.z); });
  const betonDoseme = d => (d.pts && d.pts.length > 2 ? prizma(d.pts, d.zt - d.t, d.zt) : kutuCiz(d.x0, d.y0, d.zt - d.t, d.x1, d.y1, d.zt));

  /* ---- guse donatısı (3B) ---- */
  const guseDonati = (RC, c) => {
    const out = [], cC = +RC.ayar.cC || 0.03;
    for (const g of (c.guseD || [])) {
      if (!g.ana) continue; const e = g.yon, p = [-e[1], e[0]], Q = (s, o, z) => [r3(c.x + e[0] * s + p[0] * o), r3(c.y + e[1] * s + p[1] * o), r3(z)], f = g.f0, Fa = g.ana.F, fa = Fa / 1000;
      const lA = Math.max(P.bindirme ? P.bindirme(Fa) : 50 * fa, g.hf + 0.5), w = g.w / 2 - cC - fa / 2, sB = -f + cC + fa / 2, sU = f + g.gL - cC - fa / 2, zT = g.zt - cC - fa / 2;
      const o1 = { mutlak: true, F: Fa, eleman: c.no || 'Kolon', tanim: `Guse ana ${g.ana.n}Ø${Fa}`, bars: [], kat: 'guse ana donatısı' }; out.push(o1);
      for (let i = 0; i < g.ana.n; i++) { const o = g.ana.n > 1 ? -w + 2 * w * i / (g.ana.n - 1) : 0; o1.bars.push([Q(sB, o, zT - lA), Q(sB, o, zT), Q(sU, o, zT), Q(sU, o, g.zt - g.hu + cC), Q(f, o, g.zt - g.hf + cC), Q(f - Math.max(0.25, 12 * fa), o, g.zt - g.hf + cC)]); }
      if (g.yat) {
        const Fe = g.yat.F, o2 = { mutlak: true, F: Fe, eleman: c.no || 'Kolon', tanim: `Guse yatay etriye ${g.yat.n}Ø${Fe}`, bars: [], kat: 'guse yatay etriye' }; out.push(o2);
        const dz = Math.min(0.10, (2 / 3 * g.d) / Math.max(1, g.yat.n)), we = g.w / 2 - cC;
        for (let i = 0; i < g.yat.n; i++) { const z = cC + 0.02 + (i + 1) * dz, pr = z <= g.hu ? g.gL : g.gL * Math.max(0, (g.hf - z) / (g.hf - g.hu)), s0 = -f + cC, s1 = f + pr - cC, zz = g.zt - z; o2.bars.push([Q(s0, -we, zz), Q(s1, -we, zz), Q(s1, we, zz), Q(s0, we, zz), Q(s0, -we, zz)]); }
      }
    }
    return out;
  };
  const katAd = o => o.kat || (/^Alt [XY]$|mesnet\)/.test(o.tanim) ? 'döşeme' : /^Boyuna/.test(o.tanim) ? 'kolon boyuna' : /^Etriye/.test(o.tanim) && o.kolon ? 'kolon etriyesi' : /^Etriye/.test(o.tanim) ? 'kiriş etriyesi' : 'kiriş boyuna');
  /* tüm çerçeve: donatı grupları (kolon / kiriş / döşeme / guse ayrımıyla) ve beton hatları */
  P.cerceve3BTam = RC => {
    const don = (RC.donati || P.cerceveDonati3B(RC)).map(o => Object.assign({}, o, { kolon: RC.kolonlar.some(c => (c.no || 'Kolon') === o.eleman) }));
    const og = don.map(o => ({ bars: o.bars, F: o.F, kay: false, el: o.eleman, tn: o.tanim, kat: katAd(o) }));
    RC.kolonlar.forEach(c => guseDonati(RC, c).forEach(o => og.push({ bars: o.bars, F: o.F, kay: false, el: o.eleman, tn: o.tanim, kat: o.kat })));
    const bet = [...RC.kolonlar.flatMap(betonKolon), ...RC.zincirler.flatMap(betonKiris), ...RC.dosemeler.filter(d => !d.atla).flatMap(betonDoseme)];
    return { og, bet };
  };
  const uzunluk = og => { const m = {}; og.forEach(o => o.bars.forEach(b => { let L = 0; for (let i = 1; i < b.length; i++) L += Math.hypot(b[i][0] - b[i - 1][0], b[i][1] - b[i - 1][1], b[i][2] - b[i - 1][2]); m[o.F] = (m[o.F] || 0) + L; })); return m; };

  /* ---- su yapısı A0 perspektifine çerçeveyi ekle (statik-pafta-3b.js kancaları) ---- */
  P.perspektifEk = (R, og, bet) => { const RC = P._sonRC; if (!RC || !RC.kolonlar || !RC.kolonlar.length) return; const T = P.cerceve3BTam(RC);
    /* genel perspektif: çerçeve model koordinatında, su yapısı yerel (köşe orijinli) koordinatta — çerçeve yerine otursun */
    const ko = (R && R.S && R.S.koken) || [0, 0], kay = q => [r3(q[0] - ko[0]), r3(q[1] - ko[1]), q[2]], kb = b => b.map(kay);
    og.push(...T.og.map(o => Object.assign({}, o, { bars: o.bars.map(kb) }))); bet.push(...T.bet.map(kb)); };
  P.perspektifOzetEk = oz => { const RC = P._sonRC; if (!RC || !RC.kolonlar || !RC.kolonlar.length) return; const m = uzunluk(P.cerceve3BTam(RC).og); Object.keys(m).forEach(F => { oz[F] = (oz[F] || 0) + m[F]; }); };

  /* ---- çerçeve perspektifleri paftası ---- */
  P.cercevePerspektifPafta = (RC, olcek) => {
    const Y = P._dsi, PS = P._perspektif; if (!Y || !PS || !RC || !RC.kolonlar || !RC.kolonlar.length) return [];
    const o = olcek || 50, K = o / 1000, mm = v => v * K, T = P.cerceve3BTam(RC), bloklar = [], yaw = -35, pitch = 30;
    const ekle = D => { if (D && D.out && D.out.length) bloklar.push(D.out); };
    // 1) tüm çerçeve
    ekle(PS(Y.yeniCizim, K, 'KOLON · KİRİŞ · DÖŞEME DONATI PERSPEKTİFİ', T.og, T.bet, yaw, pitch, 430, 290));
    // 2) her kot: kiriş + döşeme
    const kotlar = [...new Set(RC.zincirler.map(ch => r3(ch.z)).concat(RC.dosemeler.filter(d => !d.atla).map(d => r3(d.zt))))].sort((a, b) => a - b), kz = z => `${z >= 0 ? '+' : ''}${z.toFixed(2)}`;
    for (const z of kotlar) {
      const chs = RC.zincirler.filter(ch => Math.abs(ch.z - z) < 0.05), ds = RC.dosemeler.filter(d => !d.atla && Math.abs(d.zt - z) < 0.05), adlar = new Set([...chs.map(ch => ch.ad), ...ds.map(d => d.no || 'Döşeme')]);
      const og = T.og.filter(q => adlar.has(q.el) && !/kolon|guse/.test(q.kat)); if (!og.length) continue;
      ekle(PS(Y.yeniCizim, K, `${kz(z)} KOTU KİRİŞ VE DÖŞEME DONATI PERSPEKTİFİ`, og, [...chs.flatMap(betonKiris), ...ds.flatMap(betonDoseme)], yaw, pitch, 300, 190));
    }
    // 3) kolon tipleri (aynı kesit, kot, guse) — tipin ilk kolonu
    const tip = new Map(), As = c => c.don.n * c.don.F ** 2; RC.kolonlar.filter(c => c.don).forEach(c => { const k = [Math.round(c.bx * 100), Math.round(c.by * 100), r3(c.z0), r3(c.zt), (c.guseD || []).length].join('|'); if (!tip.has(k)) tip.set(k, []); tip.get(k).push(c); });
    for (const cs of tip.values()) {
      const c = cs.reduce((a, b) => (As(b) > As(a) ? b : a)), ad = c.no || 'Kolon', og = T.og.filter(q => q.el === ad && /kolon|guse/.test(q.kat)); if (!og.length) continue;
      ekle(PS(Y.yeniCizim, K, `${cs.map(q => q.no || '?').join('-')} KOLONLARI`, og, betonKolon(c), yaw, pitch, Math.max(130, 9 * cs.map(q => q.no || '?').join('-').length), 230));
    }
    // 4) lejant + özet
    { const D = Y.yeniCizim(K), { L, TX, PL } = D; let y = 0; const x0 = 0;
      TX([x0, y], 'LEJANT', 4.0, 'L', 'STA_BASLIK'); y -= mm(9);
      const caplar = [...new Set(T.og.map(q => q.F))].sort((a, b) => a - b);
      caplar.forEach(F => { const ly = 'STA_3B_O' + F, ks = [...new Set(T.og.filter(q => q.F === F).map(q => q.kat))]; for (let k = 0; k < 3; k++) PL([[x0, y + mm(1 + k * 0.25)], [x0 + mm(14), y + mm(1 + k * 0.25)]], false, P.KATMANLAR_DSI && P.KATMANLAR_DSI[ly] ? ly : 'STA_DONATI'); TX([x0 + mm(18), y], `Ø${F} — ${ks.join(', ')}`, 2.6, 'L'); y -= mm(7); });
      PL([[x0, y + mm(1)], [x0 + mm(14), y + mm(1)]], false, 'STA_3B_BETON'); TX([x0 + mm(18), y], 'Beton dış hatları (kolon, guse, kiriş, döşeme)', 2.6, 'L'); y -= mm(12);
      TX([x0, y], 'DONATI ÖZETİ (perspektiften)', 4.0, 'L', 'STA_BASLIK'); y -= mm(8);
      const m = uzunluk(T.og), cx = [x0, x0 + mm(24), x0 + mm(64), x0 + mm(100), x0 + mm(136)], rh = mm(7); let yt = y; const y0 = y;
      const hat = () => L([cx[0], yt], [cx[4], yt], 'STA_TABLO'), hc = (v, i) => TX([(cx[i] + cx[i + 1]) / 2, yt - mm(4.8)], v, 2.6, 'C', 'STA_TABLO');
      hat(); ['ÇAP', 'UZUNLUK (m)', 'BİRİM (kg/m)', 'AĞIRLIK (kg)'].forEach(hc); yt -= rh; hat(); let tk = 0;
      Object.keys(m).map(Number).sort((a, b) => a - b).forEach(F => { const kg = m[F] * AG(F); tk += kg; [`Ø${F}`, m[F].toFixed(2), AG(F).toFixed(3), kg.toFixed(1)].forEach(hc); yt -= rh; hat(); });
      hc('TOPLAM', 0); hc(tk.toFixed(1) + ' kg', 3); yt -= rh; hat(); cx.forEach(x => L([x, y0], [x, yt], 'STA_TABLO'));
      TX([x0, yt - mm(6)], 'Perspektifler ölçeksizdir (aksonometrik). Uzunluklar 3B modelden; kesin metraj ilgili detay paftalarındadır.', 2.2, 'L');
      ekle(D); }
    return P.blokSayfala ? P.blokSayfala(bloklar, K, 'KOLON KİRİŞ DÖŞEME DONATI PERSPEKTİFLERİ', o) : [];
  };
  /* çerçeve paftalarına ekle: kolon paftasının ardından */
  const kp0 = P.kolonPafta;
  P.kolonPafta = function (RC, o) { const paf = kp0 ? kp0.apply(this, arguments) : []; try { paf.push(...P.cercevePerspektifPafta(RC, o)); } catch (e) { console.error('çerçeve perspektif paftası', e); } return paf; };
})();

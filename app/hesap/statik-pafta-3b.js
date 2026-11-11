/* ArıtmaCAD Statik — paftalara DONATI PERSPEKTİFLERİ (ayrı modül)
   Temel ve döşeme paftası : radye donatısı + sehpalar + yalnız perde filizleri (perde gövdeleri yok)
                             döşeme donatısı + perdelerden döşemeye kıvrılan uçlar
   Her perde paftası       : yalnız o perdenin donatısı (filiz, gövde / orta / üst parçalar, yatay, çiroz)
                             + perdenin oturduğu radye şeridinin donatısı; diğer perdeler gösterilmez
   Bindirme bölgelerinin okunması için filiz (ve üst parça) çubukları kağıtta ~1 mm yana kaydırılır ve ayrı renkte çizilir. */
(function () {
  'use strict';
  const P = window.STATIK; if (!P) return;
  const RENK = { 8: 82, 10: 3, 12: 1, 14: 30, 16: 2, 18: 4, 20: 5, 22: 6, 24: 6, 25: 6, 26: 34, 28: 34, 32: 8 };
  const lyF = F => 'STA_3B_O' + F;
  const KAT = { STA_3B_BETON: { c: 8, lt: 'CONTINUOUS', lw: 13 }, STA_3B_FILIZ: { c: 6, lt: 'CONTINUOUS', lw: 25 } };
  Object.keys(RENK).forEach(F => { KAT[lyF(F)] = { c: RENK[F], lt: 'CONTINUOUS', lw: 25 }; });
  if (P.KATMANLAR_DSI) Object.assign(P.KATMANLAR_DSI, KAT);

  /* ---- 3B kırpma: çoklu çizgiyi eksenlere paralel kutuya göre (Liang–Barsky) ---- */
  const kirp = (pts, bx) => {
    const out = []; let cur = null;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; let t0 = 0, t1 = 1, ok = true;
      for (let k = 0; k < 3 && ok; k++) { const lo = bx[k][0], hi = bx[k][1]; for (const [p, q] of [[-d[k], a[k] - lo], [d[k], hi - a[k]]]) { if (Math.abs(p) < 1e-12) { if (q < 0) { ok = false; break; } } else { const r = q / p; if (p < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; } } } }
      if (!ok) { cur = null; continue; }
      const A = [a[0] + d[0] * t0, a[1] + d[1] * t0, a[2] + d[2] * t0], B = [a[0] + d[0] * t1, a[1] + d[1] * t1, a[2] + d[2] * t1];
      if (cur && t0 < 1e-9) cur.push(B); else { cur = [A, B]; out.push(cur); }
      if (t1 < 1 - 1e-9) cur = null;
    }
    return out;
  };
  const kutuIci = (bars, bx) => bars.flatMap(b => kirp(b, bx));

  /* ---- aksonometrik perspektif çizimi ----
     ogeler: [{ bars: [[x,y,z]...], F, kay: bool }] ; beton: [[x,y,z]...] çizgileri ; yaw/pitch derece */
  const perspektif = (yeniCizim, K, baslik, ogeler, beton, yaw, pitch, Wmm, Hmm, notlar, op) => {
    op = op || {};
    const D = yeniCizim(K), { mm, PL, TX } = D, cy = Math.cos(yaw * Math.PI / 180), sy = Math.sin(yaw * Math.PI / 180), cp = Math.cos(pitch * Math.PI / 180), sp = Math.sin(pitch * Math.PI / 180);
    const pr = q => { const x = q[0] * cy - q[1] * sy, y = q[0] * sy + q[1] * cy; return [x, q[2] * cp + y * sp]; };
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    const ac = q => { const p = pr(q); u0 = Math.min(u0, p[0]); u1 = Math.max(u1, p[0]); v0 = Math.min(v0, p[1]); v1 = Math.max(v1, p[1]); };
    ogeler.forEach(o => o.bars.forEach(b => b.forEach(ac))); beton.forEach(b => b.forEach(ac));
    if (!isFinite(u0)) return null;
    const sc = op.sc || Math.min(mm(Wmm) / Math.max(u1 - u0, 1e-6), mm(Hmm) / Math.max(v1 - v0, 1e-6)), ox = -u0 * sc, oy = mm(16) - v0 * sc, kay = mm(1.0);
    const P2 = (q, dx) => { const p = pr(q); return [ox + p[0] * sc + (dx || 0), oy + p[1] * sc]; };
    beton.forEach(b => PL(b.map(q => P2(q)), false, 'STA_3B_BETON'));
    ogeler.forEach(o => { const ly = o.kay ? 'STA_3B_FILIZ' : (KAT[lyF(o.F)] ? lyF(o.F) : 'STA_DONATI'); o.bars.forEach(b => { if (b.length > 1) PL(b.map(q => P2(q, o.kay ? kay : 0)), false, ly); }); });
    const W = (u1 - u0) * sc, Htop = oy + v1 * sc;
    if (op.yalin) return D;
    D.BASLIK([W / 2, Htop + mm(9)], baslik, 'Ölçeksiz — perspektif');
    // açıklama: çaplar ve filiz rengi
    const caplar = [...new Set(ogeler.filter(o => !o.kay).map(o => o.F))].sort((a, b) => a - b); let lx = 0;
    caplar.forEach(F => { PL([[lx, mm(6)], [lx + mm(7), mm(6)]], false, KAT[lyF(F)] ? lyF(F) : 'STA_DONATI'); TX([lx + mm(8.5), mm(5.2)], 'Ø' + F, 2.0, 'L'); lx += mm(19); });
    if (ogeler.some(o => o.kay)) { PL([[lx, mm(6)], [lx + mm(7), mm(6)]], false, 'STA_3B_FILIZ'); TX([lx + mm(8.5), mm(5.2)], notlar || 'filiz (bindirme bölgesi yana kaydırılarak gösterilmiştir)', 2.0, 'L'); }
    return D;
  };

  const tanimFiliz = t => /filiz/i.test(t || ''), tanimUst = t => /üst \(döşemeye/i.test(t || '');
  const kutu = (o, b) => ({ bars: o.bars ? o.bars : o, F: b.F, kay: !!b.kay });

  P.paftaEk = ({ R, K, B, DT, yeniCizim }) => {
    if ((R.S.tas || {}).paftaPerspektif === false) return;
    const S = R.S, g = S.geo, GM = R.GM, zA = g.kAlt, zT = g.kAlt + g.hr, zU = g.kUst, Rb = GM.R, BIG = 1e6;
    let gr = []; try { gr = P.donati3B(R).filter(o => !o.tip); } catch (e) { console.error(e); return; }
    const kutuCiz = (x0, y0, z0, x1, y1, z1) => { const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]; return [c.map(q => [q[0], q[1], z0]), c.map(q => [q[0], q[1], z1]), ...[[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(q => [[q[0], q[1], z0], [q[0], q[1], z1]])]; };
    const perdeKutu = (w, z0, z1, ek) => { const tE = g.tw, a = -tE / 2 - (ek || 0), b = w.L + tE / 2 + (ek || 0), h = w.t / 2 + (ek || 0), p = (s, o) => [w.p0[0] + w.e[0] * s + w.n[0] * o, w.p0[1] + w.e[1] * s + w.n[1] * o], q = [p(a, -h), p(b, -h), p(b, h), p(a, h)]; const xs = q.map(v => v[0]), ys = q.map(v => v[1]); return [Math.min(...xs), Math.min(...ys), z0, Math.max(...xs), Math.max(...ys), z1]; };

    /* ---- TEMEL: radye + sehpa + filizler ---- */
    const PB = Math.max(2, +(S.tas.perspBoy || 4.0)); // kısmi perspektif penceresi (m)
    { const og = [], X1 = Math.min(Rb.x1, Rb.x0 + PB), Y1 = Math.min(Rb.y1, Rb.y0 + PB), tam = X1 >= Rb.x1 && Y1 >= Rb.y1, bw = [[Rb.x0 - 0.01, X1], [Rb.y0 - 0.01, Y1], [-BIG, BIG]], kes = bars => (tam ? bars : kutuIci(bars, bw));
      gr.filter(o => o.eleman === 'Temel').forEach(o => og.push({ bars: kes(o.bars), F: o.F }));
      gr.filter(o => / perde$/.test(o.eleman) && /^Düşey/.test(o.tanim || '')).forEach(o => {
        if (tanimFiliz(o.tanim)) og.push({ bars: kes(o.bars), F: o.F, kay: true });
        else if (/tek parça/.test(o.tanim || '')) og.push({ bars: kutuIci(o.bars, [bw[0], bw[1], [zA - 1, zT + P.bindirme(o.F)]]), F: o.F, kay: true });
      });
      const bet = kutuCiz(Rb.x0, Rb.y0, zA, X1, Y1, zT);
      GM.walls.forEach(w => { const k = perdeKutu(w, zT, zT), x0 = Math.max(k[0], Rb.x0), x1 = Math.min(k[3], X1), y0 = Math.max(k[1], Rb.y0), y1 = Math.min(k[4], Y1); if (x1 <= x0 || y1 <= y0) return; const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]; bet.push(c.map(q => [q[0], q[1], zT])); });
      const D = perspektif(yeniCizim, K, 'TEMEL DONATISI PERSPEKTİFİ' + (tam ? '' : ' (KÖŞE BÖLGESİ)'), og, bet, -35, 32, 200, 150, 'perde filizleri');
      if (D) B.push({ pafta: 1, spec: D.out, kutu: D.kutu() }); }

    /* ---- DÖŞEME: döşeme donatısı + perdeden kıvrılan uçlar ---- */
    // döşeme: her döşeme ayrı, köşesinden PB × PB pencere
    (g.doseme || []).forEach(d => { const og = [], zb = zU - d.t - 0.8, X0 = d.x0 - g.tw, Y0 = d.y0 - g.tw, X1 = Math.min(d.x1 + g.tw, d.x0 + PB), Y1 = Math.min(d.y1 + g.tw, d.y0 + PB), tam = X1 >= d.x1 && Y1 >= d.y1, bw = [[X0, X1], [Y0, Y1], [zb, zU + 1]];
      gr.filter(o => o.eleman === 'Döşeme ' + (d.ad || '')).forEach(o => { const b = kutuIci(o.bars, bw); if (b.length) og.push({ bars: b, F: o.F }); });
      gr.filter(o => / perde$/.test(o.eleman) && /döşemeye kıvrık/.test(o.tanim || '')).forEach(o => { const b = kutuIci(o.bars, bw); if (b.length) og.push({ bars: b, F: o.F, kay: true }); });
      if (!og.length) return;
      const bet = kutuCiz(Math.max(d.x0, X0), Math.max(d.y0, Y0), zU - d.t, Math.min(d.x1, X1), Math.min(d.y1, Y1), zU);
      const D = perspektif(yeniCizim, K, `${d.ad || ''} DÖŞEMESİ DONATI PERSPEKTİFİ${tam ? '' : ' (KÖŞE BÖLGESİ)'}`, og, bet, -35, 32, 180, 120, 'perdeden döşemeye kıvrılan düşey çubuklar');
      if (D) B.push({ pafta: 1, spec: D.out, kutu: D.kutu() }); });

    /* ---- HER PERDE: kendi donatısı + oturduğu radye şeridi ---- */
    DT.perdeler.forEach((pd, i) => {
      const w0 = pd.w, ad = pd.no + ' perde', og = [], tam = w0.L + g.tw <= PB, w = tam ? w0 : Object.assign({}, w0, { L: PB - g.tw / 2 }); // perde ucundan PB boyunda kısım
      const pw = perdeKutu(w, -BIG, BIG, 0.62), pwx = [[pw[0], pw[3]], [pw[1], pw[4]], [-BIG, BIG]], kes = bars => (tam ? bars : kutuIci(bars, pwx));
      gr.filter(o => o.eleman === ad).forEach(o => og.push({ bars: kes(o.bars), F: o.F, kay: tanimFiliz(o.tanim) || tanimUst(o.tanim) }));
      if (!og.length) return;
      const kb = perdeKutu(w, zA - 0.01, zT + 0.01, 0.6), bx = [[kb[0], kb[3]], [kb[1], kb[4]], [kb[2], kb[5]]];
      gr.filter(o => o.eleman === 'Temel' && !/Sehpa/.test(o.tanim || '')).forEach(o => { const b = kutuIci(o.bars, bx); if (b.length) og.push({ bars: b, F: o.F }); });
      const pk = perdeKutu(w, zT, zU), bet = [...kutuCiz(kb[0], kb[1], zA, kb[3], kb[4], zT), ...kutuCiz(pk[0], pk[1], zT, pk[3], pk[4], zU)];
      // bakış: perdenin dış yüzü tarafından, boyuna doğru 35° çevrik
      const nAci = Math.atan2(w.n[1], w.n[0]) * 180 / Math.PI, yaw = -(nAci + 90) + 35;
      const D = perspektif(yeniCizim, K, `${pd.no} PERDESİ DONATI PERSPEKTİFİ${tam ? '' : ' (UÇ BÖLGESİ)'}`, og, bet, yaw, 28, 200, 170, 'filiz ve üst parça (bindirme bölgesi yana kaydırılarak gösterilmiştir)');
      if (D) B.push({ pafta: 2 + i, spec: D.out, kutu: D.kutu() });
    });
  };

  /* ================= A0 DONATI PERSPEKTİF PAFTASI (lejantlı) ================= */
  P._perspektif = perspektif;
  P.perspektifA0 = (R, rp, pr, sira) => {
    const Y = P._dsi; if (!Y) return null;
    const S = R.S, g = S.geo, GM = R.GM, zA = g.kAlt, zT = g.kAlt + g.hr, zU = g.kUst, Rb = GM.R;
    const gr = P.donati3B(R).filter(o => !o.tip), DT = P.detayDsi(R);
    const og = gr.map(o => ({ bars: o.bars, F: o.F, kay: / perde$/.test(o.eleman) && (tanimFiliz(o.tanim) || tanimUst(o.tanim)), el: o.eleman, tn: o.tanim || '' }));
    const kutuCiz = (x0, y0, z0, x1, y1, z1) => { const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]; return [c.map(q => [q[0], q[1], z0]), c.map(q => [q[0], q[1], z1]), ...[[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(q => [[q[0], q[1], z0], [q[0], q[1], z1]])]; };
    const bet = kutuCiz(Rb.x0, Rb.y0, zA, Rb.x1, Rb.y1, zT);
    GM.walls.forEach(w => { const tE = g.tw, p = (s2, o) => [w.p0[0] + w.e[0] * s2 + w.n[0] * o, w.p0[1] + w.e[1] * s2 + w.n[1] * o], q = [p(-tE / 2, -w.t / 2), p(w.L + tE / 2, w.t / 2)]; bet.push(...kutuCiz(Math.min(q[0][0], q[1][0]), Math.min(q[0][1], q[1][1]), zT, Math.max(q[0][0], q[1][0]), Math.max(q[0][1], q[1][1]), zU)); });
    (g.doseme || []).forEach(d => bet.push(...kutuCiz(d.x0, d.y0, zU - d.t, d.x1, d.y1, zU)));
    if (P.perspektifEk) { try { P.perspektifEk(R, og, bet); } catch (e) { console.error('perspektif çerçeve', e); } } // kolon · kiriş · döşeme (statik-cerceve-perspektif.js)
    // ölçek: A0 çizim alanına sığan en büyük ölçek (1/25 tercih)
    const A1 = ((R.S.tas || {}).perspektifKagit || 'A1') !== 'A0', PW = A1 ? 841 : 1189, PH = A1 ? 594 : 841, MJ = { l: 20, r: 10, t: 10, b: 10 }, SUT = 185, Wav = PW - MJ.l - MJ.r - SUT - 24, Hav = PH - MJ.t - MJ.b - 70;
    const yaw = -35, pitch = 30, cy = Math.cos(yaw * Math.PI / 180), sy = Math.sin(yaw * Math.PI / 180), cp = Math.cos(pitch * Math.PI / 180), sp = Math.sin(pitch * Math.PI / 180);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    [...og.flatMap(o => o.bars), ...bet].forEach(b => b.forEach(q => { const x = q[0] * cy - q[1] * sy, y = q[0] * sy + q[1] * cy, v = q[2] * cp + y * sp; u0 = Math.min(u0, x); u1 = Math.max(u1, x); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }));
    const olcek = [25, 30, 40, 50, 75, 100, 150, 200].find(o => (u1 - u0) * 1000 / o <= Wav && (v1 - v0) * 1000 / o <= Hav) || 200, K = olcek / 1000, mm = v => v * K;
    const Dp = perspektif(Y.yeniCizim, K, '', og, bet, yaw, pitch, 0, 0, '', { sc: 1, yalin: true });
    const D = Y.yeniCizim(K), { REC, L, TX, PL } = D;
    const fx0 = mm(MJ.l), fy0 = mm(MJ.b), fx1 = mm(PW - MJ.r), fy1 = mm(PH - MJ.t), sx = fx1 - mm(SUT);
    REC(0, 0, mm(PW), mm(PH), 'STA_TABLO'); REC(fx0, fy0, fx1, fy1, 'STA_CERCEVE'); L([sx, fy0], [sx, fy1], 'STA_CERCEVE');
    // perspektifi çizim alanının ortasına yerleştir
    const kb = Dp.kutu(), ax0 = fx0 + mm(8), ax1 = sx - mm(8), ay0 = fy0 + mm(14), ay1 = fy1 - mm(40), dx = (ax0 + ax1) / 2 - (kb[0] + kb[2]) / 2, dy = (ay0 + ay1) / 2 - (kb[1] + kb[3]) / 2;
    let spec = Y.kaydir(Dp.out, dx, dy);
    { const bt = `${(pr.ad || 'YAPI').toLocaleUpperCase('tr')} — DONATI PERSPEKTİFİ`, cxm = (fx0 + sx) / 2, w2 = mm(bt.length * 7 * 0.62) / 2; TX([cxm, fy1 - mm(18)], bt, 7, 'C', 'STA_BASLIK'); L([cxm - w2, fy1 - mm(20.5)], [cxm + w2, fy1 - mm(20.5)], 'STA_BASLIK'); TX([cxm, fy1 - mm(28)], `Ö:1/${olcek} (aksonometrik — ölçü alınmaz)`, 4, 'C'); }
    TX([(fx0 + sx) / 2, fy0 + mm(6)], 'Filizler ve üst parçalar bindirme bölgelerinin okunması için yana kaydırılarak, ayrı renkte gösterilmiştir. Takozlar gösterilmemiştir.', 2.5, 'C');
    // ---- LEJANT ----
    let y = fy1 - mm(12); const x0 = sx + mm(6), xw = mm(SUT - 12);
    TX([x0, y], 'LEJANT', 4.0, 'L', 'STA_BASLIK'); L([x0, y - mm(1.8)], [x0 + mm(22), y - mm(1.8)], 'STA_BASLIK'); y -= mm(10);
    const kat = o => o.kat || (/^Temel/.test(o.el) ? (/Sehpa/.test(o.tn) ? 'sehpa' : 'radye temel') : /^Döşeme/.test(o.el) ? 'döşeme' : /Çiroz/.test(o.tn) ? 'perde çirozu' : /^Yatay/.test(o.tn) ? 'perde yatay' : 'perde düşey');
    const caplar = [...new Set(og.filter(o => !o.kay).map(o => o.F))].sort((a, b) => a - b);
    const satir = (ly, yazi, kalin) => { for (let k = 0; k < (kalin ? 3 : 1); k++) L([x0, y + mm(1 + k * 0.25)], [x0 + mm(14), y + mm(1 + k * 0.25)], ly); const sat = []; let cur = ''; yazi.split(' ').forEach(w => { if ((cur + ' ' + w).trim().length > 48) { sat.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); if (cur) sat.push(cur); sat.forEach((t, k) => TX([x0 + mm(18), y - k * mm(4.2)], t, 2.6, 'L')); y -= mm(4.2 * sat.length + 3.5); };
    caplar.forEach(F => { const els = [...new Set(og.filter(o => !o.kay && o.F === F).map(kat))]; satir(KAT[lyF(F)] ? lyF(F) : 'STA_DONATI', `Ø${F} — ${els.join(', ')}`, true); });
    if (og.some(o => o.kay)) satir('STA_3B_FILIZ', `Perde filizleri ve üst parçalar (Ø${[...new Set(og.filter(o => o.kay).map(o => o.F))].sort((a, b) => a - b).join(', Ø')}) — bindirme bölgesi`, true);
    satir('STA_3B_BETON', og.some(o => o.kat) ? 'Beton dış hatları (radye, perdeler, döşemeler, kolonlar, kirişler)' : 'Beton dış hatları (radye, perdeler, döşeme)', false);
    // ---- DONATI ÖZETİ ----
    y -= mm(6); TX([x0, y], 'DONATI ÖZETİ', 4.0, 'L', 'STA_BASLIK'); L([x0, y - mm(1.8)], [x0 + mm(33), y - mm(1.8)], 'STA_BASLIK'); y -= mm(8);
    const tum = [...DT.temel, ...DT.doseme.flatMap(d => d.poz), ...DT.perdeler.flatMap(p => p.poz)], AG = F => 0.006165 * F * F, oz = {};
    tum.forEach(p => { if (!oz[p.F]) oz[p.F] = 0; oz[p.F] += p.top || p.boy * p.adet; }); if (P.perspektifOzetEk) { try { P.perspektifOzetEk(oz); } catch (e) { console.error(e); } }
    const cx = [x0, x0 + mm(28), x0 + mm(80), x0 + mm(130), x0 + xw], rh = mm(7); let yt = y;
    const hat = () => L([cx[0], yt], [cx[4], yt], 'STA_TABLO'), hucre = (v, i, al) => TX([al === 'L' ? cx[i] + mm(2) : (cx[i] + cx[i + 1]) / 2, yt - mm(4.8)], v, 2.6, al || 'C', 'STA_TABLO');
    hat(); ['ÇAP', 'UZUNLUK (m)', 'BİRİM (kg/m)', 'AĞIRLIK (kg)'].forEach((t, i) => hucre(t, i)); yt -= rh; hat();
    let tk = 0; Object.keys(oz).map(Number).sort((a, b) => a - b).forEach(F => { const kg = oz[F] * AG(F); tk += kg; [`Ø${F}`, oz[F].toFixed(2), AG(F).toFixed(3), kg.toFixed(1)].forEach((t, i) => hucre(t, i)); yt -= rh; hat(); });
    hucre('TOPLAM', 0); hucre(tk.toFixed(1) + ' kg', 3); yt -= rh; hat();
    cx.forEach((x, i) => L([x, y], [x, yt], 'STA_TABLO'));
    // ---- antet ----
    const ad = (pr.ad || 'YAPI').toLocaleUpperCase('tr'), info = { idare: rp.idare || 'DEVLET SU İŞLERİ GENEL MÜDÜRLÜĞÜ\nİÇMESUYU VE ATIKSU DAİRESİ BAŞKANLIĞI', sehir: rp.idareSehir || 'ANKARA', bolge: rp.bolge || '', bolgeSehir: rp.bolgeSehir || '', proje: rp.projeAd || (pr.tesis || '').toLocaleUpperCase('tr'), kod: rp.kod || '', yapi: ad, pafta: 'DONATI PERSPEKTİFİ', yapan: rp.yapan || pr.hazirlayan || '', yapanUnv: rp.yapanUnv || '', cizen: rp.cizen || '', cizenUnv: rp.cizenUnv || '', kontrol: rp.kontrolAd || pr.kontrol || '', kontrolUnv: rp.kontrolUnv || '', tarih: rp.paftaTarih || pr.tarih || '', arsiv: rp.arsiv || '', olcek: '1/' + olcek, yuklenici: rp.yuklenici || '', resimNo: (rp.resimNo || 'STA') + '-' + String(sira + 1).padStart(2, '0'), logo: rp.logo || 'DSİ' };
    Y.antet(D, sx + mm(2), fy0 + mm(2), mm(SUT - 4), mm(P.ANTET_YUK), info);
    return { ad: `DONATI PERSPEKTİFİ (${A1 ? 'A1' : 'A0'})`, spec: spec.concat(D.out), pw: PW, ph: PH, olcek, resimNo: info.resimNo };
  };
  const pd0 = P.paftalarDsi;
  if (pd0) P.paftalarDsi = function (R, olcek, rp, pr) { const paf = pd0.apply(this, arguments); try { if ((R.S.tas || {}).a0Perspektif !== false) { const a = P.perspektifA0(R, rp || {}, pr || {}, paf.length); if (a) paf.push(a); } } catch (e) { console.error('A0 perspektif paftası', e); } return paf; };
})();

/* ArıtmaCAD — STATİK: DSİ çizim stilinde statik paftalar (firma paftaları örnek alınmıştır)
   Pafta 1  KALIP PLANLARI VE KESİTLERİ   — temel ve üst kalıp planları, A-A / B-B kesitleri (aks balonları, 3 sıra ölçü, taralı perdeler, kotlar)
   Pafta 2  TEMEL (+ DÖŞEME) DONATI DETAYI — donatı planı (①17Ø14/20 L=960 alt), donatılı kesit, sehpa donatısı, "… KOTU TEMEL DONATI METRAJI"
   Pafta 3+ PERDE DONATI DETAYLARI         — her perde: görünüş, donatı açılımları, 1-1 kesiti, perde çirozu, "… PERDESİ DONATI METRAJI"
   Her paftada sağ sütun: GENEL NOTLAR, PASPAYI, YAPI MALZEME BİLGİSİ, ZEMİN PARAMETRELERİ + DSİ anteti (revizyon, idare, incelendi/tasdik, proje,
   yapı kodu-adı-pafta adı, S STATİK, yapan/çizen/kontrol, ölçek, yüklenici, resim no). Pafta: yükseklik 594 mm (A1 kısa kenar), genişlik içeriğe göre.
   Çıktı biçimi P.cizim ile aynı ilkel listesi; ArıtmaCAD tarafında STATIKCIZ (statik-pafta-dsi.js) her paftayı Statik grubunda ayrı pafta yapar. */
'use strict';
(function () {
  const P = window.STATIK;
  const r2 = v => Math.round(v * 100) / 100, cmi = v => String(Math.round(v * 100)), kotS = v => (v >= 0 ? '+' : '') + (+v).toFixed(2);
  const perdeNo = (w, i) => w.no || ((/^(\S+) (— |\(ara perde\))/.exec(w.ad || '') || [])[1]) || `P${i + 1}`;
  const AG = F => P.agirlik ? P.agirlik(F) : F * F * 0.00617;
  const yuk5 = v => Math.ceil(v * 20 - 1e-6) / 20; // 5 cm'ye yukarı
  const gonye = (t, c1, c2) => Math.max(0.05, Math.round((t - c1 - (c2 == null ? c1 : c2)) * 100) / 100); // gönye boyu = kalınlık − iki yüzün paspayı

  /* ---- iki yüz eşit donatı (firma uygulaması): her elemanda her doğrultu için iç = dış (perde), alt = üst (radye, döşeme)
     Seçilen tek Ø/s her iki yüzün taşıma gücü, asgari donatı ve (su ile temas eden yüzde) çatlak koşulunu birlikte sağlar. S.tas.esitCap === false ise kapalı. ---- */
  {
    const CAPLAR = [12, 14, 16, 18, 20, 22, 25, 28, 32], ARALIK = [0.25, 0.20, 0.175, 0.15, 0.125, 0.10];
    P.esitle = (R) => {
      const S = R.S, T = S.tas, MAL = R.MAL, pref = T.sTercih == null ? 0.15 : +T.sTercih, ag = T.agEsit !== false && T.agEsit !== 'false';
      const rank = sp => (pref > 0 && Math.abs(sp - pref) > 1e-9 ? 1 : 0); // tercih edilen aralık (ör. 15 cm) yeterliyse önce o
      for (const t of R.tasarim) {
        const hepsi = ag && /perde/i.test(t.eleman || ''); // perdede yatay = düşey (tek ağ: iç ve dış katman aynı çap / aralık)
        const gr = new Map(); t.katman.forEach(k => { const key = hepsi ? '*' : k.yon; if (!gr.has(key)) gr.set(key, []); gr.get(key).push(k); });
        const kuy = [...gr.values()]; if (hepsi) kuy.forEach(q => { q._h = true; });
        while (kuy.length) { const ks = kuy.shift();
          if (ks.length < 2) continue; let best = null;
          for (const F of CAPLAR) { if (F < T.phiMin) continue; const Fm = F / 1000;
            for (const sp of ARALIK) { if (sp > T.sMax + 1e-9) continue; const As = Math.PI * Fm * Fm / 4 / sp; let ok = true; const res = [];
              for (const k of ks) { const d = t.h - t.c - (k.kat === 2 ? Fm : 0) - Fm / 2, req = P.asGerekli(Math.abs(k.M), d, MAL).As, Amin = T.rhoMin * d;
                if (!(As >= req - 1e-12) || As < Amin - 1e-12 || As / d > 0.02) { ok = false; break; }
                const ck = k.suYuz ? P.catlak(Math.abs(k.Ms), As, d, t.h, sp, MAL) : { w: 0 }, wk = T.azalt && req > 0 && As / req > 1.2 ? ck.w / (As / req) : ck.w;
                if (k.suYuz && wk > T.wmax + 1e-9) { ok = false; break; }
                res.push({ F, s: sp, As, d, req, Amin, w: wk, ss: ck.ss || 0, ck, ok: true, rho: As / d, esit: true }); }
              if (ok && (!best || rank(sp) < best.r || (rank(sp) === best.r && (As < best.As - 1e-12 || (Math.abs(As - best.As) < 1e-12 && sp > best.s))))) best = { As, s: sp, res, r: rank(sp) };
            } }
          if (!best && ks._h) { const m2 = new Map(); ks.forEach(k => { if (!m2.has(k.yon)) m2.set(k.yon, []); m2.get(k.yon).push(k); }); kuy.push(...m2.values()); continue; } // tek ağ olmuyorsa doğrultu başına
          if (best) ks.forEach((k, i) => { k.sec = best.res[i]; });
          else ks.forEach(k => { const d = (k.sec && k.sec.d) || t.h - t.c; k.sec = { ok: false, msg: 'İki yüz eşit donatı ile uygun çözüm bulunamadı — kesit kalınlığını artırın', d, req: P.asGerekli(Math.abs(k.M), d, MAL).As }; });
        }
      }
      R.ok = R.tasarim.every(t => t.katman.every(k => k.sec.ok) && t.kesme.ok) && R.zem.ok && R.kald.ok;
      try { if (P.metraj) R.metraj = P.metraj(R); } catch (e) { }
      return R;
    };
    const h0 = P.hesapla;
    P.hesapla = function (S) { const R = h0.apply(this, arguments); return S && S.tas && S.tas.esitCap === false ? R : P.esitle(R); };
  }

  /* ---- döşeme panelleri ve mesnetleri: kenar perde üzerindeyse mesnetli (ankastre), değilse serbest; altından geçen ara perdeler paneli böler ---- */
  P.dosemePanel = (S, d) => {
    const g = S.geo, tw = g.tw, ti = g.ti || tw, Lx = g.Lx, Ly = g.Ly, tol = 0.05;
    const dX = [{ a: tw / 2, t: tw }, { a: Lx - tw / 2, t: tw }, ...(g.bolX || []).map(a => ({ a, t: ti }))]; // y doğrultusundaki perdeler (x = a)
    const dY = [{ a: tw / 2, t: tw }, { a: Ly - tw / 2, t: tw }, ...(g.bolY || []).map(a => ({ a, t: ti }))];
    /* döşeme altındaki kirişler (modelden) de ara mesnettir: döşeme kirişlerle panellere bölünür (sürekli döşeme) */
    { const ko = S.koken || [0, 0], zU = g.kUst != null ? +g.kUst : null; for (const k of ((S.cer && S.cer.kirisler) || [])) { if (zU != null && !(k.zt <= zU + 0.15 && k.zt >= zU - (d.t || 0.2) - 0.15)) continue; const a = [k.a[0] - ko[0], k.a[1] - ko[1]], b = [k.b[0] - ko[0], k.b[1] - ko[1]], bw = k.bw || 0.3;
      if (Math.abs(a[0] - b[0]) < 0.05 && Math.min(d.y1, Math.max(a[1], b[1])) - Math.max(d.y0, Math.min(a[1], b[1])) > 0.5 * (d.y1 - d.y0) && !dX.some(w => Math.abs(w.a - a[0]) < 0.05)) dX.push({ a: a[0], t: bw, kiris: k.no || 'K' + k.id });
      if (Math.abs(a[1] - b[1]) < 0.05 && Math.min(d.x1, Math.max(a[0], b[0])) - Math.max(d.x0, Math.min(a[0], b[0])) > 0.5 * (d.x1 - d.x0) && !dY.some(w => Math.abs(w.a - a[1]) < 0.05)) dY.push({ a: a[1], t: bw, kiris: k.no || 'K' + k.id }); } }
    dX.sort((p, q) => p.a - q.a); dY.sort((p, q) => p.a - q.a);
    const dest = (L, v) => L.find(w => Math.abs(v - w.a) <= w.t / 2 + tol) || null;
    const kesX = dX.filter(w => w.a > d.x0 + w.t / 2 + tol && w.a < d.x1 - w.t / 2 - tol), kesY = dY.filter(w => w.a > d.y0 + w.t / 2 + tol && w.a < d.y1 - w.t / 2 - tol);
    const xs = [d.x0, ...kesX.map(w => w.a), d.x1], ys = [d.y0, ...kesY.map(w => w.a), d.y1], paneller = [];
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
      const kn = { L: i > 0 || !!dest(dX, d.x0), R: i < xs.length - 2 || !!dest(dX, d.x1), B: j > 0 || !!dest(dY, d.y0), T: j < ys.length - 2 || !!dest(dY, d.y1) };
      paneller.push({ x0: xs[i], x1: xs[i + 1], y0: ys[j], y1: ys[j + 1], kn });
    }
    const kenar = { L: dest(dX, d.x0), R: dest(dX, d.x1), B: dest(dY, d.y0), T: dest(dY, d.y1) };
    // net açıklıklar (perde yüzleri arası)
    const net = (cs, kL, kR, kes) => { let m = 0; for (let i = 0; i < cs.length - 1; i++) { const a = cs[i] + (i === 0 ? (kL ? kL.a + kL.t / 2 - cs[0] : 0) : kes[i - 1].t / 2), b = cs[i + 1] - (i === cs.length - 2 ? (kR ? cs[cs.length - 1] - (kR.a - kR.t / 2) : 0) : kes[i].t / 2); m = Math.max(m, b - a); } return m; };
    return { paneller, kenar, kesX, kesY, lnX: net(xs, kenar.L, kenar.R, kesX), lnY: net(ys, kenar.B, kenar.T, kesY) };
  };

  /* ======================= DONATI DETAYLANDIRMA ======================= */
  // şekil: segs = [{L, a}] (a: 0 yatay, 90 düşey) — tabloda açılım çizimi ve boy hesabı için
  P.detayDsi = (R) => {
    const S = R.S, g = S.geo, GM = R.GM, c = S.mal, lb = R.MAL.lb, out = { temel: [], doseme: [], perdeler: [] };
    const sec = (el, yon, yuz) => { const t = R.tasarim.find(x => x.eleman.startsWith(el)); if (!t) return null; const k = t.katman.find(q => q.yon === yon && q.yuz === yuz); return k && k.sec && k.sec.ok ? k.sec : null; };
    const poz = (liste, o) => { if (!o.F || !(o.adet > 0) || !(o.boy > 0)) return null; o.boy = r2(o.boy); o.adet = Math.ceil(o.adet - 1e-9); liste.push(o); return o; };
    const MAXB = 12; // ticari boy
    // uzun çubuğu parçala: [{boy, sol, sag}] (sol/sag: kanca var mı)
    const parca = (L, F, hA, hB) => { const pr = P.parcala(L, F, +hA || 0, +hB || 0), n = pr.length, ln = q => q[1] - q[0]; if (n === 1) return [{ L, sol: true, sag: true, n: 1 }]; return [{ L: ln(pr[0]), sol: true, sag: false, n: 1 }, ...(n > 2 ? [{ L: ln(pr[1]), sol: false, sag: false, n: n - 2 }] : []), { L: ln(pr[n - 1]), sol: false, sag: true, n: 1 }]; }; void MAXB;
    const segU = (L, a, b) => [...(a ? [{ L: a, a: 90 }] : []), { L, a: 0 }, ...(b ? [{ L: b, a: 90 }] : [])];
    // --- TEMEL (radye) ---
    const LX = GM.R.x1 - GM.R.x0, LY = GM.R.y1 - GM.R.y0, leg = gonye(g.hr, c.cR);
    const radye = [['X yönü', 'Alt', 'x'], ['X yönü', 'Üst', 'x'], ['Y yönü', 'Alt', 'y'], ['Y yönü', 'Üst', 'y']];
    for (const [yon, yuz, d] of radye) {
      const s = sec('Radye', yon, yuz); if (!s) continue; const Lb = (d === 'x' ? LX : LY) - 2 * c.cR, dag = (d === 'x' ? LY : LX) - 2 * c.cR, n = Math.floor(dag / s.s) + 1;
      for (const p of parca(Lb, s.F, leg, leg)) poz(out.temel, { F: s.F, s: s.s, adet: n * p.n, boy: p.L + (p.sol ? leg : 0) + (p.sag ? leg : 0), segs: segU(p.L, p.sol ? leg : 0, p.sag ? leg : 0).map(q => (q.a && yuz === 'Üst' ? { L: q.L, a: -90 } : q)), yon: d, yuz: yuz.toLowerCase(), ad: `${yuz} ${d.toUpperCase()}`, net: Lb, dag });
    }
    { const F = 12, h = Math.max(0.1, g.hr - 2 * c.cR - 0.03), n = Math.ceil(GM.A / 1.0); poz(out.temel, { F, s: 1, adet: n, boy: 0.25 * 2 + h * 2 + 0.5, segs: [{ L: 0.25, a: -35 }, { L: h, a: 90 }, { L: 0.5, a: 0 }, { L: h, a: -90 }, { L: 0.25, a: 35 }], ad: 'Sehpa', sehpa: true, h }); }
    // perde filizleri temel tablosunda değil, perde tablolarında (L şekilli düşey)
    // --- DÖŞEMELER (perdelere ankastre) ---
    (g.doseme || []).forEach(d => {
      const el = 'Üst döşeme ' + (d.ad || ''), lx = d.x1 - d.x0, ly = d.y1 - d.y0, cD = c.cD, liste = [], DP = P.dosemePanel(S, d), kn = DP.kenar, hk = gonye(d.t, cD), k = hk;
      let s;
      const altB = (yon, Lt, perp, kA, kB) => { const a = kA ? k : hk, b = kB ? k : hk, Ln = Lt - 2 * cD; for (const p of parca(Ln, s.F, a, b)) poz(liste, { F: s.F, s: s.s, adet: (Math.floor((perp - 2 * cD) / s.s) + 1) * p.n, boy: p.L + (p.sol ? a : 0) + (p.sag ? b : 0), segs: segU(p.L, p.sol ? a : 0, p.sag ? b : 0), ad: 'Alt ' + yon.toUpperCase(), yon, yuz: 'alt', net: Ln, ga: a, gb: b }); };
      if ((s = sec(el, 'X yönü', 'Alt (açıklık)'))) altB('x', lx, ly, kn.L, kn.R);
      if ((s = sec(el, 'Y yönü', 'Alt (açıklık)'))) altB('y', ly, lx, kn.B, kn.T);
      // üst donatı: boydan boya tek parça; perde üzerindeki uçlar perdeye aşağı gönyeli (ankraj ≥ lb·Ø), serbest kenarda alta kadar gönyeli
      const ustTek = (yon, Lt, perp, wA, wB) => { const ga = hk, gb = hk;
        for (const p of parca(Lt - 2 * cD, s.F, ga, gb)) poz(liste, { F: s.F, s: s.s, adet: (Math.floor((perp - 2 * cD) / s.s) + 1) * p.n, boy: p.L + (p.sol ? ga : 0) + (p.sag ? gb : 0), segs: [...(p.sol ? [{ L: ga, a: -90 }] : []), { L: p.L, a: 0 }, ...(p.sag ? [{ L: gb, a: -90 }] : [])], ad: 'Üst ' + yon.toUpperCase(), yon, yuz: 'üst', tek: true, ga, gb, net: Lt - 2 * cD }); };
      if ((s = sec(el, 'X yönü', 'Üst (mesnet)'))) ustTek('x', lx, ly, kn.L, kn.R);
      if ((s = sec(el, 'Y yönü', 'Üst (mesnet)'))) ustTek('y', ly, lx, kn.B, kn.T);
      out.doseme.push({ d, poz: liste, DP });
    });
    // --- PERDELER (her perde ayrı) ---
    const Hp = g.kUst - (g.kAlt + g.hr), zb = g.kAlt + c.cR + 0.03;
    const DPs = (g.doseme || []).map(d => ({ d, DP: P.dosemePanel(S, d) }));
    const perdeDoseme = w => { let Lc = 0, ln = 99; const ar = []; const xA = Math.abs(w.e[0]) > 0.5, a = xA ? w.p0[1] : w.p0[0], s0 = xA ? w.p0[0] : w.p0[1], s1 = s0 + w.L;
      for (const { d, DP } of DPs) { const kn = DP.kenar, dest = xA ? [kn.B, kn.T, ...DP.kesY] : [kn.L, kn.R, ...DP.kesX]; if (!dest.some(q => q && Math.abs(q.a - a) < 0.02)) continue; const u0 = xA ? d.x0 : d.y0, u1 = xA ? d.x1 : d.y1, ov = Math.min(u1, s1 + w.t) - Math.max(u0, s0 - w.t); if (ov > 0) { Lc += ov; ln = Math.min(ln, DP.lnX || 99, DP.lnY || 99); const cx = (d.x0 + d.x1) / 2, cy = (d.y0 + d.y1) / 2, yon = Math.sign((cx - w.p0[0]) * w.n[0] + (cy - w.p0[1]) * w.n[1]) || -1; ar.push([Math.max(u0, s0 - w.t) - s0, Math.min(u1, s1 + w.t) - s0, yon]); } }
      return { Lc, ln, ar }; };
    GM.walls.forEach((w, i) => {
      const dis = w.tip === 'dis', ad = dis ? 'Dış perde' : 'Ara perde', yz = dis ? ['Dış yüz', 'İç yüz'] : ['Yüz 1', 'Yüz 2'], liste = [];
      const tE = dis ? g.tw : g.tw; // uçta kesişen perde kalınlığı
      const Lo = w.L + tE, Lh = Lo - 2 * c.cP; // dış-dış perde boyu, yatay net
      const kanca = Math.max(0.2, yuk5(15 * 0.012));
      // yatay (U: uçlar kesişen perdeye kıvrık)
      const yat = yz.map(y => sec(ad, 'Yatay', y)), dus = yz.map(y => sec(ad, 'Düşey', y));
      const ayni = (a, b) => a && b && a.F === b.F && Math.abs(a.s - b.s) < 1e-6;
      const yuzAd = j => dis ? (j === 0 ? 'dış' : 'iç') : (j === 0 ? 'yüz 1' : 'yüz 2');
      // köşe: dış yüz yatay donatısı dik perdeye bindirme boyu (lb·Ø) kadar döner; iç yüz / ara perde dik perdeye ankrajı tamamlayacak kadar kıvrılır
      const kancaOf = () => gonye(tE, c.cP);
      const yatG = !dis && ayni(yat[0], yat[1]) ? [[yat[0], 2, 'iç-dış']] : yat.map((s, j) => [s, 1, yuzAd(j)]);
      for (const [s, k, yzA] of yatG) { if (!s) continue; const n = Math.floor((Hp - c.cP - 0.05) / s.s) + 1, kanca = kancaOf(s.F, yzA); for (const p of parca(Lh, s.F, kanca, kanca)) poz(liste, { F: s.F, s: s.s, adet: k * n * p.n, boy: p.L + (p.sol ? kanca : 0) + (p.sag ? kanca : 0), segs: segU(p.L, p.sol ? kanca : 0, p.sag ? kanca : 0), ad: 'Yatay', yuzA: yzA, kat: k, nYuz: n, yon: 'yatay', kanca }); }
      // düşey (L: alt filiz radyeye, üstte kıvrık)
      const dusG = ayni(dus[0], dus[1]) && !(dis && Hp <= 2) ? [[dus[0], 2, 'iç-dış']] : dus.map((s, j) => [s, 1, yuzAd(j)]);
      const zR = g.kAlt + g.hr, zT = g.kUst - c.cP, zj = Hp >= 6 ? zR + Math.round(Hp / 2 * 20) / 20 : null; // zj: inşaat derzi kotu
      for (const [s, k, yzA] of dusG) {
        if (!s) continue; const fl = gonye(g.hr, c.cR), ust = gonye(w.t, c.cP), n = Math.floor((w.L - tE - 0.1) / s.s) + 1, lap = P.bindirme(s.F);
        const parcalar = Hp <= 2 ? [{ ad: 'tek parça (filizsiz, gönyeli)', za: zb, zu: zT, alt: fl, ustK: ust }]
          : Hp < 6 ? [{ ad: 'temel filizi', za: zb, zu: zR + lap, alt: fl, ustK: 0 }, { ad: 'gövde', za: zR, zu: zT, alt: 0, ustK: ust }]
          : [{ ad: 'temel filizi', za: zb, zu: zR + lap, alt: fl, ustK: 0 }, { ad: 'orta (derz üstüne bindirmeli)', za: zR, zu: zj + lap, alt: 0, ustK: 0 }, { ad: 'üst (döşemeye kadar)', za: zj, zu: zT, alt: 0, ustK: ust }];
        // döşeme altındaki kısım: üst uç döşemeye kıvrılır (ankastre birleşim)
        const dsm = perdeDoseme(w), nS = dsm.Lc > 0 ? Math.min(n, Math.floor(dsm.Lc / s.s) + 1) : 0, kD = nS ? gonye(w.t, c.cP) : 0;
        const parc2 = parcalar.flatMap(pc => (pc.ustK && nS ? [Object.assign({}, pc, { n: nS, ustK: kD, zu: g.kUst - c.cD - 0.01, ad: pc.ad + ' — döşemeye kıvrık' }), ...(n - nS > 0 ? [Object.assign({}, pc, { n: n - nS })] : [])] : [Object.assign({}, pc, { n })]));
        for (const pc of parc2) { const n = pc.n, Lv = pc.zu - pc.za; poz(liste, { F: s.F, s: s.s, adet: k * n, boy: pc.alt + Lv + pc.ustK, segs: [...(pc.alt ? [{ L: pc.alt, a: 0 }] : []), { L: Lv, a: 90 }, ...(pc.ustK ? [{ L: pc.ustK, a: dis && yzA === 'iç' && pc.alt ? 180 : 0 }] : [])], ad: 'Düşey', parca: pc.ad, yuzA: yzA, kat: k, nYuz: n, yon: 'düşey', fl: pc.alt, Lv, za: pc.za - g.kAlt, zu: pc.zu - g.kAlt, ustK: pc.ustK, lap }); }
      }
      if (zj) liste.derz = zj - g.kAlt;
      // çiroz
      { const s0 = Math.min(...[...yat, ...dus].filter(Boolean).map(s => s.s), 0.2), a = Math.max(0.4, 2 * s0), n = Math.ceil((w.L * Hp) / (a * a)), Lc = w.t - 2 * c.cP + 0.1; poz(liste, { F: 8, s: a, adet: n, boy: Lc + 2 * 0.1, segs: [{ L: 0.1, a: -45 }, { L: Lc, a: 0 }, { L: 0.1, a: 45 }], ad: 'Çiroz', ciroz: true, Lc }); }
      out.perdeler.push({ w, i, no: perdeNo(w, i), poz: liste, Lo, Hp, derz: liste.derz || null, dsm: perdeDoseme(w) });
    });
    // poz numaraları her tabloda 1'den
    const birlestir = l => { for (let i = 0; i < l.length; i++) for (let j = l.length - 1; j > i; j--) { const a = l[i], b = l[j]; if (a.F === b.F && a.boy === b.boy && a.ad === b.ad && a.yuz === b.yuz && a.yuzA === b.yuzA && a.yon === b.yon && a.parca === b.parca) { a.adet += b.adet; if (a.nYuz) a.nYuz += b.nYuz; l.splice(j, 1); } } return l; };
    birlestir(out.temel); out.doseme.forEach(d => birlestir(d.poz)); out.perdeler.forEach(p => birlestir(p.poz));
    const say = l => l.forEach((p, k) => { p.no = k + 1; p.top = r2(p.boy * p.adet); p.kg = p.top * AG(p.F); });
    say(out.temel); out.doseme.forEach(d => say(d.poz)); out.perdeler.forEach(p => say(p.poz));
    return out;
  };

  /* ---- bükme merdane çapı (TS EN 1992-1-1 Tablo 8.1N): Ø ≤ 16 → 4Ø, Ø > 16 → 7Ø; eksen yarıçapı r = Dm/2 + Ø/2 ---- */
  P.bukmeCapi = F => (F <= 16 ? 4 : 7) * F; // mm
  /* bindirme (filiz) boyu — firma tablosu "DEMİRLERDE BİNDİRME BOYLARI": Ø12 70 … Ø26 140 cm (her 2 mm çapta +10 cm) */
  P.BINDIRME = { 8: 0.50, 10: 0.60, 12: 0.70, 14: 0.80, 16: 0.90, 18: 1.00, 20: 1.10, 22: 1.20, 24: 1.30, 25: 1.35, 26: 1.40, 28: 1.50, 30: 1.60, 32: 1.70 };
  P.bindirme = F => P.BINDIRME[F] || Math.round((0.70 + 0.05 * (F - 12)) * 20) / 20; // m
  /* ticari boy 12 m: önce tam 12 m'lik çubuk(lar), kalan bindirmeli son parça. hA/hB: uç kanca/gönye boyları (12 m'ye dahil). [[a,b]] düz kısım koordinatları */
  P.parcala = (L, F, hA = 0, hB = 0) => { const M = 12, ls = P.bindirme(F), r = []; let a = 0, ilk = true; for (let g = 0; g < 60; g++) { const av = M - (ilk ? hA : 0); if (L - a + hB <= av + 1e-6) { r.push([a, L]); break; } r.push([a, a + av]); a = a + av - ls; ilk = false; } return r; };
  P.bukmeR = F => (P.bukmeCapi(F) + F) / 2000; // m (çubuk ekseni)
  // köşeleri yaylı çoklu çizgi (2B / 3B): r (m), her köşe 4 parça
  P.bukumlu = (pts, r, n = 4) => {
    if (!r || pts.length < 3) return pts; const d = pts[0].length, sub = (a, b) => a.map((v, i) => v - b[i]), len = a => Math.hypot(...a), out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const A = pts[i - 1], B = pts[i], C2 = pts[i + 1], u1 = sub(B, A), u2 = sub(C2, B), l1 = len(u1), l2 = len(u2); if (l1 < 1e-9 || l2 < 1e-9) { out.push(B); continue; }
      const e1 = u1.map(v => v / l1), e2 = u2.map(v => v / l2), cs = Math.max(-1, Math.min(1, e1.reduce((t, v, k) => t + v * e2[k], 0))), th = Math.acos(cs); if (th < 0.02) { out.push(B); continue; }
      const td = Math.min(r * Math.tan(th / 2), l1 * 0.45, l2 * 0.45), P0 = B.map((v, k) => v - e1[k] * td), P2 = B.map((v, k) => v + e2[k] * td);
      for (let j = 0; j <= n; j++) { const t = j / n, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t; out.push(P0.map((v, k) => a * v + b * B[k] + c * P2[k])); }
    }
    out.push(pts[pts.length - 1]); void d; return out;
  };

  /* ======================= ÇİZİM ARAÇLARI ======================= */
  const yeniCizim = (K) => {
    const out = [], mm = v => v * K; // K: model m / kağıt mm
    const o = {
      out, mm,
      L: (a, b, ly, lt) => out.push({ k: 'L', a, b, ly: ly || 'STA_KALIP', ...(lt ? { lt } : {}) }),
      PL: (pts, cl, ly, F, sc) => out.push({ k: 'P', pts: F && !cl ? P.bukumlu(pts, P.bukmeR(F) * (sc || 1)) : pts, cl: !!cl, ly: ly || 'STA_KALIP' }),
      CI: (c, r, ly) => out.push({ k: 'C', c, r, ly: ly || 'STA_AKS' }),
      TX: (p, s, hmm, al, ly, rot) => out.push({ k: 'T', p, s: String(s), h: mm(hmm || 2.5), al: al || 'L', ly: ly || 'STA_YAZI', rot: rot || 0 }),
      DM: (a, b, dir, offmm, txt) => { const off = mm(offmm); const p = dir === 'h' ? [a[0], a[1] + off] : [a[0] + off, a[1]]; out.push({ k: 'D', a, b, p, dir, txt, ly: 'STA_OLCU' }); },
      KOT: (p, v, ters) => out.push({ k: 'K', p, v, txt: '', ters: !!ters, ly: 'STA_OLCU' }),
      REC: (x0, y0, x1, y1, ly) => o.PL([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true, ly),
    };
    // 45° tarama: dikdörtgen bölge listesi (içten çıkarılacaklar hariç)
    o.TARA = (rects, delik, aralik, ly) => {
      const ad = mm(aralik || 2.5), xs = rects.flatMap(r => [r[0], r[2]]), ys = rects.flatMap(r => [r[1], r[3]]); if (!xs.length) return;
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      for (let cc = x0 - (y1 - y0); cc < x1; cc += ad) { // y = x - cc
        let ivs = [];
        for (const r of rects) { const ta = Math.max(r[0], r[1] + cc), tb = Math.min(r[2], r[3] + cc); if (tb > ta + 1e-6) ivs.push([ta, tb]); }
        for (const h of (delik || [])) { const ha = Math.max(h[0], h[1] + cc), hb = Math.min(h[2], h[3] + cc); if (hb <= ha) continue; ivs = ivs.flatMap(([a, b]) => (hb <= a || ha >= b ? [[a, b]] : [...(ha > a ? [[a, ha]] : []), ...(hb < b ? [[hb, b]] : [])])); }
        for (const [a, b] of ivs) if (b - a > mm(0.3)) o.L([a, a - cc], [b, b - cc], ly || 'STA_TARAMA');
      }
    };
    o.BALON = (p, s, rmm) => { o.CI(p, mm(rmm || 5), 'STA_AKS'); o.TX([p[0], p[1] - mm((rmm || 5) * 0.35)], s, (rmm || 5) * 0.95, 'C', 'STA_AKS'); };
    o.POZ = (p, no) => { o.CI(p, mm(2.4), 'STA_POZ'); o.TX([p[0], p[1] - mm(1)], no, 2.2, 'C', 'STA_POZ'); };
    o.BASLIK = (p, s, olc) => { o.TX(p, s, 3.5, 'C', 'STA_BASLIK'); const w = mm(s.length * 3.5 * 0.62); o.L([p[0] - w / 2, p[1] - mm(1.2)], [p[0] + w / 2, p[1] - mm(1.2)], 'STA_BASLIK'); if (olc) o.TX([p[0], p[1] - mm(5.5)], olc, 2.5, 'C'); };
    o.KESOK = (p, harf, yon) => { // kesit oku (dolu üçgen + harf); yon: bakış [dx,dy]
      const r = mm(4.5), [dx, dy] = yon, nx = -dy, ny = dx;
      o.PL([[p[0] + nx * r, p[1] + ny * r], [p[0] - nx * r, p[1] - ny * r], [p[0] + dx * r * 1.3, p[1] + dy * r * 1.3]], true, 'STA_KALIP');
      o.CI([p[0] - dx * mm(1), p[1] - dy * mm(1)], mm(3.6), 'STA_KALIP'); o.TX([p[0] - dx * mm(1), p[1] - dy * mm(1) - mm(1.3)], harf, 3.2, 'C', 'STA_BASLIK');
    };
    o.kutu = () => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; const ac = q => { if (!q) return; x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }; for (const e of out) { [e.a, e.b, e.c, e.p, ...(e.pts || [])].forEach(ac); if (e.k === 'T') ac([e.p[0] + (e.al === 'C' ? 0.5 : e.al === 'R' ? -1 : 1) * e.s.length * e.h * 0.6, e.p[1] + e.h]); if (e.k === 'C') { ac([e.c[0] - e.r, e.c[1] - e.r]); ac([e.c[0] + e.r, e.c[1] + e.r]); } } return [x0, y0, x1, y1]; };
    return o;
  };
  const kaydir = (spec, dx, dy) => spec.map(e => { const f = q => q && [q[0] + dx, q[1] + dy]; const n = Object.assign({}, e); ['a', 'b', 'c', 'p'].forEach(k => { if (n[k]) n[k] = f(n[k]); }); if (n.pts) n.pts = n.pts.map(f); return n; });

  /* ---- metraj tablosu (POZ NO | ÇAP | ADET | AÇILIM | BOY | TOPLAM BOY Ø..) ---- */
  const tablo0 = (D, x0, yTop, baslik, liste, opt) => {
    opt = opt || {}; const tum = opt.tum || liste;
    const { mm, L, TX, PL } = D, caps = [...new Set(tum.map(p => p.F))].sort((a, b) => a - b);
    while (caps.length < 4) { const n = [8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32].find(F => !caps.includes(F) && F > (caps[caps.length - 1] || 0)); if (!n) break; caps.push(n); }
    const w = [10, 10, 10, 32, 13, ...caps.map(() => 13)].map(mm), X = [x0]; w.forEach(v => X.push(X[X.length - 1] + v)); const xE = X[X.length - 1];
    const rh = mm(7), hH = mm(14); let y = yTop;
    L([x0, y], [xE, y], 'STA_TABLO'); TX([(x0 + xE) / 2, y - mm(5)], baslik, 2.6, 'C', 'STA_TABLO'); y -= mm(7); L([x0, y], [xE, y], 'STA_TABLO');
    const yH = y; [['POZ', 'NO'], ['ÇAP', '(mm)'], ['ADET', ''], ['AÇILIM', ''], ['BOY', '(m)']].forEach(([a, b], i) => { TX([(X[i] + X[i + 1]) / 2, y - mm(5)], a, 2.2, 'C', 'STA_TABLO'); if (b) TX([(X[i] + X[i + 1]) / 2, y - mm(9.5)], b, 2.2, 'C', 'STA_TABLO'); });
    TX([(X[5] + xE) / 2, y - mm(5)], 'TOPLAM BOY (m.)', 2.2, 'C', 'STA_TABLO'); L([X[5], y - mm(7)], [xE, y - mm(7)], 'STA_TABLO'); caps.forEach((F, i) => TX([(X[5 + i] + X[6 + i]) / 2, y - mm(12)], 'Ø' + F, 2.2, 'C', 'STA_TABLO'));
    y -= hH; L([x0, y], [xE, y], 'STA_TABLO');
    for (const p of liste) {
      const yc = y - rh / 2; [p.no, p.F, p.adet].forEach((v, i) => TX([(X[i] + X[i + 1]) / 2, yc - mm(1.1)], v, 2.2, 'C', 'STA_TABLO')); TX([(X[4] + X[5]) / 2, yc - mm(1.1)], p.boy.toFixed(2), 2.2, 'C', 'STA_TABLO');
      const ci = caps.indexOf(p.F); TX([(X[5 + ci] + X[6 + ci]) / 2, yc - mm(1.1)], p.top.toFixed(2), 2.2, 'C', 'STA_TABLO');
      acilim(D, p, X[3] + mm(2), X[4] - mm(2), yc);
      y -= rh; L([x0, y], [xE, y], 'STA_TABLO');
    }
    const ozet = caps.map(F => { const Lt = tum.filter(p => p.F === F).reduce((s, p) => s + p.top, 0); return { F, Lt, kg: Lt * AG(F) }; }), top = ozet.reduce((s, o) => s + o.kg, 0);
    const satir = (ad, f) => { TX([x0 + mm(2), y - mm(5)], ad, 2.2, 'L', 'STA_TABLO'); ozet.forEach((o, i) => TX([(X[5 + i] + X[6 + i]) / 2, y - mm(5)], f(o), 2.0, 'C', 'STA_TABLO')); y -= rh; L([x0, y], [xE, y], 'STA_TABLO'); };
    const yS = y; if (opt.ozetYok) { TX([x0 + mm(2), y - mm(5)], 'devamı yandaki tabloda →', 2.2, 'L', 'STA_TABLO'); y -= rh; L([x0, y], [xE, y], 'STA_TABLO'); } else { satir('TOPLAM UZUNLUK (m)', o => (o.Lt ? o.Lt.toFixed(2) : '----')); satir('BİRİM AĞIRLIK (Kg/m)', o => AG(o.F).toFixed(3)); satir('TOPLAM AĞIRLIK (Kg)', o => (o.Lt ? o.kg.toFixed(2) : '----'));
    TX([x0 + mm(2), y - mm(5)], 'TOPLAM AĞIRLIK (Kg)', 2.2, 'L', 'STA_TABLO'); TX([(X[5] + xE) / 2, y - mm(5)], top.toFixed(2), 2.2, 'C', 'STA_TABLO'); y -= rh; L([x0, y], [xE, y], 'STA_TABLO'); }
    for (const x of X) { const alt = x === x0 || x === xE || x === X[5] ? y : yS; L([x, yTop - mm(7)], [x, alt], 'STA_TABLO'); }
    L([x0, yTop], [x0, yTop - mm(7)], 'STA_TABLO'); L([xE, yTop], [xE, yTop - mm(7)], 'STA_TABLO');
    for (let i = 6; i < X.length - 1; i++) L([X[i], yH - mm(7)], [X[i], yS], 'STA_TABLO');
    return { y, top, x1: xE };
  };
  /* uzun metraj tablosu: paftaya sığması için satırlar yan yana sütunlara bölünür (her sütunda başlık; toplamlar sonda, tüm pozlar üzerinden) */
  const TABLO_SATIR = 55;
  const tablo = (D, x0, yTop, baslik, liste) => { if (liste.length <= TABLO_SATIR) return tablo0(D, x0, yTop, baslik, liste);
    const k = Math.ceil(liste.length / TABLO_SATIR), n = Math.ceil(liste.length / k); let x = x0, yMin = yTop, r = null;
    for (let i = 0; i < k; i++) { r = tablo0(D, x, yTop, `${baslik} (${i + 1}/${k})`, liste.slice(i * n, (i + 1) * n), { tum: liste, ozetYok: i < k - 1 }); yMin = Math.min(yMin, r.y); x = r.x1 + D.mm(6); }
    return { y: yMin, top: r.top, x1: r.x1 }; };
  // tablo hücresinde açılım: ana parça yatay, uç kancalar; ölçü yazıları cm
  /* plandaki temsili çubuğa gönye boyları (uçlarda) ve gönye sonrası düz boy (çubuk üstünde) */
  const segYaz = (D, xd, a0, b0, v, kA, kB, Ls, f, sg, alt) => { const { mm, TX } = D, ly = 'STA_YAZI', s = sg || 1;
    if (xd) { TX([a0 + (b0 - a0) * f, v + (alt ? -mm(2.6) : mm(0.7))], cmi(Ls), 2.0, 'C', ly); if (kA) TX([a0 - mm(0.8), v + s * mm(0.6) - (s < 0 ? mm(1.6) : 0)], cmi(kA), 1.8, 'R', ly); if (kB) TX([b0 + mm(0.8), v + s * mm(0.6) - (s < 0 ? mm(1.6) : 0)], cmi(kB), 1.8, 'L', ly); }
    else { TX([v + (alt ? mm(2.6) : -mm(0.7)), a0 + (b0 - a0) * f], cmi(Ls), 2.0, 'C', ly, 90); if (kA) TX([v + s * mm(0.9), a0 - mm(2.6)], cmi(kA), 1.8, 'C', ly); if (kB) TX([v + s * mm(0.9), b0 + mm(0.9)], cmi(kB), 1.8, 'C', ly); } };
  /* 12 m'yi aşan çubuk grubu: 12 m'lik + kalan parça, bindirme ölçüsü, parça boyları ve poz etiketleri */
  const parcaliCiz = (D, grp, xd, u0, v, Ln, hA, hB, sg, kc, fx) => {
    const { mm, PL, TX, POZ } = D, p = grp[0], ls = P.bindirme(p.F), s = sg || 1, pr = P.parcala(Ln, p.F, hA, hB).map(q => [u0 + q[0], u0 + q[1]]), n = pr.length, Q = (u, w) => (xd ? [u, w] : [w, u]), W = k => v + (k % 2) * mm(1.4) * s;
    pr.forEach(([a0, b0], k) => { const w = W(k); PL([...(k === 0 && hA ? [Q(a0, w + s * kc)] : []), Q(a0, w), Q(b0, w), ...(k === n - 1 && hB ? [Q(b0, w + s * kc)] : [])], false, 'STA_DONATI');
      segYaz(D, xd, a0, b0, w, k === 0 ? hA : 0, k === n - 1 ? hB : 0, b0 - a0, k === 0 ? 0.12 : 0.88, s, true);
      if (k < n - 1) { const a1 = pr[k + 1][0]; D.DM(Q(a1, v), Q(b0, v), xd ? 'h' : 'v', xd ? -4 : 4, cmi(b0 - a1)); } });
    grp.forEach((q, i) => { const k = i > 0 && i === grp.length - 1 ? n - 1 : Math.min(i, n - 1), Lk = pr[k][1] - pr[k][0], w = W(k);
      const m = xd ? (k === 0 ? (fx ? Math.min(pr[0][0] + fx * Ln, pr[0][1] - 0.30 * Lk) : pr[0][0] + 0.3 * Lk) : pr[k][0] + 0.3 * ls) : (pr[k][0] + pr[k][1]) / 2 - Lk * 0.15;
      const t = `${q.adet}Ø${q.F}/${cmi(q.s)} L=${cmi(q.boy)} ${q.yuz === 'kenar' ? 'firkete' : q.yuz}`;
      if (xd) { POZ([m, w + mm(3.6)], q.no); TX([m + mm(3.5), w + mm(2.6)], t, 2.4, 'L', 'STA_POZ'); }
      else { POZ([w - mm(3.6), m], q.no); TX([w - mm(2.4), m + mm(4)], t, 2.4, 'L', 'STA_POZ', 90); } });
    const mt = `Ø${p.F} ${p.yuz} ${p.yon.toUpperCase()}: ${n} parça (12 m + kalan), bindirme ${cmi(ls)} cm`, wl = W(n - 1), e = pr[n - 1][1];
    if (xd) TX([e, wl - mm(8.5)], mt, 2.0, 'R', 'STA_YAZI'); else TX([wl + mm(8.5), e], mt, 2.0, 'R', 'STA_YAZI', 90);
  };
  const acilim = (D, p, xa, xb, yc) => {
    const { mm, PL, TX } = D, segs0 = p.segs || [{ L: p.boy, a: 0 }];
    const ana = segs0.reduce((m, s) => (s.L > m.L ? s : m), segs0[0]), Wc = xb - xa - mm(8), hk = mm(2.6);
    const segs = segs0.map(s => { let r = ((s.a - ana.a) % 360 + 540) % 360 - 180; return { L: s.L, r }; }); // göreli açı (-180..180)
    const yat = segs.filter(s => Math.abs(s.r) < 1 || Math.abs(s.r) > 179), topY = yat.reduce((t, s) => t + s.L, 0) || 1;
    let x = xa + mm(4), y = yc - mm(1.6); const pts = [[x, y]], yaz = [];
    const kanca = (s, bas) => { const up = s.r > 0 ? 1 : -1, eg = Math.abs(Math.abs(s.r) - 90) > 10 ? hk * 0.7 : 0; return [bas ? x - eg : x + eg, y + up * hk]; };
    segs.forEach((s, i) => {
      if (Math.abs(s.r) < 1 || Math.abs(s.r) > 179) { const w = Wc * s.L / topY, a0 = x; x += w; pts.push([x, y]); yaz.push([(a0 + x) / 2, y + mm(0.6), cmi(s.L)]); }
      else if (i === 0) { const q = kanca(Math.abs(Math.abs(s.r) - 90) < 10 ? s : { r: -s.r }, true); /* dik gönyeler: iki uç da aynı tarafa (çizimdeki gibi) */ pts.unshift(q); yaz.push([q[0] - mm(1.6), y + (q[1] - y) * 0.5 - mm(0.6), cmi(s.L)]); }
      else { const q = kanca(s, false); pts.push(q); yaz.push([q[0] + mm(1.8), y + (q[1] - y) * 0.5 - mm(0.6), cmi(s.L)]); }
    });
    PL(pts, false, 'STA_TABLO_DONATI'); yaz.forEach(([px, py, t]) => TX([px, py], t, 1.5, 'C', 'STA_TABLO'));
  };

  /* ======================= PAFTA BLOKLARI ======================= */
  const bloklar = (R, K) => {
    const mm = v => v * K, S = R.S, g = S.geo, GM = R.GM, c = S.mal, DT = P.detayDsi(R), harf = i => String.fromCharCode(65 + i);
    const Rx0 = GM.R.x0, Ry0 = GM.R.y0, Rx1 = GM.R.x1, Ry1 = GM.R.y1, Lx = g.Lx, Ly = g.Ly, ol = 'Ö:1/' + Math.round(K * 1000);
    const xC = GM.xC, yC = GM.yC;
    const aksBalon = (D, yAlt, yUst, xAlt, xUst) => { const { mm, L, BALON } = D; xC.forEach((x, i) => { L([x, yAlt + mm(5)], [x, yUst - mm(5)], 'STA_AKS', 'CENTER'); BALON([x, yAlt], String(i + 1)); BALON([x, yUst], String(i + 1)); }); yC.forEach((y, j) => { L([xAlt + mm(5), y], [xUst - mm(5), y], 'STA_AKS', 'CENTER'); BALON([xAlt, y], harf(j)); BALON([xUst, y], harf(j)); }); };
    const sirali = a => [...new Set(a.map(v => Math.round(v * 1000) / 1000))].sort((p, q) => p - q);
    const olcuSira = (D, ptsX, y, dir, off) => { const s = sirali(ptsX); for (let i = 0; i < s.length - 1; i++) D.DM(dir === 'h' ? [s[i], y] : [y, s[i]], dir === 'h' ? [s[i + 1], y] : [y, s[i + 1]], dir, off, cmi(s[i + 1] - s[i])); };
    const B = [];
    /* --- kalıp planı --- */
    const kalipPlan = (baslik, kot, temel, doseme) => {
      const D = yeniCizim(K), { mm, REC, TARA, TX, L } = D;
      if (temel) REC(Rx0, Ry0, Rx1, Ry1, 'STA_KALIP');
      REC(0, 0, Lx, Ly, 'STA_KALIP'); GM.comps.forEach(q => REC(q.x0, q.y0, q.x1, q.y1, 'STA_KALIP'));
      TARA([[0, 0, Lx, Ly]], GM.comps.map(q => [q.x0, q.y0, q.x1, q.y1]), 2.0);
      if (doseme) (g.doseme || []).forEach(d => { const a = [Math.max(d.x0, 0), Math.max(d.y0, 0)], b = [Math.min(d.x1, Lx), Math.min(d.y1, Ly)]; L(a, b, 'STA_GORUNUS'); L([a[0], b[1]], [b[0], a[1]], 'STA_GORUNUS'); TX([(a[0] + b[0]) / 2 + mm(3), (a[1] + b[1]) / 2 + mm(2)], `${d.ad || 'D'}  h=${cmi(d.t)}`, 2.5, 'L'); if (P.delikCiz) P.delikCiz(D, d, 'kalip'); });
      // kot işareti ortada
      const q0 = GM.comps[0], cx = (q0.x0 + q0.x1) / 2, cy = (q0.y0 + q0.y1) / 2;
      D.CI([cx, cy], mm(1.6), 'STA_OLCU'); L([cx - mm(2.4), cy], [cx + mm(2.4), cy], 'STA_OLCU'); L([cx, cy - mm(2.4)], [cx, cy + mm(2.4)], 'STA_OLCU'); TX([cx + mm(3), cy + mm(1)], kotS(kot), 2.5, 'L'); L([cx + mm(3), cy], [cx + mm(16), cy], 'STA_YAZI'); if (temel) TX([cx + mm(3), cy - mm(3.6)], `h=${cmi(g.hr)}`, 2.5, 'L');
      // perde adları
      GM.walls.forEach((w, i) => { const m = [w.p0[0] + w.e[0] * w.L * 0.5, w.p0[1] + w.e[1] * w.L * 0.5], n = w.n, of = w.t / 2 + mm(4); const q = [m[0] + n[0] * of, m[1] + n[1] * of]; TX(q, perdeNo(w, i), 2.6, 'C', 'STA_BASLIK', Math.abs(w.e[1]) > 0.5 ? 90 : 0); });
      if (P.kalipEk) { try { P.kalipEk(D, R, { temel, doseme, kot }); } catch (e) { console.error(e); } }
      const e0 = temel ? [Rx0, Ry0, Rx1, Ry1] : [0, 0, Lx, Ly];
      // 3 sıra ölçü (dış toplam / perde yüzleri / pabuç)
      const xs = [e0[0], 0, ...GM.walls.filter(w => Math.abs(w.e[1]) > 0.5).flatMap(w => [w.p0[0] - w.t / 2, w.p0[0] + w.t / 2]), Lx, e0[2]];
      const ys = [e0[1], 0, ...GM.walls.filter(w => Math.abs(w.e[0]) > 0.5).flatMap(w => [w.p0[1] - w.t / 2, w.p0[1] + w.t / 2]), Ly, e0[3]];
      for (const [yy, sgn] of [[e0[3], 1], [e0[1], -1]]) { olcuSira(D, xs, yy, 'h', sgn * 8); olcuSira(D, [0, Lx], yy, 'h', sgn * 14); D.DM([e0[0], yy], [e0[2], yy], 'h', sgn * 20, cmi(e0[2] - e0[0])); }
      for (const [xx, sgn] of [[e0[2], 1], [e0[0], -1]]) { olcuSira(D, ys, xx, 'v', sgn * 8); olcuSira(D, [0, Ly], xx, 'v', sgn * 14); D.DM([xx, e0[1]], [xx, e0[3]], 'v', sgn * 20, cmi(e0[3] - e0[1])); }
      aksBalon(D, e0[1] - mm(32), e0[3] + mm(32), e0[0] - mm(32), e0[2] + mm(32));
      // kesit okları
      const yS = (q0.y0 + q0.y1) / 2, xS = (q0.x0 + q0.x1) / 2 + (q0.x1 - q0.x0) * 0.2;
      D.KESOK([e0[0] - mm(42), yS], 'A', [0, 1]); D.KESOK([e0[2] + mm(42), yS], 'A', [0, 1]);
      D.KESOK([xS, e0[3] + mm(42)], 'B', [-1, 0]); D.KESOK([xS, e0[1] - mm(42)], 'B', [-1, 0]);
      L([e0[0] - mm(38), yS], [e0[0] - mm(25), yS], 'STA_KALIP'); L([e0[2] + mm(25), yS], [e0[2] + mm(38), yS], 'STA_KALIP');
      D.BASLIK([(e0[0] + e0[2]) / 2, e0[1] - mm(52)], baslik, ol);
      return { spec: D.out, kutu: D.kutu(), ySec: yS, xSec: xS };
    };
    const kp1 = kalipPlan(`${kotS(g.kAlt + g.hr).replace('+', '')} KOTU KALIP PLANI`, g.kAlt + g.hr, true, false);
    B.push({ pafta: 0, ...kp1 });
    B.push({ pafta: 0, ...kalipPlan(`${kotS(g.kUst).replace('+', '')} KOTU KALIP PLANI`, g.kUst, false, true) });
    /* --- kesit (A-A: X boyunca; B-B: Y boyunca) --- */
    const kesit = (ad, dir, at, donatili) => {
      const D = yeniCizim(K), { mm, REC, TARA, TX, L, PL, KOT } = D, z = v => v - g.kAlt;
      const u0 = dir === 'x' ? Rx0 : Ry0, u1 = dir === 'x' ? Rx1 : Ry1, uz = dir === 'x' ? Lx : Ly;
      const orth = GM.walls.filter(w => (dir === 'x' ? Math.abs(w.e[1]) > 0.5 : Math.abs(w.e[0]) > 0.5) && (dir === 'x' ? at >= w.p0[1] - 1e-6 && at <= w.p0[1] + w.L + 1e-6 : at >= w.p0[0] - 1e-6 && at <= w.p0[0] + w.L + 1e-6)).map(w => ({ c: dir === 'x' ? w.p0[0] : w.p0[1], t: w.t, w }));
      const H0 = z(g.kAlt + g.hr), Ht = z(g.kUst), gb = 0.10;
      // grobeton, radye, perdeler (kesilen: taralı)
      REC(u0 - 0.1, -gb, u1 + 0.1, 0, 'STA_GORUNUS'); for (let x = u0 - 0.1; x < u1 + 0.1; x += mm(6)) D.out.push({ k: 'C', c: [x + mm(3), -gb / 2], r: mm(0.4), ly: 'STA_GORUNUS' });
      const kes = [[u0, 0, u1, H0], ...orth.map(o => [o.c - o.t / 2, H0, o.c + o.t / 2, Ht])];
      PL([[u0, 0], [u1, 0], [u1, H0], ...orth.slice().reverse().flatMap(o => [[o.c + o.t / 2, H0], [o.c + o.t / 2, Ht], [o.c - o.t / 2, Ht], [o.c - o.t / 2, H0]]), [u0, H0]], true, 'STA_KALIP');
      if (!donatili) TARA(kes, [], 2.0);
      // döşeme
      for (const d of (g.doseme || [])) { const a = dir === 'x' ? [d.x0, d.x1] : [d.y0, d.y1], b = dir === 'x' ? [d.y0, d.y1] : [d.x0, d.x1]; if (at < b[0] || at > b[1]) continue; const xa = Math.max(a[0], 0), xb = Math.min(a[1], uz); REC(xa, Ht - d.t, xb, Ht, 'STA_KALIP'); if (!donatili) TARA([[xa, Ht - d.t, xb, Ht]], [], 2.0); }
      // ek elemanlar (modelden): ara döşemeler, askıdaki / kısa perdeler, kolonlar — kesilen taralı, görünen ince çizgi
      { const ko = S.koken || [0, 0], CF = S.cer || {}, W = q => [q[0] - ko[0], q[1] - ko[1]], gor = dir === 'x' ? (v => v > at) : (v => v < at); // bakış: A-A +y, B-B −x
        for (const d of CF.dosemeler || []) {
          if ((g.doseme || []).some(q => q.id != null && q.id === d.id)) continue; const P2 = d.pts.map(W), xs = P2.map(p => p[0]), ys = P2.map(p => p[1]);
          const a = dir === 'x' ? [Math.min(...xs), Math.max(...xs)] : [Math.min(...ys), Math.max(...ys)], b = dir === 'x' ? [Math.min(...ys), Math.max(...ys)] : [Math.min(...xs), Math.max(...xs)];
          if (at < b[0] - 1e-6 || at > b[1] + 1e-6) continue; const zt2 = z(d.zt), r = [a[0], zt2 - d.t, a[1], zt2]; REC(r[0], r[1], r[2], r[3], 'STA_KALIP'); if (!donatili) TARA([r], [], 2.0);
          TX([(r[0] + r[2]) / 2, zt2 + mm(1.5)], `${d.no || 'Ara döşeme'} (h=${cmi(d.t)})`, 2.0, 'C', 'STA_YAZI'); KOT([r[2] + mm(6), zt2], d.zt); KOT([r[2] + mm(6), zt2 - d.t], d.zt - d.t, true);
        }
        for (const { kp } of R.kisa || []) {
          const zb = kp.aski ? z(kp.z0) : H0, zt2 = z(kp.zt != null ? kp.zt : g.kUst), boy = (dir === 'x') === (kp.yon === 'X'); let r = null;
          if (boy && Math.abs(at - kp.v) <= kp.t / 2 + 1e-6) r = [kp.a, zb, kp.b, zt2]; else if (!boy && at >= kp.a - 1e-6 && at <= kp.b + 1e-6) r = [kp.v - kp.t / 2, zb, kp.v + kp.t / 2, zt2];
          if (r) { REC(r[0], r[1], r[2], r[3], 'STA_KALIP'); if (!donatili) TARA([r], [], 2.0); TX([(r[0] + r[2]) / 2, r[3] + mm(4)], `${kp.ad}${kp.aski ? ' (döşeme üstünde)' : ''}`, 2.0, 'C', 'STA_YAZI'); if (kp.aski) KOT([r[2] + mm(6), r[1]], kp.z0, true); }
          else if (!boy && gor(kp.v)) { /* arkada kalan, kesite paralel olmayan → görünmez */ }
          else if (boy && gor(kp.v)) L([kp.a, zb], [kp.b, zb], 'STA_GORUNUS'), L([kp.a, zt2], [kp.b, zt2], 'STA_GORUNUS'), L([kp.a, zb], [kp.a, zt2], 'STA_GORUNUS'), L([kp.b, zb], [kp.b, zt2], 'STA_GORUNUS');
        }
        for (const k of CF.kolonlar || []) {
          const c0 = W([k.x, k.y]), bx = k.D || k.bx, by = k.D || k.by, cu = dir === 'x' ? c0[0] : c0[1], cv = dir === 'x' ? c0[1] : c0[0], w2 = (dir === 'x' ? bx : by) / 2, n2 = (dir === 'x' ? by : bx) / 2;
          const r = [cu - w2, z(k.z0), cu + w2, z(k.zt)];
          if (Math.abs(at - cv) <= n2 + 1e-6) { REC(r[0], r[1], r[2], r[3], 'STA_KALIP'); if (!donatili) TARA([r], [], 2.0); TX([cu, r[3] + mm(1.5)], `${k.no || 'S'} ${cmi(bx)}/${cmi(by)}`, 1.9, 'C', 'STA_YAZI'); }
          else if (gor(cv)) REC(r[0], r[1], r[2], r[3], 'STA_GORUNUS');
        } }
      // görünen üst kenar
      if (orth.length > 1) L([orth[0].c + orth[0].t / 2, Ht], [orth[orth.length - 1].c - orth[orth.length - 1].t / 2, Ht], 'STA_GORUNUS');
      // zemin (dolgu) çizgisi + tarama
      const zz = z(g.kZemin); L([u0 - mm(40), zz], [0, zz], 'STA_ZEMIN'); L([uz, zz], [u1 + mm(40), zz], 'STA_ZEMIN'); for (let x = u0 - mm(38); x < 0; x += mm(4)) L([x, zz], [x - mm(2), zz - mm(2)], 'STA_ZEMIN'); for (let x = uz + mm(2); x < u1 + mm(40); x += mm(4)) L([x, zz], [x - mm(2), zz - mm(2)], 'STA_ZEMIN');
      // su
      if (g.kSu > g.kAlt + g.hr) for (let k = 0; k < orth.length - 1; k++) { const a = orth[k].c + orth[k].t / 2, b = orth[k + 1].c - orth[k + 1].t / 2; if (b - a < 0.3) continue; L([a, z(g.kSu)], [b, z(g.kSu)], 'STA_SU', 'DASHED'); TX([a + mm(3), z(g.kSu) + mm(1.2)], 'M.S.S. ' + kotS(g.kSu), 2.2, 'L', 'STA_SU'); }
      { const Hp2 = g.kUst - g.kAlt - g.hr; if (Hp2 >= 6) { const zd = H0 + Math.round(Hp2 / 2 * 20) / 20; orth.forEach(o => { L([o.c - o.t / 2 - mm(2), zd], [o.c + o.t / 2 + mm(2), zd], 'STA_SU', 'DASHED'); L([o.c, zd - 0.07], [o.c, zd + 0.07], 'STA_SU'); }); if (orth.length) TX([orth[orth.length - 1].c + orth[orth.length - 1].t / 2 + mm(3), zd + mm(1)], 'İnşaat derzi ' + kotS(g.kAlt + zd), 2.2, 'L', 'STA_SU'); } }
      // su tutucu bant
      orth.forEach(o => { const p = [o.c, H0 + 0.02]; L(p, [p[0], p[1] + 0.12], 'STA_SU'); });
      if (orth[0]) { const o = orth[0], p = [o.c, H0 + 0.07]; L(p, [u0 - mm(18), H0 + mm(14)], 'STA_YAZI'); TX([u0 - mm(18), H0 + mm(15)], 'Su Tutucu', 2.2, 'R'); TX([u0 - mm(18), H0 + mm(11)], 'I-15/4', 2.2, 'R'); }
      // kotlar
      KOT([u1 + mm(12), 0], g.kAlt, false); KOT([u1 + mm(12), H0], g.kAlt + g.hr); KOT([u1 + mm(12), Ht], g.kUst); KOT([u0 - mm(10), zz], g.kZemin, true); KOT([u1 + mm(24), -gb], g.kAlt - gb);
      // ölçüler
      const xs = [u0, ...orth.flatMap(o => [o.c - o.t / 2, o.c + o.t / 2]), u1];
      olcuSira(D, xs, -gb, 'h', -8); D.DM([u0, -gb], [u1, -gb], 'h', -14, cmi(u1 - u0));
      D.DM([u1, -gb], [u1, 0], 'v', 7, cmi(gb)); D.DM([u1, 0], [u1, H0], 'v', 7, cmi(g.hr)); D.DM([u1, H0], [u1, Ht], 'v', 7, cmi(Ht - H0)); D.DM([u1, 0], [u1, Ht], 'v', 14, cmi(Ht));
      // akslar
      const cs = dir === 'x' ? xC : yC; cs.forEach((x, i) => { L([x, Ht + mm(2)], [x, Ht + mm(14)], 'STA_AKS', 'CENTER'); D.BALON([x, Ht + mm(19)], dir === 'x' ? String(i + 1) : harf(i)); });
      // notlar (grobeton)
      TX([u0 + mm(2), -gb - mm(14)], '10 cm Grobeton (C16/20)', 2.0, 'L'); TX([u0 + mm(2), -gb - mm(17.5)], 'Sıkıştırılmış dolgu (%95 proktor)', 2.0, 'L');
      return { D, orth, H0, Ht, u0, u1, uz, z };
    };
    const kA = kesit('A-A KESİTİ', 'x', kp1.ySec, false); kA.D.BASLIK([(kA.u0 + kA.u1) / 2, -0.1 - mm(30)], 'A-A KESİTİ', ol); B.push({ pafta: 0, spec: kA.D.out, kutu: kA.D.kutu() });
    const kB = kesit('B-B KESİTİ', 'y', kp1.xSec, false); kB.D.BASLIK([(kB.u0 + kB.u1) / 2, -0.1 - mm(30)], 'B-B KESİTİ', ol); B.push({ pafta: 0, spec: kB.D.out, kutu: kB.D.kutu() });
    /* ek kesitler: kolon sırası, ara döşeme ve döşeme üstündeki perdeler A-A / B-B ile kesilmiyorsa ayrıca C-C, D-D … */
    { const ko = S.koken || [0, 0], CF = S.cer || {}, kol = (CF.kolonlar || []).map(k => ({ x: k.x - ko[0], y: k.y - ko[1] })), aski = (R.kisa || []).map(q => q.kp).filter(kp => kp.aski);
      const araD = (CF.dosemeler || []).filter(d => !(g.doseme || []).some(q => q.id != null && q.id === d.id)).map(d => { const xs = d.pts.map(p => p[0] - ko[0]), ys = d.pts.map(p => p[1] - ko[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; });
      const ic = (v, a, b) => v > a + 0.05 && v < b - 0.05;
      const ayY = [...kol.map(k => k.y), ...aski.filter(kp => kp.yon === 'X').map(kp => kp.v), ...araD.map(d => (d.y0 + d.y1) / 2)].filter(v => ic(v, 0, Ly) && Math.abs(v - kp1.ySec) > 0.5);
      const ayX = [...kol.map(k => k.x).filter(x => araD.some(d => x >= d.x0 && x <= d.x1)), ...aski.filter(kp => kp.yon === 'Y').map(kp => kp.v), ...araD.map(d => (d.x0 + d.x1) / 2), ...kol.map(k => k.x)].filter(v => ic(v, 0, Lx) && Math.abs(v - kp1.xSec) > 0.5);
      const ekler = []; if (ayY.length) ekler.push(['x', ayY[0]]); if (ayX.length) ekler.push(['y', ayX[Math.floor((ayX.length - 1) / 2) * 0]]);
      const plan0 = B.filter(b => b.pafta === 0).slice(0, 2);
      ekler.forEach(([dir, at], i) => { const h = String.fromCharCode(67 + i), ad = `${h}-${h} KESİTİ`, k = kesit(ad, dir, at, false); k.D.BASLIK([(k.u0 + k.u1) / 2, -0.1 - mm(30)], ad, ol); B.push({ pafta: 0, spec: k.D.out, kutu: k.D.kutu() });
        plan0.forEach((pb, j) => { const Dm = yeniCizim(K), e0 = j === 0 ? [Rx0, Ry0, Rx1, Ry1] : [0, 0, Lx, Ly];
          if (dir === 'x') { Dm.KESOK([e0[0] - mm(42), at], h, [0, 1]); Dm.KESOK([e0[2] + mm(42), at], h, [0, 1]); Dm.L([e0[0] - mm(38), at], [e0[0] - mm(25), at], 'STA_KALIP'); Dm.L([e0[2] + mm(25), at], [e0[2] + mm(38), at], 'STA_KALIP'); }
          else { Dm.KESOK([at, e0[3] + mm(42)], h, [-1, 0]); Dm.KESOK([at, e0[1] - mm(42)], h, [-1, 0]); Dm.L([at, e0[3] + mm(25)], [at, e0[3] + mm(38)], 'STA_KALIP'); Dm.L([at, e0[1] - mm(38)], [at, e0[1] - mm(25)], 'STA_KALIP'); }
          Dm.out.forEach(e => pb.spec.push(e)); }); }); }

    /* --- TEMEL DONATI PLANI --- */
    {
      const D = yeniCizim(K), { mm, REC, TX, L, PL, POZ } = D, cr = c.cR;
      REC(Rx0, Ry0, Rx1, Ry1, 'STA_KALIP'); REC(0, 0, Lx, Ly, 'STA_GORUNUS'); GM.comps.forEach(q => REC(q.x0, q.y0, q.x1, q.y1, 'STA_GORUNUS'));
      const zonX = [Ry0 + (Ry1 - Ry0) * 0.38, Ry0 + (Ry1 - Ry0) * 0.62], zonY = [Rx0 + (Rx1 - Rx0) * 0.22, Rx0 + (Rx1 - Rx0) * 0.30];
      let ix = 0, iy = 0;
      const bGrup = new Set();
      for (const p of DT.temel) {
        if (p.sehpa) continue;
        const legP = (p.segs.find(q => q.a === 90) || { L: 0 }).L;
        if (P.parcala(p.net, p.F, legP, legP).length > 1) { /* 12 m'yi aşan: bindirmeli parçalar halinde göster */
          const key = p.yon + '|' + p.yuz; if (bGrup.has(key)) continue; bGrup.add(key);
          const grp = DT.temel.filter(q => !q.sehpa && q.yon === p.yon && q.yuz === p.yuz && q.net === p.net), xd = p.yon === 'x';
          const v = xd ? zonX[ix++ % 2] + (ix > 2 ? mm(8) : 0) : zonY[iy++ % 2] + (iy > 2 ? mm(8) : 0);
          parcaliCiz(D, grp, xd, xd ? Rx0 + cr : Ry0 + cr, v, p.net, legP, legP, 1, mm(2), xd ? 0.40 : null);
          continue;
        }
        if (p.yon === 'x') { const y = zonX[ix++ % 2] + (ix > 2 ? mm(8) : 0), x0 = Rx0 + cr, x1 = Rx1 - cr; PL([[x0, y + (p.segs[0].a === 90 ? mm(2) : 0)], [x0, y], [x1, y], [x1, y + mm(2)]], false, 'STA_DONATI'); { const sA = p.segs[0].a === 90 ? p.segs[0].L : 0, sB = p.segs.length > 1 && p.segs[p.segs.length - 1].a === 90 ? p.segs[p.segs.length - 1].L : 0; segYaz(D, true, x0, x1, y, sA, sB, (p.segs.find(q => q.a === 0) || { L: x1 - x0 }).L, 0.8); } POZ([x0 + (x1 - x0) * 0.35, y + mm(3.6)], p.no); TX([x0 + (x1 - x0) * 0.35 + mm(3.5), y + mm(2.6)], `${p.adet}Ø${p.F}/${cmi(p.s)} L=${cmi(p.boy)}   ${p.yuz}`, 2.4, 'L', 'STA_POZ'); }
        else { const x = zonY[iy++ % 2] + (iy > 2 ? mm(8) : 0), y0 = Ry0 + cr, y1 = Ry1 - cr; PL([[x + mm(2), y0], [x, y0], [x, y1], [x + mm(2), y1]], false, 'STA_DONATI'); { const sA = p.segs[0].a === 90 ? p.segs[0].L : 0, sB = p.segs.length > 1 && p.segs[p.segs.length - 1].a === 90 ? p.segs[p.segs.length - 1].L : 0; segYaz(D, false, y0, y1, x, sA, sB, (p.segs.find(q => q.a === 0) || { L: y1 - y0 }).L, 0.85, 1, true); } POZ([x - mm(3.6), y0 + (y1 - y0) * 0.5], p.no); TX([x - mm(2.4), y0 + (y1 - y0) * 0.5 + mm(4)], `${p.adet}Ø${p.F}/${cmi(p.s)} L=${cmi(p.boy)} ${p.yuz}`, 2.4, 'L', 'STA_POZ', 90); }
      }
      // dağılım aralığı (oklu çizgi)
      L([Rx0 + (Rx1 - Rx0) * 0.7, Ry0 + cr], [Rx0 + (Rx1 - Rx0) * 0.7, Ry1 - cr], 'STA_OLCU'); L([Rx0 + cr, Ry0 + (Ry1 - Ry0) * 0.2], [Rx1 - cr, Ry0 + (Ry1 - Ry0) * 0.2], 'STA_OLCU');
      const sh = DT.temel.find(p => p.sehpa); if (sh) { const p = [Rx0 + (Rx1 - Rx0) * 0.08, Ry0 + (Ry1 - Ry0) * 0.75]; POZ(p, sh.no); TX([p[0] + mm(3.5), p[1] - mm(1)], `Ø${sh.F}/(${Math.round((sh.s || 1) * 100)}-${Math.round((sh.s || 1) * 100)})  sehpa`, 2.4, 'L', 'STA_POZ'); }
      const e0 = [Rx0, Ry0, Rx1, Ry1];
      olcuSira(D, [Rx0, 0, Lx, Rx1], Ry1, 'h', 8); D.DM([Rx0, Ry1], [Rx1, Ry1], 'h', 14, cmi(Rx1 - Rx0)); olcuSira(D, [Ry0, 0, Ly, Ry1], Rx1, 'v', 8); D.DM([Rx1, Ry0], [Rx1, Ry1], 'v', 14, cmi(Ry1 - Ry0));
      aksBalon(D, e0[1] - mm(14), e0[3] + mm(24), e0[0] - mm(14), e0[2] + mm(24));
      D.BASLIK([(Rx0 + Rx1) / 2, Ry0 - mm(26)], `${kotS(g.kAlt + g.hr).replace('+', '')} KOTU TEMEL DONATI PLANI`, ol);
      { const t2 = R.tasarim.find(x => /^Radye/.test(x.eleman)), ek = t2 ? t2.katman.filter(k => !k.sec || !k.sec.ok).map(k => `${k.yon} ${k.yuz}`.toLocaleUpperCase('tr')) : []; if (ek.length) TX([(Rx0 + Rx1) / 2, Ry0 - mm(36)], `⚠ ${ek.join(', ')} DONATISI HESAPLA SAĞLANAMADI — RADYE KESİTİ YETERSİZ`, 3.0, 'C', 'STA_UYARI'); }
      B.push({ pafta: 1, spec: D.out, kutu: D.kutu() });
    }
    /* --- donatılı A-A kesiti --- */
    {
      const k = kesit('A-A', 'x', kp1.ySec, true), D = k.D, { mm, L, PL, POZ, TX } = D, cr = c.cR, H0 = k.H0, Ht = k.Ht;
      const alt = DT.temel.find(p => p.yon === 'x' && p.yuz === 'alt'), ust = DT.temel.find(p => p.yon === 'x' && p.yuz === 'üst'), aY = DT.temel.find(p => p.yon === 'y' && p.yuz === 'alt'), uY = DT.temel.find(p => p.yon === 'y' && p.yuz === 'üst');
      const yA = cr, yU = H0 - cr;
      PL([[k.u0 + cr, yA + gonye(g.hr, cr)], [k.u0 + cr, yA], [k.u1 - cr, yA], [k.u1 - cr, yA + gonye(g.hr, cr)]], false, 'STA_DONATI', alt ? alt.F : 12);
      PL([[k.u0 + cr + 0.02, yU - gonye(g.hr, cr)], [k.u0 + cr + 0.02, yU], [k.u1 - cr - 0.02, yU], [k.u1 - cr - 0.02, yU - gonye(g.hr, cr)]], false, 'STA_DONATI', ust ? ust.F : 12);
      const nok = (y, s) => { if (!s) return; for (let x = k.u0 + cr + 0.05; x < k.u1 - cr; x += s) D.out.push({ k: 'C', c: [x, y + (y < H0 / 2 ? 0.02 : -0.02)], r: mm(0.5), ly: 'STA_DONATI_KESIT' }); };
      nok(yA, aY && aY.s); nok(yU, uY && uY.s);
      // perde filizleri (L)
      k.orth.forEach(o => { for (const sgn of [-1, 1]) { const x = o.c + sgn * (o.t / 2 - c.cP), fl = gonye(g.hr, c.cR); const pdF = ((DT.perdeler.find(q => q.w === o.w) || { poz: [] }).poz.find(q => q.yon === 'düşey') || { F: 16 }).F; PL([[x - sgn * fl, yA + 0.03], [x, yA + 0.03], [x, Ht - c.cP]], false, 'STA_DONATI', pdF); } });
      const etk = (p, x, y, yuk, tx) => { if (!p) return; L([x, y], [x, yuk], 'STA_YAZI'); POZ([x, yuk + mm(3)], p.no); TX([x + mm(3.4), yuk + mm(2)], tx || `Ø${p.F}/${cmi(p.s)}`, 2.3, 'L', 'STA_POZ'); };
      etk(alt, k.u0 + (k.u1 - k.u0) * 0.42, yA, -0.1 - mm(10), `${alt ? alt.adet : ''}Ø${alt ? alt.F : ''}/${alt ? cmi(alt.s) : ''} alt`);
      etk(ust, k.u0 + (k.u1 - k.u0) * 0.58, yU, H0 + mm(14), `${ust ? ust.adet : ''}Ø${ust ? ust.F : ''}/${ust ? cmi(ust.s) : ''} üst`);
      D.BASLIK([(k.u0 + k.u1) / 2, -0.1 - mm(32)], 'A-A KESİTİ (TEMEL DONATI)', ol);
      B.push({ pafta: 1, spec: D.out, kutu: D.kutu() });
    }
    /* --- demirlerde bindirme boyları (firma standart detayı) --- */
    { const D = yeniCizim(K), { mm, REC, TX, L } = D, Fl = [12, 14, 16, 18, 20, 22, 24, 26], W = mm(118), H = mm(62); REC(0, 0, W, H, 'STA_TABLO'); TX([W / 2, H - mm(6)], 'DEMİRLERDE BİNDİRME BOYLARI', 2.8, 'C', 'STA_BASLIK'); TX([W / 2, H - mm(10)], 'Ö:1/20 (boylar cm)', 2.0, 'C');
      const yb = mm(10), hb = mm(6); REC(mm(4), yb - hb, W - mm(4), yb, 'STA_KALIP'); const sc = mm(30) / 1.4;
      Fl.forEach((F, i) => { const x = mm(12) + i * mm(13.2), lp = P.bindirme(F) * sc; L([x, yb], [x, yb + lp + mm(4)], 'STA_DONATI'); L([x + mm(3), yb], [x + mm(3), yb + lp], 'STA_DONATI'); L([x + mm(3), yb + lp], [x + mm(4.2), yb + lp + mm(0.6)], 'STA_DONATI'); TX([x + mm(5.2), yb + lp / 2], String(Math.round(P.bindirme(F) * 100)), 2.0, 'C', 'STA_OLCU', 90); TX([x - mm(1.2), yb + mm(5)], 'Ø' + F, 2.0, 'C', 'STA_POZ', 90); });
      B.push({ pafta: 1, spec: D.out, kutu: D.kutu() }); }
    /* --- sehpa donatısı kutusu --- */
    { const sh = DT.temel.find(p => p.sehpa); if (sh) { const D = yeniCizim(K), { mm, REC, TX, PL } = D, h = sh.h, ay = 0.25, ust = 0.5, ca = Math.cos(Math.PI / 6), sa = Math.sin(Math.PI / 6);
      REC(0, 0, mm(62), mm(52), 'STA_TABLO'); TX([mm(31), mm(46.5)], 'Sehpa Donatısı', 2.6, 'C', 'STA_BASLIK'); TX([mm(31), mm(41.5)], `d = ${cmi(g.hr)} cm`, 2.2, 'C');
      const s = Math.min(mm(17) / Math.max(h, 0.1), mm(38) / (ust + 2 * ay * ca)), xa = mm(31) - ust * s / 2, xb = xa + ust * s, yb = mm(19) + ay * sa * s, yt = yb + h * s;
      // ayaklardan biri öne (sol-aşağı), biri arkaya (sağ-yukarı) bükülü: sehpa kendi başına durur
      PL([[xa - ay * ca * s, yb - ay * sa * s], [xa, yb], [xa, yt], [xb, yt], [xb, yb], [xb + ay * ca * s, yb + ay * sa * s]], false, 'STA_DONATI', sh.F, s);
      TX([(xa + xb) / 2, yt + mm(1.2)], cmi(ust), 2.0, 'C'); TX([xa - mm(1.2), (yb + yt) / 2], cmi(h), 2.0, 'C', 'STA_YAZI', 90); TX([xb + mm(2.6), (yb + yt) / 2], cmi(h), 2.0, 'C', 'STA_YAZI', 90);
      TX([xa - ay * ca * s / 2 - mm(1.5), yb - ay * sa * s / 2 + mm(0.3)], cmi(ay), 2.0, 'C', 'STA_YAZI', 30); TX([xb + ay * ca * s / 2 + mm(0.8), yb + ay * sa * s / 2 + mm(1.6)], cmi(ay), 2.0, 'C', 'STA_YAZI', 30);
      const ss = Math.round((sh.s || 1) * 100); TX([mm(28), mm(9)], `${sh.adet}Ø${sh.F}/${ss}-${ss}`, 2.4, 'C', 'STA_POZ'); TX([mm(28), mm(4.2)], `L=${cmi(sh.boy)}`, 2.4, 'C', 'STA_POZ'); D.POZ([mm(53), mm(7)], sh.no);
      B.push({ pafta: 1, spec: D.out, kutu: D.kutu() }); } }
    /* --- donatı bükme çapları tablosu --- */
    { const caps = [...new Set([...DT.temel, ...DT.doseme.flatMap(d => d.poz), ...DT.perdeler.flatMap(p => p.poz)].map(p => p.F))].sort((a, b) => a - b);
      if (caps.length) { const D = yeniCizim(K), { mm, L, TX } = D, w = [16, 22, 18, 30].map(mm), X = [0]; w.forEach(v => X.push(X[X.length - 1] + v)); let y = 0; const rh = mm(6);
        L([0, y], [X[4], y], 'STA_TABLO'); TX([X[4] / 2, y - mm(4.4)], 'DONATI BÜKME ÇAPLARI', 2.6, 'C', 'STA_TABLO'); y -= rh; L([0, y], [X[4], y], 'STA_TABLO');
        ['Ø (mm)', 'Dm (mm)', 'Dm / Ø', 'Kanca / gönye'].forEach((h, i) => TX([(X[i] + X[i + 1]) / 2, y - mm(4.2)], h, 2.0, 'C', 'STA_TABLO')); y -= rh; L([0, y], [X[4], y], 'STA_TABLO');
        for (const F of caps) { [String(F), String(P.bukmeCapi(F)), (F <= 16 ? 4 : 7) + 'Ø', 'r = ' + Math.round(P.bukmeR(F) * 1000) + ' mm (eksen)'].forEach((v, i) => TX([(X[i] + X[i + 1]) / 2, y - mm(4.2)], v, 2.0, 'C', 'STA_TABLO')); y -= rh; L([0, y], [X[4], y], 'STA_TABLO'); }
        X.forEach(x => L([x, -rh], [x, y], 'STA_TABLO')); L([0, 0], [0, -rh], 'STA_TABLO'); L([X[4], 0], [X[4], -rh], 'STA_TABLO');
        TX([0, y - mm(4)], 'TS EN 1992-1-1 Tablo 8.1N: Ø ≤ 16 → 4Ø, Ø > 16 → 7Ø', 1.9, 'L');
        B.push({ pafta: 1, spec: D.out, kutu: D.kutu() }); } }
    /* --- temel metraj tablosu --- */
    { const D = yeniCizim(K), r = tablo(D, 0, 0, `${kotS(g.kAlt + g.hr).replace('+', '')} KOTU TEMEL DONATI METRAJI`, DT.temel); B.push({ pafta: 1, spec: D.out, kutu: D.kutu(), kg: r.top }); }
    /* --- döşemeler: donatı planı, kesit + perde birleşim detayı (1/25), tablo --- */
    DT.doseme.forEach(({ d, poz, DP }) => {
      if (!poz.length) return; const D = yeniCizim(K), { mm, REC, TX, PL, POZ, L } = D, cD = c.cD, kn = DP.kenar;
      REC(d.x0, d.y0, d.x1, d.y1, 'STA_KALIP'); if (P.delikCiz) P.delikCiz(D, d, 'donati', poz);
      // altındaki perdeler (görünmeyen: kesikli)
      const bant = (w, yonX) => { if (!w) return; if (yonX) { L([w.a - w.t / 2, d.y0], [w.a - w.t / 2, d.y1], 'STA_GORUNUS', 'HIDDEN'); L([w.a + w.t / 2, d.y0], [w.a + w.t / 2, d.y1], 'STA_GORUNUS', 'HIDDEN'); } else { L([d.x0, w.a - w.t / 2], [d.x1, w.a - w.t / 2], 'STA_GORUNUS', 'HIDDEN'); L([d.x0, w.a + w.t / 2], [d.x1, w.a + w.t / 2], 'STA_GORUNUS', 'HIDDEN'); } };
      bant(kn.L, true); bant(kn.R, true); DP.kesX.forEach(w => bant(w, true)); bant(kn.B, false); bant(kn.T, false); DP.kesY.forEach(w => bant(w, false));
      ['L', 'R', 'B', 'T'].forEach(k2 => { if (kn[k2]) return; const a = k2 === 'L' ? [d.x0, d.y0] : k2 === 'R' ? [d.x1, d.y0] : k2 === 'B' ? [d.x0, d.y0] : [d.x0, d.y1], b = k2 === 'L' ? [d.x0, d.y1] : k2 === 'R' ? [d.x1, d.y1] : k2 === 'B' ? [d.x1, d.y0] : [d.x1, d.y1]; TX([(a[0] + b[0]) / 2 + (k2 === 'R' ? mm(2) : k2 === 'L' ? -mm(2) : 0), (a[1] + b[1]) / 2 + (k2 === 'T' ? mm(2) : k2 === 'B' ? -mm(4) : 0)], 'serbest kenar', 2.0, k2 === 'L' ? 'R' : k2 === 'R' ? 'L' : 'C', 'STA_YAZI', k2 === 'L' || k2 === 'R' ? 90 : 0); });
      const etk = (p, q, rot) => { POZ(q, p.no); TX(rot ? [q[0] + mm(1), q[1] + mm(3.4)] : [q[0] + mm(3.4), q[1] - mm(1)], `${p.adet}Ø${p.F}/${cmi(p.s)} L=${cmi(p.boy)} ${p.yuz === 'kenar' ? 'firkete' : p.yuz}`, 2.2, 'L', 'STA_POZ', rot ? 90 : 0); };
      const dag = (a, b) => { L(a, b, 'STA_OLCU'); for (const q of [a, b]) { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l; L([q[0] - uy * mm(1.2), q[1] + ux * mm(1.2)], [q[0] + uy * mm(1.2), q[1] - ux * mm(1.2)], 'STA_OLCU'); } };
      const dGrup = new Set();
      for (const p of poz) {
        if ((p.yuz === 'alt' || p.tek) && p.net && P.parcala(p.net, p.F, p.ga || 0, p.gb || 0).length > 1) { const key = p.yon + '|' + p.yuz; if (dGrup.has(key)) continue; dGrup.add(key);
          const grp = poz.filter(q => q.yon === p.yon && q.yuz === p.yuz && (q.yuz === 'alt' || q.tek) && q.net === p.net), xd = p.yon === 'x', alt = p.yuz === 'alt';
          const v = xd ? d.y0 + (d.y1 - d.y0) * (alt ? 0.42 : 0.78) : d.x0 + (d.x1 - d.x0) * (alt ? 0.58 : 0.86);
          parcaliCiz(D, grp, xd, xd ? d.x0 + cD : d.y0 + cD, v, p.net, p.ga || 0, p.gb || 0, alt ? 1 : -1, mm(1.6), null); continue; }
        if (p.yuz === 'alt' && p.yon === 'x') { const y = d.y0 + (d.y1 - d.y0) * 0.42, x0 = d.x0 + cD, x1 = d.x1 - cD; PL([[x0, y + mm(1.6)], [x0, y], [x1, y], [x1, y + mm(1.6)]], false, 'STA_DONATI'); segYaz(D, true, x0, x1, y, p.segs[0].a ? p.segs[0].L : 0, p.segs[p.segs.length - 1].a ? p.segs[p.segs.length - 1].L : 0, x1 - x0, 0.75); etk(p, [x0 + (x1 - x0) * 0.25, y + mm(3.2)]); dag([d.x0 + (d.x1 - d.x0) * 0.5, d.y0 + cD], [d.x0 + (d.x1 - d.x0) * 0.5, d.y1 - cD]); }
        else if (p.yuz === 'alt') { const x = d.x0 + (d.x1 - d.x0) * 0.58, y0 = d.y0 + cD, y1 = d.y1 - cD; PL([[x + mm(1.6), y0], [x, y0], [x, y1], [x + mm(1.6), y1]], false, 'STA_DONATI'); segYaz(D, false, y0, y1, x, p.segs[0].a ? p.segs[0].L : 0, p.segs[p.segs.length - 1].a ? p.segs[p.segs.length - 1].L : 0, y1 - y0, 0.7); etk(p, [x - mm(3.2), y0 + (y1 - y0) * 0.12], true); dag([d.x0 + cD, d.y0 + (d.y1 - d.y0) * 0.22], [d.x1 - cD, d.y0 + (d.y1 - d.y0) * 0.22]); }
        else if (p.tek && p.yon === 'x') { const y = d.y0 + (d.y1 - d.y0) * 0.78, x0 = d.x0 + cD, x1 = d.x1 - cD; PL([[x0, y - mm(1.6)], [x0, y], [x1, y], [x1, y - mm(1.6)]], false, 'STA_DONATI'); segYaz(D, true, x0, x1, y, p.ga || 0, p.gb || 0, (p.segs.find(q => q.a === 0) || { L: x1 - x0 }).L, 0.75, -1); etk(p, [x0 + (x1 - x0) * 0.25, y + mm(3.2)]); dag([d.x0 + (d.x1 - d.x0) * 0.75, d.y0 + cD], [d.x0 + (d.x1 - d.x0) * 0.75, d.y1 - cD]); }
        else if (p.tek) { const x = d.x0 + (d.x1 - d.x0) * 0.86, y0 = d.y0 + cD, y1 = d.y1 - cD; PL([[x - mm(1.6), y0], [x, y0], [x, y1], [x - mm(1.6), y1]], false, 'STA_DONATI'); segYaz(D, false, y0, y1, x, p.ga || 0, p.gb || 0, (p.segs.find(q => q.a === 0) || { L: y1 - y0 }).L, 0.7, -1); etk(p, [x + mm(3.2), y0 + (y1 - y0) * 0.15], true); dag([d.x0 + cD, d.y0 + (d.y1 - d.y0) * 0.9], [d.x1 - cD, d.y0 + (d.y1 - d.y0) * 0.9]); }
        else if (p.yuz === 'üst' && p.yon === 'x') { const y = d.y0 + (d.y1 - d.y0) * 0.78; const ciz = (xa, xb) => { PL([[xa, y - mm(1.6)], [xa, y], [xb, y], [xb, y - mm(1.6)]], false, 'STA_DONATI'); }; if (p.ara != null) { ciz(p.ara - p.wt / 2 - p.ic, p.ara + p.wt / 2 + p.ic); etk(p, [p.ara + mm(3), y + mm(3.2)]); D.DM([p.ara + p.wt / 2, y], [p.ara + p.wt / 2 + p.ic, y], 'h', -4, cmi(p.ic)); } else { if (kn.L) ciz(d.x0 + c.cP, kn.L.a + kn.L.t / 2 + p.ic); if (kn.R) ciz(kn.R.a - kn.R.t / 2 - p.ic, d.x1 - c.cP); const xr = kn.L ? kn.L.a + kn.L.t / 2 : kn.R.a - kn.R.t / 2; etk(p, [kn.L ? d.x0 + mm(4) : xr - p.ic, y + mm(3.2)]); D.DM([xr, y], [kn.L ? xr + p.ic : xr - p.ic, y], 'h', -4, cmi(p.ic)); } }
        else if (p.yuz === 'üst') { const x = d.x0 + (d.x1 - d.x0) * 0.86; const ciz = (ya, yb) => { PL([[x - mm(1.6), ya], [x, ya], [x, yb], [x - mm(1.6), yb]], false, 'STA_DONATI'); }; if (p.ara != null) { ciz(p.ara - p.wt / 2 - p.ic, p.ara + p.wt / 2 + p.ic); etk(p, [x + mm(3.2), p.ara + mm(4)], true); D.DM([x, p.ara + p.wt / 2], [x, p.ara + p.wt / 2 + p.ic], 'v', 4, cmi(p.ic)); } else { if (kn.B) ciz(d.y0 + c.cP, kn.B.a + kn.B.t / 2 + p.ic); if (kn.T) ciz(kn.T.a - kn.T.t / 2 - p.ic, d.y1 - c.cP); const yr = kn.B ? kn.B.a + kn.B.t / 2 : kn.T.a - kn.T.t / 2; etk(p, [x + mm(3.2), kn.B ? d.y0 + mm(3) : yr - p.ic], true); D.DM([x, yr], [x, kn.B ? yr + p.ic : yr - p.ic], 'v', 4, cmi(p.ic)); } }
        else if (p.serbest) { const k2 = p.kenar || (p.yon === 'x' ? 'R' : 'T'), q = k2 === 'R' ? [d.x1 - 0.25, d.y0 + (d.y1 - d.y0) * 0.66] : k2 === 'L' ? [d.x0 + 0.25, d.y0 + (d.y1 - d.y0) * 0.66] : k2 === 'T' ? [d.x0 + (d.x1 - d.x0) * 0.3, d.y1 - 0.25] : [d.x0 + (d.x1 - d.x0) * 0.3, d.y0 + 0.25]; PL(k2 === 'R' || k2 === 'L' ? [[q[0] - 0.2, q[1] - mm(1)], [q[0] + 0.2 * (k2 === 'R' ? 1 : -1), q[1] - mm(1)], [q[0] + 0.2 * (k2 === 'R' ? 1 : -1), q[1] + mm(1)], [q[0] - 0.2, q[1] + mm(1)]].map((v, i) => (k2 === 'R' ? v : [2 * q[0] - v[0], v[1]])) : [[q[0] - mm(1), q[1] - 0.2], [q[0] - mm(1), q[1] + 0.2], [q[0] + mm(1), q[1] + 0.2], [q[0] + mm(1), q[1] - 0.2]], false, 'STA_DONATI'); etk(p, k2 === 'R' || k2 === 'L' ? [q[0] - mm(16), q[1] + mm(5)] : [q[0] + mm(4), q[1] - mm(6)]); }
      }
      D.DM([d.x0, d.y1], [d.x1, d.y1], 'h', 10, cmi(d.x1 - d.x0)); D.DM([d.x1, d.y0], [d.x1, d.y1], 'v', 12, cmi(d.y1 - d.y0));
      TX([d.x0, d.y0 - mm(3.5)], 'Döşeme kenarları perdelere ankastre; üst donatı boydan boya tek parça, uçları perdeye gönyeli.', 2.0, 'L');
      const zP = Math.max(d.x1 - d.x0, d.y1 - d.y0) < 6 ? 2 : 1;
      if (zP > 1) { const sk = q => q && [d.x0 + (q[0] - d.x0) * zP, d.y0 + (q[1] - d.y0) * zP]; D.out.forEach(e => { ['a', 'b', 'p'].forEach(k2 => { if (e[k2]) e[k2] = sk(e[k2]); }); if (e.c) e.c = sk(e.c); if (e.pts) e.pts = e.pts.map(sk); }); }
      D.BASLIK([d.x0 + (d.x1 - d.x0) * zP / 2, d.y0 - mm(16)], `${kotS(g.kUst).replace('+', '')} KOTU ${d.ad || 'DÖŞEME'} DONATI PLANI`, 'Ö:1/' + Math.round(K * 1000 / zP));
      B.push({ pafta: 1, spec: D.out, kutu: D.kutu() });
      /* kesit + perde birleşimi (1/25 → çizim ×2): mesnedi en çok olan doğrultuda */
      {
        const E2 = yeniCizim(K), z2 = 2, nX = (kn.L ? 1 : 0) + (kn.R ? 1 : 0) + DP.kesX.length, nY = (kn.B ? 1 : 0) + (kn.T ? 1 : 0) + DP.kesY.length, yX = nX >= nY;
        const u0 = yX ? d.x0 : d.y0, u1 = yX ? d.x1 : d.y1, wA = yX ? kn.L : kn.B, wB = yX ? kn.R : kn.T, ara = yX ? DP.kesX : DP.kesY, t = d.t, U = u => (u - u0) * z2, Z = z => z * z2, Hw = 0.6;
        const { mm: m2, PL: pl, L: ln, TX: tx, POZ: pz, REC: rc } = E2;
        pl([[U(u0), Z(0)], [U(u1), Z(0)], [U(u1), Z(-t)], [U(u0), Z(-t)]], true, 'STA_KALIP');
        const duvarlar = [wA, wB, ...ara].filter(Boolean);
        duvarlar.forEach(w => { rc(U(w.a - w.t / 2), Z(-t - Hw), U(w.a + w.t / 2), Z(-t), 'STA_KALIP'); const yb = Z(-t - Hw); ln([U(w.a - w.t / 2) - m2(2), yb], [U(w.a + w.t / 2) + m2(2), yb], 'STA_GORUNUS'); });
        const pAlt = poz.find(p => p.yuz === 'alt' && p.yon === (yX ? 'x' : 'y')), pAltD = poz.find(p => p.yuz === 'alt' && p.yon !== (yX ? 'x' : 'y')), pUst = poz.filter(p => p.yuz === 'üst' && p.yon === (yX ? 'x' : 'y')), pF = poz.find(p => p.serbest && p.yon === (yX ? 'x' : 'y'));
        const za = -t + cD, zu = -cD;
        if (pAlt) { const a = gonye(t, cD), b = a; pl([[U(u0 + cD), Z(za + a)], [U(u0 + cD), Z(za)], [U(u1 - cD), Z(za)], [U(u1 - cD), Z(za + b)]], false, 'STA_DONATI', pAlt.F, z2); const q = [U(u0 + (u1 - u0) * 0.3), Z(za) - m2(14)]; ln([q[0], Z(za)], q, 'STA_YAZI'); pz([q[0], q[1] - m2(3)], pAlt.no); tx([q[0] + m2(3.4), q[1] - m2(4)], `Ø${pAlt.F}/${cmi(pAlt.s)} alt`, 2.3, 'L', 'STA_POZ'); }
        if (pAltD) for (let u = u0 + cD + 0.05; u < u1 - cD; u += pAltD.s) E2.out.push({ k: 'C', c: [U(u), Z(za + 0.015)], r: m2(0.5), ly: 'STA_DONATI_KESIT' });
        for (const p of pUst) {
          if (p.tek && pUst.some(q => q.tek && q !== p && pUst.indexOf(q) < pUst.indexOf(p))) continue;
          if (p.tek) { const xa = u0 + cD, xb = u1 - cD, cokP = pUst.filter(q => q.tek); pl([[U(xa), Z(zu - p.ga)], [U(xa), Z(zu)], [U(xb), Z(zu)], [U(xb), Z(zu - p.gb)]], false, 'STA_DONATI', p.F, z2); const q = [U(u0 + (u1 - u0) * 0.62), Z(0) + m2(12)]; ln([q[0], Z(zu)], [q[0], q[1] - m2(2.5)], 'STA_YAZI'); pz(q, p.no); tx([q[0] + m2(3.4), q[1] - m2(1)], (cokP.length > 1 ? `Ø${p.F}/${cmi(p.s)} üst — poz ${cokP.map(q => q.no).join('+')} bindirmeli (planda)` : `Ø${p.F}/${cmi(p.s)} L=${cmi(p.boy)} üst (tek parça)`), 2.3, 'L', 'STA_POZ'); if (wA) { const rr = P.bukmeR(p.F) * z2; ln([U(xa) + rr * 0.3, Z(zu) - rr * 0.3], [U(xa) - m2(10), Z(0) + m2(16)], 'STA_YAZI'); tx([U(xa) - m2(11), Z(0) + m2(17)], `Dm=${p.F <= 16 ? 4 : 7}Ø=${P.bukmeCapi(p.F)} mm`, 2.0, 'R'); tx([U(xa) - m2(1.5), Z(zu - p.ga / 2)], cmi(p.ga), 2.0, 'C', 'STA_YAZI', 90); } continue; }
          if (p.ara != null) { const xa = p.ara - p.wt / 2 - p.ic, xb = p.ara + p.wt / 2 + p.ic; pl([[U(xa), Z(zu - 0.1)], [U(xa), Z(zu)], [U(xb), Z(zu)], [U(xb), Z(zu - 0.1)]], false, 'STA_DONATI', p.F, z2); pz([U(p.ara), Z(0) + m2(12)], p.no); ln([U(p.ara), Z(zu)], [U(p.ara), Z(0) + m2(9.5)], 'STA_YAZI'); tx([U(p.ara) + m2(3.4), Z(0) + m2(11)], `Ø${p.F}/${cmi(p.s)} L=${cmi(p.boy)}`, 2.3, 'L', 'STA_POZ'); E2.DM([U(p.ara + p.wt / 2), Z(0)], [U(xb), Z(0)], 'h', 5, cmi(p.ic)); }
          else for (const [w, sgn] of [[wA, 1], [wB, -1]]) { if (!w) continue; const dis = sgn > 0 ? u0 + c.cP : u1 - c.cP, ic = w.a + sgn * w.t / 2 + sgn * p.ic; pl([[U(dis), Z(zu - p.hd)], [U(dis), Z(zu)], [U(ic), Z(zu)], [U(ic), Z(zu - 0.1)]], false, 'STA_DONATI', p.F, z2); const q = [U(w.a + sgn * w.t / 2 + sgn * p.ic * 0.5), Z(0) + m2(12)]; ln([q[0], Z(zu)], [q[0], q[1] - m2(2.5)], 'STA_YAZI'); pz(q, p.no); tx([q[0] + m2(3.4), q[1] - m2(1)], `Ø${p.F}/${cmi(p.s)} L=${cmi(p.boy)}`, 2.3, 'L', 'STA_POZ'); E2.DM([U(w.a + sgn * w.t / 2), Z(0)], [U(ic), Z(0)], 'h', 5, `${cmi(p.ic)} (ln/4)`); if (sgn > 0) { const rr = P.bukmeR(p.F) * z2; ln([U(dis) + rr * 0.3, Z(zu) - rr * 0.3], [U(dis) - m2(10), Z(0) + m2(16)], 'STA_YAZI'); tx([U(dis) - m2(11), Z(0) + m2(17)], `Dm=${p.F <= 16 ? 4 : 7}Ø=${P.bukmeCapi(p.F)} mm`, 2.0, 'R'); } tx([U(dis) + sgn * m2(1.5), Z(zu - p.hd / 2)], cmi(p.hd), 2.0, 'C', 'STA_YAZI', 90); }
        }
        // perde düşey donatısı döşemeye kıvrık (perde tablosundaki poz)
        duvarlar.forEach(w => { const wp = DT.perdeler.find(q => Math.abs((Math.abs(q.w.e[0]) > 0.5 ? q.w.p0[1] : q.w.p0[0]) - w.a) < 0.02 && (Math.abs(q.w.e[0]) > 0.5) === !yX); const pk = wp && wp.poz.find(q => q.yon === 'düşey' && /döşemeye kıvrık/.test(q.parca || '')); for (const sgn of [-1, 1]) { const x = w.a + sgn * (w.t / 2 - c.cP), kk = pk ? pk.ustK : 0.3, dirIn = -sgn; pl([[U(x), Z(-t - Hw + 0.05)], [U(x), Z(zu - 0.012)], [U(x + dirIn * kk), Z(zu - 0.012)]], false, 'STA_DONATI_KESIT', pk ? pk.F : 16, z2); } if (pk && wp) { const j = duvarlar.indexOf(w), q = [U(w.a) + m2(6), Z(-t - Hw * 0.25) - j * m2(5)]; ln([U(w.a + w.t / 2 - c.cP), q[1]], q, 'STA_YAZI'); tx([q[0] + m2(1), q[1] - m2(1)], `${wp.no} poz ${pk.no}: Ø${pk.F}, döşemeye ${cmi(pk.ustK)}`, 2.1, 'L', 'STA_POZ'); } });
        if (pF) { const sgn = !wB ? 1 : -1, xe = sgn > 0 ? u1 : u0; pl([[U(xe - sgn * 0.4), Z(za)], [U(xe - sgn * cD), Z(za)], [U(xe - sgn * cD), Z(zu)], [U(xe - sgn * 0.4), Z(zu)]], false, 'STA_DONATI', pF.F, z2); pz([U(xe) + sgn * m2(6), Z(-t / 2)], pF.no); }
        // ölçü + kot
        E2.DM([U(u1), Z(-t)], [U(u1), Z(0)], 'v', 6, cmi(t)); E2.KOT([U(u1) + m2(14), Z(0)], g.kUst); E2.KOT([U(u1) + m2(14), Z(-t)], g.kUst - t);
        tx([U(u0), Z(-t - Hw) - m2(6)], `pas payı ${cmi(cD)} cm · bindirme çapa göre (Ø12: 70 … Ø26: 140 cm) · döşeme perdelere ankastre`, 2.0, 'L');
        E2.BASLIK([(U(u0) + U(u1)) / 2, Z(-t - Hw) - m2(14)], `${d.ad || 'DÖŞEME'} KESİTİ VE PERDE BİRLEŞİM DETAYI`, 'Ö:1/' + Math.round(K * 1000 / z2));
        B.push({ pafta: 1, spec: E2.out, kutu: E2.kutu() });
      }
      const T2 = yeniCizim(K); tablo(T2, 0, 0, `${kotS(g.kUst).replace('+', '')} KOTU ${d.ad || ''} DÖŞEME DONATI METRAJI`, poz); B.push({ pafta: 1, spec: T2.out, kutu: T2.kutu() });
    });

    /* --- PERDE DONATI DETAYLARI --- */
    DT.perdeler.forEach((pd, i) => {
      const w = pd.w, D = yeniCizim(K), { mm, REC, TX, L, PL, POZ, KOT } = D, cP = c.cP, H0 = w.zB != null ? w.zB - g.kAlt : g.hr, bandA = w.zB != null ? H0 - (w.tD || 0.2) : 0, Ht = (w.zU != null ? w.zU : g.kUst) - g.kAlt, tE = g.tw;
      const x0 = -(w.tA != null ? w.tA : tE) / 2, x1 = w.L + (w.tB != null ? w.tB : tE) / 2; // perde boyunca (aks başından); kısa perdede serbest uçta 0
      // görünüş: radye bandı + perde
      REC(x0 - 0.2, bandA, x1 + 0.2, H0, 'STA_GORUNUS'); REC(x0, H0, x1, Ht, 'STA_KALIP'); /* askıda perdede alt bant = taşıyan döşeme */ if (P.perdeDelikCiz) { try { P.perdeDelikCiz(D, R, pd); } catch (e) { console.error('perde boşluğu', e); } }
      { const tA = w.tA != null ? w.tA : tE, tB = w.tB != null ? w.tB : tE; if (tA) L([x0 + tA, H0], [x0 + tA, Ht], 'STA_GORUNUS', 'HIDDEN'); if (tB) L([x1 - tB, H0], [x1 - tB, Ht], 'STA_GORUNUS', 'HIDDEN'); }
      // donatılar
      const yat = pd.poz.filter(p => p.yon === 'yatay'), dus = pd.poz.filter(p => p.yon === 'düşey'), cir = pd.poz.find(p => p.ciroz);
      yat.filter((p, i) => yat.findIndex(q => q.yuzA === p.yuzA && q.F === p.F && q.s === p.s) === i).forEach((p, k) => { const y = H0 + (Ht - H0) * (0.62 - k * 0.32), xa = x0 + cP, xb = x1 - cP; PL([[xa, y + (p.kanca || 0.2)], [xa, y], [xb, y], [xb, y + (p.kanca || 0.2)]], false, 'STA_DONATI', p.F); POZ([xa + (xb - xa) * 0.42, y + mm(3.4)], p.no); });
      if (P.perdeBindirme) { try { P.perdeBindirme(D, R, pd, x0, x1, H0, Ht); } catch (e) { console.error('perde bindirme', e); } }
      { const yz = [...new Set(dus.map(p => p.yuzA))]; dus.forEach(p => { const j = yz.indexOf(p.yuzA), x = x0 + (x1 - x0) * (0.7 + j * 0.1) + (p.za > 0.5 ? mm(1.6) : 0) * (dus.filter(q => q.yuzA === p.yuzA).indexOf(p) % 2 ? 1 : 0); const pts = []; if (p.fl) pts.push([x - p.fl, p.za]); pts.push([x, p.za], [x, p.zu]); if (p.ustK) pts.push([x - p.ustK, p.zu]); PL(pts, false, 'STA_DONATI', p.F); POZ([x + mm(3.4), (p.za + p.zu) / 2], p.no); }); }
      if (pd.derz) { L([x0 - mm(4), pd.derz], [x1 + mm(4), pd.derz], 'STA_SU', 'DASHED'); TX([x1 + mm(5), pd.derz - mm(1)], 'İnşaat derzi ' + kotS(g.kAlt + pd.derz), 2.2, 'L', 'STA_SU'); TX([x1 + mm(5), pd.derz - mm(4.5)], '(su tutucu bant I-15/4)', 1.9, 'L', 'STA_SU'); }
      { const el = w.tip === 'dis' ? 'Dış perde' : 'Ara perde', t2 = R.tasarim.find(x => x.eleman.startsWith(el)), ek = t2 ? t2.katman.filter(k => !k.sec || !k.sec.ok).map(k => `${k.yon} ${k.yuz}`.toLocaleUpperCase('tr')) : []; if (ek.length) { TX([(x0 + x1) / 2, Ht + mm(44)], `⚠ ${ek.join(', ')} DONATISI HESAPLA SAĞLANAMADI — KESİT YETERSİZ (perde kalınlığını artırın)`, 3.0, 'C', 'STA_UYARI'); } }
      TX([(x0 + x1) / 2, Ht + mm(37)], pd.Hp <= 2 ? 'H ≤ 2.00 m: düşey donatı filizsiz, tek parça gönyeli' : pd.Hp < 6 ? `2.00 < H < 6.00 m: ${w.zB != null ? 'döşeme' : 'temel'} filizi + bindirmeli gövde donatısı` : 'H ≥ 6.00 m: temel filizi + orta (bindirmeli) + üst, ortada inşaat derzi', 2.2, 'C');
      if (cir) { const p = [x0 + (x1 - x0) * 0.25, H0 + (Ht - H0) * 0.8]; for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) D.out.push({ k: 'C', c: [p[0] + a * mm(6), p[1] + b * mm(5)], r: mm(0.8), ly: 'STA_DONATI' }); POZ([p[0] - mm(5), p[1] + mm(8)], cir.no); }
      // su tutucu bant
      TX([x0 - mm(3), H0 + mm(6)], 'Su Tutucu', 2.0, 'R'); TX([x0 - mm(3), H0 + mm(2.5)], 'I-15/4', 2.0, 'R'); L([x0 - mm(2.5), H0 + mm(4)], [x0 + 0.05, H0 + 0.05], 'STA_YAZI');
      // borular / delikler: perde dışından geçen boru varsa (model aktarımı) — kayıt yoksa atla
      // ölçüler + kotlar + akslar
      D.DM([x0, Ht], [x1, Ht], 'h', 8, cmi(x1 - x0)); D.DM([0, Ht], [w.L, Ht], 'h', 14, cmi(w.L)); D.DM([x0, bandA], [x0, H0], 'v', -8, cmi(H0 - bandA)); D.DM([x0, H0], [x0, Ht], 'v', -8, cmi(Ht - H0));
      if (w.zB == null) KOT([x0 - mm(16), 0], g.kAlt, true); KOT([x0 - mm(16), H0], g.kAlt + H0, true); KOT([x0 - mm(16), Ht], g.kAlt + Ht, true);
      L([0, Ht + mm(18)], [0, bandA - mm(4)], 'STA_AKS', 'CENTER'); L([w.L, Ht + mm(18)], [w.L, bandA - mm(4)], 'STA_AKS', 'CENTER'); { const ad2 = v => { if (Math.abs(w.e[0]) > 0.5) { const j = xC.findIndex(q => Math.abs(q - v) < 0.02); return j >= 0 ? String(j + 1) : ''; } const j = yC.findIndex(q => Math.abs(q - v) < 0.02); return j >= 0 ? harf(j) : ''; }, ax = Math.abs(w.e[0]) > 0.5 ? 0 : 1; D.BALON([0, Ht + mm(23)], ad2(w.p0[ax])); D.BALON([w.L, Ht + mm(23)], ad2(w.p0[ax] + w.L)); }
      D.BASLIK([(x0 + x1) / 2, Ht + mm(30)], `${pd.no} Perde (${(w.ad || "").replace(/^\S+ — /, "")})`, ol);
      // açılımlar (perdenin altında; varsa önce 2-2 yatay kesiti)
      let ya = bandA - mm(16); if (P.perdeKesit22) { try { ya -= P.perdeKesit22(D, R, pd, ya); } catch (e) { console.error('2-2 kesiti', e); } }
      for (const p of pd.poz) {
        if (p.ciroz) continue; const s = p.segs, Lm = Math.min(x1 - x0, (s.find(q => Math.abs(q.a) < 1 && q.L > 0.5) || s[0]).L);
        if (p.yon === 'yatay') { const xa = x0 + cP, xb = xa + Lm, a = s[0].a === 90 ? s[0].L : 0, b = s[s.length - 1].a === 90 ? s[s.length - 1].L : 0; PL([[xa, ya + a], [xa, ya], [xb, ya], [xb, ya + b]], false, 'STA_DONATI', p.F); TX([(xa + xb) / 2, ya - mm(3.4)], cmi(s.find(q => Math.abs(q.a) < 1).L), 2.0, 'C'); if (a) TX([xa - mm(1), ya + a / 2], cmi(a), 2.0, 'R', 'STA_YAZI', 90); if (b) TX([xb + mm(3), ya + b / 2], cmi(b), 2.0, 'L', 'STA_YAZI', 90); POZ([xa + (xb - xa) * 0.12, ya + mm(4.2)], p.no); TX([xa + (xb - xa) * 0.12 + mm(3.4), ya + mm(3.2)], `${p.kat === 2 ? '2*' + p.nYuz : p.adet}Ø${p.F}/${cmi(p.s)} L=${cmi(p.boy)}   ${p.yuzA}`, 2.3, 'L', 'STA_POZ'); ya -= mm(14); }
      }
      // düşey açılımlar sağda
      let xd = x1 + mm(26);
      for (const p of dus) { const pts = []; if (p.fl) pts.push([xd - p.fl * 0.6, p.za]); pts.push([xd, p.za], [xd, p.zu]); if (p.ustK) pts.push([xd - Math.max(p.ustK, 0.1), p.zu]); PL(pts, false, 'STA_DONATI', p.F); TX([xd + mm(3), (p.za + p.zu) / 2], `${p.kat === 2 ? '2*' + p.nYuz : p.adet}Ø${p.F}/${cmi(p.s)} L=${cmi(p.boy)}  ${p.yuzA}`, 2.3, 'C', 'STA_POZ', 90); POZ([xd, p.za - mm(5)], p.no); TX([xd - mm(1.5), (p.za + p.zu) / 2], cmi(p.Lv), 2.0, 'C', 'STA_YAZI', 90); TX([xd + mm(6.5), (p.za + p.zu) / 2], p.parca || '', 1.9, 'C', 'STA_YAZI', 90);
        if (p.za > 0.3) D.DM([xd, p.za], [xd, Math.min(p.za + p.lap, p.zu)], 'v', -4, `${cmi(p.lap)}`); xd += mm(p.za > 0.3 ? 20 : 16); }
      // 1-1 kesiti (perde kalınlığı yönünde)
      const kx = xd + mm(20), t = w.t; REC(kx - 0.35, bandA, kx + t + 0.35, H0, 'STA_KALIP'); REC(kx, H0, kx + t, Ht, 'STA_KALIP');
      /* 1-1 kesiti: düşey parçalar (filiz / gövde / üst) her yüzde ayrı, bindirmeleri görünür; yatay çubuk noktaları; poz yazıları AutoCAD kılavuz okuyla (LEADER) */
      { const xl = kx + cP, xr = kx + t - cP, yuzX = yA => (/iç-dış/.test(yA) ? [[xl, 1], [xr, -1]] : /^iç|2$/.test(yA) ? [[xr, -1]] : [[xl, 1]]), asz = mm(2.2);
        const ok = (tip, sg, dz, ust, alt, no) => { const kir = [tip[0] - sg * mm(9), tip[1] + dz], son = [kir[0] - sg * mm(17), kir[1]]; D.out.push({ k: 'LD', pts: [tip, kir, son], asz, ly: 'STA_YAZI' }); TX([(kir[0] + son[0]) / 2, kir[1] + mm(1)], ust, 2.0, 'C', 'STA_POZ'); if (alt) TX([(kir[0] + son[0]) / 2, kir[1] - mm(3)], alt, 1.8, 'C', 'STA_YAZI'); POZ([son[0] - sg * mm(3.2), son[1]], no); };
        const sira = { 1: 0, '-1': 0 };
        dus.forEach(p => yuzX(p.yuzA).forEach(([x, sg]) => { const xx = x + (p.za > 0.3 ? sg * mm(0.9) : 0), pts = []; if (p.fl) pts.push([xx + sg * p.fl, p.za]); pts.push([xx, p.za], [xx, p.zu]); if (p.ustK) pts.push([xx + sg * Math.min(p.ustK, t - 2 * cP), p.zu]); PL(pts, false, 'STA_DONATI', p.F);
          const k = sira[sg]++, zm = Math.max(H0 + 0.1, Math.min(p.zu - 0.1, p.za + (p.zu - p.za) * (p.za > 0.3 ? 0.55 : 0.5))); ok([xx, zm], sg, -mm(4 + 7 * k), `Ø${p.F}/${cmi(p.s)}`, p.parca ? p.parca.replace(/ —.*$/, '') : '', p.no);
          if (p.za > 0.3) D.DM([xx + sg * mm(4), p.za], [xx + sg * mm(4), Math.min(p.za + p.lap, p.zu)], 'v', 0, cmi(p.lap)); }));
        const yy = yat[0]; if (yy) for (let y = H0 + 0.05; y < Ht - cP; y += yy.s) for (const x of [xl + 0.02, xr - 0.02]) D.out.push({ k: 'C', c: [x, y], r: mm(0.5), ly: 'STA_DONATI_KESIT' });
        yat.filter((p, i) => yat.findIndex(q => q.yuzA === p.yuzA && q.F === p.F && q.s === p.s) === i).forEach((p, j) => yuzX(p.yuzA).forEach(([x, sg]) => { const y0 = H0 + 0.05, zz = y0 + Math.round(((Ht - H0) * (0.9 - 0.06 * j) - 0.05) / p.s) * p.s; ok([x + sg * 0.02, zz], sg, mm(7), `Ø${p.F}/${cmi(p.s)}`, 'yatay', p.no); }));
        const Fd = (dus[0] || { F: 16 }).F; TX([kx + t / 2, Ht + mm(14)], `Dm=${Fd <= 16 ? 4 : 7}Ø=${P.bukmeCapi(Fd)} mm`, 1.9, 'C'); }
      if (pd.derz) { L([kx - mm(3), pd.derz], [kx + t + mm(3), pd.derz], 'STA_SU', 'DASHED'); L([kx + t / 2, pd.derz - 0.07], [kx + t / 2, pd.derz + 0.07], 'STA_SU'); }
      D.DM([kx, Ht], [kx + t, Ht], 'h', 6, cmi(t)); KOT([kx + t + mm(14), Ht], g.kUst); KOT([kx + t + mm(14), H0], g.kAlt + H0); KOT([kx + t + mm(14), bandA], g.kAlt + bandA);
      D.BASLIK([kx + t / 2, bandA - mm(12)], '1-1 KESİTİ', ol);
      // perde çirozu kutusu
      if (cir) { const bx = kx - mm(8), by = -mm(60), Lc = cir.Lc || w.t, kc = cir.kanca || 0.1; REC(bx, by, bx + mm(42), by + mm(30), 'STA_TABLO'); TX([bx + mm(21), by + mm(25.5)], 'Çiroz', 2.5, 'C', 'STA_BASLIK'); TX([bx + mm(21), by + mm(21.5)], `d=${cmi(w.t)}`, 2.0, 'C'); const ca = bx + mm(10), cb = bx + mm(32), cy = by + mm(15), k = mm(3.5); PL([[ca + k * 0.7, cy - k * 0.7], [ca, cy], [cb, cy], [cb, cy - k]], false, 'STA_DONATI'); TX([(ca + cb) / 2, cy + mm(1)], cmi(Lc), 2.0, 'C'); TX([ca - mm(0.5), cy - mm(2.6)], cmi(kc), 1.8, 'R', 'STA_YAZI', -45); TX([cb + mm(2.6), cy - k / 2], cmi(kc), 1.8, 'C', 'STA_YAZI', 90); POZ([bx + mm(36), by + mm(4.5)], cir.no); TX([bx + mm(3), by + mm(8)], `${cir.adet}Ø${cir.F}  L=${cmi(cir.boy)}`, 2.2, 'L', 'STA_POZ'); TX([bx + mm(3), by + mm(3.5)], `${Math.round(1 / ((cir.s || 0.5) * (cir.s || 0.5)) * 10) / 10} adet/m²`, 2.0, 'L'); }
      B.push({ pafta: 2 + i, spec: D.out, kutu: D.kutu() });
      const T2 = yeniCizim(K); tablo(T2, 0, 0, `${pd.no} PERDESİ DONATI METRAJI`, pd.poz); B.push({ pafta: 2 + i, spec: T2.out, kutu: T2.kutu() });
    });
    if (P.paftaEk) { try { P.paftaEk({ R, K, B, DT, yeniCizim }); } catch (e) { console.error('pafta ek blokları', e); } } // ör. perspektifler
    return { B, DT };
  };

  /* ======================= NOTLAR + ANTET ======================= */
  P.NOTLAR_DSI = [
    'Ölçüler yerinde kontrol edildikten sonra imalat yapılacaktır.', 'Projelerde: kotlar "m", ölçüler "cm", boru çapları "mm" olarak verilmiştir.', 'Kütle ve mesnet betonları ile grobetonların beton sınıfı "C16/20", eğim betonu "300 doz".',
    'BETON SINIFI: Su tutucu yapılarda {BETON} WR (sülfata dayanıklı çimentolu), su tutucu olmayan (bina tipi) yapılarda C30/37 olacaktır.', 'ÇELİK SINIFI: {CELIK} olacaktır. Çelik konstrüksiyon malzeme kalitesi: "St.37/2".',
    'Kazı şev eğimleri "1/n" alınmış olup "n" değeri jeolojik raporda verilen ve zemine bağlı olarak değişen değerlere uygun olarak kontrol mühendisince yerinde belirlenecektir.', 'Yapıların yapılacağı zeminlerin durumları ile ilgili olarak alınacak önlemler için jeoteknik etüt raporuna bakınız.',
    'Kazı sırasında yeraltı suyu çıkarsa kontrol mühendisine haber verilecek ve çıkan yeraltı suyu pompaj ile uzaklaştırılacaktır.', 'Kazı sonucunda zeminin, zemin etüt raporunda ve proje tasarım kriterlerinde belirtilen nitelikte olmadığı görüldüğü takdirde ilgililere bilgi verilecektir.',
    'Zeminde betona zararlı kimyasal maddelerin bulunması durumunda TS 3440\'a göre önlem alınacaktır.', 'Dolgu malzemesinin sıkışma oranı minimum %95 olmalıdır. Proje sahasında yapılacak dolguda minimum %95 proktor sıklığı ve minimum Es=40 MPa deformasyon modülü değeri aranacaktır.',
    'Tüm borular sızdırmazlık yakaları kaynatılarak beton dökülmeden önce yerleştirilecektir. Boru deliklerinin beton kırılarak açılmasına asla izin verilmeyecektir.', 'Kalıp hazırlanması, donatının yerleştirilmesi, betonun dökülmesi sertifikalı elemanlar tarafından, şantiye şefi inşaat mühendisinin denetiminde TS 500 kurallarına uygun yapılacaktır.',
    'Kalıp hazırlanırken boru delikleri mekanik projesine göre bırakılacaktır.', 'Kalıp hazırlanırken mimari, betonarme, elektrik ve mekanik projeleri karşılaştırılacak, çelişkili durum varsa şantiye yetkilisine bildirilecek, uyum sağlandıktan sonra imalat yapılacaktır.',
    'Beton dökülürken vibratör kullanılacaktır.', 'İklim durumuna göre şantiye şefinin gözetiminde betonun periyodik olarak sulanması sağlanacaktır.', 'Su ile temas eden yüzeylerde "F3", su ile temas etmeyen yüzeylerde "F1" beton yüzey sınıfı sağlanmalıdır.',
    'Kullanılacak çelik donatı TSE belgeli olacaktır. Mukavemet değerleri laboratuvarda test edilmeden imalata geçilmeyecektir.', 'Beton, beton santrallerinde TS EN 206\'ya uygun şekilde imal edilecek ve TS 1247 ve TS 1248\'e uygun dökülecektir.',
    'Aksi belirtilmedikçe demirlerde bindirme (filiz) boyları Ø12: 70, Ø14: 80, Ø16: 90, Ø18: 100, Ø20: 110, Ø22: 120, Ø24: 130, Ø26: 140 cm\'den az alınmayacaktır. Perdelerin yatay donatılarının bindirmeli eklerinde 90 derecelik kanca yapılacaktır (TBDY 2018).', 'Döşeme ve radye temel üst donatıları kesinlikle üstte tutulmalıdır. Donatıya basılmamalı ve üstte tutulması için sehpa önlemi alınmalıdır.',
    'Beton mukavemeti gerekli değere ulaştığında şantiye şefinin izni ile kalıp sökülecektir.', 'Kullanılacak yalıtım ve detayları için ilgili mimari paftaya bakınız.', 'Aksi belirtilmedikçe temel planı üstten bakılarak, kalıp planları alttan bakılarak çizilmiştir.',
    'Derzler betonarme projesi esas alınarak teşkil edilecektir. Derz detayları için "Derz Detayları" paftasına bakınız.', 'Kaide betonları imalatçı firma tarafından projelendirilecektir.', 'Donatı kanca ve gönyeleri merdane ile bükülecektir. Bükme merdane çapı Ø ≤ 16 için 4Ø, Ø > 16 için 7Ø\'dir (TS EN 1992-1-1 Tablo 8.1N); sıcak bükme ve düzeltme yapılmayacaktır.', 'Perde düşey donatıları: yüksekliği 2.00 m\'ye kadar olan perdelerde filizsiz, tek parça ve gönyeli; 2.00 m – 6.00 m arasında temel filizi üzerine bindirmeli; 6.00 m ve üzerinde temel filizi, orta ve üst (döşemeye kadar) olmak üzere üç parça yapılacak, perde ortasında su tutucu bantlı inşaat derzi teşkil edilecektir. Bindirme boyları çapa göre "Demirlerde Bindirme Boyları" tablosundadır (Ø12: 70 … Ø26: 140 cm).'];
  const notSutunu = (D, x0, yTop, gen, R, rp) => {
    const { mm, TX, L } = D, S = R.S, c = S.mal, z = S.zemin, d = S.dep; let y = yTop; const satir = mm(2.9), maxC = Math.floor(gen / 1.35);
    const sar = s => { if (window.DIL) s = DIL.t(s); const out = []; let cur = ''; for (const w of s.split(' ')) { if ((cur + ' ' + w).trim().length > maxC) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out; };
    const bas = s => { y -= mm(6); TX([x0, y], s, 3.4, 'L', 'STA_BASLIK'); L([x0, y - mm(1.1)], [x0 + mm(s.length * 2.2), y - mm(1.1)], 'STA_BASLIK'); y -= mm(3); };
    bas('GENEL NOTLAR :');
    P.NOTLAR_DSI.forEach((n, i) => { const t = n.replace('{BETON}', 'C' + c.fck + '/' + (c.fck + (c.fck >= 35 ? 10 : 7))).replace('{CELIK}', 'B ' + c.fyk + 'C').replace('{LB}', R.MAL.lb); sar(`${i + 1} – ${t}`).forEach((s, k) => { y -= satir; TX([x0 + (k ? mm(4) : 0), y], s, 1.9, 'L'); }); });
    bas('PASPAYI'); [['Döşemelerde', c.cD], ['Perdelerde', c.cP], ['Temelde', c.cR], ['Toprak ve su ile temas eden yüzeyler', Math.max(c.cP, c.cR)]].forEach(([a, b]) => { y -= mm(3.3); TX([x0 + mm(2), y], '• ' + a, 2.1, 'L'); TX([x0 + mm(70), y], `: ${String(+(b * 100).toFixed(1))} cm`, 2.1, 'L'); });
    bas('YAPI MALZEME BİLGİSİ'); [['BETON SINIFI', `: C ${c.fck} WR (Sülfata dayanıklı çimentolu)`], ['ÇELİK SINIFI', `: B ${c.fyk}C`]].forEach(([a, b]) => { y -= mm(3.3); TX([x0, y], a, 2.1, 'L'); TX([x0 + mm(28), y], b, 2.1, 'L'); });
    bas('ZEMİN PARAMETRELERİ'); [['Zemin Sınıfı', rp.zs || '—'], ['Zemin Emniyet Gerilmesi', (z.sig / 9.80665).toFixed(1) + ' t/m²'], ['Zemin Yatak Katsayısı', (z.kw / 9.80665).toFixed(2) + ' t/m³'], ...(rp.SS ? [['• Ss / S1 (' + (rp.dd || 'DD2') + ')', `${rp.SS} / ${rp.S1}`]] : []), ['• SDs' + (rp.SD1 || (rp.S1 && rp.F1) ? ' / SD1' : ''), `${d.SDS}${rp.SD1 || (rp.S1 && rp.F1) ? ' / ' + (+rp.SD1 || rp.S1 * rp.F1).toFixed(3) : ''}`]].forEach(([a, b]) => { y -= mm(3.3); TX([x0, y], a, 2.1, 'L'); TX([x0 + mm(38), y], ': ' + b, 2.1, 'L'); });
    return y;
  };
  const antet = (D, x0, y0, W, Hh, info) => { // (x0,y0) sol alt köşe
    const { mm, L, TX, REC, CI } = D, X = v => x0 + mm(v), Y = v => y0 + mm(v), wmm = W / D.mm(1), x1 = x0 + W;
    const hl = (yy, xa = 0, xb = wmm) => L([X(xa), Y(yy)], [X(xb), Y(yy)], 'STA_TABLO'), vl = (xx, ya, yb) => L([X(xx), Y(ya)], [X(xx), Y(yb)], 'STA_TABLO');
    REC(x0, y0, x1, y0 + Hh, 'STA_TABLO'); const H = Hh / D.mm(1);
    // alt blok: yapan / çizen / kontrol / tarih / arşiv (5 × 9 mm) + ölçek + yüklenici + resim no
    const sat = [['ARŞİV NO', info.arsiv || '', ''], ['TARİH', info.tarih || '', ''], ['KONTROL', info.kontrol || '', info.kontrolUnv || ''], ['ÇİZEN', info.cizen || '', info.cizenUnv || ''], ['YAPAN', info.yapan || '', info.yapanUnv || '']];
    sat.forEach((s, i) => { hl(9 * (i + 1), 0, 0.62 * wmm); TX([X(1.5), Y(9 * i + 3.2)], s[0], 2.0, 'L', 'STA_TABLO'); TX([X(17), Y(9 * i + 3.2)], s[1], 2.0, 'L', 'STA_TABLO'); TX([X(45), Y(9 * i + 3.2)], s[2], 1.8, 'L', 'STA_TABLO'); });
    vl(15.5, 0, 45); vl(43.5, 9, 45); vl(0.62 * wmm - 20, 0, 45); vl(0.62 * wmm, 0, 45); TX([X(0.62 * wmm - 10), Y(13)], 'ÖLÇEK', 2.0, 'C', 'STA_TABLO'); TX([X(0.62 * wmm - 10), Y(5)], info.olcek, 3.0, 'C', 'STA_TABLO');
    TX([X(0.62 * wmm + 1.5), Y(41)], 'YÜKLENİCİ', 2.0, 'L', 'STA_TABLO'); TX([X(0.81 * wmm), Y(30)], info.yuklenici || '', 3.2, 'C', 'STA_BASLIK'); hl(14, 0.62 * wmm, wmm); TX([X(0.62 * wmm + 1.5), Y(11)], 'RESİM NO :', 1.8, 'L', 'STA_TABLO'); TX([X(0.81 * wmm), Y(4)], info.resimNo || '', 3.0, 'C', 'STA_TABLO');
    hl(45);
    // yapı kodu + adı + pafta adı (40 mm) + S STATİK kutusu
    vl(wmm - 26, 45, 85); TX([X(wmm - 13), Y(66)], 'S', 14, 'C', 'STA_BASLIK'); TX([X(wmm - 13), Y(53)], 'STATİK', 2.8, 'C', 'STA_BASLIK');
    TX([X((wmm - 26) / 2), Y(76)], info.kod || '', 4.2, 'C', 'STA_BASLIK'); TX([X((wmm - 26) / 2), Y(66)], info.yapi || '', 3.6, 'C', 'STA_BASLIK'); TX([X((wmm - 26) / 2), Y(55)], info.pafta || '', 3.4, 'C', 'STA_BASLIK');
    hl(85);
    // proje adı (30 mm)
    (info.proje || '').split('\n').slice(0, 3).forEach((s, i, a) => TX([X(wmm / 2), Y(108 - i * 8 - (3 - a.length) * 4)], s, 3.6, 'C', 'STA_BASLIK')); hl(115);
    // incelendi / tasvip olunur (45) — bölge satırı (9) — incelendi / tasdik olunur (55)
    vl(wmm * 0.44, 115, 160); TX([X(1.5), Y(156)], 'İNCELENDİ', 2.0, 'L', 'STA_TABLO'); TX([X(wmm * 0.44 + 3), Y(156)], 'TASVİP OLUNUR', 2.0, 'L', 'STA_TABLO'); hl(160);
    TX([X(1.5), Y(163)], info.bolge || '', 2.6, 'L', 'STA_TABLO'); TX([X(wmm - 2), Y(163)], info.bolgeSehir || '', 2.6, 'R', 'STA_TABLO'); hl(169);
    vl(wmm * 0.44, 169, 224); TX([X(1.5), Y(220)], 'İNCELENDİ', 2.0, 'L', 'STA_TABLO'); TX([X(wmm * 0.44 + 3), Y(220)], 'TASDİK OLUNUR', 2.0, 'L', 'STA_TABLO'); hl(224);
    // idare (32 mm): logo + iki satır + şehir
    { const lc = [X(17), Y(240)]; D.out.push({ k: 'C', c: lc, r: mm(9), ly: 'STA_TABLO' }); TX([lc[0], lc[1] - mm(2)], info.logo || 'DSİ', 5, 'C', 'STA_BASLIK'); (info.idare || '').split('\n').slice(0, 2).forEach((s, i) => TX([X(32), Y(245 - i * 6)], s, 3.4, 'L', 'STA_TABLO')); TX([X(wmm - 2), Y(228)], info.sehir || 'ANKARA', 3.2, 'R', 'STA_TABLO'); }
    hl(256);
    // revizyon tablosu
    const rv = 262; for (let k = 0; k < 4; k++) hl(rv + k * 7); TX([X(8), Y(rv + 2)], 'YAPAN', 1.8, 'C', 'STA_TABLO'); TX([X(27), Y(rv + 2)], 'TARİH', 1.8, 'C', 'STA_TABLO'); TX([X(wmm * 0.55), Y(rv + 2)], 'AÇIKLAMA', 1.8, 'C', 'STA_TABLO'); TX([X(wmm - 4), Y(rv + 2)], 'R', 1.8, 'C', 'STA_TABLO');
    vl(17, rv, rv + 28); vl(37, rv, rv + 28); vl(wmm - 8, rv, rv + 28); L([X(0), Y(rv)], [X(0), Y(rv + 28)], 'STA_TABLO'); L([X(wmm), Y(rv)], [X(wmm), Y(rv + 28)], 'STA_TABLO'); hl(rv + 28);
    return Y(rv + 28);
  };
  P.ANTET_YUK = 290; // mm
  P._dsi = { yeniCizim: (...a) => yeniCizim(...a), antet: (...a) => antet(...a), kaydir: (...a) => kaydir(...a), tablo: (...a) => tablo(...a), notSutunu: (...a) => notSutunu(...a), AG }; // ek pafta modülleri için

  /* ======================= PAFTALAR ======================= */
  P.paftalarDsi = (R, olcek, rp, pr) => {
    const K = (olcek || 50) / 1000, mm = v => v * K, { B } = bloklar(R, K);
    const S = R.S, ad = (pr.ad || 'YAPI').toLocaleUpperCase('tr'), kod = rp.kod || '';
    const adlar = ['KALIP PLANLARI VE KESİTLERİ', `TEMEL${(S.geo.doseme || []).length ? ' VE DÖŞEME' : ''} DONATI DETAYLARI`, ...R.GM.walls.map((w, i) => `${perdeNo(w, i)} PERDE DONATI DETAYI`), ...(R.kisa || []).map(k => `${k.kp.ad} KISA PERDE DONATI DETAYI`)];
    const nP = Math.max(...B.map(b => b.pafta)) + 1, PH = 594, MARJ = { l: 20, r: 10, t: 10, b: 10 }, SUT = 185, IC = PH - MARJ.t - MARJ.b - 8;
    const paftalar = [];
    for (let pi = 0; pi < nP; pi++) {
      const bl = B.filter(b => b.pafta === pi); if (!bl.length) continue;
      // sütun yerleşimi (yukarıdan aşağıya; taşarsa yeni sütun)
      let cols = [], cur = { w: 0, h: 0, items: [] };
      for (const b of bl) { const w = (b.kutu[2] - b.kutu[0]) / K + 12, h = (b.kutu[3] - b.kutu[1]) / K + 10; if (cur.items.length && cur.h + h > IC) { cols.push(cur); cur = { w: 0, h: 0, items: [] }; } cur.items.push({ b, w, h, y: cur.h }); cur.h += h; cur.w = Math.max(cur.w, w); }
      cols.push(cur);
      const cizW = cols.reduce((s, c) => s + c.w, 0), PW = Math.max(420, MARJ.l + 8 + cizW + SUT + MARJ.r + 6);
      const D = yeniCizim(K); let spec = [];
      // çerçeve (kağıt koordinatı → model: x*K)
      const fx0 = mm(MARJ.l), fy0 = mm(MARJ.b), fx1 = mm(PW - MARJ.r), fy1 = mm(PH - MARJ.t);
      D.REC(fx0, fy0, fx1, fy1, 'STA_CERCEVE'); D.REC(0, 0, mm(PW), mm(PH), 'STA_TABLO');
      const sx = fx1 - mm(SUT); D.L([sx, fy0], [sx, fy1], 'STA_CERCEVE');
      // bloklar
      let cx = fx0 + mm(6);
      for (const col of cols) { for (const it of col.items) { const b = it.b, tx = cx + (mm(col.w) - (b.kutu[2] - b.kutu[0])) / 2 - b.kutu[0], ty = fy1 - mm(6 + it.y) - (b.kutu[3] - b.kutu[1]) - b.kutu[1]; spec = spec.concat(kaydir(b.spec, tx, ty)); } cx += mm(col.w); }
      // not sütunu + antet
      const info = { idare: rp.idare || 'DEVLET SU İŞLERİ GENEL MÜDÜRLÜĞÜ\nİÇMESUYU VE ATIKSU DAİRESİ BAŞKANLIĞI', sehir: rp.idareSehir || 'ANKARA', bolge: rp.bolge || '', bolgeSehir: rp.bolgeSehir || '', proje: rp.projeAd || (pr.tesis || '').toLocaleUpperCase('tr'), kod, yapi: ad, pafta: adlar[pi] || '', yapan: rp.yapan || pr.hazirlayan || '', yapanUnv: rp.yapanUnv || '', cizen: rp.cizen || '', cizenUnv: rp.cizenUnv || '', kontrol: rp.kontrolAd || pr.kontrol || '', kontrolUnv: rp.kontrolUnv || '', tarih: rp.paftaTarih || pr.tarih || '', arsiv: rp.arsiv || '', olcek: '1/' + Math.round(olcek || 50), yuklenici: rp.yuklenici || '', resimNo: (rp.resimNo || 'STA') + '-' + String(pi + 1).padStart(2, '0'), logo: rp.logo || 'DSİ' };
      antet(D, sx + mm(2), fy0 + mm(2), mm(SUT - 4), mm(P.ANTET_YUK), info);
      notSutunu(D, sx + mm(4), fy1 - mm(2), SUT - 8, R, rp);
      spec = spec.concat(D.out);
      paftalar.push({ ad: adlar[pi], spec, pw: PW, ph: PH, olcek: olcek || 50, resimNo: info.resimNo });
    }
    return paftalar;
  };

  P.KATMANLAR_DSI = Object.assign({}, P.KATMANLAR, {
    STA_TARAMA: { c: 8, lt: 'CONTINUOUS', lw: 13 }, STA_UYARI: { c: 1, lt: 'CONTINUOUS', lw: 35 }, STA_CERCEVE: { c: 7, lt: 'CONTINUOUS', lw: 70 }, STA_TABLO_DONATI: { c: 1, lt: 'CONTINUOUS', lw: 25 },
    STA_KALIP: { c: 7, lt: 'CONTINUOUS', lw: 50 }, STA_DONATI: { c: 1, lt: 'CONTINUOUS', lw: 50 }, STA_TABLO: { c: 7, lt: 'CONTINUOUS', lw: 25 },
  });

  /* ======================= 3B DONATI (DSİ detaylandırmasıyla) =======================
     Paftadaki pozların aynısı: radye U çubukları (12 m'den uzunlar bindirmeli parçalar), perde temel filizleri + bindirmeli gövde / orta / üst
     parçalar, döşemeye kıvrılan üst uçlar, yatay U'lar, döşeme alt / kenar mesnet / ara mesnet / firkete. Tüm gönyeler bükme yarıçapıyla. */
  P.donati3BDsi = (R) => {
    const S = R.S, g = S.geo, GM = R.GM, c = S.mal, lb = R.MAL.lb, DT = P.detayDsi(R), out = [], zA = g.kAlt, zT = g.kAlt + g.hr, zU = g.kUst;
    const adim = (a, b, s) => { if (b <= a) return [a]; const n = Math.max(1, Math.round((b - a) / s)), r = []; for (let i = 0; i <= n; i++) r.push(a + (b - a) * i / n); return r; };
    const grup = (p, eleman) => { const o = { poz: p.no, F: p.F, s: p.s, eleman, tanim: [p.ad, p.parca, p.yuzA].filter(Boolean).join(' · '), bars: [] }; out.push(o); return o; };
    const bk = (o, pts) => o.bars.push(P.bukumlu(pts, P.bukmeR(o.F), 3));
    const parcalar = (a, b, F, hA, hB) => { const pr = P.parcala(b - a, F, hA || 0, hB || 0); return pr.map((q, k) => [a + q[0], a + q[1], k === 0, k === pr.length - 1]); };
    /* radye */
    { const cR = c.cR, X0 = GM.R.x0 + cR, X1 = GM.R.x1 - cR, Y0 = GM.R.y0 + cR, Y1 = GM.R.y1 - cR, F1 = q => (q ? q.F / 1000 : 0.012);
      const aX = DT.temel.find(p => p.yon === 'x' && p.yuz === 'alt'), aY = DT.temel.find(p => p.yon === 'y' && p.yuz === 'alt'), uX = DT.temel.find(p => p.yon === 'x' && p.yuz === 'üst'), uY = DT.temel.find(p => p.yon === 'y' && p.yuz === 'üst');
      const kat = (p, z, yukari) => { if (!p) return; const o = grup(p, 'Temel'), leg = (p.segs.find(q => q.a === 90) || { L: 0.3 }).L, z2 = yukari ? z + leg : z - leg, xd = p.yon === 'x';
        for (const v of adim(xd ? Y0 : X0, xd ? Y1 : X1, p.s)) parcalar(xd ? X0 : Y0, xd ? X1 : Y1, p.F, leg, leg).forEach(([a, b, sa, sb], k) => { const ov = (k % 2) * p.F / 1000, P3 = (u, zz) => (xd ? [u, v + ov, zz] : [v + ov, u, zz]); bk(o, [...(sa ? [P3(a, z2)] : []), P3(a, z), P3(b, z), ...(sb ? [P3(b, z2)] : [])]); }); };
      kat(aX, zA + cR + F1(aX) / 2, true); kat(aY, zA + cR + F1(aX) + F1(aY) / 2, true); kat(uX, zT - cR - F1(uX) / 2, false); kat(uY, zT - cR - F1(uX) - F1(uY) / 2, false); }
    /* perdeler */
    for (const pd of DT.perdeler) { if (pd.kisa) continue; // kısa perdeler: statik-kisaperde.js
      const w = pd.w, t = w.t, cP = c.cP, tE = g.tw, Pt = (s, o, z) => [w.p0[0] + w.e[0] * s + w.n[0] * o, w.p0[1] + w.e[1] * s + w.n[1] * o, z], dis = w.tip === 'dis';
      const sA = -tE / 2 + cP, sB = w.L + tE / 2 - cP, dus = pd.poz.filter(p => p.yon === 'düşey'), Fv = dus.length ? dus[0].F / 1000 : 0.016;
      const yuzler = p => (p.yuzA === 'iç-dış' ? [1, -1] : /dış|yüz 1/.test(p.yuzA) ? [1] : [-1]); // +n yönü: dış (yüz 1)
      const ar = (pd.dsm && pd.dsm.ar) || [], icinde = s2 => ar.find(r => s2 >= r[0] - 1e-6 && s2 <= r[1] + 1e-6);
      for (const p of pd.poz.filter(q => q.yon === 'yatay')) { const o = grup(p, pd.no + ' perde'), kan = p.kanca || ((p.segs.find(q => q.a === 90) || { L: 0.2 }).L); const grY = pd.poz.filter(q => q.yon === 'yatay' && q.yuzA === p.yuzA && q.F === p.F && q.s === p.s), pIY = grY.indexOf(p), benY = (j, n) => grY.length < 2 || (j === 0 ? pIY === 0 : j === n - 1 ? pIY === grY.length - 1 : pIY === 1);
        for (const sg of yuzler(p)) { const off = sg * (t / 2 - cP - Fv - p.F / 2000), ic = -1, uc = tE / 2 - cP - Fv - p.F / 2000 - (sg < 0 && dis ? p.F / 1000 : 0), ya = -uc, yb = w.L + uc; // uçlar dik perdenin düşey çubuklarının içinde
          for (const z of adim(zT + 0.05, zU - cP - 0.03, p.s)) parcalar(ya, yb, p.F, kan, kan).forEach(([a, b, sa, sb], j, prY) => { if (!benY(j, prY.length)) return; const dz = (j % 2) * p.F / 1000; bk(o, [...(sa ? [Pt(a, off + ic * kan, z + dz)] : []), Pt(a, off, z + dz), Pt(b, off, z + dz), ...(sb ? [Pt(b, off + ic * kan, z + dz)] : [])]); }); } }
      for (const p of dus) { const o = grup(p, pd.no + ' perde'), kiv = /döşemeye kıvrık/.test(p.parca || ''), taban = (p.parca || '').replace(' — döşemeye kıvrık', ''), esi = dus.some(q => q !== p && q.yuzA === p.yuzA && (q.parca || '').replace(' — döşemeye kıvrık', '') === taban), ilk = p.za < 0.3;
        for (const sg of yuzler(p)) { const off = sg * (t / 2 - cP - p.F / 2000), za = zA + p.za, zu = zA + p.zu;
          const kose = dis && Math.abs(w.e[0]) > 0.5, va = kose ? -(tE / 2 - cP - p.F / 2000) : tE / 2 + 0.05, vb = kose ? w.L + (tE / 2 - cP - p.F / 2000) : w.L - tE / 2 - 0.05;
          for (const s0 of adim(va, vb, p.s)) { const r = icinde(s0); if (esi && (kiv ? !r : !!r)) continue; const s1 = s0 + (ilk ? 0 : p.F / 1000 * 1.1), pts = [];
            if (p.fl) pts.push(Pt(s1, off - (dis ? 1 : sg) * p.fl, za)); pts.push(Pt(s1, off, za), Pt(s1, off, zu));
            if (p.ustK) pts.push(Pt(s1, off - sg * p.ustK, zu));
            bk(o, pts); } } }
    }
    /* döşemeler */
    for (const { d, poz, DP } of DT.doseme) {
      const cD = c.cD, kn = DP.kenar, zb = zU - d.t + cD, zt = zU - cD, hk = d.t - 2 * cD;
      for (const p of poz) { const o = grup(p, 'Döşeme ' + (d.ad || '')), F = p.F / 1000, xd = p.yon === 'x';
        const v0 = xd ? d.y0 + cD : d.x0 + cD, v1 = xd ? d.y1 - cD : d.x1 - cD, P3 = (u, v, z) => (xd ? [u, v, z] : [v, u, z]), u0 = xd ? d.x0 + cD : d.y0 + cD, u1 = xd ? d.x1 - cD : d.y1 - cD, kA = xd ? kn.L : kn.B, kB = xd ? kn.R : kn.T;
        const gr = (p.yuz === 'alt' || p.tek) && p.net ? poz.filter(q => q.yon === p.yon && q.yuz === p.yuz && (q.yuz === 'alt' || q.tek) && q.net === p.net) : [p], pI = gr.indexOf(p);
        const benim = (j, n) => gr.length < 2 || (j === 0 ? pI === 0 : j === n - 1 ? pI === gr.length - 1 : pI === 1); // parça → poz eşlemesi (ilk, ara 12 m'likler, son)
        for (const v of adim(v0, v1, p.yuz === 'kenar' ? 0.2 : p.s)) {
          if (p.yuz === 'alt' && gr.length > 1) { const z = zb + (xd ? F / 2 : 0.012 + F / 2), pr = parcalar(u0, u1, p.F, p.ga, p.gb); pr.forEach(([a, b, sa, sb], j) => { if (!benim(j, pr.length)) return; const vv = v + (j % 2) * F; bk(o, [...(sa ? [P3(a, vv, z + p.ga)] : []), P3(a, vv, z), P3(b, vv, z), ...(sb ? [P3(b, vv, z + p.gb)] : [])]); }); }
          else if (p.yuz === 'alt') { const z = zb + (xd ? F / 2 : 0.012 + F / 2), a = hk, b = hk; bk(o, [P3(u0, v, z + a), P3(u0, v, z), P3(u1, v, z), P3(u1, v, z + b)]); }
          else if (p.tek) { const z = zt - (xd ? F / 2 : 0.012 + F / 2); const prT = parcalar(u0, u1, p.F, p.ga, p.gb); prT.forEach(([a, b, sa, sb], j) => { if (!benim(j, prT.length)) return; const vv = v + (j % 2) * F; bk(o, [...(sa ? [P3(a, vv, z - p.ga)] : []), P3(a, vv, z), P3(b, vv, z), ...(sb ? [P3(b, vv, z - p.gb)] : [])]); }); }
          else if (p.yuz === 'üst' && p.ara != null) { const z = zt - (xd ? F / 2 : 0.012 + F / 2), a = p.ara - p.wt / 2 - p.ic, b = p.ara + p.wt / 2 + p.ic; bk(o, [P3(a, v, z - 0.1), P3(a, v, z), P3(b, v, z), P3(b, v, z - 0.1)]); }
          else if (p.yuz === 'üst') { const z = zt - (xd ? F / 2 : 0.012 + F / 2); if (kA) { const e1 = kA.a + kA.t / 2 + p.ic; bk(o, [P3(u0 - cD + c.cP, v, z - p.hd), P3(u0 - cD + c.cP, v, z), P3(e1, v, z), P3(e1, v, z - 0.1)]); } if (kB) { const e1 = kB.a - kB.t / 2 - p.ic; bk(o, [P3(u1 + cD - c.cP, v, z - p.hd), P3(u1 + cD - c.cP, v, z), P3(e1, v, z), P3(e1, v, z - 0.1)]); } }
          else if (p.serbest) { const ke = p.kenar, son = ke === 'R' || ke === 'T', ue = son ? u1 : u0, sg = son ? -1 : 1; bk(o, [P3(ue + sg * 0.4, v, zb), P3(ue, v, zb), P3(ue, v, zt), P3(ue + sg * 0.4, v, zt)]); }
        } }
    }
    for (const o of out) o.bars = o.bars.map(b => b.map(q => q.map(v => Math.round(v * 1000) / 1000)));
    return out.filter(o => o.bars.length);
  };

  /* ======================= statik.html bağlantısı ======================= */
  if (typeof document === 'undefined') return;
  const rapBilgi = () => Object.assign({}, (window.S || (typeof S !== 'undefined' ? S : {})).rap || {});
  const dsiMi = () => { try { return (S.rap || {}).bicim !== 'ESKI'; } catch (e) { return true; } };
  const formEk = () => {
    const f = document.querySelector('#rapDsi .body'); if (!f || f.querySelector('[data-rap="bolge"]')) return; const r = S.rap || {};
    const alan = (k, t, full) => `<label class="f${full ? ' full' : ''}">${t}<input data-rap="${k}" value="${String(r[k] == null ? '' : r[k]).replace(/"/g, '&quot;')}"></label>`;
    f.insertAdjacentHTML('beforeend', `<label class="f full">İç–dış / alt–üst donatı<select data-tas2="esitCap"><option value="1"${S.tas.esitCap !== false ? ' selected' : ''}>Her doğrultuda iki yüz eşit (firma uygulaması)</option><option value="0"${S.tas.esitCap === false ? ' selected' : ''}>Her yüz ayrı hesaplansın</option></select></label>`);
    f.querySelectorAll('[data-tas2]').forEach(el => el.onchange = () => { S.tas[el.dataset.tas2] = el.value === '1'; changed(); });
    f.insertAdjacentHTML('beforeend', `<p class="hint full"><b>Pafta anteti (DSİ)</b></p>${alan('projeAd', 'Proje adı (\\n ile satır)', true)}${alan('bolge', 'Bölge müdürlüğü satırı', true)}${alan('bolgeSehir', 'Bölge şehri')}${alan('idareSehir', 'İdare şehri')}${alan('yapan', 'Yapan')}${alan('yapanUnv', 'Unvan / sicil')}${alan('cizen', 'Çizen')}${alan('cizenUnv', 'Unvan')}${alan('kontrolAd', 'Kontrol')}${alan('kontrolUnv', 'Unvan / sicil')}${alan('paftaTarih', 'Pafta tarihi')}${alan('arsiv', 'Arşiv no')}${alan('yuklenici', 'Yüklenici')}${alan('resimNo', 'Resim no öneki')}`);
    f.querySelectorAll('[data-rap]').forEach(el => { if (el._b) return; el._b = 1; el.onchange = () => { S.rap = Object.assign({}, S.rap || {}, { [el.dataset.rap]: el.value.replace(/\\n/g, '\n') }); save(); if (R) rapor(); }; });
  };
  setTimeout(formEk, 0); { const bf = window.buildForm; window.buildForm = buildForm = function () { const x = bf.apply(this, arguments); setTimeout(formEk, 0); return x; }; }
  /* çerçeve (kolon / kiriş / döşeme) paftaları — dikdörtgen su yapısı ve 3B kabuk modunda ortak */
  P.cercevePaftalar = (RC, o) => { const paf = []; o = o || 50; const svl = (RC.seviyeler && RC.seviyeler.length ? RC.seviyeler : [0]).filter(z => RC.dosemeler.some(d => Math.abs(d.zt - z) < 0.15) || RC.zincirler.some(ch => Math.abs(ch.z - z) < 0.15)) /* yalnız su yapısı üst döşemesi olan kot: o döşeme su yapısı paftasında (TEMEL VE DÖŞEME) çizilir, boş pafta açılmaz */, kz = z => `${z >= 0 ? '+' : ''}${z.toFixed(2)}`; // birden çok kot: her kot ayrı pafta, kiriş açılımları + kolon tablosu ayrı pafta (A0'a sığsın)
      if (!svl.length) { if (RC.kolonlar.length && !P.kolonPafta) paf.push({ ad: 'KOLON APLİKASYON TABLOSU', spec: P.cerceveCizim(RC, o, { sv: [], kiris: false, kolon: true }), pw: 0, ph: 0, olcek: o, serbest: true }); }
      else if (svl.length <= 1) paf.push({ ad: 'KİRİŞ KOLON DÖŞEME DETAYLARI', spec: P.cerceveCizim(RC, o, { sv: svl }), pw: 0, ph: 0, olcek: o, serbest: true });
      else { svl.forEach(z => paf.push({ ad: `${kz(z)} KOTU KALIP VE DÖŞEME DONATI PLANI`, spec: P.cerceveCizim(RC, o, { sv: [z], kiris: false, kolon: false }), pw: 0, ph: 0, olcek: o, serbest: true }));
        paf.push({ ad: P.kolonPafta ? 'KİRİŞ AÇILIMLARI' : 'KİRİŞ AÇILIMLARI VE KOLON APLİKASYON TABLOSU', spec: P.cerceveCizim(RC, o, { sv: [], kiris: true, kolon: !P.kolonPafta }), pw: 0, ph: 0, olcek: o, serbest: true }); }
      if (P.kolonPafta) { try { paf.push(...P.kolonPafta(RC, o)); } catch (e) { console.error('kolon paftası', e); } } return paf; };
  const cizimeAktarDsi = () => {
    if (!dsiMi()) return cizimeAktar();
    const rp = rapBilgi(), paf = R ? P.paftalarDsi(R, S.tas.olcek || 50, rp, S.proj) : []; // yalnız çerçeve (su yapısı yok): yalnız kiriş-kolon-döşeme paftaları
    if (!R && !RC) { alert('Çizilecek hesap yok: önce Hesapla.'); return; }
    if (RC) paf.push(...P.cercevePaftalar(RC, S.tas.olcek || 50));
    const payload = { t: Date.now(), ad: S.proj.ad, tesis: S.proj.tesis, hazirlayan: S.proj.hazirlayan, no: S.proj.no, olcek: S.tas.olcek || 50, katman: P.KATMANLAR_DSI, spec: paf[0].spec, paftalar: paf, dsi: true };
    try { localStorage.setItem('aritmacad.statik.cizim', JSON.stringify(payload)); } catch (e) { alert('Çizim verisi aktarılamadı: ' + e.message); return; }
    let direkt = false; try { if (window.opener && window.opener.C && window.opener.C.cmd) { window.opener.C.cmd.run('STATIKCIZ'); window.opener.focus(); direkt = true; } } catch (e) { }
    $('#pMsg').innerHTML = `<div class="msg info">${paf.length} statik pafta ArıtmaCAD'e gönderildi (${paf.map(p => p.ad).join(' · ')}) — alt sekmelerde <b>Statik</b> grubunda${direkt ? '' : '; açılmazsa komut satırına <b>STATIKCIZ</b> yazın'}.</div>`;
  };
  const dxfDsi = () => {
    if (!dsiMi()) return dxfIndir();
    const paf = P.paftalarDsi(R, S.tas.olcek || 50, rapBilgi(), S.proj), K = (S.tas.olcek || 50) / 1000; let x = 0, sp = [];
    for (const p of paf) { sp = sp.concat(kaydir(p.spec, x, 0)); x += (p.pw + 30) * K; } // paftalar yan yana (model şeridi)
    const bytes = P.dxf(sp, P.KATMANLAR_DSI), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/dxf' })); a.download = (S.proj.ad || 'statik').replace(/[^\wçğıöşüÇĞİÖŞÜ-]+/g, '_') + '_statik_paftalar.dxf'; a.click();
  };
  { const d0 = P.donati3B; P.donati3B = function (R) { return dsiMi() ? P.donati3BDsi(R) : d0.apply(this, arguments); }; }
  // yetersiz katman denetimi: donatısı bulunamayan katmanlar çizime / 3B'ye konamaz → açıkça uyar
  const eksikler = () => (R ? R.tasarim.flatMap(t => t.katman.filter(k => !k.sec || !k.sec.ok).map(k => `${t.eleman}: ${k.yon} — ${k.yuz}`)) : []);
  const eksikSor = (ne) => { const e = eksikler(); if (!e.length) return true; return confirm(`DİKKAT — Aşağıdaki ${e.length} katmanda hesapla uygun donatı bulunamadı (kesit yetersiz):\n\n• ${e.join('\n• ')}\n\nBu katmanlar ${ne} KONAMAZ; ilgili perde / radyede yalnız diğer yüzün donatısı görünür.\nÇözüm: "Kalınlık öner" ile kalınlıkları artırın ya da izin verilen çatlak genişliğini (DSİ A–B sınıfı 0.2 mm) kontrol edin.\n\nYine de devam edilsin mi?`); };
  { const d3 = $('#bDon3').onclick; $('#bDon3').onclick = function () { if (!eksikSor('3B donatıya')) return; return d3 && d3.apply(this, arguments); }; }
  $('#bCiz').onclick = () => { if (eksikSor('paftalara')) cizimeAktarDsi(); }; $('#bDxf').onclick = () => { if (eksikSor('DXF paftalarına')) dxfDsi(); };
})();

/* ArıtmaCAD — POMPA İSTASYONU 3B TASARIMI (proje hesabından)
   C.istasyon3B(o, ops) — o: ıslak hazne iç sol-alt köşesi (planda), ops: proje hesabı sonucu (C.projeHesapla()).
   Üretilenler (hepsi gerçek, düzenlenebilir program elemanı):
     • Islak hazne: radye + perdeler (perde nesnesi, C30/37), iç ölçüler: uzunluk = pompa sayısı × pompa aralığı, genişlik = gerekli
       faydalı hacim / (faydalı yükseklik × uzunluk) ile pompa gövdesinin sığacağı genişliğin büyüğü.
     • Vana odası: ıslak haznenin basma tarafına bitişik; radye + perdeler; ortak perde.
     • Üst döşeme (her iki hazneyi örter) ve kapaklar için boşluklar (pompa başına kaldırma kapağı, vana odası bakım + giriş kapağı).
     • Pompalar: parametrik dalgıç pompa ailesi (KSB Amarex N — Q-H'den otomatik; ya da Wilo Rexa SUPRA şablonu), ördek ayağı + kılavuz ray,
       hazne derinliğine göre; düşey basma borusu aileden değil, ayrı boru olarak çizilir.
     • Basma boruları (3B, gerçek dış çap / et): ördek ayağı çıkışından yukarı, ortak perdeden vana odasına; perdede boru geçiş boşluğu.
     • Vanalar: seçilen çekvalf tipi + ayırma vanası (sürgülü / kelebek / bıçaklı), basma çapında.
     • Kollektör: vana odası boyunca, uç perdeden dışarı çıkar (iletim hattına bağlanır). Giriş borusu: ıslak haznenin sol perdesinden, giriş kotunda.
   Elemanlar proje hesabı kalemlerine bağlı gelir (pompa / basma / kollektör) → HESAPGUNCELLE ile güncellenir, sayı / hacim değişince yeniden çizilir. */
(function (C) {
  'use strict';
  const M = C.M;
  const LAY = (n, c, w) => { C.ensureLayer(n, c, 'CONTINUOUS', w); return n; };
  const ekle = (out, type, props) => { const e = C.add(C.newEnt(type, props)); delete e.sp; out.push(e); return e; };
  const kutuBosluk = (x0, y0, z0, x1, y1, z1) => ({ pts: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], d: [0, 0, z1 - z0] });
  const POMPA = { ksb: 'dalgic_pompa_ksb_amarexn', wilo: 'dalgic_pompa_wilo_supra', grundfos: 'dalgic_pompa_grundfos' };

  /* pompa ailesinin plan izdüşümü ve yüksekliği (yerel: riser ekseni orijin, +y basma yönü) */
  const pompaOlcu = (fam, par) => {
    const e = { type: 'aile', fam, par, p: [0, 0, 0], rot: 90, z: 0 }; let bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    try { for (const m of C.T.aile.mesh(e) || []) for (const v of m.v || []) for (let i = 0; i < 3; i++) { bb[i] = Math.min(bb[i], v[i]); bb[i + 3] = Math.max(bb[i + 3], v[i]); } } catch (er) { }
    if (!isFinite(bb[0])) bb = [-0.3, -0.7, 0, 0.3, 0.2, 1.2];
    const q = C.aileDeger(fam, null, par);
    return { bb, q, g: (+q.g || 300) / 1000, h: (+q.R3 || +q.Ht || (bb[5] - bb[2]) * 1000) / 1000 };
  };

  C.istasyon3B = (o, r, ops = {}) => {
    const P = r.P, out = [], N = r.Ntop, Qp = r.Qp, Hm = +r.Hm.toFixed(2);
    const famK = P.pompaModel === 'sema' ? null : P.pompaModel && POMPA[P.pompaModel] && C.AILELER[POMPA[P.pompaModel]] ? POMPA[P.pompaModel] : (Qp <= 53 && Hm <= 49 && C.AILELER[POMPA.ksb] ? POMPA.ksb : C.AILELER[POMPA.wilo] ? POMPA.wilo : null);
    const tw = 0.30, tr = 0.40, ts = 0.25, beton = 'C30/37';
    const zt = +P.ZG + 0.30, zStart = +P.ZIN - 0.20, zStop = zStart - +P.HEFF;
    // pompa ölçüleri
    const par0 = famK === POMPA.ksb ? { Q: +Qp.toFixed(2), H: Hm, boy: 'OTO', motor: 'OTO', cark: 'HEPSI', eta: 0, DNmin: 50, vmax: 3, ex: 'YL', kur: 'RAY', boru: 'YOK', D: 4000 } : { Q: +Qp.toFixed(2), H: Hm, kur: 'RAY', boru: 'YOK', D: 4000 };
    const PO = famK ? pompaOlcu(famK, par0) : { bb: [-0.3, -0.7, 0, 0.3, 0.2, 1.2], g: 0.3, h: 1.0 };
    const hP = Math.max(0.6, PO.h), zFloor = +(zStop - Math.max(0.6, hP * 0.6)).toFixed(2);
    const gen = PO.bb[3] - PO.bb[0], arka = -PO.bb[1], on = Math.max(0.15, PO.bb[4]);
    const s = Math.max(1.2, gen + 0.6), Lw = Math.ceil(N * s * 10) / 10;
    const yR = 0.30 + on; // ortak perde iç yüzünden riser eksenine
    const Wmin = Math.ceil((arka + yR + 0.35) * 10) / 10, Wv0 = r.V / (P.HEFF * Lw);
    const Ww = Math.max(2.0, Wmin, Math.ceil(Wv0 * 10) / 10), Vact = Lw * Ww * P.HEFF;
    const D = +(zt - zFloor).toFixed(2);
    // basma borusu / vana odası
    const B = r.basma, K = r.kollektor, ob = C.boruOlcu(B.cins, B.sinif, B.boy), ok = C.boruOlcu(K.cins, K.sinif, K.boy);
    const rb = ob.od / 2000, rk = ok.od / 2000, dB = B.dn / 1000;
    const lV = d => Math.max(0.2, d * 2.0);
    const zR = +(zt - ts - 0.85).toFixed(2), zv = +(zR - Math.max(0.6, rk + 0.45)).toFixed(2);
    const y1 = Ww + tw, yCv = y1 + 0.35 + lV(dB) / 2, yIv = yCv + lV(dB) / 2 + 0.30 + lV(dB) / 2, yK = yIv + lV(dB) / 2 + 0.35 + rk;
    const Wv = Math.max(1.8, Math.ceil((yK + rk + 0.45 - y1) * 10) / 10);
    const ox = o[0], oy = o[1], X = (x, y, z) => [ox + x, oy + y, z];
    const lp = LAY('INS_PERDE', 8, 50), lr = LAY('INS_TEMEL', 252, 50), ld = LAY('INS_DOSEME', 8, 35), lb = LAY('MEK_BORU_' + C.up(B.cins), 9, 25), lk = LAY('MEK_BORU_' + C.up(K.cins), 9, 25), lv = LAY('VANA', 1, 25);
    const XY = (x, y) => [ox + x, oy + y];
    // ---- radyeler
    ekle(out, 'plak', { kind: 'radye', pts: [XY(-tw, -tw), XY(Lw + tw, -tw), XY(Lw + tw, Ww + tw / 2), XY(-tw, Ww + tw / 2)], t: tr, zt: zFloor, beton, layer: lr, ad: 'Islak hazne radyesi' });
    ekle(out, 'plak', { kind: 'radye', pts: [XY(-tw, Ww + tw / 2), XY(Lw + tw, Ww + tw / 2), XY(Lw + tw, y1 + Wv + tw), XY(-tw, y1 + Wv + tw)], t: 0.30, zt: zv, beton, layer: lr, ad: 'Vana odası radyesi' });
    // ---- perdeler (eksen çizgisi, ortalı)
    const h2 = t => +(zt - ts - t).toFixed(3);
    const islak = ekle(out, 'perde', { pts: [XY(-tw / 2, -tw / 2), XY(Lw + tw / 2, -tw / 2), XY(Lw + tw / 2, Ww + tw / 2), XY(-tw / 2, Ww + tw / 2)], closed: true, hiza: 'O', ofs: 0, egim: 'R', tb: tw, tt: tw, h: h2(zFloor), z0: zFloor, malz: 'beton', beton, layer: lp, ad: 'Islak hazne perdeleri' });
    const vana = ekle(out, 'perde', { pts: [XY(-tw / 2, Ww + tw / 2), XY(-tw / 2, y1 + Wv + tw / 2), XY(Lw + tw / 2, y1 + Wv + tw / 2), XY(Lw + tw / 2, Ww + tw / 2)], closed: false, hiza: 'O', ofs: 0, egim: 'R', tb: tw, tt: tw, h: h2(zv), z0: zv, malz: 'beton', beton, layer: lp, ad: 'Vana odası perdeleri' });
    // ---- pompalar, basma boruları, vanalar
    const xs = [], bos = [], bosV = [];
    for (let i = 0; i < N; i++) {
      const x = (i + 0.5) * Lw / N; xs.push(x);
      if (famK && P.pompaModel !== 'sema') { const pm = ekle(out, 'aile', { fam: famK, tip: '', tipU: '', par: Object.assign({}, par0, { D: Math.round(D * 1000) }), p: [ox + x, oy + Ww - yR, 0], rot: 90, z: zFloor, ad: `P${i + 1}${i >= P.Nasil ? '-Y' : ''}`, layer: (C.AILELER[famK].katman || 'MEK_POMPA') }); pm.hk = 'pompa'; }
      else { const pm = ekle(out, 'pump', { p: [ox + x, oy + Ww - yR - 0.3, zFloor], d: 0.6, h: hP, kind: 'dalgic', tag: `P${i + 1}`, q: +Qp.toFixed(1), hm: Hm, rot: 90, layer: 'POMPA' }); pm.hk = 'pompa'; }
      const z0 = zFloor + PO.g, yr = Ww - yR;
      const p = ekle(out, 'pipe', { pts: [X(x, yr, z0), X(x, yr, zR), X(x, yCv - lV(dB) / 2, zR)], dn: ob.dn, od: ob.od, t: ob.t, cins: B.cins, sinif: ob.sinif, mat: ob.c.mat, kalite: C.boruKalite ? C.boruKalite(B.cins) : undefined, label: C.boruLabel ? C.boruLabel(ob) : '', layer: lb }); p.hk = 'basma';
      const cv = ekle(out, 'valve', { p: X(x, yCv, zR), rot: 90, dn: B.dn, kind: 'cekvalf', alt: P.vanaCek, tag: i === 0 ? 'ÇV' : '', layer: lv }); cv.hk = 'basma';
      const ik = P.vanaIz === 'kelebek' ? 'kelebek' : 'surgulu', iv = ekle(out, 'valve', { p: X(x, yIv, zR), rot: 90, dn: B.dn, kind: ik, tag: i === 0 ? (ik === 'kelebek' ? 'KV' : P.vanaIz === 'bicakli' ? 'BV' : 'SV') : '', layer: lv }); if (P.vanaIz === 'bicakli') iv.alt = 'bicakli'; iv.hk = 'basma';
      const p2 = ekle(out, 'pipe', { pts: [X(x, yCv + lV(dB) / 2, zR), X(x, yIv - lV(dB) / 2, zR)], dn: ob.dn, od: ob.od, t: ob.t, cins: B.cins, sinif: ob.sinif, mat: ob.c.mat, kalite: C.boruKalite ? C.boruKalite(B.cins) : undefined, label: '', layer: lb, noElbow: true }); p2.hk = 'basma';
      const p3 = ekle(out, 'pipe', { pts: [X(x, yIv + lV(dB) / 2, zR), X(x, yK - rk, zR)], dn: ob.dn, od: ob.od, t: ob.t, cins: B.cins, sinif: ob.sinif, mat: ob.c.mat, kalite: C.boruKalite ? C.boruKalite(B.cins) : undefined, label: '', layer: lb, noElbow: true }); p3.hk = 'basma';
      const a = rb + 0.05; bos.push(kutuBosluk(ox + x - a, oy + Ww - 0.01, zR - a, ox + x + a, oy + y1 + 0.01, zR + a)); // ortak perdede boru geçişi
      bosV.push(kutuBosluk(ox + x - Math.max(0.4, gen / 2 + 0.15), oy + yr - arka - 0.15, zt - ts - 0.01, ox + x + Math.max(0.4, gen / 2 + 0.15), oy + Math.min(Ww - 0.05, yr + on + 0.15), zt + 0.01)); // pompa kaldırma kapağı
    }
    // ---- kollektör ve giriş borusu
    const kol = ekle(out, 'pipe', { pts: [X(xs[0] - 0.25, yK, zR), X(Lw + tw + 1.5, yK, zR)], dn: ok.dn, od: ok.od, t: ok.t, cins: K.cins, sinif: ok.sinif, mat: ok.c.mat, kalite: C.boruKalite ? C.boruKalite(K.cins) : undefined, label: C.boruLabel ? C.boruLabel(ok) : '', layer: lk }); kol.hk = 'kollektor';
    vana.bosluk3 = [kutuBosluk(ox + Lw - 0.01, oy + yK - rk - 0.05, zR - rk - 0.05, ox + Lw + tw + 0.01, oy + yK + rk + 0.05, zR + rk + 0.05)];
    const DIN = +P.DIN || 300, ri = DIN / 2000, zi = +P.ZIN + ri, oi = C.boruOlcu('pvck', 'SN8', DIN) || C.boruOlcu('beton', 'STD', DIN);
    ekle(out, 'pipe', { pts: [X(-tw - 1.5, Ww * 0.35, zi), X(0.25, Ww * 0.35, zi)], dn: oi.dn, od: oi.od, t: oi.t, cins: oi.cins, sinif: oi.sinif, mat: oi.c.mat, label: 'Giriş ' + (C.boruLabel ? C.boruLabel(oi) : ''), layer: LAY('MEK_BORU_GIRIS', 30, 25) });
    bos.push(kutuBosluk(ox - tw - 0.01, oy + Ww * 0.35 - ri - 0.05, zi - ri - 0.05, ox + 0.01, oy + Ww * 0.35 + ri + 0.05, zi + ri + 0.05));
    islak.bosluk3 = bos;
    // ---- üst döşeme ve kapaklar
    const ust = ekle(out, 'plak', { kind: 'doseme', pts: [XY(-tw, -tw), XY(Lw + tw, -tw), XY(Lw + tw, y1 + Wv + tw), XY(-tw, y1 + Wv + tw)], t: ts, zt, beton, layer: ld, ad: 'Üst döşeme' });
    bosV.push(kutuBosluk(ox + 0.2, oy + y1 + 0.2, zt - ts - 0.01, ox + 1.0, oy + y1 + 1.0, zt + 0.01)); // vana odası giriş kapağı
    if (Lw - 0.3 > 1.6) bosV.push(kutuBosluk(ox + 1.3, oy + y1 + 0.3, zt - ts - 0.01, ox + Lw - 0.3, oy + y1 + Wv - 0.3, zt + 0.01)); // vana odası bakım kapağı
    ust.bosluk3 = bosV;
    // ---- kapaklar (üst döşeme boşlukları): aynı ölçüdekiler tek tip (K1, K2 …)
    const kapak = [], kTip = [];
    bosV.forEach((b, i) => { const xa = b.pts[0][0] - ox, ya = b.pts[0][1] - oy, xb = b.pts[2][0] - ox, yb = b.pts[2][1] - oy, w = +(Math.min(xb - xa, yb - ya)).toFixed(2), l = +(Math.max(xb - xa, yb - ya)).toFixed(2);
      const yer = i < N ? `P${i + 1} pompa kaldırma` : (i === N ? 'Vana odası giriş' : 'Vana odası bakım');
      let t = kTip.find(q => Math.abs(q.w - w) < 0.005 && Math.abs(q.l - l) < 0.005); if (!t) { t = { ad: 'K' + (kTip.length + 1), w, l, adet: 0, yer: [], giris: i === N }; kTip.push(t); }
      t.adet++; if (!t.yer.includes(yer.replace(/^P\d+ /, ''))) t.yer.push(yer.replace(/^P\d+ /, '')); kapak.push({ tip: t.ad, x0: +xa.toFixed(3), y0: +ya.toFixed(3), x1: +xb.toFixed(3), y1: +yb.toFixed(3), yer }); });
    // ---- akslar (perde eksenleri) — plan, kesit ve paftalarda otomatik
    if (C.T.aks) { C.ensureLayer('AKS', 1, 'CENTER', 18); const ad0 = { o: [ox - tw / 2, oy - tw / 2], xs: [0, +(Lw + tw).toFixed(4)], ys: [0, +(Ww + tw).toFixed(4), +(Ww + Wv + 2 * tw).toFixed(4)], rot: 0, bp: 4, extp: 22, dims: true, both: true, xl: 'num', layer: 'AKS' }; ekle(out, 'aks', C.aksSync ? C.aksSync(ad0) : ad0); }
    // ---- mimari: yalıtım, kaplamalar (malzeme açılımı ve mahal listesi modelden okur)
    try {
      const Kp = C._kap, ins = (pts, z) => pts.map(q => [q[0], q[1]]);
      if (Kp && Kp.BIT && !Kp.BIT.epoksi) Kp.BIT.epoksi = { ad: 'Epoksi kaplama (atıksuya dayanıklı, 2 kat)', t: 0, col: [0.45, 0.60, 0.62] };
      const odaI = [XY(0, 0), XY(Lw, 0), XY(Lw, Ww), XY(0, Ww)], odaV = [XY(0, y1), XY(Lw, y1), XY(Lw, y1 + Wv), XY(0, y1 + Wv)], ly = LAY('INS_KAPLAMA', 9, 13), lyY = LAY('INS_YALITIM', 6, 13), zAlt = zt - ts;
      if (C.T.yalitim) {
        const ZGp = +P.ZG || 0, dik = (q, zb, zr) => { const o2 = []; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; o2.push({ a, b, z0: zb, z1: zr }); } return o2; };
        const fI = [XY(-tw, -tw), XY(Lw + tw, -tw), XY(Lw + tw, Ww + tw / 2), XY(-tw, Ww + tw / 2)], fV = [XY(-tw, Ww + tw / 2), XY(Lw + tw, Ww + tw / 2), XY(Lw + tw, y1 + Wv + tw), XY(-tw, y1 + Wv + tw)];
        const yd = (a, b, z0, z1) => ({ a, b, z0, z1 });
        ekle(out, 'yalitim', { kind: 'temel', pts: fI, zb: zFloor - tr, zt: zFloor, su: 'bitum', kb: 5, dik: [...dik(fI, zFloor - tr, zFloor).filter((d, i) => i !== 2), yd(fI[0], fI[1], zFloor, ZGp), yd(fI[3], fI[0], zFloor, ZGp), yd(fI[1], XY(Lw + tw, Ww + tw), zFloor, ZGp)], dmat: 'yok', dt: 0, dren: 'E', zg: ZGp, layer: lyY });
        ekle(out, 'yalitim', { kind: 'temel', pts: fV, zb: zv - 0.30, zt: zv, su: 'bitum', kb: 5, dik: [...dik(fV, zv - 0.30, zv).filter((d, i) => i !== 0), yd(fV[1], fV[2], zv, ZGp), yd(fV[2], fV[3], zv, ZGp), yd(fV[3], XY(-tw, Ww + tw), zv, ZGp)], dmat: 'yok', dt: 0, dren: 'E', zg: ZGp, layer: lyY });
        ekle(out, 'yalitim', { kind: 'su', pts: ins(odaI), z0: zFloor, h: +(zAlt - zFloor).toFixed(3), tip: 'kristal', taban: 'E', layer: lyY });
      }
      if (C.T.kaplama) {
        ekle(out, 'kaplama', { kind: 'zemin', pts: ins(odaI), z0: zFloor + 0.006, zbt: 0, xps: 0, sap: 0, kap: 'epoksi', kt: 0.3, sup: 0, ad: 'Islak hazne (pompa haznesi)', layer: ly });
        ekle(out, 'kaplama', { kind: 'zemin', pts: ins(odaV), z0: zv, zbt: 0, xps: 0, sap: 5, kap: 'epoksi', kt: 0.3, sup: 0, ad: 'Vana odası', layer: ly });
        ekle(out, 'kaplama', { kind: 'duvar', side: 'IC', pts: ins(odaI), z0: zFloor, h: +(zAlt - zFloor).toFixed(3), siva: 'yok', kap: 'epoksi', kh: 0, ub: 'epoksi', layer: ly });
        ekle(out, 'kaplama', { kind: 'duvar', side: 'IC', pts: ins(odaV), z0: zv + 0.053, h: +(zAlt - zv - 0.053).toFixed(3), siva: 'yok', kap: 'epoksi', kh: 0, ub: 'epoksi', layer: ly });
        ekle(out, 'kaplama', { kind: 'tavan', pts: ins(odaV), zc: zAlt, siva: 'yok', bit: 'boya', drop: 0, boya: 'H', layer: ly });
      }
    } catch (er) { console.error('istasyon mimari', er); }
    C.changed();
    return { ents: out, Lw, Ww, Wv, H: D, Vact, Vreq: r.V, zFloor, zStart, zStop, zR, zv, zt, DNp: B.dn, DNh: K.dn, pompa: famK, s, tw, tr, ts, y1, yK, xs, yr: Ww - yR, kapak, kTip };
  };
})(window.C);

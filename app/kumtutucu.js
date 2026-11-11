/* ArıtmaCAD — KUM VE YAĞ TUTUCU (havalandırmalı, gezer köprülü; Çokal AAT T-103 biçimi) çizim varlığı
   Ölçüler metre; ayak izinin sol alt köşesi yerel (0,0); akış +x (dağıtma kanalı x = 0 ucunda, çıkış kanalı öbür uçta).
   Ünite kartı: app/unite-kart.js → K.kumKart (göz sayısı, bölme genişlikleri, su derinliği, boy, kotlar).
   Düzen (Çokal 1-Çokal_AAT_Kaba-İnce-Giriş-Kum Yağ Tutucu_R3.dwg, plan ve E-E, F-F, G-G, H-H kesitleri):
   - Boyuna: dış duvar · dağıtma kanalı (bD) · duvar · gözler (L) · duvar · çıkış kanalı (bC) · dış duvar.
   - Enine: her göz = yağ bölmesi (bF) + ayırma kirişi (ta) + kum bölmesi (b). Yağ bölmesi dış duvar tarafında: komşu gözler aynalı.
   - Göz tabanı grobeton dolgu: kum oluğu (taban eni bo, derinlik ho, yanları ko açılır) kum bölmesinde ayırma kirişinin dibinde;
     oluğun üstünden duvar diplerine 45° yükselir (kum tarafında b − bo − 2·ko, yağ tarafında bF + ta kadar).
     Dolgunun altı düz taban plağı (oluk dibinden td aşağıda), kalınlığı tr.
   - Ayırma kirişi (betonarme, su yüzünün lu üstünden lh aşağı) ve altında sac yağ lameli (ls).
   - Gözler arası duvar alçak (zy − yt); üstünde yürüme yolu döşemesi (en yy, üst kotu zy = duvar üstü − 0,85). Dış duvarlar zu kotunda:
     gezer köprü rayları bunların üstünde.
   - Alt (y = 0) dış duvarın üstünde dışa konsol kum oluğu (iç en ok): kum pompaları buraya basar, oluk kum seperatörüne akar.
   - Dağıtma kanalından her göze kum bölmesi ekseninde kapaklı açıklık (gB × gH, eşik su yüzünden gE aşağıda);
     çıkış duvarında göz başına savak açıklığı (kret su yüzünden sv aşağıda).
   Saf geometri (geo, ekipmanYer, su) Node ile denenir: node test/kumtutucu.test.js */
(function (C) {
  'use strict';
  const NODE = typeof module !== 'undefined' && module.exports && typeof require !== 'undefined';
  const ANA = NODE ? require('./anaerobik.js') : null;
  const bolgeKati = (...a) => (ANA ? ANA.bolgeKati : C.bolgeKati)(...a);
  const DEF = {
    N: 2, b: 1.00, ta: 0.20, bF: 0.40, L: 11.40, h: 1.26, // göz: kum bölmesi, ayırma kirişi, yağ bölmesi, boy, su derinliği (su yüzü → kum oluğu üstü)
    zs: 97.45, zu: 99.15, zg: 95.50, // su yüzü, duvar üstü, zemin (tretuvar) kotu
    tw: 0.40, ti: 0.30, bD: 1.50, bC: 1.50, // dış duvar, gözler arası duvar, dağıtma ve çıkış kanalı iç genişlikleri
    ho: 0.50, bo: 0.50, ko: 0.10, td: 0.64, tr: 0.50, // kum oluğu: derinlik, taban eni, yan açılma; oluk altı dolgu; taban plağı
    yy: 1.00, yt: 0.20, yh: 0.85, // orta yürüme yolu: en, döşeme kalınlığı, duvar üstünden aşağıda
    ok: 0.40, okd: 0.20, okh: 0.55, okt: 0.20, okb: 0.40, // üst kum oluğu: iç en, duvar, iç derinlik, taban kalınlığı, göz başından boşluk
    lu: 0.30, lh: 0.55, ls: 0.63, // ayırma kirişi: su üstü, yükseklik; sac lamel boyu (kiriş altından)
    gB: 0.60, gH: 0.40, gE: 0.30, // giriş kapağı açıklığı: en, yükseklik, eşik su yüzünden aşağıda
    sv: 0.10, sH: 0.40, dT: 0.50, // savak kreti su yüzünden aşağıda, savak açıklığı yüksekliği; dağıtma kanalı tabanı su yüzünden aşağıda
    xs: 0.37, // kum seperatörünün yeri (göz boyunun oranı, dağıtma ucundan)
  };
  const PAR = Object.keys(DEF);
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const r3 = v => Math.round(v * 1000) / 1000;

  function geo(e) {
    const q = {}; e = e || {}; for (const k of PAR) q[k] = e[k] != null && e[k] !== '' ? +e[k] : DEF[k];
    const N = Math.max(1, Math.round(q.N)), gz = q.b + q.ta + q.bF, en = N * gz + (N - 1) * q.ti + 2 * q.tw;
    const xD0 = q.tw, xD1 = xD0 + q.bD, xg0 = xD1 + q.tw, xg1 = xg0 + q.L, xC0 = xg1 + q.tw, xC1 = xC0 + q.bC, boy = xC1 + q.tw;
    const zs = q.zs, zt = zs - q.h, zo = zt - q.ho, zr1 = zo - q.td, zr0 = zr1 - q.tr, zu = q.zu, zy = zu - q.yh, zmw = zy - q.yt;
    const ek = Math.max(0, q.b - q.bo - 2 * q.ko), ey = q.bF + q.ta; // 45° eğimlerin yükselmesi: kum tarafı, yağ tarafı
    const G = { q, N, gz, en, boy, xD0, xD1, xg0, xg1, xC0, xC1, zs, zt, zo, zr1, zr0, zu, zy, zmw, ek, ey, goz: [], kes: [], kutu: [], kapak: [], savak: [] };
    const delik = [rect(xD0, q.tw, xD1, en - q.tw)];
    for (let i = 0; i < N; i++) {
      const y0 = q.tw + i * (gz + q.ti), y1 = y0 + gz, alt = i % 2 === 0; // alt: yağ bölmesi küçük y tarafında
      const yag = alt ? [y0, y0 + q.bF] : [y1 - q.bF, y1], ayir = alt ? [y0 + q.bF, y0 + q.bF + q.ta] : [y1 - q.bF - q.ta, y1 - q.bF], kum = alt ? [y0 + q.bF + q.ta, y1] : [y0, y1 - q.bF - q.ta];
      // dolgu kesiti (s: yağ dış duvarından kum duvarına 0 … gz; z) → yerel (y, z)
      const S = [[0, zr1], [gz, zr1], [gz, zt + ek], [gz - ek, zt], [gz - ek - q.ko, zo], [gz - ek - q.ko - q.bo, zo], [ey, zt], [0, zt + ey]];
      const prof = S.map(([s, z]) => [alt ? y0 + s : y1 - s, z]);
      const yo = alt ? y0 + gz - ek - q.ko - q.bo / 2 : y1 - (gz - ek - q.ko - q.bo / 2); // kum oluğu ekseni
      G.goz.push({ i, y0, y1, alt, yag, ayir, kum, prof, yo, ym: (kum[0] + kum[1]) / 2 });
      delik.push(rect(xg0, y0, xg1, y1));
      // giriş kapağı (dağıtma kanalı → kum bölmesi) ve savak (göz → çıkış kanalı)
      const yk = (kum[0] + kum[1]) / 2, zE = zs - q.gE;
      G.kapak.push({ i, x: xD1, y: yk, B: q.gB, H: q.gH, z0: zE });
      G.kes.push({ k: 'giris', pts: rect(xD1 - 0.05, yk - q.gB / 2, xg0 + 0.05, yk + q.gB / 2), z0: zE, z1: zE + q.gH });
      const sB = Math.max(0.3, gz - 0.30), ysv = (y0 + y1) / 2, zK = zs - q.sv;
      G.savak.push({ i, x: xg1, y: ysv, B: sB, z: zK });
      G.kes.push({ k: 'savak', pts: rect(xg1 - 0.05, ysv - sB / 2, xC0 + 0.05, ysv + sB / 2), z0: zK, z1: zK + q.sH });
      // ayırma kirişi ve sac lamel
      G.kutu.push({ k: 'kiris', pts: rect(xg0, ayir[0], xg1, ayir[1]), z0: zs + q.lu - q.lh, z1: zs + q.lu });
      const yl = alt ? ayir[1] - 0.03 : ayir[0]; G.kutu.push({ k: 'lamel', pts: rect(xg0, yl, xg1, yl + 0.03), z0: zs + q.lu - q.lh - q.ls, z1: zs + q.lu - q.lh, celik: true });
    }
    delik.push(rect(xC0, q.tw, xC1, en - q.tw));
    G.bolge = { dis: rect(0, 0, boy, en), delik: delik.map(d => d.slice().reverse()) };
    // gözler arası duvarlar alçak; üstlerinde yürüme yolu
    G.yol = [];
    for (let i = 0; i + 1 < N; i++) { const ya = G.goz[i].y1, yb = ya + q.ti, ym = (ya + yb) / 2;
      G.kes.push({ k: 'alcak', pts: rect(xg0, ya - 0.001, xg1, yb + 0.001), z0: zmw, z1: zu + 0.05 });
      G.yol.push({ i, pts: rect(xg0, ym - q.yy / 2, xg1, ym + q.yy / 2), z0: zmw, z1: zy, ym }); }
    // dağıtma kanalı taban dolgusu, taban plağı
    G.kutu.push({ k: 'dagitma-dolgu', pts: rect(xD0, q.tw, xD1, en - q.tw), z0: zr1, z1: zs - q.dT });
    G.taban = { pts: rect(0, 0, boy, en), z0: zr0, z1: zr1 };
    // üst kum oluğu (alt dış duvarın dışında konsol): taban + dış duvar + uç duvarları
    { const xa = xg0, xb = xg1 - q.okb, w = q.ok + q.okd, zb = zu - q.okh - q.okt, zf = zu - q.okh;
      G.ustOluk = { xa, xb, w, zb, zf, ic: rect(xa + q.okd, -q.ok, xb - q.okd, 0) };
      G.kutu.push({ k: 'oluk-taban', pts: rect(xa, -w, xb, 0), z0: zb, z1: zf }, { k: 'oluk-dis', pts: rect(xa, -w, xb, -q.ok), z0: zf, z1: zu },
        { k: 'oluk-uc', pts: rect(xa, -q.ok, xa + q.okd, 0), z0: zf, z1: zu }, { k: 'oluk-uc', pts: rect(xb - q.okd, -q.ok, xb, 0), z0: zf, z1: zu }); }
    // su tutucu bant: temel–perde birleşiminde perde eksenleri boyunca
    { const m = q.tw / 2, zb = zr1 + 0.10, B = [{ anahtar: 'dis', pts: rect(m, m, boy - m, en - m), closed: true, z: zb }];
      for (const [k, x] of [['dagitma', xD1 + m], ['cikis', xg1 + m]]) B.push({ anahtar: k, pts: [[x, m], [x, en - m]], closed: false, z: zb });
      for (let i = 0; i + 1 < N; i++) B.push({ anahtar: 'ara-' + i, pts: [[xD1 + m, G.goz[i].y1 + q.ti / 2], [xg1 + m, G.goz[i].y1 + q.ti / 2]], closed: false, z: zb });
      G.bantlar = B; }
    G.V = N * q.L * (q.b + q.bF) * q.h; // yaklaşık su hacmi
    G.giris = { p: [0, en / 2], z: zs }; G.cikis = { p: [boy, en / 2], z: zr1 };
    return G;
  }

  /* ekipman yerleri (yerel): giriş kapakları, gezer köprü, kum seperatörü, yağ konteynerleri, yürüme yolu korkulukları */
  function ekipmanYer(G) {
    const q = G.q, out = [];
    for (const k of G.kapak) out.push({ anahtar: 'pen-' + k.i, tur: 'penstok', etiket: String(k.i + 1), p: [k.x, k.y], aci: 0, z: k.z0, B: k.B, H: k.H, D: G.zu - k.z0, hw: G.zs - k.z0 });
    out.push({ anahtar: 'kopru', tur: 'kopru', p: [G.xg0 + q.L * 0.6, G.en / 2], aci: 0, /* aile x ekseni (açıklık) havuz enine */  z: G.zu, Ls: G.en - q.tw, N: G.N, ap: G.N > 1 ? Math.abs(G.goz[1].yo - G.goz[0].yo) : 1.9, Hp: G.zu - G.zo, yo: G.goz.map(g => g.yo) });
    const zk = q.zg + 0.10; // seperatör kaidesi
    out.push({ anahtar: 'seperator', tur: 'seperator', p: [G.xg0 + q.L * q.xs, -(G.ustOluk.w + 1.10)], aci: 0, z: zk });
    out.push({ anahtar: 'kont-kum', tur: 'konteyner', etiket: 'KUM', p: [G.xg0 + q.L * q.xs + 2.45, -(G.ustOluk.w + 1.10)], aci: 0, z: q.zg });
    out.push({ anahtar: 'kont-yag-alt', tur: 'konteyner', etiket: 'YAĞ 1', p: [G.xg1 - 0.70, -(G.ustOluk.w + 0.85)], aci: 0, z: q.zg });
    out.push({ anahtar: 'kont-yag-ust', tur: 'konteyner', etiket: 'YAĞ 2', p: [G.xg1 - 0.70, G.en + 0.85], aci: 0, z: q.zg });
    for (const y of G.yol) for (const s of [-1, 1]) out.push({ anahtar: `korkuluk-${y.i}-${s > 0 ? 'ust' : 'alt'}`, tur: 'korkuluk', pts: [[G.xg0 + 0.05, y.ym + s * (q.yy / 2 - 0.05)], [G.xg1 - 0.05, y.ym + s * (q.yy / 2 - 0.05)]], z: G.zy });
    return out;
  }
  function su(G) {
    const q = G.q, out = [{ anahtar: 'su-dagitma', ad: 'Dağıtma kanalı', pts: rect(G.xD0, q.tw, G.xD1, G.en - q.tw), zb: G.zs - q.dT, maks: G.zs + 0.05, min: G.zs }];
    for (const g of G.goz) out.push({ anahtar: 'su-goz-' + g.i, ad: `Kum ve yağ tutucu ${g.i + 1}. göz`, pts: rect(G.xg0, g.y0, G.xg1, g.y1), zb: G.zt, maks: G.zs, min: G.zs - 0.05 });
    out.push({ anahtar: 'su-cikis', ad: 'Çıkış kanalı', pts: rect(G.xC0, q.tw, G.xC1, G.en - q.tw), zb: G.zr1, maks: G.zs - q.sv - 0.20, min: G.zs - q.sv - 0.40 });
    return out;
  }
  if (NODE) module.exports = { geo, DEF, ekipmanYer, su };
  if (!C || !C.T) return;

  /* ================= ÇİZİM ================= */
  const M = C.M, T = C.T, { L, P, TX } = C.prim, { ext } = C.meshDef;
  const tH = mm => C.annoH(mm == null ? C.doc.set.textH : mm);
  const f2 = v => M.fmt(v, 2).replace('.', ',');
  const kot = z => (C.fmtKot ? C.fmtKot(z) : f2(z));
  const unum = e => (String(e.code || '').match(/\d+/) || ['1xx'])[0];
  const W3 = f => p => f.at(p[0], p[1], p[2]);
  const triAg = (f, K) => { const uy = M.cross([0, 0, 1], f.ux), Wn = n => [f.ux[0] * n[0] + uy[0] * n[1], f.ux[1] * n[0] + uy[1] * n[1], n[2]]; return { t: 'tri', v: K.v.map(W3(f)), vn: K.vn.map(Wn), f: K.f, edges3: K.e.map(ab => ab.map(W3(f))) }; };

  T.kumtutucu = {
    label: 'Kum ve yağ tutucu', ifc: 'IfcTank',
    prims: e => {
      const G = geo(e), q = G.q, f = C.frame(e.o, e.rot), z = G.zu, out = [], h = tH();
      const rd = (() => { let r = ((e.rot || 0) % 360 + 360) % 360; if (r > 90 && r <= 270) r -= 180; return r * Math.PI / 180; })();
      const PL = (pts, c, o) => P(pts.map(p => f.at(p[0], p[1], z)), c, o), T1 = (x, y, s, o, al) => TX(f.at(x, y, z), (o && o.h) || h, s, rd, al || 'M', o);
      for (const r of [G.bolge.dis, ...G.bolge.delik]) out.push(PL(r, true, { lw: 50 }));
      for (const g of G.goz) {
        out.push(PL(rect(G.xg0, g.ayir[0], G.xg1, g.ayir[1]), true, { lw: 25 })); // ayırma kirişi
        const o2 = q.bo / 2 + q.ko; out.push(PL(rect(G.xg0, g.yo - o2, G.xg1, g.yo + o2), true, { lt: 'DASHED', color: 8, lw: 18 })); // kum oluğu (tabanda)
        out.push(T1((G.xg0 + G.xg1) / 2, (g.kum[0] + g.kum[1]) / 2, 'KUM KANALI', { color: 4 }), T1(G.xg0 + q.L * 0.25, (g.yag[0] + g.yag[1]) / 2, 'YAĞ KANALI', { color: 4, h: h * 0.8 }));
      }
      for (const y of G.yol) out.push(PL(y.pts, true, { lw: 25, color: 8 }));
      { const u = G.ustOluk; out.push(PL(rect(u.xa, -u.w, u.xb, 0), true, { lw: 35 }), PL(u.ic, true, { lw: 18 }), T1((u.xa + u.xb) / 2, -q.ok / 2, 'KUM OLUĞU', { color: 4, h: h * 0.8 })); }
      if (!e.ekipman) for (const k of G.kapak) out.push(L(f.at(k.x, k.y - k.B / 2 - 0.05, z), f.at(k.x, k.y + k.B / 2 + 0.05, z), { color: 6, lw: 70 }));
      out.push(TX(f.at((G.xD0 + G.xD1) / 2, G.en / 2, z), h, 'DAĞITMA KANALI', rd + Math.PI / 2, 'M', { color: 4 }), TX(f.at((G.xC0 + G.xC1) / 2, G.en / 2, z), h, 'ÇIKIŞ KANALI', rd + Math.PI / 2, 'M', { color: 4 }));
      out.push(T1(G.boy / 2, G.en + 1.2, `${G.N} göz × (kum ${f2(q.b)} + yağ ${f2(q.bF)}) × ${f2(q.L)} m · su ${kot(G.zs)} · duvar üstü ${kot(G.zu)} · kum oluğu dibi ${kot(G.zo)} · V = ${M.fmt(G.V, 0)} m³`, { color: 3 }));
      out.push(TX(f.at(G.boy / 2, G.en + 1.2 + h * 5, z), tH(5), `${e.code || ''} ${e.name || 'Kum ve yağ tutucu'}`.trim(), rd, 'C', { color: 2 }));
      return out;
    },
    mesh: e => {
      const G = geo(e), f = C.frame(e.o, e.rot), out = [], uy = M.cross([0, 0, 1], f.ux);
      const key = JSON.stringify([G.q, e.o, e.rot]);
      if (!e._ag || e._agK !== key) {
        const ag = triAg(f, bolgeKati(G.bolge, G.zr1, G.zu)); // duvarlar taban plağının üstünden
        let son = ag; if (C.boslukAg) { try { son = C.boslukAg([ag], G.kes.map(k => ({ pts: k.pts.map(p => f.at(p[0], p[1], k.z0)), d: [0, 0, k.z1 - k.z0] })), [0.74, 0.74, 0.71]); } catch (er) { console.error('kum tutucu boşluk', er); } }
        e._ag = son; e._agK = key;
      }
      out.push(e._ag);
      out.push(ext(f.at(0, 0, G.taban.z0), f.ux, [0, 0, 1], G.taban.pts, G.taban.z1 - G.taban.z0));
      for (const g of G.goz) out.push(ext(f.at(G.xg0, 0, 0), uy, f.ux, g.prof, G.q.L)); // grobeton dolgu (kum oluğu ve eğimler): enine kesit boyuna uzatılır
      for (const k of G.kutu) out.push(ext(f.at(0, 0, k.z0), f.ux, [0, 0, 1], k.pts, k.z1 - k.z0));
      for (const y of G.yol) out.push(ext(f.at(0, 0, y.z0), f.ux, [0, 0, 1], y.pts, y.z1 - y.z0));
      return out;
    },
    snaps: e => { const G = geo(e), f = C.frame(e.o, e.rot); return G.bolge.dis.map(p => ({ p: f.at(p[0], p[1], G.zu), k: 'end' })); },
    xf: (e, X) => { const o2 = X.p(e.o); const v = X.v([Math.cos((e.rot || 0) * Math.PI / 180), Math.sin((e.rot || 0) * Math.PI / 180), 0]); e.rot = Math.atan2(v[1], v[0]) * 180 / Math.PI; e.o = [o2[0], o2[1], 0]; },
    info: e => { const G = geo(e); return `${e.code || ''} kum ve yağ tutucu: ${G.N} göz × ${f2(G.gz)} m, boy ${f2(G.q.L)} m, dış ölçü ${f2(G.boy)} × ${f2(G.en)} m, su ${kot(G.zs)}, duvar üstü ${kot(G.zu)}`; },
  };

  /* ================= EKİPMAN ================= */
  const mm = v => Math.round(v * 1000);
  const imza = x => JSON.stringify(x.type === 'aile' ? [x.p, x.rot, x.z, x.par] : [x.pts, x.z0, x.z1]);
  function nesne(e, y) {
    const f = C.frame(e.o, e.rot), un = unum(e), W2 = p => { const w = f.at(p[0], p[1], 0); return [w[0], w[1]]; };
    const aile = (fam, par, ad) => { const d = C.AILELER && C.AILELER[fam]; if (!d) return null; const t0 = d.tipler && d.tipler[0]; return { type: 'aile', props: { fam, tip: t0 ? t0.ad : null, tipU: t0 ? t0.ad : null, par: Object.assign({}, t0 ? t0.p : {}, par), p: [...W2(y.p), 0], rot: (e.rot || 0) + y.aci, z: y.z, ad, layer: d.katman || C.doc.cur.layer } }; };
    if (y.tur === 'penstok') return aile('penstock_kanal', { B: mm(y.B), H: mm(y.H), D: mm(y.D), hw: mm(y.hw), tahrik: 'EL', konum: 'K' }, `SK-${un}/${y.etiket}`);
    if (y.tur === 'kopru') return aile('gezer_kopru', { Ls: mm(y.Ls), N: y.N, ap: mm(y.ap), Hp: mm(y.Hp) }, `GEZER KÖPRÜ T${un}.01`);
    if (y.tur === 'seperator') return aile('kum_seperatoru', {}, `KUM SEPERATÖRÜ T${un}.03`);
    if (y.tur === 'konteyner') return aile('cop_konteyner', {}, `${y.etiket.startsWith('YAĞ') ? 'YAĞ' : 'KUM'} KONTEYNERİ T${un}.04 ${y.etiket}`);
    if (y.tur === 'korkuluk') return { type: 'korkuluk', props: { pts: y.pts.map(p => [...W2(p), y.z]), km: 'galvaniz', kh: 110, dik: 150, tk: 'E', kapali: false } };
    return null;
  }
  C.kumtutucuEkipman = (e, sessiz) => {
    if (!e.code && C.uniteNumarala) C.uniteNumarala(true);
    const G = geo(e), yer = ekipmanYer(G), once = new Set(e.ekAnahtar || []), yeniK = new Set(yer.map(y => y.anahtar));
    const mevcut = new Map(C.doc.ents.filter(x => x.bag === e.id && x.anahtar).map(x => [x.anahtar, x]));
    let n = 0, g = 0, el = 0;
    for (const y of yer) {
      const x = mevcut.get(y.anahtar), o = nesne(e, y); if (!o) continue;
      if (!x) { if (once.has(y.anahtar)) continue; const z = C.add(C.newEnt(o.type, Object.assign({}, o.props, { bag: e.id, anahtar: y.anahtar }))); delete z.sp; z.oto = imza(z); n++; continue; }
      if (x.oto !== imza(x)) { el++; continue; }
      const eski = x.oto; Object.assign(x, o.props); delete x._c; delete x._g; delete x._q; x.oto = imza(x); if (x.oto !== eski) { g++; if (C.touch) C.touch(x); }
    }
    const sil = [...mevcut.values()].filter(x => x.type !== 'su' && !yeniK.has(x.anahtar) && x.oto === imza(x)); if (sil.length && C.remove) C.remove(sil);
    if (C.suYapiBant) C.suYapiBant(e, G.bantlar);
    const f = C.frame(e.o, e.rot), W2 = p => { const w = f.at(p[0], p[1], 0); return [w[0], w[1]]; }, suM = new Map(C.doc.ents.filter(x => x.type === 'su' && x.bag === e.id).map(x => [x.anahtar, x]));
    if (C.ensureLayer) C.ensureLayer('INS_SU', 150, 'CONTINUOUS', 13);
    for (const s of su(G)) { const props = { pts: s.pts.map(W2), zb: s.zb, zs: s.maks, zsMaks: s.maks, zsMin: s.min, tur: 'atiksu', ad: s.ad, layer: 'INS_SU' }; const x = suM.get(s.anahtar); if (x) { Object.assign(x, props); delete x._c; } else { const z = C.add(C.newEnt('su', Object.assign(props, { bag: e.id, anahtar: s.anahtar }))); delete z.sp; } }
    e.ekipman = true; e.ekAnahtar = [...yeniK]; e._ekK = JSON.stringify([G.q, e.o, e.rot, e.code]); delete e._c;
    if (n || g) C.changed && C.changed();
    if (!sessiz) C.log(`✓ ${e.code || ''} kum ve yağ tutucu ekipmanı: ${n} yeni, ${g} güncellendi${el ? `, ${el} elle taşınmış (korundu)` : ''}.`);
  };
  C.on && C.on('changeIdle', () => { if (!C.doc) return; for (const e of C.doc.ents) if (e.type === 'kumtutucu' && e.ekipman) { const k = JSON.stringify([geo(e).q, e.o, e.rot, e.code]); if (e._ekK !== k) { if (e._ekK == null) { e._ekK = k; continue; } C.kumtutucuEkipman(e, true); } } });

  /* ================= KOMUT ================= */
  /* ünite kartından (K.kumKart): göz sayısı, bölmeler, boy, su derinliği, kotlar ve standart kalınlıklar */
  const karttan = () => {
    try {
      const Z = C.kart && C.kart.hesapla && C.kart.hesapla(), x = Z && Z.su.find(y => y.id === 'gr'), k = x && x.kart; if (!k || !k.params) return null;
      const v = id => (k.params.find(p => p.k === id) || {}).v, o = {};
      for (const [a, b] of [['N', 'N'], ['b', 'b'], ['bF', 'bF'], ['ta', 'ta'], ['h', 'h'], ['L', 'L'], ['tw', 'tw'], ['ti', 'ti'], ['bD', 'bD'], ['bC', 'bC'], ['ho', 'ho'], ['tb', 'td'], ['tr', 'tr'], ['zu', 'zu'], ['zz', 'zg']]) { const d = v(a); if (d != null && isFinite(+d) && (+d > 0 || a === 'zz')) o[b] = +d; }
      if (v('zs')) o.zs = +v('zs'); else { delete o.zu; delete o.zg; } // su kotu girilmemişse kotlar varsayılanda kalır
      return o.b && o.L && o.h ? o : null;
    } catch (err) { return null; }
  };
  const takeKV = () => { const kv = {}; C.cmd.queue = C.cmd.queue.filter(t => { const m = t.match(/^([A-Za-zÇĞİÖŞÜçğıöşü_0-9]+)=(.*)$/); if (m) { kv[C.up(m[1])] = m[2]; return false; } return true; }); return kv; };
  C.addCommand(['KUMTUTUCU', 'KUMYAGTUTUCU'], 'Kum ve yağ tutucu (havalandırmalı, gezer köprülü — Çokal T-103 düzeni): gözler, dağıtma ve çıkış kanalı, kum oluğu, gezer köprü, kum seperatörü. KUMTUTUCU [N=2 B=1.0 BF=0.4 L=11.4 H=1.26 SU=97.45 UST=99.15 ZEMIN=95.5]; değerler ünite kartından da alınır', async (I) => {
    const kv = takeKV(), kt = karttan();
    const e = C.newEnt('kumtutucu', Object.assign(JSON.parse(JSON.stringify(DEF)), kt || {}, { layer: C.std('BETON'), u: 'gr', name: 'Kum ve yağ tutucu', o: [0, 0, 0], rot: 0, sira: Date.now() }));
    for (const [k, p] of Object.entries({ N: 'N', B: 'b', BF: 'bF', L: 'L', H: 'h', SU: 'zs', UST: 'zu', ZEMIN: 'zg' })) if (kv[k] != null && isFinite(C.num(kv[k]))) e[p] = C.num(kv[k]);
    if (kt) C.log('Değerler ünite kartından alındı.');
    C.cmd.base = null; C.cmd.preview = c => T.kumtutucu.prims(Object.assign({}, e, { o: c, _c: null }));
    const p = await I.pt('Yapının sol alt köşesi (dağıtma kanalı tarafı)'); C.cmd.preview = null; if (!p || typeof p === 'string') return; e.o = [p[0], p[1], 0];
    C.cmd.base = p; C.cmd.preview = c => T.kumtutucu.prims(Object.assign({}, e, { rot: M.deg(M.ang(p, c)), _c: null }));
    const a = await I.angle('Dönüş açısı', p, 0); C.cmd.preview = null; e.rot = typeof a === 'number' ? a : 0;
    C.add(e); if (C.uniteNumarala) C.uniteNumarala(true); if (kv.EKIPMAN !== 'H') C.kumtutucuEkipman(e);
    C.log(`✓ ${T.kumtutucu.info(e)}`);
  });
  C.addCommand(['KUMEKIPMAN', 'KUMTUTUCUEKIPMAN'], 'Kum ve yağ tutucunun kapak, gezer köprü, kum seperatörü, konteyner ve korkuluklarını yerleştirir / günceller (elle taşınanlar korunur)', async () => {
    const e = (C.sel || []).find(x => x.type === 'kumtutucu') || C.doc.ents.find(x => x.type === 'kumtutucu'); if (!e) return C.warn('Çizimde kum ve yağ tutucu yok.');
    C.kumtutucuEkipman(e);
  });
  if (C.ribbon && C.ribbon.tabs) {
    const tab = C.ribbon.tabs.find(t => t[0] === 'Arıtma'), pr = tab && tab[1].find(p => p[0] === 'Proses');
    if (pr && !pr[1].some(b => b.cmd === 'KUMTUTUCU')) { pr[1].push({ cmd: 'KUMTUTUCU', t: 'Kum-yağ tutucu', i: 'ctank' }); try { C.ribbon.render(); } catch (err) { } }
  }
  if (window.DIL) window.DIL.ekle('en', 'English', [['Kum-yağ tutucu', 'Grit and grease chamber'], ['KUM KANALI', 'GRIT CHANNEL'], ['YAĞ KANALI', 'GREASE CHANNEL'], ['KUM OLUĞU', 'GRIT TROUGH'], ['DAĞITMA KANALI', 'DISTRIBUTION CHANNEL'], ['ÇIKIŞ KANALI', 'OUTLET CHANNEL'], ['GEZER KÖPRÜ', 'TRAVELLING BRIDGE'], ['KUM SEPERATÖRÜ', 'GRIT CLASSIFIER']]);
})(typeof window !== 'undefined' ? window.C : (globalThis.C || null));

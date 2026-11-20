/* ArıtmaCAD — ÜRETİCİ MODELLİ DALGIÇ MİKSER: KSB AmaProp 2603 (yavaş devirli, Ø2603 mm pervane, 45 d/dk, 5,5 kW, MA16M 4 kutup, SP190 X dişli)
   Veri: app/mikser-ksb-veri.js (3Dfindit üretici modeli; üretici: araclar/mikser-ksb-uret.js). Föy (AmaProp V 045 2603.pdf): NoriRoc ayak,
   6000 mm kılavuz ray, döner üst tutucu, yatay sabit kurulum, mikser merkezi "tabandan" 1450 mm (modelde pervane ekseni ayak altından 1610 mm;
   aradaki 160 mm rayın başladığı yükseklik — model ayak altı havuz tabanına oturtulur).
   Dalgıç mikser ailesi (aile-mekanik.js, dalgic_mikser) par.model = 'ksb_amaprop_2603' iken plan ve 3B'yi buradan çizer:
   - Ayak, kızak, motor, dişli, pervane, askı kolu modeldeki gibi (yerel: x enine, y itki, z tabandan; orijin motorun arkası).
   - Üst tutucu yürüme yolu tabliyesinin ön yüzüne (yerel y = −0,518; aile direğiyle aynı yer) ve tabliye üstünün 50 mm altına taşınır;
     kılavuz ray altta sabit, üstte tutucuya kadar uzar / kısalır (Hd: taban → tabliye üstü).
   Seçim: C.mikserModelBul({ D, P }) — 5,5 kW yavaş devirli (Ø ≥ 1,8 m) mikser bu modeli kullanır (kullanıcı kararı 20.11.2026).
   Saf kısım (yerlesim, modelBul) Node ile denenir: node test/mikser-ksb.test.js */
(function (C) {
  'use strict';
  const MODEL = {
    ksb_amaprop_2603: { veri: '2603', ad: 'KSB AmaProp 2603', D: 2603, P: 5.5, rpm: 45, motor: 'MA16M, 4 kutup, IE3', disli: 'SP190 X', rayY: -248, tutucuY: -518 },
  };
  const ARALIK = 50; // üst tutucunun tepesi tabliye üstünün bu kadar altında (mm)

  /* hangi mikser hangi üretici modelini kullanır: 5,5 kW yavaş devirli (pervane Ø ≥ 1,8 m; D m ya da mm) → KSB AmaProp 2603 */
  const modelBul = o => { if (!o) return null; const P = +o.P, D = +o.D, Dm = D > 20 ? D / 1000 : D; return Math.abs(P - 5.5) < 0.05 && Dm >= 1.8 ? 'ksb_amaprop_2603' : null; };

  /* düşey yerleşim (mm): Hd taban → tabliye üstü. → { dz: üst tutucu kayması, k: ray düşey ölçeği, z0: ray altı } */
  const yerlesim = (V, Hd) => {
    const P = ad => V.parca.find(p => p.ad === ad), ray = P('ray').bb[2], tut = P('ustTutucu').bb[2], ust = P('ustTutucu');
    const hedef = Math.max(+Hd || 0, V.parca.find(p => p.ad === 'askiKolu').bb[2][1] + 600) - ARALIK; // tutucu en az askı kolunun 0,60 m üstünde
    const dz = hedef - tut[1], z0 = ray[0], rayUst = ray[1] + dz;
    return { dz, z0, k: (rayUst - z0) / (ray[1] - z0), tutucuUst: hedef, rayBoy: rayUst - z0, ust };
  };

  const api = { MODEL, modelBul, yerlesim, ARALIK };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!C) return;
  C.mikserModelBul = modelBul;

  /* veriyi çöz (bir kez) */
  const DEC = {};
  const b64 = s => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  const veri = md => { const V = C.MIKSER_KSB_VERI && C.MIKSER_KSB_VERI[md.veri]; if (!V) return null; return DEC[md.veri] || (DEC[md.veri] = Object.assign({}, V, { parca: V.parca.map(p => Object.assign({}, p, { V: new Int16Array(b64(p.v)), F: new Uint16Array(b64(p.f)) })) })); };
  /* aile.js frameOf ile aynı: yerel (x enine, y itki, z) → dünya */
  const cerceve = e => { e = e || {}; const r = (+e.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), p = e.p || [0, 0, 0], z0 = +e.z || 0; return ([x, y, z]) => [p[0] + y * c - x * s, p[1] + y * s + x * c, z0 + (z || 0)]; };
  const RENK = { ayak: [0.25, 0.27, 0.30], ray: [0.80, 0.81, 0.83], ustTutucu: [0.62, 0.64, 0.66], kizak: [0.12, 0.30, 0.62], motor: [0.12, 0.30, 0.62], disli: [0.12, 0.30, 0.62], pervane: [0.82, 0.60, 0.15], askiKolu: [0.70, 0.72, 0.74] };
  const zDon = (Y, ad) => z => ad === 'ustTutucu' ? z + Y.dz : ad === 'ray' ? Y.z0 + (z - Y.z0) * Y.k : z;

  C.mikserModel = {};
  for (const [kod, md] of Object.entries(MODEL)) C.mikserModel[kod] = Object.assign({}, md, {
    var: () => !!veri(md),
    hm: () => { const V = veri(md); return V ? V.gobek[1] : 1610; }, // pervane ekseni tabandan (mm)
    pervaneY: () => { const V = veri(md); return V ? V.parca.find(p => p.ad === 'pervane').bb[1][1] / 1000 : 1.11; }, // pervanenin ön ucu (m)
    /* 3B: modelin üçgenleri doğrudan (g.out), dünya koordinatında */
    mesh: (q, g, e) => {
      const V = veri(md); if (!V) return false; const Y = yerlesim(V, q.Hd), out = g.out, W = cerceve(e);
      for (const p of V.parca) {
        const zf = zDon(Y, p.ad), v0 = out.v.length, A = p.V, F = p.F, col = RENK[p.ad] || p.renk;
        for (let i = 0; i < A.length; i += 3) out.v.push(W([A[i] / 1000, A[i + 1] / 1000, zf(A[i + 2]) / 1000]));
        for (let i = 0; i < F.length; i += 3) { out.f.push([v0 + F[i], v0 + F[i + 1], v0 + F[i + 2]]); out.fc.push(col); }
      }
      return true;
    },
    /* plan: parça parça izdüşüm zarfı (pervane kalın) */
    plan: (q, g) => {
      const V = veri(md); if (!V) return false;
      for (const p of V.parca) g.cok(p.plan.map(([x, y]) => [x / 1000, y / 1000]), true, { lw: p.ad === 'pervane' ? 50 : p.ad === 'ray' || p.ad === 'ustTutucu' ? 25 : 35 });
      return true;
    },
  });
})(typeof window !== 'undefined' ? window.C : null);

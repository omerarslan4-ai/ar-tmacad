/* ArıtmaCAD — PARAMETRİK HAVUZ (ayrı modül)
   Tek pencereden ölçü girerek hazır betonarme havuz modeli: OVAL (yarım daire uçlu / oksidasyon hendeği), DAİRESEL, DİKDÖRTGEN.
   Oluşturulan: dış perde (kapalı), istenirse orta perde ve uçlarda J yönlendirme perdeleri, radye (pabuçlu), su tutucu bant.
   Hepsi gerçek inşaat elemanıdır (perde / plak radye): doğrudan STATIKMODEL ile statik hesaba gönderilir, paftalara geçer.
   Komut: HAVUZ (OVALHAVUZ, PARAMHAVUZ). Şerit: İnşaat › Taşıyıcı sistem ve Arıtma sekmesi. */
(function (C) {
  'use strict';
  const r4 = v => Math.round(v * 10000) / 10000;
  const yay = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [r4(cx + r * Math.cos(a)), r4(cy + r * Math.sin(a))]; });
  const ofsetKapali = (pts, d) => { // CCW poligonu d kadar dışa büyüt
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p = pts[i], p1 = pts[(i + 1) % n];
      const n0 = (() => { const L = Math.hypot(p[0] - p0[0], p[1] - p0[1]) || 1; return [(p[1] - p0[1]) / L, -(p[0] - p0[0]) / L]; })(), n1 = (() => { const L = Math.hypot(p1[0] - p[0], p1[1] - p[1]) || 1; return [(p1[1] - p[1]) / L, -(p1[0] - p[0]) / L]; })();
      const s = [n0[0] + n1[0], n0[1] + n1[1]], dd = 1 + n0[0] * n1[0] + n0[1] * n1[1], k = d / Math.max(dd, 0.2); out.push([r4(p[0] + s[0] * k), r4(p[1] + s[1] * k)]); }
    return out; };

  const olustur = (o, P0) => {
    const t = +o.t, ti = +o.ti, H = +o.H, hr = +o.hr, toe = +o.toe, z0 = +o.z0, X = P0[0], Y = P0[1], N = 24, made = [], lay = C.insLayerFor ? C.insLayerFor({ type: 'perde' }) : 'INS_PERDE';
    if (C.INS_LAYERS && C.INS_LAYERS[lay]) C.ensureLayer(lay, C.INS_LAYERS[lay][0], 'CONTINUOUS', C.INS_LAYERS[lay][1]); else C.ensureLayer(lay);
    const perde = (pts, kapali, tb, no) => { const e = C.add(C.newEnt('perde', { pts: pts.map(q => [r4(q[0] + X), r4(q[1] + Y)]), closed: !!kapali, hiza: 'O', ofs: 0, egim: 'R', tb, tt: tb, h: H, z0, malz: 'beton', beton: o.beton || 'C30/37', layer: lay, no, zoto: 'EL', hoto: 'EL' })); delete e.sp; made.push(e); if (o.bant === 'E' && C.addPerdeBant) { const b = C.addPerdeBant(e, 0.1, { w: 20, t: 5 }); if (b) made.push(b); } return e; };
    let eks = [], dis = null; // dış perde ekseni (CCW)
    if (o.tip === 'OVAL') { const L = +o.L, R = +o.B / 2 + t / 2; // L: yarım daire merkezleri arası (düz kısım), B: iç genişlik
      eks = [[0, -R], [L, -R], ...yay(L, 0, R, -Math.PI / 2, Math.PI / 2, N).slice(1, -1), [L, R], [0, R], ...yay(0, 0, R, Math.PI / 2, 3 * Math.PI / 2, N).slice(1, -1)];
      dis = perde(eks, true, t, 'P1');
      if (o.orta === 'E') { // orta perde: yay merkezleri arası (uçlarda kanal dönüşü açık)
        const kis = Math.max(0, +o.ortaKisa || 0); perde([[kis, 0], [L - kis, 0]], false, ti, 'P2');
        if (o.j === 'E') { const w = (+o.B - ti) / 2, rj = ti / 2 + w / 2 + ti / 2 * 0; // kanal ortasında yarım daire yönlendirme perdesi
          perde(yay(L, 0, rj, -Math.PI / 2, Math.PI / 2, 12), false, ti, 'P3'); perde(yay(0, 0, rj, Math.PI / 2, 3 * Math.PI / 2, 12), false, ti, 'P4'); } }
    } else if (o.tip === 'DAIRE') { const R = +o.B / 2 + t / 2; eks = yay(0, 0, R, 0, 2 * Math.PI, 48).slice(0, -1); dis = perde(eks, true, t, 'P1'); }
    else { const Lx = +o.L + t, Ly = +o.B + t; eks = [[0, 0], [Lx, 0], [Lx, Ly], [0, Ly]]; dis = perde(eks, true, t, 'P1');
      if (o.orta === 'E') perde([[t / 2 + (+o.ortaKisa || 0), Ly / 2], [Lx - t / 2 - (+o.ortaKisa || 0), Ly / 2]], false, ti, 'P2'); }
    void dis;
    // radye: dış yüz + pabuç
    const rp = ofsetKapali(eks, t / 2 + toe).map(q => [r4(q[0] + X), r4(q[1] + Y)]), rlay = C.insLayerFor ? C.insLayerFor({ type: 'plak', kind: 'radye' }) : 'INS_RADYE';
    if (C.INS_LAYERS && C.INS_LAYERS[rlay]) C.ensureLayer(rlay, C.INS_LAYERS[rlay][0], 'CONTINUOUS', C.INS_LAYERS[rlay][1]); else C.ensureLayer(rlay);
    const r = C.add(C.newEnt('plak', { kind: 'radye', pts: rp, t: hr, zt: z0, beton: o.beton || 'C30/37', layer: rlay, no: 'R1' })); delete r.sp; made.push(r);
    return made;
  };

  const PAR = [
    { k: 'tip', t: 'Havuz tipi', opts: [['OVAL', 'Oval — yarım daire uçlu (oksidasyon hendeği / havalandırma)'], ['DAIRE', 'Dairesel'], ['DIK', 'Dikdörtgen']], d: 'OVAL', al: ['TIP'] },
    { k: 'L', t: 'Düz kısım uzunluğu L (m) — oval: yarım daire merkezleri arası · dikdörtgen: iç uzunluk', d: 20, al: ['L'] },
    { k: 'B', t: 'İç genişlik / iç çap B (m)', d: 8, al: ['B'] },
    { k: 'H', t: 'Perde yüksekliği H (m) — radye üstünden', d: 5, al: ['H'] },
    { k: 't', t: 'Dış perde kalınlığı (m)', d: 0.40, al: ['T'] },
    { k: 'orta', t: 'Orta perde (kanal ayırıcı)', opts: [['E', 'Var'], ['H', 'Yok']], d: 'E', al: ['ORTA'] },
    { k: 'ti', t: 'Orta / iç perde kalınlığı (m)', d: 0.30, al: ['TI'] },
    { k: 'ortaKisa', t: 'Orta perde uçlarında kısaltma (m) — 0: yay merkezine kadar', d: 0, al: ['KISA'] },
    { k: 'j', t: 'Uçlarda yarım daire yönlendirme (J) perdeleri — yalnız oval', opts: [['H', 'Yok'], ['E', 'Var']], d: 'H', al: ['J'] },
    { k: 'hr', t: 'Radye kalınlığı (m)', d: 0.50, al: ['HR'] },
    { k: 'toe', t: 'Radye taşması / pabuç (m)', d: 0.50, al: ['TOE'] },
    { k: 'z0', t: 'Radye üst kotu (m)', d: 0, al: ['Z0'] },
    { k: 'bant', t: 'Perdelere su tutucu bant', opts: [['E', 'Konsun'], ['H', 'Konmasın']], d: 'E', al: ['BANT'] },
    { k: 'beton', t: 'Beton sınıfı', s: true, d: 'C30/37', al: ['BETON'] },
  ];
  C.havuzParam = olustur;
  C.addCommand(['HAVUZ', 'OVALHAVUZ', 'PARAMHAVUZ'], 'Ölçü girerek oval / dairesel / dikdörtgen betonarme havuz modeli (perde + orta perde + J perdeleri + radye + su tutucu bant)', async (I) => {
    const G = C._ins && C._ins.getParams; let o = {}; PAR.forEach(f => { o[f.k] = f.d; });
    if (G) { const r = await G('Parametrik havuz', PAR, 'havuzParam'); if (!r) return; o = r; }
    for (const k of ['L', 'B', 'H', 't', 'ti', 'ortaKisa', 'hr', 'toe', 'z0']) o[k] = +o[k];
    if (!(o.B > 0) || !(o.H > 0) || !(o.t > 0) || (o.tip !== 'DAIRE' && !(o.L > 0))) { C.warn('Havuz: L, B, H ve kalınlık sıfırdan büyük olmalı.'); return; }
    let p = await I.pt('Yerleştirme noktası (oval: sol yarım daire merkezi · daire: merkez · dikdörtgen: sol alt köşe ekseni), Enter = 0,0'); if (!p || typeof p === 'string') p = [0, 0, 0];
    C.begin && C.begin();
    const made = olustur(o, p); C.changed(); C.sel = made.filter(e => e.type !== 'yalitim'); C.emit('selection');
    const ad = { OVAL: 'Oval', DAIRE: 'Dairesel', DIK: 'Dikdörtgen' }[o.tip];
    C.log(`${ad} havuz oluşturuldu: ${made.filter(e => e.type === 'perde').length} perde, radye ${Math.round(o.hr * 100)} cm${o.bant === 'E' ? ', su tutucu bant' : ''}. Statik hesap için: Statik › Modelden gönder (STATIKMODEL). Ölçüleri değiştirmek için perdeleri silip HAVUZ'u yeniden çalıştırın ya da perde özelliklerinden düzenleyin.`);
  });

  /* şerit: İnşaat › Taşıyıcı sistem ve Arıtma sekmesinin ilk paneli */
  const serit = () => { try {
    const R = C.ribbon, BT = { cmd: 'HAVUZ', t: 'Parametrik havuz', i: 'found' };
    const ekle = () => { let d = false; for (const t of (R && R.tabs) || []) for (const p of t[1]) if ((t[0] === 'İnşaat' && p[0] === 'Taşıyıcı sistem') || (t[0] === 'Arıtma' && t[1].indexOf(p) === 0)) if (!p[1].some(x => x.cmd === 'HAVUZ')) { p[1].unshift(BT); d = true; } return d; };
    if (R && !R._havuzParam) { R._havuzParam = true; const r0 = R.render; R.render = function () { try { ekle(); } catch (er) { } const x = r0.apply(this, arguments); try { if (ekle()) r0.apply(this, arguments); } catch (er) { } return x; }; R.render(); }
  } catch (er) { console.error('HAVUZ şerit', er); } };
  if (typeof window !== 'undefined') { if (document.readyState === 'complete') serit(); else window.addEventListener('load', serit); }
})(window.C);

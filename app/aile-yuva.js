/* ArıtmaCAD — AİLE YUVASI: penstock (ve yuva parametreli aileler) için yan perdelerde yuva (cep) açar.
   YUVAAC: aileyi seçin → her iki yan perdede kapak çerçevesinin oturduğu yuva oyulur:
     yuva genişliği yk (perde içine), akış yönünde yd, perdenin tüm yüksekliği boyunca.
   Yöntem: perde yuva boyunca ayrı parçaya bölünür (PERDEPARCA altyapısı), parçanın kalınlığı yk kadar azaltılır,
   dış yüzü yerinde kalır. Planda, kesitte, 3B'de ve metrajda doğru görünür. Geri al ile geri alınır. */
(function (C) {
  'use strict';
  const M = C.M, RAD = Math.PI / 180;
  const p2 = p => [p[0], p[1]];
  const projYol = (e, q) => { // perde yolu üzerinde en yakın nokta: {d, s}
    const P0 = C.perdePath(e), { p, cum, n } = P0; let best = { d: Infinity, s: 0 };
    for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % p.length], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-12; let t = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2; t = Math.max(0, Math.min(1, t)); const x = a[0] + dx * t, y = a[1] + dy * t, d = Math.hypot(q[0] - x, q[1] - y); if (d < best.d) best = { d, s: cum[i] + t * Math.sqrt(l2), i }; }
    return best;
  };
  const yuvaAc = (fam) => {
    const q = C.aileDegerE(fam); if (!q || !(q.yk > 0) || !(q.yd > 0) || !(q.B > 0)) throw new Error('Bu ailede yuva parametresi (B, yk, yd) yok.');
    const r = (+fam.rot || 0) * RAD, c = Math.cos(r), s = Math.sin(r), P = M.p3(fam.p || [0, 0, 0]), ex = [-s, c], z0 = +fam.z || 0;
    const B = q.B / 1000, yk = q.yk / 1000, yd = q.yd / 1000, sonuc = [];
    for (const sg of [-1, 1]) {
      const Q = [P[0] + ex[0] * sg * (B / 2 + yk / 2), P[1] + ex[1] * sg * (B / 2 + yk / 2)];
      let best = null;
      for (const e of C.doc.ents) {
        if (e.type !== 'perde' || e.kicker || e.parapet || e.host || !C.layer(e.layer).on) continue;
        const zt = (+e.z0 || 0) + (+e.h || 3); if (zt < z0 + 0.1) continue;
        const pr = projYol(e, Q), t = Math.max(+e.tb || 0.3, +e.tt || 0.3);
        if (pr.d <= t / 2 + 0.15 && (!best || pr.d < best.pr.d)) best = { e, pr, t };
      }
      if (!best) { sonuc.push(`${sg < 0 ? 'Sol' : 'Sağ'} yan: perde bulunamadı`); continue; }
      const { e, t } = best; if (yk >= t - 0.05) { sonuc.push(`${e.no || 'perde'}: yuva (${q.yk} mm) perde kalınlığından büyük`); continue; }
      const sc = projYol(e, [P[0], P[1]]).s;
      const parca = C.perdeParca(e, sc - yd / 2, sc + yd / 2); if (!parca) continue;
      // parçanın yüzleri: kanal tarafındaki yüz yk kadar geri çekilir
      const F = C._ins.faceOffs(parca), sf = C._ins.segFrames(parca)[0]; if (!sf) continue;
      const kanalSol = (P[0] - sf.a[0]) * sf.nn[0] + (P[1] - sf.a[1]) * sf.nn[1] > 0; // kanal perdenin sol (nn) tarafında mı
      const tb = (+parca.tb || 0.3) - yk, tt = (parca.tt != null && parca.tt !== '' ? +parca.tt : +parca.tb || 0.3) - yk;
      const disYuz = kanalSol ? F.rB : F.lB, ofs = kanalSol ? disYuz + tb / 2 : disYuz - tb / 2;
      Object.assign(parca, { tb: +tb.toFixed(4), tt: +tt.toFixed(4), hiza: 'O', ofs: +ofs.toFixed(4), egim: 'B', yuvaOf: fam.id }); delete parca._c;
      sonuc.push(`${e.no || 'perde'}: ${Math.round(yd * 1000)} × ${q.yk} mm yuva`);
    }
    return sonuc;
  };
  C.aileYuvaAc = yuvaAc;
  C.addCommand(['YUVAAC', 'AILEYUVA', 'PENSTOCKYUVA'], 'Penstock gibi duvar yuvalı ailelerde iki yan perdeye yuva (cep) açar: aileyi seçin. Yuva genişliği yk, akış yönü boyu yd ailenin parametrelerinden alınır.', async (I) => {
    let s = (C.sel || []).filter(e => e.type === 'aile');
    if (!s.length) { s = (await I.sel('Yuva açılacak aileyi (penstock) seçin')) || []; s = s.filter(e => e.type === 'aile'); }
    if (!s.length) { C.warn('Aile (penstock) seçilmedi.'); return; }
    for (const f of s) { try { const r = yuvaAc(f); C.log(`${f.no || f.tip || 'Aile'}: ${r.join(' · ')}`); } catch (er) { C.warn(er.message); } }
    C.changed();
  });
  // şerit: Mekanik sekmesindeki aile paneline
  try {
    const R = C.ribbon; if (R && Array.isArray(R.tabs)) for (const tn of ['Mekanik', 'Arıtma']) { const tab = R.tabs.find(t => t[0] === tn); if (!tab) continue; const pn = tab[1].find(p => p[1].some(b => b && /^AILE/.test(b.cmd || ''))); if (pn && !pn[1].some(b => b.cmd === 'YUVAAC')) pn[1].push({ cmd: 'YUVAAC', t: 'Perdeye yuva aç', i: 'cut' }); }
    R && R.render && R.render();
  } catch (er) { console.error('yuva şerit', er); }
})(window.C);

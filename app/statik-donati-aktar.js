/* ArıtmaCAD — statik donatı aktarımı yardımcıları (ayrı modül)
   • Sıkıştırılmış donatı verisini açar (statik pencere açıcıdan bağımsız açıldığında localStorage sınırına sığması için)
   • Radye donatısını (eleman 'Temel') modeldeki radyenin gerçek kenarlarına uyarlar: hesap pabucu her yönde eşit (en küçük taşma)
     kabul eder; modelde bir yönde radye daha geniş ise o yöndeki çubuk uçları, U kollar ve takozlar radye kenarına uzatılır. */
(function (C) {
  'use strict';
  C._statikDonatiCoz = d => {
    if (!d || !d.sikistir) return d;
    d.gruplar = d.gruplar.map(g => (g.z ? Object.assign({}, g, { z: undefined, bars: g.bars.map(f => { const out = []; let x = 0, y = 0, z = 0; for (let i = 0; i < f.length; i += 3) { x += f[i]; y += f[i + 1]; z += f[i + 2]; out.push([x / 1000, y / 1000, z / 1000]); } return out; }) }) : g));
    d.sikistir = false; return d;
  };
  C._statikDonatiUyarla = (g, mdl, d) => {
    if (g.eleman !== 'Temel' || !(d.toe > 0) || !mdl || mdl.geo.radyeId == null) return g.bars;
    const rad = C.byId(mdl.geo.radyeId); if (!rad || !rad.pts) return g.bars;
    const k = mdl.koken, xs = rad.pts.map(p => p[0] - k[0]), ys = rad.pts.map(p => p[1] - k[1]), cR = d.cR || 0.05, t0 = d.toe;
    const Lx = d.Lx || mdl.geo.Lx, Ly = d.Ly || mdl.geo.Ly, LMx = mdl.geo.Lx, LMy = mdl.geo.Ly;
    const tW = -Math.min(...xs), tE = Math.max(...xs) - LMx, tS = -Math.min(...ys), tN = Math.max(...ys) - LMy;
    if ([tW, tE, tS, tN].every(t => Math.abs(t - t0) < 0.01) && Math.abs(Lx - LMx) < 0.01 && Math.abs(Ly - LMy) < 0.01) return g.bars;
    const uc = (u, tm) => (t0 - cR > 0.005 && u <= t0 - cR ? u * (tm - cR) / (t0 - cR) : u + (tm - t0)); // u: dış perde yüzünden dışa mesafe
    const es = (v, L, LM, tA, tB) => (v < 0 ? -uc(-v, tA) : v > L ? LM + uc(v - L, tB) : v);
    if (!C._radUyarlaLog) { C._radUyarlaLog = 1; setTimeout(() => { C._radUyarlaLog = 0; C.log(`Radye donatısı modeldeki radye kenarlarına uyarlandı (pabuç: batı ${Math.round(tW * 100)}, doğu ${Math.round(tE * 100)}, güney ${Math.round(tS * 100)}, kuzey ${Math.round(tN * 100)} cm; hesapta ${Math.round(t0 * 100)} cm).`); }, 0); }
    return g.bars.map(b => b.map(q => [es(q[0], Lx, LMx, tW, tE), es(q[1], Ly, LMy, tS, tN), q[2]]));
  };
})(window.C);

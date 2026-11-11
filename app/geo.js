/* ArıtmaCAD — koordinat sistemleri: WGS84 Transversal Merkatör (UTM / TM3 / yerel), Web Merkatör */
(function (C) {
  'use strict';
  const G = C.geo = {};
  const a = 6378137, f = 1 / 298.257223563, e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const e4 = e2 * e2, e6 = e4 * e2, D2R = Math.PI / 180;
  const Mlat = p => a * ((1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * p - (3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * p) + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * p) - (35 * e6 / 3072) * Math.sin(6 * p));

  G.tmFwd = (lat, lon, cm, k0, fe, fn) => {
    const p = lat * D2R, l = (lon - cm) * D2R;
    const s = Math.sin(p), c = Math.cos(p), t = Math.tan(p);
    const N = a / Math.sqrt(1 - e2 * s * s), T = t * t, Cc = ep2 * c * c, A = l * c;
    const x = k0 * N * (A + (1 - T + Cc) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * Cc - 58 * ep2) * A ** 5 / 120) + fe;
    const y = k0 * (Mlat(p) + N * t * (A * A / 2 + (5 - T + 9 * Cc + 4 * Cc * Cc) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * Cc - 330 * ep2) * A ** 6 / 720)) + fn;
    return [x, y];
  };
  G.tmInv = (x, y, cm, k0, fe, fn) => {
    const Mv = (y - fn) / k0;
    const mu = Mv / (a * (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256));
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const p1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
    const s = Math.sin(p1), c = Math.cos(p1), t = Math.tan(p1);
    const C1 = ep2 * c * c, T1 = t * t, N1 = a / Math.sqrt(1 - e2 * s * s), R1 = a * (1 - e2) / Math.pow(1 - e2 * s * s, 1.5), D = (x - fe) / (N1 * k0);
    const lat = p1 - (N1 * t / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4 / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6 / 720);
    const lon = cm * D2R + (D - (1 + 2 * T1 + C1) * D ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5 / 120) / c;
    return [lat / D2R, lon / D2R];
  };

  G.utmZone = lon => Math.floor((lon + 180) / 6) + 1;
  G.tm3Cm = lon => Math.round(lon / 3) * 3;

  G.isSet = () => C.doc && C.doc.set.geo && C.doc.set.geo.mode !== 'none';
  G.params = () => {
    const g = C.doc.set.geo;
    if (g.mode === 'utm') return { cm: -183 + 6 * g.zone, k0: 0.9996, fe: 500000, fn: (g.south ? 10000000 : 0) };
    if (g.mode === 'tm3') return { cm: g.cm, k0: 1, fe: 500000, fn: 0 };
    if (g.mode === 'tm') return { cm: g.cm, k0: g.k0, fe: g.fe, fn: g.fn };
    return { cm: g.lon0, k0: 1, fe: 0, fn: 0 }; // yerel
  };
  /* çizim (x,y) -> [enlem, boylam] */
  G.toLL = p => {
    const g = C.doc.set.geo, q = G.params();
    let x = p[0], y = p[1];
    if (g.mode === 'local') {
      const r = (g.rot || 0) * D2R, n0 = G.tmFwd(g.lat0, g.lon0, q.cm, 1, 0, 0)[1];
      const xr = x * Math.cos(r) - y * Math.sin(r), yr = x * Math.sin(r) + y * Math.cos(r);
      return G.tmInv(xr, yr + n0, q.cm, 1, 0, 0);
    }
    return G.tmInv(x, y, q.cm, q.k0, q.fe, q.fn);
  };
  /* [enlem, boylam] -> çizim (x,y) */
  G.toXY = (lat, lon) => {
    const g = C.doc.set.geo, q = G.params();
    if (g.mode === 'local') {
      const n0 = G.tmFwd(g.lat0, g.lon0, q.cm, 1, 0, 0)[1];
      const [x, y0] = G.tmFwd(lat, lon, q.cm, 1, 0, 0), y = y0 - n0;
      const r = -(g.rot || 0) * D2R;
      return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r), 0];
    }
    const r = G.tmFwd(lat, lon, q.cm, q.k0, q.fe, q.fn);
    return [r[0], r[1], 0];
  };
  G.describe = () => {
    const g = C.doc.set.geo;
    if (g.mode === 'utm') return `UTM ${g.zone}${g.south ? 'S' : 'N'} (WGS84)`;
    if (g.mode === 'tm3') return `TM3 DOM ${g.cm}° (ITRF96/WGS84)`;
    if (g.mode === 'tm') return `TM DOM ${g.cm}° k0=${g.k0}`;
    if (g.mode === 'local') return `Yerel: 0,0 = ${g.lat0.toFixed(6)}, ${g.lon0.toFixed(6)}${g.rot ? ' dönüş ' + g.rot + '°' : ''}`;
    return 'Tanımsız';
  };

  /* Web Merkatör piksel (256 karo) */
  G.wmX = (lon, z) => (lon + 180) / 360 * 256 * Math.pow(2, z);
  G.wmY = (lat, z) => { const s = Math.sin(lat * D2R); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * Math.pow(2, z); };
  G.wmLon = (x, z) => x / (256 * Math.pow(2, z)) * 360 - 180;
  G.wmLat = (y, z) => { const n = Math.PI - 2 * Math.PI * y / (256 * Math.pow(2, z)); return Math.atan(Math.sinh(n)) / D2R; };
})(typeof window !== 'undefined' ? window.C : globalThis.C);

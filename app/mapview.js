/* ArıtmaCAD — uydu/sokak haritası altlığı; çizim komutları harita üzerinde aynen çalışır */
(function (C) {
  'use strict';
  const M = C.M, G = C.geo;
  C.TILES = {
    uydu: { name: 'Uydu (Esri)', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', max: 19, attr: 'Görüntü © Esri, Maxar, Earthstar Geographics' },
    sokak: { name: 'Sokak (Esri)', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', max: 19, attr: '© Esri, HERE, Garmin, OpenStreetMap katkıcıları' },
    topo: { name: 'Topoğrafik (Esri)', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', max: 19, attr: '© Esri ve katkıcılar' },
    osm: { name: 'OpenStreetMap', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', max: 19, attr: '© OpenStreetMap katkıcıları' },
  };
  const LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

  class MapView extends C.View2D {
    constructor(canvas) {
      super(canvas, { dark: true });
      this.lat = 39.0; this.lon = 35.0; this.z = 6; this.src = 'uydu'; this.labels = true; this.opacity = 1;
      this.cache = new Map(); this.grid = false; this.isMap = true;
      this.bg = (ctx) => this.drawTiles(ctx);
      this.sync();
    }
    /* harita merkezinden View2D dönüşümünü türet */
    sync() {
      if (!C.doc || !G.isSet()) { this.cx = 0; this.cy = 0; this.s = 1; this.rot = 0; this.dirty = true; return; }
      const d = 1e-4, p1 = G.toXY(this.lat, this.lon), p2 = G.toXY(this.lat, this.lon + d);
      const px = G.wmX(this.lon + d, this.z) - G.wmX(this.lon, this.z);
      this.cx = p1[0]; this.cy = p1[1];
      this.s = px / Math.max(1e-12, M.dist2(p1, p2));
      this.rot = -Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
      this.dirty = true;
      if (this.onViewChange) this.onViewChange();
    }
    tileUrl(t, z, x, y) { return t.replace('{z}', z).replace('{x}', x).replace('{y}', y); }
    img(url) {
      let im = this.cache.get(url);
      if (!im) {
        im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { this.dirty = true; }; im.onerror = () => { im.bad = true; };
        im.src = url; this.cache.set(url, im);
        if (this.cache.size > 600) { const k = this.cache.keys().next().value; this.cache.delete(k); }
      }
      return im;
    }
    drawTiles(ctx) {
      const t = C.TILES[this.src] || C.TILES.uydu;
      const zi = Math.max(1, Math.min(t.max, Math.round(this.z))), k = Math.pow(2, this.z - zi);
      const cxp = G.wmX(this.lon, this.z), cyp = G.wmY(this.lat, this.z);
      const x0 = cxp - this.W / 2, y0 = cyp - this.H / 2, ts = 256 * k;
      const n = Math.pow(2, zi);
      const layers = [t.url]; if (this.labels && this.src === 'uydu') layers.push(LABELS);
      ctx.globalAlpha = this.opacity;
      for (const L of layers) {
        for (let ty = Math.floor(y0 / ts); ty <= Math.floor((y0 + this.H) / ts); ty++) {
          if (ty < 0 || ty >= n) continue;
          for (let tx = Math.floor(x0 / ts); tx <= Math.floor((x0 + this.W) / ts); tx++) {
            const wx = ((tx % n) + n) % n;
            const im = this.img(this.tileUrl(L, zi, wx, ty));
            const sx = tx * ts - x0, sy = ty * ts - y0;
            if (im.complete && im.naturalWidth) ctx.drawImage(im, sx, sy, ts + 0.5, ts + 0.5);
            else if (L === t.url) { // üst seviyeden geçici dolgu
              for (let up = 1; up <= 4; up++) {
                const pz = zi - up; if (pz < 1) break; const f = Math.pow(2, up);
                const pim = this.cache.get(this.tileUrl(L, pz, Math.floor(wx / f), Math.floor(ty / f)));
                if (pim && pim.complete && pim.naturalWidth) { const sub = 256 / f; ctx.drawImage(pim, (wx % f) * sub, (ty % f) * sub, sub, sub, sx, sy, ts + 0.5, ts + 0.5); break; }
              }
            }
          }
        }
      }
      ctx.globalAlpha = 1;
      // atıf ve ölçek çubuğu
      ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      const a = t.attr; const w = ctx.measureText(a).width; ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(this.W - w - 10, this.H - 17, w + 10, 17); ctx.fillStyle = '#ddd'; ctx.fillText(a, this.W - 5, this.H - 3);
      const mpp = 156543.03392 * Math.cos(this.lat * Math.PI / 180) / Math.pow(2, this.z);
      let L = Math.pow(10, Math.floor(Math.log10(mpp * 120))); if (L / mpp < 50) L *= 5; else if (L / mpp < 80) L *= 2;
      const bw = L / mpp; ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(8, this.H - 26, bw + 16, 20); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(16, this.H - 12); ctx.lineTo(16 + bw, this.H - 12); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(L >= 1000 ? L / 1000 + ' km' : L + ' m', 16 + bw / 2, this.H - 13);
      if (!G.isSet()) { ctx.fillStyle = 'rgba(20,24,30,0.85)'; const by = this.H - 90; ctx.fillRect(this.W / 2 - 250, by, 500, 50); ctx.fillStyle = '#ffd24a'; ctx.textAlign = 'center'; ctx.font = '13px system-ui, sans-serif'; ctx.fillText('Koordinat sistemi tanımlı değil. Sahayı bulun, sağ üstten "Merkezi orijin yap"', this.W / 2, by + 21); ctx.fillText('ya da UTM / TM3 seçin; sonra çizim komutları harita üzerinde çalışır.', this.W / 2, by + 40); }
    }
    pan(dx, dy) { const cxp = G.wmX(this.lon, this.z) - dx, cyp = G.wmY(this.lat, this.z) - dy; this.lon = G.wmLon(cxp, this.z); this.lat = Math.max(-85, Math.min(85, G.wmLat(cyp, this.z))); this.sync(); }
    zoomAt(sx, sy, f) {
      const z2 = Math.max(2, Math.min(21, this.z + Math.log2(f)));
      const px = G.wmX(this.lon, this.z) + (sx - this.W / 2), py = G.wmY(this.lat, this.z) + (sy - this.H / 2);
      const lonP = G.wmLon(px, this.z), latP = G.wmLat(py, this.z);
      this.z = z2;
      const cx = G.wmX(lonP, z2) - (sx - this.W / 2), cy = G.wmY(latP, z2) - (sy - this.H / 2);
      this.lon = G.wmLon(cx, z2); this.lat = G.wmLat(cy, z2); this.sync();
    }
    goTo(lat, lon, z) { this.lat = lat; this.lon = lon; if (z) this.z = z; this.sync(); }
    zoomBox(bb) {
      if (!bb || !G.isSet()) return;
      const a = G.toLL([bb[0], bb[1]]), b = G.toLL([bb[2], bb[3]]), c = G.toLL([(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2]);
      this.lat = c[0]; this.lon = c[1];
      const dxp = Math.abs(G.wmX(b[1], 0) - G.wmX(a[1], 0)), dyp = Math.abs(G.wmY(b[0], 0) - G.wmY(a[0], 0));
      this.z = Math.min(20, Math.log2(Math.min(this.W / Math.max(dxp, 1e-9), this.H / Math.max(dyp, 1e-9)) * 0.85));
      this.sync();
    }
    zoomExtents() { const bb = C.extents(); if (bb && G.isSet()) this.zoomBox(bb); else this.dirty = true; }
    resize() { super.resize(); this.sync && this.sync(); }
  }
  C.MapView = MapView;

  /* yer arama: "39.92, 32.85" ya da Nominatim */
  C.geocode = async function (q) {
    const m = q.trim().match(/^(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)$/);
    if (m) return [{ lat: parseFloat(m[1].replace(',', '.')), lon: parseFloat(m[2].replace(',', '.')), name: 'Koordinat' }];
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=tr&q=' + encodeURIComponent(q));
    if (!r.ok) throw new Error('Arama yapılamadı (' + r.status + ')');
    return (await r.json()).map(x => ({ lat: +x.lat, lon: +x.lon, name: x.display_name }));
  };
})(window.C);

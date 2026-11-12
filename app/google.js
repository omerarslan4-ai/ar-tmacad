/* ArıtmaCAD — Google haritaları (resmî Map Tiles API, kullanıcının kendi anahtarıyla)
   - Harita sekmesi: Google uydu / uydu+yol / yol haritası altlığı (oturum belirteci, atıf, logo)
   - "Google 3B" sekmesi: Google fotogerçekçi 3B şehir/arazi modeli (CesiumJS ile) + tesisin 3B modeli gerçek konumunda
   Anahtar yalnız bu bilgisayarda (localStorage) saklanır ve yalnız Google'ın tile.googleapis.com adresine gönderilir. */
(function (C) {
  'use strict';
  const M = C.M, G = C.geo, $ = s => document.querySelector(s);
  const KEY = 'aritmacad.googleKey';
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  C.googleKey = () => { try { return (localStorage.getItem(KEY) || '').trim(); } catch (e) { return ''; } };
  const setKey = k => { try { if (k) localStorage.setItem(KEY, k.trim()); else localStorage.removeItem(KEY); } catch (e) { } sessions = {}; lastErr = ''; };
  const API = 'https://tile.googleapis.com';

  /* ---------- 2B oturumları ---------- */
  let sessions = {}, lastErr = '', pending = {};
  const sessionFor = (kind, spec) => {
    const k = C.googleKey(); if (!k) return null;
    const s = sessions[kind]; if (s && Date.now() < s.exp - 60000) return s;
    if (!pending[kind] && !(s && s.err && Date.now() - s.t < 30000)) {
      pending[kind] = fetch(`${API}/v1/createSession?key=${encodeURIComponent(k)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ language: 'tr-TR', region: 'TR' }, spec)) })
        .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok || !j.session) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status)); sessions[kind] = { id: j.session, exp: (+j.expiry || 0) * 1000 || Date.now() + 3600e3 }; lastErr = ''; })
        .catch(err => { sessions[kind] = { err: true, t: Date.now() }; lastErr = String(err.message || err); C.warn('Google harita oturumu açılamadı: ' + lastErr); })
        .finally(() => { pending[kind] = null; if (C.views && C.views.map) C.views.map.dirty = true; });
    }
    return s && !s.err && Date.now() < s.exp ? s : null;
  };
  const gtile = (kind, spec, name) => ({
    name, max: 22, google: true, kind,
    get url() { const s = sessionFor(kind, spec); return s ? `${API}/v1/2dtiles/{z}/{x}/{y}?session=${encodeURIComponent(s.id)}&key=${encodeURIComponent(C.googleKey())}` : null; },
    get attr() { return 'Google Maps' + (attrTxt[kind] ? ' · ' + attrTxt[kind] : ''); },
  });
  const attrTxt = {};
  Object.assign(C.TILES, {
    google: gtile('sat', { mapType: 'satellite' }, 'Uydu (Google)'),
    googleHybrid: gtile('hyb', { mapType: 'satellite', layerTypes: ['layerRoadmap'] }, 'Uydu + yollar (Google)'),
    googleRoad: gtile('road', { mapType: 'roadmap' }, 'Yol haritası (Google)'),
  });
  /* görünen alanın telif yazısı (Google'ın istediği atıf) */
  let attrTimer = null, attrKey = '';
  const updAttr = (view, t) => {
    const s = sessions[t.kind]; if (!s || s.err) return;
    const a = G.wmLat(G.wmY(view.lat, view.z) - view.H / 2, view.z), b = G.wmLat(G.wmY(view.lat, view.z) + view.H / 2, view.z);
    const w = G.wmLon(G.wmX(view.lon, view.z) - view.W / 2, view.z), e = G.wmLon(G.wmX(view.lon, view.z) + view.W / 2, view.z), z = Math.round(view.z);
    const key = [t.kind, z, a.toFixed(3), b.toFixed(3), w.toFixed(3), e.toFixed(3)].join(); if (key === attrKey) return; attrKey = key;
    clearTimeout(attrTimer); attrTimer = setTimeout(() => {
      fetch(`${API}/tile/v1/viewport?session=${encodeURIComponent(s.id)}&key=${encodeURIComponent(C.googleKey())}&zoom=${z}&north=${a}&south=${b}&west=${w}&east=${e}`)
        .then(r => r.json()).then(j => { if (j && j.copyright != null) { attrTxt[t.kind] = j.copyright; view.dirty = true; } }).catch(() => { });
    }, 500);
  };
  { // harita çiziminde Google altlıkları
    const P = C.MapView.prototype, d0 = P.drawTiles;
    P.drawTiles = function (ctx) {
      const t = C.TILES[this.src];
      if (!t || !t.google) return d0.call(this, ctx);
      if (!C.googleKey() || !t.url) {
        ctx.fillStyle = '#20252c'; ctx.fillRect(0, 0, this.W, this.H); ctx.fillStyle = '#ffd24a'; ctx.font = '14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(!C.googleKey() ? 'Google anahtarı girilmedi — sağ üstteki "Google anahtarı" düğmesine basın.' : lastErr ? 'Google: ' + lastErr.slice(0, 120) : 'Google harita oturumu açılıyor…', this.W / 2, this.H / 2);
        return;
      }
      updAttr(this, t); d0.call(this, ctx);
      // Google Maps yazısı (logo yerine izin verilen metin), sol altta ölçek çubuğunun üstünde
      ctx.font = 'bold 14px Roboto, Arial, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText('Google Maps', 10, this.H - 32); ctx.fillStyle = '#fff'; ctx.fillText('Google Maps', 10, this.H - 32);
    };
  }

  /* ---------- anahtar penceresi ---------- */
  C.googleKeyDialog = () => new Promise(res => {
    const k = C.googleKey();
    const b = C.modal('Google harita anahtarı', `
      <p style="font-size:13.5px">Google Cloud'dan aldığınız <b>Map Tiles API</b> anahtarını yapıştırın (AIza… ile başlar).</p>
      <div class="fld"><label>API anahtarı</label><input id="gkIn" type="password" autocomplete="off" spellcheck="false" value="${esc(k)}" placeholder="AIza…" style="font-family:monospace"></div>
      <label style="font-size:12px"><input type="checkbox" id="gkShow"> Anahtarı göster</label>
      <p id="gkMsg" class="hint"></p>
      <p class="hint">Anahtar yalnız bu bilgisayarda saklanır ve yalnız Google'a (tile.googleapis.com) gönderilir; çizim dosyasına yazılmaz. Kullanım Google hesabınıza faturalanır — Google Cloud'da günlük kota sınırı koymanızı öneririz.</p>
      <div class="bar" style="justify-content:space-between"><span><button id="gkDel">Anahtarı sil</button></span><span><button id="gkTest">Dene</button><button id="gkCancel">İptal</button><button id="gkOk" class="pri">Kaydet</button></span></div>`);
    const inp = b.querySelector('#gkIn'), msg = b.querySelector('#gkMsg');
    b.querySelector('#gkShow').onchange = e => inp.type = e.target.checked ? 'text' : 'password';
    let done = false; const end = v => { if (done) return; done = true; clearInterval(tm); C.closeModal(); res(v); };
    b.querySelector('#gkTest').onclick = async () => {
      const kk = inp.value.trim(); if (!kk) { msg.textContent = 'Anahtar boş.'; return; } msg.textContent = 'Deneniyor…';
      try {
        const r = await fetch(`${API}/v1/createSession?key=${encodeURIComponent(kk)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mapType: 'satellite', language: 'tr-TR', region: 'TR' }) });
        const j = await r.json().catch(() => ({})); msg.textContent = r.ok && j.session ? '✓ Anahtar çalışıyor (2B uydu oturumu açıldı).' : '✗ ' + ((j.error && j.error.message) || 'HTTP ' + r.status) + ' — Map Tiles API etkin mi, faturalandırma açık mı, anahtar kısıtlamaları doğru mu?';
      } catch (err) { msg.textContent = '✗ Bağlanılamadı: ' + (err.message || err) + ' (internet bağlantısını kontrol edin)'; }
    };
    b.querySelector('#gkOk').onclick = () => { setKey(inp.value); if (C.views && C.views.map) C.views.map.dirty = true; C.log(inp.value.trim() ? 'Google anahtarı kaydedildi (yalnız bu bilgisayarda).' : 'Google anahtarı silindi.'); end(true); };
    b.querySelector('#gkDel').onclick = () => { setKey(''); inp.value = ''; if (C.views && C.views.map) C.views.map.dirty = true; C.log('Google anahtarı silindi.'); end(true); };
    b.querySelector('#gkCancel').onclick = () => end(false);
    const tm = setInterval(() => { if ($('#modal').classList.contains('hidden')) end(false); }, 300);
    setTimeout(() => inp.focus(), 30);
  });
  C.addCommand(['GOOGLEANAHTAR', 'GOOGLEKEY'], 'Google Map Tiles API anahtarını girer / siler (yalnız bu bilgisayarda saklanır)', async () => { await C.googleKeyDialog(); }, { noUndo: true });

  /* ---------- Google 3B görünümü (CesiumJS) ---------- */
  const CESIUM_VER = '1.122.0';
  const cesiumBase = () => { try { return localStorage.getItem('aritmacad.cesiumUrl') || `https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VER}/Build/Cesium/`; } catch (e) { return `https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VER}/Build/Cesium/`; } };
  let cesiumP = null;
  const loadCesium = () => cesiumP || (cesiumP = new Promise((res, rej) => {
    if (window.Cesium) return res(window.Cesium);
    const base = cesiumBase(); window.CESIUM_BASE_URL = base;
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = base + 'Widgets/widgets.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = base + 'Cesium.js'; s.onload = () => window.Cesium ? res(window.Cesium) : rej(new Error('Cesium yüklenemedi')); s.onerror = () => { cesiumP = null; rej(new Error('3B harita kütüphanesi (CesiumJS) indirilemedi — internet bağlantısını kontrol edin')); };
    document.head.appendChild(s);
  }));

  const g3 = C.g3d = { viewer: null, tileset: null, model: null, h0: null, dh: 0, clip: true, opacity: 1, edges: true };
  try { Object.assign(g3, JSON.parse(localStorage.getItem('aritmacad.g3d') || '{}')); } catch (e) { }
  const saveG3 = () => { try { localStorage.setItem('aritmacad.g3d', JSON.stringify({ dh: g3.dh, clip: g3.clip, edges: g3.edges, opacity: g3.opacity })); } catch (e) { } };
  const status = (t, warn) => { const el = $('#g3Msg'); if (el) { el.textContent = t || ''; el.style.color = warn ? '#ffb347' : ''; } };

  /* model geometrisi -> yerel doğu-kuzey-yukarı (ENU) koordinatları */
  const buildModel = () => {
    const Cs = window.Cesium, v = g3.viewer; if (!Cs || !v) return;
    if (g3.model) { v.scene.primitives.remove(g3.model); g3.model = null; }
    if (!G.isSet()) { status('Önce Harita sekmesinde koordinat sistemini (ör. TM3/UTM) tanımlayın; model ancak o zaman gerçek konumuna yerleşir.', true); return; }
    const ents = C.doc.ents.filter(e => C.layer(e.layer).on && e.type !== 'sheet');
    let bb = [Infinity, Infinity, -Infinity, -Infinity]; const meshes = [];
    for (const e of ents) { if (g3.atla && g3.atla(e)) continue; /* saha3b.js: dokulu çizilen yüzeyler */ let t; try { t = C.entTris(e); } catch (err) { continue; } if (!t || !t.pos.length) continue; meshes.push({ e, t }); for (let i = 0; i < t.pos.length; i += 3) { const x = t.pos[i], y = t.pos[i + 1]; if (x < bb[0]) bb[0] = x; if (y < bb[1]) bb[1] = y; if (x > bb[2]) bb[2] = x; if (y > bb[3]) bb[3] = y; } }
    if (!meshes.length) { status('Çizimde 3B nesne yok (duvar, havuz, boru, pompa, katı…). 3B sekmesinde ya da Arıtma araçlarıyla model oluşturun.', true); g3.origin = null; return; }
    const o = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2]; g3.origin = o; g3.bb = bb;
    const ll = G.toLL(o), lx = G.toLL([o[0] + 10, o[1]]), ly = G.toLL([o[0], o[1] + 10]);
    const R = 6378137, cl = Math.cos(ll[0] * Math.PI / 180), enu = q => [(q[1] - ll[1]) * Math.PI / 180 * R * cl, (q[0] - ll[0]) * Math.PI / 180 * R];
    const ex = enu(lx).map(v2 => v2 / 10), ey = enu(ly).map(v2 => v2 / 10); // plan x ve y birim vektörlerinin doğu/kuzey bileşenleri
    const tr = (x, y, z) => { const dx = x - o[0], dy = y - o[1]; return [ex[0] * dx + ey[0] * dy, ex[1] * dx + ey[1] * dy, z]; };
    g3.ll = ll; g3.toENU = tr;
    const colOf = (e) => { const oz = g3.renk && g3.renk(e); if (oz) return new Cs.Color(oz[0], oz[1], oz[2], g3.opacity); /* saha3b.js: gerçekçi cephe renkleri */ const aci = C.entColor(e), conc = ['tank', 'ctank', 'wall', 'slab'].includes(e.type); const c = conc ? [184, 184, 178] : C.aciRgb(aci === 7 ? 9 : aci); return new Cs.Color(c[0] / 255, c[1] / 255, c[2] / 255, g3.opacity); };
    const insts = [], lines = [], boya = {};
    for (const { e, t } of meshes) {
      const n = t.pos.length / 3, pos = new Float64Array(n * 3), nrm = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const q = tr(t.pos[i * 3], t.pos[i * 3 + 1], t.pos[i * 3 + 2]); pos[i * 3] = q[0]; pos[i * 3 + 1] = q[1]; pos[i * 3 + 2] = q[2]; const nq = tr(o[0] + t.nrm[i * 3], o[1] + t.nrm[i * 3 + 1], t.nrm[i * 3 + 2]); const l = Math.hypot(nq[0], nq[1], nq[2]) || 1; nrm[i * 3] = nq[0] / l; nrm[i * 3 + 1] = nq[1] / l; nrm[i * 3 + 2] = nq[2] / l; }
      const idx = n > 65535 ? new Uint32Array(n) : new Uint16Array(n); for (let i = 0; i < n; i++) idx[i] = i;
      const geom = new Cs.Geometry({ attributes: { position: new Cs.GeometryAttribute({ componentDatatype: Cs.ComponentDatatype.DOUBLE, componentsPerAttribute: 3, values: pos }), normal: new Cs.GeometryAttribute({ componentDatatype: Cs.ComponentDatatype.FLOAT, componentsPerAttribute: 3, values: nrm }) }, indices: idx, primitiveType: Cs.PrimitiveType.TRIANGLES, boundingSphere: Cs.BoundingSphere.fromVertices(pos) });
      const cc = colOf(e), gi = new Cs.GeometryInstance({ geometry: geom, id: 'e' + e.id, attributes: { color: Cs.ColorGeometryInstanceAttribute.fromColor(cc) } });
      if (g3.golge && g3.opacity >= 1) { const k = cc.toRgba(); (boya[k] = boya[k] || { c: cc, i: [] }).i.push(gi); } else insts.push(gi);
      if (g3.edges && !g3.golge) for (const [a, b] of t.edges) { const p = tr(a[0], a[1], a[2]), q = tr(b[0], b[1], b[2]); lines.push(p[0], p[1], p[2], q[0], q[1], q[2]); }
    }
    const coll = new Cs.PrimitiveCollection();
    // gerçekçi görünüm: her renk bir boya malzemesi (yayınım payı sayesinde güneş almayan cephe kararmaz), gölge alır / verir
    if (Object.keys(boya).length) {
      if (!Cs.Material._materialCache.getMaterial('AritmaBoya')) Cs.Material._materialCache.addMaterial('AritmaBoya', { fabric: { type: 'AritmaBoya', uniforms: { color: new Cs.Color(0.8, 0.8, 0.8, 1) }, source: 'czm_material czm_getMaterial(czm_materialInput materialInput){ czm_material m = czm_getDefaultMaterial(materialInput); m.diffuse = color.rgb * 0.60; m.emission = color.rgb * 0.44; m.specular = 0.02; m.alpha = 1.0; return m; }' }, translucent: () => false });
      for (const k in boya) coll.add(new Cs.Primitive({ geometryInstances: boya[k].i, appearance: new Cs.MaterialAppearance({ material: new Cs.Material({ fabric: { type: 'AritmaBoya', uniforms: { color: boya[k].c } } }), materialSupport: Cs.MaterialAppearance.MaterialSupport.BASIC, translucent: false, closed: false, faceForward: true }), asynchronous: false, shadows: Cs.ShadowMode.ENABLED }));
    }
    if (insts.length) coll.add(new Cs.Primitive({ geometryInstances: insts, appearance: new Cs.PerInstanceColorAppearance({ flat: false, translucent: g3.opacity < 1, closed: false }), asynchronous: false, releaseGeometryInstances: true, shadows: g3.golge ? Cs.ShadowMode.ENABLED : Cs.ShadowMode.DISABLED }));
    if (lines.length) {
      const lp = new Float64Array(lines), li = lp.length / 3 > 65535 ? new Uint32Array(lp.length / 3) : new Uint16Array(lp.length / 3); for (let i = 0; i < li.length; i++) li[i] = i;
      const lg = new Cs.Geometry({ attributes: { position: new Cs.GeometryAttribute({ componentDatatype: Cs.ComponentDatatype.DOUBLE, componentsPerAttribute: 3, values: lp }) }, indices: li, primitiveType: Cs.PrimitiveType.LINES, boundingSphere: Cs.BoundingSphere.fromVertices(lp) });
      coll.add(new Cs.Primitive({ geometryInstances: new Cs.GeometryInstance({ geometry: lg, attributes: { color: Cs.ColorGeometryInstanceAttribute.fromColor(new Cs.Color(0.1, 0.1, 0.12, 1)) } }), appearance: new Cs.PerInstanceColorAppearance({ flat: true, translucent: false }), asynchronous: false }));
    }
    g3.model = v.scene.primitives.add(coll);
    C.emit('g3dmodel', g3); // saha3b.js: çevre binalar ve deniz hatları aynı koleksiyona eklenir
    placeModel(); applyClip(); v.scene.requestRender();
    status(`Model yerleştirildi: ${meshes.length} nesne · ${ll[0].toFixed(6)}, ${ll[1].toFixed(6)} · kot 0 = ${g3.h0 == null ? '?' : (g3.h0 + g3.dh).toFixed(2)} m (elipsoit)`);
  };
  const placeModel = () => {
    const Cs = window.Cesium; if (!Cs || !g3.model || !g3.ll) return;
    const h = (g3.h0 == null ? 0 : g3.h0) + (g3.dh || 0);
    const mm = Cs.Transforms.eastNorthUpToFixedFrame(Cs.Cartesian3.fromDegrees(g3.ll[1], g3.ll[0], h));
    for (let i = 0; i < g3.model.length; i++) g3.model.get(i).modelMatrix = mm;
    g3.viewer.scene.requestRender();
  };
  /* Google modelinde tesis alanını kes (gömülü havuzlar görünsün) */
  const applyClip = () => {
    const Cs = window.Cesium, ts = g3.tileset, v = g3.viewer; if (!Cs || !v) return;
    if (g3.ornek > 0) { g3.kesimBekliyor = true; return; } // zemin okunurken kesim kurulmaz: ekran dışı okuma geçişinde yeni kesimin dokusu hazırlanamaz, çizim çöker
    try {
      if (!Cs.ClippingPolygonCollection) return;
      const hal = (g3.ekKesim || []).filter(r => r && r.length > 2); // saha3b.js: hat hendekleri (çizim koordinatı halkalar)
      const poly = ring => new Cs.ClippingPolygon({ positions: ring.map(p => { const q = G.toLL(p); return Cs.Cartesian3.fromDegrees(q[1], q[0]); }) });
      if (ts) {
        const ps = hal.map(poly);
        if (g3.clip && g3.bb) { // tesis alanı: saha sınırı biliniyorsa onunla (saha3b.js), yoksa modelin sınır kutusuyla
          const sh = (g3.sahaHalka || []).filter(r => r && r.length > 2), m = 1, b = g3.bb;
          if (sh.length) for (const r of sh) ps.push(poly(r)); else ps.push(poly([[b[0] - m, b[1] - m], [b[2] + m, b[1] - m], [b[2] + m, b[3] + m], [b[0] - m, b[3] + m]]));
        }
        ts.clippingPolygons = ps.length ? new Cs.ClippingPolygonCollection({ polygons: ps }) : undefined;
      }
      const gl = v.scene.globe; if (gl) gl.clippingPolygons = hal.length ? new Cs.ClippingPolygonCollection({ polygons: hal.map(poly) }) : undefined;
      v.scene.requestRender();
    } catch (err) { console.warn(err); }
  };
  g3.kesimYenile = applyClip;
  /* zemin okuma (sampleHeight) kapısı: okuma sürerken harita kesimi ve gölge kapalı tutulur; son okuma bitince geri kurulur */
  g3.ornek = 0;
  g3.ornekBasla = () => { const v = g3.viewer; g3.ornek++; if (g3.ornek === 1 && v) { g3._golge = v.shadows; v.shadows = false; } if (g3.tileset) g3.tileset.clippingPolygons = undefined; };
  g3.ornekBitir = () => { const v = g3.viewer; g3.ornek = Math.max(0, g3.ornek - 1); if (g3.ornek) return; if (v) v.shadows = !!g3._golge && !(C.saha3b && C.saha3b.durum && C.saha3b.durum.golgeYok); g3.kesimBekliyor = false; applyClip(); };
  const sampleGround = async () => {
    const Cs = window.Cesium, v = g3.viewer; if (!Cs || !v || !g3.ll) return;
    if (!v.scene.sampleHeightSupported) { status('Bu ekran kartında zemin yüksekliği okunamıyor; "Kot 0 yüksekliği"ni elle girin.', true); return; }
    status('Zemin yüksekliği okunuyor…');
    try {
      // merkez + model çevresinde 8 nokta: mevcut bina / araç üstüne denk gelen okumalar ayıklansın diye alt yarının ortancası alınır
      const b = g3.bb, xy = [g3.origin || [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]]; if (b) { const mx = (b[0] + b[2]) / 2, my = (b[1] + b[3]) / 2, e = 3; xy.push([b[0] - e, b[1] - e], [mx, b[1] - e], [b[2] + e, b[1] - e], [b[2] + e, my], [b[2] + e, b[3] + e], [mx, b[3] + e], [b[0] - e, b[3] + e], [b[0] - e, my]); }
      const pts = xy.map(p => { const q = G.toLL(p); return Cs.Cartographic.fromDegrees(q[1], q[0]); });
      const ex = g3.model ? [g3.model] : [];
      g3.ornekBasla(); let r; try { r = await v.scene.sampleHeightMostDetailed(pts, ex); } finally { g3.ornekBitir(); }
      const hs = (r || []).map(c => c && c.height).filter(h => h != null && isFinite(h)).sort((a, c) => a - c);
      if (hs.length) {
        const alt = hs.slice(0, Math.max(1, Math.ceil(hs.length / 2))), zemin = alt[Math.floor((alt.length - 1) / 2)];
        const toprak = C.doc && C.doc.set.seviye && isFinite(+C.doc.set.seviye.toprak) ? +C.doc.set.seviye.toprak : 0; // projede toprak kotu tanımlıysa kot 0 ona göre oturur
        g3.h0 = zemin - toprak; placeModel(); updUi(); status('Zemin (elipsoit) yüksekliği ' + zemin.toFixed(2) + ' m okundu (' + hs.length + ' nokta); tesisin toprak kotu (' + toprak.toFixed(2) + ') buraya oturtuldu. Gerekirse "±" ile ayarlayın.');
        C.emit('g3dzemin', g3);
      } else status('Zemin yüksekliği okunamadı (Google modeli bu noktada henüz yüklenmemiş olabilir). Biraz yaklaşıp tekrar deneyin.', true);
    } catch (err) { status('Zemin okunamadı: ' + (err.message || err), true); }
  };
  const flyToModel = () => {
    const Cs = window.Cesium, v = g3.viewer; if (!Cs || !v) return;
    if (!g3.ll) { v.camera.flyTo({ destination: Cs.Cartesian3.fromDegrees(35, 39, 1.5e6) }); return; }
    const b = g3.bb, r = Math.max(40, Math.hypot(b[2] - b[0], b[3] - b[1]) * 0.9), h = (g3.h0 || 0) + (g3.dh || 0);
    v.camera.flyToBoundingSphere(new Cs.BoundingSphere(Cs.Cartesian3.fromDegrees(g3.ll[1], g3.ll[0], h), r), { offset: new Cs.HeadingPitchRange(Cs.Math.toRadians(30), Cs.Math.toRadians(-35), r * 2.2), duration: 1.5 });
  };
  const updUi = () => {
    const dh = $('#g3Dh'), h0 = $('#g3H0'); if (dh) dh.value = g3.dh || 0; if (h0) h0.value = g3.h0 == null ? '' : (+g3.h0).toFixed(2);
    const c = $('#g3Clip'); if (c) c.checked = !!g3.clip; const ed = $('#g3Edges'); if (ed) ed.checked = !!g3.edges;
  };

  const open3d = async () => {
    const box = $('#cvG3d'); if (!box) return;
    if (g3.viewer) { buildModel(); return; }
    status('3B harita kütüphanesi yükleniyor…');
    let Cs; try { Cs = await loadCesium(); } catch (err) { status(err.message, true); return; }
    try {
      // Google anahtarı yoksa: düz küre üzerinde Esri uydu görüntüsü (model, çevre binalar ve hatlar yine gerçek konumunda)
      const k0 = C.googleKey(), alt = !k0 && C.TILES && C.TILES.uydu ? new Cs.ImageryLayer(new Cs.UrlTemplateImageryProvider({ url: C.TILES.uydu.url, maximumLevel: C.TILES.uydu.max || 19, credit: C.TILES.uydu.attr })) : false;
      if (alt && g3.h0 == null) g3.h0 = 0;
      const v = g3.viewer = new Cs.Viewer($('#g3Canvas'), { ...(alt ? {} : { globe: false }), baseLayer: alt, baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false, navigationHelpButton: false, animation: false, timeline: false, fullscreenButton: false, infoBox: false, selectionIndicator: false, requestRenderMode: true, maximumRenderTimeChange: Infinity });
      v.scene.skyAtmosphere.show = true; v.scene.backgroundColor = Cs.Color.fromCssColorString('#9fb8d0');
      try { v.scene.screenSpaceCameraController.enableCollisionDetection = false; } catch (e) { }
      if (alt) { try { v.scene.globe.depthTestAgainstTerrain = true; } catch (e) { } } // düz kürede zemin altı (temel, hazne) görünmesin
    } catch (err) { status('3B görünüm açılamadı (WebGL?): ' + (err.message || err), true); return; }
    const k = C.googleKey();
    if (!k) status('Google anahtarı girilmedi; Esri uydu görüntüsü üzerinde gösteriliyor. Google haritası için "Google anahtarı" düğmesiyle girin.', true);
    else {
      try {
        if (Cs.GoogleMaps) Cs.GoogleMaps.defaultApiKey = k;
        const res = new Cs.Resource({ url: API + '/v1/3dtiles/root.json', queryParameters: { key: k } });
        const ts = await Cs.Cesium3DTileset.fromUrl(res, { showCreditsOnScreen: true });
        g3.tileset = g3.viewer.scene.primitives.add(ts);
        try { const cr = Cs.GoogleMaps && Cs.GoogleMaps.getDefaultCredit && Cs.GoogleMaps.getDefaultCredit(); if (cr) g3.viewer.creditDisplay.addStaticCredit(cr); } catch (e) { }
        ts.tileFailed.addEventListener(err => { status('Google 3B karo hatası: ' + (err && err.message || err), true); });
      } catch (err) { status('Google 3B modeli açılamadı: ' + (err.message || err) + ' — anahtar, faturalandırma ve Map Tiles API\'yi kontrol edin.', true); }
    }
    buildModel(); flyToModel();
    if (g3.tileset && g3.h0 == null && g3.ll) setTimeout(() => { if (g3.h0 == null) sampleGround(); }, 4000);
  };

  /* ---------- sekme ve kontroller ---------- */
  const setup = () => {
    const tabs = $('#viewTabs'), views = $('#views'); if (!tabs || !views || $('#cvG3d')) return;
    const bt = document.createElement('button'); bt.dataset.view = 'g3d'; bt.textContent = 'Google 3B'; bt.title = 'Google fotogerçekçi 3B harita üzerinde tesis modeli'; tabs.appendChild(bt);
    const box = document.createElement('div'); box.id = 'cvG3d'; box.className = 'g3d hidden';
    box.innerHTML = `<div id="g3Canvas" style="position:absolute;inset:0"></div>
      <div class="overlay" id="g3Ctl" style="top:8px;right:8px;max-width:330px">
        <div class="row"><button id="g3Key">Google anahtarı</button><button id="g3Fly">Modele git</button><button id="g3Re">Modeli güncelle</button></div>
        <div class="row"><button id="g3Ground" title="Google modelinden zemin yüksekliğini oku, kot 0'ı oraya oturt">Zemine oturt</button>
          <label title="Kot 0'ın elipsoit yüksekliği (m)">Kot 0 <input id="g3H0" type="text" inputmode="decimal" style="width:62px"></label>
          <label title="Ek yükseklik düzeltmesi (m)">± <input id="g3Dh" type="text" inputmode="decimal" style="width:48px" value="0"></label></div>
        <div class="row"><label><input type="checkbox" id="g3Clip"> Tesis alanını Google modelinden kes</label><label><input type="checkbox" id="g3Edges"> Kenarlar</label></div>
        <div class="hint" id="g3Msg"></div>
      </div>`;
    views.appendChild(box);
    const st = document.createElement('style'); st.textContent = '#cvG3d{position:absolute;inset:0;background:#9fb8d0}#cvG3d.hidden{display:none}#g3Ctl{position:absolute;z-index:5}#g3Ctl .row{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-bottom:5px}#g3Canvas .cesium-viewer-bottom{right:auto;left:4px}'; document.head.appendChild(st);
    bt.onclick = () => C.setView('g3d');
    $('#g3Key').onclick = async () => { const had = C.googleKey(); await C.googleKeyDialog(); if (C.googleKey() !== had && g3.viewer) { try { g3.viewer.destroy(); } catch (e) { } g3.viewer = null; g3.tileset = null; g3.model = null; g3.h0 = null; open3d(); } };
    $('#g3Fly').onclick = flyToModel; $('#g3Re').onclick = () => { buildModel(); };
    $('#g3Ground').onclick = sampleGround;
    $('#g3H0').onchange = e => { const v = parseFloat(String(e.target.value).replace(',', '.')); if (isFinite(v)) { g3.h0 = v; placeModel(); } };
    $('#g3Dh').onchange = e => { const v = parseFloat(String(e.target.value).replace(',', '.')); g3.dh = isFinite(v) ? v : 0; saveG3(); placeModel(); };
    $('#g3Clip').onchange = e => { g3.clip = e.target.checked; saveG3(); applyClip(); };
    $('#g3Edges').onchange = e => { g3.edges = e.target.checked; saveG3(); buildModel(); };
    updUi();
    // Harita sekmesine anahtar düğmesi
    const mc = $('#mapCtl'); if (mc) { const r = document.createElement('div'); r.className = 'row'; r.innerHTML = '<button id="mapGKey">Google anahtarı</button><span class="hint">Google altlıkları için</span>'; mc.appendChild(r); r.querySelector('#mapGKey').onclick = () => C.googleKeyDialog(); }
    const ms = $('#mapSrc'); if (ms) ms.innerHTML = Object.entries(C.TILES).map(([k, t]) => `<option value="${k}">${esc(t.name)}</option>`).join('');
    // görünüm değişimi
    const sv0 = C.setView;
    C.setView = function (v) {
      const on = v === 'g3d'; box.classList.toggle('hidden', !on);
      sv0.call(this, v);
      bt.classList.toggle('on', on);
      if (on) { document.querySelectorAll('#viewTabs button').forEach(b => b.classList.toggle('on', b === bt)); open3d(); }
    };
    let rt = null; C.on('change', () => { if (C.currentView === 'g3d' && g3.viewer) { clearTimeout(rt); rt = setTimeout(buildModel, 800); } });
    C.on('cmdstart', name => { if (C.currentView === 'g3d' && !(C.cmds[name] && C.cmds[name].opts.noUndo)) C.setView('plan'); });
  };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup(); }
})(window.C);

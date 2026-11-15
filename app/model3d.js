/* ArıtmaCAD — ücretsiz 3B model kütüphaneleri (kapı, pencere, ekipman…)
   glTF / GLB / ZIP(glTF) / OBJ / STL / COLLADA (.dae, KMZ — SketchUp 3D Warehouse; okuyucu dae-oku.js) okuma, Poly Haven (CC0, anahtarsız) ve Sketchfab (ücretsiz hesap anahtarı) arama-indirme */
(function (C) {
  'use strict';
  const M = C.M;
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ---------------- glTF 2.0 okuyucu ---------------- */
  const GET = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' };
  const SZ = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }, NORM = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };
  const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
  const I4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const mul = (a, b) => { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; };
  const nodeMat = n => {
    if (n.matrix) return n.matrix.slice();
    const [x, y, z, w] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1], t = n.translation || [0, 0, 0];
    const r = [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0, 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, 0, 0, 0, 1];
    for (let k = 0; k < 3; k++) { r[k] *= sx; r[4 + k] *= sy; r[8 + k] *= sz; }
    r[12] = t[0]; r[13] = t[1]; r[14] = t[2]; return r;
  };
  const det3 = m => m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]);
  const b64 = uri => { const s = atob(uri.slice(uri.indexOf(',') + 1)), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; };
  const readAcc = (g, bufs, idx) => {
    const a = g.accessors[idx], nc = NC[a.type], cnt = a.count, out = new Float64Array(cnt * nc);
    if (a.bufferView == null) return out;
    const bv = g.bufferViews[a.bufferView], buf = bufs[bv.buffer], sz = SZ[a.componentType], stride = bv.byteStride || sz * nc, off = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const dv = new DataView(buf), fn = GET[a.componentType], nm = a.normalized ? NORM[a.componentType] : 0;
    for (let i = 0; i < cnt; i++) for (let k = 0; k < nc; k++) { let v = dv[fn](off + i * stride + k * sz, true); if (nm) v = Math.max(v / nm, -1); out[i * nc + k] = v; }
    return out;
  };
  const texColor = async (g, bufs, ti, getRes) => {
    try {
      const tex = g.textures[ti]; const src = tex.source != null ? tex.source : Object.values(tex.extensions || {}).map(x => x.source).find(x => x != null); const im = g.images[src]; if (!im) return null;
      let blob;
      if (im.bufferView != null) { const bv = g.bufferViews[im.bufferView]; blob = new Blob([new Uint8Array(bufs[bv.buffer], bv.byteOffset || 0, bv.byteLength)], { type: im.mimeType || 'image/png' }); }
      else if (/^data:/.test(im.uri)) blob = new Blob([b64(im.uri)]);
      else { const ab = await getRes(im.uri); if (!ab) return null; blob = new Blob([ab]); }
      const bmp = await createImageBitmap(blob), cv = document.createElement('canvas'); cv.width = cv.height = 8; const x = cv.getContext('2d'); x.drawImage(bmp, 0, 0, 8, 8);
      const d = x.getImageData(0, 0, 8, 8).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; } const n = d.length / 4;
      return [r / n / 255, gg / n / 255, b / n / 255];
    } catch (e) { return null; }
  };
  /* g: glTF JSON, glbBin: GLB ikili parça, getRes(uri) -> ArrayBuffer ; çıktı {v, f, fc} (Z yukarı, metre) */
  C.parseGLTF = async function (g, glbBin, getRes) {
    getRes = getRes || (async () => null);
    const req = g.extensionsRequired || []; if (req.some(x => /draco|meshopt/i.test(x))) throw new Error('Bu model sıkıştırılmış (Draco / Meshopt) — okunamıyor. Başka bir model ya da sıkıştırmasız GLB/OBJ/STL seçin.');
    const bufs = []; for (const [i, b] of (g.buffers || []).entries()) { if (!b.uri) bufs[i] = glbBin; else if (/^data:/.test(b.uri)) bufs[i] = b64(b.uri); else bufs[i] = await getRes(b.uri); if (!bufs[i]) throw new Error('Model parçası eksik: ' + (b.uri || 'ikili veri')); }
    const mc = new Map();
    const matCol = async mi => {
      if (mc.has(mi)) return mc.get(mi); const m = mi != null && g.materials ? g.materials[mi] : null; let c = [0.8, 0.8, 0.8];
      if (m) {
        const pbr = m.pbrMetallicRoughness || {}, sg = (m.extensions || {}).KHR_materials_pbrSpecularGlossiness;
        c = ((sg && sg.diffuseFactor) || pbr.baseColorFactor || [1, 1, 1, 1]).slice(0, 3);
        const tex = (sg && sg.diffuseTexture) || pbr.baseColorTexture; if (tex) { const t = await texColor(g, bufs, tex.index, getRes); if (t) c = c.map((v, k) => v * t[k]); }
      }
      c = c.map(v => Math.max(0, Math.min(1, v))); mc.set(mi, c); return c;
    };
    const out = { v: [], f: [], fc: [] };
    const addMesh = async (mesh, m) => {
      const flip = det3(m) < 0;
      for (const pr of mesh.primitives || []) {
        const mode = pr.mode == null ? 4 : pr.mode; if (![4, 5, 6].includes(mode) || pr.attributes.POSITION == null) continue;
        const pos = readAcc(g, bufs, pr.attributes.POSITION), nv = pos.length / 3, base = out.v.length;
        for (let i = 0; i < nv; i++) { const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2]; const X = m[0] * x + m[4] * y + m[8] * z + m[12], Y = m[1] * x + m[5] * y + m[9] * z + m[13], Z = m[2] * x + m[6] * y + m[10] * z + m[14]; out.v.push([X, -Z, Y]); } // Y yukarı -> Z yukarı
        const idx = pr.indices != null ? readAcc(g, bufs, pr.indices) : Float64Array.from({ length: nv }, (_, i) => i);
        const col = await matCol(pr.material), tris = [];
        if (mode === 4) for (let i = 0; i + 2 < idx.length; i += 3) tris.push([idx[i], idx[i + 1], idx[i + 2]]);
        else if (mode === 5) for (let i = 0; i + 2 < idx.length; i++) tris.push(i % 2 ? [idx[i + 1], idx[i], idx[i + 2]] : [idx[i], idx[i + 1], idx[i + 2]]);
        else for (let i = 1; i + 1 < idx.length; i++) tris.push([idx[0], idx[i], idx[i + 1]]);
        for (const t of tris) { out.f.push(flip ? [base + t[0], base + t[2], base + t[1]] : [base + t[0], base + t[1], base + t[2]]); out.fc.push(col); }
      }
    };
    const visit = async (ni, parent, depth) => { const n = g.nodes[ni]; if (!n || depth > 64) return; const m = mul(parent, nodeMat(n)); if (n.mesh != null) await addMesh(g.meshes[n.mesh], m); for (const c of n.children || []) await visit(c, m, depth + 1); };
    const sc = (g.scenes || [])[g.scene || 0];
    if (sc && sc.nodes) for (const ni of sc.nodes) await visit(ni, I4, 0);
    else if (g.nodes) { const kids = new Set(g.nodes.flatMap(n => n.children || [])); for (let i = 0; i < g.nodes.length; i++) if (!kids.has(i)) await visit(i, I4, 0); }
    else for (const mesh of g.meshes || []) await addMesh(mesh, I4);
    if (!out.f.length) throw new Error('Modelde üçgen bulunamadı');
    return out;
  };
  C.readGLB = function (buf) {
    const dv = new DataView(buf); if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('GLB dosyası değil');
    const len = dv.getUint32(8, true); let off = 12, json = null, bin = null;
    while (off + 8 <= len) { const cl = dv.getUint32(off, true), ct = dv.getUint32(off + 4, true); const data = buf.slice(off + 8, off + 8 + cl); if (ct === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(data)); else if (ct === 0x004E4942) bin = data; off += 8 + cl + ((4 - cl % 4) % 4); }
    if (!json) throw new Error('GLB içinde glTF bilgisi yok'); return { json, bin };
  };
  /* resim dosyasının ortalama rengi (doku → tek renk) */
  const ortRenk = async ab => {
    try {
      const bmp = await createImageBitmap(new Blob([ab])), cv = document.createElement('canvas'); cv.width = cv.height = 8; const x = cv.getContext('2d'); x.drawImage(bmp, 0, 0, 8, 8);
      const d = x.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4;
      return [r / n / 255, g / n / 255, b / n / 255];
    } catch (e) { return null; }
  };
  /* COLLADA metni → model; dokular getRes(yol) ile bulunur */
  const daeModel = async (ab, getRes) => {
    const m = C.daeOku.oku(new TextDecoder().decode(ab));
    await C.daeOku.renkle(m, async yol => { const b = getRes ? await getRes(yol) : null; return b ? ortRenk(b) : null; });
    return m;
  };
  const normPath = p => decodeURIComponent(String(p)).replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
  const joinPath = (dir, p) => { const parts = (dir ? dir + '/' : '').concat(p).split('/'), o = []; for (const s of parts) { if (s === '..') o.pop(); else if (s && s !== '.') o.push(s); } return o.join('/'); };
  /* her biçimden 3B model -> {v, f, fc} */
  C.loadModelBuffer = async function (name, buf, getRes) {
    const low = name.toLowerCase(), ab = buf instanceof ArrayBuffer ? buf : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const head = new Uint8Array(ab, 0, Math.min(4, ab.byteLength));
    if (low.endsWith('.glb') || (head[0] === 0x67 && head[1] === 0x6C && head[2] === 0x54 && head[3] === 0x46)) { const { json, bin } = C.readGLB(ab); return C.parseGLTF(json, bin, getRes); }
    if (/\.(zip|kmz)$/.test(low) || (head[0] === 0x50 && head[1] === 0x4B)) {
      const files = await C.unzip(ab), map = new Map(); for (const f of files) map.set(normPath(f.name), f);
      const glb = files.find(f => /\.glb$/i.test(f.name)); if (glb) return C.loadModelBuffer(glb.name, glb.data);
      const gf = files.find(f => /\.gltf$/i.test(f.name));
      if (gf) {
        const dir = normPath(gf.name).split('/').slice(0, -1).join('/');
        const res = async uri => { const k = joinPath(dir, normPath(uri)); let f = map.get(k); if (!f) { const bn = k.split('/').pop(); f = files.find(x => normPath(x.name).split('/').pop() === bn); } return f ? f.data.buffer.slice(f.data.byteOffset, f.data.byteOffset + f.data.byteLength) : null; };
        return C.parseGLTF(JSON.parse(new TextDecoder().decode(gf.data)), null, res);
      }
      const daes = files.filter(f => /\.dae$/i.test(f.name)).sort((a, b) => b.data.byteLength - a.data.byteLength); // KMZ: models/*.dae (en büyüğü)
      if (daes.length) {
        const df = daes[0], dir = normPath(df.name).split('/').slice(0, -1).join('/');
        const res = async uri => { const k = joinPath(dir, normPath(uri).replace(/^file:\/+/, '')); let f = map.get(k); if (!f) { const bn = k.split('/').pop(); f = files.find(x => normPath(x.name).split('/').pop() === bn); } return f ? f.data.buffer.slice(f.data.byteOffset, f.data.byteOffset + f.data.byteLength) : null; };
        return daeModel(df.data.buffer.slice(df.data.byteOffset, df.data.byteOffset + df.data.byteLength), res);
      }
      const other = files.find(f => /\.(obj|stl)$/i.test(f.name)); if (other) return C.loadModelBuffer(other.name, other.data);
      throw new Error('ZIP / KMZ içinde GLB / glTF / DAE / OBJ / STL bulunamadı');
    }
    if (low.endsWith('.gltf')) return C.parseGLTF(JSON.parse(new TextDecoder().decode(ab)), null, getRes);
    if (low.endsWith('.dae')) return daeModel(ab, getRes);
    if (/\.(obj|stl)$/.test(low)) { const m = C.readModel(name, ab); if (!m.f.length) throw new Error('Modelde üçgen bulunamadı'); return m; }
    if (/\.(skp|fbx|3ds|blend|dwg|rfa|ifc|step|stp|igs|iges)$/.test(low)) throw new Error(`${low.split('.').pop().toUpperCase()} biçimi doğrudan okunamıyor. Siteden GLB, glTF, DAE (Collada), KMZ, OBJ ya da STL olarak indirin (3D Warehouse: indirme menüsünden "Collada" ya da "KMZ" seçin).`);
    throw new Error('Tanınmayan model biçimi');
  };

  /* ---------------- modeli kütüphane bloğuna çevir ---------------- */
  const hull = pts => { const p = pts.map(q => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p; const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
  const UNITK = { m: 1, cm: 0.01, mm: 0.001, in: 0.0254 };
  C.TUR_KATMAN = { 'Kapı': ['MIMARI_KAPI', 32], 'Pencere': ['MIMARI_PENCERE', 140], 'Merdiven': ['MIMARI', 8], 'Korkuluk': ['MIMARI', 8], 'Mobilya': ['DONATI', 42], 'Pompa': ['POMPA', 5], 'Ekipman': ['EKIPMAN', 4], 'Vana': ['VANA', 1], 'İnsan': ['CEVRE', 8], 'Ağaç': ['CEVRE', 82], 'Araç': ['CEVRE', 8], 'Elektrik': ['ELEKTRIK', 6] };
  C.modelToDef = function (mesh, meta) {
    let v = mesh.v.map(p => [p[0], p[1], p[2]]); const k = mesh.birimli ? 1 : (UNITK[meta.unit || 'm'] || 1); /* DAE / KMZ kendi birimini taşır, metreye çevrilmiş gelir */ if (k !== 1) v = v.map(p => p.map(x => x * k));
    let bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; for (const p of v) for (let i = 0; i < 3; i++) { bb[i] = Math.min(bb[i], p[i]); bb[i + 3] = Math.max(bb[i + 3], p[i]); }
    let s = 1; if (meta.targetH > 0 && bb[5] - bb[2] > 1e-9) s = meta.targetH / (bb[5] - bb[2]);
    const cx = (bb[0] + bb[3]) / 2, cy = (bb[1] + bb[4]) / 2, z0 = bb[2], r = x => Math.round(x * 1e4) / 1e4;
    v = v.map(p => [r((p[0] - cx) * s), r((p[1] - cy) * s), r((p[2] - z0) * s)]);
    const fc = (mesh.fc || []).map(c => c.map(x => Math.round(x * 1000) / 1000));
    const E = (type, pr) => Object.assign({ type, layer: '0', color: 0, lt: 'BYBLOCK', lw: -2 }, pr);
    const hp = hull(v); const ents = hp.length >= 3 ? [E('pline', { pts: hp.map(q => [r(q[0]), r(q[1]), 0]), closed: true })] : C.planFromMesh({ v, f: mesh.f });
    const tur = meta.tur || 'Ekipman', lk = C.TUR_KATMAN[tur] || ['MODEL_3B', 8];
    const def = { id: C.blkUid(meta.name || 'Model'), name: meta.name || 'Model', tur, dn: null, view: 'plan', unit: 'm', layer: lk[0], layerColor: lk[1], ents, mesh3d: { v, f: mesh.f, fc: fc.length === mesh.f.length ? fc : undefined }, src: meta.src || '', author: meta.author || '', license: meta.license || '', url: meta.url || '', thumb: meta.thumb || '' };
    def.bb = C.defBox(def);
    def.dims = [r((bb[3] - bb[0]) * s), r((bb[4] - bb[1]) * s), r((bb[5] - bb[2]) * s)];
    C.blib.put(def); return def;
  };

  /* ---------------- çevrimiçi kaynaklar ---------------- */
  const TR_EN = { 'kapı': 'door', 'kapi': 'door', 'pencere': 'window', 'pompa': 'pump', 'dalgıç': 'submersible', 'dalgic': 'submersible', 'vana': 'valve', 'blower': 'blower', 'fan': 'fan', 'körük': 'blower', 'tank': 'tank', 'depo': 'tank', 'merdiven': 'stairs', 'korkuluk': 'railing', 'mobilya': 'furniture', 'masa': 'table', 'sandalye': 'chair', 'dolap': 'cabinet', 'insan': 'human', 'adam': 'man', 'ağaç': 'tree', 'agac': 'tree', 'araç': 'car', 'arac': 'car', 'kamyon': 'truck', 'pano': 'electrical panel', 'elektrik': 'electrical', 'boru': 'pipe', 'kompresör': 'compressor', 'kompresor': 'compressor', 'motor': 'electric motor', 'vinç': 'crane', 'vinc': 'crane', 'ızgara': 'grating', 'izgara': 'grating', 'lamba': 'lamp', 'aydınlatma': 'light', 'karıştırıcı': 'mixer', 'karistirici': 'mixer', 'mikser': 'mixer', 'çit': 'fence', 'cit': 'fence', 'kapak': 'hatch', 'rögar': 'manhole', 'rogar': 'manhole', 'bina': 'building', 'çatı': 'roof', 'konteyner': 'container', 'jeneratör': 'generator', 'jenerator': 'generator', 'trafo': 'transformer', 'filtre': 'filter', 'eşanjör': 'heat exchanger', 'kazan': 'boiler', 'kepenk': 'shutter', 'garaj': 'garage', 'tuvalet': 'toilet', 'lavabo': 'sink' };
  C.trToEn = q => String(q || '').toLowerCase().split(/\s+/).map(w => TR_EN[w] || w).join(' ').trim();
  const CHIPS = [['Kapı', 'door', 2.1], ['Pencere', 'window', 1.5], ['Pompa', 'pump', null], ['Dalgıç pompa', 'submersible pump', null], ['Vana', 'valve', null], ['Blower / fan', 'blower', null], ['Mikser', 'mixer', null], ['Tank', 'tank', null], ['Merdiven', 'stairs', null], ['Korkuluk', 'railing', 1.1], ['Elektrik panosu', 'electrical panel', 2.0], ['Mobilya', 'furniture', null], ['İnsan', 'human', 1.75], ['Ağaç', 'tree', null], ['Araç', 'car', null]];
  const CHIP_TUR = { 'Kapı': 'Kapı', 'Pencere': 'Pencere', 'Pompa': 'Pompa', 'Dalgıç pompa': 'Pompa', 'Vana': 'Vana', 'Blower / fan': 'Ekipman', 'Mikser': 'Ekipman', 'Tank': 'Ekipman', 'Merdiven': 'Merdiven', 'Korkuluk': 'Korkuluk', 'Elektrik panosu': 'Elektrik', 'Mobilya': 'Mobilya', 'İnsan': 'İnsan', 'Ağaç': 'Ağaç', 'Araç': 'Araç' };
  const store = { get: (k, d) => { try { const v = localStorage.getItem('aritmacad.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('aritmacad.' + k, JSON.stringify(v)); } catch (e) { } } };
  const getJSON = async (url, opts) => { const r = await fetch(url, opts); if (!r.ok) { const t = await r.text().catch(() => ''); const e = new Error(`${r.status} ${r.statusText}${t ? ' — ' + t.slice(0, 160) : ''}`); e.status = r.status; throw e; } return r.json(); };
  const getBuf = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`İndirilemedi (${r.status})`); return r.arrayBuffer(); };
  const thumbData = async url => { try { const b = await (await fetch(url)).blob(), bmp = await createImageBitmap(b), cv = document.createElement('canvas'), W = 150, H = 96, k = Math.min(W / bmp.width, H / bmp.height); cv.width = W; cv.height = H; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(bmp, (W - bmp.width * k) / 2, (H - bmp.height * k) / 2, bmp.width * k, bmp.height * k); return cv.toDataURL('image/jpeg', 0.8); } catch (e) { return ''; } };

  const SRC = {
    ph: { // Poly Haven — CC0, anahtar gerekmez
      name: 'Poly Haven', note: 'CC0 (serbest, atıf gerekmez) · anahtar gerekmez · Powered by Poly Haven', list: null,
      async search(q) {
        if (!this.list) { const j = await getJSON('https://api.polyhaven.com/assets?t=models'); this.list = Object.entries(j).map(([id, a]) => ({ id, name: a.name || id, tags: [...(a.tags || []), ...(a.categories || [])].join(' ').toLowerCase(), author: Object.keys(a.authors || {}).join(', ') })); }
        const ws = C.trToEn(q).split(/\s+/).filter(Boolean);
        const hit = this.list.filter(a => !ws.length || ws.some(w => (a.name.toLowerCase() + ' ' + a.tags + ' ' + a.id).includes(w)));
        return hit.slice(0, 60).map(a => ({ src: 'ph', id: a.id, name: a.name, author: a.author, license: 'CC0', thumb: `https://cdn.polyhaven.com/asset_img/thumbs/${a.id}.png?width=256&height=256`, url: `https://polyhaven.com/a/${a.id}` }));
      },
      async download(it) {
        const j = await getJSON('https://api.polyhaven.com/files/' + encodeURIComponent(it.id));
        const g = j.gltf || {}; const res = g['1k'] || g['2k'] || Object.values(g)[0]; if (!res || !res.gltf) throw new Error('Bu modelin glTF dosyası yok');
        const main = res.gltf, inc = main.include || {}, cache = new Map();
        const getRes = async uri => { const k = normPath(uri); const ent = Object.entries(inc).find(([p]) => normPath(p) === k || normPath(p).endsWith('/' + k.split('/').pop())); if (!ent) return null; if (!cache.has(k)) cache.set(k, getBuf(ent[1].url)); return cache.get(k); };
        const json = await getJSON(main.url); return C.parseGLTF(json, null, getRes);
      },
    },
    sf: { // Sketchfab — arama serbest, indirme için ücretsiz hesap anahtarı
      name: 'Sketchfab', note: 'Çoğu model CC-BY: kullanırken yazarını belirtin (bilgi bloğa kaydedilir) · indirmek için ücretsiz Sketchfab API anahtarı gerekir', next: null,
      async search(q, more) {
        const url = more && this.next ? this.next : `https://api.sketchfab.com/v3/search?type=models&downloadable=true&count=24&sort_by=-likeCount&q=${encodeURIComponent(C.trToEn(q))}`;
        const j = await getJSON(url); this.next = j.next || null;
        return (j.results || []).map(r => { const im = ((r.thumbnails || {}).images || []).slice().sort((a, b) => Math.abs(a.width - 256) - Math.abs(b.width - 256))[0]; const lic = r.license ? (r.license.label || r.license.slug || '') : ''; return { src: 'sf', id: r.uid, name: r.name, author: (r.user && (r.user.displayName || r.user.username)) || '', license: lic || 'Sketchfab (lisansa bakın)', thumb: im ? im.url : '', url: r.viewerUrl || `https://sketchfab.com/3d-models/${r.uid}`, faces: r.faceCount }; });
      },
      async download(it) {
        const tok = (store.get('sketchfabToken', '') || '').trim(); if (!tok) throw new Error('Sketchfab anahtarı girilmemiş. Aşağıdaki alana ücretsiz hesabınızın API anahtarını yapıştırın.');
        let j; try { j = await getJSON(`https://api.sketchfab.com/v3/models/${it.id}/download`, { headers: { Authorization: 'Token ' + tok } }); }
        catch (e) { if (e.status === 401 || e.status === 403) throw new Error('Sketchfab anahtarı geçersiz ya da bu model indirmeye kapalı.'); throw e; }
        const pick = j.glb || j.gltf; if (!pick || !pick.url) throw new Error('Bu model için glTF indirme bağlantısı yok');
        const buf = await getBuf(pick.url); return C.loadModelBuffer(j.glb ? 'model.glb' : 'model.zip', buf);
      },
    },
  };
  C.MODEL_SOURCES = SRC;
  const OTHER = [
    ['Poly Pizza', 'https://poly.pizza', 'Düşük poligonlu binlerce model (CC0 / CC-BY). "Download → GLB" seçin.'],
    ['Kenney', 'https://kenney.nl/assets?q=3d', 'CC0 model paketleri (şehir, mobilya, araç). ZIP içindeki GLB / OBJ dosyalarını yükleyin.'],
    ['SketchUp 3D Warehouse', 'https://3dwarehouse.sketchup.com', 'Kapı, pencere, ekipman. İndirme menüsünden "Collada (.dae)" ya da "KMZ" seçip dosyayı buraya sürükleyin (SKP doğrudan okunmaz).'],
    ['BIMobject', 'https://www.bimobject.com', 'Üretici BIM nesneleri (kapı, pencere, pompa, vana). OBJ ya da 3DS/IFC yerine "OBJ" indirin.'],
    ['GrabCAD Library', 'https://grabcad.com/library', 'Mühendislik modelleri (pompa, vana, blower, mikser). STL olarak indirin.'],
    ['Grundfos Product Center', 'https://product-selection.grundfos.com', 'Pompa CAD çizimleri (DWG / 3B). 3B için STL / OBJ seçin.'],
    ['Free3D', 'https://free3d.com', 'Ücretsiz OBJ modeller (lisansı model sayfasında).'],
    ['CGTrader (ücretsiz)', 'https://www.cgtrader.com/free-3d-models', 'Ücretsiz modeller; OBJ / GLB seçin.'],
  ];

  /* ---------------- pencere ---------------- */
  const st = Object.assign({ src: 'ph', q: '', tur: 'Ekipman', h: '', unit: 'm' }, store.get('modelLib', {}));
  st.h = '';
  C.openModelLib = function () {
    const body = C.modal('Ücretsiz 3B model kütüphanesi', `
      <div class="bar"><select id="mlSrc"><option value="ph">Poly Haven — CC0, anahtarsız</option><option value="sf">Sketchfab — çok geniş (kapı, pencere, pompa…)</option></select>
        <input id="mlQ" placeholder="Ara: kapı, pencere, pompa, vana…" value="${esc(st.q)}" style="flex:1;min-width:140px"><button id="mlGo" class="pri">Ara</button></div>
      <div class="bar" id="mlChips">${CHIPS.map(([t]) => `<button class="chip" data-c="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <div class="bar"><label>Cins <select id="mlTur">${Object.keys(C.TUR_KATMAN).map(t => `<option ${t === st.tur ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label title="Model bu yüksekliğe ölçeklenir; boş = modeldeki ölçü">Gerçek yükseklik (m) <input id="mlH" type="number" step="0.01" min="0" value="${esc(st.h)}" style="width:70px"></label>
        <label>Model birimi <select id="mlUnit">${['m', 'cm', 'mm', 'in'].map(u => `<option ${u === st.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></label></div>
      <div class="bar" id="mlKey" style="display:none">Sketchfab API anahtarı <input id="sfTok" type="password" value="${esc(store.get('sketchfabToken', ''))}" style="flex:1;min-width:160px"> <a href="https://sketchfab.com/settings/password" target="_blank" rel="noopener">Anahtarımı göster (ücretsiz hesap)</a></div>
      <p class="hint" id="mlNote"></p>
      <div id="mlRes" class="blgrid"><p class="hint">Bir kategori seçin ya da arayın. Türkçe yazabilirsiniz (kapı → door).</p></div>
      <div class="bar"><button id="mlMore" style="display:none">Daha fazla…</button></div>
      <div id="mlDrop" class="drop-zone">📂 İndirdiğiniz modeli buraya sürükleyin ya da <button id="mlFile">dosya seçin</button> — GLB, glTF (ZIP), DAE / KMZ (3D Warehouse), OBJ, STL</div>
      <h3>Diğer ücretsiz kaynaklar</h3>
      <ul class="mllinks">${OTHER.map(([n, u, d]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(n)}</a> — <span class="hint">${esc(d)}</span></li>`).join('')}</ul>
      <p class="hint">İndirilen modeller blok kütüphanenize (Kütüphane → Sizin bloklarınız) kaydedilir; planda üstten görünüş sınırı, 3B'de malzeme renkleriyle görünür ve malzeme listesinde (BOM) sayılır. Lisans ve yazar bilgisi bloğa yazılır.</p>`);
    const $ = s => body.querySelector(s);
    $('#mlSrc').value = st.src;
    const save = () => { st.src = $('#mlSrc').value; st.q = $('#mlQ').value; st.tur = $('#mlTur').value; st.unit = $('#mlUnit').value; store.set('modelLib', st); };
    const upd = () => { const s = SRC[$('#mlSrc').value]; $('#mlNote').textContent = s.note; $('#mlKey').style.display = $('#mlSrc').value === 'sf' ? '' : 'none'; };
    upd();
    $('#mlSrc').onchange = () => { upd(); save(); if ($('#mlQ').value) run(); };
    $('#sfTok').onchange = e => store.set('sketchfabToken', e.target.value.trim());
    ['#mlTur', '#mlH', '#mlUnit'].forEach(s => $(s).onchange = save);
    let items = [];
    const card = (it, i) => `<div class="blcard mlcard" data-i="${i}" title="${esc(it.name)}${it.faces ? ' · ' + it.faces.toLocaleString('tr-TR') + ' üçgen' : ''}">${it.thumb ? `<img src="${esc(it.thumb)}" loading="lazy" referrerpolicy="no-referrer" alt="">` : '<div class="noimg">3B</div>'}<div class="bln">${esc(it.name)}</div><div class="hint">${esc(it.author)}${it.license ? ' · ' + esc(it.license) : ''}</div><div class="mlbtns"><button data-a="add">Kütüphaneye ekle</button><button data-a="ins" class="pri">Yerleştir</button><a href="${esc(it.url)}" target="_blank" rel="noopener" title="Sayfasını aç">↗</a></div></div>`;
    const render = append => {
      const r = $('#mlRes'); r.innerHTML = items.length ? items.map(card).join('') : '<p class="hint">Sonuç yok. Başka bir kelime deneyin (İngilizce de yazabilirsiniz).</p>';
      $('#mlMore').style.display = $('#mlSrc').value === 'sf' && SRC.sf.next ? '' : 'none';
      r.querySelectorAll('.mlcard').forEach(el => el.querySelectorAll('[data-a]').forEach(b => b.onclick = ev => { ev.stopPropagation(); get(items[+el.dataset.i], b.dataset.a === 'ins', el); }));
    };
    const run = async more => {
      save(); const s = SRC[$('#mlSrc').value]; const r = $('#mlRes'); if (!more) r.innerHTML = '<p class="hint">Aranıyor…</p>';
      try { const res = await s.search($('#mlQ').value, more); items = more ? items.concat(res) : res; render(); }
      catch (e) { r.innerHTML = `<p class="hint">Arama yapılamadı: ${esc(e.message)}. İnternet bağlantınızı kontrol edin; site erişimi engelliyorsa aşağıdaki sitelerden indirip dosyayı buraya sürükleyin.</p>`; }
    };
    let chipH = false; const free = () => { if (chipH) { $('#mlH').value = ''; chipH = false; } run(); };
    $('#mlH').oninput = () => { chipH = false; };
    $('#mlGo').onclick = free; $('#mlQ').onkeydown = e => { if (e.key === 'Enter') free(); }; $('#mlMore').onclick = () => run(true);
    body.querySelectorAll('#mlChips .chip').forEach(b => b.onclick = () => { const c = CHIPS.find(x => x[0] === b.dataset.c); $('#mlQ').value = c[0]; if (CHIP_TUR[c[0]]) $('#mlTur').value = CHIP_TUR[c[0]]; $('#mlH').value = c[2] || ''; chipH = !!c[2]; run(); });
    const finish = (def, insert) => {
      C.log(`3B model kütüphaneye eklendi: ${def.name} — ${def.dims.join(' × ')} m (G×D×Y), ${def.mesh3d.f.length.toLocaleString('tr-TR')} üçgen${def.license ? ' · lisans: ' + def.license : ''}${def.author ? ' · yazar: ' + def.author : ''}`);
      if (def.mesh3d.f.length > 150000) C.warn('Bu model çok ayrıntılı; çizim yavaşlayabilir. Daha sade (low-poly) bir model tercih edin.');
      if (insert) { C.closeModal(); C.runTool('BLOKEKLE ID=' + def.id); }
    };
    const meta = it => ({ name: it.name, author: it.author, license: it.license, url: it.url, src: SRC[it.src].name, tur: $('#mlTur').value, targetH: parseFloat($('#mlH').value) || 0, unit: $('#mlUnit').value });
    const get = async (it, insert, el) => {
      const btns = el.querySelectorAll('button'); btns.forEach(b => b.disabled = true); const lbl = el.querySelector('.bln'), old = lbl.textContent; lbl.textContent = 'İndiriliyor…';
      try { const mesh = await SRC[it.src].download(it); const m = meta(it); m.thumb = it.thumb ? await thumbData(it.thumb) : ''; const def = C.modelToDef(mesh, m); lbl.textContent = '✓ ' + old; finish(def, insert); }
      catch (e) { lbl.textContent = old; C.warn('Model alınamadı: ' + e.message); alert('Model alınamadı: ' + e.message); }
      finally { btns.forEach(b => b.disabled = false); }
    };
    const fromFile = async f => {
      try { const mesh = await C.loadModelBuffer(f.name, await f.arrayBuffer()); const def = C.modelToDef(mesh, { name: f.name.replace(/\.[^.]+$/, ''), src: f.name, tur: $('#mlTur').value, targetH: parseFloat($('#mlH').value) || 0, unit: $('#mlUnit').value }); finish(def, confirm(`"${def.name}" kütüphaneye eklendi (${def.dims.join(' × ')} m). Şimdi çizime yerleştirilsin mi?`)); }
      catch (e) { C.warn('Model okunamadı: ' + e.message); alert('Model okunamadı: ' + e.message); }
    };
    $('#mlFile').onclick = async () => { const f = await C.pickFile('.glb,.gltf,.zip,.dae,.kmz,.obj,.stl'); if (f) fromFile(f); };
    const dz = $('#mlDrop'); dz.ondragover = e => { e.preventDefault(); dz.classList.add('on'); }; dz.ondragleave = () => dz.classList.remove('on');
    dz.ondrop = e => { e.preventDefault(); dz.classList.remove('on'); const f = e.dataTransfer.files[0]; if (f) fromFile(f); };
    if (st.q) run();
  };
  C.addCommand(['MODELKUTUPHANESI', '3BKUTUPHANE', 'MODELARA', 'MODELINDIR'], 'Ücretsiz 3B model kütüphanesi: Poly Haven ve Sketchfab\'da kapı, pencere, pompa, ekipman arayıp indirir; GLB / glTF / DAE / KMZ / OBJ / STL dosyası da yüklenebilir', async () => C.openModelLib(), { noUndo: true });
  C.addCommand(['MODELYUKLE3', 'GLBYUKLE', 'GLTFYUKLE'], 'GLB / glTF (ZIP) / DAE / KMZ / OBJ / STL 3B modelini kütüphaneye ekler (zemine oturur, ortalanır; DAE / KMZ kendi birimini kullanır)', async (I) => {
    const f = await C.pickFile('.glb,.gltf,.zip,.dae,.kmz,.obj,.stl'); if (!f) return;
    const unit = await I.kw('Model birimi', [['m'], ['cm'], ['mm'], ['in']], 'm');
    const h = await I.num('Gerçek yükseklik (m, 0 = modeldeki)', 0);
    const mesh = await C.loadModelBuffer(f.name, await f.arrayBuffer()); const def = C.modelToDef(mesh, { name: f.name.replace(/\.[^.]+$/, ''), src: f.name, unit, targetH: h || 0, tur: 'Ekipman' });
    C.log(`3B model eklendi: ${def.name} — ${def.dims.join(' × ')} m. Yerleştirmek için: BLOKEKLE ID=${def.id}`);
  }, { noUndo: true });
})(window.C);

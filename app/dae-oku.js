/* ArıtmaCAD — COLLADA (.dae) 3B model okuyucu
   SketchUp 3D Warehouse'tan "Collada" ya da "KMZ" olarak indirilen modeller (KMZ = içinde .dae olan ZIP) için.
   Saf kısım (xml, oku) tarayıcıya bağlı değildir; test/dae-oku.test.js ile Node'da denenir.
   Çıktı model3d.js'teki biçimdir: {v, f, fc} — metre, Z yukarı. Dosyanın kendi birimi (<unit meter>) ve
   yukarı ekseni (<up_axis>) uygulanır; bu yüzden sonuç "birimli" işaretlenir (kullanıcının birim seçimi uygulanmaz).
   Desteklenen: triangles, polylist, polygons, trifans, tristrips; matrix / translate / rotate / scale; instance_node;
   malzeme rengi (diffuse color) ve doku (texture → ortalama renk, tarayıcıda). Çizgiler (lines) atlanır. */
(function (C) {
  'use strict';
  const D = C.daeOku = C.daeOku || {};

  /* ---------- küçük XML okuyucu: {ad, at, c (alt düğümler), t (metin)} ---------- */
  const ENT = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
  const unesc = s => s.indexOf('&') < 0 ? s : s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] != null ? ENT[e] : m));
  const yerel = s => { const i = s.indexOf(':'); return i < 0 ? s : s.slice(i + 1); };
  D.xml = function (s) {
    const kok = { ad: '#kok', at: {}, c: [], t: '' }, yigin = [kok]; let i = 0;
    const n = s.length;
    while (i < n) {
      const lt = s.indexOf('<', i);
      const ust = yigin[yigin.length - 1];
      if (lt < 0) { ust.t += unesc(s.slice(i)); break; }
      if (lt > i) ust.t += unesc(s.slice(i, lt));
      if (s.startsWith('<!--', lt)) { const e = s.indexOf('-->', lt + 4); i = e < 0 ? n : e + 3; continue; }
      if (s.startsWith('<![CDATA[', lt)) { const e = s.indexOf(']]>', lt + 9); ust.t += s.slice(lt + 9, e < 0 ? n : e); i = e < 0 ? n : e + 3; continue; }
      if (s[lt + 1] === '?' || s[lt + 1] === '!') { const e = s.indexOf('>', lt); i = e < 0 ? n : e + 1; continue; }
      const gt = s.indexOf('>', lt); if (gt < 0) break;
      if (s[lt + 1] === '/') { // kapanış
        const ad = yerel(s.slice(lt + 2, gt).trim());
        for (let k = yigin.length - 1; k > 0; k--) if (yigin[k].ad === ad) { yigin.length = k; break; }
        i = gt + 1; continue;
      }
      let ic = s.slice(lt + 1, gt); const kendi = ic.endsWith('/'); if (kendi) ic = ic.slice(0, -1);
      const m = /^\s*([^\s/>]+)/.exec(ic); const dg = { ad: yerel(m ? m[1] : ''), at: {}, c: [], t: '' };
      const re = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g; let a; const atStr = m ? ic.slice(m[0].length) : '';
      while ((a = re.exec(atStr))) dg.at[yerel(a[1])] = unesc(a[3] != null ? a[3] : a[4]);
      ust.c.push(dg); if (!kendi) yigin.push(dg);
      i = gt + 1;
    }
    return kok;
  };
  const alt = (d, ad) => d ? d.c.find(x => x.ad === ad) : null;
  const altlar = (d, ad) => d ? d.c.filter(x => x.ad === ad) : [];
  const yol = (d, ...adlar) => { for (const a of adlar) { d = alt(d, a); if (!d) return null; } return d; };
  const hepsi = (d, ad, out) => { out = out || []; if (!d) return out; for (const x of d.c) { if (x.ad === ad) out.push(x); hepsi(x, ad, out); } return out; };
  const sayilar = t => { const p = String(t || '').trim(); return p ? p.split(/\s+/).map(Number) : []; };
  const ref = u => String(u || '').replace(/^#/, '');

  /* ---------- 4×4 matris (satır öncelikli, COLLADA gibi) ---------- */
  const BIR = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const carp = (a, b) => { const o = new Array(16); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { let t = 0; for (let k = 0; k < 4; k++) t += a[r * 4 + k] * b[k * 4 + c]; o[r * 4 + c] = t; } return o; };
  const donus = (x, y, z, derece) => {
    const L = Math.hypot(x, y, z) || 1; x /= L; y /= L; z /= L; const a = derece * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, 0, t * x * y + s * z, t * y * y + c, t * y * z - s * x, 0, t * x * z - s * y, t * y * z + s * x, t * z * z + c, 0, 0, 0, 0, 1];
  };
  const dugumMatris = d => {
    let m = BIR;
    for (const x of d.c) {
      const s = sayilar(x.t);
      if (x.ad === 'matrix' && s.length >= 16) m = carp(m, s.slice(0, 16));
      else if (x.ad === 'translate' && s.length >= 3) m = carp(m, [1, 0, 0, s[0], 0, 1, 0, s[1], 0, 0, 1, s[2], 0, 0, 0, 1]);
      else if (x.ad === 'rotate' && s.length >= 4) m = carp(m, donus(s[0], s[1], s[2], s[3]));
      else if (x.ad === 'scale' && s.length >= 3) m = carp(m, [s[0], 0, 0, 0, 0, s[1], 0, 0, 0, 0, s[2], 0, 0, 0, 0, 1]);
    }
    return m;
  };
  const det3 = m => m[0] * (m[5] * m[10] - m[6] * m[9]) - m[1] * (m[4] * m[10] - m[6] * m[8]) + m[2] * (m[4] * m[9] - m[5] * m[8]);

  /* ---------- malzemeler: id → {renk:[r,g,b] | null, doku: dosya yolu | null} ---------- */
  const malzemeler = kok => {
    const resim = {}; for (const im of hepsi(kok, 'image')) { const f = alt(im, 'init_from'); const yolu = f ? (alt(f, 'ref') ? alt(f, 'ref').t : f.t) : ''; if (im.at.id) resim[im.at.id] = String(yolu).trim(); }
    const efekt = {};
    for (const ef of hepsi(kok, 'effect')) {
      const np = {}; for (const p of hepsi(ef, 'newparam')) np[p.at.sid] = p;
      const dokuBul = tx => { // texture@texture → sampler → surface → image (ya da doğrudan image id)
        let id = tx.at.texture, guv = 0;
        while (id && np[id] && guv++ < 4) {
          const smp = alt(np[id], 'sampler2D'), sf = alt(np[id], 'surface');
          if (smp) { const src = alt(smp, 'source'), ins = alt(smp, 'instance_image'); id = src ? src.t.trim() : (ins ? ref(ins.at.url) : null); }
          else if (sf) { const f = alt(sf, 'init_from'); id = f ? f.t.trim() : null; }
          else break;
        }
        return id && resim[id] != null ? resim[id] : null;
      };
      const tek = yol(ef, 'profile_COMMON', 'technique'); let renk = null, doku = null;
      const tip = tek && tek.c.find(x => /^(phong|lambert|blinn|constant)$/.test(x.ad));
      if (tip) {
        const dif = alt(tip, 'diffuse') || alt(tip, 'emission');
        const col = alt(dif, 'color'), tx = alt(dif, 'texture');
        if (col) renk = sayilar(col.t).slice(0, 3);
        if (tx) doku = dokuBul(tx);
      }
      if (ef.at.id) efekt[ef.at.id] = { renk, doku };
    }
    const mat = {}; for (const m of hepsi(kok, 'material')) { const ie = alt(m, 'instance_effect'); if (m.at.id) mat[m.at.id] = (ie && efekt[ref(ie.at.url)]) || { renk: null, doku: null }; }
    return mat;
  };

  /* ---------- geometri: id → {pos: Float64Array, parcalar: [{mat (sembol), ucgen: [[a,b,c],...]}]} ---------- */
  const geometri = (g) => {
    const mesh = alt(g, 'mesh'); if (!mesh) return null;
    const kaynak = {}; for (const s of altlar(mesh, 'source')) { const fa = alt(s, 'float_array'); const acc = yol(s, 'technique_common', 'accessor'); kaynak[s.at.id] = { veri: sayilar(fa && fa.t), adim: acc ? +(acc.at.stride || 3) : 3, kayma: acc ? +(acc.at.offset || 0) : 0 }; }
    const verts = alt(mesh, 'vertices'); let posId = null;
    if (verts) { const inp = altlar(verts, 'input').find(x => x.at.semantic === 'POSITION'); if (inp) posId = ref(inp.at.source); }
    const parcalar = []; const kullanilan = {};
    for (const pr of mesh.c) {
      if (!/^(triangles|polylist|polygons|trifans|tristrips)$/.test(pr.ad)) continue;
      const girdi = altlar(pr, 'input'); if (!girdi.length) continue;
      const adim = Math.max(...girdi.map(x => +(x.at.offset || 0))) + 1;
      const vg = girdi.find(x => x.at.semantic === 'VERTEX') || girdi.find(x => x.at.semantic === 'POSITION'); if (!vg) continue;
      const off = +(vg.at.offset || 0), kId = vg.at.semantic === 'VERTEX' ? posId : ref(vg.at.source); if (!kId || !kaynak[kId]) continue;
      kullanilan[kId] = 1;
      const ucgen = [], sira = p => { const o = []; for (let i = off; i < p.length; i += adim) o.push(p[i]); return o; };
      const fan = ix => { for (let i = 1; i + 1 < ix.length; i++) ucgen.push([ix[0], ix[i], ix[i + 1]]); };
      if (pr.ad === 'triangles') { for (const p of altlar(pr, 'p')) { const ix = sira(sayilar(p.t)); for (let i = 0; i + 2 < ix.length; i += 3) ucgen.push([ix[i], ix[i + 1], ix[i + 2]]); } }
      else if (pr.ad === 'polylist') { const vc = sayilar((alt(pr, 'vcount') || {}).t); const ix = sira(sayilar((alt(pr, 'p') || {}).t)); let k = 0; for (const c of vc) { fan(ix.slice(k, k + c)); k += c; } }
      else if (pr.ad === 'polygons') { for (const p of altlar(pr, 'p')) fan(sira(sayilar(p.t))); for (const ph of altlar(pr, 'ph')) { const p = alt(ph, 'p'); if (p) fan(sira(sayilar(p.t))); } }
      else if (pr.ad === 'trifans') { for (const p of altlar(pr, 'p')) fan(sira(sayilar(p.t))); }
      else if (pr.ad === 'tristrips') { for (const p of altlar(pr, 'p')) { const ix = sira(sayilar(p.t)); for (let i = 0; i + 2 < ix.length; i++) ucgen.push(i % 2 ? [ix[i + 1], ix[i], ix[i + 2]] : [ix[i], ix[i + 1], ix[i + 2]]); } }
      if (ucgen.length) parcalar.push({ mat: pr.at.material || '', kaynak: kId, ucgen });
    }
    return { kaynak, parcalar };
  };

  /* ---------- ana okuyucu: metin → {v, f, fc, fm, mats, birimli} ----------
     fm: her üçgenin malzeme id'si; mats: id → {renk, doku}. fc doku olmadan doldurulur (renkle() dokuyu katar). */
  D.oku = function (metin) {
    const kok = D.xml(String(metin)); const col = kok.c.find(x => x.ad === 'COLLADA');
    if (!col) throw new Error('COLLADA (.dae) dosyası değil');
    const asset = alt(col, 'asset'), birim = alt(asset, 'unit'), k = birim && +birim.at.meter > 0 ? +birim.at.meter : 1;
    const up = String((alt(asset, 'up_axis') || {}).t || 'Y_UP').trim().toUpperCase();
    const eksen = up === 'Z_UP' ? (x, y, z) => [x, y, z] : up === 'X_UP' ? (x, y, z) => [-y, -z, x] : (x, y, z) => [x, -z, y];
    const mats = malzemeler(col);
    const geo = {}; for (const g of hepsi(alt(col, 'library_geometries'), 'geometry')) if (g.at.id) geo[g.at.id] = g;
    const geoCache = {}; const geoAl = id => { if (!(id in geoCache)) geoCache[id] = geo[id] ? geometri(geo[id]) : null; return geoCache[id]; };
    const dugum = {}; for (const lib of altlar(col, 'library_nodes')) for (const nd of hepsi(lib, 'node')) if (nd.at.id) dugum[nd.at.id] = nd;
    const out = { v: [], f: [], fc: [], fm: [], mats, birimli: true };
    const ekle = (g, m, bag) => {
      const ters = det3(m) < 0, tabanlar = {};
      for (const pc of g.parcalar) {
        const kn = g.kaynak[pc.kaynak];
        if (!(pc.kaynak in tabanlar)) {
          tabanlar[pc.kaynak] = out.v.length; const d = kn.veri;
          for (let i = kn.kayma; i + 2 < d.length; i += kn.adim) { const x = d[i], y = d[i + 1], z = d[i + 2]; const X = m[0] * x + m[1] * y + m[2] * z + m[3], Y = m[4] * x + m[5] * y + m[6] * z + m[7], Z = m[8] * x + m[9] * y + m[10] * z + m[11]; out.v.push(eksen(X * k, Y * k, Z * k)); }
        }
        const b = tabanlar[pc.kaynak], nv = out.v.length, matId = bag[pc.mat] || pc.mat, mt = mats[matId], renk = mt && mt.renk ? mt.renk : [0.8, 0.8, 0.8];
        for (const t of pc.ucgen) {
          const a = b + t[0], c1 = b + t[1], c2 = b + t[2]; if (a >= nv || c1 >= nv || c2 >= nv || t[0] < 0 || t[1] < 0 || t[2] < 0) continue;
          out.f.push(ters ? [a, c2, c1] : [a, c1, c2]); out.fc.push(renk.map(x => Math.max(0, Math.min(1, x)))); out.fm.push(matId);
        }
      }
    };
    const bagla = ig => { const o = {}; for (const im of hepsi(alt(ig, 'bind_material'), 'instance_material')) o[im.at.symbol] = ref(im.at.target); return o; };
    const gez = (nd, ust, derin) => {
      if (derin > 48) return; const m = carp(ust, dugumMatris(nd));
      for (const x of nd.c) {
        if (x.ad === 'instance_geometry') { const g = geoAl(ref(x.at.url)); if (g) ekle(g, m, bagla(x)); }
        else if (x.ad === 'instance_node') { const h = dugum[ref(x.at.url)]; if (h) gez(h, m, derin + 1); }
        else if (x.ad === 'node') gez(x, m, derin + 1);
      }
    };
    const scIns = yol(col, 'scene', 'instance_visual_scene');
    const sahneler = hepsi(alt(col, 'library_visual_scenes'), 'visual_scene');
    const sahne = (scIns && sahneler.find(s => s.at.id === ref(scIns.at.url))) || sahneler[0];
    if (sahne) for (const nd of altlar(sahne, 'node')) gez(nd, BIR, 0);
    else for (const id in geo) { const g = geoAl(id); if (g) ekle(g, BIR, {}); } // sahnesiz dosya: geometriler olduğu gibi
    if (!out.f.length) throw new Error('Modelde üçgen bulunamadı');
    return out;
  };

  /* dokulu malzemelerin rengini dokunun ortalama rengiyle çarp. dokuRenk(yol) → Promise<[r,g,b] | null> */
  D.renkle = async function (m, dokuRenk) {
    const ort = {};
    for (const id in m.mats) { const mt = m.mats[id]; if (mt && mt.doku && dokuRenk) { try { const c = await dokuRenk(mt.doku); if (c) ort[id] = c.map((x, i) => x * (mt.renk ? mt.renk[i] : 1)); } catch (e) { } } }
    if (Object.keys(ort).length) for (let i = 0; i < m.f.length; i++) { const c = ort[m.fm[i]]; if (c) m.fc[i] = c.map(x => Math.max(0, Math.min(1, x))); }
    return m;
  };
  if (typeof window !== 'undefined' && window.DIL && window.DIL.ekle) { try { window.DIL.ekle('en', 'English', [['COLLADA (.dae) dosyası değil', 'Not a COLLADA (.dae) file'], ['Modelde üçgen bulunamadı', 'No triangles found in the model'],
    ['ZIP / KMZ içinde GLB / glTF / DAE / OBJ / STL bulunamadı', 'No GLB / glTF / DAE / OBJ / STL found in the ZIP / KMZ'],
    ['Kapı, pencere, ekipman. İndirme menüsünden "Collada (.dae)" ya da "KMZ" seçip dosyayı buraya sürükleyin (SKP doğrudan okunmaz).', 'Doors, windows, equipment. Choose "Collada (.dae)" or "KMZ" in the download menu and drag the file here (SKP cannot be read directly).'],
    ['GLB, glTF (ZIP), DAE / KMZ (3D Warehouse), OBJ, STL', 'GLB, glTF (ZIP), DAE / KMZ (3D Warehouse), OBJ, STL']]); } catch (e) { } }
})(typeof window !== 'undefined' ? window.C : globalThis.C);

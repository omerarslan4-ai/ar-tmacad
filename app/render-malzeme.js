/* ArıtmaCAD — RENDER MALZEMELERİ ve glTF (GLB) ÜRETİCİSİ
   Google 3B sekmesindeki "Render kipi" (app/saha3b.js) tesis modelini fiziksel tabanlı (PBR) malzemelerle çizer: her katmana / nesneye bir
   malzeme atanır (renk, metallik, pürüz, doku), model bellekte bir glTF dosyasına (GLB) çevrilir ve ışık, gölge, gökyüzü aydınlatmasıyla çizilir.
   - C.renderMalz.LISTE: hazır malzemeler · C.renderMalz.varsayilan(katman): katmana göre öneri · C.renderMalz.sec(doc, e): nesnenin malzemesi
   - C.renderMalz.glb({ parcalar, malzemeler, dokular }): üçgen çorbalarından GLB (Uint8Array)
   Atamalar projede saklanır: C.doc.set.render = { katman: { KATMAN: malzemeId }, … } ve nesnede e.rmat (katmanı ezer).
   Saf fonksiyonlardır; test/render-malzeme.test.js ile Node'da denenir. */
(function (C) {
  'use strict';
  const R = C.renderMalz = {};
  /* renk: [r, g, b, a] (0–1, doğrusal değil — ekranda görülen renk) · metal / puruz: PBR · doku: gri tonlu desen adı (renkle çarpılır) · karo: dokunun kapladığı kenar (m) */
  R.LISTE = {
    beton: { ad: 'Brüt beton', renk: [0.72, 0.71, 0.68, 1], metal: 0, puruz: 0.92, doku: 'beton', karo: 3 },
    beton_koyu: { ad: 'Beton (koyu, çatı)', renk: [0.52, 0.53, 0.55, 1], metal: 0, puruz: 0.95, doku: 'beton', karo: 3 },
    siva_beyaz: { ad: 'Boyalı sıva — beyaz', renk: [0.93, 0.93, 0.90, 1], metal: 0, puruz: 0.88, doku: 'siva', karo: 2.5 },
    siva_gri: { ad: 'Boyalı sıva — açık gri', renk: [0.75, 0.75, 0.75, 1], metal: 0, puruz: 0.88, doku: 'siva', karo: 2.5 },
    siva_krem: { ad: 'Boyalı sıva — krem', renk: [0.89, 0.86, 0.78, 1], metal: 0, puruz: 0.88, doku: 'siva', karo: 2.5 },
    siva_mavi: { ad: 'Boyalı sıva — mavi (#105689)', renk: [0.063, 0.337, 0.537, 1], metal: 0, puruz: 0.80, doku: 'siva', karo: 2.5 },
    celik_mavi: { ad: 'Boyalı çelik — mavi', renk: [0.07, 0.26, 0.44, 1], metal: 0.35, puruz: 0.45 },
    celik_antrasit: { ad: 'Boyalı çelik — antrasit', renk: [0.16, 0.18, 0.21, 1], metal: 0.4, puruz: 0.5 },
    sari_boya: { ad: 'Boyalı çelik — sarı (korkuluk)', renk: [0.93, 0.74, 0.08, 1], metal: 0.25, puruz: 0.5 },
    paslanmaz: { ad: 'Paslanmaz çelik', renk: [0.78, 0.79, 0.80, 1], metal: 1, puruz: 0.25 },
    galvaniz: { ad: 'Galvaniz çelik', renk: [0.63, 0.65, 0.66, 1], metal: 0.9, puruz: 0.5 },
    cam: { ad: 'Cam', renk: [0.62, 0.82, 0.86, 0.42], metal: 0, puruz: 0.05 },
    asfalt: { ad: 'Asfalt', renk: [0.30, 0.30, 0.31, 1], metal: 0, puruz: 0.96, doku: 'asfalt', karo: 4 },
    parke: { ad: 'Kilit parke', renk: [0.84, 0.80, 0.76, 1], metal: 0, puruz: 0.88, doku: 'parke', karo: 2 },
    cim: { ad: 'Çim', renk: [0.36, 0.56, 0.22, 1], metal: 0, puruz: 1, doku: 'cim', karo: 4 },
    bordur: { ad: 'Beton bordür', renk: [0.82, 0.81, 0.78, 1], metal: 0, puruz: 0.9, doku: 'beton', karo: 3 },
    toprak: { ad: 'Toprak', renk: [0.47, 0.41, 0.33, 1], metal: 0, puruz: 1, doku: 'beton', karo: 3 },
  };
  const KATMAN = [
    [/^INS_PERDE|^INS_TEMEL|^INS_DOSEME$/, 'beton'], [/^INS_KOLON|^INS_KIRIS|^INS_PARAPET/, 'siva_mavi'], [/^INS_DUVAR/, 'siva_gri'], [/^INS_CATI/, 'beton_koyu'],
    [/^INS_KAPI/, 'celik_mavi'], [/^INS_PENCERE/, 'cam'], [/^SAHA_DUVAR/, 'siva_krem'], [/^SAHA_KAPI/, 'celik_antrasit'], [/^SAHA_KORKULUK/, 'sari_boya'],
    [/^SAHA_ZEMIN|^SAHA_KAPLAMA/, 'parke'], [/^SAHA_YOL/, 'asfalt'], [/^SAHA_YESIL/, 'cim'],
  ];
  /* katman adına göre önerilen malzeme (yoksa null) */
  R.varsayilan = katman => { for (const [re, id] of KATMAN) if (re.test(katman || '')) return id; return null; };
  /* nesnenin malzeme kimliği: nesnedeki atama > projedeki katman ataması > katman önerisi > null (çizim rengi kullanılır) */
  R.sec = (doc, e) => { const set = (doc && doc.set && doc.set.render) || {}, k = set.katman || {}; if (e && e.rmat && (R.LISTE[e.rmat] || /^renk:/.test(e.rmat))) return e.rmat; if (e && k[e.layer] && R.LISTE[k[e.layer]]) return k[e.layer]; return R.varsayilan(e && e.layer); };
  /* kimlikten malzeme tanımı; "renk:r,g,b" çizim renginden düz boya üretir */
  R.tanim = id => { if (R.LISTE[id]) return R.LISTE[id]; const m = /^renk:([\d.]+),([\d.]+),([\d.]+)/.exec(id || ''); if (m) return { ad: 'Çizim rengi', renk: [+m[1], +m[2], +m[3], 1], metal: 0, puruz: 0.8 }; return R.LISTE.beton; };
  const srgbDogrusal = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); // glTF renk çarpanı doğrusal uzaydadır

  /* ---------- GLB üretici ----------
     parcalar: [{ pos: [x,y,z,…] (üçgen çorbası), nrm: […], st?: [u,v,…], mat: malzemeId }] · dokular: { ad: Uint8Array (PNG) }
     Koordinatlar olduğu gibi yazılır (yukarı = +Z); yükleyen taraf upAxis = Z, forwardAxis = X vermelidir. */
  R.glb = function (o) {
    const grup = {}; for (const p of o.parcalar || []) { if (!p || !p.pos || !p.pos.length) continue; const g = grup[p.mat] = grup[p.mat] || { pos: [], nrm: [], st: [], n: 0 }; const n = p.pos.length / 3; for (let i = 0; i < p.pos.length; i++) { g.pos.push(p.pos[i]); g.nrm.push(p.nrm ? p.nrm[i] : (i % 3 === 2 ? 1 : 0)); } for (let i = 0; i < n * 2; i++) g.st.push(p.st ? p.st[i] : 0); g.n += n; }
    const idler = Object.keys(grup); if (!idler.length) return null;
    const dokular = o.dokular || {}, tanim = o.tanim || R.tanim, par = []; let boy = 0;
    const ekle = (bayt) => { const ofs = boy, dolgu = (4 - bayt.length % 4) % 4; par.push(bayt); if (dolgu) par.push(new Uint8Array(dolgu)); boy += bayt.length + dolgu; return ofs; };
    const gltf = { asset: { version: '2.0', generator: 'AritmaCAD render' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'tesis' }], meshes: [{ primitives: [] }], materials: [], accessors: [], bufferViews: [], buffers: [{ byteLength: 0 }] };
    const dokuIx = {}; // doku adı → texture indisi
    const dokuAl = ad => { if (!dokular[ad]) return -1; if (dokuIx[ad] != null) return dokuIx[ad]; gltf.samplers = gltf.samplers || [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }]; gltf.images = gltf.images || []; gltf.textures = gltf.textures || []; const ofs = ekle(dokular[ad]); gltf.bufferViews.push({ buffer: 0, byteOffset: ofs, byteLength: dokular[ad].length }); gltf.images.push({ bufferView: gltf.bufferViews.length - 1, mimeType: 'image/png', name: ad }); gltf.textures.push({ sampler: 0, source: gltf.images.length - 1 }); return (dokuIx[ad] = gltf.textures.length - 1); };
    const erisim = (dizi, tip, sinir) => { const f = new Float32Array(dizi), ofs = ekle(new Uint8Array(f.buffer)); gltf.bufferViews.push({ buffer: 0, byteOffset: ofs, byteLength: f.byteLength, target: 34962 }); const a = { bufferView: gltf.bufferViews.length - 1, componentType: 5126, count: f.length / (tip === 'VEC3' ? 3 : 2), type: tip }; if (sinir) { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < f.length; i += 3) for (let k = 0; k < 3; k++) { if (f[i + k] < mn[k]) mn[k] = f[i + k]; if (f[i + k] > mx[k]) mx[k] = f[i + k]; } a.min = mn; a.max = mx; } gltf.accessors.push(a); return gltf.accessors.length - 1; };
    for (const id of idler) {
      const g = grup[id], t = tanim(id), c = t.renk || [0.8, 0.8, 0.8, 1], di = t.doku ? dokuAl(t.doku) : -1, karo = +t.karo || 1;
      const pbr = { baseColorFactor: [srgbDogrusal(c[0]), srgbDogrusal(c[1]), srgbDogrusal(c[2]), c[3] == null ? 1 : c[3]], metallicFactor: +t.metal || 0, roughnessFactor: t.puruz == null ? 0.8 : +t.puruz };
      if (di >= 0) pbr.baseColorTexture = { index: di };
      const mat = { name: id, pbrMetallicRoughness: pbr, doubleSided: true }; if ((c[3] == null ? 1 : c[3]) < 1) mat.alphaMode = 'BLEND';
      gltf.materials.push(mat);
      const at = { POSITION: erisim(g.pos, 'VEC3', true), NORMAL: erisim(g.nrm, 'VEC3') };
      if (di >= 0) at.TEXCOORD_0 = erisim(g.st.map(v => v / karo), 'VEC2');
      gltf.meshes[0].primitives.push({ attributes: at, material: gltf.materials.length - 1, mode: 4 });
    }
    gltf.buffers[0].byteLength = boy;
    let js = JSON.stringify(gltf); const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null; let jb = enc ? enc.encode(js) : Uint8Array.from(Buffer.from(js, 'utf8'));
    const jd = (4 - jb.length % 4) % 4; if (jd) { const t2 = new Uint8Array(jb.length + jd); t2.set(jb); t2.fill(0x20, jb.length); jb = t2; }
    const out = new Uint8Array(12 + 8 + jb.length + 8 + boy), dv = new DataView(out.buffer);
    dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
    dv.setUint32(12, jb.length, true); dv.setUint32(16, 0x4E4F534A, true); out.set(jb, 20);
    let k = 20 + jb.length; dv.setUint32(k, boy, true); dv.setUint32(k + 4, 0x004E4942, true); k += 8; for (const p of par) { out.set(p, k); k += p.length; }
    return out;
  };
  /* AMBİYANS: gün ışığının havası. saat / ay: güneşin konumu · isik: güneş rengi · siddet: güneş gücü · golge: gölge açıklığı (1 = gölge yok)
     ton / doygunluk / parlaklik: gökyüzü ayarı · tarif: yapay zekâ render'a verilen İngilizce betim */
  R.AMBIYANS = {
    gunduz: { ad: 'Açık gün — mavi gökyüzü', saat: 10.5, ay: 6, isik: [1, 0.98, 0.94], siddet: 3.2, golge: 0.62, ton: 0, doygunluk: 0.05, parlaklik: 0.02, tarif: 'clear blue sky, bright midday sunlight, crisp shadows' },
    sabah: { ad: 'Sabah — yumuşak ılık ışık', saat: 7.0, ay: 6, isik: [1, 0.86, 0.68], siddet: 2.6, golge: 0.70, ton: -0.03, doygunluk: -0.05, parlaklik: 0.05, tarif: 'early morning golden light, long soft shadows, light haze, pale blue sky' },
    gunbatimi: { ad: 'Gün batımı — turuncu gökyüzü', saat: 17.9, ay: 6, isik: [1, 0.78, 0.58], siddet: 3.6, golge: 0.66, ton: 0, doygunluk: 0.1, parlaklik: -0.05, gok: [[0, '#33457a'], [0.4, '#8a6396'], [0.7, '#ee8f5e'], [0.9, '#ffc27a'], [1, '#ffe0a8']], tarif: 'sunset, warm orange and pink sky, golden hour light, long shadows' },
    bulutlu: { ad: 'Bulutlu — dağınık ışık', saat: 12.5, ay: 4, isik: [0.93, 0.95, 1], siddet: 1.9, golge: 0.86, ton: 0, doygunluk: -0.6, parlaklik: -0.12, gok: [[0, '#8a949f'], [0.45, '#b4bcc4'], [1, '#dde1e5']], tarif: 'overcast sky, soft diffuse daylight, grey clouds, very soft shadows' },
  };
  R.ambiyans = id => R.AMBIYANS[id] || R.AMBIYANS.gunduz;
  /* fon maskesi: "anahtar renk" (macenta) ile çizilmiş karede gökyüzü pikselinin ağırlığı (0–1). r, g, b: 0–255 */
  R.fonAgirlik = (r, g, b) => { const k = (Math.min(r, b) - g) / 255; return k <= 0.35 ? 0 : k >= 0.85 ? 1 : (k - 0.35) / 0.5; };
  /* güneşin yerel saatine karşılık gelen UTC anı (ISO): boylamdan ortalama güneş saati farkı kullanılır */
  R.gunesAni = (ay, saat, boylam) => { const utc = (+saat) - (+boylam || 0) / 15, gun = new Date(Date.UTC(2026, Math.max(0, Math.min(11, (+ay || 6) - 1)), 21, 0, 0, 0)); gun.setTime(gun.getTime() + utc * 3600e3); return gun.toISOString(); };
})(typeof window !== 'undefined' ? window.C : globalThis.C);

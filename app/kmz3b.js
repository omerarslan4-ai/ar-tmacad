/* ArıtmaCAD — Google Earth için 3B KMZ.
   KMZOUT çıktısına tesisin gerçek 3B modelini ekler: model COLLADA (.dae) olarak KMZ'nin içine gömülür ve
   sahanın gerçek koordinatına (koordinat sistemi + datum) oturtulur. Yanında:
   - deniz hattı (DENIZ_HATTI katmanındaki eksen) yüzeyde çizgi olarak,
   - çevre binalar (C.doc.set.cevre.binalar) yerde düz taban izi olarak (kullanıcı 3B kutu istemedi),
   - bina adları (C.doc.set.sunum.binalar) etiket olarak yazılır.
   Renkler Render kipindeki malzeme atamalarından (app/render-malzeme.js) alınır.
   Model varsayılan olarak KML yüzeyleri (üçgen çokgenler) ile yazılır: Google Earth'ün her sürümünde görünür.
   COLLADA (.dae) gömme seçeneği durur (K.yaz({ dae: true })) ama onu yalnız Google Earth Pro gösterir.
   Saf kısım (dae, parcalar, kml) test/kmz3b.test.js ile Node'da denenir. */
(function (C) {
  'use strict';
  const K = C.kmz3b = {};
  const xml = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const s3 = v => (Math.round(v * 1000) / 1000).toString(), s4 = v => (Math.round(v * 10000) / 10000).toString();

  /* ---------- COLLADA 1.4.1 yazıcı ----------
     parcalar: [{ pos: [x,y,z,…] (üçgen çorbası, metre, yukarı = +Z), nrm?: […], renk: [r,g,b,a] (0–1), ad? }]
     Aynı renkteki parçalar tek malzemede toplanır. Dönen: metin (.dae) */
  K.dae = function (parcalar) {
    const grup = {}; let sira = 0;
    for (const p of parcalar || []) {
      if (!p || !p.pos || p.pos.length < 9) continue; const r = p.renk || [0.7, 0.7, 0.7, 1], an = r.map(v => (+v).toFixed(3)).join(' ');
      const g = grup[an] = grup[an] || { id: 'm' + (sira++), renk: r, pos: [], nrm: [] }, n = p.pos.length - p.pos.length % 9;
      for (let i = 0; i < n; i += 9) {
        const a = [p.pos[i], p.pos[i + 1], p.pos[i + 2]], b = [p.pos[i + 3], p.pos[i + 4], p.pos[i + 5]], c = [p.pos[i + 6], p.pos[i + 7], p.pos[i + 8]];
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; let nx = u[1] * w[2] - u[2] * w[1], ny = u[2] * w[0] - u[0] * w[2], nz = u[0] * w[1] - u[1] * w[0]; const L = Math.hypot(nx, ny, nz);
        if (!(L > 1e-12)) continue; // yozlaşmış üçgen
        nx /= L; ny /= L; nz /= L;
        for (let k = 0; k < 9; k++) g.pos.push(p.pos[i + k]);
        for (let k = 0; k < 3; k++) { const j = i + k * 3, var_ = p.nrm && isFinite(p.nrm[j]) && Math.hypot(p.nrm[j], p.nrm[j + 1], p.nrm[j + 2]) > 0.5; if (var_) g.nrm.push(p.nrm[j], p.nrm[j + 1], p.nrm[j + 2]); else g.nrm.push(nx, ny, nz); }
      }
    }
    const gl = Object.values(grup).filter(g => g.pos.length); if (!gl.length) return null;
    const efekt = gl.map(g => { const r = g.renk, a = r[3] == null ? 1 : +r[3]; return `<effect id="${g.id}-fx"><profile_COMMON><technique sid="t"><lambert><diffuse><color>${s3(r[0])} ${s3(r[1])} ${s3(r[2])} 1</color></diffuse>${a < 0.999 ? `<transparent opaque="A_ONE"><color>1 1 1 1</color></transparent><transparency><float>${s3(a)}</float></transparency>` : ''}</lambert></technique><extra><technique profile="GOOGLEEARTH"><double_sided>1</double_sided></technique></extra></profile_COMMON></effect>`; }).join('\n');
    const malz = gl.map(g => `<material id="${g.id}"><instance_effect url="#${g.id}-fx"/></material>`).join('\n');
    const geo = gl.map(g => {
      const n = g.pos.length / 3, dizi = (ad, v, f) => `<source id="${g.id}-${ad}"><float_array id="${g.id}-${ad}-a" count="${v.length}">${v.map(f).join(' ')}</float_array><technique_common><accessor source="#${g.id}-${ad}-a" count="${v.length / 3}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>`;
      let p = ''; for (let i = 0; i < n; i++) p += (i ? ' ' : '') + i;
      return `<geometry id="${g.id}-g"><mesh>${dizi('p', g.pos, s3)}${dizi('n', g.nrm, s4)}<vertices id="${g.id}-v"><input semantic="POSITION" source="#${g.id}-p"/><input semantic="NORMAL" source="#${g.id}-n"/></vertices><triangles material="M" count="${n / 3}"><input semantic="VERTEX" source="#${g.id}-v" offset="0"/><p>${p}</p></triangles></mesh></geometry>`;
    }).join('\n');
    const dugum = gl.map(g => `<node id="${g.id}-n"><instance_geometry url="#${g.id}-g"><bind_material><technique_common><instance_material symbol="M" target="#${g.id}"/></technique_common></bind_material></instance_geometry></node>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">\n<asset><contributor><authoring_tool>AritmaCAD</authoring_tool></contributor><unit name="meter" meter="1"/><up_axis>Z_UP</up_axis></asset>\n<library_effects>\n${efekt}\n</library_effects>\n<library_materials>\n${malz}\n</library_materials>\n<library_geometries>\n${geo}\n</library_geometries>\n<library_visual_scenes><visual_scene id="sahne">\n${dugum}\n</visual_scene></library_visual_scenes>\n<scene><instance_visual_scene url="#sahne"/></scene>\n</COLLADA>\n`;
  };

  /* ---------- model parçaları ----------
     Çizimdeki 3B nesneleri, model merkezine göre doğu-kuzey-yukarı (metre) koordinatlarına çevirir.
     o.tris(e) → { pos, nrm } (varsayılan C.entTris) · o.renk(e) → [r,g,b,a] (varsayılan: render malzemesi, yoksa çizim rengi)
     Dönen: { parcalar, ll: [enlem, boylam] (model merkezi), ucgen, nesneler: [modele giren nesneler] } ya da null */
  K.parcalar = function (doc, o) {
    o = o || {}; const G = C.geo, RM = C.renderMalz, tris = o.tris || C.entTris, acik = k => !C.layer || C.layer(k).on;
    const renk = o.renk || (e => { const id = RM && RM.sec(doc, e); if (id) { const t = RM.tanim(id); return t.renk; } const oz = C.g3d && C.g3d.renk && C.g3d.renk(e); if (oz) return [oz[0], oz[1], oz[2], 1]; if (C.aciRgb && C.entColor) { const a = C.entColor(e), c = C.aciRgb(a === 7 ? 9 : a); return [c[0] / 255, c[1] / 255, c[2] / 255, 1]; } return [0.7, 0.7, 0.7, 1]; });
    const ag = []; let bb = [Infinity, Infinity, -Infinity, -Infinity];
    for (const e of doc.ents) { if (e.type === 'sheet' || !acik(e.layer)) continue; let t = null; try { t = tris(e); } catch (err) { } if (!t || !t.pos || t.pos.length < 9) continue; ag.push({ e, t }); for (let i = 0; i < t.pos.length; i += 3) { const x = t.pos[i], y = t.pos[i + 1]; if (x < bb[0]) bb[0] = x; if (y < bb[1]) bb[1] = y; if (x > bb[2]) bb[2] = x; if (y > bb[3]) bb[3] = y; } }
    if (!ag.length) return null;
    // google.js ile aynı yerleşim: merkez + plan eksenlerinin doğu / kuzey bileşenleri (dilim açıklık açısı ve datum dahil)
    const m = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2], ll = G.toLL(m), lx = G.toLL([m[0] + 10, m[1]]), ly = G.toLL([m[0], m[1] + 10]);
    const R = 6378137, cl = Math.cos(ll[0] * Math.PI / 180), enu = q => [(q[1] - ll[1]) * Math.PI / 180 * R * cl, (q[0] - ll[0]) * Math.PI / 180 * R];
    const ex = enu(lx).map(v => v / 10), ey = enu(ly).map(v => v / 10);
    const parcalar = []; let ucgen = 0;
    for (const { e, t } of ag) {
      const n = t.pos.length, pos = new Array(n), nrm = t.nrm && t.nrm.length === n ? new Array(n) : null;
      for (let i = 0; i < n; i += 3) { const dx = t.pos[i] - m[0], dy = t.pos[i + 1] - m[1]; pos[i] = ex[0] * dx + ey[0] * dy; pos[i + 1] = ex[1] * dx + ey[1] * dy; pos[i + 2] = t.pos[i + 2]; if (nrm) { const a = t.nrm[i], b = t.nrm[i + 1]; nrm[i] = ex[0] * a + ey[0] * b; nrm[i + 1] = ex[1] * a + ey[1] * b; nrm[i + 2] = t.nrm[i + 2]; } }
      parcalar.push({ pos, nrm, renk: renk(e) }); ucgen += n / 9;
    }
    return { parcalar, ll, ucgen: Math.round(ucgen), nesneler: ag.map(a => a.e) };
  };

  /* ---------- model → KML yüzeyleri ----------
     Google Earth'ün tarayıcı / telefon sürümü KMZ içindeki COLLADA modelini göstermez; bu yüzden model üçgen üçgen
     KML çokgeni olarak yazılır (her sürümde görünür). Renk + gölge tonu başına bir stil ve bir çoklu geometri.
     Kot: arazi üstü yükseklik = z − toprak (zemin altında kalan üçgenler yazılmaz). Dönen: { stil, govde, ucgen } */
  K.yuzeyler = function (model, toprak) {
    const R = 6378137, D = 180 / Math.PI, cl = Math.cos(model.ll[0] / D), isik = [0.42, -0.55], iL = Math.hypot(isik[0], isik[1]), grup = {}; let ucgen = 0;
    const h2 = v => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, '0');
    for (const p of model.parcalar) {
      const r = p.renk || [0.7, 0.7, 0.7, 1], a = r[3] == null ? 1 : +r[3], q = p.pos;
      for (let i = 0; i + 8 < q.length; i += 9) {
        if (Math.max(q[i + 2], q[i + 5], q[i + 8]) - toprak <= 0.01) continue; // zemin altı
        const ux = q[i + 3] - q[i], uy = q[i + 4] - q[i + 1], uz = q[i + 5] - q[i + 2], wx = q[i + 6] - q[i], wy = q[i + 7] - q[i + 1], wz = q[i + 8] - q[i + 2];
        let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const L = Math.hypot(nx, ny, nz); if (!(L > 1e-10)) continue; nx /= L; ny /= L; nz /= L;
        // Google Earth çokgenleri ışıksız çizer; yüzeyler ayırt edilsin diye yöne göre 4 kademe ton verilir (yatay yüzeyler en açık)
        const ton = Math.abs(nz) > 0.9 ? 3 : Math.min(2, Math.floor(Math.abs(nx * isik[0] + ny * isik[1]) / iL * 3)), k = 0.70 + 0.10 * ton;
        const renk = h2(a) + h2(r[2] * k) + h2(r[1] * k) + h2(r[0] * k), g = grup[renk] = grup[renk] || [];
        let s = ''; for (const j of [0, 3, 6, 0]) s += (s ? ' ' : '') + (model.ll[1] + q[i + j] / (R * cl) * D).toFixed(8) + ',' + (model.ll[0] + q[i + j + 1] / R * D).toFixed(8) + ',' + (Math.max(0, q[i + j + 2] - toprak) + 0.05).toFixed(2);
        g.push('<Polygon><altitudeMode>relativeToGround</altitudeMode><outerBoundaryIs><LinearRing><coordinates>' + s + '</coordinates></LinearRing></outerBoundaryIs></Polygon>'); ucgen++;
      }
    }
    const adlar = Object.keys(grup);
    return { ucgen, stil: adlar.map(c => '<Style id="k3y' + c + '"><LineStyle><width>0</width><color>00000000</color></LineStyle><PolyStyle><color>' + c + '</color><fill>1</fill><outline>0</outline></PolyStyle></Style>').join('\n'), govde: adlar.map(c => '<Placemark><styleUrl>#k3y' + c + '</styleUrl><MultiGeometry>' + grup[c].join('') + '</MultiGeometry></Placemark>').join('\n') };
  };

  /* ---------- KML ekleri: model yerleşimi, deniz hattı, çevre binalar, bina adları ----------
     model: K.parcalar sonucu (ya da null) · o.dae: model COLLADA dosyası olarak bağlanır (yalnız Google Earth Pro); yoksa KML yüzeyleri
     o.cevre3b: çevre binalar yükseltilmiş kutu olur (varsayılan: yerde düz taban izi) · Dönen: <Document> içine eklenecek metin */
  K.kml = function (doc, model, o) {
    o = o || {};
    const G = C.geo, set = doc.set || {}, out = [], ll6 = p => { const q = G.toLL(p); return q[1].toFixed(8) + ',' + q[0].toFixed(8); };
    out.push('<Style id="k3hat"><LineStyle><color>ffff9a1e</color><width>5</width></LineStyle></Style>');
    out.push('<Style id="k3bina"><LineStyle><color>b3805433</color><width>1.2</width></LineStyle><PolyStyle><color>4dd9b38c</color></PolyStyle></Style>');
    out.push('<Style id="k3ad"><IconStyle><scale>0</scale></IconStyle><LabelStyle><scale>0.9</scale></LabelStyle></Style>');
    const toprak0 = set.seviye && isFinite(+set.seviye.toprak) ? +set.seviye.toprak : 0;
    if (model && !o.dae) { const y = K.yuzeyler(model, toprak0); out.push(y.stil); out.push(`<Folder><name>${xml(set.name || 'Tesis')} — 3B model</name><description>${y.ucgen} yüzey</description>\n${y.govde}\n</Folder>`); }
    else if (model) {
      // model kot 0 = proje ±0,00; projede toprak kotu tanımlıysa arazi o kota oturur
      const toprak = set.seviye && isFinite(+set.seviye.toprak) ? +set.seviye.toprak : 0;
      out.push(`<Placemark><name>${xml(set.name || 'Tesis')} — 3B model</name><description>${model.ucgen} üçgen · yalnız Google Earth Pro'da görünür</description><Model><altitudeMode>relativeToGround</altitudeMode><Location><longitude>${model.ll[1].toFixed(8)}</longitude><latitude>${model.ll[0].toFixed(8)}</latitude><altitude>${(-toprak).toFixed(2)}</altitude></Location><Orientation><heading>0</heading><tilt>0</tilt><roll>0</roll></Orientation><Scale><x>1</x><y>1</y><z>1</z></Scale><Link><href>models/tesis.dae</href></Link></Model></Placemark>`);
    }
    const sn = set.sunum && set.sunum.binalar;
    if (sn && sn.length) out.push('<Folder><name>Yapı adları</name>\n' + sn.filter(b => b && b.p && b.satirlar && b.satirlar.length).map(b => `<Placemark><name>${xml(b.satirlar[0])}</name>${b.satirlar.length > 1 ? `<description>${xml(b.satirlar.slice(1).join('\n'))}</description>` : ''}<styleUrl>#k3ad</styleUrl><Point><altitudeMode>relativeToGround</altitudeMode><coordinates>${ll6(b.p)},${(+b.z || 0).toFixed(1)}</coordinates></Point></Placemark>`).join('\n') + '\n</Folder>');
    const H = C.saha3b && C.saha3b.hatlar ? C.saha3b.hatlar(doc) : null;
    if (H && H.gruplar && H.gruplar.length) {
      const ad = g => g.ana ? (() => { const say = {}; for (const b of g.borular) say[b.dn] = (say[b.dn] || 0) + 1; return Object.keys(say).sort((a, b) => b - a).map(dn => say[dn] + '×DN' + dn).join(' + '); })() : g.borular.map(b => b.ad).join(' + ');
      const boy = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
      out.push('<Folder><name>Deniz hattı</name>\n' + H.gruplar.map(g => `<Placemark><name>${xml((g.ana && H.set.ad ? H.set.ad + ' — ' : '') + ad(g))}</name><description>${xml('Uzunluk ' + Math.round(boy(g.eksen)) + ' m · boru toprak altındadır, çizgi güzergâhı gösterir')}</description><styleUrl>#k3hat</styleUrl><LineString><tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode><coordinates>${g.eksen.map(p => ll6(p) + ',0').join(' ')}</coordinates></LineString></Placemark>`).join('\n') + '\n</Folder>');
    }
    const cv = set.cevre && set.cevre.binalar;
    if (cv && cv.length) out.push('<Folder><name>Çevre binalar</name>' + (set.cevre.kaynak ? `<description>${xml(set.cevre.kaynak)}</description>` : '') + '\n' + cv.filter(b => b && b.p && b.p.length > 2).map(b => { const h = (+b.h || 7).toFixed(1); return `<Placemark><styleUrl>#k3bina</styleUrl><Polygon>${o.cevre3b ? '<extrude>1</extrude><altitudeMode>relativeToGround</altitudeMode>' : '<tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode>'}<outerBoundaryIs><LinearRing><coordinates>${[...b.p, b.p[0]].map(p => ll6(p) + ',' + (o.cevre3b ? h : '0')).join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`; }).join('\n') + '\n</Folder>');
    return out.join('\n');
  };

  /* ---------- KMZ ---------- Dönen: { veri: Uint8Array, ucgen, model: true/false } */
  K.yaz = function (opts) {
    opts = opts || {}; const doc = C.doc, model = K.parcalar(doc, opts), dae = model && opts.dae ? K.dae(model.parcalar) : null, mod = model && (dae || !opts.dae) ? model : null;
    const girdi = mod ? new Set(mod.nesneler) : null, hat = e => /^DENIZ_HATTI/i.test(e.layer || '');
    // 3B modele giren nesneler ve deniz hattı ekseni ayrıca düz çizgi olarak yazılmaz
    const kml = C.kmlWrite(Object.assign({}, opts, { ents: doc.ents.filter(e => !(girdi && girdi.has(e)) && !hat(e)), ek: K.kml(doc, mod, opts) }));
    const dosyalar = [{ name: 'doc.kml', data: kml }]; if (dae) dosyalar.push({ name: 'models/tesis.dae', data: dae });
    return { veri: C.zip(dosyalar), ucgen: mod ? mod.ucgen : 0, model: !!mod };
  };
})(typeof window !== 'undefined' ? window.C : globalThis.C);

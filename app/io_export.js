/* ArıtmaCAD — IFC4 (Revit/BIM), STL, OBJ, KML/KMZ, ZIP ve pafta SVG çıktıları */
(function (C) {
  'use strict';
  const M = C.M, RAD = Math.PI / 180;

  /* ================= ZIP (yalnız saklama) + CRC32 ================= */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  C.crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  C.zip = function (files) { // [{name, data:Uint8Array|string}]
    const te = new TextEncoder(), parts = [], cent = []; let off = 0;
    for (const f of files) {
      const data = typeof f.data === 'string' ? te.encode(f.data) : f.data, name = te.encode(f.name), crc = C.crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, 0, true); h.setUint16(12, 0x21, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, 0x21, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      cent.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + data.length;
    }
    const csize = cent.reduce((a, b) => a + b.length, 0);
    const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    const all = [...parts, ...cent, new Uint8Array(e.buffer)], out = new Uint8Array(all.reduce((a, b) => a + b.length, 0)); let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
    return out;
  };
  C.unzip = async function (buf) { // -> [{name, data}]
    const b = new Uint8Array(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength), out = [];
    let eocd = -1; for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('ZIP okunamadı');
    let p = dv.getUint32(eocd + 16, true); const n = dv.getUint16(eocd + 10, true);
    for (let k = 0; k < n; k++) {
      const meth = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(b.slice(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
      const lnl = dv.getUint16(lo + 26, true), lxl = dv.getUint16(lo + 28, true), start = lo + 30 + lnl + lxl;
      let data = b.slice(start, start + csz);
      if (meth === 8) { const ds = new DecompressionStream('deflate-raw'); const r = new Response(new Blob([data]).stream().pipeThrough(ds)); data = new Uint8Array(await r.arrayBuffer()); }
      else if (meth !== 0) continue;
      out.push({ name, data });
    }
    return out;
  };

  /* ================= IFC4 ================= */
  const B64 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
  C.ifcGuid = () => {
    const by = new Uint8Array(16); (globalThis.crypto || require('crypto').webcrypto).getRandomValues(by);
    let bits = ''; for (const x of by) bits += x.toString(2).padStart(8, '0');
    let out = B64[parseInt(bits.slice(0, 2), 2)];
    for (let i = 2; i < 128; i += 6) out += B64[parseInt(bits.slice(i, i + 6), 2)];
    return out;
  };
  const ifcStr = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/[^\x20-\x7e]/g, ch => '\\X2\\' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') + '\\X0\\') + "'";
  const ifcNum = v => { if (!isFinite(v)) v = 0; let s = (+v).toFixed(6).replace(/0+$/, ''); if (s.endsWith('.')) s += ''; if (!s.includes('.')) s += '.'; return s === '-0.' ? '0.' : s; };
  const EPSG = g => { if (g.mode === 'utm') return (g.south ? 32700 : 32600) + g.zone; if (g.mode === 'tm3') { const m = { 27: 5253, 30: 5254, 33: 5255, 36: 5256, 39: 5257, 42: 5258, 45: 5259 }; return m[g.cm] || null; } return null; };

  C.ifcWrite = function (opts = {}) {
    const lines = []; let id = 0;
    const L = (s) => { id++; lines.push(`#${id}=${s};`); return '#' + id; };
    const now = new Date().toISOString().slice(0, 19);
    const name = opts.name || C.doc.set.name || 'AritmaCAD';
    const person = L(`IFCPERSON($,$,${ifcStr(C.userName || '')},$,$,$,$,$)`), org = L(`IFCORGANIZATION($,'AritmaCAD',$,$,$)`);
    const po = L(`IFCPERSONANDORGANIZATION(${person},${org},$)`), app = L(`IFCAPPLICATION(${org},'1.0','AritmaCAD','AritmaCAD')`);
    const oh = L(`IFCOWNERHISTORY(${po},${app},$,.ADDED.,$,$,$,${Math.floor(Date.now() / 1000)})`);
    const u = [L(`IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)`), L(`IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)`), L(`IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)`), L(`IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)`)];
    const units = L(`IFCUNITASSIGNMENT((${u.join(',')}))`);
    const P0 = L(`IFCCARTESIANPOINT((0.,0.,0.))`), DZ = L(`IFCDIRECTION((0.,0.,1.))`), DX = L(`IFCDIRECTION((1.,0.,0.))`);
    const A0 = L(`IFCAXIS2PLACEMENT3D(${P0},${DZ},${DX})`);
    const ctx = L(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,${A0},$)`);
    const body = L(`IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,${ctx},$,.MODEL_VIEW.,$)`);
    const proj = L(`IFCPROJECT('${C.ifcGuid()}',${oh},${ifcStr(name)},$,$,$,$,(${ctx}),${units})`);
    // konum / georef
    const ents = (opts.ents || C.doc.ents).filter(e => C.layer(e.layer).on);
    const bb = C.extents(ents) || [0, 0, 0, 0];
    let off = [0, 0];
    if (Math.max(Math.abs(bb[0]), Math.abs(bb[2]), Math.abs(bb[1]), Math.abs(bb[3])) > 5000) off = [Math.round((bb[0] + bb[2]) / 2), Math.round((bb[1] + bb[3]) / 2)];
    let site;
    const plSite = L(`IFCLOCALPLACEMENT($,${A0})`);
    if (C.geo.isSet()) {
      const ll = C.geo.toLL([off[0] || (bb[0] + bb[2]) / 2, off[1] || (bb[1] + bb[3]) / 2]);
      const cpa = v => { const s = v < 0 ? -1 : 1; v = Math.abs(v); const d = Math.floor(v), m = Math.floor((v - d) * 60), sc = Math.floor(((v - d) * 60 - m) * 60), ms = Math.floor(((((v - d) * 60 - m) * 60) - sc) * 1e6); return `(${s * d},${s * m},${s * sc},${s * ms})`; };
      site = L(`IFCSITE('${C.ifcGuid()}',${oh},'Saha',$,$,${plSite},$,$,.ELEMENT.,${cpa(ll[0])},${cpa(ll[1])},0.,$,$)`);
      const ep = EPSG(C.doc.set.geo);
      if (ep) { const crs = L(`IFCPROJECTEDCRS('EPSG:${ep}',$,$,$,$,$,$)`); L(`IFCMAPCONVERSION(${ctx},${crs},${ifcNum(off[0])},${ifcNum(off[1])},0.,1.,0.,1.)`); }
    } else site = L(`IFCSITE('${C.ifcGuid()}',${oh},'Saha',$,$,${plSite},$,$,.ELEMENT.,$,$,$,$,$)`);
    const plB = L(`IFCLOCALPLACEMENT(${plSite},${A0})`);
    const bld = L(`IFCBUILDING('${C.ifcGuid()}',${oh},${ifcStr(name)},$,$,${plB},$,$,.ELEMENT.,$,$,$)`);
    const plS = L(`IFCLOCALPLACEMENT(${plB},${A0})`);
    const sto = L(`IFCBUILDINGSTOREY('${C.ifcGuid()}',${oh},'Kot 0',$,$,${plS},$,$,.ELEMENT.,0.)`);
    L(`IFCRELAGGREGATES('${C.ifcGuid()}',${oh},$,$,${proj},(${site}))`);
    L(`IFCRELAGGREGATES('${C.ifcGuid()}',${oh},$,$,${site},(${bld}))`);
    L(`IFCRELAGGREGATES('${C.ifcGuid()}',${oh},$,$,${bld},(${sto}))`);
    // stiller
    const styles = {};
    const styleFor = aci => { if (styles[aci]) return styles[aci]; const c = C.aciRgb(aci === 7 ? 9 : aci); const col = L(`IFCCOLOURRGB($,${ifcNum(c[0] / 255)},${ifcNum(c[1] / 255)},${ifcNum(c[2] / 255)})`); const r = L(`IFCSURFACESTYLERENDERING(${col},0.,$,$,$,$,$,$,.NOTDEFINED.)`); return (styles[aci] = L(`IFCSURFACESTYLE($,.BOTH.,(${r}))`)); };
    const pt3 = p => L(`IFCCARTESIANPOINT((${ifcNum(p[0] - off[0])},${ifcNum(p[1] - off[1])},${ifcNum(p[2] || 0)}))`);
    const dir = v => L(`IFCDIRECTION((${ifcNum(v[0])},${ifcNum(v[1])},${ifcNum(v[2])}))`);
    const solid = (d, aci) => {
      let it;
      if (d.t === 'ext') {
        let prof;
        if (Array.isArray(d.prof)) { let pts = d.prof.slice(); if (M.polyArea(pts) < 0) pts.reverse(); const ps = pts.map(p => L(`IFCCARTESIANPOINT((${ifcNum(p[0])},${ifcNum(p[1])}))`)); const pl = L(`IFCPOLYLINE((${ps.join(',')},${ps[0]}))`); prof = L(`IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,${pl})`); }
        else { const p2 = L(`IFCAXIS2PLACEMENT2D(${L('IFCCARTESIANPOINT((0.,0.))')},$)`); prof = d.prof.ri ? L(`IFCCIRCLEHOLLOWPROFILEDEF(.AREA.,$,${p2},${ifcNum(d.prof.r)},${ifcNum(d.prof.r - d.prof.ri)})`) : L(`IFCCIRCLEPROFILEDEF(.AREA.,$,${p2},${ifcNum(d.prof.r)})`); }
        const pos = L(`IFCAXIS2PLACEMENT3D(${pt3(d.o)},${dir(d.uz)},${dir(d.ux)})`);
        it = L(`IFCEXTRUDEDAREASOLID(${prof},${pos},${DZ},${ifcNum(d.h)})`);
        L(`IFCSTYLEDITEM(${it},(${styleFor(aci)}),$)`);
        return { it, kind: 'SweptSolid' };
      }
      const tri = C.meshTris(d); const n = tri.pos.length / 3; if (!n) return null;
      const co = []; for (let i = 0; i < n; i++) co.push(`(${ifcNum(tri.pos[i * 3] - off[0])},${ifcNum(tri.pos[i * 3 + 1] - off[1])},${ifcNum(tri.pos[i * 3 + 2])})`);
      const fs = []; for (let i = 0; i < n; i += 3) fs.push(`(${i + 1},${i + 2},${i + 3})`);
      const pl = L(`IFCCARTESIANPOINTLIST3D((${co.join(',')}),$)`);
      it = L(`IFCTRIANGULATEDFACESET(${pl},$,$,(${fs.join(',')}),$)`);
      L(`IFCSTYLEDITEM(${it},(${styleFor(aci)}),$)`);
      return { it, kind: 'Tessellation' };
    };
    const shapeOf = (descs, aci) => {
      const items = descs.map(d => solid(d, aci)).filter(Boolean); if (!items.length) return null;
      const sw = items.filter(i => i.kind === 'SweptSolid'), te = items.filter(i => i.kind === 'Tessellation');
      const reps = [];
      if (sw.length) reps.push(L(`IFCSHAPEREPRESENTATION(${body},'Body','SweptSolid',(${sw.map(i => i.it).join(',')}))`));
      if (te.length) reps.push(L(`IFCSHAPEREPRESENTATION(${body},'Body','Tessellation',(${te.map(i => i.it).join(',')}))`));
      return L(`IFCPRODUCTDEFINITIONSHAPE($,$,(${reps.join(',')}))`);
    };
    const elems = [];
    const props = (el, kv) => {
      const ps = Object.entries(kv).filter(([, v]) => v != null && v !== '').map(([k, v]) => L(`IFCPROPERTYSINGLEVALUE(${ifcStr(k)},$,${typeof v === 'number' ? `IFCREAL(${ifcNum(v)})` : `IFCLABEL(${ifcStr(v)})`},$)`));
      if (!ps.length) return; const pset = L(`IFCPROPERTYSET('${C.ifcGuid()}',${oh},'AritmaCAD',$,(${ps.join(',')}))`);
      L(`IFCRELDEFINESBYPROPERTIES('${C.ifcGuid()}',${oh},$,$,(${el}),${pset})`);
    };
    const mk = (cls, nm, descs, aci, tail, kv) => {
      const shp = shapeOf(descs, aci); if (!shp) return;
      const pl = L(`IFCLOCALPLACEMENT(${plS},${A0})`);
      const el = L(`${cls}('${C.ifcGuid()}',${oh},${ifcStr(nm)},$,$,${pl},${shp},$${tail ? ',' + tail : ''})`);
      elems.push(el); if (kv) props(el, kv);
    };
    const stats = {};
    for (const e of ents) {
      const ms = C.meshes(e); if (!ms || !ms.length) continue;
      const aci = C.entColor(e), lbl = e.label || e.tag || C.T[e.type].label;
      stats[e.type] = (stats[e.type] || 0) + 1;
      switch (e.type) {
        case 'wall': mk('IFCWALL', 'Duvar', ms, aci, '.STANDARD.', { Kalinlik: e.t, Yukseklik: e.h, TabanKotu: e.z || 0 }); break;
        case 'slab': mk('IFCSLAB', 'Döşeme', ms, aci, '.FLOOR.', { Kalinlik: e.t }); break;
        case 'tank': ms.forEach((m, i) => i === ms.length - 1 ? mk('IFCSLAB', `${lbl} - Taban`, [m], aci, '.BASESLAB.', { Hacim_m3: +(e.L * e.W * e.H).toFixed(2) }) : mk('IFCWALL', `${lbl} - Duvar ${i + 1}`, [m], aci, '.STANDARD.', { Kalinlik: e.tw })); break;
        case 'ctank': mk('IFCWALL', `${lbl} - Duvar`, [ms[0]], aci, '.STANDARD.', { IcCap: e.D, Derinlik: e.H }); mk('IFCSLAB', `${lbl} - Taban`, [ms[1]], aci, '.BASESLAB.'); break;
        case 'pipe': mk('IFCPIPESEGMENT', e.label || `Boru DN${e.dn}`, ms, aci, '.RIGIDSEGMENT.', { DN: e.dn, Malzeme: e.mat || '' }); break;
        case 'pump': mk('IFCPUMP', e.tag || 'Pompa', ms, aci, e.kind === 'kuru' ? '.ENDSUCTION.' : '.SUBMERSIBLEPUMP.', { Debi_ls: e.q, Basma_m: e.hm, Tip: e.kind }); break;
        case 'valve': mk('IFCVALVE', `${C.T.valve.info(e)}`, ms, aci, e.kind === 'cekvalf' ? '.CHECK.' : e.kind === 'kelebek' ? '.ISOLATING.' : '.ISOLATING.', { DN: e.dn, Tip: e.kind }); break;
        case 'fit': mk('IFCPIPEFITTING', C.fitName(e) + ' DN' + e.dn, ms, aci, e.kind === 'te' ? '.JUNCTION.' : '.CONNECTOR.', { DN: e.dn, DN2: e.dn2, Malzeme: e.mat }); break;
        case 'blk': mk(/vana|valf|tutucu/i.test(e.tur || '') ? 'IFCVALVE' : /debimetre/i.test(e.tur || '') ? 'IFCFLOWMETER' : 'IFCBUILDINGELEMENTPROXY', `${e.tur || 'Blok'}${e.dn ? ' DN' + e.dn : ''}`, ms, aci, /vana|valf|tutucu/i.test(e.tur || '') ? (/[cç]ek/i.test(e.tur) ? '.CHECK.' : '.ISOLATING.') : '.NOTDEFINED.', { Cins: e.tur, DN: e.dn }); break;
        default: mk('IFCBUILDINGELEMENTPROXY', lbl, ms, aci, '.NOTDEFINED.');
      }
    }
    if (elems.length) L(`IFCRELCONTAINEDINSPATIALSTRUCTURE('${C.ifcGuid()}',${oh},$,$,(${elems.join(',')}),${sto})`);
    const head = `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ViewDefinition [ReferenceView_V1.2]'),'2;1');\nFILE_NAME(${ifcStr(name + '.ifc')},'${now}',(${ifcStr(C.userName || '')}),(''),'AritmaCAD','AritmaCAD 1.0','');\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n`;
    return { text: head + lines.join('\n') + '\nENDSEC;\nEND-ISO-10303-21;\n', count: elems.length, stats, offset: off };
  };

  /* ================= STL / OBJ ================= */
  const allTris = (ents) => { const res = []; for (const e of ents || C.doc.ents) { if (!C.layer(e.layer).on) continue; const t = C.entTris(e); if (t && t.pos.length) res.push({ e, t }); } return res; };
  C.stlWrite = function (opts = {}) {
    const k = opts.k || 1; // metre -> çıktı birimi
    const parts = allTris(opts.ents); const n = parts.reduce((a, p) => a + p.t.pos.length / 9, 0);
    const buf = new ArrayBuffer(84 + n * 50), dv = new DataView(buf);
    const hdr = 'AritmaCAD STL ' + (opts.note || ''); for (let i = 0; i < 80; i++) dv.setUint8(i, i < hdr.length ? hdr.charCodeAt(i) & 127 : 32);
    dv.setUint32(80, n, true); let o = 84;
    for (const { t } of parts) for (let i = 0; i < t.pos.length; i += 9) {
      const a = [t.pos[i], t.pos[i + 1], t.pos[i + 2]], b = [t.pos[i + 3], t.pos[i + 4], t.pos[i + 5]], c = [t.pos[i + 6], t.pos[i + 7], t.pos[i + 8]];
      const nn = M.norm(M.cross(M.sub(b, a), M.sub(c, a)));
      [...nn, ...a.map(v => v * k), ...b.map(v => v * k), ...c.map(v => v * k)].forEach(v => { dv.setFloat32(o, v, true); o += 4; });
      dv.setUint16(o, 0, true); o += 2;
    }
    return { data: new Uint8Array(buf), tris: n };
  };
  C.objWrite = function (opts = {}) {
    const k = opts.k || 1, parts = allTris(opts.ents), out = ['# AritmaCAD OBJ (Y yukarı, metre)', ''];
    let vi = 1, nv = 0;
    for (const { e, t } of parts) {
      const col = C.aciRgb(C.entColor(e) === 7 ? 9 : C.entColor(e)).map(c => (c / 255).toFixed(3)).join(' ');
      out.push(`o ${C.ascii((e.label || e.tag || C.T[e.type].label) + '_' + e.id).replace(/\s+/g, '_')}`);
      const n = t.pos.length / 3;
      for (let i = 0; i < n; i++) out.push(`v ${(t.pos[i * 3] * k).toFixed(4)} ${(t.pos[i * 3 + 2] * k).toFixed(4)} ${(-t.pos[i * 3 + 1] * k).toFixed(4)} ${col}`);
      for (let i = 0; i < n; i++) out.push(`vn ${t.nrm[i * 3].toFixed(4)} ${t.nrm[i * 3 + 2].toFixed(4)} ${(-t.nrm[i * 3 + 1]).toFixed(4)}`);
      for (let i = 0; i < n; i += 3) out.push(`f ${vi + i}//${vi + i} ${vi + i + 1}//${vi + i + 1} ${vi + i + 2}//${vi + i + 2}`);
      vi += n; nv += n;
    }
    return { text: out.join('\n') + '\n', verts: nv };
  };

  /* ================= KML / KMZ ================= */
  const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const kcol = (aci, a) => { const c = C.aciRgb(aci === 7 ? 7 : aci); const h = v => v.toString(16).padStart(2, '0'); return h(a) + h(c[2]) + h(c[1]) + h(c[0]); };
  C.kmlWrite = function (opts = {}) {
    if (!C.geo.isSet()) throw new Error('Önce koordinat sistemi tanımlayın (KOORDINAT komutu ya da Harita sekmesi).');
    const ents = (opts.ents || C.doc.ents).filter(e => C.layer(e.layer).on && e.type !== 'sheet' && (opts.dims || e.type !== 'dim'));
    const ll = p => { const q = C.geo.toLL(p); return `${q[1].toFixed(8)},${q[0].toFixed(8)},${(p[2] || 0).toFixed(2)}`; };
    const llg = p => { const q = C.geo.toLL(p); return `${q[1].toFixed(8)},${q[0].toFixed(8)},0`; };
    const byLayer = {};
    const styles = new Set();
    const sty = (aci, lw, fill) => { const id = `s${aci}_${lw}_${fill ? 1 : 0}`; styles.add(JSON.stringify({ id, aci, lw, fill })); return id; };
    for (const e of ents) {
      const lay = e.layer; const arr = byLayer[lay] = byLayer[lay] || [];
      const aci = C.entColor(e), lw = C.entLw(e), wpx = Math.max(1.5, lw / 100 * 4).toFixed(1);
      const name = xml(e.label || e.tag || (e.type === 'text' ? e.s : C.T[e.type].label));
      const desc = xml(C.describe(e));
      if (e.type === 'text' || e.type === 'kot') { const p = e.type === 'text' ? e.p : e.p; arr.push(`<Placemark><name>${xml(e.type === 'text' ? e.s.split('\n')[0] : C.fmtKot(e.v) + ' ' + (e.txt || ''))}</name><styleUrl>#lbl</styleUrl><Point><coordinates>${llg(p)}</coordinates></Point></Placemark>`); continue; }
      if (e.type === 'pump' || e.type === 'valve') { arr.push(`<Placemark><name>${name}</name><description>${desc}</description><styleUrl>#${e.type === 'pump' ? 'pmp' : 'vlv'}</styleUrl><Point><coordinates>${llg(e.p)}</coordinates></Point></Placemark>`); }
      const solidTypes = { tank: 1, ctank: 1, slab: 1, box: 1, wall: 1, cyl: 1 };
      if (solidTypes[e.type]) {
        let ring, top = 0;
        if (e.type === 'tank') { const f = C.frame(e.o, e.rot), tw = e.tw; ring = [f.at(-tw, -tw), f.at(e.L + tw, -tw), f.at(e.L + tw, e.W + tw), f.at(-tw, e.W + tw)]; top = e.zt; }
        else if (e.type === 'ctank' || e.type === 'cyl') { const r = e.type === 'ctank' ? e.D / 2 + e.tw : e.r, c = e.c; ring = []; for (let i = 0; i < 48; i++) ring.push(M.polar(c, i / 48 * Math.PI * 2, r)); top = e.type === 'ctank' ? e.zt : (c[2] || 0) + e.h; }
        else if (e.type === 'wall') { ring = C.T.wall.outline(e); top = (e.z || 0) + e.h; }
        else if (e.type === 'slab') { ring = e.pts; top = (e.z || 0) + e.t; }
        else if (e.type === 'box') { const f = C.frame(e.o, e.rot); ring = [f.at(0, 0), f.at(e.sx, 0), f.at(e.sx, e.sy), f.at(0, e.sy)]; top = (e.o[2] || 0) + e.sz; }
        const coords = [...ring, ring[0]].map(p => { const q = C.geo.toLL(p); return `${q[1].toFixed(8)},${q[0].toFixed(8)},${Math.max(0, top).toFixed(2)}`; }).join(' ');
        const up = top > 0.4;
        arr.push(`<Placemark><name>${name}</name><description>${desc}</description><styleUrl>#${sty(aci, lw, true)}</styleUrl><Polygon>${up ? '<extrude>1</extrude><altitudeMode>relativeToGround</altitudeMode>' : '<altitudeMode>clampToGround</altitudeMode>'}<outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`);
        if (e.type !== 'tank' && e.type !== 'ctank') continue;
      }
      if (e.type === 'pipe') { arr.push(`<Placemark><name>${name}</name><description>${desc}</description><styleUrl>#${sty(aci, Math.max(lw, Math.round(e.dn / 4)), false)}</styleUrl><LineString><tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode><coordinates>${e.pts.map(llg).join(' ')}</coordinates></LineString></Placemark>`); continue; }
      if (e.type === 'pump' || e.type === 'valve' || solidTypes[e.type]) continue;
      // genel çizgisel
      const segsets = [];
      for (const pr of C.prims(e)) {
        if (pr.k === 'T' || pr.k === 'X') continue;
        if (pr.k === 'L') segsets.push([pr.a, pr.b]);
        else if (pr.k === 'P' || pr.k === 'S') segsets.push(pr.c || pr.k === 'S' ? [...pr.pts, pr.pts[0]] : pr.pts);
        else if (pr.k === 'C' || pr.k === 'A') { const s = C.primSegs ? C.primSegs(pr) : []; if (s.length) segsets.push([s[0][0], ...s.map(q => q[1])]); else { const n = 48, a0 = pr.k === 'C' ? 0 : pr.a0, sw = pr.k === 'C' ? Math.PI * 2 : M.normAng(pr.a1 - pr.a0) || Math.PI * 2, pts = []; for (let i = 0; i <= n; i++) pts.push(M.polar(pr.c, a0 + sw * i / n, pr.r)); segsets.push(pts); } }
      }
      if (!segsets.length) continue;
      const geom = segsets.length === 1 ? `<LineString><tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode><coordinates>${segsets[0].map(llg).join(' ')}</coordinates></LineString>` : `<MultiGeometry>${segsets.map(s => `<LineString><tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode><coordinates>${s.map(llg).join(' ')}</coordinates></LineString>`).join('')}</MultiGeometry>`;
      arr.push(`<Placemark><name>${name}</name><styleUrl>#${sty(aci, lw, false)}</styleUrl>${geom}</Placemark>`);
    }
    const st = [...styles].map(s => JSON.parse(s)).map(s => `<Style id="${s.id}"><LineStyle><color>${kcol(s.aci, 255)}</color><width>${Math.max(1.5, s.lw / 100 * 4).toFixed(1)}</width></LineStyle><PolyStyle><color>${kcol(s.aci, s.fill ? 110 : 0)}</color><fill>${s.fill ? 1 : 0}</fill><outline>1</outline></PolyStyle></Style>`).join('\n');
    const fixed = `<Style id="lbl"><IconStyle><scale>0</scale></IconStyle><LabelStyle><scale>0.8</scale></LabelStyle></Style>
<Style id="pmp"><IconStyle><color>ff0000ff</color><scale>0.8</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon></IconStyle></Style>
<Style id="vlv"><IconStyle><color>ffff00ff</color><scale>0.6</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_square.png</href></Icon></IconStyle></Style>`;
    const folders = Object.entries(byLayer).map(([n, a]) => `<Folder><name>${xml(n)}</name>\n${a.join('\n')}\n</Folder>`).join('\n');
    const nm = xml(opts.name || C.doc.set.name);
    return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document><name>${nm}</name><description>ArıtmaCAD — ${xml(C.geo.describe())}</description>\n${fixed}\n${st}\n${opts.ek || ''}\n${folders}\n</Document>\n</kml>\n`;
  };
  C.kmzWrite = opts => C.zip([{ name: 'doc.kml', data: C.kmlWrite(opts) }]);

  /* KML içe aktarım (tarayıcı DOMParser) */
  C.kmlImport = function (text) {
    const dom = new DOMParser().parseFromString(text, 'application/xml');
    const out = [];
    const coords = s => s.trim().split(/\s+/).map(t => t.split(',').map(Number)).filter(a => a.length >= 2 && !isNaN(a[0]));
    const pms = [...dom.getElementsByTagName('Placemark')];
    if (!pms.length) return out;
    if (!C.geo.isSet()) { const first = coords((pms[0].getElementsByTagName('coordinates')[0] || {}).textContent || '')[0]; if (first) { C.doc.set.geo = Object.assign(C.doc.set.geo, { mode: 'local', lat0: first[1], lon0: first[0], rot: 0 }); C.log('Koordinat sistemi KMZ\'deki ilk noktaya göre yerel olarak ayarlandı.'); } }
    for (const pm of pms) {
      const name = (pm.getElementsByTagName('name')[0] || {}).textContent || '';
      let folder = pm.parentNode && pm.parentNode.getElementsByTagName ? ((pm.parentNode.getElementsByTagName('name')[0] || {}).textContent || 'KMZ') : 'KMZ';
      const layer = 'KMZ_' + C.ascii(folder).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 30);
      const xy = c => C.geo.toXY(c[1], c[0]);
      for (const ls of pm.getElementsByTagName('LineString')) { const pts = coords(ls.getElementsByTagName('coordinates')[0].textContent).map(xy); if (pts.length > 1) out.push({ type: 'pline', pts, closed: false, layer, name }); }
      for (const pg of pm.getElementsByTagName('Polygon')) { const ob = pg.getElementsByTagName('outerBoundaryIs')[0] || pg; const pts = coords(ob.getElementsByTagName('coordinates')[0].textContent).map(xy); if (pts.length > 2) { if (M.dist2(pts[0], pts[pts.length - 1]) < 1e-6) pts.pop(); out.push({ type: 'pline', pts, closed: true, layer, name }); } }
      for (const pt of pm.getElementsByTagName('Point')) { const c = coords(pt.getElementsByTagName('coordinates')[0].textContent)[0]; if (!c) continue; const p = xy(c); out.push({ type: 'point', p, layer }); if (name) out.push({ type: 'text', p: [p[0] + C.annoH(1.5), p[1] + C.annoH(1.5), 0], h: C.annoH(2.5), s: name, rot: 0, al: 'L', layer }); }
    }
    return out;
  };

  /* ================= PAFTA → SVG (yazdırma / PDF) ================= */
  C.sheetSvg = function (sh, opts = {}) {
    const { w, h } = C.T.sheet.size(sh), k = 1000 / sh.scale, o = sh.o;
    const X = p => ((p[0] - o[0]) * k).toFixed(3), Y = p => (h - (p[1] - o[1]) * k).toFixed(3);
    const area = [o[0], o[1], o[0] + w / k, o[1] + h / k];
    const mono = opts.mono !== false;
    const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">`, `<rect x="0" y="0" width="${w}" height="${h}" fill="#fff"/>`, `<defs><clipPath id="cp"><rect x="0" y="0" width="${w}" height="${h}"/></clipPath></defs><g clip-path="url(#cp)" fill="none" stroke-linecap="round" stroke-linejoin="round">`];
    for (const e of C.doc.ents) {
      if (!C.layer(e.layer).on) continue;
      const b = C.bbox(e); if (b[2] < area[0] || b[0] > area[2] || b[3] < area[1] || b[1] > area[3]) continue;
      if (e.type === 'sheet' && e !== sh) continue;
      for (const pr of C.prims(e)) {
        const aci = C.entColor(e, pr.color), col = mono ? '#000' : (aci === 7 ? '#000' : C.aciCss(aci));
        const lw = Math.max(0.09, C.entLw(e, pr.lw) / 100), lt = C.entLt(e, pr.lt);
        const pat = C.LT[lt] && C.LT[lt].p.length ? C.LT[lt].p.map(v => Math.max(Math.abs(v) * C.doc.set.ltscale * k, v === 0 ? 0.01 : 0.1).toFixed(3)).join(' ') : null;
        const st = `stroke="${col}" stroke-width="${lw}"${pat ? ` stroke-dasharray="${pat}"` : ''}`;
        switch (pr.k) {
          case 'L': out.push(`<line x1="${X(pr.a)}" y1="${Y(pr.a)}" x2="${X(pr.b)}" y2="${Y(pr.b)}" ${st}/>`); break;
          case 'P': out.push(`<${pr.c ? 'polygon' : 'polyline'} points="${pr.pts.map(p => X(p) + ',' + Y(p)).join(' ')}" ${st}/>`); break;
          case 'S': out.push(`<polygon points="${pr.pts.map(p => X(p) + ',' + Y(p)).join(' ')}" fill="${col}" stroke="none"/>`); break;
          case 'C': out.push(`<circle cx="${X(pr.c)}" cy="${Y(pr.c)}" r="${(pr.r * k).toFixed(3)}" ${st}/>`); break;
          case 'A': { const p0 = M.polar(pr.c, pr.a0, pr.r), p1 = M.polar(pr.c, pr.a1, pr.r), sw = M.normAng(pr.a1 - pr.a0); out.push(`<path d="M${X(p0)} ${Y(p0)} A${(pr.r * k).toFixed(3)} ${(pr.r * k).toFixed(3)} 0 ${sw > Math.PI ? 1 : 0} 0 ${X(p1)} ${Y(p1)}" ${st}/>`); break; }
          case 'X': out.push(`<circle cx="${X(pr.p)}" cy="${Y(pr.p)}" r="0.2" fill="${col}"/>`); break;
          case 'T': out.push(C.textSvg(pr, q => [+X(q), +Y(q)], k, col)); break;
        }
      }
    }
    out.push('</g></svg>');
    return { svg: out.join('\n'), w, h };
  };
})(typeof window !== 'undefined' ? window.C : globalThis.C);

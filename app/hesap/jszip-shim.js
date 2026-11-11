/* ArıtmaCAD — JSZip yerine çevrimdışı küçük ZIP yazıcı (yalnız file + generateAsync) */
(function () {
  if (window.JSZip) return;
  const T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const toBytes = async (d, o) => {
    if (d instanceof Uint8Array) return d;
    if (d instanceof ArrayBuffer) return new Uint8Array(d);
    if (d && typeof d.arrayBuffer === 'function') return new Uint8Array(await d.arrayBuffer());
    if (o && o.base64) { const s = atob(String(d).replace(/^data:[^,]*,/, '')); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
    return new TextEncoder().encode(String(d));
  };
  function JSZip() { this.files = []; }
  JSZip.prototype.file = function (name, data, opts) { this.files.push({ name, data, opts }); return this; };
  JSZip.prototype.folder = function (p) { const self = this; return { file: (n, d, o) => { self.file(p.replace(/\/?$/, '/') + n, d, o); return this; } }; };
  JSZip.prototype.generateAsync = async function (o) {
    const te = new TextEncoder(), parts = [], cent = []; let off = 0;
    for (const f of this.files) {
      const data = await toBytes(f.data, f.opts), name = te.encode(f.name), c32 = crc(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(12, 0x21, true);
      h.setUint32(14, c32, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true);
      c.setUint32(16, c32, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      cent.push(new Uint8Array(c.buffer), name); off += 30 + name.length + data.length;
    }
    const cs = cent.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, this.files.length, true); e.setUint16(10, this.files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
    const all = [...parts, ...cent, new Uint8Array(e.buffer)];
    if (o && o.type === 'uint8array') { const u = new Uint8Array(all.reduce((a, b) => a + b.length, 0)); let p = 0; for (const a of all) { u.set(a, p); p += a.length; } return u; }
    return new Blob(all, { type: (o && o.mimeType) || 'application/zip' });
  };
  window.JSZip = JSZip;
})();

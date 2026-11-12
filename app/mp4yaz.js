/* ArıtmaCAD — MP4 YAZICI (tek H.264 video izi, sabit kare hızı)
   Sunum videosu kare kare üretilir (app/saha3b.js): her kare tam hazır olunca çizilir, WebCodecs VideoEncoder ile kodlanır ve burada
   MP4 kabına yazılır. Böylece video, bilgisayarın o anki hızından bağımsız olarak akıcı olur (gerçek zamanlı ekran kaydındaki takılma olmaz).
   Kullanım:  const y = C.mp4yaz({ w, h, fps, avcC });  y.ekle(Uint8Array, anahtarKareMi) …  const parcalar = y.bitir();  new Blob(parcalar, { type: 'video/mp4' })
   Kap düzeni: ftyp · mdat (tüm kareler tek öbek) · moov. Saf fonksiyondur; test/mp4yaz.test.js ile Node'da denenir. */
(function (C) {
  'use strict';
  const u8 = (...a) => new Uint8Array(a);
  const u16 = v => u8((v >>> 8) & 255, v & 255);
  const u32 = v => u8((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
  const yazi = s => Uint8Array.from(s, c => c.charCodeAt(0));
  const sifir = n => new Uint8Array(n);
  const birlestir = parcalar => { let n = 0; for (const p of parcalar) n += p.length; const o = new Uint8Array(n); let k = 0; for (const p of parcalar) { o.set(p, k); k += p.length; } return o; };
  const kutu = (tip, ...icerik) => { const g = birlestir(icerik); return birlestir([u32(g.length + 8), yazi(tip), g]); };
  const tamKutu = (tip, surum, bayrak, ...icerik) => kutu(tip, u8(surum, (bayrak >>> 16) & 255, (bayrak >>> 8) & 255, bayrak & 255), ...icerik);
  const MATRIS = birlestir([u32(0x10000), u32(0), u32(0), u32(0), u32(0x10000), u32(0), u32(0), u32(0), u32(0x40000000)]);

  C.mp4yaz = function (o) {
    const w = o.w | 0, h = o.h | 0, fps = +o.fps || 30, olcek = 90000, adim = Math.round(olcek / fps);
    let avcC = o.avcC ? new Uint8Array(o.avcC) : null; const veri = [], boy = [], anahtar = []; let toplam = 0;
    const ftyp = kutu('ftyp', yazi('isom'), u32(0x200), yazi('isom'), yazi('iso2'), yazi('avc1'), yazi('mp41'));
    return {
      avcCVer(d) { avcC = new Uint8Array(d); },
      ekle(parca, anahtarMi) { const p = parca instanceof Uint8Array ? parca : new Uint8Array(parca); veri.push(p); boy.push(p.length); if (anahtarMi) anahtar.push(boy.length); toplam += p.length; },
      get kare() { return boy.length; }, get bayt() { return toplam; },
      /* Blob'a verilecek parça dizisini döndürür (kare verisi kopyalanmaz) */
      bitir() {
        if (!avcC) throw new Error('avcC (kod çözücü yapılandırması) yok'); if (!boy.length) throw new Error('kare yok');
        if (toplam + 8 > 0xffffffff) throw new Error('video 4 GB sınırını aşıyor');
        const N = boy.length, sure = N * adim, mdatBas = ftyp.length + 8;
        const avc1 = kutu('avc1', sifir(6), u16(1), sifir(16), u16(w), u16(h), u32(0x00480000), u32(0x00480000), u32(0), u16(1), sifir(32), u16(0x0018), u16(0xffff), kutu('avcC', avcC));
        const stbl = kutu('stbl',
          tamKutu('stsd', 0, 0, u32(1), avc1),
          tamKutu('stts', 0, 0, u32(1), u32(N), u32(adim)),
          tamKutu('stss', 0, 0, u32(anahtar.length), ...anahtar.map(u32)),
          tamKutu('stsc', 0, 0, u32(1), u32(1), u32(N), u32(1)),
          tamKutu('stsz', 0, 0, u32(0), u32(N), ...boy.map(u32)),
          tamKutu('stco', 0, 0, u32(1), u32(mdatBas)));
        const minf = kutu('minf', tamKutu('vmhd', 0, 1, sifir(8)), kutu('dinf', tamKutu('dref', 0, 0, u32(1), tamKutu('url ', 0, 1))), stbl);
        const mdia = kutu('mdia', tamKutu('mdhd', 0, 0, u32(0), u32(0), u32(olcek), u32(sure), u16(0x55c4), u16(0)), tamKutu('hdlr', 0, 0, u32(0), yazi('vide'), sifir(12), yazi('VideoHandler'), u8(0)), minf);
        const trak = kutu('trak', tamKutu('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(sure), sifir(8), u16(0), u16(0), u16(0), u16(0), MATRIS, u32(w << 16), u32(h << 16)), mdia);
        const moov = kutu('moov', tamKutu('mvhd', 0, 0, u32(0), u32(0), u32(olcek), u32(sure), u32(0x10000), u16(0x100), sifir(10), MATRIS, sifir(24), u32(2)), trak);
        return [ftyp, birlestir([u32(toplam + 8), yazi('mdat')]), ...veri, moov];
      },
    };
  };
})(typeof window !== 'undefined' ? window.C : globalThis.C);

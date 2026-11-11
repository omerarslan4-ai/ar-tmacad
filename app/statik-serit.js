/* ArıtmaCAD — şeritte "Statik" sekmesi: statik / betonarme ile ilgili tüm komutlar tek yerde.
   (Diğer sekmelerdeki eski düğmeler de çalışmaya devam eder.) Komut yoksa düğmesi gösterilmez. */
(function (C) {
  'use strict';
  const B = (cmd, t, i, opts) => ({ cmd, t, i, big: true, opts }), s = (cmd, t, i, opts) => ({ cmd, t, i, opts });
  const kur = () => {
    const R = C.ribbon; if (!R || !Array.isArray(R.tabs)) return false;
    if (R.tabs.some(t => t[0] === 'Statik')) return true;
    const var_ = b => !!(C.cmds && C.cmds[b.cmd.split(' ')[0]]);
    const paneller = [
      ['Hesap', [B('STATIK', 'Statik hesap', 'found'), s('STATIKMODEL', 'Modelden gönder', 'sel'), s('NUMARALA', 'Eleman numarala', 'table'), s('ELEMANNOAYAR', 'Numara biçimi', 'prop'), s('ELEMANNOGOSTER', 'Numaraları göster', 'eye'), s('ELEMANETIKET', 'Etiket (disipline göre)', 'text')]],
      ['Yapı elemanı', [B('KOLON', 'Kolon', 'col'), B('KIRIS', 'Kiriş', 'beam'), s('PERDE', 'Perde', 'side'), s('IDOSEME', 'Döşeme', 'slab'), s('OTOKIRIS', 'Otomatik kiriş', 'beam'), s('TEMEL', 'Temel / radye', 'found')]],
      ['Donatı', [B('STATIKDONATI', '3B donatı', 'found'), s('STATIKDONATISIL', '3B donatıyı sil', 'erase'), s('DISIPLIN3B STATIK', '3B statik görünüm', 'iso')]],
      ['Pafta', [B('STATIKCIZ', 'Statik pafta', 'print'), s('KESITPAFTA', 'Kesit → disiplinler', 'cut'), s('PERSPEKTIFPAFTA', '3B görünüş', 'iso'), s('3BPAFTAACI', '3B açı', 'eye'), s('3BPAFTAGUNCELLE', '3B güncelle', 'undo')]],
      ['Görünürlük', [s('STATIKGOSTER', 'Planda göster / gizle', 'eye'), s('STATIKONAR', 'Görünmeyeni onar', 'calc')]],
    ].map(([ad, bs]) => [ad, bs.filter(var_)]).filter(p => p[1].length);
    const i = R.tabs.findIndex(t => t[0] === 'Hesap');
    R.tabs.splice(i >= 0 ? i + 1 : R.tabs.length, 0, ['Statik', paneller]);
    R.render(); return true;
  };
  // tüm modüller komutlarını ekledikten sonra kur
  let n = 0; const t = setInterval(() => { try { if (kur() || ++n > 40) clearInterval(t); } catch (er) { console.error('statik şerit', er); clearInterval(t); } }, 300);
})(window.C);

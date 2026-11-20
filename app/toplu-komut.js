/* ArıtmaCAD — TOPLU EKRAN YENİLEMESİ (pafta ve kesit üreten komutlar)
   Uzun üretimlerde her eklenen nesne ekranı ve 'change' dinleyicilerini yeniden çalıştırıyordu (40 bin nesnede çağrı başına ~9 ms;
   MIMARIPAFTA 108 sn → 12,6 sn). Kullanıcı kararı 20.11.2026: aynı hızlandırma statik paftalara ve kesit almaya da uygulansın.
   - Aşağıdaki komutlar core.js C.toplu ile sarılır: yenileme komut bitince bir kez.
   - Komut kullanıcıdan girdi beklerken (nokta, seçim, seçenek, sayı) toplu moda ara verilir (C.topluAra): önizleme ve ekran normal çalışır.
   Bu dosya index.html'de en sonda yüklenir (komutların hepsi kayıtlı olsun diye). MIMARIPAFTA kendi içinde sarılı (mimari-pafta.js). */
(function (C) {
  'use strict';
  if (!C || !C.toplu || !C.cmd || !C.cmds) return;
  /* kullanıcı girdisi beklenirken toplu moda ara */
  const E = C.cmd, a0 = E.ask;
  if (a0 && !E._topluAra) {
    E.ask = function () { const kuyruk = (E.queue && E.queue.length) || E.scriptMode, devam = !kuyruk && C.topluAra ? C.topluAra() : () => { }; /* girdi kuyruktan / betikten anında gelirse ara verilmez */ let p; try { p = a0.apply(this, arguments); } catch (er) { devam(); throw er; } return Promise.resolve(p).finally(devam); };
    E._topluAra = true;
  }
  /* sarılan komutlar: statik paftalar, kesit alma ve disiplin görünümleri */
  const KOMUT = ['STATIKCIZ', 'KESITPAFTA', 'GORUNUMPAFTA', 'GORUNUMGUNCELLE', 'SECTION', 'KESITUNITE'];
  const sarili = new Set();
  for (const ad of KOMUT) {
    const d = C.cmds[ad]; if (!d || sarili.has(d)) continue; sarili.add(d);
    const f0 = d.fn; d.fnTopluSiz = f0; /* karşılaştırma / sorun gidermek için eski yol */ d.fn = function () { const a = arguments, t = this; return C.toplu(() => f0.apply(t, a)); };
  }
})(typeof window !== 'undefined' ? window.C : null);

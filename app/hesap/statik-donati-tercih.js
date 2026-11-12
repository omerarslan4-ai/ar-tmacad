/* ArıtmaCAD — Statik: donatı seçim tercihi (ayarlar "Tasarım ayarları" bölümünde)
   - S.tas.sTercih : tercih edilen aralık (varsayılan 0.15 m). Yeterliyse o aralıkta en küçük çap; yetmezse en az çelikli seçim.
   - S.tas.agEsit  : perdede yatay = düşey (iç ve dış katman aynı çap / aralık; iki yüz zaten eşit). Varsayılan açık.
   - S.tas.kirisKabuk : 3B kabuk modelinde kolon / kiriş — 'cubuk' (varsayılan; çubuk eleman kaburga) | 'rijit' (eski: kiriş ekseni rijit mesnet).
   Seçimi statik-pafta-dsi.js → P.esitle yapar; burada kısa perdeler de (sonradan eklendikleri için) aynı kurala sokulur. */
(function () {
  'use strict';
  const P = window.STATIK; if (!P || !P.hesapla || P.hesapla._tercih) return;
  const h0 = P.hesapla;
  P.hesapla = function (S) { const R = h0.apply(this, arguments); try { if (P.esitle && !(S && S.tas && S.tas.esitCap === false) && R && R.kisa && R.kisa.length) P.esitle(R); } catch (e) { console.error('donatı tercihi', e); } return R; };
  P.hesapla._tercih = true;

  try {
    if (typeof FORM !== 'undefined' && typeof S !== 'undefined') {
      const sec = FORM.find(x => /Tasarım ayarları/.test(x[0]));
      if (sec && !sec[2].some(f => f.k === 'tas.sTercih')) {
        sec[2].push({ k: 'tas.sTercih', label: 'Tercih edilen donatı aralığı', t: 'sel', opts: [[0.15, '15 cm (mümkünse)'], [0.2, '20 cm (mümkünse)'], [0.125, '12.5 cm (mümkünse)'], [0, 'Serbest — en az çelik']] },
          { k: 'tas.agEsit', label: 'Perde yatay / düşey donatı', t: 'sel', opts: [[true, 'Aynı (iç ve dış katman tek ağ)'], [false, 'Her doğrultu ayrı']] },
          { k: 'tas.catDep', label: 'Çatlak kontrolü (yay / oval / anaerobik)', t: 'sel', opts: [[true, 'Deprem dahil'], [false, 'Yalnız işletme yükleri (deprem hariç)']] },
          { k: 'tas.kirisKabuk', label: 'Kabuk modelinde kolon / kiriş', t: 'sel', opts: [['cubuk', 'Çubuk eleman (perdeye gömülü kolon ve döşeme kirişi kaburga)'], ['rijit', 'Eski kabul: kiriş ekseni rijit mesnet, kolon yok']] });
        const vars = () => { if (S && S.tas) { if (S.tas.sTercih == null) S.tas.sTercih = 0.15; if (S.tas.agEsit == null) S.tas.agEsit = true; if (S.tas.catDep == null) S.tas.catDep = true; if (S.tas.kirisKabuk == null) S.tas.kirisKabuk = 'cubuk'; } };
        vars(); const bf = window.buildForm; if (typeof bf === 'function') { window.buildForm = buildForm = function () { vars(); return bf.apply(this, arguments); }; } // eslint-disable-line no-global-assign
        try { buildForm(); } catch (e) { }
      }
    }
  } catch (e) { console.error('donatı tercihi formu', e); }
})();

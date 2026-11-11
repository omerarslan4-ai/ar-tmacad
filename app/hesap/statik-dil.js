/* ArıtmaCAD — Statik penceresi: dil seçimi (paftalar, metrajlar, notlar, rapor).
   Ortak altyapı ../dil.js (+ ../dil-en.js sözlüğü). Seçim ArıtmaCAD ile ortaktır (localStorage 'aritmacad.dil'). */
(function () {
  'use strict';
  const P = window.STATIK, DIL = window.DIL; if (!P || !DIL) return;
  const $ = s => document.querySelector(s);

  // paftalar: ad + tüm yazılar (notlar satırlara bölünmeden önce çevrilir: statik-pafta-dsi.js → sar)
  if (P.paftalarDsi && !P.paftalarDsi._dil) {
    const p0 = P.paftalarDsi;
    P.paftalarDsi = function () { const paf = p0.apply(this, arguments); if (DIL.kod() !== 'tr') (paf || []).forEach(pf => { if (!pf) return; if (pf.ad) pf.ad = DIL.t(pf.ad); if (pf.spec) DIL.cevirSpec(pf.spec); }); return paf; };
    P.paftalarDsi._dil = true;
  }
  if (P.cerceveCizim && !P.cerceveCizim._dil) { const c0 = P.cerceveCizim; P.cerceveCizim = function () { return DIL.cevirSpec(c0.apply(this, arguments)); }; P.cerceveCizim._dil = true; }

  // rapor
  const raporCevir = () => { const r = $('#rapor'); if (r) DIL.cevirDom(r); };
  if (typeof window.rapor === 'function' && !window.rapor._dil) { const r0 = window.rapor; window.rapor = function () { const x = r0.apply(this, arguments); try { raporCevir(); } catch (e) { console.error('rapor dili', e); } return x; }; window.rapor._dil = true; }

  // araç çubuğuna dil seçimi
  const kur = () => {
    const tb = $('header .toolbar'); if (!tb || $('#selDil')) return;
    const s = document.createElement('select'); s.id = 'selDil'; s.title = 'Pafta, metraj ve rapor dili / Drawing & report language';
    s.innerHTML = Object.entries(DIL.diller).map(([k, ad]) => `<option value="${k}">${ad}</option>`).join(''); s.value = DIL.kod();
    s.style.cssText = 'margin-left:6px;padding:4px 6px;border-radius:6px';
    s.onchange = () => DIL.set(s.value);
    tb.appendChild(s);
  };
  DIL.dinle(k => {
    const s = $('#selDil'); if (s && s.value !== k) s.value = k;
    try { if (typeof R !== 'undefined' && R && typeof window.rapor === 'function' && $('#raporKutu') && $('#raporKutu').style.display !== 'none') window.rapor(); } catch (e) { }
    const m = $('#pMsg'); if (m) m.insertAdjacentHTML('afterbegin', `<div class="msg info">${k === 'tr' ? 'Dil: Türkçe — paftaları yeniden aktarın.' : 'Language: ' + DIL.diller[k] + ' — re-send the drawings (Çizime aktar) to update the sheets.'}</div>`);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kur); else kur();
})();

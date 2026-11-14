/* ArıtmaCAD — STATİK: YAPI TÜRÜNE GÖRE ÇÖZÜM YOLU (statik.html eklentisi)
   Firma kuralı: docs/tasarim-standartlari.md › "Statik ve donatı" › "Yapı türüne göre statik çözüm yolu" (14.11.2026, kullanıcı onayladı).
   Program yapının türünü modelden önerir, kullanıcı statik penceresinde değiştirebilir:
     su     : su yapısı (havuz, hazne, tank)         → yalnız 3B kabuk (perde, radye, döşeme)
     altUst : gömülü alt yapı + üst yapı (terfi merkezi) → iki aşama: üst yapı çerçeve (kolon ayakları alt yapı üst kotunda ankastre),
              alt yapı 3B kabuk (toprak + su + üst yapının kolon ayağı tepkileri)
     ust    : yalnız üst yapı (bekçi, idari bina)    → çerçeve + temel hesabı, kabuk yok
   Öneri ölçütleri (P.yapiTuru, saf): zeminin altında betonarme perde var mı (perde üstü ≤ en yüksek toprak / tretuvar kotu), haznede su
   var mı, alt yapının üstünde kolonlu / kirişli kat var mı. Alt yapı üst kotu = zeminin altında kalan perdelerin en yüksek üst kotu.
   Seçim projeye yazılır: C.doc.set.statikAyar.yapiTuru / altUstKot (eski projelerde alan yoksa öneri kullanılır). */
(function (G) {
  'use strict';
  const P = G.STATIK = G.STATIK || {};
  const r3 = v => Math.round(v * 1000) / 1000, f2 = (v, d = 2) => (v == null || !isFinite(v) ? '—' : (+v).toFixed(d).replace('.', ','));
  P.YAPI_TURU = { su: 'Su yapısı — 3B kabuk (perde, radye, döşeme)', altUst: 'Gömülü alt yapı + üst yapı — iki aşama (üst yapı çerçeve, alt yapı 3B kabuk)', ust: 'Yalnız üst yapı — çerçeve + temel (kabuk yok)' };
  P.YAPI_TURU_KISA = { su: 'Su yapısı', altUst: 'Alt yapı + üst yapı', ust: 'Yalnız üst yapı' };

  /* d: STATIKMODEL verisi { kabuk?, geo?, cerceve?, zeminKot?, su?, statikAyar? } → { tur, altUstKot, zeminKot, su, ustVar, gomulu, neden[] } */
  P.yapiTuru = d => {
    d = d || {}; const K = d.kabuk || null, CF = d.cerceve || {}, neden = [];
    const rad = K && K.radye ? K.radye : d.geo && d.geo.kAlt != null ? { kAlt: +d.geo.kAlt, t: +d.geo.hr || 0 } : null, rUst = rad ? rad.kAlt + rad.t : null;
    // betonarme perdeler (z0, zt): çerçeve listesinden (tüm beton perdeler) ya da kabuk perdelerinden (radye üstünden)
    let perde = (CF.perdeler || []).map(w => ({ z0: +w.z0, zt: +w.zt }));
    if (!perde.length && K) perde = (K.walls || []).map(w => ({ z0: rUst != null ? rUst : +w.zt - 3, zt: +w.zt }));
    if (!perde.length && d.geo && d.geo.kUst != null && rUst != null) perde = [{ z0: rUst, zt: +d.geo.kUst }];
    perde = perde.filter(w => isFinite(w.z0) && isFinite(w.zt) && w.zt - w.z0 >= 0.3);              // kicker / su tutucu bant kaidesi sayılmaz
    const zG = d.zeminKot != null && isFinite(+d.zeminKot) ? +d.zeminKot : null;
    const su = d.su === true || !!(K && Array.isArray(K.senaryolar) && K.senaryolar.length);
    // zeminin altında kalan perde: üstü zemin kotunun altında (5 cm tolerans), en az 1 m gömülü
    const gomulu = zG != null ? perde.filter(w => w.zt <= zG + 0.05 && zG - w.z0 >= 1.0) : [];
    const altUstKot = gomulu.length ? r3(Math.max(...gomulu.map(w => w.zt))) : null;
    // üst yapı: alt yapının (yoksa perde / radye üstünün) en az 50 cm üstüne çıkan kolon ya da kiriş
    const perdeUst = perde.length ? Math.max(...perde.map(w => w.zt)) : null;
    const zRef = altUstKot != null ? altUstKot : su && perdeUst != null ? perdeUst : rUst != null ? rUst : -Infinity;
    const kol = (CF.kolonlar || []).filter(c => +c.zt > zRef + 0.5), kir = (CF.kirisler || []).filter(k => +k.zt > zRef + 0.5), ustVar = !!(kol.length || kir.length);
    const kabukVar = !!(K && (K.walls || []).length && K.radye) || !!(d.geo && rUst != null && perde.length);
    let tur = null;
    if (zG == null) neden.push('Modelde zemin (toprak / tretuvar) kotu yok: perdelerin zeminin altında kalıp kalmadığı bilinmiyor.');
    else neden.push(`Zemin kotu ${f2(zG)} (en yüksek toprak / tretuvar).`);
    if (gomulu.length) neden.push(`${gomulu.length} betonarme perde zeminin altında (üst kot ${f2(altUstKot)}).`);
    else if (perde.length) neden.push(zG != null ? `Betonarme perdelerin üstü zeminin üstünde (en yüksek ${f2(perdeUst)}) — gömülü alt yapı yok.` : `${perde.length} betonarme perde var.`);
    if (su) neden.push('Haznede su var.');
    if (ustVar) neden.push(`Üstünde kolonlu / kirişli kat var (${kol.length} kolon, ${kir.length} kiriş ${f2(zRef)} kotunun üstünde).`);
    if (gomulu.length && ustVar) tur = 'altUst';
    else if (su && ustVar && perde.length) tur = 'altUst';                                             // susuz kat altında hazne: hazne alt yapı
    else if (kabukVar && !ustVar) tur = 'su';
    else if (ustVar || (CF.kolonlar || []).length || (CF.kirisler || []).length) tur = 'ust';
    else if (kabukVar) tur = 'su';
    const kot = tur === 'altUst' ? (altUstKot != null ? altUstKot : perdeUst != null ? r3(perdeUst) : null) : null;
    return { tur, altUstKot: kot, zeminKot: zG, su, ustVar, gomulu: gomulu.length, neden };
  };
  /* model + proje ayarı → geçerli seçim { tur, altUstKot, oneri, elle } (eski projede alan yoksa öneri) */
  P.yapiSecim = (d, A) => {
    const o = P.yapiTuru(d); A = A || (d && (d.statikAyar || (d.cerceve && d.cerceve.ayar))) || {};
    const elle = !!P.YAPI_TURU[A.yapiTuru], tur = elle ? A.yapiTuru : o.tur;
    const k = A.altUstKot != null && A.altUstKot !== '' && isFinite(+A.altUstKot) ? +A.altUstKot : o.altUstKot;
    return { tur, altUstKot: k != null ? k : o.altUstKot, oneri: { tur: o.tur, altUstKot: o.altUstKot, neden: o.neden }, elle, elleKot: A.altUstKot != null && A.altUstKot !== '' };
  };

  /* ================= PENCERE (yalnız tarayıcıda) ================= */
  if (typeof document === 'undefined' || typeof G.buildForm !== 'function' || typeof G.modelUygula !== 'function') return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = s => document.querySelector(s);
  const Sx = () => (typeof S !== 'undefined' ? S : null);   // statik.html'in S değişkeni
  // projeye yaz (ArıtmaCAD penceresi açıksa): C.doc.set.statikAyar
  const projeyeYaz = o => { let OC = null; try { OC = G.opener && G.opener.C && G.opener.C._statikAyarYaz ? G.opener.C : null; } catch (er) { OC = null; } if (!OC) return false; try { OC._statikAyarYaz(o); return true; } catch (er) { console.error(er); return false; } };
  const kutu = () => {
    const s = Sx(); if (!s || !s.yapi || !s.yapi.tur) return null;
    const y = s.yapi, o = y.oneri || {}, w = document.createElement('details'); w.className = 'sec'; w.open = true; w.id = 'yapiTuruKutu';
    w.innerHTML = `<summary>Yapı türü (statik çözüm yolu)</summary><div class="body">
      <label class="f full">Yapı türü<select id="selYapiTuru">${Object.entries(P.YAPI_TURU).map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('')}</select></label>
      ${y.tur === 'altUst' ? `<label class="f">Alt yapı üst kotu (m)<input id="inAltUst" value="${y.altUstKot != null ? y.altUstKot : ''}"></label><div class="hint" style="align-self:end">Bu kotun altındaki perde, radye, döşeme ve kirişler alt yapı (kabuk); üstündekiler üst yapı (çerçeve).</div>` : ''}
      <p class="hint full">Program önerisi: <b>${esc(P.YAPI_TURU_KISA[o.tur] || '—')}</b>${o.tur === 'altUst' && o.altUstKot != null ? ` (alt yapı üst kotu ${f2(o.altUstKot)})` : ''}. ${esc((o.neden || []).join(' '))}${y.elle || y.elleKot ? ' <b>Seçim elle değiştirildi.</b> <a href="#" id="yapiOneri">Öneriye dön</a>' : ''}</p></div>`;
    const sel = w.querySelector('#selYapiTuru'); sel.value = y.tur;
    sel.onchange = () => { y.tur = sel.value; y.elle = y.tur !== o.tur; if (y.tur === 'altUst' && y.altUstKot == null) y.altUstKot = o.altUstKot; const ok = projeyeYaz({ yapiTuru: y.elle ? y.tur : null }); bildir(ok); G.buildForm(); changed(); };
    const inp = w.querySelector('#inAltUst'); if (inp) inp.onchange = () => { const v = parseFloat(String(inp.value).replace(',', '.')); if (isFinite(v)) { y.altUstKot = r3(v); y.elleKot = Math.abs(v - (o.altUstKot != null ? o.altUstKot : NaN)) > 1e-4; } else { y.altUstKot = o.altUstKot; y.elleKot = false; } const ok = projeyeYaz({ altUstKot: y.elleKot ? y.altUstKot : null }); bildir(ok); G.buildForm(); changed(); };
    const geri = w.querySelector('#yapiOneri'); if (geri) geri.onclick = ev => { ev.preventDefault(); y.tur = o.tur; y.altUstKot = o.altUstKot; y.elle = false; y.elleKot = false; bildir(projeyeYaz({ yapiTuru: null, altUstKot: null })); G.buildForm(); changed(); };
    return w;
  };
  const bildir = ok => { const m = $('#pMsg'); if (m && !ok) m.insertAdjacentHTML('afterbegin', '<div class="msg">Yapı türü yalnız bu pencerede değişti: ArıtmaCAD penceresine erişilemedi, projeye yazılmadı (statik penceresini ArıtmaCAD içinden açın).</div>'); };
  const build0 = G.buildForm;
  G.buildForm = function () { const r = build0.apply(this, arguments); try { const k = kutu(), root = $('#form'); if (k && root) root.insertBefore(k, root.firstChild); } catch (er) { console.error('yapı türü', er); } return r; };
  const model0 = G.modelUygula;
  G.modelUygula = function (d) {
    const r = model0.apply(this, arguments);
    try { const s = Sx(); if (s && d && !d.hata) { s.yapi = P.yapiSecim(d); if (typeof save === 'function') save(); G.buildForm();
      const m = $('#pMsg'); if (m) m.insertAdjacentHTML('afterbegin', `<div class="msg info">Yapı türü: <b>${esc(P.YAPI_TURU_KISA[s.yapi.tur] || '—')}</b>${s.yapi.elle ? ' (projede elle seçilmiş)' : ' (program önerisi)'}${s.yapi.tur === 'altUst' ? ` · alt yapı üst kotu ${f2(s.yapi.altUstKot)}` : ''}. Formun başındaki <b>Yapı türü</b> bölümünden değiştirebilirsiniz.</div>`); } } catch (er) { console.error('yapı türü', er); }
    return r;
  };
  try { G.buildForm(); } catch (er) { console.warn(er); }
})(typeof window !== 'undefined' ? window : globalThis);

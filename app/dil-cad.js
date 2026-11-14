/* ArıtmaCAD — dil komutları (tüm disiplinler):
   DIL / LANGUAGE   : çizim, pafta ve rapor dilini seçer (hesap pencereleri ile ortak)
   CEVIR / TRANSLATE: seçili (seçim yoksa tüm) yazı, ölçü ve kot metinlerini + düzen (pafta) adlarını seçili dile çevirir
   Sözlükler: app/dil-<kod>.js (her disiplin kendi terimlerini DIL.ekle ile ekleyebilir). */
(function (C) {
  'use strict';
  const DIL = window.DIL; if (!C || !DIL) return;
  C.addCommand(['DIL', 'LANGUAGE', 'LANG'], 'Çizim / pafta / rapor dilini seçer', async (I) => {
    const ks = Object.keys(DIL.diller), sec = ks.map(k => [k.toUpperCase(), DIL.diller[k]]);
    const k = await I.kw('Dil / Language', sec, DIL.kod().toUpperCase()); if (!k || typeof k !== 'string') return;
    const y = k.toLowerCase();
    // iki dil düzeni birlikte değişir: program / rapor dili (DIL) ve projenin çizim dili (C.setLang → doc.set.lang; çizimdeki yazılar, paftalar, DXF/PDF)
    DIL.set(y); if (C.setLang) C.setLang(y === 'en' ? 'en' : 'tr');
    C.log(`Dil: ${DIL.diller[DIL.kod()]} — çizim, paftalar ve raporlar bu dilde gösterilir; yazıları kalıcı olarak çevirmek için CEVIR.`);
  }, { noUndo: true });
  // proje açılınca program dili projenin diline uyar (EN kaydedilmiş proje EN açılır)
  if (C.on) C.on('doc', () => { try { const l = C.doc && C.doc.set && C.doc.set.lang; if (l && DIL.kod() !== l && DIL.diller[l]) DIL.set(l); } catch (e) { } });
  C.addCommand(['CEVIR', 'TRANSLATE', 'DILCEVIR'], 'Yazıları seçili dile çevirir (seçim yoksa tümü)', async (I) => {
    if (DIL.kod() === 'tr') { C.log('Seçili dil Türkçe — önce DIL komutuyla hedef dili seçin.'); return; }
    const ents = Array.isArray(C.sel) && C.sel.length ? C.sel.slice() : C.doc.ents;
    C.begin(); let n = 0;
    for (const e of ents) {
      for (const f of ['s', 'txt', 'text']) { if (typeof e[f] === 'string' && e[f]) { const y = DIL.t(e[f]); if (y !== e[f]) { e[f] = y; n++; delete e._c; } } }
    }
    let nl = 0; (C.doc.layouts || []).forEach(L => { if (L.name) { const y = DIL.t(L.name); if (y !== L.name) { L.name = y; nl++; } } if (L.f) for (const k of ['baslik', 'proje']) if (L.f[k]) L.f[k] = DIL.t(L.f[k]); });
    C.changed(); C.log(`${n} yazı ve ${nl} pafta adı ${DIL.diller[DIL.kod()]} diline çevrildi (geri almak için U).`);
  });
})(window.C);

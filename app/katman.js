/* ArıtmaCAD — İNŞAAT KATMANLARI: her eleman türünün kendine ait katmanı (kolon, kiriş, perde, tuğla duvar, döşeme, çatı döşemesi, parapet, dolgu, kaplamalar, yalıtımlar …)
   Yeni oluşturulan elemanlar otomatik kendi katmanına konur; INSKATMAN mevcut çizimdeki elemanları da taşır. Kullanıcının kendi (INS_ ile başlamayan) katmanlarına dokunulmaz. */
(function (C) {
  'use strict';
  // ad: [renk (ACI), çizgi kalınlığı (1/100 mm), açıklama]
  const L = {
    INS_KOLON: [1, 50, 'Kolonlar'], INS_KIRIS: [3, 35, 'Kirişler'], INS_PERDE: [8, 50, 'Betonarme perdeler'],
    INS_DUVAR_TUGLA: [31, 35, 'Tuğla duvarlar'], INS_DUVAR_GAZBETON: [41, 35, 'Gazbeton duvarlar'], INS_DUVAR_BRIKET: [251, 35, 'Briket duvarlar'],
    INS_DOSEME: [4, 35, 'Döşemeler'], INS_CATI_DOSEMESI: [140, 35, 'Çatı döşemeleri'], INS_PARAPET: [6, 35, 'Parapetler'], INS_AYAK_DUVARI: [216, 35, 'Çatı ayak duvarları'],
    INS_TEMEL_RADYE: [252, 50, 'Radye temeller'], INS_TEMEL_TEKIL: [253, 50, 'Tekil temeller'], INS_TEMEL_SUREKLI: [254, 50, 'Sürekli temeller'],
    INS_PENCERE: [5, 25, 'Pencereler'], INS_KAPI: [30, 25, 'Kapılar'], INS_DOLGU: [33, 18, 'Sıkıştırılmış dolgu'],
    INS_KAPLAMA_ZEMIN: [9, 13, 'Zemin kaplamaları'], INS_KAPLAMA_IC_DUVAR: [9, 13, 'İç duvar sıva / boya / kaplama'], INS_KAPLAMA_DIS_CEPHE: [9, 13, 'Dış cephe sıva / boya / kaplama'], INS_KAPLAMA_TAVAN: [9, 13, 'Tavan kaplamaları'],
    INS_YALITIM_CEPHE: [6, 13, 'Dış cephe ısı yalıtımı'], INS_YALITIM_CATI: [6, 13, 'Çatı / teras yalıtımı'], INS_YALITIM_ZEMIN: [6, 13, 'Zemin altı yalıtım'], INS_YALITIM_TEMEL: [6, 13, 'Temel yalıtımı'],
    INS_SU_YALITIMI: [150, 13, 'Su yalıtımı (ıslak hacim / havuz)'], INS_SU_TUTUCU_BANT: [5, 25, 'Su tutucu bantlar'], INS_CATI: [30, 25, 'Çatı (örtü + ahşap iskelet)'], INS_TRETUVAR: [42, 25, 'Tretuvar'], ARI_IZGARA: [4, 25, 'Mekanik kaba ızgara'], INS_MERDIVEN: [30, 25, 'Merdivenler ve korkuluklar'], INS_SU: [150, 13, 'Su (havuz içi)'],
  };
  const MZ = { tugla: 'INS_DUVAR_TUGLA', gazbeton: 'INS_DUVAR_GAZBETON', briket: 'INS_DUVAR_BRIKET' };
  const layerFor = e => {
    switch (e.type) {
      case 'kolon': return 'INS_KOLON';
      case 'kiris': return 'INS_KIRIS';
      case 'plak': return e.kind === 'radye' ? 'INS_TEMEL_RADYE' : (e.cati ? 'INS_CATI_DOSEMESI' : 'INS_DOSEME');
      case 'temel': return 'INS_TEMEL_TEKIL';
      case 'perde': if (e.kicker && e.kLay) return e.kLay; if (e.temel) return 'INS_TEMEL_SUREKLI'; if (e.ayak) return 'INS_AYAK_DUVARI'; if (e.parapet) return 'INS_PARAPET'; return (e.malz || 'beton') === 'beton' ? 'INS_PERDE' : (MZ[e.malz] || 'INS_DUVAR_TUGLA');
      case 'acik': return e.kind === 'kapi' ? 'INS_KAPI' : 'INS_PENCERE';
      case 'dolgu': return 'INS_DOLGU';
      case 'kaplama': return e.kind === 'zemin' ? 'INS_KAPLAMA_ZEMIN' : e.kind === 'tavan' ? 'INS_KAPLAMA_TAVAN' : e.side === 'DIS' ? 'INS_KAPLAMA_DIS_CEPHE' : 'INS_KAPLAMA_IC_DUVAR';
      case 'yalitim': return { cephe: 'INS_YALITIM_CEPHE', cati: 'INS_YALITIM_CATI', zemin: 'INS_YALITIM_ZEMIN', temel: 'INS_YALITIM_TEMEL', su: 'INS_SU_YALITIMI', bant: 'INS_SU_TUTUCU_BANT' }[e.kind] || null;
      case 'cati': return 'INS_CATI';
      case 'tretuvar': return 'INS_TRETUVAR';
      case 'izgara': return 'ARI_IZGARA';
      case 'merdiven': case 'korkuluk': return 'INS_MERDIVEN';
      case 'su': return 'INS_SU';
    }
    return null;
  };
  C.insLayerFor = layerFor; C.INS_LAYERS = L;
  /* katman kapatmak yalnız görünürlüğü etkiler: kesimler, kotlar, minha ve metraj kapalı katmandaki elemanları da hesaba katar */
  C.lyLive = () => true;
  const ensure = n => { const d = L[n]; if (d) C.ensureLayer(n, d[0], 'CONTINUOUS', d[1]); };
  const generic = l => !l || l === '0' || l === 'IZGARA' || /^INS_/.test(l);
  const fix = e => { const n = layerFor(e); if (!n || e.layer === n || !generic(e.layer)) return false; ensure(n); const old = e.layer; e.layer = n; delete e._c; if (old && /^INS_/.test(old) && !L[old] && C.doc.layers[old] && !C.doc.ents.some(x => x.layer === old) && C.doc.cur.layer !== old) delete C.doc.layers[old]; return true; };
  C.insFixLayer = fix;
  const add0 = C.add; C.add = function (type, props) { const e = add0.apply(this, arguments); try { if (fix(e)) C.emit('layers'); } catch (err) { } return e; };
  // sonradan değişen özellikler (parapet → ayak duvarı, malzeme değişimi, kaplama yönü) katmanı izlesin
  C.on('change', () => { if (!C.doc) return; let ch = false; for (const e of C.doc.ents) if (layerFor(e) && generic(e.layer) && e.layer !== layerFor(e)) ch = fix(e) || ch; if (ch) C.emit('layers'); });
  C.addCommand(['INSKATMAN', 'INSAATKATMAN', 'KATMANDUZENLE'], 'İnşaat elemanlarını kendi katmanlarına taşı (kolon, kiriş, perde, duvar, döşeme, çatı döşemesi, parapet, temel, dolgu, kaplamalar, yalıtımlar, çatı). Kendi verdiğiniz (INS_ ile başlamayan) katmanlara dokunmaz.', async () => {
    let n = 0; for (const e of C.doc.ents) if (fix(e)) n++;
    // boşalan eski genel katmanlar (INS_KAPLAMA, INS_YALITIM, INS_DUVAR …)
    const used = new Set(C.doc.ents.map(e => e.layer)); const old = Object.keys(C.doc.layers).filter(k => /^INS_/.test(k) && !L[k] && !used.has(k)); for (const k of old) delete C.doc.layers[k];
    C.changed(); C.emit('layers'); C.log(`${n} eleman kendi katmanına taşındı${old.length ? `; boşalan eski katmanlar silindi: ${old.join(', ')}` : ''}.`);
  });
})(window.C);

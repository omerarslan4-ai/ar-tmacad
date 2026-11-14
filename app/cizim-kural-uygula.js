/* ArıtmaCAD — ÇİZİM KURALLARININ UYGULANMASI (mimari)
   Kural tablosu (app/cizim-kural.js → MIMARI) kullanıcının örnek çizimlerinden çıkarılmıştır. Program içeride kendi katman adlarıyla
   çalışmaya devam eder (KESIT_PERDE, GORUNEN_DOSEME, KESIT_OLCU …; eski .aritma dosyaları bozulmaz); bu modül üç yerde kuralı uygular:
     1) EKRAN  : yeni açılan çizim katmanı (kesit, görünüş, ölçü, kot, aks, yazı, tarama) rengini, çizgi tipini ve kalınlığını
                 eşlendiği örnek katmandan alır. Model katmanlarına (INS_…, ARI_…, MEK_…) ekranda dokunulmaz.
                 CIZIMKURAL komutu aynı şeyi açık çizimin var olan katmanlarına uygular.
     2) ÇIKTI  : AutoCAD'e 2B çıktıda (DXF2B, disiplin dosyaları) katman adları örnek çizimlerin adlarına çevrilir (Beton, Ongor, Arkagor,
                 ÖL, Kot, Aks, Tarama …), katman tablosuna örnekteki renk / çizgi tipi / kalınlık yazılır, nesneler bunları katmandan alır.
     3) TARAMA : kesit taramaları örnek projedeki gibi (kullanıcı kararı 14.11.2026); desen seçimi kesit.js → secHatchSpec, tablo MIMARI.kesitTarama.
   Yalnız pafta stili COKAL iken etkindir (PAFTASTIL KLASIK: ArıtmaCAD'in eski görünümü, eşleme yapılmaz).
   Saf mantık (eşleme, çıktı dönüşümü) cizim-kural.js içindedir ve Node ile denenir: test/cizim-esle.test.js */
(function (C) {
  'use strict';
  const K = C.cizimKural; if (!K) return;
  const R = () => K.MIMARI;
  const etkin = () => { try { return !!(C.doc && C.pstil && C.pstil()); } catch (e) { return false; } };
  /* örnek çizimlerdeki çizgi tipleri (acadiso.lin, mm) */
  const LT_EK = {
    CENTER2: { d: 'Center (.5x) ___ _ ___ _ ___', p: [19.05, -3.175, 3.175, -3.175] },
    PHANTOM2: { d: 'Phantom (.5x) ___ _ _ ___ _ _', p: [15.875, -3.175, 3.175, -3.175, 3.175, -3.175] },
    ACAD_ISO04W100: { d: 'ISO long-dash dot ____ . ____ .', p: [24, -3, 0.5, -3] },
  };
  for (const [n, v] of Object.entries(LT_EK)) if (C.LT && !C.LT[n]) C.LT[n] = v;
  /* örnek çizimlerin kâğıttaki desenleri (MIMARI.cizgiTipi, mm): yalnız Mimari kural katmanları kullanır. Genel C.LT desenlerine dokunulmaz
     (statik / mekanik çizim, SVG, PDF ve DXF eskisi gibi); Mimari desenleri '<AD>_M' adıyla tanımlanır (ör. HIDDEN_M), Mimari kural katmanı ekranda
     bu adı alır. Mimari grubu AutoCAD çıktısında asıl adlarla (HIDDEN …) ve bu desenlerle yazılır (mimari-pafta.js → dxfCizgiOlcegi / mimariLtDesen). */
  const LT_M = n => n + '_M';
  if (C.LT) for (const [n, p] of Object.entries(R().cizgiTipi || {})) C.LT[LT_M(n)] = { d: ((C.LT[n] && C.LT[n].d) || n) + ' (mimari)', p: p.slice() };
  C.mimariLtDesen = () => Object.assign({}, R().cizgiTipi || {});
  /* pafta penceresinde çizgi tipi ölçeği: kâğıtta desen mm'si (K.vpCizgiOlcegi) × kullanıcının LTSCALE çarpanı (varsayılan LTSCALE = ölçek / 1000 → 1) */
  C.vpCizgiOlcegi = sc => K.vpCizgiOlcegi(sc) * ((C.doc && C.doc.set && +C.doc.set.ltscale) ? +C.doc.set.ltscale / ((+C.doc.set.anno || 50) / 1000) : 1);
  const MODEL = /^(INS_|ARI_|MEK_)|^(BETON|DUVAR|BORU|POMPA|VANA|SU|ARAZI|HARITA|SEVIYE)$/; // model ve genel çizim katmanları: ekranda kendi rengiyle kalır
  /* program katmanının ekrandaki özellikleri (kural yoksa null) */
  const ekran = ad => { if (!ad || MODEL.test(ad)) return null; const h = K.esle(R(), ad); if (!h) return null; const t = R().katmanlar[h]; /* yalnız mimari kural katmanları (mekanik katmanların kuralı henüz yok) */ if (!t) return null; const o = K.ozellik(t); if (C.LT[LT_M(o.lt)]) o.lt = LT_M(o.lt); else if (!C.LT[o.lt]) o.lt = 'CONTINUOUS'; return o; };
  const isle = (L, o) => { let d = false; if (L.color !== o.color) { L.color = o.color; d = true; } if (L.lt !== o.lt) { L.lt = o.lt; d = true; } if (o.lw >= 0 && L.lw !== o.lw) { L.lw = o.lw; d = true; } return d; };
  /* 1) yeni katman */
  { const e0 = C.ensureLayer; C.ensureLayer = function (name) { const yeni = C.doc && !C.doc.layers[name], L = e0.apply(this, arguments); try { if (yeni && L && etkin()) { const o = ekran(name); if (o) isle(L, o); } } catch (er) { } return L; }; }
  /* açık çizimin var olan katmanları */
  /* proje açılınca (Çokal stilinde) var olan mimari kural katmanlarına da uygulanır: önceki sürümle kaydedilmiş projede Mimari desenleri (_M) gelir */
  C.on && C.on('doc', () => setTimeout(() => { try { if (etkin() && C.cizimKuralUygula) C.cizimKuralUygula(); } catch (er) { } }, 0));
  C.cizimKuralUygula = () => { let n = 0; for (const L of Object.values(C.doc.layers)) { const o = ekran(L.name); if (o && isle(L, o)) n++; } return n; };
  /* 2) AutoCAD çıktısı */
  C.cizimKuralCikti = ({ body, blocks, PSL, layers, usedLt, opts }) => {
    if (!etkin() || (opts && opts.grp && !/M[İI]MAR[İI]|GENEL/i.test(opts.grp))) return null; // statik, mekanik, elektrik dosyalarına dokunulmaz (kuralları henüz yok)
    const kayit = body.slice(); for (const b of blocks || []) for (const it of b.items || []) kayit.push(it); for (const P of PSL || []) for (const it of P.items || []) kayit.push(it);
    const an = (C.doc.set.anno || 50) / 1000, r = K.ciktiUygula(R(), kayit, layers, { mm: q => q.st.ps ? q.pr.h : q.pr.h / (q.st.vsc ? q.st.vsc / 1000 : an) }); // yazının kâğıt boyu: onu gösteren pafta penceresinin ölçeğiyle (1/20 detay, 1/10 çatı detayı …)
    for (const L of Object.values(layers)) { if (/_M$/.test(L.lt || '') && C.LT[L.lt.slice(0, -2)]) L.lt = L.lt.slice(0, -2); if (!C.LT[L.lt]) L.lt = 'CONTINUOUS'; usedLt.add(L.lt); } // _M (Mimari ekran deseni) → asıl ad
    C.cizimKuralSon = r; return r;
  };
  /* 3) kesit taramaları: kesit.js → secHatchSpec kural tablosundan seçer (MIMARI.kesitTarama) */
  /* beton olmayan kesilen parçaların (korkuluk, doğrama, profil) taraması */
  C.ekipTarama = () => (etkin() && R().kesitTarama.diger === 'SOLID' && (C.HATCH_PATTERNS || {}).SOLID ? { pat: 'SOLID', sc: 1 } : { pat: 'ANSI37', sc: 0.5 });
  const tazele = () => { for (const e of C.doc.ents) if (e._c) { delete e._c.p; delete e._c.b; } if (C.views) for (const w of Object.values(C.views)) if (w && 'dirty' in w) w.dirty = true; C.emit && C.emit('layers'); C.changed && C.changed(); };
  C.addCommand && C.addCommand(['CIZIMKURAL', 'CIZIMKURALLARI', 'KATMANKURAL'], 'Çizim kuralları: açık çizimdeki kesit, görünüş, ölçü, kot, aks, yazı ve tarama katmanlarının rengini, çizgi tipini ve kalınlığını örnek çizimlerdeki katmanlara göre ayarlar (Beton, Ongor, Arkagor, ÖL, Kot, Aks, Tarama …). AutoCAD çıktısında katman adları da örnekteki adlara çevrilir.', async () => {
    if (!etkin()) return C.warn('Çizim kuralları yalnız Çokal pafta stilinde uygulanır (PAFTASTIL COKAL).');
    C.begin && C.begin(); const n = C.cizimKuralUygula(); tazele();
    C.log(`✓ Çizim kuralları: ${n} katmanın rengi, çizgi tipi ve kalınlığı örnek çizimlere göre ayarlandı.`);
  });
  if (typeof window !== 'undefined' && window.DIL) window.DIL.ekle('en', 'English', [
    ['Çizim kuralları: açık çizimdeki kesit, görünüş, ölçü, kot, aks, yazı ve tarama katmanlarının rengini, çizgi tipini ve kalınlığını örnek çizimlerdeki katmanlara göre ayarlar (Beton, Ongor, Arkagor, ÖL, Kot, Aks, Tarama …). AutoCAD çıktısında katman adları da örnekteki adlara çevrilir.', 'Drawing rules: sets colour, linetype and lineweight of the section, elevation, dimension, level, axis, text and hatch layers of the open drawing from the reference drawings (Beton, Ongor, Arkagor, ÖL, Kot, Aks, Tarama …). Layer names are also translated in the AutoCAD output.'],
    ['Çizim kuralları yalnız Çokal pafta stilinde uygulanır (PAFTASTIL COKAL).', 'Drawing rules apply only in the Çokal sheet style (PAFTASTIL COKAL).'],
    ['✓ Çizim kuralları: # katmanın rengi, çizgi tipi ve kalınlığı örnek çizimlere göre ayarlandı.', '✓ Drawing rules: colour, linetype and lineweight of # layers set from the reference drawings.'],
  ]);
})(window.C);

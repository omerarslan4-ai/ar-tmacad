/* ArıtmaCAD — MEKANİK PAFTALAMA (firma kuralı 14.11.2026: Mekanik paftalama da Mimari gibi otomatik, kendi "Mekanik" sekmesinden)
   TESISATPAFTA (mt-ek.js) çizilmiş sistemlerin (ısı yalıtımı, ısıtma, soğutma, havalandırma, sıhhi tesisat) görünümlerini üretir; bu modül onları
   Mimari paftalamanın altyapısıyla (mimari-pafta.js) paftalara koyar:
     ölçek bina ebatına göre (olcekSec: 1/50; çok küçükse 1/25, A0'a sığmazsa 1/100; eşik %40 — Mimari ile aynı paylar, aynı bina aynı ölçek),
     en az kâğıt (enAzKagit: aynı tür görünümler bir arada, boşluklar dikey istiflenir, pafta gereksiz uzamaz; A1 / A0, yükseklik sabit, genişlik en çok 1,8 ×),
     Çokal R2 pafta düzeni (çerçeve, sağda antet sütunu), antette bütün ölçekler (pafta-liste.js), pafta no MEK-01 …, pafta listesi (Mekanik grubu),
     Tasarım alanında Mekanik bölgesi (BOLGEDUZENLE TESISATPAFTA'dan sonra kendiliğinden), ayrı DXF (MEKANIKDXF).
   Sistem başına pafta adı korunur ("MEKANİK — ISITMA TESİSATI"; sığmazsa "(1/2)"). Elle düzeltilmiş paftalar (PAFTAELLE ile işaretli: L.elle)
   yeniden çalıştırmada korunur.
   Şerit: "Mekanik" sekmesi (Tesisat sekmesi yerinde kalır).
   Saf kısım Node ile denenir: node test/mt-pafta.test.js */
(function (C) {
  'use strict';

  /* ======================= SAF KISIM ======================= */
  const SIRA = { yalitim: 0, isitma: 1, sogutma: 2, hava: 3, sihhi: 4 };
  const ETIKET_MM = 16; // pencere başlığı + ölçek yazısı pencerenin altında (mt-ek.js vpLabelPrims: başlık 14 pt ≈ 4,9 mm, ölçek satırı, alt çizgi)
  /* ölçek: Mimari'nin tahminiyle aynı bloklar (plan: ölçü sıraları + aks balonu 41 mm her yanda, başlık 15 mm; kesit: 30 mm, başlık 15 mm).
     bb: bina plan kutusu [x0, y0, x1, y1] (m), z: [zmin, zmax] (m) → olcekSec sonucu */
  const olcekBul = (A, bb, z, antetW) => {
    if (!A || !bb) return { olcek: 50, kagit: 'A1', oranA1: 0, neden: 'bina yok: 1/50' };
    const lx = bb[2] - bb[0], ly = bb[3] - bb[1], zh = z && isFinite(z[0]) && isFinite(z[1]) ? z[1] - z[0] : 3;
    return A.olcekSec([{ id: 'plan', w: lx, h: ly, kenarMm: 41, altMm: 15 }, { id: 'kesit', w: Math.max(lx, ly), h: Math.max(0.5, zh), kenarMm: 30, altMm: 15 }], { antetW });
  };
  /* pencere blokları → paftalar. bloklar: [{ w, h (pencerenin kâğıt boyu, mm), etiket (altında başlık), etiketW (başlık genişliği mm), grup }].
     Döner: { paftalar: [{ kagit, pw, ph, antet, ids, gruplar, tasan, vps: [{ i (blok sırası), x, y, w, h }] }], alan, adet } */
  const yerlestir = (A, bloklar, o = {}) => {
    const B = (bloklar || []).map((b, i) => ({ id: 'b' + i, i, w: Math.max(b.w, b.etiket ? (b.etiketW || 0) : 0), h: b.h + (b.etiket ? ETIKET_MM : 0), grup: b.grup || '', b }));
    const Y = A.enAzKagit(B.map(q => ({ id: q.id, w: q.w, h: q.h, grup: q.grup })), { antetW: o.antetW, ayri: o.ayri });
    const byId = new Map(B.map(q => [q.id, q]));
    return Object.assign({}, Y, { paftalar: Y.paftalar.map(P => Object.assign({}, P, { vps: P.ids.map(id => { const q = byId.get(id), y = P.yer[id];
      return { i: q.i, x: y[0] + (q.w - q.b.w) / 2, y: y[1] + (q.b.etiket ? ETIKET_MM : 0), w: q.b.w, h: q.b.h }; }) })) });
  };
  /* pafta adı: sistem adı korunur; birden çok paftaya bölünürse (1/2), (2/2) */
  const paftaAdi = (ad, i, n) => `MEKANİK — ${ad}` + (n > 1 ? ` (${i + 1}/${n})` : '');
  /* Mekanik paftaları sıraya diz ve numarala: tesisat paftaları (L.mtPafta) sistem sırasıyla (yalıtım, ısıtma, soğutma, havalandırma, sıhhi), parça sırasıyla;
     öbür Mekanik paftaları (MEKTABLO, elle açılmış) yerinde kalır. layouts değişmeden yeni dizi döner; tesisat paftalarına f.no = MEK-01 … yazılır */
  const sirala = (layouts, mekMi) => {
    const L = (layouts || []).slice(), idx = L.map((q, i) => (q && q.mtPafta && mekMi(q) ? i : -1)).filter(i => i >= 0);
    const T = idx.map(i => L[i]).sort((a, b) => ((SIRA[a.mtPafta] ?? 9) - (SIRA[b.mtPafta] ?? 9)) || ((a.mtParca || 0) - (b.mtParca || 0)));
    idx.forEach((i, k) => { L[i] = T[k]; });
    T.forEach((q, k) => { q.f = Object.assign({}, q.f || {}, { no: 'MEK-' + String(k + 1).padStart(2, '0') }); });
    return L;
  };
  const api = { SIRA, ETIKET_MM, olcekBul, yerlestir, paftaAdi, sirala };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!C || !C.addCommand) return;
  const MT = C.MT; if (!MT) return;
  MT.paftaApi = api;

  /* ======================= PAFTALAR ======================= */
  const A = () => C.mimariPaftaApi;
  const binaKutu = () => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const e of MT.mahaller()) for (const p of e.pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return x0 === Infinity ? null : [x0, y0, x1, y1]; };
  /* bina ebatından pafta ölçeği (bir kez seçilir, bütün tesisat paftalarında aynı) */
  MT.paftaOlcek = () => { const ms = MT.mahaller(); const z = ms.length ? [Math.min(...ms.map(e => +e.z0 || 0)), Math.max(...ms.map(e => (+e.z0 || 0) + (+e.h || 3)))] : null;
    return olcekBul(A(), binaKutu(), z, C.antetGen ? C.antetGen() : 0); };
  const yaziMm = () => (MT.paftaPunto ? MT.paftaPunto() : 14) * 0.3528;
  const etiketW = s => { const h = yaziMm(); return (C.measureText ? C.measureText(String(s || ''), h) : String(s || '').length * h * 0.8) + 6; };
  /* bloklar: [{ vp (x, y, w, h hariç), w, h (kâğıt mm), grup }] → Mekanik paftaları (C.doc.layouts'a eklenir). Döner: [L] */
  MT.paftaKur = (tur, ad, baslik, bloklar) => {
    const Ap = A(); if (!Ap) return [];
    const bl = (bloklar || []).filter(b => b && b.w > 0 && b.h > 0).map(b => Object.assign({ etiket: !!(b.vp && b.vp.label) }, b, { etiketW: b.vp && b.vp.label ? etiketW(b.vp.label) : 0 }));
    if (!bl.length) return [];
    const Y = yerlestir(Ap, bl, { antetW: C.antetGen ? C.antetGen() : 0 }), n = Y.paftalar.length;
    return Y.paftalar.map((P, i) => {
      const gp = C.grpCur; C.grpCur = 'Mekanik'; const L = C.newLayout(paftaAdi(ad, i, n), P.kagit, 'L'); C.grpCur = gp;
      Object.assign(L, { grp: 'Mekanik', mtPafta: tur, mtParca: i, disPafta: 'Mekanik', size: 'OZEL', pw: P.pw, ph: P.ph, orient: 'L', noTitle: false, margin: Object.assign({}, Ap.PAFTA_R2.kenar), antetSutun: P.antet, kagit: P.kagit, vps: [] });
      L.f = Object.assign(L.f || {}, { proje: (L.f && L.f.proje) || C.doc.set.name || '', baslik: baslik + (n > 1 ? ` (${i + 1}/${n})` : '') });
      for (const q of P.vps) L.vps.push(Object.assign({}, bl[q.i].vp, { x: q.x, y: q.y, w: q.w, h: q.h }));
      L.f.olcek = C.paftaOlcekYazisi ? C.paftaOlcekYazisi(L) : ''; // antet canlı (layout.js); burada kayıt için
      if (P.tasan.length) C.warn(`${L.name}: ${P.tasan.length} çizim pafta yüksekliğine (${P.ph} mm) sığmıyor; paftada kırpılır.`);
      return L;
    });
  };
  /* Mekanik paftalarını sırala ve numarala (MEK-01 …) */
  MT.paftaNumarala = () => { C.doc.layouts = sirala(C.doc.layouts || [], L => (L.grp || 'Mekanik') === 'Mekanik'); };

  /* ======================= KOMUTLAR ======================= */
  C.addCommand(['MEKANIKDXF', 'MEKANIKPAFTADXF', 'MEKDXF'], 'Mekanik paftalarını AutoCAD için DXF olarak kaydeder: her pafta bir Layout sekmesi (antet ve ölçekli pencereleriyle), çizimler model alanında. Seçtiğiniz klasöre yazar; yanına DWG-YAP.bat koyar.', () => {
    if (!(C.doc.layouts || []).some(L => L.grp === 'Mekanik')) { C.warn('Mekanik paftası yok: önce Mekanik sekmesinden "Mekanik paftalar"ı çalıştırın.'); return; }
    return C.exportGroups(['Mekanik']);
  }, { noUndo: true });
  C.addCommand(['MEKPAFTALISTESI', 'MEKANIKPAFTALISTESI'], 'Mekanik pafta listesi: Mekanik grubundaki paftalar — SIRA NO, PAFTA NO, PAFTA ADI, ÖLÇEK; paftalardan canlı tablo ya da Excel (CSV).', async (I) => {
    const def = C.cmds.PAFTALISTESI; if (!def) { C.warn('Pafta listesi modülü yüklenmemiş.'); return; }
    const I2 = Object.assign({}, I, { str: async () => 'Mekanik' }); // grup sorusu: Mekanik
    return def.fn(I2, C);
  }, { noUndo: true });
  C.addCommand(['PAFTAELLE', 'PAFTAKORU'], 'Açık paftayı "elle düzeltildi" olarak işaretler (ya da işareti kaldırır): Mekanik paftalar yeniden üretilirken bu sistemin paftaları korunur.', async () => {
    const L = C.views && C.views.lay && C.currentView === 'layout' ? C.views.lay.cur() : null; if (!L) { C.warn('Önce işaretlenecek paftayı açın.'); return; }
    L.elle = !L.elle; C.changed(); C.emit('layouts');
    C.log(L.elle ? `${L.name}: elle düzeltildi olarak işaretlendi — otomatik paftalama bu paftaya${L.mtPafta ? ' ve aynı sistemin öbür paftalarına' : ''} dokunmaz.` : `${L.name}: işaret kaldırıldı — otomatik paftalama yeniden üretir.`);
  });

  /* ======================= ŞERİT: "Mekanik" sekmesi ======================= */
  const B = (cmd, t, i) => ({ cmd, t, i, big: true }), s = (cmd, t, i) => ({ cmd, t, i });
  /* "Mekanik" sekmesi ekipman kütüphanesinde (ekipman.js) zaten var ve kütüphane değişince yeniden kurulur: pafta panelleri sekmenin başına
     her çizimde (ribbon.render sarılır) eklenir; sekme yoksa Mimari'nin yanına açılır */
  const paneller = () => {
    const var_ = b => !!(C.cmds && C.cmds[b.cmd.split(' ')[0]]);
    return [
      ['Pafta', [B('TESISATPAFTA T', 'Mekanik paftalar', 'print'), B('MEKANIKDXF', 'Paftaları DXF kaydet', 'sheet'), B('DISIPLINDXF', 'Disiplin DXF dosyaları (her biri ayrı)', 'sheet'), s('BOLGEDUZENLE', 'Bölgeleri düzenle', 'array'), s('MEKPAFTALISTESI', 'Pafta listesi', 'table'), s('PAFTAELLE', 'Elle düzeltildi (koru)', 'prop'), s('TESISATCIKTI', 'Çıktı al (PDF)', 'print'), s('TESISATYAZI', 'Yazı boyutu', 'prop'), s('PERSPEKTIFPAFTA', '3B görünüş', 'iso')]],
      ['Sistem paftaları', [s('TESISATPAFTA Y', 'Isı yalıtımı', 'prop'), s('TESISATPAFTA I', 'Isıtma', 'prop'), s('TESISATPAFTA S', 'Soğutma', 'prop'), s('TESISATPAFTA H', 'Havalandırma', 'prop'), s('TESISATPAFTA W', 'Sıhhi tesisat', 'prop')]],
      ['Şema ve tablolar', [s('KOLONSEMASI', 'Kolon şeması', 'prop'), s('SOGUTMASEMASI', 'Soğutma şeması', 'prop'), s('ISIMERKEZISEMA', 'Akış şeması', 'pump'), s('ISIYALITIMDETAY', 'Yalıtım detayı', 'prop'), s('MEKTABLO', 'Ekipman tabloları', 'table')]],
      ['Denetim', [s('CAKISMA', 'Çakışma denetimi', 'prop'), s('DELIKAC', 'Geçiş delikleri', 'prop')]],
      ['Antet ve stil', [B('ANTET YUKLE', 'Antet yükle', 'sheet'), s('PAFTASTIL', 'Pafta stili', 'prop')]],
    ].map(([ad, bs]) => [ad, bs.filter(var_)]).filter(p => p[1].length);
  };
  const yerlestirSerit = Rb => { // Rb.tabs içinde Mekanik sekmesinin başında pafta panelleri; değişiklik olduysa true
    let T = Rb.tabs.find(t => t[0] === 'Mekanik');
    if (!T) { const i = Rb.tabs.findIndex(t => t[0] === 'Mimari'), j = Rb.tabs.findIndex(t => t[0] === 'Statik' || t[0] === 'Hesap'); T = ['Mekanik', []]; Rb.tabs.splice(i >= 0 ? i + 1 : (j >= 0 ? j : Rb.tabs.length), 0, T); }
    const nM = T[1].filter(p => p._mek).length; if (nM && T[1].slice(0, nM).every(p => p._mek)) return false; // pafta panelleri başta ve bitişik
    T[1] = T[1].filter(p => !p._mek); const P = paneller().map(p => Object.assign(p, { _mek: true })); T[1] = P.concat(T[1]); return true;
  };
  const serit = () => {
    const Rb = C.ribbon; if (!Rb || !Array.isArray(Rb.tabs) || !Rb.render) return false;
    if (!Rb._mekSar) { const r0 = Rb.render; Rb.render = function () { try { yerlestirSerit(Rb); } catch (er) { console.error('mekanik şerit', er); } const r = r0.apply(this, arguments);
      try { if (yerlestirSerit(Rb)) r0.apply(this, arguments); } catch (er) { console.error('mekanik şerit', er); } return r; }; Rb._mekSar = true; } // içteki sarmalayıcılar (pompa-foy.js) araya panel koyduysa yeniden diz
    Rb.render(); return true;
  };
  { let n = 0; const t = setInterval(() => { try { if (serit() || ++n > 40) clearInterval(t); } catch (er) { console.error('mekanik şerit', er); clearInterval(t); } }, 300); }
})(typeof window !== 'undefined' ? window.C : null);

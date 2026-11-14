/* ArıtmaCAD — KODLU MALZEME AÇILIMI (ayrı modül; pafta çizim stili "COKAL" iken etkin)
   Örnek proje (Çokal AAT paftaları): kesitte elemanın yanına yalnız kod yazılır (DÖ01, DU01 …); katmanların açılımı paftada
   "DÖŞEMELER" ve "DUVARLAR" başlıkları altında kutular hâlinde verilir:
       DÖ04                      ← kod: 1,4 kat büyük, altı çizili, renkli
       -  8 cm KİLİT PARKE TAŞI  ← tireli satırlar, büyük harf, kalınlık başta
       -  10 cm KUM SERİLMESİ
   Kodlar katmanlaşmaya göre verilir ve proje boyunca aynı kalır (aynı katmanlaşma → aynı kod): C.doc.set.acilimKod.
   Saf kısım (kod verme, satır biçimi, kaydırma) Node ile denenir: node test/acilim-kod.test.js */
(function (C) {
  'use strict';
  /* büyük harf (Türkçe); parantez içi olduğu gibi kalır — örnek projede "KATRAN BADANA (3 kat)", "GROBETON (10 cm)" */
  const buyukTR = s => String(s).split(/(\([^)]*\))/).map((p, i) => (i % 2 ? p : p.toLocaleUpperCase('tr-TR'))).join('');
  /* "Hazır beton, 40 cm" → "40 cm HAZIR BETON" (birim küçük kalır); kalınlıksız satır yalnız büyük harfe çevrilir */
  const satirBicim = s => { const m = /^(.*?),\s*(\d+(?:[.,]\d+)?)\s*cm\s*$/.exec(String(s).trim()); return m ? `${m[2]} cm ${buyukTR(m[1].trim())}` : buyukTR(String(s).trim()).replace(/(\d)\s*CM\b/g, '$1 cm').replace(/(\d)\s*MM\b/g, '$1 mm'); };
  /* uzun satırı kelime sınırından böl */
  const kaydir = (s, n) => { const out = []; let cur = ''; for (const w of String(s).split(/\s+/)) { if (cur && (cur + ' ' + w).length > n) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } if (cur) out.push(cur); return out; };
  /* kod: tür ('doseme' → DÖ, 'duvar' → DU) + sıra; kayıt: { 'DÖ': [imza, …], 'DU': [imza, …] } */
  const ONEK = { doseme: 'DÖ', duvar: 'DU' };
  const kodVer = (kayit, tur, lines) => { const on = ONEK[tur] || 'DÖ', L = kayit[on] || (kayit[on] = []), imza = (lines || []).join('|'); let i = L.indexOf(imza); if (i < 0) { L.push(imza); i = L.length - 1; } return on + String(i + 1).padStart(2, '0'); };
  /* aynı duvara tek kod (denetim 14.11.2026: Konya B-B'de sağ duvarda iki "DU01" üst üste — pencereler duvarı parçalara bölüyor, her parçaya kod konuyordu):
     bir kesitte aynı türde, aynı katmanlı (satırlar), aynı yanda ve yatayda 0,6 m'den yakın duvar etiketlerinden biri kalır (düşey ortadaki).
     L: [{ id, tur, side, lines, src: { s, z } }] → silinecek id kümesi */
  const tekDuvarKodu = L => { const at = new Set(), D = (L || []).filter(e => e.tur === 'duvar' && e.src), gr = [];
    for (const e of D) { const k = (e.lines || []).join('|') + '#' + (e.side || 1); let g = gr.find(q => q.k === k && Math.abs(q.s - e.src.s) < 0.6); if (!g) gr.push(g = { k, s: e.src.s, L: [] }); g.L.push(e); }
    for (const g of gr) { if (g.L.length < 2) continue; const z = g.L.map(e => +e.src.z).sort((p, q) => p - q), zm = (z[0] + z[z.length - 1]) / 2; let tut = g.L[0]; for (const e of g.L) if (Math.abs(e.src.z - zm) < Math.abs(tut.src.z - zm)) tut = e; for (const e of g.L) if (e !== tut) at.add(e.id); }
    return at; };
  const api = { satirBicim, kaydir, kodVer, ONEK, tekDuvarKodu };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!C || !C.T || !C.T.acilim) return;

  const M = C.M, T = C.T, { L, TX } = C.prim;
  const etkin = () => !!(C.pstil && C.pstil());
  const kayit = () => (C.doc.set.acilimKod = C.doc.set.acilimKod || {});
  const etiketKural = () => (C.cizimKural && C.cizimKural.MIMARI.acilim && C.cizimKural.MIMARI.acilim.etiket) || { cizgiRenk: 243, bosluk: 1.3, duvarTasma: 4.5, dosemeDik: 12, dosemeYatay: 2.3 };
  C.acilimEtiketKural = etiketKural;
  /* açılımın türü: kesitten otomatik gelenlerde e.tur; eskilerde ok doğrultusundan (yatay ok → duvar) */
  const turu = e => e.tur || (Math.abs((e.p[0] || 0) - (e.a[0] || 0)) > Math.abs((e.p[1] || 0) - (e.a[1] || 0)) * 3 ? 'duvar' : 'doseme');
  C.acilimKodu = e => kodVer(kayit(), turu(e), e.lines || []);
  C.acilimKodApi = api;
  /* kesitte: elemandan çıkan ince çizgi + yalnız kod (2,5 mm, YZ) */
  const p0 = T.acilim.prims;
  T.acilim.prims = e => {
    if (!etkin()) return p0(e);
    const ps = C.pstil(), th = C.annoH(ps.kodH), a = M.p3(e.a), p = M.p3(e.p), sd = e.side || (p[0] >= a[0] ? 1 : -1), kod = C.acilimKodu(e);
    /* Çokal R2: çizgi elemandan dik çıkar, kodun hizasında yatay döner (duvarda yalnız yatay), kod çizgiden 1,3 mm sonra başlar; çizgi rengi 243 (kural tablosu → acilim.etiket) */
    const Ek = etiketKural(), o = { lw: 13, color: Ek.cizgiRenk }, kose = [a[0], p[1], 0], out = [];
    if (Math.abs(a[1] - p[1]) > 1e-6) out.push(L(a, kose, o)); if (Math.abs(a[0] - p[0]) > 1e-6) out.push(L(kose, p, o));
    out.push(TX([p[0] + sd * C.annoH(Ek.bosluk), p[1], 0], th, kod, 0, sd > 0 ? 'ML' : 'MR', { st: ps.yazi }));
    return out;
  };
  { const i0 = T.acilim.info; T.acilim.info = e => (etkin() ? C.acilimKodu(e) + ' · ' : '') + i0(e); }

  /* ÜNİTELER (kum tutucu, anaerobik …): katmanlar 3B'den okunamaz (tek gövde); ünite kendi açılımlarını verir:
     T[tip].acilimlar(e) → [{ tur: 'duvar' | 'doseme', lines: [...], kutular: [[x0, y0, x1, y1] (yerel), ...], z0, z1 }] — sıra kod sırasını belirler.
     Kesit çizgisi bir kutudan geçiyorsa o elemanın yanına kod konur (kod başına kesitte bir kez, en uzun kesilen yerde). */
  const uniteAcilim = m => {
    const ps = C.pstil(), k = C.doc.set.anno / 1000, W = q => [m.q0[0] + q[0], m.q0[1] + q[1], 0], adim = Math.max(0.02, (m.ub[2] - m.ub[0]) / 400), orta = (m.ub[0] + m.ub[2]) / 2; let n = 0;
    for (const e of C.doc.ents) { const tp = T[e.type]; if (!tp || !tp.acilimlar || e.gv) continue; const ly = C.layer(e.layer); if (ly && ly.on === false) continue;
      let L0; try { L0 = tp.acilimlar(e) || []; } catch (er) { console.error('ünite açılımı', er); continue; }
      const rot = (e.rot || 0) * Math.PI / 180, cs = Math.cos(rot), sn = Math.sin(rot), yerel = P => { const dx = P[0] - e.o[0], dy = P[1] - e.o[1]; return [dx * cs + dy * sn, -dx * sn + dy * cs]; };
      for (const it of L0) kodVer(kayit(), it.tur, it.lines); // kod sırası ünitenin verdiği sırada
      for (const it of L0) { let en = null, cur = null;
        for (let s = m.ub[0]; s <= m.ub[2] + 1e-9; s += adim) { const q = yerel([m.a[0] + m.u[0] * s, m.a[1] + m.u[1] * s]), ic = it.kutular.some(b => q[0] >= b[0] - 1e-6 && q[0] <= b[2] + 1e-6 && q[1] >= b[1] - 1e-6 && q[1] <= b[3] + 1e-6);
          if (ic) { if (!cur) cur = { s0: s, s1: s }; else cur.s1 = s; } if ((!ic || s + adim > m.ub[2]) && cur) { if (!en || cur.s1 - cur.s0 > en.s1 - en.s0) en = cur; cur = null; } }
        if (!en) continue; const sm = (en.s0 + en.s1) / 2, sd = sm < orta ? -1 : 1, duvar = it.tur === 'duvar';
        const za = duvar ? Math.min(it.z1 - 0.3, (it.z0 + it.z1) / 2 + 0.6) : it.z1 - 0.005, a = W([sm, za]);
        const Ek = etiketKural(), p = duvar ? [a[0] + (en.s1 - en.s0) / 2 + Ek.duvarTasma * k, a[1], 0] : [a[0] + Ek.dosemeYatay * k, a[1] + Ek.dosemeDik * k, 0]; /* Çokal R2: kod elemanın yanında */
        C.add(C.newEnt('acilim', { a, p, lines: it.lines.slice(), tur: it.tur, side: 1, src: { k: m.nm, s: sm, z: za, unite: e.id }, dis: 'Mimari', layer: (C.ensureLayer('MALZEME_ACILIM', 7, 'CONTINUOUS', 18), 'MALZEME_ACILIM') })); n++; } }
    void ps; return n;
  };
  if (C.malzemeAcilimOto) { const o0 = C.malzemeAcilimOto; C.malzemeAcilimOto = function (m) { const i0 = new Set(C.doc.ents.map(e => e.id)); let n = o0.apply(this, arguments) || 0; try { if (etkin()) n += uniteAcilim(m); } catch (er) { console.error('ünite açılımı', er); }
    if (etkin()) try { const at = tekDuvarKodu(C.doc.ents.filter(e => e.type === 'acilim' && !i0.has(e.id))); if (at.size) { C.doc.ents = C.doc.ents.filter(e => !at.has(e.id)); n -= at.size; } } catch (er) { console.error('açılım tekilleme', er); } // aynı duvara tek kod
    return n; }; }
  /* açılım tablosunun içeriği: kullanılan kodlar, tür sırasıyla */
  C.acilimTabloVeri = () => {
    const gor = new Map(); for (const e of C.doc.ents) if (e.type === 'acilim' && (e.lines || []).length) { const k = C.acilimKodu(e); if (!gor.has(k)) gor.set(k, { kod: k, tur: turu(e), satir: (e.lines || []).map(satirBicim) }); }
    const hepsi = [...gor.values()].sort((x, y) => x.kod.localeCompare(y.kod, 'tr'));
    return [{ baslik: 'DÖŞEMELER', kutular: hepsi.filter(k => k.tur === 'doseme') }, { baslik: 'DUVARLAR', kutular: hepsi.filter(k => k.tur !== 'doseme') }].filter(g => g.kutular.length);
  };
  if (window.DIL) window.DIL.ekle('en', 'English', [['DÖŞEMELER', 'FLOORS'], ['DUVARLAR', 'WALLS'], ['MALZEME AÇILIMLARI', 'MATERIAL LEGEND']]);
})(typeof window !== 'undefined' ? window.C : null);

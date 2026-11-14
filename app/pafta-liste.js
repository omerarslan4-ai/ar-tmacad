/* ArıtmaCAD — PAFTA LİSTESİ ve ANTETTE ÖLÇEK (kullanıcı istekleri 14.11.2026)
   1) Antetteki ölçek: paftadaki bütün pafta pencerelerinin ölçekleri, tekrarsız; ana ölçek (kâğıtta en çok yer kaplayan) önce, sonra öbürleri
      paydası büyükten küçüğe (ör. "1/50, 1/20, 1/10, 1/5"). Canlı: pencere eklenip çıkınca antet yeniden çizilirken güncellenir (layout.js → scaleTxt).
      Elle verilmiş ölçek (L.f.olcekElle) varsa o yazılır; otomatik alan ({OLCEK} yer tutucusu ve programın varsayılan anteti) her zaman canlıdır.
   2) PAFTALISTESI: bir pafta grubundaki (varsayılan Mimari) paftaların listesi — SIRA NO | PAFTA NO | PAFTA ADI | ÖLÇEK; paftalardan canlı tablo nesnesi
      (paftaliste), modelde ya da bir paftada tıklanan yere; Excel için CSV (noktalı virgül, UTF-8 BOM) indirme. Çokal R2 örneklerinde pafta listesi
      bulunmadı (10-İdari, 6-Blower, 1-Kaba-İnce, 5-Çamursuzlaştırma DXF'lerinde "PAFTA LİSTESİ / ÇİZİM LİSTESİ" yok): biçim mahal listesi tablosundaki gibi
      (başlık 4 mm, öteki yazılar 2 mm; MIMARI.mahalListesi).
   Saf kısım Node ile denenir: node test/pafta-liste.test.js */
(function (C) {
  'use strict';

  /* ======================= SAF KISIM ======================= */
  const olcekAd = s => '1/' + (Math.round(s * 100) / 100);
  /* vps: [{ scale, w, h }] → "1/50, 1/20, 1/10" (ana ölçek önce) ya da "-" */
  const olcekYazisi = vps => {
    const A = new Map(); for (const v of vps || []) { const s = +v.scale; if (!(s > 0)) continue; A.set(s, (A.get(s) || 0) + Math.max(0, (+v.w || 0) * (+v.h || 0))); }
    if (!A.size) return '-';
    const ana = [...A.entries()].sort((p, q) => q[1] - p[1] || q[0] - p[0])[0][0];
    return [ana, ...[...A.keys()].filter(s => s !== ana).sort((a, b) => b - a)].map(olcekAd).join(', ');
  };
  /* paftanın antetteki ölçeği: elle verilmişse o, yoksa pencerelerden */
  const paftaOlcegi = L => (L && L.f && String(L.f.olcekElle || '').trim()) || olcekYazisi(L ? L.vps : []);
  /* pafta no ve adı: MIMARIPAFTA adı "MİMARİ-01 KAT PLANLARI" → no "MİMARİ-01", ad "KAT PLANLARI"; değilse antet no (f.no) ve başlık / düzen adı */
  const noAd = L => { const m = /^(\S+-\d+)\s+(.+)$/.exec(String(L.name || '').trim()); if (m) return { no: m[1], ad: m[2] };
    const f = L.f || {}; return { no: f.no || '', ad: f.baslik || L.name || '' }; };
  /* layouts → satırlar [{ sira, no, ad, olcek }]; grp verilirse yalnız o gruptaki paftalar (L.grp) */
  const satirlar = (layouts, grp) => (layouts || []).filter(L => L && (!grp || String(L.grp || '') === grp)).map((L, i) => Object.assign({ sira: i + 1 }, noAd(L), { olcek: paftaOlcegi(L) }));
  /* CSV (Excel: noktalı virgül ayraç, UTF-8 BOM) */
  const csv = (rows, baslik) => { const q = v => { const s = String(v == null ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const L = []; if (baslik) L.push(q(baslik)); L.push(['SIRA NO', 'PAFTA NO', 'PAFTA ADI', 'ÖLÇEK'].join(';')); for (const r of rows) L.push([r.sira, r.no, r.ad, r.olcek].map(q).join(';')); return '﻿' + L.join('\r\n') + '\r\n'; };
  const api = { olcekYazisi, paftaOlcegi, satirlar, csv, noAd };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!C) return;
  C.paftaListeApi = api;
  C.paftaOlcekYazisi = paftaOlcegi; // layout.js (antet) ve pafta listesi aynı fonksiyondan

  /* ======================= TABLO NESNESİ (paftalardan canlı) ======================= */
  const M = C.M, { L: LN, TX } = C.prim;
  const ML = () => { try { return (C.cizimKural && C.cizimKural.MIMARI && C.cizimKural.MIMARI.mahalListesi) || {}; } catch (er) { return {}; } };
  C.T.paftaliste = {
    label: 'Pafta listesi',
    prims: e => {
      const R = satirlar(C.doc.layouts, e.grp || null), k = (+e.sc || C.doc.set.anno) / 1000, o = M.p3(e.p), out = [], tx = s => C.txL ? C.txL(s) : s, S = ML();
      const hB = (S.baslikMm || 4) * k, h = (S.yaziMm || 2) * k, mw = s => C.measureText ? C.measureText(tx(String(s)), h) : String(s).length * h * 0.75;
      const X = (x, y) => [o[0] + x, o[1] - y, 0], L = (x1, y1, x2, y2) => out.push(LN(X(x1, y1), X(x2, y2))), T = (x, y, hh, s, al, rol) => out.push(TX(X(x, y), hh, s, 0, al, Object.assign({ st: S.baslikStil || 'YZ' }, rol ? { rol } : {})));
      const wS = 16 * k, wN = Math.max(28 * k, Math.max(0, ...R.map(r => mw(r.no))) + 5 * k), wA = Math.max(70 * k, Math.max(0, ...R.map(r => mw(r.ad))) + 6 * k), wO = Math.max(26 * k, Math.max(0, ...R.map(r => mw(r.olcek))) + 5 * k);
      const W = wS + wN + wA + wO, hT = 10 * k, hH = 7 * k, hR = 6.5 * k, H = hT + hH + Math.max(1, R.length) * hR, xs = [0, wS, wS + wN, wS + wN + wA, W];
      L(0, 0, W, 0); L(0, H, W, H); L(0, 0, 0, H); L(W, 0, W, H); L(0, hT, W, hT); L(0, hT + hH, W, hT + hH);
      for (let i = 1; i < 4; i++) L(xs[i], hT, xs[i], H);
      T(W / 2, hT * 0.7, hB, 'PAFTA LİSTESİ' + (e.grp ? ' — ' + String(e.grp).toLocaleUpperCase('tr') : ''), 'C', 'baslik');
      ['SIRA NO', 'PAFTA NO', 'PAFTA ADI', 'ÖLÇEK'].forEach((s, i) => T((xs[i] + xs[i + 1]) / 2, hT + hH * 0.68, h, s, 'C'));
      R.forEach((r, i) => { const y = hT + hH + (i + 1) * hR; if (i < R.length - 1) L(0, y, W, y); const yt = y - hR * 0.32;
        T((xs[0] + xs[1]) / 2, yt, h, String(r.sira), 'C'); T(xs[1] + 2 * k, yt, h, r.no, 'L'); T(xs[2] + 2 * k, yt, h, r.ad, 'L'); T((xs[3] + xs[4]) / 2, yt, h, r.olcek, 'C'); });
      if (!R.length) T(xs[2] + 2 * k, hT + hH + hR * 0.68, h, 'Bu grupta pafta yok', 'L');
      return out;
    },
    xf: (e, X) => { e.p = X.p(M.p3(e.p)); },
    snaps: e => [{ p: M.p3(e.p), k: 'end' }],
    info: e => `Pafta listesi · ${satirlar(C.doc.layouts, e.grp || null).length} pafta${e.grp ? ' (' + e.grp + ')' : ''} · paftalardan canlı`,
  };
  /* paftalar değişince tablo yeniden çizilsin */
  let son = ''; const yenile = () => { if (!C.doc || !C.doc.ents.some(e => e.type === 'paftaliste')) return; const k = JSON.stringify((C.doc.layouts || []).map(L => [L.name, L.grp, L.f && L.f.no, L.f && L.f.olcekElle, (L.vps || []).map(v => [v.scale, Math.round(v.w), Math.round(v.h)])]));
    if (k === son) return; son = k; for (const e of C.doc.ents) if (e.type === 'paftaliste') delete e._c; if (C.views) for (const w of Object.values(C.views)) if (w && 'dirty' in w) w.dirty = true; };
  if (C.on) { C.on('layouts', yenile); C.on('changeIdle', yenile); }

  const indir = (txt, ad) => { const b = new Blob([txt], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = ad; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  const ensL = ad => { if (C.ensureLayer) C.ensureLayer(ad, 7, 'CONTINUOUS', 25); return ad; };
  C.addCommand(['PAFTALISTESI', 'PAFTALISTE', 'SHEETLIST'], 'Pafta listesi: bir pafta grubundaki (varsayılan Mimari) paftalar — SIRA NO, PAFTA NO, PAFTA ADI, ÖLÇEK; paftalardan canlı tablo, modelde ya da paftada tıklanan yere. PAFTALISTESI [Y = yerleştir | C = Excel (CSV) indir] [grup]', async (I) => {
    const op = await I.kw('Pafta listesi', [['Y', 'Tabloyu yerleştir'], ['C', 'Excel (CSV) indir']], 'Y'); if (!op) return;
    const gruplar = [...new Set((C.doc.layouts || []).map(L => L.grp).filter(Boolean))], g0 = gruplar.includes('Mimari') ? 'Mimari' : (C.grpCur && gruplar.includes(C.grpCur) ? C.grpCur : (gruplar[0] || ''));
    let grp = gruplar.length > 1 ? await I.str('Pafta grubu (' + gruplar.join(', ') + '; boş = hepsi)', g0, { whole: false }) : g0; if (grp == null) return; grp = String(grp).trim();
    const gm = gruplar.find(q => C.up(q) === C.up(grp)) || (grp ? grp : null), R = satirlar(C.doc.layouts, gm);
    if (!R.length) { C.warn('Bu grupta pafta yok' + (gm ? ` (${gm})` : '') + '.'); return; }
    if (op === 'C') { indir(csv(R, 'PAFTA LİSTESİ' + (gm ? ' — ' + gm : '')), `pafta-listesi${gm ? '-' + C.ascii(gm).toLowerCase() : ''}.csv`); C.log(`Pafta listesi indirildi (${R.length} pafta, Excel'de açılır).`); return; }
    const p = await I.pt('Tablonun sol üst köşesi (modelde ya da paftada)'); if (!p || typeof p === 'string') return;
    C.undoStack.push(C.snapshot()); // komut noUndo (paftada çalışsın diye: ui.js model alanına geçirmez), geri alma burada
    const sc = +C.doc.set.anno || 50, lay = C.currentView === 'layout' && C.views && C.views.lay ? C.views.lay.cur() : null;
    if (!lay) { C.add(C.newEnt('paftaliste', { p: M.p3(p), grp: gm, sc, layer: ensL('PAFTA_LISTESI') })); C.changed(); C.log(`Pafta listesi: ${R.length} pafta (paftalar değişince kendiliğinden güncellenir).`); return; }
    /* paftaya: tablo modelde boş bir yere (çizimlerin sağına) konur, paftada tıklanan yere ölçekli pencereyle gösterilir */
    const bb = C.extents(C.doc.ents) || [0, 0, 0, 0], gv = 'PAFTALISTE_' + Date.now().toString(36), q = [bb[2] + 20, bb[3], 0];
    const e = C.add(C.newEnt('paftaliste', { p: q, grp: gm, sc, layer: ensL('PAFTA_LISTESI'), gv })); delete e.sp; delete e._c;
    const b = C.bbox(e), k = 1000 / sc, w = (b[2] - b[0]) * k + 2, h = (b[3] - b[1]) * k + 2;
    lay.vps.push({ x: p[0] - 1, y: p[1] - h + 1, w, h, cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2, scale: sc, gvOnly: gv, frame: { on: false }, lock: true, paftaListesi: true });
    C.changed(); C.emit('layouts'); C.log(`Pafta listesi paftaya konuldu (${R.length} pafta, 1/${sc}; paftalar değişince güncellenir).`);
  }, { noUndo: true });
})(typeof window !== 'undefined' ? window.C : null);

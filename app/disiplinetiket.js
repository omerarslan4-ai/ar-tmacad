/* ArıtmaCAD — DİSİPLİNE GÖRE ELEMAN ETİKETLERİ
   Perde / kolon / kiriş etiketi paftanın disiplinine göre değişir (Tasarım planında eleman numarası kalır):
     Statik  : P1 (40) · S1 40/40 · K101 (30/50)          — eleman no + kesit
     Mimari  : 40 cm BA PERDE · 19 cm TUĞLA DUVAR        — malzeme ve kalınlık (numarasız duvarlar dahil); kolon / kiriş yazılmaz
     Mekanik, Elektrik : yazılmaz
   Biçim alanları: {no} {t} (perde kalınlığı cm) {b} {h} (kolon / kiriş kesiti cm) {malz} (BETONARME, TUĞLA …) {malzK} (BA PERDE, TUĞLA DUVAR …) {beton}
   Komut: ELEMANETIKET (disiplin → eleman → biçim; "-" = yazma). */
(function (C) {
  'use strict';
  const M = C.M, RAD = Math.PI / 180, { TX } = C.prim;
  const VARS = {
    Statik: { P: '{no} ({t})', S: '{no} {b}/{h}', K: '{no} ({b}/{h})' },
    Mimari: { P: '{t} cm {malzK}', S: '', K: '' },
    Mekanik: { P: '', S: '', K: '' },
    Elektrik: { P: '', S: '', K: '' },
  };
  const TIP = { perde: 'P', kolon: 'S', kiris: 'K' };
  const AYAR = () => { const s = C.doc.set; const o = s.elemanEtiket || {}; for (const d of Object.keys(VARS)) o[d] = Object.assign({}, VARS[d], o[d] || {}); s.elemanEtiket = o; return o; };
  const MK = { beton: 'BA PERDE', tugla: 'TUĞLA DUVAR', gazbeton: 'GAZBETON DUVAR', briket: 'BRİKET DUVAR' };
  const cm = v => String(Math.round(v * 100));
  const alanlar = e => {
    const malz = e.malz || 'beton', MZ = C._ins && C._ins.MALZ;
    const o = { no: e.no || '', beton: e.beton || 'C30/37', malz: ((MZ && MZ[malz] && MZ[malz].ad) || malz).toLocaleUpperCase('tr'), malzK: MK[malz] || malz.toLocaleUpperCase('tr') };
    if (e.type === 'perde') o.t = cm(Math.max(+e.tb || 0.3, e.tt != null && e.tt !== '' ? +e.tt : 0));
    if (e.type === 'kolon') { if (e.sek === 'D') { o.b = 'Ø' + cm(+e.D || 0.5); o.h = ''; } else { o.b = cm(+e.b || 0.4); o.h = cm(+e.d || 0.4); } }
    if (e.type === 'kiris') { o.b = cm(+e.bw || 0.3); o.h = cm(+e.hb || 0.5); }
    return o;
  };
  const yaz = (pat, e) => { if (!pat) return ''; const o = alanlar(e); let s = pat.replace(/\{(\w+)\}/g, (_, k) => (o[k] != null ? o[k] : '')); s = s.replace(/\(\s*\)/g, '').replace(/\/\s*$/, '').replace(/\s+/g, ' ').trim(); if (pat.includes('{no}') && !o.no) return ''; return s; };
  /* etiket konumu (elemanno.js ile aynı yerleşim) */
  const okunur = a => { let r = a; while (r > 90 + 1e-6) r -= 180; while (r <= -90 + 1e-6) r += 180; return r; };
  const perdeEksen = e => { const P = e.pts || []; let best = null, bl = -1; for (let i = 1; i < P.length; i++) { const l = M.dist2(P[i - 1], P[i]); if (l > bl) { bl = l; best = [P[i - 1], P[i]]; } } return best; };
  const etiketPrim = (e, s) => {
    const h = C.annoH(2.5);
    if (e.type === 'kolon') { const b = (e.sek === 'D' ? +e.D || 0.5 : Math.max(+e.b || 0.4, +e.d || 0.4)) / 2; return TX([e.p[0] + b + h * 0.3, e.p[1] - b - h * 1.2, 0], h, s, 0, 'L'); }
    const sg = e.type === 'kiris' ? [e.a, e.b] : perdeEksen(e); if (!sg) return null;
    const u = M.norm([sg[1][0] - sg[0][0], sg[1][1] - sg[0][1], 0]), n = [-u[1], u[0]], a0 = Math.atan2(u[1], u[0]) / RAD, a = okunur(a0);
    const t = e.type === 'kiris' ? (+e.bw || 0.3) / 2 : Math.max(+e.tb || 0.3, +e.tt || 0.3) / 2, off = t + h * 0.6, yon = Math.abs(a - a0) > 1 ? -1 : 1;
    const m = [(sg[0][0] + sg[1][0]) / 2, (sg[0][1] + sg[1][1]) / 2];
    return TX([m[0] + n[0] * off * yon, m[1] + n[1] * off * yon, 0], h, s, a * RAD, 'C');
  };
  const disOfVp = vp => { const L = (C.doc.layouts || []).find(X => (X.vps || []).includes(vp)); if (!L) return null; const g = String(L.grp || vp.disiplin || ''); return /stat/i.test(g) ? 'Statik' : /m[iİı]mar/i.test(g) ? 'Mimari' : /mekan/i.test(g) ? 'Mekanik' : /elekt/i.test(g) ? 'Elektrik' : null; };
  const yardimci = e => e.type === 'perde' && (e.temel || e.kicker || e.parapet || e.ayak);
  {
    const v0 = C.vpPrims;
    C.vpPrims = function (vp, cb) {
      const d = vp ? disOfVp(vp) : null; if (!d) return v0.apply(this, arguments);
      const A = AYAR()[d], sabit = (C.doc.set.elemanNo || {}).goster !== false;
      return v0.call(this, vp, (e, pr) => {
        const k = TIP[e && e.type]; if (!k || yardimci(e)) return cb(e, pr);
        const coklu = e.type === 'perde' && Array.isArray(e.noK) && e.noK.length > 1 && C.perdeKenarlari, adlar = new Set(coklu ? e.noK : [e.no]);
        let out = e.no ? pr.filter(p => !(p.k === 'TX' || p.k === 'T') || !adlar.has(p.s)) : pr; // varsayılan numara etiketi çıkar
        if (coklu && sabit && A[k]) { const h = C.annoH(2.5); for (const kk of C.perdeKenarlari(e)) { if (!kk.no || kk.L < 0.3) continue; const s = yaz(A[k], Object.assign({}, e, { no: kk.no })); if (!s) continue; const u = M.norm([kk.b[0] - kk.a[0], kk.b[1] - kk.a[1], 0]), n = [-u[1], u[0]], a0 = Math.atan2(u[1], u[0]) / RAD, a = okunur(a0), sg = Math.abs(a - a0) > 1 ? -1 : 1, off = kk.t / 2 + h * 0.6, m = [(kk.a[0] + kk.b[0]) / 2, (kk.a[1] + kk.b[1]) / 2]; out = out.concat([TX([m[0] + n[0] * off * sg, m[1] + n[1] * off * sg, 0], h, s, a * RAD, 'C')]); } }
        else { const s = sabit ? yaz(A[k], e) : ''; if (s) { const t = etiketPrim(e, s); if (t) out = out.concat([t]); } }
        cb(e, out);
      });
    };
  }
  C.elemanEtiketYaz = (e, dis) => yaz(AYAR()[dis] && AYAR()[dis][TIP[e.type]], e);

  C.addCommand(['ELEMANETIKET', 'DISIPLINETIKET'], 'Paftalarda perde / kolon / kiriş etiketinin disipline göre biçimi. Alanlar: {no} {t} {b} {h} {malz} {malzK} {beton}; "-" = yazma. Varsayılan: Statik "P1 (40)", Mimari "40 cm BA PERDE"', async (I) => {
    const A = AYAR();
    const d = await I.kw('Disiplin', [['Statik', 'Statik'], ['Mimari', 'Mimari'], ['Mekanik', 'Mekanik'], ['Elektrik', 'Elektrik'], ['VARSAYILAN', 'Hepsini varsayılana döndür']], 'Mimari'); if (!d) return;
    if (d === 'VARSAYILAN') { C.doc.set.elemanEtiket = null; AYAR(); C.changed(); C.emit('layouts'); C.log('Etiket biçimleri varsayılana döndü.'); return; }
    for (const [k, ad] of [['P', 'Perde / duvar'], ['S', 'Kolon'], ['K', 'Kiriş']]) {
      const v = await I.str(`${d} — ${ad} etiketi (şimdi: "${A[d][k] || '-'}", "-" = yazma)`, A[d][k] || '-'); if (v == null) return;
      A[d][k] = v.trim() === '-' ? '' : v.trim();
    }
    C.changed(); C.emit('layouts'); if (C.views && C.views.lay) C.views.lay.dirty = true;
    C.log(`${d} etiketleri: perde "${A[d].P || '—'}", kolon "${A[d].S || '—'}", kiriş "${A[d].K || '—'}".`);
  }, { noUndo: true });
})(window.C);

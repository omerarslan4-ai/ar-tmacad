/* ArıtmaCAD — ELEMAN NUMARALARI (mimari ve statik projeler için)
   Perde P1, P2 …  Kolon S1, S2 …  Kiriş K101, K102 … (kat no + sıra). Biçimler ayarlanabilir: {n} sıra, {nn} iki haneli sıra, {k} kat no.
   Numara nesnenin kendisinde (e.no) durur: planda (ve paftalarda) etiket olarak görünür, özellikler panelinde düzenlenir,
   statik hesap ve metrajlarda kullanılır. Sıralama planda üstten alta, soldan sağa; kat, eleman taban kotundan bulunur.
   Yeni çizilen elemanlara otomatik sıradaki numara verilir (ELEMANNOAYAR ile kapatılabilir).
   Komutlar: NUMARALA [TUMU|PERDE|KOLON|KIRIS] [YENIDEN|EKSIK], ELEMANNOAYAR, ELEMANNOGOSTER */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, RAD = Math.PI / 180, { TX } = C.prim;
  const TIP = { perde: 'P', kolon: 'S', kiris: 'K' }, AD = { perde: 'Perde', kolon: 'Kolon', kiris: 'Kiriş' };
  const AYAR = () => { const s = C.doc.set; s.elemanNo = Object.assign({ P: 'P{n}', S: 'S{n}', K: 'K{k}{nn}', oto: true, goster: true }, s.elemanNo || {}); return s.elemanNo; };
  const uygun = e => e && TIP[e.type] && !(e.type === 'perde' && (e.temel || e.kicker || e.parapet || e.ayak)) && (e.type !== 'perde' || (e.malz || 'beton') === 'beton');

  /* geometri yardımcıları */
  const p2 = p => [p[0], p[1]];
  const perdeEksen = e => { const P = e.pts || []; let best = null, bl = -1; for (let i = 1; i < P.length; i++) { const l = M.dist2(P[i - 1], P[i]); if (l > bl) { bl = l; best = [P[i - 1], P[i]]; } } return best; };
  const merkez = e => {
    if (e.type === 'kolon') return p2(e.p || [0, 0]);
    if (e.type === 'kiris') return [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2];
    const s = perdeEksen(e); return s ? [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2] : [0, 0];
  };
  const taban = e => (e.type === 'kiris' ? (+e.zt || 0) - (+e.hb || 0.5) : +e.z0 || 0);
  const katlar = () => { const zs = [...new Set(C.doc.ents.filter(e => uygun(e) && e.type !== 'kiris').map(e => Math.round(taban(e) * 10) / 10))].sort((a, b) => a - b), out = []; for (const z of zs) if (!out.length || z - out[out.length - 1] > 1.0) out.push(z); return out; };
  const katNo = (e, ks) => { const z = e.type === 'kiris' ? (+e.zt || 0) - 0.05 : taban(e); let k = 0; for (let i = 0; i < ks.length; i++) if (z >= ks[i] - (e.type === 'kiris' ? 0 : 0.5)) k = i; return k + 1; };
  const bicim = (pat, n, k) => pat.replace('{nn}', String(n).padStart(2, '0')).replace('{n}', String(n)).replace('{k}', String(k));

  /* perde kenarları (kapalı / çok parçalı perde): eksen çizgileri; e.noK[i] i. kenarın adı */
  const kenarlar = e => { const I = C._ins; if (!I || !I.segFrames || !I.faceOffs || e.type !== 'perde') return []; const F = I.faceOffs(e), c = (F.lB + F.rB) / 2; return I.segFrames(e).map(sf => ({ i: sf.i, a: [sf.a[0] + sf.nn[0] * c, sf.a[1] + sf.nn[1] * c], b: [sf.b[0] + sf.nn[0] * c, sf.b[1] + sf.nn[1] * c], L: sf.L, t: F.tb })); };
  C.perdeKenarlari = e => { const ks = kenarlar(e); return ks.map(k => Object.assign(k, { no: (e.noK && e.noK[k.i]) || e.no || '' })); };
  /* ================= ETİKET ================= */
  const okunur = a => { let r = a; while (r > 90 + 1e-6) r -= 180; while (r <= -90 + 1e-6) r += 180; return r; };
  const etiket = e => {
    if (!e.no || AYAR().goster === false) return null;
    const h = C.annoH(2.5);
    if (e.type === 'perde' && Array.isArray(e.noK) && e.noK.length > 1) return C.perdeKenarlari(e).filter(k => k.no && k.L > 0.3).map(k => { const u = M.norm([k.b[0] - k.a[0], k.b[1] - k.a[1], 0]), n = [-u[1], u[0]], a0 = Math.atan2(u[1], u[0]) / RAD, a = okunur(a0), sg = Math.abs(a - a0) > 1 ? -1 : 1, off = k.t / 2 + h * 0.6, m = [(k.a[0] + k.b[0]) / 2, (k.a[1] + k.b[1]) / 2]; return TX([m[0] + n[0] * off * sg, m[1] + n[1] * off * sg, 0], h, k.no, a * RAD, 'C'); });
    if (e.type === 'kolon') { const b = (e.sek === 'D' ? +e.D || 0.5 : Math.max(+e.b || 0.4, +e.d || 0.4)) / 2; return TX([e.p[0] + b + h * 0.3, e.p[1] - b - h * 1.2, 0], h, e.no, 0, 'L'); }
    const s = e.type === 'kiris' ? [e.a, e.b] : perdeEksen(e); if (!s) return null;
    const u = M.norm([s[1][0] - s[0][0], s[1][1] - s[0][1], 0]), n = [-u[1], u[0]], a = okunur(Math.atan2(u[1], u[0]) / RAD);
    const t = e.type === 'kiris' ? (+e.bw || 0.3) / 2 : Math.max(+e.tb || 0.3, +e.tt || 0.3) / 2;
    const off = t + h * 0.6, m = merkez(e), sg = Math.abs(okunur(a) - Math.atan2(u[1], u[0]) / RAD) > 1 ? -1 : 1;
    return TX([m[0] + n[0] * off * sg, m[1] + n[1] * off * sg, 0], h, e.no, a * RAD, 'C');
  };
  for (const ty of Object.keys(TIP)) {
    const d = T[ty]; if (!d) continue;
    const p0 = d.prims; d.prims = e => { const out = p0(e); const tx = etiket(e); return tx ? out.concat(Array.isArray(tx) ? tx : [tx]) : out; };
    const i0 = d.info; if (i0) d.info = e => (Array.isArray(e.noK) && e.noK.length > 1 ? [...new Set(e.noK)].join(', ') + ' · ' : e.no ? e.no + ' · ' : '') + i0(e);
    const F = C.PROPFIELDS && C.PROPFIELDS[ty]; if (Array.isArray(F) && !F.some(f => f[0] === 'no')) F.unshift(['no', 'Eleman no', 's']);
  }

  /* ================= NUMARALAMA ================= */
  const sirala = xs => xs.map(e => ({ e, m: merkez(e) })).sort((a, b) => (Math.abs(a.m[1] - b.m[1]) > 0.5 ? b.m[1] - a.m[1] : a.m[0] - b.m[0])).map(o => o.e);
  C.elemanNumarala = (tipler, yeniden) => {
    const A = AYAR(), ks = katlar(); let n = 0;
    for (const ty of tipler) {
      const pat = A[TIP[ty]] || (TIP[ty] + '{n}'), perKat = pat.includes('{k}');
      const xs = C.doc.ents.filter(e => e.type === ty && uygun(e) && (yeniden || !e.no || (ty === 'perde' && !Array.isArray(e.noK) && kenarlar(e).length > 1)));
      const gruplar = new Map(); for (const e of xs) { const k = perKat ? katNo(e, ks) : 0; if (!gruplar.has(k)) gruplar.set(k, []); gruplar.get(k).push(e); }
      for (const [k, g] of gruplar) {
        const kul = new Set(yeniden ? [] : C.doc.ents.filter(e => e.type === ty && e.no && !g.includes(e) && (!perKat || katNo(e, ks) === k)).map(e => e.no));
        let i = 1;
        if (ty === 'perde') { // her kenar ayrı perde: önce uzunlar, sonra kısalar (aynı boyda yukarıdan aşağı, soldan sağa)
          if (!yeniden) for (const x of C.doc.ents) if (x.type === 'perde' && Array.isArray(x.noK)) x.noK.forEach(q => q && kul.add(q));
          const bir = g.flatMap(e => { const ks = kenarlar(e); return ks.length > 1 ? ks.map(kk => ({ e, kk, L: kk.L, m: [(kk.a[0] + kk.b[0]) / 2, (kk.a[1] + kk.b[1]) / 2] })) : [{ e, kk: null, L: (ks[0] || {}).L || 0, m: merkez(e) }]; });
          bir.sort((a, b) => (Math.abs(a.L - b.L) > 0.05 ? b.L - a.L : Math.abs(a.m[1] - b.m[1]) > 0.5 ? b.m[1] - a.m[1] : a.m[0] - b.m[0]));
          for (const e of g) if (kenarlar(e).length > 1) e.noK = []; else delete e.noK;
          for (const u of bir) { let s; do { s = bicim(pat, i++, k || 1); } while (kul.has(s)); kul.add(s); n++; if (u.kk) u.e.noK[u.kk.i] = s; else u.e.no = s; delete u.e._c; }
          for (const e of g) if (Array.isArray(e.noK)) { const ks = kenarlar(e); let bl = -1; for (const kk of ks) if (kk.L > bl) { bl = kk.L; e.no = e.noK[kk.i]; } }
          continue;
        }
        for (const e of sirala(g)) { let s; do { s = bicim(pat, i++, k || 1); } while (kul.has(s)); e.no = s; kul.add(s); delete e._c; n++; }
      }
    }
    return n;
  };
  /* yeni elemanlara otomatik numara */
  let mesgul = false;
  C.on('change', () => {
    if (mesgul || !C.doc || AYAR().oto === false || (C.cmd && C.cmd.running && /NUMARALA/.test(C.cmd.lastCmd || ''))) return;
    const eksik = C.doc.ents.filter(e => uygun(e) && (!e.no || (e.type === 'perde' && !Array.isArray(e.noK) && kenarlar(e).length > 1))); if (!eksik.length || eksik.length > 400) return;
    if (!C.doc.ents.some(e => uygun(e) && e.no)) return; // hiç numara verilmemiş çizimde kendiliğinden başlamaz
    mesgul = true; try { C.elemanNumarala([...new Set(eksik.map(e => e.type))], false); } finally { mesgul = false; }
  });

  C.addCommand(['NUMARALA', 'ELEMANNO', 'ELEMANNUMARA', 'PERDENO', 'KOLONNO', 'KIRISNO'], 'Perde (P1…), kolon (S1…) ve kirişlere (K101…) eleman numarası verir: planda üstten alta, soldan sağa; kat taban kotundan. NUMARALA [TUMU|PERDE|KOLON|KIRIS] [YENIDEN|EKSIK]', async (I) => {
    const k = await I.kw('Hangi elemanlar', [['TUMU', 'Tümü'], ['PERDE', 'Perde'], ['KOLON', 'Kolon'], ['KIRIS', 'Kiriş']], 'TUMU'); if (!k) return;
    const m = await I.kw('Numaralar', [['YENIDEN', 'Hepsini yeniden'], ['EKSIK', 'Yalnız numarasızlar']], 'YENIDEN'); if (!m) return;
    const tip = k === 'TUMU' ? Object.keys(TIP) : [{ PERDE: 'perde', KOLON: 'kolon', KIRIS: 'kiris' }[k]];
    const n = C.elemanNumarala(tip, m === 'YENIDEN'); AYAR().goster = true;
    C.changed(); const ozet = tip.map(t => `${AD[t]} ${C.doc.ents.filter(e => e.type === t && e.no).length}`).join(', ');
    C.log(n ? `${n} elemana numara verildi (${ozet}). Biçim: ${AYAR().P} / ${AYAR().S} / ${AYAR().K} — değiştirmek: ELEMANNOAYAR.` : 'Numaralanacak perde / kolon / kiriş bulunamadı.');
  });
  C.addCommand(['ELEMANNOAYAR', 'NUMARAAYAR'], 'Eleman numarası biçimleri ({n} sıra, {nn} iki hane, {k} kat) ve yeni elemanlara otomatik numara', async (I) => {
    const A = AYAR();
    const p = await I.str('Perde biçimi', A.P); if (p) A.P = p;
    const s = await I.str('Kolon biçimi', A.S); if (s) A.S = s;
    const k = await I.str('Kiriş biçimi', A.K); if (k) A.K = k;
    const o = await I.kw('Yeni elemanlara otomatik numara', [['E', 'Evet'], ['H', 'Hayır']], A.oto === false ? 'H' : 'E'); if (o) A.oto = o === 'E';
    C.log(`Biçimler: perde ${A.P}, kolon ${A.S}, kiriş ${A.K}; otomatik ${A.oto ? 'açık' : 'kapalı'}. Var olanlara uygulamak: NUMARALA → Hepsini yeniden.`);
  }, { noUndo: true });
  C.addCommand(['ELEMANNOGOSTER', 'NUMARAGOSTER'], 'Eleman numarası etiketlerini planda göster / gizle', async () => {
    const A = AYAR(); A.goster = A.goster === false; for (const e of C.doc.ents) if (TIP[e.type]) delete e._c; C.changed(); C.log('Eleman numaraları ' + (A.goster ? 'gösteriliyor.' : 'gizlendi.'));
  }, { noUndo: true });

  try {
    if (C.ribbon && Array.isArray(C.ribbon.tabs)) {
      const tab = C.ribbon.tabs.find(t => t[0] === 'İnşaat');
      if (tab && !tab[1].some(p => p[0] === 'Numara')) { tab[1].push(['Numara', [{ cmd: 'NUMARALA', t: 'Numarala', i: 'table', big: true }, { cmd: 'ELEMANNOAYAR', t: 'Biçim' }, { cmd: 'ELEMANNOGOSTER', t: 'Göster/gizle' }]]); C.ribbon.render(); }
    }
  } catch (er) { console.error('eleman no şerit', er); }
})(window.C);

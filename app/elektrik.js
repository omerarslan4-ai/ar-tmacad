/* ArıtmaCAD — ELEKTRİK TESİSATI · NESNELER, YERLEŞİM, 3B
   Bina iç elektrik tesisatı (ilk iş: bekçi binası). Örnek proje: Çorlu AAT B-105 Bekçi Binası E-BB 001/002/003 — semboller, katmanlar,
   etiketler ve notlar oradan ölçüldü (docs/cizim-kurallari/elektrik.md, cizim-kural.js → ELEKTRIK). Hesaplar el-hesap.js (saf).
   Nesneler:
     elcihaz { kind, p:[x,y], ang (duvar / armatür doğrultusu), on:[nx,ny] (duvardan odaya), zm (montaj yüksekliği, döşemeden m), z0 (kat), mid (mahal),
               sys 'ayd'|'priz'|'top'|'tlf'|'yng', kod (armatür), tip (anahtar / priz / dedektör türü), linye, W }
               kind: armatur · anahtar · priz · pano · tlfpriz · tdk · dedektor · buton · klakson · fjb · cubuk · bara
     elhat   { sys, pts:[[x,y]…], z0, zr (güzergâh kotu döşemeden m; null = tavan altı), linye, kablo }
     elsema  { p, g:{L,T} (kâğıt mm), tur }  — tek hat şeması, yükleme cetveli, semboller listesi, notlar, topraklama detayı
   Katmanlar (tek düzen, kullanıcı kararı 15.11.2026): EYAZI (sembol + yazı), EHAT (linye), TOPILET (topraklama), TLF (telefon), ETELYNG (yangın alarm).
   ELEKTRIKYERLESTIR : mahallerden aydınlatma hesabı → armatür, anahtar, priz, pano, acil / aplik, zayıf akım, topraklama ve hatlar.
   3B: bütün cihazlar ve hatlar 3B gövdeli (tavan altı armatür, duvarda anahtar / priz / pano, tavanda dedektör, temelde topraklama şeridi ve çubuklar). */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, EL = C.EL, MT = C.MT; if (!T || !EL || !C.prim) return;
  const { L, P, CI, A, TX, S } = C.prim, K = () => (C.cizimKural && C.cizimKural.ELEKTRIK) || null;
  const f = (v, d = 2) => (isFinite(v) ? (+v).toFixed(d) : '—').replace('.', ',');

  /* ---------- proje ayarları ---------- */
  EL.set = () => { const s = C.doc.set; if (!s.el) s.el = {}; const e = s.el, d = { pano: 'BBAT', besleyen: 'İBAT-1', besleyenAd: 'İDARİ BİNA', L: 100, div: 70, rho: 100, cubuk: 2, yedek: 2, ek: [], acil: true, aplik: true, zayif: true, MF: 0.8, mahal: {} };
    for (const k in d) if (e[k] == null) e[k] = JSON.parse(JSON.stringify(d[k])); return e; };

  /* ---------- katmanlar ve yazı stilleri (kural tablosundan) ---------- */
  const LAY = { ayd: 'EYAZI', yazi: 'EYAZI', hat: 'EHAT', top: 'TOPILET', tlf: 'TLF', yng: 'ETELYNG' };
  EL.lay = n => { const t = K() && K().katmanlar[n]; if (t) C.ensureLayer(n, t.renk, String(t.tip).toUpperCase(), Math.round(t.kal * 100)); else C.ensureLayer(n, 3, 'CONTINUOUS', 25); return n; };
  const stil = () => { if (!C.styles) return; const S2 = C.styles(); if (!S2.AAAA) S2.AAAA = { name: 'AAAA', font: 'Arial', h: 0, wf: 1, obl: 0, bold: false, italic: false }; if (!S2.elk) S2.elk = { name: 'elk', font: 'Romans (CAD)', h: 0, wf: 0.85, obl: 0, bold: false, italic: false }; };
  const YR = () => (K() && K().yaziRenk) || 2, mm = k => ((K() && K().yaziMm) || {})[k] || 2;
  /* sembol ölçüsü: kural tablosundaki cm (1/50) → model m, açıklama ölçeğiyle büyür (1/50'de birebir) */
  const sb = k => (((K() && K().sembol) || {})[k] || 8) / 100 * ((+C.doc.set.anno || 50) / 50);
  const yaziT = (p, h, s, rot, al, o) => TX(p, h, s, rot, al, Object.assign({ color: YR(), st: 'AAAA' }, o || {}));

  /* YAZI MASKESİ (firma kuralı 15.11.2026: "yazılar kablo altında kalıyor"): her yazının arkasına kâğıt renginde dolu alan konur;
     aynı nesnenin çizgileri önce, maske ve yazılar en son çizilir. Paftada ve ekranda çizgiler yazının altından geçer; DXF'e maske yazılmaz. */
  const yaziKutu = t => { const h = t.h, s = String(t.s || ''), w = (C.measureText ? C.measureText(s, h) : s.length * h * 0.62) || s.length * h * 0.62, al = String(t.al || 'L'), pad = ((K() && K().yaziMaske) || 0.6) * (+C.doc.set.anno || 50) / 1000;
    const hz = al.length === 1 ? al : al[1], vt = al.length === 1 ? 'B' : al[0], x0 = hz === 'C' || al === 'M' ? -w / 2 : hz === 'R' ? -w : 0, y0 = vt === 'M' ? -h / 2 : vt === 'T' ? -h : vt === 'B' && al.length === 1 ? -h * 0.2 : 0, y1 = vt === 'M' ? h / 2 : vt === 'T' ? 0 : h;
    const c = Math.cos(t.rot || 0), sn = Math.sin(t.rot || 0), p = t.p; return [[x0 - pad, y0 - pad], [x0 + w + pad, y0 - pad], [x0 + w + pad, y1 + pad], [x0 - pad, y1 + pad]].map(([x, y]) => [p[0] + x * c - y * sn, p[1] + x * sn + y * c, p[2] || 0]); };
  EL.maskele = prims => { const cz = [], yz = []; for (const q of prims) { if (q.k === 'T' && q.s && String(q.s).trim()) yz.push(Object.assign(S(yaziKutu(q)), { maske: true }), q); else cz.push(q); } return cz.concat(yz); };
  EL._yaziKutu = yaziKutu;

  /* ======================= 2B SEMBOLLER ======================= */
  const cerceve = e => { const a = e.ang || 0, u = [Math.cos(a), Math.sin(a)], n = e.on ? [e.on[0], e.on[1]] : [-u[1], u[0]], z = +e.z0 || 0, c = e.p; return { u, n, z, P: (s, o) => [c[0] + u[0] * s + n[0] * o, c[1] + u[1] * s + n[1] * o, z] }; };
  const daire = (F, s, o, r, n = 18) => Array.from({ length: n }, (_, i) => F.P(s + r * Math.cos(2 * Math.PI * i / n), o + r * Math.sin(2 * Math.PI * i / n)));
  const yay = (F, s, o, r, a0, a1, n = 12) => Array.from({ length: n + 1 }, (_, i) => { const t = a0 + (a1 - a0) * i / n; return F.P(s + r * Math.cos(t), o + r * Math.sin(t)); });
  const okunur = a => { let r = a; while (r > Math.PI / 2 + 1e-6) r -= Math.PI; while (r < -Math.PI / 2 - 1e-6) r += Math.PI; return r; };
  const SEMBOL = {
    armatur: e => { const F = cerceve(e), ar = EL.ARMATUR[e.kod] || EL.ARMATUR['P-LED18W'], out = [];
      if (ar.acil) { const w = sb('kutu') * 1.6, hh = sb('kutu') * 0.6; out.push(P([F.P(-w / 2, 0), F.P(w / 2, 0), F.P(w / 2, hh), F.P(-w / 2, hh)], true), S([F.P(-w / 2, 0), F.P(0, 0), F.P(0, hh), F.P(-w / 2, hh)]), yaziT(F.P(0, hh + C.annoH(mm('harfKucuk'))), C.annoH(mm('etiket')), 'ACİL', okunur(e.ang || 0), 'MC')); return out; }
      if (ar.dis) { const r = sb('anahtarR'); out.push(P(yay(F, 0, 0, r, 0, Math.PI), false), L(F.P(-r, 0), F.P(r, 0)), L(F.P(-r * 0.6, r * 0.2), F.P(r * 0.6, r * 0.8)), L(F.P(r * 0.6, r * 0.2), F.P(-r * 0.6, r * 0.8))); out.push(yaziT(F.P(0, -r * 1.6), C.annoH(mm('etiket')), e.kod, okunur(e.ang || 0), 'MC')); return out; }
      /* armatür gövdesi gerçek boyunda (1/50'de örnekteki 104 / 52 cm sembol = gövde boyu); ölçek değişince büyümez, duvara taşmaz */
      const r50 = 50 / (+C.doc.set.anno || 50), Lb = ar.boy, w = sb('armaturEn') * r50 * (ar.etans ? (((K() && K().sembol) || {}).etansEnKat || 1) : 1), uc = sb('armaturUc') * r50;
      out.push(L(F.P(-Lb / 2, -w / 2), F.P(Lb / 2, -w / 2)), L(F.P(-Lb / 2, w / 2), F.P(Lb / 2, w / 2)), L(F.P(-Lb / 2, -uc / 2), F.P(-Lb / 2, uc / 2)), L(F.P(Lb / 2, -uc / 2), F.P(Lb / 2, uc / 2)), L(F.P(0, -w / 2), F.P(0, w / 2)), L(F.P(-w * 0.28, -w * 0.2), F.P(w * 0.28, -w * 0.2)));
      if (ar.etans) out.push(L(F.P(-w * 0.28, w * 0.2), F.P(w * 0.28, w * 0.2)));
      if (ar.led) { const d = Math.min(w * 0.35, Lb / 12); for (const s of [-Lb / 4, Lb / 4]) { out.push(L(F.P(s - d, -d), F.P(s + d, d)), L(F.P(s - d, d), F.P(s + d, -d))); } } /* LED işareti: gövdede iki çarpı */
      const rot = okunur(e.ang || 0), h = C.annoH(mm('etiket'));
      out.push(yaziT(F.P(Lb / 2 + h * 0.6, 0), h, e.kod, rot, 'ML'));   /* kod armatürün yanında (BB-002) */
      if (e.linye) out.push(TX(F.P(0, w / 2 + h * 0.9), h, String(+e.linye), rot, 'MC', { color: YR(), st: 'elk' }));   /* linye no üstünde */
      return out; },
    anahtar: e => { const F = cerceve(e), r = sb('anahtarR'), o = r * 1.15, out = [P(daire(F, 0, o, r), true)], k = r * 2.1;
      if (e.tip === 'etans') out.push(S(daire(F, 0, o, r * 0.75, 12))); else out.push(CI(F.P(0, o), r * 0.18));
      const kol = (sgn, d = 0) => { const a = sgn * Math.PI / 4 + Math.PI / 2, ux = Math.cos(a), uy = Math.sin(a), p0 = [r * ux + d * uy, o + r * uy - d * ux], p1 = [k * ux + d * uy, o + k * uy - d * ux]; out.push(L(F.P(p0[0], p0[1]), F.P(p1[0], p1[1])), L(F.P(p1[0], p1[1]), F.P(p1[0] + r * 0.45 * Math.cos(a - Math.PI / 2), p1[1] + r * 0.45 * Math.sin(a - Math.PI / 2)))); };
      if (e.tip === 'komutator') { kol(1, -r * 0.25); kol(1, r * 0.25); } else if (e.tip === 'vaevien') { kol(1); kol(-1); } else kol(1);
      if (e.linye) out.push(TX(F.P(-r * 1.9, o), C.annoH(mm('linye')), String(+e.linye), 0, 'MC', { color: YR(), st: 'elk' }));
      return out; },
    priz: e => { const F = cerceve(e), r = sb('prizR'), o = r * 0.9, out = [P(yay(F, 0, o, r, 0, Math.PI), false), L(F.P(-r, o), F.P(r, o)), L(F.P(0, 0), F.P(0, o - 0.0001)), L(F.P(-r * 0.75, o + r * 1.25), F.P(r * 0.75, o + r * 1.25)), L(F.P(0, o + r), F.P(0, o + r * 1.25))];
      if (e.tip === 'etans') out.push(S(yay(F, 0, o, r * 0.82, 0, Math.PI, 8)));
      if (e.linye) out.push(TX(F.P(r * 1.7, o), C.annoH(mm('linye')), String(+e.linye), 0, 'MC', { color: YR(), st: 'elk' }));
      return out; },
    pano: e => { const F = cerceve(e), w = sb('tabloW'), hh = sb('tabloH'), out = [P([F.P(-w / 2, 0), F.P(w / 2, 0), F.P(w / 2, hh), F.P(-w / 2, hh)], true), L(F.P(-w / 2, 0), F.P(w / 2, hh)), S([F.P(-w / 2, 0), F.P(w / 2, 0), F.P(w / 2, hh)])];
      out.push(yaziT(F.P(0, hh + C.annoH(mm('etiket'))), C.annoH(mm('lejant')), e.kod || EL.set().pano, okunur(e.ang || 0), 'MC')); return out; },
    tlfpriz: e => { const F = cerceve(e), r = sb('anahtarR'), out = [P([F.P(-r, 0), F.P(r, 0), F.P(0, r * 1.7)], true), L(F.P(-r * 0.4, r * 0.55), F.P(r * 0.4, r * 0.55))]; return out; },
    tdk: e => { const F = cerceve(e), w = sb('kutu') * 2, hh = sb('kutu'), h = C.annoH(mm('kutuYazi')); return [P([F.P(-w / 2, 0), F.P(w / 2, 0), F.P(w / 2, hh), F.P(-w / 2, hh)], true), TX(F.P(0, hh * 0.68), h, 'TDK', okunur(e.ang || 0), 'MC', { color: YR(), st: 'elk' }), TX(F.P(0, hh * 0.25), h, '10ç', okunur(e.ang || 0), 'MC', { color: YR(), st: 'elk' })]; },
    dedektor: e => { const F = cerceve(Object.assign({}, e, { ang: 0, on: null })), r = sb('dedektorR'), h = C.annoH(mm('harf')), out = [P(daire(F, 0, 0, r), true), TX(F.P(0, -h * 0.45), h, 'D', 0, 'MC', { color: YR(), st: 'AAAA' })];
      if (e.tip === 'isi') out.push(L(F.P(-r * 0.7, -r * 0.7), F.P(r * 0.7, r * 0.7))); else out.push(TX(F.P(0, r * 0.35), C.annoH(mm('harfKucuk')), 'O', 0, 'MC', { color: YR(), st: 'elk' }));
      if (e.no) out.push(TX(F.P(r * 1.2, r * 0.6), C.annoH(mm('etiket')), e.no, 0, 'L', { color: YR(), st: 'AAAA' })); return out; },
    buton: e => { const F = cerceve(e), w = sb('kutu'), out = [P([F.P(-w / 2, 0), F.P(w / 2, 0), F.P(w / 2, w), F.P(-w / 2, w)], true), S(daire(F, 0, w / 2, w * 0.22, 10))]; return out; },
    klakson: e => { const F = cerceve(e), r = sb('anahtarR'), h = C.annoH(mm('etiket')); return [P(daire(F, 0, r * 1.1, r), true), TX(F.P(0, r * 1.1 - h * 0.45), h, 'K', okunur(e.ang || 0), 'MC', { color: YR(), st: 'AAAA' }), P([F.P(-r * 0.7, r * 2.3), F.P(0, r * 2.8), F.P(r * 0.7, r * 2.3)], false)]; },
    fjb: e => { const F = cerceve(e), w = sb('kutu'), h = C.annoH(mm('kutuYazi')); return [P([F.P(-w / 2, 0), F.P(w / 2, 0), F.P(w / 2, w), F.P(-w / 2, w)], true), L(F.P(-w / 2, 0), F.P(w / 2, w)), L(F.P(w / 2, 0), F.P(-w / 2, w)), TX(F.P(0, w + h), h, 'FJB', okunur(e.ang || 0), 'MC', { color: YR(), st: 'elk' })]; },
    cubuk: e => { const F = cerceve(Object.assign({}, e, { ang: 0, on: null })), r = sb('dedektorR'), h = C.annoH(mm('etiket')); return [P(daire(F, 0, 0, r), true), L(F.P(-r, -r), F.P(r, r)), L(F.P(-r, r), F.P(r, -r)), yaziT(F.P(r * 1.3, r * 0.4), h, e.no || 'TE', 0, 'L')]; },
    bara: e => { const F = cerceve(e), w = sb('kutu') * 2.5, hh = sb('kutu') * 0.6, h = C.annoH(mm('etiket')), o = e.alt ? sb('tabloH') + h * 3.2 : 0; /* panonun altındaki bara: planda pano sembolünün önüne çizilir, duvara kılavuz çizgisi */
      return [S([F.P(-w / 2, o), F.P(w / 2, o), F.P(w / 2, o + hh), F.P(-w / 2, o + hh)]), P([F.P(-w / 2, o), F.P(w / 2, o), F.P(w / 2, o + hh), F.P(-w / 2, o + hh)], true)].concat(o ? [L(F.P(-w / 2 - h * 0.6, 0), F.P(-w / 2 - h * 0.6, o + hh), { lt: 'HIDDEN' })] : []).concat([yaziT(F.P(0, o + hh + h * 1.2), h, (e.no || 'TB-1') + (e.alt ? ' (+0,30)' : ''), okunur(e.ang || 0), 'MC')]); },
  };
  /* mekanik cihaz besleme noktası (ısıtıcı / klima / fan): kare buat, içinde M, köşegen yarısı dolu; yanında cihaz adı ve linye */
  SEMBOL.mekbes = e => { const F = cerceve(e), w = sb('kutu'), h = C.annoH(mm('etiket')), rot = okunur(e.ang || 0), out = [P([F.P(-w / 2, 0), F.P(w / 2, 0), F.P(w / 2, w), F.P(-w / 2, w)], true), S([F.P(-w / 2, 0), F.P(w / 2, 0), F.P(w / 2, w)]), TX(F.P(-w * 0.22, w * 0.62), C.annoH(mm('kutuYazi')), 'M', 0, 'MC', { color: YR(), st: 'elk' })];
    if (e.linye) out.push(TX(F.P(w * 0.95, w * 0.5), C.annoH(mm('linye')), String(+e.linye), 0, 'MC', { color: YR(), st: 'elk' }));
    if (e.ad) { const no = (String(e.ad).match(/(Eİ|SK|FC|AF|ÇF|HF|RT|ET|ÇM|BM)\d+/) || [])[0]; out.push(yaziT(F.P(0, w + h * 1.1), h * 0.9, (no || String(e.ad).split(/\s[—(]/)[0]) + ` ${Math.round(e.W || 0)} W`, rot, 'BC')); } /* kısa etiket: cihaz no + güç (tam ad lejant ve cetvelde) */
    return out; };
  const AD = { mekbes: 'Mekanik cihaz beslemesi', armatur: 'Armatür', anahtar: 'Anahtar', priz: 'Priz', pano: 'Aydınlatma tablosu', tlfpriz: 'Telefon prizi', tdk: 'Telefon dağıtım kutusu', dedektor: 'Dedektör', buton: 'Yangın butonu (camı kır)', klakson: 'Flaşörlü klakson', fjb: 'Yangın alarm bağlantı kutusu', cubuk: 'Topraklama çubuğu', bara: 'Topraklama barası' };
  EL.AD = AD;
  T.elcihaz = {
    label: 'Elektrik cihazı',
    prims: e => { try { return EL.maskele((SEMBOL[e.kind] || SEMBOL.buton)(e)); } catch (er) { console.error(er); return []; } },
    snaps: e => [{ p: [e.p[0], e.p[1], +e.z0 || 0], k: 'ins' }],
    xf: (e, X) => { const q = X.p([e.p[0], e.p[1], 0]), q2 = X.p([e.p[0] + Math.cos(e.ang || 0), e.p[1] + Math.sin(e.ang || 0), 0]); e.p = [q[0], q[1]]; e.ang = Math.atan2(q2[1] - q[1], q2[0] - q[0]); if (e.on) { const o0 = X.p([0, 0, 0]), o1 = X.p([e.on[0], e.on[1], 0]); const l = Math.hypot(o1[0] - o0[0], o1[1] - o0[1]) || 1; e.on = [(o1[0] - o0[0]) / l, (o1[1] - o0[1]) / l]; } },
    info: e => `${AD[e.kind] || e.kind}${e.kod ? ' ' + e.kod : ''}${e.tip ? ' (' + e.tip + ')' : ''}${e.linye ? ' · linye ' + e.linye : ''}${e.W ? ' · ' + Math.round(e.W) + ' W' : ''}${e.zm != null ? ' · h=' + f(e.zm, 2) + ' m' : ''}`,
  };
  T.elhat = {
    label: 'Elektrik hattı',
    prims: e => { const z = +e.z0 || 0, out = [];
      out.push(P(e.pts.map(p => [p[0], p[1], z]), false)); /* kalınlık katmandan (EHAT 0,35 ≈ örnekteki 2,5 cm genişlikli çoklu çizgi) */
      let bi = -1, bl = 0.8; for (let i = 1; i < e.pts.length; i++) { const l = M.dist2(e.pts[i - 1], e.pts[i]); if (l > bl) { bl = l; bi = i; } }
      if (bi > 0 && e.kablo) { const a = e.pts[bi - 1], b = e.pts[bi], h = C.annoH(mm('etiket')), ang = okunur(Math.atan2(b[1] - a[1], b[0] - a[0])), nx = -Math.sin(ang), ny = Math.cos(ang); out.push(yaziT([(a[0] + b[0]) / 2 + nx * h * 0.9, (a[1] + b[1]) / 2 + ny * h * 0.9, z], h, e.kablo, ang, 'MC')); }
      return EL.maskele(out); },
    snaps: e => e.pts.map(p => ({ p: [p[0], p[1], +e.z0 || 0], k: 'end' })),
    xf: (e, X) => { e.pts = e.pts.map(p => X.p([p[0], p[1], 0]).slice(0, 2)); },
    info: e => `${({ ayd: 'Aydınlatma linyesi', priz: 'Priz linyesi', top: 'Topraklama iletkeni', tlf: 'Telefon hattı', yng: 'Yangın alarm hattı', bes: 'Besleme kablosu' })[e.sys] || 'Hat'}${e.linye ? ' ' + e.linye : ''}${e.kablo ? ' · ' + e.kablo : ''} · boy ${f(e.pts.reduce((s, p, i) => i ? s + M.dist2(e.pts[i - 1], p) : 0, 0), 2)} m`,
  };
  T.elsema = {
    label: 'Elektrik şeması',
    prims: e => { const k = C.doc.set.anno / 1000, o = M.p3(e.p), out = [], g = e.g || { L: [], T: [] }, SK = (K() && K().semaKal) || { k: 35, i: 18, b: 70, t: 35, h: 13 }, ST = { k: { lw: SK.k, color: YR() }, i: { lw: SK.i, color: YR() }, b: { lw: SK.b, color: YR() }, t: { lw: SK.t, lt: 'HIDDEN', color: YR() }, h: { lw: SK.h, color: YR() } };
      for (const l of g.L) out.push(L([o[0] + l[0] * k, o[1] + l[1] * k, 0], [o[0] + l[2] * k, o[1] + l[3] * k, 0], ST[l[4]] || ST.i));
      for (const t of g.T) out.push(TX([o[0] + t[0] * k, o[1] + t[1] * k, 0], t[2] * k, t[3], t[5] || 0, t[4] || 'L', { color: t[6] == null || t[6] === 2 ? YR() : t[6], st: 'AAAA' }));
      for (const s2 of g.S || []) out.push(S(s2.map(q => [o[0] + q[0] * k, o[1] + q[1] * k, 0]))); return /^det-/.test(e.tur || '') ? EL.maskele(out) : out; }, /* maske yalnız detaylarda (oklu açıklama çizgileri); tablo ve şemada satır çizgilerini kesmesin (kullanıcı 15.11.2026: "tablo bozuk") */
    snaps: e => [{ p: M.p3(e.p), k: 'ins' }],
    xf: (e, X) => { e.p = X.p(e.p); },
    info: e => `Elektrik şeması / tablo (${e.tur || ''})`,
  };
  if (C.ANNO_TYPES && C.ANNO_TYPES.add) { C.ANNO_TYPES.add('elcihaz'); C.ANNO_TYPES.add('elsema'); C.ANNO_TYPES.add('elhat'); }
  for (const t of ['elcihaz', 'elhat']) if (T[t] && !T[t].ifc) T[t].ifc = t === 'elhat' ? 'IfcCableSegment' : 'IfcFlowTerminal';
  /* disiplin: elektrik nesneleri ve katmanları ELEKTRIK kategorisinde (paftada ve 3B disiplin seçiminde) */
  { const EKAT = /^(EYAZI|EHAT|TOPILET|TLF|ETELYNG)$/; const k0 = C.gorunumKategori; C.gorunumKategori = e => { if (e && (/^el(cihaz|hat|sema)$/.test(e.type) || EKAT.test(String(e.layer || '')))) return 'ELEKTRIK'; return k0 ? k0(e) : null; }; }

  /* ======================= 3B GÖVDELER ======================= */
  const G = () => MT && MT._g3, ins = () => C._ins;
  const KROM_ = [0.8, 0.82, 0.84], BEY = [0.96, 0.96, 0.95], ISIK = [1.0, 0.98, 0.82], GRI = [0.72, 0.74, 0.76], KOYU = [0.2, 0.21, 0.23], KIR = [0.85, 0.15, 0.12], YES = [0.15, 0.7, 0.35], BAK = [0.78, 0.45, 0.2], GALV = [0.66, 0.68, 0.7], SAR = [0.95, 0.8, 0.2];
  const oda = id => C.doc.ents.find(e => e.id === id && e.type === 'mtmahal');
  const zZemin = e => { const o = oda(e.mid), p = e.p; try { return MT.zeminUst ? MT.zeminUst(p, +e.z0 || 0) : +e.z0 || 0; } catch (er) { return +e.z0 || 0; } };
  const zTavan = e => { const o = oda(e.mid), z0 = +e.z0 || 0, h = o ? (+o.h || 3) : 3; try { return MT.tavanAlt ? MT.tavanAlt(e.p, z0, h) : z0 + h; } catch (er) { return z0 + h; } };
  EL.zTavan = zTavan; EL.zZemin = zZemin;
  const mesh = fn => e => { const I = ins(); if (!I || !G()) return []; const out = I.newMesh(); try { fn(e, out); } catch (er) { console.error(er); return []; } return out.v.length ? [out] : []; };
  const cihaz3 = (e, out) => {
    const { eksen, bx, sil } = G(), zf = zZemin(e), zt = zTavan(e), F = eksen(e.p, e.ang || 0, e.on || null), zm = zf + (e.zm == null ? 1.1 : +e.zm);
    switch (e.kind) {
      case 'armatur': { const ar = EL.ARMATUR[e.kod] || EL.ARMATUR['P-LED18W'];
        if (ar.acil) { bx(out, F, -0.17, 0.17, 0, 0.06, zm, zm + 0.12, BEY); bx(out, F, -0.13, 0.13, 0.06, 0.062, zm + 0.02, zm + 0.1, YES); break; }
        if (ar.dis) { bx(out, F, -0.12, 0.12, -0.08, 0.0, zm, zm + 0.2, GRI); bx(out, F, -0.1, 0.1, -0.085, -0.08, zm + 0.02, zm + 0.18, ISIK); break; }
        const Lb = ar.boy, w = ar.etans ? 0.09 : 0.07; /* plandaki gerçek boy ve armaturYeri ile aynı (1,04 / 0,52 m) */ bx(out, F, -Lb / 2, Lb / 2, -w / 2, w / 2, zt - 0.075, zt, ar.etans ? GRI : BEY); bx(out, F, -Lb / 2 + 0.02, Lb / 2 - 0.02, -w / 2 + 0.015, w / 2 - 0.015, zt - 0.078, zt - 0.075, ISIK); break; }
      case 'anahtar': case 'priz': case 'tlfpriz': case 'buton': { const col = e.kind === 'buton' ? KIR : e.tip === 'etans' ? GRI : BEY; bx(out, F, -0.04, 0.04, 0, 0.012, zm - 0.04, zm + 0.04, col); if (e.kind === 'priz') sil(out, F.P(0, 0.012, zm), [F.n[0], F.n[1], 0], 0.022, 0.004, KOYU, 12); else if (e.kind === 'anahtar') bx(out, F, -0.015, 0.015, 0.012, 0.018, zm - 0.025, zm + 0.025, BEY); break; }
      case 'pano': bx(out, F, -0.25, 0.25, -0.1, 0.02, zm, zm + 0.5, GRI); bx(out, F, -0.23, 0.23, 0.02, 0.025, zm + 0.02, zm + 0.48, [0.85, 0.86, 0.88]); bx(out, F, 0.16, 0.2, 0.025, 0.035, zm + 0.22, zm + 0.28, KOYU); break;
      case 'tdk': case 'fjb': bx(out, F, -0.15, 0.15, -0.05, 0.02, zm, zm + 0.2, GRI); break;
      case 'mekbes': bx(out, F, -0.05, 0.05, 0, 0.03, zm - 0.05, zm + 0.05, BEY); bx(out, F, -0.03, 0.03, 0.03, 0.034, zm - 0.03, zm + 0.03, [0.85, 0.15, 0.12]); break; /* cihaz bağlantı kutusu (sigortalı / anahtarlı) */
      case 'klakson': bx(out, F, -0.07, 0.07, 0, 0.08, zm, zm + 0.12, KIR); sil(out, F.P(0, 0.08, zm + 0.06), [F.n[0], F.n[1], 0], 0.035, 0.03, SAR, 12); break;
      case 'dedektor': sil(out, [e.p[0], e.p[1], zt - 0.05], [0, 0, 1], 0.055, 0.05, BEY, 18); sil(out, [e.p[0], e.p[1], zt - 0.052], [0, 0, 1], 0.012, 0.002, KIR, 8); break;
      case 'cubuk': { const z = EL.zTemel(); sil(out, [e.p[0], e.p[1], z - 3], [0, 0, 1], 0.012, 3, BAK, 10); sil(out, [e.p[0], e.p[1], z - 0.1], [0, 0, 1], 0.04, 0.12, GALV, 10); break; }
      case 'bara': { /* TB-1 (detayla aynı): duvar plakası, iki mesnet izolatörü, 400x40x5 Cu bara, M10 civatalar, aşağı inen iletkenler ve temel filizi */
        const zb = zf + 0.3, SY = [0.2, 0.6, 0.15], EP = [0.85, 0.75, 0.25];
        bx(out, F, -0.23, 0.23, 0, 0.004, zb - 0.06, zb + 0.1, GRI);
        for (const s of [-0.17, 0.17]) sil(out, F.P(s, 0.004, zb + 0.02), [F.n[0], F.n[1], 0], 0.016, 0.045, EP, 12);
        bx(out, F, -0.2, 0.2, 0.049, 0.054, zb, zb + 0.04, BAK);
        for (let i = 0; i < 6; i++) { const s = -0.13 + i * 0.052; sil(out, F.P(s, 0.054, zb + 0.02), [F.n[0], F.n[1], 0], 0.0075, 0.008, KROM_, 6); if (i < 4) sil(out, F.P(s, 0.06, zf + 0.02), [0, 0, 1], 0.004, zb + 0.014 - zf - 0.02, SY, 6); }
        bx(out, F, 0.115, 0.145, 0.04, 0.0435, EL.zTemel() + 0.02, zb + 0.03, GALV); /* filiz: temelden baraya 30x3,5 şerit */
        break; }
    }
  };
  T.elcihaz.mesh = mesh(cihaz3);
  /* hatlar: tavan altında (ya da topraklama: temel kotunda) ince boru; cihaza düşey iniş */
  T.elhat.mesh = mesh((e, out) => { const { bx, sil } = G(), col = { ayd: [0.25, 0.65, 0.9], priz: [0.25, 0.65, 0.9], top: BAK, tlf: [0.3, 0.75, 0.85], yng: KIR, bes: KOYU }[e.sys] || GRI;
    if (e.sys === 'top') { const z = EL.zTemel() + 0.02; for (let i = 1; i < e.pts.length; i++) { const a = e.pts[i - 1], b = e.pts[i], l = M.dist2(a, b); if (l < 0.01) continue; const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), F = G().eksen([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ang, null); bx(out, F, -l / 2 - 0.004, l / 2 + 0.004, -0.00175, 0.00175, z, z + 0.03, GALV); /* 30x3,5 şerit kenarı üzerinde */
        if (e.pts.length > 3) for (let d = 1.0; d < l - 0.3; d += 2.0) bx(out, F, -l / 2 + d - 0.01, -l / 2 + d + 0.01, -0.012, 0.012, z - 0.06, z, KOYU); } /* mesafe tutucular her 2 m */
      if (e.pts.length > 3) for (const p of e.pts) bx(out, G().eksen(p, 0, null), -0.03, 0.03, -0.03, 0.03, z + 0.03, z + 0.04, GRI); /* köşe klemensleri */
      return; }
    const p0 = { p: e.pts[0], z0: e.z0, mid: e.mid }, zt = (e.zr != null ? zZemin(p0) + +e.zr : zTavan(p0) - 0.03 - (e.sys === 'tlf' ? 0.04 : e.sys === 'yng' ? 0.08 : e.sys === 'priz' ? 0.02 : 0));
    for (let i = 1; i < e.pts.length; i++) { const a = e.pts[i - 1], b = e.pts[i], l = M.dist2(a, b); if (l < 0.01) continue; const d = [(b[0] - a[0]) / l, (b[1] - a[1]) / l, 0]; sil(out, [a[0], a[1], zt], d, 0.009, l, col, 8); }
    for (const q of e.inis || []) { const zb = zZemin({ p: q[0], z0: e.z0 }) + q[1]; if (zt - zb > 0.05) sil(out, [q[0][0], q[0][1], zb], [0, 0, 1], 0.009, zt - zb, col, 8); } });
  EL.zTemel = () => { let z = Infinity; for (const e of C.doc.ents) { if (e.type === 'kati' || (e.type === 'perde' && e.temel) || e.type === 'temel') z = Math.min(z, +e.z0 || 0); } if (z === Infinity) { const ms = MT ? MT.mahaller() : []; z = (ms.length ? Math.min(...ms.map(m => +m.z0 || 0)) : 0) - 0.6; } return z; };

  /* ======================= YERLEŞİM ======================= */
  const inPoly = (p, pts) => MT.inPoly(p, pts);
  const kutu = pts => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return [x0, y0, x1, y1]; };
  /* mahal kenarları: { a, b, u, n (odaya doğru), L, k, ac:[{kind,w,h,id,s (kenar boyunca merkez)}] } */
  const kenarlar = e => { const out = []; for (const y of e.yuz || []) { const Ls = M.dist2(y.a, y.b); if (Ls < 0.2) continue; const u = [(y.b[0] - y.a[0]) / Ls, (y.b[1] - y.a[1]) / Ls], m = [(y.a[0] + y.b[0]) / 2, (y.a[1] + y.b[1]) / 2]; let n = [-u[1], u[0]]; if (!inPoly([m[0] + n[0] * 0.05, m[1] + n[1] * 0.05], e.pts)) n = [-n[0], -n[1]];
      const ac = (y.ac || []).map(a => { const o = C.byId(a.id), hf = o && ins() ? ins().hostFrame(o) : null; if (!hf) return null; const c = [hf.sf.a[0] + hf.sf.u[0] * (+o.s || 0), hf.sf.a[1] + hf.sf.u[1] * (+o.s || 0)]; return { kind: a.kind, w: a.w, h: a.h, id: a.id, s: (c[0] - y.a[0]) * u[0] + (c[1] - y.a[1]) * u[1] }; }).filter(Boolean);
      out.push({ a: y.a, b: y.b, u, n, L: Ls, k: y.k, t: y.t || 0.2, ac }); }
    return out; };
  const nokta = (k, s, o = 0.0) => [k.a[0] + k.u[0] * s + k.n[0] * o, k.a[1] + k.u[1] * s + k.n[1] * o];
  /* kenarda serbest yer: açıklıklardan ve köşelerden uzak */
  const serbest = (k, s, pay = 0.3) => s > pay && s < k.L - pay && k.ac.every(a => Math.abs(s - a.s) > a.w / 2 + pay);
  const yeniC = (o) => C.newEnt('elcihaz', Object.assign({ dis: 'Elektrik', color: 256, oto: 1 }, o));
  const yeniH = (o) => C.newEnt('elhat', Object.assign({ dis: 'Elektrik', color: 256, oto: 1 }, o));
  /* dik açılı güzergâh: a → b (önce uzun eksen) */
  const dik = (a, b) => (Math.abs(b[0] - a[0]) < 0.02 || Math.abs(b[1] - a[1]) < 0.02) ? [b] : [[b[0], a[1]], b];
  const zincir = (bas, ps) => { const kalan = ps.slice(), yol = [bas], sira = []; let cur = bas; while (kalan.length) { let bi = 0, bd = Infinity; kalan.forEach((q, i) => { const d = Math.abs(q[0] - cur[0]) + Math.abs(q[1] - cur[1]); if (d < bd) { bd = d; bi = i; } }); const q = kalan.splice(bi, 1)[0]; yol.push(...dik(cur, q)); sira.push(q); cur = q; } return { yol, sira }; };

  EL.temizle = () => { C.doc.ents = C.doc.ents.filter(e => !((e.type === 'elcihaz' || e.type === 'elhat') && e.oto)); };
  /* mahal mahal hesap (yerleştirmeden de kullanılır: panel, rapor) */
  EL.mahalHesap = () => {
    const st = EL.set(), out = [];
    for (const e of MT.mahaller()) {
      const ov = st.mahal[e.id] || {}, tip = EL.mahalTip(e.ad), [x0, y0, x1, y1] = kutu(e.pts), A = MT.alan(e), lp = e.lp || MT.icNokta(e.pts);
      const zf = (() => { try { return MT.zeminUst(lp, +e.z0 || 0); } catch (er) { return +e.z0 || 0; } })(), zt = (() => { try { return MT.tavanAlt(lp, +e.z0 || 0, +e.h || 3); } catch (er) { return (+e.z0 || 0) + (+e.h || 3); } })();
      const etans = ov.etans != null ? !!ov.etans : tip.etans, arm = ov.arm || EL.armaturSec(A, etans), lx = ov.lx != null ? +ov.lx : tip.lx;
      const r = EL.aydinlatma({ a: x1 - x0, b: y1 - y0, A, h: zt - zf, E: lx, arm, MF: st.MF });
      out.push({ e, tip, A, a: x1 - x0, b: y1 - y0, bb: [x0, y0, x1, y1], zf, zt, h: zt - zf, etans, arm, lx, r, priz: ov.priz != null ? +ov.priz : tip.priz, tlf: ov.tlf != null ? +ov.tlf : tip.tlf, ded: ov.ded !== undefined ? ov.ded : tip.ded });
    }
    return out;
  };

  /* ELEKTRİK TESİSATINI YERLEŞTİR: bütün otomatik elektrik nesneleri yeniden üretilir (elle çizilenler kalır) */
  EL.yerlestir = () => {
    if (!MT || !MT.mahaller) return { n: 0, uyari: ['Mekanik modülü (mahal bulma) yüklenmemiş.'] };
    const uyari = []; if (!MT.mahaller().length) { const r = MT.mahalBul({}); if (!r.n) return { n: 0, uyari: ['Mahal bulunamadı: binayı İnşaat ▸ Duvar / Perde ile çizin (kapalı odalar gerekir).'] }; }
    stil(); const st = EL.set(), H = EL.mahalHesap(); if (!H.length) return { n: 0, uyari: ['Mahal yok.'] };
    C.undoStack.push(C.snapshot()); EL.temizle();
    const yeni = [], add = x => { yeni.push(x); return x; }, ly = EL.lay;
    const kat = H.map(x => ({ x, K: kenarlar(x.e) }));
    /* dış kapı (giriş): bir mahalin dış duvarındaki en geniş kapı */
    let giris = null; for (const { x, K: ks } of kat) for (const k of ks) for (const a of k.ac) if (a.kind === 'kapi' && k.k === 'dis' && (!giris || a.w > giris.a.w)) giris = { x, k, a };
    /* ana mahal (pano): çalışma odası ya da giriş mahali ya da en büyük */
    const ana = (kat.find(q => q.x.tip.ad === 'Çalışma odası') || (giris && kat.find(q => q.x === giris.x)) || kat.slice().sort((p, q) => q.x.A - p.x.A)[0]);
    const cihazlar = []; // linye gruplaması için (ışık, priz) — mahal sırasıyla
    const isikCihaz = new Map(), prizCihaz = new Map(), anahtarOf = new Map();
    for (const { x, K: ks } of kat) {
      const e = x.e, z0 = +e.z0 || 0, base = { z0, mid: e.id }; if (e.sv != null) base.sv2 = e.sv;
      /* armatürler: oda kutusunda ızgara, uzun kenar doğrultusunda */
      const N = x.r.N, a = x.a, b = x.b, ang = a >= b ? 0 : Math.PI / 2, ar = EL.ARMATUR[x.arm], pos = EL.armaturYeri(e.pts, EL.izgara(N, a, b).map(q => [x.bb[0] + q[0], x.bb[1] + q[1]]), ang, ar.boy); const arm = (pos.length ? pos : [e.lp || MT.icNokta(e.pts)]).map(q => add(yeniC(Object.assign({ layer: ly('EYAZI'), kind: 'armatur', sys: 'ayd', p: q, ang, kod: x.arm, W: ar.W }, base))));
      isikCihaz.set(e.id, arm); arm.forEach(c => cihazlar.push({ tur: 'isik', W: c.W, mahal: e.no || e.ad, ref: c }));
      /* anahtar: odanın kapısının yanında, kapı kenarından 15 cm, 1,10 m */
      let kk = null, ka = null; for (const k of ks) for (const ac of k.ac) if (ac.kind === 'kapi' && (!ka || (giris && ac.id === giris.a.id))) { kk = k; ka = ac; }
      let sw; if (kk) { let s = ka.s + ka.w / 2 + 0.15; if (s > kk.L - 0.1) s = ka.s - ka.w / 2 - 0.15; sw = { k: kk, s }; } else { const k0 = ks.slice().sort((p, q) => q.L - p.L)[0]; sw = { k: k0, s: 0.4 }; }
      const atip = x.etans ? 'etans' : (N >= 3 && x.A > 15 ? 'komutator' : 'normal');
      const an = add(yeniC(Object.assign({ layer: ly('EYAZI'), kind: 'anahtar', sys: 'ayd', tip: atip, p: nokta(sw.k, sw.s), ang: Math.atan2(sw.k.u[1], sw.k.u[0]), on: sw.k.n, zm: 1.1 }, base))); anahtarOf.set(e.id, an);
      /* prizler: duvar boyunca eşit aralıkla, açıklık ve köşelerden uzak */
      const prz = []; if (x.priz > 0) { const top = ks.reduce((s, k) => s + k.L, 0), adim = top / x.priz; let acc = adim / 2; for (const k of ks) { while (acc < k.L && prz.length < x.priz) { let s = acc, ok = serbest(k, s); for (let d = 0.1; !ok && d < 1.2; d += 0.1) { if (serbest(k, acc + d)) { s = acc + d; ok = true; } else if (serbest(k, acc - d)) { s = acc - d; ok = true; } } if (ok && !(k === sw.k && Math.abs(s - sw.s) < 0.3)) prz.push(add(yeniC(Object.assign({ layer: ly('EYAZI'), kind: 'priz', sys: 'priz', tip: x.etans ? 'etans' : 'toprakli', p: nokta(k, s), ang: Math.atan2(k.u[1], k.u[0]), on: k.n, zm: x.tip.ad === 'Mutfak' ? 1.1 : 0.4, W: EL.PRIZ_W }, base)))); acc += adim; } acc -= k.L; } }
      prizCihaz.set(e.id, prz); prz.forEach(c => cihazlar.push({ tur: 'priz', W: c.W, mahal: e.no || e.ad, ref: c }));
      /* zayıf akım */
      if (st.zayif) {
        if (x.tlf > 0) { const k = (prz[0] && ks.find(q => M.segDist(prz[0].p, q.a, q.b) < 0.05)) || ks[0], s0 = prz[0] ? ((prz[0].p[0] - k.a[0]) * k.u[0] + (prz[0].p[1] - k.a[1]) * k.u[1]) + 0.3 : k.L / 2; add(yeniC(Object.assign({ layer: ly('EYAZI'), kind: 'tlfpriz', sys: 'tlf', p: nokta(k, Math.min(k.L - 0.3, s0)), ang: Math.atan2(k.u[1], k.u[0]), on: k.n, zm: 0.4 }, base))); }
        const nd = EL.dedektorSay(x.A, x.ded); if (nd) { /* dedektör: oda içinde, duvardan en az 0,5 m, armatürlerden 0,5 m uzak (TS EN 54 uygulama kuralı) */
          const dp0 = EL.izgara(nd, a, b).map(q => [x.bb[0] + q[0], x.bb[1] + q[1]]), arP = arm.map(c => c.p), cand = EL.armaturYeri(e.pts, dp0.map(q => { let r = q; for (const c of arP) if (Math.hypot(r[0] - c[0], r[1] - c[1]) < 0.5) r = [r[0] + (ang ? 0.6 : 0), r[1] + (ang ? 0 : 0.6)]; return r; }), 0, 0, { ara: 1.5 }), dp = cand.length ? cand : [e.lp || MT.icNokta(e.pts)];
          dp.forEach((q, i) => add(yeniC(Object.assign({ layer: ly('EYAZI'), kind: 'dedektor', sys: 'yng', tip: x.ded, p: q, no: `${e.no || ''}.${String(i + 1).padStart(2, '0')}`.replace(/^\./, '') }, base)))); }
      }
    }
    /* pano, TDK, FJB: ana mahalde, girişe yakın duvarda */
    const am = ana.x.e, aks = ana.K, base0 = { z0: +am.z0 || 0, mid: am.id }; if (am.sv != null) base0.sv2 = am.sv;
    const anA = anahtarOf.get(am.id), kSw = aks.find(k => M.segDist(anA.p, k.a, k.b) < 0.05) || aks[0], sSw = (anA.p[0] - kSw.a[0]) * kSw.u[0] + (anA.p[1] - kSw.a[1]) * kSw.u[1];
    /* duvar elemanlarının yeri (kullanıcı 15.11.2026: "topraklama barası kapının önünde"): kapı / pencere boşluğundan ve birbirinden uzak, en yakın boş duvar;
       aynı duvarda yer yoksa mahalin öbür duvarları denenir */
    const dolu = [[kSw, sSw, 0.15]], yer = (k0, s0, pay, w) => { for (const k of [k0].concat(aks.filter(q => q !== k0))) { const b = k === k0 ? s0 : k.L / 2;
        for (let d = 0; d < k.L; d += 0.05) for (const s of [b + d, b - d]) { if (s < pay || s > k.L - pay || !serbest(k, s, pay)) continue; if (dolu.some(q => q[0] === k && Math.abs(q[1] - s) < w / 2 + q[2])) continue; { const q2 = nokta(k, s); if (yeni.some(c => c.type === 'elcihaz' && c.kind !== 'armatur' && c.kind !== 'dedektor' && Math.hypot(c.p[0] - q2[0], c.p[1] - q2[1]) < w / 2 + 0.2)) continue; } /* öbür mahallerin prizleri (aynı duvarın arka yüzü dahil) */ dolu.push([k, s, w / 2]); return { k, s }; } }
      return { k: k0, s: Math.max(0.3, Math.min(k0.L - 0.3, s0)) }; };
    const YP = yer(kSw, sSw + 0.55, 0.35, 0.55), kP = YP.k, sP = YP.s;
    const pano = add(yeniC(Object.assign({ layer: ly('EYAZI'), kind: 'pano', sys: 'ayd', kod: st.pano, p: nokta(kP, sP), ang: Math.atan2(kP.u[1], kP.u[0]), on: kP.n, zm: 1.5 }, base0)));
    /* mekanik ekipman beslemesi (firma kuralı 15.11.2026): elektrikli ısıtıcı, klima, fan — her biri besleme noktası + kendi linyesi */
    const mekEk = [];
    /* mekanik envanter (15.11.2026, "mekanik disiplini teker teker analiz edip elektriğe eksiksiz geçir"): ısıtıcı, klima, fancoil, aspiratör / fan, rooftop,
       termosifon, çamaşır / bulaşık makinesi + kazan dairesi / kombi ve chiller (yerleri kolon noktası; kolon yoksa ana mahalin ortası) */
    const merkez = []; try { const kal = MT.kal ? MT.kal() : {}, ism = MT.isiMerkeziHesap && C.doc.ents.some(x => x.type === 'mtrad' && x.tip !== 'E') && kal.sistem !== 'elektrik' ? MT.isiMerkeziHesap() : null, sgh = MT.sogutmaHesap && C.doc.ents.some(x => x.type === 'mtfc' && x.tip !== 'split') ? MT.sogutmaHesap() : null;
      const im = MT.im ? MT.im() : {}, kolP = sys => { const k = C.doc.ents.find(x => x.type === 'mtkolon' && (sys ? x.sys === sys : !x.sys)); return k ? k.p : (am.lp || MT.icNokta(am.pts)); };
      for (const x of EL.mekMerkez({ kazan: ism ? { sistem: im.sistem, adet: ism.adet, QB: ism.QB, pompaP: ism.pompa && ism.pompa.P, kombiAdet: (ism.kombi || []).length } : null, chiller: sgh && !sgh.split && !sgh.yok ? { elek: sgh.elek, pompaP: sgh.pompa && sgh.pompa.P } : null })) merkez.push(Object.assign(x, { p: kolP(x.sys === 'sog' ? 'sog' : null), id: 'merkez-' + x.sys }));
    } catch (er) { console.error(er); uyari.push('Kazan / chiller elektrik yükü hesaplanamadı: ' + (er && er.message || er)); }
    for (const m of C.doc.ents.concat(merkez)) { const g = EL.mekGuc(m); if (!g) continue; const ma = m.p ? (oda(m.mid) || MT.mahaller().find(o => MT.inPoly([m.p[0], m.p[1]], o.pts))) : null; if (!ma) { uyari.push(`${g.ad}: mahali bulunamadı, besleme noktası konamadı — Elektrik ▸ Eleman ekle ile elle koyun ve linye verin (mekanik ekipman göz ardı edilmez).`); continue; }
      const ks = (kat.find(q => q.x.e === ma) || { K: kenarlar(ma) }).K; let bk = null, bd = Infinity; for (const k of ks) { const d = M.segDist([m.p[0], m.p[1]], k.a, k.b); if (d < bd) { bd = d; bk = k; } }
      if (!bk) continue; const s0 = (m.p[0] - bk.a[0]) * bk.u[0] + (m.p[1] - bk.a[1]) * bk.u[1], yarim = (m.type === 'mtrad' ? (+m.L || 0.6) : m.type === 'mtfc' ? 0.45 : 0.2) / 2 + 0.2;
      const bosMu = q => { const r = nokta(bk, q); return !yeni.some(c => c.type === 'elcihaz' && c.kind !== 'armatur' && c.kind !== 'dedektor' && Math.hypot(c.p[0] - r[0], c.p[1] - r[1]) < 0.35); };
      const aday = [s0 + yarim, s0 - yarim]; for (let d = 0.3; d < 2.5; d += 0.15) aday.push(s0 + yarim + d, s0 - yarim - d); aday.push(s0);
      let s = aday.find(q => q > 0.2 && q < bk.L - 0.2 && serbest(bk, q, 0.1) && bosMu(q)); /* cihaz yanında, boşluk ve öbür elemanlardan uzak */
      if (s == null) { /* duvar boydan boya pencere ise: mahalin cihaza en yakın boş duvar yeri */ let bd2 = Infinity; const kb0 = bk; for (const k of ks) for (let q = 0.2; q < k.L - 0.2; q += 0.05) { if (!serbest(k, q, 0.1)) continue; const r = nokta(k, q); if (yeni.some(c => c.type === 'elcihaz' && c.kind !== 'armatur' && c.kind !== 'dedektor' && Math.hypot(c.p[0] - r[0], c.p[1] - r[1]) < 0.35)) continue; const d = Math.hypot(r[0] - m.p[0], r[1] - m.p[1]); if (d < bd2) { bd2 = d; bk = k; s = q; } } if (s == null) { bk = kb0; s = Math.max(0.2, Math.min(bk.L - 0.2, s0)); } }
      const bs = { z0: +ma.z0 || 0, mid: ma.id }; if (ma.sv != null) bs.sv2 = ma.sv;
      const c = add(yeniC(Object.assign({ layer: ly('EYAZI'), kind: 'mekbes', sys: 'priz', p: nokta(bk, s), ang: Math.atan2(bk.u[1], bk.u[0]), on: bk.n, zm: g.zm, W: g.W, faz: g.faz, ad: g.ad, mekId: m.id, mekTur: g.tur }, bs)));
      mekEk.push({ ad: g.ad, W: g.W, faz: g.faz, mek: true, mahal: [ma.no || ma.ad], cihaz: [{ ref: c }] }); }
    /* linyeler */
    const gr = EL.linyeGrupla(cihazlar), Ls = EL.linyeler(gr, mekEk.concat(st.ek || []), +st.yedek || 0), Y = EL.yuk(Ls, { div: st.div, L: st.L });
    Ls.forEach(l => (l.cihaz || []).forEach(c => { c.ref.linye = l.no; }));
    for (const l of Ls) { if (!l.cihaz || !l.cihaz.length) continue; const refs = l.cihaz.map(c => c.ref);
      let pts = refs.map(c => c.p); if (l.tur === 'isik') { const sws = [...new Set(refs.map(c => c.mid))].map(id => anahtarOf.get(id)).filter(Boolean); sws.forEach(s => { s.linye = s.linye || l.no; }); pts = sws.map(s => s.p).concat(pts); }
      const z = zincir(pano.p, pts), inis = [[pano.p, 1.5 + 0.5]].concat(refs.filter(c => c.kind !== 'armatur').map(c => [c.p, c.zm])).concat(l.tur === 'isik' ? [...new Set(refs.map(c => c.mid))].map(id => anahtarOf.get(id)).filter(Boolean).map(s => [s.p, s.zm]) : []);
      add(yeniH(Object.assign({ layer: ly('EHAT'), sys: l.tur === 'isik' ? 'ayd' : 'priz', pts: z.yol, linye: l.no, kablo: l.kablo, inis }, base0))); }
    /* besleme: panodan en yakın dış duvara, dışarı 1 m */
    { let bk = null, bd = Infinity; for (const { K: ks2 } of kat) for (const k of ks2) if (k.k === 'dis') { const d = M.segDist(pano.p, k.a, k.b); if (d < bd) { bd = d; bk = k; } } if (bk) { const s = Math.max(0.3, Math.min(bk.L - 0.3, (pano.p[0] - bk.a[0]) * bk.u[0] + (pano.p[1] - bk.a[1]) * bk.u[1])), q = nokta(bk, s), q2 = nokta(bk, s, -(bk.t + 1.0)); add(yeniH(Object.assign({ layer: ly('EHAT'), sys: 'bes', pts: [pano.p, q, q2], kablo: `${st.besleyen} PANOSUNDAN ${Y.bes.ad}`, zr: 0.3, inis: [[pano.p, 1.5]] }, base0))); } }
    /* acil çıkış armatürü (kapı üstü, içte) ve dış aplik (kapı dışında) */
    if (giris) { const { x, k, a } = giris, e = x.e, bs = { z0: +e.z0 || 0, mid: e.id }, ang = Math.atan2(k.u[1], k.u[0]);
      if (st.acil) add(yeniC(Object.assign({ layer: ly('EYAZI'), kind: 'armatur', sys: 'ayd', kod: 'ACİL', p: nokta(k, a.s), ang, on: k.n, zm: Math.min(x.h - 0.15, (a.h || 2.1) + 0.15), W: EL.ARMATUR['ACİL'].W, linye: Ls.find(l => l.tur === 'isik') ? Ls.find(l => l.tur === 'isik').no : '' }, bs)));
      if (st.aplik) add(yeniC(Object.assign({ layer: ly('EYAZI'), kind: 'armatur', sys: 'ayd', kod: 'APLİK', p: nokta(k, a.s + a.w / 2 + 0.35, -k.t), ang: ang + Math.PI, on: [-k.n[0], -k.n[1]], zm: 2.2, W: EL.ARMATUR['APLİK'].W, linye: Ls.find(l => l.tur === 'isik') ? Ls.find(l => l.tur === 'isik').no : '' }, bs)));
      if (st.zayif) { /* buton kapının öbür yanında 1,40 m; klakson kapı dışında 2,30 m; FJB ve TDK panonun yanında */
        /* buton kapının anahtar olmayan yanında; iki yan da doluysa duvarda en yakın boş yer */
        const swg = anahtarOf.get(e.id), dol = s => [swg, ...yeni.filter(c => c.kind === 'pano' || c.kind === 'tdk' || c.kind === 'fjb')].some(c => c && Math.hypot(c.p[0] - nokta(k, s)[0], c.p[1] - nokta(k, s)[1]) < 0.4);
        let sb2 = [a.s - a.w / 2 - 0.25, a.s + a.w / 2 + 0.25, a.s - a.w / 2 - 0.65, a.s + a.w / 2 + 0.65].find(s => s > 0.15 && s < k.L - 0.15 && serbest(k, s, 0.1) && !dol(s)); let kb = k; if (sb2 == null) { /* kapının iki yanı dolu: girişe en yakın boş duvar yeri (mahalin öbür duvarları) */ const kc = nokta(k, a.s), dolK = (kk, s) => [swg, ...yeni.filter(c => c.kind === 'pano' || c.kind === 'tdk' || c.kind === 'fjb' || c.kind === 'priz' || c.kind === 'tlfpriz')].some(c => c && Math.hypot(c.p[0] - nokta(kk, s)[0], c.p[1] - nokta(kk, s)[1]) < 0.4); let bd = Infinity;
          for (const kk of (kat.find(q => q.x === x) || { K: [] }).K) for (let s = 0.2; s < kk.L - 0.2; s += 0.05) { if (!serbest(kk, s, 0.15) || dolK(kk, s)) continue; const q = nokta(kk, s), d = Math.hypot(q[0] - kc[0], q[1] - kc[1]); if (d < bd) { bd = d; kb = kk; sb2 = s; } }
          if (sb2 == null) sb2 = Math.max(0.15, a.s - a.w / 2 - 0.25); }
        add(yeniC(Object.assign({ layer: ly('EYAZI'), kind: 'buton', sys: 'yng', p: nokta(kb, sb2), ang: Math.atan2(kb.u[1], kb.u[0]), on: kb.n, zm: 1.4 }, bs)));
        add(yeniC(Object.assign({ layer: ly('EYAZI'), kind: 'klakson', sys: 'yng', p: nokta(k, a.s - a.w / 2 - 0.4, -k.t), ang: ang + Math.PI, on: [-k.n[0], -k.n[1]], zm: 2.3 }, bs))); } }
    if (st.zayif) { const Y1 = yer(kP, sP + 0.55, 0.3, 0.35), Y2 = yer(kP, sP + 1.0, 0.3, 0.3); /* pano · TDK · FJB yan yana, boşluklardan uzak */
      const tdk = add(yeniC(Object.assign({ layer: ly('EYAZI'), kind: 'tdk', sys: 'tlf', p: nokta(Y1.k, Y1.s), ang: Math.atan2(Y1.k.u[1], Y1.k.u[0]), on: Y1.k.n, zm: 1.8 }, base0)));
      const fjb = add(yeniC(Object.assign({ layer: ly('EYAZI'), kind: 'fjb', sys: 'yng', p: nokta(Y2.k, Y2.s), ang: Math.atan2(Y2.k.u[1], Y2.k.u[0]), on: Y2.k.n, zm: 2.1 }, base0)));
      const tl = yeni.filter(c => c.kind === 'tlfpriz'); if (tl.length) { const z = zincir(tdk.p, tl.map(c => c.p)); add(yeniH(Object.assign({ layer: ly('TLF'), sys: 'tlf', pts: z.yol, kablo: '1(1ç) PYCYM', inis: [[tdk.p, 1.8]].concat(tl.map(c => [c.p, c.zm])) }, base0))); }
      const yg = yeni.filter(c => c.sys === 'yng' && c !== fjb); if (yg.length) { const z = zincir(fjb.p, yg.map(c => c.p)); add(yeniH(Object.assign({ layer: ly('ETELYNG'), sys: 'yng', pts: z.yol, kablo: '2x1.5 JY(St)Y', inis: [[fjb.p, 2.1]].concat(yg.filter(c => c.kind !== 'dedektor').map(c => [c.p, c.zm])) }, base0))); } }
    /* topraklama: bina dış çevresinden 0,5 m dışarıda halka şerit, köşelerde çubuklar, panonun altında bara */
    let topR = null; try { const zc = (+am.z0 || 0) + 1.2, KA = MT.katAlgila({ zc }), dis = KA && KA.brut ? KA.brut.pts : null;
      if (dis && dis.length >= 3) { const ccw = M.polyArea(dis) > 0, n0 = dis.length, off = 0.5, hal = [];
        for (let i = 0; i < n0; i++) { const p0 = dis[(i - 1 + n0) % n0], p1 = dis[i], p2 = dis[(i + 1) % n0], d1 = M.norm([p1[0] - p0[0], p1[1] - p0[1], 0]), d2 = M.norm([p2[0] - p1[0], p2[1] - p1[1], 0]), o1 = ccw ? [d1[1], -d1[0]] : [-d1[1], d1[0]], o2 = ccw ? [d2[1], -d2[0]] : [-d2[1], d2[0]], m = [o1[0] + o2[0], o1[1] + o2[1]], k2 = 1 + o1[0] * o2[0] + o1[1] * o2[1]; hal.push(k2 > 1e-6 ? [p1[0] + m[0] / k2 * off, p1[1] + m[1] / k2 * off] : [p1[0] + o1[0] * off, p1[1] + o1[1] * off]); }
        topR = EL.topraklama({ cevre: KA.brut.cevre, alan: KA.brut.alan, rho: st.rho, cubuk: st.cubuk });
        add(yeniH(Object.assign({ layer: ly('TOPILET'), sys: 'top', pts: hal.concat([hal[0]]), kablo: '30x3.5 Galvanizli Şerit' }, base0)));
        const ks2 = hal.map((p, i) => i).sort((i, j) => (hal[j][0] + hal[j][1]) - (hal[i][0] + hal[i][1])), sec = []; /* çubuklar: halka köşelerine dağıtılır (çapraz köşeler önce) */
        const kos = [0, Math.floor(hal.length / 2), Math.floor(hal.length / 4), Math.floor(3 * hal.length / 4)].concat(hal.map((_, i) => i)); for (const i of kos) { if (sec.length >= topR.cubuk) break; if (!sec.includes(i)) sec.push(i); }
        sec.forEach((i, j) => add(yeniC(Object.assign({ layer: ly('EYAZI'), kind: 'cubuk', sys: 'top', p: hal[i], no: `TE ${j + 1}`, ang: 0 }, base0))));
        const bara = add(yeniC(Object.assign({ layer: ly('EYAZI'), kind: 'bara', sys: 'top', p: nokta(kP, sP, 0), alt: true, ang: Math.atan2(kP.u[1], kP.u[0]), on: kP.n, zm: 0.3, no: 'TB-1' }, base0)));
        let bi = 0, bd = Infinity; hal.forEach((q, i) => { const d = M.dist2(q, bara.p); if (d < bd) { bd = d; bi = i; } }); add(yeniH(Object.assign({ layer: ly('TOPILET'), sys: 'top', pts: [bara.p, hal[bi]], kablo: '' }, base0))); } } catch (er) { console.error(er); uyari.push('Topraklama halkası çizilemedi: ' + (er && er.message || er)); }
    const chg = C.changed; C.changed = () => { }; try { yeni.filter(x => x.type === 'elhat').concat(yeni.filter(x => x.type !== 'elhat')).forEach(x => C.add(x)); } finally { C.changed = chg; } /* hatlar önce: cihaz yazıları üstte */
    C.changed(); C.emit && C.emit('layers');
    /* acil armatür ve aplik linyeye bağlandıktan sonra yük yeniden (rapor ve paftayla aynı sonuç) */
    const D = EL.durum(), Ls2 = D ? D.Ls : Ls, Y2 = D ? D.Y : Y;
    st.son = { kurulu: Y2.kurulu, isletme: Y2.isletme, In: Y2.In, bes: Y2.bes.ad, nLinye: Ls2.length, R: topR ? topR.R : null, t: Date.now() };
    return { n: yeni.length, Ls: Ls2, Y: Y2, topR, H, uyari };
  };

  /* hesap özetini modelden (yerleşmiş cihazlardan) yeniden kur: rapor, pafta, panel */
  EL.durum = () => {
    const st = EL.set(), cs = C.doc.ents.filter(e => e.type === 'elcihaz'); if (!cs.length) return null;
    const by = new Map(); for (const c of cs) if (c.linye && (c.kind === 'armatur' && !(EL.ARMATUR[c.kod] || {}).acil && !(EL.ARMATUR[c.kod] || {}).dis || c.kind === 'priz')) { const o = by.get(c.linye) || { tur: c.kind === 'priz' ? 'priz' : 'isik', n: 0, W: 0, mahal: [], cihaz: [] }; o.n++; o.W += +c.W || 0; const m = oda(c.mid); const ad = m ? (m.no || m.ad) : ''; if (ad && !o.mahal.includes(ad)) o.mahal.push(ad); by.set(c.linye, o); }
    for (const c of cs) if (c.linye && c.kind === 'armatur' && ((EL.ARMATUR[c.kod] || {}).acil || (EL.ARMATUR[c.kod] || {}).dis)) { const o = by.get(c.linye); if (o) o.W += +c.W || 0; }
    const mekEk = cs.filter(c => c.kind === 'mekbes' && +c.W > 0).sort((a, b) => String(a.linye || '').localeCompare(String(b.linye || ''))).map(c => { const m = oda(c.mid); return { ad: c.ad, W: +c.W, faz: c.faz || 1, mek: true, mahal: m ? [m.no || m.ad] : [], cihaz: [{ ref: c }] }; });
    const gr = [...by.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, o]) => o), Ls = EL.linyeler(gr, mekEk.concat(st.ek || []), +st.yedek || 0), Y = EL.yuk(Ls, { div: st.div, L: st.L });
    const top = C.doc.ents.find(e => e.type === 'elhat' && e.sys === 'top' && e.pts.length > 3); let T2 = null;
    if (top) { const pts = top.pts.slice(0, -1), cevre = top.pts.reduce((s, p, i) => i ? s + M.dist2(top.pts[i - 1], p) : 0, 0) - 8 * 0.5, alan = Math.abs(M.polyArea(pts)); T2 = EL.topraklama({ cevre, alan: Math.max(1, alan - cevre * 0.5), rho: st.rho, cubuk: cs.filter(c => c.kind === 'cubuk').length }); }
    return { st, Ls, Y, T: T2, H: EL.mahalHesap(), cs, hatlar: C.doc.ents.filter(e => e.type === 'elhat') };
  };
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : (globalThis.C = globalThis.C || {}));

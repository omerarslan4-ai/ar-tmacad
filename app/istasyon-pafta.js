/* ArıtmaCAD — POMPA İSTASYONU MİMARİ VE MEKANİK PAFTALARI (ISTASYONPAFTA)
   Proje hesabından çizilen 3B istasyondan (C.istasyon3B) statik paftalarla aynı DSİ düzeninde paftalar üretir:
     MİMARİ 1  PLANLAR VE KESİTLER   — üst döşeme (kapak) planı, vana odası kotu planı, A-A ve B-B kesitleri; akslar, ölçüler, kotlar,
                                        kesitlerde modelden okunan malzeme açılımları (yalıtım, kaplama, grobeton …)
     MİMARİ 2  MAHAL LİSTESİ VE KAPAK DETAYLARI — mahal listesi (modelden canlı), kapak çizelgesi, her kapak tipinin planı (1/20),
                                        kapak kenar (çerçeve – ankraj) detayı (1/5) ve malzeme açılımları
     MEKANİK 1 MEKANİK PLAN VE KESİTLER — aynı plan / kesitler mekanik görünüm şablonuyla, mekanik poz numaraları (balon)
     MEKANİK 2 MEKANİK LİSTELER      — mekanik ekipman listesi, boru ve ek parça listesi, vana listesi, pompa çalışma seviyeleri
   Her paftada sağ sütun: genel notlar + DSİ anteti (antet bilgileri statik penceresindeki "Pafta anteti" alanlarından okunur).
   Plan ve kesitler model görünüşüdür (Tasarım planında gizli); komut yeniden çalıştırılınca modelden yeniden üretilir, paftalar güncellenir. */
(function (C) {
  'use strict';
  const M = C.M;
  const PH = () => C.doc.set.projeHesap || {};
  const kotS = v => (v >= 0 ? '+' : '') + (+v).toFixed(2), cmi = v => String(Math.round(v * 100)), f2 = (v, d = 2) => (+v).toFixed(d).replace('.', ',');
  const up = s => String(s || '').toLocaleUpperCase('tr');
  const KATMAN = {
    PFT_CERCEVE: { c: 7, lt: 'CONTINUOUS', lw: 70 }, PFT_TABLO: { c: 7, lt: 'CONTINUOUS', lw: 25 }, PFT_BASLIK: { c: 7, lt: 'CONTINUOUS', lw: 35 }, PFT_YAZI: { c: 7, lt: 'CONTINUOUS', lw: 18 },
    YAZI_KAPAK: { c: 2, lt: 'CONTINUOUS', lw: 25 }, DETAY_KAPAK: { c: 4, lt: 'CONTINUOUS', lw: 35 }, DETAY_KAPAK_INCE: { c: 8, lt: 'CONTINUOUS', lw: 13 }, DETAY_BETON: { c: 7, lt: 'CONTINUOUS', lw: 50 },
    DETAY_BETON_TARAMA: { c: 8, lt: 'CONTINUOUS', lw: 9 }, DETAY_OLCU: { c: 3, lt: 'CONTINUOUS', lw: 13 }, MEK_POZ_IST: { c: 2, lt: 'CONTINUOUS', lw: 18 },
  };
  const katmanlar = () => { for (const [n, k] of Object.entries(KATMAN)) { const L = C.ensureLayer(n, k.c, k.lt, k.lw); if (L) { L.on = true; delete L.frz; } } };

  /* ======================= KAĞIT ÇİZİM ARAÇLARI (kağıt mm) ======================= */
  const yeniCizim = () => {
    const out = [];
    const o = {
      out,
      L: (a, b, ly, lt) => out.push({ k: 'L', a, b, ly: ly || 'PFT_TABLO', ...(lt ? { lt } : {}) }),
      PL: (pts, cl, ly) => out.push({ k: 'P', pts, cl: !!cl, ly: ly || 'PFT_TABLO' }),
      CI: (c, r, ly) => out.push({ k: 'C', c, r, ly: ly || 'PFT_TABLO' }),
      TX: (p, s, h, al, ly, rot) => out.push({ k: 'T', p, s: String(s == null ? '' : s), h: h || 2.5, al: al || 'L', ly: ly || 'PFT_YAZI', rot: rot || 0 }),
      REC: (x0, y0, x1, y1, ly) => o.PL([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true, ly),
    };
    return o;
  };
  const tw_ = (s, h) => String(s).length * h * 0.7; // yaklaşık yazı genişliği
  const sar = (s, h, w) => { const out = []; let cur = ''; for (const wd of String(s).split(' ')) { const t = (cur + ' ' + wd).trim(); if (cur && tw_(t, h) > w) { out.push(cur); cur = wd; } else cur = t; } if (cur) out.push(cur); return out.length ? out : ['']; };

  /* tablo: cols [{t, w, al}], rows [[...]] — üstten aşağı; döner: yükseklik */
  /* o: { h (satır yazısı), hb (sütun başlığı), hBas (tablo başlığı; varsayılan 2,8), lyT / lyB / lyY (çizgi, başlık, yazı katmanı) } — ünite mekanik paftası (unite-mekanik.js) kural tablosundaki boyları verir */
  const tablo = (D, x0, yTop, baslik, cols, rows, o = {}) => {
    const h = o.h || 2.0, hb = o.hb || 2.0, hBas = o.hBas || 2.8, pad = 1.2, X = [x0]; cols.forEach(c => X.push(X[X.length - 1] + c.w)); const xE = X[X.length - 1];
    let y = yTop; D.L([x0, y], [xE, y]); D.TX([(x0 + xE) / 2, y - 5.2 - Math.max(0, hBas - 2.8) / 2], baslik, hBas, 'C', o.lyB || 'PFT_BASLIK'); y -= 7.5 + Math.max(0, hBas - 2.8); D.L([x0, y], [xE, y]); const yB = y;
    const hl = cols.map(c => sar(c.t, hb, c.w - 2 * pad)), hh = Math.max(...hl.map(l => l.length)) * hb * 1.45 + 2.5;
    hl.forEach((ls, i) => ls.forEach((s, k) => D.TX([(X[i] + X[i + 1]) / 2, y - 2.2 - hb - k * hb * 1.45], s, hb, 'C', o.lyY || 'PFT_TABLO')));
    y -= hh; D.L([x0, y], [xE, y]); const yH = y;
    for (const r of rows) {
      const ls = r.map((v, i) => sar(v, h, cols[i].w - 2 * pad)), rh = Math.max(1, ...ls.map(l => l.length)) * h * 1.45 + 2.6;
      ls.forEach((l, i) => l.forEach((s, k) => { const al = cols[i].al || 'C'; D.TX([al === 'L' ? X[i] + pad : al === 'R' ? X[i + 1] - pad : (X[i] + X[i + 1]) / 2, y - 1.5 - h - k * h * 1.45], s, h, al, o.lyY || 'PFT_TABLO'); }));
      y -= rh; D.L([x0, y], [xE, y]);
    }
    for (const x of X) D.L([x, yB], [x, y]); D.L([x0, yTop], [x0, yB]); D.L([xE, yTop], [xE, yB]); void yH;
    return { h: yTop - y, w: xE - x0 };
  };
  /* tabloyu kendi bloğu olarak üret (sol alt köşe 0,0) */
  const tabloBlok = (baslik, cols, rows, o) => { const D = yeniCizim(); const r = tablo(D, 0, 0, baslik, cols, rows, o); D.out.forEach(e => kaydir1(e, 0, r.h)); return { spec: D.out, w: r.w, h: r.h }; };
  const kaydir1 = (e, dx, dy) => { const f = q => q && [q[0] + dx, q[1] + dy]; ['a', 'b', 'c', 'p'].forEach(k => { if (e[k]) e[k] = f(e[k]); }); if (e.pts) e.pts = e.pts.map(f); return e; };

  /* ---- DSİ anteti (statik paftalarla aynı düzen; disiplin harfi ve adı değişir) ---- */
  const ANTET_YUK = 290;
  const antet = (D, x0, y0, W, info) => {
    const { L, TX, REC } = D, X = v => x0 + v, Y = v => y0 + v, wmm = W, x1 = x0 + W;
    const hl = (yy, xa = 0, xb = wmm) => L([X(xa), Y(yy)], [X(xb), Y(yy)]), vl = (xx, ya, yb) => L([X(xx), Y(ya)], [X(xx), Y(yb)]);
    REC(x0, y0, x1, y0 + ANTET_YUK);
    const sat = [['ARŞİV NO', info.arsiv || '', ''], ['TARİH', info.tarih || '', ''], ['KONTROL', info.kontrol || '', info.kontrolUnv || ''], ['ÇİZEN', info.cizen || '', info.cizenUnv || ''], ['YAPAN', info.yapan || '', info.yapanUnv || '']];
    sat.forEach((s, i) => { hl(9 * (i + 1), 0, 0.62 * wmm); TX([X(1.5), Y(9 * i + 3.2)], s[0], 2.0, 'L', 'PFT_TABLO'); TX([X(17), Y(9 * i + 3.2)], s[1], 2.0, 'L', 'PFT_TABLO'); TX([X(45), Y(9 * i + 3.2)], s[2], 1.8, 'L', 'PFT_TABLO'); });
    vl(15.5, 0, 45); vl(43.5, 9, 45); vl(0.62 * wmm - 20, 0, 45); vl(0.62 * wmm, 0, 45); TX([X(0.62 * wmm - 10), Y(13)], 'ÖLÇEK', 2.0, 'C', 'PFT_TABLO'); TX([X(0.62 * wmm - 10), Y(5)], info.olcek, 3.0, 'C', 'PFT_TABLO');
    TX([X(0.62 * wmm + 1.5), Y(41)], 'YÜKLENİCİ', 2.0, 'L', 'PFT_TABLO'); TX([X(0.81 * wmm), Y(30)], info.yuklenici || '', 3.2, 'C', 'PFT_BASLIK'); hl(14, 0.62 * wmm, wmm); TX([X(0.62 * wmm + 1.5), Y(11)], 'RESİM NO :', 1.8, 'L', 'PFT_TABLO'); TX([X(0.81 * wmm), Y(4)], info.resimNo || '', 3.0, 'C', 'PFT_TABLO');
    hl(45);
    vl(wmm - 26, 45, 85); TX([X(wmm - 13), Y(66)], info.harf, info.harf.length > 1 ? 10 : 14, 'C', 'PFT_BASLIK'); TX([X(wmm - 13), Y(53)], info.disiplin, 2.8, 'C', 'PFT_BASLIK');
    TX([X((wmm - 26) / 2), Y(76)], info.kod || '', 4.2, 'C', 'PFT_BASLIK'); TX([X((wmm - 26) / 2), Y(66)], info.yapi || '', 3.6, 'C', 'PFT_BASLIK');
    sar(info.pafta || '', 3.2, wmm - 32).slice(0, 2).forEach((s, i, a) => TX([X((wmm - 26) / 2), Y(55 - i * 5 + (a.length - 1) * 2.5)], s, 3.2, 'C', 'PFT_BASLIK'));
    hl(85);
    (info.proje || '').split('\n').slice(0, 3).forEach((s, i, a) => TX([X(wmm / 2), Y(108 - i * 8 - (3 - a.length) * 4)], s, 3.6, 'C', 'PFT_BASLIK')); hl(115);
    vl(wmm * 0.44, 115, 160); TX([X(1.5), Y(156)], 'İNCELENDİ', 2.0, 'L', 'PFT_TABLO'); TX([X(wmm * 0.44 + 3), Y(156)], 'TASVİP OLUNUR', 2.0, 'L', 'PFT_TABLO'); hl(160);
    TX([X(1.5), Y(163)], info.bolge || '', 2.6, 'L', 'PFT_TABLO'); TX([X(wmm - 2), Y(163)], info.bolgeSehir || '', 2.6, 'R', 'PFT_TABLO'); hl(169);
    vl(wmm * 0.44, 169, 224); TX([X(1.5), Y(220)], 'İNCELENDİ', 2.0, 'L', 'PFT_TABLO'); TX([X(wmm * 0.44 + 3), Y(220)], 'TASDİK OLUNUR', 2.0, 'L', 'PFT_TABLO'); hl(224);
    { const lc = [X(17), Y(240)]; D.CI(lc, 9, 'PFT_TABLO'); TX([lc[0], lc[1] - 2], info.logo || 'DSİ', 5, 'C', 'PFT_BASLIK'); (info.idare || '').split('\n').slice(0, 2).forEach((s, i) => TX([X(32), Y(245 - i * 6)], s, 3.4, 'L', 'PFT_TABLO')); TX([X(wmm - 2), Y(228)], info.sehir || 'ANKARA', 3.2, 'R', 'PFT_TABLO'); }
    hl(256);
    const rv = 262; for (let k = 0; k < 4; k++) hl(rv + k * 7); TX([X(8), Y(rv + 2)], 'YAPAN', 1.8, 'C', 'PFT_TABLO'); TX([X(27), Y(rv + 2)], 'TARİH', 1.8, 'C', 'PFT_TABLO'); TX([X(wmm * 0.55), Y(rv + 2)], 'AÇIKLAMA', 1.8, 'C', 'PFT_TABLO'); TX([X(wmm - 4), Y(rv + 2)], 'R', 1.8, 'C', 'PFT_TABLO');
    vl(17, rv, rv + 28); vl(37, rv, rv + 28); vl(wmm - 8, rv, rv + 28); vl(0, rv, rv + 28); vl(wmm, rv, rv + 28); hl(rv + 28);
  };
  /* not sütunu: başlıklı paragraflar */
  const notSutunu = (D, x0, yTop, gen, bolumler) => {
    let y = yTop; const h = 1.95, sat = 2.95;
    for (const [bas, satirlar, tbl] of bolumler) {
      y -= 6; D.TX([x0, y], bas, 3.2, 'L', 'PFT_BASLIK'); D.L([x0, y - 1.1], [x0 + tw_(bas, 3.2) * 0.95, y - 1.1], 'PFT_BASLIK'); y -= 2.5;
      (satirlar || []).forEach((n, i) => { sar(tbl ? n : `${i + 1} – ${n}`, h, gen).forEach((s, k) => { y -= sat; D.TX([x0 + (k && !tbl ? 4 : 0), y], s, h, 'L'); }); });
      if (tbl) { for (const [a, b] of tbl) { y -= 3.3; D.TX([x0 + 2, y], '• ' + a, 2.05, 'L'); D.TX([x0 + gen * 0.62, y], ': ' + b, 2.05, 'L'); } }
    }
    return y;
  };

  /* ======================= ANTET BİLGİSİ ======================= */
  const antetBilgi = () => {
    let S = null; try { S = JSON.parse(localStorage.getItem('aritmacad.statik.v1') || 'null'); } catch (e) { }
    const rp = Object.assign({}, (S && S.rap) || {}, C.doc.set.istPaftaAntet || {}), pr = (S && S.proj) || {}, P = PH();
    return { rp, pr, P };
  };
  const infoOf = (disiplin, harf, pafta, no, olcek, yapiAd) => {
    const { rp, pr } = antetBilgi();
    return { idare: rp.idare || 'DEVLET SU İŞLERİ GENEL MÜDÜRLÜĞÜ\nİÇMESUYU VE ATIKSU DAİRESİ BAŞKANLIĞI', sehir: rp.idareSehir || 'ANKARA', bolge: rp.bolge || '', bolgeSehir: rp.bolgeSehir || '',
      proje: rp.projeAd || up(pr.tesis || (C.doc.set.name && !/^ads[ıi]z/i.test(C.doc.set.name) ? C.doc.set.name : '')), kod: rp.kod || '', yapi: up(yapiAd), pafta, harf, disiplin, yapan: rp.yapan || pr.hazirlayan || '', yapanUnv: rp.yapanUnv || '', cizen: rp.cizen || '', cizenUnv: rp.cizenUnv || '',
      kontrol: rp.kontrolAd || pr.kontrol || '', kontrolUnv: rp.kontrolUnv || '', tarih: rp.paftaTarih || pr.tarih || '', arsiv: rp.arsiv || '', olcek, yuklenici: rp.yuklenici || '', resimNo: (harf === 'M' ? 'MİM' : 'MEK') + '-' + String(no).padStart(2, '0'), logo: rp.logo || 'DSİ' };
  };

  /* ======================= MODELDEN GÖRÜNÜŞLER ======================= */
  const durum = () => (C.doc.set.istPafta = C.doc.set.istPafta || { gvs: [] });
  const temizle = () => {
    const st = durum(), gs = new Set(st.gvs || []);
    C.doc.ents = C.doc.ents.filter(e => !(e.gv && gs.has(e.gv)) && !e.istPafta);
    for (const nm of st.kesitler || []) if (C.doc.set.kesitMeta) delete C.doc.set.kesitMeta[nm];
    st.gvs = []; st.kesitler = [];
  };
  const extOf = (gv, sc) => { const ents = C.doc.ents.filter(e => e.gv === gv); for (const e of ents) delete e._c; const bb = C.withAnno ? C.withAnno(sc, () => C.extents(ents)) : C.extents(ents); for (const e of ents) delete e._c; return bb; };
  /* o (ünite mekanik paftası için; istasyonda boş): { kv: ['GIZLI=E', 'POZ=H'] KESITAL seçenekleri, onek: görünüm grubu öneki, acilim: false (malzeme açılımı yok),
     durum: false (istasyon durumuna yazılmaz) } */
  const kesitAl = async (nm, a, b, sp, depth, yer, o = {}) => {
    const once = new Set(C.doc.ents.map(e => e.id)), q0 = C.cmd.queue, def = C.cmds.SECTION || C.cmds.KESITAL;
    C.cmd.queue = [...(o.kv || []), `${a[0]},${a[1]}`, `${b[0]},${b[1]}`, `${sp[0]},${sp[1]}`, String(depth), nm, `${yer[0]},${yer[1]}`];
    try { await def.fn(C.I, C); } finally { C.cmd.queue = q0 || []; }
    const gv = (o.onek || 'IST_KESIT_') + nm + '_' + Date.now().toString(36), yeni = C.doc.ents.filter(e => !once.has(e.id));
    for (const e of yeni) { delete e.sp; delete e.sv2; delete e._c; if (e.type === 'kesitisaret') { e.istPafta = true; continue; } e.gv = gv; }
    C.doc.ents = C.doc.ents.filter(e => !(e.gv === gv && e.type === 'pozno')); // poz balonları istasyon numaralamasıyla yeniden konur
    const km = (C.doc.set.kesitMeta || {})[nm];
    if (o.acilim !== false && km && C.malzemeAcilimOto) { const o2 = new Set(C.doc.ents.map(e => e.id)); try { C.malzemeAcilimOto(Object.assign({ nm }, km)); } catch (er) { console.error('malzeme açılımı', er); } for (const e of C.doc.ents) if (!o2.has(e.id)) { e.gv = gv; e.dis = 'Mimari'; delete e.sp; } acilimDuzen(gv, km); }
    if (o.durum !== false) durum().kesitler.push(nm);
    return { gv, km, n: yeni.length, yeni };
  };

  /* kesit açılımlarını kesitin iki yanında, ölçü ve kotların dışında, üst üste binmeden sırala */
  const acilimDuzen = (gv, km, sc = 50) => {
    if (C.pstil && C.pstil() && C.acilimEtiketKural) return; /* pafta stili (Çokal R2): kodlar elemanın yanında kalır, her parça kendi kodunu taşır (mimari.js → autoSection) */
    let A = C.doc.ents.filter(e => e.gv === gv && e.type === 'acilim'); if (!A.length) return;
    const seen = new Set(); if (km) C.doc.ents = C.doc.ents.filter(e => { if (e.gv !== gv || e.type !== 'acilim') return true; const k = (e.lines || []).join('|') + '|' + (e.a[0] < km.q0[0] + (km.ub[0] + km.ub[2]) / 2); if (seen.has(k)) return false; seen.add(k); return true; });
    A = C.doc.ents.filter(e => e.gv === gv && e.type === 'acilim');
    if ((C.doc.set.acilimStil || 'DIK') !== 'DIK') { // eski (oklu) stil: kesitin iki yanında sütun
      const k = sc / 1000, lsp = (C.doc.set.acilimH || 1.8) * k * 1.75; let x0 = Infinity, x1 = -Infinity;
      for (const e of C.doc.ents) if (e.gv === gv && /^KESIT_(PERDE|TEMEL|RADYE|DOSEME|GROBETON)/.test(e.layer || '') && (e.type === 'pline' || e.type === 'line')) for (const q of e.pts || [e.a, e.b]) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); }
      if (!isFinite(x0)) return; const mid = (x0 + x1) / 2;
      for (const sd of [-1, 1]) { const L = A.filter(e => (e.a[0] < mid) === (sd < 0)).sort((p, q) => q.a[1] - p.a[1]); let yPrev = Infinity; const px = sd < 0 ? x0 - 40 * k : x1 + 34 * k;
        for (const e of L) { const h = Math.max(1, (e.lines || []).length) * lsp, yy = Math.min(e.a[1] + h * 0.35, yPrev); e.p = [px, yy, 0]; e.side = sd; delete e._c; yPrev = yy - h - lsp * 0.9; } }
      return;
    }
    /* dik stil: yazı yığınları birbirinin üstüne binmesin (yığınlar yukarı kaydırılır); radye açılımı pompaların üstünden başlar */
    const k = sc / 1000, th = (C.doc.set.acilimH || 1.8) * k, lsp = th * 1.8, kutular = [];
    A.sort((p, q) => p.a[1] - q.a[1]);
    for (const e of A) {
      const ln = e.lines || [], n = Math.max(1, ln.length), w = Math.max(...ln.map(t => t.length), 4) * th * 0.72 + th * 1.5, sd = e.side || 1, duvar = ln.some(t => /perde|duvar/i.test(t)) && !ln.some(t => /radye|döşeme|zemin kaplama/i.test(t));
      const xa = duvar ? e.a[0] + sd * th * 3 : e.a[0], bx0 = sd > 0 ? xa : xa - w, bx1 = sd > 0 ? xa + w : xa, h = n * lsp;
      let yb = e.a[1] + (duvar ? th * 1.5 : th * 2.5) + (ln.some(t => /radye/i.test(t)) && !duvar ? 0.9 : 0);
      for (let g = 0; g < 60; g++) { const c = kutular.find(b => bx0 < b[2] && bx1 > b[0] && yb < b[3] + lsp * 0.4 && yb + h > b[1] - lsp * 0.4); if (!c) break; yb = c[3] + lsp * 0.6; }
      kutular.push([bx0, yb, bx1, yb + h]);
      e.p = [e.p[0], duvar ? yb + (n - 1) * lsp : yb, 0]; delete e._c;
    }
  };

  /* ======================= MEKANİK POZ LİSTESİ (modelden) ======================= */
  const PNof = Hm => (Hm > 90 ? 'PN25' : Hm > 60 ? 'PN16' : 'PN10');
  const pozListesi = (ents, y, r) => {
    const P = PH(), items = [], pn = PNof(r ? r.Hm : 20);
    const add = (grup, key, o, n, yer) => { let it = items.find(x => x.key === key); if (!it) { it = Object.assign({ key, grup, miktar: 0, yerler: [] }, o); items.push(it); } it.miktar += n; if (yer) it.yerler.push(yer); return it; };
    const pompalar = ents.filter(e => (e.type === 'aile' && e.hk === 'pompa') || (e.type === 'pump'));
    for (const e of pompalar) {
      let tanim = 'Dalgıç pompa (ıslak tip)', oz = '', marka = '';
      if (e.type === 'aile') { const q = C.aileDeger(e.fam, null, e.par) || {}, F = (C.AILELER[e.fam] || {}).ad || ''; marka = /KSB/.test(F) ? 'KSB' : /Wilo/i.test(F) ? 'Wilo' : /Grundfos/i.test(F) ? 'Grundfos' : ''; oz = [q.secBoy ? `${marka} ${q.secBoy}`.trim() : F.replace(/^.*—\s*/, ''), q.secMot ? 'motor ' + q.secMot : '', r ? `Q = ${f2(r.Qp, 1)} l/s, Hm = ${f2(r.Hm, 1)} m` : '', q.DN2 ? `basma DN${q.DN2}` : ''].filter(Boolean).join(' · '); }
      else oz = r ? `Q = ${f2(r.Qp, 1)} l/s, Hm = ${f2(r.Hm, 1)} m` : '';
      add('ekipman', 'pompa', { tanim, oz: oz + (P.Nasil ? ` — ${P.Nasil} asıl + ${P.Nyedek || 0} yedek` : ''), birim: 'adet' }, 1, { p: [e.p[0], e.p[1], (y.zFloor || 0) + 0.45], e });
      if (e.type === 'aile' && (!e.par || e.par.kur !== 'SB')) add('ekipman', 'ray', { tanim: 'Otomatik bağlantı sistemi', oz: 'Ördek ayağı (basma dirseği, pompa çıkışına flanşlı) + paslanmaz çift kılavuz ray, üst ray tutucu ve ankrajları', birim: 'takım' }, 1, null);
    }
    if (pompalar.length) add('ekipman', 'zincir', { tanim: 'Pompa kaldırma zinciri', oz: 'AISI 316 paslanmaz, pompa ağırlığına uygun, kilit halkalı (her pompa için)', birim: 'adet' }, pompalar.length, null);
    // borular
    const borular = ents.filter(e => e.type === 'pipe');
    const plen = e => { const pts = (C.pipePath ? C.pipePath(e).pts : e.pts.map(M.p3)); let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], (pts[i][2] || 0) - (pts[i - 1][2] || 0)); return s; };
    const kalOf = e => e.kalite || ((borular.find(x => x.cins === e.cins && x.dn === e.dn && x.kalite) || {}).kalite) || '';
    for (const e of borular) {
      const o = C.boruOlcu ? C.boruOlcu(e.cins, e.sinif, e.dn) : null, cAd = o && o.c ? o.c.ad : (e.mat || e.cins), std = o && o.c ? o.c.std : '';
      const kal = kalOf(e) ? ' — ' + kalOf(e) : '', key = `boru|${e.cins}|${e.sinif}|${e.dn}|${kalOf(e)}`;
      add('boru', key, { tanim: `Boru ${e.cins === 'pvck' || /PVC/i.test(cAd) ? 'Ø' + (e.od || e.dn) : 'DN' + e.dn}`, oz: `${cAd}${kal}, ${e.sinif || ''} (Ø${e.od}×${f2(e.t, 1)})${std ? ' · ' + std : ''}`, dn: e.dn, birim: 'm', top: e.hk === 'kollektor' ? 'Kollektör' : e.hk === 'basma' ? 'Basma' : 'Giriş' }, plen(e), { p: C.pozAnchor ? C.pozAnchor(e) : M.p3(e.pts[0]), e });
    }
    items.filter(i => i.grup === 'boru').forEach(i => { i.miktar = Math.ceil(i.miktar * 10) / 10; });
    // ek parçalar: dirsekler (boru köşeleri), te (kollektöre bağlantı), kör flanş, flanşlar, duvar geçişleri
    const kol = borular.find(e => e.hk === 'kollektor'), cinsAd = e => (C.boruOlcu && C.boruOlcu(e.cins, e.sinif, e.dn) || {}).c ? (C.boruOlcu(e.cins, e.sinif, e.dn).c.mat || '') : (e.mat || '');
    for (const e of borular) { const pts = e.pts.map(M.p3); for (let i = 1; i < pts.length - 1; i++) { const a = M.sub(pts[i], pts[i - 1]), b = M.sub(pts[i + 1], pts[i]), la = M.len(a), lb = M.len(b); if (la < 1e-6 || lb < 1e-6) continue; const cs = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / la / lb, ang = Math.round(Math.acos(Math.max(-1, Math.min(1, cs))) * 180 / Math.PI); if (ang < 5) continue; const ad = Math.abs(ang - 90) < 3 ? 90 : Math.abs(ang - 45) < 3 ? 45 : ang;
      add('ekparca', `dirsek|${ad}|${e.dn}|${e.cins}`, { tanim: `Dirsek ${ad}° DN${e.dn}`, oz: `${cinsAd(e)}${e.kalite ? ' ' + e.kalite : ''}, kaynaklı, uzun yarıçaplı (3D)`, dn: e.dn, birim: 'adet' }, 1, { p: pts[i], e }); } }
    if (kol) { const k0 = M.p3(kol.pts[0]), k1 = M.p3(kol.pts[kol.pts.length - 1]), u = M.norm(M.sub(k1, k0)), rk = (kol.od || kol.dn) / 2000;
      for (const e of borular) { if (e === kol || e.hk !== 'basma') continue; const q = M.p3(e.pts[e.pts.length - 1]), t = M.sub(q, k0), s = t[0] * u[0] + t[1] * u[1] + t[2] * u[2], pr = M.add(k0, M.mul(u, s)), d = M.len(M.sub(q, pr)); if (d > rk + 0.05 || s < -0.01) continue;
        add('ekparca', `te|${kol.dn}|${e.dn}`, { tanim: kol.dn === e.dn ? `Eşit te DN${kol.dn}` : `Redüksiyonlu te DN${kol.dn}×DN${e.dn}`, oz: `${cinsAd(kol)}${kol.kalite ? ' ' + kol.kalite : ''}, kaynaklı (kollektör bağlantısı)`, dn: kol.dn, birim: 'adet' }, 1, { p: pr, e: kol }); }
      add('ekparca', `kor|${kol.dn}`, { tanim: `Kör flanş DN${kol.dn}`, oz: `EN 1092-1 tip 05, ${pn} (kollektör başı)`, dn: kol.dn, birim: 'adet' }, 1, { p: k0, e: kol });
    }
    const vanalar = ents.filter(e => e.type === 'valve'), flans = new Map(), fl = (dn, n) => flans.set(dn, (flans.get(dn) || 0) + n);
    for (const v of vanalar) fl(v.dn, 2);
    for (const e of pompalar) { const b = borular.find(p => p.hk === 'basma' && Math.hypot(p.pts[0][0] - e.p[0], p.pts[0][1] - e.p[1]) < 0.8); if (b) fl(b.dn, 1); }
    if (kol) { fl(kol.dn, 2); } // kollektör çıkışı (iletim hattına) + kör flanş karşılığı
    for (const [dn, n] of [...flans].sort((a, b) => a[0] - b[0])) add('ekparca', `flans|${dn}`, { tanim: `Kaynak boyunlu flanş DN${dn}`, oz: `EN 1092-1 tip 11, ${pn}; conta (EPDM) ve paslanmaz cıvata-somun takımı ile`, dn, birim: 'adet' }, n, null);
    // duvar geçişleri: perdelerdeki boru boşlukları
    for (const w of ents.filter(e => e.type === 'perde' && Array.isArray(e.bosluk3))) for (const bs of w.bosluk3) {
      const xs = bs.pts.map(q => q[0]), ys = bs.pts.map(q => q[1]), c = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, bs.pts[0][2] + (bs.d[2] || 0) / 2];
      let best = null, bd = Infinity; for (const e of borular) { const pts = e.pts.map(M.p3); for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], ab = M.sub(b, a), l2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2]; let t = l2 ? ((c[0] - a[0]) * ab[0] + (c[1] - a[1]) * ab[1] + (c[2] - a[2]) * ab[2]) / l2 : 0; t = Math.max(0, Math.min(1, t)); const d = M.len(M.sub(c, M.add(a, M.mul(ab, t)))); if (d < bd) { bd = d; best = e; } } }
      if (!best || bd > 0.3) continue;
      add('ekparca', `gecis|${best.dn}|${best.cins}`, { tanim: `Duvar geçiş parçası ${best.cins === 'pvck' ? 'Ø' + best.od : 'DN' + best.dn}`, oz: `${cinsAd(best) || 'Boru'} gövdeli, su tutucu (puddle) flanşlı, L = perde kalınlığı; beton dökümünden önce yerleştirilir`, dn: best.dn, birim: 'adet' }, 1, { p: c, e: best });
    }
    // vanalar
    for (const v of vanalar) {
      const ad = C.vanaAdi ? C.vanaAdi(v) : (v.kind || 'Vana'), cek = v.kind === 'cekvalf', kum = cek ? (v.alt === 'klapeli' ? 'Karşı ağırlıklı kol' : '—') : (v.kind === 'kelebek' ? (v.dn >= 200 ? 'Redüktörlü el volanı' : 'Kollu (kilitlenebilir)') : 'El volanlı');
      add('vana', `vana|${v.kind}|${v.alt || ''}|${v.dn}`, { tanim: ad, tip: cek ? 'Geri döndürmez' : 'Ayırma (kesme)', dn: v.dn, pn, bag: 'Flanşlı, EN 1092-1', kum, govde: cek ? 'GGG-40 sfero döküm, epoksi kaplı' : 'GGG-40 sfero döküm, epoksi kaplı, EPDM sızdırmazlık', birim: 'adet' }, 1, { p: M.p3(v.p), e: v });
    }
    const sira = { ekipman: 0, boru: 1, ekparca: 2, vana: 3 }; items.sort((a, b) => sira[a.grup] - sira[b.grup]); items.forEach((it, i) => { it.poz = i + 1; });
    return items;
  };

  /* poz balonları: görünüşe dönüştürülmüş noktalar (W). items: [{ poz, yerler: [{ p, e }] }].
     o (ünite mekanik paftası; istasyonda boş): { her: true → her yere balon (yoksa görünümde her poz bir kez), ayni: (q, it) → aynı yer anahtarı (bir kez konur),
     used: önceden dolu engel listesi (ekipman yazıları; pozno.js biçimi { p, q }), layer } */
  const balonlar = (items, gv, W, filtre, o = {}) => {
    const used = o.used || [], kon = [], ayni = new Set(); let n = 0;
    for (const it of items) for (const y of it.yerler) {
      if (filtre && !filtre(y.p)) continue; const q = W(y.p); if (!q) continue;
      if (o.her) { const k = o.ayni ? o.ayni(q, it) : null; if (k != null) { if (ayni.has(k)) continue; ayni.add(k); } }
      else { if (kon.some(k => k.n === it.poz)) continue; kon.push({ n: it.poz, q }); }
      if (C.pozBalon) { C.pozBalon([q[0], q[1], 0], it.poz, y.e ? y.e.id : null, { gv, layer: o.layer || 'MEK_POZ_IST', auto: true }, used); n++; }
    }
    return n;
  };

  /* ======================= KAPAK DETAYLARI (model ölçüsünde, görünüş grubu) ======================= */
  const detayCizer = (gv, sc) => {
    const k = sc / 1000, mk = (type, p) => { const e = C.add(C.newEnt(type, Object.assign({ gv }, p))); delete e.sp; delete e.sv2; return e; };
    const o = {
      L: (a, b, ly, lt) => mk('line', { a: [a[0], a[1], 0], b: [b[0], b[1], 0], layer: ly || 'DETAY_KAPAK', ...(lt ? { lt } : {}) }),
      PL: (pts, cl, ly, lt) => mk('pline', { pts: pts.map(q => [q[0], q[1], 0]), closed: !!cl, layer: ly || 'DETAY_KAPAK', ...(lt ? { lt } : {}) }),
      REC: (x0, y0, x1, y1, ly, lt) => o.PL([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true, ly, lt),
      CI: (c, r, ly) => mk('circle', { c: [c[0], c[1], 0], r, layer: ly || 'DETAY_KAPAK' }),
      TX: (p, s, hmm, al, ly, rot) => mk('text', { p: [p[0], p[1], 0], h: hmm * k, s: String(s), rot: rot || 0, al: al || 'L', layer: ly || 'YAZI_KAPAK', ann: false }),
      DM: (a, b, dir, offmm, txt) => { const off = offmm * k, p = dir === 'h' ? [a[0], a[1] + off, 0] : [a[0] + off, a[1], 0]; return mk('dim', { k: dir === 'v' ? 'v' : 'h', a: [a[0], a[1], 0], b: [b[0], b[1], 0], p, txt, layer: 'DETAY_OLCU' }); },
      ACL: (a, p, lines) => mk('acilim', { a: [a[0], a[1], 0], p: [p[0], p[1], 0], lines, side: p[0] >= a[0] ? 1 : -1, dis: 'Mimari', layer: 'MALZEME_ACILIM' }),
      BAS: (cx, yb, s, dmm) => mk(C.T.baslik ? 'baslik' : 'text', C.T.baslik ? { p: [cx, yb - (dmm || 12) * k, 0], ay: yb, dmm: dmm || 12, s, hp: 4.5, layer: 'YAZI' } : { p: [cx, yb - 10 * k, 0], h: 4.5 * k, s, al: 'C', layer: 'YAZI' }),
      // 45° tarama (dikdörtgen bölgeler)
      TARA: (rects, aralikmm, ly) => { const ad = (aralikmm || 2.2) * k; const xs = rects.flatMap(r => [r[0], r[2]]), ys = rects.flatMap(r => [r[1], r[3]]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        for (let cc = Math.floor((x0 - y1) / ad) * ad; cc < x1 - y0; cc += ad) for (const r of rects) { const ta = Math.max(r[0], r[1] + cc), tb = Math.min(r[2], r[3] + cc); if (tb > ta + 1e-6) o.L([ta, ta - cc], [tb, tb - cc], ly || 'DETAY_BETON_TARAMA'); } },
    };
    return o;
  };
  /* kapak planı (1/20): w = kısa kenar (x), l = uzun kenar (y); kapak tipi ve detay başlığı */
  const kapakPlani = (t, base, gv, sc) => {
    const D = detayCizer(gv, sc), X = (x, y) => [base[0] + x, base[1] + y], w = t.w, l = t.l, f = 0.05, bt = 0.30;
    const cift = w > 1.0 || l > 1.6, kan = cift ? 2 : 1;
    // beton döşeme (kırık kenarlı) + tarama
    const rects = [[-bt, -bt, w + bt, 0], [-bt, l, w + bt, l + bt], [-bt, 0, 0, l], [w, 0, w + bt, l]].map(r => [base[0] + r[0], base[1] + r[1], base[0] + r[2], base[1] + r[3]]);
    D.TARA(rects, 2.2); D.REC(...X(0, 0), ...X(w, l), 'DETAY_BETON');
    D.PL([X(-bt, -bt), X(w + bt, -bt), X(w + bt, l + bt), X(-bt, l + bt)], true, 'DETAY_KAPAK_INCE', 'DASHED');
    // çerçeve (L50.50.5 iç kenar) ve kapak
    D.REC(...X(f, f), ...X(w - f, l - f), 'DETAY_KAPAK_INCE', 'HIDDEN'); // net geçiş
    D.REC(...X(0.008, 0.008), ...X(w - 0.008, l - 0.008), 'DETAY_KAPAK');
    if (cift) D.L(X(w / 2, 0.008), X(w / 2, l - 0.008), 'DETAY_KAPAK');
    // alt takviyeler (L40.40.4) — kesikli
    const nT = Math.max(1, Math.ceil(l / 0.6) - 1); for (let i = 1; i <= nT; i++) { const yy = l * i / (nT + 1); D.L(X(0.06, yy), X(w - 0.06, yy), 'DETAY_KAPAK_INCE', 'HIDDEN'); }
    // menteşeler (dış uzun kenarlarda), kulp ve kilit (serbest kenar)
    const nM = l > 1.2 ? 3 : 2, mY = i => l * (i + 1) / (nM + 1);
    for (let i = 0; i < nM; i++) { D.REC(...X(-0.02, mY(i) - 0.05), ...X(0.03, mY(i) + 0.05), 'DETAY_KAPAK'); if (cift) D.REC(...X(w - 0.03, mY(i) - 0.05), ...X(w + 0.02, mY(i) + 0.05), 'DETAY_KAPAK'); }
    const kulp = xx => { D.REC(...X(xx - 0.02, l / 2 - 0.07), ...X(xx + 0.02, l / 2 + 0.07), 'DETAY_KAPAK'); D.CI(X(xx, l / 2 + 0.16), 0.018, 'DETAY_KAPAK'); };
    if (cift) { kulp(w / 2 - 0.09); kulp(w / 2 + 0.09); } else kulp(w - 0.10);
    // yazılar
    D.TX(X(w / 2, l * 0.80), `${t.ad}`, 5, 'C', 'YAZI_KAPAK');
    D.TX(X(w / 2, l * 0.80 - 7 * sc / 1000), cift ? 'ÇİFT KANATLI' : 'TEK KANATLI', 2.5, 'C', 'YAZI_KAPAK'); // 2,5 mm: kuralın yazı boylarından (2 / 2,5 / 3)
    // ölçüler
    D.DM(X(0, 0), X(w, 0), 'h', -7, cmi(w)); D.DM(X(f, 0), X(w - f, 0), 'h', -7 - 250 / sc, cmi(w - 2 * f) + ' (net geçiş)'); // sıralar arası modelde 0,25 m (firma kuralı 14.11.2026): 1/20'de 12,5 mm
    D.DM(X(0, 0), X(0, l), 'v', -7, cmi(l)); D.DM(X(0, f), X(0, l - f), 'v', -7 - 250 / sc, cmi(l - 2 * f));
    // 1-1 kesit işareti
    const yk = l * 0.35; D.L(X(-bt - 0.05, yk), X(-bt + 0.08, yk), 'DETAY_KAPAK'); D.L(X(w + bt - 0.08, yk), X(w + bt + 0.05, yk), 'DETAY_KAPAK'); D.TX(X(-bt - 0.05, yk + 0.03), '1', 3, 'C', 'YAZI_KAPAK'); D.TX(X(w + bt + 0.05, yk + 0.03), '1', 3, 'C', 'YAZI_KAPAK');
    D.BAS(base[0] + w / 2, base[1] - bt - 0.02, `${t.ad} KAPAĞI PLANI (${cmi(w)}×${cmi(l)})`, 22);
    return { cift, kan };
  };
  /* kapak kenar detayı (1/5): döşeme kesiti, L50.50.5 çerçeve, ankraj laması, 8 mm baklavalı sac, L40.40.4 takviye */
  const kenarDetay = (base, gv, sc, ts) => {
    const D = detayCizer(gv, sc), X = (x, y) => [base[0] + x, base[1] + y], Bx = 0.32, Wk = 0.30;
    // beton (sol) + kırık çizgi
    D.PL([X(-Bx, -ts), X(0, -ts), X(0, 0), X(-Bx, 0)], false, 'DETAY_BETON');
    D.PL([X(-Bx, 0), X(-Bx - 0.015, -ts * 0.4), X(-Bx + 0.015, -ts * 0.6), X(-Bx, -ts)], false, 'DETAY_KAPAK_INCE');
    D.TARA([[base[0] - Bx, base[1] - ts, base[0], base[1]]], 2.0);
    // L50.50.5 çerçeve: düşey kol beton yüzünde, yatay kol (oturma) içeri
    D.PL([X(0, 0), X(0.005, 0), X(0.005, -0.045), X(0.05, -0.045), X(0.05, -0.05), X(0, -0.05)], true, 'DETAY_KAPAK');
    // ankraj laması 30×5 (betona)
    D.PL([X(0, -0.028), X(-0.15, -0.028), X(-0.15, -0.075), X(-0.145, -0.075), X(-0.145, -0.033), X(0, -0.033)], true, 'DETAY_KAPAK');
    // kapak sacı 8 mm (baklavalı) + L40.40.4 kenar takviyesi
    D.PL([X(0.008, 0), X(Wk, 0), X(Wk, -0.008), X(0.008, -0.008)], true, 'DETAY_KAPAK');
    for (let x = 0.02; x < Wk - 0.005; x += 0.025) D.L(X(x, 0), X(x + 0.008, 0.0035), 'DETAY_KAPAK_INCE'); // baklava deseni (yüzey kabartması)
    D.PL([X(0.009, -0.008), X(0.049, -0.008), X(0.049, -0.012), X(0.013, -0.012), X(0.013, -0.045), X(0.009, -0.045)], true, 'DETAY_KAPAK');
    D.L(X(0.06, -0.048), X(Wk, -0.048), 'DETAY_KAPAK_INCE', 'HIDDEN'); // ara takviye (görünen)
    // kırık kapak ucu
    D.PL([X(Wk, 0.01), X(Wk - 0.008, -0.004), X(Wk + 0.008, -0.012), X(Wk, -0.025)], false, 'DETAY_KAPAK_INCE');
    // menteşe pimi (sembol)
    D.CI(X(0.004, 0.008), 0.006, 'DETAY_KAPAK');
    // ölçüler
    D.DM(X(-0.15, -0.075), X(0, -0.075), 'h', -9, '15');
    D.DM(X(-Bx, 0), X(-Bx, -ts), 'v', -8, cmi(ts)); D.DM(X(0.05, 0), X(0.05, -0.05), 'v', 10, '5');
    // malzeme açılımları
    const ax = Wk + 0.12;
    D.ACL(X(0.16, -0.004), X(ax, 0.10), ['8/10 mm baklavalı DKP sac kapak', 'sıcak daldırma galvaniz (min. 70 µm)']);
    D.ACL(X(0.011, -0.03), X(ax, 0.03), ['L40.40.4 kenar ve ara takviye (@ ≤ 60 cm)']);
    D.ACL(X(0.03, -0.0475), X(ax, -0.03), ['L50.50.5 galvaniz çerçeve (betona gömülü)']);
    D.ACL(X(-0.10, -0.0305), X(ax, -0.09), ['30×5 lama ankraj L = 15 cm, @ 40 cm', '(çerçeveye kaynaklı)']);
    D.ACL(X(-0.22, -ts * 0.7), X(ax, -Math.max(0.17, ts * 0.8)), [`Betonarme döşeme C30/37, ${cmi(ts)} cm`]);
    D.ACL(X(0.004, 0.008), X(-Bx - 0.04, 0.10), ['Paslanmaz menteşe (gömme)']);
    D.BAS(base[0] - 0.01, base[1] - ts - 0.02, 'KAPAK KENAR DETAYI (1-1, TÜM TİPLER)', 16);
  };

  /* ======================= PAFTA YERLEŞİMİ ======================= */
  const PH_MM = 594, MARJ = { l: 20, r: 10, t: 10, b: 10 }, SUT = 185, IC = PH_MM - MARJ.t - MARJ.b - 8, SCF = 50, KF = SCF / 1000;
  const paftaKur = (anahtar, grp, ad, bloklar, notlar, info, O) => {
    // sütun yerleşimi
    const cols = []; let cur = { w: 0, h: 0, items: [] };
    for (const b of bloklar) { const w = b.w + 10, h = b.h + 10; if (cur.items.length && cur.h + h > IC) { cols.push(cur); cur = { w: 0, h: 0, items: [] }; } cur.items.push({ b, w, h, y: cur.h }); cur.h += h; cur.w = Math.max(cur.w, w); }
    cols.push(cur);
    const cizW = cols.reduce((s, c) => s + c.w, 0), PW = Math.max(420, Math.ceil(MARJ.l + 8 + cizW + SUT + MARJ.r + 6));
    const D = yeniCizim(), fx0 = MARJ.l, fy0 = MARJ.b, fx1 = PW - MARJ.r, fy1 = PH_MM - MARJ.t;
    D.REC(fx0, fy0, fx1, fy1, 'PFT_CERCEVE'); D.REC(0, 0, PW, PH_MM, 'PFT_TABLO'); const sx = fx1 - SUT; D.L([sx, fy0], [sx, fy1], 'PFT_CERCEVE');
    const vps = []; let cx = fx0 + 6;
    for (const col of cols) {
      for (const it of col.items) {
        const b = it.b, x = cx + (col.w - it.w) / 2 + 5, yTop = fy1 - 6 - it.y - 5, y = yTop - b.h;
        if (b.spec) for (const e of b.spec) D.out.push(kaydir1(JSON.parse(JSON.stringify(e)), x, y));
        if (b.g3) vps.push({ _yeni: false, x, y: y + 10, w: b.w, h: b.h - 10, cx: 0, cy: 0, scale: 100, lock: true, frame: { on: false }, g3: Object.assign({}, b.g3), label: b.label });
        if (b.vp) vps.push({ x, y, w: b.w, h: b.h, cx: (b.bb[0] + b.bb[2]) / 2, cy: (b.bb[1] + b.bb[3]) / 2, scale: b.sc, gvOnly: b.gv, frame: { on: false }, lock: true, ...(b.dis ? { disiplin: b.dis } : {}) });
      }
      cx += col.w;
    }
    antet(D, sx + 2, fy0 + 2, SUT - 4, info);
    notSutunu(D, sx + 4, fy1 - 2, SUT - 8, notlar);
    // kağıt çizimini modele aktar (K ölçeğinde, O noktasında)
    const gv = 'IST_PAFTA_' + anahtar + '_' + Date.now().toString(36); durum().gvs.push(gv);
    const P = q => [O[0] + q[0] * KF, O[1] + q[1] * KF, 0];
    const chg0 = C.changed; C.changed = () => { };
    try { for (const e of D.out) { const kk = KATMAN[e.ly] || {}, base = { color: kk.c != null ? kk.c : 7, lt: e.lt || kk.lt || 'CONTINUOUS', lw: kk.lw != null ? kk.lw : 25, gv, layer: e.ly };
      let n = null; if (e.k === 'L') n = C.newEnt('line', Object.assign(base, { a: P(e.a), b: P(e.b) })); else if (e.k === 'P') n = C.newEnt('pline', Object.assign(base, { pts: e.pts.map(P), closed: !!e.cl })); else if (e.k === 'C') n = C.newEnt('circle', Object.assign(base, { c: P(e.c), r: e.r * KF })); else if (e.k === 'T') n = C.newEnt('text', Object.assign(base, { p: P(e.p), h: e.h * KF, s: e.s, rot: e.rot || 0, al: e.al || 'L', ann: false }));
      if (n) { const x = C.add(n); if (x) { delete x.sp; delete x.sv2; } } } } finally { C.changed = chg0; }
    // pafta (düzen)
    const lays = C.doc.layouts = C.doc.layouts || []; let L = lays.find(x => x.istPafta === anahtar);
    if (!L) { const gp = C.grpCur; C.grpCur = grp; L = C.newLayout(ad, 'A1', 'L'); C.grpCur = gp; }
    Object.assign(L, { grp, istPafta: anahtar, name: ad, size: 'OZEL', pw: PW, ph: PH_MM, orient: 'L', noTitle: true, margin: { l: 0, r: 0, t: 0, b: 0 } });
    L.f = Object.assign(L.f || {}, { proje: info.proje, baslik: info.yapi + ' — ' + info.pafta, no: info.resimNo });
    L.vps = [{ x: 0, y: 0, w: PW, h: PH_MM, cx: O[0] + PW * KF / 2, cy: O[1] + PH_MM * KF / 2, scale: SCF, gvOnly: gv, frame: { on: false }, lock: true }, ...vps];
    { const s = C.doc.set; s.grups = s.grups || []; if (!s.grups.includes(grp)) s.grups.push(grp); }
    return { L, PW };
  };
  const vpBlok = (gv, sc, dis) => { const bb = extOf(gv, sc); if (!bb || !isFinite(bb[0])) return null; const kk = sc / 1000;
    for (const e of C.doc.ents) if (e.gv === gv && e.type === 'baslik') { if (e.ay != null && e.dmm != null) { e.p = [e.p[0], e.ay - e.dmm * kk, 0]; delete e.ay; delete e.dmm; delete e._c; } const hp = e.hp || 5, yb = e.p[1] - hp * 1.9 * kk, hw = tw_(e.s, hp) * kk / 2 + 2 * kk; bb[1] = Math.min(bb[1], yb); bb[0] = Math.min(bb[0], e.p[0] - hw); bb[2] = Math.max(bb[2], e.p[0] + hw); } const k = 1000 / sc; return { vp: true, gv, sc, dis, bb, w: (bb[2] - bb[0]) * k, h: (bb[3] - bb[1]) * k }; };

  /* ======================= NOTLAR ======================= */
  const notMimari = (y, r) => {
    const P = PH();
    return [['GENEL NOTLAR :', [
      'Ölçüler cm, kotlar m cinsindendir. Kotlar proje kotlarıdır (±0.00 = tabii zemin / yol kotu).',
      'Betonarme elemanlar C30/37 (su yapısı, sülfata dayanıklı çimento), donatı B500C; kalıp ve donatı ayrıntıları statik paftalardadır.',
      'Temel altında 10 cm grobeton (C16/20), bitümlü su yalıtım örtüsü (2 kat, polyester keçeli) ve 5 cm koruma betonu yapılacaktır.',
      `Toprağa gömülü perde dış yüzleri ${kotS(+P.ZG || 0)} kotuna kadar bitümlü su yalıtım örtüsü ve drenaj (koruma) levhası ile kaplanacaktır.`,
      'Islak hazne iç yüzeylerine kristalize su yalıtımı ve üzerine atıksuya dayanıklı epoksi kaplama (2 kat) uygulanacaktır.',
      'Vana odası zemininde 5 cm şap üzerine epoksi zemin kaplaması; duvarlarda epoksi kaplama, tavanda boya yapılacaktır.',
      'Perde boru geçişlerinde su tutucu flanşlı duvar geçiş parçaları beton dökümünden önce yerine konacaktır.',
      'İnşaat derzlerinde PVC su tutucu bant kullanılacaktır.',
      'Kapaklar sıcak daldırma galvanizli, kilitlenebilir ve yüzeyle aynı kotta olacaktır; ayrıntılar kapak detay paftasındadır.',
      'Vana odasına giriş K2 kapağından galvaniz el merdiveni ile sağlanacaktır.',
    ]], ['YAPI BİLGİLERİ', null, [['Islak hazne iç ölçüsü', `${f2(y.Lw)} × ${f2(y.Ww)} m`], ['Vana odası iç ölçüsü', `${f2(y.Lw)} × ${f2(y.Wv)} m`], ['Hazne tabanı', kotS(y.zFloor)], ['Üst döşeme', kotS(y.zt != null ? y.zt : 0)], ['Faydalı hacim', `${f2(y.Vact)} m³ (gerekli ${f2(r ? r.V : y.Vreq)} m³)`]]]];
  };
  const notMekanik = (y, r, items) => {
    const P = PH(), pn = PNof(r ? r.Hm : 20), b = r && r.basma, k = r && r.kollektor;
    return [['GENEL NOTLAR :', [
      `Basma boruları${b ? ` DN${b.dn}` : ''} ve kollektör${k ? ` DN${k.dn}` : ''} paslanmaz çelik (borulardaki kaliteye göre), kaynaklı ve flanşlı birleşimlidir; kaynaklar TIG (argon) ile yapılacak, kaynak bölgeleri dekapaj–pasivasyon ile temizlenecektir.`,
      `Flanşlar EN 1092-1 ${pn}; contalar EPDM, cıvata-somunlar A2/A4 paslanmazdır.`,
      `Vanalar ${pn}, flanşlı; ayırma vanaları her pompa hattında çekvalften sonra yer alır.`,
      'Pompalar ıslak tip dalgıç pompa olup ördek ayağı ve kılavuz ray ile otomatik bağlantılıdır; pompalar kapaklardan kaldırma zinciri ile çıkarılır.',
      'Montajdan sonra basma hattı 1,5 × işletme basıncında (en az 10 bar) hidrostatik teste tabi tutulacaktır.',
      'Poz numaraları mekanik listelerdeki numaralarla aynıdır.',
      'Seviye ölçümü (hidrostatik sensör + şamandıra yedekli) ve pompa kumandası elektrik projesine göre yapılacaktır.',
    ]], ['POMPA ÇALIŞMA SEVİYELERİ', null, [['Giriş borusu akar kotu', kotS(+P.ZIN || 0)], ['Yüksek seviye alarmı', kotS(+P.ZIN || 0)], ['Pompa devreye girme', kotS(y.zStart)], ['Pompa durma', kotS(y.zStop)], ['Düşük seviye (kuru çalışma)', kotS(P.zMin != null ? +P.zMin : y.zStop - 0.3)], ['Hazne tabanı', kotS(y.zFloor)]]],
    ['HİDROLİK BİLGİLER', null, r ? [['Tasarım debisi', `${f2(+P.Q, 1)} l/s`], ['Pompa sayısı', `${P.Nasil} asıl + ${P.Nyedek || 0} yedek`], ['Pompa debisi', `${f2(r.Qp, 1)} l/s`], ['Manometrik yükseklik', `${f2(r.Hm, 1)} m`], ['Motor gücü', `${f2(r.P2, 1)} kW`]] : []]];
  };

  /* ======================= ANA KOMUT ======================= */
  /* ölçek (firma kuralı 14.11.2026, mimari-pafta.js → olcekSec): önce 1/50 A1 / A0; çok küçükse 1/25, A0'a sığmıyorsa 1/100.
     Kullanıcı ölçeği elle seçtiyse (istOlcekElle) o kalır. Plan: yapının plan kutusu, kesit: uzun kenar × kot aralığı */
  const olcekOner = () => { const A = C.mimariPaftaApi, y = PH().yapi; if (!A || !A.olcekSec || !y || !y.ids) return { olcek: 50, neden: '' };
    const ids = new Set(y.ids), ents = C.doc.ents.filter(e => ids.has(e.id)), bb = C.extents(ents); if (!bb) return { olcek: 50, neden: '' };
    let z0 = Infinity, z1 = -Infinity; for (const e of ents) { let t; try { t = C.entTris(e); } catch (er) { continue; } const P0 = t && t.pos; if (!P0) continue; for (let i = 2; i < P0.length; i += 3) { z0 = Math.min(z0, P0[i]); z1 = Math.max(z1, P0[i]); } }
    const lx = bb[2] - bb[0], ly = bb[3] - bb[1]; return A.olcekSec([{ id: 'plan', w: lx, h: ly, kenarMm: 41, altMm: 15 }, { id: 'kesit', w: Math.max(lx, ly), h: isFinite(z1 - z0) ? z1 - z0 : 5, kenarMm: 30, altMm: 15 }]); };
  C.istasyonOlcekOner = olcekOner;
  const uret = async (SC) => {
    SC = +SC || (C.doc.set.istOlcekElle && +C.doc.set.istOlcek) || olcekOner().olcek; const anno0 = C.doc.set.anno; C.doc.set.anno = SC; // görünüş yazıları / başlıklar kağıtta doğru boyda (pafta ölçeği)
    try { return await uret0(SC); } finally { C.doc.set.anno = anno0; }
  };
  const uret0 = async (SC) => {
    const P = PH(), y = P.yapi;
    if (!y || !y.ids || y.tip !== '3b') { C.warn('3B pompa istasyonu yok: önce Proje hesabı → İstasyon çizimi "3B tasarım" → İstasyonu çiz.'); return null; }
    if (y.zt == null || !y.kTip) { C.warn('İstasyon bu sürümden önce çizilmiş: Proje hesabında "İstasyonu çiz" ile yeniden çizin (kapak ve kot bilgileri eklenir).'); return null; }
    const ids = new Set(y.ids), ents = C.doc.ents.filter(e => ids.has(e.id)); if (!ents.length) { C.warn('İstasyon elemanları bulunamadı (silinmiş olabilir). İstasyonu yeniden çizin.'); return null; }
    let r = null; try { r = C.projeHesapla ? C.projeHesapla() : null; } catch (er) { }
    katmanlar(); temizle();
    const st = durum(), ox = y.o[0], oy = y.o[1], tw = y.tw, Lw = y.Lw, Ww = y.Ww, Wv = y.Wv, y1 = y.y1;
    const sb = C.extents(ents) || [ox - 3, oy - 3, ox + Lw + 3, oy + y1 + Wv + 3];
    // görünüşler bölgesi: modelin sağı
    const mb = C.extents(C.doc.ents.filter(e => !e.gv && e.type !== 'sheet')) || sb; let X0 = mb[2] + 40, Yc = mb[3];
    const yerAl = () => [X0, Yc];
    const kaydirY = gv => { const bb = C.extents(C.doc.ents.filter(e => e.gv === gv)); if (bb) Yc = bb[1] - 12; };
    // --- planlar
    const ref = [sb[0], sb[1]];
    const plan = (h, title, mek) => { const hh = (sb[3] - sb[1]); const base = [X0, Yc - hh]; const res = C.makeView({ kind: 'plan', h, depth: 30, place: base, ref, hatch: 'ANSI31', poz: false, mek, title }); if (!res) return null; st.gvs.push(res.gv);
      C.doc.ents = C.doc.ents.filter(e => !(e.gv === res.gv && ((mek && e.type === 'kot' && /üst/.test(e.txt || '')) || (e.type === 'line' && /_GORUNEN_KAPLAMA/.test(e.layer || '') && Math.abs(e.a[0] - e.b[0]) > 1e-3 && Math.abs(e.a[1] - e.b[1]) > 1e-3)))); const W = q => [base[0] + q[0] - ref[0], base[1] + q[1] - ref[1]]; kaydirY(res.gv); return { gv: res.gv, W }; };
    const pUst = plan(y.zt + 0.02, `${kotS(y.zt)} KOTU ÜST DÖŞEME (KAPAK) PLANI`, false);
    const hV = +(Math.min(y.zt - y.ts - 0.05, y.zR + 0.55)).toFixed(2), pVan = plan(hV, `${kotS(hV)} KOTU PLANI (VANA ODASI VE ISLAK HAZNE)`, true);
    // üst plana kapak etiketleri
    if (pUst) for (const kp of y.kapak || []) { const c = pUst.W([ox + kp.x0 + 0.06, oy + kp.y1 - 0.20]); const t = C.add(C.newEnt('text', { p: [c[0], c[1], 0], h: 0.16, s: kp.tip, al: 'L', layer: 'YAZI_KAPAK', gv: pUst.gv, ann: false })); delete t.sp; }
    // --- kesitler: A-A boyuna (ıslak hazne, kollektöre bakış), B-B enine (1. pompa ekseni)
    const yA = oy + Math.max(0.25, Math.min(Ww * 0.35, y.yr - 0.45)), xB = ox + y.xs[0] - 0.12;
    const kA = await kesitAl('A', [ox - tw - 2.2, yA], [ox + Lw + tw + 2.2, yA], [ox + Lw / 2, yA + 1], +(oy + Ww - yA + 0.01).toFixed(2), yerAl()); st.gvs.push(kA.gv); kaydirY(kA.gv);
    const kB = await kesitAl('B', [xB, oy - tw - 1.5], [xB, oy + y1 + Wv + tw + 1.5], [xB + 1, oy + Ww / 2], +Math.max(0.3, (y.s || 1.2) / 2).toFixed(2), yerAl()); st.gvs.push(kB.gv); kaydirY(kB.gv);
    // --- mahal listesi
    const gvM = 'IST_MAHAL_' + Date.now().toString(36); st.gvs.push(gvM);
    { const e = C.add(C.newEnt('mahaltablo', { p: [X0, Yc, 0], dis: 'Mimari', layer: 'MAHAL_LISTESI', gv: gvM, title: up(P.ad || 'Pompa istasyonu') })); delete e.sp; kaydirY(gvM); }
    // --- kapak planları (1/20) ve kenar detayı (1/5)
    const kPl = []; let xk = X0;
    for (const t of y.kTip) { const gv = 'IST_KAPAK_' + t.ad + '_' + Date.now().toString(36); st.gvs.push(gv); const info = kapakPlani(t, [xk + 0.5, Yc - t.l - 0.8], gv, 20); t.cift = info.cift; kPl.push({ t, gv }); xk += t.w + 2.0; }
    Yc -= Math.max(...y.kTip.map(t => t.l)) + 2.5;
    const gvK = 'IST_KENAR_' + Date.now().toString(36); st.gvs.push(gvK); kenarDetay([X0 + 0.6, Yc - 0.3], gvK, 5, y.ts || 0.25); acilimDuzen(gvK, null, 5); Yc -= (y.ts || 0.25) + 1.5;
    // --- mekanik poz numaraları
    const items = pozListesi(ents, y, r);
    let nB = 0;
    if (pVan) nB += balonlar(items, pVan.gv, p => pVan.W(p), p => (p[2] == null || p[2] <= hV + 0.01));
    for (const kk of [kA, kB]) { const m = kk.km; if (!m) continue; const W = p => { const d = (p[0] - m.a[0]) * m.n[0] + (p[1] - m.a[1]) * m.n[1]; if (d < -0.15 || d > (m.depth || 30) + 0.05) return null; const s = (p[0] - m.a[0]) * m.u[0] + (p[1] - m.a[1]) * m.u[1]; if (s < m.ub[0] - 0.05 || s > m.ub[2] + 0.05) return null; return [m.q0[0] + s, m.q0[1] + (p[2] || 0)]; }; nB += balonlar(items, kk.gv, W); }
    C.changed();
    // --- paftalar
    const ad = P.ad ? up(P.ad) : 'POMPA İSTASYONU';
    let Ox = X0 + 60, Oy = mb[1] - 60; const sheetO = PW => { const o = [Ox, Oy]; Ox += PW * KF + 10; return o; };
    const sb2 = (gv, sc, dis) => vpBlok(gv, sc, dis);
    const persp = (mod, yon, ad) => (C.render3B ? { g3: { mod, yon, tip: 'PERSPEKTIF', kam: null, olcek: null, ids: [...y.ids], gv: null }, label: `3B GÖRÜNÜŞ — ${ad}`, w: 210, h: 160 } : null);
    const mimBlok1 = [sb2(pUst && pUst.gv, SC, 'Mimari'), sb2(pVan && pVan.gv, SC, 'Mimari'), sb2(kA.gv, SC, 'Mimari'), sb2(kB.gv, SC, 'Mimari'), persp('MIMARI', 'GD', 'MİMARİ PERSPEKTİF (GÜNEYDOĞU)')].filter(Boolean);
    // kapak çizelgesi
    const kapC = tabloBlok('KAPAK ÇİZELGESİ', [{ t: 'TİP', w: 12 }, { t: 'BETON AÇIKLIĞI (cm)', w: 24 }, { t: 'NET GEÇİŞ (cm)', w: 22 }, { t: 'KANAT', w: 14 }, { t: 'ADET', w: 12 }, { t: 'YERİ', w: 42, al: 'L' }, { t: 'MALZEME / YÜK SINIFI', w: 56, al: 'L' }],
      y.kTip.map(t => [t.ad, `${cmi(t.w)} × ${cmi(t.l)}`, `${cmi(t.w - 0.1)} × ${cmi(t.l - 0.1)}`, (t.w > 1.0 || t.l > 1.6) ? 'Çift' : 'Tek', String(t.adet), t.yer.join(', '), 'Galvaniz baklavalı sac 8/10 mm, L50 çerçeve · EN 124 B125' + ((t.w * t.l) / ((t.w > 1.0 || t.l > 1.6) ? 2 : 1) > 0.6 ? ' · gaz amortisörlü' : '')]));
    const mimBlok2 = [sb2(gvM, 50, 'Mimari'), kapC, ...kPl.map(k => sb2(k.gv, 20, 'Mimari')), sb2(gvK, 5, 'Mimari')].filter(Boolean);
    const mekBlok1 = [sb2(pVan && pVan.gv, SC, 'Mekanik'), sb2(kA.gv, SC, 'Mekanik'), sb2(kB.gv, SC, 'Mekanik'), persp('MEKANIK', 'KB', 'MEKANİK PERSPEKTİF (KUZEYBATI)')].filter(Boolean);
    const sat = it => it.grup === 'boru' ? f2(it.miktar, 1) : String(Math.round(it.miktar));
    const tEk = tabloBlok('MEKANİK EKİPMAN LİSTESİ', [{ t: 'POZ NO', w: 12 }, { t: 'TANIM', w: 40, al: 'L' }, { t: 'ÖZELLİKLER', w: 120, al: 'L' }, { t: 'MİKTAR', w: 16 }, { t: 'BİRİM', w: 14 }], items.filter(i => i.grup === 'ekipman').map(i => [String(i.poz), i.tanim, i.oz, sat(i), i.birim]));
    const tBo = tabloBlok('BORU VE EK PARÇA LİSTESİ', [{ t: 'POZ NO', w: 12 }, { t: 'TANIM', w: 44, al: 'L' }, { t: 'MALZEME / STANDART', w: 110, al: 'L' }, { t: 'MİKTAR', w: 16 }, { t: 'BİRİM', w: 14 }], items.filter(i => i.grup === 'boru' || i.grup === 'ekparca').map(i => [String(i.poz), i.tanim + (i.top ? ` (${i.top})` : ''), i.oz, sat(i), i.birim]));
    const tVa = tabloBlok('VANA LİSTESİ', [{ t: 'POZ NO', w: 12 }, { t: 'TANIM', w: 44, al: 'L' }, { t: 'TİPİ', w: 24 }, { t: 'DN', w: 12 }, { t: 'PN', w: 13 }, { t: 'BAĞLANTI', w: 28 }, { t: 'KUMANDA', w: 28 }, { t: 'GÖVDE', w: 34, al: 'L' }, { t: 'ADET', w: 12 }], items.filter(i => i.grup === 'vana').map(i => [String(i.poz), i.tanim, i.tip, String(i.dn), i.pn, i.bag, i.kum, i.govde, sat(i)]));
    const mekBlok2 = [tEk, tBo, tVa];
    const nm = notMimari(y, r), nk = notMekanik(y, r, items), yapiAd = ad;
    const paf = [];
    /* pafta sayısı otomatik: bloklar A1 (841 mm) genişliğini aşmayacak şekilde paftalara bölünür (büyük ölçekte plan ve kesitler ayrı paftalara düşer) */
    const keys = new Set(); let sira = { M: 0, MK: 0 };
    const bol = bl => { const out = []; let cur = [], cols = 0, colW = 0, colH = 0; const MAXW = 841 - MARJ.l - 8 - SUT - MARJ.r - 6;
      for (const b of bl) { const w = b.w + 10, h = b.h + 10; let yeniKol = cur.length && colH + h > IC, w2 = yeniKol ? cols + colW + w : cols + Math.max(colW, w);
        if (cur.length && w2 > MAXW) { out.push(cur); cur = []; cols = 0; colW = 0; colH = 0; yeniKol = false; }
        if (yeniKol) { cols += colW; colW = 0; colH = 0; } cur.push(b); colH += h; colW = Math.max(colW, w); }
      if (cur.length) out.push(cur); return out; };
    const kur = (key, grp, pafAd, bl, notlar, harf, dis, no, ol) => { if (!bl.length) return; const parts = bol(bl); parts.forEach((p, i) => kur1(parts.length > 1 ? key + '_' + (i + 1) : key, grp, parts.length > 1 ? `${pafAd} (${i + 1}/${parts.length})` : pafAd, p, notlar, harf, dis, ++sira[harf], ol)); void no; };
    const kur1 = (key, grp, pafAd, bl, notlar, harf, dis, no, ol) => { keys.add(key); const tmp = paftaKur(key, grp, `${grp.toLocaleUpperCase('tr')} — ${yapiAd} — ${pafAd}`, bl, notlar, infoOf(dis, harf, pafAd, no, ol, yapiAd), [0, 0]); // genişlik belli olunca yerine taşı
      const O = sheetO(tmp.PW), gv = tmp.L.vps[0].gvOnly; for (const e of C.doc.ents) if (e.gv === gv) { const T = q => q && [q[0] + O[0], q[1] + O[1], q[2] || 0]; if (e.a) { e.a = T(e.a); e.b = T(e.b); } if (e.c) e.c = T(e.c); if (e.p) e.p = T(e.p); if (e.pts) e.pts = e.pts.map(T); delete e._c; }
      tmp.L.vps[0].cx += O[0]; tmp.L.vps[0].cy += O[1]; paf.push(tmp.L); };
    kur('MIM1', 'Mimari', 'PLANLAR VE KESİTLER', mimBlok1, nm, 'M', 'MİMARİ', 1, `1/${SC}`);
    kur('MIM2', 'Mimari', 'MAHAL LİSTESİ VE KAPAK DETAYLARI', mimBlok2, nm, 'M', 'MİMARİ', 2, '1/50 · 1/20 · 1/5');
    kur('MEK1', 'Mekanik', 'MEKANİK PLAN VE KESİTLER', mekBlok1, nk, 'MK', 'MEKANİK', 1, `1/${SC}`);
    kur('MEK2', 'Mekanik', 'MEKANİK EKİPMAN, BORU - EK PARÇA VE VANA LİSTELERİ', mekBlok2, nk, 'MK', 'MEKANİK', 2, '—');
    // eski (artık üretilmeyen) istasyon paftalarını kaldır
    C.doc.layouts = (C.doc.layouts || []).filter(L => !L.istPafta).concat(paf); // eski istasyon paftaları kalkar, yeniler sırayla
    st.t = Date.now(); C.changed();
    if (C.g3Guncelle) { try { C.g3Guncelle(true); } catch (er) { C.warn('Perspektif çizilemedi: ' + er.message); } }
    C.emit('layouts');
    return { paf, items, nB };
  };

  C.istasyonPaftalari = uret;
  /* MIMARIPAFTA (mimari-pafta.js) çelik / sac kapak detayları için: kapak planı (1/20), kenar detayı (1/5), katmanlar, açılım düzeni */
  C.kapakDetay = { plani: kapakPlani, kenar: kenarDetay, katmanlar, acilimDuzen };
  /* ünite mekanik paftası (unite-mekanik.js MEKANIKPAFTA) için ortak araçlar: kâğıt çizimi ve tablo (mm), modelden kesit, poz balonları, pencere bloğu */
  C.mekPaftaArac = { yeniCizim, tablo, tabloBlok, kaydir1, sar, tw: tw_, balonlar, kesitAl, vpBlok, extOf };
  C.addCommand(['ISTASYONPAFTA', 'ISTPAFTA', 'MIMARIMEKANIKPAFTA'], 'Pompa istasyonu (3B) için mimari ve mekanik paftaları üretir: planlar, A-A / B-B kesitleri, akslar, malzeme açılımları, mahal listesi, kapak detayları; mekanik poz numaraları, ekipman, boru – ek parça ve vana listeleri. Yeniden çalıştırınca modelden günceller.', async (I) => {
    const on = olcekOner(), oS = String(on.olcek), elle = C.doc.set.istOlcekElle && C.doc.set.istOlcek ? String(C.doc.set.istOlcek) : null;
    const sec = [['50', '1/50'], ['25', '1/25'], ['100', '1/100']].map(([v, t]) => [v, v === oS ? `${t} (önerilen — firma kuralı: ${on.neden || 'bina ebatına göre'})` : t]);
    const ol = I && I.kw ? await I.kw('Plan ve kesit ölçeği', sec, elle || oS) : (elle || oS); if (!ol) return;
    C.doc.set.istOlcek = +ol; C.doc.set.istOlcekElle = String(ol) !== oS; // önerilenden başkası seçildiyse elle verilmiş sayılır, sonraki çalışmada korunur
    const res = await uret(+ol); if (!res) return;
    const L0 = res.paf[0]; if (L0) { C.layoutIdx = C.doc.layouts.indexOf(L0); C.grpCur = L0.grp; C.setView('layout'); C.emit('layouts'); setTimeout(() => { try { C.views.lay.zoomExtents(); } catch (er) { } }, 60); }
    C.log(`İstasyon paftaları hazır (${res.paf.length}): ${res.paf.map(L => L.name.split(' — ').pop()).join(' · ')} — ${res.items.length} mekanik poz, ${res.nB} poz balonu. Model değişince ISTASYONPAFTA ile yeniden üretin; antet bilgileri statik penceresindeki "Pafta anteti" alanlarından gelir.`);
  });

  /* şerit: Hesap › Proje paneline ve Pafta › Disiplin paneline düğme */
  try {
    const R = C.ribbon; const ekle = () => { let d = false; for (const [tb, pn] of [['Hesap', 'Proje'], ['Pafta', 'Disiplin']]) { const tab = R && R.tabs && R.tabs.find(t => t[0] === tb), p = tab && tab[1].find(q => q[0] === pn); if (p && !p[1].some(b => b.cmd === 'ISTASYONPAFTA')) { p[1].push({ cmd: 'ISTASYONPAFTA', t: 'İstasyon paftaları', i: 'sheet' }); d = true; } } return d; };
    if (R && !R._istPafta) { const r0 = R.render; R.render = function () { const x = r0.apply(this, arguments); try { if (ekle()) r0.apply(this, arguments); } catch (er) { } return x; }; R._istPafta = true; R.render(); }
  } catch (er) { console.error('istasyon pafta şerit', er); }
})(window.C);

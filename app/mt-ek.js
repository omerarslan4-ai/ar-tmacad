/* ArıtmaCAD — MEKANİK TESİSAT · EK İŞLER
   1) YALITIMUYGULA   : ısı yalıtım hesabındaki yapı elemanlarına göre modele yalıtımı uygular (dış cephe mantolama, çatı / teras, zemin altı)
                        — malzeme ve kalınlık hesaptaki katmanlardan alınır; ardından yalıtım detaylarını çizer.
   2) ISIYALITIMDETAY : kullanılan her yapı elemanının katman kesiti (kalınlık, λ), U değeri – TS 825 sınırı, yoğuşma sonucu.
   3) TESISATPAFTA    : Mekanik grubunda ısı yalıtımı / ısıtma / soğutma / havalandırma / sıhhi tesisat paftaları: kat planları (öteki sistemler gizli), kolon şeması ya da cihaz listesi, 3B görünüş.
                        Ölçek ve yerleşim Mimari paftalamanın altyapısıyla (mt-pafta.js: olcekSec, enAzKagit, antet sütunu, MEK-01 numaraları). */
(function (C) {
  'use strict';
  const M = C.M, MT = C.MT, V = C.MTV, E = C.cmd; if (!MT || !C.addCommand) return;
  const f = (v, d = 2) => (isFinite(v) ? (+v).toFixed(d) : '—').replace('.', ',');
  const fi = v => isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—';
  const YAL = { eps: 'eps', epsGri: 'eps', xps: 'xps', tasyunu: 'tasyunu', camyunu: 'camyunu', pir: 'pir', pur: 'pir' };
  const cizer = () => { const g = { L: [], T: [] }; return { g, L: (a, b, c, d, s) => g.L.push([a, b, c, d, s || 'i']), T: (x, y, h, s, al, rot, col) => g.T.push([x, y, h, s, al || 'L', rot || 0, col || 7]), B(x, y, w, h, s) { this.L(x, y, x + w, y, s); this.L(x + w, y, x + w, y + h, s); this.L(x + w, y + h, x, y + h, s); this.L(x, y + h, x, y, s); } }; };
  const gKutu = g => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const l of g.L) { x0 = Math.min(x0, l[0], l[2]); x1 = Math.max(x1, l[0], l[2]); y0 = Math.min(y0, l[1], l[3]); y1 = Math.max(y1, l[1], l[3]); } for (const t of g.T) { const w = String(t[3]).length * t[2] * 0.62, a = t[4] || 'L', xa = a[0] === 'M' ? t[0] - w / 2 : a[0] === 'R' ? t[0] - w : t[0]; if (t[5]) { x0 = Math.min(x0, t[0] - t[2]); x1 = Math.max(x1, t[0] + t[2]); y0 = Math.min(y0, t[1] - w / 2); y1 = Math.max(y1, t[1] + w / 2); } else { x0 = Math.min(x0, xa); x1 = Math.max(x1, xa + w); y0 = Math.min(y0, t[1] - t[2]); y1 = Math.max(y1, t[1] + t[2] * 1.6); } } return x0 === Infinity ? null : [x0, y0, x1, y1]; };
  const OTO_SEMA = new Set(['kolon', 'elkolon', 'ellist', 'radlist', 'sog', 'soglist', 'hvlist', 'yaldetay', 'caklist', 'deliklist', 'shkolon', 'shlist']);
  const otoGv = () => { const st = C.doc.set.mt || {}, o = new Set(st.yalGv || []); for (const k in st.planGv || {}) for (const g of st.planGv[k] || []) o.add(g); return o; };
  /* otomatik üretilen şema, tablo, kesit planı ve kesitler dışındaki model */
  const modelKutu = () => { const gs = otoGv(), es = C.doc.ents.filter(e => e.type !== 'sheet' && !(e.type === 'mtsema' && OTO_SEMA.has(e.tur)) && !(e.gv && gs.has(e.gv)) && !(e.type === 'kesitisaret' && e.name === 'Y')); try { return C.extents(es); } catch (er) { return null; } };
  const binaKutu = () => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const e of MT.mahaller()) for (const p of e.pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return x0 === Infinity ? null : [x0, y0, x1, y1]; };
  /* modelin sağında iki sabit sütun: 1) kesit planı + kesit, 2) şemalar / tablolar / detaylar (alt alta) — eskisi silinir, yenisi aynı düzende konur, üst üste binmez */
  const bolge = () => { const mb = modelKutu() || [0, 0, 10, 10], bb = binaKutu() || mb, gx = mb[2] + 15; return { gx, gy: mb[1], sx: gx + (bb[2] - bb[0]) + 16, sy: mb[1] }; };
  const semaKoy = (tur, g) => { const k = C.doc.set.anno / 1000; C.doc.ents = C.doc.ents.filter(e => !(e.type === 'mtsema' && e.tur === tur));
    const B = bolge(), gb = gKutu(g) || [0, 0, 100, 100]; let y = B.sy; for (const e of C.doc.ents) if (e.type === 'mtsema' && OTO_SEMA.has(e.tur)) { const b2 = gKutu(e.g || { L: [], T: [] }); if (b2) y = Math.max(y, e.p[1] + b2[3] * k + 14 * k); }
    return C.add(C.newEnt('mtsema', { layer: MT._lay('MT_SEMA', 7, 25), dis: 'Mekanik', p: [B.sx - gb[0] * k, y - gb[1] * k, 0], g, tur })); };
  MT._semaKoy = semaKoy;

  /* ====================================================================
     1) YALITIMI MODELE UYGULA
     ==================================================================== */
  const yalKat = y => { const kat = (y && y.kat) || [], i = kat.findIndex(q => YAL[q.m]); return i < 0 ? null : { mat: YAL[kat[i].m], t: Math.round(kat[i].d * 1000) / 10, i, kat }; };
  MT.yalitimPlan = () => {
    const m = MT.set(), all = MT.mahaller(); if (!all.length) return null;
    const boy = {}; for (const e of all) for (const y of e.yuz || []) if (y.k === 'dis') boy[y.malz || 'tugla'] = (boy[y.malz || 'tugla'] || 0) + y.L;
    /* üstü kırma / beşik çatıyla örtülü döşeme: teras değil çatı arası döşemesi (taşyünü, çakıl ve membran yok) */
    const egimli = C.doc.ents.filter(e => e.type === 'cati' && e.kind !== 'teras'), cA = egimli.length > 0 && m.yapi.TV_cati && m.catiTip !== 'TV_cati' && !m.catiElle; if (cA) m.catiTip = 'TV_cati';
    const malz = Object.keys(boy).sort((a, b) => (Math.abs(boy[b] - boy[a]) > 0.5 ? boy[b] - boy[a] : 0) || ((yalKat(MT.yapiSec(m, 'dis', b).y) || { t: 0 }).t - (yalKat(MT.yapiSec(m, 'dis', a).y) || { t: 0 }).t))[0] || 'tugla', dd = MT.yapiSec(m, 'dis', malz), tv = MT.yapiSec(m, 'cati'), tb = MT.yapiSec(m, 'toprak');
    const z0 = Math.min(...all.map(e => +e.z0 || 0)), c = yalKat(dd.y), r = yalKat(tv.y), z = yalKat(tb.y), has = (y, re) => (y.kat || []).some(q => re.test(q.m));
    return { m, malz, z0, catiDegisti: cA, cephe: c && { key: dd.key, ad: dd.y.ad, mat: c.mat, t: c.t }, cati: r && { key: tv.key, ad: tv.y.ad, mat: r.mat, t: r.t, buhar: has(tv.y, /buhar/i) ? 'E' : 'H', su: has(tv.y, /membran/i) ? 'bitum' : 'yok', kor: has(tv.y, /cakil/i) ? 'cakil' : (tv.y.kat.slice(r.i + 1).some(q => q.m === 'sap') ? 'sap' : 'yok'), egim: (tv.y.kat.find(q => /egim/i.test(q.m)) || { d: 0 }).d * 100 }, zemin: z && { key: tb.key, ad: tb.y.ad, mat: z.mat, t: z.t, su: has(tb.y, /membran/i) ? 'bitum' : 'yok' } };
  };
  const calis = async (I, line) => { const t = E.tokenize(line), def = C.cmds[C.up(t[0])]; if (!def) return false; const s0 = E.scriptMode; E.queue = t.slice(1); E.scriptMode = true; try { await def.fn(I, C); return true; } catch (er) { C.warn(`${t[0]}: ${er && er.message || er}`); return false; } finally { E.queue = []; E.scriptMode = s0; } };
  const say = k => C.doc.ents.filter(e => e.type === 'yalitim' && e.kind === k).length;

  /* ---- dış cephe yalıtımında pencere / kapı boşlukları: mantolama boşlukların üstünü kapatmaz (3B gövde + metraj) ---- */
  const cepheKenar = e => { let q = e.pts.map(p => [p[0], p[1]]); if (M.polyArea(q) < 0) q.reverse(); const out = [], ops = C.doc.ents.filter(o => o.type === 'acik'), I_ = C._ins, z0 = +e.z0 || 0;
    for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length], Ls = M.dist2(a, b); if (Ls < 1e-6) continue; const u = [(b[0] - a[0]) / Ls, (b[1] - a[1]) / Ls], n = [u[1], -u[0]], ht = Array.isArray(e.ht) && e.ht[out.length] != null ? +e.ht[out.length] : (+e.h || 3), hs = [];
      for (const o of ops) { const H = I_ && I_.hostFrame(o); if (!H) continue; const c = [H.sf.a[0] + H.sf.u[0] * (+o.s || 0), H.sf.a[1] + H.sf.u[1] * (+o.s || 0)], t = (c[0] - a[0]) * u[0] + (c[1] - a[1]) * u[1], d = Math.abs((c[0] - a[0]) * n[0] + (c[1] - a[1]) * n[1]); if (t < 0 || t > Ls || d > Math.max(H.F.tb || 0, H.F.tt || 0, 0.2) + 0.25 || Math.abs(H.sf.u[0] * n[0] + H.sf.u[1] * n[1]) > 0.2) continue;
        const w = +o.w || 1, za = (+H.h.z0 || 0) + (o.kind === 'kapi' ? 0 : (+o.par || 0.9)), hh = +o.hh || (o.kind === 'kapi' ? 2.1 : 1.4), h = { s0: Math.max(0, t - w / 2), s1: Math.min(Ls, t + w / 2), za: Math.max(za, z0), zb: Math.min(za + hh, z0 + ht), w, hh }; if (h.s1 > h.s0 + 0.01 && h.zb > h.za + 0.01) hs.push(h); }
      out.push({ a, b, u, n, L: Ls, ht, hs: hs.sort((x, y) => x.s0 - y.s0) }); }
    const nn = out.length, mt = (p, q2) => { const k = 1 + p[0] * q2[0] + p[1] * q2[1]; return k < 1e-6 ? q2 : [(p[0] + q2[0]) / k, (p[1] + q2[1]) / k]; }; out.forEach((w, i) => { w.m0 = mt(out[(i - 1 + nn) % nn].n, w.n); w.m1 = mt(w.n, out[(i + 1) % nn].n); }); return out; };
  MT.cepheBosluk = e => { let A = 0, Lc = 0, n = 0; for (const w of cepheKenar(e)) for (const h of w.hs) { A += (h.s1 - h.s0) * (h.zb - h.za); Lc += 2 * (h.zb - h.za) + (h.s1 - h.s0); n++; } return { A, L: Lc, n }; };
  if (C.T && C.T.yalitim && !C.T.yalitim._mtBosluk) {
    const m0 = C.T.yalitim.mesh, COL = { eps: [0.80, 0.80, 0.82], xps: [0.93, 0.70, 0.76], tasyunu: [0.86, 0.78, 0.52], pir: [0.92, 0.88, 0.62], camyunu: [0.95, 0.86, 0.45] };
    C.T.yalitim.mesh = e => {
      if (e.kind !== 'cephe' || !C._ins) return m0(e);
      try { const ws = cepheKenar(e); if (!ws.some(w => w.hs.length)) return m0(e);
        const out = C._ins.newMesh(), t = (+e.t || 5) / 100, z0 = +e.z0 || 0, col = (C._yal && C._yal.ISI && C._yal.ISI[e.mat] && C._yal.ISI[e.mat].col) || COL[e.mat] || COL.eps, sv = Math.min(0.03, t), cs = [0.9, 0.9, 0.88];
        for (const w of ws) { const Pp = (s, o, z) => { const q = s <= 1e-9 ? [w.a[0] + w.m0[0] * o, w.a[1] + w.m0[1] * o] : s >= w.L - 1e-9 ? [w.b[0] + w.m1[0] * o, w.b[1] + w.m1[1] * o] : [w.a[0] + w.u[0] * s + w.n[0] * o, w.a[1] + w.u[1] * s + w.n[1] * o]; return [q[0], q[1], z]; };
          const kutu = (s0, s1, za, zb, o0, o1, c) => { if (s1 - s0 < 0.005 || zb - za < 0.005) return; C._ins.hexa(out, [Pp(s0, o0, za), Pp(s1, o0, za), Pp(s1, o1, za), Pp(s0, o1, za), Pp(s0, o0, zb), Pp(s1, o0, zb), Pp(s1, o1, zb), Pp(s0, o1, zb)], c); };
          const zt = z0 + w.ht, xs = [...new Set([0, w.L].concat(w.hs.flatMap(h => [h.s0, h.s1])).map(v => +v.toFixed(4)))].sort((a, b) => a - b);
          for (let i = 1; i < xs.length; i++) { const s0 = xs[i - 1], s1 = xs[i], sm = (s0 + s1) / 2, bos = w.hs.filter(h => sm > h.s0 && sm < h.s1).sort((a, b) => a.za - b.za); let z = z0; for (const h of bos) { kutu(s0, s1, z, h.za, 0, t, col); z = Math.max(z, h.zb); } kutu(s0, s1, z, zt, 0, t, col); }
          /* söve dönüşü: boşluğun iki yanı ve üstü (yalıtım kalınlığınca, ince sıvalı) + denizlik payı */
          for (const h of w.hs) { kutu(h.s0, h.s0 + sv, h.za, h.zb, -0.02, t, cs); kutu(h.s1 - sv, h.s1, h.za, h.zb, -0.02, t, cs); kutu(h.s0, h.s1, h.zb - sv, h.zb, -0.02, t, cs); if (h.za > z0 + 0.05) kutu(h.s0 - 0.03, h.s1 + 0.03, h.za - 0.03, h.za, -0.02, t + 0.04, [0.78, 0.78, 0.76]); }
        }
        return [out]; } catch (er) { console.error(er); return m0(e); }
    };
    C.T.yalitim._mtBosluk = true;
    if (C.yalitimMetraj) { const q0 = C.yalitimMetraj; C.yalitimMetraj = function () { const rows = q0.apply(this, arguments); try { let A = 0, Lc = 0, n = 0; for (const e of C.doc.ents) if (e.type === 'yalitim' && e.kind === 'cephe' && (!C.lyLive || C.lyLive(e.layer))) { const b = MT.cepheBosluk(e); A += b.A; Lc += b.L; n += b.n; } if (n) { for (const r of rows) if (/dış cephe \(mantolama\)/.test(r[0])) { r[2] = Math.max(0, r[2] - A); break; } rows.push(['Pencere / kapı söve yalıtımı (3 cm XPS, yan + üst)', 'm', Lc]); } } catch (er) { console.error(er); } return rows; }; }
  }

  /* ====================================================================
     2) YALITIM DETAYLARI (kağıt mm)
     ==================================================================== */
  const DOKU = { yal: (c, x, y, w, h, yatay) => { const n = Math.max(2, Math.round((yatay ? w : h) / Math.max(1.6, (yatay ? h : w) * 0.9))); for (let i = 0; i < n; i++) { const a = i / n, b = (i + 1) / n; if (yatay) { c.L(x + w * a, y, x + w * (a + b) / 2, y + h, 'y'); c.L(x + w * (a + b) / 2, y + h, x + w * b, y, 'y'); } else { c.L(x, y + h * a, x + w, y + h * (a + b) / 2, 'y'); c.L(x + w, y + h * (a + b) / 2, x, y + h * b, 'y'); } } },
    tara: (c, x, y, w, h, ar) => { for (let d = -h + ar; d < w; d += ar) { const xa = Math.max(d, 0), xb = Math.min(d + h, w); if (xb - xa > 0.2) c.L(x + xa, y + (xa - d), x + xb, y + (xb - d), 'h'); } } };
  const dokuOf = m => YAL[m] ? 'yal' : /beton|grobeton/.test(m) ? 3 : /tugla|briket|gazbeton/.test(m) ? 1.6 : /blokaj|cakil/.test(m) ? 2.4 : 0;
  MT.yalitimDetay = (cols) => {
    const m = MT.set(), hes = MT.hesapla(); if (!hes.res.length) return null;
    const kul = new Map(); for (const { r } of hes.res) for (const it of r.items) { if (!it.key || !m.yapi[it.key] || !['DD', 'TB', 'TV', 'AD'].includes(it.tur)) continue; if (it.tur === 'AD' && !/yal/i.test(it.key)) continue; const k = it.key + '|' + (it.tCore || ''); let o = kul.get(k); if (!o) kul.set(k, o = { key: it.key, tCore: it.tCore, tur: it.tur, A: 0 }); o.A += it.A; }
    if (!kul.size) return null;
    const lim = V.U825[m.bolge] || V.U825[4], limOf = t => t === 'DD' ? lim[0] : t === 'TV' ? lim[1] : lim[2], c = cizer(); let x = 0; const sira = { DD: 0, TV: 1, TB: 2, AD: 3 }; let yOff = 0, rowH = 0, nn = 0; const X0s = [];
    for (const o of [...kul.values()].sort((a, b) => sira[a.tur] - sira[b.tur] || b.A - a.A)) {
      const y0 = m.yapi[o.key], malz = o.tCore ? ['tugla', 'gazbeton', 'beton', 'briket'].find(q => (y0.kat || []).some(k => k.m === q)) : null, y = Object.assign({}, y0, malz ? { _malz: malz } : {}), u = MT.U(y, o.tCore), kat = u.kat && u.kat.length ? u.kat : MT.katmanlar(y, o.tCore);
      const duvar = o.tur === 'DD', sc = 1.5, kal = kat.map(k => Math.max(1.6, k.d * 100 * sc)), top = kal.reduce((a, b) => a + b, 0), boy = 46, W = duvar ? top : 62, H = duvar ? boy : top; let p = 0;
      /* tavan: iç (alt) → dış (üst); taban: üst (iç) → alt; duvar: iç (sol) → dış (sağ) */
      if (cols && nn && nn % cols === 0) { yOff -= rowH + 34; rowH = 0; x = 0; } nn++; rowH = Math.max(rowH, Math.max(H, kat.length * 5.2) + 16); const iL = c.g.L.length, iT = c.g.T.length;
      const etk = [];
      kat.forEach((k, i) => { const t = kal[i]; let bx, by, bw, bh; if (duvar) { bx = x + p; by = 0; bw = t; bh = boy; } else { bw = W; bh = t; bx = x; by = o.tur === 'TV' ? p : H - p - t; } c.B(bx, by, bw, bh, 'r'); const dk = dokuOf(k.m); if (dk === 'yal') DOKU.yal(c, bx, by, bw, bh, !duvar); else if (dk) DOKU.tara(c, bx, by, bw, bh, dk); etk.push({ i, k, cx: bx + bw / 2, cy: by + bh / 2 }); p += t; });
      c.B(x, 0, W, H, 'k');
      /* katman listesi: sağda, numaralı */
      const lx = x + W + 16, n = kat.length, ly0 = Math.max(H, n * 5.2) - 2;
      if (!duvar) etk.sort((a, b) => b.cy - a.cy);
      etk.forEach((q, j) => { const yy = ly0 - j * 5.2, src = duvar ? [q.cx, H * (0.85 - 0.7 * j / Math.max(1, n - 1))] : [x + W * 0.85, q.cy]; c.L(src[0], src[1], lx - 2, yy + 1, 'i'); c.T(lx, yy, 2.2, `${q.i + 1} · ${q.k.ad} — ${f(q.k.d * 100, q.k.d < 0.01 ? 2 : 1)} cm${YAL[q.k.m] ? '  (ISI YALITIMI)' : ''}   λ = ${f(q.k.lam, 3)}`, 'L', 0, YAL[q.k.m] ? 6 : 7); });
      if (duvar) { c.T(x - 2, H / 2, 2.2, 'İÇ', 'MC', Math.PI / 2, 3); c.T(x + W + 3, H / 2, 2.2, 'DIŞ', 'MC', Math.PI / 2, 5); } else { c.T(x + W / 2, o.tur === 'TV' ? -4 : H + 1.5, 2.2, 'İÇ (ısıtılan hacim)', 'MC', 0, 3); c.T(x + W / 2, o.tur === 'TV' ? H + 1.5 : -4, 2.2, o.tur === 'TB' ? 'TOPRAK' : o.tur === 'TV' ? 'DIŞ' : 'ISITILMAYAN HACİM', 'MC', 0, 5); }
      const L1 = limOf(o.tur), ok = u.U <= L1 + 1e-9; let yg = ''; try { const r = ['DD', 'TV'].includes(o.tur) ? MT.yogusma(y, o.tCore, m, 20) : null; yg = r ? (!r.var ? 'Yoğuşma yok' : r.uygun ? `Yoğuşma var: en çok ${f(r.MaMax, 2)} kg/m², yazın kuruyor (uygun)` : 'YOĞUŞMA UYGUN DEĞİL — katmanları gözden geçirin') : ''; } catch (er) { }
      const ty = Math.max(H, n * 5.2) + 14; c.T(x, ty, 3.2, y0.ad.toLocaleUpperCase('tr'), 'L', 0, 2); c.T(x, ty - 5, 2.4, `U = ${f(u.U, 3)} W/m²K   ${ok ? '≤' : '>'}   TS 825 sınırı ${f(L1, 2)} W/m²K   ${ok ? '✓ UYGUN' : '✗ UYGUN DEĞİL'}`, 'L', 0, ok ? 3 : 1); c.T(x, ty - 9.5, 2.2, `Toplam kalınlık ${f(kat.reduce((a, k) => a + k.d, 0) * 100, 1)} cm · yüzey alanı ${f(o.A, 1)} m²${yg ? ' · ' + yg : ''}`, 'L');
      if (yOff) { for (let q = iL; q < c.g.L.length; q++) { c.g.L[q][1] += yOff; c.g.L[q][3] += yOff; } for (let q = iT; q < c.g.T.length; q++) c.g.T[q][1] += yOff; }
      x += cols ? 235 : W + 16 + 118;
    }
    const b = gKutu(c.g); c.T(0, b[3] + 9, 4.5, 'ISI YALITIM DETAYLARI', 'L', 0, 2); c.T(0, b[3] + 3.5, 2.4, `${m.il || ''} · TS 825 ${m.bolge}. bölge · katman kalınlıkları ısı yalıtım hesabındaki yapı elemanlarından alınmıştır (kesitler ölçeksiz şematiktir)`, 'L');
    return c.g;
  };

  /* ====================================================================
     3) PAFTALAR
     ==================================================================== */
  const radListe = () => cihazListe('ISITMA — RADYATÖR LİSTESİ', C.doc.ents.filter(e => e.type === 'mtrad' && e.tip !== 'E'), e => [e.no, mhAd(e.mid), 'Panel radyatör tip ' + e.tip, `${e.H} × ${Math.round(e.L * 1000)} mm`, `${fi(e.Qn)} W`]);
  const fcListe = () => cihazListe('SOĞUTMA — CİHAZ LİSTESİ', C.doc.ents.filter(e => e.type === 'mtfc'), e => [e.no, mhAd(e.mid), e.tip === 'split' ? 'Split klima (iç + dış ünite)' : 'Kaset tipi fancoil', e.model || '', `${f((e.Qn || 0) / 1000, 1)} kW`]);
  const SIS = {
    isitma: { ad: 'ISITMA TESİSATI', kisa: 'ISITMA', var: () => C.doc.ents.some(e => e.type === 'mtrad'), ents: e => e.type === 'mtrad' || ((e.type === 'mtboru' || e.type === 'mtkolon') && !e.sys),
      sema: () => MT.elektrikHesap && MT.elektrikHesap() ? [['elkolon', MT.elKolonSemasi ? MT.elKolonSemasi() : null], ['ellist', MT.elektrikListe()]] : [['kolon', MT.kolonSemasi()], ['radlist', radListe()]] },
    sogutma: { ad: 'SOĞUTMA TESİSATI', kisa: 'SOĞUTMA', var: () => C.doc.ents.some(e => e.type === 'mtfc'), ents: e => e.type === 'mtfc' || ((e.type === 'mtboru' || e.type === 'mtkolon') && e.sys === 'sog'),
      sema: () => { let g = null; try { g = MT.sogutmaSemasi(); } catch (er) { } return [['sog', g], ['soglist', fcListe()]]; } },
    hava: { ad: 'HAVALANDIRMA', kisa: 'HAVALANDIRMA', var: () => C.doc.ents.some(e => e.type === 'mthv'), ents: e => e.type === 'mthv' || e.type === 'mtkanal',
      sema: () => [['hvlist', cihazListe('HAVALANDIRMA — CİHAZ LİSTESİ', C.doc.ents.filter(e => e.type === 'mthv'), e => [e.no || '', mhAd(e.mid), HVAD[e.kind] || e.kind, e.model || (e.boy ? e.boy + ' mm' : ''), `${fi(e.V)} m³/h`], C.doc.ents.filter(e => e.type === 'mtkanal').map(k => `${k.sys === 'besleme' ? 'Besleme' : 'Egzoz'} kanalı ${k.a}×${k.b} mm — ${f(k.pts.reduce((s, p, i) => i ? s + M.dist2(k.pts[i - 1], p) : 0, 0), 1)} m · ${fi(k.V)} m³/h · ${f(k.v, 1)} m/s`))]] },
  };
  MT._SIS = SIS; MT._cihazListe = (...a) => cihazListe(...a); MT._mhAd = id => mhAd(id);
  const HVAD = { duvarfan: 'Duvar tipi aksiyal fan', kanalfan: 'Kanal tipi fan', catifan: 'Çatı tipi fan', hucrefan: 'Hücreli fan', panjur: 'Taze hava panjuru', menfez: 'Menfez', difuzor: 'Difüzör', rooftop: 'Rooftop (çatı tipi paket klima)' };
  const mhAd = id => { const o = MT.mahaller().find(q => q.id === id); return o ? `${o.no || ''} ${o.ad || ''}`.trim() : ''; };
  const cihazListe = (baslik, list, satir, ek) => { const c = cizer(), col = [0, 16, 70, 124, 170, 200], bas = ['No', 'Mahal', 'Cihaz', 'Model / boyut', 'Kapasite'], rh = 6, n = list.length, top = (n + 1) * rh;
    for (let i = 0; i <= n + 1; i++) c.L(0, top - i * rh, col[5], top - i * rh, i < 2 || i === n + 1 ? 'k' : 'i'); col.forEach((x, i) => c.L(x, top, x, top - (n + 1) * rh, i === 0 || i === 5 ? 'k' : 'i'));
    bas.forEach((b, i) => c.T(col[i] + 1.5, top - rh + 1.8, 2.2, b, 'L', 0, 2)); list.forEach((e, i) => satir(e).forEach((t, j) => c.T(col[j] + 1.5, top - (i + 2) * rh + 1.8, 2, String(t).slice(0, 30), 'L')));
    (ek || []).forEach((t, i) => c.T(0, -5 - i * 4.5, 2.2, t, 'L')); c.T(0, top + 4, 4, baslik, 'L', 0, 2); return c.g; };
  const MTLAY = () => C.doc.layers ? (Array.isArray(C.doc.layers) ? C.doc.layers.map(l => l.name) : Object.keys(C.doc.layers)).filter(n => /^MT_/.test(n)) : [];
  const svList = () => { try { const l = C.seviyeler ? C.seviyeler() : []; return Array.isArray(l) ? l : []; } catch (er) { return []; } };

  /* ---- eski çizimleri düzelt (bir kez): 3B'de üretildiği için planda görünmeyen tesisat nesneleri, disiplin şablonunun gizlediği / soldurduğu katman adları ---- */
  const KATMAN = { MT_ELEKTRIKLI_ISITICI: ['MT_ISITICI', 2, 30], MT_KOLON_SEMASI: ['MT_SEMA', 7, 25], MT_YALITIM_DETAY: ['MT_ISI_DETAY', 6, 25], MT_YALITIM_NOT: ['MT_ISI_NOT', 6, 18] };
  MT.goc = () => { let n = 0; for (const e of C.doc.ents) { if (/^mt/.test(e.type) && e.sp) { delete e.sp; delete e._c; n++; } const k = KATMAN[e.layer]; if (k) { C.ensureLayer(k[0], k[1], 'CONTINUOUS', k[2]); e.layer = k[0]; delete e._c; n++; } } return n; };
  { const ne0 = C.newEnt; C.newEnt = function (type, props) { const e = ne0.apply(this, arguments); if (/^mt/.test(type)) { delete e.sp; const k = KATMAN[e.layer]; if (k) { C.ensureLayer(k[0], k[1], 'CONTINUOUS', k[2]); e.layer = k[0]; } } return e; }; }
  { const s0 = MT.set; MT.set = function () { const m = s0.apply(this, arguments); if (C.doc && C.doc._mtGoc !== C.doc.ents) { C.doc._mtGoc = C.doc.ents; try { MT.goc(); } catch (er) { } } return m; }; }
  /* tesisat kat planı penceresi: modelden alınan kesit planı (vp.mtGv) + yalnız o sistemin tesisatı + mahal etiketleri */
  const planGvler = () => { const st = (C.doc.set.mt || {}).planGv || {}, o = new Set(); for (const k in st) for (const g of st[k] || []) o.add(g); return o; };
  if (C.vpPrims && !C._mtVpSar) { const v0 = C.vpPrims, ISR = e => e.type === 'mtdelik' || e.type === 'mtcakis', kat = (e, vp) => { if (vp.mtZ == null && !ISR(e)) return true; if (ISR(e)) { const sa = { isitma: 'Isıtma', sogutma: 'Soğutma', hava: 'Havalandırma', sihhi: 'Sıhhi' }[vp.mtPlan]; if (e.sys && sa && !String(e.sys).includes(sa)) return false; const z = (e.p && e.p[2]) || 0; if (vp.mtZ == null) return true; return z > vp.mtZ - 0.35 && z < vp.mtZ + (vp.mtH || 3.2) - 0.35; } return e.z0 == null || Math.abs((+e.z0 || 0) - vp.mtZ) < 0.05; };
    C.vpPrims = function (vp, cb) { if (!vp || !vp.mtPlan) return v0.call(this, vp, cb); const S = SIS[vp.mtPlan], bizim = e => (S.ents(e) || e.type === 'mtmahal' || ISR(e)) && kat(e, vp); return v0.call(this, vp, (e, pr) => { if (e.gv) { if (e.gv !== vp.mtGv) return; } else if (vp.mtGv ? !bizim(e) : (!bizim(e) && (/^mt/.test(e.type) || ['cati', 'kaplama', 'plak', 'tretuvar', 'temel', 'dolgu', 'kazi', 'arazi', 'korkuluk', 'yalitim'].includes(e.type) || /CATI|ÇATI/i.test(e.layer || '')))) return; cb(e, pr); }); }; C._mtVpSar = true; }
  /* kesit planları modelin üstüne (yerinde) üretilir: Tasarım planında gizlenir, yalnız paftada görünür */
  { const P2 = C.View2D && C.View2D.prototype; if (P2 && !P2._mtGiz) { const wf = (self, fn) => { if (self.isLayout || C.vpEdit) return fn(); const gs = planGvler(); if (!gs.size) return fn(); const all = C.doc.ents; if (!all.some(e => e.gv && gs.has(e.gv))) return fn(); C.doc.ents = all.filter(e => !(e.gv && gs.has(e.gv))); try { return fn(); } finally { C.doc.ents = all; } }; for (const k of ['draw', 'pick', 'windowSel', 'snap', 'zoomExtents']) { const f0 = P2[k]; if (f0) P2[k] = function () { return wf(this, () => f0.apply(this, arguments)); }; } P2._mtGiz = true; } }

  /* ---- pafta yazı boyutu: başlıklar, şema ve tablolar (punto; 14 pt = 5 mm varsayılan) ---- */
  MT.paftaPunto = () => { const v = +(MT.set().paftaPunto); return v >= 5 && v <= 30 ? v : 14; };
  const yaziK = () => MT.paftaPunto() / 14;
  const gOlcek = (g, k) => (Math.abs(k - 1) < 1e-6 || !g) ? g : { L: g.L.map(l => [l[0] * k, l[1] * k, l[2] * k, l[3] * k, l[4]]), T: g.T.map(t => [t[0] * k, t[1] * k, t[2] * k, t[3], t[4], t[5], t[6]]) };
  if (C.vpLabelPrims && !C._mtEtiket) { const lb0 = C.vpLabelPrims, TX = C.prim.TX, Ln = C.prim.L;
    C.vpLabelPrims = Lay => { if (!Lay || !Lay.mtPafta) return lb0(Lay); const vs = Lay.vps.filter(v => v.label), sv = vs.map(v => v.label); vs.forEach(v => { v.label = null; }); let out; try { out = lb0(Lay) || []; } finally { vs.forEach((v, i) => { v.label = sv[i]; }); }
      const h = MT.paftaPunto() * 0.3528, h2 = h * 0.6; for (const vp of vs) { const x = vp.x + vp.w / 2, y = vp.y - h - 2, w1 = C.measureText ? C.measureText(vp.label, h) : vp.label.length * h * 0.8; out.push(TX([x, y, 0], h, vp.label, 0, 'BC'), TX([x, y - h * 0.9, 0], h2, vp.g3 && vp.g3.tip === 'PERSPEKTIF' ? 'ÖLÇEKSİZ' : 'Ö: 1/' + vp.scale, 0, 'TC'), Ln([x - w1 / 2 - 2, y - h * 0.24, 0], [x + w1 / 2 + 2, y - h * 0.24, 0], { lw: 50 })); } return out; };
    C._mtEtiket = true; }

  /* sistem paftası (firma kuralı 14.11.2026: Mimari gibi otomatik): kat planları (modelden +1,20 kesit planı, yerinde; yalnız o sistemin tesisatı),
     3B dış / iç görünüş, kolon şeması ve cihaz listeleri — pencereler pafta ölçeğinde (SC: MT.paftaOlcek, bina ebatına göre) ve en az kâğıtla (MT.paftaKur) */
  MT.tesisatPafta = (tur, SC) => {
    const S = SIS[tur]; if (!S || !S.var()) return null; const bb0 = binaKutu(); if (!bb0) return null; MT.goc();
    SC = +SC || (MT.paftaOlcek ? MT.paftaOlcek().olcek : 50);
    const st = MT.set(); st.planGv = st.planGv || {}; const eski = st.planGv[tur] || []; if (eski.length) C.doc.ents = C.doc.ents.filter(e => !(e.gv && eski.includes(e.gv))); st.planGv[tur] = [];
    const lays = C.doc.layouts = C.doc.layouts || []; C.doc.layouts = lays.filter(L => L.mtPafta !== tur);
    const AN = C.doc.set.anno, bl = [];
    /* kat planları: modelden +1,20 kesit planı (yerinde) + tesisat */
    const zs = [...new Set(C.doc.ents.filter(S.ents).map(e => +e.z0 || 0))].sort((a, b) => a - b), sv = svList(), kats = zs.slice(0, 4), n = Math.max(1, kats.length);
    const pad = 1.6, bb = [bb0[0] - pad, bb0[1] - pad, bb0[2] + pad, bb0[3] + pad], vw = (bb[2] - bb[0]) * 1000 / SC + 6, vh = (bb[3] - bb[1]) * 1000 / SC + 6;
    const mk = Object.values(st.katlar || {}), yapiE = yapiEnts().filter(e => e.type !== 'cati' && e.type !== 'yalitim' && e.type !== 'kaplama');
    kats.forEach((z, i) => { const lv = sv.find(l => Math.abs((+l.z || 0) - z) < 0.05), kt = mk.find(q => Math.abs((q.z || 0) - z) < 1e-6), ad = (lv && lv.ad) || (kt && kt.ad) || (n > 1 ? `kot ${z >= 0 ? '+' : ''}${f(z, 2)}` : '');
      let gv = null; try { if (C.makeView) { const once = new Set(C.doc.ents.map(e => e.id)), pl = C.makeView({ kind: 'plan', h: z + 1.2, depth: 1.22, place: 'yerinde', hatch: 'ANSI31', ents: yapiE }); if (pl) { gv = pl.gv; st.planGv[tur].push(gv); for (const e of C.doc.ents) if (!once.has(e.id)) { delete e.sp; delete e.sv2; if (e.type === 'baslik' || e.type === 'text') e._mtSil = 1; } C.doc.ents = C.doc.ents.filter(e => !e._mtSil); } } } catch (er) { console.error(er); }
      const vp = { cx: (bb[0] + bb[2]) / 2, cy: (bb[1] + bb[3]) / 2, scale: SC, lock: true, disiplin: 'Mekanik', label: `${S.kisa} — ${ad ? ad.toLocaleUpperCase('tr') + ' ' : ''}KESİT PLANI`, mtPlan: tur, mtZ: z, mtH: (kats[i + 1] != null ? kats[i + 1] - z : 3.4) }; if (gv) vp.mtGv = gv; else if (lv && sv.length) vp.sv = lv.id;
      bl.push({ vp, w: vw, h: vh, grup: 'KAT PLANLARI' }); });
    let sl = []; try { sl = (S.sema() || []).filter(q => q && q[1]).map(q => [q[0], gOlcek(q[1], yaziK())]); } catch (er) { console.error(er); }
    /* 3B görünüş: dış görünüş cihazın dış ünitesi / fanı hangi cephedeyse o köşeden; iç görünüş cihazların olduğu mahalin içinden perspektif (ölçeksiz) */
    const zTop = Math.max(...MT.mahaller().map(e => (+e.z0 || 0) + (+e.h || 3))), ustu = C.doc.ents.some(e => e.type === 'mthv' && (e.kind === 'catifan' || e.kind === 'rooftop')) && tur === 'hava', cati = e => !ustu && (e.type === 'cati' || (e.type === 'plak' && (+e.zt || 0) > zTop - 0.6));
    const yapi = e => !/^mt/.test(e.type) && e.type !== 'yalitim' && e.type !== 'kaplama' && e.dis !== 'Elektrik' && !cati(e), ids = C.doc.ents.filter(e => !e.gv && (S.ents(e) || yapi(e))).map(e => e.id);
    const cih = C.doc.ents.filter(e => !e.gv && S.ents(e) && e.p && e.mid != null), say = new Map(); cih.forEach(e => say.set(e.mid, (say.get(e.mid) || 0) + 1));
    const oda = MT.mahaller().find(o => o.id === ([...say].sort((a, b) => b[1] - a[1])[0] || [])[0]), ic = oda ? cih.filter(e => e.mid === oda.id) : [];
    let yon = 'GB'; { let nx = 0, ny = 0; for (const e of cih) { const d = e.dp ? [e.dp[0] - e.p[0], e.dp[1] - e.p[1]] : (oda && e.mid === oda.id ? [e.p[0] - (oda.lp || MT.icNokta(oda.pts))[0], e.p[1] - (oda.lp || MT.icNokta(oda.pts))[1]] : null); if (d) { const l = Math.hypot(d[0], d[1]) || 1; nx += d[0] / l; ny += d[1] / l; } } if (Math.hypot(nx, ny) > 0.2) yon = (ny >= 0 ? 'K' : 'G') + (nx >= 0 ? 'D' : 'B'); }
    const G3 = { w: 180, h: 120 }, G3I = { w: 150, h: 110 };
    bl.push({ vp: { _yeni: true, cx: 0, cy: 0, scale: 100, lock: true, frame: { on: false }, olceksiz: true, g3: { mod: 'MEKANIK', yon, tip: 'PERSPEKTIF', kam: null, olcek: null, ids, gv: null }, label: `${S.kisa} — DIŞ GÖRÜNÜŞ`, mtG3: tur }, w: G3.w, h: G3.h, grup: '3B GÖRÜNÜŞLER' });
    if (ic.length) { const zb = +oda.z0 || 0, hO = +oda.h || 3, zc = e => e.type === 'mtrad' ? zb + 0.5 : e.type === 'mtarm' ? zb + 0.7 : e.type === 'mtfc' && e.tip === 'split' ? zb + (e.zm != null ? +e.zm : hO - 0.42) + 0.15 : zb + hO - 0.35;
      const e1 = ic.slice().sort((a, b) => (b.Qn || b.V || b.sb || 0) - (a.Qn || a.V || a.sb || 0))[0], T3 = [e1.p[0], e1.p[1], zc(e1)]; /* en büyük cihaza bakılır */
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const q of oda.pts) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
      let cam = oda.lp || MT.icNokta(oda.pts), bd = -1; for (let a = 1; a < 12; a++) for (let b = 1; b < 12; b++) { const q = [x0 + (x1 - x0) * a / 12, y0 + (y1 - y0) * b / 12]; if (!MT.inPoly(q, oda.pts)) continue; let dk = Infinity; for (let t = 0; t < oda.pts.length; t++) { const A = oda.pts[t], Bq = oda.pts[(t + 1) % oda.pts.length], l2 = (Bq[0] - A[0]) ** 2 + (Bq[1] - A[1]) ** 2 || 1, kk = Math.max(0, Math.min(1, ((q[0] - A[0]) * (Bq[0] - A[0]) + (q[1] - A[1]) * (Bq[1] - A[1])) / l2)); dk = Math.min(dk, Math.hypot(q[0] - A[0] - (Bq[0] - A[0]) * kk, q[1] - A[1] - (Bq[1] - A[1]) * kk)); } if (dk < 0.35) continue; const d = Math.hypot(q[0] - T3[0], q[1] - T3[1]); if (d > bd) { bd = d; cam = q; } }
      const cz = zb + Math.min(hO - 0.3, 1.6), dx = cam[0] - T3[0], dy = cam[1] - T3[1], dz = cz - T3[2], dist = Math.max(1.2, Math.hypot(dx, dy, dz)), asp = G3I.w / G3I.h;
      const idsIc = C.doc.ents.filter(e => !e.gv && (S.ents(e) || (!/^mt/.test(e.type) && e.type !== 'yalitim' && e.dis !== 'Elektrik'))).map(e => e.id);
      bl.push({ vp: { cx: 0, cy: 0, scale: 100, lock: true, frame: { on: false }, olceksiz: true, g3: { mod: 'TUMU', yon: 'EKRAN', tip: 'PERSPEKTIF', kam: { yaw: Math.atan2(dy, dx), pitch: Math.asin(Math.max(-0.9, Math.min(0.9, dz / dist))), persp: true, dist, t: T3, asp }, olcek: null, ids: idsIc, gv: null }, label: `${S.kisa} — İÇ GÖRÜNÜŞ (${(oda.no || '') + ' ' + (oda.ad || '')})`.replace(/\s+\)/, ')'), mtG3: tur + 'ic' }, w: G3I.w, h: G3I.h, grup: '3B GÖRÜNÜŞLER' }); }
    /* kolon şeması + cihaz / radyatör listesi: modelde Mekanik bölgesinde, paftada kendi boyunda (ölçeksiz şema / tablo) */
    const k = AN / 1000;
    for (const [st2, g] of sl) { const e = semaKoy(st2, g); e.layer = MT._lay('MT_SEMA', 7, 25); const gb = gKutu(g); if (!gb) continue; const gw = gb[2] - gb[0] + 8, gh = gb[3] - gb[1] + 8;
      bl.push({ vp: { cx: e.p[0] + (gb[0] + gb[2]) / 2 * k, cy: e.p[1] + (gb[1] + gb[3]) / 2 * k, scale: AN, lock: true, frame: { on: false }, frozen: [], disiplin: 'Genel', mtSema: tur, olceksiz: true }, w: gw, h: gh, grup: 'ŞEMA VE LİSTELER' }); }
    const Ls = MT.paftaKur(tur, S.ad, S.ad + ' PROJESİ', bl);
    try { if (C.g3Guncelle) C.g3Guncelle(true); } catch (er) { console.error(er); }
    return Ls.length ? Ls : null;
  };

  /* ====================================================================
     ISI YALITIM PAFTASI: modelden kesit planı (+1,20) + düşey kesit (yalıtım katmanları açıklamalı) + detaylar + 3B
     ==================================================================== */
  const gvSil = () => { const st = MT.set(), g = st.yalGv || []; if (g.length) C.doc.ents = C.doc.ents.filter(e => !(e.gv && g.includes(e.gv)) && !(e.type === 'kesitisaret' && e.name === 'Y')); st.yalGv = []; };
  const yapiEnts = () => C.doc.ents.filter(e => C.layer(e.layer).on && !e.gv && C.in3D(e) && !/^mt/.test(e.type) && !['arazi', 'kazi', 'sheet'].includes(e.type));
  const not = (gv, a, b, s, h) => { const ly = MT._lay('MT_ISI_NOT', 6, 18), d = b[0] >= a[0] ? 1 : -1; const l1 = C.add(C.newEnt('line', { layer: ly, a: [a[0], a[1], 0], b: [b[0], b[1], 0], gv })), l2 = C.add(C.newEnt('line', { layer: ly, a: [b[0], b[1], 0], b: [b[0] + d * h * 2, b[1], 0], gv })), t = C.add(C.newEnt('text', { layer: ly, p: [b[0] + d * h * 2.4 - (d < 0 ? s.length * h * 0.62 : 0), b[1] - h * 0.4, 0], h, s, rot: 0, gv })); for (const x of [l1, l2, t]) { delete x.sp; delete x.sv2; } };
  MT.yalitimPafta = async (I, SC) => {
    const bb0 = binaKutu(); if (!bb0 || !C.makeView) return null; const st = MT.set(), all = MT.mahaller(), z0 = Math.min(...all.map(e => +e.z0 || 0)), p = MT.yalitimPlan(), sc = +SC || (MT.paftaOlcek ? MT.paftaOlcek().olcek : 50), th = 2.5 * yaziK() * sc / 1000;
    gvSil(); const lays = C.doc.layouts = C.doc.layouts || []; C.doc.layouts = lays.filter(L => L.mtPafta !== 'yalitim');
    const BG = bolge(), yx = BG.gx, yy = BG.gy;
    /* a) kesit planı: zemin kat +1,20 */
    let pl = null; try { pl = C.makeView({ kind: 'plan', h: z0 + 1.2, depth: 1.25, place: [yx, yy], hatch: 'ANSI31', ents: yapiEnts().filter(e => e.type !== 'cati') }); } catch (er) { console.error(er); }
    if (pl) st.yalGv.push(pl.gv);
    /* b) düşey kesit: en geniş dış pencerenin ortasından, duvara dik */
    let best = null; for (const e of all) for (const y of e.yuz || []) { if (y.k !== 'dis') continue; for (const a of y.ac || []) { const o = C.byId(a.id), hf = o && C._ins ? C._ins.hostFrame(o) : null; if (!hf) continue; if (!best || a.w > best.w) best = { w: a.w, c: [hf.sf.a[0] + hf.sf.u[0] * (+o.s || 0), hf.sf.a[1] + hf.sf.u[1] * (+o.s || 0)], u: [(y.b[0] - y.a[0]) / y.L, (y.b[1] - y.a[1]) / y.L] }; } }
    const c = best ? best.c : [(bb0[0] + bb0[2]) / 2, (bb0[1] + bb0[3]) / 2], yatay = best ? Math.abs(best.u[1]) > Math.abs(best.u[0]) : (bb0[2] - bb0[0]) < (bb0[3] - bb0[1]);
    const A = yatay ? [bb0[0] - 2.2, c[1]] : [c[0], bb0[1] - 2.2], B = yatay ? [bb0[2] + 2.2, c[1]] : [c[0], bb0[3] + 2.2], sp = yatay ? [A[0], c[1] + 5] : [c[0] - 5, A[1]];
    let ks = null; const kyer = [yx, yy + (bb0[3] - bb0[1]) + 16];
    try { const def = C.cmds.SECTION || C.cmds.KESITAL; if (def) { const once = new Set(C.doc.ents.map(e => e.id)), s0 = E.scriptMode, q0 = E.queue, pt = q => `${(+q[0]).toFixed(4)},${(+q[1]).toFixed(4)}`; E.queue = [pt(A), pt(B), pt(sp), '12', 'Y', pt(kyer)]; E.scriptMode = true; try { await def.fn(I, C); } finally { E.queue = q0 || []; E.scriptMode = s0; }
        const yeni = C.doc.ents.filter(e => !once.has(e.id)); if (yeni.length) { ks = { gv: 'MTY' + Date.now().toString(36) }; for (const e of yeni) { delete e.sp; delete e.sv2; delete e._c; if (e.type === 'kesitisaret') continue; e.gv = ks.gv; } st.yalGv.push(ks.gv);
          /* yalıtım açıklamaları: kesit koordinatı = yerleşim + [kesit çizgisi boyunca s, kot] */
          const Q = (s, z) => [kyer[0] + s, kyer[1] + z], Ls = M.dist2(A, B), cy = C.doc.ents.find(e => e.type === 'yalitim' && e.kind === 'cephe'), ct = C.doc.ents.find(e => e.type === 'yalitim' && e.kind === 'cati'), zm = C.doc.ents.find(e => e.type === 'yalitim' && e.kind === 'zemin'), hK = Math.max(...all.map(e => (+e.h || 3)));
          if (cy && p && p.cephe) { not(ks.gv, Q(2.2 - (+cy.t || 5) / 200, z0 + 0.45), Q(1.2, z0 + 1.6), `DIŞ CEPHE: ${p.cephe.t} cm ${p.cephe.mat.toUpperCase()} MANTOLAMA`, th); if (best) not(ks.gv, Q(2.2, z0 + 0.86), Q(1.2, z0 + 2.3), 'SÖVE DÖNÜŞÜ 3 cm XPS + DENİZLİK', th); }
          if (ct && p && p.cati) not(ks.gv, Q(Ls * 0.62, (+ct.z || 0) + (+ct.t || 0) / 200), Q(Ls - 1.0, (+ct.z || 0) + 1.1), `ÇATI: ${p.cati.t} cm ${p.cati.mat.toUpperCase()}${p.cati.buhar === 'E' ? ' + BUHAR KESİCİ' : ''}${p.cati.su !== 'yok' ? ' + SU YALITIMI' : ''}`, th);
          if (zm && p && p.zemin) not(ks.gv, Q(Ls * 0.62, (+zm.z0 || 0) + (+zm.t || 0) / 200), Q(Ls - 1.0, (+zm.z0 || 0) - 0.9), `ZEMİN ALTI: ${p.zemin.t} cm ${p.zemin.mat.toUpperCase()}${p.zemin.su !== 'yok' ? ' + SU YALITIMI' : ''}`, th);
        } } } catch (er) { console.error(er); C.warn('Kesit üretilemedi: ' + (er && er.message || er)); }
    /* c) detaylar */
    let dg = null, de = null; try { dg = gOlcek(MT.yalitimDetay(1), yaziK()); if (dg) { de = semaKoy('yaldetay', dg); de.layer = MT._lay('MT_ISI_DETAY', 6, 25); } } catch (er) { console.error(er); }
    /* pafta: pencereler pafta ölçeğinde (sc), en az kâğıtla (MT.paftaKur) */
    const bl = [], gvBlok = (gv, label, grup) => { C.doc.ents = C.doc.ents.filter(e => !(e.gv === gv && e.type === 'baslik')); /* başlık pencere etiketinde (çift başlık olmasın) */ const es = C.doc.ents.filter(e => e.gv === gv); if (!es.length) return; es.forEach(e => { delete e._c; }); const b = C.withAnno ? C.withAnno(sc, () => C.extents(es)) : C.extents(es); if (!b) return;
      bl.push({ vp: { cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2, scale: sc, gvOnly: gv, lock: true, frame: { on: false }, disiplin: 'Mekanik', label }, w: (b[2] - b[0]) * 1000 / sc + 8, h: (b[3] - b[1]) * 1000 / sc + 8, grup }); };
    if (pl) gvBlok(pl.gv, 'ISI YALITIMI — KESİT PLANI (+1,20)', 'PLAN VE KESİT');
    if (ks) gvBlok(ks.gv, 'ISI YALITIMI — Y-Y KESİTİ', 'PLAN VE KESİT');
    if (de) { const AN = C.doc.set.anno, k = AN / 1000, gb = gKutu(dg), gw = gb[2] - gb[0] + 8, gh = gb[3] - gb[1] + 8; bl.push({ vp: { cx: de.p[0] + (gb[0] + gb[2]) / 2 * k, cy: de.p[1] + (gb[1] + gb[3]) / 2 * k, scale: AN, lock: true, frame: { on: false }, frozen: [], disiplin: 'Genel', mtSema: 'yalitim', olceksiz: true }, w: gw, h: gh, grup: 'DETAYLAR' }); }
    const ids = yapiEnts().filter(e => e.type !== 'cati' && e.dis !== 'Elektrik').map(e => e.id);
    bl.push({ vp: { _yeni: true, cx: 0, cy: 0, scale: 100, lock: true, frame: { on: false }, olceksiz: true, g3: { mod: 'TUMU', yon: 'GB', tip: 'IZOMETRIK', kam: null, olcek: null, ids, gv: null }, label: 'ISI YALITIMI — 3B GÖRÜNÜŞ', mtG3: 'yalitim' }, w: 180, h: 140, grup: '3B GÖRÜNÜŞLER' });
    const Ls = MT.paftaKur('yalitim', 'ISI YALITIMI', 'ISI YALITIM PROJESİ', bl);
    try { C.g3Guncelle && C.g3Guncelle(true); } catch (er) { console.error(er); }
    return Ls.length ? Ls : null;
  };

  /* ====================================================================
     KOMUTLAR
     ==================================================================== */
  C.addCommand(['ISIYALITIMDETAY', 'YALITIMDETAY'], 'Isı yalıtım detayları: kullanılan dış duvar, çatı ve taban kesitleri — katmanlar, kalınlık, λ, U değeri ve TS 825 sınırı, yoğuşma sonucu. Yer tıklayın (Enter = modelin sağına).', async (I) => {
    const g = MT.yalitimDetay(); if (!g) { C.warn('Önce MAHALBUL ile mahalleri oluşturun.'); return; }
    const p = E.scriptMode ? null : await I.pt('Detayların yeri (sol alt) — Enter = modelin sağına'); C.undoStack.push(C.snapshot());
    if (p && typeof p !== 'string') { C.doc.ents = C.doc.ents.filter(e => !(e.type === 'mtsema' && e.tur === 'yaldetay')); C.add(C.newEnt('mtsema', { layer: MT._lay('MT_ISI_DETAY', 6, 25), dis: 'Mekanik', p: M.p3(p), g, tur: 'yaldetay' })); } else { const e = semaKoy('yaldetay', g); e.layer = MT._lay('MT_ISI_DETAY', 6, 25); }
    C.changed(); C.log('Isı yalıtım detayları çizildi.');
  });
  C.addCommand(['YALITIMUYGULA', 'ISIYALITIMUYGULA'], 'Isı yalıtım hesabındaki malzeme ve kalınlıklarla yalıtımı modele uygular: dış cephe mantolama, çatı / teras yalıtımı, zemin altı yalıtım; ardından yalıtım detaylarını çizer.', async (I) => {
    const p = MT.yalitimPlan(); if (!p) { C.warn('Önce MAHALBUL ile mahalleri oluşturun ve yapı elemanlarını denetleyin (Tesisat ▸ Mekanik tesisat ▸ 2 · Yapı elemanları).'); return; }
    if (!C.cmds.CEPHEYALITIM) { C.warn('Yalıtım modülü (yalitim.js) yüklü değil.'); return; }
    if (p.catiDegisti) C.log('Modelde eğimli çatı var: hesapta çatı tipi "Çatı arası döşemesi (üstü kırma çatı)" olarak değiştirildi; ısı kaybı ve rapor buna göre yenilenir.');
    const once = { cephe: say('cephe'), cati: say('cati'), zemin: say('zemin') }, not = [];
    if (p.cephe) { await calis(I, `CEPHEYALITIM MAT=${p.cephe.mat} T=${p.cephe.t} Z=${+p.z0.toFixed(2)}`); const cb = C.doc.ents.filter(e => e.type === 'yalitim' && e.kind === 'cephe').map(e => { delete e._c; return MT.cepheBosluk(e); }).reduce((x, b) => ({ n: x.n + b.n, A: x.A + b.A }), { n: 0, A: 0 }); not.push(say('cephe') ? `dış cephe: ${p.cephe.t} cm ${p.cephe.mat.toUpperCase()} mantolama${cb.n ? ` (${cb.n} pencere / kapı boşluğu açıldı, ${f(cb.A, 1)} m² düşüldü, söve dönüşleri yapıldı)` : ''}` : 'dış cephe: bina dış çevresi bulunamadı'); } else not.push('dış duvarda ısı yalıtım katmanı tanımlı değil — cephe yalıtımı atlandı');
    if (p.cati) { C.remove(C.doc.ents.filter(e => e.type === 'yalitim' && e.kind === 'cati')); await calis(I, `CATIYALITIM BUHAR=${p.cati.buhar} EGIM=${Math.round(p.cati.egim)} MAT=${p.cati.mat} T=${p.cati.t} SU=${p.cati.su} KOR=${p.cati.kor} T`); not.push(say('cati') ? `çatı: ${p.cati.t} cm ${p.cati.mat.toUpperCase()}${p.cati.buhar === 'E' ? ' + buhar kesici' : ''}${p.cati.su !== 'yok' ? ' + su yalıtımı' : ''} (${say('cati')} döşeme)` : 'çatı: çatı döşemesi bulunamadı'); }
    if (p.zemin) { C.remove(C.doc.ents.filter(e => e.type === 'yalitim' && e.kind === 'zemin')); await calis(I, `ZEMINYALITIM SU=${p.zemin.su} MAT=${p.zemin.mat} T=${p.zemin.t} T`); not.push(say('zemin') ? `zemin altı: ${p.zemin.t} cm ${p.zemin.mat.toUpperCase()} (${say('zemin')} mahal)` : 'zemin altı: oda bulunamadı (zemin döşemesi / kapalı duvar çevresi gerekir)'); }
    try { const g = MT.yalitimDetay(); if (g) { const e = semaKoy('yaldetay', g); e.layer = MT._lay('MT_ISI_DETAY', 6, 25); not.push('yalıtım detayları modelin sağına çizildi'); } } catch (er) { console.error(er); }
    C.changed(); C.emit && C.emit('layers'); C.log('Isı yalıtımı modele uygulandı — ' + not.join(' · ') + '.');
    if (once.cephe || once.cati || once.zemin) C.log('Not: önceki cephe / çatı / zemin yalıtımları hesaptaki değerlerle yenilendi (Geri Al ile dönülebilir).');
  });
  /* ---- çıktı: tesisat paftaları (yazdır / PDF) ve AutoCAD DXF ---- */
  const tPaftalar = () => (C.doc.layouts || []).filter(L => L.mtPafta), SIRA = { yalitim: 0, isitma: 1, sogutma: 2, hava: 3, sihhi: 4 };
  C.addCommand(['TESISATCIKTI', 'TESISATYAZDIR', 'TESISATPDF'], 'Tesisat paftalarını (ısı yalıtımı, ısıtma, soğutma, havalandırma) tek yazdırma işinde çıkarır: yazıcı ya da "PDF olarak kaydet" (çok sayfalı).', async (I) => {
    const ls = tPaftalar().sort((a, b) => SIRA[a.mtPafta] - SIRA[b.mtPafta]); if (!ls.length) { C.warn('Tesisat paftası yok: önce TESISATPAFTA ile oluşturun.'); return; }
    const mode = await I.kw('Renk', [['R', 'Renkli'], ['S', 'Siyah-beyaz']], 'R'); if (!mode) return;
    try { C.g3Guncelle && C.g3Guncelle(false); } catch (er) { }
    const pages = ls.map(L => C.layoutSvg(L, { mono: mode === 'S' })), { w, h } = pages[0], win = window.open('', '_blank'); if (!win) { C.warn('Açılır pencere engellendi: tarayıcıda bu site için açılır pencerelere izin verin.'); return; }
    const x = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${x(C.doc.set.name)} - tesisat paftaları</title><style>@page{size:${w}mm ${h}mm;margin:0}html,body{margin:0;background:#888}svg{display:block;background:#fff;margin:0 auto 10px;page-break-after:always}@media print{body{background:#fff}svg{margin:0}}</style></head><body>${pages.map(q => q.svg).join('\n')}<script>setTimeout(()=>print(),700)<\/script></body></html>`); win.document.close();
    C.log(`${pages.length} tesisat paftası yazdırma penceresinde (${ls.map(L => L.name).join(', ')}). Yazıcı olarak "PDF olarak kaydet" seçerseniz çok sayfalı PDF olur.`);
  }, { noUndo: true });
  C.addCommand(['TESISATDXF', 'TESISATDXFKAYDET'], 'Tesisat paftalarını AutoCAD için DXF kaydeder: her pafta ayrı dosya (Layout sekmesi + ölçekli pencereler; model alanında kesit planı, tesisat, şema ve tablolar). 3B görünüş resimleri DXF\'e alınmaz.', async (I) => {
    const ls = tPaftalar().sort((a, b) => SIRA[a.mtPafta] - SIRA[b.mtPafta]); if (!ls.length) { C.warn('Tesisat paftası yok: önce TESISATPAFTA ile oluşturun.'); return; }
    const st = MT.set(), ad = C.ascii ? C.ascii(C.doc.set.name || 'cizim').replace(/[^\w\-]+/g, '_') : 'cizim', EK = { yalitim: 'isi_yalitimi', isitma: 'isitma', sogutma: 'sogutma', hava: 'havalandirma', sihhi: 'sihhi_tesisat' }, TUR = { isitma: ['kolon', 'elkolon', 'ellist', 'radlist'], sogutma: ['sog', 'soglist'], hava: ['hvlist'], yalitim: ['yaldetay'], sihhi: ['shkolon', 'shlist'] }; let n = 0;
    const all = C.doc.layouts;
    for (const L of ls) { const t = L.mtPafta, gs = new Set(t === 'yalitim' ? (st.yalGv || []) : ((st.planGv || {})[t] || [])), S = SIS[t];
      const ents = C.doc.ents.filter(e => (e.gv && gs.has(e.gv)) || (!e.gv && ((S && S.ents(e)) || (S && (e.type === 'mtmahal' || e.type === 'mtdelik' || e.type === 'mtcakis')) || (e.type === 'mtsema' && TUR[t].includes(e.tur)))));
      const L2 = JSON.parse(JSON.stringify(L)); L2.vps = L2.vps.filter(v => !v.g3); /* 3B resim pencereleri DXF'e yazılamaz */
      let txt = null; try { C.doc.layouts = [L2]; txt = C.dxfWrite({ ents, plain: '2b', withLayouts: true }); } catch (er) { C.warn(`${L.name}: DXF yazılamadı — ${er && er.message || er}`); } finally { C.doc.layouts = all; }
      if (txt) { C.download(txt, `${ad}_tesisat_${EK[t]}${L.mtParca ? '_' + (L.mtParca + 1) : ''}.dxf`, 'application/dxf'); n++; await new Promise(r => setTimeout(r, 400)); } }
    if (n) C.log(`${n} DXF dosyası indirildi (her tesisat paftası ayrı dosya). Tarayıcı "birden çok dosya indirme" izni sorarsa izin verin. 3B görünüşler resim olduğu için DXF'te yer almaz; onlar için TESISATCIKTI (PDF) kullanın.`);
  }, { noUndo: true });
  C.addCommand(['TESISATYAZI', 'PAFTAYAZI', 'PAFTAPUNTO'], 'Tesisat paftalarındaki yazı boyutu (punto): görünüş başlıkları, kolon şemaları, tablolar ve yalıtım detayları bu orana göre büyür / küçülür (14 punto = 5 mm başlık, varsayılan). Örnek: TESISATYAZI 10', async (I) => {
    const v = await I.num(`Pafta yazı boyutu — başlık (punto, şimdi ${MT.paftaPunto()})`, MT.paftaPunto()); if (v == null || !(v >= 5 && v <= 30)) { if (v != null) C.warn('5 ile 30 punto arasında bir değer girin.'); return; }
    MT.set().paftaPunto = +v; C.changed();
    if ((C.doc.layouts || []).some(L => L.mtPafta)) { E.queue = []; const s0 = E.scriptMode; try { E.queue = ['T']; E.scriptMode = true; await C.cmds.TESISATPAFTA.fn(I, C); } finally { E.queue = []; E.scriptMode = s0; } }
    C.log(`Pafta yazı boyutu ${v} punto (başlık ${f(v * 0.3528, 1)} mm; şema ve tablo yazıları aynı oranda). Plan içindeki cihaz ve mahal yazıları için sol paneldeki Çizim ayarları ▸ "Yazı yük. (mm)" kullanılır.`);
  });
  C.addCommand(['TESISATPAFTA', 'MEKANIKPAFTA'], 'Mekanik paftalar (Mekanik grubu, otomatik): T = hepsi (çizilmiş sistemler), Y = ısı yalıtımı, I = ısıtma, S = soğutma, H = havalandırma, W = sıhhi tesisat. Ölçek bina ebatına göre (1/50; çok küçükse 1/25, A0\'a sığmazsa 1/100), görünümler en az kâğıtla paftalara; kat planları, kolon şeması / cihaz listesi ve 3B görünüş; pafta no MEK-01 …; yeniden çalıştırınca yenilenir (PAFTAELLE ile işaretli paftalar korunur).', async (I) => {
    const k = await I.kw('Pafta', [['T', 'Hepsi (çizilmiş olan sistemler)'], ['Y', 'Isı yalıtımı (kesit planı + kesit + detay)'], ['I', 'Isıtma'], ['S', 'Soğutma'], ['H', 'Havalandırma'], ['W', 'Sıhhi tesisat (temiz su + pis su)']], 'T'); if (!k) return;
    const turler = k === 'I' ? ['isitma'] : k === 'S' ? ['sogutma'] : k === 'H' ? ['hava'] : k === 'W' ? ['sihhi'] : ['isitma', 'sogutma', 'hava', 'sihhi']; let son = null; const ad = [], korunan = [];
    C.undoStack.push(C.snapshot());
    /* ölçek bina ebatına göre (Mimari ile aynı kural: 1/50; çok küçükse 1/25, A0'a sığmazsa 1/100) — bütün tesisat paftalarında aynı */
    const os = MT.paftaOlcek ? MT.paftaOlcek() : { olcek: 50, neden: '' }, SC = os.olcek;
    /* elle düzeltilmiş paftalar (PAFTAELLE: L.elle) korunur: o sistem yeniden üretilmez */
    const elle = t => (C.doc.layouts || []).some(L => L.mtPafta === t && L.elle);
    const ekle = Ls => { for (const L of [].concat(Ls || [])) { son = son || L; ad.push(`${L.name} (${L.kagit || ''} ${Math.round(L.pw || 0)}×${Math.round(L.ph || 0)} mm, ${L.f && L.f.olcek ? L.f.olcek : '1/' + SC})`); } };
    /* hepsi yenilenirken önceki otomatik şema / tablo / detaylar kaldırılır (elle korunan sistemlerinki kalır), yenileri temiz düzende konur */
    const SEMA_TUR = { isitma: ['kolon', 'elkolon', 'ellist', 'radlist'], sogutma: ['sog', 'soglist'], hava: ['hvlist'], yalitim: ['yaldetay'], sihhi: ['shkolon', 'shlist'] }, sakla = new Set(Object.keys(SEMA_TUR).filter(elle).flatMap(t => SEMA_TUR[t]));
    if (k === 'T') C.doc.ents = C.doc.ents.filter(e => !(e.type === 'mtsema' && OTO_SEMA.has(e.tur) && !sakla.has(e.tur)));
    if (k === 'Y' || k === 'T') { if (elle('yalitim')) korunan.push('ISI YALITIMI'); else try { ekle(await MT.yalitimPafta(I, SC)); } catch (er) { console.error(er); C.warn('Isı yalıtım paftası: ' + (er && er.message || er)); } }
    if (k !== 'Y') for (const t of turler) { if (!SIS[t]) continue; if (elle(t)) { korunan.push(SIS[t].ad); continue; } const Ls = MT.tesisatPafta(t, SC); if (Ls) ekle(Ls); else if (turler.length === 1) C.warn(`${SIS[t].ad}: bu sistemin tesisatı henüz çizilmemiş.`); }
    if (korunan.length) C.log(`Elle düzeltilmiş olarak işaretli paftalar korundu (yeniden üretilmedi): ${korunan.join(', ')}. İşareti kaldırmak için paftayı açıp PAFTAELLE.`);
    if (!son) { if (turler.length > 1 && !korunan.length) C.warn('Pafta oluşturulacak tesisat yok: önce kalorifer / soğutma / havalandırma tesisatını oluşturun.'); return; }
    if (MT.paftaNumarala) MT.paftaNumarala(); // MEK-01 …, sistem sırasıyla
    { const s = C.doc.set; s.grups = s.grups || ['Mimari', 'Mekanik', 'Statik', 'Elektrik', 'Genel']; if (!s.grups.includes('Mekanik')) s.grups.push('Mekanik'); }
    MT.set().paftaOlcek = SC; C.changed(); C.emit && C.emit('layouts'); C.emit && C.emit('layers');
    try { C.layoutIdx = C.doc.layouts.indexOf(son); C.grpCur = 'Mekanik'; C.setView('layout'); C.emit('layouts'); setTimeout(() => { try { C.views.lay.zoomExtents(); } catch (er) { } }, 60); } catch (er) { }
    C.log(`${ad.length} Mekanik pafta hazır, ölçek 1/${SC}${os.neden ? ` (${os.neden})` : ''}: ${ad.join(' · ')}. Sol alttaki Mekanik grubundan açılır; tesisat değişince Mekanik ▸ Mekanik paftalar ile yenileyin.`);
  });
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : (globalThis.C = globalThis.C || {}));

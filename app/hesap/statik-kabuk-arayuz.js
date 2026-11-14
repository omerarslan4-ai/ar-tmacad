/* ArıtmaCAD — STATİK: yay / oval / serbest planlı hazne için 3B KABUK HESABI (statik.html eklentisi)
   ArıtmaCAD modeli dikdörtgen değilse (yay / eğik perde) STATIKMODEL "kabuk" modeli gönderir:
     { kabuk: { walls:[{ad, pts, kapali, t, zt, tip, bolme}], radye:{pts, t, kAlt}, dosemeler:[{ad, pts, t, zt, g, q}] }, geo:{kotlar…} }
   Bu dosya statik penceresinde: önizleme (plan), 3B kabuk sonlu eleman çözümü (statik-kabuk.js), yük durumları
   (G, Q, Hs, Hd ±, Ht, Qs, YAS, deprem X / Y ±: Westergaard su + M-O toprak + YAS + atalet), kombinasyon zarfı (Wood–Armer),
   perde / radye / döşeme gruplarında TS 500 donatı seçimi ve çatlak kontrolü, SAP2000 görünümünde 3B renkli diyagram çizer.
   Dikdörtgen hazne akışına dokunmaz (S.mod !== 'kabuk' iken hiçbir şey değişmez). */
'use strict';
(function () {
  const P = window.STATIK, $ = s => document.querySelector(s), gw = 10;
  const f2 = (v, d = 2) => (v == null || !isFinite(v) ? '—' : (+v).toFixed(d).replace('.', ','));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kabukMu = () => typeof S !== 'undefined' && S && S.mod === 'kabuk' && S.kabuk && Array.isArray(S.kabuk.walls) && S.kabuk.walls.length;
  const pip = (q, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const hull = pts => { const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
  const area = poly => { let a = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]); return Math.abs(a) / 2; };
  let KR = null; // son kabuk sonucu
  P.kabukSonuc = () => KR;

  /* ---------- iç bölge (su tarafı) poligonu ---------- */
  const icBolge = M => {
    const kap = M.walls.filter(w => w.tip === 'dis' && w.kapali).sort((a, b) => area(b.pts) - area(a.pts));
    return kap.length ? kap[0].pts : hull(M.walls.filter(w => w.tip === 'dis').flatMap(w => w.pts));
  };

  /* ---------- yükler ---------- */
  const yukTanim = (S, AG, MAL) => {
    const g = S.geo, M = S.kabuk, z = S.zemin, IT0 = P.itki(S), IT = Object.assign({}, IT0, { dKw: isFinite(IT0.dKw) ? IT0.dKw : (isFinite(IT0.dK) ? IT0.dK : NaN) }), zTop = M.radye.kAlt + M.radye.t;
    const GM = { zTop, zr: M.radye.kAlt + M.radye.t / 2 }, YK = P.perdeYukleri(Object.assign({}, S, { geo: Object.assign({}, g, { kAlt: M.radye.kAlt }) }), GM, IT), fn = YK.fn;
    const nanUyar = new Set(), IC = icBolge(M), hw = Math.max(0, g.kSu - zTop), yas = YK.yas, gc = S.mal.gc || 25, dH = S.tas.dH != null ? +S.tas.dH : 0.3;
    const W = AG.W, disYon = new Map(); // eleman → dışa doğru birim normal (dış perde)
    for (const e of AG.els) if (e.tur === 'perde') { const w = W[e.wi]; if (w.tip !== 'dis') continue; const X = e.n.map(i => AG.nodes[i]), m = [(X[0][0] + X[1][0]) / 2, (X[0][1] + X[1][1]) / 2], n = e.F.e3, ic = pip([m[0] + n[0] * 0.3, m[1] + n[1] * 0.3], IC); disYon.set(e, ic ? [-n[0], -n[1], 0] : [n[0], n[1], 0]); }
    const radyeIc = e => { const X = e.n.map(i => AG.nodes[i]), c = [(X[0][0] + X[2][0]) / 2, (X[0][1] + X[2][1]) / 2]; return pip(c, IC); };
    const yatay = (e, f) => { const d = disYon.get(e); return d ? (p => { const v = f(p[2]); return v ? [d[0] * v, d[1] * v, 0] : null; }) : null; };
    const L = {
      G: e => { const ek = e.tur === 'doseme' ? (S.kabuk.dosemeler[+e.grp.slice(1)].g || 0) : 0; const q = gc * e.t + ek; return () => [0, 0, -q]; },
      Q: e => (e.tur === 'doseme' ? (() => { const q = S.kabuk.dosemeler[+e.grp.slice(1)].q || 0; return q ? () => [0, 0, -q] : null; })() : null),
      Hs: e => { if (e.tur === 'perde') return yatay(e, fn.Hs); if (e.tur === 'radye' && hw > 0 && radyeIc(e)) return () => [0, 0, -gw * hw]; return null; },
      Ht: e => { if (e.tur === 'perde') return yatay(e, fn.Ht); if (e.tur === 'radye' && !radyeIc(e) && g.kZemin > zTop) return () => [0, 0, -z.g * (g.kZemin - zTop)]; return null; },
      Qs: e => (e.tur === 'perde' ? yatay(e, fn.Qs) : null),
      YAS: e => { if (e.tur === 'perde') return yatay(e, fn.YAS); if (e.tur === 'radye' && yas) return () => [0, 0, gw * (yas - M.radye.kAlt)]; return null; },
      // iç perdeler: bölme ise bir yüz dolu (Hs), serbest uçlu ise seviye farkı dH ( + yerel 3 yönünde; zarfta ±)
      Hd: e => { if (e.tur !== 'perde' || W[e.wi].tip === 'dis') return null; const n = e.F.e3, bol = !!W[e.wi].bolme; return p => { const d = Math.max(0, g.kSu - p[2]); if (!(p[2] < g.kSu)) return null; const v = gw * (bol ? d : Math.min(dH, d)); return [n[0] * v, n[1] * v, 0]; }; },
    };
    const deprem = (dir) => ({ // dir: [1,0] / [0,1] — işaret zarfta ±
      EW: e => { if (e.tur !== 'perde') return null; const w = W[e.wi];
        if (w.tip === 'dis') { const d = disYon.get(e), k = -(d[0] * dir[0] + d[1] * dir[1]); return p => { const v = fn.EHs(p[2]) * k; return v ? [d[0] * v, d[1] * v, 0] : null; }; }
        const n = e.F.e3, k = -(n[0] * dir[0] + n[1] * dir[1]); return p => { const v = fn.EHs(p[2]) * k; return v ? [n[0] * v, n[1] * v, 0] : null; }; },
      ES: e => { const at = IT.kh * gc * e.t; // atalet + toprak / sürşarj / YAS dinamik artışı
        if (e.tur !== 'perde') return e.tur === 'doseme' ? () => [-dir[0] * at, -dir[1] * at, 0] : null;
        const w = W[e.wi], d = w.tip === 'dis' ? disYon.get(e) : null, k = d ? (d[0] * dir[0] + d[1] * dir[1]) : 0;
        return p => { let v = 0; if (d) { v = (fn.EHt(p[2]) + fn.EQs(p[2]) + fn.E_YAS(p[2])) * k; if (!isFinite(v)) { v = 0; nanUyar.add('Mononobe-Okabe dinamik toprak itkisi tanımsız (φ ≤ θ = atan(kh/(1−kv))): toprak deprem artışı alınamadı — Wood yöntemini seçin ya da φ / S_DS / r değerlerini kontrol edin.'); } } return [-dir[0] * at + (d ? d[0] * v : 0), -dir[1] * at + (d ? d[1] * v : 0), 0]; }; },
    });
    const DX = deprem([1, 0]), DY = deprem([0, 1]);
    // bölme senaryoları (model M.bolmeler + M.senaryolar verirse; ör. anaerobik halkalar): her senaryoda dolu bölmeler bellidir.
    // Perde: iki yüzdeki su derinliği farkı (yüz noktası perde dışında, bölme poligonundan bulunur) · radye: dolu bölmenin altında su ağırlığı.
    // Kombinasyonlarda Hs ve Hd yerine bu durumlar kullanılır (kombler).
    if (Array.isArray(M.bolmeler) && M.bolmeler.length && Array.isArray(M.senaryolar) && M.senaryolar.length) {
      const bolmeAt = q => { for (let i = 0; i < M.bolmeler.length; i++) if (pip(q, M.bolmeler[i].pts)) return M.bolmeler[i].ad; return null; };
      const orta = e => { const X = e.n.map(i => AG.nodes[i]); return [X.reduce((s, q) => s + q[0], 0) / X.length, X.reduce((s, q) => s + q[1], 0) / X.length]; };
      M.senaryolar.forEach((sn, j) => { const dolu = new Set(sn.dolu || []);
        L['B' + j] = e => {
          if (e.tur === 'radye') { if (!(hw > 0)) return null; const c = orta(e), b = bolmeAt(c); return b && dolu.has(b) ? () => [0, 0, -gw * hw] : null; }
          if (e.tur !== 'perde') return null;
          const n = e.F.e3, m = orta(e), off = (W[e.wi].t || 0.3) / 2 + 0.15, a = bolmeAt([m[0] + n[0] * off, m[1] + n[1] * off]), b = bolmeAt([m[0] - n[0] * off, m[1] - n[1] * off]);
          const k = (b && dolu.has(b) ? 1 : 0) - (a && dolu.has(a) ? 1 : 0); if (!k) return null;
          return p => { const d = Math.max(0, g.kSu - p[2]); if (!d) return null; const v = gw * d * k; return [n[0] * v, n[1] * v, 0]; }; };
        DURUMAD['B' + j] = 'SU — ' + (sn.ad || 'senaryo ' + (j + 1)); });
    }
    return { L: Object.assign(L, { EWX: DX.EW, ESX: DX.ES, EWY: DY.EW, ESY: DY.ES }), IT, YK, IC, hw, disYon, nanUyar };
  };

  /* ---------- kombinasyon varyantları ---------- */
  const kombler = (S) => {
    const out = [];
    for (const k of S.komb) for (const tip of ['tsm', 'emn']) { const f = k[tip] || {}; const dep = ['EHt', 'EHs', 'EQs', 'E_YAS'].some(c => f[c]);
      const base = { G: f.G || 0, Q: f.Q || 0, Hs: f.Hs || 0, Ht: f.Ht || 0, Qs: f.Qs || 0, YAS: f.YAS || 0 };
      const SN = S.kabuk && Array.isArray(S.kabuk.senaryolar) && S.kabuk.senaryolar.length && Array.isArray(S.kabuk.bolmeler) && S.kabuk.bolmeler.length ? S.kabuk.senaryolar : null;
      if (SN && base.Hs) { // bölme senaryoları: hidrostatik yük Hs/Hd yerine her senaryonun kendi su durumu
        const hs = base.Hs, b0 = Object.assign({}, base, { Hs: 0 }), depV2 = dep ? [['X', 1], ['X', -1], ['Y', 1], ['Y', -1]] : [[null, 0]];
        SN.forEach((sn, j) => { for (const [yon, s] of depV2) { const c = Object.assign({}, b0, { ['B' + j]: hs }); if (yon) { c['EW' + yon] = s * (f.EHs || 0); c['ES' + yon] = s * Math.max(f.EHt || 0, f.EQs || 0, f.E_YAS || 0, 1); }
          out.push({ ad: `${k.ad} [${sn.ad || 'S' + (j + 1)}]` + (yon ? ` ${s > 0 ? '+' : '−'}E${yon}` : ''), komb: k.ad, tip, dep: !!yon, f: c }); } });
        continue; }
      const hdV = base.Hs ? [1, -1] : [0], depV = dep ? [['X', 1], ['X', -1], ['Y', 1], ['Y', -1]] : [[null, 0]];
      for (const hd of hdV) for (const [yon, s] of depV) { const c = Object.assign({}, base); if (hd) c.Hd = hd * base.Hs; if (yon) { c['EW' + yon] = s * (f.EHs || 0); c['ES' + yon] = s * Math.max(f.EHt || 0, f.EQs || 0, f.E_YAS || 0, 1); }
        out.push({ ad: k.ad + (yon ? ` ${s > 0 ? '+' : '−'}E${yon}` : '') + (hd ? (hd > 0 ? ' Hd+' : ' Hd−') : ''), komb: k.ad, tip, dep: !!yon, f: c }); } }
    return out;
  };

  /* ---------- mesnet bölgeleri ve tekil noktalar (saf geometri) ----------
     mes(q, e, d) : q noktası (e elemanının üstünde) bir mesnedin yüzünden d'den daha yakın mı? (kesme tahkiki bu bölgenin dışında yapılır)
        perde  : radye üstü; döşemeyle tutulu üst kenar; perdeye açıyla saplanan başka perde / aynı perdenin köşesi; perdeye gömülü kolon
        radye / döşeme : perde eksenleri, kolonlar, (döşemede) kiriş kaburgaları
     tek(q, e, r) : q noktası bir tekil noktaya r'den yakın mı? Tekil noktalar: döşeme poligonunun içbükey (boşluk) köşesi, döşeme kenarının
        bir perdenin ortasında bittiği nokta, kirişin perdeye saplandığı düğüm, döşeme içindeki kiriş ucu. Perde köşeleri tekil değildir (mesnet). */
  const d2seg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t); };
  P.kabukBolge = (S, AG, h) => {
    const M = S.kabuk, W = AG.W, zRadUst = M.radye.kAlt + M.radye.t, hat = [], kol = [], kir = [], tekil = [], dos = M.dosemeler || [];
    W.forEach((w, wi) => { const n = w.kapali ? w.P.length : w.P.length - 1; for (let i = 0; i < n; i++) { const a = w.P[i], b = w.P[(i + 1) % w.P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > 1e-6) hat.push({ a, b, u: [(b[0] - a[0]) / L, (b[1] - a[1]) / L], hw: w.t / 2, zt: w.ztm, wi }); } });
    const gor = new Set(), kirId = new Set();
    for (const br of (AG.bars || [])) {
      if (br.tur === 'kolon') { const k = 'c' + (br.id != null ? br.id : br.ad); if (gor.has(k)) continue; gor.add(k); const q = AG.nodes[br.n[0]], c = (M.kolonlar || []).find(x => x.id === br.id) || {}; kol.push({ p: [q[0], q[1]], hw: (br.ek ? br.ek.b : Math.max(+c.bx || 0, +c.by || 0, +c.D || 0, 0.3)) / 2 }); }
      else { const a = AG.nodes[br.n[0]], b = AG.nodes[br.n[1]], kb = (M.kirisler || []).find(x => x.id === br.id) || {}; kir.push({ a, b, hw: (+kb.bw || 0.3) / 2, z: a[2] }); kirId.add(br.id); } }
    // q noktası bir perde ekseninin üstünde mi? → { hh, kose }: kose = başka doğrultuda bir perdeye de yakın (perde köşesi / birleşimi)
    const duvarda = (q, z) => { let best = null; for (const hh of hat) { if (hh.zt < z - 0.3) continue; const d = d2seg(q, hh.a, hh.b); if (d <= hh.hw + 0.15 && (!best || d < best.d)) best = { hh, d }; } if (!best) return null;
      let kose = false; for (const o of hat) { if (o === best.hh || o.zt < z - 0.3 || Math.abs(o.u[0] * best.hh.u[1] - o.u[1] * best.hh.u[0]) < 0.5) continue; if (d2seg(q, o.a, o.b) <= o.hw + 0.5) { kose = true; break; } }
      return { hh: best.hh, kose }; };
    dos.forEach((d, k) => { const Q = d.pts, n = Q.length, zm = d.zt - d.t / 2; let A = 0; for (let i = 0; i < n; i++) { const a = Q[i], b = Q[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1]; } const sg = A >= 0 ? 1 : -1;
      for (let i = 0; i < n; i++) { const a = Q[(i + n - 1) % n], b = Q[i], c = Q[(i + 1) % n], cr = ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) * sg, dv = duvarda(b, zm);
        if (cr < -1e-9) tekil.push({ p: [b[0], b[1], zm], neden: 'döşeme boşluğunun köşesi', dos: k });
        else if (dv && !dv.kose) tekil.push({ p: [b[0], b[1], zm], neden: 'döşeme kenarının perdede bittiği nokta (boşluk köşesi)', dos: k }); } });
    for (const kb of (M.kirisler || [])) { if (!kirId.has(kb.id)) continue; for (const q of [kb.a, kb.b]) { const dv = duvarda(q, +kb.zt - 0.3);
      if (dv && dv.kose) continue; tekil.push(dv ? { p: [q[0], q[1], +kb.zt], neden: 'kirişin perdeye saplandığı düğüm' } : { p: [q[0], q[1], +kb.zt], neden: 'kiriş ucu', yalnizDos: true }); } }
    const dosK = e => (e.tur === 'doseme' ? +e.grp.slice(1) : -1);
    const tekBul = (q, e, r) => { if (e.tur === 'radye') return null; const k = dosK(e);
      for (const t of tekil) { if (e.tur === 'perde') { if (t.yalnizDos) continue; if (Math.hypot(q[0] - t.p[0], q[1] - t.p[1], q[2] - t.p[2]) < r) return t; }
        else { if (t.dos != null && t.dos !== k) continue; if (Math.abs(t.p[2] - q[2]) < 0.6 && Math.hypot(q[0] - t.p[0], q[1] - t.p[1]) < r) return t; } }
      return null; };
    const mes = (q, e, d) => {
      if (e.tur === 'perde') { const w = W[e.wi]; if (q[2] < zRadUst + d) return true;
        if (w.dos && w.ustS && q[2] > w.ztm - w.dos.t / 2 - d) { let b = 0, bd = Infinity; for (let j = 0; j < w.S.length; j++) { const v = Math.hypot(w.S[j][0] - q[0], w.S[j][1] - q[1]); if (v < bd) { bd = v; b = j; } } if (w.ustS[b]) return true; }
        const X0 = AG.nodes[e.n[0]], X1 = AG.nodes[e.n[1]], L = Math.hypot(X1[0] - X0[0], X1[1] - X0[1]) || 1, u = [(X1[0] - X0[0]) / L, (X1[1] - X0[1]) / L];
        for (const o of hat) { if (o.zt < q[2] - 1e-6 || Math.abs(o.u[0] * u[1] - o.u[1] * u[0]) < 0.5) continue; if (d2seg(q, o.a, o.b) < o.hw + d) return true; }
        for (const c of kol) if (Math.hypot(q[0] - c.p[0], q[1] - c.p[1]) < c.hw + d) return true;
        return false; }
      const rad = e.tur === 'radye';
      for (const o of hat) { if (!rad && Math.abs(o.zt - q[2]) > 0.3) continue; if (d2seg(q, o.a, o.b) < o.hw + d) return true; }
      for (const c of kol) if (Math.hypot(q[0] - c.p[0], q[1] - c.p[1]) < c.hw + d) return true;
      if (!rad) for (const b of kir) { if (Math.abs(b.z - q[2]) > 0.3) continue; if (d2seg(q, b.a, b.b) < b.hw + d) return true; }
      return false; };
    return { hat, kol, kir, tekil, mes, tek: (q, e, r) => !!tekBul(q, e, r), neden: (q, e, r) => { const t = tekBul(q, e, r * 1.6) || tekBul(q, e, r * 4); return t ? t.neden : 'tekil nokta'; } };
  };

  /* ---------- hesap ---------- */
  const NQ = 8, QI = { M11: 0, M22: 1, M12: 2, N11: 3, N22: 4, N12: 5, V13: 6, V23: 7 };
  P.kabukHesap = (S, ilerle) => {
    const t0 = Date.now(), M = S.kabuk, MAL = P.malzeme(S.mal), g = S.geo;
    const Atop = M.walls.reduce((s, w) => { let L = 0; const n = w.kapali ? w.pts.length : w.pts.length - 1; for (let i = 0; i < n; i++) { const a = w.pts[i], b = w.pts[(i + 1) % w.pts.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s + L * (w.zt - M.radye.kAlt); }, 0) + area(M.radye.pts) + (M.dosemeler || []).reduce((s, d) => s + area(d.pts), 0);
    const h = +(S.tas.kmesh > 0 ? S.tas.kmesh : Math.min(1.0, Math.max(0.25, Math.round(Math.sqrt(Atop / 5000) * 20) / 20)));
    const AG = P.kabukAg(M, { h, kotlar: [g.kSu, g.kZemin, g.kYAS].filter(v => v != null && isFinite(v)), kirisRijit: S.tas.kirisKabuk === 'rijit' });
    const gcB = S.mal.gc || 25;
    // çubuk (kolon / kiriş kaburgası) yükleri: zati ağırlık ve deprem ataleti (kh, perdeyle aynı)
    const o = { E: MAL.Ec * 1000, nu: 0.2, kw: S.zemin.kw, cubukYuk: (c, br) => { const w = gcB * br.s.A; if (c === 'G') return [0, 0, -w]; const kh = YT.IT && YT.IT.kh || 0; if (c === 'ESX') return [-kh * w, 0, 0]; if (c === 'ESY') return [0, -kh * w, 0]; return null; } };
    const YT = yukTanim(S, AG, MAL);
    const coz = P.kabukCoz(AG, o, YT.L, ilerle);
    // durum kuvvetleri
    const ne = AG.els.length, Q = {};
    for (const [c, U] of Object.entries(coz.sonuc)) { const F = P.kabukKuvvet(AG, o, U), a = new Float32Array(ne * 4 * NQ); F.forEach((f4, e) => f4.forEach((q, k) => { const b = (e * 4 + k) * NQ; a[b] = q.M11; a[b + 1] = q.M22; a[b + 2] = q.M12; a[b + 3] = q.N11; a[b + 4] = q.N22; a[b + 5] = q.N12; a[b + 6] = q.V13; a[b + 7] = q.V23; })); Q[c] = a; }
    // çubuk iç kuvvetleri (durum başına) ve TSM zarfı: eleman adına göre N min/maks, |M3| (güçlü), |M2|, |V|
    const QB = {}; if (AG.bars && AG.bars.length) for (const [c, U] of Object.entries(coz.sonuc)) QB[c] = P.kabukCubukKuvvet(AG, U, c);
    // zarf (Wood–Armer: M11 ± |M12|)
    /* 'cat': çatlak kontrolünde kullanılan zarf — emniyet kombinasyonları. Varsayılan: deprem dahil (kullanıcı kararı);
       S.tas.catDep kapatılırsa yalnız işletme yükleri */
    const catDep = !(S.tas.catDep === false || S.tas.catDep === 'false');
    const KV = kombler(S), Z = {}; for (const tip of ['tsm', 'emn', 'cat']) Z[tip] = { m11p: new Float32Array(ne * 4).fill(-1e9), m11n: new Float32Array(ne * 4).fill(1e9), m22p: new Float32Array(ne * 4).fill(-1e9), m22n: new Float32Array(ne * 4).fill(1e9), n11: new Float32Array(ne * 4).fill(-1e9), n22: new Float32Array(ne * 4).fill(-1e9), v: new Float32Array(ne * 4),
      /* eşdeğer tasarım momenti (eğilme + eksenel çekme): Meq = M + 0,5·N·0,9·d — AYNI noktada ve AYNI kombinasyonda oluşan M ve N ile
         (eskiden grubun bir yerindeki en büyük N, başka yerindeki en büyük M ile toplanıyordu). m..pE / m..nE: + / − yüz için Meq zarfı,
         n..pE / n..nE: o Meq'i veren kombinasyondaki çekme kuvveti. */
      m11pE: new Float32Array(ne * 4).fill(-1e9), m11nE: new Float32Array(ne * 4).fill(-1e9), m22pE: new Float32Array(ne * 4).fill(-1e9), m22nE: new Float32Array(ne * 4).fill(-1e9), n11pE: new Float32Array(ne * 4), n11nE: new Float32Array(ne * 4), n22pE: new Float32Array(ne * 4), n22nE: new Float32Array(ne * 4) };
    const cTur = e => (e.tur === 'perde' ? S.mal.cP : e.tur === 'radye' ? S.mal.cR : S.mal.cD), kE = new Float32Array(ne); AG.els.forEach((e, i) => { kE[i] = 0.45 * Math.max(0.02, e.t - cTur(e) - 0.01); });
    const tmp = new Float64Array(NQ);
    for (const k of KV.concat(KV.filter(k => k.tip === 'emn' && (catDep || !k.dep)).map(k => Object.assign({}, k, { tip: 'cat' })))) { const z = Z[k.tip], ent = Object.entries(k.f).filter(([c, f]) => f && Q[c]);
      for (let i = 0; i < ne * 4; i++) { tmp.fill(0); for (const [c, f] of ent) { const a = Q[c], b = i * NQ; for (let q = 0; q < NQ; q++) tmp[q] += f * a[b + q]; }
        const a12 = Math.abs(tmp[2]); z.m11p[i] = Math.max(z.m11p[i], tmp[0] + a12); z.m11n[i] = Math.min(z.m11n[i], tmp[0] - a12); z.m22p[i] = Math.max(z.m22p[i], tmp[1] + a12); z.m22n[i] = Math.min(z.m22n[i], tmp[1] - a12);
        z.n11[i] = Math.max(z.n11[i], tmp[3]); z.n22[i] = Math.max(z.n22[i], tmp[4]); z.v[i] = Math.max(z.v[i], Math.hypot(tmp[6], tmp[7]));
        const kk = kE[i >> 2], t1 = tmp[3] > 0 ? tmp[3] : 0, t2 = tmp[4] > 0 ? tmp[4] : 0; let v;
        if ((v = tmp[0] + a12 + kk * t1) > z.m11pE[i]) { z.m11pE[i] = v; z.n11pE[i] = t1; } if ((v = a12 - tmp[0] + kk * t1) > z.m11nE[i]) { z.m11nE[i] = v; z.n11nE[i] = t1; }
        if ((v = tmp[1] + a12 + kk * t2) > z.m22pE[i]) { z.m22pE[i] = v; z.n22pE[i] = t2; } if ((v = a12 - tmp[1] + kk * t2) > z.m22nE[i]) { z.m22nE[i] = v; z.n22nE[i] = t2; } } }
    // şerit ortalaması (model M.seritOrt m verirse; ör. anaerobik 1,0): köşe / serbest uç / birleşim tekil tepeleri yerine
    // donatı doğrultusuna dik yönde 1 m'lik şerit ortalaması — düşey donatı (M22, N22) yatayda, yatay donatı (M11, N11) düşeyde,
    // radyede X donatısı Y'de, Y donatısı X'te; kesme 1 × 1 m alanda. Ağırlık: elemanın pencereyle örtüşen boyu.
    const SO = +(M.seritOrt || (S.tas && S.tas.seritOrt) || 0);
    if (SO > 0) {
      const he = h, cen = AG.els.map(e => { const X = e.n.map(i => AG.nodes[i]), m = [0, 1, 2].map(k => X.reduce((s, q) => s + q[k], 0) / X.length); return m; });
      const grpK = e => e.tur === 'perde' ? 'W' + e.wi : e.tur === 'radye' ? 'R' : e.grp, gm = new Map(); AG.els.forEach((e, i) => { const k = grpK(e); if (!gm.has(k)) gm.set(k, []); gm.get(k).push(i); });
      const ort = (d) => Math.max(0, Math.min(d + he / 2, SO / 2) - Math.max(d - he / 2, -SO / 2)) / Math.min(SO, he); // örtüşme ağırlığı
      const ayni = d => Math.abs(d) <= he * 0.45;
      for (const ids of gm.values()) {
        const perde = AG.els[ids[0]].tur === 'perde';
        // komşu listeleri: A = M11 (yatay donatı) penceresi, B = M22 (düşey donatı) penceresi, V = kesme
        const NA = new Map(), NB = new Map(), NV = new Map();
        for (const i of ids) { const a = [], b = [], v = [], ci = cen[i];
          for (const j of ids) { const cj = cen[j];
            const dh = perde ? Math.hypot(cj[0] - ci[0], cj[1] - ci[1]) : 0, dz = perde ? cj[2] - ci[2] : 0, dx = perde ? 0 : cj[0] - ci[0], dy = perde ? 0 : cj[1] - ci[1];
            if (perde) { if (ayni(dh)) { const w = ort(dz); if (w > 0) a.push([j, w]); } if (ayni(dz)) { const w = ort(dh); if (w > 0) b.push([j, w]); } const w2 = ort(dh) * ort(dz); if (w2 > 0) v.push([j, w2]); }
            else { if (ayni(dx)) { const w = ort(dy); if (w > 0) a.push([j, w]); } if (ayni(dy)) { const w = ort(dx); if (w > 0) b.push([j, w]); } const w2 = ort(dx) * ort(dy); if (w2 > 0) v.push([j, w2]); } }
          NA.set(i, a); NB.set(i, b); NV.set(i, v); }
        for (const tip of Object.keys(Z)) for (const [key, arr] of Object.entries(Z[tip])) {
          const N = /^(m11|n11)/.test(key) ? NA : /^(m22|n22)/.test(key) ? NB : key === 'v' ? NV : null; if (!N) continue;
          const em = new Map(ids.map(i => [i, (arr[i * 4] + arr[i * 4 + 1] + arr[i * 4 + 2] + arr[i * 4 + 3]) / 4]));
          for (const i of ids) { const L = N.get(i); let s = 0, w = 0; for (const [j, wj] of L) { s += em.get(j) * wj; w += wj; } if (w > 0) { const v = s / w; for (let k = 0; k < 4; k++) arr[i * 4 + k] = v; } } }
      }
    }
    const cubuk = []; if (AG.bars && AG.bars.length) { const by = new Map(); AG.bars.forEach((br, i) => { const k = br.tur + '|' + br.ad; if (!by.has(k)) by.set(k, { ad: br.ad, tur: br.tur, id: br.id, s: br.s, ids: [] }); by.get(k).ids.push(i); });
      const t12 = new Float64Array(12);
      for (const gb of by.values()) { let Nmn = 0, Nmx = 0, M3 = 0, M2 = 0, V = 0; const Md = { M3: 0, M2: 0 }, Mn = { M3: 0, M2: 0 }; // Md: deprem dahil kombinasyonlar, Mn: deprem hariç
        for (const k of KV.filter(k => k.tip === 'tsm')) { const ent = Object.entries(k.f).filter(([c, f]) => f && QB[c]), Z2 = k.dep ? Md : Mn;
          for (const i of gb.ids) { t12.fill(0); for (const [c, f] of ent) { const a = QB[c][i]; for (let q = 0; q < 12; q++) t12[q] += f * a[q]; }
            for (const u of [0, 6]) { Nmn = Math.min(Nmn, t12[u]); Nmx = Math.max(Nmx, t12[u]); M3 = Math.max(M3, Math.abs(t12[u + 5])); M2 = Math.max(M2, Math.abs(t12[u + 4])); V = Math.max(V, Math.hypot(t12[u + 1], t12[u + 2])); Z2.M3 = Math.max(Z2.M3, Math.abs(t12[u + 5])); Z2.M2 = Math.max(Z2.M2, Math.abs(t12[u + 4])); } } }
        // gömülü kolon: kaburga ile perde şeridi aynı eğriliği paylaşır → kolon kesit momenti = M3·(1 + b·t³/12 / I3)
        const br0 = AG.bars[gb.ids[0]], ek = br0.ek, kat = ek ? 1 + ek.b * ek.t ** 3 / 12 / gb.s.I3 : 1, ref = br0.ref || [1, 0, 0];
        cubuk.push({ ad: gb.ad, tur: gb.tur, id: gb.id, s: gb.s, N: [Nmn, Nmx], M3, M2, V, kat, Md: { M3: Md.M3 * kat, M2: Md.M2 }, Mn: { M3: Mn.M3 * kat, M2: Mn.M2 }, yon: Math.abs(ref[0]) >= Math.abs(ref[1]) ? 'X' : 'Y', gomulu: !!ek }); } }
    // zemin gerilmesi (emniyet kombinasyonları zarfı): q = kw·(−w)
    const nn = AG.nodes.length, qz = new Float32Array(nn); let qmax = 0;
    for (const k of KV.filter(k => k.tip === 'emn')) for (let i = 0; i < nn; i++) { let w = 0; for (const [c, f] of Object.entries(k.f)) if (f && coz.sonuc[c]) w += f * coz.sonuc[c][i * 6 + 2]; const q = -S.zemin.kw * w; if (q > qz[i]) qz[i] = q; }
    const radN = new Set(); AG.els.forEach(e => { if (e.tur === 'radye') e.n.forEach(n => radN.add(n)); }); for (const n of radN) qmax = Math.max(qmax, qz[n]);
    // gruplar ve tasarım
    const gruplar = []; const ekle = (ad, tur, filt, t, c, yuz) => { const ids = []; AG.els.forEach((e, i) => { if (filt(e)) ids.push(i); }); if (ids.length) gruplar.push({ ad, tur, ids, t, c, yuz }); };
    AG.W.forEach((w, wi) => ekle(w.ad || ('Perde ' + (wi + 1)), w.tip === 'dis' ? 'dis' : 'ic', e => e.wi === wi && e.tur === 'perde', w.t, S.mal.cP, w.tip === 'dis' ? ['dış', 'iç'] : ['1. yüz', '2. yüz']));
    ekle(`${f2(M.radye.kAlt)} Kotu Temel (radye)`, 'radye', e => e.tur === 'radye', M.radye.t, S.mal.cR, ['üst', 'alt']);
    (M.dosemeler || []).forEach((d, k) => ekle(`${d.ad || 'D' + (k + 1)} döşeme`, 'doseme', e => e.grp === 'D' + k, d.t, S.mal.cD, ['üst', 'alt']));
    const tasarim = [], uyar = [], yerelMsg = [];
    /* mesnet bölgeleri ve tekil noktalar (P.kabukBolge): kesme mesnet yüzünden d içeride alınır (TS 500 8.1); boşluk köşesi / kirişin perdeye
       saplandığı düğüm gibi tekil noktalardaki tepe değer kalınlık gerekçesi olmaz — eleman tekil nokta dışındaki en büyük değerle
       yetiyorsa donatı ona göre seçilir, tekil nokta "yerel ilave donatı" notu olarak bildirilir. */
    const GH = P.kabukBolge(S, AG, h), FL = new Uint8Array(ne * 4), nok = pi => { const e = AG.els[pi >> 2], q = AG.nodes[e.n[pi & 3]]; return q; }, yerYaz = q => `x = ${f2(q[0])}, y = ${f2(q[1])}, kot ${f2(q[2])}`;
    const KS = [[-1, -1], [1, -1], [1, 1], [-1, 1]], OR = [-1, -0.5, 0, 0.5, 1];
    for (const gr of gruplar) {
      const dd = gr.t - gr.c - 0.01, rT = Math.max(2 * gr.t, 1.5 * h); let tekVar = false;
      for (const i of gr.ids) { const e = AG.els[i]; for (let k = 0; k < 4; k++) { const q = AG.nodes[e.n[k]], f = (GH.tek(q, e, rT) ? 1 : 0) | (GH.mes(q, e, dd) ? 2 : 0); FL[i * 4 + k] = f; if (f & 1) tekVar = true; } }
      const enb = (arr, genel) => { let m = -1e9, pi = -1; for (const i of gr.ids) for (let k = 0; k < 4; k++) { if (genel && (FL[i * 4 + k] & 1)) continue; const v = arr[i * 4 + k]; if (v > m) { m = v; pi = i * 4 + k; } } return { m, pi }; };
      // dış perdede +3 yönü dışa mı? (yüz eşlemesi: M>0 → +3 yüzünde çekme)
      const e0 = AG.els[gr.ids[0]], disa = gr.tur === 'dis' ? (YT.disYon.get(e0)[0] * e0.F.e3[0] + YT.disYon.get(e0)[1] * e0.F.e3[1] > 0) : true;
      const kat = [], yerel = [];
      for (const [yon, kp, kn] of [['M11 (yatay)', 'm11p', 'm11n'], ['M22 (düşey)', 'm22p', 'm22n']]) {
        const yAd = gr.tur === 'radye' || gr.tur === 'doseme' ? (kp === 'm11p' ? 'M11 (X)' : 'M22 (Y)') : yon;
        for (const [s, key] of [[1, kp], [-1, kn]]) {
          const nKey = 'n' + key.slice(1) + 'E', hes = genel => { const a = enb(Z.tsm[key + 'E'], genel), c = enb(Z.cat[key + 'E'], genel), Meq = Math.max(0, a.m), Mseq = Math.max(0, c.m), Nd = Meq > 0 ? Z.tsm[nKey][a.pi] : 0, Ns = Mseq > 0 ? Z.cat[nKey][c.pi] : 0;
            return { Meq, Mseq, Nd, Ns, Md: Meq > 0 ? Math.max(0, Meq - kE[a.pi >> 2] * Nd) : 0, Ms: Mseq > 0 ? Math.max(0, Mseq - kE[c.pi >> 2] * Ns) : 0, pi: a.pi }; };
          const yuz = gr.tur === 'radye' || gr.tur === 'doseme' ? (s > 0 ? 'üst' : 'alt') : (gr.tur === 'dis' ? ((s > 0) === disa ? 'dış' : 'iç') : (s > 0 ? '1. yüz' : '2. yüz'));
          const sec0 = q => P.donatiSec({ M: q.Meq, Ms: q.Mseq, h: gr.t, c: gr.c, kat: kp === 'm11p' ? 1 : 2, su: true }, S, MAL);
          let q = hes(false), sec = sec0(q), yr = null;
          if (!sec.ok && tekVar) { const q2 = hes(true), s2 = sec0(q2); if (s2.ok) { const yeri = nok(q.pi); yr = { tur: 'eğilme', yon: yAd, yuz, M: q.Md, N: q.Nd, at: [yeri[0], yeri[1], yeri[2]], neden: GH.neden(yeri, AG.els[q.pi >> 2], rT) }; yerel.push(yr);
            yerelMsg.push(`${gr.ad} — ${yAd} ${yuz}: tekil noktada (${yr.neden}; ${yerYaz(yeri)}) yerel tepe M = ${f2(q.Md, 0)} kNm/m${q.Nd > 1 ? `, N = ${f2(q.Nd, 0)} kN/m` : ''} — kalınlık gerekçesi sayılmadı. Genel donatı tekil nokta dışındaki en büyük değere göre seçildi (M = ${f2(q2.Md, 0)} kNm/m → Ø${s2.F}/${Math.round(s2.s * 100)}); bu noktada yerel ilave donatı gerekir.`);
            q = q2; sec = s2; } }
          kat.push(Object.assign({ yon: yAd, yuz, M: q.Md, Ms: q.Ms, N: q.Nd, Ns: q.Ns, Meq: q.Meq, Mseq: q.Mseq, key, sec }, yr ? { yerel: yr } : {}));
          if (!sec.ok) uyar.push(`${gr.ad} — ${yAd} ${yuz}: ${sec.msg || 'uygun donatı yok'}`);
        }
      }
      /* kesme: mesnet (radye / komşu perde / döşeme / kolon / kiriş) yüzünden d içerideki en büyük değer; mesnet bölgesini kesen elemanda
         değer eleman içinde (5 × 5 nokta) ara değerle bulunur */
      const kes = genel => { let m = 0, yeri = null; const arr = Z.tsm.v;
        for (const i of gr.ids) { const e = AG.els[i], f = [FL[i * 4], FL[i * 4 + 1], FL[i * 4 + 2], FL[i * 4 + 3]], nm = f.filter(x => x & 2).length; if (nm === 4) continue;
          if (!nm) { for (let k = 0; k < 4; k++) { if (genel && (f[k] & 1)) continue; const v = arr[i * 4 + k]; if (v > m) { m = v; yeri = AG.nodes[e.n[k]]; } } continue; }
          const X = e.n.map(n => AG.nodes[n]);
          for (const xi of OR) for (const et of OR) { const N = KS.map(c => (1 + c[0] * xi) * (1 + c[1] * et) / 4), q = [0, 1, 2].map(c => N[0] * X[0][c] + N[1] * X[1][c] + N[2] * X[2][c] + N[3] * X[3][c]);
            if (GH.mes(q, e, dd) || (genel && GH.tek(q, e, rT))) continue; const v = N[0] * arr[i * 4] + N[1] * arr[i * 4 + 1] + N[2] * arr[i * 4 + 2] + N[3] * arr[i * 4 + 3]; if (v > m) { m = v; yeri = q; } } }
        return { Vd: m, yeri }; };
      let kv = kes(false), ks = P.kesme(kv.Vd, dd, MAL);
      if (!ks.ok && tekVar) { const k2 = kes(true), s2 = P.kesme(k2.Vd, dd, MAL); if (s2.ok) { const yr = { tur: 'kesme', V: kv.Vd, at: kv.yeri.slice(0, 3), neden: GH.neden(kv.yeri, AG.els[gr.ids[0]], rT) }; yerel.push(yr);
        yerelMsg.push(`${gr.ad}: tekil noktada (${yr.neden}; ${yerYaz(kv.yeri)}) yerel kesme tepesi Vd = ${f2(kv.Vd, 0)} kN/m > Vcr = ${f2(ks.Vcr, 0)} kN/m — kalınlık gerekçesi sayılmadı (tekil nokta dışında Vd = ${f2(k2.Vd, 0)} kN/m ≤ Vcr); bu noktada yerel kesme donatısı / başlık gerekir.`); kv = k2; ks = s2; } }
      ks.yeri = kv.yeri ? kv.yeri.slice(0, 3) : null;
      if (!ks.ok) uyar.push(`${gr.ad}: kesme Vd = ${f2(ks.Vd, 1)} > Vcr = ${f2(ks.Vcr, 1)} kN/m (mesnet yüzünden d içeride${ks.yeri ? '; ' + yerYaz(ks.yeri) : ''})`);
      tasarim.push({ eleman: gr.ad, grup: gr, katman: kat, kesme: ks, yerel });
    }
    YT.nanUyar.forEach(u => uyar.push(u));
    if (qmax > S.zemin.sig) uyar.push(`Zemin gerilmesi ${f2(qmax, 1)} > ${S.zemin.sig} kN/m²`);
    KR = { AG, o, Q, Z, KV, YT, U: coz.sonuc, gruplar, tasarim, uyar, cubuk, QB, bilgi: (AG.uyarC || []).concat(yerelMsg), yerel: yerelMsg, qz, qmax, h, sure: Date.now() - t0, dof: coz.N, prof: coz.prof, MAL, ok: !uyar.length };
    return KR;
  };

  /* ================= 3B RENKLİ DİYAGRAM (SAP2000 görünümü) ================= */
  const SAPRENK = ['#ff00ff', '#c000ff', '#ff0000', '#ff6000', '#ffa000', '#ffff00', '#a0ff00', '#00ff00', '#00ffa0', '#00ffff', '#00a0ff', '#0000ff'];
  P.kabukCiz = (R, o) => { // o: { deger: (e,k)→v , filt: e→bool, az, el, W, H, baslik, birim, bant }
    const AG = R.AG, W = o.W || 900, H = o.H || 560, az = (o.az == null ? -50 : o.az) * Math.PI / 180, el = (o.el == null ? 30 : o.el) * Math.PI / 180;
    const ids = []; AG.els.forEach((e, i) => { if (!o.filt || o.filt(e, i)) ids.push(i); }); if (!ids.length) return null;
    // düğüm ortalaması (grup içinde)
    const sum = new Map(); for (const i of ids) { const e = AG.els[i]; for (let k = 0; k < 4; k++) { const v = o.deger(i, k); if (v == null || !isFinite(v)) continue; const key = e.grp + ':' + e.n[k]; const s = sum.get(key) || [0, 0]; s[0] += v; s[1]++; sum.set(key, s); } }
    const nv = (e, k) => { const s = sum.get(e.grp + ':' + e.n[k]); return s ? s[0] / s[1] : 0; };
    let mn = Infinity, mx = -Infinity; for (const s of sum.values()) { const v = s[0] / s[1]; if (v < mn) mn = v; if (v > mx) mx = v; } if (!isFinite(mn)) { mn = 0; mx = 0; } if (mx - mn < 1e-9) { mx += 1; mn -= 1; }
    const ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(el), se = Math.sin(el);
    const pr = p => { const x = p[0] * ca - p[1] * sa, y = p[0] * sa + p[1] * ca; return [x, y * se + p[2] * ce, y * ce - p[2] * se]; }; // ekran x, ekran y(yukarı), derinlik
    const PP = new Map(); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const i of ids) for (const n of AG.els[i].n) if (!PP.has(n)) { const q = pr(AG.nodes[n]); PP.set(n, q); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    const padT = 34, padB = 64, sc = Math.min((W - 40) / (x1 - x0 || 1), (H - padT - padB) / (y1 - y0 || 1)), ox = (W - (x1 - x0) * sc) / 2 - x0 * sc, oy = padT + (H - padT - padB + (y1 - y0) * sc) / 2 + y0 * sc;
    const S2 = q => [ox + q[0] * sc, oy - q[1] * sc];
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    const nb = SAPRENK.length, bant = v => Math.max(0, Math.min(nb - 1, Math.floor((mx - v) / (mx - mn) * nb))); // üst = max (macenta) … alt = min (mavi)
    const sira = ids.slice().sort((a, b) => { const da = AG.els[a].n.reduce((s, n) => s + PP.get(n)[2], 0), db = AG.els[b].n.reduce((s, n) => s + PP.get(n)[2], 0); return db - da; });
    const NS = o.renkFn ? 1 : ids.length > 6000 ? 2 : 3;
    for (const i of sira) { const e = AG.els[i], q = e.n.map(n => S2(PP.get(n))), v = [0, 1, 2, 3].map(k => nv(e, k));
      for (let a = 0; a < NS; a++) for (let b = 0; b < NS; b++) { const u0 = a / NS, u1 = (a + 1) / NS, w0 = b / NS, w1 = (b + 1) / NS, bl = (u, w) => { const N = [(1 - u) * (1 - w), u * (1 - w), u * w, (1 - u) * w]; return [N[0] * q[0][0] + N[1] * q[1][0] + N[2] * q[2][0] + N[3] * q[3][0], N[0] * q[0][1] + N[1] * q[1][1] + N[2] * q[2][1] + N[3] * q[3][1], N[0] * v[0] + N[1] * v[1] + N[2] * v[2] + N[3] * v[3]]; };
        const A = bl(u0, w0), B = bl(u1, w0), C2 = bl(u1, w1), D = bl(u0, w1); x.fillStyle = o.renkFn ? o.renkFn(e) : SAPRENK[bant((A[2] + B[2] + C2[2] + D[2]) / 4)]; x.beginPath(); x.moveTo(A[0], A[1]); x.lineTo(B[0], B[1]); x.lineTo(C2[0], C2[1]); x.lineTo(D[0], D[1]); x.closePath(); x.fill(); x.strokeStyle = x.fillStyle; x.lineWidth = 0.6; x.stroke(); }
      x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 0.5; x.beginPath(); x.moveTo(q[0][0], q[0][1]); for (let k = 1; k < 4; k++) x.lineTo(q[k][0], q[k][1]); x.closePath(); x.stroke(); }
    if (o.etiket) { // en büyük / en küçük değer: ok + sayı (rapordaki gibi)
      let bmx = null, bmn = null; for (const [key, s] of sum) { const v = s[0] / s[1], n = +key.split(':')[1]; if (!bmx || v > bmx.v) bmx = { v, n }; if (!bmn || v < bmn.v) bmn = { v, n }; }
      const ok = (b, dy) => { if (!b) return; const q = S2(PP.get(b.n)), tx = Math.min(W - 70, Math.max(10, q[0] + 50)), ty = Math.min(H - 70, Math.max(40, q[1] + dy)); x.strokeStyle = '#000'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(tx, ty); x.lineTo(q[0], q[1]); x.stroke();
        const a = Math.atan2(q[1] - ty, q[0] - tx); x.beginPath(); x.moveTo(q[0], q[1]); x.lineTo(q[0] - 9 * Math.cos(a - 0.35), q[1] - 9 * Math.sin(a - 0.35)); x.lineTo(q[0] - 9 * Math.cos(a + 0.35), q[1] - 9 * Math.sin(a + 0.35)); x.closePath(); x.fillStyle = '#000'; x.fill();
        x.font = 'bold 15px Calibri, Arial'; x.fillStyle = '#000'; x.textAlign = 'left'; x.fillText(f2(b.v, 2).replace(',', '.'), tx + 3, ty + (dy < 0 ? -2 : 14)); };
      if (o.etiket === 'max' || o.etiket === true) ok(bmx, -40); if (o.etiket === 'min' || o.etiket === true) ok(bmn, 40); }
    if (o.olceksiz) { x.fillStyle = '#000'; x.font = '12px Arial'; x.textAlign = 'center'; x.fillText(o.baslik || '', W / 2, H - 6); return { canvas: c, mn, mx }; }
    // başlık + renk ölçeği (SAP biçimi)
    x.fillStyle = '#000'; x.font = '12px Arial'; x.fillText(o.ust || 'ArıtmaCAD — 3B kabuk modeli', 8, 14); x.textAlign = 'right'; x.fillText(new Date().toLocaleDateString('tr-TR'), W - 8, 14); x.textAlign = 'left';
    x.strokeStyle = '#000'; x.lineWidth = 1; x.strokeRect(4, 22, W - 8, H - 26 - 40);
    const bw = (W - 8) / nb; for (let k = 0; k < nb; k++) { x.fillStyle = SAPRENK[nb - 1 - k]; x.fillRect(4 + k * bw, H - 40, bw, 12); }
    x.fillStyle = '#000'; x.font = '9px Arial'; for (let k = 0; k <= nb; k++) { const v = mn + (mx - mn) * k / nb; x.textAlign = k === 0 ? 'left' : k === nb ? 'right' : 'center'; x.fillText(f2(v, Math.abs(mx - mn) < 10 ? 2 : 1), 4 + k * bw, H - 18); }
    x.font = '11px Arial'; x.textAlign = 'left'; x.fillText('ArıtmaCAD', 6, H - 4); x.textAlign = 'center'; x.fillText(o.baslik || '', W / 2, H - 4); x.textAlign = 'right'; x.fillText(o.birim || '', W - 6, H - 4);
    return { canvas: c, mn, mx };
  };
  // değer seçici: R, durum (durum adı | 'ZARF:tsm:m11p' …), büyüklük
  P.kabukDeger = (R, durum, buy) => {
    if (durum.startsWith('ZARF:')) { const [, tip, key] = durum.split(':'); const a = R.Z[tip][key]; return (i, k) => a[i * 4 + k]; }
    if (buy === 'w') { const U = null; void U; }
    const a = R.Q[durum]; if (!a) return () => 0; const q = QI[buy]; return (i, k) => a[(i * 4 + k) * NQ + q];
  };

  /* ================= PENCERE ENTEGRASYONU ================= */
  try { const sec = FORM.find(x => /^Tasarım ayarları/.test(x[0])); if (sec && !sec[2].some(f => f.k === 'tas.kmesh')) { sec[2].push(F('tas.kmesh', 'Kabuk ağ aralığı — oval hazne (m, 0 = otomatik)'), F('tas.dH', 'Oval hazne iç perde su seviyesi farkı ΔH (m)')); if (S && S.tas) { if (S.tas.kmesh == null) S.tas.kmesh = 0; if (S.tas.dH == null) S.tas.dH = 0.3; } buildForm(); } } catch (er) { console.warn(er); }
  const onizle0 = window.onizle, hepsi0 = window.hepsi, model0 = window.modelUygula;
  window.modelUygula = function (d) {
    if (d && d.kabuk) { const kAlt = d.kabuk.radye.kAlt; model0.call(this, Object.assign({}, d, { kabuk: undefined })); S.kabuk = d.kabuk; S.mod = 'kabuk'; S.suYapisi = false; S.icRef = null; if (d.kabuk.wmax > 0) S.tas.wmax = d.kabuk.wmax; /* yapıya özgü çatlak sınırı (anaerobik: 0,20 mm — firma standardı) */ { const q = P.kabukOvUygula(d.kabuk, S.kabukOv || {}); S.kabukOv = q.ov; S._ovMsg = [q.n ? `${q.n} elemanda önerilen (modele henüz yansıtılmamış) kalınlık kullanılıyor.` : '', q.atilan.length ? `Önceki oturumdan kalan, firma kalınlık aralığının dışındaki öneriler yok sayıldı ve silindi: ${q.atilan.join(', ')}.` : ''].filter(Boolean).join(' ') || null; } /* dikdörtgen akışı (kalınlık yansıtma, eşitleme) devre dışı */ if (S.tas.dH == null) S.tas.dH = 0.3; save(); onizle(); const m = $('#pMsg'); if (m) m.insertAdjacentHTML('afterbegin', `<div class="msg info"><b>3B kabuk model</b>: ${d.kabuk.walls.length} perde (${d.kabuk.walls.filter(w => w.tip === 'dis').length} dış), radye ${f2(area(d.kabuk.radye.pts), 1)} m² (alt kot ${f2(kAlt)}). Hesap 3B kabuk sonlu eleman modeliyle yapılır (SAP2000 shell benzeri).${S._ovMsg ? '<br>' + esc(S._ovMsg) : ''}</div>`); return; }
    if (d && !d.hata) { S.mod = 'dik'; delete S.kabuk; }
    if (d && d.hata) { // model alınamadı: eski (önceki) yapı ekranda kalmasın
      const vardi = kabukMu(); S.mod = 'dik'; delete S.kabuk; R = null; window._KR = null; save();
      const r0 = model0.apply(this, arguments);
      try { $('#pPlan').innerHTML = '<div class="hint" style="padding:30px;text-align:center">Modelden yapı alınamadı — önizleme boş.</div>'; $('#pKesit').innerHTML = ''; $('#sonuc').innerHTML = '<h3>Sonuçlar</h3>'; $('#rapor').innerHTML = ''; } catch (er) { }
      const m = $('#pMsg'); if (m) m.insertAdjacentHTML('beforeend', `<div class="msg">ArıtmaCAD'de hesaplanacak <b>perde + radye</b> bulunamadı${vardi ? ' (önceki yay / oval hazne modeli temizlendi)' : ''}. Çizdiğiniz yapı çizgi / 3B çizgi ise önce <b>ELEMANYAP</b> ile perde ve radyeye çevirin ya da İnşaat › Perde ve Radye ile çizin.</div>`);
      return r0; }
    return model0.apply(this, arguments);
  };
  window.onizle = function () {
    if (!kabukMu()) return onizle0.apply(this, arguments);
    const M = S.kabuk, all = M.walls.flatMap(w => w.pts).concat(M.radye.pts), xs = all.map(p => p[0]), ys = all.map(p => p[1]), x0 = Math.min(...xs) - 1, x1 = Math.max(...xs) + 1, y0 = Math.min(...ys) - 1, y1 = Math.max(...ys) + 1, yy = y => y1 + y0 - y;
    const pl = (pts, kap) => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(3) + ',' + yy(p[1]).toFixed(3)).join('') + (kap ? 'Z' : '');
    let s = `<svg viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}"><path d="${pl(M.radye.pts, 1)}" fill="#e9eef0" stroke="#7a8c92" stroke-width="${(x1 - x0) / 400}"/>`;
    s += `<path d="${pl(icBolge(M), 1)}" fill="#cfe7f0"/>`;
    (M.dosemeler || []).forEach(d => s += `<path d="${pl(d.pts, 1)}" fill="none" stroke="#9a6200" stroke-dasharray="0.3 0.15" stroke-width="${(x1 - x0) / 300}"/>`);
    M.walls.forEach(w => s += `<path d="${pl(w.pts, w.kapali)}" fill="none" stroke="${w.tip === 'dis' ? '#13242b' : '#2b5f7a'}" stroke-width="${w.t}" stroke-linejoin="round"/>`);
    s += `</svg>`; $('#pPlan').innerHTML = s; $('#pKesit').innerHTML = `<div class="hint" style="padding:8px">Kotlar: radye alt ${f2(M.radye.kAlt)} · perde üst ${f2(Math.max(...M.walls.map(w => w.zt)))} · su ${f2(S.geo.kSu)} · zemin ${f2(S.geo.kZemin)}${S.geo.kYAS != null ? ' · YAS ' + f2(S.geo.kYAS) : ''}</div>`;
    const m = []; if (S.geo.kSu > Math.max(...M.walls.map(w => w.zt))) m.push('Su seviyesi perde üst kotunun üzerinde.'); if (S.dep.yon === 'TBDY2018' && !(S.dep.SDS > 0)) m.push('S_DS girin.');
    $('#pMsg').innerHTML = m.map(x => `<div class="msg">${x}</div>`).join('');
  };
  // kabuk modunda hesaptan önce modeli ArıtmaCAD'den tazele (eski / silinmiş yapı hesaplanmasın)
  const SURUM = 'kabuk-2026-11-09b';
  // ArıtmaCAD'den TAZE model iste: yalnız bu istekten sonra üretilmiş model kabul edilir (eski kayıt asla yeniden uygulanmaz)
  const tazeModel = () => { let OC = null; try { OC = window.opener && window.opener.C; } catch (er) { OC = null; }
    if (!OC || !OC.cmds || !OC.cmds.STATIKMODEL) return { yok: true };
    const t0 = Date.now() - 5; let hata = null;
    try { const p = OC.cmds.STATIKMODEL.fn(OC.I, OC); if (p && p.catch) p.catch(er => console.error(er)); } catch (er) { hata = er.message; }
    let d = null; try { d = JSON.parse(localStorage.getItem('aritmacad.statik.model') || 'null'); } catch (er) { d = null; }
    const s = OC._statikSonModel; if (s && s.t >= t0 && (!d || !(d.t >= t0) || s.t >= d.t)) d = s;
    if (!d || !(d.t >= t0)) return { eski: true, hata: hata || 'ArıtmaCAD yeni model üretmedi (komut satırındaki uyarıya bakın).' };
    return { d };
  };
  const modelBilgi = (d, kaynak) => { try { const m = $('#pMsg'); if (!m) return; const k = d && d.kabuk; const ne = !d ? '' : d.hata ? 'HATA' : k ? `${k.walls.length} perde, radye ${k.radye && k.radye.pts ? k.radye.pts.length + ' köşe' : '-'}, kabuk (yay / eğik plan)` : `dikdörtgen hazne${d.geo ? ' ' + d.geo.Lx + ' × ' + d.geo.Ly + ' m' : ''}`;
      m.querySelectorAll('.modelBilgi').forEach(x => x.remove()); m.insertAdjacentHTML('afterbegin', `<div class="hint modelBilgi" style="font-size:11px;opacity:.8">Model ${kaynak} · ${new Date(d && d.t || Date.now()).toLocaleTimeString('tr-TR')} · ${ne} · sürüm ${SURUM}</div>`); } catch (er) { } };
  const temizleEski = (neden) => { const vardi = kabukMu(); if (vardi) { S.mod = 'dik'; delete S.kabuk; R = null; window._KR = null; save(); }
    try { $('#pPlan').innerHTML = '<div class="hint" style="padding:30px;text-align:center">Güncel model alınamadı — önizleme boş.</div>'; $('#sonuc').innerHTML = '<h3>Sonuçlar</h3>'; $('#rapor').innerHTML = ''; } catch (er) { }
    const m = $('#pMsg'); if (m) m.innerHTML = `<div class="msg"><b>ArıtmaCAD'den güncel model alınamadı:</b> ${esc(neden)}${vardi ? '<br>Önceki (eski) yay / oval hazne modeli ekrandan kaldırıldı; eski yapı hesaplanmayacak.' : ''}</div>`; };
  const modelTazele = () => { const r = tazeModel(); if (r.yok) return false; if (r.eski) { temizleEski(r.hata); return 'eski'; }
    tazeleniyor = true; try { window.modelUygula(r.d); } catch (er) { console.error(er); temizleEski('Model statik penceresine uygulanamadı: ' + er.message); return 'eski'; } finally { tazeleniyor = false; } modelBilgi(r.d, 'ArıtmaCAD\'den alındı'); return true; };
  // "Modelden al": her zaman taze model; eski localStorage kaydını tekrar uygulamaz
  try { const bM = $('#bModel'), eskiTik = bM && bM.onclick; if (bM) bM.onclick = function () { const r = modelTazele(); if (r === false) return eskiTik && eskiTik.apply(this, arguments); }; } catch (er) { console.warn(er); }
  let tazeleniyor = false, atlaTazele = false;
  P.kabukModelTazele = modelTazele;
  window.hepsi = function (o) {
    if (kabukMu() && !tazeleniyor && !atlaTazele && !o) { const ok = modelTazele(); if (ok === 'eski') return; if (ok && !kabukMu()) return hepsi0.apply(this, arguments); if (!ok) { const m = $('#pMsg'); if (m && !m.querySelector('.eskiModel')) m.insertAdjacentHTML('afterbegin', `<div class="msg eskiModel">Bu hesap statik penceresine en son alınan modele göre yapılıyor; ArıtmaCAD'deki çizim değiştiyse önce <b>Modelden al</b>'a basın.</div>`); } }
    if (!kabukMu()) return hepsi0.apply(this, arguments);
    const r = P.kabukHesap(S);
    RC = null; window._KR = r; P.kabukKolonYuk = (r.cubuk || []).filter(c => c.tur === 'kolon'); try { if (typeof cerVar === 'function' && cerVar() && P.cerceveHesap) RC = P.cerceveHesap(S); } catch (er) { console.error('çerçeve', er); } finally { P.kabukKolonYuk = null; } // kolon / kiriş: ayrı çerçeve hesabı (döşeme yükü kirişlere aktarılır)
    kabukGoster(r);
    ['#bCiz', '#bDxf', '#bDon3'].forEach(s => { const b = $(s); if (b) b.disabled = true; }); const by = $('#bYaz'); if (by) by.disabled = false;
    try { R = P.kabukAdaptor ? P.kabukAdaptor(r, S) : null; if (R && typeof rapor === 'function') rapor(); if (RC && P.cerceveRapor) { try { if (typeof cerGoster === 'function') cerGoster(); } catch (e2) { } $('#rapor').insertAdjacentHTML('beforeend', P.cerceveRapor(RC, f2)); $('#raporKutu').style.display = 'block'; } } catch (er) { console.error(er); $('#rapor').innerHTML = `<div class="msg">Rapor hatası: ${esc(er.message)}</div>`; $('#raporKutu').style.display = 'block'; }
  };

  /* ---------- kabuk modunda Kalınlık öner / Kalınlıkları modele yansıt ---------- */
  const cmY = v => String(Math.round(v * 1000) / 10).replace('.', ',');
  const yetersizler = r => r.tasarim.filter(t => t.katman.some(k => !k.sec || !k.sec.ok) || !t.kesme.ok);
  /* üst sınırdaki eleman neden yetmiyor — kullanıcıya düz Türkçe (kesme mi, eğilme / çatlak mı, serbest üst kenar mı, yerel tepe mi) */
  const nedenYaz = (t, r, S1) => {
    const g = t.grup, n = [];
    if (!t.kesme.ok) n.push(`kesme kuvveti betonun tek başına taşıdığından büyük (Vd = ${f2(t.kesme.Vd, 0)} kN/m, sınır ${f2(Math.min(t.kesme.Vcr, t.kesme.Vmax), 0)} kN/m; bu hesapta kesme donatısı yok)`);
    const kt = t.katman.filter(k => !k.sec || !k.sec.ok);
    if (kt.length) { const k = kt.slice().sort((a, b) => (b.M + 0.3 * b.N) - (a.M + 0.3 * a.N))[0];
      n.push(`${k.yon.replace(/^M\d\d \((.*)\)$/, '$1')} donatıda ${k.yuz} yüzde eğilme${k.N > 1 ? ' + çekme' : ''} için uygun donatı bulunamadı (M = ${f2(k.M, 0)} kNm/m${k.N > 1 ? `, N = ${f2(k.N, 0)} kN/m` : ''}; çatlak sınırı ${f2(S1.tas.wmax, 2)} mm)`); }
    if (g.tur === 'dis' || g.tur === 'ic') { const w = r.AG.W[r.AG.els[g.ids[0]].wi]; if (w && w.ustSerbest > 0.5) n.push(w.ustOran < 0.05 ? `üst kenarı boydan boya serbest (${f2(w.boy, 1)} m; döşeme / kiriş tutmuyor, perde konsol çalışıyor)` : `üst kenarının ${f2(w.ustSerbest, 1)} m'si serbest (o kısımda döşeme yok, perde konsol çalışıyor)`); }
    if (t.yerel && t.yerel.length) n.push(`ayrıca ${t.yerel.length} tekil noktada yerel tepe var (kalınlık gerekçesi sayılmadı)`);
    return n.join('; ');
  };
  /* Kalınlık önerisi (saf: S0 değişmez). Her tur: hesap → yetersiz elemanlar → P.kabukKalinlikAdim (statik-motor.js; firma basamakları,
     perde yüksekliğine bağlı aralık, eleman başına turda en çok bir basamak). Üst sınırda da yetmeyen eleman kalınlaştırılmaz;
     hangi elemanda neden yetmediği (kesme / eğilme-çatlak / serbest üst kenar / yerel tepe) `sinir` listesinde düz Türkçe bildirilir.
     Dönen: { kabuk (yeni kalınlıklar), log, sinir, r (son hesap, kaba ağ), yeterli } */
  const grupNo = (r, t) => { const g = t.grup, e = r.AG.els[g.ids[0]]; return g.tur === 'radye' ? { tur: 'radye', i: 0 } : g.tur === 'doseme' ? { tur: 'doseme', i: +e.grp.slice(1) } : { tur: 'perde', i: e.wi }; };
  P.kabukOnerHesap = (S0, o) => {
    o = o || {}; const S2 = JSON.parse(JSON.stringify(S0)), M = S2.kabuk, B = P.kalinlikBasamak, log = [];
    S2.tas.kmesh = Math.max(+S2.tas.kmesh || 0, o.kabaAg == null ? 0.8 : +o.kabaAg); // denemelerde kaba ağ (hızlı)
    let r = null; const maxTur = o.maxTur || 12;
    for (let it = 0; it <= maxTur; it++) {
      r = P.kabukHesap(S2, o.ilerle); if (it === maxTur) break;
      const a = P.kabukKalinlikAdim(M, yetersizler(r).map(t => grupNo(r, t))); log.push(...a.log);
      if (!a.degisti) break;
    }
    /* ince ağla doğrulama: kaba ağ yerel kesme / eğilme tepelerini kaçırabilir (Konya galeri döşemesi: 0,8 m ağda kesme yetiyor, 0,35 m ağda
       Vd 110 > Vcr 96 kN/m). Kaba ağda yeterli görünen sonuç asıl ağla yeniden hesaplanır; yetmeyen eleman (döşeme kesmesi dahil) büyütülür. */
    const k0 = +S0.tas.kmesh || 0;
    if (o.ince !== false && Math.abs((+S2.tas.kmesh || 0) - k0) > 1e-9) { S2.tas.kmesh = k0;
      for (let it = 0; it < (o.inceTur || 3); it++) { r = P.kabukHesap(S2, o.ilerle); const Y = yetersizler(r); if (!Y.length) break; const a = P.kabukKalinlikAdim(M, Y.map(t => grupNo(r, t))); log.push(...a.log); if (!a.degisti) break; } }
    // sınır iletileri son hesaba göre: hâlâ yetersiz olup bir üst basamağı aralık dışında kalan elemanlar
    const L = P.kabukSinir(M), sinir = [];
    for (const t of yetersizler(r)) { const q = grupNo(r, t); let ad, tNow, max, ek = '', L2 = null;
      if (q.tur === 'radye') { ad = 'Radye'; tNow = M.radye.t; max = L.radyeMax; ek = 'en kalın perdenin iki basamak üstü, '; }
      else if (q.tur === 'doseme') { const d = M.dosemeler[q.i]; if (!d) continue; ad = `${d.ad} döşemesi`; tNow = d.t; max = L.dosemeMax; L2 = P.KALINLIK.doseme; }
      else { const w = M.walls[q.i]; if (!w) continue; ad = `${w.ad} perdesi`; tNow = w.t; max = L.perde[q.i].max; ek = `${f2(L.perde[q.i].H)} m yüksekliğindeki perde için `; }
      const n = B.sonra(tNow, L2); if (n != null && n <= max + 1e-9) continue;       // daha büyüyebilir (tur sınırı): sınır iletisi değil
      sinir.push(`${ad} ${cmY(tNow)} cm ile kalınlık üst sınırında (${ek}en çok ${cmY(max)} cm): daha fazla kalınlaştırılmadı. Yetmeyen: ${nedenYaz(t, r, S2) || 'kesit'}. Çözüm kalınlık değil — perde üstünü döşeme / kirişle tutun, ara mesnet (payanda, bölme perdesi, kolon) ekleyin ya da donatıyı sıklaştırın / kesme donatısı koyun.`); }
    const son = new Map(); log.forEach(x => { const [a, b] = x.split(' → '); son.set(a, b.split(' ')[0]); });
    return { kabuk: M, log: [...son.entries()].map(([a, b]) => `${a} ${b} cm`), sinir, r, yeterli: !yetersizler(r).length };
  };
  /* pencere: öneriyi S.kabuk'a uygular (modele yazmaz — "Kalınlıkları modele yansıt") */
  P.kabukOner = (ilerle) => {
    const o = P.kabukOnerHesap(S, { ilerle }), M = S.kabuk;
    o.kabuk.walls.forEach((w, i) => { if (M.walls[i]) M.walls[i].t = w.t; }); M.radye.t = o.kabuk.radye.t; M.radye.kAlt = o.kabuk.radye.kAlt; (o.kabuk.dosemeler || []).forEach((d, i) => { if (M.dosemeler && M.dosemeler[i]) M.dosemeler[i].t = d.t; });
    if (M.radye) S.geo.kAlt = M.radye.kAlt; save();
    const out = o.log.slice(); out.sinir = o.sinir; return out;
  };
  /* önceki oturumlardan kalan (modele yansıtılmamış) kalınlık önerileri: yalnız firma aralığındaki ve basamaktaki değerler yeniden uygulanır;
     aralık dışındaki eski kayıtlar (ör. 5 cm adımlı eski önerinin 80 – 150 cm'lik perdeleri) silinir. K = d.kabuk (değişir), ov = S.kabukOv (değişir) */
  P.kabukOvUygula = (K, ov) => {
    ov = ov || {}; let n = 0; const atilan = [], bas = (t, L) => (L || P.KALINLIK.basamak).some(b => Math.abs(b - t) < 0.004);
    const uy = (k, o, max, L, ad) => { const v = ov[k]; if (!v || !o) return;
      if (Math.abs(o.t - v.t0) >= 0.004) { delete ov[k]; return; }                                  // modeldeki kalınlık değişmiş (yansıtılmış ya da elle): kayıt geçersiz
      if (!(v.t <= max() + 0.004) || !bas(v.t, L) || !(v.t > o.t)) { atilan.push(`${ad} ${cmY(v.t)} cm`); delete ov[k]; return; }
      if (k[0] === 'R') o.kAlt = +(o.kAlt - (v.t - o.t)).toFixed(3); o.t = v.t; n++; };
    K.walls.forEach((w, i) => uy('W' + w.id, w, () => P.kabukSinir(K).perde[i].max, null, w.ad || 'Perde'));
    uy('R' + K.radye.id, K.radye, () => P.kabukSinir(K).radyeMax, null, 'radye');
    (K.dosemeler || []).forEach(x => uy('D' + x.id, x, () => P.kabukSinir(K).dosemeMax, P.KALINLIK.doseme, x.ad || 'Döşeme'));
    return { n, atilan, ov };
  };
  const kabukYansit = () => {
    if (!kabukMu()) return false; const M = S.kabuk;
    if (!M.walls.every(w => w.id != null)) { alert('Bu model eski biçimde alınmış: önce "Modelden al" ile yeniden alın, sonra kalınlıkları yansıtın.'); return true; }
    const items = M.walls.map(w => ({ id: w.id, t: w.t, tur: 'perde', tip: w.tip, ad: w.ad })).concat(M.radye.id != null ? [{ id: M.radye.id, t: M.radye.t, tur: 'radye', ad: 'radye' }] : []).concat((M.dosemeler || []).filter(d => d.id != null).map(d => ({ id: d.id, t: d.t, tur: 'doseme', ad: d.ad })));
    let OC = null; try { OC = window.opener && window.opener.C && window.opener.C._statikKabukKalinlik ? window.opener.C : null; } catch (e) { OC = null; }
    const m = $('#pMsg');
    if (!OC) { try { localStorage.setItem('aritmacad.statik.kalinlikKabuk', JSON.stringify({ t: Date.now(), items })); } catch (e) { } if (m) m.insertAdjacentHTML('afterbegin', '<div class="msg">ArıtmaCAD penceresine erişilemedi: statik penceresini ArıtmaCAD içinden (Statik düğmesiyle) açın ve yeniden deneyin.</div>'); return true; }
    const r = OC._statikKabukKalinlik(items);
    if (r.hata) { if (m) m.insertAdjacentHTML('afterbegin', `<div class="msg bad">Kalınlıklar yansıtılamadı: ${esc(r.hata)}</div>`); return true; }
    if (m) m.insertAdjacentHTML('afterbegin', `<div class="msg info">${r.n ? 'Modele yansıtıldı: ' + esc(r.log.join(' · ')) : 'Modeldeki kalınlıklar hesapla aynı.'}${r.uyar.length ? '<br>⚠ ' + r.uyar.map(esc).join('<br>⚠ ') : ''}</div>`);
    if (r.model && !r.model.hata) { window.modelUygula(r.model); }
    return true;
  };
  setTimeout(() => {
    const bO = $('#bOner'); if (bO) { const f0 = bO.onclick; bO.onclick = function () { if (!kabukMu()) return f0 && f0.apply(this, arguments);
      const b = $('#busy'); if (b) { b.style.display = 'flex'; b.textContent = 'Kalınlıklar deneniyor (kaba ağ)…'; }
      setTimeout(() => { let log = []; const t0 = new Map(); (S.kabuk.walls || []).forEach(w => { if (w.id != null) t0.set('W' + w.id, w.t); }); if (S.kabuk.radye && S.kabuk.radye.id != null) t0.set('R' + S.kabuk.radye.id, S.kabuk.radye.t); (S.kabuk.dosemeler || []).forEach(d => { if (d.id != null) t0.set('D' + d.id, d.t); });
        atlaTazele = true; try { log = P.kabukOner(); const ov = S.kabukOv || {}; (S.kabuk.walls || []).forEach(w => { const k = 'W' + w.id; if (t0.has(k) && Math.abs(t0.get(k) - w.t) > 0.004) ov[k] = { t: w.t, t0: (ov[k] && ov[k].t0) || t0.get(k) }; }); if (S.kabuk.radye && t0.has('R' + S.kabuk.radye.id) && Math.abs(t0.get('R' + S.kabuk.radye.id) - S.kabuk.radye.t) > 0.004) ov['R' + S.kabuk.radye.id] = { t: S.kabuk.radye.t, t0: t0.get('R' + S.kabuk.radye.id) }; (S.kabuk.dosemeler || []).forEach(d => { const k = 'D' + d.id; if (t0.has(k) && Math.abs(t0.get(k) - d.t) > 0.004) ov[k] = { t: d.t, t0: t0.get(k) }; }); S.kabukOv = ov; save(); hepsi(null); } catch (er) { console.error(er); alert(er.message); } finally { atlaTazele = false; } if (b) b.style.display = 'none'; const m = $('#pMsg'); if (m) m.insertAdjacentHTML('afterbegin', `<div class="msg info">Kalınlık önerisi: ${log.length ? esc(log.join(' · ')) + '. Modele uygulamak için <b>Kalınlıkları modele yansıt</b>.' : 'değişiklik yok (tüm elemanlar yeterli ya da kalınlık üst sınırında).'}</div>` + (log.sinir || []).map(u => `<div class="msg">${esc(u)}</div>`).join('')); }, 40); }; }
    const bK = $('#bKal'); if (bK) { const f1 = bK.onclick; bK.onclick = function () { if (kabukYansit()) return; return f1 && f1.apply(this, arguments); }; }
  }, 0);

  setTimeout(() => { try { if (kabukMu()) { if (!modelTazele()) { onizle(); const m = $('#pMsg'); if (m) m.insertAdjacentHTML('afterbegin', `<div class="msg eskiModel">Önizlemedeki yapı önceki oturumdan kalan modeldir. ArıtmaCAD'deki güncel çizimi almak için <b>Modelden al</b>'a basın.</div>`); } } } catch (er) { console.warn(er); } }, 300);
  const DURUMAD = { G: 'G — zati yükler', Q: 'Q — hareketli', Hs: 'SU — hidrostatik (hazne dolu)', Hd: 'SU1 — iç perde tek taraf / seviye farkı', Ht: 'TPR — statik toprak itkisi', Qs: 'Sürşarj itkisi', YAS: 'YAS — yeraltı suyu', EWX: 'SU_EQ-X — Westergaard', EWY: 'SU_EQ-Y — Westergaard', ESX: 'TPR_EQ-X — toprak + atalet', ESY: 'TPR_EQ-Y — toprak + atalet' };
  P.KABUK_DURUM = DURUMAD;
  function kabukGoster(r) {
    const durum = ok => `<span class="pill ${ok ? 'ok' : 'bad'}">${ok ? 'UYGUN' : 'YETERSİZ'}</span>`, cm = v => String(Math.round(v * 1000) / 10).replace('.', ',');
    let h = `<h3>Sonuçlar — 3B kabuk modeli ${durum(r.ok)} <span class="hint">(${r.AG.nodes.length} düğüm, ${r.AG.els.length} eleman, ${r.dof} serbestlik, ağ ${f2(r.h)} m · ${f2(r.sure / 1000, 1)} s)</span></h3>`;
    r.uyar.forEach(u => h += `<div class="msg">${esc(u)}</div>`); (r.bilgi || []).forEach(u => h += `<div class="msg info">${esc(u)}</div>`);
    h += `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0"><label>Durum <select id="kbD">${Object.keys(r.Q).map(c => `<option value="${c}">${esc(DURUMAD[c] || c)}</option>`).join('')}<option value="ZARF:tsm:m11p">Zarf TSM M11 max</option><option value="ZARF:tsm:m11n">Zarf TSM M11 min</option><option value="ZARF:tsm:m22p" selected>Zarf TSM M22 max</option><option value="ZARF:tsm:m22n">Zarf TSM M22 min</option><option value="ZARF:tsm:n11">Zarf TSM F11 (halka çekmesi) max</option></select></label>
      <label>Büyüklük <select id="kbB"><option>M11</option><option selected>M22</option><option>M12</option><option>N11</option><option>N22</option><option>V13</option><option>V23</option></select></label>
      <label>Eleman <select id="kbF"><option value="*">Tümü</option><option value="perde">Perdeler</option><option value="radye">Radye</option>${r.gruplar.filter(g => g.tur === 'dis' || g.tur === 'ic').map((g, i) => `<option value="g${r.gruplar.indexOf(g)}">${esc(g.ad)}</option>`).join('')}</select></label>
      <label>Açı <input id="kbA" type="range" min="-180" max="180" value="-50" style="width:120px"></label></div><div id="kbC"></div>`;
    h += `<table class="t"><tr><th class="l">Eleman</th><th>Donatı yönü / yüz</th><th>Md (kNm/m)</th><th>Nd (kN/m)</th><th>Ms (kNm/m)</th><th>As ger. (cm²/m)</th><th>Seçilen</th><th>As (cm²/m)</th><th>σs (MPa)</th><th>w (mm)</th></tr>`;
    for (const t of r.tasarim) { t.katman.forEach((k, i) => { const s = k.sec; h += `<tr>${i === 0 ? `<td class="l" rowspan="${t.katman.length + 1}"><b>${esc(t.eleman)}</b><br><span class="hint">t = ${cm(t.grup.t)} cm</span></td>` : ''}<td class="l">${k.yon} — ${k.yuz}</td><td>${f2(k.M, 1)}</td><td>${f2(k.N, 1)}</td><td>${f2(k.Ms, 1)}</td><td>${f2((s.req || 0) * 1e4)}</td><td>${s.ok ? `Ø${s.F}/${cm(s.s)}` : '<span class="bad">—</span>'}</td><td>${s.ok ? f2(s.As * 1e4) : '—'}</td><td>${s.ok ? f2(s.ss, 0) : '—'}</td><td>${s.ok ? f2(s.w, 3) : '—'}</td></tr>`; });
      h += `<tr><td class="l">Kesme <span class="hint">(mesnet yüzünden d içeride)</span></td><td colspan="8">Vd = ${f2(t.kesme.Vd, 1)} kN/m ≤ Vcr = ${f2(t.kesme.Vcr, 1)} kN/m ${t.kesme.ok ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'}${(t.yerel || []).length ? ` <span class="hint">· ${t.yerel.length} tekil noktada yerel ilave donatı notu (yukarıda)</span>` : ''}</td></tr>`; }
    h += `</table><table class="t" style="margin-top:10px"><tr><th class="l">Kontrol</th><th>Değer</th><th>Sınır</th></tr><tr><td class="l">Zemin gerilmesi (yay basıncı maks., emniyet kombinasyonları)</td><td>${f2(r.qmax, 1)} kN/m²</td><td>${S.zemin.sig} kN/m² ${r.qmax <= S.zemin.sig ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'}</td></tr></table>`;
    if (r.cubuk && r.cubuk.length) { // kabuk modelindeki kolon / kiriş kaburgaları: perde / döşemeyle birlikte taşıdıkları iç kuvvetler (TSM zarfı)
      h += `<h4 style="margin:12px 0 4px">Kabuk modelindeki kolon ve kirişler — iç kuvvet zarfı (TSM)</h4><p class="hint">Perde içindeki kolonların perde dışına taşan kısmı ve döşeme altına sarkan kiriş gövdeleri kaburga çubuk olarak hesaba girdi. Bu kuvvetler su yapısı yüklerinden (toprak, su, YAS, deprem itkisi) gelir; kolon donatısı hesabında çerçeve kuvvetlerine eklenir (son sütun: kaburga + perde şeridi = kolon kesitinin taşıdığı moment); kiriş kuvvetleri bilgi içindir.</p><table class="t"><tr><th class="l">Eleman</th><th>Kaburga A (cm²)</th><th>N min / maks (kN)</th><th>M güçlü (kNm)</th><th>M zayıf (kNm)</th><th>V (kN)</th><th>Kolon kesit momenti, depremsiz / depremli (kNm)</th></tr>`;
      for (const c of r.cubuk) h += `<tr><td class="l">${c.tur === 'kolon' ? 'Kolon' : 'Kiriş'} ${esc(c.ad)}</td><td>${f2(c.s.A * 1e4, 0)}</td><td>${f2(c.N[0], 1)} / ${f2(c.N[1], 1)}</td><td>${f2(c.M3, 1)}</td><td>${f2(c.M2, 1)}</td><td>${f2(c.V, 1)}</td><td>${c.tur === 'kolon' ? `${f2(c.Mn.M3, 1)} / ${f2(c.Md.M3, 1)}${c.gomulu ? ` <span class="hint">(×${f2(c.kat, 2)} perde şeridi)</span>` : ''}` : ''}</td></tr>`;
      h += '</table>'; }
    $('#sonuc').innerHTML = h;
    const ciz = () => { const d = $('#kbD').value, b = $('#kbB').value, f = $('#kbF').value, gi = f[0] === 'g' ? r.gruplar[+f.slice(1)] : null, set = gi ? new Set(gi.ids) : null;
      const filt = f === '*' ? null : f === 'perde' ? (e => e.tur === 'perde') : f === 'radye' ? (e => e.tur === 'radye') : ((e, i) => set.has(i));
      const birim = /^M/.test(b) || d.includes(':m') ? 'kN·m/m' : 'kN/m';
      const o = P.kabukCiz(r, { deger: P.kabukDeger(r, d, b), filt, az: +$('#kbA').value, W: Math.min(1100, $('#sonuc').clientWidth - 20), H: 560, baslik: `${d.startsWith('ZARF') ? $('#kbD').selectedOptions[0].text : 'Shell ' + b + ' — ' + (DURUMAD[d] || d)}`, birim });
      $('#kbC').innerHTML = ''; if (o) $('#kbC').appendChild(o.canvas); };
    ['#kbD', '#kbB', '#kbF', '#kbA'].forEach(s => $(s).onchange = ciz); ciz();
  }
})();

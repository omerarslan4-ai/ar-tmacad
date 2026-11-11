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

  /* ---------- hesap ---------- */
  const NQ = 8, QI = { M11: 0, M22: 1, M12: 2, N11: 3, N22: 4, N12: 5, V13: 6, V23: 7 };
  P.kabukHesap = (S, ilerle) => {
    const t0 = Date.now(), M = S.kabuk, MAL = P.malzeme(S.mal), g = S.geo;
    const Atop = M.walls.reduce((s, w) => { let L = 0; const n = w.kapali ? w.pts.length : w.pts.length - 1; for (let i = 0; i < n; i++) { const a = w.pts[i], b = w.pts[(i + 1) % w.pts.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s + L * (w.zt - M.radye.kAlt); }, 0) + area(M.radye.pts) + (M.dosemeler || []).reduce((s, d) => s + area(d.pts), 0);
    const h = +(S.tas.kmesh > 0 ? S.tas.kmesh : Math.min(1.0, Math.max(0.25, Math.round(Math.sqrt(Atop / 5000) * 20) / 20)));
    const AG = P.kabukAg(M, { h, kotlar: [g.kSu, g.kZemin, g.kYAS].filter(v => v != null && isFinite(v)) });
    const o = { E: MAL.Ec * 1000, nu: 0.2, kw: S.zemin.kw };
    const YT = yukTanim(S, AG, MAL);
    const coz = P.kabukCoz(AG, o, YT.L, ilerle);
    // durum kuvvetleri
    const ne = AG.els.length, Q = {};
    for (const [c, U] of Object.entries(coz.sonuc)) { const F = P.kabukKuvvet(AG, o, U), a = new Float32Array(ne * 4 * NQ); F.forEach((f4, e) => f4.forEach((q, k) => { const b = (e * 4 + k) * NQ; a[b] = q.M11; a[b + 1] = q.M22; a[b + 2] = q.M12; a[b + 3] = q.N11; a[b + 4] = q.N22; a[b + 5] = q.N12; a[b + 6] = q.V13; a[b + 7] = q.V23; })); Q[c] = a; }
    // zarf (Wood–Armer: M11 ± |M12|)
    /* 'cat': çatlak kontrolünde kullanılan zarf — emniyet kombinasyonları. Varsayılan: deprem dahil (kullanıcı kararı);
       S.tas.catDep kapatılırsa yalnız işletme yükleri */
    const catDep = !(S.tas.catDep === false || S.tas.catDep === 'false');
    const KV = kombler(S), Z = {}; for (const tip of ['tsm', 'emn', 'cat']) Z[tip] = { m11p: new Float32Array(ne * 4).fill(-1e9), m11n: new Float32Array(ne * 4).fill(1e9), m22p: new Float32Array(ne * 4).fill(-1e9), m22n: new Float32Array(ne * 4).fill(1e9), n11: new Float32Array(ne * 4).fill(-1e9), n22: new Float32Array(ne * 4).fill(-1e9), v: new Float32Array(ne * 4) };
    const tmp = new Float64Array(NQ);
    for (const k of KV.concat(KV.filter(k => k.tip === 'emn' && (catDep || !k.dep)).map(k => Object.assign({}, k, { tip: 'cat' })))) { const z = Z[k.tip], ent = Object.entries(k.f).filter(([c, f]) => f && Q[c]);
      for (let i = 0; i < ne * 4; i++) { tmp.fill(0); for (const [c, f] of ent) { const a = Q[c], b = i * NQ; for (let q = 0; q < NQ; q++) tmp[q] += f * a[b + q]; }
        const a12 = Math.abs(tmp[2]); z.m11p[i] = Math.max(z.m11p[i], tmp[0] + a12); z.m11n[i] = Math.min(z.m11n[i], tmp[0] - a12); z.m22p[i] = Math.max(z.m22p[i], tmp[1] + a12); z.m22n[i] = Math.min(z.m22n[i], tmp[1] - a12);
        z.n11[i] = Math.max(z.n11[i], tmp[3]); z.n22[i] = Math.max(z.n22[i], tmp[4]); z.v[i] = Math.max(z.v[i], Math.hypot(tmp[6], tmp[7])); } }
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
    // zemin gerilmesi (emniyet kombinasyonları zarfı): q = kw·(−w)
    const nn = AG.nodes.length, qz = new Float32Array(nn); let qmax = 0;
    for (const k of KV.filter(k => k.tip === 'emn')) for (let i = 0; i < nn; i++) { let w = 0; for (const [c, f] of Object.entries(k.f)) if (f && coz.sonuc[c]) w += f * coz.sonuc[c][i * 6 + 2]; const q = -S.zemin.kw * w; if (q > qz[i]) qz[i] = q; }
    const radN = new Set(); AG.els.forEach(e => { if (e.tur === 'radye') e.n.forEach(n => radN.add(n)); }); for (const n of radN) qmax = Math.max(qmax, qz[n]);
    // gruplar ve tasarım
    const gruplar = []; const ekle = (ad, tur, filt, t, c, yuz) => { const ids = []; AG.els.forEach((e, i) => { if (filt(e)) ids.push(i); }); if (ids.length) gruplar.push({ ad, tur, ids, t, c, yuz }); };
    AG.W.forEach((w, wi) => ekle(w.ad || ('Perde ' + (wi + 1)), w.tip === 'dis' ? 'dis' : 'ic', e => e.wi === wi && e.tur === 'perde', w.t, S.mal.cP, w.tip === 'dis' ? ['dış', 'iç'] : ['1. yüz', '2. yüz']));
    ekle(`${f2(M.radye.kAlt)} Kotu Temel (radye)`, 'radye', e => e.tur === 'radye', M.radye.t, S.mal.cR, ['üst', 'alt']);
    (M.dosemeler || []).forEach((d, k) => ekle(`${d.ad || 'D' + (k + 1)} döşeme`, 'doseme', e => e.grp === 'D' + k, d.t, S.mal.cD, ['üst', 'alt']));
    const tasarim = [], uyar = [];
    for (const gr of gruplar) {
      const enb = (arr, f, isr) => { let m = isr > 0 ? -1e9 : 1e9, at = -1; for (const i of gr.ids) for (let k = 0; k < 4; k++) { const v = arr[i * 4 + k]; if (isr > 0 ? v > m : v < m) { m = v; at = i; } } return { m, at }; };
      // dış perdede +3 yönü dışa mı? (yüz eşlemesi: M>0 → +3 yüzünde çekme)
      const e0 = AG.els[gr.ids[0]], disa = gr.tur === 'dis' ? (YT.disYon.get(e0)[0] * e0.F.e3[0] + YT.disYon.get(e0)[1] * e0.F.e3[1] > 0) : true;
      const kat = [];
      for (const [yon, kp, kn, kN] of [['M11 (yatay)', 'm11p', 'm11n', 'n11'], ['M22 (düşey)', 'm22p', 'm22n', 'n22']]) {
        if (gr.tur === 'radye' || gr.tur === 'doseme') yon.replace('yatay', 'X').replace('düşey', 'Y');
        const yAd = gr.tur === 'radye' || gr.tur === 'doseme' ? (kp === 'm11p' ? 'M11 (X)' : 'M22 (Y)') : yon;
        const Nd = Math.max(0, enb(Z.tsm[kN], 0, 1).m), Ns = Math.max(0, enb(Z.cat[kN], 0, 1).m);
        for (const [s, key] of [[1, kp], [-1, kn]]) {
          const Md = Math.max(0, s * enb(Z.tsm[key], 0, s).m), Ms = Math.max(0, s * enb(Z.cat[key], 0, s).m);
          const yuz = gr.tur === 'radye' || gr.tur === 'doseme' ? (s > 0 ? 'üst' : 'alt') : (gr.tur === 'dis' ? ((s > 0) === disa ? 'dış' : 'iç') : (s > 0 ? '1. yüz' : '2. yüz'));
          const dd = gr.t - gr.c - 0.01, Meq = Md + 0.5 * Nd * 0.9 * dd, Mseq = Ms + 0.5 * Ns * 0.9 * dd;
          const sec = P.donatiSec({ M: Meq, Ms: Mseq, h: gr.t, c: gr.c, kat: kp === 'm11p' ? 1 : 2, su: true }, S, MAL);
          kat.push({ yon: yAd, yuz, M: Md, Ms, N: Nd, Ns, sec });
          if (!sec.ok) uyar.push(`${gr.ad} — ${yAd} ${yuz}: ${sec.msg || 'uygun donatı yok'}`);
        }
      }
      const Vd = enb(Z.tsm.v, 0, 1).m, ks = P.kesme(Vd, gr.t - gr.c - 0.01, MAL); if (!ks.ok) uyar.push(`${gr.ad}: kesme Vd = ${f2(Vd, 1)} > Vcr = ${f2(ks.Vcr, 1)} kN/m`);
      tasarim.push({ eleman: gr.ad, grup: gr, katman: kat, kesme: ks });
    }
    YT.nanUyar.forEach(u => uyar.push(u));
    if (qmax > S.zemin.sig) uyar.push(`Zemin gerilmesi ${f2(qmax, 1)} > ${S.zemin.sig} kN/m²`);
    KR = { AG, o, Q, Z, KV, YT, U: coz.sonuc, gruplar, tasarim, uyar, qz, qmax, h, sure: Date.now() - t0, dof: coz.N, prof: coz.prof, MAL, ok: !uyar.length };
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
    if (d && d.kabuk) { const kAlt = d.kabuk.radye.kAlt; model0.call(this, Object.assign({}, d, { kabuk: undefined })); S.kabuk = d.kabuk; S.mod = 'kabuk'; S.suYapisi = false; S.icRef = null; if (d.kabuk.wmax > 0) S.tas.wmax = d.kabuk.wmax; /* yapıya özgü çatlak sınırı (anaerobik: 0,20 mm — firma standardı) */ { const ov = S.kabukOv || {}; let n = 0; const uy = (k, o) => { const v = ov[k]; if (!v || !o) return; if (Math.abs(o.t - v.t0) < 0.004) { if (k[0] === 'R') o.kAlt = +(o.kAlt - (v.t - o.t)).toFixed(3); o.t = v.t; n++; } else if (Math.abs(o.t - v.t) < 0.004) delete ov[k]; else delete ov[k]; }; d.kabuk.walls.forEach(w => uy('W' + w.id, w)); uy('R' + d.kabuk.radye.id, d.kabuk.radye); (d.kabuk.dosemeler || []).forEach(x => uy('D' + x.id, x)); S.kabukOv = ov; if (n) S._ovMsg = `${n} elemanda önerilen (modele henüz yansıtılmamış) kalınlık kullanılıyor.`; } /* dikdörtgen akışı (kalınlık yansıtma, eşitleme) devre dışı */ if (S.tas.dH == null) S.tas.dH = 0.3; save(); onizle(); const m = $('#pMsg'); if (m) m.insertAdjacentHTML('afterbegin', `<div class="msg info"><b>3B kabuk model</b>: ${d.kabuk.walls.length} perde (${d.kabuk.walls.filter(w => w.tip === 'dis').length} dış), radye ${f2(area(d.kabuk.radye.pts), 1)} m² (alt kot ${f2(kAlt)}). Hesap 3B kabuk sonlu eleman modeliyle yapılır (SAP2000 shell benzeri).</div>`); return; }
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
    RC = null; window._KR = r; try { if (typeof cerVar === 'function' && cerVar() && P.cerceveHesap) RC = P.cerceveHesap(S); } catch (er) { console.error('çerçeve', er); } // kolon / kiriş: ayrı çerçeve hesabı (döşeme yükü kirişlere aktarılır)
    kabukGoster(r);
    ['#bCiz', '#bDxf', '#bDon3'].forEach(s => { const b = $(s); if (b) b.disabled = true; }); const by = $('#bYaz'); if (by) by.disabled = false;
    try { R = P.kabukAdaptor ? P.kabukAdaptor(r, S) : null; if (R && typeof rapor === 'function') rapor(); if (RC && P.cerceveRapor) { try { if (typeof cerGoster === 'function') cerGoster(); } catch (e2) { } $('#rapor').insertAdjacentHTML('beforeend', P.cerceveRapor(RC, f2)); $('#raporKutu').style.display = 'block'; } } catch (er) { console.error(er); $('#rapor').innerHTML = `<div class="msg">Rapor hatası: ${esc(er.message)}</div>`; $('#raporKutu').style.display = 'block'; }
  };

  /* ---------- kabuk modunda Kalınlık öner / Kalınlıkları modele yansıt ---------- */
  const yetersizler = r => { const out = []; for (const t of r.tasarim) { if (t.katman.some(k => !k.sec || !k.sec.ok) || !t.kesme.ok) out.push(t.grup); } return out; };
  P.kabukOner = (ilerle) => {
    const log = [], h0 = S.tas.kmesh; let r = null;
    try { S.tas.kmesh = Math.max(+h0 || 0, 0.8); // denemelerde kaba ağ (hızlı)
      for (let it = 0; it < 10; it++) { r = P.kabukHesap(S); const Y = yetersizler(r); if (!Y.length) break; let deg = false;
        for (const g of Y) { if (g.tur === 'radye') { if (S.kabuk.radye.t < 2.0) { S.kabuk.radye.t = +(S.kabuk.radye.t + 0.05).toFixed(3); S.kabuk.radye.kAlt = +(S.kabuk.radye.kAlt - 0.05).toFixed(3); deg = true; log.push(`radye → ${Math.round(S.kabuk.radye.t * 100)}`); } }
          else if (g.tur === 'doseme') { const k = +r.AG.els[g.ids[0]].grp.slice(1), d = S.kabuk.dosemeler[k]; if (d && d.t < 0.8) { d.t = +(d.t + 0.05).toFixed(3); deg = true; log.push(`${d.ad} → ${Math.round(d.t * 100)}`); } }
          else { const wi = r.AG.els[g.ids[0]].wi, w = S.kabuk.walls[wi]; if (w && w.t < 1.5) { w.t = +(w.t + 0.05).toFixed(3); deg = true; log.push(`${w.ad} → ${Math.round(w.t * 100)}`); } } }
        if (!deg) break; if (ilerle) ilerle(it); }
    } finally { S.tas.kmesh = h0; }
    // aynı adlı (birleşik) son değerleri özetle
    const son = new Map(); log.forEach(x => { const [a, b] = x.split(' → '); son.set(a, b); });
    if (S.kabuk.radye) S.geo.kAlt = S.kabuk.radye.kAlt; save();
    return [...son.entries()].map(([a, b]) => `${a} ${b} cm`);
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
        atlaTazele = true; try { log = P.kabukOner(); const ov = S.kabukOv || {}; (S.kabuk.walls || []).forEach(w => { const k = 'W' + w.id; if (t0.has(k) && Math.abs(t0.get(k) - w.t) > 0.004) ov[k] = { t: w.t, t0: (ov[k] && ov[k].t0) || t0.get(k) }; }); if (S.kabuk.radye && t0.has('R' + S.kabuk.radye.id) && Math.abs(t0.get('R' + S.kabuk.radye.id) - S.kabuk.radye.t) > 0.004) ov['R' + S.kabuk.radye.id] = { t: S.kabuk.radye.t, t0: t0.get('R' + S.kabuk.radye.id) }; (S.kabuk.dosemeler || []).forEach(d => { const k = 'D' + d.id; if (t0.has(k) && Math.abs(t0.get(k) - d.t) > 0.004) ov[k] = { t: d.t, t0: t0.get(k) }; }); S.kabukOv = ov; save(); hepsi(null); } catch (er) { console.error(er); alert(er.message); } finally { atlaTazele = false; } if (b) b.style.display = 'none'; const m = $('#pMsg'); if (m) m.insertAdjacentHTML('afterbegin', `<div class="msg info">Kalınlık önerisi: ${log.length ? esc(log.join(' · ')) : 'değişiklik yok (tüm elemanlar yeterli ya da üst sınırda)'}. Modele uygulamak için <b>Kalınlıkları modele yansıt</b>.</div>`); }, 40); }; }
    const bK = $('#bKal'); if (bK) { const f1 = bK.onclick; bK.onclick = function () { if (kabukYansit()) return; return f1 && f1.apply(this, arguments); }; }
  }, 0);

  setTimeout(() => { try { if (kabukMu()) { if (!modelTazele()) { onizle(); const m = $('#pMsg'); if (m) m.insertAdjacentHTML('afterbegin', `<div class="msg eskiModel">Önizlemedeki yapı önceki oturumdan kalan modeldir. ArıtmaCAD'deki güncel çizimi almak için <b>Modelden al</b>'a basın.</div>`); } } } catch (er) { console.warn(er); } }, 300);
  const DURUMAD = { G: 'G — zati yükler', Q: 'Q — hareketli', Hs: 'SU — hidrostatik (hazne dolu)', Hd: 'SU1 — iç perde tek taraf / seviye farkı', Ht: 'TPR — statik toprak itkisi', Qs: 'Sürşarj itkisi', YAS: 'YAS — yeraltı suyu', EWX: 'SU_EQ-X — Westergaard', EWY: 'SU_EQ-Y — Westergaard', ESX: 'TPR_EQ-X — toprak + atalet', ESY: 'TPR_EQ-Y — toprak + atalet' };
  P.KABUK_DURUM = DURUMAD;
  function kabukGoster(r) {
    const durum = ok => `<span class="pill ${ok ? 'ok' : 'bad'}">${ok ? 'UYGUN' : 'YETERSİZ'}</span>`, cm = v => String(Math.round(v * 1000) / 10).replace('.', ',');
    let h = `<h3>Sonuçlar — 3B kabuk modeli ${durum(r.ok)} <span class="hint">(${r.AG.nodes.length} düğüm, ${r.AG.els.length} eleman, ${r.dof} serbestlik, ağ ${f2(r.h)} m · ${f2(r.sure / 1000, 1)} s)</span></h3>`;
    r.uyar.forEach(u => h += `<div class="msg">${esc(u)}</div>`);
    h += `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0"><label>Durum <select id="kbD">${Object.keys(r.Q).map(c => `<option value="${c}">${esc(DURUMAD[c] || c)}</option>`).join('')}<option value="ZARF:tsm:m11p">Zarf TSM M11 max</option><option value="ZARF:tsm:m11n">Zarf TSM M11 min</option><option value="ZARF:tsm:m22p" selected>Zarf TSM M22 max</option><option value="ZARF:tsm:m22n">Zarf TSM M22 min</option><option value="ZARF:tsm:n11">Zarf TSM F11 (halka çekmesi) max</option></select></label>
      <label>Büyüklük <select id="kbB"><option>M11</option><option selected>M22</option><option>M12</option><option>N11</option><option>N22</option><option>V13</option><option>V23</option></select></label>
      <label>Eleman <select id="kbF"><option value="*">Tümü</option><option value="perde">Perdeler</option><option value="radye">Radye</option>${r.gruplar.filter(g => g.tur === 'dis' || g.tur === 'ic').map((g, i) => `<option value="g${r.gruplar.indexOf(g)}">${esc(g.ad)}</option>`).join('')}</select></label>
      <label>Açı <input id="kbA" type="range" min="-180" max="180" value="-50" style="width:120px"></label></div><div id="kbC"></div>`;
    h += `<table class="t"><tr><th class="l">Eleman</th><th>Donatı yönü / yüz</th><th>Md (kNm/m)</th><th>Nd (kN/m)</th><th>Ms (kNm/m)</th><th>As ger. (cm²/m)</th><th>Seçilen</th><th>As (cm²/m)</th><th>σs (MPa)</th><th>w (mm)</th></tr>`;
    for (const t of r.tasarim) { t.katman.forEach((k, i) => { const s = k.sec; h += `<tr>${i === 0 ? `<td class="l" rowspan="${t.katman.length + 1}"><b>${esc(t.eleman)}</b><br><span class="hint">t = ${cm(t.grup.t)} cm</span></td>` : ''}<td class="l">${k.yon} — ${k.yuz}</td><td>${f2(k.M, 1)}</td><td>${f2(k.N, 1)}</td><td>${f2(k.Ms, 1)}</td><td>${f2((s.req || 0) * 1e4)}</td><td>${s.ok ? `Ø${s.F}/${cm(s.s)}` : '<span class="bad">—</span>'}</td><td>${s.ok ? f2(s.As * 1e4) : '—'}</td><td>${s.ok ? f2(s.ss, 0) : '—'}</td><td>${s.ok ? f2(s.w, 3) : '—'}</td></tr>`; });
      h += `<tr><td class="l">Kesme</td><td colspan="8">Vd = ${f2(t.kesme.Vd, 1)} kN/m ≤ Vcr = ${f2(t.kesme.Vcr, 1)} kN/m ${t.kesme.ok ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'}</td></tr>`; }
    h += `</table><table class="t" style="margin-top:10px"><tr><th class="l">Kontrol</th><th>Değer</th><th>Sınır</th></tr><tr><td class="l">Zemin gerilmesi (yay basıncı maks., emniyet kombinasyonları)</td><td>${f2(r.qmax, 1)} kN/m²</td><td>${S.zemin.sig} kN/m² ${r.qmax <= S.zemin.sig ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'}</td></tr></table>`;
    $('#sonuc').innerHTML = h;
    const ciz = () => { const d = $('#kbD').value, b = $('#kbB').value, f = $('#kbF').value, gi = f[0] === 'g' ? r.gruplar[+f.slice(1)] : null, set = gi ? new Set(gi.ids) : null;
      const filt = f === '*' ? null : f === 'perde' ? (e => e.tur === 'perde') : f === 'radye' ? (e => e.tur === 'radye') : ((e, i) => set.has(i));
      const birim = /^M/.test(b) || d.includes(':m') ? 'kN·m/m' : 'kN/m';
      const o = P.kabukCiz(r, { deger: P.kabukDeger(r, d, b), filt, az: +$('#kbA').value, W: Math.min(1100, $('#sonuc').clientWidth - 20), H: 560, baslik: `${d.startsWith('ZARF') ? $('#kbD').selectedOptions[0].text : 'Shell ' + b + ' — ' + (DURUMAD[d] || d)}`, birim });
      $('#kbC').innerHTML = ''; if (o) $('#kbC').appendChild(o.canvas); };
    ['#kbD', '#kbB', '#kbF', '#kbA'].forEach(s => $(s).onchange = ciz); ciz();
  }
})();

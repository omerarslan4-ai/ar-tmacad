/* ArıtmaCAD — YAPI ELEMANLARINDA ÇAKIŞMA ve NET HACİM (saf hesap; arayüz yok, Node ile denenir)
   Taşıyıcı ve dolgu elemanları (radye / temel, kolon, perde, döşeme, kiriş, tuğla duvar, sıkıştırılmış dolgu) dışbükey düşey
   prizmalara ayrılır. İki iş yapar:
     1) cakisma(ents)  → hangi eleman çifti ne kadar hacimde üst üste biniyor (ham model; hiçbir kesme uygulanmadan)
     2) net(ents)      → birleşim önceliğiyle (docs/tasarim-standartlari.md › "Eleman birleşimleri") her elemanın net parçaları:
                         önceliği yüksek eleman bütün kalır, düşük öncelikli olan birleşimde kesilir; aynı hacim iki kez sayılmaz.
   Öncelik: temel / radye > kolon > betonarme perde > döşeme > kiriş > tuğla duvar > sıkıştırılmış dolgu (eşit öncelikte modele önce giren).
   Boşluklar (minha): pencere / kapı (acik), İT/ÇEK boşlukları (bosluk3) elemanın kendi hacminden düşülür.
   Metraj (INSMETRAJ, INSCAKISMA) ve statik eleman listesi aynı net parçaları kullanır.
   Kısıt: prizmalar düşeydir — eğimli yüzlü perde ortalama kalınlıkla, kolon gusesi ayrı (guse hacmi kolonun kendi hacmine eklenir) alınır. */
(function (C) {
  'use strict';
  const RAD = Math.PI / 180, EPS = 1e-9;
  const p2 = p => [+p[0] || 0, +p[1] || 0];
  const alanI = q => { let s = 0; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  const alan = q => (q.length < 3 ? 0 : Math.abs(alanI(q)));
  const ccw = q => (alanI(q) < 0 ? q.slice().reverse() : q);
  const kutu = q => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const v of q) { if (v[0] < x0) x0 = v[0]; if (v[1] < y0) y0 = v[1]; if (v[0] > x1) x1 = v[0]; if (v[1] > y1) y1 = v[1]; } return [x0, y0, x1, y1]; };
  const sade = q => q.filter((v, i) => { const w = q[(i + q.length - 1) % q.length]; return Math.hypot(v[0] - w[0], v[1] - w[1]) > 1e-9; });   // üst üste gelen köşeler kırpmayı bozar
  const pr = (q, za, zb) => { const c = sade(ccw(q.map(p2))); return { q: c, za, zb, bb: kutu(c) }; };
  const hacim = ls => ls.reduce((v, r) => v + alan(r.q) * (r.zb - r.za), 0);

  /* a→b kenarının solunda (ic = true) ya da sağında kalan parça (dışbükey çokgen kırpma) */
  const kirp = (poly, a, b, ic) => {
    const yan = q => (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]), out = [];
    for (let i = 0; i < poly.length; i++) {
      const P = poly[i], Q = poly[(i + 1) % poly.length], sp = ic ? yan(P) : -yan(P), sq = ic ? yan(Q) : -yan(Q);
      if (sp >= -1e-12) out.push(P);
      if ((sp >= -1e-12) !== (sq >= -1e-12)) { const t = sp / (sp - sq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
    }
    return sade(out);
  };
  const ayrik = (A, B) => B.za >= A.zb - EPS || B.zb <= A.za + EPS || B.bb[0] >= A.bb[2] - EPS || B.bb[2] <= A.bb[0] + EPS || B.bb[1] >= A.bb[3] - EPS || B.bb[3] <= A.bb[1] + EPS;
  /* iki dışbükey prizmanın kesişim hacmi */
  const kesisim = (A, B) => {
    if (ayrik(A, B)) return 0;
    let I = A.q; for (let i = 0; i < B.q.length && I.length >= 3; i++) I = kirp(I, B.q[i], B.q[(i + 1) % B.q.length], true);
    return alan(I) * (Math.min(A.zb, B.zb) - Math.max(A.za, B.za));
  };
  /* A − B → dışbükey parçalar */
  const cikar = (A, B) => {
    if (ayrik(A, B)) return [A];
    let I = A.q; for (let i = 0; i < B.q.length && I.length >= 3; i++) I = kirp(I, B.q[i], B.q[(i + 1) % B.q.length], true);
    if (alan(I) < 1e-9) return [A];
    const out = [], za = Math.max(A.za, B.za), zb = Math.min(A.zb, B.zb);
    if (za > A.za + EPS) out.push({ q: A.q, za: A.za, zb: za, bb: A.bb });
    if (zb < A.zb - EPS) out.push({ q: A.q, za: zb, zb: A.zb, bb: A.bb });
    let cur = A.q;
    for (let i = 0; i < B.q.length && cur.length >= 3; i++) { const a = B.q[i], b = B.q[(i + 1) % B.q.length], o = kirp(cur, a, b, false); if (alan(o) > 1e-9) out.push({ q: o, za, zb, bb: kutu(o) }); cur = kirp(cur, a, b, true); }
    return out;
  };
  const cikarHepsi = (ls, kesiciler) => { let rem = ls; for (const B of kesiciler) { const nx = []; for (const A of rem) nx.push(...cikar(A, B)); rem = nx; if (!rem.length) break; } return rem; };

  /* basit çokgeni üçgenlere ayırır (kulak kesme) — döşeme / dolgu izleri dışbükey olmayabilir */
  const ucgenle = q0 => {
    const q = ccw(q0).filter((v, i, a) => { const w = a[(i + a.length - 1) % a.length]; return Math.hypot(v[0] - w[0], v[1] - w[1]) > 1e-9; }), idx = q.map((_, i) => i), out = [];
    const capraz = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const icinde = (p, a, b, c) => capraz(a, b, p) > 1e-12 && capraz(b, c, p) > 1e-12 && capraz(c, a, p) > 1e-12;
    let guard = 0;
    while (idx.length > 3 && guard++ < 10000) {
      let kesildi = false;
      for (let i = 0; i < idx.length; i++) {
        const ia = idx[(i + idx.length - 1) % idx.length], ib = idx[i], ic = idx[(i + 1) % idx.length], a = q[ia], b = q[ib], c = q[ic];
        if (capraz(a, b, c) <= 1e-12) continue;
        if (idx.some(k => k !== ia && k !== ib && k !== ic && icinde(q[k], a, b, c))) continue;
        out.push([a, b, c]); idx.splice(i, 1); kesildi = true; break;
      }
      if (!kesildi) break;                                  // bozuk çokgen: kalanı yelpaze
    }
    if (idx.length === 3) out.push(idx.map(k => q[k]));
    else if (idx.length > 3) for (let i = 1; i + 1 < idx.length; i++) out.push([q[idx[0]], q[idx[i]], q[idx[i + 1]]]);
    return out.filter(t => alan(t) > 1e-10);
  };

  /* ---------- eleman → tür ---------- */
  const TUR = { temel: 0, kolon: 1, perde: 2, doseme: 3, kiris: 4, duvar: 5, dolgu: 6 };
  const TUR_AD = { temel: 'Temel', kolon: 'Kolon', perde: 'Perde', doseme: 'Döşeme', kiris: 'Kiriş', duvar: 'Duvar', dolgu: 'Dolgu' };
  const turu = e => {
    if (!e) return null;
    if (e.type === 'temel' || (e.type === 'plak' && e.kind === 'radye') || (e.type === 'perde' && e.temel)) return 'temel';
    if (e.type === 'kolon') return 'kolon';
    if (e.type === 'perde') return (e.malz || 'beton') === 'beton' ? 'perde' : 'duvar';
    if (e.type === 'plak') return 'doseme';
    if (e.type === 'kiris') return 'kiris';
    if (e.type === 'dolgu') return 'dolgu';
    return null;
  };

  /* ---------- perde / duvar: gönyeli (köşesi birleşik) parça dörtgenleri ---------- */
  const perdeYuz = e => {                                    // sol = +, sağ = − (insaat.js faceOffs ile aynı kural, ortalama kalınlık)
    const tb = +e.tb || 0.3, tt = e.tt != null && e.tt !== '' ? +e.tt : tb, t = (tb + tt) / 2;
    const yol = perdeYol(e), kapali = perdeKapali(e), sy = kapali ? alanI(yol) > 0 : true;
    let j = e.hiza || 'O'; if (j === 'DIS') j = sy ? 'R' : 'L'; else if (j === 'IC') j = sy ? 'L' : 'R';
    const g = e.egim || 'R'; let sol, sag;                   // taban ve üst yüz ofsetlerinin ortalaması
    const lB = j === 'L' ? 0 : j === 'R' ? tb : tb / 2, rB = lB - tb;
    if (g === 'L') { sag = rB; sol = (lB + rB + tt) / 2; } else if (g === 'B') { const c = (lB + rB) / 2; sol = c + t / 2; sag = c - t / 2; } else { sol = lB; sag = (rB + lB - tt) / 2; }
    const of = +e.ofs || 0, sh = kapali ? (sy ? of : -of) : (j === 'L' ? -of : of);
    return { sol: sol + sh, sag: sag + sh, t };
  };
  const perdeKapali = e => !!e.closed || (e.pts.length > 3 && Math.hypot(e.pts[0][0] - e.pts[e.pts.length - 1][0], e.pts[0][1] - e.pts[e.pts.length - 1][1]) < 1e-3);
  const perdeYol = e => { const p = e.pts.map(p2); if (perdeKapali(e) && p.length > 2 && Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < 1e-3) p.pop(); return p; };
  const perdeParca = e => {                                  // [{a, u, n, L, q:[sağ0, sağ1, sol1, sol0]}]
    const p = perdeYol(e), n = p.length, kapali = perdeKapali(e) && n > 2, segN = kapali ? n : n - 1, F = perdeYuz(e), out = [];
    if (segN < 1) return out;
    const yon = i => { const a = p[i % n], b = p[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
    const gonye = (u, u2) => {                               // köşede s kayması katsayısı (ofset başına)
      const nn = [-u[1], u[0]], n2 = [-u2[1], u2[0]], m = [nn[0] + n2[0], nn[1] + n2[1]], ml = Math.hypot(m[0], m[1]); if (ml < 1e-6) return 0;
      const mm = [m[0] / ml, m[1] / ml], dn = mm[0] * nn[0] + mm[1] * nn[1]; if (Math.abs(dn) < 0.2) return 0; return (mm[0] * u[0] + mm[1] * u[1]) / dn;
    };
    for (let i = 0; i < segN; i++) {
      const a = p[i], b = p[(i + 1) % n], u = yon(i), nn = [-u[1], u[0]], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const k0 = (i > 0 || kapali) ? gonye(yon((i - 1 + segN) % segN), u) : 0, k1 = (i < segN - 1 || kapali) ? gonye(u, yon(i + 1)) : 0;
      const P = (s, o) => [a[0] + u[0] * s + nn[0] * o, a[1] + u[1] * s + nn[1] * o];
      out.push({ i, a, u, n: nn, L, q: [P(k0 * F.sag, F.sag), P(L + k1 * F.sag, F.sag), P(L + k1 * F.sol, F.sol), P(k0 * F.sol, F.sol)] });
    }
    return out;
  };

  /* ---------- boşluk (minha) prizmaları ---------- */
  const disbukeyZarf = pts => {                              // Andrew tek-zincir
    const s = pts.map(p2).sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), alt = [], ust = [];
    for (const p of s) { while (alt.length >= 2 && cr(alt[alt.length - 2], alt[alt.length - 1], p) <= 1e-12) alt.pop(); alt.push(p); }
    for (let i = s.length - 1; i >= 0; i--) { const p = s[i]; while (ust.length >= 2 && cr(ust[ust.length - 2], ust[ust.length - 1], p) <= 1e-12) ust.pop(); ust.push(p); }
    alt.pop(); ust.pop(); return alt.concat(ust);
  };
  const boslukPr = e => {
    const out = [];
    for (const b of (Array.isArray(e.bosluk3) ? e.bosluk3 : [])) {
      if (!b || !Array.isArray(b.pts) || b.pts.length < 3 || !Array.isArray(b.d)) continue;
      const d = b.d, uc = b.pts.map(p => [p[0] + (d[0] || 0), p[1] + (d[1] || 0), (p[2] || 0) + (d[2] || 0)]), hep = b.pts.concat(uc);
      const zs = hep.map(p => p[2] || 0), za = Math.min(...zs), zb = Math.max(...zs);
      const dusey = Math.abs(d[2] || 0) > 1e-9 && Math.hypot(d[0] || 0, d[1] || 0) < 1e-9;
      if (dusey) { for (const t of ucgenle(b.pts.map(p2))) out.push(pr(t, za, zb)); }           // düşey geçiş: izi aynen (dışbükey olmayabilir)
      else { const z = disbukeyZarf(hep); if (z.length >= 3 && zb > za + EPS) out.push(pr(z, za, zb)); }  // yatay geçiş: izdüşüm zarfı
    }
    return out;
  };
  const acikPr = (e, ents) => {                              // pencere / kapı boşlukları (duvar kalınlığınca)
    const out = [], ac = (ents || []).filter(o => o.type === 'acik' && o.host === e.id); if (!ac.length) return out;
    const prc = perdeParca(e), F = perdeYuz(e), z0 = +e.z0 || 0, h = +e.h || 3;
    for (const o of ac) {
      const sf = prc.find(f => f.i === (o.seg || 0)); if (!sf) continue;
      const w = +o.w || 1, s0 = (+o.s || 0) - w / 2, s1 = (+o.s || 0) + w / 2, za = z0 + (o.kind === 'kapi' ? 0 : (o.par != null ? +o.par : 0.9)), zb = Math.min(z0 + h, za + (+o.hh || (o.kind === 'kapi' ? 2.1 : 1.4)));
      const P = (s, of) => [sf.a[0] + sf.u[0] * s + sf.n[0] * of, sf.a[1] + sf.u[1] * s + sf.n[1] * of];
      if (zb > za + EPS) out.push(pr([P(s0, F.sag - 0.01), P(s1, F.sag - 0.01), P(s1, F.sol + 0.01), P(s0, F.sol + 0.01)], za, zb));
    }
    return out;
  };

  /* ---------- eleman → ham (brüt) prizmalar; kendi boşlukları düşülmüş ---------- */
  const kolonIz = k => {
    const c = p2(k.p);
    if (k.sek === 'D') { const r = (+k.D || 0.5) / 2; return Array.from({ length: 16 }, (_, i) => [c[0] + r * Math.cos(i * Math.PI / 8), c[1] + r * Math.sin(i * Math.PI / 8)]); }
    const b = +k.b || 0.4, d = +k.d || 0.4, cs = Math.cos((k.rot || 0) * RAD), sn = Math.sin((k.rot || 0) * RAD);
    return [[-b / 2, -d / 2], [b / 2, -d / 2], [b / 2, d / 2], [-b / 2, d / 2]].map(([x, y]) => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs]);
  };
  const kirisIz = e => {
    let a = p2(e.a), b = p2(e.b); const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) return null;
    const u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [-u[1], u[0]], w = (+e.bw || 0.3) / 2, j = e.hiza || 'O', o = j === 'O' ? 0 : (j === 'L' ? -1 : 1) * w;
    a = [a[0] + n[0] * o, a[1] + n[1] * o]; b = [b[0] + n[0] * o, b[1] + n[1] * o];
    return [[a[0] - n[0] * w, a[1] - n[1] * w], [b[0] - n[0] * w, b[1] - n[1] * w], [b[0] + n[0] * w, b[1] + n[1] * w], [a[0] + n[0] * w, a[1] + n[1] * w]];
  };
  const prizmalar = (e, ents) => {
    const t = turu(e); let out = [];
    if (!t) return out;
    if (e.type === 'kolon') { const z0 = +e.z0 || 0; out.push(pr(kolonIz(e), z0, z0 + (+e.h || 3))); }
    else if (e.type === 'kiris') { const q = kirisIz(e), zt = +e.zt || 3; if (q) out.push(pr(q, zt - (+e.hb || 0.5), zt)); }
    else if (e.type === 'temel') { const c = p2(e.p), bx = +e.bx || 1.5, by = +e.by || 1.5, cs = Math.cos((e.rot || 0) * RAD), sn = Math.sin((e.rot || 0) * RAD), W = (x, y) => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs], zt = +e.zt || 0; out.push(pr([W(-bx / 2, -by / 2), W(bx / 2, -by / 2), W(bx / 2, by / 2), W(-bx / 2, by / 2)], zt - (+e.t || 0.6), zt)); }
    else if (e.type === 'plak' || e.type === 'dolgu') { const zt = e.type === 'dolgu' ? +e.zb || 0 : +e.zt || 0, za = e.type === 'dolgu' ? +e.za || 0 : zt - (+e.t || 0.3); for (const u of ucgenle(e.pts.map(p2))) out.push(pr(u, za, zt)); }
    else if (e.type === 'perde') { const z0 = +e.z0 || 0, h = +e.h || 3; for (const sf of perdeParca(e)) out.push(pr(sf.q, z0, z0 + h)); }
    out = out.filter(r => r.zb > r.za + EPS && alan(r.q) > 1e-9);
    const bos = boslukPr(e).concat(e.type === 'perde' ? acikPr(e, ents) : []);
    return bos.length ? cikarHepsi(out, bos) : out;
  };

  const liste = (ents, o) => {
    const canli = (o && o.canli) || (() => true);
    return (ents || []).filter(e => turu(e) && canli(e)).map((e, i) => ({ e, i, tur: turu(e), r: TUR[turu(e)], pr: prizmalar(e, ents) }));
  };
  const bbHep = ls => { const b = [Infinity, Infinity, -Infinity, -Infinity, Infinity, -Infinity]; for (const r of ls) { b[0] = Math.min(b[0], r.bb[0]); b[1] = Math.min(b[1], r.bb[1]); b[2] = Math.max(b[2], r.bb[2]); b[3] = Math.max(b[3], r.bb[3]); b[4] = Math.min(b[4], r.za); b[5] = Math.max(b[5], r.zb); } return b; };
  const bbAyrik = (a, b) => a[0] >= b[2] - EPS || b[0] >= a[2] - EPS || a[1] >= b[3] - EPS || b[1] >= a[3] - EPS || a[4] >= b[5] - EPS || b[4] >= a[5] - EPS;

  /* olağan birleşim mi (kural kesip çözer), model hatası mı?
     hata: aynı türden iki eleman (perde∩perde, döşeme∩döşeme, kolon∩kolon, duvar∩duvar) ve dolgunun betonla çakışması dışındaki
     her "tuğla duvar ∩ betonarme" yığılması; kiriş∩kiriş yalnız eksenleri paralelken (üst üste çizilmiş) hatadır, çaprazda birleşimdir. */
  const paralel = (a, b) => { const ua = [a.b[0] - a.a[0], a.b[1] - a.a[1]], ub = [b.b[0] - b.a[0], b.b[1] - b.a[1]], la = Math.hypot(ua[0], ua[1]) || 1, lb = Math.hypot(ub[0], ub[1]) || 1; return Math.abs((ua[0] * ub[1] - ua[1] * ub[0]) / (la * lb)) < 0.05; };
  const sinif = (A, B) => {
    if (A.tur === B.tur) return A.tur === 'kiris' && !paralel(A.e, B.e) ? 'birlesim' : 'hata';
    return 'birlesim';
  };

  /* ham modelde çakışan eleman çiftleri */
  const cakisma = (ents, o) => {
    const L = liste(ents, o), bb = L.map(x => bbHep(x.pr)), cift = [], tur = {}; let toplam = 0, hata = 0;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      if (bbAyrik(bb[i], bb[j])) continue;
      let v = 0; for (const A of L[i].pr) for (const B of L[j].pr) v += kesisim(A, B);
      if (v < 1e-6) continue;
      const [X, Y] = L[i].r <= L[j].r ? [L[i], L[j]] : [L[j], L[i]], s = sinif(X, Y), k = `${TUR_AD[X.tur]} ∩ ${TUR_AD[Y.tur]}`;
      cift.push({ a: X.e.id, b: Y.e.id, turA: X.tur, turB: Y.tur, hacim: v, sinif: s }); tur[k] = (tur[k] || 0) + v; toplam += v; if (s === 'hata') hata += v;
    }
    cift.sort((x, y) => y.hacim - x.hacim);
    return { cift, tur, toplam, hata };
  };

  /* birleşim önceliğiyle net parçalar: Map(id → {tur, brut, net, minha, kesen:{Tür: hacim}, parcalar}) */
  const net = (ents, o) => {
    const L = liste(ents, o).sort((a, b) => a.r - b.r || a.i - b.i), bb = L.map(x => bbHep(x.pr)), res = new Map();
    for (let j = 0; j < L.length; j++) {
      const J = L[j], g = hacim(J.pr), kesen = {}; let rem = J.pr;
      for (let i = 0; i < j && rem.length; i++) {
        if (bbAyrik(bb[i], bb[j])) continue;
        const once = hacim(rem); rem = cikarHepsi(rem, L[i].pr); const d = once - hacim(rem);
        if (d > 1e-6) { const k = TUR_AD[L[i].tur]; kesen[k] = (kesen[k] || 0) + d; }
      }
      const n = hacim(rem);
      res.set(J.e.id, { tur: J.tur, ad: TUR_AD[J.tur], brut: g, net: n, minha: Math.max(0, g - n), kesen, parcalar: rem });
    }
    return res;
  };
  /* net parçalar arasında kalan çakışma (kural doğru uygulanıyorsa 0) */
  const netCakisma = N => { const P = []; for (const [id, m] of N) for (const r of m.parcalar) P.push([id, r]); let v = 0; for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) if (P[i][0] !== P[j][0]) v += kesisim(P[i][1], P[j][1]); return v; };

  const api = { TUR, TUR_AD, turu, prizmalar, cakisma, net, netCakisma, hacim, kesisim, cikar, ucgenle, perdeParca, _ic: { kirp, alan, pr, kolonIz, kirisIz } };
  C.yapiCakisma = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : (globalThis.C = globalThis.C || {}));

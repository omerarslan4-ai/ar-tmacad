/* ArıtmaCAD Statik — 3B KABUK MODELİNİ SAP2000'E AKTARMA (.$2k metin dosyası; SAP2000 › File › Import › SAP2000 .s2k/.$2k)
   Aktarılanlar (birimler kN, m, C):
     • düğümler, 4 düğümlü kabuk alanlar (Shell-Thick, perde / radye / döşeme kalınlıklarına göre kesitler, gruplar P1…, RADYE, D1…)
     • Winkler zemini: radye düğümlerinde düşey yay (kw × etki alanı) + küçük yatay yay — ArıtmaCAD çözümüyle aynı
     • ağların örtüşmediği bağlantılar (perde tabanı ↔ radye, perde üstü ↔ döşeme): en yakın ana düğüme BODY kısıtı
     • kolon ve kirişler: dikdörtgen çerçeve elemanları (kiriş döşeme orta düzleminde, kolon radye ortasından döşemeye)
     • yükleme durumları (G, Q, Hs, Hd, Ht, Qs, YAS, deprem …): ArıtmaCAD'in uyguladığı yayılı yüklerin düğüm kuvvetleri (zati ağırlık G içinde)
     • kombinasyonlar (TS 500 / su yapısı: tsm = taşıma gücü, emn = kullanma)
   Not: SAP2000'de "Run" sonrası M11 / M22 / V13 / V23 sonuçları ArıtmaCAD raporundaki diyagramlarla karşılaştırılabilir. */
(function () {
  'use strict';
  const P = window.STATIK; if (!P) return;
  const r = (v, d = 6) => { const x = +(+v).toFixed(d); return Object.is(x, -0) ? 0 : x; };
  const ad = s => String(s).replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'X';
  const trAd = s => ad(String(s).replace(/[çÇ]/g, 'C').replace(/[ğĞ]/g, 'G').replace(/[ıİ]/g, 'I').replace(/[öÖ]/g, 'O').replace(/[şŞ]/g, 'S').replace(/[üÜ]/g, 'U').replace(/−/g, '-').replace(/\+/g, 'p').replace(/-/g, 'm'));
  const GP = [-1 / Math.sqrt(3), 1 / Math.sqrt(3)], shp = (x, y) => [0.25 * (1 - x) * (1 - y), 0.25 * (1 + x) * (1 - y), 0.25 * (1 + x) * (1 + y), 0.25 * (1 - x) * (1 + y)];
  const dsh = (x, y) => [[-0.25 * (1 - y), 0.25 * (1 - y), 0.25 * (1 + y), -0.25 * (1 + y)], [-0.25 * (1 - x), -0.25 * (1 + x), 0.25 * (1 + x), 0.25 * (1 - x)]];

  P.kabukS2k = (KR, S, RC) => {
    const AG = KR.AG, o = KR.o, MAL = KR.MAL, nodes = AG.nodes.slice(), els = AG.els, L = [], T = (baslik, satirlar) => { if (!satirlar.length) return; L.push(`TABLE:  "${baslik}"`); satirlar.forEach(s => L.push('   ' + s)); L.push(''); };
    const fc = Math.round((MAL.fck || 30) * 1000), E = r(o.E, 0), G12 = r(o.E / (2 * (1 + o.nu)), 0), gc = (S.mal && S.mal.gc) || 25, mat = 'C' + Math.round(fc / 1000);
    L.push(`File ${trAd(S.proj && S.proj.ad || 'aritmacad')}.$2k was saved on ${new Date().toISOString().slice(0, 10)} (AritmaCAD 3D shell model)`, '');
    T('PROGRAM CONTROL', ['ProgramName=SAP2000   Version=24.0.0   CurrUnits="KN, m, C"   ConcCode="TS 500-2000"   RegenHinge=Yes']);
    T('MATERIAL PROPERTIES 01 - GENERAL', [`Material=${mat}   Type=Concrete   SymType=Isotropic   TempDepend=No   Color=Gray8Dark   Notes="AritmaCAD"`]);
    T('MATERIAL PROPERTIES 02 - BASIC MECHANICAL PROPERTIES', [`Material=${mat}   UnitWeight=${gc}   UnitMass=${r(gc / 9.80665, 4)}   E1=${E}   G12=${G12}   U12=${o.nu}   A1=0.00001`]);
    T('MATERIAL PROPERTIES 03B - CONCRETE DATA', [`Material=${mat}   Fc=${fc}   LtWtConc=No   SSCurveOpt=Mander   SSHysType=Takeda   SFc=0.002   SCap=0.005   FinalSlope=-0.1   FAngle=0   DAngle=0`]);
    // kabuk kesitleri (tür + kalınlık)
    const kesit = new Map(), kAd = e => { const t = Math.round(e.t * 1000) / 10, k = (e.tur === 'perde' ? 'PERDE' : e.tur === 'radye' ? 'RADYE' : 'DOSEME') + String(t).replace('.', '_'); if (!kesit.has(k)) kesit.set(k, e.t); return k; };
    const eAd = els.map(kAd);
    T('AREA SECTION PROPERTIES', [...kesit].map(([k, t]) => `Section=${k}   Material=${mat}   MatAngle=0   AreaType=Shell   Type=Shell-Thick   DrillDOF=Yes   Thickness=${r(t, 4)}   BendThick=${r(t, 4)}`));
    // çerçeve elemanları (kolon / kiriş): en yakın kabuk düğümüne bağlanır
    const yakin = (p, filt) => { let b = -1, bd = Infinity; for (let i = 0; i < AG.nodes.length; i++) { if (filt && !filt(i)) continue; const q = AG.nodes[i], d = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]); if (d < bd) { bd = d; b = i; } } return { i: b, d: bd }; };
    const dosN = new Set(), radN = new Set(); els.forEach(e => { if (e.tur === 'doseme') e.n.forEach(n => dosN.add(n)); else if (e.tur === 'radye') e.n.forEach(n => radN.add(n)); });
    const fr = [], frKes = new Map(), cer = S.cer || {}, uyar = [];
    const frKesAd = (b, h) => { const k = `K${Math.round(b * 100)}X${Math.round(h * 100)}`; frKes.set(k, [b, h]); return k; };
    for (const k of (cer.kirisler || [])) { // kiriş: döşeme düğümleri üzerinde, eksen boyunca ardışık düğümler
      const a = k.a, b = k.b, d = [b[0] - a[0], b[1] - a[1]], L2 = d[0] * d[0] + d[1] * d[1] || 1, tol = (AG.h || 0.5) * 0.51, sira = [];
      for (const n of dosN) { const p = AG.nodes[n]; if (Math.abs(p[2] - (k.zt + 0.1)) > 0.6) continue; const u = ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / L2; if (u < -0.02 || u > 1.02) continue; const e = Math.hypot(a[0] + d[0] * u - p[0], a[1] + d[1] * u - p[1]); if (e <= tol) sira.push({ n, u, e }); }
      const m = new Map(); sira.forEach(s => { const key = Math.round(s.u * 1000); if (!m.has(key) || m.get(key).e > s.e) m.set(key, s); }); const sr = [...m.values()].sort((x, y) => x.u - y.u);
      if (sr.length < 2) { uyar.push(`${k.no || 'kiriş ' + k.id}: döşeme ağında düğüm bulunamadı, aktarılmadı`); continue; }
      const ks = frKesAd(k.bw || 0.3, k.hb || 0.5); for (let i = 1; i < sr.length; i++) fr.push({ i: sr[i - 1].n, j: sr[i].n, ks, grup: trAd(k.no || 'K' + k.id) }); }
    for (const c of (cer.kolonlar || [])) { // kolon: radye ortasındaki en yakın düğümden döşemedeki en yakın düğüme
      const alt = yakin([c.x, c.y, AG.zr], i => radN.has(i)), ust = yakin([c.x, c.y, c.zt != null ? c.zt : AG.zr + 3], i => dosN.has(i) || !radN.has(i));
      if (alt.i < 0 || ust.i < 0 || alt.i === ust.i) { uyar.push(`${c.no || 'kolon'}: bağlanacak düğüm bulunamadı`); continue; }
      fr.push({ i: alt.i, j: ust.i, ks: frKesAd(c.bx || 0.4, c.by || 0.4), grup: trAd(c.no || 'S' + c.id), kolon: true }); }
    T('FRAME SECTION PROPERTIES 01 - GENERAL', [...frKes].map(([k, [b, h]]) => `SectionName=${k}   Material=${mat}   Shape=Rectangular   t3=${r(h, 4)}   t2=${r(b, 4)}`));
    // düğümler
    T('JOINT COORDINATES', nodes.map((p, i) => `Joint=${i + 1}   CoordSys=GLOBAL   CoordType=Cartesian   XorR=${r(p[0], 4)}   Y=${r(p[1], 4)}   Z=${r(p[2], 4)}   SpecialJt=No`));
    T('CONNECTIVITY - AREA', els.map((e, i) => `Area=${i + 1}   NumJoints=4   Joint1=${e.n[0] + 1}   Joint2=${e.n[1] + 1}   Joint3=${e.n[2] + 1}   Joint4=${e.n[3] + 1}`));
    T('AREA SECTION ASSIGNMENTS', els.map((e, i) => `Area=${i + 1}   Section=${eAd[i]}   MatProp=Default`));
    T('CONNECTIVITY - FRAME', fr.map((f, i) => `Frame=${i + 1}   JointI=${f.i + 1}   JointJ=${f.j + 1}   IsCurved=No`));
    T('FRAME SECTION ASSIGNMENTS', fr.map((f, i) => `Frame=${i + 1}   SectionType=Rectangular   AutoSelect=N.A.   AnalSect=${f.ks}   MatProp=Default`));
    // gruplar
    const grp = new Map(), gEk = (g, tip, no) => { if (!grp.has(g)) grp.set(g, []); grp.get(g).push([tip, no]); };
    els.forEach((e, i) => gEk(e.tur === 'perde' ? trAd((AG.W[e.wi] && AG.W[e.wi].ad) || 'PERDE' + e.wi) : e.tur === 'radye' ? 'RADYE' : trAd(((S.kabuk.dosemeler || [])[+String(e.grp).slice(1)] || {}).ad || e.grp), 'Area', i + 1));
    fr.forEach((f, i) => gEk(f.grup, 'Frame', i + 1));
    T('GROUPS 1 - DEFINITIONS', [...grp.keys()].map(g => `GroupName=${g}   Selection=Yes   SectionCut=Yes   Steel=Yes   Concrete=Yes   Aluminum=Yes   ColdFormed=Yes   Stage=Yes   Bridge=Yes   AutoSeismic=No   AutoWind=No   SelDesSteel=No   SelDesAlum=No   SelDesCold=No   MassWeight=Yes`));
    T('GROUPS 2 - ASSIGNMENTS', [...grp].flatMap(([g, l]) => l.map(([t, n]) => `GroupName=${g}   ObjectType=${t}   ObjectLabel=${n}`)));
    // Winkler yayları (ArıtmaCAD çözümüyle aynı: kw × etki alanı, yatayda 1e-3 kat)
    const trib = new Float64Array(nodes.length); els.forEach(e => { if (e.tur === 'radye') { const A = e.A || 0; e.n.forEach(n => { trib[n] += A / 4; }); } });
    const yay = []; for (let i = 0; i < nodes.length; i++) if (trib[i] > 0) { const k = o.kw * trib[i]; yay.push(`Joint=${i + 1}   CoordSys=GLOBAL   U1=${r(1e-3 * k, 3)}   U2=${r(1e-3 * k, 3)}   U3=${r(k, 3)}   R1=0   R2=0   R3=0`); }
    T('JOINT SPRING ASSIGNMENTS 1 - UNCOUPLED', yay);
    // örtüşmeyen ağ bağlantıları → BODY kısıtı (bağlı düğüm ↔ en büyük ağırlıklı ana düğüm)
    const bd = [], ba = []; (AG.ties || []).forEach((t, k) => { let j = 0; for (let q = 1; q < 4; q++) if (t.N[q] > t.N[j]) j = q; const nm = 'B' + (k + 1); bd.push(`Name=${nm}   CoordSys=GLOBAL   UX=Yes   UY=Yes   UZ=Yes   RX=Yes   RY=Yes   RZ=Yes`); ba.push(`Joint=${t.s + 1}   Constraint=${nm}   Type=Body`, `Joint=${t.m[j] + 1}   Constraint=${nm}   Type=Body`); });
    T('CONSTRAINT DEFINITIONS - BODY', bd); T('JOINT CONSTRAINT ASSIGNMENTS', ba);
    // yükler: ArıtmaCAD yayılı yüklerinin tutarlı düğüm kuvvetleri
    const durumlar = Object.keys(KR.U || {}).filter(c => KR.YT && KR.YT.L && KR.YT.L[c]), tip = c => (c === 'G' ? 'Dead' : c === 'Q' ? 'Live' : /^E/.test(c) ? 'Quake' : 'Other');
    T('LOAD PATTERN DEFINITIONS', durumlar.map(c => `LoadPat=${trAd(c)}   DesignType=${tip(c)}   SelfWtMult=0`));
    T('LOAD CASE DEFINITIONS', durumlar.map(c => `Case=${trAd(c)}   Type=LinStatic   InitialCond=Zero   DesTypeOpt="Prog Det"   DesignType=${tip(c)}   AutoType=None   RunCase=Yes`));
    T('CASE - STATIC 1 - LOAD ASSIGNMENTS', durumlar.map(c => `Case=${trAd(c)}   LoadType="Load pattern"   LoadName=${trAd(c)}   LoadSF=1`));
    const jl = [];
    for (const c of durumlar) { const fn = KR.YT.L[c], F = new Float64Array(nodes.length * 3);
      for (const e of els) { const tr = fn(e); if (!tr) continue; const X = e.n.map(i => AG.nodes[i]);
        for (const x of GP) for (const y of GP) { const N = shp(x, y), dN = dsh(x, y), p = [0, 0, 0], a = [0, 0, 0], b = [0, 0, 0];
          for (let k = 0; k < 4; k++) for (let q = 0; q < 3; q++) { p[q] += N[k] * X[k][q]; a[q] += dN[0][k] * X[k][q]; b[q] += dN[1][k] * X[k][q]; }
          const det = Math.hypot(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]), f = tr(p); if (!f) continue;
          for (let k = 0; k < 4; k++) for (let q = 0; q < 3; q++) F[e.n[k] * 3 + q] += N[k] * f[q] * det; } }
      if (c === 'G') for (const f of fr) { const [b, h] = frKes.get(f.ks), A = AG.nodes[f.i], B = AG.nodes[f.j], W = gc * b * h * Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]) / 2; F[f.i * 3 + 2] -= W; F[f.j * 3 + 2] -= W; } // kolon / kiriş zati ağırlığı (kabuklarınki G içinde)
      for (let i = 0; i < nodes.length; i++) { const f1 = F[i * 3], f2 = F[i * 3 + 1], f3 = F[i * 3 + 2]; if (Math.abs(f1) + Math.abs(f2) + Math.abs(f3) < 1e-6) continue; jl.push(`Joint=${i + 1}   LoadPat=${trAd(c)}   CoordSys=GLOBAL   F1=${r(f1, 4)}   F2=${r(f2, 4)}   F3=${r(f3, 4)}   M1=0   M2=0   M3=0`); } }
    T('JOINT LOADS - FORCE', jl);
    // kombinasyonlar
    const cb = [], adlar = new Set();
    (KR.KV || []).forEach((k, i) => { let nm = trAd((k.tip === 'tsm' ? 'TSM_' : 'KUL_') + k.ad); while (adlar.has(nm)) nm += '_' + i; adlar.add(nm); const ent = Object.entries(k.f).filter(([c, f]) => f && durumlar.includes(c)); if (!ent.length) return;
      ent.forEach(([c, f], j) => cb.push(j ? `Combo=${nm}   CaseName=${trAd(c)}   ScaleFactor=${r(f, 4)}` : `Combo=${nm}   ComboType="Linear Add"   AutoDesign=No   CaseName=${trAd(c)}   ScaleFactor=${r(f, 4)}   SteelDesign=None   ConcDesign=None   AlumDesign=None   ColdDesign=None`)); });
    T('COMBINATION DEFINITIONS', cb);
    L.push('END TABLE DATA', '');
    return { metin: L.join('\r\n').replace(/[^\x00-\x7f]/g, '_'), ozet: { dugum: nodes.length, alan: els.length, cerceve: fr.length, yay: yay.length, bag: bd.length, durum: durumlar.length, komb: adlar.size }, uyar };
  };

  /* ---------- düğme: statik penceresinde "SAP2000 (.$2k)" ---------- */
  const kur = () => { const b0 = document.getElementById('bDxf'); if (!b0 || document.getElementById('bSap')) return !!b0;
    const b = document.createElement('button'); b.id = 'bSap'; b.textContent = 'SAP2000 (.$2k)'; b.title = '3B kabuk modelini (perde, radye, döşeme, kolon / kiriş, zemin yayları, yükler, kombinasyonlar) SAP2000\'e aktarmak için .$2k dosyası indirir: SAP2000 › File › Import › SAP2000 .$2k'; b.disabled = true; b0.after(b);
    b.onclick = () => { const KR = window._KR; if (!KR || !KR.AG) { alert('Önce 3B kabuk hesabı yapın (Hesapla).'); return; }
      const o = P.kabukS2k(KR, S, typeof RC !== 'undefined' ? RC : null), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([o.metin], { type: 'text/plain' })); a.download = trAd((S.proj && S.proj.ad) || 'statik') + '_SAP2000.$2k'; a.click();
      const m = document.getElementById('pMsg'), z = o.ozet; if (m) m.insertAdjacentHTML('afterbegin', `<div class="msg info">SAP2000 dosyası indirildi: ${z.dugum} düğüm, ${z.alan} kabuk alan, ${z.cerceve} çerçeve, ${z.yay} zemin yayı, ${z.bag} BODY bağı, ${z.durum} yükleme, ${z.komb} kombinasyon. SAP2000'de <b>File › Import › SAP2000 .s2k/.$2k</b> ile açın, Run Analysis.${o.uyar.length ? '<br>' + o.uyar.join('<br>') : ''}</div>`); };
    const h0 = window.hepsi; if (h0) window.hepsi = function () { const r0 = h0.apply(this, arguments); try { b.disabled = !(window._KR && window._KR.AG && S.mod === 'kabuk'); } catch (e) { } return r0; };
    return true; };
  if (!kur()) document.addEventListener('DOMContentLoaded', kur); else setTimeout(kur, 0);
})();

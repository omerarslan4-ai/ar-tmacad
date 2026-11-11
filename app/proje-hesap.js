/* ArıtmaCAD — PROJE HESAP MERKEZİ · HESAPTAN GÜNCELLE · PROJE RAPORU (pompa istasyonu / terfi)
   Tek kaynak: C.doc.set.projeHesap — tasarım debisi, asil / yedek pompa sayısı, kotlar, hız sınırları, boru cinsleri, Hazen-Williams C, yerel kayıplar.
   HESAP KALEMLERİ: basma (pompa başına, Qp) · kollektor (toplam Q) · iletim (terfi hattı, toplam Q) · pompa.
     Çizimdeki boru / vana / ek parça / ekipman / pompa ailesi bir kaleme bağlanır (e.hk). Bağlı borunun uçlarındaki vana ve ek parçalar
     aynı kaleme kendiliğinden bağlanır.
   HESAP: Qp = Q / Nasil; her kalemde v ≤ vmax ve DN ≥ DNmin olan en küçük çap (iç çap boru cinsine göre); Hazen-Williams sürtünme,
     Σk·v²/2g yerel kayıp; Hm = Hgeo + kayıplar; P2 ≥ ρgQpHm/η (+%10); ıslak hazne faydalı hacmi V = 900·Qp / Z (Qp m³/s, Z kalkış/saat).
   HESAPGUNCELLE: kalemlere bağlı elemanların çapını hesaba göre değiştirir (boru: dış çap / et, vana: aynı ürünün o DN modeli ya da ölçek,
     şematik vana: o DN'in bloğu, pompa ailesi: Q ve H). Önce değişiklik listesi gösterilir, onayla uygulanır (geri alınabilir).
   PROJERAPOR: aynı değerlerden hesap raporu (yazdır / PDF / Word). */
(function (C) {
  'use strict';
  const M = C.M, esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f2 = (v, n = 2) => (v == null || !isFinite(v)) ? '—' : (+v).toLocaleString('tr-TR', { minimumFractionDigits: n, maximumFractionDigits: n });
  const g = 9.81;
  const KALEM = { basma: 'Basma borusu (pompa başına)', kollektor: 'Kollektör', iletim: 'İletim (terfi) hattı', pompa: 'Pompa' };
  const HW_C = { pe: 150, pvc: 150, pvck: 150, ppr: 150, ctp: 150, paslanmaz: 140, duktil: 130, celik: 120, asme: 120, galvaniz: 120, beton: 120 };
  const DNLER = [50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000];
  const PE_OD = [63, 75, 90, 110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000];
  const PLAST = new Set(['pe', 'pvc', 'pvck', 'ppr']);
  const MOTOR = [0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 9, 11, 13.5, 15, 18.5, 22, 26, 30, 37, 45, 55, 64, 75, 90, 110, 132, 160, 200, 250, 315];
  const VARS = { ad: '', Q: 60, Qmin: 10, Nasil: 2, Nyedek: 1, zMin: -4.5, zDes: 8.0, Z: 10, eta: 60, ZG: 0, ZIN: -3.0, DIN: 300, HEFF: 1.0, vanaCek: 'klapeli', vanaIz: 'surgulu', yapi: null, cizim: '3b', pompaModel: 'oto',
    basma: { cins: 'paslanmaz', sinif: '10S', vmin: 0.7, vmax: 2.5, dnMin: 80, L: 0, k: 4.5 },
    kollektor: { cins: 'paslanmaz', sinif: '10S', vmin: 0.7, vmax: 2.5, dnMin: 100, L: 0, k: 2.0 },
    iletim: { cins: 'pe', sinif: 'SDR17', vmin: 0.7, vmax: 2.0, dnMin: 100, L: 500, k: 3.0 } };
  const VCEK = { klapeli: 'Çekvalf — klapeli (swing)', tilting: 'Çekvalf — eğik diskli (tilting)', bilyali: 'Çekvalf — bilyalı (toplu)' };
  const VIZ = { surgulu: 'Sürgülü vana', kelebek: 'Kelebek vana', bicakli: 'Bıçaklı sürgülü vana' };
  const vanaAd = e => e.kind === 'cekvalf' ? (VCEK[e.alt] || 'Çekvalf') : e.alt === 'bicakli' ? VIZ.bicakli : (VIZ[e.kind] || 'Vana');
  C.vanaAdi = vanaAd;
  /* proje hesabı ayarları: AYNI nesne yerinde tamamlanır (her çağrıda yeni nesne üretilirse pencerede değiştirilen değerler kaybolur) */
  const PH = () => { const s = C.doc.set, o = s.projeHesap && typeof s.projeHesap === 'object' ? s.projeHesap : (s.projeHesap = {}), d = JSON.parse(JSON.stringify(VARS));
    for (const k of Object.keys(d)) if (o[k] === undefined) o[k] = d[k];
    for (const k of ['basma', 'kollektor', 'iletim']) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; for (const [kk, v] of Object.entries(VARS[k] || {})) if (o[k][kk] === undefined) o[k][kk] = v; }
    return o; };

  /* ---------- çizimdeki bağlı elemanlar ---------- */
  const uzun = e => { let l = 0; for (let i = 1; i < e.pts.length; i++) l += Math.hypot(e.pts[i][0] - e.pts[i - 1][0], e.pts[i][1] - e.pts[i - 1][1], (e.pts[i][2] || 0) - (e.pts[i - 1][2] || 0)); return l; };
  const bagli = k => C.doc.ents.filter(e => e.hk === k);
  const POMPA_AILE = /dalgic_pompa|pompa/;
  const pompalar = () => C.doc.ents.filter(e => (e.type === 'aile' && POMPA_AILE.test(e.fam)) || e.type === 'pump' || (e.type === 'blk' && /pompa/i.test(e.tur || '')));

  /* ---------- boyut seçimi ---------- */
  const olcu = (cins, sinif, dn) => { try { return C.boruOlcu(cins, sinif, dn); } catch (e) { return null; } };
  const adaylar = cins => PLAST.has(cins) ? PE_OD : DNLER;
  const dnEtiket = (cins, s) => PLAST.has(cins) ? 'Ø' + s : 'DN' + s;
  const nomDN = (cins, s) => { if (!PLAST.has(cins)) return s; const t = [[63, 50], [75, 65], [90, 80], [110, 100], [125, 100], [140, 125], [160, 150], [180, 150], [200, 200], [225, 200], [250, 250], [280, 250], [315, 300], [355, 350], [400, 400], [450, 450], [500, 500], [560, 500], [630, 600], [710, 700], [800, 800]]; let r = 50; for (const [od, dn] of t) if (s >= od - 0.5) r = dn; return r; };
  const kalemHesap = (k, q, P) => { // q: l/s
    const K = P[k], Qm = q / 1000; let sec = null;
    for (const s of adaylar(K.cins)) { const o = olcu(K.cins, K.sinif, s); if (!o || o.dn !== s) continue; const D = o.id / 1000, v = Qm / (Math.PI * D * D / 4); if (nomDN(K.cins, s) < K.dnMin) continue; sec = { s, o, D, v }; if (v <= K.vmax) break; }
    if (!sec) return null;
    const L = K.L > 0 ? K.L : bagli(k).filter(e => e.type === 'pipe').reduce((a, e) => a + uzun(e), 0) / (k === 'basma' ? Math.max(1, P.Nasil + P.Nyedek) : 1);
    const Cc = HW_C[K.cins] || 130, hf = L > 0 ? 10.67 * L * Math.pow(Qm, 1.852) / (Math.pow(Cc, 1.852) * Math.pow(sec.D, 4.87)) : 0, hm = K.k * sec.v * sec.v / (2 * g);
    return { k, q, cins: K.cins, sinif: K.sinif, boy: sec.s, dn: nomDN(K.cins, sec.s), od: sec.o.od, t: sec.o.t, id: sec.o.id, v: sec.v, L, C: Cc, hf, hm, uyar: sec.v > K.vmax ? `v > ${K.vmax} m/s (en büyük çapta bile)` : sec.v < K.vmin ? `v < ${K.vmin} m/s — çökelme riski` : '' };
  };
  C.projeHesapla = () => {
    const P = PH(); P.zMin = +(P.ZIN - 0.20 - P.HEFF - 0.30).toFixed(2); // pompa durma seviyesinin 30 cm altı (POMPAISTASYONU ile aynı)
    const Qp = P.Q / Math.max(1, P.Nasil), r = { P, Qp };
    r.basma = kalemHesap('basma', Qp, P); r.kollektor = kalemHesap('kollektor', P.Q, P); r.iletim = kalemHesap('iletim', P.Q, P);
    r.Hgeo = P.zDes - P.zMin; r.kayip = ['basma', 'kollektor', 'iletim'].reduce((a, k) => a + (r[k] ? r[k].hf + r[k].hm : 0), 0);
    r.Hm = r.Hgeo + r.kayip; r.Ph = 1000 * g * Qp / 1000 * r.Hm / 1000; r.P2g = r.Ph / (P.eta / 100) * 1.10; r.P2 = MOTOR.find(m => m >= r.P2g) || MOTOR[MOTOR.length - 1];
    r.V = 900 * (Qp / 1000) / Math.max(1, P.Z); r.Ntop = P.Nasil + P.Nyedek; r.cizimPompa = pompalar().length;
    return r;
  };

  /* ---------- PROJE HESAP penceresi ---------- */
  const satir = (lab, html) => `<tr><td style="padding:2px 8px 2px 0;white-space:nowrap">${lab}</td><td>${html}</td></tr>`;
  const inp = (path, v, w = 80, typ = 'number') => `<input data-ph="${path}" ${typ === 'number' ? 'type="number" step="any"' : ''} value="${esc(v)}" style="width:${w}px">`;
  const cinsSec = (path, v) => `<select data-ph="${path}">${['pe', 'pvc', 'duktil', 'celik', 'asme', 'paslanmaz', 'galvaniz', 'ctp'].map(c => `<option ${c === v ? 'selected' : ''}>${c}</option>`).join('')}</select>`;
  C.projeHesapPencere = () => {
    const P = PH();
    const b = C.modal('Proje hesabı — pompa istasyonu / terfi', `<div style="display:grid;grid-template-columns:minmax(360px,1fr) minmax(420px,1.2fr);gap:16px;max-height:76vh">
      <div style="overflow:auto"><table style="font-size:13px">
        ${satir('Proje / tesis adı', inp('ad', P.ad, 220, 'text'))}
        ${satir('Tasarım debisi Q (l/s)', inp('Q', P.Q))}${satir('En küçük debi Qmin (l/s)', inp('Qmin', P.Qmin))}
        ${satir('Asil pompa sayısı', inp('Nasil', P.Nasil, 60))}${satir('Yedek pompa sayısı', inp('Nyedek', P.Nyedek, 60))}
        ${satir('Zemin kotu ZG (m)', inp('ZG', P.ZG))}${satir('Giriş borusu alt kotu ZIN (m)', inp('ZIN', P.ZIN))}${satir('Giriş borusu DN', inp('DIN', P.DIN, 70))}
        ${satir('Faydalı (çalışma) yüksekliği (m)', inp('HEFF', P.HEFF, 60))}${satir('Deşarj (en yüksek) kotu (m)', inp('zDes', P.zDes))}
        ${satir('Saatlik kalkış sayısı Z', inp('Z', P.Z, 60))}${satir('Pompa toplam verimi η (%)', inp('eta', P.eta, 60))}</table>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.75;margin:10px 0 3px">Vana seçimi (pompa başına)</div><table style="font-size:13px">
          ${satir('Çekvalf tipi', `<select data-ph="vanaCek">${Object.entries(VCEK).map(([k, t]) => `<option value="${k}" ${k === P.vanaCek ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}
          ${satir('Pompa modeli', `<select data-ph="pompaModel">${[['oto', 'Otomatik (KSB Amarex N aralıktaysa, yoksa Wilo)'], ['ksb', 'KSB Amarex N'], ['wilo', 'Wilo Rexa SUPRA (föy / şablon)'], ['sema', 'Şematik pompa']].map(([k, t]) => `<option value="${k}" ${k === P.pompaModel ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}
          ${satir('İstasyon çizimi', `<select data-ph="cizim"><option value="3b" ${P.cizim !== '2b' ? 'selected' : ''}>3B tasarım (perde, radye, döşeme, aile pompalar)</option><option value="2b" ${P.cizim === '2b' ? 'selected' : ''}>2B şematik + A-A kesiti + pafta</option></select>`)}
          ${satir('Ayırma (izolasyon) vanası', `<select data-ph="vanaIz">${Object.entries(VIZ).map(([k, t]) => `<option value="${k}" ${k === P.vanaIz ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}</table>
        ${['basma', 'kollektor', 'iletim'].map(k => `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.75;margin:10px 0 3px">${KALEM[k]}</div><table style="font-size:13px">
          ${satir('Boru cinsi / sınıfı', cinsSec(k + '.cins', P[k].cins) + ' ' + inp(k + '.sinif', P[k].sinif, 70, 'text'))}
          ${satir('Hız aralığı (m/s)', inp(k + '.vmin', P[k].vmin, 55) + ' – ' + inp(k + '.vmax', P[k].vmax, 55))}
          ${satir('En küçük DN', inp(k + '.dnMin', P[k].dnMin, 60))}
          ${satir('Uzunluk L (m, 0 = çizimden)', inp(k + '.L', P[k].L, 70))}${satir('Yerel kayıp Σk', inp(k + '.k', P[k].k, 60))}</table>`).join('')}
      </div><div style="overflow:auto" id="phSonuc"></div></div>
      <div class="bar" style="justify-content:space-between;margin-top:10px"><div style="display:flex;gap:8px"><button id="phCiz" class="pri">İstasyonu çiz</button><button id="phBag">Elemanları kaleme bağla…</button><button id="phGun">Hesaptan güncelle…</button></div>
      <div style="display:flex;gap:8px"><button id="phKapat">Kapat</button><button id="phRapor" class="pri">Proje raporu</button></div></div>`);
    const box = document.querySelector('#modal .box'); if (box) box.style.width = 'min(1200px,97vw)';
    const sonuc = () => {
      const r = C.projeHesapla(), row = k => { const x = r[k]; if (!x) return `<tr><td>${KALEM[k]}</td><td colspan="7">uygun çap yok</td></tr>`; const n = bagli(k).length;
        return `<tr><td>${KALEM[k]}</td><td>${f2(x.q, 1)}</td><td><b>${dnEtiket(x.cins, x.boy)}</b> ${esc(x.cins)} ${esc(x.sinif)}</td><td>${f2(x.id, 1)}</td><td>${f2(x.v)}</td><td>${f2(x.L, 1)}</td><td>${f2(x.hf + x.hm)}</td><td>${n}</td></tr>${x.uyar ? `<tr><td colspan="8" style="color:#e65100">⚠ ${esc(x.uyar)}</td></tr>` : ''}`; };
      const ap = r.cizimPompa, uy = ap && ap !== r.Ntop ? `<p style="color:#e65100">⚠ Çizimde ${ap} pompa var, hesap ${r.Ntop} pompa (${r.P.Nasil} asil + ${r.P.Nyedek} yedek) istiyor.</p>` : '';
      b.querySelector('#phSonuc').innerHTML = `<div style="font-weight:600;margin-bottom:6px">Sonuçlar</div>
        <table class="bom" style="font-size:12.5px"><thead><tr><th>Kalem</th><th>Q l/s</th><th>Çap</th><th>İç Ø mm</th><th>v m/s</th><th>L m</th><th>Kayıp m</th><th>Bağlı</th></tr></thead><tbody>${['basma', 'kollektor', 'iletim'].map(row).join('')}</tbody></table>
        <table style="font-size:13px;margin-top:8px">${satir('Pompa başına debi Qp', `<b>${f2(r.Qp, 1)} l/s</b> (${f2(r.Qp * 3.6, 1)} m³/h)`)}${satir('Geometrik yükseklik Hgeo', f2(r.Hgeo) + ' m')}${satir('Toplam kayıp', f2(r.kayip) + ' m')}
        ${satir('Manometrik yükseklik Hm', `<b>${f2(r.Hm)} m</b>`)}${satir('Gerekli motor gücü', `${f2(r.P2g)} kW → <b>${f2(r.P2, 1)} kW</b> standart motor`)}${satir('Islak hazne faydalı hacmi', `<b>${f2(r.V)} m³</b> (V = 900·Qp / Z)${r.P.yapi ? ` · çizilen: ${f2(r.P.yapi.Lw)} × ${f2(r.P.yapi.Ww)} × ${f2(r.P.HEFF)} m = <b>${f2(r.P.yapi.Vact)} m³</b>` : ''}`)}${satir('Hazne kotları', `durma ${f2(r.P.ZIN - 0.2 - r.P.HEFF)} · kalkış ${f2(r.P.ZIN - 0.2)} · en düşük su ${f2(r.P.zMin)} m`)}
        ${satir('Pompa sayısı', `${r.Ntop} (${r.P.Nasil} asil + ${r.P.Nyedek} yedek) · çizimde ${ap}`)}</table>${uy}
        <p class="hint">Elemanları kaleme bağlayın (boru seçip "Elemanları kaleme bağla"), sonra "Hesaptan güncelle" ile çizimdeki çaplar ve pompa Q-H'si hesaba uyar. Pompa ailelerine (KSB / Wilo) Q = ${f2(r.Qp, 1)} l/s, H = ${f2(r.Hm)} m yazılır.</p>`;
    };
    b.querySelectorAll('[data-ph]').forEach(i => i.onchange = () => { const [a, c] = i.dataset.ph.split('.'); const v = i.type === 'number' ? parseFloat(i.value) : i.value; if (c) P[a][c] = v; else P[a] = v; C.changed && C.changed(); sonuc(); });
    const kapat = () => { if (box) box.style.width = ''; C.closeModal(); };
    b.querySelector('#phKapat').onclick = kapat;
    b.querySelector('#phBag').onclick = () => { kapat(); calis('HESAPBAGLA'); };
    b.querySelector('#phGun').onclick = () => { kapat(); calis('HESAPGUNCELLE'); };
    b.querySelector('#phRapor').onclick = () => { kapat(); C.projeRapor(); };
    b.querySelector('#phCiz').onclick = () => { kapat(); calis('PROJEISTASYON'); };
    sonuc();
  };
  const calis = t => C.runTool ? C.runTool(t) : C.cmd.script(t);

  /* ---------- kaleme bağlama ---------- */
  const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], (a[2] || 0) - (b[2] || 0));
  const uclari = e => e.type === 'pipe' ? [M.p3(e.pts[0]), M.p3(e.pts[e.pts.length - 1])] : [];
  const komsulariBagla = () => { // bağlı boruların uçlarındaki vana / ek parça / blok aynı kaleme
    let n = 0;
    for (const p of C.doc.ents.filter(e => e.type === 'pipe' && e.hk && e.hk !== 'pompa')) for (const u of uclari(p)) for (const e of C.doc.ents) {
      if (e.hk || !['fit3', 'valve', 'blk', 'fit'].includes(e.type)) continue; let q = e.p ? M.p3(e.p) : null; if (!q) continue;
      const R = Math.max(0.15, (+p.od || +p.dn || 100) / 1000 * 1.5); if (d3(q, u) < R) { e.hk = p.hk; n++; }
    }
    return n;
  };
  C.addCommand(['HESAPBAGLA', 'KALEMBAGLA'], 'Seçili boru / vana / ek parça / pompayı proje hesabındaki bir kaleme bağlar (basma, kollektör, iletim, pompa). Bağlı boru uçlarındaki vana ve ek parçalar da bağlanır.', async (I) => {
    let s = (C.sel || []).slice(); if (!s.length) s = await I.sel('Kaleme bağlanacak elemanları seçin') || []; if (!s.length) return;
    let k = await I.kw('Hesap kalemi', [['basma', 'Basma borusu (pompa başına)', 'B'], ['kollektor', 'Kollektör', 'K'], ['iletim', 'İletim hattı', 'I'], ['pompa', 'Pompa', 'P'], ['yok', 'Bağı kaldır', 'Y']], 'basma'); if (!k) return; k = C.ascii ? C.ascii(String(k)).toLowerCase() : String(k).toLowerCase(); if (k === 'b') k = 'basma'; else if (k === 'k') k = 'kollektor'; else if (k === 'i') k = 'iletim'; else if (k === 'p') k = 'pompa'; else if (k === 'y') k = 'yok';
    for (const e of s) { if (k === 'yok') delete e.hk; else e.hk = k; }
    const n = k === 'yok' ? 0 : komsulariBagla(); C.changed();
    C.log(`${s.length} eleman ${k === 'yok' ? 'kalemden çıkarıldı' : `"${KALEM[k]}" kalemine bağlandı`}${n ? ` · uçlardaki ${n} vana / ek parça da bağlandı` : ''}.`);
  });

  /* ---------- pompa takımları: pompa + ona en yakın basma kalemi elemanları (boru, çekvalf, sürgülü, ek parçalar) ---------- */
  const konum = e => e.type === 'pipe' ? M.p3(e.pts[0]) : M.p3(e.p || [0, 0, 0]);
  const enYakinMesafe = (e, q) => e.type === 'pipe' ? Math.min(...e.pts.map(p => Math.hypot(p[0] - q[0], p[1] - q[1]))) : Math.hypot(konum(e)[0] - q[0], konum(e)[1] - q[1]);
  const takimlar = () => {
    const P = pompalar().map(p => ({ pompa: p, q: konum(p), ek: [] }));
    if (!P.length) return P;
    for (const e of bagli('basma')) { let best = null, bd = Infinity; for (const t of P) { const d = enYakinMesafe(e, t.q); if (d < bd) { bd = d; best = t; } } if (best) best.ek.push(e); }
    return P.sort((a, b) => a.q[0] - b.q[0] || a.q[1] - b.q[1]);
  };
  const kopyala = (e, v) => { const c = JSON.parse(JSON.stringify(e)); for (const k of ['id', 'sp', '_c', '_g', '_q', 'sel']) delete c[k]; const t = c.type; delete c.type; const z0 = Array.isArray(c.p) ? c.p[2] : undefined; const n = C.add(C.newEnt(t, c)); delete n.sp; C.xform(n, C.xMove(v)); if (z0 != null && Array.isArray(n.p)) n.p[2] = z0 + (v[2] || 0); return n; };
  const aralik = T => { // takımlar arası öteleme: son iki pompanın farkı; tek pompada pompa yönüne dik, takım genişliği + 0,6 m
    if (T.length >= 2) { const a = T[T.length - 2].q, b = T[T.length - 1].q; return [b[0] - a[0], b[1] - a[1], 0]; }
    const t = T[0], r = ((t.pompa.rot || 0) + 90) * Math.PI / 180, u = [Math.cos(r), Math.sin(r)];
    const pts = [t.q].concat(...t.ek.map(e => e.type === 'pipe' ? e.pts.map(M.p3) : [konum(e)])); let w = 0; for (const p of pts) w = Math.max(w, Math.abs((p[0] - t.q[0]) * u[0] + (p[1] - t.q[1]) * u[1]));
    let gen = 0.8; try { const q = t.pompa.type === 'aile' ? C.aileDegerE(t.pompa) : {}; gen = Math.max(gen, ((+q.Dm || +q.dA || +q.d || 600) / 1000)); } catch (er) { }
    const s = Math.max(1.2, 2 * w + 0.6, gen + 0.8); return [u[0] * s, u[1] * s, 0];
  };
  C.pompaTakimEkle = adet => {
    const T = takimlar(); if (!T.length) { C.warn('Çizimde kopyalanacak pompa yok — önce bir pompa ve basma borusunu çizip kaleme bağlayın.'); return 0; }
    const v = aralik(T), kaynak = T[T.length - 1]; let n = 0;
    for (let i = 1; i <= adet; i++) { const d = [v[0] * i, v[1] * i, 0]; kopyala(kaynak.pompa, d); for (const e of kaynak.ek) kopyala(e, d); n++; }
    C.changed(); C.log(`${n} pompa takımı eklendi (pompa + ${kaynak.ek.length} basma elemanı, aralık ${M.fmt(Math.hypot(v[0], v[1]), 2)} m). Kollektörü yeni pompalara kadar uzatmayı unutmayın.`);
    return n;
  };
  C.pompaTakimSil = adet => {
    const T = takimlar(), sil = T.slice(Math.max(0, T.length - adet)); const L = []; for (const t of sil) L.push(t.pompa, ...t.ek);
    if (L.length) { C.remove(L); C.changed(); C.log(`${sil.length} pompa takımı silindi (${L.length} eleman).`); } return sil.length;
  };
  C.addCommand(['POMPASAYISI', 'POMPATAKIMI'], 'Çizimdeki pompa takımı sayısını proje hesabına (asil + yedek) eşitler: eksikse son pompa takımını (pompa + basma borusu, vanalar) kopyalar, fazlaysa sondakileri siler.', async (I) => {
    const r = C.projeHesapla(), T = takimlar(), fark = r.Ntop - T.length;
    if (!fark) { C.log(`Pompa sayısı uyumlu: ${T.length}.`); return; }
    if (fark > 0) C.pompaTakimEkle(fark); else { const ok = await I.kw(`${-fark} pompa takımı silinsin mi?`, [['E', 'Evet'], ['H', 'Hayır']], 'H'); if (ok === 'E') C.pompaTakimSil(-fark); }
  });

  /* ---------- hesaptan güncelle ---------- */
  const grupAd = n => C.up(String(n || '').replace(/[_\-\s]*(DN|Ø|⌀)\s*[-_ ]?\d{2,4}/ig, '').replace(/\s+/g, ' ').trim());
  const degisiklikler = () => {
    const r = C.projeHesapla(), L = [];
    for (const k of ['basma', 'kollektor', 'iletim']) {
      const x = r[k]; if (!x) continue;
      for (const e of bagli(k)) {
        if (e.type === 'pipe') { if (Math.round(+e.dn) !== x.boy || e.cins !== x.cins) L.push({ e, ad: `Boru (${KALEM[k]})`, eski: `${dnEtiket(e.cins, e.dn)} ${e.cins || ''}`, yeni: `${dnEtiket(x.cins, x.boy)} ${x.cins}`, uygula: () => { const o = olcu(x.cins, x.sinif, x.boy); Object.assign(e, { dn: o.dn, od: o.od, t: o.t, cins: x.cins, sinif: o.sinif, mat: o.c.mat, label: C.boruLabel ? C.boruLabel(o) : e.label }); } }); }
        else if (e.type === 'fit3') { const o = olcu(e.cins || x.cins, e.sinif || x.sinif, PLAST.has(e.cins) ? x.boy : x.dn); if (o && Math.round(+e.dn) !== o.dn) L.push({ e, ad: 'Ek parça (' + (e.kind || '') + ')', eski: 'DN' + e.dn, yeni: dnEtiket(e.cins, o.dn), uygula: () => Object.assign(e, { dn: o.dn, od: o.od, t: o.t }) }); }
        else if (e.type === 'valve') {
          const P = r.P, cek = e.kind === 'cekvalf', yk = cek ? 'cekvalf' : (P.vanaIz === 'kelebek' ? 'kelebek' : 'surgulu'), ya = cek ? P.vanaCek : (P.vanaIz === 'bicakli' ? 'bicakli' : undefined);
          const yeniAd = vanaAd({ kind: yk, alt: ya }), eskiAd = vanaAd(e);
          if (+e.dn !== x.dn || (k === 'basma' && (e.kind !== yk || (e.alt || undefined) !== ya))) L.push({ e, ad: 'Vana', eski: `${eskiAd} DN${e.dn}`, yeni: `${k === 'basma' ? yeniAd : eskiAd} DN${x.dn}`, uygula: () => { e.dn = x.dn; if (k === 'basma') { e.kind = yk; if (ya) e.alt = ya; else delete e.alt; if (e.tag && !cek) e.tag = yk === 'kelebek' ? 'KV' : ya === 'bicakli' ? 'BV' : 'SV'; } } });
        }
        else if (e.type === 'blk' && e.dn && +e.dn !== x.dn) {
          const def = (C.doc.blocks || {})[e.ref] || (C.blib && C.blib.cache[e.ref]) || {};
          const kardes = C.blib ? C.blib.all().find(d => d.id !== e.ref && grupAd(d.name) === grupAd(def.name) && (d.dn || (C.parseBlockName(d.name) || {}).dn) === x.dn) : null;
          const sema = !kardes && C.SCHEMA_TURLER && C.SCHEMA_TURLER.includes(e.tur) && String(e.ref).startsWith('SEMA_') ? C.schematicDef(e.tur, x.dn, e.view || 'plan') : null;
          L.push({ e, ad: `${e.tur || 'Blok'} (${def.name || e.ref})`, eski: 'DN' + e.dn, yeni: 'DN' + x.dn + (kardes ? ' — ' + kardes.name : sema ? ' — şematik' : ' — ölçekli (yaklaşık)'), uygula: () => {
            if (kardes) { C.useDef(kardes); e.ref = kardes.id; }
            else if (sema) { C.useDef(sema); e.ref = sema.id; }
            else { const f = x.dn / +e.dn; e.sx = (e.sx || 1) * f; e.sy = (e.sy || e.sx) * f; }
            e.dn = x.dn; } });
        }
      }
    }
    const pom = bagli('pompa').concat(pompalar().filter(e => !e.hk)).filter((e, i, a) => a.indexOf(e) === i);
    for (const e of pom) if (e.type === 'aile') { const q = C.aileDegerE ? C.aileDegerE(e) : {}; const Qn = Math.round(r.Qp * 100) / 100, Hn = Math.round(r.Hm * 100) / 100; if (Math.abs((q.Q || 0) - Qn) > 0.01 || Math.abs((q.H || 0) - Hn) > 0.01) L.push({ e, ad: 'Pompa (' + (e.ad || e.fam) + ')', eski: `Q ${f2(q.Q, 1)} l/s, H ${f2(q.H)} m`, yeni: `Q ${f2(Qn, 1)} l/s, H ${f2(Hn)} m`, uygula: () => { e.par = Object.assign({}, e.par || {}, { Q: Qn, H: Hn }); delete e._c; delete e._g; delete e._q; } }); }
    else if (e.type === 'pump') { if (Math.abs((+e.q || 0) - r.Qp) > 0.01 || Math.abs((+e.hm || 0) - r.Hm) > 0.01) L.push({ e, ad: 'Pompa (şema)', eski: `Q ${f2(e.q, 1)}, H ${f2(e.hm)}`, yeni: `Q ${f2(r.Qp, 1)}, H ${f2(r.Hm)}`, uygula: () => { e.q = Math.round(r.Qp * 100) / 100; e.hm = Math.round(r.Hm * 100) / 100; } }); }
    const ist = istasyonEnts();
    if (ist.length) {
      const y = r.P.yapi, pis = ist.filter(e => e.type === 'pump' || (e.type === 'aile' && e.hk === 'pompa')).length, hacimAz = y.Vact < r.V - 1e-6;
      if (pis !== r.Ntop || hacimAz) { L.push({ e: null, ad: 'Pompa istasyonu', eski: `${pis} pompa, hazne ${f2(y.Lw)}×${f2(y.Ww)} m (V ${f2(y.Vact)} m³)`, yeni: `${r.Ntop} pompa, hazne gerekli ${f2(r.V)} m³ — istasyon yeniden çizilir`, sonra: true, istasyon: true, uygula: () => { const o = y.o; C.remove(istasyonEnts()); istasyonCiz(o, false); } }); return { r, L, pom }; }
    }
    { const T = takimlar(), fark = r.Ntop - T.length;
      if (T.length && fark > 0) L.push({ e: null, ad: 'Pompa sayısı', eski: `${T.length} pompa takımı`, yeni: `${r.Ntop} (+${fark}) — son takım kopyalanır`, sonra: true, uygula: () => C.pompaTakimEkle(fark) });
      else if (T.length && fark < 0) L.push({ e: null, ad: 'Pompa sayısı', eski: `${T.length} pompa takımı`, yeni: `${r.Ntop} (${fark}) — sondaki takımlar silinir`, sonra: true, kapali: true, uygula: () => C.pompaTakimSil(-fark) }); }
    return { r, L, pom };
  };
  C.addCommand(['HESAPGUNCELLE', 'PROJEGUNCELLE'], 'Proje hesabına göre çizimi günceller: kaleme bağlı boruların çapı, uçlarındaki vana ve ek parçalar, pompaların Q-H değerleri. Önce değişiklik listesi gösterilir.', async () => {
    komsulariBagla();
    const { r, L, pom } = degisiklikler();
    const bos = ['basma', 'kollektor', 'iletim', 'pompa'].filter(k => !bagli(k).length);
    const uy = !pom.length && r.Ntop ? `<p style="color:#e65100">⚠ Çizimde pompa yok — bir pompa ve basma borusunu çizip kaleme bağlayın; diğer takımlar ondan kopyalanır.</p>` : '';
    const b = C.modal('Hesaptan güncelle', `${L.length ? `<table class="bom" style="font-size:12.5px"><thead><tr><th><input type="checkbox" id="hgHep" checked></th><th>Eleman</th><th>Şimdi</th><th>Hesaba göre</th></tr></thead><tbody>${L.map((x, i) => `<tr><td><input type="checkbox" data-i="${i}" ${x.kapali ? '' : 'checked'}></td><td>${esc(x.ad)}</td><td>${esc(x.eski)}</td><td><b>${esc(x.yeni)}</b></td></tr>`).join('')}</tbody></table>` : '<p>Çizim hesapla uyumlu — değiştirilecek eleman yok.</p>'}
      ${uy}${bos.length ? `<p class="hint">Bağlı elemanı olmayan kalemler: ${bos.map(k => KALEM[k]).join(', ')} — HESAPBAGLA ile bağlayın.</p>` : ''}
      <p class="hint">Qp = ${f2(r.Qp, 1)} l/s · Hm = ${f2(r.Hm)} m · basma ${r.basma ? dnEtiket(r.basma.cins, r.basma.boy) : '—'} · kollektör ${r.kollektor ? dnEtiket(r.kollektor.cins, r.kollektor.boy) : '—'} · iletim ${r.iletim ? dnEtiket(r.iletim.cins, r.iletim.boy) : '—'}</p>
      <div class="bar" style="justify-content:flex-end"><button id="hgNo">Vazgeç</button>${L.length ? '<button id="hgOk" class="pri">Seçilenleri uygula</button>' : ''}</div>`);
    const hep = b.querySelector('#hgHep'); if (hep) hep.onchange = () => b.querySelectorAll('[data-i]').forEach(c => c.checked = hep.checked);
    b.querySelector('#hgNo').onclick = () => C.closeModal();
    const ok = b.querySelector('#hgOk'); if (ok) ok.onclick = () => { let n = 0; let sec = [...b.querySelectorAll('[data-i]')].filter(c => c.checked).map(c => L[+c.dataset.i]); if (sec.some(x => x.istasyon)) { const ids = new Set(istasyonEnts().map(e => e.id)); sec = sec.filter(x => x.istasyon || !x.e || !ids.has(x.e.id)); } for (const x of sec.filter(x => !x.sonra).concat(sec.filter(x => x.sonra))) { try { x.uygula(); n++; } catch (er) { console.error(er); } } C.closeModal(); C.changed(); C.log(`Hesaptan güncellendi: ${n} eleman.`); };
  });

  /* ---------- istasyonu hesaptan çiz (POMPAISTASYONU üreteci: ıslak hazne hacme göre, vana odası, pompalar, basma, vanalar, kollektör, kesit) ---------- */
  C.addCommand(['PROJEISTASYON', 'ISTASYONCIZ'], 'Proje hesabından pompa istasyonunu çizer: ıslak hazne gerekli hacme göre boyutlanır; pompa sayısı, basma / kollektör çapları ve seçilen vana tipleri hesaptan alınır, elemanlar kalemlere bağlı gelir.', async (I) => {
    const r = C.projeHesapla(), P = r.P; if (!C.pumpStation) { C.warn('İstasyon üreteci (gen.js) yüklü değil.'); return; }
    const o = await I.pt('Islak hazne iç sol-alt köşesi', { def: [0, 0, 0] }) || [0, 0, 0]; if (typeof o === 'string') return;
    istasyonCiz(o, true);
  });
  const istasyonCiz = (o, ilk) => {
    const r = C.projeHesapla(), P = r.P;
    if (P.cizim !== '2b' && C.istasyon3B) {
      if (!r.basma || !r.kollektor) { C.warn('Basma / kollektör çapı hesaplanamadı — proje hesabını kontrol edin.'); return null; }
      const st = C.istasyon3B(o, r);
      P.yapi = { tip: '3b', Lw: st.Lw, Ww: st.Ww, Wv: st.Wv, H: st.H, Vact: st.Vact, Vreq: st.Vreq, zFloor: st.zFloor, zStart: st.zStart, zStop: st.zStop, o: [o[0], o[1], 0], ids: st.ents.map(e => e.id), N: r.Ntop, zt: st.zt, zv: st.zv, zR: st.zR, tw: st.tw, tr: st.tr, ts: st.ts, y1: st.y1, yK: st.yK, xs: st.xs, yr: st.yr, s: st.s, DNp: st.DNp, DNh: st.DNh, pompa: st.pompa, kapak: st.kapak, kTip: st.kTip };
      C.changed(); if (ilk && C.setView) C.setView('3d'); C.emit && C.emit('zoomExtents');
      C.log(`3B istasyon: ıslak hazne ${M.fmt(st.Lw)} × ${M.fmt(st.Ww)} m (derinlik ${M.fmt(st.H)} m, faydalı hacim ${M.fmt(st.Vact, 2)} m³ ≥ gerekli ${M.fmt(st.Vreq, 2)}), vana odası ${M.fmt(st.Lw)} × ${M.fmt(st.Wv)} m; ${r.Ntop} pompa (${st.pompa ? (C.AILELER[st.pompa] || {}).ad : 'şematik'}), basma DN${st.DNp}, kollektör DN${st.DNh}; ${VCEK[P.vanaCek]} + ${VIZ[P.vanaIz]}. Perde / radye / döşeme gerçek yapı elemanıdır (statik, metraj, kesit).`);
      return st;
    }
    const st = C.pumpStation(o, { Q: P.Q, N: r.Ntop, NASIL: P.Nasil, Z: P.Z, ZG: P.ZG, ZIN: P.ZIN, DIN: P.DIN, HEFF: P.HEFF, HM: +r.Hm.toFixed(2), VREQ: r.V, DNP: r.basma ? r.basma.dn : null, DNH: r.kollektor ? r.kollektor.dn : null, VKC: P.vanaCek, VKI: P.vanaIz, HK: true, AD: P.ad || 'POMPA İSTASYONU', DMAT: String((r.basma || {}).cins || 'DUKTIL').toUpperCase(), PAFTA: !!ilk });
    P.yapi = { Lw: st.Lw, Ww: st.Ww, H: st.H, Vact: st.Vact, Vreq: st.Vreq, zFloor: st.zFloor, zStart: st.zStart, zStop: st.zStop, o: [o[0], o[1], 0], ids: st.ents.map(e => e.id), N: r.Ntop };
    C.changed(); C.emit && C.emit('zoomExtents');
    C.log(`İstasyon çizildi: ıslak hazne ${M.fmt(st.Lw)} × ${M.fmt(st.Ww)} m, derinlik ${M.fmt(st.H)} m, faydalı hacim ${M.fmt(st.Vact, 2)} m³ (gerekli ${M.fmt(st.Vreq, 2)}); ${r.Ntop} pompa (${P.Nasil} asil + ${P.Nyedek} yedek), basma DN${st.DNp}, kollektör DN${st.DNh}; ${VCEK[P.vanaCek]} + ${VIZ[P.vanaIz]}.`);
    return st;
  };
  C.projeIstasyonCiz = istasyonCiz;
  const istasyonEnts = () => { const y = PH().yapi; if (!y || !y.ids) return []; const s = new Set(y.ids); return C.doc.ents.filter(e => s.has(e.id)); };
  if (C.bom && !C.bom._vanaAlt) { // malzeme listesinde vana alt tipleri (tilting çekvalf, bıçaklı vana …) ayrı satır
    const bom0 = C.bom;
    C.bom = function (ents) {
      const alt = (ents || []).filter(e => e.type === 'valve' && e.alt), rows = bom0((ents || []).filter(e => !(e.type === 'valve' && e.alt))), m = new Map();
      for (const e of alt) { const ad = vanaAd(e), k = ad + '|' + e.dn; const r0 = m.get(k) || { mal: ad, dn: e.dn, q: 0, unit: 'adet' }; r0.q++; m.set(k, r0); }
      return rows.concat([...m.values()]).sort((a, b) => a.mal.localeCompare(b.mal, 'tr') || (a.dn || 0) - (b.dn || 0)).map((x, i) => Object.assign({}, x, { poz: i + 1 }));
    };
    C.bom._vanaAlt = true;
  }

  /* ---------- proje raporu ---------- */
  C.projeRapor = () => {
    const r = C.projeHesapla(), P = r.P, bugun = new Date().toLocaleDateString('tr-TR');
    const pom = pompalar().map(e => { if (e.type !== 'aile') return null; const q = C.aileDegerE(e), d = C.AILELER[e.fam] || {}; let liste = ''; try { liste = d.liste ? d.liste(q) : ''; } catch (er) { } let calis = null; try { if (q.foyNo && C.pompaFoyCalisma) calis = C.pompaFoyCalisma(q.foyNo, q.Q, q.H); } catch (er) { } return { e, q, liste, calis }; }).filter(Boolean);
    const bom = C.bom ? C.bom(C.doc.ents) : [];
    const kalemSat = k => { const x = r[k]; if (!x) return ''; return `<tr><td>${KALEM[k]}</td><td>${f2(x.q, 1)}</td><td>${dnEtiket(x.cins, x.boy)} ${esc(x.cins.toUpperCase())} ${esc(x.sinif)}</td><td>${f2(x.id, 1)}</td><td>${f2(x.v)}</td><td>${f2(x.L, 1)}</td><td>${x.C}</td><td>${f2(x.hf, 3)}</td><td>${f2(P[k].k, 1)}</td><td>${f2(x.hm, 3)}</td></tr>`; };
    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>Hesap raporu — ${esc(P.ad || 'Pompa istasyonu')}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#111;max-width:180mm;margin:12mm auto;line-height:1.45}h1{font-size:16pt;margin:0 0 4mm}h2{font-size:12.5pt;margin:7mm 0 2mm;border-bottom:1px solid #999;padding-bottom:1mm}table{border-collapse:collapse;width:100%;margin:2mm 0;font-size:10pt}th,td{border:1px solid #888;padding:3px 5px;text-align:left;vertical-align:top}th{background:#eef1f4}.f{font-family:Cambria,'Times New Roman',serif;font-style:italic}.k{color:#555;font-size:9.5pt}.uy{color:#b45309}@media print{.np{display:none}}</style></head><body>
<div class="np" style="margin-bottom:6mm"><button onclick="print()">Yazdır / PDF</button> <button id="doc">Word (.doc) olarak kaydet</button></div>
<h1>${esc(P.ad || 'Atıksu pompa istasyonu')} — hidrolik hesap raporu</h1><div class="k">Tarih: ${bugun} · ArıtmaCAD proje hesabı</div>
<h2>1. Tasarım verileri</h2><table><tr><th>Büyüklük</th><th>Değer</th></tr><tr><td>Tasarım debisi Q</td><td>${f2(P.Q, 1)} l/s (${f2(P.Q * 3.6, 1)} m³/h)</td></tr><tr><td>En küçük debi Qmin</td><td>${f2(P.Qmin, 1)} l/s</td></tr>
<tr><td>Pompa sayısı</td><td>${r.Ntop} adet (${P.Nasil} asil + ${P.Nyedek} yedek)</td></tr><tr><td>Hazne en düşük su kotu</td><td>${f2(P.zMin)} m</td></tr><tr><td>Deşarj kotu</td><td>${f2(P.zDes)} m</td></tr><tr><td>Saatlik kalkış sayısı Z</td><td>${P.Z}</td></tr></table>
<h2>2. Pompa debisi ve geometrik yükseklik</h2><p><span class="f">Q<sub>p</sub> = Q / N<sub>asil</sub></span> = ${f2(P.Q, 1)} / ${P.Nasil} = <b>${f2(r.Qp, 2)} l/s</b> (${f2(r.Qp * 3.6, 1)} m³/h)</p>
<p><span class="f">H<sub>geo</sub> = z<sub>deşarj</sub> − z<sub>min</sub></span> = ${f2(P.zDes)} − (${f2(P.zMin)}) = <b>${f2(r.Hgeo)} m</b></p>
<h2>3. Boru çapları, hızlar ve yük kayıpları</h2><p class="k">Çap: v ≤ v<sub>maks</sub> ve DN ≥ DN<sub>min</sub> sağlayan en küçük standart çap (iç çap boru cinsi ve sınıfına göre). Sürtünme kaybı Hazen-Williams: <span class="f">h<sub>f</sub> = 10,67·L·Q<sup>1,852</sup> / (C<sup>1,852</sup>·D<sup>4,87</sup>)</span>; yerel kayıp <span class="f">h<sub>m</sub> = Σk·v²/2g</span>.</p>
<table><tr><th>Kalem</th><th>Q l/s</th><th>Boru</th><th>İç Ø mm</th><th>v m/s</th><th>L m</th><th>C</th><th>h<sub>f</sub> m</th><th>Σk</th><th>h<sub>m</sub> m</th></tr>${['basma', 'kollektor', 'iletim'].map(kalemSat).join('')}</table>
${['basma', 'kollektor', 'iletim'].filter(k => r[k] && r[k].uyar).map(k => `<p class="uy">⚠ ${KALEM[k]}: ${esc(r[k].uyar)}</p>`).join('')}
<h2>4. Manometrik yükseklik ve motor gücü</h2><p><span class="f">H<sub>m</sub> = H<sub>geo</sub> + Σ(h<sub>f</sub> + h<sub>m</sub>)</span> = ${f2(r.Hgeo)} + ${f2(r.kayip)} = <b>${f2(r.Hm)} m</b></p>
<p><span class="f">P<sub>h</sub> = ρ·g·Q<sub>p</sub>·H<sub>m</sub></span> = 1000 × 9,81 × ${f2(r.Qp / 1000, 4)} × ${f2(r.Hm)} / 1000 = ${f2(r.Ph)} kW · <span class="f">P<sub>2</sub> ≥ P<sub>h</sub> / η × 1,10</span> = ${f2(r.P2g)} kW → <b>${f2(r.P2, 1)} kW</b> standart motor (η = %${P.eta})</p>
<h2>5. Islak hazne faydalı hacmi ve boyutları</h2><p><span class="f">V = T·Q<sub>p</sub>/4 = 900·Q<sub>p</sub>/Z</span> = 900 × ${f2(r.Qp / 1000, 4)} / ${P.Z} = <b>${f2(r.V)} m³</b> (devreye girme – durma seviyeleri arası)</p>
${P.yapi ? `<table><tr><th>Büyüklük</th><th>Değer</th></tr><tr><td>Islak hazne iç ölçüleri</td><td>${f2(P.yapi.Lw)} × ${f2(P.yapi.Ww)} m</td></tr><tr><td>Faydalı (çalışma) yüksekliği</td><td>${f2(P.HEFF)} m</td></tr><tr><td>Sağlanan faydalı hacim</td><td><b>${f2(P.yapi.Vact)} m³</b> ${P.yapi.Vact >= r.V - 1e-6 ? '≥' : '<'} gerekli ${f2(r.V)} m³</td></tr><tr><td>Hazne derinliği (döşeme üstü – taban)</td><td>${f2(P.yapi.H)} m</td></tr>${P.yapi.Wv ? `<tr><td>Vana odası iç ölçüleri</td><td>${f2(P.yapi.Lw)} × ${f2(P.yapi.Wv)} m</td></tr>` : ''}<tr><td>Kotlar</td><td>zemin ${f2(P.ZG)} · giriş borusu alt kotu ${f2(P.ZIN)} · kalkış ${f2(P.yapi.zStart)} · durma ${f2(P.yapi.zStop)} · taban ${f2(P.yapi.zFloor)} m</td></tr></table>` : '<p class="k">İstasyon henüz çizilmedi (Proje hesabı → İstasyonu çiz).</p>'}
<h3 style="font-size:11pt">Vana seçimi</h3><p>Her pompa basma hattında: <b>${VCEK[P.vanaCek]}</b> + <b>${VIZ[P.vanaIz]}</b>, DN${r.basma ? r.basma.dn : '—'}.</p>
<h2>6. Seçilen pompalar</h2>${pom.length ? `<table><tr><th>#</th><th>Pompa</th><th>Çalışma noktası kontrolü (föy eğrisi)</th></tr>${pom.map((x, i) => `<tr><td>P-${i + 1}</td><td>${esc(x.liste || x.e.ad)}</td><td>${x.calis ? `Q ${f2(x.q.Q, 1)} l/s'de pompa H = ${f2(x.calis.Hq)} m ${x.calis.Hq >= x.q.H ? '≥' : '<'} gerekli ${f2(x.q.H)} m${x.calis.eta ? `, η ≈ %${f2(x.calis.eta, 0)}` : ''}` : 'föy eğrisi yok — üretici eğrisinden doğrulanmalı'}</td></tr>`).join('')}</table>` : '<p class="k">Çizimde pompa ailesi yok.</p>'}
${r.cizimPompa && r.cizimPompa !== r.Ntop ? `<p class="uy">⚠ Çizimde ${r.cizimPompa} pompa var; hesap ${r.Ntop} pompa öngörüyor.</p>` : ''}
<h2>7. Malzeme listesi (çizimden)</h2>${bom.length ? `<table><tr><th>Poz</th><th>Malzeme</th><th>DN</th><th>Miktar</th><th>Birim</th></tr>${bom.map(x => `<tr><td>${x.poz}</td><td>${esc(x.mal)}</td><td>${x.dn || ''}</td><td>${x.unit === 'm' ? f2(x.q, 1) : x.q}</td><td>${x.unit}</td></tr>`).join('')}</table>` : '<p class="k">Çizimde listelenecek malzeme yok.</p>'}
<script>document.getElementById('doc').onclick=function(){var h='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">'+document.head.innerHTML+'</head><body>'+document.body.innerHTML.replace(/<div class="np"[\\s\\S]*?<\\/div>/,'').replace(/<script[\\s\\S]*?<\\/script>/g,'')+'</body></html>';var a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\\ufeff'+h],{type:'application/msword'}));a.download='Hesap_raporu.doc';document.body.appendChild(a);a.click();a.remove();};<\/script></body></html>`;
    const w = window.open('', 'proje_rapor'); if (!w) { C.download(html, 'Hesap_raporu.html', 'text/html'); C.warn('Açılır pencere engellendi — rapor HTML olarak indirildi.'); return html; }
    w.document.open(); w.document.write(html); w.document.close(); C.log('Proje hesap raporu açıldı (yazdır / PDF / Word).'); return html;
  };
  C.addCommand(['PROJEHESAP', 'PROJEHESABI', 'HESAPMERKEZI'], 'Proje hesap merkezi: tasarım debisi, asil / yedek pompa, kotlar, boru hız sınırları → boru çapları, Hm, motor gücü, ıslak hazne hacmi; kalemlere bağlama, hesaptan güncelleme, rapor.', () => C.projeHesapPencere(), { noUndo: true });
  C.addCommand(['PROJERAPOR', 'HESAPRAPORU'], 'Proje hidrolik hesap raporu (yazdır / PDF / Word)', () => { C.projeRapor(); }, { noUndo: true });

  /* ---------- şerit: Hesap sekmesi ---------- */
  try {
    const R = C.ribbon; const ekle = () => { const tab = R && R.tabs && R.tabs.find(t => t[0] === 'Hesap'); if (tab && !tab[1].some(p => p[0] === 'Proje')) tab[1].unshift(['Proje', [{ cmd: 'PROJEHESAP', t: 'Proje hesabı', i: 'calc', big: true }, { cmd: 'HESAPBAGLA', t: 'Kaleme bağla', i: 'pipe' }, { cmd: 'HESAPGUNCELLE', t: 'Hesaptan güncelle', i: 'rot' }, { cmd: 'PROJERAPOR', t: 'Proje raporu', i: 'table' }]]); };
    if (R) { const r0 = R.render; if (!R._projeHesap) { R.render = function () { try { ekle(); } catch (er) { } return r0.apply(this, arguments); }; R._projeHesap = true; } R.render(); }
  } catch (er) { console.error('proje hesap şerit', er); }
})(window.C);

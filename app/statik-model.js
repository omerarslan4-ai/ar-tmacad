/* ArıtmaCAD — STATİK ↔ MODEL bağlantısı (ayrı modül; statik.js'e dokunmaz)
   STATIKMODEL  : modeldeki perde + radye (+ üst döşeme) geometrisini statik hesap penceresine gönderir
                  (seçim varsa yalnız seçili nesneler, yoksa tüm görünür perde / radye / döşeme)
   STATIKDONATI : statik hesaptan gelen donatıyı modeldeki beton içine 3B çubuk olarak yerleştirir
                  (katman STA_DONATI_3B — yalnız 3B "Statik" disiplin görünümünde görünür, plan ve kesitlerde çizilmez)
   STATIKDONATISIL : modeldeki 3B donatıyı siler */
(function (C) {
  'use strict';
  const K_MODEL = 'aritmacad.statik.model', K_ISTEK = 'aritmacad.statik.modelIstek', K_DON = 'aritmacad.statik.donati';
  const LY = 'STA_DONATI_3B', T = C.T, M = C.M, r3 = v => Math.round(v * 1000) / 1000;

  /* ---------- perde eksenleri (insaat.js faceOffs ile aynı hesap) ---------- */
  const eksenler = e => {
    const I = C._ins; if (!I || !I.faceOffs || !I.segFrames) return [];
    const F = I.faceOffs(e), c = (F.lB + F.rB) / 2, out = [];
    for (const sf of I.segFrames(e)) {
      const a = [sf.a[0] + sf.nn[0] * c, sf.a[1] + sf.nn[1] * c], b = [sf.b[0] + sf.nn[0] * c, sf.b[1] + sf.nn[1] * c];
      const yatay = Math.abs(sf.u[1]) < 0.02, dusey = Math.abs(sf.u[0]) < 0.02;
      out.push({ e, a, b, t: F.tb, no: (Array.isArray(e.noK) && e.noK[sf.i]) || e.no || null, yon: yatay ? 'X' : dusey ? 'Y' : null, z0: +e.z0 || 0, zt: (+e.z0 || 0) + (+e.h || 3) });
    }
    return out;
  };

  const modelOku = C._statikModelOku = (tum) => {
    const vis = e => C.layer(e.layer).on && !(typeof e.gv === 'string');
    let ents = (!tum && C.sel && C.sel.length ? C.sel : C.doc.ents).filter(vis);
    const perdeler = ents.filter(e => e.type === 'perde' && (e.malz || 'beton') === 'beton' && !e.temel && !e.parapet); // parapet perde sayılmaz (döşemenin üstündedir)
    const radyeler = C.doc.ents.filter(vis).filter(e => e.type === 'plak' && e.kind === 'radye'); // seçimden bağımsız
    if (!perdeler.length) throw new Error('Modelde betonarme perde bulunamadı.');
    const uyar = [];
    // kapalı / çok parçalı perdelerde her kenar ayrı ad (uzunlar önce): numarası olup kenar adı olmayanlara ver
    if (C.elemanNumarala && perdeler.some(e => e.no && !Array.isArray(e.noK) && C.perdeKenarlari && C.perdeKenarlari(e).length > 1)) { C.elemanNumarala(['perde'], false); C.changed(); }
    // perde ayağı (kicker, temelle birlikte dökülen alt parça) ayrı perde sayılmaz: ana perdenin alt kotu ona uzatılır (aksi halde aynı hat iki kez sayılıyordu)
    const kick = perdeler.filter(e => e.kicker), anaP = perdeler.filter(e => !e.kicker).map(e => { const k = kick.find(x => x.kOf === e.id); if (!k) return e; const z0 = Math.min(+e.z0 || 0, +k.z0 || 0); return Object.assign({}, e, { z0, h: (+e.z0 || 0) + (+e.h || 3) - z0 }); });
    let seg = anaP.flatMap(eksenler);
    // askıdaki perdeler: radyeye oturmayıp ara döşeme / kolon üzerinde başlayan perdeler su yapısı (hazne) modeline girmez
    const radUst = radyeler.length ? Math.max(...radyeler.map(r => +r.zt || 0)) : null, askiPerde = [];
    let seg0Aski = [];
    if (radUst != null) { const aski = seg.filter(s => s.z0 > radUst + 0.3); seg0Aski = aski; if (aski.length) { seg = seg.filter(s => !aski.includes(s));
      aski.forEach(s => { askiPerde.push({ no: s.no, a: s.a.map(r3), b: s.b.map(r3), t: r3(s.t), z0: r3(s.z0), zt: r3(s.zt) }); uyar.push(`ASKIDA PERDE ${s.no || ''} (${r3(Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]))} m, t=${Math.round(s.t * 100)} cm, kot ${r3(s.z0)} → ${r3(s.zt)}): radyeye oturmuyor, ara döşeme / kolon üzerinde. Hazne hesabına alınmadı; döşeme üstünde, tabanı döşemeye ankastre ayrı perde olarak hesaplanacak. Perde ağırlığı ve su itkisinin döşeme / kolonlara aktarımı ayrıca kontrol edilmeli.`); }); } }
    const askiSeg = seg0Aski;
    const egik = seg.filter(s => !s.yon); if (egik.length) uyar.push(egik.length + ' eğik perde parçası hesaba katılmadı (yalnız X / Y doğrultulu perdeler).');
    seg = seg.filter(s => s.yon);
    const sx = seg.filter(s => s.yon === 'X'), sy = seg.filter(s => s.yon === 'Y');
    if (!sx.length || !sy.length) throw new Error('Kapalı bir hazne için X ve Y doğrultusunda perde gerekli.');
    const yS = Math.min(...sx.map(s => s.a[1])), yN = Math.max(...sx.map(s => s.a[1])), xW = Math.min(...sy.map(s => s.a[0])), xE = Math.max(...sy.map(s => s.a[0]));
    const tol = 0.05, dis = s => (s.yon === 'X' && (Math.abs(s.a[1] - yS) < tol || Math.abs(s.a[1] - yN) < tol)) || (s.yon === 'Y' && (Math.abs(s.a[0] - xW) < tol || Math.abs(s.a[0] - xE) < tol));
    const dS = seg.filter(dis), iS = seg.filter(s => !dis(s));
    const tw = Math.max(...dS.map(s => s.t)), ti = iS.length ? Math.max(...iS.map(s => s.t)) : 0.30;
    if (dS.some(s => Math.abs(s.t - tw) > 0.005)) uyar.push('Dış perdelerin kalınlıkları farklı: en büyüğü (' + Math.round(tw * 100) + ' cm) alındı.');
    const X0 = xW - tw / 2, Y0 = yS - tw / 2, Lx = xE - xW + tw, Ly = yN - yS + tw;
    // ara perdeler (eksen değeri tekilleştirilir; kısa olanlar uyarılır)
    const tek = (arr, k, L0, Lt) => { const m = new Map(); for (const s of arr) { const v = r3(s.a[k] - (k ? Y0 : X0)); const key = [...m.keys()].find(q => Math.abs(q - v) < tol); const ln = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]); const o = m.get(key != null ? key : v) || { v, L: 0, no: [] }; o.L += ln; if (s.no && !o.no.includes(s.no)) o.no.push(s.no); m.set(key != null ? key : v, o); } const out = [...m.values()].sort((a, b) => a.v - b.v); out.forEach(o => { o.kisa = o.L < 0.8 * (Lt - 2 * tw); }); return out; };
    const bX0 = tek(iS.filter(s => s.yon === 'Y'), 0, X0, Ly), bY0 = tek(iS.filter(s => s.yon === 'X'), 1, Y0, Lx);
    const bX = bX0.filter(o => !o.kisa), bY = bY0.filter(o => !o.kisa);
    // kısa iç perdeler: boydan boya gitmeyen (bölme oluşturmayan) perdeler ayrı eleman — gerçek uçlar ve uç bağlantıları
    const kisaPerde = [];
    for (const [liste, yon, k] of [[bX0, 'Y', 0], [bY0, 'X', 1]]) for (const o of liste.filter(q => q.kisa)) {
      const ss = iS.filter(s => s.yon === yon && Math.abs(s.a[k] - (k ? Y0 : X0) - o.v) < tol), j = 1 - k, us = ss.flatMap(s => [s.a[j], s.b[j]]), u0 = Math.min(...us), u1 = Math.max(...us), t = Math.max(...ss.map(s => s.t));
      const eks = (k ? Y0 : X0) + o.v, uc = u => (k ? [u, eks] : [eks, u]), diger = seg.filter(s => !ss.includes(s) && s.yon !== yon);
      const bag = u => { const P0 = uc(u); return diger.find(s => { const kk = s.yon === 'X' ? 1 : 0, jj = 1 - kk, lo = Math.min(s.a[jj], s.b[jj]) - s.t / 2 - 0.02, hi = Math.max(s.a[jj], s.b[jj]) + s.t / 2 + 0.02; return Math.abs(P0[kk] - s.a[kk]) <= s.t / 2 + 0.05 && P0[jj] >= lo && P0[jj] <= hi; }); };
      const bA = bag(u0), bB = bag(u1), zt = Math.max(...ss.map(s => s.zt)), z0 = Math.min(...ss.map(s => s.z0)), j0 = k ? X0 : Y0;
      kisaPerde.push({ ad: o.no.join('/') || `Kısa perde ${yon}=${o.v}`, yon, v: o.v, a: r3(u0 - j0), b: r3(u1 - j0), t: r3(t), uA: bA ? 'bagli' : 'serbest', uB: bB ? 'bagli' : 'serbest', tA: bA ? r3(bA.t) : 0, tB: bB ? r3(bB.t) : 0, z0: r3(z0), zt: r3(zt) });
      uyar.push(`Kısa perde ${o.no.join('/') || yon + '=' + o.v}: ${r3(u1 - u0)} m, uçlar ${bA ? 'bağlı' : 'serbest'} / ${bB ? 'bağlı' : 'serbest'}, üst ${r3(zt)} — ayrı eleman olarak hesaplanacak.`);
    }
    // askıdaki perdeler → kısa perde kaydı (taban: oturduğu döşemenin üstü)
    for (const s of askiSeg) {
      if (!s.yon) continue; const k = s.yon === 'X' ? 1 : 0, j = 1 - k, eks = s.a[k], u0 = Math.min(s.a[j], s.b[j]), u1 = Math.max(s.a[j], s.b[j]), j0 = k ? X0 : Y0, uc = u => (k ? [u, eks] : [eks, u]);
      const bag = u => { const P0 = uc(u); return seg.find(q => q.yon !== s.yon && q.zt > s.z0 + 0.1 && (() => { const kk = q.yon === 'X' ? 1 : 0, jj = 1 - kk, lo = Math.min(q.a[jj], q.b[jj]) - q.t / 2 - 0.02, hi = Math.max(q.a[jj], q.b[jj]) + q.t / 2 + 0.02; return Math.abs(P0[kk] - q.a[kk]) <= q.t / 2 + 0.05 && P0[jj] >= lo && P0[jj] <= hi; })()); };
      const bA = bag(u0), bB = bag(u1), m = uc((u0 + u1) / 2), dos = C.doc.ents.filter(vis).find(e => e.type === 'plak' && e.kind !== 'radye' && Math.abs((+e.zt || 0) - s.z0) < 0.12 && Array.isArray(e.pts) && C.pointInPoly && (C.pointInPoly(m, e.pts) || C.pointInPoly([m[0] + (k ? 0 : s.t / 2 + 0.05), m[1] + (k ? s.t / 2 + 0.05 : 0)], e.pts) || C.pointInPoly([m[0] - (k ? 0 : s.t / 2 + 0.05), m[1] - (k ? s.t / 2 + 0.05 : 0)], e.pts)));
      kisaPerde.push({ ad: s.no || `Askı perde ${s.yon}=${r3(eks - (k ? Y0 : X0))}`, yon: s.yon, v: r3(eks - (k ? Y0 : X0)), a: r3(u0 - j0), b: r3(u1 - j0), t: r3(s.t), uA: bA ? 'bagli' : 'serbest', uB: bB ? 'bagli' : 'serbest', tA: bA ? r3(bA.t) : 0, tB: bB ? r3(bB.t) : 0, z0: r3(s.z0), zt: r3(s.zt), aski: true, tD: dos ? r3(+dos.t || 0.2) : 0.2 });
    }
    // kotlar
    const kUst = Math.max(...seg.map(s => s.zt));
    let kAlt, hr = 0.40, toe = 0.20, rad = null;
    if (radyeler.length) {
      const ust = radyeler.filter(r => { const xs = r.pts.map(p => p[0]), ys = r.pts.map(p => p[1]); return Math.min(...xs) < X0 + Lx && Math.max(...xs) > X0 && Math.min(...ys) < Y0 + Ly && Math.max(...ys) > Y0; });
      rad = (ust.length ? ust : radyeler).slice().sort((a, b) => Math.abs(M.polyArea(b.pts)) - Math.abs(M.polyArea(a.pts)))[0];
      hr = +rad.t || 0.4; kAlt = (+rad.zt || 0) - hr;
      const xs = rad.pts.map(p => p[0]), ys = rad.pts.map(p => p[1]);
      toe = Math.max(0, Math.min(X0 - Math.min(...xs), Math.max(...xs) - (X0 + Lx), Y0 - Math.min(...ys), Math.max(...ys) - (Y0 + Ly)));
      toe = r3(toe);
    } else { kAlt = Math.min(...seg.map(s => s.z0)) - hr; uyar.push('Radye bulunamadı: kalınlık 40 cm, perde altından başladığı kabul edildi.'); }
    // perde adları (eleman numaraları)
    const adOf = f => { const ns = [...new Set(dS.filter(f).map(s => s.no).filter(Boolean))]; return ns.length ? ns.join('/') : null; };
    const perdeAd = { S: adOf(s => s.yon === 'X' && Math.abs(s.a[1] - yS) < tol), N: adOf(s => s.yon === 'X' && Math.abs(s.a[1] - yN) < tol), W: adOf(s => s.yon === 'Y' && Math.abs(s.a[0] - xW) < tol), E: adOf(s => s.yon === 'Y' && Math.abs(s.a[0] - xE) < tol), X: bX.map(o => o.no.join('/') || null), Y: bY.map(o => o.no.join('/') || null) };
    // üst döşemeler: IDOSEME / ICATI (plak) ve eski DOSEME (slab); seçimden bağımsız, yapının üstünde olanlar
    const doseme = [], aday = C.doc.ents.filter(vis).filter(e => (e.type === 'plak' && e.kind !== 'radye') || e.type === 'slab');
    let kUstD = kUst; const atla = [];
    aday.forEach(e => {
      const t = +e.t || 0.15, zt = e.type === 'slab' ? (+e.z || 0) + t : (+e.zt || 0), ad = e.no || 'D' + (doseme.length + 1);
      const xs = e.pts.map(p => p[0] - X0), ys = e.pts.map(p => p[1] - Y0), x0 = Math.max(0, Math.min(...xs)), y0 = Math.max(0, Math.min(...ys)), x1 = Math.min(Lx, Math.max(...xs)), y1 = Math.min(Ly, Math.max(...ys));
      if (x1 - x0 < 0.2 || y1 - y0 < 0.2) return; // yapının dışında
      if (zt < kAlt + hr + 0.3) return; // radye / temel seviyesinde
      const fark = zt - kUst;
      if (Math.abs(fark) <= 0.05) { /* perde üst kotunda */ }
      else if (fark > 0 && Math.abs(zt - t - kUst) <= 0.05) { kUstD = Math.max(kUstD, zt); uyar.push(`${ad}: döşeme perdelerin üstüne oturuyor (alt kot ${r3(zt - t)}); perde yüksekliği döşeme üst kotuna (${r3(zt)}) kadar alındı.`); }
      else if (fark < 0 && fark > -1.0) uyar.push(`${ad}: döşeme üst kotu (${r3(zt)}) perde üstünden ${Math.round(-fark * 100)} cm aşağıda; statik modelde perde üst kotunda kabul edildi.`);
      else { atla.push(`${ad} (üst kot ${r3(zt)})`); return; }
      if (Math.abs(M.polyArea(e.pts)) < 0.95 * (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))) uyar.push(`${ad}: dikdörtgen olmayan döşeme, çevreleyen dikdörtgen alındı.`);
      // düşey boşluklar (İT/ÇEK, BOSLUK): planda çokgen, yapı köşesine göre; boydan boya olanlar delik, olmayanlar cep
      const delik = (Array.isArray(e.bosluk3) ? e.bosluk3 : []).filter(b => b && Array.isArray(b.pts) && b.pts.length >= 3 && Array.isArray(b.d) && Math.abs(b.d[2] || 0) > 0.7 * Math.hypot(b.d[0] || 0, b.d[1] || 0, b.d[2] || 0))
        .map(b => ({ pts: b.pts.map(q => [r3(q[0] - X0), r3(q[1] - Y0)]), tam: Math.abs(b.d[2]) >= t - 0.02 }));
      // döşemeyi bir kenardan öbürüne kesen boşluk döşemeyi böler: parçalar ayrı döşeme, boşluk kenarı serbest kenar
      const bb = q => { const xs = q.pts.map(v => v[0]), ys = q.pts.map(v => v[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
      const bolenler = [], parcala = (r, hs) => { for (const h of hs) { if (!h.tam) continue; const k = bb(h), ic = hs.filter(q => q !== h);
          if (k[0] <= r.x0 + 0.05 && k[2] >= r.x1 - 0.05 && k[1] < r.y1 - 0.05 && k[3] > r.y0 + 0.05) { bolenler.push(h); return [...parcala({ x0: r.x0, x1: r.x1, y0: r.y0, y1: Math.min(r.y1, k[1]) }, ic), ...parcala({ x0: r.x0, x1: r.x1, y0: Math.max(r.y0, k[3]), y1: r.y1 }, ic)]; }
          if (k[1] <= r.y0 + 0.05 && k[3] >= r.y1 - 0.05 && k[0] < r.x1 - 0.05 && k[2] > r.x0 + 0.05) { bolenler.push(h); return [...parcala({ y0: r.y0, y1: r.y1, x0: r.x0, x1: Math.min(r.x1, k[0]) }, ic), ...parcala({ y0: r.y0, y1: r.y1, x0: Math.max(r.x0, k[2]), x1: r.x1 }, ic)]; } }
        return r.x1 - r.x0 >= 0.3 && r.y1 - r.y0 >= 0.3 ? [r] : []; };
      const parcalar = parcala({ x0, y0, x1, y1 }, delik);
      parcalar.forEach((r, i) => { const icer = delik.filter(h => !bolenler.includes(h)).filter(h => { const k = bb(h), cx = (k[0] + k[2]) / 2, cy = (k[1] + k[3]) / 2; return cx > r.x0 && cx < r.x1 && cy > r.y0 && cy < r.y1; }), komsu = bolenler.filter(h => { const k = bb(h); return k[0] < r.x1 + 0.02 && k[2] > r.x0 - 0.02 && k[1] < r.y1 + 0.02 && k[3] > r.y0 - 0.02; }).map(h => Object.assign({}, h, { bolen: true }));
        const dl = [...icer, ...komsu], ad2 = parcalar.length > 1 ? `${ad}-${i + 1}` : ad;
        doseme.push({ x0: r3(r.x0), y0: r3(r.y0), x1: r3(r.x1), y1: r3(r.y1), t, g: 1.5, q: 5.0, ad: ad2, id: e.id, ...(dl.length ? { delik: dl } : {}) }); });
      if (bolenler.length) uyar.push(`${ad}: ${bolenler.length} boşluk döşemeyi kenardan kenara kesiyor; döşeme ${parcalar.length} ayrı döşeme (${parcalar.map((r, i) => `${ad}-${i + 1}`).join(', ')}) olarak hesaplandı, boşluk kenarları serbest kenar.`);
      if (delik.length) uyar.push(`${ad}: ${delik.length} boşluk okundu${delik.some(b => !b.tam) ? ' (boydan boya olmayanlar cep olarak gösterilir)' : ''}.`);
    });
    if (atla.length) uyar.push(`ARA DÖŞEME(LER): ${atla.join(', ')} — perde üst kotunda değil, hazne hesabına alınmadı; Kiriş / Kolon / Döşeme hesabında tasarlanır (taşıdığı askıdaki perde ve su yükleri ayrıca kontrol edilmeli).`);
    if (!doseme.length && aday.length) uyar.push(`Modelde ${aday.length} döşeme var ama hiçbiri bu yapının üstünde değil (konum / kot uyuşmuyor).`);
    // perdelerdeki yatay boşluklar (boru geçişleri, İT/ÇEK delikleri): yapı köşesine göre merkez, boyut, doğrultu
    const perdeDelik = [];
    for (const e of perdeler) for (const b of (Array.isArray(e.bosluk3) ? e.bosluk3 : [])) {
      if (!b || b.pahIcin || !Array.isArray(b.pts) || b.pts.length < 3 || !Array.isArray(b.d)) continue; const dl = Math.hypot(b.d[0] || 0, b.d[1] || 0, b.d[2] || 0); if (!dl || Math.abs(b.d[2] || 0) > 0.7 * dl) continue;
      const n = b.pts.length, m = [0, 1, 2].map(k => b.pts.reduce((s2, q) => s2 + (q[k] || 0), 0) / n + (b.d[k] || 0) / 2), yon = Math.abs(b.d[0]) > Math.abs(b.d[1]) ? 'x' : 'y';
      const yatay = b.pts.map(q => yon === 'x' ? q[1] : q[0]), zs = b.pts.map(q => q[2] || 0), pe = b.boru != null && C.byId ? C.byId(b.boru) : null;
      const ad = pe ? `${pe.no || pe.hat || ''} DN${Math.round(+pe.dn || +pe.od || 0)}`.trim() : '';
      perdeDelik.push({ x: r3(m[0] - X0), y: r3(m[1] - Y0), z: r3(m[2]), w: r3(Math.max(...yatay) - Math.min(...yatay)), h: r3(Math.max(...zs) - Math.min(...zs)), yon, daire: n >= 12, boru: b.boru != null ? b.boru : null, ad, perde: e.no || null });
    }
    if (perdeDelik.length) uyar.push(`Perdelerde ${perdeDelik.length} boşluk / boru geçişi okundu.`);
    return {
      t: Date.now(), koken: [r3(X0), r3(Y0)], uyar,
      geo: { Lx: r3(Lx), Ly: r3(Ly), tw: r3(tw), ti: r3(ti), hr: r3(hr), toe, bolX: bX.map(o => o.v), bolY: bY.map(o => o.v), kAlt: r3(kAlt), kUst: r3(kUstD), doseme, perdeAd, radyeId: rad ? rad.id : null, kisaPerde, ...(perdeDelik.length ? { perdeDelik } : {}) },
      ...(askiPerde.length ? { askiPerde } : {}),
      ozet: `${anaP.length - askiPerde.length} perde${askiPerde.length ? ` (+${askiPerde.length} askıda)` : ''}, ${radyeler.length} radye, ${doseme.length} döşeme · ${r3(Lx)} × ${r3(Ly)} m · dış ${Math.round(tw * 100)} cm / ara ${Math.round(ti * 100)} cm · radye ${Math.round(hr * 100)} cm · kot ${r3(kAlt)} → ${r3(kUst)}`,
    };
  };

  /* çerçeve elemanları: kolon, kiriş, döşeme (+ mesnet olarak perdeler), dünya koordinatında */
  const cerceveOku = (tum) => {
    const vis = e => C.layer(e.layer).on && !(typeof e.gv === 'string');
    const ents = (!tum && C.sel && C.sel.length ? C.sel : C.doc.ents).filter(vis), uyar = [];
    const K = ents.filter(e => e.type === 'kolon'), B = ents.filter(e => e.type === 'kiris');
    if (!K.length && !B.length) return null;
    const kolonlar = K.map(e => { const r = (((+e.rot || 0) % 180) + 180) % 180, sw = Math.abs(r - 90) < 1; if (!sw && r > 1 && r < 179) uyar.push(`${e.no || 'Kolon'}: ${r}° döndürülmüş, eksenlere paralel kabul edildi.`); const p = e.p || [0, 0, 0], b = +e.b || 0.4, d = +e.d || 0.4; return { id: e.id, no: e.no || null, x: r3(p[0]), y: r3(p[1]), bx: sw ? d : b, by: sw ? b : d, D: e.sek === 'D' ? (+e.D || 0.5) : null, z0: r3(+e.z0 || 0), zt: r3((+e.z0 || 0) + (+e.h || 3)), ...(e.guse === 'E' && C.kolonGuse ? { guse: C.kolonGuse(e).map(g => { const v = g.loc(1, 0), cs = Math.cos((+e.rot || 0) * Math.PI / 180), sn = Math.sin((+e.rot || 0) * Math.PI / 180), dx = v[0] * cs - v[1] * sn, dy = v[0] * sn + v[1] * cs; return { yon: [Math.round(dx * 1000) / 1000, Math.round(dy * 1000) / 1000], f0: r3(g.f0), w: r3(g.w), gL: r3(g.gL), zt: r3(g.zt), hf: r3(g.zt - g.zf), hu: r3(g.zt - g.zu) }; }) } : {}) }; }); // guse (vinç konsolu): yön birim vektörü, kolon yüzü uzaklığı f0, genişlik, çıkma, yükseklikler
    const kirisler = B.map(e => { const a = e.a, b = e.b, j = e.hiza || 'O', bw = +e.bw || 0.3; let A = [a[0], a[1]], Bp = [b[0], b[1]]; if (j !== 'O') { const L = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]) || 1, n = [-(Bp[1] - A[1]) / L, (Bp[0] - A[0]) / L], o = (j === 'L' ? -1 : 1) * bw / 2; A = [A[0] + n[0] * o, A[1] + n[1] * o]; Bp = [Bp[0] + n[0] * o, Bp[1] + n[1] * o]; } return { id: e.id, no: e.no || null, a: A.map(r3), b: Bp.map(r3), bw, hb: +e.hb || 0.5, zt: r3(+e.zt || 3), gd: 0 }; });
    const dosemeler = ents.filter(e => (e.type === 'plak' && e.kind !== 'radye') || e.type === 'slab').map(e => ({ id: e.id, no: e.no || null, pts: e.pts.map(p => [r3(p[0]), r3(p[1])]), t: +e.t || 0.15, zt: r3(e.type === 'slab' ? (+e.z || 0) + (+e.t || 0.15) : (+e.zt || 0)), ...(e.yukG != null ? { g: +e.yukG } : {}), ...(e.yukQ != null ? { q: +e.yukQ } : {}) })); // yukG / yukQ: döşemede tanımlı kaplama / hareketli yük (kN/m²)
    const perdeler = ents.filter(e => e.type === 'perde' && (e.malz || 'beton') === 'beton').flatMap(eksenler).map(s => ({ a: s.a.map(r3), b: s.b.map(r3), t: s.t, z0: s.z0, zt: s.zt, no: s.no || null }));
    dosemeler.forEach((d, i) => { if (!d.no) d.no = 'D' + (i + 1); });
    const ayar = C.doc.set && C.doc.set.statikAyar ? JSON.parse(JSON.stringify(C.doc.set.statikAyar)) : undefined; // projeye kayıtlı deprem / karşılaştırma ayarları
    return { kolonlar, kirisler, dosemeler, perdeler, uyar, ...(ayar ? { ayar } : {}), ozet: `${kolonlar.length} kolon, ${kirisler.length} kiriş, ${dosemeler.length} döşeme` };
  };
  C._cerceveOku = cerceveOku; // kabuk (3B) modeline çerçeve eklemek için (statik-oval.js)


  C.addCommand(['STATIKMODEL', 'MODELDENSTATIK'], 'Modeldeki perde / radye / döşeme ve kolon / kiriş geometrisini statik hesap penceresine aktarır (seçim varsa yalnız seçilenler)', async () => {
    let d = null, h0 = null; const radyeVar = (C.sel && C.sel.length ? C.sel : C.doc.ents).some(e => e.type === 'plak' && e.kind === 'radye' && C.layer(e.layer).on);
    if (radyeVar) { try { d = modelOku(); } catch (er) { h0 = er.message; } }
    const cer = cerceveOku();
    if (!d && !cer) { const m = h0 || 'Modelde perde + radye ya da kolon / kiriş bulunamadı.'; C.warn('Statik ← model: ' + m); localStorage.setItem(K_MODEL, JSON.stringify({ t: Date.now(), hata: m })); return; }
    if (!d) d = { t: Date.now(), koken: null, uyar: [], geo: null, ozet: '' };
    if (cer) { d.cerceve = cer; d.ozet = (d.ozet ? d.ozet + ' · ' : '') + 'çerçeve: ' + cer.ozet; d.uyar = d.uyar.concat(cer.uyar); }
    localStorage.setItem(K_MODEL, JSON.stringify(d));
    C.doc.set = C.doc.set || {}; if (d.koken) C.doc.set.statikKoken = d.koken;
    C.log('Statik hesaba aktarıldı: ' + d.ozet); d.uyar.forEach(u => C.warn(u));
  }, { noUndo: true });

  /* ---------- 3B donatı nesnesi ---------- */
  const RENK = { 8: [0.55, 0.75, 0.35], 10: [0.30, 0.70, 0.30], 12: [0.85, 0.20, 0.20], 14: [0.95, 0.55, 0.10], 16: [0.80, 0.55, 0.05], 18: [0.20, 0.75, 0.80], 20: [0.20, 0.45, 0.95], 22: [0.55, 0.30, 0.90], 25: [0.90, 0.25, 0.75], 28: [0.45, 0.25, 0.15], 32: [0.25, 0.25, 0.25] };
  const ACI = { 8: 82, 10: 3, 12: 1, 14: 30, 16: 2, 18: 4, 20: 5, 22: 6, 25: 6, 28: 34, 32: 8 };
  const prizma = (out, a, b, r, col, n) => { // n kenarlı ince çubuk (uçları açık — birleşimlerde görünmez)
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d); if (L < 1e-6) return; const u = d.map(v => v / L);
    let p = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]; let v1 = [u[1] * p[2] - u[2] * p[1], u[2] * p[0] - u[0] * p[2], u[0] * p[1] - u[1] * p[0]]; const l1 = Math.hypot(...v1); v1 = v1.map(x => x / l1);
    const v2 = [u[1] * v1[2] - u[2] * v1[1], u[2] * v1[0] - u[0] * v1[2], u[0] * v1[1] - u[1] * v1[0]];
    const i0 = out.v.length, ns = [];
    for (let k = 0; k < n; k++) { const t = k / n * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), o = [v1[0] * c + v2[0] * s, v1[1] * c + v2[1] * s, v1[2] * c + v2[2] * s]; ns.push(o); out.v.push([a[0] + o[0] * r, a[1] + o[1] * r, a[2] + o[2] * r], [b[0] + o[0] * r, b[1] + o[1] * r, b[2] + o[2] * r]); out.vn.push(o, o); }
    for (let k = 0; k < n; k++) { const j = (k + 1) % n, A = i0 + 2 * k, B = i0 + 2 * k + 1, Cc = i0 + 2 * j, D = i0 + 2 * j + 1; out.f.push([A, Cc, D], [A, D, B]); out.fc.push(col, col); }
  };
  T.donati3 = {
    label: '3B donatı',
    prims: () => [],
    mesh: e => { const out = { t: 'tri', v: [], vn: [], f: [], fc: [], edges3: [] }, r = Math.max(0.004, (+e.F || 12) / 2000), col = RENK[e.F] || [0.8, 0.2, 0.2], n = 6; for (const b of e.bars || []) for (let i = 1; i < b.length; i++) prizma(out, b[i - 1], b[i], r, col, n); return [out]; },
    xf: (e, X) => { e.bars = (e.bars || []).map(b => b.map(q => { const p = X.p(q); return [p[0], p[1], p[2] != null ? p[2] : q[2]]; })); },
    snaps: () => [],
    info: e => `${e.poz ? 'Poz ' + e.poz + ' · ' : ''}Ø${e.F}/${Math.round((+e.s || 0) * 100)} · ${e.eleman || ''} ${e.tanim || ''} · ${(e.bars || []).length} çubuk`,
  };

  const donatiSil = () => { const l = C.doc.ents.filter(e => e.type === 'donati3'); if (l.length) C.remove(l); return l.length; };

  C.addCommand(['STATIKDONATI', 'DONATI3B'], 'Statik hesaptaki donatıyı modeldeki perde ve radye betonunun içine 3B çubuk olarak yerleştirir (3B → Disiplin: Statik ile görülür)', async () => {
    let d = null; try { d = JSON.parse(localStorage.getItem(K_DON) || 'null'); } catch (er) { }
    if (C._statikDonatiVeri && (!d || (C._statikDonatiVeri.t || 0) >= (d.t || 0))) d = C._statikDonatiVeri; // pencereden doğrudan (localStorage sınırı yok)
    if (d && C._statikDonatiCoz) d = C._statikDonatiCoz(d); // sıkıştırılmış biçim
    if (d) { C._statikDonatiVeri = d; try { localStorage.removeItem(K_DON); } catch (er) { } } // depo kotasını boşalt; yeniden çalıştırmada bellekten
    if (!d || !Array.isArray(d.gruplar) || !d.gruplar.length) { C.warn('Donatı verisi yok: statik hesap penceresinde "Donatıyı modele yerleştir" düğmesine basın.'); return; }
    // modeldeki yapıya hizala: yatayda dış köşe, düşeyde radye altı kotu (hesaptaki kotlar modelinkinden farklı olabilir)
    let k = d.koken || (C.doc.set && C.doc.set.statikKoken) || null, dz = 0, mdl = null;
    const goreli = d.gruplar.some(g => !g.mutlak);
    if (goreli) { try { mdl = modelOku(true); } catch (er) { } }
    if (!goreli) { k = [0, 0]; } else if (mdl) {
      k = mdl.koken; if (d.kAlt != null) dz = mdl.geo.kAlt - d.kAlt;
      if (d.Lx && (Math.abs(mdl.geo.Lx - d.Lx) > 0.05 || Math.abs(mdl.geo.Ly - d.Ly) > 0.05)) C.warn(`Dikkat: hesaptaki yapı ${d.Lx} × ${d.Ly} m, modeldeki ${mdl.geo.Lx} × ${mdl.geo.Ly} m. Donatı modelin köşesine hizalandı; doğru sonuç için statik pencerede önce "Modelden al", sonra "Hesapla".`);
    } else { k = k || [0, 0]; C.warn('Modelde betonarme perde bulunamadı: donatı hesaptaki kotlarla 0,0 noktasına konuldu.'); }
    const eski = donatiSil();
    C.ensureLayer(LY, 1, 'CONTINUOUS', 25);
    let n = 0, cb = 0;
    for (const g of d.gruplar) {
      const gb = (!g.mutlak && mdl && C._statikDonatiUyarla) ? C._statikDonatiUyarla(g, mdl, d) : g.bars; // radye pabucu modeldeki gerçek taşmaya
      const bars = g.mutlak ? g.bars : gb.map(b => b.map(q => [r3(q[0] + k[0]), r3(q[1] + k[1]), r3(q[2] + dz)]));
      const e = C.add(C.newEnt('donati3', { poz: g.poz, F: g.F, s: g.s, eleman: g.eleman, tanim: g.tanim, bars, layer: LY, color: g.tip === 'takoz' ? 8 : (ACI[g.F] || 1), ...(g.tip ? { tip: g.tip, r: g.r } : {}) }));
      delete e.sp; delete e.sv2; n++; cb += bars.length;
    }
    C.changed();
    C.log(`3B donatı: ${n} poz grubu, ${cb} çubuk yerleştirildi${eski ? ' (eski ' + eski + ' grup silindi)' : ''}. Görmek için 3B → Disiplin: Statik.`);
    // görünür kıl: 3B'ye geç, Statik disiplini, donatıya yakınlaş
    try {
      if (C.currentView !== '3d') C.setView('3d'); if (C.dis3bSec) C.dis3bSec('STATIK');
      const v3 = C.views && C.views.v3, all = C.doc.ents.filter(e => e.type === 'donati3').flatMap(e => e.bars.flat());
      if (v3 && all.length) {
        v3.build(); const mn = [0, 1, 2].map(i => Math.min(...all.map(q => q[i]))), mx = [0, 1, 2].map(i => Math.max(...all.map(q => q[i]))), o = v3.origin || [0, 0, 0];
        v3.t = [(mn[0] + mx[0]) / 2 - o[0], (mn[1] + mx[1]) / 2 - o[1], (mn[2] + mx[2]) / 2]; v3.dist = Math.max(3, Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) * 1.4); v3.dirty = true;
      }
    } catch (er) { console.error(er); }
  });
  C.addCommand(['STATIKDONATISIL', 'DONATI3BSIL'], 'Modele yerleştirilmiş 3B donatıyı siler', async () => { const n = donatiSil(); C.changed(); C.log(n ? n + ' donatı grubu silindi.' : 'Modelde 3B donatı yok.'); });

  /* kesit / görünüş üretimi sırasında 3B donatı ağ üretmez (kesitte beton taraması temiz kalsın) */
  let kesitte = 0;
  const m0 = C.meshes; C.meshes = e => (kesitte && e.type === 'donati3' ? null : m0(e));
  const sarK = nm => { const c = C.cmds[nm]; if (!c || c._dn3) return; const f = c.fn; c.fn = async function (...a) { kesitte++; try { return await f.apply(this, a); } finally { kesitte--; } }; c._dn3 = 1; };
  ['SECTION', 'KESITAL', 'GORUNUS', 'ELEVATION'].forEach(sarK);

  /* hesap penceresinden gelen istekler */
  window.addEventListener('storage', ev => {
    if (!ev.newValue) return;
    if (ev.key === K_ISTEK) { C.cmds.STATIKMODEL.fn(C.I, C); }
    else if (ev.key === K_DON) {
      if (C.cmd.running) { C.warn('3B donatı hazır: komut bitince STATIKDONATI yazın.'); return; }
      try { window.focus(); } catch (er) { } C.cmd.run('STATIKDONATI');
    }
  });

  /* şerit: Hesap → Yapı paneline iki düğme */
  try {
    const tab = C.ribbon && C.ribbon.tabs && C.ribbon.tabs.find(t => t[0] === 'Hesap'), pn = tab && tab[1].find(p => p[0] === 'Yapı');
    if (pn && !pn[1].some(b => b.cmd === 'STATIKDONATI')) { pn[1].push({ cmd: 'STATIKMODEL', t: 'Modelden gönder', i: 'found' }, { cmd: 'STATIKDONATI', t: '3B donatı', i: 'found' }); C.ribbon.render(); }
  } catch (er) { console.error('statik-model şerit', er); }
})(window.C);

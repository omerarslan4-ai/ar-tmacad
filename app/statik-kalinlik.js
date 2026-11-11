/* ArıtmaCAD — STATİK KALINLIK → MODEL (ayrı modül)
   Statik hesapta değişen perde / radye / döşeme kalınlıklarını modeldeki nesnelere yansıtır.
   Kabul: hazne İÇ YÜZÜ SABİT — dış perde dışa doğru kalınlaşır, ara perde ekseni korunur,
   radye ve döşeme dış kenarları perdeyle birlikte dışa kayar; radye ve döşeme ÜST kotu sabit kalır.
   Komut: STATIKKALINLIK (son gönderilen kalınlıkları yeniden uygular) */
(function (C) {
  'use strict';
  const K_KAL = 'aritmacad.statik.kalinlik', r4 = v => Math.round(v * 10000) / 10000, EPS = 0.004;

  const uygula = (p) => {
    const I = C._ins; if (!I || !I.faceOffs || !I.segFrames) throw new Error('Perde geometrisi modülü bulunamadı.');
    if (!C._statikModelOku) throw new Error('Statik model modülü bulunamadı.');
    if (C._statikEgikUzunluk && C._statikEgikUzunluk() >= 0.3) throw new Error('Yay / oval planlı hazne: kalınlıklar modele otomatik yansıtılmaz (dikdörtgen hesap geometrisi modeli bozar). Gerekirse perde / radye kalınlığını modelde elle değiştirin.');
    const mdl = C._statikModelOku(true), g = mdl.geo, X0 = mdl.koken[0], Y0 = mdl.koken[1], log = [], uyar = [];
    const tw0 = g.tw, ti0 = g.ti, tw1 = p.tw > 0 ? +p.tw : tw0, ti1 = p.ti > 0 ? +p.ti : ti0;
    const d = (Math.abs(tw1 - tw0) >= EPS) ? tw1 - tw0 : 0;
    const toeD = p.toe != null && Math.abs(p.toe - g.toe) >= 0.01 ? p.toe - g.toe : 0;
    const vis = e => C.layer(e.layer).on && !(typeof e.gv === 'string');
    const perdeler = C.doc.ents.filter(vis).filter(e => e.type === 'perde' && (e.malz || 'beton') === 'beton' && !e.temel && !e.parapet);
    // eksenler (modelOku ile aynı sınıflama)
    const seg = [];
    for (const e of perdeler) { const F = I.faceOffs(e), c = (F.lB + F.rB) / 2; for (const sf of I.segFrames(e)) { const a = [sf.a[0] + sf.nn[0] * c, sf.a[1] + sf.nn[1] * c], b = [sf.b[0] + sf.nn[0] * c, sf.b[1] + sf.nn[1] * c], yon = Math.abs(sf.u[1]) < 0.02 ? 'X' : Math.abs(sf.u[0]) < 0.02 ? 'Y' : null; seg.push({ e, sf, a, b, yon }); } }
    const sx = seg.filter(s => s.yon === 'X'), sy = seg.filter(s => s.yon === 'Y');
    const yS = Math.min(...sx.map(s => s.a[1])), yN = Math.max(...sx.map(s => s.a[1])), xW = Math.min(...sy.map(s => s.a[0])), xE = Math.max(...sy.map(s => s.a[0])), tol = 0.05;
    const dis = s => (s.yon === 'X' && (Math.abs(s.a[1] - yS) < tol || Math.abs(s.a[1] - yN) < tol)) || (s.yon === 'Y' && (Math.abs(s.a[0] - xW) < tol || Math.abs(s.a[0] - xE) < tol));
    const cx = X0 + g.Lx / 2, cy = Y0 + g.Ly / 2;
    const yap = [];
    // ara perde = hesaptaki bolX / bolY eksenindeki, radyeden yükselen perde; askı / kısa perdelerin kalınlığı hesapta modelden alınır → değiştirilmez
    const zTab = Math.min(...perdeler.filter(e => !e.kicker && seg.some(s => s.e === e && dis(s))).map(e => +e.z0 || 0));
    const araMi = ss => ss.every(s => s.e.z0 == null || !isFinite(zTab) || (+s.e.z0 || 0) <= zTab + 0.3) && ss.some(s => s.yon === 'Y' ? (g.bolX || []).some(v => Math.abs(s.a[0] - X0 - v) < tol) : s.yon === 'X' ? (g.bolY || []).some(v => Math.abs(s.a[1] - Y0 - v) < tol) : false);

    // ---- perdeler ----
    for (const e of perdeler) {
      const ss = seg.filter(s => s.e === e), sd = ss.find(dis), tip = sd ? 'dis' : 'ara', tNew = sd ? tw1 : ti1, F = I.faceOffs(e);
      if (e.kicker || (!sd && !araMi(ss))) continue; // ayak (kicker) üstündeki perdeyi kendiliğinden izler
      if (Math.abs(tNew - F.tb) < EPS) continue;
      if (sd && ss.some(s => !dis(s))) uyar.push(`${e.no || 'Perde #' + e.id}: aynı nesnede dış ve ara perde parçaları var; tümü dış perde kalınlığına (${Math.round(tNew * 100)} cm) getirildi.`);
      yap.push(() => {
        const tbOld = F.tb, of = +e.ofs || 0;
        let innerOld = null, sg = 1;
        if (sd) { const m = [(sd.a[0] + sd.b[0]) / 2, (sd.a[1] + sd.b[1]) / 2]; sg = ((cx - m[0]) * sd.sf.nn[0] + (cy - m[1]) * sd.sf.nn[1]) > 0 ? 1 : -1; innerOld = sg > 0 ? F.lB : F.rB; }
        e.tb = r4(tNew);
        if (e.tt != null && e.tt !== '') { const tt = +e.tt; if (Math.abs(tt - tbOld) < 1e-6) e.tt = r4(tNew); else { e.tt = r4(tt + (tNew - tbOld)); uyar.push(`${e.no || 'Perde #' + e.id}: eğimli yüzlü perde — üst kalınlık da ${Math.round((tNew - tbOld) * 100)} cm artırıldı (${Math.round(e.tt * 100)} cm).`); } }
        const F2 = I.faceOffs(e); e.ofs = of + 1; const F3 = I.faceOffs(e), k = (F3.lB - F2.lB) || 1; e.ofs = of;
        const dd = sd ? innerOld - (sg > 0 ? F2.lB : F2.rB) : (F.lB + F.rB) / 2 - (F2.lB + F2.rB) / 2;
        if (Math.abs(dd) > 1e-6) e.ofs = r4(of + dd / k);
        C.touch(e);
        log.push(`${e.no || 'Perde #' + e.id} ${Math.round(tbOld * 100)} → ${Math.round(tNew * 100)} cm${sd ? ' (dışa doğru)' : ''}`);
      });
    }

    // ---- plan eşlemesi: iç yüz sabit, dış yüz d kadar dışarı (perde bölgesi orantılı) ----
    const harita = (v, o0, L, ext) => { // o0: dış köşe, L: dış ölçü (eski)
      const wi = o0 + tw0, ei = o0 + L - tw0;
      if (v <= o0 + 1e-4) return v - d - ext;
      if (v < wi) return wi - (wi - v) * tw1 / tw0;
      if (v >= o0 + L - 1e-4) return v + d + ext;
      if (v > ei) return ei + (v - ei) * tw1 / tw0;
      return v;
    };
    const kaydir = (e, ext) => { e.pts = e.pts.map(q => { const r = q.slice(); r[0] = r4(harita(q[0], X0, g.Lx, ext)); r[1] = r4(harita(q[1], Y0, g.Ly, ext)); return r; }); };

    // ---- radye ----
    const rad = g.radyeId != null ? C.byId(g.radyeId) : null;
    if (rad) {
      const hrNew = p.hr > 0 ? +p.hr : g.hr, tDeg = Math.abs(hrNew - (+rad.t || g.hr)) >= EPS;
      if (tDeg || d || toeD) yap.push(() => {
        if (tDeg) { log.push(`Radye ${Math.round((+rad.t || g.hr) * 100)} → ${Math.round(hrNew * 100)} cm (üst kot ${rad.zt} sabit, alt kot iner)`); rad.t = r4(hrNew); }
        if (d || toeD) { kaydir(rad, toeD); log.push(`Radye kenarları ${Math.round((d + toeD) * 100)} cm dışa${toeD ? ` (pabuç ${Math.round(g.toe * 100)} → ${Math.round((g.toe + toeD) * 100)} cm)` : ''}`); }
        C.touch(rad);
      });
    } else if (p.hr > 0 && Math.abs(p.hr - g.hr) >= EPS) uyar.push('Modelde radye bulunamadı: radye kalınlığı yansıtılamadı.');

    // ---- döşemeler ----
    const dIstek = new Map((p.doseme || []).filter(x => x.id != null).map(x => [x.id, x]));
    for (const dm of g.doseme || []) {
      const e = dm.id != null ? C.byId(dm.id) : null; if (!e) continue;
      const q = dIstek.get(dm.id), tOld = +e.t || 0.15, tNew = q && q.t > 0 ? +q.t : tOld, tDeg = Math.abs(tNew - tOld) >= 0.005;
      if (!tDeg && !d) continue;
      yap.push(() => {
        if (tDeg) { if (e.type === 'slab') e.z = r4((+e.z || 0) + tOld - tNew); e.t = r4(tNew); log.push(`Döşeme ${dm.ad} ${Math.round(tOld * 100)} → ${Math.round(tNew * 100)} cm (üst kot sabit)`); }
        if (d) kaydir(e, 0);
        C.touch(e);
      });
    }
    if (!yap.length) return { n: 0, log: [], uyar };
    let bag = null; try { bag = C._kalBaglanti ? C._kalBaglanti([rad && rad.id, ...(g.doseme || []).map(x => x.id)]) : null; } catch (er) { console.error(er); }
    C.begin(); // tek adımda geri alınabilir
    yap.forEach(f => f());
    if (bag) try { bag(log, uyar); } catch (er) { console.error(er); } // perde uçları / döşeme kenarları yeni yüzlere
    C.changed();
    if (C.doc.ents.some(e => e.type === 'donati3')) uyar.push('Modeldeki 3B donatı eski kalınlıklara göre: statik pencerede "Donatıyı modele yerleştir" ile yenileyin.');
    if (d && C.doc.ents.some(e => e.type === 'boru' || e.type === 'dgp')) uyar.push(`Dış perde ${Math.round(d * 100)} cm dışa kalınlaştı: perde geçişli boruların ve duvar geçiş parçalarının dış uçlarını kontrol edin.`);
    return { n: yap.length, log, uyar };
  };

  const calistir = (p, kaynak) => {
    let r; try { r = uygula(p); } catch (er) { C.warn('Statik kalınlık → model: ' + er.message); return { hata: er.message }; }
    if (!r.n) C.log('Statik kalınlıklar modelle aynı — değişiklik yok.');
    else { C.log(`Statik kalınlıklar modele yansıtıldı (${kaynak}; geri almak için U): ` + r.log.join(' · ')); }
    r.uyar.forEach(u => C.warn(u));
    try { // önceden açılmış birleşimler (perde ucu / döşeme kenarı ↔ perde yüzü, ≤ 30 cm) her yansıtmada kapatılır
      const o = C._perdeBirlesimOto ? C._perdeBirlesimOto() : null; if (o && (o.n || o.nd)) r.onar = o.log;
    } catch (er) { console.error(er); }
    try { // hesap geometrisi modelle aynı mı? değilse modeli statik pencereye gönder (pencere eşitleyip yeniden hesaplar)
      if (p.Lx != null) { const m = C._statikModelOku(true), g = m.geo, f = (a, b) => Math.abs((+a || 0) - (+b || 0)) > 0.02, l = (a, b) => (a || []).length !== (b || []).length || (a || []).some((v, i) => f(v, b[i]));
        if (f(g.Lx, p.Lx) || f(g.Ly, p.Ly) || l(g.bolX, p.bolX) || l(g.bolY, p.bolY) || f(g.kAlt, p.kAlt)) { m.esitle = true; m.t = Date.now(); localStorage.setItem('aritmacad.statik.model', JSON.stringify(m)); r.esitlendi = true; C.log(`Statik hesaptaki yapı ölçüsü (${p.Lx} × ${p.Ly} m) modeldekinden (${g.Lx} × ${g.Ly} m) farklı: model ölçüleri hesap penceresine gönderildi, orada yeniden hesaplanacak.`); } }
    } catch (er) { console.error(er); }
    return r;
  };
  C._statikKalinlik = p => calistir(p, 'statik hesap');

  C.addCommand(['STATIKKALINLIK', 'KALINLIKYANSIT'], 'Statik hesapta değişen perde / radye / döşeme kalınlıklarını modele yansıtır (iç yüz ve üst kotlar sabit)', async () => {
    let p = null; try { p = JSON.parse(localStorage.getItem(K_KAL) || 'null'); } catch (er) { }
    if (!p) { C.warn('Kalınlık verisi yok: statik hesap penceresinde "Kalınlıkları modele yansıt" düğmesine basın.'); return; }
    calistir(p, 'STATIKKALINLIK');
  }, { noUndo: true });

  window.addEventListener('storage', ev => { if (ev.key === K_KAL && ev.newValue) { try { calistir(JSON.parse(ev.newValue), 'statik hesap'); } catch (er) { console.error(er); } } });
})(window.C);

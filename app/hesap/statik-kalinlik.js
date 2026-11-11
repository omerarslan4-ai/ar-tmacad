/* ArıtmaCAD Statik — kalınlık değişimi: İÇ YÜZ SABİT kabulü + modele yansıtma (ayrı modül)
   • Modelden alınan geometri referans saklanır (S.icRef). Dış perde kalınlığı değişince hazne iç ölçüleri korunur:
     Lx, Ly 2·Δt büyür, ara perde eksenleri ve döşeme sınırları Δt kayar, köken Δt dışa kayar.
     Radye kalınlığı değişince radye üst kotu (perde tabanı) sabit, alt kot (kAlt) iner.
   • "Kalınlıkları modele yansıt" düğmesi; "Kalınlık öner", "Hesapla" ve "Donatıyı modele yerleştir" sonrasında kendiliğinden yansıtılır. */
(function () {
  'use strict';
  const P = window.STATIK; if (!P) return;
  const K_KAL = 'aritmacad.statik.kalinlik', r3 = v => Math.round(v * 1000) / 1000, fark = (a, b) => Math.abs((+a || 0) - (+b || 0)) > 1e-4;
  const kopya = o => JSON.parse(JSON.stringify(o));
  const refYap = S => { const g = S.geo; return { tw: g.tw, hr: g.hr, Lx: g.Lx, Ly: g.Ly, kAlt: g.kAlt, bolX: (g.bolX || []).slice(), bolY: (g.bolY || []).slice(), doseme: kopya(g.doseme || []), perdeDelik: g.perdeDelik ? kopya(g.perdeDelik) : null, kisaPerde: g.kisaPerde && g.kisaPerde.length ? kopya(g.kisaPerde) : null, koken: S.koken ? S.koken.slice() : null, son: null }; };
  const sonYap = g => ({ tw: g.tw, hr: g.hr, Lx: g.Lx, Ly: g.Ly, kAlt: g.kAlt, bolX: (g.bolX || []).slice(), bolY: (g.bolY || []).slice(), dos: JSON.stringify((g.doseme || []).map(d => [d.x0, d.y0, d.x1, d.y1])) });

  /* S.geo'yu referansa göre iç yüz sabit olacak şekilde düzenler; değiştiyse true */
  P.icSabit = S => {
    if (!S || !S.geo || S.suYapisi === false || !S.koken) return false;
    if ((S.tas || {}).sabitYuz === 'dis') return false;
    const g = S.geo; let ref = S.icRef;
    if (!ref) { S.icRef = refYap(S); S.icRef.son = sonYap(g); return false; }
    const son = ref.son;
    if (son) { // kullanıcı ölçüleri elle değiştirdiyse referansı yenile
      const elle = !fark(g.tw, son.tw) && !fark(g.hr, son.hr) && (fark(g.Lx, son.Lx) || fark(g.Ly, son.Ly) || fark(g.kAlt, son.kAlt) || JSON.stringify(g.bolX) !== JSON.stringify(son.bolX) || JSON.stringify(g.bolY) !== JSON.stringify(son.bolY) || JSON.stringify((g.doseme || []).map(d => [d.x0, d.y0, d.x1, d.y1])) !== son.dos);
      if (elle || (g.doseme || []).length !== ref.doseme.length) { S.icRef = refYap(S); S.icRef.son = sonYap(g); return false; }
    }
    const d = g.tw - ref.tw, k = ref.tw > 0 ? g.tw / ref.tw : 1, Lx = r3(ref.Lx + 2 * d), Ly = r3(ref.Ly + 2 * d);
    const es = (v, L0, L1) => v <= ref.tw ? r3(v * k) : v >= L0 - ref.tw ? r3(L1 - (L0 - v) * k) : r3(v + d);
    const yeni = {
      Lx, Ly, bolX: ref.bolX.map(v => r3(v + d)), bolY: ref.bolY.map(v => r3(v + d)), kAlt: r3(ref.kAlt + ref.hr - g.hr),
      ...(ref.perdeDelik ? { perdeDelik: ref.perdeDelik.map(h => ({ ...h, x: es(h.x, ref.Lx, Lx), y: es(h.y, ref.Ly, Ly) })) } : {}),
      ...(ref.kisaPerde ? { kisaPerde: ref.kisaPerde.map((k, i) => { const X = k.yon === 'X', o = (g.kisaPerde || [])[i] || k; return { ...o, v: es(k.v, X ? ref.Ly : ref.Lx, X ? Ly : Lx), a: es(k.a, X ? ref.Lx : ref.Ly, X ? Lx : Ly), b: es(k.b, X ? ref.Lx : ref.Ly, X ? Lx : Ly) }; }) } : {}),
      doseme: (g.doseme || []).map((x, i) => { const o = ref.doseme[i] || x; return { ...x, x0: es(o.x0, ref.Lx, Lx), x1: es(o.x1, ref.Lx, Lx), y0: es(o.y0, ref.Ly, Ly), y1: es(o.y1, ref.Ly, Ly), ...(o.delik ? { delik: o.delik.map(b => ({ ...b, pts: b.pts.map(q => [es(q[0], ref.Lx, Lx), es(q[1], ref.Ly, Ly)]) })) } : {}) }; }),
    };
    let degisti = fark(g.Lx, yeni.Lx) || fark(g.Ly, yeni.Ly) || fark(g.kAlt, yeni.kAlt) || JSON.stringify(g.bolX) !== JSON.stringify(yeni.bolX) || JSON.stringify(g.bolY) !== JSON.stringify(yeni.bolY) || JSON.stringify(g.doseme) !== JSON.stringify(yeni.doseme);
    Object.assign(g, yeni);
    if (ref.koken) S.koken = [r3(ref.koken[0] - d), r3(ref.koken[1] - d)];
    ref.son = sonYap(g);
    return degisti;
  };

  // hesap (ve Kalınlık öner döngüsü) her zaman iç yüz sabit geometriyle çalışsın
  const h0 = P.hesapla; P.hesapla = function (S, ...a) { try { P.icSabit(S); } catch (e) { console.error(e); } return h0.call(this, S, ...a); };

  if (typeof window.changed !== 'function' || !document.getElementById('bOner')) return; // yalnız statik penceresi

  // form değişince (ör. dış perde kalınlığı elle) ölçüleri güncelle
  const ch0 = window.changed;
  window.changed = function () { let d = false; try { d = P.icSabit(S); } catch (e) { console.error(e); } if (d) { try { buildForm(); } catch (e) { } } return ch0.apply(this, arguments); };
  // modelden alınca referansı sıfırla
  const mu0 = window.modelUygula;
  if (typeof mu0 === 'function') window.modelUygula = function (d) {
    if (d && d.geo) { S.icRef = null; if (!d.geo.perdeDelik) d.geo.perdeDelik = []; /* modelde kalmayan boşluklar silinsin */ const es = (S.geo && S.geo.doseme) || []; (d.geo.doseme || []).forEach((y, i) => { const o = es.find(q => q.id != null && q.id === y.id) || es.find(q => q.ad === y.ad); if (o) { y.g = o.g; y.q = o.q; } }); } // döşeme yükleri korunur
    const cer = S.cer, r = mu0.apply(this, arguments);
    if (d && d.esitle) { // kalınlık yansıtma sonrası modelden otomatik eşitleme: çerçeve verisi korunur, yeniden hesaplanır
      if (!d.cerceve && cer) { S.cer = cer; save(); }
      setTimeout(() => { try { hesapla(); setTimeout(() => { const m = document.getElementById('pMsg'); if (m) m.insertAdjacentHTML('beforeend', '<div class="msg info">Hesap geometrisi modeldeki yapıyla eşitlendi (' + S.geo.Lx + ' × ' + S.geo.Ly + ' m) ve yeniden hesaplandı.</div>'); }, 200); } catch (e) { console.error(e); } }, 50);
    }
    return r; };
  // eski kayıtlarda (modelden alınmış) referansı şimdiki durumdan kur
  try { if (S && S.koken && !S.icRef) { S.icRef = refYap(S); S.icRef.son = sonYap(S.geo); save(); } } catch (e) { }

  /* ---------- modele yansıtma ---------- */
  const mesaj = (h, cls) => { const m = document.getElementById('pMsg'); if (m) m.insertAdjacentHTML('beforeend', `<div class="msg ${cls || 'info'}">${h}</div>`); };
  const yansit = (sessiz) => {
    if (!S || S.suYapisi === false || !S.geo) { if (!sessiz) alert('Yansıtılacak su yapısı (perde + radye) geometrisi yok.'); return null; }
    if (!S.koken) { if (!sessiz) alert('Hesap modele bağlı değil: önce "Modelden al".'); return null; }
    const g = S.geo, p = { t: Date.now(), tw: g.tw, ti: g.ti, hr: g.hr, toe: g.toe, Lx: g.Lx, Ly: g.Ly, bolX: g.bolX, bolY: g.bolY, kAlt: g.kAlt, doseme: (g.doseme || []).filter(d => d.id != null).map(d => ({ id: d.id, ad: d.ad, t: d.t })) };
    try { localStorage.setItem(K_KAL, JSON.stringify(p)); } catch (e) { }
    let r = null;
    let OC = null; try { OC = window.opener && window.opener.C && window.opener.C._statikKalinlik ? window.opener.C : null; } catch (e) { OC = null; } // dosyadan açıldığında erişim engelli → depo üzerinden
    if (OC) { try { r = OC._statikKalinlik(p); } catch (e) { r = { hata: e.message }; } }
    if (r && r.hata) mesaj('Kalınlıklar modele yansıtılamadı: ' + r.hata, 'bad');
    else if (r && r.n) mesaj('Modele yansıtıldı: ' + r.log.join(' · ') + (r.uyar.length ? '<br>⚠ ' + r.uyar.join('<br>⚠ ') : ''));
    else if (r && !sessiz) mesaj('Modeldeki kalınlıklar hesapla aynı.');
    else if (!r && !sessiz) mesaj('Kalınlıklar ArıtmaCAD\'e gönderildi (gelmezse komut satırına <b>STATIKKALINLIK</b> yazın).');
    return r;
  };
  window.kalinlikYansit = yansit;

  // düğme
  const bO = document.getElementById('bOner'), b = document.createElement('button');
  b.id = 'bKal'; b.textContent = 'Kalınlıkları modele yansıt'; b.title = 'Hesaptaki perde / radye / döşeme kalınlıklarını ArıtmaCAD modeline uygular (hazne iç yüzü ve üst kotlar sabit; perde dışa kalınlaşır)';
  b.onclick = () => yansit(false); bO.insertAdjacentElement('afterend', b);

  // Kalınlık öner / Hesapla bittikten sonra kendiliğinden yansıt (ikisi de 30 ms gecikmeli çalışır)
  const sonra = (id) => { const el = document.getElementById(id); if (!el) return; const f = el.onclick; el.onclick = function (...a) { const r = f && f.apply(this, a); setTimeout(() => { try { if (R) yansit(true); } catch (e) { console.error(e); } }, 120); return r; }; };
  sonra('bOner'); sonra('bHesap');
  // donatı gönderilmeden önce kalınlıklar modele geçsin (donatı yeni kalınlığa hizalansın)
  const bD = document.getElementById('bDon3');
  if (bD) { const f = bD.onclick; bD.onclick = function (...a) { try { yansit(true); } catch (e) { console.error(e); } return f && f.apply(this, a); }; }
})();

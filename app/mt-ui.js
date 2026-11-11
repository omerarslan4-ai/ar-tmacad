/* ArıtmaCAD — MEKANİK TESİSAT · PANEL, KOMUTLAR, ŞERİT SEKMESİ
   MEKANIKTESISAT (TESISAT) : panel — Proje (il, bina, kabuller) · Yapı elemanları (katmanlar, U) · Mahaller (ad, tip, sıcaklık, ek pencere / kapı) · Sonuç
   ISIKAYBI            : hesaplar, mahal etiketlerine Q yazar.     ISIRAPOR / ISIYALITIMRAPOR / ISIKAYBIRAPOR : rapor penceresi (yazdır / PDF / Word) */
(function (C) {
  'use strict';
  if (typeof document === 'undefined') return;
  const V = C.MTV, MT = C.MT, M = C.M;
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const f = (v, d = 2) => (isFinite(v) ? (+v).toFixed(d) : '—').replace('.', ',');
  const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
  const opt = (list, cur) => list.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const css = `#mtP{font-size:13px}#mtP .tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:10px}#mtP .tabs button{border:0;background:none;color:var(--mut);padding:7px 14px;cursor:pointer;border-bottom:2px solid transparent;font:inherit}#mtP .tabs button.on{color:var(--fg,inherit);border-bottom-color:var(--acc,#3987e5);font-weight:600}
#mtP .g2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4px 22px}#mtP .fld{grid-template-columns:200px minmax(0,1fr)}#mtP .fld input,#mtP .fld select{width:100%;box-sizing:border-box}#mtP input,#mtP select{min-width:0}#mtP table{border-collapse:collapse;width:100%}#mtP th,#mtP td{border-bottom:1px solid var(--line);padding:3px 5px;text-align:left}#mtP th{color:var(--mut);font-weight:600;font-size:12px;position:sticky;top:0;background:var(--panel)}
#mtP td input,#mtP td select{width:100%;box-sizing:border-box}#mtP td.n,#mtP th.n{text-align:right;white-space:nowrap}#mtP .sc{max-height:58vh;overflow:auto}#mtP .ok{color:#3bb273;font-weight:600}#mtP .bad{color:#e66767;font-weight:600}#mtP .kart{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}#mtP .kart div{border:1px solid var(--line);border-radius:8px;padding:8px 10px}#mtP .kart b{display:block;font-size:17px}#mtP .kart span{color:var(--mut);font-size:11.5px}
#mtP .yl{display:grid;grid-template-columns:270px 1fr;gap:14px}#mtP .yl select[size]{width:100%;height:52vh}#mtP .mut{color:var(--mut);font-size:12px}#mtP .x{border:0;background:none;color:var(--mut);cursor:pointer;font-size:15px;padding:0 4px}`;
  let cur = 'proje', yKey = 'DD_tugla', ekAcik = null;
  const dirty = () => { try { C.changed(); } catch (e) { } };
  const limOf = (m, tur, key) => { const l = V.U825[m.bolge] || V.U825[4]; return tur === 'dduvar' ? l[0] : tur === 'tavan' ? l[1] : tur === 'taban' || key === 'AD_yalitimli' ? l[2] : tur === 'pencere' ? l[3] : null; };

  /* ---------- sekme: PROJE ---------- */
  const tProje = (el, m) => {
    const F = (l, h) => `<div class="fld"><label>${l}</label>${h}</div>`, N = (k, st = 1) => `<input type="number" step="${st}" data-k="${k}" value="${m[k]}">`;
    const yp = tur => Object.entries(m.yapi).filter(([, y]) => y.tur === tur).map(([k, y]) => [k, y.ad]);
    el.innerHTML = `<div class="g2"><div>
${F('İl', `<select data-il>${opt(V.ILLER.map(x => [x[0], x[0]]), m.il)}</select>`)}
${F('TS 825:2024 derece gün bölgesi', `<select data-k="bolge" data-n>${opt([1, 2, 3, 4, 5, 6].map(i => [i, `${i}. bölge — ${V.BOLGE_AD[i]}`]), m.bolge)}</select>`)}
${F('Kış dış hesap sıcaklığı (°C)', N('td'))}
${F('Bina türü', `<select data-k="bina" data-n>${opt(V.BINA.map((b, i) => [i, b[0]]), m.bina)}</select>`)}
${F('İşletme durumu', `<select data-k="isletme" data-n>${opt([1, 2, 3].map(i => [i, V.ISLETME[i]]), m.isletme)}</select>`)}
${F('Kuzey yönü (çizimde açı °, 90 = yukarı)', N('kuzey', 5))}
${F('Varsayılan kat yüksekliği (m)', N('hKat', 0.05))}
${F('Bina konumu', `<select data-k="konum">${opt(Object.entries(V.KONUM), m.konum)}</select>`)}
${F('Nizam / rüzgâr', `<div style="display:flex;gap:6px"><select data-k="nizam" style="flex:1">${opt([['ayrik', 'Ayrık nizam'], ['bitisik', 'Bitişik nizam']], m.nizam)}</select><select data-k="ruzgar" style="flex:1">${opt([['normal', 'Normal bölge'], ['ruzgarli', 'Rüzgârlı bölge']], m.ruzgar)}</select></div>`)}
</div><div>
${F('Toprak sıcaklığı (°C)', N('tToprak'))}
${F('Isıtılmayan hacim sıcaklığı (°C)', N('tIsitilmayan'))}
${F('Hava değişim sayısı n<sub>h</sub> (1/h)', N('nh', 0.1))}
${F('Isı köprüsü artışı ΔU (W/m²K)', N('kopru', 0.01))}
${F('İç / dış bağıl nem (%)', `<div style="display:flex;gap:6px"><input type="number" data-k="rhIc" value="${m.rhIc}" style="flex:1"><input type="number" data-k="rhDis" value="${m.rhDis}" style="flex:1"></div>`)}
${F('Pencere tipi', `<select data-k="pencere">${opt(yp('pencere'), m.pencere || 'PN_pvc')}</select>`)}
${F('Dış kapı tipi', `<select data-k="kapiDis">${opt(yp('kapi'), m.kapiDis || 'KP_dis')}</select>`)}
${F('Çatı / üst kat tavanı', `<select data-k="catiTip">${opt(yp('tavan'), m.catiTip)}</select>`)}
${['tugla', 'gazbeton', 'beton', 'briket'].map(z => F(`Modeldeki ${({ tugla: 'tuğla', gazbeton: 'gazbeton', beton: 'betonarme', briket: 'briket' })[z]} dış duvar`, `<select data-esle="dis:${z}">${opt(yp('dduvar'), (m.esle && m.esle['dis:' + z]) || 'DD_' + z)}</select>`)).join('')}
</div></div><p class="mut">İl seçilince bölge ve dış hesap sıcaklığı kendiliğinden gelir; ilçe farklı bölgedeyse bölgeyi elle değiştirin. ${m.bolge}. bölgede olan farklı ilçeler: ${esc(V.ILCE[m.bolge] || '—')}.</p>
<div class="bar"><button class="pri" data-bul>Mahalleri modelden bul</button><button data-var>Yapı elemanlarını bölgeye göre yenile</button></div>`;
    el.querySelector('[data-il]').onchange = e => { const il = V.ILLER.find(x => x[0] === e.target.value); m.il = il[0]; m.bolge = il[1]; m.td = il[2]; m.tToprak = V.toprakT(m.td); m.tIsitilmayan = V.isitilmayanT(m.td); dirty(); render(); };
    el.querySelectorAll('[data-k]').forEach(i => i.onchange = () => { const k = i.dataset.k; m[k] = i.type === 'number' || i.dataset.n != null ? (num(i.value) ?? m[k]) : i.value; dirty(); if (k === 'bolge') render(); });
    el.querySelectorAll('[data-esle]').forEach(i => i.onchange = () => { m.esle = m.esle || {}; m.esle[i.dataset.esle] = i.value; dirty(); });
    el.querySelector('[data-bul]').onclick = () => { const r = MT.mahalBul({}); if (!r.n) C.warn('Kapalı hacim bulunamadı. Duvarları İnşaat › Duvar / Perde ile çizin ya da mimari DXF planı için komut satırından MAHALBUL › Çizgiler kullanın.'); else { C.log('Mahal bulundu — ' + r.ozet.join(' · ')); MT.hesapla(); cur = 'mahal'; } render(); };
    el.querySelector('[data-var]').onclick = () => { m.yapi = V.yapiVarsayilan(m.bolge); dirty(); C.log(`Yapı elemanları ${m.bolge}. bölge için varsayılan katmanlara döndürüldü.`); };
  };

  /* ---------- sekme: YAPI ELEMANLARI ---------- */
  const tYapi = (el, m) => {
    if (!m.yapi[yKey]) yKey = Object.keys(m.yapi)[0];
    const y = m.yapi[yKey], grp = {}; Object.entries(m.yapi).forEach(([k, v]) => (grp[v.tur] = grp[v.tur] || []).push([k, v.ad]));
    const mz = Object.entries(V.MALZ), mg = [...new Set(mz.map(([, v]) => v[3]))], mopt = c => mg.map(g => `<optgroup label="${g}">${mz.filter(([, v]) => v[3] === g).map(([k, v]) => `<option value="${k}"${k === c ? ' selected' : ''}>${esc(v[0])}</option>`).join('')}</optgroup>`).join('');
    let ed;
    if (y.tur === 'pencere' || y.tur === 'kapi') ed = `<div class="fld"><label>U değeri (W/m²K)</label><input type="number" step="0.1" data-y="U" value="${y.U}"></div>${y.tur === 'pencere' || y.g != null ? `<div class="fld"><label>Güneş enerjisi geçirgenliği g</label><input type="number" step="0.05" data-y="g" value="${y.g ?? 0.6}"></div>` : ''}<div class="fld"><label>Sızdırganlık a (m³/h·m)</label><input type="number" step="0.1" data-y="a" value="${y.a ?? 0}"></div>`;
    else ed = `<table><tr><th style="width:26px">#</th><th>Katman (içten dışa)</th><th style="width:90px">d (cm)</th><th style="width:90px">λ (W/mK)</th><th class="n" style="width:70px">R</th><th style="width:60px"></th></tr>${MT.katmanlar(y).map((k, i) => `<tr><td>${i + 1}</td><td><select data-km="${i}">${mopt(k.m)}</select></td><td><input type="number" step="0.5" data-kd="${i}" value="${+(k.d * 100).toFixed(2)}"></td><td><input type="number" step="0.005" data-kl="${i}" value="${k.lam}"></td><td class="n">${f(k.R, 3)}</td><td><button class="x" data-up="${i}" title="Yukarı">↑</button><button class="x" data-del="${i}" title="Sil">×</button></td></tr>`).join('')}</table><div class="bar"><button data-ekle>+ Katman</button></div>`;
    const u = MT.U(y), lim = limOf(m, y.tur, yKey);
    el.innerHTML = `<div class="yl"><div><select size="18" data-list>${Object.entries(grp).map(([t, l]) => `<optgroup label="${MT.TURAD[t] || t}">${opt(l, yKey)}</optgroup>`).join('')}</select><div class="bar"><button data-kopya>Kopyala</button><button data-sil>Sil</button></div></div><div><div class="fld"><label>Ad</label><input data-y="ad" value="${esc(y.ad)}"></div>${ed}
<p style="font-size:15px;margin-top:12px">U = <b>${f(u.U, 3)} W/m²K</b>${lim != null ? ` · TS 825:2024 ${m.bolge}. bölge sınırı ${f(lim, 2)} — ${u.U <= lim + 0.005 ? '<span class="ok">✓ uygun</span>' : '<span class="bad">✗ sınırı aşıyor</span>'}` : ''}</p><p class="mut">Modelden gelen duvarlarda taşıyıcı / dolgu katmanının kalınlığı (tuğla, gazbeton, beton, briket) çizimdeki duvar kalınlığından alınır; diğer katmanlar buradaki gibi kalır.</p></div></div>`;
    const rr = () => { dirty(); render(); };
    el.querySelector('[data-list]').onchange = e => { yKey = e.target.value; render(); };
    el.querySelectorAll('[data-y]').forEach(i => i.onchange = () => { const k = i.dataset.y; y[k] = k === 'ad' ? i.value : (num(i.value) ?? y[k]); rr(); });
    el.querySelectorAll('[data-km]').forEach(i => i.onchange = () => { const k = y.kat[+i.dataset.km]; k.m = i.value; delete k.lam; delete k.mu; rr(); });
    el.querySelectorAll('[data-kd]').forEach(i => i.onchange = () => { const v = num(i.value); if (v != null && v >= 0) y.kat[+i.dataset.kd].d = v / 100; rr(); });
    el.querySelectorAll('[data-kl]').forEach(i => i.onchange = () => { const v = num(i.value); if (v > 0) y.kat[+i.dataset.kl].lam = v; rr(); });
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { y.kat.splice(+b.dataset.del, 1); rr(); });
    el.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const i = +b.dataset.up; if (i > 0) { [y.kat[i - 1], y.kat[i]] = [y.kat[i], y.kat[i - 1]]; rr(); } });
    const ek = el.querySelector('[data-ekle]'); if (ek) ek.onclick = () => { y.kat.push({ m: 'eps', d: 0.05 }); rr(); };
    el.querySelector('[data-kopya]').onclick = () => { let i = 2, k; do { k = yKey.split('#')[0] + '#' + i++; } while (m.yapi[k]); m.yapi[k] = JSON.parse(JSON.stringify(y)); m.yapi[k].ad = y.ad + ' (kopya)'; yKey = k; rr(); };
    el.querySelector('[data-sil]').onclick = () => { if (!yKey.includes('#')) { C.warn('Hazır tipler silinemez; kopyalayıp değiştirebilirsiniz.'); return; } delete m.yapi[yKey]; yKey = 'DD_tugla'; rr(); };
  };

  /* ---------- sekme: MAHALLER ---------- */
  const tMahal = (el, m) => {
    const all = MT.mahaller(); if (!all.length) { el.innerHTML = `<p>Henüz mahal yok. <b>Proje</b> sekmesinde "Mahalleri modelden bul" düğmesine basın ya da komut satırına <b>MAHALBUL</b> yazın (mimari DXF planı için Çizgiler seçeneği, elle çizim için <b>MAHALCIZ</b>).</p>`; return; }
    const hes = MT.hesapla(), tip = V.MAHAL.map((t, i) => [i, t[0] + (t[2] ? ` (${t[1]}°C)` : '')]);
    const row = ({ e, r }) => {
      const yon = [...new Set((e.yuz || []).filter(y => y.k === 'dis').map(y => y.yon))], pn = r.items.filter(o => o.tur === 'PN' && o.dis).reduce((s, o) => s + o.A, 0);
      let s = `<tr><td><input data-m="no" data-id="${e.id}" value="${esc(e.no)}" style="width:54px"></td><td><input data-m="daire" data-id="${e.id}" value="${esc(e.daire || '')}" placeholder="—" style="width:64px" title="Bağımsız bölüm (kombi seçimi için): D1, D2 …"></td><td><input data-m="ad" data-id="${e.id}" value="${esc(e.ad)}"></td><td><select data-m="tip" data-id="${e.id}">${opt(tip, e.tip || 0)}</select></td><td><input data-m="ti" data-id="${e.id}" value="${e.ti ?? ''}" placeholder="${r.ti ?? '—'}" style="width:50px"></td><td class="n">${f(r.A, 2)}</td><td><input data-m="h" data-id="${e.id}" value="${e.h}" style="width:54px"></td><td class="n">${yon.join(' ') || '—'}</td><td class="n">${f(pn, 1)}</td><td><button data-ek="${e.id}">${(e.ek || []).length ? (e.ek || []).length + ' ek' : '+ ekle'}</button></td><td class="n"><b>${r.ti == null ? '—' : Math.round(r.Q).toLocaleString('tr-TR')}</b></td><td class="n">${r.ti == null ? '—' : f(r.qA, 0)}</td></tr>`;
      if (ekAcik === e.id) s += `<tr><td></td><td colspan="11"><table>${(e.ek || []).map((x, i) => `<tr><td style="width:120px"><select data-e="tur" data-i="${i}">${opt([['pencere', 'Pencere'], ['kapi', 'Dış kapı']], x.tur)}</select></td><td style="width:110px"><input data-e="w" data-i="${i}" value="${x.w}" title="Genişlik (m)"></td><td style="width:110px"><input data-e="h" data-i="${i}" value="${x.h}" title="Yükseklik (m)"></td><td style="width:80px"><input data-e="adet" data-i="${i}" value="${x.adet || 1}" title="Adet"></td><td style="width:130px"><select data-e="yon" data-i="${i}">${opt([['', 'En büyük dış duvar']].concat(yon.map(q => [q, V.YON_AD[q]])), x.yon || '')}</select></td><td><button class="x" data-edel="${i}">×</button></td></tr>`).join('')}</table><div class="bar"><button data-eadd>+ Pencere / kapı satırı</button><span class="mut">genişlik × yükseklik (m), adet, hangi cephede — modelde çizilmemiş pencere ve dış kapılar için</span></div></td></tr>`;
      return s;
    };
    el.innerHTML = `<div class="bar"><button data-bul>Mahalleri yeniden bul</button><span class="mut" style="align-self:center">${all.length} mahal · toplam <b>${f(hes.Q / 1000, 2)} kW</b> · ${f(hes.A, 1)} m² ısıtılan alan · ortalama ${f(hes.A ? hes.Q / hes.A : 0, 0)} W/m²</span></div><div class="sc"><table><tr><th>No</th><th>Bölüm</th><th>Mahal adı</th><th>Tip</th><th>t<sub>i</sub> °C</th><th class="n">Alan m²</th><th>h m</th><th class="n">Dış cephe</th><th class="n">Pencere m²</th><th>Ek pencere / kapı</th><th class="n">Q (W)</th><th class="n">W/m²</th></tr>${hes.res.map(row).join('')}</table></div>`;
    const by = id => C.byId(+id), rr = () => { dirty(); render(); };
    el.querySelectorAll('[data-m]').forEach(i => i.onchange = () => { const e = by(i.dataset.id), k = i.dataset.m; if (!e) return; if (k === 'tip') { e.tip = +i.value; e.ti = null; } else if (k === 'ti') e.ti = i.value.trim() === '' ? null : num(i.value); else if (k === 'h') e.h = num(i.value) || e.h; else { e[k] = i.value.trim(); if (k === 'ad' && e.tip === 0) e.tip = V.mahalTipBul(e.ad); } delete e._c; rr(); });
    el.querySelectorAll('[data-ek]').forEach(b => b.onclick = () => { ekAcik = ekAcik === +b.dataset.ek ? null : +b.dataset.ek; render(); });
    const ee = ekAcik != null ? by(ekAcik) : null;
    if (ee) { el.querySelectorAll('[data-e]').forEach(i => i.onchange = () => { const x = ee.ek[+i.dataset.i], k = i.dataset.e; x[k] = k === 'tur' || k === 'yon' ? i.value : (num(i.value) || x[k]); rr(); }); el.querySelectorAll('[data-edel]').forEach(b => b.onclick = () => { ee.ek.splice(+b.dataset.edel, 1); rr(); }); const a = el.querySelector('[data-eadd]'); if (a) a.onclick = () => { ee.ek = ee.ek || []; ee.ek.push({ tur: 'pencere', w: 1.5, h: 1.4, adet: 1, yon: '' }); rr(); }; }
    el.querySelector('[data-bul]').onclick = () => { const r = MT.mahalBul({}); if (!r.n) C.warn('Kapalı hacim bulunamadı.'); rr(); };
  };

  /* ---------- sekme: SONUÇ ---------- */
  const tSonuc = (el, m) => {
    const hes = MT.hesapla(); if (!hes.res.length) { el.innerHTML = '<p>Önce mahalleri oluşturun.</p>'; return; }
    const t = MT.ts825(hes), ok = b => b ? '<span class="ok">✓ uygun</span>' : '<span class="bad">✗ uygun değil</span>';
    el.innerHTML = `<div class="kart"><div><b>${f(hes.Q / 1000, 2)} kW</b><span>Toplam ısı kaybı (${Math.round(hes.Q * 0.86).toLocaleString('tr-TR')} kcal/h)</span></div><div><b>${f(hes.A ? hes.Q / hes.A : 0, 0)} W/m²</b><span>${f(hes.A, 1)} m² ısıtılan alan</span></div><div><b>${f(t.H, 0)} W/K</b><span>Bina özgül ısı kaybı · A/V = ${f(t.AV, 2)}</span></div><div><b>${f(t.qYil, 0)} kWh/m²·yıl</b><span>Yıllık net ısıtma (ön hesap) · sınır ${t.sinir} (ısıtma + soğutma)</span></div></div>
<div class="sc" style="max-height:40vh"><table><tr><th>Yapı elemanı</th><th>Yön</th><th class="n">A m²</th><th class="n">U</th><th class="n">Sınır</th><th>U</th><th>Yoğuşma</th></tr>${t.el.map(g => { const y = t.yog.find(x => x.g === g); return `<tr><td>${esc(g.ad)}</td><td>${g.yon || '—'}</td><td class="n">${f(g.A, 1)}</td><td class="n">${f(g.U, 3)}</td><td class="n">${g.lim != null ? f(g.lim, 2) : '—'}</td><td>${g.lim != null ? ok(g.uygun) : '—'}</td><td>${y ? (y.r.var ? `${f(y.r.MaMax * 1000, 0)} g/m² · ` : 'yok · ') + ok(y.r.uygun) : '—'}</td></tr>`; }).join('')}</table></div>
<div class="bar" style="margin-top:12px"><button class="pri" data-r="hepsi">Tam rapor (yalıtım + ısı kaybı)</button><button data-r="yalitim">Isı yalıtım raporu</button><button data-r="kayip">Isı kaybı raporu</button><button data-k="YALITIMUYGULA" title="Hesaptaki malzeme ve kalınlıklarla cephe, çatı ve zemin yalıtımını modele işler; yalıtım detaylarını çizer">Yalıtımı modele uygula + detay çiz</button><button data-k="TESISATPAFTA T">Tesisat paftaları</button><button data-k="CAKISMA">Çakışma denetimi + geçiş delikleri</button><button data-k="TESISATYAZI">Pafta yazı boyutu…</button><button data-k="TESISATCIKTI">Çıktı al (yazdır / PDF)</button><button data-k="TESISATDXF">DXF kaydet</button></div><p class="mut">Rapor ayrı pencerede açılır; oradan yazdırabilir, PDF ya da Word olarak kaydedebilirsiniz. Grafikler, kesit sıcaklık dağılımları, yoğuşma diyagramları ve kat planı ısı haritaları raporun içindedir.</p>`;
    el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => MT.raporAc(b.dataset.r));
    el.querySelectorAll('[data-k]').forEach(b => b.onclick = async () => { C.closeModal(); try { await C.cmd.run(b.dataset.k); } catch (e) { } });
  };

  /* ---------- sekme: KALORİFER ---------- */
  const tIsitma = (el, m) => {
    const k = MT.kal(), F = (l, h) => `<div class="fld"><label>${l}</label>${h}</div>`, N = (q, st = 1) => `<input type="number" step="${st}" data-q="${q}" value="${k[q]}">`;
    const nR = C.doc.ents.filter(e => e.type === 'mtrad').length, h = nR ? MT.kaloriferHesap() : null, kom = async c => { C.closeModal(); try { await C.cmd.run(c); } catch (e) { } };
    const el_ = k.sistem === 'elektrik', eh = el_ && MT.elektrikHesap ? MT.elektrikHesap() : null;
    const ust = `<div class="g2"><div>${F('Isıtma şekli', `<select data-q="sistem" data-s data-r>${opt([['su', 'Sıcak sulu kalorifer (radyatör + boru + kazan)'], ['elektrik', 'Elektrikli ısıtıcı (boru ve kazan yok)']], k.sistem)}</select>`)}</div><div>${el_ ? F('Elektrikli ısıtıcı tipi', `<select data-q="elTip" data-s>${opt(Object.entries(MT.ELK).map(([a, b]) => [a, b.ad]), k.elTip)}</select>`) : ''}</div></div>`;
    if (el_) { el.innerHTML = ust + `<div class="g2"><div>${F('Güç payı (%) — ısı kaybının üstüne', N('emniyet', 5))}</div><div></div></div>
<div class="bar"><button class="pri" data-c="KALORIFER">Isıtıcıları yerleştir</button><button data-c="ISITICILISTE">Cihaz listesi tablosu</button><button data-c="TESISATPAFTA I">Isıtma paftası</button><button data-c="KALORIFERSIL">Sil</button></div>
${eh ? `<div class="kart"><div><b>${eh.R.length} cihaz</b><span>${f(eh.P / 1000, 1)} kW kurulu güç</span></div><div><b>${f(eh.Qg / 1000, 1)} kW</b><span>Isı kaybı</span></div><div><b>${f(eh.I3, 1)} A</b><span>Toplam akım (400 V 3 faz)</span></div><div><b>${Math.round(eh.Qyil).toLocaleString('tr-TR')} kWh</b><span>Yıllık tüketim (ön hesap)</span></div></div><p class="mut">Her cihaz için akım, sigorta ve kablo önerisi raporun 7. bölümünde ve cihaz listesi tablosundadır.</p>` : '<p class="mut">"Isıtıcıları yerleştir" her mahale ısı kaybını karşılayan elektrikli ısıtıcıları pencere altlarına (yoksa duvar ortasına) koyar. Boru, kolon, kazan ve baca çizilmez.</p>'}`; }
    else el.innerHTML = ust + `<div class="g2"><div>
${F('Gidiş / dönüş suyu sıcaklığı (°C)', `<div style="display:flex;gap:6px"><input type="number" data-q="tg" value="${k.tg}" style="flex:1"><input type="number" data-q="td" value="${k.td}" style="flex:1"></div>`)}
${F('Radyatör tipi (ilk tercih)', `<select data-q="radTip" data-s>${opt(Object.entries(MT.RAD).map(([a, b]) => [a, 'Panel ' + b[0]]), k.radTip)}</select>`)}
${F('Radyatör yüksekliği (mm)', `<select data-q="radH">${opt([300, 400, 500, 600, 900].map(v => [v, v]), k.radH)}</select>`)}
${F('En büyük radyatör boyu (m)', N('Lmax', 0.1))}
${F('Boru cinsi', `<select data-q="boru" data-s>${opt(Object.entries(MT.BORU).map(([a, b]) => [a, b.ad]), k.boru)}</select>`)}
</div><div>
${F('En büyük özgül sürtünme R (Pa/m)', N('Rmax', 10))}
${F('En büyük su hızı (m/s)', N('vmax', 0.1))}
${F('Yerel kayıplar (sürtünmenin %\'si)', N('yerel', 5))}
${F('Radyatör + vana kaybı (kPa)', N('radKayip', 0.5))}
${F('Kazan – kolon boru boyu (m) / kazan payı (%)', `<div style="display:flex;gap:6px"><input type="number" data-q="kazanL" value="${k.kazanL}" style="flex:1"><input type="number" data-q="emniyet" value="${k.emniyet}" style="flex:1"></div>`)}
</div></div>
<div class="bar"><button class="pri" data-c="KALORIFER">Tesisatı oluştur (radyatör + boru)</button><button data-c="RADYATORYERLESTIR">Yalnız radyatörler</button><button data-c="KOLONYERI">Kolon yerini seç</button><button data-c="KALORIFERBORU">Boruları yeniden çiz</button><button data-c="KOLONSEMASI">Kolon şeması</button><button data-c="TESISATPAFTA I">Isıtma paftası</button><button data-c="KALORIFERSIL">Sil</button></div>
${h ? `<div class="kart"><div><b>${nR} radyatör</b><span>${f(h.Qtop / 1000, 1)} kW kurulu güç</span></div><div><b>${f(h.Qk / 1000, 1)} kW</b><span>Kazan gücü</span></div><div><b>${f(h.debi / 1000, 2)} m³/h · ${f(h.Hp / 9810, 1)} mSS</b><span>Sirkülasyon pompası</span></div><div><b>${Math.ceil(h.Vg / 5) * 5} l</b><span>Kapalı genleşme deposu</span></div></div><p class="mut">Ana boru ${h.kaz.dn} · kritik devre ${f(h.krit.dpTop / 1000, 1)} kPa. Ayarları değiştirdikten sonra "Tesisatı oluştur" ile yenileyin; ayrıntılı radyatör ve boru tabloları raporun 7. bölümündedir.</p>` : '<p class="mut">Önce mahaller ve ısı kaybı hazır olmalı. "Tesisatı oluştur" radyatörleri pencere altlarına yerleştirir, sizden kolon yerini ister ve çift borulu şebekeyi çizer.</p>'}`;
    el.querySelectorAll('[data-q]').forEach(i => i.onchange = () => { const q = i.dataset.q; k[q] = i.dataset.s != null ? i.value : (num(i.value) ?? k[q]); dirty(); if (i.dataset.r != null) tIsitma(el, m); });
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => kom(b.dataset.c));
  };

  /* ---------- sekme: ISI MERKEZİ ---------- */
  const tMerkez = (el, m) => {
    const k = MT.im(), h = MT.isiMerkeziHesap(), F = (l, x) => `<div class="fld"><label>${l}</label>${x}</div>`, kom = async c => { C.closeModal(); try { await C.cmd.run(c); } catch (e) { } };
    if (!h) { el.innerHTML = '<p>Önce mahalleri ve ısı kaybını oluşturun.</p>'; return; }
    if (MT.kal().sistem === 'elektrik') { el.innerHTML = '<p>Isıtma şekli <b>elektrikli ısıtıcı</b> seçili: kazan, brülör, baca, pompa ve genleşme deposu gerekmez. Sıcak sulu sisteme dönmek için 5 · Kalorifer sekmesinden ısıtma şeklini değiştirin.</p>'; return; }
    el.innerHTML = `<div class="g2"><div>
${F('Sistem', `<select data-q="sistem" data-s>${opt([['merkezi', 'Merkezi sistem (kazan dairesi)'], ['kombi', 'Bireysel (kombi / kat kaloriferi)']], k.sistem)}</select>`)}
${F('Yakıt', `<select data-q="yakit" data-s>${opt(Object.entries(MT.YAKIT).map(([a, b]) => [a, b[0]]), k.yakit)}</select>`)}
${F('Kazan tipi', `<select data-q="kazanTip" data-s>${opt([['yogusmali', 'Yoğuşmalı'], ['konvansiyonel', 'Konvansiyonel']], k.kazanTip)}</select>`)}
</div><div>
${F('Kazan adedi (0 = kendiliğinden)', `<input type="number" min="0" max="6" data-q="kazanAdet" value="${k.kazanAdet}">`)}
${F('Kazan verimi % (0 = tipe göre)', `<input type="number" data-q="verim" value="${k.verim}">`)}
${F('Baca yüksekliği m (0 = bina + 1,5 m)', `<input type="number" step="0.5" data-q="bacaH" value="${k.bacaH}">`)}
${F('Yedek pompa', `<select data-q="pompaYedek">${opt([[1, 'Var (1 asıl + 1 yedek)'], [0, 'Yok']], k.pompaYedek)}</select>`)}
</div></div>
${k.sistem === 'merkezi' ? `<div class="kart"><div><b>${h.adet} × ${h.kW} kW</b><span>Kazan · brülör ${f(h.QB, 0)} kW · ${f(h.yakitSaat, 1)} ${h.Y[2]}/h</span></div><div><b>Ø${h.bacaD} mm</b><span>Baca, h = ${f(h.bacaH, 1)} m (${f(h.F, 0)} cm² gerekli)</span></div><div><b>${h.pompa.ad}</b><span>Pompa ${f(h.debi, 2)} m³/h · ${f(h.Hm, 1)} mSS</span></div><div><b>${h.depo} l · ${h.ev}</b><span>Genleşme deposu · emniyet ventili</span></div></div>
<p class="mut">Yıllık yakıt ≈ ${Math.round(h.yakitYil).toLocaleString('tr-TR')} ${h.Y[2]} · kollektör Ø${Math.ceil(h.kolD / 5) * 5} mm · menfezler alt ${Math.round(h.menA)} / üst ${Math.round(h.menU)} cm² · kazan dairesi en az ${f(h.odaB, 2)} × ${f(h.odaL, 2)} m, h ≥ ${f(h.odaH, 2)} m.</p>` : ''}
<div class="sc" style="max-height:26vh"><table><tr><th>Bağımsız bölüm</th><th class="n">Mahal</th><th class="n">Isı kaybı W</th><th>Cihaz</th><th class="n">Kapasite</th><th class="n">Gaz Nm³/h</th></tr>${h.kombi.map(g => `<tr><td>${esc(g.ad)}</td><td class="n">${g.n}</td><td class="n">${Math.round(g.Q).toLocaleString('tr-TR')}</td><td>${g.asim ? '<span class="bad">kapasite aşılıyor — merkezi sistem</span>' : esc(g.tip)}</td><td class="n">${g.kw} kW</td><td class="n">${f(g.gaz, 2)}</td></tr>`).join('')}</table></div>
<div class="bar" style="margin-top:10px"><button class="pri" data-c="ISIMERKEZISEMA">Akış şemasını çiz</button><button data-c="KAZANDAIRESI">Kazan dairesi yerleşimini çiz</button><button data-rap>Rapor</button></div><p class="mut">Tüm bağıntılar ve kabuller raporun 8. bölümündedir. Kombi seçimi için mahalleri bölümlere ayırmak isterseniz Mahaller sekmesindeki "Bölüm" sütununu doldurun.</p>`;
    el.querySelectorAll('[data-q]').forEach(i => i.onchange = () => { const q = i.dataset.q; k[q] = i.dataset.s != null ? i.value : (num(i.value) ?? k[q]); dirty(); render(); });
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => kom(b.dataset.c));
    el.querySelector('[data-rap]').onclick = () => MT.raporAc('kayip');
  };

  /* ---------- sekme: SOĞUTMA ---------- */
  const tSogutma = (el, m) => {
    const k = MT.sog(), kz = MT.kazancHesapla(), F = (l, x) => `<div class="fld"><label>${l}</label>${x}</div>`, N = (q, st = 1) => `<input type="number" step="${st}" data-q="${q}" value="${k[q]}">`, kom = async c => { C.closeModal(); try { await C.cmd.run(c); } catch (e) { } };
    if (!kz.res.length) { el.innerHTML = '<p>Önce mahalleri oluşturun.</p>'; return; }
    const nU = C.doc.ents.filter(e => e.type === 'mtfc').length, h = nU ? MT.sogutmaHesap() : null, P2 = (a, b) => `<div style="display:flex;gap:6px"><input type="number" step="0.5" data-q="${a}" value="${k[a]}" style="flex:1"><input type="number" step="0.5" data-q="${b}" value="${k[b]}" style="flex:1"></div>`;
    el.innerHTML = `<div class="g2"><div>
${F('Dış tasarım: kuru / yaş termometre (°C)', P2('tdb', 'twb'))}
${F('Günlük sıcaklık farkı (K) / enlem (°)', P2('dr', 'enlem'))}
${F('İç tasarım: sıcaklık (°C) / bağıl nem (%)', P2('ti', 'rh'))}
${F('Taze hava: m³/h·kişi / en az hacim/h', P2('tazeKisi', 'tazeAch'))}
</div><div>
${F('Soğutma sistemi', `<select data-q="sistem" data-s>${opt([['fancoil', 'Fancoil + chiller (soğutulmuş su)'], ['split', 'Split klima'], ['rooftop', 'Rooftop paket klima (kanallı, ısıtma + soğutma)']], k.sistem)}</select>`)}
${F('İç gölgeleme katsayısı / emniyet %', P2('golge', 'emniyet'))}
${F('Soğutulmuş su gidiş / dönüş (°C)', P2('tg', 'td'))}
${F('Boru cinsi', `<select data-q="boru" data-s>${opt(Object.entries(MT.BORU).map(([a, b]) => [a, b.ad]), k.boru)}</select>`)}
</div></div>
<div class="kart"><div><b>${f(kz.Qblok / 1000, 1)} kW</b><span>Eş zamanlı yük · saat ${kz.tepe.t}:00</span></div><div><b>${f(kz.A ? kz.Qblok / kz.A : 0, 0)} W/m²</b><span>${f(kz.A, 0)} m² soğutulan alan</span></div><div><b>${h && !h.split && !h.yok ? h.chKW + ' kW chiller' : nU ? nU + ' iç ünite' : '—'}</b><span>${h && !h.split && !h.yok ? `pompa ${h.pompa.ad} · ${f(h.debi, 2)} m³/h · ${f(h.Hm, 1)} mSS` : 'cihazlar yerleştirilince hesaplanır'}</span></div><div><b>${nU} cihaz</b><span>${h && !h.yok ? f(h.Qkur / 1000, 1) + ' kW kurulu' : 'henüz yerleştirilmedi'}</span></div></div>
<div class="sc" style="max-height:30vh"><table><tr><th>Soğut</th><th>No</th><th>Mahal</th><th class="n">Alan m²</th><th>Kişi</th><th>Aydınlatma W/m²</th><th>Cihaz W/m²</th><th class="n">Duyulur W</th><th class="n">Gizli W</th><th class="n">Toplam W</th><th class="n">W/m²</th><th class="n">Tepe</th></tr>${kz.res.map(({ e, r }) => { const u = MT.kulOf(e); return `<tr><td><input type="checkbox" data-sg="${e.id}" ${u.sog ? 'checked' : ''}></td><td>${esc(e.no)}</td><td>${esc(e.ad)}</td><td class="n">${f(r.A, 1)}</td><td><input data-u="kisi" data-id="${e.id}" value="${e.kisi ?? ''}" placeholder="${u.kisi}" style="width:54px"></td><td><input data-u="aydW" data-id="${e.id}" value="${e.aydW ?? ''}" placeholder="${u.ayd}" style="width:64px"></td><td><input data-u="cihW" data-id="${e.id}" value="${e.cihW ?? ''}" placeholder="${u.cih}" style="width:64px"></td>${r.sog ? `<td class="n">${Math.round(r.Qd).toLocaleString('tr-TR')}</td><td class="n">${Math.round(r.Qg).toLocaleString('tr-TR')}</td><td class="n"><b>${Math.round(r.Q).toLocaleString('tr-TR')}</b></td><td class="n">${f(r.qA, 0)}</td><td class="n">${r.tepe.t}:00</td>` : '<td colspan="5" class="mut">soğutulmuyor</td>'}</tr>`; }).join('')}</table></div>
<div class="bar" style="margin-top:10px"><button class="pri" data-c="SOGUTMA">Soğutma tesisatını oluştur</button><button data-c="TESISATPAFTA S">Soğutma paftası</button><button data-c="FANCOILYERLESTIR">Yalnız cihazlar</button><button data-c="SOGUTMAKOLON">Kolon yerini seç</button><button data-c="SOGUTMABORU">Boruları yeniden çiz</button><button data-c="SOGUTMASEMASI">Kolon şeması</button><button data-c="SOGUTMASIL">Sil</button><button data-rap>Rapor</button></div>`;
    const rr = () => { dirty(); render(); };
    el.querySelectorAll('[data-q]').forEach(i => i.onchange = () => { const q = i.dataset.q; k[q] = i.dataset.s != null ? i.value : (num(i.value) ?? k[q]); rr(); });
    el.querySelectorAll('[data-sg]').forEach(i => i.onchange = () => { const e = C.byId(+i.dataset.sg); if (e) { e.sog = i.checked; rr(); } });
    el.querySelectorAll('[data-u]').forEach(i => i.onchange = () => { const e = C.byId(+i.dataset.id); if (e) { e[i.dataset.u] = i.value.trim() === '' ? null : num(i.value); rr(); } });
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => kom(b.dataset.c));
    el.querySelector('[data-rap]').onclick = () => MT.raporAc('kayip');
  };

  /* ---------- sekme: HAVALANDIRMA ---------- */
  const tHava = (el, m) => {
    const k = MT.hv(), H = MT.hvHesap(), F = (l, x) => `<div class="fld"><label>${l}</label>${x}</div>`, kom = async c => { C.closeModal(); try { await C.cmd.run(c); } catch (e) { } };
    if (!H.res.length) { el.innerHTML = '<p>Önce mahalleri oluşturun.</p>'; return; }
    const P2 = (a, b, st = 0.5) => `<div style="display:flex;gap:6px"><input type="number" step="${st}" data-q="${a}" value="${k[a]}" style="flex:1"><input type="number" step="${st}" data-q="${b}" value="${k[b]}" style="flex:1"></div>`, U = C.doc.ents.filter(e => e.type === 'mthv'), nf = U.filter(e => /fan$/.test(e.kind)).length, rt = U.find(e => e.kind === 'rooftop'), top = H.res.reduce((s, x) => s + (x.r.tur !== 'dogal' && x.r.tur !== 'yok' ? x.r.V : 0), 0);
    el.innerHTML = `<div class="g2"><div>
${F('Isı yükü için sıcaklık artışı Δt (K) / panjur hızı (m/s)', P2('dT', 'panjurV'))}
${F('Kanal: R en çok (Pa/m) / yükseklik en çok (mm)', P2('Rmax', 'hmax', 0.1))}
</div><div>
${F('Kanal hızı: ana / dal (m/s)', P2('vAna', 'vDal'))}
${F('Rooftop besleme sıcaklık farkı Δt (K)', `<input type="number" step="1" data-q="dTbes" value="${k.dTbes}">`)}
</div></div>
<div class="kart"><div><b>${Math.round(top).toLocaleString('tr-TR')} m³/h</b><span>Toplam mekanik havalandırma debisi</span></div><div><b>${nf} fan</b><span>${nf ? 'yerleştirildi' : 'henüz yerleştirilmedi'}</span></div><div><b>${C.doc.ents.filter(e => e.type === 'mtkanal').length} kanal parçası</b><span>egzoz + besleme</span></div><div><b>${rt ? 'Rooftop ' + rt.model : '—'}</b><span>${rt ? Math.round(rt.V).toLocaleString('tr-TR') + ' m³/h besleme' : 'rooftop yok'}</span></div></div>
<div class="sc" style="max-height:32vh"><table><tr><th>No</th><th>Mahal</th><th>Tip</th><th class="n">Hacim m³</th><th>n (1/h)</th><th>Isı yükü kW</th><th class="n">Değişim</th><th class="n">Kişi</th><th class="n">Isı</th><th class="n">V m³/h</th><th>Sistem</th></tr>${H.res.map(({ e, r }) => `<tr><td>${esc(e.no)}</td><td>${esc(e.ad)}</td><td class="mut">${esc((V.MAHAL[e.tip || 0] || [''])[0].split(' (')[0])}</td><td class="n">${f(r.hac, 0)}</td><td><input data-u="hvAch" data-id="${e.id}" value="${e.hvAch ?? ''}" placeholder="${r.ach}" style="width:54px"></td><td><input data-u="hvIsi" data-id="${e.id}" value="${e.hvIsi ?? ''}" placeholder="0" style="width:60px" title="Ortama verilen ısı (motor, pano, cihaz kayıpları) kW"></td><td class="n">${Math.round(r.Vach)}</td><td class="n">${r.Vkisi ? Math.round(r.Vkisi) : '—'}</td><td class="n">${r.Visi ? Math.round(r.Visi) : '—'}</td><td class="n"><b>${Math.round(r.V).toLocaleString('tr-TR')}</b></td><td><select data-tur="${e.id}">${opt([['oto', 'Kendiliğinden → ' + (MT.HVTUR[r.tur] || r.tur)], ['duvar', MT.HVTUR.duvar], ['cati', MT.HVTUR.cati], ['kanal', MT.HVTUR.kanal], ['hucre', MT.HVTUR.hucre], ['dogal', MT.HVTUR.dogal]], e.hvTur || 'oto')}</select></td></tr>`).join('')}</table></div>
<div class="bar" style="margin-top:10px"><button class="pri" data-c="HAVALANDIRMA">Havalandırmayı oluştur (fan + kanal)</button><button data-c="TESISATPAFTA H">Havalandırma paftası</button><button data-c="HUCREFANYERI">Hücreli fan yeri</button><button data-c="ROOFTOP">Rooftop + besleme kanalları</button><button data-c="ROOFTOPYERI">Rooftop yeri</button><button data-c="HAVALANDIRMASIL">Sil</button><button data-rap>Rapor</button></div><p class="mut">Mahal tipini Mahaller sekmesinden seçin (pompa odası, ıslak hazne, blower odası, kimyasal odası gibi tesis tipleri listede). Motorlu ekipman olan hacimlerde "Isı yükü" sütununa ortama verilen ısıyı kW olarak girin; debi ısı yüküne göre büyür.</p>`;
    const rr = () => { dirty(); render(); };
    el.querySelectorAll('[data-q]').forEach(i => i.onchange = () => { k[i.dataset.q] = num(i.value) ?? k[i.dataset.q]; rr(); });
    el.querySelectorAll('[data-u]').forEach(i => i.onchange = () => { const e = C.byId(+i.dataset.id); if (e) { e[i.dataset.u] = i.value.trim() === '' ? null : num(i.value); rr(); } });
    el.querySelectorAll('[data-tur]').forEach(i => i.onchange = () => { const e = C.byId(+i.dataset.tur); if (e) { e.hvTur = i.value; rr(); } });
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => kom(b.dataset.c));
    el.querySelector('[data-rap]').onclick = () => MT.raporAc('kayip');
  };

  const render = () => {
    const p = document.querySelector('#mtP'); if (!p) return; const m = MT.set();
    p.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === cur));
    ({ proje: tProje, yapi: tYapi, mahal: tMahal, sonuc: tSonuc, isitma: tIsitma, merkez: tMerkez, sogutma: tSogutma, hava: tHava, sihhi: (el, mm) => (MT.sihhiPanel ? MT.sihhiPanel(el, mm, { F: (l, h) => `<div class="fld"><label>${l}</label>${h}</div>`, opt, num, dirty, f }) : (el.innerHTML = '<p>Sıhhi tesisat modülü yüklü değil.</p>')) })[cur](p.querySelector('#mtB'), m);
  };
  MT.panel = tab => {
    if (tab) cur = tab;
    const b = C.modal('Mekanik Tesisat — ısı yalıtımı ve ısı kaybı', `<style>${css}</style><div id="mtP"><div class="tabs"><button data-t="proje">1 · Proje</button><button data-t="yapi">2 · Yapı elemanları</button><button data-t="mahal">3 · Mahaller</button><button data-t="sonuc">4 · Sonuç ve rapor</button><button data-t="isitma">5 · Kalorifer</button><button data-t="merkez">6 · Isı merkezi</button><button data-t="sogutma">7 · Soğutma</button><button data-t="hava">8 · Havalandırma</button><button data-t="sihhi">9 · Sıhhi tesisat</button></div><div id="mtB"></div></div>`);
    const box = document.querySelector('#modal .box'); if (box) box.classList.add('wide');
    b.querySelectorAll('.tabs button').forEach(x => x.onclick = () => { cur = x.dataset.t; render(); });
    render();
  };

  C.addCommand(['MEKANIKTESISAT', 'TESISAT', 'ISIYALITIM', 'MEKTES'], 'Mekanik Tesisat paneli: proje kabulleri, yapı elemanları (U değeri), mahaller, ısı yalıtımı ve ısı kaybı sonuçları, rapor.', async () => MT.panel());
  C.addCommand(['ISIKAYBI', 'ISIKAYBIHESAP'], 'Isı kaybı hesabı: tüm mahaller için Q = Q0·(1+ZD+ZH)+Qs; sonuç mahal etiketlerine yazılır.', async () => { const h = MT.hesapla(); if (!h.res.length) { C.warn('Mahal yok: önce MAHALBUL.'); return; } C.changed(); C.log(`Isı kaybı: ${h.res.filter(x => x.r.ti != null).length} mahal · toplam ${f(h.Q / 1000, 2)} kW · ${f(h.A ? h.Q / h.A : 0, 0)} W/m².`); });
  C.addCommand(['ISIRAPOR', 'MTRAPOR'], 'Isı yalıtımı + ısı kaybı raporu (grafikli; yazdır / PDF / Word).', async () => { MT.raporAc('hepsi'); });
  C.addCommand(['ISIYALITIMRAPOR'], 'Isı yalıtım raporu (TS 825: U değerleri, yoğuşma, özgül ısı kaybı, yıllık enerji).', async () => { MT.raporAc('yalitim'); });
  C.addCommand(['ISIKAYBIRAPOR'], 'Isı kaybı raporu (mahal cetvelleri, kat planı ısı haritası).', async () => { MT.raporAc('kayip'); });

  /* şerit: Tesisat sekmesi */
  const rib = () => { const R = C.ribbon; if (!R || !R.tabs || R.tabs.some(t => t[0] === 'Tesisat')) return; const B = (cmd, t, i) => ({ cmd, t, i, big: true }), s = (cmd, t, i) => ({ cmd, t, i }); const at = R.tabs.findIndex(t => t[0] === 'Hesap'); R.tabs.splice(at < 0 ? R.tabs.length : at, 0, ['Tesisat', [['Mekanik tesisat', [B('MEKANIKTESISAT', 'Tesisat paneli', 'menu')]], ['Mahal', [B('MAHALBUL', 'Mahal bul', 'dot'), s('MAHALCIZ', 'Elle mahal', 'prop'), s('MAHALSIL', 'Mahalleri sil', 'prop')]], ['Kalorifer', [B('KALORIFER', 'Kalorifer tesisatı', 'pump'), s('RADYATORYERLESTIR', 'Radyatörler', 'prop'), s('KOLONYERI', 'Kolon yeri', 'dot'), s('KALORIFERBORU', 'Borular', 'prop'), s('KOLONSEMASI', 'Kolon şeması', 'prop')]], ['Havalandırma', [B('HAVALANDIRMA', 'Havalandırma', 'rot'), B('ROOFTOP', 'Rooftop', 'pump'), s('HUCREFANYERI', 'Hücreli fan yeri', 'dot'), s('ROOFTOPYERI', 'Rooftop yeri', 'dot'), s('HAVALANDIRMASIL', 'Sil', 'prop')]], ['Soğutma', [B('SOGUTMA', 'Soğutma tesisatı', 'pump'), s('ISIKAZANCI', 'Isı kazancı', 'calc'), s('FANCOILYERLESTIR', 'Cihazlar', 'prop'), s('SOGUTMABORU', 'Borular', 'prop'), s('SOGUTMASEMASI', 'Kolon şeması', 'prop')]], ['Isı merkezi', [B('ISIMERKEZISEMA', 'Akış şeması', 'pump'), s('KAZANDAIRESI', 'Kazan dairesi', 'prop'), s('ISIMERKEZI', 'Kazan hesabı', 'calc')]], ['Isı hesabı', [B('ISIKAYBI', 'Isı kaybı', 'calc'), B('ISIRAPOR', 'Rapor', 'calc'), s('ISIYALITIMRAPOR', 'Yalıtım raporu', 'calc'), s('ISIKAYBIRAPOR', 'Isı kaybı raporu', 'calc')]], ['Sıhhi tesisat', [B('SIHHITESISAT', 'Sıhhi tesisat', 'pump'), s('ARMATURYERLESTIR', 'Armatürler', 'prop'), s('ARMATUR', 'Armatür ekle', 'prop'), s('ARMATURMODEL', 'Model ata', 'prop'), s('SUGIRISI', 'Su girişi', 'dot'), s('ROGARYERI', 'Rögar yeri', 'dot'), s('SIHHIBORU', 'Borular', 'prop')]], ['Yalıtım ve paftalar', [B('YALITIMUYGULA', 'Yalıtımı uygula', 'prop'), s('ISIYALITIMDETAY', 'Yalıtım detayı', 'prop'), B('TESISATPAFTA', 'Tesisat paftaları', 'prop'), B('CAKISMA', 'Çakışma denetimi', 'prop'), s('DELIKAC', 'Geçiş delikleri', 'prop'), s('CAKISMASIL', 'İşaretleri sil', 'prop'), s('TESISATYAZI', 'Yazı boyutu', 'prop'), s('TESISATCIKTI', 'Çıktı al (PDF)', 'print'), s('TESISATDXF', 'DXF kaydet', 'prop')]]]]); try { R.render(); } catch (e) { } };
  rib(); setTimeout(rib, 800);
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : (globalThis.C = globalThis.C || {}));

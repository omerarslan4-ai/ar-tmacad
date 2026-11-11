/* ArıtmaCAD — AİLELER PENCERESİ: başlık / alt başlık ağacı ve tüm yüklenen elemanlar
   Aileler penceresinin sol listesi bir ağaç olur:  Vanalar › Çekvalf › Eğik diskli (tilting) …  ·  Pompalar › Dalgıç pompa › Islak tip …
   Ağaçta görünenler:
     • parametrik aileler (KSB Amarex N, Wilo Rexa SUPRA, penstock, kaba ızgara …),
     • kütüphaneye yüklenen 3B ekipmanlar (EKIPMANYUKLE: VAG, KSB, 3Dfindit … modelleri),
     • DWG/DXF'den yüklenen blok / vana çizimleriniz,
     • hazır şematik vanalar (EN 558 boy, PN16 flanş) — tüm çaplar (DN50 … DN600).
   Aynı ürünün farklı çapları tek satırda DN düğmeleri olarak toplanır. Bir eleman yanlış başlıktaysa sağ panelden "Başlık" ile taşınır
   (tanıma kaydedilir: def.agac = ['Vanalar', 'Çekvalf', 'Eğik diskli (tilting)']).
   Yerleşim: aile → aile penceresinin kendi düğmeleri; ekipman → EKIPMANEKLE; blok / şematik vana → VANAEKLE. */
(function (C) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ASC = s => (C.ascii ? C.ascii(String(s || '')) : String(s || '')).toLowerCase();

  /* ---------------- başlık ağacı (yaprak yolları) ---------------- */
  const AGAC = [
    ['Vanalar', [
      ['Sürgülü vana'], ['Kelebek vana'], ['Küresel vana'], ['Bıçaklı sürgülü vana'],
      ['Çekvalf', ['Klapeli (swing)', 'Eğik diskli (tilting)', 'Bilyalı (toplu)', 'Çift klapeli (wafer)', 'Genel']],
      ['Kontrol / ayar vanası'], ['Vantuz'], ['Pislik tutucu'], ['Basınç düşürücü'],
      ['Demontaj parçası', ['Çift flanşlı', 'Tek flanşlı (boru ucu)', 'Genel']], ['Debimetre'], ['Diğer vanalar']]],
    ['Pompalar', [
      ['Dalgıç pompa', ['Islak tip', 'Kuru tip']], ['Santrifüj pompa', ['Yatay', 'Dikey (in-line)']],
      ['Dozaj pompası'], ['Vidalı / helezon pompa'], ['Diğer pompalar']]],
    ['Kapaklar ve savaklar', [['Penstock / kanal kapağı'], ['Savak'], ['Diğer kapaklar']]],
    ['Izgaralar ve elekler', [['Kaba ızgara'], ['İnce ızgara / elek'], ['Diğer']]],
    ['Diğer ekipman', [['Mikser'], ['Blower / kompresör'], ['Difüzör'], ['Sıyırıcı / köprü'], ['Dekantör / susuzlaştırma'], ['Tank / depo'], ['Vinç / kaldırma'], ['Ölçüm / enstrüman'], ['Diğer']]],
  ];
  const YOLLAR = []; for (const [a, al] of AGAC) for (const [b, c] of al) { if (c) for (const x of c) YOLLAR.push([a, b, x]); else YOLLAR.push([a, b]); }
  const yk = p => p.join(' › ');
  const gecerli = p => Array.isArray(p) && YOLLAR.some(y => yk(y) === yk(p));

  /* ---------------- sınıflandırma ---------------- */
  const vanaYolu = (tur, ad) => {
    const s = ASC(ad + ' ' + tur);
    if (/cek ?valf|check|non.?return|geri ?don/.test(s) || tur === 'Çekvalf') {
      const alt = /tilt|egik/.test(s) ? 'Eğik diskli (tilting)' : /swing|klape|clapet/.test(s) && !/cift|dual|wafer/.test(s) ? 'Klapeli (swing)' : /ball|bilya|top(lu)?\b/.test(s) ? 'Bilyalı (toplu)' : /wafer|dual|cift/.test(s) ? 'Çift klapeli (wafer)' : 'Genel';
      return ['Vanalar', 'Çekvalf', alt];
    }
    if (/demontaj|dismant/.test(s) || tur === 'Demontaj parçası') return ['Vanalar', 'Demontaj parçası', /tek ?flans|single|boru ?uc|ff ?/.test(s) ? 'Tek flanşlı (boru ucu)' : /cift ?flans|double|flanged/.test(s) ? 'Çift flanşlı' : 'Genel'];
    if (/b[ıi]cakl|knife/.test(s) || tur === 'Bıçaklı vana') return ['Vanalar', 'Bıçaklı sürgülü vana'];
    if (/kelebek|butterfly/.test(s)) return ['Vanalar', 'Kelebek vana'];
    if (/kuresel|\bball\b/.test(s)) return ['Vanalar', 'Küresel vana'];
    if (/surgulu|gate|surgu/.test(s)) return ['Vanalar', 'Sürgülü vana'];
    if (/vantuz|air ?valve|hava ?tahliye/.test(s)) return ['Vanalar', 'Vantuz'];
    if (/pislik|strainer|filtre/.test(s)) return ['Vanalar', 'Pislik tutucu'];
    if (/basinc ?dus|prv|reducing/.test(s)) return ['Vanalar', 'Basınç düşürücü'];
    if (/debimetre|flow ?meter|emf|manyetik/.test(s)) return ['Vanalar', 'Debimetre'];
    if (/kontrol|control|zeta|ayar|regul|riko|plunger|igne|needle|piston/.test(s)) return ['Vanalar', 'Kontrol / ayar vanası'];
    return null;
  };
  const pompaYolu = (tur, ad) => {
    const s = ASC(ad + ' ' + tur);
    if (/dalgic|submers|amarex|rexa|flygt|\bsl1?\b|\bse1?\b|ksb.*krt|abs xfp/.test(s) || tur === 'Dalgıç pompa') return ['Pompalar', 'Dalgıç pompa', /kuru|dry|\bt-?\d|\bd\b.*kurulum/.test(s) ? 'Kuru tip' : 'Islak tip'];
    if (/dozaj|dosing|metering/.test(s)) return ['Pompalar', 'Dozaj pompası'];
    if (/vidal|helezon|screw|archimed|progres|mono/.test(s)) return ['Pompalar', 'Vidalı / helezon pompa'];
    if (/in-?line|dikey|vertical/.test(s)) return ['Pompalar', 'Santrifüj pompa', 'Dikey (in-line)'];
    if (/santrif|centrif|etanorm|norm|yatay|horizontal|pompa|pump/.test(s)) return ['Pompalar', 'Santrifüj pompa', 'Yatay'];
    return null;
  };
  const EKTUR = { 'Mikser': 'Mikser', 'Blower / kompresör': 'Blower / kompresör', 'Difüzör': 'Difüzör', 'Sıyırıcı / köprü': 'Sıyırıcı / köprü', 'Dekantör / susuzlaştırma': 'Dekantör / susuzlaştırma', 'Tank / depo': 'Tank / depo', 'Vinç / kaldırma': 'Vinç / kaldırma', 'Ölçüm / enstrüman': 'Ölçüm / enstrüman' };
  const yolBul = (tur, ad, aileKat) => {
    if (tur === 'Izgara / elek' || /izgara|screen|elek/.test(ASC(ad + ' ' + (aileKat || '')))) return ['Izgaralar ve elekler', /ince|fine|elek|drum|tambur|step/.test(ASC(ad)) ? 'İnce ızgara / elek' : 'Kaba ızgara'];
    if (/penstock|kapak|gate ?(valve)? ?kanal|savak kapa/.test(ASC(ad))) return ['Kapaklar ve savaklar', 'Penstock / kanal kapağı'];
    if (/savak|weir/.test(ASC(ad))) return ['Kapaklar ve savaklar', 'Savak'];
    if (tur === 'Pompa' || tur === 'Dalgıç pompa' || tur === 'Dozaj / kimyasal' && /pomp|pump/.test(ASC(ad))) return pompaYolu(tur, ad) || ['Pompalar', 'Diğer pompalar'];
    const v = vanaYolu(tur, ad); if (v) return v;
    const p = pompaYolu(tur, ad); if (p && (tur === 'Ekipman' || tur === 'Diğer ekipman' || tur === 'Diğer' || !tur)) return p;
    if (EKTUR[tur]) return ['Diğer ekipman', EKTUR[tur]];
    if (tur === 'Vana') return ['Vanalar', 'Diğer vanalar'];
    return ['Diğer ekipman', 'Diğer'];
  };
  const AILEYOL = { dalgic_pompa_ksb_amarexn: ['Pompalar', 'Dalgıç pompa', 'Islak tip'], dalgic_pompa_wilo_supra: ['Pompalar', 'Dalgıç pompa', 'Islak tip'], dalgic_pompa_grundfos: ['Pompalar', 'Dalgıç pompa', 'Islak tip'], penstock_kanal: ['Kapaklar ve savaklar', 'Penstock / kanal kapağı'], dalgic_mikser: ['Diğer ekipman', 'Mikser'], kaba_izgara: ['Izgaralar ve elekler', 'Kaba ızgara'], gezer_kopru: ['Diğer ekipman', 'Köprü / sıyırıcı'], difuzor_dusumu: ['Diğer ekipman', 'Havalandırma'], kum_seperatoru: ['Diğer ekipman', 'Kum ekipmanı'], bant_konveyor: ['Diğer ekipman', 'Konveyör'], cop_konteyner: ['Diğer ekipman', 'Konteyner'] };

  /* ---------------- öğeleri topla ---------------- */
  const dnOf = d => d.dn || (C.parseBlockName ? C.parseBlockName(d.name).dn : null) || null;
  const temelAd = n => String(n || '').replace(/[_\-\s]*(DN|Ø|⌀)\s*[-_ ]?\d{2,4}/ig, '').replace(/[_\-\s]+(plan|kesit|yan|side|top|section)\b/ig, '').replace(/\s{2,}/g, ' ').trim() || String(n || '');
  const topla = (fams) => {
    const og = []; // { yol, kaynak:'aile'|'ekipman'|'blok'|'sema', ad, dnler:[{dn, id, view}], id }
    for (const f of fams) og.push({ yol: (gecerli(f.agac) && f.agac) || AILEYOL[f.id] || yolBul('', f.ad, f.kat), kaynak: 'aile', ad: f.ad, id: f.id });
    const grup = new Map();
    for (const d of (C.blib ? C.blib.all() : [])) {
      if (!d || !d.id || String(d.id).startsWith('FIT_')) continue;
      const kay = d.mek ? 'ekipman' : 'blok', yol = gecerli(d.agac) ? d.agac : yolBul(d.tur, d.name || '', ''), dn = dnOf(d);
      const key = kay + '|' + yk(yol) + '|' + ASC(temelAd(d.name)) + '|' + (d.marka || '');
      let g = grup.get(key); if (!g) { g = { yol, kaynak: kay, ad: temelAd(d.name) + (d.marka ? ' · ' + d.marka : ''), dnler: [], id: d.id }; grup.set(key, g); og.push(g); }
      g.dnler.push({ dn, id: d.id, view: d.view });
    }
    for (const g of og) if (g.dnler) g.dnler.sort((a, b) => (a.dn || 0) - (b.dn || 0) || String(a.view).localeCompare(String(b.view)));
    for (const tur of (C.SCHEMA_TURLER || [])) og.push({ yol: tur === 'Çekvalf' ? ['Vanalar', 'Çekvalf', 'Genel'] : tur === 'Demontaj parçası' ? ['Vanalar', 'Demontaj parçası', 'Genel'] : (vanaYolu(tur, tur) || ['Vanalar', 'Diğer vanalar']), kaynak: 'sema', ad: `${tur} — şematik (EN 558, PN16)`, tur, dnler: (C.SCHEMA_DNS || []).map(dn => ({ dn, sema: true })) });
    return og;
  };

  /* ---------------- ağacı çiz ---------------- */
  const ACIK = 'aritmacad.aileAgacAcik';
  const acikOku = () => { try { return JSON.parse(localStorage.getItem(ACIK) || '{"Pompalar":1,"Vanalar":1}'); } catch (e) { return {}; } };
  const acikYaz = o => { try { localStorage.setItem(ACIK, JSON.stringify(o)); } catch (e) { } };
  const ROZET = { aile: ['parametrik', '#2e7d32'], ekipman: ['3B model', '#1565c0'], blok: ['blok', '#6a4fb3'], sema: ['şematik', '#78909c'] };
  let ara = '';
  const ciz = (L1, o) => {
    const og = topla(o.fams), acik = acikOku(), q = ASC(ara);
    { const sy = o.sec && o.sec.g ? o.sec.g.yol : (og.find(g => g.kaynak === 'aile' && g.id === o.fam) || {}).yol; if (sy) { acik[sy[0]] = 1; acik[sy[0] + '›' + sy[1]] = 1; } } // seçili öğenin dalı açık
    const uy = g => !q || ASC(g.ad + ' ' + yk(g.yol)).includes(q);
    const ogeHtml = g => {
      const [rz, rc] = ROZET[g.kaynak], secili = (g.kaynak === 'aile' && !o.sec && g.id === o.fam) || (o.sec && o.sec.grupId === (g.id || g.tur) && o.sec.kaynak === g.kaynak);
      const st = secili ? 'border-color:var(--acc,#4c9be8);background:rgba(76,155,232,.15)' : '';
      const rozet = `<span style="font-size:10px;padding:0 4px;border-radius:3px;background:${rc};color:#fff;margin-left:4px">${rz}</span>`;
      if (g.kaynak === 'aile') return `<button data-f="${esc(g.id)}" style="display:block;width:100%;text-align:left;margin:2px 0;${st}">${esc(g.ad)}${rozet}</button>`;
      const dns = g.dnler.filter((x, i, a) => a.findIndex(y => y.dn === x.dn) === i);
      const chip = x => `<button data-k="${g.kaynak}" data-g="${esc(g.id || g.tur)}" data-id="${esc(x.id || '')}" data-dn="${x.dn || ''}" style="padding:1px 5px;margin:1px;font-size:11px;${o.sec && o.sec.kaynak === g.kaynak && o.sec.grupId === (g.id || g.tur) && String(o.sec.dn) === String(x.dn || '') ? 'border-color:var(--acc,#4c9be8);background:rgba(76,155,232,.25)' : ''}">${x.dn ? 'DN' + x.dn : 'ekle'}</button>`;
      return `<div style="margin:3px 0;padding:3px 4px;border:1px solid var(--line,#3a4250);border-radius:4px;${st}"><div style="font-size:12px">${esc(g.ad)}${rozet}</div><div>${dns.map(chip).join('')}</div></div>`;
    };
    let h = `<input id="agAra" placeholder="Ara (kelebek, DN150, KSB …)" value="${esc(ara)}" style="width:100%;margin-bottom:6px">`;
    for (const [a, al] of AGAC) {
      const ogA = og.filter(g => g.yol[0] === a && uy(g)); if (q && !ogA.length) continue;
      const sayA = ogA.length;
      h += `<details data-ac="${esc(a)}" ${acik[a] || q ? 'open' : ''} style="margin:4px 0"><summary style="cursor:pointer;font-weight:600;font-size:13px">${esc(a)} <span class="hint">(${sayA})</span></summary><div style="padding-left:8px">`;
      for (const [b, c] of al) {
        const ogB = ogA.filter(g => g.yol[1] === b); if (!ogB.length && (q || !c)) { if (!ogB.length && !q) h += `<div class="hint" style="font-size:12px;margin:2px 0;opacity:.55">${esc(b)}</div>`; continue; }
        const kb = a + '›' + b;
        h += `<details data-ac="${esc(kb)}" ${acik[kb] || q ? 'open' : ''} style="margin:2px 0"><summary style="cursor:pointer;font-size:12.5px">${esc(b)} <span class="hint">(${ogB.length})</span></summary><div style="padding-left:8px">`;
        if (c) for (const x of c) { const ogC = ogB.filter(g => g.yol[2] === x); if (!ogC.length) { if (!q) h += `<div class="hint" style="font-size:11.5px;margin:1px 0;opacity:.55">${esc(x)} — henüz yok</div>`; continue; } h += `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;opacity:.75;margin:5px 0 2px">${esc(x)}</div>` + ogC.map(ogeHtml).join(''); }
        else h += ogB.map(ogeHtml).join('');
        h += '</div></details>';
      }
      h += '</div></details>';
    }
    L1.innerHTML = h;
    const ai = L1.querySelector('#agAra'); ai.oninput = () => { ara = ai.value; const pos = ai.selectionStart; ciz(L1, o); const n = L1.querySelector('#agAra'); n.focus(); n.setSelectionRange(pos, pos); };
    L1.querySelectorAll('details[data-ac]').forEach(d => d.ontoggle = () => { if (q) return; const a2 = acikOku(); if (d.open) a2[d.dataset.ac] = 1; else delete a2[d.dataset.ac]; acikYaz(a2); });
    L1.querySelectorAll('[data-f]').forEach(x => x.onclick = () => o.onAile(x.dataset.f));
    L1.querySelectorAll('[data-k]').forEach(x => x.onclick = () => { const g = og.find(y => y.kaynak === x.dataset.k && String(y.id || y.tur) === x.dataset.g); o.onOge({ kaynak: x.dataset.k, grupId: x.dataset.g, dn: x.dataset.dn ? +x.dataset.dn : null, id: x.dataset.id, g }); });
  };

  /* ---------------- sağ panel: ekipman / blok / şematik ---------------- */
  const svgEnts = (def, W = 300, H = 220) => {
    const bb = def.bb || C.defBox(def), w = Math.max(bb[2] - bb[0], 1e-6), h = Math.max(bb[3] - bb[1], 1e-6), k = Math.min((W - 16) / w, (H - 16) / h);
    const P = p => [W / 2 + (p[0] - (bb[0] + bb[2]) / 2) * k, H / 2 - (p[1] - (bb[1] + bb[3]) / 2) * k];
    const out = [`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background:#fff;border-radius:4px;border:1px solid #cfd6da"><g fill="none">`], stub = { layer: '0', color: 7, lt: 'CONTINUOUS', lw: 18 };
    for (const d of def.ents || []) { const t = C.T[d.type]; if (!t) continue; try { C.primsSvg(out, t.prims(d).map(q => Object.assign({}, q, { lw: 18 })), stub, P, k, true, k * 6); } catch (e) { } }
    out.push('</g></svg>'); return out.join('');
  };
  const resim = (m3, W = 320, H = 240) => { const u = C.ekipmanThumb ? C.ekipmanThumb(m3, W, H) : ''; return u ? `<img src="${u}" width="${W}" height="${H}" style="border-radius:4px;background:#20252c">` : ''; };
  const calis = t => C.runTool ? C.runTool(t) : C.cmd.script(t);
  let gorunus = 'plan';
  const goster = (s, P1, V1, cb) => {
    const g = s.g; if (!g) return;
    const yolSec = (def) => `<div class="fld" style="margin-top:10px"><label>Başlık (yanlış yerdeyse taşıyın)</label><select id="agYol">${YOLLAR.map(y => `<option ${yk(y) === yk(g.yol) ? 'selected' : ''}>${esc(yk(y))}</option>`).join('')}</select></div>`;
    let def = null, baslik = g.ad, bilgi = '', ekle = null, gor = '';
    if (s.kaynak === 'sema') {
      const dn = s.dn || 150; def = C.schematicDef(g.tur, dn, gorunus);
      baslik = `${g.tur} DN${dn}`; bilgi = `Hazır şematik vana — EN 558 boy, EN 1092 PN16 flanş (yaklaşık). Plan ve kesit görünüşü seçilebilir.`;
      gor = `<div class="fld"><label>Görünüş</label><select id="agGor"><option value="plan" ${gorunus === 'plan' ? 'selected' : ''}>Plan (3B gövdeli)</option><option value="kesit" ${gorunus === 'kesit' ? 'selected' : ''}>Kesit / görünüş</option></select></div>`;
      ekle = () => calis(`VANAEKLE "TUR=${g.tur}" DN=${dn} GORUNUS=${gorunus}`);
    } else {
      const it = (s.id && C.blib.cache[s.id]) || C.blib.cache[(g.dnler.find(x => String(x.dn || '') === String(s.dn || '')) || g.dnler[0]).id]; def = it; if (!def) return;
      baslik = def.name; const dn = dnOf(def);
      bilgi = `${s.kaynak === 'ekipman' ? '3B ekipman modeli' : 'Blok (DWG/DXF / 3B model)'}${dn ? ' · DN' + dn : ''}${def.dims ? ' · ' + def.dims.map(x => (+x).toFixed(2)).join(' × ') + ' m (G×D×Y)' : ''}${def.marka ? ' · ' + def.marka : ''}${def.src ? ' · kaynak: ' + def.src : ''}`;
      const ayni = g.dnler.filter(x => String(x.dn || '') === String(s.dn || '')); if (ayni.length > 1) gor = `<div class="fld"><label>Görünüş / sürüm</label><select id="agSur">${ayni.map(x => `<option value="${esc(x.id)}" ${x.id === def.id ? 'selected' : ''}>${esc((C.blib.cache[x.id] || {}).name || x.id)}</option>`).join('')}</select></div>`;
      ekle = s.kaynak === 'ekipman' ? () => C.ekipmanEkle(def.id) : () => calis(`VANAEKLE ID=${def.id}`);
      if (s.kaynak === 'ekipman' && def.mesh3d && C.ekipmanBazAd) gor += `<div class="fld"><label>Ekleme noktası</label><select id="agBaz">${Object.entries(C.ekipmanBazAd).filter(([k]) => k !== 'ozel' || def.baz === 'ozel').map(([k, t]) => `<option value="${k}" ${k === (def.baz || 'taban') ? 'selected' : ''} ${k === 'orijin' && !def.orj ? 'disabled' : ''}>${esc(t)}${k === 'orijin' && !def.orj ? ' — eski yükleme: dosyayı yeniden yükleyin' : ''}</option>`).join('')}<option value="sec">Kendim belirle (tıklayarak)…</option></select></div>`;
    }
    P1.innerHTML = `<div style="font-weight:600;font-size:15px;margin-bottom:2px">${esc(baslik)}</div><div class="hint" style="margin-bottom:8px">${esc(bilgi)}</div>${gor}
      <div class="bar" style="margin:10px 0"><button id="agEkle" class="pri">Çizime ekle</button>${s.kaynak === 'ekipman' ? '<button id="agKut">Ekipman kütüphanesinde aç</button>' : ''}</div>${s.kaynak !== 'sema' ? yolSec(def) : ''}
      <p class="hint" style="margin-top:12px">Yerleştirme: nokta, sonra boru / akış yönü. ${s.kaynak === 'sema' ? 'Şematik vanalar kütüphanenize kaydedilmez, her çapta hazırdır.' : 'Farklı çaplarını yükledikçe aynı satırda DN düğmesi olarak çıkar (dosya adında "DN150" gibi çap bulunmalı).'}</p>`;
    const m3 = def.mesh3d; V1.innerHTML = `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.7">Önizleme</div>${def.thumb && s.kaynak === 'ekipman' ? `<img src="${def.thumb}" style="width:340px;max-width:100%;border-radius:4px;background:#20252c">` : m3 && m3.v && m3.v.length ? resim(m3) : ''}${def.ents && def.ents.length ? svgEnts(def) : ''}`;
    P1.querySelector('#agEkle').onclick = () => { cb.kapat(); setTimeout(ekle, 0); };
    const k = P1.querySelector('#agKut'); if (k) k.onclick = () => { cb.kapat(); setTimeout(() => C.openEkipmanLib && C.openEkipmanLib(), 0); };
    const gs = P1.querySelector('#agGor'); if (gs) gs.onchange = () => { gorunus = gs.value; goster(s, P1, V1, cb); };
    const bz = P1.querySelector('#agBaz'); if (bz) bz.onchange = () => { if (bz.value === 'sec') { cb.kapat(); setTimeout(() => C.ekipmanBazSec(def.id, () => calis('AILE')), 0); return; } if (C.ekipmanBaz(def.id, bz.value)) C.log(`${def.name}: ekleme noktası → ${C.ekipmanBazAd[bz.value]}.`); goster(s, P1, V1, cb); };
    const sv = P1.querySelector('#agSur'); if (sv) sv.onchange = () => goster(Object.assign({}, s, { id: sv.value }), P1, V1, cb);
    const ys = P1.querySelector('#agYol'); if (ys) ys.onchange = () => { const yol = YOLLAR.find(y => yk(y) === ys.value); for (const x of g.dnler) { const d = C.blib.cache[x.id]; if (d) { d.agac = yol; C.blib.put(d); } } cb.yenile && cb.yenile(); C.log(`${g.ad} → ${ys.value}`); };
  };

  C.aileAgac = { ciz, goster, AGAC, YOLLAR, yolBul };
})(window.C);

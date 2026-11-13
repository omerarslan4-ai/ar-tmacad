/* ArıtmaCAD — MİMARİ AÇIKLAMALAR, DİSİPLİN GÖRÜNÜRLÜĞÜ, PROJE DİLİ
   1) MALZEMEACILIM: kesitte tıklanan yerdeki katmanları modelden okur (karo, yapıştırıcı, şap, beton, grobeton, yalıtım, dolgu…)
      ve örnek projedeki gibi oklu, alt alta yazılı açılım koyar. Satır aralığı kağıtta sabittir (ölçek değişse de aynı).
      MALZEMEACILIM T: seçilen kesitte tüm farklı döşeme / duvar katmanlaşmaları için otomatik.
   2) MAHALLISTESI: mahal listesi (Room Finish Schedule) — mahaller satır, malzeme grupları numaralı dikey yazılı sütunlar, noktalar.
   3) Disiplin: nesnenin e.dis etiketi (Mimari / Statik / Mekanik / Elektrik) varsa yalnız o grubun paftalarında görünür.
   4) Proje dili (C.doc.set.lang = 'tr' | 'en'): çizimdeki yazılar sözlükle (ve CEVIRI tablosundaki sizin karşılıklarınızla) çevrilir. */
(function (C) {
  'use strict';
  const M = C.M, T = C.T, E = C.cmd, { L, P, S, TX, CI } = C.prim;

  /* =====================================================================
     PROJE DİLİ
     ===================================================================== */
  const EN = {
    // malzemeler — kaplama
    'Seramik yer karosu': 'Ceramic floor tile', 'Granit seramik (porselen)': 'Porcelain tile', 'Mozaik karo': 'Terrazzo tile', 'Mermer kaplama': 'Marble cladding',
    'Doğal taş / granit plak': 'Natural stone / granite slab', 'Laminat parke': 'Laminate flooring', 'Lamine (çok katmanlı) parke': 'Engineered wood flooring', 'Masif ahşap parke': 'Solid wood flooring',
    'Vinil / PVC zemin kaplama': 'Vinyl / PVC floor covering', 'Halı / halı karo': 'Carpet / carpet tile', 'Epoksi zemin kaplama': 'Epoxy floor coating',
    'Endüstriyel zemin (yüzey sertleştirici + perdah)': 'Industrial floor (surface hardener + power float)', 'Kauçuk zemin kaplama': 'Rubber floor covering', 'Kaplama yok': 'No finish',
    'Sıva yok': 'No plaster', 'Kaba + ince sıva (kireç-çimento)': 'Base + finish plaster (lime-cement)', 'Alçı sıva': 'Gypsum plaster', 'Makine sıvası (perlitli alçı)': 'Machine-applied gypsum plaster (perlite)',
    'Dış cephe sıvası (çimento esaslı)': 'External render (cementitious)', 'Mantolama (5 cm EPS/taşyünü + file + sıva)': 'ETICS (5 cm EPS / mineral wool + mesh + render)', 'Tavan sıvası (alçı)': 'Ceiling plaster (gypsum)',
    'Plastik (su bazlı) iç cephe boyası': 'Water-based interior emulsion paint', 'Saten iç cephe boyası': 'Satin interior paint', 'Yağlı boya': 'Oil paint', 'Akrilik dış cephe boyası': 'Acrylic exterior paint',
    'Silikonlu dış cephe boyası': 'Silicone exterior paint', 'Seramik fayans (duvar)': 'Ceramic wall tile', 'Doğal taş duvar kaplama': 'Natural stone wall cladding', 'Ahşap lambri kaplama': 'Timber panelling',
    'Alçıpan duvar kaplama': 'Plasterboard wall lining', 'Alüminyum kompozit panel (alt konstrüksiyonlu)': 'Aluminium composite panel (on sub-frame)', 'Duvar kağıdı': 'Wallpaper', 'Bitiş yok': 'No finish',
    'Tavan boyası (plastik)': 'Ceiling paint (emulsion)', 'Asma tavan – alçıpan': 'Suspended ceiling – plasterboard', 'Asma tavan – taşyünü / mineral karo 60×60': 'Suspended ceiling – mineral fibre tile 60×60',
    'Asma tavan – metal (clip-in)': 'Suspended ceiling – metal (clip-in)', 'Asma tavan – ahşap lambri': 'Suspended ceiling – timber slats',
    // yalıtım
    'EPS (karbon katkılı) ısı yalıtım levhası': 'EPS (graphite) thermal insulation board', 'XPS ısı yalıtım levhası': 'XPS thermal insulation board', 'Taşyünü ısı yalıtım levhası': 'Mineral wool insulation board',
    'Poliüretan (PIR) ısı yalıtım levhası': 'PIR insulation board', 'Camyünü ısı yalıtım levhası': 'Glass wool insulation board', 'Isı yalıtımı yok': 'No thermal insulation',
    'Bitümlü su yalıtım örtüsü (2 kat, polyester keçe)': 'Bituminous waterproofing membrane (2 layers, polyester)', 'TPO / PVC su yalıtım membranı': 'TPO / PVC waterproofing membrane',
    'Sıvı poliüretan su yalıtımı': 'Liquid polyurethane waterproofing', 'Çimento esaslı su yalıtımı (2 kat)': 'Cementitious waterproofing (2 coats)', 'Kristalize su yalıtımı': 'Crystalline waterproofing',
    'Polyurea su yalıtımı': 'Polyurea waterproofing', 'Epoksi kaplama (içme suyuna uygun)': 'Epoxy coating (potable water approved)', 'Bentonit su yalıtım örtüsü': 'Bentonite waterproofing blanket',
    'HDPE su yalıtım membranı': 'HDPE waterproofing membrane', 'Su yalıtımı yok': 'No waterproofing', 'Çakıl koruma tabakası (5 cm, geotekstil üstü)': 'Gravel protection layer (5 cm, on geotextile)',
    'Koruma şapı (5 cm)': 'Protection screed (5 cm)', 'Çakıl koruma tabakası (geotekstil üstü)': 'Gravel protection layer (on geotextile)', 'Kristalize su yalıtımı': 'Crystalline waterproofing', 'Koruma yok': 'No protection',
    'PVC I tipi su tutucu bant (orta)': 'PVC centre waterstop', 'PVC su tutucu bant (iç tip)': 'PVC internal waterstop', 'PVC su tutucu bant (dış tip)': 'PVC external waterstop',
    'Hidrofilik (suyla şişen) bant': 'Hydrophilic swelling strip', 'Bentonitli şişen bant': 'Bentonite swelling strip', 'Enjeksiyon hortumu': 'Injection hose', 'Galvaniz sac su tutucu': 'Galvanised steel waterstop',
    // taşıyıcı / dolgu
    'Betonarme': 'Reinforced concrete', 'Tuğla': 'Brick', 'Gazbeton': 'Aerated concrete block', 'Briket': 'Concrete block', 'Perde ayağı (temelle birlikte dökülür)': 'Wall kicker (cast with foundation)',
    'Sıkıştırılmış dolgu (stabilize)': 'Compacted fill (stabilized)', 'Sıkıştırılmış kum-çakıl': 'Compacted sand-gravel fill', 'Sıkıştırılmış toprak dolgu': 'Compacted soil fill',
    'Betonarme döşeme': 'Reinforced concrete slab', 'Betonarme radye temel': 'Reinforced concrete raft foundation', 'Betonarme temel': 'Reinforced concrete footing', 'Betonarme perde': 'Reinforced concrete wall',
    'Betonarme kolon': 'Reinforced concrete column', 'Betonarme kiriş': 'Reinforced concrete beam', 'Betonarme yapı': 'Reinforced concrete structure', 'Grobeton': 'Lean concrete (blinding)',
    'Koruma betonu': 'Protection concrete', 'Drenaj levhası': 'Drainage board', 'Buhar dengeleyici / kesici': 'Vapour control layer', 'Eğim betonu': 'Screed to falls',
    'Seramik yapıştırıcısı (çimento esaslı)': 'Cementitious tile adhesive', 'Şap (çimento esaslı)': 'Cement-sand screed', 'Donatılı zemin betonu (hasırlı)': 'Reinforced ground slab (mesh)',
    'Su tutucu bant': 'Waterstop', 'Sıkıştırılmış dolgu': 'Compacted fill', 'Doğal zemin': 'Natural ground',
    // tablolar, başlıklar
    'MAHAL LİSTESİ': 'ROOM FINISH SCHEDULE', 'Kat / Seviye': 'Floor / Level', 'Mahal adı': 'Room Name / Space Name', 'Temel': 'Foundation', 'Döşeme / Zemin kaplaması': 'Flooring / Floor Finishes',
    'Duvar kaplaması': 'Wall / Wall Finishes', 'Tavan / Çatı': 'Ceiling / Roof', 'Kapı': 'Door', 'Pencere': 'Window', 'NOT': 'NOTE', 'Not': 'Note', 'Notlar': 'Notes',
    'MALZEME LİSTESİ': 'BILL OF MATERIALS', 'KAPLAMA / YALITIM METRAJI': 'FINISHES / INSULATION QUANTITIES', 'ÇATI PLANI': 'ROOF PLAN', 'Mahal': 'Room',
    'Poz': 'Item', 'Malzeme': 'Material', 'Miktar': 'Quantity', 'Birim': 'Unit', 'Açıklama': 'Description', 'Toplam': 'Total', 'Adet': 'Qty', 'Uzunluk': 'Length', 'Çap': 'Diameter',
    'Zemin': 'Ground', 'Giriş': 'Inlet', 'Çıkış': 'Outlet', 'Taban': 'Bottom', 'KAZI TABANI': 'EXCAVATION BOTTOM', 'Su seviyesi': 'Water level', 'Kot': 'Level', 'Ölçek': 'Scale',
    'Kesit': 'Section', 'Görünüş': 'Elevation', 'Detay': 'Detail', 'Plan': 'Plan', 'Vaziyet planı': 'Site plan', 'Yerleşim planı': 'Layout plan',
    'Pompa istasyonu': 'Pumping station', 'Vana odası': 'Valve chamber', 'Pano odası': 'Panel room', 'Elektrik odası': 'Electrical room', 'Islak hacim': 'Wet well', 'Kuru hacim': 'Dry well',
    'Pompa': 'Pump', 'Vana': 'Valve', 'Boru': 'Pipe', 'Izgara': 'Screen', 'Kum tutucu': 'Grit chamber', 'Havalandırma havuzu': 'Aeration tank', 'Çöktürme havuzu': 'Sedimentation tank',
    'Dengeleme havuzu': 'Equalization tank', 'Arıtma tesisi': 'Treatment plant', 'Bina': 'Building', 'Merdiven': 'Stairs', 'Korkuluk': 'Railing', 'Kapak': 'Cover', 'Menhol': 'Manhole',
    'Çekvalf': 'Check valve', 'Sürgülü vana': 'Gate valve', 'Kelebek vana': 'Butterfly valve', 'Dalgıç pompa': 'Submersible pump', 'Debimetre': 'Flow meter', 'Vinç': 'Crane', 'Kaldırma kirişi': 'Lifting beam',
    'PROJE ADI': 'PROJECT NAME', 'PAFTA ADI': 'SHEET NAME', 'PAFTA BAŞLIĞI': 'SHEET TITLE', 'PAFTA NO': 'SHEET NO', 'FİRMA / KURUM': 'COMPANY / CLIENT', 'DOSYA': 'FILE', 'KAĞIT': 'PAPER', 'İşveren': 'Client', 'Müşavir': 'Consultant', 'Yüklenici': 'Contractor',
    'Ölçü': 'Dimension', 'Pafta': 'Sheet', 'Proje': 'Project', 'Çizen': 'Drawn', 'Kontrol': 'Checked', 'Onay': 'Approved', 'Tarih': 'Date', 'Revizyon': 'Revision',
  };
  const RX = [ // kalıplar
    [/^(.+?)\s+KAZI KESİTİ$/u, (m, a) => `EXCAVATION SECTION ${a}`],
    [/^PLAN VE (.+?) KESİTİ$/u, (m, a) => `PLAN AND SECTION ${a}`],
    [/^(.+?)\s+KESİTİ$/u, (m, a) => `SECTION ${a}`],
    [/^(.+?)\s+GÖRÜNÜŞÜ$/u, (m, a) => `ELEVATION ${a}`],
    [/^(.+?)\s+KOTU PLANI$/u, (m, a) => `PLAN AT LEVEL ${a}`],
    [/^SU TUTUCU BANT\s*\((.*)\)$/u, (m, a) => `WATERSTOP (${a})`],
  ];
  const lowTR = s => s.toLocaleLowerCase('tr'), upTR = s => s.toLocaleUpperCase('tr');
  let LOW = null, PHR = null;
  const build = () => {
    const user = (C.doc && C.doc.set && C.doc.set.ceviri) || {};
    const all = Object.assign({}, EN, user); LOW = new Map(); for (const [k, v] of Object.entries(all)) LOW.set(lowTR(k.trim()), v);
    const keys = Object.keys(all).filter(k => k.length >= 3).sort((a, b) => b.length - a.length);
    PHR = keys.length ? new RegExp('(?<![\\p{L}\\p{N}])(' + keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\p{L}])', 'giu') : null;
  };
  const cache = new Map();
  C.langReset = () => { LOW = null; cache.clear(); };
  const caseLike = (src, en) => (src === upTR(src) && /\p{L}/u.test(src)) ? en.toUpperCase() : en;
  const line1 = s => {
    const t = s.trim(); if (!t) return s;
    const ex = LOW.get(lowTR(t)); if (ex != null) return s.replace(t, caseLike(t, ex));
    for (const [rx, fn] of RX) { const m = rx.exec(t) || rx.exec(upTR(t)); if (m) return s.replace(t, caseLike(t, fn(...m).replace(/\b(\w)-\1\b/, '$&'))); }
    let o = PHR ? s.replace(PHR, w => { const v = LOW.get(lowTR(w)); return v == null ? w : caseLike(w, v); }) : s;
    o = o.replace(/(\d),(\d)/g, '$1.$2').replace(/\bKot\b/g, 'Level');
    return o;
  };
  C.lang = () => (C.doc && C.doc.set && C.doc.set.lang) || 'tr';
  C.txL = s => {
    if (s == null || C.lang() !== 'en') return s; s = String(s);
    let v = cache.get(s); if (v != null) return v; if (!LOW) build();
    v = s.split('\n').map(line1).join('\n'); if (cache.size > 20000) cache.clear(); cache.set(s, v); return v;
  };
  { const tl0 = C.textLayout; C.textLayout = function (pr) { if (C.lang() === 'en' && pr && pr.s != null) { const s = C.txL(pr.s); if (s !== pr.s) return tl0.call(this, Object.assign({}, pr, { s })); } return tl0.apply(this, arguments); }; }
  const clearAll = () => { for (const e of C.doc.ents) if (e._c) { delete e._c.p; delete e._c.b; } if (C.views) for (const w of Object.values(C.views)) if (w && 'dirty' in w) w.dirty = true; C.emit('layouts'); };
  C.setLang = v => { v = v === 'en' ? 'en' : 'tr'; C.undoStack && C.undoStack.push(C.snapshot()); C.doc.set.lang = v; C.langReset(); clearAll(); C.changed(); C.log(v === 'en' ? '🌐 Proje dili: English — çizimdeki yazılar İngilizce gösterilir / kaydedilir.' : '🌐 Proje dili: Türkçe.'); };
  C.addCommand(['DIL', 'LANG', 'PROJEDILI', 'LANGUAGE'], 'Proje dili: DIL TR | EN — çizimdeki tüm yazılar (malzeme adları, başlıklar, tablolar, kot açıklamaları, sizin yazılarınız) seçilen dilde gösterilir ve DXF/PDF\'e öyle yazılır. Sözlükte olmayanlar için CEVIRI.', async (I) => {
    const v = await I.kw('Proje dili', [['TR', 'Türkçe'], ['EN', 'English']], C.lang() === 'en' ? 'EN' : 'TR'); C.setLang(String(v).toLowerCase());
  }, { noUndo: true });
  /* çeviri tablosu: çizimdeki tüm farklı yazılar → İngilizce karşılık (sizin yazdığınız öncelikli) */
  const allTexts = () => {
    const set = new Set(), add = s => { for (const ln of String(s || '').split('\n')) { const t = ln.trim(); if (t && /\p{L}{2}/u.test(t)) set.add(t); } };
    for (const e of C.doc.ents) {
      if (e.type === 'text' || e.type === 'ctext' || e.type === 'baslik') add(e.s); else if (e.type === 'kot') add(e.txt); else if (e.type === 'dim' && e.txt) add(String(e.txt).replace('<>', ''));
      else if (e.type === 'acilim') (e.lines || []).forEach(add); else if (e.type === 'pozno' && e.s) add(e.s);
    }
    for (const r of mahalRows().rooms) add(r.ad);
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
  };
  C.ceviriSec = () => {
    const user = C.doc.set.ceviri || {}, list = allTexts(); const sv = C.doc.set.lang; C.doc.set.lang = 'en'; C.langReset();
    const rows = list.map(t => { const auto = C.txL(t); return { t, auto, u: user[t] }; }); C.doc.set.lang = sv; C.langReset();
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const html = `<p class="hint">Çizimdeki yazıların İngilizce karşılıkları. Kutu boşsa otomatik çeviri (gri) kullanılır; yazdığınız karşılık kaydedilir ve tüm çizimde kullanılır. Proje dili: <b>${C.lang() === 'en' ? 'English' : 'Türkçe'}</b>.</p>
      <div style="max-height:56vh;overflow:auto"><table class="cevtab" style="width:100%;border-collapse:collapse">${rows.map((r, i) => `<tr><td style="padding:3px 6px;border-bottom:1px solid #333;width:45%">${esc(r.t)}</td><td style="padding:3px 6px;border-bottom:1px solid #333"><input data-cv="${i}" style="width:100%" value="${esc(r.u || '')}" placeholder="${esc(r.auto)}"></td></tr>`).join('')}</table></div>
      <div class="bar" style="margin-top:8px"><button class="pri" data-cvok>Kaydet</button> <button data-cvlang>${C.lang() === 'en' ? 'Türkçeye dön' : 'İngilizceye geç'}</button></div>`;
    const b = C.modal('Çeviri tablosu (TR → EN)', html);
    const save = () => { const u = Object.assign({}, C.doc.set.ceviri || {}); b.querySelectorAll('[data-cv]').forEach(inp => { const t = rows[+inp.dataset.cv].t, v = inp.value.trim(); if (v) u[t] = v; else delete u[t]; }); C.doc.set.ceviri = u; C.langReset(); clearAll(); C.changed(); };
    b.querySelector('[data-cvok]').onclick = () => { save(); C.log(`Çeviri tablosu kaydedildi (${Object.keys(C.doc.set.ceviri).length} karşılık).`); C.closeModal && C.closeModal(); };
    b.querySelector('[data-cvlang]').onclick = () => { save(); C.setLang(C.lang() === 'en' ? 'tr' : 'en'); C.closeModal && C.closeModal(); };
  };
  C.addCommand(['CEVIRI', 'CEVIRITABLOSU', 'TRANSLATE'], 'Çeviri tablosu: çizimdeki yazıların İngilizce karşılıklarını gösterir / düzenler.', () => C.ceviriSec(), { noUndo: true });
  C.on('doc', () => C.langReset());

  /* =====================================================================
     DİSİPLİN GÖRÜNÜRLÜĞÜ
     ===================================================================== */
  const DISC = ['Mimari', 'Statik', 'Mekanik', 'Elektrik'];
  C.DISIPLINLER = DISC;
  C.disOf = e => {
    if (e.dis) return e.dis;
    if (e.type === 'pozno') return 'Mekanik';
    if (e.type === 'acilim' || e.type === 'mahaltablo') return 'Mimari';
    const l = e.layer || '';
    if (/^(KESIT_POZ|POZ_|BORU_LISTE|MEK_LISTE)/.test(l)) return 'Mekanik';
    if (/^(MALZEME_ACILIM|MAHAL_LISTESI|KESIT_BANT_YAZI)/.test(l)) return 'Mimari';
    if (e.type === 'text' && /^SU TUTUCU BANT/.test(e.s || '')) return 'Mimari';
    return null;
  };
  const grpOfVp = vp => { const L0 = (C.doc.layouts || []).find(L => (L.vps || []).includes(vp)); return L0 ? (L0.grp || 'Genel') : null; };
  { const v0 = C.vpPrims; C.vpPrims = function (vp, cb) { const g = grpOfVp(vp); if (!g) return v0.apply(this, arguments); return v0.call(this, vp, (e, pr) => { const d = C.disOf(e); if (d && d !== g) return; cb(e, pr); }); }; }
  /* pafta penceresinin içinde (MSPACE) yeni konan açıklamalar o disipline ait olur */
  const ANN = new Set(['text', 'ctext', 'dim', 'kot', 'pozno', 'acilim', 'mahaltablo', 'leader', 'mleader']);
  { const ne0 = C.newEnt; C.newEnt = function (type, props) { const e = ne0.apply(this, arguments); if (C.vpEdit && ANN.has(type) && !e.dis) { const g = grpOfVp(C.vpEdit); if (g && DISC.includes(g)) e.dis = g; } return e; }; }
  /* eski çizimlerde "SU TUTUCU BANT" ok çizgisi ve ok ucu da mimariye */
  const migrateBant = () => {
    const ts = C.doc.ents.filter(e => e.type === 'text' && /^SU TUTUCU BANT/.test(e.s || '') && !e.dis); if (!ts.length) return;
    for (const t of ts) {
      t.dis = 'Mimari'; const tp = M.p3(t.p), r = (t.h || 0.25) * 3;
      for (const pl of C.doc.ents) if (pl.type === 'pline' && pl.layer === t.layer && !pl.dis && pl.pts && pl.pts.length === 3 && M.dist2(pl.pts[2], tp) < r) {
        pl.dis = 'Mimari'; const tip = pl.pts[0];
        for (const so of C.doc.ents) if ((so.type === 'solid' || so.type === 'pline') && so !== pl && so.layer === t.layer && !so.dis && so.pts && so.pts.length === 3 && M.dist2(so.pts[0], tip) < 1e-6) so.dis = 'Mimari';
      }
    }
  };
  C.on('doc', () => { try { migrateBant(); } catch (er) { console.error(er); } });
  C.addCommand(['DISIPLINATA', 'NESNEDISIPLIN', 'DISCIPLINE'], 'Seçili nesneleri bir disipline ait yapar: yalnız o disiplinin paftalarında görünür. DISIPLINATA MIMARI | STATIK | MEKANIK | ELEKTRIK | TUMU', async (I) => {
    let sel = C.sel.slice(); if (!sel.length) { const s = await I.sel ? await I.sel('Nesneleri seçin') : null; sel = s || C.sel.slice(); } if (!sel.length) { C.warn('Önce nesneleri seçin.'); return; }
    const v = await I.kw('Disiplin', [['MIMARI', 'Mimari'], ['STATIK', 'Statik'], ['MEKANIK', 'Mekanik'], ['ELEKTRIK', 'Elektrik'], ['TUMU', 'Tümü (her paftada)']], 'MIMARI');
    const map = { MIMARI: 'Mimari', STATIK: 'Statik', MEKANIK: 'Mekanik', ELEKTRIK: 'Elektrik' }, d = map[C.up(String(v))] || null;
    for (const e of sel) { if (d) e.dis = d; else delete e.dis; delete e._c; } C.changed(); C.emit('layouts'); C.log(`${sel.length} nesne → ${d || 'tüm disiplinler'}.`);
  });

  /* =====================================================================
     MODEL SONDASI: bir doğru boyunca katmanlar
     ===================================================================== */
  const K = () => C._kap || {}, Y = () => C._yal || {}, IN = () => C._ins || {};
  const live = e => { const l = C.layer(e.layer); return (!l || l.on !== false) && !e.gv && (!C.in3D || C.in3D(e)); };
  const cmF = v => { const r = Math.round(v * 10) / 10; return (Math.abs(r - Math.round(r)) < 1e-9 ? String(Math.round(r)) : String(r).replace('.', ',')); };
  const nm = (ad, tcm) => (tcm > 0 ? `${ad}, ${cmF(tcm)} cm` : ad);
  const TILE = new Set(['seramik', 'granit', 'karo', 'mermer', 'dogaltas']);
  /* üçgen-ışın kesişimi (Möller–Trumbore) */
  const rayTris = (pos, o, d) => { const ts = []; for (let i = 0; i < pos.length; i += 9) { const ax = pos[i], ay = pos[i + 1], az = pos[i + 2], e1 = [pos[i + 3] - ax, pos[i + 4] - ay, pos[i + 5] - az], e2 = [pos[i + 6] - ax, pos[i + 7] - ay, pos[i + 8] - az]; const p = M.cross(d, e2), det = M.dot(e1, p); if (Math.abs(det) < 1e-12) continue; const inv = 1 / det, s = [o[0] - ax, o[1] - ay, o[2] - az], u = M.dot(s, p) * inv; if (u < -1e-7 || u > 1 + 1e-7) continue; const q = M.cross(s, e1), v = M.dot(d, q) * inv; if (v < -1e-7 || u + v > 1 + 1e-7) continue; const t = M.dot(e2, q) * inv; if (t > 0) ts.push(t); } ts.sort((a, b) => a - b); const o2 = []; for (const t of ts) if (!o2.length || t - o2[o2.length - 1] > 1e-5) o2.push(t); return o2; };
  const intervals = (e, o, d) => { let t = null; try { t = C.entTris(e); } catch (er) { } if (!t || !t.pos || !t.pos.length) return []; const h = rayTris(t.pos, o, d), out = []; for (let i = 0; i + 1 < h.length; i += 2) out.push([h[i], h[i + 1]]); return out; };
  const bbHit = (e, x0, y0, x1, y1) => { let b; try { b = C.bbox(e); } catch (er) { return false; } return !(b[2] < Math.min(x0, x1) - 0.05 || b[0] > Math.max(x0, x1) + 0.05 || b[3] < Math.min(y0, y1) - 0.05 || b[1] > Math.max(y0, y1) + 0.05); };
  const NO3D = new Set(['seviyecizgi', 'acilim', 'mahaltablo', 'text', 'ctext', 'dim', 'kot', 'hatch', 'line', 'pline', 'circle', 'arc', 'pozno', 'baslik', 'sheet', 'kesitisaret', 'solid']);
  /* düşey sonda (x,y): yukarıdan aşağı tüm katmanlar { ad, zt, zb, e, k } */
  const vStack = (x, y, gb) => {
    const out = [], q = [x, y], add = (ad, zb, zt, e, k) => { if (zt - zb > -1e-6) out.push({ ad, zb, zt, e, k }); };
    for (const e of C.doc.ents) {
      if (!live(e)) continue;
      if (e.type === 'kaplama') {
        if (!e.pts || !C.pointInPoly(q, e.pts)) continue; const Kc = K();
        if (e.kind === 'zemin') { let z = +e.z0 || 0; const zk = (Kc.ZK || {})[e.kap] || { ad: 'Kaplama', t: 0 }; const L0 = [['Donatılı zemin betonu (hasırlı)', +e.zbt || 0], ['XPS ısı yalıtım levhası', +e.xps || 0], ['Şap (çimento esaslı)', +e.sap || 0]];
          for (const [ad, t] of L0) if (t > 0) { add(nm(ad, t), z, z + t / 100, e, 'zemin'); z += t / 100; }
          if (e.kap !== 'yok') { if (TILE.has(e.kap)) add('Seramik yapıştırıcısı (çimento esaslı)', z, z, e, 'zemin'); add(nm(zk.ad, +e.kt || zk.t || 0), z, z + (+e.kt || 0) / 100, e, 'zemin'); } }
        else if (e.kind === 'tavan') { const zc = +e.zc || 3, tb = (Kc.TB || {})[e.bit] || {}, sv = (Kc.SIVA || {})[e.siva]; if (tb.asma) { const zz = zc - (+e.drop || 30) / 100; add(nm(tb.ad, tb.t || 0) + (e.drop ? ` (${cmF(+e.drop)} cm sarkma)` : ''), zz - (tb.t || 1) / 100, zz, e, 'tavan'); } else { if (sv && e.siva !== 'yok') add(nm(sv.ad, sv.t), zc - sv.t / 100, zc, e, 'tavan'); if (tb.ad) add(tb.ad, zc - (sv ? sv.t / 100 : 0), zc - (sv ? sv.t / 100 : 0), e, 'tavan'); } }
        continue;
      }
      if (e.type === 'yalitim') {
        const Yc = Y(), MEM = Yc.MEM || 0.006;
        if (e.kind === 'zemin' && e.pts && C.pointInPoly(q, e.pts)) { let z = +e.z0 || 0; if (e.su && e.su !== 'yok') { add((Yc.SU[e.su] || {}).ad || 'Su yalıtımı', z, z + MEM, e, 'yal'); z += MEM; } if (e.mat && e.mat !== 'yok' && +e.t > 0) add(nm((Yc.ISI[e.mat] || {}).ad || 'Isı yalıtımı', +e.t), z, z + e.t / 100, e, 'yal'); }
        else if (e.kind === 'temel' && e.pts && C.pointInPoly(q, e.pts)) { const zb = +e.zb || 0, kb = (+e.kb || 0) / 100; if (kb > 0) add(nm('Koruma betonu', +e.kb), zb - kb, zb, e, 'yal'); if (e.su !== 'yok') add((Yc.SU[e.su] || Yc.SU.bitum || {}).ad || 'Su yalıtımı', zb - kb - MEM, zb - kb, e, 'yal'); }
        else if (e.kind === 'cati' && e.pts && C.pointInPoly(q, e.pts)) { let z = +e.z || 0; const lay = [[e.buhar === 'E' ? 0.004 : 0, 'Buhar dengeleyici / kesici', 0], [(+e.egim || 0) / 100, `Eğim betonu (ort. ${cmF(+e.egim || 0)} cm)`, -1], [e.mat !== 'yok' ? (+e.t || 0) / 100 : 0, (Yc.ISI[e.mat] || {}).ad, +e.t], [e.su !== 'yok' ? MEM : 0, (Yc.SU[e.su] || {}).ad, 0], [((Yc.KOR || {})[e.kor] || {}).t / 100 || 0, ((Yc.KOR || {})[e.kor] || {}).ad, -1]]; for (const [t, ad, tc] of lay) if (t > 0 && ad) { add(tc > 0 ? nm(ad, tc) : ad, z, z + t, e, 'yal'); z += t; } }
        else if (e.kind === 'su' && !e.host && e.pts && C.pointInPoly(q, e.pts) && e.taban !== 'H') { const z0 = +e.z0 || 0; add((Yc.SU[e.tip] || {}).ad || 'Su yalıtımı', z0, z0 + MEM, e, 'yal'); }
        continue;
      }
      if (NO3D.has(e.type)) continue; let ms0 = null; try { ms0 = C.meshes(e); } catch (er) { } if (!ms0 || !ms0.length || !bbHit(e, x, y, x, y)) continue;
      const ZT = 1e4, iv = intervals(e, [x, y, ZT], [0, 0, -1]);
      const tk = C.tipKatman && C.tipKatman(e);
      for (const [t0, t1] of iv) { const zt0 = ZT - t0, zb0 = ZT - t1; add(tk && tk.core ? tk.core : nameOf(e, (t1 - t0) * 100), zb0, zt0, e, 'yapi');
        if (tk && (tk.ust || tk.alt)) { let z = zt0; for (const l of (tk.ust || []).slice().reverse()) { const t = (+l.t || 0) / 100; add(nm(l.ad, +l.t || 0), z, z + t, e, 'tip'); z += t; } z = zb0; for (const l of (tk.alt || [])) { const t = (+l.t || 0) / 100; add(nm(l.ad, +l.t || 0), z - t, z, e, 'tip'); z -= t; } } }
    }
    // grobeton: temel / radye / temel perdesi altında
    if (gb > 0) { const fnd = out.filter(it => it.k === 'yapi' && isFnd(it.e)); for (const f of fnd) { const under = out.filter(it => it.zt <= f.zb + 0.02 && it.zt > f.zb - 0.25 && (it.k === 'yal' || it.k === 'tip')); const zb0 = under.length ? Math.min(...under.map(it => it.zb)) : f.zb; if (!out.some(it => /^Grobeton/.test(it.ad) && it.zt <= f.zb + 0.02 && it.zt > f.zb - 0.6)) out.push({ ad: nm('Grobeton (C16/20)', gb * 100), zt: zb0, zb: zb0 - gb, e: null, k: 'gb' }); } }
    out.sort((a, b) => b.zt - a.zt || b.zb - a.zb);
    return out;
  };
  const isFnd = e => e && (e.type === 'temel' || (e.type === 'plak' && e.kind === 'radye') || (e.type === 'perde' && e.temel));
  const nameOf = (e, tcm) => {
    const bet = e.beton ? ` (${e.beton})` : '';
    switch (e.type) {
      case 'plak': return nm((e.kind === 'radye' ? 'Betonarme radye temel' : 'Betonarme döşeme') + (e.beton ? ` (${e.beton})` : ' (C30/37)'), Math.round((+e.t || 0.3) * 100));
      case 'temel': return nm('Betonarme temel' + (e.beton ? bet : ' (C30/37)'), Math.round((+e.t || 0.6) * 100));
      case 'perde': { if (e.kicker) return 'Perde ayağı (temelle birlikte dökülür)'; const m = e.malz && e.malz !== 'beton' ? ((IN().MALZ || {})[e.malz] || {}).ad : null; return nm(m ? m + ' duvar' : 'Betonarme perde' + (e.beton ? bet : ' (C30/37)'), Math.round(tcm)); }
      case 'kolon': return 'Betonarme kolon' + bet; case 'kiris': return 'Betonarme kiriş' + bet;
      case 'dolgu': return (IN().DOLGU || {})[e.malz] || 'Sıkıştırılmış dolgu';
      case 'tank': case 'ctank': return nm('Betonarme' + bet, Math.round(tcm));
      default: return (T[e.type] && T[e.type].label) || e.type;
    }
  };
  /* yatay sonda (duvar): P noktasından d yönünde; dıştan içe sıralı { ad, s0, s1, e } */
  const hStack = (Pp, d) => {
    const o = [Pp[0] - d[0] * 60, Pp[1] - d[1] * 60, Pp[2]], out = [];
    for (const e of C.doc.ents) {
      if (!live(e) || NO3D.has(e.type)) continue; { let ms0 = null; try { ms0 = C.meshes(e); } catch (er) { } if (!ms0 || !ms0.length) continue; } if (!bbHit(e, o[0], o[1], Pp[0] + d[0] * 60, Pp[1] + d[1] * 60)) continue;
      const iv = intervals(e, o, d); if (!iv.length) continue;
      if (e.type === 'kaplama' && e.kind === 'duvar') { const Kc = K(), sv = (Kc.SIVA || {})[e.siva], z0 = +e.z0 || 0, hi = +e.kh > 0 && Pp[2] > z0 + +e.kh, bk = hi ? (e.ub || e.kap) : e.kap, bt = (Kc.BIT || {})[bk]; const subs = []; if (sv && e.siva !== 'yok') subs.push(nm(sv.ad, sv.t)); if (bt && bk !== 'yok') subs.push(nm(bt.ad, bt.t || 0)); for (const [a, b] of iv) out.push({ s0: a, s1: b, e, subs, lay: true }); continue; }
      if (e.type === 'yalitim') { const Yc = Y(); let subs = [];
        if (e.kind === 'cephe') subs = [nm((Yc.ISI[e.mat] || Yc.ISI.eps || {}).ad, +e.t || 5)];
        else if (e.kind === 'temel') { if (e.su !== 'yok') subs.push((Yc.SU[e.su] || Yc.SU.bitum).ad); if (+e.dt > 0) subs.push(nm((Yc.ISI[e.dmat] || Yc.ISI.xps).ad, +e.dt)); if (e.dren === 'E') subs.push('Drenaj levhası'); }
        else if (e.kind === 'su') subs = [(Yc.SU[e.tip] || {}).ad || 'Su yalıtımı'];
        else if (e.kind === 'bant') continue;
        if (!subs.length) continue; const a = Math.min(...iv.map(x => x[0])), b = Math.max(...iv.map(x => x[1])); out.push({ s0: a, s1: b, e, subs, lay: true }); continue; }
      if (e.type === 'kaplama' || e.type === 'dolgu') continue;
      const tk = C.tipKatman && C.tipKatman(e);
      for (const [a, b] of iv) out.push({ s0: a, s1: b, e, subs: [tk && tk.core ? tk.core : nameOf(e, (b - a) * 100)], lay: false, tk });
    }
    out.sort((a, b) => a.s0 - b.s0);
    return { items: out, t0: 60 };
  };
  /* tıklanan noktanın etrafındaki bitişik katman zinciri */
  const chainV = (st, z) => {
    if (!st.length) return [];
    let k = st.findIndex(it => z <= it.zt + 0.006 && z >= it.zb - 0.006); if (k < 0) { let bd = Infinity; st.forEach((it, i) => { const d = Math.min(Math.abs(it.zt - z), Math.abs(it.zb - z)); if (d < bd) { bd = d; k = i; } }); }
    const used = [st[k]]; let top = st[k].zt, bot = st[k].zb;
    for (let i = k - 1; i >= 0; i--) { const it = st[i]; if (it.zb <= top + 0.03 && it.zt >= top - 1e-6) { used.unshift(it); top = Math.max(top, it.zt); } else if (it.zt > top + 0.03) break; }
    for (let i = k + 1; i < st.length; i++) { const it = st[i]; if (it.zt >= bot - 0.03 && it.zb <= bot + 1e-6) { used.push(it); bot = Math.min(bot, it.zb); } else if (it.zt < bot - 0.03) break; }
    return used;
  };
  const isWall = it => it && it.e && (it.e.type === 'perde' || it.e.type === 'kolon' || (it.e.type === 'tank' || it.e.type === 'ctank'));
  /* kesit meta → model */
  const metas = () => Object.entries(C.doc.set.kesitMeta || {}).map(([k, v]) => Object.assign({ nm: k }, v));
  const metaAt = c => { let best = null, bd = Infinity; for (const m of metas()) { const x0 = m.q0[0] + m.ub[0] - 1, x1 = m.q0[0] + m.ub[2] + 1, y0 = m.q0[1] + m.ub[1] - 1.5, y1 = m.q0[1] + m.ub[3] + 1; if (c[0] >= x0 && c[0] <= x1 && c[1] >= y0 && c[1] <= y1) { const d = Math.abs(c[0] - (x0 + x1) / 2) + Math.abs(c[1] - (y0 + y1) / 2); if (d < bd) { bd = d; best = m; } } } return best; };
  const toModel = (m, c) => { const s = c[0] - m.q0[0], z = c[1] - m.q0[1], e = 0.004; return { x: m.a[0] + m.u[0] * s + m.n[0] * e, y: m.a[1] + m.u[1] * s + m.n[1] * e, z, s }; };
  /* tek nokta: { lines, mode } */
  const probeAt = (m, c) => {
    const P0 = toModel(m, c), st0 = vStack(P0.x, P0.y, m.gb || 0), hit = chainV(st0, P0.z).find(it => P0.z <= it.zt + 0.004 && P0.z >= it.zb - 0.004);
    const ch = isWall(hit) ? [] : chainV(st0.filter(it => !isWall(it)), P0.z);
    if (hit && isWall(hit) || (!ch.length)) {
      const d = [m.u[0], m.u[1], 0], H = hStack([P0.x, P0.y, P0.z], d), it = H.items; if (!it.length) return null;
      const sc = 60; let k = it.findIndex(q => sc >= q.s0 - 0.004 && sc <= q.s1 + 0.004); if (k < 0) return null;
      let a = k, b = k; while (a > 0 && it[a].s0 - it[a - 1].s1 < 0.03 && it[a - 1].s1 > it[a].s0 - 0.03) a--; while (b < it.length - 1 && it[b + 1].s0 - it[b].s1 < 0.03) b++;
      const part = it.slice(a, b + 1), wi = part.findIndex(q => !q.lay), lines = [];
      let tipRev = false; const O = [P0.x - d[0] * 60, P0.y - d[1] * 60], at = s2 => [O[0] + d[0] * s2, O[1] + d[1] * s2], inRoom = q2 => { try { return !!(K().roomAt && K().roomAt(q2, P0.z - 0.5)); } catch (er) { return false; } };
      part.forEach((q, i) => { let subs = q.lay ? (wi >= 0 && i < wi ? q.subs.slice().reverse() : q.subs) : q.subs;
        if (q.tk && (q.tk.dis || q.tk.ic)) { const bIn = inRoom(at(q.s0 - 0.3)), aIn = inRoom(at(q.s1 + 0.3)), D = (q.tk.dis || []).map(l => nm(l.ad, +l.t || 0)), Ic = (q.tk.ic || []).map(l => nm(l.ad, +l.t || 0));
          if (bIn && !aIn) { subs = Ic.slice().reverse().concat(subs, D.slice().reverse()); tipRev = true; } else subs = D.concat(subs, Ic); }
        lines.push(...subs); });
      // dış yüz: yalıtımın olduğu taraf önce
      const extFirst = part.some((q, i) => q.lay && q.e.type === 'yalitim' && wi >= 0 && i < wi), extLast = part.some((q, i) => q.lay && q.e.type === 'yalitim' && wi >= 0 && i > wi);
      if ((extLast && !extFirst) || tipRev) lines.reverse();
      return { lines: dedupe(lines), mode: 'duvar', s: P0.s, z: P0.z };
    }
    return { lines: dedupe(ch.map(it => it.ad)), mode: 'doseme', s: P0.s, z: P0.z, zt: ch.length ? ch[0].zt : P0.z, zb: ch.length ? ch[ch.length - 1].zb : P0.z };
  };
  const dedupe = a => a.filter((x, i) => x && (i === 0 || x !== a[i - 1]));

  /* =====================================================================
     AÇILIM NESNESİ
     ===================================================================== */
  const ensL = n => { C.ensureLayer(n, n === 'MAHAL_LISTESI' ? 1 : 7, 'CONTINUOUS', 18); return n; };
  const tH = () => C.annoH(C.doc.set.acilimH || 1.8);
  const kotSt = () => (C.styles && C.styles().KOT ? 'KOT' : undefined);
  T.acilim = {
    label: 'Malzeme açılımı',
    prims: e => {
      const th = tH(), lsp = th * 1.75, a = M.p3(e.a), p = M.p3(e.p), sd = e.side || (p[0] >= a[0] ? 1 : -1), sh = th * 1.6, out = [], st = kotSt(), o = st ? { st } : {};
      const ln = e.lines || [];
      // ok ucu
      const d = M.sub(p, a), Ld = Math.hypot(d[0], d[1]) || 1, ux = d[0] / Ld, uy = d[1] / Ld, ah = th * 1.1, aw = th * 0.32;
      out.push(S([a, [a[0] + ux * ah - uy * aw, a[1] + uy * ah + ux * aw, 0], [a[0] + ux * ah + uy * aw, a[1] + uy * ah - ux * aw, 0]]));
      out.push(L(a, p)); const bx = p[0] + sd * sh; out.push(L(p, [bx, p[1], 0]));
      const n = Math.max(1, ln.length); if (n > 1) out.push(L([bx, p[1], 0], [bx, p[1] - (n - 1) * lsp, 0]));
      ln.forEach((s, i) => { const y = p[1] - i * lsp; out.push(L([bx, y, 0], [bx + sd * th * 0.45, y, 0])); out.push(TX([bx + sd * th * 0.75, y - th * 0.5, 0], th, s, 0, sd > 0 ? 'L' : 'R', o)); });
      return out;
    },
    xf: (e, X) => { e.a = X.p(M.p3(e.a)); e.p = X.p(M.p3(e.p)); if (X.mir) e.side = -(e.side || 1); },
    snaps: e => [{ p: M.p3(e.a), k: 'end' }, { p: M.p3(e.p), k: 'end' }],
    info: e => `Malzeme açılımı · ${(e.lines || []).length} satır${e.src ? ' · ' + e.src.k + '-' + e.src.k + ' kesitinden' : ''}: ${(e.lines || []).slice(0, 3).join(' / ')}${(e.lines || []).length > 3 ? '…' : ''}`,
  };
  { const g0 = C.gripsOf; if (g0) C.gripsOf = e => { if (e.type !== 'acilim') return g0(e); return [{ p: M.p3(e.a), k: 'end', set: (x, q) => { x.a = M.p3(q); } }, { p: M.p3(e.p), k: 'end', set: (x, q) => { x.p = M.p3(q); } }]; }; }
  if (C.ANNO_TYPES && C.ANNO_TYPES.add) { C.ANNO_TYPES.add('acilim'); C.ANNO_TYPES.add('mahaltablo'); }

  /* açılımı modelden yeniden oku */
  const refresh = e => { if (!e.src) return false; const m = (C.doc.set.kesitMeta || {})[e.src.k]; if (!m) return false; const r = probeAt(m, [m.q0[0] + e.src.s, m.q0[1] + e.src.z]); if (!r || !r.lines.length) return false; e.lines = r.lines; delete e._c; return true; };
  C.acilimYenile = () => { let n = 0; for (const e of C.doc.ents) if (e.type === 'acilim' && refresh(e)) n++; return n; };
  const place = (m, c, r, pPt) => C.newEnt('acilim', { a: M.p3(c), p: M.p3(pPt), lines: r.lines, side: pPt[0] >= c[0] ? 1 : -1, src: { k: m.nm, s: r.s, z: r.z }, dis: 'Mimari', layer: ensL('MALZEME_ACILIM') });

  C.addCommand(['MALZEMEACILIM', 'ACILIM', 'KATMANNOTU', 'MALZEMENOTU'], 'Kesitte malzeme açılımı: kesitte döşeme / duvar / temel üzerine tıklayın, sonra yazının yerini gösterin; katmanlar (kaplama, yapıştırıcı, şap, beton, yalıtım, grobeton, dolgu…) modelden sırasıyla yazılır. T = seçilen kesitte hepsi otomatik, G = tüm açılımları modelden güncelle.', async (I) => {
    if (!metas().length) { C.warn('Kesit bilgisi yok: kesiti bu sürümle yeniden alın (KESITAL). Açılım, kesitin 3B modeldeki yerini bilmelidir.'); return; }
    for (;;) {
      const c = await I.pt('Kesitte açılımı yapılacak nokta (döşeme / duvar / temel) [T = otomatik tüm kesit, G = güncelle]', { kw: [['T'], ['G']] }); if (!c) return;
      if (typeof c === 'string') {
        if (C.up(c) === 'G') { let n = 0; for (const e of C.doc.ents) if (e.type === 'acilim' && refresh(e)) n++; C.changed(); C.log(`${n} malzeme açılımı modelden güncellendi.`); return; }
        if (C.up(c) === 'T') { const q = await I.pt('Kesitin üzerine bir kez tıklayın'); if (!q || typeof q === 'string') return; const m = metaAt(q); if (!m) { C.warn('Burada kesit bulunamadı.'); continue; } const n = autoSection(m); C.log(`${m.nm}-${m.nm} kesitine ${n} malzeme açılımı kondu (Mimari paftalarda görünür). Yerlerini tutamaçtan çekebilirsiniz.`); return; }
        continue;
      }
      const m = metaAt(c); if (!m) { C.warn('Tıklanan yer bir kesitin içinde değil (kesit bu sürümle alınmış olmalı).'); continue; }
      const r = probeAt(m, c); if (!r || !r.lines.length) { C.warn('Bu noktada katman bulunamadı — döşeme, duvar ya da temel kesitinin içine tıklayın.'); continue; }
      C.log(`${r.mode === 'duvar' ? 'Duvar' : 'Döşeme'} katmanları: ${r.lines.join(' / ')}`);
      E.base = c; E.preview = q => { const tmp = { type: 'acilim', a: c, p: q, lines: r.lines, side: q[0] >= c[0] ? 1 : -1 }; try { return T.acilim.prims(tmp); } catch (er) { return []; } };
      const pp = await I.pt('Yazının yeri (ok bu noktadan kırılır)'); E.preview = null; E.base = null; if (!pp || typeof pp === 'string') return;
      C.add(place(m, c, r, pp)); C.changed();
    }
  });
  /* otomatik: kesitteki farklı katmanlaşmalar */
  const autoSection = m => {
    const th = tH(), lsp = th * 1.75, W = q => [m.q0[0] + q[0], m.q0[1] + q[1], 0], runs = new Map();
    const span = m.ub[2] - m.ub[0], step = Math.max(0.1, span / 160);
    /* pafta stili (Çokal R2): kod her elemana ayrı yazılır — kesilen her duvar parçası (toprak altı / üstü ayrı) ve her döşeme parçası bir kod alır */
    const cokal = !!(C.pstil && C.pstil() && C.acilimEtiketKural), son = new Map();
    const note = (sig, o) => { if (cokal) { const A = son.get(sig) || []; son.set(sig, A); /* aynı katmanlaşmanın kesintisiz süren parçası (eğimli çatıda kot yavaş değişir) */
        let l = A.find(q => o.s - q.s <= step * 1.6 && (o.zt == null || Math.abs(o.zt - q.zt) < 0.3)); if (!l) { l = { i: A.length }; A.push(l); } l.s = o.s; l.zt = o.zt; sig += '#' + l.i; }
      const r = runs.get(sig); if (!r) runs.set(sig, Object.assign({ s0: o.s, s1: o.s, n: 1, ornek: [[o.s, o.zt]] }, o)); else { r.s1 = o.s; r.n++; r.ornek.push([o.s, o.zt]); } };
    for (let s = m.ub[0] + step / 2; s < m.ub[2]; s += step) {
      const x = m.a[0] + m.u[0] * s + m.n[0] * 0.004, y = m.a[1] + m.u[1] * s + m.n[1] * 0.004, st = vStack(x, y, m.gb || 0); if (!st.length) continue;
      for (const w of st.filter(isWall)) { const z = (Math.max(w.zb, 0) + w.zt) / 2 > w.zb ? (Math.max(w.zb, 0) + w.zt) / 2 : (w.zt + w.zb) / 2;
        const zL = !cokal ? [z] : [w.zb < -0.3 ? (w.zb + Math.min(w.zt, 0)) / 2 : null, w.zt > 0.3 ? (Math.max(w.zb, 0) + w.zt) / 2 : null].filter(q => q != null); if (cokal && !zL.length) zL.push(z);
        zL.forEach((zz, i) => { const r = probeAt(m, W([s, zz])); if (r && r.mode === 'duvar' && r.lines.length && !(cokal && r.lines.every(q => /pencere|kap[ıi]/i.test(q)))) note('D|' + r.lines.join('|') + (cokal ? '|' + (zz < 0 ? 'alt' : 'ust') + Math.round(w.zb * 2) : ''), { s, z: zz, r, kind: 'duvar' }); }); }
      const fl = st.filter(it => !isWall(it)), used = new Set();
      for (const it of fl) { if (used.has(it)) continue; const ch = chainV(fl, (it.zt + it.zb) / 2); ch.forEach(q => used.add(q)); if (!ch.length || (!cokal && ch.length < 2 && !ch.some(q => q.k !== 'yapi'))) continue;
        const lines = dedupe(ch.map(q => q.ad).filter(ad => !(cokal && /^çatı$/i.test(String(ad).trim())))); if (!lines.length) continue; /* çatı örtüsü (makas, kiremit) döşeme katmanı değildir */
        const ust = cokal ? (ch.find(q => !/^çatı$/i.test(String(q.ad).trim())) || ch[0]) : ch[0]; /* kod, çatı örtüsünün değil döşemenin üstüne konur */
        note('Y|' + lines.join('|'), { s, z: (ust.zt + ch[ch.length - 1].zb) / 2, zt: ust.zt, r: { lines }, kind: 'doseme' }); }
    }
    let cand = [...runs.values()];
    // başka bir açılımın içinde kalan (alt küme) katmanlaşmalar atlanır
    if (!cokal) cand = cand.filter(c => !cand.some(o => o !== c && o.kind === c.kind && o.r.lines.length > c.r.lines.length && c.r.lines.every(l => o.r.lines.includes(l))));
    for (const c of cand) { const sm = (c.s0 + c.s1) / 2; if (c.kind === 'doseme') { c.s = sm; } else { const r = probeAt(m, W([sm, c.z])); if (r && r.lines.join('|') === c.r.lines.join('|')) c.s = sm; } }
    if (cokal) { /* kod elemanın yanında: duvarda sağ yüzden duvarTasma mm ötede, döşemede üstünde dosemeDik mm yukarıda (kural tablosu → acilim.etiket) */
      const Ek = C.acilimEtiketKural(), mmk = C.annoH(1); let n = 0;
      for (const cd of cand.slice(0, 60)) { const duvar = cd.kind === 'duvar'; if (!duvar && cd.s1 - cd.s0 < 1) continue;
        const hedef = cd.s0 + (cd.s1 - cd.s0) * 0.35, or = duvar ? null : cd.ornek.reduce((b, q) => (Math.abs(q[0] - hedef) < Math.abs(b[0] - hedef) ? q : b)); /* eğimli döşemede kodun konduğu yerdeki üst kot */
        const sx = duvar ? cd.s : or[0], zt = duvar ? 0 : or[1], za = duvar ? cd.z : zt - 0.005, a = W([sx, za]);
        const p = duvar ? W([cd.s1 + step / 2 + Ek.duvarTasma * mmk, za]) : W([sx + Ek.dosemeYatay * mmk, zt + Ek.dosemeDik * mmk]);
        C.add(C.newEnt('acilim', { a, p, lines: cd.r.lines, tur: cd.kind, side: 1, src: { k: m.nm, s: sx, z: za }, dis: 'Mimari', layer: ensL('MALZEME_ACILIM') })); n++; }
      C.changed(); return n; }
    // yerleşim: kesitin solunda / sağında, çakışmasız
    const mid = (m.ub[0] + m.ub[2]) / 2, occ = { '-1': [], '1': [] }; let n = 0;
    cand.sort((a, b) => b.z - a.z);
    for (const cd of cand.slice(0, 16)) {
      const sd = cd.s < mid ? -1 : 1, h = Math.max(1, cd.r.lines.length) * lsp; let y = cd.z + (cd.kind === 'doseme' ? h * 0.3 : h * 0.5);
      const list = occ[sd]; for (let g = 0; g < 50; g++) { const clash = list.find(([a, b]) => !(y - h > a + lsp * 0.4 || y < b - lsp * 0.4)); if (!clash) break; y = clash[1] - lsp * 0.8 - 1e-6; }
      list.push([y, y - h]);
      const px = sd < 0 ? m.ub[0] - th * 14 : m.ub[2] + th * 14;
      const a = W([cd.s, cd.kind === 'doseme' ? cd.zt - 0.005 : cd.z]); cd.r.s = cd.s;
      C.add(C.newEnt('acilim', { a, p: W([px, y]), lines: cd.r.lines, tur: cd.kind, /* 'duvar' | 'doseme' → kod öneki DU / DÖ (acilim-kod.js) */ side: sd, src: { k: m.nm, s: cd.s, z: cd.kind === 'doseme' ? cd.zt - 0.005 : cd.z }, dis: 'Mimari', layer: ensL('MALZEME_ACILIM') })); n++;
    }
    C.changed(); return n;
  };
  C._probe = { vStack, hStack, intervals, rayTris, chainV, dedupe, nm, isFnd, isWall, live }; C.malzemeAcilimOto = autoSection; C.kesitProbe = probeAt; C.kesitMetaAt = metaAt;
  /* açılım satırlarını düzenleme */
  C.acilimDuzenle = e => {
    const b = C.modal('Malzeme açılımı', `<p class="hint">Her satır bir katman (yukarıdan aşağıya / dıştan içe). "Modelden güncelle" kesitteki güncel katmanları yeniden okur.</p><textarea data-acl rows="10" style="width:100%">${(e.lines || []).join('\n').replace(/</g, '&lt;')}</textarea><div class="bar" style="margin-top:6px"><button class="pri" data-ok>Tamam</button> <button data-up>Modelden güncelle</button></div>`);
    b.querySelector('[data-ok]').onclick = () => { C.undoStack.push(C.snapshot()); e.lines = b.querySelector('[data-acl]').value.split('\n').map(s => s.trim()).filter(Boolean); delete e._c; C.changed(); C.closeModal(); };
    b.querySelector('[data-up]').onclick = () => { C.undoStack.push(C.snapshot()); if (refresh(e)) { b.querySelector('[data-acl]').value = e.lines.join('\n'); C.changed(); } else C.warn('Kesit bilgisi bulunamadı.'); };
  };
  { const m0 = C.entMenu; if (m0) C.entMenu = (ent, cx, cy) => { m0(ent, cx, cy); const mm = document.querySelector('.rdrop.entm'); if (!mm || !ent) return; const add = (t, fn) => { const b = document.createElement('button'); b.textContent = t; b.onclick = () => { mm.remove(); fn(); }; mm.insertBefore(b, mm.firstChild); };
    if (ent.type === 'acilim') add('✎ Açılım satırlarını düzenle…', () => C.acilimDuzenle(ent));
    if (ent.type === 'kaplama' && ent.kind === 'zemin') add('🏷 Mahal adı…', () => mahalAdiSor(ent));
  }; }

  /* =====================================================================
     MAHAL LİSTESİ
     ===================================================================== */
  const GROUPS = ['Temel', 'Döşeme / Zemin kaplaması', 'Duvar kaplaması', 'Tavan / Çatı', 'Kapı', 'Pencere'];
  const roomName = (e, i) => {
    if (e.ad) return e.ad;
    let best = null, bd = Infinity; const c = K().inPt ? K().inPt(e.pts) : e.pts[0];
    for (const t of C.doc.ents) if ((t.type === 'text' || t.type === 'ctext') && !t.gv && t.p && C.pointInPoly(t.p, e.pts)) { const d = M.dist2(t.p, c); if (d < bd) { bd = d; best = t; } }
    return best ? String(best.s).split('\n')[0] : `Mahal ${i + 1}`;
  };
  const mahalRows = () => {
    const rooms = [], Kc = K();
    const zem = C.doc.ents.filter(e => e.type === 'kaplama' && e.kind === 'zemin' && live(e) && e.pts && e.pts.length > 2);
    zem.forEach((e, i) => {
      const c = Kc.inPt ? Kc.inPt(e.pts) : e.pts[0], z0 = +e.z0 || 0, ztop = z0 + (Kc.tSum ? Kc.tSum(e) : 0), G = GROUPS.map(() => []);
      const st = vStack(c[0], c[1], (Object.values(C.doc.set.kesitMeta || {})[0] || {}).gb ?? 0.1);
      for (const it of st) {
        if (it.e === e) G[1].push(it.ad);
        else if (it.k === 'yal' && it.e && it.e.kind === 'zemin' && Math.abs(it.zt - z0) < 0.05) G[1].push(it.ad);
        else if (it.zt <= z0 + 0.03) { if (it.zt > z0 - 3) G[0].push(it.ad); }
        else if (it.zb >= ztop + 0.3) { if (it.e && it.e.type === 'kaplama' && it.e.kind === 'tavan') G[3].push(it.ad); else if (it.zb < ztop + 8) G[3].push(it.ad); }
      }
      // tavan: yalnız odanın hemen üstündeki zincir
      { const up = st.filter(it => it.zb >= ztop + 0.3).sort((a, b) => a.zb - b.zb); if (up.length) { const ch = chainV(up.slice().sort((a, b) => b.zt - a.zt || b.zb - a.zb), up[0].zb + 0.001); G[3] = dedupe(ch.map(q => q.ad)); } }
      // temel: döşemenin hemen altındaki zincir
      { const dn = st.filter(it => it.zt <= z0 + 0.03 && it.e !== e && !(it.e && it.e.type === 'yalitim' && it.e.kind === 'zemin')); if (dn.length) { const ch = chainV(dn, dn[0].zt - 0.001); G[0] = dedupe(ch.map(q => q.ad)); } }
      for (const w of C.doc.ents) if (w.type === 'kaplama' && w.kind === 'duvar' && w.side !== 'DIS' && live(w) && w.pts && C.pointInPoly(c, w.pts) && Math.abs((+w.z0 || 0) - z0) < 0.6) {
        const sv = (Kc.SIVA || {})[w.siva], bt = (Kc.BIT || {})[w.kap], ub = (Kc.BIT || {})[w.ub]; if (sv && w.siva !== 'yok') G[2].push(sv.ad); if (bt && w.kap !== 'yok') G[2].push(bt.ad); if (ub && w.ub && w.ub !== w.kap) G[2].push(ub.ad);
      }
      for (const o of C.doc.ents) if (o.type === 'acik' && (o.kind === 'kapi' || o.kind === 'pencere') && live(o)) {
        let b; try { b = C.bbox(o); } catch (er) { continue; } const mc = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], r = Math.max(b[2] - b[0], b[3] - b[1]) / 2 + 0.35;
        const hitR = [[r, 0], [-r, 0], [0, r], [0, -r]].some(([dx, dy]) => C.pointInPoly([mc[0] + dx, mc[1] + dy], e.pts)); if (!hitR) continue;
        const w = Math.round((+o.w || 1) * 100), h = Math.round((+o.hh || (o.kind === 'kapi' ? 2.1 : 1.4)) * 100), ad = (o.ad || o.tip || (o.kind === 'kapi' ? 'Kapı' : 'Pencere')) + ` ${w}×${h}`;
        G[o.kind === 'kapi' ? 4 : 5].push(ad);
      }
      rooms.push({ e, ad: roomName(e, i), z: ztop, G: G.map(dedupe).map(a => [...new Set(a)]) });
    });
    if (C.tipOdalar) { try { for (const r of C.tipOdalar(rooms)) rooms.push(r); } catch (er) { console.error(er); } }
    rooms.sort((a, b) => a.z - b.z || String(a.ad).localeCompare(String(b.ad), 'tr'));
    const cols = GROUPS.map((g, gi) => { const s = []; for (const r of rooms) for (const x of r.G[gi]) if (!s.includes(x)) s.push(x); return s; });
    return { rooms, cols };
  };
  let mCache = null;
  const mKey = () => { let th = ''; for (const t of C.doc.ents) if ((t.type === 'text' || t.type === 'ctext') && !t.gv) th += t.s + (t.p ? t.p[0].toFixed(1) + t.p[1].toFixed(1) : ''); for (const t of C.doc.ents) if (t.type === 'kaplama' || t.type === 'acik') th += JSON.stringify([t.pts, t.ad, t.kap, t.siva, t.w, t.s, t.kind]); return (C.modelSig ? C.modelSig() : C.rev) + '|' + JSON.stringify(C.doc.set.tipler || '') + '|' + JSON.stringify((C.doc.set.seviye || {}).list || '') + '|' + th.length + ':' + th.slice(0, 2000) + th.slice(-2000); };
  const mahalCached = () => { const k = mKey(); if (mCache && mCache.k === k) return mCache.v; const v = mahalRows(); mCache = { k, v }; return v; };
  C.mahalVerisi = mahalCached;
  const mahalAdiSor = e => { const b = C.modal('Mahal adı', `<div class="fld"><label>Mahal adı</label><input data-ad value="${String(e.ad || roomName(e, 0)).replace(/"/g, '&quot;')}" style="width:100%"></div><div class="bar"><button class="pri" data-ok>Tamam</button></div>`); const ok = () => { C.undoStack.push(C.snapshot()); e.ad = b.querySelector('[data-ad]').value.trim(); C.doc.ents.forEach(x => { if (x.type === 'mahaltablo') delete x._c; }); C.changed(); C.closeModal(); }; b.querySelector('[data-ok]').onclick = ok; b.querySelector('[data-ad]').onkeydown = ev => { if (ev.key === 'Enter') ok(); }; setTimeout(() => b.querySelector('[data-ad]').select(), 30); };
  C.addCommand(['MAHALADI', 'ODAADI', 'ROOMNAME'], 'Mahal (oda) adı: zemin kaplaması olan odaya tıklayın, adını yazın (mahal listesinde kullanılır).', async (I) => {
    const q = await I.pt('Odanın içine tıklayın'); if (!q || typeof q === 'string') return; const e = C.doc.ents.find(x => x.type === 'kaplama' && x.kind === 'zemin' && x.pts && C.pointInPoly(q, x.pts)); if (!e) { C.warn('Burada zemin kaplaması yok (önce ZEMINKAPLAMA ile odaya kaplama verin).'); return; }
    const v = await I.str('Mahal adı', e.ad || roomName(e, 0)); if (v == null) return; e.ad = String(v).trim(); C.doc.ents.forEach(x => { if (x.type === 'mahaltablo') delete x._c; }); C.changed();
  });
  /* tablo nesnesi: modelden canlı */
  T.mahaltablo = {
    label: 'Mahal listesi',
    prims: e => {
      const { rooms, cols } = mahalCached(), k = C.doc.set.anno / 1000, o0 = M.p3(e.p), out = [], st = kotSt(), tx = s => C.txL ? C.txL(s) : s, th = 1.8 * k, thS = 1.6 * k;
      const mw = s => C.measureText(tx(s), thS, C.textStyle(st));
      const lc = { color: 1 }, X = (x, y) => [o0[0] + x, o0[1] - y, 0], LN = (x1, y1, x2, y2) => out.push(L(X(x1, y1), X(x2, y2), lc)), TXT = (x, y, h, s, al, rot, col) => out.push(TX(X(x, y), h, s, rot || 0, al, Object.assign({ color: col == null ? 7 : col }, st ? { st } : {})));
      const cw = 6 * k, nw = 14 * k, lvW = 12 * k, rmW = Math.max(45 * k, Math.min(90 * k, Math.max(0, ...rooms.map(r => mw(r.ad))) + 6 * k)), titleH = 10 * k, grpH = 7 * k, numH = 5 * k, rowH = 6.5 * k;
      const vnH = Math.min(75 * k, Math.max(35 * k, Math.max(0, ...cols.flat().map(mw)) + 6 * k));
      const used = GROUPS.map((g, i) => i).filter(i => cols[i].length);
      const gH = 2.2 * k, nwOf = gi => Math.max(nw, C.measureText(tx(GROUPS[gi]), gH, C.textStyle(st)) + 3 * k - cols[gi].length * cw); let x = lvW + rmW; const gx = []; for (const gi of used) { gx.push([gi, x]); x += cols[gi].length * cw + nwOf(gi); } const W = x;
      const hdrH = titleH + grpH + numH + vnH, H = hdrH + Math.max(1, rooms.length) * rowH;
      // dış çerçeve + başlık
      LN(0, 0, W, 0); LN(0, H, W, H); LN(0, 0, 0, H); LN(W, 0, W, H); LN(0, titleH, W, titleH);
      TXT(W / 2, titleH * 0.72, 4 * k, 'MAHAL LİSTESİ' + (e.title ? ' — ' + e.title : ''), 'C', 0, 4);
      // sol başlıklar (dikey)
      LN(lvW, titleH, lvW, H); LN(lvW + rmW, titleH, lvW + rmW, H); LN(0, hdrH, W, hdrH);
      TXT(lvW * 0.62, hdrH - 3 * k, 2.6 * k, 'Kat / Seviye', 'L', Math.PI / 2, 4); TXT(lvW + rmW * 0.5 + 1.2 * k, hdrH - 3 * k, 2.6 * k, 'Mahal adı', 'L', Math.PI / 2, 4);
      for (const [gi, gx0] of gx) {
        const n = cols[gi].length, nwG = nwOf(gi), gw = n * cw + nwG; LN(gx0, titleH, gx0, H); LN(gx0, titleH + grpH, gx0 + gw, titleH + grpH); LN(gx0, titleH + grpH + numH, gx0 + n * cw, titleH + grpH + numH);
        TXT(gx0 + 1.2 * k, titleH + grpH * 0.68, gH, GROUPS[gi], 'L', 0, 2);
        for (let j = 0; j < n; j++) { const cx = gx0 + j * cw; if (j) LN(cx, titleH + grpH, cx, H); TXT(cx + cw / 2, titleH + grpH + numH * 0.72, thS, String(j + 1), 'C', 0, 7); TXT(cx + cw / 2 + thS * 0.45, hdrH - 1.5 * k, thS, cols[gi][j], 'L', Math.PI / 2, 7); }
        LN(gx0 + n * cw, titleH + grpH, gx0 + n * cw, H); TXT(gx0 + n * cw + nwG / 2, hdrH - 1.5 * k, thS, 'NOT', 'C', 0, 7);
      }
      // satırlar
      let lvStart = 0;
      rooms.forEach((r, i) => {
        const y0 = hdrH + i * rowH, y1 = y0 + rowH; LN(lvW, y1, W, y1);
        TXT(lvW + 1.5 * k, y0 + rowH * 0.68, th, r.ad, 'L', 0, 7);
        for (const [gi, gx0] of gx) cols[gi].forEach((m, j) => { if (r.G[gi].includes(m)) { const c = X(gx0 + j * cw + cw / 2, y0 + rowH / 2); out.push(CI(c, 1.25 * k, { color: 1 })); out.push(CI(c, 0.6 * k, { color: 1 })); out.push(S([[c[0] - 0.42 * k, c[1] - 0.42 * k, 0], [c[0] + 0.42 * k, c[1] - 0.42 * k, 0], [c[0] - 0.42 * k, c[1] + 0.42 * k, 0], [c[0] + 0.42 * k, c[1] + 0.42 * k, 0]], { color: 7 })); } });
        const last = i === rooms.length - 1 || Math.abs(rooms[i + 1].z - r.z) > 0.05;
        if (last) { LN(0, y1, lvW, y1); const nr = i + 1 - lvStart, ym = hdrH + ((lvStart + i + 1) / 2) * rowH, lt = 'Kot ' + C.fmtKot(r.z), lw = C.measureText(tx(lt), 2 * k, C.textStyle(st)); if (lw + 2 * k <= nr * rowH) TXT(lvW * 0.62, ym + lw / 2, 2 * k, lt, 'L', Math.PI / 2, 4); else { const hh = Math.min(1.6 * k, (lvW - 1.5 * k) / Math.max(1e-9, lw / (2 * k))); TXT(lvW / 2, ym + hh / 2, hh, lt, 'C', 0, 4); } lvStart = i + 1; }
      });
      if (!rooms.length) TXT(lvW + 2 * k, hdrH + rowH * 0.68, th, 'Zemin kaplaması (ZEMINKAPLAMA) verilmiş oda yok', 'L', 0, 7);
      return out;
    },
    xf: (e, X) => { e.p = X.p(M.p3(e.p)); },
    snaps: e => [{ p: M.p3(e.p), k: 'end' }],
    info: e => { const { rooms, cols } = mahalCached(); return `Mahal listesi · ${rooms.length} mahal · ${cols.reduce((s, c) => s + c.length, 0)} malzeme sütunu (modelden canlı)`; },
  };
  C.on('changeIdle', () => { if (!C.doc.ents.some(e => e.type === 'mahaltablo')) return; const k = mKey(); if (mCache && mCache.k === k) return; for (const e of C.doc.ents) if (e.type === 'mahaltablo' && e._c) { delete e._c.p; delete e._c.b; } if (C.views) for (const w of Object.values(C.views)) if (w && 'dirty' in w) w.dirty = true; });
  C.addCommand(['MAHALLISTESI', 'MAHALLISTE', 'ROOMSCHEDULE', 'ODALISTESI'], 'Mahal listesi (Room Finish Schedule): her oda için temel, zemin, duvar, tavan/çatı, kapı ve pencere malzemeleri — numaralı dikey yazılı sütunlar ve noktalar. Modelden canlı güncellenir; yalnız Mimari paftalarda görünür. Oda adları: MAHALADI ya da odaya yazı.', async (I) => {
    const { rooms } = mahalRows(); if (!rooms.length) { C.warn('Zemin kaplaması verilmiş oda yok: önce İnşaat › ZEMINKAPLAMA ile odalara kaplama verin (mahal listesi odaları buradan alır).'); return; }
    const p = await I.pt('Tablonun sol üst köşesi'); if (!p || typeof p === 'string') return;
    C.add(C.newEnt('mahaltablo', { p: M.p3(p), dis: 'Mimari', layer: ensL('MAHAL_LISTESI') })); C.changed(); C.log(`Mahal listesi: ${rooms.length} mahal.`);
  });
})(window.C);

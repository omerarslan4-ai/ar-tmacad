/* ArıtmaCAD — DİSİPLİN GÖRÜNÜMLERİ (Revit "görünüm + görünüm şablonu + pafta" mantığı)
   Tek model (Tasarım) → kesit bir kez alınır → seçilen her disiplinin (Mimari, Statik, Mekanik, Elektrik …) pafta grubuna
   o disiplinin görünüm şablonuyla otomatik yerleşir. Paftadaki pencereler görünüşe bağlıdır: GORUNUMGUNCELLE ile kesit
   modelden yeniden üretilince bütün paftalar birlikte güncellenir.
   Görünüm şablonu: her nesne katmanından bir kategoriye ayrılır (BETON, MIMARI, MEKANIK, ELEKTRIK, DONATI); disipline göre
   N = normal, S = soluk (gri, ince), G = gizli. Ölçü, kot, yazı, aks her zaman normal.
   Üretilen kesitler Tasarım planında gizlidir (GORUNUSGOSTER ile modelin sağındaki "görünüşler bölgesi"nde gösterilir);
   plandaki kesit işareti (A—A) Tasarım'da kalır.
   Komutlar: KESITPAFTA (kesit al + disiplin paftalarına dağıt), GORUNUMPAFTA (var olan bir görünüşü dağıt),
             GORUNUMGUNCELLE (modelden yeniden üret), GORUNUMLER (liste / sil), GORUNUSGOSTER (Tasarım'da göster/gizle),
             MEKTABLO (ünite ekipmanından mekanik tablolar → Mekanik paftası) */
(function (C) {
  'use strict';
  const M = C.M, E = C.cmd;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const VL = () => (C.doc.set.gorunumler = C.doc.set.gorunumler || []);

  /* ================= KATEGORİ + ŞABLON ================= */
  const KAT = [
    ['DONATI', /DONATI|ETRIYE|REBAR/],
    ['ELEKTRIK', /ELK|ELEKTRIK|KABLO|PANO|AYDINLATMA|TRAFO|JENERATOR|TOPRAKLAMA/],
    ['MEKANIK', /^MEK|_MEK|BORU|PIPE|VANA|VALVE|POMPA|PUMP|IZGARA|KAPAK|EKIPMAN|BLOWER|MIKSER|DIFUZOR|DIFFUZOR|KOMPRESOR|SIYIRICI|KOPRU|VINC|DOZAJ|DEKANTOR|ELEK$|ELEK_|AKTUATOR|FLANS|POZ$|_POZ/],
    ['MIMARI', /DUVAR|KAPI|PENCERE|KAPLAMA|YALITIM|CATI$|CATI_ORTU|KORKULUK|TRETUVAR|MAHAL|SIVA|DOGRAMA/],
    ['BETON', /PERDE|KOLON|KIRIS|DOSEME|PLAK|TEMEL|RADYE|PARAPET|AYAK_DUVARI|MERDIVEN|TANK|BETON|GROBETON|KICKER|CATI_DOSEMESI|^KESIT$|^KESIT_TARAMA$/],
  ];
  const HEP_NORMAL = /^(YAZI|EKSEN|AKS|KOT|OLCU|KESIT_OLCU|ZEMIN|KESIT_ISARET|BASLIK|PAFTA)/;
  C.gorunumKategori = e => {
    if (!e) return null;
    if (['dim', 'kot', 'text', 'ctext', 'baslik', 'aks', 'kesitisaret'].includes(e.type) && !/POZ/.test(e.layer || '')) return null;
    let l = C.up(String(e.layer || '')); if (HEP_NORMAL.test(l)) return null;
    l = l.replace(/^(KESIT|GORUNEN)_/, '').replace(/_TARAMA$/, '').replace(/^INS_|^ARI_/, '');
    if (e.type === 'pipe' || e.type === 'pump' || e.type === 'valve' || e.type === 'aile' || e.type === 'izgara' || e.type === 'blk') return 'MEKANIK';
    for (const [k, re] of KAT) if (re.test(l)) return k;
    return null;
  };
  C.GORUNUM_SABLON = {
    mimari: { ad: 'Mimari', BETON: 'N', MIMARI: 'N', MEKANIK: 'S', ELEKTRIK: 'G', DONATI: 'G' },
    statik: { ad: 'Statik', BETON: 'N', DONATI: 'N', MIMARI: 'S', MEKANIK: 'G', ELEKTRIK: 'G' },
    mekanik: { ad: 'Mekanik', MEKANIK: 'N', BETON: 'S', MIMARI: 'S', ELEKTRIK: 'G', DONATI: 'G' },
    elektrik: { ad: 'Elektrik', ELEKTRIK: 'N', BETON: 'S', MIMARI: 'S', MEKANIK: 'S', DONATI: 'G' },
  };
  const sablonAd = g => { const s = C.up(String(g || '')); if (/MIMAR/.test(s)) return 'mimari'; if (/STAT|BETONARME|INSAAT/.test(s)) return 'statik'; if (/MEKAN/.test(s)) return 'mekanik'; if (/ELEKT/.test(s)) return 'elektrik'; return null; };
  C.gorunumSablonu = g => C.GORUNUM_SABLON[sablonAd(g)] || null;
  {
    const v0 = C.vpPrims;
    C.vpPrims = function (vp, cb) {
      const sk = vp && vp.disiplin ? C.gorunumSablonu(vp.disiplin) : null;
      if (!sk) return v0.call(this, vp, cb);
      return v0.call(this, vp, (e, pr) => {
        const k = C.gorunumKategori(e), md = k ? (sk[k] || 'N') : 'N';
        if (md === 'G') return;
        if (md === 'S') pr = pr.map(p => Object.assign({}, p, { color: 8, lw: 9 }));
        cb(e, pr);
      });
    };
  }

  /* ================= TASARIM PLANINDA GİZLE ================= */
  const gizliGv = () => { const s = new Set(); for (const v of VL()) if (v.gv) s.add(v.gv); return s; };
  if (C.state.gorunusModel == null) C.state.gorunusModel = false;
  {
    const P2 = C.View2D && C.View2D.prototype;
    if (P2) {
      const wf = (self, fn) => {
        if (self.isLayout || C.vpEdit || C.state.gorunusModel || !VL().length) return fn();
        const gs = gizliGv(), all = C.doc.ents; if (!all.some(e => e.gv && gs.has(e.gv))) return fn();
        C.doc.ents = all.filter(e => !(e.gv && gs.has(e.gv)) || e.type === 'kesitisaret'); try { return fn(); } finally { C.doc.ents = all; }
      };
      for (const k of ['draw', 'pick', 'windowSel', 'snap', 'zoomExtents']) { const f0 = P2[k]; if (f0) P2[k] = function () { return wf(this, () => f0.apply(this, arguments)); }; }
    }
  }

  /* ================= YARDIMCILAR ================= */
  const pt = p => `${(+p[0]).toFixed(4)},${(+p[1]).toFixed(4)}`;
  const gruplar = () => { const s = C.doc.set; s.grups = s.grups || ['Mimari', 'Mekanik', 'Statik', 'Elektrik', 'Genel']; return s.grups.slice(); };
  const bolgeYeri = () => { // görünüşler bölgesi: modelin ve önceki görünüşlerin sağı
    const bb = C.extents(C.doc.ents.filter(e => e.type !== 'sheet')) || [0, 0, 10, 10];
    return [bb[2] + Math.max(15, (bb[2] - bb[0]) * 0.25), bb[1], 0];
  };
  const disiplinSec = (baslik, onSecili, olcek0) => new Promise(res => {
    const gs = gruplar();
    const b = C.modal(baslik, `<p class="hint" style="margin:0 0 8px">Kesit seçilen her disiplinin pafta grubuna o disiplinin görünüm şablonuyla yerleşir. Model değişince <b>GORUNUMGUNCELLE</b> ile hepsi birlikte güncellenir.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px"><tr><th style="text-align:left">Disiplin (pafta grubu)</th><th style="text-align:left">Görünüm şablonu</th></tr>
      ${gs.map(g => { const s = C.gorunumSablonu(g); return `<tr><td style="padding:3px 0"><label><input type="checkbox" data-g="${esc(g)}" ${onSecili(g) ? 'checked' : ''}> ${esc(g)}</label></td><td class="hint">${s ? Object.entries(s).filter(([k]) => k !== 'ad').map(([k, v]) => `${k.toLowerCase()}: ${v === 'N' ? 'normal' : v === 'S' ? 'soluk' : 'gizli'}`).join(' · ') : 'tümü normal'}</td></tr>`; }).join('')}</table>
      <div class="fld" style="margin-top:10px"><label>Pafta ölçeği</label><select id="gpOl">${[20, 25, 50, 75, 100, 200].map(s => `<option value="${s}" ${s === olcek0 ? 'selected' : ''}>1/${s}</option>`).join('')}</select></div>
      <div class="bar" style="justify-content:flex-end;margin-top:10px"><button id="gpI">İptal</button><button id="gpT" class="pri">Paftalara yerleştir</button></div>`);
    let done = false; const fin = v => { if (done) return; done = true; clearInterval(tm); C.closeModal(); res(v); };
    b.querySelector('#gpI').onclick = () => fin(null);
    b.querySelector('#gpT').onclick = () => fin({ gruplar: [...b.querySelectorAll('[data-g]')].filter(x => x.checked).map(x => x.dataset.g), olcek: +b.querySelector('#gpOl').value });
    const tm = setInterval(() => { const m = document.querySelector('#modal'); if (m && m.classList.contains('hidden')) fin(null); }, 300);
  });

  /* pafta içinde boş yer: üstten aşağı, soldan sağa (5 mm adım, 8 mm boşluk) */
  const yerBul = (L, w, h) => {
    const fr = C.layoutFrame(L), x0 = fr.x0 + 5, x1 = fr.x1 - 5, y0 = fr.tbTop + 5, y1 = fr.y1 - 5, g = 8;
    if (w > x1 - x0 || h > y1 - y0) return null;
    const cak = (x, y) => L.vps.some(v => x < v.x + v.w + g && x + w + g > v.x && y < v.y + v.h + g && y + h + g > v.y);
    for (let y = y1 - h; y >= y0 - 1e-9; y -= 5) for (let x = x0; x + w <= x1 + 1e-9; x += 5) if (!cak(x, y)) return [x, y];
    return null;
  };
  const paftayaKoy = (v, g) => {
    const ents = C.doc.ents.filter(e => e.gv === v.gv && e.type !== 'kesitisaret'); if (!ents.length) return null;
    const bb = C.extents(ents), k = 1000 / v.olcek, w = (bb[2] - bb[0]) * k + 10, h = (bb[3] - bb[1]) * k + 10;
    const lays = C.doc.layouts = C.doc.layouts || [];
    // aynı görünüm bu grupta zaten varsa sadece güncelle
    for (const L of lays) if (L.grp === g) { const vp = L.vps.find(q => q.gorunum === v.id); if (vp) { Object.assign(vp, { cx: (bb[0] + bb[2]) / 2, cy: (bb[1] + bb[3]) / 2, scale: v.olcek, gvOnly: v.gv }); return L; } }
    let L = null, at = null;
    for (const X of lays) if (X.grp === g && X.kesitPaftasi) { const q = yerBul(X, w, h); if (q) { L = X; at = q; break; } }
    if (!L) {
      const n = lays.filter(X => X.grp === g && X.kesitPaftasi).length + 1, gp = C.grpCur;
      C.grpCur = g; L = C.newLayout(`${g.toLocaleUpperCase('tr')} — KESİTLER ${n}`, 'A1', 'L'); C.grpCur = gp;
      L.grp = g; L.kesitPaftasi = true; L.vps = []; L.f = Object.assign(L.f || {}, { baslik: `${g.toLocaleUpperCase('tr')} KESİTLERİ${n > 1 ? ' ' + n : ''}` });
      at = yerBul(L, w, h);
      if (!at) { L.size = 'A0'; at = yerBul(L, w, h); }
      if (!at) { const fr = C.layoutFrame(L); at = [fr.x0 + 5, fr.tbTop + 5]; }
    }
    const fr = C.layoutFrame(L), wv = Math.min(w, fr.x1 - fr.x0 - 10), hv = Math.min(h, fr.y1 - fr.tbTop - 10);
    L.vps.push({ x: at[0], y: at[1], w: wv, h: hv, cx: (bb[0] + bb[2]) / 2, cy: (bb[1] + bb[3]) / 2, scale: v.olcek, gvOnly: v.gv, frame: { on: false }, disiplin: g, gorunum: v.id });
    return L;
  };

  /* kesiti modelden üret (KESITAL motoru), yeni nesneleri görünüm grubuna bağla */
  const kesitUret = async (v) => {
    const def = C.cmds.SECTION || C.cmds.KESITAL; if (!def) throw new Error('KESITAL komutu bulunamadı');
    const once = new Set(C.doc.ents.map(e => e.id));
    const q0 = E.queue; E.queue = [pt(v.a), pt(v.b), pt(v.sp), String(v.depth), v.nm, pt(v.yer)];
    try { await def.fn(C.I, C); } finally { E.queue = q0 || []; }
    const yeni = C.doc.ents.filter(e => !once.has(e.id));
    if (!yeni.length) return 0;
    v.gv = v.gv || ('V' + Date.now().toString(36));
    for (const e of yeni) {
      delete e.sp; delete e.sv2; delete e._c;
      if (e.type === 'kesitisaret') { delete e.gv; e.gorunum = v.id; v.isaret = e.id; continue; } // plan işareti Tasarım'da kalır
      e.gv = v.gv;
    }
    // malzeme açılımları (yalnız Mimari paftalarda görünür: açılımın disiplini Mimari)
    try {
      const km = (C.doc.set.kesitMeta || {})[v.nm];
      if (km && C.malzemeAcilimOto && v.acilim !== false) {
        const o2 = new Set(C.doc.ents.map(e => e.id)); C.malzemeAcilimOto(Object.assign({ nm: v.nm }, km));
        for (const e of C.doc.ents) if (!o2.has(e.id) && e.type === 'acilim') { e.gv = v.gv; e.dis = 'Mimari'; delete e.sp; }
      }
    } catch (er) { console.error('malzeme açılımı', er); }
    return yeni.length;
  };
  const sil = v => { C.doc.ents = C.doc.ents.filter(e => !(v.gv && e.gv === v.gv) && !(e.type === 'kesitisaret' && e.gorunum === v.id)); };

  /* ================= KOMUTLAR ================= */
  let harf = 0;
  C.addCommand(['KESITPAFTA', 'DKESIT', 'KESITDISIPLIN', 'DISIPLINKESIT'], 'Modelden kesit al ve seçilen tüm disiplin paftalarına (Mimari, Statik, Mekanik, Elektrik …) disiplin görünüm şablonuyla otomatik yerleştir. Model değişince GORUNUMGUNCELLE.', async (I) => {
    const a = await I.pt('Kesit çizgisi 1. nokta'); if (!a || typeof a === 'string') return;
    E.base = a; const b = await I.pt('Kesit çizgisi 2. nokta'); E.base = null; if (!b || typeof b === 'string') return;
    const u = M.norm([b[0] - a[0], b[1] - a[1], 0]), Lc = M.dist2(a, b);
    E.preview = c => { let n = [-u[1], u[0]]; if ((c[0] - a[0]) * n[0] + (c[1] - a[1]) * n[1] < 0) n = [-n[0], -n[1]]; const m = M.lerp(a, b, 0.5), q = [m[0] + n[0] * Lc * 0.15, m[1] + n[1] * Lc * 0.15, 0]; return [C.prim.L(a, b, { lt: 'PHANTOM' }), C.prim.L(m, q)]; };
    const sp = await I.pt('Bakış yönü (kesitin baktığı taraf)'); E.preview = null; if (!sp || typeof sp === 'string') return;
    const depth = await I.num('Görüş derinliği (m)', 30);
    const used = new Set(C.doc.ents.filter(e => e.type === 'kesitisaret').map(e => e.name).concat(VL().map(v => v.nm)));
    let nm = String.fromCharCode(65 + harf); while (used.has(nm) && harf < 25) nm = String.fromCharCode(65 + ++harf);
    nm = (await I.str('Kesit adı (harf)', nm, { whole: false }) || nm).toUpperCase().slice(0, 3);
    const sec = await disiplinSec(`${nm}-${nm} kesiti — hangi disiplin paftalarında olsun?`, g => !/GENEL/i.test(g), +(C.doc.set.sonKesitOlcek || 50)); if (!sec) return;
    C.doc.set.sonKesitOlcek = sec.olcek;
    const v = { id: 'G' + Date.now().toString(36), tip: 'kesit', ad: `${nm}-${nm} KESİTİ`, nm, a: [a[0], a[1]], b: [b[0], b[1]], sp: [sp[0], sp[1]], depth: +depth || 30, yer: bolgeYeri(), olcek: sec.olcek, gruplar: sec.gruplar };
    const n = await kesitUret(v); if (!n) { C.warn('Kesit üretilemedi (kesit çizgisi 3B modele değmiyor olabilir).'); return; }
    VL().push(v);
    const yer = sec.gruplar.map(g => { const L = paftayaKoy(v, g); return L ? `${g}: ${L.name}` : null; }).filter(Boolean);
    try { if (C.pstil && C.pstil() && yer.some(t => /^Mimari/.test(t)) && C.doc.ents.some(e => e.type === 'acilim')) C.acilimTablo(true); } catch (er) { console.error('açılım tablosu', er); } // örnek proje düzeni: kodlu açılım tablosu Mimari paftasında
    C.changed(); C.emit('layouts');
    C.log(`${v.ad} üretildi (${n} nesne) ve ${yer.length} disiplin paftasına yerleştirildi — ${yer.join(' · ')}. Alt sekmelerden ilgili disipline geçin. Tasarım'da görmek: GORUNUSGOSTER.`);
  });

  /* ================= MEKANİK TABLOLAR (ünite ekipmanından) =================
     Ünitenin bağlı ekipmanı (aile örnekleri: kapak, mikser, ızgara, pompa …; merdiven, korkuluk) → MEKANİK EKİPMAN LİSTESİ,
     KAPAK ÇİZELGESİ, MİKSER ÇİZELGESİ. Tablolar model uzayında (görünüşler bölgesinde) pafta mm ölçüsüyle çizilir ve
     Mekanik paftasına kesitlerle aynı ölçekte pencere olarak yapışır. */
  const mekSatirlar = u => {
    const FAM = C.AILELER || {}, ch = C.doc.ents.filter(e => e.bag === u.id), ek = [], kap = [], mik = [];
    const grp = new Map(), add = (key, o, tag) => { const g = grp.get(key) || Object.assign({ tags: [], n: 0 }, o); g.n += o.adet || 1; if (tag) g.tags.push(tag); grp.set(key, g); };
    const kisa = s => String(s || '').replace(/\s*\(yedek\)/, '');
    const kot = z => (C.fmtKot ? C.fmtKot(+z || 0) : (+z || 0).toFixed(2));
    for (const e of ch) {
      if (e.type === 'aile' && FAM[e.fam]) {
        const d = FAM[e.fam], q = C.aileDegerE ? C.aileDegerE(e) : e.par, oz = d.liste ? d.liste(q) : '';
        add(e.fam + '|' + oz, { tanim: d.kisaAd || d.ad, oz, birim: 'adet' }, kisa(e.ad));
        if (e.fam === 'penstock_kanal') kap.push([kisa(e.ad), `${q.B} × ${q.H}`, `${Math.round(q.D)}`, q.Hf < q.D ? `kısa (${q.Hf}) + uzatma mili` : `tam (${q.Hf})`, q.tahrik === 'AKT' ? 'elektrikli aktüatör' : 'el çarkı', kot(e.z)]);
        if (e.fam === 'dalgic_mikser') mik.push([kisa(e.ad), `Ø${q.D}`, `${q.P} kW`, `${q.rpm} d/dk`, kot(e.z)]);
      } else if (e.type === 'merdiven') { const H = Math.abs((+e.z1 || 0) - (+e.z0 || 0)); add('merdiven|' + e.tip, { tanim: e.tip === 'beton' ? 'BETONARME MERDİVEN' : 'MERDİVEN', oz: `en ${(+e.w || 1).toFixed(2)} m, H = ${H.toFixed(2)} m, ${e.kork === 'iki' ? 'iki yanı' : 'tek yanı'} korkuluklu`, birim: 'adet' }); }
      else if (e.type === 'korkuluk') { const P = e.pts || []; let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); add('korkuluk', { tanim: 'KORKULUK', oz: `${e.km || 'galvaniz'}, h = ${((+e.kh || 110) / 100).toFixed(2)} m`, birim: 'm', adet: L }); }
    }
    let poz = 0; for (const g of grp.values()) ek.push([String(++poz), g.tags.length ? (g.tags.length > 3 ? `${g.tags[0]} … ${g.tags[g.tags.length - 1]}` : g.tags.join(', ')) : '', g.tanim, g.oz, g.birim === 'm' ? g.n.toFixed(1) : String(g.n), g.birim]);
    return { ek, kap, mik };
  };
  /* tablo çiz (model uzayı, metre): pafta mm × k; döner: yükseklik (mm) */
  const tabloCiz = (o, x0, yTop, k, baslik, cols, rows, gv) => {
    const ly = 'MEK_TABLO', h = 2.0, X = [x0]; cols.forEach(c => X.push(X[X.length - 1] + c.w)); const xE = X[X.length - 1];
    const ln = (a, b, lw) => { const e = C.add(C.newEnt('line', { a: [a[0] * k + o[0], a[1] * k + o[1], 0], b: [b[0] * k + o[0], b[1] * k + o[1], 0], layer: ly, lw: lw || 18 })); e.gv = gv; delete e.sp; };
    const tx = (p, s, hh, al) => { const e = C.add(C.newEnt('text', { p: [p[0] * k + o[0], p[1] * k + o[1], 0], h: hh * k, s: String(s), rot: 0, al, layer: 'YAZI' })); e.gv = gv; delete e.sp; };
    let y = yTop; ln([x0, y], [xE, y], 35); tx([(x0 + xE) / 2, y - 5.2], baslik, 3.0, 'C'); y -= 7.5; ln([x0, y], [xE, y], 35);
    cols.forEach((c, i) => tx([(X[i] + X[i + 1]) / 2, y - 4.6], c.t, h, 'C')); y -= 7; ln([x0, y], [xE, y], 35);
    for (const r of rows) { r.forEach((v, i) => tx([cols[i].al === 'L' ? X[i] + 1.2 : (X[i] + X[i + 1]) / 2, y - 4.4], v, h, cols[i].al || 'C')); y -= 6.5; ln([x0, y], [xE, y]); }
    for (const x of X) ln([x, yTop - 7.5], [x, y], x === x0 || x === xE ? 35 : 18); ln([x0, yTop], [x0, yTop - 7.5], 35); ln([xE, yTop], [xE, yTop - 7.5], 35);
    return yTop - y;
  };
  /* MALZEME AÇILIM TABLOSU (örnek proje düzeni): "DÖŞEMELER" / "DUVARLAR" başlıkları altında kodlu kutular → Mimari paftası.
     Pafta stilinde ölçüler kural tablosundan (app/cizim-kural.js → MIMARI.acilim.kutu; Çokal R2'den ölçüldü): başlık 4; kod 3,5 (altı çizili, renk 94);
     satır 2,5; sütun aralığı 84; çerçeveli. Eski görünümde: başlık 3,04; kod 2,66; satır 1,9; kutu aralığı 55; satır aralığı 3,2. Yazı stili YZ. */
  C.acilimTablo = (sessiz) => {
    if (!C.acilimTabloVeri) return null; const G = C.acilimTabloVeri(); if (!G.length) { if (!sessiz) C.warn('Çizimde malzeme açılımı yok (önce KESITPAFTA ile kesit alın ya da MALZEMEACILIM).'); return null; }
    const ps = C.pstil ? C.pstil() : null, st = ps ? ps.yazi : undefined, ol = +(C.doc.set.sonKesitOlcek || 50), k = ol / 1000, ly = 'MALZEME_ACILIM'; C.ensureLayer(ly, 7, 'CONTINUOUS', 25);
    const eski = VL().find(v => v.tip === 'tablo' && v.unite === 'ACILIM'), gv = (eski && eski.gv) || ('T' + Date.now().toString(36)); C.doc.ents = C.doc.ents.filter(e => e.gv !== gv);
    const o = eski && eski.o ? eski.o : bolgeYeri(), K = C.acilimKodApi;
    const tx = (x, y, s, h, renk) => { const e = C.add(C.newEnt('text', Object.assign({ p: [x * k + o[0], y * k + o[1], 0], h: h * k, s: String(s), rot: 0, al: 'L', layer: ly }, st ? { st } : {}, renk ? { color: renk } : {}))); e.gv = gv; delete e.sp; return e; };
    const ln = (x0, y0, x1, y1, renk) => { const e = C.add(C.newEnt('line', Object.assign({ a: [x0 * k + o[0], y0 * k + o[1], 0], b: [x1 * k + o[0], y1 * k + o[1], 0], layer: ly, lw: 18 }, renk ? { color: renk } : {}))); e.gv = gv; delete e.sp; };
    const gen = (s, h) => (C.measureText ? C.measureText(s, h, C.textStyle(st)) * (C.textStyle(st).wf || 1) : s.length * h * 0.7);
    let y = 0, n = 0;
    /* Çokal R2 düzeni (kural tablosu → acilim.kutu): çerçeve içinde üstte DÖŞEMELER, altta DUVARLAR; kodlar yan yana; yazılar Yazi25, çerçeve Mim_Yazi25 katmanında */
    const Kt = ps && C.cizimKural && C.cizimKural.MIMARI.acilim ? C.cizimKural.MIMARI.acilim.kutu : null;
    if (Kt) { const lyY = 'MALZEME_ACILIM_YAZI'; C.ensureLayer(lyY, 7, 'CONTINUOUS', 25);
      const ty = (x, yy, s, h, renk) => { const e = tx(x, yy, s, h, renk); e.layer = lyY; return e; }, cz = (x0, y0, x1, y1, renk, kat) => { ln(x0, y0, x1, y1, renk); const e = C.doc.ents[C.doc.ents.length - 1]; e.layer = kat || lyY; if (kat) e.lw = 25; };
      let gTop = 0, sonKutu = 0, enAlt = 0, sut = 1;
      for (const g of G) { const yB = gTop - Kt.baslikAlt, yK = gTop - Kt.kutuAlt; sonKutu = yK; enAlt = yK; sut = Math.max(sut, g.kutular.length);
        ty(Kt.kenar + 2.6, yB, g.baslik, Kt.baslikMm); cz(Kt.kenar + 2.6, yB - 0.9, Kt.kenar + 2.6 + gen(g.baslik, Kt.baslikMm), yB - 0.9);
        g.kutular.forEach((kt, i) => { const x = Kt.kenar + i * Kt.sutun; let yy = yK - Kt.kodMm;
          ty(x, yy, kt.kod, Kt.kodMm, Kt.kodRenk); cz(x, yy - 0.8, x + gen(kt.kod, Kt.kodMm), yy - 0.8, Kt.kodRenk); yy -= Kt.kodAralik;
          for (const s of kt.satir) K.kaydir(s, Kt.satirHarf).forEach((parca, j) => { if (j === 0) ty(x, yy, '-', Kt.satirMm); ty(x + Kt.girinti, yy, parca, Kt.satirMm); yy -= Kt.satirAralik; });
          enAlt = Math.min(enAlt, yy + Kt.satirAralik); n++; });
        gTop = Math.min(enAlt, yK - 22) - 2; }
      const yAlt = Math.min(enAlt - 6, sonKutu - 30.4), gW = sut * Kt.sutun;
      cz(0, 0, gW, 0, null, ly); cz(gW, 0, gW, yAlt, null, ly); cz(gW, yAlt, 0, yAlt, null, ly); cz(0, yAlt, 0, 0, null, ly);
    } else
    for (const g of G) {
      tx(0, y - 3.04, g.baslik, 3.04); ln(0, y - 3.8, gen(g.baslik, 3.04), y - 3.8); y -= 8.5; let enAlt = y;
      g.kutular.forEach((kt, i) => { const x = i * 55; let yy = y;
        tx(x, yy - 2.66, kt.kod, 2.66, 94); ln(x, yy - 3.3, x + gen(kt.kod, 2.66), yy - 3.3, 94); yy -= 6.6;
        for (const s of kt.satir) K.kaydir(s, 30).forEach((parca, j) => { if (j === 0) tx(x, yy - 1.9, '-', 1.9); tx(x + 2.6, yy - 1.9, parca, 1.9); yy -= 3.2; });
        enAlt = Math.min(enAlt, yy); n++; });
      y = enAlt - 7;
    }
    let v = eski; if (!v) { v = { id: 'G' + Date.now().toString(36), tip: 'tablo', unite: 'ACILIM', ad: 'MALZEME AÇILIMLARI', gv, o, olcek: ol, gruplar: ['Mimari'] }; VL().push(v); } else v.olcek = ol;
    const Lp = paftayaKoy(v, 'Mimari'); C.changed(); C.emit('layouts');
    if (!sessiz) C.log(`Malzeme açılım tablosu: ${n} kod (${G.map(g => g.baslik + ' ' + g.kutular.length).join(', ')}) → ${Lp ? Lp.name : 'pafta bulunamadı'} (1/${ol}).`);
    return n;
  };
  C.addCommand(['ACILIMTABLO', 'MALZEMETABLO', 'ACILIMLISTE'], 'Kesitlerdeki kodlu malzeme açılımlarının (DÖ01, DU01 …) tablosunu "DÖŞEMELER" / "DUVARLAR" başlıklarıyla Mimari paftasına yapıştırır. Kesitler değişince yeniden çalıştırın.', async () => { C.acilimTablo(false); });
  C.addCommand(['MEKTABLO', 'MEKANIKTABLO', 'EKIPMANTABLO'], 'Seçilen ünitenin (anaerobik, ön arıtma …) mekanik ekipman listesi, kapak ve mikser çizelgelerini Mekanik paftasına yapıştırır. Ekipman değişince yeniden çalıştırın.', async (I) => {
    let u = (C.sel || []).find(e => C.doc.ents.some(x => x.bag === e.id));
    if (!u) { const adaylar = C.doc.ents.filter(e => C.doc.ents.some(x => x.bag === e.id && x.type === 'aile')); u = adaylar.length === 1 ? adaylar[0] : null; }
    if (!u) { const s = await I.sel('Ekipmanı yerleşmiş üniteyi seçin'); u = (s || [])[0]; } if (!u) return;
    const R = mekSatirlar(u); if (!R.ek.length) { C.warn('Bu ünitede yerleşmiş ekipman yok (önce ekipman komutu).'); return; }
    const ol = +(C.doc.set.sonKesitOlcek || 100), k = ol / 1000, ad = `${u.code || ''} ${u.name || ''}`.trim();
    // aynı ünitenin eski tabloları silinir, yenileri aynı yere yazılır
    const eski = VL().find(v => v.tip === 'tablo' && v.unite === u.id);
    const gv = (eski && eski.gv) || ('T' + Date.now().toString(36)); C.doc.ents = C.doc.ents.filter(e => e.gv !== gv);
    const o = eski && eski.o ? eski.o : bolgeYeri(); let y = 0;
    y -= tabloCiz(o, 0, y, k, `${ad} — MEKANİK EKİPMAN LİSTESİ`, [{ t: 'POZ', w: 12 }, { t: 'ETİKET', w: 46 }, { t: 'TANIM', w: 44, al: 'L' }, { t: 'ÖZELLİKLER', w: 110, al: 'L' }, { t: 'MİKTAR', w: 18 }, { t: 'BİRİM', w: 14 }], R.ek, gv) + 10;
    if (R.kap.length) y -= tabloCiz(o, 0, y, k, `${ad} — KAPAK ÇİZELGESİ`, [{ t: 'ETİKET', w: 30 }, { t: 'AÇIKLIK B × H (mm)', w: 36 }, { t: 'KANAL DERİNLİĞİ (mm)', w: 36 }, { t: 'ŞASİ (mm)', w: 50 }, { t: 'TAHRİK', w: 40 }, { t: 'TABAN KOTU', w: 28 }], R.kap, gv) + 10;
    if (R.mik.length) y -= tabloCiz(o, 0, y, k, `${ad} — MİKSER ÇİZELGESİ`, [{ t: 'ETİKET', w: 30 }, { t: 'PERVANE ÇAPI (mm)', w: 36 }, { t: 'MOTOR GÜCÜ', w: 30 }, { t: 'DEVİR', w: 30 }, { t: 'TABAN KOTU', w: 28 }], R.mik, gv) + 10;
    let v = eski; if (!v) { v = { id: 'G' + Date.now().toString(36), tip: 'tablo', unite: u.id, ad: `${ad} MEKANİK TABLOLAR`, gv, o, olcek: ol, gruplar: ['Mekanik'] }; VL().push(v); } else v.olcek = ol;
    const L = paftayaKoy(v, 'Mekanik'); C.changed(); C.emit('layouts');
    C.log(`${ad}: ${R.ek.length} poz ekipman, ${R.kap.length} kapak, ${R.mik.length} mikser tablosu → ${L ? L.name : 'pafta bulunamadı'} (1/${ol}).`);
  });

  if (window.DIL) window.DIL.ekle('en', 'English', [['MEKANİK EKİPMAN LİSTESİ', 'MECHANICAL EQUIPMENT LIST'], ['KAPAK ÇİZELGESİ', 'GATE SCHEDULE'], ['MİKSER ÇİZELGESİ', 'MIXER SCHEDULE'], ['POZ', 'ITEM'], ['ETİKET', 'TAG'], ['TANIM', 'DESCRIPTION'], ['ÖZELLİKLER', 'SPECIFICATIONS'], ['MİKTAR', 'QTY'], ['BİRİM', 'UNIT'], ['AÇIKLIK B × H (mm)', 'OPENING B × H (mm)'], ['KANAL DERİNLİĞİ (mm)', 'CHANNEL DEPTH (mm)'], ['ŞASİ (mm)', 'FRAME (mm)'], ['TAHRİK', 'DRIVE'], ['TABAN KOTU', 'BASE LEVEL'], ['PERVANE ÇAPI (mm)', 'PROPELLER DIA. (mm)'], ['MOTOR GÜCÜ', 'MOTOR POWER'], ['DEVİR', 'SPEED'], ['MEKANİK TABLOLAR', 'MECHANICAL SCHEDULES'], ['BETONARME MERDİVEN', 'RC STAIR'], ['KORKULUK', 'HANDRAIL'], ['elektrikli aktüatör', 'electric actuator'], ['el çarkı', 'handwheel'], ['uzatma mili', 'extension spindle']]);
  C.addCommand(['GORUNUMPAFTA', 'GORUNUSDAGIT'], 'Daha önce üretilmiş bir kesit / görünüş / kot planını (KESITAL, KOTPLANI, GORUNUS) seçilen disiplin paftalarına şablonuyla yerleştirir', async (I) => {
    const s = await I.sel('Üretilmiş görünüşten bir nesne seçin'); const e = (s || []).find(q => q.gv); if (!e) { C.warn('Üretilmiş bir görünüş seçilmedi.'); return; }
    let v = VL().find(x => x.gv === e.gv);
    const sec = await disiplinSec('Görünüşü disiplin paftalarına yerleştir', g => !/GENEL/i.test(g), v ? v.olcek : 50); if (!sec) return;
    if (!v) { const bt = C.doc.ents.find(q => q.gv === e.gv && (q.type === 'baslik' || q.type === 'text') && /KES|PLAN|GÖRÜN/i.test(q.s || '')); v = { id: 'G' + Date.now().toString(36), tip: 'harici', ad: bt ? bt.s : 'Görünüş', gv: e.gv, olcek: sec.olcek, gruplar: [] }; VL().push(v); }
    v.olcek = sec.olcek; v.gruplar = [...new Set([...(v.gruplar || []), ...sec.gruplar])];
    const yer = sec.gruplar.map(g => { const L = paftayaKoy(v, g); return L ? `${g}: ${L.name}` : null; }).filter(Boolean);
    C.changed(); C.emit('layouts'); C.log(`"${v.ad}" ${yer.length} disiplin paftasına yerleştirildi — ${yer.join(' · ')}.`);
  });

  C.addCommand(['GORUNUMGUNCELLE', 'KESITGUNCELLE', 'DISIPLINGUNCELLE'], 'Disiplin paftalarındaki kesitleri modelden yeniden üretir (yer, ölçek ve paftalar korunur). Seçim yoksa hepsi.', async () => {
    const sel = new Set((C.sel || []).map(e => e.gv).filter(Boolean)), list = VL().filter(v => v.tip === 'kesit' && (!sel.size || sel.has(v.gv)));
    if (!list.length) { C.warn('Güncellenecek disiplin kesiti yok (KESITPAFTA ile oluşturun).'); return; }
    let n = 0;
    for (const v of list) {
      const gv = v.gv; sil(v); v.gv = gv;
      try { if (await kesitUret(v)) n++; } catch (er) { console.error(er); C.warn(v.ad + ': ' + er.message); }
      for (const L of C.doc.layouts || []) for (const vp of L.vps) if (vp.gorunum === v.id) { const ents = C.doc.ents.filter(e => e.gv === v.gv && e.type !== 'kesitisaret'); const bb = C.extents(ents); if (bb) { vp.cx = (bb[0] + bb[2]) / 2; vp.cy = (bb[1] + bb[3]) / 2; } }
    }
    C.changed(); C.emit('layouts'); C.log(`${n} kesit modelden yeniden üretildi; bağlı tüm disiplin paftaları güncellendi.`);
  });

  C.addCommand(['GORUNUMLER', 'DISIPLINGORUNUMLERI'], 'Disiplin kesitleri listesi: hangi paftalarda, güncelle / sil', async () => {
    const vs = VL(); if (!vs.length) { C.log('Disiplin görünümü yok. KESITPAFTA ile kesit alın.'); return; }
    const where = v => (C.doc.layouts || []).filter(L => L.vps.some(q => q.gorunum === v.id)).map(L => `${esc(L.grp)}: ${esc(L.name)}`).join('<br>');
    const b = C.modal('Disiplin görünümleri', `<table class="bom"><thead><tr><th>Görünüm</th><th>Ölçek</th><th>Paftalar</th><th></th></tr></thead><tbody>${vs.map((v, i) => `<tr><td>${esc(v.ad)}</td><td>1/${v.olcek}</td><td>${where(v) || '-'}</td><td><button data-sil="${i}">Sil</button></td></tr>`).join('')}</tbody></table>
      <div class="bar" style="justify-content:flex-end;margin-top:8px"><button id="gvG">Hepsini güncelle</button><button class="pri" id="gvK">Kapat</button></div>`);
    b.querySelector('#gvK').onclick = () => C.closeModal();
    b.querySelector('#gvG').onclick = () => { C.closeModal(); setTimeout(() => C.cmd.run('GORUNUMGUNCELLE'), 0); };
    b.querySelectorAll('[data-sil]').forEach(x => x.onclick = () => {
      const v = vs[+x.dataset.sil]; if (!confirm(`"${v.ad}" ve tüm paftalardaki pencereleri silinsin mi?`)) return;
      C.undoStack.push(C.snapshot()); C.redoStack = [];
      if (v.tip === 'kesit') sil(v);
      for (const L of C.doc.layouts || []) L.vps = L.vps.filter(q => q.gorunum !== v.id);
      vs.splice(vs.indexOf(v), 1); C.changed(); C.emit('layouts'); C.closeModal(); C.log(`"${v.ad}" silindi.`);
    });
  }, { noUndo: true });

  C.addCommand(['GORUNUSGOSTER', 'GORUNUSBOLGESI'], 'Disiplin kesitlerini Tasarım planında (modelin sağındaki görünüşler bölgesinde) göster / gizle', async () => {
    C.state.gorunusModel = !C.state.gorunusModel; C.changed(); C.log('Disiplin kesitleri Tasarım planında ' + (C.state.gorunusModel ? 'gösteriliyor (görünüşler bölgesi).' : 'gizlendi (yalnız paftalarda).'));
  }, { noUndo: true });

  /* şerit: Pafta sekmesine Disiplin paneli */
  try {
    if (C.ribbon && Array.isArray(C.ribbon.tabs)) {
      const tab = C.ribbon.tabs.find(t => t[0] === 'Pafta');
      if (tab && !tab[1].some(p => p[0] === 'Disiplin')) { tab[1].push(['Disiplin', [{ cmd: 'KESITPAFTA', t: 'Kesit → disiplinler', i: 'sheet', big: true }, { cmd: 'GORUNUMGUNCELLE', t: 'Güncelle', i: 'calc' }, { cmd: 'GORUNUMLER', t: 'Görünümler', i: 'table' }, { cmd: 'GORUNUSGOSTER', t: "Tasarım'da göster", i: 'layers' }]]); C.ribbon.render(); }
    }
  } catch (er) { console.error('görünüm şerit', er); }
})(window.C);

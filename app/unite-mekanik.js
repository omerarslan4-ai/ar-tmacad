/* ArıtmaCAD — ÜNİTE MEKANİK PAFTALARI (MEKANIKPAFTA; kullanıcı kararı 20.11.2026, docs/tasarim-standartlari.md → "Tesisat paftaları ile ünite mekanik paftaları ayrıdır")
   Seçili ünitenin (önce anaerobik havuz: T[tip].paftaTarifi olan üniteler) mekanik paftalarını "Mekanik" grubuna üretir; düzen pompa istasyonundaki
   (istasyon-pafta.js) gibidir; plan, kesitler ve liste tek paftada (kullanıcı 21.11.2026), araçlar oradan paylaşılır (C.mekPaftaArac: tablo, kesit alma, poz balonları, pencere bloğu):
     MEKANİK 1 — PLAN VE KESİTLER: mimari paftadaki ünite planları (tarif.planlar) ve kesitleri (tarif.kesitler) aynı yerlerden, mekanik görünüm şablonuyla
       (pencere disiplini Mekanik: ekipman normal, beton ve mimari soluk / ince — gorunumler.js GORUNUM_SABLON). Her ekipmanda oklu balon + POZ NO (pozno.js);
       balonlar birbirine ve ekipman yazılarına değmez (yazılar engel olarak verilir); yazılar ölçekli, boyları çizim kuralı tablosundan (Mek_Yazi).
     aynı paftada MEKANİK EKİPMAN LİSTESİ — POZ NO · EKİPMAN KODU · TANIM · ÖZELLİKLER · BİRİM GÜÇ (kW) · ADET · TOPLAM GÜÇ (kW), altta KURULU TOPLAM GÜÇ.
   Aynı tip / ölçü / güç → aynı poz (pozla). Gücü olmayan ya da verisi bulunmayan ekipmanda güç "–" (uydurulmaz). Marka / model adı yazılmaz.
   Listeye girenler: ünitenin bağlı ekipmanı (bag === ünite: kapak, mikser, pergel vinç, merdiven, korkuluk; tretuvar ve su girmez) ve ünite sınırları içinde
   elle konmuş, bağı olmayan aile nesneleri. MEKLISTE (karusel.js) yalnız karusel havuzunu listeler; bu modül onunla çakışmaz.
   Saf kısım (kalem, pozla, kuruluGuc, tabloSatirlari) Node ile denenir: node test/unite-mekanik.test.js */
(function (C) {
  'use strict';

  /* ======================= SAF KISIM ======================= */
  const GRUP_SIRA = { kapak: 0, mikser: 1, vinc: 2, merdiven: 3, korkuluk: 4, diger: 5 };
  /* marka / model adı yazılmaz (firma kuralı 20.11.2026): aile adlarında geçebilecek üretici adları ayıklanır */
  const MARKA = /\b(KSB|AmaProp|Amaprop|Wilo|Grundfos|Flygt|Xylem|AUMA|Sulzer|Landia|Invent|Ebara|Rotork|Bibus|Hidrostal|Andritz)\b\.?/gi;
  const temiz = s => String(s == null ? '' : s).replace(MARKA, '').replace(/\(\s*[,;·]?\s*\)/g, '').replace(/\s+([,·)])/g, '$1').replace(/\(\s+/g, '(').replace(/\s{2,}/g, ' ').replace(/^[\s—·,-]+|[\s—·,-]+$/g, '').trim();
  const sayi = (v, d = 2) => { const x = Math.round(+v * Math.pow(10, d)) / Math.pow(10, d); return String(x).replace('.', ','); }; // 5,5 · 33 · 1,25
  const mm = v => Math.round(+v || 0);
  const uzunluk = P => { let L = 0; for (let i = 1; i < (P || []).length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };
  /* malzeme adları (aile-mekanik.js penstock_kanal / pergel_vinc "Malzeme" parametreleri; kullanıcı 21.11.2026). Değer yoksa (eski proje) varsayılan: ilk anahtar.
     Listedeki ÖZELLİKLER metnine ve poz anahtarına girer; detay paftasının malzeme açılımı da buradan okur (unite-mekanik-detay.js). */
  const MLZ = {
    kapak: { '316L': 'AISI 316L', '304L': 'AISI 304L' }, mil: { '316': 'AISI 316', '304': 'AISI 304' }, conta: { EPDM: 'EPDM' }, ankraj: { A4: 'A4 paslanmaz kimyasal dübel' },
    vinc: { GALV: 'sıcak daldırma galvaniz S235JR çelik', '304': 'AISI 304 paslanmaz çelik' }, bulon: { GALV: 'sıcak daldırma galvaniz', A4: 'A4 paslanmaz' },
  };
  const MLZ_VARS = { kapak: '316L', mil: '316', conta: 'EPDM', ankraj: 'A4', vinc: 'GALV', bulon: 'GALV' }; // aile varsayılanları (sayısal anahtarlar sıralandığı için ayrı tablo)
  const mlzK = (tur, v) => (MLZ[tur][v] ? v : MLZ_VARS[tur]); // geçerli anahtar (yoksa varsayılan)
  const mlzAd = (tur, v) => MLZ[tur][mlzK(tur, v)];
  const MERD_TIP = { beton: 'Betonarme merdiven', izgara: 'Çelik ızgaralı merdiven (galvaniz)', ctp: 'CTP (FRP) merdiven' };

  /* bir çizim nesnesinden liste kalemi (ya da null: mekanik değil).
     ctx: { deger(e) → parametre değerleri, mikserModel(k) → { motor, disli } | null, vincModel(q) → { H, uc } | null, korkulukAd(km), aile(fam) → aile tanımı }
     → { grup, anahtar (aynı anahtar = aynı poz), kod, tanim, oz, P (birim güç kW | null), gucYok (güç kavramı yok) | veriYok (güç var ama verisi yok), miktar, birim } */
  function kalem(e, ctx) {
    ctx = ctx || {}; if (!e) return null;
    const q = e.type === 'aile' ? Object.assign({}, (ctx.deger ? ctx.deger(e) : e.par) || {}) : {}, kod = e.ad || '';
    if (e.type === 'aile' && e.fam === 'penstock_kanal') {
      const B = mm(q.B), H = mm(q.H), D = mm(q.D), akt = q.tahrik !== 'EL', asagi = q.acilis === 'ASAGI', kisa = q.sasi === 'KISA' || (q.sasi !== 'TAM' && D > 5000);
      /* aktüatör gücü katalogdan (aktuator-katalog.js; ailede hesaplanan Pakt) — kapak ebadı, su derinliği, ağırlık ve mil çapından seçilen boyun motor gücü */
      const AK = akt && ctx.aktuator ? ctx.aktuator(q) : null, Pa = akt && +q.Pakt > 0 ? +q.Pakt : AK ? AK.P : null;
      const mK = mlzK('kapak', q.mlz), mM = mlzK('mil', q.milM), mC = mlzK('conta', q.conta), mA = mlzK('ankraj', q.ankraj);
      return { grup: 'kapak', anahtar: ['kapak', B, H, D, akt ? 'AKT' : 'EL', asagi ? 'A' : 'Y', kisa ? 'K' : 'T', mK, mM, mC, mA].join('|'), kod,
        tanim: asagi ? 'Savak kapağı (penstok, aşağı açılır)' : 'Kanal kapağı (penstok)',
        oz: [`B×H ${B}×${H} mm`, `kanal derinliği ${D} mm`, +q.G > 0 ? `≈ ${Math.round(+q.G)} kg` : '', kisa ? 'kısa şasi + uzatma mili' : 'tam şasi', akt ? (AK ? `elektrikli aktüatör ${AK.boy} (ISO 5210 ${AK.flans}, ${AK.Tmin}-${AK.Tmax} Nm, ${AK.devir} d/dk)` : 'elektrikli aktüatör') : 'el çarkı',
          `çerçeve, kapak levhası ve nervür ${MLZ.kapak[mK]}`, `mil ${MLZ.mil[mM]}`, `conta ${MLZ.conta[mC]}`, `ankraj ${MLZ.ankraj[mA]}`].filter(Boolean).join(' · '),
        P: Pa, gucYok: !akt, veriYok: akt && Pa == null, miktar: 1, birim: 'adet' };
    }
    if (e.type === 'aile' && e.fam === 'dalgic_mikser') {
      const Md = q.model && q.model !== 'GENEL' && ctx.mikserModel ? ctx.mikserModel(q.model) : null, P = +q.P > 0 ? +q.P : null;
      return { grup: 'mikser', anahtar: ['mikser', q.model || 'GENEL', mm(q.D), P, mm(q.rpm)].join('|'), kod, tanim: Md ? 'Dalgıç mikser (yavaş devirli)' : 'Dalgıç mikser',
        oz: [`pervane Ø${mm(q.D)} mm`, `${mm(q.rpm)} d/dk`, Md ? temiz([Md.motor, Md.disli].filter(Boolean).join(', ')) : '', +q.Gmk > 0 ? `≈ ${Math.round(+q.Gmk)} kg` : '', Md ? 'kılavuz ray + üst tutucu (tabliyeye bağlı)' : `kılavuz direk ${mm(q.Hd)} mm (tabliyeye bağlı)`].filter(Boolean).join(' · '),
        P, veriYok: P == null, miktar: 1, birim: 'adet' };
    }
    if (e.type === 'aile' && e.fam === 'pergel_vinc') {
      const V = ctx.vincModel ? ctx.vincModel(q) : null, H = V ? mm(V.H) : mm(q.vh), L = mm(q.L);
      /* kapasite kaldırılan en ağır yükten (mikser ağırlığı × 1,25 → standart kapasite), tahrik ünite kartından (kullanıcı 21.11.2026) */
      const elk = q.tahrik === 'ELEKTRIKLI', kap = +q.kap > 0 ? +q.kap : null, Pv = elk && +q.Pv > 0 ? +q.Pv : null;
      const mV = mlzK('vinc', q.mlz), mB = mlzK('bulon', q.bulon);
      return { grup: 'vinc', anahtar: ['vinc', q.model || 'GENEL', H, L, kap || 0, elk ? 'E' : 'M', mV, mB].join('|'), kod, tanim: 'Pergel vinç (mikser bakımı)',
        oz: [kap ? `kaldırma kapasitesi ${kap} kg` : '', elk ? 'elektrikli zincirli palanga' : 'manuel zincirli palanga', `direk yüksekliği ${H} mm`, `kol erişimi ${L} mm`, 'döner kollu, tabliyeye ankrajlı', `direk ve kol ${MLZ.vinc[mV]}`, `ankraj bulonu ${MLZ.bulon[mB]}`].filter(Boolean).join(' · '),
        P: Pv, gucYok: !elk, veriYok: elk && Pv == null, miktar: 1, birim: 'adet' };
    }
    if (e.type === 'merdiven') {
      const H = Math.abs((+e.z1 || 0) - (+e.z0 || 0)), w = +e.w || 1, hm = (+e.hmax || 17.5) / 100, n = Math.max(2, Math.ceil(H / hm - 1e-9)), km = e.km ? (ctx.korkulukAd ? ctx.korkulukAd(e.km) : e.km) : '';
      return { grup: 'merdiven', anahtar: ['merdiven', e.tip || 'beton', sayi(w), sayi(H), n, e.km || ''].join('|'), kod, tanim: MERD_TIP[e.tip] || 'Merdiven',
        oz: [`en ${sayi(w)} m`, `H = ${sayi(H)} m`, `${n} rıht`, km ? `korkuluk: ${temiz(km)}` : ''].filter(Boolean).join(' · '), P: null, gucYok: true, miktar: 1, birim: 'adet' };
    }
    if (e.type === 'korkuluk') {
      const km = ctx.korkulukAd ? ctx.korkulukAd(e.km || 'galvaniz') : (e.km || 'galvaniz'), kh = (+e.kh || 110) / 100;
      return { grup: 'korkuluk', anahtar: ['korkuluk', e.km || 'galvaniz', sayi(kh), mm(e.dik || 150)].join('|'), kod, tanim: 'Korkuluk',
        oz: [temiz(km), `h = ${sayi(kh)} m`, `dikme aralığı ${mm(e.dik || 150)} cm`].join(' · '), P: null, gucYok: true, miktar: uzunluk(e.pts), birim: 'm' };
    }
    if (e.type === 'aile') { // ünite sınırları içindeki öbür mekanik aileler (elle konmuş)
      const d = ctx.aile ? ctx.aile(e.fam) : null; if (!d) return null;
      const gP = (d.params || []).find(p => p.k === 'P' && /kW/i.test(p.birim || '')), P = gP && +q.P > 0 ? +q.P : null;
      let oz = ''; try { oz = d.etiket ? d.etiket(q) : ''; } catch (er) { oz = ''; }
      return { grup: 'diger', anahtar: ['aile', e.fam, temiz(oz), P].join('|'), kod, tanim: temiz(d.kisaAd || d.ad || e.fam), oz: temiz(oz), P, veriYok: !!gP && P == null, gucYok: !gP, miktar: 1, birim: 'adet' };
    }
    return null; // tretuvar, su, beton … mekanik değil
  }

  /* ekipman kodları doğal sırayla (SK-108G/A, SK-108G/B …, Z-108/A …) */
  const kodSirala = L => [...new Set(L.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
  /* aynı anahtar → aynı poz; sıra: grup sırası (kapak, mikser, pergel vinç, merdiven, korkuluk, diğer), grupta ilk görülme sırası. Poz 1'den.
     → [{ poz, grup, anahtar, kodlar, tanim, oz, P, gucYok, veriYok, adet, birim, toplamP (P × adet | null), n (nesne sayısı) }] */
  function pozla(kalemler) {
    const m = new Map(), sira = [];
    for (const k of (kalemler || []).filter(Boolean)) { let g = m.get(k.anahtar); if (!g) { g = Object.assign({}, k, { kodlar: [], adet: 0, n: 0, i: sira.length }); m.set(k.anahtar, g); sira.push(g); } g.adet += +k.miktar || 0; g.n++; if (k.kod) g.kodlar.push(k.kod); }
    sira.sort((a, b) => ((GRUP_SIRA[a.grup] ?? 9) - (GRUP_SIRA[b.grup] ?? 9)) || a.i - b.i);
    return sira.map((g, i) => { const adet = g.birim === 'm' ? Math.round(g.adet * 10) / 10 : g.adet; const r = { poz: i + 1, grup: g.grup, anahtar: g.anahtar, kodlar: kodSirala(g.kodlar), tanim: g.tanim, oz: g.oz, P: g.P, gucYok: !!g.gucYok, veriYok: !!g.veriYok, adet, birim: g.birim, n: g.n };
      r.toplamP = g.P != null && g.birim !== 'm' ? Math.round(g.P * adet * 1000) / 1000 : null; return r; });
  }
  /* kurulu toplam güç (kW): verisi olan satırların toplamı; eksik: güç verisi bulunmayan satırların poz numaraları */
  function kuruluGuc(satirlar) { let t = 0; const eksik = []; for (const r of satirlar || []) { if (r.toplamP != null) t += r.toplamP; else if (r.veriYok) eksik.push(r.poz); } return { kW: Math.round(t * 1000) / 1000, eksik }; }
  /* tablo: sütunlar (kâğıt mm) ve yazı satırları; son satır KURULU TOPLAM GÜÇ. Güç yok / veri yok → "–" */
  const SUTUN = [{ t: 'POZ NO', w: 13 }, { t: 'EKİPMAN KODU', w: 44, al: 'L' }, { t: 'TANIM', w: 46, al: 'L' }, { t: 'ÖZELLİKLER', w: 112, al: 'L' }, { t: 'BİRİM GÜÇ (kW)', w: 20 }, { t: 'ADET', w: 16 }, { t: 'TOPLAM GÜÇ (kW)', w: 22 }];
  /* tablo yazısı pafta yazı stilinin (YZ) karakterleriyle: '·', '×', '–' bu stilde yok, başka yazı tipiyle çiziliyordu
     (kullanıcı 21.11.2026: "özellikler tablosundaki yazı karakterlerini diğerleri ile aynı yap") */
  const sade = v => String(v).replace(/\s*·\s*/g, ', ').replace(/×/g, 'x').replace(/–/g, '-').replace(/≈\s*/g, 'yakl. ');
  function tabloSatirlari(satirlar) {
    const tire = '–', rows = (satirlar || []).map(r => [String(r.poz), r.kodlar.join(', ') || tire, r.tanim, r.oz || tire, r.P != null ? sayi(r.P) : tire, r.birim === 'm' ? `${sayi(r.adet, 1)} m` : String(r.adet), r.toplamP != null ? sayi(r.toplamP) : tire]);
    const T = kuruluGuc(satirlar); rows.push(['', '', 'KURULU TOPLAM GÜÇ', '', '', '', sayi(T.kW)]);
    return { cols: SUTUN.map(c => Object.assign({}, c)), rows: rows.map(r => r.map(sade)), toplam: T };
  }
  /* BORULAR (yer hazır, şimdilik boş ve gizli): ileride saha borulamasından (app/borulama.js — ünitenin giriş, çıkış ve RAS bağlantı boruları;
     anaerobik.js G.boruYer: giris / cikis / ras) satır gelecek: [{ poz, tanim: 'Boru DN…', oz: malzeme kalitesi (SS304L …, firma kuralı), miktar (m) }].
     Boş dizi → tabloda BORULAR bölümü çizilmez. */
  function boruSatirlari(/* u, borular */) { return []; }

  const api = { MLZ, MLZ_VARS, mlzK, mlzAd, GRUP_SIRA, kalem, pozla, kuruluGuc, tabloSatirlari, boruSatirlari, temiz, sayi, SUTUN };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!C || !C.addCommand) return;
  C.uniteMekanikApi = api;
  /* mekanik kesitler geçici iç adla (UA, UB …) alınır: canlı güncelleme yeniden ürettiğinde başlık "A-A", kesitMeta ve Tasarım'daki fazla işaret yine düzeltilir */
  (C.gorunumSonrasi = C.gorunumSonrasi || []).push(() => { const D = C.doc && C.doc.set.uniteMek; if (!D) return 0; let n = 0; const ad = {};
    for (const s of Object.values(D)) for (const gv of (s && s.gvs) || []) { const m = /^UMEK_KESIT_(U[A-J])_/.exec(gv); if (m) ad[gv] = [m[1], (s.kesitAd && s.kesitAd[m[1]]) || m[1].slice(1)]; }
    const ic = new Set(Object.values(ad).map(a => a[0])); if (!ic.size) return 0;
    for (const e of C.doc.ents) { const a = ad[e.gv]; if (!a || (e.type !== 'baslik' && e.type !== 'text')) continue; const b = `${a[0]}-${a[0]} `; if (String(e.s || '').startsWith(b)) { e.s = `${a[1]}-${a[1]} ` + String(e.s).slice(b.length); delete e._c; n++; } }
    for (const k of ic) if (C.doc.set.kesitMeta) delete C.doc.set.kesitMeta[k];
    const L0 = C.doc.ents.length; C.doc.ents = C.doc.ents.filter(e => !(e.type === 'kesitisaret' && !e.gv && ic.has(e.name))); return n + L0 - C.doc.ents.length; });

  /* ======================= MODEL → GÖRÜNÜŞLER ======================= */
  const M = C.M, up = s => String(s || '').toLocaleUpperCase('tr');
  const durum = () => (C.doc.set.uniteMek = C.doc.set.uniteMek || {});
  /* kural tablosundaki katman (program katmanı → çizim katmanının rengi / çizgi tipi / kalınlığı); mimari-pafta.js kuralKatman ile aynı */
  const kat = ad => { const K = C.cizimKural, R = K && K.MIMARI, h = R && K.esle(R, ad), t = h && K.tanim(R, h), o = t ? K.ozellik(t) : { color: 7, lt: 'CONTINUOUS', lw: 18 }; C.ensureLayer(ad, o.color, C.LT && C.LT[o.lt] ? o.lt : 'CONTINUOUS', o.lw); return ad; };
  /* yazı kuralı: { st, mm } — tablodaki stil ve boylardan (i: boy sırası); yoksa null (elle değer yazılmaz) */
  const yaziK = (ad, i) => { const y = C.cizimKural && C.cizimKural.MIMARI && C.cizimKural.MIMARI.yazi && C.cizimKural.MIMARI.yazi[ad]; if (!y || !y.mm || !y.mm.length) return null; return { st: y.stil ? y.stil[0] : undefined, mm: y.mm[Math.min(i || 0, y.mm.length - 1)] }; };
  const LY_POZ = 'UNITE_MEK_POZ', LY_EKY = 'Mek_Yazi', LY_TBL = 'PAFTA_LISTESI'; // UNITE_MEK_POZ → Mek_Yazi (kural eşlemesi …_POZ), tablo → Mim_Yazi25
  const ctxOf = () => ({
    deger: e => (C.aileDegerE ? C.aileDegerE(e) : e.par || {}),
    aktuator: q => (C.aktuator ? C.aktuator.penstokAktuator({ B: q.B, H: q.H, hw: q.hw, G: q.G, mil: q.mil }) : null),
    mikserModel: k => (C.mikserModel && C.mikserModel[k]) || null,
    vincModel: q => { const V = q && q.model && C.PERGEL_VINC_VERI && C.PERGEL_VINC_VERI[q.model]; return V ? { H: V.H, uc: V.uc } : null; },
    korkulukAd: km => (C.KORKULUK_KM && C.KORKULUK_KM[km] ? C.KORKULUK_KM[km][0] : km),
    aile: fam => (C.AILELER && C.AILELER[fam]) || null,
  });
  const tarifli = e => !!(e && C.T[e.type] && C.T[e.type].paftaTarifi);
  /* ünitenin mekanik ekipmanı: bağlı nesneler + plan kutusu içindeki bağsız aile nesneleri (elle konmuş) */
  const ekipman = u => {
    let bb = null; try { delete u._c; bb = C.bbox(u); } catch (er) { }
    const ici = p => bb && p && p[0] >= bb[0] - 1e-6 && p[0] <= bb[2] + 1e-6 && p[1] >= bb[1] - 1e-6 && p[1] <= bb[3] + 1e-6;
    return C.doc.ents.filter(x => !x.gv && x !== u && (x.bag === u.id || (x.type === 'aile' && !x.bag && C.AILELER && C.AILELER[x.fam] && ici(x.p))) && C.layer(x.layer).on);
  };
  /* ekipmanın gösterilecek noktası (dünya, z dahil): kapak açıklığın ortası, mikser pervane ekseni, vinç direği, merdiven ve korkuluk ortası */
  const yerOf = (x, q) => {
    if (x.type === 'aile') { const p = x.p || [0, 0, 0], z = +x.z || 0;
      if (x.fam === 'penstock_kanal') return [p[0], p[1], z + (+q.H || 1000) / 2000];
      if (x.fam === 'dalgic_mikser') return [p[0], p[1], z + (+q.hm || 600) / 1000];
      if (x.fam === 'pergel_vinc') return [p[0], p[1], z + (+q.vh || 1800) * 0.6 / 1000];
      return [p[0], p[1], z]; }
    const P = x.pts || []; if (!P.length) return null;
    let a = P[0], b = P[P.length - 1]; if (x.type === 'korkuluk') { let bl = -1; for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (l > bl) { bl = l; a = P[i - 1]; b = P[i]; } } }
    const z = x.type === 'merdiven' ? ((+x.z0 || 0) + (+x.z1 || 0)) / 2 : (+(a[2] || 0)) + (+x.kh || 110) / 200;
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z];
  };
  const altKot = x => (x.type === 'aile' ? +x.z || 0 : x.type === 'merdiven' ? Math.min(+x.z0 || 0, +x.z1 || 0) : +((x.pts || [[0, 0, 0]])[0][2] || 0));
  const zAralik = ents => { let a = Infinity, b = -Infinity; for (const e of ents) { let t; try { t = C.entTris(e); } catch (er) { continue; } const P = t && t.pos; if (!P) continue; for (let i = 2; i < P.length; i += 3) { a = Math.min(a, P[i]); b = Math.max(b, P[i]); } } return [a, b]; };
  /* engel listesi (pozno.js yerleştirme biçimi { p, q }): görünümdeki yazıların kutusu boyunca örnek noktalar — balon bunlara değmez */
  const engeller = gv => { const out = [], k = C.annoH(1), adim = 2.5 * k;
    for (const e of C.doc.ents) { if (e.gv !== gv || !(e.type === 'text' || e.type === 'kot' || e.type === 'baslik' || e.type === 'acilim')) continue; let b = null; try { delete e._c; b = C.bbox(e); } catch (er) { continue; } if (!b || !isFinite(b[0])) continue;
      const ym = (b[1] + b[3]) / 2; for (let x = b[0]; x <= b[2] + 1e-9; x += adim) out.push({ p: [x, ym], q: [x, ym] }); }
    return out; };
  /* ekipman yazıları (Mek_Yazi, ölçekli) — mimari-pafta.js unitePlanEtiket / uniteKesitEkipman ile aynı yer ve kural */
  const planEtiket = (gv, W, liste, h) => { const y = yaziK('Mek_Yazi'); if (!y) return 0; let n = 0;
    for (const q of liste || []) { if (h != null && q.z0 >= h - 1e-6) continue; const p = W(q.p), t = C.add(C.newEnt('text', { p: [p[0], p[1], 0], h: C.annoH(y.mm), hp: y.mm, s: q.ad, al: 'ML', st: y.st, ann: true, layer: kat(LY_EKY), gv })); if (t) { delete t.sp; n++; } }
    return n; };
  const kesitEtiket = (gv, km, liste) => { const y = yaziK('Mek_Yazi'); if (!y || !km) return 0; const h = C.annoH(y.mm), dep = +km.depth || 30, konan = []; let n = 0;
    for (const q of liste || []) { const P = q.o || q.p, d = (P[0] - km.a[0]) * km.n[0] + (P[1] - km.a[1]) * km.n[1], s = (P[0] - km.a[0]) * km.u[0] + (P[1] - km.a[1]) * km.u[1];
      if (d < -0.1 || d > dep || s < km.ub[0] - 0.5 || s > km.ub[2] + 0.5) continue;
      let z = q.zEt != null ? q.zEt : q.z0; while (konan.some(k => Math.abs(k[0] - s) < h * q.ad.length * 0.45 && Math.abs(k[1] - z) < h * 1.4)) z += h * 1.5; konan.push([s, z]);
      const t = C.add(C.newEnt('text', { p: [km.q0[0] + s, km.q0[1] + z, 0], h, hp: y.mm, s: q.ad, al: 'BC', st: y.st, ann: true, layer: kat(LY_EKY), gv })); if (t) { delete t.sp; n++; } }
    return n; };
  const mahalYaz = (gv, p, ad) => { const R = C.cizimKural && C.cizimKural.MIMARI, y = R && R.yazi && R.yazi['MAHAL İSİM']; if (!y) return; const e = C.add(C.newEnt('text', { p: [p[0], p[1], 0], h: C.annoH(y.mm[0]), s: String(ad), al: 'MC', st: y.stil[0], ann: false, layer: kat('MAHAL_ADI'), gv })); if (e) delete e.sp; };
  /* plandaki kesit işareti çizgi / yazıya çevrilir (pafta ölçeğinde): kesitisaret nesnesi olarak kalsaydı MIMARIPAFTA kesit harflerini (A, B …) kullanılmış sayıp
     kendi kesitlerine E, F … derdi; mekanik planın işareti yalnız gösterimdir */
  const isaretCiz = (e, gv) => { let P = []; try { delete e._c; P = C.prims(e) || []; } catch (er) { } C.doc.ents = C.doc.ents.filter(x => x !== e); const ly = e.layer || 'KESIT_ISARET', P3 = q => [q[0], q[1], 0];
    for (const pr of P) { const b = Object.assign({ gv, layer: ly }, pr.lw ? { lw: pr.lw } : {}, pr.lt ? { lt: pr.lt } : {}, pr.color != null ? { color: pr.color } : {}); let n = null;
      if (pr.k === 'L') n = C.newEnt('line', Object.assign(b, { a: P3(pr.a), b: P3(pr.b) }));
      else if (pr.k === 'P') n = C.newEnt('pline', Object.assign(b, { pts: pr.pts.map(P3), closed: !!pr.c }));
      else if (pr.k === 'C') n = C.newEnt('circle', Object.assign(b, { c: P3(pr.c), r: pr.r }));
      else if (pr.k === 'S' && C.T.solid) n = C.newEnt('solid', Object.assign(b, { pts: pr.pts.map(P3) }));
      else if (pr.k === 'T') n = C.newEnt('text', Object.assign(b, { p: P3(pr.p), h: pr.h, s: pr.s, rot: (pr.rot || 0) * 180 / Math.PI, al: pr.al || 'MC', ann: false }, pr.st ? { st: pr.st } : {}));
      if (n) { const x = C.add(n); if (x) delete x.sp; } } };
  /* görünüm başlığı en alttaki çizimin altına (mimari-pafta.js baslikAlta ile aynı: 11 mm) */
  const baslikAlta = gv => { const g = C.doc.ents.filter(e => e.gv === gv); g.forEach(e => { delete e._c; }); const b = C.extents(g.filter(e => e.type !== 'baslik')); if (!b) return;
    for (const e of g) if (e.type === 'baslik') { e.ay = b[1]; e.dmm = 11; e.p = [e.p[0], b[1] - 11 * C.annoH(1), 0]; delete e._c; } };

  /* ======================= ÜRETİM ======================= */
  const olcekBul = ents => { const A = C.mimariPaftaApi, bb = C.extents(ents), [z0, z1] = zAralik(ents); if (!A || !A.olcekSec || !bb) return { olcek: 50, neden: '' };
    const lx = bb[2] - bb[0], ly = bb[3] - bb[1]; return A.olcekSec([{ id: 'plan', w: lx, h: ly, kenarMm: 41, altMm: 15 }, { id: 'kesit', w: Math.max(lx, ly), h: isFinite(z1 - z0) ? z1 - z0 : 5, kenarMm: 30, altMm: 15 }], { antetW: C.antetGen ? C.antetGen() : 0 }); };
  const temizle = u => { const st = durum(), s = st[u.id]; if (s) { const gs = new Set(s.gvs || []), K = C.doc.set.canli; if (K) for (const e of C.doc.ents) if (e.canli && e.gv && gs.has(e.gv)) delete K[e.canli]; /* eski canlı kayıt kalırsa güncelleme kesitin kopyasını üretir */ C.doc.ents = C.doc.ents.filter(e => !(e.gv && gs.has(e.gv))); } C.doc.layouts = (C.doc.layouts || []).filter(L => L.uniteMek !== u.id); st[u.id] = { gvs: [] }; return st[u.id]; };

  const uret = async (u) => {
    const A = C.mekPaftaArac, Ap = C.mimariPaftaApi; if (!A || !Ap || !C.makeView) { C.warn('Pafta modülleri yüklenmemiş (istasyon-pafta.js / mimari-pafta.js).'); return null; }
    const ctx = ctxOf(), E = ekipman(u), K = E.map(x => { const k = kalem(x, ctx); if (k) { k.e = x; k.q = x.type === 'aile' ? ctx.deger(x) : {}; } return k; }).filter(Boolean);
    const satir = pozla(K), pozOf = new Map(); for (const k of K) pozOf.set(k.e.id, satir.find(r => r.anahtar === k.anahtar).poz);
    const items = satir.map(r => ({ poz: r.poz, yerler: K.filter(k => k.anahtar === r.anahtar).map(k => { const p = yerOf(k.e, k.q); return p ? { p, e: k.e, z0: altKot(k.e) } : null; }).filter(Boolean) }));
    const ids = [u.id, ...C.doc.ents.filter(x => x.bag === u.id && !x.gv && x.type !== 'su').map(x => x.id)], idSet = new Set(ids), ents = C.doc.ents.filter(x => idSet.has(x.id));
    const os = olcekBul(ents), SC = os.olcek, anno0 = C.doc.set.anno; C.doc.set.anno = SC; // yazılar, balonlar ve başlıklar kâğıtta doğru boyda (pafta ölçeği)
    try {
      /* tarif pafta ölçeğinde alınır (havuzun plan ölçüleri geçerli açıklama ölçeğiyle yenilenir — MIMARIPAFTA ile aynı) */
      let tarif = null; try { tarif = C.T[u.type].paftaTarifi(u, { kh: 1.2 }); } catch (er) { console.error('ünite pafta tarifi', er); }
      if (!tarif) { C.warn('Ünitenin pafta tarifi alınamadı.'); return null; }
      const st = temizle(u); kat(LY_POZ); kat(LY_EKY); kat(LY_TBL);
      const bb = C.extents(ents), tum = C.extents(C.doc.ents.filter(e => e.type !== 'sheet')) || bb; let X0 = tum[2] + 40, Yc = tum[3];
      const asagi = gv => { const b = C.extents(C.doc.ents.filter(e => e.gv === gv)); if (b) Yc = b[1] - 12; };
      const vps = [], ana = [];
      /* --- planlar (mimari ünite planlarıyla aynı kesme kotları ve başlıklar; su çizilmez) */
      const planlar = [];
      for (const p of tarif.planlar || []) {
        const place = [X0, Yc - (bb[3] - bb[1]) - 2], ref = [bb[0], bb[1]], W = q => [place[0] + q[0] - ref[0], place[1] + q[1] - ref[1], 0];
        const res = C.makeView({ kind: 'plan', h: p.h, depth: p.depth, place, ref, ids: ents.filter(e => !(p.gizle && p.gizle(e))).map(e => e.id), hatch: p.kesit ? 'ANSI31' : 'YOK', title: up(p.baslik), mek: true, poz: false, dograma: false });
        if (!res) continue; st.gvs.push(res.gv);
        /* beton taraması mimariyle aynı kural: kesit planda ve kesitte dolu açık gri (kullanıcı 21.11.2026: "mimari ve mekanik tarama kuralları değişmiş") */
        if (p.kesit && Ap.uniteKesitTarama) Ap.uniteKesitTarama(res.gv);
        try { for (const m of tarif.mahaller || []) mahalYaz(res.gv, W(m.p), m.ad); planEtiket(res.gv, W, tarif.ekipman, p.h);
          for (const d of tarif.planOlcu || []) { const c = JSON.parse(JSON.stringify(d)); for (const key of ['id', '_c', 'sp', 'oto', 'bag']) delete c[key]; for (const key of ['a', 'b', 'p', 'c']) if (Array.isArray(c[key])) c[key] = W(c[key]); c.gv = res.gv; const x = C.add(C.newEnt(c.type, c)); if (x) delete x.sp; }
        } catch (er) { console.error('mekanik plan etiketleri', er); }
        planlar.push({ gv: res.gv, W, h: p.h, ust: !p.kesit }); asagi(res.gv);
      }
      /* --- kesitler (tarif.kesitler; mekanik kesit: gizli çizgi z-tamponla, poz balonları bu modülden) */
      const kesitler = []; const harf = 'ABCDEFGHIJ';
      for (const [i, k] of (tarif.kesitler || []).entries()) {
        const ic = 'U' + harf[i % 10]; let r = null; // geçici iç ad: Mimari kesitlerin kesitMeta'sı (A, B …) ezilmesin
        try { r = await A.kesitAl(ic, k.a, k.b, k.sp, k.depth, [X0, Yc], { kv: ['GIZLI=E', 'POZ=H'], onek: 'UMEK_KESIT_', acilim: false, durum: false }); } catch (er) { console.error('mekanik kesit', er); }
        if (!r || !r.n) continue; st.gvs.push(r.gv);
        if (Ap.uniteKesitTarama) Ap.uniteKesitTarama(r.gv); (st.kesitAd = st.kesitAd || {})[ic] = k.nm;
        const isr = new Set((r.yeni || []).filter(e => e.type === 'kesitisaret').map(e => e.id)); if (isr.size) C.doc.ents = C.doc.ents.filter(e => !isr.has(e.id)); // modelde ikinci kesit işareti kalmasın
        for (const e of C.doc.ents) if (e.gv === r.gv && (e.type === 'baslik' || e.type === 'text') && String(e.s || '').startsWith(`${ic}-${ic} `)) { e.s = `${k.nm}-${k.nm} ` + String(e.s).slice(2 * ic.length + 2); delete e._c; }
        const km = r.km ? JSON.parse(JSON.stringify(r.km)) : null; if (C.doc.set.kesitMeta) delete C.doc.set.kesitMeta[ic];
        try { kesitEtiket(r.gv, km, tarif.ekipman); for (const m of k.mahal || []) { if (!km) break; const s = (m.p[0] - km.a[0]) * km.u[0] + (m.p[1] - km.a[1]) * km.u[1]; if (s >= km.ub[0] && s <= km.ub[2]) mahalYaz(r.gv, [km.q0[0] + s, km.q0[1] + m.z], m.ad); } } catch (er) { console.error('mekanik kesit etiketleri', er); }
        kesitler.push({ gv: r.gv, km, nm: k.nm, k }); asagi(r.gv);
      }
      /* --- kesit işaretleri planlarda (her planda bütün kesitler) */
      for (const p of planlar) for (const k of kesitler) { try { const a = p.W(k.k.a), b = p.W(k.k.b), u0 = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(u0[0], u0[1]) || 1; let n = [-u0[1] / l, u0[0] / l]; const sp = p.W(k.k.sp); if ((sp[0] - a[0]) * n[0] + (sp[1] - a[1]) * n[1] < 0) n = [-n[0], -n[1]];
        const e = C.makeSectionMark ? C.makeSectionMark([a[0], a[1], 0], [b[0], b[1], 0], [n[0], n[1], 0], k.nm, p.gv) : null; if (e) isaretCiz(e, p.gv); } catch (er) { console.error('plan kesit işareti', er); } }
      /* --- poz balonları: planda her ekipmanda (kesme kotunun altındakiler; üst planda hepsi), kesitte bakış derinliğindekiler (aynı yere düşen aynı poz bir kez) */
      let nB = 0;
      for (const p of planlar) nB += A.balonlar(items.map(it => ({ poz: it.poz, yerler: it.yerler.filter(y => p.ust || y.z0 < p.h - 1e-6) })), p.gv, q => p.W(q), null, { her: true, used: engeller(p.gv), layer: LY_POZ });
      for (const k of kesitler) { const m = k.km; if (!m) continue;
        const W = q => { const d = (q[0] - m.a[0]) * m.n[0] + (q[1] - m.a[1]) * m.n[1]; if (d < -0.15 || d > (m.depth || 30) + 0.05) return null; const s = (q[0] - m.a[0]) * m.u[0] + (q[1] - m.a[1]) * m.u[1]; if (s < m.ub[0] - 0.05 || s > m.ub[2] + 0.05) return null; return [m.q0[0] + s, m.q0[1] + (q[2] || 0)]; };
        nB += A.balonlar(items, k.gv, W, null, { her: true, ayni: (q, it) => `${it.poz}|${Math.round(q[0] * 2)}|${Math.round(q[1] * 2)}`, used: engeller(k.gv), layer: LY_POZ }); }
      for (const g of [...planlar.map(p => p.gv), ...kesitler.map(k => k.gv)]) baslikAlta(g);
      /* --- MEKANİK EKİPMAN LİSTESİ (kâğıt mm → model, pafta ölçeğinde) */
      const yT = yaziK('Yazi25', 0), yH = yaziK('Yazi25', 1), yB = yaziK('Yazi30', 0), TS = tabloSatirlari(satir), kf = SC / 1000;
      const tb = A.tabloBlok('MEKANİK EKİPMAN LİSTESİ', TS.cols, TS.rows, { h: yT ? yT.mm : undefined, hb: yH ? yH.mm : undefined, hBas: yB ? yB.mm : undefined, lyT: LY_TBL, lyB: LY_TBL, lyY: LY_TBL });
      const notlar = [];
      if (satir.some(r => r.P == null)) notlar.push('"-": elle tahrikli / güçsüz ekipman ya da güç verisi henüz girilmemiş ekipman (kurulu güce katılmadı).');
      notlar.push('Poz numaraları plan ve kesitlerdeki balon numaralarıyla aynıdır. Marka / model belirtilmemiştir; eşdeğer ürün kullanılabilir.');
      const boru = boruSatirlari(u); void boru; // BORULAR bölümü: boş → çizilmez (saha borulaması bağlanınca ikinci tablo burada)
      const gvT = 'UMEK_LISTE_' + Date.now().toString(36); st.gvs.push(gvT); const O = [X0, Yc - tb.h * kf], hN = (yT ? yT.mm : 2) * 1.6;
      { const P = q => [O[0] + q[0] * kf, O[1] + q[1] * kf, 0];
        for (const e of tb.spec) { let n = null; const base = { gv: gvT, layer: kat(LY_TBL) };
          if (e.k === 'L') n = C.newEnt('line', Object.assign(base, { a: P(e.a), b: P(e.b) })); else if (e.k === 'P') n = C.newEnt('pline', Object.assign(base, { pts: e.pts.map(P), closed: !!e.cl }));
          else if (e.k === 'T') n = C.newEnt('text', Object.assign(base, { p: P(e.p), h: e.h * kf, s: e.s, rot: 0, al: e.al || 'L', ann: false }, yT && yT.st ? { st: yT.st } : {}));
          if (n) { const x = C.add(n); if (x) delete x.sp; } }
        notlar.forEach((s, i) => { const x = C.add(C.newEnt('text', Object.assign({ p: P([0, -hN * (i + 1.4)]), h: (yT ? yT.mm : 2) * kf, s, rot: 0, al: 'L', ann: false, layer: kat(LY_TBL), gv: gvT }, yT && yT.st ? { st: yT.st } : {}))); if (x) delete x.sp; }); }
      /* --- paftalar (mimari paftayla aynı: en az kâğıt, Çokal R2 kenarları, antet sütunu — yüklenen antet) */
      const blok = (gv, sc) => { const b = A.vpBlok(gv, sc, 'Mekanik'); if (b) b.sc = sc; return b; };
      const yapi = up(tarif.ad || u.name || 'ÜNİTE'), paf = [];
      const kur = (anahtar, ad, bloklar) => { const bl = bloklar.filter(b => b && b.w > 0 && b.h > 0); if (!bl.length) return;
        const byId = new Map(bl.map(b => [b.gv, b])), Y = Ap.enAzKagit(bl.map(b => ({ id: b.gv, w: b.w, h: b.h, grup: ad })), { antetW: C.antetGen ? C.antetGen() : 0 }), n = Y.paftalar.length;
        Y.paftalar.forEach((P, i) => { const adN = ad + (n > 1 ? ` (${i + 1}/${n})` : '');
          const gp = C.grpCur; C.grpCur = 'Mekanik'; const L = C.newLayout(`MEKANİK — ${yapi} — ${adN}`, P.kagit, 'L'); C.grpCur = gp;
          Object.assign(L, { grp: 'Mekanik', uniteMek: u.id, uniteMekParca: anahtar + '_' + i, disPafta: 'Mekanik', size: 'OZEL', pw: P.pw, ph: P.ph, orient: 'L', noTitle: false, margin: Object.assign({}, Ap.PAFTA_R2.kenar), antetSutun: P.antet, kagit: P.kagit });
          L.f = Object.assign(L.f || {}, { proje: (L.f && L.f.proje) || C.doc.set.name || '', baslik: `${yapi} — ${adN}` });
          L.vps = P.ids.map(id => { const b = byId.get(id), q = P.yer[id]; return Object.assign({ x: q[0], y: q[1], w: b.w, h: b.h, cx: (b.bb[0] + b.bb[2]) / 2, cy: (b.bb[1] + b.bb[3]) / 2, scale: b.sc, gvOnly: b.gv, frame: { on: false }, lock: true, disiplin: 'Mekanik' }, b.ana ? { ana: true } : {}); });
          L.f.olcek = C.paftaOlcekYazisi ? C.paftaOlcekYazisi(L) : `1/${SC}`;
          if (P.tasan.length) C.warn(`${L.name}: ${P.tasan.length} çizim pafta yüksekliğine (${P.ph} mm) sığmıyor; paftada kırpılır.`);
          paf.push(L); }); };
      const b1 = [...planlar.map(p => blok(p.gv, SC)), ...kesitler.map(k => blok(k.gv, SC))].filter(Boolean); b1.forEach(b => { b.ana = true; });
      const bT = (() => { const b = C.extents(C.doc.ents.filter(e => e.gv === gvT)); if (!b) return null; const k = 1000 / SC; return { gv: gvT, sc: SC, bb: b, w: (b[2] - b[0]) * k + 2, h: (b[3] - b[1]) * k + 2 }; })();
      /* ekipman listesi çizimlerle aynı paftada (kullanıcı 21.11.2026: "mekanik ekipman listesi için ayrı pafta yapmana gerek yok") */
      kur('MEK1', 'PLAN, KESİTLER VE EKİPMAN LİSTESİ', [...b1, bT]);
      /* MEK-02 MEKANİK BAĞLANTI DETAYLARI (unite-mekanik-detay.js; kullanıcı 21.11.2026): kapak, mikser + pergel vinç, korkuluk bağlantıları — tip başına bir detay */
      let nD = 0;
      try { const DT = C.uniteMekDetay; if (DT) { const bTb = C.extents(C.doc.ents.filter(e => e.gv === gvT)), r2 = DT({ u, K, satir, X0, Yc: bTb ? bTb[1] - 3 : Yc });
        if (r2 && r2.bloklar.length) { r2.bloklar.forEach(b => st.gvs.push(b.gv)); const n0 = paf.length; nD = r2.n;
          kur('MEK2', 'MEKANİK BAĞLANTI DETAYLARI', r2.bloklar.map(b => { const x = blok(b.gv, b.sc); if (x && b.tablo) x.tablo = true; return x; }).filter(Boolean));
          const tGv = new Set(r2.bloklar.filter(b => b.tablo).map(b => b.gv)); // tablo ve açılım kutusu pencereleri ölçeksiz (antet ölçeği yalnız detaylardan)
          for (const L of paf.slice(n0)) { for (const v of L.vps || []) if (tGv.has(v.gvOnly)) v.olceksiz = true; L.f.olcek = C.paftaOlcekYazisi ? C.paftaOlcekYazisi(L) : L.f.olcek; } } } } catch (er) { console.error('mekanik bağlantı detayları', er); }
      numarala();
      try { if (C.bolgeDuzenle) C.bolgeDuzenle({ sessiz: true }); } catch (er) { console.error('bölge düzeni', er); }
      { const s = C.doc.set; s.grups = s.grups || ['Mimari', 'Mekanik', 'Statik', 'Elektrik', 'Genel']; if (!s.grups.includes('Mekanik')) s.grups.push('Mekanik'); }
      Object.assign(st, { t: Date.now(), olcek: SC, poz: satir.length }); void vps; void ana;
      return { paf, satir, toplam: TS.toplam, nB, olcek: os, yapi, nD };
    } finally { C.doc.set.anno = anno0; }
  };
  /* Mekanik pafta numaraları: tesisat paftaları (mt-pafta.js, L.mtPafta) MEK-01 …; ünite mekanik paftaları onlardan sonra, ünite ve parça sırasıyla */
  const numarala = () => { const L = C.doc.layouts || [], n0 = L.filter(x => x.mtPafta && (x.grp || 'Mekanik') === 'Mekanik').length; let i = n0;
    for (const x of L) if (x.uniteMek) x.f = Object.assign({}, x.f || {}, { no: 'MEK-' + String(++i).padStart(2, '0') }); };
  C.uniteMekNumarala = numarala;
  /* tesisat paftaları yeniden numaralanınca ünite paftaları da onların arkasına kayar (mt-pafta.js MT.paftaNumarala sonra yüklenir: ilk komutta sarılır) */
  const numSar = () => { const MT = C.MT; if (!MT || !MT.paftaNumarala || MT._umSar) return; const f0 = MT.paftaNumarala; MT.paftaNumarala = function () { const r = f0.apply(this, arguments); try { numarala(); } catch (er) { console.error(er); } return r; }; MT._umSar = true; };

  C.addCommand(['MEKANIKPAFTA', 'UNITEMEKANIK', 'MEKPAFTA'], 'Seçili ünitenin (önce anaerobik havuz) mekanik paftasını "Mekanik" grubuna hazırlar: plan ve kesitler (mimari paftadaki ünite planı ve kesitlerinin aynısı, mekanik görünüm şablonuyla; her ekipmanda poz balonu) ve aynı paftada mekanik ekipman listesi (poz, ekipman kodu, tanım, özellikler, birim güç, adet, toplam güç; kurulu toplam güç). Aynı tip / ölçü / güçteki ekipman aynı pozu alır. Bina tesisatı için: TESISATPAFTA.', async (I) => {
    numSar();
    let u = (C.sel || []).find(tarifli) || (C.sel || []).map(e => e.bag && C.byId(e.bag)).find(tarifli);
    if (!u) { const L = C.doc.ents.filter(e => tarifli(e) && !e.gv); u = L.length === 1 ? L[0] : null; }
    if (!u) { const s = await I.sel('Mekanik paftası hazırlanacak üniteyi seçin (anaerobik havuz)'); u = (s || []).find(tarifli) || (s || []).map(e => e.bag && C.byId(e.bag)).find(tarifli); }
    if (!u) { C.warn('Mekanik pafta tarifi olan ünite seçilmedi (şimdilik anaerobik havuz). Bina tesisatı paftaları için: TESISATPAFTA (Mekanik ▸ Tesisat paftaları).'); return; }
    if (!C.doc.ents.some(x => x.bag === u.id && x.type === 'aile')) C.warn(`${u.code || ''} ünitesinde yerleşmiş mekanik ekipman yok (önce ekipman: ANAEKIPMAN). Paftalar ekipmansız hazırlanıyor.`);
    const res = C.toplu ? await C.toplu(() => uret(u)) : await uret(u); if (!res) return;
    C.changed(); C.emit('layouts');
    const L0 = res.paf[0]; if (L0) { C.layoutIdx = C.doc.layouts.indexOf(L0); C.grpCur = 'Mekanik'; C.setView('layout'); C.emit('layouts'); setTimeout(() => { try { C.views.lay.zoomExtents(); } catch (er) { } }, 60); }
    const eksik = res.toplam.eksik.length ? ` Güç verisi olmayan pozlar ("–"): ${res.toplam.eksik.join(', ')}.` : '';
    C.log(`${res.yapi}: ${res.paf.length} mekanik pafta (1/${res.olcek.olcek}) — ${res.satir.length} poz, ${res.nB} poz balonu${res.nD ? `, ${res.nD} bağlantı detayı` : ''}; kurulu toplam güç ${sayi(res.toplam.kW)} kW.${eksik} Ekipman değişince MEKANIKPAFTA ile yeniden üretin.`);
  });
})(typeof window !== 'undefined' ? window.C : null);

/* ArıtmaCAD — ÇİZİM KURALLARI (tek kaynak)
   Kullanıcının örnek çizimlerinden ölçülerek çıkarılan ve kullanıcının onayladığı çizim standardı: katman adı / rengi / çizgi tipi /
   kalınlığı, yazı stilleri ve yükseklikleri, ölçü biçimi, kot / aks / kesit işaretleri, taramalar.
   Açıklaması ve kaynağı: docs/cizim-kurallari/<disiplin>.md. Bu dosyadaki sayı ile belgedeki sayı aynı olmalıdır.
   Kullananlar: pafta çizen modüller (katmanı buradan alır) ve araclar/cizim-karsilastir.js (çıktıyı buna göre denetler).
   Saf veri + küçük yardımcılar; Node'da da yüklenir (test/cizim-karsilastir.test.js).
   serbest: true → katmanın kendisi denetlenir, içindeki nesnelerin rengi / yazısı / taraması denetlenmez (antet, kuzey işareti, maske).
   Renk = AutoCAD renk numarası · kal = çizgi kalınlığı (mm) · yazı yükseklikleri kâğıt üstü mm. */
(function (C) {
  'use strict';
  const K = C.cizimKural = {};

  /* ---------- MİMARİ (Çokal AAT R2 paftaları; kararlar 12.11.2026) ---------- */
  K.MIMARI = {
    ad: 'Mimari', belge: 'docs/cizim-kurallari/mimari.md', birim: 'cm',
    olcekler: [50, 25, 20, 10],
    katmanlar: {
      'Beton': { renk: 6, tip: 'Continuous', kal: 0.50, ne: 'Kesilen beton (perde, döşeme, radye) dış hatları' },
      'Beton_Kesik': { renk: 12, tip: 'HIDDEN', kal: 0.15, ne: 'Betonun gizli kenarı' },
      'Ongor': { renk: 9, tip: 'Continuous', kal: 0.15, ne: 'Görünüş çizgileri (kesilmeyen, önde görünen)' },
      'Arkagor': { renk: 8, tip: 'HIDDEN', kal: 0.15, ne: 'Arkada kalan / gizli kenarlar' },
      'Korkuluk': { renk: 151, tip: 'Continuous', kal: 0.25, ne: 'Korkuluk, küpeşte' },
      'Merdiven': { renk: 95, tip: 'Continuous', kal: 0.30, ne: 'Merdiven' },
      'Tretuvar': { renk: 163, tip: 'Continuous', kal: 0.20, ne: 'Tretuvar, saha kaplaması' },
      'Grobeton': { renk: 233, tip: 'Continuous', kal: 0.15, ne: 'Grobeton' },
      'Toprak': { renk: 27, tip: 'Continuous', kal: 0.20, ne: 'Zemin / toprak çizgisi' },
      'ZMN': { renk: 25, tip: 'PHANTOM2', kal: 0.40, ne: 'Zemin kotu çizgisi ve yazısı' },
      'Su': { renk: 153, tip: 'Continuous', kal: 0.20, ne: 'Su yüzeyi ve su taraması' },
      'Sututucu': { renk: 51, tip: 'Continuous', kal: 0.15, ne: 'Su tutucu bandı' },
      'Tarama': { renk: 136, tip: 'Continuous', kal: 0.09, ne: 'Kesit taramaları' },
      'Solid': { renk: 254, tip: 'Continuous', kal: 0.15, ne: 'Dolu tarama' },
      'Kesit_Cizgisi': { renk: 133, tip: 'CENTER2', kal: 0.15, ne: 'Kesit çizgisi, kesit dairesi ve harfi' },
      'Aks': { renk: 17, tip: 'ACAD_ISO04W100', kal: 0.13, ne: 'Aks çizgisi, balonu ve harfi' },
      'Kot': { renk: 32, tip: 'Continuous', kal: 0.20, ne: 'Kot işareti (CK_TR1 bloğu) ve kot yazısı' },
      'ÖL': { renk: 8, tip: 'Continuous', kal: 0.15, ne: 'Ölçüler' },
      'Mim_Yazi25': { renk: 7, tip: 'Continuous', kal: 0.25, ne: 'Mimari yazılar, eleman kodları' },
      'Yazi20': { renk: 7, tip: 'Continuous', kal: 0.20, ne: 'Yazı ve açıklama okları' },
      'Yazi25': { renk: 7, tip: 'Continuous', kal: 0.25, ne: 'Yazı ve açıklama okları' },
      'Yazi30': { renk: 72, tip: 'Continuous', kal: 0.30, ne: 'Başlık yazıları' },
      'YAZI GENEL': { renk: 240, tip: 'Continuous', kal: 0.30, ne: 'Pafta genel yazıları', serbest: true },
      'YZ': { renk: 7, tip: 'Continuous', kal: 0.20, ne: 'Mimari notlar, açıklama okları' },
      'MAHAL İSİM': { renk: 7, tip: 'Continuous', kal: 0.20, ne: 'Mahal adları' },
      'GNY': { renk: 7, tip: 'Continuous', kal: 0.15, ne: 'Kuzey işareti / genel gösterim', serbest: true },
      'ANTET': { renk: 7, tip: 'Continuous', kal: 0.25, ne: 'Antet', serbest: true },
      'Antet Ince': { renk: 7, tip: 'Continuous', kal: 0.15, ne: 'Antet ince çizgi', serbest: true },
      'Antet Kalın': { renk: 7, tip: 'Continuous', kal: 0.40, ne: 'Antet kalın çizgi', serbest: true },
      'WIPEOUT': { renk: 250, tip: 'Continuous', kal: null, ne: 'Maskeleme', serbest: true },
    },
    /* karar 1: aynı işin eski adı → standart ad */
    esAd: { 'Olcü': 'ÖL', 'OLCU': 'ÖL', 'KOT': 'Kot', 'AKS': 'Aks', 'tarama': 'Tarama' },
    /* karar 2: kodlu katman ailesi kullanılmaz */
    kodluAile: /_(WALL|TEXT|HATCH|AXIS|TITLE|SYMBOL|EXCAVATION|DIMENSION)_\d+$|^GENEL SEMBOL_/i,
    /* denetime girmeyen katmanlar: AutoCAD'in kendi katmanları ve başka disiplinin (mekanik) katmanları */
    sistem: /^(0|Defpoints)$/i,
    baskaDisiplin: /^(Mek_|Mekanik$|MEK_|Boru|Sac_Kapak$|G\. Merdiven$|Profil$)/,
    /* karar 3: nesneler rengini, çizgi tipini ve kalınlığını katmandan alır */
    katmandan: true,
    yaziStilleri: {
      'YZ': { font: 'turkce.shx', gen: 0.70 },          // karar 4
      'OL': { font: 'turkce.shx', gen: 0.75 },          // esas dosya: 1-Kaba-İnce-Giriş-Kum Yağ Tutucu_R3 (karar 5)
      'OL 20': { font: 'turkce.shx', gen: 0.80 },
      'ARIAL': { font: 'arialbd.ttf', gen: 1 },
      'TÜRKÇE': { font: 'ARIALN.TTF', gen: 1 },
    },
    /* katman → izin verilen yazı stilleri ve kâğıt üstü yükseklikler (mm) */
    yazi: {
      'Mim_Yazi25': { stil: ['YZ'], mm: [2, 2.5, 3] }, 'Yazi20': { stil: ['YZ'], mm: [2, 2.5, 3] }, 'Yazi25': { stil: ['YZ'], mm: [2, 2.5, 3] }, 'YZ': { stil: ['YZ'], mm: [2, 2.5, 3] },
      'ZMN': { stil: ['YZ'], mm: [2.5, 3] }, 'Kot': { stil: ['YZ'], mm: [2, 3] },
      'Aks': { stil: ['ARIAL'], mm: [5] }, 'Kesit_Cizgisi': { stil: ['ARIAL'], mm: [5] },
      'MAHAL İSİM': { stil: ['ARIAL', 'TÜRKÇE'], mm: [3, 4, 5] }, 'Yazi30': { stil: null, mm: [4, 5] },
    },
    olcu: {
      katman: 'ÖL', uc: ['_ArchTick'], ustte: true, hizali: true, yaziStili: ['OL', 'OL 20'],
      birim: 'cm',                                        // karar 6: ölçüler santimetre yazılır
      /* stil adı ölçeği söyler; değerler esas dosyadan (çizim birimi) */
      stiller: {
        '50': { yaziStili: 'OL', yaziMm: 2, ondalik: 2 },
        '1-20': { yaziStili: 'OL 20', yaziMm: 3, ondalik: 0, tik: 3, uzatmaBosluk: 4, uzatmaTasma: 2.5, cizgiTasma: 2 },
      },
    },
    /* ÖLÇÜ YERLEŞİMİ (kâğıt mm) — Çokal R2 paftalarındaki 2.224 doğrusal ölçüden ölçüldü (13.11.2026).
       genel (1/50, "50" stili): sıralar 5 mm arayla; uzatma çizgisi ölçülen noktadan değil ölçü çizgisinin 1 mm berisinden başlar,
       ölçü çizgisini 4,1 mm aşar (toplam 5,1 mm); ölçü çizgisi tiki 0,5 mm aşar; parça ölçüler içte, toplam ölçü en dış sırada.
       detay (1/25 ve büyük, "1-20" stili): sıralar 6,5 – 7,5 mm arayla (program 7); uzatma çizgisi ölçülen noktadan başlar (2 mm boşluk), ölçü çizgisini 1,25 mm aşar; ölçü çizgisi taşması 1 mm. */
    /* ilkSira: ilk ölçü sırası çizimin en dış çizgisinden (tretuvar dahil; tretuvarın dışında) 14 mm uzakta — kullanıcı kararı 13.11.2026, "çizime göre revize ederiz" */
    olcuYeri: {
      genel: { ilkSira: 14, siraAraligi: 5, uzatmaSabit: 1, uzatmaBosluk: 0, uzatmaTasma: 4.1, cizgiTasma: 0.5, toplam: 'dis', enCokSira: 3 },
      detay: { ilkSira: 14, siraAraligi: 7, uzatmaSabit: 0, uzatmaBosluk: 2, uzatmaTasma: 1.25, cizgiTasma: 1, toplam: 'dis', enCokSira: 3 },
    },
    kot: { blok: 'CK_TR1', yasakBlok: ['KOT101'], katman: 'Kot' }, // karar 7
    /* katman → izin verilen tarama desenleri (karar 8: kesit taraması DASH ya da SOLID; AR-SAND / ANSI36 / ANSI31 kullanılmaz) */
    /* kesilen betonun taraması: örneklerde DASH, ölçek 0,50, açı 0 (cm çizim, 1/50) → kâğıtta satır aralığı 0,32 mm; programdaki açıklama ölçeği 0,1 */
    kesitTarama: { desen: 'DASH', aci: 0, kagitOlcek: 0.1, yerine: ['ANSI31', 'ANSI36', 'AR-SAND'],
      diger: 'SOLID' },                                   // beton olmayan kesilen parçalar (korkuluk, doğrama, profil): dolu tarama — KABUL, kullanıcı doğrulayacak
    /* nesne türü → çizim katmanı (katman adından önce gelir) */
    tipKatman: { baslik: 'Yazi30', kot: 'Kot', dim: 'ÖL', aks: 'Aks', kesitisaret: 'Kesit_Cizgisi', seviyecizgi: 'ZMN' },
    yaziKatmani: 'Mim_Yazi25',                            // çizgi katmanına düşen yazılar (eleman etiketleri) buraya alınır
    /* mimari paftada görünen başka disiplin katmanları (örneklerden; kuralları mekanik belgesinde kesinleşecek) ve AutoCAD'in basılmayan katmanı */
    digerKatman: {
      'Mekanik': { renk: 94, tip: 'Continuous', kal: 0.25 }, 'Mek_Yazi': { renk: 31, tip: 'Continuous', kal: 0.25 }, 'Boru_Eksen': { renk: 242, tip: 'DASHDOT', kal: 0.15 },
      'Sac_Kapak': { renk: 251, tip: 'Continuous', kal: 0.15 }, 'Defpoints': { renk: 7, tip: 'Continuous', kal: null },
    },
    /* PROGRAM KATMANI → ÇİZİM KATMANI. Program içeride kendi katman adlarıyla çalışır (KESIT_PERDE, GORUNEN_DOSEME, KESIT_OLCU …);
       AutoCAD çıktısında ve ekrandaki renk / çizgi tipi / kalınlıkta örnek çizimlerin katmanı kullanılır. Sıra önemlidir: ilk uyan geçerlidir. null = eşleme yok. */
    esleme: [
      [/^PAFTA_PENCERE/, 'Defpoints'],
      [/^(PAFTA_ANTET|PFT_CERCEVE|PFT_TABLO|PFT_BASLIK)$/, 'ANTET'], [/^(PAFTA_YAZI|PFT_YAZI)$/, 'YAZI GENEL'],
      [/^(KESIT_DUZLEMI|KAZI.*|STA_.*|STATIK.*|DONATI.*|MT_.*|AC_.*|SAHA_.*|PENCERE|DETAY|PAFTA_INDEKS)$/, null], // başka disiplinin ve programın kendi yardımcı katmanları (PENCERE: pafta penceresi çerçevesi)
      [/(^|_)OLCU$/, 'ÖL'], [/(^|_)KOT$/, 'Kot'], [/(^|_)AKS(_BLOK)?$/, 'Aks'], [/^KESIT_ISARET$/, 'Kesit_Cizgisi'],
      [/(^|_)(BORU_YAZI|POZ(_IST)?)$/, 'Mek_Yazi'], [/(^|_)EKSEN$/, 'Boru_Eksen'], [/^DETAY_KAPAK/, 'Sac_Kapak'],
      [/(^|_)(MEK|BORU|POMPA|VANA|EKIPMAN|IZGARA|BLOWER|MIKSER|DIFUZOR)(_|$)/, 'Mekanik'],
      [/^(ZEMIN|SEVIYE)$/, 'ZMN'], [/^ARAZI$/, 'Toprak'],            // SEVIYE: kat seviyesi çizgisi ve yazısı — KABUL
      [/SU_TUTUCU_BANT/, 'Sututucu'],
      [/(^|_)TARAMA(_|$).*GROBETON|GROBETON.*(^|_)TARAMA(_|$)/, 'Grobeton'], [/(^|_)TARAMA(_|$)/, 'Tarama'],
      [/(^|_)KORKULUK(_|$)/, 'Korkuluk'], [/(^|_)MERDIVEN(_|$)/, 'Merdiven'], [/(^|_)TRETUVAR(_|$)/, 'Tretuvar'], [/(^|_)GROBETON(_|$)/, 'Grobeton'], [/(^|_)SU$/, 'Su'],
      [/(^|_)(YALITIM|KAPLAMA|DOLGU)(_|$)/, 'Ongor'],        // ince katmanlar (yalıtım, kaplama, dolgu): örneklerde ayrı katmanı yok — KABUL
      [/(^|_)(KAPI|PENCERE|CATI)$/, 'Ongor'],               // doğrama ve çatı örtüsü: kesilse de ince çizgi — KABUL
      [/^GORUNUS_.*_KESIT(_|$)/, 'Ongor'],                 // görünüşte (cephe) kesilen yok: çizgiler görünüş çizgisidir
      [/(^|_)KESIT(_|$)/, 'Beton'], [/(^|_)GORUNEN(_|$)/, 'Ongor'], [/(^|_)GIZLI(_|$)/, 'Arkagor'],
      [/^DETAY_BETON$/, 'Beton'],
      [/^(YAZI|YAZI_KAPAK|MAHAL_LISTESI)$/, 'Mim_Yazi25'], [/^MALZEME_ACILIM$/, 'YZ'], [/^MAHAL_ADI$/, 'MAHAL İSİM'],
      /* plan: model elemanlarının kendi katmanları (planda kesilenler Beton, üstten görünenler Ongor) */
      [/^(INS_(PERDE|KOLON|DUVAR.*|TEMEL.*|PARAPET|AYAK_DUVARI)|BETON|DUVAR)$/, 'Beton'],
      [/^INS_(DOSEME|CATI_DOSEMESI|KIRIS|PENCERE|KAPI|CATI)$/, 'Ongor'],
    ],
    tarama: { 'Tarama': ['DASH', 'SOLID'], 'Grobeton': ['AR-CONC'], 'Su': ['ANSI31'], 'Solid': ['SOLID'], 'Ongor': ['ANSI31'], 'Kesit_Cizgisi': ['SOLID'], 'Kot': ['SOLID'], 'GNY': ['SOLID'] },
  };
  K.disiplin = ad => K[String(ad || '').toLocaleUpperCase('en').replace('İ', 'I')] || null;
  /* katmanın kuralı; yoksa null. es: eski ad verildiyse standart adı da döner */
  K.katman = (kural, ad) => kural.katmanlar[ad] || null;
  /* program katmanının çizim katmanı (yoksa null). Zaten çizim katmanıysa kendisi döner. */
  K.esle = (kural, ad) => { if (!ad || !kural.esleme) return null; if (kural.katmanlar[ad]) return ad; const u = String(ad); for (const [re, h] of kural.esleme) if (re.test(u)) return h; return null; };
  K.tanim = (kural, hedef) => kural.katmanlar[hedef] || (kural.digerKatman || {})[hedef] || null;
  /* tanımın program katmanı biçimi: { color, lt, lw (1/100 mm) } */
  K.ozellik = t => ({ color: t.renk, lt: String(t.tip || 'Continuous').toUpperCase(), lw: t.kal == null ? -1 : Math.round(t.kal * 100) });
  const KESIKLI = /^(HIDDEN|DASHED)$/;
  /* ÇIKTI EŞLEMESİ (saf): kayitlar = [{ st: { layer, color, lt, lw } }], katmanlar = { ad: { name, color, lt, lw, on, lock } }.
     Eşlenen her kaydın katmanı çizim katmanına çevrilir, renk / çizgi tipi / kalınlık katmandan alınır (karar 3); nesne elle kesikli çizgi tipi
     taşıyorsa Beton → Beton_Kesik, Ongor → Arkagor. Kullanılmayan eski katmanlar tablodan düşer. Döner: { eslenen, eslenmeyen: [ad…] } */
  K.ciktiUygula = (kural, kayitlar, katmanlar, o) => {
    let eslenen = 0; const yok = new Set(), kullanilan = new Set(['0']), TK = kural.tipKatman || {}, YK = kural.yazi || {};
    for (const r of kayitlar) { const st = r && r.st; if (!st) continue;
      let h = K.esle(kural, st.layer); if (h && r.tip && TK[r.tip] && kural.katmanlar[h]) h = TK[r.tip];
      const yazi = r.pr && r.pr.k === 'T';
      if (h && yazi) { const mm = o && o.mm ? o.mm(r) : null;
        if (r.tip === 'baslik' && mm != null && mm < 3.5) h = kural.yaziKatmani;                                    // başlığın altındaki ölçek satırı
        else if (kural.katmanlar[h] && !kural.katmanlar[h].serbest && !YK[h] && h !== kural.olcu.katman) h = kural.yaziKatmani; // çizgi katmanındaki yazı
        const yr = YK[h]; if (yr && yr.stil && !yr.stil.includes(r.pr.st)) r.pr = Object.assign({}, r.pr, { st: yr.stil[0] });
        if (yr && yr.mm && mm != null && mm < Math.min(...yr.mm) - 0.05) r.pr = Object.assign({}, r.pr, { h: r.pr.h * Math.min(...yr.mm) / mm }); }  // en küçük yazı boyunun altındaki etiketler o boya çıkarılır        // yazı stili kuraldaki stil
      if (h === 'Tarama' && r.kind === 'hatch' && r.e && (kural.tarama.Grobeton || []).includes(r.e.pat)) h = 'Grobeton';   // beton deseni (AR-CONC) grobeton katmanında
      if (!h) { if (st.layer !== '0') yok.add(st.layer); kullanilan.add(st.layer); continue; }
      if (KESIKLI.test(String(st.lt || '').toUpperCase())) h = h === 'Beton' ? 'Beton_Kesik' : h === 'Ongor' ? 'Arkagor' : h;
      else if (h === 'Beton' && r.kind !== 'hatch' && st.lw != null && st.lw >= 0 && st.lw <= 20) h = 'Tarama';   // kesilen elemanın içindeki ince tarama çizgileri (plan sembolü)
      const t = K.tanim(kural, h), kurali = kural.katmanlar[h];
      if (!katmanlar[h]) katmanlar[h] = Object.assign({ name: h, on: true, lock: false }, t ? K.ozellik(t) : { color: 7, lt: 'CONTINUOUS', lw: -1 });
      if (st.layer !== h) eslenen++;
      st.layer = h; kullanilan.add(h);
      if (kurali && !kurali.serbest) { st.color = 256; st.lt = 'BYLAYER'; st.lw = -1; }
    }
    for (const n of Object.keys(katmanlar)) if (!kullanilan.has(n)) delete katmanlar[n];
    return { eslenen, eslenmeyen: [...yok].sort() };
  };
})(typeof window !== 'undefined' ? window.C : (globalThis.C = globalThis.C || {}));

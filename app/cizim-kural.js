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
      'Mim_Yazi25': { stil: ['YZ'], mm: [2, 2.5, 3] }, 'Yazi20': { stil: ['YZ'], mm: [2, 2.5, 3] }, 'Yazi25': { stil: ['YZ'], mm: [2, 2.5, 3, 3.5, 4] }, /* 3,5: açılım kodu, 4: DÖŞEMELER / DUVARLAR başlığı */ 'YZ': { stil: ['YZ'], mm: [2, 2.5, 3] },
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
      genel: { ilkSira: 14, siraAraligi: 5, uzatmaSabit: 1, uzatmaBosluk: 0, uzatmaTasma: 4.1, cizgiTasma: 0.5, toplam: 'dis', enCokSira: 3, icYatay: 25, icDusey: 20 },   // icYatay / icDusey: yapının içindeki zincirlerin döşemeden / sol duvardan uzaklığı (KABUL)
      detay: { ilkSira: 14, siraAraligi: 7, uzatmaSabit: 0, uzatmaBosluk: 2, uzatmaTasma: 1.25, cizgiTasma: 1, toplam: 'dis', enCokSira: 3 },
    },
    kot: { blok: 'CK_TR1', yasakBlok: ['KOT101'], katman: 'Kot' }, // karar 7
    /* katman → izin verilen tarama desenleri (karar 8: kesit taraması DASH ya da SOLID; AR-SAND / ANSI36 / ANSI31 kullanılmaz) */
    /* kesilen betonun taraması: örneklerde DASH, ölçek 0,50, açı 0 (cm çizim, 1/50) → kâğıtta satır aralığı 0,32 mm; programdaki açıklama ölçeği 0,1 */
    kesitTarama: { desen: 'DASH', aci: 0, kagitOlcek: 0.1, yerine: ['ANSI31', 'ANSI36', 'AR-SAND'],
      diger: 'SOLID' },                                   // beton olmayan kesilen parçalar (korkuluk, doğrama, profil): dolu tarama — KABUL, kullanıcı doğrulayacak
    /* MALZEME AÇILIMI ve PERDE / DÖŞEME NUMARALARI (Çokal R2: çöktürme, yoğunlaştırma, ön arıtma, terfi mimari paftalarından ölçüldü; kâğıt mm).
       etiket: kesitte elemanın yanındaki kod (DU01, DÖ02 …) — 2,5 mm YZ, katman Mim_Yazi25; koddan elemana ince çizgi (renk 243).
               Duvarda çizgi yataydır: duvarın ortasından çıkar, yüzden 4,5 mm sonra biter, kod çizgiden 1,3 mm sonra başlar.
               Döşemede çizgi "L" biçimindedir: döşemeden 12 mm dik çıkar, 2,3 mm yatay döner, kod ondan sonra yazılır.
               Sayı: kesilen her duvar parçasına (toprak altı ve toprak üstü ayrı) ve her döşeme parçasına bir kod.
       kutu  : paftadaki açılım çerçevesi — üstte "DÖŞEMELER", altta "DUVARLAR" (4 mm, altı çizili); kodlar yan yana (sütun aralığı 84 mm);
               kod 3,5 mm altı çizili renk 94; satırlar 2,5 mm, tireli; yazılar Yazi25, çerçeve Mim_Yazi25 katmanında. */
    acilim: {
      etiket: { katman: 'Mim_Yazi25', yaziMm: 2.5, cizgiRenk: 243, bosluk: 1.3, duvarTasma: 4.5, dosemeDik: 12, dosemeYatay: 2.3 },
      kutu: { yaziKatman: 'Yazi25', cerceveKatman: 'Mim_Yazi25', baslikMm: 4, baslikRenk: 94, kodMm: 3.5, kodRenk: 94, satirMm: 2.5, satirAralik: 4.2, kodAralik: 5.8,
        girinti: 4, sutun: 84, kenar: 3.6, baslikAlt: 12, kutuAlt: 15.6, grupBosluk: 6, satirHarf: 40 },
    },
    /* katmandan bağımsız kalan nesne renkleri (örnek çizimlerde de nesnede yazılıdır) */
    renkKorunur: { 'Mim_Yazi25': [243], 'Yazi25': [94] },
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
      [/^(YAZI|YAZI_KAPAK|MAHAL_LISTESI)$/, 'Mim_Yazi25'], [/^MALZEME_ACILIM_YAZI$/, 'Yazi25'], [/^MALZEME_ACILIM$/, 'Mim_Yazi25'], [/^MAHAL_ADI$/, 'MAHAL İSİM'],
      /* plan: model elemanlarının kendi katmanları (planda kesilenler Beton, üstten görünenler Ongor) */
      [/^(INS_(PERDE|KOLON|DUVAR.*|TEMEL.*|PARAPET|AYAK_DUVARI)|BETON|DUVAR)$/, 'Beton'],
      [/^INS_(DOSEME|CATI_DOSEMESI|KIRIS|PENCERE|KAPI|CATI)$/, 'Ongor'], [/^RAMPA$/, 'Ongor'], /* rampa: KABUL */
    ],
    tarama: { 'Tarama': ['DASH', 'SOLID'], 'Grobeton': ['AR-CONC'], 'Su': ['ANSI31'], 'Solid': ['SOLID'], 'Ongor': ['ANSI31'], 'Kesit_Cizgisi': ['SOLID'], 'Kot': ['SOLID'], 'GNY': ['SOLID'] },
  };
  /* ---------- STATİK (Çokal AAT R1 statik paftaları: havalandırma havuzu, çamur susuzlaştırma binası, blower binası, geri devir terfi;
     13.11.2026'da ölçüldü — TASLAK: dört örnekte aynı olan değerler yazıldı, örneklerin birbirini tutmadığı yerler belgede "açık sorular"da) ---------- */
  K.STATIK = {
    ad: 'Statik', belge: 'docs/cizim-kurallari/statik.md', birim: 'cm', taslak: true,
    olcekler: [50, 100, 20],                              // 1/20 detay 1/50 uzayında 2,5 kat büyütülür (ölçü stili "20", DIMLFAC 0,4)
    katmanlar: {
      'DN': { renk: 7, tip: 'Continuous', kal: 0.53, ne: 'Donatı çizgisi, kesitte çubuk noktası, etriye' },
      'DN1': { renk: 3, tip: 'Continuous', kal: 0.15, ne: 'Donatı etiketi, poz balonu, gösterge çizgisi' },
      'ÖL': { renk: 147, tip: 'Continuous', kal: 0.15, ne: 'Ölçüler' },
      'KOT': { renk: 3, tip: 'Continuous', kal: 0.15, ne: 'Kot işareti ve yazısı' },
      'AX': { renk: 17, tip: 'ACAD_ISO04W100', kal: 0.09, ne: 'Aks çizgisi, balonu ve harfi' },
      'KS': { renk: 133, tip: 'CENTER2', kal: 0.15, ne: 'Kesit çizgisi, kesit dairesi ve harfi' },
      'BE': { renk: 6, tip: 'Continuous', kal: 0.40, ne: 'Kesilen beton dış hattı (kalıp çizgisi)' },
      'BK': { renk: 12, tip: 'HIDDEN', kal: 0.20, ne: 'Betonun gizli kenarı' },
      'ÖN': { renk: 9, tip: 'Continuous', kal: 0.15, ne: 'Ön görünüş çizgileri' },
      'AG': { renk: 8, tip: 'HIDDEN', kal: 0.13, ne: 'Arka görünüş / gizli kenar' },
      'TR': { renk: 136, tip: 'Continuous', kal: 0.09, ne: 'Kesit taraması' },
      'TP': { renk: 36, tip: 'Continuous', kal: 0.20, ne: 'Toprak / dolgu' },
      'GR': { renk: 223, tip: 'Continuous', kal: 0.15, ne: 'Grobeton' },
      'YZ': { renk: 7, tip: 'Continuous', kal: 0.15, ne: 'Genel yazı, başlık, ölçek, eleman adı' },
      'Yazi25': { renk: 7, tip: 'Continuous', kal: 0.25, ne: 'Malzeme açıklamaları' },
      'KR': { renk: 80, tip: 'Continuous', kal: 0.30, ne: 'Kalıp planında kiriş kenarı, kiriş adı ve boyutu' },
      'DSM': { renk: 4, tip: 'Continuous', kal: 0.20, ne: 'Döşeme kenarı, taraması, adı' },
      'HTL': { renk: 244, tip: 'Continuous', kal: 0.25, ne: 'Hatıl' },
      'ST': { renk: 2, tip: 'Continuous', kal: 0.13, ne: 'Su tutucu bant' },
      'S-METRAJ': { renk: 7, tip: 'Continuous', kal: null, ne: 'Donatı metraj tablosu', serbest: true },
      'GNY': { renk: 7, tip: 'Continuous', kal: 0.15, ne: 'Genel notlar, damga', serbest: true },
      'ANTET': { renk: 7, tip: 'Continuous', kal: 0.25, ne: 'Antet', serbest: true },
      'Antet Ince': { renk: 7, tip: 'Continuous', kal: 0.15, ne: 'Antet ince çizgi', serbest: true },
      'Antet Kalın': { renk: 7, tip: 'Continuous', kal: 0.40, ne: 'Antet kalın çizgi', serbest: true },
    },
    esAd: {}, kodluAile: /^$/,                            // açık soru: kiriş açılımındaki uzun adlı katman ailesi ("Etriye", "Donatı Çizgi" …)
    sistem: /^(0|Defpoints)$/i,
    baskaDisiplin: /^(Mek_|Mekanik$|MEK_|Boru|Mim_|BASLIK_TITLE|GENEL SEMBOL_|S-METRAJ_)/,
    katmandan: false,                                     // örneklerde donatı yazılarının anlamı elle verilen renkle ayrılır (açık soru 10)
    /* donatı etiketi parçalarının rengi (bina paftaları; DN1 katmanında elle renk) */
    etiketRenk: { donati: 3, boy: 2, poz: 6, parcaBoy: 5, konum: 4, gosterge: 103 },
    yaziStilleri: { 'YZ': { font: 'turkce.shx', gen: 0.70 }, 'ARIAL': { font: 'arialbd.ttf', gen: 1 }, 'TÜRKÇE': { font: 'ARIALN.TTF', gen: 1 }, 'DN1_BOT': { font: 'ARIALN.TTF', gen: 1 } },
    yazi: {
      'DN1': { stil: ['DN1_BOT', 'YZ'], mm: [1.5, 1.6, 2, 2.5] },   // etiket, boy, poz 2; parça boyu / konum 1,6; çap başlığı 2,5
      'YZ': { stil: null, mm: [2, 2.4, 3, 4, 5] },                 // eleman adı 2; ölçek 2,4 – 3; detay başlığı 4; ana başlık 5 (altı çizili)
      'KR': { stil: null, mm: [2, 4] }, 'DSM': { stil: null, mm: [2] }, 'HTL': { stil: null, mm: [2] }, 'Yazi25': { stil: ['YZ'], mm: [2] },
      'KOT': { stil: null, mm: [2] }, 'AX': { stil: ['ARIAL'], mm: [5] }, 'KS': { stil: null, mm: [2.5, 3, 5] },
    },
    olcu: {
      katman: 'ÖL', uc: ['_ArchTick', 'PCDIM_TICK'], ustte: true, hizali: true, yaziStili: ['OL', 'YZ', 'OL 20', 'OL_100', 'Ölçü Yazı'], birim: 'cm',
      stiller: { '50': { yaziMm: 2, ondalik: 2 }, '20': { yaziMm: 2, carpan: 0.4 }, '100': { yaziMm: 2 }, 'BEAM': { yaziMm: 2, carpan: 0.4 } },
    },
    kot: { blok: 'CK_TR1', yasakBlok: [], katman: 'KOT' },
    kesitTarama: { desen: 'ANSI36', kagitOlcek: 25 },     // kesilen beton (cm çizim, 1/50)
    tarama: { 'TR': ['ANSI36'], 'DSM': ['ANSI33'], 'GR': ['AR-CONC'], 'TP': ['GRAVEL', 'AR-SAND'], 'DN': ['ANSI31'], 'KS': ['SOLID'], 'KOT': ['SOLID'], 'DN1': ['SOLID'], 'GNY': ['SOLID'] },
    /* işaret boyutları (kâğıt mm) */
    isaret: { pozBalonCap: 4, aksHarf: 5, kesitHarf: 5, kesitDaireCap: 10, baslik: 5, detayBaslik: 4, olcekYazi: 3, olcekRenk: 32, olcekBicim: 'ÖL:1/{n}' },
    /* PROGRAM KATMANI → ÇİZİM KATMANI (statik pafta üreticileri STA_* katmanlarıyla çalışır) */
    esleme: [
      [/^STA_(3B_.*)$/, null],
      [/^STA_KALIP$/, 'BE'], [/^STA_GIZLI$/, 'BK'], [/^STA_(DONATI|ETRIYE)$/, 'DN'], [/^STA_(POZ|ETIKET)$/, 'DN1'], [/^STA_OLCU$/, 'ÖL'], [/^STA_AKS$/, 'AX'],
      [/^STA_KESIT$/, 'KS'], [/^STA_KOT$/, 'KOT'], [/^STA_(YAZI|BASLIK)$/, 'YZ'], [/^STA_TARAMA$/, 'TR'], [/^STA_(TABLO.*)$/, 'S-METRAJ'], [/^STA_CERCEVE$/, 'ANTET'],
      [/^STA_ZEMIN$/, 'TP'], [/^STA_BANT$/, 'ST'], [/^STA_KIRIS$/, 'KR'], [/^STA_DOSEME$/, 'DSM'], [/^STA_GORUNEN$/, 'ÖN'],
    ],
  };
  K.disiplin = ad =>K[String(ad || '').toLocaleUpperCase('en').replace('İ', 'I')] || null;
  /* katmanın kuralı; yoksa null. es: eski ad verildiyse standart adı da döner */
  K.katman = (kural, ad) => kural.katmanlar[ad] || null;
  /* program katmanının çizim katmanı (yoksa null). Zaten çizim katmanıysa kendisi döner. */
  K.esle = (kural, ad) => { if (!ad || !kural.esleme) return null; if (kural.katmanlar[ad]) return ad; const u = String(ad); for (const [re, h] of kural.esleme) if (re.test(u)) return h; return null; };
  K.tanim = (kural, hedef) => kural.katmanlar[hedef] || (kural.digerKatman || {})[hedef] || null;
  /* tanımın program katmanı biçimi: { color, lt, lw (1/100 mm) } */
  K.ozellik = t => ({ color: t.renk, lt: String(t.tip || 'Continuous').toUpperCase(), lw: t.kal == null ? -1 : Math.round(t.kal * 100) });
  /* KESİTTE NEYİN ÖLÇÜLENDİRİLECEĞİ (kullanıcı kuralı 13.11.2026): ölçü, mimari olarak ne varsa onu gösterir — duvar / perde kalınlığı,
     aralarındaki boşluk (net açıklık), pencere / kapı boşluğu, döşeme ve temel kalınlığı, kat yüksekliği. Merdiven basamağı, kiriş kenarı,
     pah, korkuluk gibi her kenar ölçülmez. halkalar: kesilen elemanların sınırları [{ lk: 'PERDE' | 'DOSEME' …, pts: [[x, z] …] }].
     Döner: yatay zincirin x noktaları (duvar yüzleri) ve düşey zincirin z noktaları (döşeme / temel yüzleri + sol dış duvardaki boşluklar). */
  const DUVAR = /PERDE|DUVAR|KOLON|PARAPET/, DOSEME = /DOSEME|RADYE|TEMEL|PLAK/;
  K.kesitOlcuNoktalari = halkalar => {
    const xs = [], zs = [], D = [];
    for (const h of halkalar || []) { if (!h.pts || !h.pts.length) continue; let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const q of h.pts) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
      const lk = String(h.lk || '');
      if (DOSEME.test(lk)) zs.push(z0, z1); else if (DUVAR.test(lk)) { xs.push(x0, x1); D.push({ x0, z0, z1 }); } }
    if (D.length) { const xm = Math.min(...D.map(d => d.x0)); for (const d of D) if (d.x0 - xm < 0.6) zs.push(d.z0, d.z1); } // sol dış duvar: pencere / kapı boşluğu duvarı parçalara böler
    return { xs, zs };
  };
  /* YAPININ İÇİNDEKİ ÖLÇÜLER (kullanıcı 13.11.2026: "ölçüler içeriden verilsin"). Kesitte ölçüler yapının içinden zincir olarak verilir:
       yatay : her kat aralığında, döşemeden icYatay mm yukarıda tek zincir — duvar kalınlığı · net açıklık · duvar kalınlığı …
       düşey : kesilen iki duvar arasındaki her hacimde, sol duvardan icDusey mm içeride tek zincir — alt döşeme kalınlığı · net yükseklik
               (sol duvardaki pencere / kapı boşluğu varsa parçalarıyla) · üst döşeme kalınlığı.
     Dışarıda yalnız toplam boy ve toplam yükseklik kalır. mm: kâğıtta 1 mm'nin modeldeki boyu; yer: { icYatay, icDusey } (kural tablosu → olcuYeri).
     Döner: [{ k: 'h' | 'v', a, b, p }] (kesit koordinatı [x, z]). */
  K.kesitIcOlculer = (halkalar, mm, yer) => {
    const B = []; for (const h of halkalar || []) { if (!h.pts || !h.pts.length) continue; let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const q of h.pts) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); } B.push({ lk: String(h.lk || ''), x0, x1, z0, z1 }); }
    const dos = B.filter(b => DOSEME.test(b.lk) && b.x1 - b.x0 >= 1.5), duv = B.filter(b => DUVAR.test(b.lk) && !DOSEME.test(b.lk));
    const birles = (v, tol) => { v.sort((a, b) => a[0] - b[0]); const o = []; for (const q of v) { const l = o[o.length - 1]; if (l && q[0] <= l[1] + tol) l[1] = Math.max(l[1], q[1]); else o.push(q.slice()); } return o; };
    const tek = v => { v.sort((a, b) => a - b); const o = []; for (const x of v) if (!o.length || x - o[o.length - 1] > 0.045) o.push(x); return o; };
    const Y = Object.assign({ icYatay: 25, icDusey: 20 }, yer || {}), K2 = birles(dos.map(b => [b.z0, b.z1]), 0.02), out = [], e = mm || 0.05;
    for (let i = 1; i < K2.length; i++) { const zA = K2[i - 1][1], zB = K2[i][0], H = zB - zA; if (H < 1.2) continue; const zM = (zA + zB) / 2;
      /* kat aralığına giren her duvar sınırdır: pencereyle bölünen duvar da, kapının üstünde kalan lento parçası da */
      const W = birles(duv.filter(b => Math.min(b.z1, zB) - Math.max(b.z0, zA) > 0.005).map(b => [b.x0, b.x1]), 0.02); if (W.length < 2) continue;
      const yH = zA + Math.min(H * 0.5, Y.icYatay * e), X = tek(W.reduce((a, w) => a.concat(w), []));
      for (let j = 1; j < X.length; j++) out.push({ k: 'h', a: [X[j - 1], yH - e], b: [X[j], yH - e], p: [X[j - 1], yH] });
      for (let j = 1; j < W.length; j++) { const xA = W[j - 1][1], xB = W[j][0], L = xB - xA; if (L < 0.8) continue; const d = Math.min(L * 0.5, Y.icDusey * e); let tamam = false;
        const bos = (kenar, yuz, zA1, zB1) => { const o = []; for (const b of duv) if (Math.abs(b[kenar] - yuz) < 0.03) for (const z of [b.z0, b.z1]) if (z > zA1 + 0.05 && z < zB1 - 0.05) o.push(z); return o; };
        const sagda = !bos('x1', xA, zA, zB).length && bos('x0', xB, zA, zB).length > 0; /* boşluk (pencere / kapı) yalnız sağ duvardaysa zincir sağ duvarın yanına konur */
        for (const xV of sagda ? [xB - d, (xA + xB) / 2, xA + d] : [xA + d, (xA + xB) / 2, xB - d]) { const ic = b => b.x0 <= xV && b.x1 >= xV;
          const alt = dos.filter(b => ic(b) && b.z1 <= zM).sort((p, q) => q.z1 - p.z1)[0], ust = dos.filter(b => ic(b) && b.z0 >= zM).sort((p, q) => p.z0 - q.z0)[0]; if (!alt || !ust) continue;
          const Z = [alt.z0, alt.z1, ust.z0]; if (i === K2.length - 1) Z.push(ust.z1); /* ara döşemenin kalınlığı yalnız üst katın zincirinde ölçülür (iki kez yazılmaz) */
          tamam = true;
          Z.push(...(sagda ? bos('x0', xB, alt.z1, ust.z0) : bos('x1', xA, alt.z1, ust.z0)));
          const T = tek(Z); for (let q = 1; q < T.length; q++) out.push({ k: 'v', a: [xV + e, T[q - 1]], b: [xV + e, T[q]], p: [xV, T[q - 1]] });
          break; }
        if (!tamam) out.eksikDusey = true; /* üstü açık hacim: düşey zincir kurulamadı → dıştaki düşey zincir kalır (kesit.js) */ } }
    return out;
  };
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
      if (kurali && !kurali.serbest) { if (!((kural.renkKorunur || {})[h] || []).includes(st.color)) st.color = 256; st.lt = 'BYLAYER'; st.lw = -1; }
    }
    for (const n of Object.keys(katmanlar)) if (!kullanilan.has(n)) delete katmanlar[n];
    return { eslenen, eslenmeyen: [...yok].sort() };
  };
})(typeof window !== 'undefined' ? window.C : (globalThis.C = globalThis.C || {}));

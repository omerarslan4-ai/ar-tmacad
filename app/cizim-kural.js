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
      'Kapi_Pencere': { renk: 23, tip: 'Continuous', kal: 0.25, ne: 'Kapı / pencere (doğrama) — plan, kesit ve görünüşte (10-İdari Bina_R2)' },
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
      'ZMN': { stil: ['YZ'], mm: [2.5] }, 'Kot': { stil: ['YZ'], mm: [2, 2.5, 3] }, /* 10-İdari Bina_R2: ZMN 12,5 birim (2,5 mm); KOT 10 (2 mm, en sık), 12,5 (2,5 mm), 1/20 detayda 6 (3 mm) */
      'Aks': { stil: ['ARIAL'], mm: [5] }, 'Kesit_Cizgisi': { stil: ['ARIAL'], mm: [5] },
      'MAHAL İSİM': { stil: ['ARIAL', 'TÜRKÇE'], mm: [3, 4] }, 'Yazi30': { stil: ['YZ'], mm: [4, 5] }, /* mahal adı 15 – 20 birim; başlık 20 (görünüş) – 25 (kesit, Blower) birim; başlık stili YZ (kullanıcı kararı 14.11.2026) */
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
       genel (1/50, "50" stili): sıralar 5 mm arayla; uzatma çizgisi sabit boylu (Çokal $DIMFXLON = 1): ölçü çizgisinden ölçülen noktaya
       doğru 4,1 mm (uzatmaIc) iner, öbür yanda 1 mm (uzatmaDis) taşar (toplam 5,1 mm; 14.11.2026 düzeltme: yön ters uygulanmıştı); ölçü çizgisi tiki 0,5 mm aşar; parça ölçüler içte, toplam ölçü en dış sırada.
       detay (1/25 ve büyük, "1-20" stili): örneklerde sıralar 6,5 – 7,5 mm arayla; uzatma çizgisi ölçülen noktadan başlar (2 mm boşluk), ölçü çizgisini 1,25 mm aşar; ölçü çizgisi taşması 1 mm. */
    /* sıra aralığı (firma kuralı 14.11.2026): ölçü sıraları üst üste binmez, aralar MODELDE 25 cm (siraModel = 0,25 m), her ölçekte aynı — kâğıtta
       250 / ölçek mm (1/50 5, 1/25 10, 1/20 12,5 mm); plan, kesit, görünüş ve detayda aynı. siraAraligi (kâğıt mm) yalnız eski yedek değerdir. */
    /* ilkSira: ilk ölçü sırası çizimin en dış çizgisinden (tretuvar dahil; tretuvarın dışında) 14 mm uzakta — kullanıcı kararı 13.11.2026, "çizime göre revize ederiz" */
    olcuYeri: {
      /* siraModel: ölçü sıraları arası MODELDE 0,25 m, her ölçekte aynı (firma kuralı 14.11.2026): kâğıtta 250 / ölçek mm (1/50 5, 1/25 10, 1/100 2,5, 1/20 12,5 mm); siraAraligi: eski kâğıt mm (yedek) */
      genel: { ilkSira: 14, siraAraligi: 5, siraModel: 0.25, uzatmaIc: 4.1, uzatmaDis: 1, uzatmaBosluk: 0, cizgiTasma: 0.5, toplam: 'dis', enCokSira: 3, icYatay: 25, icDusey: 20 },   // icYatay / icDusey: yapının içindeki zincirlerin döşemeden / sol duvardan uzaklığı (KABUL)
      detay: { ilkSira: 14, siraAraligi: 5, siraModel: 0.25, uzatmaSabit: 0, uzatmaBosluk: 2, uzatmaTasma: 1.25, cizgiTasma: 1, toplam: 'dis', enCokSira: 3 },
    },
    /* ÇAKIŞMA GİDERME kayma sınırları (kâğıt mm; MIMARIPAFTA → mimari-oto.js cakismaCoz, denetim 14.11.2026): ölçü sırası çizgisine dik en çok 16 mm
       (Bekçi A-A çakışma 0), kot yatayda 12, açılım kodu 10, doğrama numarası düşeyde 8 mm; enCok: bir öğenin toplam kayması en çok 16 mm. KABUL — örnek çizimde ölçülmedi */
    cakismaKayma: { olcu: 16, kot: 12, acilim: 10, dogramaNo: 8, enCok: 16 },
    kot: { blok: 'CK_TR1', yasakBlok: ['KOT101'], katman: 'Kot' }, // karar 7
    /* ÇİZGİ TİPİ — kâğıtta görünen desen (mm), ölçekten bağımsız (14.11.2026, Çokal R2'den hesaplandı): örnekler cm çizilmiş, $LTSCALE 20,
       $CELTSCALE 1, $PSLTSCALE 0 (k1, k5, k6) / 1 (k10); nesne çizgi tipi ölçeği en sık Aks 0,125, Arkagor / Beton_Kesik 2, Kesit_Cizgisi 1, ZMN 2.
       1/50 kâğıtta: Aks (ACAD_ISO04W100 24,-3,0,-3 × 20 × 0,125 cm) 12 mm çizgi · 1,5 mm boşluk · nokta; Arkagor / Beton_Kesik (HIDDEN 0,25",-0,125" × 20 × 2 cm)
       2 mm çizgi · 1 mm boşluk; Kesit_Cizgisi (CENTER2 0,75,-0,125,0,125,-0,125 × 20 cm) 3 · 0,5 · 0,5 · 0,5 mm; ZMN (PHANTOM2 × 20 × 2 cm) 5 · 1 · 1 · 1 · 1 · 1 mm.
       Program bu desenleri kâğıt mm'si olarak tanımlar; pafta penceresinde ölçek ne olursa olsun kâğıtta aynı görünür (PSLTSCALE = 1 davranışı). */
    cizgiTipi: { ACAD_ISO04W100: [12, -1.5, 0, -1.5], HIDDEN: [2, -1], CENTER2: [3, -0.5, 0.5, -0.5], PHANTOM2: [5, -1, 1, -1, 1, -1] },
    /* AKS (Çokal 10-İdari Bina_R2 ve 6-Blower Binası_R2 planları, 14.11.2026): balon yarıçapı 30 cm = 6 mm, harf ARIAL 25 = 5 mm;
       numaralar soldan sağa, harfler yukarıdan aşağıya (A üstte; Konya planında da). Plan ölçü sıraları içten dışa: doğrama zinciri ·
       aks zinciri (dış yüz – akslar – dış yüz) · toplam; balon merkezi en dış sıranın 11 mm dışında (İdari: 44 → 55, 63 → 74 mm). */
    aks: { balonR: 6, yaziMm: 5, balonOte: 11 },
    /* KAPI / PENCERE TİP NUMARASI (Çokal 10-İdari Bina_R2 kat planı; biçim Konya planında da aynı): daire yarıçapı 15 birim = 3 mm, kod YZ 2 mm,
       daireden doğramaya çizgi renk 243, çizginin üstünde genişlik, altında yükseklik (2 mm); daire merkezi duvar ekseninden 15,7 mm. Katman YZ. */
    dogramaNo: { balonR: 3, kodMm: 2, yaziMm: 2, cizgiRenk: 243, mesafe: 15.7, katman: 'DOGRAMA_NO' },
    /* KESİT TARAMALARI — kullanıcı kararı 14.11.2026: "taramalar örnek projede ne ise o şekilde taranacak" (12.11'deki "yalnız DASH ya da SOLID" kararının yerine).
       Çokal R2 setinden ölçüldü (11 dosya, 1/50 kesitler; cm çizim, desenler acadiso). olcek / aci: örnekteki desen ölçeği ve açısı;
       sc: programdaki karşılığı — açıklama ölçeği (kâğıt üstü; örnekteki desen aralığı ÷ programdaki desen tanımı × 0,2, AR-SAND / AR-CONC tanım çarpanı 0,05 dahil),
       gercek: desen gerçek boyutlu (AR-B816; sc = örnekteki aralık cm × 10 ÷ tanım mm). Örnekte karşılığı olmayan malzeme null: programın kendi deseni kalır. */
    kesitTarama: {
      malzeme: {
        beton: { katman: 'Tarama', desen: 'ANSI36', olcek: 50, aci: 0, sc: 0.3937, ne: 'Kesilen beton (perde, radye, döşeme, kiriş, kolon)' },        // 8 dosyada 50 (k3, k4, k12'de 2,5 = aynı aralık)
        grobeton: { katman: 'Grobeton', desen: 'AR-CONC', olcek: 5, aci: 0, sc: 0.7874, ne: 'Grobeton' },                                         // 9 dosyada 5 (k3, k4'te 0,1)
        tugla: { katman: 'Tarama', desen: 'AR-B816', olcek: 1, aci: 0, sc: 0.394, gercek: true, ne: 'Tuğla duvar (kesit ve plan)' },             // İdari bina, Blower binası
        gazbeton: null,                                                                                                                       // örnekte ayrı deseni yok
        dolgu: { katman: 'Toprak', desen: 'AR-SAND', olcek: 10, aci: 0, sc: 1.8251, ne: 'Dolgu (döşeme altı)' },                                // İdari bina (6); Çamursuzlaştırma (3) / Blower'da (1) 0,5
        tretuvarKaplama: { katman: 'Tarama', desen: 'DASH', olcek: 0.5, aci: 0, sc: 0.1, ne: 'Tretuvar kaplaması (8 cm kilit parke taşı)' },     // 7 dosya
        tretuvarAlt: { katman: 'Tarama', desen: 'AR-SAND', olcek: 0.03, aci: 45, sc: 0.1391, ne: 'Tretuvar kaplama altı (kum yatak / harç, stabilize; örnekte tek katman)' },
        bordur: { katman: 'Tarama', desen: 'ANSI31', olcek: 0.5, aci: 90, sc: 0.1, ne: 'Bordür' },
        tretuvarBeton: { katman: 'Tarama', desen: 'ANSI36', olcek: 50, aci: 0, sc: 0.3937, ne: 'Tretuvar betonu (1/10 tretuvar detayında beton gibi taranmış)' },
        yatak: null,                                                                                                                          // bordür yatak betonu: örnekte yok
        yalitim: null,                                                                                                                        // yalıtım: örnekte taraması yok
        su: { katman: 'Su', desen: 'ANSI31', olcek: 20, aci: 135, sc: 0.1575, ne: 'Su (program kesitte su taramaz)' },
      },
      /* programın kesit malzeme kodu (kesit.js → secMat / tretSecMat) → yukarıdaki malzeme */
      kod: { B: 'beton', D: 'beton', G: 'grobeton', LG: 'grobeton', 'T:tugla': 'tugla', 'T:gazbeton': 'gazbeton', F: 'dolgu', Y: 'yalitim',
        'TR:kap': 'tretuvarKaplama', 'TR:harc': 'tretuvarAlt', 'TR:stab': 'tretuvarAlt', 'TR:bord': 'bordur', 'TR:beton': 'tretuvarBeton', 'TR:yatak': 'yatak' },
      diger: 'SOLID' },                                   // beton olmayan kesilen parçalar (korkuluk, doğrama, profil): dolu tarama — KABUL, kullanıcı doğrulayacak
    /* MAHAL LİSTESİ — R2 İdari bina mahal listesi: başlık 4 mm (Yazi_Baslik katmanı; programda başlık katmanı Yazi30), öteki yazılar 2 mm (kullanıcı kararı 14.11.2026) */
    /* GÖRÜNÜM BAŞLIĞI (10-İdari Bina_R2, 6-Blower_R2): görünüş / plan / detay başlığı 20 birim (4 mm), kesit başlığı 25 birim (5 mm); altındaki ölçek satırı "ÖL:1/…" 15 birim (3 mm) */
    baslik: { gorunusMm: 4, kesitMm: 5, olcekMm: 3, detayMm: 4 }, /* detayMm: DETAY-A, DETAY-B … başlığı (denetim 14.11.2026; 5 mm idi) */
    mahalListesi: { baslikMm: 4, yaziMm: 2, baslikStil: 'YZ' }, /* başlık stili YZ (kullanıcı kararı 14.11.2026; İdari'de TÜRKÇE idi) */
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
    renkKorunur: { 'Mim_Yazi25': [243], 'Yazi25': [94], 'YZ': [243] },
    /* nesne türü → çizim katmanı (katman adından önce gelir) */
    tipKatman: { baslik: 'Yazi30', kot: 'Kot', dim: 'ÖL', aks: 'Aks', kesitisaret: 'Kesit_Cizgisi', seviyecizgi: 'ZMN' },
    yaziKatmani: 'Mim_Yazi25',                            // çizgi katmanına düşen yazılar (eleman etiketleri) buraya alınır
    /* OKLU AÇIKLAMA (MULTILEADER; kâğıt mm, açı derece yatayla) — Çokal R2'den ölçüldü (mimari.md bölüm 6): ok ucu _ClosedBlank 6 birim = 1,2 mm,
       yazı 2 mm, kırılma ile yazı arası 0,8 mm. Korkuluk: 10-İdari planı (kol 58 birim = 11,7 mm, 59°), yazı Mim_Yazi25. Çatı: ÇKL-AAT-İB-03 (kol 32 birim
       = 6,4 mm, 60°), yazı YZ. Lento: 6-Blower kesit detayı, yazı Yazi25 (kol ve açı korkulukla aynı). Program katmanları: ok ACIKLAMA_OKU → YZ,
       yazı YAZI → Mim_Yazi25, ACIKLAMA_OKU → YZ, LENTO_YAZI → Yazi25. */
    okluAciklama: {
      okMm: 1.2, yaziMm: 2, bosluk: 0.8,
      korkuluk: { kolMm: 11.7, aci: 59, yaziKatman: 'YAZI' },
      cati: { kolMm: 6.4, aci: 60, yaziKatman: 'ACIKLAMA_OKU' },
      lento: { kolMm: 11.7, aci: 59, yaziKatman: 'LENTO_YAZI' },
    },
    /* mimari paftada görünen başka disiplin katmanları (örneklerden; kuralları mekanik belgesinde kesinleşecek) ve AutoCAD'in basılmayan katmanı */
    digerKatman: {
      'Mekanik': { renk: 94, tip: 'Continuous', kal: 0.25 }, 'Mek_Yazi': { renk: 31, tip: 'Continuous', kal: 0.25 }, 'Boru_Eksen': { renk: 242, tip: 'DASHDOT', kal: 0.15 },
      'Sac_Kapak': { renk: 251, tip: 'Continuous', kal: 0.15 }, 'Defpoints': { renk: 7, tip: 'Continuous', kal: null },
    },
    /* PROGRAM KATMANI → ÇİZİM KATMANI. Program içeride kendi katman adlarıyla çalışır (KESIT_PERDE, GORUNEN_DOSEME, KESIT_OLCU …);
       AutoCAD çıktısında ve ekrandaki renk / çizgi tipi / kalınlıkta örnek çizimlerin katmanı kullanılır. Sıra önemlidir: ilk uyan geçerlidir. null = eşleme yok. */
    esleme: [
      [/^PAFTA_PENCERE/, 'Defpoints'],
      [/(^|_)DOGRAMA_NO$/, 'YZ'],                         // kapı / pencere tip numarası (Çokal İdari: YZ katmanı)
      [/(^|_)DOGRAMA$/, 'Kapi_Pencere'],                  // doğrama çizgileri plan, kesit ve görünüşte (Çokal İdari: Kapi_Pencere, renk 23, 0,25)
      [/(^|_)ACIKLAMA_OKU$/, 'YZ'],                       // oklu açıklamanın oku (Çokal İdari: MULTILEADER YZ katmanında, yazısı Mim_Yazi25)
      [/^LENTO_YAZI$/, 'Yazi25'],                        // lento oklu açıklamasının yazısı (Çokal 6-Blower_R2: MTEXT Yazi25 "Lento" / "(20x20)"; oku YZ)
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
      [/^KESIT_CATI$/, 'Beton'],                            // kesilen çatı elemanları (makas / aşık / mertek, kaplama katmanları) kesilen eleman gibi kalın — kullanıcı 14.11.2026 ("kesitlerde çatı soluk")
      [/(^|_)(KAPI|PENCERE|CATI)$/, 'Ongor'],               // doğrama; arkada görünen çatı (GORUNEN_CATI): ince çizgi — KABUL
      [/^GORUNUS_.*_KESIT(_|$)/, 'Ongor'],                 // görünüşte (cephe) kesilen yok: çizgiler görünüş çizgisidir
      [/(^|_)KESIT(_|$)/, 'Beton'], [/(^|_)GORUNEN(_|$)/, 'Ongor'], [/(^|_)GIZLI(_|$)/, 'Arkagor'],
      [/^DETAY_BETON$/, 'Beton'],
      [/^(YAZI|YAZI_KAPAK|MAHAL_LISTESI|PAFTA_LISTESI)$/, 'Mim_Yazi25'], [/^MALZEME_ACILIM_YAZI$/, 'Yazi25'], [/^MALZEME_ACILIM$/, 'Mim_Yazi25'], [/^MAHAL_ADI$/, 'MAHAL İSİM'],
      /* plan: model elemanlarının kendi katmanları (planda kesilenler Beton, üstten görünenler Ongor) */
      [/^(INS_(PERDE|KOLON|DUVAR.*|TEMEL.*|PARAPET|AYAK_DUVARI)|BETON|DUVAR)$/, 'Beton'],
      [/^INS_(DOSEME|CATI_DOSEMESI|KIRIS|PENCERE|KAPI|CATI)$/, 'Ongor'], [/^RAMPA$/, 'Ongor'], /* rampa: KABUL */
    ],
    /* katman → izin verilen tarama desenleri (14.11.2026: örnekteki desenler; kesitTarama.malzeme ile aynı olmalı — test/cizim-karsilastir.test.js) */
    tarama: { 'Tarama': ['ANSI36', 'DASH', 'AR-SAND', 'ANSI31', 'AR-B816', 'SOLID'], 'Grobeton': ['AR-CONC'], 'Toprak': ['AR-SAND'], 'Su': ['ANSI31'], 'Solid': ['SOLID'], 'Ongor': ['ANSI31'], 'Kesit_Cizgisi': ['SOLID'], 'Kot': ['SOLID'], 'GNY': ['SOLID'] },
    /* örnekte karşılığı olmayan malzemelerin programdaki deseni (yalıtım ZIGZAG): denetimde hata değil uyarı */
    taramaKabul: { 'Tarama': ['ZIGZAG'] },
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
  /* ---------- ELEKTRİK (Çorlu AAT B-105 Bekçi Binası: E-BB 001/002/003; 15.11.2026'da ölçüldü — örnekler birbirini tutmadığı için
     kullanıcı kararıyla "kendin ayarla": en dolu pafta BB-002 esas, tek düzen; belge docs/cizim-kurallari/elektrik.md) ---------- */
  K.ELEKTRIK = {
    ad: 'Elektrik', belge: 'docs/cizim-kurallari/elektrik.md', birim: 'cm',
    olcekler: [50],
    katmanlar: {
      'EYAZI': { renk: 3, tip: 'Continuous', kal: 0.25, ne: 'Semboller, etiketler, linye no, tek hat şeması, yükleme cetveli, semboller listesi, notlar' },
      'EHAT': { renk: 4, tip: 'Continuous', kal: 0.35, ne: 'Aydınlatma ve priz linye hatları' },
      'TOPILET': { renk: 4, tip: 'HIDDEN', kal: 0.35, ne: 'Topraklama iletkeni (30x3,5 galvaniz şerit), temel topraklaması' },
      'TLF': { renk: 4, tip: 'DOT', kal: 0.25, ne: 'Telefon hattı' },
      'ETELYNG': { renk: 1, tip: 'DASHED', kal: 0.25, ne: 'Yangın alarm hattı' },
      'ANTET': { renk: 7, tip: 'Continuous', kal: 0.25, ne: 'Antet', serbest: true },
    },
    esAd: { 'ELKYAZI': 'EYAZI', 'ELK YAZI': 'EYAZI', 'E-YAZI': 'EYAZI', 'TLFPRIZ': 'EYAZI', 'YNGTLFYAZI': 'EYAZI', 'Topraklama': 'TOPILET' },
    kodluAile: /^$/,
    sistem: /^(0|Defpoints)$/i,
    baskaDisiplin: /^(INS_|Mim_|MT_|Mek_|MEK_)/,
    katmandan: true,
    yaziRenk: 2,                                           // örneklerde etiket ve tablo yazıları elle sarı
    yaziStilleri: { 'AAAA': { font: 'arial.ttf', gen: 1 }, 'elk': { font: 'romanstw.shx', gen: 0.85 } },
    /* yazı yükseklikleri (kâğıt mm) */
    yaziMm: { etiket: 2, linye: 2, cetvel: 2.06, tekHat: 2.16, tabloBaslik: 2.4, detay: 2.4, lejant: 3, not: 3, baslik: 4, kutuYazi: 1.44, harf: 2.5, harfKucuk: 1.6 }, // kutuYazi: TDK / FJB içi (BB-003 7,2 birim); harf: dedektör D 12,5 birim, O 8 birim
    yazi: { 'EYAZI': { stil: ['AAAA', 'elk'], mm: [2, 2.06, 2.16, 2.4, 3, 4] } },
    /* sembol ölçüleri (model cm, 1/50 — BB-002 semboller listesi) */
    sembol: { armaturKisa: 52, armaturUzun: 104, armaturEn: 6.7, armaturUc: 12.5, tabloW: 52, tabloH: 16.2, anahtarR: 8, prizR: 8.3, dedektorR: 10, kutu: 16 },
    /* linye hattının kalınlığı katmandan (EHAT 0,35): örnekte 2,5 cm genişlikli çoklu çizgi */
    /* şema / tablo çizgi kalınlıkları (1/100 mm): k çerçeve, i iç çizgi, b bara, t topraklama, h zemin çizgisi */
    semaKal: { k: 35, i: 18, b: 70, t: 35, h: 13 },
    /* PROGRAM KATMANI → ÇİZİM KATMANI (elektrik modülü doğrudan bu adlarla çizer) */
    esleme: [[/^EL_?YAZI$/i, 'EYAZI'], [/^EL_?HAT$/i, 'EHAT'], [/^EL_?TOP/i, 'TOPILET'], [/^EL_?TLF$/i, 'TLF'], [/^EL_?YNG$/i, 'ETELYNG']],
  };
  /* ÇİZGİ TİPİ ÖLÇEĞİ (saf): pafta penceresinde (1/vpOlcek) desen birimi başına model metresi — desen kâğıtta mm olarak görünür.
     Ekranda / SVG'de çizgi = desen × ölçek × (model m → kâğıt mm: 1000 / vpOlcek) = desen mm. */
  K.vpCizgiOlcegi = vpOlcek => (+vpOlcek || 50) / 1000;
  K.kagitDesen = (desen, vpOlcek) => desen.map(v => +(v * K.vpCizgiOlcegi(vpOlcek) * 1000 / (+vpOlcek || 50)).toFixed(6));
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
     Doğramalı duvarın yanında ikinci düşey sıra (net yükseklik) 25 cm (siraAraligi) içeride. yer.engelX: arkada görünen düşey çizgiler (kolon, kiriş kenarı);
     zincir bunların üstüne binmez. Dışarıda yalnız toplam boy ve toplam yükseklik kalır. mm: kâğıtta 1 mm'nin modeldeki boyu; yer: { icYatay, icDusey, siraAraligi, engelX }.
     Döner: [{ k: 'h' | 'v', a, b, p }] (kesit koordinatı [x, z]). */
  K.kesitIcOlculer = (halkalar, mm, yer) => {
    const B = []; for (const h of halkalar || []) { if (!h.pts || !h.pts.length) continue; let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const q of h.pts) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); } B.push({ lk: String(h.lk || ''), x0, x1, z0, z1 }); }
    const dos = B.filter(b => DOSEME.test(b.lk) && b.x1 - b.x0 >= 1.5), duv = B.filter(b => DUVAR.test(b.lk) && !DOSEME.test(b.lk));
    const birles = (v, tol) => { v.sort((a, b) => a[0] - b[0]); const o = []; for (const q of v) { const l = o[o.length - 1]; if (l && q[0] <= l[1] + tol) l[1] = Math.max(l[1], q[1]); else o.push(q.slice()); } return o; };
    const tek = v => { v.sort((a, b) => a - b); const o = []; for (const x of v) if (!o.length || x - o[o.length - 1] > 0.045) o.push(x); return o; };
    const Y = Object.assign({ icYatay: 25, icDusey: 20, sira: (yer && yer.siraAraligi) || 5 }, yer || {}), K2 = birles(dos.map(b => [b.z0, b.z1]), 0.02), out = [], e = mm || 0.05;
    for (let i = 1; i < K2.length; i++) { const zA = K2[i - 1][1], zB = K2[i][0], H = zB - zA; if (H < 1.2) continue; const zM = (zA + zB) / 2;
      /* kat aralığına giren her duvar sınırdır: pencereyle bölünen duvar da, kapının üstünde kalan lento parçası da */
      const W = birles(duv.filter(b => Math.min(b.z1, zB) - Math.max(b.z0, zA) > 0.005).map(b => [b.x0, b.x1]), 0.02); if (W.length < 2) continue;
      const X = tek(W.reduce((a, w) => a.concat(w), [])), xL = X[0], xR = X[X.length - 1];
      /* yatay zincir döşemeden icYatay mm yukarıda; kot / yazı şeridine (çizgi altı 1 mm, yazı üstü 3 mm) düşüyorsa 1 mm adımlarla yukarı */
      let yH = zA + Math.min(H * 0.5, Y.icYatay * e); for (let g = 0; g < 40 && yH < zA + H * 0.6; g++) { if (!(Y.engelK || []).some(b => b[2] > xL && b[0] < xR && b[3] > yH - e - 0.5 * e && b[1] < yH + 3 * e)) break; yH += e; }
      for (let j = 1; j < X.length; j++) out.push({ k: 'h', a: [X[j - 1], yH - e], b: [X[j], yH - e], p: [X[j - 1], yH] });
      for (let j = 1; j < W.length; j++) { const xA = W[j - 1][1], xB = W[j][0], L = xB - xA; if (L < 0.8) continue; const d = Math.min(L * 0.5, Y.icDusey * e); let tamam = false;
        const bos = (kenar, yuz, zA1, zB1) => { const o = []; for (const b of duv) if (Math.abs(b[kenar] - yuz) < 0.03) for (const z of [b.z0, b.z1]) if (z > zA1 + 0.05 && z < zB1 - 0.05) o.push(z); return o; };
        const sagda = !bos('x1', xA, zA, zB).length && bos('x0', xB, zA, zB).length > 0; /* boşluk (pencere / kapı) yalnız sağ duvardaysa zincir sağ duvarın yanına konur */
        /* Çokal R2 kesitleri (Blower A-A / B-B, İdari A-A): düşey ölçüler hacmin içinde, doğramalı duvarın yanında iki sıra, 25 cm (5 mm) arayla —
           duvara yakın sıra: alt döşeme · parapet · doğrama · lento · üst döşeme; içerideki sıra: net kat yüksekliği. Doğrama yoksa tek sıra.
           Hat arkada görünen kolon / kiriş / doğrama çizgisinin (engelX) üstüne binmez: duvardan içeri doğru ilk boş yere kayar (boş yer yoksa en az çizgi kesen yer). */
        const sg = sagda ? -1 : 1, x0V = sagda ? xB : xA, sira = Y.siraModel ? +Y.siraModel : (Y.sira || 5) * e, yazi = 2.5 * e; // sıra aralığı modelde 0,25 m (her ölçekte)
        const KB = (Y.engelK || []).filter(b => b[1] < zB); /* hacmin altındaki ve içindeki kot / yazı kutuları (zincir alttaki boşluğa da inebilir) */
        const vOnce = out.filter(q => q.k === 'v' && Math.min(q.a[1], q.b[1]) < zB - 1e-6 && Math.max(q.a[1], q.b[1]) > zA + 1e-6).map(q => q.p[0]); /* daha önce konan düşey zincirler (öbür hacim / kat): sıra aralığından yakına gelinmez */
        const carp = x => (Y.engelX || []).filter(q => q > x - yazi - e && q < x + 1.5 * e).length + 3 * KB.filter(b => b[2] > x - yazi - e && b[0] < x + 1.5 * e).length + 100 * vOnce.filter(q => Math.abs(q - x) < sira - 1e-6).length; /* ölçü çizgisi ve yazı şeridine düşen çizgi / kot / doğrama sayısı; başka zincirin üstü yasak */
        /* adaylar: duvardan içeri her 1 mm'de bir; önce en az çakışan, sonra duvara en yakın. Alt ve üst döşemesi olan ilk aday seçilir */
        const aday = []; for (let t = d; t + sira <= L - d + 1e-9; t += e) aday.push({ x: x0V + sg * t, c: carp(x0V + sg * t) + carp(x0V + sg * (t + sira)), t });
        aday.sort((p, q) => p.c - q.c || p.t - q.t); if (!aday.length) aday.push({ x: x0V + sg * Math.min(d, L * 0.5) });
        for (const { x: xV } of aday) { const ic = b => b.x0 <= xV && b.x1 >= xV;
          const alt = dos.filter(b => ic(b) && b.z1 <= zM).sort((p, q) => q.z1 - p.z1)[0], ust = dos.filter(b => ic(b) && b.z0 >= zM).sort((p, q) => p.z0 - q.z0)[0]; if (!alt || !ust) continue;
          const Z = [alt.z0, alt.z1, ust.z0]; if (i === K2.length - 1) Z.push(ust.z1); /* ara döşemenin kalınlığı yalnız üst katın zincirinde ölçülür (iki kez yazılmaz) */
          tamam = true;
          const Bz = sagda ? bos('x0', xB, alt.z1, ust.z0) : bos('x1', xA, alt.z1, ust.z0); Z.push(...Bz);
          const T = tek(Z); for (let q = 1; q < T.length; q++) out.push({ k: 'v', a: [xV + e, T[q - 1]], b: [xV + e, T[q]], p: [xV, T[q - 1]] });
          if (tek(Bz).length) { const x2 = xV + sg * sira; out.push({ k: 'v', a: [x2 + e, alt.z1], b: [x2 + e, ust.z0], p: [x2, alt.z1], sira: 2 }); } /* ikinci sıra: net yükseklik */
          break; }
        if (!tamam) out.eksikDusey = true; /* üstü açık hacim: düşey zincir kurulamadı → dıştaki düşey zincir kalır (kesit.js) */ } }
    return out;
  };
  /* KESİT TARAMASI (saf): programın kesit malzeme kodu (B, D, G, F, Y, T:tugla, TR:kap …) → kural tablosundaki tarama.
     Döner: { pat, ang, sc, ann, katman } · null = örnekte karşılığı yok (program kendi desenini kullanır) · undefined = kod tanınmıyor */
  K.kesitTaramaSec = (kural, mat) => {
    const T = kural && kural.kesitTarama; if (!T || !T.malzeme || !mat) return undefined;
    const ad = (T.kod || {})[mat]; if (!ad) return undefined;
    const m = T.malzeme[ad]; if (!m) return null;
    return { pat: m.desen, ang: m.aci || 0, sc: m.sc, ann: !m.gercek, katman: m.katman };
  };
  const KESIKLI = /^(HIDDEN|DASHED)$/;
  /* ÇIKTI EŞLEMESİ (saf): kayitlar = [{ st: { layer, color, lt, lw } }], katmanlar = { ad: { name, color, lt, lw, on, lock } }.
     Eşlenen her kaydın katmanı çizim katmanına çevrilir, renk / çizgi tipi / kalınlık katmandan alınır (karar 3); nesne elle kesikli çizgi tipi
     taşıyorsa Beton → Beton_Kesik, Ongor → Arkagor. Kullanılmayan eski katmanlar tablodan düşer. Döner: { eslenen, eslenmeyen: [ad…] } */
  K.ciktiUygula = (kural, kayitlar, katmanlar, o) => {
    let eslenen = 0; const yok = new Set(), kullanilan = new Set(['0']), TK = kural.tipKatman || {}, YK = kural.yazi || {};
    for (const r of kayitlar) { const st = r && r.st; if (!st) continue;
      const tip = (r.pr && r.pr.rol) || r.tip;                                                                       // rol: tek bir parçanın türü (ör. mahal listesi başlığı)
      let h = K.esle(kural, st.layer); if (h && tip && TK[tip] && kural.katmanlar[h]) h = TK[tip];
      const yazi = r.pr && r.pr.k === 'T';
      if (h && yazi) { const mm = o && o.mm ? o.mm(r) : null;
        if (tip === 'baslik' && mm != null && mm < 3.5) h = kural.yaziKatmani;                                   // başlığın altındaki ölçek satırı
        else if (kural.katmanlar[h] && !kural.katmanlar[h].serbest && !YK[h] && h !== kural.olcu.katman) h = kural.yaziKatmani; // çizgi katmanındaki yazı
        const yr = YK[h]; if (yr && yr.stil && !yr.stil.includes(r.pr.st)) r.pr = Object.assign({}, r.pr, { st: yr.stil[0] });
        if (yr && yr.mm && mm != null && mm < Math.min(...yr.mm) - 0.05) r.pr = Object.assign({}, r.pr, { h: r.pr.h * Math.min(...yr.mm) / mm }); }  // en küçük yazı boyunun altındaki etiketler o boya çıkarılır        // yazı stili kuraldaki stil
      if (h === 'Tarama' && r.kind === 'hatch' && r.e) { const ks = K.kesitTaramaSec(kural, r.e.smat);
        if (ks && ks.katman && kural.katmanlar[ks.katman]) h = ks.katman;                                                 // malzemenin örnekteki katmanı (dolgu → Toprak, grobeton → Grobeton)
        else if ((kural.tarama.Grobeton || []).includes(r.e.pat)) h = 'Grobeton'; }                                        // beton deseni (AR-CONC) grobeton katmanında
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

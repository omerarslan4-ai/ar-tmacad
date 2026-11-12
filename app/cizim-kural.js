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
    kot: { blok: 'CK_TR1', yasakBlok: ['KOT101'], katman: 'Kot' }, // karar 7
    /* katman → izin verilen tarama desenleri (karar 8: kesit taraması AR-SAND, DASH ya da SOLID; ANSI36 / ANSI31 kullanılmaz) */
    tarama: { 'Tarama': ['AR-SAND', 'DASH', 'SOLID'], 'Grobeton': ['AR-CONC'], 'Su': ['ANSI31'], 'Solid': ['SOLID'], 'Ongor': ['ANSI31'], 'Kesit_Cizgisi': ['SOLID'], 'Kot': ['SOLID'], 'GNY': ['SOLID'] },
  };
  K.disiplin = ad => K[String(ad || '').toLocaleUpperCase('en').replace('İ', 'I')] || null;
  /* katmanın kuralı; yoksa null. es: eski ad verildiyse standart adı da döner */
  K.katman = (kural, ad) => kural.katmanlar[ad] || null;
})(typeof window !== 'undefined' ? window.C : (globalThis.C = globalThis.C || {}));

/* ArıtmaCAD — MEKANİK TESİSAT · VERİ TABLOLARI
   İller (TS 825:2024 derece gün bölgesi 1–6, TS 2164 kış dış hesap sıcaklığı), malzeme kütüphanesi (λ, μ), hazır yapı elemanı
   katmanlaşmaları, mahal tipleri (iç sıcaklık), TS 825:2024 tavsiye U değerleri ve yıllık net enerji sınırları, artırım tabloları.
   Değerlerin hepsi Mekanik Tesisat panelinden değiştirilebilir; burası yalnız başlangıç değerleridir. */
(function (C) {
  'use strict';
  const V = C.MTV = {};

  /* [il, TS 825:2024 bölge, kış dış hesap sıcaklığı °C (TS 2164 / MMO)] */
  V.ILLER = [
    ['Adana', 1, 0], ['Adıyaman', 2, -9], ['Afyonkarahisar', 4, -12], ['Ağrı', 6, -24], ['Aksaray', 4, -15], ['Amasya', 4, -12], ['Ankara', 4, -12], ['Antalya', 1, 3],
    ['Ardahan', 6, -27], ['Artvin', 4, -3], ['Aydın', 2, -3], ['Balıkesir', 3, -3], ['Bartın', 4, -3], ['Batman', 2, -9], ['Bayburt', 5, -18], ['Bilecik', 4, -9],
    ['Bingöl', 4, -18], ['Bitlis', 5, -15], ['Bolu', 4, -15], ['Burdur', 4, -9], ['Bursa', 3, -6], ['Çanakkale', 3, -3], ['Çankırı', 4, -15], ['Çorum', 4, -15],
    ['Denizli', 2, -6], ['Diyarbakır', 4, -9], ['Düzce', 4, -9], ['Edirne', 4, -9], ['Elazığ', 4, -12], ['Erzincan', 4, -18], ['Erzurum', 6, -21], ['Eskişehir', 4, -12],
    ['Gaziantep', 2, -9], ['Giresun', 3, -3], ['Gümüşhane', 5, -12], ['Hakkari', 5, -24], ['Hatay', 2, 0], ['Iğdır', 4, -18], ['Isparta', 4, -9], ['İstanbul', 3, -3],
    ['İzmir', 2, 0], ['Kahramanmaraş', 2, -9], ['Karabük', 4, -12], ['Karaman', 4, -12], ['Kars', 6, -27], ['Kastamonu', 5, -12], ['Kayseri', 4, -15], ['Kırıkkale', 4, -12],
    ['Kırklareli', 4, -9], ['Kırşehir', 4, -12], ['Kilis', 2, -6], ['Kocaeli', 3, -3], ['Konya', 4, -12], ['Kütahya', 4, -12], ['Malatya', 4, -12], ['Manisa', 2, -3],
    ['Mardin', 2, -6], ['Mersin', 1, 3], ['Muğla', 3, -3], ['Muş', 5, -18], ['Nevşehir', 4, -15], ['Niğde', 4, -15], ['Ordu', 3, -3], ['Osmaniye', 2, 0],
    ['Rize', 3, -3], ['Sakarya', 3, -3], ['Samsun', 3, -3], ['Siirt', 2, -9], ['Sinop', 3, -3], ['Sivas', 5, -18], ['Şanlıurfa', 2, -6], ['Şırnak', 4, -6],
    ['Tekirdağ', 3, -6], ['Tokat', 4, -15], ['Trabzon', 3, -3], ['Tunceli', 4, -18], ['Uşak', 4, -9], ['Van', 5, -15], ['Yalova', 3, -3], ['Yozgat', 5, -15], ['Zonguldak', 3, -3],
  ];
  /* il merkezinden farklı bölgedeki ilçeler (TS 825:2024) */
  V.ILCE = { 1: 'Datça, Marmaris, Bodrum, Milas, Dalaman (Muğla); Samandağ, İskenderun, Dörtyol (Hatay)', 2: 'Ceyhan (Adana); Mut (Mersin); Cizre (Şırnak); Edremit (Balıkesir); Köyceğiz, Yatağan, Fethiye (Muğla); Ergani, Çermik (Diyarbakır)', 3: 'Hopa (Artvin); İpsala (Edirne); Çeşme, Bergama, Dikili, Selçuk, Seferihisar (İzmir); İnebolu, Cide, Bozkurt (Kastamonu); Kuşadası (Aydın); Akçakoca (Düzce); Amasra (Bartın)', 4: 'Elmalı, Korkuteli (Antalya); Güney, Acıpayam (Denizli); Boyabat (Sinop); Malkara, Çorlu (Tekirdağ); Afşin, Elbistan (K.Maraş); Divriği, Suşehri (Sivas); Tosya (Kastamonu); Dursunbey (Balıkesir)', 5: 'Doğubeyazıt (Ağrı); Çerkeş (Çankırı); Oltu, Tortum, İspir (Erzurum); Pınarbaşı, Sarız, Tomarza (Kayseri); Keles (Bursa); Kızılcahamam (Ankara); Karakoçan (Elazığ); Solhan (Bingöl); Tercan (Erzincan); Şebinkarahisar (Giresun); Göksun (K.Maraş); Ulukışla (Niğde)', 6: 'Uludağ (Bursa); Başkale, Özalp (Van)' };
  V.BOLGE_AD = ['', 'Çok sıcak', 'Sıcak', 'Ilıman', 'Soğuk', 'Çok soğuk', 'Aşırı soğuk'];

  /* TS 825:2024 — tavsiye edilen en büyük U değerleri [W/m²K]: duvar, tavan/çatı, taban/döşeme, pencere; cam oranı ≥ %60 için ayrı */
  V.U825 = { 1: [0.45, 0.35, 0.40, 1.8], 2: [0.40, 0.30, 0.35, 1.8], 3: [0.40, 0.30, 0.35, 1.8], 4: [0.35, 0.25, 0.30, 1.8], 5: [0.25, 0.20, 0.25, 1.8], 6: [0.25, 0.20, 0.25, 1.8] };
  V.U825CAM = { 1: [0.34, 0.26, 0.30, 1.6], 2: [0.30, 0.23, 0.26, 1.6], 3: [0.30, 0.23, 0.26, 1.6], 4: [0.26, 0.19, 0.23, 1.6], 5: [0.19, 0.15, 0.19, 1.6], 6: [0.19, 0.15, 0.19, 1.6] };
  /* TS 825:2024 — yıllık net ısıtma + soğutma enerjisi sınırı [kWh/m²·yıl], bölge 1…6; iç sıcaklık ve iç kazanç (W/m²) kabulleri */
  V.BINA = [
    ['Müstakil konut', [80, 80, 80, 80, 85, 90], 19, 5], ['Apartman', [70, 70, 70, 70, 75, 80], 19, 5], ['Ofis, büro, idari bina', [70, 70, 70, 70, 70, 70], 19, 5],
    ['Eğitim ve öğretim binası', [50, 50, 50, 50, 60, 70], 20, 5], ['Hastane', [60, 60, 60, 60, 75, 90], 22, 5], ['Restoran, lokanta', [70, 70, 70, 70, 70, 70], 20, 10],
    ['Konaklama (otel, motel)', [70, 70, 70, 70, 75, 80], 20, 5], ['Ticari bina (AVM vb.)', [60, 60, 60, 60, 65, 80], 20, 10], ['İbadethane, spor tesisi', [50, 50, 50, 50, 60, 70], 18, 5],
    ['Toplanma amaçlı bina', [70, 70, 70, 70, 75, 80], 20, 5], ['Endüstriyel bina (imalathane, atölye)', [70, 70, 70, 70, 70, 70], 16, 10], ['Depo', [60, 60, 60, 60, 65, 80], 16, 5],
  ];
  /* aylık ortalama dış sıcaklık [°C] — bölgesel TS 825 tablosu (ön hesap); 2024 bölgeleri bu dört iklim sütununa eşlenir */
  V.AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  V.GUN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  V.TAY = { A: [8.4, 9.0, 11.6, 15.8, 21.2, 26.3, 28.7, 27.6, 23.5, 18.5, 13.0, 9.3], B: [2.9, 4.4, 7.3, 12.8, 18.0, 22.5, 24.9, 24.3, 19.9, 14.1, 8.5, 3.8], C: [-0.3, 0.1, 4.1, 10.1, 14.4, 18.5, 21.7, 21.2, 17.2, 11.6, 5.6, 1.3], D: [-5.4, -4.7, 0.3, 7.9, 12.8, 17.3, 21.4, 21.1, 16.5, 10.3, 3.1, -2.8] };
  V.TAY_ESLE = { 1: 'A', 2: 'A', 3: 'B', 4: 'C', 5: 'D', 6: 'D' };
  /* aylık ortalama güneş ışınımı [W/m²] düşey yüzey (TS 825) */
  V.GUNES = { G: [72, 84, 87, 90, 92, 95, 93, 93, 89, 82, 67, 64], K: [26, 37, 52, 66, 79, 83, 81, 73, 57, 40, 27, 22], DB: [43, 57, 77, 90, 114, 122, 118, 106, 81, 59, 41, 37] };

  /* malzeme: [ad, λ W/mK, μ (su buharı difüzyon direnç faktörü), grup] */
  V.MALZ = {
    sivaIc: ['İç sıva (kireç-çimento)', 0.87, 15, 'Sıva'], sivaAlci: ['Alçı sıva', 0.51, 10, 'Sıva'], sivaDis: ['Dış sıva (çimento)', 1.40, 25, 'Sıva'], sivaYal: ['Mantolama sıvası + file', 0.87, 20, 'Sıva'],
    beton: ['Betonarme', 2.50, 100, 'Beton'], grobeton: ['Grobeton / donatısız beton', 1.65, 70, 'Beton'], sap: ['Şap (çimento)', 1.40, 25, 'Beton'], hafifbeton: ['Hafif beton (1000 kg/m³)', 0.38, 10, 'Beton'],
    tugla: ['Yatay delikli tuğla', 0.45, 7, 'Duvar'], tuglaD: ['Düşey delikli tuğla (W sınıfı)', 0.32, 7, 'Duvar'], tuglaDolu: ['Dolu tuğla', 0.81, 8, 'Duvar'],
    gazbeton: ['Gazbeton (G2, 400 kg/m³)', 0.13, 7, 'Duvar'], gazbeton5: ['Gazbeton (G3, 500 kg/m³)', 0.16, 7, 'Duvar'], briket: ['Briket (boşluklu beton blok)', 0.92, 8, 'Duvar'], bims: ['Bims blok', 0.22, 7, 'Duvar'],
    eps: ['EPS levha (λ 0,040)', 0.040, 40, 'Yalıtım'], eps35: ['Karbonlu EPS (λ 0,032)', 0.032, 40, 'Yalıtım'], xps: ['XPS levha (λ 0,035)', 0.035, 150, 'Yalıtım'],
    tasyunu: ['Taş yünü (λ 0,040)', 0.040, 1, 'Yalıtım'], tasyunu35: ['Taş yünü (λ 0,035)', 0.035, 1, 'Yalıtım'], camyunu: ['Cam yünü (λ 0,040)', 0.040, 1, 'Yalıtım'], pur: ['Poliüretan / PIR (λ 0,025)', 0.025, 80, 'Yalıtım'],
    karo: ['Seramik / karo', 1.30, 100, 'Kaplama'], parke: ['Ahşap parke', 0.20, 50, 'Kaplama'], laminat: ['Laminat + şilte', 0.13, 50, 'Kaplama'], mermer: ['Mermer / doğal taş', 3.50, 200, 'Kaplama'],
    membran: ['Bitümlü su yalıtım örtüsü', 0.19, 20000, 'Örtü'], buharkesici: ['Buhar kesici (PE folyo)', 0.40, 100000, 'Örtü'], buharkesiciAlu: ['Alüminyum folyolu bitümlü buhar kesici', 0.19, 500000, 'Örtü'], kiremit: ['Kiremit + havalandırılan boşluk', 1.0, 1, 'Örtü'],
    cakil: ['Çakıl / koruma tabakası', 0.70, 3, 'Dolgu'], blokaj: ['Blokaj / kırmataş dolgu', 0.70, 3, 'Dolgu'], alcipan: ['Alçı levha', 0.25, 8, 'Kaplama'], ahsap: ['Ahşap (çam)', 0.13, 40, 'Kaplama'], celik: ['Çelik sac', 50, 1e6, 'Metal'], hava: ['Durgun hava boşluğu (R=0,17)', 0.12, 1, 'Dolgu'],
  };
  /* yüzey dirençleri (TS EN ISO 6946) Rsi, Rse [m²K/W] — ısı akış yönüne göre */
  V.RS = { duvar: [0.13, 0.04], tavan: [0.10, 0.04], taban: [0.17, 0.04], toprak: [0.17, 0], icduvar: [0.13, 0.13], aradoseme: [0.17, 0.17], icTavan: [0.10, 0.10] };

  const ly = (m, cm) => ({ m, d: cm / 100 });
  /* yapı elemanı tipleri: tur = dduvar | iduvar | taban | tavan | aradoseme | pencere | kapi ; katman sırası İÇTEN DIŞA */
  V.yapiVarsayilan = bolge => {
    const yal = [0, 7, 8, 8, 10, 14, 14][bolge] || 8, yalC = [0, 10, 12, 12, 15, 18, 18][bolge] || 12, yalT = [0, 7, 9, 9, 10, 13, 13][bolge] || 10;
    return {
      DD_tugla: { ad: 'Dış duvar — tuğla + mantolama', tur: 'dduvar', kat: [ly('sivaIc', 2), ly('tugla', 19), ly('eps', yal), ly('sivaYal', 0.8)] },
      DD_gazbeton: { ad: 'Dış duvar — gazbeton + mantolama', tur: 'dduvar', kat: [ly('sivaIc', 2), ly('gazbeton', 20), ly('eps', Math.max(3, yal - 4)), ly('sivaYal', 0.8)] },
      DD_beton: { ad: 'Dış duvar — betonarme perde / kolon-kiriş + mantolama', tur: 'dduvar', kat: [ly('sivaIc', 2), ly('beton', 25), ly('eps', yal + 1), ly('sivaYal', 0.8)] },
      DD_briket: { ad: 'Dış duvar — briket + mantolama', tur: 'dduvar', kat: [ly('sivaIc', 2), ly('briket', 19), ly('eps', yal + 1), ly('sivaYal', 0.8)] },
      ID_tugla: { ad: 'İç duvar — tuğla', tur: 'iduvar', kat: [ly('sivaIc', 2), ly('tugla', 13.5), ly('sivaIc', 2)] },
      ID_beton: { ad: 'İç duvar — betonarme', tur: 'iduvar', kat: [ly('sivaIc', 2), ly('beton', 25), ly('sivaIc', 2)] },
      ID_gazbeton: { ad: 'İç duvar — gazbeton', tur: 'iduvar', kat: [ly('sivaIc', 2), ly('gazbeton', 10), ly('sivaIc', 2)] },
      TB_toprak: { ad: 'Toprağa oturan döşeme', tur: 'taban', kat: [ly('karo', 1), ly('sap', 5), ly('xps', yalT), ly('membran', 0.4), ly('beton', 15), ly('grobeton', 10), ly('blokaj', 15)] },
      TV_teras: { ad: 'Teras çatı (üstü açık)', tur: 'tavan', kat: [ly('sivaIc', 2), ly('beton', 15), ly('buharkesiciAlu', 0.3), ly('xps', yalC), ly('membran', 0.8), ly('sap', 4), ly('cakil', 5)] },
      TV_cati: { ad: 'Çatı arası döşemesi (üstü kırma çatı)', tur: 'tavan', kat: [ly('sivaIc', 2), ly('beton', 15), ly('buharkesici', 0.02), ly('tasyunu', yalC + 2)] },
      AD_normal: { ad: 'Ara kat döşemesi', tur: 'aradoseme', kat: [ly('karo', 1), ly('sap', 5), ly('beton', 15), ly('sivaIc', 2)] },
      AD_yalitimli: { ad: 'Isıtılmayan hacim üstü döşeme (yalıtımlı)', tur: 'aradoseme', kat: [ly('karo', 1), ly('sap', 5), ly('beton', 15), ly('tasyunu', yalT + 2), ly('sivaYal', 0.8)] },
      PN_pvc: { ad: 'Pencere — PVC, ısıcam Low-E 4+16+4 (argon)', tur: 'pencere', U: 1.6, g: 0.50, a: 2.0 },
      PN_pvc3: { ad: 'Pencere — PVC, üçlü cam 4+12+4+12+4 Low-E', tur: 'pencere', U: 1.1, g: 0.45, a: 2.0 },
      PN_alu: { ad: 'Pencere — ısı yalıtımlı alüminyum, Low-E çift cam', tur: 'pencere', U: 1.8, g: 0.50, a: 1.5 },
      PN_eski: { ad: 'Pencere — PVC, normal çift cam 4+12+4', tur: 'pencere', U: 2.8, g: 0.75, a: 2.5 },
      KP_dis: { ad: 'Dış kapı — yalıtımlı çelik / PVC', tur: 'kapi', U: 2.0, a: 3.0 },
      KP_cam: { ad: 'Dış kapı — camlı (alüminyum doğrama)', tur: 'kapi', U: 2.4, a: 3.0, g: 0.5 },
      KP_ic: { ad: 'İç kapı — ahşap', tur: 'kapi', U: 2.0, a: 0 },
      KP_seksiyonel: { ad: 'Seksiyonel kapı (40 mm PU panel)', tur: 'kapi', U: 1.2, a: 4.0 },
    };
  };

  /* mahal tipleri: [ad, iç sıcaklık °C (TS 2164 / MMO), ısıtılıyor mu, ad eşleme anahtarları] */
  V.MAHAL = [
    ['Büro / ofis', 20, 1, 'büro ofis müdür şef sekreter idari memur muhasebe personel mühendis'], ['Toplantı / konferans', 20, 1, 'toplantı konferans seminer eğitim sınıf derslik'], ['Oturma / yaşama', 22, 1, 'salon oturma yaşama dinlenme misafir'],
    ['Yatak odası', 20, 1, 'yatak'], ['Yemekhane / kafeterya', 20, 1, 'yemek kafeterya kantin lokanta'], ['Mutfak', 18, 1, 'mutfak çay ocağı ofisi'], ['Banyo / duş', 24, 1, 'banyo duş'],
    ['WC / lavabo', 18, 1, 'wc tuvalet lavabo'], ['Soyunma', 22, 1, 'soyunma giyinme'], ['Koridor / hol', 18, 1, 'koridor hol antre giriş lobi bekleme danışma'], ['Merdiven', 15, 1, 'merdiven sahanlık'],
    ['Laboratuvar', 20, 1, 'laboratuvar lab'], ['Kontrol / kumanda odası', 20, 1, 'kontrol kumanda scada otomasyon'], ['Atölye', 18, 1, 'atölye bakım tamir'], ['Depo / arşiv', 10, 1, 'depo arşiv ambar malzeme'],
    ['Teknik hacim (MCC, pano, kazan dairesi)', 10, 1, 'mcc pano elektrik kazan teknik mekanik'], ['Isıtılmayan hacim', null, 0, 'ısıtılmayan garaj otopark sığınak şaft asansör'],
    /* arıtma tesisi / terfi yapıları (sıra değişmez: mahal.tip bu sıraya bağlıdır) */
    ['Pompa odası (kuru hazne)', 10, 1, 'pompa terfi kuru hazne'], ['Islak hazne', null, 0, 'ıslak emme haznesi'], ['Blower / kompresör odası', 10, 1, 'blower kompresör üfleyici'], ['Kimyasal / klor / dozaj odası', 15, 1, 'klor kimyasal dozaj polimer'],
    ['Jeneratör odası', 10, 1, 'jeneratör'], ['Trafo / OG hücre odası', 10, 1, 'trafo hücre'], ['Çamur susuzlaştırma binası', 15, 1, 'susuzlaştırma dekantör çamur'], ['Izgara / ön arıtma binası', 10, 1, 'ızgara tutucu arıtma'],
  ];
  V.mahalTipBul = ad => { const s = String(ad || '').toLocaleLowerCase('tr'); if (!s) return 0; let best = -1, bl = 0; V.MAHAL.forEach((m, i) => { for (const k of m[3].split(' ')) if (k && s.includes(k) && k.length > bl) { best = i; bl = k.length; } }); return best < 0 ? 0 : best; };

  /* TS 2164 / MMO ısı kaybı artırımları */
  V.ZD = { sinir: [0.30, 0.70, 1.50], 1: [7, 7, 7, 7], 2: [20, 15, 15, 15], 3: [30, 25, 20, 15] }; // D [W/m²K] aralığına göre %; işletme I / II / III
  V.ISLETME = ['', 'I — sürekli işletme (gece yalnız sıcaklık düşürme)', 'II — günde 9–12 saat kesintili işletme', 'III — günde 12–16 saat kesintili işletme'];
  V.ZH = { G: -5, GB: -5, B: 0, KB: 5, K: 5, KD: 5, D: 0, GD: -5 };
  V.YON8 = ['D', 'KD', 'K', 'KB', 'B', 'GB', 'G', 'GD']; // açı 0° = doğu, saat yönü tersine 45° adım
  V.YON_AD = { D: 'Doğu', KD: 'Kuzeydoğu', K: 'Kuzey', KB: 'Kuzeybatı', B: 'Batı', GB: 'Güneybatı', G: 'Güney', GD: 'Güneydoğu' };
  /* bina durum katsayısı H [Wh/m³K] — [bitişik nizam, ayrık nizam]; kcal tablosunun (0,24 / 0,34 …) 1,163 ile W karşılığı */
  V.HKAT = { normal: { korunmus: [0.28, 0.40], serbest: [0.48, 0.67], cokserbest: [0.70, 0.98] }, ruzgarli: { korunmus: [0.48, 0.67], serbest: [0.70, 0.98], cokserbest: [0.95, 1.31] } };
  V.KONUM = { korunmus: 'Korunmuş (sık yapılaşma içinde)', serbest: 'Serbest (ayrık, açık alanda)', cokserbest: 'Çok serbest (tepe, kıyı, yüksek bina)' };
  /* toprak ve ısıtılmayan hacim sıcaklık kabulleri */
  V.toprakT = td => Math.round(Math.max(0, Math.min(12, 9 + td / 2)));
  V.isitilmayanT = td => Math.round(Math.max(-6, Math.min(12, 6 + td / 2)));
})(typeof window !== 'undefined' ? (window.C = window.C || {}) : (globalThis.C = globalThis.C || {}));

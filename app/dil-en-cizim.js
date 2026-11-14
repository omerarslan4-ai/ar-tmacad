/* ArıtmaCAD — İngilizce sözlük: ÇİZİM ve PAFTA yazıları (bütün disiplinler)
   Proje dili İngilizce iken (DIL EN / C.setLang('en')) paftalarda Türkçe kalan yazıların karşılıkları:
   mimari (görünüş adları, kot adları, malzeme ve doğrama yazıları), statik (donatı etiketleri, pafta başlıkları,
   satırlara bölünmüş GENEL NOTLAR), mekanik (ısı yalıtım detayı, cihaz / armatür listeleri, sıhhi tesisat notları),
   proses ve saha (kot adları, su kotu, savak / kapak etiketleri).
   - Biçim app/dil-en.js ile aynıdır: DIL.ekle('en', 'English', [[türkçe, english], …]); '#' sayı yer tutucusudur
     ({1} {2} … ile sırası değiştirilebilir). Çizim çevirisi (C.txL, app/mimari.js) bu tablodaki düz ifadeleri satır içinde,
     '#' kalıplarını yalnız satırın tamamı eşleşince kullanır; statik penceresi (DIL.t) ikisini de satır içinde kullanır.
   - Virgüllü poz listeleri ("101,102 Ø12/25 dış yatay") '#' kalıbıyla çevrilir: sayı aynen korunur (C.txL'in ondalık
     virgül → nokta dönüşümü poz listesini "101.102" yapmasın diye).
   - Karışık harfli karşılıklar büyük harfli kaynakta BÜYÜK, küçük harfli kaynakta olduğu gibi yazılsın diye sözlük sırası
     düzenlenir (büyük harf anahtar önce): yoksa "Sehpa Donatısı" çizimde "CHAIR BAR" çıkıyordu.
   Yeni çizim yazısı eklerken karşılığını buraya (ya da app/dil-en.js'e) ekleyin. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.DIL) return;
  const DIL = window.DIL;
  const C = [
    /* ---------- pafta / genel ---------- */
    ['DSİ', 'DSI'], ['ATIKSU ARITMA TESİSİ', 'WASTEWATER TREATMENT PLANT'], ['İÇMESUYU ARITMA TESİSİ', 'WATER TREATMENT PLANT'],
    ['MİM-#', 'ARC-#'], ['MİMARİ-', 'ARCHITECTURAL-'], ['ÖLÇEKSİZ', 'NOT TO SCALE'], ['ölçeksiz — ölçüler cm', 'not to scale — dimensions in cm'],
    ['Ö: ölçeksiz', 'S: NTS'], ['Ö: #/#', 'S: #/#'], ['Ö:#/#', 'S:#/#'], ['(#/#) #Ø# · Ö:#/#', '(#/#) #Ø# · S:#/#'],
    ['devamı yandaki tabloda →', 'continued in the adjacent table →'], ['DETAYI', 'DETAIL'], ['DETAYLARI', 'DETAILS'],
    ['ARKA GÖRÜNÜŞ', 'REAR ELEVATION'], ['ÖN GÖRÜNÜŞ', 'FRONT ELEVATION'], ['SOL YAN GÖRÜNÜŞ', 'LEFT SIDE ELEVATION'], ['SAĞ YAN GÖRÜNÜŞ', 'RIGHT SIDE ELEVATION'],
    ['İÇ GÖRÜNÜŞ', 'INTERIOR ELEVATION'], ['DIŞ GÖRÜNÜŞ', 'EXTERIOR ELEVATION'],
    /* ---------- kot / seviye adları (kesit, görünüş, plan kot yazıları) ---------- */
    ['ZEMİN KAT', 'GROUND FLOOR'], ['ZEMİN ±#', 'GROUND FLOOR ±#'], ['ZEMİN  ±#', 'GROUND FLOOR  ±#'], ['ZEMİN  ±#  (#)', 'GROUND FLOOR  ±#  (#)'],
    ['ZEMİN #', 'GROUND FLOOR #'], ['ZEMİN  #', 'GROUND FLOOR  #'], ['ZEMİN  #  (#)', 'GROUND FLOOR  #  (#)'],
    ['BODRUM KAT', 'BASEMENT'], ['ÇATI KATI', 'ROOF FLOOR'], ['ARA KAT', 'MEZZANINE'], ['BİRİNCİ KAT', 'FIRST FLOOR'],
    ['TOPRAK KOTU', 'GROUND LEVEL'], ['TABİİ ZEMİN', 'NATURAL GROUND'], ['TEMEL ALTI', 'BOTTOM OF FOUNDATION'], ['TEMEL ÜSTÜ', 'TOP OF FOUNDATION'],
    ['ISLAK HACİM TABANI', 'WET WELL FLOOR'], ['ISLAK HACİM', 'WET WELL'], ['KURU HACİM', 'DRY WELL'], ['HAZNE TABANI', 'SUMP FLOOR'], ['KANAL TABANI', 'CHANNEL INVERT'],
    ['FİLTRE DÖŞEMESİ', 'FILTER FLOOR'], ['BİNA ZEMİNİ', 'BUILDING FLOOR'], ['ÜST DÖŞEME', 'TOP SLAB'], ['HAVUZ TABANI', 'TANK FLOOR'], ['DUVAR ÜSTÜ', 'TOP OF WALL'],
    ['POMPA HOLÜ', 'PUMP HALL'], ['MONTAJ HOLÜ', 'ASSEMBLY HALL'], ['HOLÜ', 'HALL'], ['VANA ODASI', 'VALVE CHAMBER'], ['ELEKTRİK ODASI', 'ELECTRICAL ROOM'],
    ['ATIKSU (HAM)', 'RAW WASTEWATER'], ['S.K.', 'W.L.'], ['RAS girişi', 'RAS inlet'], ['Orifis', 'Orifice'], ['Yürüyüş yolu', 'Walkway'], ['Ağız', 'Opening'],
    ['duvar üstü', 'top of wall'], ['taban', 'bottom', 'satir'], ['taban kotu', 'base level'], ['taban kotu #', 'base level #'], ['· su', '· water'], ['aktüatörlü', 'actuated'], ['halka', 'ring', 'satir'], ['# halka', '# rings', 'ic'], ['koridor', 'corridor'], ['mikser', 'mixer'],
    ['Yavaş devirli', 'low-speed'], ['ANAEROBİK HAVUZ', 'ANAEROBIC TANK'], ['HAVALANDIRMA HAVUZU', 'AERATION TANK'], ['ÇÖKELTİM HAVUZU', 'SEDIMENTATION TANK'], ['ÇÖKELTME HAVUZU', 'SEDIMENTATION TANK'],
    /* ---------- mimari: malzeme, doğrama, çatı, merdiven ---------- */
    ['MERDİVEN', 'STAIRS'], ['YUKARI', 'UP'], ['AŞAĞI', 'DOWN'], ['TEK KANATLI', 'SINGLE LEAF'], ['ÇİFT KANATLI', 'DOUBLE LEAF'], ['ARA BİRLEŞTİRME', 'INTERMEDIATE JOINT'],
    ['TUĞLA DUVAR', 'BRICK WALL'], ['BRİKET DUVAR', 'CONCRETE BLOCK WALL'], ['GAZBETON DUVAR', 'AERATED CONCRETE BLOCK WALL'], ['duvar', 'wall'], ['tuğla', 'brick'],
    ['MOZAİK KARO', 'TERRAZZO TILE'], ['MOZAIK KARO', 'TERRAZZO TILE'], ['SERAMİK YER KAROSU', 'CERAMIC FLOOR TILE'], ['SERAMIK YER KAROSU', 'CERAMIC FLOOR TILE'],
    ['DONATILI ZEMİN BETONU (hasırlı)', 'REINFORCED GROUND SLAB (MESH)'], ['DONATILI ZEMİN BETONU', 'REINFORCED GROUND SLAB'],
    ['Döşeme / Zemin kaplaması', 'Floor finish'], ['Kaplama Tahtası', 'Roof boarding'], ['Kuşaklama', 'Horizontal bracing'],
    ['Kırma mertek', 'Hip rafter'], ['Duvar aşığı', 'Wall plate'], ['Mahya aşığı', 'Ridge purlin'], ['Yağmur borusu', 'Downpipe'], ['Yağmur oluğu', 'Rain gutter'],
    ['SÖVE DÖNÜŞÜ', 'REVEAL RETURN'], ['DENİZLİK', 'SILL'],
    ['KABA + İNCE SIVA (kireç-çimento)', 'BASE + FINISH PLASTER (lime-cement)'], ['TAVAN SIVASI (alçı)', 'CEILING PLASTER (gypsum)'], ['TAVAN SIVASI', 'CEILING PLASTER'],
    ['EPS (karbon katkılı) ISI YALITIM', 'EPS (graphite-enhanced) THERMAL INSULATION'], ['polyester keçe)', 'polyester felt)'], ['polyester keçe', 'polyester felt'], ['Alaturka Geniş', 'Squat WC, wide'], ['Alaturka', 'Squat WC'],
    ['KAPAK KENAR DETAYI (1-1, TÜM TİPLER)', 'COVER PLATE EDGE DETAIL (1-1, ALL TYPES)'], ['SK# KAPAĞI PLANI (#×#)', 'SK# COVER PLATE PLAN (#×#)'],
    ['8/10 mm baklavalı DKP sac kapak', '8/10 mm chequered steel plate cover'], ['sıcak daldırma galvaniz (min. # µm)', 'hot-dip galvanized (min. # µm)'],
    ['kenar ve ara takviye', 'edge and intermediate stiffeners'], ['galvaniz çerçeve (betona gömülü)', 'galvanized frame (cast in concrete)'], ['(çerçeveye kaynaklı)', '(welded to frame)'],
    ['Paslanmaz menteşe (gömme)', 'Stainless steel hinge (concealed)'], ['lama ankraj', 'flat bar anchor'],
    ['SICAK DALDIRMA GALVANİZ ÇELİK', 'HOT-DIP GALVANIZED STEEL'], ['net geçiş', 'clear opening'], ['Eğim %#', 'Slope #%'], ['eğim %#', 'slope #%'], ['eğim', 'slope'],
    /* ---------- statik: pafta ve çizim başlıkları ---------- */
    ['# KOTU DÖŞEME DONATI PLANI', 'SLAB REINFORCEMENT PLAN AT LEVEL #'], ['# KOTU D# DÖŞEME DONATI PLANI', 'SLAB D{2} REINFORCEMENT PLAN AT LEVEL {1}'],
    ['# KOTU KİRİŞ VE DÖŞEME DONATI PERSPEKTİFİ', 'BEAM AND SLAB REINFORCEMENT PERSPECTIVE AT LEVEL #'], ['# KOTU TEMEL DONATI DETAYI', 'FOUNDATION REINFORCEMENT DETAIL AT LEVEL #'],
    ['# KOTU TEMEL DONATI DETAYI (#/#)', 'FOUNDATION REINFORCEMENT DETAIL AT LEVEL {1} ({2}/{3})'], ['# ve # KOTLARI KALIP PLANI', 'FORMWORK PLAN AT LEVELS # AND #'],
    ['# – # PERDE DONATI DETAYI', 'WALL REINFORCEMENT DETAIL (# – #)'], ['KOTU TEMEL DONATI DETAYI', 'LEVEL FOUNDATION REINFORCEMENT DETAIL'], ['KOTU', 'LEVEL'], ['KOTLARI', 'LEVELS'],
    ['KALIP PLANI', 'FORMWORK PLAN'], ['KESİTLER', 'SECTIONS'], ['KİRİŞ', 'BEAM'], ['KOLONLARI', 'COLUMNS'],
    ['DÖŞEME DONATI DETAYI', 'SLAB REINFORCEMENT DETAIL'], ['DÖŞEME DONATI METRAJI', 'SLAB REINFORCEMENT SCHEDULE'], ['PERDE DONATI DETAYI', 'WALL REINFORCEMENT DETAIL'],
    ['PERDE DONATI METRAJI', 'WALL REINFORCEMENT SCHEDULE'], ['TEMEL DONATI DETAYI', 'FOUNDATION REINFORCEMENT DETAIL'], ['KOLON DONATI METRAJI', 'COLUMN REINFORCEMENT SCHEDULE'],
    ['KOLON APLİKASYON PLANI', 'COLUMN SETTING-OUT PLAN'], ['KOLON APLİKASYON TABLOSU', 'COLUMN SCHEDULE'], ['KOLON APLİKASYON VE DÜŞEY DONATI DETAYLARI', 'COLUMN SETTING-OUT AND VERTICAL REINFORCEMENT DETAILS'],
    ['KOLON KİRİŞ DÖŞEME DONATI PERSPEKTİFLERİ', 'COLUMN, BEAM AND SLAB REINFORCEMENT PERSPECTIVES'], ['KOLON · KİRİŞ · DÖŞEME DONATI PERSPEKTİFİ', 'COLUMN · BEAM · SLAB REINFORCEMENT PERSPECTIVE'],
    ['KİRİŞ AÇILIMLARI', 'BEAM BENDING SCHEDULES'], ['ETRİYE VE ÇİROZ AÇILIMLARI', 'STIRRUP AND CROSS-TIE BENDING SCHEDULES'], ['ÇİROZ DETAYI', 'CROSS-TIE DETAIL'],
    ['DÜŞEY DONATI AÇILIMI', 'VERTICAL REINFORCEMENT BENDING SCHEDULE'], ['PERDELERİ YATAY DONATI AÇILIMI', 'WALLS — HORIZONTAL REINFORCEMENT BENDING SCHEDULE'],
    ['(iç / dış, eğri çubuklar)', '(inner / outer, curved bars)'], ['(iç / dış)', '(inner / outer)'], ['PERDE KESİTİ', 'WALL SECTION'],
    ['PERDESİ DONATI PERSPEKTİFİ', 'WALL REINFORCEMENT PERSPECTIVE'], ["(perde ortası, 3 m'lik parça)", '(mid-wall, 3 m segment)'], ['perde ortası', 'mid-wall'], ['DÖŞEME KESİTİ', 'SLAB SECTION'],
    ['RADYE DONATISI AÇILIMI', 'RAFT REINFORCEMENT BENDING SCHEDULE'], ['PERDE DONATILARI AÇILIMI (bükme listesi)', 'WALL REINFORCEMENT BENDING SCHEDULE (bending list)'],
    ['YAPI DONATI PERSPEKTİFİ (ön yarı kaldırılmış)', 'STRUCTURE REINFORCEMENT PERSPECTIVE (front half removed)'], ['(ön yarı kaldırılmış)', '(front half removed)'],
    ['düşey çubuklar (bindirmeler okunsun diye yana kaydırılmıştır)', 'vertical bars (offset sideways to show the laps)'],
    ['Askı perde (perde-kiriş)', 'Hanger wall (wall-beam)'], ['Beton dış hatları (kolon, guse, kiriş, döşeme)', 'Concrete outlines (column, haunch, beam, slab)'],
    ['Perspektifler ölçeksizdir (aksonometrik). Uzunluklar 3B modelden; kesin metraj ilgili detay paftalarındadır.', 'Perspectives are not to scale (axonometric). Lengths are taken from the 3D model; exact quantities are given on the relevant detail sheets.'],
    ['Kolonlar tipleştirilmiştir: aynı kesit, kot ve kiriş düğümüne sahip kolonlarda tipin en elverişsiz kolonunun donatısı kullanılmıştır.', 'Columns are grouped into types: columns with the same section, level and beam joint use the reinforcement of the most unfavourable column of the type.'],
    ["Alt ve üst donatı döşeme boyunca tek parça (# m'yi aşan çubuklar bindirmeli), uçlar perde içinde # cm gönyeli. Kirişler ara mesnettir; üst ağ kiriş üstlerinden kesintisiz geçer. Paspayı # cm.",
      'Bottom and top reinforcement run in one piece along the slab (bars longer than # m are lapped), with # cm end bends inside the walls. Beams are intermediate supports; the top mesh runs continuously over the beams. Cover # cm.'],
    ["Yatay çubuklar 12 m'liktir; en uzun düz perdenin ortasından başlar, perde birleşimlerinde kesilmeden sürer, eklerde Ø'ya göre bindirme yapılır; yalnız kapatan çubuk kalan boydadır. İç / dış yüz arası çizimde açılmıştır (ölçü alınmaz).",
      'Horizontal bars are 12 m long; they start at the middle of the longest straight wall, run uninterrupted through wall junctions and are lapped according to Ø at splices; only the closing bar is cut to the remaining length. The gap between inner and outer faces is exaggerated in the drawing (do not scale).'],
    ['Sehpalar 1,00 × 1,00 m aralıkla, alt ve üst ağ arasına; ayaklar alt ağa bağlanır.', 'Chairs at 1.00 × 1.00 m spacing between the bottom and top mesh; legs tied to the bottom mesh.'],
    ['Çiroz iki yüzün yatay ve düşey çubuklarının kesiştiği noktaları', 'Cross-ties enclose the intersections of the horizontal and vertical bars'], ['sarar; uçlar 135° kancalı (10Ø).', 'of both faces; ends with 135° hooks (10Ø).'],
    ['Filiz boyu #', 'Starter length #'],
    /* ---------- statik: donatı etiketleri ---------- */
    ['# Ø#/# dış yatay', '# Ø#/# outer face horizontal'], ['# Ø#/# iç yatay', '# Ø#/# inner face horizontal'], ['# Ø#/# dış yatay (eğri)', '# Ø#/# outer face horizontal (curved)'], ['# Ø#/# iç yatay (eğri)', '# Ø#/# inner face horizontal (curved)'],
    ['# #Ø#/# dış düşey', '# #Ø#/# outer face vertical'], ['# #Ø#/# iç düşey', '# #Ø#/# inner face vertical'],
    ['# Ø#/# #. yüz yatay', '# Ø#/# face # horizontal'], ['# Ø#/# #. yüz yatay (eğri)', '# Ø#/# face # horizontal (curved)'], ['# #Ø#/# #. yüz düşey', '# #Ø#/# face # vertical'],
    ['#Ø#/# #. yüz yatay', '#Ø#/# face # horizontal'], ['#Ø#/# dış yatay', '#Ø#/# outer face horizontal'], ['#Ø#/# iç yatay', '#Ø#/# inner face horizontal'],
    ['#  #Ø#/# alt', '#  #Ø#/# bottom'], ['#  #Ø#/# üst', '#  #Ø#/# top'], ['#Ø# montaj', '#Ø# hanger bars'], ['#Ø# mesnet', '#Ø# support bars'],
    ['dış yatay', 'outer face horizontal'], ['iç yatay', 'inner face horizontal'], ['dış düşey', 'outer face vertical'], ['iç düşey', 'inner face vertical'],
    ['dış düşey gövde', 'outer face vertical, main'], ['iç düşey gövde', 'inner face vertical, main'], ['dış düşey filiz', 'outer face vertical, starter'], ['iç düşey filiz', 'inner face vertical, starter'],
    ['dış düşey tek parça', 'outer face vertical, single piece'], ['iç düşey tek parça', 'inner face vertical, single piece'], ['dış yatay eğri', 'outer face horizontal curved'], ['iç yatay eğri', 'inner face horizontal curved'],
    ['1. yüz yatay', 'face 1 horizontal'], ['2. yüz yatay', 'face 2 horizontal'], ['1. yüz düşey', 'face 1 vertical'], ['2. yüz düşey', 'face 2 vertical'],
    ['1. yüz düşey gövde', 'face 1 vertical, main'], ['2. yüz düşey gövde', 'face 2 vertical, main'], ['1. yüz düşey filiz', 'face 1 vertical, starter'], ['2. yüz düşey filiz', 'face 2 vertical, starter'],
    ['1. yüz yatay eğri', 'face 1 horizontal curved'], ['2. yüz yatay eğri', 'face 2 horizontal curved'], ['1. YÜZ YÜZ', 'FACE 1'], ['2. YÜZ YÜZ', 'FACE 2'], ['1. YÜZ', 'FACE 1'], ['2. YÜZ', 'FACE 2'],
    ['(iki yüz yatay)', '(both faces horizontal)'], ['(eğri)', '(curved)'], ['tek parça', 'single piece'], ['şaşırtmalı', 'staggered'], ['filiz', 'starter'],
    ['döşeme', 'slab'],
    /* kısa kelimeler yalnız tek başına satır olarak ya da sayının hemen ardında ('ic': "+3.90 üst", "34 ad. Ø25", "28 düz + 799 yay");
       metin içinde serbestçe çevrilmez ("alt yapı" → "bottom yapı", "Düz çatı" → "straight çatı" oluyordu) */
    ['üst', 'top', 'satir'], ['alt', 'bottom', 'satir'], ['yay', 'arc', 'satir'], ['düz', 'straight', 'satir'],
    ['# üst', '# top', 'ic'], ['#  üst', '#  top', 'ic'], ['# alt', '# bottom', 'ic'], ['#  alt', '#  bottom', 'ic'], ['# ad.', '# pcs', 'ic'], ['# yay', '# arc', 'ic'], ['# düz', '# straight', 'ic'], ['üst #', 'top #', 'ic'], ['alt #', 'bottom #', 'ic'], ['düz # m', 'straight # m', 'ic'],
    ['Düz çatı', 'Flat roof'], ['alt yapı', 'infrastructure'], ['altyapı', 'infrastructure'], ['üst yapı', 'superstructure'], ['üstyapı', 'superstructure'],
    ['kiriş boyuna', 'beam longitudinal'], ['kolon boyuna', 'column longitudinal'], ['kiriş etriyesi', 'beam stirrups'], ['kolon etriyesi', 'column stirrups'], ['etr.', 'stirr.'], ['etriye', 'stirrups'],
    /* ---------- statik: GENEL NOTLAR (eski aktarımlarda satırlara bölünmüş hâli; yeni aktarımda notlar bölünmeden önce çevrilir) ---------- */
    ['# – Kütle ve mesnet betonları ile grobetonların beton sınıfı "C#/#", eğim betonu "# doz".', '# – Concrete class of mass and support concrete and lean concrete is "C#/#"; screed concrete "# dosage".', 'satir'],
    ['# – BETON SINIFI: Su tutucu yapılarda C#/# WR (sülfata dayanıklı çimentolu), su tutucu olmayan (bina tipi) yapılarda C#/#', '# – CONCRETE CLASS: C#/# WR (sulphate-resistant cement) for water-retaining structures, C#/# for non-water-retaining (building type)', 'satir'],
    ['olacaktır.', 'structures.', 'satir'],
    ['# – ÇELİK SINIFI: B #C olacaktır. Çelik konstrüksiyon malzeme kalitesi: "St.#/#".', '# – STEEL CLASS: B #C. Structural steel grade: "St.#/#".', 'satir'],
    ['# – Kazı şev eğimleri "#/n" alınmış olup "n" değeri jeolojik raporda verilen ve zemine bağlı olarak değişen değerlere uygun olarak', '# – Excavation slopes are taken as "#/n"; the value of "n" shall be determined on site by the supervising engineer according to', 'satir'],
    ['kontrol mühendisince yerinde belirlenecektir.', 'the soil-dependent values given in the geological report.', 'satir'],
    ['# – Kazı sonucunda zeminin, zemin etüt raporunda ve proje tasarım kriterlerinde belirtilen nitelikte olmadığı görüldüğü takdirde', '# – If the excavated ground does not match the properties given in the soil report and the design criteria,', 'satir'],
    ['ilgililere bilgi verilecektir.', 'the relevant parties shall be informed.', 'satir'],
    ["# – Zeminde betona zararlı kimyasal maddelerin bulunması durumunda TS #'a göre önlem alınacaktır.", '# – If chemicals harmful to concrete are present in the soil, measures shall be taken according to TS #.', 'satir'],
    ['# – Dolgu malzemesinin sıkışma oranı minimum %# olmalıdır. Proje sahasında yapılacak dolguda minimum %# proktor sıklığı ve', '# – Compaction of fill material shall be at least #%. Fill on site shall achieve at least #% Proctor density and', 'satir'],
    ['minimum Es=# MPa deformasyon modülü değeri aranacaktır.', 'a deformation modulus of at least Es=# MPa.', 'satir'],
    ['# – Tüm borular sızdırmazlık yakaları kaynatılarak beton dökülmeden önce yerleştirilecektir. Boru deliklerinin beton kırılarak', '# – All pipes shall be placed with welded puddle flanges before concreting. Opening pipe holes by breaking concrete', 'satir'],
    ['açılmasına asla izin verilmeyecektir.', 'is never permitted.', 'satir'],
    ['# – Kalıp hazırlanması, donatının yerleştirilmesi, betonun dökülmesi sertifikalı elemanlar tarafından, şantiye şefi inşaat', '# – Formwork, reinforcement placement and concreting shall be carried out by certified personnel under the supervision of the site', 'satir'],
    ['mühendisinin denetiminde TS # kurallarına uygun yapılacaktır.', 'civil engineer in accordance with TS #.', 'satir'],
    ['# – Kalıp hazırlanırken mimari, betonarme, elektrik ve mekanik projeleri karşılaştırılacak, çelişkili durum varsa şantiye', '# – Architectural, structural, electrical and mechanical drawings shall be cross-checked when preparing formwork; any conflict shall be', 'satir'],
    ['yetkilisine bildirilecek, uyum sağlandıktan sonra imalat yapılacaktır.', 'reported to the site manager, and construction shall start after it is resolved.', 'satir'],
    ['# – Su ile temas eden yüzeylerde "F#", su ile temas etmeyen yüzeylerde "F#" beton yüzey sınıfı sağlanmalıdır.', '# – Concrete surface finish class "F#" shall be provided on surfaces in contact with water and "F#" on other surfaces.', 'satir'],
    ["# – Beton, beton santrallerinde TS EN #'ya uygun şekilde imal edilecek ve TS # ve TS #'e uygun dökülecektir.", '# – Concrete shall be produced in batching plants in accordance with TS EN # and placed in accordance with TS # and TS #.', 'satir'],
    ['21 – Aksi belirtilmedikçe demirlerde bindirme (filiz) boyları Ø12: 70, Ø14: 80, Ø16: 90, Ø18: 100, Ø20: 110, Ø22: 120, Ø24: 130,', '21 – Unless otherwise noted, lap (starter) lengths shall not be less than Ø12: 70, Ø14: 80, Ø16: 90, Ø18: 100, Ø20: 110, Ø22: 120, Ø24: 130,', 'satir'],
    ["Ø26: 140 cm'den az alınmayacaktır. Perdelerin yatay donatılarının bindirmeli eklerinde 90 derecelik kanca yapılacaktır (TBDY 2018).", 'Ø26: 140 cm. Lapped splices of horizontal wall reinforcement shall have 90-degree hooks (TBDY 2018).', 'satir'],
    ['# – Döşeme ve radye temel üst donatıları kesinlikle üstte tutulmalıdır. Donatıya basılmamalı ve üstte tutulması için sehpa önlemi', '# – Top reinforcement of slabs and raft foundations shall be kept strictly in position. It shall not be stepped on, and chair measures to hold it on top', 'satir'],
    ["28 – Donatı kanca ve gönyeleri merdane ile bükülecektir. Bükme merdane çapı Ø ≤ 16 için 4Ø, Ø > 16 için 7Ø'dir (TS EN 1992-1-1", '28 – Hooks and bends shall be formed on a mandrel. Mandrel diameter is 4Ø for Ø ≤ 16 and 7Ø for Ø > 16 (TS EN 1992-1-1', 'satir'],
    ['Tablo 8.1N); sıcak bükme ve düzeltme yapılmayacaktır.', 'Table 8.1N); hot bending and re-straightening are not permitted.', 'satir'],
    ["29 – Perde düşey donatıları: yüksekliği 2.00 m'ye kadar olan perdelerde filizsiz, tek parça ve gönyeli; 2.00 m – 6.00 m arasında", '29 – Vertical wall reinforcement: walls up to 2.00 m high — single piece without starters, with end bends; walls 2.00 m – 6.00 m high —', 'satir'],
    ['temel filizi üzerine bindirmeli; 6.00 m ve üzerinde temel filizi, orta ve üst (döşemeye kadar) olmak üzere üç parça yapılacak,', 'lapped onto the foundation starters; walls 6.00 m and higher — in three pieces: foundation starter, middle and top (up to the slab),', 'satir'],
    ['perde ortasında su tutucu bantlı inşaat derzi teşkil edilecektir. Bindirme boyları çapa göre "Demirlerde Bindirme Boyları"', 'with a construction joint with waterstop at mid-height of the wall. Lap lengths by diameter are given in the "Rebar Lap Lengths"', 'satir'],
    ['tablosundadır (Ø12: 70 … Ø26: 140 cm).', 'table (Ø12: 70 … Ø26: 140 cm).', 'satir'],
    /* GENEL NOTLAR — tek satıra sığanlar (numaralı) */
    ['# – Ölçüler yerinde kontrol edildikten sonra imalat yapılacaktır.', '# – Construction shall start after dimensions are verified on site.'],
    ['# – Kullanılacak çelik donatı TSE belgeli olacaktır. Mukavemet değerleri laboratuvarda test edilmeden imalata geçilmeyecektir.', '# – Reinforcing steel shall be TSE certified. It shall not be used before its strength has been tested in the laboratory.'],
    /* ---------- mekanik: ısı yalıtımı ---------- */
    ['ISI YALITIM DETAYLARI', 'THERMAL INSULATION DETAILS'], ['ISI YALITIMI', 'THERMAL INSULATION'], ['KAT KESİT PLANI', 'FLOOR SECTIONAL PLAN'], ['KESİT PLANI', 'SECTIONAL PLAN'],
    ['İÇ (ısıtılan hacim)', 'INSIDE (heated space)'], ['DIŞ (ısıtılmayan hacim)', 'OUTSIDE (unheated space)'],
    ['İç sıva (kireç-çimento)', 'Internal plaster (lime-cement)'], ['Dış sıva (çimento)', 'External plaster (cement)'], ['Şap (çimento)', 'Screed (cement)'], ['Mantolama sıvası + file', 'ETICS render + mesh'],
    ['Taş yünü', 'Stone wool'], ['Cam yünü', 'Glass wool'], ['Bitümlü su yalıtım örtüsü', 'Bituminous waterproofing membrane'], ['Grobeton / donatısız beton', 'Lean concrete / plain concrete'],
    ['Blokaj / kırmataş dolgu', 'Hardcore / crushed stone fill'], ['Yatay delikli tuğla', 'Horizontally perforated brick'], ['Düşey delikli tuğla', 'Vertically perforated brick'], ['Buhar kesici (PE folyo)', 'Vapour barrier (PE foil)'],
    ['EPS levha', 'EPS board'], ['XPS levha', 'XPS board'], ['Seramik / karo', 'Ceramic / tile'], ['Gazbeton', 'Aerated concrete'],
    ['Toplam kalınlık', 'Total thickness'], ['yüzey alanı', 'surface area'], ['Yoğuşma yok', 'No condensation'], ['Yoğuşma var', 'Condensation occurs'], ['TS 825 sınırı', 'TS 825 limit'],
    ['✓ UYGUN', '✓ COMPLIES'], ['✗ UYGUN DEĞİL', '✗ DOES NOT COMPLY'], ['UYGUN DEĞİL', 'DOES NOT COMPLY'],
    ['TOPRAĞA OTURAN DÖŞEME', 'SLAB ON GROUND'], ['ÇATI ARASI DÖŞEMESİ (ÜSTÜ KIRMA ÇATI)', 'ATTIC FLOOR (HIPPED ROOF ABOVE)'], ['ÇATI ARASI DÖŞEMESİ', 'ATTIC FLOOR'],
    ['DIŞ DUVAR', 'EXTERNAL WALL'], ['BETONARME PERDE', 'REINFORCED CONCRETE WALL'], ['KOLON-KİRİŞ', 'COLUMN-BEAM'], ['MANTOLAMA', 'EXTERNAL INSULATION (ETICS)'],
    ['DIŞ CEPHE', 'FACADE'], ['ZEMİN ALTI', 'UNDER SLAB'], ['SU YALITIMI', 'WATERPROOFING'], ['TAŞYÜNÜ', 'STONE WOOL'], ['TASYUNU', 'STONE WOOL'], ['BUHAR KESİCİ', 'VAPOUR BARRIER'],
    ['TAVAN', 'CEILING'], ['TOPRAK', 'SOIL'],
    ['bölge · katman kalınlıkları ısı yalıtım hesabındaki yapı elemanlarından alınmıştır (kesitler ölçeksiz şematiktir)', 'zone · layer thicknesses are taken from the building elements of the thermal insulation calculation (sections are schematic, not to scale)'],
    /* ---------- mekanik: ısıtma / soğutma / elektrikli ısıtma ---------- */
    ['ELEKTRİKLİ ISITMA', 'ELECTRIC HEATING'], ['CİHAZ LİSTESİ', 'EQUIPMENT LIST'], ['ARMATÜR LİSTESİ', 'FIXTURE LIST'],
    ['Duvar tipi elektrikli konvektör', 'Wall-mounted electric convector'], ['Split klima (iç + dış ünite)', 'Split air conditioner (indoor + outdoor unit)'], ['Elektrikli termosifon', 'Electric water heater'],
    ['Kurulu güç', 'Installed power'], ['ısı kaybı', 'heat loss'], ['her cihaz ayrı sigortalı linye, oda termostatlı', 'each unit on a separately fused circuit, with room thermostat'],
    ['ana # A (# faz)', 'main # A (# phase)'], ['TOPLAM — # cihaz', 'TOTAL — # unit(s)'], ['Eİ # W', 'EH # W'], ['Eİ#', 'EH#'],
    ['Akım (A)', 'Current (A)'], ['Armatür', 'Fixture'], ['Bağlantı', 'Connection'], ['Cihaz', 'Unit'], ['Gereken (W)', 'Required (W)'], ['Gerilim', 'Voltage'], ['Kapasite', 'Capacity'],
    ['Sigorta / kablo', 'Fuse / cable'], ['ELK.', 'ELEC.'], ['TERM.', 'THERM.'],
    /* ---------- mekanik: sıhhi tesisat ---------- */
    ['Klozet (rezervuarlı)', 'WC (with cistern)'], ['Klozet', 'WC'], ['Lavabo', 'Washbasin'], ['Sıcak su (lt/h)', 'Hot water (l/h)'], ['Soğuk su (lt/h)', 'Cold water (l/h)'],
    ['soğuk su', 'cold water'], ['sıcak su', 'hot water'], ['temiz su', 'potable water'], ['pis su', 'waste water'], ['Pis su yatay', 'Horizontal drainage'],
    ['gerekli giriş basıncı', 'required inlet pressure'], ['mSS', 'mWC'], ['Yer süzgeci', 'Floor drain'], ['ŞEBEKEDEN', 'FROM MAINS'], ['ÇEK VALF', 'CHECK VALVE'], ['RÖGAR', 'MANHOLE'], ['HAVALIK', 'VENT PIPE'],
    ['ODA', 'ROOM']
  ];

  /* sözlük sırası: aynı anahtarın BÜYÜK harfli hâli önce gelsin (C.txL küçük harfe çevirip tek anahtar tuttuğundan son gelen geçerli olur;
     karışık harfli karşılık kalsın, büyük harfli kaynakta zaten büyük yazılır). Bütün modüllerin eklemeleri bittikten sonra da bir kez düzenlenir. */
  const ust = s => s.toLocaleUpperCase('tr');
  const sirala = () => {
    const z = DIL.sz && DIL.sz.en; if (!z || !z.tam) return;
    const once = [], sonra = [];
    for (const kv of z.tam) (kv[0] === ust(kv[0]) ? once : sonra).push(kv);
    z.tam = new Map(once.concat(sonra));
  };
  const L = [];
  for (const c of C) { const [a, b, tur] = c; if (a !== ust(a) && a.length > 3 && a.length <= 70) L.push([ust(a), b.toUpperCase(), tur]); L.push(c); }
  DIL.ekle('en', 'English', L);
  sirala();
  if (typeof window.addEventListener === 'function') window.addEventListener('load', () => { try { sirala(); if (window.C && window.C.langReset) window.C.langReset(); } catch (e) { console.error('dil-en-cizim', e); } });
  DIL._cizimSozluk = C; // test ve denetim için
})();

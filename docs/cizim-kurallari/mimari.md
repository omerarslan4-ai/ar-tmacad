# Mimari çizim kuralları

Bu belge Ömer Bey'in örnek çizimlerinden **ölçülerek** çıkarıldı; tahmin içermez. Örneklerin birbirini tutmadığı sekiz noktada kullanıcı 12.11.2026'da karar verdi (aşağıda "Karar" diye işaretli). Karar 8 (tarama) 14.11.2026'da değişti: taramalar örnek projedeki gibi (bölüm 5); mahal listesi başlığı 4 mm (bölüm 2).
Çizen ajanlar (`pafta-cizim`) buna göre çizer, `cizim-denetci-mimari` ajanı programın çıktısını buna göre denetler.
Sayıların programın okuduğu hâli `app/cizim-kural.js` içindeki `MIMARI` tablosudur; bu belge ile o tablo aynı şeyi söylemelidir.
Denetim: `node araclar/cizim-karsilastir.js mimari <dosya.dxf> --olcek 50 --birim m` (programın çıktısı; model metre), `--olcek 50` (model santimetre, örnek çizimler) ya da `--kagit` (her şey kâğıt ölçüsünde).

**Kaynak (12.11.2026 okundu):** Çokal AAT R2 seti, `test-proje/R2/` —
1-Kaba-İnce-Giriş-Kum Yağ Tutucu_R3, 3-Anaerobik_R3, 7-Çökeltme Havuzu_R2, 8-Geri Devir Terfi Merkezi_R2, 12-Çamur Yoğunlaştırma Tankı_R3.
**Nasıl okundu:** DWG → DXF (ODA File Converter), sonra `node araclar/cizim-oku.js <dosya.dxf>`.
**Birim:** örnek çizimler cm çizilmiş; 1/50 paftada 10 birim yazı = kâğıtta 2 mm. Kalınlıklar mm.

## 1. Katmanlar
Beş dosyanın beşinde de aynı ad, renk, çizgi tipi ve kalınlıkla geçenler (renk = AutoCAD renk numarası):

| Katman | Renk | Çizgi tipi | Kalınlık | Ne çizilir (örneklerde) |
| --- | --- | --- | --- | --- |
| `Beton` | 6 | Continuous | 0,50 | Kesilen beton (perde, döşeme, radye) dış hatları |
| `Ongor` | 9 | Continuous | 0,15 | Görünüş çizgileri (kesilmeyen, önde görünen) |
| `Arkagor` | 8 | HIDDEN | 0,15 | Arkada kalan / gizli kenarlar |
| `Korkuluk` | 151 | Continuous | 0,25 | Korkuluk, küpeşte |
| `Merdiven` | 95 | Continuous | 0,30 | Merdiven |
| `Tretuvar` | 163 | Continuous | 0,20 | Tretuvar, saha kaplaması |
| `Grobeton` | 233 | Continuous | 0,15 | Grobeton (AR-CONC taramasıyla) |
| `Toprak` | 27 | Continuous | 0,20 | Zemin / toprak çizgisi; dolgu taraması (bölüm 5) |
| `Kesit_Cizgisi` | 133 | CENTER2 | 0,15 | Kesit çizgisi, kesit dairesi ve harfi |
| `GNY` | 7 | Continuous | 0,15 | Kuzey işareti / genel gösterim |
| `Yazi30` | 72 | Continuous | 0,30 | Başlık yazıları |
| `YAZI GENEL` | 240 | Continuous | 0,30 (2 dosyada 0,13) | Pafta genel yazıları |
| `YZ` | 7 | Continuous | 0,20 | Mimari notlar bloğu, açıklama okları |
| `ANTET`, `Antet Ince`, `Antet Kalın` | 7 | Continuous | 0,25 / 0,15 / 0,40 | Antet |
| `WIPEOUT` | 250 | Continuous | — | Maskeleme |

Dört dosyada geçenler:

| Katman | Renk | Çizgi tipi | Kalınlık | Ne çizilir |
| --- | --- | --- | --- | --- |
| `Beton_Kesik` | 12 | HIDDEN (1 dosyada DASHED2) | 0,15 | Betonun gizli kenarı |
| `Su` | 153 | Continuous | 0,20 (1 dosyada 0,25) | Su yüzeyi ve su taraması (ANSI31) |
| `Sututucu` | 51 (birer dosyada 2 ve 41) | Continuous | 0,15 | Su tutucu bandı |
| `Mim_Yazi25` | 7 | Continuous | 0,25 | Mimari yazılar |
| `Yazi20` / `Yazi25` | 7 (Yazi20 iki dosyada 141) | Continuous | 0,20 / 0,25 | Yazı ve açıklama okları |
| `MAHAL İSİM` | 7 | Continuous | 0,20 | Mahal adları |
| `ZMN` | 25 | PHANTOM2 | 0,40 | Zemin kotu çizgisi ve yazısı |
| `Solid` | 254 | Continuous | 0,15 | Dolu tarama |

Ölçü, kot, aks ve tarama katmanları (**Karar 1**: örneklerde iki ayrı adla geçiyordu; standart ad soldaki):

| Katman | Renk | Çizgi tipi | Kalınlık | Ne çizilir | Kullanılmayacak eski ad |
| --- | --- | --- | --- | --- | --- |
| `ÖL` | 8 | Continuous | 0,15 | Ölçüler | `Olcü` |
| `Kot` | 32 | Continuous | 0,20 | Kot işareti ve yazısı | `KOT` |
| `Aks` | 17 | ACAD_ISO04W100 | 0,13 | Aks çizgisi, balonu, harfi | `AKS` |
| `Tarama` | 136 | Continuous | 0,09 | Kesit taramaları | `tarama` |

- **Karar 2 — kodlu katman ailesi kullanılmaz.** `MIM_DUVAR_WALL_25`, `YAZI_TEXT_20`, `TARAMA_HATCH_10`, `AKS_AXIS_10`, `BASLIK_TITLE_35`, `GENEL SEMBOL_SYMBOL_25` gibi adlar programın çıktısında bulunmaz; yalnız yukarıdaki sade adlar kullanılır.
- **Karar 3 — her nesne rengini, çizgi tipini ve kalınlığını katmandan alır.** Nesneye elle renk, çizgi tipi ya da kalınlık verilmez. (Antet, kuzey işareti ve maske katmanları bu denetimin dışındadır.)
- Yukarıdaki tablolarda bir katmanın iki değeri yazıyorsa (ör. `Su` 0,20 / 0,25) ilk yazılan esas alınır.

## 2. Yazı
| Stil | Font | Genişlik | Nerede |
| --- | --- | --- | --- |
| `YZ` | turkce.shx | **0,70** (Karar 4) | Mimari yazılar, kot yazısı, mekanik yazılar |
| `OL` | turkce.shx | 0,75 | Ölçü yazısı ("50", "20", "25" ölçü stilleri) |
| `OL 20` | turkce.shx | 0,80 | Ölçü yazısı ("1-20", "1-5" ölçü stilleri) |
| `ARIAL` | arialbd.ttf (Arial Bold) | 1 | Aks harfi, kesit harfi, mahal adı |
| `TÜRKÇE` | ARIALN.TTF (Arial Narrow) | 1 | Antet yazıları |

`OL` ve `OL 20` genişlikleri esas dosyadan alındı (Karar 5); başka dosyalarda 0,65 ve 0,85 de görülüyor.

Yükseklikler kâğıt üstü mm olarak kuraldır; çizim birimi karşılığı ölçeğe göre değişir (1/50'de 10 birim = 2 mm, 1/20'de 6 birim = 3 mm):

| Yazı | Katman | Stil | Yükseklik |
| --- | --- | --- | --- |
| Genel mimari yazı | `Mim_Yazi25`, `Yazi20`, `Yazi25` | YZ | 10 → 2 mm (en sık) |
| Eleman kodu / vurgulu yazı | `Mim_Yazi25`, `ZMN` | YZ | 12,5 → 2,5 mm |
| Detay ölçeğinde (1/25 ve daha büyük) yazı | `Yazi25`, `Mim_Yazi25` | YZ | 1/20'de 5 ve 6 birim → 2,5 ve 3 mm |
| Kot yazısı | `Kot` / `KOT` | YZ | 10 → 2 mm |
| Aks harfi | `Aks` / `AKS` | ARIAL | 25 → 5 mm |
| Kesit harfi | `Kesit_Cizgisi` | ARIAL | 25 → 5 mm |
| Mahal adı | `MAHAL İSİM` | ARIAL / TÜRKÇE | 15 – 20 → 3 – 4 mm |
| Pafta başlığı | `Yazi30` | ARIAL BLACK | 20 → 4 mm |
| Mahal listesi başlığı | `Yazi30` (R2'de `Yazi_Baslik`) | — | 20 → 4 mm |
| Mahal listesi öteki yazıları (sütun başlıkları, mahal adları, kotlar) | `Mim_Yazi25` (R2'de `YZ`) | YZ | 10 → 2 mm |

**Mahal listesi (kullanıcı kararı 14.11.2026):** başlık R2'deki gibi **4 mm** kalır. R2'de tek mahal listesi 10-İdari Bina_R2'de: başlık `Yazi_Baslik` katmanında 20 birim (4 mm), öteki yazılar `YZ` katmanında 10 birim (2 mm). Program başlığı AutoCAD çıktısında başlık katmanına (`Yazi30`) yazar, öteki yazıları 2 mm yazar (eskiden 2,6 / 2,2 / 1,8 / 1,6 mm). Sayılar: `app/cizim-kural.js → MIMARI.mahalListesi`.

## 3. Ölçü
Beş dosyada ortak olanlar:
- Ölçüler `ÖL` katmanındadır (örneklerde 2.314 ölçünün 2.290'ı ölçü katmanında; kalan 24'ü antet ve bir mekanik detayda).
- **Karar 6 — ölçüler santimetre yazılır.** Örneklerde 1/50 stilinde en çok 2 ondalık, 1/20 stilinde tam sayı.
- Ölçü ucu **eğik tik** (`_ArchTick`); ok yok.
- Ölçü yazısı çizginin **üstünde** ve çizgiyle **aynı doğrultuda** (yatay zorlanmıyor).
- Ölçü stilinin adı ölçeği söyler: `50`, `25`, `20`, `10` (ve bazı dosyalarda `1-20`, `1-5`).

| Stil | Kullanım | Yazı | Ondalık | Uzatma taşması | Ölçü çizgisi taşması |
| --- | --- | --- | --- | --- | --- |
| `50` (5 dosya, 1.210 ölçü) | 1/50 plan ve kesit | OL, 10 → 2 mm | 2 | 20 birim | 2,4 birim |
| `1-20` (4 dosya, 911 ölçü) | 1/20 detay | OL 20, 5 – 6 | 0 – 1 | 2,5 – 10 birim (dosyadan dosyaya değişiyor) | 2 birim |
| `20`, `25`, `10` | detay ölçekleri | OL, 10 | 2 | — | — |

**Karar 5 — ölçü stili tanımı esas dosyadan alınır:** 1-Kaba-İnce-Giriş-Kum Yağ Tutucu_R3. Oradaki `1-20` stili: eğik tik 3, uzatma boşluğu 4, uzatma taşması 2,5, ölçü çizgisi taşması 2, yazı `OL 20` 6 birim (3 mm), ondalık 0.
Başka dosyalarda aynı adlı stilin değerleri farklıdır; onlar esas alınmaz.

### Ölçülendirme yöntemi (ölçü yerleri)
Kullanıcı kararı (13.11.2026): **ölçülendirme yönteminin ölçütü Çokal R2 çizimleridir.** Aşağıdaki değerler o çizimlerdeki 2.224 doğrusal ölçüden ölçüldü (kâğıt üstü mm); sayılar `app/cizim-kural.js` → `olcuYeri` içindedir.

| | 1/50 çizimler ("50" stili) | Detaylar, 1/25 ve büyük ("1-20" stili) |
| --- | --- | --- |
| İlk sıranın çizime uzaklığı | **14 mm**, çizimin en dış çizgisinden; tretuvar varsa **tretuvarın dışından** (kullanıcı kararı 13.11.2026; çizime göre revize edilecek) | aynı |
| Ölçü sıraları arası | **5 mm** (159 aralığın 112'si; kalanlar 5,5 – 6) | örneklerde 6,5 – 7,5 mm; **firma kuralı 14.11.2026: 25 cm, sıralar üst üste binmez** → program 5 mm |
| Sıra sayısı | 1, 2 ya da 3 (yalnız 2 yerde 4) | aynı |
| Toplam ölçü | **en dış sırada** (104 yığının 98'i); parça ölçüler içte | aynı |
| Uzatma çizgisi | sabit boylu ($DIMFXLON = 1): ölçü çizgisinden **ölçülen noktaya doğru 4,1 mm** iner, öbür yanda **1 mm** taşar (toplam 5,1 mm; 1.950 çizginin 1.950'si). 14.11.2026 düzeltme: program yönü ters çiziyordu (10-İdari Bina_R2 plan altı ölçüleri: çizgi ölçü çizgisinin 5 birim dışından başlayıp binaya doğru 20,4 birim gidiyor) | ölçülen noktadan başlar (2 mm boşluk), ölçü çizgisini 1,25 mm aşar |
| Ölçü çizgisinin tiki aşması | 0,5 mm | 1 mm |
| Ölçü türü | hizalı (aligned), eğik tik | aynı |

Programda: ölçü çizimi ve kesitlerin otomatik ölçüleri bu değerleri kullanır (13.11.2026).

**Örneklerde tek bir değer çıkmayan, kullanıcıya sorulanlar:**
- İlk ölçü sırasının çizime uzaklığı örneklerde 6 – 77 mm arasında değişiyordu; kullanıcı 14 mm ve "tretuvarın dışı" dedi (yukarıdaki tablo).
- Planlarda ölçü sıraları (14.11.2026, 10-İdari Bina_R2 kat planından ölçüldü; dört kenarda aynı düzen): içten dışa **1) doğrama zinciri** (dış yüz · pencere / kapı boşluk kenarları · dış yüz), **2) aks zinciri** (dış yüz · akslar · dış yüz; ör. 110 · 480 · 425 · 425 · 220 · 425 · 480 · 110), **3) toplam**. Sıralar 5 mm arayla; aks balonu en dış sıranın **11 mm** dışında (balon merkezi). Doğrama olmayan kenarda o sıra yoktur. Program ilk sırayı çizimin (tretuvar ve doğrama etiketleri dahil) en dış çizgisinden 14 mm dışarı koyar.

**Neyin ölçülendirileceği (kullanıcı kuralı, 13.11.2026):** ölçü, mimari olarak ne varsa onu gösterir — **duvar / perde, pencere / kapı, döşeme, boşluk**. Her kenarı ölçen, bir şey ifade etmeyen zincir verilmez.
Kesitte program: yatay zincirde kesilen duvar ve perdelerin kalınlığı ile aralarındaki boşluklar; düşey zincirde temel ve döşeme kalınlıkları, aralarındaki yükseklikler ve sol dış duvardaki pencere / kapı boşlukları; her iki yönde en dışta toplam ölçü. Merdiven basamağı, kiriş kenarı, pah, korkuluk ölçülmez.

**Örneklerde yapının içindeki ölçüler:** Çokal R2'de 1/50 ölçülerin yaklaşık üçte biri yapının içindedir (ör. Kaba-İnce: 211 iç / 396 dış) ve çoğu zincir değil tek ölçüdür: hacmin net genişliği (480, 500, 600, 1100 cm) ve net yüksekliği (365, 500, 600, 870 cm), yanında duvar / döşeme kalınlıkları (20, 30, 40 cm).
**Kesitte düşey ölçüler (14.11.2026, Çokal 6-Blower Binası_R2 A-A / B-B ve 10-İdari Bina_R2 A-A kesitlerinden ölçüldü):** düşey ölçüler yapının **içinde**, doğramalı duvarın yanında (duvar yüzünden 75 – 100 cm içeride) **iki sıra, 25 cm (5 mm) arayla** verilir: duvara yakın sıra döşeme katmanları / alt döşeme · parapet · pencere · lento · üst döşeme (ör. 170 · 130 · 320), içerideki sıra net kat yüksekliği (ör. 620, 300). Doğrama kotları (+1,95, +3,25) zincirin yanına, zemin ve çatı kotları dışarıya yazılır. Program: aynı düzen; zincir arkada görünen kolon / kiriş / doğrama çizgisinin, kot işaretinin ve yazının üstüne binmez — duvardan içeri doğru ilk boş yere kayar; MIMARIPAFTA sonunda ölçü çakışma denetimi yapar (`app/mimari-oto.js → olcuCakisma`, test: `test/mimari-oto.test.js`).

**Ölçüler içeriden verilir (kullanıcı kuralı, 13.11.2026: "ölçüler içerden verilsin"):** kesitte ölçüler yapının içinden zincir olarak verilir; dışarıda yalnız toplam boy ve toplam yükseklik kalır (ilk sıra kuralı: tretuvarın dışından 14 mm).
- **Yatay zincir:** her kat aralığında tek sıra — duvar kalınlığı · net açıklık · duvar kalınlığı … Pencereyle bölünen duvar ve kapının üstünde kalan lento parçası da sınır sayılır.
- **Düşey zincir:** kesilen iki duvar arasındaki her hacimde tek sıra — alt döşeme kalınlığı · net yükseklik · üst döşeme kalınlığı. Yandaki duvarda pencere / kapı boşluğu varsa net yükseklik parapet · boşluk · lento olarak bölünür (boşluk yalnız sağ duvardaysa zincir sağ duvarın yanına konur).
- **Kabul:** yatay zincir döşemeden 25 mm yukarıda, düşey zincir duvardan 20 mm içeride (`olcuYeri.genel.icYatay / icDusey`; örneklerde sabit bir yer çıkmadı, çizime göre revize edilecek).

### Malzeme açılımı ve perde / döşeme numaraları (Çokal R2'den ölçüldü, 13.11.2026)
Ölçülen paftalar: çöktürme, yoğunlaştırma, ön arıtma, terfi (anaerobik paftasında açılım yok). Sayılar `app/cizim-kural.js → MIMARI.acilim` içindedir.

**Kesitteki numara (DU01, DU02, DÖ01 …):**
| Özellik | Değer |
| --- | --- |
| Yazı | YZ, 2,5 mm, katman `Mim_Yazi25`, renk katmandan |
| Çizgi | koddan elemana ince çizgi, katman `Mim_Yazi25`, **renk 243** (nesnede yazılı) |
| Duvar (DU) | çizgi yatay; duvarın içinden çıkar, kod duvarın sağında, çizginin ucundan 1,3 mm sonra başlar (çizgi boyu örneklerde 7,5 – 12 mm; programda duvar yüzünden 4,5 mm taşar) |
| Döşeme (DÖ) | çizgi "L": döşemeden 12 – 17 mm dik çıkar (programda 12), 2,3 mm yatay döner, kod ondan sonra yazılır |
| Sayı | kod her elemana ayrı yazılır: kesilen her duvar parçası (toprak altı DU01, toprak üstü DU02 ayrı) ve her döşeme parçası bir kod alır (terfi: 4 kesitte 31 kod; ön arıtma: 79) |
Çatı örtüsü (makas, kiremit), merdiven ve rampa döşeme sayılmaz, kod almaz. Pencere / kapı kod almaz, açılıma satır olarak da yazılmaz.

**Örnekle henüz tutmayanlar (AutoCAD nesne türü):** örnekte yazı genişliği 0,75 (programda YZ stili 0,70 — Karar: YZ 0,70); açılım kutusu tek parça çok satırlı yazı, alt çizgi yazının içinde, çerçeve ve kod çizgisi tek parça çoklu çizgi; programda bunlar ayrı yazı ve ayrı çizgilerdir. Örnekte duvar kodu duvarın sağında da solunda da olabilir, döşeme kodu aşağıda da olabilir; program hep sağa / yukarı koyar. Örneklerde başlık "DÖSEMELER" yazılmış; programda "DÖŞEMELER".

**Paftadaki açılım çerçevesi:**
| Özellik | Değer |
| --- | --- |
| Düzen | çerçeve içinde üstte **DÖŞEMELER**, altta **DUVARLAR**; kodlar soldan sağa yan yana |
| Başlık | YZ 4 mm, altı çizili, **renk 94**, katman `Yazi25` |
| Kod | 3,5 mm (satırın 1,4 katı), altı çizili, **renk 94**, katman `Yazi25` |
| Satırlar | 2,5 mm, başında tire, büyük harf; satır aralığı ≈ 4,2 mm |
| Sütun aralığı | 84 mm (örneklerde 74 – 84) |
| Çerçeve | katman `Mim_Yazi25`; kenardan yazıya 3,6 mm |
**Kabul:** terfi ve ön arıtma paftalarında aynı kutu küçültülerek çizilmiş (satır 0,95 ve 1,9 mm); 1/50 ölçülen çöktürme ve yoğunlaştırma paftalarındaki boy (2,5 mm) esas alındı. Çerçevedeki iki köşegen çizgi (örneklerde var) çizilmez — yardımcı çizgi sayıldı. Rampa katmanı `Ongor` sayıldı.

## 4. Kot, aks, kesit işaretleri
- Kot işareti **`CK_TR1` bloğu** ile konur (**Karar 7**; örneklerde 5 dosyada 287 adet). `KOT101` bloğu kullanılmaz. Katman `Kot`, yazı YZ 2 mm.
- Aks: daire + harf (ARIAL, 5 mm), çizgi tipi ACAD_ISO04W100, kalınlık 0,13, renk 17. Balon yarıçapı **6 mm** (30 birim; 10-İdari, 6-Blower). Numaralar soldan sağa (1, 2 …), harfler **yukarıdan aşağıya** (A en üstte; Konya planında da). Modelde aks yoksa MIMARIPAFTA kolon merkezlerinden (kolonsuz yapıda betonarme perde eksenlerinden) aks türetir. Sayılar: `MIMARI.aks`.
- **Kapı / pencere tip numarası** (14.11.2026): aynı türde aynı ebat aynı numara; numara genişliğe sonra yüksekliğe göre. Önek kullanıcının Konya projesinden: **P** pencere, **K** kapı (çelik dahil), **SEK** seksiyonel kapı, **PA** panjur (Çokal'da P, PA, AK alüminyum kapı, SK seksiyonel). Planda (10-İdari Bina_R2): daire (yarıçap 3 mm) içinde kod (YZ 2 mm), daireden doğramaya çizgi (renk 243), çizginin üstünde genişlik, altında yükseklik (cm, 2 mm); daire duvar ekseninden 15,7 mm dışarıda; katman `YZ`. Kesitte doğramanın üstünde daire içinde kod. Detay başlığı "P1 150/130 ALÜMİNYUM PENCERE" biçiminde. Sayılar: `MIMARI.dogramaNo`. Planda yalnız plan kesit düzleminin kestiği doğramalar numaralanır (yüksek pencereler kesit ve görünüşte).
- **Çizgi tipi ölçeği** (14.11.2026): örnekler cm, `$LTSCALE` 20 (3 dosya; Blower 1), `$CELTSCALE` 1, `$PSLTSCALE` 0 (3 dosya) / 1 (İdari); nesne ölçeği Aks 0,125, Arkagor / Beton_Kesik 2, Kesit_Cizgisi 1, ZMN 2. 1/50 kâğıtta: aks 12 mm çizgi · 1,5 mm boşluk · nokta; gizli çizgi 2 · 1 mm; kesit çizgisi 3 · 0,5 · 0,5 · 0,5 mm; zemin çizgisi 5 · 1 · 1 · 1 · 1 · 1 mm. Program bu desenleri kâğıt mm'si olarak tutar (`MIMARI.cizgiTipi`): pafta penceresinde 1/25, 1/50, 1/100 ölçekte kâğıtta aynı görünür; Mimari grubu DXF'inde `$LTSCALE` = ölçek / 1000, `$PSLTSCALE` 0 (bölüm 6b; 14.11.2026, eskiden 1 / 1).
- **Görünüşte iç elemanlar** (14.11.2026): bina içindeki merdiven, bölme duvarı, ara döşeme, iç kiriş ve ekipman çizilmez (planda dış zarfın içinde kalan ve zarfın üst kotuna ulaşmayan her eleman; zarf elemanın kendi kot aralığındaki düşey elemanlardan). Pencere camı opak sayılır — Çokal görünüşlerinde pencereden içerisi çizilmemiş.
- **Kesit yerleri** (firma kuralı 14.11.2026): uzun kesit bütün mahallerden; kısa kesitler büyük hacimden (ör. montaj holü) ve odalardan (ör. kumanda odası); hiçbir kesitte görünmeyen oda için ek kesit. Hat doğramadan geçmeyi tercih eder, kolonun ve kesite paralel kirişin üstüne gelmez. Mahaller düşey elemanlarla çevrili bölgelerden çıkarılır.
- Kesit çizgisi: CENTER2, renk 133; uçta daire + harf (ARIAL, 5 mm).
- Su tutucu: `sututuc` / `sututucu` bloğu, `Sututucu` katmanı.
- Mimari notlar: `MIMARI NOTLAR` bloğu, `YZ` katmanı.

## 5. Tarama
**Kural (kullanıcı kararı 14.11.2026): "taramalar örnek projede ne ise o şekilde taranacak."** Bu karar 12.11.2026'daki "kesit taraması yalnız DASH ya da SOLID; AR-SAND, ANSI36, ANSI31 kullanılmaz" kararının (Karar 8) yerine geçer.

**Nasıl ölçüldü (14.11.2026):** Çokal R2 setinden 11 dosya (1-Kaba-İnce, 2-Giriş Debimetre_R3, 3-Anaerobik_R3, 4-Havalandırma_R3, 5-Çamursuzlaştırma_R3, 6-Blower, 7-Çökeltme, 8-Geri Devir Terfi, 10-İdari Bina, 12-Çamur Yoğunlaştırma_R3, 17-Klor Temas) ODA ile DXF'e çevrildi; her taramanın katmanı, deseni, ölçeği, açısı ve desen aralığı okundu, malzemesi taramanın sınırındaki katmanlardan (Beton, Tretuvar, Duvar, Toprak …), boyutundan ve yanındaki yazılardan (ör. "Tuğla Duvar", "TRETUVAR DETAYI", mimari notlardaki "8 cm KİLİT PARKE TAŞI") çıkarıldı. Örnek çizimler cm, 1/50; desenler acadiso.

| Malzeme (kesitte) | Katman | Desen | Ölçek | Açı | Desen aralığı (çizimde / 1/50 kâğıtta) | Nerede görüldü |
| --- | --- | --- | --- | --- | --- | --- |
| Kesilen beton (perde, radye, döşeme, kiriş, kolon, kaide) | `Tarama` | **ANSI36** | 50 | 0 | 12,6 cm / 2,5 mm | 1, 6, 7, 8, 10, 12, 17, 5 (en sık; 10-İdari Bina'da 124 adet). 3-Anaerobik, 4-Havalandırma ve 12'nin bir kısmında ölçek 2,5 (aynı aralık: 16 cm) |
| Grobeton | `Grobeton` | **AR-CONC** | 5 | 0 | 36 cm | 1, 2, 5, 6, 7, 8, 10, 12, 17 (en sık). 3-Anaerobik ve 4-Havalandırma'da 0,1 |
| Tuğla duvar (kesit ve plan) | `Tarama` | **AR-B816** | 1 | 0 | 8 cm | 10-İdari Bina (68 adet açı 0, 9 adet açı 90), 6-Blower (7 adet açı 90; 13 adet ölçek 0,05) — en sık: ölçek 1, açı 0 |
| Gazbeton duvar | — | örnekte ayrı deseni yok | | | | program deseni kalır (AR-B816) |
| Dolgu (döşeme altı, temel arası) | `Toprak` | **AR-SAND** | 10 | 0 | 19,3 cm | 10-İdari Bina (6 adet, betonla çevrili döşeme altı). 5-Çamursuzlaştırma (3) ve 6-Blower'da (1) ölçek 0,5 — en sık 10 alındı |
| Tretuvar kaplaması (8 cm kilit parke taşı, 20 cm'lik parçalar) | `Tarama` | **DASH** | 0,5 | 0 | 2,2 cm | 1, 3, 4, 7, 8, 12, 17 (her tretuvarda) |
| Tretuvar kaplama altı (kum yatak / harç, stabilize) | `Tarama` | **AR-SAND** | 0,03 | 45 | 1,5 cm | aynı 7 dosya; örnekte kaplamanın altı tek katman (12 cm) çizilmiş |
| Bordür | `Tarama` | **ANSI31** | 0,5 | 90 | 1,6 cm | aynı 7 dosya (8×20 cm) |
| Tretuvar betonu | `Tarama` | ANSI36 | 50 | 0 | | 1/50 kesitlerde ayrı beton katmanı yok; 10, 5, 6'daki 1/10 TRETUVAR DETAYI'nda beton katmanı ANSI36 |
| Bordür yatak betonu | — | örnekte yok | | | | program deseni kalır (AR-CONC; çıktıda `Grobeton` katmanına gider) |
| Yalıtım | — | örnekte taraması yok | | | | program deseni kalır (ZIGZAG; denetimde uyarı) |
| Su | `Su` | ANSI31 | 20 | 135 | 2,5 cm | 1, 3, 4, 7, 8 (program kesitte su taramaz) |
| Görünüşte tarama | `Ongor` | ANSI31 | | | | |
| Dolu alan | `Solid` | SOLID | | | | |

**Örneklerin birbirini tutmadığı yerler (en sık olan alındı):** beton ölçeği 50 / 2,5 (desen aralığı aynı); grobeton 5 / 0,1; dolgu 10 / 0,5; tuğla açısı 0 / 90. 1/10 tretuvar detayında (10, 5, 6) katmanlar başka desenlerle taranmış (kaplama ve beton ANSI36, harç AR-SAND 0,04, stabilize AR-SAND 0,08); kural 1/50 kesitlerdekini esas alır.
**Örnekte görülen, programda karşılığı olmayan taramalar (kurala alınmadı):** şev `Sev` ANSI31 (8-Geri Devir, 1-Kaba-İnce), yol katmanları `Toprak` AR-SAND 2 ve 10 (asfalt ve temeli), görünüşte tabii zemin şeridi `Toprak` AR-PARQ1 2,5 / 315° (5, 6).
**Beton olmayan kesilen parçalar** (korkuluk, doğrama, merdiven profili, çatı ahşabı): `Tarama` katmanında SOLID — KABUL (kullanıcı doğrulayacak).

**Monolitik döküm (kullanıcı kararı 14.11.2026):** döşemeyle birlikte dökülen kiriş (üstü döşeme üstünde ya da döşeme altında, planda döşemenin altında) kesitte döşemeyle tek gövdedir: tek dış hat, tek tarama, aralarında çizgi yok (katman döşemenin katmanı). Pencere / kapı boşluklu duvar kesitte ve görünüşte tek dış hat + boşluk konturları olarak çizilir; lento ayrı çizilmez. Statik ve metraj kiriş ile döşemeyi ayrı eleman olarak okumaya devam eder.

## 6. Programda uygulanışı (13.11.2026)
Program içeride kendi katman adlarıyla çalışmaya devam eder (eski proje dosyaları bozulmasın diye); kural üç yerde uygulanır (`app/cizim-kural-uygula.js`, eşleme tablosu `app/cizim-kural.js` → `esleme`, `tipKatman`):

1. **AutoCAD çıktısı (2B DXF / disiplin dosyaları):** katman adları bu belgedeki adlara çevrilir, katman tablosuna buradaki renk / çizgi tipi / kalınlık yazılır, nesneler bunları katmandan alır.
2. **Ekran:** yeni üretilen kesit, görünüş, ölçü, kot, aks, yazı ve tarama katmanları buradaki renk, çizgi tipi ve kalınlıkla açılır. Açık bir çizimin eski katmanları için komut: `CIZIMKURAL`. Model katmanlarının (`INS_…`) ekrandaki rengine dokunulmaz.
3. **Tarama:** kesit ve plan taramaları bölüm 5'teki tablodaki desen, açı ve ölçekle çizilir (14.11.2026; `app/kesit.js → secHatchSpec`, sayılar `MIMARI.kesitTarama`). Programdaki ölçek kâğıda göredir: örnekteki desen aralığı korunur (ANSI36 → 0,3937, AR-CONC → 0,7874, AR-SAND dolgu → 1,8251, tretuvar AR-SAND → 0,1391, DASH ve bordür ANSI31 → 0,1; AR-B816 gerçek boyutlu 0,394). Dolgu taraması çıktıda `Toprak`, grobeton `Grobeton` katmanına gider. Eski görünümde (PAFTASTIL KLASIK) programın kendi desenleri kalır.

Program katmanı → çizim katmanı:

| Programdaki katman | Çizim katmanı |
| --- | --- |
| `KESIT`, `KESIT_<eleman>` (perde, temel, döşeme, kiriş, kolon), planda `INS_PERDE`, `INS_KOLON`, `INS_TEMEL…` | `Beton` |
| `KESIT_CATI` (kesilen çatı: makas / aşık / mertek / dikme, kaplama katmanları ve örtü) | `Beton` — kullanıcı kararı 14.11.2026 ("kesitlerde çatı soluk gözüküyor"); kesilen ahşap `Tarama` katmanında SOLID (beton olmayan kesilen parça kabulü), kaplama ve örtü taramasız |
| aynı katmanlardaki kesikli çizgiler | `Beton_Kesik` |
| `GORUNEN`, `GORUNEN_<eleman>`, görünüş (cephe) çizgileri, planda döşeme / kiriş | `Ongor` (kesikliyse `Arkagor`) |
| `…_KORKULUK`, `…_MERDIVEN`, `…_TRETUVAR`, `…_GROBETON`, `…_SU`, `…SU_TUTUCU_BANT` | `Korkuluk`, `Merdiven`, `Tretuvar`, `Grobeton`, `Su`, `Sututucu` |
| `…_TARAMA` | `Tarama` (grobeton ve AR-CONC deseni `Grobeton`, dolgu `Toprak`) |
| `OLCU`, `KESIT_OLCU`, `DETAY_OLCU` ve bütün ölçüler | `ÖL` |
| `KOT`, `…_KOT` ve bütün kot işaretleri | `Kot` |
| `AKS`, `…_AKS` | `Aks` |
| `KESIT_ISARET` | `Kesit_Cizgisi` |
| `ZEMIN` | `ZMN` |
| `YAZI`, `MAHAL_LISTESI`, eleman etiketleri | `Mim_Yazi25` (mahal listesi başlığı `Yazi30`) |
| görünüş başlığı ("A-A KESİTİ") | `Yazi30` (altındaki ölçek satırı `Mim_Yazi25`) |
| `MALZEME_ACILIM` (kesitteki kod, açılım çerçevesi) | `Mim_Yazi25` |
| `MALZEME_ACILIM_YAZI` (açılım çerçevesinin yazıları) | `Yazi25` |
| `MAHAL_ADI` | `MAHAL İSİM` |
| antet ve pafta çerçevesi | `ANTET` (pafta yazıları `YAZI GENEL`, pafta penceresi çerçevesi `Defpoints`) |
| `ARAZI` | `Toprak` |
| kapak detayı (`DETAY_KAPAK`, `DETAY_BETON`, `YAZI_KAPAK`) | `Sac_Kapak`, `Beton`, `Mim_Yazi25` |
| statik (`STA_…`), bina tesisatı (`MT_…`), kazı (`KAZI…`), saha (`SAHA_…`) katmanları | çevrilmez, kendi adıyla kalır |
| boru, pompa, vana, ekipman, poz balonu, boru ekseni | `Mekanik`, `Mek_Yazi`, `Boru_Eksen` (mekanik kuralları kesinleşince güncellenecek) |

**Kabuller (örneklerde karşılığı bulunmadığı için; kullanıcı doğrulayacak):**
- Kat seviyesi çizgisi ve yazısı (`SEVIYE`) → `ZMN` (YZ, 2,5 mm).
- Kesilen tuğla / gazbeton duvarın dış hattı da `Beton` katmanına gider (örneklerde ayrı duvar katmanı yok). Planda parapet ve temel de `Beton` sayılır.
- Kesilen elemanın içindeki ince tarama çizgileri (plan sembolü) → `Tarama`.
- Çeviri yalnız Mimari ve Genel pafta gruplarının çıktısına ve tek dosyalık 2B çıktıya uygulanır; Statik, Mekanik ve Elektrik dosyalarına dokunulmaz.
- Yalıtım, kaplama, dolgu ve kapı / pencere çizgileri → `Ongor` (ince çizgi). Arkada görünen çatı (`GORUNEN_CATI`) da `Ongor`.
- Beton olmayan kesilen parçalar (korkuluk, doğrama, merdiven profili) → **SOLID** tarama.
- 2 mm'den küçük eleman etiketleri (eğim yazısı, "Yağmur borusu" …) çıktıda 2 mm'ye çıkarılır; stili olmayan yazılar `YZ` yazılır.

**Henüz kurala uymayanlar:**
- Örnekte karşılığı olmayan iki malzeme programın deseniyle taranıyor: yalıtım (ZIGZAG; denetimde uyarı) ve bordür yatak betonu (AR-CONC). Gazbeton duvar tuğla ile aynı desende (AR-B816) ama programın ölçeğinde.
- Denetim aracı taramanın yalnız desenine bakar; ölçeği ve açısı denetlenmez (çizim profili bunları okumuyor).
- Tretuvar detayı (TRETUVARDETAY, 1/10) örnekteki 1/10 detaydan farklı desenlerle çiziliyor (`app/tretuvar.js`; bu işte değiştirilmedi).
- Ölçüler AutoCAD'e çizgi + yazı olarak gidiyor (gerçek ölçü nesnesi ve "50" / "1-20" ölçü stili değil).
- Kot işareti `CK_TR1` bloğu olarak değil, çizgi + yazı olarak gidiyor.
- Çizim birimi metre (örnekler santimetre).
- Ölçülendirme: sıra aralığı ve uzatma çizgisi kurala bağlandı; ilk sıranın çizime uzaklığı ve neyin ölçülendirileceği henüz kurala bağlı değil (bölüm 3).

Denetim (Konya terfi inşaat modeli, MIMARIPAFTA → Mimari grubu DXF, 4.785 nesne, 14.11.2026): **UYGUN** — 0 hata (önceki 8 hata: 5 tarama deseni, 3 mahal listesi yazı boyu giderildi), 1 uyarı (ölçü katmanındaki ölçü yazıları).
`node araclar/cizim-karsilastir.js mimari <dosya.dxf> --olcek 50 --birim m`

## 6b. Mimari paftalama (MIMARIPAFTA, 14.11.2026)
Sayılar ve kurallar `app/mimari-pafta.js` (saf kısım) ve `app/mimari-detay.js` içindedir; testler `test/mimari-yerlesim.test.js`, `test/mimari-detay.test.js`, `test/dxf-cizgi-olcegi.test.js`.

- **Ölçek seçimi** (firma kuralı): plan ve kesitler önce 1/50 denenir. Ölçülebilir eşik: en büyük plan / kesit (ölçü sıraları ve aks balonu payı 41 mm, kesitte 30 mm, başlık 15 mm dahil) 1/50'de A1 kullanılabilir alanının (çerçeve ve 200 mm antet sütunu dışı: 601 × 574 mm) eninin ya da boyunun **%40**'ından küçükse 1/25 (1/25'te en çok %80'ini doldurur). 1/50'de A0 kullanılabilir alanına (949 × 821 mm) sığmıyorsa 1/100. Konya terfi: %86 → 1/50.
- **En az kâğıt** (firma kuralı): pafta yüksekliği standart (A1 594, A0 841), genişlik Çokal R2'deki gibi içeriğe göre uzar (R2'de en çok 1454 = 1,73 × 841; programda en çok 1,8 × standart). Görünümler tür tür (kat planları + mahal listesi, kesitler + açılım, görünüşler, kapı / pencere, korkuluk, sac kapak) yerleştirilir; bir türün tamamı açık bir paftanın boşluğuna sığıyorsa oraya, sığmıyorsa tamamını alan en küçük kâğıda (A1, sonra A0) yeni pafta açılır; yer seçimi eklenen kâğıt alanını en aza indirir. Çatı planı, çatı kesitleri ve çatı detayları ayrı paftadadır (kullanıcı isteği). Konya: eski düzen 8 pafta / 5,26 m² (aynı içerik, tür başına pafta) → 3 pafta / 3,31 m².
- **Doğrama detayı** (10-İdari Bina_R2, 1/20): başlık "P1 150/130 ALÜMİNYUM PENCERE" 4 mm, "ÖLÇEK 1/20", "(8 ADET)" 3 mm; GÖRÜNÜŞ (kasa, kanat bölümleri, açılım çizgileri, sabit camda "4+12+4 ısıcam", denizlik), 2-2 KESİTİ, 1-1 KESİTİ; kapıda açılım yayı. Kanat sayısı: ≤ 90 cm tek, ≤ 180 cm iki, büyük üç (İdari: 50, 80 tek; 150 iki; 200 üç).
- **Korkuluk detayı** (10-İdari Bina_R2 rampa korkuluğu, 1/20): görünüş (dikme aralığı zinciri, h = 110), yan kesit. Boru çapları modeldeki korkulukla aynı (Ø42,4 küpeşte / dikme, Ø33,7 ara küpeşte, 150 × 4 tekmelik). Örnekte yok; kullanıcı 14.11.2026'da onayladı: 120 × 120 × 10 mm taban plakası, 2 adet M12 kimyasal dübel.
- **Çatı paftası** (10-İdari Bina_R2 ÇKL-AAT-İB-03, 1/10-50): ÇATI PLANI (iskelet: aşık, mertek, dikme, kuşaklama etiketli; eğim okları; oluk ve iniş borusu), A'-A' (mahya boyunca, uzun) ve B'-B' (mahyaya dik, kısa) çatı kesitleri 1/50, DETAY-A (saçak, oluk) ve DETAY-B (mahya) 1/10. İdari'deki DETAY-C (dere / parapet) ve SAC KAPAK çatı paftasında; Konya kırma çatısında dere yok.
- **Görünüşte toprak altı** (firma kuralı): görünüş zemin kotunda (tretuvarın oturduğu zemin, yoksa "toprak" seviyesi) biter; zemin çizgisi `Toprak` katmanında (6-Blower_R2 ÖN GÖRÜNÜŞ'te zemin çizgisi `Toprak`, tarama yok), binanın iki yanına 2 m (kullanıcı 14.11.2026'da onayladı; örnekte bir yanda 5,4 m, öbüründe komşu çizime kadar).
- **Planda kot** (firma kuralı): yalnız görünen döşemelere (oda başına, farklı kotlu her bölgeye bir); duvar / perde / kolon üstüne kot yok. Kaplamalı döşemede iki kot (10-İdari Bina_R2 planı, KOT katmanı): daire + sağa ≈ 7,6 mm yatay çizgi, üstte bitmiş (kaplama) kotu, altta kaba döşeme kotu, yazı 2 mm, aralık 3,6 mm (ör. +0.53 / +0.45).
- **Kesit sembolü**: Mimari şeridinde KESITSEMBOL (önizlemeli liste, projeye kaydedilir). Çokal R2 sembolü (10-İdari Bina_R2, Kesit_Cizgisi): daire r 5 mm, harf 5 mm, daire merkezinden 8,76 mm tepe, tepeden hat üzerinde ±7,5 mm'ye iki çizgi, daireden içe 13,6 mm hat parçası. Seçilmemiş eski projelerde sembol değişmez.
- **DXF çizgi tipi ölçeği**: Mimari grubu çıktısında `$LTSCALE` = ölçek / 1000 (1/50: 0,05), `$PSLTSCALE` 0 (örnekler: cm, 20, 0); başka ölçekli pencerede görünen nesneye kod 48 = pencere ölçeği / ana ölçek (1/20 → 0,4). Öbür disiplinlerin çıktısı değişmedi.
- **Tasarım alanı**: Mimari görünümleri modelin dışında "MİMARİ" başlıklı bölgede, ızgarada (her tür bir sıra). Öbür disiplinler `C.disiplinBolgesi(dis, w, h)` ile kendi bölgelerini alabilir.

## 7. Mekanik katmanlar (aynı dosyalarda görüldü; `mekanik.md` için not)
`Mekanik` (94; 0,25 – 0,40), `Mek_Ince` (190 / 94; 0,15), `Mek_Kesik` (HIDDEN), `Mek_Yazi` (31; 0,25), `Mek_Marka` (130), `Boru_Celik` (4; 0,30), `Boru_Celik_Kesik` (HIDDEN),
`Boru_HDPE` (5; 0,25), `Boru_HDPE_Kesik` (HIDDEN), `Boru_Eksen` (242, DASHDOT, 0,15), `Sac_Kapak` (251 / 8; 0,15), `G. Merdiven` (94; 0,15), `Profil` (3).
Bunlar mimari bittikten sonra ayrı belgede aynı yöntemle çıkarılacak.

**14.11.2026 kullanıcı onayları:** kesitler bir arada uzatılmış A0 boyunda paftada kalır; pencere detayındaki yazılar (mermer iç denizlik 3 cm, ısı yalıtımlı alüminyum, 4+12+4 ısıcam) İdari Bina örneğindeki gibi; merdiven sahanlıklarına da plan kotu yazılır. Pafta adları: kullanıcı sonra verecek (şimdilik içerikten oluşan ad).

# Mimari çizim kuralları

Bu belge Ömer Bey'in örnek çizimlerinden **ölçülerek** çıkarıldı; tahmin içermez. Örneklerin birbirini tutmadığı sekiz noktada kullanıcı 12.11.2026'da karar verdi (aşağıda "Karar" diye işaretli).
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
| `Toprak` | 27 | Continuous | 0,20 | Zemin / toprak çizgisi |
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
| Ölçü sıraları arası | **5 mm** (159 aralığın 112'si; kalanlar 5,5 – 6) | 6,5 – 7,5 mm (program 7 kullanır) |
| Sıra sayısı | 1, 2 ya da 3 (yalnız 2 yerde 4) | aynı |
| Toplam ölçü | **en dış sırada** (104 yığının 98'i); parça ölçüler içte | aynı |
| Uzatma çizgisi | ölçülen noktaya kadar inmez: ölçü çizgisinin **1 mm** berisinden başlar, ölçü çizgisini **4,1 mm** aşar (toplam 5,1 mm; 1.950 çizginin 1.950'si) | ölçülen noktadan başlar (2 mm boşluk), ölçü çizgisini 1,25 mm aşar |
| Ölçü çizgisinin tiki aşması | 0,5 mm | 1 mm |
| Ölçü türü | hizalı (aligned), eğik tik | aynı |

Programda: ölçü çizimi ve kesitlerin otomatik ölçüleri bu değerleri kullanır (13.11.2026).

**Örneklerde tek bir değer çıkmayan, kullanıcıya sorulanlar:**
- İlk ölçü sırasının çizime uzaklığı örneklerde 6 – 77 mm arasında değişiyordu; kullanıcı 14 mm ve "tretuvarın dışı" dedi (yukarıdaki tablo).
- Planlarda ölçü sıralarının hangi kenarlara konacağı henüz çıkarılmadı.

**Neyin ölçülendirileceği (kullanıcı kuralı, 13.11.2026):** ölçü, mimari olarak ne varsa onu gösterir — **duvar / perde, pencere / kapı, döşeme, boşluk**. Her kenarı ölçen, bir şey ifade etmeyen zincir verilmez.
Kesitte program: yatay zincirde kesilen duvar ve perdelerin kalınlığı ile aralarındaki boşluklar; düşey zincirde temel ve döşeme kalınlıkları, aralarındaki yükseklikler ve sol dış duvardaki pencere / kapı boşlukları; her iki yönde en dışta toplam ölçü. Merdiven basamağı, kiriş kenarı, pah, korkuluk ölçülmez.

## 4. Kot, aks, kesit işaretleri
- Kot işareti **`CK_TR1` bloğu** ile konur (**Karar 7**; örneklerde 5 dosyada 287 adet). `KOT101` bloğu kullanılmaz. Katman `Kot`, yazı YZ 2 mm.
- Aks: daire + harf (ARIAL, 5 mm), çizgi tipi ACAD_ISO04W100, kalınlık 0,13, renk 17.
- Kesit çizgisi: CENTER2, renk 133; uçta daire + harf (ARIAL, 5 mm).
- Su tutucu: `sututuc` / `sututucu` bloğu, `Sututucu` katmanı.
- Mimari notlar: `MIMARI NOTLAR` bloğu, `YZ` katmanı.

## 5. Tarama
| Katman | Desen | Ne için |
| --- | --- | --- |
| `Tarama` (renk 136, 0,09) | **DASH ya da SOLID** (Karar 8) | Kesit taramaları |
| `Grobeton` | AR-CONC | Grobeton |
| `Su` | ANSI31 | Su |
| `Ongor` | ANSI31 | Görünüşte tarama |
| `Solid` | SOLID | Dolu alan |

Not: örneklerde `Tarama` katmanında AR-SAND, ANSI36 ve ANSI31 de kullanılmış. Kullanıcı 12.11.2026'da kesinleştirdi: kesit taraması **DASH ya da SOLID**; AR-SAND, ANSI36 ve ANSI31 kullanılmaz.
**Doğrulanacak:** DASH ile SOLID arasındaki ayrım (hangisi hangi malzeme için). Kesinleşene kadar program kesilen betonu DASH ile tarar (örneklerde en sık kullanılan).

## 6. Programda uygulanışı (13.11.2026)
Program içeride kendi katman adlarıyla çalışmaya devam eder (eski proje dosyaları bozulmasın diye); kural üç yerde uygulanır (`app/cizim-kural-uygula.js`, eşleme tablosu `app/cizim-kural.js` → `esleme`, `tipKatman`):

1. **AutoCAD çıktısı (2B DXF / disiplin dosyaları):** katman adları bu belgedeki adlara çevrilir, katman tablosuna buradaki renk / çizgi tipi / kalınlık yazılır, nesneler bunları katmandan alır.
2. **Ekran:** yeni üretilen kesit, görünüş, ölçü, kot, aks, yazı ve tarama katmanları buradaki renk, çizgi tipi ve kalınlıkla açılır. Açık bir çizimin eski katmanları için komut: `CIZIMKURAL`. Model katmanlarının (`INS_…`) ekrandaki rengine dokunulmaz.
3. **Tarama:** kesilen beton DASH (ölçek 0,50 / açı 0; kâğıtta satır aralığı 0,32 mm) ile taranır.

Program katmanı → çizim katmanı:

| Programdaki katman | Çizim katmanı |
| --- | --- |
| `KESIT`, `KESIT_<eleman>` (perde, temel, döşeme, kiriş, kolon), planda `INS_PERDE`, `INS_KOLON`, `INS_TEMEL…` | `Beton` |
| aynı katmanlardaki kesikli çizgiler | `Beton_Kesik` |
| `GORUNEN`, `GORUNEN_<eleman>`, görünüş (cephe) çizgileri, planda döşeme / kiriş | `Ongor` (kesikliyse `Arkagor`) |
| `…_KORKULUK`, `…_MERDIVEN`, `…_TRETUVAR`, `…_GROBETON`, `…_SU`, `…SU_TUTUCU_BANT` | `Korkuluk`, `Merdiven`, `Tretuvar`, `Grobeton`, `Su`, `Sututucu` |
| `…_TARAMA` | `Tarama` (AR-CONC deseni `Grobeton`) |
| `OLCU`, `KESIT_OLCU`, `DETAY_OLCU` ve bütün ölçüler | `ÖL` |
| `KOT`, `…_KOT` ve bütün kot işaretleri | `Kot` |
| `AKS`, `…_AKS` | `Aks` |
| `KESIT_ISARET` | `Kesit_Cizgisi` |
| `ZEMIN` | `ZMN` |
| `YAZI`, `MAHAL_LISTESI`, eleman etiketleri | `Mim_Yazi25` |
| görünüş başlığı ("A-A KESİTİ") | `Yazi30` (altındaki ölçek satırı `Mim_Yazi25`) |
| `MALZEME_ACILIM` | `YZ` |
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
- Yalıtım, kaplama, dolgu, kapı / pencere ve çatı örtüsü çizgileri → `Ongor` (ince çizgi).
- Beton olmayan kesilen parçalar (korkuluk, doğrama, merdiven profili) → **SOLID** tarama.
- 2 mm'den küçük eleman etiketleri (eğim yazısı, "Yağmur borusu" …) çıktıda 2 mm'ye çıkarılır; stili olmayan yazılar `YZ` yazılır.

**Henüz kurala uymayanlar:**
- Tuğla duvar, dolgu, tretuvar katmanları (kaplama, harç, stabilize, bordür) hâlâ kendi desenleriyle taranıyor (AR-BRSTD, GRAVEL, AR-SAND, ANSI31, ANSI37). Kural "DASH ya da SOLID" dediği için denetim bunları hata sayıyor; hangi malzemenin hangi desenle taranacağı kullanıcıya soruldu.
- Ölçüler AutoCAD'e çizgi + yazı olarak gidiyor (gerçek ölçü nesnesi ve "50" / "1-20" ölçü stili değil).
- Kot işareti `CK_TR1` bloğu olarak değil, çizgi + yazı olarak gidiyor.
- Çizim birimi metre (örnekler santimetre).
- Ölçülendirme: sıra aralığı ve uzatma çizgisi kurala bağlandı; ilk sıranın çizime uzaklığı ve neyin ölçülendirileceği henüz kurala bağlı değil (bölüm 3).

Denetim (Konya terfi inşaat modeli, A-A kesiti + 1,20 kotu planı, 5.376 nesne, 13.11.2026): katman adı, renk, çizgi tipi, kalınlık, yazı stili ve yazı boyu hatasız; kalan 5 hata yukarıdaki tarama desenleri.
`node araclar/cizim-karsilastir.js mimari <dosya.dxf> --olcek 50 --birim m`

## 7. Mekanik katmanlar (aynı dosyalarda görüldü; `mekanik.md` için not)
`Mekanik` (94; 0,25 – 0,40), `Mek_Ince` (190 / 94; 0,15), `Mek_Kesik` (HIDDEN), `Mek_Yazi` (31; 0,25), `Mek_Marka` (130), `Boru_Celik` (4; 0,30), `Boru_Celik_Kesik` (HIDDEN),
`Boru_HDPE` (5; 0,25), `Boru_HDPE_Kesik` (HIDDEN), `Boru_Eksen` (242, DASHDOT, 0,15), `Sac_Kapak` (251 / 8; 0,15), `G. Merdiven` (94; 0,15), `Profil` (3).
Bunlar mimari bittikten sonra ayrı belgede aynı yöntemle çıkarılacak.

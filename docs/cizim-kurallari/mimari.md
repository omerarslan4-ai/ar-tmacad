# Mimari çizim kuralları

Bu belge Ömer Bey'in örnek çizimlerinden **ölçülerek** çıkarıldı; tahmin içermez. Örneklerin birbirini tutmadığı sekiz noktada kullanıcı 12.11.2026'da karar verdi (aşağıda "Karar" diye işaretli).
Çizen ajanlar (`pafta-cizim`) buna göre çizer, `cizim-denetci-mimari` ajanı programın çıktısını buna göre denetler.
Sayıların programın okuduğu hâli `app/cizim-kural.js` içindeki `MIMARI` tablosudur; bu belge ile o tablo aynı şeyi söylemelidir.
Denetim: `node araclar/cizim-karsilastir.js mimari <dosya.dxf> --kagit` (programın pafta çıktısı) ya da `--olcek 50` (model uzayı, cm).

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

**Henüz ölçülmedi — ölçülendirme yerleri.** İlk ölçü sırasının çizimden uzaklığı, sıralar arası aralık, kaç sıra ölçü verildiği (parça ölçü + toplam ölçü),
hangi elemanların ölçülendirildiği (perde kalınlığı, açıklık, aks arası, kot). Bunlar bir sonraki adımda ölçülecek; okuyucu şu an bunu güvenilir çıkarmıyor.

## 4. Kot, aks, kesit işaretleri
- Kot işareti **`CK_TR1` bloğu** ile konur (**Karar 7**; örneklerde 5 dosyada 287 adet). `KOT101` bloğu kullanılmaz. Katman `Kot`, yazı YZ 2 mm.
- Aks: daire + harf (ARIAL, 5 mm), çizgi tipi ACAD_ISO04W100, kalınlık 0,13, renk 17.
- Kesit çizgisi: CENTER2, renk 133; uçta daire + harf (ARIAL, 5 mm).
- Su tutucu: `sututuc` / `sututucu` bloğu, `Sututucu` katmanı.
- Mimari notlar: `MIMARI NOTLAR` bloğu, `YZ` katmanı.

## 5. Tarama
| Katman | Desen | Ne için |
| --- | --- | --- |
| `Tarama` (renk 136, 0,09) | **AR-SAND, DASH ya da SOLID** (Karar 8) | Kesit taramaları |
| `Grobeton` | AR-CONC | Grobeton |
| `Su` | ANSI31 | Su |
| `Ongor` | ANSI31 | Görünüşte tarama |
| `Solid` | SOLID | Dolu alan |

Not: örneklerde `Tarama` katmanında ANSI36 ve ANSI31 de kullanılmış. Kullanıcı 12.11.2026'da önce "AR-SAND", sonra "DASH ya da SOLID olacak" dedi; `Tarama` katmanında bu üç desen kabul edilir, ANSI36 ve ANSI31 kullanılmaz.
**Doğrulanacak:** hangi desen hangi malzeme için (ör. beton kesiti DASH mı SOLID mi, AR-SAND ne zaman)? Kesinleşene kadar program kesilen betonu DASH ile tarar (örneklerde en sık kullanılan).

## 6. Programın bugünkü durumu (fark)
Programın mimari pafta üreten kodunda geçen katman adları: `YAZI`, `ZEMIN`, `EKSEN`, `KOT`, `AKS_BLOK`, `KESIT_OLCU`, `DETAY_OLCU`, `KESIT_POZ`, `K3_BETON_CIZGI`, `MALZEME_ACILIM`, `MAHAL_LISTESI`.
Yukarıdaki tablodaki katmanların (`Beton`, `Ongor`, `Arkagor`, `Korkuluk`, `Kesit_Cizgisi`, `ÖL`, `Mim_Yazi25` …) **hiçbiri kullanılmıyor.**
Yazı ve ölçü biçimi (`PAFTASTIL`) Çokal'a göre ayarlı; katman adı, rengi, çizgi tipi ve kalınlığı ayarlı değil. Ayrıca `PAFTASTIL` içinde `YZ` genişliği 0,75; Karar 4'e göre 0,70 olmalı.
**Sıradaki iş:** pafta çizen kodun katmanlarını `app/cizim-kural.js` tablosuna bağlamak ve programın pafta çıktısını denetim aracından geçirmek.

## 7. Mekanik katmanlar (aynı dosyalarda görüldü; `mekanik.md` için not)
`Mekanik` (94; 0,25 – 0,40), `Mek_Ince` (190 / 94; 0,15), `Mek_Kesik` (HIDDEN), `Mek_Yazi` (31; 0,25), `Mek_Marka` (130), `Boru_Celik` (4; 0,30), `Boru_Celik_Kesik` (HIDDEN),
`Boru_HDPE` (5; 0,25), `Boru_HDPE_Kesik` (HIDDEN), `Boru_Eksen` (242, DASHDOT, 0,15), `Sac_Kapak` (251 / 8; 0,15), `G. Merdiven` (94; 0,15), `Profil` (3).
Bunlar mimari bittikten sonra ayrı belgede aynı yöntemle çıkarılacak.

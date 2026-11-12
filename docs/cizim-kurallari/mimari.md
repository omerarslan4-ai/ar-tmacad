# Mimari çizim kuralları — TASLAK (onay bekliyor)

Bu belge Ömer Bey'in örnek çizimlerinden **ölçülerek** çıkarıldı; tahmin içermez. Onaylanan her satır kural olur:
çizen ajanlar (`pafta-cizim`) buna göre çizer, `cizim-denetci-mimari` ajanı programın çıktısını buna göre denetler.
"KARAR" yazan yerler örneklerde birbirini tutmadığı için kullanıcının seçmesini bekliyor; onlar kesinleşmeden koda işlenmez.

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

**KARAR 1 — aynı işin iki adı.** Örneklerde aynı iş için iki ayrı katman adı kullanılmış; hangisi standart olsun?

| İş | Ad A | Ad B |
| --- | --- | --- |
| Ölçü | `ÖL` (5 dosya; renk 8, 0,15 — bir dosyada renk 147, 0,09) | `Olcü` (3 dosya; renk 147, 0,18) |
| Kot | `Kot` (2 dosya; renk 32, 0,20) | `KOT` (3 dosya; renk 32, 0,20) |
| Aks | `Aks` (2 dosya; renk 17, ACAD_ISO04W100, 0,13) | `AKS` (3 dosya; aynı özellikler) |
| Tarama | `Tarama` (2 dosya; renk 136, 0,09) | `tarama` (3 dosya; aynı özellikler) |

**KARAR 2 — iki katman ailesi.** Dosyalarda yukarıdaki sade adların yanında kodlu bir aile de var
(`MIM_DUVAR_WALL_25`, `YAZI_TEXT_20/25/30/35/60`, `TARAMA_HATCH_01/10/15`, `AKS_AXIS_10/15`, `INS_KAZI_EXCAVATION_25`, `BASLIK_TITLE_35/50`, `GENEL SEMBOL_SYMBOL_15/20/25`).
Program yalnız sade aileyi mi kullansın, yoksa kodlu aile de standardın parçası mı?

**KARAR 3 — "katmandan" kuralı.** Örneklerde nesnelerin çoğu rengini katmandan alıyor, ama bazı katmanlarda elle renk verilmiş
(ör. `Kot` bloklarında renk 32 elle, `Aks` balon yazısında renk 1, `Kesit_Cizgisi` harfinde renk 7, `MAHAL İSİM` renk 240).
Kural "her nesne rengini, çizgi tipini ve kalınlığını katmandan alır" mı olsun; yoksa bu elle renkler de aynen korunsun mu?

## 2. Yazı
| Stil | Font | Genişlik | Nerede |
| --- | --- | --- | --- |
| `YZ` | turkce.shx | **0,70** | Mimari yazılar, kot yazısı, mekanik yazılar |
| `OL` | turkce.shx | 0,65 | Ölçü yazısı ("50", "20", "25" ölçü stilleri) |
| `OL 20` | turkce.shx | 0,85 | Ölçü yazısı ("1-20", "1-5" ölçü stilleri) |
| `ARIAL` | arialbd.ttf (Arial Bold) | 1 | Aks harfi, kesit harfi, mahal adı |
| `TÜRKÇE` | ARIALN.TTF (Arial Narrow) | 1 | Antet yazıları |

Yükseklikler (çizim birimi → 1/50 paftada kâğıt üstü):

| Yazı | Katman | Stil | Yükseklik |
| --- | --- | --- | --- |
| Genel mimari yazı | `Mim_Yazi25`, `Yazi20`, `Yazi25` | YZ | 10 → 2 mm (en sık) |
| Eleman kodu / vurgulu yazı | `Mim_Yazi25`, `ZMN` | YZ | 12,5 → 2,5 mm |
| Küçük yazı | `Yazi25`, `Mim_Yazi25` | YZ | 5 ve 6 → 1 – 1,2 mm (1/20 – 1/25 detaylarda aynı kâğıt boyu) |
| Kot yazısı | `Kot` / `KOT` | YZ | 10 → 2 mm |
| Aks harfi | `Aks` / `AKS` | ARIAL | 25 → 5 mm |
| Kesit harfi | `Kesit_Cizgisi` | ARIAL | 25 → 5 mm |
| Mahal adı | `MAHAL İSİM` | ARIAL / TÜRKÇE | 15 – 20 → 3 – 4 mm |
| Pafta başlığı | `Yazi30` | ARIAL BLACK | 20 → 4 mm |

**KARAR 4 — YZ genişliği.** Örnek dosyalarda `YZ` genişliği 0,70; programdaki pafta stili (`PAFTASTIL`, 11.11.2026 onaylı) 0,75 kullanıyor. Hangisi?

## 3. Ölçü
Beş dosyada ortak olanlar:
- Ölçüler ayrı katmanda (`ÖL` ya da `Olcü`, bkz. KARAR 1): 2.314 ölçünün 2.290'ı. Kalan 24 ölçü antet ve bir mekanik detayda.
- Ölçü ucu **eğik tik** (`_ArchTick`); ok yok.
- Ölçü yazısı çizginin **üstünde** ve çizgiyle **aynı doğrultuda** (yatay zorlanmıyor).
- Ölçü stilinin adı ölçeği söyler: `50`, `25`, `20`, `10` (ve bazı dosyalarda `1-20`, `1-5`).

| Stil | Kullanım | Yazı | Ondalık | Uzatma taşması | Ölçü çizgisi taşması |
| --- | --- | --- | --- | --- | --- |
| `50` (5 dosya, 1.210 ölçü) | 1/50 plan ve kesit | OL, 10 → 2 mm | 2 | 20 birim | 2,4 birim |
| `1-20` (4 dosya, 911 ölçü) | 1/20 detay | OL 20, 5 – 6 | 0 – 1 | 2,5 – 10 birim (dosyadan dosyaya değişiyor) | 2 birim |
| `20`, `25`, `10` | detay ölçekleri | OL, 10 | 2 | — | — |

**KARAR 5 — ölçü stili tek tanım.** `1-20` stilinin değerleri dört dosyada dört ayrı çıkıyor (uzatma boşluğu 0 / 4 / 10, taşma 2,5 / 3 / 8 / 10, ondalık 0 / 1). Hangi dosyadaki tanım esas alınsın? (Öneri: 1-Kaba-İnce-Giriş-Kum Yağ Tutucu_R3; programdaki pafta stili de ondan okunmuştu.)

**KARAR 6 — ondalık.** `50` stilinde ondalık 2 (cm çizimde 12,50 gibi), `1-20` stilinde 0. Programın paftalarında ölçü kaç ondalıkla ve hangi birimle (cm / m) yazılsın?

**Henüz ölçülmedi — ölçülendirme yerleri.** İlk ölçü sırasının çizimden uzaklığı, sıralar arası aralık, kaç sıra ölçü verildiği (parça ölçü + toplam ölçü),
hangi elemanların ölçülendirildiği (perde kalınlığı, açıklık, aks arası, kot). Bunlar bir sonraki adımda ölçülecek; okuyucu şu an bunu güvenilir çıkarmıyor.

## 4. Kot, aks, kesit işaretleri
- Kot işareti **blok** olarak konur: `CK_TR1` (5 dosya, 287 adet) ve `KOT101` (5 dosya, 155 adet); katman `Kot` / `KOT`, yazı YZ 10.
- Aks: daire + harf (ARIAL 25), çizgi tipi ACAD_ISO04W100, kalınlık 0,13, renk 17.
- Kesit çizgisi: CENTER2, renk 133; uçta daire + harf (ARIAL 25).
- Su tutucu: `sututuc` / `sututucu` bloğu, `Sututucu` katmanı.
- Mimari notlar: `MIMARI NOTLAR` bloğu, `YZ` katmanı.

**KARAR 7 — kot bloğu.** `CK_TR1` ile `KOT101` hangi durumda kullanılıyor (ör. biri kesit kotu, öbürü plan kotu mu)?

## 5. Tarama
| Katman | Desen | Ne için |
| --- | --- | --- |
| `Tarama` / `tarama` (renk 136, 0,09) | DASH (en sık), ANSI36, AR-SAND, ANSI31 | Kesit taramaları |
| `Grobeton` | AR-CONC | Grobeton |
| `Su` | ANSI31 | Su |
| `Ongor` | ANSI31 | Görünüşte tarama |
| `Solid` | SOLID | Dolu alan |

**KARAR 8 — hangi desen neye.** DASH, ANSI36, AR-SAND ve ANSI31 desenlerinin her biri hangi malzemeyi gösteriyor (beton kesiti, dolgu, kum, yalıtım)?

## 6. Programın bugünkü durumu (fark)
Programın mimari pafta üreten kodunda geçen katman adları: `YAZI`, `ZEMIN`, `EKSEN`, `KOT`, `AKS_BLOK`, `KESIT_OLCU`, `DETAY_OLCU`, `KESIT_POZ`, `K3_BETON_CIZGI`, `MALZEME_ACILIM`, `MAHAL_LISTESI`.
Yukarıdaki tablodaki katmanların (`Beton`, `Ongor`, `Arkagor`, `Korkuluk`, `Kesit_Cizgisi`, `ÖL`, `Mim_Yazi25` …) **hiçbiri kullanılmıyor.**
Yazı ve ölçü biçimi (`PAFTASTIL`) Çokal'a göre ayarlı; katman adı, rengi, çizgi tipi ve kalınlığı ayarlı değil. Kararlar verildikten sonra yapılacak iş budur.

## 7. Mekanik katmanlar (aynı dosyalarda görüldü; `mekanik.md` için not)
`Mekanik` (94; 0,25 – 0,40), `Mek_Ince` (190 / 94; 0,15), `Mek_Kesik` (HIDDEN), `Mek_Yazi` (31; 0,25), `Mek_Marka` (130), `Boru_Celik` (4; 0,30), `Boru_Celik_Kesik` (HIDDEN),
`Boru_HDPE` (5; 0,25), `Boru_HDPE_Kesik` (HIDDEN), `Boru_Eksen` (242, DASHDOT, 0,15), `Sac_Kapak` (251 / 8; 0,15), `G. Merdiven` (94; 0,15), `Profil` (3).
Bunlar mimari bittikten sonra ayrı belgede aynı yöntemle çıkarılacak.

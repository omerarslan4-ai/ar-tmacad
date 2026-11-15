# Elektrik çizim kuralları

Kaynak: Çorlu AAT elektrik projesi (ERGE Proje, 2012), B-105 Bekçi Binası paftaları — 15.11.2026'da ölçüldü:
`(28) ÇRL E-BB 001` topraklama planı · `(29) ÇRL E-BB 002` aydınlatma ve priz tesisatı · `(30) ÇRL E-BB 003` telefon ve yangın alarm tesisatı
(`test-proje/Çorlu AAT - Elektrik Projeleri`). Sayılar `app/cizim-kural.js` → `ELEKTRIK` tablosundadır; bu belge ile tablo aynı olmalıdır.

## 1. Birim ve ölçek
- Çizim birimi santimetre, ölçek 1/50 (10 birim yazı = kâğıtta 2 mm). Pafta A1, antet sağda (Çokal / DSİ düzeni).
- Mimari altlık elektrik paftasında gri (renk 8) ve soluk durur; elektrik nesneleri onun üstünde renkli.

## 2. Katmanlar
Örnek paftalar birbirini tutmuyor (aynı `EYAZI` katmanı BB-002'de renk 3, BB-003'te renk 6; topraklama paftasında `ELKYAZI`, `ELK YAZI`, `E-YAZI` üç ayrı yazı katmanı var).
Kullanıcı kararı (15.11.2026): "kendin ayarlayabilirsin" — örneklerdeki adlardan **tek düzen** kuruldu; en dolu pafta (BB-002) esas alındı.

| Katman | Renk | Çizgi tipi | Kalınlık | Ne için | Örnekteki yeri |
| --- | --- | --- | --- | --- | --- |
| `EYAZI` | 3 | Continuous | 0,25 | Semboller (armatür, anahtar, priz, pano, dedektör…), etiketler, linye numaraları, tek hat şeması, yükleme cetveli, semboller listesi, notlar | BB-002 / BB-003 |
| `EHAT` | 4 | Continuous | 0,35 | Aydınlatma ve priz linye hatları (sıva altı) | BB-002 |
| `TOPILET` | 4 | HIDDEN | 0,35 | Topraklama iletkeni (30×3,5 galvaniz şerit), temel topraklaması | BB-001 |
| `TLF` | 4 | DOT | 0,25 | Telefon hattı (PYCYM / A-2YF(L)Y) | BB-003 (`SPDDOT`) |
| `ETELYNG` | 1 | DASHED | 0,25 | Yangın alarm hattı (JY(St)Y 2×1,5) | BB-003 (renk 7) |
| `ANTET` | 7 | Continuous | 0,25 | Antet (denetimde serbest) | — |

Eski ad eşlemesi (tablo `esAd`): `ELKYAZI`, `ELK YAZI`, `E-YAZI`, `TLFPRIZ`, `YNGTLFYAZI` → `EYAZI`; `Topraklama` → `TOPILET`.

Notlar:
- BB-003'te yangın alarm hattı `ETELYNG` katmanında renk 7 idi; kâğıtta telefonla karışmasın diye kırmızı (1) ve kesikli yapıldı — bu bir kabuldür.
- `SPDDOT` programda yok; yerine `DOT` kullanılır.
- Nesneler rengini katmandan alır; **bütün yazılar sarı (2)** (linye numaraları, sembol içi harfler dahil) — örneklerde etiket ve tablo yazıları elle renk 2 verilmişti, sembol listesindeki açıklamalar da 2.
- Linye hattı örnekte 2,5 cm genişlikli çoklu çizgiydi; programda kalınlık katmandan (EHAT 0,35 mm) gelir.

## 3. Yazı
- Yazı stili `AAAA` (Arial, genişlik 1). Linye numarası ve sembol içi küçük yazılar `elk` (romanstw.shx, genişlik 0,85).
- Yükseklikler (kâğıt mm): armatür kodu / linye no **2**; yükleme cetveli **2,06**; tek hat şeması yazıları **2,16**; tablo başlığı **2,4**; topraklama detayı yazıları **2,4**; semboller listesi ve notlar **3**; başlıklar ("SEMBOLLER", "TABLO TEK HAT ŞEMASI", "YÜKLEME CETVELİ") **4**.
- Sembol içi yazılar: TDK / FJB kutu yazısı **1,44** (BB-003'te 7,2 birim); dedektör harfi D **2,5**, duman işareti O **1,6** (BB-003: 12,5 ve 8 birim).
- Şema ve tablo çizgi kalınlıkları (mm): çerçeve 0,35 · iç çizgi 0,18 · bara 0,70 · topraklama 0,35 (HIDDEN) · zemin çizgisi 0,13.

## 4. Semboller (cm, 1/50; kâğıtta ÷5 mm) — BB-002 semboller listesinden ölçüldü
| Sembol | Biçim |
| --- | --- |
| Floresan armatür P-2×20W / U-2×20W | iki paralel çizgi 52 × 6,7, uçlarda 12,5 boyunda dik çizgi, ortada balast işareti |
| Floresan armatür P-2×40W / U-2×40W | aynı, boy 104 |
| Aydınlatma tablosu (sıva altı) | 52 × 16,2 dikdörtgen, köşegen çizgili |
| Normal / komütatör / vaevien anahtar | daire R 8, ortada nokta; 1, 2 ya da çapraz 2 kol |
| Etanş anahtar | daire R 8, kol, içi dolu |
| Topraklı priz | yarım daire R 8,3, üstte düz çizgi, toprak çizgisi |
| Etanş priz | aynı, içi dolu |
| Duman / ısı dedektörü | daire R 10, içinde D (duman: üstte O; ısı: çapraz çizgi) |
| Yangın butonu, klakson (K), bağlantı kutusu (FJB) | kare 16 / daire R 8 içinde harf |
| Telefon prizi, dağıtım kutusu (TDK 10ç) | üçgen / dikdörtgen içinde yazı |
| Topraklama çubuğu, bara (TB) | daire R 10 + çarpı, dolu dikdörtgen 40 × 9,6 |

Örnekteki "metesan priz panosu" sembolü bekçi binasında kullanılmadığı için programa alınmadı.

Armatür sembolü gövdenin gerçek boyudur (1,04 / 0,52 m); her ölçekte gerçek boyda çizilir, duvara taşmaz. Öbür semboller açıklama ölçeğiyle büyür (1/50'de tablodaki boy).

Programda semboller blok değil, Çorlu paftalarında olduğu gibi çizgilerden oluşur.

## 5. Etiket biçimi (örnekten)
- Armatür: `P-2x20W` (P = normal IP42, U = etanş IP54), armatürün yanında 2 mm; linye numarası `1`, `2` … armatürün üstünde `elk` 2 mm.
- Linye hattı yanında kablo: `3x2.5 NYA`; tek hat şemasında her çıkış: linye no (01, 02 …), sigorta (`10A.`), kablo (`3x2.5 NYA`), açıklama (`IŞIK LİNYESİ (200W)`), düşey yazılı.
- Besleme: `<besleyen pano> PANOSUNDAN <kablo> NYY`, ana şalter `3x50A.`, kaçak akım `KCAK-3x50A (30mA)`.

## 6. Yükleme cetveli (BB-002'deki sütunlar)
LİNYE NO · IŞIK SORTİ · PRİZ SORTİ · SİGORTA AKIM(A) · CİNSİ · TOPLAM GÜÇ(W) · GÜÇ DAĞITIM (W) R S T · AÇIKLAMALAR / ODA NO;
altında KURULU GÜÇ (W) · DİVERSİTE % · İŞLETME GÜCÜ (W).

## 7. Notlar (BB-002, BB-003)
- Tesisat sıva altı, NYA kablolar PVC boru içinde; bütün hatlar 2,5 mm² NYA.
- 3×2,5 NYA Ø18 PVC, 5×2,5 ve 4×4 NYA Ø26 PVC boru içinden geçirilecektir.
- Işık linyelerinde armatür topraklaması için bütün hatlarda ayrıca 2,5 mm² çıplak bakır iletken çekilecektir.
- Panoya giriş alttan, çıkışlar üstten; pano sıva altı.
- Telefon tesisatı sıva altı, PYCYM ve A-2YF(L)Y kablolarla Ø18 PVC boru içinde.
- Yangın ihbar tesisatında JY(St)Y kablo, Ø18 PVC boru, tesisat sıva üstü.

## 8. Örnekte olmayıp eklenenler (kullanıcı: "eksik varsa tamamla", 15.11.2026)
- Aydınlatma hesabı (Çorlu aydınlatma hesabında bekçi binası yok): mahal başına lümen yöntemi, bakım katsayısı 0,80 (Çorlu hesaplarındaki değer).
- Gerilim düşümü hesabı (besleme ve linyeler), topraklama direnci hesabı, kaçak akım seçimi.
- Kapı üstüne acil çıkış armatürü, giriş kapısı dışına etanş aplik.
- Rapor (Çorlu raporunda bekçi binasına ait bölüm yok).

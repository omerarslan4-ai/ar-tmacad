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
- Nesneler rengini katmandan alır. **Bütün yazılar renk 7** (kâğıtta siyah; linye numaraları, sembol içi harfler, şema ve tablolar dahil). Örneklerde yazılar sarıydı (2); firma kuralı 15.11.2026: "paftalarda sarı renk kullanma, daha gözüken bir renk olsun". Şema / tablo / detay çizgileri de renk 7.
- **Yazı maskesi** (15.11.2026, "yazılar kablo altında kalıyor"): her yazının arkası kâğıt renginde doldurulur (yazı çevresinde 0,6 mm boşluk, tablo `yaziMaske`); çizgiler yazının altından geçer. Çizim sırası: mimari altlık → hatlar → cihazlar ve yazıları (pafta penceresi süzgeci bu sırayla verir). DXF'e maske yazılmaz.
- Linye hattı örnekte 2,5 cm genişlikli çoklu çizgiydi; programda kalınlık katmandan (EHAT 0,35 mm) gelir.

## 3. Yazı
- Yazı stili `AAAA` (Arial, genişlik 1). Linye numarası ve sembol içi küçük yazılar `elk` (romanstw.shx, genişlik 0,85).
- Yükseklikler (kâğıt mm): armatür kodu / linye no **2**; yükleme cetveli **2,06**; tek hat şeması yazıları **2,16**; tablo başlığı **2,4**; topraklama detayı yazıları **2,4**; semboller listesi ve notlar **3**; başlıklar ("SEMBOLLER", "TABLO TEK HAT ŞEMASI", "YÜKLEME CETVELİ") **4**.
- Sembol içi yazılar: TDK / FJB kutu yazısı **1,44** (BB-003'te 7,2 birim); dedektör harfi D **2,5**, duman işareti O **1,6** (BB-003: 12,5 ve 8 birim).
- Şema ve tablo çizgi kalınlıkları (mm): çerçeve 0,35 · iç çizgi 0,18 · bara 0,70 · topraklama 0,35 (HIDDEN) · zemin çizgisi 0,13.

## 4. Semboller (cm, 1/50; kâğıtta ÷5 mm) — BB-002 semboller listesinden ölçüldü
| Sembol | Biçim |
| --- | --- |
| LED armatür P-LED18W / P-LED36W (U-… etanş) | iki paralel çizgi, gövde gerçek boyunda (0,60 / 1,20 m; etanş 0,67 / 1,27 m), en 6,7 (etanşta 8,7), uçlarda 12,5 dik çizgi, ortada işaret; **gövdede iki çarpı = LED** |
| (eski) floresan P-2×20W / P-2×40W | örnekteki biçim, boy 52 / 104 — eski dosyalarda kalır |
| Aydınlatma tablosu (sıva altı) | 52 × 16,2 dikdörtgen, köşegen çizgili |
| Normal / komütatör / vaevien anahtar | daire R 8, ortada nokta; 1, 2 ya da çapraz 2 kol |
| Etanş anahtar | daire R 8, kol, içi dolu |
| Topraklı priz | yarım daire R 8,3, üstte düz çizgi, toprak çizgisi |
| Etanş priz | aynı, içi dolu |
| Duman / ısı dedektörü | daire R 10, içinde D (duman: üstte O; ısı: çapraz çizgi) |
| Yangın butonu, klakson (K), bağlantı kutusu (FJB) | kare 16 / daire R 8 içinde harf |
| Telefon prizi, dağıtım kutusu (TDK 10ç) | üçgen / dikdörtgen içinde yazı |
| Topraklama çubuğu, bara (TB) | daire R 10 + çarpı, dolu dikdörtgen 40 × 9,6 |
| Mekanik cihaz beslemesi (ısıtıcı / klima / fan) | kare 16, içinde `M`, köşegen yarısı dolu; üstünde cihaz adı ve gücü, yanında linye no (15.11.2026) |

Örnekteki "metesan priz panosu" sembolü bekçi binasında kullanılmadığı için programa alınmadı.

Armatür sembolü gövdenin gerçek boyudur (LED: 1,20 / 0,60 m; etanş 1,27 / 0,67 m); her ölçekte gerçek boyda çizilir, duvara taşmaz. Öbür semboller açıklama ölçeğiyle büyür (1/50'de tablodaki boy).

Programda semboller blok değil, Çorlu paftalarında olduğu gibi çizgilerden oluşur.

## 5. Etiket biçimi (örnekten)
- Armatür: `P-LED36W` (P = normal IP40, U = etanş IP65; örnekte floresan `P-2x20W` / IP42 – IP54 idi), armatürün yanında 2 mm; linye numarası `1`, `2` … armatürün üstünde `elk` 2 mm.
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

## 9. LED armatürler (firma kuralı 15.11.2026: "aydınlatmalar LED olsun, bunu belirt")
| Kod | Tanım | Güç | Işık akısı | Renk | IP | Gövde |
| --- | --- | --- | --- | --- | --- | --- |
| P-LED18W | LED lineer armatür | 18 W | 2.150 lm | 4000 K, Ra ≥ 80 | IP40 | sıva üstü alüminyum, opal difüzör 600×70×50 |
| P-LED36W | LED lineer armatür | 36 W | 4.300 lm | 4000 K, Ra ≥ 80 | IP40 | sıva üstü alüminyum, opal difüzör 1200×70×50 |
| U-LED18W | LED etanş armatür | 18 W | 2.000 lm | 4000 K | IP65 | polikarbonat 670×90×80 |
| U-LED36W | LED etanş armatür | 36 W | 4.000 lm | 4000 K | IP65 | polikarbonat 1270×90×80 |
| ACİL | LED acil çıkış armatürü | 3 W | 150 lm | 6500 K | IP42 | 3 saat akülü, "ÇIKIŞ" etiketli |
| APLİK | LED etanş duvar apliği | 15 W | 1.500 lm | 4000 K | IP65 | alüminyum döküm, fotoselli |
Seçim: alan > 12 m² → 36 W, değilse 18 W; ıslak hacim → U (etanş). Lejantta ve armatür listesinde kod, güç, ışık akısı, renk sıcaklığı, Ra, IP ve ömür (50.000 saat L70) yazılır.

## 10. Paftalardaki detaylar (firma kuralı 15.11.2026: "bolca detay, perspektif detaylandırma, standart çizim kurallarına göre")
Detaylar ölçeksiz izometrik (perspektif) şemalardır: oklu açıklama (ince çizgi + yatay çizgi + yazı, ucunda dolu ok), ölçüler mm, başlık 4 mm altı çizili, altında "ÖLÇEKSİZ"; açıklama yazıları 2,4 mm (`detay`), ölçü ve montaj yüksekliği yazıları 2,2 mm (`olcu`), tablo sütun başlıkları 2,2 mm (`sutun`), tablo satırları 2,06 mm (`cetvel`).
- **Aydınlatma ve priz paftası:** aydınlatma hesap tablosu, LED armatür listesi, LED armatür montaj detayı (perspektif), montaj yükseklikleri (duvar görünüşü 1/25: priz +0,40, anahtar +1,10, pano alt kenarı +1,50, buton +1,40, TDK +1,80, acil +2,25), tek hat şeması, yükleme cetveli, semboller, notlar (LED notu dahil), 3B görünüş.
- **Topraklama paftası:** topraklama hesap tablosu (ρ, D, Rh, Rç, çubuk sayısı, toplam R, dokunma gerilimi, şerit boyu), topraklama barası TB-1 perspektif detayı (400×40×5 Cu kalaylı, epoksi mesnet izolatörleri, M10 paslanmaz civatalar, bağlanan iletkenler: pano PE 16 mm², kablo tavası 16 mm², eş potansiyel 6 mm², santral 6 mm², temelden 30×3,5 filiz), temel topraklaması perspektif detayı (beton içinde kenarı üzerinde halka şerit, ≥ 5 cm örtü, mesafe tutucu her 2 m, 1,5 m filiz, Ø20 L = 3 m çubuk, 300×300 muayene kutusu), şerit ek detayı (≥ 10 cm bindirme, 60×60 çapraz klemens 4×M10), semboller, notlar, 3B görünüş.
- **Telefon ve yangın alarm paftası:** dedektör montaj detayı (perspektif; duvar ve armatürden ≥ 0,5 m, kapsama 60 / 30 m²), semboller, notlar, 3B görünüş.

## 11. Yerleşim kuralları (kullanıcı uyarılarından)
- Armatür ve dedektör oda içinde, merkezi duvardan ≥ 0,5 m, armatür uçları ≥ 0,25 m (15.11.2026: "lamba duvarın içine girmiş").
- Topraklama barası panonun hemen altında, bitmiş döşemeden +0,30 m; kapı / pencere önüne konmaz (15.11.2026: "topraklama barası kapının önünde"). Pano, TDK, FJB, buton: kapı ve pencere boşluğundan ve birbirinden uzak, en yakın boş duvar (aynı duvarda yer yoksa mahalin öbür duvarları).

## 12. Mekanik ekipman beslemesi (firma kuralı 15.11.2026: "mekanik ekipmanları göz ardı etmeden projeye eklenmesi gerekiyor")
- Mekanik tesisattaki her elektrikli cihaz (elektrikli ısıtıcı, split klima iç ünitesi, fancoil, fan, rooftop) için cihazın yanındaki en yakın boş duvara sigortalı bağlantı kutusu (`mekbes`) konur. Isıtıcıda +0,30 m, klimada iç ünite kotu, fanda +2,40 m.
- Her cihaz panodan **kendi linyesiyle** beslenir: sigorta ≥ 16 A (1,25 × çalışma akımı), kablo sigortadan büyük akım taşıyan en küçük NYA (en az 2,5 mm²), 3,68 kW üstü üç faz.
- Güç: ısıtıcı = cihaz gücü; split klima = soğutma kapasitesi / EER 3,2 + 30 W; fancoil 60 W; fan = katalog gücü (yoksa 0,04 W/(m³/h), en az 30 W).
- Tek hat şemasında, yükleme cetvelinde (açıklama: cihaz adı ve mahal), semboller listesinde ve raporda (§8a) görünür.

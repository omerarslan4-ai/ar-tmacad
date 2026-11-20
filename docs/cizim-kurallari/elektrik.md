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
- Her cihaz panodan **kendi linyesiyle** beslenir: sigorta ≥ 16 A (1,25 × çalışma akımı), kablo sigortadan büyük akım taşıyan en küçük NYA (en az 2,5 mm²), 3,6 kW üstü üç faz (mekanik modülle aynı eşik).
- Güç: ısıtıcı = cihaz gücü; split klima = soğutma kapasitesi / EER 3,2 + 30 W; fancoil 60 W; rooftop = soğutma gücü / EER 3,2 + 0,04 W/(m³/h) fan; fan = katalog gücü (yoksa 0,04 W/(m³/h), en az 30 W). Mahali bulunamayan cihaz atlanmaz, uyarı verilir (elle besleme noktası konur).
- Tek hat şemasında, yükleme cetvelinde (açıklama: cihaz adı ve mahal), semboller listesinde ve raporda (§8a) görünür.
- **Mekanik envanter** (15.11.2026, "mekanik disiplini teker teker analiz edip elektriğe eksiksiz geçir"): kalorifer — elektrikli ısıtıcı; soğutma — split klima (iç ünite yanından; dış ünite iç üniteden beslenir), kaset fancoil; havalandırma — duvar tipi aspiratör, küçük (kanal / pencere tipi) aspiratör, çatı tipi aspiratör, hücreli fan, rooftop; sıhhi tesisat — elektrikli termosifon (≤ 80 L 2000 W, ≤ 150 L 2500 W, üstü 3000 W; besleme +1,90), çamaşır makinesi (2200 W, +0,90), bulaşık makinesi (2000 W, +0,60); ısı merkezi — kazan dairesi (brülör 1,5 W/kW, en az 100 W; sirkülasyon pompası ρgQH/η; kumanda 50 W) ya da kombi (150 W / ad.); soğutma merkezi — chiller (soğutma kW / 3,0) + soğutma suyu pompası. Kazan ve chiller beslemesi mekanik kolon noktasına konur. Elektriksiz mekanik elemanlar: sulu radyatör, boru, kolon, hava kanalı, menfez, difüzör, panjur, lavabo / klozet / duş / evye / süzgeç.
- Elektrik plan paftasında beslenen mekanik cihazlar soluk (renk 8) gösterilir, besleme kutusunun üstünde cihaz adı ve gücü yazılır; 3B elektrik görünüşüne de girer.

## 13. Pafta düzeni ve AutoCAD çıktısı (kullanıcı kararları 15.11.2026)
- Yazı maskesi yalnız detaylarda (oklu açıklamalar) ve plan nesnelerinde; tablo, tek hat şeması, lejant ve notlarda maske yok ("tablo bozuk": maske satır çizgilerini kesiyordu).
- Detay başlığı ve "ÖLÇEKSİZ" satırı çizimin üstüne, en üst elemanın 4 mm üstüne konur ("yazılar üst üste").
- 3B görünüş yalnız aydınlatma ve priz paftasında; topraklama ile telefon ve yangın alarm paftalarında 3B yok. 3B görünüş çizgisel (VEKTOR, izometrik GB): AutoCAD'de çizgi olarak görünür.
- DXF (ELEKTRIKDXF): tek dosya, her Elektrik paftası bir Layout; model alanında yalnız paftalarda görünenler (kesit planı altlığı, o sistemin elektrik nesneleri, beslenen mekanik cihazlar, şema / tablo / detaylar, çizgisel 3B). Paftaların planları aynı binayı gösterdiği için ikinci ve sonraki paftaların planları model alanında bütün çizimin altına, alt alta kaydırılır (şema / tablo bölgesine binmez).

## 14. Pano (kullanıcı 15.11.2026: "panoyu daha gerçekçi tasarla, şalt malzemelerini göster; perspektif şekilde kablo bağlantılarını, sigortalarını, kaçak akımını")
- Şalt dizilimi yükleme cetvelinden (EL.panoDuzen): 1. ray Q0 anahtarlı otomatik sigorta (ana şalter, 3 modül) + F0 kaçak akım rölesi (4 kutup, 30 mA, A tipi, 4 modül) + P0 parafudr (T2, 40 kA, 4 modül) + H1 faz sinyal lambası (1 modül); sonraki raylar linye sigortaları F1… (1 kutup 1 modül, 3 kutup 3 modül; ışık B, priz / cihaz C eğrisi, 6 kA), yedekler dahil; ray 12 modül × 17,5 mm.
- Pano gövdesi 310 mm × (100 + ray × 135) mm × 95 mm, sıva altı, IP42; altta N (mavi) ve PE (sarı-yeşil) baraları; raylar arasında 40×40 delikli kablo kanalları; sigorta raylarında tarak bara (3 faz + N).
- Paftada: "PANOSU PERSPEKTİF DETAYI (KAPAK AÇIK)" — gövde, montaj plakası, yana açılmış kapak, raylar ve şalt modülleri, Q0 → F0 köprüsü, F0 → tarak bara, besleme alttan (4 damar), çıkışlar üstten, PE barası → TB-1; açıklamalar sol sütunda eşit aralıklı; ölçüler; ve "PANOSU ŞALT MALZEME LİSTESİ" tablosu. Raporda §8b.
- 3B: kapağı açık pano; şalt modülleri (ana şalter kırmızı kol, kaçak akım mavi kol, parafudr turuncu, sinyal lambaları), tarak bara, N / PE baraları, giriş ve çıkış kabloları. Duvar oyulmadığı için 3B'de gövde duvar yüzüne oturur.

## 15. Proses üniteleri (havuzlar) — E-BP düzeni (kullanıcı kararları 20–21.11.2026)
Kaynak: Çorlu AAT T-200 A/B/C BİO-P ANAEROBİK HAVUZU, `(31) ÇRL E-BP 001` güç, kumanda, enstrüman kablo ve tava planı · `(32) … 002` topraklama planı ·
`(33) … 003` aydınlatma ve priz tesisatı planı — 21.11.2026'da ölçüldü (birim cm, ölçek 1/50; 10 birim yazı = 2 mm). Program: `app/el-unite.js` (ELUNITEPAFTA).
Bina (yaşam alanı) elektriği §1–14 düzeninde kalır; havuz tipi üniteler bu düzende üç pafta alır.

### Örnekteki düzen (birebir alınanlar)
- **Kablo kodu** `<tür>-<pano>/<ekipman kodu>`: `GK` güç, `KK` kumanda, `KK-LK` lokal kumanda; pano no 1 = MCC-1, 2 = 2. kademe (lokal panodan motora). Etiket iki satır: kod, altında `4x2.5 mm² NYY <boy> mt`; ekipmandan eğik çizgi + yazının altını çizen yatay çizgiyle çıkar.
- **Kapak motoru** (örnekte MK-200/n, 0,37 kW): `GK-1/<kod>` 4x2.5 mm² NYY + `KK-1/<kod>` 10x1.5 mm² NYY, ikisi de MCC-1'den.
- **Mikser** (örnekte K-200A…F, 3,1 kW): `KK-LK-1/<kod>` 10x1.5 mm² NYY (MCC-1 → saha lokal kumanda panosu LCU-<kod>), `GK-2/<kod>` 4x2.5 mm² NYY ve `KK-2/<kod>` 3x1.5 mm² NYY (2. kademe; LCU → JB-<kod> → motor). Yürüme yolunda motorun yanında JB (junction box), korkulukta LCU.
- **Enstrüman** (örnekte ORP, FIT): `PLC-1/<kod>-1` 3x1.5 mm² NYY (besleme) + `PLC-1/<kod>-2` 3x1.5 mm² LIYCY (sinyal). Anaerobik havuzda enstrüman yok; veri yapısında yeri var.
- **Kablo tavası**: yürüme yolu boyunca, perde üst kotunun 0,82 m altında (örnek perde üstü +37,32, tava EL +36,50; ikinci tava 0,20 m üstte), `100mm KABLO TAVASI` / `2x100mm KABLO TAVASI`, altında `EL +<kot>` (iki tava: `EL +36.70 EL +36.50`).
- **Semboller** (örnek lejant): ana dağıtım ve motor besleme panosu, PLC panosu, ekipman güç ve kumanda panosu, saha lokal kumanda panosu (kare 11,9 cm, köşegenli), junction box (küçük kare), elektrik motoru (daire R 15,6 cm, içinde `M` / `3~`), güç kabloları (sürekli, mavi), kumanda kabloları (sürekli, yeşil), 2. kademe güç / kumanda (kesikli), kablo etiketi açıklaması (KABLO NOSU · ÇIKTIĞI PANO ADI · GÜÇ / KUMANDA KABLOLARI · LOKAL KUMANDA).
- **Notlar** (001): 1- kuvvet kabloları kanal ile yapı arasında PVC borulara; 2- yürüme yolu kenarındaki kuvvet kabloları galvanizli delikli kablo tavası üzerine; 3- açıktan geçen kablolar galvanizli boru içinden. **"GALV. BORULARDAN GEÇEN KABLOLAR"** tablosu (BORU · KABLO): 3/4" 2*1,5 3*1,5 4*1,5 · 1" 4*2,5 3*4 4*4 3*6 · 1 1/4" 4*6 4*10 4*16 · 1 1/2" 3*25+16 3*35+16 · 2" 3*50+25 · 2 1/2" 3*70+35 3*95+50 · 3" 3*120+70 3*150+70.
- **Topraklama** (002): havuz çevresinde 30x3.5 galvanizli şerit halka, temel topraklama iletkeni (30x3.5), köşelerde bakır kılıflı çelik çubuk (Ø20, L = 3 m; örnekte 4 adet, TE no'lu), topraklama barası TB (40x5 Cu) — bağlananlar: lokal pano, elektrikli ekipmanlar, kablo tavası, korkuluk (≥ 16 mm² Cu), "(TB-..) TOPRAKLAMA BUSBAR DETAYI"; TOPRAKLAMA SEMBOLLERİ tablosu (SEMBOL · AÇIKLAMA: topraklama iletkeni, temel topraklama iletkeni, çubuk, bus-bar, terminal bağlantısı).
- **Aydınlatma ve priz** (003): korkuluğa monte etanş armatür yürüme yolu boyunca **4,80 m** aralıkla (örnekten ölçüldü), 3" galvaniz boru direk (korkuluk üstünden 3500 mm), Ø10 U-bolt, L 50x50x6 150 mm kaynak; korkuluğa monte etanş anahtar kutusu (BHAK); ışık linyesi 3x2.5 NYY; 3 fazlı priz panosu (1x16A + 3x32A, 3000 W, 4x4 NYY, 3x40A); "BHAK ANAHTAR KUTUSU TEK HAT ŞEMASI": besleme `GK-1/BHAK` 4x6mm2 NYY MCC-1 panosundan, ana şalter 3x50A, ışık linyeleri 10A, priz panosu beslemeleri 3x40A, yedekler; "METAL KORKULUĞA MONTELİ ETANŞ ANAHTAR KUTUSU" ve "… ETANŞ ARMATÜR MONTAJI" detayları; SEMBOLLER.

### Firma kurallarıyla değişenler
- Armatür **LED etanş** (`U-LED36W`, IP65; örnekte U-2x40W floresan).
- Yazılar renk 7 (örnekte sarı 2). Örnekte kablo tavası çizgileri sarı (`Elektrik` katmanı, renk 2) idi; sarı kullanılmaz → tava renk 7 (kabul).
- Kablo **boyu yazılmaz** (MCC yeri genel yerleşimde): etiket ikinci satırı `4x2.5 mm² NYY` + boy yerine boşluk; kablo listesinde BOY sütunu "genel kablolamada". Veri: her kablo `{ kod, tur, cins, nereden, nereye, boy: null }`.
- Kablo kesiti motor gücünden (akım taşıma): In = P / (√3 · 400 · cosφ · η), cosφ 0,85, η 0,87 (kabul); NYY havada / tavada (VDE 0298-4, 30 °C) × tava gruplama 0,80 (kabul) ≥ 1,25 · In; en küçük 2,5 mm². Gerilim düşümü boy gelince.
- 10x1.5 kumanda kablosu örnekteki galvaniz boru tablosunda yok: dış çapı (≈ 17 mm) 4x2,5'e yakın olduğu için **1"** boruya konur (kabul).
- Pergel vinç (elektrikli palanga) örnekte yok: `GK-1/<kod>` güç kablosu; kumanda palanganın kendi sarkıt butonundan (KK yok) — kabul.

### Katmanlar (tek düzen; §2'ye ek)
| Katman | Renk | Çizgi tipi | Kalınlık | Ne için | Örnekteki |
| --- | --- | --- | --- | --- | --- |
| `ELK_GUC` | 5 | Continuous | 0,25 | Güç kabloları | `KAB1` (5) |
| `ELK_KUMANDA` | 3 | Continuous | 0,25 | Kumanda / lokal kumanda / enstrüman kabloları | `KAB2` (3) |
| `ELK_GUC2` | 5 | HIDDEN | 0,25 | 2. kademe güç kabloları | lejant (kesikli) |
| `ELK_KUMANDA2` | 3 | HIDDEN | 0,25 | 2. kademe kumanda kabloları | lejant (kesikli) |
| `ELK_TAVA` | 7 | Continuous | 0,35 | Kablo tavası | `Elektrik` (2 → 7) |
Semboller ve yazılar `EYAZI`, topraklama `TOPILET`, ışık / priz linyeleri `EHAT` (§2).

### Yazı (kâğıt mm, örnekten)
Kablo etiketi ve ekipman kodu / gücü **2** (KABYAZI 10) · JB / LCU etiketi **1,5** (7,5) · tava etiketi **2** · lejant ve notlar **3** · paftadaki MCC yönü yazısı **4** · tablo (galv. boru) **2,5** (12,38).

### Örnekte birbirini tutmayanlar (kullanıcıya soruldu / sorulacak)
- Mikserlerde MCC-1'den lokal panoya **güç kablosu yok** (yalnız KK-LK-1, GK-2, KK-2). Program örnekteki gibi çizer; sorulacak: MCC → LCU güç kablosu (GK-1/<kod>) eklensin mi?
- BHAK tek hat şemasında toplam **7400 W** yazıyor, çıkışların toplamı 2 × 600 + 2 × 3000 = **7200 W**. Program çıkışları toplar.
- Örnek paftada LCU etiketlerinden ikisi `LCU-K-200A`, JB etiketleri çoğunlukla `JB-K-200/A` (kopyala-yapıştır); program her ekipmana kendi kodunu yazar (LCU-<kod>, JB-<kod>).

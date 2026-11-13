# Statik çizim kuralları — TASLAK (onay bekliyor)

Kaynak: Çokal AAT R1 statik paftaları (`Masaüstü\03-Statik`), 13.11.2026'da ölçüldü:
D4 Havalandırma Havuzu · D5 Çamur Susuzlaştırma Binası · D6 Blower Binası · D8 Geri Devir Terfi Merkezi.
Sayılar `app/cizim-kural.js` → `STATIK` tablosundadır; bu belge ile tablo aynı olmalıdır.
Denetim: `node araclar/cizim-karsilastir.js statik <dosya.dxf> --olcek 50 --birim cm`.

Bu taslakta yalnız **dört örnekte de aynı olan** değerler kural yapıldı. Örneklerin birbirini tutmadığı yerler en altta "Açık sorular"dadır; kullanıcı karar verene kadar program o konularda bugünkü hâliyle kalır.

## 1. Birim ve ölçek
- Çizim birimi santimetre. Ana ölçek 1/50 (10 birim yazı = kâğıtta 2 mm).
- 1/20 detaylar ayrı ölçekte değil, 1/50 uzayında 2,5 kat büyütülerek çizilir (ölçü stili `20` ve `BEAM`, ölçü çarpanı 0,4).
- Büyük havuzlarda plan 1/100 (ölçü stili `100`).

## 2. Katmanlar (dört örnekte aynı)
| Katman | Renk | Çizgi tipi | Kalınlık | Ne için |
| --- | --- | --- | --- | --- |
| `DN` | 7 | Continuous | 0,53 | Donatı çizgisi, kesitte çubuk noktası, etriye |
| `DN1` | 3 | Continuous | 0,15 | Donatı etiketi, poz balonu, gösterge çizgisi |
| `ÖL` | 147 | Continuous | 0,15 | Ölçüler |
| `KOT` | 3 | Continuous | 0,15 | Kot işareti ve yazısı |
| `AX` | 17 | ACAD_ISO04W100 | 0,09 | Aks çizgisi, balonu, harfi |
| `KS` | 133 | CENTER2 | 0,15 | Kesit çizgisi, dairesi, harfi |
| `BE` | 6 | Continuous | 0,40 | Kesilen beton dış hattı |
| `BK` | 12 | HIDDEN | 0,20 | Betonun gizli kenarı |
| `ÖN` | 9 | Continuous | 0,15 | Ön görünüş çizgileri |
| `AG` | 8 | HIDDEN | 0,13 | Arka görünüş / gizli kenar |
| `TR` | 136 | Continuous | 0,09 | Kesit taraması |
| `TP` | 36 | Continuous | 0,20 | Toprak / dolgu |
| `GR` | 223 | Continuous | 0,15 | Grobeton |
| `YZ` | 7 | Continuous | 0,15 | Genel yazı, başlık, ölçek, eleman adı |
| `KR` | 80 | Continuous | 0,30 | Kalıp planında kiriş (yalnız bina) |
| `DSM` | 4 | Continuous | 0,20 | Döşeme (yalnız bina) |
| `HTL` | 244 | Continuous | 0,25 | Hatıl (yalnız bina) |
| `ST` | 2 | Continuous | 0,13 | Su tutucu bant (havuz / terfi) |
| `S-METRAJ` | 7 | Continuous | — | Donatı metraj tablosu (havuz / terfi) |

Antet ve genel not katmanları (`ANTET`, `Antet Ince`, `Antet Kalın`, `GNY`) mimariyle aynıdır.

## 3. Yazı
- Donatı etiketi, boy, poz numarası, kot, kolon / kiriş / döşeme adı: **2 mm**. Parça / kanca boyu ve "üst / alt" notu 1,6 mm.
- Aks ve kesit harfi 5 mm (Arial Bold). Poz balonu Ø4 mm. Kesit dairesi Ø10 mm.
- Ana başlık 5 mm, altı çizili, büyük harf; **altında ayrı satırda** ölçek `ÖL:1/50` (boşluksuz; 2,4 – 3 mm; renk 32). Detay başlığı 4 mm.
- Başlık kalıpları: `KOLON APLİKASYON PLANI`, `+3.75 KOTU KALIP PLANI`, `+3.75 KOTU DONATI DETAYI`, `TEMEL DONATI DETAYLARI`, `A-A KESİTİ`, `1-1 KESİTİ`, `P1 PERDE DONATI METRAJI`.
- Adlar: kolon `S1 (40/60)`; kiriş `K101` (1. kat), `K201` (2. kat) + `30/60`; döşeme `D101` + `h=15`; hatıl `HATIL 20/40`; perde `P1`.
- Donatı etiketi (bina paftaları) parçalıdır ve her parça ayrı renktedir: adet + çap + aralık `23Ø10/20` (renk 3) · boy `L=300` (renk 2; cm, birim yazılmaz) · poz numarası daire içinde (renk 6) · parça boyu `30` (renk 5) · konum `üst / alt` (renk 4). "ad." ve "cm" yazılmaz.
- Etriye: kolonda bölge bölge, 90° dönük `17Ø10/9`; kirişte `13x1ø10/10 – 9x1ø10/20 – 13x1ø10/10` ve altında bölge boyları.

## 4. Ölçü ve tarama
- Ölçü gerçek ölçü nesnesidir; ucu eğik tik; yazı çizginin üstünde ve çizgi doğrultusunda; yazı 2 mm; iki ondalık (`50` stili — sayıları mimarideki `50` stiliyle aynı).
- Kesilen beton **ANSI36** (ölçek 25); döşeme ANSI33; grobeton AR-CONC; dolgu GRAVEL / AR-SAND.

## 5. Pafta içerikleri (bina — D5 düzeni)
1. Temel donatı detayları, A-A / B-B kesitleri, tip kesitler (1/20).
2. **Kolon paftası:** kolon aplikasyon planı (`ÖL:1/20-50`: akslar 1/50, kolon kesitleri büyütülmüş; her kolonda `S1 (40/60)` ve altında boyuna donatı `14ø16`) · kolon boyuna detayı (temelden çatıya, solda kot dizisi, etriye bölgeleri, yanda boyuna donatı açılımı `112Ø16` + `(8*14)` + `L=`) · etriye ve çiroz açılımı · guse donatı detayı · kanca ve bindirme standart detayları. Kolon tablosu yok.
3. Her kat için **kalıp planı** (`+3.75 KOTU KALIP PLANI`) + aynı kotun döşeme donatı planı + A-A / B-B.
4. **Kiriş paftası (1/20):** her kiriş grubu (`K101-K102 30/60`) için boyuna görünüş; altında etriye bölgeleri ve boyları; altında çubuk açılımı satır satır (üst düz · gövde · alt düz · mesnet ilavesi; her satırda düz boy + kanca, poz, adet-çap, `L=`); sağında A-A en kesiti ve etriye açılımı. Pilye yok.
5. Donatı metraj tablosu (biçimi açık soru 1).

Havuz / terfi paftaları: kalıp planı (`91.13 ve 94.95 KOTLARI KALIP PLANI`), kesitler, perde donatı detayları (`P1 …`), her açılımın yanında poz satırı (`25Ø18/20 L=870` + `üst / alt / iç / dış`), metraj tabloları.

## 6. Programın bugünkü statik paftasıyla fark (düzeltilecekler)
- Katman adları (`STA_*`) ve renkleri örneklerle tutmuyor; kalınlık tanımlı değil → çıktı eşlemesi `STATIK.esleme` ile yapılacak.
- Tek yazı stili (Arial 0,8); etiket tek parça ve `ad.` / `cm` yazıyor; poz balonu Ø4,8 mm; başlık 3,5 mm ve ölçek `Ö: 1/50`.
- Ölçüler çizgi + yazı (gerçek ölçü nesnesi değil); tarama yok; birim metre.
- Kolon aplikasyon planı, kolon boyuna detayı, kiriş açılımı ve katlara göre kalıp planı örnek düzeninde değil.

## Açık sorular (örnekler birbirini tutmuyor — tahmin edilmedi)
1. **Metraj tablosu:** havuzda `S-METRAJ` tablosu (boy m) · binada "KİRİŞ DETAY AÇILIMLARI DEMİR METRAJI" (boy cm, ŞEKİL sütunu) · blower binasında tablo yok. Hangisi standart; binada kolon / temel / döşeme metrajı istenir mi?
2. **Donatı etiketi yazısı ve renkleri:** binada Arial Narrow, etiket 3 / boy 2 / poz 6 · havuzda turkce.shx, etiket 2 / poz 3. Tek kural mı, yapı türüne göre iki kural mı?
3. **Ölçü yazısı stili:** binada `OL` (turkce.shx 0,75), havuzda `YZ` (0,70).
4. **Kiriş açılımı katmanları:** D5'te uzun adlar (`Etriye`, `Donatı Çizgi`, `Ölçü Çizgi` …), D6'da kısa adlar (`DN`, `DN1`, `KR`, `ÖL`). Hangisi?
5. **Kot işareti:** havuzda `CK_TR1` bloğu (mimarideki gibi) · binada çizgi + daire + yazı.
6. **Başlık boyu:** ana başlık D5'te 5 mm, D6'da çoğu 4 mm; kiriş grubu başlığı D5'te 2 mm, D6'da 4 mm.
7. **Mimariyle farklar** (aynı proje): ölçü rengi statikte 147 / mimaride 8; kesilen beton taraması ANSI36 / mimaride DASH; katman adları kısa (`KS`, `TR`, `AX`, `BE`) / mimaride uzun (`Kesit_Cizgisi`, `Tarama`, `Aks`, `Beton`). Statikte kısa adlar ve ANSI36 mı esas?
8. **Elle renk:** statik örneklerde donatı yazılarının anlamı nesneye verilen renkle ayrılıyor; mimarideki "her şey rengini katmandan alır" kuralı statikte uygulanmayacak mı?
9. **Aks balonu çapı** Ø9 – 12 mm arasında değişiyor; **çap işareti** üstü çizgili `Ø` ile küçük `ø` karışık.
10. `BED` katmanının rengi (6 / 205) ve kullanımı bilinmeyen katmanlar: `HA`, `MR`, `EG`, `TM`, `KNL`, `BAX`, `BR`, `SD`.

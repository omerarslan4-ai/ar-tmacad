# Çelik çizim kuralları

Kaynak: Korkuteli AAT çelik genel yerleşim paftaları `test-proje/ÇELİK/GENEL.dwg` (KOR.AAT-Ç-UV-01 / 02, Ocak 2017) ve `GENEL1.dwg` — 15.11.2026'da ölçüldü.
Örnekler Tekla çıktısı: çizim kâğıt mm, ölçek 1/50, yazı tipi ARIAL_NARROW (başlıkta ARIAL); içerik planlar ve aks görünüşleri (ÇATI YERLEŞİM PLANI, +936.765 KOTU YERLEŞİM PLANI, 1–4 ve A–B AKSI GÖRÜNÜŞÜ).
Sayılar `app/cizim-kural.js` → `CELIK` tablosundadır; bu belge ile tablo aynı olmalıdır. Çelik modülü (`app/celik.js`) her çizgiyi kendi rol katmanına yazar (DXF'te ayrı katman).

## 1. Katmanlar
Örnekteki katman adları Tekla'nın İngilizce adlarıdır (profiller "Symbol text", poz "Part mark", bulon "Bolt" …). Kullanıcı kararı (15.11.2026): **adlar Türkçe, renk ve çizgi tipi örnekteki gibi.**

| Katman | Renk | Çizgi tipi | Kalınlık | Ne için | Örnekteki karşılığı |
| --- | --- | --- | --- | --- | --- |
| `CELIK_PROFIL` | 2 | Continuous | 0,35 | Profil dış hattı (planda kesit / kenar çizgileri, detayda levha ve profil) | Symbol text, sarı |
| `CELIK_EKSEN` | 1 | `CELIK_EKSEN` (3 −1 1 −1) | 0,18 | Eleman ekseni, delik ekseni | Symbol text, kırmızı XKITLINE03 |
| `CELIK_GIZLI` | 1 | `CELIK_GIZLI` (2 −2) | 0,18 | Görünmeyen kenar | Symbol text, kırmızı XKITLINE02 |
| `CELIK_BULON` | 2 | Continuous | 0,35 | Bulon, ankraj, somun (betondaki kısmı `CELIK_GIZLI` çizgi tipiyle) | Bolt, sarı (gizli kısmı kesikli) |
| `CELIK_POZ` | 6 | Continuous | 0,25 | Poz no mor; profil adı aynı katmanda sarı (2) | Part mark |
| `CELIK_OLCU` | 7 | Continuous | 0,18 | Ölçü çizgileri beyaz, ölçü yazısı ve uç işaretleri sarı (2) | Dimension |
| `CELIK_NOT` | 7 | Continuous | 0,18 | Açıklama / bulon işareti oku beyaz, yazısı sarı (2) | Bolt mark ("4 M 24 ANKRAJ") |
| `CELIK_BASLIK` | 3 | Continuous | 0,35 | Görünüş / detay başlığı, altı çizili | Other object type, yeşil |
| `CELIK_DIGER` | 4 | Continuous | 0,25 | Çelik olmayan nesne (beton, harç) | Symbol text, camgöbeği |
| `CELIK_METRAJ` | 7 | Continuous | 0,18 | Çelik metraj tablosu | örnekte yok (kabul) |

Çizgi tipi desenleri kâğıt mm'dir (örnekteki XKITLINE03 = 3 −1 1 −1, XKITLINE02 = 2 −2).

**Kalınlık:** örnekte bütün çizgilerin kalınlığı 0 (renge göre basılıyor). Kullanıcı kararı (15.11.2026): renge göre öneri kabul — sarı 0,35 · kırmızı 0,18 · beyaz 0,18 · mor 0,25 · yeşil 0,35 · camgöbeği 0,25 mm.

## 2. Yazılar (kâğıt mm)
| Yazı | Yükseklik | Renk | Örnek |
| --- | --- | --- | --- |
| Poz no | 3,0 | 6 | KL1, KR3, AS5 |
| Profil adı | 2,5 | 2 | IPE300 |
| Ölçü yazısı | 2,5 | 2 | 3400 |
| Bulon işareti / açıklama | 2,5 | 2 | 4 M 24 ANKRAJ |
| Görünüş başlığı (altı çizili) | 2,5 | 3 | 1 AKSI GÖRÜNÜŞÜ |
| Aks harfi / numarası | 4,0 | 3 (balon ve çizgi 1) | A, 1 |
| Detay yazısı, metraj tablosu (kabul — örnekte yok) | 2,5 | 2 | TABAN LEVHASI …, ÇELİK MALZEME LİSTESİ |

İki örnek poz ve aks yazısında birbirini tutmuyordu (GENEL1.dwg'de poz 2,5 / profil 2,0, aks 3,0). Kullanıcı kararı (15.11.2026): **GENEL.dwg** (3,0 / 2,5, aks 4,0).

## 3. Poz işareti ve profil adı
- Poz no üstte (mor), profil adı altında (sarı), elemana paralel.
- Profil adı boşluksuz ve örnekteki yazımla: `IPE300`, `HEA200`, `UNP100` (UPN değil), köşebent `L100*10` (eşit olmayanda `L100*50*8`), `D12` (gergi çubuğu).
  Örnekte olmayanlar (kabul): kutu `KUTU100*100*5`, boru `BORU114.3*6.3`, lama `LAMA50*5`.
- Poz kısaltmaları (örneğin antetindeki KISALTMALAR): **KL** kolon · **KR** kiriş · **AS** aşık · **GR** gergi çubuğu · **YC** yatay çapraz · **DC** düşey çapraz · **M-KR** monoray kirişi.
  Program vinç yolu kirişine de M-KR verir (kabul). Aynı profil ve aynı boydaki elemanlar aynı pozu alır (`CELIKPOZ`).

## 4. Örnekte olmayanlar (kabul, onay bekliyor)
- **Birleşim detayları** (taban levhası, alın levhası, aşık bağlantısı) ve **metraj tablosu** örneklerde yok; renkleri yukarıdaki rollere göre çizilir, biçimleri programın kendi düzenidir.
- Yazı tipi: örnekte ARIAL_NARROW (başlıkta ARIAL); program şimdilik kendi yazı stiliyle yazar.
- Gergi çubuğu (D12, GR pozu) katalogda yok; GR öneki gergi çubuğu eklenince kullanılacak.
- Detaylar 1/10 ölçekte çizilir (ölçek detay nesnesinde değiştirilebilir).
- Taban levhası, alın levhası ve ankraj / bulon ölçüleri **ön boyuttur** (kesit boyuna göre öneri); statik hesap yerine geçmez.
- Bulon / ankraj kalitesi detaylarda: ankraj 8.8, alın levhası bulonu 10.9, aşık bulonu 8.8. Köşe kaynağı a ≈ 0,6 × başlık kalınlığı.
- Profil değerleri tablodan değil, kesitin gerçek dış hattından (köşe yarıçapları, IPN / UPN eğimli başlık) hesaplanır; yayımlanmış tablolarla fark %2'nin altında (I, U, köşebent, kutu, boru çoğunda %1'in altında, UPN400 Ix %1,1; T profilde eğimler basitleştirildiği için %1,6'ya kadar) (`test/celik-profil.test.js`).

## 5. Açık sorular
- Firma birleşim detayı ve çelik metraj tablosu örneği (kaynak sembolü, bulon gösterimi, tablo sütunları) gelince ölçülecek.

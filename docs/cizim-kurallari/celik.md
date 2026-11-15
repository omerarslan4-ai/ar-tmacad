# Çelik çizim kuralları — TASLAK (örnek çizim bekleniyor)

15.11.2026'da çelik yapı araçları eklendi (`app/celik-profil.js`, `app/celik.js`, şeritte **Çelik** sekmesi).
Kullanıcıdan henüz örnek çelik paftası gelmedi; aşağıdaki katmanlar program içinde düzen olsun diye konuldu, **ölçülmüş kural değildir**.
Sayılar `app/cizim-kural.js` → `CELIK` tablosundadır; bu belge ile tablo aynı olmalıdır.

## Katmanlar (geçici)
| Katman | Renk | Çizgi tipi | Kalınlık | Ne için |
| --- | --- | --- | --- | --- |
| `CELIK_ELEMAN` | 4 | Continuous | 0,35 | Çelik kolon, kiriş, çubuk (planda kesit / kenar çizgileri, 3B gövde) |
| `CELIK_AKS` | 1 | CENTER2 | 0,13 | Eleman ekseni (eleman nesnesinin içinde çizgi tipiyle) |
| `CELIK_DETAY` | 7 | Continuous | 0,35 | Kesit ve birleşim detayları |
| `CELIK_METRAJ` | 8 | Continuous | 0,13 | Çelik metraj tablosu |

## Yazı yükseklikleri (kâğıt mm, geçici)
Etiket 2,5 · detay yazısı 2,5 · başlık 4 · tablo 2,5 · ölçü yazısı 2.

## Çizgi kalınlıkları (1/100 mm, geçici; tablo `cizgi`)
Kesilen dış hat 50 · görünen kenar 35 · ince 25 · çok ince 18 · yardımcı (ölçü, not oku) 13 · eksen rengi 1 (CENTER).

## Kabuller (onay bekliyor)
- Profil değerleri tablodan değil, kesitin gerçek dış hattından (köşe yarıçapları, IPN / UPN eğimli başlık) hesaplanır; yayımlanmış tablolarla fark %2'nin altında (I, U, köşebent, kutu, boru çoğunda %1'in altında, UPN400 Ix %1,1; T profilde eğimler basitleştirildiği için %1,6'ya kadar) (`test/celik-profil.test.js`).
- Taban levhası, alın levhası ve ankraj / bulon ölçüleri **ön boyuttur** (kesit boyuna göre öneri); statik hesap yerine geçmez.
- Detaylar 1/10 ölçekte çizilir (ölçek detay nesnesinde değiştirilebilir).
- Bulon / ankraj kalitesi detaylarda: ankraj 8.8, alın levhası bulonu 10.9, aşık bulonu 8.8. Köşe kaynağı a ≈ 0,6 × başlık kalınlığı.
- Ölçü yazısı 2 mm (mimari / mekanik paftadaki "1/25 ve büyük ölçekte 3 mm" kuralı çelik detayına uygulanacak mı, sorulacak).

## Açık sorular
- Firma çelik paftasında katman adları, renkleri, kaynak sembolü ve bulon gösterimi nasıl? Örnek DWG gelince ölçülecek.

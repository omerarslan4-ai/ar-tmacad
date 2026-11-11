# ArıtmaCAD – Uçtan Uca Tesis Tasarımı: Tasarım Dokümanı

Onay: Ömer Bey, 10 Kasım 2026 ("tam uygun").

Hedef: proses raporu çözüldükten sonra ArıtmaCAD, parametrik ünite kütüphanesinden tesisi kendisi kurar; üniteler hesaba göre boyutlanır, yerleşim plankote üzerinde elle yapılır, saha borulaması ve hidrolik profil yerleşimden türetilir.

## 1. Çalışma sırası

1. **Proses raporu:** Arıtma tipi (A2O, Bardenpho, uzun havalandırma vb.), debiler ve seçimli üniteler belirlenir; ünite boyutları hesaptan çıkar.
2. **Ünite kartları:** Program, seçilen akış zincirindeki her ünite için kütüphaneden bir kart üretir ve hesap değerleriyle doldurur.
3. **Kutu yerleşimi:** Her ünite plankote üzerine ayak izi (dış sınır kutusu) olarak gelir. Kutular elle sürüklenir ve döndürülür; aralarında akış okları kalır. Kutu bırakıldığı noktadaki arazi kotunu okur ve taban kotu önerir.
4. **Saha borulaması ve hidrolik:** Program akış okları üzerinden boruları geçirir, gerçek boy ve kot farklarıyla kayıpları hesaplar, hidrolik profili çıkarır.
5. **Yakınsama:** Kotu araziye uymayan kutu kaydırılır; borulama ve profil kendiliğinden güncellenir.
6. **Detaya dönüşüm:** Kutular gerçek ünite şablonlarına dönüşür; mimari, mekanik ve statik paftalar bu şablonlardan üretilir.

## 2. Ünite kartı

Kütüphane çizim olarak değil veri olarak kurulur: her ünite bir parametre tablosudur, çizim ve 3D bu tablodan üretilir. Sonraki projede yalnız tablo değişir.

Her parametre dört kaynaktan birine aittir:

| Kaynak | Ne içerir | Örnek (ızgara yapısı) |
| --- | --- | --- |
| Hesap | Proses raporu ve hidrolik hesaptan gelen ölçüler | Kanal genişliği, kanal sayısı, su derinliği |
| Standart | Firmanın sabit tasarım alışkanlıkları | Hava payı yaklaşık 1 m, baypas kanalı zorunlu |
| Ekipman kataloğu | Üretici ölçüleri | Izgara eğim açısı, boşaltma yüksekliği, konveyör kotu |
| Türetilen | Diğer üçünden hesaplanan | Platform kotu, kanal derinliği, temel kotu |

Kartta ayrıca: ayak izi (en × boy), giriş ve çıkış noktalarının kutu üzerindeki yeri, akış zincirindeki sonraki ünite, taban kotu ve koku bayrağı.

Kural: bir ölçü hesaptan veya katalogdan türetilebiliyorsa elle girilmez. Elle girilen her değer kartta "standart" olarak işaretlenir ve proje bazında değiştirilebilir.

## 3. Akış zinciri

Üniteler birbirine sabit sırayla bağlanmaz; proses raporundaki seçimler zinciri kurar, kartlar aynı kalır.

Su hattı:

```
Ön arıtma (A veya B) → Kum tutucu → Debimetre → [Ön çökeltme] → [Dağıtma yapısı]
  → Biyolojik havuz → [Dağıtma yapısı] → Son çökeltme → Dezenfeksiyon ve çıkış  VEYA  Geri kazanım
Köşeli parantez = seçimli ünite.
Geri devir: son çökeltme → biyolojik havuzun başı (anaerobik bölme).
Çamur: son çökeltme → çamur hattı; süzüntü suyu → biyolojik havuzun başı.
```

| Seçim | Seçenekler | Etkisi |
| --- | --- | --- |
| Ön arıtma sırası | A: kaba ızgara → terfi → ince ızgara. B: kaba ve ince ızgara aynı kanalda → terfi | A iki ayrı yapı üretir, ince ızgaranın giriş kotu terfi basma kotundan türer. B iki ekipmanı tek kanala yerleştirir |
| Debimetre | Manyetik (varsayılan) veya Parshall savağı | Manyetikte debimetre odası ve düz boru boyları; Parshall'da boğaz genişliği ve kot düşümü |
| Ön çökeltme | Var veya yok | Varsa çamur hattına ham çamur kolu eklenir |
| Dağıtma yapısı | Hat sayısına göre otomatik | Tek hatta atlanır |
| Proses tipi | A2O, Bardenpho, uzun havalandırma ve diğerleri | Biyolojik havuzun bölme sırasını belirler |
| Çıkış | Çıkış kanalı veya geri kazanım üniteleri | Çökeltme sonrası üniteleri belirler |

Yeni bir varyasyon çıkarsa yalnız yeni bir sıra tanımlanır.

## 4. Kademe mantığı

Proses raporunda iki ayrı debi tanımlanır: ön arıtma gelecek kademeyi de karşılar, proses havuzları yalnız mevcut kademe için çözülür.

| Ünite grubu | Boyutlandırma debisi |
| --- | --- |
| Izgara yapıları, kum tutucu | Nihai kademe debisi |
| Proses havuzları ve çökeltme | Mevcut kademe debisi |

- Dağıtma yapısı, gelecek kademe için kör savak veya hazır bağlantı ağzıyla çizilir.
- Genel yerleşimde gelecek kademe havuzları kesikli çizgili boş ayak izi olarak gösterilir; saha borusu bu rezerve göre geçirilir.

## 5. Ünite kartları

| Ünite | Hesaptan gelen | Standart | Ekipman kataloğu | Seçenek |
| --- | --- | --- | --- | --- |
| Izgara yapısı | Kanal genişliği, kanal sayısı, su derinliği | Kanal derinliği = su derinliği + yaklaşık 1 m; baypas kanalı zorunlu; temel kotu plankoteden | Izgara eğimi, boşaltma yüksekliği, bant konveyör ve konteynere boşaltma yüksekliği | Kaba ve ince ayrı yapıda veya aynı kanalda |
| Kum tutucu | Uzunluk, genişlik, su derinliği, hat sayısı | Netleşecek (açık soru) | Gezer köprü, kum pompası, yağ sıyırıcı | Blower ana binada veya yanında küçük binada |
| Debimetre | Boru çapı veya boğaz genişliği | Varsayılan manyetik debimetre | Debimetre boyu, gerekli düz boru boyları | Manyetik veya Parshall savağı |
| Dağıtma yapısı | Savak uzunlukları | Tek hatta yok; iki ve üzeri hatta otomatik | Kapaklar | Gelecek kademe ağzı |
| Ön çökeltme | Çap, kenar su derinliği | Dairesel | Sıyırıcı köprü | Var veya yok |
| Biyolojik havuz | Bölme hacimleri | Bitişik tek yapı, ortak duvar; geçişler savaklı | Karıştırıcı, difüzör, kapaklar | Proses tipine göre bölme sırası; geçişte savak veya orifis |
| Son çökeltme | Çap, kenar su derinliği | Dairesel; taban eğimi ve çamur hunisi | Sıyırıcı köprü, merkez tahrik | Tank sayısı |

### Izgara yapısında kot zinciri

Izgara yüksekliği üç değere bağlıdır: zemin kotu, ızgaranın standart boşaltma yüksekliği ve konveyörün çöp konteynerine boşaltma yüksekliği. Yürüme platformu kotu elle girilmez, ızgaranın boşaltma yüksekliğinden türetilir; konveyör ona göre oturur. Mekanik ızgara üç bölgeyle modellenir: su içindeki kısım, tırnaklı kaldırma kısmı, konveyöre boşaltma kısmı.

### Biyolojik havuz şablonu

| Proses tipi | Bölme sırası |
| --- | --- |
| A2O | Anaerobik → anoksik → aerobik |
| Bardenpho | Anaerobik → anoksik → aerobik → ikinci anoksik → ikinci aerobik |
| Uzun havalandırma | Tek aerobik hacim |

- Şablon: tek dış çerçeve, hacimlere göre sıralanan bölme duvarları, geçiş tipleri, giriş ve çıkış noktaları.
- Geçişler varsayılan olarak savaklıdır; böylece yüzey köpüğü havalandırmanın başından çökeltmeye kadar taşınır. Gereken duvarda orifis seçilir.
- Ortak duvarlar statik modülde iki taraflı su yüküyle çözülür.
- Geri devir hatları şablonun dışındadır, saha borulamasında kalır; şablonda yalnız giriş noktası tanımlıdır.
- Not: Ömer Bey otomatik üretilen havalandırma havuzu yerleşimini istemiyor; kendi plan/kesit çizimlerini düzenlenebilir şablon olarak kullanmak istiyor (ilk örnek Zeytinli AAT T107). Biyolojik havuz şablonu buna göre kurulur.

### Üç gözlü anaerobik havuz

- İki göz ham suyu alır; üçüncü göz geri devir ve süzüntü suyunu alır.
- Giriş yapısında bir ayırıcı kapak vardır; açıldığında tüm sular karışarak girer.
- Gözler arasındaki geçiş kapakları kademeli karışım sağlar.
- Göz sayısı seçimlidir (eski projeler için tek göz).
- Hidrolik iki işletme senaryosuyla kontrol edilir: kapak açık (tam karışım) ve kapak kapalı (kademeli karışım).

## 6. Çamur hattı ve geri dönüşler

1. Fazla çamur pompaları, çamuru geri devir hattından alır.
2. Çamur ya stabilizasyon tankına ya da statik mikserli yoğunlaştırıcıya gider (seçimli).
3. Oradan dekantör binasına gönderilir ve susuzlaştırılır.
4. Süzüntü suyu, gerekiyorsa süzüntü terfisiyle, geri devrin verildiği noktaya (anaerobik havuzun başı, üçüncü göz) verilir. Giriş terfisine verilmez.

Anaerobik havuzun giriş noktası üç hattı karşılar: ham su, geri devir, süzüntü suyu. Ön çökeltme seçilirse çamur hattına ham çamur kolu eklenir.

## 7. Yerleşim kuralları

Yardımcı yapılar hidrolik zincire girmez; kutu yerleşiminde program onları aşağıdaki kurallara göre önerilen konumda getirir, son karar elle verilir.

| Yapı | Konum kuralı | Gerekçe |
| --- | --- | --- |
| Blower binası | Havalandırma havuzuna en yakın | Hava hattı kısalır |
| Trafo binası | Blower binasına yakın | En büyük elektrik yükü blowerlarda |
| Kum tutucu blowerları | Tesis büyüklüğüne göre ana blower binasında veya kum tutucunun yanında küçük binada | Hat boyu |
| Dekantör binası | Fazla çamur pompalarına yakın | Çamur hattı kısalır |
| Stabilizasyon havuzları | Dekantör binasının hemen yanında | Çamur grubu bir arada |
| Dezenfeksiyon ve çıkış yapısı | Çıkış kanalına yakın | Deşarj hattı kısalır |
| İdari bina | Koku kaynaklarına en uzak; arazinin şekline bağlı | Koku |

İdari bina için kural kesin değil öneridir.

### Koku giderme

- Koku bayrağı taşıyan yapılar: giriş ızgara yapıları, kum tutucu, dekantör binası, çamur stabilizasyon.
- Bayraklı yapılar için kapalı üst örtü ve emiş kanalı çizilir.
- Varsayılan iki koku ünitesidir: biri ön arıtma grubunda, biri çamur grubunda. Yerleşime göre birleştirilebilir.

## 8. Hidrolik bağ

Hidrolik yerleşimden türetilir ve onunla karşılıklı yakınsar; her ünitenin giriş ve çıkış kotu komşusuna bağlıdır, bir ünite değişince profil zincirleme güncellenir.

- **Birinci geçiş:** Yalnız kutular ve bağlantı sırası vardır, boru yoktur. Giriş ve deşarj kotu baştan girilirse kaba profil yerleşim sırasında oluşur.
- **İkinci geçiş:** Saha boruları akış okları üzerinden geçirilir; boy, bağlantı parçası ve kot farkı yerleşimden ölçülür, kayıplar gerçek uzunluklarla hesaplanır.
- **Ünite içi kayıplar:** Savaklı geçişte kot düşümü, orifiste batık geçiş kaybı, Parshall savağında gerekli düşüm, manyetik debimetrede düz boru boyları profile işlenir.
- **Hat sayısı:** Saha borulaması hat sayısına göre kurulur; dağıtma yapıları eşit dağıtım için savak uzunluklarını hesaplar.

## 9. Kodlama planı

Her parça gerçek bir projeyle (örneğin Zeytinli AAT) test edilmeden sonrakine geçilmez.

| Parça | İçerik | Bitti sayılma ölçütü |
| --- | --- | --- |
| 1. Çekirdek | Proses raporundan ünite kartlarını üreten yapı; akış zinciri seçenekleri; iki debili kademe mantığı | Seçilen proses için doğru ünite listesi ve ayak izleri çıkıyor |
| 2. Kutu yerleşimi | Plankote üzerinde sürükle ve döndür; akış okları; arazi kotu okuma; yardımcı yapı ve koku ünitesi önerileri; gelecek kademe ayak izleri | Bir tesisin yerleşimi kutularla kurulabiliyor |
| 3. Borulama ve hidrolik | Oklardan saha borusu; kayıp hesabı; hidrolik profil; kutu kaydırılınca otomatik güncelleme | Profil, elle hazırlanmış bir projenin profiliyle uyuşuyor |

Ünite şablonları tek tek eklenir. İlk şablon ızgara yapısıdır; kart mantığı onda sonuna kadar doğrulanmadan diğer ünitelere geçilmez. Mevcut çalışmalar (`proses.js`, `aile.js`, `izgara.js`, `havuz-param.js`, `arazi.js`, `borulama.js`, statik modül, ekipman kataloğu) bu yapıya bağlanır, yeniden yazılmaz.

## 10. Açık sorular

- [x] Kum tutucu standartları: Çokal AAT T-103'ten alındı, 11 Kasım 2026'da onaylandı (bkz. `tasarim-standartlari.md`).
- [ ] Terfi istasyonu kartı: hesaptan ve katalogdan gelen ölçüler henüz konuşulmadı.
- [ ] İnce ızgara kaba ızgarayla aynı kanaldayken iki ekipman arasındaki mesafe. Çokal'da yapının iç boyu 12,70 m; kartta şimdilik kanal boyu + 3 m.
- [ ] Stabilizasyon tankı ile statik mikserli yoğunlaştırıcı arasındaki seçim neye göre yapılıyor?
- [ ] Çıkış tarafı: dezenfeksiyon tipi ve geri kazanım üniteleri hangi seçeneklerle gelecek?
- [ ] Yardımcı binaların (idari bina, atölye, trafo) ayak izi ölçüleri nereden alınacak?
- [x] İlk test projesi: Çokal AAT (`test-proje/`, sürüm kaydı dışında).

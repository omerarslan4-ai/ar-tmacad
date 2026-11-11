# Firma tasarım standartları

Ömer Bey'in sohbetlerde belirttiği kurallar. Çizim, hesap ya da rapor üreten her işte geçerlidir. Burada yazmayan bir konuda varsayım yapma, sor.

## Statik ve donatı
- Dikdörtgen yapıların perde/radye/döşemesi, oval tanklardaki gibi 3B kabuk (SAP2000 tipi) modelle çözülür; raporda SAP2000 tarzı diyagramlar yer alır. Kolon/kiriş ayrı çerçeve hesabıyla çözülür.
- Döşemeler perdelere ankastre çalışır; döşeme donatı detayları temel donatı paftasında yer alır.
- Perde düşey donatısı: H ≤ 2 m filizsiz tek parça gönyeli; H > 2 m temel filizi + bindirme (bindirme boyu çapa göre); H ≥ 6 m üç parça (temel filizi, bindirmeli orta parça, döşemeye kadar üst parça) ve yarı yükseklikte inşaat derzi.
- İç ve dış perde donatıları aynı çapta; döşeme/radye alt ve üst donatıları aynı çapta. Gönye boyu = eleman kalınlığı − paspayı. İç/dış düşey donatıların üst gönyeleri birbirine bakar.
- Döşeme: alt donatı tam boy; üst donatı da tek parça tam boy ve uçları gönyeli (iki ayrı mesnet parçası değil).
- 12 m'den uzun donatı: önce tam 12 m'lik stok boy, kalanı bindirmeli. Çizimde gönye boyu, gönyeden sonraki düz boy ve altında L=toplam gösterilir.
- Donatı aralığı mümkün olan her yerde 15 cm (10 cm'den kaçın).
- Dairesel perde yatay donatısı: 12 m'lik stok boylar derzlerden sürekli geçer, çapa göre bindirilir, yalnız kapatma parçası kısa olur.
- Perde adlandırma: her perde yüzü ayrı ad alır (kapalı perdeye tek ad verilmez); uzun ve kısa perdeler farklı adlandırılır.
- Statik hesapta perde kalınlığı artarsa haznenin iç yüzü sabit kalır, perde dışa doğru kalınlaşır; değişiklik 3B modele yansır.
- Paspayı takozu, temel sehpası ve çiroz 3B'de standartlara göre gösterilir; aralıkları formdan değiştirilebilir.
- Donatı paftaları az eğitimli bir demirci ustasının anlayıp imal edebileceği açıklıkta olmalı: donatılar her kesit/planın yanına açılım olarak çekilir, delik kenarları gönyeli gösterilir.
- Kalıp planında gereken her yerde ek kesit alınır (kolonlardan, ara döşemelerden ve üzerine oturan perdelerden).
- Statik rapor ve paftalar (kalıp, donatı, perde detayları, metraj tabloları, DSİ antet) firmanın standart biçimini izler (örnek: ÇOKAL AAT statik rapor ve paftaları).

## Paftalama ve çizim
- Statik çizimler Tasarım (model) alanına değil Statik disiplin pafta grubuna gider. Bir kez alınan kesit tüm disiplin paftalarında (Mimari, Mekanik, Statik, Elektrik) kendiliğinden görünür.
- Disiplin paftalarında 3B perspektif görünüş bulunur; beton içindeki donatı 3B'de yalnız Statik disiplininde görünür.
- Antet: çizimin değil, kullanıcının programa yüklediği kendi anteti kullanılır.
- Terfi istasyonu mimari/mekanik plan ve kesit paftalarında ölçek 1/25 (1/50 küçük kalıyor); pafta sayısı kendiliğinden ayarlanır.
- Boru etiketlerinde genel malzeme adı yerine malzeme kalitesi yazılır (ör. SS304, SS304L, SS316, SS316L; "PASLANMAZ" değil). Tüm boru tipleri için geçerli.
- Ünite numaraları ünite eklenip çıkarıldıkça yeniden numaralanır.
- Çizim, pafta ve raporlar için dil seçeneği vardır ve tüm disiplinlere uygulanır.

## Proses ve ünite tasarımı
- Izgara yapısı: kanal derinliği ≈ su derinliği + yaklaşık 1 m hava payı; temel kotu arazi kotundan türer; baypas kanalı zorunlu.
  - Kanal derinliğinde ATV formülü (su derinliği + yük kaybı + hava payı) değil, bu standart kullanılır.
  - Baypas kanalı = yedek kanal (ayrı bir baypas kanalı çizilmez).
  - Çöp konteyneri: standart belediye konteyneri yüksekliği (1100 L, EN 840, ≈1,37 m); konveyör ona göre oturur.
- Biyolojik bölmeler bitişik tek tank olarak yapılır (ortak duvarlı). Geçişler genelde savaklı, bazı yerlerde orifis.
- Son çökeltme havuzları dairesel.
- Ön arıtma (ızgara, kum tutucu) gelecek kademeyi de kapsayacak şekilde boyutlandırılır; proses havuzları tek kademe için çözülür.
- Karıştırıcılar kullanıcının mikser programıyla seçilir ve mekanik listeye eklenir; merdivenler genel yerleşimdeki arazi kotlarından güncellenir; difüzör yerleşimi ayrı sekmede yapılır.

## Mekanik tesisat (bina)
- Sıhhi tesisatta içme suyu ve sıcak su boruları duvar içinden geçer, mahal ortasından değil.
- Mekanik tesisat raporu kullanıcının örnek rapor biçimini izler (Yayladağ AAT idari bina mekanik tesisat hesapları raporu ve AAT-B101 sıhhi tesisat paftası).
- İndirilen ağır 3B armatür modelleri programı yavaşlatıyor; hafif, yerleşik 3B armatür çizimleri kullanılır.

## Çalışma şekli
- Program yalnız tamamen bittiğinde kurulabilir masaüstü uygulamasına (Electron/Tauri) çevrilecek; şimdilik .bat ile tarayıcıda çalışır.
- Kullanıcının bilgisayarında SAP2000 kurulu değildir.

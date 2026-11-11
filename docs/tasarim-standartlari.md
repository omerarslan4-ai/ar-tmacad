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
  - Yürüme platformu zeminden en az 0,65 m yukarıda olur (Çokal AAT T-101: zemin 94,80, platform 95,45).
  - Konteynerlerin altında süzüntü suyunu toplayan bir kanal bulunur (Çokal'da 60 cm, ızgara kanalları arasında).
- Kum ve yağ tutucu (havalandırmalı, gezer köprülü; Çokal AAT T-103 örneği):
  - Her göz: kum bölmesi + ayırma (yağ lameli) + yağ bölmesi. Gözler arası duvar 30 cm, dış duvar 40 cm.
  - Havuzun bir ucunda dağıtma (giriş) kanalı, öbür ucunda çıkış kanalı; ikisinin de iç genişliği 1,50 m.
  - Duvar üstü = su yüzü + 0,85 m hava payı; zeminden en az 0,65 m yukarıda.
  - Kum oluğu tabandan 0,50 m aşağıda; kum oluğu altındaki taban plağı 0,64 m.
  - Blowerlar tesis büyüklüğüne göre ana blower binasında ya da kum tutucunun yanında küçük binada (Çokal'da ana binada).
- Giriş terfi istasyonu (ıslak hazne, dalgıç pompa; Çokal AAT T-102 örneği):
  - Yapı nihai kademeye göre boyutlanır; mevcut kademede eksik pompalar sonradan aynı yapıya eklenir.
  - Kot zinciri: giriş tabanı → 0,86 m altı 1. pompa devreye girme seviyesi → faydalı yükseklik → durma seviyesi → ölü hacim → hazne tabanı.
  - Üst döşeme zeminden en az 0,65 m yukarıda. Duvar 40 cm, taban plağı 40 cm.
  - Monoray vinç kirişi üst döşemeden 2,70 m yukarıda.
  - Pompalar haznenin uzun kenarı boyunca dizilir: aks aralığı 1,00 m, son pompa aksından duvara 0,95 m (katalog, dalgıç pompa).
- Giriş debimetresi (varsayılan manyetik; Çokal AAT T-104 örneği):
  - Nihai kademe Q maks.'a göre boyutlanır. Boru PE100, PN10 (SDR 17); Q maks.'ta hız ≤ 1,5 m/s olan en küçük çap seçilir. Q min.'da hız ≥ 0,3 m/s olmalı.
  - Düz boru boyları: debimetre öncesi 5·DN, sonrası 3·DN.
  - Debimetre odası: iç en az 2,00 (akış yönü) × 1,50 m; duvar 25 cm, taban plağı 30 cm; boru altı tabandan 0,42 m yukarıda; üst döşeme zeminden 0,45 m yukarıda.
  - Parshall savağı seçimli: boğaz genişliği standart tablodan; kot düşümü hidrolik profile işlenir.
- Anaerobik havuz (Çokal AAT T-105 biçimi):
  - Karusel halkaları yan yana, ortak duvarlı. Varsayılan 3 halka: 1. halka geri devir (RAS), 2. ve 3. halka ham su; eski projeler için tek halka.
  - Halka iç eni 3,00 m (iç yarıçap 1,50), ortada 30 cm duvar, iki koridor 1,35 m; uçlar yarım daire, dönüşte R0,70–R1,00 kılavuz duvar (30 cm). Dış duvar ve halkalar arası duvar 40 cm.
  - Düz boy gerekli hacimden bulunur (elle değiştirilebilir; Çokal 11,00 m → dış ölçü 17,20 × 10,60 m).
  - Sol yanda giriş kanalı 0,80 m: her halkanın ucuna kapaklı ağız 0,60 × 1,00 m (Çokal 95,75–96,75, su 96,64); kapaklarla ham suyun gireceği halka seçilir. Giriş borusu kanala alttan.
  - Sağ yanda çıkış kanalı 1,00 m, ara duvarla ikiye bölünür (ara duvar boydan boya perde, tabanda 0,60 × 0,60 kapaklı orifis; kapak perdenin RAS yüzünde): alt bölüm RAS girişi (RAS halkasına), üst bölüm ham su halkalarının çıkışı (çıkış borusu ortadan). Kanal dış duvarları 30 cm.
  - Halkalar arası geçiş köprü yanındaki kapaklı pencereden; akış RAS → 1 → 2. Ortadan enine 1,50 m servis köprüsü (merdivenli).
  - Temas süresi = V / (Q ort. + geri devir), geri devir = %75 × Q maks.; 0,5–1,5 sa (ATV-DVWK-A 131).
  - Hava payı 0,60 m, taban plağı 0,50 m; duvar üstü zeminden en az 0,65 m yukarıda.
  - Her halkada karıştırıcı (tabanda ≥ 0,3 m/s, mikser programıyla seçilir).
  - Ekipman yerleşimi (Çokal T-105 mimari paftası + firma varsayılanı; 11.11.2026 onaylandı):
    - Merdiven plaklı betonarme (plak 20 cm, altı boş); üst sahanlık merdivenin parçası, plağı merdiven plağına bağlı, köprü döşemesiyle aynı kotta. Merdiven havuzun dışında, uzun dış duvar boyunca düz kollu, köprüye çıkar; köprünün dışarı uzanan ucu sahanlıktır. Eni 1,00 m, basamak genişliği 0,25 m, rıht en çok 0,19 m (zeminden köprü üstüne; zemin araziden).
    - Korkuluk köprünün iki yanında ve merdivenin dış yanında.
    - Ortak duvarda yalnız kapaklı pencere var (orifis yok). Pencere kapağı perdenin akışın geldiği yüzüne monte edilir (perdenin içine girmez). Köprüye bitişik kapak işletme sahanlığı kapağı içine alır (kapak tarafında 0,45, öbür yanda 0,30 m taşar, pencereden 0,40 m geniş); korkuluk çevresinden dolanır. Kapak sahanlık döşemesindeki yarıktan geçer: yarık = çerçeve eni (açıklık + 2 × 85 mm) + her yanda 5 cm, akış yönünde 0,30 m. Pencere köprüden 0,20 m geride.
    - Havuz çevresinde zemin kotunda 1,00 m tretuvar.
    - Penstok: kanal tipi, duvar yuvalı penstok ailesi; her halka ağzına (600 × 1000), her pencereye (1500 × 1000), ve sağ kanaldaki ara duvar orifisine (600 × 600) birer adet. Ölçüler açıklıktan gelir.
    - Tahrik kendiliğinden seçilir: kapak alanı 1,0 m²'yi ya da su kuvveti 10 kN'u aşarsa elektrikli aktüatör, değilse el çarkı Aynı perdedeki kapaklar tek tip: biri aktüatörlüyse hepsi aktüatörlü (projede tümü el çarkı / tümü aktüatör yapılabilir).
    - Mikser: yürüyüş yolunun havuzun uzun kısmına bakan yüzünde, uzun kısma doğru akan koridorda, uzun kısma doğru iter; kısa tarafa bakan yüzde mikser yok. Kılavuz direk yürüme yolu tabliyesinin ön yüzüne bağlanır; pergel vinç mikser ekseninde, yürüme yolu tabliyesinin üstünde. Direk kapak sahanlığına değmez. Halka başına 2 ve üzeri mikser gerekiyorsa uzun kısmın öbür ucuna ikinci yürüyüş yolu (merdivenli, korkuluklu) eklenir; mikserlerin yarısı oraya, yine uzun kısma bakacak şekilde konur. Sayı ve tip mikser hesabı penceresinin sonucundan (aynı halka için yapılmışsa), yoksa aynı yöntemle otomatik seçimden.
    - Boru delikleri (giriş, RAS, çıkış) saha borulamasına göre yer değiştirir: saha borusunun ucu duvara yakınsa delik borunun eksenine, çapına ve kotuna kayar; elle de taşınabilir.
    - Yerleşen ekipman elle taşınabilir; yeniden üretimde elle taşınanlar korunur. Etiketler (SK-…, Z-…) mekanik listeye girer.
- Dağıtma yapısı (biyolojik havuzlar ve son çökeltme önü; Çokal AAT T-107 örneği):
  - Mevcut ya da nihai kademede iki ve üzeri hat varsa yapılır; tek hatta yok. Nihai kademedeki fazla hatlar için kör savak (hazır ağız).
  - Son çökeltme önünde debi = Q maks. + %75 geri devir; biyolojik havuz önünde Q maks.
  - Savaklar eşit boyda, ayarlanabilir kapaklı; en az 1,70 m, savak yükü en çok 15 cm olacak şekilde debiden. Savaktan çıkış haznesine 26 cm serbest düşü.
  - Ortada giriş haznesi (en az 2,50 m), her hat için çıkış haznesi 2,00 m; hazne boyu en az 3,35 m. Dış duvar 40, iç duvar 30 cm; hava payı 0,79 m.
  - Giriş borusu alttan, en çok 1,20 m/s; giriş haznesinde enerji ≤ 30 W/m³.
  - Varsayılan ayrı yapı: derinlik çıkış borusundan (PE, ≤ 1,2 m/s; boru üstü çıkış su yüzünün 0,50 m altında; taban boru altından 0,27 m aşağıda); duvar üstü zeminden en az 0,65 m yukarıda. Seçimli olarak havuzun ucuna bitişik yapılır (Çokal); o zaman taban bağlı havuzun tabanıyla aynı.
- Ön arıtma yapıları (ızgara, terfi, kum tutucu) bitişik tek blok olarak yapılabilir; aralarında 5 cm derz bırakılır (Çokal).
  Terfi istasyonu bazı projelerde ızgara ve kum tutucudan bağımsız, ayrı bir yapı olarak yapılır (seçimli; giriş ve çıkış saha borusuyla).
- Biyolojik bölmeler bitişik tek tank olarak yapılır (ortak duvarlı). Geçişler genelde savaklı, bazı yerlerde orifis.
- Biyolojik (havalandırma) havuz: tüm proses tiplerinde karusel (oksidasyon hendeği) şablonu kullanılır — Zeytinli AAT T107, `app/karusel.js` (karar: 11 Kasım 2026).
  - Bölmeler duvarsızdır: anoksik bölge mikserli, aerobik bölge difüzörlü kısım; oranlar proses hesabındaki hacimlerden.
  - Hacim proses hesabından; düz uzunluk, mikser seçimi (mikser programının itki dengesi) ve difüzör sayısı karusel modülünden.
  - Şablon ölçüleri: dış duvar iç yarıçapı 9,0 m, orta duvar 0,40 m, dış duvar 0,80 m, kılavuz duvar Ø4,40 / 0,40 m, hava payı 1,05 m, taban plağı 0,60 m; duvar üstü zeminden en az 0,65 m yukarıda.
  - Anaerobik havuz ayrı ünitedir (Çokal T-105 biçiminde karusel halkalı, üç halkalı).
- Son çökeltme havuzları dairesel (merkezden alttan beslemeli, çevre savaklı, çevre duvarında tahrikli döner köprülü; Çokal AAT T-108 örneği):
  - Havuz sayısı mevcut kademeden; nihai kademedeki fazlası gelecek kademe havuzu olarak boş ayak izi (kesikli) gösterilir.
  - Duvar 20 cm, hava payı (su yüzü → duvar üstü) 1,20 m; duvar üstü zeminden en az 0,65 m yukarıda.
  - Toplama kanalı 30 cm, duvardan 30 cm içeride; savak su yüzünden 5 cm, kanal tabanı savaktan 45 cm aşağıda.
  - Taban merkeze eğimli (Çokal 1/12); çamur hunisi merkez tabandan 1,36 m derin; taban plağı 40 cm.
  - Giriş yapısı çapı iç çapın 0,15–0,25 katı. Çıkış yapısı iç 1,50 m, duvarı 30 cm, havuz duvarına bitişik.
- Ön arıtma (ızgara, kum tutucu) gelecek kademeyi de kapsayacak şekilde boyutlandırılır; proses havuzları tek kademe için çözülür.
- Karıştırıcılar kullanıcının mikser programıyla seçilir ve mekanik listeye eklenir; merdivenler genel yerleşimdeki arazi kotlarından güncellenir; difüzör yerleşimi ayrı sekmede yapılır.

## Mekanik tesisat (bina)
- Sıhhi tesisatta içme suyu ve sıcak su boruları duvar içinden geçer, mahal ortasından değil.
- Mekanik tesisat raporu kullanıcının örnek rapor biçimini izler (Yayladağ AAT idari bina mekanik tesisat hesapları raporu ve AAT-B101 sıhhi tesisat paftası).
- İndirilen ağır 3B armatür modelleri programı yavaşlatıyor; hafif, yerleşik 3B armatür çizimleri kullanılır.

## Çalışma şekli
- Program yalnız tamamen bittiğinde kurulabilir masaüstü uygulamasına (Electron/Tauri) çevrilecek; şimdilik .bat ile tarayıcıda çalışır.
- Kullanıcının bilgisayarında SAP2000 kurulu değildir.

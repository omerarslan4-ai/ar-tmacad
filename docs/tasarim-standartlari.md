# Firma tasarım standartları

Ömer Bey'in sohbetlerde belirttiği kurallar. Çizim, hesap ya da rapor üreten her işte geçerlidir. Burada yazmayan bir konuda varsayım yapma, sor.

## Statik ve donatı
- Dikdörtgen yapıların perde/radye/döşemesi, oval tanklardaki gibi 3B kabuk (SAP2000 tipi) modelle çözülür; raporda SAP2000 tarzı diyagramlar yer alır. Kolon/kiriş ayrı çerçeve hesabıyla çözülür.
- Döşemeler perdelere ankastre çalışır; döşeme donatı detayları temel donatı paftasında yer alır.
- Perde düşey donatısı: H ≤ 2 m filizsiz tek parça gönyeli; H > 2 m temel filizi + bindirme (bindirme boyu çapa göre); H ≥ 6 m üç parça (temel filizi, bindirmeli orta parça, döşemeye kadar üst parça) ve yarı yükseklikte inşaat derzi.
- İç ve dış perde donatıları aynı çapta; döşeme/radye alt ve üst donatıları aynı çapta. Gönye boyu = eleman kalınlığı − paspayı. İç/dış düşey donatıların üst gönyeleri birbirine bakar.
- Döşeme: alt donatı tam boy; üst donatı da tek parça tam boy ve uçları gönyeli (iki ayrı mesnet parçası değil).
- 12 m'den uzun donatı: önce tam 12 m'lik stok boy, kalanı bindirmeli. Çizimde gönye boyu, gönyeden sonraki düz boy ve altında L=toplam gösterilir.
- Donatı aralığı mümkün olan her yerde 15 cm (10 cm'den kaçın). Yay / oval / anaerobik (kabuk) hesabında da böyle: 15 cm'de yeten en küçük çap seçilir; hiçbir çap yetmezse (çatlak ya da ρ > 0,02) o katmanda daha sık aralığa düşülür.
- Radyede ışınsal + halka donatı yalnız radye kenarının yayı izlediği yerde (yuvarlak / oval hazne) atılır. Dikdörtgen radye üzerindeki yuvarlak uçlu halkalarda (anaerobik havuz) radyenin tamamına dik X / Y ağ atılır.
- 3B donatı: modeldeki çubuk parçası 40 bini geçince ince çizgiyle gösterilir (seçilen poz grubu kalın görünür); eğri çubuklar 3 mm sapmayla seyreltilir.
- Dairesel perde yatay donatısı: 12 m'lik stok boylar derzlerden sürekli geçer, çapa göre bindirilir, yalnız kapatma parçası kısa olur.
- Perde adlandırma: her perde yüzü ayrı ad alır (kapalı perdeye tek ad verilmez); uzun ve kısa perdeler farklı adlandırılır.
- Statik hesapta perde kalınlığı artarsa haznenin iç yüzü sabit kalır, perde dışa doğru kalınlaşır; değişiklik 3B modele yansır.
- Paspayı takozu, temel sehpası ve çiroz 3B'de standartlara göre gösterilir; aralıkları formdan değiştirilebilir.
- Donatı paftaları az eğitimli bir demirci ustasının anlayıp imal edebileceği açıklıkta olmalı: donatılar her kesit/planın yanına açılım olarak çekilir, delik kenarları gönyeli gösterilir.
- Kalıp planında gereken her yerde ek kesit alınır (kolonlardan, ara döşemelerden ve üzerine oturan perdelerden).
- Statik rapor ve paftalar (kalıp, donatı, perde detayları, metraj tabloları, DSİ antet) firmanın standart biçimini izler (örnek: ÇOKAL AAT statik rapor ve paftaları).

### Kalınlık basamakları ve sınırları (13.11.2026 — Çokal AAT statik raporundan ölçüldü, kullanıcı onayı bekliyor)
- Perde ve temel kalınlıkları 5 cm adımlı değil basamaklıdır: 20 (yalnız susuz küçük oda) – 25 – 30 – 40 – 50 – 60 – 70 – 80 cm. Üst döşeme 15 – 20 – 25 – 30 cm.
- Dış perde kalınlığı perde yüksekliğine (H) bağlı aralıkta kalır: en ince max(25 cm; H/18), en kalın H/9,5'i karşılayan ilk basamak (Çokal: 2,2 m → 25; 3,75 – 6,3 m → 40; 10,65 m → 60). Ara perde dış perdeden kalın olmaz.
- Radye perdeye eşit ya da en çok iki basamak üstü (Çokal: 25→30, 40→40/50, 60→70). Üst döşeme çoğunlukla 20 cm.
- "Kalınlık öner" bu aralığın dışına çıkmaz; üst sınırda da yetmiyorsa kalınlığı büyütmez, uyarır (çözüm: donatı, ara mesnet, bölme perdesi).
- Çokal raporundaki tip kesitler (bina): kolon 30/30 (8Ø14), 30/50 (10Ø14), 40/60 (14Ø16); kiriş 30/60, 40/60 (8,8 m açıklıkta 40/80); döşeme 15 cm; radye 40 cm.

### Eleman birleşimleri ve minha (13.11.2026)
- Yapı elemanları eksenden eksene çizilebilir; birleşimde hangisinin bütün kalacağını program belirler. Öncelik sırası: temel / radye > kolon > betonarme perde > kiriş > döşeme > tuğla (dolgu) duvar > sıkıştırılmış dolgu. Önceliği yüksek eleman bütün kalır, öbürü birleşimde kesilir.
  - Kiriş kolon ve perde yüzünde biter (temiz açıklık). Kiriş tam yüksekliğiyle (döşeme kalınlığı dahil) kirişe sayılır; döşeme kiriş yüzleri arasında kalır — Çokal statik paftalarındaki gibi (30/60 kirişte etriye 23 × 55: kesit döşemeyi içerir; kullanıcı kararı 13.11.2026: "örnekte hangisine aitse ona").
  - Tuğla duvar kolonlar arasında ve kiriş altında kalır; betonarme perdeye girmez.
  - Döşeme kolon izinden delinir.
- Boşluklar (minha) elemanın kendi hacminden düşülür: pencere, kapı, döşeme ve perdedeki geçişler, kanal ve kaide yuvaları.
- Aynı hacim iki kez sayılmaz: metraj (`INSMETRAJ`), çakışma dökümü (`INSCAKISMA`) ve statik hesaba giden eleman listesi aynı net parçaları kullanır (`app/yapi-cakisma.js`).
- Aynı türden iki elemanın üst üste binmesi (perde–perde, döşeme–döşeme, duvar–duvar, aynı doğrultuda kiriş–kiriş) birleşim değil model hatasıdır; program bunu düzeltmez, gösterir.

## Paftalama ve çizim
- Statik çizimler Tasarım (model) alanına değil Statik disiplin pafta grubuna gider. Bir kez alınan kesit tüm disiplin paftalarında (Mimari, Mekanik, Statik, Elektrik) kendiliğinden görünür.
- Disiplin paftalarında 3B perspektif görünüş bulunur; beton içindeki donatı 3B'de yalnız Statik disiplininde görünür.
- Antet: çizimin değil, kullanıcının programa yüklediği kendi anteti kullanılır.
- Pafta ölçeği bina ebatına göre seçilir (14.11.2026): plan ve kesitler önce 1/50 ile A0 ya da A1 paftaya yerleştirilir; sığıyorsa 1/50 kalır. Çizim paftada çok küçük kalıyorsa 1/25, A0'a sığmayacak kadar büyükse 1/100 verilir. (Eski kural: terfi istasyonu mimari/mekanik plan ve kesitlerinde 1/25 — artık bu seçimin "çok küçük kalıyor" durumu.) Pafta sayısı kendiliğinden ayarlanır.
- Boru etiketlerinde genel malzeme adı yerine malzeme kalitesi yazılır (ör. SS304, SS304L, SS316, SS316L; "PASLANMAZ" değil). Tüm boru tipleri için geçerli.
- Ünite numaraları ünite eklenip çıkarıldıkça yeniden numaralanır.
- Çizim, pafta ve raporlar için dil seçeneği vardır ve tüm disiplinlere uygulanır.
- Mimari paftalama otomatiktir (14.11.2026): kesit yerleri belirlenince program planları, kesitleri, görünüşleri, mahal listesini, kapı / pencere / korkuluk detaylarını ve çatı planı, çatı kesiti, çatı detay paftasını kendisi hazırlar ve en uygun şekilde paftalara yerleştirir. Öbür disiplinlerin paftalamasını kullanıcı kendi birimi içinde yapar.
- Kapı ve pencereler ebatlarına göre tip numarası alır (projedeki gibi; aynı ebat aynı numara) ve numara plan ile kesitlerde yazılır.
- Kiriş ile döşeme monolitik tek beton olarak modellenir ve çizilir (aralarında çizgi yok); çatı döşemesi ve zemin döşemesi dahil.
- Pencere / kapı duvarı parçalara bölmez; duvar tek eleman kalır.
- Kesitlerde çatı soluk çizilmez (14.11.2026): kesit düzleminin kestiği çatı elemanları (çatı döşemesi, makas / aşık / mertek, kaplama ve örtü) kesilen eleman çizgisiyle (kalın), arkada görünenler görünüş çizgisiyle (`Ongor`) çizilir.
- Plan ve kesitlerde aks çizgileri ve aks başlıkları bulunur; ölçüler örnek projelerdeki gibi akslar üzerinden verilir.
- Kesit yerleri mahalleri ayrı ayrı gösterecek şekilde seçilir (14.11.2026): uzun kesit bütün mahallerden geçer; kısa kesit iki tanedir, biri büyük hacimden (ör. pompa / montaj holü), öbürü odalardan (ör. kumanda odası) geçer. Bir oda hiçbir kesitte görünmüyorsa ek kesit alınır.
- Ölçü sıraları üst üste binmez; sıralar arası 25 cm (1/50'de kâğıtta 5 mm). Plan, kesit, görünüş ve detay, bütün ölçülendirmede geçerli (14.11.2026).
- Görünüşlerde bina içindeki merdivenler (ve dışarıdan görünmeyen iç elemanlar) çizilmez.

## Proses ve ünite tasarımı
- Izgara yapısı: kanal derinliği ≈ su derinliği + yaklaşık 1 m hava payı; temel kotu arazi kotundan türer; baypas kanalı zorunlu.
  - Kanal derinliğinde ATV formülü (su derinliği + yük kaybı + hava payı) değil, bu standart kullanılır.
  - Baypas kanalı = yedek kanal (ayrı bir baypas kanalı çizilmez).
  - Çöp konteyneri: standart belediye konteyneri yüksekliği (1100 L, EN 840, ≈1,37 m); konveyör ona göre oturur.
  - Yürüme platformu zeminden en az 0,65 m yukarıda olur (Çokal AAT T-101: zemin 94,80, platform 95,45).
  - Konteynerlerin altında süzüntü suyunu toplayan bir kanal bulunur (Çokal'da 60 cm, ızgara kanalları arasında).
  - Izgara boşaltma ağzı platformdan 1,0 m (halatlı tip). Altında enine bant konveyör: bant = ağız − 0,15 m; konveyörün altı (şase ve tambur, bandın ≈0,28 m altı) konteyner üstünden en az 0,30 m yukarıda; konteyner zorlarsa ızgara boşaltma ağzı yükselir. Konveyör yapının dışındaki konteynere boşaltır; korkuluk geçişte açılır.
  - Izgara yapısının yüksekliği (kanal tabanı → platform) 4,00 m alınır (Çokal'da 8,70 m idi); terfi haznesi ve pompa kotları kanal tabanıyla birlikte kayar. Bu derinlikte kapaklar tam şasidir.
  - Kanallar arası orta perde kanal tabanından 1,00 m yüksekliktedir (Çokal C-C) ve bütün kapaklara (çıkıştan girişe, A kapaklarına kadar) uzanır.
  - Kaba ve ince ızgara bölgelerinin boyu (dolayısıyla yapı boyu) ızgaradan türetilir: mansap kapağı + konveyör payı (kapak ekseninden ≥ 0,68 m) + ızgaranın ayaktan boşaltma ağzına yatay izi + ayak → memba kapağı 0,35 m + memba kapağı. Izgara yüksekliği değişince yapı boyu da değişir; konveyör hiçbir kapak tahrikinin üstüne gelmez.
  - Izgara ile konveyör arası en az 0,60 m: ızgaranın deşarj oluğu buna göre uzar (bant 50 cm'de 1,30 m); konveyör motoru ızgaranın öbür yanında. Izgara kafası deşarj ağzıyla birlikte yükselir (ağız + 1,29 m). Bu düzen onaylandı.
  - Döşemedeki ızgara açıklığı: ızgaranın platformu kestiği yer (ön yüz – arka yüz) + her yanda 0,20 m, kanal eninde.
  - Terfi pompaları: basma borusu dış duvar dibinde (iç yüzden ≈0,45 m), pompa gövdesi kanala doğru.
- Kanal kapakları (penstok): 5 m derinliğe kadar tam şasi (platforma kadar); daha derinde kısa şasi (açıklık + 0,35 m) ve uzatma mili, tahrik platformda zemin ayağı üstünde (Çokal ızgara kanalları).
- Kum ve yağ tutucu (havalandırmalı, gezer köprülü; Çokal AAT T-103 örneği):
  - Hat (göz) sayısı: en büyük debi / 5.000 m³/h, yukarı yuvarlanır; en az 2 hat (biri bakımdayken öbürü çalışır).
  - Her göz: kum bölmesi + ayırma (yağ lameli) + yağ bölmesi. Gözler arası duvar 30 cm, dış duvar 40 cm.
  - Havuzun bir ucunda dağıtma (giriş) kanalı, öbür ucunda çıkış kanalı; ikisinin de iç genişliği 1,50 m.
  - Duvar üstü = su yüzü + 1,70 m (Çokal: su 97,45, duvar üstü 99,15); orta yürüme yolu duvar üstünden 0,85 m aşağıda; duvar üstü zeminden en az 0,65 m yukarıda.
  - Kum oluğu tabandan 0,50 m aşağıda; oluğun altında 0,64 m grobeton dolgu, onun altında 0,50 m taban plağı.
  - Blowerlar tesis büyüklüğüne göre ana blower binasında ya da kum tutucunun yanında küçük binada (Çokal'da ana binada).
  - Çizim kuralları (KUMTUTUCU komutu, Çokal G-G kesiti; 11 Kasım 2026'da onaylandı): yağ bölmesi dış duvar tarafında, komşu gözler aynalı; kum oluğu 50 cm taban eninde, yanları 10 cm açılır, ayırma kirişinin dibinde; taban oluğun üstünden duvar diplerine 45° yükselen grobeton dolgu, altı düz taban plağı (50 cm).
  - Ayırma kirişi betonarme (su yüzünün 30 cm üstünden 55 cm aşağı), altında sac yağ lameli. Gözler arası duvar alçak, üstünde 1,00 m yürüme yolu (duvar üstünden 0,85 m aşağıda); gezer köprü rayları dış duvarların üstünde.
  - Ayırma kirişinin altında 40 cm'lik kolonlar (eksen aralığı ≈ 3,80 m); paslanmaz yağ lamelleri kolonlar arasında panel olarak kolonlara monte edilir. Yağ bölmesinin çıkış ucunda betonarme yağ toplama kanalı (Çokal I-I: iç boy 0,60 çıkış duvarından, en yağ bölmesi kadar, tabanı 20 cm, yan ve uç duvarı 20 cm) ve önünde 0,40 m paslanmaz sıyırma rampası; yağ borusu (SA DN150 SS304L) kanal tabanından dış duvardan çıkıp konteynere iner, duvarda konsol mesnet. (13.11.2026'da Çokal T-103'ten düzeltildi; eskiden 40 × 40 paslanmaz çukur yazıyordu.)
  - Havalandırma: her gözde kum bölmesi duvarı boyunca ana hava borusu (CA DN50 SS304L, yürüme yolunun üstünde mesnetli boru), göz başına izolasyon vanalı DN32 düşümler — sayı = L / 2,75 (yuvarlanır), aralık ≈ 2,75 m, uçlarda yarım aralık (Çokal alt planı: 4 düşüm) — ve ucunda boru difüzör (kum oluğunun üstünde). Vana yatay kolda, yürüme yolundan erişilir (Çokal F-F; 13.11.2026'da düzeltildi, eskiden 1,50 m aralık yazıyordu). Duvardan geçen borular duvar geçiş parçasıyla (su tutucu flanşlı); kum seperatörü yapıya paralel, oluğun dışında.
  - Gezer köprü rayları iki dış duvar boyunca; köprü kirişleri orta yürüme yolu korkuluğunun üstünden geçer. Kum pompası basma hattı köprü boyunca gidip dirsekle üst kum oluğuna iner; oluğun tabanından kum seperatörüne iniş borusu.
  - Çıkış kanalı gözlerden derin (Çokal: tabanı 93,45), çıkış borusu tabanda; üstü yürüme yolu kotunda sahanlık. Merdiven anaerobik havuzdaki gibi: duvara paralel, plaklı, üst sahanlığı sahanlığa bitişik; yeri Çokal'daki gibi çıkış kanalı tarafındaki uç duvarın dışında (14.11.2026). Göz boyu varsayılanı 11,00 m (Çokal; 14.11.2026). Hava başlığı malzemesi SS304L (Çokal F-F'deki "SS304" yazısı hatalı kabul edildi; 14.11.2026). Giriş kapakları duvarın dağıtma kanalı yüzüne monte.
  - Bir dış duvarın üstünde dışa konsol kum oluğu (iç 40 cm): kum pompaları buraya basar, oluk yandaki kum seperatörüne akar. Dağıtma kanalından her göze kum bölmesi ekseninde 60 × 40 kapaklı açıklık; çıkış duvarında göz başına savak.
- Giriş terfi istasyonu (ıslak hazne, dalgıç pompa; Çokal AAT T-102 örneği):
  - Yapı nihai kademeye göre boyutlanır; mevcut kademede eksik pompalar sonradan aynı yapıya eklenir.
  - Islak hazne hesabı (ATV-DVWK-A 134, onaylandı): faydalı hacim V = 0,9·Qp/Z (tek pompa, Z = 10 kalkış/saat). Seviyeler yukarıdan: en üst (yedek pompa + alarm) = giriş kanalı tabanı − 0,86; son asıl pompa 0,40 aşağıda; her önceki asıl pompa 0,15 aşağıda; durma = 1. asıl pompa − en büyük(0,20 ; V / hazne alanı); taban = durma − 0,35 (ölü yükseklik). Derinlik bu zincirden çıkar. Faydalı yükseklik 1,00 m'yi aşarsa hazne genişler. Çokal T-102 ile doğrulandı (85,89 / 85,50 / 85,35 / 85,15 / 84,80).
  - Üst döşeme zeminden en az 0,65 m yukarıda. Duvar 40 cm, taban plağı 40 cm.
  - Monoray vinç kirişi üst döşemeden 2,70 m yukarıda.
  - Pompalar haznenin uzun kenarı boyunca dizilir: aks aralığı 1,00 m, son pompa aksından duvara 0,95 m (katalog, dalgıç pompa).
- Giriş debimetresi (varsayılan manyetik; Çokal AAT T-104 örneği):
  - Nihai kademe Q maks.'a göre boyutlanır. Boru PE100, PN10 (SDR 17); Q maks.'ta hız ≤ 1,5 m/s olan en küçük çap seçilir. Q min.'da hız ≥ 0,3 m/s olmalı.
  - Düz boru boyları: debimetre öncesi 5·DN, sonrası 3·DN.
  - Debimetre odası: iç en az 2,00 (akış yönü) × 1,50 m; duvar 25 cm, taban plağı 30 cm; boru altı tabandan 0,42 m yukarıda; üst döşeme zeminden 0,45 m yukarıda.
  - Parshall savağı seçimli: boğaz genişliği standart tablodan; kot düşümü hidrolik profile işlenir.
- Anaerobik havuz (Çokal AAT T-105 biçimi):
  - Statik (3B kabuk, kullanıcı kabulleri): su yükü bölme senaryolarıyla — hepsi dolu; iki yan halka dolu, orta halka boş (orta ve yönlendirme perdelerine tek taraf su verilmez). Tasarım değerleri 1 m şerit ortalaması (köşe / birleşim tepeleri yerine). Çatlak sınırı 0,20 mm.
  - 50.000 m³/gün örneği (h 4,50 m, zemin 96,95, YAS 93,95): dış duvar / halka yayı / ortak duvar 70 cm, kanal duvarları 65 cm, orta perde 35 cm, yönlendirme perdesi 30 cm, radye 80 cm; zemin gerilmesi 102 kN/m².
  - Karusel halkaları yan yana, ortak duvarlı. Varsayılan 3 halka: 1. halka geri devir (RAS), 2. ve 3. halka ham su; eski projeler için tek halka.
  - Halka iç eni 3,00 m (iç yarıçap 1,50), ortada 30 cm duvar, iki koridor 1,35 m; uçlar yarım daire, dönüşte R0,70–R1,00 kılavuz duvar (yönlendirme perdesi, 30 cm); perdenin çıkış ucundaki düz kısmı (baston) kulvar genişliğinin yarısı (Çokal 0,60 ≈ 0,675). Yürüyüş yolunun yeri açıklığa göre (2,50 m sınırı onaylandı): kulvar en çok 2,50 m ise Çokal gibi bastonun ucundan kulvar / 2 sonra başlar (Çokal köprü 11,00–12,50); daha geniş kulvarda yol bastonun üstüne oturur ve baston en az köprü eni kadar olur (köprü açıklığı yarıya iner). Mikserler yolla birlikte konumlanır; köprü bastonun üstündeyken kılavuz direk baston ucunun önündedir. Dış duvar ve halkalar arası duvar 40 cm.
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
    - Kapak ölçüsü açıldığı açıklığın (ağız, pencere, orifis) eni ve yüksekliğiyle aynı; eşiği açıklığın alt kotunda. Kapak çerçevesi perde yüzüne dayalı (yüzden 6 cm). Halka uçlarındaki yuvarlak duvarda ağız önünde düz yüz yapılır (ağız + her yanda 0,20 m), kapak bu düz yüze oturur.
    - Tahrik kendiliğinden seçilir: kapak alanı 1,0 m²'yi ya da su kuvveti 10 kN'u aşarsa elektrikli aktüatör, değilse el çarkı Aynı perdedeki kapaklar tek tip: biri aktüatörlüyse hepsi aktüatörlü (projede tümü el çarkı / tümü aktüatör yapılabilir).
    - Mikser: yürüyüş yolunun havuzun uzun kısmına bakan yüzünde, uzun kısma doğru akan koridorda, uzun kısma doğru iter; kısa tarafa bakan yüzde mikser yok. Kılavuz direk yürüme yolu tabliyesinin ön yüzüne bağlanır; pergel vinç mikser ekseninde, yürüme yolu tabliyesinin üstünde. Direk kapak sahanlığına değmez. Halka başına 2 ve üzeri mikser gerekiyorsa uzun kısmın öbür ucuna ikinci yürüyüş yolu (merdivenli, korkuluklu) eklenir; merdivenler hep içe bakar (yola havuzun ortasındaki uzun kısımdan çıkar); hangi uzun yanda olacağı seçimli (üst / alt, ANAMERDIVEN ile tıklanarak), varsayılan ikisi de üst yanda karşılıklı; aynı yanda çakışırsa ikinci merdiven dıştan; mikserlerin yarısı oraya, yine uzun kısma bakacak şekilde konur. Sayı ve tip mikser hesabı penceresinin sonucundan (aynı halka için yapılmışsa), yoksa aynı yöntemle otomatik seçimden.
    - Boru delikleri (giriş, RAS, çıkış) varsayılanda açılmaz; saha borulamasından gelir: saha borusunun ucu duvara yakınsa delik borunun eksenine, çapına ve kotuna göre açılır (ANABORU BORUDAN), elle de verilebilir.
    - Su: her bölmeye (halkalar, giriş kanalı, RAS bölümü, çıkış bölümü) maks. ve min. debideki su kotlarıyla su konur (ANASU ile maks./min. arası geçilir). Kayıplar ağız ve pencerelerde batık orifis: Δh = (Q / (0,61·A))² / 2g, A = açıklık eni × eşik üstü su derinliği. Maks. debide son halka = tasarım su yüzü. Min. debide çıkış kanalı mansap savağının yük farkı kadar düşer (savak boyu kabul 2,0 m; 3. parçada hidrolik profilden gelecek). Debiler mevcut kademeden: Q maks., Q min., RAS = %75 × Q maks.
    - Debiden boyutlandırma (onaylandı; ANABOYUT): Q maks. = 1,9 × Q ort., Q min. = 0,5 × Q ort., RAS = %75 × Q maks. (proses verisi yoksa); hacim = 0,75 sa × (Q ort. + RAS); su derinliği ATV'den, yoksa 4,5 m; düz boy ≈ 3,7 × halka iç eni (Çokal 11 / 3), kılavuz perde R = 0,47 × halka iç yarıçapı; geçiş hızı ağızda en çok 0,50 m/s (onaylandı; kapak yüksekliği büyümesin), pencere ve ara duvar orifisinde en çok 0,30 m/s, açıklık üstü su yüzünden 0,11 m yukarıda, önce en (ağız 0,60–1,20, pencere 1,50–3,00) sonra yükseklik büyür; giriş kanalı = en büyük (0,80; ağız + 0,20), çıkış kanalı = en büyük (1,00; ağız + 0,40), kanal hızı en çok 0,30 m/s; boru çapı önerisi PE100 SDR17, boru hızı en çok 1,0 m/s (delik saha borulamasıyla açılır). Çokal debileriyle Çokal açıklıklarını verir.
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
- Mikser seçiminde ortalama akış hızı en az 0,30 m/s ve buna çok yakın olur: tip ve adet seçildikten sonra motor gücü, hızı 0,30'un hemen üstünde tutan en küçük standart güce (0,37 – 0,55 – 0,75 – 1,1 – 1,5 – 2,2 – 3 – 4 … kW) indirilir; eşit güçte hedefe en yakın hız seçilir (karusel ve anaerobik).
- Karıştırıcılar kullanıcının mikser programıyla seçilir ve mekanik listeye eklenir; merdivenler genel yerleşimdeki arazi kotlarından güncellenir; difüzör yerleşimi ayrı sekmede yapılır.

- Su tutucu bant: tüm su yapılarında temel (taban plağı) ile perde birleşimlerinde, perde eksenleri boyunca, taban plağı üstünden 0,10 m yukarıda PVC iç tip (24 cm) su tutucu bant; yapı programı bantları kendiliğinden koyar ve yapıyla birlikte günceller.

## Mekanik tesisat (bina)
- Sıhhi tesisatta içme suyu ve sıcak su boruları duvar içinden geçer, mahal ortasından değil.
- Mekanik tesisat raporu kullanıcının örnek rapor biçimini izler (Yayladağ AAT idari bina mekanik tesisat hesapları raporu ve AAT-B101 sıhhi tesisat paftası).
- İndirilen ağır 3B armatür modelleri programı yavaşlatıyor; hafif, yerleşik 3B armatür çizimleri kullanılır.

## Çalışma şekli
- Program yalnız tamamen bittiğinde kurulabilir masaüstü uygulamasına (Electron/Tauri) çevrilecek; şimdilik .bat ile tarayıcıda çalışır.
- Kullanıcının bilgisayarında SAP2000 kurulu değildir.
- Statik paftalar A0 boyunu (1189 mm) aşmaz: sığmayan çizim sütunları aynı adla (1/n, 2/n …) yeni paftaya geçer. Anaerobik havuzda çatlak sınırı (0,20 mm) modelle birlikte hesap penceresine gelir.
- Pafta çizim stili (mimari ve mekanik plan / kesit paftaları) örnek proje Çokal AAT paftalarıyla birebir (11 Kasım 2026'da onaylandı; `PAFTASTIL`):
  - Yazı `YZ` stili (turkce.shx, 0,70 dar — çizim kuralları Karar 4): genel 2 mm, eleman kodları 2,5 mm. Aks ve kesit harfleri Arial Bold 5 mm; aks balonu çapı 12 mm, kesit işareti dairesi 10 mm.
  - Ölçü eğik tikli, yazı 2 mm (1/25 ve daha büyük ölçekte 3 mm). Kot işareti yarı dolu üçgen, kot yazısında "+" yok (99.15).
  - Kesit başlığı altı tek çizgili "F-F KESİTİ", altında "ÖL:1/20".
  - Malzeme açılımı kodludur: kesitte elemanın yanında yalnız kod (DÖ01, DU01 …); açılımlar paftada "DÖŞEMELER" ve "DUVARLAR" başlıkları altında, tireli ve büyük harfli satırlarla (kalınlık başta, parantez içi küçük). Üniteler (kum tutucu …) kendi açılımlarını verir.

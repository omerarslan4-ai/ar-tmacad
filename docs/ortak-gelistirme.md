# ArıtmaCAD — ortak geliştirme kılavuzu

Bu belge, programı iki kişinin (Ömer Bey ve arkadaşı) ayrı bilgisayarlarda birlikte geliştirmesi içindir. İkisi de yazılımcı değildir; işi Claude'a Türkçe anlatarak yapar. Aşağıdaki komutları elle yazmanız gerekmez: tırnak içindeki cümleyi Claude'a söylemeniz yeter.

## Düzen nasıl çalışır

- Programın **ortak kopyası** internette, yalnız ikinizin görebildiği kapalı bir GitHub deposunda durur: `https://github.com/omerarslan4-ai/ar-tmacad`
- Herkesin bilgisayarında programın **kendi kopyası** vardır (`C:\AritmaCAD`). Orada çalışır, dener, beğenince ortak kopyaya gönderir.
- Ortak kopyaya giren her değişikliğin kimin, ne zaman, ne için yaptığı kayıtlıdır; bozulan bir şey eski hâline döndürülebilir.
- Büyük dosyalar (şablonlar, yedekler, 3B çıktılar, deneme projeleri) ortak depoya **girmez**; ayrı bir bulut klasörüyle paylaşılır (aşağıda).

## İlk kurulum (arkadaşın bilgisayarı, bir kez)

1. **GitHub hesabı** aç: github.com → "Sign up". Kullanıcı adını Ömer Bey'e bildir; o seni depoya davet eder. Gelen davet e-postasındaki "Accept invitation" düğmesine bas.
2. Şu üç programı kur (hepsi ücretsiz, kurulumda "İleri"ye basmak yeter):
   - **Git for Windows** — git-scm.com
   - **Node.js (LTS)** — nodejs.org (testleri çalıştırmak için)
   - **Claude masaüstü uygulaması** — claude.ai/download (kendi Claude hesabınla giriş yap)
3. Programı indir. Başlat menüsünden "PowerShell" aç ve şunu yaz:

   ```powershell
   git clone https://github.com/omerarslan4-ai/ar-tmacad.git C:\AritmaCAD
   ```

   İlk seferde bir tarayıcı penceresi açılıp GitHub girişi ister; giriş yap. Bir daha sormaz.
4. Adını kayda geçir (değişikliklerde bu ad görünür):

   ```powershell
   git -C C:\AritmaCAD config user.name "Adın Soyadın"
   ```

   ```powershell
   git -C C:\AritmaCAD config user.email "eposta@adresin"
   ```

5. Büyük klasörleri yerine koy: Ömer Bey'in paylaştığı bulut klasöründen `sablon`, `yedek`, `3B_ciktilar`, `test-proje` klasörlerini `C:\AritmaCAD` içine **aynı adlarla** kopyala. (Program bunlar olmadan da açılır; yalnız şablon ve deneme projeleri eksik kalır.)
6. Dene: `C:\AritmaCAD\AritmaCAD-Baslat.bat` dosyasına çift tıkla; program açılmalı.
7. Claude uygulamasında "Code" sekmesinden `C:\AritmaCAD` klasörünü aç. Claude, klasördeki `CLAUDE.md` dosyasını kendiliğinden okur; proje kuralları, ajanlar ve firma standartları sende de aynen geçerli olur.

## Günlük çalışma

| Ne zaman | Claude'a ne denir | Arkada ne olur |
| --- | --- | --- |
| İşe başlarken | "Ortak kopyadaki son değişiklikleri al" | `git pull` |
| İş bitince | "Testleri çalıştır, sorun yoksa değişikliklerimi ortak kopyaya gönder" | test → commit → `git pull` → `git push` |
| Merak edince | "Arkadaşım son günlerde neleri değiştirdi?" | `git log` |

Kurallar:

1. **Önce al, sonra çalış.** Güne başlarken ve göndermeden hemen önce son değişiklikleri alın.
2. **Küçük ve sık gönderin.** Günlerce biriktirilen iş, karşı tarafın işiyle çakışır.
3. **Bozuk iş gönderilmez.** Göndermeden önce bütün testler geçmeli (`node araclar/tum-testler.js`) ve program .bat ile açılıp denenmiş olmalı.
4. **Aynı anda aynı parçada çalışmayın.** Kim hangi konuda çalışıyor, birbirinize kısaca yazın (ör. "bu hafta elektrik modülü bende, statik sende"). Ortak dosyalar (`index.html`, `app/ui.js`, `app/ribbon.js`, `app/core.js`, `app/entities.js`, `app/commands.js`, `app/dil-en.js`) en çok çakışan yerlerdir; bunlara dokunan işi bekletmeden gönderin.
5. **Büyük iş ayrı dalda yapılır.** Birkaç gün sürecek bir iş için Claude'a "bunu ayrı bir dalda yap" deyin; iş bitip denenince "ana kopyaya birleştir ve gönder" deyin. Yarım iş böylece karşı tarafı etkilemez.
6. **Kurallar belgede durur, akılda değil.** Claude'un kişisel hafızası bilgisayardan bilgisayara geçmez. Kalıcı bir karar ya da firma kuralı söylediğinizde Claude'dan `docs/tasarim-standartlari.md` ya da `CLAUDE.md` içine yazmasını isteyin; ancak o zaman karşı taraftaki Claude da bilir.
7. **Yeni müşteri dosyası depoya eklenmez.** Gerçek proje dosyaları (`.aritma`, DWG, Excel, PDF) `test-proje/` ya da depo dışındaki bir klasörde durur. `ornekler/` altına yalnız paylaşılmasında sakınca olmayan örnekler konur. (Depoda bugün duran `SW2_3D.dwg` ve `ornekler/` dosyaları Ömer Bey'in onayıyla paylaşılmıştır.)

## Çakışma olursa

İkiniz aynı dosyanın aynı yerini değiştirdiyseniz, "al" ya da "gönder" sırasında Git durur ve "conflict" (çakışma) der. Hiçbir şey kaybolmaz.

- Claude'a şunu deyin: **"Çakışma çıktı. İki tarafın değişikliğini de koruyarak çöz, testleri çalıştır, emin olmadığın yeri bana sor."**
- Claude iki değişikliği birleştirir. Hangisinin doğru olduğunu bilemediği yerde size sorar; siz de bilmiyorsanız arkadaşınıza sorun.
- İçinden çıkılamazsa: "Birleştirmeyi iptal et, eski hâlime dön" deyin (`git merge --abort`). Kendi işiniz yerinde kalır; arkadaşınızla konuşup yeniden denersiniz.
- **Yapmayın:** klasörü silip yeniden indirmek, dosyaları elle üst üste kopyalamak, Claude'a "zorla gönder" (force push) dedirtmek. Bunlar karşı tarafın işini siler.

## Büyük klasörler

| Klasör | Boyut (21.11.2026) | İçerik |
| --- | --- | --- |
| `sablon/` | ~3,5 GB | şablon dosyaları |
| `test-proje/` | ~0,9 GB | deneme projeleri |
| `yedek/` | ~0,2 GB | eski sürümler |
| `3B_ciktilar/` | ~14 MB | 3B çıktılar |

- Bunlar ortak depoya girmez; ortak bir bulut klasöründe (OneDrive ya da Google Drive) durur. Bulut klasörünün adresi: _(Ömer Bey dolduracak)_
- Bulut klasörünü **doğrudan `C:\AritmaCAD` içine eşitlemeyin**; içindekileri elle kopyalayın. Eşitleme programı ile Git aynı klasörde çalışırsa dosyalar bozulabilir.
- Biriniz bu klasörlere yeni bir dosya eklediğinde buluta da koyup diğerine haber verir.

## Sık sorulanlar

- **Yanlış bir şey gönderdim.** Claude'a "son gönderdiğim değişikliği geri al" deyin; geri alma da ayrı bir kayıt olarak gider, kimsenin işi silinmez.
- **Arkadaşımın değişikliği programı bozdu.** "Hangi değişiklik bozdu, bul ve bana anlat" deyin; sonra arkadaşınıza haber verin, birlikte düzeltin.
- **Claude "push yapayım mı" diye soruyor.** Doğrusu budur: siz "gönder" demeden ortak kopyaya hiçbir şey çıkmaz.

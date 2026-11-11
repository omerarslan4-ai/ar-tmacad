# ArıtmaCAD

Atıksu arıtma tesisi ve terfi istasyonu tasarımı için tarayıcıda çalışan CAD programı. Kullanıcı (Ömer Bey) inşaat/çevre tarafında tasarım mühendisidir, yazılımcı değildir; Türkçe konuşur. Açıklamaları Türkçe, kısa ve teknik jargon kullanmadan yap.

## Çalıştırma
- Derleme adımı yok. `AritmaCAD-Baslat.bat` → `index.html` dosyasını Chrome/Edge'de `file://` üzerinden uygulama penceresi olarak açar ve `app/dwg-yardimci.ps1` DWG yardımcısını başlatır.
- `package.json` boş iskelettir; npm bağımlılığı ve test komutu yoktur.
- Değişiklikten sonra kullanıcı programı .bat ile açıp dener. Mümkün olan her yerde kendin de doğrula (aşağıda "Doğrulama").

## Mimari
- Saf JavaScript, çerçeve yok. Her modül `app/*.js` içinde `(function (C) { ... })(...)` biçiminde bir IIFE'dir ve ortak `C` nesnesine eklenir (`C.M` matematik, `C.cmd` komutlar, `C.doc` belge, `C.prim`, `C.meshDef` ...).
- Modüller `index.html` içindeki `<script src>` sırasıyla yüklenir. **Yeni dosya eklersen index.html'e doğru sıraya eklemeyi unutma** (bağımlı olduğu modülden sonra).
- `file://` altında çalıştığı için ES module `import`, `fetch` ile yerel dosya okuma ve sunucu gerektiren hiçbir şey kullanma.
- Arayüz metinleri Türkçedir; İngilizce karşılıklar `app/dil-en.js` içindedir. Yeni arayüz metni eklerken çeviri tablosunu da güncelle.
- Hesap pencereleri `app/hesap/` altındadır (ATV-A 131, blower, mikser, pompa hidroliği, statik).

## Başlıca modüller
- `core.js` çekirdek · `entities.js` varlıklar · `commands.js` komutlar · `ui.js`, `ribbon.js` arayüz · `view2d.js`, `view3d.js` görünüm
- `proses.js` ATV hesabından gelen ünite blokları (`type:'unite'`, veri `C.doc.set.proses`)
- `aile*.js` parametrik aileler (Revit ailesi mantığı; tipler, uydurma kuralı) · `izgara.js` mekanik kaba ızgara
- `havuz-param.js` parametrik havuz · `arazi.js` arazi/TIN ve kot okuma · `borulama.js`, `boru.js` boru kataloğu
- `proje-hesap.js` pompa istasyonu hesap merkezi (`C.doc.set.projeHesap`) · `proje.js` .aritma proje dosyası ve canlı görünümler
- `statik*.js`, `hesap/statik-*.js` statik hesap, donatı ve DSİ paftaları · `mt-*.js` bina mekanik tesisat modülü
- `layout.js`, `paftalar.js`, `gorunumler.js` paftalama ve disiplin görünümleri

## Kurallar
- **Mevcut özellikleri bozma.** Bir modülü değiştirmeden önce onu kullanan yerleri ara. Kullanıcı farklı oturumlarda farklı parçalarda çalışır; ilgisiz dosyalara dokunma.
- Var olan bir işi yeniden yazma; mevcut modüle bağlan (ör. yeni ünite kartları `proses.js`, `aile.js`, `arazi.js`, `borulama.js` üzerine kurulur).
- Dokunma: `yedek/` (eski sürümler), `sablon/` (kullanıcının büyük şablon dosyaları, ~3,7 GB), `3B_ciktilar/`, `ornekler/`, `kütüphane/` içerikleri. Bunları toplu okumaya da çalışma.
- `app/pdf-isci.js` ve `app/pdf-kutuphane.js` üçüncü taraf kütüphanedir; düzenleme.
- `.aritma` proje dosyası biçimini geriye dönük uyumlu tut: eski dosyalar açılmaya devam etmeli.
- Kod stili: mevcut dosyalardaki gibi (IIFE, `'use strict'`, kısa yardımcılar, Türkçe yorum, dosya başında modülün ne yaptığını anlatan blok yorum).
- Her anlamlı adımdan sonra git commit at; mesajı Türkçe ve kısa yaz. Kullanıcı istemeden push yapma.

## Doğrulama
- Hesap ve geometri mantığını arayüzden ayrı, saf fonksiyonlar olarak yaz ki Node ile denenebilsin.
- Yeni saf mantık için `test/` altına Node ile çalışan küçük testler ekle (`node test/<ad>.test.js`); gerçek bir projenin sayılarıyla karşılaştır.
- Arayüz değişikliğinde programı tarayıcıda açıp konsol hatası olmadığını kontrol et, sonra kullanıcıya neyi denemesi gerektiğini tek cümleyle söyle.

## Okunacak belgeler
- `docs/tasarim-uctan-uca.md` — uçtan uca tesis tasarımı planı (ünite kartı, akış zinciri, kademe mantığı, yerleşim kuralları, üç parçalı kodlama planı). **Şu anki iş bu belgeye göre yürür.**
- `docs/tasarim-standartlari.md` — kullanıcının firma standartları (donatı, pafta, boru etiketleri, statik kabuller). Çizim ya da hesap üreten her işte uy.
- `KILAVUZ.html` — programın kullanım kılavuzu.

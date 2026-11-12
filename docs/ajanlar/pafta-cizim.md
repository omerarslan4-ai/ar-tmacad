---
name: pafta-cizim
description: Paftalama, disiplin görünümleri, kesit ve görünüşler, pafta çizim stili (yazı, ölçü, kot, antet), kodlu malzeme açılımı ve dil seçeneği işlerinde kullan.
---

ArıtmaCAD'in paftalama ve çizim stili tarafında çalışan geliştiricisin. Hedef, paftaların Çokal AAT örnek paftalarıyla aynı görünmesidir.

## Alanın
- `app/layout.js`, `app/paftalar.js`, `app/pafta-stil.js`, `app/gorunumler.js`, `app/gorunus.js`, `app/istasyon-pafta.js`
- `app/kesit.js`, `app/kesit3b.js`, `app/kesit3b-yazim.js`, `app/kesitstil.js`, `app/kotstil.js`, `app/yazi.js`, `app/yazicmd.js`, `app/anno.js`, `app/leader.js`
- `app/acilim-kod.js`, `app/acilim-dik.js`, `app/disiplin3b.js`, `app/disiplinetiket.js`, `app/perspektif3b.js`, `app/baslik.js`
- `app/dil.js`, `app/dil-en.js`, `app/dil-cad.js`
- Testler: `test/acilim-kod.test.js`

## Başlamadan önce oku
- `docs/tasarim-standartlari.md` → "Paftalama ve çizim" bölümü ve "Çalışma şekli" bölümündeki pafta çizim stili maddeleri (`PAFTASTIL`)

## Alana özel kurallar
- Bir kez alınan kesit bütün disiplin paftalarında görünür; statik çizimler Statik pafta grubuna gider.
- Antet kullanıcının programa yüklediği antettir.
- Yeni arayüz ya da pafta metni eklediğinde `app/dil-en.js` tablosunu aynı işte güncelle.
- Stil değişikliği bütün disiplinleri etkiler: değişiklikten sonra en az bir mimari, bir mekanik ve bir statik paftayı tarayıcıda açıp kontrol et ya da kullanıcıya hangilerine bakması gerektiğini yaz.

## Ortak kurallar
- Önce `CLAUDE.md` içindeki kurallar geçerlidir; bu dosya onlara ek getirir, hiçbirini kaldırmaz.
- Yalnız kendi alanındaki dosyaları değiştir. Alan dışı bir dosyada değişiklik gerekiyorsa dur; hangi dosyada neyin neden gerektiğini yaz ve ana oturuma bırak.
- Ortak dosyalar (`index.html`, `app/ui.js`, `app/ribbon.js`, `app/core.js`, `app/entities.js`, `app/commands.js`, `app/dil-en.js`): yalnız ekleme yap (script satırı, menü girişi, çeviri satırı). Var olan satırları yeniden düzenleme; ne eklediğini raporda yaz.
- Hesap ve geometri mantığını arayüzden ayrı saf fonksiyon olarak yaz ve `test/` altına Node testi ekle. Sayıları gerçek bir projeyle (örnekler aşağıda) karşılaştır.
- `docs/tasarim-standartlari.md` içinde yazmayan bir firma kuralı gerekiyorsa varsayım yapma; soruyu rapora yaz.
- Commit atarken yalnız kendi değiştirdiğin dosyaları ekle (`git add <dosya>`); `git add -A` kullanma. Push yapma.

## İş bitince rapor
1. Değişen dosyalar ve her birinde ne değişti (birer satır).
2. Çalıştırdığın testler ve sonuçları.
3. Alan dışında gereken ya da ortak dosyalara eklenen şeyler.
4. Kullanıcının programda neyi denemesi gerektiği (tek cümle).
5. Açık kalan sorular.

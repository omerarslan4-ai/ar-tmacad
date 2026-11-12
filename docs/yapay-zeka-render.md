# Yapay zekâ ile render — kurulum

ArıtmaCAD'deki **✨ Yapay zekâ render** düğmesi, Google 3B sekmesindeki görünümü bu bilgisayarda çalışan
ücretsiz **ComfyUI** programına gönderir; ComfyUI görüntüyü fotoğraf gibi yeniden çizer ve geri verir.
İnternete görüntü gönderilmez, ücret ya da üyelik yoktur. Ekran kartı işi yapar (bu bilgisayardaki RTX 5070 Ti yeterlidir).

Kurulum bir kez yapılır, yaklaşık 15 GB yer tutar.

## 1. ComfyUI'yi kurun
1. https://www.comfy.org/download adresinden **Windows** sürümünü indirip kurun (ekran kartı sorusunda **NVIDIA** seçin).
2. İlk açılışta kendi dosyalarını indirir; bitince ComfyUI penceresi açılır.

## 2. Modeli indirin (fotoğraf gerçekliğini veren dosya)
1. **RealVisXL V5.0** modelini indirin (yaklaşık 6,5 GB, `.safetensors` uzantılı tek dosya):
   https://huggingface.co/SG161222/RealVisXL_V5.0 → *Files* sekmesi.
2. Dosyayı ComfyUI klasöründeki `models\checkpoints` klasörüne koyun.

İsteğe bağlı ama önerilir — **kenar kılavuzu** (binanın çizgilerinin bozulmamasını sağlar):
1. https://huggingface.co/xinsir/controlnet-union-sdxl-1.0 → *Files* → `diffusion_pytorch_model_promax.safetensors` (yaklaşık 2,5 GB).
2. Dosyanın adını `controlnet-union-sdxl-1.0.safetensors` yapıp `models\controlnet` klasörüne koyun.

Dosyaları koyduktan sonra ComfyUI'yi kapatıp yeniden açın.

## 3. ArıtmaCAD'in bağlanmasına izin verin
ComfyUI varsayılan olarak başka programlardan gelen istekleri reddeder. Bir kez şu ayarı yapın:

- ComfyUI penceresinde **Ayarlar (dişli) → Server-Config → Enable CORS header** kutusuna `*` yazın ve ComfyUI'yi yeniden başlatın.
- (ComfyUI'yi komut satırından çalıştırıyorsanız aynı ayar: `--enable-cors-header "*"`)

## 4. Kullanım
1. ComfyUI açık dursun.
2. ArıtmaCAD → **Google 3B** sekmesi → **Render kipi**ni açın, görünümü istediğiniz açıya getirin.
3. **Ambiyans** seçin (açık gün, sabah, gün batımı, bulutlu) ya da **Fon ekle…** ile kendi gökyüzü / manzara resminizi verin.
4. **✨ Yapay zekâ render** → **Oluştur**. İlk seferde model belleğe yüklendiği için 1–2 dakika, sonrakiler 15–40 saniye sürer.
5. Sonucu beğenirseniz **Kaydet**; beğenmezseniz *Benzetim gücü*nü değiştirip yeniden oluşturun
   (düşük = modele sadık, yüksek = daha fotoğraf gibi ama yapay zekâ ayrıntı uydurabilir).

## Sorun olursa
- **"ComfyUI'ye ulaşılamadı"**: ComfyUI açık mı? 3. adımdaki ayar yapıldı mı? Program adresi kendisi bulur
  (`http://127.0.0.1:8000` masaüstü sürümü, `http://127.0.0.1:8188` komut satırı sürümü); farklıysa pencereden yazabilirsiniz.
- **"kurulu model yok"**: 2. adımdaki dosya `models\checkpoints` klasöründe değil ya da ComfyUI yeniden başlatılmadı.
- **Bina çok değişiyor**: kenar kılavuzunu seçin ve benzetim gücünü düşürün.

Not: yapay zekâ sunum görseli üretir; ölçü, kot ve ayrıntı açısından proje çizimi yerine geçmez.

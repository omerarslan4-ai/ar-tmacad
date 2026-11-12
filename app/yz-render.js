/* ArıtmaCAD — YAPAY ZEKÂ İLE RENDER (ücretsiz, bu bilgisayarda çalışan ComfyUI ile)
   Google 3B sekmesindeki görünüm (Render kipi + ambiyans + fon) bir görüntü olarak alınır, bu bilgisayarda çalışan ComfyUI'ye
   (açık kaynak, ücretsiz; varsayılan adres http://127.0.0.1:8188) gönderilir; yapay zekâ görüntüyü fotoğraf gibi yeniden çizer.
   Görüntü bilgisayardan çıkmaz, ücret yoktur. Geometri "kenar kılavuzu" (ControlNet / Canny) modeli kuruluysa onunla, yoksa
   yalnız benzetim gücüyle (img2img) korunur. Yapay zekâ ayrıntıları değiştirebilir: sunum görseli içindir, teknik belge değildir.
   Kurulum: docs/yapay-zeka-render.md. Saf kısım (iş akışı ve betim üretimi) test/yz-render.test.js ile Node'da denenir. */
(function (C) {
  'use strict';
  const Y = C.yzRender = {};
  Y.VARSAYILAN = { adres: 'http://127.0.0.1:8188', model: '', kilavuz: '', guc: 0.55, adim: 28, genislik: 1344, tarif: '' };
  const OLUMSUZ = 'cartoon, illustration, 3d render, cgi, low quality, blurry, distorted geometry, extra buildings, text, watermark, logo, people, cars';
  /* betim: tesisin sabit tanımı + ambiyans + kullanıcının (Türkçe de olabilir) kısa tarifi */
  Y.betim = (ambiyansTarif, tarif) => ['photorealistic architectural photograph of a stormwater pumping station site', 'painted plaster buildings with blue concrete frame and flat roofs, concrete tower with yellow handrail, boundary wall, sliding steel gate',
    'asphalt road with concrete kerbs, interlocking paving, mowed lawn island', ambiyansTarif || 'clear blue sky, bright daylight', (tarif || '').trim(), 'natural lighting, realistic materials, high detail, sharp focus, 35mm lens'].filter(Boolean).join(', ');
  /* ComfyUI iş akışı (API biçimi). kilavuz: ControlNet model adı (varsa kenar kılavuzu eklenir) */
  Y.isAkisi = (o) => {
    const guc = Math.max(0.2, Math.min(0.95, +o.guc || 0.55)), w = {
      '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: o.model } },
      '2': { class_type: 'CLIPTextEncode', inputs: { text: o.betim, clip: ['1', 1] } },
      '3': { class_type: 'CLIPTextEncode', inputs: { text: o.olumsuz || OLUMSUZ, clip: ['1', 1] } },
      '4': { class_type: 'LoadImage', inputs: { image: o.resim } },
      '5': { class_type: 'VAEEncode', inputs: { pixels: ['4', 0], vae: ['1', 2] } },
      '6': { class_type: 'KSampler', inputs: { model: ['1', 0], positive: ['2', 0], negative: ['3', 0], latent_image: ['5', 0], seed: o.tohum == null ? Math.floor(Math.random() * 1e15) : o.tohum, steps: Math.round(+o.adim || 28), cfg: 6, sampler_name: 'dpmpp_2m', scheduler: 'karras', denoise: guc } },
      '7': { class_type: 'VAEDecode', inputs: { samples: ['6', 0], vae: ['1', 2] } },
      '8': { class_type: 'SaveImage', inputs: { images: ['7', 0], filename_prefix: 'aritmacad' } },
    };
    if (o.kilavuz) { // kenar kılavuzu: binanın çizgileri korunur, bu yüzden benzetim gücü daha yüksek tutulabilir
      w['9'] = { class_type: 'Canny', inputs: { image: ['4', 0], low_threshold: 0.12, high_threshold: 0.32 } };
      w['10'] = { class_type: 'ControlNetLoader', inputs: { control_net_name: o.kilavuz } };
      w['11'] = { class_type: 'ControlNetApplyAdvanced', inputs: { positive: ['2', 0], negative: ['3', 0], control_net: ['10', 0], image: ['9', 0], strength: 0.75, start_percent: 0, end_percent: 0.85 } };
      w['6'].inputs.positive = ['11', 0]; w['6'].inputs.negative = ['11', 1];
    }
    return w;
  };
  /* sunucudaki model listelerinden öneri: gerçekçi fotoğraf modelleri öne alınır; kılavuz için adında "canny" / "union" geçen */
  Y.oner = (modeller, kilavuzlar) => {
    const puan = n => (/real|photo|juggernaut|epic/i.test(n) ? 3 : 0) + (/xl/i.test(n) ? 1 : 0) - (/inpaint|refiner|turbo|lightning/i.test(n) ? 2 : 0);
    const m = (modeller || []).slice().sort((a, b) => puan(b) - puan(a))[0] || '', xl = /xl/i.test(m);
    const k = (kilavuzlar || []).filter(n => /canny|union|lineart/i.test(n)).filter(n => xl ? /xl/i.test(n) : !/xl/i.test(n))[0] || '';
    return { model: m, kilavuz: k };
  };

  if (typeof document === 'undefined') return; // Node testleri buraya kadar

  const $ = s => document.querySelector(s), S = C.saha3b, RM = C.renderMalz;
  const ayar = Y.ayar = Object.assign({}, Y.VARSAYILAN); try { Object.assign(ayar, JSON.parse(localStorage.getItem('aritmacad.yzRender') || '{}')); } catch (e) { }
  const sakla = () => { try { localStorage.setItem('aritmacad.yzRender', JSON.stringify(ayar)); } catch (e) { } };
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const adres = () => String(ayar.adres || Y.VARSAYILAN.adres).replace(/\/+$/, '');
  const getir = async (yol, o) => { const r = await fetch(adres() + yol, o); if (!r.ok) throw new Error('ComfyUI ' + r.status + ' (' + yol.split('?')[0] + ')'); return r; };
  /* sunucudaki modeller */
  Y.modeller = async () => {
    const liste = async (dugum, alan) => { try { const j = await (await getir('/object_info/' + dugum)).json(), g = j[dugum] && j[dugum].input && j[dugum].input.required && j[dugum].input.required[alan]; return Array.isArray(g) && Array.isArray(g[0]) ? g[0] : (g && g[1] && g[1].options) || []; } catch (e) { if (dugum === 'CheckpointLoaderSimple') throw e; return []; } };
    return { modeller: await liste('CheckpointLoaderSimple', 'ckpt_name'), kilavuzlar: await liste('ControlNetLoader', 'control_net_name') };
  };
  /* bağlan: kayıtlı adres yanıt vermezse ComfyUI'nin bilinen iki adresini de dener (masaüstü sürümü 8000, komut satırı 8188) */
  Y.baglan = async () => {
    try { return await Y.modeller(); } catch (ilk) {
      const eski = ayar.adres;
      for (const a of ['http://127.0.0.1:8000', 'http://127.0.0.1:8188']) { if (a === adres()) continue; ayar.adres = a; try { const l = await Y.modeller(); sakla(); return l; } catch (e) { } }
      ayar.adres = eski; throw ilk;
    }
  };
  /* görüntüyü gönderir, iş akışını çalıştırır, sonucu Blob olarak döndürür. ilerleme(metin) */
  Y.uret = async (tuval, o, ilerleme) => {
    const il = ilerleme || (() => { }), png = await new Promise(r => tuval.toBlob(r, 'image/png')), ad = 'aritmacad_' + Date.now() + '.png';
    il('Görüntü yapay zekâya gönderiliyor…'); const fd = new FormData(); fd.append('image', png, ad); fd.append('overwrite', 'true');
    const yuk = await (await getir('/upload/image', { method: 'POST', body: fd })).json(), resim = (yuk.subfolder ? yuk.subfolder + '/' : '') + (yuk.name || ad);
    const akis = Y.isAkisi({ model: o.model, kilavuz: o.kilavuz, guc: o.guc, adim: o.adim, betim: o.betim, resim });
    const kimlik = 'aritmacad-' + Math.random().toString(36).slice(2), is = await (await getir('/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: akis, client_id: kimlik }) })).json();
    if (!is.prompt_id) throw new Error('iş başlatılamadı' + (is.error ? ': ' + (is.error.message || JSON.stringify(is.error)) : ''));
    const t0 = Date.now();
    for (;;) {
      await new Promise(r => setTimeout(r, 1000)); const sn = Math.round((Date.now() - t0) / 1000); il('Yapay zekâ çiziyor… ' + sn + ' sn'); if (sn > 900) throw new Error('15 dakikada bitmedi');
      const h = await (await getir('/history/' + is.prompt_id)).json(), kayit = h[is.prompt_id]; if (!kayit) continue;
      if (kayit.status && kayit.status.status_str === 'error') throw new Error('yapay zekâ hata verdi: ' + JSON.stringify((kayit.status.messages || []).slice(-1)[0] || '').slice(0, 300));
      const cik = kayit.outputs && Object.values(kayit.outputs).map(x => x.images && x.images[0]).filter(Boolean)[0]; if (!cik) { if (kayit.status && kayit.status.completed) throw new Error('çıktı görüntüsü yok'); continue; }
      return await (await getir('/view?filename=' + encodeURIComponent(cik.filename) + '&subfolder=' + encodeURIComponent(cik.subfolder || '') + '&type=' + encodeURIComponent(cik.type || 'output'))).blob();
    }
  };
  const KURULUM = '<p><b>ComfyUI\'ye ulaşılamadı.</b> Yapay zekâ render, bu bilgisayarda çalışan ücretsiz ComfyUI programını kullanır.</p><ol style="margin:6px 0 6px 18px;line-height:1.5"><li>ComfyUI\'yi kurun ve bir gerçekçi fotoğraf modeli (checkpoint) indirin — ayrıntılı adımlar: <code>docs/yapay-zeka-render.md</code>.</li><li>ComfyUI\'yi <b>başka adreslerden bağlantıya izin vererek</b> çalıştırın (ayar: <i>Enable CORS header</i> = <code>*</code>, ya da komut satırında <code>--enable-cors-header "*"</code>).</li><li>ComfyUI açıkken bu pencerede <b>Yeniden dene</b>\'ye basın.</li></ol>';
  /* pencere */
  Y.pencere = async () => {
    if (!S || !C.g3d || !C.g3d.viewer) { C.warn && C.warn('Önce Google 3B sekmesini açın.'); return; }
    const b = C.modal('Yapay zekâ ile render', '<div id="yzGovde"><p class="hint">Bu bilgisayardaki yapay zekâya bağlanılıyor…</p></div>');
    const govde = b.querySelector('#yzGovde'); let liste = null;
    try { liste = await Y.baglan(); } catch (err) { govde.innerHTML = KURULUM + '<div class="fld"><label>ComfyUI adresi</label><input id="yzAdres" type="text" value="' + esc(ayar.adres) + '" style="font-family:monospace"></div><p class="hint">Hata: ' + esc(err.message || err) + '</p><div class="bar" style="justify-content:flex-end"><button id="yzKapat">Kapat</button><button id="yzYeniden" class="pri">Yeniden dene</button></div>'; govde.querySelector('#yzKapat').onclick = () => C.closeModal(); govde.querySelector('#yzYeniden').onclick = () => { ayar.adres = govde.querySelector('#yzAdres').value.trim() || Y.VARSAYILAN.adres; sakla(); C.closeModal(); Y.pencere(); }; return; }
    if (!liste.modeller.length) { govde.innerHTML = '<p><b>ComfyUI çalışıyor ama kurulu model yok.</b> Bir gerçekçi fotoğraf modeli (checkpoint) indirip ComfyUI\'nin <code>models/checkpoints</code> klasörüne koyun; adımlar <code>docs/yapay-zeka-render.md</code> içinde.</p><div class="bar" style="justify-content:flex-end"><button id="yzKapat" class="pri">Kapat</button></div>'; govde.querySelector('#yzKapat').onclick = () => C.closeModal(); return; }
    const on = Y.oner(liste.modeller, liste.kilavuzlar); if (!liste.modeller.includes(ayar.model)) ayar.model = on.model; if (ayar.kilavuz !== '-' && !liste.kilavuzlar.includes(ayar.kilavuz)) ayar.kilavuz = on.kilavuz;
    const am = RM ? RM.ambiyans(C.doc && C.doc.set.render && C.doc.set.render.ambiyans) : null, fon = !!(C.doc && C.doc.set.render && C.doc.set.render.fon);
    govde.innerHTML = '<p class="hint">O anki görünüm (Render kipi' + (am ? ', ambiyans: ' + esc(am.ad) : '') + (fon ? ', fon resmi' : '') + ') bu bilgisayardaki yapay zekâya gönderilir ve fotoğraf gibi yeniden çizilir. Ücretsizdir, görüntü bilgisayardan çıkmaz. Yapay zekâ ayrıntıları değiştirebilir.</p>' +
      '<div class="fld"><label>Model</label><select id="yzModel">' + liste.modeller.map(n => '<option' + (n === ayar.model ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></div>' +
      '<div class="fld"><label>Kenar kılavuzu (binanın çizgilerini korur)</label><select id="yzKilavuz"><option value="-">yok — yalnız benzetim gücü</option>' + liste.kilavuzlar.map(n => '<option' + (n === ayar.kilavuz ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></div>' +
      '<div class="fld"><label>Benzetim gücü: <span id="yzGucY"></span> <span class="hint">(düşük = modele sadık · yüksek = daha fotoğraf gibi, daha çok değişiklik)</span></label><input id="yzGuc" type="range" min="0.25" max="0.9" step="0.05" value="' + (+ayar.guc || 0.55) + '" style="width:100%"></div>' +
      '<div class="fld"><label>Ek tarif (isteğe bağlı; ör. "ıslak asfalt, arkada palmiyeler")</label><input id="yzTarif" type="text" value="' + esc(ayar.tarif) + '"></div>' +
      '<div id="yzSonuc" style="margin:8px 0;min-height:20px"></div><div class="bar" style="justify-content:space-between"><span class="hint" id="yzDurum"></span><span><button id="yzKapat">Kapat</button><button id="yzKaydet" style="display:none">Kaydet</button><button id="yzUret" class="pri">✨ Oluştur</button></span></div>';
    const q = s => govde.querySelector(s), gucYaz = () => q('#yzGucY').textContent = (+q('#yzGuc').value).toFixed(2); gucYaz(); q('#yzGuc').oninput = gucYaz;
    q('#yzKapat').onclick = () => C.closeModal(); let sonBlob = null;
    q('#yzKaydet').onclick = () => { if (!sonBlob) return; const ad = ((C.doc.set.name || 'gorunum') + '-yapay-zeka.png').replace(/[\\/:*?"<>|]+/g, '_'), a = document.createElement('a'); a.href = URL.createObjectURL(sonBlob); a.download = ad; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 6000); C.log && C.log('✨ Yapay zekâ render indirildi: ' + ad); };
    q('#yzUret').onclick = async () => {
      ayar.model = q('#yzModel').value; ayar.kilavuz = q('#yzKilavuz').value; ayar.guc = +q('#yzGuc').value; ayar.tarif = q('#yzTarif').value; sakla();
      const dur = t => { q('#yzDurum').textContent = t; }, dug = q('#yzUret'); dug.disabled = true; q('#yzKaydet').style.display = 'none';
      try {
        dur('Görünüm alınıyor…'); const tuval = await S.kareYakala(+ayar.genislik || 1344);
        const blob = await Y.uret(tuval, { model: ayar.model, kilavuz: ayar.kilavuz === '-' ? '' : ayar.kilavuz, guc: ayar.kilavuz && ayar.kilavuz !== '-' ? Math.min(0.95, ayar.guc + 0.2) : ayar.guc, adim: ayar.adim, betim: Y.betim(am && am.tarif, ayar.tarif) }, dur);
        sonBlob = blob; const u = URL.createObjectURL(blob); q('#yzSonuc').innerHTML = '<img src="' + u + '" style="max-width:100%;border-radius:6px;display:block">'; q('#yzKaydet').style.display = ''; dur('Hazır. Beğenmediyseniz gücü ya da tarifi değiştirip yeniden oluşturun.');
      } catch (err) { console.warn(err); dur('Olmadı: ' + (err.message || err)); }
      dug.disabled = false;
    };
  };
  const kur = () => { const ctl = $('#g3Ctl'), satir = $('#shAmbRow'); if (!ctl || !satir || $('#yzDugme')) return; const bt = document.createElement('button'); bt.id = 'yzDugme'; bt.textContent = '✨ Yapay zekâ render'; bt.title = 'Bu görünümü bu bilgisayardaki ücretsiz yapay zekâ (ComfyUI) ile fotoğraf gibi yeniden çizer'; bt.onclick = () => Y.pencere(); satir.appendChild(bt); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(kur, 60)); else setTimeout(kur, 60);
  C.addCommand && C.addCommand(['YZRENDER', 'AIRENDER'], 'Google 3B görünümünü bu bilgisayardaki ücretsiz yapay zekâ (ComfyUI) ile fotoğraf gibi yeniden çizer', () => { C.setView('g3d'); setTimeout(() => Y.pencere(), 1200); }, { noUndo: true });
  if (window.DIL && window.DIL.ekle) { try { window.DIL.ekle('en', 'English', [['✨ Yapay zekâ render', '✨ AI render'], ['Yapay zekâ ile render', 'AI render'], ['✨ Oluştur', '✨ Generate'], ['Kaydet', 'Save'], ['Yeniden dene', 'Retry'], ['Benzetim gücü', 'Strength'], ['Ek tarif', 'Extra description'], ['Kenar kılavuzu', 'Edge guide']]); } catch (e) { } }
})(typeof window !== 'undefined' ? window.C : globalThis.C);

/* ArıtmaCAD — sohbet asistanı: çevrimdışı Türkçe anlayıcı, Claude API, sesli giriş, Geliştir modu (eklentiler) */
(function (C) {
  'use strict';
  const M = C.M;
  const store = {
    get: (k, d) => { try { const v = localStorage.getItem('aritmacad.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem('aritmacad.' + k, JSON.stringify(v)); } catch (e) { } },
  };
  C.store = store;
  C.settings = Object.assign({ apiKey: '', model: 'claude-sonnet-5-5', devModel: 'claude-opus-5-5', autoRun: true, voiceAutoSend: true, userName: '' }, store.get('settings', {}));
  C.saveSettings = () => { store.set('settings', C.settings); C.userName = C.settings.userName; };
  C.userName = C.settings.userName;

  /* ================= Türkçe sayı sözcükleri ================= */
  const W = { sifir: 0, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, yirmi: 20, otuz: 30, kirk: 40, elli: 50, altmis: 60, yetmis: 70, seksen: 80, doksan: 90, yuz: 100, bin: 1000 };
  const wordsToNum = s => s.replace(/\b((?:sifir|bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on|yirmi|otuz|kirk|elli|altmis|yetmis|seksen|doksan|yuz|bin)(?:\s+(?:bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on|yirmi|otuz|kirk|elli|altmis|yetmis|seksen|doksan|yuz|bin))*)\b/g, m => {
    let tot = 0, cur = 0; for (const w of m.split(/\s+/)) { const v = W[w]; if (v === 100) cur = (cur || 1) * 100; else if (v === 1000) { tot += (cur || 1) * 1000; cur = 0; } else cur += v; } return String(tot + cur);
  });

  /* ================= Çevrimdışı anlayıcı ================= */
  C.nlp = function (raw) {
    let t = C.ascii(raw).toLowerCase().trim();
    t = wordsToNum(t).replace(/(\d)\s+virgul\s+(\d)/g, '$1.$2').replace(/(\d)\s+nokta\s+(\d)/g, '$1.$2').replace(/eksi\s+(\d)/g, '-$1').replace(/(\d),(\d+)\s*(m|metre|mm|cm|l\/s|lt|litre)\b/g, '$1.$2 $3');
    if (C.looksLikeCommand(raw)) return { script: raw.trim(), reply: null };
    const num = re => { const m = t.match(re); return m ? parseFloat(m[1].replace(',', '.')) : null; };
    const coords = [...t.matchAll(/\(?\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)(?:\s*[,;]\s*(-?\d+(?:\.\d+)?))?\s*\)?/g)].map(m => m[3] != null ? `${m[1]},${m[2]},${m[3]}` : `${m[1]},${m[2]}`);
    const dims = t.match(/(\d+(?:\.\d+)?)\s*(?:x|\*|×|carpi)\s*(\d+(?:\.\d+)?)/);
    const has = (...w) => w.some(x => t.includes(x));
    const quoted = (raw.match(/["“”']([^"“”']+)["“”']/) || [])[1];
    const dn = num(/dn\s*(\d+)/) || num(/(\d+)\s*(?:mm|lik)\s*boru/);
    const out = [];
    const S = s => out.push(s);

    if (has('yardim', 'neler yapabilir', 'ne yapabilir', 'komutlar')) return { reply: C.helpText() };
    if (has('pompa istasyon', 'terfi merkez', 'terfi istasyon', 'atiksu pompa')) {
      const kv = [];
      const q = num(/(\d+(?:\.\d+)?)\s*(?:l\/s|lt\/s|l\/sn|lt\/sn|litre)/) || num(/debi[^\d]*(\d+(?:\.\d+)?)/); if (q) kv.push('Q=' + q);
      const n = num(/(\d+)\s*(?:adet\s*)?pompa/) || num(/(\d+)\s*pompali/); if (n) kv.push('N=' + n);
      const z = num(/saatte\s*(\d+)/) || num(/(\d+)\s*(?:kez|defa|kalkis)/); if (z) kv.push('Z=' + z);
      const zin = num(/giris[^\d-]*(-?\d+(?:\.\d+)?)/); if (zin != null) kv.push('ZIN=' + (zin > 0 && has('derin') ? -zin : zin));
      const zg = num(/zemin[^\d-]*(-?\d+(?:\.\d+)?)/); if (zg != null) kv.push('ZG=' + zg);
      if (dn) kv.push('DIN=' + dn);
      const hm = num(/(\d+(?:\.\d+)?)\s*m(?:etre)?\s*(?:basma|manometrik)/) || num(/(?:basma|manometrik)[^\d]*(\d+(?:\.\d+)?)/); if (hm) kv.push('HM=' + hm);
      if (has('paftasiz', 'pafta olmadan', 'pafta istemiyorum')) kv.push('PAFTA=H');
      S(`POMPAISTASYONU ${coords[0] || '0,0'} ${kv.join(' ')}`);
      return { script: out.join('\n'), reply: 'Pompa istasyonu oluşturuyorum (plan, A-A kesiti, 3B model, hesap özeti ve pafta).' };
    }
    if (has('hazne hacmi', 'islak hazne hesab', 'hacim hesab')) { const q = num(/(\d+(?:\.\d+)?)\s*(?:l\/s|lt)/) || 50, z = num(/saatte\s*(\d+)/) || num(/(\d+)\s*(?:kez|kalkis)/) || 10; S(`HAZNEHESAP ${q} ${z}`); return { script: out.join('\n') }; }
    if (has('boru hesab', 'hiz hesab', 'yuk kaybi', 'hidrolik')) { const q = num(/(\d+(?:\.\d+)?)\s*(?:l\/s|lt)/) || 50; const l = num(/(\d+(?:\.\d+)?)\s*(?:m|metre)\s*(?:boy|uzun|hat)/) || 100; S(`BORUHESAP ${q} ${dn || C.pickDN(q)} ${l} 140`); return { script: out.join('\n') }; }
    if (has('katman')) {
      const name = (raw.match(/katman[ıi]?\s*(?:adi|ad[ıi])?\s*[:=]?\s*["“]?([A-Za-zÇĞİÖŞÜçğıöşü0-9_\-]+)/i) || [])[1];
      if (name && !['olustur', 'yeni', 'ac', 'kapat', 'yap', 'ekle'].includes(C.ascii(name).toLowerCase())) {
        const col = Object.keys(C.COLOR_NAMES).find(k => t.includes(k)); const lt = has('kesikli') ? 'DASHED' : has('eksen') ? 'CENTER' : has('gizli') ? 'HIDDEN' : has('noktali') ? 'DOT' : 'CONTINUOUS';
        const lw = num(/(\d+(?:\.\d+)?)\s*mm/) || 0.25;
        if (has('kapat', 'gizle')) S(`LAYER KAPAT ${name}`); else if (has(' ac', 'goster')) S(`LAYER AC ${name}`); else if (has('gecerli', 'aktif', 'ayarla')) S(`LAYER AYARLA ${name}`);
        else S(`LAYER YENI ${C.ascii(name).toUpperCase()} ${col ? C.COLOR_NAMES[col] : 7} ${lt} ${lw}`);
        return { script: out.join('\n') };
      }
    }
    if (has('pafta')) { const sz = (t.match(/\ba([0-4])\b/) || [])[1]; const sc = num(/1\s*[\/:]\s*(\d+)/) || C.doc.set.anno; S(`PAFTA A${sz || 1} ${has('dikey') ? 'D' : 'Y'} ${sc} ${coords[0] || '0,0'} "${quoted || 'PROJE'}" "PLAN"`); return { script: out.join('\n') }; }
    if (has('duvar')) {
      const k = num(/(\d+(?:\.\d+)?)\s*(?:m|cm)?\s*kalinl/) || num(/kalinlig[a-z]*\s*(\d+(?:\.\d+)?)/); const y = num(/(\d+(?:\.\d+)?)\s*(?:m|metre)?\s*(?:yuksek|boy)/) || num(/yuksekli[a-z]*\s*(\d+(?:\.\d+)?)/);
      if (coords.length >= 2) { S(`DUVAR ${k ? 'K=' + (k > 2 ? k / 100 : k) : ''} ${y ? 'Y=' + y : ''} ${coords.join(' ')}`); return { script: out.join('\n') }; }
    }
    if (has('havuz', 'hazne', 'tank')) {
      if (has('daire', 'yuvarlak', 'cokturme', 'dairesel')) { const d = num(/(\d+(?:\.\d+)?)\s*(?:m|metre)?\s*cap/) || num(/cap[a-z]*\s*(\d+(?:\.\d+)?)/) || 20; const h = num(/(\d+(?:\.\d+)?)\s*(?:m|metre)?\s*derin/) || num(/derinli[a-z]*\s*(\d+(?:\.\d+)?)/) || 4; S(`DHAVUZ ${coords[0] || '0,0'} ${d / 2} ${h} 0.35 0.5 "${quoted || 'DAIRESEL HAVUZ'}"`); return { script: out.join('\n') }; }
      if (dims) { const h = num(/(\d+(?:\.\d+)?)\s*(?:m|metre)?\s*derin/) || num(/derinli[a-z]*\s*(\d+(?:\.\d+)?)/) || 4; const tw = num(/(\d+(?:\.\d+)?)\s*(?:m|cm)?\s*duvar/) || 0.3; const zt = num(/kot[a-z]*\s*(-?\d+(?:\.\d+)?)/); S(`HAVUZ ${coords[0] || '0,0'} @${dims[1]},${dims[2]} ${h} ${tw > 2 ? tw / 100 : tw} ${zt != null ? zt : 0.3} ${quoted || 'HAVUZ'}`); return { script: out.join('\n') }; }
    }
    if (has('boru') && coords.length >= 2) { const z = num(/kot[a-z]*\s*(-?\d+(?:\.\d+)?)/); S(`BORU DN=${dn || 200}${z != null ? ' Z=' + z : ''} ${coords.join(' ')}`); return { script: out.join('\n') }; }
    if (has('pompa') && coords.length) { coords.forEach(c => S(`POMPA ${c}`)); return { script: out.join('\n') }; }
    if (has('vana', 'cekvalf') && coords.length) { const tip = has('cekvalf', 'cek valf') ? 'cekvalf' : has('kelebek') ? 'kelebek' : 'surgulu'; const a = num(/(\d+)\s*derece/) || 0; coords.forEach(c => S(`VANA ${c} ${a} DN=${dn || 150} TIP=${tip}`)); return { script: out.join('\n') }; }
    if (has('dikdortgen') && (coords.length >= 2 || dims)) { S(coords.length >= 2 ? `REC ${coords[0]} ${coords[1]}` : `REC ${coords[0] || '0,0'} @${dims[1]},${dims[2]}`); return { script: out.join('\n') }; }
    if (has('daire', 'cember') && coords.length) { const r = num(/yaricap[a-z]*\s*(\d+(?:\.\d+)?)/) || num(/(\d+(?:\.\d+)?)\s*(?:m|metre)?\s*yaricap/); const d = num(/cap[a-z]*\s*(\d+(?:\.\d+)?)/) || num(/(\d+(?:\.\d+)?)\s*(?:m|metre)?\s*cap/); S(`CIRCLE ${coords[0]} ${r || (d ? d / 2 : 1)}`); return { script: out.join('\n') }; }
    if (has('cizgi', 'hat cek', 'cizgi cek') && coords.length >= 2) { S(`LINE ${coords.join(' ')}`); return { script: out.join('\n') }; }
    if (has('yazi', 'metin', 'etiket') && quoted) { const h = num(/(\d+(?:\.\d+)?)\s*(?:m|metre)?\s*yuksek/); S(`TEXT ${coords[0] || '0,0'} ${h || C.annoH(C.doc.set.textH)} 0 ${quoted}`); return { script: out.join('\n') }; }
    if (has('olcu', 'olculendir') && coords.length >= 2) { S(`DIMLINEAR ${coords[0]} ${coords[1]} ${coords[2] || '1'}`); return { script: out.join('\n') }; }
    if (has('kot') && coords.length) { const v = num(/kot[a-z]*\s*(-?\d+(?:\.\d+)?)/); S(`KOT ${coords[0]} ${v != null ? v : ''}`); return { script: out.join('\n') }; }
    if (has('geri al')) return { script: 'UNDO' };
    if (has('yinele')) return { script: 'REDO' };
    if (has('tumunu sil', 'hepsini sil')) return { script: 'ERASE HEPSI', reply: 'Tüm nesneleri siliyorum (Geri Al ile dönebilirsiniz).' };
    if (has('tumunu goster', 'hepsini goster', 'sigdir', 'yakinlas')) return { script: 'ZOOM E' };
    if (has('3b', '3 boyut', 'uc boyut', '3d')) { if (has('yazici', 'stl')) return { script: 'STLOUT' }; return { script: 'GORUNUM 3B' }; }
    if (has('harita', 'uydu')) return { script: 'GORUNUM HARITA' };
    if (has('plan')) return { script: 'GORUNUM PLAN' };
    if (has('google earth', 'kmz')) return { script: 'KMZOUT' };
    if (has('revit', 'ifc', 'bim')) return { script: 'IFCOUT' };
    if (has('stl', 'yazici')) return { script: 'STLOUT' };
    if (has('obj', 'blender', 'sketchup')) return { script: 'OBJOUT' };
    if (has('kaydet', 'dxf')) return { script: 'KAYDET' };
    if (has('yazdir', 'pdf', 'cikti')) return { script: 'YAZDIR' };
    return null;
  };
  /* "LINE 0,0 10,0" komut mu, "yeni katman BORU..." cümle mi? */
  C.looksLikeCommand = function (raw) {
    const toks = C.cmd.tokenize(String(raw).trim()); if (!toks.length) return false;
    if (!C.cmds[C.up(toks[0])]) return false;
    return toks.slice(1).every(t => /^[@#]|^[-+]?[\d.]|=|^[A-Z0-9_ÇĞİÖŞÜ]+$|^(e|h|y|d|c|u|s|r)$/i.test(t) && !/^[a-zçğıöşü]{3,}$/.test(t)) || raw.includes('"');
  };
  C.helpText = () => `**Neler yapabilirim?** (çevrimdışı mod örnekleri)
• "60 l/s, 3 pompalı pompa istasyonu, giriş kotu -3.5" → plan + A-A kesiti + 3B + hesap + pafta
• "0,0 dan 10,0 a 10,5 e çizgi" → çizgi
• "5x3 havuz 4 metre derinlik 0,0" → havuz
• "DN200 boru 0,0 20,0 kot -1.5" → boru
• "yeni katman BORU mavi 0.35 mm" → katman
• "hazne hacmi 50 l/s saatte 10" → V = 0.9·Q/z
• "Revit'e aktar", "Google Earth KMZ", "3B yazıcı STL", "kaydet"
• Doğrudan komut da yazabilirsiniz: LINE 0,0 10,0 • Koordinatlarda ondalık ayırıcı nokta: 2.5,7

Claude API anahtarı girerseniz (⚙) serbest cümleleri ve karmaşık istekleri de anlarım. **Geliştir** modunda programa yeni komut/özellik ekletebilirsiniz.`;

  /* ================= çizim bağlamı (Claude'a) ================= */
  C.contextSummary = function () {
    const d = C.doc, cnt = {};
    d.ents.forEach(e => { cnt[e.type] = (cnt[e.type] || 0) + 1; });
    const bb = C.extents();
    const last = d.ents.slice(-40).map(C.describe).join('\n');
    return `Çizim: "${d.set.name}" | ölçek 1/${d.set.anno} | yazı ${d.set.textH}mm | geçerli katman ${d.cur.layer}
Koordinat sistemi: ${C.geo.describe()}
Katmanlar: ${Object.values(d.layers).map(l => `${l.name}(renk ${l.color}, ${l.lt}, ${(l.lw / 100).toFixed(2)}mm${l.on ? '' : ', kapalı'})`).join('; ')}
Nesne sayıları: ${JSON.stringify(cnt)}
Sınırlar: ${bb ? bb.map(v => v.toFixed(2)).join(', ') : 'boş'}
Seçili: ${C.sel.length ? C.sel.map(e => '#' + e.id).join(',') : 'yok'}
Son nesneler:\n${last || '-'}`;
  };
  C.commandReference = () => C.cmdList.map(d => `${d.names[0]} (${d.names.slice(1).join(',')}): ${d.help}`).join('\n');

  const SYS_DRAW = () => `Sen ArıtmaCAD içinde çalışan bir CAD asistanısın. Kullanıcı arıtma tesisi, atıksu/içme suyu pompa istasyonu ve hidrolik yapılar tasarlayan Türk bir inşaat/çevre mühendisi. Türkçe, kısa ve net cevap ver.
Çizim yaptırmak için cevabına bir \`\`\`cad kod bloğu ekle; içindeki her satır ArıtmaCAD komut satırına sırayla yazılır.
Kurallar:
- Birim metre, Z yukarı. Nokta: x,y veya x,y,z ; göreli @dx,dy ; kutupsal @uzunluk<açı. Ondalık ayırıcı NOKTA.
- Boşluk içeren metinleri "çift tırnak" içine al. Eksik istemler varsayılan değerle geçilir (Enter).
- Alan nesneleri anahtar=değer alır: DUVAR K= Y= Z= ; BORU DN= Z= MAL= ; POMPA TIP= D= Z= AD= Q= H= ; VANA DN= TIP= Z= ; HAVUZ köşe karşıköşe derinlik duvar üstkot ad ; POMPAISTASYONU nokta Q= N= Z= ZG= ZIN= DIN= HEFF= HM= PAFTA=E/H AD="..".
- Seçim isteyen komutlarda HEPSI, SON, KATMAN=ad, TIP=POMPA, #id ya da x,y (o noktadaki nesne) kullan; seçimi bitirip sonraki isteme geçmek için "" (boş tırnak = Enter) yaz. Örn: TRIM HEPSI "" 108,0
- Önce katmanı (LAYER YENI ad renk çizgitipi kalınlık-mm) ve geçerli yap, sonra çiz. Mühendislik hesabı gerekirse kısaca açıkla (Q, V=0.9Qp/z, hız, Hazen-Williams).
- Var olan çizimi bozmamak için gerekirse yeni nesneleri boş bir alana yerleştir.
Komutlar:
${C.commandReference()}

Mevcut durum:
${C.contextSummary()}`;

  const PLUGIN_DOC = `ArıtmaCAD eklenti API'si (tarayıcıda çalışan düz JavaScript, harici kütüphane yok):
Eklenti kodu bir fonksiyon gövdesidir ve şu değişkenleri alır: C (çekirdek), I (girdi), api (arayüz).
- Komut ekle: C.addCommand(['ADI','KISA','TURKCEAD'], 'yardım metni', async (I) => { ... });
  Girdi: await I.pt('istem', {kw:[['K','Kapat']], def}) -> [x,y,z] | 'K' | null(Enter)
         await I.num('istem', varsayılan) ; await I.str('istem', varsayılan) ; await I.kw('istem', [['E','Evet'],['H','Hayır']], 'H')
         await I.sel('Nesne seçin') -> varlık dizisi ; await I.dist('istem', tabanNokta, vars) ; await I.angle('istem', taban, vars) (derece)
  Önizleme: C.cmd.base = nokta; C.cmd.preview = imleç => [ilkel...] ; anahtar=değer için: C.cmd.queue içindeki 'K=V' jetonlarını kendin ayrıştırabilirsin.
- Varlık ekle: C.add('line',{a:[x,y,z],b:[...]}) ; 'pline' {pts:[[x,y,z]...],closed} ; 'circle' {c,r} ; 'arc' {c,r,a0,a1 (derece)} ; 'text' {p,h,s,rot,al:'L'|'C'|'R'|'M'} ;
  'wall' {a,b,t,h,z} ; 'slab' {pts,t,z} ; 'tank' {o:[x,y,0],L,W,H,tw,tb,zt,rot,label} ; 'ctank' {c,D,H,tw,tb,zt,label} ; 'pipe' {pts:[[x,y,z]..],dn,mat,label} ;
  'pump' {p:[x,y,z],d,h,kind:'dalgic'|'kuru',tag,q,hm,rot} ; 'valve' {p,rot,dn,kind:'surgulu'|'cekvalf'|'kelebek'} ; 'dim' {k:'h'|'v'|'al',a,b,p} ; 'kot' {p,v,txt} ; 'box' {o,sx,sy,sz,rot} ; 'cyl' {c,r,h}.
  Ortak alanlar: layer, color(ACI 1-255, 256=katmandan), lt('BYLAYER','DASHED','CENTER'...), lw(mm×100, -1=katmandan). Katman: C.std('BORU') ya da C.ensureLayer(ad, renk, çizgitipi, lw).
- Yeni varlık tipi: C.T.yeniTip = { label:'Ad', prims: e => [C.prim.L(a,b), C.prim.P(pts,closed), C.prim.CI(c,r), C.prim.A(c,r,a0rad,a1rad), C.prim.TX(p,h,metin,rotRad,al), C.prim.S(dolguPts)],
     mesh: e => [C.meshDef.boxM(C.frame(o,rotDeg), x,y,z,en,boy,yük), C.meshDef.cylZ(c,r,z,h), C.meshDef.cylSeg(p1,p2,r), C.meshDef.ext(o,ux,uz,profil2B veya {r},h)],
     xf: (e,X) => { e.p = X.p(e.p); ... }, info: e => 'kısa bilgi' }  (DXF/IFC/KMZ/3B otomatik çalışır).
- Yardımcılar: C.M (add, sub, mul, dist, ang, polar, norm, fmt) ; C.annoH(kagitMm) -> model metre ; C.log(metin) ; C.warn(metin) ; C.doc (ents, layers, set) ; C.sel ; C.changed() ;
  C.cmd.script('çok satırlı komutlar') ; C.geo.toLL([x,y]) / C.geo.toXY(lat,lon) ; C.pickDN(debiLs) ; C.vel(debiLs, dn) ; C.hazen(debiLs, dn, L, C).
- Arayüz: api.button('Etiket', 'KOMUTADI' veya fonksiyon, 'ipucu') araç çubuğuna düğme ekler ; api.panel('Başlık', htmlMetni) sağ panele bölüm ekler (geri döner: kök öğe) ; C.on('change', fn).
Kurallar: Yalnızca tek bir \`\`\`js bloğu döndür (açıklama bloğun dışında, kısa ve Türkçe). İlk satırlar: // @name Eklenti adı  ve  // @desc kısa açıklama. Komut adları ASCII büyük harf. Ağ/sunucu/eval kullanma. Hataları C.warn ile bildir.`;

  const SYS_DEV = () => `Sen ArıtmaCAD programına özellik ekleyen bir yazılım geliştiricisisin. Kullanıcı (su/atıksu altyapısı tasarlayan mühendis) sesli veya yazılı olarak ne istediğini anlatır; sen bunu çalışan bir eklentiye dönüştürürsün.
${PLUGIN_DOC}

Mevcut komutlar:
${C.cmdList.map(d => d.names[0]).join(', ')}

Yüklü eklentiler (aynı @name ile yeniden yazarsan eskisinin yerine geçer):
${C.plugins.list().map(p => `--- ${p.name} ---\n${p.code.length < 12000 ? p.code : p.code.slice(0, 12000) + '\n...(kısaltıldı)'}`).join('\n') || '(yok)'}`;

  /* ================= Claude API ================= */
  C.askClaude = async function (system, messages, model, maxTokens) {
    if (!C.settings.apiKey) throw new Error('API anahtarı yok');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': C.settings.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: model || C.settings.model, max_tokens: maxTokens || 4000, system, messages }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
    return (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
  };
  const blocks = (txt, lang) => [...txt.matchAll(new RegExp('```' + lang + '[^\\n]*\\n([\\s\\S]*?)```', 'g'))].map(m => m[1]);

  /* ================= Eklentiler ================= */
  C.plugins = {
    list: () => store.get('plugins', []),
    save: list => store.set('plugins', list),
    meta: code => ({ name: ((code.match(/@name\s+(.+)/) || [])[1] || 'Adsız eklenti').trim(), desc: ((code.match(/@desc\s+(.+)/) || [])[1] || '').trim() }),
    run(p) {
      try { const fn = new Function('C', 'I', 'api', p.code); fn(C, C.I, C.pluginApi(p)); p.error = null; return true; }
      catch (err) { p.error = String(err && err.message || err); C.warn(`Eklenti "${p.name}" çalıştırılamadı: ${p.error}`); return false; }
    },
    install(code, enabled = true) {
      const m = C.plugins.meta(code), list = C.plugins.list();
      const i = list.findIndex(p => p.name === m.name);
      const p = { id: i >= 0 ? list[i].id : Date.now().toString(36), name: m.name, desc: m.desc, code, enabled, created: i >= 0 ? list[i].created : new Date().toISOString(), updated: new Date().toISOString() };
      const ok = C.plugins.run(p);
      if (i >= 0) list[i] = p; else list.push(p);
      C.plugins.save(list); C.emit('plugins');
      return { ok, p, replaced: i >= 0 };
    },
    remove(id) { C.plugins.save(C.plugins.list().filter(p => p.id !== id)); C.emit('plugins'); },
    toggle(id, on) { const l = C.plugins.list(); const p = l.find(x => x.id === id); if (p) { p.enabled = on; C.plugins.save(l); if (on) C.plugins.run(p); } C.emit('plugins'); },
    loadAll() { for (const p of C.plugins.list()) if (p.enabled) C.plugins.run(p); },
  };

  /* ================= Sohbet akışı ================= */
  C.chat = {
    mode: 'cizim', history: [], devHistory: [],
    async send(text) {
      text = (text || '').trim(); if (!text) return;
      C.emit('chatMsg', { role: 'user', text });
      if (this.mode === 'gelistir') return this.dev(text);
      // 1) çevrimdışı anlayıcı (anahtar yoksa ya da doğrudan komutsa)
      const local = C.nlp(text);
      if (local && (!C.settings.apiKey || C.looksLikeCommand(text))) {
        if (local.reply) C.emit('chatMsg', { role: 'bot', text: local.reply });
        if (local.script) { C.emit('chatMsg', { role: 'cmd', text: local.script }); const r = await C.cmd.script(local.script); if (r.errors.length) C.emit('chatMsg', { role: 'bot', text: '⚠ ' + r.errors.join('\n') }); C.emit('zoomExtents'); }
        return;
      }
      if (!C.settings.apiKey) { C.emit('chatMsg', { role: 'bot', text: 'Bunu çevrimdışı modda anlayamadım. Komut olarak yazabilir (YARDIM), örneklere bakabilir ya da ⚙ ayarlardan Claude API anahtarı girerek serbest Türkçe istekler verebilirsiniz.' }); return; }
      // 2) Claude
      this.history.push({ role: 'user', content: text });
      this.history = this.history.slice(-16);
      C.emit('chatBusy', true);
      try {
        const ans = await C.askClaude(SYS_DRAW(), this.history, C.settings.model, 4000);
        this.history.push({ role: 'assistant', content: ans });
        const scripts = blocks(ans, 'cad');
        C.emit('chatMsg', { role: 'bot', text: ans.replace(/```cad[\s\S]*?```/g, '').trim() || 'Tamam.', scripts });
        if (scripts.length && C.settings.autoRun) await this.runScripts(scripts);
      } catch (err) { C.emit('chatMsg', { role: 'bot', text: 'Claude hatası: ' + err.message }); }
      finally { C.emit('chatBusy', false); }
    },
    async runScripts(scripts) {
      for (const s of scripts) {
        const r = await C.cmd.script(s);
        if (r.errors.length) { C.emit('chatMsg', { role: 'bot', text: '⚠ Bazı satırlar çalışmadı:\n' + r.errors.join('\n') }); this.history.push({ role: 'user', content: '[Sistem] Şu satırlar hata verdi: ' + r.errors.join(' | ') }); this.history.push({ role: 'assistant', content: 'Not aldım.' }); }
      }
      C.emit('zoomExtents');
    },
    async dev(text) {
      if (!C.settings.apiKey) {
        C.emit('chatMsg', { role: 'bot', text: 'Geliştir modu kodu Claude ile yazar. İki yol var:\n1) ⚙ Ayarlar\'dan API anahtarı girin; istekleriniz doğrudan eklentiye dönüşür.\n2) Anahtarsız: "İsteği kopyala" ile hazır metni claude.ai\'ye yapıştırın, gelen kodu Eklentiler › "Kod yapıştır" ile kurun.', devPrompt: this.devPromptFor(text) });
        return;
      }
      this.devHistory.push({ role: 'user', content: text }); this.devHistory = this.devHistory.slice(-10);
      C.emit('chatBusy', true);
      try {
        const ans = await C.askClaude(SYS_DEV(), this.devHistory, C.settings.devModel || C.settings.model, 12000);
        this.devHistory.push({ role: 'assistant', content: ans });
        const code = blocks(ans, 'js')[0] || blocks(ans, 'javascript')[0];
        C.emit('chatMsg', { role: 'bot', text: ans.replace(/```(js|javascript)[\s\S]*?```/g, '').trim() || 'Eklenti hazır.', plugin: code || null });
        if (code) C.emit('pluginProposal', code);
      } catch (err) { C.emit('chatMsg', { role: 'bot', text: 'Claude hatası: ' + err.message }); }
      finally { C.emit('chatBusy', false); }
    },
    devPromptFor(text) { return `${SYS_DEV()}\n\n=== İSTEK ===\n${text}\n\nCevap olarak yalnızca tek bir \`\`\`js bloğu içinde eklenti kodunu ver.`; },
  };

  /* ================= Sesli giriş ================= */
  C.voice = {
    supported: () => !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    rec: null, active: false,
    start(onText, onEnd) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { C.warn('Bu tarayıcı sesli girişi desteklemiyor. Google Chrome ya da Microsoft Edge kullanın.'); return false; }
      const r = this.rec = new SR(); r.lang = 'tr-TR'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
      let finalText = '';
      r.onresult = ev => { let interim = ''; for (let i = ev.resultIndex; i < ev.results.length; i++) { const tr = ev.results[i][0].transcript; if (ev.results[i].isFinal) finalText += tr; else interim += tr; } onText(finalText + interim, false); };
      r.onerror = ev => { C.warn('Ses tanıma: ' + (ev.error === 'not-allowed' ? 'mikrofon izni verilmedi' : ev.error === 'network' ? 'internet bağlantısı gerekli' : ev.error)); };
      r.onend = () => { this.active = false; onEnd && onEnd(finalText); };
      try { r.start(); this.active = true; return true; } catch (e) { C.warn('Mikrofon başlatılamadı: ' + e.message); return false; }
    },
    stop() { if (this.rec) try { this.rec.stop(); } catch (e) { } },
  };
})(window.C);
